import pytest

from app.core.config import settings


@pytest.mark.asyncio
async def test_cors_preflight_configured_origin(client):
    origin = settings.cors_origin_list[0]
    response = await client.options(
        "/api/v1/services",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin
    assert response.headers.get("access-control-allow-credentials") == "true"
    methods = response.headers.get("access-control-allow-methods", "")
    assert "GET" in methods
    headers = response.headers.get("access-control-allow-headers", "").lower()
    assert "content-type" in headers


@pytest.mark.asyncio
async def test_cors_simple_get_configured_origin(client):
    origin = settings.cors_origin_list[0]
    response = await client.get("/api/v1/services", headers={"Origin": origin})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin


@pytest.mark.asyncio
async def test_cors_preflight_rejects_disallowed_origin(client):
    response = await client.options(
        "/api/v1/services",
        headers={
            "Origin": "http://evil.example.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 400
    assert response.headers.get("access-control-allow-origin") is None
