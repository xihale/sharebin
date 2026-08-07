/**
 * Paste service for ShareBin
 * Business logic for paste CRUD — storage-agnostic (uses pg + redis layers)
 */

import { PASTE } from '../config'
import { generateId, validateId } from '@sharebin/shared/utils/id'
import { validateLanguage } from '@sharebin/shared/utils/language'
import * as pg from '../db/pg'
import { getCachedPaste, cachePaste, invalidatePasteCache } from '../db/redis'
import type { PasteResponse } from '../types'
import { Errors } from '../utils/error'

/**
 * Create a new paste
 * Handles ID generation with collision retry logic (PG error code 23505)
 */
export async function createPaste(
  content: string,
  type: 'code' | 'url',
  language?: string,
): Promise<string> {
  if (!content || content.length > PASTE.MAX_CONTENT_SIZE) {
    throw Errors.contentTooLarge(PASTE.MAX_CONTENT_SIZE)
  }

  const validatedLanguage = validateLanguage(language)
  const finalType: 'code' | 'url' = type === 'url' ? 'url' : 'code'

  let finalId = ''

  for (let len = PASTE.ID_START_LEN; len <= PASTE.ID_MAX_LEN; len++) {
    for (let i = 0; i < PASTE.ID_RETRIES_PER_LEN; i++) {
      const candidate = generateId(len)
      try {
        await pg.insertPaste({
          id: candidate,
          content,
          type: finalType,
          language: validatedLanguage,
          created_at: Date.now(),
        })
        finalId = candidate
        break
      } catch (e) {
        const code = (e as { code?: string }).code
        if (code === '23505') continue // unique constraint — collision, retry
        throw e
      }
    }
    if (finalId) break
  }

  if (!finalId) throw Errors.allocationFailed()

  return finalId
}

/**
 * Retrieve a paste by ID
 * Redis read cache → PG fallback → cache backfill
 * Lazy deletion on expiry
 */
export async function getPaste(id: string): Promise<PasteResponse> {
  if (!validateId(id)) throw Errors.notFound()

  // 1. Try cache
  let data = await getCachedPaste(id)

  // 2. Cache miss → query PG
  if (!data) {
    data = await pg.getPasteById(id)
    if (data) await cachePaste(data) // backfill cache
  }

  if (!data) throw Errors.notFound()

  // Check expiration
  if (Date.now() - data.created_at > PASTE.EXPIRATION_TTL) {
    // Lazy deletion: fire-and-forget (DB + cache invalidation)
    pg.deletePaste(id).catch((err) => console.error('Lazy delete failed:', err))
    invalidatePasteCache(id).catch((err) => console.error('Cache invalidate failed:', err))
    throw Errors.linkExpired()
  }

  // URL type
  if (data.type === 'url') {
    const allowedProtocols = PASTE.ALLOWED_URL_PROTOCOLS
    try {
      const url = new URL(data.content)
      if (allowedProtocols.includes(url.protocol as (typeof allowedProtocols)[number])) {
        return { type: 'url', url: data.content }
      }
    } catch {
      // invalid URL format
    }
    throw Errors.invalidUrl()
  }

  // Code type
  return {
    type: 'code',
    content: data.content,
    language: data.language || 'plaintext',
    expiration: formatExpiration(data.created_at, PASTE.EXPIRATION_TTL),
  }
}

/** Format remaining lifetime as "7 d 3 h" */
export function formatExpiration(createdAt: number, ttl: number = PASTE.EXPIRATION_TTL): string {
  const diff = createdAt + ttl - Date.now()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  return `${days} d ${hours} h`
}

/** Delete expired pastes (for cron job). Returns number deleted. */
export async function cleanupExpiredPastes(): Promise<number> {
  return pg.deleteExpired(Date.now() - PASTE.EXPIRATION_TTL)
}
