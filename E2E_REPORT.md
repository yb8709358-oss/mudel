# E2E / UAT Report — Mudel Home Services Platform

Date: 2026-08-09
Scope: Full real-user end-to-end / user-acceptance test of the public site, the token-based service-request flow, the admin panel, multilingual UX, failure recovery, and data integrity.

## 1. Environment under test

| Component | Runtime | Address | Status |
|---|---|---|---|
| Frontend (Next.js) | node dev server | http://localhost:3000 | UP (pid 32988) |
| Backend (FastAPI/uvicorn) | python venv | http://127.0.0.1:8000 | UP (pid 53076) |
| Database | disposable local Postgres (docker, mudel-e2e-postgres) | 127.0.0.1:5432 / db `mudel` | UP (wslrelay pid 49992) |
| Migrations | Alembic | head `0008` | clean (`alembic check` OK) |
| Storage (Supabase) | — | — | NOT configured → uploads fail safely |
| Stray process | python (anaconda) | 127.0.0.1:8088 | Listening, not used by the app (see findings) |

Backend was verified connected to the **disposable local** Postgres (never intended to touch production data — see incident in §5).

## 2. Test data used

- Seed content: 6 services, 3 technicians, 5 districts (fr/en/ar).
- Real submissions: Karim El Amrani (→ REQ-2026-4B7327E3E8254FD8), Nadia Cherkaoui (→ REQ-2026-9C71D9A9D1B449F8) + numerous invalid/error inputs.
- Admin session: `youssef1212` (cookie httpOnly, SameSite=Lax, 8h).

## 3. Phase-by-phase results

| Phase | Result | Key evidence |
|---|---|---|
| 0. Environment | PASS | Full stack started fresh on disposable infra; ports confirmed; storage unconfigured. |
| 1. Public discovery | PASS | Home/services/service-detail/technician-detail 200 in 3 locales; footer dead link found (see §4). |
| 2. Contact form | PASS | Valid → 201 + envelope + token; 8 invalid cases → correct 422/404 envelope codes; rate limit 10/min → 429 `RATE_LIMIT_EXCEEDED`; CORS preflight OK. |
| 3. Token flow | PASS | `available` → `consumed`+request_number → duplicate submit 409 `TOKEN_CONSUMED`; invalid token 404. |
| 4. Request creation | PASS | Valid submit → 201 `REQ-2026-…`; uploads: valid image → 503 `STORAGE_NOT_CONFIGURED` (safe), bad type / 6 files / >5MB → 422; invalid date/description → 422, unknown district → 404. |
| 5. Admin auth | PASS | Anonymous /fr/admin/* → 307→login; BFF 401; wrong/empty password 401; 5/min lockout 429; logout clears; forged cookie 401; session persists across pages. |
| 6. Dashboard | PASS | Counts consistent with DB (6/3/5/requests-by-status). |
| 7. Request management | PASS | Status transitions persist; bulk update_status OK; invalid status 422; customer tracking page reflects admin status. |
| 8. Contact messages | PASS | List (page size 20), mark read/unread (dashboard unread updates), bulk mark_read + bulk delete (21 processed). |
| 9. Services CRUD | PASS* | Update propagates to public SSR; create/update validation gaps (see §4). |
| 10. Technicians | PASS* | Update persists; tel:/wa.me links render; phone format unvalidated (see §4). |
| 11. Districts | PASS | Rename persists; empty name 422. |
| 12. Settings | PASS* | GET {}; PUT persists + public endpoint reflects; unknown key 422; not rendered on public pages. |
| 13. Multilingual | PASS | 392/392 keys in en/fr/ar; correct language per page; Arabic dir=rtl; no raw-key leakage. |
| 14. Responsive | PARTIAL | viewport meta + Tailwind sm/md/lg breakpoints present; real rendering needs a browser. |
| 15. Console/network | LIMITED | HTTP-level only (favicon 404, footer 404, webpack 500 incident) — no browser console. |
| 16. Data consistency | PASS | Admin status change visible on `/request/{token}`; consumed tokens tied to request numbers. |
| 17. Security | PASS* | Backend admin 401 without/with-wrong key; clean 422 envelopes (no stack traces); httpOnly cookie. Notes: public /docs+OpenAPI, no Origin check on public POST, secrets in .env (gitignored). |
| 18. Failure/recovery | PASS | Backend down → cached pages 200, contact 200, uncached detail → 404 fallback, no 500s; restart → full recovery. |
| 19. Migration/DB | PASS | Alembic `0008 (head)`, `check` clean, no legacy columns, 14 FKs, CRUD working. |

*PASS with issues listed in §4.

## 4. Findings (prioritized)

### MEDIUM
1. **Destructive cascade on service delete.** `service_requests.service_id` FK is `ON DELETE CASCADE`, so deleting a service permanently deletes every historical service request for it (irrecoverable customer records). `contact_messages.service_id` is `ON DELETE SET NULL` (association silently lost) — inconsistent behavior across tables. Recommendation: block deletion while requests reference the service, or soft-delete/archive; at minimum add an explicit warning in the admin UI.
2. **Service create/update validation gaps.** No slug format validation (`"bad slug!"` accepted, producing an unusable URL) and a service can be created with **zero translations**. Both returned 200. (Repro data was cleaned up; the affected seed service was restored with its full fr/en/ar content.)
3. **Broken footer link.** Footer hardcodes `/services/air-conditioner-maintenance` → 404 (service does not exist). Should link to an existing service or the `/services` page.
4. **No technician assignment path.** `ServiceRequestUpdate` only accepts `status` + `admin_notes`; `technician_id` is rejected (422). The model supports technicians on requests, but admins cannot assign them via the API/UI.

### LOW
5. `preferred_date` in the past is accepted (no date validation).
6. No state-machine enforcement: `completed → confirmed` (and any→any) allowed.
7. Technician `phone` format not validated (`"123"` accepted) — contact form uses a strict regex, admin technician form does not.
8. `rating`/`review_count` not settable via admin API → public cards show `5 (0 avis)`.
9. Settings are stored/editable but not rendered on public pages (e.g., `site_name`, `contact_phone`).
10. `/docs` and `/openapi.json` are publicly reachable (schema exposure; admin routes still require the key).
11. `/favicon.ico` → 404.
12. Public POST endpoints accept any `Origin` (no CSRF origin check) — limited risk because public routes have no cookie auth and are rate-limited.

### Environment notes (not app defects)
- **Secrets in plaintext .env files.** Real credentials exist in `backend/.env` (Supabase `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_API_SECRET`) and `frontend/.env.local` (`ADMIN_PASSWORD`). These are correctly gitignored, but if shared/leaked the keys should be rotated.
- **Stray backend on port 8088** (anaconda python, pid 67016) — not referenced by the current frontend (which uses :8000), but a leftover process that can shadow/deceive future runs.
- **No public technicians listing route** (`/fr/technicians` → 404). By design: technicians appear on the homepage and service detail pages; detail URLs use `/technicians/{uuid}`. Not a defect, but SEO/user expectations may differ.

## 5. Test-run incidents (environment, not app bugs)

1. **Next.js dev webpack chunk corruption** mid-session → all pages 500 (`Cannot find module './…'`). Resolved by clearing `.next` and restarting the dev server.
2. **Backend restart connected to production Supabase.** The recovery restart did not re-set `DATABASE_URL`, so the backend re-read `backend/.env` and briefly served the real Supabase database (via read-only admin GETs only). **No writes occurred** (the one write attempt was rejected with 422 and processed 0 rows). The backend was immediately restarted against the disposable local DB and re-verified. Mitigation for future runs: always pin `DATABASE_URL` when starting the backend in the test environment.

## 6. Limitations

- No real browser was available: visual layout, real responsive behavior (mobile/tablet), client-side rendering states, and browser console/network panels were verified at the HTTP/RSC level only. A browser-based pass (e.g., Playwright) is recommended to close this gap.

## 7. Verdict

**PASS with recommendations.** All core user journeys work end-to-end and back-ends respond with a consistent, well-formed envelope across the API. No blocking defects found. The service-delete cascade (M1) and service create/update validation (M2) should be addressed before production hardening; the environment/secret hygiene items should be reviewed as part of ops readiness.
