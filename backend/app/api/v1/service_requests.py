from fastapi import APIRouter, Depends, Request

from app.api.deps import get_service_request_service
from app.core.limiter import limiter
from app.schemas.service_request import ServiceRequestCreate, ServiceRequestCreatedOut
from app.services.service_request import ServiceRequestService

router = APIRouter()


@router.post('/service-requests', status_code=201, response_model=ServiceRequestCreatedOut)
@limiter.limit('5/minute')
async def submit_service_request(
    request: Request,
    body: ServiceRequestCreate,
    sr_service: ServiceRequestService = Depends(get_service_request_service),
):
    created_request = await sr_service.submit(
        customer_name=body.customer_name,
        customer_phone=body.customer_phone,
        customer_email=body.customer_email,
        service_id=body.service_id,
        technician_id=body.technician_id,
        district_id=body.district_id,
        preferred_date=body.preferred_date,
        preferred_time=body.preferred_time,
        description=body.description,
    )
    return ServiceRequestCreatedOut(
        data={'id': str(created_request.id), 'message': 'Service request submitted successfully'}
    )
