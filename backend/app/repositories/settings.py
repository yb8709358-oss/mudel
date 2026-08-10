from sqlalchemy import select

from app.models.settings import Setting
from app.repositories.base import BaseRepository


class SettingsRepository(BaseRepository):
    async def get_all(self) -> dict[str, str]:
        result = await self.db.execute(select(Setting))
        rows = result.scalars().all()
        return {row.key: row.value for row in rows}

    async def get_public(self, allowed_keys: set[str]) -> dict[str, str]:
        result = await self.db.execute(
            select(Setting).where(Setting.key.in_(sorted(allowed_keys)))
        )
        rows = result.scalars().all()
        return {row.key: row.value for row in rows}

    async def get_by_key(self, key: str) -> str | None:
        result = await self.db.execute(select(Setting).where(Setting.key == key))
        row = result.scalar_one_or_none()
        return row.value if row else None

    async def upsert(self, key: str, value: str):
        result = await self.db.execute(select(Setting).where(Setting.key == key))
        row = result.scalar_one_or_none()
        if row:
            row.value = value
        else:
            self.db.add(Setting(key=key, value=value))
        await self.db.flush()

    async def upsert_batch(self, items: dict[str, str]):
        for key, value in items.items():
            await self.upsert(key, value)
