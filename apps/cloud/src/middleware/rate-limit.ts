/**
 * Rate limit middleware for ShareBin
 * Hono middleware wrapper for rate limiting
 */

import type { Bindings } from '../config'
import { checkRateLimit } from '../services/rate-limit.service'
import { Errors } from '../utils/error'

type Context = {
  env: Bindings
  req: { header: (key: string) => string | undefined }
  json: (data: unknown, status?: number) => Response
}

/**
 * Rate limit middleware for Hono
 * Applies rate limiting to specific routes
 * Only limits POST requests to /api/create in practice
 */
export function rateLimitMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    const clientIP = c.req.header('CF-Connecting-IP') || 'unknown'
    const isAllowed = await checkRateLimit(c.env.LIMITER, clientIP)

    if (!isAllowed) {
      throw Errors.rateLimited()
    }

    await next()
  }
}
