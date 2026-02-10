const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const LIBS_DIR = path.join(ROOT_DIR, 'public/libs');

const ASSETS = [
    {
        name: 'GuessLang',
        src: 'node_modules/@ray-d-song/guesslang-js/dist/lib/guesslang-js.mjs',
        dest: 'guesslang/index.mjs',
        minify: true
    },
    {
        name: 'Prism Components',
        src: 'node_modules/prismjs/components.json',
        dest: 'prism/components.json',
        minify: false
    },
    {
        name: 'Prism Core',
        src: 'node_modules/prismjs/prism.js',
        dest: 'prism/prism.js',
        minify: true
    },
    {
        name: 'Prism Autoloader',
        src: 'node_modules/prismjs/plugins/autoloader/prism-autoloader.js',
        dest: 'prism/plugins/prism-autoloader.js',
        minify: true
    },
    {
        name: 'Prism Line Numbers JS',
        src: 'node_modules/prismjs/plugins/line-numbers/prism-line-numbers.js',
        dest: 'prism/plugins/prism-line-numbers.js',
        minify: true
    },
    {
        name: 'Prism CSS',
        src: 'node_modules/prismjs/themes/prism.css',
        dest: 'prism/themes/prism.css',
        minify: true
    },
    {
        name: 'Prism Tomorrow CSS',
        src: 'node_modules/prismjs/themes/prism-tomorrow.css',
        dest: 'prism/themes/prism-tomorrow.css',
        minify: true
    },
    {
        name: 'Prism Line Numbers CSS',
        src: 'node_modules/prismjs/plugins/line-numbers/prism-line-numbers.css',
        dest: 'prism/plugins/prism-line-numbers.css',
        minify: true
    },
    {
        name: 'FontAwesome CSS',
        src: 'node_modules/@fortawesome/fontawesome-free/css/all.min.css',
        dest: 'font-awesome/css/all.min.css',
        minify: false
    },
    {
        name: 'CodeMirror JS',
        src: 'node_modules/codemirror/lib/codemirror.js',
        dest: 'codemirror/lib/codemirror.js',
        minify: true
    },
    {
        name: 'CodeMirror CSS',
        src: 'node_modules/codemirror/lib/codemirror.css',
        dest: 'codemirror/lib/codemirror.css',
        minify: true
    },
    {
        name: 'CodeMirror Theme XQ-Light',
        src: 'node_modules/codemirror/theme/xq-light.css',
        dest: 'codemirror/theme/xq-light.css',
        minify: true
    },
    {
        name: 'CodeMirror Theme Material Palenight',
        src: 'node_modules/codemirror/theme/material-palenight.css',
        dest: 'codemirror/theme/material-palenight.css',
        minify: true
    },
    {
        name: 'Marked JS',
        src: 'node_modules/marked/lib/marked.umd.js',
        dest: 'marked/marked.min.js',
        minify: true
    },
    {
        name: 'DOMPurify JS',
        src: 'node_modules/dompurify/dist/purify.js',
        dest: 'dompurify/purify.min.js',
        minify: true
    },
    {
        name: 'Github Markdown CSS',
        src: 'node_modules/clean-css-cli/bin/cleancss', // Just a placeholder to ensure clean-css is available if needed, but we'll use a different approach for this one or skip
        skip: true
    }
];

// Special handling for directories
const DIRS = [
    {
        name: 'FontAwesome Webfonts',
        src: 'node_modules/@fortawesome/fontawesome-free/webfonts',
        dest: 'font-awesome/webfonts'
    },
    {
        name: 'Prism Components Dir',
        src: 'node_modules/prismjs/components',
        dest: 'prism/components'
    },
    {
        name: 'CodeMirror Addons',
        src: 'node_modules/codemirror/addon',
        dest: 'codemirror/addon'
    }
];

function processAsset(asset) {
    if (asset.skip) return;
    const srcPath = path.join(ROOT_DIR, asset.src);
    const destPath = path.join(LIBS_DIR, asset.dest);
    
    if (!fs.existsSync(srcPath)) {
        console.warn(`  ⚠️  [Missing] ${asset.name} (${srcPath})`);
        return;
    }
    if (!fs.existsSync(path.dirname(destPath))) fs.mkdirSync(path.dirname(destPath), { recursive: true });

    if (asset.minify) {
        console.log(`  ⚡ [Minify] ${asset.dest}`);
        try {
            execSync(`bunx terser "${srcPath}" -o "${destPath}" --compress --mangle`, { stdio: 'pipe' });
        } catch (e) {
            fs.copyFileSync(srcPath, destPath);
        }
    } else {
        console.log(`  Pg [Copy]   ${asset.dest}`);
        fs.copyFileSync(srcPath, destPath);
    }
}

function copyDir(src, dest) {
    const srcPath = path.join(ROOT_DIR, src);
    const destPath = path.join(LIBS_DIR, dest);
    if (!fs.existsSync(srcPath)) return;
    
    console.log(`  📂 [Dir]    ${dest}`);
    if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
    
    const files = fs.readdirSync(srcPath);
    for (const file of files) {
        const curSrc = path.join(srcPath, file);
        const curDest = path.join(destPath, file);
        if (fs.lstatSync(curSrc).isDirectory()) {
            // Recurse if needed, but for webfonts we don't need to
            if (file === 'components' || file === 'addon' || file === 'webfonts') {
                // Actually we just need the files inside
            }
            // For simplicity, let's just use cp -r if it's a dir we want everything from
            execSync(`cp -r "${curSrc}" "${path.dirname(curDest)}"`);
        } else {
            fs.copyFileSync(curSrc, curDest);
        }
    }
}

console.log(`🚀 Processing local assets...`);
ASSETS.forEach(processAsset);
DIRS.forEach(dir => copyDir(dir.src, dir.dest));

// Handle github-markdown-css separately as it might not be in node_modules directly
const markdownCssPath = path.join(ROOT_DIR, 'node_modules/github-markdown-css/github-markdown.css');
if (fs.existsSync(markdownCssPath)) {
    console.log(`  Pg [Copy]   markdown/github-markdown.css`);
    const dest = path.join(LIBS_DIR, 'markdown/github-markdown.css');
    if (!fs.existsSync(path.dirname(dest))) fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(markdownCssPath, dest);
}

console.log(`✅ Done.`);
