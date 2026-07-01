'use client';

import { T } from '@/lib/theme';
import type { AwardCategory } from '@/lib/api-football';

export type { AwardCategory };

export interface PlayerAwardDisplayRow {
  category:    AwardCategory;
  player_name: string;
  nationality: string | null;
  team_name:   string;
  flag_emoji:  string;
  stat_value:  number;
  member_name: string | null;
}

export interface GoldenGloveTeam {
  team_name:   string;
  flag_emoji:  string;
  cleansheets: number;
  member_name: string | null;
}

const AWARD_META: Record<AwardCategory, { icon: string; label: string; unit: string; affinity: 'ci' | 'wsi' }> = {
  topscorers:     { icon: '👟', label: 'Golden Boot',     unit: 'goals',   affinity: 'ci'  },
  topassists:     { icon: '🎯', label: 'Top Assists',      unit: 'assists', affinity: 'ci'  },
  topyellowcards: { icon: '🟨', label: 'Worst Discipline', unit: 'yellows', affinity: 'wsi' },
  topredcards:    { icon: '🟥', label: 'Red Card Shame',   unit: 'reds',    affinity: 'wsi' },
};

const CATEGORY_ORDER: AwardCategory[] = ['topscorers', 'topassists', 'topyellowcards', 'topredcards'];

interface Props {
  awards:      PlayerAwardDisplayRow[];
  goldenGlove: GoldenGloveTeam | null;
}

function AwardCard({ award }: { award: PlayerAwardDisplayRow }) {
  const meta = AWARD_META[award.category];
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
      gap: 8,
      minHeight: 110,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {meta.icon} {meta.label}
      </div>
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
        {award.stat_value} {meta.unit}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
          {award.player_name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
          <span style={{ fontSize: 15 }}>{award.flag_emoji}</span>
          <span style={{ fontSize: 12, color: T.textSecondary }}>{award.team_name}</span>
        </div>
        {award.member_name && (
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
            {award.member_name}
          </div>
        )}
      </div>
    </div>
  );
}

function GoldenGloveCard({ gg }: { gg: GoldenGloveTeam }) {
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
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        🧤 Golden Glove
      </div>
      <div style={{
        display: 'inline-block',
        alignSelf: 'flex-start',
        background: T.ciBadgeBg,
        color: T.ci,
        fontWeight: 800,
        fontSize: 18,
        borderRadius: 8,
        padding: '3px 10px',
        letterSpacing: '-0.3px',
      }}>
        {gg.cleansheets} clean sheets
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 15 }}>{gg.flag_emoji}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{gg.team_name}</span>
        </div>
        {gg.member_name && (
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
            {gg.member_name}
          </div>
        )}
        <div style={{ fontSize: 10, color: T.textFaint, fontStyle: 'italic', marginTop: 4 }}>
          Team-level proxy — no free API for individual saves
        </div>
      </div>
    </div>
  );
}

export default function PlayerAwards({ awards, goldenGlove }: Props) {
  const byCategory = new Map<AwardCategory, PlayerAwardDisplayRow>();
  for (const a of awards) byCategory.set(a.category, a);

  const cards = CATEGORY_ORDER.map(cat => byCategory.get(cat)).filter(Boolean) as PlayerAwardDisplayRow[];
  const hasContent = cards.length > 0 || goldenGlove !== null;
  if (!hasContent) return null;

  return (
    <div style={{ marginTop: 28, marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, margin: '0 0 12px', letterSpacing: '-0.3px' }}>
        Player Awards
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
      }}>
        {cards.map(a => <AwardCard key={a.category} award={a} />)}
        {goldenGlove && <GoldenGloveCard gg={goldenGlove} />}
      </div>
    </div>
  );
}
