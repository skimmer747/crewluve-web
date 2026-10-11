import { describe, expect, it } from 'vitest'
import { spokenTimeDifference, sunDialLabel, timeDifference } from '../../src/copy/location'

const NY = 'America/New_York'
const OCT = Date.UTC(2026, 9, 10, 16) // Saturday 10 October, noon in New York

describe('timeDifference', () => {
  it('compares the pilot’s zone with home’s at that moment', () => {
    expect(timeDifference(OCT, 'America/Anchorage', NY)).toEqual({ hours: 4, minutes: 0, direction: 'behind' })
    expect(timeDifference(OCT, 'Asia/Kolkata', NY)).toEqual({ hours: 9, minutes: 30, direction: 'ahead' })
    expect(timeDifference(OCT, 'America/St_Johns', 'America/Halifax')).toEqual({ hours: 0, minutes: 30, direction: 'ahead' })
    // Behind by a whole number of hours and some minutes, as for a family at home in a half-hour zone.
    expect(timeDifference(OCT, NY, 'Asia/Kolkata')).toEqual({ hours: 9, minutes: 30, direction: 'behind' })
  })

  it('calls different zones with the same clock time the same time', () => {
    expect(timeDifference(OCT, 'America/Detroit', NY)).toEqual({ hours: 0, minutes: 0, direction: 'same' })
  })

  it('follows the clocks as they change', () => {
    // Europe leaves summer time on 25 October and the US on 1 November, so Cologne is 6 hours ahead of New York, then 5.
    expect(timeDifference(OCT, 'Europe/Berlin', NY)).toMatchObject({ hours: 6, direction: 'ahead' })
    expect(timeDifference(Date.UTC(2026, 9, 28, 16), 'Europe/Berlin', NY)).toMatchObject({ hours: 5, direction: 'ahead' })
  })
})

describe('spokenTimeDifference', () => {
  it('says the hours and minutes in words for screen readers', () => {
    expect(spokenTimeDifference({ hours: 4, minutes: 0, direction: 'behind' })).toBe('4 hours behind you')
    expect(spokenTimeDifference({ hours: 1, minutes: 30, direction: 'ahead' })).toBe('1 hour 30 minutes ahead of you')
    expect(spokenTimeDifference({ hours: 0, minutes: 30, direction: 'ahead' })).toBe('30 minutes ahead of you')
    expect(spokenTimeDifference({ hours: 0, minutes: 0, direction: 'same' })).toBe('same time as you')
  })
})

describe('sunDialLabel', () => {
  const sun = { sunrise: Date.UTC(2026, 9, 10, 16, 12), sunset: Date.UTC(2026, 9, 11, 2, 41) } // 8:12 AM and 6:41 PM in Anchorage
  const ANC = 'America/Anchorage'

  it('reads the sunrise, the sunset and whether it’s day or night there', () => {
    expect(sunDialLabel(sun, Date.UTC(2026, 9, 10, 17), ANC, false, 'Anchorage')).toBe('Sunrise 8:12\u202FAM, sunset 6:41\u202FPM, daytime in Anchorage')
    expect(sunDialLabel(sun, Date.UTC(2026, 9, 10, 15), ANC, false, 'Anchorage')).toBe('Sunrise 8:12\u202FAM, sunset 6:41\u202FPM, nighttime in Anchorage')
  })

  it('uses 24-hour times when the visitor does', () => {
    expect(sunDialLabel(sun, Date.UTC(2026, 9, 10, 17), ANC, true, 'Anchorage')).toBe('Sunrise 08:12, sunset 18:41, daytime in Anchorage')
  })
})
