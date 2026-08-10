from fastapi import APIRouter

from app.api.v1 import (
    admin_contact,
    admin_dashboard,
    admin_districts,
    admin_service_requests,
    admin_services,
    admin_settings,
    admin_technicians,
    contact,
    districts,
    health,
    request,
    service_requests,
    services,
    settings,
    technicians,
)

api_router = APIRouter()

# Health routes (no /api/v1 prefix — mounted at /api/v1 via router prefix)
api_router.include_router(health.router, tags=['health'])

# Public routes
api_router.include_router(services.router, tags=['services'])
api_router.include_router(technicians.router, tags=['technicians'])
api_router.include_router(districts.router, tags=['districts'])
api_router.include_router(settings.router, tags=['settings'])
api_router.include_router(service_requests.router, tags=['service-requests'])
api_router.include_router(contact.router, tags=['contact'])
api_router.include_router(request.router, tags=['requests'])

# Admin routes
api_router.include_router(admin_services.router, prefix='/admin', tags=['admin-services'])
api_router.include_router(admin_technicians.router, prefix='/admin', tags=['admin-technicians'])
api_router.include_router(admin_districts.router, prefix='/admin', tags=['admin-districts'])
api_router.include_router(admin_contact.router, prefix='/admin', tags=['admin-contact'])
api_router.include_router(admin_settings.router, prefix='/admin', tags=['admin-settings'])
api_router.include_router(admin_dashboard.router, prefix='/admin', tags=['admin-dashboard'])
api_router.include_router(admin_service_requests.router, prefix='/admin', tags=['admin-service-requests'])
