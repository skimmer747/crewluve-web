import { describe, expect, it } from 'vitest'
import { airlineColor, airlineIata, airlineIcao, airlineIcon, airlineName, flightPhrase } from '../../src/copy/airlines'

describe('airlineName', () => {
  it.each([['5X', 'UPS'], ['UPS', 'UPS'], ['dl', 'Delta'], ['DAL', 'Delta'], ['TG', 'Thai Airways'], ['ZZ', 'ZZ'], [null, 'Commercial']])(
    '%s → %s', (code, name) => expect(airlineName(code)).toBe(name),
  )
})

describe('airlineIcao', () => {
  it.each([['5X', 'UPS'], ['dl', 'DAL'], [' b6 ', 'JBU'], ['OH', 'PSA'], ['G4', null], ['UPS', null]])(
    '%s → %s', (code, icao) => expect(airlineIcao(code)).toBe(icao),
  )
})

describe('airlineIata', () => {
  it.each([['5X', '5X'], ['UPS', '5X'], ['dal', 'DL'], [' b6 ', 'B6'], ['xy', 'XY']])(
    '%s → %s', (code, iata) => expect(airlineIata(code)).toBe(iata),
  )
})

describe('airlineIcon', () => {
  it.each([
    ['5X', 'AirplaneTilt'], ['UPS', 'AirplaneTilt'], ['FX', 'Package'],
    ['DL', 'Triangle'], ['WN', 'Heart'], ['IB', 'Airplane'], [null, 'Airplane'],
  ])(
    '%s → %s', (code, icon) => expect(airlineIcon(code)).toBe(icon),
  )
})

describe('airlineColor', () => {
  it('uses the theme-aware UPS token and literal brand colors for the rest', () => {
    expect(airlineColor('5X')).toBe('ups')
    expect(airlineColor('WN')).toBe('#FF8000')
    expect(airlineColor('DL')).toBe('#002666')
    expect(airlineColor('JL')).toBe('#C9262E')
    expect(airlineColor('ZZ')).toBe('blue')
    expect(airlineColor(null)).toBe('blue')
  })
})

describe('flightPhrase', () => {
  it('names the airline and number, or nothing when the number is unusable', () => {
    expect(flightPhrase('5X', '2961')).toBe(' on UPS flight 2961')
    expect(flightPhrase('DL', '1234')).toBe(' on Delta flight 1234')
    expect(flightPhrase(null, null)).toBe('')
  })

  it('omits the phrase for placeholders, which are not all digits', () => {
    expect(flightPhrase('5X', 'CML')).toBe('')
    expect(flightPhrase('5X', 'HOT-12')).toBe('')
    expect(flightPhrase(null, 'XXXX')).toBe('')
  })
})

describe('a whitespace-only airline code', () => {
  it('counts as no code, like null', () => {
    expect(airlineName('  ')).toBe('Commercial')
    expect(airlineIcon('  ')).toBe('Airplane')
    expect(airlineColor('  ')).toBe('blue')
    expect(flightPhrase('  ', '2961')).toBe(' on Commercial flight 2961')
  })
})
