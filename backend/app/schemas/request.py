from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import normalize_attachments


class RequestContactSummaryOut(BaseModel):
    id: UUID
    name: str
    phone: str
    district: str
    email: str | None = None
    service_name: str | None = None
    service_slug: str | None = None
    message: str | None = None
    created_at: datetime

    model_config = {'from_attributes': True}


class RequestAccessData(BaseModel):
    status: Literal['available', 'expired', 'consumed']
    contact: RequestContactSummaryOut | None = None
    request_number: str | None = None


class RequestAccessOut(BaseModel):
    success: bool = True
    data: RequestAccessData


class RequestCreate(BaseModel):
    address: str = Field(..., min_length=1, max_length=2000)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    district_id: UUID | None = None
    description: str = Field(..., min_length=1, max_length=2000)
    preferred_date: date
    preferred_time: str = Field(..., min_length=1, max_length=50)
    attachments: list[str] = Field(default_factory=list, max_length=5)

    @field_validator('attachments', mode='before')
    @classmethod
    def _normalize_attachments(cls, value):
        # Always store a proper JSON array: accepts None, a real list, or a
        # pre-serialized JSON string so future clients cannot double-encode
        # the JSONB column again.
        return normalize_attachments(value)


class RequestSubmitData(BaseModel):
    id: UUID
    request_number: str


class RequestSubmitOut(BaseModel):
    success: bool = True
    data: RequestSubmitData


class ImageUploadData(BaseModel):
    urls: list[str]


class ImageUploadOut(BaseModel):
    success: bool = True
    data: ImageUploadData
