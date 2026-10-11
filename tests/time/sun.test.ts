import { describe, expect, it } from 'vitest'
import { isDaytime, sunTimes } from '../../src/time/sun'
import { MINUTE } from '../../src/time/zoned'

/**
 * Reference times from NOAA's Solar Calculator formulas, worked out separately in Python at local noon, as NOAA's
 * spreadsheet does, and rounded to the second. The site works the sun out at solar noon instead, a few seconds'
 * difference; the spec allows 2 minutes.
 */
const NOAA: Array<[name: string, lat: number, lng: number, timeZone: string, at: string, sunrise: string, sunset: string]> = [
  ['SDF', 38.1746, -85.7382, 'America/Kentucky/Louisville', '2026-10-10T16:00:00Z', '2026-10-10T11:47:11Z', '2026-10-10T23:12:36Z'],
  ['ANC', 61.1744, -149.9983, 'America/Anchorage', '2026-10-10T20:00:00Z', '2026-10-10T16:30:27Z', '2026-10-11T03:03:20Z'],
  ['MIA', 25.7959, -80.2871, 'America/New_York', '2026-10-10T16:00:00Z', '2026-10-10T11:17:36Z', '2026-10-10T22:58:34Z'],
  ['HKG', 22.308, 113.9185, 'Asia/Hong_Kong', '2026-10-10T04:00:00Z', '2026-10-09T22:18:42Z', '2026-10-10T10:04:05Z'],
  // Cologne on both sides of the end of summer time, at 03:00 on 25 October 2026.
  ['CGN', 50.8659, 7.1427, 'Europe/Berlin', '2026-10-24T10:00:00Z', '2026-10-24T06:09:40Z', '2026-10-24T16:21:30Z'],
  ['CGN', 50.8659, 7.1427, 'Europe/Berlin', '2026-10-25T10:00:00Z', '2026-10-25T06:11:26Z', '2026-10-25T16:19:29Z'],
]

const ms = (iso: string) => Date.parse(iso)
const near = (actual: number, iso: string) => expect(Math.abs(actual - ms(iso))).toBeLessThanOrEqual(2 * MINUTE)

describe('sunTimes', () => {
  it.each(NOAA)('%s matches NOAA within 2 minutes on the day of %s', (_name, lat, lng, timeZone, at, sunrise, sunset) => {
    const sun = sunTimes(ms(at), lat, lng, timeZone)!
    near(sun.sunrise, sunrise)
    near(sun.sunset, sunset)
  })

  it('uses the local date, not the UTC one, in a zone far ahead of UTC', () => {
    // 3 am on Sunday 11 October in Tokyo is still Saturday the 10th in UTC.
    const narita = sunTimes(ms('2026-10-10T18:00:00Z'), 35.7653, 140.3854, 'Asia/Tokyo')!
    near(narita.sunrise, '2026-10-10T20:41:24Z')
    near(narita.sunset, '2026-10-11T08:09:09Z')
    // Kiritimati keeps UTC+14 at 157°W: one minute after midnight and one minute before the next both give 10 October.
    for (const at of ['2026-10-09T10:01:00Z', '2026-10-10T09:59:00Z']) {
      const kiritimati = sunTimes(ms(at), 1.9863, -157.35, 'Pacific/Kiritimati')!
      near(kiritimati.sunrise, '2026-10-09T16:14:06Z')
      near(kiritimati.sunset, '2026-10-10T04:18:59Z')
    }
  })

  it('has no sunrise or sunset in polar night or polar day', () => {
    // Utqiaġvik, Alaska (BRW), in midwinter and midsummer.
    expect(sunTimes(ms('2026-12-21T20:00:00Z'), 71.2854, -156.766, 'America/Anchorage')).toBeNull()
    expect(sunTimes(ms('2026-06-21T20:00:00Z'), 71.2854, -156.766, 'America/Anchorage')).toBeNull()
  })
})

describe('isDaytime', () => {
  const sun = { sunrise: ms('2026-10-10T11:47:00Z'), sunset: ms('2026-10-10T23:12:00Z') }

  it('is true from sunrise up to sunset', () => {
    expect(isDaytime(sun.sunrise - 1, sun)).toBe(false)
    expect(isDaytime(sun.sunrise, sun)).toBe(true)
    expect(isDaytime(sun.sunset - 1, sun)).toBe(true)
    expect(isDaytime(sun.sunset, sun)).toBe(false)
  })
})
