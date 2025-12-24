const fs = require('fs');
const path = require('path');
const https = require('https');

const LIBS_DIR = path.join(__dirname, '../public/libs');
const FONTS_DIR = path.join(__dirname, '../public/fonts');

// 1. Ensure directories exist
[LIBS_DIR, FONTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 2. Helper: Copy files
function copySync(src, dest) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
}

// 3. Define Assets to Copy from node_modules
const assets = [
    // FontAwesome
    { src: 'node_modules/@fortawesome/fontawesome-free/css/all.min.css', dest: 'fontawesome/css/all.min.css' },
    { dir: 'node_modules/@fortawesome/fontawesome-free/webfonts', dest: 'fontawesome/webfonts' },
    
    // CodeMirror 5
    { src: 'node_modules/codemirror/lib/codemirror.css', dest: 'codemirror/lib/codemirror.min.css' },
    { src: 'node_modules/codemirror/lib/codemirror.js', dest: 'codemirror/lib/codemirror.min.js' },
    { dir: 'node_modules/codemirror/theme', dest: 'codemirror/theme', filter: /material-palenight|xq-light/ },
    { src: 'node_modules/codemirror/addon/edit/matchbrackets.js', dest: 'codemirror/addon/edit/matchbrackets.min.js' },
    { src: 'node_modules/codemirror/addon/edit/closebrackets.js', dest: 'codemirror/addon/edit/closebrackets.min.js' },
    { src: 'node_modules/codemirror/addon/selection/active-line.js', dest: 'codemirror/addon/selection/active-line.min.js' },

    // PrismJS
    { src: 'node_modules/prismjs/components.json', dest: 'prism/components.json' },
    { dir: 'node_modules/prismjs/components', dest: 'prism/components', filter: /\.min\.js$/ },
    { src: 'node_modules/prismjs/plugins/autoloader/prism-autoloader.min.js', dest: 'prism/plugins/autoloader/prism-autoloader.min.js' },
    { src: 'node_modules/prismjs/plugins/line-numbers/prism-line-numbers.min.js', dest: 'prism/plugins/line-numbers/prism-line-numbers.min.js' },
    { src: 'node_modules/prismjs/plugins/line-numbers/prism-line-numbers.css', dest: 'prism/plugins/line-numbers/prism-line-numbers.css' },
    { src: 'node_modules/prismjs/themes/prism.min.css', dest: 'prism/themes/prism.min.css' },
    { src: 'node_modules/prismjs/themes/prism-tomorrow.min.css', dest: 'prism/themes/prism-tomorrow.min.css' },
];

assets.forEach(asset => {
    const fullDest = path.join(LIBS_DIR, asset.dest);
    if (asset.src) {
        const srcPath = path.join(__dirname, '..', asset.src);
        if (fs.existsSync(srcPath)) copySync(srcPath, fullDest);
    } else if (asset.dir) {
        const srcDir = path.join(__dirname, '..', asset.dir);
        if (!fs.existsSync(srcDir)) return;
        fs.readdirSync(srcDir).forEach(file => {
            if (asset.filter && !asset.filter.test(file)) return;
            copySync(path.join(srcDir, file), path.join(fullDest, file));
        });
    }
});

// 4. Download Fonts if not exist
const fonts = [
    { name: 'Inter.woff2', url: 'https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2' },
    { name: 'JetBrainsMono.woff2', url: 'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwg.woff2' }
];

fonts.forEach(font => {
    const dest = path.join(FONTS_DIR, font.name);
    if (!fs.existsSync(dest)) {
        console.log(`Downloading: ${font.name}...`);
        const file = fs.createWriteStream(dest);
        https.get(font.url, (res) => {
            res.pipe(file);
            file.on('finish', () => file.close());
        });
    }
});

console.log('✅ Assets setup complete.');
