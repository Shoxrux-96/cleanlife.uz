# ============================================================
# Frontend (React + Vite) — build and serve with nginx
# ============================================================
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit --no-fund --legacy-peer-deps \
 || npm install --no-audit --no-fund --legacy-peer-deps

COPY . .

ARG VITE_API_BASE=/api
ENV VITE_API_BASE=${VITE_API_BASE}

RUN npm run build


FROM nginx:1.27-alpine

RUN rm /etc/nginx/conf.d/default.conf \
 && mkdir -p /var/cache/nginx/osm \
 && chown -R nginx:nginx /var/cache/nginx/osm
COPY deploy/nginx/app.conf /etc/nginx/conf.d/app.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
