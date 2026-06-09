import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import AdminActions from './AdminActions';

export const dynamic = 'force-dynamic';

async function getAdminData(adminToken: string) {
  const supabase = createServerSupabase();

  // Validate admin token server-side
  // admin_token is never returned to the client after this check
  const { data: group } = await supabase
    .from('groups')
    .select('id, name, invite_code, assignment_done, created_at')
    .eq('admin_token', adminToken)
    .maybeSingle();

  if (!group) return null;

  const [{ data: members }, { data: syncLogs }] = await Promise.all([
    supabase
      .from('group_members')
      .select('id, display_name, created_at')
      .eq('group_id', group.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('sync_log')
      .select('id, status, api_calls, triggered_by, started_at, completed_at')
      .order('started_at', { ascending: false })
      .limit(5),
  ]);

  let assignments: Array<{ display_name: string; teams: string[] }> = [];
  if (group.assignment_done) {
    const { data: rawAssignments } = await supabase
      .from('member_team_assignments')
      .select(`
        group_members!inner(display_name),
        wc_teams!inner(name, flag_emoji)
      `)
      .eq('group_id', group.id);

    const memberTeams = new Map<string, string[]>();
    for (const row of (rawAssignments ?? [])) {
      const gm  = row.group_members as unknown as { display_name: string };
      const wct = row.wc_teams     as unknown as { name: string; flag_emoji: string };
      const key = gm.display_name;
      if (!memberTeams.has(key)) memberTeams.set(key, []);
      memberTeams.get(key)!.push(`${wct.flag_emoji} ${wct.name}`);
    }
    assignments = Array.from(memberTeams.entries()).map(([display_name, teams]) => ({ display_name, teams }));
  }

  return { group, members: members ?? [], syncLogs: syncLogs ?? [], assignments };
}

export default async function AdminPage({ params }: { params: { adminToken: string } }) {
  const data = await getAdminData(params.adminToken);
  if (!data) notFound();

  const { group, members, syncLogs, assignments } = data;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Admin Panel</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>{group.name}</h1>
        <div style={{ fontSize: 13, color: '#888' }}>
          Invite code: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1a1a1a' }}>{group.invite_code}</span>
        </div>
      </div>

      {/* Save URL warning */}
      <div style={{ background: '#fff8e1', border: '1.5px solid #f39c12', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
        <div style={{ fontWeight: 700, color: '#b7770d', marginBottom: 2 }}>⚠️ Save this admin URL</div>
        <div style={{ fontSize: 13, color: '#7d6608' }}>
          This page is only accessible via your secret admin link. There is no recovery if you lose it.
        </div>
      </div>

      {/* Actions */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 16 }}>Actions</div>
        <AdminActions
          adminToken={params.adminToken}
          groupId={group.id}
          inviteCode={group.invite_code}
          assignmentDone={group.assignment_done}
          memberCount={members.length}
        />
      </div>

      {/* Members */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>
          Members ({members.length})
        </div>
        {members.length === 0 ? (
          <div style={{ fontSize: 13, color: '#999' }}>
            No members yet. Share the invite code: <strong>{group.invite_code}</strong>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map(m => {
              const memberAssignment = assignments.find(a => a.display_name === m.display_name);
              return (
                <div key={m.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)', paddingBottom: 8 }}>
                  <div style={{ fontWeight: 500 }}>{m.display_name}</div>
                  {memberAssignment && (
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                      {memberAssignment.teams.join(' · ')}
                    </div>
                  )}
                  {!group.assignment_done && (
                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Pending assignment</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sync log */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 14, padding: '20px' }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Recent syncs</div>
        {syncLogs.length === 0 ? (
          <div style={{ fontSize: 13, color: '#999' }}>No syncs yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {syncLogs.map(log => (
              <div key={log.id} style={{ display: 'flex', gap: 12, alignItems: 'baseline', fontSize: 13 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: log.status === 'done' ? '#e8f8f1' : log.status === 'error' ? '#fdecea' : '#f4f4f3',
                  color: log.status === 'done' ? '#1d9e75' : log.status === 'error' ? '#c0392b' : '#888',
                }}>
                  {log.status}
                </span>
                <span style={{ color: '#888' }}>{new Date(log.started_at).toLocaleString()}</span>
                <span>{log.api_calls} API call{log.api_calls !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
