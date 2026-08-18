# Marrakech Home Services Platform — Architecture Document

> **Author:** Architecture Team  
> **Status:** Draft for Review  
> **Last Updated:** 2026-07-22  
> **Target Stack:** Next.js (App Router) + FastAPI + PostgreSQL

---

## Table of Contents

1. [Overall Architecture Diagram](#1-overall-architecture-diagram)
2. [Folder Structure](#2-folder-structure)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [API Design](#5-api-design)
6. [Database Schema](#6-database-schema)
7. [Entity Relationships](#7-entity-relationships)
8. [Future Scalability Strategy](#8-future-scalability-strategy)
9. [Internationalization Strategy](#9-internationalization-strategy)
10. [Environment Variables](#10-environment-variables)
11. [Security Recommendations](#11-security-recommendations)
12. [Performance Optimizations](#12-performance-optimizations)
13. [SEO Strategy](#13-seo-strategy)
14. [Component Architecture](#14-component-architecture)
15. [Reusable UI System](#15-reusable-ui-system)
16. [Design Tokens](#16-design-tokens)
17. [Naming Conventions](#17-naming-conventions)
18. [Git Strategy](#18-git-strategy)
19. [Testing Strategy](#19-testing-strategy)
20. [CI/CD Strategy](#20-ci-cd-strategy)
21. [Coding Standards](#21-coding-standards)
22. [State Management Strategy](#22-state-management-strategy)
23. [Image Management Strategy](#23-image-management-strategy)
24. [Error Handling Strategy](#24-error-handling-strategy)
25. [Logging Strategy](#25-logging-strategy)
26. [Configuration Strategy](#26-configuration-strategy)
27. [Deployment Strategy](#27-deployment-strategy)
28. [Suggested Libraries with Justification](#28-suggested-libraries-with-justification)

---

## 1. Overall Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    VERCEL                           │
│  ┌───────────────────────────────────────────────┐  │
│  │           Next.js (App Router)               │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │  │
│  │  │  Pages  │ │  API     │ │  Middleware    │  │  │
│  │  │ (RSC)   │ │ (Routes) │ │ (i18n,Auth)   │  │  │
│  │  └─────────┘ └──────────┘ └───────────────┘  │  │
│  │  ┌────────────────────────────────────────┐   │  │
│  │  │    Feature Modules (colocated)         │   │  │
│  │  │  services | technicians | contact      │   │  │
│  │  └────────────────────────────────────────┘   │  │
│  │  ┌────────────────────────────────────────┐   │  │
│  │  │    Shared UI (shadcn/ui + custom)      │   │  │
│  │  └────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────┘  │
│         │ HTTPS                                    │
└─────────┼───────────────────────────────────────────┘
          │
    ┌─────┴─────┐
    │  CDN      │  Cloudflare / Vercel Edge
    │ (images,  │
    │  static)  │
    └─────┬─────┘
          │
┌─────────┴───────────────────────────────────────────┐
│                   RAILWAY                           │
│  ┌───────────────────────────────────────────────┐  │
│  │            FastAPI Application                │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │  │
│  │  │ Routers │ │ Services │ │ Repositories   │  │  │
│  │  └─────────┘ └──────────┘ └───────────────┘  │  │
│  │  ┌────────────────────────────────────────┐   │  │
│  │  │  Domain Models / Schemas / Middleware  │   │  │
│  │  └────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────┘  │
│         │                                           │
│  ┌──────┴────────────────────────────────────────┐  │
│  │         Supabase PostgreSQL                   │  │
│  │    (Managed DB, future: Auth, Storage)        │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Monorepo** | Single repo (`frontend/`, `backend/`) | MVP simplicity; split later when needed |
| **RSC vs Client** | React Server Components default, client islands | Smaller JS bundles, better SEO, faster LCP |
| **API Layer** | FastAPI on Railway, Next.js API routes as BFF | BFF handles i18n headers, caching; FastAPI owns domain logic |
| **Data Source** | Supabase PostgreSQL | Managed, scales to millions, built-in Auth when ready |
| **Auth** | None in MVP; Supabase Auth prepared | Middleware-ready auth guard, row-level security ready |
| **i18n** | next-intl (file-based routing) | Best DX for App Router, supports RSC, edge-compatible |

### Architecture Principles

1. **Static by default, dynamic by choice** — render on server, hydrate on client
2. **Colocation** — keep components, tests, styles with features
3. **Thin controllers, fat services** — API routes delegate to service layer
4. **Single source of truth** — DB is source; cache is ephemeral
5. **Fail fast** — validate at API boundary, catch early

---

## 2. Folder Structure

```
mudel/
├── frontend/                          # Next.js application
│   ├── public/
│   │   ├── images/
│   │   │   ├── technicians/           # Technician photos (MVP: static)
│   │   │   └── services/              # Service category icons
│   │   ├── fonts/                     # Local fonts (if any)
│   │   ├── robots.txt
│   │   ├── sitemap.xml
│   │   └── manifest.json
│   ├── messages/                      # next-intl translation files
│   │   ├── en.json
│   │   ├── fr.json
│   │   └── ar.json
│   ├── src/
│   │   ├── app/                       # Next.js App Router pages
│   │   │   ├── [locale]/              # Dynamic locale segment
│   │   │   │   ├── page.tsx           # Home page
│   │   │   │   ├── layout.tsx         # Root layout (with locale)
│   │   │   │   ├── not-found.tsx
│   │   │   │   ├── services/
│   │   │   │   │   └── [slug]/
│   │   │   │   │       └── page.tsx   # Service detail page
│   │   │   │   ├── technicians/
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx   # Technician profile page
│   │   │   │   └── contact/
│   │   │   │       └── page.tsx
│   │   │   ├── api/                   # Next.js API routes (BFF)
│   │   │   │   ├── services/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── technicians/
│   │   │   │   │   └── route.ts
│   │   │   │   └── contact/
│   │   │   │       └── route.ts
│   │   │   └── globals.css
│   │   ├── components/                # Shared components
│   │   │   ├── ui/                    # shadcn/ui primitives
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── avatar.tsx
│   │   │   │   ├── sheet.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   └── ...
│   │   │   ├── layout/                # Layout-level components
│   │   │   │   ├── header.tsx
│   │   │   │   ├── footer.tsx
│   │   │   │   ├── mobile-nav.tsx
│   │   │   │   └── theme-toggle.tsx
│   │   │   ├── shared/                # Reusable domain components
│   │   │   │   ├── service-card.tsx
│   │   │   │   ├── technician-card.tsx
│   │   │   │   ├── contact-buttons.tsx
│   │   │   │   ├── star-rating.tsx
│   │   │   │   ├── language-badge.tsx
│   │   │   │   ├── working-hours.tsx
│   │   │   │   └── section-header.tsx
│   │   │   └── providers.tsx          # Theme, i18n providers
│   │   ├── features/                  # Feature-specific logic
│   │   │   ├── services/
│   │   │   │   ├── service-card.tsx
│   │   │   │   ├── service-list.tsx
│   │   │   │   ├── service-detail.tsx
│   │   │   │   └── service-icon.tsx
│   │   │   ├── technicians/
│   │   │   │   ├── technician-grid.tsx
│   │   │   │   ├── technician-profile.tsx
│   │   │   │   ├── technician-photo.tsx
│   │   │   │   └── technician-info.tsx
│   │   │   └── contact/
│   │   │       ├── contact-form.tsx
│   │   │       ├── whatsapp-button.tsx
│   │   │       └── call-button.tsx
│   │   ├── lib/                      # Utilities, helpers
│   │   │   ├── utils.ts              # cn(), formatters
│   │   │   ├── constants.ts          # App-wide constants
│   │   │   ├── config.ts             # Runtime config from env
│   │   │   └── api-client.ts         # Fetch wrapper (BFF calls)
│   │   ├── hooks/                    # Shared React hooks
│   │   │   ├── use-scroll.ts
│   │   │   ├── use-media-query.ts
│   │   │   └── use-whatsapp.ts
│   │   ├── i18n/                     # i18n configuration
│   │   │   ├── request.ts            # next-intl request config
│   │   │   ├── routing.ts            # Locale routing
│   │   │   └── navigation.ts         # Navigation helpers
│   │   ├── types/                    # Shared TypeScript types
│   │   │   ├── service.ts
│   │   │   ├── technician.ts
│   │   │   └── common.ts
│   │   ├── data/                     # Static/mock data (MVP)
│   │   │   ├── services.ts
│   │   │   └── technicians.ts
│   │   └── styles/                   # Additional styles if needed
│   ├── __tests__/                    # Test files
│   │   ├── components/
│   │   └── features/
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   └── .env.local.example
│
├── backend/                           # FastAPI application
│   ├── app/
│   │   ├── main.py                   # FastAPI app entry
│   │   ├── core/                     # Cross-cutting concerns
│   │   │   ├── config.py             # Pydantic Settings
│   │   │   ├── database.py           # SQLAlchemy engine/session
│   │   │   ├── exceptions.py         # Custom exceptions
│   │   │   ├── middleware.py         # CORS, logging, etc.
│   │   │   └── dependencies.py       # DI container
│   │   ├── domain/                   # Domain models (DDD)
│   │   │   ├── __init__.py
│   │   │   ├── service.py
│   │   │   └── technician.py
│   │   ├── models/                   # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── base.py               # Declarative base, mixins
│   │   │   ├── service.py
│   │   │   └── technician.py
│   │   ├── schemas/                  # Pydantic schemas (API layer)
│   │   │   ├── __init__.py
│   │   │   ├── service.py
│   │   │   ├── technician.py
│   │   │   └── common.py             # Pagination, error response
│   │   ├── repositories/            # Repository pattern
│   │   │   ├── __init__.py
│   │   │   ├── base.py               # Abstract base repository
│   │   │   ├── service.py
│   │   │   └── technician.py
│   │   ├── services/                 # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── service.py
│   │   │   └── technician.py
│   │   ├── api/                      # Route handlers
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── router.py         # Main v1 router
│   │   │   │   ├── services.py
│   │   │   │   └── technicians.py
│   │   │   └── deps.py              # Route dependencies
│   │   ├── i18n/                     # Backend i18n (error msgs)
│   │   │   ├── __init__.py
│   │   │   └── messages.py
│   │   └── utils/                    # Utility functions
│   │       ├── __init__.py
│   │       └── image.py
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_api/
│   │   ├── test_services/
│   │   └── test_repositories/
│   ├── alembic/                      # DB migrations
│   │   ├── versions/
│   │   ├── env.py
│   │   └── alembic.ini
│   ├── scripts/
│   │   ├── seed_data.py              # MVP seed script
│   │   └── reset_db.py
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── dev.txt
│   │   └── prod.txt
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── pytest.ini
│   └── .env.example
│
├── .github/                           # GitHub configurations
│   ├── workflows/
│   │   ├── frontend-ci.yml
│   │   ├── backend-ci.yml
│   │   └── deploy.yml
│   ├── CODEOWNERS
│   └── dependabot.yml
│
├── docs/
│   ├── architecture.md                # This document
│   ├── api-spec.yml                   # OpenAPI spec
│   └── decisions/                     # Architecture Decision Records
│       └── 001-use-next-intl.md
│
├── docker-compose.yml                 # Local dev with PostgreSQL
├── .gitignore
├── .prettierrc
├── .eslintrc.js
├── commitlint.config.js
├── README.md
└── package.json                       # Root (workspaces or scripts)
```

### Why This Structure

**Colocation by feature** — each feature owns its components, tests, and types. The `features/` directory contains domain-specific logic, while `components/shared/` holds reusable primitives. This avoids the common mistake of having a flat `components/` with hundreds of files where nothing is findable.

**Separation of concerns** — the backend follows a strict layered architecture: `api` → `services` → `repositories` → `models`. Each layer depends only on the layer below it. This is the Clean Architecture onion.

**Monorepo with boundaries** — frontend and backend live in the same repo but have independent `package.json`, configs, and CI pipelines. They communicate only via HTTP. This lets us split them into separate repos later if performance or team size demands it.

---

## 3. Frontend Architecture

### 3.1 Rendering Strategy

```
┌──────────────────────────────────────────────────────┐
│                   Request Flow                        │
│                                                      │
│  Browser ──► Next.js Edge ──► RSC Render ──► HTML    │
│                 │                    │               │
│              [locale]           [static/dynamic]     │
│                                                      │
│  Static Pages:  /services, /technicians              │
│  (ISR every 1hr)                                     │
│                                                      │
│  Dynamic Pages: /technicians/[id] (technician data)  │
│  (SSR or ISR)                                        │
│                                                      │
│  Client Islands:  Contact buttons, Theme toggle,     │
│                   Framer Motion animations           │
└──────────────────────────────────────────────────────┘
```

### 3.2 Rendering Decisions

| Page | Strategy | Why |
|------|----------|-----|
| Home | Static (SSG) | No dynamic data; content from translation files |
| Services listing | Static (SSG) | Service catalog rarely changes |
| Service detail `[slug]` | Static (SSG) + ISR 1hr | Content is static; ISR catches updates |
| Technicians listing | ISR (30min) | Technicians may update profiles |
| Technician detail `[id]` | ISR (30min) | Same as above |
| Contact page | Static (SSG) | Static content |

### 3.3 Component Tree (MVP)

```
RootLayout
├── Providers (ThemeProvider, NextIntlClientProvider)
├── Header
│   ├── Logo
│   ├── DesktopNav
│   ├── LanguageSwitcher
│   ├── ThemeToggle
│   └── MobileNav (Sheet)
├── Main (children)
│   │
│   ├── HomePage
│   │   ├── HeroSection (with CTA)
│   │   ├── ServicesGrid
│   │   │   └── ServiceCard[]
│   │   ├── TechniciansSection
│   │   │   └── TechnicianCard[]
│   │   ├── FeaturesSection
│   │   └── CTASection
│   │
│   ├── ServiceDetailPage
│   │   ├── ServiceHeader
│   │   ├── ServiceDescription
│   │   └── TechniciansForService
│   │       └── TechnicianCard[]
│   │
│   ├── TechnicianProfilePage
│   │   ├── TechnicianHero (photo, name, rating)
│   │   ├── ContactButtons (Call, WhatsApp)
│   │   ├── ServiceArea
│   │   ├── WorkingHours
│   │   ├── LanguagesBadge
│   │   ├── PhotoGallery
│   │   └── ServicesOffered
│   │
│   └── ContactPage
│       └── ContactInfo + Form
│
├── Footer
│   ├── SiteMap
│   ├── SocialLinks
│   └── Copyright
└── ScrollToTop
```

### 3.4 Data Fetching Pattern

For MVP, the frontend will fetch from the FastAPI backend via Next.js API routes (BFF pattern):

```
Page Component
  │
  ├─► Server Component
  │     └─► fetch() ──► Next.js API Route ──► FastAPI backend
  │                   (BFF: adds locale header,     │
  │                    transforms response,           │
  │                    handles caching)               │
  │
  └─► Client Component (where interactivity needed)
        └─► useSWR() ──► Same BFF endpoint
```

**In MVP**, we may skip FastAPI entirely for the first pages since data is static. The Next.js API route can return mock/static data directly. This lets us deliver the frontend faster and add the backend API when needed.

However, I recommend seeding the FastAPI backend from day 1 for two reasons:
1. **Discipline** — the architecture is real from day 1, no technical debt
2. **Data evolution** — when ratings become dynamic, you just change the API

### 3.5 BFF Layer Responsibilities

Next.js API routes act as a Backend-for-Frontend:
- Translate locale header to backend language
- Cache responses (Next.js built-in `cache()`)
- Transform API responses to match frontend types
- Handle error normalization
- Strip sensitive fields (future: auth tokens)

---

## 4. Backend Architecture

### 4.1 Layered Architecture

```
┌──────────────────────────────────────────────────────┐
│                  API Layer (routers)                  │
│  ┌──────────────────────────────────────────────┐    │
│  │  /api/v1/services                            │    │
│  │  /api/v1/technicians                         │    │
│  │  /api/v1/contact                             │    │
│  └──────────┬───────────────────────────────────┘    │
│             │                                        │
│  ┌──────────▼───────────────────────────────────┐    │
│  │           Service Layer                       │    │
│  │  Orchestrates business logic, calls repos     │    │
│  │  Validates business rules                     │    │
│  └──────────┬───────────────────────────────────┘    │
│             │                                        │
│  ┌──────────▼───────────────────────────────────┐    │
│  │         Repository Layer                      │    │
│  │  Abstract data access (SQLAlchemy queries)    │    │
│  │  Returns domain models                        │    │
│  └──────────┬───────────────────────────────────┘    │
│             │                                        │
│  ┌──────────▼───────────────────────────────────┐    │
│  │      Domain / ORM Models                     │    │
│  │  SQLAlchemy models (DB mapping)              │    │
│  │  Pydantic schemas (API serialization)        │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### 4.2 Dependency Injection

```python
# FastAPI's built-in DI via Depends()
# Example (pseudocode):
@router.get("/technicians")
async def get_technicians(
    locale: str = Header(...),
    repo: TechnicianRepository = Depends(get_technician_repo),
    service: TechnicianService = Depends(get_technician_service),
):
    return await service.list_technicians(locale=locale)
```

Dependencies are wired in `app/core/dependencies.py`. This makes testing trivial — swap the repository with a mock.

### 4.3 Middleware Pipeline

```
Request ──► CORSMiddleware
          ──► LocaleMiddleware (extract Accept-Language)
          ──► LoggingMiddleware (request ID, timing)
          ──► ErrorHandlerMiddleware (catch unhandled)
          ──► Route Handler
          ──► Response (normalized envelope)
```

### 4.4 API Response Envelope

Every response follows a consistent format:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "locale": "fr",
    "timestamp": "2026-07-22T10:00:00Z"
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "TECHNICIAN_NOT_FOUND",
    "message": "Technician not found with id: 42"
  }
}
```

---

## 5. API Design

### 5.1 Endpoints (MVP)

```
GET  /api/v1/services
     └─ List all services (with translations)
     └─ Response: Service[]

GET  /api/v1/services/{slug}
     └─ Get service by slug
     └─ Response: Service

GET  /api/v1/technicians
     └─ List all technicians
     └─ Query: ?service=air-conditioner-repair (optional filter)
     └─ Response: Technician[]

GET  /api/v1/technicians/{id}
     └─ Get technician by ID
     └─ Response: Technician (detailed)

POST /api/v1/contact
     └─ Submit contact form
     └─ Body: { name, phone, message }
     └─ Response: { success: true }
     └─ Note: MVP just logs/emails; future → CRM
```

### 5.2 Future Endpoints (Pre-designed)

```
POST /api/v1/auth/register          # Technician/admin registration
POST /api/v1/auth/login             # Authentication
POST /api/v1/auth/refresh           # Token refresh

GET  /api/v1/bookings               # Customer's bookings
POST /api/v1/bookings               # Create booking
PATCH /api/v1/bookings/{id}         # Update booking status

POST /api/v1/reviews                # Submit review
GET  /api/v1/reviews/technician/{id} # Get technician reviews

POST /api/v1/payments/initiate      # Payment intent
POST /api/v1/payments/confirm       # Confirm payment

GET  /api/v1/notifications          # Get user notifications
POST /api/v1/notifications/register # Register push token

GET  /api/v1/technicians/nearby     # Geolocation search
     └─ Query: lat, lng, radius
```

### 5.3 API Versioning

- URL-based versioning (`/api/v1/`)
- When v2 needed, create `api/v2/` router
- Old versions get a sunset header 6 months before deprecation

---

## 6. Database Schema

### 6.1 MVP Tables

```sql
-- Services catalog (translated via separate table)
CREATE TABLE services (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          VARCHAR(100) UNIQUE NOT NULL,  -- "air-conditioner-repair"
    icon          VARCHAR(50),                    -- icon identifier
    sort_order    INTEGER DEFAULT 0,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Service translations (one per locale)
CREATE TABLE service_translations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id    UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    locale        VARCHAR(5) NOT NULL,            -- "en", "fr", "ar"
    name          VARCHAR(200) NOT NULL,
    description   TEXT,
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
    bio           TEXT,                            -- short description
    rating        DECIMAL(2,1) DEFAULT 5.0,        -- MVP: hardcoded
    review_count  INTEGER DEFAULT 0,
    service_area  VARCHAR(300),                    -- "Marrakech - Gueliz, Medina"
    working_hours JSONB,                           -- {"mon": "9:00-18:00", ...}
    languages     JSONB,                           -- ["Arabic", "French", "English"]
    years_exp     INTEGER,
    is_available  BOOLEAN DEFAULT TRUE,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many: technicians ←→ services
CREATE TABLE technician_services (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    service_id    UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    price_range   VARCHAR(50),                     -- "200-500 MAD"
    UNIQUE(technician_id, service_id)
);

-- Technician photos gallery
CREATE TABLE technician_photos (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    url           VARCHAR(500) NOT NULL,
    caption       VARCHAR(200),
    sort_order    INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.2 MVP Seed Data (3 Technicians)

The seed script will populate:
- 8 services (with translations in 3 languages)
- 3 technicians (with photos, working hours, etc.)
- Service assignments per technician

---

## 7. Entity Relationships

```
┌───────────┐     ┌─────────────────────┐     ┌──────────────────┐
│ services  │─────│ technician_services  │─────│   technicians    │
├───────────┤     ├─────────────────────┤     ├──────────────────┤
│ id (PK)   │     │ id (PK)             │     │ id (PK)          │
│ slug      │     │ technician_id (FK)  │     │ name             │
│ icon      │     │ service_id (FK)     │     │ phone            │
│ sort_order│     │ price_range         │     │ whatsapp         │
│ is_active │     └─────────────────────┘     │ photo_url        │
│ created_at│                                 │ rating           │
└───────────┘                                 │ languages (JSONB)│
       │                                       │ working_hours    │
       │                                       │ (JSONB)          │
       ▼                                       │ service_area     │
┌──────────────────┐                           └────────┬─────────┘
│ service_transl.  │                                    │
├──────────────────┤                                    │
│ id (PK)          │                                    ▼
│ service_id (FK)  │                     ┌──────────────────────┐
│ locale           │                     │  technician_photos   │
│ name             │                     ├──────────────────────┤
│ description      │                     │ id (PK)              │
└──────────────────┘                     │ technician_id (FK)   │
                                          │ url                  │
                                          │ caption              │
                                          │ sort_order           │
                                          └──────────────────────┘
```

### Future Entities (Pre-designed but not implemented)

```
bookings
├── id, customer_name, customer_phone, technician_id (FK)
├── service_id (FK), status, scheduled_at
├── address, notes, created_at

reviews
├── id, booking_id (FK), technician_id (FK)
├── rating, comment, created_at

users (for auth)
├── id, email, password_hash, role (technician/admin/customer)
├── phone, is_active, created_at

notifications
├── id, user_id (FK), type, title, body
├── is_read, created_at

payments
├── id, booking_id (FK), amount, currency
├── method, status, transaction_id
```

---

## 8. Future Scalability Strategy

### 8.1 Short-term (3-6 months after MVP)

| Feature | Strategy |
|---------|----------|
| Auth | Swap from hardcoded data to Supabase Auth. Add middleware in both frontend and backend. |
| Booking | New `features/booking`, new API endpoints, new DB table. No existing code changes. |
| Reviews | Same pattern — new feature module, new endpoints, new table. |
| More cities | Add `city_id` to technicians table. Create `cities` table. Filter by city. |

### 8.2 Medium-term (6-12 months)

| Feature | Strategy |
|---------|----------|
| Payments | Integrate via Stripe or CMI (Moroccan payment gateway). New `features/payments`. |
| Telegram/WhatsApp | Webhook handlers in FastAPI. New `integrations/` package. |
| Admin dashboard | Separate Next.js app under `/admin` route group or standalone app on subdomain. |
| Geolocation | PostGIS extension on PostgreSQL. Add `location` POINT column. |

### 8.3 Long-term (12-24 months)

| Feature | Strategy |
|---------|----------|
| AI Assistant | RAG system with embeddings in PostgreSQL (pgvector). FastAPI serves chatbot endpoints. |
| Native mobile | React Native app (shares TypeScript types via monorepo package). Or Expo. |
| Microservices | If monolith becomes too large, extract payments, notifications, AI as separate services. |

### 8.4 Architectural Guarantees

- **No circular dependencies** — enforced by lint rules (import-linter in Python, import/no-cycle in TS)
- **Feature isolation** — each feature can be extracted to a package without modifying others
- **Database migrations** — Alembic means zero-downtime migrations possible
- **Caching layer** — Redis can be added behind the repository layer without changing business logic

---

## 9. Internationalization Strategy

### 9.1 Frontend (next-intl)

```
messages/
├── en.json     { "home": { "hero_title": "Find the best technician..." } }
├── fr.json     { "home": { "hero_title": "Trouvez le meilleur technicien..." } }
└── ar.json     { "home": { "hero_title": "ابحث عن أفضل فني..." } }
```

### 9.2 Routing Strategy

- Locale as path prefix: `mudel.ma/en/services`, `mudel.ma/fr/services`, `mudel.ma/ar/services`
- `next-intl` handles:
  - Locale detection (cookie > Accept-Language > default: 'fr')
  - Redirect to appropriate locale on root `/`
  - RSC-compatible translations via `useTranslations()`
  - Date/number formatting per locale

### 9.3 Arabic RTL

- TailwindCSS RTL support via `dir="rtl"` on `<html>` when locale is Arabic
- `tailwindcss-rtl` plugin for logical properties (`ms-`/`me-` instead of `ml-`/`mr-`)
- shadcn/ui components use `start`/`end` for positioning (not left/right)

### 9.4 Backend i18n

- Translation of services/technicians stored in DB (translation tables)
- API accepts `Accept-Language` header
- Repository layer filters by locale
- Error messages: Python `gettext` or simple dict-based lookup

### 9.5 SEO Multi-language

- `<link rel="alternate" hreflang="en" href="...">` in `<head>`
- `hreflang="x-default"` for the root redirect page
- Sitemap includes all locale variants
- Each language version indexed separately

---

## 10. Environment Variables

### 10.1 Frontend (.env.local)

```env
# App
NEXT_PUBLIC_APP_URL=https://mudel.ma
NEXT_PUBLIC_APP_NAME=Marrakech Home Services

# API
NEXT_PUBLIC_API_URL=https://api.mudel.ma
API_SECRET_KEY=                          # For BFF-to-FastAPI auth

# Canonical public origin (admin BFF origin/CSRF checks). Required in production.
NEXT_PUBLIC_SITE_URL=https://mudel.ma

# Contact (MVP)
NEXT_PUBLIC_WHATSAPP_NUMBER=+212600000000
NEXT_PUBLIC_CONTACT_EMAIL=contact@mudel.ma

# Future
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
# NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### 10.2 Backend (.env)

```env
# App
APP_NAME=Marrakech Home Services API
APP_VERSION=0.1.0
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=http://localhost:3000,https://mudel.ma

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mudel

# CORS
CORS_ORIGINS=["http://localhost:3000"]

# Contact (MVP)
CONTACT_EMAIL_TO=hello@mudel.ma
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Future
# SUPABASE_URL=
# SUPABASE_SERVICE_KEY=
# REDIS_URL=
# STRIPE_SECRET_KEY=
# TELEGRAM_BOT_TOKEN=
# WHATSAPP_API_KEY=
```

### 10.3 Configuration Management

- **Frontend:** `NEXT_PUBLIC_*` vars compiled at build time; runtime config via `/api/config` endpoint if needed
- **Backend:** Pydantic `BaseSettings` with `.env` file support; typed, validated at startup
- **Secrets:** Never committed to repo; stored in Railway dashboard / Vercel environment

---

## 11. Security Recommendations

### 11.1 MVP Security

| Concern | Mitigation |
|---------|------------|
| No user input | Contact form: validate email/phone server-side, rate-limit by IP |
| CORS | Restrict to frontend domain |
| API keys | Secret key shared between Next.js BFF and FastAPI |
| Headers | Helmet-like middleware: CSP, HSTS, X-Frame-Options |
| Rate limiting | Slow down contact form abuse (100 req/hr/IP) |
| SQL injection | SQLAlchemy ORM prevents injection by design |
| XSS | React escapes by default; never use `dangerouslySetInnerHTML` |

### 11.2 Security Roadmap (Post-MVP)

| Feature | Implementation |
|---------|---------------|
| Auth | Supabase Auth with JWT + refresh tokens |
| RBAC | Role-based access: admin, technician, customer |
| API auth | JWT validation middleware in FastAPI |
| HTTPS only | Enforced at Vercel/Railway edge (TLS termination) |
| Data validation | Pydantic strict mode on all inputs |
| Audit logging | Log all mutations with user ID, timestamp, diff |
| Rate limiting | Redis-based token bucket for authenticated routes |
| CORS | Strict origin validation per environment |

### 11.3 Principle of Least Privilege

- Database user has only CRUD on needed tables
- API secret key has read-only access for MVP (public data)
- Future: Supabase RLS policies for row-level security

---

## 12. Performance Optimizations

### 12.1 Frontend

| Technique | Application |
|-----------|-------------|
| **RSC** | Server Components render HTML, no client JS for static content |
| **ISR** | Static pages revalidate periodically; no cold starts |
| **Image optimization** | Next.js `<Image>` with WebP/AVIF, lazy loading, responsive sizes |
| **Font optimization** | Next.js font system (Google Fonts self-hosted via `next/font`) |
| **Bundle splitting** | Dynamic imports for heavy components (Framer Motion, contact form) |
| **Preload critical assets** | Hero image, logo, font files |
| **Minimize JS** | Client components only where interactivity needed |
| **Link prefetching** | `<Link>` prefetches in viewport automatically |

### 12.2 Backend

| Technique | Application |
|-----------|-------------|
| **Async I/O** | FastAPI async handlers for DB queries |
| **Connection pooling** | SQLAlchemy pool_size=10, max_overflow=20 |
| **Response caching** | FastAPI `@cache` decorator + CDN cache headers |
| **Gzip compression** | Enabled at Railway/reverse proxy level |
| **DB indexing** | Indexes on: services.slug, technicians.slug, FKs |
| **Query optimization** | Select only needed columns, eager load for relationships |
| **Pagination** | Offset/limit for list endpoints (cursor-based for future scale) |

### 12.3 Target Metrics

| Metric | Target |
|--------|--------|
| Lighthouse Performance | ≥ 95 |
| LCP | ≤ 1.5s |
| FID | ≤ 50ms |
| CLS | ≤ 0.05 |
| First byte (API) | ≤ 200ms |
| JS bundle (initial) | ≤ 100KB |

---

## 13. SEO Strategy

### 13.1 Technical SEO

| Element | Implementation |
|---------|---------------|
| **Meta tags** | Dynamic `generateMetadata()` per page with locale-aware titles/descriptions |
| **Open Graph** | Custom images per page, Twitter cards |
| **Structured data** | JSON-LD `LocalBusiness`, `Service` schema for each technician/service |
| **Sitemap** | Dynamic `sitemap.ts` generating entries for each locale × page |
| **Robots.txt** | Static file, allow all crawl |
| **Canonical URLs** | `alternate` hreflang tags in layout |
| **Semantic HTML** | `article`, `section`, `nav`, `header`, `footer` — no div soup |
| **Heading hierarchy** | Single `h1` per page, hierarchical h2→h3 |
| **Descriptive slugs** | `/en/services/air-conditioner-repair`, `/fr/techniciens/ahmed-benali` |
| **Breadcrumbs** | JSON-LD breadcrumbList on interior pages |

### 13.2 Content SEO

- Homepage: targeted keyword in hero, subheadings, and meta
- Service pages: unique content per service, per locale
- Technician pages: name, bio, years of experience, service area
- Blog (future): `/blog/` section for maintenance tips, driving organic traffic

### 13.3 Local SEO (Marrakech)

- Google Business Profile integration (link from site)
- Schema `PostalAddress` with Marrakech location
- City name in titles: "Réparation Climatisation Marrakech"
- Reviews schema markup (even hardcoded)
- NAP (Name, Address, Phone) consistency

### 13.4 Performance × SEO

SEO score is directly impacted by Core Web Vitals. Our rendering strategy (SSG/ISR) and image optimization ensure CWV targets are met.

---

## 14. Component Architecture

### 14.1 Component Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                  Pages (app router)                  │
│  Orchestrate layout, data fetching, SEO metadata    │
├─────────────────────────────────────────────────────┤
│              Feature Components                     │
│  services/*, technicians/*, contact/*               │
│  Domain-specific, reusable within feature           │
├─────────────────────────────────────────────────────┤
│              Shared Components                      │
│  service-card, technician-card, contact-buttons     │
│  Domain-aware but feature-agnostic                  │
├─────────────────────────────────────────────────────┤
│              Layout Components                      │
│  header, footer, mobile-nav, theme-toggle           │
│  App-level structure — rendered once                │
├─────────────────────────────────────────────────────┤
│              UI Primitives (shadcn/ui)              │
│  button, card, badge, avatar, sheet, dialog, etc.   │
│  Fully generic, no business logic                   │
└─────────────────────────────────────────────────────┘
```

### 14.2 Component Decision Framework

When building a new component, ask:

1. **Is it a UI primitive?** → `components/ui/` (add to shadcn registry)
2. **Is it layout?** → `components/layout/` (header, footer, nav)
3. **Does it contain business logic?** →
   - Used only in one feature? → `features/X/`
   - Used across features? → `components/shared/`
4. **Is it a page?** → `app/[locale]/X/page.tsx`

### 14.3 Component API Design

- **Props interface** — always typed, always explicit (no `any`)
- **Default exports** — only pages; all components are named exports
- **Composition** — use `children` and render props over inheritance
- **As much as possible** — Server Components by default, `"use client"` only when needed

---

## 15. Reusable UI System

### 15.1 shadcn/ui Customization

- Install via CLI (not npm package) — gives us editable source
- Customize theme in `tailwind.config.ts` (Marrakech colors: terracotta, gold, sand)
- Build custom primitives on top of Radix UI (same foundation as shadcn)

### 15.2 Our Custom Primitives

```
components/ui/           # shadcn defaults + overrides
components/shared/       # Business-aware but reusable
  ├── service-card.tsx    # Props: service, locale, href
  ├── technician-card.tsx # Props: technician, locale, variant (compact|detailed)
  ├── contact-buttons.tsx # Props: phone, whatsapp
  ├── star-rating.tsx     # Props: rating, max (no interactivity in MVP)
  ├── language-badge.tsx  # Props: languages[]
  ├── working-hours.tsx   # Props: hours (JSON)
  ├── section-header.tsx  # Props: title, description, action?
  ├── phone-link.tsx      # Props: phone (renders tel: link)
  └── whatsapp-link.tsx   # Props: phone, message (renders wa.me link)
```

---

## 16. Design Tokens

### 16.1 Color Palette

```ts
// tailwind.config.ts
colors: {
  brand: {
    50:  '#fdf8f0',    // sand light
    100: '#f9edd9',
    200: '#f2d9b0',
    300: '#e8bf7d',
    400: '#dda54f',    // gold
    500: '#d18a2c',    // primary
    600: '#b06e21',
    700: '#8e531a',
    800: '#744215',
    900: '#5e3512',
  },
  terracotta: {
    500: '#c2644a',
    600: '#a85138',
  },
  surface: {
    DEFAULT: '#ffffff',
    muted:   '#f5f5f0',   // off-white
    dark:    '#1a1a1a',
  },
}
```

### 16.2 Typography

```ts
// Tailwind config
fontFamily: {
  sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
  arabic: ['var(--font-noto-kufi)', 'sans-serif'],  // For Arabic text
}

// Font sizes (mobile-first, fluid via clamp)
// h1: clamp(2rem, 5vw, 3.5rem)
// h2: clamp(1.5rem, 3vw, 2.5rem)
// body: 1rem
```

### 16.3 Spacing

- 4px grid base (tailwind defaults)
- Consistent component gaps: `gap-4` (16px) between cards, `gap-8` (32px) between sections
- Section padding: `py-16 md:py-24`

### 16.4 Dark Mode

- Implemented via Tailwind `dark:` variant + `next-themes`
- `ThemeProvider` wraps app, respects system preference
- Dark palette: deep charcoal backgrounds, lighter text, desaturated brand colors
- shadcn/ui components support dark mode out of the box

---

## 17. Naming Conventions

### 17.1 Frontend (TypeScript/React)

| Artifact | Convention | Example |
|----------|-----------|---------|
| Components | PascalCase | `ServiceCard`, `TechnicianProfile` |
| Files | kebab-case | `service-card.tsx`, `contact-buttons.tsx` |
| Page files | `page.tsx` | `app/[locale]/services/page.tsx` |
| Layout files | `layout.tsx` | `app/[locale]/layout.tsx` |
| Hooks | camelCase, `use` prefix | `useScroll`, `useMediaQuery` |
| Utilities | camelCase | `formatPhone`, `cn` |
| Types/Interfaces | PascalCase | `Technician`, `Service` |
| Props interfaces | PascalCase + `Props` | `ServiceCardProps` |
| Constants | UPPER_SNAKE_CASE | `CONTACT_EMAIL`, `SERVICES` |
| Folders | kebab-case | `service-card/`, `technician-grid/` |
| CSS classes | Tailwind (no custom classes unless needed) | — |

### 17.2 Backend (Python)

| Artifact | Convention | Example |
|----------|-----------|---------|
| Modules | snake_case | `service.py`, `technician.py` |
| Classes | PascalCase | `TechnicianRepository`, `TechnicianService` |
| Functions | snake_case | `get_technician_by_id` |
| Variables | snake_case | `technician_id` |
| Constants | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE` |
| Routes | snake_case (URLs: kebab) | `router.get("/technicians")` |
| DB models | PascalCase, singular | `class Technician(Base)` |
| Pydantic schemas | PascalCase | `TechnicianResponse`, `TechnicianCreate` |
| Tests | `test_` prefix | `test_technician_service.py` |

### 17.3 Database

| Artifact | Convention | Example |
|----------|-----------|---------|
| Tables | snake_case, plural | `services`, `technicians` |
| Columns | snake_case | `sort_order`, `service_area` |
| Primary keys | `id` | `id UUID PRIMARY KEY` |
| Foreign keys | `{table}_id` | `technician_id`, `service_id` |
| Indexes | `idx_{table}_{column}` | `idx_technicians_slug` |
| Unique constraints | `uq_{table}_{column}` | `uq_service_translations_locale` |

### 17.4 Git

| Convention | Example |
|------------|---------|
| Branch names | `feat/booking-system`, `fix/contact-form`, `chore/upgrade-deps` |
| Commits | Conventional Commits: `feat: add technician profile page` |

---

## 18. Git Strategy

### 18.1 Branching Model

```
main          ─── production-ready code
  │
  ├── develop  ─── integration branch
  │     │
  │     ├── feat/*        ─── new features
  │     ├── fix/*         ─── bug fixes
  │     ├── chore/*       ─── dependencies, config, tooling
  │     └── refactor/*    ─── code improvements
  │
  └── release/* ─── release candidates (tagged)
```

For MVP (single developer), a simpler approach:
```
main ←── feat/* (squash merge, delete branch)
```

### 18.2 Commit Convention

```
<type>(<scope>): <description>

Types: feat, fix, chore, refactor, test, docs, style, perf
Scope: frontend, backend, db, config, deps

Examples:
feat(frontend): add technician profile page
feat(backend): add services API endpoint
fix(backend): handle missing translation gracefully
chore(deps): upgrade Next.js to 15.x
```

### 18.3 Pull Request Checklist

- [ ] Lint passes (`npm run lint`, `ruff check`)
- [ ] TypeScript/Python type checking passes
- [ ] Tests pass (unit + integration)
- [ ] No `console.log` / `print` debugging
- [ ] Translations updated (if applicable)
- [ ] Screenshot attached (UI changes)
- [ ] Documentation updated (if applicable)

---

## 19. Testing Strategy

### 19.1 Frontend Testing

| Layer | Tool | What to test |
|-------|------|-------------|
| Unit | Vitest + React Testing Library | Components, hooks, utilities |
| Integration | Vitest + RTL | Component interaction, data flow |
| E2E | Playwright | Critical user journeys (home → service → technician → contact) |
| Accessibility | axe-core (via Playwright) | WCAG 2.1 AA compliance |
| Visual | Playwright snapshot | Visual regression on key pages |

**Coverage goals:**
- Utilities: 100%
- Hooks: 100%
- Components: 80% (focus on interactive/business logic)
- Pages: E2E covers critical paths

**What NOT to test in MVP:**
- Pure UI primitives (shadcn components — already tested by Radix)
- Static content rendering (trust Next.js SSG)
- Translation completeness (test only that keys resolve)

### 19.2 Backend Testing

| Layer | Tool | What to test |
|-------|------|-------------|
| Unit | pytest | Service layer logic, validation |
| Integration | pytest + TestClient | API endpoints (status, response shape, errors) |
| Repository | pytest + test DB | Query correctness, edge cases |
| Database | Alembic (verify migrations up/down cleanly) | Migration consistency |

**Approach:**
- Use pytest fixtures for test DB (in-memory SQLite for unit, PostgreSQL in Docker for integration)
- Mock external services (email, SMS) in service tests
- Factory fixtures for test data

### 19.3 Testing Pyramid

```
         ╱╲
        ╱ E2E ╲           ~5% of tests
       ╱────────╲
      ╱Integration╲       ~25% of tests
     ╱──────────────╲
    ╱   Unit Tests    ╲    ~70% of tests
   ╱────────────────────╲
```

### 19.4 Test Naming

```
Frontend:
  service-card.test.tsx
  technician-service.test.ts

Backend:
  test_service_repository.py
  test_technician_service.py
  test_api_technicians.py
```

---

## 20. CI/CD Strategy

### 20.1 GitHub Actions Workflows

```
┌──────────────────────────────────────────────────┐
│                  Pull Request                     │
├──────────────────────────────────────────────────┤
│ 1. Lint (ESLint + Prettier / ruff)               │
│ 2. Type Check (tsc --noEmit / mypy)              │
│ 3. Unit Tests (Vitest / pytest)                  │
│ 4. Build (next build / Docker build)             │
│ 5. Preview Deploy (Vercel Preview / Railway)     │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│                  Push to main                     │
├──────────────────────────────────────────────────┤
│ 1. Same checks as PR                             │
│ 2. E2E Tests (Playwright)                        │
│ 3. Deploy Frontend (Vercel Production)           │
│ 4. Deploy Backend (Railway)                      │
│ 5. Run DB Migrations (Alembic upgrade head)      │
└──────────────────────────────────────────────────┘
```

### 20.2 Frontend CI (frontend-ci.yml)

```
name: Frontend CI
on: [pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:ci
      - run: npm run build
```

### 20.3 Backend CI (backend-ci.yml)

```
name: Backend CI
on: [pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install -r requirements/dev.txt
      - run: ruff check .
      - run: mypy app/
      - run: pytest tests/ --cov=app
      - run: alembic upgrade head
```

### 20.4 Deployment

| Environment | Frontend | Backend |
|-------------|----------|---------|
| Production | Vercel (auto from `main`) | Railway (auto from `main`) |
| Preview | Vercel (per PR) | Railway (per PR — optional) |
| Local | `npm run dev` | `uvicorn app.main:app --reload` |

---

## 21. Coding Standards

### 21.1 General

- **No commented-out code** — delete it; git history is our undo
- **No `any` in TypeScript** — use `unknown` and narrow, or define proper types
- **No `print()` in Python** — use logger
- **No magic numbers/strings** — constants file or enum
- **Function length** — ideally < 20 lines; extract when a comment would be needed
- **File length** — < 400 lines; split into modules if longer

### 21.2 Python Specific

- Type hints everywhere (mypy strict mode)
- Docstrings: Google style for public modules/classes/functions
- FastAPI: use `response_model` for all endpoints (automatic validation + OpenAPI)
- SQLAlchemy: prefer `select()` over legacy `Query` API
- Imports order: stdlib → third-party → local (groups separated by blank line)

### 21.3 TypeScript/React Specific

- `"use client"` as narrow as possible — don't let client boundaries leak up the tree
- Exports: named exports for components (allows tree-shaking better than default)
- `useEffect` — always consider if you actually need it; prefer event handlers
- State co-location — state lives as close as possible to where it's used
- Props: destructure in function signature, not in body

### 21.4 Linters

| Tool | Config | Rules |
|------|--------|-------|
| ESLint | `.eslintrc.js` (extends next/core-web-vitals) | React hooks, import order, no-any |
| Prettier | `.prettierrc` | 100 print width, single quotes, trailing commas |
| ruff | `pyproject.toml [tool.ruff]` | E, F, I, N, W rules, 100 line length |
| mypy | `pyproject.toml [tool.mypy]` | strict mode |

---

## 22. State Management Strategy

### 22.1 MVP State

For MVP, we don't need a state management library. The state is minimal:

| State type | Where it lives |
|-----------|---------------|
| UI state (theme, mobile menu) | React `useState` + `next-themes` for dark mode |
| Server data | RSC fetch (no client state needed) |
| Form state (contact) | Local component state (or React Hook Form) |
| URL state (locale, active tab) | Next.js params/search params |

### 22.2 Future State Strategy

| State type | Solution | When to add |
|-----------|----------|-------------|
| Server cache | TanStack Query (React Query) | When we have auth, bookings, reviews |
| Auth state | Supabase Auth client + React context | When auth is added |
| Form state | React Hook Form + Zod | When booking forms exist |
| Global app state | Zustand (lightweight, no boilerplate) | If multiple features need shared state |
| URL state | Next.js `useSearchParams` | Always prefer this for shareable state |

**Rationale for Zustand over Redux:** For this project, Zustand is sufficient. It's ~1KB, has no boilerplate, works with React Server Components via selectors, and scales well. Redux would be overkill unless we hit 50+ pages with complex cross-feature state.

---

## 23. Image Management Strategy

### 23.1 MVP Approach

- Technician photos: stored in `/public/images/technicians/` (committed to repo)
- Service icons: SVG icons in `/public/images/services/`
- All images: optimized by Next.js `<Image>` component at build time
- Format: WebP (with PNG fallback via `<picture>` or Next.js auto-optimization)

### 23.2 Future Strategy

| Phase | Storage | Optimization |
|-------|---------|-------------|
| MVP | Local `/public/` | Next.js built-in optimization |
| Post-MVP | Supabase Storage | Signed URLs, auto-thumbnails |
| Scale | Cloudflare Images / Imgix | CDN, transform on demand, resize at edge |

### 23.3 Image Format Decision

- **Technician photos:** WebP (with JPEG fallback), max 800px wide for gallery, 200px for thumbnails
- **Service icons:** SVG (scales infinitely, accessible, themed)
- **Hero images:** WebP, max 1920px, compressed heavily (quality 70)

---

## 24. Error Handling Strategy

### 24.1 Frontend

```
Layer              Strategy
──────────────────────────────────────────────────
Page level         error.tsx (Next.js error boundary)
                   └─ Shows localized error UI with retry button

Layout level       global-error.tsx (last resort)
                   └─ Minimal error page

API calls (BFF)    try/catch → normalized error response
                   └─ Display toast or inline error

Forms              React Hook Form + Zod validation
                   └─ Inline field errors, server-side validation
```

**Key rule:** Never show raw error messages to users. Map all errors to user-friendly localized messages.

### 24.2 Backend

```python
# Exception hierarchy
class AppError(Exception):
    status_code: int
    code: str  # Machine-readable error code
    message: str  # Human-readable

class NotFoundError(AppError): ...
class ValidationError(AppError): ...
class ConflictError(AppError): ...
class ExternalServiceError(AppError): ...
```

- Global exception handler catches `AppError` → formatted JSON response
- Unhandled exceptions → 500 with generic message + server log detail
- Pydantic validation errors → 422 with field-level details

### 24.3 Error Codes (Machine-readable)

```
SERVICE_NOT_FOUND
TECHNICIAN_NOT_FOUND
TRANSLATION_NOT_FOUND
VALIDATION_ERROR
RATE_LIMIT_EXCEEDED
INTERNAL_ERROR
```

---

## 25. Logging Strategy

### 25.1 Frontend

- **Development:** Console logs (filtered in Next.js dev tools)
- **Production:** Logging service (Sentry or Logtail)
- **What to log:**
  - API errors (4xx/5xx from BFF)
  - Unhandled React errors (via `Sentry.ErrorBoundary`)
  - Critical user actions (contact form submission)
- **What NOT to log:** PII (phone numbers, full names in cleartext)

### 25.2 Backend

- **Library:** `structlog` (structured JSON logging)
- **Log format:** JSON (parsable by Datadog, Logtail, or Railway logs)
- **Context per request:** request_id, locale, user_id (future), latency
- **Log levels:**
  - `ERROR`: Unhandled exceptions, external service failures
  - `WARNING`: Rate limit approaching, 404s, validation failures
  - `INFO`: Request start/end, mutations (contact form)
  - `DEBUG`: SQL queries, detailed timing (dev only)

**Example structured log:**
```json
{
  "event": "request_completed",
  "request_id": "req_abc123",
  "method": "GET",
  "path": "/api/v1/technicians",
  "status": 200,
  "latency_ms": 45,
  "locale": "fr"
}
```

---

## 26. Configuration Strategy

### 26.1 MVP Configuration

| Concern | Solution |
|---------|----------|
| Environment | `.env` files (frontend: `.env.local`, backend: `.env`) |
| Validation | Pydantic `BaseSettings` (fail fast on startup) |
| Frontend runtime | Build-time env vars; runtime via `/api/config` if needed |
| Secrets | Never in repo; Railway/Vercel dashboard |
| Feature flags | Simple env var `ENABLE_X=true` |

### 26.2 Future Configuration

| Concern | Solution |
|---------|----------|
| Feature flags | LaunchDarkly or custom flag service |
| Central config | Consul / AWS AppConfig (when microservices emerge) |
| Secrets manager | Infisical (open-source, self-hostable) or Vault |
| DB config | Stored in `app_config` table for admin UI |

---

## 27. Deployment Strategy

> **Current deployment (supersedes the Vercel/Railway plan below):** the
> production stack runs on **Oracle Cloud** as containers with **Supabase
> PostgreSQL as the only production database**. See `docker-compose.prod.yml`
> (Redis + backend + frontend; no Postgres container) and the README
> "Production on Oracle Cloud" section. Frontend is built `output:
> 'standalone'` (`frontend/Dockerfile`). Sections 27.1–27.2 describe the
> earlier hosted-PaaS plan and are kept for reference.

### 27.1 Frontend Deployment (Vercel)

```
┌──────────────────┐
│  Push to main    │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Vercel detects  │
│  frontend/ dir   │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  npm run build   │
│  (SSG all pages) │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Deploy to Edge  │
│  Network         │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Custom domain   │
│  mudel.ma        │
└──────────────────┘
```

- Preview deployments for every PR (Vercel automatically creates them)
- `vercel.json` configures rewrites for API BFF routes

### 27.2 Backend Deployment (Railway)

```
┌──────────────────┐
│  Push to main    │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Railway build   │
│  Dockerfile      │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Start FastAPI   │
│  via uvicorn     │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Railway managed │
│  PostgreSQL      │
│  + Run migrations│
└──────────────────┘
```

- Health check endpoint (`/health`) for Railway
- Auto-scaling: Railway scales horizontally when traffic increases
- Zero-downtime deployments via Railway's rolling update

### 27.3 Domain & DNS

```
mudel.ma ────► Vercel (frontend)
api.mudel.ma ─► Railway (backend)

CNAME records for both subdomains
Cloudflare CDN in front (or Vercel's built-in CDN)
```

---

## 28. Suggested Libraries with Justification

### 28.1 Frontend

| Library | Purpose | Justification |
|---------|---------|---------------|
| **next-intl** | i18n | Best App Router i18n; RSC support, edge-compatible, file-based messages |
| **next-themes** | Dark mode | 1KB, works with Next.js, persists preference, no flicker |
| **framer-motion** | Animations | Industry standard React animation; layout animations, gestures |
| **lucide-react** | Icons | Tree-shakeable, consistent design, no runtime cost |
| **clsx + tailwind-merge** | Class utilities | `cn()` pattern is shadcn standard; handles conflicts |
| **react-hook-form + zod** | Forms | Performant (uncontrolled), type-safe validation, familiar |
| **@tanstack/react-query** | Server state | Future: caching, deduplication, stale management (NOT in MVP) |
| **zustand** | Client state | Future: lightweight global state (NOT in MVP) |
| **playwright** | E2E tests | Cross-browser, reliable, popular, integrates with CI |
| **vitest** | Unit tests | Fast, Vite-native, compatible with Next.js |

### 28.2 Backend

| Library | Purpose | Justification |
|---------|---------|---------------|
| **fastapi** | Web framework | Async, auto-OpenAPI, Pydantic integration, fastest Python web framework |
| **uvicorn[standard]** | ASGI server | Production-grade, HTTP/1.1 + WebSocket support |
| **sqlalchemy[asyncio]** | ORM | Mature, well-documented, async support, Alembic compatible |
| **alembic** | Migrations | The standard for SQLAlchemy; declarative, auto-generation |
| **pydantic** | Validation | Built into FastAPI; strict mode, JSON schema generation |
| **psycopg2-binary** | PostgreSQL driver | Async driver for SQLAlchemy async |
| **python-dotenv** | Env vars | Standard, zero-config |
| **httpx** | HTTP client | Async, needed for future integrations (Telegram, external APIs) |
| **ruff** | Linter | 100x faster than flake8, unified formatter |
| **mypy** | Type checker | Strict mode, catches real bugs, standard for Python |
| **pytest** | Testing | Standard, fixtures, parametrize, FastAPI TestClient |
| **structlog** | Logging | Structured JSON logging, context-rich |
| **sentry-sdk** | Error tracking | Production error monitoring, performance tracing |

### 28.3 Development

| Tool | Purpose |
|------|---------|
| **docker-compose** | Local PostgreSQL, reproducible environment |
| **commitlint** | Enforce commit conventions |
| **husky** | Git hooks (pre-commit lint, pre-push tests) |
| **lint-staged** | Run linters only on staged files (fast) |
| **turborepo** | Future: monorepo orchestration, caching builds |

---

## Appendix: Key Design Decisions Summary

### ADR-001: Why not use i18n routing in App Router directly?

Next.js built-in i18n is deprecated in App Router. `next-intl` is the community standard, endorsed by Vercel, and supports edge runtime, RSC, and complex routing needs like cookie-based locale persistence.

### ADR-002: Why BFF pattern instead of direct FastAPI calls?

Direct calls from client to FastAPI would expose our internal API, bypass Next.js caching, complicate CORS, and make it harder to future-proof auth (Supabase session validation). BFF is a thin layer that pays for itself with the first authenticated request.

### ADR-003: Why UUIDs over auto-increment IDs?

UUIDs prevent enumeration attacks (bad actors guessing technician IDs), support distributed systems (no central sequence), and are the Supabase default. The storage cost (16 bytes vs 4) is negligible at our scale.

### ADR-004: Why JSONB for working_hours and languages?

These are read-heavy, write-rare data structures that vary per technician. Normalizing them into separate tables would add joins with no benefit at MVP scale. PostgreSQL JSONB is indexable and queryable when we need it.

### ADR-005: Why not SSR all pages (instead of SSG/ISR)?

For a directory-style site with mostly static content (technician profiles, service descriptions), SSG provides the best performance (instant load, no server round-trip). ISR ensures updates propagate within 30-60 minutes — fast enough for this use case. SSR would add latency and server cost with no user benefit.

---

## Next Steps (After Architecture Approval)

1. **Skeleton setup** — Initialize monorepo, Next.js, FastAPI, Docker Compose, CI
2. **Database** — Create migrations, seed data for 3 technicians and 8 services
3. **Backend API** — Implement MVP endpoints (services, technicians)
4. **Frontend pages** — Home, service detail, technician profile, contact
5. **i18n** — Translation files for en/fr/ar
6. **Dark mode + RTL** — Theme system and Arabic layout
7. **SEO** — Metadata, structured data, sitemap, robots
8. **Testing** — Critical path E2E, unit tests
9. **Deploy** — Vercel + Railway, custom domain
10. **Polish** — Animations, performance audit, Lighthouse 95+

---

*This document is a living artifact. Update it as architecture evolves.*
