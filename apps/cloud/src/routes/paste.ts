/**
 * Get paste route for ShareBin
 * Handles GET /api/paste/:id
 */

import type { Context } from 'hono'
import type { Bindings } from '../config'
import { getPaste } from '../services/paste.service'

/**
 * GET /api/paste/:id
 * Retrieves a paste by ID
 */
export async function getPasteRoute(c: Context<{ Bindings: Bindings }>) {
  const id = c.req.param('id')
  if (!id) {
    return c.json({ error: 'Missing paste ID' }, 400)
  }

  const result = await getPaste(c.env.DB, id)
  return c.json(result)
}
