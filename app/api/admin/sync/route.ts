import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import {
  fetchTeams,
  fetchCompletedFixtures,
  fetchFixtureEvents,
  fetchFixtureStatistics,
  parseTeamEvents,
  getShotsOnTarget,
  getRoundOrdinal,
  isGroupStageRound,
  type ApiFixture,
  type ApiEvent,
  type ApiStatTeam,
} from '@/lib/api-football';
import { API_NAME_OVERRIDES } from '@/constants/wc2026';

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
    const wcFixtures = allFixtures.filter(f => f.fixture.status.short === 'FT');

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
  const homeUpdate: Record<string, number | boolean | string> = {
    conceded:      homeStats.conceded + awayGoals,
    og:            homeStats.og + homeEvts.ownGoalsCount,
    yellows:       homeStats.yellows + homeEvts.yellowCount,
    reds:          homeStats.reds + homeEvts.redCount,
    penmiss:       homeStats.penmiss + homeEvts.penMissCount,
    scored:        homeStats.scored + homeGoals,
    penscored:     homeStats.penscored + homeEvts.penGoalCount,
    cleansheets:   homeStats.cleansheets + (awayGoals === 0 ? 1 : 0),
    shotsontarget: homeStats.shotsontarget + homeSoT,
    gd:            homeStats.gd + (homeGoals - awayGoals),
    posgd:         Math.max(0, homeStats.gd + (homeGoals - awayGoals)),
    matches_played: homeStats.matches_played + 1,
    last_synced_at: new Date().toISOString(),
  };

  if (margin > homeStats.bigdefeat && !homeWon) {
    homeUpdate.bigdefeat = margin;
  }
  if (homeWon && margin > homeStats.bigwin) {
    homeUpdate.bigwin = margin;
  }

  // Fastest goal conceded = goals that entered home net
  const concededTimes = [
    ...awayEvts.goalTimesScored, // away normal goals conceded by home
    ...homeEvts.ownGoalTimes,   // home's own goals
  ];
  if (concededTimes.length > 0) {
    const earliest = Math.min(...concededTimes);
    if (earliest < homeStats.fastgoal) homeUpdate.fastgoal = earliest;
  }

  // Fastest goal scored
  if (homeEvts.goalTimesScored.length > 0) {
    const earliest = Math.min(...homeEvts.goalTimesScored);
    if (earliest < homeStats.fastscored) homeUpdate.fastscored = earliest;
  }

  // Group stage points (frozen after 3 matches)
  if (groupStage && !homeStats.group_stage_complete) {
    const pts = homeWon ? 3 : (homeGoals === awayGoals ? 1 : 0);
    homeUpdate.points    = homeStats.points + pts;
    homeUpdate.pts_group = homeStats.pts_group + pts;
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
  const awayUpdate: Record<string, number | boolean | string> = {
    conceded:      awayStats.conceded + homeGoals,
    og:            awayStats.og + awayEvts.ownGoalsCount,
    yellows:       awayStats.yellows + awayEvts.yellowCount,
    reds:          awayStats.reds + awayEvts.redCount,
    penmiss:       awayStats.penmiss + awayEvts.penMissCount,
    scored:        awayStats.scored + awayGoals,
    penscored:     awayStats.penscored + awayEvts.penGoalCount,
    cleansheets:   awayStats.cleansheets + (homeGoals === 0 ? 1 : 0),
    shotsontarget: awayStats.shotsontarget + awaySoT,
    gd:            awayStats.gd + (awayGoals - homeGoals),
    posgd:         Math.max(0, awayStats.gd + (awayGoals - homeGoals)),
    matches_played: awayStats.matches_played + 1,
    last_synced_at: new Date().toISOString(),
  };

  if (margin > awayStats.bigdefeat && !awayWon) {
    awayUpdate.bigdefeat = margin;
  }
  if (awayWon && margin > awayStats.bigwin) {
    awayUpdate.bigwin = margin;
  }

  const awayConcededTimes = [
    ...homeEvts.goalTimesScored,
    ...awayEvts.ownGoalTimes,
  ];
  if (awayConcededTimes.length > 0) {
    const earliest = Math.min(...awayConcededTimes);
    if (earliest < awayStats.fastgoal) awayUpdate.fastgoal = earliest;
  }

  if (awayEvts.goalTimesScored.length > 0) {
    const earliest = Math.min(...awayEvts.goalTimesScored);
    if (earliest < awayStats.fastscored) awayUpdate.fastscored = earliest;
  }

  if (groupStage && !awayStats.group_stage_complete) {
    const pts = awayWon ? 3 : (homeGoals === awayGoals ? 1 : 0);
    awayUpdate.points    = awayStats.points + pts;
    awayUpdate.pts_group = awayStats.pts_group + pts;
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

  // ── Persist ──────────────────────────────────────────────────────────────
  await Promise.all([
    supabase.from('team_stats').update(homeUpdate).eq('team_id', homeId),
    supabase.from('team_stats').update(awayUpdate).eq('team_id', awayId),
  ]);
}
