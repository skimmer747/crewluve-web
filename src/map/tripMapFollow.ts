import { legPath } from '../facts/legCourse'
import { legPlane } from '../facts/planePosition'
import { pointAtDistance } from './flightPath'
import { EARTH_RADIUS_M, METERS_PER_MILE } from './greatCircle'
import { fitRect, type WorldRect } from './mapFit'
import { MAX_LATITUDE } from './mercator'
import { framingPoints, isMoving, legInMotion, nextFlight, type MapLeg, type TripMap } from './tripMap'

/**
 * Following the plane (the app's follow the plane design §3, as its TripMapFollow): the frame that holds a flight's
 * plane, a short tail behind it and everything left to the destination. The map glides toward it (`tripMapGlide`).
 */

/** The tail behind the plane: this share of the path's whole length, so it's a steady size all flight. */
export const TAIL_SHARE = 0.1

/** The frame is never narrower than this across: about 300 miles, in meters, so the end is a regional view. */
export const LEAST_WIDTH_M = 300 * METERS_PER_MILE

/** How many places along the tail and the way ahead the frame is made from. */
const PLACE_COUNT = 33

/**
 * World units (a whole world across is 1) in a meter east and west at `latitude`, as MapKit's map points a meter: no
 * nearer a pole than the map draws (`MAX_LATITUDE`), where it would grow without end.
 */
export const worldPerMeterAt = (latitude: number) =>
  1 / (2 * Math.PI * EARTH_RADIUS_M * Math.cos((Math.min(Math.abs(latitude), MAX_LATITUDE) * Math.PI) / 180))

/**
 * The frame that follows `leg`'s plane at `t` (§3): the plane where the map draws it, the tail behind it and the path
 * ahead to the destination, with `fitRect`'s margins, at least `LEAST_WIDTH_M` across. Null where the whole flight is
 * framed as before: it isn't a flight between its gates, or its plane hasn't left.
 * - `isReplay`: `t` is a moment of the replay, so the real plane is where its record has it.
 */
export function followRect(leg: MapLeg, t: number, isReplay: boolean): WorldRect | null {
  if (leg.kind !== 'flight' || !isMoving(leg, t)) return null
  const plane = legPlane(leg, t, isReplay)
  const path = legPath(leg)
  const distance = Math.min(plane.distance, path.length)
  if (!(distance > 0) || !(path.length > 0)) return null
  const tailStart = Math.max(0, distance - TAIL_SHARE * path.length)
  const step = (path.length - tailStart) / (PLACE_COUNT - 1)
  const places = [...Array.from({ length: PLACE_COUNT }, (_, i) => pointAtDistance(path, tailStart + i * step)), plane.place]
  return fitRect(places, undefined, LEAST_WIDTH_M * worldPerMeterAt(plane.place.lat))
}

/**
 * The frame the camera glides to at `t` while the family follows the plane (follow the plane design §3, §5), as the app's
 * `TripMap.followingFrame(at:isReplay:)`: the flight's plane once it has left (`followRect`), the whole flight while it
 * waits to, the next flight's whole route on the ground between two flights ("The next flight", Todd, 17 Nov 2026), and
 * otherwise what the map frames without the setting: the leg in motion, or the whole trip and home. The glide makes every
 * move with it, between legs too, so no two animations compete as a leg changes. Null only with nothing to frame.
 */
export function followingFrame(map: TripMap, t: number, isReplay: boolean): WorldRect | null {
  const flight = map.legs.find((l) => l.kind === 'flight' && isMoving(l, t))
  if (flight) return followRect(flight, t, isReplay) ?? fitRect(framingPoints(map, flight))
  const moving = legInMotion(map, t)
  const next = moving ? null : nextFlight(map, t)
  if (next && map.legs.some((l) => l.kind === 'flight' && l.end <= t)) return fitRect(framingPoints(map, next))
  return fitRect(framingPoints(map, moving))
}
