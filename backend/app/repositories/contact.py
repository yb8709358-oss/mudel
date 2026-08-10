import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.contact import ContactMessage
from app.repositories.base import BaseRepository


class ContactRepository(BaseRepository):
    async def create_message(self, name: str, phone: str, district: str, email: str | None = None,
                             service_id: str | None = None, message: str | None = None):
        msg = ContactMessage(
            name=name,
            phone=phone,
            district=district,
            email=email,
            service_id=service_id,
            message=message,
            request_token=secrets.token_urlsafe(32),
            request_token_expires_at=datetime.now(UTC)
            + timedelta(days=settings.request_token_ttl_days),
        )
        self.db.add(msg)
        await self.db.flush()
        return msg



    async def list_messages(
        self,
        limit: int = 20,
        offset: int = 0,
        is_read: bool | None = None,
        search: str | None = None,
        sort: str = "newest",
    ):
        query = select(ContactMessage).options(selectinload(ContactMessage.service_request))

        # فلترة حسب حالة القراءة
        if is_read is not None:
            query = query.where(ContactMessage.is_read == is_read)

        # البحث
        if search:
            term = f"%{search}%"
            query = query.where(
                or_(
                    ContactMessage.name.ilike(term),
                    ContactMessage.phone.ilike(term),
                    ContactMessage.email.ilike(term),
                    ContactMessage.district.ilike(term),
                )
            )

        # الترتيب
        if sort == "oldest":
            query = query.order_by(ContactMessage.created_at.asc())
        else:
            query = query.order_by(ContactMessage.created_at.desc())

        query = query.limit(limit).offset(offset)

        result = await self.db.execute(query)
        messages = result.scalars().all()

        # عدد النتائج
        count_query = select(func.count()).select_from(ContactMessage)

        if is_read is not None:
            count_query = count_query.where(ContactMessage.is_read == is_read)

        if search:
            term = f"%{search}%"
            count_query = count_query.where(
                or_(
                    ContactMessage.name.ilike(term),
                    ContactMessage.phone.ilike(term),
                    ContactMessage.email.ilike(term),
                    ContactMessage.district.ilike(term),
                )
            )

        total = (await self.db.execute(count_query)).scalar()

        return messages, total

    async def get_message(self, message_id):
        result = await self.db.execute(
            select(ContactMessage)
            .options(selectinload(ContactMessage.service_request))
            .where(ContactMessage.id == message_id)
        )
        return result.scalar_one_or_none()

    async def mark_read(self, message_id, is_read: bool):
        message = await self.get_message(message_id)
        if not message:
            return None
        message.is_read = is_read
        await self.db.flush()
        return message

    async def delete_message(self, message_id) -> bool:
        message = await self.get(ContactMessage, message_id)
        if not message:
            return False
        await self.db.delete(message)
        await self.db.flush()
        return True

    async def bulk_update_read(self, ids: list, is_read: bool) -> int:
        result = await self.db.execute(
            update(ContactMessage)
            .where(ContactMessage.id.in_(ids))
            .values(is_read=is_read)
        )
        await self.db.flush()
        return result.rowcount or 0

    async def bulk_delete(self, ids: list) -> int:
        result = await self.db.execute(
            delete(ContactMessage).where(ContactMessage.id.in_(ids))
        )
        await self.db.flush()
        return result.rowcount or 0
