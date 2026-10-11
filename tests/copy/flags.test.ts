import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { countryFlag, FLAG_COUNTRIES } from '../../src/copy/flags'
import type { AirportTuple } from '../../src/data/airports'

/** The app's own flags (countryFlags in AirportDataProvider.swift), as the code points it writes them with. */
const APP_FLAGS: Array<[country: string, codePoints: string]> = [
  ['Canada', '1F1E8 1F1E6'], ['Mexico', '1F1F2 1F1FD'], ['Germany', '1F1E9 1F1EA'], ['China', '1F1E8 1F1F3'],
  ['UK', '1F1EC 1F1E7'], ['Puerto Rico', '1F1F5 1F1F7'], ['South Korea', '1F1F0 1F1F7'], ['Japan', '1F1EF 1F1F5'],
  ['Taiwan', '1F1F9 1F1FC'], ['Singapore', '1F1F8 1F1EC'], ['Thailand', '1F1F9 1F1ED'], ['India', '1F1EE 1F1F3'],
  ['UAE', '1F1E6 1F1EA'], ['France', '1F1EB 1F1F7'], ['Netherlands', '1F1F3 1F1F1'], ['Belgium', '1F1E7 1F1EA'],
  ['Spain', '1F1EA 1F1F8'], ['Italy', '1F1EE 1F1F9'], ['US Virgin Islands', '1F1FB 1F1EE'], ['Bahamas', '1F1E7 1F1F8'],
  ['Jamaica', '1F1EF 1F1F2'], ['Aruba', '1F1E6 1F1FC'], ['Curaçao', '1F1E8 1F1FC'], ['Sint Maarten', '1F1F8 1F1FD'],
  ['Barbados', '1F1E7 1F1E7'], ['Trinidad and Tobago', '1F1F9 1F1F9'], ['Dominican Republic', '1F1E9 1F1F4'],
  ['Turks and Caicos', '1F1F9 1F1E8'], ['Cayman Islands', '1F1F0 1F1FE'], ['Panama', '1F1F5 1F1E6'],
  ['Costa Rica', '1F1E8 1F1F7'], ['Guatemala', '1F1EC 1F1F9'], ['El Salvador', '1F1F8 1F1FB'],
  ['Honduras', '1F1ED 1F1F3'], ['Nicaragua', '1F1F3 1F1EE'], ['Belize', '1F1E7 1F1FF'], ['Colombia', '1F1E8 1F1F4'],
  ['Brazil', '1F1E7 1F1F7'], ['Argentina', '1F1E6 1F1F7'], ['Chile', '1F1E8 1F1F1'], ['Peru', '1F1F5 1F1EA'],
  ['Ecuador', '1F1EA 1F1E8'], ['Venezuela', '1F1FB 1F1EA'], ['Uruguay', '1F1FA 1F1FE'], ['Malaysia', '1F1F2 1F1FE'],
  ['Philippines', '1F1F5 1F1ED'], ['Indonesia', '1F1EE 1F1E9'], ['Vietnam', '1F1FB 1F1F3'], ['Qatar', '1F1F6 1F1E6'],
  ['Israel', '1F1EE 1F1F1'], ['Switzerland', '1F1E8 1F1ED'], ['Austria', '1F1E6 1F1F9'], ['Denmark', '1F1E9 1F1F0'],
  ['Sweden', '1F1F8 1F1EA'], ['Norway', '1F1F3 1F1F4'], ['Finland', '1F1EB 1F1EE'], ['Ireland', '1F1EE 1F1EA'],
  ['Poland', '1F1F5 1F1F1'], ['Czech Republic', '1F1E8 1F1FF'], ['Hungary', '1F1ED 1F1FA'], ['Turkey', '1F1F9 1F1F7'],
  ['Greece', '1F1EC 1F1F7'], ['Portugal', '1F1F5 1F1F9'], ['Australia', '1F1E6 1F1FA'], ['New Zealand', '1F1F3 1F1FF'],
  ['South Africa', '1F1FF 1F1E6'], ['Kenya', '1F1F0 1F1EA'], ['Ethiopia', '1F1EA 1F1F9'], ['Nigeria', '1F1F3 1F1EC'],
  ['Egypt', '1F1EA 1F1EC'], ['Bangladesh', '1F1E7 1F1E9'], ['Sri Lanka', '1F1F1 1F1F0'], ['Bahrain', '1F1E7 1F1ED'],
  ['Jordan', '1F1EF 1F1F4'],
]

const airports = JSON.parse(readFileSync(new URL('../../public/data/airports.json', import.meta.url), 'utf8')) as AirportTuple[]
const countries = new Set(airports.map(([, , country]) => country))

describe('countryFlag', () => {
  it('has the app’s 74 flags, exactly', () => {
    expect(FLAG_COUNTRIES).toHaveLength(74)
    expect([...FLAG_COUNTRIES].sort()).toEqual(APP_FLAGS.map(([country]) => country).sort())
  })

  it.each(APP_FLAGS)('shows the app’s flag for %s', (country, codePoints) => {
    expect(countryFlag(country)).toBe(String.fromCodePoint(...codePoints.split(' ').map((hex) => parseInt(hex, 16))))
  })

  it('spells every flag country the way the airport list does', () => {
    expect(FLAG_COUNTRIES.filter((country) => !countries.has(country))).toEqual([])
  })

  it('shows none for the US, a country the app has no flag for, or no country', () => {
    expect(countryFlag('USA')).toBeNull()
    expect(countryFlag('Russia')).toBeNull()
    expect(countryFlag('')).toBeNull()
    expect(countryFlag(null)).toBeNull()
    expect(countryFlag(undefined)).toBeNull()
  })

  it('isn’t fooled by names every object has', () => {
    expect(countryFlag('constructor')).toBeNull()
    expect(countryFlag('toString')).toBeNull()
  })
})
