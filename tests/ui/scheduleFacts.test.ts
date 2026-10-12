import { describe, expect, it } from 'vitest'
import { airlineColor, airlineIcon } from '../../src/copy/airlines'
import type { Leg } from '../../src/engine/legs'
import { rowLook, scheduleLegs } from '../../src/ui/scheduleFacts'
import { testAirports } from '../fixtures/airports'
import { drive, duty, flight, pilot, place } from '../fixtures/legs'

/** A commuter: home Lexington, base Louisville. */
const commuter = pilot('LEX', 'SDF')
const look = (leg: Leg, who = commuter) => rowLook(leg, who, testAirports)

describe('scheduleLegs', () => {
  it('lists every leg but the report time, which Duty never sends the app (slice 3A §4.2)', () => {
    const legs = [place('report', 'SDF', 0, 1), flight('SDF', 'RFD', 1, 2), place('turn', 'RFD', 2, 3), drive('SDF', 'LEX', true, 4, 5)]
    expect(scheduleLegs(legs).map((l) => l.kind)).toEqual(['flight', 'turn', 'drive'])
  })
})

describe('rowLook: flights and jumpseats (slice 3A §4.5, §4.6)', () => {
  it('writes a company flight as Duty does, with the UPS package in UPS brown', () => {
    expect(look(flight('RFD', 'SDF', 0, 1, 'T1', { number: '2961' }))).toEqual({ title: 'UPS2961: RFD → SDF', icon: 'Package', color: 'ups', homeward: false })
  })

  it('gives a flight entered with its airline that code, icon and color, a FedEx pilot’s company flights too', () => {
    const ticket = flight('SDF', 'ATL', 0, 1, 'T1', { airline: 'AA', enteredAirline: 'AA', number: '1234', deadhead: true })
    expect(look(ticket)).toEqual({ title: 'AA1234: SDF → ATL', icon: airlineIcon('AA'), color: airlineColor('AA'), homeward: false })
    const fedex = flight('MEM', 'IND', 0, 1, 'T1', { airline: 'FX', enteredAirline: 'FX', number: '1407' })
    expect(look(fedex)).toEqual({ title: 'FX1407: MEM → IND', icon: airlineIcon('FX'), color: airlineColor('FX'), homeward: false })
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
  it('names a drive by its direction and route, green when it ends at home', () => {
    expect(look(drive('SDF', 'LEX', true, 0, 1))).toEqual({ title: 'Driving home: SDF → LEX', icon: 'Car', color: 'green', homeward: true })
    expect(look(drive('LEX', 'SDF', false, 0, 1))).toEqual({ title: 'Driving to work: LEX → SDF', icon: 'Car', color: 'blue', homeward: false })
  })

  it('labels reserve and hot standby with where they are', () => {
    expect(look(duty('reserve', 'RSV-A', 'SDF', 0, 1))).toEqual({ title: 'RSV-A in Louisville', icon: 'ClockCountdown', color: 'red', homeward: false })
    expect(look(duty('reserve', 'RSV-A', 'XYZ', 0, 1)).title).toBe('RSV-A at XYZ')
    expect(look(duty('reserve', 'RSV-A', null, 0, 1)).title).toBe('RSV-A')
    expect(look(duty('hotStandby', 'Hot Standby', 'SDF', 0, 1))).toEqual({ title: 'Hot Standby in Louisville', icon: 'Lightning', color: 'orange', homeward: false })
  })

  it('shows training and events with the house at home, the buildings at base, and the book elsewhere', () => {
    expect(look(duty('event', 'Drive home', 'LEX', 0, 1))).toEqual({ title: 'Drive home in Lexington', icon: 'House', color: 'green', homeward: true })
    expect(look(duty('training', 'CQ Training', 'SDF', 0, 1))).toEqual({ title: 'CQ Training in Louisville', icon: 'Buildings', color: 'blue', homeward: false })
    expect(look(duty('event', 'Recurrent', 'ATL', 0, 1))).toEqual({ title: 'Recurrent in Atlanta', icon: 'BookOpen', color: 'purple', homeward: false })
    expect(look(duty('training', 'CQ Training', null, 0, 1))).toEqual({ title: 'CQ Training', icon: 'BookOpen', color: 'purple', homeward: false })
  })

  it('never marks reserve or hot standby at home as ending there, as the app doesn’t', () => {
    expect(look(duty('reserve', 'RSV-A', 'LEX', 0, 1)).homeward).toBe(false)
    expect(look(duty('hotStandby', 'Hot Standby', 'LEX', 0, 1)).homeward).toBe(false)
  })
})
