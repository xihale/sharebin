/**
 * DOM utility helpers for ShareBin
 * Eliminates repetitive classList / querySelector patterns
 */

/** Shorthand for querySelector */
export const $ = <T extends Element = Element>(sel: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(sel)

/** Shorthand for querySelectorAll (returns real Array) */
export const $$ = <T extends Element = Element>(sel: string, root: ParentNode = document): T[] =>
  [...root.querySelectorAll<T>(sel)]

/**
 * Toggle element visibility via state-hidden / state-visible classes
 */
export function setVisible(el: HTMLElement | null | undefined, visible: boolean): void {
  if (!el) return
  el.classList.toggle('state-hidden', !visible)
  el.classList.toggle('state-visible', visible)
}

/**
 * Set a data-state attribute and mirror it as a CSS class (state-{value}).
 * Pass null / '' to clear all state-* classes added by this helper.
 */
export function setState(el: HTMLElement | null | undefined, state: string | null): void {
  if (!el) return
  // Remove any previous state-* class we set
  for (const cls of [...el.classList]) {
    if (cls.startsWith('state-')) el.classList.remove(cls)
  }
  if (state) {
    el.classList.add(`state-${state}`)
  }
}

interface RawHtml {
  __raw: true
  value: string
}

/**
 * Tagged template literal for safe HTML construction.
 * Interpolated values are auto-escaped; use ${raw(...)} to insert raw HTML.
 *
 * @example
 * html`<p>Hello ${name}</p>`           // name is escaped
 * html`<p>Hello ${raw(bold)}</p>`      // bold inserted as-is
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = ''
  for (let i = 0; i < strings.length; i++) {
    result += strings[i]
    if (i < values.length) {
      const v = values[i]
      result += v != null && typeof v === 'object' && (v as RawHtml).__raw
        ? (v as RawHtml).value
        : escapeHtml(v ?? '')
    }
  }
  return result
}
html.raw = raw

/** Mark a value as raw (unescaped) for use in html`` */
export function raw(value: unknown): RawHtml {
  return { __raw: true, value: String(value) }
}

function escapeHtml(s: unknown): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
