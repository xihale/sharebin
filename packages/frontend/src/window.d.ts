/**
 * Window interface extensions for ShareBin frontend
 * Must be a module (has export) for declare global to work
 */

// Window extensions via interface merging
declare global {
  interface Window {
    turnstile?: Turnstile
    icon: typeof import('./icons').icon
    ICONS: typeof import('./icons').ICONS
    mermaid: MermaidAPI
  }
}

export {}
