import { airborneWindow } from '../map/flightProgress'
import type { MapLeg } from '../map/tripMap'

/** When a flight left the ground (time labels design §3.3), for its takeoff row and the weather it took off in. */
export interface Takeoff {
  time: number
  /** The real plane was seen leaving. Otherwise the time is the schedule's, a guess the words mark "about". */
  isSeen: boolean
}

/**
 * The real plane's takeoff where it was first seen close enough to its departure airport to tell, else the schedule's,
 * after its taxi allowance, as the app's MapLeg.takeoff. Null for a real plane first seen too far out: for a late flight
 * the schedule's time could be an hour off.
 */
export function takeoffOf(leg: MapLeg): Takeoff | null {
  const record = leg.flight?.record
  if (record) return record.takeoff == null ? null : { time: record.takeoff, isSeen: true }
  const schedules = leg.flight?.plan.takeoff ?? airborneWindow(leg.start, leg.end)?.start
  return schedules == null ? null : { time: schedules, isSeen: false }
}
