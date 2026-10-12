import { describe, expect, it } from 'vitest'
import { isDaytime, isSunUp, sunAltitude, SUN_UP_ALTITUDE, sunTimes } from '../../src/time/sun'
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
  // The southern hemisphere: Sydney in its summer and winter, and São Paulo.
  ['SYD', -33.9461, 151.1772, 'Australia/Sydney', '2026-12-21T01:00:00Z', '2026-12-20T18:40:41Z', '2026-12-21T09:05:35Z'],
  ['SYD', -33.9461, 151.1772, 'Australia/Sydney', '2026-06-21T02:00:00Z', '2026-06-20T21:00:19Z', '2026-06-21T06:53:43Z'],
  ['GRU', -23.4356, -46.4731, 'America/Sao_Paulo', '2026-12-21T15:00:00Z', '2026-12-21T08:16:40Z', '2026-12-21T21:51:23Z'],
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
    const early = sunTimes(ms('2026-10-09T10:01:00Z'), 1.9863, -157.35, 'Pacific/Kiritimati')!
    const late = sunTimes(ms('2026-10-10T09:59:00Z'), 1.9863, -157.35, 'Pacific/Kiritimati')!
    near(early.sunrise, '2026-10-09T16:14:06Z')
    near(early.sunset, '2026-10-10T04:18:59Z')
    // Every moment of one local day gives exactly the same times.
    expect(late).toEqual(early)
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

const SDF = { lat: 38.1746, lng: -85.7382 }

/** The moment the sun crosses the sunrise and sunset horizon between `from` and `to`, to the second, by halving. */
function crossing(lat: number, lng: number, from: number, to: number): number {
  const upAtStart = isSunUp(from, lat, lng)
  let [lo, hi] = [from, to]
  while (hi - lo > 1000) {
    const mid = Math.round((lo + hi) / 2)
    if (isSunUp(mid, lat, lng) === upAtStart) lo = mid
    else hi = mid
  }
  return hi
}

describe('sunAltitude', () => {
  it('is 90° less the latitude plus the declination at solar noon on the June solstice', () => {
    // Louisville's solar noon on 21 June 2026 is about 17:45 UTC: 90 − 38.17 + 23.44 = 75.27°.
    expect(sunAltitude(ms('2026-06-21T17:45:00Z'), SDF.lat, SDF.lng)).toBeCloseTo(75.27, 0)
  })

  it('is as far below the horizon at local midnight', () => {
    expect(sunAltitude(ms('2026-06-22T05:45:00Z'), SDF.lat, SDF.lng)).toBeCloseTo(-28.39, 0)
  })

  it('crosses the horizon at the US Naval Observatory’s sunrise and sunset for Louisville, within 2 minutes', () => {
    // aa.usno.navy.mil: on 15 October 2026 the sun rises at 07:52 and sets at 19:05 EDT; on 15 March, 07:54 and 19:50.
    for (const [rise, set] of [
      ['2026-10-15T11:52:00Z', '2026-10-15T23:05:00Z'],
      ['2026-03-15T11:54:00Z', '2026-03-15T23:50:00Z'],
    ]) {
      expect(Math.abs(crossing(SDF.lat, SDF.lng, ms(rise) - 60 * MINUTE, ms(rise) + 60 * MINUTE) - ms(rise))).toBeLessThanOrEqual(2 * MINUTE)
      expect(Math.abs(crossing(SDF.lat, SDF.lng, ms(set) - 60 * MINUTE, ms(set) + 60 * MINUTE) - ms(set))).toBeLessThanOrEqual(2 * MINUTE)
    }
  })

  it('crosses the horizon within a minute of sunTimes’ sunrise and sunset, its own NOAA position', () => {
    for (const [name, lat, lng, timeZone, at] of NOAA) {
      const sun = sunTimes(ms(at), lat, lng, timeZone)!
      expect(Math.abs(crossing(lat, lng, sun.sunrise - 30 * MINUTE, sun.sunrise + 30 * MINUTE) - sun.sunrise), `${name} sunrise`).toBeLessThan(MINUTE)
      expect(Math.abs(crossing(lat, lng, sun.sunset - 30 * MINUTE, sun.sunset + 30 * MINUTE) - sun.sunset), `${name} sunset`).toBeLessThan(MINUTE)
    }
  })
})

describe('isSunUp', () => {
  it('counts the sun as up above −0.833°, the sunrise and sunset horizon', () => {
    expect(SUN_UP_ALTITUDE).toBe(-0.833)
    const rise = crossing(SDF.lat, SDF.lng, ms('2026-10-15T10:00:00Z'), ms('2026-10-15T13:00:00Z'))
    expect(isSunUp(rise - 1000, SDF.lat, SDF.lng)).toBe(false)
    expect(isSunUp(rise, SDF.lat, SDF.lng)).toBe(true)
    expect(sunAltitude(rise, SDF.lat, SDF.lng)).toBeGreaterThan(SUN_UP_ALTITUDE)
    expect(sunAltitude(rise - 1000, SDF.lat, SDF.lng)).toBeLessThanOrEqual(SUN_UP_ALTITUDE)
  })

  it('sees the midnight sun and the polar night at Utqiaġvik', () => {
    expect(isSunUp(ms('2026-06-21T08:00:00Z'), 71.2854, -156.766)).toBe(true) // local midnight
    expect(isSunUp(ms('2026-12-21T21:00:00Z'), 71.2854, -156.766)).toBe(false) // local noon
  })
})
