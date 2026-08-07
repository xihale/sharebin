/**
 * Editor module for ShareBin
 * Handles editor initialization, language detection, and paste creation
 */

import { icon } from '../icons.js'
import { showToast } from '../ui/toast.js'
import { showView, updateHeaderMeta } from '../ui/view-router.js'
import {
  createCodeEditor,
  getAvailableLanguageIds,
  normalizeLanguageId,
  isLanguageSupported,
} from '../highlight/codemirror.js'
import { renderStaticHighlightedCode } from '../highlight/shiki.js'
import { validateLanguage, detectLanguage, loadFlourite } from './language-detect.js'
import { initTurnstile, resetTurnstile, setWaitingForCaptcha, getWidgetId } from './captcha.js'
import { exportCodeToImage } from '../export/image.js'
import { API } from '../config.js'
import { setVisible, setState } from '../dom.js'

// ==================== State ====================
let _editor: EditorHandle | null = null
let _isManualSelection = false
let _detectTimer: ReturnType<typeof setTimeout> | null = null
let _saveBtn: HTMLButtonElement | null = null

function getPreviewLanguage(langInput: HTMLInputElement | null): string {
  // CodeMirror ids; Shiki maps common aliases (shell→bash, dockerfile→docker, …)
  return normalizeLanguageId(langInput?.value || 'plaintext')
}

/** Apply a language to the live CodeMirror editor (loads grammar if needed). */
async function applyEditorLanguage(lang: string): Promise<void> {
  const id = normalizeLanguageId(lang)
  await _editor?.setLanguage(id)
}

// ==================== Initialization ====================

/**
 * Initialize the editor
 */
export async function initEditor(config: AppConfig): Promise<void> {
  const editorContainer = document.getElementById('editor-container')
  const typeIndicator = document.getElementById('type-indicator')
  _saveBtn = document.getElementById('save-btn') as HTMLButtonElement | null
  const editorExportBtn = document.getElementById('editor-export-btn') as HTMLButtonElement | null
  const editorWrapper = document.getElementById('editor-wrapper')
  const editorControls = document.getElementById('editor-controls')
  const editorPreviewContainer = document.getElementById('editor-preview-container')
  const editorPreviewCodePre = document.getElementById('editor-preview-code-pre')
  const editorPreviewBlock = document.getElementById('editor-markdown-preview')

  if (!editorContainer) return

  // Initialize header
  updateHeaderMeta(`
    <div class="lang-select-wrapper">
      <input type="text" id="language-input" class="lang-input" autocomplete="off" placeholder="Language">
      <ul id="language-dropdown" class="lang-dropdown"></ul>
      ${icon('search', 'input-icon')}
    </div>
    <span class="divider">|</span>
    <button id="editor-preview-btn" class="copy-code-btn preview-toggle" style="position:static; margin:0; display:none;"><span class="btn-preview">${icon('eye')} Preview</span><span class="btn-edit">${icon('code')} Edit</span></button>
  `)

  // Re-query elements injected by updateHeaderMeta
  const langInput = document.getElementById('language-input') as HTMLInputElement | null
  const langDropdown = document.getElementById('language-dropdown') as HTMLUListElement | null
  const editorPreviewBtn = document.getElementById('editor-preview-btn') as HTMLButtonElement | null

  // Function to update preview button visibility based on language
  const updatePreviewBtnVisibility = (): void => {
    if (!editorPreviewBtn) return
    // Show preview button for all languages
    editorPreviewBtn.style.display = 'grid'
  }

  const handleEditorChange = (value: string): void => {
    const content = value.trim()

    if (!content) {
      typeIndicator?.classList.remove('visible')
      return
    }

    const isUrl = /^(http|https):\/\/[^ " ]+$/.test(content)
    if (isUrl) {
      if (typeIndicator) typeIndicator.textContent = 'Link Redirect'
      typeIndicator?.classList.add('visible')
      return
    }

    if (typeIndicator) typeIndicator.textContent = 'Code Snippet'
    typeIndicator?.classList.add('visible')

    // Auto-detect language (if not manually selected)
    if (!_isManualSelection && langInput) {
      if (_detectTimer) clearTimeout(_detectTimer)
      _detectTimer = setTimeout(async () => {
        try {
          await loadFlourite()
          const detected = await detectLanguage(content)
          if (detected) {
            langInput.value = detected
            await applyEditorLanguage(detected)
            updatePreviewBtnVisibility()
          }
        } catch (e) {
          console.error('Language detection failed:', e)
        }
      }, 500)
    }
  }

  showView('editor')

  // Initialize CodeMirror 6 with the shared xAI theme/highlighter
  _editor = await createCodeEditor(editorContainer, {
    language: 'plaintext',
    onChange: handleEditorChange,
    onSave: () => _saveBtn?.click(),
  })

  // Click to focus
  if (editorWrapper) {
    editorWrapper.addEventListener('click', (e) => {
      if (e.target === editorWrapper || e.target === editorContainer) {
        _editor?.setCursorToEnd()
      }
    })
  }

  // Build language list and setup custom dropdown
  const allLanguages = getAvailableLanguageIds()

  if (langInput && langDropdown) {
    const languageInput = langInput
    const languageDropdown = langDropdown
    let dropdownVisible = false
    let activeIndex = -1
    let debounceTimer: ReturnType<typeof setTimeout>

    function renderDropdown(filter = '') {
      const query = filter.toLowerCase()
      const matches = query
        ? allLanguages.filter(l => l.includes(query)).slice(0, 20)
        : allLanguages.slice(0, 20)

      languageDropdown.innerHTML = ''
      activeIndex = -1

      for (const lang of matches) {
        const li = document.createElement('li')
        li.textContent = lang
        li.dataset.value = lang
        li.addEventListener('mousedown', (e) => {
          e.preventDefault() // prevent blur
          selectLanguage(lang)
        })
        languageDropdown.appendChild(li)
      }

      if (matches.length > 0) {
        languageDropdown.classList.add('visible')
        dropdownVisible = true
      } else {
        languageDropdown.classList.remove('visible')
        dropdownVisible = false
      }
    }

    function hideDropdown() {
      languageDropdown.classList.remove('visible')
      dropdownVisible = false
      activeIndex = -1
    }

    function selectLanguage(lang: string) {
      const normalized = normalizeLanguageId(lang)
      languageInput.value = normalized
      _isManualSelection = true
      hideDropdown()
      updatePreviewBtnVisibility()
      void applyEditorLanguage(normalized)
    }

    languageInput.addEventListener('focus', () => {
      languageInput.select()
      renderDropdown(languageInput.value)
    })

    languageInput.addEventListener('blur', () => {
      hideDropdown()
    })

    languageInput.addEventListener('input', () => {
      const val = languageInput.value.trim()
      _isManualSelection = val.length > 0
      updatePreviewBtnVisibility()
      renderDropdown(val)

      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(async () => {
        if (!val || val === 'plaintext' || val === 'text' || val === 'plain') {
          await applyEditorLanguage('plaintext')
          return
        }
        // Load CodeMirror grammar as soon as the input matches a known language / alias
        if (isLanguageSupported(val)) {
          await applyEditorLanguage(val)
        }
      }, 300)
    })

    languageInput.addEventListener('keydown', (e) => {
      if (!dropdownVisible) return
      const items = languageDropdown.querySelectorAll('li')
      if (items.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        activeIndex = Math.min(activeIndex + 1, items.length - 1)
        updateActiveItem(items)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        activeIndex = Math.max(activeIndex - 1, 0)
        updateActiveItem(items)
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault()
        const li = items[activeIndex] as HTMLElement
        selectLanguage(li.dataset.value!)
      } else if (e.key === 'Escape') {
        hideDropdown()
      }
    })

    function updateActiveItem(items: NodeListOf<HTMLLIElement>) {
      items.forEach((item, i) => {
        item.classList.toggle('active', i === activeIndex)
      })
    }
  }

  // Save button handler
  if (_saveBtn) {
    _saveBtn.addEventListener('click', handleSave)
  }

  // Editor preview
  if (editorPreviewBtn) {
    let isPreview = false

    const renderEditorPreview = async (): Promise<void> => {
      const content = _editor?.getValue() || ''
      const language = getPreviewLanguage(langInput)

      if (language === 'markdown') {
        setVisible(editorPreviewCodePre, false)
        setVisible(editorPreviewBlock, true)
        const { renderMarkdown } = await import('../markdown/renderer.js')
        await renderMarkdown(editorPreviewBlock!, content)
        return
      }

      if (editorPreviewBlock) editorPreviewBlock.innerHTML = ''
      setVisible(editorPreviewBlock, false)
      setVisible(editorPreviewCodePre, true)
      await renderStaticHighlightedCode(editorPreviewCodePre!, content, language, { lineNumbers: true })
    }

    const syncEditorPreviewMode = async (): Promise<void> => {
      setVisible(editorWrapper, !isPreview)
      setVisible(editorPreviewContainer, isPreview)
      setVisible(editorControls, !isPreview)
      setState(editorPreviewBtn, isPreview ? 'preview' : null)
      editorPreviewBtn.setAttribute('aria-pressed', String(isPreview))

      if (isPreview) {
        await renderEditorPreview()
        return
      }

      setVisible(editorPreviewCodePre, false)
      setVisible(editorPreviewBlock, false)
      setTimeout(() => _editor?.focus(), 0)
    }

    editorPreviewBtn.addEventListener('click', async () => {
      isPreview = !isPreview
      await syncEditorPreviewMode()
    })
  }

  if (editorExportBtn) {
    editorExportBtn.innerHTML = `<span class="btn-default">Export ${icon('image')}</span><span class="btn-exporting">${icon('spinner', 'spin')} Exporting</span><span class="btn-success">${icon('image')} Exported</span><span class="btn-error">${icon('triangle-alert')} Empty</span><span class="btn-failed">${icon('triangle-alert')} Failed</span>`
  }

  // Editor export
  if (editorExportBtn) {
    editorExportBtn.addEventListener('click', () => {
      const codeContent = _editor?.getValue() || ''
      if (!codeContent.trim()) {
        editorExportBtn.disabled = true
        setState(editorExportBtn, 'error')
        setTimeout(() => {
          editorExportBtn.disabled = false
          setState(editorExportBtn, null)
        }, 2000)
        return
      }

      const language = langInput ? langInput.value.trim() || 'plaintext' : 'plaintext'
      exportCodeToImage({ codeContent, language, exportBtn: editorExportBtn })
    })
  }

  // Initialize Turnstile
  const siteKey = config?.turnstileSiteKey || ''
  initTurnstile(siteKey, submitWithCaptcha)

  // Initialize modal
  const { initModal } = await import('../ui/modal.js')
  initModal(() => {
    setWaitingForCaptcha(false)
    resetTurnstile()
    if (_saveBtn) {
      _saveBtn.disabled = false
      setState(_saveBtn, null)
    }
  })

  // Initialize save button with multi-state HTML
  if (_saveBtn) {
    _saveBtn.innerHTML = `<span class="btn-default">Share ${icon('send')}</span><span class="btn-saving">Saving... ${icon('spinner', 'spin')}</span><span class="btn-verifying">Verifying... ${icon('shield', 'spin')}</span>`
  }

  // Set initial preview button visibility
  updatePreviewBtnVisibility()
}

// ==================== Save Handler ====================

async function handleSave(): Promise<void> {
  if (!_saveBtn || !_editor) return

  const content = _editor.getValue()
  if (!content.trim()) return

  const maxSize = 100 * 1024 // TODO: get from config
  if (content.length > maxSize) {
    showToast('Content too large (Max 100KB)', true)
    return
  }

  _saveBtn.disabled = true
  setState(_saveBtn, 'saving')

  const langInput = document.getElementById('language-input') as HTMLInputElement | null

  try {
    const res = await fetch(API.create, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        type: /^(http|https):\/\/[^ " ]+$/.test(content.trim()) ? 'url' : 'code',
        language: validateLanguage(langInput?.value),
      }),
    })

    // Handle captcha required
    if (res.status === 403) {
      const data: ApiErrorResponse = await res.json()
      if (data.code === 'CAPTCHA_REQUIRED') {
        setState(_saveBtn, 'verifying')
        if (!window.turnstile || getWidgetId() === null) {
          showToast('Security check loading, please wait...', true)
          _saveBtn.disabled = false
          setState(_saveBtn, null)
          return
        }
        setWaitingForCaptcha(true)
        resetTurnstile()
        const { showModal } = await import('../ui/modal.js')
        showModal()
        return
      }
    }

    if (!res.ok) {
      const errorData: ApiErrorResponse = await res.json().catch(() => ({}))
      throw new Error(errorData.error || res.statusText)
    }

    const data: CreatePasteResponse = await res.json()
    handleSuccess(data.id)

  } catch (e) {
    const err = e as Error
    showToast('Error: ' + err.message, true)
    _saveBtn.disabled = false
    setState(_saveBtn, null)
  }
}

async function submitWithCaptcha(token: string): Promise<void> {
  if (!_saveBtn || !_editor) return

  const content = _editor.getValue()
  const langInput = document.getElementById('language-input') as HTMLInputElement | null
  const isUrl = /^(http|https):\/\/[^ "]+$/.test(content.trim())
  const type = isUrl ? 'url' : 'code'
  const language = validateLanguage(langInput?.value)

  const { showLoadingState, hideModal } = await import('../ui/modal.js')
  showLoadingState()

  try {
    const res = await fetch(API.create, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, type, language, 'cf-turnstile-response': token }),
    })

    if (!res.ok) {
      const errorData: ApiErrorResponse = await res.json().catch(() => ({}))
      throw new Error(errorData.error || res.statusText)
    }

    const data: CreatePasteResponse = await res.json()
    if (data.id) {
      handleSuccess(data.id)
    }
  } catch (e) {
    const err = e as Error
    hideModal()
    showToast('Error: ' + err.message, true)
    _saveBtn.disabled = false
    setState(_saveBtn, null)
  }
}

async function handleSuccess(id: string): Promise<void> {
  const link = window.location.origin + '/' + id
  const { showResultState, hideModal } = await import('../ui/modal.js')

  showResultState(
    link,
    () => {
      // Copy link with visual feedback on the button itself
      const copyBtn = document.getElementById('copy-link-btn') as HTMLButtonElement | null
      navigator.clipboard.writeText(link).then(() => {
        if (copyBtn) {
          copyBtn.textContent = 'Copied!'
          copyBtn.style.background = '#4CAF50'
          copyBtn.style.borderColor = '#4CAF50'
          copyBtn.style.color = '#fff'
          setTimeout(() => {
            copyBtn.textContent = 'Copy Link'
            copyBtn.style.background = ''
            copyBtn.style.borderColor = ''
            copyBtn.style.color = ''
          }, 2000)
        }
      }).catch(() => {
        if (copyBtn) {
          copyBtn.textContent = 'Failed'
          copyBtn.style.background = '#ff4757'
          copyBtn.style.borderColor = '#ff4757'
          copyBtn.style.color = '#fff'
          setTimeout(() => {
            copyBtn.textContent = 'Copy Link'
            copyBtn.style.background = ''
            copyBtn.style.borderColor = ''
            copyBtn.style.color = ''
          }, 2000)
        }
      })
    },
    () => {
      // Create new – reset editor without full page reload
      hideModal()
      if (_editor) {
        _editor.setValue('')
        _editor.focus()
      }
      const langInput = document.getElementById('language-input') as HTMLInputElement | null
      if (langInput) langInput.value = ''
      if (_saveBtn) {
        _saveBtn.disabled = false
        setState(_saveBtn, null)
      }
    }
  )
}
