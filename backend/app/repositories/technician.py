from uuid import uuid4

from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.models.district import District
from app.models.media import Media
from app.models.technician import (
    Technician,
    TechnicianDistrict,
    TechnicianService,
    TechnicianTranslation,
)
from app.repositories.base import BaseRepository


class TechnicianRepository(BaseRepository):
    def _load_options(self):
        return (
            selectinload(Technician.translations),
            selectinload(Technician.media),
            selectinload(Technician.services),
            selectinload(Technician.districts).selectinload(District.translations),
        )

    async def list_technicians(self, service_slug: str | None = None, limit: int = 20, offset: int = 0):
        query = select(Technician).options(*self._load_options())
        count_query = select(func.count(func.distinct(Technician.id))).select_from(Technician)

        if service_slug:
            query = query.join(TechnicianService).join(TechnicianService.service).where(
                TechnicianService.service.has(slug=service_slug, is_active=True)
            )
            count_query = count_query.join(TechnicianService).join(TechnicianService.service).where(
                TechnicianService.service.has(slug=service_slug, is_active=True)
            )

        query = query.where(Technician.is_active == True).order_by(
            Technician.sort_order, Technician.is_featured.desc()
        ).limit(limit).offset(offset)
        count_query = count_query.where(Technician.is_active == True)

        result = await self.db.execute(query)
        technicians = result.scalars().unique().all()

        total = (await self.db.execute(count_query)).scalar()

        return technicians, total

    async def list_all(
        self,
        limit: int = 20,
        offset: int = 0,
        include_inactive: bool = True,
        search: str | None = None,
        service_slug: str | None = None,
    ):
        query = select(Technician).options(*self._load_options())
        count_query = select(func.count(func.distinct(Technician.id))).select_from(Technician)

        if service_slug:
            query = query.join(TechnicianService).join(TechnicianService.service).where(
                TechnicianService.service.has(slug=service_slug)
            )
            count_query = count_query.join(TechnicianService).join(TechnicianService.service).where(
                TechnicianService.service.has(slug=service_slug)
            )

        if not include_inactive:
            query = query.where(Technician.is_active == True)
            count_query = count_query.where(Technician.is_active == True)

        if search:
            pattern = f'%{search}%'
            query = query.where(
                or_(
                    Technician.name.ilike(pattern),
                    Technician.slug.ilike(pattern),
                    Technician.phone.ilike(pattern),
                )
            )
            count_query = count_query.where(
                or_(
                    Technician.name.ilike(pattern),
                    Technician.slug.ilike(pattern),
                    Technician.phone.ilike(pattern),
                )
            )

        query = query.order_by(Technician.sort_order, Technician.created_at.desc())
        result = await self.db.execute(query.limit(limit).offset(offset))
        technicians = result.scalars().unique().all()

        total = (await self.db.execute(count_query)).scalar()

        return technicians, total

    async def get_by_id(self, technician_id: str):
        query = (
            select(Technician)
            .options(*self._load_options())
            .where(Technician.id == technician_id, Technician.is_active == True)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_admin_by_id(self, technician_id: str):
        query = (
            select(Technician)
            .options(*self._load_options())
            .where(Technician.id == technician_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def slug_exists(self, slug: str, exclude_id: str | None = None) -> bool:
        query = select(func.count()).select_from(Technician).where(Technician.slug == slug)
        if exclude_id:
            query = query.where(Technician.id != exclude_id)
        return (await self.db.execute(query)).scalar() > 0

    async def create_technician(self, data: dict, translations, media, services, district_ids):
        technician = Technician(**data)
        self.db.add(technician)
        await self.db.flush()

        for tr in translations:
            self.db.add(TechnicianTranslation(
                technician_id=technician.id,
                locale=tr.locale,
                bio=tr.bio,
            ))
        for md in media:
            self.db.add(Media(
                technician_id=technician.id,
                url=md.url,
                caption=md.caption,
                alt_text=md.alt_text,
                media_type=md.media_type,
                sort_order=md.sort_order,
            ))
        for ts in services:
            self.db.add(TechnicianService(
                technician_id=technician.id,
                service_id=ts.service_id,
                estimated_price_min=ts.estimated_price_min,
                estimated_price_max=ts.estimated_price_max,
            ))

        await self._set_districts(technician, district_ids)
        await self.db.flush()
        return await self.get_admin_by_id(technician.id)

    async def update_technician(self, technician, **fields):
        for field, value in fields.items():
            setattr(technician, field, value)
        await self.db.flush()
        return await self.get_admin_by_id(technician.id)

    async def replace_translations(self, technician, translations):
        await self.db.execute(
            TechnicianTranslation.__table__.delete().where(
                TechnicianTranslation.technician_id == technician.id
            )
        )
        for tr in translations:
            self.db.add(TechnicianTranslation(
                technician_id=technician.id,
                locale=tr.locale,
                bio=tr.bio,
            ))
        await self.db.flush()
        await self.db.refresh(technician, ['translations'])

    async def replace_media(self, technician, media):
        await self.db.execute(
            Media.__table__.delete().where(Media.technician_id == technician.id)
        )
        for md in media:
            self.db.add(Media(
                technician_id=technician.id,
                url=md.url,
                caption=md.caption,
                alt_text=md.alt_text,
                media_type=md.media_type,
                sort_order=md.sort_order,
            ))
        await self.db.flush()
        await self.db.refresh(technician, ['media'])

    async def replace_services(self, technician, services):
        await self.db.execute(
            TechnicianService.__table__.delete().where(
                TechnicianService.technician_id == technician.id
            )
        )
        for ts in services:
            self.db.add(TechnicianService(
                technician_id=technician.id,
                service_id=ts.service_id,
                estimated_price_min=ts.estimated_price_min,
                estimated_price_max=ts.estimated_price_max,
            ))
        await self.db.flush()
        await self.db.refresh(technician, ['services'])

    async def _set_districts(self, technician, district_ids):
        await self.db.execute(
            TechnicianDistrict.__table__.delete().where(
                TechnicianDistrict.technician_id == technician.id
            )
        )
        if district_ids:
            result = await self.db.execute(
                select(District).where(District.id.in_(district_ids))
            )
            districts = result.scalars().all()
            for district in districts:
                await self.db.execute(
                    TechnicianDistrict.__table__.insert().values(
                        id=uuid4(),
                        technician_id=technician.id,
                        district_id=district.id,
                    )
                )
        await self.db.flush()
        await self.db.refresh(technician, ['districts'])

    async def set_districts(self, technician, district_ids):
        await self._set_districts(technician, district_ids)
        return await self.get_admin_by_id(technician.id)

    async def delete_technician(self, technician_id: str) -> bool:
        technician = await self.get(Technician, technician_id)
        if not technician:
            return False
        await self.db.delete(technician)
        await self.db.flush()
        return True

    async def count_active(self) -> int:
        return await self.count(Technician, filters=Technician.is_active == True)
