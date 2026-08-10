from uuid import UUID

from app.core.exceptions import NotFoundError, ValidationError
from app.models.district import District
from app.repositories.district import DistrictRepository


class DistrictService:
    def __init__(self, repo: DistrictRepository):
        self.repo = repo

    async def list_active(self, limit: int = 20, offset: int = 0):
        return await self.repo.list_active(limit=limit, offset=offset)

    async def list_all(
        self,
        limit: int = 20,
        offset: int = 0,
        include_inactive: bool = True,
        search: str | None = None,
        is_active: bool | None = None,
    ):
        return await self.repo.list_all(
            limit=limit, offset=offset, include_inactive=include_inactive,
            search=search, is_active=is_active,
        )

    async def get_by_id(self, district_id: UUID):
        district = await self.repo.get_by_id(district_id)
        if not district:
            raise NotFoundError('District', district_id)
        return district

    async def create(self, slug: str, sort_order: int, is_active: bool, translations) -> District:
        if await self.repo.slug_exists(slug):
            raise ValidationError(f'District slug already exists: {slug}')
        return await self.repo.create_district(
            slug=slug, sort_order=sort_order, is_active=is_active, translations=translations
        )

    async def update(self, district_id: UUID, payload) -> District:
        district = await self.repo.get_by_id(district_id)
        if not district:
            raise NotFoundError('District', district_id)

        updates = {}
        for field in ('slug', 'sort_order', 'is_active'):
            value = getattr(payload, field)
            if value is not None:
                updates[field] = value

        if 'slug' in updates and updates['slug'] != district.slug:
            if await self.repo.slug_exists(updates['slug'], exclude_id=district_id):
                raise ValidationError(f'District slug already exists: {updates["slug"]}')

        district = await self.repo.update_district(district, **updates)

        if payload.translations is not None:
            await self.repo.replace_translations(district, payload.translations)

        return await self.repo.get_by_id(district_id)

    async def delete(self, district_id: UUID):
        deleted = await self.repo.delete_district(district_id)
        if not deleted:
            raise NotFoundError('District', district_id)
        return district_id
