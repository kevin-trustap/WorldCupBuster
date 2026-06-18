'use client';

import { useState } from 'react';
import { T } from '@/lib/theme';
import type { DailySummaryItem, RankChange, TodaysFixture } from '@/lib/daily-summary';

interface Props {
  fixtures: TodaysFixture[];
  items: DailySummaryItem[];
  rankChanges: Record<number, RankChange>;
  date: string;      // today's date (YYYY-MM-DD), used as upper bound
  groupId?: string;  // group page passes this; home page omits it
}

function fmtDelta(v: number): string {
  if (v === 0) return '0.0';
  const abs = Math.abs(v).toFixed(1);
  return v > 0 ? `+${abs}` : `-${abs}`;
}

function wsiNarrative(item: DailySummaryItem): string {
  const parts: string[] = [];
  const totalConceded = item.teams.reduce((s, t) => s + t.goals_against, 0);
  if (totalConceded > 0) parts.push(`conceded ${totalConceded} goal${totalConceded !== 1 ? 's' : ''}`);

  if (parts.length === 0 && item.totalWSIDelta === 0) return 'no WSI activity';
  if (parts.length === 0) return `${fmtDelta(item.totalWSIDelta)} WSI shame pts`;
  return `${parts.join(', ')}, adding ${fmtDelta(item.totalWSIDelta)} WSI shame pts`;
}

function ciNarrative(item: DailySummaryItem): string {
  const parts: string[] = [];
  const totalScored = item.teams.reduce((s, t) => s + t.goals_for, 0);
  const cleanSheets = item.teams.filter(t => t.goals_against === 0).length;

  if (totalScored > 0) parts.push(`scored ${totalScored} goal${totalScored !== 1 ? 's' : ''}`);
  if (cleanSheets > 0) parts.push(`${cleanSheets === item.teams.length ? 'clean sheet' : `${cleanSheets} clean sheet${cleanSheets !== 1 ? 's' : ''}`}`);

  if (parts.length === 0 && item.totalCIDelta === 0) return 'no CI activity';
  if (parts.length === 0) return `${fmtDelta(item.totalCIDelta)} glory pts`;
  return `${parts.join(' with ')}, earning ${fmtDelta(item.totalCIDelta)} glory pts`;
}

function rankMovement(before: number, after: number, label: string): string {
  const moved = before - after;
  if (moved > 0) return `moved up ${moved} spot${moved !== 1 ? 's' : ''} to #${after} in the ${label}`;
  if (moved < 0) return `dropped ${Math.abs(moved)} spot${Math.abs(moved) !== 1 ? 's' : ''} to #${after} in the ${label}`;
  return `holds #${after} in the ${label}`;
}

const TOURNAMENT_START = '2026-06-11';

function shiftDate(d: string, delta: number): string {
  const dt = new Date(d + 'T12:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().split('T')[0];
}

export default function DailySummary({ fixtures, items, rankChanges, date, groupId }: Props) {
  const [displayDate, setDisplayDate] = useState(date);
  const [fetched, setFetched] = useState<{ fixtures: TodaysFixture[]; items: DailySummaryItem[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(fixtures.length > 0 || items.length > 0);

  const isToday           = displayDate === date;
  const activeFixtures    = isToday ? fixtures : (fetched?.fixtures ?? []);
  const activeItems       = isToday ? items    : (fetched?.items    ?? []);
  const activeRankChanges = isToday ? rankChanges : {};
  const hasActivity       = !loading && (activeFixtures.length > 0 || activeItems.length > 0);
  const canGoPrev         = !loading && displayDate > TOURNAMENT_START;
  const canGoNext         = !loading && displayDate < date;

  const formattedDate = new Date(displayDate + 'T12:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  async function navigate(newDate: string) {
    setDisplayDate(newDate);
    setOpen(true);
    if (newDate === date) { setFetched(null); return; }
    setFetched(null);
    setLoading(true);
    try {
      const url = `/api/daily-summary?date=${newDate}${groupId ? `&groupId=${encodeURIComponent(groupId)}` : ''}`;
      const res = await fetch(url);
      setFetched(await res.json());
    } finally {
      setLoading(false);
    }
  }

  const wsiItems = [...activeItems].sort((a, b) => Math.abs(b.totalWSIDelta) - Math.abs(a.totalWSIDelta));
  const ciItems  = [...activeItems].sort((a, b) => Math.abs(b.totalCIDelta)  - Math.abs(a.totalCIDelta));

  return (
    <div style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
        <div>
          {/* Title — click to toggle */}
          <div
            onClick={() => setOpen(o => !o)}
            style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, cursor: 'pointer' }}
          >
            {hasActivity
              ? (isToday ? '📅 What happened today' : '📅 What happened')
              : (isToday ? '📅 No matches today'    : '📅 No matches')}
          </div>

          {/* Date row with prev/next — no propagation needed */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <button
              onClick={() => navigate(shiftDate(displayDate, -1))}
              disabled={!canGoPrev}
              style={{
                background: 'none', border: 'none', padding: '0 2px', fontSize: 11,
                cursor: canGoPrev ? 'pointer' : 'default',
                color: canGoPrev ? T.textSecondary : T.textFaint,
              }}
            >◀</button>
            <span style={{ fontSize: 11, color: T.textMuted }}>
              {loading ? 'Loading…' : formattedDate}
            </span>
            <button
              onClick={() => navigate(shiftDate(displayDate, 1))}
              disabled={!canGoNext}
              style={{
                background: 'none', border: 'none', padding: '0 2px', fontSize: 11,
                cursor: canGoNext ? 'pointer' : 'default',
                color: canGoNext ? T.textSecondary : T.textFaint,
              }}
            >▶</button>
          </div>
        </div>

        {/* Accordion toggle — dedicated button, no propagation needed */}
        <button
          onClick={() => setOpen(o => !o)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: T.textFaint, fontSize: 11 }}
        >
          {open ? '▲' : '▼'}
        </button>
      </div>

      {open && (
        <div style={{ borderTop: `0.5px solid ${T.cardBorder}`, padding: '14px 18px' }}>
          {loading ? (
            <div style={{ fontSize: 13, color: T.textMuted, fontStyle: 'italic' }}>Loading…</div>
          ) : !hasActivity ? (
            <div style={{ fontSize: 13, color: T.textMuted, fontStyle: 'italic' }}>
              {isToday ? 'No fixtures synced for today yet.' : 'No fixtures synced for this day.'}
            </div>
          ) : (
            <>
              {/* Match Results */}
              {activeFixtures.length > 0 && (
                <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `0.5px solid ${T.cardBorder}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                    ⚽ Match Results
                  </div>
                  {activeFixtures.map((f, i) => (
                    <div
                      key={f.fixtureId}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 0',
                        borderBottom: i < activeFixtures.length - 1 ? `0.5px solid ${T.divider}` : 'none',
                        fontSize: 13,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{f.homeTeam.flag_emoji}</span>
                      <span style={{ flex: 1, color: T.textPrimary }}>{f.homeTeam.name}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: T.textPrimary, minWidth: 32, textAlign: 'center' }}>
                        {f.homeGoals}–{f.awayGoals}
                      </span>
                      <span style={{ flex: 1, color: T.textPrimary, textAlign: 'right' }}>{f.awayTeam.name}</span>
                      <span style={{ fontSize: 16 }}>{f.awayTeam.flag_emoji}</span>
                      <span style={{ fontSize: 10, color: T.textMuted, marginLeft: 6, whiteSpace: 'nowrap' }}>{f.round.replace('Group Stage - ', 'Grp ')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* WSI + CI Races */}
              {activeItems.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>

                  {/* WSI Race */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.wsi, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                      🥄 WSI Race
                    </div>
                    {wsiItems.filter(i => i.totalWSIDelta !== 0).length === 0 ? (
                      <div style={{ fontSize: 12, color: T.textMuted, fontStyle: 'italic' }}>No WSI changes today</div>
                    ) : (
                      wsiItems.map(item => (
                        <div key={item.memberName} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `0.5px solid ${T.divider}` }}>
                          {item.teams.map(t => {
                            const rc = activeRankChanges[t.teamId];
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
                    {ciItems.filter(i => i.totalCIDelta !== 0).length === 0 ? (
                      <div style={{ fontSize: 12, color: T.textMuted, fontStyle: 'italic' }}>No CI changes today</div>
                    ) : (
                      ciItems.map(item => (
                        <div key={item.memberName} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `0.5px solid ${T.divider}` }}>
                          {item.teams.map(t => {
                            const rc = activeRankChanges[t.teamId];
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
