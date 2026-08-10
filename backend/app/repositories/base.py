from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


class BaseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, model, id: str):
        result = await self.db.execute(select(model).where(model.id == id))
        return result.scalar_one_or_none()

    async def exists(self, model, id_value) -> bool:
        result = await self.db.execute(select(func.count()).select_from(model).where(model.id == id_value))
        return result.scalar() > 0

    async def count(self, model, filters=None):
        query = select(func.count()).select_from(model)
        if filters is not None:
            query = query.where(filters)
        result = await self.db.execute(query)
        return result.scalar()

    async def list(self, model, order_by=None, limit=20, offset=0, filters=None):
        query = select(model)
        if filters is not None:
            query = query.where(filters)
        if order_by:
            query = query.order_by(order_by)
        query = query.limit(limit).offset(offset)
        result = await self.db.execute(query)
        return result.scalars().all()
