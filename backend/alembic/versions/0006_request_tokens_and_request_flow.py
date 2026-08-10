"""request_tokens_for_contact_messages

Adds the per-contact "complete your request" token columns to
`contact_messages`. This is the ONLY database change the request flow
requires: the live `service_requests` table already has every field the flow
needs (request_number UNIQUE, contact_message_id FK, address TEXT,
latitude/longitude DOUBLE PRECISION, attachments jsonb, service_id NOT NULL,
status default 'pending').

This migration MUST NOT touch service_requests and MUST NOT add invented
columns (gps_latitude, gps_longitude, images, district_name, additional_notes)
or any CHECK constraint.

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-07

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = '0006'
down_revision: str | None = '0005'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('contact_messages', sa.Column('request_token', sa.String(100), nullable=True))
    op.add_column('contact_messages', sa.Column('request_token_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('contact_messages', sa.Column('request_token_consumed_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(
        'ix_contact_messages_request_token',
        'contact_messages',
        ['request_token'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index('ix_contact_messages_request_token', table_name='contact_messages')
    op.drop_column('contact_messages', 'request_token_consumed_at')
    op.drop_column('contact_messages', 'request_token_expires_at')
    op.drop_column('contact_messages', 'request_token')
