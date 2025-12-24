# 🔗 ShareBin

A simple, secure, and blazing fast Pastebin built with **Cloudflare Workers**, **D1 Database**, and **Hono**.

## ✨ Features

- **Blazing Fast**: Runs on Cloudflare's edge network.
- **Dynamic ID**: Automatically scales ID length from 2 to 10 characters based on collision.
- **Secure**: 
  - Strict Content Security Policy (CSP).
  - Cloudflare Turnstile (Captcha) integration.
  - Signed Cookie grace period (verify once, share freely for 1 hour).
- **Self-hosted Assets**: No external CDN dependencies (FontAwesome, CodeMirror, PrismJS are all local).
- **Modern UI**: Dark mode support and polished interface.

## 🚀 Deployment

### 1. Prerequisites
- A Cloudflare account.
- Node.js & npm installed.

### 2. Setup Database
Create a D1 database:
```bash
bunx wrangler d1 create SHARE_DB
```
Update `wrangler.jsonc` with the `database_id` returned from the command.

Initialize the schema:
```bash
bunx wrangler d1 execute SHARE_DB --remote --file=./schema.sql
```

### 3. Setup Secrets
Set your Turnstile keys and Cookie secret:
```bash
# Get these from Cloudflare Dashboard -> Turnstile
bunx wrangler secret put TURNSTILE_SECRET_KEY
# Any random long string
bunx wrangler secret put COOKIE_SECRET
```

### 4. Deploy
```bash
bun run deploy
```

## 🛠️ Local Development
```bash
# Install dependencies
bun install
# Run dev server
bun run dev
```

## 📜 License
MIT