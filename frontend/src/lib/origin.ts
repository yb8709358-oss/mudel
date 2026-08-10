const DEV_SAFE_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

const PRIVATE_IPV4_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
];

export function parseOrigin(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isPrivateIpv4(hostname: string): boolean {
  return PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(hostname));
}

/**
 * True when the origin targets the loopback interface or a private/LAN address
 * (localhost, 127.0.0.1, ::1, 10/8, 172.16/12, 192.168/16, 169.254/16). These
 * are safe to accept during development so the admin panel works when reached
 * via http://localhost, http://127.0.0.1 or a LAN IP such as 192.168.0.103.
 */
export function isDevelopmentSafeOrigin(value: string): boolean {
  const url = parseOrigin(value);
  if (!url) return false;
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (DEV_SAFE_HOSTNAMES.has(hostname)) return true;
  return isPrivateIpv4(hostname);
}

/**
 * The origin the request was actually addressed to, derived from the wire
 * headers instead of request.nextUrl.origin (which Next.js dev resolves to
 * http://localhost:PORT even when the server was reached on a LAN address,
 * causing false CSRF rejections for legitimate same-origin requests).
 *
 * When a reverse proxy sits in front, its X-Forwarded-Proto and
 * X-Forwarded-Host take precedence over the raw Host header. Comma-separated
 * forwarded chains are resolved to the first (client-facing) hop.
 */
export function expectedRequestOrigin(
  host: string | null,
  forwardedProto: string | null,
  forwardedHost: string | null,
): string | null {
  const proto = forwardedProto?.split(',')[0]?.trim();
  const hostname = forwardedHost?.split(',')[0]?.trim() || host;
  if (!hostname) return null;
  return `${proto || 'http'}://${hostname}`;
}

function sameOrigin(a: string, b: string): boolean {
  const urlA = parseOrigin(a);
  const urlB = parseOrigin(b);
  return !!urlA && !!urlB && urlA.origin === urlB.origin;
}

export interface OriginCheckOptions {
  siteUrl?: string | null;
  allowDevelopmentOrigins?: boolean;
}

type OriginHeaders = { get(name: string): string | null };

/**
 * CSRF origin validation.
 *
 * Returns true when:
 *  - the request carries no Origin header (non-browser clients such as curl
 *    or server-to-server calls), or
 *  - the Origin matches the origin the request was made to (Host header, or
 *    X-Forwarded-Proto/X-Forwarded-Host when a reverse proxy is in front), or
 *  - the Origin matches the configured canonical site URL, or
 *  - (development only) the Origin targets the loopback or a private/LAN IP.
 *
 * In production the loopback/private allowance is disabled, so the Origin must
 * match the actual request origin or the configured site URL.
 */
export function isValidOrigin(
  origin: string | null,
  headers: OriginHeaders,
  options: OriginCheckOptions = {},
): boolean {
  if (!origin) return true;

  const expected = expectedRequestOrigin(
    headers.get('host'),
    headers.get('x-forwarded-proto'),
    headers.get('x-forwarded-host'),
  );
  if (expected && sameOrigin(origin, expected)) return true;

  const siteUrl = options.siteUrl;
  if (siteUrl) {
    const site = parseOrigin(siteUrl);
    if (site && sameOrigin(origin, site.origin)) return true;
  }

  if (options.allowDevelopmentOrigins && isDevelopmentSafeOrigin(origin)) return true;

  return false;
}
