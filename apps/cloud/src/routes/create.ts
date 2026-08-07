/**
 * Create paste route for ShareBin
 * Handles POST /api/create
 */

import type { Context } from 'hono'
import type { Bindings } from '../config'
import { handleCaptchaFlow } from '../services/captcha.service'
import { createPaste } from '../services/paste.service'
import { Errors } from '../utils/error'

/**
 * POST /api/create
 * Creates a new paste
 */
export async function createPasteRoute(c: Context<{ Bindings: Bindings }>) {
  let body: { content: string; type: 'code' | 'url'; language?: string; 'cf-turnstile-response'?: string }
  try {
    body = await c.req.json()
  } catch (_e) {
    throw Errors.invalidJson()
  }

  const { content, type, language, 'cf-turnstile-response': turnstileToken } = body

  // Validate type
  const validTypes = ['code', 'url']
  const finalType = validTypes.includes(type) ? type : 'code'

  // Handle captcha flow
  const cookieSecret = c.env.COOKIE_SECRET
  if (!cookieSecret && c.env.TURNSTILE_SECRET_KEY) {
    // Production without COOKIE_SECRET is a config error
    throw Errors.configMissing('COOKIE_SECRET')
  }

  const captchaResult = await handleCaptchaFlow(
    c,
    turnstileToken
  )

  if (!captchaResult.isVerified) {
    throw Errors.captchaRequired()
  }

  // Create the paste
  const id = await createPaste(c.env.DB, content, finalType, language)

  return c.json({ id })
}
