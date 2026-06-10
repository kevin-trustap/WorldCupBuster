import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/superadmin/login', req.url));
  response.cookies.delete('sa_token');
  return response;
}
