document.addEventListener('DOMContentLoaded', async () => {
    const config = window.APP_CONFIG || { readOnly: false };
    const isReadOnly = config.readOnly;
    
    // --- Prism Adapter for CodeMirror 5 ---
    if (typeof CodeMirror !== 'undefined' && typeof Prism !== 'undefined') {
        CodeMirror.defineMode("prism", function(config, parserConfig) {
            return {
                startState: function() {
                    return { tokens: [], index: 0 };
                },
                token: function(stream, state) {
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

    // --- Configuration for Dynamic Loading via Local Libs ---
    if (typeof Prism !== 'undefined' && Prism.plugins.autoloader) {
        Prism.plugins.autoloader.languages_path = '/libs/prism/components/';
    }

    // --- State & Data ---
    let validLanguages = new Set(['plaintext']);
    let languageMap = {};
    let isManualSelection = false;
    let allPrismLanguages = new Set();

    // Helper: Lightweight Heuristic Detection
    // OPTIMIZATION: Only scans the first 2000 characters to prevent hanging on massive pastes
    function detectLanguage(fullCode) {
        if (!fullCode) return null;
        const code = fullCode.trim().slice(0, 2000); 

        if (code.startsWith('#!/bin/bash') || code.startsWith('#!/bin/sh')) return 'bash';
        if (code.startsWith('#!/usr/bin/env python')) return 'python';
        if (code.startsWith('#!/usr/bin/env node')) return 'javascript';
        if (/^<!DOCTYPE html>/i.test(code) || (/<html/i.test(code) && /<\/html>/i.test(code))) return 'html';
        if (/^\s*<(\?xml|[\w:.-]+)[^>]*>/.test(code)) return 'xml';
        if (/^\s*[a-z0-9-]+\s*\{[\s\S]*:[^;]+;[\s\S]*\}/i.test(code)) return 'css';
        if ((code.startsWith('{') && code.endsWith('}')) || (code.startsWith('[') && code.endsWith(']'))) {
            try { JSON.parse(code); return 'json'; } catch(e) {}
        }
        if (/\bdef\s+\w+\(/.test(code) || /\bimport\s+[\w.]+\s*$/.test(code) || /\bfrom\s+[\w.]+\s+import/.test(code)) return 'python';
        if (/\bpackage\s+main\b/.test(code) && /\bfunc\s+main\b/.test(code)) return 'go';
        if (/\bfn\s+main\(\)/.test(code) || /\bpub\s+fn\b/.test(code) || /println!/.test(code)) return 'rust';
        if (/\bpublic\s+class\s+\w+/.test(code) && /\bpublic\s+static\s+void\s+main/.test(code)) return 'java';
        if (/#include\s+<[\w.]+>/.test(code) && /\bint\s+main\s*\(/.test(code)) return 'cpp';
        if (/\binterface\s+\w+\s*\{/.test(code) || /\btype\s+\w+\s*=/.test(code)) return 'typescript';
        if (/\bconst\s+\w+\s*=/.test(code) || /\bconsole\.log\(/.test(code) || /\bfunction\s+\w+\(/.test(code)) return 'javascript';
        if (/\bSELECT\b.*\bFROM\b/i.test(code)) return 'sql';
        if (/^#\s+/.test(code) && /^\s*[-*]\s+/.test(code)) return 'markdown';
        return null;
    }

    function setEditorMode(editor, lang) {
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
            const res = await fetch('/libs/prism/components.json');
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
                autofocus: true
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
                'Cmd-Enter': () => saveBtn?.click()
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
                
                const isUrl = /^(http|https|ws|wss):\/\/[^ "]+$/.test(content);
                if (isUrl) {
                    typeIndicator.textContent = 'Link Redirect';
                    typeIndicator.classList.add('visible');
                    // Stop language detection if URL
                    return;
                }
                
                typeIndicator.textContent = 'Code Snippet';
                typeIndicator.classList.add('visible');

                if (!isManualSelection && langInput) {
                    clearTimeout(window.detectTimer);
                    window.detectTimer = setTimeout(() => {
                        // Pass truncated content for detection performance
                        const detected = detectLanguage(content);
                        if (detected && detected !== langInput.value) {
                            langInput.value = detected;
                            setEditorMode(editor, detected);
                        }
                    }, 600);
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
                    turnstileWidgetId = window.turnstile.render('#turnstile-container', {
                        sitekey: '0x4AAAAAACI6fa1HcBuhPd1S',
                        theme: 'dark',
                        callback: function(token) {
                            if (isWaitingForCaptcha && captchaModal && captchaModal.classList.contains('visible')) {
                                console.log('Captcha success, submitting...');
                                isWaitingForCaptcha = false; // Reset flag
                                submitSnippet(token);
                            }
                        },
                        'error-callback': function() {
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
                    alert(`Content is too large! Limit is 100KB.`);
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
                            type: /^(http|https|ws|wss):\/\/[^ "]+$/.test(content.trim()) ? 'url' : 'code', 
                            language: validateLanguage(langInput?.value) 
                        })
                    });

                    if (res.status === 403) {
                        const data = await res.json();
                        if (data.code === 'CAPTCHA_REQUIRED') {
                            // Need verification
                            saveBtn.innerHTML = 'Verifying... <i class="fas fa-shield-alt fa-spin"></i>';
                            if (!window.turnstile || turnstileWidgetId === null) {
                                alert('Security check is still loading. Please try again in a moment.');
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
                    alert('Error saving: ' + e.message);
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
                const isUrl = /^(http|https|ws|wss):\/\/[^ "]+$/.test(content.trim());
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
                    alert('Error saving: ' + e.message);
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
});