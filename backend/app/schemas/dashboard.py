from pydantic import BaseModel


class StatusCount(BaseModel):
    status: str
    count: int


class DashboardSummary(BaseModel):
    services: int
    technicians: int
    districts: int
    contact_messages: int
    contact_unread: int
    service_requests: int
    service_requests_by_status: list[StatusCount]
