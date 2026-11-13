import { buildAirportIndex } from '../../src/data/airports'
import type { DriveLeg, MoveLeg } from '../../src/engine/legs'

/** Friday 2026-11-13 12:00 UTC (7:00 AM in Louisville). */
export const TRIP_START = Date.UTC(2026, 10, 13, 12)
export const HOUR = 3_600_000
export const at = (hours: number) => TRIP_START + hours * HOUR

export const AIRPORTS = buildAirportIndex([
  ['SDF', 'Louisville', 'US', 38.1744, -85.736, 'America/New_York', 'KY'],
  ['LEX', 'Lexington', 'US', 38.0365, -84.6059, 'America/New_York', 'KY'],
  ['CGN', 'Cologne', 'DE', 50.8659, 7.1427, 'Europe/Berlin'],
  ['DXB', 'Dubai', 'AE', 25.2532, 55.3657, 'Asia/Dubai'],
  ['ANC', 'Anchorage', 'US', 61.1743, -149.9963, 'America/Anchorage', 'AK'],
  ['NRT', 'Tokyo', 'JP', 35.772, 140.3929, 'Asia/Tokyo'],
])

export function flight(id: string, dep: string, arr: string, startHours: number, hours: number, tripId: string | null = 'T1'): MoveLeg {
  const start = at(startHours)
  const end = start + hours * HOUR
  return {
    kind: 'flight', id, tripId, dep, arr, start, end, schedStart: start, schedEnd: end,
    airline: '5X', enteredAirline: null, number: String(200 + Number(id.replace(/\D/g, '') || 0)), deadhead: false, ground: false,
  }
}

export function drive(id: string, from: string, to: string, startHours: number, hours: number): DriveLeg {
  const start = at(startHours)
  return { kind: 'drive', id, tripId: null, from, to, toHome: to === 'SDF', start, end: start + hours * HOUR, schedEnd: start + hours * HOUR }
}

/** SDF → CGN (8 h), a day in Cologne, CGN → DXB (6 h), 20 h in Dubai, DXB → SDF (14 h). */
export const EUROPE = [flight('f1', 'SDF', 'CGN', 0, 8), flight('f2', 'CGN', 'DXB', 32, 6), flight('f3', 'DXB', 'SDF', 58, 14)]
