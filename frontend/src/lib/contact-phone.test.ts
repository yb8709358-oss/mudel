import { describe, expect, it } from 'vitest';
import { formatPhoneDisplay, resolveContactPhone, toE164 } from '@/lib/contact-phone';

describe('toE164', () => {
  it('keeps an already-E.164 number unchanged', () => {
    expect(toE164('+212699551299')).toBe('+212699551299');
  });

  it('normalizes a local 0-prefixed number to +212', () => {
    expect(toE164('0699551299')).toBe('+212699551299');
  });

  it('normalizes an international-prefixed number', () => {
    expect(toE164('00212699551299')).toBe('+212699551299');
  });

  it('normalizes a spaced display value', () => {
    expect(toE164('+212 6 99 55 12 99')).toBe('+212699551299');
  });
});

describe('formatPhoneDisplay', () => {
  it('formats a raw E.164 number into the canonical display form', () => {
    expect(formatPhoneDisplay('+212699551299')).toBe('+212 6 99 55 12 99');
  });

  it('formats a local 0-prefixed number into the canonical display form', () => {
    expect(formatPhoneDisplay('0699551299')).toBe('+212 6 99 55 12 99');
  });

  it('formats an international-prefixed number into the canonical display form', () => {
    expect(formatPhoneDisplay('00212699551299')).toBe('+212 6 99 55 12 99');
  });

  it('keeps an already-formatted value as-is', () => {
    expect(formatPhoneDisplay('+212 6 99 55 12 99')).toBe('+212 6 99 55 12 99');
  });

  it('returns an empty string for empty input', () => {
    expect(formatPhoneDisplay('   ')).toBe('');
  });
});

describe('resolveContactPhone', () => {
  it('prefers the database setting over the env fallback', () => {
    const info = resolveContactPhone(
      { contact_phone: '0699551299' },
      'contact_phone',
      '+212600000000',
    );
    expect(info).not.toBeNull();
    expect(info?.display).toBe('+212 6 99 55 12 99');
    expect(info?.url).toBe('tel:+212699551299');
    expect(info?.whatsapp).toBe('https://wa.me/+212699551299?text=Bonjour%20Mudel%2C%20je%20souhaite%20obtenir%20des%20informations.');
  });

  it('falls back to the environment variable when the setting is absent', () => {
    const info = resolveContactPhone({}, 'contact_phone', '+212600000000');
    expect(info?.display).toBe('+212 6 00 00 00 00');
    expect(info?.url).toBe('tel:+212600000000');
  });

  it('returns null when neither the setting nor the env fallback exists', () => {
    expect(resolveContactPhone({}, 'contact_phone')).toBeNull();
    expect(resolveContactPhone({ contact_phone: '' }, 'contact_phone', undefined)).toBeNull();
  });
});
