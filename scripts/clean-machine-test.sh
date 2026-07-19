#!/usr/bin/env bash
# Phase 7 exit-gate check: wipe all state, boot from scratch, confirm the
# stack comes up healthy using only the public docker compose path.
# This proves the BUILDER's machine works — it is not a substitute for a
# real non-builder self-host test, which is this phase's actual exit gate.
set -euo pipefail
cd "$(dirname "$0")/../deploy"

echo "==> docker compose down -v (wipe existing state)"
docker compose down -v --remove-orphans

echo "==> docker compose up --build -d"
docker compose up --build -d

echo "==> waiting for backend /health"
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/health >/dev/null; then
    echo "backend healthy after ${i}s"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "FAIL: backend did not become healthy within 30s"
    docker compose logs
    exit 1
  fi
  sleep 1
done

echo "==> checking frontend responds"
if ! curl -sf http://localhost:3000 >/dev/null; then
  echo "FAIL: frontend not responding on :3000"
  docker compose logs frontend
  exit 1
fi

echo "PASS: clean-machine boot succeeded. Backend + frontend healthy."
echo "This only verifies the builder's machine. Phase 7's real exit gate"
echo "requires a non-builder running these same public steps unaided."
