from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import get_contact_service, require_admin
from app.schemas.common import DataResponse
from app.schemas.contact import ContactBulkAction, ContactOut, ContactReadUpdate
from app.services.contact import ContactService

router = APIRouter(dependencies=[Depends(require_admin)])


@router.post('/contact/bulk', response_model=DataResponse)
async def bulk_message_action(
    body: ContactBulkAction,
    contact_service: ContactService = Depends(get_contact_service),
):
    processed = await contact_service.bulk_action(body.ids, body.action)
    return DataResponse(data={'processed': processed})


@router.get('/contact/{message_id}', response_model=DataResponse)
async def get_message(
    message_id: UUID,
    contact_service: ContactService = Depends(get_contact_service),
):
    message = await contact_service.get_message(message_id)
    return DataResponse(data=ContactOut.model_validate(message).model_dump())


@router.patch('/contact/{message_id}', response_model=DataResponse)
async def mark_message_read(
    message_id: UUID,
    body: ContactReadUpdate,
    contact_service: ContactService = Depends(get_contact_service),
):
    message = await contact_service.mark_read(message_id, body.is_read)
    return DataResponse(data=ContactOut.model_validate(message).model_dump())


@router.delete('/contact/{message_id}', response_model=DataResponse)
async def delete_message(
    message_id: UUID,
    contact_service: ContactService = Depends(get_contact_service),
):
    await contact_service.delete_message(message_id)
    return DataResponse(data={'id': message_id, 'deleted': True})
