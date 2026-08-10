from uuid import UUID

from app.core.exceptions import AppError, NotFoundError
from app.models.service import Service
from app.repositories.contact import ContactRepository


class ContactService:
    def __init__(self, repo: ContactRepository):
        self.repo = repo

    async def submit_message(self, name: str, phone: str, district: str, email: str | None = None,
                             service_id: str | None = None, message: str | None = None):
        if service_id is None:
            raise AppError(
                code='CONTACT_SERVICE_REQUIRED',
                message='A service must be selected when submitting a contact message.',
                status_code=422,
            )
        if not await self.repo.exists(Service, service_id):
            raise NotFoundError('Service', str(service_id))
        return await self.repo.create_message(
            name=name,
            phone=phone,
            district=district,
            email=email,
            service_id=service_id,
            message=message,
        )

    async def list_messages(
    self,
    limit: int = 20,
    offset: int = 0,
    is_read: bool | None = None,
    search: str | None = None,
    sort: str = "newest",
):
     return await self.repo.list_messages(
        limit=limit,
        offset=offset,
        is_read=is_read,
        search=search,
        sort=sort,
    )

    async def get_message(self, message_id: UUID):
        message = await self.repo.get_message(message_id)
        if not message:
            raise NotFoundError('ContactMessage', message_id)
        return message

    async def mark_read(self, message_id: UUID, is_read: bool):
        message = await self.repo.mark_read(message_id, is_read)
        if not message:
            raise NotFoundError('ContactMessage', message_id)
        return message

    async def delete_message(self, message_id: UUID):
        deleted = await self.repo.delete_message(message_id)
        if not deleted:
            raise NotFoundError('ContactMessage', message_id)
        return message_id

    async def bulk_action(self, ids: list, action: str) -> int:
        if action == 'delete':
            return await self.repo.bulk_delete(ids)
        return await self.repo.bulk_update_read(ids, action == 'mark_read')
