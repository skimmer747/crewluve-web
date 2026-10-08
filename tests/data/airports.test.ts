import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildAirportIndex, type AirportTuple } from '../../src/data/airports'
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
})

describe('generated public/data/airports.json', () => {
  const rows = JSON.parse(readFileSync('public/data/airports.json', 'utf8')) as AirportTuple[]
  const idx = buildAirportIndex(rows)
  const october = Date.UTC(2026, 9, 9, 12)

  it('carries the whole globe list', () => {
    expect(rows.length).toBeGreaterThan(8000)
  })

  it.each([
    ['SDF', 'EDT'], ['LEX', 'EDT'], ['MCO', 'EDT'], ['ANC', 'AKDT'], ['HNL', 'HST'],
    ['ONT', 'PDT'], ['PHX', 'MST'], ['CGN', 'GMT+2'], ['HKG', 'GMT+8'], ['BLR', 'GMT+5:30'],
  ])('%s keeps %s in October 2026', (code, abbr) => {
    expect(zoneAbbr(october, idx.tz(code)!)).toBe(abbr)
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
