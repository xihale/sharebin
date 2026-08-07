/**
 * Config route for ShareBin
 * Handles GET /api/config
 * Returns frontend configuration including Turnstile site key and limits
 */

import type { Context } from 'hono'
import type { Bindings } from '../config'
import { getSiteKey } from '../services/captcha.service'
import { PASTE } from '../config'

/**
 * GET /api/config
 * Returns configuration for the frontend
 * Extended to include all frontend-required config
 */
export async function getConfigRoute(c: Context<{ Bindings: Bindings }>) {
  const siteKey = getSiteKey(c)

  return c.json({
    turnstileSiteKey: siteKey || '',
    maxContentSize: PASTE.MAX_CONTENT_SIZE,
    expirationDays: PASTE.EXPIRATION_TTL / (1000 * 60 * 60 * 24),
    cdnBase: 'https://npm.webcache.cn',
  })
}
