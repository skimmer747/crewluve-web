import { describe, expect, it } from 'vitest'
import { importersOf, violations } from '../fixtures/sourceScan'

// Ways around the partner door that code reviews found. Each must be flagged by a source rule. What the rules can't see
// has two backstops. The door guard judges everything src/partner/door.ts sends (tests/partner/doorGuard.test.ts). For any
// other request, the browser has the CSP's connect-src, which lists only the four RPC addresses (tests/viteConfig.test.ts).
const BYPASSES: Array<[string, string, string, RegExp]> = [
  // A Supabase client: the site has none.
  ['a createClient from supabase-js', 'src/data/Client.ts', `import { createClient } from '@supabase/supabase-js'\nexport const db = createClient('https://example.supabase.co', 'key')`, /imports @supabase\/supabase-js/],
  ['a client package other than supabase-js', 'src/data/Client.ts', `import { PostgrestClient } from '@supabase/postgrest-js'\nexport const p = PostgrestClient`, /imports @supabase\/postgrest-js/],

  // A Crewlu Cloud address anywhere but src/cloud.ts, the door and its guard: a plain GET passes the network rules, so
  // this rule is what stops a table read, or a device key put in an address.
  [
    'a table read through the project address, with the publishable key',
    'src/ui/Flights.ts',
    `import { SUPABASE_PUBLISHABLE_KEY as KEY, SUPABASE_URL } from '../cloud'\nexport const flights = () => fetch(SUPABASE_URL + '/rest/v1/flights?select=*', { headers: { apikey: KEY } })`,
    /names a Crewlu Cloud address/,
  ],
  [
    'a read that puts a device key in the address',
    'src/ui/Peek.ts',
    'export const peek = (k: string) => fetch(`https://example.supabase.co/rest/v1/rpc/partner_view?p_key=${k}`)',
    /names a Crewlu Cloud address/,
  ],
  ['the project host in a string', 'src/ui/Host.ts', `export const host = 'https://example.supabase.co'`, /names a Crewlu Cloud address/],
  ['an address in a template with no holes', 'src/ui/Url.ts', 'export const url = `https://example.supabase.co/rest/v1/trips`', /names a Crewlu Cloud address/],
  ['an address cut in the middle by a template hole', 'src/ui/Url.ts', 'export const url = (base: string, table: string) => `${base}/rest/v1/${table}`', /names a Crewlu Cloud address/],
  ['an address at the end of a template', 'src/ui/Url.ts', 'export const url = (base: string) => `${base}/rest/v1`', /names a Crewlu Cloud address/],
  [
    'a PUT to sign-in that rewrites the pilot account',
    'src/ui/Rename.ts',
    `import { SUPABASE_URL } from '../cloud'\nexport const rename = (token: string) => fetch(SUPABASE_URL + '/auth/v1/user', { method: 'PUT', headers: { authorization: token }, body: '{}' })`,
    /names a Crewlu Cloud address/,
  ],
  [
    'a call to an edge function',
    'src/ui/Poke.ts',
    `import { SUPABASE_URL } from '../cloud'\nexport const poke = () => fetch(SUPABASE_URL + '/functions/v1/anything', { method: 'POST' })`,
    /names a Crewlu Cloud address/,
  ],
  [
    'an upload to storage',
    'src/ui/Upload.ts',
    `import { SUPABASE_URL } from '../cloud'\nexport const up = (body: Blob) => fetch(SUPABASE_URL + '/storage/v1/object/b/a', { method: 'POST', body })`,
    /names a Crewlu Cloud address/,
  ],
  [
    'a realtime address',
    'src/ui/Live.ts',
    `import { SUPABASE_URL } from '../cloud'\nexport const live = SUPABASE_URL.replace('https', 'wss') + '/realtime/v1/websocket'`,
    /names a Crewlu Cloud address/,
  ],
  [
    'the GraphQL endpoint, which reads tables',
    'src/ui/Graph.ts',
    `import { SUPABASE_URL } from '../cloud'\nexport const ask = (query: string) => fetch(SUPABASE_URL + '/graphql/v1', { method: 'POST', body: query })`,
    /names a Crewlu Cloud address/,
  ],
  [
    'a call to an RPC the door does not make',
    'src/ui/Call.ts',
    `import { SUPABASE_URL } from '../cloud'\nexport const call = () => fetch(SUPABASE_URL + '/rest/v1/rpc/delete_everything', { method: 'POST', body: '{}' })`,
    /names a Crewlu Cloud address/,
  ],
  [
    'the door address in a partner module that is not the door',
    'src/partner/join.ts',
    'export const rpc = (base: string, name: string) => `${base}/rest/v1/rpc/${name}`',
    /names a Crewlu Cloud address/,
  ],

  // Code the CSP doesn't reach into: a worker served from the site takes its CSP from its own response headers, and
  // GitHub Pages sends none.
  ['a Worker', 'src/data/Raw.ts', `export const w = () => new Worker('/w.js')`, /uses Worker/],
  ['a Worker through window', 'src/data/Raw.ts', `export const w = () => new window.Worker('/w.js')`, /uses Worker/],
  ['a SharedWorker', 'src/data/Raw.ts', `export const w = () => new SharedWorker('/w.js')`, /uses SharedWorker/],
  ['a service worker', 'src/data/Raw.ts', `export const sw = () => navigator.serviceWorker.register('/sw.js')`, /uses serviceWorker/],
  ['a service worker named by a bracket', 'src/data/Raw.ts', `export const sw = () => navigator['serviceWorker']`, /uses serviceWorker/],
  ['a service worker destructured from the navigator', 'src/data/Raw.ts', `export const sw = () => { const { serviceWorker } = navigator; return serviceWorker }`, /uses serviceWorker/],

  // A request the door guard would refuse, sent some other way.
  ['a raw PATCH fetch', 'src/data/Raw.ts', `export const patch = (url: string) => fetch(url, { method: 'PATCH', body: '{}' })`, /fetch with method PATCH and with a body/],
  ['a POST to the partner door from any other file', 'src/partner/join.ts', `export const go = (url: string) => fetch(url, { method: 'POST', body: '{}' })`, /fetch with method POST and with a body/],
  ['a raw fetch through window', 'src/data/Raw.ts', `export const del = (url: string) => window.fetch(url, { method: 'DELETE' })`, /fetch with method DELETE/],
  ['a raw fetch through a bracket', 'src/data/Raw.ts', `export const del = (url: string) => globalThis['fetch'](url, { method: 'PUT' })`, /fetch with method PUT/],
  ['a raw fetch with options held in a variable', 'src/data/Raw.ts', `const init = { method: 'POST' }\nexport const go = (url: string) => fetch(url, init)`, /options it cannot read/],
  ['a raw fetch with a computed method', 'src/data/Raw.ts', `export const go = (url: string, m: string) => fetch(url, { method: m })`, /method \(not a literal\)/],
  ['a raw fetch with a quoted option name', 'src/data/Raw.ts', `export const go = (url: string) => fetch(url, { 'method': 'PATCH' })`, /fetch with method PATCH/],
  ['a raw fetch with a computed option name', 'src/data/Raw.ts', `export const go = (url: string) => fetch(url, { ['method']: 'PATCH' })`, /options it cannot read/],
  ['a raw fetch that spreads its options', 'src/data/Raw.ts', `export const go = (url: string, o: RequestInit) => fetch(url, { ...o })`, /options it cannot read/],
  ['a Request built for fetch', 'src/data/Raw.ts', `export const go = (url: string) => fetch(new Request(url, { method: 'PATCH' }))`, /constructs a Request/],
  ['XMLHttpRequest', 'src/data/Raw.ts', `export const x = () => new XMLHttpRequest()`, /XMLHttpRequest/],
  ['sendBeacon', 'src/data/Raw.ts', `export const b = (url: string) => navigator.sendBeacon(url, 'x')`, /sendBeacon/],
  ['a WebSocket', 'src/data/Raw.ts', `export const s = (url: string) => new WebSocket(url)`, /WebSocket/],

  // Code the import graph can't follow, or that loads from outside the site.
  ['an import from a CDN', 'src/data/Cdn.ts', `export const load = () => import('https://esm.sh/@supabase/supabase-js')`, /imports https:/],
  ['an import named by an expression', 'src/data/Computed.ts', `const name = './supabase'\nexport const load = () => import(name)`, /computed name/],
  ['a require named by an expression', 'src/data/Computed.ts', `declare const require: (n: string) => unknown\nexport const load = (n: string) => require(n)`, /computed name/],
  ['import.meta.glob', 'src/data/Glob.ts', `export const all = import.meta.glob('./*.ts')`, /computed name/],
]

describe('the source rules catch the ways around the partner door', () => {
  it.each(BYPASSES)('%s', (_name, path, code, expected) => {
    expect(violations(path, code).join('\n')).toMatch(expected)
  })
})

// Every place text can become markup, which Preact would have escaped: a sink used as a member of anything, as a key in an
// object literal, as an attribute in JSX, or named by a string that is exactly its name; and document.write and
// document.writeln, however they're reached.
const HTML_SINKS: Array<[string, string, string]> = [
  ['innerHTML assigned', 'src/ui/Html.ts', `export const html = (el: HTMLElement) => { el.innerHTML = '<b>x</b>' }`],
  ['outerHTML assigned', 'src/ui/Html.ts', `export const html = (el: HTMLElement) => { el.outerHTML = '<b>x</b>' }`],
  ['insertAdjacentHTML called', 'src/ui/Html.ts', `export const html = (el: HTMLElement) => el.insertAdjacentHTML('beforeend', '<b>x</b>')`],
  ['innerHTML named by a bracket', 'src/ui/Html.ts', `export const html = (el: HTMLElement) => { el['innerHTML'] = '<b>x</b>' }`],
  ['innerHTML only read', 'src/ui/Html.ts', `export const copy = (a: HTMLElement) => a.innerHTML`],
  ['innerHTML destructured from an element', 'src/ui/Html.ts', `export const copy = (a: HTMLElement) => { const { innerHTML } = a; return innerHTML }`],
  ['innerHTML as a key handed to Object.assign', 'src/ui/Html.ts', `export const html = (el: HTMLElement, h: string) => Object.assign(el, { innerHTML: h })`],
  ['innerHTML as a shorthand key', 'src/ui/Html.ts', `export const html = (el: HTMLElement, innerHTML: string) => Object.assign(el, { innerHTML })`],
  ['dangerouslySetInnerHTML as a key handed to h()', 'src/ui/Html.ts', `export const html = (h: Function, s: string) => h('div', { dangerouslySetInnerHTML: { __html: s } })`],
  ['dangerouslySetInnerHTML in JSX', 'src/ui/Raw.tsx', `export const Raw = (p: { html: string }) => <div dangerouslySetInnerHTML={{ __html: p.html }} />`],
  ['innerHTML in JSX', 'src/ui/Raw.tsx', `export const Raw = (p: { html: string }) => <div innerHTML={p.html} />`],
  ['setHTMLUnsafe called', 'src/ui/Html.ts', `export const html = (el: HTMLElement, s: string) => (el as any).setHTMLUnsafe(s)`],
  ['parseHTMLUnsafe called', 'src/ui/Html.ts', `export const html = (s: string) => (Document as any).parseHTMLUnsafe(s)`],
  ['createContextualFragment called', 'src/ui/Html.ts', `export const html = (r: Range, s: string) => r.createContextualFragment(s)`],
  ['srcdoc assigned', 'src/ui/Frame.ts', `export const frame = (f: HTMLIFrameElement, s: string) => { f.srcdoc = s }`],
  ['srcdoc in JSX', 'src/ui/Frame.tsx', `export const Frame = (p: { html: string }) => <iframe srcdoc={p.html} />`],
  ['srcDoc in JSX, as React spells it', 'src/ui/Frame.tsx', `export const Frame = (p: { html: string }) => <iframe srcDoc={p.html} />`],
  ['srcdoc as a key handed to h()', 'src/ui/Frame.ts', `export const frame = (h: Function, s: string) => h('iframe', { srcdoc: s })`],
  ['innerHTML set through Reflect.set', 'src/ui/Html.ts', `export const html = (el: HTMLElement, s: string) => Reflect.set(el, 'innerHTML', s)`],
  ['a sink named by a constant used as the key', 'src/ui/Html.ts', `const k = 'innerHTML'\nexport const html = (el: any, s: string) => { el[k] = s }`],
  ['srcdoc set as an attribute', 'src/ui/Frame.ts', `export const frame = (f: HTMLIFrameElement, s: string) => f.setAttribute('srcdoc', s)`],
  ['a sink named by a template with no holes', 'src/ui/Html.ts', 'export const html = (el: HTMLElement, s: string) => Reflect.set(el, `outerHTML`, s)'],
  ['document.write', 'src/ui/Doc.ts', `export const html = (s: string) => document.write(s)`],
  ['document.writeln', 'src/ui/Doc.ts', `export const html = (s: string) => document.writeln(s)`],
  ['document.write through window', 'src/ui/Doc.ts', `export const html = (s: string) => window.document.write(s)`],
  ['document.write named by a bracket', 'src/ui/Doc.ts', `export const html = (s: string) => document['write'](s)`],
  ['document.write through call', 'src/ui/Doc.ts', `export const html = (s: string) => document.write.call(document, s)`],
  ['document.write through apply', 'src/ui/Doc.ts', `export const html = (s: string) => document.write.apply(document, [s])`],
  ['document.write through bind', 'src/ui/Doc.ts', `export const html = (s: string) => document.write.bind(document)(s)`],
  ['document.write through a comma expression', 'src/ui/Doc.ts', `export const html = (s: string) => (0, document.write)(s)`],
  ['document.write held in a variable', 'src/ui/Doc.ts', `const w = document.write\nexport const html = (s: string) => w.call(document, s)`],
  ['document.write destructured from the document', 'src/ui/Doc.ts', `const { write } = document\nexport const html = (s: string) => write.call(document, s)`],
]

describe('the source rules catch every way text becomes markup', () => {
  it.each(HTML_SINKS)('%s', (_name, path, code) => {
    expect(violations(path, code).join('\n')).toMatch(/injects HTML/)
  })
})

describe('the source rules leave ordinary code alone', () => {
  it.each([
    ['the airport list fetch', 'src/data/Airports.ts', `export const load = (url: string) => fetch(url)`],
    ['a fetch with options that only read', 'src/data/Airports.ts', `export const load = (url: string, signal: AbortSignal) => fetch(url, { signal, cache: 'force-cache', method: 'GET' })`],
    ['the weather address, Open-Meteo, whose path also has a /v1', 'src/data/Weather.ts', 'export const url = (q: string) => `https://api.open-meteo.com/v1/forecast?${q}`'],
    ['mentions of network calls in comments and strings', 'src/data/Notes.ts', `// never call fetch(url, { method: 'PATCH' }), new XMLHttpRequest() or navigator.sendBeacon(url)\nexport const note = "fetch(url, { method: 'PATCH' }) is not allowed"`],
    ['mentions of a Crewlu Cloud address in a comment', 'src/ui/Notes.ts', `// the door calls https://example.supabase.co/rest/v1/rpc/partner_view\nexport const note = 1`],
    ['the project address, in the module that holds it', 'src/cloud.ts', `export const SUPABASE_URL = 'https://example.supabase.co'`],
    ['the partner door building a partner RPC address, and fetching it', 'src/partner/door.ts', 'export const go = (base: string, name: string, init: RequestInit) => fetch(`${base}/rest/v1/rpc/${name}`, init)'],
    ['the door guard naming the RPC path', 'src/partner/doorGuard.ts', `export const RPC_PATH = '/rest/v1/rpc/'`],
    ['a comment that mentions innerHTML and the other sinks', 'src/ui/Notes.ts', `// never assign el.innerHTML or el.outerHTML, or call insertAdjacentHTML or document.write\n/* dangerouslySetInnerHTML */\nexport const note = 1`],
    ['a string that mentions innerHTML and the other sinks', 'src/ui/Notes.ts', `export const note = "innerHTML, outerHTML, insertAdjacentHTML and document.write('x') are not allowed"`],
    ['a template of text that mentions innerHTML', 'src/ui/Notes.ts', 'export const note = (n: number) => `${n} uses of el.innerHTML`'],
    ['text in JSX that mentions innerHTML', 'src/ui/Notes.tsx', `export const Note = () => <p>never use innerHTML</p>`],
    ['text set as text, not as markup', 'src/ui/Text.ts', `export const set = (el: HTMLElement, s: string) => { el.textContent = s }`],
    ['write on something that is not the document', 'src/ui/Log.ts', `export const log = (out: { write(s: string): void }) => out.write('x')`],
    ['the Supabase docs and status page, which are supabase.com and not Crewlu Cloud', 'src/ui/Notes.ts', `export const links = ['https://supabase.com/docs', 'https://status.supabase.com']`],
    ['a label that only starts with a sink name', 'src/ui/Notes.ts', `export const label = 'srcdoc frame'`],
    ['a sentence that only contains a sink name', 'src/ui/Notes.ts', `export const note = 'never set el.innerHTML'`],
    ['write.call on something that is not the document', 'src/ui/Log.ts', `export const log = (out: { write(s: string): void }) => out.write.call(out, 'x')`],
    ['a variable called worker, and Workers in prose', 'src/ui/Notes.ts', `export const worker = 1\nexport const note = 'Workers are not allowed'`],
    ['the partner door module, which sends its POSTs through the door guard', 'src/partner/door.ts', `export const go = (url: string, init: RequestInit) => fetch(url, init)`],
  ])('%s', (_name, path, code) => {
    expect(violations(path, code)).toEqual([])
  })
})

describe('the import graph', () => {
  // Made-up sources: importersOf works on any module, so these names are only examples.
  const sources = {
    'src/supabase.ts': '',
    'src/main.tsx': `import { Root } from './ui/Root'`,
    'src/ui/Root.tsx': `import { signIn } from '../auth/session'\nexport const Root = signIn`,
    'src/auth/session.ts': `export const signIn = async () => (await import('../supabase')).supabase`,
    'src/data/reexport.ts': `export { supabase } from '../supabase'`,
    'src/data/types.ts': `import type { supabase } from '../supabase'\nexport type C = typeof supabase`,
    'src/data/require.ts': `import supabase = require('../supabase')\nexport default supabase`,
    'src/data/typeofImport.ts': `export type C = typeof import('../supabase')`,
  }

  it('finds every importer of a module, static, dynamic, re-export, require and type-only', () => {
    const found = importersOf('src/supabase.ts', sources)
    const byPath = Object.fromEntries(found.map((f) => [f.path, f]))
    expect(Object.keys(byPath).sort()).toEqual(['src/auth/session.ts', 'src/data/reexport.ts', 'src/data/require.ts', 'src/data/typeofImport.ts', 'src/data/types.ts'])
    expect(byPath['src/auth/session.ts']).toMatchObject({ kind: 'dynamic', typeOnly: false })
    expect(byPath['src/data/reexport.ts']).toMatchObject({ kind: 'static', typeOnly: false })
    expect(byPath['src/data/require.ts']).toMatchObject({ kind: 'require' })
    expect(byPath['src/data/types.ts']).toMatchObject({ kind: 'static', typeOnly: true })
    expect(byPath['src/data/typeofImport.ts']).toMatchObject({ kind: 'dynamic', typeOnly: true })
  })
})
