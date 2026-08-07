/**
 * ShareBin Viewer Entry Point
 * Shared CodeMirror 6 static-highlighting entry for viewing pastes
 */

import './style.css'
import { icon, ICONS } from './icons.js'
import { setVisible } from './dom.js'

// Make icon available globally for templates
window.icon = icon
window.ICONS = ICONS

/**
 * Main initialization for viewer
 */
async function main(): Promise<void> {
  // Extract paste ID from URL
  const path = window.location.pathname.slice(1) // remove leading /
  if (!path) {
    window.location.href = '/'
    return
  }

  // Initialize viewer
  const { initViewer } = await import('./viewer/index.js')
  const { initConfig } = await import('./config.js')
  const config = await initConfig()
  initViewer(path, config)
}

// Start the app
main().catch((err: unknown) => {
  console.error('Viewer initialization failed:', err)
  const errorView = document.getElementById('error-view')
  if (errorView) {
    const errorMsg = document.getElementById('error-message')
    if (errorMsg) {
      errorMsg.textContent = 'Failed to initialize viewer'
    }
    setVisible(errorView, true)
  }
})
