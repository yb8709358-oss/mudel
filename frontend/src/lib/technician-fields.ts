const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EMAIL_MAX_LENGTH = 200;
const YEARS_EXP_MIN = 0;
const YEARS_EXP_MAX = 100;

/** Mirrors the backend EMAIL_PATTERN + max length for TechnicianUpdate.email. */
export function isValidEmail(value: string): boolean {
  return value.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(value);
}

/**
 * Resolves an optional string field (email, etc.) for the technician PATCH payload.
 *
 * - '' or whitespace                   → null       (explicitly clear the field)
 * - value passing `isValid`            → the value  (sent)
 * - invalid but unchanged from the value loaded from the DB (legacy bad data)
 *                                       → undefined  (field omitted so an unrelated
 *                                                     edit is not blocked by old data)
 * - invalid and newly entered          → the value  (sent so the backend still
 *                                                     rejects it with a clear 422)
 */
export function resolveOptionalString(
  value: string,
  originalValue: string,
  isValid: (value: string) => boolean,
): string | null | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (isValid(trimmed)) return trimmed;
  if (trimmed === originalValue.trim()) return undefined;
  return trimmed;
}

/**
 * Resolves years_exp for the technician PATCH payload with the same semantics as
 * resolveOptionalString, applied to the numeric range enforced by the backend
 * (0-100). Legacy rows can hold values outside that range because the DB column
 * only stores an integer; omitting an unchanged out-of-range value lets an
 * unrelated edit save while a newly entered one is still sent for the backend
 * to reject.
 */
export function resolveYearsExp(value: number | '', originalValue: number | null): number | null | undefined {
  if (value === '') return null;
  if (value >= YEARS_EXP_MIN && value <= YEARS_EXP_MAX) return value;
  if (originalValue !== null && value === originalValue) return undefined;
  return value;
}
