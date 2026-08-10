"""Add district column to contact_messages

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0004'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # district is NOT NULL in the model; use an empty-string server_default so
    # the column can be added to tables that may already contain rows.
    op.add_column(
        'contact_messages',
        sa.Column('district', sa.String(100), nullable=False, server_default=''),
    )
    op.alter_column('contact_messages', 'district', server_default=None)


def downgrade() -> None:
    op.drop_column('contact_messages', 'district')
