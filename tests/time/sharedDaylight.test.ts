import { describe, expect, it } from 'vitest'
import { sharedDaylight } from '../../src/time/sharedDaylight'

// The app's SharedDaylightTests, case for case, with times written as UTC instants.
// Tokyo is UTC+9; New York is UTC-4 in June (EDT) and UTC-5 in January (EST).
const NY = 'America/New_York'
const tokyo = (iso: string) => Date.parse(`${iso}+09:00`)
const newYork = (iso: string) => Date.parse(`${iso}-04:00`)
const newYorkWinter = (iso: string) => Date.parse(`${iso}-05:00`)
const hours = (h: number, m = 0) => h + m / 60

describe('sharedDaylight', () => {
  it('splits a Tokyo day that wraps past midnight on Eastern time into a morning sliver and an afternoon', () => {
    // Pilot 04:22–18:54 JST is 15:22–05:54 on the home clock; home daylight is 05:30–20:30.
    const spans = sharedDaylight(
      { sunrise: tokyo('2026-06-10T04:22'), sunset: tokyo('2026-06-10T18:54') },
      { sunrise: newYork('2026-06-10T05:30'), sunset: newYork('2026-06-10T20:30') },
      NY,
    )
    expect(spans).toHaveLength(2)
    expect(spans[0].start).toBeCloseTo(hours(5, 30), 3)
    expect(spans[0].end).toBeCloseTo(hours(5, 54), 3)
    expect(spans[1].start).toBeCloseTo(hours(15, 22), 3)
    expect(spans[1].end).toBeCloseTo(hours(20, 30), 3)
  })

  it('looks only at the time of day, not the date, of each sunrise and sunset', () => {
    const home = { sunrise: newYork('2026-06-10T05:30'), sunset: newYork('2026-06-10T20:30') }
    const sameDay = sharedDaylight({ sunrise: tokyo('2026-06-10T04:22'), sunset: tokyo('2026-06-10T18:54') }, home, NY)
    const nextDay = sharedDaylight({ sunrise: tokyo('2026-06-11T04:22'), sunset: tokyo('2026-06-11T18:54') }, home, NY)
    expect(nextDay).toEqual(sameDay)
  })

  it('gives the pilot’s daylight when it sits inside home’s', () => {
    const spans = sharedDaylight(
      { sunrise: newYork('2026-06-10T06:00'), sunset: newYork('2026-06-10T18:00') },
      { sunrise: newYork('2026-06-10T05:00'), sunset: newYork('2026-06-10T19:00') },
      NY,
    )
    expect(spans).toEqual([{ start: 6, end: 18 }])
  })

  it('gives nothing when the pilot’s daylight is all in home’s night', () => {
    // January: 14 hours apart. Pilot 08:00–16:00 JST is 18:00–02:00 on the home clock; home daylight is 07:00–17:00.
    const spans = sharedDaylight(
      { sunrise: tokyo('2026-01-10T08:00'), sunset: tokyo('2026-01-10T16:00') },
      { sunrise: newYorkWinter('2026-01-10T07:00'), sunset: newYorkWinter('2026-01-10T17:00') },
      NY,
    )
    expect(spans).toEqual([])
  })

  it('gives nothing for spans that only touch', () => {
    // Pilot 04:00–16:30 JST is 15:00–03:30 on the home clock; home daylight is 03:30–14:00.
    const spans = sharedDaylight(
      { sunrise: tokyo('2026-06-10T04:00'), sunset: tokyo('2026-06-10T16:30') },
      { sunrise: newYork('2026-06-10T03:30'), sunset: newYork('2026-06-10T14:00') },
      NY,
    )
    expect(spans).toEqual([])
  })

  it('gives nothing when home’s sunrise isn’t before its sunset on home’s clock, as with polar data', () => {
    const spans = sharedDaylight(
      { sunrise: newYork('2026-06-10T06:00'), sunset: newYork('2026-06-10T18:00') },
      { sunrise: newYork('2026-06-10T20:00'), sunset: newYork('2026-06-11T04:00') },
      NY,
    )
    expect(spans).toEqual([])
  })

  it('counts whole seconds: a span within the same second is dropped, one of 30 seconds is kept', () => {
    const spans = sharedDaylight(
      { sunrise: newYork('2026-06-10T19:00:00.4'), sunset: newYork('2026-06-10T23:00') },
      { sunrise: newYork('2026-06-10T05:00'), sunset: newYork('2026-06-10T19:00:00.9') },
      NY,
    )
    expect(spans).toEqual([])
    const kept = sharedDaylight(
      { sunrise: newYork('2026-06-10T18:59:30'), sunset: newYork('2026-06-10T23:00') },
      { sunrise: newYork('2026-06-10T05:00'), sunset: newYork('2026-06-10T19:00') },
      NY,
    )
    expect(kept).toHaveLength(1)
    expect(kept[0].start).toBeCloseTo(18 + 59.5 / 60, 6)
  })
})
