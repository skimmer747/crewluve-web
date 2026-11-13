# Moving Map Stage 1B (Crewluve Website) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the website the trip map the app has (plan 1A), drawn by the site itself in SVG:
- the whole trip on the ground, with a heart where the pilot is;
- the next trip from home;
- the schedule's plane in the air;
- a full-screen page at `#map` that replays the trip.

**Architecture:**
- **The app's tested logic, ported to TypeScript:** `NightShade`, `PlaneHeading`, the date-line camera fit, great circles, the schedule's plane, the trip model, the drawing, the replay clock and the wording. The app's shared schedule cases are copied in.
- **The world:** land outlines from a small bundled Natural Earth file, on an ocean colour, in Web Mercator.
- **Components:** an SVG drawing component, the card on the status page, and the `#map` page.
- **Security:** no third-party code and no new address, so the Content-Security-Policy in `vite.config.ts` doesn't change.

**Tech Stack:** Preact 10, TypeScript 5.9, Vite 5, Vitest 3 with `@testing-library/preact` and happy-dom.

**Spec:** `~/Dev/Crewluv/docs/superpowers/specs/2026-11-13-crewluve-moving-map-design.md`. Stage 1 for the website covers §5, §6, §7.1–§7.3, §11 and §12–§15, without facts or live data. §9.7 and §11 record the decision to draw the map here and not use MapKit JS. The app's plan, which this one mirrors, is `~/Dev/Crewluv/docs/superpowers/plans/2026-11-13-moving-map-stage1a-app.md`. Its "Changes made during execution" section is the reference for every rule ported here.

---

## Ground rules

1. **Running tests here is fine,** unlike the app.
   - Run them with `npx vitest run <file>` and type-check with `npx tsc --noEmit`.
   - Before asking to commit, run `npm test` and `npm run build`. Both must pass.
2. **Never commit without Todd's go-ahead in the conversation.**
   - Each task ends with a suggested message in this repo's style: a plain sentence, with no `feat:` prefix.
   - Never push. Pushing to `main` deploys the site.
3. **Downloading anything needs Todd's OK first.** That includes Task 11's Natural Earth file and any `npm install`. This plan adds no dependency.
4. **Keep to the site's rules:**
   - every `fetch` is a plain GET to the site itself (`tests/fixtures/sourceScan.ts`);
   - no `innerHTML`;
   - comments say what and why in plain words, citing the spec as "moving map spec §N".
5. **Times are the family's own,** in `viewerTz`, through `shortTimeText(ms, zone, h24)`, which honours the 24-hour setting. "There" times use the airport's zone from `airports.tz(code)`.

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/time/sun.ts` | modify | add `subsolarPoint(t)` |
| `src/map/greatCircle.ts` | create | `GeoPoint`, distances, points along the shortest path |
| `src/map/mercator.ts` | create | `toWorld`, `unwrapped`, `MAX_LATITUDE` |
| `src/map/nightShade.ts` | create | night as fillable shapes (the app's `NightShade`) |
| `src/map/planeHeading.ts` | create | which way the plane points |
| `src/map/mapFit.ts` | create | the camera rectangle, the short way across the date line, and its aspect |
| `src/map/flightProgress.ts` | create | the schedule's plane: taxi allowances |
| `src/map/tripMap.ts` | create | the trip map model: legs, mode, where the pilot is |
| `src/map/tripMapFor.ts` | create | picks the trip's legs from the snapshot |
| `src/map/tripMapDrawing.ts` | create | lines, airports, cars, plane and heart at an instant |
| `src/map/replayClock.ts` | create | live, scrubbed or playing time |
| `src/map/land.ts` | create | reads `public/data/land.json` |
| `src/map/svgPaths.ts` | create | world shapes and lines as SVG paths in a viewport, with world copies |
| `src/copy/tripMap.ts` | create | every sentence the map shows or speaks |
| `scripts/build-land.mjs`, `public/data/land.json` | create | Natural Earth 1:110m land, trimmed |
| `src/ui/hooks/useLand.ts` | create | loads the land once |
| `src/ui/hooks/useTripMapPage.ts` | create | `#map` routing, like `useSchedulePage` |
| `src/ui/hooks/useFrameClock.ts` | create | animation-frame time while a replay plays |
| `src/ui/TripMapSvg.tsx` | create | the drawing |
| `src/ui/TripMapCard.tsx` | create | the card |
| `src/ui/TripMapPage.tsx`, `src/ui/TripTimeline.tsx` | create | the full-screen page and its timeline |
| `src/styles/tripMap.css` | create | the map's colours and layout |
| `src/ui/StatusScreen.tsx`, `src/ui/PilotPages.tsx`, `src/ui/InFlightCard.tsx`, `src/ui/inFlightFacts.ts` | modify | placement, routing, the in-flight fallback |
| `src/ui/FlightMap.tsx`, `src/ui/flightMapGeometry.ts`, `src/ui/flightSky.ts` and their tests | delete | replaced |
| `tests/map/*`, `tests/copy/tripMap.test.ts`, `tests/ui/TripMap*.test.tsx`, `tests/fixtures/trip-map/progress-cases.json` | create | tests and the shared cases |
| `README.md` | modify | the trip map, `npm run land` |

---

### Task 1: The branch

- [ ] **Step 1:** Branch from `main`:

```bash
git -C "/Users/toddanderson/Dev/Crewluve Website" switch -c trip-map
```

  Expected: `Switched to a new branch 'trip-map'`.

---

### Task 2: The subsolar point

**Files:**
- Modify: `src/time/sun.ts`, adding after `sunAltitude`.
- Test: `tests/map/subsolar.test.ts`.

- [ ] **Step 1: Write the failing test.** Create `tests/map/subsolar.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { subsolarPoint, sunAltitude } from '../../src/time/sun'

const utc = (y: number, mo: number, d: number, h: number, mi = 0) => Date.UTC(y, mo - 1, d, h, mi)
const degrees = (r: number) => (r * 180) / Math.PI

describe('subsolarPoint (moving map spec §7.1)', () => {
  it('is over the Tropic of Cancer at the June solstice', () => {
    expect(degrees(subsolarPoint(utc(2026, 6, 21, 8, 24)).declination)).toBeCloseTo(23.44, 1)
  })

  it('is over the equator at the March equinox', () => {
    expect(degrees(subsolarPoint(utc(2026, 3, 20, 14, 46)).declination)).toBeCloseTo(0, 1)
  })

  it('is a few degrees west of Greenwich at noon UTC in mid-October, when the sun runs 14 minutes ahead', () => {
    expect(Math.abs(subsolarPoint(utc(2026, 10, 15, 12)).longitude + 3.55)).toBeLessThan(0.2)
  })

  it('keeps its longitude within the map all year', () => {
    for (let h = 0; h < 24 * 365; h += 7) {
      expect(Math.abs(subsolarPoint(utc(2026, 1, 1, 0) + h * 3_600_000).longitude)).toBeLessThanOrEqual(180)
    }
  })

  it('has the sun straight up above it', () => {
    const t = utc(2026, 11, 13, 17)
    const sun = subsolarPoint(t)
    expect(sunAltitude(t, degrees(sun.declination), sun.longitude)).toBeGreaterThan(89.99)
  })
})
```

- [ ] **Step 2: Run it to see it fail.** Run `npx vitest run tests/map/subsolar.test.ts`. Expected: FAIL, because `subsolarPoint` is not exported.

- [ ] **Step 3: Implement.** In `src/time/sun.ts`, after `sunAltitude`, add:

```ts
/**
 * The point on the earth with the sun straight overhead at `t`, for the trip map's night (moving map spec §7.1): its
 * latitude (the sun's declination) in radians, and its longitude in degrees, east positive, within -180…180. It's the
 * point where `sunAltitude`'s hour angle is zero, from the same NOAA position.
 */
export function subsolarPoint(t: number): { declination: number; longitude: number } {
  const { declination, equationOfTime } = solarPosition(t)
  const utcMinutes = (((t % DAY) + DAY) % DAY) / MINUTE
  let longitude = 180 - (utcMinutes + equationOfTime) / 4
  while (longitude > 180) longitude -= 360
  while (longitude < -180) longitude += 360
  return { declination: rad(declination), longitude }
}
```

- [ ] **Step 4: Run it to see it pass.** Run `npx vitest run tests/map/subsolar.test.ts`. Expected: PASS.

- [ ] **Step 5: Ask to commit.** Suggested message: `The sun's subsolar point, for the trip map's night (moving map spec §7.1)`

---

### Task 3: Great circles and the flat map

**Files:**
- Create: `src/map/greatCircle.ts`, `src/map/mercator.ts`.
- Test: `tests/map/greatCircle.test.ts`, `tests/map/mercator.test.ts`.

- [ ] **Step 1: Write the failing tests.** Create `tests/map/greatCircle.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { distanceMeters, pointAlong, pointsAlong, type GeoPoint } from '../../src/map/greatCircle'

const JFK: GeoPoint = { lat: 40.6413, lng: -73.7781 }
const LHR: GeoPoint = { lat: 51.47, lng: -0.4543 }
const ANC: GeoPoint = { lat: 61.1743, lng: -149.9963 }
const NRT: GeoPoint = { lat: 35.772, lng: 140.3929 }

// Expected values were worked out independently on the same sphere (radius 6,371,008.8 m).
describe('great circles (moving map spec §7.1)', () => {
  it('puts New York about 5,540 km from London, either way', () => {
    expect(distanceMeters(JFK, LHR) / 1000).toBeCloseTo(5540.02, 1)
    expect(distanceMeters(LHR, JFK)).toBeCloseTo(distanceMeters(JFK, LHR), 3)
    expect(distanceMeters(JFK, JFK)).toBe(0)
  })

  it('starts and ends at the airports, and holds fractions outside the leg at its ends', () => {
    expect(pointAlong(JFK, LHR, 0).lat).toBeCloseTo(JFK.lat, 9)
    expect(pointAlong(JFK, LHR, 1).lng).toBeCloseTo(LHR.lng, 9)
    expect(pointAlong(JFK, LHR, -0.5).lat).toBeCloseTo(JFK.lat, 9)
    expect(pointAlong(JFK, LHR, 1.5).lng).toBeCloseTo(LHR.lng, 9)
  })

  it('curves north over the Atlantic halfway to London', () => {
    const middle = pointAlong(JFK, LHR, 0.5)
    expect(middle.lat).toBeCloseTo(52.2167, 3)
    expect(middle.lng).toBeCloseTo(-41.3027, 3)
  })

  it('crosses the date line the short way from Anchorage to Tokyo', () => {
    const middle = pointAlong(ANC, NRT, 0.5)
    expect(middle.lat).toBeCloseTo(53.557, 3)
    expect(middle.lng).toBeCloseTo(165.165, 3)
  })

  it('gives the count asked for, with both ends, and never fewer than two', () => {
    const points = pointsAlong(JFK, LHR, 33)
    expect(points).toHaveLength(33)
    expect(points[32].lng).toBeCloseTo(LHR.lng, 9)
    expect(pointsAlong(JFK, LHR, 1)).toHaveLength(2)
    expect(pointAlong(JFK, JFK, 0.5)).toEqual(JFK)
  })
})
```

Create `tests/map/mercator.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MAX_LATITUDE, toWorld, unwrapped } from '../../src/map/mercator'

describe('the flat map (moving map spec §11)', () => {
  it('puts 0°, 0° in the middle and the date line at the edges', () => {
    expect(toWorld({ lat: 0, lng: 0 }).x).toBe(0.5)
    expect(toWorld({ lat: 0, lng: 0 }).y).toBeCloseTo(0.5, 12)
    expect(toWorld({ lat: 0, lng: 180 }).x).toBe(1)
    expect(toWorld({ lat: 0, lng: -180 }).x).toBe(0)
  })

  it('ends at 85.05° north and south, and holds the poles there', () => {
    expect(toWorld({ lat: MAX_LATITUDE, lng: 0 }).y).toBeCloseTo(0, 3)
    expect(toWorld({ lat: 90, lng: 0 }).y).toBe(toWorld({ lat: MAX_LATITUDE, lng: 0 }).y)
    expect(toWorld({ lat: -MAX_LATITUDE, lng: 0 }).y).toBeCloseTo(1, 3)
  })

  it('lays a line across the date line out in one piece', () => {
    expect(unwrapped([{ x: 0.98, y: 0.3 }, { x: 0.02, y: 0.3 }, { x: 0.05, y: 0.3 }]).map((p) => p.x)).toEqual([0.98, 1.02, 1.05])
  })
})
```

- [ ] **Step 2: Run them to see them fail.** Run `npx vitest run tests/map/greatCircle.test.ts tests/map/mercator.test.ts`. Expected: FAIL, because the modules don't exist.

- [ ] **Step 3: Implement.** Create `src/map/greatCircle.ts`:

```ts
/** A place on the earth, in degrees: latitude, and longitude east positive. */
export interface GeoPoint {
  lat: number
  lng: number
}

/** The earth's mean radius, in meters. */
export const EARTH_RADIUS_M = 6_371_008.8

/** One statute mile, in meters. Families think in miles (moving map spec §8.3). */
export const METERS_PER_MILE = 1_609.344

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** The angle between two places seen from the earth's centre, in radians. The haversine form stays exact for short hops. */
function centralAngle(a: GeoPoint, b: GeoPoint): number {
  const latChange = rad(b.lat - a.lat)
  const lngChange = rad(b.lng - a.lng)
  const h = Math.sin(latChange / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(lngChange / 2) ** 2
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

const vector = (p: GeoPoint) => ({
  x: Math.cos(rad(p.lat)) * Math.cos(rad(p.lng)),
  y: Math.cos(rad(p.lat)) * Math.sin(rad(p.lng)),
  z: Math.sin(rad(p.lat)),
})

/** The distance between two places along the earth's surface, in meters. */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  return EARTH_RADIUS_M * centralAngle(a, b)
}

/**
 * The place `fraction` of the way from `a` to `b` along the shortest path. A fraction outside 0…1 is held at the nearer
 * end. Two places on exactly opposite sides of the earth have no single shortest path; no leg is ever that long.
 */
export function pointAlong(a: GeoPoint, b: GeoPoint, fraction: number): GeoPoint {
  const share = Math.min(Math.max(fraction, 0), 1)
  const angle = centralAngle(a, b)
  if (angle <= 1e-9) return a
  const weightOfA = Math.sin((1 - share) * angle) / Math.sin(angle)
  const weightOfB = Math.sin(share * angle) / Math.sin(angle)
  const va = vector(a)
  const vb = vector(b)
  const x = weightOfA * va.x + weightOfB * vb.x
  const y = weightOfA * va.y + weightOfB * vb.y
  const z = weightOfA * va.z + weightOfB * vb.z
  return { lat: deg(Math.atan2(z, Math.hypot(x, y))), lng: deg(Math.atan2(y, x)) }
}

/** `count` evenly spaced places from `a` to `b`, both ends included. Never fewer than two. */
export function pointsAlong(a: GeoPoint, b: GeoPoint, count: number): GeoPoint[] {
  const total = Math.max(count, 2)
  return Array.from({ length: total }, (_, i) => pointAlong(a, b, i / (total - 1)))
}
```

Create `src/map/mercator.ts`:

```ts
import type { GeoPoint } from './greatCircle'

/** The flat map ends at this latitude, north and south, as Apple's does in the app (moving map spec §11). */
export const MAX_LATITUDE = 85.05

/**
 * A place on the flat (Web Mercator) map: x runs from 0 at 180°W to 1 at 180°E, y from 0 at the top edge to 1 at the
 * bottom. One world is 1 by 1. An x outside 0…1 is the same place on another copy of the world.
 */
export interface WorldPoint {
  x: number
  y: number
}

export function toWorld(p: GeoPoint): WorldPoint {
  const lat = (Math.min(Math.max(p.lat, -MAX_LATITUDE), MAX_LATITUDE) * Math.PI) / 180
  return { x: (p.lng + 180) / 360, y: (1 - Math.log(Math.tan(Math.PI / 4 + lat / 2)) / Math.PI) / 2 }
}

/**
 * A line laid out in one piece: each point moved by whole worlds to sit within half a world of the one before. A leg
 * across the date line runs on past the map's edge, and doesn't jump back across the whole map.
 */
export function unwrapped(points: WorldPoint[]): WorldPoint[] {
  const laid: WorldPoint[] = []
  for (const p of points) {
    const before = laid[laid.length - 1]
    laid.push(before ? { x: p.x + Math.round(before.x - p.x), y: p.y } : p)
  }
  return laid
}
```

- [ ] **Step 4: Run them to see them pass.** Run the same command. Expected: PASS.

- [ ] **Step 5: Ask to commit.** Suggested message: `Great circles and the flat map, for the trip map (moving map spec §7.1, §11)`

---

### Task 4: Night shapes

This ports `Crewluv/Utils/NightShade.swift`, which in turn came from CrewLu. The tests check the shapes against `sunAltitude`, which uses the same NOAA position as `subsolarPoint`.

**Files:**
- Create: `src/map/nightShade.ts`.
- Test: `tests/map/nightShade.test.ts`.

- [ ] **Step 1: Write the failing test.** Create `tests/map/nightShade.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { GeoPoint } from '../../src/map/greatCircle'
import { MAX_LATITUDE } from '../../src/map/mercator'
import { nightLayers, nightRegion, SUN_DEPTHS } from '../../src/map/nightShade'
import { subsolarPoint, sunAltitude } from '../../src/time/sun'

const utc = (y: number, mo: number, d: number, h: number, mi = 0) => Date.UTC(y, mo - 1, d, h, mi)
const DATES: [number, number, number][] = [[2026, 3, 20], [2026, 6, 21], [2026, 9, 23], [2026, 11, 15], [2026, 12, 21], [2026, 2, 10], [2026, 5, 1]]

// The tests keep their own flat-map y, so they fill the shapes the way the map does without leaning on code under test.
const flatY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
type Edge = [ya: number, xa: number, yb: number, xb: number]

function edgesOf(shapes: GeoPoint[][]): Edge[] {
  const edges: Edge[] = []
  for (const shape of shapes) {
    const ys = shape.map((p) => flatY(p.lat))
    shape.forEach((p, i) => {
      const next = (i + 1) % shape.length
      edges.push([ys[i], p.lng, ys[next], shape[next].lng])
    })
  }
  return edges
}

/** Where the edges cross one line of latitude, west to east. */
const crossings = (edges: Edge[], y: number) =>
  edges.filter(([ya, , yb]) => ya > y !== yb > y).map(([ya, xa, yb, xb]) => xa + ((y - ya) / (yb - ya)) * (xb - xa)).sort((a, b) => a - b)

/** A place is inside when an odd number of edges lie to its east. */
const shadedAt = (lng: number, cross: number[]) => cross.filter((c) => c > lng).length % 2 === 1
const isShaded = (lat: number, lng: number, shapes: GeoPoint[][]) => shadedAt(lng, crossings(edgesOf(shapes), flatY(lat)))
const night = (t: number) => {
  const sun = subsolarPoint(t)
  return nightRegion(0, sun.declination, sun.longitude)
}
const steps = (from: number, to: number, by: number, offset: number) => {
  const out: number[] = []
  for (let v = from; v < to; v += by) out.push(v + offset)
  return out
}

describe('night shapes (moving map spec §7.1)', () => {
  it('shade exactly where the sun is below each layer, every hour of seven dates', () => {
    const latitudes = steps(-84, 84, 6, 0.37)
    const longitudes = steps(-180, 180, 6, 0.41)
    let checked = 0
    let wrong = 0
    for (const [y, m, d] of DATES) {
      for (let hour = 0; hour < 24; hour++) {
        const t = utc(y, m, d, hour, 17)
        const sun = subsolarPoint(t)
        for (const depth of SUN_DEPTHS) {
          const edges = edgesOf(nightRegion(depth, sun.declination, sun.longitude))
          for (const lat of latitudes) {
            const cross = crossings(edges, flatY(lat))
            for (const lng of longitudes) {
              const altitude = sunAltitude(t, lat, lng)
              if (Math.abs(altitude + depth) < 0.3) continue
              checked++
              if (shadedAt(lng, cross) !== altitude < -depth) wrong++
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1_500_000)
    expect(wrong).toBe(0)
  })

  it('stay inside the map, with no edge across the date line', () => {
    for (const [y, m, d] of DATES) {
      for (let hour = 0; hour < 24; hour++) {
        const layers = nightLayers(utc(y, m, d, hour, 17))
        expect(layers).toHaveLength(SUN_DEPTHS.length)
        for (const shapes of layers) {
          expect(shapes.length === 1 || shapes.length === 2).toBe(true)
          for (const shape of shapes) {
            expect(shape.length).toBeGreaterThanOrEqual(3)
            shape.forEach((p, i) => {
              const next = shape[(i + 1) % shape.length]
              expect(Math.abs(p.lat)).toBeLessThanOrEqual(MAX_LATITUDE)
              expect(Math.abs(p.lng)).toBeLessThanOrEqual(180)
              expect(Math.abs(next.lng - p.lng)).toBeLessThan(180)
            })
          }
        }
      }
    }
  })

  it('shade polar night all the way round', () => {
    const december = night(utc(2026, 12, 21, 12))
    const june = night(utc(2026, 6, 21, 12))
    for (let lng = -179.5; lng < 180; lng += 30) {
      expect(isShaded(80, lng, december)).toBe(true)
      expect(isShaded(-80, lng, december)).toBe(false)
      expect(isShaded(-80, lng, june)).toBe(true)
      expect(isShaded(80, lng, june)).toBe(false)
    }
  })

  it('shade the far half when the sun is over the equator at Greenwich', () => {
    const shapes = nightRegion(0, 0, 0)
    expect(shapes).toHaveLength(1)
    expect(isShaded(10, 179, shapes)).toBe(true)
    expect(isShaded(10, -179, shapes)).toBe(true)
    expect(isShaded(10, 95, shapes)).toBe(true)
    expect(isShaded(10, 0, shapes)).toBe(false)
    expect(isShaded(10, 85, shapes)).toBe(false)
  })

  it('nest, each deeper layer inside the one before', () => {
    const latitudes = steps(-84, 84, 7, 0.37)
    const longitudes = steps(-180, 180, 7, 0.41)
    for (const t of [utc(2026, 3, 20, 9, 17), utc(2026, 6, 21, 3, 17), utc(2026, 11, 15, 13, 51), utc(2026, 12, 21, 22, 17)]) {
      const layers = nightLayers(t).map(edgesOf)
      for (const lat of latitudes) {
        const rows = layers.map((edges) => crossings(edges, flatY(lat)))
        for (const lng of longitudes) {
          for (let deeper = 1; deeper < rows.length; deeper++) {
            if (shadedAt(lng, rows[deeper])) expect(shadedAt(lng, rows[deeper - 1])).toBe(true)
          }
        }
      }
    }
  })
})
```

- [ ] **Step 2: Run it to see it fail.** Run `npx vitest run tests/map/nightShade.test.ts`. Expected: FAIL, because the module doesn't exist.

- [ ] **Step 3: Implement.** Create `src/map/nightShade.ts`:

```ts
import { subsolarPoint } from '../time/sun'
import type { GeoPoint } from './greatCircle'
import { MAX_LATITUDE } from './mercator'

/**
 * Where it is night on the flat map, as shapes to fill (moving map spec §7.1): the app's NightShade, from CrewLu's
 * moving map. The dark area for a given sun depth is everything within a set distance of the point opposite the sun.
 * On any one line of longitude that's a single stretch of latitude, so each shape is built a line at a time and no edge
 * crosses the date line.
 */

/** How far below the horizon the sun is at each layer's edge, in degrees: sunset to the end of astronomical twilight. */
export const SUN_DEPTHS = [0, 3, 6, 9, 12, 15, 18] as const

/** One layer's opacity. Seven stacked reach 42%, with a soft edge. */
export const LAYER_ALPHA = 0.075

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI
const clampLatitude = (lat: number) => Math.min(Math.max(lat, -MAX_LATITUDE), MAX_LATITUDE)

/** One layer per sun depth for the sun at `t`. Each layer is one or two closed shapes. */
export function nightLayers(t: number): GeoPoint[][][] {
  const sun = subsolarPoint(t)
  return SUN_DEPTHS.map((depth) => nightRegion(depth, sun.declination, sun.longitude))
}

/**
 * The area where the sun is more than `sunDepth` degrees down, as one or two closed shapes. `declination` is in radians
 * and `subsolarLongitude` in degrees, as `subsolarPoint` gives them.
 */
export function nightRegion(sunDepth: number, declination: number, subsolarLongitude: number): GeoPoint[][] {
  const centerLat = -declination
  let centerLng = subsolarLongitude + 180
  while (centerLng >= 180) centerLng -= 360
  while (centerLng < -180) centerLng += 360
  // The cosine of the dark area's radius: zero at sunset, when the area is exactly half the earth.
  const reach = Math.sin(rad(sunDepth))

  const shape = (lngs: number[], shift: number): GeoPoint[] => {
    const stretches = lngs.map((lng) => ({ lng: lng + shift, ...darkStretch(centerLat, centerLng, reach, lng) }))
    const north = stretches.map((s) => ({ lat: s.north, lng: s.lng }))
    const south = [...stretches].reverse().map((s) => ({ lat: s.south, lng: s.lng }))
    return [...north, ...south]
  }

  // The dark area reaches a pole: every line of longitude has a stretch, so the shape spans the whole map.
  if (Math.abs(Math.sin(centerLat)) >= reach) {
    return [shape(Array.from({ length: 361 }, (_, i) => -180 + i), 0)]
  }

  // Otherwise it's a rounded blob, its lines of longitude crowded towards the ends so the ends stay round.
  const squeeze = (reach * reach - Math.sin(centerLat) ** 2) / Math.cos(centerLat) ** 2
  const halfWidth = deg(Math.acos(Math.sqrt(Math.min(1, Math.max(0, squeeze)))))
  const lngs: number[] = []
  for (let s = -90; s <= 90; s += 2) lngs.push(centerLng + halfWidth * Math.sin(rad(s)))
  // A blob over the date line is cut there into two shapes, each with an exact edge on the line.
  if (lngs[lngs.length - 1] > 180) {
    return [shape([...lngs.filter((l) => l < 180), 180], 0), shape([180, ...lngs.filter((l) => l > 180)], -360)]
  }
  if (lngs[0] < -180) {
    return [shape([...lngs.filter((l) => l < -180), -180], 360), shape([-180, ...lngs.filter((l) => l > -180)], 0)]
  }
  return [shape(lngs, 0)]
}

/** The dark stretch of one line of longitude, its south and north ends in degrees, held to the map. */
function darkStretch(centerLat: number, centerLng: number, reach: number, lng: number): { south: number; north: number } {
  const a = Math.sin(centerLat)
  const b = Math.cos(centerLat) * Math.cos(rad(lng - centerLng))
  const size = Math.max(Math.hypot(a, b), 1e-12)
  const middle = deg(Math.atan2(a, b))
  const halfHeight = deg(Math.acos(Math.min(1, Math.max(-1, reach / size))))
  return { south: clampLatitude(middle - halfHeight), north: clampLatitude(middle + halfHeight) }
}
```

- [ ] **Step 4: Run it to see it pass.** Run `npx vitest run tests/map/nightShade.test.ts`. Expected: PASS, with the first test taking a second or two.

- [ ] **Step 5: Ask to commit.** Suggested message: `Night as map shapes, ported from the app's trip map (moving map spec §7.1)`

---

### Task 5: Which way the plane points

**Files:**
- Create: `src/map/planeHeading.ts`.
- Test: `tests/map/planeHeading.test.ts`.

- [ ] **Step 1: Write the failing test.** Create `tests/map/planeHeading.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { aimFractions, continuing, flatMapAngle, shortestTurn } from '../../src/map/planeHeading'

const DEG = Math.PI / 180

describe('plane heading (moving map spec §7.2)', () => {
  it('aims just ahead of the plane, and along the last stretch near the end', () => {
    expect(aimFractions(0.3, 0.01).from).toBeCloseTo(0.3, 12)
    expect(aimFractions(0.3, 0.01).to).toBeCloseTo(0.31, 12)
    expect(aimFractions(0.998, 0.005).from).toBeCloseTo(0.995, 12)
    expect(aimFractions(0.998, 0.005).to).toBe(1)
    expect(aimFractions(-0.2, 0.005)).toEqual({ from: 0, to: 0.005 })
  })

  it('turns the short way round past due west, never more than half a turn', () => {
    expect(shortestTurn(170 * DEG, -170 * DEG)).toBeCloseTo(20 * DEG, 9)
    expect(shortestTurn(-170 * DEG, 170 * DEG)).toBeCloseTo(-20 * DEG, 9)
    for (let from = -10; from <= 10; from += 0.7) {
      for (let to = -10; to <= 10; to += 0.9) expect(Math.abs(shortestTurn(from, to))).toBeLessThanOrEqual(Math.PI + 1e-12)
    }
    const next = continuing(3, -3)
    expect(Math.abs(next - 3)).toBeLessThanOrEqual(Math.PI)
    expect(Math.cos(next)).toBeCloseTo(Math.cos(-3), 12)
  })

  it('points east right, north up and south down on a north-up map', () => {
    expect(flatMapAngle({ lat: 0, lng: 0 }, { lat: 0, lng: 10 })).toBeCloseTo(0, 12)
    expect(flatMapAngle({ lat: 0, lng: 0 }, { lat: 10, lng: 0 })).toBeCloseTo(-Math.PI / 2, 12)
    expect(flatMapAngle({ lat: 0, lng: 0 }, { lat: -10, lng: 0 })).toBeCloseTo(Math.PI / 2, 12)
  })

  it('gives the same angle across the date line as anywhere else, none for one place, and a number at a pole', () => {
    expect(flatMapAngle({ lat: 50, lng: 179 }, { lat: 51, lng: -179 })).toBeCloseTo(flatMapAngle({ lat: 50, lng: -1 }, { lat: 51, lng: 1 })!, 12)
    expect(flatMapAngle({ lat: 38, lng: -85 }, { lat: 38, lng: -85 })).toBeNull()
    expect(Number.isFinite(flatMapAngle({ lat: 90, lng: 0 }, { lat: 89, lng: 10 }))).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to see it fail.** Run `npx vitest run tests/map/planeHeading.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.** Create `src/map/planeHeading.ts`:

```ts
import type { GeoPoint } from './greatCircle'

/**
 * Which way the trip map's plane points (moving map spec §7.2), as in the app. The map always faces north, so the angle
 * comes from the coordinates alone. Angles are in radians as the screen draws them: 0 points right (east) and a quarter
 * turn points down (south).
 */

/** How far ahead along the leg the plane is aimed, as a share of the leg. */
export const LOOK_AHEAD = 0.005

/** The two places on a leg to aim between at `fraction` of the way along. Near the end it aims along the last stretch. */
export function aimFractions(fraction: number, lookAhead = LOOK_AHEAD): { from: number; to: number } {
  const here = Math.min(Math.max(fraction, 0), 1)
  if (here + lookAhead <= 1) return { from: here, to: here + lookAhead }
  return { from: Math.max(1 - lookAhead, 0), to: 1 }
}

/** The smallest turn from the angle `from` to the angle `to`: never more than half a turn either way. */
export function shortestTurn(from: number, to: number): number {
  let turn = (to - from) % (2 * Math.PI)
  if (turn > Math.PI) turn -= 2 * Math.PI
  if (turn < -Math.PI) turn += 2 * Math.PI
  return turn
}

/** `target` moved by whole turns to sit the short way round from `previous`, so an animated turn never spins the long way. */
export function continuing(previous: number, target: number): number {
  return previous + shortestTurn(previous, target)
}

const flatY = (lat: number) => {
  const held = Math.min(Math.max(lat, -89.9), 89.9)
  return Math.log(Math.tan(Math.PI / 4 + (held * Math.PI) / 360))
}

/** The direction from one place to another on a north-up flat map, or null when they're the same place. */
export function flatMapAngle(from: GeoPoint, to: GeoPoint): number | null {
  let east = to.lng - from.lng
  if (east > 180) east -= 360
  if (east < -180) east += 360
  const dx = (east * Math.PI) / 180
  const north = flatY(to.lat) - flatY(from.lat)
  if (dx === 0 && north === 0) return null
  // The screen's y grows downward, so north is up the screen.
  return Math.atan2(-north, dx)
}
```

- [ ] **Step 4: Run it to see it pass.** Run the same command. Expected: PASS.

- [ ] **Step 5: Ask to commit.** Suggested message: `Which way the trip map's plane points (moving map spec §7.2)`

---

### Task 6: The camera's rectangle

**Files:**
- Create: `src/map/mapFit.ts`.
- Test: `tests/map/mapFit.test.ts`.

- [ ] **Step 1: Write the failing test.** Create `tests/map/mapFit.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { fitRect, MIN_SIDE, toAspect, type WorldRect } from '../../src/map/mapFit'
import { toWorld } from '../../src/map/mercator'

const SDF = { lat: 38.1744, lng: -85.736 }
const CGN = { lat: 50.8659, lng: 7.1427 }
const ANC = { lat: 61.1743, lng: -149.9963 }
const NRT = { lat: 35.772, lng: 140.3929 }
const holds = (r: WorldRect, p: { x: number; y: number }) => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height

describe('the camera rectangle (moving map spec §6, §12)', () => {
  it('is null for no places', () => {
    expect(fitRect([])).toBeNull()
  })

  it('holds Louisville and Cologne', () => {
    const r = fitRect([SDF, CGN])!
    expect(holds(r, toWorld(SDF))).toBe(true)
    expect(holds(r, toWorld(CGN))).toBe(true)
  })

  it('frames the North Pacific, not the world, from Anchorage to Tokyo', () => {
    const r = fitRect([ANC, NRT], 0.1)!
    expect(r.width).toBeLessThan(0.25)
    expect(r.x + r.width).toBeGreaterThan(1)
    expect(holds(r, toWorld(NRT))).toBe(true)
    expect(holds(r, { x: toWorld(ANC).x + 1, y: toWorld(ANC).y })).toBe(true)
  })

  it('gives one place the smallest size, and never starts left of the date line', () => {
    const r = fitRect([SDF])!
    expect(r.width).toBeCloseTo(MIN_SIDE, 12)
    expect(r.x + r.width / 2).toBeCloseTo(toWorld(SDF).x, 12)
    expect(fitRect([{ lat: 20, lng: -179.9 }])!.x).toBeGreaterThanOrEqual(0)
  })

  it('grows the short side about the centre to the screen shape', () => {
    const r: WorldRect = { x: 0.2, y: 0.3, width: 0.1, height: 0.1 }
    const wide = toAspect(r, 2)
    expect(wide.width).toBeCloseTo(0.2, 12)
    expect(wide.height).toBeCloseTo(0.1, 12)
    expect(wide.x + wide.width / 2).toBeCloseTo(0.25, 12)
    expect(toAspect(r, 0.5).height).toBeCloseTo(0.2, 12)
  })
})
```

- [ ] **Step 2: Run it to see it fail.** Run `npx vitest run tests/map/mapFit.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.** Create `src/map/mapFit.ts`:

```ts
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

/** `rect` grown about its centre to the screen's shape (`aspect` is width over height), so nothing stretches. */
export function toAspect(rect: WorldRect, aspect: number): WorldRect {
  const width = rect.width / rect.height < aspect ? rect.height * aspect : rect.width
  const height = rect.width / rect.height < aspect ? rect.height : rect.width / aspect
  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2
  return normalized({ x: centerX - width / 2, y: centerY - height / 2, width, height })
}
```

- [ ] **Step 4: Run it to see it pass.** Run the same command. Expected: PASS.

- [ ] **Step 5: Ask to commit.** Suggested message: `The trip map camera's rectangle, the short way across the date line (moving map spec §6)`

---

### Task 7: The schedule's plane, held to the app's cases

**Files:**
- Create: `src/map/flightProgress.ts`.
- Create: `tests/fixtures/trip-map/progress-cases.json`, an exact copy of the app's.
- Test: `tests/map/flightProgress.test.ts`.

- [ ] **Step 1: Copy the shared cases.**

```bash
mkdir -p "/Users/toddanderson/Dev/Crewluve Website/tests/fixtures/trip-map" && cp /Users/toddanderson/Dev/Crewluv/CrewluvTests/Fixtures/TripMap/progress-cases.json "/Users/toddanderson/Dev/Crewluve Website/tests/fixtures/trip-map/progress-cases.json"
```

- [ ] **Step 2: Write the failing test.** Create `tests/map/flightProgress.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { airborneWindow, scheduledFraction, SHORTEST_CRUISE_MS, TAXI_IN_MS, TAXI_OUT_MS } from '../../src/map/flightProgress'

/** The app's shared cases (Crewluv's CrewluvTests/Fixtures/TripMap): change both copies together. */
interface Cases {
  constants: { taxiOutMinutes: number; taxiInMinutes: number; shortestCruiseMinutes: number }
  scheduleCases: { name: string; departure: string; arrival: string; at: string; fraction: number }[]
}
const cases = JSON.parse(readFileSync(new URL('../fixtures/trip-map/progress-cases.json', import.meta.url), 'utf8')) as Cases
const MINUTE = 60_000

describe("the schedule's plane (moving map spec §7.3, §15.1)", () => {
  it("uses the shared cases' allowances", () => {
    expect(TAXI_OUT_MS).toBe(cases.constants.taxiOutMinutes * MINUTE)
    expect(TAXI_IN_MS).toBe(cases.constants.taxiInMinutes * MINUTE)
    expect(SHORTEST_CRUISE_MS).toBe(cases.constants.shortestCruiseMinutes * MINUTE)
  })

  it.each(cases.scheduleCases)('$name', (c) => {
    expect(scheduledFraction(Date.parse(c.departure), Date.parse(c.arrival), Date.parse(c.at))).toBeCloseTo(c.fraction, 9)
  })

  it('has no airborne window when the arrival is no later than the departure', () => {
    expect(airborneWindow(1000, 1000)).toBeNull()
  })
})
```

- [ ] **Step 3: Run it to see it fail.** Run `npx vitest run tests/map/flightProgress.test.ts`. Expected: FAIL.

- [ ] **Step 4: Implement.** Create `src/map/flightProgress.ts`:

```ts
import { MINUTE } from '../time/zoned'

/**
 * Where the schedule says a flight is (moving map spec §7.3), as the app's FlightProgress. The constants are written
 * down in tests/fixtures/trip-map/progress-cases.json, a copy of the app's.
 */

/** The schedule's plane waits this long at the gate before it takes off. */
export const TAXI_OUT_MS = 15 * MINUTE
/** It lands this long before the scheduled gate arrival. */
export const TAXI_IN_MS = 7 * MINUTE
/** A block shorter than both allowances plus this is flown gate to gate, with no allowances. */
export const SHORTEST_CRUISE_MS = 10 * MINUTE

/** When the schedule's plane is in the air for a flight from `departure` to `arrival` (both delay-moved), or null when it arrives no later than it leaves. */
export function airborneWindow(departure: number, arrival: number): { start: number; end: number } | null {
  const block = arrival - departure
  if (block <= 0) return null
  if (block < TAXI_OUT_MS + TAXI_IN_MS + SHORTEST_CRUISE_MS) return { start: departure, end: arrival }
  return { start: departure + TAXI_OUT_MS, end: arrival - TAXI_IN_MS }
}

/** How far along its route the schedule's plane is at `t`: 0 at the departure airport, 1 at the arrival airport. */
export function scheduledFraction(departure: number, arrival: number, t: number): number {
  const window = airborneWindow(departure, arrival)
  if (!window) return t >= arrival ? 1 : 0
  return Math.min(Math.max((t - window.start) / (window.end - window.start), 0), 1)
}
```

- [ ] **Step 5: Run it to see it pass.** Run the same command. Expected: PASS, with every shared case passing.

- [ ] **Step 6: Ask to commit.** Suggested message: `The schedule's plane, held to the app's shared cases (moving map spec §7.3, §15.1)`

---

### Task 8: The trip map model, and which legs it shows

**Files:**
- Create: `src/map/tripMap.ts`, `src/map/tripMapFor.ts`.
- Create: `tests/map/tripMapLegs.ts`, the test helper.
- Test: `tests/map/tripMap.test.ts`, `tests/map/tripMapFor.test.ts`.

- [ ] **Step 1: Write the test helper.** Create `tests/map/tripMapLegs.ts`:

```ts
import { buildAirportIndex } from '../../src/data/airports'
import type { DriveLeg, MoveLeg } from '../../src/engine/legs'

/** Friday 2026-11-13 12:00 UTC (7:00 AM in Louisville). */
export const TRIP_START = Date.UTC(2026, 10, 13, 12)
export const HOUR = 3_600_000
export const at = (hours: number) => TRIP_START + hours * HOUR

export const AIRPORTS = buildAirportIndex([
  ['SDF', 'Louisville', 'US', 38.1744, -85.736, 'America/New_York', 'KY'],
  ['LEX', 'Lexington', 'US', 38.0365, -84.6059, 'America/New_York', 'KY'],
  ['CGN', 'Cologne', 'DE', 50.8659, 7.1427, 'Europe/Berlin'],
  ['DXB', 'Dubai', 'AE', 25.2532, 55.3657, 'Asia/Dubai'],
  ['ANC', 'Anchorage', 'US', 61.1743, -149.9963, 'America/Anchorage', 'AK'],
  ['NRT', 'Tokyo', 'JP', 35.772, 140.3929, 'Asia/Tokyo'],
])

export function flight(id: string, dep: string, arr: string, startHours: number, hours: number, tripId: string | null = 'T1'): MoveLeg {
  const start = at(startHours)
  const end = start + hours * HOUR
  return {
    kind: 'flight', id, tripId, dep, arr, start, end, schedStart: start, schedEnd: end,
    airline: '5X', enteredAirline: null, number: String(200 + Number(id.replace(/\D/g, '') || 0)), deadhead: false, ground: false,
  }
}

export function drive(id: string, from: string, to: string, startHours: number, hours: number): DriveLeg {
  const start = at(startHours)
  return { kind: 'drive', id, tripId: null, from, to, toHome: to === 'SDF', start, end: start + hours * HOUR, schedEnd: start + hours * HOUR }
}

/** SDF → CGN (8 h), a day in Cologne, CGN → DXB (6 h), 20 h in Dubai, DXB → SDF (14 h). */
export const EUROPE = [flight('f1', 'SDF', 'CGN', 0, 8), flight('f2', 'CGN', 'DXB', 32, 6), flight('f3', 'DXB', 'SDF', 58, 14)]
```

- [ ] **Step 2: Write the failing tests.** Create `tests/map/tripMap.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { pointAlong } from '../../src/map/greatCircle'
import { scheduledFraction } from '../../src/map/flightProgress'
import {
  currentLeg, framingPoints, headingAt, legInMotion, legProgress, makeTripMap, nextFlight, pilotLocation, positionAt,
} from '../../src/map/tripMap'
import { AIRPORTS, at, drive, EUROPE, flight } from './tripMapLegs'

const make = (legs = EUROPE, now = at(12), isNextTrip = false) => makeTripMap(legs, { isNextTrip, home: 'SDF', now, airports: AIRPORTS })

describe('the trip map model (moving map spec §5.1, §7.1, §12)', () => {
  it('is in flight on the first flight while it is between its gates', () => {
    const map = make(EUROPE, at(4))!
    expect(map.mode).toEqual({ kind: 'inFlight', legId: 'f1' })
    expect(currentLeg(map)?.id).toBe('f1')
  })

  it('is on a trip, with the pilot in Cologne, on the layover', () => {
    const map = make(EUROPE, at(12))!
    expect(map.mode).toEqual({ kind: 'onTrip' })
    const place = pilotLocation(map, at(12))!
    expect([place.code, place.city, place.timeZone]).toEqual(['CGN', 'Cologne', 'Europe/Berlin'])
  })

  it('puts the pilot at home before a trip still ahead, and nowhere while a leg is moving', () => {
    const map = make(EUROPE, at(-48), true)!
    expect(map.mode).toEqual({ kind: 'nextTrip' })
    expect(pilotLocation(map, at(-48))?.code).toBe('SDF')
    expect(pilotLocation(map, at(4))).toBeNull()
  })

  it('leaves out legs with an unknown airport, and is null with nothing to draw', () => {
    expect(make([EUROPE[0], flight('f2', 'CGN', 'ZZZ', 32, 6), EUROPE[2]])!.legs.map((l) => l.id)).toEqual(['f1', 'f3'])
    expect(make([flight('x', 'ZZZ', 'YYY', 0, 2)])).toBeNull()
    expect(make([])).toBeNull()
  })

  it('draws a drive as a drive, and is never in flight on one', () => {
    const map = make([drive('d1', 'LEX', 'SDF', 0, 1.5)], at(0.5))!
    expect(map.legs[0].kind).toBe('drive')
    expect(map.mode).toEqual({ kind: 'onTrip' })
  })

  it('spans from the earliest departure to the last arrival', () => {
    expect(make()!.span).toEqual({ start: at(0), end: at(72) })
    const early = make([flight('a', 'SDF', 'CGN', 0, 8), flight('b', 'CGN', 'DXB', -1, 6)], at(-10))!
    expect(early.span.start).toBe(at(-1))
  })

  it('knows the leg in motion and the next flight', () => {
    const map = make()!
    expect(legInMotion(map, at(35))?.id).toBe('f2')
    expect(legInMotion(map, at(40))).toBeNull()
    expect(nextFlight(map, at(12))?.id).toBe('f2')
    expect(nextFlight(map, at(70))).toBeNull()
  })

  it("frames one leg's arc, or every leg and home", () => {
    const map = make(EUROPE, at(4))!
    expect(framingPoints(map, currentLeg(map))).toHaveLength(33)
    expect(framingPoints(map, null)).toHaveLength(3 * 33 + 1)
  })

  it('moves and aims the plane by the schedule', () => {
    const leg = currentLeg(make(EUROPE, at(4))!)!
    const fraction = legProgress(leg, at(4))
    expect(fraction).toBeCloseTo(scheduledFraction(at(0), at(8), at(4)), 12)
    expect(positionAt(leg, fraction).lat).toBeCloseTo(pointAlong(leg.origin.place, leg.destination.place, fraction).lat, 9)
    expect(Math.abs(headingAt(leg, at(4))!)).toBeLessThan(Math.PI / 2)
  })
})
```

Create `tests/map/tripMapFor.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Leg } from '../../src/engine/legs'
import type { Snapshot } from '../../src/engine/snapshot'
import type { StatusKind } from '../../src/engine/status'
import { tripLegs, tripMapFor } from '../../src/map/tripMapFor'
import { AIRPORTS, at, drive, EUROPE, flight } from './tripMapLegs'

/** Just the snapshot fields tripMapFor reads. */
function snap(kind: StatusKind, t: number, extra: Partial<Snapshot> = {}): Snapshot {
  return {
    t,
    pilot: { firstName: 'Alex', base: 'SDF', home: 'SDF', effHome: 'SDF' },
    status: { kind, airport: null, current: null, previous: null, next: null },
    upcomingTrip: null,
    tripProgress: null,
    ...extra,
  } as unknown as Snapshot
}

const LEGS: Leg[] = [drive('d0', 'LEX', 'SDF', -3, 1.5), ...EUROPE, flight('g1', 'SDF', 'ANC', 200, 6, 'T2')]

describe('which legs the trip map shows (moving map spec §5.1, §12)', () => {
  it("takes a trip's own flights and the commutes within 12 hours of them", () => {
    expect(tripLegs(LEGS, 'T1').map((l) => l.id)).toEqual(['d0', 'f1', 'f2', 'f3'])
    expect(tripLegs(LEGS, 'nope')).toEqual([])
  })

  it('shows the next trip from home', () => {
    const upcomingTrip = { tripId: 'T2', departs: at(200), days: 1, route: ['SDF', 'ANC'], delayMinutes: null }
    const map = tripMapFor(snap('home', at(150), { upcomingTrip }), LEGS, AIRPORTS)!
    expect(map.mode).toEqual({ kind: 'nextTrip' })
    expect(map.legs.map((l) => l.id)).toEqual(['g1'])
  })

  it('shows nothing at home with no trip ahead', () => {
    expect(tripMapFor(snap('home', at(150)), LEGS, AIRPORTS)).toBeNull()
  })

  it('shows the trip under way', () => {
    const tripProgress = { tripId: 'T1', day: 1, days: 4, upcoming: ['DXB', 'SDF'] }
    const map = tripMapFor(snap('layover', at(12), { tripProgress }), LEGS, AIRPORTS)!
    expect(map.mode).toEqual({ kind: 'onTrip' })
    expect(map.legs.map((l) => l.id)).toEqual(['d0', 'f1', 'f2', 'f3'])
  })

  it('falls back to the leg in motion when no trip covers now, such as a commute home', () => {
    const jumpseat = { ...flight('j1', 'CGN', 'SDF', 80, 9, null), kind: 'jumpseat' as const }
    const s = snap('commutingHome', at(84))
    s.status.current = jumpseat
    const map = tripMapFor(s, [...LEGS, jumpseat], AIRPORTS)!
    expect(map.mode).toEqual({ kind: 'inFlight', legId: 'j1' })
  })
})
```

- [ ] **Step 3: Run them to see them fail.** Run `npx vitest run tests/map/tripMap.test.ts tests/map/tripMapFor.test.ts`. Expected: FAIL.

- [ ] **Step 4: Implement `tripMap.ts`.** Create `src/map/tripMap.ts`:

```ts
import { flightNumberText } from '../copy/flight'
import type { AirportIndex } from '../data/airports'
import { isMove, type Leg } from '../engine/legs'
import type { Iata } from '../engine/types'
import { scheduledFraction } from './flightProgress'
import { distanceMeters, pointAlong, pointsAlong, type GeoPoint } from './greatCircle'
import { aimFractions, flatMapAngle } from './planeHeading'

/** The trip the map shows (moving map spec §5.1), as the app's TripMap: its drawable legs, its mode, and home. */

/** An airport on the map. */
export interface AirportMark {
  code: Iata
  /** The airport list's city, or the code. */
  city: string
  place: GeoPoint
  /** Null when this browser doesn't know the zone: "there" times are left out then. */
  timeZone: string | null
}

/** A flight (or jumpseat) or a drive between two known airports, at its delay-aware times. */
export interface MapLeg {
  id: string
  kind: 'flight' | 'drive'
  origin: AirportMark
  destination: AirportMark
  start: number
  end: number
  flightNumber: string | null
}

export type TripMapMode = { kind: 'inFlight'; legId: string } | { kind: 'onTrip' } | { kind: 'nextTrip' }

export interface TripMap {
  mode: TripMapMode
  /** Never empty, earliest first. */
  legs: MapLeg[]
  home: AirportMark | null
  /** From the earliest departure to the last arrival: the full-screen map's timeline. */
  span: { start: number; end: number }
}

export function airportMark(code: Iata, airports: AirportIndex): AirportMark | null {
  const airport = airports.get(code)
  if (!airport) return null
  return { code: airport.iata, city: airports.city(code) ?? airport.iata, place: { lat: airport.lat, lng: airport.lng }, timeZone: airports.tz(code) }
}

function mapLeg(leg: Leg, airports: AirportIndex): MapLeg | null {
  const ends = isMove(leg) ? [leg.dep, leg.arr] : leg.kind === 'drive' ? [leg.from, leg.to] : null
  if (!ends) return null
  const origin = airportMark(ends[0], airports)
  const destination = airportMark(ends[1], airports)
  if (!origin || !destination) return null
  return {
    id: leg.id,
    kind: isMove(leg) ? 'flight' : 'drive',
    origin,
    destination,
    start: leg.start,
    end: leg.end,
    flightNumber: isMove(leg) ? flightNumberText(leg.airline, leg.number) : null,
  }
}

export interface TripMapOptions {
  /** The legs are a trip still ahead, shown from home. */
  isNextTrip: boolean
  home: Iata | null
  now: number
  airports: AirportIndex
}

/** The map of one trip's legs, or null when none can be drawn (moving map spec §12). */
export function makeTripMap(legs: Leg[], { isNextTrip, home, now, airports }: TripMapOptions): TripMap | null {
  const mapped = [...legs].sort((a, b) => a.start - b.start).map((l) => mapLeg(l, airports)).filter((l): l is MapLeg => l != null)
  if (mapped.length === 0) return null
  const start = Math.min(...mapped.map((l) => l.start))
  const end = Math.max(start, ...mapped.map((l) => l.end))
  const flying = mapped.find((l) => l.kind === 'flight' && isMoving(l, now))
  const mode: TripMapMode = isNextTrip ? { kind: 'nextTrip' } : flying ? { kind: 'inFlight', legId: flying.id } : { kind: 'onTrip' }
  return { mode, legs: mapped, home: home ? airportMark(home, airports) : null, span: { start, end } }
}

/** True from leaving the gate (or the driveway) until reaching the other end. */
export const isMoving = (leg: MapLeg, t: number) => leg.start <= t && t < leg.end

/** How far along the leg the schedule has the pilot, 0…1: a flight with the taxi allowances, a drive steadily. */
export function legProgress(leg: MapLeg, t: number): number {
  if (leg.kind === 'flight') return scheduledFraction(leg.start, leg.end, t)
  if (leg.end <= leg.start) return t >= leg.end ? 1 : 0
  return Math.min(Math.max((t - leg.start) / (leg.end - leg.start), 0), 1)
}

export const positionAt = (leg: MapLeg, fraction: number) => pointAlong(leg.origin.place, leg.destination.place, fraction)

export const legDistanceMeters = (leg: MapLeg) => distanceMeters(leg.origin.place, leg.destination.place)

/** The plane's angle at `t` on a north-up map, or null for a leg that starts and ends at one place. */
export function headingAt(leg: MapLeg, t: number): number | null {
  const aim = aimFractions(legProgress(leg, t))
  return flatMapAngle(positionAt(leg, aim.from), positionAt(leg, aim.to))
}

/** The flight in the air when the map was made. */
export function currentLeg(map: TripMap): MapLeg | null {
  const mode = map.mode
  return mode.kind === 'inFlight' ? map.legs.find((l) => l.id === mode.legId) ?? null : null
}

export const legInMotion = (map: TripMap, t: number) => map.legs.find((l) => isMoving(l, t)) ?? null

export const nextFlight = (map: TripMap, t: number) => map.legs.find((l) => l.kind === 'flight' && l.start > t) ?? null

/** Where the pilot is at `t` when nothing is moving, or null while a leg is. Before a trip still ahead starts, home. */
export function pilotLocation(map: TripMap, t: number): AirportMark | null {
  if (legInMotion(map, t)) return null
  if (map.mode.kind === 'nextTrip' && t < map.span.start) return map.home ?? map.legs[0].origin
  const landed = map.legs.filter((l) => l.end <= t)
  return landed.length > 0 ? landed[landed.length - 1].destination : map.legs[0].origin
}

/** The places the camera must show: one leg's arc, or every leg's arcs and home. */
export function framingPoints(map: TripMap, focus: MapLeg | null): GeoPoint[] {
  const shown = focus ? [focus] : map.legs
  const points = shown.flatMap((l) => pointsAlong(l.origin.place, l.destination.place, 33))
  if (!focus && map.home) points.push(map.home.place)
  return points
}
```

- [ ] **Step 5: Implement `tripMapFor.ts`.** Create `src/map/tripMapFor.ts`:

```ts
import type { AirportIndex } from '../data/airports'
import { isMove, type Leg } from '../engine/legs'
import type { Snapshot } from '../engine/snapshot'
import { HOUR } from '../time/zoned'
import { makeTripMap, type TripMap } from './tripMap'

/**
 * Which trip the status page's map shows (moving map spec §5.1, §12), as the app's TripMap+Status, on the site's own
 * model:
 * - at home or base, the next trip;
 * - on a trip, the trip under way: the one the trip progress card shows;
 * - between trips, the leg in motion, such as a commute home.
 */

/** Commutes count as part of a trip when they fall within this long of its flights. */
const COMMUTE_WINDOW = 12 * HOUR

/** A trip's own flights and jumpseats, and the drives and standalone jumpseats within 12 hours of them. */
export function tripLegs(legs: Leg[], tripId: string): Leg[] {
  const own = legs.filter((l) => isMove(l) && l.tripId === tripId)
  if (own.length === 0) return []
  const first = Math.min(...own.map((l) => l.start)) - COMMUTE_WINDOW
  const last = Math.max(...own.map((l) => l.end)) + COMMUTE_WINDOW
  const commutes = legs.filter((l) => (l.kind === 'drive' || (isMove(l) && l.tripId == null)) && l.start >= first && l.end <= last)
  return [...own, ...commutes].sort((a, b) => a.start - b.start)
}

/** The status page's trip map, or null when there's nothing to draw. */
export function tripMapFor(snap: Snapshot, legs: Leg[], airports: AirportIndex): TripMap | null {
  const options = (isNextTrip: boolean) => ({ isNextTrip, home: snap.pilot.effHome, now: snap.t, airports })
  const kind = snap.status.kind
  if (kind === 'home' || kind === 'base') {
    const tripId = snap.upcomingTrip?.tripId
    return tripId ? makeTripMap(tripLegs(legs, tripId), options(true)) : null
  }
  const tripId = snap.tripProgress?.tripId
  const chosen = tripId ? tripLegs(legs, tripId) : []
  if (chosen.length > 0) return makeTripMap(chosen, options(false))
  const current = snap.status.current
  return current && (isMove(current) || current.kind === 'drive') ? makeTripMap([current], options(false)) : null
}
```

- [ ] **Step 6: Run them to see them pass.** Run the same command. Expected: PASS. Then run `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 7: Ask to commit.** Suggested message: `The trip map's model, and which legs it shows (moving map spec §5.1, §12)`

---

### Task 9: What the map draws at an instant, and the replay clock

**Files:**
- Create: `src/map/tripMapDrawing.ts`, `src/map/replayClock.ts`.
- Test: `tests/map/tripMapDrawing.test.ts`, `tests/map/replayClock.test.ts`.

- [ ] **Step 1: Write the failing tests.** Create `tests/map/tripMapDrawing.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { currentLeg, legProgress, makeTripMap, positionAt } from '../../src/map/tripMap'
import { nightTime, tripMapDrawing } from '../../src/map/tripMapDrawing'
import { AIRPORTS, at, drive, EUROPE } from './tripMapLegs'

const make = (legs = EUROPE, now = at(12)) => makeTripMap(legs, { isNextTrip: false, home: 'SDF', now, airports: AIRPORTS })!
const styles = (t: number, legs = EUROPE) => Object.fromEntries(tripMapDrawing(make(legs, t), t).segments.map((s) => [s.id, s.style]))

describe('what the trip map draws (moving map spec §7.1, §7.2)', () => {
  it('splits the leg in the air at the plane, solid behind and dashed ahead', () => {
    expect(styles(at(4))).toEqual({ 'f1-flying': 'flying', 'f1-upcoming': 'upcoming', 'f2-upcoming': 'upcoming', 'f3-upcoming': 'upcoming' })
    const map = make(EUROPE, at(4))
    const drawing = tripMapDrawing(map, at(4))
    const leg = currentLeg(map)!
    expect(drawing.plane!.place.lat).toBeCloseTo(positionAt(leg, legProgress(leg, at(4))).lat, 9)
    expect(drawing.pin).toBeNull()
  })

  it('greys the flown leg and pins Cologne on the layover', () => {
    expect(styles(at(12))).toEqual({ 'f1-flown': 'flown', 'f2-upcoming': 'upcoming', 'f3-upcoming': 'upcoming' })
    const drawing = tripMapDrawing(make(), at(12))
    expect(drawing.plane).toBeNull()
    expect(drawing.pin?.code).toBe('CGN')
  })

  it('keeps the plane at the gate, with the whole leg ahead, while it taxis out', () => {
    expect(styles(at(0.1))['f1-upcoming']).toBe('upcoming')
    expect(styles(at(0.1))['f1-flying']).toBeUndefined()
    expect(tripMapDrawing(make(EUROPE, at(0.1)), at(0.1)).plane!.place.lat).toBeCloseTo(38.1744, 9)
  })

  it('lists each airport once, and parks a drive’s car halfway when nobody is driving', () => {
    expect(tripMapDrawing(make(), at(12)).airports.map((a) => a.code)).toEqual(['SDF', 'CGN', 'DXB'])
    const legs = [drive('d1', 'LEX', 'SDF', 0, 2)]
    const drawing = tripMapDrawing(make(legs, at(-1)), at(-1))
    expect(drawing.segments.map((s) => [s.id, s.style, s.geodesic])).toEqual([['d1-drive', 'drive', false]])
    expect(drawing.cars[0].place.lng).toBeCloseTo(positionAt(make(legs, at(-1)).legs[0], 0.5).lng, 9)
  })

  it('redraws the night only once it has moved enough to see', () => {
    expect(nightTime(1_000_059_000, 60_000)).toBe(1_000_020_000)
    expect(nightTime(1_000_059_000, 0)).toBe(1_000_059_000)
  })
})
```

Create `tests/map/replayClock.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { clockTime, goLive, hasFinished, isLive, isPlaying, liveClock, pause, play, scrub, setSpeed } from '../../src/map/replayClock'

const SPAN = { start: 1_800_000_000_000, end: 1_800_000_000_000 + 2 * 86_400_000 }
const NOW = 1_800_050_000_000
const S = 1000

describe('the replay clock (moving map spec §6)', () => {
  it('reads now while live', () => {
    const clock = liveClock(SPAN)
    expect([isLive(clock), isPlaying(clock), clockTime(clock, NOW)]).toEqual([true, false, NOW])
  })

  it('holds a scrub to the trip', () => {
    expect(clockTime(scrub(liveClock(SPAN), SPAN.start - 3_600_000), NOW)).toBe(SPAN.start)
    expect(clockTime(scrub(liveClock(SPAN), SPAN.end + 3_600_000), NOW)).toBe(SPAN.end)
  })

  it("plays from the trip's start at a day in 48 seconds, and faster at 10x without jumping", () => {
    const playing = play(liveClock(SPAN), NOW)
    expect(clockTime(playing, NOW + 48 * S)).toBe(SPAN.start + 86_400_000)
    const later = NOW + 10 * S
    const faster = setSpeed(playing, 10, later)
    expect(clockTime(faster, later)).toBe(clockTime(playing, later))
    expect(clockTime(faster, later + S)).toBe(clockTime(playing, later) + 18_000 * S)
  })

  it('stops at the end, and plays again from the start', () => {
    const playing = play(liveClock(SPAN), NOW)
    expect(clockTime(playing, NOW + 500 * S)).toBe(SPAN.end)
    expect(hasFinished(playing, NOW + 500 * S)).toBe(true)
    expect(clockTime(play(playing, NOW + 500 * S), NOW + 500 * S)).toBe(SPAN.start)
  })

  it('pauses where it is, and goes back to now', () => {
    const paused = pause(play(liveClock(SPAN), NOW), NOW + 5 * S)
    expect(clockTime(paused, NOW + 60 * S)).toBe(SPAN.start + 5 * 1800 * S)
    expect(isLive(goLive(paused))).toBe(true)
  })
})
```

- [ ] **Step 2: Run them to see them fail.** Run `npx vitest run tests/map/tripMapDrawing.test.ts tests/map/replayClock.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement the drawing.** Create `src/map/tripMapDrawing.ts`:

```ts
import type { GeoPoint } from './greatCircle'
import { headingAt, isMoving, legProgress, pilotLocation, positionAt, type AirportMark, type TripMap } from './tripMap'

/** Everything the trip map draws at one instant (moving map spec §7.1, §7.2), worked out here so the SVG only renders it. */

/** Still to fly (dashed), flown so far on the leg in the air (solid), flown earlier (grey), or a drive (dotted). */
export type SegmentStyle = 'upcoming' | 'flying' | 'flown' | 'drive'

export interface RouteSegment {
  id: string
  from: GeoPoint
  to: GeoPoint
  style: SegmentStyle
  /** Flights follow the great circle; drives are short enough to draw straight. */
  geodesic: boolean
}

export interface TripMapDrawing {
  segments: RouteSegment[]
  airports: AirportMark[]
  cars: { id: string; place: GeoPoint }[]
  /** The schedule's plane: where, and its angle in radians (0 east, clockwise). */
  plane: { place: GeoPoint; angle: number } | null
  /** The heart: where the pilot is when nothing is moving. */
  pin: AirportMark | null
}

export function tripMapDrawing(map: TripMap, t: number): TripMapDrawing {
  const segments: RouteSegment[] = []
  const cars: TripMapDrawing['cars'] = []
  let plane: TripMapDrawing['plane'] = null
  for (const leg of map.legs) {
    const from = leg.origin.place
    const to = leg.destination.place
    if (leg.kind === 'drive') {
      segments.push({ id: `${leg.id}-drive`, from, to, style: 'drive', geodesic: false })
      cars.push({ id: `${leg.id}-car`, place: positionAt(leg, isMoving(leg, t) ? legProgress(leg, t) : 0.5) })
    } else if (t >= leg.end) {
      segments.push({ id: `${leg.id}-flown`, from, to, style: 'flown', geodesic: true })
    } else if (isMoving(leg, t)) {
      const fraction = legProgress(leg, t)
      const here = positionAt(leg, fraction)
      if (fraction > 0) segments.push({ id: `${leg.id}-flying`, from, to: here, style: 'flying', geodesic: true })
      if (fraction < 1) segments.push({ id: `${leg.id}-upcoming`, from: here, to, style: 'upcoming', geodesic: true })
      plane = { place: here, angle: headingAt(leg, t) ?? 0 }
    } else {
      segments.push({ id: `${leg.id}-upcoming`, from, to, style: 'upcoming', geodesic: true })
    }
  }
  const seen = new Set<string>()
  const airports = map.legs.flatMap((l) => [l.origin, l.destination]).filter((a) => !seen.has(a.code) && seen.add(a.code))
  return { segments, airports, cars, plane, pin: pilotLocation(map, t) }
}

/** `t` held back to a whole number of `step` ms, so the night is redrawn only once it has moved enough to see. */
export function nightTime(t: number, step: number): number {
  return step > 0 ? Math.floor(t / step) * step : t
}
```

- [ ] **Step 4: Implement the replay clock.** Create `src/map/replayClock.ts`:

```ts
/**
 * The full-screen map's time (moving map spec §6), as the app's TripReplayClock: now, a moment dragged to, or a replay
 * at 1x to 10x. A value the page keeps in state and reads on each frame, so nothing changes per frame.
 */

export type ReplaySpeed = 1 | 2 | 5 | 10
export const REPLAY_SPEEDS: readonly ReplaySpeed[] = [1, 2, 5, 10]

/** Trip time per replay time at 1x: a day in 48 seconds, as on CrewLu's moving map. */
export const REPLAY_BASE_RATE = 1800

export interface ReplayClock {
  span: { start: number; end: number }
  speed: ReplaySpeed
  /** Null while live. Otherwise the trip time it was set to, and when it started playing from there. */
  anchor: { tripTime: number; playingSince: number | null } | null
}

export const liveClock = (span: ReplayClock['span']): ReplayClock => ({ span, speed: 1, anchor: null })
export const isLive = (c: ReplayClock) => c.anchor == null
export const isPlaying = (c: ReplayClock) => c.anchor?.playingSince != null

const held = (c: ReplayClock, t: number) => Math.min(Math.max(t, c.span.start), c.span.end)

/** The trip time to show at the real time `now`. */
export function clockTime(c: ReplayClock, now: number): number {
  if (!c.anchor) return now
  const since = c.anchor.playingSince
  if (since == null) return c.anchor.tripTime
  return Math.min(c.anchor.tripTime + Math.max(now - since, 0) * REPLAY_BASE_RATE * c.speed, c.span.end)
}

/** True once a replay has run to the trip's end. `isPlaying` stays true then, so the page shows Play again. */
export const hasFinished = (c: ReplayClock, now: number) => isPlaying(c) && clockTime(c, now) >= c.span.end

export const scrub = (c: ReplayClock, t: number): ReplayClock => ({ ...c, anchor: { tripTime: held(c, t), playingSince: null } })

/** Plays from where it is: from the start when live, and again from the start once finished. */
export function play(c: ReplayClock, now: number): ReplayClock {
  const current = isLive(c) ? c.span.start : clockTime(c, now)
  return { ...c, anchor: { tripTime: current >= c.span.end ? c.span.start : current, playingSince: now } }
}

export const pause = (c: ReplayClock, now: number): ReplayClock =>
  isPlaying(c) ? { ...c, anchor: { tripTime: clockTime(c, now), playingSince: null } } : c

export const setSpeed = (c: ReplayClock, speed: ReplaySpeed, now: number): ReplayClock =>
  isPlaying(c) ? { ...c, speed, anchor: { tripTime: clockTime(c, now), playingSince: now } } : { ...c, speed }

export const goLive = (c: ReplayClock): ReplayClock => ({ ...c, anchor: null })
```

- [ ] **Step 5: Run them to see them pass.** Run the same command. Expected: PASS.

- [ ] **Step 6: Ask to commit.** Suggested message: `What the trip map draws at an instant, and its replay clock (moving map spec §6, §7.1)`

---

### Task 10: The words

They mirror the app's `TripMapWording`, in the site's time format: `shortTimeText` writes "9:14 PM", or "21:14" in 24-hour.

**Files:**
- Create: `src/copy/tripMap.ts`.
- Test: `tests/copy/tripMap.test.ts`.

- [ ] **Step 1: Write the failing test.** Create `tests/copy/tripMap.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  cardChips, dateRangeText, dayPhrase, landingCountdown, landingLine, landsAt, arrivalLocalTime, nextDepartureChip,
  nextTripChip, placeChip, statsItems, timelineTime, tripMapSummary,
} from '../../src/copy/tripMap'
import { airportMark, makeTripMap, type MapLeg } from '../../src/map/tripMap'
import { AIRPORTS, at, EUROPE } from '../map/tripMapLegs'

const NY = 'America/New_York'
/** Friday 2026-11-13, 3:14 PM in Louisville and 9:14 PM in Cologne. */
const NOW = Date.UTC(2026, 10, 13, 20, 14)
const PM = ' PM'
const AM = ' AM'
const mark = (code: string) => airportMark(code, AIRPORTS)!
const leg = (from: string, to: string, start: number, end: number): MapLeg => ({
  id: 'f', kind: 'flight', origin: mark(from), destination: mark(to), start, end, flightNumber: 'UPS207',
})
const MIN = 60_000

describe('the trip map words (moving map spec §5, §6, §14)', () => {
  it('names the place and its time there', () => {
    expect(placeChip(mark('CGN'), NOW, false)).toBe(`Cologne · 9:14${PM} there`)
  })

  it('names the next departure in your time', () => {
    expect(nextDepartureChip(leg('CGN', 'DXB', NOW + (14 * 60 + 56) * MIN, NOW + 21 * 60 * MIN), NOW, NY, false)).toBe(`Next: Dubai, tomorrow 6:10${AM}`)
  })

  it('counts down to landing', () => {
    const lands = (minutes: number) => landingCountdown(leg('SDF', 'CGN', NOW - 60 * MIN, NOW + minutes * MIN), NOW)
    expect([lands(130), lands(120), lands(45), lands(-1)]).toEqual(['Landing in 2 h 10 min', 'Landing in 2 h', 'Landing in 45 min', 'Landing now'])
  })

  it('gives the landing in both times, or one when it is yours', () => {
    const away = leg('SDF', 'CGN', NOW - 360 * MIN, NOW + 16 * MIN)
    expect(landingLine(away, NY, false)).toBe(`Lands Cologne 9:30${PM} · 3:30${PM} your time`)
    expect(landsAt(away, NY, false)).toBe(`Lands 3:30${PM}`)
    expect(arrivalLocalTime(away, NY, false)).toBe(`9:30${PM} in Cologne`)
    const home = leg('CGN', 'SDF', NOW - 360 * MIN, NOW + 16 * MIN)
    expect(landingLine(home, NY, false)).toBe(`Lands Louisville 3:30${PM}`)
    expect(arrivalLocalTime(home, NY, false)).toBeNull()
    expect(landsAt(away, NY, true)).toBe('Lands 15:30')
  })

  it('says today, tomorrow, a weekday or a date', () => {
    const day = 86_400_000
    expect([0, 1, 5, 7].map((n) => dayPhrase(NOW + n * day, NOW, NY))).toEqual(['today', 'tomorrow', 'Wednesday', 'Nov 20'])
    expect(nextTripChip(NOW + 5 * day, NOW, NY)).toBe('Home · next trip Wednesday')
  })

  it('gives a trip’s days, or its dates when it runs a week', () => {
    const day = 86_400_000
    expect(dateRangeText(NOW + 7 * day, NOW + 10 * day, NY)).toBe('Fri–Mon')
    expect(dateRangeText(NOW, NOW + 3_600_000, NY)).toBe('Fri')
    expect(dateRangeText(NOW, NOW + 7 * day, NY)).toBe('Nov 13–Nov 20')
  })

  it('fills the bar on a layover and before a trip', () => {
    const resting = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!
    const items = statsItems(resting, at(12), 1, 4, NY)
    expect(items[0]).toBe('Day 1 of 4')
    expect(items[1]).toBe('2 cities')
    expect(items[2]).toMatch(/^[\d,]+ mi so far$/)
    const ahead = makeTripMap(EUROPE, { isNextTrip: true, home: 'SDF', now: at(-24), airports: AIRPORTS })!
    const next = statsItems(ahead, at(-24), null, null, NY)
    expect(next.slice(0, 2)).toEqual(['Fri–Mon', 'CGN · DXB'])
    expect(next[2]).toMatch(/^[\d,]+ mi$/)
  })

  it('puts the right words on the card in each mode', () => {
    const flying = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(4), airports: AIRPORTS })!
    expect(cardChips(flying, at(4), NY, false)).toEqual({ top: null, bottom: 'Landing in 4 h' })
    const resting = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!
    const chips = cardChips(resting, at(12), NY, false)
    expect(chips.top?.startsWith('Cologne · ')).toBe(true)
    expect(chips.bottom?.startsWith('Next: Dubai, ')).toBe(true)
  })

  it('reads the card as one sentence', () => {
    const flying = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(4), airports: AIRPORTS })!
    expect(tripMapSummary(flying, at(4), 'Alex', NY, false)).toBe(
      `${flying.legs[0].flightNumber} to Cologne, landing at 3:00${PM} your time. Estimated from the schedule. Opens the full map.`,
    )
    const ahead = makeTripMap(EUROPE, { isNextTrip: true, home: 'SDF', now: at(-24), airports: AIRPORTS })!
    expect(tripMapSummary(ahead, at(-24), 'Alex', NY, false)).toBe('Map of the next trip, tomorrow: Cologne, Dubai. Opens the full map.')
  })

  it('gives the timeline a weekday and a time', () => {
    expect(timelineTime(NOW, NY, false)).toBe(`Fri 3:14${PM}`)
  })
})
```

- [ ] **Step 2: Run it to see it fail.** Run `npx vitest run tests/copy/tripMap.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.** Create `src/copy/tripMap.ts`:

```ts
import { METERS_PER_MILE } from '../map/greatCircle'
import {
  legDistanceMeters, legInMotion, legProgress, nextFlight, pilotLocation, currentLeg, type AirportMark, type MapLeg, type TripMap,
} from '../map/tripMap'
import { calendarDay, MONTHS, WEEKDAYS, zoneOffsetMinutes, zonedParts } from '../time/zoned'
import { shortTimeText } from './format'

/**
 * Every sentence the trip map shows or speaks (moving map spec §5, §6, §14), as the app's TripMapWording. Times are the
 * family's own, in `viewerTz`, unless the words say "there".
 */

const shortWeekday = (ms: number, tz: string) => WEEKDAYS[zonedParts(ms, tz).weekday].slice(0, 3)
const monthDay = (ms: number, tz: string) => {
  const p = zonedParts(ms, tz)
  return `${MONTHS[p.month - 1].slice(0, 3)} ${p.day}`
}

/** "today", "tomorrow", a weekday within the week, else "Nov 20". */
export function dayPhrase(ms: number, now: number, tz: string): string {
  const days = calendarDay(ms, tz) - calendarDay(now, tz)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days >= 2 && days <= 6) return WEEKDAYS[zonedParts(ms, tz).weekday]
  return monthDay(ms, tz)
}

/** "Fri–Mon", "Fri" for one day, or "Nov 13–Nov 20" for six days or more. */
export function dateRangeText(start: number, end: number, tz: string): string {
  const days = calendarDay(end, tz) - calendarDay(start, tz)
  if (days >= 6) return `${monthDay(start, tz)}–${monthDay(end, tz)}`
  return days === 0 ? shortWeekday(start, tz) : `${shortWeekday(start, tz)}–${shortWeekday(end, tz)}`
}

/** "Cologne · 9:14 PM there". */
export function placeChip(place: AirportMark, now: number, h24: boolean): string {
  return place.timeZone ? `${place.city} · ${shortTimeText(now, place.timeZone, h24)} there` : place.city
}

/** "Next: Dubai, tomorrow 6:10 AM". */
export function nextDepartureChip(leg: MapLeg, now: number, viewerTz: string, h24: boolean): string {
  return `Next: ${leg.destination.city}, ${dayPhrase(leg.start, now, viewerTz)} ${shortTimeText(leg.start, viewerTz, h24)}`
}

/** "Home · next trip Wednesday". */
export const nextTripChip = (start: number, now: number, viewerTz: string) => `Home · next trip ${dayPhrase(start, now, viewerTz)}`

/** "Landing in 2 h 10 min", to the gate arrival. */
export function landingCountdown(leg: MapLeg, now: number): string {
  const minutes = Math.ceil((leg.end - now) / 60_000)
  if (minutes <= 0) return 'Landing now'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `Landing in ${rest} min`
  return rest === 0 ? `Landing in ${hours} h` : `Landing in ${hours} h ${rest} min`
}

/** The destination's own time at landing, or null when it keeps the family's. */
function thereAtLanding(leg: MapLeg, viewerTz: string, h24: boolean): string | null {
  const there = leg.destination.timeZone
  if (!there || zoneOffsetMinutes(leg.end, there) === zoneOffsetMinutes(leg.end, viewerTz)) return null
  return shortTimeText(leg.end, there, h24)
}

/** "Lands Cologne 9:30 PM · 3:30 PM your time", or "Lands Louisville 3:30 PM". */
export function landingLine(leg: MapLeg, viewerTz: string, h24: boolean): string {
  const yours = shortTimeText(leg.end, viewerTz, h24)
  const there = thereAtLanding(leg, viewerTz, h24)
  return there ? `Lands ${leg.destination.city} ${there} · ${yours} your time` : `Lands ${leg.destination.city} ${yours}`
}

/** "Lands 3:30 PM", for the card's bar. */
export const landsAt = (leg: MapLeg, viewerTz: string, h24: boolean) => `Lands ${shortTimeText(leg.end, viewerTz, h24)}`

/** "9:30 PM in Cologne", or null when the destination keeps the family's time. */
export function arrivalLocalTime(leg: MapLeg, viewerTz: string, h24: boolean): string | null {
  const there = thereAtLanding(leg, viewerTz, h24)
  return there ? `${there} in ${leg.destination.city}` : null
}

const miles = (meters: number) => Math.round(meters / METERS_PER_MILE).toLocaleString('en-US')

/** The airports the trip's flights reach, in order, each once, home left out. */
function destinations(map: TripMap): AirportMark[] {
  const seen = new Set(map.home ? [map.home.code] : [])
  return map.legs.filter((l) => l.kind === 'flight').map((l) => l.destination).filter((a) => !seen.has(a.code) && seen.add(a.code))
}

/** The bar's words on the ground (moving map spec §5.3); empty in flight, where the bar shows the flight. */
export function statsItems(map: TripMap, t: number, day: number | null, days: number | null, viewerTz: string): string[] {
  const flights = map.legs.filter((l) => l.kind === 'flight')
  const cities = destinations(map)
  if (map.mode.kind === 'inFlight') return []
  if (map.mode.kind === 'onTrip') {
    const flown = flights.reduce((sum, l) => sum + legDistanceMeters(l) * legProgress(l, t), 0)
    return [
      ...(day != null && days != null ? [`Day ${day} of ${days}`] : []),
      ...(cities.length > 0 ? [cities.length === 1 ? '1 city' : `${cities.length} cities`] : []),
      `${miles(flown)} mi so far`,
    ]
  }
  const total = flights.reduce((sum, l) => sum + legDistanceMeters(l), 0)
  return [dateRangeText(map.span.start, map.span.end, viewerTz), cities.map((c) => c.code).join(' · '), `${miles(total)} mi`].filter((s) => s !== '')
}

/** The chips on the card's map (moving map spec §5.1, §5.2). */
export function cardChips(map: TripMap, t: number, viewerTz: string, h24: boolean): { top: string | null; bottom: string | null } {
  if (map.mode.kind === 'inFlight') {
    const leg = currentLeg(map)
    return { top: null, bottom: leg ? landingCountdown(leg, t) : null }
  }
  if (map.mode.kind === 'nextTrip') return { top: nextTripChip(map.span.start, t, viewerTz), bottom: null }
  const place = pilotLocation(map, t)
  const next = nextFlight(map, t)
  return { top: place ? placeChip(place, t, h24) : null, bottom: next ? nextDepartureChip(next, t, viewerTz, h24) : null }
}

/** The full map's pill: "UPS207 · In flight", "Driving to Louisville", "Day 2 of 4" or "Next trip". */
export function topPill(map: TripMap, t: number, day: number | null, days: number | null): string {
  const leg = legInMotion(map, t)
  if (leg) return leg.kind === 'flight' ? [leg.flightNumber, 'In flight'].filter(Boolean).join(' · ') : `Driving to ${leg.destination.city}`
  if (map.mode.kind === 'nextTrip' && t < map.span.start) return 'Next trip'
  return day != null && days != null ? `Day ${day} of ${days}` : 'Trip map'
}

/** The full map panel's first line: the landing line in the air, else where they are. */
export function panelHeadline(map: TripMap, t: number, viewerTz: string, h24: boolean): string {
  const leg = legInMotion(map, t)
  if (leg) return leg.kind === 'flight' ? landingLine(leg, viewerTz, h24) : `Driving to ${leg.destination.city}`
  if (map.mode.kind === 'nextTrip' && t < map.span.start) return nextTripChip(map.span.start, t, viewerTz)
  const place = pilotLocation(map, t)
  return place ? placeChip(place, t, h24) : ''
}

/** "Fri 9:14 PM", under the timeline and as the slider's spoken value. */
export const timelineTime = (ms: number, viewerTz: string, h24: boolean) => `${shortWeekday(ms, viewerTz)} ${shortTimeText(ms, viewerTz, h24)}`

/** The card as one sentence for screen readers (moving map spec §14), ending with what it opens. */
export function tripMapSummary(map: TripMap, t: number, name: string, viewerTz: string, h24: boolean): string {
  const opens = 'Opens the full map.'
  if (map.mode.kind === 'inFlight') {
    const leg = currentLeg(map)
    if (!leg) return `Trip map. ${opens}`
    const lead = leg.flightNumber ? `${leg.flightNumber} to` : 'Flying to'
    return `${lead} ${leg.destination.city}, landing at ${shortTimeText(leg.end, viewerTz, h24)} your time. Estimated from the schedule. ${opens}`
  }
  if (map.mode.kind === 'nextTrip') {
    return `Map of the next trip, ${dayPhrase(map.span.start, t, viewerTz)}: ${destinations(map).map((c) => c.city).join(', ')}. ${opens}`
  }
  const parts = ['Trip map.']
  const place = pilotLocation(map, t)
  if (place) parts.push(`${name} is in ${place.city}.`)
  const next = nextFlight(map, t)
  if (next) parts.push(`${nextDepartureChip(next, t, viewerTz, h24)}.`)
  return [...parts, opens].join(' ')
}
```

- [ ] **Step 4: Run it to see it pass.** Run `npx vitest run tests/copy/tripMap.test.ts`. Expected: PASS.
  - `ahead` starts Fri 7:00 AM New York, and `at(-24)` is Thursday 7:00 AM, so it reads "tomorrow".
  - The flight `f1` lands at 20:00 UTC, which is 3:00 PM in Louisville.

- [ ] **Step 5: Ask to commit.** Suggested message: `The trip map's words: chips, the bar, landing lines and the spoken summary (moving map spec §5, §6, §14)`

---

### Task 11: The world's land

**Files:**
- Create: `scripts/build-land.mjs`, `public/data/land.json`.
- Create: `src/map/land.ts`, `src/ui/hooks/useLand.ts`.
- Test: `tests/map/land.test.ts`.
- Modify: `package.json` (a `land` script) and `.gitignore`.

- [ ] **Step 1: Ask Todd before downloading.**
  - The file is Natural Earth's 1:110m land, public domain, about 140 KB: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_land.geojson`.
  - With his OK, save it to `scripts/ne_110m_land.geojson`, which is not committed.
  - Add `scripts/ne_110m_land.geojson` to `.gitignore`.

- [ ] **Step 2: The build script.** Create `scripts/build-land.mjs`:

```js
// Writes public/data/land.json: Natural Earth's 1:110m land (public domain), trimmed for the trip map (moving map spec
// §11). Each ring is [[lng, lat], …] rounded to 0.1°, with repeats dropped. Rings of fewer than 4 points are dropped.
// Reads scripts/ne_110m_land.geojson, or LAND_SOURCE.
import { readFileSync, writeFileSync } from 'node:fs'

const source = process.env.LAND_SOURCE ?? new URL('./ne_110m_land.geojson', import.meta.url)
const geo = JSON.parse(readFileSync(source, 'utf8'))
const round = (v) => Math.round(v * 10) / 10
const rings = []
for (const feature of geo.features) {
  const { type, coordinates } = feature.geometry
  const polygons = type === 'Polygon' ? [coordinates] : type === 'MultiPolygon' ? coordinates : []
  for (const polygon of polygons) {
    // The outer ring only: at this scale the holes are lakes too small to see.
    const ring = []
    for (const [lng, lat] of polygon[0]) {
      const point = [round(lng), round(lat)]
      const last = ring[ring.length - 1]
      if (!last || last[0] !== point[0] || last[1] !== point[1]) ring.push(point)
    }
    if (ring.length >= 4) rings.push(ring)
  }
}
writeFileSync(new URL('../public/data/land.json', import.meta.url), JSON.stringify(rings))
console.log(`land.json: ${rings.length} rings, ${rings.reduce((n, r) => n + r.length, 0)} points`)
```

  Add `"land": "node scripts/build-land.mjs"` to `package.json`'s `scripts`. Then run `npm run land`.
  - Expected output: a line like `land.json: 127 rings, ~4000 points`.
  - Check `public/data/land.json` is well under 100 KB: `wc -c public/data/land.json`.

- [ ] **Step 3: Write the failing test.** Create `tests/map/land.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseLand } from '../../src/map/land'

describe('the land (moving map spec §11)', () => {
  it('turns rings of [lng, lat] into places', () => {
    expect(parseLand([[[0, 1], [2, 3], [4, 5], [0, 1]]])).toEqual([[{ lat: 1, lng: 0 }, { lat: 3, lng: 2 }, { lat: 5, lng: 4 }, { lat: 1, lng: 0 }]])
  })

  it('leaves out anything that is not a ring of number pairs', () => {
    expect(parseLand([[[0, 1]], 'x', [[0, 'a'], [1, 2], [3, 4], [5, 6]]] as unknown[])).toEqual([])
  })

  it('ships a land file the map can read, every point on the map', () => {
    const rings = parseLand(JSON.parse(readFileSync(new URL('../../public/data/land.json', import.meta.url), 'utf8')))
    expect(rings.length).toBeGreaterThan(50)
    for (const ring of rings) for (const p of ring) expect(Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180).toBe(true)
  })
})
```

- [ ] **Step 4: Implement.** Create `src/map/land.ts`:

```ts
import type { GeoPoint } from './greatCircle'

/** The world's land for the trip map (moving map spec §11): public/data/land.json, made by `npm run land`. */

const isPair = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number'

/** Rings of [lng, lat] as places. Anything else in the file is left out rather than drawn wrong. */
export function parseLand(rows: unknown[]): GeoPoint[][] {
  return rows
    .filter((ring): ring is [number, number][] => Array.isArray(ring) && ring.length >= 4 && ring.every(isPair))
    .map((ring) => ring.map(([lng, lat]) => ({ lat, lng })))
}

export async function loadLand(url = `${import.meta.env.BASE_URL}data/land.json`): Promise<GeoPoint[][]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`land.json ${res.status}`)
  return parseLand((await res.json()) as unknown[])
}
```

Create `src/ui/hooks/useLand.ts`:

```ts
import { useEffect, useState } from 'preact/hooks'
import type { GeoPoint } from '../../map/greatCircle'
import { loadLand } from '../../map/land'

/** One download per page, shared by the card and the full map. */
let land: Promise<GeoPoint[][]> | null = null

/** The world's land once it has loaded, else null: the map draws ocean only until then, or if it never loads. */
export function useLand(): GeoPoint[][] | null {
  const [rings, setRings] = useState<GeoPoint[][] | null>(null)
  useEffect(() => {
    let live = true
    land ??= loadLand().catch((err: unknown) => {
      console.error('Could not load the map’s land', err)
      land = null
      return []
    })
    void land.then((r) => {
      if (live) setRings(r)
    })
    return () => {
      live = false
    }
  }, [])
  return rings
}
```

- [ ] **Step 5: Run it to see it pass.** Run `npx vitest run tests/map/land.test.ts`. Expected: PASS. Then run `npx vitest run tests/fixtures` or the full `npm test`. Expected: the source rules still pass, since `loadLand`'s fetch is a plain GET to the site.

- [ ] **Step 6: Ask to commit.** Suggested message: `The world's land for the trip map, from Natural Earth (moving map spec §11)`

---

### Task 12: Paths on screen

**Files:**
- Create: `src/map/svgPaths.ts`.
- Test: `tests/map/svgPaths.test.ts`.

- [ ] **Step 1: Write the failing test.** Create `tests/map/svgPaths.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { copiesFor, linePath, placeAt, polygonsPath, type Viewport } from '../../src/map/svgPaths'

const WORLD: Viewport = { rect: { x: 0, y: 0, width: 1, height: 1 }, width: 360, height: 360 }
const PACIFIC: Viewport = { rect: { x: 0.85, y: 0.2, width: 0.3, height: 0.2 }, width: 300, height: 200 }

describe('paths on screen (moving map spec §11)', () => {
  it('needs only the world copies the view reaches', () => {
    expect(copiesFor(WORLD.rect)).toEqual([0])
    expect(copiesFor(PACIFIC.rect)).toEqual([0, 1])
  })

  it('puts a place where the view shows it, on the copy nearest the middle', () => {
    expect(placeAt({ lat: 0, lng: 0 }, WORLD)).toEqual({ x: 180, y: 180 })
    // Anchorage (150°W) sits right of the date line in a Pacific view, on the next world.
    expect(placeAt({ lat: 61.17, lng: -150 }, PACIFIC).x).toBeGreaterThan(150)
  })

  it('draws a line across the date line in one piece', () => {
    const d = linePath([{ lat: 50, lng: 170 }, { lat: 50, lng: -170 }], PACIFIC)
    const xs = [...d.matchAll(/[ML]([\d.-]+) /g)].map((m) => Number(m[1]))
    expect(Math.abs(xs[1] - xs[0])).toBeLessThan(100)
  })

  it('closes each polygon, once per world copy shown', () => {
    const square = [[{ lat: 10, lng: 170 }, { lat: 10, lng: 179 }, { lat: 0, lng: 179 }, { lat: 0, lng: 170 }]]
    expect((polygonsPath(square, PACIFIC).match(/Z/g) ?? []).length).toBe(2)
    expect(polygonsPath([], PACIFIC)).toBe('')
  })
})
```

- [ ] **Step 2: Run it to see it fail.** Run `npx vitest run tests/map/svgPaths.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.** Create `src/map/svgPaths.ts`:

```ts
import type { GeoPoint } from './greatCircle'
import type { WorldRect } from './mapFit'
import { toWorld, unwrapped, type WorldPoint } from './mercator'

/** The trip map's world shapes and lines as SVG paths in a view (moving map spec §11). */

/** What the view shows (`rect`, in world units) and its size on screen, in px. */
export interface Viewport {
  rect: WorldRect
  width: number
  height: number
}

const round = (v: number) => Math.round(v * 10) / 10

function toScreen(p: WorldPoint, v: Viewport): { x: number; y: number } {
  return { x: round(((p.x - v.rect.x) / v.rect.width) * v.width), y: round(((p.y - v.rect.y) / v.rect.height) * v.height) }
}

/** The copies of the world the view reaches: 0 is the first, 1 the next one east. */
export function copiesFor(rect: WorldRect): number[] {
  const copies: number[] = []
  for (let k = Math.floor(rect.x); k < rect.x + rect.width; k++) copies.push(k)
  return copies
}

/** The world copy that puts `x` nearest the middle of the view. */
const nearMiddle = (x: number, rect: WorldRect) => x + Math.round(rect.x + rect.width / 2 - x)

/** Where a place is on screen, on the copy of the world nearest the middle of the view. */
export function placeAt(place: GeoPoint, v: Viewport): { x: number; y: number } {
  const p = toWorld(place)
  return toScreen({ x: nearMiddle(p.x, v.rect), y: p.y }, v)
}

/** A line through `points`, laid out in one piece across the date line, on the copy nearest the middle. */
export function linePath(points: GeoPoint[], v: Viewport): string {
  if (points.length === 0) return ''
  const laid = unwrapped(points.map(toWorld))
  const middle = laid[Math.floor(laid.length / 2)].x
  const shift = nearMiddle(middle, v.rect) - middle
  return laid.map((p, i) => {
    const s = toScreen({ x: p.x + shift, y: p.y }, v)
    return `${i === 0 ? 'M' : 'L'}${s.x} ${s.y}`
  }).join(' ')
}

/** Closed shapes on every copy of the world the view reaches, as one path. */
export function polygonsPath(polygons: GeoPoint[][], v: Viewport): string {
  const parts: string[] = []
  const copies = copiesFor(v.rect)
  for (const polygon of polygons) {
    if (polygon.length < 3) continue
    const world = polygon.map(toWorld)
    for (const k of copies) {
      parts.push(world.map((p, i) => {
        const s = toScreen({ x: p.x + k, y: p.y }, v)
        return `${i === 0 ? 'M' : 'L'}${s.x} ${s.y}`
      }).join(' ') + ' Z')
    }
  }
  return parts.join(' ')
}
```

  > Land and night rings are drawn as given. Their edges never cross the date line: NightShade cuts its shapes there, and Natural Earth splits its land there too. So a copy is a plain shift.

- [ ] **Step 4: Run it to see it pass.** Run the same command. Expected: PASS.

- [ ] **Step 5: Ask to commit.** Suggested message: `The trip map's shapes and lines as SVG paths, across the date line (moving map spec §11)`

---

### Task 13: The drawing and the card on the status page

**Files:**
- Create: `src/ui/TripMapSvg.tsx`, `src/ui/TripMapCard.tsx`, `src/styles/tripMap.css`.
- Modify: `src/ui/StatusScreen.tsx`, `src/ui/PilotPages.tsx`, `src/ui/InFlightCard.tsx`, `src/ui/inFlightFacts.ts`, and the stylesheet index, wherever the other `src/styles/*.css` files are imported (`grep -rn "inFlight.css" src`).
- Delete: `src/ui/FlightMap.tsx`, `src/ui/flightMapGeometry.ts`, `src/ui/flightSky.ts`, `tests/ui/FlightMap.test.tsx`, `tests/ui/flightMapGeometry.test.ts`, `tests/ui/flightSky.test.ts`.
- Test: `tests/ui/TripMapCard.test.tsx`.

- [ ] **Step 1: Write the failing test.** Create `tests/ui/TripMapCard.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import { makeTripMap } from '../../src/map/tripMap'
import { TripMapCard } from '../../src/ui/TripMapCard'
import { AIRPORTS, at, EUROPE } from '../map/tripMapLegs'

const NY = 'America/New_York'
const card = (now: number, extra = {}) => {
  const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now, airports: AIRPORTS })!
  const onOpenMap = vi.fn()
  const onOpenTracking = vi.fn()
  render(
    <TripMapCard map={map} now={now} viewerTz={NY} h24={false} name="Alex" day={1} days={4} delayMinutes={null} land={null}
      onOpenMap={onOpenMap} onOpenTracking={onOpenTracking} {...extra} />,
  )
  return { map, onOpenMap, onOpenTracking }
}

describe('the trip map card (moving map spec §5)', () => {
  it('opens the full map from the map, named by its one-sentence summary', () => {
    const { onOpenMap } = card(at(12))
    const button = screen.getByRole('button', { name: /^Trip map\. Alex is in Cologne\./ })
    fireEvent.click(button)
    expect(onOpenMap).toHaveBeenCalledWith(button)
  })

  it('shows the day, cities and miles on the ground', () => {
    card(at(12))
    expect(screen.getByText('Day 1 of 4')).toBeTruthy()
    expect(screen.getByText('2 cities')).toBeTruthy()
  })

  it('shows the flight and its landing in the air, and the flight number opens tracking', () => {
    const { map, onOpenTracking } = card(at(4))
    expect(screen.getByText('Lands 3:00 PM')).toBeTruthy()
    const number = screen.getByRole('button', { name: `${map.legs[0].flightNumber}. Opens flight tracking.` })
    fireEvent.click(number)
    expect(onOpenTracking).toHaveBeenCalledWith(number)
  })

  it('shows the delay banner in the air', () => {
    card(at(4), { delayMinutes: 45 })
    expect(document.querySelector('.inflight-banner.late')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run it to see it fail.** Run `npx vitest run tests/ui/TripMapCard.test.tsx`. Expected: FAIL.

- [ ] **Step 3: The drawing.** Create `src/ui/TripMapSvg.tsx`:

```tsx
import { useMemo } from 'preact/hooks'
import { ICON_PATHS, type IconName } from '../icons/iconPaths'
import type { GeoPoint } from '../map/greatCircle'
import { fitRect, toAspect } from '../map/mapFit'
import { LAYER_ALPHA, nightLayers } from '../map/nightShade'
import { pointsAlong } from '../map/greatCircle'
import { linePath, placeAt, polygonsPath, type Viewport } from '../map/svgPaths'
import { framingPoints, type MapLeg, type TripMap } from '../map/tripMap'
import { nightTime, tripMapDrawing } from '../map/tripMapDrawing'

export interface TripMapSvgProps {
  map: TripMap
  /** The trip time to draw. */
  t: number
  width: number
  height: number
  /** The leg the view frames, or null for the whole trip and home. */
  focus: MapLeg | null
  land: GeoPoint[][] | null
  /** How often the night is redrawn, in ms of trip time (`nightTime`). */
  nightStep: number
}

/** A Phosphor icon (256 units, pointing up) centred on `at`, `size` px wide, turned `degrees` clockwise. */
function Mark({ name, at, size, degrees = 0, class: cls }: { name: IconName; at: { x: number; y: number }; size: number; degrees?: number; class: string }) {
  return (
    <g class={cls} transform={`translate(${at.x} ${at.y}) rotate(${degrees}) scale(${size / 256}) translate(-128 -128)`}>
      {ICON_PATHS[name].map((d, i) => <path key={i} d={d} />)}
    </g>
  )
}

/**
 * The trip map (moving map spec §7.1, §11): ocean, land, night, routes, airports, cars, the heart and the plane, drawn by
 * the site in SVG. The card and the full map describe it in words, so to screen readers it's hidden.
 */
export function TripMapSvg({ map, t, width, height, focus, land, nightStep }: TripMapSvgProps) {
  const rect = useMemo(() => toAspect(fitRect(framingPoints(map, focus)) ?? { x: 0, y: 0, width: 1, height: 1 }, width / height), [map, focus, width, height])
  const view: Viewport = { rect, width, height }
  const landPath = useMemo(() => (land ? polygonsPath(land, view) : ''), [land, rect, width, height])
  const night = nightTime(t, nightStep)
  const nightPaths = useMemo(() => nightLayers(night).map((shapes) => polygonsPath(shapes, view)), [night, rect, width, height])
  const drawing = tripMapDrawing(map, t)
  return (
    <svg class="trip-map-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <rect class="trip-map-ocean" width={width} height={height} />
      {landPath && <path class="trip-map-land" d={landPath} />}
      {nightPaths.map((d, i) => <path key={i} class="trip-map-night" d={d} fill-opacity={LAYER_ALPHA} />)}
      {drawing.segments.map((s) => (
        <path key={s.id} class={`trip-map-route ${s.style}`} d={linePath(s.geodesic ? pointsAlong(s.from, s.to, 101) : [s.from, s.to], view)} />
      ))}
      {drawing.airports.map((a) => {
        const at = placeAt(a.place, view)
        return (
          <g key={a.code} class="trip-map-airport">
            <circle cx={at.x} cy={at.y} r={3.5} />
            <text x={at.x} y={at.y + 16}>{a.code}</text>
          </g>
        )
      })}
      {drawing.cars.map((c) => <Mark key={c.id} name="Car" at={placeAt(c.place, view)} size={16} class="trip-map-car" />)}
      {drawing.pin && <Mark name="Heart" at={placeAt(drawing.pin.place, view)} size={22} class="trip-map-heart" />}
      {drawing.plane && (
        // The site's plane icon points up, so it turns a quarter more than the screen angle.
        <Mark name="Airplane" at={placeAt(drawing.plane.place, view)} size={22} degrees={(drawing.plane.angle * 180) / Math.PI + 90} class="trip-map-plane" />
      )}
    </svg>
  )
}
```

- [ ] **Step 4: The card.** Create `src/ui/TripMapCard.tsx`:

```tsx
import type { Ref } from 'preact'
import { useRef } from 'preact/hooks'
import { delayBannerText, spokenDelayBanner } from '../copy/flight'
import { arrivalLocalTime, cardChips, landsAt, statsItems, tripMapSummary } from '../copy/tripMap'
import type { GeoPoint } from '../map/greatCircle'
import { currentLeg, type MapLeg, type TripMap } from '../map/tripMap'
import { useWidth } from './hooks/useWidth'
import { Icon } from './Icon'
import { TripMapSvg } from './TripMapSvg'

export interface TripMapCardProps {
  map: TripMap
  now: number
  viewerTz: string
  h24: boolean
  /** The pilot's name, for the spoken summary. */
  name: string
  day: number | null
  days: number | null
  /** The departure's delay when it's 15 minutes or more, shown under the map in flight, as the in-flight card did. */
  delayMinutes: number | null
  land: GeoPoint[][] | null
  onOpenMap: (button: HTMLButtonElement) => void
  /** Opens the tracking popup from the flight number, when the flight has tracking. */
  onOpenTracking?: (button: HTMLButtonElement) => void
  /** The card's heading, which takes focus when a popup closes by itself (popup follow-ups §4.2). */
  headingRef?: Ref<HTMLHeadingElement>
}

const MAP_HEIGHT = 220

/**
 * The trip map on the status page (moving map spec §5). In flight it takes the in-flight card's place. On the ground it
 * sits above the location card, which keeps its weather and sun dial. Tapping the map opens the full map at #map.
 */
export function TripMapCard(p: TripMapCardProps) {
  const box = useRef<HTMLDivElement>(null)
  const width = useWidth(box, 343)
  const leg = currentLeg(p.map)
  const chips = cardChips(p.map, p.now, p.viewerTz, p.h24)
  return (
    <section class="card glass trip-map-card">
      <h2 ref={p.headingRef} class="sr-only" tabIndex={-1}>{leg ? 'In flight' : 'Trip map'}</h2>
      <button type="button" class="trip-map-open" data-trip-map-open aria-label={tripMapSummary(p.map, p.now, p.name, p.viewerTz, p.h24)}
        onClick={(e) => p.onOpenMap(e.currentTarget)}>
        <div ref={box} class="trip-map-frame">
          <TripMapSvg map={p.map} t={p.now} width={width} height={MAP_HEIGHT} focus={leg} land={p.land} nightStep={60_000} />
        </div>
        {chips.top && <span class="trip-map-chip top" aria-hidden="true">{chips.top}</span>}
        {chips.bottom && <span class="trip-map-chip bottom" aria-hidden="true">{chips.bottom}</span>}
      </button>
      {leg && p.delayMinutes != null && (
        <p class={p.delayMinutes < 0 ? 'inflight-banner early' : 'inflight-banner late'}>
          <Icon name={p.delayMinutes < 0 ? 'CheckCircle' : 'Warning'} size={12} />
          <span aria-hidden="true">{delayBannerText(p.delayMinutes)}</span>
          <span class="sr-only">{spokenDelayBanner(p.delayMinutes)}</span>
        </p>
      )}
      {leg ? <InFlightBar leg={leg} {...p} /> : <StatsBar items={statsItems(p.map, p.now, p.day, p.days, p.viewerTz)} />}
    </section>
  )
}

function InFlightBar({ leg, viewerTz, h24, onOpenTracking }: TripMapCardProps & { leg: MapLeg }) {
  const local = arrivalLocalTime(leg, viewerTz, h24)
  return (
    <div class="inflight-bar">
      <div class="inflight-flight">
        {leg.flightNumber && onOpenTracking ? (
          <button type="button" class="inflight-number" aria-label={`${leg.flightNumber}. Opens flight tracking.`} aria-haspopup="dialog"
            onClick={(e) => onOpenTracking(e.currentTarget)}>
            {leg.flightNumber}
          </button>
        ) : leg.flightNumber && <span class="inflight-number">{leg.flightNumber}</span>}
        <span class="inflight-status">In flight</span>
      </div>
      <div class="inflight-arrival">
        <p class="inflight-time">{landsAt(leg, viewerTz, h24)}</p>
        {local && <span class="inflight-code">{local}</span>}
      </div>
    </div>
  )
}

function StatsBar({ items }: { items: string[] }) {
  return (
    <ul class="trip-map-stats">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  )
}
```

- [ ] **Step 5: The styles.** Create `src/styles/tripMap.css` and import it wherever `inFlight.css` is imported:

```css
/* The trip map (moving map spec §5, §6, §11): the site's own drawing of the world, the trip and the night. */
.trip-map-card,
.trip-map-page {
  --trip-ocean: rgb(78%, 87%, 95%);
  --trip-land: rgb(95%, 93%, 87%);
  --trip-land-edge: rgb(80%, 78%, 70%);
  --trip-night: rgb(2%, 5%, 16%);
  --trip-route: var(--blue);
  --trip-flown: var(--gray);
  --trip-text: #000000;
}

@media (prefers-color-scheme: dark) {
  .trip-map-card,
  .trip-map-page {
    --trip-ocean: rgb(6%, 10%, 18%);
    --trip-land: rgb(17%, 21%, 29%);
    --trip-land-edge: rgb(28%, 32%, 40%);
    --trip-route: var(--cyan);
    --trip-text: #ffffff;
  }
}

.trip-map-open {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.trip-map-frame {
  height: 220px;
  overflow: hidden;
  border-radius: 20px 20px 0 0;
}

.trip-map-svg { display: block; }
.trip-map-ocean { fill: var(--trip-ocean); }
.trip-map-land { fill: var(--trip-land); stroke: var(--trip-land-edge); stroke-width: 0.5; }
.trip-map-night { fill: var(--trip-night); }
.trip-map-route { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.trip-map-route.upcoming { stroke: var(--trip-route); stroke-width: 2; stroke-dasharray: 6 6; }
.trip-map-route.flying { stroke: var(--trip-route); stroke-width: 3; }
.trip-map-route.flown { stroke: var(--trip-flown); stroke-width: 2.5; }
.trip-map-route.drive { stroke: var(--trip-flown); stroke-width: 3; stroke-dasharray: 0.5 6; }
.trip-map-airport circle { fill: #ffffff; stroke: rgba(0, 0, 0, 0.4); stroke-width: 0.5; }
.trip-map-airport text { fill: var(--trip-text); font-size: 11px; font-weight: 600; text-anchor: middle; }
.trip-map-plane { fill: var(--trip-route); stroke: #ffffff; stroke-width: 8; paint-order: stroke; }
.trip-map-heart { fill: var(--pink, #ff2d55); stroke: #ffffff; stroke-width: 10; paint-order: stroke; }
.trip-map-car { fill: var(--trip-text); }

.trip-map-chip {
  position: absolute;
  left: 10px;
  max-width: calc(100% - 20px);
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--glass, rgba(255, 255, 255, 0.75));
  backdrop-filter: blur(12px);
  font-size: 0.8rem;
  font-weight: 600;
}
.trip-map-chip.top { top: 10px; }
.trip-map-chip.bottom { bottom: 10px; }

.trip-map-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
  margin: 0;
  padding: 10px 16px;
  list-style: none;
  color: var(--secondary);
  font-size: 0.9rem;
  font-weight: 500;
}
```

> Check the token names `--blue`, `--cyan`, `--gray`, `--secondary` and `--glass` against `src/styles/tokens.css`. Use the site's names where they differ; the fallbacks above are only a guard.

- [ ] **Step 6: Place the card.**
  - In `src/ui/PilotPages.tsx`:
    - add `import { tripMapFor } from '../map/tripMapFor'` and `import { useLand } from './hooks/useLand'`;
    - call `const land = useLand()` beside the other hooks, before the early return;
    - after `snap` is known, add `const tripMap = tripMapFor(snap, ready.legs, airports)` and add `tripMap, land` to the `status` object.
  - In `src/ui/StatusScreen.tsx`:
    - add the props `tripMap?: TripMap | null` and `land?: GeoPoint[][] | null`, with their imports;
    - add `const mapFlying = p.tripMap?.mode.kind === 'inFlight'`;
    - render the card just above `{facts && (<LocationCard`:

```tsx
      {p.tripMap && (
        <TripMapCard map={p.tripMap} now={p.now} viewerTz={p.viewerTz} h24={p.h24} name={snap.name}
          day={snap.tripProgress?.day ?? null} days={snap.tripProgress?.days ?? null} delayMinutes={snap.delay?.minutes ?? null}
          land={p.land ?? null} onOpenMap={p.onOpenMap ?? (() => {})}
          onOpenTracking={flying?.trackingNumber ? tracking.show : undefined} headingRef={mapFlying ? inFlightHeading : undefined} />
      )}
```

  - Then change `{flying && (<InFlightCard` to `{flying && !mapFlying && (<InFlightCard`. The in-flight card shows only when the map can't draw this flight (spec §12).
  - Add `onOpenMap?: (button: HTMLButtonElement) => void` to `StatusScreenProps`. Task 14 supplies it.

- [ ] **Step 7: The in-flight card becomes the fallback, and the old map goes.**
  - In `src/ui/InFlightCard.tsx`, replace `<FlightMap facts={facts} now={now} h24={h24} />` with:

```tsx
      <div class="flight-map-fallback" aria-hidden="true">
        <Icon name="Airplane" size={24} />
        <span>{`${facts.dep.code} → ${facts.arr.code}`}</span>
      </div>
```

  - Remove its `FlightMap` import.
  - In `src/ui/inFlightFacts.ts`, change `import type { GeoPoint } from './flightMapGeometry'` to `import type { GeoPoint } from '../map/greatCircle'`.
  - Find what else used the old map before deleting:

```bash
grep -rn "flightMapGeometry\|flightSky\|FlightMap\b\|flightProgress(" src tests
```

  - Delete `src/ui/FlightMap.tsx`, `src/ui/flightMapGeometry.ts`, `src/ui/flightSky.ts`, `tests/ui/FlightMap.test.tsx`, `tests/ui/flightMapGeometry.test.ts` and `tests/ui/flightSky.test.ts`.
  - If `grep` shows other users, such as `flightMapLabel` or `distanceText` in `src/copy/flight.ts`, leave those functions; they're harmless. Update any test that rendered the old map: `tests/ui/InFlightCard.test.tsx` expects the fallback now.
  - Keep `.flight-map-fallback`'s styles in `inFlight.css` and drop the rest of the old map's rules.

- [ ] **Step 8: Run everything.** Run `npm test` and `npm run build`. Expected: both pass. Fix any test that pinned the old map's markup, keeping what it checked about the card.

- [ ] **Step 9: Ask to commit.** Suggested message: `The trip map card: the whole trip on the ground, the plane in the air, drawn by the site (moving map spec §5, §11)`

---

### Task 14: The full map at `#map`

**Files:**
- Create: `src/ui/hooks/useTripMapPage.ts`, `src/ui/hooks/useFrameClock.ts`, `src/ui/TripTimeline.tsx`, `src/ui/TripMapPage.tsx`.
- Modify: `src/ui/PilotPages.tsx`, `src/styles/tripMap.css`.
- Test: `tests/ui/TripMapPage.test.tsx`.

- [ ] **Step 1: Write the failing test.** Create `tests/ui/TripMapPage.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import { makeTripMap } from '../../src/map/tripMap'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { AIRPORTS, at, EUROPE } from '../map/tripMapLegs'

const page = (now = at(12)) => {
  const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now, airports: AIRPORTS })!
  const onBack = vi.fn()
  render(<TripMapPage map={map} now={now} viewerTz="America/New_York" h24={false} day={1} days={4} land={null} onBack={onBack} />)
  return { onBack }
}

describe('the full map (moving map spec §6)', () => {
  it('names where things stand, and closes from its button and Escape', () => {
    const { onBack } = page()
    expect(screen.getByRole('heading', { level: 1, name: 'Day 1 of 4' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close map' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onBack).toHaveBeenCalledTimes(2)
  })

  it('replays from the timeline and goes back to Live', () => {
    page()
    expect(screen.queryByRole('button', { name: 'Live' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Replay the trip' }))
    expect(screen.getByRole('button', { name: 'Pause replay' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Live' }))
    expect(screen.getByRole('button', { name: 'Replay the trip' })).toBeTruthy()
  })

  it('has a slider for the trip time and a speed choice', () => {
    page()
    expect(screen.getByRole('slider', { name: 'Trip time' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Replay speed' })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run it to see it fail.** Run `npx vitest run tests/ui/TripMapPage.test.tsx`. Expected: FAIL.

- [ ] **Step 3: The frame clock.** Create `src/ui/hooks/useFrameClock.ts`:

```ts
import { useEffect, useState } from 'preact/hooks'

/** The time, every animation frame while `active` (a replay playing), else `fallback`: the page's once-a-second now. */
export function useFrameClock(active: boolean, fallback: number): number {
  const [frame, setFrame] = useState(fallback)
  useEffect(() => {
    if (!active) return
    let id = requestAnimationFrame(function tick() {
      setFrame(Date.now())
      id = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [active])
  return active ? frame : fallback
}
```

- [ ] **Step 4: The timeline.** Create `src/ui/TripTimeline.tsx`:

```tsx
import { timelineTime } from '../copy/tripMap'
import {
  clockTime, goLive, hasFinished, isLive, isPlaying, pause, play, REPLAY_SPEEDS, scrub, setSpeed, type ReplayClock, type ReplaySpeed,
} from '../map/replayClock'

export interface TripTimelineProps {
  clock: ReplayClock
  onChange: (clock: ReplayClock) => void
  now: number
  viewerTz: string
  h24: boolean
}

/** Play, drag through the trip, go back to Live, and pick 1x to 10x (moving map spec §6). */
export function TripTimeline({ clock, onChange, now, viewerTz, h24 }: TripTimelineProps) {
  const t = clockTime(clock, now)
  const showsPause = isPlaying(clock) && !hasFinished(clock, now)
  const { start, end } = clock.span
  return (
    <div class="trip-timeline">
      <div class="trip-timeline-row">
        <button type="button" class="trip-timeline-play" aria-label={showsPause ? 'Pause replay' : 'Replay the trip'}
          onClick={() => onChange(showsPause ? pause(clock, Date.now()) : play(clock, Date.now()))}>
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            {showsPause ? <path d="M5 3h3v14H5zM12 3h3v14h-3z" /> : <path d="M6 3l11 7-11 7z" />}
          </svg>
        </button>
        <input type="range" class="trip-timeline-slider" aria-label="Trip time" aria-valuetext={timelineTime(t, viewerTz, h24)}
          min={start} max={Math.max(end, start + 1)} step={60_000} value={Math.min(Math.max(t, start), end)}
          onInput={(e) => onChange(scrub(clock, Number(e.currentTarget.value)))} />
        {!isLive(clock) && (
          <button type="button" class="trip-timeline-live" onClick={() => onChange(goLive(clock))}>Live</button>
        )}
      </div>
      <div class="trip-timeline-row">
        <span class="trip-timeline-time" aria-hidden="true">{timelineTime(t, viewerTz, h24)}</span>
        <select class="trip-timeline-speed" aria-label="Replay speed" value={String(clock.speed)}
          onChange={(e) => onChange(setSpeed(clock, Number(e.currentTarget.value) as ReplaySpeed, Date.now()))}>
          {REPLAY_SPEEDS.map((s) => <option key={s} value={String(s)}>{`${s}×`}</option>)}
        </select>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: The page.** Create `src/ui/TripMapPage.tsx`:

```tsx
import { useEffect, useRef, useState } from 'preact/hooks'
import { panelHeadline, topPill } from '../copy/tripMap'
import type { GeoPoint } from '../map/greatCircle'
import { clockTime, isPlaying, liveClock, REPLAY_BASE_RATE } from '../map/replayClock'
import { currentLeg, legInMotion, type TripMap } from '../map/tripMap'
import { useFrameClock } from './hooks/useFrameClock'
import { useWidth } from './hooks/useWidth'
import { Icon } from './Icon'
import { TripMapSvg } from './TripMapSvg'
import { TripTimeline } from './TripTimeline'

export interface TripMapPageProps {
  map: TripMap
  now: number
  viewerTz: string
  h24: boolean
  day: number | null
  days: number | null
  land: GeoPoint[][] | null
  onBack: () => void
}

/**
 * The full map at #map (moving map spec §6, §11): the trip, framed on the leg in motion or the whole trip, with a
 * timeline to replay it. Back, the close button and Escape all close it. It doesn't pan or zoom in Stage 1.
 */
export function TripMapPage({ map, now, viewerTz, h24, day, days, land, onBack }: TripMapPageProps) {
  const [clock, setClock] = useState(() => liveClock(map.span))
  const frameNow = useFrameClock(isPlaying(clock), now)
  const t = clockTime(clock, frameNow)
  const box = useRef<HTMLDivElement>(null)
  const width = useWidth(box, 390)
  const heading = useRef<HTMLHeadingElement>(null)
  const focus = legInMotion(map, t) ?? (t === now ? currentLeg(map) : null)

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onBack])

  // Night moves about a degree every four minutes: live it's redrawn each minute; in replay about ten times a second.
  const nightStep = isPlaying(clock) ? (REPLAY_BASE_RATE / 10) * clock.speed * 1000 : 60_000
  const height = Math.max(240, Math.round(width * 0.75))
  return (
    <main class="trip-map-page">
      <header class="trip-map-top">
        <button type="button" class="trip-map-close" aria-label="Close map" onClick={onBack}>
          <Icon name="XCircle" size={28} />
        </button>
        <h1 ref={heading} class="trip-map-pill" tabIndex={-1}>{topPill(map, t, day, days)}</h1>
      </header>
      <div ref={box} class="trip-map-full">
        <TripMapSvg map={map} t={t} width={width} height={height} focus={focus} land={land} nightStep={nightStep} />
      </div>
      <section class="trip-map-panel" aria-label="Timeline">
        <p class="trip-map-headline">{panelHeadline(map, t, viewerTz, h24)}</p>
        <TripTimeline clock={clock} onChange={setClock} now={frameNow} viewerTz={viewerTz} h24={h24} />
      </section>
    </main>
  )
}
```

  > `useWidth`'s first argument type is `RefObject<HTMLElement>`. If TypeScript objects to `HTMLDivElement`, cast as the card does (check `TripMapCard`'s call).

- [ ] **Step 6: The address.** Create `src/ui/hooks/useTripMapPage.ts`, a smaller cousin of `useSchedulePage`:

```ts
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'

export const MAP_HASH = '#map'
const OPENED_HERE = 'crewluveTripMap'
const atMap = () => window.location.hash === MAP_HASH

/**
 * Whether the full map shows, by the address (moving map spec §6): at #map. Opening adds a history entry, so the phone's
 * Back returns to the status page. Closing puts focus back on the card's map and the page back where it was scrolled.
 */
export function useTripMapPage() {
  const [open, setOpen] = useState(atMap)
  const statusScroll = useRef(0)
  const wasOpen = useRef(open)

  useEffect(() => {
    const follow = () => setOpen(atMap())
    window.addEventListener('popstate', follow)
    window.addEventListener('hashchange', follow)
    return () => {
      window.removeEventListener('popstate', follow)
      window.removeEventListener('hashchange', follow)
    }
  }, [])

  useLayoutEffect(() => {
    if (wasOpen.current && !open) {
      document.querySelector<HTMLElement>('[data-trip-map-open]')?.focus({ preventScroll: true })
      window.scrollTo(0, statusScroll.current)
    }
    wasOpen.current = open
  }, [open])

  return {
    open,
    show: () => {
      statusScroll.current = window.scrollY
      history.pushState({ [OPENED_HERE]: true }, '', MAP_HASH)
      setOpen(true)
    },
    back: () => {
      if (history.state?.[OPENED_HERE] === true) {
        history.back()
        return
      }
      history.replaceState(null, '', window.location.pathname + window.location.search)
      setOpen(false)
    },
  }
}
```

- [ ] **Step 7: Route to it.**
  - In `src/ui/PilotPages.tsx`, add `const mapPage = useTripMapPage()` beside `useSchedulePage`, before the early return.
  - Add `onOpenMap: mapPage.show` to the `status` object.
  - Just after `const status = …`, before the side-by-side branch, add:

```tsx
  if (mapPage.open && tripMap) {
    return <TripMapPage map={tripMap} now={now} viewerTz={viewerTz} h24={h24} day={snap.tripProgress?.day ?? null}
      days={snap.tripProgress?.days ?? null} land={land} onBack={mapPage.back} />
  }
```

  A `#map` address with no trip to show falls through to the status page.

- [ ] **Step 8: The page's styles.** Append to `src/styles/tripMap.css`:

```css
.trip-map-page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  background: var(--trip-ocean);
}
.trip-map-top { display: flex; align-items: center; gap: 12px; padding: 8px 16px; }
.trip-map-close { min-width: 44px; min-height: 44px; border: 0; background: none; color: inherit; cursor: pointer; }
.trip-map-pill { margin: 0; padding: 6px 12px; border-radius: 999px; background: var(--glass, rgba(255, 255, 255, 0.75)); font-size: 1rem; }
.trip-map-full { flex: 1; overflow: hidden; }
.trip-map-panel { margin: 0 16px 16px; padding: 16px; border-radius: 24px; background: var(--glass, rgba(255, 255, 255, 0.85)); backdrop-filter: blur(16px); }
.trip-map-headline { margin: 0 0 12px; font-weight: 600; }
.trip-timeline-row { display: flex; align-items: center; gap: 12px; }
.trip-timeline-row + .trip-timeline-row { margin-top: 8px; justify-content: space-between; }
.trip-timeline-play { min-width: 44px; min-height: 44px; border: 0; background: none; color: inherit; fill: currentColor; cursor: pointer; }
.trip-timeline-slider { flex: 1; }
.trip-timeline-live { min-height: 44px; padding: 0 14px; border-radius: 999px; }
.trip-timeline-time { color: var(--secondary); font-size: 0.85rem; font-variant-numeric: tabular-nums; }

@media (min-width: 900px), (orientation: landscape) and (max-height: 500px) {
  .trip-map-panel { position: fixed; left: 16px; bottom: 16px; width: 380px; margin: 0; }
}
```

- [ ] **Step 9: Run everything.** Run `npm test` and `npm run build`. Expected: both pass.

- [ ] **Step 10: Ask to commit.** Suggested message: `The full trip map at #map, with a replayable timeline (moving map spec §6)`

---

### Task 15: Docs, and a look at every state

- [ ] **Step 1: README.** In `README.md`:
  - under the Demo line, add: "Trip map: the card on every scene with a trip; tap it, or add `#map`, for the full map."
  - under "Regenerate data", add `npm run land           # public/data/land.json (Natural Earth 1:110m land, scripts/ne_110m_land.geojson)`.

- [ ] **Step 2: Look at every state (Todd).** Run `npm run dev`, then open `http://localhost:5180/?demo=1&scene=…` for each scene:
  - **`flying`:** the card takes the in-flight card's place, the leg is framed, and the plane follows the schedule. The flight number opens tracking, and the delay banner shows on `delayed`.
  - **`layover`:** the whole trip, the heart on the layover city, "… there" and "Next: …", and the location card still beneath with its weather and sun dial.
  - **`home`:** the next trip's route, dashed, with the heart at home and "Home · next trip …".
  - **`driving-home`:** the car on the drive.
  - **Tap the map:** the full map opens at `#map`. Replay at 10× runs the trip in about 15 seconds with the night sweeping smoothly. Live, Escape and the phone's Back all work.
  - **Dark mode, a narrow phone width, and a wide window,** where the panel moves to the side.

- [ ] **Step 3: Ask to commit.** Suggested message: `The trip map in the README, and npm run land`
  - Remind Todd that publishing is a push to `main` (docs/DEPLOY.md), and his call.

---

## Changes made during execution (2026-11-13)

Changes made to the code after it was written from this plan, from running it and from review. The code, not the blocks above, is the reference for these:

- **Task 4:** the "stay inside the map" test counts points outside the map and asserts once, as the shading test above it does. Its few million per-point `expect`s took 10 s, past Vitest's 5 s limit. The shading test has a 30 s limit: it checks about two million places, a second alone but past 5 s while the whole suite runs.
- **Task 6:** the date-line test also checks that the rectangle runs on past the right edge, so it can't pass by luck with a small positive `x`.
- **Task 7:** the airborne-window test also covers an arrival before the departure.
- **Tasks 8–9:** the `make` (and `styles`) test helpers in `tripMap.test.ts` and `tripMapDrawing.test.ts` type their legs as `Leg[]`. With only the default, TypeScript took them as flights and rejected the drive test (`npx tsc --noEmit` failed; Vitest doesn't type-check).
- **Task 8, from review:**
  - A night at home in the middle of a trip is that trip, under way: `tripMapFor` makes it with `isNextTrip: !snap.midTripAtHome`. The snapshot's upcoming trip is the rest of the current trip then, and as a next trip the card read "Home · next trip" with a date already past. The app does the same; it's a follow-up there.
  - A van or bus between airports (`ground` moves) is drawn and counted as a drive, with no flight number, not as a flight. The app's legs have no such kind.
  - New tests: `shows a night at home in the middle of a trip as that trip, under way` and `draws a van or bus between airports as a drive, never in flight`.
- **Task 9:** `isPlaying`'s doc says to check `hasFinished`, as the app's does.
- **Task 10, from review:**
  - The next trip's spoken summary leaves out the colon and list when its flights only come home ("Map of the next trip, tomorrow.").
  - On a trip with no flights, such as the commute home the map falls back to, the bar leaves out "0 mi so far". A drive under way gives the card's top chip "Driving to Louisville" and the summary "Alex is driving to Louisville.", the words the full map's pill already uses.
  - New tests: `names a drive under way, and leaves out the counts a trip without flights lacks` and `reads a next trip that only comes home without an empty list of cities`.
- **Task 10, from the fixes' review:** a next trip whose legs have no flights leaves out "0 mi" too.
- **Task 11, from review:**
  - `build-land.mjs` keeps each polygon's holes as rings too. At 1:110m the only one is the Caspian Sea, which the outer rings alone drew as land, a thousand kilometres of it beside the CGN → DXB example. The map fills its land even-odd (`.trip-map-land { fill-rule: evenodd }`), so the hole shows as water. `land.json` is 128 rings, 5,122 points, 65 KB.
  - The script's header names the source file's URL, since the file is git-ignored.
  - New test: `keeps the Caspian Sea as water, and Antarctica reaching both edges of the map`.
- **Task 12, from review:** `polygonsPath` leaves out a shape, on each copy of the world, whose box misses the view. Zoomed in on one leg, the land made an 85 KB path of points far off screen. Its test now checks shapes on each side of the date line and one out of view.
- **Task 13, in writing it:**
  - CSS uses the site's token names: `--text-2` for `--secondary`, `--glass-fill` for `--glass`; each `backdrop-filter` has its `-webkit-` pair, which `tests/styles/styles.test.ts` requires.
  - `PilotPages` passes `ready?.legs ?? []`: TypeScript can't see that `snap` is only set with `ready`.
  - The card's test runs under happy-dom with `afterEach(cleanup)`, as the site's other UI tests do.
  - `inFlight.css` keeps `.flight-map-fallback` as a row with the plane and "SDF → CGN"; the old map's rules, colours and their style tests went with it.
- **Task 14, in writing it:**
  - `TripMapPage` focuses its heading once, in an effect of its own. In the plan the focus shared the Escape listener's effect, keyed on `onBack`, a new function each second, so the heading took focus from the slider every second. A test re-renders with a new `onBack` and checks the slider keeps focus.
  - The page opens scrolled to the top: the status page may have been scrolled down to the card.
  - The replay test awaits "Pause replay": the replay starts from the real clock while the test's page time is the fixture's, so they agree only from the first animation frame.
  - `.trip-map-page` has `min-height: 100vh` before `100dvh` (later `height`), the site's fallback pattern.
- **Tasks 13–14, from review:**
  - Lines are drawn on every copy of the world the view reaches (`linePath`), as land is. A round-the-world trip frames wider than one world, and markers sat on another copy than their line, hundreds of pixels away.
  - The full map fills the screen, as spec §6 says: the page is the viewport's height, and `useSize` (which `useWidth` now wraps) measures the map's box, where the plan drew a 4:3 box from the width.
  - The card clips to its rounded corners (`overflow: hidden`, with an inset focus ring); the in-flight bar and a lone drive's map stuck out past them.
  - Tap targets are 44 px: the flight number (padding and a matching negative margin) and the speed picker.
  - The replay's animation-frame loop stops when the replay reaches the trip's end (`finishesAt`, and `useFrameClock`'s `stopAt`), where it re-rendered 60 times a second until Live.
  - The panel's headline is an `h2`, sized as body text.
  - The map's box in the card is a `span`: a `div` can't sit inside a `button`.
  - The page's clock always takes the map's current span, and `TripMapSvg`'s land and night paths are memoised on the view's four numbers, not on a rect remade each second.
  - The slider moves in 15-minute steps, over whole steps, so its last one reaches the trip's end.
  - Airport codes have a halo in the ocean's colour, and a code that would overlap one already drawn is left out, its dot kept: SDF and LEX printed as "SDLEX".
  - The land loads only when there's a map to draw (`useLand(enabled)`), and `PilotPages`'s tests mock it.
  - `onOpenMap` takes no argument: `useTripMapPage` finds the card's map itself, since the status page remounts when the map closes.
  - The old map's helpers that nothing used any more went, with their tests: `flightDurationText`, `distanceText`, `progressWords`, `flightMapLabel` (`src/copy/flight.ts`) and `flightProgress` (`src/ui/inFlightFacts.ts`).
  - New tests: the map card in place of the in-flight card and the fallback without a map (`StatusScreen`), `#map` with and without a trip and Escape back to the card (`PilotPages`), lines on every world copy (`svgPaths`), overlapping codes (`TripMapSvg`), the frame loop stopping (`useFrameClock`), `finishesAt`, and the slider and the replay moving time (`TripMapPage`).
- **Task 15:** the README also says where `npm run land`'s git-ignored source comes from.
- **Kept as planned, after review:** the site's subsolar point uses the NOAA position its `sunAltitude` uses, where the app uses the shorter mean-longitude formula. The night edge can differ from the app's by about 0.1° of longitude, which can't be seen at map scale.
- **Left for later:**
  - The card's "Landing in 50 min" rounds up, as the app's does, while the narrative's countdown above it rounds down ("landing in 49m"). Both platforms show it; one rule for both is a small follow-up.
  - On a wide window the fixed panel sits over the map's bottom-left corner, and the camera's fit doesn't leave room for it; a route there can pass under it.
  - The app has the same mid-trip-at-home bug the website fixed in Task 8 ("Home · next trip" with a past date).
  - In flight, if the trip the progress card shows leaves out the flight in the air (a standalone flight more than 12 hours from the trip's own), the map shows the trip on the ground and the in-flight card shows beneath it.
