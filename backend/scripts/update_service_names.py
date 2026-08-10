"""Idempotent data fix: shorten display names for two services.

Only updates the `name` column of service_translations rows belonging to the
`electrician` and `cctv-surveillance` services (matched by stable slug). All
other fields (description, meta_title, meta_desc) and all relationships are
preserved. Safe to re-run.

Usage:
    python scripts/update_service_names.py
"""
import asyncio
import os
import re
import sys
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.core.config import settings

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.models.service import Service, ServiceTranslation


# slug -> {locale -> new display name}
NAME_UPDATES = {
    'electrician': {
        'en': 'Electrical Services',
        'fr': 'Électricité',
        'ar': 'الكهرباء',
    },
    'cctv-surveillance': {
        'en': 'CCTV & Surveillance',
        'fr': 'Caméras de surveillance',
        'ar': 'كاميرات المراقبة',
    },
}


async def update_names():
    database_url = settings.database_url.replace(
        "postgresql://",
        "postgresql+asyncpg://",
    )
    safe_url = re.sub(r'://([^:]+):[^@]+@', r'://\1:***@', database_url)
    print(f"Connecting to: {safe_url}")
    engine = create_async_engine(
        database_url,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid.uuid4().hex}__",
            "ssl": "require",
        },
    )
    session_factory = async_sessionmaker(engine, class_=AsyncSession)

    async with session_factory() as session:
        for slug, locales in NAME_UPDATES.items():
            result = await session.execute(select(Service).where(Service.slug == slug))
            service = result.scalars().first()
            if not service:
                print(f"SKIP: no service with slug '{slug}'")
                continue

            for locale, new_name in locales.items():
                result = await session.execute(
                    select(ServiceTranslation).where(
                        ServiceTranslation.service_id == service.id,
                        ServiceTranslation.locale == locale,
                    )
                )
                translation = result.scalars().first()
                if not translation:
                    print(f"SKIP: {slug}/{locale} has no translation row")
                    continue
                old_name = translation.name
                if old_name == new_name:
                    print(f"NOOP: {slug}/{locale} already '{new_name}'")
                    continue
                translation.name = new_name
                print(f"UPDATE: {slug}/{locale}: '{old_name}' -> '{new_name}'")

        await session.commit()
        print("Done.")

    await engine.dispose()


if __name__ == '__main__':
    asyncio.run(update_names())
