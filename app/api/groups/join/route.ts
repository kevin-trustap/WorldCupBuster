import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const inviteCode  = body?.invite_code?.trim().toUpperCase();
  const displayName = body?.display_name?.trim();

  if (!inviteCode || !displayName) {
    return NextResponse.json({ error: 'Invite code and display name are required' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, invite_code, assignment_done')
    .eq('invite_code', inviteCode)
    .maybeSingle();

  if (groupError || !group) {
    return NextResponse.json({ error: 'Group not found — check your invite code' }, { status: 404 });
  }

  const { data: member, error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, display_name: displayName })
    .select('id, display_name')
    .single();

  if (memberError) {
    if (memberError.code === '23505') {
      // Already a member — look them up and return as a successful rejoin
      const { data: existing } = await supabase
        .from('group_members')
        .select('id, display_name')
        .eq('group_id', group.id)
        .eq('display_name', displayName)
        .single();
      return NextResponse.json({ group: { id: group.id, name: group.name, invite_code: group.invite_code, assignment_done: group.assignment_done }, member: existing });
    }
    return NextResponse.json({ error: 'Failed to join group' }, { status: 500 });
  }

  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
      invite_code: group.invite_code,
      assignment_done: group.assignment_done,
    },
    member,
  });
}
