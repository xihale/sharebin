import { Hono } from 'hono'
import { getSignedCookie, setSignedCookie } from 'hono/cookie'
import { renderPage, renderError } from './renderer'

type Bindings = {
  DB: D1Database
  TURNSTILE_SECRET_KEY?: string
  TURNSTILE_SITE_KEY?: string
  COOKIE_SECRET?: string
}

type Variables = {
  nonce: string
}

const VERIFIED_COOKIE_NAME = 'sb_verified'

type CreateRequest = {
  content: string
  type: 'code' | 'url'
  language?: string
  'cf-turnstile-response'?: string
}

type ShareData = {
  id: string
  type: 'code' | 'url'
  content: string
  language?: string
  created_at: number
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// --- Configuration ---
const CONFIG = {
    EXPIRATION_TTL: 3 * 24 * 60 * 60 * 1000, // 3 days in ms
    BASE62: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    MAX_CONTENT_SIZE: 100 * 1024, // 100KB limit
    ALLOWED_LANGUAGES: new Set([
      'abap','abnf','actionscript','ada','agda','al','antlr4','apacheconf','apex','apl',
      'applescript','aql','arduino','arff','armasm','arturo','asciidoc','asm6502','asmatmel',
      'aspnet','autohotkey','autoit','avisynth','avro-idl','awk','bash','basic','batch',
      'bbcode','bbj','bicep','birb','bison','bnf','bqn','brainfuck','brightscript','bro','bsl',
      'c','cfscript','chaiscript','cil','cilkc','cilkcpp','clike','clojure','cmake','cobol',
      'coffeescript','concurnas','cooklang','coq','cpp','crystal','csharp','cshtml','csp',
      'css','css-extras','csv','cue','cypher','d','dart','dataweave','dax','dhall','diff',
      'django','dns-zone-file','docker','dot','ebnf','editorconfig','eiffel','ejs','elixir',
      'elm','erb','erlang','etlua','excel-formula','factor','false','firestore-security-rules',
      'flow','fortran','fsharp','ftl','gap','gcode','gdscript','gedcom','gettext','gherkin',
      'git','glsl','gml','gn','go','go-module','gradle','graphql','groovy','haml','handlebars',
      'haskell','haxe','hcl','hlsl','hoon','hpkp','hsts','http','ichigojam','icon',
      'icu-message-format','idris','iecst','ignore','inform7','ini','io','j','java','javadoc',
      'javadoclike','javascript','javastacktrace','jexl','jolie','jq','js-extras','js-templates',
      'jsdoc','json','json5','jsonp','jsstacktrace','jsx','julia','keepalived','keyman','kotlin',
      'kumir','kusto','latex','latte','less','lilypond','linker-script','liquid','lisp',
      'livescript','llvm','log','lolcode','lua','magma','makefile','markdown','markup',
      'markup-templating','mata','matlab','maxscript','mel','mermaid','meta','metafont','mizar',
      'mongodb','monkey','moonscript','n1ql','n4js','nand2tetris-hdl','naniscript','nasm',
      'neon','nevod','nginx','nim','nix','nsis','objectivec','ocaml','odin','opencl','openqasm',
      'oz','parigp','parser','pascal','pascaligo','pcaxis','peoplecode','perl','php',
      'php-extras','phpdoc','plant-uml','plsql','powerquery','powershell','processing','prolog',
      'promql','properties','protobuf','psl','pug','puppet','pure','purebasic','purescript',
      'python','q','qml','qore','qsharp','r','racket','reason','regex','rego','renpy',
      'rescript','rest','rip','roboconf','robotframework','ruby','rust','sas','sass','scala',
      'scheme','scss','shell-session','smali','smalltalk','smarty','sml','solidity',
      'solution-file','soy','sparql','splunk-spl','sqf','sql','squirrel','stan','stata',
      'stylus','supercollider','swift','systemd','t4-cs','t4-templating','t4-vb','tap','tcl',
      'textile','toml','tremor','tsx','tt2','turtle','twig','typescript','typoscript',
      'unrealscript','uorazor','uri','v','vala','vbnet','velocity','verilog','vhdl','vim',
      'visual-basic','warpscript','wasm','web-idl','wgsl','wiki','wolfram','wren','xeora',
      'xml-doc','xojo','xquery','yaml','yang','zig','plaintext'
    ])
}

// --- Helpers ---

// 0. Turnstile Verification
async function verifyTurnstile(token: string, secretKey: string | undefined, siteKey: string | undefined): Promise<boolean> {
    if (!token) return false
    let finalSecret = secretKey
    const TEST_SITE_KEY = '1x00000000000000000000AA'
    const TEST_SECRET_KEY = '1x00000000000000000000AA'
    if (siteKey === TEST_SITE_KEY || finalSecret === TEST_SECRET_KEY) return true
    
    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${encodeURIComponent(finalSecret || TEST_SECRET_KEY)}&response=${encodeURIComponent(token)}`
        })
        const result = await response.json() as { success: boolean }
        return result.success
    } catch (e) {
        return false
    }
}

// 1. Random ID Generator
function generateId(length: number): string {
    const result: string[] = []
    let remaining = length
    while (remaining > 0) {
        const bytesNeeded = Math.ceil(remaining * Math.log2(62) / 8)
        const bytes = new Uint8Array(bytesNeeded)
        crypto.getRandomValues(bytes)
        let buffer = BigInt(0)
        for (const byte of bytes) buffer = (buffer << 8n) | BigInt(byte)
        const maxValue = 62n ** BigInt(remaining)
        const discardRange = 256n ** BigInt(bytesNeeded)
        const remainder = discardRange % maxValue
        if (buffer < discardRange - remainder) {
            for (let i = 0; i < remaining; i++) {
                result.push(CONFIG.BASE62[Number(buffer % 62n)])
                buffer /= 62n
            }
            remaining = 0
        }
    }
    return result.reverse().join('')
}

function validateLanguage(lang: string | undefined): string {
    if (!lang || typeof lang !== 'string') return 'plaintext';
    const normalized = lang.toLowerCase().trim();
    return CONFIG.ALLOWED_LANGUAGES.has(normalized) ? normalized : 'plaintext';
}

// --- Middleware ---

app.use('*', async (c, next) => {
    const nonce = crypto.randomUUID().replace(/-/g, '')
    c.set('nonce', nonce)
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('X-XSS-Protection', '1; mode=block')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    c.header('Content-Security-Policy', `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://static.cloudflareinsights.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' https://static.cloudflareinsights.com https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com;`)
    await next()
})

// --- Routes ---

app.get('/', (c) => {
  const nonce = c.get('nonce')
  return c.html(renderPage(null, false, 'plaintext', nonce))
})

app.post('/api/create', async (c) => {
  let body: CreateRequest
  try { body = await c.req.json() } catch (e) { return c.json({ error: 'Invalid JSON' }, 400) }

  const { content, type, language, 'cf-turnstile-response': turnstileToken } = body

  // 2. Verification (Cookie or Turnstile)
  const cookieSecret = c.env.COOKIE_SECRET || 'dev-secret-do-not-use-in-prod'
  const verifiedCookie = await getSignedCookie(c, cookieSecret, VERIFIED_COOKIE_NAME)
  
  if (verifiedCookie === 'true') {
      isVerified = true
  } else if (turnstileToken) {
      isVerified = await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET_KEY, c.env.TURNSTILE_SITE_KEY)
      if (isVerified) {
          // Set grace period cookie for 1 hour
          await setSignedCookie(c, VERIFIED_COOKIE_NAME, 'true', cookieSecret, {
              path: '/', secure: true, httpOnly: true, sameSite: 'Strict', maxAge: 3600,
          })
      }
  }
  if (!isVerified) return c.json({ error: 'Captcha required', code: 'CAPTCHA_REQUIRED' }, 403)

  // 3. Validation
  if (!content || content.length > CONFIG.MAX_CONTENT_SIZE) return c.json({ error: 'Invalid content size' }, 400)
  const validatedLanguage = validateLanguage(language)

  try {
    // 4. Atomic ID Allocation (2-10 chars)
    const START_LEN = 2, MAX_LEN = 10, RETRIES_PER_LEN = 5
    let finalId = ''

    for (let len = START_LEN; len <= MAX_LEN; len++) {
        for (let i = 0; i < RETRIES_PER_LEN; i++) {
            const candidate = generateId(len)
            try {
                // Try atomic insertion
                await c.env.DB.prepare(
                    'INSERT INTO pastes (id, content, type, language, created_at) VALUES (?, ?, ?, ?, ?)'
                ).bind(candidate, content, type, validatedLanguage, Date.now()).run()
                
                finalId = candidate
                break
            } catch (e: any) {
                if (e.message.includes('UNIQUE constraint failed')) continue // Collision, retry
                throw e // Other DB error
            }
        }
        if (finalId) break
    }

    if (!finalId) return c.json({ error: 'Unable to allocate ID' }, 503)
    return c.json({ id: finalId })

  } catch (err) {
    console.error('DB Error:', err)
    return c.json({ error: 'Database Error' }, 500)
  }
})

app.get('/:id', async (c) => {
  const id = c.req.param('id')
  if (id.length > 10) return c.html(renderError('Not Found'), 404)

  try {
    const data = await c.env.DB.prepare(
        'SELECT * FROM pastes WHERE id = ?'
    ).bind(id).first<ShareData>()

    if (!data) return c.html(renderError('Not Found'), 404)

    // Check expiration manually (3 days)
    if (Date.now() - data.created_at > CONFIG.EXPIRATION_TTL) {
        // Optional: Clean up expired record (fire and forget)
        c.executionCtx.waitUntil(c.env.DB.prepare('DELETE FROM pastes WHERE id = ?').bind(id).run())
        return c.html(renderError('Link Expired'), 404)
    }

    if (data.type === 'url') return c.redirect(data.content)
    const nonce = c.get('nonce')
    return c.html(renderPage(data.content, true, data.language, nonce))
  } catch (e) {
    return c.html(renderError('Internal Error'), 500)
  }
})

export default app

export default app