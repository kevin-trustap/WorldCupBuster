import { createServerSupabase } from '@/lib/supabase/server';
import type { TeamEntry } from '@/app/group/[inviteCode]/Leaderboards';

export interface DailySummaryTeam {
  teamId: number;
  teamName: string;
  flagEmoji: string;
  wsiDelta: number;
  ciDelta: number;
  goals_for: number;
  goals_against: number;
}

export interface DailySummaryItem {
  memberName: string;
  teams: DailySummaryTeam[];
  totalWSIDelta: number;
  totalCIDelta: number;
}

export interface RankChange {
  wsiRankBefore: number;
  wsiRankAfter: number;
  ciRankBefore: number;
  ciRankAfter: number;
}

export async function getDailySummary(groupId: string, date: string): Promise<DailySummaryItem[]> {
  const supabase = createServerSupabase();

  // Get team assignments for this group
  const { data: assignments } = await supabase
    .from('member_team_assignments')
    .select('team_id, group_members!inner(display_name)')
    .eq('group_id', groupId);

  if (!assignments?.length) return [];

  const teamIds = assignments.map(a => a.team_id as number);

  // Get fixture stats for today's matches, filtered to this group's teams
  const { data: fixtureStats } = await supabase
    .from('fixture_team_stats')
    .select('team_id, wsi_delta, ci_delta, goals_for, goals_against, fixture_id')
    .in('team_id', teamIds);

  if (!fixtureStats?.length) return [];

  // Filter to today's fixture IDs
  const { data: todayFixtures } = await supabase
    .from('fixtures')
    .select('fixture_id')
    .eq('match_date', date);

  if (!todayFixtures?.length) return [];

  const todayFixtureIds = new Set(todayFixtures.map(f => f.fixture_id as number));
  const todayStats = fixtureStats.filter(s => todayFixtureIds.has(s.fixture_id as number));

  if (!todayStats.length) return [];

  // Get team info for display
  const activeTeamIds = Array.from(new Set(todayStats.map(s => s.team_id as number)));
  const { data: teams } = await supabase
    .from('wc_teams')
    .select('id, name, flag_emoji')
    .in('id', activeTeamIds);

  const teamMap = new Map(teams?.map(t => [t.id as number, { name: t.name as string, flag_emoji: t.flag_emoji as string }]) ?? []);

  // Build team_id → member_name map
  const teamToMember = new Map<number, string>();
  for (const a of assignments) {
    const gm = a.group_members as unknown as { display_name: string };
    teamToMember.set(a.team_id as number, gm.display_name);
  }

  // Group by member
  const memberMap = new Map<string, DailySummaryItem>();
  for (const row of todayStats) {
    const memberName = teamToMember.get(row.team_id as number);
    if (!memberName) continue;

    const teamInfo = teamMap.get(row.team_id as number);
    if (!teamInfo) continue;

    if (!memberMap.has(memberName)) {
      memberMap.set(memberName, { memberName, teams: [], totalWSIDelta: 0, totalCIDelta: 0 });
    }
    const item = memberMap.get(memberName)!;
    item.teams.push({
      teamId:       row.team_id as number,
      teamName:     teamInfo.name,
      flagEmoji:    teamInfo.flag_emoji,
      wsiDelta:     Number(row.wsi_delta),
      ciDelta:      Number(row.ci_delta),
      goals_for:    row.goals_for as number,
      goals_against: row.goals_against as number,
    });
    item.totalWSIDelta = Math.round((item.totalWSIDelta + Number(row.wsi_delta)) * 10) / 10;
    item.totalCIDelta  = Math.round((item.totalCIDelta  + Number(row.ci_delta))  * 10) / 10;
  }

  return Array.from(memberMap.values());
}

// Ranks are computed at the TEAM level to match the visual leaderboard,
// which sorts individual teams (not member aggregates).
export function computeRankChanges(
  leaderboard: TeamEntry[],
  summaryItems: DailySummaryItem[]
): Record<number, RankChange> {
  // Build teamId → today's delta from summary items
  const wsiDeltaMap = new Map<number, number>();
  const ciDeltaMap  = new Map<number, number>();
  for (const item of summaryItems) {
    for (const team of item.teams) {
      wsiDeltaMap.set(team.teamId, team.wsiDelta);
      ciDeltaMap.set(team.teamId,  team.ciDelta);
    }
  }

  // Current team ranks (after today) — matches how WSI/CI leaderboards sort
  const sortedWSIAfter = [...leaderboard].sort((a, b) => b.wsiScore - a.wsiScore);
  const sortedCIAfter  = [...leaderboard].sort((a, b) => b.ciScore  - a.ciScore);

  // Prior team ranks (before today's delta)
  const sortedWSIBefore = [...leaderboard].sort((a, b) => {
    const aScore = a.wsiScore - (wsiDeltaMap.get(a.teamId) ?? 0);
    const bScore = b.wsiScore - (wsiDeltaMap.get(b.teamId) ?? 0);
    return bScore - aScore;
  });
  const sortedCIBefore = [...leaderboard].sort((a, b) => {
    const aScore = a.ciScore - (ciDeltaMap.get(a.teamId) ?? 0);
    const bScore = b.ciScore - (ciDeltaMap.get(b.teamId) ?? 0);
    return bScore - aScore;
  });

  const result: Record<number, RankChange> = {};
  for (const entry of leaderboard) {
    result[entry.teamId] = {
      wsiRankBefore: sortedWSIBefore.findIndex(e => e.teamId === entry.teamId) + 1,
      wsiRankAfter:  sortedWSIAfter.findIndex(e => e.teamId === entry.teamId) + 1,
      ciRankBefore:  sortedCIBefore.findIndex(e => e.teamId === entry.teamId) + 1,
      ciRankAfter:   sortedCIAfter.findIndex(e => e.teamId === entry.teamId) + 1,
    };
  }
  return result;
}
