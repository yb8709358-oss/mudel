from app.models.contact import ContactMessage
from app.models.district import District
from app.models.service import Service
from app.models.service_request import ServiceRequest
from app.models.technician import Technician
from app.repositories.contact import ContactRepository
from app.repositories.district import DistrictRepository
from app.repositories.service import ServiceRepository
from app.repositories.service_request import ServiceRequestRepository
from app.repositories.technician import TechnicianRepository


class DashboardService:
    SERVICE_REQUEST_STATUSES = ('pending', 'contacted', 'confirmed', 'completed', 'cancelled')

    def __init__(
        self,
        service_repo: ServiceRepository,
        technician_repo: TechnicianRepository,
        district_repo: DistrictRepository,
        contact_repo: ContactRepository,
        sr_repo: ServiceRequestRepository,
    ):
        self.service_repo = service_repo
        self.technician_repo = technician_repo
        self.district_repo = district_repo
        self.contact_repo = contact_repo
        self.sr_repo = sr_repo

    async def summary(self) -> dict:
        contact_total = await self.contact_repo.count(ContactMessage)
        contact_unread = await self.contact_repo.count(
            ContactMessage, filters=ContactMessage.is_read == False
        )
        sr_total = await self.sr_repo.count(ServiceRequest)
        status_counts = []
        for status in self.SERVICE_REQUEST_STATUSES:
            status_counts.append({
                'status': status,
                'count': await self.sr_repo.count(
                    ServiceRequest, filters=ServiceRequest.status == status
                ),
            })

        return {
            'services': await self.service_repo.count(Service),
            'technicians': await self.technician_repo.count(Technician),
            'districts': await self.district_repo.count(District),
            'contact_messages': contact_total,
            'contact_unread': contact_unread,
            'service_requests': sr_total,
            'service_requests_by_status': status_counts,
        }
