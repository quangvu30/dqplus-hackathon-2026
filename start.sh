#!/usr/bin/env bash
# Starts postgres (pgvector) via docker compose, then all three backend services.
# Ctrl+C stops the node services (postgres container keeps running).
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

SERVICES=(
  "backend/gateway:gateway"
  "backend/agent/extract:extract"
  "backend/matching-engine:matching-engine"
)

PIDS=()

cleanup() {
  echo ""
  echo "Stopping services..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null
  exit 0
}
trap cleanup INT TERM

# 1. Ensure env files exist (copy from .env.example on first run; never overwrite)
if [ ! -f "$ROOT_DIR/.env" ] && [ -f "$ROOT_DIR/.env.example" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  echo "Created root .env from .env.example."
fi

for entry in "${SERVICES[@]}"; do
  dir="${entry%%:*}"
  svc_path="$ROOT_DIR/$dir"
  if [ ! -f "$svc_path/.env" ] && [ -f "$svc_path/.env.example" ]; then
    cp "$svc_path/.env.example" "$svc_path/.env"
    echo "Created $dir/.env from .env.example."
  fi
done

# 2. Start postgres (pgvector) via docker compose
echo "Starting postgres (pgvector) via docker compose..."
if (cd "$ROOT_DIR" && docker compose up -d postgres); then
  echo "Waiting for postgres to become healthy..."
  for i in $(seq 1 30); do
    status="$(docker inspect --format='{{.State.Health.Status}}' dqplus-postgres 2>/dev/null || echo unknown)"
    if [ "$status" = "healthy" ]; then
      echo "postgres is healthy."
      break
    fi
    sleep 1
  done
else
  echo "Warning: could not start postgres via docker compose (is Docker running?)."
  echo "Continuing — make sure a Postgres with pgvector is reachable at the DB_* settings in each service's .env."
fi

# 3. Start each node service (installing deps on first run)
for entry in "${SERVICES[@]}"; do
  dir="${entry%%:*}"
  name="${entry##*:}"
  svc_path="$ROOT_DIR/$dir"

  if [ ! -d "$svc_path/node_modules" ]; then
    echo "Installing dependencies for $name..."
    (cd "$svc_path" && npm install) || echo "Warning: npm install failed for $name; it may fail to start."
  fi

  echo "Starting $name -> logs/$name.log"
  (cd "$svc_path" && npm run dev) > "$LOG_DIR/$name.log" 2>&1 &
  PIDS+=("$!")
done

echo ""
echo "gateway:         http://localhost:3000"
echo "extract agent:   http://localhost:3001"
echo "matching engine: http://localhost:3002"
echo ""
echo "Tailing logs (Ctrl+C to stop all services)..."
tail -n +1 -f "$LOG_DIR"/*.log &
PIDS+=("$!")

wait
