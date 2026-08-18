import { NextRequest, NextResponse } from 'next/server';
import { adminSessionCookieName, isValidAdminSession } from '@/lib/admin-auth';
import { INTERNAL_API_URL } from '@/lib/env';
import { isValidOrigin } from '@/lib/origin';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AdminBffError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function isAdminRequestAuthorized(request: NextRequest): boolean {
  const session = request.cookies.get(adminSessionCookieName)?.value;
  return isValidAdminSession(session);
}

function isStateChangingMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

/**
 * Defense-in-depth CSRF guard: non-safe requests must carry an Origin header
 * that matches the origin the request was actually made to. Derived from the
 * wire headers (Host / X-Forwarded-Proto / X-Forwarded-Host) rather than
 * request.nextUrl.origin, because Next.js dev resolves nextUrl.origin to
 * http://localhost:PORT even when the server is reached on a LAN address —
 * that false mismatch previously rejected every state-changing request with
 * 403. Loopback and private/LAN origins are additionally accepted in
 * development only; production behavior stays strict.
 */
export function hasValidOrigin(request: NextRequest): boolean {
  return isValidOrigin(request.headers.get('origin'), request.headers, {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    allowDevelopmentOrigins: process.env.NODE_ENV !== 'production',
  });
}

export function isUuid(value: string | undefined): boolean {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse(): NextResponse {
  return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
}

export function invalidIdResponse(): NextResponse {
  return NextResponse.json({ success: false, message: 'Invalid id' }, { status: 400 });
}

/**
 * Extracts a safe, actionable message from a FastAPI validation error. The
 * upstream detail is either a plain string (business-rule 422) or an array of
 * { loc, msg } entries (RequestValidationError). Only the message text is
 * echoed back — never raw payloads or credentials.
 */
function validationMessage(error: AdminBffError): string {
  const detail = error.message;
  try {
    const parsed = JSON.parse(detail);
    if (Array.isArray(parsed)) {
      const parts = parsed
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const loc = Array.isArray(item.loc)
            ? item.loc
                .filter((p: unknown): p is string | number => typeof p === 'string' || typeof p === 'number')
                .join('.')
            : '';
          const msg = typeof item.msg === 'string' ? item.msg : '';
          return [loc, msg].filter(Boolean).join(': ');
        })
        .filter((p): p is string => Boolean(p));
      if (parts.length > 0) return parts.join('; ');
    }
  } catch {
    // Not JSON — fall through to the plain detail below.
  }
  return detail && detail.trim() ? detail.trim() : 'Invalid data.';
}

/**
 * Maps an upstream API error to a safe client message. Backend detail is
 * never echoed to the browser; it is logged server-side instead. Upstream
 * client errors (4xx) preserve their status code so the admin UI can act on
 * them — only genuine server-side failures collapse into a generic 502.
 */
export function safeErrorPayload(error: AdminBffError): { status: number; message: string } {
  const { status } = error;
  console.error(`[admin-bff] upstream ${status}: ${error.message}`);
  switch (status) {
    case 400:
      return { status, message: 'Invalid request.' };
    case 401:
      return { status, message: 'Unauthorized.' };
    case 403:
      return { status, message: 'Forbidden.' };
    case 404:
      return { status, message: 'Not found.' };
    case 409:
      return { status, message: 'Conflict.' };
    case 422:
      return { status, message: validationMessage(error) };
    case 429:
      return { status, message: 'Too many requests. Please try again later.' };
    default:
      return { status: 502, message: 'The request could not be completed.' };
  }
}

/**
 * Masks personal contact values in diagnostic log output. Image URLs, slugs,
 * validation messages and paths are preserved so failures stay diagnosable;
 * phone / whatsapp / email payload values are the only things redacted.
 */
function redactSensitive(value: string): string {
  return value.replace(/"((?:phone|whatsapp|email))"\s*:\s*"[^"]*"/gi, '"$1":"<redacted>"');
}

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = {
    'X-Admin-Secret': process.env.ADMIN_API_SECRET || '',
    ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    ...init?.headers,
  };

  const requestBody = typeof init?.body === 'string' ? init.body : undefined;

  const res = await fetch(`${INTERNAL_API_URL}/api/v1${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    const raw = await res.text();
    const method = init?.method ?? 'GET';
    console.error(
      `[admin-bff] upstream ${res.status} ${method} ${path}` +
        (requestBody ? ` body=${redactSensitive(requestBody)}` : '') +
        (raw ? ` response=${redactSensitive(raw)}` : ''),
    );
    let message = `API error: ${res.status}`;
    try {
      const data = JSON.parse(raw || 'null');
      if (data?.detail) {
        // Legacy FastAPI shape: plain string or [{ loc, msg }] array.
        message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      } else if (data?.error) {
        // App envelope: { code, message, details }.
        const details = data.error.details;
        if (Array.isArray(details) && details.length > 0) {
          message = details.join('; ');
        } else {
          message = data.error.message ?? message;
        }
      }
    } catch {
      // Keep the default message when the upstream body is not JSON.
    }
    throw new AdminBffError(message, res.status);
  }

  return res.json() as Promise<T>;
}

export async function adminRoute(
  request: NextRequest,
  apiPath: string,
  init?: RequestInit,
): Promise<NextResponse> {
  if (!isAdminRequestAuthorized(request)) {
    return unauthorizedResponse();
  }
  if (isStateChangingMethod(request.method) && !hasValidOrigin(request)) {
    return forbiddenResponse();
  }

  const query = request.nextUrl.search;

  try {
    const data = await adminFetch(`${apiPath}${query}`, init);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AdminBffError) {
      const payload = safeErrorPayload(error);
      return NextResponse.json({ success: false, message: payload.message }, { status: payload.status });
    }
    return NextResponse.json({ success: false, message: 'The request could not be completed.' }, { status: 502 });
  }
}

/**
 * Like adminRoute but validates that the :id segment is a UUID before it is
 * forwarded to the upstream API (prevents path traversal / junk lookups).
 */
export async function adminIdRoute(
  request: NextRequest,
  apiPathPrefix: string,
  id: string,
  init?: RequestInit,
): Promise<NextResponse> {
  if (!isUuid(id)) {
    return invalidIdResponse();
  }
  return adminRoute(request, `${apiPathPrefix}/${id}`, init);
}

