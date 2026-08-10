export const MAX_REQUEST_IMAGES = 5;
export const MAX_REQUEST_IMAGE_BYTES = 5 * 1024 * 1024;
export const REQUEST_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export interface ImageFileLike {
  type: string;
  size: number;
}

export function validateImageFiles<T extends ImageFileLike>(selected: T[]):
  | { ok: true; files: T[] }
  | { ok: false; errorKey: 'file_invalid' | 'file_too_large' } {
  for (const file of selected) {
    if (!REQUEST_IMAGE_TYPES.includes(file.type)) {
      return { ok: false, errorKey: 'file_invalid' };
    }
    if (file.size > MAX_REQUEST_IMAGE_BYTES) {
      return { ok: false, errorKey: 'file_too_large' };
    }
  }
  return { ok: true, files: selected };
}

export function errorCodeToKey(code: string): string | null {
  switch (code) {
    case 'CONTACT_NO_SERVICE':
      return 'no_service';
    case 'STORAGE_NOT_CONFIGURED':
    case 'STORAGE_AUTH_FAILED':
      return 'storage_unavailable';
    default:
      return null;
  }
}

export function isLatitudeValid(value: number): boolean {
  return !Number.isNaN(value) && value >= -90 && value <= 90;
}

export function isLongitudeValid(value: number): boolean {
  return !Number.isNaN(value) && value >= -180 && value <= 180;
}
