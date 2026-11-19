import { describe, expect, it } from 'vitest'
import { landsText } from '../../src/copy/facts'
import { Sentence } from '../../src/copy/narrative'
import {
  barArrival, cardHeading, flightStatus, gateLine, landedText, landingCountdown, landingLine, landsAt, liveSummary, returnedText, spokenLiveLabel,
  spokenMinutes, topPill, tripMapSummary,
} from '../../src/copy/tripMap'
import type { AirportIndex } from '../../src/data/airports'
import { makeMapFlight } from '../../src/map/mapFlight'
import { makeTripMap, type MapLeg, type TripMap } from '../../src/map/tripMap'
import { airport, at, caseFlight, LIVE_CASES } from '../map/liveCases'

const NY = 'America/New_York'

/** A shared case's flight as the map's leg at one of its moments: its real times then, with Philadelphia's or Cologne's names. */
function caseLeg(name: string, moment = 0): { leg: MapLeg; t: number } {
  const flightCase = LIVE_CASES.flights.find((f) => f.name === name)!
  const m = flightCase.moments[moment]
  const flight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), airport(flightCase.from), airport(flightCase.to), caseFlight(flightCase.flight))!
  const city = (code: string) => ({ SDF: 'Louisville', PHL: 'Philadelphia', CGN: 'Cologne', CVG: 'Cincinnati' })[code] ?? code
  const zone = (code: string) => (code === 'CGN' ? 'Europe/Berlin' : NY)
  const mark = (code: string) => ({ code, city: city(code), place: airport(code), timeZone: zone(code) })
  return {
    leg: { id: 'f1', kind: 'flight', origin: mark(flightCase.from), destination: mark(flightCase.to), start: at(m.start), end: at(m.end), flightNumber: 'UPS207', flight },
    t: at(m.at),
  }
}

/** The same leg on the schedule alone. */
const scheduleOnly = ({ flight: _, ...leg }: MapLeg): MapLeg => leg

describe("the card's bar and the full map's pill (Stage 3 spec §9)", () => {
  it("say the real plane's label", () => {
    const { leg, t } = caseLeg('ahead, in the air')
    expect(flightStatus(leg, t)).toBe('14 min ahead')
    const estimated = caseLeg('ahead, in the air', 2)
    expect(flightStatus(estimated.leg, estimated.t)).toBe('About 14 min ahead')
    const late = caseLeg('still on the ground twenty minutes after')
    expect(flightStatus(late.leg, late.t)).toBe('Still on the ground · 20 min behind')
  })

  it('say "In flight" with no label, as before, and in a replay', () => {
    const { leg, t } = caseLeg('ahead, in the air')
    expect(flightStatus(scheduleOnly(leg), t)).toBe('In flight')
    expect(flightStatus(leg, t, true)).toBe('In flight')
    const elsewhere = caseLeg('on the ground somewhere else')
    expect(flightStatus(elsewhere.leg, elsewhere.t)).toBe('In flight')
  })

  it('put the label on the pill, and "In flight" in a replay', () => {
    const { leg, t } = caseLeg('ahead, in the air')
    const airports = { get: (code: string) => ({ iata: code, lat: airport(code).lat, lng: airport(code).lng }), city: () => null, tz: () => NY } as unknown as AirportIndex
    const map = makeTripMap(
      [{ kind: 'flight', id: 'f1', tripId: 'T1', dep: 'SDF', arr: 'PHL', start: leg.start, end: leg.end, schedStart: leg.start, schedEnd: leg.end, airline: '5X', enteredAirline: null, number: '207', deadhead: false, ground: false }],
      { isNextTrip: false, home: 'SDF', now: t, airports, flights: new Map([['f1', leg.flight!]]) },
    )!
    expect(topPill(map, t, 1, 2)).toBe('UPS207 · 14 min ahead')
    expect(topPill(map, t, 1, 2, true)).toBe('UPS207 · In flight')
    expect(topPill({ ...map, legs: map.legs.map(scheduleOnly) }, t, 1, 2)).toBe('UPS207 · In flight')
  })
})

describe('"about" a landing time (Stage 3 spec §9)', () => {
  it("is said of the real plane's estimate on the bar", () => {
    const { leg } = caseLeg('ahead, in the air')
    expect(landsAt(leg, NY, false)).toBe(`Lands about ${landsAt(scheduleOnly(leg), NY, false).slice(6)}`)
    expect(landsAt(leg, NY, false)).toMatch(/^Lands about \d{1,2}:\d\d\s[AP]M L$/)
  })

  it("isn't said of the schedule's time, or once the plane has landed", () => {
    const { leg } = caseLeg('ahead, in the air')
    expect(landsAt(scheduleOnly(leg), NY, false)).toMatch(/^Lands \d/)
    const landed = caseLeg('landed, seen all the way')
    expect(landsAt(landed.leg, NY, false)).toMatch(/^Lands \d/)
  })

  it('is said once on the landing line, before the time there', () => {
    const { leg } = caseLeg('behind, with a late first point and an unseen ocean')
    expect(landingLine(leg, NY, false)).toMatch(/^Lands Cologne about \d{1,2}:\d\d\s[AP]M · \d{1,2}:\d\d\s[AP]M L$/)
  })

  it("is said in the facts' landing words", () => {
    const { leg } = caseLeg('behind, with a late first point and an unseen ocean')
    expect(landsText(leg, NY, false)).toMatch(/^lands about \d{1,2}:\d\d\s[AP]M Cologne$/)
    expect(landsText(scheduleOnly(leg), NY, false)).toMatch(/^lands \d/)
  })

  it("is said in the narrative of the time that's the estimate, and of no other", () => {
    const ctx = { now: 0, viewerTz: NY, h24: false, airports: {} as AirportIndex, estimatedArrival: Date.UTC(2027, 0, 15, 20, 18) }
    const text = (ms: number) => new Sentence(ctx).t('which is ').time(ms).spans.map((s) => s.text).join('')
    expect(text(Date.UTC(2027, 0, 15, 20, 18))).toBe('which is about 3:18\u202FPM L')
    expect(text(Date.UTC(2027, 0, 15, 20, 30))).toBe('which is 3:30\u202FPM L')
    expect(new Sentence({ ...ctx, estimatedArrival: null }).time(Date.UTC(2027, 0, 15, 20, 18)).spans.map((s) => s.text)).toEqual(['3:18\u202FPM L'])
  })

  it("counts the landing countdown to the real plane's arrival", () => {
    const { leg } = caseLeg('ahead, in the air')
    expect(landingCountdown(leg, leg.end - 30 * 60_000)).toBe('Landing in 30 min')
  })
})

describe("the card's sentence for a screen reader (Stage 3 spec §9, §15)", () => {
  it('says each label in full', () => {
    expect(spokenLiveLabel({ kind: 'onSchedule' })).toBe('on schedule')
    expect(spokenLiveLabel({ kind: 'ahead', minutes: 12, isEstimated: false })).toBe('12 minutes ahead of schedule')
    expect(spokenLiveLabel({ kind: 'behind', minutes: 61, isEstimated: true })).toBe('about 1 hour 1 minute behind schedule')
    expect(spokenLiveLabel({ kind: 'stillOnGround', minutesBehind: null })).toBe('still on the ground')
    expect(spokenLiveLabel({ kind: 'stillOnGround', minutesBehind: 20 })).toBe('still on the ground, 20 minutes behind schedule')
    expect(spokenLiveLabel({ kind: 'landedOnTime' })).toBe('landed on time')
    expect(spokenLiveLabel({ kind: 'landedEarly', minutes: 8 })).toBe('landed 8 minutes early')
    expect(spokenLiveLabel({ kind: 'landedLate', minutes: 120 })).toBe('landed 2 hours late')
  })

  it('counts hours and minutes', () => {
    expect([1, 45, 60, 61, 130].map(spokenMinutes)).toEqual(['1 minute', '45 minutes', '1 hour', '1 hour 1 minute', '2 hours 10 minutes'])
  })

  it("says how the plane is doing, what's below, and when it lands", () => {
    const { leg, t } = caseLeg('ahead, in the air')
    expect(liveSummary(leg, t, NY, false, 'West Virginia')).toMatch(/^UPS207 to Philadelphia, 14 minutes ahead of schedule, over West Virginia\. Lands about \d{1,2}:\d\d\s[AP]M your time\.$/)
  })

  it('says "about" while the plane is an estimate', () => {
    const { leg, t } = caseLeg('ahead, in the air', 2)
    expect(liveSummary(leg, t, NY, false)).toMatch(/^UPS207 to Philadelphia, about 14 minutes ahead of schedule\. Lands about /)
  })

  it("while it's out of sight, says what's below by the plan, and where it was last tracked (Stage 3 spec §15, best guesses design §2)", () => {
    const { leg, t } = caseLeg('ahead, in the air', 3)
    expect(liveSummary(leg, t, NY, false, 'Ohio', 'near Columbus'))
      .toBe('UPS207 to Philadelphia, about 14 minutes ahead of schedule, over Ohio, last tracked near Columbus. Lands about 8:30 AM your time.')
    expect(liveSummary(leg, t, NY, false, null, '12 minutes ago'))
      .toBe('UPS207 to Philadelphia, about 14 minutes ahead of schedule, last tracked 12 minutes ago. Lands about 8:30 AM your time.')
    // Over where it was last tracked, the card's sentence leaves out what's below, so the place is said once.
    expect(liveSummary(leg, t, NY, false, null, 'over Ohio'))
      .toBe('UPS207 to Philadelphia, about 14 minutes ahead of schedule, last tracked over Ohio. Lands about 8:30 AM your time.')
  })

  it('says it is still on the ground, and when it will land, and nothing of what is below', () => {
    const { leg, t } = caseLeg('still on the ground twenty minutes after')
    expect(liveSummary(leg, t, NY, false, 'Indiana')).toMatch(/^UPS207 to Philadelphia, still on the ground, 20 minutes behind schedule\. Lands about /)
    // Nor where it was last tracked: a plane on the ground or landed is over nothing, and out of sight of nothing.
    expect(liveSummary(leg, t, NY, false, 'Indiana', 'near Indianapolis')).toMatch(/^UPS207 to Philadelphia, still on the ground, 20 minutes behind schedule\. Lands about /)
    const landed = caseLeg('landed, seen all the way')
    expect(liveSummary(landed.leg, landed.t, NY, false, null, '2 hours ago')).toMatch(/^UPS207 to Philadelphia, landed 23 minutes early\. Reaches the gate/)
  })

  it('once it has landed, says when it reaches the gate, not that it lands', () => {
    const { leg, t } = caseLeg('landed, seen all the way')
    expect(liveSummary(leg, t, NY, false, 'New Jersey')).toMatch(/^UPS207 to Philadelphia, landed 23 minutes early\. Reaches the gate at \d{1,2}:\d\d\s[AP]M your time\.$/)
  })

  it('is nothing with no label', () => {
    const { leg, t } = caseLeg('on the ground somewhere else')
    expect(liveSummary(leg, t, NY, false)).toBeNull()
    expect(liveSummary(scheduleOnly(caseLeg('ahead, in the air').leg), t, NY, false)).toBeNull()
  })

  it("is the card's sentence with a real plane, and the schedule's without one, as before", () => {
    const { leg, t } = caseLeg('ahead, in the air')
    const map: TripMap = { mode: { kind: 'inFlight', legId: 'f1' }, legs: [leg], groundStops: [], home: null, base: null, isWaitingAtBase: false, span: { start: leg.start, end: leg.end }, days: null }
    expect(tripMapSummary(map, t, 'Alex', NY, false)).toMatch(/^UPS207 to Philadelphia, 14 minutes ahead of schedule\. Lands about .* your time\. Opens the full map\.$/)
    expect(tripMapSummary({ ...map, legs: [scheduleOnly(leg)] }, t, 'Alex', NY, false)).toMatch(/^UPS207 to Philadelphia, landing at .* your time\. Estimated from the schedule\. Opens the full map\.$/)
  })
})

describe("the map card's heading for screen readers (the website's own, Todd, 16 Nov 2026)", () => {
  const mapOf = (leg: MapLeg, mode: TripMap['mode'] = { kind: 'inFlight', legId: leg.id }): TripMap =>
    ({ mode, legs: [leg], groundStops: [], home: null, base: null, isWaitingAtBase: false, span: { start: leg.start, end: leg.end }, days: null })

  it('is "On the ground" while the real plane is still at its departure airport', () => {
    const { leg, t } = caseLeg('still on the ground twenty minutes after')
    expect(cardHeading(mapOf(leg), t)).toBe('On the ground')
  })

  it('is "In flight" in the air, landed, on the ground somewhere else and with no live data, as before', () => {
    for (const name of ['ahead, in the air', 'landed, seen all the way', 'on the ground somewhere else']) {
      const { leg, t } = caseLeg(name)
      expect(cardHeading(mapOf(leg), t)).toBe('In flight')
    }
    const late = caseLeg('still on the ground twenty minutes after')
    expect(cardHeading(mapOf(scheduleOnly(late.leg)), late.t)).toBe('In flight')
  })

  it('is "Landed" while the real plane is down, not yet at the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026)', () => {
    // Down at 13:14:51, and at the gate 7 minutes later.
    const { leg } = caseLeg('landed, seen all the way')
    expect(cardHeading(mapOf(leg), leg.end - 3 * 60_000)).toBe('Landed')
    expect(cardHeading(mapOf(scheduleOnly(leg)), leg.end - 3 * 60_000)).toBe('In flight')
  })

  it('is "Trip recap" or "Trip map" with no flight in the air, as before', () => {
    const { leg, t } = caseLeg('still on the ground twenty minutes after')
    expect(cardHeading(mapOf(leg, { kind: 'recap' }), t)).toBe('Trip recap')
    expect(cardHeading(mapOf(leg, { kind: 'onTrip' }), t)).toBe('Trip map')
    expect(cardHeading(mapOf(leg, { kind: 'nextTrip' }), t)).toBe('Trip map')
  })
})

describe('the words for a real plane down, not yet at the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026)', () => {
  it('say it has landed in the arrival airport’s city', () => {
    expect(landedText('Anchorage')).toBe('Landed in Anchorage')
  })

  it('say when it reaches the gate, there and in the family’s time, "at" as the card’s sentence and the popup say it once it’s down', () => {
    // The gate at 13:21:51 UTC: 8:21 AM in Philadelphia and Louisville, 5:21 AM in Los Angeles.
    const { leg } = caseLeg('landed, seen all the way')
    expect(gateLine(leg, NY, false)).toMatch(/^Reaches the gate in Philadelphia at 8:21\sAM L$/)
    expect(gateLine(leg, 'America/Los_Angeles', false)).toMatch(/^Reaches the gate in Philadelphia at 8:21\sAM · 5:21\sAM L$/)
    expect(gateLine(leg, NY, true)).toBe('Reaches the gate in Philadelphia at 8:21 L')
  })

  it('say on the card’s bar when it reaches the gate, and "Lands" otherwise, as before (Todd, 17 Nov 2026)', () => {
    // Down at 13:14:51, and at the gate 7 minutes later, at 8:21 AM in Louisville.
    const { leg } = caseLeg('landed, seen all the way')
    expect(barArrival(leg, leg.end - 3 * 60_000, NY, false)).toMatch(/^At the gate 8:21\sAM L$/)
    // At the gate, and with no live data.
    expect(barArrival(leg, leg.end, NY, false)).toMatch(/^Lands 8:21\sAM L$/)
    expect(barArrival(scheduleOnly(leg), leg.end - 3 * 60_000, NY, false)).toMatch(/^Lands 8:21\sAM L$/)
    // In the air, with "about" the real plane's estimate.
    const flying = caseLeg('ahead, in the air')
    expect(barArrival(flying.leg, flying.t, NY, false)).toBe(landsAt(flying.leg, NY, false))
    expect(barArrival(flying.leg, flying.t, NY, false)).toMatch(/^Lands about /)
  })

  it('say "about" where the time is the real plane’s estimate, and "at" where it’s the schedule’s', () => {
    const { leg } = caseLeg('behind, with a late first point and an unseen ocean')
    expect(gateLine(leg, NY, false)).toMatch(/^Reaches the gate in Cologne about \d{1,2}:\d\d\s[AP]M · \d{1,2}:\d\d\s[AP]M L$/)
    expect(gateLine(scheduleOnly(leg), NY, false)).toMatch(/^Reaches the gate in Cologne at \d{1,2}:\d\d\s[AP]M · \d{1,2}:\d\d\s[AP]M L$/)
  })
})

describe('the words for a real plane back at its departure airport after an air return (air return design §3)', () => {
  // Back at Louisville at 12:40, and seen there at 12:41: it lands at 14:04 if it takes off now, and reaches the gate at
  // 14:11, 9:11 AM in Louisville.
  const back = () => caseLeg('an air return, back on the ground')
  const mapOf = (leg: MapLeg): TripMap =>
    ({ mode: { kind: 'inFlight', legId: leg.id }, legs: [leg], groundStops: [], home: null, base: null, isWaitingAtBase: false, span: { start: leg.start, end: leg.end }, days: null })

  it('say it has returned to the departure airport’s city', () => {
    expect(returnedText('Rockford')).toBe('Returned to Rockford')
  })

  it('put "Returned to Louisville" on the card’s bar and the full map’s pill, and "In flight" in a replay, as before', () => {
    const { leg, t } = back()
    expect(flightStatus(leg, t)).toBe('Returned to Louisville')
    expect(flightStatus(leg, t, true)).toBe('In flight')
    expect(spokenLiveLabel({ kind: 'returned' })).toBe('returned')
  })

  it('give the card’s sentence for screen readers its words, and when it lands', () => {
    const { leg, t } = back()
    expect(liveSummary(leg, t, NY, false, 'Indiana', 'near Indianapolis')).toMatch(/^UPS207 to Philadelphia, returned to Louisville\. Lands about 9:11\sAM your time\.$/)
    expect(tripMapSummary(mapOf(leg), t, 'Alex', NY, false)).toMatch(/^UPS207 to Philadelphia, returned to Louisville\. Lands about 9:11\sAM your time\. Opens the full map\.$/)
  })

  it('head the map card "On the ground" for screen readers, as a plane at its departure airport', () => {
    const { leg, t } = back()
    expect(cardHeading(mapOf(leg), t)).toBe('On the ground')
  })
})
