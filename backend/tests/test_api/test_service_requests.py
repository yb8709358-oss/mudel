import pytest


@pytest.mark.asyncio
async def test_submit_service_request_invalid_uuid(client):
    response = await client.post("/api/v1/service-requests", json={
        "customer_name": "Test",
        "customer_phone": "+212612345678",
        "service_id": "not-a-uuid"
    })
    assert response.status_code == 422
