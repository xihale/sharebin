const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const LIBS_DIR = path.join(ROOT_DIR, 'public/libs');
const FONTS_DIR = path.join(ROOT_DIR, 'public/fonts');

console.log(`🚀 Starting Professional Asset Setup...`);

// Ensure directories exist
[LIBS_DIR, FONTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Helpers
function copySync(src, dest) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
}

function minifyJS(src, dest) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    console.log(`  [MIN] JS: ${path.relative(ROOT_DIR, src)} -> ${path.relative(LIBS_DIR, dest)}`);
    execSync(`bunx terser "${src}" -o "${dest}" --compress --mangle`);
}

function minifyCSS(src, dest) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    console.log(`  [MIN] CSS: ${path.relative(ROOT_DIR, src)} -> ${path.relative(LIBS_DIR, dest)}`);
    execSync(`bunx cleancss -o "${dest}" "${src}"`);
}

const assets = [
    // FontAwesome - Always use min from source if available
    { type: 'copy', src: 'node_modules/@fortawesome/fontawesome-free/css/all.min.css', dest: 'fontawesome/css/all.min.css' },
    { type: 'copy', dir: 'node_modules/@fortawesome/fontawesome-free/webfonts', dest: 'fontawesome/webfonts' },
    
    // CodeMirror 5 - Source is not minified, we minify it now
    { type: 'css', src: 'node_modules/codemirror/lib/codemirror.css', dest: 'codemirror/lib/codemirror.min.css' },
    { type: 'js', src: 'node_modules/codemirror/lib/codemirror.js', dest: 'codemirror/lib/codemirror.min.js' },
    { type: 'css', src: 'node_modules/codemirror/theme/material-palenight.css', dest: 'codemirror/theme/material-palenight.min.css' },
    { type: 'css', src: 'node_modules/codemirror/theme/xq-light.css', dest: 'codemirror/theme/xq-light.min.css' },
    { type: 'js', src: 'node_modules/codemirror/addon/edit/matchbrackets.js', dest: 'codemirror/addon/edit/matchbrackets.min.js' },
    { type: 'js', src: 'node_modules/codemirror/addon/edit/closebrackets.js', dest: 'codemirror/addon/edit/closebrackets.min.js' },
    { type: 'js', src: 'node_modules/codemirror/addon/selection/active-line.js', dest: 'codemirror/addon/selection/active-line.min.js' },

    // PrismJS - Components usually come pre-minified
    { type: 'copy', src: 'node_modules/prismjs/components.json', dest: 'prism/components.json' },
    { type: 'copy', dir: 'node_modules/prismjs/components', dest: 'prism/components', filter: /\.min\.js$/ },
    { type: 'copy', src: 'node_modules/prismjs/plugins/autoloader/prism-autoloader.min.js', dest: 'prism/plugins/autoloader/prism-autoloader.min.js' },
    { type: 'copy', src: 'node_modules/prismjs/plugins/line-numbers/prism-line-numbers.min.js', dest: 'prism/plugins/line-numbers/prism-line-numbers.min.js' },
    { type: 'copy', src: 'node_modules/prismjs/plugins/line-numbers/prism-line-numbers.css', dest: 'prism/plugins/line-numbers/prism-line-numbers.min.css' },
    { type: 'copy', src: 'node_modules/prismjs/themes/prism.min.css', dest: 'prism/themes/prism.min.css' },
    { type: 'copy', src: 'node_modules/prismjs/themes/prism-tomorrow.min.css', dest: 'prism/themes/prism-tomorrow.min.css' },

    // GuessLang-JS & TensorFlow.js
    { type: 'copy', src: 'node_modules/@ray-d-song/guesslang-js/dist/lib/guesslang-js.mjs', dest: 'guesslang/index.mjs' },
    { type: 'copy', src: 'node_modules/@tensorflow/tfjs/dist/tf.min.js', dest: 'tensorflow/tf.min.js' },
];

assets.forEach(asset => {
    const srcPath = path.join(ROOT_DIR, asset.src || asset.dir || '');
    const destPath = path.join(LIBS_DIR, asset.dest);

    if (!fs.existsSync(srcPath)) return;

    if (asset.type === 'js') {
        minifyJS(srcPath, destPath);
    } else if (asset.type === 'css') {
        minifyCSS(srcPath, destPath);
    } else if (asset.type === 'copy') {
        if (asset.dir) {
            if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
            fs.readdirSync(srcPath).forEach(file => {
                if (asset.filter && !asset.filter.test(file)) return;
                copySync(path.join(srcPath, file), path.join(destPath, file));
            });
        } else {
            copySync(srcPath, destPath);
        }
    }
});

// Fonts Download
const fonts = [
    { name: 'Inter.woff2', url: 'https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2' },
    { name: 'JetBrainsMono.woff2', url: 'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwg.woff2' }
];

fonts.forEach(font => {
    const dest = path.join(FONTS_DIR, font.name);
    if (!fs.existsSync(dest)) {
        console.log(`  [DL] Font: ${font.name}`);
        const file = fs.createWriteStream(dest);
        https.get(font.url, (res) => {
            res.pipe(file);
            file.on('finish', () => file.close());
        });
    }
});

console.log('✅ All assets processed and minified.');
