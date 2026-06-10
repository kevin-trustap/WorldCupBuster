import { NextRequest, NextResponse } from 'next/server';

async function computeExpected(): Promise<string> {
  const input = `${process.env.SUPER_ADMIN_USER ?? ''}:${process.env.SUPER_ADMIN_PASS ?? ''}:${process.env.SUPER_ADMIN_SECRET ?? ''}`;
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Pass through login page and static assets
  if (pathname === '/superadmin/login') return NextResponse.next();

  const token = req.cookies.get('sa_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/superadmin/login', req.url));
  }

  const expected = await computeExpected();
  if (token !== expected) {
    return NextResponse.redirect(new URL('/superadmin/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/superadmin', '/superadmin/:path*'],
};
