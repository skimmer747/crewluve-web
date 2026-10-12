import { describe, expect, it } from 'vitest'
import { delayBannerText, distanceText, flightDurationText, flightMapLabel, flightNumberText, progressWords } from '../../src/copy/flight'
import { HOUR, MINUTE } from '../../src/time/zoned'

describe('flightNumberText', () => {
  it('writes a company flight as UPS and its digits, as the pilot’s Duty app does', () => {
    expect(flightNumberText('5X', '2962')).toBe('UPS2962')
  })

  it('writes another airline’s flight as the airline and the digits', () => {
    expect(flightNumberText('DL', '1235')).toBe('DL1235')
  })

  it('writes the digits alone without an airline, and nothing without digits', () => {
    expect(flightNumberText(null, '2962')).toBe('2962')
    expect(flightNumberText('5X', null)).toBeNull()
  })
})

describe('flightDurationText', () => {
  it('reads hours and minutes as h:mm, as the app does', () => {
    expect(flightDurationText(5 * HOUR)).toBe('5:00')
    expect(flightDurationText(HOUR + 5 * MINUTE)).toBe('1:05')
  })

  it('reads minutes alone under an hour, rounding seconds down', () => {
    expect(flightDurationText(45 * MINUTE + 59_000)).toBe('45m')
    expect(flightDurationText(59_000)).toBe('0m')
  })
})

describe('distanceText', () => {
  it('reads nautical miles with a thousands separator', () => {
    expect(distanceText(2706)).toBe('2,706 nm')
    expect(distanceText(312)).toBe('312 nm')
  })
})

describe('delayBannerText', () => {
  it('reads a late departure as DELAYED and its length', () => {
    expect(delayBannerText(40)).toBe('DELAYED 40m')
    expect(delayBannerText(90)).toBe('DELAYED 1h 30m')
    expect(delayBannerText(120)).toBe('DELAYED 2h')
  })

  it('reads an early one as EARLY DEP', () => {
    expect(delayBannerText(-20)).toBe('EARLY DEP 20m')
    expect(delayBannerText(-65)).toBe('EARLY DEP 1h 5m')
  })
})

describe('progressWords', () => {
  it.each([
    [0, 'just taking off'],
    [0.1, 'just taking off'],
    [0.27, 'about a quarter of the way'],
    [0.3, 'about a third of the way'],
    [0.33, 'about a third of the way'],
    [0.43, 'halfway'],
    [0.5, 'halfway'],
    [0.7, 'about two thirds of the way'],
    [0.76, 'about three quarters of the way'],
    [0.97, 'about to land'],
  ])('%s reads "%s"', (progress, words) => {
    expect(progressWords(progress)).toBe(words)
  })
})

describe('flightMapLabel', () => {
  it('names the route, the distance, the time and how far along it is', () => {
    expect(flightMapLabel({ from: 'Anchorage', to: 'Louisville', nm: 2706, durationMs: 5 * HOUR, progress: 0.33 })).toBe(
      'Flight from Anchorage to Louisville, 2,706 nautical miles, 5 hours, about a third of the way',
    )
  })

  it('leaves out what doesn’t apply', () => {
    expect(flightMapLabel({ from: 'ANC', to: 'SDF', nm: null, durationMs: 0, progress: null })).toBe('Flight from ANC to SDF')
    expect(flightMapLabel({ from: 'Louisville', to: 'Rockford', nm: 312, durationMs: 90 * MINUTE, progress: null })).toBe(
      'Flight from Louisville to Rockford, 312 nautical miles, 1 hour, 30 minutes',
    )
  })
})
