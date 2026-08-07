/**
 * ID generation utilities for ShareBin
 * Handles Base62 ID generation and validation
 */

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/**
 * Generate a random ID of specified length using Base62 alphabet
 * @param length - Desired ID length
 * @returns Random Base62 string
 */
export function generateId(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => BASE62[b % 62])
    .join('')
}

/**
 * Validate if a string is a valid Base62 ID
 * Valid IDs: 2-10 characters, only [0-9A-Za-z]
 * @param id - ID to validate
 * @returns true if valid
 */
export function validateId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  // Base62 regex: only alphanumeric, length 2-10
  return /^[0-9A-Za-z]{2,10}$/.test(id)
}
