# Mudel

Home-services marketplace for Marrakech — connects customers with trusted technicians
(AC, refrigeration, ventilation, water heaters). Next.js 15 (App Router, next-intl,
en/fr/ar + RTL) frontend, FastAPI backend, PostgreSQL.

## Structure

```
frontend/   Next.js 15 + TypeScript + Tailwind, i18n (en/fr/ar), admin panel
backend/    FastAPI + SQLAlchemy (async) + Alembic, public + admin APIs, tests
```

## Prerequisites

- Node.js 20+
- Python 3.12+
- PostgreSQL 16 (or Supabase pooler)
- Redis 7 (optional; rate limiter falls back to in-memory)

## Setup

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements/dev.txt
cp .env.example .env        # fill in DATABASE_URL, ADMIN_API_SECRET
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Serves the API on port **8000**. `--host 0.0.0.0` binds all interfaces so the
  backend is reachable via `http://localhost:8000` **and** `http://<LAN_IP>:8000`
  from other machines on the network (LAN development). Without `--host 0.0.0.0`,
  uvicorn defaults to loopback-only and LAN clients get connection refused.
- Add the browser origin to `CORS_ORIGINS` in `backend/.env` when you access the
  frontend from a LAN address, e.g. `"http://192.168.0.194:3001"` (already present
  in the local `.env`).

Run tests: `python -m pytest tests -q` (66 tests, ~76% coverage, threshold 70%).

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set real ADMIN_PASSWORD / ADMIN_API_SECRET
npm run dev
```

- Serves the site on port **3001** (`http://localhost:3001`).
- **LAN development**: run `npm run dev` and open `http://<LAN_IP>:3001` from any
  device on the network. Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` to
  `http://<LAN_IP>:8000` (the browser bundle needs a reachable backend address —
  `127.0.0.1` only works on the machine itself). The backend must be running with
  `--host 0.0.0.0` and its `CORS_ORIGINS` must include `http://<LAN_IP>:3001`.

Verification: `npm run typecheck`, `npm run lint`, `npm run build` (build requires
the backend API to be running for static generation).

## Environment notes

- `ADMIN_PASSWORD` / `ADMIN_API_SECRET` are server-only. Admin login **fails
  closed** if they are empty or still the placeholder values from
  `.env.local.example`. Generate real values with `openssl rand -hex 24`.
- `ADMIN_API_SECRET` must match between `frontend/.env.local` and
  `backend/.env` (the frontend BFF forwards it as `X-Admin-Secret`).
- `SUPABASE_SERVICE_ROLE_KEY` enables request image uploads (Supabase Storage).
  It is set in `backend/.env` for development and must also be provided in
  production (`backend/.env.production` or the docker-compose `.env`). Without
  it, image uploads return `503 STORAGE_NOT_CONFIGURED`. The project URL is
  derived from `DATABASE_URL`; only the service-role key and optional
  `SUPABASE_STORAGE_BUCKET` (default `request-images`) are configurable.
- `NEXT_PUBLIC_SITE_URL` must be set in production to the canonical public
  origin (used by the admin BFF CSRF/origin checks). See
  `frontend/.env.local.example`.
- Backend `.env` contains real secrets — never commit it. `.gitignore` covers
  env files and test artifacts.

## Deployment

- `docker compose up -d --build` for the backend stack (Postgres + Redis + API).
- Run behind a TLS-terminating reverse proxy: the backend emits HSTS only for
  https requests and the frontend marks cookies Secure in production.
- CI: `.github/workflows/backend.yml` (quality/test/docker) and
  `.github/workflows/frontend.yml` (typecheck/lint). Frontend build is not run
  in CI because public pages statically render against the live API.
