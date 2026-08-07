/**
 * Type definitions for ShareBin (self-hosted)
 */

// ==================== Request Types ====================
export type CreateRequest = {
  content: string
  type: 'code' | 'url'
  language?: string
}

// ==================== Data Types ====================
/** Row type for PostgreSQL paste records */
export type PasteRow = {
  id: string
  content: string
  type: 'code' | 'url'
  language: string | null
  created_at: number
}

// ==================== Response Types ====================
export type ApiResponse<T = unknown> = {
  data?: T
  error?: string
  code?: string
}

export type CreateResponse = {
  id: string
}

export type PasteResponse = {
  type: 'code' | 'url'
  content?: string
  url?: string
  language?: string
  expiration?: string
}

export type ConfigResponse = {
  maxContentSize?: number
  expirationDays?: number
  cdnBase?: string
}

// ==================== Error Types ====================
export enum AppErrorCode {
  INVALID_JSON = 'INVALID_JSON',
  CONTENT_TOO_LARGE = 'CONTENT_TOO_LARGE',
  RATE_LIMITED = 'RATE_LIMITED',
  NOT_FOUND = 'NOT_FOUND',
  LINK_EXPIRED = 'LINK_EXPIRED',
  INVALID_URL = 'INVALID_URL',
  ALLOCATION_FAILED = 'ALLOCATION_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// NOTE: AppError is defined in src/utils/error.ts (with prototype-chain fix).

// ==================== Service Types ====================
export type RateLimitResult = {
  allowed: boolean
  remaining?: number
}
