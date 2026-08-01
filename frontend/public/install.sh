#!/usr/bin/env bash
# Volt installer — clones the repo, sets up .env, and starts the stack.
# https://volt-xi-rust.vercel.app/install.sh
set -euo pipefail

REPO_URL="https://github.com/Nishal77/volt"
INSTALL_DIR="${VOLT_INSTALL_DIR:-$HOME/.volt}"

log() { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
die() { printf '\033[1;31merror:\033[0m %s\n' "$1" >&2; exit 1; }

command -v git >/dev/null 2>&1 || die "git is required. Install it, then re-run this script."

if ! command -v docker >/dev/null 2>&1; then
  die "Docker is required but not found. Install Docker Desktop (https://docker.com/get-started) or Docker Engine, then re-run this script."
fi
if ! docker info >/dev/null 2>&1; then
  die "Docker is installed but not running. Start Docker, then re-run this script."
fi

if [ -d "$INSTALL_DIR/.git" ]; then
  log "Existing install found at $INSTALL_DIR, pulling latest"
  git -C "$INSTALL_DIR" pull --ff-only
else
  log "Cloning Volt into $INSTALL_DIR"
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR/deploy"

if [ ! -f .env ]; then
  log "Creating .env from the template"
  cp .env.example .env
  log "Leaving GOOGLE_CLIENT_ID/SECRET blank — the app will ask for them on first run."
fi

log "Starting Volt (this pulls/builds images the first time, can take a few minutes)"
docker compose up --build -d

log "Waiting for the backend to come up"
for _ in $(seq 1 30); do
  if curl -fsS http://localhost:8080/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

log "Volt is running at http://localhost:3000"
if command -v open >/dev/null 2>&1; then open http://localhost:3000; fi
