from fastapi import APIRouter, Depends, Query, Request, Response

from app.api.deps import get_whatsapp_service
from app.core.logging import logger
from app.services.whatsapp import WhatsAppService

router = APIRouter()


@router.get('/whatsapp/webhook')
async def verify_webhook(
    hub_mode: str = Query(default='', alias='hub.mode'),
    hub_verify_token: str = Query(default='', alias='hub.verify_token'),
    hub_challenge: str = Query(default='', alias='hub.challenge'),
    whatsapp: WhatsAppService = Depends(get_whatsapp_service),
):
    """Meta WhatsApp Cloud API webhook verification endpoint.

    Meta sends a GET request with ``hub.mode``, ``hub.verify_token`` and
    ``hub.challenge`` when you configure the webhook in the developer dashboard.
    We return the challenge as plain text when verification succeeds.
    """
    challenge = whatsapp.verify_webhook(hub_mode, hub_verify_token, hub_challenge)
    if challenge is not None:
        logger.info('whatsapp_webhook_verified')
        return Response(content=challenge, media_type='text/plain', status_code=200)

    logger.warning('whatsapp_webhook_verification_failed', mode=hub_mode)
    return Response(status_code=403)


@router.post('/whatsapp/webhook')
async def receive_webhook(
    request: Request,
    whatsapp: WhatsAppService = Depends(get_whatsapp_service),
):
    """Receive incoming WhatsApp webhook events from Meta.

    The endpoint always returns 200 to prevent Meta from retrying (which would
    cause duplicate processing).  Unknown or malformed payloads are logged and
    safely ignored.
    """
    try:
        payload = await request.json()
    except Exception:
        logger.warning('whatsapp_webhook_invalid_json')
        return Response(status_code=200)

    if not isinstance(payload, dict):
        logger.warning('whatsapp_webhook_unexpected_payload_type', type=type(payload).__name__)
        return Response(status_code=200)

    object_type = payload.get('object', '')
    if object_type != 'whatsapp_business_account':
        logger.debug('whatsapp_webhook_ignored_object', object=object_type)
        return Response(status_code=200)

    entries = payload.get('entry', [])
    for entry in entries:
        changes = entry.get('changes', [])
        for change in changes:
            value = change.get('value', {})
            field = change.get('field', '')

            messages = value.get('messages', [])
            statuses = value.get('statuses', [])

            for msg in messages:
                msg_from = msg.get('from', '')
                msg_type = msg.get('type', 'unknown')
                msg_id = msg.get('id', '')
                logger.info(
                    'whatsapp_message_received',
                    from_number=msg_from,
                    message_type=msg_type,
                    message_id=msg_id,
                    field=field,
                )

            for status in statuses:
                status_id = status.get('id', '')
                status_status = status.get('status', 'unknown')
                logger.info(
                    'whatsapp_status_update',
                    message_id=status_id,
                    status=status_status,
                    field=field,
                )

    return Response(status_code=200)
