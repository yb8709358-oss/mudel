from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.image_urls import is_allowed_image_url

EMAIL_PATTERN = r'^[^@\s]+@[^@\s]+\.[^@\s]+$'


class TechnicianTranslationOut(BaseModel):
    locale: str
    bio: str | None = None

    model_config = {'from_attributes': True}


class MediaOut(BaseModel):
    url: str
    caption: str | None = None
    alt_text: str | None = None
    media_type: str = 'image'
    sort_order: int

    model_config = {'from_attributes': True}


class MediaIn(BaseModel):
    url: str = Field(..., min_length=1, max_length=500)
    caption: str | None = Field(None, max_length=200)
    alt_text: str | None = Field(None, max_length=200)
    media_type: str = Field('image', max_length=20)
    sort_order: int = 0

    @field_validator('url')
    @classmethod
    def validate_url(cls, value: str) -> str:
        if not is_allowed_image_url(value):
            raise ValueError(
                'url must be an HTTPS image URL on an allowed host '
                '(images.unsplash.com or *.supabase.co)'
            )
        return value


class TechnicianServiceOut(BaseModel):
    service_id: UUID
    estimated_price_min: float | None = None
    estimated_price_max: float | None = None

    model_config = {'from_attributes': True}


class DistrictTranslationBrief(BaseModel):
    locale: str
    name: str

    model_config = {'from_attributes': True}


class DistrictBriefOut(BaseModel):
    id: UUID
    slug: str
    translations: list[DistrictTranslationBrief] = []

    model_config = {'from_attributes': True}


class TechnicianOut(BaseModel):
    id: UUID
    name: str
    slug: str
    phone: str
    whatsapp: str | None = None
    email: str | None = None
    photo_url: str | None = None
    rating: float
    review_count: int
    service_area: str | None = None
    working_hours: dict[str, str] | None = None
    languages: list[str] | None = None
    years_exp: int | None = None
    is_featured: bool
    is_available: bool
    translations: list[TechnicianTranslationOut] = []
    media: list[MediaOut] = []
    services: list[TechnicianServiceOut] = []
    districts: list[DistrictBriefOut] = []

    model_config = {'from_attributes': True}


class TechnicianTranslationIn(BaseModel):
    locale: str = Field(..., min_length=2, max_length=5)
    bio: str | None = Field(None, max_length=3000)


class TechnicianServiceIn(BaseModel):
    service_id: UUID
    estimated_price_min: float | None = None
    estimated_price_max: float | None = None


class TechnicianCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=200)
    phone: str = Field(..., min_length=1, max_length=20)
    whatsapp: str | None = Field(None, max_length=20)
    email: str | None = Field(None, max_length=200, pattern=EMAIL_PATTERN)
    photo_url: str | None = Field(None, max_length=500)
    service_area: str | None = Field(None, max_length=300)
    working_hours: dict[str, str] | None = None
    languages: list[str] | None = None
    years_exp: int | None = Field(None, ge=0, le=100)
    is_featured: bool = False

    @field_validator('photo_url')
    @classmethod
    def validate_photo_url(cls, value: str | None) -> str | None:
        if value is not None and not is_allowed_image_url(value):
            raise ValueError(
                'photo_url must be an HTTPS image URL on an allowed host '
                '(images.unsplash.com or *.supabase.co)'
            )
        return value
    is_available: bool = True
    is_active: bool = True
    sort_order: int = 0
    translations: list[TechnicianTranslationIn] = []
    media: list[MediaIn] = []
    services: list[TechnicianServiceIn] = []
    districts: list[UUID] = []


class TechnicianUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    slug: str | None = Field(None, min_length=1, max_length=200)
    phone: str | None = Field(None, min_length=1, max_length=20)
    whatsapp: str | None = Field(None, max_length=20)
    email: str | None = Field(None, max_length=200, pattern=EMAIL_PATTERN)
    photo_url: str | None = Field(None, max_length=500)
    service_area: str | None = Field(None, max_length=300)
    working_hours: dict[str, str] | None = None
    languages: list[str] | None = None
    years_exp: int | None = Field(None, ge=0, le=100)
    is_featured: bool | None = None

    @field_validator('photo_url')
    @classmethod
    def validate_photo_url(cls, value: str | None) -> str | None:
        if value is not None and not is_allowed_image_url(value):
            raise ValueError(
                'photo_url must be an HTTPS image URL on an allowed host '
                '(images.unsplash.com or *.supabase.co)'
            )
        return value
    is_available: bool | None = None
    is_active: bool | None = None
    sort_order: int | None = None
    translations: list[TechnicianTranslationIn] | None = None
    media: list[MediaIn] | None = None
    services: list[TechnicianServiceIn] | None = None
    districts: list[UUID] | None = None


class TechnicianAdminOut(BaseModel):
    id: UUID
    name: str
    slug: str
    phone: str
    whatsapp: str | None = None
    email: str | None = None
    photo_url: str | None = None
    rating: float
    review_count: int
    service_area: str | None = None
    working_hours: dict[str, str] | None = None
    languages: list[str] | None = None
    years_exp: int | None = None
    is_featured: bool
    is_available: bool
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime
    translations: list[TechnicianTranslationOut] = []
    media: list[MediaOut] = []
    services: list[TechnicianServiceOut] = []
    districts: list[DistrictBriefOut] = []

    model_config = {'from_attributes': True}
