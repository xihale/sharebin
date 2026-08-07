/**
 * Unified error handling for ShareBin
 * Provides AppError class and error handling utilities
 */

import type { Context } from 'hono'
import type { AppErrorCode } from '../types'
import { MESSAGES } from '../config'
import { env } from '../env'

/**
 * Application error with code and HTTP status
 */
export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    public statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype)
  }

  /** Convert to JSON response body */
  toJSON() {
    return {
      error: this.message,
      code: this.code,
    }
  }
}

/**
 * Global error handler for Hono
 * Returns structured error responses with a request id (X-Request-Id when present)
 */
export function globalErrorHandler(err: Error, c: Context) {
  const requestId = c.req.header('x-request-id') || 'unknown'

  // Log error with context
  console.error(`[Error] RequestID=${requestId}`, {
    name: err.name,
    message: err.message,
    stack: err.stack,
  })

  // Handle AppError instances
  if (err instanceof AppError) {
    return c.json(err.toJSON(), err.statusCode as 400 | 403 | 404 | 429 | 500 | 503)
  }

  // Handle unexpected errors
  const isDev = env.NODE_ENV !== 'production'
  return c.json(
    {
      error: isDev ? err.message : MESSAGES.ERRORS.INTERNAL_ERROR,
      code: 'INTERNAL_ERROR' as const,
      ...(isDev && { stack: err.stack }),
    },
    500
  )
}

/**
 * Create common AppError instances
 */
export const Errors = {
  invalidJson(): AppError {
    return new AppError('INVALID_JSON' as AppErrorCode, 400, MESSAGES.ERRORS.INVALID_JSON)
  },

  contentTooLarge(maxSize: number): AppError {
    return new AppError('CONTENT_TOO_LARGE' as AppErrorCode, 400, MESSAGES.ERRORS.CONTENT_TOO_LARGE(maxSize))
  },

  rateLimited(): AppError {
    return new AppError('RATE_LIMITED' as AppErrorCode, 429, MESSAGES.ERRORS.TOO_MANY_REQUESTS)
  },

  notFound(): AppError {
    return new AppError('NOT_FOUND' as AppErrorCode, 404, MESSAGES.ERRORS.NOT_FOUND)
  },

  linkExpired(): AppError {
    return new AppError('LINK_EXPIRED' as AppErrorCode, 404, MESSAGES.ERRORS.LINK_EXPIRED)
  },

  invalidUrl(): AppError {
    return new AppError('INVALID_URL' as AppErrorCode, 400, MESSAGES.ERRORS.INVALID_URL)
  },

  allocationFailed(): AppError {
    return new AppError('ALLOCATION_FAILED' as AppErrorCode, 503, MESSAGES.ERRORS.ALLOCATION_FAILED)
  },

  internalError(message?: string): AppError {
    return new AppError(
      'INTERNAL_ERROR' as AppErrorCode,
      500,
      message || MESSAGES.ERRORS.INTERNAL_ERROR
    )
  },
}
