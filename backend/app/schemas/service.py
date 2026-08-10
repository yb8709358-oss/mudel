from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.technician import MediaIn, MediaOut


class ServiceTranslationOut(BaseModel):
    locale: str
    name: str
    description: str | None = None
    meta_title: str | None = None
    meta_desc: str | None = None

    model_config = {'from_attributes': True}


class ServiceOut(BaseModel):
    id: UUID
    slug: str
    icon: str
    sort_order: int
    translations: list[ServiceTranslationOut] = []
    media: list[MediaOut] = []

    model_config = {'from_attributes': True}


class ServiceTranslationIn(BaseModel):
    locale: str = Field(..., min_length=2, max_length=5)
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    meta_title: str | None = Field(None, max_length=70)
    meta_desc: str | None = Field(None, max_length=160)


class ServiceCreate(BaseModel):
    slug: str = Field(..., min_length=1, max_length=100)
    icon: str = Field('wrench', max_length=50)
    sort_order: int = 0
    is_active: bool = True
    translations: list[ServiceTranslationIn] = []
    media: list[MediaIn] = []


class ServiceUpdate(BaseModel):
    slug: str | None = Field(None, min_length=1, max_length=100)
    icon: str | None = Field(None, max_length=50)
    sort_order: int | None = None
    is_active: bool | None = None
    translations: list[ServiceTranslationIn] | None = None
    media: list[MediaIn] | None = None


class ServiceAdminOut(BaseModel):
    id: UUID
    slug: str
    icon: str
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    translations: list[ServiceTranslationOut] = []
    media: list[MediaOut] = []

    model_config = {'from_attributes': True}
