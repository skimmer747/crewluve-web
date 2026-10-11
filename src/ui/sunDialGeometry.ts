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
export const round = (v: number) => Math.round(v * 100) / 100

/** An angle wrapped into 0 up to 360, like the app's (a - b + 360).truncatingRemainder(dividingBy: 360). */
export const turn = (degrees: number) => ((degrees % 360) + 360) % 360

/** The point `radius` from the dial's center at `angle` degrees, unrounded, for working out other points. */
export function exactPoint(angle: number, radius: number): Point {
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
  const sweep = turn(to - from)
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
