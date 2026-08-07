/**
 * Toast notification module for ShareBin
 */

import { icon } from '../icons.js'

const TOAST_ID = 'toast'

let _toastEl: HTMLElement | null = null

/**
 * Get or cache toast element
 */
function getToast(): HTMLElement | null {
  if (!_toastEl) {
    _toastEl = document.getElementById(TOAST_ID)
  }
  return _toastEl
}

/**
 * Show a toast notification
 */
export function showToast(message: string, isError = false, duration = 3000): void {
  const toast = getToast()
  if (!toast) return

  toast.innerHTML = isError ? `${icon('exclamation-circle')} ${message}` : message
  toast.classList.toggle('error', isError)
  toast.classList.add('show')

  setTimeout(() => {
    toast.classList.remove('show')
  }, duration)
}

/**
 * Show success toast with check icon
 */
export function showSuccess(message: string): void {
  showToast(`${icon('check')} ${message}`)
}

/**
 * Show error toast
 */
export function showError(message: string): void {
  showToast(message, true)
}
