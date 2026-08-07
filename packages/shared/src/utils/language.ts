/**
 * Language validation utilities for ShareBin
 * Handles language normalization and validation against allowed list
 */

import { ALLOWED_LANGUAGES } from '../languages'

/**
 * Validate and normalize a language string
 * Returns 'plaintext' if invalid or not allowed
 *
 * @param lang - Raw language string from request
 * @returns Normalized language identifier
 */
export function validateLanguage(lang: string | undefined): string {
  if (!lang || typeof lang !== 'string') return 'plaintext'

  const normalized = lang.toLowerCase().trim()
  return ALLOWED_LANGUAGES.has(normalized) ? normalized : 'plaintext'
}

/**
 * Check if a language is allowed
 * @param lang - Language to check
 * @returns true if allowed
 */
export function isLanguageAllowed(lang: string): boolean {
  if (!lang || typeof lang !== 'string') return false
  return ALLOWED_LANGUAGES.has(lang.toLowerCase().trim())
}

/**
 * Get the list of allowed languages (for documentation or config)
 * @returns Array of allowed language strings
 */
export function getAllowedLanguages(): string[] {
  return Array.from(ALLOWED_LANGUAGES)
}

/**
 * Common language aliases mapping
 * Maps alternative names to canonical Prism language names
 */
export const LANGUAGE_ALIASES: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'sh': 'bash',
  'shell': 'bash',
  'yml': 'yaml',
  'md': 'markdown',
  'c++': 'cpp',
  'c#': 'csharp',
}
