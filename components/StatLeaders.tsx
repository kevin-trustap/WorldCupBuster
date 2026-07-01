'use client';

import { STAGE_LABELS, type TeamStats, type TeamCIStats } from '@/lib/wsi';
import { T } from '@/lib/theme';

export interface StatLeaderTeam {
  teamId: number;
  teamName: string;
  flagEmoji: string;
  memberName?: string;
  stats: TeamStats & TeamCIStats;
}

interface StatCategory {
  id: string;
  icon: string;
  label: string;
  affinity: 'ci' | 'wsi';
  getValue: (stats: TeamStats & TeamCIStats) => number | null;
  compare: (a: number, b: number) => number; // >0 means a is better
  format: (v: number) => string;
  emptyLabel: string;
}

const STAT_CATEGORIES: StatCategory[] = [
  {
    id: 'scored',
    icon: '⚽',
    label: 'Most Goals Scored',
    affinity: 'ci',
    getValue: (s) => s.scored,
    compare: (a, b) => a - b,
    format: (v) => `${v}`,
    emptyLabel: 'No goals yet',
  },
  {
    id: 'conceded',
    icon: '🥅',
    label: 'Fewest Goals Conceded',
    affinity: 'wsi',
    getValue: (s) => s.conceded,
    compare: (a, b) => b - a, // lower is better
    format: (v) => `${v}`,
    emptyLabel: 'No data yet',
  },
  {
    id: 'cleansheets',
    icon: '🧤',
    label: 'Most Clean Sheets',
    affinity: 'ci',
    getValue: (s) => s.cleansheets === 0 ? null : s.cleansheets,
    compare: (a, b) => a - b,
    format: (v) => `${v}`,
    emptyLabel: 'No clean sheets yet',
  },
  {
    id: 'bestgd',
    icon: '📈',
    label: 'Best Goal Difference',
    affinity: 'ci',
    getValue: (s) => s.scored - s.conceded,
    compare: (a, b) => a - b,
    format: (v) => v >= 0 ? `+${v}` : `${v}`,
    emptyLabel: 'No data yet',
  },
  {
    id: 'bigwin',
    icon: '💪',
    label: 'Biggest Single Win',
    affinity: 'ci',
    getValue: (s) => s.bigwin === 0 ? null : s.bigwin,
    compare: (a, b) => a - b,
    format: (v) => `by ${v}`,
    emptyLabel: 'No wins yet',
  },
  {
    id: 'bigdefeat',
    icon: '💥',
    label: 'Biggest Single Defeat',
    affinity: 'wsi',
    getValue: (s) => s.bigdefeat === 0 ? null : s.bigdefeat,
    compare: (a, b) => a - b,
    format: (v) => `by ${v}`,
    emptyLabel: 'No heavy defeats yet',
  },
  {
    id: 'yellows',
    icon: '🟨',
    label: 'Most Yellow Cards',
    affinity: 'wsi',
    getValue: (s) => s.yellows === 0 ? null : s.yellows,
    compare: (a, b) => a - b,
    format: (v) => `${v}`,
    emptyLabel: 'No yellow cards yet',
  },
  {
    id: 'reds',
    icon: '🟥',
    label: 'Most Red Cards',
    affinity: 'wsi',
    getValue: (s) => s.reds === 0 ? null : s.reds,
    compare: (a, b) => a - b,
    format: (v) => `${v}`,
    emptyLabel: 'No red cards yet',
  },
  {
    id: 'og',
    icon: '😬',
    label: 'Most Own Goals',
    affinity: 'wsi',
    getValue: (s) => s.og === 0 ? null : s.og,
    compare: (a, b) => a - b,
    format: (v) => `${v}`,
    emptyLabel: 'No own goals yet',
  },
  {
    id: 'fastscored',
    icon: '⚡',
    label: 'Fastest Goal Scored',
    affinity: 'ci',
    getValue: (s) => s.fastscored >= 90 ? null : s.fastscored,
    compare: (a, b) => b - a, // lower minute is better
    format: (v) => `min ${v}`,
    emptyLabel: 'No early goals yet',
  },
  {
    id: 'fastgoal',
    icon: '⚡',
    label: 'Fastest Goal Conceded',
    affinity: 'wsi',
    getValue: (s) => s.fastgoal >= 90 ? null : s.fastgoal,
    compare: (a, b) => b - a, // lower minute = more shame
    format: (v) => `min ${v}`,
    emptyLabel: 'No early goals conceded',
  },
  {
    id: 'penscored',
    icon: '🎯',
    label: 'Most Penalties Scored',
    affinity: 'ci',
    getValue: (s) => s.penscored === 0 ? null : s.penscored,
    compare: (a, b) => a - b,
    format: (v) => `${v}`,
    emptyLabel: 'No penalties scored yet',
  },
  {
    id: 'penmiss',
    icon: '🎯',
    label: 'Most Failed Penalties',
    affinity: 'wsi',
    getValue: (s) => s.penmiss === 0 ? null : s.penmiss,
    compare: (a, b) => a - b,
    format: (v) => `${v}`,
    emptyLabel: 'No failed penalties yet',
  },
  {
    id: 'shotsontarget',
    icon: '🔥',
    label: 'Most Shots on Target',
    affinity: 'ci',
    getValue: (s) => s.shotsontarget,
    compare: (a, b) => a - b,
    format: (v) => `${v}`,
    emptyLabel: 'No shot data yet',
  },
  {
    id: 'stage',
    icon: '🌟',
    label: 'Furthest Progress',
    affinity: 'ci',
    getValue: (s) => s.stage === 0 ? null : s.stage,
    compare: (a, b) => a - b,
    format: (v) => STAGE_LABELS[v] ?? `Stage ${v}`,
    emptyLabel: 'Knockout stage not reached yet',
  },
];

interface LeaderResult {
  value: number;
  teams: StatLeaderTeam[];
  tied: boolean;
}

function computeLeader(teams: StatLeaderTeam[], cat: StatCategory): LeaderResult | null {
  const candidates: { team: StatLeaderTeam; value: number }[] = [];
  for (const team of teams) {
    const v = cat.getValue(team.stats);
    if (v === null) continue;
    candidates.push({ team, value: v });
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => cat.compare(b.value, a.value)); // best first
  const best = candidates[0].value;
  const leaders = candidates.filter(c => cat.compare(c.value, best) === 0);

  return {
    value: best,
    teams: leaders.map(c => c.team),
    tied: leaders.length > 1,
  };
}

function StatCard({ cat, leader }: { cat: StatCategory; leader: LeaderResult | null }) {
  const accent = cat.affinity === 'ci' ? T.ci : T.wsi;
  const badgeBg = cat.affinity === 'ci' ? T.ciBadgeBg : T.wsiBadgeBg;

  return (
    <div style={{
      background: T.card,
      border: `0.5px solid ${T.cardBorder}`,
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minHeight: 110,
    }}>
      {/* Header */}
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {cat.icon} {cat.label}
      </div>

      {leader === null ? (
        <div style={{ fontSize: 12, color: T.textFaint, fontStyle: 'italic', flex: 1 }}>
          {cat.emptyLabel}
        </div>
      ) : (
        <>
          {/* Value badge */}
          <div style={{
            display: 'inline-block',
            alignSelf: 'flex-start',
            background: badgeBg,
            color: accent,
            fontWeight: 800,
            fontSize: 18,
            borderRadius: 8,
            padding: '3px 10px',
            letterSpacing: '-0.3px',
          }}>
            {cat.format(leader.value)}
          </div>

          {/* Leaders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {leader.teams.map((team) => (
              <div key={team.teamId}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{team.flagEmoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{team.teamName}</span>
                  {leader.tied && (
                    <span style={{ fontSize: 10, color: T.textFaint, fontStyle: 'italic' }}>tied</span>
                  )}
                </div>
                {team.memberName && (
                  <div style={{ paddingLeft: 22, fontSize: 11, color: T.textMuted }}>
                    {team.memberName}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface Props {
  teams: StatLeaderTeam[];
}

export default function StatLeaders({ teams }: Props) {
  return (
    <div style={{ marginTop: 28, marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, margin: '0 0 12px', letterSpacing: '-0.3px' }}>
        Stat Leaders
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
      }}>
        {STAT_CATEGORIES.map((cat) => (
          <StatCard key={cat.id} cat={cat} leader={computeLeader(teams, cat)} />
        ))}
      </div>
    </div>
  );
}
