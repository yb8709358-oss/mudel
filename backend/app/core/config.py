import json
from urllib.parse import quote_plus, urlparse

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = 'Home Services Marrakech'
    app_version: str = '0.1.0'
    environment: str = 'development'
    debug: bool = True

    database_url: str = ''
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # Optional separate database credentials. These are used ONLY as a fallback
    # when DATABASE_URL is empty: the connection URL is built from them with the
    # password percent-encoded (quote_plus) so special characters like '@' in
    # the password do not break URL parsing. DATABASE_URL always takes precedence
    # whenever it is set.
    db_host: str = ''
    db_port: int = 5432
    db_user: str = ''
    db_password: str = ''
    db_name: str = 'mudel'

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

    # ------------------------------------------------------------------
    # WhatsApp Cloud API integration
    # ------------------------------------------------------------------
    whatsapp_enabled: bool = False
    whatsapp_access_token: str = ''
    whatsapp_phone_number_id: str = ''
    whatsapp_verify_token: str = ''
    whatsapp_graph_api_version: str = 'v21.0'
    # Phone number that receives new-service-request notifications (E.164 format).
    whatsapp_admin_phone: str = ''

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
    # DB URL construction from components
    # ------------------------------------------------------------------
    @model_validator(mode='after')
    def _build_database_url(self) -> 'Settings':
        # DATABASE_URL takes precedence whenever it is set (local .env and
        # production both point at the same Supabase database). The DB_*
        # components are only used to build a URL when DATABASE_URL is empty.
        if not self.database_url.strip() and self.db_host and self.db_user:
            self.database_url = (
                f'postgresql://{quote_plus(self.db_user)}:{quote_plus(self.db_password)}'
                f'@{self.db_host}:{self.db_port}/{self.db_name}'
            )
        return self

    # ------------------------------------------------------------------
    # Required environment validation
    # ------------------------------------------------------------------
    @model_validator(mode='after')
    def _validate_database_url(self) -> 'Settings':
        if not self.database_url.strip():
            raise ValueError(
                'DATABASE_URL is not set. Provide DATABASE_URL (e.g. the Supabase '
                'connection string) or the DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/'
                'DB_NAME components (docker-compose.yml) in backend/.env or the '
                'environment.'
            )
        return self

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

        # 7. WhatsApp integration must have all required credentials when enabled
        if self.whatsapp_enabled:
            missing = []
            if not self.whatsapp_access_token.strip():
                missing.append('WHATSAPP_ACCESS_TOKEN')
            if not self.whatsapp_phone_number_id.strip():
                missing.append('WHATSAPP_PHONE_NUMBER_ID')
            if not self.whatsapp_verify_token.strip():
                missing.append('WHATSAPP_VERIFY_TOKEN')
            if not self.whatsapp_admin_phone.strip():
                missing.append('WHATSAPP_ADMIN_PHONE')
            if missing:
                errors.append(
                    'WhatsApp integration is enabled but required credentials '
                    f'are missing: {", ".join(missing)}.'
                )

        if errors:
            raise ValueError(
                'Production configuration errors:\n'
                + '\n'.join(f'  - {e}' for e in errors)
            )

        return self

    model_config = {'env_file': '.env', 'case_sensitive': False}


settings = Settings()
