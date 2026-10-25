# Brendor ERP — Deployment guide

Production stack: **Postgres 16 + Redis 7 + Django/Gunicorn + nginx (SPA + reverse proxy)**, orchestrated with Docker Compose. TLS terminates at the host nginx + certbot layer.

---

## 1. Server prerequisites (Ubuntu 22.04 / Debian 12)

```bash
# as root
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx git curl ufw

# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER   # if deploying as non-root, re-login after

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## 2. DNS

Point `cleanlife.uz` and `www.cleanlife.uz` A-records at the server IP. Wait a minute for propagation.

## 3. Clone + configure

```bash
cd /opt
git clone git@github.com:Shoxrux-96/cleanlife.uz.git brendor
cd brendor
cp .env.example .env
# Generate a strong SECRET_KEY:
python3 -c 'import secrets; print(secrets.token_urlsafe(64))'
# Edit .env — set SECRET_KEY, ALLOWED_HOSTS, CORS_ORIGINS, CSRF_TRUSTED,
# POSTGRES_PASSWORD, VITE_API_BASE=/api
nano .env
```

## 4. Host nginx + Let's Encrypt

```bash
cp deploy/nginx/host.conf.example /etc/nginx/sites-available/cleanlife.uz
# Edit the file: replace cleanlife.uz with your real domain
ln -sf /etc/nginx/sites-available/cleanlife.uz /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Issue the certificate (certbot auto-edits the config to add SSL)
certbot --nginx -d cleanlife.uz -d www.cleanlife.uz --redirect --agree-tos -m you@example.com
```

Certbot schedules auto-renew via systemd timer; no cron needed.

## 5. First deploy

```bash
cd /opt/brendor
docker compose build --pull
docker compose up -d

# Create a Django superuser for /admin/
docker compose exec backend python manage.py createsuperuser
```

Visit `https://cleanlife.uz` — SPA loads, `/api/health/` returns `{"status":"ok"}`, `/admin/` logs in with the superuser.

## 6. Subsequent deploys

Push to `main`, then on the server:

```bash
cd /opt/brendor
bash deploy/deploy.sh
```

The script does `git pull → build → up -d → migrate → collectstatic → prune`.

## 7. Backups

```bash
# Database dump (run from a cron entry — e.g. daily at 03:00)
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > /opt/brendor-backups/db-$(date +%F).sql.gz

# Media (uploaded avatars, logos, 3x4 photos)
tar czf /opt/brendor-backups/media-$(date +%F).tgz \
  -C /var/lib/docker/volumes/brendor_media_data/_data .
```

Store backups off-box (S3, rsync to a second VPS, etc.).

## 8. Operations cheat-sheet

```bash
docker compose ps                       # service status
docker compose logs -f --tail=100       # tail all logs
docker compose logs -f backend          # just Django
docker compose restart backend          # restart one service
docker compose exec backend python manage.py shell
docker compose exec db psql -U brendor brendor_erp
```

---

## Security posture

**Already applied (verified in commit):**

| Area | What's in place |
| --- | --- |
| SQL injection | 100 % Django ORM, no `.raw()` / `cursor.execute`. Parameters escape automatically. |
| Password storage | Argon2 primary hasher, 8-char min, PBKDF2 fallback, no plaintext at rest. |
| Login brute-force | DRF `ScopedRateThrottle` = 10/min on `/api/auth/login/`; anon global throttle 200/min. |
| HTTPS | `SECURE_SSL_REDIRECT`, HSTS 30 d (preload-ready), `SECURE_PROXY_SSL_HEADER` for the nginx layer. |
| Cookies | `Secure`, `HttpOnly` session cookie, `SameSite=Lax` for both session and CSRF. |
| CSRF | `CSRF_TRUSTED_ORIGINS` driven by env; same-origin SPA so cookies are automatic. |
| CORS | Allow-list via `DJANGO_CORS_ORIGINS`; wildcard disabled in prod. |
| Clickjacking | `X-Frame-Options: DENY`. |
| MIME-sniffing | `X-Content-Type-Options: nosniff`. |
| Referrer leak | `Referrer-Policy: same-origin`. |
| CSP | Default policy in `deploy/nginx/app.conf` — tighten after review. |
| Secrets | `DJANGO_SECRET_KEY`, DB password read from env. `.env` gitignored. |
| DB exposure | Postgres only reachable on the Docker internal network — never bound to a public port. |
| Static assets | Served with `CompressedManifestStaticFilesStorage` (fingerprinted, long cache). |
| Upload size | Capped at 20 MB (base64 photos) and 25 MB at the nginx layer. |
| Logging | Structured stdout logs, scraped by Docker; `django.security` surfaced at WARNING. |

**Operational to-dos (not code):**

1. Rotate `DJANGO_SECRET_KEY` and DB password quarterly.
2. Keep Docker images current: `docker compose pull && docker compose up -d` monthly.
3. Enable `fail2ban` for SSH, keep SSH on key auth only (`PasswordAuthentication no`).
4. Review the CSP in `deploy/nginx/app.conf` once all third-party origins are confirmed, then raise HSTS to 1 year.
5. Point backups off-box and test the restore procedure before you need it.
