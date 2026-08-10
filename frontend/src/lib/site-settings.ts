import { resolveContactPhone, type ContactPhoneInfo } from '@/lib/contact-phone';

/**
 * Structured view of the public site settings served by the backend (the same
 * settings the Admin Settings page manages). All values come from the settings
 * system — nothing here is hard-coded per-locale contact information.
 */
export interface SiteSettings {
  siteName: string;
  siteTagline: string;
  contactEmail: string;
  address: string;
  workingHours: string;
  facebookUrl: string;
  instagramUrl: string;
  primaryPhone: ContactPhoneInfo | null;
  supportPhone: ContactPhoneInfo | null;
  whatsappPhone: ContactPhoneInfo | null;
}

export const DEFAULT_SITE_NAME = 'Mudel';

/**
 * Renders the `working_hours` setting for display. The setting may be either a
 * plain string ("Lun-Sam 08:00-18:00") or a JSON object ("{"mon":"08:00-18:00",
 * ...}"). JSON values are flattened to a compact "mon: 08:00-18:00 · tue: ..."
 * string; anything unparseable is shown as-is.
 */
export function formatWorkingHours(value: string): string {
  const raw = value.trim();
  if (!raw) return '';
  if (!raw.startsWith('{')) return raw;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed as Record<string, string>)
        .filter(([, hours]) => hours != null && hours !== '')
        .map(([day, hours]) => `${day}: ${hours}`)
        .join(' · ');
    }
  } catch {
    // fall through to raw
  }
  return raw;
}

/**
 * Builds the structured SiteSettings view from the raw settings key/value map.
 * Missing keys resolve to empty values / null so the UI simply hides the
 * corresponding item instead of showing hard-coded contact information.
 */
export function resolveSiteSettings(raw: Record<string, string>): SiteSettings {
  const primaryPhone = resolveContactPhone(raw, 'contact_phone');
  return {
    siteName: (raw.site_name ?? '').trim() || DEFAULT_SITE_NAME,
    siteTagline: (raw.site_tagline ?? '').trim(),
    contactEmail: (raw.contact_email ?? '').trim(),
    address: (raw.address ?? '').trim(),
    workingHours: formatWorkingHours(raw.working_hours ?? ''),
    facebookUrl: (raw.facebook_url ?? '').trim(),
    instagramUrl: (raw.instagram_url ?? '').trim(),
    primaryPhone,
    supportPhone: resolveContactPhone(raw, 'support_phone'),
    whatsappPhone: resolveContactPhone(raw, 'whatsapp_number') ?? primaryPhone,
  };
}
