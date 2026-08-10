from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_district_service, require_admin
from app.schemas.common import DataResponse, PaginatedDistrictListOut, PaginationMeta
from app.schemas.district import DistrictAdminOut, DistrictCreate, DistrictUpdate
from app.services.district import DistrictService

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get('/districts', response_model=PaginatedDistrictListOut)
async def list_districts(
    search: str | None = Query(None, max_length=100, description='Search by slug'),
    include_inactive: bool = Query(True, description='Include inactive districts'),
    is_active: bool | None = Query(None, description='Filter by active status'),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    district_service: DistrictService = Depends(get_district_service),
):
    districts, total = await district_service.list_all(
        limit=limit,
        offset=offset,
        include_inactive=include_inactive,
        search=search,
        is_active=is_active,
    )
    return PaginatedDistrictListOut(
        data=[DistrictAdminOut.model_validate(d) for d in districts],
        meta=PaginationMeta(total=total, limit=limit, offset=offset),
    )


@router.post('/districts', status_code=201, response_model=DataResponse)
async def create_district(
    body: DistrictCreate,
    district_service: DistrictService = Depends(get_district_service),
):
    district = await district_service.create(
        slug=body.slug,
        sort_order=body.sort_order,
        is_active=body.is_active,
        translations=body.translations,
    )
    return DataResponse(data=DistrictAdminOut.model_validate(district).model_dump())


@router.get('/districts/{district_id}', response_model=DataResponse)
async def get_district(
    district_id: UUID,
    district_service: DistrictService = Depends(get_district_service),
):
    district = await district_service.get_by_id(district_id)
    return DataResponse(data=DistrictAdminOut.model_validate(district).model_dump())


@router.patch('/districts/{district_id}', response_model=DataResponse)
async def update_district(
    district_id: UUID,
    body: DistrictUpdate,
    district_service: DistrictService = Depends(get_district_service),
):
    district = await district_service.update(district_id, body)
    return DataResponse(data=DistrictAdminOut.model_validate(district).model_dump())


@router.delete('/districts/{district_id}', response_model=DataResponse)
async def delete_district(
    district_id: UUID,
    district_service: DistrictService = Depends(get_district_service),
):
    await district_service.delete(district_id)
    return DataResponse(data={'id': district_id, 'deleted': True})
