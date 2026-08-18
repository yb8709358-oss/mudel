/**
 * Single source of truth for required environment variables.
 *
 * Fails fast with a clear message when a required variable is missing so local
 * and production deployments must set the same variables (see
 * frontend/.env.local.example). There are no hardcoded URL/credential
 * fallbacks anywhere else — every environment value flows through here.
 */
export function requireEnv(value: string | undefined, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        'Set it in frontend/.env.local (see frontend/.env.local.example). ' +
        'In production, NEXT_PUBLIC_* values are baked into the bundle at build ' +
        'time (frontend Docker build args / docker-compose.prod.yml).',
    );
  }
  return value;
}

// Backend origin reached by the browser (and, when INTERNAL_API_URL is unset,
// also by the Next.js server). Literal process.env.NEXT_PUBLIC_* references are
// required so Next.js inlines them at build time for client components.
export const API_BASE_URL = requireEnv(
  process.env.NEXT_PUBLIC_API_URL,
  'NEXT_PUBLIC_API_URL',
);

// Server-only backend origin used by the Next.js server (SSR / route handlers).
// In the Docker stack the server reaches the backend via the compose service
// name (http://backend:8000) — `localhost:8000` only resolves from the browser
// on the host, not from inside the frontend container. Falls back to
// API_BASE_URL when unset (npm run dev on the host, single-origin production).
export const INTERNAL_API_URL = process.env.INTERNAL_API_URL?.trim() || API_BASE_URL;

// Returns the backend origin for the current call site: the internal URL on
// the server, the public URL in the browser.
export function getApiBase(): string {
  return typeof window === 'undefined' ? INTERNAL_API_URL : API_BASE_URL;
}

// Canonical public site origin (canonical / Open Graph / sitemap / robots URLs).
export const SITE_URL = requireEnv(
  process.env.NEXT_PUBLIC_APP_URL,
  'NEXT_PUBLIC_APP_URL',
);
