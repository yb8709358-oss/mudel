from __future__ import annotations

import httpx

from app.core.config import settings
from app.core.logging import logger

_GRAPH_API_BASE_URL = 'https://graph.facebook.com'


class WhatsAppService:
    """Thin wrapper around the Meta WhatsApp Cloud API.

    The service is stateless per request and uses ``httpx.AsyncClient`` for
    outbound HTTP.  Secrets are never logged or exposed in responses.
    """

    def __init__(
        self,
        *,
        enabled: bool | None = None,
        access_token: str | None = None,
        phone_number_id: str | None = None,
        verify_token: str | None = None,
        graph_api_version: str | None = None,
        admin_phone: str | None = None,
    ) -> None:
        self._enabled = enabled if enabled is not None else settings.whatsapp_enabled
        self._access_token = access_token or settings.whatsapp_access_token
        self._phone_number_id = phone_number_id or settings.whatsapp_phone_number_id
        self._verify_token = verify_token or settings.whatsapp_verify_token
        self._graph_api_version = graph_api_version or settings.whatsapp_graph_api_version
        self._admin_phone = admin_phone or settings.whatsapp_admin_phone

    # ------------------------------------------------------------------
    # Webhook verification
    # ------------------------------------------------------------------
    def verify_webhook(self, mode: str, token: str, challenge: str) -> str | None:
        """Return the *challenge* string when verification succeeds, else ``None``."""
        if mode == 'subscribe' and token == self._verify_token:
            return challenge
        return None

    # ------------------------------------------------------------------
    # Outbound messages
    # ------------------------------------------------------------------
    async def send_text_message(self, recipient_phone_number: str, message: str) -> dict:
        """Send a plain-text WhatsApp message via the Cloud API.

        Returns the parsed JSON response on success.  Raises ``WhatsAppError``
        on any failure so the caller can decide how to handle it.
        """
        if not self._enabled:
            logger.debug('whatsapp_disabled', action='send_text_message_skipped')
            raise WhatsAppError('WhatsApp integration is disabled.')

        url = f'{_GRAPH_API_BASE_URL}/{self._graph_api_version}/{self._phone_number_id}/messages'
        headers = {
            'Authorization': f'Bearer {self._access_token}',
            'Content-Type': 'application/json',
        }
        payload = {
            'messaging_product': 'whatsapp',
            'to': recipient_phone_number,
            'type': 'text',
            'text': {'body': message},
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
            except httpx.TimeoutException:
                logger.error('whatsapp_api_timeout', recipient=recipient_phone_number)
                raise WhatsAppError('WhatsApp API request timed out.')

            if response.status_code >= 400:
                try:
                    body = response.json()
                except Exception:
                    body = {'raw': response.text[:500]}
                error_code = body.get('error', {}).get('code', response.status_code)
                error_msg = body.get('error', {}).get('message', 'Unknown API error')
                logger.error(
                    'whatsapp_api_error',
                    status_code=response.status_code,
                    error_code=error_code,
                    recipient=recipient_phone_number,
                )
                raise WhatsAppError(
                    f'WhatsApp API returned {response.status_code}: {error_msg}'
                )

            return response.json()

    # ------------------------------------------------------------------
    # Notification helpers
    # ------------------------------------------------------------------
    async def notify_new_service_request(
        self,
        *,
        request_number: str,
        customer_name: str,
        customer_phone: str,
        service_name: str | None = None,
        address: str | None = None,
        preferred_date: str | None = None,
        preferred_time: str | None = None,
    ) -> None:
        """Send an admin notification about a newly created service request.

        Failures are logged but never raised — the caller must not break.
        """
        if not self._enabled or not self._admin_phone:
            return

        lines = [
            '🔔 *Nouvelle demande de service*',
            '',
            f'📋 *Numéro:* {request_number}',
            f'👤 *Client:* {customer_name}',
            f'📞 *Téléphone:* {customer_phone}',
        ]
        if service_name:
            lines.append(f'🛠️ *Service:* {service_name}')
        if address:
            lines.append(f'📍 *Adresse:* {address}')
        if preferred_date:
            date_line = f'📅 *Date:* {preferred_date}'
            if preferred_time:
                date_line += f' à {preferred_time}'
            lines.append(date_line)

        message = '\n'.join(lines)

        try:
            await self.send_text_message(self._admin_phone, message)
            logger.info('whatsapp_request_notification_sent', request_number=request_number)
        except WhatsAppError as exc:
            logger.warning(
                'whatsapp_request_notification_failed',
                request_number=request_number,
                error=str(exc),
            )


class WhatsAppError(Exception):
    """Raised when a WhatsApp API call fails."""
