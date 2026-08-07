/**
 * Central configuration module for ShareBin
 * All configuration constants should be defined here with semantic names and comments
 */

import type { D1Database, KVNamespace } from '@cloudflare/workers-types'

// ==================== Cookie Configuration ====================
export const COOKIE = {
  /** Name of the verification cookie set after successful Turnstile verification */
  VERIFIED_NAME: 'sb_verified',
  /** Max age for verification cookie in seconds (1 hour) */
  VERIFIED_MAX_AGE: 3600,
  /** Cookie options for signed cookies */
  OPTIONS: {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'Strict' as const,
  },
  /** Test secret for development (DO NOT use in production) */
  TEST_SECRET: 'dev-only-cookie-secret-do-not-use-in-production',
} as const

// ==================== Turnstile Configuration ====================
export const TURNSTILE = {
  /** Test site key for development (always passes) */
  TEST_SITE_KEY: '1x00000000000000000000AA',
  /** Test secret key for development (always passes) */
  TEST_SECRET_KEY: '1x0000000000000000000000000000000AA',
  /** Verification endpoint URL */
  VERIFY_URL: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
} as const

// ==================== Rate Limiting Configuration ====================
export const RATE_LIMIT = {
  /** Maximum requests per minute */
  MAX_PER_MINUTE: 3,
  /** Maximum requests per hour */
  MAX_PER_HOUR: 10,
  /** TTL for per-minute counter in seconds */
  MINUTE_TTL: 60,
  /** TTL for per-hour counter in seconds */
  HOUR_TTL: 3600,
  /** Prefix for rate limit keys in KV */
  KEY_PREFIX: 'rl' as const,
} as const

// ==================== Paste Configuration ====================
export const PASTE = {
  /** Maximum content size in bytes (100 KB) */
  MAX_CONTENT_SIZE: 100 * 1024,
  /** Expiration time in milliseconds (7 days) */
  EXPIRATION_TTL: 7 * 24 * 60 * 60 * 1000,
  /** Base62 alphabet for ID generation */
  BASE62: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  /** Starting length for ID generation */
  ID_START_LEN: 2,
  /** Maximum length for generated IDs */
  ID_MAX_LEN: 10,
  /** Number of retries per length before incrementing */
  ID_RETRIES_PER_LEN: 5,
  /** Maximum ID length allowed in requests */
  MAX_ID_LENGTH: 10,
  /** Allowed URL protocols for URL-type pastes */
  ALLOWED_URL_PROTOCOLS: ['http:', 'https:'] as const,
} as const

// ==================== Security Headers ====================
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer-when-downgrade',
} as const

// ==================== API Response Messages ====================
export const MESSAGES = {
  ERRORS: {
    INVALID_JSON: 'Invalid JSON',
    CONTENT_TOO_LARGE: (maxSize: number) => `Content size exceeds ${Math.floor(maxSize / 1024)}KB`,
    TOO_MANY_REQUESTS: 'Too many requests. Please try again in a minute.',
    CAPTCHA_REQUIRED: 'Captcha required',
    NOT_FOUND: 'Not Found',
    LINK_EXPIRED: 'Link Expired',
    INVALID_URL: 'Invalid or insecure URL',
    ALLOCATION_FAILED: 'Allocation failed',
    INTERNAL_ERROR: 'Internal Server Error',
    COOKIE_SECRET_MISSING: 'Security Error: COOKIE_SECRET environment variable is missing.',
  },
  SUCCESS: {
    CAPTCHA_VERIFIED: 'Captcha verified successfully',
  },
} as const

// ==================== Type Exports ====================
export type Bindings = {
  DB: D1Database
  LIMITER: KVNamespace
  ASSETS: Fetcher
  TURNSTILE_SECRET_KEY?: string
  TURNSTILE_SITE_KEY?: string
  COOKIE_SECRET?: string
}
