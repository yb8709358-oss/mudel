from fastapi import APIRouter, Depends

from app.api.deps import get_settings_service, require_admin
from app.schemas.common import DataResponse
from app.schemas.settings import SettingsUpdate
from app.services.settings import SettingsService

router = APIRouter(dependencies=[Depends(require_admin)])


@router.put('/settings', response_model=DataResponse)
async def update_settings(
    body: SettingsUpdate,
    settings_service: SettingsService = Depends(get_settings_service),
):
    data = await settings_service.update_all(body.data)
    return DataResponse(data=data)
