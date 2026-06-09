import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServerSupabase } from '@/lib/supabase/server';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing O/0, I/1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Find a unique invite code (retry up to 10 times)
  let inviteCode = generateInviteCode();
  for (let i = 0; i < 10; i++) {
    const { data } = await supabase
      .from('groups')
      .select('id')
      .eq('invite_code', inviteCode)
      .maybeSingle();
    if (!data) break;
    inviteCode = generateInviteCode();
  }

  const adminToken = randomUUID();

  const { data, error } = await supabase
    .from('groups')
    .insert({ name, invite_code: inviteCode, admin_token: adminToken })
    .select('id, name, invite_code')
    .single();

  if (error || !data) {
    console.error('[/api/groups] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  return NextResponse.json({
    id: data.id,
    name: data.name,
    invite_code: data.invite_code,
    admin_url: `${appUrl}/admin/${adminToken}`,
  });
}
