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

Verification: `npm run typecheck`, `npm run lint`, `npm run build`. The build does
not require a live backend — public pages catch API fetch failures and render
empty states (and `generateStaticParams` returns `[]`), so it also runs in CI.
It does need the backend to show real content at runtime.

## Environment variables

All configuration flows through environment variables — there are **no hardcoded
URLs, credentials or secrets in the source**. A missing required variable fails
fast with a clear message (`Missing required environment variable: X`), so a
misconfigured deployment cannot silently point at the wrong service.

Copy the templates and fill in real values (see the frontend `frontend/` and
`backend/` setup sections above):

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
# Root .env for docker compose: cp .env.example .env
```

| Variable | Local development | Production | Read by |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | `https://api.mudel.ma` | Browser bundle + Next.js server (baked in at build time) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3001` | `https://mudel.ma` | Canonical/OG/sitemap/robots URLs |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3001` | `https://mudel.ma` | Admin BFF origin/CSRF checks |
| `NEXT_PUBLIC_APP_NAME` | `Mudel` | `Mudel` | Site name |
| `DATABASE_URL` | local/Supabase string | Supabase pooler (port 6543) | Backend (required) |
| `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` | `postgres`/`5432`/`mudel`/… | must stay empty | Backend — build `DATABASE_URL` when both `DB_HOST` and `DB_USER` are set |
| `REDIS_URL` | `redis://redis:6379/0` | `redis://redis:6379/0` or managed | Backend (required in production) |
| `CORS_ORIGINS` | localhost JSON array | `["https://mudel.ma"]` (no `*`) | Backend |
| `ADMIN_API_SECRET` | random | random, shared | Backend + frontend server |
| `ADMIN_PASSWORD` | random | random | Frontend server-only admin login |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | optional | Backend server-only image uploads — never `NEXT_PUBLIC_*` |
| `SUPABASE_STORAGE_BUCKET` | `request-images` | `request-images` | Backend |

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

### Local Docker stack

- `docker compose up -d --build` runs Postgres + Redis + the API (see
  `docker-compose.yml`). Data lives in the pre-existing `job_pgdata` external
  volume. `.env` supplies `POSTGRES_PASSWORD`, `ADMIN_API_SECRET`, and the
  optional `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET`.
- Run behind a TLS-terminating reverse proxy: the backend emits HSTS only for
  https requests and the frontend marks cookies Secure in production.

### Production on Oracle Cloud (Supabase PostgreSQL)

The **only production database is Supabase PostgreSQL** — production never runs
a Postgres container. `docker-compose.prod.yml` deploys nginx proxy + Redis +
backend + frontend (plus a one-shot Alembic migration step) and points the
backend at Supabase via `DATABASE_URL`:

```bash
cp .env.example .env        # fill production values (see below)
docker compose -f docker-compose.prod.yml up -d --build
```

Production `.env` (no secrets committed; `DATABASE_URL` must be the Supabase
pgBouncer connection string, e.g. port 6543):

- `DATABASE_URL` — Supabase connection string. `DB_HOST`/`DB_USER`/`DB_PASSWORD`/
  `DB_NAME` MUST stay empty so the backend uses `DATABASE_URL` as-is.
- `REDIS_URL`, `ADMIN_API_SECRET` (shared with frontend), `CONTACT_EMAIL_TO`.
- `CORS_ORIGINS` — JSON array with only the public site origin (no `*`).
- `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` — server-side image
  uploads (never in any `NEXT_PUBLIC_*` variable, never in the browser bundle).
- `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` —
  public URLs; baked into the frontend bundle at image build time.
- `ADMIN_PASSWORD` — admin login password (server-only).

Frontend is built with `output: 'standalone'` (`frontend/Dockerfile`): a
minimal non-root image; `HOSTNAME=0.0.0.0` is required for the standalone
server's internal proxy. Backend (`8000`) and frontend (`3001`) ports are
**not published to the host** — the nginx proxy (`80`/`443`) is the only public
entry point, and it forwards `X-Forwarded-Proto` so the backend emits HSTS and
the frontend's Secure cookies work.

#### Production infrastructure requirements

1. **DNS** — point two A records at the Oracle Cloud VM public IP:
   - `mudel.ma` → frontend origin (`NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL`)
   - `api.mudel.ma` → backend origin (`NEXT_PUBLIC_API_URL`, also in the backend
     `CORS_ORIGINS`)
2. **TLS certificates** — obtain a cert for both names (e.g.
   `certbot certonly --standalone -d mudel.ma -d api.mudel.ma`) and place
   `fullchain.pem` + `privkey.pem` in `./certs/` (gitignored, mounted read-only
   into the proxy). Adjust `deploy/nginx.conf` `server_name` blocks if your
   domains differ.
3. **Supabase** — create the storage bucket (`request-images`, public URLs for
   image display) and set `SUPABASE_SERVICE_ROLE_KEY` in `.env`. Without the
   key, request image uploads return `503 STORAGE_NOT_CONFIGURED` (the same
   documented behavior as local development).
4. **Database migrations** — applied automatically by the one-shot `migrate`
   service (`alembic upgrade head`) before the backend starts; it is idempotent
   and the backend waits for it to complete successfully.
5. **Firewall** — only ports `80`/`443` may be open to the internet.

> **Build order matters on first deploy.** Public pages are SSG and fetch at
> image build time (`/services/<slug>` uses `generateStaticParams`). Build the
> frontend image only when `NEXT_PUBLIC_API_URL` is already reachable from the
> build machine, otherwise the slug pages 500 until the image is rebuilt with a
> live API. Bring the backend up and confirm the public API origin responds
> before building the frontend.

### CI

- `.github/workflows/backend.yml` — quality/test/docker.
- `.github/workflows/frontend.yml` — typecheck + lint + a full production
  build (the build runs without a live backend; see "Frontend" above).
