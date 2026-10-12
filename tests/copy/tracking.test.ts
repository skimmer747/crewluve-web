import { describe, expect, it } from 'vitest'
import { trackingFlightNumber, trackingLinks } from '../../src/copy/tracking'

describe('trackingFlightNumber', () => {
  it('is the airline’s ICAO code and the digits, as the app’s tracking popup shows them', () => {
    expect(trackingFlightNumber('5X', '2962')).toBe('UPS2962')
    expect(trackingFlightNumber('DL', '1235')).toBe('DAL1235')
    expect(trackingFlightNumber('dl', '1235')).toBe('DAL1235')
  })

  it('finds airline codes with a digit in them, which the app’s split at the first digit misses', () => {
    expect(trackingFlightNumber('B6', '1234')).toBe('JBU1234')
    expect(trackingFlightNumber('F9', '88')).toBe('FFT88')
  })

  it('keeps an airline it has no ICAO code for, in capitals', () => {
    expect(trackingFlightNumber('xy', '12')).toBe('XY12')
  })

  it('is null without an airline or without digits', () => {
    expect(trackingFlightNumber(null, '2962')).toBeNull()
    expect(trackingFlightNumber('5X', null)).toBeNull()
  })

  it('is null for anything but letters and digits, so a link can’t be turned elsewhere', () => {
    expect(trackingFlightNumber('U/S', '12')).toBeNull()
    expect(trackingFlightNumber('DL', '12?x=1')).toBeNull()
  })
})

describe('trackingLinks', () => {
  it('opens FlightRadar24’s and FlightAware’s pages for the flight', () => {
    expect(trackingLinks('5X', '2962')).toEqual({
      flightRadar24: 'https://fr24.com/UPS2962',
      flightAware: 'https://www.flightaware.com/live/flight/UPS2962',
    })
    expect(trackingLinks('DL', '1235')?.flightRadar24).toBe('https://fr24.com/DAL1235')
  })

  it('is null without a tracking flight number', () => {
    expect(trackingLinks(null, '2962')).toBeNull()
  })
})
