import { describe, expect, it } from 'vitest'
import { airlineColor, airlineIcon, airlineName, flightPhrase } from '../../src/copy/airlines'

describe('airlineName', () => {
  it.each([['5X', 'UPS'], ['UPS', 'UPS'], ['dl', 'Delta'], ['DAL', 'Delta'], ['TG', 'Thai Airways'], ['ZZ', 'ZZ'], [null, 'Commercial']])(
    '%s → %s', (code, name) => expect(airlineName(code)).toBe(name),
  )
})

describe('airlineIcon', () => {
  it.each([['5X', 'Package'], ['DL', 'Triangle'], ['WN', 'Heart'], ['IB', 'Airplane'], [null, 'Airplane']])(
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
})
