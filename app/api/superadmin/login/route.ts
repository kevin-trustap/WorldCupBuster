import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

function computeToken(): string {
  const input = `${process.env.SUPER_ADMIN_USER ?? ''}:${process.env.SUPER_ADMIN_PASS ?? ''}:${process.env.SUPER_ADMIN_SECRET ?? ''}`;
  return createHash('sha256').update(input).digest('hex');
}

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const user = body.get('username') as string | null;
  const pass = body.get('password') as string | null;

  if (
    !user ||
    !pass ||
    user !== process.env.SUPER_ADMIN_USER ||
    pass !== process.env.SUPER_ADMIN_PASS
  ) {
    return NextResponse.redirect(new URL('/superadmin/login?error=1', req.url));
  }

  const token = computeToken();
  const response = NextResponse.redirect(new URL('/superadmin', req.url));
  response.cookies.set('sa_token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}
