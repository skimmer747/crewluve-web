import type { GeoPoint } from './greatCircle'

/**
 * One flight's live data, as Crewlu Cloud keeps it from adsb.lol (Stage 3 spec §10.5, §10.6), as the app's LiveFlight:
 * its state, the last place it was seen, and the path it flew. Every time is epoch ms, by Crewlu Cloud's clock.
 */

/**
 * - waiting: watched, and never seen;
 * - ground: on the ground, at the departure airport or somewhere else after a diversion;
 * - airborne: in the air;
 * - landed: seen on the ground at the arrival airport, after being in the air.
 */
export type LiveState = 'waiting' | 'ground' | 'airborne' | 'landed'

/** The last place the aircraft was seen. */
export interface LiveFix {
  place: GeoPoint
  /** Null on the ground. */
  altitudeFt: number | null
  groundSpeedKt: number | null
  /** 0 to 360, or null when the aircraft sent none. */
  trackDeg: number | null
  onGround: boolean
  registration: string | null
  /** The aircraft's ICAO type code, like "B763". */
  typeCode: string | null
  seenAt: number
}

/** One point of the path flown: about one every 2 minutes while the flight is seen in the air. */
export interface TrailPoint {
  time: number
  place: GeoPoint
  altitudeFt: number | null
}

export interface LiveFlight {
  /** The id of the flight's leg in the pilot's summary. */
  legId: string
  callsign: string
  state: LiveState
  /** Null before the flight is first seen. */
  fix: LiveFix | null
  /** When it was first seen on the ground at the arrival airport. */
  landedAt: number | null
  /**
   * Every point of the path flown, in the order Crewlu Cloud sent them, which isn't always the order of their times:
   * makeFlightPath sorts them.
   */
  trail: TrailPoint[]
}
