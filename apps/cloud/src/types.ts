/**
 * Unified type definitions for ShareBin
 * All shared types should be defined here
 */

import type { Bindings } from './config'

// ==================== Request Types ====================

export type CreateRequest = {
  content: string
  type: 'code' | 'url'
  language?: string
  'cf-turnstile-response'?: string
}

// ==================== Data Types ====================

export type ShareData = {
  id: string
  type: 'code' | 'url'
  content: string
  language?: string
  created_at: number
}

/** Row type for D1 database paste records */
export type PasteRow = {
  id: string
  content: string
  type: 'code' | 'url'
  language: string | null
  created_at: number
}

// ==================== Response Types ====================

/** Standard API response wrapper */
export type ApiResponse<T = unknown> = {
  data?: T
  error?: string
  code?: string
}

/** Response for successful paste creation */
export type CreateResponse = {
  id: string
}

/** Response for paste retrieval */
export type PasteResponse = {
  type: 'code' | 'url'
  content?: string
  url?: string
  language?: string
  expiration?: string
}

/** Response for config endpoint */
export type ConfigResponse = {
  turnstileSiteKey: string
  maxContentSize?: number
  expirationDays?: number
  cdnBase?: string
}

// ==================== Error Types ====================

/** Application error codes */
export enum AppErrorCode {
  INVALID_JSON = 'INVALID_JSON',
  CONTENT_TOO_LARGE = 'CONTENT_TOO_LARGE',
  RATE_LIMITED = 'RATE_LIMITED',
  CAPTCHA_REQUIRED = 'CAPTCHA_REQUIRED',
  NOT_FOUND = 'NOT_FOUND',
  LINK_EXPIRED = 'LINK_EXPIRED',
  INVALID_URL = 'INVALID_URL',
  ALLOCATION_FAILED = 'ALLOCATION_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CONFIG_MISSING = 'CONFIG_MISSING',
}

/** Application error with code and status */
export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    public statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// ==================== Context Types ====================

/** Extended context with typed env bindings */
export type AppContext = {
  env: Bindings
  req: Request
  executionCtx?: ExecutionContext
}

// ==================== Service Types ====================

/** Result of ID generation */
export type GenerateIdResult = {
  success: boolean
  id?: string
  error?: string
}

/** Result of rate limit check */
export type RateLimitResult = {
  allowed: boolean
  remaining?: number
}

/** Result of Turnstile verification */
export type TurnstileResult = {
  success: boolean
  isVerified: boolean
}
