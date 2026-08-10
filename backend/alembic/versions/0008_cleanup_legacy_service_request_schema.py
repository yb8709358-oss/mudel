"""Clean up legacy service_requests schema

Why this migration exists
-------------------------
The live database's `service_requests` table predates the Alembic migration
chain (0001-0007). It was originally created via metadata.create_all and hand-
patched, so it still carries 11 legacy columns — whatsapp_sent, whatsapp_sent_at,
confirmation_token, customer_confirmed, confirmed_at, estimated_price,
final_price, assigned_at, completed_at, cancelled_at, cancel_reason — that no
migration ever created and no application code reads or writes. An exhaustive
search of backend/app, backend/tests, backend/alembic and frontend/src found
ZERO runtime references to these fields, and they contain no meaningful data
(verified: no rows are TRUE / non-NULL).

Two duplicate indexes also exist on the live database:

  * idx_service_requests_contact        (duplicates ix_service_requests_contact_message_id)
  * idx_service_requests_status         (duplicates ix_service_requests_status)

and the UNIQUE constraint service_requests_request_number_key duplicates the
model's unique index ix_service_requests_request_number.

This migration:

  * runs READ-ONLY pre-flight checks before any DDL and STOPS (raises) if an
    unexpected dependency is discovered, so nothing is modified on failure,
  * drops ONLY the 11 legacy columns, the 2 duplicate indexes and the 1
    redundant UNIQUE constraint — no CASCADE, no other columns or objects,
  * is a no-op on a fresh database produced by `alembic upgrade head`, because
    those objects do not exist there.

Safety notes
------------
* This migration is designed to be applied to the live database ONLY after the
  pre-flight checks are reviewed; every check is read-only and runs inside the
  migration transaction, so a raised exception rolls the whole migration back.
* The downgrade re-creates the removed objects with best-known types but CANNOT
  restore historical data, nor the exact original type/default definitions (the
  historical migration chain never captured them). It is intended for
  disposable / dev databases only — do NOT downgrade this on the live database.
* 0001-0007 are not modified.

Revision ID: 0008
Revises: 0007
Create Date: 2026-08-09

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '0008'
down_revision: str | None = '0007'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# ---------------------------------------------------------------------------
# Legacy columns removed by this migration, with the best-known types used when
# re-creating them on downgrade. All are nullable.
# ---------------------------------------------------------------------------
LEGACY_COLUMNS: dict[str, sa.Column] = {
    'whatsapp_sent': sa.Column('whatsapp_sent', sa.Boolean(), nullable=True),
    'whatsapp_sent_at': sa.Column('whatsapp_sent_at', sa.DateTime(timezone=True), nullable=True),
    'confirmation_token': sa.Column('confirmation_token', postgresql.UUID(as_uuid=True), nullable=True),
    'customer_confirmed': sa.Column('customer_confirmed', sa.Boolean(), nullable=True),
    'confirmed_at': sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
    'estimated_price': sa.Column('estimated_price', sa.Numeric(), nullable=True),
    'final_price': sa.Column('final_price', sa.Numeric(), nullable=True),
    'assigned_at': sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=True),
    'completed_at': sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    'cancelled_at': sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
    'cancel_reason': sa.Column('cancel_reason', sa.Text(), nullable=True),
}

# Regex matching the legacy column names as whole words (so estimated_price_min /
# estimated_price_max, technician.whatsapp etc. are NOT false positives).
LEGACY_NAME_PATTERN = (
    r'\m(?:whatsapp_sent_at|whatsapp_sent|confirmation_token|customer_confirmed|'
    r'confirmed_at|estimated_price|final_price|assigned_at|completed_at|'
    r'cancelled_at|cancel_reason)\M'
)

_BOOLEAN_COLUMNS = {'whatsapp_sent', 'customer_confirmed'}


def _query(sql: str, **params) -> list[dict]:
    rows = op.get_bind().execute(sa.text(sql), params).fetchall()
    return [dict(row._mapping) for row in rows]


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


def _preflight_checks() -> None:
    """Read-only dependency checks. Raise RuntimeError if anything unexpected is found."""
    # A. Foreign keys referencing service_requests (expected: none).
    fks = _query(
        'SELECT conrelid::regclass AS source_table, conname, pg_get_constraintdef(oid) AS definition '
        'FROM pg_constraint '
        "WHERE confrelid = 'service_requests'::regclass"
    )
    if fks:
        raise RuntimeError(
            f'Pre-flight check A FAILED: foreign keys reference service_requests '
            f'(expected none): {fks!r} — aborting 0008.'
        )

    # B. User triggers on service_requests (expected: none).
    triggers = _query(
        'SELECT tgname, pg_get_triggerdef(oid) AS definition '
        'FROM pg_trigger '
        "WHERE tgrelid = 'service_requests'::regclass AND NOT tgisinternal"
    )
    if triggers:
        raise RuntimeError(
            f'Pre-flight check B FAILED: unexpected triggers on service_requests '
            f'(expected none): {triggers!r} — aborting 0008.'
        )

    # C. Functions referencing the legacy columns (expected: none).
    funcs = _query(
        'SELECT n.nspname AS schema, p.proname AS name '
        'FROM pg_proc p '
        'JOIN pg_namespace n ON n.oid = p.pronamespace '
        "WHERE p.prokind <> 'a' AND pg_get_functiondef(p.oid) ~ :pattern",
        pattern=LEGACY_NAME_PATTERN,
    )
    if funcs:
        raise RuntimeError(
            f'Pre-flight check C FAILED: functions reference legacy columns '
            f'(expected none): {funcs!r} — aborting 0008.'
        )

    # D. Views / materialized views referencing the legacy columns (expected: none).
    views = _query(
        'SELECT c.oid::regclass AS view_name '
        'FROM pg_class c '
        'JOIN pg_namespace n ON n.oid = c.relnamespace '
        "WHERE c.relkind IN ('v', 'm') AND pg_get_viewdef(c.oid) ~ :pattern",
        pattern=LEGACY_NAME_PATTERN,
    )
    if views:
        raise RuntimeError(
            f'Pre-flight check D FAILED: views reference legacy columns '
            f'(expected none): {views!r} — aborting 0008.'
        )

    # E. The duplicate indexes must have the expected single-column definitions.
    indexes = {
        row['indexname']: row['indexdef']
        for row in _query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'service_requests'")
    }
    for index_name, column in (
        ('idx_service_requests_contact', 'contact_message_id'),
        ('idx_service_requests_status', 'status'),
    ):
        if index_name not in indexes:
            continue  # already absent — nothing to validate
        if f'({column})' not in indexes[index_name]:
            raise RuntimeError(
                f'Pre-flight check E FAILED: index {index_name} has unexpected definition '
                f'{indexes[index_name]!r} (expected a single-column index on {column}) '
                f'— aborting 0008.'
            )

    # F. The legacy columns must be empty / NULL (already verified manually).
    # Column names come from the hard-coded LEGACY_COLUMNS constant, never from
    # user input, so this dynamic SELECT is not an injection vector.
    predicates = []
    for col in LEGACY_COLUMNS:
        if col in _BOOLEAN_COLUMNS:
            predicates.append(f'COUNT(*) FILTER (WHERE {col} = true) AS c_{col}')
        else:
            predicates.append(f'COUNT(*) FILTER (WHERE {col} IS NOT NULL) AS c_{col}')
    counts = _query('SELECT ' + ', '.join(predicates) + ' FROM service_requests')[0]  # noqa: S608
    flagged = {k: v for k, v in counts.items() if v}
    if flagged:
        raise RuntimeError(
            f'Pre-flight check F FAILED: legacy columns contain meaningful data '
            f'(expected all empty/NULL): {flagged!r} — aborting 0008.'
        )


def upgrade() -> None:
    # No-op on a fresh database produced by `alembic upgrade head`: the legacy
    # columns and duplicate objects do not exist there, so there is nothing to
    # check or remove.
    if not _table_exists('service_requests'):
        return
    if not any(_has_column('service_requests', name) for name in LEGACY_COLUMNS):
        return

    _preflight_checks()

    # A. Redundant UNIQUE constraint (duplicates ix_service_requests_request_number).
    op.execute(
        'ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS service_requests_request_number_key'
    )

    # B. Duplicate index on contact_message_id.
    op.execute('DROP INDEX IF EXISTS idx_service_requests_contact')

    # C. Duplicate index on status.
    op.execute('DROP INDEX IF EXISTS idx_service_requests_status')

    # D. Legacy columns (11), guarded with IF EXISTS, never CASCADE.
    for name in LEGACY_COLUMNS:
        op.execute(f'ALTER TABLE service_requests DROP COLUMN IF EXISTS {name}')


def downgrade() -> None:
    """Re-create the legacy objects with best-known types.

    NOTE: this cannot restore historical data, nor the exact original type /
    default definitions (the historical migration chain never captured them).
    Intended for disposable / dev databases only — do NOT downgrade this on the
    live database.
    """
    if not _table_exists('service_requests'):
        return

    # A. Re-create the redundant UNIQUE constraint (if not already present).
    if not _has_constraint('service_requests', 'service_requests_request_number_key'):
        op.execute(
            'ALTER TABLE service_requests ADD CONSTRAINT service_requests_request_number_key '
            'UNIQUE (request_number)'
        )

    # B/C. Re-create the duplicate indexes.
    op.execute(
        'CREATE INDEX IF NOT EXISTS idx_service_requests_contact ON service_requests (contact_message_id)'
    )
    op.execute('CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests (status)')

    # D. Re-create the 11 legacy columns as nullable with best-known types.
    for name, column in LEGACY_COLUMNS.items():
        if not _has_column('service_requests', name):
            op.add_column('service_requests', column)
