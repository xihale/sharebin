/**
 * Rate limit middleware for ShareBin
 * Trusts the single X-Forwarded-For header set by Caddy (the only proxy).
 * Caddy is configured to overwrite client-supplied XFF (see Caddyfile.example),
 * so the leftmost entry is the real client IP and cannot be spoofed.
 */

import { checkRateLimit } from '../services/rate-limit.service'
import { Errors } from '../utils/error'

type Context = {
  req: { header: (key: string) => string | undefined }
  json: (data: unknown, status?: number) => Response
}

/** Resolve client IP from the trusted X-Forwarded-For header (set by Caddy). */
function getClientIP(c: Context): string {
  const xff = c.req.header('X-Forwarded-For')
  if (xff) return xff.split(',')[0].trim()
  return 'unknown' // direct connection or unproxied — shared 'unknown' bucket
}

/** Rate limit middleware (Hono) */
export function rateLimitMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    const clientIP = getClientIP(c)
    const result = await checkRateLimit(clientIP)
    if (!result.allowed) throw Errors.rateLimited()
    await next()
  }
}
