from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import AppError
from app.core.limiter import limiter, _storage_uri
from app.core.logging import logger, setup_logging
from app.middleware.security import SecurityHeadersMiddleware

setup_logging(settings.environment)


class CharsetJSONResponse(JSONResponse):
    media_type = 'application/json; charset=utf-8'


@asynccontextmanager
async def lifespan(app: FastAPI):
    if '*' in settings.cors_origin_list:
        logger.warning("CORS is configured to allow all origins ('*'). This should never be used in production.")
    if settings.admin_api_secret == 'change-me-in-production':
        logger.warning("ADMIN_API_SECRET is using the default insecure value! Set ADMIN_API_SECRET env var.")
    if not settings.supabase_service_role_key or not settings.supabase_project_url:
        logger.warning(
            "Supabase Storage is not configured (SUPABASE_SERVICE_ROLE_KEY missing). "
            "Request image uploads will be unavailable."
        )
    logger.info("Starting Mudel backend", environment=settings.environment, debug=settings.debug)
    if _storage_uri.startswith('redis'):
        logger.info("Rate limiter using Redis storage", redis_url=_storage_uri)
    else:
        if settings.environment == 'production':
            logger.error("Rate limiter falling back to MEMORY storage in production! Set REDIS_URL.")
        else:
            logger.warning("Rate limiter using in-memory storage (development only). Set REDIS_URL for production.")
    yield
    logger.info("Shutting down Mudel backend")
    from app.core.database import engine
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url='/docs' if settings.environment != 'production' else None,
    redoc_url='/redoc' if settings.environment != 'production' else None,
    default_response_class=CharsetJSONResponse,
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return CharsetJSONResponse(
        status_code=429,
        content={'success': False, 'error': {'code': 'RATE_LIMIT_EXCEEDED', 'message': str(exc.detail)}},
    )


@app.exception_handler(RequestValidationError)
async def request_validation_handler(request: Request, exc: RequestValidationError):
    details: list[str] = []
    for err in exc.errors():
        loc = '.'.join(str(part) for part in err.get('loc', []))
        details.append(f'{loc}: {err.get("msg", "Invalid value")}')
    return CharsetJSONResponse(
        status_code=422,
        content={
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'Request validation failed.',
                'details': details,
            },
        },
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allow_headers=['Content-Type', 'X-Admin-Secret'],
)

app.add_middleware(SecurityHeadersMiddleware)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    logger.warning("App error", code=exc.code, message=exc.message)
    return CharsetJSONResponse(
        status_code=exc.status_code,
        content={
            'success': False,
            'error': {
                'code': exc.code,
                'message': exc.message,
                'details': getattr(exc, 'details', None),
            },
        },
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error", path=request.url.path, method=request.method)
    return CharsetJSONResponse(
        status_code=500,
        content={
            'success': False,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'An unexpected error occurred.',
            },
        },
    )


app.include_router(api_router, prefix='/api/v1')
