import { describe, expect, it } from 'vitest'
import { liveLabelText } from '../../src/copy/tripMap'
import { DEMO_SCENES, demoRawForScene, type DemoScene } from '../../src/data/demo'
import { demoLiveFlights, isLiveDemoScene } from '../../src/data/demoLive'
import { liveMapFlights } from '../../src/engine/liveLegs'
import { buildSchedule } from '../../src/engine/normalize'
import { mapFlightProgress } from '../../src/map/mapFlight'
import { testAirports } from '../fixtures/airports'

const NOW = Date.UTC(2026, 9, 20, 16, 0)
const MINUTE = 60_000

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

  it('stays itself while the page is open', () => {
    expect(sceneAt('live-ahead', 20)?.label).toBe('10 min ahead')
    expect(sceneAt('live-ocean-gap', 60)?.progress.phase).toBe('estimated')
    expect(sceneAt('live-on-ground-late', 60)?.label).toBe('Still on the ground · 1 h 20 min behind')
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
