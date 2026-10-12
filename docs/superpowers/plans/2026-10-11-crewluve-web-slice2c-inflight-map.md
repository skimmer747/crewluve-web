# Crewluve Web Slice 2 Part C (In-Flight Map) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** While the pilot is in the air, show the Crewluve app's in-flight card in the location card's place: a drawn map of the flight, then a delay banner and an info bar. Its flight number opens a tracking popup with links to FlightRadar24 and FlightAware.

**Architecture:** Pure modules port the app's math: the great circle, the box and projection, the plane, the distance, the sunrise or sunset point, and the sky. The sun's position comes from the site's own sun module, since the app's formula is wrong (spec decision 9). Further modules hold the card's words, the tracking links, and the card's facts from the snapshot. A Preact `FlightMap` draws an SVG at its measured width, with HTML labels over it. The review fixes put the plane in a second SVG over the labels, as the app stacks them (see the Execution notes). `InFlightCard` stacks the map, the banner and the info bar. `TrackingPopup` reuses the sun popup's dialog behavior. The status screen draws the card in the location card's place, and the popup after `<main>`. There are no new requests and no change to the CSP.

**Tech Stack:** Vite 5.4, TypeScript 5.9 (strict), Preact 10, Vitest 3 with happy-dom and @testing-library/preact.

**Spec:** `docs/superpowers/specs/2026-10-11-crewluve-web-slice2c-inflight-map-design.md`

---

## Execution notes

**Setup and gates**
- **Branch:** work on `slice2c` in the main project folder. Run `git switch -c slice2c` from `main`. Don't use git worktrees; auto mode blocked a worktree builder during slice 1.
- **Working directory:** run every command from the project root, `~/Dev/Crewluve Website`. Quote it in shells, since it has a space.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass before every commit that touches code. The suite is 1660 tests in 70 files before this plan, and 1810 tests in 79 files after the printed tasks. The review fixes took it to 1849 (see the Execution notes). The read-only scan (`tests/data/readOnly.test.ts`) adds one test for each new file in `src/`, so the totals grow a little faster than the task counts below.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Narrow no-break spaces:** the site writes "9:14 AM" with U+202F before AM. Test files spell it `\u202F`, as the printed blocks do. If an editor or tool turns it into the raw character, change it back.

**How the printed code was checked**
- **Built and replayed:** every code block below was built and run in a scratch copy of the project before this plan was written, and all three gates passed there. A script then applied this plan's changes, step by step, to a fresh copy of `main`. Each Step 2 failed, each Step 4 passed with its count, and every file came out identical to the scratch copy's.
- **Deliberate breaks:** 42 were tried against the new tests, and they caught all 42. Three were missed at first; their tests are tighter in the printed code:
  - the sunrise point's exact place;
  - the progress words near their boundaries;
  - a delay taken from the landing rather than the departure.
- **A check against the spec** added one test: the banner's threshold, at 15 minutes and not at 14, late and early (spec §12). A deliberate break of that threshold fails it.
- **A look in the browser pane:** the scratch build was checked in light and dark, on the demo's `flying` and `last-leg` scenes, with the tracking popup open.
  - It turned up one bug, fixed in the printed code (Task 10). The info bar kept its light colors in dark mode, because its colors came after the dark block that overrides them. A test now checks that order.
- **The app's sun formula is wrong** by up to two hours (spec §10, item 8). Running its own Swift code unchanged confirmed it against the US Naval Observatory. The site uses its NOAA-based sun module instead (Task 2). A task to fix the app was offered separately.

**Network and other repos**
- **No new requests.** The card and the popup use the snapshot and the airport list the page already has. The tracking links are ordinary navigation, which the visitor chooses to follow. Tests never use the network; `tests/setup/noNetwork.ts` blocks it.
- **One build script uses npm:** `npm run icons` (Task 1) runs `npm install --no-save @phosphor-icons/core@2.1.1`, then builds the icon file. If the package is already in `node_modules`, `node scripts/build-icons.mjs` does the same without npm. If `package-lock.json` changes afterwards, restore it with `git checkout -- package-lock.json`.
- **Read-only site:** nothing in this plan talks to CrewLu Cloud or changes `src/data/readOnlyFetch.ts`. The read-only scan checks every new file automatically.
- **The Crewluve app (`~/Dev/Crewluv`) is reference only.** Read it; never change it. The same goes for the Flight Globe folder.

**Batches and changes**
- **Batches for helper execution:**
  - A = Tasks 1–6: the icons, the sun's altitude, the geometry, the sky, the words and the tracking links. These are pure modules.
  - B = Tasks 7–12: the card's facts, the width hook, the map, the card, the popup and the screen. These are the UI.
- **Reviews:** after each batch, a spec review and a code-quality review, each with its own frozen copy of the branch. Then a final whole-branch review.
- **Tasks 13–14 are for the controller, working with the user:** the look check, then merge and release.
- **If the code has to differ from a printed block, write it down.** Note it under "Execution notes" at the end of this file, and update the spec's §13 decisions log if a decision changed.

## File map

| File | Change | Responsibility |
|---|---|---|
| `scripts/build-icons.mjs`, `src/icons/iconPaths.ts` | modify, regenerate | The timer, left-right arrows, check, broadcast, GPS fix and "arrow square out" icons |
| `src/time/sun.ts` | modify | `sunAltitude` and `isSunUp`: the sun's altitude at any instant, from the same NOAA position as sunrise and sunset |
| `src/ui/flightMapGeometry.ts` | create | The great circle, the antimeridian, the box, the projection, the arrow, the plane and the distance |
| `src/ui/flightSky.ts` | create | The sunrise or sunset point along the route, and how the sky is painted |
| `src/copy/format.ts` | modify | `mapAirportTimeText`: "MO 5:40AM" |
| `src/copy/flight.ts` | create | The flight number, the duration, the distance, the banner, the progress words and the spoken description |
| `src/copy/tracking.ts` | create | The tracking flight number and the FlightRadar24 and FlightAware links |
| `src/ui/inFlightFacts.ts` | create | The card's facts from the snapshot, and the flight's progress |
| `src/ui/hooks/useWidth.ts` | create | An element's measured width, kept up to date |
| `src/ui/FlightMap.tsx` | create | The map: an SVG at the measured width, HTML labels over it and the plane's SVG over those, or the app's fallback |
| `src/ui/InFlightCard.tsx` | create | The card: the map, the delay banner and the info bar |
| `src/ui/TrackingPopup.tsx` | create | The tracking popup |
| `src/styles/inFlight.css` | create | The map's, the card's and the popup's styles and fixed colors |
| `src/main.tsx` | modify | Imports `inFlight.css` |
| `src/ui/StatusScreen.tsx` | modify | Draws the card in the location card's place, and the popup after `<main>` |
| Tests | create and modify | Nine new test files, plus additions to five existing ones |

---

### Task 1: The icons

**Files:**
- Modify: `scripts/build-icons.mjs`
- Regenerate: `src/icons/iconPaths.ts`
- Test: `tests/icons/iconPaths.test.ts`

- [x] **Step 1: Write the failing test**

In `tests/icons/iconPaths.test.ts`, add this test after the sun popup's:

```ts
  it('has the in-flight card’s timer, distance and early-departure icons, and the tracking popup’s', () => {
    for (const name of ['Timer', 'ArrowsLeftRight', 'CheckCircle', 'Broadcast', 'GpsFix', 'ArrowSquareOut']) {
      expect(ICON_PATHS).toHaveProperty(name)
    }
  })
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/icons/iconPaths.test.ts`
Expected: FAIL in 1 test, with `expected { …(53) } to have property "Timer"`.

- [x] **Step 3: Implement**

In `scripts/build-icons.mjs`, end the comment above `ICONS` with the fifth group, so its last line becomes these two:

```js
// the third adds the weather and sun dial symbols of the slice 2B1 location card; the fourth, the slice 2B2 sun popup's;
// the fifth, the slice 2C in-flight card's and tracking popup's.
```

and add the new icons at the end of `ICONS`:

```js
  XCircle: 'x-circle', SunHorizon: 'sun-horizon', MapPinArea: 'map-pin-area',

  Timer: 'timer', ArrowsLeftRight: 'arrows-left-right', CheckCircle: 'check-circle', Broadcast: 'broadcast',
  GpsFix: 'gps-fix', ArrowSquareOut: 'arrow-square-out',
}
```

Then regenerate the icon file:

```bash
npm run icons
```

Expected: `wrote 59 icons to …/src/icons/iconPaths.ts`. If `@phosphor-icons/core` 2.1.1 is already in `node_modules`, `node scripts/build-icons.mjs` does the same without npm. `git diff src/icons/iconPaths.ts` shows six added lines, `Timer`, `ArrowsLeftRight`, `CheckCircle`, `Broadcast`, `GpsFix` and `ArrowSquareOut`, and no other change. If `package-lock.json` changed, run `git checkout -- package-lock.json`.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/icons/iconPaths.test.ts`
Expected: PASS, 6 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1661 tests in 70 files after this task.

```bash
git add tests/icons/iconPaths.test.ts scripts/build-icons.mjs src/icons/iconPaths.ts
git commit -m "Icons: the in-flight card's timer, distance and early-departure icons, and the tracking popup's (slice 2C §8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The sun's altitude

The map needs daylight at any place and moment: at each airport's time, and along the route. It takes the sun's position from the site's own NOAA formulas, the ones behind the location card's sunrise and sunset. The app's own formula is wrong by up to two hours (spec decision 9).

**Files:**
- Modify: `src/time/sun.ts`
- Test: `tests/time/sun.test.ts`

- [x] **Step 1: Write the failing test**

In `tests/time/sun.test.ts`, change the import from `src/time/sun` to:

```ts
import { isDaytime, isSunUp, sunAltitude, SUN_UP_ALTITUDE, sunTimes } from '../../src/time/sun'
```

and add these blocks at the end of the file:

```ts
const SDF = { lat: 38.1746, lng: -85.7382 }

/** The moment the sun crosses the sunrise and sunset horizon between `from` and `to`, to the second, by halving. */
function crossing(lat: number, lng: number, from: number, to: number): number {
  const upAtStart = isSunUp(from, lat, lng)
  let [lo, hi] = [from, to]
  while (hi - lo > 1000) {
    const mid = Math.round((lo + hi) / 2)
    if (isSunUp(mid, lat, lng) === upAtStart) lo = mid
    else hi = mid
  }
  return hi
}

describe('sunAltitude', () => {
  it('is 90° less the latitude plus the declination at solar noon on the June solstice', () => {
    // Louisville's solar noon on 21 June 2026 is about 17:45 UTC: 90 − 38.17 + 23.44 = 75.27°.
    expect(sunAltitude(ms('2026-06-21T17:45:00Z'), SDF.lat, SDF.lng)).toBeCloseTo(75.27, 0)
  })

  it('is as far below the horizon at local midnight', () => {
    expect(sunAltitude(ms('2026-06-22T05:45:00Z'), SDF.lat, SDF.lng)).toBeCloseTo(-28.39, 0)
  })

  it('crosses the horizon at the US Naval Observatory’s sunrise and sunset for Louisville, within 2 minutes', () => {
    // aa.usno.navy.mil: on 15 October 2026 the sun rises at 07:52 and sets at 19:05 EDT; on 15 March, 07:54 and 19:50.
    for (const [rise, set] of [
      ['2026-10-15T11:52:00Z', '2026-10-15T23:05:00Z'],
      ['2026-03-15T11:54:00Z', '2026-03-15T23:50:00Z'],
    ]) {
      expect(Math.abs(crossing(SDF.lat, SDF.lng, ms(rise) - 60 * MINUTE, ms(rise) + 60 * MINUTE) - ms(rise))).toBeLessThanOrEqual(2 * MINUTE)
      expect(Math.abs(crossing(SDF.lat, SDF.lng, ms(set) - 60 * MINUTE, ms(set) + 60 * MINUTE) - ms(set))).toBeLessThanOrEqual(2 * MINUTE)
    }
  })

  it('crosses the horizon within a minute of sunTimes’ sunrise and sunset, its own NOAA position', () => {
    for (const [name, lat, lng, timeZone, at] of NOAA) {
      const sun = sunTimes(ms(at), lat, lng, timeZone)!
      expect(Math.abs(crossing(lat, lng, sun.sunrise - 30 * MINUTE, sun.sunrise + 30 * MINUTE) - sun.sunrise), `${name} sunrise`).toBeLessThan(MINUTE)
      expect(Math.abs(crossing(lat, lng, sun.sunset - 30 * MINUTE, sun.sunset + 30 * MINUTE) - sun.sunset), `${name} sunset`).toBeLessThan(MINUTE)
    }
  })
})

describe('isSunUp', () => {
  it('counts the sun as up above −0.833°, the sunrise and sunset horizon', () => {
    expect(SUN_UP_ALTITUDE).toBe(-0.833)
    const rise = crossing(SDF.lat, SDF.lng, ms('2026-10-15T10:00:00Z'), ms('2026-10-15T13:00:00Z'))
    expect(isSunUp(rise - 1000, SDF.lat, SDF.lng)).toBe(false)
    expect(isSunUp(rise, SDF.lat, SDF.lng)).toBe(true)
    expect(sunAltitude(rise, SDF.lat, SDF.lng)).toBeGreaterThan(SUN_UP_ALTITUDE)
    expect(sunAltitude(rise - 1000, SDF.lat, SDF.lng)).toBeLessThanOrEqual(SUN_UP_ALTITUDE)
  })

  it('sees the midnight sun and the polar night at Utqiaġvik', () => {
    expect(isSunUp(ms('2026-06-21T08:00:00Z'), 71.2854, -156.766)).toBe(true) // local midnight
    expect(isSunUp(ms('2026-12-21T21:00:00Z'), 71.2854, -156.766)).toBe(false) // local noon
  })
})
```

The Naval Observatory's times come from `https://aa.usno.navy.mil/api/rstt/oneday` for Louisville (38.1746, −85.7382), checked on 2026-10-11.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/time/sun.test.ts`
Expected: FAIL in 6 tests, with `TypeError: sunAltitude is not a function`, `TypeError: isSunUp is not a function`, and `expected undefined to be -0.833` for the constant.

- [x] **Step 3: Implement**

Add this to the end of `src/time/sun.ts`. It uses the file's private `solarPosition`, `rad` and `deg`, and its imports of `DAY` and `MINUTE`:

```ts
/** Daylight on the in-flight map, as in the app: the sun's center above −0.833°, the sunrise and sunset horizon above. */
export const SUN_UP_ALTITUDE = -0.833

/**
 * The sun's altitude above the horizon in degrees, at latitude `lat`, longitude `lng` (east positive) and instant `t`,
 * from the same NOAA position as sunrise and sunset (slice 2C §4.3). The in-flight map uses it for day and night. The
 * app's map has its own formula, wrong by up to two hours, which the site doesn't copy (slice 2C §10 item 8).
 */
export function sunAltitude(t: number, lat: number, lng: number): number {
  const { declination, equationOfTime } = solarPosition(t)
  const utcMinutes = (((t % DAY) + DAY) % DAY) / MINUTE
  let hourAngle = (utcMinutes + equationOfTime + 4 * lng) / 4 - 180
  while (hourAngle > 180) hourAngle -= 360
  while (hourAngle < -180) hourAngle += 360
  const cosZenith =
    Math.sin(rad(lat)) * Math.sin(rad(declination)) + Math.cos(rad(lat)) * Math.cos(rad(declination)) * Math.cos(rad(hourAngle))
  return 90 - deg(Math.acos(Math.min(1, Math.max(-1, cosZenith))))
}

/** Whether the sun is up at latitude `lat`, longitude `lng` and instant `t`: above the sunrise and sunset horizon. */
export function isSunUp(t: number, lat: number, lng: number): boolean {
  return sunAltitude(t, lat, lng) > SUN_UP_ALTITUDE
}
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/time/sun.test.ts`
Expected: PASS, 18 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1667 tests in 70 files after this task.

```bash
git add tests/time/sun.test.ts src/time/sun.ts
git commit -m "Sun: the altitude at any instant from the same NOAA position as sunrise and sunset, for the in-flight map (slice 2C §4.3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The map's geometry

The app's `FlightRouteMapView` math, line for line.

**Files:**
- Create: `src/ui/flightMapGeometry.ts`
- Test: `tests/ui/flightMapGeometry.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/ui/flightMapGeometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  crossesAntimeridian,
  DEFAULT_MAP_WIDTH,
  distanceNm,
  greatCirclePoint,
  MAP_HEIGHT,
  MAP_PADDING,
  mapBounds,
  planePose,
  project,
  routeArrow,
  routePoints,
  type GeoPoint,
} from '../../src/ui/flightMapGeometry'

const SDF: GeoPoint = { lat: 38.1746, lon: -85.7382 }
const ANC: GeoPoint = { lat: 61.1744, lon: -149.9983 }
const MIA: GeoPoint = { lat: 25.7959, lon: -80.2871 }
const NRT: GeoPoint = { lat: 35.7647, lon: 140.3864 }
const HNL: GeoPoint = { lat: 21.3245, lon: -157.9251 }
const CGN: GeoPoint = { lat: 50.8659, lon: 7.1427 }
const W = DEFAULT_MAP_WIDTH

describe('greatCirclePoint', () => {
  it('starts and ends at the airports', () => {
    expect(greatCirclePoint(SDF, ANC, 0).lat).toBeCloseTo(SDF.lat, 9)
    expect(greatCirclePoint(SDF, ANC, 0).lon).toBeCloseTo(SDF.lon, 9)
    expect(greatCirclePoint(SDF, ANC, 1).lat).toBeCloseTo(ANC.lat, 9)
    expect(greatCirclePoint(SDF, ANC, 1).lon).toBeCloseTo(ANC.lon, 9)
  })

  it('follows the equator and the meridians, where the great circle is plain', () => {
    const half = greatCirclePoint({ lat: 0, lon: 0 }, { lat: 0, lon: 90 }, 0.5)
    expect(half.lat).toBeCloseTo(0, 9)
    expect(half.lon).toBeCloseTo(45, 9)
    expect(greatCirclePoint({ lat: 0, lon: 0 }, { lat: 90, lon: 0 }, 0.5).lat).toBeCloseTo(45, 9)
  })

  it('bows toward the pole between two places at the same latitude, as a great circle does', () => {
    expect(greatCirclePoint({ lat: 45, lon: -100 }, { lat: 45, lon: 0 }, 0.5).lat).toBeGreaterThan(50)
  })

  it('gives the start for two airports at the same place', () => {
    expect(greatCirclePoint(SDF, SDF, 0.5)).toBe(SDF)
  })
})

describe('routePoints', () => {
  it('draws the route as 50 segments, airports included', () => {
    const points = routePoints(SDF, ANC)
    expect(points).toHaveLength(51)
    expect(points[0].lat).toBeCloseTo(SDF.lat, 9)
    expect(points[50].lon).toBeCloseTo(ANC.lon, 9)
  })
})

describe('crossesAntimeridian', () => {
  it('is true where the way west across the date line is shorter: Anchorage to Tokyo, either way', () => {
    expect(crossesAntimeridian(ANC, NRT)).toBe(true)
    expect(crossesAntimeridian(NRT, ANC)).toBe(true)
  })

  it('is false within a hemisphere, and where the way east is shorter: Honolulu to Cologne', () => {
    expect(crossesAntimeridian(SDF, ANC)).toBe(false)
    expect(crossesAntimeridian(HNL, CGN)).toBe(false)
  })
})

describe('mapBounds', () => {
  it('holds the whole route, padded by 15% of its spans', () => {
    const points = routePoints(SDF, ANC)
    const lats = points.map((p) => p.lat)
    const lons = points.map((p) => p.lon)
    const [lat0, lat1, lon0, lon1] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)]
    const b = mapBounds(SDF, ANC)
    expect(b.minLat).toBeCloseTo(lat0 - (lat1 - lat0) * 0.15, 9)
    expect(b.maxLat).toBeCloseTo(lat1 + (lat1 - lat0) * 0.15, 9)
    expect(b.minLon).toBeCloseTo(lon0 - (lon1 - lon0) * 0.15, 9)
    expect(b.maxLon).toBeCloseTo(lon1 + (lon1 - lon0) * 0.15, 9)
    expect(b.lonOffset).toBe(0)
  })

  it('widens a route that runs north and south to 0.6 of its height', () => {
    const b = mapBounds(SDF, MIA)
    expect((b.maxLon - b.minLon) / (b.maxLat - b.minLat)).toBeCloseTo(0.6, 9)
  })

  it('counts longitudes on from 180° for a route across the antimeridian, so it draws in one piece', () => {
    const b = mapBounds(ANC, NRT)
    expect(b.lonOffset).toBe(360)
    const xs = routePoints(ANC, NRT).map((p) => project(p, b, W).x)
    expect(xs.every((x, i) => i === 0 || x < xs[i - 1])).toBe(true) // Anchorage on the right, heading west
  })
})

describe('project', () => {
  it('puts the box’s corners 60 px in from the drawing’s corners, north up', () => {
    const b = { minLat: 10, maxLat: 20, minLon: -100, maxLon: -80, lonOffset: 0 }
    expect(project({ lat: 10, lon: -100 }, b, W)).toEqual({ x: MAP_PADDING, y: MAP_HEIGHT - MAP_PADDING })
    expect(project({ lat: 20, lon: -80 }, b, W)).toEqual({ x: W - MAP_PADDING, y: MAP_PADDING })
  })

  it('puts a place in the middle of an axis with no span', () => {
    const b = { minLat: 10, maxLat: 10, minLon: -90, maxLon: -90, lonOffset: 0 }
    expect(project({ lat: 10, lon: -90 }, b, W)).toEqual({ x: W / 2, y: MAP_HEIGHT / 2 })
  })

  it('keeps the whole route inside the padding', () => {
    for (const [a, b] of [[SDF, ANC], [ANC, NRT], [SDF, MIA], [HNL, CGN]]) {
      const box = mapBounds(a, b)
      for (const p of routePoints(a, b).map((g) => project(g, box, W))) {
        expect(p.x).toBeGreaterThanOrEqual(MAP_PADDING)
        expect(p.x).toBeLessThanOrEqual(W - MAP_PADDING)
        expect(p.y).toBeGreaterThanOrEqual(MAP_PADDING)
        expect(p.y).toBeLessThanOrEqual(MAP_HEIGHT - MAP_PADDING)
      }
    }
  })
})

describe('distanceNm', () => {
  it('is the great-circle distance in nautical miles, rounded down: Anchorage to Louisville is 2,706', () => {
    expect(distanceNm(ANC, SDF)).toBe(2706)
    expect(distanceNm(SDF, ANC)).toBe(2706)
  })

  it('is 60 nautical miles a degree along a meridian, and 0 for the same place', () => {
    expect(distanceNm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBe(60)
    expect(distanceNm(SDF, SDF)).toBe(0)
  })
})

describe('routeArrow', () => {
  const line = Array.from({ length: 51 }, (_, i) => ({ x: 10 + i * 4, y: 100 }))

  it('sits on the middle point, its tip 12 px ahead along the route', () => {
    const arrow = routeArrow(line)
    expect(arrow.tip.x).toBeCloseTo(110 + 12, 9)
    expect(arrow.tip.y).toBeCloseTo(100, 9)
  })

  it('opens its arms 9.6 px back at ±2.5 radians', () => {
    const arrow = routeArrow(line)
    expect(arrow.left.x).toBeCloseTo(110 + 9.6 * Math.cos(2.5), 9)
    expect(arrow.left.y).toBeCloseTo(100 + 9.6 * Math.sin(2.5), 9)
    expect(arrow.right.y).toBeCloseTo(100 - 9.6 * Math.sin(2.5), 9)
  })

  it('sits halfway along a route of two points', () => {
    const arrow = routeArrow([{ x: 0, y: 0 }, { x: 0, y: 40 }])
    expect(arrow.tip.x).toBeCloseTo(0, 9)
    expect(arrow.tip.y).toBeCloseTo(20 + 12, 9) // pointing down
  })
})

describe('planePose', () => {
  const box = mapBounds(ANC, SDF)
  const at = (f: number) => project(greatCirclePoint(ANC, SDF, f), box, W)

  it('puts the plane on the route at its progress, heading toward the point 2% further on', () => {
    const pose = planePose(ANC, SDF, box, W, 0.33)
    expect(pose.at).toEqual(at(0.33))
    const ahead = at(0.35)
    expect(pose.heading).toBeCloseTo((Math.atan2(ahead.y - pose.at.y, ahead.x - pose.at.x) * 180) / Math.PI, 9)
  })

  it('keeps its heading at landing, from the point 2% behind', () => {
    const pose = planePose(ANC, SDF, box, W, 1)
    const behind = at(0.98)
    expect(pose.heading).toBeCloseTo((Math.atan2(pose.at.y - behind.y, pose.at.x - behind.x) * 180) / Math.PI, 9)
    expect(pose.heading).toBeGreaterThan(0) // Anchorage to Louisville heads east and down the map
    expect(pose.heading).toBeLessThan(90)
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/flightMapGeometry.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/ui/flightMapGeometry'`.

- [x] **Step 3: Implement**

Create `src/ui/flightMapGeometry.ts`:

```ts
// The in-flight map's geometry (slice 2C §4), ported line for line from the app's FlightRouteMapView: the great circle,
// the box around it, the projection into the drawing, the arrow, the plane and the distance.

/** A place on the globe, in degrees: latitude north positive, longitude east positive. */
export interface GeoPoint {
  lat: number
  lon: number
}

/** A point in the map's drawing, in CSS pixels from its top left. */
export interface MapPoint {
  x: number
  y: number
}

/** The map is 200 px tall, its drawing kept 60 px inside every edge, and the route drawn as 50 segments (§4.1, §4.2). */
export const MAP_HEIGHT = 200
export const MAP_PADDING = 60
export const ROUTE_SEGMENTS = 50
/** A phone's card width, which the map uses until it has measured its own (§4.1). */
export const DEFAULT_MAP_WIDTH = 343

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** The point `fraction` of the way along the great circle from `a` to `b` (interpolateGreatCircle). */
export function greatCirclePoint(a: GeoPoint, b: GeoPoint, fraction: number): GeoPoint {
  const [lat1, lon1, lat2, lon2] = [rad(a.lat), rad(a.lon), rad(b.lat), rad(b.lon)]
  const cosD = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  const d = Math.acos(Math.min(1, Math.max(-1, cosD)))
  if (d < 0.0001) return a
  const wa = Math.sin((1 - fraction) * d) / Math.sin(d)
  const wb = Math.sin(fraction * d) / Math.sin(d)
  const x = wa * Math.cos(lat1) * Math.cos(lon1) + wb * Math.cos(lat2) * Math.cos(lon2)
  const y = wa * Math.cos(lat1) * Math.sin(lon1) + wb * Math.cos(lat2) * Math.sin(lon2)
  const z = wa * Math.sin(lat1) + wb * Math.sin(lat2)
  return { lat: deg(Math.atan2(z, Math.sqrt(x * x + y * y))), lon: deg(Math.atan2(y, x)) }
}

/** The great circle from `a` to `b` as `segments` + 1 points, ends included (generateGreatCirclePoints). */
export function routePoints(a: GeoPoint, b: GeoPoint, segments = ROUTE_SEGMENTS): GeoPoint[] {
  return Array.from({ length: segments + 1 }, (_, i) => greatCirclePoint(a, b, i / segments))
}

/**
 * Whether the route is laid out across the antimeridian: the airports lie in different hemispheres and the way west
 * is shorter than the way east (routeCrossesAntimeridian). Anchorage to Tokyo is; Louisville to Anchorage isn't.
 */
export function crossesAntimeridian(a: GeoPoint, b: GeoPoint): boolean {
  if ((a.lon >= 0 && b.lon >= 0) || (a.lon < 0 && b.lon < 0)) return false
  const eastward = Math.abs(b.lon - a.lon)
  return 360 - eastward < eastward
}

/** The box the map shows, in degrees. Across the antimeridian, negative longitudes are counted from 180° on (+360). */
export interface MapBounds {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
  /** 360 when the route crosses the antimeridian, else 0 (longitudeOffset). */
  lonOffset: number
}

/** A longitude in the box's terms: +360 for a negative one when the box crosses the antimeridian (normalizeLongitude). */
export function boxLongitude(lon: number, lonOffset: number): number {
  return lonOffset !== 0 && lon < 0 ? lon + lonOffset : lon
}

/**
 * The smallest box holding both airports and the whole route, padded by 15% on each axis, and widened to 0.6 × its
 * height when it's under half as wide as it's tall (calculateBounds, §4.2).
 */
export function mapBounds(a: GeoPoint, b: GeoPoint): MapBounds {
  const lonOffset = crossesAntimeridian(a, b) ? 360 : 0
  let minLat = Math.min(a.lat, b.lat)
  let maxLat = Math.max(a.lat, b.lat)
  let minLon = Math.min(boxLongitude(a.lon, lonOffset), boxLongitude(b.lon, lonOffset))
  let maxLon = Math.max(boxLongitude(a.lon, lonOffset), boxLongitude(b.lon, lonOffset))
  for (const p of routePoints(a, b)) {
    minLat = Math.min(minLat, p.lat)
    maxLat = Math.max(maxLat, p.lat)
    const lon = boxLongitude(p.lon, lonOffset)
    minLon = Math.min(minLon, lon)
    maxLon = Math.max(maxLon, lon)
  }
  const latPadding = (maxLat - minLat) * 0.15
  const lonPadding = (maxLon - minLon) * 0.15
  minLat -= latPadding
  maxLat += latPadding
  minLon -= lonPadding
  maxLon += lonPadding
  const latSpan = maxLat - minLat
  const lonSpan = maxLon - minLon
  if (lonSpan < latSpan * 0.5) {
    const extra = (latSpan * 0.6 - lonSpan) / 2
    minLon -= extra
    maxLon += extra
  }
  return { minLat, maxLat, minLon, maxLon, lonOffset }
}

/** Where a place falls in a map `width` × `height` px: inside the 60 px padding, north up (projectToView). */
export function project(p: GeoPoint, bounds: MapBounds, width: number, height = MAP_HEIGHT): MapPoint {
  const lonSpan = bounds.maxLon - bounds.minLon
  const latSpan = bounds.maxLat - bounds.minLat
  const nx = lonSpan <= 0 ? 0.5 : (boxLongitude(p.lon, bounds.lonOffset) - bounds.minLon) / lonSpan
  const ny = latSpan <= 0 ? 0.5 : (p.lat - bounds.minLat) / latSpan
  return {
    x: MAP_PADDING + nx * (width - MAP_PADDING * 2),
    y: MAP_PADDING + (1 - ny) * (height - MAP_PADDING * 2),
  }
}

/** The great-circle distance in nautical miles, rounded down: the haversine formula on a 6,371 km sphere (§4.7). */
export function distanceNm(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  const meters = 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return Math.trunc(meters / 1852)
}

/** The route's arrow: a chevron, its arms and tip as points (§4.4). */
export interface Chevron {
  left: MapPoint
  tip: MapPoint
  right: MapPoint
}

/**
 * The arrow at the route's middle point, pointing along the route from the point before it; with only two points it
 * sits halfway between them (greatCircleRoute). The tip is 12 px ahead, the arms 9.6 px out at ±2.5 radians.
 */
export function routeArrow(points: MapPoint[]): Chevron {
  let angle = 0
  let at: MapPoint = points[0] ?? { x: 0, y: 0 }
  if (points.length >= 3) {
    const mid = Math.floor(points.length / 2)
    const [before, here] = [points[mid - 1], points[mid]]
    angle = Math.atan2(here.y - before.y, here.x - before.x)
    at = here
  } else if (points.length === 2) {
    const [first, last] = points
    angle = Math.atan2(last.y - first.y, last.x - first.x)
    at = { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 }
  }
  const out = (length: number, a: number): MapPoint => ({ x: at.x + Math.cos(a) * length, y: at.y + Math.sin(a) * length })
  return { left: out(9.6, angle + 2.5), tip: out(12, angle), right: out(9.6, angle - 2.5) }
}

/** Where the plane is drawn, and its heading on screen in degrees: 0 points right, 90 down (§4.6). */
export interface PlanePose {
  at: MapPoint
  heading: number
}

/**
 * The plane at `progress` (0 to 1) along the route, heading toward the point 2% further on. Near the end, where that
 * point is the same or under 1 px away, the heading comes from the point 2% behind instead (geographicAircraftMarker).
 */
export function planePose(a: GeoPoint, b: GeoPoint, bounds: MapBounds, width: number, progress: number): PlanePose {
  const pointAt = (f: number) => project(greatCirclePoint(a, b, f), bounds, width)
  const at = pointAt(progress)
  const aheadProgress = Math.min(progress + 0.02, 1)
  const ahead = pointAt(aheadProgress)
  const [dx, dy] = [ahead.x - at.x, ahead.y - at.y]
  if (aheadProgress === progress || Math.hypot(dx, dy) < 1) {
    const behind = pointAt(Math.max(progress - 0.02, 0))
    return { at, heading: deg(Math.atan2(at.y - behind.y, at.x - behind.x)) }
  }
  return { at, heading: deg(Math.atan2(dy, dx)) }
}
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/flightMapGeometry.test.ts`
Expected: PASS, 20 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1688 tests in 71 files after this task.

```bash
git add tests/ui/flightMapGeometry.test.ts src/ui/flightMapGeometry.ts
git commit -m "Flight map geometry: the great circle, the box, the projection, the arrow, the plane and the distance (slice 2C §4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The sky

**Files:**
- Create: `src/ui/flightSky.ts`
- Test: `tests/ui/flightSky.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/ui/flightSky.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { greatCirclePoint, type GeoPoint } from '../../src/ui/flightMapGeometry'
import { flightSky, solarTransition } from '../../src/ui/flightSky'
import { isSunUp } from '../../src/time/sun'
import { HOUR, MINUTE } from '../../src/time/zoned'

const SDF: GeoPoint = { lat: 38.1746, lon: -85.7382 }
const RFD: GeoPoint = { lat: 42.1954, lon: -89.0972 }
const ANC: GeoPoint = { lat: 61.1744, lon: -149.9983 }

/** Daylight on the plane at `progress` of a flight from `dep` at `out` to `arr` at `in_`. */
const dayAt = (dep: GeoPoint, arr: GeoPoint, out: number, in_: number, progress: number) => {
  const at = greatCirclePoint(dep, arr, progress)
  return isSunUp(out + (in_ - out) * progress, at.lat, at.lon)
}

describe('solarTransition', () => {
  // Anchorage at 5:40 AM, before sunrise, to Louisville at 2:40 PM: the sun rises on the way.
  const out = Date.UTC(2026, 9, 12, 13, 40)
  const in_ = out + 5 * HOUR

  it('finds the sunrise on a flight that leaves in the dark and lands in daylight', () => {
    const t = solarTransition(ANC, SDF, out, in_)!
    expect(t.sunrise).toBe(true)
    expect(t.progress).toBeGreaterThan(0)
    expect(t.progress).toBeLessThan(1)
  })

  it('puts it halfway between the last 5-minute sample in the dark and the first in daylight', () => {
    const t = solarTransition(ANC, SDF, out, in_)!
    const samples = 60 // 300 minutes in 5-minute steps
    const first = Array.from({ length: samples + 1 }, (_, i) => i).find((i) => dayAt(ANC, SDF, out, in_, i / samples))!
    expect(first).toBeGreaterThan(0)
    expect(dayAt(ANC, SDF, out, in_, (first - 1) / samples)).toBe(false)
    expect(t.progress).toBeCloseTo((first - 0.5) / samples, 12)
  })

  it('finds a sunset as well', () => {
    // Anchorage at 3 PM to Louisville at midnight, flying into the night.
    const afternoon = Date.UTC(2026, 9, 12, 23)
    expect(solarTransition(ANC, SDF, afternoon, afternoon + 5 * HOUR)?.sunrise).toBe(false)
  })

  it('is null when the daylight doesn’t change: Louisville to Rockford in the morning', () => {
    const morning = Date.UTC(2026, 9, 12, 15)
    expect(solarTransition(SDF, RFD, morning, morning + 90 * MINUTE)).toBeNull()
  })

  it('is null for a flight of 30 minutes or less, as in the app', () => {
    // Across the sunrise at Louisville, which a longer flight would find.
    const dawn = Date.UTC(2026, 9, 12, 11, 40)
    expect(solarTransition(SDF, RFD, dawn, dawn + 30 * MINUTE)).toBeNull()
    expect(solarTransition(SDF, RFD, dawn, dawn + 31 * MINUTE)).not.toBeNull()
  })
})

describe('flightSky', () => {
  it('paints one sky top to bottom when both ends have the same daylight', () => {
    expect(flightSky(true, true, 0.25, 0.75, null)).toEqual({ direction: 'down', time: 'day' })
    expect(flightSky(false, false, 0.25, 0.75, null)).toEqual({ direction: 'down', time: 'night' })
  })

  it('splits the sky across at the sunrise point, 15% of the width wide', () => {
    expect(flightSky(false, true, 0.25, 0.75, { progress: 0.5, sunrise: true })).toEqual({
      direction: 'across',
      left: 'night',
      right: 'day',
      leftUntil: 0.425,
      rightFrom: 0.575,
    })
  })

  it('puts the departure on the right for a westbound flight, measuring the point from it', () => {
    const sky = flightSky(true, false, 0.75, 0.25, { progress: 0.2, sunrise: false })
    expect(sky).toMatchObject({ direction: 'across', left: 'night', right: 'day' })
    if (sky.direction !== 'across') throw new Error('expected a split sky')
    expect(sky.leftUntil).toBeCloseTo(0.65 - 0.075, 9)
    expect(sky.rightFrom).toBeCloseTo(0.65 + 0.075, 9)
  })

  it('keeps the blend inside the map at its edges', () => {
    const sky = flightSky(false, true, 0.02, 0.98, { progress: 0, sunrise: true })
    expect(sky).toMatchObject({ leftUntil: 0, rightFrom: expect.closeTo(0.095, 9) })
  })

  it('blends across the whole width without a sunrise or sunset point', () => {
    expect(flightSky(false, true, 0.25, 0.75, null)).toEqual({ direction: 'across', left: 'night', right: 'day', leftUntil: 0, rightFrom: 1 })
  })
})
```

The 5-minute samples use the site's correct sun (Task 2). A westbound evening flight chases the sun, so the sunset case flies east.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/flightSky.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/ui/flightSky'`.

- [x] **Step 3: Implement**

Create `src/ui/flightSky.ts`:

```ts
import { isSunUp } from '../time/sun'
import { MINUTE } from '../time/zoned'
import { greatCirclePoint, type GeoPoint } from './flightMapGeometry'

/** The map's sky (slice 2C §4.3): day or night, as the app's day and night gradients. */
export type DayOrNight = 'day' | 'night'

/** Where along the route the sun rises or sets during the flight, from 0 at departure to 1 at landing. */
export interface SolarTransition {
  progress: number
  sunrise: boolean
}

/**
 * Where the sun first rises or sets along the route (findSolarTransitionPoint): the flight is sampled every 5 minutes,
 * at the place it would be then, and the first change of daylight is put halfway between the two samples. Null when
 * the daylight never changes, and for flights of 30 minutes or less.
 */
export function solarTransition(dep: GeoPoint, arr: GeoPoint, depTime: number, arrTime: number): SolarTransition | null {
  const duration = arrTime - depTime
  if (!(duration > 30 * MINUTE)) return null
  const samples = Math.trunc(duration / (5 * MINUTE))
  if (samples <= 1) return null
  let before: boolean | null = null
  for (let i = 0; i <= samples; i++) {
    const progress = i / samples
    const at = greatCirclePoint(dep, arr, progress)
    const up = isSunUp(depTime + duration * progress, at.lat, at.lon)
    if (before !== null && up !== before) return { progress: (i - 0.5) / samples, sunrise: up }
    before = up
  }
  return null
}

/**
 * How the sky is painted. With the same daylight at both ends, top to bottom in the day or the night colors. Otherwise
 * left to right: the left airport's color up to `leftUntil` and the right airport's from `rightFrom`, as fractions of
 * the width, blending between.
 */
export type Sky =
  | { direction: 'down'; time: DayOrNight }
  | { direction: 'across'; left: DayOrNight; right: DayOrNight; leftUntil: number; rightFrom: number }

/** The blend between night and day is 15% of the map's width, centered on the sunrise or sunset point. */
const BLEND = 0.15

/**
 * The sky for daylight at departure and at landing (`depDay`, `arrDay`), the airports' places across the map (`depX`,
 * `arrX`, fractions of its width) and the sunrise or sunset point, if any (dayNightBackground). Without that point the
 * colors blend across the whole width.
 */
export function flightSky(depDay: boolean, arrDay: boolean, depX: number, arrX: number, transition: SolarTransition | null): Sky {
  const time = (day: boolean): DayOrNight => (day ? 'day' : 'night')
  if (depDay === arrDay) return { direction: 'down', time: time(depDay) }
  const depLeft = depX < arrX
  const left = time(depLeft ? depDay : arrDay)
  const right = time(depLeft ? arrDay : depDay)
  if (!transition) return { direction: 'across', left, right, leftUntil: 0, rightFrom: 1 }
  const at = depX + (arrX - depX) * transition.progress
  return { direction: 'across', left, right, leftUntil: Math.max(0, at - BLEND / 2), rightFrom: Math.min(1, at + BLEND / 2) }
}
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/flightSky.test.ts`
Expected: PASS, 10 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1699 tests in 72 files after this task.

```bash
git add tests/ui/flightSky.test.ts src/ui/flightSky.ts
git commit -m "Flight sky: the sunrise or sunset point along the route, and the day and night sky (slice 2C §4.3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The card's words

**Files:**
- Create: `src/copy/flight.ts`
- Modify: `src/copy/format.ts`
- Test: `tests/copy/format.test.ts`, `tests/copy/flight.test.ts`

- [x] **Step 1: Write the failing tests**

In `tests/copy/format.test.ts`, add `mapAirportTimeText` to the import from `src/copy/format`:

```ts
  longDateTimeText,
  mapAirportTimeText,
```

and add this test after the `dialTimeText` test:

```ts
  it('prints the in-flight map’s airport times as the app does: the weekday’s first two letters, then the time', () => {
    // Monday 12 October 2026: 5:40 AM in Anchorage, 2:40 PM in New York.
    expect(mapAirportTimeText(Date.UTC(2026, 9, 12, 13, 40), 'America/Anchorage', false)).toBe('MO 5:40AM')
    expect(mapAirportTimeText(Date.UTC(2026, 9, 12, 18, 40), NY, false)).toBe('MO 2:40PM')
    expect(mapAirportTimeText(Date.UTC(2026, 9, 12, 13, 40), 'America/Anchorage', true)).toBe('MO 05:40')
    expect(mapAirportTimeText(Date.UTC(2026, 9, 11, 4, 5), NY, false)).toBe('SU 12:05AM')
  })
```

Then create `tests/copy/flight.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { delayBannerText, distanceText, flightDurationText, flightMapLabel, flightNumberText, progressWords } from '../../src/copy/flight'
import { HOUR, MINUTE } from '../../src/time/zoned'

describe('flightNumberText', () => {
  it('writes a company flight as UPS and its digits, as the pilot’s Duty app does', () => {
    expect(flightNumberText('5X', '2962')).toBe('UPS2962')
  })

  it('writes another airline’s flight as the airline and the digits', () => {
    expect(flightNumberText('DL', '1235')).toBe('DL1235')
  })

  it('writes the digits alone without an airline, and nothing without digits', () => {
    expect(flightNumberText(null, '2962')).toBe('2962')
    expect(flightNumberText('5X', null)).toBeNull()
  })
})

describe('flightDurationText', () => {
  it('reads hours and minutes as h:mm, as the app does', () => {
    expect(flightDurationText(5 * HOUR)).toBe('5:00')
    expect(flightDurationText(HOUR + 5 * MINUTE)).toBe('1:05')
  })

  it('reads minutes alone under an hour, rounding seconds down', () => {
    expect(flightDurationText(45 * MINUTE + 59_000)).toBe('45m')
    expect(flightDurationText(59_000)).toBe('0m')
  })
})

describe('distanceText', () => {
  it('reads nautical miles with a thousands separator', () => {
    expect(distanceText(2706)).toBe('2,706 nm')
    expect(distanceText(312)).toBe('312 nm')
  })
})

describe('delayBannerText', () => {
  it('reads a late departure as DELAYED and its length', () => {
    expect(delayBannerText(40)).toBe('DELAYED 40m')
    expect(delayBannerText(90)).toBe('DELAYED 1h 30m')
    expect(delayBannerText(120)).toBe('DELAYED 2h')
  })

  it('reads an early one as EARLY DEP', () => {
    expect(delayBannerText(-20)).toBe('EARLY DEP 20m')
    expect(delayBannerText(-65)).toBe('EARLY DEP 1h 5m')
  })
})

describe('progressWords', () => {
  it.each([
    [0, 'just taking off'],
    [0.1, 'just taking off'],
    [0.27, 'about a quarter of the way'],
    [0.3, 'about a third of the way'],
    [0.33, 'about a third of the way'],
    [0.43, 'halfway'],
    [0.5, 'halfway'],
    [0.7, 'about two thirds of the way'],
    [0.76, 'about three quarters of the way'],
    [0.97, 'about to land'],
  ])('%s reads "%s"', (progress, words) => {
    expect(progressWords(progress)).toBe(words)
  })
})

describe('flightMapLabel', () => {
  it('names the route, the distance, the time and how far along it is', () => {
    expect(flightMapLabel({ from: 'Anchorage', to: 'Louisville', nm: 2706, durationMs: 5 * HOUR, progress: 0.33 })).toBe(
      'Flight from Anchorage to Louisville, 2,706 nautical miles, 5 hours, about a third of the way',
    )
  })

  it('leaves out what doesn’t apply', () => {
    expect(flightMapLabel({ from: 'ANC', to: 'SDF', nm: null, durationMs: 0, progress: null })).toBe('Flight from ANC to SDF')
    expect(flightMapLabel({ from: 'Louisville', to: 'Rockford', nm: 312, durationMs: 90 * MINUTE, progress: null })).toBe(
      'Flight from Louisville to Rockford, 312 nautical miles, 1 hour, 30 minutes',
    )
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/copy/format.test.ts tests/copy/flight.test.ts`
Expected: FAIL: the format test with `TypeError: mapAirportTimeText is not a function`, and the flight test file with `Error: Cannot find module '../../src/copy/flight'`.

- [x] **Step 3: Implement**

In `src/copy/format.ts`, add the map's time format after `dialTimeText`. The file already imports `WEEKDAYS` and `zonedParts`:

```ts
/**
 * An airport's time on the in-flight map: "MO 5:40AM", the weekday's first two letters and then the time
 * (FlightRouteMapView.formatLocalTime, "h:mma"), or "MO 05:40" in 24-hour.
 */
export function mapAirportTimeText(ms: number, timeZone: string, h24: boolean): string {
  const weekday = WEEKDAYS[zonedParts(ms, timeZone).weekday].slice(0, 2).toUpperCase()
  return `${weekday} ${clock(ms, timeZone, h24, 'AM', 'PM')}`
}
```

Then create `src/copy/flight.ts`:

```ts
import { spokenDuration } from './format'

/**
 * The flight number as the pilot's Duty app writes it for the family (PartnerStatusGenerator.formatFlightNumber):
 * "UPS2962" for a company flight, the airline and digits for another ("DL1235"), and the digits alone without an
 * airline. Null without digits. Company flights reach the site as airline 5X (slice 1 §6.2), so 5X reads "UPS".
 */
export function flightNumberText(airline: string | null, number: string | null): string | null {
  if (!number) return null
  if (airline === '5X') return `UPS${number}`
  return `${airline ?? ''}${number}`
}

/** The scheduled block time under the map: "5:00", or "45m" under an hour (FlightRouteMapView.formatDuration). */
export function flightDurationText(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours}:${String(minutes % 60).padStart(2, '0')}` : `${minutes}m`
}

/** The distance under the map: "2,706 nm", with a thousands separator, as SwiftUI prints a number in text. */
export function distanceText(nm: number): string {
  return `${nm.toLocaleString('en-US')} nm`
}

/**
 * The in-flight delay banner: "DELAYED 1h 30m" for a late departure, "EARLY DEP 20m" for an early one
 * (LocationCardView's banner and formatDelayDuration). The site shows it at 15 minutes or more (slice 2C §5.1).
 */
export function delayBannerText(minutes: number): string {
  const total = Math.abs(minutes)
  const h = Math.floor(total / 60)
  const m = total % 60
  const amount = h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`
  return `${minutes < 0 ? 'EARLY DEP' : 'DELAYED'} ${amount}`
}

const PROGRESS_WORDS: ReadonlyArray<[fraction: number, words: string]> = [
  [0, 'just taking off'],
  [1 / 4, 'about a quarter of the way'],
  [1 / 3, 'about a third of the way'],
  [1 / 2, 'halfway'],
  [2 / 3, 'about two thirds of the way'],
  [3 / 4, 'about three quarters of the way'],
  [1, 'about to land'],
]

/** How far along the flight is, in words: the nearest of 0, ¼, ⅓, ½, ⅔, ¾ and 1 (slice 2C §4.10). */
export function progressWords(progress: number): string {
  let best = PROGRESS_WORDS[0]
  for (const entry of PROGRESS_WORDS) if (Math.abs(entry[0] - progress) < Math.abs(best[0] - progress)) best = entry
  return best[1]
}

export interface FlightMapLabelArgs {
  from: string
  to: string
  /** The distance, or null when an airport is unknown. */
  nm: number | null
  /** The scheduled block time; left out when it isn't over zero. */
  durationMs: number
  /** How far along the flight is, or null when it isn't under way. */
  progress: number | null
}

/**
 * What screen readers hear for the map, which the app doesn't have (slice 2C §4.10): "Flight from Anchorage to
 * Louisville, 2,706 nautical miles, 5 hours, about a third of the way". Parts that don't apply are left out.
 */
export function flightMapLabel({ from, to, nm, durationMs, progress }: FlightMapLabelArgs): string {
  const parts = [`Flight from ${from} to ${to}`]
  if (nm != null) parts.push(`${nm.toLocaleString('en-US')} nautical ${nm === 1 ? 'mile' : 'miles'}`)
  if (durationMs > 0) parts.push(spokenDuration(durationMs))
  if (progress != null) parts.push(progressWords(progress))
  return parts.join(', ')
}
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/copy/format.test.ts tests/copy/flight.test.ts`
Expected: PASS, 89 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1721 tests in 73 files after this task.

```bash
git add tests/copy/format.test.ts tests/copy/flight.test.ts src/copy/format.ts src/copy/flight.ts
git commit -m "Flight copy: the flight number, the airport times, the duration, the distance, the banner and the spoken description (slice 2C §4, §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The tracking links

The app's airline codes, applied to the airline and digits the site already has apart (spec §6, §10 item 9).

**Files:**
- Create: `src/copy/tracking.ts`
- Test: `tests/copy/tracking.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/copy/tracking.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { trackingFlightNumber, trackingLinks } from '../../src/copy/tracking'

describe('trackingFlightNumber', () => {
  it('is the airline’s ICAO code and the digits, as the app’s tracking popup shows them', () => {
    expect(trackingFlightNumber('5X', '2962')).toBe('UPS2962')
    expect(trackingFlightNumber('DL', '1235')).toBe('DAL1235')
    expect(trackingFlightNumber('dl', '1235')).toBe('DAL1235')
  })

  it('finds airline codes with a digit in them, which the app’s split at the first digit misses', () => {
    expect(trackingFlightNumber('B6', '1234')).toBe('JBU1234')
    expect(trackingFlightNumber('F9', '88')).toBe('FFT88')
  })

  it('keeps an airline it has no ICAO code for, in capitals', () => {
    expect(trackingFlightNumber('xy', '12')).toBe('XY12')
  })

  it('is null without an airline or without digits', () => {
    expect(trackingFlightNumber(null, '2962')).toBeNull()
    expect(trackingFlightNumber('5X', null)).toBeNull()
  })

  it('is null for anything but letters and digits, so a link can’t be turned elsewhere', () => {
    expect(trackingFlightNumber('U/S', '12')).toBeNull()
    expect(trackingFlightNumber('DL', '12?x=1')).toBeNull()
  })
})

describe('trackingLinks', () => {
  it('opens FlightRadar24’s and FlightAware’s pages for the flight', () => {
    expect(trackingLinks('5X', '2962')).toEqual({
      flightRadar24: 'https://fr24.com/UPS2962',
      flightAware: 'https://www.flightaware.com/live/flight/UPS2962',
    })
    expect(trackingLinks('DL', '1235')?.flightRadar24).toBe('https://fr24.com/DAL1235')
  })

  it('is null without a tracking flight number', () => {
    expect(trackingLinks(null, '2962')).toBeNull()
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/copy/tracking.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/copy/tracking'`.

- [x] **Step 3: Implement**

Create `src/copy/tracking.ts`:

```ts
// The tracking popup's flight number and links (slice 2C §6), with the app's FlightTrackingHelper's airline codes.

/** IATA airline codes the app maps to ICAO ones, which the tracking sites use (iataToICAO). */
const ICAO_BY_IATA: Readonly<Record<string, string>> = {
  '5X': 'UPS', FX: 'FDX', AA: 'AAL', DL: 'DAL', UA: 'UAL', WN: 'SWA', B6: 'JBU', NK: 'NKS',
  F9: 'FFT', AS: 'ASA', HA: 'HAL', OO: 'SKW', YX: 'RPA', MQ: 'ENY', OH: 'PSA',
}

/**
 * The flight as the tracking sites know it, which the popup's header shows: the airline's ICAO code and the digits,
 * in capitals ("UPS2962", "DAL1235"). Null without an airline or digits, or when the result is more than letters and
 * digits, so nothing in the data can change where a link leads.
 *
 * The app splits its flight number at the first digit to find the airline, which misses codes with a digit in them
 * (B6, F9, 5X). The site has the airline and the digits apart, so it looks the airline up directly (§10 item 9).
 */
export function trackingFlightNumber(airline: string | null, number: string | null): string | null {
  if (!airline || !number) return null
  const code = airline.toUpperCase()
  const sign = `${ICAO_BY_IATA[code] ?? code}${number}`.toUpperCase()
  return /^[A-Z0-9]+$/.test(sign) ? sign : null
}

export interface TrackingLinks {
  flightRadar24: string
  flightAware: string
}

/**
 * The flight's pages on FlightRadar24 and FlightAware (flightRadar24URLs, flightAwareURL), or null without a tracking
 * flight number. The app tries FlightRadar24's own app first; the site opens its web page (§10 item 4).
 */
export function trackingLinks(airline: string | null, number: string | null): TrackingLinks | null {
  const sign = trackingFlightNumber(airline, number)
  if (!sign) return null
  return { flightRadar24: `https://fr24.com/${sign}`, flightAware: `https://www.flightaware.com/live/flight/${sign}` }
}
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/copy/tracking.test.ts`
Expected: PASS, 7 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1729 tests in 74 files after this task.

```bash
git add tests/copy/tracking.test.ts src/copy/tracking.ts
git commit -m "Tracking links: the flight's ICAO number and the FlightRadar24 and FlightAware pages (slice 2C §6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The card's facts

**Files:**
- Create: `src/ui/inFlightFacts.ts`
- Test: `tests/ui/inFlightFacts.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/ui/inFlightFacts.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { demoRaw } from '../../src/data/demo'
import { makeSnapshot, type Snapshot } from '../../src/engine/snapshot'
import { flightProgress, inFlightFacts } from '../../src/ui/inFlightFacts'
import { testAirports } from '../fixtures/airports'
import { A, at, engineFor, M } from '../fixtures/engine'
import { flight, H } from '../fixtures/legs'

const NY = 'America/New_York'
const driver = engineFor(demoRaw('driver', A))
const jumpseater = engineFor(demoRaw('jumpseater', A))
const snapAt = (minutes: number, e = driver) => makeSnapshot(e.schedule, e.legs, at(minutes), NY)

describe('inFlightFacts', () => {
  it('describes the flight under way: Louisville to Rockford, UPS 2961', () => {
    const facts = inFlightFacts(snapAt(100), testAirports)!
    expect(facts.dep).toEqual({ code: 'SDF', city: 'Louisville', place: { lat: 38.1746, lon: -85.7382 }, timeZone: 'America/Kentucky/Louisville' })
    expect(facts.arr.city).toBe('Rockford')
    expect([facts.start, facts.end]).toEqual([at(60), at(150)])
    expect(facts.blockMs).toBe(90 * M)
    expect(facts.delayMinutes).toBeNull()
    expect(facts.flightNumber).toBe('UPS2961')
    expect(facts.trackingNumber).toBe('UPS2961')
    expect(facts.links?.flightAware).toBe('https://www.flightaware.com/live/flight/UPS2961')
  })

  it('moves the flight to its estimated times, keeps the scheduled block time, and notes a 40-minute delay', () => {
    const facts = inFlightFacts(snapAt(1700), testAirports)!
    expect([facts.dep.code, facts.arr.code]).toEqual(['ANC', 'SDF'])
    expect([facts.start, facts.end]).toEqual([at(1600), at(1900)])
    expect(facts.blockMs).toBe(300 * M)
    expect(facts.delayMinutes).toBe(40)
  })

  it('takes the delay from the departure, not from the landing', () => {
    const air = snapAt(100)
    const leg = flight('SDF', 'RFD', 1, 3, 'T1', { schedStart: 1 * H - 40 * M, schedEnd: 3 * H - 10 * M })
    expect(inFlightFacts({ ...air, status: { ...air.status, current: leg } }, testAirports)!.delayMinutes).toBe(40)
  })

  it('notes a delay of 15 minutes or more, late or early, and none at 14', () => {
    const air = snapAt(100)
    const delay = (minutes: number) => {
      const leg = flight('SDF', 'RFD', 1, 3, 'T1', { schedStart: 1 * H - minutes * M, schedEnd: 3 * H - minutes * M })
      return inFlightFacts({ ...air, status: { ...air.status, current: leg } }, testAirports)!.delayMinutes
    }
    expect([delay(15), delay(14), delay(-14), delay(-15)]).toEqual([15, null, null, -15])
  })

  it('covers a jumpseat too, with its airline’s number and ICAO code', () => {
    const facts = inFlightFacts(snapAt(-240, jumpseater), testAirports)!
    expect([facts.dep.code, facts.arr.code]).toEqual(['MCO', 'SDF'])
    expect(facts.flightNumber).toBe('DL1234')
    expect(facts.trackingNumber).toBe('DAL1234')
  })

  it('is null on the ground and during ground transport', () => {
    expect(inFlightFacts(snapAt(180), testAirports)).toBeNull() // the turn in Rockford
    const air = snapAt(100)
    const ground: Snapshot = { ...air, status: { ...air.status, kind: 'ground', current: flight('SDF', 'LEX', 0, 1, 'T1', { ground: true }) } }
    expect(inFlightFacts(ground, testAirports)).toBeNull()
  })

  it('keeps the code as the city, and no place or zone, for an airport the list doesn’t have', () => {
    const air = snapAt(100)
    const leg = flight('SDF', 'ZZZ', 0, 2)
    const facts = inFlightFacts({ ...air, status: { ...air.status, current: leg } }, testAirports)!
    expect(facts.arr).toEqual({ code: 'ZZZ', city: 'ZZZ', place: null, timeZone: null })
  })

  it('has no flight number or links without digits', () => {
    const air = snapAt(100)
    const leg = flight('SDF', 'RFD', 0, 2, 'T1', { number: null })
    const facts = inFlightFacts({ ...air, status: { ...air.status, current: leg } }, testAirports)!
    expect([facts.flightNumber, facts.trackingNumber, facts.links]).toEqual([null, null, null])
  })
})

describe('flightProgress', () => {
  const facts = inFlightFacts(snapAt(100), testAirports)!

  it('runs from 0 at the estimated departure to 1 at landing', () => {
    expect(flightProgress(facts, at(60))).toBe(0)
    expect(flightProgress(facts, at(105))).toBeCloseTo(0.5, 9)
    expect(flightProgress(facts, at(150))).toBe(1)
  })

  it('is null before departure and after landing', () => {
    expect(flightProgress(facts, at(59))).toBeNull()
    expect(flightProgress(facts, at(151))).toBeNull()
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/inFlightFacts.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/ui/inFlightFacts'`.

- [x] **Step 3: Implement**

Create `src/ui/inFlightFacts.ts`:

```ts
import { flightNumberText } from '../copy/flight'
import { trackingFlightNumber, trackingLinks, type TrackingLinks } from '../copy/tracking'
import type { AirportIndex } from '../data/airports'
import { isMove } from '../engine/legs'
import { departureOffset, type Snapshot } from '../engine/snapshot'
import type { GeoPoint } from './flightMapGeometry'

/** One end of the flight: its code, its city, and its place and zone when the airport list has them. */
export interface FlightEnd {
  code: string
  /** The airport list's city, or the code when it has none. */
  city: string
  /** Null when the airport isn't in the list: the map shows its fallback then (slice 2C §4.8). */
  place: GeoPoint | null
  /** Null when the zone isn't known: the map leaves out that end's time. */
  timeZone: string | null
}

/** What the in-flight card shows (slice 2C §7), worked out by the screen while the pilot is in the air. */
export interface InFlightFacts {
  dep: FlightEnd
  arr: FlightEnd
  /** The estimated departure and landing, which move the plane and decide the sky (slice 2C §10 item 1). */
  start: number
  end: number
  /** The scheduled block time, shown under the map as the app shows it. */
  blockMs: number
  /** How late (positive) or early the departure is, when that's 15 minutes or more; else null. */
  delayMinutes: number | null
  /** The info bar's flight number in the pilot's Duty app's form, or null without digits. */
  flightNumber: string | null
  /** The popup's header: the airline's ICAO code and the digits, or the info bar's text when there's no airline. */
  trackingNumber: string | null
  /** The tracking sites' pages, or null when there's no tracking flight number. */
  links: TrackingLinks | null
}

function flightEnd(code: string, airports: AirportIndex): FlightEnd {
  const airport = airports.get(code)
  return {
    code,
    city: airports.city(code) ?? code,
    place: airport ? { lat: airport.lat, lon: airport.lng } : null,
    timeZone: airports.tz(code),
  }
}

/**
 * The card's facts while the pilot is in the air, on a flight or a jumpseat, or null otherwise: on the ground, and
 * during ground transport, which has its own status (slice 2C §3).
 */
export function inFlightFacts(snap: Snapshot, airports: AirportIndex): InFlightFacts | null {
  const leg = snap.status.current
  if (snap.status.kind !== 'inFlight' || !leg || !isMove(leg)) return null
  const flightNumber = flightNumberText(leg.airline, leg.number)
  return {
    dep: flightEnd(leg.dep, airports),
    arr: flightEnd(leg.arr, airports),
    start: leg.start,
    end: leg.end,
    blockMs: leg.schedEnd - leg.schedStart,
    delayMinutes: departureOffset({ scheduled: leg.schedStart, actual: leg.start }),
    flightNumber,
    trackingNumber: trackingFlightNumber(leg.airline, leg.number) ?? flightNumber,
    links: trackingLinks(leg.airline, leg.number),
  }
}

/** How far along the flight is at `now`, from 0 at departure to 1 at landing; null outside the flight (slice 2C §4.6). */
export function flightProgress(facts: InFlightFacts, now: number): number | null {
  if (now < facts.start || now > facts.end || facts.end <= facts.start) return null
  return Math.min(Math.max((now - facts.start) / (facts.end - facts.start), 0), 1)
}
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/inFlightFacts.test.ts`
Expected: PASS, 10 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1740 tests in 75 files after this task.

```bash
git add tests/ui/inFlightFacts.test.ts src/ui/inFlightFacts.ts
git commit -m "In-flight facts: the card's flight, its ends, times, delay, flight number and links, from the snapshot (slice 2C §3, §7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Measuring the map's width

**Files:**
- Create: `src/ui/hooks/useWidth.ts`
- Test: `tests/ui/useWidth.test.tsx`

- [x] **Step 1: Write the failing test**

Create `tests/ui/useWidth.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { useRef } from 'preact/hooks'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWidth } from '../../src/ui/hooks/useWidth'

function Probe() {
  const box = useRef<HTMLDivElement>(null)
  return <div ref={box} data-width={useWidth(box, 343)} />
}
const widthOf = (container: Element) => Number(container.querySelector('div')!.getAttribute('data-width'))

/** The element's width as layout would measure it: happy-dom has no layout, so the tests set it. */
let measured = 0

/** A ResizeObserver that reports only when a test says so. */
class FakeObserver {
  static last: FakeObserver | null = null
  disconnected = false
  observed: Element[] = []
  constructor(private callback: () => void) {
    FakeObserver.last = this
  }
  observe(el: Element) {
    this.observed.push(el)
  }
  disconnect() {
    this.disconnected = true
  }
  report() {
    this.callback()
  }
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: measured }) as DOMRect)
  vi.stubGlobal('ResizeObserver', FakeObserver)
  FakeObserver.last = null
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useWidth', () => {
  it('measures the element as it mounts', () => {
    measured = 300
    expect(widthOf(render(<Probe />).container)).toBe(300)
  })

  it('measures it again when it resizes', () => {
    measured = 300
    const { container } = render(<Probe />)
    expect(FakeObserver.last!.observed).toEqual([container.querySelector('div')])
    measured = 414.5
    act(() => FakeObserver.last!.report())
    expect(widthOf(container)).toBe(414.5)
  })

  it('keeps the fallback while the element has no width, as in a hidden page', () => {
    measured = 0
    expect(widthOf(render(<Probe />).container)).toBe(343)
  })

  it('measures once in a browser without ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    measured = 320
    expect(widthOf(render(<Probe />).container)).toBe(320)
  })

  it('stops watching when it goes away', () => {
    const { unmount } = render(<Probe />)
    unmount()
    expect(FakeObserver.last!.disconnected).toBe(true)
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/useWidth.test.tsx`
Expected: FAIL with `Error: Failed to resolve import "../../src/ui/hooks/useWidth" from "tests/ui/useWidth.test.tsx". Does the file exist?`

- [x] **Step 3: Implement**

Create `src/ui/hooks/useWidth.ts`:

```ts
import type { RefObject } from 'preact'
import { useLayoutEffect, useState } from 'preact/hooks'

/**
 * An element's width in CSS pixels, measured as it mounts and again whenever it changes, as the app's GeometryReader
 * does (slice 2C §4.1). `fallback` stands in until then, and while the element has no width, as in a hidden page.
 */
export function useWidth(element: RefObject<HTMLElement>, fallback: number): number {
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const el = element.current
    if (!el) return
    const measure = () => {
      const measured = el.getBoundingClientRect().width
      setWidth(measured > 0 ? measured : fallback)
    }
    measure()
    if (typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [element, fallback])
  return width
}
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/useWidth.test.tsx`
Expected: PASS, 5 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1746 tests in 76 files after this task.

```bash
git add tests/ui/useWidth.test.tsx src/ui/hooks/useWidth.ts
git commit -m "useWidth: the map measures its own width, like the app's GeometryReader (slice 2C §4.1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The map

**Files:**
- Create: `src/ui/FlightMap.tsx`, `src/styles/inFlight.css`
- Modify: `src/main.tsx`
- Test: `tests/ui/FlightMap.test.tsx`, `tests/styles/styles.test.ts`

- [x] **Step 1: Write the failing tests**

Create `tests/ui/FlightMap.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MAP_WIDTH, greatCirclePoint, mapBounds, planePose, project, routeArrow, routePoints } from '../../src/ui/flightMapGeometry'
import { flightSky, solarTransition } from '../../src/ui/flightSky'
import { FlightMap } from '../../src/ui/FlightMap'
import type { FlightEnd, InFlightFacts } from '../../src/ui/inFlightFacts'
import { isSunUp } from '../../src/time/sun'
import { HOUR, MINUTE } from '../../src/time/zoned'
import { iconNameOf } from '../fixtures/ui'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const ANC: FlightEnd = { code: 'ANC', city: 'Anchorage', place: { lat: 61.1744, lon: -149.9983 }, timeZone: 'America/Anchorage' }
const SDF: FlightEnd = { code: 'SDF', city: 'Louisville', place: { lat: 38.1746, lon: -85.7382 }, timeZone: 'America/Kentucky/Louisville' }
const RFD: FlightEnd = { code: 'RFD', city: 'Rockford', place: { lat: 42.1954, lon: -89.0972 }, timeZone: 'America/Chicago' }
// Monday 12 October 2026: Anchorage at 5:40 AM, in the dark, to Louisville at 2:40 PM.
const OUT = Date.UTC(2026, 9, 12, 13, 40)
const facts = (over: Partial<InFlightFacts> = {}): InFlightFacts => ({
  dep: ANC, arr: SDF, start: OUT, end: OUT + 5 * HOUR, blockMs: 5 * HOUR, delayMinutes: null,
  flightNumber: 'UPS2962', trackingNumber: 'UPS2962', links: null, ...over,
})
const THIRD = OUT + 100 * MINUTE // a third of the way
const W = DEFAULT_MAP_WIDTH
const box = mapBounds(ANC.place!, SDF.place!)
const points = (container: Element, selector: string) =>
  container.querySelector(selector)!.getAttribute('points')!.split(' ').map((pair) => pair.split(',').map(Number))

describe('FlightMap', () => {
  it('is one image to screen readers, described in words', () => {
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    expect(screen.getByRole('img', { name: 'Flight from Anchorage to Louisville, 2,706 nautical miles, 5 hours, about a third of the way' })).toBeTruthy()
    expect(container.querySelector('svg.flight-map-art')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('draws the route as 50 segments, at the phone width until it has measured its own', () => {
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    const expected = routePoints(ANC.place!, SDF.place!).map((p) => project(p, box, W))
    const drawn = points(container, '.flight-route')
    expect(drawn).toHaveLength(51)
    drawn.forEach(([x, y], i) => {
      expect(x).toBeCloseTo(expected[i].x, 9)
      expect(y).toBeCloseTo(expected[i].y, 9)
    })
    expect(container.querySelector('svg.flight-map-art')!.getAttribute('width')).toBe(String(W))
  })

  it('puts the arrow at the route’s middle, and fades the route across the whole width', () => {
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    const arrow = routeArrow(routePoints(ANC.place!, SDF.place!).map((p) => project(p, box, W)))
    const [left, tip, right] = points(container, '.flight-arrow')
    expect(left[0]).toBeCloseTo(arrow.left.x, 9)
    expect(tip[1]).toBeCloseTo(arrow.tip.y, 9)
    expect(right[0]).toBeCloseTo(arrow.right.x, 9)
    const fade = container.querySelector('linearGradient[gradientUnits="userSpaceOnUse"]')!
    expect(fade.getAttribute('x2')).toBe(String(W))
    expect([...fade.querySelectorAll('stop')].map((s) => s.getAttribute('class'))).toEqual(['flight-route-edge', 'flight-route-middle', 'flight-route-edge'])
  })

  it('centers each airport’s column on its place, with a sun or a moon, the code, the city and its local time', () => {
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    const [dep, arr] = [...container.querySelectorAll<HTMLElement>('.flight-airport')]
    const depAt = project(ANC.place!, box, W)
    expect(parseFloat(dep.style.left)).toBeCloseTo(depAt.x, 4)
    expect(parseFloat(dep.style.top)).toBeCloseTo(depAt.y, 4)
    expect(dep.textContent).toBe('ANCAnchorageMO 5:40AM')
    expect(arr.textContent).toBe('SDFLouisvilleMO 2:40PM')
    expect(iconNameOf(dep.querySelector('svg'))).toBe('Moon') // dark at 5:40 AM in Anchorage
    expect(iconNameOf(arr.querySelector('svg'))).toBe('Sun')
    expect(dep.querySelectorAll('.flight-airport-icon svg')).toHaveLength(2) // the glow and the icon
  })

  it('uses 24-hour times when asked, and leaves out a time whose zone isn’t known', () => {
    const { container } = render(<FlightMap facts={facts({ arr: { ...SDF, timeZone: null } })} now={THIRD} h24 />)
    const [dep, arr] = [...container.querySelectorAll('.flight-airport')]
    expect(dep.querySelector('.flight-airport-time')!.textContent).toBe('MO 05:40')
    expect(arr.querySelector('.flight-airport-time')).toBeNull()
  })

  it('paints the sky across, night into day, split at the sunrise point', () => {
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    const sky = container.querySelector(`linearGradient[id="${container.querySelector('.flight-sky')!.getAttribute('fill')!.slice(5, -1)}"]`)!
    expect(sky.getAttribute('x2')).toBe('1')
    const expected = flightSky(
      isSunUp(OUT, ANC.place!.lat, ANC.place!.lon),
      isSunUp(OUT + 5 * HOUR, SDF.place!.lat, SDF.place!.lon),
      project(ANC.place!, box, W).x / W,
      project(SDF.place!, box, W).x / W,
      solarTransition(ANC.place!, SDF.place!, OUT, OUT + 5 * HOUR),
    )
    expect(expected).toMatchObject({ direction: 'across', left: 'night', right: 'day' })
    if (expected.direction !== 'across') throw new Error('expected a split sky')
    const stops = [...sky.querySelectorAll('stop')]
    expect(stops.map((s) => s.getAttribute('class'))).toEqual(['sky-night-1', 'sky-night-1', 'sky-day-1', 'sky-day-1'])
    expect(stops.map((s) => Number(s.getAttribute('offset')))).toEqual([0, expected.leftUntil, expected.rightFrom, 1])
  })

  it('paints one sky top to bottom when both ends are in daylight', () => {
    const morning = Date.UTC(2026, 9, 12, 15)
    const { container } = render(<FlightMap facts={facts({ dep: SDF, arr: RFD, start: morning, end: morning + 90 * MINUTE, blockMs: 90 * MINUTE })} now={morning + 30 * MINUTE} h24={false} />)
    const sky = container.querySelector('linearGradient[y2="1"]')!
    expect([...sky.querySelectorAll('stop')].map((s) => s.getAttribute('class'))).toEqual(['sky-day-1', 'sky-day-2'])
  })

  it('draws the plane at its progress, turned along the route', () => {
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    const pose = planePose(ANC.place!, SDF.place!, box, W, 1 / 3)
    expect(container.querySelector('.flight-plane')!.getAttribute('transform')).toBe(`translate(${pose.at.x} ${pose.at.y})`)
    expect(container.querySelector('.flight-plane-icon')!.getAttribute('transform')).toBe(`rotate(${pose.heading + 90}) scale(${20 / 256}) translate(-128 -128)`)
    expect(container.querySelector('.flight-plane-halo')!.getAttribute('r')).toBe('15')
    expect(pose.at).toEqual(project(greatCirclePoint(ANC.place!, SDF.place!, 1 / 3), box, W))
  })

  it('has no plane before departure or after landing', () => {
    expect(render(<FlightMap facts={facts()} now={OUT - MINUTE} h24={false} />).container.querySelector('.flight-plane')).toBeNull()
    cleanup()
    expect(render(<FlightMap facts={facts()} now={OUT + 5 * HOUR + MINUTE} h24={false} />).container.querySelector('.flight-plane')).toBeNull()
  })

  it('shows the scheduled block time and the distance under the map', () => {
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    expect(container.querySelector('.flight-distance')!.textContent).toBe('5:002,706 nm')
    expect([...container.querySelectorAll('.flight-distance svg')].map(iconNameOf)).toEqual(['Timer', 'ArrowsLeftRight'])
  })

  it('leaves out the block time when it isn’t over zero', () => {
    const { container } = render(<FlightMap facts={facts({ blockMs: 0 })} now={THIRD} h24={false} />)
    expect(container.querySelector('.flight-distance')!.textContent).toBe('2,706 nm')
  })

  it('shows the app’s fallback when an airport isn’t in the list', () => {
    const unknown: FlightEnd = { code: 'ZZZ', city: 'ZZZ', place: null, timeZone: null }
    const { container } = render(<FlightMap facts={facts({ arr: unknown })} now={THIRD} h24={false} />)
    expect(container.querySelector('svg.flight-map-art')).toBeNull()
    expect(container.querySelector('.flight-map-fallback')!.textContent).toBe('ANC → ZZZ')
    expect(iconNameOf(container.querySelector('.flight-map-fallback svg'))).toBe('Airplane')
    expect(screen.getByRole('img', { name: 'Flight from Anchorage to ZZZ, 5 hours, about a third of the way' })).toBeTruthy()
  })

  it('lays itself out again when its width changes', () => {
    let measured = 343
    let report = () => {}
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: measured }) as DOMRect)
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { report = callback }
      observe() {}
      disconnect() {}
    })
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    measured = 400
    act(() => report())
    expect(container.querySelector('svg.flight-map-art')!.getAttribute('width')).toBe('400')
    const [x] = points(container, '.flight-route')[0]
    expect(x).toBeCloseTo(project(ANC.place!, box, 400).x, 9)
  })
})
```

In `tests/styles/styles.test.ts`, add this block just before `describe('location.css', () => {`:

```ts
describe('inFlight.css', () => {
  const top = blocks(css('inFlight'))
  const dark = find(top, '@media (prefers-color-scheme: dark)')
  const light = customProperties(find(top, '.flight-map')?.body)
  const darkMap = customProperties(find(blocks(dark?.body ?? ''), '.flight-map')?.body)

  // Slice 2C §4.3 and §4.5: FlightRouteMapView's fixed colors, as RGB fractions.
  it.each([
    ['--map-day-1', 'rgb(85%,92%,98%)', 'rgb(12%,18%,30%)'],
    ['--map-day-2', 'rgb(75%,85%,95%)', 'rgb(10%,15%,26%)'],
    ['--map-night-1', 'rgb(70%,80%,92%)', 'rgb(4%,8%,16%)'],
    ['--map-night-2', 'rgb(65%,75%,88%)', 'rgb(2%,5%,12%)'],
    ['--map-text', '#000000', '#ffffff'],
    ['--map-text-2', 'rgb(40%,40%,45%)', 'var(--gray)'],
  ])('%s is the app’s color, light and dark', (name, lightValue, darkValue) => {
    expect(normalize(light.get(name))).toBe(normalize(lightValue))
    expect(normalize(darkMap.get(name))).toBe(normalize(darkValue))
  })

  it('draws the route in the theme’s blue, or cyan at 80% in dark mode, so Increase Contrast reaches it', () => {
    expect([light.get('--map-route'), light.get('--map-route-middle'), light.get('--map-route-edge')]).toEqual(['var(--blue)', '1', '0.75'])
    expect([darkMap.get('--map-route'), darkMap.get('--map-route-middle'), darkMap.get('--map-route-edge')]).toEqual(['var(--cyan)', '0.8', '0.6'])
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/FlightMap.test.tsx tests/styles/styles.test.ts`
Expected: FAIL: neither file loads, so Vitest prints `Tests  no tests`. The map test stops at `Error: Failed to resolve import "../../src/ui/FlightMap" from "tests/ui/FlightMap.test.tsx". Does the file exist?`, and the style tests at `Error: ENOENT: no such file or directory` for `src/styles/inFlight.css`, since the new block reads the file as it is collected.

- [x] **Step 3: Implement**

Create `src/ui/FlightMap.tsx`:

```tsx
import { useId, useMemo, useRef } from 'preact/hooks'
import { distanceText, flightDurationText, flightMapLabel } from '../copy/flight'
import { mapAirportTimeText } from '../copy/format'
import { ICON_PATHS } from '../icons/iconPaths'
import { isSunUp } from '../time/sun'
import { DEFAULT_MAP_WIDTH, distanceNm, MAP_HEIGHT, mapBounds, planePose, project, routeArrow, routePoints, type GeoPoint, type MapPoint } from './flightMapGeometry'
import { flightSky, solarTransition, type Sky } from './flightSky'
import { useWidth } from './hooks/useWidth'
import { Icon } from './Icon'
import { flightProgress, type FlightEnd, type InFlightFacts } from './inFlightFacts'

export interface FlightMapProps {
  facts: InFlightFacts
  now: number
  h24: boolean
}

/** The plane is 20 px. The site's plane icon points up where the app's points right, so it turns 90° more (§4.6). */
const PLANE_SIZE = 20
const ICON_TURN = 90

const pointsAttr = (points: MapPoint[]) => points.map((p) => `${p.x},${p.y}`).join(' ')

/**
 * The in-flight map (slice 2C §4): FlightRouteMapView. It's one image to screen readers, described in words. Without
 * both airports' places it shows the app's fallback: a plane and the two codes.
 */
export function FlightMap({ facts, now, h24 }: FlightMapProps) {
  const box = useRef<HTMLDivElement>(null)
  const width = useWidth(box, DEFAULT_MAP_WIDTH)
  const { dep, arr } = facts
  const progress = flightProgress(facts, now)
  const nm = dep.place && arr.place ? distanceNm(dep.place, arr.place) : null
  const label = flightMapLabel({ from: dep.city, to: arr.city, nm, durationMs: facts.blockMs, progress })
  return (
    <div ref={box} class="flight-map" role="img" aria-label={label}>
      {dep.place && arr.place && nm != null ? (
        <MapDrawing facts={facts} depPlace={dep.place} arrPlace={arr.place} nm={nm} width={width} progress={progress} h24={h24} />
      ) : (
        <div class="flight-map-fallback" aria-hidden="true">
          <Icon name="Airplane" size={24} />
          <span>{`${dep.code} → ${arr.code}`}</span>
        </div>
      )}
    </div>
  )
}

interface MapDrawingProps {
  facts: InFlightFacts
  depPlace: GeoPoint
  arrPlace: GeoPoint
  nm: number
  width: number
  progress: number | null
  h24: boolean
}

function MapDrawing({ facts, depPlace, arrPlace, nm, width, progress, h24 }: MapDrawingProps) {
  const id = useId()
  // The route, the box and the sky change only with the flight, its times or the width; the plane moves every second.
  const layout = useMemo(() => {
    const bounds = mapBounds(depPlace, arrPlace)
    const points = routePoints(depPlace, arrPlace).map((p) => project(p, bounds, width))
    const depAt = project(depPlace, bounds, width)
    const arrAt = project(arrPlace, bounds, width)
    const depDay = isSunUp(facts.start, depPlace.lat, depPlace.lon)
    const arrDay = isSunUp(facts.end, arrPlace.lat, arrPlace.lon)
    const sky = flightSky(depDay, arrDay, depAt.x / width, arrAt.x / width, solarTransition(depPlace, arrPlace, facts.start, facts.end))
    return { bounds, line: pointsAttr(points), arrow: routeArrow(points), depAt, arrAt, depDay, arrDay, sky }
  }, [depPlace.lat, depPlace.lon, arrPlace.lat, arrPlace.lon, facts.start, facts.end, width])
  const plane = progress == null ? null : planePose(depPlace, arrPlace, layout.bounds, width, progress)
  const chevron = pointsAttr([layout.arrow.left, layout.arrow.tip, layout.arrow.right])
  return (
    <>
      <svg class="flight-map-art" width={width} height={MAP_HEIGHT} viewBox={`0 0 ${width} ${MAP_HEIGHT}`} aria-hidden="true">
        <defs>
          <SkyGradient id={`${id}-sky`} sky={layout.sky} />
          {/* Across the map's whole width, as the app's stroke gradient; userSpaceOnUse also keeps it on a level route. */}
          <linearGradient id={`${id}-route`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2="0">
            <stop offset="0" class="flight-route-edge" />
            <stop offset="0.5" class="flight-route-middle" />
            <stop offset="1" class="flight-route-edge" />
          </linearGradient>
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
          <filter id={`${id}-halo`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <rect class="flight-sky" width={width} height={MAP_HEIGHT} fill={`url(#${id}-sky)`} />
        <polyline class="flight-route-glow" points={layout.line} filter={`url(#${id}-glow)`} />
        <polyline class="flight-route" points={layout.line} stroke={`url(#${id}-route)`} />
        <polyline class="flight-arrow-glow" points={chevron} filter={`url(#${id}-glow)`} />
        <polyline class="flight-arrow" points={chevron} />
        {plane && (
          <g class="flight-plane" transform={`translate(${plane.at.x} ${plane.at.y})`}>
            <circle class="flight-plane-halo" r="15" filter={`url(#${id}-halo)`} />
            <g filter={`url(#${id}-glow)`}>
              <PlaneIcon heading={plane.heading} glow />
            </g>
            <PlaneIcon heading={plane.heading} />
          </g>
        )}
      </svg>
      <Airport end={facts.dep} at={layout.depAt} day={layout.depDay} time={facts.start} h24={h24} />
      <Airport end={facts.arr} at={layout.arrAt} day={layout.arrDay} time={facts.end} h24={h24} />
      <p class="flight-distance" style={{ left: `${width / 2}px` }}>
        {facts.blockMs > 0 && (
          <span class="flight-distance-part">
            <Icon name="Timer" size={10} color="var(--blue)" />
            {flightDurationText(facts.blockMs)}
          </span>
        )}
        <span class="flight-distance-part">
          <Icon name="ArrowsLeftRight" size={10} color="var(--blue)" />
          {distanceText(nm)}
        </span>
      </p>
    </>
  )
}

/** The sky's gradient (§4.3): the day or night pair top to bottom, or the ends' first colors split across. */
function SkyGradient({ id, sky }: { id: string; sky: Sky }) {
  if (sky.direction === 'down') {
    return (
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" class={`sky-${sky.time}-1`} />
        <stop offset="1" class={`sky-${sky.time}-2`} />
      </linearGradient>
    )
  }
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" class={`sky-${sky.left}-1`} />
      <stop offset={sky.leftUntil} class={`sky-${sky.left}-1`} />
      <stop offset={sky.rightFrom} class={`sky-${sky.right}-1`} />
      <stop offset="1" class={`sky-${sky.right}-1`} />
    </linearGradient>
  )
}

/** The plane icon, 20 px, centered on the group's origin and turned to the route's heading. */
function PlaneIcon({ heading, glow = false }: { heading: number; glow?: boolean }) {
  return (
    <g class={glow ? 'flight-plane-glow' : 'flight-plane-icon'} transform={`rotate(${heading + ICON_TURN}) scale(${PLANE_SIZE / 256}) translate(-128 -128)`}>
      {ICON_PATHS.Airplane.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  )
}

interface AirportProps {
  end: FlightEnd
  at: MapPoint
  day: boolean
  time: number
  h24: boolean
}

/** An airport's column, centered on its place (§4.5): a sun or a moon with its glow, the code, the city and the time. */
function Airport({ end, at, day, time, h24 }: AirportProps) {
  const icon = day ? 'Sun' : 'Moon'
  return (
    <div class="flight-airport" style={{ left: `${at.x}px`, top: `${at.y}px` }}>
      <span class={day ? 'flight-airport-icon day' : 'flight-airport-icon night'}>
        <Icon name={icon} size={14} />
        <Icon name={icon} size={14} />
      </span>
      <span class="flight-airport-code">{end.code}</span>
      <span class="flight-airport-city">{end.city}</span>
      {end.timeZone && <span class="flight-airport-time">{mapAirportTimeText(time, end.timeZone, h24)}</span>}
    </div>
  )
}
```

How it draws:
- **Glows:** each is a copy underneath, blurred by an SVG filter and faded by its own opacity. Safari 14 doesn't apply CSS filters to the shapes inside an SVG, and a CSS shadow can't fade a theme color without `color-mix`, which Safari 14 also lacks.
- **The route's fade:** it uses `userSpaceOnUse`, so it spans the map's width as the app's does, and it still shows on a perfectly level route.

Create `src/styles/inFlight.css`:

```css
/* The in-flight card (slice 2C): the app's LocationCardView in flight, its FlightRouteMapView, and the tracking popup. */

/* The map's own colors, fixed in the app (§4.3, §4.5): RGB fractions, written as percentages. Its system colors follow
   the site's theme, so Increase Contrast reaches them (§11). */
.flight-map {
  --map-day-1: rgb(85%, 92%, 98%);
  --map-day-2: rgb(75%, 85%, 95%);
  --map-night-1: rgb(70%, 80%, 92%);
  --map-night-2: rgb(65%, 75%, 88%);
  --map-text: #000000;
  --map-text-2: rgb(40%, 40%, 45%);
  --map-route: var(--blue);
  --map-route-middle: 1;
  --map-route-edge: 0.75;
}

@media (prefers-color-scheme: dark) {
  .flight-map {
    --map-day-1: rgb(12%, 18%, 30%);
    --map-day-2: rgb(10%, 15%, 26%);
    --map-night-1: rgb(4%, 8%, 16%);
    --map-night-2: rgb(2%, 5%, 12%);
    --map-text: #ffffff;
    --map-text-2: var(--gray);
    --map-route: var(--cyan);
    --map-route-middle: 0.8;
    --map-route-edge: 0.6;
  }
}

/* 200 px tall, the card's width; the drawing, the airports and the distance are laid over each other. */
.flight-map {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.flight-map-art {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
}

.sky-day-1 {
  stop-color: var(--map-day-1);
}

.sky-day-2 {
  stop-color: var(--map-day-2);
}

.sky-night-1 {
  stop-color: var(--map-night-1);
}

.sky-night-2 {
  stop-color: var(--map-night-2);
}

/* The route: 3 px, round, fading to 75% at the edges, over a 4 px glow of its color at 50% (§4.4). */
.flight-route-edge {
  stop-color: var(--map-route);
  stop-opacity: var(--map-route-edge);
}

.flight-route-middle {
  stop-color: var(--map-route);
  stop-opacity: var(--map-route-middle);
}

.flight-route,
.flight-route-glow,
.flight-arrow,
.flight-arrow-glow {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.flight-route-glow {
  stroke: var(--map-route);
  stroke-opacity: 0.5;
}

/* The arrow: the route's color at full strength, glowing at 80%. */
.flight-arrow,
.flight-arrow-glow {
  stroke: var(--map-route);
}

.flight-arrow-glow {
  stroke-opacity: 0.8;
}

/* The plane: a blue halo 30 px across at 30%, blurred 8 px, then the icon glowing blue at 80% (§4.6). */
.flight-plane-halo {
  fill: var(--blue);
  fill-opacity: 0.3;
}

.flight-plane-glow {
  fill: var(--blue);
  fill-opacity: 0.8;
}

.flight-plane-icon {
  fill: var(--map-text);
}

/* An airport's column, centered on its place: 4 px between lines (§4.5). */
.flight-airport {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  line-height: 1.2;
  white-space: nowrap;
}

/* A sun or a moon, 14 px, over a 4 px glow of its own color at 80%. */
.flight-airport-icon {
  display: grid;
}

.flight-airport-icon > .icon {
  grid-area: 1 / 1;
}

.flight-airport-icon > .icon:first-child {
  filter: blur(2px);
  opacity: 0.8;
}

.flight-airport-icon.day {
  color: var(--yellow);
}

.flight-airport-icon.night {
  color: var(--blue);
}

.flight-airport-code {
  font-family: var(--font-rounded);
  font-size: 16px;
  font-weight: 700;
  color: var(--map-text);
}

.flight-airport-city {
  font-size: 11px;
  font-weight: 500;
  color: var(--map-text-2);
}

.flight-airport-time {
  font-size: 10px;
  font-weight: 500;
  color: var(--map-text);
}

/* The duration and the distance, centered 20 px above the bottom: 8 px apart, each a 10 px blue icon and 12 px text (§4.7). */
.flight-distance {
  position: absolute;
  top: 180px;
  transform: translate(-50%, -50%);
  margin: 0;
  display: flex;
  gap: 8px;
  font-family: var(--font-rounded);
  font-size: 12px;
  line-height: 1.2;
  font-weight: 500;
  color: var(--map-text);
  white-space: nowrap;
}

.flight-distance-part {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* Without both airports' places: the day sky, a 24 px plane and the codes, 8 px apart, in the secondary color (§4.8). */
.flight-map-fallback {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(var(--map-day-1), var(--map-day-2));
  color: var(--map-text-2);
  font-size: 14px;
  font-weight: 500;
}
```

In `src/main.tsx`, import it after `sunPopup.css`:

```tsx
import './styles/sunPopup.css'
import './styles/inFlight.css'
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/FlightMap.test.tsx tests/styles/styles.test.ts`
Expected: PASS, 120 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1767 tests in 77 files after this task.

```bash
git add tests/ui/FlightMap.test.tsx tests/styles/styles.test.ts src/ui/FlightMap.tsx src/styles/inFlight.css src/main.tsx
git commit -m "Flight map: the drawn route, sky, airports, plane, duration and distance, and its styles (slice 2C §4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The card

**Files:**
- Create: `src/ui/InFlightCard.tsx`
- Modify: `src/styles/inFlight.css`
- Test: `tests/ui/InFlightCard.test.tsx`, `tests/styles/styles.test.ts`

- [x] **Step 1: Write the failing tests**

Create `tests/ui/InFlightCard.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InFlightCard } from '../../src/ui/InFlightCard'
import type { FlightEnd, InFlightFacts } from '../../src/ui/inFlightFacts'
import { HOUR, MINUTE } from '../../src/time/zoned'
import { iconNameOf } from '../fixtures/ui'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const ANC: FlightEnd = { code: 'ANC', city: 'Anchorage', place: { lat: 61.1744, lon: -149.9983 }, timeZone: 'America/Anchorage' }
const SDF: FlightEnd = { code: 'SDF', city: 'Louisville', place: { lat: 38.1746, lon: -85.7382 }, timeZone: 'America/Kentucky/Louisville' }
const OUT = Date.UTC(2026, 9, 12, 13, 40)
const NOW = OUT + 100 * MINUTE // 11:20 AM in Louisville
const facts = (over: Partial<InFlightFacts> = {}): InFlightFacts => ({
  dep: ANC, arr: SDF, start: OUT, end: OUT + 5 * HOUR, blockMs: 5 * HOUR, delayMinutes: 40,
  flightNumber: 'UPS2962', trackingNumber: 'UPS2962', links: null, ...over,
})
const card = (over: Partial<InFlightFacts> = {}, h24 = false, onOpenTracking = () => {}) => (
  <InFlightCard facts={facts(over)} now={NOW} h24={h24} onOpenTracking={onOpenTracking} />
)

describe('InFlightCard', () => {
  it('is a frosted card, named for screen readers, with the map, the banner and the info bar in that order', () => {
    const { container } = render(card())
    const section = container.querySelector('section')!
    expect(section.getAttribute('class')).toBe('card glass inflight')
    expect(screen.getByRole('heading', { level: 2, name: 'In flight' }).classList.contains('sr-only')).toBe(true)
    expect([...section.children].map((el) => el.getAttribute('class'))).toEqual(['sr-only', 'flight-map', 'inflight-banner late', 'inflight-bar'])
  })

  it('shows DELAYED with a warning for a late departure, and EARLY DEP with a check for an early one', () => {
    const { container, rerender } = render(card())
    const banner = () => container.querySelector('.inflight-banner')!
    expect(banner().textContent).toBe('DELAYED 40m')
    expect(iconNameOf(banner().querySelector('svg'))).toBe('Warning')
    rerender(card({ delayMinutes: -20 }))
    expect(banner().getAttribute('class')).toBe('inflight-banner early')
    expect(banner().textContent).toBe('EARLY DEP 20m')
    expect(iconNameOf(banner().querySelector('svg'))).toBe('CheckCircle')
  })

  it('has no banner when the flight is on time', () => {
    expect(render(card({ delayMinutes: null })).container.querySelector('.inflight-banner')).toBeNull()
  })

  it('makes the flight number a button that opens the tracking popup, handing itself over', () => {
    const open = vi.fn()
    render(card({}, false, open))
    const button = screen.getByRole('button', { name: 'UPS2962' })
    expect(button.getAttribute('aria-haspopup')).toBe('dialog')
    fireEvent.click(button)
    expect(open).toHaveBeenCalledWith(button)
  })

  it('says In Flight under the number, and keeps it without a number', () => {
    const { container } = render(card({ flightNumber: null }))
    expect(container.querySelector('.inflight-number')).toBeNull()
    expect(container.querySelector('.inflight-status')!.textContent).toBe('In Flight')
  })

  it('shows the arrival airport’s time and code, in 24-hour when asked', () => {
    const { container, rerender } = render(card())
    expect(container.querySelector('.inflight-time')!.textContent).toBe('Time in Louisville 11:20\u202FAM')
    expect(iconNameOf(container.querySelector('.inflight-time svg'))).toBe('NavigationArrow')
    expect(container.querySelector('.inflight-code')!.textContent).toBe('SDF')
    rerender(card({}, true))
    expect(container.querySelector('.inflight-time')!.textContent).toBe('Time in Louisville 11:20')
  })

  it('falls back to the departure’s time when the arrival’s zone isn’t known', () => {
    const { container } = render(card({ arr: { ...SDF, timeZone: null } }))
    expect(container.querySelector('.inflight-time')!.textContent).toBe('Time in Louisville 7:20\u202FAM') // Anchorage
  })
})
```

In `tests/styles/styles.test.ts`, add these tests at the end of the `inFlight.css` block:

```ts
  it('puts the banner’s white text on the readable fills', () => {
    expect(declarations(find(top, '.inflight-banner.late')!.body)).toContainEqual(['background', 'var(--fill-orange, var(--orange))'])
    expect(declarations(find(top, '.inflight-banner.early')!.body)).toContainEqual(['background', 'var(--fill-green, var(--green))'])
    expect(declarations(find(top, '.inflight-banner')!.body)).toContainEqual(['color', '#ffffff'])
  })

  // Slice 2C §5.2: the info bar's fixed colors, light and dark.
  it.each([
    ['--bar-text', 'rgb(10%,15%,25%)', '#ffffff'],
    ['--bar-text-2', 'rgb(30%,38%,50%)', 'var(--gray)'],
    ['--bar-underline', 'rgba(10%,15%,25%,.3)', 'rgba(255,255,255,.3)'],
    ['--bar-fill', 'rgba(65%,78%,90%,.6)', 'rgba(8%,12%,25%,.6)'],
  ])('%s is the info bar’s color, light and dark', (name, lightValue, darkValue) => {
    expect(normalize(customProperties(find(top, '.inflight-bar')?.body).get(name))).toBe(normalize(lightValue))
    expect(normalize(customProperties(find(blocks(dark?.body ?? ''), '.inflight-bar')?.body).get(name))).toBe(normalize(darkValue))
  })

  it('sets every light color before the dark block, so the dark ones win in dark mode', () => {
    const darkAt = top.indexOf(dark!)
    for (const head of ['.flight-map', '.inflight-bar']) {
      const colored = top.filter((b) => b.head === head && declarations(b.body).some(([prop]) => prop.startsWith('--')))
      expect(colored.length, head).toBeGreaterThan(0)
      for (const rule of colored) expect(top.indexOf(rule), head).toBeLessThan(darkAt)
    }
  })
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/InFlightCard.test.tsx tests/styles/styles.test.ts`
Expected: FAIL: the card test file with `Error: Failed to resolve import "../../src/ui/InFlightCard"`, and 6 style tests (`6 failed | 107 passed (113)`): the banner's fills, the bar's four colors, and light before dark.

- [x] **Step 3: Implement**

Create `src/ui/InFlightCard.tsx`:

```tsx
import { delayBannerText } from '../copy/flight'
import { shortTimeText } from '../copy/format'
import { FlightMap } from './FlightMap'
import { Icon } from './Icon'
import type { InFlightFacts } from './inFlightFacts'

export interface InFlightCardProps {
  facts: InFlightFacts
  now: number
  h24: boolean
  /** Opens the tracking popup. The flight number hands itself over, so focus can go back to it afterwards. */
  onOpenTracking: (button: HTMLButtonElement) => void
}

/**
 * LocationCardView while the pilot is in the air (slice 2C §5): the map, a delay banner when the departure is 15
 * minutes or more off, and the info bar with the flight number, "In Flight", and the arrival's local time and code.
 */
export function InFlightCard({ facts, now, h24, onOpenTracking }: InFlightCardProps) {
  const zone = facts.arr.timeZone ?? facts.dep.timeZone
  const offset = facts.delayMinutes
  return (
    <section class="card glass inflight">
      <h2 class="sr-only">In flight</h2>
      <FlightMap facts={facts} now={now} h24={h24} />
      {offset != null && (
        <p class={offset < 0 ? 'inflight-banner early' : 'inflight-banner late'}>
          <Icon name={offset < 0 ? 'CheckCircle' : 'Warning'} size={12} />
          {delayBannerText(offset)}
        </p>
      )}
      <div class="inflight-bar">
        <div class="inflight-flight">
          {facts.flightNumber && (
            <button type="button" class="inflight-number" aria-haspopup="dialog" onClick={(e) => onOpenTracking(e.currentTarget)}>
              {facts.flightNumber}
            </button>
          )}
          <span class="inflight-status">In Flight</span>
        </div>
        <div class="inflight-arrival">
          <p class="inflight-time">
            <Icon name="NavigationArrow" size={12} />
            <span class="sr-only">Time in {facts.arr.city} </span>
            {zone ? shortTimeText(now, zone, h24) : ''}
          </p>
          <span class="inflight-code">{facts.arr.code}</span>
        </div>
      </div>
    </section>
  )
}
```

In `src/styles/inFlight.css`, put the bar's light colors beside the map's, before the dark block:

```css
/* The info bar's own colors, fixed in the app too (§5.2). Colors come before the dark block that overrides them. */
.inflight-bar {
  --bar-text: rgb(10%, 15%, 25%);
  --bar-text-2: rgb(30%, 38%, 50%);
  --bar-underline: rgba(10%, 15%, 25%, 0.3);
  --bar-fill: rgba(65%, 78%, 90%, 0.6);
}
```

add their dark values at the end of the dark block:

```css
  .inflight-bar {
    --bar-text: #ffffff;
    --bar-text-2: var(--gray);
    --bar-underline: rgba(255, 255, 255, 0.3);
    --bar-fill: rgba(8%, 12%, 25%, 0.6);
  }
```

and add the card's styles at the end of the file:

```css
/* The card: the map, the banner and the bar stacked with no gaps inside the frosted card (§5.3). */
.inflight {
  overflow: hidden;
}

/* The delay banner: white 12 px bold text and icon, 6 px apart and 6 px above and below, on orange or green (§5.1).
   The readable fills keep the white text legible under Increase Contrast in dark mode (§11). */
.inflight-banner {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 0;
  color: #ffffff;
  font-size: 12px;
  line-height: 16px;
  font-weight: 700;
}

.inflight-banner.late {
  background: var(--fill-orange, var(--orange));
}

.inflight-banner.early {
  background: var(--fill-green, var(--green));
}

/* The info bar: 16 px in from the sides and 10 px top and bottom, over its own fill. */
.inflight-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: var(--bar-fill);
}

.inflight-flight {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}

/* The flight number: 18 px heavy rounded, underlined at 30%; a button with no button look, as the app's tap target. */
.inflight-number {
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  font-family: var(--font-rounded);
  font-size: 18px;
  line-height: 1.2;
  font-weight: 800;
  color: var(--bar-text);
  text-decoration: underline;
  text-decoration-color: var(--bar-underline);
  -webkit-tap-highlight-color: transparent;
}

.inflight-status {
  font-size: 11px;
  line-height: 1.2;
  font-weight: 500;
  color: var(--bar-text-2);
}

.inflight-arrival {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

/* The arrival's time: a 12 px location arrow, then 16 px semibold with steady digits. */
.inflight-time {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 16px;
  line-height: 1.2;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--bar-text);
}

.inflight-code {
  font-size: 10px;
  line-height: 1.2;
  font-weight: 500;
  color: var(--bar-text-2);
}
```

A media query adds no weight, so a light color that came after the dark block would win in dark mode too. The look check caught exactly that, and the order test now guards it.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/InFlightCard.test.tsx tests/styles/styles.test.ts`
Expected: PASS, 120 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1781 tests in 78 files after this task.

```bash
git add tests/ui/InFlightCard.test.tsx tests/styles/styles.test.ts src/ui/InFlightCard.tsx src/styles/inFlight.css
git commit -m "In-flight card: the map, the delay banner and the info bar (slice 2C §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The tracking popup

**Files:**
- Create: `src/ui/TrackingPopup.tsx`
- Modify: `src/styles/inFlight.css`
- Test: `tests/ui/TrackingPopup.test.tsx`, `tests/styles/styles.test.ts`

- [x] **Step 1: Write the failing tests**

Create `tests/ui/TrackingPopup.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { trackingLinks } from '../../src/copy/tracking'
import { TRACKING_CLOSE_MS, TrackingPopup } from '../../src/ui/TrackingPopup'
import { iconNameOf } from '../fixtures/ui'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const links = trackingLinks('5X', '2962')
const popup = (onClose = () => {}, withLinks = true) => <TrackingPopup flightNumber="UPS2962" links={withLinks ? links : null} onClose={onClose} />
const reduceMotion = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))

describe('TrackingPopup', () => {
  it('is a dialog named for the flight, with the app’s words', () => {
    const { container } = render(popup())
    const dialog = screen.getByRole('dialog', { name: 'UPS2962' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(iconNameOf(container.querySelector('.tracking-head svg'))).toBe('Airplane')
    expect(container.querySelector('.tracking-lead')!.textContent).toBe('Track this flight')
    expect([...container.querySelectorAll('.tracking-link-name')].map((el) => el.textContent)).toEqual(['FlightRadar24', 'FlightAware'])
    expect([...container.querySelectorAll('.tracking-link-caption')].map((el) => el.textContent)).toEqual(['Live tracking map', 'Flight status & history'])
  })

  it('links to the flight’s pages in a new tab, telling them nothing about where the visitor came from', () => {
    render(popup())
    const radar = screen.getByRole('link', { name: 'FlightRadar24 Live tracking map (opens in a new tab)' })
    const aware = screen.getByRole('link', { name: 'FlightAware Flight status & history (opens in a new tab)' })
    expect(radar.getAttribute('href')).toBe('https://fr24.com/UPS2962')
    expect(aware.getAttribute('href')).toBe('https://www.flightaware.com/live/flight/UPS2962')
    for (const link of [radar, aware]) {
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    }
  })

  it('marks each link with its icon and the “opens elsewhere” icon', () => {
    const { container } = render(popup())
    const [radar, aware] = [...container.querySelectorAll('.tracking-link')]
    expect([...radar.querySelectorAll('svg')].map(iconNameOf)).toEqual(['Broadcast', 'ArrowSquareOut'])
    expect([...aware.querySelectorAll('svg')].map(iconNameOf)).toEqual(['GpsFix', 'ArrowSquareOut'])
  })

  it('has only its header and “Track this flight” without links, as the app does', () => {
    const { container } = render(popup(() => {}, false))
    expect(container.querySelector('.tracking-link')).toBeNull()
    expect(container.querySelector('.tracking-lead')!.textContent).toBe('Track this flight')
  })

  it('puts focus on the close button as it opens', () => {
    render(popup())
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
  })

  it('closes by the close button, the backdrop or Escape, once, after the 0.2 s fade', () => {
    vi.useFakeTimers()
    for (const how of ['button', 'backdrop', 'escape'] as const) {
      const onClose = vi.fn()
      const { container, unmount } = render(popup(onClose))
      if (how === 'button') fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      if (how === 'backdrop') fireEvent.click(container.querySelector('.tracking-backdrop')!)
      if (how === 'escape') fireEvent.keyDown(document, { key: 'Escape' })
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(container.querySelector('.tracking-popup')!.getAttribute('class')).toBe('tracking-popup closing')
      act(() => {
        vi.advanceTimersByTime(TRACKING_CLOSE_MS - 1)
      })
      expect(onClose).not.toHaveBeenCalled()
      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(onClose).toHaveBeenCalledTimes(1)
      unmount()
    }
  })

  it('closes when a link is followed, as the app’s buttons do', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(popup(onClose))
    fireEvent.click(screen.getByRole('link', { name: /FlightAware/ }))
    act(() => {
      vi.advanceTimersByTime(TRACKING_CLOSE_MS)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes at once for visitors who ask for reduced motion', () => {
    reduceMotion()
    const onClose = vi.fn()
    render(popup(onClose))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
```

In `tests/styles/styles.test.ts`, add this test at the end of the `inFlight.css` block:

```ts
  it('springs the tracking popup open on the sun popup’s keyframes at 0.42 s, and stills it for reduced motion', () => {
    const animations = rulesIn(css('inFlight')).filter((r) => r.head === '.tracking-card').flatMap((r) => declarations(r.body)).filter(([prop]) => prop === 'animation')
    expect(animations).toContainEqual(['animation', 'sun-popup-fade 0.42s linear, sun-popup-zoom 0.42s linear'])
    expect(css('sunPopup')).toMatch(/@keyframes sun-popup-fade/)
    expect(css('sunPopup')).toMatch(/@keyframes sun-popup-zoom/)
    const still = find(top, '@media (prefers-reduced-motion: reduce)')
    expect(declarations(find(blocks(still?.body ?? ''), '.tracking-backdrop, .tracking-card')!.body)).toContainEqual(['animation', 'none'])
  })
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/TrackingPopup.test.tsx tests/styles/styles.test.ts`
Expected: FAIL: the popup test file with `Error: Failed to resolve import "../../src/ui/TrackingPopup"`, and the animation's style test (`1 failed | 113 passed (114)`).

- [x] **Step 3: Implement**

Create `src/ui/TrackingPopup.tsx`:

```tsx
import { useEffect, useId, useRef, useState } from 'preact/hooks'
import type { TrackingLinks } from '../copy/tracking'
import type { IconName } from '../icons/iconPaths'
import { useModalDialog } from './hooks/useModalDialog'
import { Icon } from './Icon'
import { prefersReducedMotion } from './motion'

/** Closing fades and shrinks the card over 0.2 s, as the app's dismissView does, before the popup goes. */
export const TRACKING_CLOSE_MS = 200

export interface TrackingPopupProps {
  /** The header: the airline's ICAO code and the digits ("UPS2962"). */
  flightNumber: string
  /** The tracking sites' pages. Without them the popup has only its header and "Track this flight", as the app's. */
  links: TrackingLinks | null
  /** Called once the popup has finished closing. */
  onClose: () => void
}

/**
 * The tracking popup (slice 2C §6): FlightTrackingPopupView, with links to the flight on FlightRadar24 and FlightAware.
 * The screen draws it outside <main> and hides the page from screen readers while it's open.
 */
export function TrackingPopup({ flightNumber, links, onClose }: TrackingPopupProps) {
  const titleId = useId()
  const card = useRef<HTMLElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const [still] = useState(prefersReducedMotion)
  const [closing, setClosing] = useState(false)
  const closed = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const close = () => {
    if (closed.current) return
    closed.current = true
    if (still) return onClose()
    setClosing(true)
    timer.current = setTimeout(onClose, TRACKING_CLOSE_MS)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  // Focus on the close button, Tab kept inside, Escape to close, the page held still. The screen hands focus back.
  useModalDialog(card, closeButton, close)

  return (
    <div class={closing ? 'tracking-popup closing' : 'tracking-popup'}>
      <div class="tracking-backdrop" onClick={close} />
      <section ref={card} class="tracking-card glass" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div class="tracking-head">
          <Icon name="Airplane" size={17} color="var(--blue)" />
          <h2 id={titleId} class="tracking-number">
            {flightNumber}
          </h2>
          <button ref={closeButton} type="button" class="tracking-close" aria-label="Close" onClick={close}>
            <Icon name="XCircle" size={22} />
          </button>
        </div>
        <p class="tracking-lead">Track this flight</p>
        {links && (
          <>
            <TrackingLink href={links.flightRadar24} kind="radar" icon="Broadcast" name="FlightRadar24" caption="Live tracking map" onFollow={close} />
            <TrackingLink href={links.flightAware} kind="aware" icon="GpsFix" name="FlightAware" caption="Flight status & history" onFollow={close} />
          </>
        )}
      </section>
    </div>
  )
}

interface TrackingLinkProps {
  href: string
  kind: 'radar' | 'aware'
  icon: IconName
  name: string
  caption: string
  /** Following a link closes the popup, as the app's buttons do. */
  onFollow: () => void
}

/** A link row: the icon, the name over its caption, and the "opens elsewhere" mark. It opens in a new tab, with no referrer. */
function TrackingLink({ href, kind, icon, name, caption, onFollow }: TrackingLinkProps) {
  return (
    <a class={`tracking-link ${kind}`} href={href} target="_blank" rel="noopener noreferrer" onClick={onFollow}>
      <span class="tracking-link-icon">
        <Icon name={icon} size={20} />
      </span>
      <span class="tracking-link-text">
        <span class="tracking-link-name">{name}</span>
        <span class="tracking-link-caption">{caption}</span>
      </span>
      <span class="sr-only"> (opens in a new tab)</span>
      <Icon name="ArrowSquareOut" size={15} />
    </a>
  )
}
```

Add the popup's styles at the end of `src/styles/inFlight.css`:

```css
/* The tracking popup (§6): it covers the page, centering the card with at least 16 px of screen around it. */
.tracking-popup {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom))
    max(16px, env(safe-area-inset-left));
}

/* Black at 30% over a blur of the page, as behind the sun popup. */
.tracking-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
}

/* Up to 340 px wide, 20 px padding, 16 px between rows, frosted, with a 28 px radius. */
.tracking-card {
  position: relative;
  width: min(340px, 100%);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-radius: 28px;
  color: var(--text);
}

.tracking-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tracking-number {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 20px;
  line-height: 25px;
  font-weight: 700;
}

/* The close button: a 22 px ✕ in a circle, in the secondary color. */
.tracking-close {
  padding: 0;
  border: 0;
  background: none;
  color: var(--text-2);
  line-height: 0;
  cursor: pointer;
}

.tracking-lead {
  margin: 0;
  font-size: 15px;
  line-height: 20px;
  color: var(--text-2);
}

/* A link row: 14 px padding and radius, its color's text on that color at 12% (drawn behind it), 12 px between parts. */
.tracking-link {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  text-decoration: none;
}

.tracking-link::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: currentColor;
  opacity: 0.12;
}

.tracking-link.radar {
  color: var(--blue);
}

.tracking-link.aware {
  color: var(--orange);
}

.tracking-link-icon {
  flex: none;
  width: 32px;
  display: flex;
  justify-content: center;
}

.tracking-link-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tracking-link-name {
  font-size: 17px;
  line-height: 22px;
  font-weight: 600;
}

.tracking-link-caption {
  font-size: 12px;
  line-height: 16px;
  color: var(--text-2);
}

.tracking-link > .icon:last-child {
  flex: none;
  color: var(--text-2);
}

/* Opening: the app's spring(response: 0.35, dampingFraction: 0.7) on the card's size and opacity. It's the sun popup's
   spring shape (the same damping) at 0.35 s, so its keyframes serve at 0.42 s. */
.tracking-backdrop {
  animation: sun-popup-fade 0.42s linear;
}

.tracking-card {
  animation: sun-popup-fade 0.42s linear, sun-popup-zoom 0.42s linear;
}

/* Closing: 0.2 s, ease-out, fading and shrinking back to half size. */
.tracking-popup.closing .tracking-backdrop {
  opacity: 0;
  transition: opacity 0.2s ease-out;
}

.tracking-popup.closing .tracking-card {
  opacity: 0;
  transform: scale(0.5);
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .tracking-backdrop,
  .tracking-card {
    animation: none;
  }

  .tracking-popup.closing .tracking-backdrop,
  .tracking-popup.closing .tracking-card {
    transition: none;
  }
}
```

The app's `spring(response: 0.35, dampingFraction: 0.7)` has the same damping as the sun popup's `spring(response: 0.5, dampingFraction: 0.7)`. So it has the same shape, 0.7 times as long, and the sun popup's keyframes, sampled every 0.1 s over 0.6 s, fit it exactly at 0.42 s. The popup reuses `sun-popup-fade` and `sun-popup-zoom` at that length.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/TrackingPopup.test.tsx tests/styles/styles.test.ts`
Expected: PASS, 122 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1791 tests in 79 files after this task.

```bash
git add tests/ui/TrackingPopup.test.tsx tests/styles/styles.test.ts src/ui/TrackingPopup.tsx src/styles/inFlight.css
git commit -m "Tracking popup: the flight's FlightRadar24 and FlightAware links, opening and closing as the app's (slice 2C §6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The status screen

**Files:**
- Modify: `src/ui/StatusScreen.tsx`
- Test: `tests/ui/StatusScreen.test.tsx`

- [x] **Step 1: Write the failing test**

Add this block at the end of `tests/ui/StatusScreen.test.tsx`:

```tsx
describe('StatusScreen in-flight card (slice 2C)', () => {
  const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING
  const jumpseater = engineFor(demoRaw('jumpseater', A))
  const screenFor = (engine: { schedule: ReturnType<typeof buildSchedule>; legs: Leg[] }, minutes: number) => {
    const now = at(minutes)
    return (
      <StatusScreen snap={makeSnapshot(engine.schedule, engine.legs, now, NY)} now={now} viewerTz={NY} homeTz={NY} h24={false}
        airports={testAirports} weather={null} demo={false} celebrateKey={0} footer={footer(now)} />
    )
  }
  const reduceMotion = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))

  it('takes the location card’s place while the pilot is flying: after the countdown, before the trip card', () => {
    const { container } = renderAt(100)
    const card = container.querySelector('.inflight')!
    expect(container.querySelector('.location')).toBeNull()
    expect(container.querySelector('.countdown')!.compareDocumentPosition(card) & FOLLOWING).toBeTruthy()
    expect(card.compareDocumentPosition(container.querySelector('.trip-card')!) & FOLLOWING).toBeTruthy()
    expect(screen.getByRole('img', { name: /^Flight from Louisville to Rockford, / })).toBeTruthy()
  })

  it('isn’t there on the ground', () => {
    expect(renderAt(180).container.querySelector('.inflight')).toBeNull()
  })

  it('shows the delayed flight’s banner', () => {
    expect(renderAt(1700).container.querySelector('.inflight-banner')!.textContent).toBe('DELAYED 40m')
  })

  it('opens the tracking popup from the flight number, after <main>, and hides the page behind it', () => {
    const { container } = renderAt(100)
    const main = container.querySelector('main')!
    fireEvent.click(screen.getByRole('button', { name: 'UPS2961' }))
    const dialog = screen.getByRole('dialog', { name: 'UPS2961' })
    expect(main.contains(dialog)).toBe(false)
    expect(main.compareDocumentPosition(dialog) & FOLLOWING).toBeTruthy()
    expect(main.getAttribute('aria-hidden')).toBe('true')
    expect(main.hasAttribute('inert')).toBe(true)
  })

  it('shows the page again and returns focus to the flight number once the popup has closed', async () => {
    reduceMotion()
    const { container } = renderAt(100)
    fireEvent.click(screen.getByRole('button', { name: 'UPS2961' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(container.querySelector('main')!.hasAttribute('inert')).toBe(false)
    await act(() => {})
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'UPS2961' }))
  })

  it('closes the popup by itself at landing, and keeps it closed on the next flight', () => {
    const { rerender } = render(screenFor(e, 100))
    fireEvent.click(screen.getByRole('button', { name: 'UPS2961' }))
    rerender(screenFor(e, 180))
    expect(screen.queryByRole('dialog')).toBeNull()
    rerender(screenFor(e, 300))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('covers a jumpseat, with the airline’s ICAO code in the popup', () => {
    render(screenFor(jumpseater, -240))
    fireEvent.click(screen.getByRole('button', { name: 'DL1234' }))
    expect(screen.getByRole('heading', { level: 2, name: 'DAL1234' })).toBeTruthy()
  })

  it.each(Object.keys(DEMO_SCENES) as DemoScene[])('shows in the demo’s %s scene only when the pilot is in the air', (scene) => {
    const NOW = Date.UTC(2026, 9, 20, 16, 0)
    const schedule = buildSchedule(demoRawForScene(scene, NOW), NOW)
    const snap = makeSnapshot(schedule, buildLegs(schedule), NOW, NY)
    const { container } = render(
      <StatusScreen snap={snap} now={NOW} viewerTz={NY} homeTz={NY} h24={false} airports={testAirports} weather={null} demo celebrateKey={0}
        footer={footer(NOW)} />,
    )
    expect(container.querySelector('.inflight') != null).toBe(scene === 'flying' || scene === 'last-leg')
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/StatusScreen.test.tsx`
Expected: FAIL in 8 of the 19 new tests (`8 failed | 56 passed (64)`). There's no in-flight card yet, so six of the card's tests can't find it, its banner or its flight number button, and the demo's `flying` and `last-leg` scenes show no card. The other 11 already pass: no card on the ground, and the ten demo scenes where the pilot isn't in the air.

- [x] **Step 3: Implement**

In `src/ui/StatusScreen.tsx`, import the card and its facts after the `Footer` import:

```tsx
import { Footer, type FooterProps } from './Footer'
import { InFlightCard } from './InFlightCard'
import { inFlightFacts } from './inFlightFacts'
```

and the popup after the `Title` import:

```tsx
import { Title, titleFor } from './Title'
import { TrackingPopup } from './TrackingPopup'
```

replace the screen's description, the comment above `StatusScreen`, with:

```tsx
 * The top of Crewluve's main screen, in its card order (spec §4.4; the location card, slice 2B1 §3; the trip cards, slice
 * 2A §3; the in-flight card in the location card's place, slice 2C §3). Then the sun popup the location card's dial opens
 * (slice 2B2 §9) and the tracking popup the in-flight card's flight number opens (slice 2C §6). The popups go after
 * <main>, since a card's frosted glass would trap a full-screen overlay inside the card; while one is open, the page is
 * hidden from screen readers.
 */
```

keep the tracking popup's state beside the sun popup's, so those lines read:

```tsx
  const [sunOpen, setSunOpen] = useState(false)
  const [trackingOpen, setTrackingOpen] = useState(false)
  /** The card's dial, which opened the popup: focus goes back to it afterwards. */
  const dial = useRef<HTMLElement | null>(null)
  /** The in-flight card's flight number, which opened the tracking popup: focus goes back to it afterwards. */
  const flightNumber = useRef<HTMLElement | null>(null)
  const wasOpen = useRef(false)
  const wasTracking = useRef(false)
```

work out the card's facts, close the popup at landing, and hand focus back, after the dial's focus effect:

```tsx
    if (wasOpen.current && !open && dial.current?.isConnected) dial.current.focus()
    wasOpen.current = open
  }, [open])
  // The in-flight card while the pilot is in the air; the tracking popup closes by itself when its flight number goes,
  // at landing, and focus goes back to the flight number once it has closed, as for the dial.
  const flying = inFlightFacts(snap, p.airports)
  const tracking = trackingOpen && flying?.trackingNumber != null
  useEffect(() => {
    if (trackingOpen && !tracking) setTrackingOpen(false)
  }, [trackingOpen, tracking])
  useEffect(() => {
    if (wasTracking.current && !tracking && flightNumber.current?.isConnected) flightNumber.current.focus()
    wasTracking.current = tracking
  }, [tracking])
  const hidden = open || tracking
```

hide the page while either popup is open, by changing `<main>`'s opening tag to:

```tsx
      <main class="screen" aria-hidden={hidden ? 'true' : undefined} inert={hidden || undefined}>
```

draw the card in the location card's place, just before the upcoming trip card:

```tsx
        {flying && (
          <InFlightCard
            facts={flying}
            now={p.now}
            h24={p.h24}
            onOpenTracking={(button) => {
              flightNumber.current = button
              setTrackingOpen(true)
            }}
          />
        )}
        {snap.upcomingTrip && (
```

and draw the popup after the sun popup, outside `<main>`:

```tsx
          onClose={() => setSunOpen(false)}
        />
      )}
      {tracking && flying?.trackingNumber && (
        <TrackingPopup flightNumber={flying.trackingNumber} links={flying.links} onClose={() => setTrackingOpen(false)} />
      )}
    </>
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/StatusScreen.test.tsx`
Expected: PASS, 64 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1810 tests in 79 files after this task.

```bash
git add tests/ui/StatusScreen.test.tsx src/ui/StatusScreen.tsx
git commit -m "Status screen: the in-flight card in the location card's place, and the tracking popup after <main> (slice 2C §3, §6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Look check with the user (controller)

**Files:**
- Modify (only if nudges are needed): `src/styles/inFlight.css`

- [x] **Step 1: Build and open the preview**

Run `npm run build`, then start or reuse the `crewluve-preview` server from `.claude/launch.json` (port 5181) in the browser pane.

- [x] **Step 2: Look at the demo's flights**

At the mobile preset (375 × 812), in light and in dark (`resize_window` with `colorScheme`), look at:
- `/?demo=1&scene=flying`: Louisville to Rockford, 40 minutes into an hour and a half;
- `/?demo=1&scene=last-leg`: Anchorage to Louisville, 40 minutes late, so the banner shows;
- the tracking popup, opened from the flight number.

The demo runs on the real clock, so day, night and the split sky follow the real time.

The browser pane can hand back the previous frame right after a script changes the page. Take a small throwaway screenshot first, then the real one. Run `document.getAnimations().forEach((a) => a.finish())` before each.

Check:
- **The map:**
  - the sky's split and colors;
  - the route's glow, fade and arrow;
  - the airports' columns, with a sun or a moon;
  - the plane turned along the route, with its halo;
  - the duration and the distance.
- **The card:**
  - the banner on orange or green;
  - the info bar's colors in both modes;
  - the flight number underlined.
- **The popup:**
  - its two tinted links and focus on ✕;
  - closing by ✕, the backdrop and Escape, with focus back on the flight number.
- **Increase Contrast:** switch the high-contrast rules on, then check the route, sun, moon, banner and popup colors.

The browser pane can't turn on Increase Contrast, so this debugging script, from the Part A follow-ups, copies the `prefers-contrast: more` rules out of their media queries for inspection. It changes nothing on disk, and a reload undoes it. Run it with `javascript_tool` after each page load:

```js
for (const sheet of document.styleSheets) {
  for (const rule of [...sheet.cssRules]) {
    if (!(rule instanceof CSSMediaRule) || !rule.media.mediaText.includes('prefers-contrast: more')) continue
    const rest = rule.media.mediaText.split(' and ').filter((m) => !m.includes('prefers-contrast')).join(' and ')
    const inner = [...rule.cssRules].map((r) => r.cssText)
    if (rest) sheet.insertRule(`@media ${rest} { ${inner.join(' ')} }`, sheet.cssRules.length)
    else for (const text of inner) sheet.insertRule(text, sheet.cssRules.length)
  }
}
document.getAnimations().forEach((a) => a.finish())
```

Light or dark comes from `resize_window` with `colorScheme`; reload after switching, then run the script again. The CSP allows this: it blocks new `<style>` elements, not changes through the CSSOM.

- [x] **Step 3: Ask the user to sign off**

Show the user side-by-side screenshots and ask one question: "Looks right (Recommended)" or "Change something". Apply their notes, then show them again.

- [x] **Step 4: Run the gates and commit any nudges**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/styles/inFlight.css
git commit -m "In-flight card: visual nudges from the look check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Merge and release (controller, asks first)

- [x] **Step 1: Merge**

Use superpowers:finishing-a-development-branch. Ask the user one question about how to merge `slice2c` into `main`.

- [x] **Step 2: Release, only with a fresh yes**

Ask before pushing `main`; the push redeploys crewluve.crewlu.net. After the "Deploy to GitHub Pages" run succeeds:
- open https://crewluve.crewlu.net/?demo=1, whose default scene is in the air, and check that the in-flight card shows;
- check that `read_console_messages` with `onlyErrors: true` shows nothing, and that the demo made no requests beyond the page's own files;
- open the tracking popup and check its two links' addresses.

- [x] **Step 3: Update the memory**

Update the project memory with the new tip and what's next: slice 3, the Schedule page.

---

## Done when

- `npx vitest run`, `npx tsc --noEmit` and `npm run build` are all green, with 1849 tests in 79 files (1810 from the printed tasks, plus the review fixes).
- While the pilot is in the air, the in-flight card takes the location card's place, with the map, the banner and the info bar. Its flight number opens the tracking popup (Tasks 1–12).
- The user has signed off on the look (Task 13), and the card is live on crewluve.crewlu.net, released with the user's yes (Task 14).

## Spec coverage

| Spec section | Tasks |
|---|---|
| §3 When it shows | 7 (flights and jumpseats, not ground), 12 (the location card's place) |
| §4.1 Size and layout | 3 (padding), 8 (measured width), 9 (200 px) |
| §4.2 Bounds and projection | 3 |
| §4.3 The sky | 2 (the sun), 4 (the sunrise or sunset point and the sky), 9 (colors and drawing) |
| §4.4 The route and its arrow | 3 (the arrow), 9 (the line, fade and glows) |
| §4.5 The airports | 5 (the time format), 9 (the columns) |
| §4.6 The plane | 3 (pose), 7 (progress), 9 (the icon, halo and turn) |
| §4.7 Duration and distance | 3 (distance), 5 (texts), 9 |
| §4.8 Fallback | 9 |
| §4.9 Updates | 9 (memoized layout, the screen's clock) |
| §4.10 For screen readers | 5 (the description), 9 |
| §5.1 The delay banner | 5 (texts), 7 (the 15-minute rule), 10 |
| §5.2 The info bar | 5 (the flight number), 10 |
| §5.3 The card | 10 |
| §6 The tracking popup | 6 (callsign and links), 11, 12 (opening, focus back, closing at landing) |
| §7 Data | 7 |
| §8 How it's built | 1–12 |
| §9 Security and privacy | 6 (letters and digits only), 11 (new tab, no referrer); no new requests |
| §10 Deliberate differences | 7 and 9 (1), 7 (2), 5 and 9 (3), 6 and 11 (4), 9, 10 and 11 (5), 7 (6), 10 (7), 2 and 4 (8), 6 (9) |
| §11 Increase Contrast | 9, 10 and 11 (system colors through the theme, fixed colors as values, readable fills on the banner) |
| §12 Testing | Every task, then 13 |

## Execution notes

**Build, 2026-10-11**
- The controller applied the printed blocks task by task with the replay tools, on branch `slice2c` from `53fd2ff`. Every Step 2 failed as printed, every Step 4 passed with its count, and the gates passed after every task. The suite ended at 1810 tests in 79 files (`370f88d`), and the 30 files matched the scratch build byte for byte.
- Task 1: `@phosphor-icons/core` 2.1.1 was copied into `node_modules` from the scratch copy rather than installed by `npm run icons`, so nothing was downloaded. `node scripts/build-icons.mjs` wrote the 59 icons, and `package-lock.json` didn't change.

**Batch A spec review: four minor findings, fixed; the re-check passed**
- Tasks 1 and 9, the distance icon: the app draws `arrow.left.and.right`, one arrow with a head at each end. Phosphor's `arrows-left-right` is two stacked arrows. It's now `arrows-horizontal`, as `ArrowsHorizontal`, in the icon script, the icon file, `FlightMap.tsx` and their tests, and spec §8 is reworded (`1add504`).
- Tasks 3 and 4, test gaps: three rules could be broken without a test failing. They were the plane's heading within 1 px of landing (and nothing tested takeoff), the sky's right-edge stop, and widening evenly on both sides. New or extended tests now catch each (`dcedfc2`).
- Task 6, from the review's code-quality note: `tracking.ts` held a second copy of the 15 airline pairs. `airlines.ts` now reverses its one table, as the app's FlightTrackingHelper does, and exports `airlineIcao`, which `tracking.ts` uses (`c30ba7f`).

**Batch B spec review: five minor findings, fixed**
- Task 9, the layers: the app draws the plane over the airports' labels, but the site drew the labels over the plane. That showed for about the first and last sixth of each flight. The plane is now a second SVG, `svg.flight-map-plane`, laid over the airports' columns.
- Task 9, the glows: the route's glow now follows the line's own fade at half strength, as the app's shadow does. Its blur covers the whole map, so a route running straight up the map keeps its glow. Spec §4.4 and §8 are reworded (`75be342`).
- Task 10: Phosphor's location arrow points up and to the left, so it's mirrored to point up and to the right like the app's `location.fill`. When only the departure's zone is known, screen readers now hear the departure's city with its time; with no zone, there's no time and no label. Spec §5.2 and §10 item 5 are reworded (`afe230a`).
- Tasks 9–11, tests: the popup's link test no longer makes the test browser try to open FlightAware. Style tests now pin the text colors, the glows, the link tints, the backdrop and the closing timings (`55816a0`).
- The re-check passed. Suite: 1838 tests in 79 files.

**Batch A code-quality review: two test gaps and some tidying, fixed; the re-review passed**
- Tasks 3 and 5, tests: new tests pin the box of a route across the antimeridian, and the airport's own weekday on night flights, where it isn't UTC's. Each fails when its rule is broken on purpose. A "1 nautical mile" case was added too (`a1ddada`).
- Task 2: `ZENITH` is now `90 - SUN_UP_ALTITUDE`, one horizon for sunrise, sunset and the map's daylight, with the same value.
- Task 6: `airlineIcao` trims like `airlines.ts`'s other lookups, and `trackingFlightNumber` trims and uppercases the code once.
- Task 3: `ROUTE_SEGMENTS` and `boxLongitude` are no longer exported (`62122d4`, `3be6850`).

**Batch B code-quality review: two important findings and some polish, fixed; the re-review passed**
- Task 10: screen readers heard "DELAYED 40m", whose "m" can be read as meters. They now hear "Delayed 40 minutes" or "Departed 20 minutes early", worded as the sun dial says a delay. Spec §10 item 5 lists it (`6707448`).
- Tasks 7 and 12: tests now pin that a flight without an airline still opens the tracking popup, with its header only (`c46e761`).
- Tasks 9–12, the polish (`5e4a828`, `ae94256`):
  - the popup's ✕ has the sun popup's 34 px tap area;
  - the tracking card scrolls on a short screen;
  - the duration and distance line centers with `left: 50%`;
  - the sky's stop classes are `flight-sky-*`;
  - tests pin that a new departure or landing time redraws the map's daylight.

**Look check (Task 13), 2026-10-11:** the user approved the look ("Looks right"). They saw a sheet of both demo flights in light and dark, the tracking popup, and the Increase Contrast colors, at 375 px.

**Final whole-branch review: ready to merge and release; its points fixed in the same round**
- Task 9, tests: a style test now ties the sky's and the route's stop classes to their colors, and pins the lines unfilled inside the 200 px box. A renamed class or a filled line would otherwise paint black on the live card (`5043c79`).
- Task 10: the flight number now tells screen readers what it opens, "UPS2962. Opens flight tracking.", as the sun dial says "Opens sun details." Spec §10 item 5 lists it (`82f0703`).
- Tasks 10 and 11, names (`902e590`):
  - the popup's prop is `trackingNumber`, since `InFlightFacts.flightNumber` is the other, Duty-form number;
  - the info bar's colors are `--info-bar-*`, so they don't read like the trip card's `--bar-track`.
- Task 7, tests: an airline code with more than letters and digits still opens the popup, with no links (`9eddcc1`).
- The spec now says the popup closes by itself at landing (§6), and that with neither zone known the info bar's arrow shows alone, as in the app (§5.2). The summary lines at the top of this plan and its "Done when" now point to the final count.
- The re-check passed. From it, style tests now also pin the info bar's tint and the fallback map's sky, and the tracking number's comment says when it falls back (`adcb2db`).

**Merge and release (Task 14), 2026-10-11:**
- **Merge:** the user chose "Merge into main locally", a fast-forward to `ff1c51e`. The gates were green on main, with 1849 tests in 79 files.
- **Release:** with the user's separate yes, main was pushed. The "Deploy to GitHub Pages" run 38199666092 succeeded on its first deploy attempt.
- **The live check:** the live site serves the same files as the local build (`index-9pYBu38L.js`, `index-D7sl2I_p.css`). On https://crewluve.crewlu.net/?demo=1:
  - the in-flight card shows;
  - there are no console errors, and no requests beyond the page's own files;
  - the popup's links read `https://fr24.com/UPS2961` and `https://www.flightaware.com/live/flight/UPS2961`, each opening in a new tab with `noopener noreferrer`;
  - Escape hands focus back to the flight number.

**Left for later:**
- **The two popups' shared code:** the tracking popup copies the sun popup's closing logic, and the status screen holds two copies of the open-and-focus-return state. Shared hooks would remove both copies.
- **Closing during the opening spring:** both popups keep springing in when closed during it.
- **Focus when a popup closes by itself:** at landing or takeoff the button that opened it is gone, so focus falls to the page; `<main>` or the new card's heading would keep screen-reader users oriented.
- These three belong together, best before slice 3 adds more popups.
- **Longitude's spelling:** `GeoPoint` spells it `lon`, where the airport list and `sun.ts` use `lng`.
- **One source for the delay:** `inFlightFacts` works out the delay with the same `departureOffset` as the snapshot's `delay`; reading `snap.delay` would keep the banner and the sentence in step by construction. They agree today.
- **Suite:** 1849 tests in 79 files.
