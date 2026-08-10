from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings


def _build_storage_uri() -> str:
    """Build the slowapi storage URI from settings.

    Returns:
        ``redis://...`` when REDIS_URL is configured,
        ``memory://`` otherwise (development only).
    """
    url = settings.redis_url.strip()
    if url:
        return url
    return 'memory://'


_storage_uri = _build_storage_uri()
_is_memory = _storage_uri == 'memory://'

# In production Redis is required — fallback must never be enabled.
# In development, enable fallback so the app still works without Redis.
_fallback_enabled = _is_memory and settings.environment == 'development'

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_storage_uri,
    default_limits=[],
    in_memory_fallback=[],
    in_memory_fallback_enabled=_fallback_enabled,
    swallow_errors=_is_memory,
)
