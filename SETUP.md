# ShareBin Setup Guide

## Prerequisites

1. Cloudflare Account with Workers Free Tier
2. A domain (optional, for custom domain)

## Configuration

### 1. Create KV Namespace

```bash
wrangler kv:namespace create "SHARE_BIN"
```

Copy the `id` from the output and update `wrangler.jsonc`:

```json
"kv_namespaces": [
  {
    "binding": "SHARE_BIN",
    "id": "YOUR_KV_NAMESPACE_ID"
  }
]
```

### 2. Setup Cloudflare Turnstile

1. Go to [Cloudflare Turnstile Dashboard](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Click "Add new site"
3. Fill in:
   - **Site name**: ShareBin
   - **Domains**: `share.xihale.top` (or your domain)
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

Add secret key:

```bash
wrangler secret put TURNSTILE_SECRET_KEY
# Enter your secret key when prompted
```

### 4. Update Frontend Site Key

Edit `public/script.js` and update the site key:

```javascript
turnstileWidgetId = window.turnstile.render('#turnstile-container', {
    sitekey: 'YOUR_SITE_KEY_HERE',  // Update this
    theme: 'auto',
    ...
});
```

### 5. Deploy

```bash
npm run deploy
```

## Testing

1. Visit your deployed site
2. Try to create a paste
3. Complete the Turnstile challenge
4. Verify the paste is created successfully

## Features

- **Turnstile Protection**: Prevents automated abuse
- **Rate Limiting**: Additional IP-based rate limiting
- **XSS Protection**: Language whitelist (298 Prism languages)
- **Content Limits**: 100KB max per paste
- **Auto-Expiration**: Pastes expire after 3 days

## Troubleshooting

### Turnstile widget not showing

- Check that `TURNSTILE_SITE_KEY` is correct
- Verify the domain matches your Turnstile site configuration
- Check browser console for errors

### "Captcha verification failed" error

- Verify `TURNSTILE_SECRET_KEY` is set correctly
- Check that the site key matches your Turnstile configuration

### Deployment errors

- Ensure you have the latest Wrangler version: `npm install -g wrangler`
- Check that KV namespace ID is correct
