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

  it('reads an empty seventh field as no state', () => {
    const idx = buildAirportIndex([['SDF', 'Louisville', 'USA', 38.17, -85.74, 'America/Kentucky/Louisville', '']])
    expect(idx.get('SDF')?.state).toBeNull()
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

  it('spells every country one way: "USA" for the US, the short English name elsewhere', () => {
    expect(idx.get('SDF')?.country).toBe('USA')
    expect(idx.get('ABE')?.country).toBe('USA') // was "US"
    expect(idx.get('CGN')?.country).toBe('Germany')
    expect(idx.get('AGB')?.country).toBe('Germany') // was "DE"
    expect(idx.get('LHR')?.country).toBe('UK') // was "United Kingdom"
    expect(idx.get('ABZ')?.country).toBe('UK') // was "GB"
    expect(rows.some((r) => r[2] === 'US' || r[2] === 'United States')).toBe(false)
  })

  it('gives US airports their state code, and only them', () => {
    expect(idx.get('SDF')?.state).toBe('KY')
    expect(idx.get('ANC')?.state).toBe('AK')
    expect(idx.get('ABE')?.state).toBe('PA')
    expect(idx.get('CGN')?.state).toBeNull()
    for (const row of rows) {
      if (row.length !== 7) continue
      expect(row[2]).toBe('USA')
      expect(row[6]).toMatch(/^[A-Z]{2}$/)
    }
    expect(rows.filter((r) => r.length === 7).length).toBeGreaterThan(1500)
  })

  it('uses the Crewluve app’s spelling where English names differ, so each country reads one way', () => {
    expect(idx.get('IST')?.country).toBe('Turkey')
    expect(idx.get('PRG')?.country).toBe('Czech Republic')
    expect(idx.get('EMA')?.country).toBe('UK')
    expect(idx.get('POS')?.country).toBe('Trinidad and Tobago')
    expect(idx.get('TAB')?.country).toBe('Trinidad and Tobago')
    expect(idx.get('STT')?.country).toBe('US Virgin Islands')
    expect(idx.get('PLS')?.country).toBe('Turks and Caicos')
    expect(idx.get('HKG')?.country).toBe('China')
    expect(idx.get('HHP')?.country).toBe('China') // ICU's name for the code HK is "Hong Kong"; the Crewluve app's table files HKG under China
    const icuOnly = ['Türkiye', 'Czechia', 'United Kingdom', 'Trinidad & Tobago', 'U.S. Virgin Islands', 'Turks & Caicos Islands', 'Hong Kong', 'United Arab Emirates']
    expect(rows.some((r) => icuOnly.includes(r[2]))).toBe(false)
  })

  it('follows the Crewluve app’s own table where it differs: the city’s state, and "UAE"', () => {
    expect(idx.get('CVG')?.state).toBe('OH')
    expect(idx.get('IAD')?.state).toBe('DC')
    expect(idx.get('DJT')?.state).toBe('FL')
    expect(idx.get('DXB')?.country).toBe('UAE')
    expect(idx.get('AUH')?.country).toBe('UAE')
  })

  it('names cities as the Crewluve app’s table does where the globe’s list differs', () => {
    expect(idx.city('VPS')).toBe('Destin/Fort Walton Beach')
    expect(idx.city('DEL')).toBe('New Delhi')
    expect(idx.city('BAH')).toBe('Bahrain')
    expect(idx.city('TAO')).toBe('Qingdao')
  })
})
