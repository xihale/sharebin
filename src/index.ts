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

const CONFIG = {
    EXPIRATION_TTL: 3 * 24 * 60 * 60 * 1000,
    BASE62: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    MAX_CONTENT_SIZE: 100 * 1024,
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

async function verifyTurnstile(token: string, secretKey: string | undefined): Promise<boolean> {
    if (!token || !secretKey) return false
    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`
        })
        const result = await response.json() as { success: boolean }
        return result.success
    } catch (e) {
        return false
    }
}

function generateId(length: number): string {
    const bytes = new Uint8Array(length)
    crypto.getRandomValues(bytes)
    return Array.from(bytes).map(b => CONFIG.BASE62[b % 62]).join('')
}

function validateLanguage(lang: string | undefined): string {
    if (!lang || typeof lang !== 'string') return 'plaintext'
    const normalized = lang.toLowerCase().trim()
    return CONFIG.ALLOWED_LANGUAGES.has(normalized) ? normalized : 'plaintext'
}

// Global Error Handler to catch 500s
app.onError((err, c) => {
  console.error('Global Error:', err)
  return c.json({ 
    error: 'Internal Server Error'
  }, 500)
})

app.use('*', async (c, next) => {
    // Safer hex nonce generation
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    c.set('nonce', nonce)

    await next()

    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    // Explicitly set CSP with 'self' and correct format
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'wasm-eval' https://static.cloudflareinsights.com https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "connect-src 'self' blob: data: https://static.cloudflareinsights.com https://challenges.cloudflare.com",
      "frame-src https://challenges.cloudflare.com",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
    c.res.headers.set('Content-Security-Policy', csp)
})

app.get('/', (c) => {
  const nonce = c.get('nonce')
  return c.html(renderPage(null, false, 'plaintext', nonce, c.env.TURNSTILE_SITE_KEY))
})

app.post('/api/create', async (c) => {
    let body: CreateRequest
    try { body = await c.req.json() } catch (e) { return c.json({ error: 'Invalid JSON' }, 400) }

    const { content, type, language, 'cf-turnstile-response': turnstileToken } = body

    const cookieSecret = c.env.COOKIE_SECRET
    if (!cookieSecret) {
        throw new Error('Security Error: COOKIE_SECRET environment variable is missing.')
    }
    const verifiedCookie = await getSignedCookie(c, cookieSecret, VERIFIED_COOKIE_NAME)
    
    let isVerified = verifiedCookie === 'true'
    if (!isVerified && turnstileToken) {
        isVerified = await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET_KEY)
        if (isVerified) {
            await setSignedCookie(c, VERIFIED_COOKIE_NAME, 'true', cookieSecret, {
                path: '/', secure: true, httpOnly: true, sameSite: 'Strict', maxAge: 3600,
            })
        }
    }

    if (!isVerified) return c.json({ error: 'Captcha required', code: 'CAPTCHA_REQUIRED' }, 403)

    if (!content || content.length > CONFIG.MAX_CONTENT_SIZE) return c.json({ error: 'Content size exceeds 100KB' }, 400)
    const validatedLanguage = validateLanguage(language)

    const START_LEN = 2, MAX_LEN = 10, RETRIES_PER_LEN = 5
    let finalId = ''

    for (let len = START_LEN; len <= MAX_LEN; len++) {
        for (let i = 0; i < RETRIES_PER_LEN; i++) {
            const candidate = generateId(len)
            try {
                await c.env.DB.prepare(
                    'INSERT INTO pastes (id, content, type, language, created_at) VALUES (?, ?, ?, ?, ?)'
                ).bind(candidate, content, type || 'code', validatedLanguage, Date.now()).run()
                finalId = candidate
                break
            } catch (e: any) {
                if (e.message && e.message.includes('UNIQUE constraint failed')) continue 
                throw e
            }
        }
        if (finalId) break
    }

    if (!finalId) return c.json({ error: 'Allocation failed' }, 503)
    return c.json({ id: finalId })
})

app.get('/:id', async (c) => {
  const id = c.req.param('id')
  if (id.length > 10) return c.html(renderError('Not Found'), 404)

  const data = await c.env.DB.prepare('SELECT * FROM pastes WHERE id = ?').bind(id).first<ShareData>()
  if (!data) return c.html(renderError('Not Found'), 404)

  if (Date.now() - data.created_at > CONFIG.EXPIRATION_TTL) {
      c.executionCtx.waitUntil(c.env.DB.prepare('DELETE FROM pastes WHERE id = ?').bind(id).run())
      return c.html(renderError('Link Expired'), 404)
  }

  if (data.type === 'url') {
      // Security: Only redirect to http/https to prevent javascript: or ws: XSS/SSRF risks
      const ALLOWED_PROTOCOLS = ['http:', 'https:'];
      try {
          const url = new URL(data.content);
          if (ALLOWED_PROTOCOLS.includes(url.protocol)) {
              return c.redirect(data.content);
          }
      } catch (e) {
          // If URL is invalid, fall through to error
      }
      return c.html(renderError('Invalid or insecure URL'), 400);
  }
  const nonce = c.get('nonce')
  return c.html(renderPage(data.content, true, data.language, nonce, c.env.TURNSTILE_SITE_KEY))
})

// --- Cron Trigger for Cleanup ---
// This handles the background cleanup process
const worker = {
    fetch: app.fetch,
    async scheduled(event: any, env: Bindings, ctx: ExecutionContext) {
        console.log('Running background cleanup...');
        const expirationTime = Date.now() - CONFIG.EXPIRATION_TTL;
        ctx.waitUntil(
            env.DB.prepare('DELETE FROM pastes WHERE created_at < ?')
                .bind(expirationTime)
                .run()
                .then(res => console.log(`Cleanup complete. Meta: ${JSON.stringify(res.meta)}`))
                .catch(err => console.error('Cleanup failed:', err))
        );
    }
};

export default worker;