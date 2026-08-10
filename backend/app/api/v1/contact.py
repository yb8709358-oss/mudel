from fastapi import APIRouter, Depends, Query, Request
from typing import Literal

from app.api.deps import get_contact_service, require_admin
from app.core.limiter import limiter
from app.schemas.common import PaginatedContactListOut, PaginationMeta
from app.schemas.contact import ContactCreate, ContactCreatedOut, ContactOut
from app.services.contact import ContactService

router = APIRouter()


@router.post('/contact', status_code=201, response_model=ContactCreatedOut)
@limiter.limit('10/minute')
async def submit_contact(
    request: Request,
    body: ContactCreate,
    contact_service: ContactService = Depends(get_contact_service),
):
    msg = await contact_service.submit_message(
        name=body.name,
        phone=body.phone,
        district=body.district,
        email=body.email,
        service_id=body.service_id,
        message=body.message,
    )
    return ContactCreatedOut(data={
        'id': str(msg.id),
        'message': 'Message sent successfully',
        'request_token': msg.request_token,
        'request_token_expires_at': (
            msg.request_token_expires_at.isoformat() if msg.request_token_expires_at else None
        ),
    })


@router.get('/contact', response_model=PaginatedContactListOut, dependencies=[Depends(require_admin)])
async def list_messages(
    is_read: bool | None = Query(None, description='Filter by read status'),
    search: str | None = Query(None, max_length=100, description='Search by name, phone, district or email'),
    sort: Literal['newest', 'oldest'] = Query('newest', description='Sort by creation date'),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    contact_service: ContactService = Depends(get_contact_service),
):
    messages, total = await contact_service.list_messages(
        limit=limit, offset=offset, is_read=is_read, search=search, sort=sort
    )
    return PaginatedContactListOut(
        data=[ContactOut.model_validate(m) for m in messages],
        meta=PaginationMeta(total=total, limit=limit, offset=offset),
    )
