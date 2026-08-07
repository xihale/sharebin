/**
 * Rate limiting service for ShareBin
 * Handles rate limit checking with TOCTOU mitigation strategies
 *
 * Note: KV-based rate limiting has inherent TOCTOU race conditions.
 * For production with high concurrency, consider using Durable Objects
 * for atomic counter operations.
 */

import type { Bindings } from '../config'
import { RATE_LIMIT } from '../config'
import type { RateLimitResult } from '../types'

type RateLimitKV = Bindings['LIMITER']

/**
 * Check rate limit for a given IP
 * Uses atomic-style approach: read current values, check limits, then increment
 *
 * TOCTOU Mitigation: While KV doesn't support true atomic operations,
 * we use short TTLs and accept eventual consistency for low-traffic scenarios.
 *
 * @param kv - KV namespace binding
 * @param ip - Client IP address
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  kv: RateLimitKV,
  ip: string
): Promise<RateLimitResult> {
  // If no KV binding, skip rate limiting (dev mode)
  if (!kv) {
    console.warn('Rate Limiter binding (LIMITER) not found. Skipping rate check.')
    return { allowed: true }
  }

  const minKey = `${RATE_LIMIT.KEY_PREFIX}:min:${ip}`
  const hrKey = `${RATE_LIMIT.KEY_PREFIX}:hr:${ip}`

  // Read current counts
  const [minCountStr, hrCountStr] = await Promise.all([
    kv.get(minKey),
    kv.get(hrKey),
  ])

  const minCount = minCountStr ? parseInt(minCountStr) : 0
  const hrCount = hrCountStr ? parseInt(hrCountStr) : 0

  // Check limits before incrementing
  if (minCount >= RATE_LIMIT.MAX_PER_MINUTE) {
    return { allowed: false, remaining: 0 }
  }
  if (hrCount >= RATE_LIMIT.MAX_PER_HOUR) {
    return { allowed: false, remaining: 0 }
  }

  // Increment counters with TTL
  await Promise.all([
    kv.put(minKey, (minCount + 1).toString(), {
      expirationTtl: RATE_LIMIT.MINUTE_TTL,
    }),
    kv.put(hrKey, (hrCount + 1).toString(), {
      expirationTtl: RATE_LIMIT.HOUR_TTL,
    }),
  ])

  return {
    allowed: true,
    remaining: Math.min(
      RATE_LIMIT.MAX_PER_MINUTE - (minCount + 1),
      RATE_LIMIT.MAX_PER_HOUR - (hrCount + 1)
    ),
  }
}

/**
 * Get current rate limit status without incrementing
 * Useful for informing clients of their remaining quota
 *
 * @param kv - KV namespace binding
 * @param ip - Client IP address
 * @returns Current rate limit status
 */
export async function getRateLimitStatus(
  kv: RateLimitKV,
  ip: string
): Promise<{ minute: { used: number; limit: number }; hour: { used: number; limit: number } }> {
  if (!kv) {
    return {
      minute: { used: 0, limit: RATE_LIMIT.MAX_PER_MINUTE },
      hour: { used: 0, limit: RATE_LIMIT.MAX_PER_HOUR },
    }
  }

  const minKey = `${RATE_LIMIT.KEY_PREFIX}:min:${ip}`
  const hrKey = `${RATE_LIMIT.KEY_PREFIX}:hr:${ip}`

  const [minCountStr, hrCountStr] = await Promise.all([
    kv.get(minKey),
    kv.get(hrKey),
  ])

  return {
    minute: {
      used: minCountStr ? parseInt(minCountStr) : 0,
      limit: RATE_LIMIT.MAX_PER_MINUTE,
    },
    hour: {
      used: hrCountStr ? parseInt(hrCountStr) : 0,
      limit: RATE_LIMIT.MAX_PER_HOUR,
    },
  }
}
