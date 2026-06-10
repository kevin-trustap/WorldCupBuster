import { createServerSupabase } from '@/lib/supabase/server';
import GroupActions from './GroupActions';

export const dynamic = 'force-dynamic';

type Group = {
  id: string;
  name: string;
  invite_code: string;
  admin_token: string;
  assignment_done: boolean;
  created_at: string;
};

type Member = {
  id: string;
  group_id: string;
  display_name: string;
};

type AssignmentRow = {
  member_id: string;
  group_id: string;
  wc_teams: { name: string; flag_emoji: string } | null;
};

async function getAllData() {
  const supabase = createServerSupabase();

  const [groupsRes, membersRes, assignmentsRes] = await Promise.all([
    supabase
      .from('groups')
      .select('id, name, invite_code, admin_token, assignment_done, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('group_members')
      .select('id, group_id, display_name')
      .order('created_at', { ascending: true }),
    supabase
      .from('member_team_assignments')
      .select('member_id, group_id, wc_teams(name, flag_emoji)'),
  ]);

  return {
    groups: (groupsRes.data ?? []) as Group[],
    members: (membersRes.data ?? []) as Member[],
    assignments: (assignmentsRes.data ?? []) as unknown as AssignmentRow[],
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function SuperAdminPage() {
  const { groups, members, assignments } = await getAllData();

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');

  // Build lookup: member_id -> teams string[]
  const memberTeams = new Map<string, string[]>();
  for (const row of assignments) {
    if (!row.wc_teams) continue;
    const teams = memberTeams.get(row.member_id) ?? [];
    teams.push(`${row.wc_teams.flag_emoji} ${row.wc_teams.name}`);
    memberTeams.set(row.member_id, teams);
  }

  // Build lookup: group_id -> Member[]
  const groupMembers = new Map<string, Member[]>();
  for (const m of members) {
    const list = groupMembers.get(m.group_id) ?? [];
    list.push(m);
    groupMembers.set(m.group_id, list);
  }

  return (
    <div
      style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: '32px 16px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: '#aaa',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            WorldCupBuster
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>
            Super Admin — {groups.length} group{groups.length !== 1 ? 's' : ''}
          </h1>
        </div>
        <form method="POST" action="/api/superadmin/logout">
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '0.5px solid rgba(0,0,0,0.2)',
              background: '#fff',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Sign out
          </button>
        </form>
      </div>

      {groups.length === 0 && (
        <div
          style={{
            background: '#fff',
            border: '0.5px solid rgba(0,0,0,0.1)',
            borderRadius: 14,
            padding: '32px',
            textAlign: 'center',
            color: '#999',
            fontSize: 14,
          }}
        >
          No groups yet.
        </div>
      )}

      {/* Group cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {groups.map(group => {
          const gMembers = groupMembers.get(group.id) ?? [];
          const publicUrl = `${appUrl}/group/${group.invite_code}`;
          const adminUrl = `${appUrl}/admin/${group.admin_token}`;

          return (
            <div
              key={group.id}
              style={{
                background: '#fff',
                border: '0.5px solid rgba(0,0,0,0.1)',
                borderRadius: 14,
                padding: '20px 22px',
              }}
            >
              {/* Group header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{group.name}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                    Created {formatDate(group.created_at)} · {gMembers.length} member{gMembers.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 99,
                    background: group.assignment_done ? '#e8f8f1' : '#f4f4f3',
                    color: group.assignment_done ? '#1d9e75' : '#888',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {group.assignment_done ? 'Assigned' : 'Pending assignment'}
                </span>
              </div>

              {/* Links */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    padding: '5px 12px',
                    borderRadius: 7,
                    border: '0.5px solid rgba(0,0,0,0.15)',
                    textDecoration: 'none',
                    color: '#1a1a1a',
                    fontWeight: 500,
                    background: '#f9f9f9',
                  }}
                >
                  Public leaderboard →
                </a>
                <a
                  href={adminUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    padding: '5px 12px',
                    borderRadius: 7,
                    border: '0.5px solid rgba(0,0,0,0.15)',
                    textDecoration: 'none',
                    color: '#c0392b',
                    fontWeight: 500,
                    background: '#fdf9f9',
                  }}
                >
                  Admin panel →
                </a>
              </div>

              <GroupActions
                group={group}
                members={gMembers}
                memberTeams={Object.fromEntries(
                  gMembers.map(m => [m.id, memberTeams.get(m.id) ?? []])
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
