'use client';

import { useState } from 'react';

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
            background: assignmentDone ? '#e0e0e0' : '#1a1a1a',
            color: assignmentDone ? '#999' : '#fff',
            opacity: assignStatus === 'loading' ? 0.6 : 1,
          }}
        >
          {assignmentDone ? '✓ Teams assigned' : assignStatus === 'loading' ? 'Assigning…' : `🎲 Assign teams (${memberCount} member${memberCount !== 1 ? 's' : ''})`}
        </button>
        {!assignmentDone && memberCount === 0 && (
          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Waiting for members to join first</div>
        )}
        {memberCount > 48 && (
          <div style={{ fontSize: 12, color: '#c0392b', marginTop: 4 }}>Cannot exceed 48 members</div>
        )}
        {assignMsg && (
          <div style={{ fontSize: 13, marginTop: 6, color: assignStatus === 'error' ? '#c0392b' : '#1d9e75' }}>{assignMsg}</div>
        )}
      </div>

      {/* Sync stats */}
      <div>
        <button
          onClick={handleSync}
          disabled={syncStatus === 'loading'}
          style={{ ...btnBase, background: '#378ADD', color: '#fff', opacity: syncStatus === 'loading' ? 0.6 : 1 }}
        >
          {syncStatus === 'loading' ? 'Syncing…' : '🔄 Sync stats from API-Football'}
        </button>
        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Uses ~2 API calls per new fixture. Max 90 calls/day.</div>
        {syncMsg && (
          <div style={{ fontSize: 13, marginTop: 6, color: syncStatus === 'error' ? '#c0392b' : '#1d9e75' }}>{syncMsg}</div>
        )}
      </div>

      <a
        href={`/group/${inviteCode}`}
        style={{ fontSize: 13, color: '#378ADD', textDecoration: 'none' }}
      >
        → View public leaderboard
      </a>
    </div>
  );
}
