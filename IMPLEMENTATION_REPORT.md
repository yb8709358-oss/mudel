# Implementation Report — Audit Follow-up (R1–R6)

This report summarizes every remediation implemented after the CTO audit, in
priority order, together with how each item was verified. Priorities map to
the audit's Critical / High / Medium breakdown; items marked *(reported in
FIXES_APPLIED.md)* were previously documented and are recapped here for the
complete R1–R6 picture.

## R1 — Database migration chain repair (Critical, launch-blocking)

*(reported in FIXES_APPLIED.md — recapped)*

- **Symptom:** the Alembic chain (0001–0006) could never create a database
  from scratch; the live DB had been built with `metadata.create_all` +
  hand-patching, so the migrations diverged from the models.
- **Fixes:**
  - `0001` now creates `contact_messages` (its `upgrade` previously did not,
    while `0003`/`0004`/`0006` all modify it).
  - `0003` `downgrade` dropped four constraints by `None` (an invalid name
    that exploded on any Postgres); constraints are now named per Postgres'
    `{table}_{column}_fkey` convention.
  - New idempotent migration `0007_bootstrap_missing_request_flow_schema`
    (head) bootstraps the request-flow columns on `service_requests`
    (`request_number`, `contact_message_id`, `address`, `latitude`,
    `longitude`, `attachments`) plus the unique index/FK — guarded every DDL
    (existence checks, `CREATE INDEX IF NOT EXISTS`) so it is a true no-op on
    the existing live DB and a full bootstrap on a fresh DB.
  - `ssl="require"` in `app/core/database.py` and `alembic/env.py` made the
    bundled `postgres:16-alpine` unconnectable ("rejected SSL upgrade");
    both switched to `ssl="prefer"` (TLS still negotiated when offered).
- **Verification (real Postgres 16, isolated containers):**
  - `alembic upgrade head` on a fresh DB: base → 0007 completes.
  - `alembic check`: "No new upgrade operations detected" — schema matches
    models (13 tables, all columns, indexes, constraints).
  - `alembic downgrade base` + re-`upgrade head` round-trip clean.
  - Live-schema simulation: create_all schema stamped 0006 → `upgrade head`
    is a byte-identical no-op (`pg_dump --schema-only` before/after diff); a
    real `service_requests` row linking a `contact_messages` row via the new
    FK inserts correctly on both fresh and simulated-live schemas.

## R2 — Backend import paths (Critical, launch-blocking)

*(reported in FIXES_APPLIED.md — recapped)*

- **Symptom:** every internal import (`from core.X`, `from models.X`, …)
  assumed `app/` was the working root, but the Dockerfile runs
  `uvicorn app.main:app` from the parent directory — `ModuleNotFoundError`,
  backend could not start.
- **Fix:** prefixed every internal import with `app.` across the backend,
  Alembic's `env.py`, and `scripts/seed.py`.
- **Verification:** reproduced the original `ModuleNotFoundError`, confirmed it
  is gone; full test suite green (see R-summary below).

## R3 — Public service-requests endpoint: keep + deprecate

- **Finding:** `POST /api/v1/service-requests` is undocumented in
  ARCHITECTURE docs (the documented public flow is `POST /api/v1/contact`),
  has zero frontend consumers, and is not covered by the business API. But it
  is **not fully dead**: it is used as a fixture in four `test_admin.py`
  tests and has its own validation test.
- **Decision:** keep the endpoint but mark it deprecated (`deprecated=True`
  on the route decorator + a `deprecated` docstring note). Removing it would
  break existing tests and any external consumer relying on the contract.
- **Verification:** `py_compile` clean; OpenAPI schema exposes
  `deprecated_flag: True`; `test_submit_service_request_invalid_uuid` passes.

## R4 — Contact form structured error handling

- **Finding:** the public contact form showed only a generic error for every
  backend failure, so users couldn't distinguish "pick a service" /
  "service no longer exists" / "you were rate-limited".
- **Fix** (`frontend/src/features/contact/contact-form.tsx`):
  - `SUBMIT_ERROR_KEYS` maps backend codes → i18n keys:
    - `CONTACT_SERVICE_REQUIRED` → `error_service_required`
    - `SERVICE_NOT_FOUND` → `error_service_not_found`
    - `RATE_LIMIT_EXCEEDED` → `error_rate_limited`
    - any other error → generic `error`
  - `mapSubmitError(err, t)` normalizes the API error to a user message;
    `submitError` state rendered in a `<div aria-live="polite">` wrapper.
  - Backend codes reachable from `/contact`: `CONTACT_SERVICE_REQUIRED`
    (422), `SERVICE_NOT_FOUND` (404 via `NotFoundError`),
    `RATE_LIMIT_EXCEEDED` (429), `VALIDATION_ERROR` (422).
- **i18n:** added `error_service_required`, `error_service_not_found`,
  `error_rate_limited` to `messages/{en,fr,ar}.json`.
- **Verification:** 5 new tests in `contact-form.test.tsx`; all 11 contact-form
  tests pass; `tsc --noEmit` + eslint clean.

## R5 — RequestValidationError envelope handler (+ admin BFF sync)

- **Finding:** Pydantic validation failures surfaced FastAPI's default
  `{"detail": [{"loc": [...], "msg": ...}]}` shape, inconsistent with the
  app envelope `{success, error: {code, message, details}}` used everywhere
  else — a documented contract violation.
- **Fix** (`backend/app/main.py`): new `RequestValidationError` exception
  handler returns the app envelope:
  `{success: false, error: {code: "VALIDATION_ERROR", message: "Request
  validation failed.", details: ["body.photo_url: <msg>", ...]}}`.
- **Admin BFF sync** (`frontend/src/lib/admin-bff.ts`): `adminFetch` now parses
  the new envelope (`error.details` array) first, falling back to the legacy
  `detail` array shape — otherwise the admin form would regress to a generic
  message.
- **Tests updated** (were asserting FastAPI's old shape): `test_admin.py`
  (lines ~214, ~222), `test_service_media.py` (line ~113). New
  `test_request_validation_error_envelope` in `test_contact.py`. Admin BFF
  end-to-end 422 test now mocks the new envelope.
- **Verification:** 14 admin-bff tests pass; full backend suite 67 passed
  (76% coverage); frontend typecheck/lint/build clean.

## R6 — NEXT_PUBLIC_SITE_URL documentation

- **Finding:** the frontend needs `NEXT_PUBLIC_SITE_URL` for sitemap/robots
  and absolute URLs, but it was only present in `.env.local.example` and the
  README — not in the architecture docs' environment table.
- **Fix:** added `NEXT_PUBLIC_SITE_URL` to ARCHITECTURE.md §10.1 env block.

## Cross-cutting verification (final, this report)

Run in this sandbox on 2026-08-09:

- **Backend:** `python -m pytest tests -q` → **67 passed** in ~119s,
  **76% coverage** (required 70% met).
- **Frontend:** `tsc --noEmit` clean; `eslint src` clean; `vitest run` →
  **139 passed across 15 files**; `npm run build` → exit 0, all routes
  compiled (static + SSG + dynamic), middleware 52.3 kB.
- **Ports:** all references consistently `8000` (`docker-compose.yml` maps
  `8000:8000`; `backend/Dockerfile` healthcheck hits `localhost:8000`;
  `lib/api.ts` and `lib/admin-bff.ts` defaults; `.env`/`.env.example`). Zero
  `8088` references anywhere in source (build artifacts excluded).
- **Migrations:** Alembic head is `0008_cleanup_legacy_service_request_schema`
  (removes 11 legacy columns, 2 duplicate indexes, 1 redundant UNIQUE
  constraint from the old `service_requests`/`service_request`-era schema;
  guarded and no-op on fresh DBs). Note: offline `--sql` generation stops at
  0007 because 0007/0008 use live DB inspection (`op.get_bind()`), which is a
  known offline-mode limitation — the online path was verified against real
  Postgres 16 in R1.
