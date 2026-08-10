"""Bootstrap missing request-flow schema for fresh databases

Why this migration exists
-------------------------
The migration chain 0001-0006 could never create a database from scratch:
0003, 0004 and 0006 modify `contact_messages`, but no migration created it
(0001 only dropped it on downgrade), and the request-flow columns on
`service_requests` (request_number, contact_message_id, address, latitude,
longitude, attachments) were never added by any migration.

The live database was created via metadata.create_all + hand-patching,
stamped, and is already at revision 0006 and consistent with 0003-0006.
This migration is therefore intentionally IDEMPOTENT: every DDL is guarded so
that

  * a FRESH database is bootstrapped to the current model schema, and
  * an EXISTING database (live, at 0006) is a safe no-op.

It never destroys customer data and never recreates existing tables.

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-08

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '0007'
down_revision: str | None = '0006'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(name)


def _has_column(table: str, column: str) -> bool:
    return any(col['name'] == column for col in sa.inspect(op.get_bind()).get_columns(table))


def _has_constraint(table: str, name: str) -> bool:
    insp = sa.inspect(op.get_bind())
    for kind in ('get_unique_constraints', 'get_foreign_keys', 'get_check_constraints'):
        for c in getattr(insp, kind)(table):
            if c['name'] == name:
                return True
    return False


def upgrade() -> None:
    # --- A. contact_messages bootstrap (missing entirely from 0001-0006) ------
    # Only reached when the table is missing (e.g. a chain that was applied from
    # a state that predated the 0001 fix). Uses the full final column set.
    if not _table_exists('contact_messages'):
        op.create_table(
            'contact_messages',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('phone', sa.String(20), nullable=False),
            sa.Column('district', sa.String(100), nullable=False, server_default=''),
            sa.Column('email', sa.String(200), nullable=True),
            sa.Column('service_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('services.id', ondelete='SET NULL'), nullable=True),
            sa.Column('message', sa.Text(), nullable=True),
            sa.Column('is_read', sa.Boolean()),
            sa.Column('request_token', sa.String(100), nullable=True),
            sa.Column('request_token_expires_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('request_token_consumed_at', sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index('ix_contact_messages_created', 'contact_messages', ['created_at'])
        op.create_index('ix_contact_messages_request_token', 'contact_messages', ['request_token'], unique=True)
        # 0004 added `district` with a transient server_default then dropped it;
        # replicate that end state so the table matches the model exactly.
        op.execute('ALTER TABLE contact_messages ALTER COLUMN district DROP DEFAULT')

    # --- B. service_requests request-flow columns ------------------------------
    _add_missing = [
        ('request_number', sa.Column('request_number', sa.String(30), nullable=True)),
        ('contact_message_id', sa.Column('contact_message_id', postgresql.UUID(as_uuid=True), nullable=True)),
        ('address', sa.Column('address', sa.Text(), nullable=True)),
        ('latitude', sa.Column('latitude', sa.Float(), nullable=True)),
        ('longitude', sa.Column('longitude', sa.Float(), nullable=True)),
        ('attachments', sa.Column('attachments', postgresql.JSONB(), nullable=True)),
    ]
    for name, column in _add_missing:
        if not _has_column('service_requests', name):
            op.add_column('service_requests', column)

    # --- C. UNIQUE index on request_number ------------------------------------
    # The model declares `request_number = Column(..., unique=True, index=True)`,
    # which SQLAlchemy renders on PostgreSQL as a unique INDEX (not a unique
    # constraint). Create it with IF NOT EXISTS so this is a no-op when the live
    # database already has it (it was created there by metadata.create_all).
    op.execute('CREATE UNIQUE INDEX IF NOT EXISTS ix_service_requests_request_number ON service_requests (request_number)')

    # --- D. FK contact_message_id -> contact_messages(id), NO ACTION -----------
    # Matches the model's ForeignKey('contact_messages.id') (no ondelete clause).
    if not _has_constraint('service_requests', 'service_requests_contact_message_id_fkey'):
        op.execute(
            'ALTER TABLE service_requests ADD CONSTRAINT service_requests_contact_message_id_fkey '
            'FOREIGN KEY (contact_message_id) REFERENCES contact_messages (id)'
        )

    # --- E. index on contact_message_id (matches model index=True) -------------
    op.execute('CREATE INDEX IF NOT EXISTS ix_service_requests_contact_message_id ON service_requests (contact_message_id)')


def downgrade() -> None:
    # Reverses what upgrade() adds on a fresh database. Guarded so it can be
    # cleanly reverted in dev/fresh environments. NEVER downgrade this on the
    # live database: the objects it drops were created outside migrations there.
    insp = sa.inspect(op.get_bind())
    existing = {col['name'] for col in insp.get_columns('service_requests')}
    for name in ('request_number', 'contact_message_id', 'address', 'latitude', 'longitude', 'attachments'):
        if name in existing:
            op.drop_column('service_requests', name)
    op.execute('DROP INDEX IF EXISTS ix_service_requests_contact_message_id')
