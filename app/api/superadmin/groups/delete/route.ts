import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminCookie } from '@/lib/superadmin-auth';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  if (!verifySuperAdminCookie(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { group_id } = await req.json();
  if (!group_id) {
    return NextResponse.json({ error: 'group_id required' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { error } = await supabase.from('groups').delete().eq('id', group_id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
