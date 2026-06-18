import { createServerSupabase } from '@/lib/supabase/server';
import { teamWSI, teamCI, type TeamStats, type TeamCIStats } from '@/lib/wsi';
import { T } from '@/lib/theme';
import PublicTeamLeaderboardsClient from './PublicTeamLeaderboardsClient';
import type { FixtureDetail } from '@/app/group/[inviteCode]/Leaderboards';

export interface PublicTeamEntry {
  teamId: number;
  teamName: string;
  flagEmoji: string;
  wsiScore: number;
  ciScore: number;
  stats: TeamStats & TeamCIStats;
  fixtures?: FixtureDetail[];
}

export default async function PublicTeamLeaderboards() {
  const supabase = createServerSupabase();

  const [{ data }, { data: fixtureRows }] = await Promise.all([
    supabase
      .from('wc_teams')
      .select(`id, name, flag_emoji, team_stats(
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

  if (entries.length === 0) {
    return (
      <div style={{ marginBottom: 40 }}>
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
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary, margin: '0 0 16px', letterSpacing: '-0.3px' }}>
        Tournament Standings
      </h2>
      <PublicTeamLeaderboardsClient entries={entries} />
    </div>
  );
}
