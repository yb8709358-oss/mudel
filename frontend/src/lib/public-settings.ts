import { resolveSiteSettings, type SiteSettings } from '@/lib/site-settings';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Cache tag attached to the public settings fetch. The admin settings route
 * handler calls `revalidateTag(SETTINGS_CACHE_TAG)` after a successful update
 * so the public footer / contact sections re-render with the new values
 * immediately instead of waiting out the 3600s Data Cache TTL.
 */
export const SETTINGS_CACHE_TAG = 'site-settings';

/**
 * Fetches the public site settings (key/value map, e.g. contact_phone,
 * support_phone, whatsapp_number, contact_email, site_name, address,
 * working_hours, facebook_url, instagram_url) from the backend. Returns an
 * empty map when the backend is unreachable so callers render an empty state
 * instead of crashing.
 */
export async function getPublicSettings(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/settings`, {
      next: { revalidate: 3600, tags: [SETTINGS_CACHE_TAG] },
    });
    if (!res.ok) return {};
    const body = (await res.json()) as { data?: Record<string, string> };
    return body?.data ?? {};
  } catch {
    return {};
  }
}

/**
 * Resolves the full structured site settings from the backend. This is the
 * single source of truth for the public site name and contact information; the
 * values come from the same settings store the Admin Settings page manages.
 */
export async function getPublicSiteSettings(): Promise<SiteSettings> {
  const settings = await getPublicSettings();
  return resolveSiteSettings(settings);
}
