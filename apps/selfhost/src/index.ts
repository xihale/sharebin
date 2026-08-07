/**
 * ShareBin — Entry point (self-hosted, Bun runtime)
 * Single process serves both the API and the built static frontend (dist/).
 * Routing rules (mirror vite.config.ts spaFallback + Caddyfile.example):
 *   /api/*            → API
 *   /:id (2-10 alnum) → viewer.html
 *   /<asset>          → dist/<asset> (static)
 *   everything else   → index.html, missing → 404.html
 */

import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { securityMiddleware, corsMiddleware } from './middleware/security'
import { rateLimitMiddleware } from './middleware/rate-limit'
import { createPasteRoute } from './routes/create'
import { getPasteRoute } from './routes/paste'
import { getConfigRoute } from './routes/config'
import { globalErrorHandler } from './utils/error'
import { startCleanupCron } from './cron'
import { getHtmlEntrypointForPath, HTML_ENTRYPOINTS } from '@sharebin/shared/routes'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const app = new Hono()

app.onError(globalErrorHandler)
app.use('*', corsMiddleware)
app.use('*', securityMiddleware)

// API
app.post('/api/create', rateLimitMiddleware(), createPasteRoute)
app.get('/api/paste/:id', getPasteRoute)
app.get('/api/config', getConfigRoute)

// ---- Static frontend (dist/) ----
const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

// Pre-resolved HTML entrypoints (small, served often)
async function readHtml(name: string): Promise<string> {
  return await readFile(resolve(DIST, name), 'utf-8')
}

// SPA routing: /:id (2-10 alnum) → viewer.html, / → index.html
app.use('*', async (c, next) => {
  const url = new URL(c.req.url)
  const pathname = url.pathname

  // Let serveStatic handle real files (anything with an extension)
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) return next()

  const entry = getHtmlEntrypointForPath(pathname)
  if (entry) {
    try {
      const html = await readHtml(entry)
      return c.html(html, 200)
    } catch {
      return next() // dist not built yet — fall through
    }
  }
  return next()
})

// Static assets from dist/
app.use('*', serveStatic({ root: './dist' }))

// Fallback: unknown non-file path → 404.html
app.use('*', async (c) => {
  try {
    return c.html(await readHtml(HTML_ENTRYPOINTS.notFound), 404)
  } catch {
    return c.text('Not Found', 404)
  }
})

// Start hourly expired-paste cleanup
startCleanupCron()

const PORT = Number(process.env.PORT ?? 3000)

export default {
  port: PORT,
  fetch: app.fetch,
}
