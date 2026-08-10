import { getCallUrl, getWhatsappUrl } from '@/lib/utils';

export interface ContactPhoneInfo {
  /** Raw value as configured (DB or env), used for display formatting. */
  number: string;
  /** Human-friendly display value (e.g. "+212 6 99 55 12 99"). */
  display: string;
  /** tel: link built from the E.164 form of the number. */
  url: string;
  /** wa.me link built from the E.164 form of the number. */
  whatsapp: string;
}

export const DEFAULT_WHATSAPP_MESSAGE =
  'Bonjour Mudel, je souhaite obtenir des informations.';

/**
 * Converts a phone value to E.164 form so tel:/wa.me links are always valid,
 * regardless of how the value was entered ("+212 6 99 55 12 99", "0699551299",
 * "+212699551299", …).
 */
export function toE164(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0')) return `+212${digits.slice(1)}`;
  if (digits.startsWith('212') && digits.length === 12) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Formats a phone value for display. Already-formatted values (containing
 * spaces) are kept as-is; raw E.164 / local formats are turned into the
 * site's canonical "+212 X XX XX XX XX" display form when recognizable.
 */
export function formatPhoneDisplay(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/\s/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  let national = digits;
  if (national.startsWith('00')) national = national.slice(2);
  if (national.startsWith('212') && national.length === 12) national = national.slice(3);
  if (national.startsWith('0') && national.length === 10) national = national.slice(1);
  if (/^[5-7]\d{8}$/.test(national)) {
    return `+212 ${national[0]} ${national.slice(1, 3)} ${national.slice(3, 5)} ${national.slice(5, 7)} ${national.slice(7, 9)}`;
  }
  return trimmed;
}

/**
 * Resolves a configured phone number from site settings with an environment
 * variable as the only fallback. Returns null when neither is available so
 * callers can hide the corresponding UI.
 */
export function resolveContactPhone(
  settings: Record<string, string>,
  key: string,
  envFallback?: string,
): ContactPhoneInfo | null {
  const raw = (settings?.[key] ?? '').trim() || (envFallback ?? '').trim();
  if (!raw) return null;
  const e164 = toE164(raw);
  return {
    number: raw,
    display: formatPhoneDisplay(raw),
    url: getCallUrl(e164),
    whatsapp: getWhatsappUrl(e164, DEFAULT_WHATSAPP_MESSAGE),
  };
}
