import hmac

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import AppError
from app.repositories.contact import ContactRepository
from app.repositories.district import DistrictRepository
from app.repositories.request import RequestRepository
from app.repositories.service import ServiceRepository
from app.repositories.service_request import ServiceRequestRepository
from app.repositories.settings import SettingsRepository
from app.repositories.technician import TechnicianRepository
from app.services.contact import ContactService
from app.services.dashboard import DashboardService
from app.services.district import DistrictService
from app.services.request import RequestService
from app.services.service import ServiceService
from app.services.service_request import ServiceRequestService
from app.services.settings import SettingsService
from app.services.storage import StorageService
from app.services.technician import TechnicianService


async def get_service_repo(db: AsyncSession = Depends(get_db)) -> ServiceRepository:
    return ServiceRepository(db)


async def get_technician_repo(db: AsyncSession = Depends(get_db)) -> TechnicianRepository:
    return TechnicianRepository(db)


async def get_contact_repo(db: AsyncSession = Depends(get_db)) -> ContactRepository:
    return ContactRepository(db)


async def get_district_repo(db: AsyncSession = Depends(get_db)) -> DistrictRepository:
    return DistrictRepository(db)


async def get_settings_repo(db: AsyncSession = Depends(get_db)) -> SettingsRepository:
    return SettingsRepository(db)


async def get_request_repo(db: AsyncSession = Depends(get_db)) -> RequestRepository:
    return RequestRepository(db)


async def get_storage_service() -> StorageService:
    return StorageService()


async def get_service_request_repo(db: AsyncSession = Depends(get_db)) -> ServiceRequestRepository:
    return ServiceRequestRepository(db)


async def get_service_service(repo: ServiceRepository = Depends(get_service_repo)) -> ServiceService:
    return ServiceService(repo)


async def get_technician_service(repo: TechnicianRepository = Depends(get_technician_repo)) -> TechnicianService:
    return TechnicianService(repo)


async def get_contact_service(repo: ContactRepository = Depends(get_contact_repo)) -> ContactService:
    return ContactService(repo)


async def get_district_service(repo: DistrictRepository = Depends(get_district_repo)) -> DistrictService:
    return DistrictService(repo)


async def get_settings_service(repo: SettingsRepository = Depends(get_settings_repo)) -> SettingsService:
    return SettingsService(repo)


async def get_service_request_service(
    repo: ServiceRequestRepository = Depends(get_service_request_repo),
) -> ServiceRequestService:
    return ServiceRequestService(repo)


async def get_request_service(
    repo: RequestRepository = Depends(get_request_repo),
    storage: StorageService = Depends(get_storage_service),
) -> RequestService:
    return RequestService(repo, storage)


async def get_dashboard_service(
    service_repo: ServiceRepository = Depends(get_service_repo),
    technician_repo: TechnicianRepository = Depends(get_technician_repo),
    district_repo: DistrictRepository = Depends(get_district_repo),
    contact_repo: ContactRepository = Depends(get_contact_repo),
    sr_repo: ServiceRequestRepository = Depends(get_service_request_repo),
) -> DashboardService:
    return DashboardService(
        service_repo=service_repo,
        technician_repo=technician_repo,
        district_repo=district_repo,
        contact_repo=contact_repo,
        sr_repo=sr_repo,
    )


async def require_admin(x_admin_secret: str | None = Header(default=None)) -> None:
    if (
        not x_admin_secret
        or not hmac.compare_digest(
            x_admin_secret,
            settings.admin_api_secret,
        )
    ):
        raise AppError(
            code="UNAUTHORIZED",
            message="Admin authentication required.",
            status_code=401,
        )
