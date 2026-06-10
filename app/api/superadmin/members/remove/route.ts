import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminCookie } from '@/lib/superadmin-auth';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  if (!verifySuperAdminCookie(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { member_id, group_id } = await req.json();
  if (!member_id || !group_id) {
    return NextResponse.json({ error: 'member_id and group_id required' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: group, error: groupErr } = await supabase
    .from('groups')
    .select('assignment_done')
    .eq('id', group_id)
    .single();

  if (groupErr || !group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  if (group.assignment_done) {
    return NextResponse.json({ error: 'Cannot remove member after teams have been assigned' }, { status: 409 });
  }

  const { error } = await supabase.from('group_members').delete().eq('id', member_id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
