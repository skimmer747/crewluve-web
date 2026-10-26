import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { SUPABASE_URL } from './src/cloud'
import { OPEN_METEO_URL } from './src/data/weather'

// Production Content-Security-Policy (spec §9). Injected only into the built HTML, because the
// Vite dev server needs inline scripts and a websocket for hot reload. connect-src allows CrewLu Cloud
// and, for the location card's weather, Open-Meteo (slice 2B1 §7).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE_URL} ${OPEN_METEO_URL}`,
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
    {
      // /join is the app itself (partner links piece 5a §4.1): an invite link opened anywhere but in Crewluve joins in
      // the browser. GitHub Pages serves join.html for /join, and an exact copy runs the same bundle under the same CSP.
      name: 'crewluve-join-page',
      apply: 'build',
      writeBundle(options) {
        const dir = options.dir ?? 'dist'
        copyFileSync(join(dir, 'index.html'), join(dir, 'join.html'))
      },
    },
  ],
  server: { port: 5180, strictPort: true },
  preview: { port: 5181, strictPort: true },
  build: { target: 'es2020' },
})
