import { describe, expect, it } from 'vitest'
import { calendarDay, isKnownZone, prefers24Hour, viewerTimeZone, zoneAbbr, zonedParts, zoneOffsetMinutes } from '../../src/time/zoned'

const T = Date.UTC(2026, 9, 9, 3, 30) // 2026-10-09T03:30Z

describe('zonedParts', () => {
  it('reads wall-clock parts in the zone', () => {
    expect(zonedParts(T, 'America/New_York')).toEqual({ year: 2026, month: 10, day: 8, hour: 23, minute: 30, weekday: 4 })
    expect(zonedParts(T, 'Asia/Hong_Kong')).toEqual({ year: 2026, month: 10, day: 9, hour: 11, minute: 30, weekday: 5 })
  })

  it('uses hour 0 at midnight', () => {
    expect(zonedParts(Date.UTC(2026, 9, 9, 4, 0), 'America/New_York').hour).toBe(0)
  })
})

describe('calendarDay', () => {
  it('changes across a local midnight', () => {
    expect(calendarDay(T, 'Asia/Hong_Kong') - calendarDay(T, 'America/New_York')).toBe(1)
  })
})

describe('zoneOffsetMinutes', () => {
  it('gives the offset from UTC in minutes, half and quarter hours included', () => {
    expect(zoneOffsetMinutes(T, 'America/New_York')).toBe(-240)
    expect(zoneOffsetMinutes(Date.UTC(2026, 0, 9), 'America/New_York')).toBe(-300)
    expect(zoneOffsetMinutes(T, 'Asia/Kolkata')).toBe(330)
    expect(zoneOffsetMinutes(T, 'Asia/Kathmandu')).toBe(345)
    expect(zoneOffsetMinutes(T, 'UTC')).toBe(0)
  })

  it('ignores the seconds of the instant', () => {
    expect(zoneOffsetMinutes(T + 59_999, 'Asia/Kolkata')).toBe(330)
  })
})

describe('zoneAbbr', () => {
  it('prints US abbreviations and GMT offsets elsewhere, like iOS', () => {
    expect(zoneAbbr(T, 'America/New_York')).toBe('EDT')
    expect(zoneAbbr(Date.UTC(2026, 0, 9), 'America/New_York')).toBe('EST')
    expect(zoneAbbr(T, 'Pacific/Honolulu')).toBe('HST')
    expect(zoneAbbr(T, 'Europe/Berlin')).toBe('GMT+2')
  })
})

describe('prefers24Hour', () => {
  it('follows the locale', () => {
    expect(prefers24Hour('en-US')).toBe(false)
    expect(prefers24Hour('en-GB')).toBe(true)
  })
})

describe('isKnownZone', () => {
  it('accepts a zone the runtime knows', () => {
    expect(isKnownZone('America/New_York')).toBe(true)
  })

  it('rejects a zone the runtime does not know', () => {
    expect(isKnownZone('Not/AZone')).toBe(false)
  })

  it('rejects an empty zone name', () => {
    expect(isKnownZone('')).toBe(false)
  })
})

describe('viewerTimeZone', () => {
  it('returns the resolved zone when the runtime can format it', () => {
    expect(viewerTimeZone(() => 'Asia/Tokyo')).toBe('Asia/Tokyo')
  })

  it('falls back to UTC when the resolved zone is unknown', () => {
    expect(viewerTimeZone(() => 'Etc/Unknown')).toBe('UTC')
  })

  it('falls back to UTC when the runtime reports no zone', () => {
    expect(viewerTimeZone(() => undefined)).toBe('UTC')
  })
})
