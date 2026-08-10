from fastapi import APIRouter, Depends, Query

from app.api.deps import get_district_service
from app.schemas.common import PaginatedDistrictListOut, PaginationMeta
from app.schemas.district import DistrictOut
from app.services.district import DistrictService

router = APIRouter()


@router.get('/districts', response_model=PaginatedDistrictListOut)
async def list_districts(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    district_service: DistrictService = Depends(get_district_service),
):
    districts, total = await district_service.list_active(limit=limit, offset=offset)
    return PaginatedDistrictListOut(
        data=[DistrictOut.model_validate(d) for d in districts],
        meta=PaginationMeta(total=total, limit=limit, offset=offset),
    )
