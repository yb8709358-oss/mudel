# CTO Architecture Review — Home Services Marrakech

> **Reviewer:** CTO  
> **Subject:** Architecture document (ARCHITECTURE.md)  
> **Status:** Critical review — several decisions need re-evaluation  

---

## Executive Summary

I have reviewed the architecture document. Several decisions are correct. Several need challenging. A few are wrong and would create technical debt or slow us down.

This document is an honest CTO review. I will explain what is good, what needs fixing, and why. Then I will provide the refined architecture for your approval.

---

## 1. Product Analysis

### The Core Offering

We are not building a marketplace. We are building a **trust layer** between homeowners and technicians in a market where trust is scarce. In Morocco, finding a reliable technician is done through word-of-mouth or family connections. Our product replaces that with a digital experience that is:

1. **Curated** — only verified technicians (we manually vet the first 2-3)
2. **Immediate** — call or WhatsApp in 30 seconds
3. **Transparent** — ratings, photos, working hours, languages

This is closer to a **premium directory** than a marketplace. The MVP validates: "Will people in Marrakech book a technician through a website they've never heard of?"

### The Real Risk

The MVP risk is not technical. It is **trust**. The technology must feel so premium, so professional, that a first-time visitor from Marrakech feels comfortable calling a technician they found online. This means:

- The UI must feel more premium than any local competitor
- Loading must be instant (even on 3G)
- The phone number and WhatsApp must be prominent
- Localization must be flawless (especially Darija/Moroccan Arabic, not just MSA)

### User Segmentation

The target users have different needs:

| Segment | Priority | Behavior |
|---------|----------|----------|
| Homeowner | High | Emergency repairs, planned maintenance |
| Apartment tenant | Medium | Minor fixes, AC maintenance |
| Airbnb host | High* | Fast response, multiple properties |
| Hotel/Café/Restaurant | Medium | Regular contracts, bulk pricing |
| Small business/Office | Low MVP | AC, refrigeration |

*Airbnb hosts are a high-value segment — they need fast response for guest-facing issues. Worth targeting early.

### 30-Second Journey Analysis

```
Home (0s) → Click Service (5s) → See Technicians (10s) → Tap Call/WhatsApp (15s → 30s)
```

The architecture must support this with:
- Zero unnecessary page loads (prefetch all technician data)
- Phone numbers and WhatsApp links rendered as static content
- No JavaScript required for the core journey (pure HTML)

**This is achievable with SSG + thoughtful link structure.**

---

## 2. Business Analysis

### Revenue Model (Future)

Even at the architecture level, we should design for these revenue streams:

1. **Premium listings** — Technicians pay for priority placement (future)
2. **Subscription** — Monthly fee for verified technicians (future)
3. **Commission** — Per-booking fee when booking system launches (future)
4. **Lead generation** — Pay per call/WhatsApp click (future)
5. **Advertising** — Service providers, equipment brands (future)

**Architecture implication:** The technician listing and detail pages must support a `is_featured` / `sort_order` field that can be changed without code changes. This is already in my schema.

### MVP Monetization

For MVP: **Free.** We validate the model first. The 2-3 technicians are onboarded for free in exchange for testimonials and case studies.

### Competitive Landscape

| Competitor | Weakness | Our Advantage |
|-----------|----------|---------------|
| Facebook groups | Unstructured, no vetting, spam | Curated, professional, fast |
| Word-of-mouth | Slow, limited network | Accessible anytime, wider reach |
| Traditional directory (pagesjaunes.ma) | Ugly, outdated, poor mobile | Modern UX, premium feel |
| Other startups (e.g., Jumla, Iguana) | General marketplaces, no specialization | Focused on Marrakech, home services only |

---

## 3. Architecture Analysis — What I Got Right

### ✅ Monorepo Structure

Frontend and backend in one repo is correct for a team of 1-3 developers. It reduces context switching, simplifies CI, and lets us move fast. We can split when the team grows or when deployment independence justifies it.

### ✅ Feature-based Folder Structure

```
features/services/
features/technicians/
features/contact/
```

This is correct. Each feature is a bounded context. A developer working on the booking system in 2028 should not need to touch the services code.

### ✅ Clean Architecture Layering (Backend)

```
API → Services → Repositories → Models
```

This is correct. Each layer has a single responsibility. Testing is trivial. Swapping databases or adding caching requires changing one layer.

### ✅ Translation Tables in DB

Service names must be in the database because:
- Each service needs an SEO page per language
- Future: technicians can add their own service descriptions
- Future: admin panel needs to edit translations

Frontend message files handle UI text (buttons, labels, navigation). DB translations handle content (service names, descriptions, technician bios).

### ✅ UUID Primary Keys

Correct for a distributed system. When we eventually split services or need offline-capable mobile apps, UUIDs prevent collision nightmares. The storage cost is irrelevant at any scale we'll reach in 5 years.

### ✅ JSONB for working_hours and languages

Correct. These are read-heavy, write-rare document structures. Normalizing would add 3+ tables with no query benefit. PostgreSQL JSONB is indexable and queryable when needed.

### ✅ SSG/ISR over SSR

Correct for a directory site. Static pages load instantly, cost nothing to serve, and ISR handles updates within minutes. SSR would add latency and cost with zero user benefit for this content type.

### ✅ No State Management Library in MVP

Correct. RSC + URL params cover every need. Adding React Query or Zustand later costs nothing and has clear trigger conditions.

---

## 4. Architecture Analysis — What I Need to Challenge

### ⚠️ Decision to Challenge #1: BFF Layer (Next.js API Routes)

**My original decision:** Use Next.js API routes as a BFF between the client and FastAPI.

**Why I'm challenging it:** This adds an unnecessary hop for MVP. The arguments for BFF (auth, caching, transformation) are valid — but none of them apply to MVP data that is:
- Read-only (no mutations)
- Public (no auth required)
- Already cached by Next.js SSG/ISR

**Better approach:** Next.js Server Components call FastAPI directly. No BFF. When we add auth (Supabase), we can introduce a thin middleware layer in Next.js or use Supabase's client SDK directly.

**Trade-off acknowledged:** This means the backend URL is exposed to the browser (via network tab). For MVP with no auth, this is acceptable. For production with auth, we can add the BFF or use Supabase RLS.

**Recommendation:** Remove BFF for MVP. Direct FastAPI → Next.js RSC calls.

### ⚠️ Decision to Challenge #2: CI/CD Complexity

**My original decision:** Separate frontend and backend CI workflows with lint, typecheck, tests, build, and deploy for each.

**For a team of 1-2 people building an MVP, this is over-engineering.** We need:
- One workflow that runs on every PR
- One deploy step (or two parallel deploys)
- Focus on velocity, not pipeline sophistication

**Better approach:**
- Single CI workflow: lint → typecheck → test → build
- Deploy: Vercel (automatic from GitHub) + Railway (automatic from GitHub)
- No separate preview environments for backend (unnecessary until we have auth)

### ⚠️ Decision to Challenge #3: E2E Testing in MVP

**My original decision:** Playwright E2E tests for critical user journeys.

**For a static site with 5 pages and no user input (beyond contact form), E2E tests are premature.** The pages are so simple that manual testing catches everything. E2E adds setup time, CI time, and maintenance cost.

**Better approach:**
- Unit tests for utilities, hooks, and business logic
- Skip E2E until we have dynamic features (bookings, auth, payments)
- Manual testing for MVP (2-3 technicians, 8 services, 5 pages)

### ⚠️ Decision to Challenge #4: Full PostgreSQL + FastAPI for What Is Essentially Static Data

This is the hardest decision. The MVP data can fit in a JSON file or MDX. But the user explicitly wants FastAPI + PostgreSQL, and the long-term vision demands it.

**My recommendation stands:** Use FastAPI + PostgreSQL from day 1. Here is why:
- **The seed data cost is zero** — writing a seed script takes 30 minutes
- **The migration cost is high** — starting with JSON and migrating to PostgreSQL later is painful (schema drift, data loss, API rewrite)
- **The discipline is valuable** — having the backend from day 1 means we iterate on it, find issues early, and build muscle memory
- **The future is real** — we will add auth, bookings, payments. Having the backend ready prevents the "rewrite everything" problem

**But we can be smarter about it:** Use Next.js Server Components to fetch from FastAPI at build time (SSG). This means:
- The API is real from day 1
- The pages are static (fastest possible)
- If the API is down during build, the site still serves the last successful build

This is the best of both worlds.

### ⚠️ Decision to Challenge #5: Font Strategy

I did not specify fonts in the architecture. For a premium brand inspired by Apple and Linear, font choice is critical.

**Recommendation:**
- **Latin (EN/FR):** Inter (clean, modern, Apple-like) — available via `next/font`
- **Arabic (AR):** Noto Kufi Arabic or Cairo (clean sans-serif for Arabic)
- **Display:** Maybe a premium display font for headings on the hero section

**Implementation:** Host via `next/font` (Google Fonts, self-hosted at build time, zero runtime requests).

---

## 5. Detailed Risk Analysis

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| FastAPI cold start on Railway | High | Medium | SSG pages don't need API at request time; only contact form hits API |
| PostgreSQL connection limits (free tier) | Medium | Low | Only 2-3 techs; connection pooling via SQLAlchemy |
| Arabic RTL rendering issues | Medium | Medium | Test thoroughly; use logical CSS properties; tailwindcss-rtl plugin |
| Next.js build times increase with i18n | Low | Low | 3 locales × 5 pages = 15 pages; build time < 30s |
| shadcn/ui dark mode flicker | Low | Low | next-themes with `suppressHydrationWarning` |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| No one uses the platform | High | High | MVP validates this; if true, pivot or shut down — minimal investment |
| Technicians don't respond to calls | Medium | High | We manually vet technicians; SLAs in onboarding agreement |
| Customers don't trust online platform | Medium | High | Premium design, real photos, real phone numbers, WhatsApp integration |
| Translation quality (Darija vs MSA) | Medium | Medium | French + Arabic (MSA) for MVP; Darija as future improvement |

### Architectural Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Over-engineering the MVP | Medium | Medium | This review exists to prevent it |
| Under-engineering for future needs | Low | High | Architecture review ensures extensibility without over-building |
| Tech stack choice limits hiring | Low | Medium | Next.js + Python are widely available; no exotic tech |

---

## 6. Scalability Analysis

### Vertical Scaling Path

```
Phase 1 (MVP - 3 techs)    → Single Railway instance, free Postgres tier
Phase 2 (50 techs)          → Same setup, add Redis cache
Phase 3 (500 techs)         → Multiple Railway instances, read replicas
Phase 4 (5000+ techs)       → Microservices extraction, CDN for static
```

### Bottleneck Prediction

| Component | Bottleneck at | Solution |
|-----------|---------------|----------|
| FastAPI instance | ~500 concurrent requests | Horizontal scaling (Railway auto-scales) |
| PostgreSQL | ~1000 concurrent connections | PgBouncer connection pooling |
| Build time (Next.js) | ~1000 pages | Incremental static regeneration; selective rebuilds |
| Image serving | ~10,000 requests/day | Supabase Storage CDN or Cloudflare Images |

### The 50x Question

> "If we succeed and have 50x more technicians and cities in 2 years, what breaks?"

1. **Database queries** — The current queries are simple SELECTs. With proper indexing and pagination, they handle millions of rows.
2. **Build times** — With 500 technicians × 3 locales × multiple pages = 1500+ pages, Next.js build time increases. Solution: `generateStaticParams` with `fallback: 'blocking'` or ISR.
3. **API response time** — Add Redis caching with 5-minute TTL for technician listings.
4. **Deployment** — Split into separate repos for frontend and backend when team grows beyond 3 people.

---

## 7. Recommended Improvements to Architecture

### 7.1 Remove BFF Layer

Direct Next.js RSC → FastAPI calls. Simpler, faster, one less thing to maintain.

### 7.2 Add Image Strategy with Supabase Storage

Even in MVP, store technician photos in Supabase Storage (not local `/public/`). Why:
- When we add technician accounts, they upload their own photos
- Supabase Storage has built-in CDN, resizing, optimization
- No migration needed later

**Workaround for MVP:** Seed photos via Supabase Storage dashboard or script. Reference by URL in the database.

### 7.3 Add a Minimal Admin Panel

For MVP, the admin manages everything manually. We need a way to:
- Add/edit technicians
- Add/edit services
- View contact form submissions

**Recommendation:** Build a minimal admin section in the same Next.js app under `/admin`. No auth in MVP (basic HTTP basic auth or IP whitelist). When Supabase Auth is added, protect admin routes.

This is a 2-day build and saves infinite pain vs editing JSON/database directly.

### 7.4 Add Contact Form to Database

The contact form submission should be stored in PostgreSQL (not just emailed). This:
- Prevents email deliverability issues
- Creates a CRM foundation
- Enables future notification features

### 7.5 Rethink Animation Strategy

Framer Motion is powerful but heavy (~30KB gzipped). For MVP, the animations should be:
1. Subtle (no page transitions — they slow perceived performance)
2. Limited to micro-interactions (hover states, card entry)
3. Optional (graceful degradation on slow devices)

**Recommendation:** Use Framer Motion only for card hover effects and the hero section. Skip page transitions and complex enter/exit animations in MVP.

### 7.6 Name Consideration: "Mudel"

The working directory is `mudel`. Is this the project name?

- "Mudel" — Not immediately meaningful in Arabic, French, or English
- Could be a portmanteau or placeholder

**Recommendation:** Decide on the name early. It affects domain registration (`mudel.ma`? `mudel.ma` unavailable? social handles, etc.). If "Mudel" is final, great. If not, decide now before we write code.

If we want suggestions:
- **Sehli** (سهلي) — "Make it easy" in Darija
- **Sadiq** (صادق) — "Trustworthy" in Arabic
- **Mudel** — Short, unique, brandable

---

## 8. Refined Folder Structure

```
mudel/
├── frontend/                          # Next.js (App Router)
│   ├── public/
│   │   ├── images/
│   │   │   ├── brand/                 # Logo, favicon, OG images
│   │   │   └── icons/                 # Service category SVGs
│   │   ├── fonts/                     # Local fonts (if self-hosting)
│   │   ├── robots.txt
│   │   └── sitemap.xml
│   ├── messages/                      # next-intl translations
│   │   ├── en.json
│   │   ├── fr.json
│   │   └── ar.json
│   ├── src/
│   │   ├── app/
│   │   │   ├── [locale]/
│   │   │   │   ├── page.tsx           # Home
│   │   │   │   ├── layout.tsx         # Root layout (locale-aware)
│   │   │   │   ├── not-found.tsx
│   │   │   │   ├── services/
│   │   │   │   │   └── [slug]/
│   │   │   │   │       └── page.tsx   # Service detail
│   │   │   │   ├── technicians/
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx   # Technician profile
│   │   │   │   ├── contact/
│   │   │   │   │   └── page.tsx       # Contact page
│   │   │   │   └── admin/             # MVP admin panel
│   │   │   │       ├── page.tsx       # Dashboard
│   │   │   │       ├── techniciens/
│   │   │   │       ├── prestations/
│   │   │   │       └── messages/
│   │   │   └── api/                   # BFF removed — only admin API
│   │   │       └── admin/
│   │   │           └── contact/
│   │   │               └── route.ts
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn/ui primitives
│   │   │   ├── layout/               # Header, Footer, Nav, ThemeToggle
│   │   │   ├── shared/               # ServiceCard, TechnicianCard, etc.
│   │   │   └── providers.tsx         # Theme, i18n providers
│   │   ├── features/
│   │   │   ├── services/
│   │   │   ├── technicians/
│   │   │   └── contact/
│   │   ├── lib/
│   │   │   ├── utils.ts
│   │   │   ├── constants.ts
│   │   │   └── api.ts                # FastAPI client
│   │   ├── hooks/
│   │   │   ├── use-scroll.ts
│   │   │   ├── use-media-query.ts
│   │   │   └── use-whatsapp.ts
│   │   ├── i18n/                     # next-intl config
│   │   ├── types/
│   │   │   ├── service.ts
│   │   │   ├── technician.ts
│   │   │   └── common.ts
│   │   └── data/                     # Seed data shapes (for types)
│   ├── __tests__/
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   ├── vitest.config.ts
│   └── .env.local.example
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── exceptions.py
│   │   │   └── dependencies.py
│   │   ├── models/
│   │   │   ├── base.py
│   │   │   ├── service.py
│   │   │   ├── technician.py
│   │   │   └── contact.py            # Contact form submissions
│   │   ├── schemas/
│   │   │   ├── service.py
│   │   │   ├── technician.py
│   │   │   ├── contact.py
│   │   │   └── common.py
│   │   ├── repositories/
│   │   │   ├── base.py
│   │   │   ├── service.py
│   │   │   ├── technician.py
│   │   │   └── contact.py
│   │   ├── services/
│   │   │   ├── service.py
│   │   │   ├── technician.py
│   │   │   └── contact.py
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── router.py
│   │   │       ├── services.py
│   │   │       ├── technicians.py
│   │   │       └── contact.py
│   │   └── utils/
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_api/
│   │   ├── test_services/
│   │   └── test_repositories/
│   ├── alembic/
│   │   ├── versions/
│   │   ├── env.py
│   │   └── alembic.ini
│   ├── scripts/
│   │   └── seed.py                   # Seed script
│   ├── requirements/
│   │   ├── base.txt
│   │   └── dev.txt
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── .env.example
│
├── .github/
│   └── workflows/
│       └── ci.yml                    # Single CI workflow
├── docker-compose.yml                # Local PostgreSQL
├── .gitignore
├── .prettierrc
├── .eslintrc.js
├── README.md
└── package.json                      # Root scripts only
```

---

## 9. Refined Database Schema

### Tables for MVP

```sql
-- Services (catalog, translated)
CREATE TABLE services (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          VARCHAR(100) UNIQUE NOT NULL,
    icon          VARCHAR(50) NOT NULL DEFAULT 'wrench',
    sort_order    INTEGER DEFAULT 0,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE service_translations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id    UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    locale        VARCHAR(5) NOT NULL,
    name          VARCHAR(200) NOT NULL,
    description   TEXT,
    meta_title    VARCHAR(70),            -- SEO: <title>
    meta_desc     VARCHAR(160),           -- SEO: meta description
    UNIQUE(service_id, locale)
);

-- Technicians
CREATE TABLE technicians (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(200) NOT NULL,
    slug          VARCHAR(200) UNIQUE NOT NULL,
    phone         VARCHAR(20) NOT NULL,
    whatsapp      VARCHAR(20),
    email         VARCHAR(200),
    photo_url     VARCHAR(500),
    bio           TEXT,
    rating        DECIMAL(2,1) DEFAULT 5.0,
    review_count  INTEGER DEFAULT 0,
    service_area  VARCHAR(300),
    working_hours JSONB,
    languages     JSONB,
    years_exp     INTEGER,
    is_featured   BOOLEAN DEFAULT FALSE,  -- Future: premium placement
    is_available  BOOLEAN DEFAULT TRUE,
    is_active     BOOLEAN DEFAULT TRUE,
    sort_order    INTEGER DEFAULT 0,      -- Manual ordering
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE technician_translations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    locale        VARCHAR(5) NOT NULL,
    bio           TEXT,
    UNIQUE(technician_id, locale)
);

CREATE TABLE technician_services (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    service_id    UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    price_range   VARCHAR(50),
    UNIQUE(technician_id, service_id)
);

CREATE TABLE technician_photos (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    url           VARCHAR(500) NOT NULL,
    caption       VARCHAR(200),
    sort_order    INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Contact form submissions (MVP CRM)
CREATE TABLE contact_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(200) NOT NULL,
    phone         VARCHAR(20) NOT NULL,
    email         VARCHAR(200),
    service_id    UUID REFERENCES services(id),
    message       TEXT,
    is_read       BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_services_slug ON services(slug);
CREATE INDEX idx_technicians_slug ON technicians(slug);
CREATE INDEX idx_contact_messages_created ON contact_messages(created_at DESC);
CREATE INDEX idx_service_translations_locale ON service_translations(locale);
```

### Key Changes from Original Schema

1. **Added `service_translations.meta_title` and `meta_desc`** — needed for SEO. Each service page in each language needs unique meta tags.
2. **Added `technician_translations`** — technician bios need translation (a French bio for a French-speaking customer).
3. **Added `contact_messages` table** — store form submissions in DB, not just email.
4. **Added `is_featured` and `sort_order` on technicians** — future premium placement.
5. **Renamed `technician_photos.caption` to allow locale-aware captions** (future).

---

## 10. Refined API Design

### MVP Endpoints

```http
### Public API (no auth)

GET  /api/v1/services
     → 200 { data: Service[] }
     Purpose: List all services with translations for the requested locale

GET  /api/v1/services/{slug}
     → 200 { data: Service }
     → 404 { error: { code: "SERVICE_NOT_FOUND" } }
     Purpose: Single service with translations

GET  /api/v1/technicians
     ?service=slug            (optional filter by service)
     &locale=fr               (optional, header override)
     → 200 { data: Technician[] }
     Purpose: List technicians, optionally filtered by service

GET  /api/v1/technicians/{id}
     → 200 { data: Technician (detailed) }
     → 404 { error: { code: "TECHNICIAN_NOT_FOUND" } }
     Purpose: Full technician profile with photos, services, hours

POST /api/v1/contact
     Body: { name, phone, email?, service_id?, message? }
     → 201 { data: { id, message: "Message sent successfully" } }
     → 422 { error: { code: "VALIDATION_ERROR", details: [...] } }
     Purpose: Store contact message; optionally notify admin via email

GET  /api/v1/admin/messages
     → 200 { data: ContactMessage[] }
     Purpose: List contact form submissions (basic auth in MVP)
```

### Response Envelope

```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": {
    "locale": "fr",
    "timestamp": "2026-07-22T10:00:00Z"
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "TECHNICIAN_NOT_FOUND",
    "message": "Technician not found with id: abc-123"
  }
}

// Validation Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "phone",
        "message": "Phone number is required"
      }
    ]
  }
}
```

### API Versioning

URL-based versioning (`/api/v1/`). Next version creates `/api/v2/`. Old versions deprecated with 6-month sunset notice. We likely won't need v2 for 2+ years.

---

## 11. Refined Component Architecture

```
RootLayout (RSC)
├── Providers (Theme + i18n — minimal client boundary)
├── Header (RSC)
│   ├── Logo (RSC)
│   ├── NavLinks (RSC)
│   ├── LanguageSwitcher (Client — needs state)
│   └── ThemeToggle (Client — needs state)
├── Children (RSC, might be Client if needed)
│   │
│   ├── HomePage (RSC)
│   │   ├── HeroSection (RSC)
│   │   ├── ServicesGrid (RSC)
│   │   │   └── ServiceCard (RSC)
│   │   ├── TechniciansShowcase (RSC)
│   │   │   └── TechnicianCard (RSC)
│   │   └── CTASection (RSC)
│   │
│   ├── ServicePage (RSC)
│   │   ├── ServiceHeader (RSC)
│   │   └── TechniciansForService (RSC)
│   │       └── TechnicianCard (RSC)
│   │
│   ├── TechnicianPage (RSC)
│   │   ├── TechnicianHero (RSC)
│   │   │   ├── Photo (RSC → Next/Image)
│   │   │   └── Rating (RSC → hardcoded SVG stars)
│   │   ├── ContactSection (Client — click tracking)
│   │   │   ├── CallButton (Client — tel: link)
│   │   │   └── WhatsAppButton (Client — wa.me link)
│   │   ├── InfoSection (RSC)
│   │   │   ├── WorkingHours (RSC)
│   │   │   ├── Languages (RSC)
│   │   │   └── ServiceArea (RSC)
│   │   ├── Gallery (RSC/Client — lightbox future)
│   │   └── ServicesOffered (RSC)
│   │
│   └── ContactPage (RSC with Client form)
│       └── ContactForm (Client — form state, validation)
│
├── Footer (RSC)
└── ScrollToTop (Client — needs scroll event)
```

### Client Component Boundary Analysis

| Component | Why Client | Size Impact |
|-----------|-----------|-------------|
| LanguageSwitcher | Needs `usePathname`, `useRouter` | Minimal (~2KB) |
| ThemeToggle | Needs `useTheme`, click handler | Minimal (~3KB) |
| ContactForm | Needs form state, validation, API call | Medium (~15KB with RHF + Zod) |
| CallButton | Needs click tracking (future) | Minimal |
| WhatsAppButton | Same | Minimal |
| ScrollToTop | Needs scroll event listener | Minimal (~1KB) |

**Total client JS for initial load:** ~5KB (LanguageSwitcher + ThemeToggle).  
**ContactForm is dynamically imported** (only loaded when navigating to contact page).

---

## 12. Design System

### Visual Inspiration Translation

| Brand | What to Steal | How |
|------|---------------|-----|
| **Apple** | Clean layout, generous whitespace, focus on content | 32px+ gaps, minimal borders, content-centered |
| **Airbnb** | Trust signals, human photos, friendly typography | Real technician photos, authentic bios, rounded corners |
| **Stripe** | Monochromatic UI with accent color, great typography | Neutral base, one accent (terracotta/gold), Inter font |
| **Linear** | Dark mode done right, subtle animations, clarity | Slightly tinted dark surfaces, micro-animations |
| **Google** | Speed, simplicity, accessibility | Fast loads, clear hierarchy, WCAG AA+ |

### Color Palette

```ts
// Primary palette — Terracotta & Sand (Moroccan-inspired, premium)
brand: {
  50:  '#fdf8f6',   // Lightest background
  100: '#f9efe9',
  200: '#f2d5c9',
  300: '#e8b49f',
  400: '#dc8d74',
  500: '#c2644a',   // Primary — terracotta
  600: '#a85138',
  700: '#8b402a',
  800: '#733623',
  900: '#5e2c1b',
}

// Neutral — warm grays (not cold blue-grays)
neutral: {
  50:  '#fafaf9',
  100: '#f5f4f2',
  200: '#e8e6e0',
  300: '#d4d0c8',
  400: '#a8a296',
  500: '#7c7568',
  600: '#655f54',
  700: '#4f4a41',
  800: '#3a3730',
  900: '#27251f',
}

// Accent — gold (premium feel, Moroccan heritage)
accent: {
  500: '#d4a74a',
  600: '#b88d33',
}

// Semantic
success: '#22c55e'
warning: '#f59e0b'
error:  '#ef4444'
info:   '#3b82f6'
```

### Typography

```ts
fontFamily: {
  sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
  arabic: ['var(--font-noto-kufi)', 'var(--font-inter)', 'sans-serif'],
}

// Fluid type scale
// Mobile-first, clamped for large screens
h1: 'clamp(2.25rem, 5vw, 3.5rem)'     // 36–56px
h2: 'clamp(1.5rem, 3.5vw, 2.25rem)'   // 24–36px
h3: 'clamp(1.25rem, 2.5vw, 1.5rem)'   // 20–24px
body: 'clamp(1rem, 1.5vw, 1.125rem)'  // 16–18px
small: '0.875rem'                       // 14px
```

### Spacing System

```ts
// Consistent 8px grid
space: {
  0:  '0',
  1:  '0.25rem',   //  4px
  2:  '0.5rem',    //  8px
  3:  '0.75rem',   // 12px
  4:  '1rem',      // 16px
  5:  '1.25rem',   // 20px
  6:  '1.5rem',    // 24px
  8:  '2rem',      // 32px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
}

// Section spacing
section: 'py-16 md:py-24'  // 64px mobile, 96px desktop
card-gap: 'gap-6'           // 24px
content-max: 'max-w-6xl'    // 1152px content width
```

### Border Radius

```ts
radius: {
  sm:    '0.375rem',  //  6px
  md:    '0.5rem',    //  8px
  lg:    '0.75rem',   // 12px
  xl:    '1rem',      // 16px (cards)
  '2xl': '1.5rem',    // 24px (hero sections)
}
```

### Shadows

```ts
shadow: {
  card:    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  elevated:'0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.03)',
  modal:   '0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)',
}
```

### Dark Mode Colors

```ts
dark: {
  background: '#1a1a1a',    // Not pure black — easier on eyes
  surface:    '#242424',     // Card backgrounds
  border:     '#333333',
  text:       '#f5f5f5',
  muted:      '#a3a3a3',
}
```

---

## 13. Design Token Summary

```ts
// tailwind.config.ts (key tokens)
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: { ... },    // Terracotta palette
        neutral: { ... },  // Warm grays
        accent: { ... },   // Gold
      },
      fontFamily: {
        sans: ['Inter', 'system-ui'],
        arabic: ['Noto Kufi Arabic', 'Inter', 'system-ui'],
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
      },
      maxWidth: {
        content: '1152px',  // 72rem = 6xl roughly
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
    },
  },
}
```

---

## 14. Naming Conventions

(Already well-defined in the original doc. One addition:)

### URL Slugs

```text
English:  /en/services/air-conditioner-repair
French:   /fr/services/reparation-climatiseur
Arabic:   /ar/services/اصلاح-مكيف-الهواء

English:  /en/technicians/ahmed-benali
French:   /fr/techniciens/ahmed-benali
Arabic:   /ar/تقنيين/أحمد-بنعلي
```

Slugs are stored in the database per locale (or transliterated deterministically). This is critical for SEO — each locale needs human-readable, keyword-rich URLs.

---

## 15. State Management Strategy

### MVP

| State | Solution |
|-------|----------|
| Theme (dark/light) | `next-themes` React context |
| Locale | `next-intl` handles routing + detection |
| Form state (contact) | Component-local `useState` (simpler than RHF for 3 fields) |
| Server data | RSC direct fetch; no client cache needed |
| UI state (mobile nav, etc.) | Component-local `useState` |

### Future (Trigger Conditions)

| Feature | Trigger | Solution |
|---------|---------|----------|
| Client cache | When more than 3 API calls on a page | TanStack Query |
| Form validation | When forms have 5+ fields | React Hook Form + Zod |
| Global state | When 3+ features share non-server state | Zustand |
| Auth state | When auth is added | Supabase Auth client + React context |

---

## 16. Internationalization Strategy

### Where Translations Live

```text
Frontend message files (messages/{en,fr,ar}.json)
  ├── UI text: buttons, labels, navigation, errors
  ├── SEO: default meta titles, descriptions
  └── Static content: hero section, feature descriptions

Database (service_translations, technician_translations)
  ├── Service names, descriptions
  ├── Technician bios
  └── SEO meta per service per locale
```

### Locale Detection Flow

```text
1. Check cookie (user preference)
2. Check Accept-Language header
3. Default to French (most common in Marrakech for services)
4. Allow manual override via LanguageSwitcher
```

### RTL Implementation

- `dir="rtl"` on `<html>` when locale is Arabic
- TailwindCSS logical properties: `ms-*` / `me-*` instead of `ml-*` / `mr-*`
- shadcn/ui uses Radix's directional primitives
- Test with Arabic lorem ipsum from day 1

---

## 17. Error Handling Strategy

### Frontend

```text
Server Components (RSC):
  - If fetch fails → notFound() or error.tsx boundary
  - No try/catch in RSC — Next.js error boundary catches all

Client Components:
  - API calls: try/catch → setError → show toast or inline message
  - ContactForm: optimistic UI (show success immediately, handle error after)
  - Errors must be user-friendly and localized

404 Pages:
  - Custom not-found.tsx per locale
  - Suggest popular services or technicians

500 Pages:
  - Custom error.tsx per locale
  - "Something went wrong. Please try again or call us directly."
  - Display phone number as fallback
```

### Backend

```text
Exception → Handler → JSON Response

AppError (custom base class):
  ├── NotFoundError       → 404
  ├── ValidationError     → 422 (with field-level details)
  ├── RateLimitError       → 429
  └── InternalError       → 500 (generic, log full trace)

Unhandled exceptions:
  → 500 response with generic message
  → Full traceback logged via structlog
  → No stack traces in production response
```

---

## 18. Logging Strategy

### Backend (structlog)

```json
// Every request
{
  "event": "request.completed",
  "request_id": "req_abc123",
  "method": "GET",
  "path": "/api/v1/technicians",
  "status": 200,
  "duration_ms": 45,
  "locale": "fr",
  "environment": "production"
}

// Errors
{
  "event": "request.error",
  "request_id": "req_abc123",
  "error": "TechnicianNotFound",
  "details": "Technician not found with id: abc-123",
  "traceback": "..."
}
```

### Frontend

- **Dev:** Console logs
- **Prod:** Sentry for error tracking (free tier sufficient)
- **Never log:** Phone numbers, full names, or any PII

---

## 19. Testing Strategy

### MVP Testing

```text
Unit Tests (Vitest + pytest):
  ├── Frontend: utility functions, type guards, formatters
  ├── Backend: service layer, validation schemas
  └── Repository: query logic with test DB

Manual Testing:
  ├── All pages on desktop, tablet, mobile
  ├── Arabic RTL layout
  ├── Dark mode
  ├── Contact form submission (success + validation errors)
  ├── All links and CTAs
  └── Lighthouse audit (target 95+)

No E2E in MVP. No integration tests for API until we have dynamic features.
```

### Test Files

```text
frontend/src/lib/__tests__/
  ├── utils.test.ts
  └── constants.test.ts

backend/tests/
  ├── conftest.py
  ├── test_api/
  │   ├── test_services.py
  │   ├── test_technicians.py
  │   └── test_contact.py
  ├── test_services/
  │   ├── test_service_service.py
  │   └── test_technician_service.py
  └── test_repositories/
      ├── test_service_repo.py
      └── test_technician_repo.py
```

---

## 20. Git Strategy

### Branching Model

```text
main ←── feat/* (squash merge, delete branch)

For solo/small team:
  - Work directly on feature branches
  - Keep commits small and meaningful
  - Squash merge to main
  - Main is always deployable
```

### Commit Convention

```text
feat: add technician profile page
fix: handle missing translation for Arabic
chore: upgrade next-intl to v4.0
refactor: extract technician card component
docs: update README with setup instructions
style: adjust card spacing on mobile
test: add service validation tests
```

---

## 21. CI/CD Strategy

### MVP CI (Single Workflow)

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request, push to main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      # Frontend
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint        # ESLint + Prettier
      - run: npm run typecheck   # tsc --noEmit
      - run: npm run test:ci     # Vitest
      - run: npm run build       # next build

      # Backend
      - uses: actions/setup-python@v5
      - run: pip install -r backend/requirements/dev.txt
      - run: cd backend && ruff check .
      - run: cd backend && mypy app/
      - run: cd backend && pytest
```

### Deployment

```text
Frontend:
  - Vercel auto-deploys from main (GitHub integration)
  - Preview deploys for every PR
  - Custom domain: mudel.ma

Backend:
  - Railway auto-deploys from main (GitHub integration)
  - Railway runs migrations on deploy
  - Subdomain: api.mudel.ma (or Railway-generated)

Database:
  - Supabase PostgreSQL (managed)
  - Alembic migrations run in CI or Railway deploy hook
```

---

## 22. Environment Variables

### Frontend (next.env.local)

```env
# Public (compiled into bundle)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Home Services Marrakech
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CONTACT_EMAIL=hello@mudel.ma
NEXT_PUBLIC_PRIMARY_PHONE=+212600000000

# Private (server-only)
API_INTERNAL_SECRET=    # Optional: for BFF-to-FastAPI auth (future)
```

### Backend (.env)

```env
APP_NAME=Home Services Marrakech API
APP_VERSION=0.1.0
ENVIRONMENT=development
DEBUG=true

DATABASE_URL=postgresql://user:pass@localhost:5432/mudel
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20

CORS_ORIGINS=["http://localhost:3000","https://mudel.vercel.app"]

CONTACT_EMAIL_TO=hello@mudel.ma

# Future
# SUPABASE_URL=
# SUPABASE_SERVICE_KEY=
# REDIS_URL=
# SENTRY_DSN=
```

---

## 23. Security Strategy

### MVP

| Risk | Mitigation |
|------|------------|
| Contact form abuse | Rate limit: 100 requests/hr/IP |
| XSS | React escapes by default; no `dangerouslySetInnerHTML` |
| SQL injection | SQLAlchemy ORM (no raw queries) |
| Sensible CORS | Only allow frontend origins |
| Data exposure | No sensitive data in public API |
| Environment secrets | Never committed; Railway/Vercel dashboard |

### Future

| Feature | Security Measure |
|---------|-----------------|
| Auth | Supabase Auth + JWT + refresh tokens |
| RBAC | Admin, technician, customer roles |
| Row-level security | Supabase RLS policies |
| API rate limiting | Redis + token bucket |
| Audit logging | All mutations logged with user, timestamp, diff |
| Payment data | Stripe (never handle card data directly) |

---

## 24. Performance Strategy

### Build-time

| Tech | Target |
|------|--------|
| SSG all pages | Instant load, no server round-trip |
| Next.js Image optimization | WebP/AVIF, responsive, lazy |
| `next/font` | Zero CIC, self-hosted at build time |
| Bundle analysis | `@next/bundle-analyzer` in CI |
| Lighthouse | 95+ all categories |

### Runtime

| Tech | Target |
|------|--------|
| ISR revalidation | 30-60 minutes for technician pages |
| CDN caching | Vercel Edge Cache for static assets |
| API response time | < 100ms (simple SELECTs with indexes) |
| Client JS | < 50KB initial (most pages are RSC) |
| No render-blocking resources | Font, CSS inlined/critical |

---

## 25. SEO Strategy

### Per-Page Metadata

```typescript
// Each page exports generateMetadata()
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = await getService(params.slug, params.locale);

  return {
    title: `${service.name} | Home Services Marrakech`,
    description: service.description,
    alternates: {
      languages: {
        'en': `/en/services/${params.slug}`,
        'fr': `/fr/services/${params.slug}`,
        'ar': `/ar/services/${params.slug}`,
      },
    },
    openGraph: {
      title: service.name,
      description: service.description,
      locale: params.locale,
    },
  };
}
```

### Structured Data (JSON-LD)

```typescript
// Each technician page includes LocalBusiness schema
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: technician.name,
  image: technician.photo_url,
  telephone: technician.phone,
  areaServed: technician.service_area,
  openingHoursSpecification: /* from JSONB */,
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: technician.rating,
    reviewCount: technician.review_count,
  },
};
```

### Sitemap

```typescript
// app/sitemap.ts — dynamic, includes all locales
// Each URL appears with hreflang alternates
```

### SEO Priorities (Ranked)

1. **Technical foundations** — sitemap, robots, metadata, hreflang
2. **Structured data** — LocalBusiness schema for each technician
3. **Content** — Unique, useful descriptions per service per locale
4. **Performance** — Core Web Vitals directly impact rankings
5. **Backlinks** — Future: directory listings, partnerships, blog

---

## 26. Coding Standards

### TypeScript

```typescript
// ✅ Good
export function formatPhone(phone: string): string { ... }

// ❌ Bad
export const formatPhone = (phone: any) => { ... }

// ✅ Props interface
interface ServiceCardProps {
  service: Service;
  locale: string;
  href: string;
}

// ❌ Inline props
function ServiceCard({ service, locale, href }: { service: any; ... })
```

### Python

```python
# ✅ Good
async def get_technician_by_id(
    technician_id: UUID,
    repo: TechnicianRepository,
) -> Technician:
    ...

# ❌ Bad
def get_technician(id):
    ...
```

### General Rules

- No `any` — use `unknown` and narrow
- No `print()` — use logger (Python) or no-op (production)
- No commented-out code
- No magic numbers/strings
- Functions < 30 lines
- Files < 400 lines
- Type hints everywhere (Python and TypeScript)

---

## 27. Future Roadmap

### Phase 1: MVP (Now — 4 weeks)

- [ ] Project setup (Next.js, FastAPI, PostgreSQL, Docker)
- [ ] Database schema + migrations
- [ ] Seed script (8 services, 3 technicians, 3 locales)
- [ ] Backend API (services, technicians, contact)
- [ ] Frontend pages (home, services, technicians, contact)
- [ ] i18n (EN, FR, AR)
- [ ] Dark mode + RTL
- [ ] SEO (metadata, schema, sitemap)
- [ ] Admin panel (basic CRUD + messages)
- [ ] Deploy (Vercel + Railway)
- [ ] Manual testing + Lighthouse audit

### Phase 2: Validation (1-3 months)

- [ ] Collect feedback from first 10 customers
- [ ] Fix issues, improve UX
- [ ] Add 5-10 more technicians
- [ ] Google Business Profile integration
- [ ] Basic analytics (Plausible or Umami)

### Phase 3: Foundation (3-6 months)

- [ ] Technician accounts (Supabase Auth)
- [ ] Admin dashboard (improved)
- [ ] Booking system (MVP: WhatsApp-based, then in-app)
- [ ] Review system
- [ ] Supabase Storage for technician photos
- [ ] SMS/email notifications

### Phase 4: Growth (6-12 months)

- [ ] Customer accounts
- [ ] Payment integration (Stripe/CMI)
- [ ] Multiple cities (expand beyond Marrakech)
- [ ] Maps + geolocation
- [ ] Mobile app (React Native/Expo)
- [ ] Premium technician listings

### Phase 5: Scale (12-24 months)

- [ ] AI assistant (RAG-based)
- [ ] AI recommendations
- [ ] Subscription plans
- [ ] Business dashboard for technicians
- [ ] CRM
- [ ] Telegram integration
- [ ] WhatsApp API (Business API)
- [ ] Advanced analytics
- [ ] Franchise/hub model for cities

---

## 28. Key Questions for You (Founder)

Before I proceed to implementation, I need answers:

1. **Project name** — Is "Mudel" the name? Or should we choose something else before writing code?

2. **Admin panel scope** — Do you want a basic admin panel in MVP, or is manual DB management acceptable?

3. **Contact form** — Do we need a contact form (name, phone, message), or is call/WhatsApp sufficient?

4. **Photo source** — Technician photos: committed to repo (simple) or uploaded to Supabase Storage (proper)?

5. **Timeline** — What is the target launch date? This affects the scope of Phase 1.

6. **Domain** — Is `mudel.ma` available? Or another domain?

---

## Summary of Changes from Original Architecture

| Change | Reason |
|--------|--------|
| ❌ Removed BFF layer | Unnecessary complexity for MVP; direct RSC → FastAPI |
| ❌ Removed separate frontend/backend CI | Single workflow sufficient for 1-3 person team |
| ❌ Removed E2E testing for MVP | Premature; manual testing sufficient |
| ✅ Kept FastAPI + PostgreSQL from day 1 | Long-term health; migration cost is real |
| ✅ Added `contact_messages` table | CRM foundation; prevents email loss |
| ✅ Added meta_title/meta_desc to translations | SEO requirement |
| ✅ Added technician_translations | Multilingual bios |
| ✅ Added basic admin panel | Avoids manual DB management pain |
| ✅ Added design token details | Ensures consistent premium feel |
| ✅ Added 30-second journey analysis | Core UX metric; architecture optimizes for it |
| ✅ Added risk analysis | Honest assessment of technical and business risks |

---

## My Recommendation

**Proceed with the refined architecture.** The core decisions are sound. The changes I've proposed reduce complexity without sacrificing the long-term vision. The architecture can support 5 years of growth without a rewrite.

Do you want me to proceed with implementation?

If yes, I recommend this order:
1. Initialize the monorepo and tooling (package.json, eslint, prettier, docker-compose)
2. Set up the backend (FastAPI, models, migrations, seed script)
3. Set up the frontend (Next.js, shadcn/ui, tailwind, i18n)
4. Build the pages and features
5. Deploy

Your call.
