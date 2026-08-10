from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_service_service, require_admin
from app.schemas.common import DataResponse, PaginatedServiceListOut, PaginationMeta
from app.schemas.service import ServiceAdminOut, ServiceCreate, ServiceUpdate
from app.services.service import ServiceService

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get('/services', response_model=PaginatedServiceListOut)
async def list_services(
    search: str | None = Query(None, max_length=100, description='Search by slug'),
    include_inactive: bool = Query(True, description='Include inactive services'),
    is_active: bool | None = Query(None, description='Filter by active status'),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service_service: ServiceService = Depends(get_service_service),
):
    services, total = await service_service.list_all(
        limit=limit,
        offset=offset,
        include_inactive=include_inactive,
        search=search,
        is_active=is_active,
    )
    return PaginatedServiceListOut(
        data=[ServiceAdminOut.model_validate(s) for s in services],
        meta=PaginationMeta(total=total, limit=limit, offset=offset),
    )


@router.post('/services', status_code=201, response_model=DataResponse)
async def create_service(
    body: ServiceCreate,
    service_service: ServiceService = Depends(get_service_service),
):
    service = await service_service.create(
        slug=body.slug,
        icon=body.icon,
        sort_order=body.sort_order,
        is_active=body.is_active,
        translations=body.translations,
        media=body.media,
    )
    return DataResponse(data=ServiceAdminOut.model_validate(service).model_dump())


@router.get('/services/{service_id}', response_model=DataResponse)
async def get_service(
    service_id: UUID,
    service_service: ServiceService = Depends(get_service_service),
):
    service = await service_service.get_by_id(service_id)
    return DataResponse(data=ServiceAdminOut.model_validate(service).model_dump())


@router.patch('/services/{service_id}', response_model=DataResponse)
async def update_service(
    service_id: UUID,
    body: ServiceUpdate,
    service_service: ServiceService = Depends(get_service_service),
):
    service = await service_service.update(service_id, body)
    return DataResponse(data=ServiceAdminOut.model_validate(service).model_dump())


@router.delete('/services/{service_id}', response_model=DataResponse)
async def delete_service(
    service_id: UUID,
    service_service: ServiceService = Depends(get_service_service),
):
    await service_service.delete(service_id)
    return DataResponse(data={'id': service_id, 'deleted': True})
