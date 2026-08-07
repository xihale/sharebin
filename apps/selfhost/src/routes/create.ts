/**
 * Create paste route for ShareBin
 * Handles POST /api/create (captcha removed for self-host)
 */

import type { Context } from 'hono'
import { createPaste } from '../services/paste.service'
import { Errors } from '../utils/error'

/** POST /api/create — creates a new paste */
export async function createPasteRoute(c: Context) {
  let body: { content: string; type: 'code' | 'url'; language?: string }
  try {
    body = await c.req.json()
  } catch {
    throw Errors.invalidJson()
  }

  const { content, language } = body
  const validTypes = ['code', 'url']
  const finalType: 'code' | 'url' = validTypes.includes(body.type) ? body.type : 'code'

  const id = await createPaste(content, finalType, language)
  return c.json({ id })
}
