# The Website's Trip Map on Apple Maps: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The trip map's card and full map show Apple's map through MapKit JS. That brings pan and zoom, a Hybrid, Map or Satellite style button and Recenter, with the trip drawn on top. Today's SVG drawing stays as the fallback (`docs/superpowers/specs/2026-11-14-trip-map-apple-maps-design.md`).

**Architecture:**
- **What to draw:** a pure plan module turns the existing drawing data (`tripMapDrawing`, `nightLayers`, `framingPoints`) into what MapKit should show.
- **Loading:** a small store loads MapKit JS once per page with `@apple/mapkit-loader`.
- **Drawing:** `AppleTripMap` creates one `mapkit.Map` and updates its overlays and annotations in place each render. It shows `TripMapSvg` until MapKit is ready, and after any failure.
- **Tests:** they never load Apple's code. The default loader refuses in test mode, and component tests pass a fake `mapkit`.

**Tech Stack:** Preact 10, TypeScript 5.9 (lib ES2020), Vite 5, Vitest 3 with happy-dom, `@apple/mapkit-loader` 1.0.0 (MIT), MapKit JS 6 from Apple's CDN.

---

## Ground rules

- **Branch:** `trip-map-apple` (local), made from `trip-map-facts` at `c35feca`. Never push `main`: a push there publishes the live site. Push this branch only with Todd's yes, and note it in the side-session `repo-state.md` first.
- **Commits:** only with Todd's yes, every time. Each commit takes only its own files.
- **Leave alone:**
  - the untracked `docs/superpowers/plans/2026-10-26-partner-links-piece2-release.md`;
  - the throwaway `mapkit-spike.*`, deleted in Task 9;
  - `.env.local` (git-ignored), which holds the 7-day local token `VITE_MAPKIT_DEV_TOKEN`. Never print it, copy it into `src`, or commit it.
- **Already here:** `.claude/launch.json` has an uncommitted `crewluve-mapkit` dev server on port 5182, which reads `.env.local` at start. It's committed in Task 9.
- **Checks:** `npm test` and `npm run build`. Tests can't reach the network (`tests/setup/noNetwork.ts`).
- **MapKit facts checked on 2026-11-14** (MapKit JS 6.1.205, on the test page):
  - `mapkit.MapType.{Hybrid, Standard, Satellite}` and `mapkit.ColorScheme.{Light, Dark}`;
  - `mapkit.FeatureVisibility.Hidden`, `mapkit.MapRect(x, y, w, h)` in the unit square, `mapkit.Padding(top, right, bottom, left)`;
  - `Annotation.DisplayPriority` (Low, High, Required) and `Annotation.CollisionMode.Circle`;
  - on the map, `isScrollEnabled`, `isZoomEnabled`, `isRotationEnabled`, `showsZoomControl`, `showsMapTypeControl`, `showsCompass`, `showsPointsOfInterest`, `colorScheme`, `padding`, `setVisibleMapRectAnimated` and `destroy`;
  - `Style({ lineDash })`, and assignable `points` on polylines and polygons;
  - a `MapRect` crossing the date line (x 0.85, width 0.3) is accepted.

## Files

- Create: `src/map/appleMapToken.ts`: the site's token, and the choice between it and the local one.
- Create: `src/map/appleMapStyle.ts`: the three styles, the cycle, and the kept style.
- Create: `src/map/appleMapPlan.ts`: lines, laid out across the date line, and marks.
- Create: `src/map/mapkitApi.ts`: the part of MapKit JS the site uses, as types.
- Create: `src/ui/hooks/useAppleMapKit.ts`: loads MapKit once, and returns loading, ready or failed.
- Create: `src/ui/hooks/useMapStyle.ts`: the kept style as Preact state.
- Create: `src/ui/appleMarks.ts`: the annotation elements (airport, plane, car, heart).
- Create: `src/ui/AppleTripMap.tsx`: Apple's map, or the SVG fallback.
- Create the tests: `tests/map/appleMapToken.test.ts`, `tests/map/appleMapStyle.test.ts`, `tests/map/appleMapPlan.test.ts`, `tests/ui/useAppleMapKit.test.tsx`, `tests/ui/AppleTripMap.test.tsx`, and `tests/fixtures/fakeMapKit.ts`.
- Modify: `vite.config.ts`, `tests/viteConfig.test.ts`, `src/copy/tripMap.ts`, `src/ui/TripMapPage.tsx`, `tests/ui/TripMapPage.test.tsx`, `src/ui/TripMapCard.tsx`, `tests/ui/TripMapCard.test.tsx`, `src/styles/tripMap.css`, `package.json`, `package-lock.json`, `.claude/launch.json`.

---

### Task 1: The tokens, and no local token in any build

**Files:**
- Create: `src/map/appleMapToken.ts`, `tests/map/appleMapToken.test.ts`
- Modify: `vite.config.ts`, `tests/viteConfig.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/map/appleMapToken.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mapkitToken, SITE_TOKEN } from '../../src/map/appleMapToken'

describe('the MapKit JS token (Apple Maps spec §3)', () => {
  it('is the site’s domain-locked token, a MapKit JS token for crewluve.crewlu.net', () => {
    const claims = JSON.parse(atob(SITE_TOKEN.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    expect(claims).toMatchObject({ origin: 'crewluve.crewlu.net', scope: 'mapkit_js' })
    expect(claims.exp).toBeUndefined()
  })

  it('uses the local token only on the dev server, and only when there is one', () => {
    expect(mapkitToken(true, 'local')).toBe('local')
    expect(mapkitToken(true, '')).toBe(SITE_TOKEN)
    expect(mapkitToken(true, undefined)).toBe(SITE_TOKEN)
    expect(mapkitToken(false, 'local')).toBe(SITE_TOKEN)
  })
})
```

In `tests/viteConfig.test.ts`, change the config import line to `import config, { noDevTokenPlugin } from '../vite.config'`. Then add at the end of the file's top-level `describe` block:

```ts
  it('fails a build that would carry the local MapKit token, and passes one that doesn’t (Apple Maps spec §3)', () => {
    const plugin = noDevTokenPlugin('eyJlocal.token.here') as { name: string; apply: string; generateBundle: (o: unknown, b: unknown) => void }
    expect([plugin.name, plugin.apply]).toEqual(['crewluve-no-dev-token', 'build'])
    const context = { error: (message: string) => { throw new Error(message) } }
    const bundle = (code: string) => ({ 'assets/index.js': { type: 'chunk', fileName: 'assets/index.js', code } })
    expect(() => plugin.generateBundle.call(context, {}, bundle('const t = "eyJlocal.token.here"'))).toThrow('carries the local MapKit token')
    expect(() => plugin.generateBundle.call(context, {}, bundle('const t = "site"'))).not.toThrow()
    // With no local token there's nothing to look for.
    expect(() => (noDevTokenPlugin('') as typeof plugin).generateBundle.call(context, {}, bundle('anything'))).not.toThrow()
  })

  it('runs the local token check in the real build', () => {
    expect((config.plugins as { name?: string }[]).some((p) => p?.name === 'crewluve-no-dev-token')).toBe(true)
  })
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/map/appleMapToken.test.ts tests/viteConfig.test.ts`

Expected: FAIL. `src/map/appleMapToken` doesn't exist, and `noDevTokenPlugin` isn't exported.

- [ ] **Step 3: The token module**

Create `src/map/appleMapToken.ts`. `SITE_TOKEN` is the domain-locked token Todd made on 2026-11-14: the first one he pasted, whose claims are `origin: crewluve.crewlu.net` and `scope: mapkit_js`, with no `exp`. It is not the 7-day local one.

```ts
/**
 * The MapKit JS tokens (Apple Maps spec §3). The site's is domain-restricted to crewluve.crewlu.net with no expiry, made
 * in the Apple Developer account on 2026-11-14: Apple refuses it on any other site, so it's safe in public code. Apple
 * won't take localhost as a domain, so the dev server uses a 7-day token with no restriction, kept in .env.local
 * (git-ignored) and read only behind `import.meta.env.DEV`, which a build drops. A build plugin in vite.config.ts fails
 * any build that carries it anyway.
 */
export const SITE_TOKEN =
  'eyJraWQiOiJVVUFYOVc0RzdEIiwidHlwIjoiSldUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJVVjk2WjgzQzdCIiwiaWF0IjoxNzk0NjgxNDEwLCJvcmlnaW4iOiJjcmV3bHV2ZS5jcmV3bHUubmV0Iiwic2NvcGUiOiJtYXBraXRfanMifQ.E3nMpZUcydMsdiWkYT4giJFp0PBOQYjHkOCr-Zy810xrGKJVISryNQJBZ_Atnh7vqReDlD7aSf8aOPlTEJIjWg'

/** The token to load MapKit JS with: the local one on the dev server when there is one, else the site's. */
export function mapkitToken(
  isDev: boolean = import.meta.env.DEV,
  localToken: string | undefined = import.meta.env.DEV ? import.meta.env.VITE_MAPKIT_DEV_TOKEN : undefined,
): string {
  return isDev && localToken ? localToken : SITE_TOKEN
}
```

- [ ] **Step 4: The build check**

In `vite.config.ts`:

1. Change `import { defineConfig } from 'vite'` to `import { defineConfig, loadEnv, type Plugin } from 'vite'`.
2. After the `CSP` constant, add:

```ts
/**
 * The local MapKit token (.env.local, VITE_MAPKIT_DEV_TOKEN) works on any site for 7 days (Apple Maps spec §3). The code
 * reads it only on the dev server, and this fails any build that carries it anyway, even one made on a Mac with
 * .env.local.
 */
export function noDevTokenPlugin(token: string): Plugin {
  return {
    name: 'crewluve-no-dev-token',
    apply: 'build',
    generateBundle(_options, bundle) {
      if (!token) return
      for (const file of Object.values(bundle)) {
        const text = file.type === 'chunk' ? file.code : typeof file.source === 'string' ? file.source : Buffer.from(file.source).toString('utf8')
        if (text.includes(token)) this.error(`${file.fileName} carries the local MapKit token from .env.local`)
      }
    },
  }
}
```

3. In `plugins: [...]`, after `preact(),`, add:

```ts
    noDevTokenPlugin(loadEnv('development', process.cwd(), 'VITE_').VITE_MAPKIT_DEV_TOKEN ?? ''),
```

- [ ] **Step 5: Run and see them pass, then everything**

Run: `npx vitest run tests/map/appleMapToken.test.ts tests/viteConfig.test.ts`, then `npm test` and `npm run build`.

Expected: all pass. With `.env.local` present, the build runs the check and passes, because no code reads the token yet.

- [ ] **Step 6: Commit (only with Todd's yes)**

```bash
git add src/map/appleMapToken.ts tests/map/appleMapToken.test.ts vite.config.ts tests/viteConfig.test.ts
git commit -m "The MapKit JS tokens: the site's domain-locked one, the local one on the dev server only, and a build that fails if it carries it (Apple Maps spec §3)"
```

---

### Task 2: The three styles, and the kept choice

**Files:**
- Create: `src/map/appleMapStyle.ts`, `src/ui/hooks/useMapStyle.ts`, `tests/map/appleMapStyle.test.ts`
- Modify: `src/copy/tripMap.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/map/appleMapStyle.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MAP_STYLE_NAMES } from '../../src/copy/tripMap'
import { APPLE_MAP_STYLES, keepMapStyle, MAP_STYLE_KEY, nextMapStyle, readMapStyle } from '../../src/map/appleMapStyle'

const memory = () => {
  const kept = new Map<string, string>()
  return { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v), kept }
}
const blocked = {
  getItem: (): string | null => {
    throw new Error('blocked')
  },
  setItem: (): void => {
    throw new Error('blocked')
  },
}

describe('the map styles (Apple Maps spec §4.1)', () => {
  it('cycles Hybrid, Map, Satellite, as in the app', () => {
    expect(APPLE_MAP_STYLES).toEqual(['hybrid', 'standard', 'satellite'])
    expect(APPLE_MAP_STYLES.map(nextMapStyle)).toEqual(['standard', 'satellite', 'hybrid'])
    expect(APPLE_MAP_STYLES.map((s) => MAP_STYLE_NAMES[s])).toEqual(['Hybrid', 'Map', 'Satellite'])
  })

  it('starts on Hybrid, and keeps the chosen style', () => {
    const storage = memory()
    expect(readMapStyle(storage)).toBe('hybrid')
    keepMapStyle('satellite', storage)
    expect(storage.kept.get(MAP_STYLE_KEY)).toBe('satellite')
    expect(readMapStyle(storage)).toBe('satellite')
  })

  it('ignores a value it doesn’t know, and storage that refuses', () => {
    const storage = memory()
    storage.setItem(MAP_STYLE_KEY, 'terrain')
    expect(readMapStyle(storage)).toBe('hybrid')
    expect(readMapStyle(blocked)).toBe('hybrid')
    expect(readMapStyle(null)).toBe('hybrid')
    expect(() => keepMapStyle('standard', blocked)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run and see them fail**

Run: `npx vitest run tests/map/appleMapStyle.test.ts`

Expected: FAIL. The modules and `MAP_STYLE_NAMES` don't exist.

- [ ] **Step 3: The styles, the words and the hook**

Create `src/map/appleMapStyle.ts`:

```ts
/** The trip map's styles on Apple's map (Apple Maps spec §4.1), in the style button's order, as in the app. */
export type AppleMapStyle = 'hybrid' | 'standard' | 'satellite'
export const APPLE_MAP_STYLES: readonly AppleMapStyle[] = ['hybrid', 'standard', 'satellite']

export const nextMapStyle = (style: AppleMapStyle): AppleMapStyle =>
  APPLE_MAP_STYLES[(APPLE_MAP_STYLES.indexOf(style) + 1) % APPLE_MAP_STYLES.length]

/** Where this browser keeps the style. The card and the full map share it. */
export const MAP_STYLE_KEY = 'crewluve.mapStyle.v1'

/** localStorage, or null where the browser refuses it (blocked site data). */
function pageStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** The kept style, or Hybrid when none is kept, it's unknown, or storage is blocked. */
export function readMapStyle(storage: Pick<Storage, 'getItem'> | null = pageStorage()): AppleMapStyle {
  try {
    const kept = storage?.getItem(MAP_STYLE_KEY)
    return APPLE_MAP_STYLES.find((style) => style === kept) ?? 'hybrid'
  } catch {
    return 'hybrid'
  }
}

/** Keeps `style`. Where storage is blocked the choice lasts until the page closes. */
export function keepMapStyle(style: AppleMapStyle, storage: Pick<Storage, 'setItem'> | null = pageStorage()): void {
  try {
    storage?.setItem(MAP_STYLE_KEY, style)
  } catch {
    // Blocked: nothing to do.
  }
}
```

Create `src/ui/hooks/useMapStyle.ts`:

```ts
import { useState } from 'preact/hooks'
import { keepMapStyle, readMapStyle, type AppleMapStyle } from '../../map/appleMapStyle'

/** The trip map's style and a setter that keeps it. The full map sets it; the card reads it when it next shows. */
export function useMapStyle(): [AppleMapStyle, (style: AppleMapStyle) => void] {
  const [style, setStyle] = useState<AppleMapStyle>(() => readMapStyle())
  return [
    style,
    (next) => {
      keepMapStyle(next)
      setStyle(next)
    },
  ]
}
```

In `src/copy/tripMap.ts`, add `import type { AppleMapStyle } from '../map/appleMapStyle'` as the first import line, and at the end:

```ts
/** The map styles by name, on the full map's style button (Apple Maps spec §4.1). */
export const MAP_STYLE_NAMES: Record<AppleMapStyle, string> = { hybrid: 'Hybrid', standard: 'Map', satellite: 'Satellite' }
```

- [ ] **Step 4: Run and see them pass, then everything**

Run: `npx vitest run tests/map/appleMapStyle.test.ts`, then `npm test` and `npm run build`.

Expected: all pass.

- [ ] **Step 5: Commit (only with Todd's yes)**

```bash
git add src/map/appleMapStyle.ts src/ui/hooks/useMapStyle.ts src/copy/tripMap.ts tests/map/appleMapStyle.test.ts
git commit -m "The trip map's three styles, Hybrid until chosen and kept in this browser (Apple Maps spec §4.1)"
```

---

### Task 3: The plan of what Apple's map shows

**Files:**
- Create: `src/map/appleMapPlan.ts`, `tests/map/appleMapPlan.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/map/appleMapPlan.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { appleMapPlan, laidOut } from '../../src/map/appleMapPlan'
import { makeTripMap } from '../../src/map/tripMap'
import { tripMapDrawing } from '../../src/map/tripMapDrawing'
import { AIRPORTS, at, drive, EUROPE, flight } from '../map/tripMapLegs'

describe('what Apple’s map shows (Apple Maps spec §8, §11)', () => {
  it('lays a line out in one piece across the date line, so MapKit draws it the short way', () => {
    const laid = laidOut([{ lat: 61, lng: -150 }, { lat: 60, lng: -175 }, { lat: 55, lng: 175 }, { lat: 36, lng: 140 }])
    expect(laid.map((p) => p.lng)).toEqual([-150, -175, -185, -220])
    expect(laidOut([{ lat: 0, lng: 10 }, { lat: 0, lng: 20 }]).map((p) => p.lng)).toEqual([10, 20])
  })

  it('draws each segment as a line in its style: a flight along its great circle, a drive straight', () => {
    const map = makeTripMap([drive('d1', 'SDF', 'LEX', 0, 1), flight('f1', 'LEX', 'CGN', 2, 8)], { isNextTrip: true, home: 'SDF', now: at(-1), airports: AIRPORTS })!
    const plan = appleMapPlan(tripMapDrawing(map, at(-1)), null)
    expect(plan.lines.map((l) => [l.style, l.points.length])).toEqual([['drive', 2], ['upcoming', 101]])
  })

  it('marks the airports, outranking the leg’s own, and the plane turned to its heading', () => {
    const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(4), airports: AIRPORTS })!
    const drawing = tripMapDrawing(map, at(4))
    const plan = appleMapPlan(drawing, map.legs[0])
    const airports = plan.marks.filter((m) => m.kind === 'airport')
    expect(airports.map((m) => [m.label, m.priority])).toEqual(
      drawing.airports.map((a) => [a.code, a.code === 'SDF' || a.code === 'CGN' ? 'high' : 'low']),
    )
    const plane = plan.marks.find((m) => m.kind === 'plane')!
    expect(plane.priority).toBe('required')
    expect(plane.degrees).toBeCloseTo((drawing.plane!.angle * 180) / Math.PI + 90)
    expect(new Set(plan.marks.map((m) => m.id)).size).toBe(plan.marks.length)
  })
})
```

- [ ] **Step 2: Run and see them fail**

Run: `npx vitest run tests/map/appleMapPlan.test.ts`

Expected: FAIL. The module doesn't exist.

- [ ] **Step 3: The plan**

Create `src/map/appleMapPlan.ts`:

```ts
import { pointsAlong, type GeoPoint } from './greatCircle'
import type { MapLeg } from './tripMap'
import type { SegmentStyle, TripMapDrawing } from './tripMapDrawing'

/**
 * What Apple's map shows for a moment of the trip (Apple Maps spec §8): the same drawing as the SVG map, as lines and
 * marks MapKit can take. Pure, so every choice here is tested without MapKit.
 */

export interface PlannedLine {
  id: string
  style: SegmentStyle
  points: GeoPoint[]
}

export type MarkKind = 'airport' | 'car' | 'heart' | 'plane'

export interface PlannedMark {
  id: string
  kind: MarkKind
  place: GeoPoint
  /** The airport's code, under its dot. */
  label: string | null
  /** The mark's turn, clockwise from pointing up. */
  degrees: number
  /** Where marks collide, MapKit hides the lower first. */
  priority: 'low' | 'high' | 'required'
}

export interface AppleMapPlan {
  lines: PlannedLine[]
  marks: PlannedMark[]
}

/**
 * Longitudes laid out in one piece, each within 180° of the one before (§11): MapKit then draws a route across the date
 * line the short way. Raw longitudes jump from 180 to −180 and draw a stray line across the whole world.
 */
export function laidOut(points: GeoPoint[]): GeoPoint[] {
  const laid: GeoPoint[] = []
  for (const p of points) {
    const before = laid[laid.length - 1]
    laid.push(before ? { lat: p.lat, lng: p.lng + 360 * Math.round((before.lng - p.lng) / 360) } : p)
  }
  return laid
}

export function appleMapPlan(drawing: TripMapDrawing, focus: MapLeg | null): AppleMapPlan {
  const onLeg = (code: string) => focus != null && (focus.origin.code === code || focus.destination.code === code)
  const marks: PlannedMark[] = [
    ...drawing.airports.map((a): PlannedMark => ({
      id: `airport:${a.code}`, kind: 'airport', place: a.place, label: a.code, degrees: 0, priority: onLeg(a.code) ? 'high' : 'low',
    })),
    ...drawing.cars.map((c): PlannedMark => ({ id: `car:${c.id}`, kind: 'car', place: c.place, label: null, degrees: 0, priority: 'required' })),
  ]
  if (drawing.pin) marks.push({ id: 'heart', kind: 'heart', place: drawing.pin.place, label: null, degrees: 0, priority: 'required' })
  // The plane icon points up, so it turns a quarter more than the route's screen angle, as on the SVG map.
  if (drawing.plane) {
    marks.push({ id: 'plane', kind: 'plane', place: drawing.plane.place, label: null, degrees: (drawing.plane.angle * 180) / Math.PI + 90, priority: 'required' })
  }
  return {
    lines: drawing.segments.map((s) => ({ id: s.id, style: s.style, points: laidOut(s.geodesic ? pointsAlong(s.from, s.to, 101) : [s.from, s.to]) })),
    marks,
  }
}
```

- [ ] **Step 4: Run and see them pass**

Run: `npx vitest run tests/map/appleMapPlan.test.ts`

Expected: 3 PASS. If the second test's line count differs because `tripMapDrawing` splits a leg into flown and to-go parts, correct the test's expected list from `tripMapDrawing`'s own output, and note it in this plan's record. The rule being tested stays the same: flights along great circles, drives straight.

- [ ] **Step 5: Commit (only with Todd's yes)**

```bash
git add src/map/appleMapPlan.ts tests/map/appleMapPlan.test.ts
git commit -m "What Apple's map shows: the trip's lines laid out across the date line, and its marks (Apple Maps spec §8, §11)"
```

---

### Task 4: Loading MapKit JS

**Files:**
- Create: `src/map/mapkitApi.ts`, `src/ui/hooks/useAppleMapKit.ts`, `tests/ui/useAppleMapKit.test.tsx`
- Modify: `package.json`, `package-lock.json` (by npm)

- [ ] **Step 1: Add the loader**

Run: `npm install @apple/mapkit-loader@1.0.0`

Expected: `package.json` gains `"@apple/mapkit-loader": "1.0.0"` under `dependencies`, written without a caret if the project pins exactly: match the other dependencies' form.

- [ ] **Step 2: Write the failing tests**

Create `tests/ui/useAppleMapKit.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { resetAppleMapKit, startAppleMapKit, useAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { fakeMapKit } from '../fixtures/fakeMapKit'

afterEach(() => {
  cleanup()
  resetAppleMapKit()
})

function Probe() {
  return <p>{useAppleMapKit().status}</p>
}

describe('loading MapKit JS (Apple Maps spec §3, §7)', () => {
  it('refuses to load Apple’s code in tests, so the SVG map shows', async () => {
    render(<Probe />)
    await waitFor(() => expect(screen.getByText('failed')).toBeTruthy())
  })

  it('loads once, and is ready with the library', async () => {
    let loads = 0
    const kit = fakeMapKit()
    startAppleMapKit(async () => {
      loads += 1
      return kit as unknown as MapKitApi
    })
    render(<><Probe /><Probe /></>)
    await waitFor(() => expect(screen.getAllByText('ready')).toHaveLength(2))
    expect(loads).toBe(1)
  })

  it('fails when MapKit reports an error, such as a token refused for this site', async () => {
    const kit = fakeMapKit()
    startAppleMapKit(async () => kit as unknown as MapKitApi)
    render(<Probe />)
    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy())
    kit.fire('error', { status: 'Unauthorized' })
    await waitFor(() => expect(screen.getByText('failed')).toBeTruthy())
  })
})
```

Create `tests/fixtures/fakeMapKit.ts`:

```ts
/**
 * A fake `mapkit` for component tests (Apple Maps plan, Task 4): the classes the site uses, recording what's done to
 * them, and `fire` to send an event. Apple's real code never loads in tests.
 */
type Listener = (event: Record<string, unknown>) => void

class Coordinate {
  constructor(public latitude: number, public longitude: number) {}
}
class MapRect {
  constructor(public x: number, public y: number, public width: number, public height: number) {}
}
class Padding {
  constructor(public top: number, public right: number, public bottom: number, public left: number) {}
}
class Style {
  constructor(options: Record<string, unknown>) {
    Object.assign(this, options)
  }
}
class Overlay {
  visible = true
  constructor(public points: unknown, public options: { style: unknown }) {}
  get style() {
    return this.options.style
  }
  set style(style: unknown) {
    this.options.style = style
  }
}
class PolylineOverlay extends Overlay {}
class PolygonOverlay extends Overlay {}
class Annotation {
  element: HTMLElement
  displayPriority: number
  constructor(public coordinate: Coordinate, factory: () => HTMLElement, options: { displayPriority?: number } = {}) {
    this.element = factory()
    this.displayPriority = options.displayPriority ?? 0
  }
}

export interface FakeMap {
  options: Record<string, unknown>
  overlays: Overlay[]
  annotations: Annotation[]
  rects: { rect: MapRect; animated: boolean }[]
  destroyed: boolean
  mapType: string
  colorScheme: string
  padding: Padding | null
  fire(type: string): void
}

export function fakeMapKit() {
  const listeners = new Map<string, Listener[]>()
  const maps: FakeMap[] = []
  class FakeMapClass implements FakeMap {
    overlays: Overlay[] = []
    annotations: Annotation[] = []
    rects: { rect: MapRect; animated: boolean }[] = []
    destroyed = false
    mapType: string
    colorScheme: string
    padding: Padding | null = null
    private events = new Map<string, (() => void)[]>()
    constructor(public parent: HTMLElement, public options: Record<string, unknown> = {}) {
      this.mapType = String(options.mapType ?? 'standard')
      this.colorScheme = String(options.colorScheme ?? 'light')
      maps.push(this)
    }
    addOverlay(o: Overlay) {
      this.overlays.push(o)
    }
    removeOverlay(o: Overlay) {
      this.overlays = this.overlays.filter((x) => x !== o)
    }
    addAnnotation(a: Annotation) {
      this.annotations.push(a)
    }
    removeAnnotation(a: Annotation) {
      this.annotations = this.annotations.filter((x) => x !== a)
    }
    setVisibleMapRectAnimated(rect: MapRect, animated: boolean) {
      this.rects.push({ rect, animated })
    }
    addEventListener(type: string, listener: () => void) {
      this.events.set(type, [...(this.events.get(type) ?? []), listener])
    }
    destroy() {
      this.destroyed = true
    }
    fire(type: string) {
      for (const l of this.events.get(type) ?? []) l()
    }
  }
  return {
    maps,
    Map: FakeMapClass,
    Coordinate,
    MapRect,
    Padding,
    Style,
    PolylineOverlay,
    PolygonOverlay,
    Annotation: Object.assign(Annotation, { CollisionMode: { Circle: 'circle' } }),
    MapType: { Hybrid: 'hybrid', Standard: 'standard', Satellite: 'satellite' },
    ColorScheme: { Light: 'light', Dark: 'dark' },
    FeatureVisibility: { Hidden: 'hidden', Visible: 'visible', Adaptive: 'adaptive' },
    addEventListener(type: string, listener: Listener) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener])
    },
    fire(type: string, event: Record<string, unknown> = {}) {
      for (const l of listeners.get(type) ?? []) l(event)
    },
  }
}
```

- [ ] **Step 3: Run and see them fail**

Run: `npx vitest run tests/ui/useAppleMapKit.test.tsx`

Expected: FAIL. `src/ui/hooks/useAppleMapKit` and `src/map/mapkitApi` don't exist.

- [ ] **Step 4: The types and the loader**

Create `src/map/mapkitApi.ts`:

```ts
/**
 * The part of MapKit JS the trip map uses (Apple Maps spec §8, §9), as types. The real `mapkit` from
 * @apple/mapkit-loader has all of it, and tests pass a fake with the same shape (tests/fixtures/fakeMapKit.ts).
 */
export interface MkCoordinate {
  latitude: number
  longitude: number
}

export interface MkStyle {
  strokeColor?: string
  strokeOpacity?: number
  lineWidth?: number
  lineDash?: number[]
  lineCap?: string
  fillColor?: string
  fillOpacity?: number
}

export interface MkPolyline {
  points: MkCoordinate[]
  style: MkStyle
}

export interface MkPolygon {
  points: MkCoordinate[][]
  style: MkStyle
}

export interface MkAnnotation {
  coordinate: MkCoordinate
  displayPriority: number
}

export interface MkMap {
  mapType: string
  colorScheme: string
  padding: unknown
  addOverlay(overlay: MkPolyline | MkPolygon): void
  removeOverlay(overlay: MkPolyline | MkPolygon): void
  addAnnotation(annotation: MkAnnotation): void
  removeAnnotation(annotation: MkAnnotation): void
  setVisibleMapRectAnimated(rect: unknown, animated: boolean): void
  addEventListener(type: string, listener: () => void): void
  destroy(): void
}

export interface MapKitApi {
  Map: new (parent: HTMLElement, options: Record<string, unknown>) => MkMap
  Coordinate: new (latitude: number, longitude: number) => MkCoordinate
  MapRect: new (x: number, y: number, width: number, height: number) => unknown
  Padding: new (top: number, right: number, bottom: number, left: number) => unknown
  Style: new (options: MkStyle) => MkStyle
  PolylineOverlay: new (points: MkCoordinate[], options: { style: MkStyle }) => MkPolyline
  PolygonOverlay: new (points: MkCoordinate[][], options: { style: MkStyle }) => MkPolygon
  Annotation: {
    new (coordinate: MkCoordinate, factory: () => HTMLElement, options: { displayPriority: number; collisionMode: string }): MkAnnotation
    CollisionMode: { Circle: string }
  }
  MapType: { Hybrid: string; Standard: string; Satellite: string }
  ColorScheme: { Light: string; Dark: string }
  FeatureVisibility: { Hidden: string }
  addEventListener(type: 'error', listener: (event: { status?: string }) => void): void
}
```

Create `src/ui/hooks/useAppleMapKit.ts`:

```ts
import { load } from '@apple/mapkit-loader'
import { useEffect, useState } from 'preact/hooks'
import { mapkitToken } from '../../map/appleMapToken'
import type { MapKitApi } from '../../map/mapkitApi'

/** Loading MapKit JS once per page (Apple Maps spec §3, §7): loading, ready with the library, or failed. */
export type AppleMapKitState = { status: 'loading' } | { status: 'ready'; mapkit: MapKitApi } | { status: 'failed' }

export type MapKitLoader = () => Promise<MapKitApi>

/** Apple's loader with the token. In tests it refuses, so Apple's code never loads and the SVG map shows. */
const appleLoader: MapKitLoader = async () => {
  if (import.meta.env.MODE === 'test') throw new Error('MapKit JS is not loaded in tests')
  return (await load({ token: mapkitToken(), language: 'en-US', libraries: ['full-map'] })) as unknown as MapKitApi
}

let current: AppleMapKitState | null = null
const listeners = new Set<(state: AppleMapKitState) => void>()

function set(next: AppleMapKitState) {
  current = next
  for (const listener of listeners) listener(next)
}

/** Starts loading MapKit JS, once. A refused token arrives as MapKit's `error` event once it has loaded. */
export function startAppleMapKit(loader: MapKitLoader = appleLoader): void {
  if (current) return
  set({ status: 'loading' })
  loader().then(
    (mapkit) => {
      mapkit.addEventListener('error', () => set({ status: 'failed' }))
      if (current?.status === 'loading') set({ status: 'ready', mapkit })
    },
    () => set({ status: 'failed' }),
  )
}

/** For tests: forget the loaded library, so the next map loads it again. */
export function resetAppleMapKit(): void {
  current = null
  listeners.clear()
}

/** MapKit JS's state, loading it the first time a map asks. */
export function useAppleMapKit(): AppleMapKitState {
  const [state, setState] = useState<AppleMapKitState>(current ?? { status: 'loading' })
  useEffect(() => {
    listeners.add(setState)
    startAppleMapKit()
    if (current) setState(current)
    return () => {
      listeners.delete(setState)
    }
  }, [])
  return state
}
```

- [ ] **Step 5: Run and see them pass, then everything**

Run: `npx vitest run tests/ui/useAppleMapKit.test.tsx`, then `npm test` and `npm run build`.

Expected: all pass. If `tsc` objects to the `load` call's options, check the package's own types with `cat node_modules/@apple/mapkit-loader/dist/*.d.ts`, match them, and note it in this plan's record.

- [ ] **Step 6: Commit (only with Todd's yes)**

```bash
git add package.json package-lock.json src/map/mapkitApi.ts src/ui/hooks/useAppleMapKit.ts tests/ui/useAppleMapKit.test.tsx tests/fixtures/fakeMapKit.ts
git commit -m "Loading MapKit JS once with Apple's loader, never in tests, and failing to the SVG map on any error (Apple Maps spec §3, §7)"
```

---

### Task 5: Apple's map, drawing the trip

**Files:**
- Create: `src/ui/appleMarks.ts`, `src/ui/AppleTripMap.tsx`, `tests/ui/AppleTripMap.test.tsx`
- Modify: `src/styles/tripMap.css`

- [ ] **Step 1: Write the failing tests**

Create `tests/ui/AppleTripMap.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { makeTripMap } from '../../src/map/tripMap'
import { AppleTripMap } from '../../src/ui/AppleTripMap'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { fakeMapKit } from '../fixtures/fakeMapKit'
import { AIRPORTS, at, EUROPE } from '../map/tripMapLegs'

afterEach(() => {
  cleanup()
  resetAppleMapKit()
})

const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(4), airports: AIRPORTS })!
const props = { map, t: at(4), width: 390, height: 520, focus: map.legs[0], land: null, nightStep: 60_000, mapStyle: 'hybrid' as const, interactive: true }

async function ready() {
  const kit = fakeMapKit()
  startAppleMapKit(async () => kit as unknown as MapKitApi)
  return kit
}

describe('Apple’s map (Apple Maps spec §4, §5, §8)', () => {
  it('shows the SVG map while MapKit loads or when it fails', async () => {
    const { container } = render(<AppleTripMap {...props} />)
    await waitFor(() => expect(container.querySelector('svg.trip-map-svg')).toBeTruthy())
    expect(container.querySelector('.apple-trip-map')).toBeNull()
  })

  it('creates one map in the style, with the trip’s lines, the night’s seven layers and its marks', async () => {
    const kit = await ready()
    const { container } = render(<AppleTripMap {...props} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    expect(container.querySelector('svg.trip-map-svg')).toBeNull()
    expect(m.mapType).toBe('hybrid')
    expect(m.options).toMatchObject({ isScrollEnabled: true, isZoomEnabled: true, isRotationEnabled: false, showsMapTypeControl: false })
    expect(m.overlays.filter((o) => o instanceof kit.PolygonOverlay)).toHaveLength(7)
    expect(m.overlays.filter((o) => o instanceof kit.PolylineOverlay).length).toBeGreaterThan(0)
    expect(m.annotations.some((a) => a.element.classList.contains('plane'))).toBe(true)
    expect(m.rects).toHaveLength(1)
  })

  it('updates in place as time moves, rather than adding again', async () => {
    const kit = await ready()
    const view = render(<AppleTripMap {...props} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    const counts = [m.overlays.length, m.annotations.length]
    const plane = m.annotations.find((a) => a.element.classList.contains('plane'))!
    const before = plane.coordinate.longitude
    view.rerender(<AppleTripMap {...props} t={at(5)} />)
    expect([m.overlays.length, m.annotations.length]).toEqual(counts)
    expect(plane.coordinate.longitude).not.toBe(before)
    expect(kit.maps).toHaveLength(1)
  })

  it('stops framing once the person moves the map, and frames again on Recenter', async () => {
    const kit = await ready()
    const onUserMove = vi.fn()
    const view = render(<AppleTripMap {...props} onUserMove={onUserMove} recenter={0} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    m.fire('scroll-start')
    expect(onUserMove).toHaveBeenCalledTimes(1)
    view.rerender(<AppleTripMap {...props} focus={map.legs[1]} onUserMove={onUserMove} recenter={0} />)
    expect(m.rects).toHaveLength(1)
    view.rerender(<AppleTripMap {...props} focus={map.legs[1]} onUserMove={onUserMove} recenter={1} />)
    expect(m.rects).toHaveLength(2)
  })

  it('switches style without a new map, and the card’s map doesn’t move', async () => {
    const kit = await ready()
    const view = render(<AppleTripMap {...props} interactive={false} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    expect(kit.maps[0].options).toMatchObject({ isScrollEnabled: false, isZoomEnabled: false, showsZoomControl: false })
    view.rerender(<AppleTripMap {...props} interactive={false} mapStyle="satellite" />)
    expect(kit.maps[0].mapType).toBe('satellite')
    expect(kit.maps).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run and see them fail**

Run: `npx vitest run tests/ui/AppleTripMap.test.tsx`

Expected: FAIL. `src/ui/AppleTripMap` doesn't exist.

- [ ] **Step 3: The marks**

Create `src/ui/appleMarks.ts`:

```ts
import { ICON_PATHS, type IconName } from '../icons/iconPaths'
import type { MarkKind } from '../map/appleMapPlan'

const SVG_NS = 'http://www.w3.org/2000/svg'

const ICONS: Record<Exclude<MarkKind, 'airport'>, { name: IconName; size: number }> = {
  plane: { name: 'Airplane', size: 22 },
  car: { name: 'Car', size: 16 },
  heart: { name: 'Heart', size: 22 },
}

/** A Phosphor icon, 256 units square, as an SVG element `size` px wide. */
function icon(name: IconName, size: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 256 256')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  for (const d of ICON_PATHS[name]) {
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', d)
    svg.appendChild(path)
  }
  return svg
}

/**
 * The element for a mark on Apple's map (Apple Maps spec §8), styled by tripMap.css as on the SVG map: an airport's dot
 * and code, or the plane, a car or the heart. `turn` sets the mark's turn later, for the plane.
 */
export function markElement(kind: MarkKind, label: string | null): { element: HTMLElement; turn: (degrees: number) => void } {
  const element = document.createElement('div')
  element.className = `apple-mark ${kind}`
  if (kind === 'airport') {
    const dot = document.createElement('span')
    dot.className = 'apple-mark-dot'
    const code = document.createElement('span')
    code.className = 'apple-mark-code'
    code.textContent = label ?? ''
    element.append(dot, code)
    return { element, turn: () => {} }
  }
  const { name, size } = ICONS[kind]
  const svg = icon(name, size)
  element.appendChild(svg)
  return { element, turn: (degrees) => svg.style.setProperty('transform', `rotate(${degrees}deg)`) }
}
```

- [ ] **Step 4: The map**

Create `src/ui/AppleTripMap.tsx`:

```tsx
import { useEffect, useRef } from 'preact/hooks'
import { appleMapPlan, type PlannedMark } from '../map/appleMapPlan'
import type { AppleMapStyle } from '../map/appleMapStyle'
import type { GeoPoint } from '../map/greatCircle'
import { fitRect, NO_INSETS } from '../map/mapFit'
import type { MapKitApi, MkAnnotation, MkMap, MkPolygon, MkPolyline, MkStyle } from '../map/mapkitApi'
import { LAYER_ALPHA, nightLayers, SUN_DEPTHS } from '../map/nightShade'
import { framingPoints } from '../map/tripMap'
import { nightTime, tripMapDrawing, type SegmentStyle } from '../map/tripMapDrawing'
import { markElement } from './appleMarks'
import { useAppleMapKit } from './hooks/useAppleMapKit'
import { TripMapSvg, type TripMapSvgProps } from './TripMapSvg'

export interface AppleTripMapProps extends TripMapSvgProps {
  mapStyle: AppleMapStyle
  /** The full map pans and zooms; the card's doesn't. */
  interactive: boolean
  /** Bumped by the full map's Recenter: frame automatically again. */
  recenter?: number
  /** The person panned or zoomed. */
  onUserMove?: () => void
}

/**
 * The trip map on Apple's map (Apple Maps spec §4, §5, §8), or the SVG map while MapKit loads and after any failure
 * (§7). The map is made once; each render moves its lines, night and marks in place.
 */
export function AppleTripMap(props: AppleTripMapProps) {
  const kit = useAppleMapKit()
  if (kit.status !== 'ready') return <TripMapSvg {...props} />
  return <AppleMapView mapkit={kit.mapkit} {...props} />
}

/** Each route style's look, as on the SVG map: colours come from the page's CSS, so dark mode follows. */
const LINES: Record<SegmentStyle, { color: '--trip-route' | '--trip-flown'; width: number; dash: number[] }> = {
  upcoming: { color: '--trip-route', width: 2, dash: [6, 6] },
  flying: { color: '--trip-route', width: 3, dash: [] },
  flown: { color: '--trip-flown', width: 2.5, dash: [] },
  drive: { color: '--trip-flown', width: 3, dash: [1, 6] },
}

const PRIORITY: Record<PlannedMark['priority'], number> = { low: 250, high: 750, required: 1000 }

interface Live {
  map: MkMap
  lines: Map<string, { overlay: MkPolyline; key: string }>
  night: MkPolygon[]
  nightAt: number
  marks: Map<string, { annotation: MkAnnotation; turn: (degrees: number) => void }>
  framed: string
  moved: boolean
}

function AppleMapView({ mapkit, map, t, focus, nightStep, insets = NO_INSETS, mapStyle, interactive, recenter = 0, onUserMove }: AppleTripMapProps & { mapkit: MapKitApi }) {
  const box = useRef<HTMLDivElement>(null)
  const live = useRef<Live | null>(null)
  const userMove = useRef(onUserMove)
  userMove.current = onUserMove
  const types: Record<AppleMapStyle, string> = { hybrid: mapkit.MapType.Hybrid, standard: mapkit.MapType.Standard, satellite: mapkit.MapType.Satellite }
  const color = (name: string, fallback: string) => (box.current ? getComputedStyle(box.current).getPropertyValue(name).trim() : '') || fallback
  const C = (p: GeoPoint) => new mapkit.Coordinate(p.lat, p.lng)

  // The map, made once.
  useEffect(() => {
    const dark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
    const m = new mapkit.Map(box.current!, {
      mapType: types[mapStyle],
      colorScheme: dark ? mapkit.ColorScheme.Dark : mapkit.ColorScheme.Light,
      isScrollEnabled: interactive,
      isZoomEnabled: interactive,
      isRotationEnabled: false,
      showsZoomControl: interactive,
      showsMapTypeControl: false,
      showsCompass: mapkit.FeatureVisibility.Hidden,
      showsPointsOfInterest: false,
    })
    const nightStyle = () => new mapkit.Style({ fillColor: color('--trip-night', '#050d29'), fillOpacity: LAYER_ALPHA, lineWidth: 0, strokeOpacity: 0 })
    const night = SUN_DEPTHS.map(() => {
      const layer = new mapkit.PolygonOverlay([], { style: nightStyle() })
      m.addOverlay(layer)
      return layer
    })
    const state: Live = { map: m, lines: new Map(), night, nightAt: NaN, marks: new Map(), framed: '', moved: false }
    const moved = () => {
      if (state.moved) return
      state.moved = true
      userMove.current?.()
    }
    m.addEventListener('scroll-start', moved)
    m.addEventListener('zoom-start', moved)
    live.current = state
    return () => {
      m.destroy()
      live.current = null
    }
  }, [mapkit])

  // The style, on the same map.
  useEffect(() => {
    if (live.current) live.current.map.mapType = types[mapStyle]
  }, [mapStyle])

  // The trip at time t: lines, night and marks, in place.
  useEffect(() => {
    const state = live.current
    if (!state) return
    const plan = appleMapPlan(tripMapDrawing(map, t), focus)
    const seen = new Set<string>()
    for (const line of plan.lines) {
      seen.add(line.id)
      const look = LINES[line.style]
      const key = `${line.style}:${line.points.map((p) => `${p.lat},${p.lng}`).join(';')}`
      const style: MkStyle = new mapkit.Style({ strokeColor: color(look.color, '#0a84ff'), lineWidth: look.width, lineDash: look.dash, lineCap: 'round' })
      const kept = state.lines.get(line.id)
      if (!kept) {
        const overlay = new mapkit.PolylineOverlay(line.points.map(C), { style })
        state.map.addOverlay(overlay)
        state.lines.set(line.id, { overlay, key })
      } else if (kept.key !== key) {
        kept.overlay.points = line.points.map(C)
        kept.overlay.style = style
        kept.key = key
      }
    }
    for (const [id, kept] of state.lines) {
      if (!seen.has(id)) {
        state.map.removeOverlay(kept.overlay)
        state.lines.delete(id)
      }
    }
    const at = nightTime(t, nightStep)
    if (at !== state.nightAt) {
      nightLayers(at).forEach((shapes, i) => {
        state.night[i].points = shapes.map((shape) => shape.map(C))
      })
      state.nightAt = at
    }
    const marked = new Set<string>()
    for (const mark of plan.marks) {
      marked.add(mark.id)
      let kept = state.marks.get(mark.id)
      if (!kept) {
        const { element, turn } = markElement(mark.kind, mark.label)
        const annotation = new mapkit.Annotation(C(mark.place), () => element, {
          displayPriority: PRIORITY[mark.priority],
          collisionMode: mapkit.Annotation.CollisionMode.Circle,
        })
        state.map.addAnnotation(annotation)
        kept = { annotation, turn }
        state.marks.set(mark.id, kept)
      } else {
        kept.annotation.coordinate = C(mark.place)
      }
      kept.turn(mark.degrees)
    }
    for (const [id, kept] of state.marks) {
      if (!marked.has(id)) {
        state.map.removeAnnotation(kept.annotation)
        state.marks.delete(id)
      }
    }
  })

  // The camera: the leg or the whole trip, kept clear of the side panel, until the person moves the map (§5).
  const rect = fitRect(framingPoints(map, focus)) ?? { x: 0, y: 0, width: 1, height: 1 }
  const frame = `${rect.x},${rect.y},${rect.width},${rect.height}|${insets.top},${insets.right},${insets.bottom},${insets.left}|${recenter}`
  useEffect(() => {
    const state = live.current
    if (!state) return
    // Recenter pressed since the last framing: frame automatically again.
    if (state.framed.split('|')[2] !== String(recenter)) state.moved = false
    if (state.moved || state.framed === frame) return
    state.map.padding = new mapkit.Padding(insets.top, insets.right, insets.bottom, insets.left)
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    state.map.setVisibleMapRectAnimated(new mapkit.MapRect(rect.x, rect.y, rect.width, rect.height), state.framed !== '' && !still)
    state.framed = frame
  }, [frame])

  return <div ref={box} class={`apple-trip-map${interactive ? '' : ' still'}`} />
}
```

- [ ] **Step 5: The styles**

At the end of `src/styles/tripMap.css`, add:

```css
/* Apple's map (Apple Maps spec §4, §8): fills its frame; the card's lets taps through to the card's button. */
.apple-trip-map { width: 100%; height: 100%; }
.trip-map-frame .apple-trip-map { height: 220px; }
.apple-trip-map.still { pointer-events: none; }
/* Marks on Apple's map, as on the SVG map: centred on their place. */
.apple-mark { display: flex; flex-direction: column; align-items: center; transform: translateY(50%); }
.apple-mark svg { display: block; }
.apple-mark.plane svg { fill: var(--trip-route); stroke: #ffffff; stroke-width: 8; paint-order: stroke; }
.apple-mark.heart svg { fill: var(--pink); stroke: #ffffff; stroke-width: 10; paint-order: stroke; }
.apple-mark.car svg { fill: var(--trip-text); }
.apple-mark-dot { width: 7px; height: 7px; border: 0.5px solid rgba(0, 0, 0, 0.4); border-radius: 50%; background: #ffffff; }
.apple-mark-code {
  margin-top: 3px;
  color: var(--trip-text);
  font-size: 11px;
  font-weight: 600;
  text-shadow: 0 0 3px var(--trip-ocean), 0 0 3px var(--trip-ocean);
}
```

- [ ] **Step 6: Run and see them pass, then everything**

Run: `npx vitest run tests/ui/AppleTripMap.test.tsx`, then `npm test` and `npm run build`.

Expected: all pass. The Recenter test checks that bumping `recenter` clears `moved` and frames again.

- [ ] **Step 7: Commit (only with Todd's yes)**

```bash
git add src/ui/appleMarks.ts src/ui/AppleTripMap.tsx src/styles/tripMap.css tests/ui/AppleTripMap.test.tsx
git commit -m "Apple's map drawing the trip: lines, the night's seven layers and the marks, moved in place, with the SVG map as fallback (Apple Maps spec §4, §5, §8)"
```

---

### Task 6: The full map: Apple's map, the style button and Recenter

**Files:**
- Modify: `src/ui/TripMapPage.tsx`, `src/styles/tripMap.css`, `tests/ui/TripMapPage.test.tsx`

- [ ] **Step 1: Write the failing test**

In `tests/ui/TripMapPage.test.tsx`:
- add imports: `import type { MapKitApi } from '../../src/map/mapkitApi'`, `import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'` and `import { fakeMapKit } from '../fixtures/fakeMapKit'`;
- add `resetAppleMapKit()` and `localStorage.clear()` to the file's top `afterEach`;
- add this block before `describe('the facts’ panel (Stage 2 spec §10)', …)`:

```tsx
describe('the full map on Apple’s map (Apple Maps spec §4.1)', () => {
  it('keeps the SVG map and no style button when MapKit can’t load', async () => {
    page()
    await waitFor(() => expect(document.querySelector('svg.trip-map-svg')).toBeTruthy())
    expect(screen.queryByRole('button', { name: /^Map style/ })).toBeNull()
  })

  it('cycles Hybrid, Map and Satellite, keeps the choice, and shows Recenter once the map is moved', async () => {
    const kit = fakeMapKit()
    startAppleMapKit(async () => kit as unknown as MapKitApi)
    page()
    const style = await screen.findByRole('button', { name: 'Map style: Hybrid' })
    fireEvent.click(style)
    expect(screen.getByRole('button', { name: 'Map style: Map' })).toBeTruthy()
    expect(kit.maps[0].mapType).toBe('standard')
    expect(localStorage.getItem('crewluve.mapStyle.v1')).toBe('standard')
    expect(screen.queryByRole('button', { name: 'Recenter map' })).toBeNull()
    act(() => kit.maps[0].fire('zoom-start'))
    fireEvent.click(screen.getByRole('button', { name: 'Recenter map' }))
    expect(screen.queryByRole('button', { name: 'Recenter map' })).toBeNull()
    expect(kit.maps[0].rects.length).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 2: Run and see it fail**

Run: `npx vitest run tests/ui/TripMapPage.test.tsx`

Expected: the second new test FAILS: there is no "Map style: Hybrid" button.

- [ ] **Step 3: The page**

In `src/ui/TripMapPage.tsx`:

1. Change the copy import to `import { MAP_STYLE_NAMES, panelHeadline, topPill } from '../copy/tripMap'`.
2. Add these imports:
   - `import { nextMapStyle, type AppleMapStyle } from '../map/appleMapStyle'`
   - `import type { IconName } from '../icons/iconPaths'`
   - `import { AppleTripMap } from './AppleTripMap'`
   - `import { useAppleMapKit } from './hooks/useAppleMapKit'`
   - `import { useMapStyle } from './hooks/useMapStyle'`
3. Remove `import { TripMapSvg } from './TripMapSvg'`.
4. After `const PANEL_MARGIN = 16`, add:

```tsx
/** The style button's icon for each style (Apple Maps spec §4.1). */
const STYLE_ICONS: Record<AppleMapStyle, IconName> = { hybrid: 'GlobeHemisphereWest', standard: 'MapPinArea', satellite: 'GlobeHemisphereEast' }
```

5. After `const side = useSidePanel()`, add:

```tsx
  const apple = useAppleMapKit().status === 'ready'
  const [mapStyle, setMapStyle] = useMapStyle()
  // Once the person pans or zooms, the camera stops framing and Recenter appears (Apple Maps spec §5).
  const [moved, setMoved] = useState(false)
  const [recenter, setRecenter] = useState(0)
```

6. In the header, after the `<h1 …>` pill, add:

```tsx
        {apple && moved && (
          <button type="button" class="trip-map-round" aria-label="Recenter map" onClick={() => { setMoved(false); setRecenter((n) => n + 1) }}>
            <Icon name="GpsFix" size={20} />
          </button>
        )}
        {apple && (
          <button type="button" class="trip-map-style" aria-label={`Map style: ${MAP_STYLE_NAMES[mapStyle]}`} onClick={() => setMapStyle(nextMapStyle(mapStyle))}>
            <Icon name={STYLE_ICONS[mapStyle]} size={18} />
            <span aria-hidden="true">{MAP_STYLE_NAMES[mapStyle]}</span>
          </button>
        )}
```

7. Replace the `<TripMapSvg … />` line inside `.trip-map-full` with:

```tsx
        <AppleTripMap map={map} t={t} width={width} height={height} focus={focus} land={land} nightStep={nightStep} insets={insets}
          mapStyle={mapStyle} interactive recenter={recenter} onUserMove={() => setMoved(true)} />
```

8. Add `act` to the `@testing-library/preact` import in the test file if it isn't there.

- [ ] **Step 4: The button styles**

In `src/styles/tripMap.css`, after the `.trip-map-pill` rule, add:

```css
/* The style button and Recenter (Apple Maps spec §4.1): at the top bar's right, like the app's. */
.trip-map-style {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  margin-left: auto;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: var(--glass-fill);
  color: inherit;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.trip-map-round {
  min-width: 44px;
  min-height: 44px;
  margin-left: auto;
  border: 0;
  border-radius: 999px;
  background: var(--glass-fill);
  color: inherit;
  cursor: pointer;
}
.trip-map-round + .trip-map-style { margin-left: 0; }
```

- [ ] **Step 5: Run and see it pass, then everything**

Run: `npx vitest run tests/ui/TripMapPage.test.tsx`, then `npm test` and `npm run build`.

Expected: all pass. The page's older tests still see the SVG map, because MapKit refuses to load in tests.

- [ ] **Step 6: Commit (only with Todd's yes)**

```bash
git add src/ui/TripMapPage.tsx src/styles/tripMap.css tests/ui/TripMapPage.test.tsx
git commit -m "The full map on Apple's map, with the style button and Recenter (Apple Maps spec §4.1, §5)"
```

---

### Task 7: The card on Apple's map

**Files:**
- Modify: `src/ui/TripMapCard.tsx`, `tests/ui/TripMapCard.test.tsx`

- [ ] **Step 1: Write the failing test**

In `tests/ui/TripMapCard.test.tsx`:
- add imports: `import { waitFor } from '@testing-library/preact'` (merged into the existing import), `import type { MapKitApi } from '../../src/map/mapkitApi'`, `import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'` and `import { fakeMapKit } from '../fixtures/fakeMapKit'`;
- add this block after the first `describe` block:

```tsx
describe('the card on Apple’s map (Apple Maps spec §4.2)', () => {
  afterEach(() => {
    cleanup()
    resetAppleMapKit()
    localStorage.clear()
  })

  it('shows Apple’s map in the kept style, still, and opens the full map when tapped', async () => {
    localStorage.setItem('crewluve.mapStyle.v1', 'satellite')
    const kit = fakeMapKit()
    startAppleMapKit(async () => kit as unknown as MapKitApi)
    const { onOpenMap } = card(at(12))
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    expect(kit.maps[0].mapType).toBe('satellite')
    expect(kit.maps[0].options).toMatchObject({ isScrollEnabled: false, isZoomEnabled: false, showsZoomControl: false })
    fireEvent.click(screen.getByRole('button', { name: /^Trip map\. Alex is in Cologne\./ }))
    expect(onOpenMap).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run and see it fail**

Run: `npx vitest run tests/ui/TripMapCard.test.tsx`

Expected: the new test FAILS: no map is made (`kit.maps` stays empty).

- [ ] **Step 3: The card**

In `src/ui/TripMapCard.tsx`:
1. Replace `import { TripMapSvg } from './TripMapSvg'` with `import { AppleTripMap } from './AppleTripMap'`.
2. Add `import { useMapStyle } from './hooks/useMapStyle'`.
3. After `const width = useWidth(box, 343)`, add `const [mapStyle] = useMapStyle()`.
4. Replace the `<TripMapSvg … />` line with:

```tsx
          <AppleTripMap map={p.map} t={p.now} width={width} height={MAP_HEIGHT} focus={leg} land={p.land} nightStep={60_000} mapStyle={mapStyle} interactive={false} />
```

- [ ] **Step 4: Run and see it pass, then everything**

Run: `npx vitest run tests/ui/TripMapCard.test.tsx`, then `npm test` and `npm run build`.

Expected: all pass.

- [ ] **Step 5: Commit (only with Todd's yes)**

```bash
git add src/ui/TripMapCard.tsx tests/ui/TripMapCard.test.tsx
git commit -m "The trip map card on Apple's map, in the kept style and still (Apple Maps spec §4.2)"
```

---

### Task 8: The security policy for Apple's map

**Files:**
- Modify: `vite.config.ts`, `tests/viteConfig.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/viteConfig.test.ts`:

1. Replace the test `'allows no inline styles or scripts'` with:

```ts
  it('allows no inline scripts, and inline styles only because Apple’s map needs them (Apple Maps spec §6)', () => {
    expect(directive('script-src')).toBe("script-src 'self' https://cdn.apple-mapkit.com 'wasm-unsafe-eval'")
    expect(directive('style-src')).toBe("style-src 'self' 'unsafe-inline'")
  })

  it('lets Apple’s map load its images, workers and frame, and nothing else new (Apple Maps spec §6)', () => {
    expect(directive('img-src')).toBe("img-src 'self' data: blob: https://*.apple-mapkit.com")
    expect(directive('worker-src')).toBe('worker-src https://*.apple-mapkit.com blob:')
    expect(directive('frame-src')).toBe('frame-src https://*.apple-mapkit.com')
  })
```

2. In the test `'lets the page call the four partner RPCs and Open-Meteo for the weather, and nothing else'`, rename it to `'lets the page call the four partner RPCs, Open-Meteo for the weather and Apple's map, and nothing else'`, and change its `toBe` to:

```ts
    expect(connect).toBe(`connect-src 'self' ${rpcs.join(' ')} https://api.open-meteo.com https://*.apple-mapkit.com blob:`)
```

- [ ] **Step 2: Run and see them fail**

Run: `npx vitest run tests/viteConfig.test.ts`

Expected: these three tests FAIL against today's policy.

- [ ] **Step 3: The policy**

In `vite.config.ts`:

1. Replace the `CSP` array with:

```ts
// Apple's map (Apple Maps spec §6): MapKit JS comes from Apple's CDN, runs WebAssembly, uses workers and blob: URLs,
// loads images from and talks to Apple's map servers, and needs inline styles. Scripts still can't be inline, and Crewlu
// Cloud is still reachable only at the four partner addresses.
const APPLE_MAPS = 'https://*.apple-mapkit.com'
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://cdn.apple-mapkit.com 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${APPLE_MAPS}`,
  "font-src 'self'",
  `connect-src 'self' ${RPC_ADDRESSES.join(' ')} ${OPEN_METEO_URL} ${APPLE_MAPS} blob:`,
  `worker-src ${APPLE_MAPS} blob:`,
  `frame-src ${APPLE_MAPS}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')
```

2. In the comment above it, change "connect-src lists the four partner RPC addresses, not the Crewlu Cloud project, and, for the location card's weather, Open-Meteo (slice 2B1 §7)" to say: "connect-src lists the four partner RPC addresses, not the Crewlu Cloud project; for the location card's weather, Open-Meteo (slice 2B1 §7); and Apple's map servers (Apple Maps spec §6)".

- [ ] **Step 4: Run and see them pass, then everything**

Run: `npx vitest run tests/viteConfig.test.ts`, then `npm test` and `npm run build`.

Expected: all pass. `grep -o "script-src[^;]*" dist/index.html` prints the new `script-src`.

- [ ] **Step 5: Commit (only with Todd's yes)**

```bash
git add vite.config.ts tests/viteConfig.test.ts
git commit -m "The security policy lets in Apple's map: its CDN, WebAssembly, workers, images, servers and frame, and inline styles (Apple Maps spec §6)"
```

---

### Task 9: See it, review it, tidy up

- [ ] **Step 1: On the dev server with the local token** (`crewluve-mapkit`, `http://localhost:5182`; restart it so it reads `.env.local`):
  - `?demo=1&scene=flying#map`, `layover#map`, `home#map` and `recap`, at 1280×800 and 390×844, in Hybrid, Map and Satellite;
  - pan and zoom, then Recenter;
  - a replay at 1x and 10x: the plane, cars and night move smoothly;
  - the card on `?demo=1&scene=flying`: the tap opens the full map;
  - the console shows no errors.
- [ ] **Step 2: On the built site with its policy** (`npm run build`, then `crewluve-preview` on 5181):
  - the site's token is refused on localhost, so the SVG map shows: the fallback working;
  - the console shows no policy errors besides Apple's refusal.
- [ ] **Step 3:** If routes, marks or codes read poorly on Apple's map, tune `.apple-mark*` and `LINES` and commit that separately, with Todd's yes.
- [ ] **Step 4:** Run a superpowers:code-reviewer (`model: "sonnet"`) over the commits, against the spec.
- [ ] **Step 5: Tidy up.**
  - Delete `mapkit-spike.html`, `mapkit-spike.js` and `mapkit-spike.css`.
  - In `README.md`'s trip map line, add: the map is Apple's (MapKit JS) on the live site. Locally it needs a 7-day MapKit token with no restriction in `.env.local` as `VITE_MAPKIT_DEV_TOKEN`, made in the Apple Developer account, and the `crewluve-mapkit` dev server on 5182. Without one the SVG map shows.
  - Commit `.claude/launch.json` and `README.md`, with Todd's yes.
- [ ] **Step 6:** Ask Todd to look on the dev server. Then ask about pushing `trip-map-apple`: note it in repo-state first, and remind him the site's token works only on the live site, after a merge.

## Changes made during execution (2026-11-14)

- **Task 1:** the token choice is a pure function, `chooseMapkitToken(isDev, localToken)`, with `mapkitToken()` reading the page's own values. A default parameter read the real `.env.local` in the test.
- **Task 3:** the module was written before its test had been seen failing; the test was then run without the module, and failed as it should.
- **Task 7:** the card's Apple-map tests reset the loader in a `beforeEach`, because the cards rendered earlier in the file had already tried MapKit and been refused.
- **From looking at it (Task 9):**
  - **The card's chips** covered Apple's Maps logo and Legal link. The card now gives its chips 40 px of room on the map (`CHIP_ROOM`), which also frames the trip clear of them.
  - **`mapkit.Annotation.CollisionMode`** is deprecated in MapKit JS 6 and warned on every mark. The map uses `mapkit.AnnotationCollisionMode`.
  - **The night drew inside-out for half of each day.** Todd saw lines of shade moving down from the top, then up from the bottom, in a replay. Two wrong answers came first: that they were Apple's borders, and that MapKit redraws large shapes in strips. Measuring the shading at six moments found it on the wrong side every morning. The cause is that MapKit takes 180° and −180° for one edge. The fix is `offDateLine`, in `src/map/appleMapPlan.ts`, which keeps night points at ±179.999°. Spec §11 is corrected.
  - **The heart** is not the fallback map: it marks where the pilot is while on the ground, and the plane takes its place in flight. It shows on Apple's map too.
- **The built site** was checked on port 5184 (5181 was in use by another checkout's server): its policy held, and it showed the SVG fallback, because Apple accepts the site's token only on crewluve.crewlu.net.
- **The Sonnet review** found no critical issues. Still to do from it:
  - an airport's priority isn't updated when the leg in focus changes;
  - Apple's Legal link sits inside the card's button;
  - the colours and Apple's light or dark tiles don't follow a change to dark mode while the map is open.

