/**
 * Redis data access layer
 * - Atomic rate limiting (fixes TOCTOU race in original KV implementation)
 * - Paste read cache for hot-path performance
 */

import { Redis } from 'ioredis'
import { env } from '../env'
import { RATE_LIMIT, PASTE } from '../config'
import type { PasteRow, RateLimitResult } from '../types'

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
})

// Without an 'error' listener, ioredis connection failures become unhandled
// exceptions and crash the process. Log and let request-level retries handle it.
redis.on('error', (err) => {
  console.error('[redis] connection error:', err.message)
})

/**
 * Check rate limit using atomic INCR + conditional EXPIRE.
 * Fixes the read-then-write TOCTOU race of the original KV-based limiter.
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const minKey = `${RATE_LIMIT.KEY_PREFIX}:min:${ip}`
  const hrKey = `${RATE_LIMIT.KEY_PREFIX}:hr:${ip}`

  const [minCount, hrCount] = await Promise.all([redis.incr(minKey), redis.incr(hrKey)])

  // Set TTL only on first increment (count === 1 after INCR)
  if (minCount === 1) await redis.expire(minKey, RATE_LIMIT.MINUTE_TTL)
  if (hrCount === 1) await redis.expire(hrKey, RATE_LIMIT.HOUR_TTL)

  if (minCount > RATE_LIMIT.MAX_PER_MINUTE || hrCount > RATE_LIMIT.MAX_PER_HOUR) {
    return { allowed: false, remaining: 0 }
  }

  return {
    allowed: true,
    remaining: Math.min(
      RATE_LIMIT.MAX_PER_MINUTE - minCount,
      RATE_LIMIT.MAX_PER_HOUR - hrCount,
    ),
  }
}

// ==================== Paste read cache ====================

/** Redis key for a cached paste */
function cacheKey(id: string): string {
  return `paste:${id}`
}

/** Try to read a paste from cache. Returns null on miss. */
export async function getCachedPaste(id: string): Promise<PasteRow | null> {
  const raw = await redis.get(cacheKey(id))
  if (!raw) return null
  try {
    return JSON.parse(raw) as PasteRow
  } catch {
    return null
  }
}

/**
 * Cache a paste with TTL = remaining lifetime.
 * Content is read-only (created then immutable), so no stale/dirty-read risk.
 */
export async function cachePaste(row: PasteRow): Promise<void> {
  const remainingMs = row.created_at + PASTE.EXPIRATION_TTL - Date.now()
  if (remainingMs <= 0) return
  const remainingSec = Math.ceil(remainingMs / 1000)
  await redis.set(cacheKey(row.id), JSON.stringify(row), 'EX', remainingSec)
}

/** Invalidate a cached paste (used when deleting) */
export async function invalidatePasteCache(id: string): Promise<void> {
  await redis.del(cacheKey(id))
}
