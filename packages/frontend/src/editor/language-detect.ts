/**
 * Language detection module for ShareBin
 * Uses Flourite for language detection and CodeMirror 6 language metadata.
 */

import {
  getLanguageMap as getCodeMirrorLanguageMap,
  getValidLanguageSet,
  isLanguageSupported,
  normalizeLanguageId,
  populateLanguageDatalist,
} from '../highlight/codemirror.js'

/**
 * Flourite (shiki-mode) language names → CodeMirror canonical IDs.
 * Anything not listed is passed through normalizeLanguageId().
 */
export const FLOURITE_TO_CM: Record<string, string> = {
  html: 'html',
  dockerfile: 'dockerfile',
  docker: 'dockerfile',
  csharp: 'csharp',
  javascript: 'javascript',
  typescript: 'typescript',
  markdown: 'markdown',
  bash: 'shell',
  shell: 'shell',
  shellscript: 'shell',
}

/** @deprecated use FLOURITE_TO_CM */
export const FLOURITE_TO_SHIKI = FLOURITE_TO_CM

export const validLanguages: Set<string> = getValidLanguageSet()

/**
 * Initialize language list from CodeMirror language data.
 */
export async function loadCodeMirrorLanguages(dataList: HTMLElement | null = null): Promise<void> {
  populateLanguageDatalist(dataList)
}

/**
 * Validate and normalize a language string against CodeMirror languages
 */
export function validateLanguage(lang: string | null | undefined): string {
  if (!lang || typeof lang !== 'string') {
    return 'plaintext'
  }

  const normalized = normalizeLanguageId(lang)
  return isLanguageSupported(normalized) ? normalized : 'plaintext'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _flouriteModule: Record<string, any> | null = null

/**
 * Detect language from code using Flourite, returning a CodeMirror language id.
 */
export async function detectLanguage(code: string): Promise<string | null> {
  if (!code || !_flouriteModule) return null

  try {
    const flourite = _flouriteModule.default || _flouriteModule.flourite
    if (!flourite) return null
    const result = flourite(code, { shiki: true, noUnknown: true })
    if (result && result.language && result.language !== 'Unknown') {
      const id: string = result.language.toLowerCase()
      const mapped = normalizeLanguageId(FLOURITE_TO_CM[id] || id)
      if (!isLanguageSupported(mapped)) return null
      console.log(`Flourite detected: ${result.language} -> ${mapped}`)
      return mapped
    }
  } catch (e) {
    console.error('Flourite Detection Error:', e)
  }
  return null
}

/**
 * Load Flourite library on demand via esm.sh (ES module)
 */
export async function loadFlourite(): Promise<void> {
  if (_flouriteModule) return
  try {
    _flouriteModule = await import('https://esm.sh/flourite@1.3.0')
  } catch (e) {
    console.error('Failed to load Flourite:', e)
    throw new Error('Failed to load Flourite', { cause: e })
  }
}

export function getLanguageMap(): Record<string, string> {
  return getCodeMirrorLanguageMap()
}

/**
 * Get all valid languages (function form)
 */
export function getValidLanguages(): Set<string> {
  return getValidLanguageSet()
}

export { normalizeLanguageId, isLanguageSupported, getValidLanguageSet }
