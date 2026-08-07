# ShareBin Setup Guide

## Architecture

ShareBin uses a **front-end / back-end separated** architecture:

- **Frontend**: TypeScript SPA built with Vite (`frontend/`)
  - Two entry points: `frontend/index.html` (editor) + `frontend/viewer.html` (viewer)
  - Source code in `frontend/src/*.ts`
  - Built to `dist/` with automatic code splitting and hashing
  - Served from CDN, fully cacheable
  - Fetches paste data via JSON API (`GET /api/paste/:id`)
- **Backend**: Cloudflare Worker (Hono) providing REST API
  - `POST /api/create` — create paste
  - `GET /api/paste/:id` — get paste data (JSON)
  - `GET /api/config` — get site config
  - `GET /:id` — SPA fallback (serves `index.html`)

---

## Prerequisites

1. Cloudflare Account with Workers Free Tier
2. A domain (optional, for custom domain)

## Configuration

### 1. Create KV Namespace

```bash
wrangler kv:namespace create "LIMITER"
```

Copy the `id` from the output and update `wrangler.jsonc`:

```json
"kv_namespaces": [
  {
    "binding": "LIMITER",
    "id": "YOUR_KV_NAMESPACE_ID"
  }
]
```

### 1.5 Setup D1 Database

```bash
wrangler d1 create SHARE_DB
```

Update `wrangler.jsonc`:

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "SHARE_DB",
    "database_id": "YOUR_DATABASE_ID"
  }
]
```

Initialize the database schema:

```bash
wrangler d1 execute SHARE_DB --local --file=schema.sql
# For production deploy:
# wrangler d1 execute SHARE_DB --remote --file=schema.sql
```

### 2. Setup Cloudflare Turnstile

1. Go to [Cloudflare Turnstile Dashboard](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Click "Add new site"
3. Fill in:
   - **Site name**: ShareBin
   - **Domains**: your domain (e.g. `share.xihale.top`)
   - **Widget mode**: Managed
   - **Widget type**: Non-interactive (checkbox)
4. Click "Create"
5. Copy the **Site Key** and **Secret Key**

### 3. Configure Environment Variables

Update `wrangler.jsonc`:

```json
{
  "vars": {
    "TURNSTILE_SITE_KEY": "YOUR_SITE_KEY_HERE"
  }
}
```

Add secrets:

```bash
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put COOKIE_SECRET
# Enter your values when prompted
```

> **Note**: The Turnstile site key is injected into `index.html` via a `<meta>` tag at serve time. No API call needed.
>
> **Dev Mode**: When running `wrangler dev` locally, Turnstile secrets are not available, so test keys are used automatically (no configuration needed). Just run `wrangler dev` and everything works out of the box.

### 4. Deploy

```bash
bun run deploy
```

---

## Deployment Strategies

The frontend is built with Vite from TypeScript sources (`frontend/src/`), outputting static files to `dist/`.
The backend is a Cloudflare Worker API.
This separation gives you multiple deployment options:

### Strategy A: All-in-One (CF Workers Assets)

**Best for: simplicity, single domain**

The current default. Worker serves both static assets and API on the same domain.

```
your-domain.com/          → static index.html (from Worker Assets)
your-domain.com/abc123    → static index.html (SPA fallback)
your-domain.com/api/*     → Worker API
```

**Setup**: Use the `wrangler.jsonc.example` as-is.

```jsonc
{
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS"
  }
}
```

**Build & Deploy**:

```bash
bun run build        # Vite builds frontend to dist/
wrangler deploy --minify
```

Or simply:

```bash
bun run deploy
```

**Caching**: Static assets get automatic Cloudflare CDN caching. API responses can be cached via Cache API or Page Rules.

---

### Strategy B: CF Pages (Frontend) + CF Workers (Backend)

**Best for: independent deployments, CI/CD for frontend, zero-downtime**

Separate the frontend as a Cloudflare Pages project and the backend as a Worker.
Use different subdomains with CORS.

**Architecture**:

```
share.example.com    → CF Pages (static SPA)
api.example.com      → CF Worker (API)
```

**Frontend (CF Pages)**:

1. Build the frontend:

```bash
bun run build  # Output goes to dist/
```

2. Deploy to CF Pages:

```bash
wrangler pages deploy dist --project-name=sharebin-frontend
```

3. Update `frontend/src/config.ts` API base URL if needed.

**Backend (CF Worker)**:

1. Modify `wrangler.jsonc` — remove `assets` config, update routes:

```jsonc
{
  "name": "sharebin-api",
  "main": "src/index.ts",
  "routes": [
    { "pattern": "api.example.com", "custom_domain": true }
  ],
  // Remove "assets" section
  // Keep d1_databases, kv_namespaces, vars, triggers
}
```

2. Add CORS middleware in `src/index.ts`:

```typescript
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': 'https://share.example.com',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      }
    })
  }
  await next()
  c.header('Access-Control-Allow-Origin', 'https://share.example.com')
})
```

3. Remove the SPA fallback route (`GET /:id` → `index.html`) and `GET /` static serving from the Worker.

4. Deploy:

```bash
wrangler deploy --minify
```

---

### Strategy C: GitHub Pages (Frontend) + CF Workers (Backend)

**Best for: free hosting, open-source projects, GitHub-centric workflow**

Use GitHub Pages for the static SPA and CF Workers for the API.

**Architecture**:

```
username.github.io/sharebin  → GitHub Pages (static SPA)
api.example.com              → CF Worker (API)
```

**Frontend (GitHub Pages)**:

1. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
    paths: ['public/**']

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: public
      - uses: actions/deploy-pages@v4
```

2. In repo Settings → Pages → Source: select "GitHub Actions".

3. Update `frontend/src/config.ts` API base URL if needed.

4. Update frontend API base URL if needed.

**Backend (CF Worker)**:

Same as Strategy B — add CORS middleware, remove SPA fallback, deploy with route to `api.example.com`.

**CORS configuration**:

```typescript
c.header('Access-Control-Allow-Origin', 'https://username.github.io')
```

---

### Strategy D: Any Static Host + CF Workers (Backend)

**Best for: using your preferred hosting (Vercel, Netlify, etc.)**

The frontend is just static files — deploy anywhere that supports static hosting.

| Host | Deploy Command | Notes |
|------|---------------|-------|
| **Vercel** | `bun run build && vercel deploy dist` | Auto-detected as static |
| **Netlify** | `bun run build && netlify deploy --dir=dist --prod` | Add `_headers` file |
| **AWS S3 + CloudFront** | `bun run build && aws s3 sync dist/ s3://bucket/` | Set index document |
| **Caddy** | Copy `dist/` to webroot | Simplest self-hosted option |

For all of these, update `frontend/src/config.ts` with the correct API base and ensure CORS is configured on the Worker.

---

## Strategy Comparison

| | A: All-in-One | B: CF Pages + Worker | C: GH Pages + Worker | D: Custom Host + Worker |
|---|---|---|---|---|
| **Complexity** | Low | Medium | Medium | Medium |
| **Domains** | 1 | 2 | 2 | 2 |
| **CORS needed** | No | Yes | Yes | Yes |
| **CDN caching** | Auto | Auto | Auto | Varies |
| **Frontend CI/CD** | With Worker | Independent | GitHub Actions | Varies |
| **Cost** | Free tier | Free tier | Free | Varies |
| **Recommended** | Personal use | Production | Open source | Flexible |

---

## Testing

1. Visit your deployed site
2. Try to create a paste
3. Complete the Turnstile challenge
4. Verify the paste is created successfully
5. Open the paste URL — confirm it loads via SPA + API

## Troubleshooting

### Turnstile widget not showing

- Check that `TURNSTILE_SITE_KEY` is set in Worker env vars
- Verify `TURNSTILE_SITE_KEY` is set in `wrangler.jsonc` vars
- Check browser console for errors

### "Captcha verification failed" error

- Verify `TURNSTILE_SECRET_KEY` is set via `wrangler secret put`
- Check that the site key matches your Turnstile configuration

### CORS errors (Strategy B/C/D)

- Ensure the Worker returns proper `Access-Control-Allow-Origin` headers
- Check that `frontend/src/config.ts` uses the correct API base URL
- Verify CSP `connect-src` includes the API domain

### Deployment errors

- Ensure you have the latest Wrangler version: `npm install -g wrangler`
- Check that KV namespace ID and D1 database ID are correct
- Verify `COOKIE_SECRET` is set: `wrangler secret put COOKIE_SECRET`
