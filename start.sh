#!/bin/bash
set -e

echo "[start.sh] Starting FastAPI (uvicorn)..."
uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 1 &
UVICORN_PID=$!

echo "[start.sh] Waiting for FastAPI to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo "[start.sh] FastAPI is ready."
    break
  fi
  if [ $i -eq 30 ]; then
    echo "[start.sh] FastAPI did not become ready in time. Continuing anyway..."
  fi
  sleep 1
done

echo "[start.sh] Starting Node.js server..."
exec node dist/index.js
