from fastapi import APIRouter, Depends, Query

from app.api.deps import get_service_service
from app.schemas.common import DataResponse, PaginatedServiceListOut, PaginationMeta
from app.schemas.service import ServiceOut
from app.services.service import ServiceService

router = APIRouter()


@router.get('/services', response_model=PaginatedServiceListOut)
async def list_services(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service_service: ServiceService = Depends(get_service_service),
):
    services, total = await service_service.list_services(limit=limit, offset=offset)
    return PaginatedServiceListOut(
        data=[ServiceOut.model_validate(s) for s in services],
        meta=PaginationMeta(total=total, limit=limit, offset=offset),
    )


@router.get('/services/{slug}', response_model=DataResponse)
async def get_service(
    slug: str,
    service_service: ServiceService = Depends(get_service_service),
):
    service = await service_service.get_by_slug(slug)
    return DataResponse(data=ServiceOut.model_validate(service).model_dump())
