export const HTML_ENTRYPOINTS = {
  index: 'index.html',
  viewer: 'viewer.html',
  notFound: '404.html',
} as const

export const PASTE_ID_PATTERN = /^[a-zA-Z0-9]{2,10}$/

export function isPasteId(value: string): boolean {
  return PASTE_ID_PATTERN.test(value)
}

export function getHtmlEntrypointForPath(pathname: string): string | null {
  if (pathname === '/') return HTML_ENTRYPOINTS.index

  const pasteId = pathname.startsWith('/') ? pathname.slice(1) : pathname
  if (isPasteId(pasteId)) return HTML_ENTRYPOINTS.viewer

  return null
}
