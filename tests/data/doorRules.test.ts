import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DOOR_MODULE, callsTo, fetchCalls, importersOf, importsOf, parse, rel, sourceFiles, violations } from '../fixtures/sourceScan'

// The guarantee itself is src/partner/doorGuard.ts: src/partner/door.ts sends every Crewlu Cloud request through it,
// tests/partner/door.test.ts pins that every call goes through the guard, and tests/partner/doorGuard.test.ts shows the
// guard refusing everything but the four partner RPCs. The rules below stop code from going around the door (a Supabase
// package, a Crewlu Cloud address, a raw POST) and catch the ways text becomes markup. They scan src/ from this file's
// location, so they work whatever directory the tests run from.
const sources: Record<string, string> = Object.fromEntries(sourceFiles().map((file) => [rel(file), readFileSync(file, 'utf8')]))

describe('the partner door is the only way to Crewlu Cloud (piece 5a §9)', () => {
  it.each(Object.keys(sources))('%s breaks no source rule: no Supabase package, no Crewlu Cloud address, no raw request, no injected HTML', (path) => {
    expect(violations(path, sources[path])).toEqual([])
  })

  it('imports no Supabase package', () => {
    const importers = Object.keys(sources).filter((path) => importsOf(parse(sources[path], path)).some((i) => i.specifier?.startsWith('@supabase/')))
    expect(importers).toEqual([])
  })

  it('lets only the door and its guard know where Crewlu Cloud is', () => {
    expect([...new Set(importersOf('src/cloud.ts', sources).map((i) => i.path))].sort())
      .toEqual([DOOR_MODULE, 'src/partner/doorGuard.ts'])
  })

  it("pins the door module's one fetch and its one call to the door guard", () => {
    const sf = parse(sources[DOOR_MODULE], DOOR_MODULE)
    expect(importsOf(sf).map((i) => i.specifier)).toContain('./doorGuard')
    // The door module may send what other files can't, so pin its calls: its one fetch is the page's own, handed to
    // makeDoor, and makeDoor sends everything through the guard.
    const calls = fetchCalls(sf)
    expect(calls).toHaveLength(1)
    expect(calls[0].parent.parent.getText(sf)).toBe('makeDoor((input, init) => fetch(input, init))')
    expect(callsTo(sf, 'doorFetch')).toEqual(['doorFetch(send)'])
  })

  it('lets only the door module use the door guard', () => {
    expect([...new Set(importersOf('src/partner/doorGuard.ts', sources).map((i) => i.path))]).toEqual([DOOR_MODULE])
  })
})
