/**
 * Rate limiting service for ShareBin
 * Thin wrapper over the Redis atomic limiter (see src/db/redis.ts)
 */

import { checkRateLimit as redisCheckRateLimit } from '../db/redis'
import type { RateLimitResult } from '../types'

/**
 * Check rate limit for a given IP (atomic via Redis INCR)
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  return redisCheckRateLimit(ip)
}
