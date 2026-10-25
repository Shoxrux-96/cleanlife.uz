#!/usr/bin/env bash
# ============================================================
# Brendor ERP — one-shot deploy on the VPS.
# Run from the repo root AFTER:
#   - .env is filled on the server
#   - DNS points at the server
#   - host nginx + certbot are set up (see deploy/nginx/host.conf.example)
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> git pull"
git fetch origin
git reset --hard origin/main

echo "==> docker compose build"
docker compose build --pull

echo "==> docker compose up -d"
docker compose up -d

echo "==> cleaning dangling images"
docker image prune -f

echo "==> running migrations"
docker compose exec -T backend python manage.py migrate --noinput

echo "==> collectstatic"
docker compose exec -T backend python manage.py collectstatic --noinput

echo "==> done. tail logs with:  docker compose logs -f --tail=100"
