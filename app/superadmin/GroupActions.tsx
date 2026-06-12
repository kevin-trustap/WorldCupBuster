'use client';

import { useState } from 'react';
import { T } from '@/lib/theme';

type GroupProp = {
  id: string;
  name: string;
  invite_code: string;
  admin_token: string;
  assignment_done: boolean;
  created_at: string;
};

type MemberProp = {
  id: string;
  group_id: string;
  display_name: string;
};

interface Props {
  group: GroupProp;
  members: MemberProp[];
  memberTeams: Record<string, string[]>;
}

export default function GroupActions({ group, members, memberTeams }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [savingRename, setSavingRename] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleDeleteGroup() {
    if (!confirm('Are you sure? This will delete the group and all members.')) return;
    setDeleting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/superadmin/groups/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: group.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error ?? 'Failed to delete group');
        setDeleting(false);
        return;
      }
      window.location.reload();
    } catch {
      setErrorMsg('Network error');
      setDeleting(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Are you sure?')) return;
    setRemovingMemberId(memberId);
    setErrorMsg('');
    try {
      const res = await fetch('/api/superadmin/members/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, group_id: group.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error ?? 'Failed to remove member');
        setRemovingMemberId(null);
        return;
      }
      window.location.reload();
    } catch {
      setErrorMsg('Network error');
      setRemovingMemberId(null);
    }
  }

  function startRename(member: MemberProp) {
    setEditingMemberId(member.id);
    setEditName(member.display_name);
    setErrorMsg('');
  }

  function cancelRename() {
    setEditingMemberId(null);
    setEditName('');
  }

  async function handleRename(memberId: string) {
    setSavingRename(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/superadmin/members/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, new_name: editName }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error ?? 'Failed to rename member');
        setSavingRename(false);
        return;
      }
      window.location.reload();
    } catch {
      setErrorMsg('Network error');
      setSavingRename(false);
    }
  }

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    fontWeight: 600,
    fontSize: 11,
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    paddingBottom: 8,
    borderBottom: `0.5px solid ${T.divider}`,
  };

  return (
    <div>
      {/* Members table */}
      {members.length === 0 ? (
        <div style={{ fontSize: 13, color: T.textMuted }}>No members yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={thStyle}>Member</th>
              <th style={thStyle}>Teams</th>
              <th style={{ ...thStyle, width: 56 }}></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => {
              const teams = memberTeams[m.id];
              const isLast = i === members.length - 1;
              const rowBorder = isLast ? 'none' : `0.5px solid ${T.divider}`;
              const isEditing = editingMemberId === m.id;
              const isRemoving = removingMemberId === m.id;

              return (
                <tr key={m.id}>
                  <td
                    style={{
                      padding: '8px 0',
                      fontWeight: 500,
                      verticalAlign: 'middle',
                      borderBottom: rowBorder,
                      paddingRight: 16,
                      whiteSpace: 'nowrap',
                      color: T.textPrimary,
                    }}
                  >
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          maxLength={30}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRename(m.id);
                            if (e.key === 'Escape') cancelRename();
                          }}
                          style={{
                            fontSize: 13,
                            padding: '3px 7px',
                            borderRadius: 6,
                            border: `1px solid ${T.inputBorder}`,
                            background: T.inputBg,
                            color: T.textPrimary,
                            width: 140,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRename(m.id)}
                          disabled={savingRename || !editName.trim()}
                          style={{
                            fontSize: 12,
                            padding: '3px 8px',
                            borderRadius: 5,
                            border: 'none',
                            background: T.textPrimary,
                            color: '#000',
                            cursor: 'pointer',
                            fontWeight: 600,
                            opacity: savingRename ? 0.5 : 1,
                          }}
                        >
                          {savingRename ? '…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          disabled={savingRename}
                          style={{
                            fontSize: 12,
                            padding: '3px 8px',
                            borderRadius: 5,
                            border: `0.5px solid ${T.cardBorder}`,
                            background: T.logoutBg,
                            color: T.textPrimary,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {m.display_name}
                        <button
                          type="button"
                          onClick={() => startRename(m)}
                          title="Rename"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0 2px',
                            color: T.textMuted,
                            fontSize: 13,
                            lineHeight: 1,
                          }}
                        >
                          ✎
                        </button>
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '8px 0',
                      color: teams ? T.textSecondary : T.textMuted,
                      borderBottom: rowBorder,
                      verticalAlign: 'middle',
                    }}
                  >
                    {teams ? teams.join(', ') : 'Not assigned yet'}
                  </td>
                  <td
                    style={{
                      padding: '8px 0',
                      borderBottom: rowBorder,
                      verticalAlign: 'middle',
                      textAlign: 'right',
                    }}
                  >
                    {!group.assignment_done && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id)}
                        disabled={isRemoving}
                        title="Remove member"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: T.wsi,
                          fontSize: 15,
                          padding: '0 4px',
                          opacity: isRemoving ? 0.4 : 1,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {errorMsg && (
        <div style={{ fontSize: 12, color: T.wsi, marginTop: 10 }}>{errorMsg}</div>
      )}

      {/* Delete group button */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `0.5px solid ${T.divider}` }}>
        <button
          onClick={handleDeleteGroup}
          disabled={deleting}
          style={{
            fontSize: 12,
            padding: '5px 12px',
            borderRadius: 7,
            border: `0.5px solid rgba(230,29,37,0.35)`,
            background: 'rgba(230,29,37,0.08)',
            color: T.wsi,
            cursor: 'pointer',
            fontWeight: 500,
            opacity: deleting ? 0.5 : 1,
          }}
        >
          {deleting ? 'Deleting…' : 'Delete group'}
        </button>
      </div>
    </div>
  );
}
