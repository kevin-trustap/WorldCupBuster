import { createHash } from 'crypto';
import { NextRequest } from 'next/server';

function computeExpectedToken(): string {
  const input = `${process.env.SUPER_ADMIN_USER ?? ''}:${process.env.SUPER_ADMIN_PASS ?? ''}:${process.env.SUPER_ADMIN_SECRET ?? ''}`;
  return createHash('sha256').update(input).digest('hex');
}

export function verifySuperAdminCookie(req: NextRequest): boolean {
  const cookie = req.cookies.get('sa_token');
  if (!cookie) return false;
  return cookie.value === computeExpectedToken();
}
