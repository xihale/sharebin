# @sharebin/cloud

ShareBin on **Cloudflare Workers** (D1, KV rate limit, Turnstile).

```bash
# from monorepo root
bun install
bun run dev:cloud
bun run deploy:cloud
```

Config: copy `wrangler.jsonc.example` → `wrangler.jsonc`, set D1/KV IDs and secrets (`COOKIE_SECRET`, `TURNSTILE_SECRET_KEY`).

See `SETUP.md` for the full walkthrough.
