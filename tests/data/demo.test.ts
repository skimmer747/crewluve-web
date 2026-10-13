import { describe, expect, it } from 'vitest'
import { DEFAULT_SCENE, DEMO_SCENES, demoRaw, demoRawForScene, isDemoScene } from '../../src/data/demo'
import { buildLegs } from '../../src/engine/legs'
import { buildSchedule } from '../../src/engine/normalize'

const A = Date.UTC(2026, 9, 9, 9, 30)

describe('demoRaw', () => {
  it('builds Alex the driver with three trips and five drives', () => {
    const raw = demoRaw('driver', A)
    expect(raw.pilotInfos[0]).toMatchObject({ first_name: 'Alex', base_raw_value: 'SDF', home_airport_code: 'LEX' })
    expect(raw.trips.map((t) => t.id)).toEqual(['demo-t0', 'demo-t1', 'demo-t2'])
    expect(raw.commutes).toHaveLength(5)
    expect(raw.jumpseats).toHaveLength(0)
  })

  it('swaps the drives for Delta jumpseats in the jumpseater variant', () => {
    const raw = demoRaw('jumpseater', A)
    expect(raw.pilotInfos[0].home_airport_code).toBe('MCO')
    expect(raw.commutes).toHaveLength(0)
    expect(raw.jumpseats.map((j) => `${j.origin}-${j.destination}`)).toEqual(['SDF-MCO', 'MCO-SDF', 'SDF-MCO'])
  })

  it('rests the third trip at base, SDF, for 16 hours between two duty periods, in both variants, for the calendar’s light bar (slice 3B §6.2)', () => {
    for (const variant of ['driver', 'jumpseater'] as const) {
      const legs = buildLegs(buildSchedule(demoRaw(variant, A), A))
      const rests = legs.filter((leg) => leg.kind === 'base')
      expect(rests, variant).toMatchObject([{ tripId: 'demo-t2', airport: 'SDF' }])
      expect((rests[0].end - rests[0].start) / 3_600_000, variant).toBe(16)
    }
  })

  it('keeps the ANC→SDF flight 40 minutes late', () => {
    const f = demoRaw('driver', A).flights.find((x) => x.flight_number === '2962')!
    expect(Date.parse(f.block_out_time!) - Date.parse(f.scheduled_block_out_time!)).toBe(40 * 60_000)
  })
})

describe('demoRawForScene', () => {
  it('positions the timeline so that now lands on the scene', () => {
    const now = Date.UTC(2026, 9, 20, 12)
    const raw = demoRawForScene('flying', now)
    const report = Date.parse(raw.trips.find((t) => t.id === 'demo-t1')!.start_date!)
    expect(now - report).toBe(DEMO_SCENES.flying.offset * 60_000)
    expect(raw.fetchedAt).toBe(now)
    expect(raw.newestUpdatedAt).toBe(now - 3 * 3_600_000)
  })

  it('shows the ANC→SDF delay only from the scene where the crew learns of it', () => {
    const now = Date.UTC(2026, 9, 20, 12)
    const lateBy = (scene: 'flying' | 'delayed') => {
      const f = demoRawForScene(scene, now).flights.find((x) => x.flight_number === '2962')!
      return Date.parse(f.block_out_time!) - Date.parse(f.scheduled_block_out_time!)
    }
    expect(lateBy('flying')).toBe(0)
    expect(lateBy('delayed')).toBe(40 * 60_000)
  })

  it('validates scene names', () => {
    expect(isDemoScene('layover')).toBe(true)
    expect(isDemoScene('nope')).toBe(false)
    expect(isDemoScene(null)).toBe(false)
    expect(DEFAULT_SCENE).toBe('flying')
  })
})
