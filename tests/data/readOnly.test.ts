import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fromCallers, importersOf, importsOf, parse, rel, SUPABASE_MODULE, sourceFiles, staticClosure, violations } from '../fixtures/sourceScan'

// The guarantee itself is src/data/readOnlyFetch.ts: the CrewLu Cloud client sends every request through it, and
// tests/data/readOnlyClient.test.ts shows a real client being refused every write. The rules below stop code from
// going around that wrapper (a second client, a raw fetch) or calling writes in the first place. They scan src/ from
// this file's location, so they work whatever directory the tests run from.
const sources: Record<string, string> = Object.fromEntries(sourceFiles().map((file) => [rel(file), readFileSync(file, 'utf8')]))

/** The only files that may import src/supabase.ts. Root.tsx arrives in a later batch. */
const MAY_IMPORT_THE_CLIENT = ['src/auth/session.ts', 'src/ui/Root.tsx']

describe('read-only guarantee (spec §9)', () => {
  it.each(Object.keys(sources))('%s never writes to CrewLu Cloud, goes around the read-only fetch, or injects HTML', (path) => {
    expect(violations(path, sources[path])).toEqual([])
  })

  it('keeps all database access in fetchSchedule.ts', () => {
    expect(fromCallers(sources)).toEqual(['src/data/fetchSchedule.ts'])
  })

  it('lets only src/supabase.ts import a Supabase package, so every client is built with the read-only fetch', () => {
    const importers = Object.keys(sources).filter((path) => importsOf(parse(sources[path], path)).some((i) => i.specifier?.startsWith('@supabase/')))
    expect(importers).toEqual([SUPABASE_MODULE])
  })

  it('lets only session.ts and Root.tsx import src/supabase.ts, statically or dynamically', () => {
    const importers = [...new Set(importersOf(SUPABASE_MODULE, sources).map((i) => i.path))]
    expect(MAY_IMPORT_THE_CLIENT).toEqual(expect.arrayContaining(importers))
  })

  it('has session.ts load the client on demand: demo mode makes no network calls (spec §4.7)', () => {
    const fromSession = importersOf(SUPABASE_MODULE, sources).filter((i) => i.path === 'src/auth/session.ts')
    expect(fromSession).toEqual([{ path: 'src/auth/session.ts', kind: 'dynamic', typeOnly: false }])
  })

  it('never reaches src/supabase.ts from the app entry without a dynamic import', () => {
    // Creating the client restores a stored session and refreshes its token, which is a network call.
    expect([...staticClosure('src/main.tsx', sources)]).not.toContain(SUPABASE_MODULE)
  })
})
