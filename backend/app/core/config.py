import json
from urllib.parse import urlparse

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = 'Home Services Marrakech'
    app_version: str = '0.1.0'
    environment: str = 'development'
    debug: bool = True

    database_url: str = 'postgresql://mudel:mudel_dev@localhost:5432/mudel'
    database_pool_size: int = 10
    database_max_overflow: int = 20

    cors_origins: str = '["http://localhost:3000","http://127.0.0.1:3000","http://localhost:3001","http://127.0.0.1:3001"]'

    contact_email_to: str = 'hello@mudel.ma'

    # Redis URL for rate limiting storage.
    # In production this MUST be set (Redis is required).
    # In development, falls back to in-memory storage if not set.
    redis_url: str = ''

    # Shared secret the Next.js server (never the browser) sends to unlock
    # admin-only endpoints. Must be overridden in production via env var.
    admin_api_secret: str = 'change-me-in-production'

    # Lifetime of the per-contact "complete your request" token in days.
    request_token_ttl_days: int = 7

    # Supabase Storage for request image uploads. Only the service-role key
    # is required (kept server-side); the project URL is derived from the
    # DATABASE_URL host (postgres.<project_ref>). Leave SUPABASE_SERVICE_ROLE_KEY
    # empty to run without image uploads (uploads return a 503 config error).
    supabase_service_role_key: str = ''
    supabase_storage_bucket: str = 'request-images'

    @property
    def cors_origin_list(self) -> list[str]:
        return json.loads(self.cors_origins)

    @property
    def supabase_project_url(self) -> str:
        user = urlparse(self.database_url).username or ''
        if '.' not in user:
            return ''
        return f'https://{user.split(".")[-1]}.supabase.co'

    # ------------------------------------------------------------------
    # Production validation
    # ------------------------------------------------------------------
    @model_validator(mode='after')
    def _validate_production(self) -> 'Settings':
        if self.environment != 'production':
            return self

        errors: list[str] = []

        # 1. DEBUG must be False in production
        if self.debug:
            errors.append('DEBUG must be False in production. Set DEBUG=False.')

        # 2. ADMIN_API_SECRET must not be the default insecure value
        if self.admin_api_secret == 'change-me-in-production':
            errors.append(
                'ADMIN_API_SECRET is using the default insecure value. '
                'Generate a real secret: python -c "import secrets; print(secrets.token_urlsafe(32))"'
            )

        # 3. CORS_ORIGINS must not contain a wildcard '*'
        try:
            origins = json.loads(self.cors_origins)
            if '*' in origins:
                errors.append(
                    'CORS_ORIGINS contains a wildcard "*". '
                    'Production must use explicit origin URLs (e.g. ["https://mudel.ma"]).'
                )
        except json.JSONDecodeError:
            errors.append('CORS_ORIGINS is not valid JSON. Expected a JSON array of strings.')

        # 4. DATABASE_URL must not point to localhost
        if 'localhost' in self.database_url or '127.0.0.1' in self.database_url:
            errors.append(
                'DATABASE_URL points to localhost. '
                'Production must use a remote database (e.g. Supabase, Railway).'
            )

        # 5. REDIS_URL must be set
        if not self.redis_url.strip():
            errors.append(
                'REDIS_URL is not set. Redis is required in production for rate limiting.'
            )

        # 6. CONTACT_EMAIL_TO must not be the default placeholder
        if self.contact_email_to == 'hello@mudel.ma' and not errors:
            # Only warn, don't block — this is acceptable in some setups
            pass

        if errors:
            raise ValueError(
                'Production configuration errors:\n'
                + '\n'.join(f'  - {e}' for e in errors)
            )

        return self

    model_config = {'env_file': '.env', 'case_sensitive': False}


settings = Settings()
