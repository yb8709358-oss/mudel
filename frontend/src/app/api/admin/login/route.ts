import { NextRequest, NextResponse } from 'next/server';
import {
  adminSessionCookieName,
  expectedAdminSessionValue,
  isAdminConfigured,
  isMatchingAdminPassword,
} from '@/lib/admin-auth';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    // Fail closed: if the operator never configured real credentials, admin
    // access is disabled entirely rather than accepting placeholder values.
    return NextResponse.json(
      { success: false, message: 'Admin login is not configured.' },
      { status: 503 },
    );
  }

  const ip = clientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, message: 'Too many attempts. Try again later.' },
      { status: 429 },
    );
  }

  const { password } = await request.json().catch(() => ({ password: '' }));

  if (
    typeof password !== 'string' ||
    password.length === 0 ||
    !isMatchingAdminPassword(password)
  ) {
    return NextResponse.json({ success: false, message: 'Invalid password.' }, { status: 401 });
  }

  // Successful login resets the attempt counter for this IP.
  loginAttempts.delete(ip);

  const response = NextResponse.json({ success: true });
  response.cookies.set(adminSessionCookieName, expectedAdminSessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return response;
}
