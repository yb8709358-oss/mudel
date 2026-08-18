import os

# Must be set before `app.main` is imported so pydantic-settings picks it up
# (env vars take precedence over the backend `.env` file). Keeps tests
# independent of the real ADMIN_API_SECRET and the real database. The fake
# postgres URL is never connected to — get_db is overridden below; it only
# needs to produce a parseable asyncpg-style engine at import time.
os.environ.setdefault('ADMIN_API_SECRET', 'test-admin-secret')
os.environ.setdefault('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')
# Pin the DB_* components to empty so a local backend/.env (e.g. DB_HOST=postgres)
# can never make tests build a URL against a real database. DATABASE_URL above
# is then used as-is, regardless of the local environment file.
os.environ.setdefault('DB_HOST', '')
os.environ.setdefault('DB_USER', '')
os.environ.setdefault('DB_PASSWORD', '')
os.environ.setdefault('DB_NAME', 'mudel')
# Force development mode so production validators don't reject the test DB URL.
os.environ.setdefault('ENVIRONMENT', 'development')
os.environ.setdefault('REDIS_URL', '')
# WhatsApp must be disabled during tests so no real API calls are made.
# Tests that need WhatsApp enabled override the dependency directly.
os.environ.setdefault('WHATSAPP_ENABLED', 'false')
os.environ.setdefault('WHATSAPP_ACCESS_TOKEN', '')
os.environ.setdefault('WHATSAPP_PHONE_NUMBER_ID', '')
os.environ.setdefault('WHATSAPP_VERIFY_TOKEN', '')
os.environ.setdefault('WHATSAPP_ADMIN_PHONE', '')

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.main import app
from app.models.base import Base

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
async def setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
