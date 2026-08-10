import pytest


@pytest.mark.asyncio
async def test_list_technicians_empty(client):
    response = await client.get("/api/v1/technicians")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_list_technicians_with_service_filter(client):
    response = await client.get("/api/v1/technicians?service=nonexistent")
    assert response.status_code == 200
