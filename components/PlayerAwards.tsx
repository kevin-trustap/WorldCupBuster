'use client';

import { T } from '@/lib/theme';
import type { AwardCategory } from '@/lib/api-football';

export type { AwardCategory };

export interface PlayerAwardDisplayRow {
  category:    AwardCategory;
  rank:        number;
  player_name: string;
  nationality: string | null;
  team_name:   string;
  flag_emoji:  string;
  stat_value:  number;
  member_name: string | null;
}

const AWARD_META: Record<AwardCategory, { icon: string; label: string; unit: string; affinity: 'ci' | 'wsi' }> = {
  topscorers:     { icon: '👟', label: 'Golden Boot',     unit: 'goals',   affinity: 'ci'  },
  topassists:     { icon: '🎯', label: 'Top Assists',      unit: 'assists', affinity: 'ci'  },
  topyellowcards: { icon: '🟨', label: 'Worst Discipline', unit: 'yellows', affinity: 'wsi' },
  topredcards:    { icon: '🟥', label: 'Red Card Shame',   unit: 'reds',    affinity: 'wsi' },
};

const CATEGORY_ORDER: AwardCategory[] = ['topscorers', 'topassists', 'topyellowcards', 'topredcards'];
const RANK_MEDALS = ['🥇', '🥈', '🥉'];

interface Props {
  awards: PlayerAwardDisplayRow[];
}

function AwardCard({ players }: { players: PlayerAwardDisplayRow[] }) {
  const meta    = AWARD_META[players[0].category];
  const accent  = meta.affinity === 'ci' ? T.ci : T.wsi;
  const badgeBg = meta.affinity === 'ci' ? T.ciBadgeBg : T.wsiBadgeBg;

  return (
    <div style={{
      background: T.card,
      border: `0.5px solid ${T.cardBorder}`,
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {meta.icon} {meta.label}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {players.map((p, i) => (
          <div key={p.rank} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 14, lineHeight: '1.4', flexShrink: 0, minWidth: 20 }}>
              {RANK_MEDALS[i] ?? `${p.rank}.`}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{p.player_name}</span>
                <span style={{
                  background: badgeBg,
                  color: accent,
                  fontWeight: 700,
                  fontSize: 11,
                  borderRadius: 6,
                  padding: '1px 7px',
                  whiteSpace: 'nowrap',
                }}>
                  {p.stat_value} {meta.unit}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <span style={{ fontSize: 13 }}>{p.flag_emoji}</span>
                <span style={{ fontSize: 11, color: T.textSecondary }}>{p.team_name}</span>
              </div>
              {p.member_name && (
                <div style={{ fontSize: 11, color: T.textMuted }}>
                  {p.member_name}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlayerAwards({ awards }: Props) {
  const byCategory = new Map<AwardCategory, PlayerAwardDisplayRow[]>();
  for (const a of awards) {
    if (!byCategory.has(a.category)) byCategory.set(a.category, []);
    byCategory.get(a.category)!.push(a);
  }

  const cards = CATEGORY_ORDER.map(cat => byCategory.get(cat)).filter(Boolean) as PlayerAwardDisplayRow[][];
  if (cards.length === 0) return null;

  return (
    <div style={{ marginTop: 28, marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, margin: '0 0 12px', letterSpacing: '-0.3px' }}>
        Player Awards
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
      }}>
        {cards.map(players => <AwardCard key={players[0].category} players={players} />)}
      </div>
    </div>
  );
}
