from uuid import UUID

from app.core.exceptions import NotFoundError, ValidationError
from app.models.technician import Technician
from app.repositories.technician import TechnicianRepository


class TechnicianService:
    def __init__(self, repo: TechnicianRepository):
        self.repo = repo

    async def list_technicians(self, service_slug: str | None = None, limit: int = 20, offset: int = 0):
        return await self.repo.list_technicians(service_slug, limit=limit, offset=offset)

    async def list_all(
        self,
        limit: int = 20,
        offset: int = 0,
        include_inactive: bool = True,
        search: str | None = None,
        service_slug: str | None = None,
    ):
        return await self.repo.list_all(
            limit=limit,
            offset=offset,
            include_inactive=include_inactive,
            search=search,
            service_slug=service_slug,
        )

    async def get_by_id(self, technician_id: UUID):
        tech = await self.repo.get_by_id(technician_id)
        if not tech:
            raise NotFoundError('Technician', technician_id)
        return tech

    async def get_admin_by_id(self, technician_id: UUID):
        tech = await self.repo.get_admin_by_id(technician_id)
        if not tech:
            raise NotFoundError('Technician', technician_id)
        return tech

    async def create(self, payload) -> Technician:
        if await self.repo.slug_exists(payload.slug):
            raise ValidationError(f'Technician slug already exists: {payload.slug}')

        data = {
            'name': payload.name,
            'slug': payload.slug,
            'phone': payload.phone,
            'whatsapp': payload.whatsapp,
            'email': payload.email,
            'photo_url': payload.photo_url,
            'service_area': payload.service_area,
            'working_hours': payload.working_hours,
            'languages': payload.languages,
            'years_exp': payload.years_exp,
            'is_featured': payload.is_featured,
            'is_available': payload.is_available,
            'is_active': payload.is_active,
            'sort_order': payload.sort_order,
        }
        return await self.repo.create_technician(
            data=data,
            translations=payload.translations,
            media=payload.media,
            services=payload.services,
            district_ids=payload.districts,
        )

    async def update(self, technician_id: UUID, payload) -> Technician:
        technician = await self.repo.get_admin_by_id(technician_id)
        if not technician:
            raise NotFoundError('Technician', technician_id)

        updates = {}
        for field in (
            'name', 'slug', 'phone', 'whatsapp', 'email', 'photo_url',
            'service_area', 'working_hours', 'languages', 'years_exp',
            'is_featured', 'is_available', 'is_active', 'sort_order',
        ):
            if field in payload.model_fields_set:
                updates[field] = getattr(payload, field)

        if 'slug' in updates and updates['slug'] != technician.slug:
            if await self.repo.slug_exists(updates['slug'], exclude_id=technician_id):
                raise ValidationError(f'Technician slug already exists: {updates["slug"]}')

        technician = await self.repo.update_technician(technician, **updates)

        if payload.translations is not None:
            await self.repo.replace_translations(technician, payload.translations)
        if payload.media is not None:
            await self.repo.replace_media(technician, payload.media)
        if payload.services is not None:
            await self.repo.replace_services(technician, payload.services)
        if payload.districts is not None:
            await self.repo.set_districts(technician, payload.districts)

        return await self.repo.get_admin_by_id(technician_id)

    async def delete(self, technician_id: UUID):
        deleted = await self.repo.delete_technician(technician_id)
        if not deleted:
            raise NotFoundError('Technician', technician_id)
        return technician_id
