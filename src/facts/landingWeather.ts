import { isMoving, type MapLeg, type TripMap } from '../map/tripMap'
import { HOUR } from '../time/zoned'

/** Weather shows for a flight landing within this of now (Stage 2 spec §7.2). */
export const WEATHER_HORIZON_MS = 48 * HOUR

/**
 * True when `leg` lands between the real `now` and 48 hours on. The rows ask this with the real time, whatever moment
 * the timeline shows: a forecast can't describe a landing that's already happened (§7.3).
 */
export const landsWithinHorizon = (leg: MapLeg, now: number) => leg.end > now && leg.end - now <= WEATHER_HORIZON_MS

/** The flight in the air at `now`, and the next flight, each only when it lands within 48 hours of `now` (§7.2). */
export function flightsToForecast(map: TripMap, now: number): MapLeg[] {
  const flights = map.legs.filter((l) => l.kind === 'flight')
  const inAir = flights.find((l) => isMoving(l, now))
  const next = flights.find((l) => l.start > now)
  return [inAir, next].filter((l): l is MapLeg => l != null && l.end - now <= WEATHER_HORIZON_MS)
}
