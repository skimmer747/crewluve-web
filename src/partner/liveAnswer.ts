import type { LiveFix, LiveFlight, LiveState, TrailPoint } from '../map/liveFlight'

/**
 * partner_live's answer, as Crewlu Cloud writes it (~/Dev/Duty/supabase/partner-api.md, "The live plane"), read as the
 * app's PartnerLiveAnswer reads it. Every time in it is ms since 1970, unlike the summary's seconds. Nothing is
 * trusted: a field of the wrong kind makes the whole answer unreadable, as one the app can't decode does there.
 */

/** One of partner_live's flights. Its trail is the points after the cursor the call sent, or every point without one. */
export interface AnsweredFlight extends LiveFlight {
  /** How many points the flight has in all. */
  trailCount: number
}

export interface LiveAnswer {
  /** Crewlu Cloud's clock when it answered. */
  now: number
  /** Sent back with the next call, so only the points after these come. */
  cursor: number
  flights: AnsweredFlight[]
}

const STATES: ReadonlySet<string> = new Set<LiveState>(['waiting', 'ground', 'airborne', 'landed'])

/** Thrown by the readers below at the first part of an answer that can't be read. */
class Unreadable extends Error {}

const unreadable = (): never => {
  throw new Unreadable()
}
const readNumber = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : unreadable())
const readInteger = (value: unknown): number => (typeof value === 'number' && Number.isInteger(value) ? value : unreadable())
const readText = (value: unknown): string => (typeof value === 'string' ? value : unreadable())
const readFlag = (value: unknown): boolean => (typeof value === 'boolean' ? value : unreadable())
const readList = (value: unknown): unknown[] => (Array.isArray(value) ? value : unreadable())
const readObject = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : unreadable()
/** A field the door may leave out or send as null. */
const optional = <T>(value: unknown, read: (value: unknown) => T): T | null => (value == null ? null : read(value))

/** What `read` makes, or null when it meets a part it can't read. */
function reading<T>(read: () => T): T | null {
  try {
    return read()
  } catch (error) {
    if (error instanceof Unreadable) return null
    throw error
  }
}

/** The whole answer, or null when any part of it can't be read. */
export const readLiveAnswer = (answer: Record<string, unknown>): LiveAnswer | null =>
  reading(() => ({ now: readNumber(answer.now), cursor: readInteger(answer.cursor), flights: readList(answer.flights).map(flight) }))

/** One entry of an answer's `flights`, or null when it can't be read. */
export const readLiveFlight = (value: unknown): AnsweredFlight | null => reading(() => flight(value))

function flight(value: unknown): AnsweredFlight {
  const entry = readObject(value)
  const state = readText(entry.state)
  return {
    legId: readText(entry.leg_id),
    callsign: readText(entry.callsign),
    // A state this site doesn't know is one it can't draw: the schedule's plane shows.
    state: STATES.has(state) ? (state as LiveState) : 'waiting',
    fix: optional(entry.fix, fix),
    landedAt: optional(entry.landed_at, readNumber),
    trail: readList(entry.trail).map(trailPoint),
    trailCount: readInteger(entry.trail_count),
  }
}

function fix(value: unknown): LiveFix {
  const entry = readObject(value)
  return {
    place: { lat: readNumber(entry.lat), lng: readNumber(entry.lon) },
    altitudeFt: optional(entry.altitude_ft, readNumber),
    groundSpeedKt: optional(entry.ground_speed_kt, readNumber),
    trackDeg: optional(entry.track_deg, readNumber),
    onGround: readFlag(entry.on_ground),
    registration: optional(entry.registration, readText),
    typeCode: optional(entry.type_code, readText),
    seenAt: readNumber(entry.seen_at),
  }
}

/** `[time, latitude, longitude, altitude in feet]`, the altitude null, or left out, when adsb.lol sent none. */
function trailPoint(value: unknown): TrailPoint {
  const [time, lat, lng, altitude] = readList(value)
  return { time: readNumber(time), place: { lat: readNumber(lat), lng: readNumber(lng) }, altitudeFt: optional(altitude, readNumber) }
}
