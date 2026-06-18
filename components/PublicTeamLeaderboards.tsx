import { createServerSupabase } from '@/lib/supabase/server';
import { teamWSI, teamCI, METRICS, CI_METRICS, type TeamStats, type TeamCIStats } from '@/lib/wsi';
import { T } from '@/lib/theme';
import PublicTeamLeaderboardsClient from './PublicTeamLeaderboardsClient';

export interface PublicTeamEntry {
  teamId: number;
  teamName: string;
  flagEmoji: string;
  wsiScore: number;
  ciScore: number;
  stats: TeamStats & TeamCIStats;
}

export default async function PublicTeamLeaderboards() {
  const supabase = createServerSupabase();

  const { data } = await supabase
    .from('wc_teams')
    .select(`id, name, flag_emoji, team_stats(
      matches_played, points, conceded, gd, yellows, reds, bigdefeat, og, fastgoal, penmiss,
      pts_group, scored, posgd, stage, bigwin, fastscored, penscored, cleansheets, shotsontarget
    )`);

  if (!data) return null;

  const entries: PublicTeamEntry[] = data
    .filter(t => {
      const s = Array.isArray(t.team_stats) ? t.team_stats[0] : t.team_stats;
      return s && (s.matches_played ?? 0) > 0;
    })
    .map(t => {
      const s = Array.isArray(t.team_stats) ? t.team_stats[0] : t.team_stats;
      const stats = s as TeamStats & TeamCIStats;
      return {
        teamId: t.id,
        teamName: t.name,
        flagEmoji: t.flag_emoji ?? '',
        wsiScore: teamWSI(stats),
        ciScore: teamCI(stats),
        stats,
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
