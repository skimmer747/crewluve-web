import { describe, expect, it } from 'vitest'
import { makeFactsStore, pathKey, PATHS_KEPT, type FactsStore } from '../../src/facts/factsStore'
import type { Geography } from '../../src/facts/geography'
import { legPathLength } from '../../src/facts/legCourse'
import { makeTripFacts, type TripFacts } from '../../src/facts/tripFacts'
import type { LiveFlight } from '../../src/map/liveFlight'
import { makeMapFlight, mapFlightProgress } from '../../src/map/mapFlight'
import { airportMark, legDistanceMeters, type AirportMark, type MapLeg, type TripMap } from '../../src/map/tripMap'
import { AIRPORTS } from '../map/tripMapLegs'
import { EQUATOR, equatorFlight, EQUINOX, flightMap } from './factsTestData'
import { dogLeg, equatorLive, equatorLiveLeg, HOME_BY_THE_EQUATOR, liveTime } from './liveFacts'

/**
 * Keeping each flight's story and sun events between renders (Stage 2 spec §3.2, Stage 3 spec §8), as the app's
 * LegStoryStoreTests at 6d3e74e. The website works the facts out on each render, so what the app's `prepare` waits for
 * is here what a later render makes: a real path's story is made at once the first time, and again as the path grows,
 * no oftener than once a minute by the store's clock. The made-up real plane is liveFacts': a degree of longitude every
 * 8 minutes from 10:15 UTC, seen every 2 minutes (a quarter of a degree).
 */

const NY = 'America/New_York'
const HOUR = 3_600_000

/** A store whose clock the test moves by hand, from the equinox, as the app's TestClock. */
function storeWithClock(): { store: FactsStore; later: (seconds: number) => void } {
  const clock = { now: EQUINOX }
  return { store: makeFactsStore(() => clock.now), later: (seconds) => (clock.now += seconds * 1000) }
}

/** The facts of `map` as the page asks for them, with `store` keeping what it can. */
function factsFor(store: FactsStore | null, map: TripMap, { geography = EQUATOR, isReplay = false }: { geography?: Geography | null; isReplay?: boolean } = {}): TripFacts {
  return makeTripFacts(map, { geography, comparisons: null, viewerTz: NY, h24: false, store, isReplay })
}

/** The equator flight alone, with a real plane that left the great circle and was last seen at `longitude`° E. */
function liveMap(longitude: number, { altitudeFt = 36_000, id = 'eq', home = null }: { altitudeFt?: number; id?: string; home?: AirportMark | null } = {}): TripMap {
  const seenUntil = liveTime(longitude)
  return flightMap(equatorLiveLeg(equatorLive(seenUntil, { altitudeFt, latitude: dogLeg }), seenUntil, { id }), home)
}

/** The length of the path of the map's one flight. */
const lengthOf = (map: TripMap) => legPathLength(map.legs[0])

/**
 * The equator flight seven hours later, into the evening: the real plane and the schedule's each see the sun set, at
 * different times. With `longitude`, the real plane was last seen there; without, its live data is gone.
 */
function eveningMap(longitude: number | null): TripMap {
  const evening = 7 * HOUR
  const seenUntil = liveTime(longitude ?? 13)
  const flown = equatorLive(seenUntil)
  const live: LiveFlight | null = longitude == null ? null : {
    ...flown,
    fix: flown.fix && { ...flown.fix, seenAt: flown.fix.seenAt + evening },
    trail: flown.trail.map((p) => ({ ...p, time: p.time + evening })),
  }
  const scheduled = equatorFlight(0, 20, EQUINOX + evening)
  const flight = makeMapFlight(scheduled.start, scheduled.end, scheduled.origin.place, scheduled.destination.place, live)
  if (!flight) throw new Error('The evening flight has no plan')
  const progress = mapFlightProgress(flight, seenUntil + evening)
  return flightMap({ ...scheduled, start: progress.start, end: progress.end, flight }, null)
}

describe('the store: a flight on the schedule (Stage 2 spec §3.2)', () => {
  it('keeps the route’s story at a new delay, and has the new times’ sun events at once: they never vanish', () => {
    // Overnight from Louisville to Cologne: the cockpit sees the sun rise.
    const store = makeFactsStore()
    const night = (delay: number): TripMap => {
      const start = Date.parse('2026-11-13T23:00:00Z') + delay
      const leg: MapLeg = { id: 'night', kind: 'flight', origin: airportMark('SDF', AIRPORTS)!, destination: airportMark('CGN', AIRPORTS)!, start, end: start + 8 * HOUR, flightNumber: 'UPS207' }
      return flightMap(leg, null)
    }
    const onTime = factsFor(store, night(0))
    const sunrise = onTime.sunEvents.night?.[0]
    expect(sunrise?.kind).toBe('sunrise')

    const delayed = factsFor(store, night(1.5 * HOUR))
    expect(delayed.stories.night).toBe(onTime.stories.night)
    expect(delayed.sunEvents.night?.[0]?.kind).toBe('sunrise')
    expect(delayed.sunEvents.night?.[0]?.time).not.toBe(sunrise?.time)
  })
})

describe('the store: a real path (Stage 3 spec §8)', () => {
  it('makes a real path a story of its own, along the path, at once', () => {
    const { store } = storeWithClock()
    const map = liveMap(13)
    const facts = factsFor(store, map)
    expect(facts.stories.eq?.length).toBe(lengthOf(map))
    expect(facts.stories.eq?.length).toBeGreaterThan(legDistanceMeters(map.legs[0]))
    expect(facts.sunEvents.eq).toBeDefined()
  })

  it('keeps the story and the sun events it has while the path grows within a minute, then makes them again', () => {
    const { store, later } = storeWithClock()
    const first = factsFor(store, liveMap(8))
    const grown = liveMap(8.25)
    expect(lengthOf(grown)).not.toBe(lengthOf(liveMap(8)))

    // A new place 20 seconds later: what it has shows meanwhile.
    later(20)
    expect(factsFor(store, grown).stories.eq).toBe(first.stories.eq)
    expect(factsFor(store, grown).sunEvents.eq).toBe(first.sunEvents.eq)
    later(39.999)
    expect(factsFor(store, grown).stories.eq).toBe(first.stories.eq)

    // The minute is out.
    later(0.001)
    const again = factsFor(store, grown)
    expect(again.stories.eq?.length).toBe(lengthOf(grown))
    expect(again.sunEvents.eq).not.toBe(first.sunEvents.eq)
  })

  it('makes the story at once when the path grows a minute later', () => {
    const { store, later } = storeWithClock()
    factsFor(store, liveMap(8))
    later(60)
    const grown = liveMap(9)
    expect(factsFor(store, grown).stories.eq?.length).toBe(lengthOf(grown))
  })

  it('counts the minute from the story it has, so a path that keeps growing still has a new one each minute', () => {
    const { store, later } = storeWithClock()
    const first = factsFor(store, liveMap(8))
    later(20)
    expect(factsFor(store, liveMap(8.25)).stories.eq).toBe(first.stories.eq)

    // The path changes again: still the story it had, and the next is a minute after it, not after this change.
    later(10)
    const grownAgain = liveMap(8.5)
    expect(factsFor(store, grownAgain).stories.eq).toBe(first.stories.eq)
    later(30)
    const second = factsFor(store, grownAgain).stories.eq
    expect(second?.length).toBe(lengthOf(grownAgain))

    // And the minute after that is counted from this one.
    later(20)
    const grownOnceMore = liveMap(8.75)
    expect(factsFor(store, grownOnceMore).stories.eq).toBe(second)
    later(40)
    expect(factsFor(store, grownOnceMore).stories.eq?.length).toBe(lengthOf(grownOnceMore))
  })

  it('makes nothing for the same path again', () => {
    const { store, later } = storeWithClock()
    const first = factsFor(store, liveMap(8))
    later(5)
    const again = factsFor(store, liveMap(8))
    expect(again.stories.eq).toBe(first.stories.eq)
    expect(again.sunEvents.eq).toBe(first.sunEvents.eq)
    later(120)
    expect(factsFor(store, liveMap(8)).stories.eq).toBe(first.stories.eq)
  })

  it('shows a real path’s sun events until the next are made, so nothing blinks at a new landing estimate', () => {
    const { store, later } = storeWithClock()
    const sunEvents = factsFor(store, eveningMap(13)).sunEvents.eq
    expect(sunEvents?.map((e) => e.kind)).toEqual(['sunset'])

    later(20)
    expect(factsFor(store, eveningMap(13.25)).sunEvents.eq).toBe(sunEvents)
    later(40)
    const next = factsFor(store, eveningMap(13.25)).sunEvents.eq
    expect(next).not.toBe(sunEvents)
    expect(next?.map((e) => e.kind)).toEqual(['sunset'])
  })

  it('gives a flight back on the schedule its route’s story again, and a real path that comes back its own at once', () => {
    // Its live data is gone, as after Disconnect: the leg flies the great circle again.
    const { store, later } = storeWithClock()
    factsFor(store, liveMap(8))
    const leg = equatorFlight(0, 20)
    expect(factsFor(store, flightMap(leg, null)).stories.eq?.length).toBe(legDistanceMeters(leg))

    // Seen again 5 seconds later, a place further on: a flight newly seen, whose story isn't held up by the one before.
    later(5)
    const back = liveMap(8.25)
    expect(lengthOf(back)).not.toBe(lengthOf(liveMap(8)))
    expect(factsFor(store, back).stories.eq?.length).toBe(lengthOf(back))
  })

  it('gives a flight back on its real path, after a turn on the schedule, its own sun events again, at once', () => {
    const { store, later } = storeWithClock()
    const real = factsFor(store, eveningMap(13)).sunEvents.eq
    expect(real?.map((e) => e.kind)).toEqual(['sunset'])

    const planned = factsFor(store, eveningMap(null)).sunEvents.eq
    expect(planned?.[0]?.time).not.toBe(real?.[0]?.time)

    later(5)
    expect(factsFor(store, eveningMap(13)).sunEvents.eq).toEqual(real)
  })

  it('doesn’t hold a story up when the clock was set back', () => {
    // The clock goes back five minutes. The last story now looks as if it were made in the future.
    const { store, later } = storeWithClock()
    factsFor(store, liveMap(8))
    later(-300)
    const grown = liveMap(8.25)
    expect(factsFor(store, grown).stories.eq?.length).toBe(lengthOf(grown))
  })

  it('makes a real path’s story at once when the geography comes, or home changes, whatever the minute', () => {
    const { store, later } = storeWithClock()
    const before = factsFor(store, liveMap(8), { geography: null })
    expect(before.stories.eq).toBeUndefined()
    expect(before.sunEvents.eq).toBeDefined()

    later(5)
    const grown = liveMap(8.25)
    expect(factsFor(store, grown).stories.eq?.length).toBe(lengthOf(grown))
    expect(factsFor(store, grown).stories.eq?.closestToHome).toBeNull()

    // Home by the equator, which the path passes 35 mi from once it's back on the equator by 10° E.
    later(5)
    expect(factsFor(store, liveMap(8.25, { home: HOME_BY_THE_EQUATOR })).stories.eq?.closestToHome).not.toBeNull()
  })

  it('hides a story while there’s no geography, and shows it again when it’s back', () => {
    const { store, later } = storeWithClock()
    const first = factsFor(store, liveMap(8))
    later(5)
    expect(factsFor(store, liveMap(8), { geography: null }).stories.eq).toBeUndefined()
    later(5)
    expect(factsFor(store, liveMap(8)).stories.eq).toBe(first.stories.eq)
  })

  it('without a store, has each real path’s own facts, made afresh', () => {
    const grown = liveMap(8.25)
    factsFor(null, liveMap(8))
    expect(factsFor(null, grown).stories.eq?.length).toBe(lengthOf(grown))
  })

  it('forgets old flights’ paths, but never one on the map it’s asked about', () => {
    const { store, later } = storeWithClock()
    // It keeps up to PATHS_KEPT flights, and then starts again from the one asked about.
    for (let i = 0; i < 3 * PATHS_KEPT; i++) {
      factsFor(store, liveMap(8, { id: `eq${i}` }))
      expect(store.paths.size).toBe(i < PATHS_KEPT ? i + 1 : ((i - PATHS_KEPT) % PATHS_KEPT) + 1)
    }

    // A trip with more flights than that keeps every one of them.
    const legs = Array.from({ length: PATHS_KEPT + 2 }, (_, i) => liveMap(8, { id: `trip${i}` }).legs[0])
    const trip: TripMap = { ...flightMap(legs[0], null), legs }
    const first = factsFor(store, trip)
    expect(store.paths.size).toBe(PATHS_KEPT + 2)
    later(5)
    const again = factsFor(store, trip)
    for (const leg of legs) expect(again.stories[leg.id]).toBe(first.stories[leg.id])
  })

  it('hands on whether it’s a replay', () => {
    const { store } = storeWithClock()
    expect(factsFor(store, liveMap(8)).isReplay).toBe(false)
    expect(factsFor(store, liveMap(8), { isReplay: true }).isReplay).toBe(true)
  })
})

describe('the store’s key for a real path (Stage 3 spec §8)', () => {
  it('changes when a real path grows, or its sky is seen from another height', () => {
    const key = pathKey(liveMap(8).legs[0])
    expect(key).toBe(pathKey(liveMap(8).legs[0]))
    expect(key).not.toBe(pathKey(liveMap(8.25).legs[0]))
    expect(key).not.toBe(pathKey(liveMap(8, { altitudeFt: 38_000 }).legs[0]))
  })

  it('changes with a new landing estimate, from the same places seen', () => {
    // Early in the flight, before the plane's own speed is known, a later arrival on the schedule moves the estimate.
    const live = equatorLive(liveTime(1))
    const scheduled = equatorFlight(0, 20)
    const arrivingAt = (arrival: number): MapLeg => {
      const flight = makeMapFlight(scheduled.start, arrival, scheduled.origin.place, scheduled.destination.place, live)
      if (!flight) throw new Error('No plan')
      return { ...scheduled, flight }
    }
    expect(pathKey(arrivingAt(scheduled.end))).not.toBe(pathKey(arrivingAt(scheduled.end + 30 * 60_000)))
  })

  it('is only for a flight with a real path', () => {
    expect(pathKey(equatorFlight(0, 20))).toBeNull()
    expect(pathKey(equatorLiveLeg(null, EQUINOX))).toBeNull()
    expect(pathKey(liveMap(8).legs[0])).not.toBeNull()
  })
})
