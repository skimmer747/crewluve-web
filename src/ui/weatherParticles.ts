import type { WeatherAnimation } from '../copy/weather'

/**
 * The weather animations' particles (slice 2B2 §7), copying WeatherBackgroundView: every position is worked out from
 * the time and the particle's number, so nothing is stored between frames. Sizes are in CSS pixels of the card.
 */

/** The colors the particles use: theme colors, white, and the app's cloud and fog grays. */
export type ParticleColor = 'orange' | 'yellow' | 'blue' | 'cyan' | 'white' | 'cloud' | 'fog'

export type WeatherShape =
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; width: number; color: ParticleColor; alpha: number }
  | { kind: 'dot'; x: number; y: number; r: number; color: ParticleColor; alpha: number }
  /** A soft ellipse, centered at x, y: a cloud or a fog band, faded at its edges over `blur` pixels. */
  | { kind: 'soft'; x: number; y: number; rx: number; ry: number; blur: number; color: 'cloud' | 'fog'; alpha: number }
  /** The lightning flash over the whole card. */
  | { kind: 'flash'; alpha: number }
  /** The lightning bolt: a jagged white line. */
  | { kind: 'bolt'; points: Array<[number, number]>; width: number; alpha: number }

/**
 * A number from 0 up to 1 for a particle, the same every time: the app's seeded hash, worked in 32-bit integers, so the
 * particles sit in different places from the app's (slice 2B2 §11 item 9).
 */
export function particleHash(seed: number, index: number): number {
  let h = (Math.imul(seed, 2654435761) + Math.imul(index, 340573321)) >>> 0
  h = (h ^ (h >>> 16)) >>> 0
  h = Math.imul(h, 0x45d9f3b) >>> 0
  h = (h ^ (h >>> 16)) >>> 0
  return (h % 10000) / 10000
}

const hash = particleHash
const TAU = Math.PI * 2
const range = (count: number) => Array.from({ length: count }, (_, i) => i)

/** Twelve rays turning slowly from a point near the top right, each pulsing in length and strength. */
function sunRays(t: number, w: number, h: number): WeatherShape[] {
  const cx = w * 0.85
  const cy = h * 0.12
  return range(12).map((i) => {
    const angle = t * 0.15 + (i * TAU) / 12
    const seed = hash(7, i)
    const pulse = Math.sin(t * (0.4 + seed * 0.3) + seed * TAU) * 0.5 + 0.5
    const length = 60 + 120 * pulse
    return {
      kind: 'line',
      x1: cx + Math.cos(angle) * 20,
      y1: cy + Math.sin(angle) * 20,
      x2: cx + Math.cos(angle) * length,
      y2: cy + Math.sin(angle) * length,
      width: 3.5,
      color: i % 2 === 0 ? 'orange' : 'yellow',
      alpha: 0.12 + pulse * 0.15,
    }
  })
}

/** Forty stars, each twinkling at its own pace. */
function stars(t: number, w: number, h: number): WeatherShape[] {
  return range(40).map((i) => {
    const twinkle = Math.sin(t * (0.5 + hash(4, i) * 1.5) + hash(5, i) * TAU) * 0.5 + 0.5
    return { kind: 'dot', x: hash(1, i) * w, y: hash(2, i) * h, r: 1 + hash(3, i) * 2, color: 'white', alpha: 0.2 + twinkle * 0.6 }
  })
}

/** Sixty drops falling with a slight slant, every third one cyan. */
function rain(t: number, w: number, h: number): WeatherShape[] {
  const margin = 40
  const slant = 8
  return range(60).map((i) => {
    const length = 12 + hash(12, i) * 8
    const y = ((t * (280 + hash(11, i) * 200) + hash(13, i) * (h + margin)) % (h + margin)) - margin / 2
    const x = hash(10, i) * (w + 60) - 30 + (y / h) * slant
    return {
      kind: 'line',
      x1: x,
      y1: y,
      x2: x + slant * (length / h),
      y2: y + length,
      width: 1.5,
      color: i % 3 === 0 ? 'cyan' : 'blue',
      alpha: 0.25 + hash(14, i) * 0.15,
    }
  })
}

/** Thirty-five flakes drifting down and swaying. */
function snow(t: number, w: number, h: number): WeatherShape[] {
  const margin = 30
  return range(35).map((i) => {
    const y = ((t * (30 + hash(21, i) * 40) + hash(25, i) * (h + margin)) % (h + margin)) - margin / 2
    const sway = Math.sin(t * (0.3 + hash(23, i) * 0.5) + hash(26, i) * TAU) * (15 + hash(24, i) * 25)
    return { kind: 'dot', x: hash(20, i) * w + sway, y, r: 2 + hash(22, i) * 3, color: 'white', alpha: 0.4 + hash(27, i) * 0.3 }
  })
}

/** Seven soft clouds drifting across, coming back round from the left. */
function clouds(t: number, w: number, h: number): WeatherShape[] {
  return range(7).map((i) => {
    const cw = 120 + hash(32, i) * 150
    const ch = 50 + hash(33, i) * 50
    const left = ((t * (8 + hash(31, i) * 15) + hash(34, i) * (w + cw)) % (w + cw)) - cw / 2
    return { kind: 'soft', x: left + cw / 2, y: hash(30, i) * h, rx: cw / 2, ry: ch / 2, blur: 18, color: 'cloud', alpha: 0.25 + hash(35, i) * 0.2 }
  })
}

/** The rain, with a flash and a bolt for a moment every 6 seconds; the bolt changes each time. */
function thunderstorm(t: number, w: number, h: number): WeatherShape[] {
  const shapes = rain(t, w, h)
  const cycle = t / 6
  if (cycle - Math.floor(cycle) >= 0.017) return shapes
  const seed = Math.floor(cycle)
  let x = hash(50, seed) * w * 0.6 + w * 0.2
  let y = 0
  const points: Array<[number, number]> = [[x, y]]
  for (let s = 0; s < 4; s++) {
    x += (hash(51 + s, seed) - 0.5) * 60
    y += (h * 0.5) / 4
    points.push([x, y])
  }
  return [...shapes, { kind: 'flash', alpha: 0.25 }, { kind: 'bolt', points, width: 2, alpha: 0.8 }]
}

/** Four wide soft bands of fog, rising and falling slowly. */
function fog(t: number, w: number, h: number): WeatherShape[] {
  return range(4).map((i) => {
    const y = h * (0.2 + hash(40, i) * 0.6) + Math.sin(t * (0.15 + hash(41, i) * 0.25) + hash(45, i) * TAU) * (20 + hash(42, i) * 30)
    const bandHeight = 60 + hash(43, i) * 40
    return { kind: 'soft', x: w / 2, y, rx: (w + 40) / 2, ry: bandHeight / 2, blur: 30, color: 'fog', alpha: 0.15 + hash(44, i) * 0.15 }
  })
}

const DRAW: Record<WeatherAnimation, (t: number, w: number, h: number) => WeatherShape[]> = {
  sunRays,
  stars,
  rain,
  snow,
  clouds,
  thunderstorm,
  fog,
}

/** The shapes of animation `kind` at `t` seconds, on a card `w` by `h` pixels. */
export function weatherShapes(kind: WeatherAnimation, t: number, w: number, h: number): WeatherShape[] {
  return DRAW[kind](t, w, h)
}
