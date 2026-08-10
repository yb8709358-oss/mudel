import uuid

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models.contact import ContactMessage
from app.models.service import Service, ServiceTranslation

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"


async def _create_service() -> dict:
    engine = create_async_engine(TEST_DATABASE_URL)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        svc = Service(
            slug=f"svc-{uuid.uuid4().hex[:12]}",
            icon="wrench",
            sort_order=1,
            is_active=True,
        )
        session.add(svc)
        await session.flush()
        session.add(ServiceTranslation(service_id=svc.id, locale="fr", name="Plomberie"))
        service_id = str(svc.id)
        slug = svc.slug
        await session.commit()
        return {"id": service_id, "slug": slug}
    await engine.dispose()


async def _get_message_service_id(contact_id: str):
    engine = create_async_engine(TEST_DATABASE_URL)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        msg = await session.get(ContactMessage, uuid.UUID(contact_id))
        value = msg.service_id if msg else None
        await session.commit()
    await engine.dispose()
    return value


@pytest.mark.asyncio
async def test_submit_contact_invalid_phone(client):
    response = await client.post("/api/v1/contact", json={
        "name": "Test",
        "phone": "invalid",
        "service_id": str(uuid.uuid4()),
        "message": "Hello"
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_request_validation_error_envelope(client):
    response = await client.post("/api/v1/contact", json={
        "name": "Test",
        "phone": "invalid",
        "service_id": "not-a-uuid",
        "message": "Hello"
    })
    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert body["error"]["message"]
    assert isinstance(body["error"]["details"], list)
    assert body["error"]["details"]
    assert any("service_id" in detail for detail in body["error"]["details"])
    assert any("phone" in detail for detail in body["error"]["details"])


@pytest.mark.asyncio
async def test_submit_contact_valid(client):
    service = await _create_service()
    response = await client.post("/api/v1/contact", json={
        "name": "Test User",
        "phone": "+212612345678",
        "district": "Gueliz",
        "service_id": service["id"],
        "message": "Hello"
    })
    assert response.status_code == 201
    assert response.json()["success"] is True


@pytest.mark.asyncio
async def test_submit_contact_stores_service_id(client):
    service = await _create_service()
    response = await client.post("/api/v1/contact", json={
        "name": "Test User",
        "phone": "+212612345678",
        "district": "Gueliz",
        "service_id": service["id"],
        "message": "Hello"
    })
    assert response.status_code == 201
    stored = await _get_message_service_id(response.json()["data"]["id"])
    assert str(stored) == service["id"]


@pytest.mark.asyncio
async def test_submit_contact_missing_service_rejected(client):
    response = await client.post("/api/v1/contact", json={
        "name": "Test User",
        "phone": "+212612345678",
        "district": "Gueliz",
        "message": "Hello"
    })
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "CONTACT_SERVICE_REQUIRED"


@pytest.mark.asyncio
async def test_submit_contact_invalid_service_rejected(client):
    response = await client.post("/api/v1/contact", json={
        "name": "Test User",
        "phone": "+212612345678",
        "district": "Gueliz",
        "service_id": str(uuid.uuid4()),
        "message": "Hello"
    })
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "SERVICE_NOT_FOUND"


@pytest.mark.asyncio
async def test_existing_null_service_rows_remain_untouched(client):
    engine = create_async_engine(TEST_DATABASE_URL)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        msg = ContactMessage(
            name="Historical User",
            phone="+212612345678",
            district="Gueliz",
            service_id=None,
            message="Ancien message sans service",
        )
        session.add(msg)
        await session.commit()
        msg_id = msg.id
    await engine.dispose()

    engine = create_async_engine(TEST_DATABASE_URL)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        stored = await session.get(ContactMessage, msg_id)
        assert stored is not None
        assert stored.service_id is None
    await engine.dispose()
