import pytest


@pytest.mark.asyncio
async def test_liveness_returns_200(client):
    response = await client.get('/api/v1/health')
    assert response.status_code == 200
    data = response.json()
    assert data['success'] is True
    assert data['status'] == 'ok'


@pytest.mark.asyncio
async def test_readiness_returns_200_with_working_db(client):
    response = await client.get('/api/v1/health/ready')
    assert response.status_code == 200
    data = response.json()
    assert data['success'] is True
    assert data['status'] == 'ready'
    assert data['database'] == 'connected'
