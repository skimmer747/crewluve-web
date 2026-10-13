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
    expect(trackingFlightNumber(' xy ', '12')).toBe('XY12')
  })

  it('is null without an airline or without digits', () => {
    expect(trackingFlightNumber(null, '2962')).toBeNull()
    expect(trackingFlightNumber('5X', null)).toBeNull()
    expect(trackingFlightNumber('  ', '2962')).toBeNull()
  })

  it('is null for anything but letters and digits, so a link can’t be turned elsewhere', () => {
    expect(trackingFlightNumber('U/S', '12')).toBeNull()
    expect(trackingFlightNumber('DL', '12?x=1')).toBeNull()
  })
})

describe('trackingLinks', () => {
  it('opens FlightRadar24’s page for the flight number and FlightAware’s for the callsign', () => {
    expect(trackingLinks('5X', '2962')).toEqual({
      flightRadar24: 'https://www.flightradar24.com/data/flights/5x2962',
      flightAware: 'https://www.flightaware.com/live/flight/UPS2962',
    })
    expect(trackingLinks('DL', '1235')?.flightRadar24).toBe('https://www.flightradar24.com/data/flights/dl1235')
  })

  it('gives FlightRadar24 the IATA code, which its flight pages need, however the airline was entered', () => {
    expect(trackingLinks('UPS', '5768')?.flightRadar24).toBe('https://www.flightradar24.com/data/flights/5x5768')
    expect(trackingLinks(' b6 ', '1234')?.flightRadar24).toBe('https://www.flightradar24.com/data/flights/b61234')
    expect(trackingLinks('xy', '12')?.flightRadar24).toBe('https://www.flightradar24.com/data/flights/xy12')
  })

  it('is null without a tracking flight number', () => {
    expect(trackingLinks(null, '2962')).toBeNull()
  })
})
