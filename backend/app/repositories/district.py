from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models.district import District, DistrictTranslation
from app.repositories.base import BaseRepository


class DistrictRepository(BaseRepository):
    async def list_active(self, limit: int = 20, offset: int = 0):
        query = (
            select(District)
            .options(selectinload(District.translations))
            .where(District.is_active == True)
            .order_by(District.sort_order)
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(query)
        districts = result.scalars().unique().all()

        count_query = select(func.count()).select_from(District).where(District.is_active == True)
        total = (await self.db.execute(count_query)).scalar()

        return districts, total

    async def list_all(
        self,
        limit: int = 20,
        offset: int = 0,
        include_inactive: bool = True,
        search: str | None = None,
        is_active: bool | None = None,
    ):
        query = select(District).options(selectinload(District.translations))
        count_query = select(func.count()).select_from(District)

        if not include_inactive:
            query = query.where(District.is_active == True)
            count_query = count_query.where(District.is_active == True)

        if is_active is not None:
            query = query.where(District.is_active == is_active)
            count_query = count_query.where(District.is_active == is_active)

        if search:
            pattern = f'%{search}%'
            query = query.where(District.slug.ilike(pattern))
            count_query = count_query.where(District.slug.ilike(pattern))

        query = query.order_by(District.sort_order, District.created_at.desc())
        result = await self.db.execute(query.limit(limit).offset(offset))
        districts = result.scalars().unique().all()

        total = (await self.db.execute(count_query)).scalar()

        return districts, total

    async def get_by_slug(self, slug: str):
        query = (
            select(District)
            .options(selectinload(District.translations))
            .where(District.slug == slug, District.is_active == True)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_id(self, district_id: str):
        query = (
            select(District)
            .options(selectinload(District.translations))
            .where(District.id == district_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def slug_exists(self, slug: str, exclude_id: str | None = None) -> bool:
        query = select(func.count()).select_from(District).where(District.slug == slug)
        if exclude_id:
            query = query.where(District.id != exclude_id)
        return (await self.db.execute(query)).scalar() > 0

    async def create_district(self, slug: str, sort_order: int, is_active: bool, translations):
        district = District(slug=slug, sort_order=sort_order, is_active=is_active)
        self.db.add(district)
        await self.db.flush()
        for tr in translations:
            self.db.add(DistrictTranslation(
                district_id=district.id,
                locale=tr.locale,
                name=tr.name,
                description=tr.description,
            ))
        await self.db.flush()
        return await self.get_by_id(district.id)

    async def update_district(self, district, **fields):
        for field, value in fields.items():
            if value is not None:
                setattr(district, field, value)
        await self.db.flush()
        return await self.get_by_id(district.id)

    async def replace_translations(self, district, translations):
        await self.db.execute(
            DistrictTranslation.__table__.delete().where(
                DistrictTranslation.district_id == district.id
            )
        )
        for tr in translations:
            self.db.add(DistrictTranslation(
                district_id=district.id,
                locale=tr.locale,
                name=tr.name,
                description=tr.description,
            ))
        await self.db.flush()

    async def delete_district(self, district_id: str) -> bool:
        district = await self.get(District, district_id)
        if not district:
            return False
        await self.db.delete(district)
        await self.db.flush()
        return True

    async def count_active(self) -> int:
        return await self.count(District, filters=District.is_active == True)
