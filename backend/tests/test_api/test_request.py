import re
import secrets
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.deps import get_storage_service
from app.core.limiter import limiter
from app.main import app
from app.models.contact import ContactMessage
from app.models.service import Service, ServiceTranslation
from app.services.storage import StorageService

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

ADMIN_HEADERS = {"X-Admin-Secret": "test-admin-secret"}


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    yield
    limiter.reset()


class FakeStorage:
    async def upload_image(self, content: bytes, content_type: str, object_path: str) -> str:
        return f"https://fake.supabase.co/storage/v1/object/public/request-images/{object_path}"


async def _create_service() -> dict:
    engine = create_async_engine(TEST_DATABASE_URL)
    async with async_sessionmaker(engine)() as session:
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


async def _create_contact(client, **overrides):
    if "service_id" not in overrides:
        overrides["service_id"] = (await _create_service())["id"]
    payload = {
        "name": "Karim Test",
        "phone": "+212612345678",
        "district": "Gueliz",
        "message": "Besoin d'un plombier",
        **overrides,
    }
    response = await client.post("/api/v1/contact", json=payload)
    assert response.status_code == 201
    return response.json()["data"]


async def _create_null_service_contact() -> str:
    """Insert a historical-style contact row with no service, bypassing the
    API (which now requires service_id for new submissions)."""
    engine = create_async_engine(TEST_DATABASE_URL)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        msg = ContactMessage(
            name="Karim Test",
            phone="+212612345678",
            district="Gueliz",
            message="Besoin d'un plombier",
            service_id=None,
            request_token=secrets.token_urlsafe(32),
            request_token_expires_at=datetime.now(UTC) + timedelta(days=7),
        )
        session.add(msg)
        await session.commit()
        token = msg.request_token
    await engine.dispose()
    return token


async def _expire_token(contact_id: str) -> None:
    engine = create_async_engine(TEST_DATABASE_URL)
    async with async_sessionmaker(engine)() as session:
        msg = await session.get(ContactMessage, uuid.UUID(contact_id))
        assert msg is not None
        msg.request_token_expires_at = datetime.now(UTC) - timedelta(days=1)
        await session.commit()
    await engine.dispose()


async def _create_district(client, slug: str | None = None) -> str:
    response = await client.post(
        "/api/v1/admin/districts",
        headers=ADMIN_HEADERS,
        json={
            "slug": slug or f"dist-{uuid.uuid4().hex[:12]}",
            "sort_order": 0,
            "is_active": True,
            "translations": [{"locale": "fr", "name": "Quartier Test"}],
        },
    )
    assert response.status_code == 201
    return response.json()["data"]["id"]


@pytest.mark.asyncio
async def test_contact_response_includes_request_token(client):
    data = await _create_contact(client)
    assert re.fullmatch(r"[A-Za-z0-9_-]{40,44}", data["request_token"])
    assert data["request_token_expires_at"] is not None


@pytest.mark.asyncio
async def test_get_request_access_available(client):
    service = await _create_service()
    data = await _create_contact(client, service_id=service["id"])
    response = await client.get(f"/api/v1/requests/{data['request_token']}")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["status"] == "available"
    assert body["data"]["request_number"] is None
    contact = body["data"]["contact"]
    assert contact["name"] == "Karim Test"
    assert contact["phone"] == "+212612345678"
    assert contact["district"] == "Gueliz"
    assert contact["service_name"] == "Plomberie"
    assert contact["service_slug"] == service["slug"]


@pytest.mark.asyncio
async def test_get_request_access_invalid_token(client):
    response = await client.get("/api/v1/requests/not-a-real-token")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "REQUEST_NOT_FOUND"


@pytest.mark.asyncio
async def test_submit_request_valid(client):
    service_id = (await _create_service())["id"]
    data = await _create_contact(client, service_id=service_id)
    response = await client.post(
        f"/api/v1/requests/{data['request_token']}",
        json={
            "address": "12 Rue de la Liberté, Gueliz",
            "latitude": 31.6295,
            "longitude": -8.0089,
            "description": "Fuite d'eau sous l'évier de la cuisine",
            "preferred_date": "2026-08-15",
            "preferred_time": "09:30",
            "attachments": ["https://fake.supabase.co/storage/v1/object/public/request-images/a.jpg"],
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    assert re.fullmatch(r"REQ-\d{4}-[0-9A-F]{16}", body["data"]["request_number"])

    access = (await client.get(f"/api/v1/requests/{data['request_token']}")).json()["data"]
    assert access["status"] == "consumed"
    assert access["request_number"] == body["data"]["request_number"]


@pytest.mark.asyncio
async def test_submit_request_rejects_consumed_token(client):
    service_id = (await _create_service())["id"]
    data = await _create_contact(client, service_id=service_id)
    payload = {
        "address": "12 Rue de la Liberté, Gueliz",
        "description": "Fuite d'eau",
        "preferred_date": "2026-08-15",
        "preferred_time": "09:30",
    }
    first = await client.post(f"/api/v1/requests/{data['request_token']}", json=payload)
    assert first.status_code == 201

    second = await client.post(f"/api/v1/requests/{data['request_token']}", json=payload)
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "TOKEN_CONSUMED"


@pytest.mark.asyncio
async def test_submit_request_rejects_expired_token(client):
    data = await _create_contact(client)
    await _expire_token(data["id"])

    access = await client.get(f"/api/v1/requests/{data['request_token']}")
    assert access.status_code == 200
    assert access.json()["data"]["status"] == "expired"

    submit = await client.post(
        f"/api/v1/requests/{data['request_token']}",
        json={
            "address": "12 Rue de la Liberté, Gueliz",
            "description": "Fuite d'eau",
            "preferred_date": "2026-08-15",
            "preferred_time": "09:30",
        },
    )
    assert submit.status_code == 410
    assert submit.json()["error"]["code"] == "TOKEN_EXPIRED"


@pytest.mark.asyncio
async def test_submit_request_validation_error(client):
    data = await _create_contact(client)
    response = await client.post(
        f"/api/v1/requests/{data['request_token']}",
        json={"preferred_date": "2026-08-15", "preferred_time": "09:30"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_submit_request_contact_no_service(client):
    token = await _create_null_service_contact()
    response = await client.post(
        f"/api/v1/requests/{token}",
        json={
            "address": "12 Rue de la Liberté, Gueliz",
            "description": "Fuite d'eau",
            "preferred_date": "2026-08-15",
            "preferred_time": "09:30",
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "CONTACT_NO_SERVICE"


@pytest.mark.asyncio
async def test_upload_images_not_configured(client):
    app.dependency_overrides[get_storage_service] = lambda: StorageService(
        project_url="", service_role_key=""
    )
    try:
        data = await _create_contact(client)
        files = {"files": ("photo.jpg", b"\xff\xd8\xff\xe0fakejpegdata", "image/jpeg")}
        response = await client.post(
            f"/api/v1/requests/{data['request_token']}/images", files=files
        )
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "STORAGE_NOT_CONFIGURED"
    finally:
        app.dependency_overrides.pop(get_storage_service, None)


@pytest.mark.asyncio
async def test_upload_images_success_does_not_consume_token(client):
    app.dependency_overrides[get_storage_service] = lambda: FakeStorage()
    try:
        data = await _create_contact(client)
        files = {"files": ("photo.jpg", b"\xff\xd8\xff\xe0fakejpegdata", "image/jpeg")}
        response = await client.post(
            f"/api/v1/requests/{data['request_token']}/images", files=files
        )
        assert response.status_code == 200
        urls = response.json()["data"]["urls"]
        assert len(urls) == 1
        assert urls[0].startswith("https://fake.supabase.co/storage/v1/object/public/request-images/requests/")

        access = (await client.get(f"/api/v1/requests/{data['request_token']}")).json()["data"]
        assert access["status"] == "available"
    finally:
        app.dependency_overrides.pop(get_storage_service, None)


@pytest.mark.asyncio
async def test_upload_images_rejects_unsupported_type(client):
    app.dependency_overrides[get_storage_service] = lambda: FakeStorage()
    try:
        data = await _create_contact(client)
        files = {"files": ("note.txt", b"hello", "text/plain")}
        response = await client.post(
            f"/api/v1/requests/{data['request_token']}/images", files=files
        )
        assert response.status_code == 422
    finally:
        app.dependency_overrides.pop(get_storage_service, None)


@pytest.mark.asyncio
async def test_upload_images_rejects_too_many(client):
    data = await _create_contact(client)
    files = [
        ("files", (f"photo{i}.jpg", b"\xff\xd8\xff\xe0fakejpegdata", "image/jpeg"))
        for i in range(6)
    ]
    response = await client.post(
        f"/api/v1/requests/{data['request_token']}/images", files=files
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_upload_images_rejects_oversized(client):
    data = await _create_contact(client)
    oversized = b"\xff\xd8\xff\xe0" + (b"x" * (5 * 1024 * 1024))
    files = {"files": ("photo.jpg", oversized, "image/jpeg")}
    response = await client.post(
        f"/api/v1/requests/{data['request_token']}/images", files=files
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_admin_list_includes_completed_request(client):
    service_id = (await _create_service())["id"]
    data = await _create_contact(client, service_id=service_id)
    await client.post(
        f"/api/v1/requests/{data['request_token']}",
        json={
            "address": "12 Rue de la Liberté, Gueliz",
            "latitude": 31.6295,
            "longitude": -8.0089,
            "description": "Fuite d'eau sous l'évier de la cuisine",
            "preferred_date": "2026-08-15",
            "preferred_time": "09:30",
            "attachments": ["https://fake.supabase.co/storage/v1/object/public/request-images/a.jpg"],
        },
    )

    response = await client.get(
        "/api/v1/admin/service-requests",
        headers={"X-Admin-Secret": "test-admin-secret"},
    )
    assert response.status_code == 200
    items = response.json()["data"]
    assert len(items) == 1
    created = items[0]
    assert created["request_number"].startswith("REQ-")
    assert created["status"] == "pending"
    assert created["address"] == "12 Rue de la Liberté, Gueliz"
    assert created["latitude"] == 31.6295
    assert created["longitude"] == -8.0089
    assert created["service_id"] == service_id
    assert created["contact_message_id"] == data["id"]
    assert created["attachments"] == [
        "https://fake.supabase.co/storage/v1/object/public/request-images/a.jpg"
    ]

    forbidden = {"gps_latitude", "gps_longitude", "images", "district_name", "additional_notes"}
    assert forbidden.isdisjoint(created.keys())


@pytest.mark.asyncio
async def test_submit_request_persists_district_id(client):
    service_id = (await _create_service())["id"]
    district_id = await _create_district(client)
    data = await _create_contact(client, service_id=service_id)
    response = await client.post(
        f"/api/v1/requests/{data['request_token']}",
        json={
            "address": "12 Rue de la Liberté, Gueliz",
            "district_id": district_id,
            "description": "Fuite d'eau sous l'évier de la cuisine",
            "preferred_date": "2026-08-15",
            "preferred_time": "09:30",
        },
    )
    assert response.status_code == 201

    listed = await client.get("/api/v1/admin/service-requests", headers=ADMIN_HEADERS)
    assert listed.status_code == 200
    created = listed.json()["data"][0]
    assert created["district_id"] == district_id
    assert created["district"]["slug"].startswith("dist-")
    assert created["district"]["translations"][0]["name"] == "Quartier Test"


@pytest.mark.asyncio
async def test_submit_request_rejects_unknown_district(client):
    service_id = (await _create_service())["id"]
    data = await _create_contact(client, service_id=service_id)
    response = await client.post(
        f"/api/v1/requests/{data['request_token']}",
        json={
            "address": "12 Rue de la Liberté, Gueliz",
            "district_id": str(uuid.uuid4()),
            "description": "Fuite d'eau sous l'évier de la cuisine",
            "preferred_date": "2026-08-15",
            "preferred_time": "09:30",
        },
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "DISTRICT_NOT_FOUND"
