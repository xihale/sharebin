/**
 * Shiki-based syntax highlighting for ShareBin
 * Core + engine bundled; languages + theme loaded from webcache CDN at runtime
 */

import { createHighlighterCore, type HighlighterCore, type ThemeInput } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

const DARK_THEME = 'vitesse-dark' as const
const SHIKI_VERSION = '4.0.2'
const CDN_BASE = 'https://npm.webcache.cn'

function cdnUrl(pkg: string, version: string, path: string): string {
  return `${CDN_BASE}/${pkg}@${version}/dist/${path}`
}

// All shiki bundled language IDs (extracted from shiki@4.0.2 bundledLanguages)
// biome-ignore format: long list
const KNOWN_LANGUAGES = [
  'abap','actionscript-3','ada','angular-html','angular-ts','apache','apex','apl',
  'applescript','ara','asciidoc','asm','astro','awk','ballerina','bat','beancount',
  'berry','bibtex','bicep','bird2','blade','bsl','c','c3','cadence','cairo','clarity',
  'clojure','cmake','cobol','codeowners','codeql','coffee','common-lisp','coq','cpp',
  'crystal','csharp','css','csv','cue','cypher','d','dart','dax','desktop','diff',
  'docker','dotenv','dream-maker','edge','elixir','elm','emacs-lisp','erb','erlang',
  'fennel','fish','fluent','fortran-fixed-form','fortran-free-form','fsharp',
  'gdresource','gdscript','gdshader','genie','gherkin','git-commit','git-rebase',
  'glsl','gnuplot','go','graphql','groovy','hack','haml','handlebars','haskell',
  'haxe','hcl','hlsl','html','http','hxml','hy','java','javascript','jinja','jison',
  'json','json5','jsonc','jsonl','julia','kotlin','kusto','latex','lean','less','liquid',
  'log','logo','lua','luau','make','markdown','marko','matlab','mdc','mermaid','meson',
  'mojo','move','narrat','nextflow','nginx','nim','nix','nushell','objective-c',
  'objective-cpp','ocaml','pascal','perl','php','pine','plsql','po','postcss','powerquery',
  'powershell','prisma','prolog','proto','pug','puppet','purescript','python','qml','r',
  'racket','raku','razor','reg','regexp','rel','riscv','rst','ruby','rust','sas','sass',
  'scala','scheme','scss','shaderlab','shellscript','shellsession','smalltalk','solidity',
  'solution','sparql','sql','ssh-config','stata','stylus','svelte','swift','system-verilog',
  'systemd','talonscript','tasl','terraform','tex','toml','ts-tags','tsv','tsx','turtle',
  'twig','typescript','typespec','typst','v','vala','vb','verilog','vhdl','viml','vue',
  'vue-directives','vue-interpolation','vue-root','vyper','wasm','wenyan','wgsl','wikitext',
  'wolfram','xml','xsl','yaml','zenscript','zig',
]

// Lazy singleton highlighter
let _highlighter: HighlighterCore | null = null
let _highlighterPromise: Promise<HighlighterCore> | null = null

async function getHighlighter(): Promise<HighlighterCore> {
  if (_highlighter) return _highlighter
  if (_highlighterPromise) return _highlighterPromise

  _highlighterPromise = (async () => {
    const themeMod = await loadThemeFromCdn(DARK_THEME)

    _highlighter = await createHighlighterCore({
      themes: [themeMod],
      langs: [],
      engine: createJavaScriptRegexEngine(),
    })

    return _highlighter
  })()

  return _highlighterPromise
}

/**
 * Load a theme from webcache CDN
 */
async function loadThemeFromCdn(themeName: string): Promise<ThemeInput> {
  const url = cdnUrl('@shikijs/themes', SHIKI_VERSION, `${themeName}.mjs`)
  const mod = await import(/* @vite-ignore */ url)
  return mod.default
}

// Track loaded languages to avoid re-loading
const _loadedLangs = new Set<string>()
const _loadingLangs = new Map<string, Promise<boolean>>()

async function ensureLangLoaded(langId: string): Promise<boolean> {
  if (langId === 'text' || langId === 'plaintext' || langId === 'plain') return true

  const highlighter = await getHighlighter()
  if (highlighter.getLoadedLanguages().includes(langId)) {
    _loadedLangs.add(langId)
    return true
  }

  if (_loadedLangs.has(langId)) {
    return highlighter.getLoadedLanguages().includes(langId)
  }

  if (!KNOWN_LANGUAGES.includes(langId)) {
    return false
  }

  const pending = _loadingLangs.get(langId)
  if (pending) {
    return pending
  }

  const loadPromise = (async () => {
    try {
      const url = cdnUrl('@shikijs/langs', SHIKI_VERSION, `${langId}.mjs`)
      const mod = await import(/* @vite-ignore */ url)
      const langModule = mod.default as Parameters<typeof highlighter.loadLanguage>[0] | Parameters<typeof highlighter.loadLanguage>[0][]

      if (!langModule || (Array.isArray(langModule) && langModule.length === 0)) {
        throw new Error(`Missing default export for language: ${langId}`)
      }

      if (Array.isArray(langModule)) {
        await highlighter.loadLanguage(...langModule)
      } else {
        await highlighter.loadLanguage(langModule)
      }

      const loaded = highlighter.getLoadedLanguages().includes(langId)
      if (!loaded) {
        throw new Error(`Language not registered after load: ${langId}`)
      }

      _loadedLangs.add(langId)
      return true
    } catch (e) {
      console.error('[shiki] Failed to load language:', langId, e)
      return false
    } finally {
      _loadingLangs.delete(langId)
    }
  })()

  _loadingLangs.set(langId, loadPromise)
  return loadPromise
}

// Language normalization - maps user input to shiki language IDs
const LANGUAGE_ALIASES: Record<string, string> = {
  plain: 'text',
  plaintext: 'text',
  text: 'text',
  txt: 'text',
  markup: 'html',
  htm: 'html',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  shell: 'bash',
  shellscript: 'bash',
  dockerfile: 'docker',
  docker: 'docker',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  cs: 'csharp',
  csharp: 'csharp',
  cpp: 'cpp',
  'c++': 'cpp',
  md: 'markdown',
  yml: 'yaml',
  jsonc: 'json',
  objectivec: 'objective-c',
  objectivecpp: 'objective-cpp',
  'objective-c++': 'objective-cpp',
  // CodeMirror canonical IDs → Shiki
  webassembly: 'wasm',
  'c-sharp': 'csharp',
  fsharp: 'fsharp',
  'f-sharp': 'fsharp',
}

let _validLanguageSet: Set<string> | null = null
let _languageMap: Map<string, string> | null = null

function ensureLanguageIndex(): void {
  if (_validLanguageSet && _languageMap) return

  _validLanguageSet = new Set(['text', 'plaintext', 'plain', 'txt'])
  _languageMap = new Map()

  for (const langId of KNOWN_LANGUAGES) {
    _validLanguageSet.add(langId)
    _languageMap.set(langId, langId)
  }

  for (const [alias, target] of Object.entries(LANGUAGE_ALIASES)) {
    _validLanguageSet.add(alias)
    _languageMap.set(alias, target)
  }
}

function normalizeRawLanguage(language: string | null | undefined): string {
  return String(language || 'plaintext').trim().toLowerCase()
}

export function normalizeLanguageId(language: string | null | undefined): string {
  ensureLanguageIndex()
  const raw = normalizeRawLanguage(language)
  return _languageMap!.get(raw) || raw
}

export function languageClassName(language: string): string {
  return `language-${normalizeLanguageId(language)}`
}

export function getLanguageMap(): Record<string, string> {
  ensureLanguageIndex()
  return Object.fromEntries(_languageMap!.entries())
}

export function getValidLanguageSet(): Set<string> {
  ensureLanguageIndex()
  return new Set(_validLanguageSet!)
}

export function getAvailableLanguageIds(): string[] {
  ensureLanguageIndex()
  return [..._validLanguageSet!].sort((a, b) => a.localeCompare(b))
}

export function populateLanguageDatalist(dataList: HTMLElement | null): void {
  if (!dataList) return
  dataList.innerHTML = ''
  for (const language of getAvailableLanguageIds()) {
    const option = document.createElement('option')
    option.value = language
    dataList.appendChild(option)
  }
}

export function isLanguageSupported(language: string): boolean {
  const id = normalizeLanguageId(language)
  if (id === 'text' || id === 'plaintext') return true
  return KNOWN_LANGUAGES.includes(id)
}

function toShikiLang(language: string): string {
  const normalized = normalizeLanguageId(language)
  if (KNOWN_LANGUAGES.includes(normalized)) return normalized
  return 'text'
}

/**
 * Highlight code and return per-line HTML strings (for export)
 */
export async function getHighlightedLines(content: string, language = 'plaintext'): Promise<string[]> {
  const source = String(content ?? '')
  if (!source) return ['&#8203;']

  const lang = toShikiLang(language)
  if (lang === 'text') {
    return source.split('\n').map((line) => escapeHtml(line) || '&#8203;')
  }

  try {
    const loaded = await ensureLangLoaded(lang)
    const highlighter = await getHighlighter()

    if (!loaded || !highlighter.getLoadedLanguages().includes(lang)) {
      return source.split('\n').map((line) => escapeHtml(line) || '&#8203;')
    }

    const tokens = highlighter.codeToTokensBase(source, {
      lang,
      theme: DARK_THEME,
    })

    return tokens.map((line) => {
      if (line.length === 0) return '&#8203;'

      let html = ''
      for (const token of line) {
        const escaped = escapeHtml(token.content)
        if (token.color) {
          html += `<span style="color:${token.color}">${escaped}</span>`
        } else {
          html += escaped
        }
      }
      return html || '&#8203;'
    })
  } catch {
    return source.split('\n').map((line) => escapeHtml(line) || '&#8203;')
  }
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface RenderOptions {
  lineNumbers?: boolean
  className?: string
}

/**
 * Render highlighted code into a container element
 */
export async function renderStaticHighlightedCode(
  container: HTMLElement,
  content: string,
  language = 'plaintext',
  options: RenderOptions = {},
): Promise<void> {
  if (!container) return

  const source = String(content ?? '')
  const normalizedLanguage = normalizeLanguageId(language)
  const lang = toShikiLang(normalizedLanguage)
  const lineNumbers = options.lineNumbers !== false

  container.innerHTML = ''
  container.className = [
    'shiki-static',
    lineNumbers ? 'shiki-static-line-numbers' : '',
    languageClassName(normalizedLanguage),
    options.className || '',
  ].filter(Boolean).join(' ')
  container.dataset.language = normalizedLanguage
  ;(container as HTMLElement & { __rawCode: string }).__rawCode = source

  if (lang === 'text' || !source) {
    renderPlainText(container, source, lineNumbers)
    return
  }

  try {
    const loaded = await ensureLangLoaded(lang)
    const highlighter = await getHighlighter()

    if (!loaded || !highlighter.getLoadedLanguages().includes(lang)) {
      console.warn('[shiki] Language not loaded after ensure:', lang)
      renderPlainText(container, source, lineNumbers)
      return
    }

    const html = highlighter.codeToHtml(source, {
      lang,
      theme: DARK_THEME,
    })

    // Parse the generated HTML to extract lines
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const lines = doc.querySelectorAll('.line')

    if (lines.length > 0) {
      lines.forEach((lineEl, index) => {
        const row = document.createElement('div')
        row.className = 'shiki-static-line'

        if (lineNumbers) {
          const gutter = document.createElement('span')
          gutter.className = 'shiki-static-line-number'
          gutter.textContent = String(index + 1)
          row.appendChild(gutter)
        }

        const code = document.createElement('code')
        code.className = 'shiki-static-code'
        code.innerHTML = lineEl.innerHTML || '&#8203;'
        row.appendChild(code)
        container.appendChild(row)
      })
    } else {
      renderPlainText(container, source, lineNumbers)
    }
  } catch (e) {
    console.error('[shiki] renderStaticHighlightedCode error:', e)
    renderPlainText(container, source, lineNumbers)
  }
}

function renderPlainText(container: HTMLElement, source: string, lineNumbers: boolean): void {
  const lines = source.split('\n')
  lines.forEach((line, index) => {
    const row = document.createElement('div')
    row.className = 'shiki-static-line'

    if (lineNumbers) {
      const gutter = document.createElement('span')
      gutter.className = 'shiki-static-line-number'
      gutter.textContent = String(index + 1)
      row.appendChild(gutter)
    }

    const code = document.createElement('code')
    code.className = 'shiki-static-code'
    code.textContent = line || ''
    if (!line) code.innerHTML = '&#8203;'
    row.appendChild(code)
    container.appendChild(row)
  })
}
