from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_technician_service, require_admin
from app.schemas.common import DataResponse, PaginatedTechnicianListOut, PaginationMeta
from app.schemas.technician import TechnicianAdminOut, TechnicianCreate, TechnicianUpdate
from app.services.technician import TechnicianService

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get('/technicians', response_model=PaginatedTechnicianListOut)
async def list_technicians(
    search: str | None = Query(None, max_length=100, description='Search by name, slug or phone'),
    service: str | None = Query(None, max_length=100, description='Filter by service slug'),
    include_inactive: bool = Query(True, description='Include inactive technicians'),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    technician_service: TechnicianService = Depends(get_technician_service),
):
    techs, total = await technician_service.list_all(
        limit=limit,
        offset=offset,
        include_inactive=include_inactive,
        search=search,
        service_slug=service,
    )
    return PaginatedTechnicianListOut(
        data=[TechnicianAdminOut.model_validate(t) for t in techs],
        meta=PaginationMeta(total=total, limit=limit, offset=offset),
    )


@router.post('/technicians', status_code=201, response_model=DataResponse)
async def create_technician(
    body: TechnicianCreate,
    technician_service: TechnicianService = Depends(get_technician_service),
):
    technician = await technician_service.create(body)
    return DataResponse(data=TechnicianAdminOut.model_validate(technician).model_dump())


@router.get('/technicians/{technician_id}', response_model=DataResponse)
async def get_technician(
    technician_id: UUID,
    technician_service: TechnicianService = Depends(get_technician_service),
):
    technician = await technician_service.get_admin_by_id(technician_id)
    return DataResponse(data=TechnicianAdminOut.model_validate(technician).model_dump())


@router.patch('/technicians/{technician_id}', response_model=DataResponse)
async def update_technician(
    technician_id: UUID,
    body: TechnicianUpdate,
    technician_service: TechnicianService = Depends(get_technician_service),
):
    technician = await technician_service.update(technician_id, body)
    return DataResponse(data=TechnicianAdminOut.model_validate(technician).model_dump())


@router.delete('/technicians/{technician_id}', response_model=DataResponse)
async def delete_technician(
    technician_id: UUID,
    technician_service: TechnicianService = Depends(get_technician_service),
):
    await technician_service.delete(technician_id)
    return DataResponse(data={'id': technician_id, 'deleted': True})
