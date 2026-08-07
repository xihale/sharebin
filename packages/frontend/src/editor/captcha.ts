/**
 * Turnstile captcha integration for ShareBin editor
 */

let _turnstileWidgetId: number | null = null
let _isWaitingForCaptcha = false
let _captchaCallback: ((token: string) => void) | null = null

/**
 * Initialize Turnstile widget
 */
export function initTurnstile(siteKey: string, onSubmit: (token: string) => void): void {
  // No-op when captcha is not configured (e.g. selfhost deploy)
  if (!siteKey) return

  const turnstileContainer = document.getElementById('turnstile-container')
  if (!turnstileContainer) return

  _captchaCallback = onSubmit

  function renderWidget(): void {
    if (window.turnstile) {
      if (_turnstileWidgetId !== null) return

      _turnstileWidgetId = window.turnstile.render('#turnstile-container', {
        sitekey: siteKey || '',
        callback: function (token: string) {
          if (_isWaitingForCaptcha) {
            console.log('Captcha success, submitting...')
            _isWaitingForCaptcha = false
            if (_captchaCallback) _captchaCallback(token)
          }
        },
        'error-callback': function () {
          console.error('Turnstile failed')
          _isWaitingForCaptcha = false
        },
      })
    } else {
      setTimeout(renderWidget, 100)
    }
  }

  renderWidget()
}

/**
 * Reset Turnstile widget
 */
export function resetTurnstile(): void {
  if (window.turnstile && _turnstileWidgetId !== null) {
    window.turnstile.reset(_turnstileWidgetId)
  }
}

/**
 * Set waiting for captcha state
 */
export function setWaitingForCaptcha(waiting: boolean): void {
  _isWaitingForCaptcha = waiting
}

/**
 * Check if waiting for captcha
 */
export function isWaitingForCaptcha(): boolean {
  return _isWaitingForCaptcha
}

/**
 * Get the Turnstile widget ID
 */
export function getWidgetId(): number | null {
  return _turnstileWidgetId
}
