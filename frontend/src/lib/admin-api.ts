import {
  AdminApiResponse,
  AdminContactMessage,
  AdminDashboardSummary,
  AdminDistrict,
  AdminDistrictPayload,
  AdminPaginatedResponse,
  AdminService,
  AdminServicePayload,
  AdminServiceRequest,
  AdminTechnician,
  AdminTechnicianPayload,
  ServiceRequestStatus,
} from '@/types/admin';

export class AdminClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // keep default message
    }

    if (res.status === 401 && typeof window !== 'undefined') {
      // Session expired or invalid — bounce back to the login screen,
      // preserving the active locale segment.
      const segments = window.location.pathname.split('/').filter(Boolean);
      const locale = segments.length > 0 ? segments[0] : '';
      window.location.replace(locale ? `/${locale}/admin/login` : '/admin/login');
    }

    throw new AdminClientError(message, res.status);
  }

  return res.json() as Promise<T>;
}

function toQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

// Messages (contact)
export type MessageReadFilter = boolean | undefined;
export type MessageSort = 'newest' | 'oldest';
export type MessageBulkAction = 'mark_read' | 'mark_unread' | 'delete';

export async function getMessages(params: {
  is_read?: boolean;
  search?: string;
  sort?: MessageSort;
  limit?: number;
  offset?: number;
} = {}) {
  return adminFetch<AdminPaginatedResponse<AdminContactMessage>>(`/messages${toQuery(params)}`);
}

export async function getMessage(id: string) {
  return adminFetch<AdminApiResponse<AdminContactMessage>>(`/messages/${id}`);
}

export async function markMessageRead(id: string, isRead = true) {
  return adminFetch<AdminApiResponse<AdminContactMessage>>(`/messages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_read: isRead }),
  });
}

export async function deleteMessage(id: string) {
  return adminFetch<AdminApiResponse<{ id: string; deleted: boolean }>>(`/messages/${id}`, {
    method: 'DELETE',
  });
}

export async function bulkMessageAction(ids: string[], action: MessageBulkAction) {
  return adminFetch<AdminApiResponse<{ processed: number }>>(`/messages/bulk`, {
    method: 'POST',
    body: JSON.stringify({ ids, action }),
  });
}

// Service requests
export type ServiceRequestSort = 'newest' | 'oldest';
export type ServiceRequestBulkAction = 'delete' | 'update_status';

export async function getServiceRequests(params: {
  status?: string;
  search?: string;
  sort?: ServiceRequestSort;
  limit?: number;
  offset?: number;
} = {}) {
  return adminFetch<AdminPaginatedResponse<AdminServiceRequest>>(`/service-requests${toQuery(params)}`);
}

export async function getServiceRequest(id: string) {
  return adminFetch<AdminApiResponse<AdminServiceRequest>>(`/service-requests/${id}`);
}

export async function updateServiceRequestStatus(id: string, status: ServiceRequestStatus, admin_notes?: string) {
  return adminFetch<AdminApiResponse<AdminServiceRequest>>(`/service-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, admin_notes }),
  });
}

export async function deleteServiceRequest(id: string) {
  return adminFetch<AdminApiResponse<{ id: string; deleted: boolean }>>(`/service-requests/${id}`, {
    method: 'DELETE',
  });
}

export async function bulkServiceRequestAction(ids: string[], action: ServiceRequestBulkAction, status?: ServiceRequestStatus) {
  return adminFetch<AdminApiResponse<{ processed: number }>>(`/service-requests/bulk`, {
    method: 'POST',
    body: JSON.stringify({ ids, action, status }),
  });
}

// Services
export async function getServices(params: {
  search?: string;
  include_inactive?: boolean;
  is_active?: boolean;
  limit?: number;
  offset?: number;
} = {}) {
  return adminFetch<AdminPaginatedResponse<AdminService>>(`/services${toQuery(params)}`);
}

export async function getService(id: string) {
  return adminFetch<AdminApiResponse<AdminService>>(`/services/${id}`);
}

export async function createService(payload: AdminServicePayload) {
  return adminFetch<AdminApiResponse<AdminService>>(`/services`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateService(id: string, payload: Partial<AdminServicePayload>) {
  return adminFetch<AdminApiResponse<AdminService>>(`/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteService(id: string) {
  return adminFetch<AdminApiResponse<{ id: string; deleted: boolean }>>(`/services/${id}`, {
    method: 'DELETE',
  });
}

// Technicians
export async function getTechnicians(params: { search?: string; service?: string; include_inactive?: boolean; limit?: number; offset?: number } = {}) {
  return adminFetch<AdminPaginatedResponse<AdminTechnician>>(`/technicians${toQuery(params)}`);
}

export async function getTechnician(id: string) {
  return adminFetch<AdminApiResponse<AdminTechnician>>(`/technicians/${id}`);
}

export async function createTechnician(payload: AdminTechnicianPayload) {
  return adminFetch<AdminApiResponse<AdminTechnician>>(`/technicians`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTechnician(id: string, payload: Partial<AdminTechnicianPayload>) {
  return adminFetch<AdminApiResponse<AdminTechnician>>(`/technicians/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteTechnician(id: string) {
  return adminFetch<AdminApiResponse<{ id: string; deleted: boolean }>>(`/technicians/${id}`, {
    method: 'DELETE',
  });
}

// Districts
export async function getDistricts(params: {
  search?: string;
  include_inactive?: boolean;
  is_active?: boolean;
  limit?: number;
  offset?: number;
} = {}) {
  return adminFetch<AdminPaginatedResponse<AdminDistrict>>(`/districts${toQuery(params)}`);
}

export async function getDistrict(id: string) {
  return adminFetch<AdminApiResponse<AdminDistrict>>(`/districts/${id}`);
}

export async function createDistrict(payload: AdminDistrictPayload) {
  return adminFetch<AdminApiResponse<AdminDistrict>>(`/districts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDistrict(id: string, payload: Partial<AdminDistrictPayload>) {
  return adminFetch<AdminApiResponse<AdminDistrict>>(`/districts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteDistrict(id: string) {
  return adminFetch<AdminApiResponse<{ id: string; deleted: boolean }>>(`/districts/${id}`, {
    method: 'DELETE',
  });
}

// Settings
export async function getSettings() {
  return adminFetch<AdminApiResponse<Record<string, string>>>(`/settings`);
}

export async function updateSettings(data: Record<string, string>) {
  return adminFetch<AdminApiResponse<Record<string, string>>>(`/settings`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
}

// Dashboard
export async function getDashboard() {
  return adminFetch<AdminApiResponse<AdminDashboardSummary>>(`/dashboard`);
}
