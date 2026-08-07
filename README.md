# ShareBin

A simple, secure pastebin — one monorepo, two deploy targets, one shared frontend.

| Package | Role |
| :--- | :--- |
| `@sharebin/cloud` | Cloudflare Workers + D1 + Turnstile |
| `@sharebin/selfhost` | Bun + PostgreSQL + Redis (Docker) |
| `@sharebin/frontend` | Shared Vite frontend (editor / viewer) |
| `@sharebin/shared` | Shared backend helpers (routes, languages, IDs) |

```
sharebin/
  apps/
    cloud/          # CF Workers app
    selfhost/       # Self-hosted Bun app
  packages/
    frontend/       # Shared UI (HTML + TS + CSS)
    shared/         # Shared pure TS helpers
```

## Prerequisites

- [Bun](https://bun.sh)
- For cloud deploy: Cloudflare account + Wrangler
- For selfhost deploy: Docker Compose

## Develop

```bash
# install once at monorepo root
bun install

# Cloudflare stack (API :8787, Vite :3000)
bun run dev:cloud

# Self-hosted stack (API :3000, Vite :3001)
bun run dev:selfhost
```

## Build / deploy

```bash
# Cloud
bun run build:cloud
bun run deploy:cloud          # wrangler deploy (from apps/cloud)

# Selfhost (local prod binary / dist)
bun run build:selfhost
bun run --filter @sharebin/selfhost start

# Selfhost Docker (from monorepo root)
cp apps/selfhost/.env.example apps/selfhost/.env
# set PG_PASSWORD in apps/selfhost/.env
docker compose -f apps/selfhost/docker-compose.yml --env-file apps/selfhost/.env up -d --build
docker exec -i sharebin-pg psql -U sharebin -d sharebin < apps/selfhost/schema.pg.sql
```

See `apps/cloud/SETUP.md` and `apps/selfhost/Caddyfile.example` for environment-specific setup.

## Scripts (root)

| Command | Description |
| :--- | :--- |
| `bun run dev:cloud` | Cloud API + Vite |
| `bun run dev:selfhost` | Selfhost API + Vite |
| `bun run build:cloud` | Typecheck + Vite build → `apps/cloud/dist` |
| `bun run build:selfhost` | Typecheck + Vite build → `apps/selfhost/dist` |
| `bun run typecheck` | Typecheck all workspaces |
| `bun run lint` | ESLint |

## Naming

- **Product**: ShareBin  
- **Monorepo**: `sharebin`  
- **Cloud app**: `@sharebin/cloud` (Workers edge deploy)  
- **Selfhost app**: `@sharebin/selfhost`  
- Frontend is always `@sharebin/frontend` — Turnstile is optional (enabled only when the backend returns `turnstileSiteKey`).
