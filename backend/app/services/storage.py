import httpx

from app.core.config import settings
from app.core.exceptions import AppError


class StorageService:
    """Uploads files to Supabase Storage via the REST API.

    The service-role key stays server-side; the public object URL is what
    gets persisted and rendered by the frontend.
    """

    def __init__(
        self,
        project_url: str | None = None,
        service_role_key: str | None = None,
        bucket: str | None = None,
    ):
        self.project_url = (project_url or settings.supabase_project_url).rstrip('/')
        self.service_role_key = service_role_key if service_role_key is not None else settings.supabase_service_role_key
        self.bucket = bucket or settings.supabase_storage_bucket

    def _check_configured(self) -> None:
        if not self.project_url or not self.service_role_key:
            raise AppError(
                code='STORAGE_NOT_CONFIGURED',
                message=(
                    'Image uploads are not configured. '
                    'Set SUPABASE_SERVICE_ROLE_KEY in the backend environment.'
                ),
                status_code=503,
            )

    async def _ensure_bucket(self, client: httpx.AsyncClient) -> None:
        response = await client.post(
            f'{self.project_url}/storage/v1/bucket',
            json={'name': self.bucket, 'public': True},
        )
        # 200/201 = created, 400 = already exists (or invalid name) — continue
        # either way and let the upload fail with a precise message if needed.
        if response.status_code in (401, 403):
            raise AppError(
                code='STORAGE_AUTH_FAILED',
                message=(
                    'Supabase Storage rejected the service-role key. '
                    'Check SUPABASE_SERVICE_ROLE_KEY in the backend environment.'
                ),
                status_code=500,
            )
        if response.status_code >= 500:
            raise AppError(
                code='STORAGE_UNAVAILABLE',
                message='Supabase Storage is unavailable right now.',
                status_code=502,
            )

    async def upload_image(self, content: bytes, content_type: str, object_path: str) -> str:
        self._check_configured()
        headers = {
            'Authorization': f'Bearer {self.service_role_key}',
            'apikey': self.service_role_key,
            'Content-Type': content_type,
        }
        url = f'{self.project_url}/storage/v1/object/{self.bucket}/{object_path}'

        async with httpx.AsyncClient(timeout=60) as client:
            await self._ensure_bucket(client)
            response = await client.post(url, content=content, headers=headers)

        if response.status_code not in (200, 201):
            raise AppError(
                code='STORAGE_UPLOAD_FAILED',
                message=f'Image upload to Supabase Storage failed: {response.text[:200]}',
                status_code=502,
            )

        return f'{self.project_url}/storage/v1/object/public/{self.bucket}/{object_path}'
