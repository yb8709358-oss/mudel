# Fixes Applied — CTO Audit Follow-up

This documents every change made after the initial audit, in the order they
matter. Everything below was verified (backend: import + route registration
tested directly; frontend: `tsc --noEmit`, `eslint`, and `npm run build` up
to the webpack font-fetch step, which fails only because this sandbox has no
access to fonts.googleapis.com — it will work fine on Vercel/any normal
machine with internet access).

## Migration chain repair (2026-08-08)

The Alembic chain (0001–0006) could **never create a database from scratch** —
the live DB was built with `metadata.create_all` + hand-patching and stamped.
Audit findings and fixes:

1. **0001 never created `contact_messages`** (its `downgrade` dropped it, but
   the `upgrade` had no `create_table`), yet 0003/0004/0006 all modify it.
   → Added `contact_messages` (with `ix_contact_messages_created`) to the 0001
   `upgrade`, immediately after the `services` table. `is_read` is left
   **nullable** to match the model (`Column(Boolean, default=False)` — the
   live DB is nullable too).
2. **0003 `downgrade` dropped 4 constraints by `None`** — an invalid name that
   made `downgrade` blow up on any Postgres. → Named them per Postgres'
   auto-generated `{table}_{column}_fkey` convention (`service_requests_*` and
   `contact_messages_service_id_fkey`).
3. **The request-flow columns on `service_requests` (`request_number`,
   `contact_message_id`, `address`, `latitude`, `longitude`, `attachments`)
   plus their UNIQUE index/FK were never in any migration** — they only exist
   because the live DB was built with `create_all`.
   → New idempotent migration **`0007_bootstrap_missing_request_flow_schema`**
   (head). Every DDL is guarded (table/column existence checks, `CREATE
   INDEX IF NOT EXISTS`). `request_number`'s uniqueness is created as a
   **unique index** (`ix_service_requests_request_number`), matching
   `Column(unique=True, index=True)` exactly — a constraint would have
   diverged from the model and not been a no-op on the live DB. It
   bootstraps a fresh DB and is a **safe no-op** on the existing live DB at
   0006. It never touches existing data.
4. **`ssl="require"` made the bundled `postgres:16-alpine` unconnectable**
   in both `app/core/database.py` and `alembic/env.py` — the shipped
   docker-compose backend and CI's `alembic upgrade head` step both failed
   with "rejected SSL upgrade". → Switched both to `ssl="prefer"`: TLS is
   still negotiated whenever the server offers it (managed providers); plain
   postgres works too.

### Validation (all run against real Postgres 16, isolated containers)

- `alembic upgrade head` on a **fresh DB: base → 0007 completes**, and
  `alembic check` reports **"No new upgrade operations detected"** — the
  migration-built schema matches the models exactly (13 tables, all columns,
  indexes, constraints).
- `alembic downgrade base` **and** re-`upgrade head` round-trip is clean.
- **Live-schema simulation**: schema rebuilt with `Base.metadata.create_all`
  (as on the server), stamped 0006, then `upgrade head` → 0007 is a **true
  no-op** (a `pg_dump --schema-only` before/after diff is identical); a real
  `service_requests` row linking a `contact_messages` row via the new FK
  inserts correctly on both fresh and simulated-live schemas.
- Backend suite: `python -m pytest tests -q` → **66 passed** (76% coverage);
  `ruff check app/core/database.py` → clean.

### Going live

Back up the database, then from `backend/`:

```bash
alembic upgrade head      # runs only 0006 -> 0007 on the live DB
```

**Never run `alembic downgrade` to before 0007 on the live database** — 0007's
objects were created there outside migrations, so its downgrade is only meant
for fresh/dev environments.

## Critical (launch-blocking)

1. **Backend couldn't start at all.** Every internal import (`from core.X`,
   `from models.X`, etc.) assumed `app/` was the working root, but the
   Dockerfile runs `uvicorn app.main:app` from the parent directory. Fixed
   by prefixing every internal import with `app.` throughout the backend,
   Alembic's `env.py`, and `scripts/seed.py`. Verified by reproducing the
   original `ModuleNotFoundError` and then confirming it's gone.
2. **Missing async DB driver.** `database.py` builds an async engine with
   `postgresql+asyncpg://`, but only the sync `psycopg2-binary` driver was
   installed. Swapped it for `asyncpg==0.30.0` in `requirements/base.txt`.
3. **Zero database migrations existed.** `alembic/versions/` was empty —
   there was no way to create the schema at all. Added
   `alembic/versions/0001_initial_schema.py`, hand-written to match the
   (corrected) models exactly, since generating it against a live Postgres
   instance wasn't possible in this sandbox. **Before running this against
   a real database, it's worth double-checking the migration against your
   actual models with `alembic check` or a staging DB — I wrote it
    carefully, but a hand-written migration doesn't have the same guarantee
    as an autogenerated one.** *(Updated 2026-08-08: the full 0001–0007 chain
    is now verified against a real Postgres 16 — see "Migration chain repair".)*
4. **Unauthenticated PII endpoint.** `GET /api/v1/contact` returned every
   customer's name/phone/email to anyone, and `/admin` rendered it with no
   login check. Fixed end-to-end:
   - Backend: new `require_admin` dependency gates the endpoint behind an
     `X-Admin-Secret` header (`ADMIN_API_SECRET` env var).
   - Frontend: added `/admin/login` (password form) → `POST /api/admin/login`
     sets an httpOnly session cookie (SHA-256 of password + secret, never
     the raw password) → `/admin` page checks the cookie server-side via
     `cookies()`/`redirect()` before rendering anything → `AdminMessages`
     now calls the internal `/api/admin/messages` proxy route (same-origin,
     cookie sent automatically) instead of hitting FastAPI directly from
     the browser. The FastAPI shared secret never reaches client code.
   - **Set real values for `ADMIN_PASSWORD` and `ADMIN_API_SECRET`** in
     both `.env` files before deploying — the defaults are placeholders.

## High priority

5. Removed all 19 uses of `any`/`any[]` at the API boundary — `lib/api.ts`
   and every page component now use the `Service`/`Technician` types that
   already existed but weren't wired in.
6. Fixed the hardcoded French `"avis"` string — technician cards now use a
   proper `rating_summary` translation key in all three locales, and the
   copy reads as "4.5 (12 reviews)" instead of the confusing "4.5/12 avis".
7. Sitemap now includes every service and technician detail page (in all
   three locales) — previously only 3 static routes were listed, meaning
   the actual SEO-target pages weren't discoverable by search engines.
8. Fixed hardcoded `lang="fr"`. This required merging the root
   `app/layout.tsx` into `app/[locale]/layout.tsx` (the standard next-intl
   pattern) since the locale segment wasn't reachable from the true root
   layout — `<html lang>` and `dir` now correctly reflect the active locale.

## Medium priority

9. `Technician.rating` is now `Numeric(2,1)` (was `Integer` — no technician
   could ever have a rating like 4.5). `working_hours`/`languages` are now
   real `JSONB` columns instead of manually JSON-encoded strings — removed
   the unguarded `JSON.parse()` on the frontend that would have crashed the
   page on any malformed row.
10. Removed the duplicated query-building block in
    `TechnicianRepository.list_technicians` (filtered and unfiltered paths
    built the same query twice).
11. Removed unused dependencies (`framer-motion`, `zod`) that were never
    imported anywhere — dead weight and misleading for future contributors.
12. Centralized the primary phone number/email into `lib/constants.ts`
    (driven by `NEXT_PUBLIC_PRIMARY_PHONE`/`NEXT_PUBLIC_CONTACT_EMAIL`)
    instead of being hardcoded in four separate files.
13. `ContactMessage` model was missing `created_at`/`updated_at` entirely
    despite the API schema expecting it — added `TimestampMixin`, fixed the
    schema, and added an ordered `list_messages()` repository method so the
    admin panel shows newest messages first.

## Also fixed along the way

14. **ESLint was silently broken.** `eslint@9` was installed with an old
    `.eslintrc.json`, which v9 can't read without a compat shim. Replaced
    with `eslint.config.mjs` using `FlatCompat` — `npm run lint` now
    actually runs (0 errors on the current codebase).

## Still open (not addressed — flagging honestly rather than silently skipping)

- **No automated tests exist** on either side (`__tests__/` is empty and
  `backend/tests/` had no tests, despite Vitest/pytest being fully
  configured). This is the single biggest remaining gap. *(Updated 2026-08-08:
  the backend now has 66 passing API tests; frontend `__tests__/` is still
  empty.)*
- No rate limiting on the contact form (`RateLimitError` exists as a class
  but nothing triggers it).
- CORS is still fairly permissive (`allow_methods=['*']`,
  `allow_headers=['*']`) — fine given the restricted origin list today,
  worth tightening as the API surface grows.
