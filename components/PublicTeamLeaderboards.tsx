import { createServerSupabase } from '@/lib/supabase/server';
import { teamWSI, teamCI, type TeamStats, type TeamCIStats } from '@/lib/wsi';
import { T } from '@/lib/theme';
import PublicTeamLeaderboardsClient from './PublicTeamLeaderboardsClient';
import StatLeaders from './StatLeaders';
import PlayerAwards, { type PlayerAwardDisplayRow, type GoldenGloveTeam, type AwardCategory } from './PlayerAwards';
import type { FixtureDetail } from '@/app/group/[inviteCode]/Leaderboards';
import { getPublicDailyTeamStats, type DailySummaryItem, type RankChange } from '@/lib/daily-summary';

export interface PublicTeamEntry {
  teamId: number;
  teamName: string;
  flagEmoji: string;
  wsiScore: number;
  ciScore: number;
  stats: TeamStats & TeamCIStats;
  fixtures?: FixtureDetail[];
}

function computePublicRankChanges(
  entries: PublicTeamEntry[],
  summaryItems: DailySummaryItem[]
): Record<number, RankChange> {
  const wsiDeltaMap = new Map<number, number>();
  const ciDeltaMap  = new Map<number, number>();
  for (const item of summaryItems) {
    for (const team of item.teams) {
      wsiDeltaMap.set(team.teamId, team.wsiDelta);
      ciDeltaMap.set(team.teamId,  team.ciDelta);
    }
  }
  const sortedWSIAfter  = [...entries].sort((a, b) => b.wsiScore - a.wsiScore);
  const sortedCIAfter   = [...entries].sort((a, b) => b.ciScore  - a.ciScore);
  const sortedWSIBefore = [...entries].sort((a, b) =>
    (b.wsiScore - (wsiDeltaMap.get(b.teamId) ?? 0)) - (a.wsiScore - (wsiDeltaMap.get(a.teamId) ?? 0))
  );
  const sortedCIBefore  = [...entries].sort((a, b) =>
    (b.ciScore  - (ciDeltaMap.get(b.teamId)  ?? 0)) - (a.ciScore  - (ciDeltaMap.get(a.teamId)  ?? 0))
  );
  const result: Record<number, RankChange> = {};
  for (const entry of entries) {
    result[entry.teamId] = {
      wsiRankBefore: sortedWSIBefore.findIndex(e => e.teamId === entry.teamId) + 1,
      wsiRankAfter:  sortedWSIAfter.findIndex(e => e.teamId === entry.teamId) + 1,
      ciRankBefore:  sortedCIBefore.findIndex(e => e.teamId === entry.teamId) + 1,
      ciRankAfter:   sortedCIAfter.findIndex(e => e.teamId === entry.teamId) + 1,
    };
  }
  return result;
}

export default async function PublicTeamLeaderboards() {
  const supabase = createServerSupabase();

  const todayUTCDate = new Date().toISOString().slice(0, 10);
  const [{ data }, { data: fixtureRows }, dailySummaryItems, { data: rawAwards }] = await Promise.all([
    supabase
      .from('wc_teams')
      .select(`id, name, flag_emoji, api_team_id, team_stats(
        matches_played, points, conceded, gd, yellows, reds, bigdefeat, og, fastgoal, penmiss,
        pts_group, scored, posgd, stage, bigwin, fastscored, penscored, cleansheets, shotsontarget
      )`),
    supabase
      .from('fixture_team_stats')
      .select(`
        team_id, goals_for, goals_against, match_points,
        yellow_cards, red_cards, own_goals, pen_missed, pen_scored,
        clean_sheet, shots_on_target,
        set_bigdefeat, defeat_margin, set_bigwin, win_margin,
        set_fastgoal, fastgoal_minute, set_fastscored, fastscored_minute,
        fixtures!inner(fixture_id, home_team_id, away_team_id, match_date, round)
      `),
    getPublicDailyTeamStats(todayUTCDate),
    supabase
      .from('player_awards')
      .select('category, player_name, nationality, api_team_id, team_name, stat_value')
      .eq('rank', 1),
  ]);

  if (!data) return null;

  // Build team lookup from the wc_teams response
  const teamLookup = new Map<number, { name: string; flag_emoji: string }>(
    data.map(t => [t.id, { name: t.name ?? '', flag_emoji: t.flag_emoji ?? '🏳' }])
  );

  const fixturesByTeam = new Map<number, FixtureDetail[]>();
  for (const row of (fixtureRows ?? [])) {
    const fixture = row.fixtures as unknown as { fixture_id: number; home_team_id: number; away_team_id: number; match_date: string };
    const teamId = row.team_id;
    const opponentId = fixture.home_team_id === teamId ? fixture.away_team_id : fixture.home_team_id;
    const opponent = teamLookup.get(opponentId) ?? { name: 'Unknown', flag_emoji: '🏳' };

    const detail: FixtureDetail = {
      fixtureId:        fixture.fixture_id,
      opponentId,
      opponentName:     opponent.name,
      opponentFlag:     opponent.flag_emoji,
      matchDate:        fixture.match_date,
      isHome:           fixture.home_team_id === teamId,
      goalsFor:         row.goals_for ?? 0,
      goalsAgainst:     row.goals_against ?? 0,
      matchPoints:      row.match_points ?? 0,
      yellowCards:      row.yellow_cards ?? 0,
      redCards:         row.red_cards ?? 0,
      ownGoals:         row.own_goals ?? 0,
      penMissed:        row.pen_missed ?? 0,
      penScored:        row.pen_scored ?? 0,
      cleanSheet:       row.clean_sheet ?? false,
      shotsOnTarget:    row.shots_on_target ?? 0,
      setBigDefeat:     row.set_bigdefeat ?? false,
      defeatMargin:     row.defeat_margin ?? 0,
      setBigWin:        row.set_bigwin ?? false,
      winMargin:        row.win_margin ?? 0,
      setFastGoal:      row.set_fastgoal ?? false,
      fastGoalMinute:   row.fastgoal_minute ?? null,
      setFastScored:    row.set_fastscored ?? false,
      fastScoredMinute: row.fastscored_minute ?? null,
    };

    if (!fixturesByTeam.has(teamId)) fixturesByTeam.set(teamId, []);
    fixturesByTeam.get(teamId)!.push(detail);
  }

  const entries: PublicTeamEntry[] = data
    .filter(t => {
      const s = Array.isArray(t.team_stats) ? t.team_stats[0] : t.team_stats;
      return s && (s.matches_played ?? 0) > 0;
    })
    .map(t => {
      const s = Array.isArray(t.team_stats) ? t.team_stats[0] : t.team_stats;
      const stats = s as TeamStats & TeamCIStats;
      return {
        teamId:    t.id,
        teamName:  t.name ?? '',
        flagEmoji: t.flag_emoji ?? '',
        wsiScore:  teamWSI(stats),
        ciScore:   teamCI(stats),
        stats,
        fixtures:  fixturesByTeam.get(t.id) ?? [],
      };
    });

  // ── Player awards data ────────────────────────────────────────────────────
  const teamByApiId = new Map<number, { flag_emoji: string }>(
    data
      .filter(t => t.api_team_id != null)
      .map(t => [t.api_team_id as number, { flag_emoji: t.flag_emoji ?? '🏳' }])
  );

  const awards: PlayerAwardDisplayRow[] = (rawAwards ?? []).map(a => ({
    category:    a.category as AwardCategory,
    player_name: a.player_name,
    nationality: a.nationality ?? null,
    team_name:   a.team_name,
    flag_emoji:  teamByApiId.get(a.api_team_id)?.flag_emoji ?? '🏳',
    stat_value:  a.stat_value,
    member_name: null,
  }));

  // Golden Glove: team with most clean sheets globally
  const topCsEntry = entries.length > 0
    ? entries.reduce((best, t) => t.stats.cleansheets > best.stats.cleansheets ? t : best)
    : null;
  const goldenGlove: GoldenGloveTeam | null = topCsEntry && topCsEntry.stats.cleansheets > 0
    ? { team_name: topCsEntry.teamName, flag_emoji: topCsEntry.flagEmoji, cleansheets: topCsEntry.stats.cleansheets, member_name: null }
    : null;

  if (entries.length === 0) {
    return (
      <div id="standings" style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary, margin: '0 0 16px', letterSpacing: '-0.3px' }}>
          Tournament Standings
        </h2>
        <div style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 14, padding: '28px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
          <p style={{ fontSize: 14, color: T.textSecondary, margin: 0 }}>
            Standings will appear once matches are played.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div id="standings" style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary, margin: '0 0 16px', letterSpacing: '-0.3px' }}>
          Tournament Standings
        </h2>
        <PublicTeamLeaderboardsClient entries={entries} rankChanges={computePublicRankChanges(entries, dailySummaryItems)} />
      </div>
      <div id="stat-leaders">
        <StatLeaders teams={entries} />
      </div>
      {(awards.length > 0 || goldenGlove !== null) && (
        <div id="player-awards">
          <PlayerAwards awards={awards} goldenGlove={goldenGlove} />
        </div>
      )}
    </>
  );
}
