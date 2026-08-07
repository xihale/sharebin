import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import { dirname, resolve } from 'path'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { getHtmlEntrypointForPath, HTML_ENTRYPOINTS } from '@sharebin/shared/routes'

const __dirname = dirname(fileURLToPath(import.meta.url))
const frontendRoot = resolve(__dirname, '../../packages/frontend')
const appRoot = __dirname

// Packages loaded from webcache CDN via import map
const CDN_EXTERNAL = [
  'codemirror',
  '@codemirror/autocomplete', '@codemirror/commands', '@codemirror/language',
  '@codemirror/search', '@codemirror/lint', '@codemirror/state', '@codemirror/view',
  '@codemirror/lang-cpp', '@codemirror/lang-css', '@codemirror/lang-go',
  '@codemirror/lang-html', '@codemirror/lang-java', '@codemirror/lang-javascript',
  '@codemirror/lang-jinja', '@codemirror/lang-json', '@codemirror/lang-less',
  '@codemirror/lang-liquid', '@codemirror/lang-markdown', '@codemirror/lang-php',
  '@codemirror/lang-python', '@codemirror/lang-rust', '@codemirror/lang-sass',
  '@codemirror/lang-sql', '@codemirror/lang-wast', '@codemirror/lang-xml',
  '@codemirror/lang-yaml', '@codemirror/lang-vue', '@codemirror/lang-angular',
  '@lezer/common', '@lezer/highlight', '@lezer/lr',
  '@lezer/cpp', '@lezer/css', '@lezer/go', '@lezer/html', '@lezer/java',
  '@lezer/javascript', '@lezer/json', '@lezer/markdown', '@lezer/php',
  '@lezer/python', '@lezer/rust', '@lezer/sass', '@lezer/xml', '@lezer/yaml',
  '@marijn/find-cluster-break',
  'crelt', 'style-mod', 'w3c-keyname',
]

const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:8787'

function getFallbackTarget(url: string): { html: string; status: number } | null {
  const html = getHtmlEntrypointForPath(url)
  if (html) return { html, status: 200 }

  return { html: HTML_ENTRYPOINTS.notFound, status: 404 }
}

function spaFallback(): Plugin {
  return {
    name: 'spa-fallback',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] || '/'

        if (
          url.startsWith('/api/') ||
          url.startsWith('/@') ||
          url.startsWith('/node_modules/') ||
          /\.\w+$/.test(url)
        ) {
          return next()
        }

        const target = getFallbackTarget(url)
        if (!target) return next()

        try {
          const htmlPath = resolve(frontendRoot, target.html)
          const html = readFileSync(htmlPath, 'utf-8')
          const transformed = await server.transformIndexHtml(url, html)
          res.setHeader('Content-Type', 'text/html')
          res.statusCode = target.status
          res.end(transformed)
        } catch (e) {
          console.error('[spa-fallback] Error:', e)
          return next()
        }
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] || '/'
        if (url.startsWith('/api/') || url.startsWith('/@') || url.includes('.')) {
          return next()
        }

        const target = getFallbackTarget(url)
        if (!target) return next()

        try {
          const htmlPath = resolve(appRoot, 'dist', target.html)
          const content = readFileSync(htmlPath, 'utf-8')
          res.setHeader('Content-Type', 'text/html')
          res.statusCode = target.status
          res.end(content)
        } catch {
          return next()
        }
      })
    },
  }
}

export default defineConfig({
  root: frontendRoot,
  resolve: {
    alias: {
      '@': resolve(frontendRoot, 'src'),
    },
  },
  build: {
    outDir: resolve(appRoot, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(frontendRoot, 'index.html'),
        viewer: resolve(frontendRoot, 'viewer.html'),
        notFound: resolve(frontendRoot, '404.html'),
      },
      external: CDN_EXTERNAL,
    },
    target: 'es2022',
    minify: true,
  },
  plugins: [spaFallback()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
