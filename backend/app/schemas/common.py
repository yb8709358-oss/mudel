import json

from pydantic import BaseModel


def normalize_attachments(value: object) -> list[str]:
    """Coerce any stored/sent representation of request attachments to a list.

    Historical writes stored the column as None, the literal text ``"null"``,
    or a JSON-encoded array as text (double-encoded in a JSONB column). All of
    those, plus a proper list, are accepted and returned as a clean list of
    URL strings so the admin API always exposes a renderable array.
    """
    if value is None:
        return []
    if isinstance(value, str):
        stripped = value.strip()
        if stripped in ('', 'null', '[]'):
            return []
        try:
            parsed = json.loads(stripped)
        except json.JSONDecodeError:
            return [stripped]
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
        return [str(parsed)] if parsed is not None else []
    if isinstance(value, (list, tuple)):
        return [str(item) for item in value]
    return [str(value)]


class PaginationMeta(BaseModel):
    total: int
    limit: int
    offset: int


class PaginatedServiceListOut(BaseModel):
    success: bool = True
    data: list
    meta: PaginationMeta


class PaginatedTechnicianListOut(BaseModel):
    success: bool = True
    data: list
    meta: PaginationMeta


class PaginatedContactListOut(BaseModel):
    success: bool = True
    data: list
    meta: PaginationMeta


class PaginatedDistrictListOut(BaseModel):
    success: bool = True
    data: list
    meta: PaginationMeta


class PaginatedServiceRequestListOut(BaseModel):
    success: bool = True
    data: list
    meta: PaginationMeta


class DataResponse(BaseModel):
    success: bool = True
    data: dict | list
