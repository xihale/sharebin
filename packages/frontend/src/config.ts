/**
 * Frontend configuration center
 * All CDN URLs, API paths, and constants are managed here
 */

// ==================== CDN Configuration ====================
const CDN_BASE = 'https://npm.webcache.cn'

export const CDN: Record<string, string | { js: string; css: string }> = {
  base: CDN_BASE,
  marked: `${CDN_BASE}/marked@12.0.0/marked.min.js`,
  dompurify: `${CDN_BASE}/dompurify@3.0.6/dist/purify.min.js`,
  katex: {
    js: `${CDN_BASE}/katex@0.16.9/dist/katex.min.js`,
    css: `${CDN_BASE}/katex@0.16.9/dist/katex.min.css`,
  },
  mermaid: `${CDN_BASE}/mermaid@10.9.1/dist/mermaid.esm.min.mjs`,
  html2canvas: `${CDN_BASE}/html2canvas@1.4.1/dist/html2canvas.min.js`,
  flourite: `${CDN_BASE}/flourite@1.5.0/dist/flourite.min.js`,
}

// ==================== API Configuration ====================
export const API = {
  config: '/api/config',
  create: '/api/create',
  paste: (id: string): string => `/api/paste/${encodeURIComponent(id)}`,
}

// ==================== App Configuration ====================
let _config: AppConfig | null = null

/**
 * Initialize configuration from backend
 * Fetches /api/config and merges with defaults
 */
export async function initConfig(): Promise<AppConfig> {
  try {
    const res = await fetch(API.config)
    if (res.ok) {
      const data: Partial<AppConfig> = await res.json()
      _config = {
        turnstileSiteKey: data.turnstileSiteKey || '',
        maxContentSize: data.maxContentSize || 100 * 1024, // 100KB default
        expirationDays: data.expirationDays || 7,
        cdnBase: data.cdnBase || CDN_BASE,
        ...data,
      }
    }
  } catch (e) {
    console.warn('Failed to load config, using defaults:', e)
  }

  // Fallback defaults
  if (!_config) {
    _config = {
      turnstileSiteKey: '',
      maxContentSize: 100 * 1024,
      expirationDays: 7,
      cdnBase: CDN_BASE,
    }
  }

  return _config
}

/**
 * Get current configuration
 */
export function getConfig(): AppConfig | null {
  return _config
}

/**
 * Library loading cache
 * Each library is loaded only once
 */
const _loadedLibs = new Map<string, Promise<unknown>>()

/**
 * Load a library dynamically
 */
export function loadLibrary(name: string): Promise<unknown> {
  if (_loadedLibs.has(name)) {
    return _loadedLibs.get(name)!
  }

  const url = CDN[name]
  if (!url) {
    return Promise.reject(new Error(`Unknown library: ${name}`))
  }

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url as string
    script.onload = () => resolve((window as unknown as Record<string, unknown>)[name] || true)
    script.onerror = () => reject(new Error(`Failed to load ${name} from ${url}`))
    document.head.appendChild(script)
  })

  _loadedLibs.set(name, promise)
  return promise
}

// ==================== Constants ====================
export const MAX_CONTENT_SIZE = 100 * 1024 // 100KB
export const EXPIRATION_DAYS = 7
