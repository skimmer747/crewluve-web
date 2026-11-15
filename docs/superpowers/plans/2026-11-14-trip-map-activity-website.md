# Trip Map: What the Pilot Is Doing, and Quick Layovers (the website) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The website's half of the app's design. The trip map's heart becomes a marker for what the pilot is doing: a bed on a layover, an hourglass at a turn, a briefcase at base, a house at home. A replay hurries through each wait with a "Quick layovers" switch, which is on by default and remembered in the browser. The timeline is colored by what the pilot is doing and measured in replay time, with "Sat 1:40 PM · Layover in Denver" under it.

**Architecture:**
- `makeTripMap` keeps the trip's ground legs (`PlaceLeg`s of kind layover, turn, base or home) as `groundStops`.
- `src/map/tripActivity.ts` finds the waits between moving legs (`tripWaits`), names each by the ground stop that overlaps it most, and answers `activityAt(map, t)`.
- `replayClock.ts` gains the waits and `quickLayovers`. It paces waits by the design's rule, switches pace keeping the moment (`setQuickLayovers`), and turns a moment into replay time and back.
- `src/map/timelineBlocks.ts` turns the map and the clock into the bar's colored blocks.
- The SVG draws the pilot's marker where the heart was.
- The timeline keeps a native range input, now measured in replay time and moving freely, over the colored blocks. The switch is a checkbox with `role="switch"`.

**Tech Stack:** Preact 10, TypeScript 5.9, Vite 5, Vitest 3 with happy-dom and `@testing-library/preact`, Phosphor icons (bundled as path data by `scripts/build-icons.mjs`).

**Sources:**
- **The design, approved by Todd on 2026-11-14 (the source of truth):** Crewluv repo, branch `feature/trip-map-facts`, `docs/superpowers/specs/2026-11-14-trip-map-activity-markers-and-quick-layovers-design.md`. The design's section 5 names this website session as the builder of the website's half.
- **The app's plan:** `docs/superpowers/plans/2026-11-14-trip-map-activity-markers-and-quick-layovers.md`, same repo and branch. Its "Decisions the design left open" apply here too:
  - waits' labels round to the nearest hour, or day from 48 hours, with halves up;
  - with no home airport set, base reads as home.
- **The app's Swift that this ports** (committed `eb0ca69`, `391af97`, `dfc5e67`, `9af125d`): `Crewluv/Services/TripMap/TripActivity.swift`, `TripWait.swift`, `GroundStop.swift`, `TripMap+Activity.swift`, `TripReplayClock.swift`, `TripTimeline.swift`, and `TripMapWording.timelineLine` / `timelineSpokenValue`.
- **The shared cases** (Crewluv `4818edf`), `CrewluvTests/Fixtures/TripMap/replay-cases.json` and `activity-cases.json`. They're copied here in Task 2.

---

## Design

### What the website already has

- **Ground legs.** The engine's `PlaceLeg` (`src/engine/legs.ts`) has kinds `report`, `turn`, `layover`, `base` and `home`.
  - `buildLegs` makes them again from the flights:
    - a turn inside a duty period;
    - between duty periods, home, base or layover by the airport.
  - So on the website a ground leg runs to the flight's actual departure. In the app it keeps CrewLu's scheduled times. Each wait gets the same kind either way.
  - `report` is the site's own "show time before the first departure". It's no wait's name and isn't kept.
- **The colors.** `src/styles/tokens.css` has `--indigo`, `--orange`, `--teal`, `--green`, `--blue` and `--gray`, with dark-mode values.
- **Smooth replay.** The full map already redraws every animation frame during a replay (`useFrameClock`), and draws the night at the exact time shown. That already meets the design's "up to 60 times a second". It also stops its frames once a replay ends (`finishesAt`), which is what the app's "a finished replay pauses at its end" achieves. Neither needs changing.
- **Icons.** `Bed` and `House` are bundled. `Hourglass` and `Briefcase` are in the local `@phosphor-icons/core` 2.1.1 (`node_modules`), so `node scripts/build-icons.mjs` adds them with no download.

### Decisions this plan makes (the website's own)

1. **The bar stays a native `<input type="range">`.** Keyboards, screen readers and touch get the platform's slider. The colored blocks are drawn under it, and its track is transparent.
   - It measures replay ms at 1x (`min=0`, `max` the whole replay) with `step="any"`, so the thumb glides during a replay with no jumps (design §4.1).
   - Arrow keys move 500 ms of replay, a quarter hour of a flight as before. Page Up and Page Down move a tenth of the replay.
   - Its `aria-valuetext` is "Saturday 1:40 PM, layover in Denver" (design §4.3).
2. **The thumb's centre travels from 14 px to the width less 14 px,** half the 28 px thumb at each end, as the app's `TripTimelineTrack` does. The first and last blocks reach the bar's rounded ends. Edges are CSS `calc()`s, so nothing is measured.
3. **A wait's label shows only when it fits,** with no script.
   - Each block is a wrapping flex row with a zero-width, full-height strut first.
   - A label wider than its block wraps to a second line, which the block's 24 px height and `overflow: hidden` hide.
   - So labels grow with the text size and drop out when they no longer fit (design §7).
4. **The part ahead is the kind's color at 35%** (`color-mix`), with its label in the text color. The part played is a second layer in full color, clipped at the thumb, with white labels.
5. **Quick layovers is stored as `crewluve.tripMap.quickLayovers` (`on` or `off`) in `localStorage`.**
   - Storage that can't be read, as in a private window, reads as on.
   - Storage that can't be written keeps the choice until the page closes.
6. **The switch is `<input type="checkbox" role="switch">` with its label,** styled as a switch, beside the speeds.
7. **The line under the bar** replaces the time that sat beside the speeds. It's a line of its own, hidden from screen readers, since the slider's value says the same.

### The rules (design §2.2, §3.2, §4.1)

- **A wait** is any stretch of the span not covered by a moving leg. A leg with no length never moves.
  - The ground stop overlapping a wait the most names it, the earlier on a tie.
  - With none, 8 hours or more is a layover and less is a turn.
- **`activityAt`:**
  - A moving leg makes it flying (a flight wins over a drive) or driving, to its destination.
  - Before the span:
    - home for a next trip;
    - otherwise home if the first origin is the home airport, else base.
  - From the span's end:
    - home for a recap;
    - otherwise home if the last destination is the home airport, else base.
  - In between, the wait's kind at `pilotLocation`.
  - `map.home` is the pilot's `effHome`, home else base, so for a pilot with no home set, base reads as home.
- **The pace,** in trip ms per real ms at 1x:
  - under a moving leg, the slowest of 1,800 and each covering leg's length ÷ 3,000 ms (as today);
  - in a wait with Quick layovers on, `max(1,800, min(L ÷ 3,000 ms, 86,400))`, where L is the whole wait;
  - otherwise 1,800.
- **The blocks:** the span is cut at every moving leg's start and end. Each piece is flying if a flight covers it, else driving if a drive does, else its wait's kind. Neighbors of one kind merge. Each block is placed by `progressAt`.

## Ground rules for whoever runs this plan

These come from Todd's standing instructions. They override the skill's defaults.

1. **Work only in the worktree** `/Users/toddanderson/.config/superpowers/worktrees/crewluve-website/trip-map-activity`, on branch `trip-map-activity`, made from `trip-map-facts` (`c35feca`).
   - Never edit `/Users/toddanderson/Dev/Crewluve Website`, which is the Stage 2B session's checkout, or the Crewluv repo.
   - The worktree's `node_modules` is an APFS clone of the main checkout's.
2. **Never commit without Todd's go-ahead in the conversation.** Ask once per batch, listing the commit messages, which are plain sentences in this repo's style. **Never push:** pushing `main` deploys the site.
3. **No downloads.** Run `node scripts/build-icons.mjs`, never `npm run icons`, which runs `npm install`.
4. **Unchanged:**
   - the CSP in `vite.config.ts`;
   - every fetch stays a plain GET to the site itself (`tests/fixtures/sourceScan.ts`);
   - no `innerHTML`;
   - styles are set through Preact's style objects (the CSSOM), never a `style` attribute string.
5. **The shared cases are the judge.**
   - Every value in `replay-cases.json` and `activity-cases.json` is worked out in its `note`.
   - If a case fails, the code is wrong.
   - If you believe a case is wrong, STOP and tell Todd: the app keeps a copy, and both change together or not at all.
6. **Reviewers:** dispatch `superpowers:code-reviewer` with `model: "sonnet"`.
7. **Checks:**
   - one file: `npx vitest run <file>`;
   - everything: `npm test` (2,682 tests passed at the start);
   - types and the build: `npm run build`.

## File map

| File | Status | Responsibility |
|---|---|---|
| `tests/fixtures/trip-map/replay-cases.json` | copy | the replay's pace, its length and the waits' labels, shared with the app |
| `tests/fixtures/trip-map/activity-cases.json` | copy | what the pilot is doing at given moments, shared with the app |
| `src/map/tripActivity.ts` | create | the kinds, the waits, and what the pilot is doing at any moment |
| `src/map/tripMap.ts` | modify | `GroundStop`, `isGroundLeg`, `TripMap.groundStops` |
| `src/map/tripMapFor.ts` | modify | a trip's ground legs come with its moving legs |
| `src/copy/tripMap.ts` | modify | `activityWords`, `timelineLine`, `timelineSpokenValue` |
| `src/map/replayClock.ts` | modify | the waits, Quick layovers' pace, replay positions |
| `src/map/timelineBlocks.ts` | create | the bar's blocks and the waits' labels |
| `scripts/build-icons.mjs`, `src/icons/iconPaths.ts` | modify, regenerate | `Hourglass` and `Briefcase` |
| `src/map/tripMapDrawing.ts` | modify | `pilot` replaces `pin` |
| `src/ui/TripMapSvg.tsx` | modify | the pilot's marker replaces the heart |
| `src/ui/TripTimelineBlocks.tsx` | create | the bar's colored blocks and labels |
| `src/ui/TripTimeline.tsx` | rewrite | the bar in replay time, the line under it, the switch |
| `src/ui/hooks/useQuickLayovers.ts` | create | the switch, remembered in the browser |
| `src/ui/TripMapPage.tsx` | modify | the clock's waits and Quick layovers |
| `src/styles/tripMap.css` | modify | the kinds' colors, the marker, the bar, the switch |
| `tests/map/tripMapLegs.ts` | modify | a `ground` leg helper |
| `tests/facts/factsTestData.ts`, `tests/facts/factsCases.test.ts` | modify | hand-made maps get `groundStops: []` |
| `tests/map/tripActivity.test.ts` | create | the shared activity cases, and the rule on its own |
| `tests/map/tripMapFor.test.ts` | modify | the ground legs come along |
| `tests/copy/activityWords.test.ts` | create | the words, the line and the spoken value |
| `tests/map/replayQuickLayovers.test.ts` | create | the shared replay cases, switching, positions |
| `tests/map/timelineBlocks.test.ts` | create | the blocks and the shared wait labels |
| `tests/map/tripMapDrawing.test.ts` | modify | `pilot` |
| `tests/ui/TripMapSvg.test.tsx` | modify | the marker |
| `tests/ui/TripMapPage.test.tsx` | modify | the bar, the line, the switch, remembered |
| `README.md` | modify | the trip map's markers and Quick layovers |

## Batches

- **A, the pure parts:** Tasks 2–4. Then one code review (sonnet) of the batch, its fixes, and Todd's OK to commit.
- **B, what's seen:** Tasks 5–6. Then the review, a look in the browser pane at narrow and wide widths, in light and dark, with Todd, and his OK to commit.
- **C:** Task 7, the README and this plan's record. Then the final checks and Todd's OK to commit.

---

### Task 1: Before starting

- [ ] **Step 1:** Run `git -C "$HOME/.config/superpowers/worktrees/crewluve-website/trip-map-activity" status --short`. Expected: only this plan, untracked.
- [ ] **Step 2:** Run `npm test` in the worktree. Expected: `Tests 2682 passed`.

### Task 2: The trip's ground legs, the waits, and what the pilot is doing

**Files:**
- Copy: `tests/fixtures/trip-map/replay-cases.json`, `tests/fixtures/trip-map/activity-cases.json`
- Create: `src/map/tripActivity.ts`, `tests/map/tripActivity.test.ts`, `tests/copy/activityWords.test.ts`
- Modify: `src/map/tripMap.ts`, `src/map/tripMapFor.ts`, `src/copy/tripMap.ts`, `tests/map/tripMapLegs.ts`, `tests/map/tripMapFor.test.ts`, `tests/facts/factsTestData.ts:57`, `tests/facts/factsCases.test.ts:143`

- [ ] **Step 1: Copy the shared cases**

```bash
cp /Users/toddanderson/Dev/Crewluv/CrewluvTests/Fixtures/TripMap/replay-cases.json tests/fixtures/trip-map/
cp /Users/toddanderson/Dev/Crewluv/CrewluvTests/Fixtures/TripMap/activity-cases.json tests/fixtures/trip-map/
```

They're copied as they are. Their `about` text names the app's tests and the website's.

- [ ] **Step 2: A ground leg helper for the tests.** In `tests/map/tripMapLegs.ts`, change the import line to:

```ts
import type { DriveLeg, MoveLeg, PlaceLeg } from '../../src/engine/legs'
```

and add after `drive`:

```ts
/** A layover, turn, base or home leg at `airport`, as the engine makes them between a trip's flights. */
export function ground(id: string, kind: PlaceLeg['kind'], airport: string, startHours: number, hours: number, tripId = 'T1'): PlaceLeg {
  const start = at(startHours)
  return { kind, id, tripId, airport, start, end: start + hours * HOUR }
}
```

- [ ] **Step 3: Write the failing tests.** Create `tests/map/tripActivity.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { activityWords } from '../../src/copy/tripMap'
import { buildAirportIndex } from '../../src/data/airports'
import type { Leg } from '../../src/engine/legs'
import { activityAt, SHORTEST_LAYOVER, tripWaits } from '../../src/map/tripActivity'
import { makeTripMap, type TripMapOptions } from '../../src/map/tripMap'
import { AIRPORTS, at, drive, EUROPE, flight, ground, HOUR } from './tripMapLegs'

/** The app's shared cases (Crewluv's CrewluvTests/Fixtures/TripMap): change both copies together. */
interface CaseLeg {
  id: string
  type: 'flight' | 'drive' | 'layover' | 'turn' | 'base' | 'home'
  from?: string
  to?: string
  airport?: string
  start: string
  end: string
  delayMinutes?: number
}
interface Cases {
  constants: { shortestLayoverHours: number }
  airports: Record<string, { lat: number; lon: number; city: string | null }>
  trips: { name: string; home: string | null; mode: 'trip' | 'nextTrip' | 'recap'; legs: CaseLeg[]; moments: { at: string; kind: string; words: string }[] }[]
}
const cases = JSON.parse(readFileSync(new URL('../fixtures/trip-map/activity-cases.json', import.meta.url), 'utf8')) as Cases
const CASE_AIRPORTS = buildAirportIndex(Object.entries(cases.airports).map(([code, a]) => [code, a.city ?? '', 'US', a.lat, a.lon, 'UTC']))
const MINUTE = 60_000

/** A case's leg as the website's: a flight or a drive moved by its delay, a ground leg at its scheduled times. */
function caseLeg(l: CaseLeg): Leg {
  const shift = (l.delayMinutes ?? 0) * MINUTE
  const start = Date.parse(l.start) + shift
  const end = Date.parse(l.end) + shift
  const from = l.from ?? ''
  const to = l.to ?? ''
  if (l.type === 'flight') {
    return {
      kind: 'flight', id: l.id, tripId: 'T', dep: from, arr: to, start, end, schedStart: Date.parse(l.start), schedEnd: Date.parse(l.end),
      airline: '5X', enteredAirline: null, number: '1', deadhead: false, ground: false,
    }
  }
  if (l.type === 'drive') return { kind: 'drive', id: l.id, tripId: null, from, to, toHome: false, start, end, schedEnd: Date.parse(l.end) }
  return { kind: l.type, id: l.id, tripId: 'T', airport: l.airport ?? '', start, end }
}

describe('what the pilot is doing (activity markers design §2.2): the shared cases', () => {
  it("uses the shared cases' shortest layover", () => {
    expect(SHORTEST_LAYOVER).toBe(cases.constants.shortestLayoverHours * HOUR)
  })

  for (const trip of cases.trips) {
    it.each(trip.moments)(`${trip.name}, at $at`, (moment) => {
      const map = makeTripMap(trip.legs.map(caseLeg), {
        isNextTrip: trip.mode === 'nextTrip', isRecap: trip.mode === 'recap', home: trip.home, now: 0, airports: CASE_AIRPORTS,
      })
      const activity = map ? activityAt(map, Date.parse(moment.at)) : null
      expect(activity?.kind).toBe(moment.kind)
      expect(activity ? activityWords(activity) : null).toBe(moment.words)
    })
  }
})

describe('the waits and what the pilot is doing (activity markers design §2.2)', () => {
  const options = (overrides: Partial<TripMapOptions> = {}): TripMapOptions => ({ isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS, ...overrides })
  const europe = (extra: Leg[] = [], overrides: Partial<TripMapOptions> = {}) => makeTripMap([...EUROPE, ...extra], options(overrides))!

  it("keeps the trip's layovers, turns and stays to name the waits, draws none of them, and leaves out the report leg", () => {
    const map = europe([ground('l1', 'layover', 'CGN', 8, 24), ground('r1', 'report', 'SDF', -1, 1)])
    expect(map.groundStops).toEqual([{ kind: 'layover', start: at(8), end: at(32) }])
    expect(map.legs.map((l) => l.id)).toEqual(['f1', 'f2', 'f3'])
  })

  it("finds the Europe trip's two waits, layovers since each is 8 hours or more", () => {
    expect(tripWaits(europe())).toEqual([{ start: at(8), end: at(32), kind: 'layover' }, { start: at(38), end: at(58), kind: 'layover' }])
  })

  it('with no ground leg, names a wait of 8 hours a layover and one under 8 hours a turn', () => {
    const eight = makeTripMap([flight('f1', 'SDF', 'CGN', 0, 8), flight('f2', 'CGN', 'DXB', 16, 6)], options())!
    const seven = makeTripMap([flight('f1', 'SDF', 'CGN', 0, 8), flight('f2', 'CGN', 'DXB', 15, 6)], options())!
    expect(tripWaits(eight).map((w) => w.kind)).toEqual(['layover'])
    expect(tripWaits(seven).map((w) => w.kind)).toEqual(['turn'])
  })

  it('names a wait by the ground leg overlapping it most, and the earlier of two that tie', () => {
    expect(tripWaits(europe([ground('t1', 'turn', 'CGN', 8, 5), ground('b1', 'base', 'CGN', 13, 19)]))[0].kind).toBe('base')
    expect(tripWaits(europe([ground('t1', 'turn', 'CGN', 8, 12), ground('b1', 'base', 'CGN', 20, 12)]))[0].kind).toBe('turn')
  })

  it('is flying to the destination in the air, and on a layover in Cologne between flights', () => {
    const map = europe()
    expect(activityAt(map, at(4))).toEqual({ kind: 'flying', place: map.legs[0].destination })
    expect(activityAt(map, at(12))).toEqual({ kind: 'layover', place: map.legs[0].destination })
  })

  it('is home before a next trip, and at base before a trip that starts away from home', () => {
    expect(activityAt(europe([], { isNextTrip: true }), at(-2))?.kind).toBe('home')
    const fromCologne = makeTripMap([flight('f1', 'CGN', 'DXB', 0, 6)], options({ now: at(-2) }))!
    expect(activityAt(fromCologne, at(-2))?.kind).toBe('base')
  })

  it('is home after a recap, wherever the trip ended', () => {
    const recap = makeTripMap([flight('f1', 'SDF', 'CGN', 0, 8)], options({ isRecap: true, now: at(20) }))!
    expect(activityAt(recap, at(20))?.kind).toBe('home')
  })

  it('is flying where a flight overlaps a drive, and driving before the flight leaves', () => {
    const map = makeTripMap([drive('d1', 'SDF', 'LEX', 0, 2), flight('f1', 'LEX', 'CGN', 1, 8)], options({ now: at(0.5) }))!
    expect(activityAt(map, at(0.5))?.kind).toBe('driving')
    expect(activityAt(map, at(1.5))?.kind).toBe('flying')
  })
})
```

Create `tests/copy/activityWords.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { activityWords, timelineLine, timelineSpokenValue } from '../../src/copy/tripMap'
import { buildAirportIndex } from '../../src/data/airports'
import type { ActivityKind } from '../../src/map/tripActivity'
import { airportMark } from '../../src/map/tripMap'
import { AIRPORTS, at } from '../map/tripMapLegs'

const cologne = airportMark('CGN', AIRPORTS)!

describe('the words for what the pilot is doing (activity markers design §4.2, §4.3)', () => {
  it.each<[ActivityKind, string]>([
    ['flying', 'Flying to Cologne'], ['driving', 'Driving to Cologne'], ['layover', 'Layover in Cologne'],
    ['turn', 'Turn in Cologne'], ['base', 'At base in Cologne'], ['home', 'Home'],
  ])('%s reads "%s"', (kind, words) => {
    expect(activityWords({ kind, place: cologne })).toBe(words)
  })

  it('names a place with no city by its code', () => {
    const springs = airportMark('COS', buildAirportIndex([['COS', '', 'US', 38.8058, -104.7008, 'America/Denver']]))!
    expect(activityWords({ kind: 'turn', place: springs })).toBe('Turn in COS')
  })

  it('writes the line under the timeline, and its value for screen readers, from the time and the activity', () => {
    // at(12) is Friday 7:00 PM in Louisville.
    const layover = { kind: 'layover', place: cologne } as const
    expect(timelineLine(at(12), layover, 'America/New_York', false)).toMatch(/^Fri 7:00\sPM · Layover in Cologne$/)
    expect(timelineSpokenValue(at(12), layover, 'America/New_York', false)).toMatch(/^Friday 7:00\sPM, layover in Cologne$/)
    expect(timelineLine(at(12), null, 'America/New_York', false)).toMatch(/^Fri 7:00\sPM$/)
    expect(timelineSpokenValue(at(12), { kind: 'home', place: cologne }, 'America/New_York', false)).toMatch(/^Friday 7:00\sPM, home$/)
  })
})
```

In `tests/map/tripMapFor.test.ts`, add `ground` to the import from `./tripMapLegs` (add that import if the file has none, with `flight`), add `tripLegs` to its import from `../../src/map/tripMapFor`, and add at the end of the file:

```ts
describe("a trip's ground legs (activity markers design §2.2)", () => {
  it("come with its moving legs to name its waits, and no other trip's do", () => {
    const legs = [flight('f1', 'SDF', 'CGN', 0, 8), ground('l1', 'layover', 'CGN', 8, 24), flight('f2', 'CGN', 'DXB', 32, 6), ground('l2', 'layover', 'DXB', 38, 20, 'T2')]
    expect(tripLegs(legs, 'T1').map((l) => l.id)).toEqual(['f1', 'l1', 'f2'])
  })
})
```

- [ ] **Step 4: Run them to see them fail.** Run `npx vitest run tests/map/tripActivity.test.ts tests/copy/activityWords.test.ts tests/map/tripMapFor.test.ts`. Expected: FAIL, as `src/map/tripActivity` and `activityWords` don't exist yet.

- [ ] **Step 5: The map keeps the ground legs.** In `src/map/tripMap.ts`, change the legs import to:

```ts
import { isMove, type Leg, type PlaceLeg } from '../engine/legs'
```

add after the other imports:

```ts
import type { GroundKind } from './tripActivity'
```

add after the `MapLeg` interface:

```ts
/** One of the trip's ground legs, kept to name the waits between its moving legs (activity markers design §2.2). Never drawn. */
export interface GroundStop {
  kind: GroundKind
  start: number
  end: number
}

/** A layover, a turn, or a stay at base or home: the legs that name a wait. The site's report leg isn't one. */
export const isGroundLeg = (leg: Leg): leg is PlaceLeg & { kind: GroundKind } =>
  leg.kind === 'layover' || leg.kind === 'turn' || leg.kind === 'base' || leg.kind === 'home'
```

in `interface TripMap`, after `legs`, add:

```ts
  /** The trip's layovers, turns and stays at base or home, earliest first: they name the waits. */
  groundStops: GroundStop[]
```

and in `makeTripMap` replace its last line with:

```ts
  const groundStops = legs.filter(isGroundLeg).map((l) => ({ kind: l.kind, start: l.start, end: l.end })).sort((a, b) => a.start - b.start)
  return { mode, legs: mapped, groundStops, home: home ? airportMark(home, airports) : null, span: { start, end }, days }
```

- [ ] **Step 6: The waits and the activity.** Create `src/map/tripActivity.ts`:

```ts
import { HOUR } from '../time/zoned'
import { isMoving, legInMotion, pilotLocation, type AirportMark, type GroundStop, type TripMap } from './tripMap'

/**
 * What the pilot is doing at a moment of the trip map, and where (the app's activity markers design §2.2), as the app's
 * TripActivity and TripMap+Activity: flying, driving, on a layover, at a turn, at base or at home. The kinds are the
 * shared cases' names (tests/fixtures/trip-map/activity-cases.json, a copy of the app's: change both together).
 */

export type ActivityKind = 'flying' | 'driving' | 'layover' | 'turn' | 'base' | 'home'

/** What a wait on the ground can be. */
export type GroundKind = Exclude<ActivityKind, 'flying' | 'driving'>

export interface TripActivity {
  kind: ActivityKind
  /** The flight's or the drive's destination, or where the pilot waits. */
  place: AirportMark
}

/** The pilot on the ground: what their marker shows. */
export interface GroundActivity extends TripActivity {
  kind: GroundKind
}

/** A stretch of the trip with no leg moving: from one leg's end, delay included, to the next one's start. */
export interface TripWait {
  start: number
  end: number
  kind: GroundKind
}

/** With no ground leg to name it, a wait this long or longer is a layover, and a shorter one a turn. */
export const SHORTEST_LAYOVER = 8 * HOUR

/** Layover, turn, base and home are waits, with the pilot's marker. Flying and driving show the plane and the car. */
export const isGroundKind = (kind: ActivityKind): kind is GroundKind => kind !== 'flying' && kind !== 'driving'

/** Every stretch of the span with no leg moving, earliest first, each named. A leg with no length never moves. */
export function tripWaits(map: TripMap): TripWait[] {
  const waits: TripWait[] = []
  let movingUntil = map.span.start
  for (const leg of [...map.legs].sort((a, b) => a.start - b.start)) {
    if (leg.end <= leg.start) continue
    if (leg.start > movingUntil) waits.push(namedWait(map.groundStops, movingUntil, leg.start))
    movingUntil = Math.max(movingUntil, leg.end)
  }
  if (map.span.end > movingUntil) waits.push(namedWait(map.groundStops, movingUntil, map.span.end))
  return waits
}

/** What the pilot is doing at `t`, and where. A flight wins over a drive that overlaps it. */
export function activityAt(map: TripMap, t: number): TripActivity | null {
  const moving = map.legs.find((l) => l.kind === 'flight' && isMoving(l, t)) ?? legInMotion(map, t)
  if (moving) return { kind: moving.kind === 'flight' ? 'flying' : 'driving', place: moving.destination }
  const place = pilotLocation(map, t)
  return place ? { kind: groundKind(map, t, place), place } : null
}

/**
 * Before the first departure, home for a next trip, else home or base by where the trip starts. From the last arrival
 * on, home for a recap, else home or base by where it ends. In between, the wait's kind.
 */
function groundKind(map: TripMap, t: number, place: AirportMark): GroundKind {
  const isHomeAirport = place.code === map.home?.code
  if (t < map.span.start) return map.mode.kind === 'nextTrip' || isHomeAirport ? 'home' : 'base'
  if (t >= map.span.end) return map.mode.kind === 'recap' || isHomeAirport ? 'home' : 'base'
  // Inside the span with nothing moving, one of the waits holds `t`.
  return tripWaits(map).find((w) => w.start <= t && t < w.end)?.kind ?? 'turn'
}

/** The wait from `start` to `end`, named by the ground stop overlapping it most, the earlier on a tie; with none, by its length. */
function namedWait(stops: readonly GroundStop[], start: number, end: number): TripWait {
  let best: GroundStop | null = null
  let most = 0
  for (const stop of stops) {
    const overlap = Math.min(stop.end, end) - Math.max(stop.start, start)
    if (overlap <= 0) continue
    if (best && (overlap < most || (overlap === most && stop.start >= best.start))) continue
    best = stop
    most = overlap
  }
  return { start, end, kind: best?.kind ?? (end - start >= SHORTEST_LAYOVER ? 'layover' : 'turn') }
}
```

- [ ] **Step 7: The words.** In `src/copy/tripMap.ts`, add this import, sorted among the others:

```ts
import type { TripActivity } from '../map/tripActivity'
```

and add after `timelineTime`:

```ts
/** The words under the timeline (activity markers design §4.2): "Flying to San Francisco", "Layover in Denver", "Home". */
export function activityWords({ kind, place }: TripActivity): string {
  switch (kind) {
    case 'flying': return `Flying to ${place.city}`
    case 'driving': return `Driving to ${place.city}`
    case 'layover': return `Layover in ${place.city}`
    case 'turn': return `Turn in ${place.city}`
    case 'base': return `At base in ${place.city}`
    case 'home': return 'Home'
  }
}

/** "Sat 1:40 PM · Layover in Denver": the line under the timeline, when and what (activity markers design §4.2). */
export function timelineLine(ms: number, activity: TripActivity | null, viewerTz: string, h24: boolean): string {
  const time = timelineTime(ms, viewerTz, h24)
  return activity ? `${time} · ${activityWords(activity)}` : time
}

/** "Saturday 1:40 PM, layover in Denver": the timeline's value for screen readers (activity markers design §4.3). */
export function timelineSpokenValue(ms: number, activity: TripActivity | null, viewerTz: string, h24: boolean): string {
  const time = `${WEEKDAYS[zonedParts(ms, viewerTz).weekday]} ${shortTimeText(ms, viewerTz, h24)}`
  if (!activity) return time
  const words = activityWords(activity)
  return `${time}, ${words.charAt(0).toLowerCase()}${words.slice(1)}`
}
```

`AirportMark.city` is already the city, or the code when there's none.

- [ ] **Step 8: The ground legs come with the trip.** In `src/map/tripMapFor.ts`, change `import { makeTripMap, type TripMap } from './tripMap'` to `import { isGroundLeg, makeTripMap, type TripMap } from './tripMap'`, and replace `tripLegs` with:

```ts
/**
 * A trip's own flights and jumpseats, the drives and standalone jumpseats within 12 hours of them, and its layovers,
 * turns and stays at base or home, which name the waits between them (activity markers design §2.2).
 */
export function tripLegs(legs: Leg[], tripId: string): Leg[] {
  const own = legs.filter((l) => isMove(l) && l.tripId === tripId)
  if (own.length === 0) return []
  const first = Math.min(...own.map((l) => l.start)) - COMMUTE_WINDOW
  const last = Math.max(...own.map((l) => l.end)) + COMMUTE_WINDOW
  const commutes = legs.filter((l) => (l.kind === 'drive' || (isMove(l) && l.tripId == null)) && l.start >= first && l.end <= last)
  const ground = legs.filter((l) => isGroundLeg(l) && l.tripId === tripId)
  return [...own, ...commutes, ...ground].sort((a, b) => a.start - b.start)
}
```

- [ ] **Step 9: The hand-made maps.** In `tests/facts/factsTestData.ts` (line 57) and `tests/facts/factsCases.test.ts` (line 143), add `groundStops: [],` after `legs` in the `TripMap` literal.

- [ ] **Step 10: Run the tests.** Run `npx vitest run tests/map tests/copy tests/facts`. Expected: PASS, every shared activity case included. If an existing `tripMapFor` test fails only because a trip's own ground legs now come along, the old expectation is out of date: update it to include them, and note it for the plan's record.

- [ ] **Step 11:** Run `npm run build`. Expected: no type errors.

Suggested commit: `The trip map knows what the pilot is doing: the trip's layovers, turns and stays name each wait between its legs, held to the app's shared cases (activity markers design §2.2)`

### Task 3: The replay hurries through waits, and places any moment in replay time

**Files:**
- Modify: `src/map/replayClock.ts`
- Create: `tests/map/replayQuickLayovers.test.ts`

- [ ] **Step 1: Write the failing tests.** Create `tests/map/replayQuickLayovers.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  clockTime, LEG_MIN_REPLAY, liveClock, play, progressAt, QUICK_WAIT_RATE, REPLAY_BASE_RATE, replayDuration, replayOffset, scrub,
  setQuickLayovers, setSpeed, tripTimeAtOffset, WAIT_MIN_REPLAY, type ReplaySpeed,
} from '../../src/map/replayClock'
import { at } from './tripMapLegs'

/** The app's shared cases (Crewluv's CrewluvTests/Fixtures/TripMap): change both copies together. */
interface Stretchy { start: string; end: string }
interface Cases {
  constants: { baseRate: number; legMinimumSeconds: number; waitMinimumSeconds: number; quickWaitRate: number }
  cases: { name: string; span: Stretchy; legs: Stretchy[]; waits: Stretchy[]; quickLayovers: boolean; speed: ReplaySpeed; replayLength: number; checks: { seconds: number; at: string }[] }[]
}
const cases = JSON.parse(readFileSync(new URL('../fixtures/trip-map/replay-cases.json', import.meta.url), 'utf8')) as Cases
const stretch = (s: Stretchy) => ({ start: Date.parse(s.start), end: Date.parse(s.end) })

describe("the replay's pace with Quick layovers (activity markers design §3.2): the shared cases", () => {
  it("uses the shared cases' constants", () => {
    expect(REPLAY_BASE_RATE).toBe(cases.constants.baseRate)
    expect(LEG_MIN_REPLAY).toBe(cases.constants.legMinimumSeconds * 1000)
    expect(WAIT_MIN_REPLAY).toBe(cases.constants.waitMinimumSeconds * 1000)
    expect(QUICK_WAIT_RATE).toBe(cases.constants.quickWaitRate)
  })

  it.each(cases.cases)('$name', (c) => {
    const pressed = 1_000_000
    const clock = play(setSpeed(liveClock(stretch(c.span), c.legs.map(stretch), c.waits.map(stretch), c.quickLayovers), c.speed, 0), pressed)
    expect(replayDuration(clock)).toBeCloseTo(c.replayLength * 1000, 6)
    for (const check of c.checks) {
      expect(Math.abs(clockTime(clock, pressed + check.seconds * 1000) - Date.parse(check.at)), `${check.seconds} s`).toBeLessThan(1)
    }
  })
})

describe('Quick layovers (activity markers design §3.1) and positions in replay time (§4.3)', () => {
  // The Europe trip: legs of 8, 6 and 14 hours, with a 24-hour and a 20-hour wait. At 1x with Quick layovers on that's
  // 16 s, 3 s, 12 s, 3 s and 28 s: 62 s. With it off, 144 s.
  const span = { start: at(0), end: at(72) }
  const legs = [{ start: at(0), end: at(8) }, { start: at(32), end: at(38) }, { start: at(58), end: at(72) }]
  const waits = [{ start: at(8), end: at(32) }, { start: at(38), end: at(58) }]
  const quick = liveClock(span, legs, waits, true)

  it('is off for a clock made as before, so it plays as before', () => {
    expect(liveClock(span, legs).quickLayovers).toBe(false)
    expect(replayDuration(liveClock(span, legs, waits))).toBe(144_000)
  })

  it('measures the whole replay at each pace', () => {
    expect(replayDuration(quick)).toBe(62_000)
    expect(replayDuration({ ...quick, quickLayovers: false })).toBe(144_000)
  })

  it('keeps the moment when switched during a replay, and carries on from there at the new pace', () => {
    const switched = setQuickLayovers(play(quick, 0), false, 17_500)
    expect(switched.quickLayovers).toBe(false)
    expect(clockTime(switched, 17_500)).toBe(at(20))
    // A second at a day in 48 s is half an hour.
    expect(clockTime(switched, 18_500)).toBe(at(20.5))
  })

  it('keeps the moment when switched while paused', () => {
    expect(clockTime(setQuickLayovers(scrub(quick, at(20)), false, 0), 99)).toBe(at(20))
  })

  it('turns a moment into replay time and back, held to the trip', () => {
    expect(replayOffset(quick, at(20))).toBe(17_500)
    expect(tripTimeAtOffset(quick, 17_500)).toBe(at(20))
    expect(tripTimeAtOffset(quick, -5)).toBe(at(0))
    expect(tripTimeAtOffset(quick, 99_000)).toBe(at(72))
  })

  it('places a moment along the bar, 0 to 1, held to its ends', () => {
    expect(progressAt(quick, at(8))).toBeCloseTo(16 / 62, 12)
    expect(progressAt(quick, at(-5))).toBe(0)
    expect(progressAt(quick, at(80))).toBe(1)
    expect(progressAt(liveClock({ start: at(0), end: at(0) }), at(0))).toBe(0)
  })
})
```

- [ ] **Step 2: Run it to see it fail.** Run `npx vitest run tests/map/replayQuickLayovers.test.ts`. Expected: FAIL, as `setQuickLayovers` and the others don't exist.

- [ ] **Step 3: The clock.** In `src/map/replayClock.ts`:

Replace the file's opening comment with:

```ts
/**
 * The full-screen map's time (moving map spec §6), as the app's TripReplayClock: now, a moment dragged to, or a replay
 * at 1x to 10x. A value the page keeps in state and reads on each frame, so nothing changes per frame. A leg in motion
 * that would pass in under 3 s at 1x slows so it takes 3 s (docs/superpowers/specs/2026-11-13-replay-short-legs-design.md).
 * With Quick layovers on, a wait on the ground takes a second a day, never under 3 s and never slower than a day in 48 s,
 * and the clock places any moment along the timeline in replay time (the app's activity markers design §3.2, §4.3).
 * The shared cases are tests/fixtures/trip-map/replay-cases.json, a copy of the app's: change both together.
 */
```

After `LEG_MIN_REPLAY`, add:

```ts
/** The least real time, in ms at 1x, that a wait takes with Quick layovers on. */
export const WAIT_MIN_REPLAY = 3000

/** Trip time per real time at 1x through a long wait with Quick layovers on: a day a second. */
export const QUICK_WAIT_RATE = 86_400
```

Replace `interface ReplayClock` and `liveClock` with:

```ts
export interface ReplayClock {
  span: Stretch
  /** The trip's legs. A short one slows the replay while it moves. */
  legs: readonly Stretch[]
  /** The stretches with no leg moving, which Quick layovers hurries through. */
  waits: readonly Stretch[]
  /** Whether waits on the ground hurry by (activity markers design §3.1). */
  quickLayovers: boolean
  speed: ReplaySpeed
  /** Null while live. Otherwise the trip time it was set to, and when it started playing from there. */
  anchor: { tripTime: number; playingSince: number | null } | null
}

/** Live. Quick layovers is off unless asked, so a clock made as before plays as before. */
export const liveClock = (span: Stretch, legs: readonly Stretch[] = [], waits: readonly Stretch[] = [], quickLayovers = false): ReplayClock =>
  ({ span, legs, waits, quickLayovers, speed: 1, anchor: null })
```

Replace `pace` and its comment with:

```ts
/**
 * The span cut at every leg's and wait's start and end. Each piece plays at the normal rate. While legs move through
 * it, it plays at the slowest of their rates, a leg's length over 3 s; a leg with no length covers no piece, so it adds
 * no time. Through a wait with Quick layovers on, it plays at the whole wait's quick rate.
 */
function pace(c: ReplayClock): Piece[] {
  const { start, end } = c.span
  const cuts = [start, end, ...[...c.legs, ...c.waits].flatMap((l) => [l.start, l.end])].filter((t) => t >= start && t <= end)
  const times = [...new Set(cuts)].sort((a, b) => a - b)
  return times.slice(1).map((to, i) => {
    const from = times[i]
    const moving = c.legs.filter((l) => l.start <= from && to <= l.end)
    if (moving.length > 0) {
      return { start: from, end: to, rate: moving.reduce((slowest, l) => Math.min(slowest, (l.end - l.start) / LEG_MIN_REPLAY), REPLAY_BASE_RATE) }
    }
    const wait = c.quickLayovers ? c.waits.find((w) => w.start <= from && to <= w.end) : undefined
    return { start: from, end: to, rate: wait ? quickRate(wait.end - wait.start) : REPLAY_BASE_RATE }
  })
}

/**
 * A wait of `length` plays in min(length / 1,800, max(3 s, length / 86,400)) at 1x: a second a day, never under 3 s,
 * and never slower than the normal rate. As a rate, that's its length over that time.
 */
const quickRate = (length: number) => Math.max(REPLAY_BASE_RATE, Math.min(length / WAIT_MIN_REPLAY, QUICK_WAIT_RATE))
```

After `setSpeed`, add:

```ts
/** Hurries through waits or plays them at the normal rate, from the moment shown: a replay carries on from there (§3.1). */
export const setQuickLayovers = (c: ReplayClock, quickLayovers: boolean, now: number): ReplayClock =>
  isPlaying(c) ? { ...c, quickLayovers, anchor: { tripTime: clockTime(c, now), playingSince: now } } : { ...c, quickLayovers }
```

At the end of the file, add:

```ts
// Positions along the timeline (activity markers design §4.3): the bar measures replay time at 1x at the clock's pace.

/** The whole replay at 1x, in ms. */
export const replayDuration = (c: ReplayClock) => realAt(pace(c), c.span.end)

/** The replay ms at 1x from the span's start to the trip time `t`. */
export const replayOffset = (c: ReplayClock, t: number) => realAt(pace(c), t)

/** The trip time `offset` replay ms at 1x after the span's start: the span's end once the whole replay has played. */
export const tripTimeAtOffset = (c: ReplayClock, offset: number) => tripAt(pace(c), Math.max(offset, 0), c.span.end)

/** Where `t` sits along the timeline, 0 at the span's start and 1 at its end, in replay time at 1x. */
export function progressAt(c: ReplayClock, t: number): number {
  const whole = replayDuration(c)
  return whole > 0 ? Math.min(Math.max(replayOffset(c, t) / whole, 0), 1) : 0
}
```

`clockTime`, `finishesAt`, `hasFinished`, `scrub`, `play`, `pause` and `goLive` don't change: they read `pace(c)`, so they follow the new rates.

- [ ] **Step 4: Run the tests.** Run `npx vitest run tests/map`. Expected: PASS, every shared replay case included, and `replayClock.test.ts` unchanged and passing.

- [ ] **Step 5:** Run `npm run build`. Expected: no type errors. If anything else builds a `ReplayClock` literal, it needs `waits: []` and `quickLayovers: false`.

Suggested commit: `The trip map's replay hurries through each wait with Quick layovers, a second a day and never under 3 s, and places any moment in replay time, held to the app's shared cases (activity markers design §3.2, §4.3)`

### Task 4: The bar's blocks, and each wait's length

**Files:**
- Create: `src/map/timelineBlocks.ts`, `tests/map/timelineBlocks.test.ts`

- [ ] **Step 1: Write the failing test.** Create `tests/map/timelineBlocks.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { liveClock } from '../../src/map/replayClock'
import { timelineBlocks, waitLabel } from '../../src/map/timelineBlocks'
import { tripWaits } from '../../src/map/tripActivity'
import { makeTripMap, type TripMap } from '../../src/map/tripMap'
import { AIRPORTS, at, drive, EUROPE, flight, HOUR } from './tripMapLegs'

/** The app's shared cases (Crewluv's CrewluvTests/Fixtures/TripMap): change both copies together. */
const cases = JSON.parse(readFileSync(new URL('../fixtures/trip-map/replay-cases.json', import.meta.url), 'utf8')) as {
  waitLabels: { hours: number; label: string | null; note: string }[]
}

const clockFor = (map: TripMap, quickLayovers: boolean) => liveClock(map.span, map.legs, tripWaits(map), quickLayovers)
const europe = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!

describe("the timeline's blocks (activity markers design §4.1)", () => {
  it('are the flights and two small layovers with Quick layovers on', () => {
    expect(timelineBlocks(europe, clockFor(europe, true))).toEqual([
      { kind: 'flying', start: 0, end: 16 / 62, label: null },
      { kind: 'layover', start: 16 / 62, end: 19 / 62, label: '24h' },
      { kind: 'flying', start: 19 / 62, end: 31 / 62, label: null },
      { kind: 'layover', start: 31 / 62, end: 34 / 62, label: '20h' },
      { kind: 'flying', start: 34 / 62, end: 1, label: null },
    ])
  })

  it('give the layovers their full share with Quick layovers off', () => {
    // 144 s in all: each edge is its replay seconds over 144.
    expect(timelineBlocks(europe, clockFor(europe, false)).map((b) => [b.kind, b.start, b.end])).toEqual([
      ['flying', 0, 16 / 144], ['layover', 16 / 144, 64 / 144], ['flying', 64 / 144, 76 / 144], ['layover', 76 / 144, 116 / 144], ['flying', 116 / 144, 1],
    ])
  })

  it('are flying where a flight overlaps a drive', () => {
    const map = makeTripMap([drive('d1', 'SDF', 'LEX', 0, 2), flight('f1', 'LEX', 'CGN', 1, 8)], { isNextTrip: false, home: 'SDF', now: at(0), airports: AIRPORTS })!
    expect(timelineBlocks(map, clockFor(map, true)).map((b) => [b.kind, b.end])).toEqual([['driving', 1 / 9], ['flying', 1]])
  })

  it('are none for a trip with no length', () => {
    const map = makeTripMap([flight('f1', 'SDF', 'CGN', 0, 0)], { isNextTrip: false, home: 'SDF', now: at(0), airports: AIRPORTS })!
    expect(timelineBlocks(map, clockFor(map, true))).toEqual([])
  })
})

describe("a wait's length on its block: the shared cases", () => {
  it.each(cases.waitLabels)('$hours h is $label ($note)', ({ hours, label }) => {
    expect(waitLabel(hours * HOUR)).toBe(label)
  })
})
```

The block edges come out of `realAt`'s sums, so if `toEqual` fails on a last-digit difference only, compare each edge with `toBeCloseTo(…, 12)` instead. Don't change the values.

- [ ] **Step 2: Run it to see it fail.** Run `npx vitest run tests/map/timelineBlocks.test.ts`. Expected: FAIL, as the module doesn't exist.

- [ ] **Step 3: The blocks.** Create `src/map/timelineBlocks.ts`:

```ts
import { DAY, HOUR } from '../time/zoned'
import { progressAt, type ReplayClock } from './replayClock'
import { isGroundKind, tripWaits, type ActivityKind, type TripWait } from './tripActivity'
import type { MapLeg, TripMap } from './tripMap'

/**
 * The timeline bar's blocks (the app's activity markers design §4.1), as the app's TripTimeline: the trip's span in
 * replay time at 1x, at the clock's pace, each part colored by what the pilot is doing. A wait carries its real length,
 * "20h" or "4d", which the bar writes on it when it fits.
 */

export interface TimelineBlock {
  kind: ActivityKind
  /** Where it starts and ends along the bar, 0…1: its replay time at 1x over the whole replay's. */
  start: number
  end: number
  /** A wait's real length; null for a flight or a drive, and for a wait under half an hour. */
  label: string | null
}

/** Earliest first, end to end from 0 to 1. None for a trip with no length. */
export function timelineBlocks(map: TripMap, clock: ReplayClock): TimelineBlock[] {
  const { start, end } = map.span
  if (end <= start) return []
  const moving = map.legs.filter((l) => l.end > l.start)
  const waits = tripWaits(map)
  const cuts = [start, end, ...moving.flatMap((l) => [l.start, l.end])].filter((t) => t >= start && t <= end)
  const times = [...new Set(cuts)].sort((a, b) => a - b)
  const parts: { kind: ActivityKind; start: number; end: number }[] = []
  times.slice(1).forEach((to, i) => {
    const kind = kindOf(times[i], to, moving, waits)
    const last = parts[parts.length - 1]
    if (last?.kind === kind) last.end = to
    else parts.push({ kind, start: times[i], end: to })
  })
  return parts.map((p) => ({
    kind: p.kind,
    start: progressAt(clock, p.start),
    end: progressAt(clock, p.end),
    label: isGroundKind(p.kind) ? waitLabel(p.end - p.start) : null,
  }))
}

/**
 * A wait's length on its block (design §4.1): whole hours under 48, whole days from 48, each to the nearest with halves
 * up; null when it rounds to no hours. The shared cases are `waitLabels` in tests/fixtures/trip-map/replay-cases.json.
 */
export function waitLabel(ms: number): string | null {
  const hours = Math.round(ms / HOUR)
  if (hours <= 0) return null
  return hours < 48 ? `${hours}h` : `${Math.round(ms / DAY)}d`
}

/** Flying where any flight moves, else driving where a drive does, else the wait's kind. */
function kindOf(from: number, to: number, moving: MapLeg[], waits: TripWait[]): ActivityKind {
  const covering = moving.filter((l) => l.start <= from && to <= l.end)
  if (covering.some((l) => l.kind === 'flight')) return 'flying'
  if (covering.length > 0) return 'driving'
  // A stretch no moving leg covers lies inside one of the map's waits.
  return waits.find((w) => w.start <= from && to <= w.end)?.kind ?? 'turn'
}
```

- [ ] **Step 4: Run the tests.** Run `npx vitest run tests/map`. Expected: PASS.

- [ ] **Step 5:** Run `npm run build`. Expected: no type errors.

Suggested commit: `The timeline's blocks in replay time, colored by what the pilot is doing, with each wait's length, held to the app's shared labels (activity markers design §4.1)`

**Batch A checkpoint:**
1. Run `npm test` and `npm run build`; both pass.
2. Dispatch `superpowers:code-reviewer` (sonnet) on Tasks 2–4's diff against `c35feca`, with the design, the app's Swift, and this plan.
3. Apply what's confirmed and re-review.
4. Ask Todd to commit the three tasks.

### Task 5: The pilot's marker

**Files:**
- Modify: `scripts/build-icons.mjs`, `src/icons/iconPaths.ts` (regenerated), `src/map/tripMapDrawing.ts`, `src/ui/TripMapSvg.tsx`, `src/styles/tripMap.css`, `tests/map/tripMapDrawing.test.ts`, `tests/ui/TripMapSvg.test.tsx`

- [ ] **Step 1: The two icons.** In `scripts/build-icons.mjs`, add this comment line after the one that starts `// The eighth`:

```js
// The ninth, the trip map's markers for what the pilot is doing (the app's activity markers design §2.1).
```

and add `Hourglass: 'hourglass', Briefcase: 'briefcase',` as the last entries of `ICONS`. Run `node scripts/build-icons.mjs`. `git diff --stat src/icons/iconPaths.ts` should show only two lines added.

- [ ] **Step 2: Write the failing tests.** In `tests/map/tripMapDrawing.test.ts`:
  - replace `expect(drawing.pin).toBeNull()` with `expect(drawing.pilot).toBeNull()`;
  - replace `expect(drawing.pin?.code).toBe('CGN')` with:

```ts
    expect(drawing.pilot).toMatchObject({ kind: 'layover', place: { code: 'CGN' } })
```

  - rename that test `'greys the flown leg and marks the pilot on the layover in Cologne'`.

In `tests/ui/TripMapSvg.test.tsx`, add `PILOT_ICONS` to the import from `../../src/ui/TripMapSvg`, make sure `makeTripMap`, `AIRPORTS`, `at` and `EUROPE` are imported as the file's other tests do, and add:

```tsx
describe("the pilot's marker (activity markers design §2)", () => {
  const draw = (t: number, isNextTrip = false) => {
    const map = makeTripMap(EUROPE, { isNextTrip, home: 'SDF', now: t, airports: AIRPORTS })!
    return render(<TripMapSvg map={map} t={t} width={390} height={220} focus={null} land={null} nightStep={60_000} />).container
  }

  it('shows what the pilot is doing on the ground in its color: a layover in Cologne, home before a next trip', () => {
    expect(draw(at(12)).querySelector('.trip-map-pilot')?.getAttribute('class')).toBe('trip-map-pilot activity-layover')
    cleanup()
    expect(draw(at(-2), true).querySelector('.trip-map-pilot')?.getAttribute('class')).toBe('trip-map-pilot activity-home')
  })

  it('gives way to the plane in the air', () => {
    const svg = draw(at(4))
    expect(svg.querySelector('.trip-map-pilot')).toBeNull()
    expect(svg.querySelector('.trip-map-plane')).not.toBeNull()
  })

  it("draws the design's symbols: a bed, an hourglass, a briefcase and a house", () => {
    expect(PILOT_ICONS).toEqual({ layover: 'Bed', turn: 'Hourglass', base: 'Briefcase', home: 'House' })
  })
})
```

Import `cleanup` from `@testing-library/preact` if the file doesn't already.

- [ ] **Step 3: Run them to see them fail.** Run `npx vitest run tests/map/tripMapDrawing.test.ts tests/ui/TripMapSvg.test.tsx`. Expected: FAIL.

- [ ] **Step 4: The drawing.** In `src/map/tripMapDrawing.ts`, change the imports to:

```ts
import type { GeoPoint } from './greatCircle'
import { activityAt, isGroundKind, type GroundActivity } from './tripActivity'
import { headingAt, isMoving, legProgress, positionAt, type AirportMark, type TripMap } from './tripMap'
```

replace the `pin` field with:

```ts
  /** The pilot's marker: what they're doing and where, while nothing moves (activity markers design §2). */
  pilot: GroundActivity | null
```

and replace the `return` line with:

```ts
  const activity = activityAt(map, t)
  const pilot = activity && isGroundKind(activity.kind) ? { kind: activity.kind, place: activity.place } : null
  return { segments, airports, cars, plane, pilot }
```

- [ ] **Step 5: The marker.** In `src/ui/TripMapSvg.tsx`:
  - add `import type { GroundKind } from '../map/tripActivity'` among the imports;
  - add after `Mark`:

```tsx
/** Each ground marker's icon (activity markers design §2.1): Phosphor's match for the app's SF Symbol. */
export const PILOT_ICONS: Record<GroundKind, IconName> = { layover: 'Bed', turn: 'Hourglass', base: 'Briefcase', home: 'House' }

/** The pilot's marker: a white icon on what they're doing's color, in a white ring, the size of the heart it replaces. */
function PilotMarker({ kind, at }: { kind: GroundKind; at: { x: number; y: number } }) {
  return (
    <g class={`trip-map-pilot activity-${kind}`}>
      <circle cx={at.x} cy={at.y} r={12} />
      <Mark name={PILOT_ICONS[kind]} at={at} size={13} class="trip-map-pilot-icon" />
    </g>
  )
}
```

  - replace the heart's line with:

```tsx
      {drawing.pilot && <PilotMarker kind={drawing.pilot.kind} at={placeAt(drawing.pilot.place, view)} />}
```

  - in the component's doc comment, change "the heart and the plane" to "the pilot's marker and the plane".

- [ ] **Step 6: The colors.** In `src/styles/tripMap.css`, replace the `.trip-map-heart` line with:

```css
/* What the pilot is doing (activity markers design §2.1, §4.1): one color a kind, for the marker and the timeline. */
.activity-flying { --activity: var(--blue); }
.activity-driving { --activity: var(--gray); }
.activity-layover { --activity: var(--indigo); }
.activity-turn { --activity: var(--orange); }
.activity-base { --activity: var(--teal); }
.activity-home { --activity: var(--green); }
.trip-map-pilot circle { fill: var(--activity); stroke: #ffffff; stroke-width: 1.5; }
.trip-map-pilot-icon { fill: #ffffff; }
```

- [ ] **Step 7: Run the tests.** Run `npx vitest run tests/map tests/ui`. Expected: PASS.

- [ ] **Step 8:** Run `npm run build`. Expected: no type errors.

Suggested commit: `The trip map shows what the pilot is doing where the heart was: a bed on a layover, an hourglass at a turn, a briefcase at base and a house at home (activity markers design §2)`

### Task 6: The colored bar in replay time, and Quick layovers

**Files:**
- Create: `src/ui/TripTimelineBlocks.tsx`, `src/ui/hooks/useQuickLayovers.ts`
- Rewrite: `src/ui/TripTimeline.tsx`
- Modify: `src/ui/TripMapPage.tsx`, `src/styles/tripMap.css`, `tests/ui/TripMapPage.test.tsx`

- [ ] **Step 1: Write the failing tests.** In `tests/ui/TripMapPage.test.tsx`, change `afterEach(cleanup)` to:

```ts
afterEach(() => {
  cleanup()
  localStorage.clear()
})
```

replace the test `'has a slider for the trip time and a speed choice'` with:

```tsx
  it('has a slider for the trip time in replay time, a speed choice, and Quick layovers, on', () => {
    page()
    const slider = screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement
    expect(Number(slider.min)).toBe(0)
    // The Europe trip with Quick layovers: 62 s at 1x.
    expect(Number(slider.max)).toBe(62_000)
    expect(slider.step).toBe('any')
    expect(slider.getAttribute('aria-valuetext')).toMatch(/^Friday 7:00\sPM, layover in Cologne$/)
    expect(screen.getByRole('combobox', { name: 'Replay speed' })).toBeTruthy()
    expect((screen.getByRole('switch', { name: 'Quick layovers' }) as HTMLInputElement).checked).toBe(true)
  })
```

and add at the end of the `describe`:

```tsx
  it('says when and what under the bar', () => {
    page()
    expect(document.querySelector('.trip-timeline-time')!.textContent).toMatch(/^Fri 7:00\sPM · Layover in Cologne$/)
  })

  it('colors the bar by what the pilot is doing, with each layover’s length', () => {
    page()
    const blocks = [...document.querySelectorAll('.trip-timeline-layer.ahead .trip-timeline-block')]
    expect(blocks.map((b) => b.getAttribute('class'))).toEqual([
      'trip-timeline-block activity-flying', 'trip-timeline-block activity-layover', 'trip-timeline-block activity-flying',
      'trip-timeline-block activity-layover', 'trip-timeline-block activity-flying',
    ])
    expect(blocks.map((b) => b.textContent)).toEqual(['', '24h', '', '20h', ''])
  })

  it('moves half a second of replay with an arrow key: eight hours of a quick layover', () => {
    page()
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Trip time' }), { key: 'ArrowRight' })
    expect(document.querySelector('.trip-timeline-time')!.textContent).toMatch(/^Fri 11:00\sPM · Layover in Cologne$/)
  })

  it('keeps the moment when Quick layovers is switched off, and the bar then measures the slower replay', () => {
    page()
    const line = document.querySelector('.trip-timeline-time')!.textContent
    fireEvent.click(screen.getByRole('switch', { name: 'Quick layovers' }))
    expect(document.querySelector('.trip-timeline-time')!.textContent).toBe(line)
    expect(Number((screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement).max)).toBe(144_000)
  })

  it('remembers Quick layovers turned off for the next map this browser opens', () => {
    page()
    fireEvent.click(screen.getByRole('switch', { name: 'Quick layovers' }))
    expect(localStorage.getItem('crewluve.tripMap.quickLayovers')).toBe('off')
    cleanup()
    page()
    expect((screen.getByRole('switch', { name: 'Quick layovers' }) as HTMLInputElement).checked).toBe(false)
  })
```

- [ ] **Step 2: Run them to see them fail.** Run `npx vitest run tests/ui/TripMapPage.test.tsx`. Expected: FAIL.

- [ ] **Step 3: The switch, remembered.** Create `src/ui/hooks/useQuickLayovers.ts`:

```ts
import { useState } from 'preact/hooks'

/** Where this browser remembers Quick layovers (activity markers design §3.1), the same for every trip. */
const KEY = 'crewluve.tripMap.quickLayovers'

/** On, unless this browser turned it off. Storage that can't be read, as in a private window, reads as on. */
function readQuickLayovers(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

/** Quick layovers, and a way to change it that this browser remembers. */
export function useQuickLayovers(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(readQuickLayovers)
  const remember = (value: boolean) => {
    setOn(value)
    try {
      localStorage.setItem(KEY, value ? 'on' : 'off')
    } catch {
      // Storage that can't be written: the choice lasts until the page closes.
    }
  }
  return [on, remember]
}
```

- [ ] **Step 4: The blocks.** Create `src/ui/TripTimelineBlocks.tsx`:

```tsx
import type { TimelineBlock } from '../map/timelineBlocks'

/** Half the thumb: how far in from each end its centre stops, as a range input's does. */
const INSET = 14

/** The thumb's centre at `p`, 0…1, across the bar, as CSS. */
const thumbX = (p: number) => `calc(${INSET}px + ${p} * (100% - ${2 * INSET}px))`

/** A block's edge at `p`: along the thumb's travel, with the first and last blocks reaching the bar's rounded ends. */
const blockEdge = (p: number) => (p <= 0 ? '0px' : p >= 1 ? '100%' : thumbX(p))

export interface TripTimelineBlocksProps {
  blocks: TimelineBlock[]
  /** Where the thumb is, 0…1. */
  progress: number
}

/**
 * The timeline's colored blocks (activity markers design §4.1), under the range input whose thumb moves over them: the
 * part ahead pale, and the part played in full color, clipped at the thumb. A wait's length shows when it fits.
 */
export function TripTimelineBlocks({ blocks, progress }: TripTimelineBlocksProps) {
  const layer = (played: boolean) => (
    <div class={`trip-timeline-layer ${played ? 'played' : 'ahead'}`}
      style={played ? { clipPath: `inset(0 calc(100% - ${thumbX(progress)}) 0 0)` } : undefined}>
      {blocks.map((b, i) => (
        <div key={i} class={`trip-timeline-block activity-${b.kind}`}
          style={{ left: blockEdge(b.start), width: `calc(${blockEdge(b.end)} - ${blockEdge(b.start)})` }}>
          {b.label && <span class="trip-timeline-label">{b.label}</span>}
        </div>
      ))}
    </div>
  )
  return <div class="trip-timeline-blocks" aria-hidden="true">{layer(false)}{layer(true)}</div>
}
```

- [ ] **Step 5: The timeline.** Replace `src/ui/TripTimeline.tsx` with:

```tsx
import type { JSX } from 'preact'
import { timelineLine, timelineSpokenValue } from '../copy/tripMap'
import {
  clockTime, goLive, hasFinished, isLive, isPlaying, pause, play, progressAt, REPLAY_SPEEDS, replayDuration, replayOffset, scrub,
  setSpeed, tripTimeAtOffset, type ReplayClock, type ReplaySpeed,
} from '../map/replayClock'
import { timelineBlocks } from '../map/timelineBlocks'
import { activityAt } from '../map/tripActivity'
import type { TripMap } from '../map/tripMap'
import { TripTimelineBlocks } from './TripTimelineBlocks'

export interface TripTimelineProps {
  map: TripMap
  clock: ReplayClock
  onChange: (clock: ReplayClock) => void
  /** Quick layovers switched on or off (activity markers design §3.1). */
  onQuickLayovers: (on: boolean) => void
  now: number
  viewerTz: string
  h24: boolean
}

/** An arrow key moves half a second of replay at 1x: a quarter hour of a flight, and more of a quick layover. */
const KEY_STEP = 500

/** Page Up and Page Down move a tenth of the replay. */
const PAGE_FRACTION = 0.1

/** How far a key moves the slider, in replay ms, or null for a key the input handles itself (Home, End). */
function keyMove(key: string, whole: number): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp': return KEY_STEP
    case 'ArrowLeft':
    case 'ArrowDown': return -KEY_STEP
    case 'PageUp': return whole * PAGE_FRACTION
    case 'PageDown': return -whole * PAGE_FRACTION
    default: return null
  }
}

/**
 * Play, drag through the trip, go back to Live, pick 1x to 10x, and Quick layovers (moving map spec §6; the app's
 * activity markers design §3, §4). The bar measures replay time at 1x at the clock's pace, colored by what the pilot is
 * doing, with when and what under it.
 */
export function TripTimeline({ map, clock, onChange, onQuickLayovers, now, viewerTz, h24 }: TripTimelineProps) {
  const t = clockTime(clock, now)
  const showsPause = isPlaying(clock) && !hasFinished(clock, now)
  const whole = replayDuration(clock)
  const offset = Math.min(replayOffset(clock, t), whole)
  const activity = activityAt(map, t)
  const moveTo = (to: number) => onChange(scrub(clock, tripTimeAtOffset(clock, Math.min(Math.max(to, 0), whole))))
  // The input moves freely, so its thumb glides through a replay; the arrow and page keys step it here.
  const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    const move = keyMove(e.key, whole)
    if (move == null) return
    e.preventDefault()
    moveTo(offset + move)
  }
  return (
    <div class="trip-timeline">
      <div class="trip-timeline-row">
        <button type="button" class="trip-timeline-play" aria-label={showsPause ? 'Pause replay' : 'Replay the trip'}
          onClick={() => onChange(showsPause ? pause(clock, Date.now()) : play(clock, Date.now()))}>
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            {showsPause ? <path d="M5 3h3v14H5zM12 3h3v14h-3z" /> : <path d="M6 3l11 7-11 7z" />}
          </svg>
        </button>
        <div class="trip-timeline-bar">
          <TripTimelineBlocks blocks={timelineBlocks(map, clock)} progress={progressAt(clock, t)} />
          <input type="range" class="trip-timeline-slider" aria-label="Trip time" aria-valuetext={timelineSpokenValue(t, activity, viewerTz, h24)}
            min={0} max={Math.max(whole, 1)} step="any" value={offset} onKeyDown={onKeyDown}
            onInput={(e) => moveTo(Number(e.currentTarget.value))} />
        </div>
        {!isLive(clock) && (
          <button type="button" class="trip-timeline-live" onClick={() => onChange(goLive(clock))}>Live</button>
        )}
      </div>
      <p class="trip-timeline-time" aria-hidden="true">{timelineLine(t, activity, viewerTz, h24)}</p>
      <div class="trip-timeline-row trip-timeline-settings">
        <label class="trip-timeline-quick">
          <input type="checkbox" role="switch" class="trip-timeline-switch" checked={clock.quickLayovers}
            onChange={(e) => onQuickLayovers(e.currentTarget.checked)} />
          Quick layovers
        </label>
        <select class="trip-timeline-speed" aria-label="Replay speed" value={String(clock.speed)}
          onChange={(e) => onChange(setSpeed(clock, Number(e.currentTarget.value) as ReplaySpeed, Date.now()))}>
          {REPLAY_SPEEDS.map((s) => <option key={s} value={String(s)}>{`${s}×`}</option>)}
        </select>
      </div>
    </div>
  )
}
```

If the `JSX` type import doesn't resolve the event's type in this Preact version, type `onKeyDown`'s parameter as `KeyboardEvent` and keep the body.

- [ ] **Step 6: The page.** In `src/ui/TripMapPage.tsx`:
  - change `import { useEffect, useRef, useState } from 'preact/hooks'` to `import { useEffect, useMemo, useRef, useState } from 'preact/hooks'`;
  - add `setQuickLayovers` to the import from `'../map/replayClock'`;
  - add `import { tripWaits } from '../map/tripActivity'` and `import { useQuickLayovers } from './hooks/useQuickLayovers'`, sorted with the others;
  - replace the two comment lines above `const clock = …` and that line with:

```tsx
  const [quickLayovers, rememberQuickLayovers] = useQuickLayovers()
  const waits = useMemo(() => tripWaits(map), [map])
  // The span, legs and waits always follow the map, so the slider's range and the replay's pace are right if the trip
  // changes while the page is open. Quick layovers is this browser's choice (activity markers design §3.1).
  const clock = { ...kept, span: map.span, legs: map.legs, waits, quickLayovers }
  // Switching keeps the moment shown, and a replay carries on from it at the new pace.
  const onQuickLayovers = (on: boolean) => {
    setClock(setQuickLayovers(clock, on, Date.now()))
    rememberQuickLayovers(on)
  }
```

  - and pass the map and the switch to the timeline:

```tsx
        <TripTimeline map={map} clock={clock} onChange={setClock} onQuickLayovers={onQuickLayovers} now={frameNow} viewerTz={viewerTz} h24={h24} />
```

- [ ] **Step 7: The bar and the switch's styles.** In `src/styles/tripMap.css`, replace these rules:

```css
.trip-timeline-row + .trip-timeline-row { margin-top: 8px; justify-content: space-between; }
```

```css
.trip-timeline-slider { flex: 1; }
```

```css
.trip-timeline-time { color: var(--text-2); font-size: 0.85rem; font-variant-numeric: tabular-nums; }
```

with:

```css
.trip-timeline-settings { justify-content: space-between; }
.trip-timeline-time { margin: 2px 0 6px; color: var(--text-2); font-size: 0.85rem; font-variant-numeric: tabular-nums; }

/* The bar (activity markers design §4.1): the colored blocks, with a range input's thumb over them. */
.trip-timeline-bar { position: relative; flex: 1; min-width: 0; height: 44px; }
.trip-timeline-blocks { position: absolute; top: 10px; left: 0; right: 0; height: 24px; overflow: hidden; border-radius: 12px; }
.trip-timeline-layer { position: absolute; inset: 0; }
/* A wait's length wraps out of sight below its block when it doesn't fit: the zero-width strut holds the first line. */
.trip-timeline-block {
  position: absolute;
  top: 0;
  height: 24px;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  justify-content: center;
  overflow: hidden;
  background: color-mix(in srgb, var(--activity) 35%, transparent);
}
.trip-timeline-block::before { content: ''; width: 0; height: 24px; }
.trip-timeline-layer.played .trip-timeline-block { background: var(--activity); }
.trip-timeline-label { padding: 0 3px; color: var(--text); font-size: 0.75rem; font-weight: 600; line-height: 24px; white-space: nowrap; }
.trip-timeline-layer.played .trip-timeline-label { color: #ffffff; }

.trip-timeline-slider {
  position: relative;
  display: block;
  width: 100%;
  height: 44px;
  margin: 0;
  background: transparent;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}
.trip-timeline-slider::-webkit-slider-runnable-track { height: 24px; background: transparent; }
.trip-timeline-slider::-moz-range-track { height: 24px; background: transparent; }
.trip-timeline-slider::-webkit-slider-thumb {
  width: 28px;
  height: 28px;
  margin-top: -2px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  -webkit-appearance: none;
  appearance: none;
}
.trip-timeline-slider::-moz-range-thumb {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
}
.trip-timeline-slider:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; border-radius: 14px; }

/* Quick layovers (activity markers design §3.1): a checkbox in a switch's dress, with its label. */
.trip-timeline-quick { display: flex; align-items: center; gap: 10px; min-height: 44px; cursor: pointer; }
.trip-timeline-switch {
  position: relative;
  flex: none;
  width: 51px;
  height: 31px;
  margin: 0;
  border-radius: 999px;
  background: var(--button-fill);
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  transition: background-color 0.2s;
}
.trip-timeline-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}
.trip-timeline-switch:checked { background: var(--green); }
.trip-timeline-switch:checked::after { transform: translateX(20px); }
.trip-timeline-switch:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .trip-timeline-switch,
  .trip-timeline-switch::after { transition: none; }
}
```

- [ ] **Step 8: Run the tests.** Run `npx vitest run tests/ui`. Expected: PASS. The old tests still hold: replay and Live, focus kept on the slider, the time moving as a replay plays.

- [ ] **Step 9:** Run `npm test` and `npm run build`. Expected: both pass.

Suggested commit: `The full map's timeline is colored by what the pilot is doing and measured in replay time, with "Quick layovers" on by default and remembered in the browser (activity markers design §3, §4)`

**Batch B checkpoint:**
1. The review (sonnet) of Tasks 5–6, then its fixes, and a re-review.
2. Run a dev server from the worktree on a free port (not 5180, which serves the main checkout), with `npx vite --port 5181 --strictPort` in the background.
3. With Todd, in the browser pane:
   - the demo's trip scenes: the card's marker on a layover, at base and at home;
   - the full map at 390 px and at 1,280 px wide, in light and dark: the bar's colors and labels, the line under it, the switch;
   - a replay at 1x and 10x with Quick layovers on and off;
   - the night sweeping through a layover;
   - the marker changing as the replay moves.
4. Ask Todd to commit the two tasks.

### Task 7: The README, and this plan's record

**Files:**
- Modify: `README.md`, this plan

- [ ] **Step 1:** In `README.md`'s trip map section:
  - say that the map marks what the pilot is doing (a bed on a layover, an hourglass at a turn, a briefcase at base, a house at home);
  - say that the full map's timeline is colored by it, with a "Quick layovers" switch that's on by default and remembered in the browser;
  - name the two new shared case files beside `progress-cases.json`, as copies of the app's to change together.
- [ ] **Step 2:** Add a section "Changes made during execution (2026-11-14)" at the end of this plan, listing every way the code differs from the plan's blocks and why, and anything left for later.
- [ ] **Step 3:** Run `npm test` and `npm run build`. Expected: both pass.

Suggested commit: `The README's trip map: what the pilot is doing, Quick layovers, and the two new shared cases; and the activity markers plan's record of changes`

**Close-out:** report to Todd the commits, the branch (`trip-map-activity`, not pushed), and anything he should check. Ask whether to open its PR now (based on `trip-map-facts`) or after PR #1 merges.

## Self-critique

- **Scope:**
  - Every part of the design's §5 for the website is here: the markers and colors, the colored bar, Quick layovers remembered, the same pace and words, and both shared case files.
  - The two items needing nothing new (60 updates a second, and a finished replay stopping) are said so in "What the website already has", so a reviewer doesn't look for them.
  - Live data's real plane, skipping waits, and the chips and facts are left alone, as the design says.
- **Risk:**
  - The bar's CSS is the one part tests can't see (happy-dom has no layout), which is why Batch B includes the look in the browser pane at two widths and both themes.
  - `step="any"` with keys handled in code is new for this site. The tests cover the arrow key; Home and End stay the browser's.
  - `color-mix` needs Safari 16.2+, which every iOS 17 device has.
- **The shared cases** are copied untouched and run in full, so the website can't drift from the app's pace or words without a test failing.
- **Website vs. app:** the website makes its ground legs again from the flights, rather than at CrewLu's scheduled times. That only matters in a delay, and there the kind comes out the same. This plan says so rather than changing the engine, which is outside the design.

## Changes made during execution (2026-11-14)

### Batch A (Tasks 2–4)

- **The report time names a wait "at base"** (from the batch review).
  - The plan left the site's report leg out. But a commuter's wait between the drive in and the first flight lies inside the trip's span, and with nothing to name it, it read "Turn in Louisville" or "Layover in Louisville" by its length.
  - The status already reads the report time as at base (`src/engine/status.ts`). So `isGroundLeg` now keeps report legs, and `stopKind` gives them the kind `base`. `tripLegs` brings them along with the trip's other ground legs.
  - The test that said the report leg is left out now expects it as `base`. A new test has the commuter at base, and a turn without the report time.
  - In the app, CrewLu's own legs name this stretch, so the two agree on real trips.
- **The shared cases' ground legs don't move with a delay in the test's `caseLeg`,** as its comment and the cases' `about` say. No ground leg in the cases has a delay, so no result changed (from the batch review).

### Batch B (Tasks 5–6)

- **The marker stands at `drawing.pilot.place.place`** (Task 5). The plan's `drawing.pilot.place` is an `AirportMark`, and `placeAt` takes its point.
- **Two existing page tests changed, as the slider now measures replay ms** (Task 6):
  - The recap opens at value 0.
  - The short-drive test now reads the trip time from the line under the bar ("Fri 7:1x AM · Driving to Lexington"). Replay time passes alike at either pace, so checking the slider's value alone no longer proves the drive was slowed.
- **From the batch review:**
  - **The bar's blocks are worked out once per trip and pace,** not each frame (`useMemo` in `TripTimeline`). Each layer keeps its block list (`TripTimelineBlocks`), so during a replay only the played layer's clip changes. On a 30-leg trip the blocks cost about 3.5 ms each time on a Mac, which a phone would have paid every frame.
  - **A key held with Alt, Ctrl, Meta or Shift** is left to the browser (Alt+Left is Back).
  - **The played labels stay white, as in the app,** with a soft shadow so they read on orange, teal and green. The marker's white icon is the design's, unchanged.
  - **The switch has a hairline when off,** so it shows on a light panel. **High contrast modes** outline the switch and the thumbs. **A browser without `color-mix`** shows the part ahead in full color.
  - **New tests:**
    - Page Down;
    - a key with a modifier;
    - switching Quick layovers off during a replay, which keeps the moment and slows to a day in 48 s;
    - storage that throws, which still reads on and still switches.
    - One test's title was corrected: an arrow key moves four hours of a quick layover, not eight.

### Left for later

- ~~On the trip map card, the bottom chip covers most of the pilot's marker on a layover.~~ Fixed after the plan, at Todd's choice of two prototypes: the card's camera keeps the trip in the band between its chips, measured as they lay out (`chipInsets`, `useHeightOf`). The other prototype, chips under the map, would have made the card about 60 px taller. The app gets the same fix.
- **On the full map, the marker sits over its airport's code** (MIA), as the heart did.
