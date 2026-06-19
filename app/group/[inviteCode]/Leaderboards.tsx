'use client';

import { useState } from 'react';
import { METRICS, CI_METRICS, type TeamStats, type TeamCIStats } from '@/lib/wsi';
import { T } from '@/lib/theme';
import { type RankChange } from '@/lib/daily-summary';

export interface FixtureDetail {
  fixtureId: number;
  opponentId: number;
  opponentName: string;
  opponentFlag: string;
  matchDate: string;
  isHome: boolean;
  goalsFor: number;
  goalsAgainst: number;
  matchPoints: number;       // 3=W, 1=D, 0=L
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  penMissed: number;
  penScored: number;
  cleanSheet: boolean;
  shotsOnTarget: number;
  setBigDefeat: boolean;
  defeatMargin: number;
  setBigWin: boolean;
  winMargin: number;
  setFastGoal: boolean;
  fastGoalMinute: number | null;
  setFastScored: boolean;
  fastScoredMinute: number | null;
}

export interface TeamEntry {
  teamId: number;
  teamName: string;
  flagEmoji: string;
  memberName: string;
  wsiScore: number;
  ciScore: number;
  stats: TeamStats & TeamCIStats;
  fixtures?: FixtureDetail[];
}

// ── Fixture attribution helpers ─────────────────────────────────────────────
function getWSIFixtureLines(key: string, fixtures: FixtureDetail[]): string[] | null {
  switch (key) {
    case 'conceded':
      return fixtures.filter(f => f.goalsAgainst > 0)
        .map(f => `${f.opponentFlag} ${f.opponentName} ${f.goalsAgainst}`);
    case 'yellows':
      return fixtures.filter(f => f.yellowCards > 0)
        .map(f => `${f.opponentFlag} ${f.opponentName} ${f.yellowCards}`);
    case 'reds':
      return fixtures.filter(f => f.redCards > 0)
        .map(f => `${f.opponentFlag} ${f.opponentName} ${f.redCards}`);
    case 'og':
      return fixtures.filter(f => f.ownGoals > 0)
        .map(f => `${f.opponentFlag} ${f.opponentName} ${f.ownGoals}`);
    case 'penmiss':
      return fixtures.filter(f => f.penMissed > 0)
        .map(f => `${f.opponentFlag} ${f.opponentName} ${f.penMissed}`);
    case 'bigdefeat':
      return fixtures.filter(f => f.setBigDefeat)
        .map(f => `vs ${f.opponentFlag} ${f.opponentName}`);
    case 'fastgoal':
      return fixtures.filter(f => f.setFastGoal)
        .map(f => `vs ${f.opponentFlag} ${f.opponentName} · min ${f.fastGoalMinute}`);
    case 'points':
      return fixtures.map(f => `${f.opponentFlag} ${f.matchPoints === 3 ? 'W' : f.matchPoints === 1 ? 'D' : 'L'}`);
    default:
      return null;
  }
}

function getCIFixtureLines(key: string, fixtures: FixtureDetail[]): string[] | null {
  switch (key) {
    case 'scored':
      return fixtures.filter(f => f.goalsFor > 0)
        .map(f => `${f.opponentFlag} ${f.opponentName} ${f.goalsFor}`);
    case 'penscored':
      return fixtures.filter(f => f.penScored > 0)
        .map(f => `${f.opponentFlag} ${f.opponentName} ${f.penScored}`);
    case 'cleansheets':
      return fixtures.filter(f => f.cleanSheet)
        .map(f => `vs ${f.opponentFlag} ${f.opponentName}`);
    case 'shotsontarget':
      return fixtures.filter(f => f.shotsOnTarget > 0)
        .map(f => `${f.opponentFlag} ${f.opponentName} ${f.shotsOnTarget}`);
    case 'bigwin':
      return fixtures.filter(f => f.setBigWin)
        .map(f => `vs ${f.opponentFlag} ${f.opponentName}`);
    case 'fastscored':
      return fixtures.filter(f => f.setFastScored)
        .map(f => `vs ${f.opponentFlag} ${f.opponentName} · min ${f.fastScoredMinute}`);
    case 'pts_group':
      return fixtures.map(f => `${f.opponentFlag} ${f.matchPoints === 3 ? 'W' : f.matchPoints === 1 ? 'D' : 'L'}`);
    default:
      return null;
  }
}

// ── Compact stat breakdown ─────────────────────────────────────────────────
function WSIBreakdown({ stats, fixtures }: { stats: TeamStats; fixtures?: FixtureDetail[] }) {
  const rows = METRICS
    .map(m => ({ m, contribution: m.compute(stats[m.key as keyof TeamStats] as number) }))
    .filter(({ contribution }) => contribution > 0);

  if (rows.length === 0) {
    return (
      <div style={{ paddingLeft: 24, paddingTop: 6, paddingBottom: 2 }}>
        <span style={{ fontSize: 11, color: T.textMuted, fontStyle: 'italic' }}>No shame contributions yet</span>
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: 24, paddingTop: 6, paddingBottom: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {rows.map(({ m, contribution }) => {
        const key = m.key as string;
        const lines = fixtures ? getWSIFixtureLines(key, fixtures) : null;
        return (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, minWidth: 16 }}>{m.icon}</span>
              <span style={{ flex: 1, fontSize: 11, color: T.textSecondary }}>{m.label}</span>
              <span style={{ fontSize: 11, color: T.textMuted, fontFamily: 'monospace', marginRight: 8 }}>
                {m.display(stats[m.key as keyof TeamStats] as number)}
              </span>
              <span style={{ fontSize: 11, color: T.wsi, fontFamily: 'monospace', minWidth: 32, textAlign: 'right' }}>
                +{contribution % 1 === 0 ? contribution.toFixed(0) : contribution.toFixed(1)}
              </span>
            </div>
            {lines && lines.length > 0 && (
              <div style={{ paddingLeft: 22, paddingBottom: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {lines.slice(0, 4).map((line, i) => (
                  <span key={i} style={{ fontSize: 10, color: T.textMuted, background: T.inputBg, borderRadius: 4, padding: '1px 5px' }}>
                    {line}
                  </span>
                ))}
                {lines.length > 4 && (
                  <span style={{ fontSize: 10, color: T.textFaint, padding: '1px 3px' }}>
                    +{lines.length - 4} more
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CIBreakdown({ stats, fixtures }: { stats: TeamCIStats; fixtures?: FixtureDetail[] }) {
  const rows = CI_METRICS
    .map(m => ({ m, contribution: m.compute(stats[m.key as keyof TeamCIStats] as number) }))
    .filter(({ contribution }) => contribution > 0);

  if (rows.length === 0) {
    return (
      <div style={{ paddingLeft: 24, paddingTop: 6, paddingBottom: 2 }}>
        <span style={{ fontSize: 11, color: T.textMuted, fontStyle: 'italic' }}>No glory contributions yet</span>
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: 24, paddingTop: 6, paddingBottom: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {rows.map(({ m, contribution }) => {
        const key = m.key as string;
        const lines = fixtures ? getCIFixtureLines(key, fixtures) : null;
        return (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, minWidth: 16 }}>{m.icon}</span>
              <span style={{ flex: 1, fontSize: 11, color: T.textSecondary }}>{m.label}</span>
              <span style={{ fontSize: 11, color: T.textMuted, fontFamily: 'monospace', marginRight: 8 }}>
                {m.display(stats[m.key as keyof TeamCIStats] as number)}
              </span>
              <span style={{ fontSize: 11, color: T.ci, fontFamily: 'monospace', minWidth: 32, textAlign: 'right' }}>
                +{contribution % 1 === 0 ? contribution.toFixed(0) : contribution.toFixed(1)}
              </span>
            </div>
            {lines && lines.length > 0 && (
              <div style={{ paddingLeft: 22, paddingBottom: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {lines.slice(0, 4).map((line, i) => (
                  <span key={i} style={{ fontSize: 10, color: T.textMuted, background: T.inputBg, borderRadius: 4, padding: '1px 5px' }}>
                    {line}
                  </span>
                ))}
                {lines.length > 4 && (
                  <span style={{ fontSize: 10, color: T.textFaint, padding: '1px 3px' }}>
                    +{lines.length - 4} more
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Mood emoji helpers ─────────────────────────────────────────────────────
function getWSIMoodEmoji(rank: number, rc?: RankChange): string | null {
  if (rank === 0) return '😭';
  if (!rc) return null;
  if (rc.wsiRankBefore > rc.wsiRankAfter) return '😬'; // moved up = more shame
  if (rc.wsiRankBefore < rc.wsiRankAfter) return '😌'; // moved down = less shame
  return null;
}

function getCIMoodEmoji(rank: number, rc?: RankChange): string | null {
  if (rank === 0) return '🥳';
  if (!rc) return null;
  if (rc.ciRankBefore > rc.ciRankAfter) return '🤩'; // moved up = more glory
  if (rc.ciRankBefore < rc.ciRankAfter) return '😔'; // moved down = less glory
  return null;
}

// ── WSI Leaderboard ────────────────────────────────────────────────────────
export function WSILeaderboard({ entries, showScores = true, rankChanges }: { entries: TeamEntry[]; showScores?: boolean; rankChanges?: Record<number, RankChange> }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const sorted = [...entries].sort((a, b) => b.wsiScore - a.wsiScore);
  const max    = Math.max(...sorted.map(e => e.wsiScore), 1);

  return (
    <div style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 14, padding: '18px 18px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
        🥄 Wooden Spoon Index
      </div>
      {sorted.map((entry, rank) => {
        const pct      = showScores ? Math.round(entry.wsiScore / max * 100) : 0;
        const isWorst  = showScores && rank === 0;
        const expanded = expandedId === entry.teamId;
        const emoji    = showScores ? getWSIMoodEmoji(rank, rankChanges?.[entry.teamId]) : null;

        const rowContent = (
          <div key={entry.teamId} style={{ borderBottom: rank < sorted.length - 1 ? `0.5px solid ${T.divider}` : 'none' }}>
            <div
              onClick={() => showScores && setExpandedId(expanded ? null : entry.teamId)}
              style={{ padding: '8px 0', cursor: showScores ? 'pointer' : 'default' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 12, color: T.textMuted, minWidth: 16, textAlign: 'right' }}>{rank + 1}</span>
                {emoji && <span style={{ fontSize: 14, lineHeight: 1 }}>{emoji}</span>}
                {showScores && <span style={{ fontSize: 11, color: T.textFaint }}>{expanded ? '▾' : '▸'}</span>}
                <span style={{ fontSize: 18, lineHeight: 1 }}>{entry.flagEmoji}</span>
                <span style={{ fontSize: 14, fontWeight: isWorst ? 700 : 500, flex: 1, color: T.textPrimary }}>
                  {isWorst && <span style={{ fontSize: 11, background: T.wsi, color: '#FFFFFF', borderRadius: 99, padding: '2px 8px', marginRight: 6, fontWeight: 600 }}>🥄 spoon</span>}
                  {entry.teamName}
                </span>
                <span style={{ fontSize: isWorst ? 17 : 14, fontWeight: isWorst ? 700 : 400, color: isWorst ? T.wsi : T.textSecondary }}>
                  {showScores ? entry.wsiScore.toFixed(1) : '—'}
                </span>
              </div>
              <div style={{ paddingLeft: 24, marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>{entry.memberName}</span>
              </div>
              <div style={{ paddingLeft: 24 }}>
                <div style={{ height: 4, background: T.track, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: T.wsi, borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
              </div>
            </div>
            {expanded && (
              <div style={{ borderTop: `0.5px solid ${T.divider}`, marginBottom: 6 }}>
                <WSIBreakdown stats={entry.stats} fixtures={entry.fixtures} />
              </div>
            )}
          </div>
        );

        if (isWorst) {
          return (
            <div key={entry.teamId} style={{ background: T.wsiRank1Bg, border: `1.5px solid ${T.wsiRank1Border}`, borderRadius: 10, boxShadow: T.wsiRank1Shadow, margin: '0 -4px 6px', padding: '0 4px' }}>
              {rowContent}
            </div>
          );
        }
        return rowContent;
      })}
    </div>
  );
}

// ── CI Leaderboard ─────────────────────────────────────────────────────────
export function CILeaderboard({ entries, showScores = true, rankChanges }: { entries: TeamEntry[]; showScores?: boolean; rankChanges?: Record<number, RankChange> }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const sorted = [...entries].sort((a, b) => b.ciScore - a.ciScore);
  const max    = Math.max(...sorted.map(e => e.ciScore), 1);

  return (
    <div style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 14, padding: '18px 18px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
        🏆 Champion Index
      </div>
      {sorted.map((entry, rank) => {
        const pct      = showScores ? Math.round(entry.ciScore / max * 100) : 0;
        const isTop    = showScores && rank === 0;
        const expanded = expandedId === entry.teamId;
        const emoji    = showScores ? getCIMoodEmoji(rank, rankChanges?.[entry.teamId]) : null;

        const rowContent = (
          <div key={entry.teamId} style={{ borderBottom: rank < sorted.length - 1 ? `0.5px solid ${T.divider}` : 'none' }}>
            <div
              onClick={() => showScores && setExpandedId(expanded ? null : entry.teamId)}
              style={{ padding: '8px 0', cursor: showScores ? 'pointer' : 'default' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 12, color: T.textMuted, minWidth: 16, textAlign: 'right' }}>{rank + 1}</span>
                {emoji && <span style={{ fontSize: 14, lineHeight: 1 }}>{emoji}</span>}
                {showScores && <span style={{ fontSize: 11, color: T.textFaint }}>{expanded ? '▾' : '▸'}</span>}
                <span style={{ fontSize: 18, lineHeight: 1 }}>{entry.flagEmoji}</span>
                <span style={{ fontSize: 14, fontWeight: isTop ? 700 : 500, flex: 1, color: T.textPrimary }}>
                  {isTop && <span style={{ fontSize: 11, background: T.ci, color: '#FFFFFF', borderRadius: 99, padding: '2px 8px', marginRight: 6, fontWeight: 600 }}>🏆 glory</span>}
                  {entry.teamName}
                </span>
                <span style={{ fontSize: isTop ? 17 : 14, fontWeight: isTop ? 700 : 400, color: isTop ? T.ci : T.textSecondary }}>
                  {showScores ? entry.ciScore.toFixed(1) : '—'}
                </span>
              </div>
              <div style={{ paddingLeft: 24, marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>{entry.memberName}</span>
              </div>
              <div style={{ paddingLeft: 24 }}>
                <div style={{ height: 4, background: T.track, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: T.ci, borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
              </div>
            </div>
            {expanded && (
              <div style={{ borderTop: `0.5px solid ${T.divider}`, marginBottom: 6 }}>
                <CIBreakdown stats={entry.stats} fixtures={entry.fixtures} />
              </div>
            )}
          </div>
        );

        if (isTop) {
          return (
            <div key={entry.teamId} style={{ background: T.ciRank1Bg, border: `1.5px solid ${T.ciRank1Border}`, borderRadius: 10, boxShadow: T.ciRank1Shadow, margin: '0 -4px 6px', padding: '0 4px' }}>
              {rowContent}
            </div>
          );
        }
        return rowContent;
      })}
    </div>
  );
}
