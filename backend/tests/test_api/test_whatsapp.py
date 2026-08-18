import re
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.deps import get_whatsapp_service, get_storage_service
from app.core.limiter import limiter
from app.main import app
from app.models.contact import ContactMessage
from app.models.service import Service, ServiceTranslation
from app.services.storage import StorageService
from app.services.whatsapp import WhatsAppError, WhatsAppService

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


def _make_whatsapp_service(**overrides) -> WhatsAppService:
    """Build a WhatsAppService with test defaults (enabled)."""
    defaults = dict(
        enabled=True,
        access_token='test-token-fake',
        phone_number_id='1234567890',
        verify_token='test-verify-token',
        graph_api_version='v21.0',
        admin_phone='+212600000000',
    )
    defaults.update(overrides)
    return WhatsAppService(**defaults)


# ======================================================================
# 1. GET webhook verification — correct token
# ======================================================================
@pytest.mark.asyncio
async def test_webhook_verify_correct_token(client):
    ws = _make_whatsapp_service()
    app.dependency_overrides[get_whatsapp_service] = lambda: ws
    try:
        resp = await client.get(
            '/api/v1/whatsapp/webhook',
            params={
                'hub.mode': 'subscribe',
                'hub.verify_token': 'test-verify-token',
                'hub.challenge': 'CHALLENGE_ACCEPTED',
            },
        )
        assert resp.status_code == 200
        assert resp.text == 'CHALLENGE_ACCEPTED'
        assert resp.headers['content-type'] == 'text/plain; charset=utf-8'
    finally:
        app.dependency_overrides.pop(get_whatsapp_service, None)


# ======================================================================
# 2. GET webhook verification — incorrect token
# ======================================================================
@pytest.mark.asyncio
async def test_webhook_verify_wrong_token(client):
    ws = _make_whatsapp_service()
    app.dependency_overrides[get_whatsapp_service] = lambda: ws
    try:
        resp = await client.get(
            '/api/v1/whatsapp/webhook',
            params={
                'hub.mode': 'subscribe',
                'hub.verify_token': 'wrong-token',
                'hub.challenge': 'CHALLENGE_ACCEPTED',
            },
        )
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.pop(get_whatsapp_service, None)


# ======================================================================
# 3. POST valid WhatsApp message webhook → 200
# ======================================================================
@pytest.mark.asyncio
async def test_webhook_post_valid_message(client):
    ws = _make_whatsapp_service()
    app.dependency_overrides[get_whatsapp_service] = lambda: ws
    try:
        payload = {
            'object': 'whatsapp_business_account',
            'entry': [{
                'id': 'WABA_ID',
                'changes': [{
                    'value': {
                        'messaging_product': 'whatsapp',
                        'metadata': {
                            'display_phone_number': '+1234567890',
                            'phone_number_id': '1234567890',
                        },
                        'messages': [{
                            'from': '+212612345678',
                            'id': 'wamid.TEST123',
                            'timestamp': '1234567890',
                            'type': 'text',
                            'text': {'body': 'Hello'},
                        }],
                    },
                    'field': 'messages',
                }],
            }],
        }
        resp = await client.post('/api/v1/whatsapp/webhook', json=payload)
        assert resp.status_code == 200
    finally:
        app.dependency_overrides.pop(get_whatsapp_service, None)


# ======================================================================
# 4. POST unknown event type → 200
# ======================================================================
@pytest.mark.asyncio
async def test_webhook_post_unknown_event(client):
    ws = _make_whatsapp_service()
    app.dependency_overrides[get_whatsapp_service] = lambda: ws
    try:
        payload = {
            'object': 'whatsapp_business_account',
            'entry': [{
                'id': 'WABA_ID',
                'changes': [{
                    'value': {'something': 'unknown'},
                    'field': 'unknown_field',
                }],
            }],
        }
        resp = await client.post('/api/v1/whatsapp/webhook', json=payload)
        assert resp.status_code == 200
    finally:
        app.dependency_overrides.pop(get_whatsapp_service, None)


# ======================================================================
# 5. POST malformed payload → safely handled (200)
# ======================================================================
@pytest.mark.asyncio
async def test_webhook_post_malformed_payload(client):
    ws = _make_whatsapp_service()
    app.dependency_overrides[get_whatsapp_service] = lambda: ws
    try:
        # Not a dict
        resp = await client.post('/api/v1/whatsapp/webhook', content='not json',
                                 headers={'content-type': 'application/json'})
        assert resp.status_code == 200

        # Wrong object type
        resp = await client.post('/api/v1/whatsapp/webhook', json={'object': 'something_else'})
        assert resp.status_code == 200

        # Empty body
        resp = await client.post('/api/v1/whatsapp/webhook', content=b'',
                                 headers={'content-type': 'application/json'})
        assert resp.status_code == 200
    finally:
        app.dependency_overrides.pop(get_whatsapp_service, None)


# ======================================================================
# 6. WhatsAppService — Meta API success
# ======================================================================
@pytest.mark.asyncio
async def test_whatsapp_service_send_text_success():
    ws = _make_whatsapp_service()
    mock_response = AsyncMock()
    mock_response.status_code = 200
    # httpx Response.json() is synchronous — use a plain Mock for it
    from unittest.mock import Mock
    mock_response.json = Mock(return_value={
        'messaging_product': 'whatsapp',
        'messages': [{'id': 'wamid.REAL', 'status': 'sent'}],
    })

    with patch('app.services.whatsapp.httpx.AsyncClient') as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await ws.send_text_message('+212612345678', 'Test message')

    assert result['messages'][0]['status'] == 'sent'
    call_kwargs = mock_client.post.call_args
    assert 'Bearer' in call_kwargs.kwargs['headers']['Authorization']


# ======================================================================
# 7. WhatsAppService — Meta API error
# ======================================================================
@pytest.mark.asyncio
async def test_whatsapp_service_send_text_api_error():
    ws = _make_whatsapp_service()
    from unittest.mock import Mock
    mock_response = AsyncMock()
    mock_response.status_code = 400
    mock_response.json = Mock(return_value={
        'error': {
            'message': 'Invalid recipient phone number',
            'type': 'OAuthException',
            'code': 100,
        },
    })

    with patch('app.services.whatsapp.httpx.AsyncClient') as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        with pytest.raises(WhatsAppError, match='400'):
            await ws.send_text_message('+212612345678', 'Test message')


# ======================================================================
# 8. WhatsAppService — timeout
# ======================================================================
@pytest.mark.asyncio
async def test_whatsapp_service_send_text_timeout():
    import httpx as _httpx

    ws = _make_whatsapp_service()

    with patch('app.services.whatsapp.httpx.AsyncClient') as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.post.side_effect = _httpx.TimeoutException('timed out')
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        with pytest.raises(WhatsAppError, match='timed out'):
            await ws.send_text_message('+212612345678', 'Test message')


# ======================================================================
# 9. Access token never appears in logs
# ======================================================================
@pytest.mark.asyncio
async def test_access_token_never_in_logs(caplog):
    ws = _make_whatsapp_service(access_token='SUPER_SECRET_TOKEN_12345')
    from unittest.mock import Mock
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json = Mock(return_value={'messages': [{'id': 'wamid.X', 'status': 'sent'}]})

    with patch('app.services.whatsapp.httpx.AsyncClient') as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        await ws.send_text_message('+212612345678', 'Hello')

    for record in caplog.records:
        assert 'SUPER_SECRET_TOKEN' not in record.message
        assert 'SUPER_SECRET_TOKEN' not in record.getMessage()


# ======================================================================
# 10. WhatsApp credentials never exposed to frontend
# ======================================================================
@pytest.mark.asyncio
async def test_whatsapp_credentials_not_in_frontend_vars():
    """Verify no WHATSAPP_* credential leaks via NEXT_PUBLIC_* env vars."""
    import os
    for key, value in os.environ.items():
        if key.startswith('NEXT_PUBLIC_'):
            # NEXT_PUBLIC vars are embedded in the browser bundle.
            # They must never contain WhatsApp secrets.
            if 'WHATSAPP' in value.upper():
                pytest.fail(f'{key} contains WhatsApp data: {key}={value[:10]}...')


# ======================================================================
# 11. notify_new_service_request sends notification
# ======================================================================
@pytest.mark.asyncio
async def test_notify_new_service_request_sends_message():
    ws = _make_whatsapp_service()
    with patch.object(ws, 'send_text_message', new_callable=AsyncMock) as mock_send:
        mock_send.return_value = {'messages': [{'id': 'wamid.X', 'status': 'sent'}]}
        await ws.notify_new_service_request(
            request_number='REQ-2026-ABCDEF1234567890',
            customer_name='Ahmed',
            customer_phone='+212612345678',
            service_name='Plomberie',
            address='12 Rue Test',
            preferred_date='2026-08-15',
            preferred_time='09:30',
        )
        mock_send.assert_called_once()
        call_args = mock_send.call_args
        assert call_args.args[0] == '+212600000000'  # admin phone
        body = call_args.args[1]
        assert 'REQ-2026-ABCDEF1234567890' in body
        assert 'Ahmed' in body
        assert 'Plomberie' in body
        assert '12 Rue Test' in body
        assert '2026-08-15' in body
        assert '09:30' in body


# ======================================================================
# 12. notify_new_service_request does NOT raise on failure
# ======================================================================
@pytest.mark.asyncio
async def test_notify_new_service_request_does_not_raise_on_failure():
    ws = _make_whatsapp_service()
    with patch.object(ws, 'send_text_message', new_callable=AsyncMock) as mock_send:
        mock_send.side_effect = WhatsAppError('API down')
        # Must not raise
        await ws.notify_new_service_request(
            request_number='REQ-2026-FAIL',
            customer_name='Test',
            customer_phone='+212600000001',
        )
        mock_send.assert_called_once()


# ======================================================================
# 13. WhatsApp disabled → no notification sent
# ======================================================================
@pytest.mark.asyncio
async def test_notify_skipped_when_disabled():
    ws = _make_whatsapp_service(enabled=False)
    with patch.object(ws, 'send_text_message', new_callable=AsyncMock) as mock_send:
        await ws.notify_new_service_request(
            request_number='REQ-2026-NOOP',
            customer_name='Test',
            customer_phone='+212600000001',
        )
        mock_send.assert_not_called()


# ======================================================================
# 14. Service request creation triggers WhatsApp notification
# ======================================================================
@pytest.mark.asyncio
async def test_submit_request_triggers_whatsapp_notification(client):
    """After a successful service request submission, the WhatsApp notification
    is attempted.  If WhatsApp is disabled (default in tests), no call is made
    and the request still succeeds."""
    ws = _make_whatsapp_service(enabled=False)
    app.dependency_overrides[get_whatsapp_service] = lambda: ws
    app.dependency_overrides[get_storage_service] = lambda: FakeStorage()
    try:
        service_id = (await _create_service())["id"]
        data = await _create_contact(client, service_id=service_id)

        with patch.object(ws, 'send_text_message', new_callable=AsyncMock) as mock_send:
            resp = await client.post(
                f"/api/v1/requests/{data['request_token']}",
                json={
                    "address": "12 Rue de la Liberté, Gueliz",
                    "description": "Fuite d'eau",
                    "preferred_date": "2026-08-15",
                    "preferred_time": "09:30",
                },
            )
            assert resp.status_code == 201
            body = resp.json()
            assert body["success"] is True
            assert re.fullmatch(r"REQ-\d{4}-[0-9A-F]{16}", body["data"]["request_number"])
            # Disabled → no API call
            mock_send.assert_not_called()
    finally:
        app.dependency_overrides.pop(get_whatsapp_service, None)
        app.dependency_overrides.pop(get_storage_service, None)


# ======================================================================
# 15. WhatsApp-enabled submit: notification sent, request still succeeds
# ======================================================================
@pytest.mark.asyncio
async def test_submit_request_with_whatsapp_enabled(client):
    """When WhatsApp is enabled and the API succeeds, the notification is sent
    and the request still succeeds."""
    ws = _make_whatsapp_service(enabled=True, admin_phone='+212699999999')
    app.dependency_overrides[get_whatsapp_service] = lambda: ws
    app.dependency_overrides[get_storage_service] = lambda: FakeStorage()
    try:
        service_id = (await _create_service())["id"]
        data = await _create_contact(client, service_id=service_id)

        with patch.object(ws, 'send_text_message', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = {'messages': [{'id': 'wamid.X', 'status': 'sent'}]}
            resp = await client.post(
                f"/api/v1/requests/{data['request_token']}",
                json={
                    "address": "12 Rue de la Liberté, Gueliz",
                    "description": "Fuite d'eau",
                    "preferred_date": "2026-08-15",
                    "preferred_time": "09:30",
                },
            )
            assert resp.status_code == 201
            # WhatsApp notification was attempted
            mock_send.assert_called_once()
            call_args = mock_send.call_args
            assert call_args.args[0] == '+212699999999'
    finally:
        app.dependency_overrides.pop(get_whatsapp_service, None)
        app.dependency_overrides.pop(get_storage_service, None)


# ======================================================================
# 16. WhatsApp API failure during submit does NOT break the request
# ======================================================================
@pytest.mark.asyncio
async def test_submit_request_survives_whatsapp_failure(client):
    """Even if the WhatsApp API throws an error, the service request is still
    created and returned successfully."""
    ws = _make_whatsapp_service(enabled=True, admin_phone='+212699999999')
    app.dependency_overrides[get_whatsapp_service] = lambda: ws
    app.dependency_overrides[get_storage_service] = lambda: FakeStorage()
    try:
        service_id = (await _create_service())["id"]
        data = await _create_contact(client, service_id=service_id)

        with patch.object(ws, 'send_text_message', new_callable=AsyncMock) as mock_send:
            mock_send.side_effect = WhatsAppError('Meta API down')
            resp = await client.post(
                f"/api/v1/requests/{data['request_token']}",
                json={
                    "address": "12 Rue de la Liberté, Gueliz",
                    "description": "Fuite d'eau",
                    "preferred_date": "2026-08-15",
                    "preferred_time": "09:30",
                },
            )
            # Request still succeeds despite WhatsApp failure
            assert resp.status_code == 201
            body = resp.json()
            assert body["success"] is True
            assert re.fullmatch(r"REQ-\d{4}-[0-9A-F]{16}", body["data"]["request_number"])
    finally:
        app.dependency_overrides.pop(get_whatsapp_service, None)
        app.dependency_overrides.pop(get_storage_service, None)


# ======================================================================
# 17. Webhook status update events → 200
# ======================================================================
@pytest.mark.asyncio
async def test_webhook_post_status_update(client):
    ws = _make_whatsapp_service()
    app.dependency_overrides[get_whatsapp_service] = lambda: ws
    try:
        payload = {
            'object': 'whatsapp_business_account',
            'entry': [{
                'id': 'WABA_ID',
                'changes': [{
                    'value': {
                        'messaging_product': 'whatsapp',
                        'statuses': [{
                            'id': 'wamid.STATUS123',
                            'status': 'delivered',
                            'timestamp': '1234567890',
                        }],
                    },
                    'field': 'messages',
                }],
            }],
        }
        resp = await client.post('/api/v1/whatsapp/webhook', json=payload)
        assert resp.status_code == 200
    finally:
        app.dependency_overrides.pop(get_whatsapp_service, None)


# ======================================================================
# 18. verify_webhook mode != subscribe → None
# ======================================================================
@pytest.mark.asyncio
async def test_verify_webhook_wrong_mode():
    ws = _make_whatsapp_service()
    result = ws.verify_webhook('unsubscribe', 'test-verify-token', 'challenge')
    assert result is None


# ======================================================================
# 19. send_text_message when disabled → raises WhatsAppError
# ======================================================================
@pytest.mark.asyncio
async def test_send_text_message_disabled():
    ws = _make_whatsapp_service(enabled=False)
    with pytest.raises(WhatsAppError, match='disabled'):
        await ws.send_text_message('+212612345678', 'Hello')


# ======================================================================
# 20. Empty entries in webhook → 200
# ======================================================================
@pytest.mark.asyncio
async def test_webhook_post_empty_entries(client):
    ws = _make_whatsapp_service()
    app.dependency_overrides[get_whatsapp_service] = lambda: ws
    try:
        payload = {
            'object': 'whatsapp_business_account',
            'entry': [],
        }
        resp = await client.post('/api/v1/whatsapp/webhook', json=payload)
        assert resp.status_code == 200
    finally:
        app.dependency_overrides.pop(get_whatsapp_service, None)
