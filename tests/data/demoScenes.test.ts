import { describe, expect, it } from 'vitest'
import { safeNarrative } from '../../src/copy/narrative'
import { statusVisual } from '../../src/copy/visuals'
import { DEMO_SCENES, demoRawForScene, type DemoScene } from '../../src/data/demo'
import { buildLegs } from '../../src/engine/legs'
import { buildSchedule } from '../../src/engine/normalize'
import { makeSnapshot } from '../../src/engine/snapshot'
import type { TripProgress, UpcomingTrip } from '../../src/engine/trips'
import type { StatusKind } from '../../src/engine/status'
import { testAirports } from '../fixtures/airports'

const NOW = Date.UTC(2026, 9, 20, 16, 0)
const NY = 'America/New_York'

const EXPECTED: Record<DemoScene, StatusKind> = {
  home: 'home',
  'driving-to-work': 'drivingToWork',
  base: 'base',
  flying: 'inFlight',
  turn: 'turn',
  layover: 'layover',
  delayed: 'layover',
  'last-leg': 'inFlight',
  'driving-home': 'drivingHome',
  'commuting-home': 'commutingHome',
  reserve: 'reserve',
  training: 'training',
}

function sceneSnapshot(scene: DemoScene) {
  const schedule = buildSchedule(demoRawForScene(scene, NOW), NOW)
  return makeSnapshot(schedule, buildLegs(schedule), NOW, NY)
}

describe('demo scenes', () => {
  it.each(Object.keys(DEMO_SCENES) as DemoScene[])('%s shows its moment', (scene) => {
    const snap = sceneSnapshot(scene)
    expect(snap.status.kind).toBe(EXPECTED[scene])
    const text = safeNarrative(snap, { now: NOW, viewerTz: NY, h24: false, airports: testAirports }).map((s) => s.text).join('')
    expect(text.startsWith('Alex')).toBe(true)
    expect(statusVisual(snap).icon).toBeTruthy()
  })

  it('last-leg is late, celebrating, and counting down to the drive home', () => {
    const snap = sceneSnapshot('last-leg')
    expect(snap.celebrate).toBe(true)
    expect(snap.arrival).toMatchObject({ label: 'home', delayMin: 40 })
  })

  it('flying, a day before the delay is known, counts down on time', () => {
    expect(sceneSnapshot('flying').arrival).toMatchObject({ label: 'home', delayMin: 0 })
  })

  it('home has a drive-to-work countdown and the been-home line', () => {
    const snap = sceneSnapshot('home')
    expect(snap.leave?.viaDrive).toBe(true)
    expect(snap.daysHome).toBe(3)
  })
})

describe('demo trip cards (slice 2A)', () => {
  const MIN = 60_000
  const route = ['SDF', 'RFD', 'ANC']
  const CARDS: Record<DemoScene, { upcoming?: Partial<UpcomingTrip>; progress?: Partial<TripProgress> }> = {
    home: { upcoming: { route, days: 2, departs: NOW + 1500 * MIN } },
    'driving-to-work': {},
    base: { upcoming: { route, days: 2, departs: NOW + 30 * MIN } },
    flying: { progress: { day: 1, days: 2, upcoming: ['ANC', 'SDF'] } },
    turn: { progress: { day: 1, days: 2, upcoming: ['ANC', 'SDF'] } },
    layover: { progress: { day: 2, days: 2, upcoming: ['SDF'] } },
    delayed: { progress: { day: 2, days: 2, upcoming: ['SDF'] } },
    'last-leg': { progress: { day: 2, days: 2, upcoming: [] } },
    'driving-home': {},
    'commuting-home': {},
    reserve: {},
    training: {},
  }

  it.each(Object.keys(CARDS) as DemoScene[])('%s shows the right trip card', (scene) => {
    const snap = sceneSnapshot(scene)
    const want = CARDS[scene]
    if (want.upcoming) expect(snap.upcomingTrip).toMatchObject(want.upcoming)
    else expect(snap.upcomingTrip).toBeNull()
    if (want.progress) expect(snap.tripProgress).toMatchObject(want.progress)
    else expect(snap.tripProgress).toBeNull()
  })
})
