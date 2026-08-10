import asyncio
import sys
import uuid
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context

# ---------------------------------------------------------------------------
# Alembic Config object
# ---------------------------------------------------------------------------
config = context.config

# ---------------------------------------------------------------------------
# Fix Issue 1: Add the backend directory to sys.path so 'app' is importable
# regardless of the current working directory.
#
# This file lives at  <project>/backend/alembic/env.py
# parents[1]         = <project>/backend/
# ---------------------------------------------------------------------------
_backend_dir = str(Path(__file__).resolve().parents[1])
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from app.core.config import settings  # noqa: E402
from app.models import Base  # noqa: E402, F401 — triggers all model registrations

# ---------------------------------------------------------------------------
# Fix Issue 2: Override sqlalchemy.url with the DATABASE_URL from the app's
# Settings (which reads from environment variables / .env).
#
# The config stores the URL as postgresql://  (asyncpg driver is added here
# and in app/core/database.py identically).
# ---------------------------------------------------------------------------
_db_url = settings.database_url.replace('postgresql://', 'postgresql+asyncpg://')
config.set_main_option(
    "sqlalchemy.url",
    _db_url.replace("%", "%%")
)

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — generate SQL without a live connection."""
    url = config.get_main_option('sqlalchemy.url')
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={'paramstyle': 'named'},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode via an async engine."""
    connectable = create_async_engine(
        _db_url,
        poolclass=pool.NullPool,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid.uuid4().hex}__",
            "ssl": "prefer",
        },
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

