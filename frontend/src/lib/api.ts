import {
  ApiErrorPayload,
  ApiResponse,
  ContactFormData,
  ContactSubmission,
  District,
  RequestAccessResponse,
  RequestCreatePayload,
  RequestImageUploadResponse,
  RequestSubmitResponse,
  Service,
  Technician,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Cache tag attached to every public technician fetch. The admin create/update/
 * delete route handlers call `revalidateTag(TECHNICIAN_CACHE_TAG)` after a
 * successful write so the public technician pages (homepage cards, service
 * technician lists, detail page, sitemap) re-render with fresh data immediately
 * instead of waiting out the 3600s Data Cache TTL.
 */
export const TECHNICIAN_CACHE_TAG = 'technicians';

/**
 * Cache tag attached to every public service fetch (detail page, services
 * list, homepage, sitemap). The admin create/update/delete route handlers call
 * `revalidateTag(SERVICE_CACHE_TAG)` after a successful write so service edits
 * — including media URL changes — appear on the public service pages
 * immediately instead of waiting out the 3600s Data Cache TTL.
 */
export const SERVICE_CACHE_TAG = 'services';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: string[];

  constructor(status: number, error: ApiErrorPayload) {
    super(error.message || `API error: ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = error.code;
    this.details = error.details;
  }
}

export async function parseApiError(res: Response): Promise<ApiError> {
  let body: { error?: ApiErrorPayload } | null = null;
  try {
    body = (await res.json()) as { error?: ApiErrorPayload };
  } catch {
    body = null;
  }
  if (body?.error?.code) {
    return new ApiError(res.status, body.error);
  }
  return new ApiError(res.status, { code: 'UNKNOWN_ERROR', message: res.statusText });
}

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    next: { revalidate: 3600, ...options?.next },
  });

  if (!res.ok) {
    throw await parseApiError(res);
  }

  return res.json();
}

export async function getServices() {
  return fetchAPI<ApiResponse<Service[]>>('/services', {
    next: { tags: [SERVICE_CACHE_TAG] },
  });
}

export async function getService(slug: string) {
  return fetchAPI<ApiResponse<Service>>(`/services/${slug}`, {
    next: { tags: [SERVICE_CACHE_TAG] },
  });
}

export async function getTechnicians(serviceSlug?: string) {
  const query = serviceSlug ? `?service=${serviceSlug}` : '';
  return fetchAPI<ApiResponse<Technician[]>>(`/technicians${query}`, {
    next: { tags: [TECHNICIAN_CACHE_TAG] },
  });
}

export async function getTechnician(id: string) {
  return fetchAPI<ApiResponse<Technician>>(`/technicians/${id}`, {
    next: { tags: [TECHNICIAN_CACHE_TAG] },
  });
}

export async function getDistricts() {
  return fetchAPI<ApiResponse<District[]>>('/districts');
}

export async function submitContact(data: ContactFormData) {
  return fetchAPI<ApiResponse<ContactSubmission>>('/contact', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getRequestAccess(token: string) {
  return fetchAPI<RequestAccessResponse>(`/requests/${token}`, {
    cache: 'no-store',
  });
}

export async function uploadRequestImages(token: string, files: File[]) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/requests/${token}/images`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw await parseApiError(res);
  }

  return res.json() as Promise<RequestImageUploadResponse>;
}

export async function submitRequest(token: string, payload: RequestCreatePayload) {
  return fetchAPI<RequestSubmitResponse>(`/requests/${token}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
