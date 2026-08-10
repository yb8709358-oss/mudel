from datetime import UTC, datetime
from uuid import uuid4

from fastapi import UploadFile

from app.core.exceptions import AppError, NotFoundError, ValidationError
from app.models.district import District
from app.repositories.request import RequestRepository
from app.schemas.request import RequestContactSummaryOut, RequestCreate
from app.services.storage import StorageService

MAX_IMAGES = 5
MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
}


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _ensure_aware(value: datetime | None) -> datetime | None:
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


class RequestService:
    def __init__(self, repo: RequestRepository, storage: StorageService):
        self.repo = repo
        self.storage = storage

    # ------------------------------------------------------------------
    # Token helpers
    # ------------------------------------------------------------------
    async def _get_contact(self, token: str):
        contact = await self.repo.get_contact_by_token(token)
        if not contact:
            raise NotFoundError('Request', token)
        return contact

    def _raise_if_not_usable(self, contact) -> None:
        if contact.request_token_consumed_at is not None:
            raise AppError(
                code='TOKEN_CONSUMED',
                message='This request link has already been used.',
                status_code=409,
            )
        expires_at = _ensure_aware(contact.request_token_expires_at)
        if expires_at is not None and expires_at < _utcnow():
            raise AppError(
                code='TOKEN_EXPIRED',
                message='This request link has expired.',
                status_code=410,
            )

    @staticmethod
    def _service_name(contact) -> str | None:
        service = contact.service
        if not service:
            return None
        translations = getattr(service, 'translations', []) or []
        for translation in translations:
            if translation.locale == 'fr':
                return translation.name
        if translations:
            return translations[0].name
        return service.slug

    @staticmethod
    def _build_request_number(contact) -> str:
        """Request number format (documented convention).

        REQ-{YYYY}-{16 uppercase hex chars of the originating contact UUID}.

        No pre-existing project convention for request numbers was found, so
        this format was introduced for the request flow. It is collision-safe
        because each contact has a unique UUID4 and the token may only be
        consumed once, so a given contact can only produce one request.
        """
        short_id = str(contact.id).replace('-', '')[:16].upper()
        return f'REQ-{_utcnow().year}-{short_id}'

    # ------------------------------------------------------------------
    # Public flow
    # ------------------------------------------------------------------
    async def get_access(self, token: str) -> dict:
        contact = await self._get_contact(token)

        if contact.request_token_consumed_at is not None:
            created = await self.repo.get_request_by_contact(contact.id)
            return {
                'status': 'consumed',
                'contact': None,
                'request_number': created.request_number if created else None,
            }

        expires_at = _ensure_aware(contact.request_token_expires_at)
        if expires_at is not None and expires_at < _utcnow():
            return {'status': 'expired', 'contact': None, 'request_number': None}

        summary = RequestContactSummaryOut(
            id=contact.id,
            name=contact.name,
            phone=contact.phone,
            district=contact.district,
            email=contact.email,
            service_name=self._service_name(contact),
            service_slug=contact.service.slug if contact.service else None,
            message=contact.message,
            created_at=contact.created_at,
        )
        return {'status': 'available', 'contact': summary, 'request_number': None}

    async def submit(self, token: str, data: RequestCreate):
        contact = await self._get_contact(token)
        self._raise_if_not_usable(contact)

        if contact.service_id is None:
            raise AppError(
                code='CONTACT_NO_SERVICE',
                message=(
                    'This contact message has no associated service, so a '
                    'service request cannot be created.'
                ),
                status_code=422,
            )

        if data.district_id and not await self.repo.exists(District, data.district_id):
            raise NotFoundError('District', str(data.district_id))

        request = await self.repo.create_request(
            request_number=self._build_request_number(contact),
            contact_message_id=contact.id,
            customer_name=contact.name,
            customer_phone=contact.phone,
            customer_email=contact.email,
            service_id=contact.service_id,
            district_id=data.district_id,
            address=data.address.strip(),
            latitude=data.latitude,
            longitude=data.longitude,
            preferred_date=data.preferred_date,
            preferred_time=data.preferred_time.strip(),
            description=data.description.strip(),
            attachments=data.attachments,
            status='pending',
        )
        await self.repo.consume_token(contact)
        return request

    async def upload_images(self, token: str, files: list[UploadFile]) -> list[str]:
        contact = await self._get_contact(token)
        self._raise_if_not_usable(contact)

        if len(files) > MAX_IMAGES:
            raise ValidationError(f'A maximum of {MAX_IMAGES} images is allowed.')

        if not files:
            raise ValidationError('No images were provided.')

        urls: list[str] = []
        for file in files:
            content_type = file.content_type or ''
            extension = ALLOWED_IMAGE_TYPES.get(content_type)
            if not extension:
                raise ValidationError(f'Unsupported image type: {content_type}')

            content = await self._read_limited(file)
            if len(content) > MAX_IMAGE_BYTES:
                raise ValidationError('Each image must be 5 MB or smaller.')

            object_path = f'requests/{contact.id}/{uuid4().hex}.{extension}'
            url = await self.storage.upload_image(content, content_type, object_path)
            urls.append(url)

        return urls

    @staticmethod
    async def _read_limited(file: UploadFile, limit: int = MAX_IMAGE_BYTES) -> bytes:
        chunks: list[bytes] = []
        total = 0
        target = limit + 1
        while total < target:
            chunk = await file.read(min(1024 * 1024, target - total))
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
        return b''.join(chunks)
