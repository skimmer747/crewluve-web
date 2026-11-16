import type { LiveFix, LiveFlight, LiveState, TrailPoint } from '../../src/map/liveFlight'

/**
 * Made-up live flights for the map's tests: a trail, a fix and a flight, in minutes after `START`. Real flights' data
 * stays out of the repo (Todd, 15 Nov 2026): these are invented, as the shared cases' own are.
 */

export const MINUTE = 60_000
export const START = Date.UTC(2027, 0, 15, 12)

/** A place the plane was seen in the air `minutes` after START. */
export const point = (minutes: number, lat: number, lng: number): TrailPoint => ({ time: START + minutes * MINUTE, place: { lat, lng }, altitudeFt: 30_000 })

/** The plane's latest fix, `minutes` after START. */
export const fix = (minutes: number, lat: number, lng: number, more: { onGround?: boolean; trackDeg?: number | null } = {}): LiveFix => ({
  place: { lat, lng },
  altitudeFt: more.onGround ? null : 30_000,
  groundSpeedKt: more.onGround ? 0 : 430,
  trackDeg: more.trackDeg === undefined ? 80 : more.trackDeg,
  onGround: more.onGround ?? false,
  registration: 'N000XX',
  typeCode: 'B763',
  seenAt: START + minutes * MINUTE,
})

/** One flight of partner_live's answer. */
export const liveFlight = (
  trail: TrailPoint[], more: { legId?: string; state?: LiveState; fix?: LiveFix | null; landedAt?: number | null } = {},
): LiveFlight => ({
  legId: more.legId ?? 'leg-1',
  callsign: 'UPS1234',
  state: more.state ?? 'airborne',
  fix: more.fix === undefined ? null : more.fix,
  landedAt: more.landedAt ?? null,
  trail,
})
