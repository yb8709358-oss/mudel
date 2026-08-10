from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter()


class HealthResponse(BaseModel):
    success: bool = True
    status: str


class ReadinessResponse(BaseModel):
    success: bool
    status: str
    database: str


@router.get('/health', response_model=HealthResponse)
async def liveness():
    return HealthResponse(success=True, status='ok')


@router.get('/health/ready', response_model=ReadinessResponse)
async def readiness(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text('SELECT 1'))
        return ReadinessResponse(success=True, status='ready', database='connected')
    except Exception:
        return ReadinessResponse(success=False, status='not_ready', database='disconnected')
