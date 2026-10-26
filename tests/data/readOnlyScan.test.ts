import { describe, expect, it } from 'vitest'
import { fromCallers, importersOf, staticClosure, touchesClient, violations } from '../fixtures/sourceScan'

// The ways around a network guard that a code review found. Each must be flagged by the source rules; the partner door
// guard refuses anything else at the network (tests/partner/doorGuard.test.ts).
const BYPASSES: Array<[string, string, string, RegExp]> = [
  ['updateUser rewrites the pilot account', 'src/ui/Rename.ts', `export const rename = (c: any) => c.auth.updateUser({ data: { first_name: 'X' } })`, /\.updateUser/],
  ['functions.invoke calls an edge function', 'src/ui/Poke.ts', `export const poke = (c: any) => c.functions.invoke('anything')`, /\.functions/],
  [
    'an aliased client',
    'src/ui/Wipe.ts',
    `import { supabase } from '../supabase'\nconst db = supabase\nexport const wipe = () => db.from('trips').delete().eq('id', 'x')`,
    /\.delete/,
  ],
  [
    'bracket access',
    'src/ui/Wipe.ts',
    `import { supabase } from '../supabase'\nexport const add = () => supabase['from']('trips')['insert']({ id: 'x' })`,
    /\.insert/,
  ],
  ['`from (` with a space', 'src/ui/Add.ts', `export const add = (c: any) => c.from ('trips').upsert({ id: 'x' })`, /\.upsert/],
  ['rpc','src/ui/Call.ts', `export const call = (c: any) => c.rpc('delete_everything')`, /\.rpc/],
  ['storage', 'src/ui/Upload.ts', `export const up = (c: any) => c.storage.from('b').upload('a', new Blob())`, /\.storage/],
  [
    'a second createClient',
    'src/data/Second.ts',
    `import { createClient } from '@supabase/supabase-js'\nexport const other = createClient('https://x.supabase.co', 'key')`,
    /imports @supabase\/supabase-js/,
  ],
  ['a client package other than supabase-js', 'src/data/Second.ts', `import { PostgrestClient } from '@supabase/postgrest-js'\nexport const p = PostgrestClient`, /imports @supabase\/postgrest-js/],
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
  ['an import from a CDN', 'src/data/Cdn.ts', `export const load = () => import('https://esm.sh/@supabase/supabase-js')`, /imports https:/],
  ['an import named by an expression', 'src/data/Computed.ts', `const name = './supabase'\nexport const load = () => import(name)`, /computed name/],
  ['a require named by an expression', 'src/data/Computed.ts', `declare const require: (n: string) => unknown\nexport const load = (n: string) => require(n)`, /computed name/],
  ['import.meta.glob', 'src/data/Glob.ts', `export const all = import.meta.glob('./*.ts')`, /computed name/],
  ['injected HTML', 'src/ui/Html.ts', `export const html = (el: HTMLElement) => { el.innerHTML = '<b>x</b>' }`, /injects HTML/],
]

describe('the source rules catch the ways around the first guard', () => {
  it.each(BYPASSES)('%s', (_name, path, code, expected) => {
    expect(violations(path, code).join('\n')).toMatch(expected)
  })
})

describe('the source rules leave ordinary code alone', () => {
  it.each([
    ['a Set and a Map in a file that never touches the client', 'src/ui/Selection.ts', `const s = new Set<number>()\ns.delete(1)\nconst m = new Map<string, number>()\nm.delete('a')\nexport const all = Array.from(s)`],
    ['Array.from next to delete(), which is not the database', 'src/ui/Selection.ts', `export const f = (s: Set<number>) => { const a = Array.from(s); s.delete(a[0]); return a }`],
    ['a field named from, as on a leg, next to delete()', 'src/engine/Leg.ts', `export const drop = (seen: Map<string, number>, leg: { from: string }) => seen.delete(leg.from)`],
    ['a leg destructured into from and to', 'src/engine/Leg.ts', `export const ends = (leg: { from: string; to: string }) => { const { from, to } = leg; return [from, to] }`],
    ['the airport list fetch', 'src/data/Airports.ts', `export const load = (url: string) => fetch(url)`],
    ['a fetch with options that only read', 'src/data/Airports.ts', `export const load = (url: string, signal: AbortSignal) => fetch(url, { signal, cache: 'force-cache', method: 'GET' })`],
    ['mentions in comments and strings', 'src/data/Notes.ts', `// never call .update( or .insert( or client.from('trips').delete()\nexport const note = "fetch(url, { method: 'PATCH' }) is not allowed"`],
    ['the partner door module, which sends its POSTs through the door guard', 'src/partner/door.ts', `export const go = (url: string, init: RequestInit) => fetch(url, init)`],
  ])('%s', (_name, path, code) => {
    expect(violations(path, code)).toEqual([])
  })

  it('treats a Set.delete in a file that queries a table as a write, so keep them apart', () => {
    const code = `export const f = (c: any, s: Set<number>) => { s.delete(1); return c.from('trips') }`
    expect(violations('src/ui/Mixed.ts', code).join('\n')).toMatch(/\.delete/)
  })
})

describe('touchesClient', () => {
  it('is true for a file that imports a Supabase package or queries with .from(', () => {
    expect(touchesClient('src/data/x.ts', `import { createClient } from '@supabase/supabase-js'`)).toBe(true)
    expect(touchesClient('src/data/x.ts', `export const f = () => import('@supabase/supabase-js')`)).toBe(true)
    expect(touchesClient('src/data/x.ts', `export const q = (c: any) => c.from('trips')`)).toBe(true)
    expect(touchesClient('src/data/x.ts', `export const q = (c: any) => c['from']('trips')`)).toBe(true)
  })

  it('is false for built-ins named from, for a data field named from, and for files that touch neither', () => {
    expect(touchesClient('src/data/x.ts', `export const a = Array.from([1])`)).toBe(false)
    expect(touchesClient('src/data/x.ts', `export const b = Uint8Array.from([1])`)).toBe(false)
    expect(touchesClient('src/engine/x.ts', `export const origin = (leg: { from: string }) => leg.from`)).toBe(false)
    expect(touchesClient('src/data/x.ts', `export const c = 1`)).toBe(false)
  })
})

describe('the import graph', () => {
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

  it('follows only the imports the browser runs at startup', () => {
    expect([...staticClosure('src/main.tsx', sources)].sort()).toEqual(['src/auth/session.ts', 'src/main.tsx', 'src/ui/Root.tsx'])
  })

  it('reaches the client once any file on the startup path imports it statically', () => {
    const wired = { ...sources, 'src/ui/Root.tsx': `import { supabase } from '../supabase'\nexport const Root = supabase` }
    expect(staticClosure('src/main.tsx', wired)).toContain('src/supabase.ts')
  })

  it('finds the files that query with .from(', () => {
    expect(fromCallers({ 'src/a.ts': `export const q = (c: any) => c.from('x')`, 'src/b.ts': `export const r = Array.from([1])`, 'src/c.ts': `export const s = (c: any) => c ['from'] ('x')` })).toEqual(['src/a.ts', 'src/c.ts'])
  })
})
