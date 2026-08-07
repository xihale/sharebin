/**
 * Global type declarations for ShareBin frontend
 * External libraries loaded via CDN at runtime
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Turnstile captcha
interface Turnstile {
  render: (container: string, options: Record<string, any>) => number
  reset: (widgetId: number) => void
}

// Mermaid diagram renderer
interface MermaidAPI {
  initialize: (options: Record<string, any>) => void
  run: (options: { nodes: NodeListOf<Element> }) => Promise<void>
}

// marked markdown parser
declare const marked: {
  Renderer: new () => {
    code: (code: string, lang?: string) => string
    [key: string]: any
  }
  parse: (src: string, options?: Record<string, any>) => string
}

// DOMPurify sanitizer
declare const DOMPurify: {
  sanitize: (html: string) => string
}

// KaTeX auto-render
declare const renderMathInElement: (
  element: HTMLElement,
  options: {
    delimiters: Array<{ left: string; right: string; display: boolean }>
    throwOnError: boolean
    trust: boolean
  },
) => void

// html2canvas
declare const html2canvas: (
  element: HTMLElement,
  options?: Record<string, any>,
) => Promise<HTMLCanvasElement>

// App configuration
interface AppConfig {
  turnstileSiteKey: string
  maxContentSize: number
  expirationDays: number
  cdnBase: string
  [key: string]: any
}

// CodeMirror editor handle
interface EditorHandle {
  view: import('@codemirror/view').EditorView
  getValue: () => string
  setValue: (value: string) => void
  focus: () => void
  setCursorToEnd: () => void
  setLanguage: (language: string) => Promise<void>
  destroy: () => void
}

// API response types
interface PasteResponse {
  id: string
  content: string
  language: string
  type: 'code' | 'url'
  url?: string
  expiration: string
}

interface CreatePasteResponse {
  id: string
}

interface ApiErrorResponse {
  error?: string
  code?: string
}

declare module '*.css'

// Allow dynamic URL imports
declare module 'https://*' {
  const mod: any
  export default mod
}

declare module 'http://*' {
  const mod: any
  export default mod
}
