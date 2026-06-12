'use client';

import { useState } from 'react';
import { T } from '@/lib/theme';

interface Props {
  adminToken: string;
  groupId: string;
  inviteCode: string;
  assignmentDone: boolean;
  memberCount: number;
}

export default function AdminActions({ adminToken, inviteCode, assignmentDone, memberCount }: Props) {
  const [assignStatus, setAssignStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [syncStatus,   setSyncStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [assignMsg,    setAssignMsg]    = useState('');
  const [syncMsg,      setSyncMsg]      = useState('');

  async function handleAssign() {
    if (!confirm(`Assign teams to ${memberCount} members? This cannot be undone.`)) return;
    setAssignStatus('loading'); setAssignMsg('');
    try {
      const res = await fetch('/api/admin/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_token: adminToken }),
      });
      const data = await res.json();
      if (!res.ok) { setAssignStatus('error'); setAssignMsg(data.error ?? 'Failed'); return; }
      setAssignStatus('done');
      setAssignMsg(`✓ ${data.total_assignments} team assignments saved. Reload to see leaderboard.`);
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setAssignStatus('error'); setAssignMsg('Network error');
    }
  }

  async function handleSync() {
    setSyncStatus('loading'); setSyncMsg('');
    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_token: adminToken }),
      });
      const data = await res.json();
      if (!res.ok) { setSyncStatus('error'); setSyncMsg(data.error ?? 'Failed'); return; }
      setSyncStatus('done');
      setSyncMsg(`✓ ${data.fixtures_processed} fixture${data.fixtures_processed !== 1 ? 's' : ''} processed · ${data.api_calls} API call${data.api_calls !== 1 ? 's' : ''} used`);
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setSyncStatus('error'); setSyncMsg('Network error');
    }
  }

  const btnBase: React.CSSProperties = {
    padding: '10px 20px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 14,
    cursor: 'pointer', transition: 'opacity 0.2s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Assign teams */}
      <div>
        <button
          onClick={handleAssign}
          disabled={assignmentDone || memberCount === 0 || memberCount > 48 || assignStatus === 'loading'}
          style={{
            ...btnBase,
            background: assignmentDone ? T.disabledBg : T.textPrimary,
            color: assignmentDone ? T.disabledText : '#000',
            opacity: assignStatus === 'loading' ? 0.6 : 1,
          }}
        >
          {assignmentDone ? '✓ Teams assigned' : assignStatus === 'loading' ? 'Assigning…' : `🎲 Assign teams (${memberCount} member${memberCount !== 1 ? 's' : ''})`}
        </button>
        {!assignmentDone && memberCount === 0 && (
          <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 4 }}>Waiting for members to join first</div>
        )}
        {memberCount > 48 && (
          <div style={{ fontSize: 12, color: T.wsi, marginTop: 4 }}>Cannot exceed 48 members</div>
        )}
        {assignMsg && (
          <div style={{ fontSize: 13, marginTop: 6, color: assignStatus === 'error' ? T.wsi : T.ci }}>{assignMsg}</div>
        )}
      </div>

      {/* Sync stats */}
      <div>
        <button
          onClick={handleSync}
          disabled={syncStatus === 'loading'}
          style={{ ...btnBase, background: T.blue, color: '#fff', opacity: syncStatus === 'loading' ? 0.6 : 1 }}
        >
          {syncStatus === 'loading' ? 'Syncing…' : '🔄 Sync stats from API-Football'}
        </button>
        <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 4 }}>Uses ~2 API calls per new fixture. Max 90 calls/day.</div>
        {syncMsg && (
          <div style={{ fontSize: 13, marginTop: 6, color: syncStatus === 'error' ? T.wsi : T.ci }}>{syncMsg}</div>
        )}
      </div>

      <a
        href={`/group/${inviteCode}`}
        style={{ fontSize: 13, color: T.blue, textDecoration: 'none' }}
      >
        → View public leaderboard
      </a>
    </div>
  );
}
