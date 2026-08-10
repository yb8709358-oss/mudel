from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models.media import Media
from app.models.service import Service, ServiceTranslation
from app.repositories.base import BaseRepository


class ServiceRepository(BaseRepository):
    def _load_options(self):
        return (
            selectinload(Service.translations),
            selectinload(Service.media),
        )

    async def list_services(self, limit: int = 20, offset: int = 0):
        query = (
            select(Service)
            .options(*self._load_options())
            .where(Service.is_active == True)
            .order_by(Service.sort_order)
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(query)
        services = result.scalars().all()

        count_query = select(func.count()).select_from(Service).where(Service.is_active == True)
        total = (await self.db.execute(count_query)).scalar()

        return services, total

    async def list_all(
        self,
        limit: int = 20,
        offset: int = 0,
        include_inactive: bool = True,
        search: str | None = None,
        is_active: bool | None = None,
    ):
        query = select(Service).options(*self._load_options())
        count_query = select(func.count()).select_from(Service)

        if not include_inactive:
            query = query.where(Service.is_active == True)
            count_query = count_query.where(Service.is_active == True)

        if is_active is not None:
            query = query.where(Service.is_active == is_active)
            count_query = count_query.where(Service.is_active == is_active)

        if search:
            pattern = f'%{search}%'
            query = query.where(Service.slug.ilike(pattern))
            count_query = count_query.where(Service.slug.ilike(pattern))

        query = query.order_by(Service.sort_order, Service.created_at.desc())
        result = await self.db.execute(query.limit(limit).offset(offset))
        services = result.scalars().all()

        total = (await self.db.execute(count_query)).scalar()

        return services, total

    async def get_by_slug(self, slug: str):
        query = (
            select(Service)
            .options(*self._load_options())
            .where(Service.slug == slug, Service.is_active == True)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_id(self, service_id: str):
        query = (
            select(Service)
            .options(*self._load_options())
            .where(Service.id == service_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def slug_exists(self, slug: str, exclude_id: str | None = None) -> bool:
        query = select(func.count()).select_from(Service).where(Service.slug == slug)
        if exclude_id:
            query = query.where(Service.id != exclude_id)
        return (await self.db.execute(query)).scalar() > 0

    async def create_service(self, slug: str, icon: str, sort_order: int,
                             is_active: bool, translations, media):
        service = Service(slug=slug, icon=icon, sort_order=sort_order, is_active=is_active)
        self.db.add(service)
        await self.db.flush()
        for tr in translations:
            self.db.add(ServiceTranslation(
                service_id=service.id,
                locale=tr.locale,
                name=tr.name,
                description=tr.description,
                meta_title=tr.meta_title,
                meta_desc=tr.meta_desc,
            ))
        for md in media:
            self.db.add(Media(
                service_id=service.id,
                url=md.url,
                caption=md.caption,
                alt_text=md.alt_text,
                media_type=md.media_type,
                sort_order=md.sort_order,
            ))
        await self.db.flush()
        return await self.get_by_id(service.id)

    async def update_service(self, service, **fields):
        for field, value in fields.items():
            if value is not None:
                setattr(service, field, value)
        await self.db.flush()
        return await self.get_by_id(service.id)

    async def replace_translations(self, service, translations):
        await self.db.execute(
            ServiceTranslation.__table__.delete().where(
                ServiceTranslation.service_id == service.id
            )
        )
        for tr in translations:
            self.db.add(ServiceTranslation(
                service_id=service.id,
                locale=tr.locale,
                name=tr.name,
                description=tr.description,
                meta_title=tr.meta_title,
                meta_desc=tr.meta_desc,
            ))
        await self.db.flush()
        await self.db.refresh(service, ['translations'])

    async def replace_media(self, service, media):
        await self.db.execute(
            Media.__table__.delete().where(Media.service_id == service.id)
        )
        for md in media:
            self.db.add(Media(
                service_id=service.id,
                url=md.url,
                caption=md.caption,
                alt_text=md.alt_text,
                media_type=md.media_type,
                sort_order=md.sort_order,
            ))
        await self.db.flush()
        await self.db.refresh(service, ['media'])

    async def delete_service(self, service_id: str) -> bool:
        service = await self.get(Service, service_id)
        if not service:
            return False
        await self.db.delete(service)
        await self.db.flush()
        return True

    async def count_active(self) -> int:
        return await self.count(Service, filters=Service.is_active == True)
