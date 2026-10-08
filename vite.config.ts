import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// Production Content-Security-Policy (spec §9). Injected only into the built HTML, because the
// Vite dev server needs inline scripts and a websocket for hot reload.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://corxvurxpnrzekbxdgye.supabase.co",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

export default defineConfig({
  plugins: [
    preact(),
    {
      name: 'crewluve-csp',
      apply: 'build',
      transformIndexHtml: (html) =>
        html.replace('<!--csp-->', `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
    },
  ],
  server: { port: 5180, strictPort: true },
  preview: { port: 5181 },
  build: { target: 'es2020' },
})
