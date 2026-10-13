import { describe, expect, it } from 'vitest'
import { airlineColor, airlineIcon } from '../../src/copy/airlines'
import type { Leg } from '../../src/engine/legs'
import { DAY } from '../../src/time/zoned'
import { gapBefore, legMoment, nextLegId, openingDay, rowLook, scheduleDays, scheduleLegs } from '../../src/ui/scheduleFacts'
import { testAirports } from '../fixtures/airports'
import { drive, duty, flight, H, pilot, place } from '../fixtures/legs'

/** A commuter: home Lexington, base Louisville. */
const commuter = pilot('LEX', 'SDF')
const look = (leg: Leg, who = commuter) => rowLook(leg, who, testAirports)

describe('scheduleLegs', () => {
  it('lists every leg but the report time, which Duty never sends the app (slice 3A §4.2)', () => {
    const legs = [
      place('report', 'SDF', 0, 1), flight('SDF', 'RFD', 1, 2), place('turn', 'RFD', 2, 3), flight('RFD', 'ONT', 3, 4),
      place('layover', 'ONT', 4, 5), place('base', 'SDF', 5, 6), place('home', 'LEX', 6, 7), drive('SDF', 'LEX', true, 7, 8),
      duty('reserve', 'RSV-A', 'SDF', 8, 9),
    ]
    expect(scheduleLegs(legs).map((l) => l.kind)).toEqual(['flight', 'turn', 'flight', 'layover', 'base', 'home', 'drive', 'reserve'])
  })
})

describe('rowLook: flights and jumpseats (slice 3A §4.5, §4.6)', () => {
  it('writes a company flight as Duty does, with the UPS plane in UPS brown', () => {
    expect(look(flight('RFD', 'SDF', 0, 1, 'T1', { number: '2961' }))).toEqual({ title: 'UPS2961: RFD → SDF', icon: 'AirplaneTilt', color: 'ups', homeward: false })
  })

  it('gives a flight entered with its airline that code, icon and color, a FedEx pilot’s company flights too', () => {
    const ticket = flight('SDF', 'ATL', 0, 1, 'T1', { airline: 'AA', enteredAirline: 'AA', number: '1234', deadhead: true })
    expect(look(ticket)).toEqual({ title: 'AA1234: SDF → ATL', icon: airlineIcon('AA'), color: airlineColor('AA'), homeward: false })
    const fedex = flight('MEM', 'IND', 0, 1, 'T1', { airline: 'FX', enteredAirline: 'FX', number: '1407' })
    expect(look(fedex)).toEqual({ title: 'FX1407: MEM → IND', icon: airlineIcon('FX'), color: airlineColor('FX'), homeward: false })
  })

  it('writes an airline entered as 5X as the status page does, UPS, and a placeholder number as just the route', () => {
    expect(look(flight('SDF', 'RFD', 0, 1, 'T1', { airline: '5X', enteredAirline: '5X', number: '2961' })).title).toBe('UPS2961: SDF → RFD')
    expect(look(flight('SDF', 'ATL', 0, 1, 'T1', { airline: 'AA', enteredAirline: 'AA', number: null, deadhead: true })).title).toBe('SDF → ATL')
  })

  it('shows a trip flight with no airline as a blue airplane, with its number alone or just its route', () => {
    const ticket = flight('MCO', 'SDF', 0, 1, 'T1', { airline: null, number: '1234', deadhead: true })
    expect(look(ticket)).toEqual({ title: '1234: MCO → SDF', icon: 'Airplane', color: 'blue', homeward: false })
    const placeholder = flight('SDF', 'RFD', 0, 1, 'T1', { airline: null, number: null })
    expect(look(placeholder)).toEqual({ title: 'SDF → RFD', icon: 'Airplane', color: 'blue', homeward: false })
  })

  it('shows ground transport as GND with a blue car, whatever its number', () => {
    const van = flight('SDF', 'IND', 0, 1, 'T1', { ground: true, airline: null, number: null })
    expect(look(van)).toEqual({ title: 'GND: SDF → IND', icon: 'Car', color: 'blue', homeward: false })
    expect(look({ ...van, number: '1234' }).title).toBe('GND: SDF → IND')
  })

  it('gives a jumpseat its airline when one was entered, else its number and the green seat', () => {
    expect(look(flight('MCO', 'SDF', 0, 1, null))).toEqual({ title: 'DL100: MCO → SDF', icon: airlineIcon('DL'), color: airlineColor('DL'), homeward: false })
    // The site counts a numbered jumpseat with no airline as UPS for the status page; the list goes by what was entered.
    const company = flight('SDF', 'RFD', 0, 1, null, { airline: '5X', enteredAirline: null, number: '451' })
    expect(look(company)).toEqual({ title: '451: SDF → RFD', icon: 'Seat', color: 'green', homeward: false })
    expect(look({ ...company, airline: null, number: null }).title).toBe('SDF → RFD')
  })

  it('marks a flight or jumpseat that lands at the pilot’s home airport', () => {
    expect(look(flight('SDF', 'LEX', 0, 1)).homeward).toBe(true)
    expect(look(flight('ATL', 'LEX', 0, 1, null)).homeward).toBe(true)
    expect(look(flight('LEX', 'SDF', 0, 1)).homeward).toBe(false)
    expect(look(flight('SDF', 'LEX', 0, 1), pilot(null, null)).homeward).toBe(false)
    // With no home airport set, home is the base.
    expect(look(flight('ATL', 'SDF', 0, 1), pilot(null, 'SDF')).homeward).toBe(true)
  })
})

describe('rowLook: stops (slice 3A §4.5, §4.6)', () => {
  it('names a turn and a layover in the city, or at the airport when the list doesn’t know it', () => {
    expect(look(place('turn', 'RFD', 0, 1))).toEqual({ title: 'Turn in Rockford', icon: 'ClockCounterClockwise', color: 'orange', homeward: false })
    expect(look(place('turn', 'XYZ', 0, 1)).title).toBe('Turn at XYZ')
    expect(look(place('layover', 'ONT', 0, 1))).toEqual({ title: 'Layover in Ontario', icon: 'Bed', color: 'yellow', homeward: false })
    expect(look(place('layover', 'XYZ', 0, 1)).title).toBe('Layover at XYZ')
  })

  it('shows a stop at home as Home with the green house', () => {
    expect(look(place('home', 'LEX', 0, 1))).toEqual({ title: 'Home', icon: 'House', color: 'green', homeward: false })
  })

  it('says a stop at base is at base, with the buildings in blue, where the app says On Duty', () => {
    expect(look(place('base', 'SDF', 0, 1))).toEqual({ title: 'At base in Louisville', icon: 'Buildings', color: 'blue', homeward: false })
    expect(look(place('base', 'XYZ', 0, 1)).title).toBe('At base in XYZ')
  })

  it('falls back to the app’s look for a leg it doesn’t list', () => {
    expect(look(place('report', 'SDF', 0, 1))).toEqual({ title: 'On Duty', icon: 'Clock', color: 'gray', homeward: false })
  })
})

describe('rowLook: drives, reserve and events (slice 3A §4.5, §4.6)', () => {
  it('names and colors a drive by the site’s one rule for a drive home, the status page’s', () => {
    expect(look(drive('SDF', 'LEX', true, 0, 1))).toEqual({ title: 'Driving home: SDF → LEX', icon: 'Car', color: 'green', homeward: true })
    expect(look(drive('LEX', 'SDF', false, 0, 1))).toEqual({ title: 'Driving to work: LEX → SDF', icon: 'Car', color: 'blue', homeward: false })
    // The rule decides, wherever the drive ends: a drive home to a city that's no longer home is still a drive home.
    expect(look(drive('SDF', 'CVG', true, 0, 1))).toEqual({ title: 'Driving home: SDF → CVG', icon: 'Car', color: 'green', homeward: true })
    expect(look(drive('SDF', 'LEX', false, 0, 1))).toEqual({ title: 'Driving to work: SDF → LEX', icon: 'Car', color: 'blue', homeward: false })
  })

  it('labels reserve and hot standby with where they are', () => {
    expect(look(duty('reserve', 'RSV-A', 'SDF', 0, 1))).toEqual({ title: 'RSV-A in Louisville', icon: 'ClockCountdown', color: 'red', homeward: false })
    expect(look(duty('reserve', 'RSV-A', 'XYZ', 0, 1)).title).toBe('RSV-A at XYZ')
    expect(look(duty('reserve', 'RSV-A', null, 0, 1)).title).toBe('RSV-A')
    // A place that isn't an airport reads as entered; a code the site reads, such as SDFZ for SDF, by its city.
    expect(look({ ...duty('reserve', 'RSV-A', null, 0, 1), location: 'Crew Room' }).title).toBe('RSV-A at Crew Room')
    expect(look({ ...duty('reserve', 'RSV-A', 'SDF', 0, 1), location: 'SDFZ' }).title).toBe('RSV-A in Louisville')
    expect(look(duty('hotStandby', 'Hot Standby', 'SDF', 0, 1))).toEqual({ title: 'Hot Standby in Louisville', icon: 'Lightning', color: 'orange', homeward: false })
  })

  it('shows training and events with the house at home, the buildings at base, and the book elsewhere', () => {
    expect(look(duty('event', 'Drive home', 'LEX', 0, 1))).toEqual({ title: 'Drive home in Lexington', icon: 'House', color: 'green', homeward: true })
    expect(look(duty('training', 'CQ Training', 'SDF', 0, 1))).toEqual({ title: 'CQ Training in Louisville', icon: 'Buildings', color: 'blue', homeward: false })
    expect(look(duty('event', 'Recurrent', 'ATL', 0, 1))).toEqual({ title: 'Recurrent in Atlanta', icon: 'BookOpen', color: 'purple', homeward: false })
    expect(look(duty('training', 'CQ Training', null, 0, 1))).toEqual({ title: 'CQ Training', icon: 'BookOpen', color: 'purple', homeward: false })
    expect(look(duty('training', 'CQ Training', 'LEX', 0, 1))).toEqual({ title: 'CQ Training in Lexington', icon: 'House', color: 'green', homeward: true })
    expect(look({ ...duty('event', 'Sim', null, 0, 1), location: 'Training Center' })).toEqual({
      title: 'Sim at Training Center', icon: 'BookOpen', color: 'purple', homeward: false,
    })
    // With no home airport set, home is the base, so training at base is training at home.
    expect(look(duty('training', 'CQ Training', 'SDF', 0, 1), pilot(null, 'SDF'))).toEqual({
      title: 'CQ Training in Louisville', icon: 'House', color: 'green', homeward: true,
    })
  })

  it('never marks reserve or hot standby at home as ending there, as the app doesn’t', () => {
    expect(look(duty('reserve', 'RSV-A', 'LEX', 0, 1)).homeward).toBe(false)
    expect(look(duty('hotStandby', 'Hot Standby', 'LEX', 0, 1)).homeward).toBe(false)
  })
})

/** Midnight in New York on Thursday 15 Oct 2026, in the fixtures' hours; THU is that calendar day. */
const T0 = Date.UTC(2026, 9, 15, 4) / H
const THU = Date.UTC(2026, 9, 15) / DAY
const NY = 'America/New_York'

describe('scheduleDays (slice 3A §4.3)', () => {
  const thuFlight = flight('SDF', 'RFD', T0 + 6, T0 + 7.5) // 6:00am Thursday in New York
  const overnight = place('layover', 'RFD', T0 + 7.5, T0 + 30) // until 6:00am Friday
  const pastMidnight = duty('event', 'Sim', 'RFD', T0 + 25, T0 + 26) // 1:00am Friday in New York, 10:00pm Thursday in Los Angeles
  const friFlight = flight('RFD', 'SDF', T0 + 30, T0 + 31.5)

  it('groups legs by the calendar day they start on, so a leg across midnight sits under its first day', () => {
    const days = scheduleDays([friFlight, pastMidnight, overnight, thuFlight], NY)
    expect(days.map((d) => [d.day, d.legs.map((l) => l.id)])).toEqual([
      [THU, [thuFlight.id, overnight.id]],
      [THU + 1, [pastMidnight.id, friFlight.id]],
    ])
  })

  it('counts days across the change back to standard time', () => {
    const at = (day: number, hour: number, minute = 0) => Date.UTC(2026, 10, day, hour, minute) / H
    const sat = flight('SDF', 'RFD', at(1, 3, 30), at(1, 5)) // 11:30pm EDT Saturday 31 October
    const sun = flight('RFD', 'SDF', at(2, 4, 30), at(2, 5)) // 11:30pm EST Sunday 1 November
    const mon = flight('SDF', 'ATL', at(2, 5, 30), at(2, 7)) // 12:30am EST Monday 2 November
    expect(scheduleDays([sat, sun, mon], NY).map((d) => d.day)).toEqual([THU + 16, THU + 17, THU + 18])
  })

  it('counts the days in the visitor’s zone', () => {
    const days = scheduleDays([thuFlight, overnight, pastMidnight, friFlight], 'America/Los_Angeles')
    expect(days.map((d) => [d.day, d.legs.length])).toEqual([[THU, 3], [THU + 1, 1]])
  })
})

describe('nextLegId and legMoment (slice 3A §4.9)', () => {
  const legs = [flight('SDF', 'RFD', 1, 2), place('turn', 'RFD', 2, 3), flight('RFD', 'SDF', 3, 4)]

  it('finds the next leg: the first that hasn’t started (EventTimelineView.upNextLegID)', () => {
    expect(nextLegId(legs, 0.5 * H)).toBe(legs[0].id)
    expect(nextLegId(legs, 2 * H)).toBe(legs[2].id)
    expect(nextLegId(legs, 2.5 * H)).toBe(legs[2].id)
    expect(nextLegId(legs, 5 * H)).toBeNull()
    expect(nextLegId([legs[2], legs[1], legs[0]], 0.5 * H)).toBe(legs[0].id)
  })

  it('says a leg is happening from its start to its end, both included, and marks only the next leg as next', () => {
    expect(legs.map((l) => legMoment(l, 2 * H, nextLegId(legs, 2 * H)))).toEqual(['happening', 'happening', 'next'])
    expect(legs.map((l) => legMoment(l, 2.5 * H, nextLegId(legs, 2.5 * H)))).toEqual(['other', 'happening', 'next'])
    expect(legs.map((l) => legMoment(l, 5 * H, nextLegId(legs, 5 * H)))).toEqual(['other', 'other', 'other'])
  })
})

describe('gapBefore (slice 3A §4.10)', () => {
  const landed = flight('SDF', 'RFD', 1, 2)
  const startingAt = (ms: number) => ({ ...flight('RFD', 'SDF', 3, 4), start: ms })

  it('shows a gap only when the next leg starts a minute or more after one ends', () => {
    expect(gapBefore(landed, startingAt(2 * H))).toBeNull()
    expect(gapBefore(landed, startingAt(2 * H + 59_000))).toBeNull()
    expect(gapBefore(landed, startingAt(2 * H + 60_000))).toEqual({ kind: 'gap', ms: 60_000 })
    expect(gapBefore(landed, startingAt(H))).toBeNull()
  })

  it('names a gap by the leg after it (TimeGapView.gapType)', () => {
    expect(gapBefore(landed, place('home', 'LEX', 4, 9))).toEqual({ kind: 'home', ms: 2 * H })
    expect(gapBefore(landed, place('turn', 'RFD', 3, 4))).toEqual({ kind: 'turn', ms: H })
    expect(gapBefore(landed, place('layover', 'RFD', 3, 9))).toEqual({ kind: 'layover', ms: H })
    expect(gapBefore(landed, drive('RFD', 'LEX', true, 3, 4))).toEqual({ kind: 'gap', ms: H })
  })
})

describe('openingDay (slice 3A §4.11)', () => {
  const thuFlight = flight('SDF', 'RFD', T0 + 6, T0 + 7.5)
  const layover = place('layover', 'RFD', T0 + 7.5, T0 + 54)
  const satFlight = flight('RFD', 'SDF', T0 + 54, T0 + 55.5) // 6:00am Saturday
  const at = (hours: number) => (T0 + hours) * H

  it('opens at the next leg’s day, even while another leg is happening', () => {
    expect(openingDay(scheduleDays([thuFlight, layover, satFlight], NY), at(8), NY)).toBe(THU + 2)
  })

  it('counts the opening day in the visitor’s zone', () => {
    const lateSat = flight('SDF', 'RFD', T0 + 69.5, T0 + 71) // 9:30pm Saturday in New York, 1:30am Sunday in UTC
    expect(openingDay(scheduleDays([thuFlight, lateSat], NY), at(8), NY)).toBe(THU + 2)
  })

  it('opens at the first happening leg’s day when two are happening', () => {
    const fri = duty('event', 'Sim', 'RFD', T0 + 25, T0 + 50)
    expect(openingDay(scheduleDays([thuFlight, layover, fri], NY), at(26), NY)).toBe(THU)
  })

  it('opens at the happening leg’s day when no leg is next', () => {
    expect(openingDay(scheduleDays([thuFlight, layover], NY), at(40), NY)).toBe(THU)
  })

  it('opens at today when nothing is next or happening, and at the top when today has no legs', () => {
    expect(openingDay(scheduleDays([thuFlight], NY), at(12), NY)).toBe(THU)
    expect(openingDay(scheduleDays([thuFlight], NY), at(36), NY)).toBeNull()
    expect(openingDay([], at(12), NY)).toBeNull()
  })
})
