import asyncio
from uuid import UUID

import pytest

from app.models.service_request import ServiceRequest
from app.schemas.common import normalize_attachments
from tests.conftest import TestSessionLocal

ADMIN_HEADERS = {"X-Admin-Secret": "test-admin-secret"}


async def _create_service(client, slug="plomberie", name="Plomberie"):
    return await client.post("/api/v1/admin/services", headers=ADMIN_HEADERS, json={
        "slug": slug,
        "icon": "wrench",
        "sort_order": 0,
        "is_active": True,
        "translations": [{"locale": "fr", "name": name, "description": "Test"}],
        "media": [],
    })


@pytest.mark.asyncio
async def test_admin_requires_secret(client):
    response = await client.get("/api/v1/admin/services")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_wrong_secret(client):
    response = await client.get("/api/v1/admin/services", headers={"X-Admin-Secret": "nope"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_service_crud(client):
    response = await _create_service(client)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["slug"] == "plomberie"
    assert data["is_active"] is True
    service_id = data["id"]

    response = await client.get("/api/v1/admin/services", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    assert response.json()["data"][0]["id"] == service_id

    response = await client.get(f"/api/v1/admin/services/{service_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    assert response.json()["data"]["translations"][0]["name"] == "Plomberie"

    response = await client.patch(
        f"/api/v1/admin/services/{service_id}",
        headers=ADMIN_HEADERS,
        json={"icon": "droplet", "is_active": False},
    )
    assert response.status_code == 200
    assert response.json()["data"]["icon"] == "droplet"
    assert response.json()["data"]["is_active"] is False

    response = await client.delete(f"/api/v1/admin/services/{service_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 200

    response = await client.get(f"/api/v1/admin/services/{service_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_admin_service_crud_with_media(client):
    response = await _create_service(client, slug="plomberie-media")
    assert response.status_code == 201
    data = response.json()["data"]
    service_id = data["id"]
    assert len(data["media"]) == 0

    response = await client.patch(
        f"/api/v1/admin/services/{service_id}",
        headers=ADMIN_HEADERS,
        json={"media": [{"url": "https://images.unsplash.com/photo-svc.jpg", "caption": "Hero", "sort_order": 0}]},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["media"]) == 1
    assert data["media"][0]["url"] == "https://images.unsplash.com/photo-svc.jpg"
    assert data["media"][0]["caption"] == "Hero"

    response = await client.patch(
        f"/api/v1/admin/services/{service_id}",
        headers=ADMIN_HEADERS,
        json={"media": []},
    )
    assert response.status_code == 200
    assert response.json()["data"]["media"] == []

    response = await client.delete(f"/api/v1/admin/services/{service_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_admin_service_duplicate_slug(client):
    assert (await _create_service(client)).status_code == 201
    response = await _create_service(client, slug="plomberie", name="Duplicated")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_inactive_service_hidden_from_public(client):
    first = await _create_service(client)
    service_id = first.json()["data"]["id"]
    await _create_service(client, slug="electricite", name="Electricite")

    response = await client.patch(
        f"/api/v1/admin/services/{service_id}",
        headers=ADMIN_HEADERS,
        json={"is_active": False},
    )
    assert response.status_code == 200

    response = await client.get("/api/v1/services")
    assert response.status_code == 200
    slugs = [s["slug"] for s in response.json()["data"]]
    assert "electricite" in slugs
    assert "plomberie" not in slugs


@pytest.mark.asyncio
async def test_admin_district_crud(client):
    response = await client.post("/api/v1/admin/districts", headers=ADMIN_HEADERS, json={
        "slug": "gueliz",
        "sort_order": 0,
        "is_active": True,
        "translations": [{"locale": "fr", "name": "Gueliz", "description": "Centre ville"}],
    })
    assert response.status_code == 201
    district_id = response.json()["data"]["id"]

    response = await client.patch(
        f"/api/v1/admin/districts/{district_id}",
        headers=ADMIN_HEADERS,
        json={"is_active": False},
    )
    assert response.status_code == 200
    assert response.json()["data"]["is_active"] is False

    response = await client.delete(f"/api/v1/admin/districts/{district_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    response = await client.get(f"/api/v1/admin/districts/{district_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_admin_district_duplicate_slug(client):
    payload = {
        "slug": "gueliz",
        "sort_order": 0,
        "is_active": True,
        "translations": [{"locale": "fr", "name": "Gueliz"}],
    }
    assert (await client.post("/api/v1/admin/districts", headers=ADMIN_HEADERS, json=payload)).status_code == 201
    response = await client.post("/api/v1/admin/districts", headers=ADMIN_HEADERS, json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_admin_technician_crud(client):
    response = await client.post("/api/v1/admin/technicians", headers=ADMIN_HEADERS, json={
        "name": "Karim Benali",
        "slug": "karim-benali",
        "phone": "0612345678",
        "translations": [{"locale": "fr", "bio": "Plombier expérimenté"}],
        "media": [],
        "services": [],
        "districts": [],
    })
    assert response.status_code == 201
    technician_id = response.json()["data"]["id"]
    assert response.json()["data"]["name"] == "Karim Benali"

    response = await client.patch(
        f"/api/v1/admin/technicians/{technician_id}",
        headers=ADMIN_HEADERS,
        json={"is_featured": True, "years_exp": 12},
    )
    assert response.status_code == 200
    assert response.json()["data"]["is_featured"] is True
    assert response.json()["data"]["years_exp"] == 12

    response = await client.get("/api/v1/admin/technicians?search=Karim", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    assert response.json()["data"][0]["id"] == technician_id

    response = await client.delete(f"/api/v1/admin/technicians/{technician_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    response = await client.get(f"/api/v1/admin/technicians/{technician_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_admin_technician_patch_rejects_disallowed_image_urls(client):
    response = await client.post("/api/v1/admin/technicians", headers=ADMIN_HEADERS, json={
        "name": "URL Tech",
        "slug": "url-tech",
        "phone": "0611111111",
        "translations": [],
        "media": [],
        "services": [],
        "districts": [],
    })
    assert response.status_code == 201
    technician_id = response.json()["data"]["id"]

    response = await client.patch(
        f"/api/v1/admin/technicians/{technician_id}",
        headers=ADMIN_HEADERS,
        json={"photo_url": "https://somosfanaticos.fans/not-allowed.png"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert any("photo_url" in detail for detail in response.json()["error"]["details"])

    response = await client.patch(
        f"/api/v1/admin/technicians/{technician_id}",
        headers=ADMIN_HEADERS,
        json={"media": [{"url": "https://evil.example.com/x.png", "media_type": "image", "sort_order": 0}]},
    )
    assert response.status_code == 422
    assert any("url" in detail for detail in response.json()["error"]["details"])

    response = await client.patch(
        f"/api/v1/admin/technicians/{technician_id}",
        headers=ADMIN_HEADERS,
        json={"media": [{"url": "https://images.unsplash.com/ok.png", "media_type": "image", "sort_order": 0}]},
    )
    assert response.status_code == 200

    response = await client.delete(f"/api/v1/admin/technicians/{technician_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_admin_technician_crud_with_media(client):
    response = await client.post("/api/v1/admin/technicians", headers=ADMIN_HEADERS, json={
        "name": "Media Tech",
        "slug": "media-tech",
        "phone": "0699999999",
        "translations": [],
            "media": [
                {"url": "https://images.unsplash.com/photo1.jpg", "caption": "Workshop", "media_type": "image", "sort_order": 1},
                {"url": "https://images.unsplash.com/photo2.jpg", "sort_order": 2},
            ],
            "services": [],
            "districts": [],
        })
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["slug"] == "media-tech"
    assert len(data["media"]) == 2
    assert data["media"][0]["url"] == "https://images.unsplash.com/photo1.jpg"
    assert data["media"][0]["caption"] == "Workshop"
    assert data["media"][1]["url"] == "https://images.unsplash.com/photo2.jpg"
    technician_id = data["id"]

    response = await client.patch(
        f"/api/v1/admin/technicians/{technician_id}",
        headers=ADMIN_HEADERS,
        json={"media": [{"url": "https://images.unsplash.com/photo-new.jpg", "sort_order": 0}]},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["media"]) == 1
    assert data["media"][0]["url"] == "https://images.unsplash.com/photo-new.jpg"

    response = await client.delete(f"/api/v1/admin/technicians/{technician_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_admin_technician_clears_explicit_null_fields(client):
    response = await client.post("/api/v1/admin/technicians", headers=ADMIN_HEADERS, json={
        "name": "Clear Tech",
        "slug": "clear-tech",
        "phone": "0611111111",
        "whatsapp": "0600000000",
        "email": "clear@example.com",
        "photo_url": "https://images.unsplash.com/photo-ok.jpg",
        "years_exp": 7,
        "translations": [],
        "media": [],
        "services": [],
        "districts": [],
    })
    assert response.status_code == 201
    technician_id = response.json()["data"]["id"]

    response = await client.patch(
        f"/api/v1/admin/technicians/{technician_id}",
        headers=ADMIN_HEADERS,
        json={"photo_url": None, "whatsapp": None, "email": None, "years_exp": None},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["photo_url"] is None
    assert data["whatsapp"] is None
    assert data["email"] is None
    assert data["years_exp"] is None

    response = await client.patch(
        f"/api/v1/admin/technicians/{technician_id}",
        headers=ADMIN_HEADERS,
        json={"name": "Clear Tech Renamed"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["name"] == "Clear Tech Renamed"
    assert data["phone"] == "0611111111"

    response = await client.delete(f"/api/v1/admin/technicians/{technician_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_admin_technician_links_service_and_district(client):
    await _create_service(client)
    service_id = (await client.get("/api/v1/admin/services", headers=ADMIN_HEADERS)).json()["data"][0]["id"]
    district_id = (await client.post("/api/v1/admin/districts", headers=ADMIN_HEADERS, json={
        "slug": "medina",
        "sort_order": 1,
        "is_active": True,
        "translations": [{"locale": "fr", "name": "Médina"}],
    })).json()["data"]["id"]

    response = await client.post("/api/v1/admin/technicians", headers=ADMIN_HEADERS, json={
        "name": "Sara Alami",
        "slug": "sara-alami",
        "phone": "0611111111",
        "services": [{"service_id": service_id, "estimated_price_min": 200, "estimated_price_max": 500}],
        "districts": [district_id],
        "translations": [],
        "media": [],
    })
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["services"][0]["service_id"] == service_id
    assert data["districts"][0]["id"] == district_id


@pytest.mark.asyncio
async def test_admin_contact_mark_read_and_delete(client):
    service_id = (await _create_service(client)).json()["data"]["id"]
    response = await client.post("/api/v1/contact", json={
        "name": "Test User",
        "phone": "+212612345678",
        "district": "Gueliz",
        "service_id": service_id,
        "message": "Hello",
    })
    assert response.status_code == 201
    message_id = response.json()["data"]["id"]

    response = await client.get("/api/v1/contact", headers=ADMIN_HEADERS)
    assert response.json()["data"][0]["is_read"] is False

    response = await client.patch(
        f"/api/v1/admin/contact/{message_id}",
        headers=ADMIN_HEADERS,
        json={"is_read": True},
    )
    assert response.status_code == 200
    assert response.json()["data"]["is_read"] is True

    response = await client.get("/api/v1/contact?is_read=false", headers=ADMIN_HEADERS)
    assert response.json()["data"] == []

    response = await client.get(f"/api/v1/admin/contact/{message_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 200

    response = await client.delete(f"/api/v1/admin/contact/{message_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    response = await client.get(f"/api/v1/admin/contact/{message_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_admin_settings_update(client):
    response = await client.put("/api/v1/admin/settings", headers=ADMIN_HEADERS, json={
        "data": {"site_name": "Mudel", "contact_phone": "0522123456"},
    })
    assert response.status_code == 200
    assert response.json()["data"]["site_name"] == "Mudel"

    response = await client.put("/api/v1/admin/settings", headers=ADMIN_HEADERS, json={
        "data": {"unknown_key": "nope"},
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_admin_service_request_search_and_delete(client):
    await _create_service(client)
    service_id = (await client.get("/api/v1/admin/services", headers=ADMIN_HEADERS)).json()["data"][0]["id"]

    response = await client.post("/api/v1/service-requests", json={
        "customer_name": "Alice Martin",
        "customer_phone": "+212612345678",
        "service_id": service_id,
    })
    assert response.status_code == 201
    request_id = response.json()["data"]["id"]

    response = await client.get("/api/v1/admin/service-requests?search=Alice", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    assert response.json()["data"][0]["id"] == request_id

    response = await client.delete(f"/api/v1/admin/service-requests/{request_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    response = await client.get(f"/api/v1/admin/service-requests/{request_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_admin_service_request_nested_data(client):
    await _create_service(client)
    service_id = (await client.get("/api/v1/admin/services", headers=ADMIN_HEADERS)).json()["data"][0]["id"]
    district_id = (await client.post("/api/v1/admin/districts", headers=ADMIN_HEADERS, json={
        "slug": "nested-district",
        "sort_order": 0,
        "is_active": True,
        "translations": [{"locale": "fr", "name": "Quartier Test"}],
    })).json()["data"]["id"]
    technician_id = (await client.post("/api/v1/admin/technicians", headers=ADMIN_HEADERS, json={
        "name": "Nested Tech",
        "slug": "nested-tech",
        "phone": "0612222222",
        "translations": [],
        "media": [],
        "services": [],
        "districts": [],
    })).json()["data"]["id"]

    response = await client.post("/api/v1/service-requests", json={
        "customer_name": "Yasmine Idrissi",
        "customer_phone": "+212612345678",
        "service_id": service_id,
        "district_id": district_id,
        "technician_id": technician_id,
    })
    assert response.status_code == 201

    response = await client.get("/api/v1/admin/service-requests?search=Yasmine", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()["data"][0]
    assert data["service"]["slug"] == "plomberie"
    assert data["service"]["translations"][0]["name"] == "Plomberie"
    assert data["district"]["translations"][0]["name"] == "Quartier Test"
    assert data["technician"]["name"] == "Nested Tech"


@pytest.mark.asyncio
async def test_admin_dashboard(client):
    await _create_service(client)
    electric_response = await _create_service(client, slug="electricite", name="Electricite")
    service_id = electric_response.json()["data"]["id"]

    response = await client.post("/api/v1/contact", json={
        "name": "Bob",
        "phone": "+212612345678",
        "district": "Gueliz",
        "service_id": service_id,
        "message": "Hi",
    })
    assert response.status_code == 201

    response = await client.get("/api/v1/admin/dashboard", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["services"] == 2
    assert data["contact_messages"] == 1
    assert data["contact_unread"] == 1
    assert data["service_requests"] == 0
    statuses = {s["status"]: s["count"] for s in data["service_requests_by_status"]}
    assert statuses["pending"] == 0


@pytest.mark.asyncio
async def test_admin_contact_sort_toggle_and_bulk(client):
    service_id = (await _create_service(client)).json()["data"]["id"]
    created = []
    for name in ("First", "Second"):
        response = await client.post("/api/v1/contact", json={
            "name": name,
            "phone": "+212612345678",
            "district": "Gueliz",
            "service_id": service_id,
            "message": f"Hello {name}",
        })
        assert response.status_code == 201
        created.append(response.json()["data"]["id"])
        await asyncio.sleep(1.1)  # ensure distinct created_at (SQLite second resolution)

    # newest first is the default
    response = await client.get("/api/v1/contact", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()["data"]
    assert [m["id"] for m in data[:2]] == [created[1], created[0]]

    # oldest first
    response = await client.get("/api/v1/contact?sort=oldest", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()["data"]
    assert [m["id"] for m in data[:2]] == [created[0], created[1]]

    # invalid sort is rejected
    response = await client.get("/api/v1/contact?sort=zzz", headers=ADMIN_HEADERS)
    assert response.status_code == 422

    # toggle read then back to unread
    response = await client.patch(
        f"/api/v1/admin/contact/{created[0]}",
        headers=ADMIN_HEADERS,
        json={"is_read": True},
    )
    assert response.status_code == 200
    assert response.json()["data"]["is_read"] is True

    response = await client.patch(
        f"/api/v1/admin/contact/{created[0]}",
        headers=ADMIN_HEADERS,
        json={"is_read": False},
    )
    assert response.status_code == 200
    assert response.json()["data"]["is_read"] is False

    # bulk mark read
    response = await client.post(
        "/api/v1/admin/contact/bulk",
        headers=ADMIN_HEADERS,
        json={"ids": created, "action": "mark_read"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["processed"] == 2

    response = await client.get("/api/v1/contact?is_read=false", headers=ADMIN_HEADERS)
    assert response.json()["data"] == []

    # bulk delete
    response = await client.post(
        "/api/v1/admin/contact/bulk",
        headers=ADMIN_HEADERS,
        json={"ids": created, "action": "delete"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["processed"] == 2

    response = await client.get("/api/v1/contact", headers=ADMIN_HEADERS)
    assert response.json()["data"] == []

    # bulk with unknown ids is a no-op but still succeeds
    response = await client.post(
        "/api/v1/admin/contact/bulk",
        headers=ADMIN_HEADERS,
        json={"ids": ["00000000-0000-0000-0000-000000000000"], "action": "delete"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["processed"] == 0


@pytest.mark.asyncio
async def test_admin_service_request_sort_and_bulk(client):
    await _create_service(client)
    service_id = (await client.get("/api/v1/admin/services", headers=ADMIN_HEADERS)).json()["data"][0]["id"]

    created = []
    for name in ("First", "Second"):
        response = await client.post("/api/v1/service-requests", json={
            "customer_name": name,
            "customer_phone": "+212612345678",
            "service_id": service_id,
        })
        assert response.status_code == 201
        created.append(response.json()["data"]["id"])
        await asyncio.sleep(1.1)

    # newest first is the default
    response = await client.get("/api/v1/admin/service-requests", headers=ADMIN_HEADERS)
    data = response.json()["data"]
    assert [r["id"] for r in data[:2]] == [created[1], created[0]]

    # oldest first
    response = await client.get("/api/v1/admin/service-requests?sort=oldest", headers=ADMIN_HEADERS)
    data = response.json()["data"]
    assert [r["id"] for r in data[:2]] == [created[0], created[1]]

    # bulk update status
    response = await client.post(
        "/api/v1/admin/service-requests/bulk",
        headers=ADMIN_HEADERS,
        json={"ids": created, "action": "update_status", "status": "confirmed"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["processed"] == 2

    response = await client.get("/api/v1/admin/service-requests?status=confirmed", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    assert len(response.json()["data"]) == 2

    # bulk update status without status is rejected
    response = await client.post(
        "/api/v1/admin/service-requests/bulk",
        headers=ADMIN_HEADERS,
        json={"ids": created, "action": "update_status"},
    )
    assert response.status_code == 422

    # bulk delete
    response = await client.post(
        "/api/v1/admin/service-requests/bulk",
        headers=ADMIN_HEADERS,
        json={"ids": created, "action": "delete"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["processed"] == 2

    response = await client.get("/api/v1/admin/service-requests", headers=ADMIN_HEADERS)
    assert response.json()["data"] == []


@pytest.mark.asyncio
async def test_admin_service_request_patch_status(client):
    await _create_service(client)
    service_id = (await client.get("/api/v1/admin/services", headers=ADMIN_HEADERS)).json()["data"][0]["id"]

    created = await client.post("/api/v1/service-requests", json={
        "customer_name": "Patch Test",
        "customer_phone": "+212612345679",
        "service_id": service_id,
    })
    assert created.status_code == 201
    request_id = created.json()["data"]["id"]

    response = await client.patch(
        f"/api/v1/admin/service-requests/{request_id}",
        headers=ADMIN_HEADERS,
        json={"status": "contacted", "admin_notes": "appel au client"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "contacted"
    assert data["admin_notes"] == "appel au client"

    fetched = await client.get(f"/api/v1/admin/service-requests/{request_id}", headers=ADMIN_HEADERS)
    assert fetched.status_code == 200
    assert fetched.json()["data"]["status"] == "contacted"


@pytest.mark.asyncio
async def test_admin_services_and_districts_is_active_filter(client):
    await _create_service(client, slug="active-service")
    await _create_service(client, slug="inactive-service")
    response = await client.get("/api/v1/admin/services", headers=ADMIN_HEADERS)
    inactive_id = [s for s in response.json()["data"] if s["slug"] == "inactive-service"][0]["id"]
    await client.patch(f"/api/v1/admin/services/{inactive_id}", headers=ADMIN_HEADERS, json={"is_active": False})

    response = await client.get("/api/v1/admin/services?is_active=true", headers=ADMIN_HEADERS)
    assert {s["slug"] for s in response.json()["data"]} == {"active-service"}
    response = await client.get("/api/v1/admin/services?is_active=false", headers=ADMIN_HEADERS)
    assert {s["slug"] for s in response.json()["data"]} == {"inactive-service"}

    response = await client.post("/api/v1/admin/districts", headers=ADMIN_HEADERS, json={
        "slug": "active-district",
        "sort_order": 0,
        "is_active": True,
        "translations": [{"locale": "fr", "name": "Actif"}],
    })
    active_id = response.json()["data"]["id"]
    response = await client.post("/api/v1/admin/districts", headers=ADMIN_HEADERS, json={
        "slug": "inactive-district",
        "sort_order": 1,
        "is_active": True,
        "translations": [{"locale": "fr", "name": "Inactif"}],
    })
    inactive_id = response.json()["data"]["id"]
    await client.patch(f"/api/v1/admin/districts/{inactive_id}", headers=ADMIN_HEADERS, json={"is_active": False})

    response = await client.get("/api/v1/admin/districts?is_active=true", headers=ADMIN_HEADERS)
    assert {d["slug"] for d in response.json()["data"]} == {"active-district"}
    response = await client.get("/api/v1/admin/districts?is_active=false", headers=ADMIN_HEADERS)
    inactive_slugs = {d["slug"] for d in response.json()["data"]}
    assert inactive_slugs == {"inactive-district"}
    assert active_id not in [d["id"] for d in response.json()["data"]]


def test_normalize_attachments():
    url = "https://example.supabase.co/storage/v1/object/public/request-images/x.jpg"
    assert normalize_attachments(None) == []
    assert normalize_attachments("null") == []
    assert normalize_attachments("") == []
    assert normalize_attachments("[]") == []
    assert normalize_attachments([url]) == [url]
    assert normalize_attachments(f'["{url}"]') == [url]
    assert normalize_attachments("not json") == ["not json"]


@pytest.mark.asyncio
async def test_admin_contact_includes_service_request_attachments(client):
    """A message with a completed request exposes the request (with its
    attachments) through the admin contact endpoints, even when the stored
    attachments are double-encoded or the literal text ``null``."""
    service_id = (await _create_service(client)).json()["data"]["id"]

    message_resp = await client.post("/api/v1/contact", json={
        "name": "Imad",
        "phone": "+212612345678",
        "district": "Gueliz",
        "service_id": service_id,
        "message": "Besoin d'un technicien",
    })
    assert message_resp.status_code == 201
    message_id = message_resp.json()["data"]["id"]

    urls = [
        "https://example.supabase.co/storage/v1/object/public/request-images/requests/a/b.jpg",
        "https://example.supabase.co/storage/v1/object/public/request-images/requests/a/c.png",
    ]

    async with TestSessionLocal() as session:
        request = ServiceRequest(
            customer_name="Imad",
            customer_phone="+212612345678",
            service_id=UUID(service_id),
            contact_message_id=UUID(message_id),
            request_number="REQ-2026-TEST123",
            status="pending",
            # Simulate the historical double-encoding: a JSON array stored as
            # a JSON string inside the JSONB column.
            attachments=f'["{urls[0]}", "{urls[1]}"]',
        )
        session.add(request)
        await session.flush()
        request_id = request.id
        await session.commit()

    # Detail endpoint
    response = await client.get(f"/api/v1/admin/contact/{message_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["service_request"]["id"] == str(request_id)
    assert data["service_request"]["request_number"] == "REQ-2026-TEST123"
    assert data["service_request"]["status"] == "pending"
    assert data["service_request"]["attachments"] == urls

    # List endpoint
    response = await client.get("/api/v1/contact", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    listed = next(m for m in response.json()["data"] if m["id"] == str(message_id))
    assert listed["service_request"]["attachments"] == urls


@pytest.mark.asyncio
async def test_admin_service_requests_normalize_null_attachments(client):
    """A request whose attachments are the literal text 'null' is exposed as
    an empty array, and a proper list round-trips unchanged."""
    service_id = (await _create_service(client)).json()["data"]["id"]

    async with TestSessionLocal() as session:
        r1 = ServiceRequest(
            customer_name="Null Req",
            customer_phone="+212612345678",
            service_id=UUID(service_id),
            request_number="REQ-2026-NULLROW",
            status="pending",
            attachments="null",
        )
        r2 = ServiceRequest(
            customer_name="List Req",
            customer_phone="+212612345679",
            service_id=UUID(service_id),
            request_number="REQ-2026-LISTROW",
            status="pending",
            attachments=["https://example.supabase.co/a.jpg"],
        )
        session.add_all([r1, r2])
        await session.flush()
        await session.commit()

    response = await client.get("/api/v1/admin/service-requests?search=Req", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = {r["request_number"]: r["attachments"] for r in response.json()["data"]}
    assert data["REQ-2026-NULLROW"] == []
    assert data["REQ-2026-LISTROW"] == ["https://example.supabase.co/a.jpg"]