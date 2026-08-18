# =============================================================================
# Mudel Frontend (Next.js 15) — multi-stage production build
# =============================================================================
# Builds a minimal standalone server image (output: 'standalone').
#
# NEXT_PUBLIC_* values are baked into the browser bundle at build time, so
# they are passed as build args and MUST be the public production URLs:
#   NEXT_PUBLIC_API_URL  — backend origin the browser/SSR reach, e.g. https://api.mudel.ma
#   NEXT_PUBLIC_SITE_URL — canonical public site origin (BFF origin/CSRF checks)
#   NEXT_PUBLIC_APP_URL  — public app origin
#   NEXT_PUBLIC_APP_NAME — site name
#
# Server-only secrets (ADMIN_PASSWORD, ADMIN_API_SECRET) are injected at
# runtime via compose environment — they are NOT build args and never end up
# in the browser bundle.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: deps — install exact dependencies from the lockfile
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# Stage 2: builder — compile the Next.js application
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: runner — minimal runtime image with the standalone server
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Non-root user for the standalone server
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone server (traced node_modules + compiled routes)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Public assets (images, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Healthcheck: the standalone server answers HTTP on every route; a 2xx/3xx on
# a real locale route means the app is serving. Uses 127.0.0.1 (not localhost):
# the standalone server binds IPv4 only, and `localhost` resolves to ::1 on
# Alpine, so the check would be refused even when the app is healthy.
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3001/fr || exit 1

CMD ["node", "server.js"]
