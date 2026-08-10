export interface AdminTranslation {
  locale: string;
  name?: string;
  description?: string;
  meta_title?: string;
  meta_desc?: string;
  bio?: string;
}

export interface AdminMedia {
  url: string;
  caption?: string;
  alt_text?: string;
  media_type: string;
  sort_order: number;
}

export interface AdminService {
  id: string;
  slug: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: AdminTranslation[];
  media: AdminMedia[];
}

export interface AdminServicePayload {
  slug: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
  translations?: AdminTranslation[];
  media?: AdminMedia[];
}

export interface AdminDistrictTranslation {
  locale: string;
  name: string;
  description?: string;
}

export interface AdminDistrict {
  id: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: AdminDistrictTranslation[];
}

export interface AdminDistrictPayload {
  slug: string;
  sort_order?: number;
  is_active?: boolean;
  translations?: AdminDistrictTranslation[];
}

export interface AdminDistrictBrief {
  id: string;
  slug: string;
  translations: { locale: string; name: string }[];
}

export interface AdminTechnicianService {
  service_id: string;
  estimated_price_min?: number | null;
  estimated_price_max?: number | null;
}

export interface AdminTechnician {
  id: string;
  name: string;
  slug: string;
  phone: string;
  whatsapp?: string | null;
  email?: string | null;
  photo_url?: string | null;
  rating: number;
  review_count: number;
  service_area?: string | null;
  working_hours?: Record<string, string> | null;
  languages?: string[] | null;
  years_exp?: number | null;
  is_featured: boolean;
  is_available: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  translations: AdminTranslation[];
  media: AdminMedia[];
  services: AdminTechnicianService[];
  districts: AdminDistrictBrief[];
}

export interface AdminTechnicianPayload {
  name: string;
  slug: string;
  phone: string;
  whatsapp?: string | null;
  email?: string | null;
  photo_url?: string | null;
  service_area?: string | null;
  working_hours?: Record<string, string> | null;
  languages?: string[];
  years_exp?: number | null;
  is_featured?: boolean;
  is_available?: boolean;
  is_active?: boolean;
  sort_order?: number;
  translations?: AdminTranslation[];
  media?: AdminMedia[];
  services?: AdminTechnicianService[];
  districts?: string[];
}

export interface AdminContactMessage {
  id: string;
  name: string;
  phone: string;
  district: string;
  email?: string | null;
  message?: string | null;
  is_read: boolean;
  created_at: string;
  service_request?: AdminServiceRequestBrief | null;
}

export type ServiceRequestStatus = 'pending' | 'contacted' | 'confirmed' | 'completed' | 'cancelled';

export interface AdminServiceRequestBrief {
  id: string;
  request_number?: string | null;
  status: ServiceRequestStatus;
  attachments?: string[] | null;
  created_at: string;
}

export interface AdminServiceRequest {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  service_id: string;
  technician_id?: string | null;
  district_id?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  description?: string | null;
  status: ServiceRequestStatus;
  admin_notes?: string | null;
  request_number?: string | null;
  contact_message_id?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  attachments?: string[] | null;
  created_at: string;
  updated_at: string;
  service?: { id: string; slug: string; translations: { locale: string; name: string }[] } | null;
  technician?: { id: string; name: string; slug: string } | null;
  district?: { id: string; slug: string; translations: { locale: string; name: string }[] } | null;
}

export interface AdminDashboardSummary {
  services: number;
  technicians: number;
  districts: number;
  contact_messages: number;
  contact_unread: number;
  service_requests: number;
  service_requests_by_status: { status: string; count: number }[];
}

export interface AdminPaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface AdminApiResponse<T> {
  success: boolean;
  data: T;
}

export interface AdminPaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: AdminPaginationMeta;
}
