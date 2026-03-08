import { ALLOWED_LANGUAGES } from './languages'

// --- Configuration ---

const CDN_BASE = "https://npm.webcache.cn";
const FONTS_BASE = "https://fonts.googleapis.com/css2";

const SRI = {
    fontAwesome: "sha256-wiz7ZSCn/btzhjKDQBms9Hx4sSeUYsDrTLg7roPstac=",
    cmCss: "sha256-60lOqXLSZh74b39qxlbdZ4bXIeScnBtG4euWfktvm/M=",
    cmJs: "sha256-jotePMS+dTCptrYkvOlf+WbNZnKDAFoQNzn+N9O92Xw=",
    cmThemeLight: "sha256-KWl1QR5Q0aRIVE3Y0JUD4B6h48uRxo9QcYLCA4swLTk=",
    cmThemeDark: "sha256-IrWPRgJrN/8W3h03+aP+ttWvajUK21zJMfKagf6hvcc=",
    cmMatchBrackets: "sha256-nSOhd/Hk0H46zDfCEP++TBwutNVbvlTBbT5609BNBAE=",
    cmCloseBrackets: "sha256-FDwwFMKSVPNTHMML5tkCBQhLz8Ns/6b5sqRv1CpAviA=",
    cmActiveLine: "sha256-OvvPeINcm9w0LjmSxT2bdChnImE7saitydFA7chzfug=",
    prismJs: "sha256-uAFFHZtMvxhXcVqX7K5ELibBEbq24Z/uDoPf2nDMKQA=",
    prismCssLight: "sha256-ko4j5rn874LF8dHwW29/xabhh8YBleWfvxb8nQce4Fc=",
    prismCssDark: "sha256-GxX+KXGZigSK67YPJvbu12EiBx257zuZWr0AMiT1Kpg=",
    prismAutoloader: "sha256-AjM0J5XIbiB590BrznLEgZGLnOQWrt62s3BEq65Q/I0=",
    prismLineNumbersJs: "sha256-9cmf7tcLdXpKsPi/2AWE93PbZpTp4M4tqzFk+lWomjU=",
    prismLineNumbersCss: "sha256-4CROCOz16nRjanuxMghkzZzCOdmwLXxFqCMCW7XG/lA=",
    markdownCss: "sha256-+HSOpaIGcmAADi/gu0gQiTIgcgzYEy+b044W1DeUPZE=",
    markedJs: "sha256-0Gqqc6qDjaGiCel1fQ9L/svzu+lFgZccwKICNTpRE38=",
    dompurifyJs: "sha256-o4dmiN/9oJkRdegv9EfbqViVvMcC9TiNBP+qYkD0OrI="
};

const ASSETS = {
    fonts: `${FONTS_BASE}?family=Inter:wght@300..600&family=JetBrains+Mono:wght@400..500&display=swap`,
    icons: { url: `${CDN_BASE}/@fortawesome/fontawesome-free@6.5.1/css/all.min.css`, integrity: SRI.fontAwesome },
    codemirror: {
        css: { url: `${CDN_BASE}/codemirror@5.65.20/lib/codemirror.css`, integrity: SRI.cmCss },
        themeLight: { url: `${CDN_BASE}/codemirror@5.65.20/theme/xq-light.css`, integrity: SRI.cmThemeLight },
        themeDark: { url: `${CDN_BASE}/codemirror@5.65.20/theme/material-palenight.css`, integrity: SRI.cmThemeDark },
        js: { url: `${CDN_BASE}/codemirror@5.65.20/lib/codemirror.js`, integrity: SRI.cmJs },
        addons: [
            { url: `${CDN_BASE}/codemirror@5.65.20/addon/edit/matchbrackets.js`, integrity: SRI.cmMatchBrackets },
            { url: `${CDN_BASE}/codemirror@5.65.20/addon/edit/closebrackets.js`, integrity: SRI.cmCloseBrackets },
            { url: `${CDN_BASE}/codemirror@5.65.20/addon/selection/active-line.js`, integrity: SRI.cmActiveLine }
        ]
    },
    prism: {
        cssLight: { url: `${CDN_BASE}/prismjs@1.30.0/themes/prism.min.css`, integrity: SRI.prismCssLight },
        cssDark: { url: `${CDN_BASE}/prismjs@1.30.0/themes/prism-tomorrow.min.css`, integrity: SRI.prismCssDark },
        cssLineNumbers: { url: `${CDN_BASE}/prismjs@1.30.0/plugins/line-numbers/prism-line-numbers.min.css`, integrity: SRI.prismLineNumbersCss },
        js: { url: `${CDN_BASE}/prismjs@1.30.0/prism.js`, integrity: SRI.prismJs },
        autoloader: { url: `${CDN_BASE}/prismjs@1.30.0/plugins/autoloader/prism-autoloader.min.js`, integrity: SRI.prismAutoloader },
        lineNumbers: { url: `${CDN_BASE}/prismjs@1.30.0/plugins/line-numbers/prism-line-numbers.min.js`, integrity: SRI.prismLineNumbersJs }
    },
    markdown: {
        css: { url: `${CDN_BASE}/github-markdown-css@5.5.1/github-markdown.min.css`, integrity: SRI.markdownCss },
        js: { url: `${CDN_BASE}/marked@12.0.1/lib/marked.umd.js`, integrity: SRI.markedJs },
        purify: { url: `${CDN_BASE}/dompurify@3.0.9/dist/purify.min.js`, integrity: SRI.dompurifyJs }
    },
    katex: {
        css: { url: `${CDN_BASE}/katex@0.16.11/dist/katex.min.css` },
        js: { url: `${CDN_BASE}/katex@0.16.11/dist/katex.min.js` },
        autoRender: { url: `${CDN_BASE}/katex@0.16.11/dist/contrib/auto-render.min.js` }
    },
    flourite: { url: `${CDN_BASE}/flourite@1.3.0/dist/index.iife.js` },
    turnstile: "https://challenges.cloudflare.com/turnstile/v0/api.js"
};

function sanitizeLanguage(lang: string): string {
    if (!lang || typeof lang !== 'string') return 'plaintext';
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

function renderStyles(nonce: string) {
    const cssAssets = [
        { url: ASSETS.fonts },
        { url: ASSETS.icons.url, integrity: ASSETS.icons.integrity },
        { url: ASSETS.codemirror.css.url, integrity: ASSETS.codemirror.css.integrity },
        { url: ASSETS.codemirror.themeLight.url, integrity: ASSETS.codemirror.themeLight.integrity },
        { url: ASSETS.codemirror.themeDark.url, integrity: ASSETS.codemirror.themeDark.integrity },
        { url: ASSETS.prism.cssLight.url, integrity: ASSETS.prism.cssLight.integrity, media: "(prefers-color-scheme: light)" },
        { url: ASSETS.prism.cssDark.url, integrity: ASSETS.prism.cssDark.integrity, media: "(prefers-color-scheme: dark)" },
        { url: ASSETS.prism.cssLineNumbers.url, integrity: ASSETS.prism.cssLineNumbers.integrity },
        { url: ASSETS.markdown.css.url, integrity: ASSETS.markdown.css.integrity },
        { url: ASSETS.katex.css.url },
    ];

    const links = cssAssets.map(asset => {
        const integrity = asset.integrity ? ` integrity="${asset.integrity}" crossorigin="anonymous" referrerpolicy="no-referrer-when-downgrade"` : '';
        const media = asset.media ? ` media="${asset.media}"` : '';
        return `<link rel="stylesheet" href="${asset.url}"${integrity}${media}>`;
    }).join('\n    ');

    return `
    ${links}
    <link rel="stylesheet" href="/style.css">
    <style nonce="${nonce}">
        @media (prefers-color-scheme: dark) {
            .line-numbers .line-numbers-rows { border-right-color: #444 !important; }
            .line-numbers-rows > span:before { color: #666 !important; }
            .markdown-body { 
                background-color: var(--bg) !important; 
                color: var(--fg) !important; 
            }
            .markdown-body pre {
                background-color: transparent !important;
                color: inherit !important;
            }
            .markdown-body blockquote {
                color: #8b949e;
                border-left-color: #30363d;
            }
            .markdown-body table tr {
                background-color: var(--bg);
                border-top-color: #30363d;
            }
            .markdown-body table tr:nth-child(2n) {
                background-color: rgba(255,255,255,0.02);
            }
            .markdown-body table td, .markdown-body table th {
                border-color: #30363d;
            }
            .markdown-body h1, .markdown-body h2 {
                border-bottom-color: #30363d;
            }
        }
        .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
            background-color: var(--bg) !important;
            color: var(--fg) !important;
        }
        @media (max-width: 767px) {
            .markdown-body {
                padding: 15px;
            }
        }
        .cf-turnstile { margin-bottom: 1rem; }
        .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .modal-overlay.visible { display: flex; }
        .modal-box { background: #1e1e1e; padding: 2rem; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); max-width: 350px; width: 90%; text-align: center; border: 1px solid #333; }
        .modal-box h3 { margin: 0 0 0.5rem 0; color: #fff; font-size: 1.25rem; }
        .modal-box p { color: #888; margin-bottom: 1.5rem; font-size: 0.9rem; }
        #turnstile-container { display: flex; justify-content: center; min-height: 65px; }
        .modal-actions { margin-top: 1rem; }
        .btn-link { background: transparent; border: none; color: #666; cursor: pointer; text-decoration: underline; font-size: 0.8rem; }
        .btn-link:hover { color: #999; }
    </style>`;
}

function renderScripts(readOnly: boolean, safeLanguageJson: string, turnstileSiteKey: string, nonce: string) {
    const jsAssets: Array<{ url: string; integrity?: string }> = [
        { url: ASSETS.prism.js.url, integrity: ASSETS.prism.js.integrity },
        { url: ASSETS.prism.autoloader.url, integrity: ASSETS.prism.autoloader.integrity },
        { url: ASSETS.prism.lineNumbers.url, integrity: ASSETS.prism.lineNumbers.integrity },
        { url: ASSETS.markdown.js.url, integrity: ASSETS.markdown.js.integrity },
        { url: ASSETS.markdown.purify.url, integrity: ASSETS.markdown.purify.integrity },
        { url: ASSETS.katex.js.url },
        { url: ASSETS.katex.autoRender.url },
        { url: ASSETS.flourite.url },
        { url: ASSETS.codemirror.js.url, integrity: ASSETS.codemirror.js.integrity },
        ...ASSETS.codemirror.addons
    ];

    const scripts = jsAssets.map(asset => {
        const integrityAttr = asset.integrity ? ` integrity="${asset.integrity}" crossorigin="anonymous" referrerpolicy="no-referrer-when-downgrade"` : '';
        return `<script src="${asset.url}"${integrityAttr} nonce="${nonce}"></script>`;
    }).join('\n    ');

    return `
    <!-- Libraries -->
    ${scripts}

    <!-- Config -->
    <script nonce="${nonce}">
        window.APP_CONFIG = {
            readOnly: ${readOnly},
            language: "${safeLanguageJson}",
            turnstileSiteKey: ${JSON.stringify(turnstileSiteKey || "")}
        };
    </script>
    <script src="${ASSETS.turnstile}" async defer nonce="${nonce}"></script>
    <script src="/script.js" nonce="${nonce}"></script>`;
}

// --- Main Renderers ---

function renderLayout(options: {
    title: string,
    nonce: string,
    content: string,
    headerMeta?: string,
    scripts?: string,
    styles?: string,
    mainStyle?: string
}) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>ShareBin - ${options.title}</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    ${options.styles || ''}
</head>
<body>
    <header>
        <a href="/" class="brand"><i class="fas fa-link"></i> ShareBin</a>
        ${options.headerMeta ? `<div class="meta">${options.headerMeta}</div>` : ''}
    </header>
    <main ${options.mainStyle ? `style="${options.mainStyle}"` : ''}>
        ${options.content}
    </main>
    ${options.scripts || ''}
</body>
</html>`;
}

export function renderError(message: string, nonce: string = '') {
    const content = `
        <div style="max-width: 400px; margin: 0 auto;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b; margin-bottom: 1.5rem;"></i>
            <h2 style="margin: 0 0 1rem; font-weight: 600;">Something went wrong</h2>
            <p style="color: var(--fg); opacity: 0.7; margin-bottom: 2rem; line-height: 1.6;">${escapeHtml(message)}</p>
            <a href="/" class="btn" style="text-decoration: none;">
                <i class="fas fa-arrow-left" style="margin-right: 8px;"></i> Go Home
            </a>
        </div>`;

    return renderLayout({
        title: 'Error',
        nonce,
        content,
        styles: `
            <link rel="stylesheet" href="${ASSETS.fonts}">
            <link rel="stylesheet" href="${ASSETS.icons.url}" integrity="${ASSETS.icons.integrity}" crossorigin="anonymous">
            <link rel="stylesheet" href="/style.css">`,
        mainStyle: 'align-items: center; justify-content: center; text-align: center; padding: 2rem; display: flex;'
    });
}

export function renderPage(
    content: string | null = null,
    readOnly: boolean = false,
    language: string = 'plaintext',
    nonce: string = '',
    turnstileSiteKey: string = '',
    expirationDate: string | null = null
) {
    const safeLanguage = sanitizeLanguage(language);
    const safeLanguageJson = safeLanguage.replace(/"/g, '\\\\"');

    const headerContent = readOnly ?
        `<div style="display: flex; gap: 1rem; align-items: center;">
            <div class="viewer-controls" style="display:flex; gap:0.5rem;">
                ${safeLanguage === 'markdown' ? `<button id="preview-btn" class="copy-code-btn" style="position:static; margin:0;"><i class="fas fa-code"></i> Source</button>` : ''}
                <button id="copy-code-btn" class="copy-code-btn" style="position:static; margin:0;"><i class="far fa-copy"></i> Copy</button>
            </div>
            <span><i class="far fa-clock"></i> Expires in ${expirationDate || '7 d'}</span>
         </div>` :
        `<div class="lang-select-wrapper">
           <input type="text" id="language-input" class="lang-input" list="language-list" autocomplete="off">
           <datalist id="language-list"></datalist>
           <i class="fas fa-search input-icon"></i>
         </div>
         <span class="divider">|</span>
         <button id="editor-preview-btn" class="copy-code-btn" style="position:static; margin:0; display:none;"><i class="fas fa-eye"></i> Preview</button>`;

    const mainContent = readOnly ?
        `<div id="viewer-container">
            <pre class="line-numbers" style="${safeLanguage === 'markdown' ? 'display:none;' : ''}"><code class="language-${safeLanguage}">${escapeHtml(content || '')}</code></pre>
            <div id="markdown-preview" class="markdown-body" style="${safeLanguage === 'markdown' ? 'display:block;' : 'display:none;'}"></div>
         </div>` :
        `<div id="editor-wrapper">
           <div id="editor-container"></div>
         </div>
         <div id="editor-markdown-preview" class="markdown-body" style="display:none; flex:1; width:100%; overflow:auto;"></div>
         <div class="controls" id="editor-controls">
           <div id="type-indicator" class="status-indicator">Code Snippet</div>
           <button id="save-btn" class="btn">Share <i class="fas fa-paper-plane" style="margin-left:8px"></i></button>
         </div>
         <div id="captcha-modal" class="modal-overlay">
             <div class="modal-box">
                 <h3>Verification</h3>
                 <p>Please complete the security check to share.</p>
                 <div id="turnstile-container"></div>
                 <div class="modal-actions">
                     <button id="cancel-captcha-btn" class="btn-link">Cancel</button>
                 </div>
             </div>
         </div>`;

    const contentFinal = `
        ${mainContent}
        <div id="result-overlay">
           <div class="result-box">
             <h3><i class="fas fa-check-circle" style="color: #4CAF50;"></i> Ready to Share</h3>
             <div class="link-display" id="share-link">...</div>
             <p style="font-size: 0.8rem; color: #666; margin-bottom: 1rem;"><i class="far fa-clock"></i> Link expires in 7 days</p>
             <div class="action-row">
                 <button id="copy-link-btn" class="btn">Copy Link</button>
                 <button id="create-new-btn" class="btn" style="background:transparent; color:#666; border-color:transparent; box-shadow:none;">Create New</button>
             </div>
           </div>
        </div>
        <div id="toast" class="toast"><i class="fas fa-check"></i> Link Copied!</div>`;

    return renderLayout({
        title: 'Share Code',
        nonce,
        content: contentFinal,
        headerMeta: headerContent,
        styles: renderStyles(nonce),
        scripts: renderScripts(readOnly, safeLanguageJson, turnstileSiteKey, nonce),
        mainStyle: 'background: var(--bg);'
    });
}
