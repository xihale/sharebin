/**
 * Security middleware for ShareBin
 * Sets security headers on all responses
 */

import type { Context } from 'hono'
import { SECURITY_HEADERS } from '../config'

/**
 * CORS middleware for Hono
 * Handles Cross-Origin Resource Sharing headers
 */
export async function corsMiddleware(c: Context, next: () => Promise<void>) {
  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  await next()

  // Set CORS header for all responses
  c.header('Access-Control-Allow-Origin', '*')
}

/**
 * Security headers middleware for Hono
 * Adds security headers to all responses
 */
export async function securityMiddleware(c: Context, next: () => Promise<void>) {
  await next()

  // Set security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    c.header(key, value)
  })
}

