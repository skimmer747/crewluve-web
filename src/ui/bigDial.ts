import { dialTimeText } from '../copy/format'
import { timeDifference } from '../copy/location'
import { departureCountdownText, hourDifference } from '../copy/sunDetail'
import { departureOffset, type Departure } from '../engine/snapshot'
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
  type SweepInput,
} from './sunDialGeometry'

/** What the popup's big dial knows beyond the card's dial (slice 2B2 §5, §8). */
export interface DialDetail {
  /** The family's time zone, for home's hand, the house and the arrow. */
  homeTz: string
  /** Home's sunrise and sunset, for the shared daylight, or null when home's airport isn't known. */
  homeSun: SunTimes | null
  /** The next departure, or null when there's none. */
  departure: Departure | null
  /** Reduced motion: the loop holds still with both arcs drawn. */
  still: boolean
}

export interface DialLabel {
  at: Point
  text: string
}

/** Home's layers that don't move, shown while the pilot's clock differs from home's. */
export interface HomeBase {
  /** Home's time on the dial, where the arrow starts. */
  angle: number
  /** The end of the dashed green line, on the circle at home's time. */
  hand: Point
  /** The corner of the house icon's box. */
  house: Point
  /** Each span when both places are in daylight: its wedge and its arc. */
  shared: Array<{ wedge: string; arc: string }>
  /** "+6h" or "-9:30", over "ahead" or "behind". */
  amount: string
  ahead: boolean
}

/** Home's layers at one moment of the loop. */
export interface HomeLayers extends HomeBase {
  arrow: Arrow | null
  turn: TurnState
}

/** The departure's marks at one time: the hand's end, the plane outside the circle, and the time label. */
export interface DepartureMarks {
  hand: Point
  plane: PlaneSpot
  label: DialLabel
}

/** The departure's layers that don't move, shown while its actual time is ahead. */
export interface DepartureBase extends DepartureMarks {
  /** The turned triangle at the departure's time. */
  marker: string
  /** The red marks at the actual time, when it's 15 minutes or more off the schedule. */
  delay: DepartureMarks | null
  /** "5h20m", over "to go". */
  countdown: string
  /** Red when late, green when early, cyan otherwise: the rider's and the countdown's color. */
  tone: 'late' | 'early' | 'on-time'
  /** Where the sweep runs, for drawing it at any moment of the loop. */
  sweepFrom: Omit<SweepInput, 'progress'>
}

/** The departure's layers at one moment of the loop. */
export interface DepartureLayers extends DepartureBase {
  sweep: Sweep
  /** The plane riding the sweep's leading end. */
  rider: PlaneSpot
  turn: TurnState
}

/**
 * What the big dial draws beyond the card's dial that doesn't move. The popup works it out once a second; on every
 * animation frame of the loop, `bigDialLayers` adds only the arrow and the sweep.
 */
export interface BigDialBase {
  turns: DialTurns
  /** The pilot's time now on the dial, where the arrow ends and the sweep starts. */
  nowAngle: number
  home: HomeBase | null
  departure: DepartureBase | null
}

export interface BigDialLayers {
  home: HomeLayers | null
  departure: DepartureLayers | null
}

/** Which turns of the loop apply now: home's while the clocks differ, the departure's while its actual time is ahead. */
export function bigDialTurns(now: number, timeZone: string, detail: DialDetail): DialTurns {
  const leaves = detail.departure?.actual
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

/** What the big dial draws beyond the card's dial that doesn't move, at `now`. */
export function bigDialBase(sun: SunTimes, now: number, timeZone: string, h24: boolean, detail: DialDetail): BigDialBase {
  const turns = bigDialTurns(now, timeZone, detail)
  const nowAngle = dialAngle(now, timeZone)
  let home: HomeBase | null = null
  if (turns.home) {
    const angle = dialAngle(now, detail.homeTz)
    const spans = detail.homeSun ? sharedDaylight(sun, detail.homeSun, detail.homeTz) : []
    home = {
      angle,
      hand: pointAt(angle, DIAL.radius),
      house: cornerFor(pointAt(angle, DIAL.radius), DETAIL.homeIcon),
      shared: spans.map((span) => ({
        wedge: wedgePath(hourAngle(span.start), hourAngle(span.end)),
        arc: arcPath(hourAngle(span.start), hourAngle(span.end), DIAL.radius),
      })),
      ...hourDifference(timeDifference(now, timeZone, detail.homeTz)),
    }
  }
  let departure: DepartureBase | null = null
  if (detail.departure && turns.departureDays != null) {
    const { scheduled, actual } = detail.departure
    const offset = departureOffset(detail.departure)
    // A departure under 15 minutes off counts as on time at its actual time: its marks sit there, and its sweep runs
    // cyan all the way to it. Otherwise the cyan marks show the scheduled time and the red ones the actual time.
    const due = offset == null ? actual : scheduled
    departure = {
      ...marksAt(due, timeZone, h24),
      marker: departureMarkerPath(dialAngle(due, timeZone)),
      delay: offset == null ? null : marksAt(actual, timeZone, h24),
      countdown: departureCountdownText(actual - now),
      tone: offset == null ? 'on-time' : offset > 0 ? 'late' : 'early',
      sweepFrom: {
        now: nowAngle,
        scheduled: dialAngle(due, timeZone),
        actual: dialAngle(actual, timeZone),
        hoursToScheduled: (due - now) / HOUR,
        hoursToActual: (actual - now) / HOUR,
      },
    }
  }
  return { turns, nowAngle, home, departure }
}

/** The big dial's layers with the loop at `moment`: the base, plus the arrow, the sweep and its rider. Plain arithmetic, cheap enough for every frame. */
export function bigDialLayers(base: BigDialBase, moment: DialMoment): BigDialLayers {
  const { home, departure } = base
  let sweep: Sweep | null = null
  if (departure) sweep = departureSweep({ ...departure.sweepFrom, progress: moment.departure.progress })
  return {
    home: home && { ...home, arrow: homeArrow(home.angle, base.nowAngle, home.ahead, moment.home.progress), turn: moment.home },
    departure:
      departure && sweep && { ...departure, sweep, rider: planeSpot(sweep.tip, DETAIL.sweepRadius, DETAIL.sweepPlane), turn: moment.departure },
  }
}
