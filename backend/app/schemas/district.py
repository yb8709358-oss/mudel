from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DistrictTranslationOut(BaseModel):
    locale: str
    name: str
    description: str | None = None

    model_config = {'from_attributes': True}


class DistrictOut(BaseModel):
    id: UUID
    slug: str
    sort_order: int
    is_active: bool
    translations: list[DistrictTranslationOut] = []

    model_config = {'from_attributes': True}


class DistrictTranslationIn(BaseModel):
    locale: str = Field(..., min_length=2, max_length=5)
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)


class DistrictCreate(BaseModel):
    slug: str = Field(..., min_length=1, max_length=100)
    sort_order: int = 0
    is_active: bool = True
    translations: list[DistrictTranslationIn] = []


class DistrictUpdate(BaseModel):
    slug: str | None = Field(None, min_length=1, max_length=100)
    sort_order: int | None = None
    is_active: bool | None = None
    translations: list[DistrictTranslationIn] | None = None


class DistrictAdminOut(BaseModel):
    id: UUID
    slug: str
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    translations: list[DistrictTranslationOut] = []

    model_config = {'from_attributes': True}
