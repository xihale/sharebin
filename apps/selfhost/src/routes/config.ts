/**
 * Config route for ShareBin
 * Handles GET /api/config — returns frontend config (no captcha)
 */

import type { Context } from 'hono'
import { PASTE } from '../config'

/** GET /api/config */
export async function getConfigRoute(c: Context) {
  return c.json({
    turnstileSiteKey: '',
    maxContentSize: PASTE.MAX_CONTENT_SIZE,
    expirationDays: PASTE.EXPIRATION_TTL / (1000 * 60 * 60 * 24),
    cdnBase: 'https://npm.webcache.cn',
  })
}
