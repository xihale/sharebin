/**
 * ShareBin - Entry point
 * Assembles Hono app with routes and middleware
 */

import { Hono } from 'hono'
import { securityMiddleware, corsMiddleware } from './middleware/security'
import { rateLimitMiddleware } from './middleware/rate-limit'
import { createPasteRoute } from './routes/create'
import { getPasteRoute } from './routes/paste'
import { getConfigRoute } from './routes/config'
import { globalErrorHandler } from './utils/error'
import { getHtmlEntrypointForPath, HTML_ENTRYPOINTS, isPasteId } from '@sharebin/shared/routes'
import type { Bindings } from './config'

const app = new Hono<{ Bindings: Bindings }>()

// Global error handler
app.onError(globalErrorHandler)

// CORS headers for all routes
app.use('*', corsMiddleware)

// Security headers for all routes
app.use('*', securityMiddleware)

// API routes
app.post('/api/create', rateLimitMiddleware(), createPasteRoute)
app.get('/api/paste/:id', getPasteRoute)
app.get('/api/config', getConfigRoute)

// Serve index.html for root URL
app.get('/', async (c) => {
  const response = await c.env.ASSETS.fetch(new Request(new URL(HTML_ENTRYPOINTS.index, c.req.url)))
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  })
})

// Serve viewer.html for paste URLs (/:id where id is alphanumeric, 2-10 chars)
app.get('/:id', async (c) => {
  const id = c.req.param('id')
  if (!isPasteId(id)) {
    const response = await c.env.ASSETS.fetch(c.req.raw)
    if (response.status !== 404) return response

    const notFound = await c.env.ASSETS.fetch(new Request(new URL(HTML_ENTRYPOINTS.notFound, c.req.url)))
    return new Response(notFound.body, {
      status: 404,
      headers: notFound.headers,
    })
  }

  const html = getHtmlEntrypointForPath(`/${id}`) ?? HTML_ENTRYPOINTS.viewer
  const response = await c.env.ASSETS.fetch(new Request(new URL(html, c.req.url)))
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  })
})

// Serve static assets for unmatched routes, then fall back to 404.html
app.notFound(async (c) => {
  const asset = await c.env.ASSETS.fetch(c.req.raw)
  if (asset.status !== 404) return asset

  const response = await c.env.ASSETS.fetch(new Request(new URL(HTML_ENTRYPOINTS.notFound, c.req.url)))
  return new Response(response.body, {
    status: 404,
    headers: response.headers,
  })
})

// Export worker with fetch and scheduled handlers
export default {
  fetch: app.fetch,
  async scheduled(_event: unknown, env: Bindings, ctx: ExecutionContext) {
    console.log('Running background cleanup...')
    const { cleanupExpiredPastes } = await import('./services/paste.service')
    ctx.waitUntil(
      cleanupExpiredPastes(env.DB)
        .then((count) => console.log(`Cleanup complete. Deleted ${count} pastes`))
        .catch((err: Error) => console.error('Cleanup failed:', err))
    )
  },
}
