'use client';

import { useState } from 'react';
import { METRICS, CI_METRICS, type TeamStats, type TeamCIStats } from '@/lib/wsi';

export interface TeamEntry {
  teamId: number;
  teamName: string;
  flagEmoji: string;
  memberName: string;
  wsiScore: number;
  ciScore: number;
  stats: TeamStats & TeamCIStats;
}

// ── Compact stat breakdown ─────────────────────────────────────────────────
function WSIBreakdown({ stats }: { stats: TeamStats }) {
  const rows = METRICS
    .map(m => ({ m, contribution: m.compute(stats[m.key as keyof TeamStats] as number) }))
    .filter(({ contribution }) => contribution > 0);

  if (rows.length === 0) {
    return (
      <div style={{ paddingLeft: 24, paddingTop: 6, paddingBottom: 2 }}>
        <span style={{ fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>No shame contributions yet</span>
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: 24, paddingTop: 6, paddingBottom: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {rows.map(({ m, contribution }) => (
        <div key={m.key as string} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, minWidth: 16 }}>{m.icon}</span>
          <span style={{ flex: 1, fontSize: 11, color: '#999' }}>{m.label}</span>
          <span style={{ fontSize: 11, color: '#bbb', fontFamily: 'monospace', marginRight: 8 }}>
            {m.display(stats[m.key as keyof TeamStats] as number)}
          </span>
          <span style={{ fontSize: 11, color: '#c0392b', fontFamily: 'monospace', minWidth: 32, textAlign: 'right' }}>
            +{contribution % 1 === 0 ? contribution.toFixed(0) : contribution.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

function CIBreakdown({ stats }: { stats: TeamCIStats }) {
  const rows = CI_METRICS
    .map(m => ({ m, contribution: m.compute(stats[m.key as keyof TeamCIStats] as number) }))
    .filter(({ contribution }) => contribution > 0);

  if (rows.length === 0) {
    return (
      <div style={{ paddingLeft: 24, paddingTop: 6, paddingBottom: 2 }}>
        <span style={{ fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>No glory contributions yet</span>
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: 24, paddingTop: 6, paddingBottom: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {rows.map(({ m, contribution }) => (
        <div key={m.key as string} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, minWidth: 16 }}>{m.icon}</span>
          <span style={{ flex: 1, fontSize: 11, color: '#999' }}>{m.label}</span>
          <span style={{ fontSize: 11, color: '#bbb', fontFamily: 'monospace', marginRight: 8 }}>
            {m.display(stats[m.key as keyof TeamCIStats] as number)}
          </span>
          <span style={{ fontSize: 11, color: '#1d9e75', fontFamily: 'monospace', minWidth: 32, textAlign: 'right' }}>
            +{contribution % 1 === 0 ? contribution.toFixed(0) : contribution.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── WSI Leaderboard ────────────────────────────────────────────────────────
export function WSILeaderboard({ entries, showScores = true }: { entries: TeamEntry[]; showScores?: boolean }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const sorted = [...entries].sort((a, b) => b.wsiScore - a.wsiScore);
  const max    = Math.max(...sorted.map(e => e.wsiScore), 1);

  return (
    <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 14, padding: '18px 18px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
        🥄 Wooden Spoon Index
      </div>
      {sorted.map((entry, rank) => {
        const pct      = showScores ? Math.round(entry.wsiScore / max * 100) : 0;
        const isWorst  = showScores && rank === 0;
        const expanded = expandedId === entry.teamId;
        return (
          <div key={entry.teamId} style={{ borderBottom: rank < sorted.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
            <div
              onClick={() => showScores && setExpandedId(expanded ? null : entry.teamId)}
              style={{ padding: '8px 0', cursor: showScores ? 'pointer' : 'default' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 12, color: '#aaa', minWidth: 16, textAlign: 'right' }}>{rank + 1}</span>
                {showScores && <span style={{ fontSize: 11, color: '#bbb' }}>{expanded ? '▾' : '▸'}</span>}
                <span style={{ fontSize: 18, lineHeight: 1 }}>{entry.flagEmoji}</span>
                <span style={{ fontSize: 14, fontWeight: isWorst ? 700 : 500, flex: 1 }}>
                  {isWorst && <span style={{ fontSize: 11, background: '#fdecea', color: '#c0392b', borderRadius: 99, padding: '1px 7px', marginRight: 6, fontWeight: 600 }}>🥄 spoon</span>}
                  {entry.teamName}
                </span>
                <span style={{ fontSize: isWorst ? 17 : 14, fontWeight: isWorst ? 700 : 400, color: isWorst ? '#c0392b' : '#888' }}>
                  {showScores ? entry.wsiScore.toFixed(1) : '—'}
                </span>
              </div>
              <div style={{ paddingLeft: 24, marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#aaa' }}>{entry.memberName}</span>
              </div>
              <div style={{ paddingLeft: 24 }}>
                <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: '#c0392b', borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
              </div>
            </div>
            {expanded && (
              <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.05)', marginBottom: 6 }}>
                <WSIBreakdown stats={entry.stats} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── CI Leaderboard ─────────────────────────────────────────────────────────
export function CILeaderboard({ entries, showScores = true }: { entries: TeamEntry[]; showScores?: boolean }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const sorted = [...entries].sort((a, b) => b.ciScore - a.ciScore);
  const max    = Math.max(...sorted.map(e => e.ciScore), 1);

  return (
    <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 14, padding: '18px 18px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
        🏆 Champion Index
      </div>
      {sorted.map((entry, rank) => {
        const pct      = showScores ? Math.round(entry.ciScore / max * 100) : 0;
        const isTop    = showScores && rank === 0;
        const expanded = expandedId === entry.teamId;
        return (
          <div key={entry.teamId} style={{ borderBottom: rank < sorted.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
            <div
              onClick={() => showScores && setExpandedId(expanded ? null : entry.teamId)}
              style={{ padding: '8px 0', cursor: showScores ? 'pointer' : 'default' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 12, color: '#aaa', minWidth: 16, textAlign: 'right' }}>{rank + 1}</span>
                {showScores && <span style={{ fontSize: 11, color: '#bbb' }}>{expanded ? '▾' : '▸'}</span>}
                <span style={{ fontSize: 18, lineHeight: 1 }}>{entry.flagEmoji}</span>
                <span style={{ fontSize: 14, fontWeight: isTop ? 700 : 500, flex: 1 }}>
                  {isTop && <span style={{ fontSize: 11, background: '#fef9e7', color: '#b7770d', borderRadius: 99, padding: '1px 7px', marginRight: 6, fontWeight: 600 }}>🏆 glory</span>}
                  {entry.teamName}
                </span>
                <span style={{ fontSize: isTop ? 17 : 14, fontWeight: isTop ? 700 : 400, color: isTop ? '#1d9e75' : '#888' }}>
                  {showScores ? entry.ciScore.toFixed(1) : '—'}
                </span>
              </div>
              <div style={{ paddingLeft: 24, marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#aaa' }}>{entry.memberName}</span>
              </div>
              <div style={{ paddingLeft: 24 }}>
                <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: '#1d9e75', borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
              </div>
            </div>
            {expanded && (
              <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.05)', marginBottom: 6 }}>
                <CIBreakdown stats={entry.stats} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
