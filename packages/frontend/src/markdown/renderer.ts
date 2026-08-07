/**
 * Unified Markdown renderer for ShareBin
 * Eliminates the duplicated markdown rendering logic
 * Used by both editor preview and viewer
 */

import { icon } from '../icons.js'
import { showToast } from '../ui/toast.js'
import { normalizeLanguageId, renderStaticHighlightedCode } from '../highlight/shiki.js'

// ==================== State ====================
let _markedLoaded = false
let _dompurifyLoaded = false
let _katexLoaded = false
let _mermaidLoaded = false

// ==================== Library Loading ====================

/**
 * Load marked library
 */
async function loadMarked(): Promise<void> {
  if (_markedLoaded) return
  if (typeof marked === 'undefined') {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://npm.webcache.cn/marked@12.0.0/marked.min.js'
      script.onload = () => { _markedLoaded = true; resolve() }
      script.onerror = () => reject(new Error('Failed to load marked'))
      document.head.appendChild(script)
    })
  } else {
    _markedLoaded = true
  }
}

/**
 * Load DOMPurify library
 */
async function loadDOMPurify(): Promise<void> {
  if (_dompurifyLoaded) return
  if (typeof DOMPurify === 'undefined') {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://npm.webcache.cn/dompurify@3.0.6/dist/purify.min.js'
      script.onload = () => { _dompurifyLoaded = true; resolve() }
      script.onerror = () => reject(new Error('Failed to load DOMPurify'))
      document.head.appendChild(script)
    })
  } else {
    _dompurifyLoaded = true
  }
}

/**
 * Load KaTeX library and CSS
 */
async function loadKaTeX(): Promise<void> {
  if (_katexLoaded) return
  if (typeof renderMathInElement === 'undefined') {
    // Load CSS first
    const cssLink = document.createElement('link')
    cssLink.rel = 'stylesheet'
    cssLink.href = 'https://npm.webcache.cn/katex@0.16.9/dist/katex.min.css'
    document.head.appendChild(cssLink)

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://npm.webcache.cn/katex@0.16.9/dist/katex.min.js'
      script.onload = () => { _katexLoaded = true; resolve() }
      script.onerror = () => reject(new Error('Failed to load KaTeX'))
      document.head.appendChild(script)
    })
  } else {
    _katexLoaded = true
  }
}

/**
 * Load Mermaid library
 */
async function loadMermaid(): Promise<void> {
  if (_mermaidLoaded) return
  if (typeof window.mermaid === 'undefined') {
    const mermaidMod = await import('https://npm.webcache.cn/mermaid@10.9.1/dist/mermaid.esm.min.mjs')
    window.mermaid = mermaidMod.default
    _mermaidLoaded = true
  } else {
    _mermaidLoaded = true
  }
}

// ==================== Renderer ====================

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface RenderMarkdownOptions {
  isDark?: boolean
}

/**
 * Render markdown content into a container
 */
export async function renderMarkdown(container: HTMLElement, rawContent: string, options: RenderMarkdownOptions = {}): Promise<void> {
  if (!container) return

  // Load required libraries
  if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
    try {
      await Promise.all([loadMarked(), loadDOMPurify()])
    } catch (e) {
      container.innerHTML = '<p style="color:red">Error loading rendering libraries.</p>'
      console.error(e)
      return
    }
  }

  try {
    // Create custom renderer
    const renderer = new marked.Renderer()

    renderer.code = (code: string, lang?: string) => {
      const source = String(code ?? '')
      const language = normalizeLanguageId(lang || 'plaintext')
      if (language === 'mermaid') {
        return `<div class="mermaid">${escapeHtml(source)}</div>`
      }
      return `<div class="code-block-wrapper">
                <button class="copy-snippet-btn">${icon('copy')}</button>
                <pre class="shiki-static shiki-static-line-numbers language-${language}" data-language="${language}"><code>${escapeHtml(source)}</code></pre>
              </div>`
    }

    // Render markdown
    const html = marked.parse(rawContent, { renderer, breaks: true, gfm: true })
    const sanitized = DOMPurify.sanitize(html)
    container.innerHTML = sanitized

    // Highlight code fences with shiki
    const codeBlocks = [...container.querySelectorAll('pre[data-language]')]
    await Promise.all(codeBlocks.map(pre => {
      const language = (pre as HTMLElement).dataset.language || 'plaintext'
      const code = pre.textContent || ''
      return renderStaticHighlightedCode(pre as HTMLElement, code, language, { lineNumbers: true })
    }))

    // Render math with KaTeX (if needed)
    if (rawContent.includes('$') && typeof renderMathInElement !== 'undefined') {
      if (!_katexLoaded) {
        await loadKaTeX()
      }
      renderMathInElement(container, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
        ],
        throwOnError: false,
        trust: true,
      })
    }

    // Render Mermaid diagrams (if needed)
    const mermaidBlocks = container.querySelectorAll('.mermaid')
    if (mermaidBlocks.length > 0) {
      if (!_mermaidLoaded) {
        await loadMermaid()
      }
      const isDark = options.isDark ?? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
      window.mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' })
      await window.mermaid.run({ nodes: mermaidBlocks }).catch((e: unknown) => console.error('Mermaid rendering error:', e))
    }

    // Bind copy buttons
    container.querySelectorAll('.copy-snippet-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const codeBlock = btn.nextElementSibling as (HTMLElement & { __rawCode?: string }) | null
        const codeText = codeBlock?.__rawCode ?? codeBlock?.textContent
        if (codeText) {
          navigator.clipboard.writeText(codeText).then(() => {
            showToast(`${icon('code')} Code Copied!`)
          })
        }
      })
    })

  } catch (e) {
    container.innerHTML = '<p style="color:red">Error rendering markdown.</p>'
    console.error('Markdown render error:', e)
  }
}

/**
 * Clear rendered content
 */
export function clearMarkdown(container: HTMLElement | null): void {
  if (container) {
    container.innerHTML = ''
  }
}
