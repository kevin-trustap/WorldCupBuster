'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { METRICS, CI_METRICS } from '@/lib/wsi';
import { T } from '@/lib/theme';

const S = {
  card:  { background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 14, padding: '24px 22px', marginBottom: 16 } as CSSProperties,
  h2:    { fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: T.textPrimary } as CSSProperties,
  label: { fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6, color: T.textPrimary } as CSSProperties,
  input: { width: '100%', fontSize: 15, padding: '10px 12px', border: `0.5px solid ${T.inputBorder}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box', background: T.inputBg, color: T.textPrimary } as CSSProperties,
  btn:   { width: '100%', padding: '11px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginTop: 12 } as CSSProperties,
  err:   { fontSize: 13, color: T.wsi, marginTop: 8 } as CSSProperties,
};

function CopyBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, background: T.inputBg, borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'monospace', wordBreak: 'break-all', color: T.textPrimary }}>
          {value}
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ padding: '8px 14px', borderRadius: 8, border: `0.5px solid ${T.cardBorder}`, background: T.logoutBg, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', color: T.textPrimary }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function CreateGroup() {
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [result, setResult]   = useState<{ invite_code: string; admin_url: string } | null>(null);

  async function handleCreate() {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return; }
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div style={S.card}>
        <div style={{ fontSize: 20, marginBottom: 4 }}>🎉 Group created!</div>
        <div style={{ fontSize: 13, color: T.textSecondary, marginBottom: 20 }}>Share the invite code with your friends.</div>
        <div style={{ background: T.warnBg, border: `1.5px solid ${T.warnBorder}`, borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: T.warnText, marginBottom: 4 }}>⚠️ Save your admin link now</div>
          <div style={{ fontSize: 13, color: T.warnBodyText }}>This link cannot be recovered. Bookmark it or save it somewhere safe before closing this page.</div>
        </div>
        <CopyBox label="Invite code (share with friends)" value={result.invite_code} />
        <CopyBox label="Admin link (keep private!)" value={result.admin_url} />
        <a
          href={result.admin_url}
          style={{ display: 'block', textAlign: 'center', marginTop: 12, padding: '11px', borderRadius: 8, background: T.textPrimary, color: '#000', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
        >
          Open admin panel →
        </a>
      </div>
    );
  }

  return (
    <div style={S.card}>
      <div style={S.h2}>🌍 Create a Group</div>
      <label style={S.label}>Group name</label>
      <input
        style={S.input}
        placeholder="e.g. The Office WC Sweepstakes"
        value={name}
        maxLength={50}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && name.trim() && handleCreate()}
      />
      {error && <div style={S.err}>{error}</div>}
      <button
        style={{ ...S.btn, background: name.trim() ? T.textPrimary : T.disabledBg, color: name.trim() ? '#000' : T.disabledText }}
        disabled={!name.trim() || loading}
        onClick={handleCreate}
      >
        {loading ? 'Creating…' : 'Create group'}
      </button>
    </div>
  );
}

function JoinGroup() {
  const router = useRouter();
  const [code, setCode]       = useState('');
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleJoin() {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code, display_name: name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return; }
      router.push(`/group/${data.group.invite_code}`);
    } finally {
      setLoading(false);
    }
  }

  const ready = code.trim().length === 6 && name.trim().length > 0;

  return (
    <div style={S.card}>
      <div style={S.h2}>🎟️ Join or rejoin a Group</div>
      <label style={S.label}>Invite code</label>
      <input
        style={{ ...S.input, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}
        placeholder="ABC123"
        maxLength={6}
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
      />
      <label style={S.label}>Your display name</label>
      <input
        style={S.input}
        placeholder="e.g. Kevin"
        maxLength={30}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && ready && handleJoin()}
      />
      <div style={{ fontSize: 12, color: T.textMuted, marginTop: 6 }}>
        Already joined? Enter the same name to return to your group.
      </div>
      {error && <div style={S.err}>{error}</div>}
      <button
        style={{ ...S.btn, background: ready ? T.wsi : T.disabledBg, color: ready ? '#fff' : T.disabledText }}
        disabled={!ready || loading}
        onClick={handleJoin}
      >
        {loading ? 'Loading…' : 'Join / return to group'}
      </button>
    </div>
  );
}

// ── Metric table used in the Two Trophies section ──────────────────────────
function MetricTable({ metrics }: { metrics: Array<{ icon: string; label: string; hint: string }> }) {
  return (
    <div>
      {metrics.map((m, i) => (
        <div
          key={m.label}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 0',
            borderBottom: i < metrics.length - 1 ? `0.5px solid ${T.divider}` : 'none',
          }}
        >
          <span style={{ fontSize: 15, minWidth: 22 }}>{m.icon}</span>
          <span style={{ flex: 1, fontSize: 13, color: T.textPrimary }}>{m.label}</span>
          <span style={{
            fontFamily: 'monospace', fontSize: 11, color: T.textSecondary,
            background: T.inputBg, borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap',
          }}>
            {m.hint}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function HomePageForms() {
  return (
    <>
      {/* Create / Join forms */}
      <div style={{ maxWidth: 520, margin: '0 auto 52px' }}>
        <div id="create"><CreateGroup /></div>
        <div id="join"><JoinGroup /></div>
        <p style={{ textAlign: 'center', fontSize: 12, color: T.textMuted, marginTop: 12 }}>
          Tournament starts 11 June 2026 · 48 teams · Free to play
        </p>
      </div>

      {/* Section divider */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          The Two Trophies
        </span>
      </div>

      {/* Two trophy cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 14, padding: '22px' }}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>🥄</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2, color: T.textPrimary }}>Wooden Spoon Index</div>
          <div style={{ fontSize: 13, color: T.wsi, marginBottom: 14 }}>Higher score = more shame. Win the spoon.</div>
          <MetricTable metrics={METRICS} />
        </div>

        <div style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 14, padding: '22px' }}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>🏆</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2, color: T.textPrimary }}>Champion Index</div>
          <div style={{ fontSize: 13, color: T.ci, marginBottom: 14 }}>Higher score = more glory. Win the cup.</div>
          <MetricTable metrics={CI_METRICS} />
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 14, padding: '28px 24px' }}>
        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24 }}>
          How it works
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          {[
            { icon: '🎲', title: 'Create or join', body: 'One person creates a group and shares the 6-character invite code with friends.' },
            { icon: '🌍', title: 'Get your teams', body: 'The admin randomly distributes all 48 World Cup teams across the group members.' },
            { icon: '📊', title: 'Watch the scores', body: 'After each match day, the admin syncs results. Both leaderboards update live — highest WSI wins the spoon, highest CI wins glory.' },
          ].map(step => (
            <div key={step.title} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>{step.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: T.textPrimary }}>{step.title}</div>
              <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.55 }}>{step.body}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
