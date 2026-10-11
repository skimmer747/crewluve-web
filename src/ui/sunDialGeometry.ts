import { zonedParts } from '../time/zoned'

/** SunCircleView's card-size measurements (PilotStatusView.swift, size 160), in points of its own 160-point box. */
export const DIAL = {
  size: 160,
  /** The circle's center sits 2 points below the middle of the box. */
  cx: 80,
  cy: 82,
  radius: 42,
  sunIcon: 14,
  moonIcon: 12,
  tick: 6,
  marker: 6,
  markerHalfWidth: 3.5,
  labelOffset: 38,
  labelInsetX: 22,
  labelInsetY: 8,
  noonLabelOffset: 14,
} as const

export interface Point {
  x: number
  y: number
}

/**
 * Where a time sits on the dial, in degrees clockwise from 3 o'clock: midnight 90 (the bottom), 6 am 180, noon 270,
 * 6 pm 360. Taken from the hour and minute in `timeZone`, as the app does (angleForTime).
 */
export function dialAngle(ms: number, timeZone: string): number {
  const { hour, minute } = zonedParts(ms, timeZone)
  return hourAngle(hour + minute / 60)
}

/** Where an hour of the day, from 0 up to 24 with a fraction, sits on the dial (angleForClockHour): midnight 90, noon 270. */
export function hourAngle(hour: number): number {
  return 90 + (hour / 24) * 360
}

/** A number rounded to hundredths, which keeps the SVG's numbers short. */
const round = (v: number) => Math.round(v * 100) / 100

/** The point `radius` from the dial's center at `angle` degrees, unrounded, for working out other points. */
function exactPoint(angle: number, radius: number): Point {
  const a = (angle * Math.PI) / 180
  return { x: DIAL.cx + radius * Math.cos(a), y: DIAL.cy + radius * Math.sin(a) }
}

/** The point `radius` from the dial's center at `angle` degrees, rounded to hundredths. */
export function pointAt(angle: number, radius: number): Point {
  const p = exactPoint(angle, radius)
  return { x: round(p.x), y: round(p.y) }
}

/** An SVG path along the circle of `radius`, clockwise from angle `from` to angle `to`. */
export function arcPath(from: number, to: number, radius: number): string {
  const sweep = (((to - from) % 360) + 360) % 360
  const a = pointAt(from, radius)
  const b = pointAt(to, radius)
  const r = round(radius)
  return `M${a.x} ${a.y}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${b.x} ${b.y}`
}

/** A 30-minute glow: golden hour, amber, just inside the daylight; twilight, blue, just outside it. */
export interface GlowBand {
  kind: 'golden' | 'twilight'
  from: number
  to: number
}

/** Thirty minutes of the day, in degrees. */
const GLOW_DEGREES = (30 / 1440) * 360

/** The four glow bands, in the app's drawing order. The golden ones never cover more than half the daylight. */
export function glowBands(sunrise: number, sunset: number): GlowBand[] {
  const span = (sunset - sunrise) % 360
  const daylight = span <= 0 ? span + 360 : span
  const golden = Math.min(GLOW_DEGREES, daylight / 2)
  return [
    { kind: 'golden', from: sunrise, to: sunrise + golden },
    { kind: 'golden', from: sunset - golden, to: sunset },
    { kind: 'twilight', from: sunrise - GLOW_DEGREES, to: sunrise },
    { kind: 'twilight', from: sunset, to: sunset + GLOW_DEGREES },
  ]
}

/** The top-left corner that centers an icon of `size` on point `p`, rounded after the subtraction. */
export function cornerFor(p: Point, size: number): Point {
  return { x: round(p.x - size / 2), y: round(p.y - size / 2) }
}

/** The tick across the circle at sunrise or sunset. */
export function tickAt(angle: number): { from: Point; to: Point } {
  return { from: pointAt(angle, DIAL.radius - DIAL.tick / 2), to: pointAt(angle, DIAL.radius + DIAL.tick / 2) }
}

/** The small triangle outside the circle that points at noon (270) or midnight (90). */
export function markerPath(angle: 90 | 270): string {
  const tip = pointAt(angle, DIAL.radius)
  const base = pointAt(angle, DIAL.radius + DIAL.marker)
  const half = DIAL.markerHalfWidth
  return `M${tip.x} ${tip.y}L${round(base.x - half)} ${base.y}L${round(base.x + half)} ${base.y}Z`
}

/** Where the sunrise or sunset label goes: 38 points beyond the circle, kept inside the box. */
export function labelAt(angle: number): Point {
  const p = pointAt(angle, DIAL.radius + DIAL.labelOffset)
  return {
    x: Math.max(DIAL.labelInsetX, Math.min(DIAL.size - DIAL.labelInsetX, p.x)),
    y: Math.max(DIAL.labelInsetY, Math.min(DIAL.size - DIAL.labelInsetY, p.y)),
  }
}

export interface SkyStop {
  color: string
  /** How far round from 3 o'clock, clockwise, from 0 to 1. */
  at: number
}

const NAVY = 'rgb(13, 13, 51)' // Color(red: 0.05, green: 0.05, blue: 0.2)
const AMBER = 'rgb(230, 153, 51)' // Color(red: 0.9, green: 0.6, blue: 0.2)
const SKY_BLUE = 'rgb(102, 179, 255)' // Color(red: 0.4, green: 0.7, blue: 1.0)

/** A fraction of a turn, wrapped into 0…1. */
const wrap = (f: number) => {
  const v = f % 1
  return v < 0 ? v + 1 : v
}

/**
 * The sky's colors round the dial (skyGradientStops): navy at night, amber at sunrise and sunset, sky blue by day.
 * The navy turns amber 2% of the day before sunrise and back after sunset; the amber turns blue 4% of the day into daylight.
 */
export function skyStops(sunrise: number, sunset: number): SkyStop[] {
  const rise = wrap(sunrise / 360)
  const set = wrap(sunset / 360)
  const midnight = wrap(90 / 360)
  return [
    { color: NAVY, at: midnight },
    { color: NAVY, at: wrap(rise - 0.02) },
    { color: AMBER, at: rise },
    { color: SKY_BLUE, at: wrap(rise + 0.04) },
    { color: SKY_BLUE, at: wrap(270 / 360) },
    { color: SKY_BLUE, at: wrap(set - 0.04) },
    { color: AMBER, at: set },
    { color: NAVY, at: wrap(set + 0.02) },
    { color: NAVY, at: wrap(midnight + 1) },
  ].sort((a, b) => a.at - b.at)
}

/** The sky as a CSS conic gradient that starts at 3 o'clock, as SwiftUI's does. */
export function skyBackground(sunrise: number, sunset: number): string {
  return `conic-gradient(from 90deg, ${skyStops(sunrise, sunset)
    .map((stop) => `${stop.color} ${round(stop.at * 100)}%`)
    .join(', ')})`
}

/**
 * The big dial's own measurements: the parts of SunCircleView the app draws only above the card's size (size > 160),
 * in points of the same 160-point box. The browser scales them with everything else, by 2.25 at 360.
 */
export const DETAIL = {
  /** The home-time arrow runs round a circle at 0.70 × the radius, the departure sweep round one at 0.85 ×. */
  arrowRadius: DIAL.radius * 0.7,
  sweepRadius: DIAL.radius * 0.85,
  arrowhead: 5,
  /** How far each side of the arrowhead turns off the arc, in degrees. */
  arrowheadSpread: 25,
  homeIcon: 10,
  plane: 10,
  sweepPlane: 8,
  /** The departure plane sits 2 points beyond the departure triangle. */
  planeRadius: DIAL.radius + DIAL.marker + 2,
} as const

/** An angle wrapped into 0 up to 360, like the app's (a - b + 360).truncatingRemainder(dividingBy: 360). */
const turn = (degrees: number) => ((degrees % 360) + 360) % 360

/**
 * An SVG path round the circle of `radius` from angle `from`, turning `sweep` degrees: clockwise when it's positive,
 * counterclockwise when negative. It goes in pieces of at most half a turn, so laps of a day or more draw over each
 * other as the app's do.
 */
export function turnPath(from: number, sweep: number, radius: number): string {
  const r = round(radius)
  const start = pointAt(from, radius)
  const direction = sweep < 0 ? -1 : 1
  let path = `M${start.x} ${start.y}`
  let at = from
  let left = Math.abs(sweep)
  while (left > 0.001) {
    const piece = Math.min(left, 180)
    at += direction * piece
    const end = pointAt(at, radius)
    path += `A${r} ${r} 0 0 ${direction > 0 ? 1 : 0} ${end.x} ${end.y}`
    left -= piece
  }
  return path
}

/** The home-time arrow's arc, and the arrowhead that leads it. */
export interface Arrow {
  arc: string
  head: string
}

/**
 * The home-time arrow, drawn `progress` (0 to 1) of the way round the 0.70 circle from home's time to the pilot's:
 * clockwise when the pilot is ahead, counterclockwise when behind (HomeTimeArcShape, HomeTimeArrowheadShape).
 */
export function homeArrow(home: number, pilot: number, ahead: boolean, progress: number): Arrow | null {
  if (progress <= 0) return null
  const sweep = (ahead ? turn(pilot - home) : -turn(home - pilot)) * progress
  const end = home + sweep
  const tip = exactPoint(end, DETAIL.arrowRadius)
  // The sides run back from the tip, 25° either side of straight back along the arc.
  const back = end + (ahead ? 90 : -90) + 180
  const side = (offset: number) => {
    const a = ((back + offset) * Math.PI) / 180
    return `${round(tip.x + DETAIL.arrowhead * Math.cos(a))} ${round(tip.y + DETAIL.arrowhead * Math.sin(a))}`
  }
  return {
    arc: turnPath(home, sweep, DETAIL.arrowRadius),
    head: `M${round(tip.x)} ${round(tip.y)}L${side(DETAIL.arrowheadSpread)}L${side(-DETAIL.arrowheadSpread)}Z`,
  }
}

export interface SweepInput {
  /** The dial's angles for now, the scheduled departure and the actual one. */
  now: number
  scheduled: number
  actual: number
  /** Hours from now to the scheduled departure and to the actual one. */
  hoursToScheduled: number
  hoursToActual: number
  /** How far the sweep has drawn, 0 to 1. */
  progress: number
}

export interface Sweep {
  /** The dashed full laps, one a day, when the departure is more than a day ahead. */
  laps: string | null
  /** The solid part, up to the scheduled time at most. */
  solid: string | null
  /** The red part, from the scheduled time to the actual one when that's later. */
  delay: string | null
  /** The angle of the leading end, where the plane rides. */
  tip: number
}

/**
 * The departure sweep round the 0.85 circle, clockwise from now and `progress` of the way to the actual departure,
 * cut into the pieces the app's DepartureArcShape instances draw. Each full day ahead is a lap. The red piece is
 * empty unless the actual time is past the scheduled one, so an early departure has none, as in the app.
 */
export function departureSweep(s: SweepInput): Sweep {
  const total = Math.floor(s.hoursToActual / 24) * 360 + turn(s.actual - s.now)
  const laps = Math.floor(Math.max(0, s.hoursToScheduled) / 24) * 360
  const toScheduled = laps + turn(s.scheduled - s.now)
  const drawn = total * s.progress
  /** What's drawn of the piece that starts `offset` degrees round and runs at most `cap`, or null when that's nothing. */
  const piece = (offset: number, cap: number) => {
    const start = Math.min(drawn, offset)
    const length = Math.min(drawn - start, cap)
    return length > 0.001 ? turnPath(s.now + start, length, DETAIL.sweepRadius) : null
  }
  const overDay = s.hoursToActual > 24
  return {
    laps: overDay ? piece(0, laps) : null,
    solid: overDay ? piece(laps, toScheduled - laps) : piece(0, toScheduled),
    delay: piece(toScheduled, Infinity),
    tip: s.now + drawn,
  }
}

/** The small triangle just outside the circle at the departure time: the noon marker, turned to point at the center. */
export function departureMarkerPath(angle: number): string {
  const tip = pointAt(angle, DIAL.radius)
  const base = exactPoint(angle, DIAL.radius + DIAL.marker)
  // Half the base, across the radius: the app's perpendicular (-sin, cos).
  const a = (angle * Math.PI) / 180
  const dx = -Math.sin(a) * DIAL.markerHalfWidth
  const dy = Math.cos(a) * DIAL.markerHalfWidth
  return `M${tip.x} ${tip.y}L${round(base.x + dx)} ${round(base.y + dy)}L${round(base.x - dx)} ${round(base.y - dy)}Z`
}

/** A wedge from the center out to the circle, clockwise from angle `from` to angle `to`: the shared daylight's fill. */
export function wedgePath(from: number, to: number): string {
  const a = pointAt(from, DIAL.radius)
  const b = pointAt(to, DIAL.radius)
  return `M${DIAL.cx} ${DIAL.cy}L${a.x} ${a.y}A${DIAL.radius} ${DIAL.radius} 0 ${turn(to - from) > 180 ? 1 : 0} 1 ${b.x} ${b.y}Z`
}

/** Where a plane icon goes: the corner of its box, and its turn in degrees about the box's center. */
export interface PlaneSpot {
  corner: Point
  rotate: number
}

/**
 * A plane icon of `size` centered on the circle of `radius` at `angle`, pointing clockwise along it. Phosphor's plane
 * points up, so it turns angle + 180; the app's SF Symbol points right and turns angle + 90.
 */
export function planeSpot(angle: number, radius: number, size: number): PlaneSpot {
  return { corner: cornerFor(pointAt(angle, radius), size), rotate: round(turn(angle + 180)) }
}
