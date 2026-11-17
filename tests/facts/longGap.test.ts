import { describe, expect, it } from 'vitest'
import type { FactRow } from '../../src/facts/factRow'
import { isOcean, makeGeography, OCEAN_NAMES } from '../../src/facts/geography'
import { GUESS_HORIZON_MS, isPastGuessHorizon, type PlanePosition } from '../../src/facts/planePosition'
import { belowText, cardSummary, headline, latestEvent, makeTripFacts, tripSoFar, type TripFacts } from '../../src/facts/tripFacts'
import { factRows } from '../../src/facts/tripFactsRows'
import { OWN_SPEED_AHEAD_MS } from '../../src/map/flightPlan'
import { appGeography, box, flightMap } from './factsTestData'
import { caseMapLeg, caseMoment, caseNamed, date, equatorLive, equatorLiveLeg, HOME_BY_THE_EQUATOR } from './liveFacts'

/**
 * The facts past 2 hours out of tracking range (long gap design §3), in US English for a family in Louisville, as the
 * app's LongGapFactsTests. The made-up flight is liveFacts.ts's equator flight, to 24° E: in the air from 10:15 to 13:15
 * UTC by the schedule, whose cruise is 513.7 kt. The real plane flies a degree every 8 minutes (450 kt) and is last seen
 * at 3.75° E at 10:45. From there it's flown on at 450 kt for 2 hours of its cruise and at the plan's after, one speed of
 * 460.2 kt, so it touches down at 13:33.6 by its estimate and is guessed at 19.1° E at 12:45, 2 hours after it was last
 * seen.
 */

const NY = 'America/New_York'
const at = (hhmm: string) => date(`2026-03-20T${hhmm}:00Z`)

/** The time's own space, narrow and unbreaking, as an ordinary one. */
const plain = (text: string | null | undefined) => text?.replace(/\u202F/g, ' ')

/**
 * Along the equator: Alpha to 5° E, Bravo to 10° E, the Atlantic to 20° E, the Test Sea to 21° E and Delta to 25° E,
 * with Portville 0.1° north of 19.1° E.
 */
const GEOGRAPHY = makeGeography(
  [box('Alpha', 'country', -1, 5), box('Bravo', 'country', 5, 10), box('the Atlantic', 'water', 10, 20), box('the Test Sea', 'water', 20, 21),
    box('Delta', 'country', 21, 25)],
  [{ name: 'Portville', lat: 0.1, lon: 19.1 }],
)

interface Options {
  /** When the real plane was last seen: 10:45, unless it's given. */
  seenUntil?: string
  /** When the map was made. */
  now: string
  /** Longitudes between which nobody saw it, both ends left out. */
  unseen?: [number, number]
  isReplay?: boolean
}

/** The facts of a map of the one flight, last seen at `seenUntil` and nobody seeing it over `unseen`, made at `now`. */
function facts({ seenUntil = '10:45', now, unseen, isReplay = false }: Options): TripFacts {
  const leg = equatorLiveLeg(equatorLive(at(seenUntil), { unseen }), at(now), { east: 24 })
  return makeTripFacts(flightMap(leg, HOME_BY_THE_EQUATOR), { geography: GEOGRAPHY, comparisons: null, viewerTz: NY, h24: false, isReplay })
}

function belowRow(theFacts: TripFacts, t: string): FactRow | undefined {
  return factRows(theFacts, at(t), at(t)).find((r) => r.kind === 'below')
}

/** The flight's lines in the list at `t`, newest first. */
const events = (theFacts: TripFacts, t: string) => tripSoFar(theFacts, at(t)).flights[0]?.events.map((e) => plain(e.text))

describe("what's below, past 2 hours out of tracking range (long gap design §3)", () => {
  it('names the ocean, with no city', () => {
    // At 12:43, 1 h 58 min after it was last seen, it's guessed at 18.8° E, 20 mi from Portville.
    expect(headline(facts({ now: '12:43' }), at('12:43'))).toBe('Over the Atlantic, near Portville')
    // At 12:48, 2 h 3 min after, at 19.5° E: still 26 mi from Portville, but past 2 hours no city is told.
    expect(headline(facts({ now: '12:48' }), at('12:48'))).toBe('Over the Atlantic')
  })

  it('names nothing over a sea or land, and the headline is the landing countdown', () => {
    // It reaches the gate at 13:40.6 by its estimate. At 12:58 it's guessed at 20.75° E, over the Test Sea.
    expect(headline(facts({ now: '12:58' }), at('12:58'))).toBe('Landing in 43 min')
    // At 13:10, at 22.2° E, over Delta.
    const overDelta = facts({ now: '13:10' })
    expect(headline(overDelta, at('13:10'))).toBe('Landing in 31 min')
    expect(belowText(overDelta, overDelta.map.legs[0], at('13:10'))).toBeNull()
    // Within 2 hours of the last sighting, land is named as before.
    expect(headline(facts({ seenUntil: '11:20', now: '13:10' }), at('13:10'))).toBe('Over Delta')
  })

  it('leaves the first row to where it was last tracked over land, and names the ocean above it', () => {
    // The website's own rows, which the app's tests leave to its sheet: "Last tracked …" and closest to home as before.
    const overLand = belowRow(facts({ now: '13:10' }), '13:10')
    expect(plain(overLand?.title)).toBe('Last tracked over Alpha · 2 h 25 min ago')
    expect(plain(overLand?.detail)).toBe('Closest to home was 35 mi at about 8:05 AM')
    const overTheOcean = belowRow(facts({ now: '12:48' }), '12:48')
    expect(plain(overTheOcean?.title)).toBe('Over the Atlantic')
    expect(plain(overTheOcean?.detail)).toBe('Last tracked over Alpha · 2 h 3 min ago · Closest to home was 35 mi at about 8:05 AM')
  })

  it('in a replay, past 2 hours after the last sighting, names only the ocean', () => {
    const replay = facts({ now: '13:10', isReplay: true })
    expect(headline(replay, at('12:43'))).toBe('Over the Atlantic, near Portville')
    expect(headline(replay, at('12:48'))).toBe('Over the Atlantic')
  })

  it("in a replay of a gap closed by a new sighting, is what's on the straight join", () => {
    // Seen again at 20.5° E at 12:59, the gap is a straight join between two places the plane was seen, so at 12:50, at
    // 19.4° E on it, the city by it is told as ever.
    const replay = facts({ seenUntil: '13:05', now: '13:05', unseen: [3.8, 20.5], isReplay: true })
    expect(headline(replay, at('12:50'))).toBe('Over the Atlantic, near Portville')
  })
})

describe("the shared long ocean gap, with the site's geography (long gap design §3)", () => {
  // live-cases.json's Louisville to Cologne: last tracked over Québec at 19:39:30 UTC and never again, at the gate at
  // 01:39 by its estimate.
  const flightCase = caseNamed('faster than the plan, then a long ocean gap')
  const shared = () => makeTripFacts(flightMap(caseMapLeg(flightCase, caseMoment(flightCase, '13T21:39:30')), null), {
    geography: appGeography(), comparisons: null, viewerTz: NY, h24: false,
  })

  it('names the Atlantic with no city, and nothing over England', () => {
    expect(headline(shared(), date('2026-11-13T22:30:00Z'))).toBe('Over the Atlantic')
    // At 00:40, 5 hours on, it's guessed over England: the landing countdown, and where it was last tracked.
    expect(headline(shared(), date('2026-11-14T00:40:00Z'))).toBe('Landing in 1 h')
    const row = factRows(shared(), date('2026-11-14T00:40:00Z'), date('2026-11-14T00:40:00Z')).find((r) => r.kind === 'below')
    expect(plain(row?.title)).toBe('Last tracked over Québec · 5 h 1 min ago')
  })

  it("holds what it's guessed to pass more than 2 hours on, halfway among them, until it's at the gate", () => {
    // Halfway is guessed at 21:45, 2 h 5 min on; then Ireland, the United Kingdom, the North Sea, the Netherlands and
    // Germany.
    const lines = (iso: string) => tripSoFar(shared(), date(iso)).flights[0]?.events.map((e) => e.text.split(' · ')[0])
    expect(latestEvent(shared(), date('2026-11-14T01:00:00Z'))?.title).toBe('Out over the Labrador Sea')
    expect(lines('2026-11-14T01:00:00Z')?.[0]).toBe('Out over the Labrador Sea')
    expect(lines('2026-11-14T01:00:00Z')).not.toContain('Halfway')
    expect(lines('2026-11-14T01:45:00Z')?.slice(0, 3)).toEqual(['Crossed into Germany', 'Crossed into the Netherlands', 'Out over the North Sea'])
    expect(lines('2026-11-14T01:45:00Z')).toContain('Halfway')
  })
})

describe('2 hours out of tracking range (long gap design §3)', () => {
  const plane = (unseenFor: number | null): PlanePosition =>
    ({ distance: 0, place: { lat: 0, lng: 10 }, unseenFor, isEstimated: unseenFor != null, isSeenInAir: false })

  it('is past from just over 2 hours', () => {
    expect(isPastGuessHorizon(plane(null))).toBe(false)
    expect(isPastGuessHorizon(plane(2 * 60 * 60_000))).toBe(false)
    expect(isPastGuessHorizon(plane(2 * 60 * 60_000 + 1))).toBe(true)
  })

  it("is the 2 hours the plane's own speed is trusted for, deliberately the same", () => {
    expect(GUESS_HORIZON_MS).toBe(OWN_SPEED_AHEAD_MS)
  })
})

describe('events, past 2 hours out of tracking range (long gap design §3)', () => {
  it('are held from the list when guessed more than 2 hours after the last sighting', () => {
    // By the guess it crosses into Delta at 21° E just before 13:00, over 2 hours after it was last seen: not told. The
    // others were guessed within the 2 hours, and are told with "about".
    expect(events(facts({ now: '13:10' }), '13:10')).toEqual([
      'Closest to home, 35 mi · about 8:05 AM', 'Halfway · about 7:49 AM', 'Out over the Atlantic · about 7:34 AM', 'Crossed into Bravo · about 6:54 AM',
    ])
  })

  it('are held from the banner and the headline', () => {
    const guessed = facts({ now: '13:10' })
    expect(latestEvent(guessed, at('13:10'))?.title).toBe('Closest to home, 35 mi')
    // Not "Just crossed into Delta": over land past 2 hours, the landing countdown.
    expect(headline(guessed, at('13:02'))).toBe('Landing in 39 min')
  })

  it('are all told as best guesses once the flight is over, if it is never tracked again', () => {
    // It reaches the gate at 13:40.6 by its estimate. After that the crossing into Delta is told too.
    const over = facts({ now: '13:45' })
    expect(events(over, '13:45')?.[0]).toBe('Crossed into Delta · about 8:59 AM')
    expect(events(over, '13:45')).toHaveLength(5)
    // Not before: at 13:30 it's past the schedule's 13:22 at the gate, but in the air by its estimate.
    expect(events(facts({ now: '13:30' }), '13:30')?.[0]).toBe('Closest to home, 35 mi · about 8:05 AM')
  })

  it('are told on the straight join once the plane is tracked again', () => {
    // Nobody saw it from 3.75° E at 10:45 to 20.5° E at 12:59. Seen again, it crossed into Delta just before 13:03, and
    // what it passed in the gap is told on the straight join between the two, with "about".
    const trackedAgain = facts({ seenUntil: '13:05', now: '13:05', unseen: [3.8, 20.5] })
    expect(events(trackedAgain, '13:05')).toEqual([
      'Crossed into Delta · 9:02 AM', 'Closest to home, 35 mi · about 8:06 AM', 'Halfway · about 7:51 AM', 'Out over the Atlantic · about 7:35 AM',
      'Crossed into Bravo · about 6:55 AM',
    ])
    // The website's own banner and headline: the newest event, seen, with its plain time.
    expect(latestEvent(trackedAgain, at('13:05'))?.title).toBe('Crossed into Delta')
    expect(headline(trackedAgain, at('13:05'))).toBe('Just crossed into Delta')
  })
})

describe('the card for screen readers, past 2 hours (long gap design §3)', () => {
  it("leaves out what's below over land, and says the ocean", () => {
    expect(plain(cardSummary(facts({ now: '13:10' }), at('13:10'), 'Alex')))
      .toMatch(/^TST1 to E24, about 19 minutes behind schedule, last tracked over Alpha\. Lands about 9:40 AM your time\. /)
    expect(plain(cardSummary(facts({ now: '12:48' }), at('12:48'), 'Alex')))
      .toMatch(/^TST1 to E24, about 19 minutes behind schedule, over the Atlantic, last tracked over Alpha\. /)
  })

  it('tells the newest event told, and none held', () => {
    expect(plain(cardSummary(facts({ now: '13:10' }), at('13:10'), 'Alex'))).toBe(
      'TST1 to E24, about 19 minutes behind schedule, last tracked over Alpha. Lands about 9:40 AM your time. Latest: closest to home, 35 miles, about 1 hour 5 minutes ago. Opens the full map.',
    )
  })
})

describe('the oceans (long gap design §3)', () => {
  it('are the five oceans only', () => {
    expect(isOcean({ name: 'the Pacific', kind: 'water', country: null })).toBe(true)
    expect(isOcean({ name: 'the Sea of Okhotsk', kind: 'water', country: null })).toBe(false)
    expect(isOcean({ name: 'Japan', kind: 'country', country: 'Japan' })).toBe(false)
  })

  it("are all in the site's geography, by its names", () => {
    const waters = new Set(appGeography().areas.filter((a) => a.kind === 'water').map((a) => a.name))
    expect([...OCEAN_NAMES].filter((name) => !waters.has(name))).toEqual([])
    expect(OCEAN_NAMES.size).toBe(5)
  })
})
