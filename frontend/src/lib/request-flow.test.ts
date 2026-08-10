import { describe, expect, it } from 'vitest';
import { ApiError, parseApiError } from '@/lib/api';
import {
  errorCodeToKey,
  isLatitudeValid,
  isLongitudeValid,
  MAX_REQUEST_IMAGES,
  validateImageFiles,
} from '@/lib/request-validation';

describe('parseApiError', () => {
  it('maps a backend error payload onto ApiError fields', async () => {
    const res = new Response(
      JSON.stringify({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'This request link has expired.' },
      }),
      { status: 410, headers: { 'Content-Type': 'application/json' } },
    );
    const err = await parseApiError(res);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(410);
    expect(err.code).toBe('TOKEN_EXPIRED');
    expect(err.message).toBe('This request link has expired.');
  });

  it('falls back to UNKNOWN_ERROR when the body has no error payload', async () => {
    const res = new Response('oops', { status: 500 });
    const err = await parseApiError(res);
    expect(err.code).toBe('UNKNOWN_ERROR');
    expect(err.status).toBe(500);
  });

  it('falls back to UNKNOWN_ERROR when the body is not JSON', async () => {
    const res = new Response('not json', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    const err = await parseApiError(res);
    expect(err.code).toBe('UNKNOWN_ERROR');
  });
});

describe('validateImageFiles', () => {
  const jpeg = { type: 'image/jpeg', size: 1024 };

  it('accepts supported image types within size limits', () => {
    const res = validateImageFiles([jpeg, { type: 'image/png', size: 5 * 1024 * 1024 }]);
    expect(res).toEqual({ ok: true, files: [jpeg, { type: 'image/png', size: 5 * 1024 * 1024 }] });
  });

  it('rejects an unsupported type with file_invalid', () => {
    const res = validateImageFiles([{ type: 'text/plain', size: 100 }]);
    expect(res).toEqual({ ok: false, errorKey: 'file_invalid' });
  });

  it('rejects a file over 5 MB with file_too_large', () => {
    const res = validateImageFiles([{ type: 'image/webp', size: 5 * 1024 * 1024 + 1 }]);
    expect(res).toEqual({ ok: false, errorKey: 'file_too_large' });
  });

  it('validates every file, not just the first', () => {
    const res = validateImageFiles([jpeg, { type: 'image/gif', size: 5 * 1024 * 1024 + 1 }]);
    expect(res).toEqual({ ok: false, errorKey: 'file_too_large' });
  });

  it('allows the documented maximum of 5 images', () => {
    expect(MAX_REQUEST_IMAGES).toBe(5);
    const files = Array.from({ length: 5 }, () => jpeg);
    expect(validateImageFiles(files).ok).toBe(true);
  });
});

describe('errorCodeToKey', () => {
  it('maps CONTACT_NO_SERVICE to the no_service message key', () => {
    expect(errorCodeToKey('CONTACT_NO_SERVICE')).toBe('no_service');
  });

  it('maps storage failures to the storage_unavailable key', () => {
    expect(errorCodeToKey('STORAGE_NOT_CONFIGURED')).toBe('storage_unavailable');
    expect(errorCodeToKey('STORAGE_AUTH_FAILED')).toBe('storage_unavailable');
  });

  it('returns null for codes without a dedicated key', () => {
    expect(errorCodeToKey('VALIDATION_ERROR')).toBeNull();
  });
});

describe('coordinate validation', () => {
  it('accepts in-range values', () => {
    expect(isLatitudeValid(31.6295)).toBe(true);
    expect(isLongitudeValid(-7.9811)).toBe(true);
    expect(isLatitudeValid(-90)).toBe(true);
    expect(isLatitudeValid(90)).toBe(true);
    expect(isLongitudeValid(180)).toBe(true);
    expect(isLongitudeValid(-180)).toBe(true);
  });

  it('rejects out-of-range and non-numeric values', () => {
    expect(isLatitudeValid(91)).toBe(false);
    expect(isLatitudeValid(-91)).toBe(false);
    expect(isLongitudeValid(181)).toBe(false);
    expect(isLongitudeValid(NaN)).toBe(false);
  });
});
