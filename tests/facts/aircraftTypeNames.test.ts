import { describe, expect, it } from 'vitest'
import { aircraftTypeName } from '../../src/facts/aircraftTypeNames'

describe('an aircraft’s name from its type code (Stage 3 spec §8)', () => {
  it('names the freighters a pilot’s family sees', () => {
    expect(aircraftTypeName('B763')).toBe('Boeing 767-300')
    expect(aircraftTypeName('B748')).toBe('Boeing 747-8')
    expect(aircraftTypeName('B744')).toBe('Boeing 747-400')
    expect(aircraftTypeName('B752')).toBe('Boeing 757-200')
    expect(aircraftTypeName('A306')).toBe('Airbus A300-600')
    expect(aircraftTypeName('MD11')).toBe('McDonnell Douglas MD-11')
    // One code for the 777-200LR and the 777 Freighter, which is built on it.
    expect(aircraftTypeName('B77L')).toBe('Boeing 777-200')
  })

  it('names an airliner', () => {
    expect(aircraftTypeName('B738')).toBe('Boeing 737-800')
    expect(aircraftTypeName('A20N')).toBe('Airbus A320neo')
    expect(aircraftTypeName('E75L')).toBe('Embraer 175')
    expect(aircraftTypeName('CRJ9')).toBe('Bombardier CRJ900')
  })

  it('shows an unknown code as itself', () => {
    expect(aircraftTypeName('ZZZZ')).toBe('ZZZZ')
    expect(aircraftTypeName('GLF6')).toBe('GLF6')
  })

  it('reads a code in any case, with spaces around it', () => {
    expect(aircraftTypeName(' b763 ')).toBe('Boeing 767-300')
    expect(aircraftTypeName('zzzz')).toBe('ZZZZ')
  })
})
