# Moving Map Stage 3C-1 (the Website, the Engine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the website everything it needs to know about the real plane, with nothing a family sees changing yet: the shared cases, the schedule's flight plan, the real path and its record, the real plane at any moment with its label, `partner_live` at the partner door, and the source that asks for it.

**Architecture:**
- **The app's engine in TypeScript.** It's the design the app built in plan 3B-1, with the two changes made after the first real flight (a fix stays live for 3 minutes, and the estimate flies at the plane's own speed). The shared cases (`live-cases.json`, copied from the app) hold the two to the same answers.
- **Pure functions over plain data in `src/map/`,** as the site's map already is. Times are epoch ms, distances meters, speeds meters a second, and places `GeoPoint`s:
  - `liveFlight.ts`: one flight's live data (types only);
  - `flightPlan.ts`: the schedule's plan, and the plan as the plane flies it (spec §4);
  - `flightPath.ts`: the path, real once the plane has been seen in the air (§6.1);
  - `flightRecord.ts`: where the plane was at any moment, and when it was any distance along (§7.2);
  - `liveLabel.ts` and `liveProgress.ts`: the real plane at one moment: its phase, landing estimate, gap, label, the two planes' places, and the leg's real times (§5, §7.1);
  - `liveWindow.ts`: when to ask (§10.2).
- **The door:** `partner_live` is the partner door's fifth call, `LiveFlightDoor.live`, and joins the door guard's list, which also puts it in the Content-Security-Policy. `src/partner/liveAnswer.ts` reads its answer.
- **One source:** `makeLiveSource` in `src/partner/liveSource.ts` asks once when the page is shown, and every 30 seconds while a flight's window is open. Nothing owns one yet: plan 3C-2 gives it to the status page.
- **The words:** `liveLabelText` and `minutesText` in `src/copy/tripMap.ts`.

**Tech Stack:** Preact 10, TypeScript 5.9 (strict), Vite 5, Vitest 3 (these tests run in the node environment, with fake timers for the 30-second check). No new package.

**Sources (read only):**
- **The spec,** in the Crewluv repo (`~/Dev/Crewluv`, branch `feature/trip-map-live`): `docs/superpowers/specs/2026-11-14-crewluve-moving-map-stage3-live-design.md` ("the spec"), §4 to §7, §10.2, §10.6, §11, §12 and §16.1. Its §12 is the website's part.
- **The app's engine plan,** same repo: `docs/superpowers/plans/2026-11-15-moving-map-stage3b1-app-engine.md`, its list of details it settled, its "What 3B-2, 3B-3 and the website's plan take from this one", and its "After the first real flight". The app's 3B-2 plan changed one thing in the engine that this plan takes from the start: `ask()` shares the call under way.
- **The app's code,** the reference wherever the plans aren't enough, at `9f06e71`: `Crewluv/Services/TripMap/Live/` (`FlightPlan`, `FlightPath`, `FlightRecord`, `LiveProgress`, `LiveLabel`, `LiveWindow`, `LiveFlight`, `LiveFlightSource`), `Crewluv/Services/PartnerCloud/PartnerLiveAnswer.swift` and `LiveFlightDoor.swift`, and `TripMapWording.liveLabel` and `minutesText`.
- **The shared cases,** `CrewluvTests/Fixtures/TripMap/live-cases.json` at `9f06e71`, written by the app's `scripts/live-cases/generate.mjs` from a reference (`live.mjs`) written apart from both. Copied here in Task 2, never edited.
- **Crewlu Cloud's contract:** `~/Dev/Duty/supabase/partner-api.md`, section "The live plane". `partner_live` is live, with its switch on for Todd's own account only.

**This is the first of four plans for the website** (Todd's choice, 15 Nov 2026), each written when it's about to start:
- **3C-1, the engine:** this plan.
- **3C-2, the map:** one landing time, the real path, the real plane and the ghost on Apple's map and on the fallback, the label and "about", the replay, the status page owning the source, and the demo scenes.
- **3C-3, the facts on the real path:** the story along the path, best guesses while the plane is out of sight ("Last seen near … · 2 h ago", "about" before a guessed time), the plane's row, and the credit to adsb.lol.
- **3C-4, the list and the latest event:** newest first, the flight in the air set apart with "In the air now", "Trip so far" once, and the latest event shown large.

**How this plan was checked.** Every code block here comes from a file that was run before the plan was put together. None was typed into the plan by hand: a script built the plan from the tested files.
- **A scratch copy of this repo** at `ee8f0cb`, with this plan's files laid over it.
  - Before: 138 test files and 2,869 tests, all passing.
  - With this plan: 146 test files and 3,208 tests, all passing. `tsc --noEmit` finds nothing, `npm run build` builds, and the built page's Content-Security-Policy lists `partner_live` with the other four.
- **The TypeScript agreed with the shared cases at its first run:** every plan, path, record, moment, label, gap and window of them.
- **Task by task:** the copy was built as it stands after each of Tasks 2 to 7, in order, and type-checked and tested each time. Every one passed: after Task 2, 139 test files and 2,891 tests; after Task 3, 139 and 2,895; after Task 4, 142 and 3,079; after Task 5, 144 and 3,162; after Task 6, 145 and 3,176; and after Task 7, 146 and 3,208.
- **77 deliberate breaks** were made in the new code, one at a time, and each fails at least one test. Among them is one for each of the review's fixes (below). Four first tries changed nothing a test could see, because the code reaches the same answer another way, and were left out: a path's place holds its distance twice over, and a landed flight's last place seen is already its arrival airport. One found a guard with no test (an estimated plane is never put behind the last place it was seen), and it has one now.
- **Reviewed** by `superpowers:code-reviewer` (sonnet) before the plan was put together, against the spec, the app's Swift and Crewlu Cloud's contract: nothing critical. What it found, each now fixed with a test and a deliberate break:
  - **Important:** an answer the source dropped, because the browser had left that connection during the call, left the last connection's flights in place. They go now.
  - **Important:** a new device's ask, made while the last device's call was out, was settled by that call, whose answer was then dropped. The last call is now let finish, and the new device is asked for.
  - A listener that asked while the flights were being forgotten could start a second call at once. The call under way is now kept before it starts.
  - A page that threw when it was told stopped the source taking the rest of its answer. It's now reported (`reportOnce`) and the source goes on.
  - A speed that isn't a number now counts as none, as in the app.
  - Left, with the reason: the reader takes any number where the contract has a range, as the app's does (in "Left for later").
  - **Its second look, after the fixes: ready, with nothing to fix.**
- **The plan itself was followed by a script** on the repo at `ee8f0cb`: it ran the copy command, created each file and made each replacement, in the plan's order, and all 32 files came out the same as the tested ones.
- **Not checked:** nothing ran in a browser, and nothing called Crewlu Cloud or adsb.lol, by design: nothing a family sees uses these files until plan 3C-2. The tests can't reach the network (`tests/setup/noNetwork.ts`).

**Where this plan settles details, or differs from the app.** The app's engine plan's list of settled details holds here too, and the shared cases pin each of them: the gap rounds halves away from zero, a fix exactly 3 minutes old is still live, a block too short for the taxi allowances has none, a leg that goes nowhere flies at 280 kt, a flight in the air with no trail point yet has a real path from its fix, the takeoff is the first place seen within 30 nm, a landing more than 10 minutes after the last place seen ends the path unseen, a landed flight's touchdown is its record's, the trail is sorted by time with two points of one time in the order they came, an unknown state reads as `waiting`, and a gap is held to a year either way. What's the website's own:
- **`LiveFlightDoor` is apart from `PartnerDoor`,** as the app has it. The app split them so its alert helper needn't build the live plane. Here it means the in-memory door the tests share (`fakeDoor` in `tests/fixtures/partner.ts`) and every other door made for the first four calls needn't answer `live`. `makeDoor` and `liveDoor` give both.
- **The door's `lon` is read as `lng`,** so a fix and a trail point carry a `GeoPoint` the map's code already takes.
- **The answer is read as strictly as the app decodes it.** A field of the wrong kind anywhere makes the whole answer unreadable, and the door throws `DoorUnavailable`, as it does for `partner_view`. A field the door may leave out reads as `null` when it's missing. A state this site doesn't know reads as `waiting`.
- **The answer's `trail_count` isn't kept on the flights.** It's only for the check that a trail adds up.
- **The source keeps the connection, not only the key.** The site's store holds a device's key and its partner, and a refresh can move a key to another partner (`src/partner/refresh.ts`). So an answer is dropped when either has changed during the call, and another connection's flights are forgotten before the next call.
- **With no device, the source forgets its flights and asks nothing.** It's the app's branch for a device that isn't on Crewlu Cloud: the website is never on iCloud.
- **`pageShown()` and `pageHidden()`** are the app's `screenCameToFront()` and `screenLeftFront()`. Plan 3C-2's page calls them as `visibilitychange` fires, as `useSchedule` already polls only while the page is visible. Showing the page twice leaves one check, started again from that moment.
- **`ask()` shares the call under way** from the start, as the app's plan 3B-2 made it: a second caller settles with the first one's answer, and a call the 30-second check made still brings its answer after the page is hidden. One call is made at a time: a call for another connection is let finish, and then the new one is asked for.
- **An answer for a connection this browser has left during the call is dropped, and everything the source holds goes with it.** The app keeps its last flights until its next ask, which here might not come before the next flight's window opens.
- **A page that throws when it's told** (a listener, or `onSharingEnded`) is reported with `reportOnce`, and the source goes on.
- **`subscribe(listener)`** tells the page the flights changed, where the app has Observation. It's told only when the flights differ, and the clock's offset is set before it's told, so a listener that reads the time reads the new one.
- **`minutesText` moves out of `landingCountdown`,** which now uses it, as the app's countdown does. Its words don't change.
- **Halves away from zero:** JavaScript's `Math.round` rounds a half up, so the gap rounds its size and puts the sign back. A gap of under half a minute behind is 0, never -0.
- **The record's functions are `recordDistanceAt`, `recordPositionAt` and `recordTimeAt`,** since `src/map/tripMap.ts` already has a `positionAt`.
- **The source's file is `src/partner/liveSource.ts`.** The spec's §12 calls it `live.ts`.

**Questions for Todd:** none for this plan. Two were asked and answered on 15 Nov 2026: four plans, not three; and the session runs the tests while it works, and Todd runs them at each checkpoint.

---

## Ground rules for whoever runs this plan

These come from Todd's standing instructions. They override the skill's defaults.

1. **Work only in this worktree:** `/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046`, on its branch `claude/trip-map-live-598046`, made from `main` at `ee8f0cb`.
   - Never edit the main checkout, `/Users/toddanderson/Dev/Crewluve Website`: its untracked plan file isn't this work's.
   - `~/Dev/Crewluv` is shared with other sessions. Only read it: change, stash, reset or switch nothing there. Task 2's copy reads a commit with `git show`, which changes nothing.
2. **Never commit without Todd's yes in the conversation,** and then only the task's own files, by path. **Never push:** a push to `main` publishes the live site.
3. **The tests:** the session runs them as it works (`npx vitest run <files>`, `npm test`, `npm run build`). At each batch's checkpoint, Todd runs the batch's command himself (his choice, 15 Nov 2026). Don't change files while he's running them, and don't ask for a run until the files are final.
4. **The shared cases are the judge.** Copy `live-cases.json` as it is, never edit it. If a case fails, the code is wrong. If you believe a case is wrong, STOP and tell Todd: the app runs the same file, and both change together or not at all.
5. **Copy the code as written.** It was run as it stands. A replacement is exact: its text is in the file once. If it isn't, stop: the file has changed since this plan was written.
6. **Nothing here calls Crewlu Cloud or adsb.lol.** Every test uses a stand-in, and the tests can't reach the network. Change nothing in Crewlu Cloud's live Supabase project, and don't read it.
7. **Unchanged:** every request to Crewlu Cloud still goes through the door and its guard (`tests/data/doorRules.test.ts` and `doorRulesScan.test.ts` must pass), no `innerHTML`, no download, no `npm install`.
8. **Reviewers:** dispatch `superpowers:code-reviewer` with `model: "sonnet"`.
9. **No release note.** Nothing here changes what families see.

## File map

| File | Status | Responsibility |
|---|---|---|
| `tests/fixtures/trip-map/live-cases.json` | copy | the shared cases, from the app at `9f06e71` |
| `README.md` | modify | names `live-cases.json` among the copies of the app's files |
| `src/map/greatCircle.ts` | modify | `METERS_PER_NM` |
| `src/map/liveFlight.ts` | create | one flight's live data |
| `src/partner/liveAnswer.ts` | create | reading `partner_live`'s answer |
| `src/partner/door.ts` | modify | `LiveFlightDoor`, and the door's `live` call |
| `src/partner/doorGuard.ts` | modify | `partner_live` joins `DOOR_RPCS`, and so the CSP |
| `src/cloud.ts`, `vite.config.ts` | modify | comments: five calls, not four |
| `src/map/flightPlan.ts` | create | the schedule's plan, and the plan as the plane flies it |
| `src/map/flightPath.ts` | create | the path, its stretches, its own speed, and the place any distance along it |
| `src/map/flightRecord.ts` | create | where the plane was when, and when it was where |
| `src/map/liveLabel.ts` | create | ahead of the schedule or behind it |
| `src/map/liveProgress.ts` | create | the real plane at one moment |
| `src/copy/tripMap.ts` | modify | `minutesText`, `liveLabelText` |
| `src/map/liveWindow.ts` | create | when to ask |
| `src/partner/liveSource.ts` | create | asks, and keeps each flight |
| `tests/map/liveCases.ts` | create | reads the shared cases, and makes a case's plan, path and record |
| `tests/partner/liveAnswer.test.ts` | create | the answer read, and refused |
| `tests/partner/door.test.ts`, `doorGuard.test.ts`, `tests/viteConfig.test.ts` | modify | the fifth call, on the guard's list and in the CSP |
| `tests/fixtures/sourceScan.ts`, `tests/data/doorRules.test.ts`, `doorRulesScan.test.ts` | modify | comments: five calls, not four |
| `tests/map/flightPlan.test.ts`, `flightPath.test.ts`, `flightRecord.test.ts`, `liveLabel.test.ts`, `liveProgress.test.ts`, `liveWindow.test.ts` | create | one file per piece, each running its shared cases |
| `tests/partner/liveSource.test.ts` | create | when it asks, the trail, sharing ended, the clock, the check |

## Batches

Review with `superpowers:code-reviewer` (sonnet) after each batch, then Todd runs that batch's command, then ask to commit:

- **A, the cases and the door:** Tasks 2 and 3.
- **B, the maths:** Tasks 4 to 6.
- **C, the source:** Task 7.

Then Task 8: the review of the whole branch, and this plan's record.

---

### Task 1: Before starting

- [x] **Step 1: Check the worktree, the branch and the app's commit.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git status --short && git branch --show-current && git log --oneline -1 && git -C ~/Dev/Crewluv cat-file -t 9f06e71
```

Expected: only this plan's file is new (`?? docs/superpowers/plans/2026-11-15-moving-map-stage3c1-website-engine.md`), the branch is `claude/trip-map-live-598046`, the last commit is `ee8f0cb` or later, and the last line is `commit`. If anything this plan changes has changed since `ee8f0cb` (`git diff --stat ee8f0cb -- src tests vite.config.ts README.md`), read it before going on.

- [x] **Step 2: Run every test once.**

```bash
npm test
```

Expected: 138 test files and 2,869 tests pass. That's the count to add to.

---

### Task 2: The shared cases, and reading the door's answer

**Files:**
- Copy: `tests/fixtures/trip-map/live-cases.json`
- Modify: `README.md`, `src/map/greatCircle.ts`
- Create: `src/map/liveFlight.ts`, `src/partner/liveAnswer.ts`, `tests/map/liveCases.ts`
- Test: `tests/partner/liveAnswer.test.ts`

- [x] **Step 1: Copy the shared cases from the app's commit, and name them in the README.**

```bash
git -C ~/Dev/Crewluv show 9f06e71:CrewluvTests/Fixtures/TripMap/live-cases.json > tests/fixtures/trip-map/live-cases.json
shasum -a 256 tests/fixtures/trip-map/live-cases.json
```

Expected checksum: `1861b4c9ad21c8ee3f299e38d10bf6518ef5e7aa790c27793e909f243dd90e9d`. Don't edit the file.

**In `README.md`, replace:**

```md
`public/data/geography.json` and `public/data/comparisons.json` are copies of the app's, in Crewluv's `Crewluv/Resources/TripMap/`, and `tests/fixtures/trip-map/facts-cases.json`, `replay-cases.json` and `activity-cases.json` are copies of its `CrewluvTests/Fixtures/TripMap/` files of those names. The app makes `geography.json` from Natural Earth (public domain) with `node scripts/build-geography.mjs`. Change each pair together.
```

**with:**

```md
`public/data/geography.json` and `public/data/comparisons.json` are copies of the app's, in Crewluv's `Crewluv/Resources/TripMap/`, and `tests/fixtures/trip-map/facts-cases.json`, `replay-cases.json`, `activity-cases.json` and `live-cases.json` are copies of its `CrewluvTests/Fixtures/TripMap/` files of those names. The app makes `geography.json` from Natural Earth (public domain) with `node scripts/build-geography.mjs`, and `live-cases.json` with `node scripts/live-cases/generate.mjs`. Change each pair together.
```

- [x] **Step 2: The nautical mile, which the cases measure in.**

**In `src/map/greatCircle.ts`, replace:**

```ts
export const METERS_PER_MILE = 1_609.344
```

**with:**

```ts
export const METERS_PER_MILE = 1_609.344

/** One nautical mile, in meters: the unit of the real plane's shared cases (Stage 3 spec §16.1). */
export const METERS_PER_NM = 1_852
```

- [x] **Step 3: Write the reader of the cases, and the failing test of the door's answer.**

The reader turns the cases' ISO times, nautical miles and `[latitude, longitude]` pairs into this site's units, and reads each case's flight with the door's own reader, so the cases test that too. Task 4 adds `made()`, which needs the plan, the path and the record.

**Create `tests/map/liveCases.ts`:**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect } from 'vitest'
import { METERS_PER_NM, type GeoPoint } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { readLiveFlight } from '../../src/partner/liveAnswer'

/**
 * The real plane's shared cases (Stage 3 spec §16.1): tests/fixtures/trip-map/live-cases.json, a copy of the app's
 * CrewluvTests/Fixtures/TripMap/live-cases.json, which its scripts/live-cases/generate.mjs writes. Copy it, never edit
 * it: the app runs the same file. Distances are nautical miles, places [latitude, longitude], times ISO 8601, and a
 * `flight` is one entry of partner_live's `flights`, as the door sends it.
 */

export interface LiveCases {
  about: string
  constants: {
    taxiOutMinutes: number
    taxiInMinutes: number
    shortestCruiseMinutes: number
    descentDistanceNm: number
    descentSpeedKt: number
    freshSeconds: number
    airportRadiusNm: number
    onScheduleMinutes: number
    unseenGapMinutes: number
    firstPointRadiusNm: number
    ownSpeedLeastMinutes: number
    ownSpeedLeastShare: number
    ownSpeedMostShare: number
    windowOpensMinutesBefore: number
    windowClosesHoursAfter: number
    windowKeepsMinutes: number
    windowEndsHoursAfter: number
  }
  airports: Record<string, [number, number]>
  plans: {
    name: string
    note: string
    from: string
    to: string
    departure: string
    arrival: string
    lengthNm: number
    takeoff: string
    touchdown: string
    isShort: boolean
    speedKt: number
    timeToFly: { distanceNm: number; seconds: number }[]
    distanceLeft: { minutes: number; distanceNm: number }[]
  }[]
  flights: CaseFlight[]
  labels: { phase: string; gapMinutes: number | null; label: string | null }[]
  gaps: { aheadSeconds: number; gapMinutes: number }[]
  windows: { name: string; departure: string; arrival: string; at: string; flight: unknown; isOpen: boolean }[]
}

export interface CaseFlight {
  name: string
  note: string
  from: string
  to: string
  departure: string
  arrival: string
  /** One entry of partner_live's `flights`, or null where the door answers none for the leg. */
  flight: unknown
  path: {
    isReal: boolean
    lengthNm: number
    flownNm: number
    ownSpeedKt: number | null
    stretchKinds: string[]
    seenNm: number
    unseenNm: number
    plannedNm: number
  }
  /** The speed the estimate, the estimated plane and the ghost fly before the descent. */
  flownSpeedKt: number
  moments: {
    at: string
    note: string
    phase: string
    touchdown: string | null
    liveArrival: string | null
    gapMinutes: number | null
    label: string | null
    planeAlongNm: number | null
    plane: [number, number] | null
    ghostAlongNm: number | null
    ghost: [number, number] | null
    start: string
    end: string
  }[]
  record: {
    takeoff: string | null
    touchdown: string
    places: { at: string; alongNm: number; point: [number, number] }[]
    times: { alongNm: number; at: string }[]
  } | null
}

export const LIVE_CASES: LiveCases = JSON.parse(readFileSync(join(import.meta.dirname, '../fixtures/trip-map/live-cases.json'), 'utf8'))

/** An ISO time as epoch ms. */
export const at = (iso: string) => Date.parse(iso)
/** Meters as nautical miles. */
export const nm = (meters: number) => meters / METERS_PER_NM
/** Meters a second as knots. */
export const knots = (metersPerSecond: number) => (metersPerSecond * 3600) / METERS_PER_NM

export function airport(code: string): GeoPoint {
  const place = LIVE_CASES.airports[code]
  if (!place) throw new Error(`The cases have no airport ${code}`)
  return { lat: place[0], lng: place[1] }
}

/** A case's flight as this site reads it from the door, or null where there's none. */
export function caseFlight(raw: unknown): LiveFlight | null {
  if (raw == null) return null
  const flight = readLiveFlight(raw)
  if (!flight) throw new Error('The door reader refused a flight of the shared cases')
  return flight
}

/** The cases' own tolerances (their `about`): 0.01 nm, 0.05 s, 0.0001 of a degree, 0.01 kt. */
export const NEAR = { nm: 0.01, ms: 50, degrees: 0.0001, kt: 0.01 }

/** `actual` within `tolerance` of `expected`, saying what was compared when it isn't. */
export function expectNear(actual: number, expected: number, tolerance: number, what: string) {
  expect(Math.abs(actual - expected), `${what}: ${actual}, expected ${expected}`).toBeLessThanOrEqual(tolerance)
}

/** Both null, or both there and within `tolerance`. */
export function expectNearOrNull(actual: number | null, expected: number | null, tolerance: number, what: string) {
  expect(actual == null, `${what}: ${actual}, expected ${expected}`).toBe(expected == null)
  if (actual != null && expected != null) expectNear(actual, expected, tolerance, what)
}

/** A place within 0.0001 of a degree, or both null. */
export function expectPlace(actual: GeoPoint | null, expected: [number, number] | null, what: string) {
  expect(actual == null, `${what}: ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`).toBe(expected == null)
  if (!actual || !expected) return
  expectNear(actual.lat, expected[0], NEAR.degrees, `${what}, latitude`)
  expectNear(actual.lng, expected[1], NEAR.degrees, `${what}, longitude`)
}
```

**Create `tests/partner/liveAnswer.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { readLiveAnswer, readLiveFlight } from '../../src/partner/liveAnswer'
import { LIVE_CASES } from '../map/liveCases'

const FIX = {
  lat: 39.64,
  lon: -80.38,
  altitude_ft: 35_000,
  ground_speed_kt: 430,
  track_deg: 80,
  on_ground: false,
  registration: 'N370UP',
  type_code: 'B763',
  seen_at: 1_794_573_700_000,
}

const FLIGHT = {
  leg_id: 'leg-phl',
  callsign: 'UPS1234',
  state: 'airborne',
  fix: FIX,
  landed_at: null,
  trail: [[1_794_571_500_000, 38.19, -85.67, 2000], [1_794_571_620_000, 38.28, -85.39, null]],
  trail_count: 2,
}

const answer = (flights: unknown[]) => ({ now: 1_794_573_710_000, cursor: 41, flights })

describe("reading partner_live's answer (partner-api.md, \"The live plane\")", () => {
  it('reads the clock, the cursor and each flight, with places as the map has them', () => {
    expect(readLiveAnswer(answer([FLIGHT]))).toEqual({
      now: 1_794_573_710_000,
      cursor: 41,
      flights: [
        {
          legId: 'leg-phl',
          callsign: 'UPS1234',
          state: 'airborne',
          fix: {
            place: { lat: 39.64, lng: -80.38 },
            altitudeFt: 35_000,
            groundSpeedKt: 430,
            trackDeg: 80,
            onGround: false,
            registration: 'N370UP',
            typeCode: 'B763',
            seenAt: 1_794_573_700_000,
          },
          landedAt: null,
          trail: [
            { time: 1_794_571_500_000, place: { lat: 38.19, lng: -85.67 }, altitudeFt: 2000 },
            { time: 1_794_571_620_000, place: { lat: 38.28, lng: -85.39 }, altitudeFt: null },
          ],
          trailCount: 2,
        },
      ],
    })
  })

  it('reads a landed flight, with its landing time and a fix on the ground', () => {
    const landed = { ...FLIGHT, state: 'landed', landed_at: 1_794_580_000_000, fix: { ...FIX, on_ground: true, altitude_ft: null, track_deg: null } }
    expect(readLiveFlight(landed)).toMatchObject({ state: 'landed', landedAt: 1_794_580_000_000, fix: { onGround: true, altitudeFt: null, trackDeg: null } })
  })

  it('reads a flight never seen, with no fix', () => {
    expect(readLiveFlight({ ...FLIGHT, state: 'waiting', fix: null, trail: [], trail_count: 0 })).toMatchObject({ state: 'waiting', fix: null, trail: [] })
  })

  it("reads a state this site doesn't know as waiting, so the schedule's plane shows", () => {
    expect(readLiveFlight({ ...FLIGHT, state: 'taxiing' })?.state).toBe('waiting')
  })

  it('takes the fields the door may leave out as null, and a point with no altitude', () => {
    const { altitude_ft: _a, ground_speed_kt: _g, track_deg: _t, registration: _r, type_code: _c, ...bare } = FIX
    const { landed_at: _l, ...noLanding } = FLIGHT
    expect(readLiveFlight({ ...noLanding, fix: bare, trail: [[1, 2, 3]] })).toMatchObject({
      landedAt: null,
      fix: { altitudeFt: null, groundSpeedKt: null, trackDeg: null, registration: null, typeCode: null },
      trail: [{ time: 1, place: { lat: 2, lng: 3 }, altitudeFt: null }],
    })
  })

  it('reads every flight of the shared cases', () => {
    const flights = [...LIVE_CASES.flights.map((c) => c.flight), ...LIVE_CASES.windows.map((w) => w.flight)].filter((f) => f != null)
    expect(flights.length).toBeGreaterThan(0)
    for (const flight of flights) expect(readLiveFlight(flight)).not.toBeNull()
  })

  it.each([
    ['no clock', { cursor: 1, flights: [] }],
    ['a cursor that is no whole number', { now: 1, cursor: 1.5, flights: [] }],
    ['flights that are no list', { now: 1, cursor: 1, flights: {} }],
    ['a flight with no leg id', answer([{ ...FLIGHT, leg_id: undefined }])],
    ['a state that is no text', answer([{ ...FLIGHT, state: 3 }])],
    ['a trail count that is no whole number', answer([{ ...FLIGHT, trail_count: '2' }])],
    ['a fix with no time', answer([{ ...FLIGHT, fix: { ...FIX, seen_at: null } }])],
    ['a fix with an altitude that is text', answer([{ ...FLIGHT, fix: { ...FIX, altitude_ft: '35000' } }])],
    ['a fix that does not say whether it is on the ground', answer([{ ...FLIGHT, fix: { ...FIX, on_ground: 'no' } }])],
    ['a fix that is a list', answer([{ ...FLIGHT, fix: [1, 2] }])],
    ['a landing time that is text', answer([{ ...FLIGHT, landed_at: 'soon' }])],
    ['a trail point with no longitude', answer([{ ...FLIGHT, trail: [[1, 2]] }])],
    ['a trail point that is no list', answer([{ ...FLIGHT, trail: [{ time: 1 }] }])],
    ['a flight that is no object', answer(['UPS1234'])],
  ])("can't be read with %s", (_name, body) => {
    expect(readLiveAnswer(body as Record<string, unknown>)).toBeNull()
  })
})
```

- [x] **Step 4: Run it to see it fail.**

```bash
npx vitest run tests/partner/liveAnswer.test.ts
```

Expected: FAIL: `src/partner/liveAnswer.ts` doesn't exist yet.

- [x] **Step 5: The flight's types, and the reader.**

**Create `src/map/liveFlight.ts`:**

```ts
import type { GeoPoint } from './greatCircle'

/**
 * One flight's live data, as Crewlu Cloud keeps it from adsb.lol (Stage 3 spec §10.5, §10.6), as the app's LiveFlight:
 * its state, the last place it was seen, and the path it flew. Every time is epoch ms, by Crewlu Cloud's clock.
 */

/**
 * - waiting: watched, and never seen;
 * - ground: on the ground, at the departure airport or somewhere else after a diversion;
 * - airborne: in the air;
 * - landed: seen on the ground at the arrival airport, after being in the air.
 */
export type LiveState = 'waiting' | 'ground' | 'airborne' | 'landed'

/** The last place the aircraft was seen. */
export interface LiveFix {
  place: GeoPoint
  /** Null on the ground. */
  altitudeFt: number | null
  groundSpeedKt: number | null
  /** 0 to 360, or null when the aircraft sent none. */
  trackDeg: number | null
  onGround: boolean
  registration: string | null
  /** The aircraft's ICAO type code, like "B763". */
  typeCode: string | null
  seenAt: number
}

/** One point of the path flown: about one every 2 minutes while the flight is seen in the air. */
export interface TrailPoint {
  time: number
  place: GeoPoint
  altitudeFt: number | null
}

export interface LiveFlight {
  /** The id of the flight's leg in the pilot's summary. */
  legId: string
  callsign: string
  state: LiveState
  /** Null before the flight is first seen. */
  fix: LiveFix | null
  /** When it was first seen on the ground at the arrival airport. */
  landedAt: number | null
  /**
   * Every point of the path flown, in the order Crewlu Cloud sent them, which isn't always the order of their times:
   * makeFlightPath sorts them.
   */
  trail: TrailPoint[]
}
```

**Create `src/partner/liveAnswer.ts`:**

```ts
import type { LiveFix, LiveFlight, LiveState, TrailPoint } from '../map/liveFlight'

/**
 * partner_live's answer, as Crewlu Cloud writes it (~/Dev/Duty/supabase/partner-api.md, "The live plane"), read as the
 * app's PartnerLiveAnswer reads it. Every time in it is ms since 1970, unlike the summary's seconds. Nothing is
 * trusted: a field of the wrong kind makes the whole answer unreadable, as one the app can't decode does there.
 */

/** One of partner_live's flights. Its trail is the points after the cursor the call sent, or every point without one. */
export interface AnsweredFlight extends LiveFlight {
  /** How many points the flight has in all. */
  trailCount: number
}

export interface LiveAnswer {
  /** Crewlu Cloud's clock when it answered. */
  now: number
  /** Sent back with the next call, so only the points after these come. */
  cursor: number
  flights: AnsweredFlight[]
}

const STATES: ReadonlySet<string> = new Set<LiveState>(['waiting', 'ground', 'airborne', 'landed'])

/** Thrown by the readers below at the first part of an answer that can't be read. */
class Unreadable extends Error {}

const unreadable = (): never => {
  throw new Unreadable()
}
const readNumber = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : unreadable())
const readInteger = (value: unknown): number => (typeof value === 'number' && Number.isInteger(value) ? value : unreadable())
const readText = (value: unknown): string => (typeof value === 'string' ? value : unreadable())
const readFlag = (value: unknown): boolean => (typeof value === 'boolean' ? value : unreadable())
const readList = (value: unknown): unknown[] => (Array.isArray(value) ? value : unreadable())
const readObject = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : unreadable()
/** A field the door may leave out or send as null. */
const optional = <T>(value: unknown, read: (value: unknown) => T): T | null => (value == null ? null : read(value))

/** What `read` makes, or null when it meets a part it can't read. */
function reading<T>(read: () => T): T | null {
  try {
    return read()
  } catch (error) {
    if (error instanceof Unreadable) return null
    throw error
  }
}

/** The whole answer, or null when any part of it can't be read. */
export const readLiveAnswer = (answer: Record<string, unknown>): LiveAnswer | null =>
  reading(() => ({ now: readNumber(answer.now), cursor: readInteger(answer.cursor), flights: readList(answer.flights).map(flight) }))

/** One entry of an answer's `flights`, or null when it can't be read. */
export const readLiveFlight = (value: unknown): AnsweredFlight | null => reading(() => flight(value))

function flight(value: unknown): AnsweredFlight {
  const entry = readObject(value)
  const state = readText(entry.state)
  return {
    legId: readText(entry.leg_id),
    callsign: readText(entry.callsign),
    // A state this site doesn't know is one it can't draw: the schedule's plane shows.
    state: STATES.has(state) ? (state as LiveState) : 'waiting',
    fix: optional(entry.fix, fix),
    landedAt: optional(entry.landed_at, readNumber),
    trail: readList(entry.trail).map(trailPoint),
    trailCount: readInteger(entry.trail_count),
  }
}

function fix(value: unknown): LiveFix {
  const entry = readObject(value)
  return {
    place: { lat: readNumber(entry.lat), lng: readNumber(entry.lon) },
    altitudeFt: optional(entry.altitude_ft, readNumber),
    groundSpeedKt: optional(entry.ground_speed_kt, readNumber),
    trackDeg: optional(entry.track_deg, readNumber),
    onGround: readFlag(entry.on_ground),
    registration: optional(entry.registration, readText),
    typeCode: optional(entry.type_code, readText),
    seenAt: readNumber(entry.seen_at),
  }
}

/** `[time, latitude, longitude, altitude in feet]`, the altitude null, or left out, when adsb.lol sent none. */
function trailPoint(value: unknown): TrailPoint {
  const [time, lat, lng, altitude] = readList(value)
  return { time: readNumber(time), place: { lat: readNumber(lat), lng: readNumber(lng) }, altitudeFt: optional(altitude, readNumber) }
}
```

- [x] **Step 6: Run it to see it pass, then type-check.**

```bash
npx vitest run tests/partner/liveAnswer.test.ts && npx tsc --noEmit
```

Expected: 20 tests pass, and `tsc` prints nothing.

- [x] **Step 7: Commit, on Todd's yes (after batch A's checkpoint).**

```bash
git add tests/fixtures/trip-map/live-cases.json README.md src/map/greatCircle.ts src/map/liveFlight.ts src/partner/liveAnswer.ts tests/map/liveCases.ts tests/partner/liveAnswer.test.ts
git commit -m "The real plane's shared cases, copied from the app, and the reader of partner_live's answer (Stage 3 spec §10.6, §16.1)"
```

---

### Task 3: The door's fifth call: `partner_live`

**Files:**
- Modify: `src/partner/door.ts`, `src/partner/doorGuard.ts`, `src/cloud.ts`, `vite.config.ts`
- Test: `tests/partner/door.test.ts`, `tests/partner/doorGuard.test.ts`, `tests/viteConfig.test.ts`
- Comments only: `tests/fixtures/sourceScan.ts`, `tests/data/doorRules.test.ts`, `tests/data/doorRulesScan.test.ts`

- [x] **Step 1: Write the failing tests: the call, its answers, the guard's list and the CSP.**

`callEach` gains the fifth call, so the tests that every call has a time limit and goes through the guard cover it too.

**In `tests/partner/door.test.ts`, replace (1 of 5):**

```ts
/** One answer all four calls can read: a device and a partner (join, redeem), no summary yet (view), and ok (leave). */
const EVERY_CALL_READS = { device_id: 'd1', partner_id: PARTNER_A, updated_at: null, status: null, ok: true }

/** Makes each of the door's four calls once. */
async function callEach(door: ReturnType<typeof makeDoor>) {
  await door.join('invite-a', key(1), '')
  await door.redeem('AB2C3D', key(1), '')
  await door.view(key(1), null)
  await door.leave(key(1))
}
```

**with:**

```ts
/**
 * One answer all five calls can read: a device and a partner (join, redeem), no summary yet (view), ok (leave), and no
 * flights (live).
 */
const EVERY_CALL_READS = { device_id: 'd1', partner_id: PARTNER_A, updated_at: null, status: null, ok: true, now: 0, cursor: 0, flights: [] }

/** Makes each of the door's five calls once. */
async function callEach(door: ReturnType<typeof makeDoor>) {
  await door.join('invite-a', key(1), '')
  await door.redeem('AB2C3D', key(1), '')
  await door.view(key(1), null)
  await door.leave(key(1))
  await door.live(key(1), null)
}
```

**In `tests/partner/door.test.ts`, replace (2 of 5):**

```ts
  it('throws DoorUnavailable for an HTTP error, or an answer it cannot read', async () => {
```

**with:**

```ts
  it('asks partner_live for every point with no cursor, and only for the new ones with one', async () => {
    const first = doorAnswering({ now: 1_794_573_710_000, cursor: 41, flights: [] })
    expect(await first.door.live(key(1), null)).toEqual({ now: 1_794_573_710_000, cursor: 41, flights: [] })
    expect(sent(first.send)).toEqual({
      url: `${SUPABASE_URL}/rest/v1/rpc/partner_live`,
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: { p_key: key(1) },
    })
    const again = doorAnswering({ now: 1_794_573_740_000, cursor: 43, flights: [] })
    await again.door.live(key(1), 41)
    expect(sent(again.send).body).toEqual({ p_key: key(1), p_after: 41 })
  })

  it("reads partner_live's flights, and hands its refusals back as answers", async () => {
    const flight = { leg_id: 'leg-1', callsign: 'UPS207', state: 'waiting', fix: null, landed_at: null, trail: [], trail_count: 0 }
    const answer = await doorAnswering({ now: 5, cursor: 0, flights: [flight] }).door.live(key(1), null)
    expect(answer).toEqual({
      now: 5,
      cursor: 0,
      flights: [{ legId: 'leg-1', callsign: 'UPS207', state: 'waiting', fix: null, landedAt: null, trail: [], trailCount: 0 }],
    })
    expect(await doorAnswering({ error: 'sharing_ended' }).door.live(key(1), null)).toEqual({ error: 'sharing_ended' })
  })

  it('throws DoorUnavailable for a partner_live answer it cannot read', async () => {
    const flight = { leg_id: 'leg-1', callsign: 'UPS207', state: 'airborne', fix: null, landed_at: null, trail: [], trail_count: 0 }
    const fix = { lat: 40, lon: -80, altitude_ft: 35_000, ground_speed_kt: 450, track_deg: 80, on_ground: false, registration: null, type_code: null, seen_at: 5 }
    for (const body of [
      { now: 5, cursor: 0 },
      { now: 5, cursor: '0', flights: [] },
      { now: 5, cursor: 0, flights: [{ leg_id: 'leg-1' }] },
      { now: 5, cursor: 0, flights: [{ ...flight, fix: { ...fix, lat: '40' } }] },
      { now: 5, cursor: 0, flights: [{ ...flight, fix: { ...fix, on_ground: 'no' } }] },
      { now: 5, cursor: 0, flights: [{ ...flight, trail: [[5, 40]], trail_count: 1 }] },
    ]) {
      await expect(doorAnswering(body).door.live(key(1), null), JSON.stringify(body)).rejects.toThrow(DoorUnavailable)
    }
    await expect(doorAnswering({ now: 5, cursor: 0, flights: [] }, 500).door.live(key(1), null)).rejects.toThrow(DoorUnavailable)
  })

  it('throws DoorUnavailable for an HTTP error, or an answer it cannot read', async () => {
```

**In `tests/partner/door.test.ts`, replace (3 of 5):**

```ts
    expect(send).toHaveBeenCalledTimes(4)
    for (const [, init] of send.mock.calls) expect(init?.signal).toBeInstanceOf(AbortSignal)
```

**with:**

```ts
    expect(send).toHaveBeenCalledTimes(5)
    for (const [, init] of send.mock.calls) expect(init?.signal).toBeInstanceOf(AbortSignal)
```

**In `tests/partner/door.test.ts`, replace (4 of 5):**

```ts
      expect(timeout).toHaveBeenCalledTimes(4)
```

**with:**

```ts
      expect(timeout).toHaveBeenCalledTimes(5)
```

**In `tests/partner/door.test.ts`, replace (5 of 5):**

```ts
    expect(guarded).toHaveBeenCalledTimes(4) // each of the four went through the guard...
    expect(send).toHaveBeenCalledTimes(4) // ...and reached the fetch once, by way of it
```

**with:**

```ts
    expect(guarded).toHaveBeenCalledTimes(5) // each of the five went through the guard...
    expect(send).toHaveBeenCalledTimes(5) // ...and reached the fetch once, by way of it
```

**In `tests/partner/doorGuard.test.ts`, replace (1 of 4):**

```ts
/** Everything but a POST to one of the four, by the way it would reach past the partner door. */
```

**with:**

```ts
/** Everything but a POST to one of the five, by the way it would reach past the partner door. */
```

**In `tests/partner/doorGuard.test.ts`, replace (2 of 4):**

```ts
  // one of the four, but not as a POST
```

**with:**

```ts
  // one of the five, but not as a POST
```

**In `tests/partner/doorGuard.test.ts`, replace (3 of 4):**

```ts
  // close to one of the four
```

**with:**

```ts
  // close to one of the five
```

**In `tests/partner/doorGuard.test.ts`, replace (4 of 4):**

```ts
  it('has exactly the four partner RPCs', () => {
    expect([...DOOR_RPCS].sort()).toEqual(['partner_handoff_redeem', 'partner_join', 'partner_leave', 'partner_view'])
```

**with:**

```ts
  it('has exactly the five partner RPCs', () => {
    expect([...DOOR_RPCS].sort()).toEqual(['partner_handoff_redeem', 'partner_join', 'partner_leave', 'partner_live', 'partner_view'])
```

**In `tests/viteConfig.test.ts`, replace:**

```ts
  it('lets the page call the four partner RPCs, Open-Meteo for the weather and Apple’s map, and nothing else', () => {
    const rpcs = ['partner_join', 'partner_handoff_redeem', 'partner_view', 'partner_leave'].map((name) => `${SUPABASE_URL}/rest/v1/rpc/${name}`)
```

**with:**

```ts
  it('lets the page call the five partner RPCs, Open-Meteo for the weather and Apple’s map, and nothing else', () => {
    const rpcs = ['partner_join', 'partner_handoff_redeem', 'partner_view', 'partner_leave', 'partner_live'].map((name) => `${SUPABASE_URL}/rest/v1/rpc/${name}`)
```

- [x] **Step 2: Run them to see them fail.**

```bash
npx vitest run tests/partner/door.test.ts tests/partner/doorGuard.test.ts tests/viteConfig.test.ts
```

Expected: FAIL: the door has no `live`, the guard's list has four calls, and the CSP lists four addresses.

- [x] **Step 3: The call, and its place on the guard's list.**

**In `src/partner/door.ts`, replace (1 of 7):**

```ts
import { doorFetch } from './doorGuard'
```

**with:**

```ts
import { doorFetch } from './doorGuard'
import { readLiveAnswer, type LiveAnswer } from './liveAnswer'
```

**In `src/partner/door.ts`, replace (2 of 7):**

```ts
/** The four partner RPCs the website calls (piece 5a §9). It redeems hand-off codes but never makes them (P5-4). */
```

**with:**

```ts
/** Four of the partner RPCs the website calls (piece 5a §9). It redeems hand-off codes but never makes them (P5-4). */
```

**In `src/partner/door.ts`, replace (3 of 7):**

```ts
  leave(key: string): Promise<void>
}
```

**with:**

```ts
  leave(key: string): Promise<void>
}

/**
 * The fifth, partner_live: the pilot's flights with live data (Stage 3 spec §10.6, partner-api.md "The live plane"). It's
 * apart from PartnerDoor, as the app's LiveFlightDoor is, so the doors made for the other four needn't answer it.
 */
export interface LiveFlightDoor {
  /** `after` is the last answer's cursor, so only the trail points since then come, or null for every point. */
  live(key: string, after: number | null): Promise<LiveAnswer | Refused>
}
```

**In `src/partner/door.ts`, replace (4 of 7):**

```ts
export function makeDoor(send: typeof fetch): PartnerDoor {
```

**with:**

```ts
export function makeDoor(send: typeof fetch): PartnerDoor & LiveFlightDoor {
```

**In `src/partner/door.ts`, replace (5 of 7):**

```ts
      // The four RPCs never redirect; refusing one keeps a key from being sent on to another address.
```

**with:**

```ts
      // The five RPCs never redirect; refusing one keeps a key from being sent on to another address.
```

**In `src/partner/door.ts`, replace (6 of 7):**

```ts
    async leave(key) {
      await call('partner_leave', { p_key: key })
    },
  }
}
```

**with:**

```ts
    async leave(key) {
      await call('partner_leave', { p_key: key })
    },
    async live(key, after) {
      const answer = await call('partner_live', after == null ? { p_key: key } : { p_key: key, p_after: after })
      if (isRefused(answer)) return { error: answer.error }
      const read = readLiveAnswer(answer)
      if (!read) throw new DoorUnavailable('partner_live answered with flights it could not read')
      return read
    },
  }
}
```

**In `src/partner/door.ts`, replace (7 of 7):**

```ts
export const liveDoor: PartnerDoor = makeDoor((input, init) => fetch(input, init))
```

**with:**

```ts
export const liveDoor: PartnerDoor & LiveFlightDoor = makeDoor((input, init) => fetch(input, init))
```

**In `src/partner/doorGuard.ts`, replace (1 of 4):**

```ts
 * every Crewlu Cloud request through it. Only POSTs to the four partner RPCs get through, on the Crewlu Cloud
```

**with:**

```ts
 * every Crewlu Cloud request through it. Only POSTs to the five partner RPCs get through, on the Crewlu Cloud
```

**In `src/partner/doorGuard.ts`, replace (2 of 4):**

```ts
/** The four partner RPCs, the only calls the guard lets through. Frozen, so no code can add one. */
export const DOOR_RPCS: readonly string[] = Object.freeze(['partner_join', 'partner_handoff_redeem', 'partner_view', 'partner_leave'])
```

**with:**

```ts
/** The five partner RPCs, the only calls the guard lets through. Frozen, so no code can add one. */
export const DOOR_RPCS: readonly string[] = Object.freeze(['partner_join', 'partner_handoff_redeem', 'partner_view', 'partner_leave', 'partner_live'])
```

**In `src/partner/doorGuard.ts`, replace (3 of 4):**

```ts
    // Refused below: a request that can't be read can't be shown to be one of the four.
```

**with:**

```ts
    // Refused below: a request that can't be read can't be shown to be one of the five.
```

**In `src/partner/doorGuard.ts`, replace (4 of 4):**

```ts
/** Wraps a fetch so that only the four partner RPCs get through; anything else rejects with a DoorGuardError and is never sent. */
```

**with:**

```ts
/** Wraps a fetch so that only the five partner RPCs get through; anything else rejects with a DoorGuardError and is never sent. */
```

- [x] **Step 4: The comments that counted four calls.**

**In `src/cloud.ts`, replace (1 of 2):**

```ts
// supabase/partner-api.md in the Crewlu app's repository). The site calls four of them, all from
```

**with:**

```ts
// supabase/partner-api.md in the Crewlu app's repository). The site calls five of them, all from
```

**In `src/cloud.ts`, replace (2 of 2):**

```ts
// those four, so the door and the CSP can't drift apart.
```

**with:**

```ts
// those five, so the door and the CSP can't drift apart.
```

**In `vite.config.ts`, replace (1 of 5):**

```ts
// The four partner RPC addresses, built from the door guard's own list so the guard and the CSP can't drift apart.
```

**with:**

```ts
// The five partner RPC addresses, built from the door guard's own list so the guard and the CSP can't drift apart.
```

**In `vite.config.ts`, replace (2 of 5):**

```ts
// Vite dev server needs inline scripts and a websocket for hot reload. connect-src lists the four partner RPC
```

**with:**

```ts
// Vite dev server needs inline scripts and a websocket for hot reload. connect-src lists the five partner RPC
```

**In `vite.config.ts`, replace (3 of 5):**

```ts
// browser itself reaches only those four addresses on Crewlu Cloud, even from code that slipped past the source rules
```

**with:**

```ts
// browser itself reaches only those five addresses on Crewlu Cloud, even from code that slipped past the source rules
```

**In `vite.config.ts`, replace (4 of 5):**

```ts
// query, to one of the four, passes the CSP, and only the source rules' address rule stops that. The CSP relies on
```

**with:**

```ts
// query, to one of the five, passes the CSP, and only the source rules' address rule stops that. The CSP relies on
```

**In `vite.config.ts`, replace (5 of 5):**

```ts
// Cloud is still reachable only at the four partner addresses.
```

**with:**

```ts
// Cloud is still reachable only at the five partner addresses.
```

**In `tests/fixtures/sourceScan.ts`, replace (1 of 3):**

```ts
// Static checks over src/ for the partner door guarantee (piece 5a §9): the site reaches Crewlu Cloud only through the
// four partner RPCs.
```

**with:**

```ts
// Static checks over src/ for the partner door guarantee (piece 5a §9): the site reaches Crewlu Cloud only through the
// five partner RPCs.
```

**In `tests/fixtures/sourceScan.ts`, replace (2 of 3):**

```ts
// the network gaps it is connect-src, which allows the site, Open-Meteo and the four partner RPC addresses, so the browser
```

**with:**

```ts
// the network gaps it is connect-src, which allows the site, Open-Meteo and the five partner RPC addresses, so the browser
```

**In `tests/fixtures/sourceScan.ts`, replace (3 of 3):**

```ts
      // src/partner/door.ts passes the page's fetch to the door guard, which lets only the four partner RPCs through.
```

**with:**

```ts
      // src/partner/door.ts passes the page's fetch to the door guard, which lets only the five partner RPCs through.
```

**In `tests/data/doorRules.test.ts`, replace:**

```ts
// guard refusing everything but the four partner RPCs. The rules below stop code from going around the door (a Supabase
```

**with:**

```ts
// guard refusing everything but the five partner RPCs. The rules below stop code from going around the door (a Supabase
```

**In `tests/data/doorRulesScan.test.ts`, replace:**

```ts
// other request, the browser has the CSP's connect-src, which lists only the four RPC addresses (tests/viteConfig.test.ts).
```

**with:**

```ts
// other request, the browser has the CSP's connect-src, which lists only the five RPC addresses (tests/viteConfig.test.ts).
```

- [x] **Step 5: Run them to see them pass, with the door's source rules, then type-check.**

```bash
npx vitest run tests/partner tests/viteConfig.test.ts tests/data && npx tsc --noEmit
```

Expected: 706 tests pass, and `tsc` prints nothing.

- [x] **Step 6: Batch A's review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Tasks 2 and 3 against the spec's §10.6 and partner-api.md's "The live plane". Make its fixes, rerun Step 5, and record what it found under "Changes made during execution".

- [x] **Step 7: Batch A's checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npx vitest run tests/partner tests/viteConfig.test.ts tests/data
```

Expected: 706 tests pass.

- [x] **Step 8: Commit, on Todd's yes.** Task 2's commit, then:

```bash
git add src/partner/door.ts src/partner/doorGuard.ts src/cloud.ts vite.config.ts tests/partner/door.test.ts tests/partner/doorGuard.test.ts tests/viteConfig.test.ts tests/fixtures/sourceScan.ts tests/data/doorRules.test.ts tests/data/doorRulesScan.test.ts
git commit -m "partner_live is the partner door's fifth call, on the door guard's list and so in the Content-Security-Policy, with nothing calling it yet (Stage 3 spec §10.6, §12, §14)"
```

---

### Task 4: The plan, the path and the record

They go together: the plan as the plane flies it reads the path's own speed, and the record is the path flown against the plan.

**Files:**
- Create: `src/map/flightPlan.ts`, `src/map/flightPath.ts`, `src/map/flightRecord.ts`
- Modify: `tests/map/liveCases.ts`
- Test: `tests/map/flightPlan.test.ts`, `tests/map/flightPath.test.ts`, `tests/map/flightRecord.test.ts`

- [x] **Step 1: Give the cases' reader `made()`: a case's plan, path and record, made together as the map will make them.**

**In `tests/map/liveCases.ts`, replace (1 of 2):**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect } from 'vitest'
import { METERS_PER_NM, type GeoPoint } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { readLiveFlight } from '../../src/partner/liveAnswer'
```

**with:**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect } from 'vitest'
import { makeFlightPath, type FlightPath } from '../../src/map/flightPath'
import { makeFlightPlan, type FlightPlan } from '../../src/map/flightPlan'
import { makeFlightRecord, type FlightRecord } from '../../src/map/flightRecord'
import { distanceMeters, METERS_PER_NM, type GeoPoint } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { readLiveFlight } from '../../src/partner/liveAnswer'
```

**In `tests/map/liveCases.ts`, replace (2 of 2):**

```ts
  return flight
}

/** The cases' own tolerances (their `about`): 0.01 nm, 0.05 s, 0.0001 of a degree, 0.01 kt. */
```

**with:**

```ts
  return flight
}

/** A flight case as this site's types: its plan, its live data, and the path and record made from them. */
export function made(flightCase: CaseFlight): { plan: FlightPlan; flight: LiveFlight | null; path: FlightPath; record: FlightRecord | null } {
  const origin = airport(flightCase.from)
  const destination = airport(flightCase.to)
  const plan = makeFlightPlan(at(flightCase.departure), at(flightCase.arrival), distanceMeters(origin, destination))
  if (!plan) throw new Error(`${flightCase.name} has no plan`)
  const flight = caseFlight(flightCase.flight)
  const path = makeFlightPath(origin, destination, flight)
  return { plan, flight, path, record: makeFlightRecord(path, plan) }
}

/** The cases' own tolerances (their `about`): 0.01 nm, 0.05 s, 0.0001 of a degree, 0.01 kt. */
```

- [x] **Step 2: Write the failing tests.**

Each runs its part of the shared cases, then the app's own tests of the same type, case by case.

**Create `tests/map/flightPlan.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { makeFlightPath } from '../../src/map/flightPath'
import {
  DESCENT_DISTANCE, DESCENT_SPEED, distanceLeft, flownPlan, makeFlightPlan, OWN_SPEED_LEAST_SHARE, OWN_SPEED_MOST_SHARE, taxiIn, taxiOut,
  timeInAir, timeToFly,
} from '../../src/map/flightPlan'
import { SHORTEST_CRUISE_MS, TAXI_IN_MS, TAXI_OUT_MS } from '../../src/map/flightProgress'
import { distanceMeters, METERS_PER_NM } from '../../src/map/greatCircle'
import { airport, at, expectNear, knots, LIVE_CASES, made, NEAR, nm } from './liveCases'

const MINUTE = 60_000
const DEPARTURE = Date.UTC(2027, 0, 15, 12)

describe("the schedule's flight plan (Stage 3 spec §4)", () => {
  it("uses the shared cases' constants", () => {
    const c = LIVE_CASES.constants
    expect(TAXI_OUT_MS).toBe(c.taxiOutMinutes * MINUTE)
    expect(TAXI_IN_MS).toBe(c.taxiInMinutes * MINUTE)
    expect(SHORTEST_CRUISE_MS).toBe(c.shortestCruiseMinutes * MINUTE)
    expect(DESCENT_DISTANCE).toBe(c.descentDistanceNm * METERS_PER_NM)
    expect(DESCENT_SPEED).toBeCloseTo((c.descentSpeedKt * METERS_PER_NM) / 3600, 9)
    expect([OWN_SPEED_LEAST_SHARE, OWN_SPEED_MOST_SHARE]).toEqual([c.ownSpeedLeastShare, c.ownSpeedMostShare])
  })

  it.each(LIVE_CASES.plans)('matches the shared case: $name', (c) => {
    const plan = makeFlightPlan(at(c.departure), at(c.arrival), distanceMeters(airport(c.from), airport(c.to)))
    expect(plan).not.toBeNull()
    if (!plan) return
    expectNear(nm(plan.distance), c.lengthNm, NEAR.nm, 'length')
    expectNear(plan.takeoff, at(c.takeoff), NEAR.ms, 'takeoff')
    expectNear(plan.touchdown, at(c.touchdown), NEAR.ms, 'touchdown')
    expect(plan.isSteady).toBe(c.isShort)
    expectNear(knots(plan.speed), c.speedKt, NEAR.kt, 'speed')
    for (const check of c.timeToFly) expectNear(timeToFly(plan, check.distanceNm * METERS_PER_NM), check.seconds * 1000, NEAR.ms, `${check.distanceNm} nm`)
    for (const check of c.distanceLeft) expectNear(nm(distanceLeft(plan, check.minutes * MINUTE)), check.distanceNm, NEAR.nm, `${check.minutes} min`)
  })

  it('flies the whole leg in its time in the air, and distanceLeft is the inverse of timeToFly', () => {
    const plan = makeFlightPlan(DEPARTURE, DEPARTURE + 8 * 60 * MINUTE, 7_000_000)!
    expect(plan.isSteady).toBe(false)
    expect(timeToFly(plan, plan.distance)).toBeCloseTo(timeInAir(plan), 6)
    expect(distanceLeft(plan, timeInAir(plan))).toBeCloseTo(plan.distance, 6)
    for (const distance of [50_000, 222_240, 1_000_000, 7_000_000, 7_500_000]) expect(distanceLeft(plan, timeToFly(plan, distance))).toBeCloseTo(distance, 6)
  })

  it('has both taxi allowances on a long block, and none on one too short for them', () => {
    const long = makeFlightPlan(DEPARTURE, DEPARTURE + 8 * 60 * MINUTE, 7_000_000)!
    expect([taxiOut(long), taxiIn(long), timeInAir(long)]).toEqual([15 * MINUTE, 7 * MINUTE, 8 * 60 * MINUTE - 22 * MINUTE])
    const short = makeFlightPlan(DEPARTURE, DEPARTURE + 30 * MINUTE, 100_000)!
    expect([taxiOut(short), taxiIn(short)]).toEqual([0, 0])
  })

  it('is null for a leg that arrives no later than it leaves', () => {
    expect(makeFlightPlan(DEPARTURE, DEPARTURE, 1_000_000)).toBeNull()
    expect(makeFlightPlan(DEPARTURE, DEPARTURE - MINUTE, 1_000_000)).toBeNull()
  })

  it("gives a leg that goes nowhere the descent's speed", () => {
    const plan = makeFlightPlan(DEPARTURE, DEPARTURE + 60 * MINUTE, 0)!
    expect(plan.isSteady).toBe(true)
    expect(plan.speed).toBe(DESCENT_SPEED)
  })
})

describe("the plan as the plane flies it (Stage 3 spec §4, the plane's own speed)", () => {
  it.each(LIVE_CASES.flights)("flies the shared case's speed and keeps the schedule's times: $name", (c) => {
    const { plan, path } = made(c)
    const flown = flownPlan(plan, path)
    expectNear(knots(flown.speed), c.flownSpeedKt, NEAR.kt, 'flown speed')
    expect({ ...flown, speed: 0 }).toEqual({ ...plan, speed: 0 })
  })

  it('is the plane\'s own speed in some of the shared cases, so the cases test it', () => {
    const own = LIVE_CASES.flights.filter((c) => {
      const { plan, path } = made(c)
      return flownPlan(plan, path).speed !== plan.speed
    })
    expect(own.length).toBeGreaterThan(0)
  })

  it('takes no own speed that isn\'t a number', () => {
    const { plan, path } = made(LIVE_CASES.flights[0])
    expect(flownPlan(plan, { ...path, ownSpeed: NaN })).toBe(plan)
  })

  it('is the plan along a path nobody saw', () => {
    const path = makeFlightPath(airport('SDF'), airport('PHL'))
    const plan = makeFlightPlan(DEPARTURE, DEPARTURE + 105 * MINUTE, path.length)!
    expect(flownPlan(plan, path)).toBe(plan)
  })
})
```

**Create `tests/map/flightPath.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { FIRST_POINT_RADIUS, makeFlightPath, OWN_SPEED_LEAST_MS, pointAtDistance, UNSEEN_GAP_MS, type FlightPath, type StretchKind } from '../../src/map/flightPath'
import { distanceMeters, METERS_PER_NM } from '../../src/map/greatCircle'
import type { LiveFix, LiveFlight, LiveState, TrailPoint } from '../../src/map/liveFlight'
import { airport, expectNear, knots, LIVE_CASES, made, NEAR, nm } from './liveCases'

const MINUTE = 60_000
const START = Date.UTC(2027, 0, 15, 12)
const LOUISVILLE = airport('SDF')
const PHILADELPHIA = airport('PHL')

const point = (minutes: number, lat: number, lng: number): TrailPoint => ({ time: START + minutes * MINUTE, place: { lat, lng }, altitudeFt: 30_000 })

const fix = (minutes: number, lat: number, lng: number, onGround = false): LiveFix => ({
  place: { lat, lng },
  altitudeFt: onGround ? null : 30_000,
  groundSpeedKt: 430,
  trackDeg: 80,
  onGround,
  registration: null,
  typeCode: null,
  seenAt: START + minutes * MINUTE,
})

const flight = (trail: TrailPoint[], more: { state?: LiveState; fix?: LiveFix; landedAt?: number } = {}): LiveFlight => ({
  legId: 'leg',
  callsign: 'UPS1234',
  state: more.state ?? 'airborne',
  fix: more.fix ?? null,
  landedAt: more.landedAt ?? null,
  trail,
})

const kinds = (path: FlightPath) => path.stretches.map((s) => s.kind)
const total = (path: FlightPath, kind: StretchKind) => nm(path.stretches.filter((s) => s.kind === kind).reduce((sum, s) => sum + s.length, 0))

describe('the path (Stage 3 spec §6.1)', () => {
  it("uses the shared cases' constants", () => {
    const c = LIVE_CASES.constants
    expect(UNSEEN_GAP_MS).toBe(c.unseenGapMinutes * MINUTE)
    expect(FIRST_POINT_RADIUS).toBe(c.firstPointRadiusNm * METERS_PER_NM)
    expect(OWN_SPEED_LEAST_MS).toBe(c.ownSpeedLeastMinutes * MINUTE)
  })

  it.each(LIVE_CASES.flights)('matches the shared case: $name', (c) => {
    const { path } = made(c)
    expect(path.isReal).toBe(c.path.isReal)
    expectNear(nm(path.length), c.path.lengthNm, NEAR.nm, 'length')
    expectNear(nm(path.flownLength), c.path.flownNm, NEAR.nm, 'flown')
    expect(kinds(path)).toEqual(c.path.stretchKinds)
    expectNear(total(path, 'seen'), c.path.seenNm, NEAR.nm, 'seen')
    expectNear(total(path, 'unseen'), c.path.unseenNm, NEAR.nm, 'unseen')
    expectNear(total(path, 'planned'), c.path.plannedNm, NEAR.nm, 'planned')
    if (c.path.ownSpeedKt == null) expect(path.ownSpeed).toBeNull()
    else expectNear(knots(path.ownSpeed ?? NaN), c.path.ownSpeedKt, NEAR.kt, 'own speed')
  })

  it('has its own speed in some of the shared cases, so the cases test it', () => {
    expect(LIVE_CASES.flights.filter((c) => c.path.ownSpeedKt != null).length).toBeGreaterThan(0)
  })

  it('is the great circle with no flight', () => {
    const path = makeFlightPath(LOUISVILLE, PHILADELPHIA)
    expect(path.isReal).toBe(false)
    expect(kinds(path)).toEqual(['planned'])
    expect(path.length).toBeCloseTo(distanceMeters(LOUISVILLE, PHILADELPHIA), 6)
    expect([path.flownLength, path.knots]).toEqual([0, []])
  })

  it('has stretches that follow one another, with a knot at the end of each but the way ahead', () => {
    const path = makeFlightPath(LOUISVILLE, PHILADELPHIA, flight([point(0, 38.3, -85.4), point(2, 38.6, -85.0), point(4, 38.9, -84.6)]))
    expect(path.stretches).toHaveLength(4)
    let distance = 0
    for (const stretch of path.stretches) {
      expect(stretch.startDistance).toBeCloseTo(distance, 6)
      distance += stretch.length
    }
    expect(path.length).toBeCloseTo(distance, 6)
    expect(path.knots.map((k) => k.distance)).toEqual(path.stretches.slice(0, -1).map((s) => s.startDistance + s.length))
  })

  it('sorts a trail that came out of order by time', () => {
    const inOrder = [point(0, 38.3, -85.4), point(2, 38.6, -85.0), point(4, 38.9, -84.6)]
    const sorted = makeFlightPath(LOUISVILLE, PHILADELPHIA, flight(inOrder))
    const shuffled = makeFlightPath(LOUISVILLE, PHILADELPHIA, flight([inOrder[2], inOrder[0], inOrder[1]]))
    expect(shuffled.knots).toEqual(sorted.knots)
    expect(shuffled.length).toBeCloseTo(sorted.length, 6)
  })

  it('keeps two points of one time in the order they came', () => {
    const trail = [point(4, 38.9, -84.6), point(2, 38.6, -85.0), point(2, 38.7, -84.9), point(0, 38.3, -85.4)]
    const path = makeFlightPath(LOUISVILLE, PHILADELPHIA, flight(trail))
    expect(path.knots).toHaveLength(4)
    expect(path.knots[1].time).toBe(path.knots[2].time)
    expect(pointAtDistance(path, path.knots[1].distance).lat).toBeCloseTo(38.6, 6)
    expect(pointAtDistance(path, path.knots[2].distance).lat).toBeCloseTo(38.7, 6)
  })

  it('takes a fix in the air newer than the trail as the last place seen, and nothing else', () => {
    const trail = [point(0, 38.3, -85.4), point(2, 38.6, -85.0)]
    const newer = makeFlightPath(LOUISVILLE, PHILADELPHIA, flight(trail, { fix: fix(2.5, 38.7, -84.9) }))
    expect(newer.knots).toHaveLength(3)
    expect(newer.knots[2].time).toBe(START + 2.5 * MINUTE)
    expect(kinds(newer)).toEqual(['seen', 'seen', 'seen', 'planned'])
    expect(makeFlightPath(LOUISVILLE, PHILADELPHIA, flight(trail, { fix: fix(2, 38.6, -85.0) })).knots).toHaveLength(2)
    const ground = makeFlightPath(LOUISVILLE, PHILADELPHIA, flight(trail, { state: 'ground', fix: fix(30, 38.18, -85.73, true) }))
    expect(ground.knots).toHaveLength(2)
    expect(kinds(ground)).toEqual(['seen', 'seen', 'planned'])
  })

  it('starts from the fix in the air with no trail yet, and is the great circle on the ground with none', () => {
    const air = makeFlightPath(LOUISVILLE, PHILADELPHIA, flight([], { fix: fix(1, 38.3, -85.4) }))
    expect(air.isReal).toBe(true)
    expect(kinds(air)).toEqual(['seen', 'planned'])
    expect(makeFlightPath(LOUISVILLE, PHILADELPHIA, flight([], { state: 'ground', fix: fix(1, 38.18, -85.73, true) })).isReal).toBe(false)
  })

  it('ends a landed flight at the arrival airport with nothing planned, unseen when it landed over ten minutes after its last point', () => {
    const trail = [point(0, 38.3, -85.4), point(2, 38.6, -85.0)]
    const landed = (landedMinutes: number) =>
      makeFlightPath(LOUISVILLE, PHILADELPHIA, flight(trail, { state: 'landed', fix: fix(40, 39.87, -75.24, true), landedAt: START + landedMinutes * MINUTE }))
    const seen = landed(8)
    expect(seen.hasLanded).toBe(true)
    expect(kinds(seen)).toEqual(['seen', 'seen', 'seen'])
    expect(seen.flownLength).toBe(seen.length)
    expect(seen.knots[seen.knots.length - 1]).toEqual({ time: START + 8 * MINUTE, distance: seen.length })
    expect(kinds(landed(12))).toEqual(['seen', 'seen', 'seen'])
    expect(kinds(landed(13))).toEqual(['seen', 'seen', 'unseen'])
  })

  it('calls points exactly ten minutes apart seen', () => {
    expect(kinds(makeFlightPath(LOUISVILLE, PHILADELPHIA, flight([point(0, 38.3, -85.4), point(10, 39.0, -83.0)])))).toEqual(['seen', 'seen', 'planned'])
  })

  it('has an airport at each end and beyond, and the place seen at a knot', () => {
    const path = makeFlightPath(LOUISVILLE, PHILADELPHIA, flight([point(0, 38.3, -85.4), point(2, 38.6, -85.0)]))
    for (const [distance, place] of [[-10, LOUISVILLE], [0, LOUISVILLE], [path.length, PHILADELPHIA], [path.length + 10, PHILADELPHIA]] as const) {
      expect(pointAtDistance(path, distance).lat).toBeCloseTo(place.lat, 9)
      expect(pointAtDistance(path, distance).lng).toBeCloseTo(place.lng, 9)
    }
    expect(pointAtDistance(path, path.knots[1].distance).lat).toBeCloseTo(38.6, 6)
    expect(pointAtDistance(path, path.knots[1].distance).lng).toBeCloseTo(-85.0, 6)
  })
})
```

**Create `tests/map/flightRecord.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { makeFlightPath } from '../../src/map/flightPath'
import { flownPlan, makeFlightPlan } from '../../src/map/flightPlan'
import { makeFlightRecord, recordDistanceAt, recordPositionAt, recordTimeAt } from '../../src/map/flightRecord'
import { METERS_PER_NM } from '../../src/map/greatCircle'
import { airport, at, expectNear, expectPlace, LIVE_CASES, made, NEAR, nm } from './liveCases'

const MINUTE = 60_000
const withRecords = LIVE_CASES.flights.filter((c) => c.record != null)

describe('the record: where the plane was when (Stage 3 spec §7.2)', () => {
  it('has shared cases with records and without', () => {
    expect(withRecords.length).toBeGreaterThan(0)
    expect(withRecords.length).toBeLessThan(LIVE_CASES.flights.length)
  })

  it.each(LIVE_CASES.flights)('matches the shared case: $name', (c) => {
    const { record } = made(c)
    expect(record == null).toBe(c.record == null)
    if (!record || !c.record) return
    expect(record.takeoff == null).toBe(c.record.takeoff == null)
    if (record.takeoff != null && c.record.takeoff != null) expectNear(record.takeoff, at(c.record.takeoff), NEAR.ms, 'takeoff')
    expectNear(record.touchdown, at(c.record.touchdown), NEAR.ms, 'touchdown')
    for (const place of c.record.places) {
      expectNear(nm(recordDistanceAt(record, at(place.at))), place.alongNm, NEAR.nm, `along at ${place.at}`)
      expectPlace(recordPositionAt(record, at(place.at)), place.point, `place at ${place.at}`)
    }
    for (const time of c.record.times) expectNear(recordTimeAt(record, time.alongNm * METERS_PER_NM), at(time.at), NEAR.ms, `time at ${time.alongNm} nm`)
  })

  it.each(withRecords)('is its own inverse wherever the plane didn\'t jump: $name', (c) => {
    const record = made(c).record!
    const { knots } = record.path
    // Two places seen at one time are a jump, and no moment is part way across it.
    const jumps = knots.slice(1).flatMap((later, i) => (later.time === knots[i].time ? [[knots[i].distance, later.distance]] : []))
    for (let share = 0.01; share <= 0.99; share += 0.07) {
      const distance = record.path.length * share
      if (jumps.some(([from, to]) => distance >= from && distance <= to)) continue
      expectNear(recordDistanceAt(record, recordTimeAt(record, distance)), distance, 0.5, `at ${share.toFixed(2)} of the way`)
    }
  })

  it.each(withRecords)('never goes backwards, and ends at the arrival airport: $name', (c) => {
    const record = made(c).record!
    const end = Math.max(at(c.arrival) + 3 * 60 * MINUTE, record.touchdown + 97_000)
    let last = -1
    for (let t = at(c.departure) - 60 * MINUTE; t < end; t += 97_000) {
      const distance = recordDistanceAt(record, t)
      expect(distance, `at ${new Date(t).toISOString()}`).toBeGreaterThanOrEqual(last)
      last = distance
    }
    expect(last).toBeCloseTo(record.path.length, 6)
  })

  it.each(withRecords)('flies the plan as the plane flies it after the last place seen: $name', (c) => {
    const { plan, path, record } = made(c)
    expect(record!.plan).toBe(plan)
    expect(record!.flownPlan).toEqual(flownPlan(plan, path))
  })

  it('is null for a path with no place seen', () => {
    const path = makeFlightPath(airport('SDF'), airport('PHL'))
    const departure = Date.UTC(2027, 0, 15, 12)
    expect(makeFlightRecord(path, makeFlightPlan(departure, departure + 105 * MINUTE, path.length)!)).toBeNull()
  })
})
```

- [x] **Step 3: Run them to see them fail.**

```bash
npx vitest run tests/map/flightPlan.test.ts tests/map/flightPath.test.ts tests/map/flightRecord.test.ts
```

Expected: FAIL: the three files they import don't exist yet.

- [x] **Step 4: The plan (spec §4).**

**Create `src/map/flightPlan.ts`:**

```ts
import type { FlightPath } from './flightPath'
import { airborneWindow } from './flightProgress'
import { METERS_PER_NM } from './greatCircle'

/**
 * The schedule's flight plan (Stage 3 spec §4), as the app's FlightPlan: when an on-schedule plane takes off and
 * touches down, and how fast it flies in between. The real plane is measured against it, flown at the plane's own
 * speed once that's known. The constants are written down in tests/fixtures/trip-map/live-cases.json, a copy of the
 * app's. Times are epoch ms, distances meters, and speeds meters a second.
 */

/** The last stretch before touchdown, flown at DESCENT_SPEED: 120 nautical miles. */
export const DESCENT_DISTANCE = 120 * METERS_PER_NM
/** 280 knots, in meters a second. */
export const DESCENT_SPEED = (280 * METERS_PER_NM) / 3600
/** How long the descent takes, in seconds: 25.7 minutes. */
const DESCENT_SECONDS = DESCENT_DISTANCE / DESCENT_SPEED
/** A plane's own speed is believed from 0.7 of the plan's speed to 1.5 of it, which the strongest winds stay inside. */
export const OWN_SPEED_LEAST_SHARE = 0.7
export const OWN_SPEED_MOST_SHARE = 1.5

export interface FlightPlan {
  /** Leaving the gate and reaching it, both moved by any reported delay. */
  departure: number
  arrival: number
  /** Wheels up and wheels down, as the schedule's plane has them (`airborneWindow`). */
  takeoff: number
  touchdown: number
  /** The great-circle distance between the leg's airports. */
  distance: number
  /** The speed before the descent: the cruise, or a short leg's one speed. The schedule's, or the plane's own in a plan from `flownPlan`. */
  speed: number
  /** Whether the whole leg is flown at `speed`, with no faster cruise before a descent: a short leg, or a slow one. */
  isSteady: boolean
}

/** The plan of a leg between airports `distance` meters apart, or null when it arrives no later than it leaves. */
export function makeFlightPlan(departure: number, arrival: number, distance: number): FlightPlan | null {
  const window = airborneWindow(departure, arrival)
  if (!window) return null
  const inAir = (window.end - window.start) / 1000
  // A leg has a cruise of its own only when it's longer than the descent, in distance and in time.
  const hasRoomToCruise = distance > DESCENT_DISTANCE && inAir > DESCENT_SECONDS
  const cruise = hasRoomToCruise ? (distance - DESCENT_DISTANCE) / (inAir - DESCENT_SECONDS) : 0
  const plan = { departure, arrival, takeoff: window.start, touchdown: window.end, distance }
  if (cruise > DESCENT_SPEED) return { ...plan, speed: cruise, isSteady: false }
  // A leg that goes nowhere has no speed of its own: the descent's stands in.
  const steady = distance / inAir
  return { ...plan, speed: steady > 0 ? steady : DESCENT_SPEED, isSteady: true }
}

/**
 * `plan` as the plane flies it: with the plane's own speed over its cruise so far in place of the schedule's, once
 * `path` has one that could be right. The takeoff and the touchdown stay the schedule's, and a leg flown at one steady
 * speed keeps it. The landing estimate, the estimated plane and the ghost all fly this plan, so the gap between the
 * two planes is still the label.
 */
export function flownPlan(plan: FlightPlan, path: FlightPath): FlightPlan {
  const own = path.ownSpeed
  if (plan.isSteady || own == null) return plan
  // Written so that a speed that isn't a number is no speed, as the app's range has it.
  if (!(own >= plan.speed * OWN_SPEED_LEAST_SHARE && own <= plan.speed * OWN_SPEED_MOST_SHARE)) return plan
  return { ...plan, speed: own }
}

/** The plan's time in the air, in ms. */
export const timeInAir = (plan: FlightPlan) => plan.touchdown - plan.takeoff
/** From the gate to wheels up: the schedule plane's allowance, or nothing on a block too short for it. */
export const taxiOut = (plan: FlightPlan) => plan.takeoff - plan.departure
/** From wheels down to the gate. */
export const taxiIn = (plan: FlightPlan) => plan.arrival - plan.touchdown

/** How long, in ms, a plane flying `plan` needs to fly `distance` meters to touchdown. Further than the whole leg, the extra is flown at its speed. */
export function timeToFly(plan: FlightPlan, distance: number): number {
  const far = Math.max(distance, 0)
  if (plan.isSteady) return (far / plan.speed) * 1000
  if (far <= DESCENT_DISTANCE) return (far / DESCENT_SPEED) * 1000
  return (DESCENT_SECONDS + (far - DESCENT_DISTANCE) / plan.speed) * 1000
}

/** How far from touchdown a plane flying `plan` is, `ms` before it: `timeToFly`'s inverse. */
export function distanceLeft(plan: FlightPlan, ms: number): number {
  const left = Math.max(ms, 0) / 1000
  if (plan.isSteady) return left * plan.speed
  if (left <= DESCENT_SECONDS) return left * DESCENT_SPEED
  return DESCENT_DISTANCE + (left - DESCENT_SECONDS) * plan.speed
}
```

- [x] **Step 5: The path (spec §6.1).**

**Create `src/map/flightPath.ts`:**

```ts
import { MINUTE } from '../time/zoned'
import { DESCENT_DISTANCE } from './flightPlan'
import { distanceMeters, METERS_PER_NM, pointAlong, type GeoPoint } from './greatCircle'
import type { LiveFlight } from './liveFlight'

/**
 * The path a flight is drawn and measured along (Stage 3 spec §6.1), as the app's FlightPath. With no live data it's
 * the great circle between the airports, as before. With a trail it's the real path: the departure airport, each place
 * the plane was seen, and the great circle from the last of them to the arrival airport. Distances are meters.
 */

/**
 * - seen: flown, between two places the plane was seen close enough together;
 * - unseen: flown, and nobody saw it: the straight join is a guess;
 * - planned: the great circle the schedule flies: a flight with no trail, or the way ahead of a real plane.
 */
export type StretchKind = 'seen' | 'unseen' | 'planned'

/** One join of the path, a great circle between two places. */
export interface Stretch {
  start: GeoPoint
  end: GeoPoint
  kind: StretchKind
  /** How far along the path it starts. */
  startDistance: number
  length: number
}

/** A place the plane was seen: when, and how far along the path. */
export interface Knot {
  time: number
  distance: number
}

/** Two neighbouring places seen further apart in time than this have an unseen join between them. */
export const UNSEEN_GAP_MS = 10 * MINUTE
/** A first place further than this from the departure airport is joined to it unseen, and doesn't tell the takeoff's time: 30 nautical miles. */
export const FIRST_POINT_RADIUS = 30 * METERS_PER_NM
/** A plane has a speed of its own once this much of its cruise has been seen: 10 minutes. */
export const OWN_SPEED_LEAST_MS = 10 * MINUTE

export interface FlightPath {
  origin: GeoPoint
  destination: GeoPoint
  /** Never empty, from the departure airport to the arrival airport. */
  stretches: Stretch[]
  /** Each place the plane was seen in the air, oldest first, and then its landing, when it has landed. Empty for a flight never seen in the air. */
  knots: Knot[]
  /** Whether it's a real path, from places the plane was seen. */
  isReal: boolean
  /** The whole path, flown and ahead. */
  length: number
  /** How far along the path the plane was last seen: where the way ahead begins. The whole path once it has landed. */
  flownLength: number
  /**
   * Whether the path ends with a landing: the flight has landed, and was seen in the air before it. A landed flight
   * never seen in the air has the great circle, and this is false: its progress's phase says it landed.
   */
  hasLanded: boolean
  /**
   * The plane's own speed over its cruise so far, in meters a second (spec §4): the distance it flew along the path
   * over the time it took, counted over each stretch between two neighbouring places both seen in its cruise, the
   * descent's distance or more from both airports. Null until those stretches come to OWN_SPEED_LEAST_MS. A stretch
   * nobody saw counts, as the straight join, when both its ends are in the cruise.
   */
  ownSpeed: number | null
}

/** A place the plane was seen in the air, and when. */
interface Sighting {
  place: GeoPoint
  time: number
}

/** The path of a flight from `origin` to `destination`: the real one when `flight` has been seen in the air. */
export function makeFlightPath(origin: GeoPoint, destination: GeoPoint, flight: LiveFlight | null = null): FlightPath {
  const seen = sightings(flight)
  const first = seen[0]
  const last = seen[seen.length - 1]
  if (!first || !last) {
    const length = distanceMeters(origin, destination)
    const stretches: Stretch[] = [{ start: origin, end: destination, kind: 'planned', startDistance: 0, length }]
    return { origin, destination, stretches, knots: [], isReal: false, length, flownLength: 0, hasLanded: false, ownSpeed: null }
  }
  const stretches: Stretch[] = []
  const knots: Knot[] = []
  let distance = 0
  const add = (start: GeoPoint, end: GeoPoint, kind: StretchKind) => {
    const length = distanceMeters(start, end)
    stretches.push({ start, end, kind, startDistance: distance, length })
    distance += length
  }
  add(origin, first.place, distanceMeters(origin, first.place) > FIRST_POINT_RADIUS ? 'unseen' : 'seen')
  knots.push({ time: first.time, distance })
  for (let i = 1; i < seen.length; i++) {
    add(seen[i - 1].place, seen[i].place, seen[i].time - seen[i - 1].time > UNSEEN_GAP_MS ? 'unseen' : 'seen')
    knots.push({ time: seen[i].time, distance })
  }
  const lastSeenDistance = distance
  const hasLanded = flight?.state === 'landed'
  if (hasLanded) {
    const landedAt = Math.max(flight.landedAt ?? flight.fix?.seenAt ?? last.time, last.time)
    add(last.place, destination, landedAt - last.time > UNSEEN_GAP_MS ? 'unseen' : 'seen')
    knots.push({ time: landedAt, distance })
  } else {
    add(last.place, destination, 'planned')
  }
  return {
    origin,
    destination,
    stretches,
    knots,
    isReal: true,
    length: distance,
    flownLength: hasLanded ? distance : lastSeenDistance,
    hasLanded,
    ownSpeed: cruiseSpeed(seen, knots, origin, destination),
  }
}

/**
 * The speed over the cruise: the distance between `knots` over the time between them, counted over each stretch
 * between two neighbours of `seen` that are both the descent's distance or more from both airports, in a straight
 * line. Null when those stretches come to under OWN_SPEED_LEAST_MS. A place's distance from an airport never changes,
 * so a hold or a pattern near the arrival airport can't bring its places into the cruise, and neither can a return to
 * the departure airport and the wait there.
 */
function cruiseSpeed(seen: Sighting[], knots: Knot[], origin: GeoPoint, destination: GeoPoint): number | null {
  const inCruise = seen.map((s) => distanceMeters(origin, s.place) >= DESCENT_DISTANCE && distanceMeters(s.place, destination) >= DESCENT_DISTANCE)
  let time = 0
  let flown = 0
  for (let i = 1; i < seen.length; i++) {
    if (!inCruise[i - 1] || !inCruise[i]) continue
    time += knots[i].time - knots[i - 1].time
    flown += knots[i].distance - knots[i - 1].distance
  }
  return time >= OWN_SPEED_LEAST_MS ? flown / (time / 1000) : null
}

/**
 * Each place `flight` was seen in the air, oldest first: its trail's points, with two of one time in the order they
 * came, and then its fix, when that's in the air and newer than the last of them.
 */
function sightings(flight: LiveFlight | null): Sighting[] {
  const seen: Sighting[] = (flight?.trail ?? [])
    .map((point, order) => ({ point, order }))
    .sort((a, b) => a.point.time - b.point.time || a.order - b.order)
    .map(({ point }) => ({ place: point.place, time: point.time }))
  const fix = flight?.fix
  if (fix && !fix.onGround && fix.seenAt > (seen[seen.length - 1]?.time ?? -Infinity)) seen.push({ place: fix.place, time: fix.seenAt })
  return seen
}

/** The place `distance` meters along `path`. Before its start that's the departure airport, and past its end the arrival airport. */
export function pointAtDistance(path: FlightPath, distance: number): GeoPoint {
  const far = Math.min(Math.max(distance, 0), path.length)
  const stretch = path.stretches.find((s) => far <= s.startDistance + s.length)
  if (!stretch) return path.destination
  if (stretch.length <= 0) return stretch.start
  return pointAlong(stretch.start, stretch.end, (far - stretch.startDistance) / stretch.length)
}
```

- [x] **Step 6: The record (spec §7.2).**

**Create `src/map/flightRecord.ts`:**

```ts
import { FIRST_POINT_RADIUS, pointAtDistance, type FlightPath } from './flightPath'
import { distanceLeft, flownPlan, timeToFly, type FlightPlan } from './flightPlan'
import type { GeoPoint } from './greatCircle'

/**
 * Where a flight with a real path was at any moment, and when it was any distance along it (Stage 3 spec §7.2), as
 * the app's FlightRecord. The replay, the facts' times and the estimated plane all read it.
 */
export interface FlightRecord {
  path: FlightPath
  /** The schedule's plan. */
  plan: FlightPlan
  /** The plan as the plane flies it, at its own speed once that's known: what it flies after the last place seen. */
  flownPlan: FlightPlan
  /** When it left the ground: the time of the first place it was seen, when that's close enough to the departure airport to tell (spec §7.1). */
  takeoff: number | null
  /** When it touched down, or is estimated to: the last place it was seen, plus the flown plan's time for the rest. */
  touchdown: number
}

/** The record of `path`, flown against `plan`, or null for a path with no place the plane was seen: such a flight has no record. */
export function makeFlightRecord(path: FlightPath, plan: FlightPlan): FlightRecord | null {
  const first = path.knots[0]
  const last = path.knots[path.knots.length - 1]
  if (!first || !last) return null
  const flown = flownPlan(plan, path)
  return {
    path,
    plan,
    flownPlan: flown,
    takeoff: first.distance <= FIRST_POINT_RADIUS ? first.time : null,
    touchdown: path.hasLanded ? last.time : last.time + timeToFly(flown, path.length - last.distance),
  }
}

/**
 * How far along its path the plane was at `t`, in meters.
 * - Before the first place it was seen, it flies there from the departure airport at the plan's speed, and waits at
 *   the airport before that.
 * - Among the places it was seen, it's between the two either side of `t`, in proportion to the time.
 * - After the last, it flies the flown plan to the arrival airport, and stays there. A flight that landed is there.
 */
export function recordDistanceAt(record: FlightRecord, t: number): number {
  const { knots } = record.path
  const first = knots[0]
  const last = knots[knots.length - 1]
  if (t <= first.time) return Math.max(0, first.distance - ((first.time - t) / 1000) * record.plan.speed)
  if (t >= last.time) {
    if (record.path.hasLanded) return record.path.length
    const estimated = record.path.length - distanceLeft(record.flownPlan, record.touchdown - t)
    return Math.min(Math.max(estimated, last.distance), record.path.length)
  }
  for (let i = 1; i < knots.length; i++) {
    const earlier = knots[i - 1]
    const later = knots[i]
    if (t >= later.time) continue
    return earlier.distance + (later.distance - earlier.distance) * ((t - earlier.time) / (later.time - earlier.time))
  }
  return last.distance
}

/** Where the plane was at `t`. */
export const recordPositionAt = (record: FlightRecord, t: number): GeoPoint => pointAtDistance(record.path, recordDistanceAt(record, t))

/** When the plane was `distance` meters along its path: `recordDistanceAt` the other way round. */
export function recordTimeAt(record: FlightRecord, distance: number): number {
  const { knots, length, hasLanded } = record.path
  const first = knots[0]
  const last = knots[knots.length - 1]
  const far = Math.min(Math.max(distance, 0), length)
  if (far <= first.distance) return first.time - ((first.distance - far) / record.plan.speed) * 1000
  if (far >= last.distance) return hasLanded ? last.time : record.touchdown - timeToFly(record.flownPlan, length - far)
  for (let i = 1; i < knots.length; i++) {
    const earlier = knots[i - 1]
    const later = knots[i]
    if (far > later.distance) continue
    if (later.distance <= earlier.distance) return earlier.time
    return earlier.time + (later.time - earlier.time) * ((far - earlier.distance) / (later.distance - earlier.distance))
  }
  return last.time
}
```

- [x] **Step 7: Run them to see them pass, then type-check.**

```bash
npx vitest run tests/map/flightPlan.test.ts tests/map/flightPath.test.ts tests/map/flightRecord.test.ts tests/partner/liveAnswer.test.ts && npx tsc --noEmit
```

Expected: 201 tests pass, and `tsc` prints nothing.

- [x] **Step 8: Commit, on Todd's yes (after batch B's checkpoint).**

```bash
git add src/map/flightPlan.ts src/map/flightPath.ts src/map/flightRecord.ts tests/map/liveCases.ts tests/map/flightPlan.test.ts tests/map/flightPath.test.ts tests/map/flightRecord.test.ts
git commit -m "The schedule's flight plan, flown at the plane's own speed once it's known, the real path from a flight's trail, and the record of where the plane was when, held to the shared cases (Stage 3 spec §4, §6.1, §7.2)"
```

---

### Task 5: The label, the real plane at a moment, and their words

**Files:**
- Create: `src/map/liveLabel.ts`, `src/map/liveProgress.ts`
- Modify: `src/copy/tripMap.ts`
- Test: `tests/map/liveLabel.test.ts`, `tests/map/liveProgress.test.ts`

- [x] **Step 1: Write the failing tests.**

The cases hold the label's words, so the label's tests and the progress's read them through `liveLabelText`.

**Create `tests/map/liveLabel.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { liveLabelText, minutesText } from '../../src/copy/tripMap'
import { liveLabel, ON_SCHEDULE_WITHIN } from '../../src/map/liveLabel'
import type { LivePhase } from '../../src/map/liveProgress'
import { LIVE_CASES } from './liveCases'

describe('ahead of the schedule or behind it (Stage 3 spec §5.3)', () => {
  it("uses the shared cases' constant", () => {
    expect(ON_SCHEDULE_WITHIN).toBe(LIVE_CASES.constants.onScheduleMinutes)
  })

  it.each(LIVE_CASES.labels)('reads $phase, $gapMinutes min as "$label"', ({ phase, gapMinutes, label }) => {
    const made = liveLabel(phase as LivePhase, gapMinutes)
    expect(made && liveLabelText(made)).toBe(label)
  })

  it('is ahead or behind at six minutes either way, and estimated while the plane is', () => {
    expect(liveLabel('inAir', 6)).toEqual({ kind: 'ahead', minutes: 6, isEstimated: false })
    expect(liveLabel('inAir', -6)).toEqual({ kind: 'behind', minutes: 6, isEstimated: false })
    expect(liveLabel('estimated', -6)).toEqual({ kind: 'behind', minutes: 6, isEstimated: true })
  })

  it('is on schedule within five minutes', () => {
    expect(liveLabel('inAir', 5)).toEqual({ kind: 'onSchedule' })
    expect(liveLabel('estimated', -5)).toEqual({ kind: 'onSchedule' })
    expect(liveLabel('landed', -5)).toEqual({ kind: 'landedOnTime' })
    expect(liveLabel('onGround', -5)).toEqual({ kind: 'stillOnGround', minutesBehind: null })
  })

  it('is null with no gap, and for a flight that isn\'t live or is somewhere else', () => {
    expect(liveLabel('inAir', null)).toBeNull()
    expect(liveLabel('onGround', null)).toBeNull()
    expect(liveLabel('notLive', 12)).toBeNull()
    expect(liveLabel('elsewhere', 12)).toBeNull()
  })

  it('writes hours as the landing countdown does', () => {
    expect([minutesText(45), minutesText(120), minutesText(130)]).toEqual(['45 min', '2 h', '2 h 10 min'])
    expect(liveLabelText({ kind: 'behind', minutes: 75, isEstimated: true })).toBe('About 1 h 15 min behind')
  })
})
```

**Create `tests/map/liveProgress.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { liveLabelText } from '../../src/copy/tripMap'
import { makeFlightPath, pointAtDistance } from '../../src/map/flightPath'
import { makeFlightPlan } from '../../src/map/flightPlan'
import { makeFlightRecord, recordDistanceAt } from '../../src/map/flightRecord'
import { distanceMeters, METERS_PER_NM, pointAlong } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { AIRPORT_RADIUS, FRESH_FOR_MS, gapMinutes, liveProgress } from '../../src/map/liveProgress'
import { airport, at, expectNearOrNull, expectPlace, LIVE_CASES, made, NEAR } from './liveCases'

const MINUTE = 60_000

const nmOrNull = (meters: number | null) => (meters == null ? null : meters / METERS_PER_NM)
const atOrNull = (iso: string | null) => (iso == null ? null : at(iso))

describe('the real plane at a moment (Stage 3 spec §5, §7.1)', () => {
  it("uses the shared cases' constants", () => {
    expect(FRESH_FOR_MS).toBe(LIVE_CASES.constants.freshSeconds * 1000)
    expect(AIRPORT_RADIUS).toBe(LIVE_CASES.constants.airportRadiusNm * METERS_PER_NM)
  })

  it.each(LIVE_CASES.flights)('matches every moment of the shared case: $name', (c) => {
    const { plan, path, record, flight } = made(c)
    expect(c.moments.length).toBeGreaterThan(0)
    for (const moment of c.moments) {
      const what = (field: string) => `${moment.at} ${field}`
      const progress = liveProgress(plan, path, record, flight, at(moment.at))
      expect(progress.phase, what('phase')).toBe(moment.phase)
      expectNearOrNull(progress.touchdown, atOrNull(moment.touchdown), NEAR.ms, what('touchdown'))
      expectNearOrNull(progress.liveArrival, atOrNull(moment.liveArrival), NEAR.ms, what('live arrival'))
      expect(progress.gapMinutes, what('gap')).toBe(moment.gapMinutes)
      expect(progress.label && liveLabelText(progress.label), what('label')).toBe(moment.label)
      expectNearOrNull(nmOrNull(progress.planeDistance), moment.planeAlongNm, NEAR.nm, what('plane along'))
      expectPlace(progress.plane, moment.plane, what('plane'))
      expectNearOrNull(nmOrNull(progress.ghostDistance), moment.ghostAlongNm, NEAR.nm, what('ghost along'))
      expectPlace(progress.ghostDistance == null ? null : pointAtDistance(path, progress.ghostDistance), moment.ghost, what('ghost'))
      expectNearOrNull(progress.start, at(moment.start), NEAR.ms, what('start'))
      expectNearOrNull(progress.end, at(moment.end), NEAR.ms, what('end'))
    }
  })

  it('has a moment in every phase among the shared cases', () => {
    const phases = new Set(LIVE_CASES.flights.flatMap((c) => c.moments.map((m) => m.phase)))
    expect([...phases].sort()).toEqual(['elsewhere', 'estimated', 'inAir', 'landed', 'notLive', 'onGround'])
  })

  it('agrees with the record wherever the plane is estimated', () => {
    let checked = 0
    for (const c of LIVE_CASES.flights) {
      const { plan, path, record, flight } = made(c)
      for (const moment of c.moments.filter((m) => m.phase === 'estimated')) {
        const progress = liveProgress(plan, path, record, flight, at(moment.at))
        expect(progress.planeDistance!).toBeCloseTo(recordDistanceAt(record!, at(moment.at)), 3)
        expect(progress.touchdown!).toBeCloseTo(record!.touchdown, 3)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('never puts an estimated plane behind the last place it was seen', () => {
    // A trail point newer than the fix, which Crewlu Cloud doesn't send: flown on from the fix, the plane would go back.
    const origin = airport('SDF')
    const destination = airport('PHL')
    const departure = Date.UTC(2027, 0, 15, 12)
    const plan = makeFlightPlan(departure, departure + 105 * MINUTE, distanceMeters(origin, destination))!
    const seenAt = departure + 40 * MINUTE
    const flight: LiveFlight = {
      legId: 'leg',
      callsign: 'UPS1234',
      state: 'airborne',
      fix: { place: pointAlong(origin, destination, 0.3), altitudeFt: 35_000, groundSpeedKt: 450, trackDeg: 80, onGround: false, registration: null, typeCode: null, seenAt },
      landedAt: null,
      trail: [{ time: seenAt + 10 * MINUTE, place: pointAlong(origin, destination, 0.5), altitudeFt: 35_000 }],
    }
    const path = makeFlightPath(origin, destination, flight)
    const progress = liveProgress(plan, path, makeFlightRecord(path, plan), flight, seenAt + 4 * MINUTE)
    expect(progress.phase).toBe('estimated')
    expect(progress.planeDistance).toBe(path.flownLength)
  })
})

describe('the gap in minutes (Stage 3 spec §5.3)', () => {
  it.each(LIVE_CASES.gaps)('rounds $aheadSeconds s to $gapMinutes, halves away from zero', ({ aheadSeconds, gapMinutes: minutes }) => {
    expect(gapMinutes(aheadSeconds * 1000)).toBe(minutes)
  })

  it('holds a time that can\'t be right to a year either way', () => {
    expect([1e30, -1e30, Infinity, -Infinity, NaN].map(gapMinutes)).toEqual([525_600, -525_600, 525_600, -525_600, 0])
    expect(gapMinutes(525_599 * 60_000)).toBe(525_599)
  })

  it('is never minus nothing', () => {
    expect(Object.is(gapMinutes(-20_000), 0)).toBe(true)
  })
})
```

- [x] **Step 2: Run them to see them fail.**

```bash
npx vitest run tests/map/liveLabel.test.ts tests/map/liveProgress.test.ts
```

Expected: FAIL: `src/map/liveLabel.ts` and `src/map/liveProgress.ts` don't exist yet.

- [x] **Step 3: The label (spec §5.3).**

**Create `src/map/liveLabel.ts`:**

```ts
import type { LivePhase } from './liveProgress'

/**
 * Whether the real plane is ahead of the schedule or behind it (Stage 3 spec §5.3), as the app's LiveLabel.
 * `liveLabelText` in src/copy/tripMap.ts writes it.
 * - ahead, behind: `isEstimated` once the plane hasn't been seen for a while, and the words gain "About";
 * - stillOnGround: past the plan's takeoff and not off the ground. `minutesBehind` is null for the first few minutes.
 */
export type LiveLabel =
  | { kind: 'onSchedule' }
  | { kind: 'ahead'; minutes: number; isEstimated: boolean }
  | { kind: 'behind'; minutes: number; isEstimated: boolean }
  | { kind: 'stillOnGround'; minutesBehind: number | null }
  | { kind: 'landedOnTime' }
  | { kind: 'landedEarly'; minutes: number }
  | { kind: 'landedLate'; minutes: number }

/** A gap of this many minutes or fewer, either way, is on schedule. */
export const ON_SCHEDULE_WITHIN = 5

/**
 * The label for a flight in `phase`, `gapMinutes` ahead of the plan (behind when negative). Null where there's no gap
 * to tell, and for a flight that isn't live or is somewhere else.
 */
export function liveLabel(phase: LivePhase, gapMinutes: number | null): LiveLabel | null {
  if (gapMinutes == null) return null
  const minutes = Math.abs(gapMinutes)
  const isOnSchedule = minutes <= ON_SCHEDULE_WITHIN
  switch (phase) {
    case 'inAir':
    case 'estimated': {
      const isEstimated = phase === 'estimated'
      if (isOnSchedule) return { kind: 'onSchedule' }
      return gapMinutes > 0 ? { kind: 'ahead', minutes, isEstimated } : { kind: 'behind', minutes, isEstimated }
    }
    case 'onGround':
      return { kind: 'stillOnGround', minutesBehind: isOnSchedule ? null : minutes }
    case 'landed':
      if (isOnSchedule) return { kind: 'landedOnTime' }
      return gapMinutes > 0 ? { kind: 'landedEarly', minutes } : { kind: 'landedLate', minutes }
    case 'notLive':
    case 'elsewhere':
      return null
  }
}
```

- [x] **Step 4: The real plane at a moment (spec §5, §7.1).**

**Create `src/map/liveProgress.ts`:**

```ts
import { MINUTE } from '../time/zoned'
import { pointAtDistance, type FlightPath } from './flightPath'
import { distanceLeft, flownPlan, taxiIn, taxiOut, timeInAir, timeToFly, type FlightPlan } from './flightPlan'
import type { FlightRecord } from './flightRecord'
import { distanceMeters, METERS_PER_NM, type GeoPoint } from './greatCircle'
import { liveLabel, type LiveLabel } from './liveLabel'
import type { LiveFix, LiveFlight } from './liveFlight'

/**
 * A flight's real plane at one moment (Stage 3 spec §5, §7.1), as the app's LiveProgress: whether it's live, when it
 * will land, how far ahead of the schedule or behind it that is, where the real plane and the ghost are, and the leg's
 * real times.
 */

/**
 * - notLive: no live data, never seen, or last seen on the ground too long ago: the schedule's plane alone;
 * - onGround: seen on the ground at the departure airport;
 * - inAir: seen in the air lately;
 * - estimated: last seen in the air too long ago: the real plane flies the plan on from there, at the plane's own
 *   speed once that's known;
 * - landed;
 * - elsewhere: on the ground anywhere else: a diversion.
 */
export type LivePhase = 'notLive' | 'onGround' | 'inAir' | 'estimated' | 'landed' | 'elsewhere'

/** A fix this old or newer is live, by Crewlu Cloud's clock: 3 minutes. Crewlu Cloud asks for one a minute, so this outlasts a single answer that didn't come. */
export const FRESH_FOR_MS = 3 * MINUTE
/** On the ground this close to the departure airport is at it: 10 nautical miles. */
export const AIRPORT_RADIUS = 10 * METERS_PER_NM

export interface LiveProgress {
  phase: LivePhase
  /** When the real plane touches down, or did. Null where there's no estimate. */
  touchdown: number | null
  /** When it reaches the gate: `touchdown` plus the plan's taxi in. */
  liveArrival: number | null
  /** The plan's touchdown minus `touchdown`, to the nearest minute. Ahead is positive. */
  gapMinutes: number | null
  label: LiveLabel | null
  /** How far along the path the real plane is, in meters. Null when it isn't shown, or isn't on the path. */
  planeDistance: number | null
  /** Where the real plane is. Null when it isn't shown. */
  plane: GeoPoint | null
  /** How far along the path a plane that lands on schedule would be, flying as this one does. Null when the ghost isn't shown. */
  ghostDistance: number | null
  /**
   * The leg's real times (spec §7.1): its start, moved earlier by an early takeoff, and its end, the live arrival where
   * there is one. Otherwise they're the plan's.
   */
  start: number
  end: number
}

/**
 * The real plane of a leg at `now`, by Crewlu Cloud's clock.
 * - `plan`: the leg's plan, from its scheduled times moved by the reported delay.
 * - `path`: the leg's path, made from `flight`.
 * - `record`: the path's record, when it's a real one.
 * - `flight`: the leg's live data, or null when Crewlu Cloud answered none.
 */
export function liveProgress(plan: FlightPlan, path: FlightPath, record: FlightRecord | null, flight: LiveFlight | null, now: number): LiveProgress {
  const phase = phaseOf(flight, path.origin, now)
  // The plane's own speed stands in for the plan's, for the estimate, the estimated plane and the ghost alike.
  const flown = flownPlan(plan, path)
  const touchdown = touchdownOf(phase, flown, path, record, flight, now)
  const plane = planeOf(phase, flown, path, flight?.fix ?? null, touchdown, now)
  const liveArrival = touchdown == null ? null : touchdown + taxiIn(plan)
  const gap = touchdown == null ? null : gapMinutes(plan.touchdown - touchdown)
  const earlyStart = record?.takeoff == null ? null : record.takeoff - taxiOut(plan)
  return {
    phase,
    touchdown,
    liveArrival,
    gapMinutes: gap,
    label: liveLabel(phase, gap),
    planeDistance: plane.distance,
    plane: plane.place,
    ghostDistance: ghostDistanceOf(phase, flown, path, now),
    start: earlyStart == null ? plan.departure : Math.min(earlyStart, plan.departure),
    end: liveArrival ?? plan.arrival,
  }
}

/** The widest gap there can be, either way: a year of minutes. A time that can't be right is held to it. */
const WIDEST_GAP = 365 * 24 * 60

/** A gap of `ms` ahead (behind when negative) in whole minutes, halves away from zero. */
export function gapMinutes(ms: number): number {
  const exact = ms / MINUTE
  if (Number.isNaN(exact)) return 0
  const minutes = Math.min(Math.round(Math.abs(exact)), WIDEST_GAP)
  // Never -0: a gap under half a minute behind is none.
  return exact < 0 && minutes !== 0 ? -minutes : minutes
}

/** When the real plane touches down, or did (spec §5.2). Null where there's no estimate. `plan` is the plan as the plane flies it. */
function touchdownOf(phase: LivePhase, plan: FlightPlan, path: FlightPath, record: FlightRecord | null, flight: LiveFlight | null, now: number): number | null {
  switch (phase) {
    case 'inAir':
    case 'estimated': {
      // The last fix, plus the time for the straight distance left at the plane's own speed.
      const fix = flight?.fix
      return fix ? fix.seenAt + timeToFly(plan, distanceMeters(fix.place, path.destination)) : null
    }
    case 'onGround':
      // Past the plan's takeoff, it's as if the plane took off this moment.
      return now >= plan.takeoff ? now + timeInAir(plan) : null
    case 'landed':
      // The record's landing, where there is one, so the two can't disagree.
      return record?.touchdown ?? flight?.landedAt ?? flight?.fix?.seenAt ?? null
    case 'notLive':
    case 'elsewhere':
      return null
  }
}

/** Where the real plane is, and how far along the path. Neither when it isn't shown, and no distance when it isn't on the path. */
function planeOf(
  phase: LivePhase,
  plan: FlightPlan,
  path: FlightPath,
  fix: LiveFix | null,
  touchdown: number | null,
  now: number,
): { distance: number | null; place: GeoPoint | null } {
  switch (phase) {
    case 'inAir':
      return { distance: path.flownLength, place: fix?.place ?? null }
    case 'estimated': {
      // It flies on from its last fix as the plan has it, and stays at the arrival airport once it's there (spec §5.5).
      if (touchdown == null) return { distance: null, place: null }
      const left = distanceLeft(plan, touchdown - now)
      const distance = Math.min(Math.max(path.length - left, path.flownLength), path.length)
      return { distance, place: pointAtDistance(path, distance) }
    }
    case 'landed':
      return { distance: path.length, place: path.destination }
    case 'onGround':
      return { distance: 0, place: fix?.place ?? null }
    case 'elsewhere':
      return { distance: null, place: fix?.place ?? null }
    case 'notLive':
      return { distance: null, place: null }
  }
}

/** How far along the path a plane landing on schedule would be, flying `plan` (spec §5.4). Null when the ghost isn't shown. */
function ghostDistanceOf(phase: LivePhase, plan: FlightPlan, path: FlightPath, now: number): number | null {
  switch (phase) {
    case 'inAir':
    case 'estimated':
    case 'onGround':
      // Until the plan's takeoff it waits at the departure airport, however long the real path is.
      if (now < plan.takeoff) return 0
      return Math.max(0, path.length - distanceLeft(plan, plan.touchdown - now))
    case 'landed':
    case 'elsewhere':
    case 'notLive':
      return null
  }
}

/** What the live data says of a flight from `origin` at `now` (spec §5.1). */
function phaseOf(flight: LiveFlight | null, origin: GeoPoint, now: number): LivePhase {
  const fix = flight?.fix
  if (!flight || !fix) return 'notLive'
  const isFresh = now - fix.seenAt <= FRESH_FOR_MS
  switch (flight.state) {
    case 'waiting':
      return 'notLive'
    case 'landed':
      return 'landed'
    case 'airborne':
      return isFresh ? 'inAir' : 'estimated'
    case 'ground':
      if (!isFresh) return 'notLive'
      return distanceMeters(fix.place, origin) <= AIRPORT_RADIUS ? 'onGround' : 'elsewhere'
  }
}
```

- [x] **Step 5: The words.** `landingCountdown` keeps its words, now through `minutesText` (its tests in `tests/copy/tripMap.test.ts` hold them).

**In `src/copy/tripMap.ts`, replace (1 of 2):**

```ts
import type { AppleMapStyle } from '../map/appleMapStyle'
```

**with:**

```ts
import type { AppleMapStyle } from '../map/appleMapStyle'
import type { LiveLabel } from '../map/liveLabel'
```

**In `src/copy/tripMap.ts`, replace (2 of 2):**

```ts
/** "Landing in 2 h 10 min", to the gate arrival. */
export function landingCountdown(leg: MapLeg, now: number): string {
  const minutes = Math.ceil((leg.end - now) / 60_000)
  if (minutes <= 0) return 'Landing now'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `Landing in ${rest} min`
  return rest === 0 ? `Landing in ${hours} h` : `Landing in ${hours} h ${rest} min`
}
```

**with:**

```ts
/** "Landing in 2 h 10 min", to the gate arrival. */
export function landingCountdown(leg: MapLeg, now: number): string {
  const minutes = Math.ceil((leg.end - now) / 60_000)
  return minutes <= 0 ? 'Landing now' : `Landing in ${minutesText(minutes)}`
}

/** "45 min", "2 h" or "2 h 10 min": the landing countdown's length, and the real plane's gap. */
export function minutesText(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

/**
 * "12 min ahead", "About 20 min behind", "Still on the ground · 20 min behind" or "Landed 8 min early": the real plane
 * against the schedule (Stage 3 spec §5.3), as the app's TripMapWording.liveLabel.
 */
export function liveLabelText(label: LiveLabel): string {
  switch (label.kind) {
    case 'onSchedule':
      return 'On schedule'
    case 'ahead':
      return `${label.isEstimated ? 'About ' : ''}${minutesText(label.minutes)} ahead`
    case 'behind':
      return `${label.isEstimated ? 'About ' : ''}${minutesText(label.minutes)} behind`
    case 'stillOnGround':
      return label.minutesBehind == null ? 'Still on the ground' : `Still on the ground · ${minutesText(label.minutesBehind)} behind`
    case 'landedOnTime':
      return 'Landed on time'
    case 'landedEarly':
      return `Landed ${minutesText(label.minutes)} early`
    case 'landedLate':
      return `Landed ${minutesText(label.minutes)} late`
  }
}
```

- [x] **Step 6: Run them to see them pass, with the copy's own tests, then type-check.**

```bash
npx vitest run tests/map/liveLabel.test.ts tests/map/liveProgress.test.ts tests/copy && npx tsc --noEmit
```

Expected: 499 tests pass, and `tsc` prints nothing.

- [x] **Step 7: Commit, on Todd's yes (after batch B's checkpoint).**

```bash
git add src/map/liveLabel.ts src/map/liveProgress.ts src/copy/tripMap.ts tests/map/liveLabel.test.ts tests/map/liveProgress.test.ts
git commit -m "The real plane at any moment: whether it's live, its landing estimate, how far ahead or behind, where it and the ghost are, the leg's real times, and the label's words, held to the shared cases (Stage 3 spec §5, §7.1)"
```

---

### Task 6: The window

**Files:**
- Create: `src/map/liveWindow.ts`
- Test: `tests/map/liveWindow.test.ts`

- [x] **Step 1: Write the failing test.**

**Create `tests/map/liveWindow.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { isLiveWindowOpen, WINDOW_CLOSES_AFTER_MS, WINDOW_ENDS_AFTER_MS, WINDOW_KEEPS_MS, WINDOW_OPENS_BEFORE_MS } from '../../src/map/liveWindow'
import { at, caseFlight, LIVE_CASES } from './liveCases'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

describe('when to ask for the live plane (Stage 3 spec §10.2)', () => {
  it("uses the shared cases' constants", () => {
    const c = LIVE_CASES.constants
    expect(WINDOW_OPENS_BEFORE_MS).toBe(c.windowOpensMinutesBefore * MINUTE)
    expect(WINDOW_CLOSES_AFTER_MS).toBe(c.windowClosesHoursAfter * HOUR)
    expect(WINDOW_KEEPS_MS).toBe(c.windowKeepsMinutes * MINUTE)
    expect(WINDOW_ENDS_AFTER_MS).toBe(c.windowEndsHoursAfter * HOUR)
  })

  it.each(LIVE_CASES.windows)('matches the shared case: $name', (w) => {
    expect(isLiveWindowOpen(at(w.departure), at(w.arrival), caseFlight(w.flight), at(w.at))).toBe(w.isOpen)
  })
})
```

- [x] **Step 2: Run it to see it fail.**

```bash
npx vitest run tests/map/liveWindow.test.ts
```

Expected: FAIL: `src/map/liveWindow.ts` doesn't exist yet.

- [x] **Step 3: The window (spec §10.2, partner-api.md's "When to call it").**

**Create `src/map/liveWindow.ts`:**

```ts
import { HOUR, MINUTE } from '../time/zoned'
import type { LiveFlight } from './liveFlight'

/**
 * When a flight's live data is worth asking for (Stage 3 spec §10.2, and partner-api.md's "When to call it"), as the
 * app's LiveWindow: the same window Crewlu Cloud watches it in.
 */

/** It opens this long before the flight leaves the gate. */
export const WINDOW_OPENS_BEFORE_MS = 30 * MINUTE
/** It closes this long after the flight reaches the gate. */
export const WINDOW_CLOSES_AFTER_MS = 2 * HOUR
/** Past that, it stays open while the flight is in the air with a fix newer than this. */
export const WINDOW_KEEPS_MS = 30 * MINUTE
/** And never longer than this after the flight reaches the gate. */
export const WINDOW_ENDS_AFTER_MS = 12 * HOUR

/**
 * Whether the window of a flight leaving the gate at `departure` and reaching it at `arrival`, both moved by any
 * reported delay, is open at `now`, by Crewlu Cloud's clock. `flight` is its live data so far.
 */
export function isLiveWindowOpen(departure: number, arrival: number, flight: LiveFlight | null, now: number): boolean {
  if (now < departure - WINDOW_OPENS_BEFORE_MS || flight?.state === 'landed') return false
  if (now < arrival + WINDOW_CLOSES_AFTER_MS) return true
  const fix = flight?.fix
  if (flight?.state !== 'airborne' || !fix) return false
  return fix.seenAt > now - WINDOW_KEEPS_MS && now < arrival + WINDOW_ENDS_AFTER_MS
}
```

- [x] **Step 4: Run it to see it pass, then type-check.**

```bash
npx vitest run tests/map/liveWindow.test.ts && npx tsc --noEmit
```

Expected: 13 tests pass, and `tsc` prints nothing.

- [x] **Step 5: Batch B's review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Tasks 4 to 6, against the spec's §4 to §7 and §10.2, with the app's Swift beside it (`Crewluv/Services/TripMap/Live/`). Make its fixes, run every test of `tests/map` and `tests/copy`, and record what it found.

- [x] **Step 6: Batch B's checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npx vitest run tests/map tests/copy
```

Expected: 916 tests pass.

- [x] **Step 7: Commit, on Todd's yes.** Tasks 4 and 5's commits, then:

```bash
git add src/map/liveWindow.ts tests/map/liveWindow.test.ts
git commit -m "When a flight's live data is worth asking for: the window Crewlu Cloud watches it in, held to the shared cases (Stage 3 spec §10.2)"
```

---

### Task 7: The source that asks

**Files:**
- Create: `src/partner/liveSource.ts`
- Test: `tests/partner/liveSource.test.ts`

- [x] **Step 1: Write the failing test.**

A stand-in door keeps each call and gives the answers a test queues; `later()` holds one until the test settles it. The 30-second check runs on Vitest's fake `setInterval`.

**Create `tests/partner/liveSource.test.ts`:**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LiveState, TrailPoint } from '../../src/map/liveFlight'
import type { LiveFlightDoor, Refused } from '../../src/partner/door'
import type { AnsweredFlight, LiveAnswer } from '../../src/partner/liveAnswer'
import { LIVE_INTERVAL_MS, makeLiveSource, type LiveLeg } from '../../src/partner/liveSource'
import type { Device } from '../../src/partner/store'
import { key, PARTNER_A, PARTNER_B } from '../fixtures/partner'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const NOW = Date.UTC(2027, 0, 15, 12)

type Answer = LiveAnswer | Refused | Error

/** A call that answers when the test says so. */
function later() {
  let settle!: (answer: Answer) => void
  const answer = new Promise<Answer>((resolve) => {
    settle = resolve
  })
  return { answer, settle }
}

/** A stand-in partner_live: it keeps each call, and gives the answers queued, in order. */
function standIn() {
  const calls: { key: string; after: number | null }[] = []
  const queue: (Answer | Promise<Answer>)[] = []
  const door: LiveFlightDoor = {
    async live(key, after) {
      calls.push({ key, after })
      const answer = await (queue.shift() ?? new Error('Nothing more to answer'))
      if (answer instanceof Error) throw answer
      return answer
    },
  }
  return { door, calls, answer: (...answers: (Answer | Promise<Answer>)[]) => queue.push(...answers) }
}

const point = (minutes: number): TrailPoint => ({ time: NOW + minutes * MINUTE, place: { lat: 40, lng: -80 + minutes / 10 }, altitudeFt: 35_000 })

function flight(legId: string, minutes: number[], trailCount = minutes.length, state: LiveState = 'airborne'): AnsweredFlight {
  const last = minutes[minutes.length - 1] ?? 0
  return {
    legId,
    callsign: 'UPS1234',
    state,
    fix: { place: { lat: 40, lng: -80 }, altitudeFt: 35_000, groundSpeedKt: 450, trackDeg: 80, onGround: false, registration: null, typeCode: null, seenAt: NOW + last * MINUTE },
    landedAt: null,
    trail: minutes.map(point),
    trailCount,
  }
}

const answer = (flights: AnsweredFlight[], cursor = 1, now = NOW): LiveAnswer => ({ now, cursor, flights })
const times = (trail: TrailPoint[] | undefined) => trail?.map((p) => (p.time - NOW) / MINUTE)

/** A source over a stand-in door, a device that can change, and a clock that can move. */
function made() {
  const stand = standIn()
  const state = { device: { key: key(1), partnerId: PARTNER_A } as Device | null, clock: NOW }
  const onSharingEnded = vi.fn()
  const source = makeLiveSource({ door: stand.door, device: () => state.device, onSharingEnded, now: () => state.clock })
  return { ...stand, state, onSharingEnded, source }
}

describe('asking for the live plane (Stage 3 spec §11)', () => {
  it("asks once when the page is shown, with this browser's key and no cursor", async () => {
    const { source, calls, answer: give } = made()
    give(answer([]))
    await source.pageShown()
    source.pageHidden()
    expect(calls).toEqual([{ key: key(1), after: null }])
  })

  it("keeps each flight by its leg's id, without the answer's count", async () => {
    const { source, answer: give } = made()
    give(answer([flight('leg-1', [0, 2]), flight('leg-2', [], 0, 'waiting')]))
    await source.ask()
    expect([...source.flights.keys()]).toEqual(['leg-1', 'leg-2'])
    const { trailCount: _count, ...kept } = flight('leg-1', [0, 2])
    expect(source.flights.get('leg-1')).toEqual(kept)
  })

  it('sends the last cursor back, and adds the new points to those it has', async () => {
    const { source, calls, answer: give } = made()
    give(answer([flight('leg-1', [0, 2])], 7), answer([flight('leg-1', [4], 3)], 8))
    await source.ask()
    await source.ask()
    expect(calls.map((c) => c.after)).toEqual([null, 7])
    expect(times(source.flights.get('leg-1')?.trail)).toEqual([0, 2, 4])
  })

  it("asks again for every point when a trail doesn't add up", async () => {
    const { source, calls, answer: give } = made()
    give(answer([flight('leg-1', [0, 2])], 7), answer([flight('leg-1', [4], 4)], 9), answer([flight('leg-1', [0, 2, 3, 4])], 9))
    await source.ask()
    await source.ask()
    expect(calls.map((c) => c.after)).toEqual([null, 7, null])
    expect(times(source.flights.get('leg-1')?.trail)).toEqual([0, 2, 3, 4])
  })

  it('asks again for every point when a flight new here has points from before the cursor', async () => {
    const { source, calls, answer: give } = made()
    give(answer([flight('leg-1', [0])], 7), answer([flight('leg-1', [], 1), flight('leg-2', [5], 3)], 9), answer([flight('leg-1', [0]), flight('leg-2', [1, 3, 5])], 9))
    await source.ask()
    await source.ask()
    expect(calls.map((c) => c.after)).toEqual([null, 7, null])
    expect(times(source.flights.get('leg-2')?.trail)).toEqual([1, 3, 5])
  })

  it('takes an answer with every point as it comes', async () => {
    const { source, calls, answer: give } = made()
    give(answer([flight('leg-1', [0, 2], 5)]))
    await source.ask()
    expect(calls).toHaveLength(1)
    expect(times(source.flights.get('leg-1')?.trail)).toEqual([0, 2])
  })

  it('forgets a flight no longer answered', async () => {
    const { source, answer: give } = made()
    give(answer([flight('leg-1', [0])], 7), answer([], 7))
    await source.ask()
    await source.ask()
    expect(source.flights.size).toBe(0)
  })

  it("keeps what it has, and its cursor, when Crewlu Cloud can't be reached or refuses for another reason", async () => {
    const { source, calls, answer: give } = made()
    give(answer([flight('leg-1', [0])], 7), new TypeError('Failed to fetch'), { error: 'invalid_key' }, answer([], 8))
    await source.ask()
    await source.ask()
    await source.ask()
    expect(times(source.flights.get('leg-1')?.trail)).toEqual([0])
    await source.ask()
    expect(calls.map((c) => c.after)).toEqual([null, 7, 7, 7])
  })

  it('keeps what it has, and its cursor, when the call for every point fails', async () => {
    const { source, calls, answer: give } = made()
    give(answer([flight('leg-1', [0, 2])], 7), answer([flight('leg-1', [4], 9)], 9), new TypeError('Failed to fetch'), answer([], 9))
    await source.ask()
    await source.ask()
    expect(times(source.flights.get('leg-1')?.trail)).toEqual([0, 2])
    await source.ask()
    expect(calls.map((c) => c.after)).toEqual([null, 7, null, 7])
  })

  it('makes no second call while one is under way, and settles both with its answer', async () => {
    const { source, calls, answer: give } = made()
    const call = later()
    give(call.answer)
    const first = source.ask()
    const second = source.ask()
    expect(calls).toHaveLength(1)
    call.settle(answer([flight('leg-1', [0])]))
    await Promise.all([first, second])
    expect(source.flights.has('leg-1')).toBe(true)
    give(answer([]))
    await source.ask()
    expect(calls).toHaveLength(2)
  })

  it('still takes the answer of a call under way when the page is hidden', async () => {
    const { source, answer: give } = made()
    const call = later()
    give(call.answer)
    const shown = source.pageShown()
    source.pageHidden()
    call.settle(answer([flight('leg-1', [0])]))
    await shown
    expect(source.flights.has('leg-1')).toBe(true)
  })
})

describe('sharing ended, and another connection (Stage 3 spec §11)', () => {
  it('forgets the flights and tells the page when sharing has ended', async () => {
    const { source, onSharingEnded, answer: give } = made()
    give(answer([flight('leg-1', [0])], 7), { error: 'sharing_ended' })
    await source.ask()
    await source.ask()
    expect(source.flights.size).toBe(0)
    expect(onSharingEnded).toHaveBeenCalledTimes(1)
  })

  it('ends sharing on the call for every point too', async () => {
    const { source, onSharingEnded, answer: give } = made()
    give(answer([flight('leg-1', [0])], 7), answer([flight('leg-1', [2], 5)], 8), { error: 'sharing_ended' })
    await source.ask()
    await source.ask()
    expect(source.flights.size).toBe(0)
    expect(onSharingEnded).toHaveBeenCalledTimes(1)
  })

  it('ends nothing for a device this browser has since let go', async () => {
    const { source, state, onSharingEnded, answer: give } = made()
    const call = later()
    give(call.answer)
    const asked = source.ask()
    state.device = { key: key(2), partnerId: PARTNER_A }
    call.settle({ error: 'sharing_ended' })
    await asked
    expect(onSharingEnded).not.toHaveBeenCalled()
  })

  it("leaves out an answer for a device or a partner since replaced, and forgets the last one's flights", async () => {
    for (const replaced of [{ key: key(2), partnerId: PARTNER_A }, { key: key(1), partnerId: PARTNER_B }, null]) {
      const { source, state, answer: give } = made()
      const call = later()
      give(answer([flight('leg-1', [0])], 7), call.answer)
      await source.ask()
      const asked = source.ask()
      state.device = replaced
      call.settle(answer([flight('leg-1', [0, 2])], 8))
      await asked
      expect(source.flights.size, JSON.stringify(replaced)).toBe(0)
    }
  })

  it("lets the last device's call finish, then asks for the new one", async () => {
    const { source, state, calls, answer: give } = made()
    const call = later()
    give(call.answer, answer([flight('leg-2', [0])]))
    const first = source.ask()
    state.device = { key: key(2), partnerId: PARTNER_A }
    const second = source.ask()
    expect(calls).toHaveLength(1)
    call.settle(answer([flight('leg-1', [0])]))
    await Promise.all([first, second])
    expect(calls).toEqual([{ key: key(1), after: null }, { key: key(2), after: null }])
    expect([...source.flights.keys()]).toEqual(['leg-2'])
  })

  it('makes no second call when a listener asks as the flights are forgotten', async () => {
    const { source, state, calls, answer: give } = made()
    give(answer([flight('leg-1', [0])], 7), answer([]))
    await source.ask()
    state.device = { key: key(2), partnerId: PARTNER_A }
    source.subscribe(() => void source.ask())
    await source.ask()
    expect(calls).toHaveLength(2)
  })

  it('reports a page that throws when it hears, and goes on: the others hear, and what was taken stays', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { source, calls, onSharingEnded, answer: give } = made()
      const heard = vi.fn()
      source.subscribe(() => {
        throw new Error('A page that throws')
      })
      source.subscribe(heard)
      onSharingEnded.mockImplementation(() => {
        throw new Error('A page that throws when sharing ends')
      })
      give(answer([flight('leg-1', [0])], 7), answer([flight('leg-1', [2], 2)], 8), { error: 'sharing_ended' })
      await source.ask()
      await source.ask()
      expect(heard).toHaveBeenCalledTimes(2)
      expect(calls.map((c) => c.after)).toEqual([null, 7])
      await source.ask()
      expect(source.flights.size).toBe(0)
      expect(onSharingEnded).toHaveBeenCalledTimes(1)
      expect(logged).toHaveBeenCalled()
    } finally {
      logged.mockRestore()
    }
  })

  it("starts from nothing with another device: the last one's flights go at once, and no cursor is sent", async () => {
    const { source, state, calls, answer: give } = made()
    give(answer([flight('leg-1', [0])], 7), new TypeError('Failed to fetch'), answer([], 2))
    await source.ask()
    state.device = { key: key(2), partnerId: PARTNER_A }
    await source.ask()
    expect(source.flights.size).toBe(0)
    await source.ask()
    expect(calls).toEqual([{ key: key(1), after: null }, { key: key(2), after: null }, { key: key(2), after: null }])
  })

  it('asks nothing, and forgets the flights, when this browser follows no one', async () => {
    const { source, state, calls, answer: give } = made()
    give(answer([flight('leg-1', [0])], 7))
    await source.ask()
    state.device = null
    await source.ask()
    expect(calls).toHaveLength(1)
    expect(source.flights.size).toBe(0)
  })
})

describe("Crewlu Cloud's clock (Stage 3 spec §11)", () => {
  it('follows the clock of the last answer', async () => {
    const { source, answer: give } = made()
    give(answer([], 1, NOW + HOUR))
    await source.ask()
    expect(source.clockOffset).toBe(HOUR)
    expect(source.serverTime(NOW + MINUTE)).toBe(NOW + HOUR + MINUTE)
  })

  it('measures it from the middle of a slow call', async () => {
    const { source, state, answer: give } = made()
    const call = later()
    give(call.answer)
    const asked = source.ask()
    state.clock = NOW + 10_000
    call.settle(answer([], 1, NOW + HOUR))
    await asked
    expect(source.clockOffset).toBe(HOUR - 5_000)
  })
})

describe('the 30-second check (Stage 3 spec §10.2, §11)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  /** A leg leaving in 10 minutes and landing in 2 hours. */
  const soon: LiveLeg = { id: 'leg-1', departure: NOW + 10 * MINUTE, arrival: NOW + 2 * HOUR }

  it('asks every 30 seconds while a window is open', async () => {
    const { source, calls, answer: give } = made()
    give(answer([]), answer([]), answer([]))
    source.watch([soon])
    await source.pageShown()
    await vi.advanceTimersByTimeAsync(LIVE_INTERVAL_MS)
    await vi.advanceTimersByTimeAsync(LIVE_INTERVAL_MS)
    source.pageHidden()
    expect(calls).toHaveLength(3)
  })

  it('asks nothing with no window open', async () => {
    const { source, calls, answer: give } = made()
    give(answer([]))
    source.watch([{ id: 'leg-1', departure: NOW + 5 * HOUR, arrival: NOW + 7 * HOUR }])
    await source.pageShown()
    await vi.advanceTimersByTimeAsync(3 * LIVE_INTERVAL_MS)
    source.pageHidden()
    expect(calls).toHaveLength(1)
  })

  it('keeps asking past the window while the flight is still seen in the air', async () => {
    const { source, calls, answer: give } = made()
    const landedLate: LiveLeg = { id: 'leg-1', departure: NOW - 6 * HOUR, arrival: NOW - 3 * HOUR }
    // Seen a minute ago, three hours after its arrival; the next answer brings no new point.
    give(answer([flight('leg-1', [-1])]), answer([flight('leg-1', [], 1)]))
    source.watch([landedLate])
    await source.pageShown()
    await vi.advanceTimersByTimeAsync(LIVE_INTERVAL_MS)
    source.pageHidden()
    expect(calls).toHaveLength(2)
  })

  it("measures the window by Crewlu Cloud's clock", async () => {
    const { source, calls, answer: give } = made()
    // By this browser's clock the leg leaves in 3 h 10 min, so its window is shut. Crewlu Cloud's clock is 3 h on.
    give(answer([], 1, NOW + 3 * HOUR), answer([], 1, NOW + 3 * HOUR))
    source.watch([{ id: 'leg-1', departure: NOW + 3 * HOUR + 10 * MINUTE, arrival: NOW + 5 * HOUR }])
    await source.pageShown()
    await vi.advanceTimersByTimeAsync(LIVE_INTERVAL_MS)
    source.pageHidden()
    expect(calls).toHaveLength(2)
  })

  it('asks by the windows of the legs it was last given, and keeps the flights until the next answer', async () => {
    const { source, calls, answer: give } = made()
    give(answer([flight('leg-1', [0])]), answer([]))
    source.watch([soon])
    await source.pageShown()
    source.watch([{ id: 'leg-2', departure: NOW + 5 * HOUR, arrival: NOW + 7 * HOUR }])
    await vi.advanceTimersByTimeAsync(LIVE_INTERVAL_MS)
    expect(calls).toHaveLength(1)
    expect(source.flights.has('leg-1')).toBe(true)
    source.watch([soon])
    await vi.advanceTimersByTimeAsync(LIVE_INTERVAL_MS)
    source.pageHidden()
    expect(calls).toHaveLength(2)
    expect(source.flights.size).toBe(0)
  })

  it('leaves one check running when the page is shown twice', async () => {
    const { source, calls, answer: give } = made()
    give(answer([]), answer([]), answer([]))
    source.watch([soon])
    await source.pageShown()
    await source.pageShown()
    await vi.advanceTimersByTimeAsync(LIVE_INTERVAL_MS)
    source.pageHidden()
    expect(calls).toHaveLength(3)
  })

  it('stops when the page is hidden', async () => {
    const { source, calls, answer: give } = made()
    give(answer([]))
    source.watch([soon])
    await source.pageShown()
    source.pageHidden()
    await vi.advanceTimersByTimeAsync(3 * LIVE_INTERVAL_MS)
    expect(calls).toHaveLength(1)
  })
})

describe("hearing the flights change", () => {
  it('tells its listeners when the flights change, and not when an answer changes nothing', async () => {
    const { source, answer: give } = made()
    const heard = vi.fn()
    const stop = source.subscribe(heard)
    give(answer([flight('leg-1', [0])], 7), answer([flight('leg-1', [], 1)], 7), answer([flight('leg-1', [2], 2)], 8), answer([], 8))
    await source.ask()
    await source.ask()
    expect(heard).toHaveBeenCalledTimes(1)
    await source.ask()
    expect(heard).toHaveBeenCalledTimes(2)
    stop()
    await source.ask()
    expect(heard).toHaveBeenCalledTimes(2)
  })

  it("has the new clock before its listeners hear", async () => {
    const { source, answer: give } = made()
    let offset: number | null = null
    source.subscribe(() => {
      offset = source.clockOffset
    })
    give(answer([flight('leg-1', [0])], 1, NOW + HOUR))
    await source.ask()
    expect(offset).toBe(HOUR)
  })
})
```

- [x] **Step 2: Run it to see it fail.**

```bash
npx vitest run tests/partner/liveSource.test.ts
```

Expected: FAIL: `src/partner/liveSource.ts` doesn't exist yet.

- [x] **Step 3: The source (spec §11, §12).**

**Create `src/partner/liveSource.ts`:**

```ts
import type { LiveFlight } from '../map/liveFlight'
import { isLiveWindowOpen } from '../map/liveWindow'
import { reportOnce } from '../reportOnce'
import { isRefused, type LiveFlightDoor, type Refused } from './door'
import type { LiveAnswer } from './liveAnswer'
import type { Device } from './store'

/**
 * The pilot's flights with live data, for one page (Stage 3 spec §11, §12), as the app's LiveFlightSource. It asks
 * partner_live once each time the page is shown, and every 30 seconds while a flight's window is open. The 30-second
 * check runs only between `pageShown()` and `pageHidden()`: the page keeps it out of the background by saying when it's
 * hidden, and it calls `pageHidden()` when it goes too, or the check runs on. A call already under way when the page is
 * hidden still brings its answer. One call is made at a time.
 */

/** A flight leg of the summary to ask about: its id, and its gate times moved by any reported delay. */
export interface LiveLeg {
  id: string
  departure: number
  arrival: number
}

/** How often it asks while a flight's window is open. */
export const LIVE_INTERVAL_MS = 30_000

export interface LiveSourceOptions {
  door: LiveFlightDoor
  /** This browser's device, read at every call: the store's `device()`. */
  device: () => Device | null
  /** partner_live said this browser's device is gone. */
  onSharingEnded: () => void
  /** This browser's clock. */
  now?: () => number
}

export interface LiveSource {
  /** Each flight Crewlu Cloud answered, by its leg's id. A leg with none has no live data. */
  readonly flights: ReadonlyMap<string, LiveFlight>
  /** Crewlu Cloud's clock minus this browser's, as of the last answer, so a wrong clock here doesn't age a fix. */
  readonly clockOffset: number
  /** Crewlu Cloud's time when this browser's clock says `t`. Fix ages and windows are measured against it. */
  serverTime(t: number): number
  /** The summary's flight legs, whenever they change: the 30-second check asks while one's window is open. */
  watch(legs: LiveLeg[]): void
  /** The page was shown: asks once, then every 30 seconds while a flight's window is open. */
  pageShown(): Promise<void>
  /** The page was hidden, or is going: nothing is asked until it's shown again. */
  pageHidden(): void
  /**
   * Asks Crewlu Cloud once, takes its answer, and settles when it has. While a call is under way, another asks nothing
   * more and settles with that one's answer: so a refresh by hand ends when the live plane is up to date.
   */
  ask(): Promise<void>
  /**
   * Hears each change of `flights`. Returns what stops it. An answer that moves only Crewlu Cloud's clock tells no one:
   * the page's own clock ages a fix.
   */
  subscribe(listener: () => void): () => void
}

/** Whose flights an answer holds: another device's, or another partner's, are another connection's. */
const connection = (device: Device | null) => (device ? `${device.partnerId} ${device.key}` : null)

const sameFlights = (a: ReadonlyMap<string, LiveFlight>, b: ReadonlyMap<string, LiveFlight>) =>
  a.size === b.size && [...a].every(([id, flight]) => JSON.stringify(flight) === JSON.stringify(b.get(id)))

export function makeLiveSource({ door, device, onSharingEnded, now = Date.now }: LiveSourceOptions): LiveSource {
  let flights: ReadonlyMap<string, LiveFlight> = new Map()
  let clockOffset = 0
  let legs: LiveLeg[] = []
  /** The last answer's cursor, sent back so only the trail points since then come. */
  let cursor: number | null = null
  /** The connection the flights were answered for. */
  let answeredFor: string | null = null
  /** The call under way, when there is one, and the connection it asks for. */
  let asking: { connection: string | null; call: Promise<void> } | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  const listeners = new Set<() => void>()

  const serverTime = (t: number) => t + clockOffset

  /** Calls the page back. A page that throws is reported, and the source goes on as if it hadn't. */
  function callBack(back: () => void) {
    try {
      back()
    } catch (error) {
      reportOnce('The live plane could not tell the page', error)
    }
  }

  function setFlights(next: ReadonlyMap<string, LiveFlight>) {
    if (sameFlights(flights, next)) return
    flights = next
    for (const listener of [...listeners]) callBack(listener)
  }

  /** Forgets the flights and the cursor: they were another connection's, or sharing has ended. */
  function forget() {
    cursor = null
    answeredFor = null
    setFlights(new Map())
  }

  /**
   * Makes `answer` the flights. One that isn't whole brings each flight's points since the cursor, which go after the
   * points already here. False, changing nothing, when a trail then holds another number of points than Crewlu Cloud
   * says the flight has. A whole answer is taken as it comes. `askedAt` is when its call went out, by this browser's
   * clock.
   */
  function take(answer: LiveAnswer, isWhole: boolean, askedAt: number): boolean {
    const answered = new Map<string, LiveFlight>()
    for (const { trailCount, ...flight } of answer.flights) {
      const trail = isWhole ? flight.trail : [...(flights.get(flight.legId)?.trail ?? []), ...flight.trail]
      if (!isWhole && trail.length !== trailCount) return false
      answered.set(flight.legId, { ...flight, trail })
    }
    cursor = answer.cursor
    // Crewlu Cloud read its clock somewhere inside the call: the call's middle is the best guess of when.
    clockOffset = answer.now - (askedAt + (now() - askedAt) / 2)
    setFlights(answered)
    return true
  }

  /** Whether `answer` is a refusal. sharing_ended forgets the flights and tells the page; any other keeps what's here. */
  function refused(answer: LiveAnswer | Refused): answer is Refused {
    if (!isRefused(answer)) return false
    if (answer.error === 'sharing_ended') {
      forget()
      callBack(onSharingEnded)
    }
    return true
  }

  /** One call to Crewlu Cloud, and what's kept of its answer. */
  async function askCrewluCloud(): Promise<void> {
    const asked = device()
    const asker = connection(asked)
    if (!asked || !asker) {
      // This browser follows no one now.
      forget()
      return
    }
    if (asker !== answeredFor) forget()
    const sent = cursor
    try {
      let askedAt = now()
      const answer = await door.live(asked.key, sent)
      if (hasLeft(asker) || refused(answer)) return
      if (!take(answer, sent == null, askedAt)) {
        // A trail doesn't add up: a point reached Crewlu Cloud after one with a later id, or the flight is new here and
        // has points from before the cursor. Every point, then.
        askedAt = now()
        const whole = await door.live(asked.key, null)
        if (hasLeft(asker) || refused(whole)) return
        take(whole, true, askedAt)
      }
      answeredFor = asker
    } catch {
      // Crewlu Cloud couldn't be reached, or its answer couldn't be read: what's here stays.
    }
  }

  /**
   * Whether this browser has left the connection `asker` asked for, by Disconnect or a join, while the call was out.
   * Its answer is that connection's then, and so is everything kept here, which goes.
   */
  function hasLeft(asker: string): boolean {
    if (connection(device()) === asker) return false
    forget()
    return true
  }

  function ask(): Promise<void> {
    const current = connection(device())
    // A call for another connection is let finish first, then this one is asked for.
    if (asking) return asking.connection === current ? asking.call : asking.call.then(ask)
    let settle!: () => void
    const call = new Promise<void>((resolve) => {
      settle = resolve
    })
    // Kept before the call starts, so a listener that asks while the flights are forgotten finds this one.
    asking = { connection: current, call }
    void askCrewluCloud().finally(() => {
      asking = null
      settle()
    })
    return call
  }

  /** The 30-second check: asks while any flight's window is open, by Crewlu Cloud's clock. */
  function check() {
    const at = serverTime(now())
    if (legs.some((leg) => isLiveWindowOpen(leg.departure, leg.arrival, flights.get(leg.id) ?? null, at))) void ask()
  }

  function pageHidden() {
    if (timer != null) clearInterval(timer)
    timer = null
  }

  return {
    get flights() {
      return flights
    },
    get clockOffset() {
      return clockOffset
    },
    serverTime,
    watch(next) {
      legs = next
    },
    pageShown() {
      pageHidden()
      timer = setInterval(check, LIVE_INTERVAL_MS)
      return ask()
    },
    pageHidden,
    ask,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
```

- [x] **Step 4: Run it to see it pass, then everything, then the build.**

```bash
npx vitest run tests/partner/liveSource.test.ts && npm test && npm run build
```

Expected: 31 tests in the file, then 146 test files and 3,208 tests in all, and the build ends `✓ built`.

- [x] **Step 5: Batch C's review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Task 7, against the spec's §11, partner-api.md's "When to call it", and the app's `LiveFlightSource.swift`. Make its fixes, rerun Step 4, and record what it found.

- [x] **Step 6: Batch C's checkpoint: Todd runs everything.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && npm run build
```

Expected: 146 test files and 3,208 tests pass, and the build ends `✓ built`.

- [x] **Step 7: Commit, on Todd's yes.**

```bash
git add src/partner/liveSource.ts tests/partner/liveSource.test.ts
git commit -m "The source that asks partner_live once when the page is shown and every 30 seconds while a flight's window is open, keeping each flight's trail, Crewlu Cloud's clock and the connection it asked for (Stage 3 spec §11, §12)"
```

---

### Task 8: The review of the whole branch, and the record

- [x] **Step 1: The whole branch's review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on every commit of this plan as one thing, against the spec's §4 to §7, §10.2, §10.6, §11, §12, §14 and §16.1. Make its fixes, run `npm test` and `npm run build`, and record what it found.
- [x] **Step 2: Todd runs everything once more** (Task 7 Step 6's command), if the review changed anything.
- [x] **Step 3: This plan's record.** Under "Changes made during execution": each review, each of Todd's runs (the count and the time), and each commit's hash.
- [x] **Step 4: Commit, on Todd's yes.**

```bash
git add docs/superpowers/plans/2026-11-15-moving-map-stage3c1-website-engine.md
git commit -m "Plan 3C-1, the website's engine for the real plane, with its record"
```

---

## What plan 3C-2 takes from this one

- **The status page owns one source:** `makeLiveSource({ door: liveDoor, device: () => store.device(), onSharingEnded })`. It calls `watch()` with the summary's flight legs whenever they change, `pageShown()` when the page becomes visible and when it opens, and `pageHidden()` when it's hidden and when it goes. That's what keeps the live plane from being asked for in the background. `onSharingEnded` should end sharing the way a refresh that meets `sharing_ended` does.
- **The legs to watch** are each flight leg's id and its gate times moved by its delay: a `Move`'s `id`, `start` and `end` as `toSchedule` makes them, before any real time replaces them. The demo has no door, and needs no source.
- **Legs that are one flight** are answered under the first of their ids in text order. Hand `watch()` one leg for them, and give each of the legs the answer.
- **One landing time:** a live flight's real times replace the schedule's where a summary becomes the engine's schedule (spec §12), so the countdown and the narrative need nothing of their own. The leg's real times are `LiveProgress.start` and `.end`. The plan is made from the delay-moved times before any real time replaces them.
- **Make the plan, the path and the record together,** once for each answer, and keep them together on the map's leg: `liveProgress` trusts that its record was made from the path and the plan it's handed.
- **The moment is Crewlu Cloud's** for the progress: `source.serverTime(Date.now())`. A replay's record is read at the moment on the timeline.
- **An answer that moves only Crewlu Cloud's clock tells no listener,** so the page's own clock (its once-a-second tick) is what ages a fix and turns a plane into an estimate.
- **The map chooses what to draw by `LiveProgress.phase`,** not by whether there's a real path: a flight that isn't live can still have one (back at the gate after a return, in a state this site doesn't know, or flown days ago).
- **Drawing:** `FlightPath.stretches` with their kinds, `planeDistance` and `ghostDistance` along the path, and `pointAtDistance`. The planned stretch behind an estimated plane, from `flownLength` to `planeDistance`, is dotted. The app's plan 3B-2 has the rest of the drawing's rules in its Task 6 table and its list of where it differs from the spec, which apply to the website too.
- **The label's words** are `liveLabelText`. "About" before a landing time, the pill, and the card's sentence are 3C-2's.
- **Until Crewlu Cloud's switch is `all`,** most families' asks come back with no flights. Todd's answer for the app (15 Nov 2026) was to leave it: each call is small.

## Changes made during execution

- **Todd's word (15 Nov 2026):** "run it". The steps are carried out by a script that applies this plan's own text, step by step in its order (each test first, seen to fail, then its code), and compares each file with the tested copy.
- **Batch A (Tasks 2 and 3, 15 Nov 2026):** every file came out the same as the tested one. 706 tests pass in `tests/partner`, `tests/viteConfig.test.ts` and `tests/data`, and `tsc` finds nothing. The review made before this plan was put together read these same files twice, against the spec's §10.6 and partner-api.md, so it stands for batch A's review (Task 3 Step 6): no new one was run.
- **Todd's run of batch A (15 Nov 2026, 11:37 pm EST):** 20 test files and 706 tests passed.
- **Batch A committed on Todd's "Yes, commit both" (15 Nov 2026), not pushed:** `47963b3` Task 2, `25c6ec9` Task 3.
- **Batch B (Tasks 4 to 6, 15 Nov 2026):** every file came out the same as the tested one, each test seen to fail before its code and pass after. 916 tests pass in `tests/map` and `tests/copy`, and `tsc` finds nothing. The review before this plan read these same files against the spec's §4 to §7 and §10.2 and the app's Swift, and its second look read `flightPlan.ts` after its one change, so it stands for batch B's review (Task 6 Step 5).
- **Todd's run of batch B (15 Nov 2026, 11:53 pm EST):** 42 test files and 916 tests passed.
- **Batch B committed on Todd's "Yes, commit all three" (15 Nov 2026), not pushed:** `32056eb` Task 4, `f589916` Task 5, `d4fd8b5` Task 6.
- **Batch C (Task 7, 15 Nov 2026):** both files came out the same as the tested ones, and the test was seen to fail before the source and pass after (31 tests). Then every test: 146 test files and 3,208 tests passed, and `npm run build` built, with `partner_live` in the built page's CSP. The review's second look read `liveSource.ts` in this same form, after its fixes, so it stands for batch C's review (Task 7 Step 5).
- **Todd's run of batch C (16 Nov 2026, 9:33 am EST):** 146 test files and 3,208 tests passed, and `npm run build` built.
- **Batch C committed on Todd's "Yes, commit it" (16 Nov 2026), not pushed:** `8c32b44` Task 7.
- **The whole branch's review (Task 8 Step 1, 16 Nov 2026):** a fresh `superpowers:code-reviewer` (`model: "sonnet"`) read `ee8f0cb..8c32b44` as one thing, against the spec's §4 to §7, §10.2, §10.6, §11, §12, §14 and §16.1, the app's Swift at `9f06e71` and partner-api.md's "The live plane". It found nothing critical or important. `tsc` was clean, the 63 test files it ran (1,660 tests) passed, and `live-cases.json` is the app's to the byte (sha256 `1861b4c9…0e9d` in both).
  - **The engine and the reader** (`flightPlan`, `flightPath`, `flightRecord`, `liveProgress`, `liveLabel`, `liveWindow`, `liveAnswer`, and the words) were read against the Swift line by line and found to be the same, branch for branch and boundary for boundary.
  - **`liveSource.ts` differs from `LiveFlightSource.swift` in five ways,** each harmless or better:
    - with no device it forgets;
    - a listener sees the new clock;
    - an ask for another connection waits for the call under way, then asks;
    - a listener that throws is reported once;
    - an answer for a device that has left can't end sharing for the next.
  - **Four minor findings, none changed:**
    1. `askCrewluCloud` reads `device()` outside its `try`, so a `device()` that threw would leave a rejection no one handles (nothing would hang). Left: the store's `device()` catches every storage error and can't throw, and `ask()` and `hasLeft()` read it outside a `try` as well.
    2. A cursor above 2^53 would lose digits in JSON. Left: Crewlu Cloud's ids are far below that.
    3. After `key_in_use` or `try_later` on a new connection, the next call forgets again. Left: nothing was kept, so nothing is lost.
    4. `PartnerDoor`'s comment says "Four of the partner RPCs". Left: the comment on `LiveFlightDoor` just below calls `partner_live` the fifth.
  - **Tests it would add:** none that matter. It noted that no test makes `device()` throw (finding 1) or sends a cursor that isn't a whole number below 2^53 (finding 2), and accepted both as they are.
- **No rerun (Task 8 Step 2):** the review changed nothing, so Todd's run of batch C (16 Nov 2026, 9:33 am EST, 146 test files and 3,208 tests, and the build) stands for the whole branch.
- **This plan committed on Todd's "Yes, commit the plan" (16 Nov 2026), with this record, not pushed** (Task 8 Step 4).

## Self-review

- **Spec coverage.**
  - §4, the plan and the plan as the plane flies it: Task 4. §5.1 to §5.5, the phases, the estimate, the label, the ghost and the estimated plane: Task 5. §6.1, the path: Task 4. §7.1, the real times: Task 5. §7.2, the record: Task 4. §10.2's window as a device keeps it: Task 6. §10.6, the answer and the call: Tasks 2 and 3. §11 and §12's source, its clock and `sharing_ended`: Task 7. §14, one new address in the CSP: Task 3. §16.1, the shared cases: Task 2, and every part of them runs (Tasks 4 to 6).
  - §16.4's tests for this part: the shared cases and the polling.
- **Not covered here, on purpose:** §6.2's drawing, §7.3's replay, §8's facts, §9's other words, the engine's real times in `src/engine/`, the demo scenes, and the source's owner. They're plans 3C-2 to 3C-4's.
- **Placeholders:** none. Every step's code is the tested file or the tested replacement.
- **Names** are the same in every task: `makeFlightPlan(departure, arrival, distance)`, `flownPlan(plan, path)`, `timeToFly(plan, distance)`, `distanceLeft(plan, ms)`, `timeInAir`, `taxiOut`, `taxiIn`, `makeFlightPath(origin, destination, flight)`, `pointAtDistance(path, distance)`, `makeFlightRecord(path, plan)`, `recordDistanceAt(record, t)`, `recordPositionAt(record, t)`, `recordTimeAt(record, distance)`, `liveLabel(phase, gapMinutes)`, `liveProgress(plan, path, record, flight, now)`, `gapMinutes(ms)`, `isLiveWindowOpen(departure, arrival, flight, now)`, `readLiveAnswer(answer)`, `readLiveFlight(value)`, `LiveFlightDoor.live(key, after)`, `makeLiveSource({ door, device, onSharingEnded, now })` with `flights`, `clockOffset`, `serverTime`, `watch`, `pageShown`, `pageHidden`, `ask` and `subscribe`, `minutesText(minutes)` and `liveLabelText(label)`.
- **Is it the right size?** Nine small modules, each with one job, as the app has them, and no new package. The one thing built ahead of its use is the source, which nothing owns until 3C-2: its rules (the cursor, the count, the connection, the clock) are the engine's, and they're tested here.
- **What could it break?**
  - The door gains a call, and the CSP one address on Crewlu Cloud. The guard still lets nothing else through, and the source rules still pass.
  - `landingCountdown` now writes its length through `minutesText`, with the same words: its tests pass unchanged.
  - Nothing a family sees reads the new modules, so nothing they see can change. `npm run build` builds, and the page it builds behaves as before, with a fifth address in its CSP.
- **Is it how this site is written?** Plain data and pure functions in `src/map/`, the door the only module that talks to Crewlu Cloud, every request through the guard, and a model with no DOM in it, which the page drives, as `refreshSummary` is driven by `useSchedule`.

## Left for later

- **Whether 3C-1 goes live on its own.** Merged to `main` alone, it would publish the CSP's fifth address and nothing else. It can as well wait for 3C-2. Todd's call, when 3C-2 is written.
- **The engine's own "Left for later"** in the app's plan holds here too: an approach's pattern makes the label read ahead near the landing; whether 3 minutes is long enough before a plane fades; the speed of a cruise stretch where two places share one time; a flight back on the ground after a return keeps its first attempt's trail; asks that come back empty until the switch is `all`; and a trail count that stays wrong would make every run ask twice.
- **The reader takes any number where the contract has a range:** a latitude, a track, a count. So does the app's. Crewlu Cloud checks each fix before it keeps it (spec §10.5), and one part it can't read drops the whole answer, as in the app.
- **The app's source has the two gaps this plan's review closed:** it keeps the last key's flights after an answer it drops, and a new key's ask can be settled by the last key's call. The app's plan 3B-2 accepted the first ("matched by leg id, and nothing reads them with no status up") and noted the second as up to 30 seconds after joining. Mending the app is for a plan of its own, if Todd wants it.
