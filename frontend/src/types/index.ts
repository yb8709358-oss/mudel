export type Locale = 'en' | 'fr' | 'ar';

export interface ServiceTranslation {
  locale: string;
  name: string;
  description?: string;
  meta_title?: string;
  meta_desc?: string;
}

export interface Media {
  url: string;
  caption?: string;
  alt_text?: string;
  media_type: string;
  sort_order: number;
}

export interface Service {
  id: string;
  slug: string;
  icon: string;
  image?: string;
  sort_order: number;
  translations: ServiceTranslation[];
  media?: Media[];
}

export interface TechnicianTranslation {
  locale: string;
  bio?: string;
}

export interface TechnicianMedia {
  url: string;
  caption?: string;
  alt_text?: string;
  media_type: string;
  sort_order: number;
}

export interface TechnicianService {
  service_id: string;
  price_range?: string;
}

export interface Technician {
  id: string;
  name: string;
  slug: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  photo_url?: string;
  rating: number;
  review_count: number;
  service_area?: string;
  working_hours?: Record<string, string>;
  languages?: string[];
  years_exp?: number;
  is_featured: boolean;
  is_available: boolean;
  translations: TechnicianTranslation[];
  media: TechnicianMedia[];
  services: TechnicianService[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: string[];
}

export interface ApiErrorResponse {
  success: boolean;
  error: ApiErrorPayload;
}

export interface ContactFormData {
  name: string;
  phone: string;
  district: string;
  email?: string;
  service_id: string;
  message?: string;
}

export interface ContactSubmission {
  id: string;
  message: string;
  request_token: string;
  request_token_expires_at: string | null;
}

export type RequestAccessStatus = 'available' | 'expired' | 'consumed';

export interface RequestContactSummary {
  id: string;
  name: string;
  phone: string;
  district: string;
  email: string | null;
  service_name: string | null;
  service_slug: string | null;
  message: string | null;
  created_at: string;
}

export interface RequestAccessData {
  status: RequestAccessStatus;
  contact: RequestContactSummary | null;
  request_number: string | null;
}

export interface RequestAccessResponse extends ApiResponse<RequestAccessData> {}

export interface DistrictTranslation {
  locale: string;
  name: string;
}

export interface District {
  id: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  translations: DistrictTranslation[];
}

export interface RequestCreatePayload {
  address: string;
  latitude: number | null;
  longitude: number | null;
  district_id?: string | null;
  description: string;
  preferred_date: string;
  preferred_time: string;
  attachments?: string[];
}

export interface RequestSubmitData {
  id: string;
  request_number: string;
}

export interface RequestSubmitResponse extends ApiResponse<RequestSubmitData> {}

export interface RequestImageUploadResponse extends ApiResponse<{ urls: string[] }> {}
