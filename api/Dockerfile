FROM python:3.12-slim AS builder

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt --log /tmp/pip.log

# ─── Production stage ────────────────────────────────────────
FROM python:3.12-slim

# Install system dependencies for OpenCV + curl for healthcheck
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender-dev \
        libxcb1 \
    && rm -rf /var/lib/apt/lists/*
# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Setup CLI symlink
RUN chmod +x /app/agroeye-api \
    && ln -s /app/agroeye-api /usr/local/bin/agroeye-api

# Setup entrypoint
RUN chmod +x /app/entrypoint.sh

# Create runtime directories and set ownership
RUN mkdir -p /app/.run /app/uploaded_scans /app/upload \
    && chown -R appuser:appuser /app

EXPOSE 8000

# Switch to non-root user
USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000')" || exit 1

CMD ["bash", "/app/entrypoint.sh"]