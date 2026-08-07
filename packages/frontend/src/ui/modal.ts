/**
 * Modal management module for ShareBin
 * Supports three states: captcha verification, loading, and result display
 */

import { icon } from '../icons.js'

const CAPTCHA_MODAL_ID = 'captcha-modal'
const VISIBLE_CLASS = 'visible'

let _modalEl: HTMLElement | null = null
let _modalBoxEl: HTMLElement | null = null

/**
 * Get or cache modal element
 */
function getModal(): HTMLElement | null {
  if (!_modalEl) {
    _modalEl = document.getElementById(CAPTCHA_MODAL_ID)
  }
  return _modalEl
}

/**
 * Get or cache modal box element
 */
function getModalBox(): HTMLElement | null {
  if (!_modalBoxEl) {
    _modalBoxEl = getModal()?.querySelector('.modal-box') ?? null
  }
  return _modalBoxEl
}

/**
 * Show the captcha modal
 */
export function showModal(): void {
  const modal = getModal()
  if (modal) {
    modal.classList.add(VISIBLE_CLASS)
  }
}

/**
 * Hide the captcha modal
 */
export function hideModal(): void {
  const modal = getModal()
  if (modal) {
    modal.classList.remove(VISIBLE_CLASS)
  }
}

/**
 * Check if modal is currently visible
 */
export function isModalVisible(): boolean {
  const modal = getModal()
  return modal ? modal.classList.contains(VISIBLE_CLASS) : false
}

/**
 * Transition modal to loading state (after captcha verified)
 */
export function showLoadingState(): void {
  const box = getModalBox()
  if (!box) return

  box.innerHTML = `
    <h3>${icon('check-circle', 'icon-success')} Verified</h3>
    <p>Creating your link...</p>
    <div class="modal-loading">${icon('spinner', 'spin')}</div>
  `
}

/**
 * Transition modal to result state with the share link
 */
export function showResultState(link: string, onCopy: () => void, onCreateNew: () => void): void {
  const box = getModalBox()
  if (!box) return

  // Ensure modal is visible
  showModal()

  box.innerHTML = `
    <h3>${icon('check-circle', 'icon-success')} Ready to Share</h3>
    <div class="link-display" id="share-link">${link}</div>
    <p>${icon('clock')} Link expires in 7 days</p>
    <div class="action-row">
      <button id="copy-link-btn" class="btn">Copy Link</button>
      <button id="create-new-btn" class="btn btn-ghost">Create New</button>
    </div>
  `

  const copyBtn = document.getElementById('copy-link-btn')
  if (copyBtn && onCopy) {
    copyBtn.addEventListener('click', onCopy)
  }

  const createNewBtn = document.getElementById('create-new-btn')
  if (createNewBtn && onCreateNew) {
    createNewBtn.addEventListener('click', onCreateNew)
  }
}

/**
 * Reset modal back to captcha verification state
 */
export function resetToCaptchaState(): void {
  const box = getModalBox()
  if (!box) return

  box.innerHTML = `
    <h3>Verification</h3>
    <p>Please complete the security check to share.</p>
    <div id="turnstile-container"></div>
    <div class="modal-actions">
      <button id="cancel-captcha-btn" class="btn-link">Cancel</button>
    </div>
  `
}

/**
 * Initialize modal with cancel button handler
 */
export function initModal(onCancel: () => void): void {
  const cancelBtn = document.getElementById('cancel-captcha-btn')
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      hideModal()
      if (onCancel) onCancel()
    })
  }
}
