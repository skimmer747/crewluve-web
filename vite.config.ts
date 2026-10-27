import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { SUPABASE_URL } from './src/cloud'
import { OPEN_METEO_URL } from './src/data/weather'
import { DOOR_RPCS } from './src/partner/doorGuard'

// The four partner RPC addresses, built from the door guard's own list so the guard and the CSP can't drift apart.
const RPC_ADDRESSES = DOOR_RPCS.map((n) => `${SUPABASE_URL}/rest/v1/rpc/${n}`)

// Production Content-Security-Policy (spec §9). Injected only into the built HTML, because the
// Vite dev server needs inline scripts and a websocket for hot reload. connect-src lists the four partner RPC
// addresses, not the Crewlu Cloud project, and, for the location card's weather, Open-Meteo (slice 2B1 §7). So the
// browser itself allows only those four calls to Crewlu Cloud, even from code that slipped past the source rules
// (tests/fixtures/sourceScan.ts). That relies on CSP Level 2's matching of paths, and on the door refusing redirects:
// once a request has been redirected, the browser no longer checks the path.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' ${RPC_ADDRESSES.join(' ')} ${OPEN_METEO_URL}`,
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
