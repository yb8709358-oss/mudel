from uuid import UUID

from app.core.exceptions import NotFoundError, ValidationError
from app.models.district import District
from app.models.service import Service
from app.models.technician import Technician
from app.repositories.service_request import ServiceRequestRepository


class ServiceRequestService:
    def __init__(self, repo: ServiceRequestRepository):
        self.repo = repo

    async def submit(
        self,
        service_id,
        customer_name: str,
        customer_phone: str,
        customer_email: str | None = None,
        technician_id=None,
        district_id=None,
        preferred_date=None,
        preferred_time: str | None = None,
        description: str | None = None,
    ):
        if not await self.repo.exists(Service, service_id):
            raise NotFoundError('Service', str(service_id))

        if technician_id and not await self.repo.exists(Technician, technician_id):
            raise NotFoundError('Technician', str(technician_id))

        if district_id and not await self.repo.exists(District, district_id):
            raise NotFoundError('District', str(district_id))

        return await self.repo.create(
            service_id=service_id,
            technician_id=technician_id,
            district_id=district_id,
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_email=customer_email,
            preferred_date=preferred_date,
            preferred_time=preferred_time,
            description=description,
        )

    async def get_by_id(self, request_id: UUID):
        request = await self.repo.get_by_id(request_id)
        if not request:
            raise NotFoundError('ServiceRequest', request_id)
        return request

    async def list_all(
        self,
        status: str | None = None,
        limit: int = 20,
        offset: int = 0,
        search: str | None = None,
        sort: str = 'newest',
    ):
        return await self.repo.list_all(
            status, limit=limit, offset=offset, search=search, sort=sort
        )

    async def bulk_action(self, ids: list, action: str, status: str | None = None) -> int:
        if action == 'delete':
            return await self.repo.bulk_delete(ids)
        if not status:
            raise ValidationError('Status is required for a bulk status update')
        return await self.repo.bulk_update_status(ids, status)

    async def update_status(self, request_id: UUID, status: str, admin_notes: str | None = None):
        request = await self.repo.update_status(request_id, status, admin_notes)
        if not request:
            raise NotFoundError('ServiceRequest', request_id)
        return request

    async def delete(self, request_id: UUID):
        deleted = await self.repo.delete(request_id)
        if not deleted:
            raise NotFoundError('ServiceRequest', request_id)
        return request_id
