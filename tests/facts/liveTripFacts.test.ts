import { describe, expect, it } from 'vitest'
import { rowSentence, type FactRow, type FactRowKind, type FactsAtMoment } from '../../src/facts/factRow'
import { makeGeography, type Geography } from '../../src/facts/geography'
import { COCKPIT_HORIZON, cockpitHorizonOnLeg, sunAltitudeOnLeg, sunEvents } from '../../src/facts/sky'
import { cardSummary, headline, latestEvent, makeTripFacts, showsLiveData, tripSoFar, type TripFacts } from '../../src/facts/tripFacts'
import { factRows, factsAtMoment } from '../../src/facts/tripFactsRows'
import type { GeoPoint } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { makeMapFlight, mapFlightProgress } from '../../src/map/mapFlight'
import type { MapLeg } from '../../src/map/tripMap'
import { appComparisons, box, EQUATOR, equatorFlight, EQUINOX, flightMap, mark } from './factsTestData'
import { date, dogLeg, equatorLive, equatorLiveLeg, HOME_BY_THE_EQUATOR, liveTime } from './liveFacts'

/**
 * The headline, the rows and the card's sentence for a flight with a real plane (Stage 3 spec §8, §9, §15), in US
 * English for a family in Louisville, as the app's LiveTripFactsTests. The made-up real plane is liveFacts.ts's: a
 * degree of longitude every 8 minutes from 10:15 UTC, so it's at 5° E at 10:55 (6:55 AM in Louisville), 10° E at 11:35
 * and 14° E at 12:07. One degree along the equator is 69.09 mi, and the flight is 1,382 mi.
 */

const NY = 'America/New_York'
/** The time's own space, narrow and unbreaking, as the browser writes it. */
const AM = ' AM'
const at = (hhmm: string) => date(`2026-03-20T${hhmm}:00Z`)

interface FactsOptions {
  /** When the map was made: when the real plane was last seen, unless it's given. */
  now?: string
  unseen?: [number, number]
  landed?: boolean
  hasStory?: boolean
  isReplay?: boolean
  typeCode?: string | null
  registration?: string | null
}

/** The facts of a map of `leg` alone, with home by the equator. */
function factsOf(leg: MapLeg, { hasStory = true, isReplay = false }: { hasStory?: boolean; isReplay?: boolean } = {}): TripFacts {
  return makeTripFacts(flightMap(leg, HOME_BY_THE_EQUATOR), {
    geography: hasStory ? EQUATOR : null, comparisons: appComparisons(), viewerTz: NY, h24: false, day: 1, days: 1, isReplay,
  })
}

/** The facts of a map of the one flight, with the real plane last seen at `seenUntil` and the map made at `now`. */
function facts(seenUntil: string, { now, unseen, landed = false, hasStory = true, isReplay = false, typeCode = 'B763', registration = 'N370UP' }: FactsOptions = {}): TripFacts {
  const live = equatorLive(at(seenUntil), { unseen, landedAt: landed ? liveTime(20) : undefined, typeCode, registration })
  return factsOf(equatorLiveLeg(live, at(now ?? seenUntil)), { hasStory, isReplay })
}

const rowsAt = (theFacts: TripFacts, t: string, now = t) => factRows(theFacts, at(t), at(now))

/** `live` with every time moved on by `by` ms. */
function movedOn(live: LiveFlight, by: number): LiveFlight {
  return {
    ...live,
    fix: live.fix && { ...live.fix, seenAt: live.fix.seenAt + by },
    landedAt: live.landedAt == null ? null : live.landedAt + by,
    trail: live.trail.map((p) => ({ ...p, time: p.time + by })),
  }
}

/**
 * The equator flight 7 hours later, at dusk, with its real plane at 25,000 ft, seen as far as 10° E. From that height the
 * cockpit's horizon is 3.4° below the sky's, against 3.9° from 35,000 ft, and its sunset is near 5.5° E, at about 17:59 UTC.
 */
function duskLeg(): MapLeg {
  const later = 7 * 3_600_000
  const scheduled = equatorFlight(0, 20, EQUINOX + later, 'dusk')
  const live = movedOn(equatorLive(liveTime(10), { altitudeFt: 25_000 }), later)
  const flight = makeMapFlight(scheduled.start, scheduled.end, scheduled.origin.place, scheduled.destination.place, live)
  if (!flight) throw new Error('The dusk flight has no plan')
  const progress = mapFlightProgress(flight, liveTime(10) + later)
  return { ...scheduled, start: progress.start, end: progress.end, flight }
}

function row(kind: FactRowKind, rows: FactRow[]): FactRow {
  const found = rows.find((r) => r.kind === kind)
  if (!found) throw new Error(`no ${kind} row`)
  return found
}

describe('the headline with a real plane (Stage 3 spec §8, §9)', () => {
  it('is what’s below the real plane, not the schedule’s', () => {
    // At 11:10 the real plane is at 6.875° E, 64 mi from Testville. The schedule's is at 6.1° E, beside it.
    expect(headline(facts('11:10'), at('11:10'))).toBe('Over Bravo')
    expect(headline(factsOf(equatorFlight(0, 20)), at('11:10'))).toBe('Over Bravo, near Testville')
  })

  it('leads with a crossing when the real plane crosses', () => {
    // It crossed into Bravo at 10:55. The schedule's plane crosses at 11:00.
    expect(headline(facts('10:57'), at('10:57'))).toBe('Just crossed into Bravo')
    expect(headline(facts('10:53'), at('10:53'))).toBe('Over Alpha')
    // At 10:57 the real plane is over Bravo, at 5.25° E. The schedule's is still over Alpha, at 4.7° E.
    expect(row('below', rowsAt(facts('10:57'), '10:57')).title).toBe('Over Bravo')
  })

  it('while it’s out of sight, is what’s below where the plan has the plane', () => {
    // Last seen over Alpha, at 4.375° E at 10:50. Eleven minutes on at its own 450 kt it's at 5.75° E: over Bravo, 25 mi
    // from Testville. The words are as plain as when it's seen.
    expect(headline(facts('10:50', { now: '11:01' }), at('11:01'))).toBe('Over Bravo, near Testville')
    // Last seen at 6.875° E ten minutes ago, it's at 8.125° E by now: no city within 40 mi.
    expect(headline(facts('11:10', { now: '11:20' }), at('11:20'))).toBe('Over Bravo')
  })

  it('while it’s out of sight with no place known, is the landing countdown', () => {
    // It lands at 13:11:47 by its estimate: 112 minutes after 11:20.
    expect(headline(facts('11:10', { now: '11:20', hasStory: false }), at('11:20'))).toBe('Landing in 1 h 52 min')
  })

  it('while it’s out of sight, keeps its order', () => {
    // Last seen at 9.375° E at 11:30. By the plan it's halfway at 11:35: that leads for five minutes, and then what's
    // below does.
    const theFacts = facts('11:30', { now: '11:37' })
    expect(headline(theFacts, at('11:37'))).toBe('Halfway!')
    expect(headline(theFacts, at('11:41'))).toBe('Over Bravo')
  })

  it('while it’s out of sight, tells a crossing as its best guess', () => {
    // Last seen at 4.375° E at 10:50. By the plan it crosses the border at 5° E at 10:55, and nobody saw it.
    expect(headline(facts('10:50', { now: '10:58' }), at('10:58'))).toBe('Just crossed into Bravo')
    // Not there yet, by the plan.
    expect(headline(facts('10:50', { now: '10:54' }), at('10:54'))).toBe('Over Alpha')
  })

  it('in a replay, is where the record has the plane', () => {
    const theFacts = facts('11:10', { isReplay: true })
    // 2.5° E at 10:35.
    expect(headline(theFacts, at('10:35'))).toBe('Over Alpha')
    // Past where it was last seen, at 8.75° E by the plan.
    expect(headline(theFacts, at('11:25'))).toBe('Over Bravo')
  })
})

describe('the rows with a real plane (Stage 3 spec §8)', () => {
  it('in the air, have the plane’s row second', () => {
    const rows = rowsAt(facts('11:10'), '11:10')
    expect(rows.map((r) => r.kind)).toEqual(['below', 'plane', 'distance', 'headed'])

    // 14° E is still ahead: its time is the estimate.
    expect(row('below', rows)).toMatchObject({ title: 'Over Bravo', detail: `Passes 35 mi from home at about 8:07${AM}` })

    const plane = row('plane', rows)
    // 450 kt.
    expect(plane).toMatchObject({ icon: 'Airplane', title: 'Boeing 767-300 · N370UP', detail: '36,000 ft · 520 mph', hasWeather: false })
    expect(rowSentence(plane)).toBe('Boeing 767-300 · N370UP. 36,000 ft, 520 mph')

    // 6.875° is 475 mi, of 1,382. No "Averaging about": that's the schedule's speed.
    expect(row('distance', rows)).toMatchObject({
      icon: 'Path', title: '475 mi flown · 907 to go', detail: `Halfway at about 7:35${AM} · like driving the Alaska Highway`,
    })

    // 788 nm to go: the last 120 at 280 kt and the rest at its own 450 is 1 h 55 min, and 7 minutes to the gate.
    expect(row('headed', rows).title).toBe(`Lands E20 about 9:11${AM}`)
  })

  it('while it’s out of sight, say where it was last seen under what’s below, and leave out its height and speed', () => {
    const rows = rowsAt(facts('11:10', { now: '11:20' }), '11:20')
    expect(row('below', rows)).toMatchObject({
      title: 'Over Bravo', detail: `Last seen over Bravo · 10 min ago · Passes 35 mi from home at about 8:07${AM}`,
    })

    // Last seen at 6° E, 21 mi from Testville.
    const byACity = rowsAt(facts('11:03', { now: '11:13' }), '11:13')
    expect(row('below', byACity).detail).toBe(`Last seen near Testville · 10 min ago · Passes 35 mi from home at about 8:07${AM}`)

    // With no place known, when it was last seen leads the row.
    const noPlace = rowsAt(facts('11:10', { now: '11:20', hasStory: false }), '11:20')
    expect(row('below', noPlace)).toMatchObject({ title: 'Last seen 10 min ago', detail: null })

    expect(row('plane', rows)).toMatchObject({ title: 'Boeing 767-300 · N370UP', detail: null })

    // Ten more minutes at 450 kt from 6.875° E is 8.125° E: 561 mi.
    expect(row('distance', rows).title).toBe('561 mi flown · 821 to go')
  })

  it('in a replay, have no height or speed', () => {
    const rows = rowsAt(facts('11:10', { isReplay: true }), '10:35', '11:10')
    // Its height and speed are for now only.
    expect(row('plane', rows)).toMatchObject({ title: 'Boeing 767-300 · N370UP', detail: null })
    expect(row('below', rows).title).toBe('Over Alpha')
    // 2.5° E at 10:35.
    expect(row('distance', rows).title).toBe('173 mi flown · 1,209 to go')
  })

  it('of a flight that has landed, have real times, with no "about"', () => {
    const rows = rowsAt(facts('12:53', { now: '12:56', landed: true, isReplay: true }), '11:00', '12:56')
    expect(row('below', rows).detail).toBe(`Passes 35 mi from home at 8:07${AM}`)
    expect(row('distance', rows).detail).toBe(`Halfway at 7:35${AM} · like driving the Alaska Highway`)
  })

  it('tell the closest point to home where nobody saw it as a best guess, with "about"', () => {
    // Nobody saw it from 13° E to 15° E, where it passed home.
    expect(row('below', rowsAt(facts('12:30', { unseen: [13, 15] }), '12:30')).detail).toBe(`Closest to home was 35 mi at about 8:07${AM}`)
    // Seen all the way, it's told with its real time.
    expect(row('below', rowsAt(facts('12:30'), '12:30')).detail).toBe(`Closest to home was 35 mi at 8:07${AM}`)
  })

  it('show an unknown type as itself in the plane’s row, and leave out what’s missing', () => {
    expect(row('plane', rowsAt(facts('11:10', { typeCode: 'ZZZZ' }), '11:10')).title).toBe('ZZZZ · N370UP')
    expect(row('plane', rowsAt(facts('11:10', { registration: null }), '11:10')).title).toBe('Boeing 767-300')
    // What it has leads the row.
    const neither = row('plane', rowsAt(facts('11:10', { typeCode: null, registration: null }), '11:10'))
    expect(neither).toMatchObject({ title: '36,000 ft · 520 mph', detail: null })
  })

  it('count the miles along a real path that leaves the great circle', () => {
    // Seen as far as 13° E along the dog-leg: 6° along the equator, two climbs of 2.236° each to and from 2° N, 2° along
    // it (1.999°) and 3° more along the equator, 15.471° in all, then 7° to go: 1,069 and 484 of 1,553 mi. The great
    // circle is 1,382.
    const seenUntil = liveTime(13)
    const rows = factRows(factsOf(equatorLiveLeg(equatorLive(seenUntil, { latitude: dogLeg }), seenUntil)), seenUntil, seenUntil)
    expect(row('distance', rows).title).toBe('1,069 mi flown · 484 to go')
  })

  it('at dusk, have the plane’s row before the sky’s, and the sky’s icon from the plane’s own height', () => {
    const leg = duskLeg()
    const theFacts = factsOf(leg, { isReplay: true })
    const sunset = theFacts.sunEvents.dusk?.[0]
    if (sunset?.kind !== 'sunset') throw new Error('no sunset from the cockpit')
    // Half a minute after the sunset seen from 25,000 ft the sun is below that horizon, and still above the one from
    // 35,000 ft: night, from where the plane is.
    const t = sunset.time + 30_000
    expect(sunAltitudeOnLeg(leg, t)).toBeLessThan(cockpitHorizonOnLeg(leg))
    expect(sunAltitudeOnLeg(leg, t)).toBeGreaterThan(COCKPIT_HORIZON)
    const rows = factRows(theFacts, t, t)
    expect(rows.map((r) => r.kind)).toEqual(['below', 'plane', 'sky', 'distance', 'headed'])
    expect(row('sky', rows).icon).toBe('Moon')
  })

  it('at dusk, of a flight with no record, have the sunset seen from its own height, not another’s on its route and times', () => {
    // The status page makes a record from any fix in the air, so this flight, its plane at 25,000 ft with no record, is
    // made by hand: the sun events kept by route and times must still tell its height from the schedule's 35,000 ft.
    const scheduled = equatorFlight(0, 20, EQUINOX + 7 * 3_600_000, 'dusk')
    const live = movedOn(equatorLive(liveTime(10), { altitudeFt: 25_000 }), 7 * 3_600_000)
    const flight = makeMapFlight(scheduled.start, scheduled.end, scheduled.origin.place, scheduled.destination.place, live)
    if (!flight) throw new Error('The dusk flight has no plan')
    const lower = { ...scheduled, flight: { ...flight, record: null } }
    expect(cockpitHorizonOnLeg(lower)).not.toBe(COCKPIT_HORIZON)
    const fromCruise = factsOf(scheduled).sunEvents.dusk
    expect(fromCruise).toEqual(sunEvents(scheduled))
    expect(fromCruise?.[0]?.kind).toBe('sunset')
    // Seen from 25,000 ft its horizon is higher, and the sun sets sooner.
    expect(factsOf(lower).sunEvents.dusk).toEqual(sunEvents(lower))
    expect(factsOf(lower).sunEvents.dusk?.[0]?.time).toBeLessThan(fromCruise?.[0]?.time ?? -Infinity)
    // And the schedule's are still its own.
    expect(factsOf(scheduled).sunEvents.dusk).toEqual(fromCruise)
  })

  it('with no live data, are the schedule’s, as before', () => {
    const rows = rowsAt(factsOf(equatorLiveLeg(null, at('11:10'))), '11:10')
    // No plane's row.
    expect(rows.map((r) => r.kind)).toEqual(['below', 'distance', 'headed'])
    expect(row('below', rows).title).toBe('Over Bravo, near Testville')
    expect(row('distance', rows)).toMatchObject({
      title: '422 mi flown · 960 to go', detail: `Halfway at 7:45${AM} · Averaging about 460 mph · like driving the Alaska Highway`,
    })
  })
})

/** The text of each event the trip so far lists under its first flight. */
const listed = (theFacts: TripFacts, t: string) => tripSoFar(theFacts, at(t)).flights[0]?.events.map((e) => e.text)

describe('the trip so far with a real plane, and whether to credit adsb.lol (Stage 3 spec §8, best guesses design §4)', () => {
  it('counts the miles along the real path, and lists real times', () => {
    const soFar = tripSoFar(facts('11:10'), at('11:10'))
    expect(soFar.flights[0]?.events.map((e) => e.text)).toEqual([`Crossed into Bravo · 6:55${AM}`])
    expect(soFar.flights[0]?.events.map((e) => e.isEstimate)).toEqual([false])
    expect(soFar.totals).toBe('Day 1 of 1 · 475 mi')
  })

  it('sets the flight in the air apart, even before its first event', () => {
    const now = tripSoFar(facts('10:35'), at('10:35'))
    expect(now.flights.map((f) => f.tag)).toEqual(['In the air now'])
    // At 10:35 it hasn't crossed into Bravo yet.
    expect(now.flights[0]?.events).toEqual([])

    // A replay's moment isn't now. It counts as far as the record has the plane.
    const replayed = tripSoFar(facts('11:10', { isReplay: true }), at('10:35'))
    expect(replayed.flights.map((f) => f.tag)).toEqual(['In the air'])
    expect(replayed.totals).toBe('Day 1 of 1 · 173 mi')
  })

  it('lists the newest event first', () => {
    expect(listed(facts('12:30'), '12:30')).toEqual([
      `Closest to home, 35 mi · 8:07${AM}`, `Out over the Test Sea · 7:51${AM}`, `Halfway · 7:35${AM}`, `Crossed into Bravo · 6:55${AM}`,
    ])
  })

  it('lists a crossing nobody saw as a best guess, with "about"', () => {
    // Nobody saw it from 4° E to 6.5° E. On the straight join it crossed into Bravo at 10:55.
    const events = tripSoFar(facts('11:10', { unseen: [4, 6.5] }), at('11:10')).flights[0]?.events
    expect(events?.map((e) => e.text)).toEqual([`Crossed into Bravo · about 6:55${AM}`])
    expect(events?.map((e) => e.isEstimate)).toEqual([true])
  })

  it('while it’s out of sight, lists what the plan has happened', () => {
    // Last seen at 4.375° E at 10:50. By the plan it crossed into Bravo at 10:55.
    expect(listed(facts('10:50', { now: '11:01' }), '11:01')).toEqual([`Crossed into Bravo · about 6:55${AM}`])
  })

  it('shows live data when a flight of the trip has it', () => {
    expect(showsLiveData(facts('11:10'))).toBe(true)
    expect(showsLiveData(factsOf(equatorFlight(0, 20)))).toBe(false)
    expect(showsLiveData(factsOf(equatorLiveLeg(null, at('11:10'))))).toBe(false)
  })
})

describe('the card’s sentence for screen readers with a real plane (Stage 3 spec §9, §15)', () => {
  it('in the air, says what’s below the real plane, and the latest event', () => {
    // It lands at 13:05 by its estimate, where the plan has 13:15. It crossed into Bravo at 10:55.
    expect(cardSummary(facts('11:10'), at('11:10'), 'Alex')).toBe(
      `TST1 to E20, 10 minutes ahead of schedule, over Bravo. Lands about 9:11${AM} your time. Latest: crossed into Bravo, 15 minutes ago. ` +
        'Opens the full map.',
    )
  })

  it('while it’s out of sight, says "about", what’s below by the plan, and where it was last seen', () => {
    expect(cardSummary(facts('10:50', { now: '11:01' }), at('11:01'), 'Alex')).toBe(
      `TST1 to E20, about 10 minutes ahead of schedule, over Bravo, last seen over Alpha. Lands about 9:11${AM} your time. ` +
        'Latest: crossed into Bravo, about 6 minutes ago. Opens the full map.',
    )
    expect(cardSummary(facts('11:03', { now: '11:13' }), at('11:13'), 'Alex')).toBe(
      `TST1 to E20, about 10 minutes ahead of schedule, over Bravo, last seen near Testville. Lands about 9:11${AM} your time. ` +
        'Latest: crossed into Bravo, 18 minutes ago. Opens the full map.',
    )
    expect(cardSummary(facts('11:10', { now: '11:20', hasStory: false }), at('11:20'), 'Alex')).toBe(
      `TST1 to E20, about 10 minutes ahead of schedule, last seen 10 minutes ago. Lands about 9:11${AM} your time. Opens the full map.`,
    )
  })
})

describe('the latest event with a real plane (latest event design §1)', () => {
  it('while it’s out of sight, is a best guess, with "about"', () => {
    // Last seen at 4.375° E at 10:50. By the plan it crossed into Bravo at 10:55.
    expect(latestEvent(facts('10:50', { now: '11:01' }), at('11:01'))).toEqual({
      title: 'Crossed into Bravo', when: 'About 6 min ago', sentence: 'Latest: crossed into Bravo, about 6 minutes ago.',
    })
  })

  it('of a flight that landed early, goes at its real gate arrival', () => {
    // Seen down at 20° E at 12:55, ten minutes ahead of the plan: it reaches the gate at 13:02.
    const theFacts = facts('12:53', { now: '13:05', landed: true })
    expect(latestEvent(theFacts, at('12:58'))?.title).toBe('Closest to home, 35 mi')
    // At the gate.
    expect(latestEvent(theFacts, at('13:03'))).toBeNull()
  })

  it('in a replay, is the record’s newest, at its clock time', () => {
    const seen = facts('11:10', { isReplay: true })
    expect(latestEvent(seen, at('11:25'))?.when).toBe(`6:55${AM}`)
    // Before it crossed.
    expect(latestEvent(seen, at('10:50'))).toBeNull()
    expect(latestEvent(facts('10:50', { isReplay: true }), at('11:01'))?.when).toBe(`About 6:55${AM}`)
  })
})

// The website's own: a real plane still on the ground at its departure airport (Todd, 16 Nov 2026)

/** The real plane seen on the ground at `place` at `seenAt`, before it has flown. */
function onTheGround(seenAt: number, place: GeoPoint = { lat: 0, lng: 0 }): LiveFlight {
  return {
    legId: 'eq', callsign: 'TST1', state: 'ground', landedAt: null, trail: [],
    fix: { place, altitudeFt: null, groundSpeedKt: 0, trackDeg: null, onGround: true, registration: 'N370UP', typeCode: 'B763', seenAt },
  }
}

/** The equator flight from Rockford, as the status page hands it on at `now`, with `live` its real plane. */
function fromRockford(live: LiveFlight, now: string): MapLeg {
  const leg = equatorLiveLeg(live, at(now))
  return { ...leg, origin: { ...leg.origin, city: 'Rockford' } }
}

/** The facts with the real plane seen at its gate at `now`, its leg having begun at 10:00 and the plan's takeoff at 10:15. */
const atTheGate = (now: string, options: { geography?: Geography; isReplay?: boolean } = {}) => {
  const leg = fromRockford(onTheGround(at(now)), now)
  return makeTripFacts(flightMap(leg, HOME_BY_THE_EQUATOR), {
    geography: options.geography ?? EQUATOR, comparisons: appComparisons(), viewerTz: NY, h24: false, day: 1, days: 1, isReplay: options.isReplay,
  })
}

describe('a real plane still on the ground at its departure airport (the website’s own, Todd, 16 Nov 2026)', () => {
  it('heads the facts "Still on the ground in Rockford", not what’s below', () => {
    // 20 minutes past the plan's takeoff the schedule's plane is 2° E along, over Alpha. The real one is at the gate.
    const theFacts = atTheGate('10:35')
    expect(headline(theFacts, at('10:35'))).toBe('Still on the ground in Rockford')
    const rows = rowsAt(theFacts, '10:35')
    expect(rows.map((r) => r.kind)).toEqual(['below', 'plane', 'distance', 'headed'])
    expect(row('below', rows).title).toBe('Still on the ground in Rockford')
    expect(row('below', rows).detail).toMatch(/^Passes 35 mi from home at /)
  })

  it('says only what’s to go, as nothing is flown yet', () => {
    expect(row('distance', rowsAt(atTheGate('10:35'), '10:35')).title).toBe('1,382 mi to go')
  })

  it('leaves out the sky’s row, as nothing is flying yet', () => {
    // The equator flight 7 hours later, at dusk: the plan's takeoff is at 17:15, and at 17:35 the plane is at its gate.
    const dusk = (isReplay: boolean) => {
      const scheduled = equatorFlight(0, 20, EQUINOX + 7 * 3_600_000, 'dusk')
      const flight = makeMapFlight(scheduled.start, scheduled.end, scheduled.origin.place, scheduled.destination.place, onTheGround(at('17:35')))
      if (!flight) throw new Error('The dusk flight has no plan')
      const progress = mapFlightProgress(flight, at('17:35'))
      return factsOf({ ...scheduled, start: progress.start, end: progress.end, flight }, { isReplay })
    }
    // In a replay the map has the schedule's plane in the air, flying into the sunset: the same leg has a sky row then.
    expect(row('sky', rowsAt(dusk(true), '17:35')).title).toBe('Flying into the night')
    expect(rowsAt(dusk(false), '17:35').map((r) => r.kind)).toEqual(['below', 'plane', 'distance', 'headed'])
  })

  it('says nothing of it before the plan’s takeoff: an on-time plane taxiing out reads as before', () => {
    // 10:05, ten minutes before the plan's takeoff: what's below the plane at the gate, and nothing flown yet.
    const theFacts = atTheGate('10:05')
    expect(headline(theFacts, at('10:05'))).toBe('Over Alpha')
    const rows = rowsAt(theFacts, '10:05')
    expect(row('below', rows).title).toBe('Over Alpha')
    expect(row('below', rows).detail).toMatch(/^Passes 35 mi from home at \d/)
    expect(row('distance', rows).title).toBe('0 mi flown · 1,382 to go')
    expect(row('distance', rows).detail).toMatch(/^Halfway at \d/)
  })

  it('leads the headline before a crossing the schedule’s times have it make', () => {
    // A border 1° E along: at 10:28 the schedule's plane, flying the plan's three hours from 10:15 to the live landing,
    // crossed it three minutes ago.
    const border = makeGeography([box('Alpha', 'country', -1, 1), box('Bravo', 'country', 1, 21)], [])
    expect(headline(atTheGate('10:28', { geography: border }), at('10:28'))).toBe('Still on the ground in Rockford')
  })

  it('has a sentence for screen readers that names nothing below it', () => {
    // It lands three hours after the moment it takes off, as if that were now, and 7 minutes later reaches the gate.
    expect(cardSummary(atTheGate('10:35'), at('10:35'), 'Alex'))
      .toBe(`TST1 to E20, still on the ground, 20 minutes behind schedule. Lands about 9:42${AM} your time. Opens the full map.`)
  })

  it('in a replay, reads where the map has the plane: the schedule’s, as it has no record', () => {
    const theFacts = atTheGate('10:35', { isReplay: true })
    expect(headline(theFacts, at('10:35'))).toBe('Over Alpha')
    expect(row('distance', rowsAt(theFacts, '10:35')).title).toBe('138 mi flown · 1,244 to go')
  })

  it('on the ground somewhere else, follows the app: what’s below as far as it was seen flying', () => {
    // A diversion: on the ground at 3° E, never seen in the air, so 0 mi along its path.
    const theFacts = factsOf(equatorLiveLeg(onTheGround(at('10:35'), { lat: 0, lng: 3 }), at('10:35')))
    expect(headline(theFacts, at('10:35'))).toBe('Over Alpha')
    expect(row('distance', rowsAt(theFacts, '10:35')).title).toBe('0 mi flown · 1,382 to go')
  })

  it('landed, follows the app: what’s below the arrival airport, all of it flown', () => {
    // Down at 12:55, and at the gate 7 minutes later.
    const theFacts = facts('12:53', { now: '12:58', landed: true })
    expect(headline(theFacts, at('12:58'))).toBe('Over the Test Sea')
    expect(row('distance', rowsAt(theFacts, '12:58')).title).toBe('1,382 mi flown · 0 to go')
  })
})

describe('a real plane still at its departure airport: nothing passed, and its times guesses (the website’s own, Todd, 16 Nov 2026)', () => {
  /** A border 1° E along: the schedule's times have the plane cross it at 10:24, before the real one has left. */
  const border = makeGeography([box('Alpha', 'country', -1, 1), box('Bravo', 'country', 1, 21)], [])

  it('leaves the flight out of the trip so far until it takes off, as nothing of it is flown: no crossing, and no "In the air now"', () => {
    const soFar = tripSoFar(atTheGate('10:28', { geography: border }), at('10:28'))
    expect(soFar.flights).toEqual([])
    expect(soFar.totals).toBe('Day 1 of 1')
    // Before the plan's takeoff it's the flight between its gates, as the app has it, and set apart.
    expect(tripSoFar(atTheGate('10:05', { geography: border }), at('10:05')).flights.map((f) => f.tag)).toEqual(['In the air now'])
    // Once it's seen in the air it's set apart, with what it has passed.
    expect(tripSoFar(facts('10:35', { now: '10:35' }), at('10:35')).flights.map((f) => f.tag)).toEqual(['In the air now'])
  })

  it('has no latest event, and the card’s sentence none, as it has passed nothing; in a replay, the schedule’s', () => {
    // The schedule's times have it cross the border at 10:24.
    const theFacts = atTheGate('10:28', { geography: border })
    expect(latestEvent(theFacts, at('10:28'))).toBeNull()
    expect(cardSummary(theFacts, at('10:28'), 'Alex')).not.toMatch(/Latest/)
    expect(latestEvent(atTheGate('10:28', { geography: border, isReplay: true }), at('10:28'))).toEqual({
      title: 'Crossed into Bravo', when: `6:24${AM}`, sentence: `Latest: crossed into Bravo, at 6:24${AM}.`,
    })
  })

  it('in a replay, lists them where the map has the plane: the schedule’s, as it has no record', () => {
    const soFar = tripSoFar(atTheGate('10:28', { geography: border, isReplay: true }), at('10:28'))
    expect(soFar.flights.map((f) => f.tag)).toEqual(['In the air'])
    expect(soFar.flights[0]?.events.map((e) => e.text)).toEqual([`Crossed into Bravo · 6:24${AM}`])
  })

  it('says "about" of the leg’s halfway and closest-to-home times, worked out from a takeoff that hasn’t happened', () => {
    const rows = rowsAt(atTheGate('10:35'), '10:35')
    expect(row('below', rows).detail).toMatch(/^Passes 35 mi from home at about \d{1,2}:\d\d AM$/)
    expect(row('distance', rows).detail).toMatch(/^Halfway at about \d{1,2}:\d\d AM · /)
  })

  it('never says it has passed closest to home: a guessed time already gone by is left out, as halfway’s is', () => {
    // Home by 1° E, and the plane held at the gate until 11:00: the schedule's times have it pass home at 10:26.
    const leg = fromRockford(onTheGround(at('11:00')), '11:00')
    const theFacts = makeTripFacts(flightMap(leg, mark('HOME', 0.5, 1)), {
      geography: EQUATOR, comparisons: appComparisons(), viewerTz: NY, h24: false, day: 1, days: 1,
    })
    const rows = rowsAt(theFacts, '11:00')
    expect(row('below', rows)).toMatchObject({ title: 'Still on the ground in Rockford', detail: null })
    expect(row('distance', rows).detail).toMatch(/^Halfway at about /)
  })

  it('in a replay, and on the ground somewhere else, tells the schedule’s times as they are', () => {
    expect(row('below', rowsAt(atTheGate('10:35', { isReplay: true }), '10:35')).detail).toMatch(/^Passes 35 mi from home at \d/)
    const elsewhere = factsOf(equatorLiveLeg(onTheGround(at('10:35'), { lat: 0, lng: 3 }), at('10:35')))
    expect(row('below', rowsAt(elsewhere, '10:35')).detail).toMatch(/^Passes 35 mi from home at \d/)
    expect(row('distance', rowsAt(elsewhere, '10:35')).detail).toMatch(/^Halfway at \d/)
  })
})

describe('the full map’s facts at a moment, with and without live data (Stage 3 spec §7.3, §8)', () => {
  it('credit adsb.lol whenever a flight of the trip has live data', () => {
    expect(factsAtMoment(facts('11:10'), at('11:10'), at('11:10')).showsLiveCredit).toBe(true)
    // In a replay too, and at a moment before the real plane was seen: it's the trip on screen that has live data.
    expect(factsAtMoment(facts('11:10', { isReplay: true }), at('10:05'), at('11:10')).showsLiveCredit).toBe(true)
    expect(factsAtMoment(factsOf(equatorFlight(0, 20)), at('11:10'), at('11:10')).showsLiveCredit).toBe(false)
    expect(factsAtMoment(factsOf(equatorLiveLeg(null, at('11:10'))), at('11:10'), at('11:10')).showsLiveCredit).toBe(false)
  })

  it('credit adsb.lol for a real path with no fix, and for a plane seen only at its gate, with no path yet', () => {
    const pathOnly = equatorLiveLeg({ ...equatorLive(at('11:10')), fix: null }, at('11:10'))
    expect(pathOnly.flight?.path.isReal).toBe(true)
    expect(factsAtMoment(factsOf(pathOnly), at('11:10'), at('11:10')).showsLiveCredit).toBe(true)
    const gate = atTheGate('10:35')
    const leg = gate.map.legs.find((l) => l.kind === 'flight')!
    expect(leg.flight?.live?.fix).not.toBeNull()
    expect(leg.flight?.path.isReal).toBe(false)
    expect(factsAtMoment(gate, at('10:35'), at('10:35')).showsLiveCredit).toBe(true)
  })

  it('of a flight with no live data, are the same in a replay as they were, but for the tag that says it’s now', () => {
    // The flight in the air is "In the air now", and in a replay "In the air" (best guesses design §4).
    const asReplay = (moment: FactsAtMoment): FactsAtMoment => ({
      ...moment,
      tripSoFar: { ...moment.tripSoFar, flights: moment.tripSoFar.flights.map((f) => ({ ...f, tag: f.tag && 'In the air' })) },
    })
    for (const leg of [equatorFlight(0, 20), equatorLiveLeg(null, at('11:10'))]) {
      for (const t of ['10:05', '10:35', '11:10', '12:07', '13:20']) {
        expect(factsAtMoment(factsOf(leg, { isReplay: true }), at(t), at('11:10'))).toEqual(asReplay(factsAtMoment(factsOf(leg), at(t), at('11:10'))))
      }
    }
  })
})
