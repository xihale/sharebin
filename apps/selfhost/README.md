# @sharebin/selfhost

ShareBin self-hosted on **Bun + PostgreSQL + Redis**.

```bash
# from monorepo root
bun install
bun run dev:selfhost

# Docker (context = monorepo root)
cp apps/selfhost/.env.example apps/selfhost/.env
docker compose -f apps/selfhost/docker-compose.yml --env-file apps/selfhost/.env up -d --build
docker exec -i sharebin-pg psql -U sharebin -d sharebin < apps/selfhost/schema.pg.sql
```

No Turnstile: `/api/config` omits `turnstileSiteKey`, so the shared frontend skips captcha.
