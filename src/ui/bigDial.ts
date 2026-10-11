import { dialTimeText } from '../copy/format'
import { timeDifference } from '../copy/location'
import { departureCountdownText, departureOffset, departureTime, hourDifference, type DialDeparture } from '../copy/sunDetail'
import { sharedDaylight } from '../time/sharedDaylight'
import type { SunTimes } from '../time/sun'
import { DAY, HOUR } from '../time/zoned'
import type { DialMoment, DialTurns, TurnState } from './dialTimeline'
import {
  arcPath,
  cornerFor,
  departureMarkerPath,
  departureSweep,
  DETAIL,
  DIAL,
  dialAngle,
  homeArrow,
  hourAngle,
  labelAt,
  planeSpot,
  pointAt,
  wedgePath,
  type Arrow,
  type PlaneSpot,
  type Point,
  type Sweep,
} from './sunDialGeometry'

/** What the popup's big dial knows beyond the card's dial (slice 2B2 §5, §8). */
export interface DialDetail {
  /** The family's time zone, for home's hand, the house and the arrow. */
  homeTz: string
  /** Home's sunrise and sunset, for the shared daylight, or null when home's airport isn't known. */
  homeSun: SunTimes | null
  /** The next departure, or null when there's none. */
  departure: DialDeparture | null
  /** Reduced motion: the loop holds still with both arcs drawn. */
  still: boolean
}

export interface DialLabel {
  at: Point
  text: string
}

/** The home-time layers, shown while the pilot's clock differs from home's. */
export interface HomeLayers {
  /** The end of the dashed green line, on the circle at home's time. */
  hand: Point
  /** The corner of the house icon's box. */
  house: Point
  /** Each span when both places are in daylight: its wedge and its arc. */
  shared: Array<{ wedge: string; arc: string }>
  arrow: Arrow | null
  /** "+6h" or "-9:30", over "ahead" or "behind". */
  amount: string
  ahead: boolean
  turn: TurnState
}

/** The departure's marks at one time: the hand's end, the plane outside the circle, and the time label. */
export interface DepartureMarks {
  hand: Point
  plane: PlaneSpot
  label: DialLabel
}

/** The departure layers, shown while the departure is ahead. */
export interface DepartureLayers extends DepartureMarks {
  /** The turned triangle at the scheduled time. */
  marker: string
  /** The red marks at the actual time, when it's 15 minutes or more off the schedule. */
  delay: DepartureMarks | null
  sweep: Sweep
  /** The plane riding the sweep's leading end. */
  rider: PlaneSpot
  /** "5h20m", over "to go". */
  countdown: string
  /** Red when late, green when early, cyan otherwise: the rider's and the countdown's color. */
  tone: 'late' | 'early' | 'on-time'
  turn: TurnState
}

export interface BigDialLayers {
  home: HomeLayers | null
  departure: DepartureLayers | null
}

/** Which turns of the loop apply now: home's while the clocks differ, the departure's while it's ahead. */
export function bigDialTurns(now: number, timeZone: string, detail: DialDetail): DialTurns {
  const leaves = detail.departure ? departureTime(detail.departure) : null
  return {
    home: timeDifference(now, timeZone, detail.homeTz).direction !== 'same',
    departureDays: leaves != null && leaves > now ? (leaves - now) / DAY : null,
    still: detail.still,
  }
}

/** The departure's marks at `ms`: its hand, its plane 2 points past the triangle, and its label. */
function marksAt(ms: number, timeZone: string, h24: boolean): DepartureMarks {
  const angle = dialAngle(ms, timeZone)
  return {
    hand: pointAt(angle, DIAL.radius),
    plane: planeSpot(angle, DETAIL.planeRadius, DETAIL.plane),
    label: { at: labelAt(angle), text: dialTimeText(ms, timeZone, h24) },
  }
}

/** Everything the big dial draws beyond the card's dial, at `now`, with the loop at `moment`. */
export function bigDialLayers(sun: SunTimes, now: number, timeZone: string, h24: boolean, detail: DialDetail, moment: DialMoment): BigDialLayers {
  const turns = bigDialTurns(now, timeZone, detail)
  const nowAngle = dialAngle(now, timeZone)
  let home: HomeLayers | null = null
  if (turns.home) {
    const homeAngle = dialAngle(now, detail.homeTz)
    const { amount, ahead } = hourDifference(now, timeZone, detail.homeTz)
    const spans = detail.homeSun ? sharedDaylight(sun, detail.homeSun, detail.homeTz) : []
    home = {
      hand: pointAt(homeAngle, DIAL.radius),
      house: cornerFor(pointAt(homeAngle, DIAL.radius), DETAIL.homeIcon),
      shared: spans.map((span) => ({
        wedge: wedgePath(hourAngle(span.start), hourAngle(span.end)),
        arc: arcPath(hourAngle(span.start), hourAngle(span.end), DIAL.radius),
      })),
      arrow: homeArrow(homeAngle, nowAngle, ahead, moment.home.progress),
      amount,
      ahead,
      turn: moment.home,
    }
  }
  let departure: DepartureLayers | null = null
  if (detail.departure && turns.departureDays != null) {
    const { scheduled } = detail.departure
    const leaves = departureTime(detail.departure)
    const offset = departureOffset(detail.departure)
    const sweep = departureSweep({
      now: nowAngle,
      scheduled: dialAngle(scheduled, timeZone),
      actual: dialAngle(leaves, timeZone),
      hoursToScheduled: (scheduled - now) / HOUR,
      hoursToActual: (leaves - now) / HOUR,
      progress: moment.departure.progress,
    })
    departure = {
      ...marksAt(scheduled, timeZone, h24),
      marker: departureMarkerPath(dialAngle(scheduled, timeZone)),
      delay: offset == null ? null : marksAt(leaves, timeZone, h24),
      sweep,
      rider: planeSpot(sweep.tip, DETAIL.sweepRadius, DETAIL.sweepPlane),
      countdown: departureCountdownText(leaves - now),
      tone: offset == null ? 'on-time' : offset > 0 ? 'late' : 'early',
      turn: moment.departure,
    }
  }
  return { home, departure }
}
