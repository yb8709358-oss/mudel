from uuid import UUID

from app.core.exceptions import NotFoundError, ValidationError
from app.models.service import Service
from app.repositories.service import ServiceRepository


class ServiceService:
    def __init__(self, repo: ServiceRepository):
        self.repo = repo

    async def list_services(self, limit: int = 20, offset: int = 0):
        return await self.repo.list_services(limit=limit, offset=offset)

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

    async def get_by_slug(self, slug: str):
        service = await self.repo.get_by_slug(slug)
        if not service:
            raise NotFoundError('Service', slug)
        return service

    async def get_by_id(self, service_id: UUID):
        service = await self.repo.get_by_id(service_id)
        if not service:
            raise NotFoundError('Service', service_id)
        return service

    async def create(self, slug: str, icon: str, sort_order: int, is_active: bool,
                     translations, media):
        if await self.repo.slug_exists(slug):
            raise ValidationError(f'Service slug already exists: {slug}')
        return await self.repo.create_service(
            slug=slug, icon=icon, sort_order=sort_order,
            is_active=is_active, translations=translations, media=media,
        )

    async def update(self, service_id: UUID, payload) -> Service:
        service = await self.repo.get_by_id(service_id)
        if not service:
            raise NotFoundError('Service', service_id)

        updates = {}
        for field in ('slug', 'icon', 'sort_order', 'is_active'):
            value = getattr(payload, field)
            if value is not None:
                updates[field] = value

        if 'slug' in updates and updates['slug'] != service.slug:
            if await self.repo.slug_exists(updates['slug'], exclude_id=service_id):
                raise ValidationError(f'Service slug already exists: {updates["slug"]}')

        service = await self.repo.update_service(service, **updates)

        if payload.translations is not None:
            await self.repo.replace_translations(service, payload.translations)
        if payload.media is not None:
            await self.repo.replace_media(service, payload.media)

        return await self.repo.get_by_id(service_id)

    async def delete(self, service_id: UUID):
        deleted = await self.repo.delete_service(service_id)
        if not deleted:
            raise NotFoundError('Service', service_id)
        return service_id
