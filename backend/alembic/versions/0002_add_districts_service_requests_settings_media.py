"""Add districts, service_requests, settings, media; alter technician_services

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- 1. districts ---
    op.create_table(
        'districts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0'),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true()),
    )
    op.create_index('ix_districts_slug', 'districts', ['slug'], unique=True)

    op.create_table(
        'district_translations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('district_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('districts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('locale', sa.String(5), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
    )
    op.create_unique_constraint(
        'uq_district_translations_district_locale',
        'district_translations',
        ['district_id', 'locale'],
    )

    # --- 2. technician_districts (many-to-many junction) ---
    op.create_table(
        'technician_districts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('technician_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('technicians.id', ondelete='CASCADE'), nullable=False),
        sa.Column('district_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('districts.id', ondelete='CASCADE'), nullable=False),
    )
    op.create_unique_constraint(
        'uq_technician_districts_tech_district',
        'technician_districts',
        ['technician_id', 'district_id'],
    )

    # --- 3. service_requests ---
    op.create_table(
        'service_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('customer_name', sa.String(200), nullable=False),
        sa.Column('customer_phone', sa.String(20), nullable=False),
        sa.Column('customer_email', sa.String(200), nullable=True),
        sa.Column('service_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('services.id'), nullable=False),
        sa.Column('technician_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('technicians.id'), nullable=True),
        sa.Column('district_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('districts.id'), nullable=True),
        sa.Column('preferred_date', sa.Date(), nullable=True),
        sa.Column('preferred_time', sa.String(50), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('admin_notes', sa.Text(), nullable=True),
    )
    op.create_index('ix_service_requests_status', 'service_requests', ['status'])
    op.create_index('ix_service_requests_created', 'service_requests', ['created_at'])

    # --- 4. settings (key-value) ---
    op.create_table(
        'settings',
        sa.Column('key', sa.String(100), primary_key=True),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- 5. media (replaces technician_photos) ---
    op.create_table(
        'media',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('technician_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('technicians.id', ondelete='CASCADE'), nullable=True),
        sa.Column('service_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('services.id', ondelete='CASCADE'), nullable=True),
        sa.Column('url', sa.String(500), nullable=False),
        sa.Column('caption', sa.String(200), nullable=True),
        sa.Column('alt_text', sa.String(200), nullable=True),
        sa.Column('media_type', sa.String(20), nullable=False, server_default='image'),
        sa.Column('sort_order', sa.Integer(), server_default='0'),
    )
    op.create_check_constraint(
        'media_owner_check',
        'media',
        'technician_id IS NOT NULL OR service_id IS NOT NULL',
    )

    # --- 6. Migrate data: technician_photos → media ---
    op.execute("""
    INSERT INTO media (
        id,
        technician_id,
        url,
        caption,
        sort_order,
        media_type
    )
    SELECT
        id,
        technician_id,
        url,
        caption,
        sort_order,
        'image'
    FROM technician_photos
""")
    op.drop_table('technician_photos')

    # --- 7. Alter technician_services: drop price_range, add numeric pricing ---
    op.drop_column('technician_services', 'price_range')
    op.add_column('technician_services', sa.Column('estimated_price_min', sa.Numeric(10, 2), nullable=True))
    op.add_column('technician_services', sa.Column('estimated_price_max', sa.Numeric(10, 2), nullable=True))


def downgrade() -> None:
    # Restore technician_services
    op.drop_column('technician_services', 'estimated_price_max')
    op.drop_column('technician_services', 'estimated_price_min')
    op.add_column('technician_services', sa.Column('price_range', sa.String(50), nullable=True))

    # Recreate technician_photos from media
    op.create_table(
        'technician_photos',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('technician_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('technicians.id', ondelete='CASCADE'), nullable=False),
        sa.Column('url', sa.String(500), nullable=False),
        sa.Column('caption', sa.String(200), nullable=True),
        sa.Column('sort_order', sa.Integer(), server_default='0'),
    )
    op.execute("""
        INSERT INTO technician_photos (id, technician_id, url, caption, sort_order)
        SELECT id, technician_id, url, caption, sort_order
        FROM media
        WHERE technician_id IS NOT NULL
    """)
    op.drop_table('media')
    op.drop_table('settings')
    op.drop_table('service_requests')
    op.drop_table('technician_districts')
    op.drop_table('district_translations')
    op.drop_table('districts')
