import { createHash, timingSafeEqual } from 'crypto';

export const adminSessionCookieName = 'admin_session';

/**
 * Placeholder credentials shipped in .env.local.example and env docs. If the
 * operator never replaces these, admin auth must fail closed instead of
 * accepting the well-known placeholder values.
 */
const PLACEHOLDER_CREDENTIALS = new Set([
  'change-me',
  'change-me-too',
  'change_me',
  'your-super-secret',
  'your-admin-password',
]);

function isConfigured(value: string | undefined): boolean {
  return !!value && value.trim().length > 0 && !PLACEHOLDER_CREDENTIALS.has(value.trim().toLowerCase());
}

/**
 * True only when both ADMIN_PASSWORD and ADMIN_API_SECRET are configured with
 * real (non-placeholder) values. Everything else fails closed.
 */
export function isAdminConfigured(): boolean {
  return isConfigured(process.env.ADMIN_PASSWORD) && isConfigured(process.env.ADMIN_API_SECRET);
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * The cookie value is a hash of the admin password + a server-only secret.
 * It's meaningless without knowing ADMIN_PASSWORD/ADMIN_API_SECRET, so it
 * can't be forged even if someone learns the cookie *name*. This is a
 * deliberately simple mechanism appropriate for MVP scale (a single shared
 * admin credential, not per-user accounts) — swap for Supabase Auth /
 * proper sessions once technician or customer accounts are introduced.
 */
export function expectedAdminSessionValue(): string {
  const secret = process.env.ADMIN_API_SECRET || '';
  const password = process.env.ADMIN_PASSWORD || '';
  return createHash('sha256').update(`${password}:${secret}`).digest('hex');
}

export function isValidAdminSession(cookieValue: string | undefined): boolean {
  if (!isAdminConfigured()) return false;
  if (!cookieValue) return false;
  return safeEqual(cookieValue, expectedAdminSessionValue());
}

export function isMatchingAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!isAdminConfigured() || !expected) return false;
  return safeEqual(password, expected);
}
