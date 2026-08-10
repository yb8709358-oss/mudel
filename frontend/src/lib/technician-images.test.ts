import { describe, expect, it } from 'vitest';
import {
  buildMediaPayload,
  filterAllowedImageUrls,
  isLegacyInvalidPhotoUrl,
  resolvePhotoUrlPayload,
} from '@/lib/technician-images';

const VALID_UNSPLASH = 'https://images.unsplash.com/photo-ok.jpg';
const VALID_SUPABASE = 'https://abc123.supabase.co/storage/v1/object/public/media/a.jpg';
const LEGACY_INVALID = 'https://somosfanaticos.fans/legacy.png';
const NEW_INVALID = 'https://evil.example.com/new.png';

describe('resolvePhotoUrlPayload (photo_url PATCH value)', () => {
  it('keeps a valid photo_url unchanged', () => {
    expect(resolvePhotoUrlPayload(VALID_UNSPLASH, VALID_UNSPLASH)).toBe(VALID_UNSPLASH);
    expect(resolvePhotoUrlPayload(VALID_SUPABASE, VALID_SUPABASE)).toBe(VALID_SUPABASE);
  });

  it('sends an empty photo_url as null (explicit removal)', () => {
    expect(resolvePhotoUrlPayload('', LEGACY_INVALID)).toBeNull();
    expect(resolvePhotoUrlPayload('   ', LEGACY_INVALID)).toBeNull();
  });

  it('omits an unchanged legacy invalid photo_url so unrelated edits still save', () => {
    expect(resolvePhotoUrlPayload(LEGACY_INVALID, LEGACY_INVALID)).toBeUndefined();
  });

  it('omits a legacy invalid photo_url even when padded with whitespace', () => {
    expect(resolvePhotoUrlPayload(`  ${LEGACY_INVALID} `, LEGACY_INVALID)).toBeUndefined();
  });

  it('sends a valid replacement URL when the legacy value is replaced', () => {
    expect(resolvePhotoUrlPayload(VALID_UNSPLASH, LEGACY_INVALID)).toBe(VALID_UNSPLASH);
  });

  it('sends a newly entered invalid URL so the backend still rejects it with 422', () => {
    expect(resolvePhotoUrlPayload(NEW_INVALID, LEGACY_INVALID)).toBe(NEW_INVALID);
    expect(resolvePhotoUrlPayload(NEW_INVALID, '')).toBe(NEW_INVALID);
  });
});

describe('filterAllowedImageUrls (legacy media sanitization on load)', () => {
  it('drops legacy invalid media URLs and keeps the valid ones', () => {
    expect(
      filterAllowedImageUrls([VALID_UNSPLASH, LEGACY_INVALID, VALID_SUPABASE, null, undefined, '']),
    ).toEqual([VALID_UNSPLASH, VALID_SUPABASE]);
  });

  it('returns an empty list when every stored media URL is invalid', () => {
    expect(filterAllowedImageUrls([LEGACY_INVALID])).toEqual([]);
  });
});

describe('isLegacyInvalidPhotoUrl', () => {
  it('is true only for a non-empty URL that fails the allow-list', () => {
    expect(isLegacyInvalidPhotoUrl(LEGACY_INVALID)).toBe(true);
    expect(isLegacyInvalidPhotoUrl(VALID_UNSPLASH)).toBe(false);
    expect(isLegacyInvalidPhotoUrl(null)).toBe(false);
    expect(isLegacyInvalidPhotoUrl('')).toBe(false);
  });
});

describe('buildMediaPayload (media PATCH array)', () => {
  it('keeps valid media in the payload with sequential sort_order', () => {
    expect(buildMediaPayload([VALID_UNSPLASH, VALID_SUPABASE])).toEqual([
      { url: VALID_UNSPLASH, media_type: 'image', sort_order: 0 },
      { url: VALID_SUPABASE, media_type: 'image', sort_order: 1 },
    ]);
  });

  it('drops empty media rows', () => {
    expect(buildMediaPayload([VALID_UNSPLASH, '', '   '])).toEqual([
      { url: VALID_UNSPLASH, media_type: 'image', sort_order: 0 },
    ]);
  });

  it('does not silently drop a newly entered invalid URL (backend rejects it with 422)', () => {
    const payload = buildMediaPayload([VALID_UNSPLASH, NEW_INVALID]);
    expect(payload.map((m) => m.url)).toEqual([VALID_UNSPLASH, NEW_INVALID]);
  });
});
