import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { SUPABASE_URL } from './src/cloud'

// Production Content-Security-Policy (spec §9). Injected only into the built HTML, because the
// Vite dev server needs inline scripts and a websocket for hot reload.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE_URL}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

export default defineConfig({
  plugins: [
    preact(),
    {
      name: 'crewluve-csp',
      apply: 'build',
      transformIndexHtml: (html) => {
        // Fail the build rather than ship a production page with no CSP.
        if (!html.includes('<!--csp-->')) throw new Error('index.html lost its <!--csp--> placeholder')
        return html.replace('<!--csp-->', `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
      },
    },
  ],
  server: { port: 5180, strictPort: true },
  preview: { port: 5181, strictPort: true },
  build: { target: 'es2020' },
})
