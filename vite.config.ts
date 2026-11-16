import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import preact from '@preact/preset-vite'
import { SUPABASE_URL } from './src/cloud'
import { OPEN_METEO_URL } from './src/data/weather'
import { DOOR_RPCS } from './src/partner/doorGuard'

// The five partner RPC addresses, built from the door guard's own list so the guard and the CSP can't drift apart.
const RPC_ADDRESSES = DOOR_RPCS.map((n) => `${SUPABASE_URL}/rest/v1/rpc/${n}`)

// Production Content-Security-Policy (spec §9). Injected only into the built HTML, because the
// Vite dev server needs inline scripts and a websocket for hot reload. connect-src lists the five partner RPC
// addresses, not the Crewlu Cloud project; for the location card's weather, Open-Meteo (slice 2B1 §7); and Apple's map
// servers (Apple Maps spec §6). So the
// browser itself reaches only those five addresses on Crewlu Cloud, even from code that slipped past the source rules
// (tests/fixtures/sourceScan.ts). It checks the address, not the method or the query: a GET with a device key in the
// query, to one of the five, passes the CSP, and only the source rules' address rule stops that. The CSP relies on
// Level 2's matching of paths, and on the door refusing redirects: once a request has been redirected, the browser no
// longer checks the path.
// Apple's map (Apple Maps spec §6): MapKit JS comes from Apple's CDN, runs WebAssembly, uses workers and blob: URLs,
// loads images from and talks to Apple's map servers, and needs inline styles. Scripts still can't be inline, and Crewlu
// Cloud is still reachable only at the five partner addresses.
const APPLE_MAPS = 'https://*.apple-mapkit.com'
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://cdn.apple-mapkit.com 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${APPLE_MAPS}`,
  "font-src 'self'",
  `connect-src 'self' ${RPC_ADDRESSES.join(' ')} ${OPEN_METEO_URL} ${APPLE_MAPS} blob:`,
  `worker-src ${APPLE_MAPS} blob:`,
  `frame-src ${APPLE_MAPS}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

/**
 * The local MapKit token (.env.local, VITE_MAPKIT_DEV_TOKEN) works on any site for 7 days (Apple Maps spec §3). The code
 * reads it only on the dev server, and this fails any build that carries it anyway, even one made on a Mac with
 * .env.local.
 */
export function noDevTokenPlugin(...tokens: string[]): Plugin {
  const local = tokens.filter(Boolean)
  return {
    name: 'crewluve-no-dev-token',
    apply: 'build',
    generateBundle(_options, bundle) {
      if (local.length === 0) return
      for (const file of Object.values(bundle)) {
        const text = file.type === 'chunk' ? file.code : typeof file.source === 'string' ? file.source : Buffer.from(file.source).toString('utf8')
        if (local.some((token) => text.includes(token))) this.error(`${file.fileName} carries the local MapKit token from .env.local`)
      }
    },
  }
}

/** The local token as either mode's env files give it: .env, .env.local, and the development and production ones. */
const LOCAL_TOKENS = ['development', 'production'].map((mode) => loadEnv(mode, process.cwd(), 'VITE_').VITE_MAPKIT_DEV_TOKEN ?? '')

export default defineConfig({
  plugins: [
    preact(),
    noDevTokenPlugin(...LOCAL_TOKENS),
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
