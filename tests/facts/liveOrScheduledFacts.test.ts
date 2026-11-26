import { describe, expect, it } from 'vitest'
import { cardSummary, headline, latestEvent, makeTripFacts, tripSoFar, type TripFacts } from '../../src/facts/tripFacts'
import { factRows } from '../../src/facts/tripFactsRows'
import { legTracking } from '../../src/map/flightTracking'
import type { MapLeg, TripMap } from '../../src/map/tripMap'
import { atTheGate, liveTripMap } from '../map/liveTrip'
import { MINUTE, START } from '../map/madeUpFlights'
import { EQUATOR, equatorFlight, EQUINOX, flightMap, mark } from './factsTestData'
import { equatorLive, equatorLiveLeg, HOME_BY_THE_EQUATOR } from './liveFacts'

/**
 * The flight along the equator by the schedule alone (factsTestData.ts): at the gate at 10:00 UTC (6:00 AM in
 * Louisville), off at 10:15, into Bravo at 11:00, halfway at 11:45, closest to home at 12:21, at the gate at 13:22.
 */
const NY = 'America/New_York'
const t = (hhmm: string) => Date.parse(`2026-03-20T${hhmm}:00Z`)
const HOME = mark('HOME', 0.5, 14)

function factsOf(map: TripMap, isReplay = false, h24 = false): TripFacts {
  return makeTripFacts(map, { geography: EQUATOR, comparisons: null, viewerTz: NY, h24, day: 1, days: 1, isReplay })
}
const bySchedule = (leg: MapLeg = equatorFlight(0, 20), isReplay = false) => factsOf(flightMap(leg, HOME), isReplay)

describe('a flight by the schedule alone, before its takeoff (live or scheduled design §4.2)', () => {
  it('heads the facts with when it’s scheduled to take off, not what’s below, in either clock', () => {
    expect(headline(bySchedule(), t('10:05'))).toMatch(/^Scheduled to take off about 6:15\sAM L$/)
    const h24 = factsOf(flightMap(equatorFlight(0, 20), HOME), false, true)
    expect(headline(h24, t('10:05'))).toBe('Scheduled to take off about 6:15 L')
  })

  it('reads the same while Crewlu Cloud’s first answer is on its way, but says nothing of where it comes from', () => {
    const facts = bySchedule({ ...equatorFlight(0, 20), isAwaitingLive: true })
    expect(headline(facts, t('10:05'))).toMatch(/^Scheduled to take off about 6:15\sAM L$/)
    expect(factRows(facts, t('10:05'), t('10:05')).map((r) => r.kind)).toEqual(['below', 'distance', 'headed'])
  })

  it('has the source row first, then the takeoff, the miles to go and the landing: no sky, no takeoff row', () => {
    const rows = factRows(bySchedule(), t('10:05'), t('10:05'))
    expect(rows.map((r) => r.kind)).toEqual(['source', 'below', 'distance', 'headed'])
    expect(rows[0]).toMatchObject({ icon: 'CalendarBlank', title: 'Not tracked live', detail: "Shown where the schedule has it · If it's running late, it may still be at the gate" })
    expect(rows[1]).toMatchObject({ icon: 'AirplaneTakeoff' })
    expect(rows[1].title).toMatch(/^Scheduled to take off about 6:15\sAM L$/)
    expect(rows[2].title).toBe('1,382 mi to go')
    expect(rows[2].detail).toMatch(/Halfway at about 7:45\sAM L/)
  })

  it('has no latest event, and lists the flight "By the schedule" with nothing passed yet', () => {
    expect(latestEvent(bySchedule(), t('10:05'))).toBeNull()
    expect(tripSoFar(bySchedule(), t('10:05')).flights).toEqual([{ id: 'eq', title: 'TST1 · E0 → E20', tag: 'By the schedule', events: [] }])
  })

  it('tells screen readers when it’s scheduled to take off, and that it isn’t tracked', () => {
    expect(cardSummary(bySchedule(), t('10:05'), 'Alex'))
      .toMatch(/^TST1 to E20, scheduled to take off about 6:15\sAM your time\. Lands at 9:22\sAM your time\. Not tracked live, so it's shown where the schedule has it\. Opens the full map\.$/)
  })
})

describe('a flight by the schedule alone, in the air (live or scheduled design §4.1, §5)', () => {
  it('heads the facts with what’s below, as before, under the source row', () => {
    const facts = bySchedule()
    expect(headline(facts, t('11:10'))).toBe('Over Bravo, near Testville')
    expect(factRows(facts, t('11:10'), t('11:10'))[0]).toMatchObject({ kind: 'source', title: 'Not tracked live' })
  })

  it('reads its events, halfway and closest point to home "about"', () => {
    const facts = bySchedule()
    expect(latestEvent(facts, t('11:10'))?.when).toBe('About 10 min ago')
    const soFar = tripSoFar(facts, t('11:10'))
    expect(soFar.flights[0].tag).toBe('By the schedule')
    expect(soFar.flights[0].events.length).toBeGreaterThan(0)
    expect(soFar.flights[0].events.every((e) => e.isEstimate)).toBe(true)
    const distance = factRows(facts, t('11:10'), t('11:10')).find((r) => r.kind === 'distance')!
    expect(distance.detail).toMatch(/Halfway at about 7:45\sAM L/)
  })

  it('says nothing of where it comes from while Crewlu Cloud’s first answer is on its way', () => {
    const facts = bySchedule({ ...equatorFlight(0, 20), isAwaitingLive: true })
    expect(factRows(facts, t('11:10'), t('11:10')).map((r) => r.kind)).not.toContain('source')
    expect(tripSoFar(facts, t('11:10')).flights[0].tag).toBe('By the schedule')
  })

  it('reads a replay as before: no source row, its events not guesses, and "By the schedule" with no real path', () => {
    const facts = bySchedule(equatorFlight(0, 20), true)
    expect(factRows(facts, t('11:10'), t('11:10')).map((r) => r.kind)).not.toContain('source')
    expect(latestEvent(facts, t('11:10'))?.when).not.toMatch(/About/)
    const soFar = tripSoFar(facts, t('11:10'))
    expect(soFar.flights[0].tag).toBe('By the schedule')
    expect(soFar.flights[0].events.every((e) => !e.isEstimate)).toBe(true)
  })

  it('leaves an earlier flight’s events as before', () => {
    const first = equatorFlight(0, 20)
    const second = equatorFlight(20, 40, EQUINOX + 5 * 60 * MINUTE, 'eq2')
    const map: TripMap = {
      mode: { kind: 'inFlight', legId: 'eq2' }, legs: [first, second], groundStops: [], base: null, isWaitingAtBase: false, home: HOME,
      span: { start: first.start, end: second.end }, days: null,
    }
    const soFar = tripSoFar(factsOf(map), EQUINOX + 6 * 60 * MINUTE)
    const earlier = soFar.flights.find((f) => f.id === 'eq')!
    expect(earlier.events.length).toBeGreaterThan(0)
    expect(earlier.events.every((e) => !e.isEstimate)).toBe(true)
  })
})

describe('a flight Crewlu Cloud sees (live or scheduled design §4.1, §4.2)', () => {
  it('has "Tracked live" first in the air', () => {
    const leg = equatorLiveLeg(equatorLive(t('10:55')), t('10:55'))
    const facts = makeTripFacts(flightMap(leg, HOME_BY_THE_EQUATOR), { geography: EQUATOR, comparisons: null, viewerTz: NY, h24: false })
    expect(factRows(facts, t('10:55'), t('10:55'))[0]).toMatchObject({ kind: 'source', icon: 'Broadcast', title: 'Tracked live', detail: null })
  })

  it('has no source row for a best guess, whose place says where it was last tracked', () => {
    // Last seen in the air at 10:55, 10 minutes before: the faded plane.
    const leg = equatorLiveLeg(equatorLive(t('10:55')), t('11:05'))
    expect(legTracking(leg, t('11:05'))).toBe('bestGuess')
    const facts = makeTripFacts(flightMap(leg, HOME_BY_THE_EQUATOR), { geography: EQUATOR, comparisons: null, viewerTz: NY, h24: false })
    const rows = factRows(facts, t('11:05'), t('11:05'))
    expect(rows.map((r) => r.kind)).not.toContain('source')
    expect(rows[0]).toMatchObject({ kind: 'below' })
    expect(rows[0].detail).toMatch(/^Last tracked over Bravo · 10 min ago/)
  })

  it('at its gate before the plan’s takeoff, is on the ground in Louisville: no sky, nothing listed, no latest event', () => {
    const now = START + 5 * MINUTE
    const facts = makeTripFacts(liveTripMap(now, atTheGate(5)), { geography: null, comparisons: null, viewerTz: NY, h24: false })
    expect(headline(facts, now)).toBe('On the ground in Louisville')
    const rows = factRows(facts, now, now)
    expect(rows.map((r) => r.kind)).not.toContain('sky')
    expect(rows[0]).toMatchObject({ kind: 'source', title: 'Tracked live' })
    expect(rows.find((r) => r.kind === 'below')?.title).toBe('On the ground in Louisville')
    expect(rows.find((r) => r.kind === 'distance')?.title).toMatch(/^[\d,]+ mi to go$/)
    expect(tripSoFar(facts, now).flights).toEqual([])
    expect(latestEvent(facts, now)).toBeNull()
    expect(cardSummary(facts, now, 'Alex')).toMatch(/^UPS1234 to Philadelphia, on the ground in Louisville\. Lands (at|about) .* your time\. Tracked live\. Opens the full map\.$/)
  })
})
