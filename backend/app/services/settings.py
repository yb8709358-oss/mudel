from app.repositories.settings import SettingsRepository
from app.schemas.settings import ALLOWED_SETTINGS_KEYS


class SettingsService:
    def __init__(self, repo: SettingsRepository):
        self.repo = repo

    async def get_all(self) -> dict[str, str]:
        return await self.repo.get_all()

    async def get_public(self) -> dict[str, str]:
        return await self.repo.get_public(ALLOWED_SETTINGS_KEYS)

    async def update_all(self, data: dict[str, str]) -> dict[str, str]:
        await self.repo.upsert_batch(data)
        return await self.repo.get_all()
