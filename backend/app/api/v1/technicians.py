from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_technician_service
from app.schemas.common import DataResponse, PaginatedTechnicianListOut, PaginationMeta
from app.schemas.technician import TechnicianOut
from app.services.technician import TechnicianService

router = APIRouter()


@router.get('/technicians', response_model=PaginatedTechnicianListOut)
async def list_technicians(
    service: str | None = Query(None, max_length=100, description='Filter by service slug'),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    technician_service: TechnicianService = Depends(get_technician_service),
):
    techs, total = await technician_service.list_technicians(service, limit=limit, offset=offset)
    return PaginatedTechnicianListOut(
        data=[TechnicianOut.model_validate(t) for t in techs],
        meta=PaginationMeta(total=total, limit=limit, offset=offset),
    )


@router.get('/technicians/{technician_id}', response_model=DataResponse)
async def get_technician(
    technician_id: UUID,
    technician_service: TechnicianService = Depends(get_technician_service),
):
    tech = await technician_service.get_by_id(technician_id)
    return DataResponse(data=TechnicianOut.model_validate(tech).model_dump())
