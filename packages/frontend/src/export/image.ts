/**
 * Export code to image/PDF functionality
 * Uses html2canvas (PNG) or browser print-to-PDF (PDF) depending on content size
 */

import { getHighlightedLines, normalizeLanguageId } from '../highlight/shiki.js'
import { setState } from '../dom.js'

let _html2canvasLoaded = false
let _html2canvasPromise: Promise<typeof html2canvas> | null = null

/**
 * Load html2canvas library
 */
async function loadHtml2Canvas(): Promise<typeof html2canvas> {
  if (_html2canvasLoaded && typeof html2canvas !== 'undefined') {
    return html2canvas
  }

  if (_html2canvasPromise) {
    return _html2canvasPromise
  }

  _html2canvasPromise = new Promise((resolve, reject) => {
    if (typeof html2canvas !== 'undefined') {
      _html2canvasLoaded = true
      resolve(html2canvas)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://npm.webcache.cn/html2canvas@1.4.1/dist/html2canvas.min.js'
    script.onload = () => {
      _html2canvasLoaded = true
      resolve(html2canvas)
    }
    script.onerror = () => reject(new Error('Failed to load html2canvas'))
    document.head.appendChild(script)
  })

  return _html2canvasPromise
}

interface ExportOptions {
  codeContent: string
  language: string
  exportBtn: HTMLButtonElement
}

// Max canvas dimension (conservative — most browsers support 16384)
const MAX_CANVAS_DIM = 14000

// Max export width before wrapping lines
const MAX_EXPORT_WIDTH = 1200

/**
 * Export code to PNG image or PDF
 */
export async function exportCodeToImage({ codeContent, language, exportBtn }: ExportOptions): Promise<void> {
  if (!exportBtn) return

  exportBtn.disabled = true
  setState(exportBtn, 'exporting')

  try {
    const normalizedLanguage = normalizeLanguageId(language)
    const highlightedLines = await getHighlightedLines(codeContent, normalizedLanguage)

    // Measure text width
    const measurer = document.createElement('div')
    Object.assign(measurer.style, {
      position: 'fixed',
      top: '-99999px',
      left: '-99999px',
      whiteSpace: 'pre',
      width: 'max-content',
      maxWidth: 'none',
      visibility: 'hidden',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--editor-font-size)',
      lineHeight: 'var(--editor-line-height)',
      color: 'var(--fg)',
    } as Partial<CSSStyleDeclaration>)
    measurer.textContent = codeContent
    document.body.appendChild(measurer)
    const measurerStyle = getComputedStyle(measurer)
    const naturalWidth = measurer.scrollWidth

    // Get styles
    const codeFontFamily = measurerStyle.fontFamily
    const codeFontSize = measurerStyle.fontSize
    const codeLineHeight = measurerStyle.lineHeight
    const codeForeground = measurerStyle.color
    document.body.removeChild(measurer)

    // Color scheme - always use xAI dark theme
    const bgColor = '#1f2228'
    const gutterColor = 'rgba(255,255,255,0.5)'
    const dividerColor = 'rgba(255,255,255,0.1)'

    // Calculate dimensions
    const lineCount = codeContent.split('\n').length
    const digits = String(lineCount).length
    const gutterWidth = Math.max(digits * 8 + 12, 32)
    const exportPadding = 24
    const codePaddingLeft = 12

    // Clamp width — wrap long lines
    const maxCodeWidth = MAX_EXPORT_WIDTH - gutterWidth - codePaddingLeft
    const codeWidth = Math.min(naturalWidth, maxCodeWidth)
    const exportWidth = Math.max(codeWidth + gutterWidth + codePaddingLeft, 480)
    const totalWidth = exportWidth + exportPadding * 2

    // Estimate total height
    const lineHeightPx = parseFloat(codeLineHeight) || 22.4
    const charsPerLine = Math.max(Math.floor(codeWidth / 8.4), 40)
    let estimatedLines = 0
    for (const line of codeContent.split('\n')) {
      estimatedLines += Math.max(1, Math.ceil(line.length / charsPerLine))
    }
    const estimatedHeight = estimatedLines * lineHeightPx + exportPadding * 2

    // Check if canvas would be too large at hi-dpi scale
    const needsWrapping = naturalWidth > codeWidth + gutterWidth + codePaddingLeft
    const scale = Math.max(window.devicePixelRatio || 1, 2)
    const canvasPixelHeight = estimatedHeight * scale
    const canvasPixelWidth = totalWidth * scale

    if (canvasPixelHeight > MAX_CANVAS_DIM || canvasPixelWidth > MAX_CANVAS_DIM) {
      // Export as PDF — real text, selectable, searchable
      await exportAsPdf({
        highlightedLines,
        codeFontFamily,
        codeFontSize,
        codeLineHeight,
        codeForeground,
        bgColor,
        gutterColor,
        dividerColor,
        gutterWidth,
        exportPadding,
        codePaddingLeft,
        lineCount,
      })
    } else {
      // Export as PNG via html2canvas
      await exportAsPng({
        highlightedLines,
        codeFontFamily,
        codeFontSize,
        codeLineHeight,
        codeForeground,
        bgColor,
        gutterColor,
        dividerColor,
        gutterWidth,
        exportPadding,
        codePaddingLeft,
        lineCount,
        exportWidth,
        totalWidth,
        needsWrapping,
        maxCodeWidth,
        scale,
      })
    }

    // Show success state on button
    setState(exportBtn, 'success')
    setTimeout(() => {
      exportBtn.disabled = false
      setState(exportBtn, null)
    }, 2000)

  } catch (e) {
    console.error('Export failed:', e)

    // Show error state on button
    setState(exportBtn, 'failed')
    setTimeout(() => {
      exportBtn.disabled = false
      setState(exportBtn, null)
    }, 2000)
  }
}

interface ExportContext {
  highlightedLines: string[]
  codeFontFamily: string
  codeFontSize: string
  codeLineHeight: string
  codeForeground: string
  bgColor: string
  gutterColor: string
  dividerColor: string
  gutterWidth: number
  exportPadding: number
  codePaddingLeft: number
  lineCount: number
}

/**
 * Build the styled code DOM for export
 */
function buildExportDom(ctx: ExportContext, wrap: boolean, maxCodeWidth?: number): HTMLDivElement {
  const wrapper = document.createElement('div')
  Object.assign(wrapper.style, {
    position: 'fixed',
    top: '-99999px',
    left: '-99999px',
    padding: ctx.exportPadding + 'px',
    margin: '0',
    boxSizing: 'border-box',
    background: ctx.bgColor,
    borderRadius: '0px',
    fontFamily: ctx.codeFontFamily,
    fontSize: ctx.codeFontSize,
    lineHeight: ctx.codeLineHeight,
    ...(wrap ? { width: (maxCodeWidth || MAX_EXPORT_WIDTH) + ctx.gutterWidth + ctx.codePaddingLeft + ctx.exportPadding * 2 + 'px' } : {}),
  } as Partial<CSSStyleDeclaration>)

  const pre = document.createElement('pre')
  Object.assign(pre.style, {
    margin: '0',
    padding: '0',
    background: 'transparent',
    border: 'none',
    borderRadius: '0',
    boxSizing: 'border-box',
    overflow: 'visible',
    fontFamily: ctx.codeFontFamily,
    fontSize: ctx.codeFontSize,
    lineHeight: ctx.codeLineHeight,
  } as Partial<CSSStyleDeclaration>)

  ctx.highlightedLines.forEach((lineHtml, idx) => {
    const row = document.createElement('div')
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'stretch',
      minHeight: ctx.codeLineHeight,
      width: '100%',
    } as Partial<CSSStyleDeclaration>)

    // Gutter
    const gutter = document.createElement('span')
    Object.assign(gutter.style, {
      display: 'inline-flex',
      alignItems: 'baseline',
      justifyContent: 'flex-end',
      minWidth: ctx.gutterWidth + 'px',
      width: ctx.gutterWidth + 'px',
      paddingRight: '10px',
      paddingLeft: '0',
      boxSizing: 'border-box',
      userSelect: 'none',
      flexShrink: '0',
      color: ctx.gutterColor,
      borderRight: '1px solid ' + ctx.dividerColor,
      fontFamily: ctx.codeFontFamily,
      fontSize: ctx.codeFontSize,
      lineHeight: ctx.codeLineHeight,
      alignSelf: 'flex-start',
    } as Partial<CSSStyleDeclaration>)
    gutter.textContent = String(idx + 1)

    // Line content
    const lineSpan = document.createElement('code')
    Object.assign(lineSpan.style, {
      display: 'block',
      paddingLeft: ctx.codePaddingLeft + 'px',
      paddingRight: '0',
      flex: '1',
      fontFamily: ctx.codeFontFamily,
      fontSize: ctx.codeFontSize,
      lineHeight: ctx.codeLineHeight,
      color: ctx.codeForeground,
      background: 'transparent',
      minHeight: ctx.codeLineHeight,
      ...(wrap
        ? { whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflowWrap: 'break-word', maxWidth: (maxCodeWidth || MAX_EXPORT_WIDTH) + 'px' }
        : { whiteSpace: 'pre' }),
    } as Partial<CSSStyleDeclaration>)
    lineSpan.innerHTML = lineHtml || '&#8203;'

    row.appendChild(gutter)
    row.appendChild(lineSpan)
    pre.appendChild(row)
  })

  wrapper.appendChild(pre)
  return wrapper
}

interface PngContext extends ExportContext {
  exportWidth: number
  totalWidth: number
  needsWrapping: boolean
  maxCodeWidth: number
  scale: number
}

/**
 * Export as PNG via html2canvas
 */
async function exportAsPng(ctx: PngContext): Promise<void> {
  const html2canvasFn = await loadHtml2Canvas()

  const wrapper = buildExportDom(ctx, ctx.needsWrapping, ctx.needsWrapping ? ctx.maxCodeWidth : undefined)

  if (!ctx.needsWrapping) {
    Object.assign(wrapper.style, {
      width: ctx.totalWidth + 'px',
      minWidth: ctx.totalWidth + 'px',
    } as Partial<CSSStyleDeclaration>)
  }

  document.body.appendChild(wrapper)

  const canvas = await html2canvasFn(wrapper, {
    scale: ctx.scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: ctx.bgColor,
    width: wrapper.offsetWidth,
    windowWidth: wrapper.offsetWidth + 200,
  })

  // Download
  const link = document.createElement('a')
  link.download = 'sharebin-code.png'
  link.href = canvas.toDataURL('image/png')
  link.click()

  document.body.removeChild(wrapper)
}

/**
 * Export as PDF via browser print — real text, selectable, searchable.
 * Uses @page { size } to fit content, no margins, dark background.
 */
async function exportAsPdf(ctx: ExportContext): Promise<void> {
  const maxCodeWidth = MAX_EXPORT_WIDTH - ctx.gutterWidth - ctx.codePaddingLeft
  const wrapper = buildExportDom(ctx, true, maxCodeWidth)
  wrapper.style.position = 'static'
  wrapper.style.top = ''
  wrapper.style.left = ''

  // Measure actual rendered size
  document.body.appendChild(wrapper)
  const contentWidth = wrapper.offsetWidth
  const contentHeight = wrapper.offsetHeight
  document.body.removeChild(wrapper)

  // Build HTML with @page sized to content
  // Add 1px to page height to prevent Chrome from adding a blank second page
  const pageHeight = contentHeight + 1
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>ShareBin Export</title>
<style>
  @page {
    size: ${contentWidth}px ${pageHeight}px;
    margin: 0;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: ${ctx.bgColor};
    color: ${ctx.codeForeground};
    font-family: ${ctx.codeFontFamily};
    font-size: ${ctx.codeFontSize};
    line-height: ${ctx.codeLineHeight};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body > div {
    width: ${contentWidth}px;
  }
</style>
</head>
<body>${wrapper.outerHTML}</body>
</html>`

  const iframe = document.createElement('iframe')
  Object.assign(iframe.style, {
    position: 'fixed',
    top: '-99999px',
    left: '-99999px',
    width: '0',
    height: '0',
    border: 'none',
  } as Partial<CSSStyleDeclaration>)
  document.body.appendChild(iframe)

  const iframeDoc = iframe.contentDocument!
  iframeDoc.open()
  iframeDoc.write(html)
  iframeDoc.close()

  await new Promise<void>((resolve) => {
    let printed = false
    const doPrint = () => {
      if (printed) return
      printed = true
      iframe.contentWindow?.print()
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe)
        resolve()
      }, 100)
    }
    iframe.onload = () => setTimeout(doPrint, 300)
    setTimeout(doPrint, 1500)
  })
}
