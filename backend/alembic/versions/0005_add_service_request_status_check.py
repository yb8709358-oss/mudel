"""no-op migration to keep the Alembic chain consistent.

The live database has no `chk_service_request_status` constraint on
`service_requests` and intentionally does not need one: status values are
validated by the application (Pydantic schema) using the existing convention
(pending / contacted / confirmed / completed / cancelled). This migration is
kept as an explicit no-op so the chain from the applied `0004` stays single
headed. It MUST NOT create the constraint and MUST NOT modify service_requests.

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-05

"""
from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = '0005'
down_revision: str | None = '0004'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
