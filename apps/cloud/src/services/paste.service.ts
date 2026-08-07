/**
 * Paste service for ShareBin
 * Contains all business logic for paste CRUD operations
 */

import type { D1Database } from '@cloudflare/workers-types'
import { PASTE } from '../config'
import { generateId, validateId } from '@sharebin/shared/utils/id'
import { validateLanguage } from '@sharebin/shared/utils/language'
import type { PasteRow, PasteResponse } from '../types'
import { Errors } from '../utils/error'

/**
 * Create a new paste
 * Handles ID generation with collision retry logic
 *
 * @param db - D1Database instance
 * @param content - Paste content
 * @param type - Paste type ('code' or 'url')
 * @param language - Optional language for code pastes
 * @returns The generated paste ID
 * @throws AppError on failure
 */
export async function createPaste(
  db: D1Database,
  content: string,
  type: 'code' | 'url',
  language?: string
): Promise<string> {
  // Validate content size
  if (!content || content.length > PASTE.MAX_CONTENT_SIZE) {
    throw Errors.contentTooLarge(PASTE.MAX_CONTENT_SIZE)
  }

  const validatedLanguage = validateLanguage(language)
  const finalType = type === 'url' ? 'url' : 'code'

  const startLen = PASTE.ID_START_LEN
  const maxLen = PASTE.ID_MAX_LEN
  const retriesPerLen = PASTE.ID_RETRIES_PER_LEN

  let finalId = ''

  // Collision retry logic with incremental ID length
  for (let len = startLen; len <= maxLen; len++) {
    for (let i = 0; i < retriesPerLen; i++) {
      const candidate = generateId(len)
      try {
        await db.prepare(
          'INSERT INTO pastes (id, content, type, language, created_at) VALUES (?, ?, ?, ?, ?)'
        )
          .bind(candidate, content, finalType, validatedLanguage, Date.now())
          .run()
        finalId = candidate
        break
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.includes('UNIQUE constraint failed')) continue
        throw e
      }
    }
    if (finalId) break
  }

  if (!finalId) {
    throw Errors.allocationFailed()
  }

  return finalId
}

/**
 * Retrieve a paste by ID
 * Handles expiration check and lazy deletion
 *
 * @param db - D1Database instance
 * @param id - Paste ID
 * @returns Paste response or throws AppError
 */
export async function getPaste(db: D1Database, id: string): Promise<PasteResponse> {
  // Validate ID format
  if (!validateId(id)) {
    throw Errors.notFound()
  }

  const data = await db.prepare('SELECT * FROM pastes WHERE id = ?').bind(id).first<PasteRow>()

  if (!data) {
    throw Errors.notFound()
  }

  // Check expiration
  if (Date.now() - data.created_at > PASTE.EXPIRATION_TTL) {
    // Lazy deletion: delete in background
    db.prepare('DELETE FROM pastes WHERE id = ?')
      .bind(id)
      .run()
      .catch((err) => console.error('Expired paste deletion failed:', err))
    throw Errors.linkExpired()
  }

  // Handle URL type
  if (data.type === 'url') {
    const allowedProtocols = PASTE.ALLOWED_URL_PROTOCOLS
    try {
      const url = new URL(data.content)
      if (allowedProtocols.includes(url.protocol as typeof allowedProtocols[number])) {
        return { type: 'url', url: data.content }
      }
    } catch (_e) {
      // Invalid URL format
    }
    throw Errors.invalidUrl()
  }

  // Handle code type
  const expiration = formatExpiration(data.created_at, PASTE.EXPIRATION_TTL)
  return {
    type: 'code',
    content: data.content,
    language: data.language || 'plaintext',
    expiration,
  }
}

/**
 * Format expiration time as human-readable string
 *
 * @param createdAt - Creation timestamp
 * @param ttl - TTL in milliseconds
 * @returns Formatted string like "7 d 3 h"
 */
export function formatExpiration(createdAt: number, ttl: number = PASTE.EXPIRATION_TTL): string {
  const diff = createdAt + ttl - Date.now()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  return `${days} d ${hours} h`
}

/**
 * Delete expired pastes (for cron job)
 *
 * @param db - D1Database instance
 * @returns Number of deleted rows
 */
export async function cleanupExpiredPastes(db: D1Database): Promise<number> {
  const expirationTime = Date.now() - PASTE.EXPIRATION_TTL
  const result = await db.prepare('DELETE FROM pastes WHERE created_at < ?').bind(expirationTime).run()
  return result.meta?.changes ?? 0
}
