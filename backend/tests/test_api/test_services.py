import pytest

ADMIN_HEADERS = {"X-Admin-Secret": "test-admin-secret"}

NEW_SERVICE_PAYLOADS = [
    {
        "slug": "electrician",
        "icon": "zap",
        "sort_order": 9,
        "is_active": True,
        "translations": [
            {"locale": "en", "name": "Electrical Services", "description": "Electrical services", "meta_title": "Electrician Marrakech", "meta_desc": "Certified electrician"},
            {"locale": "fr", "name": "Électricité", "description": "Services électriques", "meta_title": "Électricien Marrakech", "meta_desc": "Électricien certifié"},
            {"locale": "ar", "name": "الكهرباء", "description": "خدمات كهربائية", "meta_title": "كهربائي مراكش", "meta_desc": "كهربائي معتمد"},
        ],
    },
    {
        "slug": "cctv-surveillance",
        "icon": "camera",
        "sort_order": 10,
        "is_active": True,
        "translations": [
            {"locale": "en", "name": "CCTV & Surveillance", "description": "CCTV installation and repair", "meta_title": "CCTV Installation Marrakech", "meta_desc": "CCTV in Marrakech"},
            {"locale": "fr", "name": "Caméras de surveillance", "description": "Installation de caméras", "meta_title": "Installation CCTV Marrakech", "meta_desc": "Caméras à Marrakech"},
            {"locale": "ar", "name": "كاميرات المراقبة", "description": "تركيب كاميرات المراقبة", "meta_title": "تركيب كاميرات مراقبة مراكش", "meta_desc": "كاميرات المراقبة في مراكش"},
        ],
    },
]


@pytest.mark.asyncio
async def test_list_services_empty(client):
    response = await client.get("/api/v1/services")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"] == []


@pytest.mark.asyncio
async def test_get_service_not_found(client):
    response = await client.get("/api/v1/services/nonexistent")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_new_services_returned_by_public_api(client):
    for payload in NEW_SERVICE_PAYLOADS:
        created = await client.post("/api/v1/admin/services", headers=ADMIN_HEADERS, json=payload)
        assert created.status_code == 201

    response = await client.get("/api/v1/services")
    assert response.status_code == 200
    slugs = {s["slug"] for s in response.json()["data"]}
    assert {"electrician", "cctv-surveillance"} <= slugs

    detail = await client.get("/api/v1/services/electrician")
    assert detail.status_code == 200
    data = detail.json()["data"]
    assert {tr["locale"] for tr in data["translations"]} == {"en", "fr", "ar"}
    assert data["icon"] == "zap"

    detail2 = await client.get("/api/v1/services/cctv-surveillance")
    assert detail2.status_code == 200
    assert detail2.json()["data"]["icon"] == "camera"


@pytest.mark.asyncio
async def test_new_services_listed_in_admin_api(client):
    for payload in NEW_SERVICE_PAYLOADS:
        assert (await client.post("/api/v1/admin/services", headers=ADMIN_HEADERS, json=payload)).status_code == 201

    response = await client.get("/api/v1/admin/services", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    admin_services = {s["slug"]: s for s in response.json()["data"]}
    assert "electrician" in admin_services
    assert "cctv-surveillance" in admin_services
    assert admin_services["electrician"]["is_active"] is True
    assert admin_services["cctv-surveillance"]["is_active"] is True


@pytest.mark.asyncio
async def test_adding_new_services_does_not_modify_existing_ones(client):
    existing = {
        "slug": "washing-machines",
        "icon": "shirt",
        "sort_order": 7,
        "is_active": True,
        "translations": [{"locale": "fr", "name": "Machines à Laver", "description": "Réparation"}],
    }
    assert (await client.post("/api/v1/admin/services", headers=ADMIN_HEADERS, json=existing)).status_code == 201

    for payload in NEW_SERVICE_PAYLOADS:
        assert (await client.post("/api/v1/admin/services", headers=ADMIN_HEADERS, json=payload)).status_code == 201

    response = await client.get("/api/v1/services")
    slugs = {s["slug"] for s in response.json()["data"]}
    assert slugs == {"washing-machines", "electrician", "cctv-surveillance"}

