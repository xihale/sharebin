/**
 * Captcha (Turnstile) service for ShareBin
 * Handles Turnstile verification and cookie management
 */

import type { Context } from 'hono'
import type { Bindings } from '../config'
import { TURNSTILE, COOKIE } from '../config'
import type { TurnstileResult } from '../types'
import { getSignedCookie, setSignedCookie } from 'hono/cookie'

/**
 * Get Turnstile configuration based on environment
 * Uses test keys if real keys are not configured
 *
 * @param c - Context with environment bindings
 * @returns Turnstile config with siteKey and secretKey
 */
export function getTurnstileConfig(c: Context<{ Bindings: Bindings }>) {
  const hasRealKeys = c.env.TURNSTILE_SITE_KEY && c.env.TURNSTILE_SECRET_KEY

  const config = {
    siteKey: hasRealKeys ? c.env.TURNSTILE_SITE_KEY! : TURNSTILE.TEST_SITE_KEY,
    secretKey: hasRealKeys ? c.env.TURNSTILE_SECRET_KEY! : TURNSTILE.TEST_SECRET_KEY,
  }

  if (!hasRealKeys) {
    console.log('[Dev] Turnstile keys not configured, using test keys')
  }

  return config
}

/**
 * Verify a Turnstile token with Cloudflare's API
 *
 * @param token - The turnstile token from the client
 * @param secretKey - The secret key to verify with
 * @returns true if verification succeeded
 */
export async function verifyTurnstileToken(
  token: string,
  secretKey: string | undefined
): Promise<boolean> {
  if (!token || !secretKey) return false

  try {
    const response = await fetch(TURNSTILE.VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
    })
    const result = (await response.json()) as { success: boolean }
    return result.success
  } catch (_e) {
    return false
  }
}

/**
 * Handle the complete captcha verification flow
 * 1. Check for existing verification cookie
 * 2. If not verified, verify turnstile token
 * 3. If verified, set cookie
 *
 * @param c - Hono context (with cookie methods)
 * @param turnstileToken - Optional turnstile token from request
 * @returns Turnstile result with verification status
 */
export async function handleCaptchaFlow(
  c: Context<{ Bindings: Bindings }>,
  turnstileToken?: string
): Promise<TurnstileResult> {
  const cookieSecret = c.env.COOKIE_SECRET || COOKIE.TEST_SECRET
  if (!c.env.COOKIE_SECRET && c.env.TURNSTILE_SECRET_KEY) {
    throw new Error('COOKIE_SECRET is not configured')
  }

  if (!c.env.COOKIE_SECRET) {
    console.log('[Dev] COOKIE_SECRET not configured, using test secret')
  }

  // Check existing cookie
  const verifiedCookie = await getSignedCookie(c, cookieSecret, COOKIE.VERIFIED_NAME)
  let isVerified = verifiedCookie === 'true'

  // If not verified, try the provided token
  if (!isVerified && turnstileToken) {
    const { secretKey } = getTurnstileConfig(c)
    isVerified = await verifyTurnstileToken(turnstileToken, secretKey)

    if (isVerified) {
      await setSignedCookie(c, cookieSecret, COOKIE.VERIFIED_NAME,
        'true',
        {
          ...COOKIE.OPTIONS,
          maxAge: COOKIE.VERIFIED_MAX_AGE,
        }
      )
    }
  }

  return { success: true, isVerified }
}

/**
 * Get the Turnstile site key for the frontend
 * @param c - Context with environment bindings
 * @returns Site key string
 */
export function getSiteKey(c: Context): string {
  const { siteKey } = getTurnstileConfig(c)
  return siteKey || ''
}
