const ALLOWED_LANGUAGES = new Set([
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

function sanitizeLanguage(lang: string): string {
    if (!lang || typeof lang !== 'string') {
        return 'plaintext';
    }
    const normalized = lang.toLowerCase().trim();
    return ALLOWED_LANGUAGES.has(normalized) ? normalized : 'plaintext';
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderError(message: string) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>ShareBin - Error</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    
    <!-- Fonts & Icons -->
    <link rel="stylesheet" href="/fonts.css">
    <link rel="stylesheet" href="/libs/fontawesome/css/all.min.css">
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <a href="/" class="brand"><i class="fas fa-link"></i> ShareBin</a>
    </header>

    <main style="align-items: center; justify-content: center; text-align: center; padding: 2rem;">
        <div style="max-width: 400px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b; margin-bottom: 1.5rem;"></i>
            <h2 style="margin: 0 0 1rem; font-weight: 600;">Something went wrong</h2>
            <p style="color: var(--fg); opacity: 0.7; margin-bottom: 2rem; line-height: 1.6;">${escapeHtml(message)}</p>
            <a href="/" class="btn" style="text-decoration: none;">
                <i class="fas fa-arrow-left" style="margin-right: 8px;"></i> Go Home
            </a>
        </div>
    </main>
</body>
</html>`
}

export function renderPage(content: string | null = null, readOnly: boolean = false, language: string = 'plaintext', nonce: string = '', turnstileSiteKey: string = '') {
    const safeLanguage = sanitizeLanguage(language);
    const safeLanguageJson = safeLanguage.replace(/"/g, '\\"');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ShareBin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">

  <!-- Performance Hints -->
  <!-- <link rel="preconnect" href="https://cdn.bootcdn.net"> --> <!-- Removed CDN -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">

  <!-- Fonts -->
  <link rel="stylesheet" href="/fonts.css">
  <link rel="stylesheet" href="/libs/fontawesome/css/all.min.css">

  <!-- CodeMirror CSS -->
  <link rel="stylesheet" href="/libs/codemirror/lib/codemirror.min.css">
  <link rel="stylesheet" href="/libs/codemirror/theme/xq-light.min.css">
  <link rel="stylesheet" href="/libs/codemirror/theme/material-palenight.min.css">

  <!-- Prism CSS (Auto-switch based on system preference) -->
  <link rel="stylesheet" href="/libs/prism/themes/prism.min.css" media="(prefers-color-scheme: light)">
  <link rel="stylesheet" href="/libs/prism/themes/prism-tomorrow.min.css" media="(prefers-color-scheme: dark)">
  <link rel="stylesheet" href="/libs/prism/plugins/line-numbers/prism-line-numbers.min.css">
  <style nonce="${nonce}">
    /* Dark mode override for line numbers plugin */
    @media (prefers-color-scheme: dark) {
        .line-numbers .line-numbers-rows { border-right-color: #444 !important; }
        .line-numbers-rows > span:before { color: #666 !important; }
    }

    /* Turnstile widget styles */
    .cf-turnstile {
        margin-bottom: 1rem;
    }

    /* Captcha Modal */
    .modal-overlay {
        display: none;
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 2000;
        align-items: center; justify-content: center;
        backdrop-filter: blur(4px);
    }
    .modal-overlay.visible { display: flex; }
    .modal-box {
        background: #1e1e1e;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
        max-width: 350px;
        width: 90%;
        text-align: center;
        border: 1px solid #333;
    }
    .modal-box h3 { margin: 0 0 0.5rem 0; color: #fff; font-size: 1.25rem; }
    .modal-box p { color: #888; margin-bottom: 1.5rem; font-size: 0.9rem; }
    #turnstile-container { display: flex; justify-content: center; min-height: 65px; }
    .modal-actions { margin-top: 1rem; }
    .btn-link { background: transparent; border: none; color: #666; cursor: pointer; text-decoration: underline; font-size: 0.8rem; }
    .btn-link:hover { color: #999; }
  </style>

  <!-- Custom Styles -->
  <link rel="stylesheet" href="/style.css">
</head>
<body>

  <header>
    <a href="/" class="brand"><i class="fas fa-link"></i> ShareBin</a>
    <div class="meta">
        ${readOnly ?
            '<span><i class="far fa-clock"></i> Expires in 3 days</span>' :
            `<div class="lang-select-wrapper">
               <input type="text" id="language-input" class="lang-input" list="language-list" autocomplete="off">
               <datalist id="language-list">
                 <!-- Dynamically populated -->
               </datalist>
               <i class="fas fa-search input-icon"></i>
             </div>
             <span class="divider">|</span>
             <span><i class="fas fa-bolt"></i> Auto-detect</span>`
        }
    </div>
  </header>

  <main>
    ${readOnly ?
      `<div id="viewer-container">
          <button id="copy-code-btn" class="copy-code-btn"><i class="far fa-copy"></i> Copy</button>
          <pre class="line-numbers"><code class="language-${safeLanguage}">${escapeHtml(content || '')}</code></pre>
       </div>`
      :
      `<div id="editor-wrapper">
         <div id="editor-container"></div>
       </div>
       <div class="controls">
         <div id="type-indicator" class="status-indicator">Code Snippet</div>
         <button id="save-btn" class="btn">Share <i class="fas fa-paper-plane" style="margin-left:8px"></i></button>
       </div>
       
       <!-- Captcha Modal -->
       <div id="captcha-modal" class="modal-overlay">
           <div class="modal-box">
               <h3>Verification</h3>
               <p>Please complete the security check to share.</p>
               <div id="turnstile-container"></div>
               <div class="modal-actions">
                   <button id="cancel-captcha-btn" class="btn-link">Cancel</button>
               </div>
           </div>
       </div>`
    }

    <div id="result-overlay">
       <div class="result-box">
         <h3><i class="fas fa-check-circle" style="color: #4CAF50;"></i> Ready to Share</h3>
         <div class="link-display" id="share-link">...</div>
         <p style="font-size: 0.8rem; color: #666; margin-bottom: 1rem;"><i class="far fa-clock"></i> Link expires in 3 days</p>
         <div class="action-row">
             <button id="copy-link-btn" class="btn">Copy Link</button>
             <button id="create-new-btn" class="btn" style="background:transparent; color:#666; border-color:transparent; box-shadow:none;">Create New</button>
         </div>
       </div>
    </div>

    <div id="toast" class="toast"><i class="fas fa-check"></i> Link Copied!</div>
  </main>

  <!-- Prism Core & Autoloader -->
  <script src="/libs/prism/components/prism-core.min.js"></script>
  <script src="/libs/prism/plugins/autoloader/prism-autoloader.min.js"></script>
  <script src="/libs/prism/plugins/line-numbers/prism-line-numbers.min.js"></script>

  <!-- CodeMirror Libs -->
  <!-- Local Libs -->
  <script src="/libs/tensorflow/tf.min.js"></script>
  <script src="/libs/codemirror/lib/codemirror.min.js"></script>
  <script src="/libs/codemirror/addon/edit/matchbrackets.min.js"></script>
  <script src="/libs/codemirror/addon/edit/closebrackets.min.js"></script>
  <script src="/libs/codemirror/addon/selection/active-line.min.js"></script>

  <!-- App Config -->
  <script nonce="${nonce}">
    window.APP_CONFIG = {
        readOnly: ${readOnly},
        language: "${safeLanguageJson}",
        turnstileSiteKey: "${turnstileSiteKey}"
    };
  </script>

  <!-- Turnstile -->
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer nonce="${nonce}"></script>

  <!-- Main Script -->
  <script src="/script.js"></script>
</body>
</html>
  `
}