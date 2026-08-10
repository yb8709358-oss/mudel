from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import normalize_attachments

EMAIL_PATTERN = r'^[^@\s]+@[^@\s]+\.[^@\s]+$'


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    phone: str = Field(..., pattern=r'^(\+212|0)[5-7]\d{8}$')
    district: str = Field(..., min_length=1, max_length=100)
    email: str | None = Field(None, max_length=200, pattern=EMAIL_PATTERN)
    service_id: UUID | None = None
    message: str | None = Field(None, max_length=2000)


class ContactServiceRequestOut(BaseModel):
    """The request a customer completed after using the token link."""

    id: UUID
    request_number: str | None = None
    status: str | None = None
    attachments: list[str] = Field(default_factory=list)
    created_at: datetime | None = None

    model_config = {'from_attributes': True}

    @field_validator('attachments', mode='before')
    @classmethod
    def _normalize_attachments(cls, value):
        return normalize_attachments(value)


class ContactOut(BaseModel):
    id: UUID
    name: str
    phone: str
    district: str
    email: str | None = None
    message: str | None = None
    is_read: bool
    request_token: str | None = None
    request_token_expires_at: datetime | None = None
    request_token_consumed_at: datetime | None = None
    created_at: datetime
    service_request: ContactServiceRequestOut | None = None

    model_config = {'from_attributes': True}


class ContactCreatedOut(BaseModel):
    success: bool = True
    data: dict


class ContactReadUpdate(BaseModel):
    is_read: bool = True


class ContactBulkAction(BaseModel):
    ids: list[UUID] = Field(..., min_length=1, max_length=100)
    action: Literal['mark_read', 'mark_unread', 'delete']
