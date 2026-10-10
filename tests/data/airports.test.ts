import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildAirportIndex, loadAirports, type AirportTuple } from '../../src/data/airports'
import { zoneAbbr } from '../../src/time/zoned'

describe('buildAirportIndex', () => {
  const idx = buildAirportIndex([['SDF', 'Louisville', 'USA', 38.17, -85.74, 'America/Kentucky/Louisville']])

  it('looks up city and zone case-insensitively', () => {
    expect(idx.city('sdf')).toBe('Louisville')
    expect(idx.tz(' SDF ')).toBe('America/Kentucky/Louisville')
    expect(idx.get('SDF')?.lat).toBe(38.17)
  })

  it('falls back to the code for unknown airports and null when there is no code', () => {
    expect(idx.city('XYZ')).toBe('XYZ')
    expect(idx.tz('XYZ')).toBeNull()
    expect(idx.city(null)).toBeNull()
  })

  it('falls back to the code when an airport has an empty city name', () => {
    const blank = buildAirportIndex([['AMB', '', 'MG', -13.1884, 48.988, 'Asia/Riyadh']])
    expect(blank.city('AMB')).toBe('AMB')
  })

  it('has no time zone when the runtime does not know the zone, but keeps the city', () => {
    // e.g. America/Coyhaique on runtimes with tz data older than 2025b
    const odd = buildAirportIndex([['BBA', 'Balmaceda', 'CL', -45.916, -71.6895, 'Not/AZone']])
    expect(odd.tz('BBA')).toBeNull()
    expect(odd.city('BBA')).toBe('Balmaceda')
  })

  it('skips rows with a blank code, so no lookup can land on them', () => {
    const odd = buildAirportIndex([
      ['', 'Nowhere', 'XX', 0, 0, 'Europe/Berlin'],
      ['  ', 'Nowhere else', 'XX', 0, 0, 'Europe/Berlin'],
      ['SDF', 'Louisville', 'USA', 38.17, -85.74, 'America/Kentucky/Louisville'],
    ])
    expect(odd.get('')).toBeUndefined()
    expect(odd.get(null)).toBeUndefined()
    expect(odd.tz(null)).toBeNull()
    expect(odd.city(null)).toBeNull()
    expect(odd.city('SDF')).toBe('Louisville')
    expect(odd.tz('SDF')).toBe('America/Kentucky/Louisville')
  })

  it('trims and uppercases the codes it is built from', () => {
    const padded = buildAirportIndex([[' sdf ', 'Louisville', 'USA', 38.17, -85.74, 'America/Kentucky/Louisville']])
    expect(padded.city('SDF')).toBe('Louisville')
    expect(padded.get('sdf')?.iata).toBe('SDF')
  })

  it('keeps a US airport’s state, and has none for a six-field row', () => {
    const idx = buildAirportIndex([
      ['SDF', 'Louisville', 'USA', 38.17, -85.74, 'America/Kentucky/Louisville', 'KY'],
      ['CGN', 'Cologne', 'Germany', 50.87, 7.14, 'Europe/Berlin'],
    ])
    expect(idx.get('SDF')?.state).toBe('KY')
    expect(idx.get('CGN')?.state).toBeNull()
  })
})

describe('loadAirports', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('fetches the list from under the site base path', async () => {
    vi.stubEnv('BASE_URL', '/crewluve/')
    const fetchMock = vi.fn(async () =>
      Response.json([['SDF', 'Louisville', 'USA', 38.17, -85.74, 'America/Kentucky/Louisville']]),
    )
    vi.stubGlobal('fetch', fetchMock)
    const idx = await loadAirports()
    expect(fetchMock).toHaveBeenCalledWith('/crewluve/data/airports.json')
    expect(idx.city('SDF')).toBe('Louisville')
  })
})

describe('generated public/data/airports.json', () => {
  const rows = JSON.parse(readFileSync(new URL('../../public/data/airports.json', import.meta.url), 'utf8')) as AirportTuple[]
  const idx = buildAirportIndex(rows)
  const october = Date.UTC(2026, 9, 9, 12)

  it('carries the whole globe list', () => {
    expect(rows.length).toBeGreaterThan(8000)
  })

  it.each([
    ['SDF', 'EDT'], ['LEX', 'EDT'], ['MCO', 'EDT'], ['ANC', 'AKDT'], ['HNL', 'HST'],
    ['ONT', 'PDT'], ['PHX', 'MST'], ['CGN', 'GMT+2'], ['HKG', 'GMT+8'], ['BLR', 'GMT+5:30'],
    ['PPT', 'GMT-10'], ['LPB', 'GMT-4'],
  ])('%s keeps %s in October 2026', (code, abbr) => {
    expect(zoneAbbr(october, idx.tz(code)!)).toBe(abbr)
  })

  it.each([
    ['GOH', 'America/Godthab'], ['KBP', 'Europe/Kiev'], ['CIS', 'Pacific/Enderbury'],
    ['CJS', 'America/Denver'], ['BBA', 'America/Punta_Arenas'],
  ])('%s uses %s, a zone older browsers know', (code, zone) => {
    expect(idx.tz(code)).toBe(zone)
  })

  it('keeps Crewlu city names', () => {
    expect(idx.city('SDF')).toBe('Louisville')
    expect(idx.city('CGN')).toBe('Cologne')
    expect(idx.city('BLR')).toBe('Bangalore')
  })

  it('gives every airport a city name', () => {
    const blanks = rows.filter(([, city]) => city.trim() === '')
    expect(blanks.length, `blank city, e.g. ${blanks.slice(0, 5).map(([iata]) => iata).join(', ')}`).toBe(0)
  })
})
