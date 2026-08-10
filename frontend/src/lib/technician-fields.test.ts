import { describe, expect, it } from 'vitest';
import { isValidEmail, resolveOptionalString, resolveYearsExp } from '@/lib/technician-fields';

const VALID_EMAIL = 'ahmed.benali@example.com';

describe('isValidEmail (mirrors the backend EMAIL_PATTERN + max length)', () => {
  it('accepts a normal email', () => {
    expect(isValidEmail(VALID_EMAIL)).toBe(true);
  });

  it('rejects values the old DB column allowed but the schema now rejects', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('user@nodomain')).toBe(false);
    expect(isValidEmail('two words@example.com')).toBe(false);
  });

  it('rejects over-length emails', () => {
    expect(isValidEmail(`${'a'.repeat(200)}@example.com`)).toBe(false);
  });
});

describe('resolveOptionalString (omit-if-unchanged for legacy-invalid fields)', () => {
  it('sends an unchanged valid email', () => {
    expect(resolveOptionalString(VALID_EMAIL, VALID_EMAIL, isValidEmail)).toBe(VALID_EMAIL);
  });

  it('sends empty as null (explicit clear)', () => {
    expect(resolveOptionalString('', 'legacy@example.com', isValidEmail)).toBeNull();
    expect(resolveOptionalString('   ', 'legacy@example.com', isValidEmail)).toBeNull();
  });

  it('omits an unchanged legacy-invalid email so unrelated edits still save', () => {
    expect(resolveOptionalString('not-an-email', 'not-an-email', isValidEmail)).toBeUndefined();
  });

  it('omits a legacy-invalid email even when padded with whitespace', () => {
    expect(resolveOptionalString('  not-an-email ', 'not-an-email', isValidEmail)).toBeUndefined();
  });

  it('sends a valid replacement email when the legacy value is replaced', () => {
    expect(resolveOptionalString(VALID_EMAIL, 'not-an-email', isValidEmail)).toBe(VALID_EMAIL);
  });

  it('sends a newly entered invalid email so the backend still rejects it with 422', () => {
    expect(resolveOptionalString('still-bad', VALID_EMAIL, isValidEmail)).toBe('still-bad');
    expect(resolveOptionalString('still-bad', '', isValidEmail)).toBe('still-bad');
  });
});

describe('resolveYearsExp (numeric range enforced only by the schema)', () => {
  it('keeps a valid unchanged years_exp', () => {
    expect(resolveYearsExp(5, 5)).toBe(5);
  });

  it('sends empty as null (explicit clear)', () => {
    expect(resolveYearsExp('', 5)).toBeNull();
  });

  it('omits an unchanged legacy years_exp outside the 0-100 range', () => {
    expect(resolveYearsExp(150, 150)).toBeUndefined();
  });

  it('sends a newly entered years_exp outside the range so the backend rejects it', () => {
    expect(resolveYearsExp(150, 5)).toBe(150);
  });
});
