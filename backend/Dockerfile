# =============================================================================
# Stage 1: builder
# Install build dependencies, compile wheels, prepare application
# =============================================================================
FROM python:3.12-slim AS builder

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /build

# Install build dependencies (gcc, libpq-dev for asyncpg compilation)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies into a virtual env for clean copy
COPY requirements/base.txt requirements/base.txt
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements/base.txt

# Copy application source
COPY . .

# =============================================================================
# Stage 2: runtime
# Minimal image with only runtime dependencies
# =============================================================================
FROM python:3.12-slim AS runtime

# Security: prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# Install minimal runtime dependencies (libpq for asyncpg at runtime)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 && \
    rm -rf /var/lib/apt/lists/*

# Copy the virtual env from builder (installed packages only, no build tools)
COPY --from=builder /opt/venv /opt/venv

# Create non-root user and group
RUN groupadd --system app && \
    useradd --system --gid app --home /app --shell /usr/sbin/nologin app

# Set working directory
WORKDIR /app

# Copy application source with correct ownership
COPY --chown=app:app . .

# Ensure the app directory is owned by the app user
# (handles edge cases where COPY --chown doesn't cover nested dirs)
RUN chown -R app:app /app

# Remove files that should never be in production
RUN rm -rf tests/ docs/ scripts/ .pytest_cache/ .coverage htmlcov/ .ruff_cache/ .mypy_cache/

# Switch to non-root user
USER app

EXPOSE 8000

# Health check using the existing /api/v1/health endpoint
# Uses Python urllib (no curl/wget needed)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health')" || exit 1

# Production command: 2 workers for CPU-bound tasks, no reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
