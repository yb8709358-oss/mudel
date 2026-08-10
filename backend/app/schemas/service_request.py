from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import normalize_attachments

EMAIL_PATTERN = r'^[^@\s]+@[^@\s]+\.[^@\s]+$'


class ServiceRequestCreate(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=200)
    customer_phone: str = Field(..., pattern=r'^(\+212|0)[5-7]\d{8}$')
    customer_email: str | None = Field(None, max_length=200, pattern=EMAIL_PATTERN)
    service_id: UUID
    technician_id: UUID | None = None
    district_id: UUID | None = None
    preferred_date: date | None = None
    preferred_time: str | None = Field(None, max_length=50)
    description: str | None = Field(None, max_length=2000)


class TranslationBriefOut(BaseModel):
    locale: str
    name: str
    description: str | None = None

    model_config = {'from_attributes': True}


class ServiceBriefOut(BaseModel):
    id: UUID
    slug: str
    translations: list[TranslationBriefOut] = []

    model_config = {'from_attributes': True}


class TechnicianBriefOut(BaseModel):
    id: UUID
    name: str
    slug: str

    model_config = {'from_attributes': True}


class DistrictBriefOut(BaseModel):
    id: UUID
    slug: str
    translations: list[TranslationBriefOut] = []

    model_config = {'from_attributes': True}


class ServiceRequestOut(BaseModel):
    id: UUID
    customer_name: str
    customer_phone: str
    customer_email: str | None = None
    service_id: UUID
    technician_id: UUID | None = None
    district_id: UUID | None = None
    preferred_date: date | None = None
    preferred_time: str | None = None
    description: str | None = None
    status: str
    admin_notes: str | None = None
    request_number: str | None = None
    contact_message_id: UUID | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    attachments: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    service: ServiceBriefOut | None = None
    technician: TechnicianBriefOut | None = None
    district: DistrictBriefOut | None = None

    model_config = {'from_attributes': True}

    @field_validator('attachments', mode='before')
    @classmethod
    def _normalize_attachments(cls, value):
        return normalize_attachments(value)


class ServiceRequestCreatedOut(BaseModel):
    success: bool = True
    data: dict


class ServiceRequestStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r'^(pending|contacted|confirmed|completed|cancelled)$')
    admin_notes: str | None = None


class ServiceRequestBulkAction(BaseModel):
    ids: list[UUID] = Field(..., min_length=1, max_length=100)
    action: Literal['delete', 'update_status']
    status: str | None = Field(None, pattern=r'^(pending|contacted|confirmed|completed|cancelled)$')
