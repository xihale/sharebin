/**
 * Typed environment variables for self-hosted ShareBin
 * Replaces Cloudflare Bindings (c.env.XXX) with process.env reads
 */

function required(name: string): string {
  const v = process.env[name]
  if (!v) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return v
}

export const env = {
  get DATABASE_URL() {
    return required('DATABASE_URL')
  },
  get REDIS_URL() {
    return required('REDIS_URL')
  },
  get NODE_ENV() {
    return process.env.NODE_ENV ?? 'development'
  },
} as const
