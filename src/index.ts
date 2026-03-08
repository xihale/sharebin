import { Hono } from 'hono'
import { getSignedCookie, setSignedCookie } from 'hono/cookie'
import { renderPage, renderError } from './renderer'
import { ALLOWED_LANGUAGES } from './languages'

type Bindings = {
  DB: D1Database
  LIMITER: KVNamespace
  TURNSTILE_SECRET_KEY?: string
  TURNSTILE_SITE_KEY?: string
  COOKIE_SECRET?: string
}

type Variables = {
  nonce: string
}

const VERIFIED_COOKIE_NAME = 'sb_verified'

const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
const TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';

function getTurnstileConfig(c: any) {
  const url = new URL(c.req.url);
  const isProd = url.hostname === 'share.xihale.top';
  const useTestKey = !isProd;
  
  const config = {
    siteKey: useTestKey ? TURNSTILE_TEST_SITE_KEY : c.env.TURNSTILE_SITE_KEY,
    secretKey: useTestKey ? TURNSTILE_TEST_SECRET_KEY : c.env.TURNSTILE_SECRET_KEY
  };

  if (useTestKey) {
    console.log(`[Dev] Using Turnstile Test Keys for hostname: ${url.hostname}`);
  }
  
  return config;
}

async function checkRateLimit(c: any, ip: string): Promise<boolean> {
    if (!c.env.LIMITER) {
      console.warn('Rate Limiter binding (LIMITER) not found. Skipping rate check.')
      return true
    }
    const minKey = `rl:min:${ip}`
    const hrKey = `rl:hr:${ip}`

    const [minCountStr, hrCountStr] = await Promise.all([
        c.env.LIMITER.get(minKey),
        c.env.LIMITER.get(hrKey)
    ])

    const minCount = minCountStr ? parseInt(minCountStr) : 0
    const hrCount = hrCountStr ? parseInt(hrCountStr) : 0

    // Check limits
    if (minCount >= 3) return false // Limit: 3 per minute
    if (hrCount >= 10) return false // Limit: 10 per hour

    // Increment both
    await Promise.all([
        c.env.LIMITER.put(minKey, (minCount + 1).toString(), { expirationTtl: 60 }),
        c.env.LIMITER.put(hrKey, (hrCount + 1).toString(), { expirationTtl: 3600 })
    ])
    
    return true
}

type CreateRequest = {
  content: string
  type: 'code' | 'url'
  language?: string
  'cf-turnstile-response'?: string
}

type ShareData = {
  id: string
  type: 'code' | 'url'
  content: string
  language?: string
  created_at: number
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

const CONFIG = {
    EXPIRATION_TTL: 7 * 24 * 60 * 60 * 1000,
    BASE62: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    MAX_CONTENT_SIZE: 100 * 1024
}

async function verifyTurnstile(token: string, secretKey: string | undefined): Promise<boolean> {
    if (!token || !secretKey) return false
    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`
        })
        const result = await response.json() as { success: boolean }
        return result.success
    } catch (e) {
        return false
    }
}

function generateId(length: number): string {
    const bytes = new Uint8Array(length)
    crypto.getRandomValues(bytes)
    return Array.from(bytes).map(b => CONFIG.BASE62[b % 62]).join('')
}

function validateLanguage(lang: string | undefined): string {
    if (!lang || typeof lang !== 'string') return 'plaintext'
    const normalized = lang.toLowerCase().trim()
    return ALLOWED_LANGUAGES.has(normalized) ? normalized : 'plaintext'
}

// Global Error Handler to catch 500s
app.onError((err, c) => {
  console.error('Global Error:', err)
  return c.json({ 
    error: 'Internal Server Error'
  }, 500)
})

app.use('*', async (c, next) => {
    // Safer hex nonce generation
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    c.set('nonce', nonce)

    await next()

    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('Referrer-Policy', 'no-referrer-when-downgrade')
    
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'wasm-eval' https://npm.webcache.cn https://over.alnk.cn https://static.cloudflareinsights.com https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline' https://npm.webcache.cn https://over.alnk.cn https://fonts.googleapis.com",
      "img-src 'self' data: https://challenges.cloudflare.com",
      "font-src 'self' https://npm.webcache.cn https://over.alnk.cn https://fonts.gstatic.com",
      "connect-src 'self' blob: data: https://npm.webcache.cn https://over.alnk.cn https://static.cloudflareinsights.com https://challenges.cloudflare.com",
      "frame-src 'self' https://challenges.cloudflare.com",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
    c.header('Content-Security-Policy', csp)
})

app.get('/', (c) => {
  const nonce = c.get('nonce')
  const { siteKey } = getTurnstileConfig(c);
  return c.html(renderPage(null, false, 'plaintext', nonce, siteKey))
})

app.post('/api/create', async (c) => {
    let body: CreateRequest
    try { body = await c.req.json() } catch (e) { return c.json({ error: 'Invalid JSON' }, 400) }

    // --- Rate Limiting ---
    const clientIP = c.req.header('CF-Connecting-IP') || 'unknown'
    const isAllowed = await checkRateLimit(c, clientIP)
    if (!isAllowed) {
        return c.json({ error: 'Too many requests. Please try again in a minute.' }, 429)
    }

    const { content, type, language, 'cf-turnstile-response': turnstileToken } = body
    
    // Strict type validation
    const validTypes = ['code', 'url']
    const finalType = validTypes.includes(type) ? type : 'code'

    const cookieSecret = c.env.COOKIE_SECRET
    if (!cookieSecret) {
        throw new Error('Security Error: COOKIE_SECRET environment variable is missing.')
    }
    const verifiedCookie = await getSignedCookie(c, cookieSecret, VERIFIED_COOKIE_NAME)
    
    const { secretKey } = getTurnstileConfig(c);
    let isVerified = verifiedCookie === 'true'
    if (!isVerified && turnstileToken) {
        isVerified = await verifyTurnstile(turnstileToken, secretKey)
        if (isVerified) {
            await setSignedCookie(c, VERIFIED_COOKIE_NAME, 'true', cookieSecret, {
                path: '/', secure: true, httpOnly: true, sameSite: 'Strict', maxAge: 3600,
            })
        }
    }

    if (!isVerified) return c.json({ error: 'Captcha required', code: 'CAPTCHA_REQUIRED' }, 403)

    if (!content || content.length > CONFIG.MAX_CONTENT_SIZE) return c.json({ error: 'Content size exceeds 100KB' }, 400)
    const validatedLanguage = validateLanguage(language)

    const START_LEN = 2, MAX_LEN = 10, RETRIES_PER_LEN = 5
    let finalId = ''

    for (let len = START_LEN; len <= MAX_LEN; len++) {
        for (let i = 0; i < RETRIES_PER_LEN; i++) {
            const candidate = generateId(len)
            try {
                await c.env.DB.prepare(
                    'INSERT INTO pastes (id, content, type, language, created_at) VALUES (?, ?, ?, ?, ?)'
                ).bind(candidate, content, type || 'code', validatedLanguage, Date.now()).run()
                finalId = candidate
                break
            } catch (e: any) {
                if (e.message && e.message.includes('UNIQUE constraint failed')) continue 
                throw e
            }
        }
        if (finalId) break
    }

    if (!finalId) return c.json({ error: 'Allocation failed' }, 503)
    return c.json({ id: finalId })
})

app.get('/:id', async (c) => {
  const nonce = c.get('nonce')
  const id = c.req.param('id')
  if (id.length > 10) return c.html(renderError('Not Found', nonce), 404)

  const data = await c.env.DB.prepare('SELECT * FROM pastes WHERE id = ?').bind(id).first<ShareData>()
  if (!data) return c.html(renderError('Not Found', nonce), 404)

  if (Date.now() - data.created_at > CONFIG.EXPIRATION_TTL) {
      c.executionCtx.waitUntil(c.env.DB.prepare('DELETE FROM pastes WHERE id = ?').bind(id).run())
      return c.html(renderError('Link Expired', nonce), 404)
  }

  if (data.type === 'url') {
      // Security: Only redirect to http/https to prevent javascript: or ws: XSS/SSRF risks
      const ALLOWED_PROTOCOLS = ['http:', 'https:'];
      try {
          const url = new URL(data.content);
          if (ALLOWED_PROTOCOLS.includes(url.protocol)) {
              return c.redirect(data.content);
          }
      } catch (e) {
          // If URL is invalid, fall through to error
      }
      return c.html(renderError('Invalid or insecure URL', nonce), 400);
  }
  
  const diff = data.created_at + CONFIG.EXPIRATION_TTL - Date.now();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const expirationText = `${days} d ${hours} h`;

  const { siteKey } = getTurnstileConfig(c);
  return c.html(renderPage(data.content, true, data.language, nonce, siteKey, expirationText))
})


// --- Cron Trigger for Cleanup ---
// This handles the background cleanup process
const worker = {
    fetch: app.fetch,
    async scheduled(event: any, env: Bindings, ctx: ExecutionContext) {
        console.log('Running background cleanup...');
        const expirationTime = Date.now() - CONFIG.EXPIRATION_TTL;
        ctx.waitUntil(
            env.DB.prepare('DELETE FROM pastes WHERE created_at < ?')
                .bind(expirationTime)
                .run()
                .then(res => console.log(`Cleanup complete. Meta: ${JSON.stringify(res.meta)}`))
                .catch(err => console.error('Cleanup failed:', err))
        );
    }
};

export default worker;