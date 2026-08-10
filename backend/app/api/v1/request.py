from fastapi import APIRouter, Depends, File, Request, UploadFile

from app.api.deps import get_request_service
from app.core.limiter import limiter
from app.schemas.request import (
    ImageUploadOut,
    RequestAccessOut,
    RequestCreate,
    RequestSubmitOut,
)
from app.services.request import RequestService

router = APIRouter()


@router.get('/requests/{token}', response_model=RequestAccessOut)
@limiter.limit('20/minute')
async def get_request_access(
    request: Request,
    token: str,
    request_service: RequestService = Depends(get_request_service),
):
    data = await request_service.get_access(token)
    return RequestAccessOut(data=data)


@router.post('/requests/{token}/images', response_model=ImageUploadOut)
@limiter.limit('10/minute')
async def upload_request_images(
    request: Request,
    token: str,
    files: list[UploadFile] = File(...),
    request_service: RequestService = Depends(get_request_service),
):
    urls = await request_service.upload_images(token, files)
    return ImageUploadOut(data={'urls': urls})


@router.post('/requests/{token}', status_code=201, response_model=RequestSubmitOut)
@limiter.limit('5/minute')
async def submit_request(
    request: Request,
    token: str,
    body: RequestCreate,
    request_service: RequestService = Depends(get_request_service),
):
    created = await request_service.submit(token, body)
    return RequestSubmitOut(
        data={'id': str(created.id), 'request_number': created.request_number}
    )
