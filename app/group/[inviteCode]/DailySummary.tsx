'use client';

import { useState } from 'react';
import { T } from '@/lib/theme';
import type { DailySummaryItem, RankChange } from '@/lib/daily-summary';

interface Props {
  items: DailySummaryItem[];
  rankChanges: Record<number, RankChange>;
  date: string;
}

function fmtDelta(v: number): string {
  if (v === 0) return '0.0';
  const abs = Math.abs(v).toFixed(1);
  return v > 0 ? `+${abs}` : `-${abs}`;
}

function wsiNarrative(item: DailySummaryItem): string {
  if (item.totalWSIDelta === 0) return 'no WSI impact';
  const parts: string[] = [];
  const totalConceded = item.teams.reduce((s, t) => s + t.goals_against, 0);
  if (totalConceded > 0) parts.push(`conceded ${totalConceded} goal${totalConceded !== 1 ? 's' : ''}`);

  if (parts.length === 0) return `${fmtDelta(item.totalWSIDelta)} WSI shame pts`;
  return `${parts.join(', ')}, adding ${fmtDelta(item.totalWSIDelta)} WSI shame pts`;
}

function ciNarrative(item: DailySummaryItem): string {
  if (item.totalCIDelta === 0) return 'no CI impact';
  const parts: string[] = [];
  const totalScored = item.teams.reduce((s, t) => s + t.goals_for, 0);
  const cleanSheets = item.teams.filter(t => t.goals_against === 0).length;

  if (totalScored > 0) parts.push(`scored ${totalScored} goal${totalScored !== 1 ? 's' : ''}`);
  if (cleanSheets > 0) parts.push(`${cleanSheets === item.teams.length ? 'clean sheet' : `${cleanSheets} clean sheet${cleanSheets !== 1 ? 's' : ''}`}`);

  if (parts.length === 0) return `${fmtDelta(item.totalCIDelta)} glory pts`;
  return `${parts.join(' with ')}, earning ${fmtDelta(item.totalCIDelta)} glory pts`;
}

function rankMovement(before: number, after: number, label: string): string {
  const moved = before - after; // positive = moved up (lower rank number is better for WSI/CI)
  if (moved > 0) return `moved up ${moved} spot${moved !== 1 ? 's' : ''} to #${after} in the ${label}`;
  if (moved < 0) return `dropped ${Math.abs(moved)} spot${Math.abs(moved) !== 1 ? 's' : ''} to #${after} in the ${label}`;
  return `holds #${after} in the ${label}`;
}

export default function DailySummary({ items, rankChanges, date }: Props) {
  const hasActivity = items.length > 0;
  const [open, setOpen] = useState(hasActivity);

  // Sort by biggest total delta (most activity first)
  const wsiItems = [...items].sort((a, b) => Math.abs(b.totalWSIDelta) - Math.abs(a.totalWSIDelta));
  const ciItems  = [...items].sort((a, b) => Math.abs(b.totalCIDelta)  - Math.abs(a.totalCIDelta));

  const formattedDate = new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>
            {hasActivity ? '📅 What happened today' : '📅 No matches today'}
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{formattedDate}</div>
        </div>
        <span style={{ fontSize: 11, color: T.textFaint }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ borderTop: `0.5px solid ${T.cardBorder}`, padding: '14px 18px' }}>
          {!hasActivity ? (
            <div style={{ fontSize: 13, color: T.textMuted, fontStyle: 'italic' }}>
              No fixtures synced for today yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>

              {/* WSI Race */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.wsi, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                  🥄 WSI Race
                </div>
                {wsiItems.length === 0 ? (
                  <div style={{ fontSize: 12, color: T.textMuted, fontStyle: 'italic' }}>No WSI changes today</div>
                ) : (
                  wsiItems.map(item => (
                    <div key={item.memberName} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `0.5px solid ${T.divider}` }}>
                      {item.teams.map(t => {
                        const rc = rankChanges[t.teamId];
                        return (
                          <div key={t.teamName}>
                            <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 2 }}>
                              <span style={{ marginRight: 4 }}>{t.flagEmoji}</span>
                              <span style={{ color: T.textPrimary, fontWeight: 500 }}>{t.teamName}</span>
                              {' '}{wsiNarrative({ ...item, teams: [t], totalWSIDelta: t.wsiDelta, totalCIDelta: t.ciDelta })}
                            </div>
                            {rc && (
                              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4, paddingLeft: 20 }}>
                                <span style={{ fontWeight: 600, color: T.textPrimary }}>{item.memberName}</span>
                                {' '}{rankMovement(rc.wsiRankBefore, rc.wsiRankAfter, 'Wooden Spoon race')}
                                {' '}
                                <span style={{ color: t.wsiDelta > 0 ? T.wsi : T.ci, fontWeight: 600 }}>
                                  ({fmtDelta(t.wsiDelta)} pts)
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* CI Race */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.ci, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                  🏆 CI Race
                </div>
                {ciItems.length === 0 ? (
                  <div style={{ fontSize: 12, color: T.textMuted, fontStyle: 'italic' }}>No CI changes today</div>
                ) : (
                  ciItems.map(item => (
                    <div key={item.memberName} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `0.5px solid ${T.divider}` }}>
                      {item.teams.map(t => {
                        const rc = rankChanges[t.teamId];
                        return (
                          <div key={t.teamName}>
                            <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 2 }}>
                              <span style={{ marginRight: 4 }}>{t.flagEmoji}</span>
                              <span style={{ color: T.textPrimary, fontWeight: 500 }}>{t.teamName}</span>
                              {' '}{ciNarrative({ ...item, teams: [t], totalWSIDelta: t.wsiDelta, totalCIDelta: t.ciDelta })}
                            </div>
                            {rc && (
                              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4, paddingLeft: 20 }}>
                                <span style={{ fontWeight: 600, color: T.textPrimary }}>{item.memberName}</span>
                                {' '}{rankMovement(rc.ciRankBefore, rc.ciRankAfter, 'Champion Index')}
                                {' '}
                                <span style={{ color: t.ciDelta > 0 ? T.ci : T.wsi, fontWeight: 600 }}>
                                  ({fmtDelta(t.ciDelta)} pts)
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
