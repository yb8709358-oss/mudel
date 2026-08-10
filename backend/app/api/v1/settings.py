from fastapi import APIRouter, Depends

from app.api.deps import get_settings_service
from app.schemas.settings import SettingsMapOut
from app.services.settings import SettingsService

router = APIRouter()


@router.get('/settings', response_model=SettingsMapOut)
async def get_settings(
    settings_service: SettingsService = Depends(get_settings_service),
):
    data = await settings_service.get_public()
    return SettingsMapOut(data=data)
