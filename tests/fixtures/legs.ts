import type { DriveLeg, DutyLeg, MoveLeg, PlaceKind, PlaceLeg } from '../../src/engine/legs'
import type { DutyEventKind, Pilot } from '../../src/engine/types'

/** Hand-built legs use hours from 0 as their unit. */
export const H = 3_600_000

export const pilot = (home: string | null, base: string | null): Pilot => ({ firstName: 'Alex', base, home, effHome: home ?? base })

/** A trip flight (tripId given) or a standalone Delta jumpseat (tripId null). */
export function flight(dep: string, arr: string, start: number, end: number, tripId: string | null = 'T1', extra: Partial<MoveLeg> = {}): MoveLeg {
  return {
    kind: tripId ? 'flight' : 'jumpseat',
    id: `${tripId ?? 'js'}:${dep}-${arr}@${start}`,
    tripId,
    dep,
    arr,
    start: start * H,
    end: end * H,
    schedStart: start * H,
    schedEnd: end * H,
    airline: tripId ? '5X' : 'DL',
    enteredAirline: tripId ? null : 'DL',
    number: '100',
    deadhead: !tripId,
    ground: false,
    ...extra,
  }
}

export function place(kind: PlaceKind, airport: string, start: number, end: number, tripId = 'T1'): PlaceLeg {
  return { kind, id: `${tripId}:${kind}@${start}`, tripId, airport, start: start * H, end: end * H }
}

export function drive(from: string, to: string, toHome: boolean, start: number, end: number): DriveLeg {
  return { kind: 'drive', id: `drive@${start}`, tripId: null, from, to, toHome, start: start * H, end: end * H, schedEnd: end * H }
}

export function duty(kind: DutyEventKind, title: string, airport: string | null, start: number, end: number): DutyLeg {
  return { kind, id: `${kind}@${start}`, tripId: null, title, airport, location: airport, start: start * H, end: end * H, driveLike: false }
}

export const sorted = <T extends { start: number; end: number }>(legs: T[]) =>
  [...legs].sort((a, b) => a.start - b.start || a.end - b.end)
