import { describe, expect, it } from 'vitest'
import { arrivalCard, delayBadge, LINE_TRIP_BADGE, leaveCard, statusVisual } from '../../src/copy/visuals'
import { demoRaw } from '../../src/data/demo'
import { RawBuilder } from '../../src/data/rowBuilder'
import { makeSnapshot, type Snapshot } from '../../src/engine/snapshot'
import { testAirports } from '../fixtures/airports'
import { alex, firstFlight, overnight, twoFlights } from '../fixtures/departures'
import { A, at, engineFor } from '../fixtures/engine'

const NY = 'America/New_York'
const driver = engineFor(demoRaw('driver', A))
const snapAt = (minutes: number, e = driver): Snapshot => makeSnapshot(e.schedule, e.legs, at(minutes), NY)

describe('statusVisual', () => {
  it.each([
    [-1440, 'House', 'green'],
    [-60, 'Car', 'blue'],
    [30, 'Buildings', 'purple'],
    [100, 'AirplaneTilt', 'ups'],
    [180, 'ArrowsClockwise', 'orange'],
    [-7800, 'Bed', 'purple'],
    [1300, 'Bed', 'orange'],
    [1700, 'AirplaneTilt', 'orange'],
    [1950, 'Car', 'green'],
    [4500, 'ClockCountdown', 'red'],
    [5900, 'BookOpen', 'purple'],
  ] as const)('at %i min: %s in %s', (minutes, icon, color) => {
    expect(statusVisual(snapAt(minutes))).toEqual({ icon, color })
  })

  it('uses the airline’s icon and color on a jumpseat, and a blue airplane while commuting home', () => {
    const js = engineFor(demoRaw('jumpseater', A))
    expect(statusVisual(snapAt(-240, js))).toEqual({ icon: 'Triangle', color: '#002666' })
    expect(statusVisual(snapAt(1960, js))).toEqual({ icon: 'Airplane', color: 'blue' })
  })

  it('uses a gray pin off-trip and a gray dot when unknown', () => {
    const off = engineFor(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX').trip('t1', {
        dutyPeriods: [{ start: 0, end: 200, flights: [{ dep: 'SDF', arr: 'MIA', out: 30, in: 180 }] }],
      }).build(),
    )
    expect(statusVisual(snapAt(600, off))).toEqual({ icon: 'MapPin', color: 'secondary' })
    const unknown: Snapshot = { ...snapAt(0), status: { kind: 'unknown', airport: null, current: null, previous: null, next: null } }
    expect(statusVisual(unknown)).toEqual({ icon: 'Circle', color: 'gray' })
  })
})

describe('arrivalCard', () => {
  it('turns red when the homecoming is 15+ minutes late', () => {
    const s = snapAt(1700)
    expect(arrivalCard(s, s.arrival!, testAirports)).toEqual({ title: 'Back Home In', icon: 'House', color: 'red' })
  })

  it('stays green when on time', () => {
    const s = snapAt(1960, engineFor(demoRaw('jumpseater', A)))
    expect(arrivalCard(s, s.arrival!, testAirports)).toEqual({ title: 'Back Home In', icon: 'House', color: 'green' })
  })

  it('borrows the status icon and color for Released In', () => {
    const s = snapAt(4500)
    expect(arrivalCard(s, s.arrival!, testAirports)).toEqual({ title: 'Released In', icon: 'ClockCountdown', color: 'red' })
  })

  it('names the base or the city when no homecoming is known', () => {
    const s = snapAt(0)
    expect(arrivalCard(s, { label: 'base', time: 0, schedTime: 0, airport: 'SDF', delayMin: 0 }, testAirports))
      .toEqual({ title: 'Back at Base In', icon: 'AirplaneLanding', color: 'green' })
    expect(arrivalCard(s, { label: 'city', time: 0, schedTime: 0, airport: 'ONT', delayMin: 0 }, testAirports).title).toBe('Ontario In')
  })
})

describe('leaveCard', () => {
  it('a drive is a blue "Leaves Home In" with a car', () => {
    expect(leaveCard(snapAt(-1440).leave!)).toEqual({ title: 'Leaves Home In', icon: 'Car', color: 'blue' })
  })

  it('a late first flight turns orange, an early one green; an unlogged commute says "Leaves In"', () => {
    const base = { time: 0, schedTime: 0, viaDrive: false, commuterUnlogged: false, airport: 'SDF', delayMin: 0 }
    expect(leaveCard({ ...base, label: 'leavesHome', delayMin: 30 })).toEqual({ title: 'Leaves Home In', icon: 'AirplaneTakeoff', color: 'orange' })
    expect(leaveCard({ ...base, label: 'leavesHome', delayMin: -20 }).color).toBe('green')
    expect(leaveCard({ ...base, label: 'leaves', commuterUnlogged: true })).toEqual({ title: 'Leaves In', icon: 'AirplaneTakeoff', color: 'blue' })
  })
})

describe('statusVisual in the less common states', () => {
  it.each([
    { name: 'in the air, left early', engine: twoFlights(-40), minutes: 400, visual: { icon: 'AirplaneTilt', color: 'green' } },
    { name: 'turn, early flight', engine: twoFlights(-40), minutes: 200, visual: { icon: 'ArrowsClockwise', color: 'green' } },
    { name: 'layover, early flight', engine: overnight(-60), minutes: 800, visual: { icon: 'Bed', color: 'green' } },
    {
      name: 'hot standby',
      engine: engineFor(alex().manualEvent('h', 'HOT STANDBY', 0, 300, 'SDF').build()), minutes: 60,
      visual: { icon: 'Lightning', color: 'orange' },
    },
    {
      name: 'ground transport',
      engine: firstFlight(0, { arr: 'LEX', number: 'GND', ground: true }), minutes: 100,
      visual: { icon: 'Car', color: 'blue' },
    },
    {
      name: 'an event titled like a drive',
      engine: engineFor(alex().manualEvent('d', 'Drive the car home', 0, 300, 'SDF').build()), minutes: 60,
      visual: { icon: 'Car', color: 'purple' },
    },
  ])('$name', ({ engine, minutes, visual }) => {
    expect(statusVisual(snapAt(minutes, engine))).toEqual(visual)
  })
})

describe('card colors at the 15-minute line', () => {
  const s = snapAt(0)
  const homecoming = (delayMin: number) => arrivalCard(s, { label: 'home', time: 0, schedTime: 0, airport: 'SDF', delayMin }, testAirports)
  const leave = { time: 0, schedTime: 0, viaDrive: false, commuterUnlogged: false, airport: 'SDF', label: 'leavesHome' } as const

  it.each([[-20, 'green'], [0, 'green'], [14, 'green'], [15, 'red'], [45, 'red']] as const)(
    'a homecoming %i minutes off schedule is %s',
    (delayMin, color) => expect(homecoming(delayMin).color).toBe(color),
  )

  it.each([[-30, 'green'], [-15, 'green'], [-14, 'blue'], [0, 'blue'], [14, 'blue'], [15, 'orange'], [30, 'orange']] as const)(
    'a first flight %i minutes off schedule is %s',
    (delayMin, color) => expect(leaveCard({ ...leave, delayMin }).color).toBe(color),
  )
})

describe('a malformed snapshot', () => {
  /** In flight with no flight under way: nothing the visuals read from the leg exists. */
  const inFlightWithoutALeg: Snapshot = {
    ...snapAt(100),
    status: { kind: 'inFlight', airport: 'SDF', current: null, previous: null, next: null },
  }

  it('gets the plain airplane instead of throwing', () => {
    expect(statusVisual(inFlightWithoutALeg)).toEqual({ icon: 'Airplane', color: 'blue' })
  })

  it('the Released In card borrows that visual without throwing', () => {
    const released = { label: 'released', time: 0, schedTime: 0, airport: null, delayMin: 0 } as const
    expect(arrivalCard(inFlightWithoutALeg, released, testAirports)).toEqual({ title: 'Released In', icon: 'Airplane', color: 'blue' })
  })
})

describe('trip card badges (slice 2A)', () => {
  it('Line Trip is a blue airplane badge', () => {
    expect(LINE_TRIP_BADGE).toEqual({ label: 'Line Trip', icon: 'Airplane', color: 'blue' })
  })

  it('a late departure reads Delayed in orange, an early one Early in green', () => {
    expect(delayBadge(40)).toEqual({ label: 'Delayed', icon: 'ClockCountdown', color: 'orange' })
    expect(delayBadge(-20)).toEqual({ label: 'Early', icon: 'Clock', color: 'green' })
  })
})
