document.addEventListener('DOMContentLoaded', async () => {
    const config = window.APP_CONFIG || { readOnly: false };
    const isReadOnly = config.readOnly;

    // --- Prism Adapter for CodeMirror 5 ---
    if (typeof CodeMirror !== 'undefined' && typeof Prism !== 'undefined') {
        CodeMirror.defineMode("prism", function (config, parserConfig) {
            return {
                startState: function () {
                    return { tokens: [], index: 0 };
                },
                token: function (stream, state) {
                    if (state.tokens.length === 0 || state.index >= state.tokens.length) {
                        if (stream.pos === 0) {
                            const line = stream.string;
                            const lang = parserConfig.language;
                            const grammar = Prism.languages[lang];
                            if (grammar) {
                                try {
                                    const prismTokens = Prism.tokenize(line, grammar);
                                    state.tokens = flattenPrismTokens(prismTokens);
                                } catch (e) {
                                    state.tokens = [{ content: line, type: null }];
                                }
                            } else {
                                state.tokens = [{ content: line, type: null }];
                            }
                            state.index = 0;
                        } else {
                            stream.skipToEnd();
                            return null;
                        }
                    }
                    const token = state.tokens[state.index++];
                    if (stream.match(token.content)) {
                        return token.type;
                    } else {
                        stream.next(); // Sync error fallback
                        return null;
                    }
                }
            };
        });

        function flattenPrismTokens(tokens, typePrefix = '') {
            let res = [];
            for (let t of tokens) {
                if (typeof t === 'string') {
                    res.push({ content: t, type: typePrefix || null });
                } else {
                    let cmType = t.type;
                    if (t.type === 'function') cmType = 'def';
                    else if (t.type === 'class-name') cmType = 'variable-2';
                    else if (t.type === 'builtin') cmType = 'builtin';

                    if (Array.isArray(t.content)) {
                        res = res.concat(flattenPrismTokens(t.content, cmType));
                    } else {
                        res.push({ content: t.content, type: cmType });
                    }
                }
            }
            return res;
        }
    }

    // --- Configuration for Dynamic Loading via CDN ---
    if (typeof Prism !== 'undefined' && Prism.plugins.autoloader) {
        Prism.plugins.autoloader.languages_path = 'https://npm.webcache.cn/prismjs@1.30.0/components/';
    }

    const FLOURITE_TO_PRISM = {
        'html': 'markup',
        'dockerfile': 'docker',
        'csharp': 'csharp',
        'javascript': 'javascript',
        'typescript': 'typescript',
        'markdown': 'markdown',
        'bash': 'bash',
        'shell': 'bash'
    };

    async function detectLanguage(fullCode) {
        if (!fullCode || typeof flourite === 'undefined') return null;

        try {
            const result = flourite(fullCode, { shiki: true, noUnknown: true });
            if (result && result.language && result.language !== 'Unknown') {
                const id = result.language.toLowerCase();
                const mapped = FLOURITE_TO_PRISM[id] || id;
                console.log(`Flourite Detected: ${result.language} -> ${mapped}`);
                return mapped;
            }
        } catch (e) { console.error("Flourite Detection Error:", e); }
        return null;
    }

    // --- State & Data ---
    let validLanguages = new Set(['plaintext']);
    let languageMap = {};
    let isManualSelection = false;
    let allPrismLanguages = new Set();
    let detectTimer = null; // Module-scoped variable

    function setEditorMode(editor, lang) {
        const editorPreviewBtn = document.getElementById('editor-preview-btn');
        if (editorPreviewBtn) {
            if (lang === 'markdown') {
                editorPreviewBtn.style.display = 'flex';
            } else {
                editorPreviewBtn.style.display = 'none';
                if (window.isEditorPreview && editorPreviewBtn.click) {
                    editorPreviewBtn.click();
                }
            }
        }

        if (!lang || lang === 'plaintext' || lang === 'null') {
            editor.setOption('mode', 'null');
            return;
        }
        if (Prism.languages[lang]) {
            editor.setOption('mode', { name: 'prism', language: lang });
        } else {
            Prism.plugins.autoloader.loadLanguages(lang, () => {
                editor.setOption('mode', { name: 'prism', language: lang });
            });
        }
    }

    async function loadPrismLanguages(dataList) {
        try {
            const res = await fetch('https://npm.webcache.cn/prismjs@1.30.0/components.json');
            const json = await res.json();
            const languages = json.languages;

            if (dataList) {
                dataList.innerHTML = '';
                const ptOpt = document.createElement('option');
                ptOpt.value = 'plaintext';
                dataList.appendChild(ptOpt);
            }

            Object.keys(languages).forEach(key => {
                if (key === 'meta') return;
                const lang = languages[key];
                validLanguages.add(key);
                allPrismLanguages.add(key);
                languageMap[key] = key;

                if (lang.alias) {
                    const aliases = Array.isArray(lang.alias) ? lang.alias : [lang.alias];
                    aliases.forEach(a => {
                        validLanguages.add(a);
                        allPrismLanguages.add(key);
                        languageMap[a] = key;
                    });
                }

                if (dataList) {
                    const opt = document.createElement('option');
                    opt.value = key;
                    dataList.appendChild(opt);
                }
            });
        } catch (e) { console.error("Lang load failed", e); }
    }

    function validateLanguage(lang) {
        if (!lang || typeof lang !== 'string') {
            return 'plaintext';
        }
        const normalized = lang.toLowerCase().trim();
        return allPrismLanguages.has(normalized) ? normalized : 'plaintext';
    }

    function showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.innerHTML = isError ? `<i class="fas fa-exclamation-circle"></i> ${message}` : message;
        toast.classList.toggle('error', isError);
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    if (!isReadOnly) {
        const editorContainer = document.getElementById('editor-container');
        const typeIndicator = document.getElementById('type-indicator');
        const langInput = document.getElementById('language-input');
        const dataList = document.getElementById('language-list');
        const saveBtn = document.getElementById('save-btn');
        let editor;

        if (editorContainer) {
            // Check system dark mode
            const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const getTheme = () => darkModeMediaQuery.matches ? 'material-palenight' : 'xq-light';

            editor = CodeMirror(editorContainer, {
                mode: 'null',
                theme: getTheme(),
                lineNumbers: true,
                styleActiveLine: true,
                matchBrackets: true,
                autoCloseBrackets: true,
                lineWrapping: true,
                autofocus: true,
                viewportMargin: Infinity,
                indentUnit: 4,
                tabSize: 4
            });

            // Listen for theme changes
            darkModeMediaQuery.addEventListener('change', (e) => {
                editor.setOption('theme', e.matches ? 'material-palenight' : 'xq-light');
            });

            // Focus wrapper click
            const wrapper = document.getElementById('editor-wrapper');
            if (wrapper) {
                wrapper.addEventListener('click', (e) => {
                    if (e.target === wrapper || e.target === editorContainer) {
                        editor.focus();
                        const line = editor.lineCount();
                        editor.setCursor(line - 1, editor.getLine(line - 1).length);
                    }
                });
            }

            // Keyboard Shortcuts
            editor.setOption('extraKeys', {
                'Ctrl-Enter': () => saveBtn?.click(),
                'Cmd-Enter': () => saveBtn?.click(),
                'Tab': (cm) => {
                    if (cm.somethingSelected()) {
                        cm.indentSelection('add');
                    } else {
                        cm.replaceSelection(cm.getOption('indentWithTabs') ? '\t' : 
                            Array(cm.getOption('indentUnit') + 1).join(' '), 'end', '+input');
                    }
                },
                'Shift-Tab': (cm) => cm.indentSelection('subtract')
            });

            loadPrismLanguages(dataList);

            if (langInput) {
                let debounceTimer;
                langInput.addEventListener('input', (e) => {
                    isManualSelection = true;
                    const val = e.target.value.trim();
                    if (!val) isManualSelection = false;

                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        const inputVal = val.toLowerCase();
                        if (validLanguages.has(inputVal)) {
                            setEditorMode(editor, languageMap[inputVal] || inputVal);
                        } else if (!inputVal || inputVal === 'plaintext') {
                            editor.setOption('mode', 'null');
                        }
                    }, 300);
                });
                langInput.addEventListener('focus', () => langInput.select());
            }

            editor.on('change', () => {
                const content = editor.getValue().trim();

                // URL Detection
                if (!content) {
                    typeIndicator.classList.remove('visible');
                    return;
                }

                const isUrl = /^(http|https):\/\/[^ "]+$/.test(content);
                if (isUrl) {
                    typeIndicator.textContent = 'Link Redirect';
                    typeIndicator.classList.add('visible');
                    return;
                }

                typeIndicator.textContent = 'Code Snippet';
                typeIndicator.classList.add('visible');

                if (!isManualSelection && langInput) {
                    clearTimeout(detectTimer);
                    detectTimer = setTimeout(async () => {
                        console.log("Detecting language for content length:", content.length);
                        const detected = await detectLanguage(content);
                        if (detected && detected !== langInput.value) {
                            langInput.value = detected;
                            setEditorMode(editor, detected);
                        }
                    }, 500);
                }
            });

            // Initialize Turnstile widget with polling
            let turnstileWidgetId = null;
            let isWaitingForCaptcha = false;
            const turnstileContainer = document.getElementById('turnstile-container');
            const captchaModal = document.getElementById('captcha-modal');
            const cancelCaptchaBtn = document.getElementById('cancel-captcha-btn');

            function initTurnstile() {
                if (!turnstileContainer) return;

                if (window.turnstile) {
                    if (turnstileWidgetId !== null) return;
                    turnstileWidgetId = turnstile.render('#turnstile-container', {
                        sitekey: window.APP_CONFIG.turnstileSiteKey || '',
                        callback: async function (token) {
                            if (isWaitingForCaptcha && captchaModal && captchaModal.classList.contains('visible')) {
                                console.log('Captcha success, submitting...');
                                isWaitingForCaptcha = false; // Reset flag
                                submitSnippet(token);
                            }
                        },
                        'error-callback': function () {
                            console.error('Turnstile failed');
                            isWaitingForCaptcha = false;
                        }
                    });
                } else {
                    setTimeout(initTurnstile, 100);
                }
            }

            initTurnstile();

            if (cancelCaptchaBtn) {
                cancelCaptchaBtn.addEventListener('click', () => {
                    isWaitingForCaptcha = false;
                    captchaModal.classList.remove('visible');
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = 'Share <i class="fas fa-paper-plane" style="margin-left:8px"></i>';
                });
            }

            // ... (submitSnippet remains similar but we'll reset flag inside)


            saveBtn?.addEventListener('click', async () => {
                const content = editor.getValue();
                if (!content.trim()) return;

                // Client-side Size Limit Check
                const MAX_SIZE = 100 * 1024;
                if (content.length > MAX_SIZE) {
                    showToast('Content too large (Max 100KB)', true);
                    return;
                }

                saveBtn.disabled = true;
                saveBtn.innerHTML = 'Saving... <i class="fas fa-spinner fa-spin"></i>';

                // --- Optimistic Submission (Try without token first) ---
                try {
                    const res = await fetch('/api/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            content,
                            type: /^(http|https):\/\/[^ "]+$/.test(content.trim()) ? 'url' : 'code',
                            language: validateLanguage(langInput?.value)
                        })
                    });

                    if (res.status === 403) {
                        const data = await res.json();
                        if (data.code === 'CAPTCHA_REQUIRED') {
                            // Need verification
                            saveBtn.innerHTML = 'Verifying... <i class="fas fa-shield-alt fa-spin"></i>';
                            if (!window.turnstile || turnstileWidgetId === null) {
                                showToast('Security check loading, please wait...', true);
                                saveBtn.disabled = false;
                                saveBtn.innerHTML = 'Share <i class="fas fa-paper-plane" style="margin-left:8px"></i>';
                                return;
                            }
                            isWaitingForCaptcha = true;
                            window.turnstile.reset(turnstileWidgetId);
                            captchaModal.classList.add('visible');
                            return; // Stop here, callback will resume
                        }
                    }

                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        throw new Error(errorData.error || res.statusText);
                    }

                    // Success! Handle result
                    const data = await res.json();
                    handleSuccess(data.id);

                } catch (e) {
                    showToast('Error: ' + e.message, true);
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = 'Share <i class="fas fa-paper-plane" style="margin-left:8px"></i>';
                }
            });

            function handleSuccess(id) {
                const link = window.location.origin + '/' + id;
                document.getElementById('share-link').textContent = link;
                const overlay = document.getElementById('result-overlay');
                overlay.style.display = 'flex';
                void overlay.offsetWidth; // Force reflow
                overlay.classList.add('visible');

                const closeHandler = (e) => {
                    if (e.type === 'keydown' && e.key !== 'Escape') return;
                    if (e.type === 'click' && e.target.closest('.result-box')) return;
                    location.reload();
                };
                document.addEventListener('keydown', closeHandler);
                overlay.addEventListener('click', closeHandler);
            }

            async function submitSnippet(turnstileToken) {
                const content = editor.getValue();
                const isUrl = /^(http|https):\/\/[^ "]+$/.test(content.trim());
                const type = isUrl ? 'url' : 'code';
                let language = validateLanguage(langInput?.value);

                captchaModal.classList.remove('visible');

                try {
                    const res = await fetch('/api/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content, type, language, 'cf-turnstile-response': turnstileToken })
                    });

                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        throw new Error(errorData.error || res.statusText);
                    }

                    const data = await res.json();
                    if (data.id) {
                        handleSuccess(data.id);
                    }
                } catch (e) {
                    showToast('Error: ' + e.message, true);
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = 'Share <i class="fas fa-paper-plane" style="margin-left:8px"></i>';
                    if (turnstileWidgetId !== null && window.turnstile) {
                        window.turnstile.reset(turnstileWidgetId);
                    }
                }
            }
        }
    }

    // --- CSP-Compliant Event Listeners ---
    const copyCodeBtn = document.getElementById('copy-code-btn');
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', () => {
            const code = document.querySelector('code');
            if (code) {
                navigator.clipboard.writeText(code.innerText).then(() => {
                    const toast = document.getElementById('toast');
                    toast.innerHTML = '<i class="fas fa-code"></i> Code Copied!';
                    toast.classList.add('show');
                    setTimeout(() => toast.classList.remove('show'), 2000);
                });
            }
        });
    }

    // --- Export to Image Logic ---
    function loadHtml2Canvas() {
        return new Promise((resolve, reject) => {
            if (typeof html2canvas !== 'undefined') { resolve(html2canvas); return; }
            const script = document.createElement('script');
            // strictly domestic CDN fully compliant with CSP & user rules
            script.src = 'https://npm.webcache.cn/html2canvas@1.4.1/dist/html2canvas.min.js';
            script.onload = () => resolve(html2canvas);
            script.onerror = () => reject(new Error('Failed to load html2canvas'));
            document.head.appendChild(script);
        });
    }

    async function exportCodeToImage({ codeContent, language, exportBtn }) {
        exportBtn.disabled = true;
        const oHtml = exportBtn.innerHTML;
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';

        try {
            await loadHtml2Canvas();

            // Create temporary structure off-screen for syntax highlighting
            const tempDiv = document.createElement('div');
            tempDiv.className = 'markdown-body'; // Just a wrapper
            tempDiv.style.position = 'fixed';
            tempDiv.style.top = '-99999px';
            tempDiv.style.left = '-99999px';

            const preEl = document.createElement('pre');
            preEl.className = 'language-' + language;

            const codeEl = document.createElement('code');
            codeEl.className = 'language-' + language;
            codeEl.textContent = codeContent;

            preEl.appendChild(codeEl);
            tempDiv.appendChild(preEl);
            document.body.appendChild(tempDiv);

            // Highlight code with Prism if available
            if (typeof Prism !== 'undefined') {
                Prism.highlightElement(codeEl);
            }

            // Measure natural text width (no wrapping)
            const measurer = document.createElement('div');
            Object.assign(measurer.style, {
                position: 'fixed', top: '-99999px', left: '-99999px',
                whiteSpace: 'pre', width: 'max-content', maxWidth: 'none',
                visibility: 'hidden',
                fontFamily: getComputedStyle(codeEl).fontFamily,
                fontSize: getComputedStyle(codeEl).fontSize,
                lineHeight: getComputedStyle(codeEl).lineHeight
            });
            measurer.textContent = codeContent;
            document.body.appendChild(measurer);
            const naturalWidth = measurer.scrollWidth;
            document.body.removeChild(measurer);

            const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            // Align with site theme colors (lighter/cleaner than previous hardcoded values)
            const bgColor = isDark ? '#292d3e' : '#ffffff';
            const gutterColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
            const dividerColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

            // Compute gutter width based on digit count
            const lineCount = codeContent.split('\n').length;
            const digits = String(lineCount).length;
            const gutterWidth = Math.max(digits * 8 + 12, 32);
            const exportPadding = 24;
            const exportWidth = Math.max(naturalWidth + gutterWidth, 480);
            const totalWidth = exportWidth + exportPadding * 2;

            // Split highlighted HTML into per-line segments
            const highlightedHtml = codeEl.innerHTML;
            const rawLines = highlightedHtml.split('\n');
            if (rawLines[rawLines.length - 1] === '') rawLines.pop();

            const codeFontFamily = getComputedStyle(codeEl).fontFamily;
            const codeFontSize = getComputedStyle(codeEl).fontSize;
            const codeLineHeight = getComputedStyle(codeEl).lineHeight;
            const codeForeground = getComputedStyle(codeEl).color;

            // Outer wrapper — clean solid background, rounded corners
            const wrapper = document.createElement('div');
            Object.assign(wrapper.style, {
                position: 'fixed', top: '-99999px', left: '-99999px',
                width: totalWidth + 'px', minWidth: totalWidth + 'px',
                padding: exportPadding + 'px',
                margin: '0', boxSizing: 'border-box',
                background: bgColor,
                borderRadius: '12px',
                fontFamily: codeFontFamily,
                fontSize: codeFontSize,
                lineHeight: codeLineHeight,
            });

            // Code block container — no extra background, just structure
            const clonedPre = document.createElement('pre');
            Object.assign(clonedPre.style, {
                margin: '0', padding: '0',
                background: 'transparent',
                border: 'none', borderRadius: '0',
                width: '100%',
                boxSizing: 'border-box',
                overflow: 'visible',
                fontFamily: codeFontFamily,
                fontSize: codeFontSize,
                lineHeight: codeLineHeight,
            });

            rawLines.forEach((lineHtml, idx) => {
                const row = document.createElement('div');
                Object.assign(row.style, {
                    display: 'flex',
                    alignItems: 'baseline',
                    minHeight: codeLineHeight,
                    width: '100%',
                });

                // Gutter — transparent bg, thin right divider
                const gutter = document.createElement('span');
                Object.assign(gutter.style, {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    minWidth: gutterWidth + 'px',
                    width: gutterWidth + 'px',
                    paddingRight: '10px',
                    paddingLeft: '0',
                    boxSizing: 'border-box',
                    userSelect: 'none',
                    flexShrink: '0',
                    color: gutterColor,
                    borderRight: '1px solid ' + dividerColor,
                    fontFamily: codeFontFamily,
                    fontSize: codeFontSize,
                    lineHeight: codeLineHeight,
                });
                gutter.textContent = String(idx + 1);

                // Code line
                const lineSpan = document.createElement('code');
                Object.assign(lineSpan.style, {
                    display: 'block',
                    whiteSpace: 'pre',
                    paddingLeft: '12px',
                    paddingRight: '0',
                    flex: '1',
                    fontFamily: codeFontFamily,
                    fontSize: codeFontSize,
                    lineHeight: codeLineHeight,
                    color: codeForeground,
                    background: 'transparent',
                    minHeight: codeLineHeight,
                });
                lineSpan.innerHTML = lineHtml || '&#8203;';

                row.appendChild(gutter);
                row.appendChild(lineSpan);
                clonedPre.appendChild(row);
            });

            wrapper.appendChild(clonedPre);
            document.body.appendChild(wrapper);

            const scale = Math.max(window.devicePixelRatio || 1, 2);
            const canvas = await html2canvas(wrapper, {
                scale, useCORS: true, allowTaint: true,
                backgroundColor: bgColor,
                width: totalWidth, windowWidth: totalWidth + 200
            });

            // Cleanup
            document.body.removeChild(wrapper);
            document.body.removeChild(tempDiv);

            const link = document.createElement('a');
            link.download = 'sharebin-code.png';
            link.href = canvas.toDataURL('image/png');
            link.click();

            showToast('<i class="fas fa-image"></i> Image exported!');
        } catch (e) {
            console.error('Export failed:', e);
            showToast('Export failed: ' + e.message, true);
        } finally {
            exportBtn.disabled = false;
            exportBtn.innerHTML = oHtml;
        }
    }

    // Read-only View Export
    const exportImageBtn = document.getElementById('export-image-btn');
    if (exportImageBtn) {
        exportImageBtn.addEventListener('click', () => {
            const codeEl = document.querySelector('#viewer-container code');
            if (!codeEl) { showToast('Nothing to export', true); return; }

            const classes = codeEl.className.split(' ');
            const langClass = classes.find(c => c.startsWith('language-')) || 'language-plaintext';
            const language = langClass.replace('language-', '');

            exportCodeToImage({
                codeContent: codeEl.innerText,
                language: language,
                exportBtn: exportImageBtn
            });
        });
    }

    // Edit View Export
    const editorExportBtn = document.getElementById('editor-export-btn');
    if (editorExportBtn) {
        editorExportBtn.addEventListener('click', () => {
            const editorWrapper = document.getElementById('editor-container');
            if (!editorWrapper) return;
            const editor = editorWrapper.querySelector('.CodeMirror')?.CodeMirror;
            if (!editor) return;

            const codeContent = editor.getValue();
            if (!codeContent.trim()) { showToast('Nothing to export', true); return; }

            const langInput = document.getElementById('language-input');
            const language = langInput ? langInput.value.trim() || 'plaintext' : 'plaintext';

            exportCodeToImage({
                codeContent: codeContent,
                language: language,
                exportBtn: editorExportBtn
            });
        });
    }

    const copyLinkBtn = document.getElementById('copy-link-btn');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            const link = document.getElementById('share-link').textContent;
            navigator.clipboard.writeText(link).then(() => {
                const toast = document.getElementById('toast');
                toast.innerHTML = '<i class="fas fa-check"></i> Link Copied!';
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 2000);
            });
        });
    }

    const createNewBtn = document.getElementById('create-new-btn');
    if (createNewBtn) {
        createNewBtn.addEventListener('click', () => location.reload());
    }

    // --- Editor Markdown Preview Logic ---
    const editorPreviewBtn = document.getElementById('editor-preview-btn');
    if (editorPreviewBtn) {
        const editorWrapper = document.getElementById('editor-wrapper');
        const editorControls = document.getElementById('editor-controls');
        const editorPreviewBlock = document.getElementById('editor-markdown-preview');
        window.isEditorPreview = false;

        const updateEditorView = () => {
            if (window.isEditorPreview) {
                editorWrapper.style.display = 'none';
                if (editorControls) editorControls.style.display = 'none';
                editorPreviewBlock.style.display = 'block';
                editorPreviewBtn.innerHTML = '<i class="fas fa-code"></i> Edit';

                const rawContent = document.querySelector('.CodeMirror').CodeMirror.getValue();

                if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                    try {
                        const renderer = new marked.Renderer();
                        renderer.code = (code, lang) => {
                            const language = (lang || 'plaintext').toLowerCase();
                            if (language === 'mermaid') {
                                return `<div class="mermaid">${code}</div>`;
                            }
                            return `<div class="code-block-wrapper">
                                        <button class="copy-snippet-btn"><i class="far fa-copy"></i></button>
                                        <pre class="line-numbers language-${language}"><code class="language-${language}">${code}</code></pre>
                                    </div>`;
                        };

                        editorPreviewBlock.innerHTML = DOMPurify.sanitize(marked.parse(rawContent, { renderer, breaks: true, gfm: true }));

                        if (typeof Prism !== 'undefined') {
                            Prism.highlightAllUnder(editorPreviewBlock);
                        }

                        if (typeof renderMathInElement !== 'undefined') {
                            renderMathInElement(editorPreviewBlock, {
                                delimiters: [
                                    { left: '$$', right: '$$', display: true },
                                    { left: '$', right: '$', display: false },
                                    { left: '\\(', right: '\\)', display: false },
                                    { left: '\\[', right: '\\]', display: true }
                                ],
                                throwOnError: false
                            });
                        }

                        const renderMermaidEditor = () => {
                            if (typeof window.mermaid !== 'undefined') {
                                const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                                window.mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' });
                                window.mermaid.run({
                                    nodes: editorPreviewBlock.querySelectorAll('.mermaid')
                                }).catch(e => console.error("Mermaid rendering error:", e));
                            }
                        };

                        if (editorPreviewBlock.querySelector('.mermaid')) {
                            if (typeof window.mermaid === 'undefined') {
                                import('https://npm.webcache.cn/mermaid@10.9.1/dist/mermaid.esm.min.mjs').then(m => {
                                    window.mermaid = m.default;
                                    renderMermaidEditor();
                                }).catch(e => console.error("Failed to load mermaid:", e));
                            } else {
                                renderMermaidEditor();
                            }
                        }

                        editorPreviewBlock.querySelectorAll('.copy-snippet-btn').forEach(btn => {
                            btn.addEventListener('click', () => {
                                const codeText = btn.nextElementSibling.querySelector('code').innerText;
                                navigator.clipboard.writeText(codeText).then(() => {
                                    const toast = document.getElementById('toast');
                                    if (toast) {
                                        toast.innerHTML = '<i class="fas fa-code"></i> Code Copied!';
                                        toast.classList.add('show');
                                        setTimeout(() => toast.classList.remove('show'), 2000);
                                    }
                                });
                            });
                        });
                    } catch (e) {
                        editorPreviewBlock.innerHTML = '<p style="color:red">Error rendering markdown.</p>';
                        console.error(e);
                    }
                } else {
                    editorPreviewBlock.innerHTML = '<p>Rendering library not loaded.</p>';
                }
            } else {
                editorWrapper.style.display = 'block';
                if (editorControls) editorControls.style.display = 'flex';
                editorPreviewBlock.style.display = 'none';
                editorPreviewBtn.innerHTML = '<i class="fas fa-eye"></i> Preview';
            }
        };

        editorPreviewBtn.addEventListener('click', () => {
            window.isEditorPreview = !window.isEditorPreview;
            updateEditorView();
        });
    }

    // --- Markdown Preview Logic ---
    const previewBtn = document.getElementById('preview-btn');
    if (previewBtn) {
        const preBlock = document.querySelector('#viewer-container pre');
        const previewBlock = document.getElementById('markdown-preview');
        // Determine initial state based on visibility set by renderer
        let isPreview = previewBlock && previewBlock.style.display !== 'none';

        const renderMarkdown = () => {
            if (previewBlock && !previewBlock.innerHTML) {
                const codeEl = document.querySelector('code');
                if (codeEl) {
                    const rawContent = codeEl.innerText;

                    if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                        try {
                            const renderer = new marked.Renderer();
                            renderer.code = (code, lang) => {
                                const language = (lang || 'plaintext').toLowerCase();
                                if (language === 'mermaid') {
                                    return `<div class="mermaid">${code}</div>`;
                                }
                                return `<div class="code-block-wrapper">
                                            <button class="copy-snippet-btn"><i class="far fa-copy"></i></button>
                                            <pre class="line-numbers language-${language}"><code class="language-${language}">${code}</code></pre>
                                        </div>`;
                            };

                            previewBlock.innerHTML = DOMPurify.sanitize(marked.parse(rawContent, { renderer, breaks: true, gfm: true }));

                            if (typeof Prism !== 'undefined') {
                                Prism.highlightAllUnder(previewBlock);
                            }

                            if (typeof renderMathInElement !== 'undefined') {
                                renderMathInElement(previewBlock, {
                                    delimiters: [
                                        { left: '$$', right: '$$', display: true },
                                        { left: '$', right: '$', display: false },
                                        { left: '\\(', right: '\\)', display: false },
                                        { left: '\\[', right: '\\]', display: true }
                                    ],
                                    throwOnError: false
                                });
                            }

                            const renderMermaidViewer = () => {
                                if (typeof window.mermaid !== 'undefined') {
                                    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                                    window.mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' });
                                    window.mermaid.run({
                                        nodes: previewBlock.querySelectorAll('.mermaid')
                                    }).catch(e => console.error("Mermaid rendering error:", e));
                                }
                            };

                            if (previewBlock.querySelector('.mermaid')) {
                                if (typeof window.mermaid === 'undefined') {
                                    import('https://npm.webcache.cn/mermaid@10.9.1/dist/mermaid.esm.min.mjs').then(m => {
                                        window.mermaid = m.default;
                                        renderMermaidViewer();
                                    }).catch(e => console.error("Failed to load mermaid:", e));
                                } else {
                                    renderMermaidViewer();
                                }
                            }

                            previewBlock.querySelectorAll('.copy-snippet-btn').forEach(btn => {
                                btn.addEventListener('click', () => {
                                    const codeText = btn.nextElementSibling.querySelector('code').innerText;
                                    navigator.clipboard.writeText(codeText).then(() => {
                                        showToast('<i class="fas fa-code"></i> Code Copied!');
                                    });
                                });
                            });
                        } catch (e) {
                            previewBlock.innerHTML = '<p style="color:red">Error rendering markdown.</p>';
                            console.error(e);
                        }
                    } else {
                        previewBlock.innerHTML = '<p>Rendering library not loaded.</p>';
                    }
                }
            }
        };

        const updateView = () => {
            if (isPreview) {
                if (preBlock) preBlock.style.display = 'none';
                if (previewBlock) previewBlock.style.display = 'block';
                previewBtn.innerHTML = '<i class="fas fa-code"></i> Source';
                renderMarkdown();
            } else {
                if (preBlock) preBlock.style.display = 'block';
                if (previewBlock) previewBlock.style.display = 'none';
                previewBtn.innerHTML = '<i class="fas fa-eye"></i> Preview';
            }
        };

        // Initial render if default is markdown
        if (isPreview) {
            renderMarkdown();
        }

        previewBtn.addEventListener('click', () => {
            isPreview = !isPreview;
            updateView();
        });
    }
});