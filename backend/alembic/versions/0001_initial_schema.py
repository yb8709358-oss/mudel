"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-07-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table(
        'services',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('icon', sa.String(50), nullable=False, server_default='wrench'),
        sa.Column('sort_order', sa.Integer(), server_default='0'),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true()),
    )
    op.create_index('ix_services_slug', 'services', ['slug'], unique=True)

    op.create_table(
        'contact_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('phone', sa.String(20), nullable=False),
        sa.Column('email', sa.String(200), nullable=True),
        sa.Column('service_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('services.id', ondelete='SET NULL'), nullable=True),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('is_read', sa.Boolean()),
    )
    op.create_index('ix_contact_messages_created', 'contact_messages', ['created_at'])

    op.create_table(
        'service_translations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('service_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('services.id', ondelete='CASCADE'), nullable=False),
        sa.Column('locale', sa.String(5), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('meta_title', sa.String(70), nullable=True),
        sa.Column('meta_desc', sa.String(160), nullable=True),
    )
    op.create_unique_constraint('uq_service_translations_service_locale', 'service_translations', ['service_id', 'locale'])
    op.create_index('ix_service_translations_locale', 'service_translations', ['locale'])

    op.create_table(
        'technicians',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('slug', sa.String(200), nullable=False),
        sa.Column('phone', sa.String(20), nullable=False),
        sa.Column('whatsapp', sa.String(20), nullable=True),
        sa.Column('email', sa.String(200), nullable=True),
        sa.Column('photo_url', sa.String(500), nullable=True),
        sa.Column('rating', sa.Numeric(2, 1), server_default='5.0'),
        sa.Column('review_count', sa.Integer(), server_default='0'),
        sa.Column('service_area', sa.String(300), nullable=True),
        sa.Column('working_hours', postgresql.JSONB(), nullable=True),
        sa.Column('languages', postgresql.JSONB(), nullable=True),
        sa.Column('years_exp', sa.Integer(), nullable=True),
        sa.Column('is_featured', sa.Boolean(), server_default=sa.false()),
        sa.Column('is_available', sa.Boolean(), server_default=sa.true()),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true()),
        sa.Column('sort_order', sa.Integer(), server_default='0'),
    )
    op.create_index('ix_technicians_slug', 'technicians', ['slug'], unique=True)

    op.create_table(
        'technician_translations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('technician_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('technicians.id', ondelete='CASCADE'), nullable=False),
        sa.Column('locale', sa.String(5), nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
    )
    op.create_unique_constraint('uq_technician_translations_tech_locale', 'technician_translations', ['technician_id', 'locale'])

    op.create_table(
        'technician_services',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('technician_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('technicians.id', ondelete='CASCADE'), nullable=False),
        sa.Column('service_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('services.id', ondelete='CASCADE'), nullable=False),
        sa.Column('price_range', sa.String(50), nullable=True),
    )
    op.create_unique_constraint('uq_technician_services_tech_service', 'technician_services', ['technician_id', 'service_id'])

    op.create_table(
        'technician_photos',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('technician_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('technicians.id', ondelete='CASCADE'), nullable=False),
        sa.Column('url', sa.String(500), nullable=False),
        sa.Column('caption', sa.String(200), nullable=True),
        sa.Column('sort_order', sa.Integer(), server_default='0'),
    )

def downgrade() -> None:
    op.drop_table('contact_messages')
    op.drop_table('technician_photos')
    op.drop_table('technician_services')
    op.drop_table('technician_translations')
    op.drop_table('technicians')
    op.drop_table('service_translations')
    op.drop_table('services')
