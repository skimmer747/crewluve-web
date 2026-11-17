import { describe, expect, it } from 'vitest'
import { liveLabelText } from '../../src/copy/tripMap'
import { DEMO_SCENES, demoRawForScene, type DemoScene } from '../../src/data/demo'
import { demoLiveFlights, isLiveDemoScene } from '../../src/data/demoLive'
import { buildLegs } from '../../src/engine/legs'
import { liveMapFlights, withLiveTimes } from '../../src/engine/liveLegs'
import { buildSchedule } from '../../src/engine/normalize'
import { makeSnapshot } from '../../src/engine/snapshot'
import { headline, makeTripFacts, tripSoFar } from '../../src/facts/tripFacts'
import { factRows } from '../../src/facts/tripFactsRows'
import { mapFlightProgress } from '../../src/map/mapFlight'
import { tripMapFor } from '../../src/map/tripMapFor'
import { appGeography } from '../facts/factsTestData'
import { testAirports } from '../fixtures/airports'

const NOW = Date.UTC(2026, 9, 20, 16, 0)
const MINUTE = 60_000
const NY = 'America/New_York'

const placeOf = (code: string) => {
  const airport = testAirports.get(code)
  return airport ? { lat: airport.lat, lng: airport.lng } : null
}

/** The scene's real plane `minutes` after it opens, as the status page would see it: its phase, label, and path. */
function sceneAt(scene: DemoScene, minutes = 0) {
  const schedule = buildSchedule(demoRawForScene(scene, NOW), NOW)
  const at = NOW + minutes * MINUTE
  const answered = demoLiveFlights(scene, schedule, placeOf, at)
  const flights = liveMapFlights(schedule, answered, 0, placeOf)
  const [flight] = [...flights.values()]
  if (!flight) return null
  const progress = mapFlightProgress(flight, at)
  return { flight, progress, label: progress.label ? liveLabelText(progress.label) : null }
}

/** The facts of the scene `minutes` after it opens, with the site's geography, as the status page makes them. */
function sceneFacts(scene: DemoScene, minutes = 0) {
  const at = NOW + minutes * MINUTE
  const summary = buildSchedule(demoRawForScene(scene, NOW), at)
  const flights = liveMapFlights(summary, demoLiveFlights(scene, summary, placeOf, at), 0, placeOf)
  const schedule = withLiveTimes(summary, flights, at)
  const legs = buildLegs(schedule)
  const map = tripMapFor(makeSnapshot(schedule, legs, at, NY), legs, testAirports, flights)
  if (!map) throw new Error(`${scene} has no trip map`)
  return { at, facts: makeTripFacts(map, { geography: appGeography(), comparisons: null, viewerTz: NY, h24: false }) }
}

/** The time's own space, narrow and unbreaking, as an ordinary one. */
const plain = (text: string | null | undefined) => text?.replace(/\u202F/g, ' ')

describe("the demo's made-up real planes (Stage 3 spec §12)", () => {
  it('live-ahead: in the air on the way to Rockford, 10 minutes ahead, seen all the way', () => {
    const scene = sceneAt('live-ahead')!
    expect(scene.progress.phase).toBe('inAir')
    expect(scene.label).toBe('10 min ahead')
    expect(scene.flight.path.stretches.every((s) => s.kind !== 'unseen')).toBe(true)
    expect(scene.flight.live?.callsign).toBe('UPS2961')
  })

  it('live-ocean-gap: faded past a stretch nobody saw, on the way to Anchorage', () => {
    const scene = sceneAt('live-ocean-gap')!
    expect(scene.progress.phase).toBe('estimated')
    expect(scene.label).toMatch(/^About \d+ min behind$/)
    expect(scene.flight.path.stretches.some((s) => s.kind === 'unseen')).toBe(true)
    expect(scene.flight.live?.callsign).toBe('UPS2963')
  })

  it("live-on-ground-late: still at Rockford's gate, 20 minutes after the plan's takeoff", () => {
    const scene = sceneAt('live-on-ground-late')!
    expect(scene.progress.phase).toBe('onGround')
    expect(scene.label).toBe('Still on the ground · 20 min behind')
  })

  it('live-landed: down in Anchorage 8 minutes early, a minute ago, and at the gate 6 minutes on (the landed, not yet at the gate design)', () => {
    const scene = sceneAt('live-landed')!
    expect(scene.progress.phase).toBe('landed')
    expect(scene.label).toBe('Landed 8 min early')
    expect(scene.flight.live?.callsign).toBe('UPS2963')
    expect(Math.round((NOW - scene.progress.touchdown!) / MINUTE)).toBe(1)
    expect(Math.round((scene.progress.end - NOW) / MINUTE)).toBe(6)
    expect(scene.flight.path.stretches.every((s) => s.kind !== 'unseen')).toBe(true)
  })

  it('live-long-gap: out of tracking range for 2 h 8 min on the way to Anchorage, 87 minutes from its gate (long gap design §3)', () => {
    const scene = sceneAt('live-long-gap')!
    expect(scene.progress.phase).toBe('estimated')
    expect(scene.flight.live?.callsign).toBe('UPS2963')
    expect(Math.round((NOW - scene.flight.live!.fix!.seenAt) / MINUTE)).toBe(128)
    expect(Math.round((scene.progress.end - NOW) / MINUTE)).toBe(87)
  })

  it('live-long-gap: names nothing below, and holds the crossings guessed past 2 hours until the gate (long gap design §3)', () => {
    const { at, facts } = sceneFacts('live-long-gap')
    expect(headline(facts, at, false)).toBe('Landing in 1 h 28 min')
    expect(plain(factRows(facts, at, at).find((r) => r.kind === 'below')?.title)).toBe('Last tracked over Saskatchewan · 2 h 8 min ago')
    const crossings = (minutes: number) => {
      const { at: t, facts: f } = sceneFacts('live-long-gap', minutes)
      return tripSoFar(f, t).flights.find((flight) => flight.title.includes('Anchorage'))?.events.map((e) => e.text.split(' · ')[0])
    }
    expect(crossings(0)).toEqual(['Crossed into British Columbia', 'Halfway', 'Crossed into Alberta', 'Crossed into Saskatchewan', 'Crossed into Canada',
      'Crossed into Minnesota', 'Crossed into Wisconsin'])
    // At the gate, 87 minutes on, the two it was guessed to make past the 2 hours are told too.
    expect(crossings(90)?.slice(0, 2)).toEqual(['Crossed into the United States', 'Crossed into Yukon'])
  })

  it('live-returned: back at Rockford after an air return, 50 minutes after the plan’s takeoff (air return design §3)', () => {
    const scene = sceneAt('live-returned')!
    expect(scene.progress.phase).toBe('returned')
    expect(scene.label).toBe('Returned')
    expect(scene.flight.live?.callsign).toBe('UPS2963')
    // The way out and back isn't the flight's path.
    expect(scene.flight.path.isReal).toBe(false)
    const { at, facts } = sceneFacts('live-returned')
    expect(headline(facts, at)).toBe('Returned to Rockford')
  })

  it('stays itself while the page is open', () => {
    expect(sceneAt('live-ahead', 20)?.label).toBe('10 min ahead')
    expect(sceneAt('live-ocean-gap', 60)?.progress.phase).toBe('estimated')
    expect(sceneAt('live-long-gap', 80)?.progress.phase).toBe('estimated')
    expect(sceneAt('live-on-ground-late', 60)?.label).toBe('Still on the ground · 1 h 20 min behind')
    expect(sceneAt('live-returned', 60)?.progress.phase).toBe('returned')
  })

  it('lands live-ahead when it is due, 10 minutes early', () => {
    expect(sceneAt('live-ahead', 45)?.label).toBe('Landed 10 min early')
  })

  it('gives every other scene no real plane, so `flying` stays the schedule’s alone', () => {
    for (const scene of Object.keys(DEMO_SCENES) as DemoScene[]) {
      if (isLiveDemoScene(scene)) continue
      const schedule = buildSchedule(demoRawForScene(scene, NOW), NOW)
      expect(demoLiveFlights(scene, schedule, placeOf, NOW).size, scene).toBe(0)
    }
  })

  it('gives none when its flight or its airports are missing', () => {
    const schedule = buildSchedule(demoRawForScene('live-ahead', NOW), NOW)
    expect(demoLiveFlights('live-ahead', schedule, () => null, NOW).size).toBe(0)
    expect(demoLiveFlights('live-ahead', { ...schedule, trips: [] }, placeOf, NOW).size).toBe(0)
  })
})
