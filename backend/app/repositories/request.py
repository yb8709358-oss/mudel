from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.contact import ContactMessage
from app.models.service import Service
from app.models.service_request import ServiceRequest
from app.repositories.base import BaseRepository


class RequestRepository(BaseRepository):
    async def get_contact_by_token(self, token: str) -> ContactMessage | None:
        query = (
            select(ContactMessage)
            .options(selectinload(ContactMessage.service).selectinload(Service.translations))
            .where(ContactMessage.request_token == token)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_request(self, **kwargs) -> ServiceRequest:
        request = ServiceRequest(**kwargs)
        self.db.add(request)
        await self.db.flush()
        return request

    async def consume_token(self, contact: ContactMessage) -> None:
        contact.request_token_consumed_at = datetime.now(UTC)
        await self.db.flush()

    async def get_request_by_contact(self, contact_id) -> ServiceRequest | None:
        result = await self.db.execute(
            select(ServiceRequest).where(ServiceRequest.contact_message_id == contact_id)
        )
        return result.scalar_one_or_none()
