/**
 * Central configuration module for ShareBin (self-hosted)
 * Pure constants only — no Cloudflare binding types
 */

// ==================== Rate Limiting ====================
export const RATE_LIMIT = {
  MAX_PER_MINUTE: 3,
  MAX_PER_HOUR: 10,
  MINUTE_TTL: 60,
  HOUR_TTL: 3600,
  KEY_PREFIX: 'rl' as const,
} as const

// ==================== Paste ====================
export const PASTE = {
  MAX_CONTENT_SIZE: 100 * 1024,
  EXPIRATION_TTL: 7 * 24 * 60 * 60 * 1000,
  BASE62: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  ID_START_LEN: 2,
  ID_MAX_LEN: 10,
  ID_RETRIES_PER_LEN: 5,
  MAX_ID_LENGTH: 10,
  ALLOWED_URL_PROTOCOLS: ['http:', 'https:'] as const,
} as const

// ==================== Security Headers ====================
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer-when-downgrade',
} as const

// ==================== API Messages ====================
export const MESSAGES = {
  ERRORS: {
    INVALID_JSON: 'Invalid JSON',
    CONTENT_TOO_LARGE: (maxSize: number) => `Content size exceeds ${Math.floor(maxSize / 1024)}KB`,
    TOO_MANY_REQUESTS: 'Too many requests. Please try again in a minute.',
    NOT_FOUND: 'Not Found',
    LINK_EXPIRED: 'Link Expired',
    INVALID_URL: 'Invalid or insecure URL',
    ALLOCATION_FAILED: 'Allocation failed',
    INTERNAL_ERROR: 'Internal Server Error',
  },
} as const
