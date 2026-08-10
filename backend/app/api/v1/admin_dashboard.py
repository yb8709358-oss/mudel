from fastapi import APIRouter, Depends

from app.api.deps import get_dashboard_service, require_admin
from app.schemas.common import DataResponse
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard import DashboardService

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get('/dashboard', response_model=DataResponse)
async def dashboard_summary(
    dashboard_service: DashboardService = Depends(get_dashboard_service),
):
    summary = await dashboard_service.summary()
    return DataResponse(data=DashboardSummary(**summary).model_dump())
