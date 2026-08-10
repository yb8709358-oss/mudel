from urllib.parse import urlsplit

ALLOWED_IMAGE_HOSTS = frozenset({'images.unsplash.com'})
ALLOWED_IMAGE_HOST_SUFFIXES = ('.supabase.co',)


def is_allowed_image_url(url: str | None) -> bool:
    """Return True only for HTTPS URLs on explicitly trusted image hosts.

    Never raises. Rejects None, empty strings, malformed URLs, non-https
    schemes (including javascript: and data:), URLs with embedded
    credentials, the bare supabase.co apex domain, and arbitrary hosts.
    """
    if not url:
        return False
    try:
        parts = urlsplit(url)
    except ValueError:
        return False
    if parts.scheme != 'https':
        return False
    if parts.username is not None or parts.password is not None:
        return False
    hostname = (parts.hostname or '').lower()
    if hostname in ALLOWED_IMAGE_HOSTS:
        return True
    return any(hostname.endswith(suffix) for suffix in ALLOWED_IMAGE_HOST_SUFFIXES)
