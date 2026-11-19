import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { clockTime, hasMark, key, keepsTheSameClock, pair, place, spoken, yours, zoneName } from '../../src/copy/clockLabel'
import { prefers24Hour } from '../../src/time/zoned'

/** Whose time a time is (time labels design §3.1): the app's ClockLabelTests, and the shared cases both sides run. */

interface Case {
  name: string
  kind: 'yours' | 'place' | 'pair' | 'key'
  at: string
  yourZone: string
  zone?: string
  city?: string
  locale: string
  expected: string
}

const shared = JSON.parse(readFileSync(new URL('../fixtures/trip-map/clock-label-cases.json', import.meta.url), 'utf8')) as { cases: Case[] }

/** The expected words use a plain space where the site, as Apple's formatter, puts a narrow one before AM or PM. */
const plain = (text: string) => text.replace(/ /g, ' ')

function words(c: Case): string {
  const at = Date.parse(c.at)
  const h24 = prefers24Hour(c.locale.replace('_', '-'))
  switch (c.kind) {
    case 'yours': return yours(at, c.yourZone, h24)
    case 'place': return place(at, c.zone as string, c.city as string, h24)
    case 'pair': return pair(at, c.zone ?? null, c.yourZone, h24)
    case 'key': return key(c.yourZone, at)
  }
}

describe('the shared clock label cases', () => {
  it('has all 15', () => {
    expect(shared.cases).toHaveLength(15)
  })

  for (const c of shared.cases) {
    it(c.name, () => {
      expect(plain(words(c))).toBe(c.expected)
    })
  }
})

describe('clockTime', () => {
  it('writes a 12-hour time with a narrow space before AM or PM, as the app', () => {
    expect(clockTime(Date.parse('2026-11-19T21:35:00Z'), 'America/New_York', false)).toBe('4:35 PM')
  })

  it('writes a 24-hour morning hour without a leading zero, as Apple does', () => {
    expect(clockTime(Date.parse('2026-11-19T10:05:00Z'), 'America/New_York', true)).toBe('5:05')
    expect(clockTime(Date.parse('2026-11-20T05:10:00Z'), 'America/New_York', true)).toBe('0:10')
  })
})

describe('spoken', () => {
  it('says "your time" for a 12-hour time\'s L', () => {
    expect(plain(spoken('Lands Anchorage 12:35 PM · 4:35 PM L'))).toBe('Lands Anchorage 12:35 PM · 4:35 PM your time')
  })

  it('says "your time" for a 24-hour time\'s L', () => {
    expect(spoken('Halfway at about 16:35 L')).toBe('Halfway at about 16:35 your time')
  })

  it('keeps what follows a time mid-line', () => {
    expect(plain(spoken('Sat 1:40 PM L · Layover in Denver'))).toBe('Sat 1:40 PM your time · Layover in Denver')
  })

  it('says it for every L in the words', () => {
    expect(plain(spoken('9:02 AM L – 1:15 PM L'))).toBe('9:02 AM your time – 1:15 PM your time')
  })

  it('leaves an L that starts a word alone', () => {
    expect(spoken('Out over the Pacific at 9 Lisbon')).toBe('Out over the Pacific at 9 Lisbon')
    expect(plain(spoken('4:35 PM Lands'))).toBe('4:35 PM Lands')
  })

  it("leaves a city starting with L and an apostrophe alone", () => {
    expect(plain(spoken("sunrise at 7:02 AM L'Aquila"))).toBe("sunrise at 7:02 AM L'Aquila")
  })

  it('leaves a word ending in "am" alone', () => {
    expect(spoken('Over Birmingham L')).toBe('Over Birmingham L')
  })

  it("leaves a city's time alone", () => {
    expect(plain(spoken('sunrise at 7:02 AM Cologne'))).toBe('sunrise at 7:02 AM Cologne')
  })
})

describe('hasMark', () => {
  it("is true for a marked time, and false for a city's or none", () => {
    expect(hasMark('Halfway at about 12:05 PM L')).toBe(true)
    expect(hasMark('Halfway at 16:35 L')).toBe(true)
    expect(hasMark('sunrise at 7:02 AM Cologne')).toBe(false)
    expect(hasMark('2,140 mi flown · 1,960 to go')).toBe(false)
  })

  it('gives the same answer twice in a row', () => {
    expect(hasMark('4:35 PM L')).toBe(true)
    expect(hasMark('4:35 PM L')).toBe(true)
  })
})

describe('zoneName', () => {
  it('follows summer time', () => {
    expect(zoneName('America/New_York', Date.parse('2026-01-15T12:00:00Z'))).toBe('Eastern Standard Time')
    expect(zoneName('America/New_York', Date.parse('2026-07-01T12:00:00Z'))).toBe('Eastern Daylight Time')
  })

  it('is the standard name for a zone with no summer time', () => {
    expect(zoneName('America/Phoenix', Date.parse('2026-07-01T12:00:00Z'))).toBe('Mountain Standard Time')
  })

  it('names UTC', () => {
    expect(zoneName('UTC', Date.parse('2026-07-01T12:00:00Z'))).toBe('Coordinated Universal Time')
  })

  it("is the zone's own name where the browser can't name it", () => {
    expect(zoneName('Not/A_Zone', 0)).toBe('Not/A_Zone')
  })
})

describe('keepsTheSameClock', () => {
  it('compares the offsets at that moment', () => {
    const between = Date.parse('2026-03-08T07:30:00Z')
    expect(keepsTheSameClock('America/Detroit', 'America/New_York', between)).toBe(true)
    expect(keepsTheSameClock('America/Chicago', 'America/New_York', between)).toBe(false)
  })
})
