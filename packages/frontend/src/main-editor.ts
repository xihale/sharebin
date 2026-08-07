/**
 * ShareBin Editor Entry Point
 * Handles editor initialization
 */

import './style.css'
import { icon, ICONS } from './icons.js'

// Make icon available globally for templates
window.icon = icon
window.ICONS = ICONS

/**
 * Main initialization for editor
 */
async function main(): Promise<void> {
  // Initialize configuration
  const { initConfig } = await import('./config.js')
  const config = await initConfig()

  // Initialize editor
  const { initEditor } = await import('./editor/index.js')
  initEditor(config)
}

// Start the app
main().catch((err: unknown) => {
  console.error('Editor initialization failed:', err)
})
