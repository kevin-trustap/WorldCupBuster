import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminCookie } from '@/lib/superadmin-auth';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  if (!verifySuperAdminCookie(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { member_id, new_name } = await req.json();
  if (!member_id || !new_name) {
    return NextResponse.json({ error: 'member_id and new_name required' }, { status: 400 });
  }

  const trimmed = new_name.trim();
  if (!trimmed || trimmed.length > 30) {
    return NextResponse.json({ error: 'Name must be 1–30 characters' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Get the member's group_id to check for duplicate names
  const { data: member, error: memberErr } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('id', member_id)
    .single();

  if (memberErr || !member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Check for duplicate name in same group
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', member.group_id)
    .eq('display_name', trimmed)
    .neq('id', member_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'A member with that name already exists in this group' }, { status: 409 });
  }

  const { error } = await supabase
    .from('group_members')
    .update({ display_name: trimmed })
    .eq('id', member_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
