# ShareBin selfhost — multi-stage build (monorepo context = repo root)
# Build from monorepo root:
#   docker build -f apps/selfhost/Dockerfile -t sharebin-selfhost .
# Or via apps/selfhost/docker-compose.yml (context is repo root).

# ---------- build stage ----------
FROM oven/bun:1 AS build
WORKDIR /app

# Workspace manifests first (better layer cache).
# All workspace package.json must be present or frozen lockfile drifts.
COPY package.json bun.lock ./
COPY packages/frontend/package.json packages/frontend/
COPY packages/shared/package.json packages/shared/
COPY apps/selfhost/package.json apps/selfhost/
COPY apps/cloud/package.json apps/cloud/

RUN bun install --frozen-lockfile

# Sources needed for vite build + typecheck deps resolution
COPY packages packages
COPY apps/selfhost apps/selfhost

WORKDIR /app/apps/selfhost
RUN bun run vite build

# ---------- runtime stage ----------
FROM oven/bun:1 AS runtime
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/frontend/package.json packages/frontend/
COPY packages/shared/package.json packages/shared/
COPY apps/selfhost/package.json apps/selfhost/
COPY apps/cloud/package.json apps/cloud/

RUN bun install --frozen-lockfile --production

COPY packages/shared packages/shared
COPY apps/selfhost/src apps/selfhost/src
COPY apps/selfhost/tsconfig.json apps/selfhost/
COPY --from=build /app/apps/selfhost/dist apps/selfhost/dist

WORKDIR /app/apps/selfhost
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "src/index.ts"]
