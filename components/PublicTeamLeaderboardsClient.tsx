'use client';

import { useState } from 'react';
import { METRICS, CI_METRICS, type TeamStats, type TeamCIStats } from '@/lib/wsi';
import { T } from '@/lib/theme';
import type { PublicTeamEntry } from './PublicTeamLeaderboards';

function WSIBreakdown({ stats }: { stats: TeamStats }) {
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
      {rows.map(({ m, contribution }) => (
        <div key={m.key as string} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, minWidth: 16 }}>{m.icon}</span>
          <span style={{ flex: 1, fontSize: 11, color: T.textSecondary }}>{m.label}</span>
          <span style={{ fontSize: 11, color: T.textMuted, fontFamily: 'monospace', marginRight: 8 }}>
            {m.display(stats[m.key as keyof TeamStats] as number)}
          </span>
          <span style={{ fontSize: 11, color: T.wsi, fontFamily: 'monospace', minWidth: 32, textAlign: 'right' }}>
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
        <span style={{ fontSize: 11, color: T.textMuted, fontStyle: 'italic' }}>No glory contributions yet</span>
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: 24, paddingTop: 6, paddingBottom: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {rows.map(({ m, contribution }) => (
        <div key={m.key as string} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, minWidth: 16 }}>{m.icon}</span>
          <span style={{ flex: 1, fontSize: 11, color: T.textSecondary }}>{m.label}</span>
          <span style={{ fontSize: 11, color: T.textMuted, fontFamily: 'monospace', marginRight: 8 }}>
            {m.display(stats[m.key as keyof TeamCIStats] as number)}
          </span>
          <span style={{ fontSize: 11, color: T.ci, fontFamily: 'monospace', minWidth: 32, textAlign: 'right' }}>
            +{contribution % 1 === 0 ? contribution.toFixed(0) : contribution.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

function WSIList({ entries }: { entries: PublicTeamEntry[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const sorted = [...entries].sort((a, b) => b.wsiScore - a.wsiScore);
  const max = Math.max(...sorted.map(e => e.wsiScore), 1);

  return (
    <div style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 14, padding: '18px 18px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
        🥄 Wooden Spoon Index
      </div>
      {sorted.map((entry, rank) => {
        const pct = Math.round(entry.wsiScore / max * 100);
        const isWorst = rank === 0;
        const expanded = expandedId === entry.teamId;

        const rowContent = (
          <div key={entry.teamId} style={{ borderBottom: rank < sorted.length - 1 ? `0.5px solid ${T.divider}` : 'none' }}>
            <div
              onClick={() => setExpandedId(expanded ? null : entry.teamId)}
              style={{ padding: '8px 0', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 12, color: T.textMuted, minWidth: 16, textAlign: 'right' }}>{rank + 1}</span>
                <span style={{ fontSize: 11, color: T.textFaint }}>{expanded ? '▾' : '▸'}</span>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{entry.flagEmoji}</span>
                <span style={{ fontSize: 14, fontWeight: isWorst ? 700 : 500, flex: 1, color: T.textPrimary }}>
                  {isWorst && <span style={{ fontSize: 11, background: T.wsi, color: '#FFFFFF', borderRadius: 99, padding: '2px 8px', marginRight: 6, fontWeight: 600 }}>🥄 spoon</span>}
                  {entry.teamName}
                </span>
                <span style={{ fontSize: isWorst ? 17 : 14, fontWeight: isWorst ? 700 : 400, color: isWorst ? T.wsi : T.textSecondary }}>
                  {entry.wsiScore.toFixed(1)}
                </span>
              </div>
              <div style={{ paddingLeft: 24 }}>
                <div style={{ height: 4, background: T.track, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: T.wsi, borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
              </div>
            </div>
            {expanded && (
              <div style={{ borderTop: `0.5px solid ${T.divider}`, marginBottom: 6 }}>
                <WSIBreakdown stats={entry.stats} />
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

function CIList({ entries }: { entries: PublicTeamEntry[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const sorted = [...entries].sort((a, b) => b.ciScore - a.ciScore);
  const max = Math.max(...sorted.map(e => e.ciScore), 1);

  return (
    <div style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 14, padding: '18px 18px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
        🏆 Champion Index
      </div>
      {sorted.map((entry, rank) => {
        const pct = Math.round(entry.ciScore / max * 100);
        const isTop = rank === 0;
        const expanded = expandedId === entry.teamId;

        const rowContent = (
          <div key={entry.teamId} style={{ borderBottom: rank < sorted.length - 1 ? `0.5px solid ${T.divider}` : 'none' }}>
            <div
              onClick={() => setExpandedId(expanded ? null : entry.teamId)}
              style={{ padding: '8px 0', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 12, color: T.textMuted, minWidth: 16, textAlign: 'right' }}>{rank + 1}</span>
                <span style={{ fontSize: 11, color: T.textFaint }}>{expanded ? '▾' : '▸'}</span>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{entry.flagEmoji}</span>
                <span style={{ fontSize: 14, fontWeight: isTop ? 700 : 500, flex: 1, color: T.textPrimary }}>
                  {isTop && <span style={{ fontSize: 11, background: T.ci, color: '#FFFFFF', borderRadius: 99, padding: '2px 8px', marginRight: 6, fontWeight: 600 }}>🏆 glory</span>}
                  {entry.teamName}
                </span>
                <span style={{ fontSize: isTop ? 17 : 14, fontWeight: isTop ? 700 : 400, color: isTop ? T.ci : T.textSecondary }}>
                  {entry.ciScore.toFixed(1)}
                </span>
              </div>
              <div style={{ paddingLeft: 24 }}>
                <div style={{ height: 4, background: T.track, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: T.ci, borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
              </div>
            </div>
            {expanded && (
              <div style={{ borderTop: `0.5px solid ${T.divider}`, marginBottom: 6 }}>
                <CIBreakdown stats={entry.stats} />
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

export default function PublicTeamLeaderboardsClient({ entries }: { entries: PublicTeamEntry[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
      <WSIList entries={entries} />
      <CIList entries={entries} />
    </div>
  );
}
