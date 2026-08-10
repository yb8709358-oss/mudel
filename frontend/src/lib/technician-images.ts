import { isAllowedImageUrl } from '@/lib/image-urls';

export interface TechnicianMediaPayload {
  url: string;
  media_type: 'image';
  sort_order: number;
}

/**
 * Resolves the photo_url value for the technician PATCH payload.
 *
 * - '' or whitespace                     → null       (explicitly remove the image)
 * - URL passing the allow-list           → the URL    (sent)
 * - invalid but unchanged from the value loaded from the DB (legacy bad data)
 *                                        → undefined  (field omitted so an unrelated
 *                                                      edit is not blocked by old data)
 * - invalid and newly entered            → the URL    (returned so handleSubmit can
 *                                                      reject it client-side before the
 *                                                      request is sent)
 */
export function resolvePhotoUrlPayload(value: string, originalValue: string): string | null | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (isAllowedImageUrl(trimmed)) return trimmed;
  if (trimmed === originalValue.trim()) return undefined;
  return trimmed;
}

/**
 * Keeps only image URLs that pass the allow-list. Used when loading an existing
 * technician so legacy invalid media entries never enter the editable form and
 * therefore never get re-sent unchanged on PATCH.
 */
export function filterAllowedImageUrls(urls: Array<string | null | undefined>): string[] {
  return urls.filter((url): url is string => isAllowedImageUrl(url));
}

/**
 * Returns the first non-empty image URL that does NOT pass the allow-list, or
 * null when every non-empty URL is allowed. The technician form uses this to
 * reject newly entered invalid photo/media URLs client-side BEFORE the request
 * is sent, instead of letting the backend reject them with 422.
 */
export function findInvalidImageUrl(urls: Array<string | null | undefined>): string | null {
  for (const url of urls) {
    const trimmed = (url ?? '').trim();
    if (trimmed && !isAllowedImageUrl(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

/** True when a stored photo URL is non-empty but does not pass the allow-list. */
export function isLegacyInvalidPhotoUrl(url: string | null | undefined): boolean {
  return Boolean(url && url.trim() && !isAllowedImageUrl(url));
}

/**
 * Builds the media array for the PATCH payload from the form's URL strings.
 * Empty rows are dropped. Non-empty rows are sent as-is: legacy invalid URLs
 * were already filtered when the form loaded, so anything invalid reaching this
 * point was newly typed; handleSubmit validates those URLs against the
 * allow-list and rejects the form before the request is sent.
 */
export function buildMediaPayload(urls: string[]): TechnicianMediaPayload[] {
  return urls
    .map((url, index) => ({ url: url.trim(), media_type: 'image' as const, sort_order: index }))
    .filter((m) => m.url);
}
