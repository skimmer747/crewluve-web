import type { GeoPoint } from './greatCircle'
import { toWorld } from './mercator'

/**
 * The flat-map rectangle the trip map shows (moving map spec §6, §12), as the app's MapFit. A trip across the date line
 * is laid out in one piece, so Anchorage to Tokyo frames the North Pacific, not the whole world.
 */
export interface WorldRect {
  /** In world units (`WorldPoint`). May run past 1 when the rectangle crosses the date line. */
  x: number
  y: number
  width: number
  height: number
}

/** The smallest side a rectangle may have, as a share of the world: about 60 km at the equator, for one airport or a short drive. */
export const MIN_SIDE = 0.0015

/** A rectangle that starts left of the date line runs on past the right edge instead. */
const normalized = (r: WorldRect): WorldRect => (r.x < 0 ? { ...r, x: r.x + 1 } : r)

/**
 * The smallest rectangle holding every place the short way round the world. It's grown by `padding`, a share of its
 * width and height on each side, and is at least `minSide` on each side. Null for no places.
 */
export function fitRect(places: GeoPoint[], padding = 0.2, minSide = MIN_SIDE): WorldRect | null {
  if (places.length === 0) return null
  const points = places.map(toWorld)
  const xs = points.map((p) => p.x).sort((a, b) => a - b)
  const ys = points.map((p) => p.y)
  // The widest empty stretch of longitude is left out. When it's the one across the date line, the rectangle sits inside
  // one world; otherwise it runs on past the map's right edge.
  let gapAfter = xs.length - 1
  let widest = 1 - xs[xs.length - 1] + xs[0]
  for (let i = 0; i < xs.length - 1; i++) {
    if (xs[i + 1] - xs[i] > widest) {
      widest = xs[i + 1] - xs[i]
      gapAfter = i
    }
  }
  const minX = gapAfter === xs.length - 1 ? xs[0] : xs[gapAfter + 1]
  const maxX = gapAfter === xs.length - 1 ? xs[xs.length - 1] : xs[gapAfter] + 1
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const width = Math.max((maxX - minX) * (1 + 2 * padding), minSide)
  const height = Math.max((maxY - minY) * (1 + 2 * padding), minSide)
  return normalized({ x: (minX + maxX) / 2 - width / 2, y: (minY + maxY) / 2 - height / 2, width, height })
}

/**
 * Whether every place of `next` lies inside the rectangle that frames `kept`, with the same room around it: the camera
 * framed on `kept` already shows them. A real path grows as the plane is seen (Stage 3 spec §6.2), and the map frames
 * again only once it grows past its frame, so the camera doesn't move with every answer.
 */
export function framesAll(kept: GeoPoint[], next: GeoPoint[]): boolean {
  const rect = fitRect(kept)
  if (!rect) return next.length === 0
  return next.every((place) => {
    const p = toWorld(place)
    // The copy of the world that puts the place nearest the rectangle's middle.
    const x = p.x + Math.round(rect.x + rect.width / 2 - p.x)
    return x >= rect.x && x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height
  })
}

/** `rect` grown about its centre to the screen's shape (`aspect` is width over height), so nothing stretches. */
export function toAspect(rect: WorldRect, aspect: number): WorldRect {
  const width = rect.width / rect.height < aspect ? rect.height * aspect : rect.width
  const height = rect.width / rect.height < aspect ? rect.height : rect.width / aspect
  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2
  return normalized({ x: centerX - width / 2, y: centerY - height / 2, width, height })
}

/** Room the view keeps clear for a panel over the map, in px from each edge (Stage 2 spec §10). */
export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 }

/** With less clear map than this either way, the insets are ignored and the trip fills the whole view. */
export const MIN_CLEAR_PX = 120

/**
 * The rectangle a `width` × `height` view shows so that `rect`, grown to the clear part's shape, fills the part the
 * insets leave clear: a panel over the map then hides no route (Stage 2 spec §10). Without room for that, `toAspect`.
 */
export function fitClear(rect: WorldRect, width: number, height: number, insets: Insets = NO_INSETS): WorldRect {
  const clearWidth = width - insets.left - insets.right
  const clearHeight = height - insets.top - insets.bottom
  if (clearWidth < MIN_CLEAR_PX || clearHeight < MIN_CLEAR_PX) return toAspect(rect, width / height)
  const clear = toAspect(rect, clearWidth / clearHeight)
  const perPixel = clear.width / clearWidth
  return normalized({
    x: clear.x - insets.left * perPixel,
    y: clear.y - insets.top * perPixel,
    width: width * perPixel,
    height: height * perPixel,
  })
}

/** The room, in px, kept round the pilot's marker when the view slides to show it (the app's card framing design §4.2). */
export const SLIDE_MARGIN = 8

/**
 * The view `rect` slid the shortest way, along each axis on its own, that shows a marker of `radius` px at the first of
 * `marks`, where `rect` puts it, with `margin` round it, inside the part of the view `insets` leave clear: between the
 * card's chips and under the latest event's banner, or beside the full map's panel. The camera frames the trip there
 * first when there's room; this keeps the marker in view when there isn't. It never zooms, and a marker larger than the
 * clear part is centred in it.
 *
 * The other marks, the real plane's ghost, pull the view on toward showing them too, but no further than a marker and
 * its margin, and never so far that the first leaves the clear part: the view moves smoothly as a ghost draws away, and
 * one off the view as framed, as after the real plane left the planned arc, doesn't move it at all (the review's fixes).
 *
 * It slides by whole pixels, rounded up so the marker is fully in, so a plane moving a little each second moves the
 * camera only once it has moved a pixel; under half a pixel, as a hair of rounding, it doesn't slide at all.
 */
export function slideToShow(
  rect: WorldRect, width: number, height: number, marks: readonly { x: number; y: number }[], radius: number, insets: Insets = NO_INSETS,
  margin = SLIDE_MARGIN,
): WorldRect {
  if (marks.length === 0) return rect
  const r = radius + margin
  const [first, ...rest] = marks
  const others = rest.filter((m) => m.x >= 0 && m.x <= width && m.y >= 0 && m.y <= height)
  const along = (at: number, more: number[], low: number, high: number) => {
    if (high - low < 2 * r) return (low + high) / 2 - at
    // Any slide from `least` to `most` shows the first mark. Its own is the shortest.
    const [least, most] = [low + r - at, high - r - at]
    const own = Math.max(least, Math.min(0, most))
    if (more.length === 0) return own
    // The slide nearest its own that shows the others, which they pull it toward by a marker and its margin at most.
    const theirs = Math.max(low + r - Math.min(...more), Math.min(own, high - r - Math.max(...more)))
    return Math.max(least, Math.min(most, own + Math.max(-r, Math.min(r, theirs - own))))
  }
  const whole = (px: number) => (Math.abs(px) < 0.5 ? 0 : px > 0 ? Math.ceil(px) : Math.floor(px))
  const dx = whole(along(first.x, others.map((m) => m.x), insets.left, width - insets.right))
  const dy = whole(along(first.y, others.map((m) => m.y), insets.top, height - insets.bottom))
  if (dx === 0 && dy === 0) return rect
  const perPixel = rect.width / width
  return normalized({ ...rect, x: rect.x - dx * perPixel, y: rect.y - dy * perPixel })
}
