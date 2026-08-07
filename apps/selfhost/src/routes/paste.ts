/**
 * Get paste route for ShareBin
 * Handles GET /api/paste/:id
 */

import type { Context } from 'hono'
import { getPaste } from '../services/paste.service'

/** GET /api/paste/:id — retrieves a paste by ID */
export async function getPasteRoute(c: Context) {
  const id = c.req.param('id')
  if (!id) return c.json({ error: 'Missing paste ID' }, 400)

  const result = await getPaste(id)
  return c.json(result)
}
