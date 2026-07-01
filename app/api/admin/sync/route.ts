import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import {
  fetchTeams,
  fetchCompletedFixtures,
  fetchFixtureEvents,
  fetchFixtureStatistics,
  fetchPlayerAwards,
  parseTeamEvents,
  getShotsOnTarget,
  getRoundOrdinal,
  isGroupStageRound,
  type ApiFixture,
  type ApiEvent,
  type ApiStatTeam,
  type AwardCategory,
} from '@/lib/api-football';
import { API_NAME_OVERRIDES } from '@/constants/wc2026';
import { teamWSI, teamCI, type TeamStats, type TeamCIStats } from '@/lib/wsi';

const MAX_FIXTURES_PER_SYNC = 8;
const DAILY_CALL_LIMIT      = 90;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const adminToken = body?.admin_token;
  if (!adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabase();

  // Validate token
  const { data: group } = await supabase
    .from('groups')
    .select('id')
    .eq('admin_token', adminToken)
    .maybeSingle();

  if (!group) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check today's API call budget
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: todayLogs } = await supabase
    .from('sync_log')
    .select('api_calls')
    .gte('started_at', todayStart.toISOString())
    .eq('status', 'done');

  const usedToday = todayLogs?.reduce((s, l) => s + (l.api_calls ?? 0), 0) ?? 0;
  if (usedToday >= DAILY_CALL_LIMIT) {
    return NextResponse.json({ error: `Daily API limit reached (${DAILY_CALL_LIMIT} calls used today)` }, { status: 429 });
  }

  // Start sync log
  const { data: syncEntry } = await supabase
    .from('sync_log')
    .insert({ triggered_by: 'admin', status: 'running', api_calls: 0 })
    .select('id')
    .single();

  let apiCalls = 0;

  try {
    // ── Team ID mapping (first-run setup) ──────────────────────────────────
    const { data: wcTeams } = await supabase
      .from('wc_teams')
      .select('id, name, api_team_id');

    const unmapped = wcTeams?.filter(t => !t.api_team_id) ?? [];
    if (unmapped.length > 0) {
      const apiTeams = await fetchTeams();
      apiCalls++;

      for (const wct of unmapped) {
        const match = apiTeams.find(
          at => at.team.name.toLowerCase() === (API_NAME_OVERRIDES[wct.name] ?? wct.name).toLowerCase()
        );
        if (match) {
          await supabase
            .from('wc_teams')
            .update({ api_team_id: match.team.id })
            .eq('id', wct.id);
        }
      }
    }

    // Rebuild team map after potential update
    const { data: teams } = await supabase
      .from('wc_teams')
      .select('id, api_team_id')
      .not('api_team_id', 'is', null);

    const teamMap = new Map<number, number>( // api_team_id → internal id
      teams?.map(t => [t.api_team_id as number, t.id]) ?? []
    );

    // ── Fetch completed fixtures ────────────────────────────────────────────
    if (usedToday + apiCalls >= DAILY_CALL_LIMIT) {
      throw new Error('Approaching daily limit — aborting before fixture fetch');
    }

    const allFixtures = await fetchCompletedFixtures();
    apiCalls++;

    // Filter to WC fixtures only
    const COMPLETED_STATUSES = ['FT', 'AET', 'PEN'];
    const wcFixtures = allFixtures.filter(f => COMPLETED_STATUSES.includes(f.fixture.status.short));

    // Get already-processed IDs
    const { data: processed } = await supabase
      .from('processed_fixtures')
      .select('fixture_id');
    const processedIds = new Set(processed?.map(p => p.fixture_id) ?? []);

    const newFixtures = wcFixtures
      .filter(f => !processedIds.has(f.fixture.id))
      .slice(0, MAX_FIXTURES_PER_SYNC);

    // ── Process each fixture ────────────────────────────────────────────────
    let fixturesProcessed = 0;

    for (const fixture of newFixtures) {
      if (usedToday + apiCalls + 2 > DAILY_CALL_LIMIT) break; // need 2 calls per fixture

      const events = await fetchFixtureEvents(fixture.fixture.id);
      apiCalls++;

      const statistics = await fetchFixtureStatistics(fixture.fixture.id);
      apiCalls++;

      await processFixture(fixture, events, statistics, teamMap, supabase);

      await supabase
        .from('processed_fixtures')
        .insert({ fixture_id: fixture.fixture.id });

      fixturesProcessed++;
    }

    // ── Player awards (4 calls, once per sync) ─────────────────────────────
    if (unmapped.length === 0 && usedToday + apiCalls + 4 <= DAILY_CALL_LIMIT) {
      const AWARD_CATEGORIES: AwardCategory[] = [
        'topscorers', 'topassists', 'topyellowcards', 'topredcards',
      ];
      for (const category of AWARD_CATEGORIES) {
        const entries = await fetchPlayerAwards(category);
        apiCalls++;
        const top5 = entries.slice(0, 5);
        if (top5.length === 0) continue;
        await supabase
          .from('player_awards')
          .upsert(
            top5.map(e => ({ ...e, synced_at: new Date().toISOString() })),
            { onConflict: 'category,rank' }
          );
      }
    }

    // ── Complete sync log ───────────────────────────────────────────────────
    await supabase
      .from('sync_log')
      .update({ api_calls: apiCalls, completed_at: new Date().toISOString(), status: 'done' })
      .eq('id', syncEntry!.id);

    return NextResponse.json({
      success: true,
      fixtures_processed: fixturesProcessed,
      fixtures_remaining: newFixtures.length - fixturesProcessed,
      api_calls: apiCalls,
    });

  } catch (err) {
    await supabase
      .from('sync_log')
      .update({ api_calls: apiCalls, completed_at: new Date().toISOString(), status: 'error' })
      .eq('id', syncEntry!.id);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

// ── Core fixture processor ─────────────────────────────────────────────────
async function processFixture(
  fixture: ApiFixture,
  events:    ApiEvent[],
  statistics: ApiStatTeam[],
  teamMap:   Map<number, number>,
  supabase:  ReturnType<typeof createServerSupabase>
) {
  const homeApiId = fixture.teams.home.id;
  const awayApiId = fixture.teams.away.id;

  const homeId = teamMap.get(homeApiId);
  const awayId = teamMap.get(awayApiId);
  if (!homeId || !awayId) return; // team not in our WC list — skip

  const homeGoals = fixture.goals.home ?? 0;
  const awayGoals = fixture.goals.away ?? 0;

  const round      = fixture.league.round;
  const groupStage = isGroupStageRound(round);

  // Parse events per team
  const homeEvts = parseTeamEvents(events, homeApiId);
  const awayEvts = parseTeamEvents(events, awayApiId);

  // Subtract PSO penalty goals so they don't count toward CI penscored
  const isPSO = fixture.fixture.status.short === 'PEN';
  const psoHomeGoals = isPSO ? (fixture.score.penalty?.home ?? 0) : 0;
  const psoAwayGoals = isPSO ? (fixture.score.penalty?.away ?? 0) : 0;

  // Shots on target from statistics
  const homeSoT = getShotsOnTarget(statistics, homeApiId);
  const awaySoT = getShotsOnTarget(statistics, awayApiId);

  // Fetch current stats
  const { data: homeStats } = await supabase
    .from('team_stats').select('*').eq('team_id', homeId).single();
  const { data: awayStats } = await supabase
    .from('team_stats').select('*').eq('team_id', awayId).single();
  if (!homeStats || !awayStats) return;

  const margin = Math.abs(homeGoals - awayGoals);
  const homeWon = homeGoals > awayGoals;
  const awayWon = awayGoals > homeGoals;

  // Penalty shootout winner (for stage tracking in knockout)
  const homeWonPSO = fixture.score?.penalty?.home != null
    ? (fixture.score.penalty.home ?? 0) > (fixture.score.penalty.away ?? 0)
    : null;

  // ── Home team update ─────────────────────────────────────────────────────
  // CI metrics — always update (all rounds)
  const homeUpdate: Record<string, number | boolean | string> = {
    scored:         homeStats.scored + homeGoals,
    penscored:      homeStats.penscored + Math.max(0, homeEvts.penGoalCount - psoHomeGoals),
    cleansheets:    homeStats.cleansheets + (awayGoals === 0 ? 1 : 0),
    shotsontarget:  homeStats.shotsontarget + homeSoT,
    matches_played: homeStats.matches_played + 1,
    last_synced_at: new Date().toISOString(),
  };

  // bigwin is CI — all rounds
  const homeSetBigwin = homeWon && margin > homeStats.bigwin;
  if (homeSetBigwin) homeUpdate.bigwin = margin;

  // Fastest goal conceded (always compute for fixture_team_stats record)
  const concededTimes = [
    ...awayEvts.goalTimesScored, // away normal goals conceded by home
    ...awayEvts.ownGoalTimes,   // own goals benefiting away = committed by home = entered home net
  ];
  let homeEarliestConceded: number | null = null;
  let homeSetFastgoal = false;
  if (concededTimes.length > 0) {
    const earliest = Math.min(...concededTimes);
    homeEarliestConceded = earliest;
    // WSI — only update fastgoal for group stage
    if (groupStage && earliest < homeStats.fastgoal) {
      homeUpdate.fastgoal = earliest;
      homeSetFastgoal = true;
    }
  }

  // Fastest goal scored (CI — all rounds)
  const allHomeGoalTimes = [
    ...homeEvts.goalTimesScored,
    ...homeEvts.ownGoalTimes,   // own goal times where team.id=home = benefited home
  ];
  let homeEarliestScored: number | null = null;
  let homeSetFastscored = false;
  if (allHomeGoalTimes.length > 0) {
    const earliest = Math.min(...allHomeGoalTimes);
    homeEarliestScored = earliest;
    if (earliest < homeStats.fastscored) {
      homeUpdate.fastscored = earliest;
      homeSetFastscored = true;
    }
  }

  // CI — all rounds, raw GD (compute() handles the floor)
  homeUpdate.posgd = homeStats.posgd + (homeGoals - awayGoals);

  // WSI metrics — group stage only
  const homeSetBigdefeat = margin > homeStats.bigdefeat && !homeWon;
  if (groupStage) {
    homeUpdate.conceded = homeStats.conceded + awayGoals;
    homeUpdate.og       = homeStats.og + awayEvts.ownGoalsCount;
    homeUpdate.yellows  = homeStats.yellows + homeEvts.yellowCount;
    homeUpdate.reds     = homeStats.reds + homeEvts.redCount;
    homeUpdate.penmiss  = homeStats.penmiss + homeEvts.penMissCount;
    homeUpdate.gd       = homeStats.gd + (homeGoals - awayGoals);
    if (homeSetBigdefeat) homeUpdate.bigdefeat = margin;
  }

  // Group stage points (frozen after 3 matches)
  let homeMatchPts = 0;
  if (groupStage && !homeStats.group_stage_complete) {
    homeMatchPts = homeWon ? 3 : (homeGoals === awayGoals ? 1 : 0);
    homeUpdate.points    = homeStats.points + homeMatchPts;
    homeUpdate.pts_group = homeStats.pts_group + homeMatchPts;
    if (homeStats.matches_played + 1 >= 3) {
      homeUpdate.group_stage_complete = true;
    }
  }

  // Knockout stage ordinal
  if (!groupStage) {
    const ord = getRoundOrdinal(round);
    const homeAdvances = homeWonPSO !== null ? homeWonPSO : homeWon;
    const newStage = homeAdvances && round === 'Final' ? 6 : ord;
    if (newStage > homeStats.stage) homeUpdate.stage = newStage;
  }

  // ── Away team update ─────────────────────────────────────────────────────
  // CI metrics — always update (all rounds)
  const awayUpdate: Record<string, number | boolean | string> = {
    scored:         awayStats.scored + awayGoals,
    penscored:      awayStats.penscored + Math.max(0, awayEvts.penGoalCount - psoAwayGoals),
    cleansheets:    awayStats.cleansheets + (homeGoals === 0 ? 1 : 0),
    shotsontarget:  awayStats.shotsontarget + awaySoT,
    matches_played: awayStats.matches_played + 1,
    last_synced_at: new Date().toISOString(),
  };

  // bigwin is CI — all rounds
  const awaySetBigwin = awayWon && margin > awayStats.bigwin;
  if (awaySetBigwin) awayUpdate.bigwin = margin;

  // Fastest goal conceded (always compute for fixture_team_stats record)
  const awayConcededTimes = [
    ...homeEvts.goalTimesScored,
    ...homeEvts.ownGoalTimes,  // own goals benefiting home = committed by away = entered away net
  ];
  let awayEarliestConceded: number | null = null;
  let awaySetFastgoal = false;
  if (awayConcededTimes.length > 0) {
    const earliest = Math.min(...awayConcededTimes);
    awayEarliestConceded = earliest;
    // WSI — only update fastgoal for group stage
    if (groupStage && earliest < awayStats.fastgoal) {
      awayUpdate.fastgoal = earliest;
      awaySetFastgoal = true;
    }
  }

  // Fastest goal scored (CI — all rounds)
  const allAwayGoalTimes = [
    ...awayEvts.goalTimesScored,
    ...awayEvts.ownGoalTimes,  // own goals benefiting away = entered away's opponent's net
  ];
  let awayEarliestScored: number | null = null;
  let awaySetFastscored = false;
  if (allAwayGoalTimes.length > 0) {
    const earliest = Math.min(...allAwayGoalTimes);
    awayEarliestScored = earliest;
    if (earliest < awayStats.fastscored) {
      awayUpdate.fastscored = earliest;
      awaySetFastscored = true;
    }
  }

  // CI — all rounds, raw GD (compute() handles the floor)
  awayUpdate.posgd = awayStats.posgd + (awayGoals - homeGoals);

  // WSI metrics — group stage only
  const awaySetBigdefeat = margin > awayStats.bigdefeat && !awayWon;
  if (groupStage) {
    awayUpdate.conceded = awayStats.conceded + homeGoals;
    awayUpdate.og       = awayStats.og + homeEvts.ownGoalsCount;
    awayUpdate.yellows  = awayStats.yellows + awayEvts.yellowCount;
    awayUpdate.reds     = awayStats.reds + awayEvts.redCount;
    awayUpdate.penmiss  = awayStats.penmiss + awayEvts.penMissCount;
    awayUpdate.gd       = awayStats.gd + (awayGoals - homeGoals);
    if (awaySetBigdefeat) awayUpdate.bigdefeat = margin;
  }

  let awayMatchPts = 0;
  if (groupStage && !awayStats.group_stage_complete) {
    awayMatchPts = awayWon ? 3 : (homeGoals === awayGoals ? 1 : 0);
    awayUpdate.points    = awayStats.points + awayMatchPts;
    awayUpdate.pts_group = awayStats.pts_group + awayMatchPts;
    if (awayStats.matches_played + 1 >= 3) {
      awayUpdate.group_stage_complete = true;
    }
  }

  if (!groupStage) {
    const ord = getRoundOrdinal(round);
    const awayAdvances = homeWonPSO !== null ? !homeWonPSO : awayWon;
    const newStage = awayAdvances && round === 'Final' ? 6 : ord;
    if (newStage > awayStats.stage) awayUpdate.stage = newStage;
  }

  // ── Compute WSI/CI deltas ────────────────────────────────────────────────
  const newHomeStats = { ...homeStats, ...homeUpdate } as unknown as TeamStats & TeamCIStats;
  const newAwayStats = { ...awayStats, ...awayUpdate } as unknown as TeamStats & TeamCIStats;

  const homeWSIDelta = Math.round((teamWSI(newHomeStats) - teamWSI(homeStats)) * 10) / 10;
  const homeCIDelta  = Math.round((teamCI(newHomeStats)  - teamCI(homeStats))  * 10) / 10;
  const awayWSIDelta = Math.round((teamWSI(newAwayStats) - teamWSI(awayStats)) * 10) / 10;
  const awayCIDelta  = Math.round((teamCI(newAwayStats)  - teamCI(awayStats))  * 10) / 10;

  const matchDate = fixture.fixture.date.split('T')[0];

  // ── Persist ──────────────────────────────────────────────────────────────
  await Promise.all([
    supabase.from('team_stats').update(homeUpdate).eq('team_id', homeId),
    supabase.from('team_stats').update(awayUpdate).eq('team_id', awayId),
    supabase.from('fixtures').upsert({
      fixture_id:   fixture.fixture.id,
      home_team_id: homeId,
      away_team_id: awayId,
      home_goals:   homeGoals,
      away_goals:   awayGoals,
      match_date:   matchDate,
      round,
    }),
  ]);

  await supabase.from('fixture_team_stats').upsert([
    {
      fixture_id:       fixture.fixture.id,
      team_id:          homeId,
      wsi_delta:        groupStage ? homeWSIDelta : 0,
      ci_delta:         homeCIDelta,
      goals_for:        homeGoals,
      goals_against:    awayGoals,
      match_points:     homeMatchPts,
      yellow_cards:     homeEvts.yellowCount,
      red_cards:        homeEvts.redCount,
      own_goals:        awayEvts.ownGoalsCount, // own goals that entered home net
      pen_missed:       homeEvts.penMissCount,
      pen_scored:       homeEvts.penGoalCount,
      clean_sheet:      awayGoals === 0,
      shots_on_target:  homeSoT,
      set_bigdefeat:    homeSetBigdefeat,
      defeat_margin:    homeSetBigdefeat ? margin : 0,
      set_bigwin:       homeSetBigwin,
      win_margin:       homeSetBigwin ? margin : 0,
      set_fastgoal:     homeSetFastgoal,
      fastgoal_minute:  homeEarliestConceded,
      set_fastscored:   homeSetFastscored,
      fastscored_minute: homeEarliestScored,
    },
    {
      fixture_id:       fixture.fixture.id,
      team_id:          awayId,
      wsi_delta:        groupStage ? awayWSIDelta : 0,
      ci_delta:         awayCIDelta,
      goals_for:        awayGoals,
      goals_against:    homeGoals,
      match_points:     awayMatchPts,
      yellow_cards:     awayEvts.yellowCount,
      red_cards:        awayEvts.redCount,
      own_goals:        homeEvts.ownGoalsCount, // own goals that entered away net
      pen_missed:       awayEvts.penMissCount,
      pen_scored:       awayEvts.penGoalCount,
      clean_sheet:      homeGoals === 0,
      shots_on_target:  awaySoT,
      set_bigdefeat:    awaySetBigdefeat,
      defeat_margin:    awaySetBigdefeat ? margin : 0,
      set_bigwin:       awaySetBigwin,
      win_margin:       awaySetBigwin ? margin : 0,
      set_fastgoal:     awaySetFastgoal,
      fastgoal_minute:  awayEarliestConceded,
      set_fastscored:   awaySetFastscored,
      fastscored_minute: awayEarliestScored,
    },
  ]);
}
