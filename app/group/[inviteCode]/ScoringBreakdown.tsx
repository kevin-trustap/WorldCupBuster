'use client';

import { useState } from 'react';
import { METRICS, CI_METRICS } from '@/lib/wsi';
import { T } from '@/lib/theme';

type DisplayMetric = { icon: string; label: string; hint: string; desc: string };

function MetricRow({ m, isLast }: { m: DisplayMetric; isLast: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 0',
      borderBottom: isLast ? 'none' : `0.5px solid ${T.divider}`,
    }}>
      <span style={{ fontSize: 15, minWidth: 22 }}>{m.icon}</span>
      <span style={{ flex: 1, fontSize: 13, color: T.textPrimary }}>{m.label}</span>
      {m.desc && <span style={{ fontSize: 11, color: T.textMuted, display: 'none' }}>{m.desc}</span>}
      <span style={{
        fontFamily: 'monospace', fontSize: 11, color: T.textSecondary,
        background: T.inputBg, borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap',
      }}>
        {m.hint}
      </span>
    </div>
  );
}

function Panel({ title, color, metrics }: { title: string; color: string; metrics: DisplayMetric[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `0.5px solid ${T.divider}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, color }}>{title}</span>
        <span style={{ fontSize: 20, color: T.textFaint, lineHeight: 1, userSelect: 'none' }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 12 }}>
          {metrics.map((m, i) => (
            <MetricRow key={m.label} m={m} isLast={i === metrics.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ScoringBreakdown() {
  return (
    <div style={{
      background: T.card, border: `0.5px solid ${T.cardBorder}`,
      borderRadius: 14, padding: '16px 18px', marginTop: 20,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
        How scoring works
      </div>
      <Panel title="🥄 Wooden Spoon Index — higher is worse" color={T.wsi} metrics={METRICS as DisplayMetric[]} />
      <Panel title="🏆 Champion Index — higher is better"   color={T.ci}  metrics={CI_METRICS as DisplayMetric[]} />
    </div>
  );
}
