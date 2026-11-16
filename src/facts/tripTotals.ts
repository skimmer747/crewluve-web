import { METERS_PER_MILE } from '../map/greatCircle'
import { destinationsOf, type MapLeg, type TripMap } from '../map/tripMap'
import { zoneOffsetMinutes } from '../time/zoned'
import { legPathLength } from './legCourse'
import { legPlane } from './planePosition'
import type { SunEvent } from './sky'

/**
 * A trip's numbers (Stage 2 spec §4.8), as the app's TripTotals: cities, miles, time zones crossed and sunsets from the
 * cockpit, so far or for the whole trip (a recap, or a forecast of a trip ahead), and its longest flight. A flight with
 * a real path counts the miles along it (Stage 3 spec §8). The miles are here, not in the map's model, as they need
 * the facts' plane.
 */
export interface TripTotals {
  cities: number
  miles: number
  timeZones: number
  cockpitSunsets: number
}

/** Each flight's cockpit sunrises and sunsets, by leg id. */
export type SunEventsByLeg = Record<string, SunEvent[]>

const sunsetsBy = (legs: MapLeg[], t: number, events: SunEventsByLeg) =>
  legs.reduce((count, leg) => count + (events[leg.id] ?? []).filter((e) => e.kind === 'sunset' && e.time <= t).length, 0)

/**
 * Each flight's change in UTC offset as a positive number, summed in minutes and rounded to the nearest hour at the
 * end. A flight with an unknown time zone at either end adds nothing. Across the date line that's the change in offset,
 * not the zones flown over: Tokyo to Anchorage counts 18.
 */
export function timeZonesCrossed(legs: MapLeg[]): number {
  const minutes = legs.filter((l) => l.kind === 'flight').reduce((sum, leg) => {
    const from = leg.origin.timeZone
    const to = leg.destination.timeZone
    if (!from || !to) return sum
    return sum + Math.abs(zoneOffsetMinutes(leg.end, to) - zoneOffsetMinutes(leg.start, from))
  }, 0)
  return Math.round(minutes / 60)
}

/**
 * Whole miles flown by `t`: every mile of a flight that's in, none of one that hasn't left, and as far as the facts'
 * plane has come on the one in the air. A flight with a real path counts the miles along it. `isReplay`: `t` is a
 * moment of the replay, not now.
 */
export function milesFlown(legs: MapLeg[], t: number, isReplay = false): number {
  const meters = legs.filter((l) => l.kind === 'flight').reduce((sum, leg) => {
    if (t >= leg.end) return sum + legPathLength(leg)
    if (t < leg.start) return sum
    return sum + legPlane(leg, t, isReplay).distance
  }, 0)
  return Math.round(meters / METERS_PER_MILE)
}

/** Whole miles of every flight among `legs`, along each one's real path where it has one. */
export function totalMiles(legs: MapLeg[]): number {
  return Math.round(legs.filter((l) => l.kind === 'flight').reduce((sum, l) => sum + legPathLength(l), 0) / METERS_PER_MILE)
}

/** Up to `t`: the finished flights, and the miles of the one in the air. `isReplay`: `t` is a moment of the replay, not now. */
export function totalsSoFar(map: TripMap, t: number, events: SunEventsByLeg, isReplay = false): TripTotals {
  const finished = map.legs.filter((l) => l.kind === 'flight' && l.end <= t)
  return {
    cities: destinationsOf(finished, map.home).length,
    miles: milesFlown(map.legs, t, isReplay),
    timeZones: timeZonesCrossed(finished),
    cockpitSunsets: sunsetsBy(map.legs, t, events),
  }
}

/** The whole trip. */
export function wholeTotals(map: TripMap, events: SunEventsByLeg): TripTotals {
  return {
    cities: destinationsOf(map.legs, map.home).length,
    miles: totalMiles(map.legs),
    timeZones: timeZonesCrossed(map.legs),
    cockpitSunsets: sunsetsBy(map.legs, Infinity, events),
  }
}

/** The flight with the most miles, along its real path where it has one: the first of any tie. */
export function longestFlight(legs: MapLeg[]): MapLeg | null {
  let longest: MapLeg | null = null
  for (const leg of legs) if (leg.kind === 'flight' && (!longest || legPathLength(leg) > legPathLength(longest))) longest = leg
  return longest
}
