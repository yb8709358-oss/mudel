import pytest

ADMIN_HEADERS = {"X-Admin-Secret": "test-admin-secret"}

MEDIA_URL = "https://vrllobkwnvqxzeoosajx.supabase.co/storage/v1/object/public/request-images/demo.jpg"
UNSPLASH_URL = "https://images.unsplash.com/photo-svc.jpg"

MEDIA = [{"url": UNSPLASH_URL, "caption": "Hero", "alt_text": None, "media_type": "image", "sort_order": 0}]
MEDIA2 = [{"url": MEDIA_URL, "caption": "Demo", "alt_text": None, "media_type": "image", "sort_order": 1}]


async def _create_service_with_media(client, slug="media-service", media=MEDIA):
    return await client.post("/api/v1/admin/services", headers=ADMIN_HEADERS, json={
        "slug": slug,
        "icon": "wrench",
        "sort_order": 0,
        "is_active": True,
        "translations": [{"locale": "fr", "name": slug.title(), "description": "Test"}],
        "media": media,
    })


@pytest.mark.asyncio
async def test_admin_list_returns_media_in_each_service(client):
    assert (await _create_service_with_media(client, slug="list-media-1")).status_code == 201
    assert (await _create_service_with_media(client, slug="list-media-2", media=MEDIA2)).status_code == 201

    response = await client.get("/api/v1/admin/services", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    by_slug = {s["slug"]: s for s in response.json()["data"]}
    assert by_slug["list-media-1"]["media"] == MEDIA
    assert by_slug["list-media-2"]["media"] == MEDIA2


@pytest.mark.asyncio
async def test_service_with_stored_media_returns_media_from_backend(client):
    created = await _create_service_with_media(client)
    assert created.status_code == 201
    service_id = created.json()["data"]["id"]

    response = await client.get(f"/api/v1/admin/services/{service_id}", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    assert response.json()["data"]["media"] == MEDIA

    public = await client.get("/api/v1/services/media-service")
    assert public.status_code == 200
    assert public.json()["data"]["media"] == MEDIA


@pytest.mark.asyncio
async def test_public_services_list_returns_media(client):
    assert (await _create_service_with_media(client)).status_code == 201
    response = await client.get("/api/v1/services")
    assert response.status_code == 200
    service = [s for s in response.json()["data"] if s["slug"] == "media-service"][0]
    assert service["media"] == MEDIA


@pytest.mark.asyncio
async def test_admin_update_without_media_field_preserves_media(client):
    created = await _create_service_with_media(client)
    service_id = created.json()["data"]["id"]

    response = await client.patch(
        f"/api/v1/admin/services/{service_id}",
        headers=ADMIN_HEADERS,
        json={"translations": [{"locale": "fr", "name": "Renamed", "description": "Test"}]},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["translations"][0]["name"] == "Renamed"
    assert data["media"] == MEDIA

    fetched = await client.get(f"/api/v1/admin/services/{service_id}", headers=ADMIN_HEADERS)
    assert fetched.json()["data"]["media"] == MEDIA


@pytest.mark.asyncio
async def test_admin_update_resending_same_media_preserves_media(client):
    created = await _create_service_with_media(client)
    service_id = created.json()["data"]["id"]

    response = await client.patch(
        f"/api/v1/admin/services/{service_id}",
        headers=ADMIN_HEADERS,
        json={
            "slug": "media-service",
            "icon": "wrench",
            "sort_order": 0,
            "is_active": True,
            "translations": [{"locale": "fr", "name": "Media Service", "description": "Test"}],
            "media": MEDIA,
        },
    )
    assert response.status_code == 200
    assert response.json()["data"]["media"] == MEDIA

    fetched = await client.get(f"/api/v1/admin/services/{service_id}", headers=ADMIN_HEADERS)
    assert fetched.json()["data"]["media"] == MEDIA


@pytest.mark.asyncio
async def test_admin_service_rejects_invalid_media_url(client):
    created = await _create_service_with_media(client)
    service_id = created.json()["data"]["id"]

    response = await client.patch(
        f"/api/v1/admin/services/{service_id}",
        headers=ADMIN_HEADERS,
        json={"media": [{"url": "https://evil.example.com/x.png", "media_type": "image", "sort_order": 0}]},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert any("url" in detail for detail in response.json()["error"]["details"])
