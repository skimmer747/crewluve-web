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
// browser itself reaches only those four addresses on Crewlu Cloud, even from code that slipped past the source rules
// (tests/fixtures/sourceScan.ts). It checks the address, not the method or the query: a GET with a device key in the
// query, to one of the four, passes the CSP, and only the source rules' address rule stops that. The CSP relies on
// Level 2's matching of paths, and on the door refusing redirects: once a request has been redirected, the browser no
// longer checks the path.
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
      // For a path it has no file for (/join/, /Join) Pages serves 404.html instead, with status 404, which browsers
      // show as a page. So a copy there runs the app too, and the app reads the invite from the fragment on any path.
      name: 'crewluve-join-page',
      apply: 'build',
      writeBundle(options) {
        // Fail the build rather than copy in the shell's folder: Vite always passes the output folder.
        if (!options.dir) throw new Error('crewluve-join-page: no output folder')
        for (const name of ['join.html', '404.html']) copyFileSync(join(options.dir, 'index.html'), join(options.dir, name))
      },
    },
  ],
  server: { port: 5180, strictPort: true },
  preview: { port: 5181, strictPort: true },
  build: { target: 'es2020' },
})
