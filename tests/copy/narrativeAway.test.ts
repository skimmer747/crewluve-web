import { afterEach, describe, expect, it, vi } from 'vitest'
import { narrative, safeNarrative, type NarrativeCtx, type Span } from '../../src/copy/narrative'
import { demoRaw } from '../../src/data/demo'
import { RawBuilder, type FlightSpec } from '../../src/data/rowBuilder'
import type { Leg } from '../../src/engine/legs'
import { makeSnapshot, safeSnapshot } from '../../src/engine/snapshot'
import { testAirports } from '../fixtures/airports'
import { alex, firstFlight, overnight, twoFlights } from '../fixtures/departures'
import { A, at, engineFor } from '../fixtures/engine'

const NY = 'America/New_York'
const ctx = (minutes: number): NarrativeCtx => ({ now: at(minutes), viewerTz: NY, h24: false, airports: testAirports })
const plain = (spans: Span[]) => spans.map((s) => s.text).join('')
const sentenceAt = (e: ReturnType<typeof engineFor>, minutes: number) =>
  narrative(makeSnapshot(e.schedule, e.legs, at(minutes), NY), ctx(minutes))

describe('narrative on the demo timeline', () => {
  const driver = engineFor(demoRaw('driver', A))

  it.each([
    [100, 'Alex is flying to Rockford on UPS flight 2961 from Louisville — landing in 50m which is 8:00am EDT.'],
    [180, 'Alex is in Rockford — heading to Anchorage in 45m which is 9:15am EDT.'],
    [30, 'Alex is at base in Louisville — flies to Rockford in 30m which is 6:30am EDT.'],
    [-7800, 'Alex is on layover in Miami — flies to Louisville in 10h 0m which is 5:30am EDT.'],
    [1300, "Alex's layover has been extended by 40 minutes and will now fly to Louisville in 5h 0m which is 8:10am EDT."],
    [1700, 'Alex was delayed in Anchorage and is flying to Louisville on UPS flight 2962 — landing in 3h 20m which is 1:10pm EDT.'],
    [-60, 'Alex is driving to work in Louisville — arrives in 40m at 5:10am EDT, then the trip starts.'],
    [1950, 'Alex is driving home to Lexington — back in 50m at 2:50pm EDT.'],
    [4500, 'Alex is on reserve in Louisville — on call until 9h 0m which is 5:30pm EDT.'],
    [5900, 'Alex: CQ Training in Louisville — finishes in 5h 40m which is 1:30pm EDT.'],
  ])('at %i min: %s', (minutes, text) => {
    expect(plain(sentenceAt(driver, minutes))).toBe(text)
  })

  it('jumpseat commuter waiting at base for the ride home', () => {
    const js = engineFor(demoRaw('jumpseater', A))
    expect(plain(sentenceAt(js, 1960))).toBe(
      'Alex has one more leg home from Louisville to Orlando! It leaves in 1h 20m at 3:30pm EDT and lands at 5:30pm EDT.',
    )
  })

  it('bolds places and times, and colors the countdown with the status color', () => {
    const spans = sentenceAt(driver, 100)
    expect(spans.filter((s) => s.bold).map((s) => s.text)).toEqual(['Rockford', 'Louisville', '50m', '8:00am EDT'])
    expect(spans.filter((s) => s.color).map((s) => `${s.text}:${s.color}`)).toEqual(['50m:status'])
    expect(spans.find((s) => s.text === '50m')?.digits).toBe(true)
  })

  it('colors a late countdown red and the drive home green', () => {
    const colored = (minutes: number) => sentenceAt(driver, minutes).filter((s) => s.color).map((s) => `${s.text}:${s.color}`)
    expect(colored(1300)).toEqual(['5h 0m:red'])
    expect(colored(1700)).toEqual(['3h 20m:red'])
    expect(colored(1950)).toEqual(['50m:green'])
  })
})

describe('narrative edge cases', () => {
  const tripWith = (flight: Partial<FlightSpec>) =>
    engineFor(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX').trip('t1', {
        dutyPeriods: [{ start: 0, end: 400, flights: [{ dep: 'SDF', arr: 'ANC', out: 30, in: 330, ...flight }] }],
      }).build(),
    )

  it('says riding for a company deadhead', () => {
    expect(plain(sentenceAt(tripWith({ dh: true }), 270))).toBe(
      'Alex is riding to Anchorage on UPS flight 1000 from Louisville — landing in 1h 0m which is 11:00am EDT.',
    )
  })

  it('names the airline on a commercial deadhead', () => {
    expect(plain(sentenceAt(tripWith({ commercialDh: true, airline: 'DL', number: '1234' }), 270))).toBe(
      'Alex is riding to Anchorage on Delta flight 1234 from Louisville — landing in 1h 0m which is 11:00am EDT.',
    )
  })

  it('gives ground transport its own sentence', () => {
    expect(plain(sentenceAt(tripWith({ arr: 'LEX', out: 30, in: 90, number: 'GND', ground: true }), 60))).toBe(
      'Alex is riding to Lexington by ground from Louisville — arrives in 30m which is 7:00am EDT.',
    )
  })

  it('warns of a late first departure while at base', () => {
    const spans = sentenceAt(tripWith({ arr: 'RFD', out: 60, in: 150, actualOut: 120, actualIn: 210 }), 30)
    expect(plain(spans)).toBe('Alex is delayed in Louisville and will be flying to Rockford on UPS flight 1000 — departing in 1h 30m.')
    expect(spans.filter((s) => s.color).map((s) => s.color)).toEqual(['red'])
  })

  it('is in a city between trips, with and without a next flight', () => {
    const builder = () =>
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX').trip('t1', {
        dutyPeriods: [{ start: 0, end: 200, flights: [{ dep: 'SDF', arr: 'MIA', out: 30, in: 180 }] }],
      })
    const withNext = engineFor(
      builder().trip('t2', { dutyPeriods: [{ start: 1440, end: 1700, flights: [{ dep: 'MIA', arr: 'SDF', out: 1500, in: 1650 }] }] }).build(),
    )
    expect(plain(sentenceAt(withNext, 600))).toBe('Alex is in Miami — flies to Louisville in 15h 0m which is 6:30am EDT.')
    expect(plain(sentenceAt(engineFor(builder().build()), 600))).toBe('Alex is in Miami')
  })

  it('drops the city for an event with no location and no base', () => {
    const e = engineFor(new RawBuilder(A).pilot('Alex', null, 'LEX').manualEvent('e1', 'Vacation', 0, 600, null).build())
    expect(plain(sentenceAt(e, 60))).toBe('Alex: Vacation — finishes in 9h 0m which is 3:30pm EDT.')
  })

  it('says "On duty" for the unknown status, and when building the sentence fails', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const driver = engineFor(demoRaw('driver', A))
    expect(plain(narrative(safeSnapshot(driver.schedule, null as unknown as Leg[], A, NY), ctx(0)))).toBe('On duty')
    const broken = {
      ...makeSnapshot(driver.schedule, driver.legs, at(100), NY),
      status: { kind: 'inFlight', airport: 'SDF', current: null, previous: null, next: null },
    } as never
    expect(plain(safeNarrative(broken, ctx(100)))).toBe('On duty')
    error.mockRestore()
  })
})

/** The spans that carry a color, as "text:color". */
const coloredSpans = (spans: Span[]) => spans.filter((s) => s.color).map((s) => `${s.text}:${s.color}`)

describe('narrative when a departure moves', () => {
  it.each([
    {
      name: 'turn, late flight',
      engine: twoFlights(40), minutes: 200,
      text: 'Alex is delayed in Rockford — heading to Anchorage in 2h 20m which is 11:10am EDT.',
      colors: ['2h 20m:red'],
    },
    {
      name: 'turn, early flight',
      engine: twoFlights(-40), minutes: 200,
      text: 'Alex is pushing early in Rockford — heading to Anchorage in 1h 0m which is 9:50am EDT.',
      colors: ['1h 0m:green'],
    },
    {
      name: 'in the air, left early',
      engine: twoFlights(-40), minutes: 400,
      text: 'Alex pushed early in Rockford and is flying to Anchorage on UPS flight 1000 — landing in 2h 40m which is 2:50pm EDT.',
      colors: ['2h 40m:green'],
    },
    {
      name: 'layover, shortened by an hour',
      engine: overnight(-60), minutes: 800,
      text: "Alex's layover has been shortened by 1 hour and will now fly to Louisville in 9h 0m which is 3:50am EDT.",
      colors: ['9h 0m:green'],
    },
    {
      name: 'layover, shortened by 20 minutes',
      engine: overnight(-20), minutes: 800,
      text: "Alex's layover has been shortened by 20 minutes and will now fly to Louisville in 9h 40m which is 4:30am EDT.",
      colors: ['9h 40m:green'],
    },
    {
      name: 'layover, extended by 2h 5m',
      engine: overnight(125), minutes: 800,
      text: "Alex's layover has been extended by 2 hours 5 minutes and will now fly to Louisville in 12h 5m which is 6:55am EDT.",
      colors: ['12h 5m:red'],
    },
    {
      name: 'base, early first flight',
      engine: firstFlight(-20), minutes: 20,
      text: 'Alex is pushing early in Louisville and will be flying to Rockford on UPS flight 1000 — departing in 20m.',
      colors: ['20m:green'],
    },
    {
      name: 'base, late deadhead',
      engine: firstFlight(40, { dh: true }), minutes: 30,
      text: 'Alex is delayed in Louisville and will be riding to Rockford on UPS flight 1000 — departing in 1h 10m.',
      colors: ['1h 10m:red'],
    },
    {
      name: 'off, late flight',
      engine: firstFlight(40, { dep: 'ANC' }), minutes: 20,
      text: 'Alex is delayed in Anchorage and will be flying to Rockford on UPS flight 1000 — departing in 1h 20m.',
      colors: ['1h 20m:red'],
    },
    {
      name: 'off, early flight',
      engine: firstFlight(-20, { dep: 'ANC' }), minutes: 30,
      text: 'Alex is pushing early in Anchorage and will be flying to Rockford on UPS flight 1000 — departing in 10m.',
      colors: ['10m:green'],
    },
    {
      name: 'off, on-time flight',
      engine: firstFlight(0, { dep: 'ANC' }), minutes: 20,
      text: 'Alex is in Anchorage — flies to Rockford in 40m which is 6:30am EDT.',
      colors: ['40m:status'],
    },
  ])('$name', ({ engine, minutes, text, colors }) => {
    const spans = sentenceAt(engine, minutes)
    expect(plain(spans)).toBe(text)
    expect(coloredSpans(spans)).toEqual(colors)
  })
})

describe('narrative for standby, reserve, events and base', () => {
  const demo = engineFor(demoRaw('driver', A))

  it('says hot standby, with the on-call time', () => {
    const e = engineFor(alex().manualEvent('h', 'HOT STANDBY', 0, 300, 'SDF').build())
    expect(plain(sentenceAt(e, 60))).toBe('Alex is on hot standby in Louisville — on call until 4h 0m which is 10:30am EDT.')
  })

  it('says only "on reserve" when there is no city', () => {
    const e = engineFor(new RawBuilder(A).pilot('Alex', null, 'LEX').manualEvent('r', 'RSVA', 0, 300, null).build())
    expect(plain(sentenceAt(e, 60))).toBe('Alex is on reserve')
  })

  it('bolds an event’s title, its city, the countdown and the finish time', () => {
    const spans = sentenceAt(demo, 5900)
    expect(spans.filter((s) => s.bold).map((s) => s.text)).toEqual(['CQ Training', 'Louisville', '5h 40m', '1:30pm EDT'])
  })

  it('heads home from base ahead of the next flight', () => {
    const spans = sentenceAt(demo, 1910)
    expect(plain(spans)).toBe('Alex is at base in Louisville — heads home to Lexington in 20m which is 1:40pm EDT.')
    expect(coloredSpans(spans)).toEqual(['20m:status'])
  })

  it('stops at "at base in …" when nothing else is coming', () => {
    const e = engineFor(alex().trip('t1', { dutyPeriods: [{ start: 0, end: 300, flights: [{ dep: 'ANC', arr: 'SDF', out: 30, in: 240 }] }] }).build())
    expect(plain(sentenceAt(e, 260))).toBe('Alex is at base in Louisville')
  })

  it('writes times on the 24-hour clock when asked', () => {
    const snapshot = makeSnapshot(demo.schedule, demo.legs, at(100), NY)
    expect(plain(narrative(snapshot, { ...ctx(100), h24: true }))).toBe(
      'Alex is flying to Rockford on UPS flight 2961 from Louisville — landing in 50m which is 08:00 EDT.',
    )
  })
})

describe('safeNarrative logging', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })
  /** The module afresh, so what it remembers about the failures it already logged starts empty. */
  async function freshNarrative() {
    vi.resetModules()
    return import('../../src/copy/narrative')
  }
  const demo = engineFor(demoRaw('driver', A))
  /** A snapshot whose status names a leg that isn't there, so building its sentence throws. */
  const brokenAs = (kind: string) =>
    ({ ...makeSnapshot(demo.schedule, demo.legs, at(100), NY), status: { kind, airport: 'SDF', current: null, previous: null, next: null } }) as never

  it('logs a failure that keeps happening once, not on every clock tick', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { safeNarrative: fresh } = await freshNarrative()
    for (let i = 0; i < 5; i++) expect(plain(fresh(brokenAs('inFlight'), ctx(100 + i)))).toBe('On duty')
    expect(error).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Narrative failed'), expect.any(Error))
  })

  it('still logs a different failure', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { safeNarrative: fresh } = await freshNarrative()
    fresh(brokenAs('inFlight'), ctx(100))
    fresh(brokenAs('drivingHome'), ctx(100))
    fresh(brokenAs('inFlight'), ctx(100))
    expect(error).toHaveBeenCalledTimes(2)
  })
})
