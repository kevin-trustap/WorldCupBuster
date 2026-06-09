import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { distributeTeams } from '@/lib/assignment';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const adminToken = body?.admin_token;
  if (!adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabase();

  // Validate admin token — admin_token is never returned to clients
  const { data: group } = await supabase
    .from('groups')
    .select('id, assignment_done')
    .eq('admin_token', adminToken)
    .maybeSingle();

  if (!group) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (group.assignment_done) {
    return NextResponse.json({ error: 'Teams are already assigned' }, { status: 409 });
  }

  const { data: members } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id);

  if (!members || members.length === 0) {
    return NextResponse.json({ error: 'No members in group yet' }, { status: 400 });
  }
  if (members.length > 48) {
    return NextResponse.json({ error: 'Cannot exceed 48 members (one team each)' }, { status: 400 });
  }

  const { data: teams } = await supabase.from('wc_teams').select('id');
  if (!teams || teams.length !== 48) {
    return NextResponse.json({ error: 'Team seed data not found — run schema.sql first' }, { status: 500 });
  }

  const memberIds = members.map(m => m.id);
  const teamIds   = teams.map(t => t.id);
  const assignments = distributeTeams(memberIds, teamIds);

  const rows = assignments.flatMap(({ memberId, teamIds: tids }) =>
    tids.map(teamId => ({ group_id: group.id, member_id: memberId, team_id: teamId }))
  );

  const { error: insertError } = await supabase
    .from('member_team_assignments')
    .insert(rows);

  if (insertError) {
    return NextResponse.json({ error: 'Failed to save assignments' }, { status: 500 });
  }

  await supabase
    .from('groups')
    .update({ assignment_done: true })
    .eq('id', group.id);

  return NextResponse.json({ success: true, total_assignments: rows.length });
}
