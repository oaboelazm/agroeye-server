#!/bin/bash
set -e

echo "Starting AgroEye API Engine..."

# Run uvicorn directly as PID 1 so Docker signals (SIGTERM) are handled correctly.
# --forwarded-allow-ips ensures proper client IP forwarding behind the reverse proxy.
exec python -m uvicorn api_server:app \
    --host 0.0.0.0 \
    --port 8000 \
    --log-level info \
    --forwarded-allow-ips="*" \
    --proxy-headers
