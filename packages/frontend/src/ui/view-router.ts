/**
 * View router module for ShareBin
 * Handles switching between editor, viewer, and error views
 */

import { setVisible } from '../dom.js'

const HEADER_META_ID = 'header-meta'

type ViewName = 'editor' | 'viewer' | 'error' | 'loading'

interface Views {
  editor: HTMLElement | null
  viewer: HTMLElement | null
  error: HTMLElement | null
  loading: HTMLElement | null
  headerMeta: HTMLElement | null
}

let _views: Views | null = null

/**
 * Initialize view elements (lazy, cached)
 */
function getViews(): Views {
  if (!_views) {
    _views = {
      editor: document.getElementById('editor-view'),
      viewer: document.getElementById('viewer-view'),
      error: document.getElementById('error-view'),
      loading: document.getElementById('loading-indicator'),
      headerMeta: document.getElementById(HEADER_META_ID),
    }
  }
  return _views
}

/**
 * Show a specific view and hide others
 */
export function showView(viewName: ViewName): void {
  const views = getViews()

  // Hide all views
  setVisible(views.editor, false)
  setVisible(views.viewer, false)
  setVisible(views.error, false)
  setVisible(views.loading, false)

  // Show requested view
  setVisible(views[viewName], true)
}

/**
 * Show error view with message
 */
export function showError(message: string, titleSuffix = 'Error'): void {
  const errorMsgEl = document.getElementById('error-message')
  if (errorMsgEl) {
    errorMsgEl.textContent = message
  }
  showView('error')
  document.title = `ShareBin - ${titleSuffix}`
}

/**
 * Update header meta area
 */
export function updateHeaderMeta(htmlStr: string): void {
  const views = getViews()
  if (views.headerMeta) {
    views.headerMeta.innerHTML = htmlStr
  }
}

/**
 * Get header meta element
 */
export function getHeaderMeta(): HTMLElement | null {
  const views = getViews()
  return views.headerMeta
}
