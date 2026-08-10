from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import selectinload

from app.models.district import District
from app.models.service import Service
from app.models.service_request import ServiceRequest
from app.repositories.base import BaseRepository


class ServiceRequestRepository(BaseRepository):
    _load_options = (
        selectinload(ServiceRequest.service).selectinload(Service.translations),
        selectinload(ServiceRequest.technician),
        selectinload(ServiceRequest.district).selectinload(District.translations),
    )

    async def create(self, **kwargs) -> ServiceRequest:
        request = ServiceRequest(**kwargs)
        self.db.add(request)
        await self.db.flush()
        return request

    async def get_by_id(self, request_id: str):
        query = (
            select(ServiceRequest)
            .options(*self._load_options)
            .where(ServiceRequest.id == request_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_all(
        self,
        status: str | None = None,
        limit: int = 20,
        offset: int = 0,
        search: str | None = None,
        sort: str = 'newest',
    ):
        order_by = (
            ServiceRequest.created_at.desc() if sort != 'oldest'
            else ServiceRequest.created_at.asc()
        )
        query = (
            select(ServiceRequest)
            .options(*self._load_options)
            .order_by(order_by)
        )
        count_query = select(func.count()).select_from(ServiceRequest)

        if status:
            query = query.where(ServiceRequest.status == status)
            count_query = count_query.where(ServiceRequest.status == status)

        if search:
            pattern = f'%{search}%'
            query = query.where(
                or_(
                    ServiceRequest.customer_name.ilike(pattern),
                    ServiceRequest.customer_phone.ilike(pattern),
                    ServiceRequest.customer_email.ilike(pattern),
                )
            )
            count_query = count_query.where(
                or_(
                    ServiceRequest.customer_name.ilike(pattern),
                    ServiceRequest.customer_phone.ilike(pattern),
                    ServiceRequest.customer_email.ilike(pattern),
                )
            )

        query = query.limit(limit).offset(offset)

        result = await self.db.execute(query)
        requests = result.scalars().unique().all()

        total = (await self.db.execute(count_query)).scalar()

        return requests, total

    async def update_status(self, request_id: str, status: str, admin_notes: str | None = None):
        request = await self.get_by_id(request_id)
        if not request:
            return None
        request.status = status
        if admin_notes is not None:
            request.admin_notes = admin_notes
        await self.db.flush()
        return await self.get_by_id(request_id)

    async def delete(self, request_id: str) -> bool:
        request = await self.get(ServiceRequest, request_id)
        if not request:
            return False
        await self.db.delete(request)
        await self.db.flush()
        return True

    async def bulk_update_status(self, ids: list, status: str) -> int:
        result = await self.db.execute(
            update(ServiceRequest)
            .where(ServiceRequest.id.in_(ids))
            .values(status=status)
        )
        await self.db.flush()
        return result.rowcount or 0

    async def bulk_delete(self, ids: list) -> int:
        result = await self.db.execute(
            delete(ServiceRequest).where(ServiceRequest.id.in_(ids))
        )
        await self.db.flush()
        return result.rowcount or 0

    async def count_by_status(self, status: str) -> int:
        return await self.count(ServiceRequest, filters=ServiceRequest.status == status)
