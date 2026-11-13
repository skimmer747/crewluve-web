import { describe, expect, it } from 'vitest'
import { delayBannerText, flightNumberText, spokenDelayBanner } from '../../src/copy/flight'

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

describe('spokenDelayBanner', () => {
  it('says the banner in words, as the sun dial says a delay', () => {
    expect(spokenDelayBanner(40)).toBe('Delayed 40 minutes')
    expect(spokenDelayBanner(90)).toBe('Delayed 1 hour 30 minutes')
    expect(spokenDelayBanner(60)).toBe('Delayed 1 hour')
    expect(spokenDelayBanner(-20)).toBe('Departed 20 minutes early')
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
