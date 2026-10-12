import { describe, expect, it } from 'vitest'
import {
  ageText,
  agoText,
  arrivalWhenText,
  cardCountdown,
  clockText,
  clockWithDayText,
  daysText,
  delayText,
  departureText,
  dialTimeText,
  leaveWhenText,
  longDateTimeText,
  mapAirportTimeText,
  narrativeCountdown,
  ordinalSuffix,
  shortTimeText,
  spokenDuration,
  timeWithZone,
  tripCardDepartsText,
  tripDepartsText,
} from '../../src/copy/format'

const NY = 'America/New_York'
const MIN = 60_000
const H = 60 * MIN
const D = 24 * H

describe('ordinalSuffix', () => {
  it.each([[1, 'st'], [2, 'nd'], [3, 'rd'], [4, 'th'], [11, 'th'], [12, 'th'], [13, 'th'], [21, 'st'], [22, 'nd'], [23, 'rd'], [31, 'st']])(
    '%i → %s', (day, suffix) => expect(ordinalSuffix(day)).toBe(suffix),
  )
})

describe('daysText', () => {
  it('pluralizes', () => {
    expect(daysText(1)).toBe('1 day')
    expect(daysText(4)).toBe('4 days')
  })
})

describe('narrativeCountdown', () => {
  it.each([
    [0, 'now!'], [-5000, 'now!'], [30_000, '<1m'], [59_999, '<1m'], [8 * MIN, '8m'],
    [8 * H + 8 * MIN, '8h 8m'], [D + 5 * MIN, '1d 0h 5m'], [2 * D + 8 * H + 8 * MIN, '2d 8h 8m'],
  ])('%i ms → %s', (ms, text) => expect(narrativeCountdown(ms)).toBe(text))
})

describe('cardCountdown', () => {
  it('pads every unit after the first and switches to seconds under an hour', () => {
    expect(cardCountdown(2 * D + 8 * H + 8 * MIN)).toEqual([
      { value: '2', unit: 'd' }, { value: '08', unit: 'h' }, { value: '08', unit: 'm' },
    ])
    expect(cardCountdown(8 * H + 5 * MIN)).toEqual([{ value: '8', unit: 'h' }, { value: '05', unit: 'm' }])
    expect(cardCountdown(7 * MIN + 5000)).toEqual([{ value: '7', unit: 'm' }, { value: '05', unit: 's' }])
    expect(cardCountdown(42_000)).toEqual([{ value: '0', unit: 'm' }, { value: '42', unit: 's' }])
  })

  it('returns null at zero, meaning "Now!"', () => expect(cardCountdown(0)).toBeNull())
})

describe('ageText and agoText', () => {
  it.each([[3000, null], [42_000, '42s'], [187_000, '3m 07s'], [7_500_000, '2h 05m'], [25 * H, '>1 day']])(
    '%i ms → %s', (ms, text) => expect(ageText(ms)).toBe(text),
  )

  it('says "just now" under five seconds', () => {
    expect(agoText('Checked', 2000)).toBe('Checked just now')
    expect(agoText('Checked', 42_000)).toBe('Checked 42s ago')
  })
})

describe('delayText', () => {
  it.each([[150, '2 hours 30 minutes'], [60, '1 hour'], [45, '45 minutes'], [61, '1 hour 1 minute'], [1, '1 minute'], [-40, '40 minutes']])(
    '%i → %s', (minutes, text) => expect(delayText(minutes)).toBe(text),
  )
})

describe('clock times', () => {
  const afternoon = Date.UTC(2026, 9, 9, 17, 10) // 1:10pm EDT

  it('prints 12-hour lowercase or 24-hour', () => {
    expect(clockText(afternoon, NY, false)).toBe('1:10pm')
    expect(clockText(afternoon, NY, true)).toBe('13:10')
    expect(clockText(Date.UTC(2026, 9, 9, 4, 5), NY, false)).toBe('12:05am')
    expect(clockText(Date.UTC(2026, 9, 9, 4, 5), NY, true)).toBe('00:05')
    expect(clockText(Date.UTC(2026, 9, 9, 16, 0), NY, false)).toBe('12:00pm')
  })

  it('prints the location card clock like iOS, with a narrow space before AM or PM', () => {
    expect(shortTimeText(afternoon, NY, false)).toBe('1:10\u202FPM')
    expect(shortTimeText(afternoon, NY, true)).toBe('13:10')
    expect(shortTimeText(Date.UTC(2026, 9, 9, 4, 5), NY, false)).toBe('12:05\u202FAM')
    expect(shortTimeText(Date.UTC(2026, 9, 9, 4, 5), NY, true)).toBe('00:05')
    expect(shortTimeText(Date.UTC(2026, 9, 9, 16, 0), NY, false)).toBe('12:00\u202FPM')
    expect(shortTimeText(afternoon, 'America/Anchorage', false)).toBe('9:10\u202FAM')
  })

  it('prints sun dial labels as the app does, with a and p, or 24-hour', () => {
    expect(dialTimeText(Date.UTC(2026, 9, 10, 12, 12), NY, false)).toBe('8:12a')
    expect(dialTimeText(Date.UTC(2026, 9, 10, 22, 41), NY, false)).toBe('6:41p')
    expect(dialTimeText(Date.UTC(2026, 9, 10, 12, 12), NY, true)).toBe('08:12')
    expect(dialTimeText(Date.UTC(2026, 9, 10, 22, 41), NY, true)).toBe('18:41')
    expect(dialTimeText(Date.UTC(2026, 9, 9, 4, 5), NY, false)).toBe('12:05a')
    expect(dialTimeText(Date.UTC(2026, 9, 9, 16, 0), NY, false)).toBe('12:00p')
  })

  it('prints the in-flight map’s airport times as the app does: the weekday’s first two letters, then the time', () => {
    // Monday 12 October 2026: 5:40 AM in Anchorage, 2:40 PM in New York.
    expect(mapAirportTimeText(Date.UTC(2026, 9, 12, 13, 40), 'America/Anchorage', false)).toBe('MO 5:40AM')
    expect(mapAirportTimeText(Date.UTC(2026, 9, 12, 18, 40), NY, false)).toBe('MO 2:40PM')
    expect(mapAirportTimeText(Date.UTC(2026, 9, 12, 13, 40), 'America/Anchorage', true)).toBe('MO 05:40')
    expect(mapAirportTimeText(Date.UTC(2026, 9, 11, 4, 5), NY, false)).toBe('SU 12:05AM')
    // The airport's own weekday, where it isn't UTC's: a night flight out of New York, a morning in Tokyo.
    expect(mapAirportTimeText(Date.UTC(2026, 9, 12, 3, 0), NY, false)).toBe('SU 11:00PM')
    expect(mapAirportTimeText(Date.UTC(2026, 9, 11, 20, 0), 'Asia/Tokyo', false)).toBe('MO 5:00AM')
  })

  it('adds the zone for {T}', () => {
    expect(timeWithZone(afternoon, NY, false)).toBe('1:10pm EDT')
    expect(timeWithZone(afternoon, 'Europe/Berlin', true)).toBe('19:10 GMT+2')
  })
})

describe('clockWithDayText', () => {
  const now = Date.UTC(2026, 9, 9, 12, 0) // Fri 9 Oct, 8:00am EDT

  it('gives just the time for today', () => {
    expect(clockWithDayText(Date.UTC(2026, 9, 9, 11, 59), now, NY, false)).toBe('7:59am')
    expect(clockWithDayText(Date.UTC(2026, 9, 9, 11, 59), now, NY, true)).toBe('07:59')
  })

  it('adds the weekday for an earlier day this week', () => {
    expect(clockWithDayText(Date.UTC(2026, 9, 8, 11, 59), now, NY, false)).toBe('Thu 7:59am')
    expect(clockWithDayText(Date.UTC(2026, 9, 8, 11, 59), now, NY, true)).toBe('Thu 07:59')
    expect(clockWithDayText(Date.UTC(2026, 9, 3, 11, 59), now, NY, false)).toBe('Sat 7:59am') // six days back
  })

  it('adds the date once the weekday would repeat today’s', () => {
    expect(clockWithDayText(Date.UTC(2026, 9, 2, 11, 59), now, NY, false)).toBe('Oct 2, 7:59am') // a week back: also a Friday
    expect(clockWithDayText(Date.UTC(2026, 9, 2, 11, 59), now, NY, true)).toBe('Oct 2, 07:59')
    expect(clockWithDayText(Date.UTC(2026, 8, 20, 11, 59), now, NY, false)).toBe('Sep 20, 7:59am')
  })

  it('gives the date for a time ahead of now, such as after the clock was set back', () => {
    expect(clockWithDayText(Date.UTC(2026, 9, 10, 11, 59), now, NY, false)).toBe('Oct 10, 7:59am')
  })

  it('decides what counts as today in the viewer’s zone', () => {
    const lateNight = Date.UTC(2026, 9, 9, 3, 30) // Thu 8 Oct, 11:30pm EDT: already Friday in UTC
    expect(clockWithDayText(lateNight, now, NY, false)).toBe('Thu 11:30pm')
    expect(clockWithDayText(lateNight, now, 'UTC', false)).toBe('3:30am')
  })
})

describe('departureText', () => {
  const now = Date.UTC(2026, 9, 8, 13, 30) // Thu 8 Oct, 9:30am EDT

  it('says today, tomorrow, or the weekday and date', () => {
    expect(departureText(Date.UTC(2026, 9, 8, 22, 0), now, NY, false)).toBe('today at 6:00pm')
    expect(departureText(Date.UTC(2026, 9, 9, 10, 30), now, NY, false)).toBe('tomorrow at 6:30am')
    expect(departureText(Date.UTC(2026, 9, 9, 10, 30), now, NY, true)).toBe('tomorrow at 06:30')
    expect(departureText(Date.UTC(2026, 9, 11, 10, 30), now, NY, false)).toBe('Sunday the 11th at 6:30am')
  })

  it('compares calendar days in the viewer’s zone', () => {
    const lateNight = Date.UTC(2026, 9, 8, 3, 30) // Wed 7 Oct, 11:30pm EDT
    expect(departureText(Date.UTC(2026, 9, 8, 10, 30), lateNight, NY, false)).toBe('tomorrow at 6:30am')
  })

  it('takes the ordinal from the same zone as the date (C5)', () => {
    // 03:00Z on Nov 2 is still Sun Nov 1 in New York: the zone says "1st", UTC says "2nd".
    expect(departureText(Date.UTC(2026, 10, 2, 3, 0), Date.UTC(2026, 9, 29, 13, 0), NY, false)).toBe(
      'Sunday the 1st at 10:00pm',
    )
  })
})

describe('long dates', () => {
  it('formats the homecoming date for {HB}', () => {
    expect(longDateTimeText(Date.UTC(2026, 9, 13, 0, 2), NY, false)).toBe('Monday October 12th at 8:02pm EDT')
  })

  it('formats the arrival card subtitle like iOS', () => {
    expect(arrivalWhenText(Date.UTC(2026, 9, 10, 18, 50), NY, false)).toBe('Sat, Oct 10 at 2:50\u202FPM')
    expect(arrivalWhenText(Date.UTC(2026, 9, 10, 18, 50), NY, true)).toBe('Sat, Oct 10 at 14:50')
  })

  it('formats the leave card subtitle, with no "17:57pm" on 24-hour clocks', () => {
    expect(leaveWhenText(Date.UTC(2026, 9, 9, 8, 0), NY, false)).toBe('Departs Friday October 9th at 4:00am')
    expect(leaveWhenText(Date.UTC(2026, 9, 9, 8, 0), NY, true)).toBe('Departs Friday October 9th at 04:00')
    expect(tripDepartsText('Louisville', Date.UTC(2026, 9, 9, 8, 0), NY, false)).toBe(
      'Trip departs Louisville Friday October 9th at 4:00am',
    )
  })

  it('takes the ordinal from the same zone as the date (C5)', () => {
    // 02:00Z on Oct 2 is still Thu Oct 1 in New York: the zone says "1st", UTC says "2nd".
    expect(leaveWhenText(Date.UTC(2026, 9, 2, 2, 0), NY, false)).toBe('Departs Thursday October 1st at 10:00pm')
  })
})

describe('spokenDuration', () => {
  it.each([
    [0, 'now'],
    [-5 * MIN, 'now'],
    [Number.NaN, 'now'],
    [30_000, 'less than a minute'],
    [MIN, '1 minute'],
    [49 * MIN + 59_000, '49 minutes'],
    [2 * H, '2 hours'],
    [H + MIN, '1 hour, 1 minute'],
    [D + 6 * H + 59 * MIN, '1 day, 6 hours, 59 minutes'],
    [2 * D + 5 * MIN, '2 days, 5 minutes'],
    [11 * D + 8 * H + 39 * MIN, '11 days, 8 hours, 39 minutes'],
  ])('%s ms reads as "%s"', (ms, words) => {
    expect(spokenDuration(ms)).toBe(words)
  })
})

describe('tripCardDepartsText', () => {
  const now = Date.UTC(2026, 9, 8, 13, 30) // Thu 8 Oct, 9:30am EDT

  it('says today, tomorrow, or the short weekday and date', () => {
    expect(tripCardDepartsText(Date.UTC(2026, 9, 8, 22, 0), now, NY, false)).toBe('Departs today at 6:00pm')
    expect(tripCardDepartsText(Date.UTC(2026, 9, 9, 10, 30), now, NY, false)).toBe('Departs tomorrow at 6:30am')
    expect(tripCardDepartsText(Date.UTC(2026, 9, 13, 15, 32), now, NY, false)).toBe('Departs Tue Oct 13 at 11:32am')
  })

  it('keeps the date on a past day, and writes a single-digit day without padding', () => {
    expect(tripCardDepartsText(Date.UTC(2026, 9, 7, 15, 0), now, NY, false)).toBe('Departs Wed Oct 7 at 11:00am') // a past day keeps its date, as the app does
    expect(tripCardDepartsText(Date.UTC(2026, 10, 3, 15, 0), now, NY, false)).toBe('Departs Tue Nov 3 at 10:00am') // single-digit day, next month, after DST ends
  })

  it('dates a later departure in the given zone, not UTC', () => {
    expect(tripCardDepartsText(Date.UTC(2026, 9, 14, 1, 30), now, NY, false)).toBe('Departs Tue Oct 13 at 9:30pm')
    // 9:30pm Tue 13 Oct in Honolulu is already Wed 14 Oct in both UTC and New York.
    expect(tripCardDepartsText(Date.UTC(2026, 9, 14, 7, 30), now, 'Pacific/Honolulu', false)).toBe('Departs Tue Oct 13 at 9:30pm')
  })

  it('uses 24-hour time when the viewer does', () => {
    expect(tripCardDepartsText(Date.UTC(2026, 9, 13, 15, 32), now, NY, true)).toBe('Departs Tue Oct 13 at 11:32')
  })

  it('uses 24-hour time on the today and tomorrow lines too', () => {
    expect(tripCardDepartsText(Date.UTC(2026, 9, 8, 22, 0), now, NY, true)).toBe('Departs today at 18:00')
    expect(tripCardDepartsText(Date.UTC(2026, 9, 9, 10, 30), now, NY, true)).toBe('Departs tomorrow at 06:30')
  })

  it('compares calendar days in the given zone', () => {
    const lateNight = Date.UTC(2026, 9, 8, 3, 30) // Wed 7 Oct, 11:30pm EDT
    expect(tripCardDepartsText(Date.UTC(2026, 9, 8, 10, 30), lateNight, NY, false)).toBe('Departs tomorrow at 6:30am')
  })

  it('compares calendar days in a zone other than this machine’s', () => {
    // 11:30pm Wed 7 Oct in Honolulu; 6:30am Thu there is tomorrow, though it's the same day in UTC and New York.
    const HNL = 'Pacific/Honolulu'
    expect(tripCardDepartsText(Date.UTC(2026, 9, 8, 16, 30), Date.UTC(2026, 9, 8, 9, 30), HNL, false)).toBe('Departs tomorrow at 6:30am')
  })
})
