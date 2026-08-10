from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_service_request_service, require_admin
from app.schemas.common import DataResponse, PaginatedServiceRequestListOut, PaginationMeta
from app.schemas.service_request import (
    ServiceRequestBulkAction,
    ServiceRequestOut,
    ServiceRequestStatusUpdate,
)
from app.services.service_request import ServiceRequestService

router = APIRouter(dependencies=[Depends(require_admin)])


@router.post('/service-requests/bulk', response_model=DataResponse)
async def bulk_service_request_action(
    body: ServiceRequestBulkAction,
    sr_service: ServiceRequestService = Depends(get_service_request_service),
):
    processed = await sr_service.bulk_action(body.ids, body.action, body.status)
    return DataResponse(data={'processed': processed})


@router.get('/service-requests', response_model=PaginatedServiceRequestListOut)
async def list_service_requests(
    status: str | None = Query(None, max_length=20, description='Filter by status'),
    search: str | None = Query(None, max_length=100, description='Search by customer name, phone or email'),
    sort: Literal['newest', 'oldest'] = Query('newest', description='Sort by creation date'),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    sr_service: ServiceRequestService = Depends(get_service_request_service),
):
    requests, total = await sr_service.list_all(
        status, limit=limit, offset=offset, search=search, sort=sort
    )
    return PaginatedServiceRequestListOut(
        data=[ServiceRequestOut.model_validate(r) for r in requests],
        meta=PaginationMeta(total=total, limit=limit, offset=offset),
    )


@router.get('/service-requests/{request_id}', response_model=DataResponse)
async def get_service_request(
    request_id: UUID,
    sr_service: ServiceRequestService = Depends(get_service_request_service),
):
    request = await sr_service.get_by_id(request_id)
    return DataResponse(data=ServiceRequestOut.model_validate(request).model_dump())


@router.patch('/service-requests/{request_id}', response_model=DataResponse)
async def update_service_request_status(
    request_id: UUID,
    body: ServiceRequestStatusUpdate,
    sr_service: ServiceRequestService = Depends(get_service_request_service),
):
    request = await sr_service.update_status(request_id, body.status, body.admin_notes)
    return DataResponse(data=ServiceRequestOut.model_validate(request).model_dump())


@router.delete('/service-requests/{request_id}', response_model=DataResponse)
async def delete_service_request(
    request_id: UUID,
    sr_service: ServiceRequestService = Depends(get_service_request_service),
):
    await sr_service.delete(request_id)
    return DataResponse(data={'id': request_id, 'deleted': True})
