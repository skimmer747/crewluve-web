import { RawBuilder } from './rowBuilder'
import type { RawSchedule } from './rows'

export type DemoScene =
  | 'home' | 'driving-to-work' | 'base' | 'flying' | 'turn' | 'layover' | 'delayed'
  | 'last-leg' | 'driving-home' | 'commuting-home' | 'reserve' | 'training' | 'nothing-ahead'

export type DemoVariant = 'driver' | 'jumpseater'

/** Which variant each scene uses, and how many minutes after the main trip's report "now" falls. */
export const DEMO_SCENES: Record<DemoScene, { variant: DemoVariant; offset: number }> = {
  home: { variant: 'driver', offset: -1440 },
  'driving-to-work': { variant: 'driver', offset: -60 },
  base: { variant: 'driver', offset: 30 },
  flying: { variant: 'driver', offset: 100 },
  turn: { variant: 'driver', offset: 180 },
  layover: { variant: 'driver', offset: -7800 },
  delayed: { variant: 'driver', offset: 1300 },
  'last-leg': { variant: 'driver', offset: 1700 },
  'driving-home': { variant: 'driver', offset: 1950 },
  'commuting-home': { variant: 'jumpseater', offset: 1960 },
  reserve: { variant: 'driver', offset: 4500 },
  training: { variant: 'driver', offset: 5900 },
  // Home after the last trip, with nothing ahead: the status page shows View Schedule (slice 3A §3.2).
  'nothing-ahead': { variant: 'driver', offset: 14400 },
}

export const DEFAULT_SCENE: DemoScene = 'flying'

export function isDemoScene(value: string | null): value is DemoScene {
  return value != null && Object.prototype.hasOwnProperty.call(DEMO_SCENES, value)
}

/** Minutes after report when the crew learns the ANC→SDF flight will be 40 minutes late: the 'delayed' scene. */
export const DELAY_KNOWN_AT = 1300

/**
 * Alex's schedule, in minutes around `anchor` (the report time of the main trip, demo-t1).
 * driver: home LEX, base SDF, drives to work. jumpseater: home MCO, rides Delta jumpseats.
 * `delayKnown` false leaves the ANC→SDF flight on its scheduled times, as CrewLu Cloud would before the delay.
 */
export function demoRaw(variant: DemoVariant, anchor: number, delayKnown = true): RawSchedule {
  const b = new RawBuilder(anchor)
  const late = delayKnown ? { actualOut: 1600, actualIn: 1900 } : {}
  b.pilot('Alex', 'SDF', variant === 'driver' ? 'LEX' : 'MCO')

  b.trip('demo-t0', {
    days: 2,
    base: 'SDF',
    dutyPeriods: [
      { start: -8640, end: -8400, flights: [{ dep: 'SDF', arr: 'MIA', out: -8580, in: -8430, number: '2950' }] },
      { start: -7260, end: -7020, flights: [{ dep: 'MIA', arr: 'SDF', out: -7200, in: -7050, number: '2951' }] },
    ],
  })
  b.trip('demo-t1', {
    days: 2,
    base: 'SDF',
    dutyPeriods: [
      {
        start: 0,
        end: 585,
        flights: [
          { dep: 'SDF', arr: 'RFD', out: 60, in: 150, number: '2961' },
          { dep: 'RFD', arr: 'ANC', out: 225, in: 555, number: '2963' },
        ],
      },
      {
        start: 1500,
        end: 1930,
        flights: [{ dep: 'ANC', arr: 'SDF', out: 1560, in: 1860, ...late, number: '2962' }],
      },
    ],
  })
  // The third trip rests 16 hours at base between its second and third duty periods (slice 3B §6.2).
  b.trip('demo-t2', {
    days: 3,
    base: 'SDF',
    dutyPeriods: [
      { start: 10080, end: 10470, flights: [{ dep: 'SDF', arr: 'ONT', out: 10140, in: 10440, number: '2970' }] },
      { start: 11400, end: 11730, flights: [{ dep: 'ONT', arr: 'SDF', out: 11460, in: 11700, number: '2971' }] },
      {
        start: 12600,
        end: 12990,
        flights: [
          { dep: 'SDF', arr: 'RFD', out: 12660, in: 12750, number: '2972' },
          { dep: 'RFD', arr: 'SDF', out: 12810, in: 12900, number: '2973' },
        ],
      },
    ],
  })

  if (variant === 'driver') {
    b.commute('demo-c0-home', 'SDF', 'LEX', 'toHome', -7020, -6950, 'demo-t0')
    b.commute('demo-c1-work', 'LEX', 'SDF', 'toWork', -90, -20, 'demo-t1')
    b.commute('demo-c1-home', 'SDF', 'LEX', 'toHome', 1890, 1960, 'demo-t1')
    b.commute('demo-c2-work', 'LEX', 'SDF', 'toWork', 9990, 10060, 'demo-t2')
    b.commute('demo-c2-home', 'SDF', 'LEX', 'toHome', 12990, 13060, 'demo-t2')
  } else {
    b.jumpseat('demo-j0-home', 'SDF', 'MCO', -6960, -6840, { airline: 'DL', number: '1230' })
    b.jumpseat('demo-j1-work', 'MCO', 'SDF', -300, -180, { airline: 'DL', number: '1234' })
    b.jumpseat('demo-j1-home', 'SDF', 'MCO', 2040, 2160, { airline: 'DL', number: '1235' })
  }

  b.manualEvent('demo-rsv', 'RSVA', 4320, 5040, 'SDF')
  b.training('demo-cq', 'CQ', 5760, 6240, 'SDF')
  return b.build()
}

/** The demo schedule positioned so that `now` lands on `scene`. */
export function demoRawForScene(scene: DemoScene, now: number): RawSchedule {
  const { variant, offset } = DEMO_SCENES[scene]
  // Scenes before the delay is known show the flight on time, so the countdowns aren't red a day early.
  const raw = demoRaw(variant, now - offset * 60_000, offset >= DELAY_KNOWN_AT)
  return { ...raw, fetchedAt: now, newestUpdatedAt: now - 3 * 3_600_000 }
}
