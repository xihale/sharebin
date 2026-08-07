/**
 * Viewer module for ShareBin
 * Handles displaying pastes with CodeMirror 6 syntax highlighting and markdown rendering
 */

import { icon } from '../icons.js'
import { showView, updateHeaderMeta, showError } from '../ui/view-router.js'
import { renderMarkdown } from '../markdown/renderer.js'
import { exportCodeToImage } from '../export/image.js'
import { normalizeLanguageId, renderStaticHighlightedCode } from '../highlight/shiki.js'
import { setVisible, setState } from '../dom.js'

// ==================== State ====================
let _language = 'plaintext'
let _content = ''
let _isPreview = false

const VIEWER_LANGUAGE_LABELS = new Map<string, string>(Object.entries({
  plaintext: 'Plain Text',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  markdown: 'Markdown',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  yaml: 'YAML',
  sql: 'SQL',
  shell: 'Shell',
  cpp: 'C++',
  csharp: 'C#',
  fsharp: 'F#',
  java: 'Java',
  python: 'Python',
  rust: 'Rust',
  go: 'Go',
  ruby: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  dart: 'Dart',
}))

function formatViewerLanguage(language: string | null | undefined): string {
  const normalized = normalizeLanguageId(language || 'plaintext')
  return VIEWER_LANGUAGE_LABELS.get(normalized) || normalized
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

// ==================== Initialization ====================

/**
 * Initialize the viewer for a given paste ID
 */
export async function initViewer(pasteId: string, _config: AppConfig): Promise<void> {
  try {
    const res = await fetch(`/api/paste/${encodeURIComponent(pasteId)}`)

    if (!res.ok) {
      const data: ApiErrorResponse = await res.json().catch(() => ({ error: 'Unknown error' }))
      showError(data.error || 'Not Found')
      document.title = `ShareBin - ${data.error || 'Error'}`
      return
    }

    const data: PasteResponse = await res.json()

    // Handle URL redirect
    if (data.type === 'url') {
      window.location.href = data.url!
      return
    }

    // Show code viewer
    _language = normalizeLanguageId(data.language || 'plaintext')
    _content = data.content || ''
    const expiration = data.expiration || '7 d'

    // Update header
    updateHeaderMeta(`
      <div class="viewer-meta-group">
        <div class="viewer-info">
          <span class="viewer-language-badge">${formatViewerLanguage(_language)}</span>
          <span class="viewer-expiration">${icon('clock')} ${expiration}</span>
        </div>
        <div class="viewer-controls">
          ${_language === 'markdown' ? `<button id="preview-btn" class="copy-code-btn preview-toggle" style="position:static; margin:0;"><span class="btn-preview">${icon('eye')} Preview</span><span class="btn-source">${icon('code')} Source</span></button>` : ''}
          <button id="export-image-btn" class="copy-code-btn" style="position:static; margin:0;"><span class="btn-default">${icon('image')} Export</span><span class="btn-exporting">${icon('spinner', 'spin')} Exporting</span><span class="btn-success">${icon('image')} Exported</span><span class="btn-error">${icon('triangle-alert')} Empty</span><span class="btn-failed">${icon('triangle-alert')} Failed</span></button>
          <button id="copy-code-btn" class="copy-code-btn" style="position:static; margin:0;"><span class="btn-default">${icon('copy')} Copy</span><span class="btn-success">${icon('check')} Copied!</span></button>
        </div>
      </div>
    `)

    // Update viewer code with static CodeMirror 6 highlighting
    const viewerCodePre = document.getElementById('viewer-code-pre')
    if (viewerCodePre) {
      await renderStaticHighlightedCode(viewerCodePre, _content, _language, { lineNumbers: true })
    }

    const previewBlock = document.getElementById('markdown-preview')
    const isMarkdown = _language === 'markdown'
    setVisible(viewerCodePre, !isMarkdown)
    setVisible(previewBlock, isMarkdown)
    _isPreview = isMarkdown

    if (isMarkdown && previewBlock) {
      await renderMarkdown(previewBlock, _content)
    }

    showView('viewer')
    document.title = `ShareBin - ${_language}`

    // Initialize viewer event listeners
    initViewerEvents()

  } catch (e) {
    console.error('Failed to load paste:', e)
    showError('Failed to load content')
  }
}

// ==================== Event Handlers ====================

function initViewerEvents(): void {
  // Copy code button
  const copyCodeBtn = document.getElementById('copy-code-btn') as HTMLButtonElement | null
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', () => {
      if (_content) {
        navigator.clipboard.writeText(_content).then(() => {
          copyCodeBtn.disabled = true
          setState(copyCodeBtn, 'success')
          setTimeout(() => {
            copyCodeBtn.disabled = false
            setState(copyCodeBtn, null)
          }, 2000)
        })
      }
    })
  }

  // Export image button
  const exportImageBtn = document.getElementById('export-image-btn') as HTMLButtonElement | null
  if (exportImageBtn) {
    exportImageBtn.addEventListener('click', () => {
      if (!_content.trim()) {
        exportImageBtn.disabled = true
        setState(exportImageBtn, 'error')
        setTimeout(() => {
          exportImageBtn.disabled = false
          setState(exportImageBtn, null)
        }, 2000)
        return
      }

      exportCodeToImage({
        codeContent: _content,
        language: _language,
        exportBtn: exportImageBtn,
      })
    })
  }

  // Markdown preview toggle
  const previewBtn = document.getElementById('preview-btn') as HTMLButtonElement | null
  if (previewBtn) {
    const preBlock = document.getElementById('viewer-code-pre')
    const previewBlock = document.getElementById('markdown-preview')

    const updateView = (): void => {
      setVisible(preBlock, !_isPreview)
      setVisible(previewBlock, _isPreview)
      setState(previewBtn, _isPreview ? 'preview' : null)
      previewBtn.setAttribute('aria-pressed', String(_isPreview))
    }

    updateView()

    previewBtn.addEventListener('click', () => {
      _isPreview = !_isPreview
      updateView()
    })
  }
}
