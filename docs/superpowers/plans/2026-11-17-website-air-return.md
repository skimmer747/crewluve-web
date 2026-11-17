# The Website's Air Return Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The website follows the app on an air return. Today, a plane that takes off and lands back at its departure airport reads "Still on the ground in Rockford", the same as a plane that never left. After this plan it reads "Returned to Rockford" wherever the app says so. If the plane takes off again, its path starts from the second takeoff. Then this plan goes live, on Todd's yes.

**Architecture:**
- **The rule** (Task 2), the app's reference `live.mjs`, lives in `src/map/flightPath.ts`:
  - `isBack` says the plane is back at its departure airport.
  - `latestTry` gives the trail of its latest try, and the path is made from that try alone.
  - `liveProgress.ts` has the new phase `returned`, and `liveLabel.ts` the new label. The app's new shared cases test them.
- **The words** (Task 3):
  - `isAtDeparture` holds for a plane back at its departure airport, so all the "still on the ground" behavior follows.
  - `hasReturned` and `legReturned` swap in "Returned to Rockford" on the bar, the popup, the facts and the card's sentence.
  - `FlightOnGround` does the same under the timeline.
- **The status sentence** (Task 4): `returnedFlight`, then "has returned to" in the narrative.
- **The demo** (Task 5): `live-returned`.

**Tech Stack:** Preact 10, TypeScript 5.9 (strict), Vite 5, Vitest 3. No new package.

**Sources (read only, in `~/Dev/Crewluv` at `c935f21` on `feature/trip-map-live`):**
- **The design:** `docs/superpowers/specs/2026-11-17-air-return-design.md`, approved by Todd on 17 Nov 2026, from this website session's request ("Send it to the app's session").
  - §2: when a plane has returned.
  - §3: while it's back, and its words.
  - §4: a second takeoff starts the path afresh.
  - §5: the tests.
  - §6: what's left for later.
- **Todd's decision for the website (17 Nov 2026):** "Write the plan, then run it", on the words above and a new demo scene.
- **The app's plan,** `docs/superpowers/plans/2026-11-17-air-return.md`, and its commits:
  - `3128507`: the reference and the cases.
  - `2a9e33b`: the engine.
  - `113006d`: the words.
  - `e084213`: the status sentence.
  - The app's tests are `CrewluvTests/AirReturnTests.swift` and `AirReturnWordsTests.swift`. This plan's names and answers follow theirs.
- **The reference,** `scripts/live-cases/live.mjs` (`hasClimbed`, `isBack`, `latestTry`, `progress`, `labelFor`), writes the shared cases, `CrewluvTests/Fixtures/TripMap/live-cases.json`. Task 2 copies that file whole.

**How this plan was checked.** Every code block here comes from a file that was run before the plan was put together. None was typed into the plan by hand: a script made each replacement from the tested files and built the plan.
- **A scratch copy of this branch** at `74acf06`, with this plan's files laid over it task by task. Every count below is the same in this Mac's time zone and in UTC (`TZ=UTC`), as GitHub's build runs.
  - Before: 178 test files and 3,790 tests, all passing, and `tsc --noEmit` clean.
  - After Task 2: 179 test files and 3,827 tests. After Task 3: 179 test files and 3,842 tests. After Task 4: 179 test files and 3,848 tests. After Task 5: 179 test files and 3,853 tests.
  - Each time, all of them pass, `tsc --noEmit` finds nothing, and `npm run build` builds.
  - The shared cases: `live-cases.json` is the app's at `c935f21`, byte for byte, and passes. `facts-cases.json` is unchanged, and passes.
- **Tests first:** each task's tests were run before its code, and failed as its Step 2 says: 29 of 348 in Task 2, 15 of 154 in Task 3, 5 of 98 in Task 4, and 3 of 154 in Task 5.
- **39 deliberate breaks** were made in the new code, one at a time, and every one fails at least one test.
  - Task 2's 15: any climb at all; a point with no height counted at sea level; no restart gap; a restart after a point far from the airport; a restart at a point anywhere; a restart before the climb; the fix starts no try; the whole trail is the path; back with no climb; back anywhere; back while still flying; never returned; a ghost while back; no landing estimate while back; a label only with a gap.
  - Task 3's 12: back isn't at the departure airport; still on the ground read as back; the bar's bare label; the bar names the arrival airport; the card's sentence's bare label; the timeline says on the ground; the timeline never told it's back; the timeline tells it in a replay; the popup names no airport; the facts say still on the ground; the first row says still on the ground; the headline in a replay.
  - Task 4's 6: every plane at the gate is back; no plane is back; the sentence never says it; the sentence says it of another flight; the status screen drops it; the page drops it.
  - Task 5's 6: no return in the scene; back after the page opens; no climb; down at the arrival airport; the flight to Rockford; opens before the leg.
- **The plan itself** is checked by a script. Tasks 2 to 5's steps, followed in order on the branch's files at `74acf06`, give every file as tested.
- **A dry run:** the steps were followed again on a fresh copy of those files, tests first:
  - every file came out the same as tested;
  - the tests failed and passed as Steps 2 and 4 say;
  - the copy's tests (179 test files and 3,853 tests, in both time zones), `tsc --noEmit` and the build passed.
- **Not checked:**
  - Nothing was seen in a browser: the scene is Todd's look, Task 6.
  - Task 7's review of the commits is still to come.
- **A review before the plan** (`superpowers:code-reviewer`, sonnet) of the tested files against the app's design, `live.mjs` and its Swift:
  - It found no Critical or Important issue. The engine matches `live.mjs`, every word matches the design's §3, there's no import cycle, and every switch over the phase or the label handles `returned`.
  - Two of its minor points are taken here:
    - the new status page test reads the time zone's name as any word, so it passes in any zone the tests run in;
    - a test pins the restart's 10 minutes at their edge.
  - Its others are left:
    - the card's heading is the website's own (below);
    - `flightOnGround` looks the flight up twice;
    - four older status page tests name the zone with capitals alone, and fail where the Mac's zone is named "GMT+13". CI runs in UTC, so they pass there. That's a follow-up of its own, not this plan's.
  - Nothing called Crewlu Cloud or adsb.lol, and nothing used the network.

**Where this plan settles details.**
- **Where the rule lives:**
  - `isBack`, `latestTry`, `RETURN_CLIMB_FEET` and `RESTART_GAP_MS` are in `src/map/flightPath.ts`, since the path is made from `latestTry`. `hasClimbed` and the sorted trail stay private there.
  - `AIRPORT_RADIUS` moves there too, beside `FIRST_POINT_RADIUS`, and `liveProgress.ts` exports it as before, so every import of it stands.
  - `liveProgress.ts` already imports from `flightPath.ts`. With the radius there, no module imports values from another that imports values back.
- **Heights:** the trail's `altitudeFt` is already read from the door's fourth value, as the app's `feet: p[3]` now is. Nothing in the door changes.
- **The label** `returned` has no minutes, as the app's has none:
  - `liveLabelText` says "Returned", as the shared cases do.
  - Where the words name the airport, `flightStatus` (the card's bar and the full map's pill), the popup and the card's sentence say "Returned to Rockford" or "returned to Rockford", from the leg's origin.
  - A replay's bar says "In flight", as before.
- **"Now only":** every surface reads the live data at now, as "Still on the ground" does.
  - The facts' `isStillOnGround` already leaves a replay alone.
  - The line under the timeline is passed none in a replay.
  - The bar is "In flight" in a replay.
  - A replay reads where the map has the plane: the schedule's, as the way out and back isn't the path.
- **The card's heading for screen readers** stays "On the ground", true of a plane back there. The app has no such heading. Todd saw it unchanged in the question, and said go on.
- **`FlightOnGround`,** the app's, replaces `timelineLine`'s and `timelineSpokenValue`'s two airports:
  - `{ kind: 'stillIn' | 'returnedTo' | 'landedIn', airport }`, from `flightOnGround` (`src/map/tripActivity.ts`).
  - `stillOnGroundIn` and `landedIn` stay, as its parts, with their tests.
- **The narrative** gets `returnedFlight` beside `stillOnGroundFlight`, as `landedFlight` came: a leg's id from `src/engine/liveLegs.ts`, through `PilotPages` and `StatusScreen`.
- **The demo scene** `live-returned` is UPS2963, Rockford to Anchorage, the flight `live-on-ground-late` holds at the gate.
  - It's off on time, out 40 nm and back, climbing to 9,000 ft at the turn, and on the ground again 30 minutes after the takeoff.
  - The page opens 50 minutes after the plan's takeoff (offset 290).
  - A replay of it flies the schedule, as the way out and back isn't drawn (the design's §6).
- **Left as the app leaves them (the design's §6):**
  - A return to another airport is a diversion.
  - A flight cancelled after a return reads "Returned" until Crewlu Cloud stops watching it.
  - The first out-and-back isn't drawn.

---

## Ground rules for whoever runs this plan

These come from Todd's standing instructions. They override the skill's defaults.

1. **Work only in this worktree:** `/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046`, on its branch `claude/trip-map-live-598046`, at `74acf06` or later.
   - Never edit the main checkout, `/Users/toddanderson/Dev/Crewluve Website`: its untracked plan file isn't this work's.
   - `~/Dev/Crewluv` is shared with other sessions. Only read it (`git -C ~/Dev/Crewluv show`, `log`, `ls-tree`): change, stash, reset or switch nothing there.
2. **Never commit without Todd's yes in the conversation,** and then only the task's own files, by path. **Never push, and never merge into `main`,** but in Task 8, on Todd's yes then.
3. **The tests:** the session runs them as it works (`npx vitest run <files>`, `npm test`, `TZ=UTC npm test`, `npm run build`). At the checkpoints (Tasks 2 to 5, Step 5), Todd runs the command himself. Don't change files while he's running them, and don't ask for a run until the files are final.
4. **The shared cases are the judge.** `tests/fixtures/trip-map/live-cases.json` and `facts-cases.json` are the app's, never edited: Task 2 copies the first whole from the app's commit `c935f21`. If a case fails, the code is wrong. If you believe a case is wrong, STOP and tell Todd.
5. **Copy the code as written.** It was run as it stands. A replacement is exact: its text is in the file once. If it isn't, stop: the file has changed since this plan was written.
6. **Nothing here calls Crewlu Cloud or adsb.lol.** Every test uses a stand-in, and the tests can't reach the network. Change nothing in Crewlu Cloud's live Supabase project, and don't read it.
7. **Unchanged:** every request to Crewlu Cloud still goes through the door and its guard (`tests/data/doorRules.test.ts` and `doorRulesScan.test.ts` must pass), no `innerHTML`, no download, no `npm install`.
8. **A clock time in a test is the viewer's zone's, never the Mac's:** GitHub's build runs in UTC. Each task's Step 4 runs the suite in UTC too.
9. **Reviewers:** dispatch `superpowers:code-reviewer` with `model: "sonnet"`.
10. **No release note.** The website has none; Task 8 says what went live in this plan's record.

## File map

| File | Task | Responsibility |
|---|---|---|
| `tests/fixtures/trip-map/live-cases.json` | copy (2) | the app's shared cases at `c935f21`: two constants, four flights, two labels |
| `src/map/flightPath.ts` | modify (2) | `AIRPORT_RADIUS`, `RETURN_CLIMB_FEET`, `RESTART_GAP_MS`, `isBack`, `latestTry`, and the path from the latest try |
| `src/map/liveProgress.ts`, `src/map/liveLabel.ts` | modify (2) | the phase `returned`, and its label |
| `src/copy/tripMap.ts` | modify (2, 3) | the label's words (2); `returnedText`, the bar, the card's sentence and the line under the timeline (3) |
| `src/copy/planePopup.ts` | modify (2, 3) | the popup with the label (2), naming the airport (3) |
| `tests/map/liveCases.ts`, `tests/map/flightPath.test.ts`, `tests/map/liveProgress.test.ts` | modify (2) | the new constants and phase |
| `tests/map/airReturn.test.ts` | create (2) | the rule beyond the shared cases |
| `src/map/mapFlight.ts`, `src/map/tripMap.ts`, `src/map/tripActivity.ts`, `src/ui/TripTimeline.tsx` | modify (3) | `isAtDeparture`, `hasReturned`, `legReturned`, `FlightOnGround` |
| `src/facts/tripFacts.ts`, `src/facts/tripFactsRows.ts` | modify (3) | `atDepartureText`: the headline, the chip and the first row |
| `tests/map/liveTrip.ts` and five test files | modify (3) | `backAtTheGate`, and the words' tests |
| `src/engine/liveLegs.ts`, `src/copy/narrative.ts`, `src/ui/StatusScreen.tsx`, `src/ui/PilotPages.tsx` | modify (4) | `returnedFlight`, and "has returned to" |
| `tests/engine/liveLegs.test.ts`, `tests/copy/narrativeAway.test.ts`, `tests/ui/livePages.test.tsx` | modify (4) | the status sentence's tests |
| `src/data/demoLive.ts`, `src/data/demo.ts`, `README.md` | modify (5) | the demo scene `live-returned` |
| `tests/data/demoLive.test.ts`, `tests/data/demoScenes.test.ts`, `tests/ui/StatusScreen.test.tsx` | modify (5) | the scene |

Four code tasks, then:
- Task 6: Todd's look at the demo scene.
- Task 7: the review and this plan's record.
- Task 8: going live, on Todd's yes.

---

### Task 1: Before starting

- [x] **Step 1: Check the worktree and the branch, and the app's commit.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git status --short && git branch --show-current && git log --oneline -1 && git -C ~/Dev/Crewluv cat-file -t c935f21
```

Expected:
- Nothing changed but this plan's file.
- The branch `claude/trip-map-live-598046`.
- `74acf06`, or a later commit of this plan's.
- `commit`.

- [x] **Step 2: Read the design** (`git -C ~/Dev/Crewluv show c935f21:docs/superpowers/specs/2026-11-17-air-return-design.md`), and this plan's "Where this plan settles details".

---

### Task 2: The rule, the path from the latest try, and the new shared cases (design §2, §4)

The app's rule, as its reference `live.mjs` has it. `isBack` (`src/map/flightPath.ts`, the app's `LiveFlight.isBack(at:)`): on the ground by Crewlu Cloud's state, the fix within `AIRPORT_RADIUS` (10 nm) of the departure airport, and the whole trail climbed `RETURN_CLIMB_FEET` (1,000 ft), its highest point over its lowest, points with no height left out. `latestTry` (the app's `LiveFlight.latestTry(from:)`): the trail from its last restart, a point within `FIRST_POINT_RADIUS` (30 nm) of the airport more than `RESTART_GAP_MS` (10 minutes) after a point within 10 nm of it, once the try before had climbed; the fix in the air can start one too; none while the plane is back. The path is made from the latest try alone, so the record and the plane's own speed follow it. `AIRPORT_RADIUS` moves beside `FIRST_POINT_RADIUS` in `flightPath.ts`, and `liveProgress.ts` still exports it, so neither module imports the other's values both ways. The phase `returned` (`src/map/liveProgress.ts`): a fresh ground fix within 10 nm of the departure airport that `isBack`; it lands as `onGround` does past the plan's takeoff, the plane is at its fix, and it has no ghost. The label `returned` (`src/map/liveLabel.ts`), whatever the gap, reads "Returned" and is spoken "returned" (`src/copy/tripMap.ts`); the popup says it with the landing time, as for a plane still at the gate, until Task 3 names the airport. The shared cases come first, copied whole from the app at `c935f21`: two constants, four flights and two labels.

**Files:**
- Modify: `src/copy/planePopup.ts`, `src/copy/tripMap.ts`, `src/map/flightPath.ts`, `src/map/liveLabel.ts`, `src/map/liveProgress.ts`
- Copy from the app: `tests/fixtures/trip-map/live-cases.json`
- Create: `tests/map/airReturn.test.ts`
- Test: `tests/map/flightPath.test.ts`, `tests/map/liveCases.ts`, `tests/map/liveProgress.test.ts`

- [x] **Step 1: Copy the shared cases, and write the tests.**

**Copy `tests/fixtures/trip-map/live-cases.json` whole from the app's commit `c935f21`:**

```bash
git -C ~/Dev/Crewluv show c935f21:CrewluvTests/Fixtures/TripMap/live-cases.json > tests/fixtures/trip-map/live-cases.json
shasum -a 256 tests/fixtures/trip-map/live-cases.json
```

Expected checksum: `4f8b45b95ab5d970134cf1adcf63ee83e944cdaed942973357648f0b20cae83a`. Don't edit the file.

**Create `tests/map/airReturn.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { isBack, latestTry } from '../../src/map/flightPath'
import type { TrailPoint } from '../../src/map/liveFlight'
import { airport } from './liveCases'
import { fix, liveFlight, point } from './madeUpFlights'

/** An air return's rule beyond the shared cases (air return design §2, §4), from Louisville. */
const SDF = airport('SDF')
const at = (minutes: number, lat: number, lng: number, feet: number | null): TrailPoint => ({ ...point(minutes, lat, lng), altitudeFt: feet })
/** Out 40 nm east and back, from 2,000 ft up to `top` and down to 3,000. */
const outAndBack = (top: number | null) => [at(17, 38.25, -85.55, 2_000), at(23, 38.45, -85.0, top), at(29, 38.3, -85.4, 3_000)]
const onTheGround = (trail: TrailPoint[]) =>
  liveFlight(trail, { state: 'ground', fix: fix(44, SDF.lat, SDF.lng, { onGround: true }) })

describe('a plane back at its departure airport (air return design §2)', () => {
  it('has climbed 1,000 ft, the highest point of its trail over the lowest', () => {
    expect(isBack(onTheGround(outAndBack(9_000)), SDF)).toBe(true)
    // 3,000 over 2,000 is 1,000 ft.
    expect(isBack(onTheGround(outAndBack(null)), SDF)).toBe(true)
    expect(isBack(onTheGround([at(17, 38.25, -85.55, 2_000), at(23, 38.45, -85.0, 2_999)]), SDF)).toBe(false)
  })

  it('counts no point with no height, and no trail at all', () => {
    expect(isBack(onTheGround([at(17, 38.25, -85.55, null), at(23, 38.45, -85.0, null)]), SDF)).toBe(false)
    // 2,500 over 2,000 is 500 ft: the point with no height isn't at sea level.
    expect(isBack(onTheGround([at(17, 38.25, -85.55, null), at(23, 38.45, -85.0, 2_000), at(29, 38.3, -85.4, 2_500)]), SDF)).toBe(false)
    expect(isBack(onTheGround([]), SDF)).toBe(false)
  })

  it('is on the ground by Crewlu Cloud’s state, within 10 nm of the airport', () => {
    const flown = onTheGround(outAndBack(9_000))
    expect(isBack({ ...flown, state: 'airborne' }, SDF)).toBe(false)
    expect(isBack({ ...flown, state: 'landed' }, SDF)).toBe(false)
    // 11 nm north of the airport.
    expect(isBack({ ...flown, fix: fix(44, SDF.lat + 11 / 60, SDF.lng, { onGround: true }) }, SDF)).toBe(false)
    expect(isBack(null, SDF)).toBe(false)
  })
})

describe('a flight’s latest try (air return design §4)', () => {
  /** Off again an hour after the air return, its first new point 18 nm out, and seen again 4 minutes later. */
  const again = [at(90, 38.4, -85.4, 4_000), at(94, 38.6, -85.0, 12_000)]

  it('is the trail from a second takeoff on', () => {
    const flight = liveFlight([...outAndBack(9_000), at(31, 38.18, -85.7, 1_500), ...again], { fix: fix(95, 38.62, -84.95) })
    expect(latestTry(flight, SDF)).toEqual(again)
  })

  it('isn’t restarted by a long gap away from the airport', () => {
    // Unseen for 40 minutes over the ocean of the way, far from Louisville.
    const far = [at(17, 38.25, -85.55, 2_000), at(30, 39.0, -80.0, 30_000), at(70, 39.5, -75.5, 30_000)]
    expect(latestTry(liveFlight(far, { fix: fix(71, 39.52, -75.4) }), SDF)).toEqual(far)
  })

  it('is restarted only after more than 10 minutes unseen', () => {
    // Back near the airport at 31, and seen 21 nm out exactly 10 minutes later: a hold, not a second takeoff.
    const hold = [...outAndBack(9_000), at(31, 38.18, -85.7, 1_500), at(41, 38.4, -85.4, 4_000)]
    expect(latestTry(liveFlight(hold, { fix: fix(42, 38.41, -85.38) }), SDF)).toEqual(hold)
    const later = [...outAndBack(9_000), at(31, 38.18, -85.7, 1_500), at(41.5, 38.4, -85.4, 4_000)]
    expect(latestTry(liveFlight(later, { fix: fix(42, 38.41, -85.38) }), SDF)).toEqual(later.slice(4))
  })

  it('isn’t restarted after a gap that began away from the airport', () => {
    // Out 40 nm and climbing, unseen for 22 minutes, and seen again 21 nm from Louisville.
    const circling = [at(17, 38.25, -85.55, 2_000), at(23, 38.45, -85.0, 9_000), at(45, 38.4, -85.4, 4_000)]
    expect(latestTry(liveFlight(circling, { fix: fix(46, 38.41, -85.38) }), SDF)).toEqual(circling)
  })

  it('isn’t restarted by a point first seen more than 30 nm out', () => {
    // Back near the airport at 29, then first seen again 80 nm out, which can't tell a takeoff.
    const far = [...outAndBack(9_000).slice(0, 2), at(29, 38.18, -85.7, 1_500), at(60, 38.9, -84.3, 20_000)]
    expect(latestTry(liveFlight(far, { fix: fix(61, 38.92, -84.25) }), SDF)).toEqual(far)
  })

  it('isn’t restarted before the first try has climbed: a stray point while taxiing', () => {
    const stray = [at(5, 38.18, -85.73, 500), at(20, 38.25, -85.55, 2_000), at(24, 38.45, -85.0, 9_000)]
    expect(latestTry(liveFlight(stray, { fix: fix(25, 38.46, -84.95) }), SDF)).toEqual(stray)
  })

  it('is none while the plane is back on the ground, and none from a fix in the air that starts a try of its own', () => {
    expect(latestTry(onTheGround(outAndBack(9_000)), SDF)).toEqual([])
    const offAgain = liveFlight([...outAndBack(9_000), at(31, 38.18, -85.7, 1_500)], { fix: fix(90, 38.4, -85.4) })
    expect(latestTry(offAgain, SDF)).toEqual([])
    expect(latestTry(null, SDF)).toEqual([])
  })
})
```

**In `tests/map/flightPath.test.ts`, replace (1 of 2):**

```ts
import { describe, expect, it } from 'vitest'
import { FIRST_POINT_RADIUS, makeFlightPath, OWN_SPEED_LEAST_MS, pointAtDistance, UNSEEN_GAP_MS, type FlightPath, type StretchKind } from '../../src/map/flightPath'
import { distanceMeters, METERS_PER_NM } from '../../src/map/greatCircle'
```

**with:**

```ts
import { describe, expect, it } from 'vitest'
import {
  FIRST_POINT_RADIUS, makeFlightPath, OWN_SPEED_LEAST_MS, pointAtDistance, RESTART_GAP_MS, RETURN_CLIMB_FEET, UNSEEN_GAP_MS, type FlightPath,
  type StretchKind,
} from '../../src/map/flightPath'
import { distanceMeters, METERS_PER_NM } from '../../src/map/greatCircle'
```

**In `tests/map/flightPath.test.ts`, replace (2 of 2):**

```ts
    expect(OWN_SPEED_LEAST_MS).toBe(c.ownSpeedLeastMinutes * MINUTE)
  })
```

**with:**

```ts
    expect(OWN_SPEED_LEAST_MS).toBe(c.ownSpeedLeastMinutes * MINUTE)
    expect(RETURN_CLIMB_FEET).toBe(c.returnClimbFeet)
    expect(RESTART_GAP_MS).toBe(c.restartGapMinutes * MINUTE)
  })
```

**In `tests/map/liveCases.ts`, replace:**

```ts
    ownSpeedAheadMinutes: number
    windowOpensMinutesBefore: number
```

**with:**

```ts
    ownSpeedAheadMinutes: number
    returnClimbFeet: number
    restartGapMinutes: number
    windowOpensMinutesBefore: number
```

**In `tests/map/liveProgress.test.ts`, replace:**

```ts
    const phases = new Set(LIVE_CASES.flights.flatMap((c) => c.moments.map((m) => m.phase)))
    expect([...phases].sort()).toEqual(['elsewhere', 'estimated', 'inAir', 'landed', 'notLive', 'onGround'])
  })
```

**with:**

```ts
    const phases = new Set(LIVE_CASES.flights.flatMap((c) => c.moments.map((m) => m.phase)))
    expect([...phases].sort()).toEqual(['elsewhere', 'estimated', 'inAir', 'landed', 'notLive', 'onGround', 'returned'])
  })
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/map/airReturn.test.ts tests/map/flightPath.test.ts tests/map/liveProgress.test.ts tests/copy/planePopup.test.ts tests/engine/liveLegs.test.ts tests/facts/legCourse.test.ts tests/facts/planePosition.test.ts tests/map/flightDrawing.test.ts tests/map/flightRecord.test.ts tests/map/liveLabel.test.ts tests/map/mapFlight.test.ts
```

Expected: 29 of the 348 tests fail, in eleven files. The ten of `tests/map/airReturn.test.ts`, because `isBack` and `latestTry` aren't there yet. The shared cases' constants, because `RETURN_CLIMB_FEET` and `RESTART_GAP_MS` aren't. The two new labels, in `tests/map/liveLabel.test.ts`, because there's no `returned`. And the three new air return cases wherever a file reads every case: the path in `tests/map/flightPath.test.ts`, the moments in `liveProgress.test.ts` and the record in `flightRecord.test.ts` (three each), `tests/facts/planePosition.test.ts` (two: now and in a replay), and one each in `mapFlight.test.ts`, `flightDrawing.test.ts`, `tests/facts/legCourse.test.ts`, `tests/engine/liveLegs.test.ts` and `tests/copy/planePopup.test.ts`. The code still makes the path from the whole trail and calls a plane back at the airport `onGround`. The rest pass already, as they should, the stray point while taxiing among them: it stays `onGround`, and the phases' test reads the cases' own phases.

- [x] **Step 3: Write the code.**

**In `src/copy/planePopup.ts`, replace:**

```ts
    case 'onGround':
    case 'inAir':
```

**with:**

```ts
    case 'onGround':
    case 'returned':
    case 'inAir':
```

**In `src/copy/tripMap.ts`, replace (1 of 2):**

```ts
      return label.minutesBehind == null ? 'Still on the ground' : `Still on the ground · ${minutesText(label.minutesBehind)} behind`
    case 'landedOnTime':
```

**with:**

```ts
      return label.minutesBehind == null ? 'Still on the ground' : `Still on the ground · ${minutesText(label.minutesBehind)} behind`
    case 'returned':
      // The bar names the airport: "Returned to Rockford" (`flightStatus`, air return design §3).
      return 'Returned'
    case 'landedOnTime':
```

**In `src/copy/tripMap.ts`, replace (2 of 2):**

```ts
      return label.minutesBehind == null ? 'still on the ground' : `still on the ground, ${spokenMinutes(label.minutesBehind)} behind schedule`
    case 'landedOnTime':
```

**with:**

```ts
      return label.minutesBehind == null ? 'still on the ground' : `still on the ground, ${spokenMinutes(label.minutesBehind)} behind schedule`
    case 'returned':
      return 'returned'
    case 'landedOnTime':
```

**In `src/map/flightPath.ts`, replace (1 of 5):**

```ts
import { distanceMeters, METERS_PER_NM, pointAlong, type GeoPoint } from './greatCircle'
import type { LiveFlight } from './liveFlight'

```

**with:**

```ts
import { distanceMeters, METERS_PER_NM, pointAlong, type GeoPoint } from './greatCircle'
import type { LiveFlight, TrailPoint } from './liveFlight'

```

**In `src/map/flightPath.ts`, replace (2 of 5):**

```ts
export const OWN_SPEED_LEAST_MS = 10 * MINUTE

```

**with:**

```ts
export const OWN_SPEED_LEAST_MS = 10 * MINUTE
/** On the ground this close to the departure airport is at it: 10 nautical miles. */
export const AIRPORT_RADIUS = 10 * METERS_PER_NM
/**
 * A trail whose highest point is this much above its lowest has flown: 1,000 ft (air return design §2). Heights are from
 * sea level, and a plane taxiing at Denver reads 5,400 ft, so it's a climb, not a height.
 */
export const RETURN_CLIMB_FEET = 1000
/**
 * A point near the departure airport this long after the one before it, which was near it too, starts the trail again:
 * 10 minutes (air return design §4). Points come every 2 minutes in the air, so a hold near the airport never leaves
 * this gap.
 */
export const RESTART_GAP_MS = 10 * MINUTE

```

**In `src/map/flightPath.ts`, replace (3 of 5):**

```ts

/** The path of a flight from `origin` to `destination`: the real one when `flight` has been seen in the air. */
export function makeFlightPath(origin: GeoPoint, destination: GeoPoint, flight: LiveFlight | null = null): FlightPath {
  const seen = sightings(flight)
  const first = seen[0]
```

**with:**

```ts

/**
 * The path of a flight from `origin` to `destination`: the real one when `flight` has been seen in the air on its latest
 * try (air return design §4).
 */
export function makeFlightPath(origin: GeoPoint, destination: GeoPoint, flight: LiveFlight | null = null): FlightPath {
  const seen = sightings(flight, origin)
  const first = seen[0]
```

**In `src/map/flightPath.ts`, replace (4 of 5):**

```ts
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
```

**with:**

```ts
/**
 * Each place `flight` from `origin` was seen in the air on its latest try, oldest first: that try's trail points
 * (`latestTry`), and then its fix, when that's in the air and newer than the last of them. An air return and the wait
 * after it aren't the flight's path (air return design §4).
 */
function sightings(flight: LiveFlight | null, origin: GeoPoint): Sighting[] {
  const seen: Sighting[] = latestTry(flight, origin).map((point) => ({ place: point.place, time: point.time }))
  const fix = flight?.fix
```

**In `src/map/flightPath.ts`, replace (5 of 5):**

```ts
  return seen
}
```

**with:**

```ts
  return seen
}

/** The trail of `flight`, oldest first, with two points of one time in the order they came. */
const sortedTrail = (flight: LiveFlight): TrailPoint[] =>
  flight.trail
    .map((point, order) => ({ point, order }))
    .sort((a, b) => a.point.time - b.point.time || a.order - b.order)
    .map(({ point }) => point)

/** Whether the highest of `points` is RETURN_CLIMB_FEET or more above the lowest. Points with no height don't count. */
function hasClimbed(points: TrailPoint[]): boolean {
  const feet = points.flatMap((p) => (p.altitudeFt == null ? [] : [p.altitudeFt]))
  return feet.length > 0 && Math.max(...feet) - Math.min(...feet) >= RETURN_CLIMB_FEET
}

/**
 * Whether the plane of `flight` is back on the ground at its departure airport, at `origin`, after flying (air return
 * design §2): on the ground by Crewlu Cloud's state, its fix within AIRPORT_RADIUS of the airport, and its whole trail
 * climbed RETURN_CLIMB_FEET. How old the fix is isn't asked: `liveProgress` asks that.
 */
export function isBack(flight: LiveFlight | null, origin: GeoPoint): boolean {
  const fix = flight?.fix
  if (!flight || flight.state !== 'ground' || !fix) return false
  return distanceMeters(fix.place, origin) <= AIRPORT_RADIUS && hasClimbed(flight.trail)
}

/**
 * The trail of the flight's latest try, oldest first (air return design §4). A try starts again at a place seen in the
 * air within FIRST_POINT_RADIUS of `origin` more than RESTART_GAP_MS after the point before it, which was within
 * AIRPORT_RADIUS, once the try before had climbed RETURN_CLIMB_FEET. The fix in the air, when it's newer than the trail,
 * can start one too, with no trail points yet. None while the plane is back on the ground there.
 */
export function latestTry(flight: LiveFlight | null, origin: GeoPoint): TrailPoint[] {
  if (!flight || isBack(flight, origin)) return []
  const points = sortedTrail(flight)
  const places = points.map((p) => ({ time: p.time, place: p.place }))
  const fix = flight.fix
  if (fix && !fix.onGround && fix.seenAt > (points[points.length - 1]?.time ?? -Infinity)) places.push({ time: fix.seenAt, place: fix.place })
  let start = 0
  for (let i = 1; i < places.length; i++) {
    const earlier = places[i - 1]
    const later = places[i]
    if (later.time - earlier.time > RESTART_GAP_MS && distanceMeters(earlier.place, origin) <= AIRPORT_RADIUS
      && distanceMeters(later.place, origin) <= FIRST_POINT_RADIUS && hasClimbed(points.slice(start, i))) start = i
  }
  return points.slice(start)
}
```

**In `src/map/liveLabel.ts`, replace (1 of 3):**

```ts
 * - stillOnGround: past the plan's takeoff and not off the ground. `minutesBehind` is null for the first few minutes.
 */
```

**with:**

```ts
 * - stillOnGround: past the plan's takeoff and not off the ground. `minutesBehind` is null for the first few minutes.
 * - returned: back on the ground at the departure airport after an air return, whatever the gap (air return design §3).
 *   Its words name the airport.
 */
```

**In `src/map/liveLabel.ts`, replace (2 of 3):**

```ts
  | { kind: 'stillOnGround'; minutesBehind: number | null }
  | { kind: 'landedOnTime' }
```

**with:**

```ts
  | { kind: 'stillOnGround'; minutesBehind: number | null }
  | { kind: 'returned' }
  | { kind: 'landedOnTime' }
```

**In `src/map/liveLabel.ts`, replace (3 of 3):**

```ts
 * The label for a flight in `phase`, `gapMinutes` ahead of the plan (behind when negative). Null where there's no gap
 * to tell, and for a flight that isn't live or is somewhere else.
 */
export function liveLabel(phase: LivePhase, gapMinutes: number | null): LiveLabel | null {
  if (gapMinutes == null) return null
```

**with:**

```ts
 * The label for a flight in `phase`, `gapMinutes` ahead of the plan (behind when negative). Null where there's no gap
 * to tell, and for a flight that isn't live or is somewhere else. A plane back at its departure airport is `returned`,
 * gap or none.
 */
export function liveLabel(phase: LivePhase, gapMinutes: number | null): LiveLabel | null {
  if (phase === 'returned') return { kind: 'returned' }
  if (gapMinutes == null) return null
```

**In `src/map/liveProgress.ts`, replace (1 of 7):**

```ts
import { MINUTE } from '../time/zoned'
import { pointAtDistance, type FlightPath } from './flightPath'
import { distanceLeft, flownPlan, taxiIn, taxiOut, timeInAir, timeToFly, type FlightPlan } from './flightPlan'
import type { FlightRecord } from './flightRecord'
import { distanceMeters, METERS_PER_NM, type GeoPoint } from './greatCircle'
import { liveLabel, type LiveLabel } from './liveLabel'
```

**with:**

```ts
import { MINUTE } from '../time/zoned'
import { AIRPORT_RADIUS, isBack, pointAtDistance, type FlightPath } from './flightPath'
import { distanceLeft, flownPlan, taxiIn, taxiOut, timeInAir, timeToFly, type FlightPlan } from './flightPlan'
import type { FlightRecord } from './flightRecord'
import { distanceMeters, type GeoPoint } from './greatCircle'
import { liveLabel, type LiveLabel } from './liveLabel'
```

**In `src/map/liveProgress.ts`, replace (2 of 7):**

```ts
 * - landed;
 * - elsewhere: on the ground anywhere else: a diversion.
 */
export type LivePhase = 'notLive' | 'onGround' | 'inAir' | 'estimated' | 'landed' | 'elsewhere'

```

**with:**

```ts
 * - landed;
 * - elsewhere: on the ground anywhere else: a diversion;
 * - returned: seen on the ground at the departure airport again, after flying: an air return (air return design §2).
 */
export type LivePhase = 'notLive' | 'onGround' | 'inAir' | 'estimated' | 'landed' | 'elsewhere' | 'returned'

```

**In `src/map/liveProgress.ts`, replace (3 of 7):**

```ts
export const FRESH_FOR_MS = 3 * MINUTE
/** On the ground this close to the departure airport is at it: 10 nautical miles. */
export const AIRPORT_RADIUS = 10 * METERS_PER_NM

```

**with:**

```ts
export const FRESH_FOR_MS = 3 * MINUTE
/** On the ground this close to the departure airport is at it: 10 nautical miles. Kept with the path, which asks it too. */
export { AIRPORT_RADIUS }

```

**In `src/map/liveProgress.ts`, replace (4 of 7):**

```ts
    case 'onGround':
      // Past the plan's takeoff, it's as if the plane took off this moment.
      return now >= plan.takeoff ? now + timeInAir(plan) : null
```

**with:**

```ts
    case 'onGround':
    case 'returned':
      // Past the plan's takeoff, it's as if the plane, still or again at the departure airport, took off this moment
      // (air return design §3).
      return now >= plan.takeoff ? now + timeInAir(plan) : null
```

**In `src/map/liveProgress.ts`, replace (5 of 7):**

```ts
    case 'onGround':
      return { distance: 0, place: fix?.place ?? null }
```

**with:**

```ts
    case 'onGround':
    case 'returned':
      return { distance: 0, place: fix?.place ?? null }
```

**In `src/map/liveProgress.ts`, replace (6 of 7):**

```ts
    case 'landed':
    case 'elsewhere':
    case 'notLive':
      return null
```

**with:**

```ts
    case 'landed':
    case 'returned':
    case 'elsewhere':
    case 'notLive':
      // A plane back at its departure airport after an air return has no schedule left to be measured against (air
      // return design §3).
      return null
```

**In `src/map/liveProgress.ts`, replace (7 of 7):**

```ts
      if (!isFresh) return 'notLive'
      return distanceMeters(fix.place, origin) <= AIRPORT_RADIUS ? 'onGround' : 'elsewhere'
  }
```

**with:**

```ts
      if (!isFresh) return 'notLive'
      if (distanceMeters(fix.place, origin) > AIRPORT_RADIUS) return 'elsewhere'
      return isBack(flight, origin) ? 'returned' : 'onGround'
  }
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 348 tests pass. Then `npx tsc --noEmit`: nothing; `npm test`: 179 test files and 3,827 tests pass, and the same with `TZ=UTC npm test`, as GitHub's build runs; and `npm run build` ends `✓ built`. Last, the shared cases:

```bash
git diff --name-only 74acf06 -- tests/fixtures/trip-map && shasum -a 256 tests/fixtures/trip-map/live-cases.json
```

Expected: `tests/fixtures/trip-map/live-cases.json` alone, Task 2's copy, and the checksum of Task 2's Step 1. No other step changes them.

- [x] **Step 5: The checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && TZ=UTC npm test && npm run build
```

Expected: 179 test files and 3,827 tests pass, twice (in this Mac's time zone, then in UTC as GitHub's build runs), and the build ends `✓ built`.

- [x] **Step 6: Commit, on Todd's yes.** Only these files, by path:

```bash
git add src/copy/planePopup.ts src/copy/tripMap.ts src/map/flightPath.ts src/map/liveLabel.ts src/map/liveProgress.ts tests/fixtures/trip-map/live-cases.json tests/map/airReturn.test.ts tests/map/flightPath.test.ts tests/map/liveCases.ts tests/map/liveProgress.test.ts
git commit -m "A plane back on the ground at its departure airport after climbing 1,000 ft has returned, and a path is made from the trail's latest try, with the app's new shared cases (air return design §2, §4, Todd, 17 Nov 2026)"
```

---

### Task 3: "Returned to Rockford" on the map and in the facts (design §3)

`isAtDeparture` (`src/map/mapFlight.ts`) holds for a plane back there too, at any time, as the app's does, so everything a plane still at the gate already does follows: nothing of what's below, no sky row, "1,382 mi to go", the plane's row with no height or speed, the flight left out of the list, the card's heading "On the ground". `hasReturned` and `legReturned` (`src/map/tripMap.ts`) tell the words it's back, now only: `returnedText`, "Returned to Rockford" (`src/copy/tripMap.ts`), on the card's bar and the full map's pill (`flightStatus`), the plane's popup, the facts' headline, the card's chip and the first row (`atDepartureText`, `src/facts/tripFacts.ts`), and under the timeline. The card's sentence for screen readers says "returned to Rockford". The line under the timeline takes the app's `FlightOnGround` (`src/map/tripActivity.ts`): still at the departure airport, back there, or down at the arrival one, in place of its two airports.

**Files:**
- Modify: `src/copy/planePopup.ts`, `src/copy/tripMap.ts`, `src/facts/tripFacts.ts`, `src/facts/tripFactsRows.ts`, `src/map/mapFlight.ts`, `src/map/tripActivity.ts`, `src/map/tripMap.ts`, `src/ui/TripTimeline.tsx`
- Test: `tests/copy/activityWords.test.ts`, `tests/copy/liveWords.test.ts`, `tests/copy/planePopup.test.ts`, `tests/facts/liveTripFacts.test.ts`, `tests/map/liveTrip.ts`, `tests/map/liveTripMap.test.ts`, `tests/ui/liveMapPage.test.tsx`

- [x] **Step 1: Write the tests.**

**In `tests/copy/activityWords.test.ts`, replace (1 of 2):**

```ts
    const rockford = { ...cologne, code: 'RFD', city: 'Rockford' }
    expect(timelineLine(at(12), flying, 'America/New_York', false, rockford)).toMatch(/^Fri 7:00\sPM · On the ground in Rockford$/)
    expect(timelineSpokenValue(at(12), flying, 'America/New_York', false, rockford)).toMatch(/^Friday 7:00\sPM, on the ground in Rockford$/)
    // Without it, flying, as before.
```

**with:**

```ts
    const rockford = { ...cologne, code: 'RFD', city: 'Rockford' }
    const stillIn = { kind: 'stillIn', airport: rockford } as const
    expect(timelineLine(at(12), flying, 'America/New_York', false, stillIn)).toMatch(/^Fri 7:00\sPM · On the ground in Rockford$/)
    expect(timelineSpokenValue(at(12), flying, 'America/New_York', false, stillIn)).toMatch(/^Friday 7:00\sPM, on the ground in Rockford$/)
    // Without it, flying, as before.
```

**In `tests/copy/activityWords.test.ts`, replace (2 of 2):**

```ts
    const flying = { kind: 'flying', place: cologne } as const
    expect(timelineLine(at(12), flying, 'America/New_York', false, null, cologne)).toMatch(/^Fri 7:00\sPM · Landed in Cologne$/)
    expect(timelineSpokenValue(at(12), flying, 'America/New_York', false, null, cologne)).toMatch(/^Friday 7:00\sPM, landed in Cologne$/)
    // Without it, flying, as before.
    expect(timelineLine(at(12), flying, 'America/New_York', false, null, null)).toMatch(/^Fri 7:00\sPM · Flying to Cologne$/)
  })
```

**with:**

```ts
    const flying = { kind: 'flying', place: cologne } as const
    const landedIn = { kind: 'landedIn', airport: cologne } as const
    expect(timelineLine(at(12), flying, 'America/New_York', false, landedIn)).toMatch(/^Fri 7:00\sPM · Landed in Cologne$/)
    expect(timelineSpokenValue(at(12), flying, 'America/New_York', false, landedIn)).toMatch(/^Friday 7:00\sPM, landed in Cologne$/)
    // Without it, flying, as before.
    expect(timelineLine(at(12), flying, 'America/New_York', false, null)).toMatch(/^Fri 7:00\sPM · Flying to Cologne$/)
  })

  it('says where a flight’s real plane is back on the ground after an air return, in place of flying (air return design §3)', () => {
    const flying = { kind: 'flying', place: cologne } as const
    const returnedTo = { kind: 'returnedTo', airport: { ...cologne, code: 'RFD', city: 'Rockford' } } as const
    expect(timelineLine(at(12), flying, 'America/New_York', false, returnedTo)).toMatch(/^Fri 7:00\sPM · Returned to Rockford$/)
    expect(timelineSpokenValue(at(12), flying, 'America/New_York', false, returnedTo)).toMatch(/^Friday 7:00\sPM, returned to Rockford$/)
  })
```

**In `tests/copy/liveWords.test.ts`, replace (1 of 2):**

```ts
import { landsText } from '../../src/copy/facts'
import { Sentence } from '../../src/copy/narrative'
import {
  barArrival, cardHeading, flightStatus, gateLine, landedText, landingCountdown, landingLine, landsAt, liveSummary, spokenLiveLabel, spokenMinutes,
  topPill, tripMapSummary,
} from '../../src/copy/tripMap'
import type { AirportIndex } from '../../src/data/airports'
import { makeMapFlight } from '../../src/map/mapFlight'
```

**with:**

```ts
import { landsText } from '../../src/copy/facts'
import { Sentence } from '../../src/copy/narrative'
import {
  barArrival, cardHeading, flightStatus, gateLine, landedText, landingCountdown, landingLine, landsAt, liveSummary, returnedText, spokenLiveLabel,
  spokenMinutes, topPill, tripMapSummary,
} from '../../src/copy/tripMap'
import type { AirportIndex } from '../../src/data/airports'
import { makeMapFlight } from '../../src/map/mapFlight'
```

**In `tests/copy/liveWords.test.ts`, replace (2 of 2):**

```ts
    expect(gateLine(scheduleOnly(leg), NY, false)).toMatch(/^Reaches the gate at \d{1,2}:\d\d\s[AP]M · \d{1,2}:\d\d\s[AP]M your time$/)
  })
})
```

**with:**

```ts
    expect(gateLine(scheduleOnly(leg), NY, false)).toMatch(/^Reaches the gate at \d{1,2}:\d\d\s[AP]M · \d{1,2}:\d\d\s[AP]M your time$/)
  })
})

describe('the words for a real plane back at its departure airport after an air return (air return design §3)', () => {
  // Back at Louisville at 12:40, and seen there at 12:41: it lands at 14:04 if it takes off now, and reaches the gate at
  // 14:11, 9:11 AM in Louisville.
  const back = () => caseLeg('an air return, back on the ground')
  const mapOf = (leg: MapLeg): TripMap =>
    ({ mode: { kind: 'inFlight', legId: leg.id }, legs: [leg], groundStops: [], home: null, base: null, isWaitingAtBase: false, span: { start: leg.start, end: leg.end }, days: null })

  it('say it has returned to the departure airport’s city', () => {
    expect(returnedText('Rockford')).toBe('Returned to Rockford')
  })

  it('put "Returned to Louisville" on the card’s bar and the full map’s pill, and "In flight" in a replay, as before', () => {
    const { leg, t } = back()
    expect(flightStatus(leg, t)).toBe('Returned to Louisville')
    expect(flightStatus(leg, t, true)).toBe('In flight')
    expect(spokenLiveLabel({ kind: 'returned' })).toBe('returned')
  })

  it('give the card’s sentence for screen readers its words, and when it lands', () => {
    const { leg, t } = back()
    expect(liveSummary(leg, t, NY, false, 'Indiana', 'near Indianapolis')).toMatch(/^UPS207 to Philadelphia, returned to Louisville\. Lands about 9:11\sAM your time\.$/)
    expect(tripMapSummary(mapOf(leg), t, 'Alex', NY, false)).toMatch(/^UPS207 to Philadelphia, returned to Louisville\. Lands about 9:11\sAM your time\. Opens the full map\.$/)
  })

  it('head the map card "On the ground" for screen readers, as a plane at its departure airport', () => {
    const { leg, t } = back()
    expect(cardHeading(mapOf(leg), t)).toBe('On the ground')
  })
})
```

**In `tests/copy/planePopup.test.ts`, replace:**

```ts
    expect(words).toEqual({ title: 'UPS207 · real plane', lines: ['Still on the ground · 20 min behind', landsAt(leg, NY, false)] })
  })
```

**with:**

```ts
    expect(words).toEqual({ title: 'UPS207 · real plane', lines: ['Still on the ground · 20 min behind', landsAt(leg, NY, false)] })
  })

  it('names the real plane back at its departure airport after an air return, and when it lands (air return design §3)', () => {
    const { leg, words } = realPlane('an air return, back on the ground')
    expect(words).toEqual({ title: 'UPS207 · real plane', lines: ['Returned to SDF', landsAt(leg, NY, false)] })
    expect(landsAt(leg, NY, false)).toMatch(/^Lands about 9:11\sAM$/)
  })
```

**In `tests/facts/liveTripFacts.test.ts`, replace:**

```ts

// The landed, not yet at the gate design (Todd, 17 Nov 2026)
```

**with:**

```ts

// An air return (air return design §3)

/** The real plane back on the ground at its gate at `seenAt`, having flown out 0.6° E, climbing to 9,000 ft, and back. */
function backOnTheGround(seenAt: number): LiveFlight {
  const point = (hhmm: string, lng: number, altitudeFt: number) => ({ time: at(hhmm), place: { lat: 0, lng }, altitudeFt })
  return { ...onTheGround(seenAt), trail: [point('10:18', 0.3, 2_000), point('10:24', 0.6, 9_000), point('10:30', 0.2, 3_000)] }
}

/** The facts with the real plane back at its gate at `now`, its leg having begun at 10:00 and the plan's takeoff at 10:15. */
const backAtTheGate = (now: string, options: { geography?: Geography; isReplay?: boolean } = {}) => {
  const leg = fromRockford(backOnTheGround(at(now)), now)
  return makeTripFacts(flightMap(leg, HOME_BY_THE_EQUATOR), {
    geography: options.geography ?? EQUATOR, comparisons: appComparisons(), viewerTz: NY, h24: false, day: 1, days: 1, isReplay: options.isReplay,
  })
}

describe('a real plane back at its departure airport after an air return (air return design §3)', () => {
  /** A border 1° E along: the plane flew over it and back, and the schedule's times have it cross at 10:24. */
  const border = makeGeography([box('Alpha', 'country', -1, 1), box('Bravo', 'country', 1, 21)], [])

  it('heads the facts "Returned to Rockford", and reads otherwise as a plane still at the gate', () => {
    const theFacts = backAtTheGate('10:35')
    expect(headline(theFacts, at('10:35'))).toBe('Returned to Rockford')
    const rows = rowsAt(theFacts, '10:35')
    expect(rows.map((r) => r.kind)).toEqual(['below', 'plane', 'distance', 'headed'])
    expect(row('below', rows).title).toBe('Returned to Rockford')
    expect(row('distance', rows).title).toBe('1,382 mi to go')
  })

  it('leaves the flight out of the trip so far, with no latest event, as a plane still at the gate', () => {
    const theFacts = backAtTheGate('10:35', { geography: border })
    expect(tripSoFar(theFacts, at('10:35')).flights).toEqual([])
    expect(latestEvent(theFacts, at('10:35'))).toBeNull()
  })

  it('has a sentence for screen readers that says it has returned there, and when it lands', () => {
    expect(cardSummary(backAtTheGate('10:35'), at('10:35'), 'Alex'))
      .toBe(`TST1 to E20, returned to Rockford. Lands about 9:42${AM} your time. Opens the full map.`)
  })

  it('in a replay, reads where the map has the plane: the schedule’s, as the way out and back isn’t its path', () => {
    const theFacts = backAtTheGate('10:35', { isReplay: true })
    expect(headline(theFacts, at('10:35'))).toBe('Over Alpha')
    expect(row('distance', rowsAt(theFacts, '10:35')).title).toBe('138 mi flown · 1,244 to go')
  })
})

// The landed, not yet at the gate design (Todd, 17 Nov 2026)
```

**In `tests/map/liveTrip.ts`, replace:**

```ts
  liveFlight([], { legId: 'f1', state: 'ground', fix: fix(minutes - 1 / 3, SDF.lat, SDF.lng, { onGround: true }) })

```

**with:**

```ts
  liveFlight([], { legId: 'f1', state: 'ground', fix: fix(minutes - 1 / 3, SDF.lat, SDF.lng, { onGround: true }) })

/**
 * Off from Louisville on time, out 40 nm east climbing to 9,000 ft and straight back, and on the ground there again, seen
 * 20 seconds before `minutes` after START: an air return (air return design §2).
 */
export const backAtTheGate = (minutes: number) => liveFlight(
  [{ ...point(17, 38.25, -85.55), altitudeFt: 2_000 }, { ...point(23, 38.45, -85.0), altitudeFt: 9_000 }, { ...point(29, 38.3, -85.4), altitudeFt: 3_000 }],
  { legId: 'f1', state: 'ground', fix: fix(minutes - 1 / 3, SDF.lat, SDF.lng, { onGround: true }) },
)

```

**In `tests/map/liveTripMap.test.ts`, replace (1 of 2):**

```ts
import { buildLegs, type Leg } from '../../src/engine/legs'
import { liveMapFlights, withLiveTimes } from '../../src/engine/liveLegs'
import { pathPoints } from '../../src/map/flightPathDrawing'
import { pointsAlong } from '../../src/map/greatCircle'
import { fitRect } from '../../src/map/mapFit'
import { landedIn, stillOnGroundIn } from '../../src/map/tripActivity'
import { framingPoints, isArrivalEstimated, legLandedBeforeGate, legStillOnGround, makeTripMap, type TripMap } from '../../src/map/tripMap'
import { atTheGate, FLYING, LANDED_EARLY, LIVE_AIRPORTS as AIRPORTS, liveTripMap, PHL, placeOf, SCHEDULE, SDF, SDF_PHL as F1 } from './liveTrip'
import { fix, liveFlight, MINUTE, point, START } from './madeUpFlights'

/** Seen north of the line, then far north of it, 40 minutes in: still in the air. */
const LIVE = liveFlight([point(20, 38.6, -84.2), point(40, 40.6, -81.2)], { fix: fix(41, 40.65, -81.0) })
const LANDED = liveFlight([point(20, 38.6, -84.2), point(90, 39.8, -75.8)],
```

**with:**

```ts
import { buildLegs, type Leg } from '../../src/engine/legs'
import { liveMapFlights, withLiveTimes } from '../../src/engine/liveLegs'
import { pathPoints } from '../../src/map/flightPathDrawing'
import { pointsAlong } from '../../src/map/greatCircle'
import { fitRect } from '../../src/map/mapFit'
import { flightOnGround, landedIn, stillOnGroundIn } from '../../src/map/tripActivity'
import { framingPoints, isArrivalEstimated, legLandedBeforeGate, legReturned, legStillOnGround, makeTripMap, type TripMap } from '../../src/map/tripMap'
import {
  atTheGate, backAtTheGate, FLYING, LANDED_EARLY, LIVE_AIRPORTS as AIRPORTS, liveTripMap, PHL, placeOf, SCHEDULE, SDF, SDF_PHL as F1,
} from './liveTrip'
import { fix, liveFlight, MINUTE, point, START } from './madeUpFlights'

/** Seen north of the line, then far north of it, 40 minutes in: still in the air. */
const LIVE = liveFlight([point(20, 38.6, -84.2), point(40, 40.6, -81.2)], { fix: fix(41, 40.65, -81.0) })
const LANDED = liveFlight([point(20, 38.6, -84.2), point(90, 39.8, -75.8)],
```

**In `tests/map/liveTripMap.test.ts`, replace (2 of 2):**

```ts
      const then = START + minutes * MINUTE
      expect(landedIn(liveTripMap(then, live), then)).toBeNull()
    }
  })
})
```

**with:**

```ts
      const then = START + minutes * MINUTE
      expect(landedIn(liveTripMap(then, live), then)).toBeNull()
    }
  })
})

describe('a real plane back at its departure airport after an air return (air return design §2, §3)', () => {
  const flightOf = (map: TripMap) => map.legs.find((l) => l.kind === 'flight')!

  it('is told, as a plane at the airport is: the words say it has returned there', () => {
    // Off on time, out and back, and on the ground in Louisville at 44 minutes.
    const now = START + 45 * MINUTE
    const map = liveTripMap(now, backAtTheGate(45))
    expect(legReturned(flightOf(map), now)).toBe(true)
    expect(legStillOnGround(flightOf(map), now)).toBe(true)
    expect(flightOnGround(map, now)).toMatchObject({ kind: 'returnedTo', airport: { code: 'SDF', city: 'Louisville' } })
  })

  it('isn’t told of a plane that never left, in the air, or down at its arrival airport, which are told as before', () => {
    const late = START + 25 * MINUTE
    expect(legReturned(flightOf(liveTripMap(late, atTheGate(25))), late)).toBe(false)
    expect(flightOnGround(liveTripMap(late, atTheGate(25)), late)).toMatchObject({ kind: 'stillIn', airport: { code: 'SDF' } })
    const down = START + 103 * MINUTE
    expect(flightOnGround(liveTripMap(down, LANDED_EARLY), down)).toMatchObject({ kind: 'landedIn', airport: { code: 'PHL' } })
    const flying = START + 59 * MINUTE
    expect(legReturned(flightOf(liveTripMap(flying, FLYING)), flying)).toBe(false)
    expect(flightOnGround(liveTripMap(flying, FLYING), flying)).toBeNull()
    expect(flightOnGround(liveTripMap(late, null), late)).toBeNull()
  })
})
```

**In `tests/ui/liveMapPage.test.tsx`, replace (1 of 2):**

```tsx
import { TripMapPage } from '../../src/ui/TripMapPage'
import { atTheGate, FLYING, LANDED_EARLY, liveTripMap } from '../map/liveTrip'
import { fix, MINUTE, START } from '../map/madeUpFlights'
```

**with:**

```tsx
import { TripMapPage } from '../../src/ui/TripMapPage'
import { atTheGate, backAtTheGate, FLYING, LANDED_EARLY, liveTripMap } from '../map/liveTrip'
import { fix, MINUTE, START } from '../map/madeUpFlights'
```

**In `tests/ui/liveMapPage.test.tsx`, replace (2 of 2):**

```tsx

describe('a real plane down, not yet at the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026)', () => {
```

**with:**

```tsx

describe('a real plane back at its departure airport after an air return (air return design §3)', () => {
  /** Off on time, out and back, and on the ground in Louisville again at 44 minutes. */
  const BACK = START + 45 * MINUTE
  const page = (t: number, live: Parameters<typeof liveTripMap>[1]) =>
    <TripMapPage map={liveTripMap(t, live)} now={t} viewerTz={NY} h24={false} day={1} days={1} land={null} onBack={() => {}} />
  const line = () => document.querySelector('.trip-timeline-time')?.textContent
  const slider = () => screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement

  it('says so on the card’s bar, and heads the card "On the ground" for screen readers', () => {
    card(BACK, backAtTheGate(45))
    expect(document.querySelector('.inflight-status')?.textContent).toBe('Returned to Louisville')
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('On the ground')
  })

  it('says under the full map’s timeline that it has returned there, now', () => {
    render(page(BACK, backAtTheGate(45)))
    expect(line()).toMatch(/^Fri 7:45\sAM · Returned to Louisville$/)
    expect(slider().getAttribute('aria-valuetext')).toMatch(/^Friday 7:45\sAM, returned to Louisville$/)
  })

  it('says "Flying to" in a replay, which reads where the map has the plane', () => {
    render(page(BACK, backAtTheGate(45)))
    fireEvent.input(slider(), { target: { value: String(Number(slider().max) / 2) } })
    expect(line()).toMatch(/ · Flying to Philadelphia$/)
  })
})

describe('a real plane down, not yet at the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026)', () => {
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/copy/activityWords.test.ts tests/copy/liveWords.test.ts tests/copy/planePopup.test.ts tests/facts/liveTripFacts.test.ts tests/map/liveTripMap.test.ts tests/ui/liveMapPage.test.tsx
```

Expected: 15 of the 154 tests fail, in all six files. Most because `legReturned`, `flightOnGround`, `returnedText` and `backAtTheGate`'s words aren't there yet. Under the timeline, the two tests of before fail too: they now pass a `FlightOnGround`, which the old `timelineLine` reads as an airport. The facts' and the full map's replays pass already, as they should: a replay reads as before.

- [x] **Step 3: Write the code.**

**In `src/copy/planePopup.ts`, replace (1 of 2):**

```ts
import { shortTimeText } from './format'
import { about, landsAt, liveLabelText } from './tripMap'

```

**with:**

```ts
import { shortTimeText } from './format'
import { about, landsAt, liveLabelText, returnedText } from './tripMap'

```

**In `src/copy/planePopup.ts`, replace (2 of 2):**

```ts
    case 'onGround':
    case 'returned':
    case 'inAir':
      return { title, lines: [...(label ? [label] : []), landsAt(leg, viewerTz, h24)] }
    case 'landed':
```

**with:**

```ts
    case 'onGround':
    case 'inAir':
      return { title, lines: [...(label ? [label] : []), landsAt(leg, viewerTz, h24)] }
    case 'returned':
      // Back at its departure airport after an air return, which it names (air return design §3).
      return { title, lines: [returnedText(leg.origin.city), landsAt(leg, viewerTz, h24)] }
    case 'landed':
```

**In `src/copy/tripMap.ts`, replace (1 of 9):**

```ts
import { calendarDay, MONTHS, WEEKDAYS, zoneOffsetMinutes, zonedParts } from '../time/zoned'
import type { TripActivity } from '../map/tripActivity'
import { recapChip } from './factsTrip'
```

**with:**

```ts
import { calendarDay, MONTHS, WEEKDAYS, zoneOffsetMinutes, zonedParts } from '../time/zoned'
import type { FlightOnGround, TripActivity } from '../map/tripActivity'
import { recapChip } from './factsTrip'
```

**In `src/copy/tripMap.ts`, replace (2 of 9):**

```ts
 * What the card's bar and the full map's pill say of a flight between its gates (Stage 3 spec §9): the real plane's
 * label, or "In flight" when it has none. A moment of the replay is always "In flight" (§7.3).
 */
```

**with:**

```ts
 * What the card's bar and the full map's pill say of a flight between its gates (Stage 3 spec §9): the real plane's
 * label, or "In flight" when it has none. A moment of the replay is always "In flight" (§7.3). A plane back at its
 * departure airport after an air return names it: "Returned to Rockford" (air return design §3).
 */
```

**In `src/copy/tripMap.ts`, replace (3 of 9):**

```ts
  const label = !isReplay && leg.flight ? mapFlightProgress(leg.flight, now).label : null
  return label ? liveLabelText(label) : 'In flight'
```

**with:**

```ts
  const label = !isReplay && leg.flight ? mapFlightProgress(leg.flight, now).label : null
  if (label?.kind === 'returned') return returnedText(leg.origin.city)
  return label ? liveLabelText(label) : 'In flight'
```

**In `src/copy/tripMap.ts`, replace (4 of 9):**

```ts
 * schedule, over Québec. Lands about 3:18 PM your time." Once it's down, "…, landed 8 minutes early. Reaches the gate at
 * 3:18 PM your time." Null when the plane has no label, and the schedule's sentence stands.
 * - `over` is what's below.
```

**with:**

```ts
 * schedule, over Québec. Lands about 3:18 PM your time." Once it's down, "…, landed 8 minutes early. Reaches the gate at
 * 3:18 PM your time." Back at its departure airport after an air return, "UPS2963 to Anchorage, returned to Rockford.
 * Lands about 9:11 AM your time." (air return design §3). Null when the plane has no label, and the schedule's sentence
 * stands.
 * - `over` is what's below.
```

**In `src/copy/tripMap.ts`, replace (5 of 9):**

```ts
  const where = isFlying ? `${over ? `, over ${over}` : ''}${lastSeen ? `, last tracked ${lastSeen}` : ''}` : ''
  return `${lead} ${leg.destination.city}, ${spokenLiveLabel(label)}${where}. ${arrival}`
}
```

**with:**

```ts
  const where = isFlying ? `${over ? `, over ${over}` : ''}${lastSeen ? `, last tracked ${lastSeen}` : ''}` : ''
  // A plane back at its departure airport after an air return names it (air return design §3).
  const spoken = label.kind === 'returned' ? `returned to ${leg.origin.city}` : spokenLiveLabel(label)
  return `${lead} ${leg.destination.city}, ${spoken}${where}. ${arrival}`
}
```

**In `src/copy/tripMap.ts`, replace (6 of 9):**

```ts
export const landedText = (city: string) => `Landed in ${city}`

```

**with:**

```ts
export const landedText = (city: string) => `Landed in ${city}`

/**
 * "Returned to Rockford": a real plane back on the ground at its departure airport after an air return, on the card's
 * bar, the plane's popup, at the head of the facts and under the timeline (air return design §3).
 */
export const returnedText = (city: string) => `Returned to ${city}`

```

**In `src/copy/tripMap.ts`, replace (7 of 9):**

```ts
/**
 * The words under the timeline: the activity's, or "On the ground in Rockford" where the flight's real plane is still on
 * the ground at its departure airport, `stillOnGroundIn` (the website's own, Todd, 16 Nov 2026), or "Landed in
 * Anchorage" where it's down at its arrival airport and not yet at the gate, `landedIn` (the landed, not yet at the gate
 * design §3, Todd, 17 Nov 2026).
 */
function lineWords(activity: TripActivity | null, stillOnGroundIn: AirportMark | null, landedIn: AirportMark | null): string | null {
  if (stillOnGroundIn) return `On the ground in ${stillOnGroundIn.city}`
  if (landedIn) return landedText(landedIn.city)
  return activity ? activityWords(activity) : null
}
```

**with:**

```ts
/**
 * The words under the timeline: the activity's, or where the flight's real plane is on the ground, `onGround`: "On the
 * ground in Rockford" while it's still at its departure airport (the website's own, Todd, 16 Nov 2026), "Returned to
 * Rockford" once it's back there after an air return (air return design §3), or "Landed in Anchorage" where it's down at
 * its arrival airport and not yet at the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026).
 */
function lineWords(activity: TripActivity | null, onGround: FlightOnGround | null): string | null {
  switch (onGround?.kind) {
    case 'stillIn': return `On the ground in ${onGround.airport.city}`
    case 'returnedTo': return returnedText(onGround.airport.city)
    case 'landedIn': return landedText(onGround.airport.city)
    case undefined: return activity ? activityWords(activity) : null
  }
}
```

**In `src/copy/tripMap.ts`, replace (8 of 9):**

```ts
 * "Sat 1:40 PM · Layover in Denver": the line under the timeline, when and what (activity markers design §4.2). While
 * the flight's real plane is still on the ground at its departure airport, `stillOnGroundIn`, "Mon 12:21 PM · On the
 * ground in Rockford" (the website's own, Todd, 16 Nov 2026); while it's down and not yet at the gate, `landedIn`, "Mon
 * 7:45 PM · Landed in Anchorage" (the landed, not yet at the gate design §3, Todd, 17 Nov 2026).
 */
export function timelineLine(
  ms: number, activity: TripActivity | null, viewerTz: string, h24: boolean, stillOnGroundIn: AirportMark | null = null,
  landedIn: AirportMark | null = null,
): string {
  const time = timelineTime(ms, viewerTz, h24)
  const words = lineWords(activity, stillOnGroundIn, landedIn)
  return words ? `${time} · ${words}` : time
```

**with:**

```ts
 * "Sat 1:40 PM · Layover in Denver": the line under the timeline, when and what (activity markers design §4.2). While
 * the flight's real plane is on the ground, `onGround`: "Mon 12:21 PM · On the ground in Rockford" (the website's own,
 * Todd, 16 Nov 2026), "Mon 12:21 PM · Returned to Rockford" (air return design §3), or "Mon 7:45 PM · Landed in
 * Anchorage" (the landed, not yet at the gate design §3, Todd, 17 Nov 2026).
 */
export function timelineLine(
  ms: number, activity: TripActivity | null, viewerTz: string, h24: boolean, onGround: FlightOnGround | null = null,
): string {
  const time = timelineTime(ms, viewerTz, h24)
  const words = lineWords(activity, onGround)
  return words ? `${time} · ${words}` : time
```

**In `src/copy/tripMap.ts`, replace (9 of 9):**

```ts
export function timelineSpokenValue(
  ms: number, activity: TripActivity | null, viewerTz: string, h24: boolean, stillOnGroundIn: AirportMark | null = null,
  landedIn: AirportMark | null = null,
): string {
  const time = `${WEEKDAYS[zonedParts(ms, viewerTz).weekday]} ${shortTimeText(ms, viewerTz, h24)}`
  const words = lineWords(activity, stillOnGroundIn, landedIn)
  if (!words) return time
```

**with:**

```ts
export function timelineSpokenValue(
  ms: number, activity: TripActivity | null, viewerTz: string, h24: boolean, onGround: FlightOnGround | null = null,
): string {
  const time = `${WEEKDAYS[zonedParts(ms, viewerTz).weekday]} ${shortTimeText(ms, viewerTz, h24)}`
  const words = lineWords(activity, onGround)
  if (!words) return time
```

**In `src/facts/tripFacts.ts`, replace (1 of 5):**

```ts
import { shortTimeText } from '../copy/format'
import { landedText, landingCountdown, liveSummary, panelHeadline, tripMapSummary } from '../copy/tripMap'
import type { LandingForecast } from '../data/weather'
```

**with:**

```ts
import { shortTimeText } from '../copy/format'
import { landedText, landingCountdown, liveSummary, panelHeadline, returnedText, tripMapSummary } from '../copy/tripMap'
import type { LandingForecast } from '../data/weather'
```

**In `src/facts/tripFacts.ts`, replace (2 of 5):**

```ts
import {
  currentLeg, dayCount, isMoving, legInMotion, legLandedBeforeGate, legStillOnGround, type AirportMark, type MapLeg, type TripMap,
} from '../map/tripMap'
```

**with:**

```ts
import {
  currentLeg, dayCount, isMoving, legInMotion, legLandedBeforeGate, legReturned, legStillOnGround, type AirportMark, type MapLeg, type TripMap,
} from '../map/tripMap'
```

**In `src/facts/tripFacts.ts`, replace (3 of 5):**

```ts
/**
 * Whether the real plane of `leg`, the leg between its gates at `t`, has landed and isn't at the gate yet. The facts then
```

**with:**

```ts
/**
 * What the facts say in place of what's below while `isStillOnGround` holds: "Still on the ground in Rockford" (the
 * website's own, Todd, 16 Nov 2026), or "Returned to Rockford" once the plane is back there after an air return (air
 * return design §3).
 */
export const atDepartureText = (leg: MapLeg, t: number): string =>
  legReturned(leg, t) ? returnedText(leg.origin.city) : stillOnGroundText(leg.origin.city)

/**
 * Whether the real plane of `leg`, the leg between its gates at `t`, has landed and isn't at the gate yet. The facts then
```

**In `src/facts/tripFacts.ts`, replace (4 of 5):**

```ts
 * The website's own (Todd, 16 Nov 2026): a real plane still on the ground at its departure airport is "Still on the
 * ground in Rockford", ahead of all of them. It has crossed nothing yet, whatever the schedule's times say. And at the
 * other end, down and not yet at the gate, "Landed in Anchorage", ahead of them too (the landed, not yet at the gate
```

**with:**

```ts
 * The website's own (Todd, 16 Nov 2026): a real plane still on the ground at its departure airport is "Still on the
 * ground in Rockford", ahead of all of them, or "Returned to Rockford" once it's back there after an air return (air
 * return design §3). It has crossed nothing yet, whatever the schedule's times say. And at the
 * other end, down and not yet at the gate, "Landed in Anchorage", ahead of them too (the landed, not yet at the gate
```

**In `src/facts/tripFacts.ts`, replace (5 of 5):**

```ts
  if (!leg || leg.kind !== 'flight') return null
  if (isStillOnGround(facts, leg, t)) return stillOnGroundText(leg.origin.city)
  if (isLandedBeforeGate(facts, leg, t)) return landedText(leg.destination.city)
```

**with:**

```ts
  if (!leg || leg.kind !== 'flight') return null
  if (isStillOnGround(facts, leg, t)) return atDepartureText(leg, t)
  if (isLandedBeforeGate(facts, leg, t)) return landedText(leg.destination.city)
```

**In `src/facts/tripFactsRows.ts`, replace (1 of 4):**

```ts
  aircraftText, allFlownText, averageSpeedText, chaseText, closestToHomeText, cockpitEventText, flownText, flyingInto, groundSunText,
  halfwayText, heightAndSpeedText, landsText, midLine, moonText, stillOnGroundText, timeDifferenceText, toGoText,
} from '../copy/facts'
```

**with:**

```ts
  aircraftText, allFlownText, averageSpeedText, chaseText, closestToHomeText, cockpitEventText, flownText, flyingInto, groundSunText,
  halfwayText, heightAndSpeedText, landsText, midLine, moonText, timeDifferenceText, toGoText,
} from '../copy/facts'
```

**In `src/facts/tripFactsRows.ts`, replace (2 of 4):**

```ts
import {
  belowText, forecastFor, isLandedBeforeGate, isRecapOver, isStillOnGround, lastSeenText, latestEvent, sheetHeadline, showsLiveData, tripSoFar,
  type TripFacts,
```

**with:**

```ts
import {
  atDepartureText, belowText, forecastFor, isLandedBeforeGate, isRecapOver, isStillOnGround, lastSeenText, latestEvent, sheetHeadline, showsLiveData,
  tripSoFar,
  type TripFacts,
```

**In `src/facts/tripFactsRows.ts`, replace (3 of 4):**

```ts
 * that there is leads the row. A real plane still at its departure airport says so in place of what's below (the
 * website's own, Todd, 16 Nov 2026). One down, not yet at the gate, says "Landed in Anchorage", alone: the rest goes
 * with what's below (the landed, not yet at the gate design §3, Todd, 17 Nov 2026).
```

**with:**

```ts
 * that there is leads the row. A real plane still at its departure airport says so in place of what's below (the
 * website's own, Todd, 16 Nov 2026), or that it has returned there after an air return (air return design §3). One down, not yet at the gate, says "Landed in Anchorage", alone: the rest goes
 * with what's below (the landed, not yet at the gate design §3, Todd, 17 Nov 2026).
```

**In `src/facts/tripFactsRows.ts`, replace (4 of 4):**

```ts
  if (isLandedBeforeGate(facts, leg, t)) return factRow('below', 'MapPin', landedText(leg.destination.city))
  const where = isStillOnGround(facts, leg, t) ? stillOnGroundText(leg.origin.city) : belowText(facts, leg, t)
  const lines = [where, lastSeenText(facts, leg, t), closestToHomeLine(facts, leg, t)].filter(notNull)
```

**with:**

```ts
  if (isLandedBeforeGate(facts, leg, t)) return factRow('below', 'MapPin', landedText(leg.destination.city))
  const where = isStillOnGround(facts, leg, t) ? atDepartureText(leg, t) : belowText(facts, leg, t)
  const lines = [where, lastSeenText(facts, leg, t), closestToHomeLine(facts, leg, t)].filter(notNull)
```

**In `src/map/mapFlight.ts`, replace (1 of 2):**

```ts
 * bar says "Still on the ground". Before the plan's takeoff it's taxiing as the schedule has it, and nothing says so
 * (the website's own, Todd, 16 Nov 2026).
 */
```

**with:**

```ts
 * bar says "Still on the ground". Before the plan's takeoff it's taxiing as the schedule has it, and nothing says so
 * (the website's own, Todd, 16 Nov 2026). A plane back there after an air return is at it too, at any time (air return
 * design §3).
 */
```

**In `src/map/mapFlight.ts`, replace (2 of 2):**

```ts
  const { phase, label } = mapFlightProgress(flight, now)
  return phase === 'onGround' && label?.kind === 'stillOnGround'
}

```

**with:**

```ts
  const { phase, label } = mapFlightProgress(flight, now)
  return phase === 'returned' || (phase === 'onGround' && label?.kind === 'stillOnGround')
}

/**
 * Whether the real plane is back on the ground at its departure airport after flying, when this browser's clock says
 * `now` (air return design §2): the words say "Returned to Rockford" in place of "Still on the ground".
 */
export const hasReturned = (flight: MapFlight, now: number): boolean => mapFlightProgress(flight, now).phase === 'returned'

```

**In `src/map/tripActivity.ts`, replace (1 of 2):**

```ts
import {
  isMoving, legInMotion, legLandedBeforeGate, legStillOnGround, pilotLocation, type AirportMark, type GroundStop, type TripMap,
} from './tripMap'
```

**with:**

```ts
import {
  isMoving, legInMotion, legLandedBeforeGate, legReturned, legStillOnGround, pilotLocation, type AirportMark, type GroundStop, type TripMap,
} from './tripMap'
```

**In `src/map/tripActivity.ts`, replace (2 of 2):**

```ts
/**
 * Before the first departure, home for a next trip, or base while the pilot waits there, else home or base by where
```

**with:**

```ts
/**
 * A flight between its gates whose real plane is on the ground now, as the line under the timeline names it in place of
 * "Flying to", as the app's FlightOnGround: still at its departure airport after the plan's takeoff time, `stillIn`
 * ("On the ground in Rockford"); back there after an air return, `returnedTo` ("Returned to Rockford", air return
 * design §3); or down at its arrival airport before the gate, `landedIn` ("Landed in Anchorage").
 */
export interface FlightOnGround {
  kind: 'stillIn' | 'returnedTo' | 'landedIn'
  /** The airport it's on the ground at. */
  airport: AirportMark
}

/**
 * Where the flight between its gates at `now` has its real plane on the ground, as the line under the timeline names it.
 * Null otherwise. Now only, as `stillOnGroundIn` and `landedIn` are.
 */
export function flightOnGround(map: TripMap, now: number): FlightOnGround | null {
  const arrival = landedIn(map, now)
  if (arrival) return { kind: 'landedIn', airport: arrival }
  const departure = stillOnGroundIn(map, now)
  if (!departure) return null
  const flight = map.legs.find((l) => l.kind === 'flight' && isMoving(l, now))
  return { kind: flight && legReturned(flight, now) ? 'returnedTo' : 'stillIn', airport: departure }
}

/**
 * Before the first departure, home for a next trip, or base while the pilot waits there, else home or base by where
```

**In `src/map/tripMap.ts`, replace (1 of 2):**

```ts
import { calendarDay } from '../time/zoned'
import { hasLanded, isAtDeparture, isEstimate, type MapFlight } from './mapFlight'
import { aimFractions, flatMapAngle } from './planeHeading'
```

**with:**

```ts
import { calendarDay } from '../time/zoned'
import { hasLanded, hasReturned, isAtDeparture, isEstimate, type MapFlight } from './mapFlight'
import { aimFractions, flatMapAngle } from './planeHeading'
```

**In `src/map/tripMap.ts`, replace (2 of 2):**

```ts
/**
 * Whether the leg is between its gates at `now` while its real plane has landed: down, not yet at the gate (`leg.end`,
```

**with:**

```ts
/**
 * Whether the leg is between its gates at `now` with its real plane back on the ground at its departure airport after an
 * air return (`hasReturned`, air return design §2): `legStillOnGround` holds too, and the words say "Returned to
 * Rockford" in place of "Still on the ground in Rockford". Now only, as `legStillOnGround` is.
 */
export const legReturned = (leg: MapLeg, now: number): boolean =>
  leg.flight != null && isMoving(leg, now) && hasReturned(leg.flight, now)

/**
 * Whether the leg is between its gates at `now` while its real plane has landed: down, not yet at the gate (`leg.end`,
```

**In `src/ui/TripTimeline.tsx`, replace (1 of 4):**

```tsx
import { timelineBlocks } from '../map/timelineBlocks'
import { activityAt, landedIn, stillOnGroundIn } from '../map/tripActivity'
import type { TripMap } from '../map/tripMap'
```

**with:**

```tsx
import { timelineBlocks } from '../map/timelineBlocks'
import { activityAt, flightOnGround } from '../map/tripActivity'
import type { TripMap } from '../map/tripMap'
```

**In `src/ui/TripTimeline.tsx`, replace (2 of 4):**

```tsx
  const activity = activityAt(map, t)
  // Now, a late flight's real plane still at its departure airport is "On the ground" there. A replay's moment flies as
  // the map has the plane (the website's own, Todd, 16 Nov 2026).
  const waitingIn = isLive(clock) ? stillOnGroundIn(map, t) : null
  // And down at the arrival airport before the gate, "Landed" there, now only (the landed, not yet at the gate design §3,
  // Todd, 17 Nov 2026).
  const downIn = isLive(clock) ? landedIn(map, t) : null
  // The blocks follow the trip and the pace alone: the clock's span, legs and waits are the map's. Worked out once
```

**with:**

```tsx
  const activity = activityAt(map, t)
  // Now, a late flight's real plane still at its departure airport is "On the ground" there (the website's own, Todd, 16
  // Nov 2026), one back there after an air return has "Returned" there (air return design §3), and one down at the
  // arrival airport before the gate has "Landed" there (the landed, not yet at the gate design §3, Todd, 17 Nov 2026). A
  // replay's moment flies as the map has the plane.
  const onGround = isLive(clock) ? flightOnGround(map, t) : null
  // The blocks follow the trip and the pace alone: the clock's span, legs and waits are the map's. Worked out once
```

**In `src/ui/TripTimeline.tsx`, replace (3 of 4):**

```tsx
          <TripTimelineBlocks blocks={blocks} progress={progressAt(clock, t)} />
          <input type="range" class="trip-timeline-slider" aria-label="Trip time" aria-valuetext={timelineSpokenValue(t, activity, viewerTz, h24, waitingIn, downIn)}
            min={0} max={Math.max(whole, 1)} step="any" value={offset} onKeyDown={onKeyDown}
```

**with:**

```tsx
          <TripTimelineBlocks blocks={blocks} progress={progressAt(clock, t)} />
          <input type="range" class="trip-timeline-slider" aria-label="Trip time" aria-valuetext={timelineSpokenValue(t, activity, viewerTz, h24, onGround)}
            min={0} max={Math.max(whole, 1)} step="any" value={offset} onKeyDown={onKeyDown}
```

**In `src/ui/TripTimeline.tsx`, replace (4 of 4):**

```tsx
      </div>
      <p class="trip-timeline-time" aria-hidden="true">{timelineLine(t, activity, viewerTz, h24, waitingIn, downIn)}</p>
      <div class="trip-timeline-row trip-timeline-settings">
```

**with:**

```tsx
      </div>
      <p class="trip-timeline-time" aria-hidden="true">{timelineLine(t, activity, viewerTz, h24, onGround)}</p>
      <div class="trip-timeline-row trip-timeline-settings">
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 154 tests pass. Then `npx tsc --noEmit`: nothing; `npm test`: 179 test files and 3,842 tests pass, and the same with `TZ=UTC npm test`, as GitHub's build runs; and `npm run build` ends `✓ built`. Last, the shared cases:

```bash
git diff --name-only 74acf06 -- tests/fixtures/trip-map && shasum -a 256 tests/fixtures/trip-map/live-cases.json
```

Expected: `tests/fixtures/trip-map/live-cases.json` alone, Task 2's copy, and the checksum of Task 2's Step 1. No other step changes them.

- [x] **Step 5: The checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && TZ=UTC npm test && npm run build
```

Expected: 179 test files and 3,842 tests pass, twice (in this Mac's time zone, then in UTC as GitHub's build runs), and the build ends `✓ built`.

- [x] **Step 6: Commit, on Todd's yes.** Only these files, by path:

```bash
git add src/copy/planePopup.ts src/copy/tripMap.ts src/facts/tripFacts.ts src/facts/tripFactsRows.ts src/map/mapFlight.ts src/map/tripActivity.ts src/map/tripMap.ts src/ui/TripTimeline.tsx tests/copy/activityWords.test.ts tests/copy/liveWords.test.ts tests/copy/planePopup.test.ts tests/facts/liveTripFacts.test.ts tests/map/liveTrip.ts tests/map/liveTripMap.test.ts tests/ui/liveMapPage.test.tsx
git commit -m "\"Returned to Rockford\" on the card's bar, the popup, the facts, the card's sentence and under the timeline, with FlightOnGround in place of two airports (air return design §3, Todd, 17 Nov 2026)"
```

---

### Task 4: The status sentence says "has returned to Rockford" (design §3)

`returnedFlight` (`src/engine/liveLegs.ts`): of the flight `stillOnGroundFlight` names, the one whose plane is back. The status page hands it to the narrative (`src/ui/PilotPages.tsx`, `src/ui/StatusScreen.tsx`), which says "Alex has returned to Rockford on UPS flight 2963 to Anchorage — landing in … which is about …" in place of "is still on the ground in" (`src/copy/narrative.ts`), with the countdown, its color and "on the flight" as before.

**Files:**
- Modify: `src/copy/narrative.ts`, `src/engine/liveLegs.ts`, `src/ui/PilotPages.tsx`, `src/ui/StatusScreen.tsx`
- Test: `tests/copy/narrativeAway.test.ts`, `tests/engine/liveLegs.test.ts`, `tests/ui/livePages.test.tsx`

- [x] **Step 1: Write the tests.**

**In `tests/copy/narrativeAway.test.ts`, replace:**

```ts

describe('countdowns for screen readers', () => {
```

**with:**

```ts

describe('narrative while the real plane is back at its departure airport after an air return (air return design §3)', () => {
  const driver = engineFor(demoRaw('driver', A))
  /** The sentence at `minutes`, with the flight under way's real plane back at its gate, or `returned` another flight's. */
  const back = (minutes: number, more: Partial<NarrativeCtx> = {}) => {
    const snap = makeSnapshot(driver.schedule, driver.legs, at(minutes), NY)
    const id = (snap.status.current as MoveLeg).id
    return narrative(snap, { ...ctx(minutes), stillOnGroundFlight: id, returnedFlight: id, ...more })
  }

  it('says it has returned there, with the countdown and the time as before', () => {
    expect(plain(back(100))).toBe('Alex has returned to Louisville on UPS flight 2961 to Rockford — landing in 50m which is 8:00am EDT.')
  })

  it('says "about" of a landing time that’s the real plane’s estimate, as before', () => {
    const end = (makeSnapshot(driver.schedule, driver.legs, at(100), NY).status.current as MoveLeg).end
    expect(plain(back(100, { estimatedArrival: end })))
      .toBe('Alex has returned to Louisville on UPS flight 2961 to Rockford — landing in 50m which is about 8:00am EDT.')
  })

  it('says still on the ground, as before, when the flight back is another', () => {
    expect(plain(back(100, { returnedFlight: 'another flight' })))
      .toBe('Alex is still on the ground in Louisville on UPS flight 2961 to Rockford — landing in 50m which is 8:00am EDT.')
  })
})

describe('countdowns for screen readers', () => {
```

**In `tests/engine/liveLegs.test.ts`, replace (1 of 3):**

```ts
import {
  estimatedArrival, isEstimatedArrival, landedFlight, liveMapFlights, stillOnGroundFlight, watchedFlights, withLiveTimes,
} from '../../src/engine/liveLegs'
```

**with:**

```ts
import {
  estimatedArrival, isEstimatedArrival, landedFlight, liveMapFlights, returnedFlight, stillOnGroundFlight, watchedFlights, withLiveTimes,
} from '../../src/engine/liveLegs'
```

**In `tests/engine/liveLegs.test.ts`, replace (2 of 3):**

```ts
import { airport, at, LIVE_CASES, made } from '../map/liveCases'
import { fix, liveFlight, MINUTE, point, START } from '../map/madeUpFlights'
```

**with:**

```ts
import { airport, at, LIVE_CASES, made } from '../map/liveCases'
import { backAtTheGate } from '../map/liveTrip'
import { fix, liveFlight, MINUTE, point, START } from '../map/madeUpFlights'
```

**In `tests/engine/liveLegs.test.ts`, replace (3 of 3):**

```ts

describe('a real plane down, not yet at the gate (the landed, not yet at the gate design §2, Todd, 17 Nov 2026)', () => {
```

**with:**

```ts

describe('a real plane back at its departure airport after an air return (air return design §3)', () => {
  const at = (live: LiveFlight | null, minutes: number) => {
    const schedule = scheduleOf(TURN_TRIP)
    const now = START + minutes * MINUTE
    const flights = live ? flightsFor(schedule, live) : new Map()
    const legs = buildLegs(withLiveTimes(schedule, flights, now))
    return { returned: returnedFlight(legs, flights, now), stillOnGround: stillOnGroundFlight(legs, flights, now) }
  }

  it('is the flight between its gates whose plane is back, by its id, which is still on the ground there too', () => {
    expect(at(backAtTheGate(45), 45)).toEqual({ returned: 'f1', stillOnGround: 'f1' })
  })

  it('is nothing for a plane that never left, in the air, and with no live data', () => {
    expect(at(liveFlight([], { legId: 'f1', state: 'ground', fix: fix(25 - 1 / 3, airport('SDF').lat, airport('SDF').lng, { onGround: true }) }), 25))
      .toEqual({ returned: null, stillOnGround: 'f1' })
    expect(at(IN_THE_AIR, 52).returned).toBeNull()
    expect(at(null, 45).returned).toBeNull()
  })
})

describe('a real plane down, not yet at the gate (the landed, not yet at the gate design §2, Todd, 17 Nov 2026)', () => {
```

**In `tests/ui/livePages.test.tsx`, replace (1 of 2):**

```tsx
import { PilotPages } from '../../src/ui/PilotPages'
import { atTheGate, FLYING, LANDED_EARLY, LIVE_AIRPORTS, SCHEDULE, SDF } from '../map/liveTrip'
import { fix, liveFlight, MINUTE, START } from '../map/madeUpFlights'
```

**with:**

```tsx
import { PilotPages } from '../../src/ui/PilotPages'
import { atTheGate, backAtTheGate, FLYING, LANDED_EARLY, LIVE_AIRPORTS, SCHEDULE, SDF } from '../map/liveTrip'
import { fix, liveFlight, MINUTE, START } from '../map/madeUpFlights'
```

**In `tests/ui/livePages.test.tsx`, replace (2 of 2):**

```tsx

describe('the status page with a real plane down, not yet at the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026)', () => {
```

**with:**

```tsx

describe('the status page with a real plane back at its departure airport after an air return (air return design §3)', () => {
  /** Off on time, out and back, and on the ground in Louisville again at 44 minutes. */
  const BACK = START + 45 * MINUTE

  it('says so in the narrative, on the card’s bar and its chip, with "about" the landing time', () => {
    vi.setSystemTime(BACK)
    const container = page({ flights: new Map([['f1', backAtTheGate(45)]]), clockOffset: 0 })
    expect(container.querySelector('.narrative-text')?.textContent)
      // The countdown's digits, then its words for screen readers; the time in the zone the tests run in, whatever its name.
      .toMatch(/^Alex has returned to Louisville on UPS flight 1234 to Philadelphia — landing in \d+h \d+m\d.* which is about \d{1,2}:\d\d[ap]m \S+\.$/)
    expect(container.querySelector('.inflight-status')?.textContent).toBe('Returned to Louisville')
    expect(container.querySelector('.trip-map-chip.bottom')?.textContent).toBe('Returned to Louisville')
    expect(container.querySelector('.trip-map-card h2')?.textContent).toBe('On the ground')
  })
})

describe('the status page with a real plane down, not yet at the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026)', () => {
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/copy/narrativeAway.test.ts tests/engine/liveLegs.test.ts tests/ui/livePages.test.tsx
```

Expected: 5 of the 98 tests fail, in the three files, because `returnedFlight` isn't there yet and the narrative doesn't read it: "is still on the ground in Louisville" where it should be "has returned to Louisville". The narrative's "another flight" test passes already, as it should.

- [x] **Step 3: Write the code.**

**In `src/copy/narrative.ts`, replace (1 of 2):**

```ts
  stillOnGroundFlight?: string | null
  /**
```

**with:**

```ts
  stillOnGroundFlight?: string | null
  /**
   * That flight, by its leg's id, while its real plane is back at its departure airport after an air return: the
   * sentence says "has returned to" in place of "is still on the ground in" (air return design §3).
   */
  returnedFlight?: string | null
  /**
```

**In `src/copy/narrative.ts`, replace (2 of 2):**

```ts
      // flight 2963 to Anchorage — landing in 5h 37m which is about 6:58pm EST." (the website's own, Todd, 16 Nov 2026).
      if (ctx.stillOnGroundFlight === f.id) {
        return n.t(`${name} is still on the ground in `).b(city(f.dep)).t(`${fl || ' on the flight'} to `).b(city(f.arr))
          .t(' — landing in ').cd(f.end, delay ? changed : 'status').t(' which is ').time(f.end).t('.').spans
```

**with:**

```ts
      // flight 2963 to Anchorage — landing in 5h 37m which is about 6:58pm EST." (the website's own, Todd, 16 Nov 2026).
      // Back there after an air return: "Alex has returned to Rockford on UPS flight 2963 to Anchorage — …" (air return
      // design §3).
      if (ctx.stillOnGroundFlight === f.id) {
        const where = ctx.returnedFlight === f.id ? 'has returned to' : 'is still on the ground in'
        return n.t(`${name} ${where} `).b(city(f.dep)).t(`${fl || ' on the flight'} to `).b(city(f.arr))
          .t(' — landing in ').cd(f.end, delay ? changed : 'status').t(' which is ').time(f.end).t('.').spans
```

**In `src/engine/liveLegs.ts`, replace (1 of 2):**

```ts
import type { LiveFlight } from '../map/liveFlight'
import { hasLanded, isAtDeparture, isEstimate, makeMapFlight, mapFlightProgress, type MapFlight } from '../map/mapFlight'
import { isMove, type Leg } from './legs'
```

**with:**

```ts
import type { LiveFlight } from '../map/liveFlight'
import { hasLanded, hasReturned, isAtDeparture, isEstimate, makeMapFlight, mapFlightProgress, type MapFlight } from '../map/mapFlight'
import { isMove, type Leg } from './legs'
```

**In `src/engine/liveLegs.ts`, replace (2 of 2):**

```ts
/**
 * The flight between its gates at `now` whose real plane has landed, by its leg's id: the narrative says so in place of
```

**with:**

```ts
/**
 * The flight between its gates at `now` whose real plane is back on the ground at its departure airport after an air
 * return, by its leg's id: `stillOnGroundFlight` names it too, and the narrative says "has returned to" in place of "is
 * still on the ground in" (air return design §3). Null with no such flight.
 */
export function returnedFlight(legs: Leg[], flights: ReadonlyMap<string, MapFlight>, now: number): string | null {
  const id = stillOnGroundFlight(legs, flights, now)
  const flight = id == null ? undefined : flights.get(id)
  return flight != null && hasReturned(flight, now) ? id : null
}

/**
 * The flight between its gates at `now` whose real plane has landed, by its leg's id: the narrative says so in place of
```

**In `src/ui/PilotPages.tsx`, replace (1 of 3):**

```tsx
import { buildLegs, type Leg } from '../engine/legs'
import { estimatedArrival, landedFlight, liveMapFlights, stillOnGroundFlight, withLiveTimes } from '../engine/liveLegs'
import { safeSnapshot, type Snapshot } from '../engine/snapshot'
```

**with:**

```tsx
import { buildLegs, type Leg } from '../engine/legs'
import { estimatedArrival, landedFlight, liveMapFlights, returnedFlight, stillOnGroundFlight, withLiveTimes } from '../engine/liveLegs'
import { safeSnapshot, type Snapshot } from '../engine/snapshot'
```

**In `src/ui/PilotPages.tsx`, replace (2 of 3):**

```tsx
  const onGround = ready ? stillOnGroundFlight(ready.legs, ready.flights, now) : null
  // And the flight under way while its real plane is down, not yet at the gate: the narrative says it has landed (the
```

**with:**

```tsx
  const onGround = ready ? stillOnGroundFlight(ready.legs, ready.flights, now) : null
  // Of which one back there after an air return: "has returned to" (air return design §3).
  const returned = ready ? returnedFlight(ready.legs, ready.flights, now) : null
  // And the flight under way while its real plane is down, not yet at the gate: the narrative says it has landed (the
```

**In `src/ui/PilotPages.tsx`, replace (3 of 3):**

```tsx
    snap, now, viewerTz, homeTz, h24, airports, weather, demo, celebrateKey, footer, notice, quickStatus, tripMap, land, facts,
    onOpenMap: mapPage.show, estimatedArrival: estimated, stillOnGroundFlight: onGround, landedFlight: down,
  }
```

**with:**

```tsx
    snap, now, viewerTz, homeTz, h24, airports, weather, demo, celebrateKey, footer, notice, quickStatus, tripMap, land, facts,
    onOpenMap: mapPage.show, estimatedArrival: estimated, stillOnGroundFlight: onGround, returnedFlight: returned, landedFlight: down,
  }
```

**In `src/ui/StatusScreen.tsx`, replace (1 of 2):**

```tsx
  /**
   * The flight under way, by its leg's id, while its real plane is down and not yet at the gate: the narrative says it
```

**with:**

```tsx
  /**
   * That flight, by its leg's id, while its real plane is back at its departure airport after an air return: the
   * narrative says "has returned to" (air return design §3).
   */
  returnedFlight?: string | null
  /**
   * The flight under way, by its leg's id, while its real plane is down and not yet at the gate: the narrative says it
```

**In `src/ui/StatusScreen.tsx`, replace (2 of 2):**

```tsx
    now: p.now, viewerTz: p.viewerTz, h24: p.h24, airports: p.airports, estimatedArrival: p.estimatedArrival, stillOnGroundFlight: p.stillOnGroundFlight,
    landedFlight: p.landedFlight,
  })
```

**with:**

```tsx
    now: p.now, viewerTz: p.viewerTz, h24: p.h24, airports: p.airports, estimatedArrival: p.estimatedArrival, stillOnGroundFlight: p.stillOnGroundFlight,
    returnedFlight: p.returnedFlight, landedFlight: p.landedFlight,
  })
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 98 tests pass. Then `npx tsc --noEmit`: nothing; `npm test`: 179 test files and 3,848 tests pass, and the same with `TZ=UTC npm test`, as GitHub's build runs; and `npm run build` ends `✓ built`. Last, the shared cases:

```bash
git diff --name-only 74acf06 -- tests/fixtures/trip-map && shasum -a 256 tests/fixtures/trip-map/live-cases.json
```

Expected: `tests/fixtures/trip-map/live-cases.json` alone, Task 2's copy, and the checksum of Task 2's Step 1. No other step changes them.

- [x] **Step 5: The checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && TZ=UTC npm test && npm run build
```

Expected: 179 test files and 3,848 tests pass, twice (in this Mac's time zone, then in UTC as GitHub's build runs), and the build ends `✓ built`.

- [x] **Step 6: Commit, on Todd's yes.** Only these files, by path:

```bash
git add src/copy/narrative.ts src/engine/liveLegs.ts src/ui/PilotPages.tsx src/ui/StatusScreen.tsx tests/copy/narrativeAway.test.ts tests/engine/liveLegs.test.ts tests/ui/livePages.test.tsx
git commit -m "The status sentence says \"has returned to Rockford\" for a real plane back at its departure airport (air return design §3, Todd, 17 Nov 2026)"
```

---

### Task 5: The demo scene `live-returned`

A scene for Todd's look, wired as the other live scenes are (`src/data/demoLive.ts`, `src/data/demo.ts`, the README): UPS2963, Rockford to Anchorage, off on time, out 40 nm and straight back climbing to 9,000 ft at the turn, and on the ground at Rockford again 30 minutes after it took off. The page opens 50 minutes after the plan's takeoff, and the plane stays back while the page is open.

**Files:**
- Modify: `src/data/demo.ts`, `src/data/demoLive.ts`, `README.md`
- Test: `tests/data/demoLive.test.ts`, `tests/data/demoScenes.test.ts`, `tests/ui/StatusScreen.test.tsx`

- [x] **Step 1: Write the tests.**

**In `tests/data/demoLive.test.ts`, replace (1 of 2):**

```ts

  it('stays itself while the page is open', () => {
```

**with:**

```ts

  it('live-returned: back at Rockford after an air return, 50 minutes after the plan’s takeoff (air return design §3)', () => {
    const scene = sceneAt('live-returned')!
    expect(scene.progress.phase).toBe('returned')
    expect(scene.label).toBe('Returned')
    expect(scene.flight.live?.callsign).toBe('UPS2963')
    // The way out and back isn't the flight's path.
    expect(scene.flight.path.isReal).toBe(false)
    const { at, facts } = sceneFacts('live-returned')
    expect(headline(facts, at)).toBe('Returned to Rockford')
  })

  it('stays itself while the page is open', () => {
```

**In `tests/data/demoLive.test.ts`, replace (2 of 2):**

```ts
    expect(sceneAt('live-on-ground-late', 60)?.label).toBe('Still on the ground · 1 h 20 min behind')
  })
```

**with:**

```ts
    expect(sceneAt('live-on-ground-late', 60)?.label).toBe('Still on the ground · 1 h 20 min behind')
    expect(sceneAt('live-returned', 60)?.progress.phase).toBe('returned')
  })
```

**In `tests/data/demoScenes.test.ts`, replace (1 of 2):**

```ts
  'live-long-gap': 'inFlight',
}
```

**with:**

```ts
  'live-long-gap': 'inFlight',
  'live-returned': 'inFlight',
}
```

**In `tests/data/demoScenes.test.ts`, replace (2 of 2):**

```ts
    'live-long-gap': { progress: { day: 1, days: 2, upcoming: ['SDF'] } },
  }
```

**with:**

```ts
    'live-long-gap': { progress: { day: 1, days: 2, upcoming: ['SDF'] } },
    'live-returned': { progress: { day: 1, days: 2, upcoming: ['SDF'] } },
  }
```

**In `tests/ui/StatusScreen.test.tsx`, replace (1 of 2):**

```tsx
    'live-long-gap': null,
  }
```

**with:**

```tsx
    'live-long-gap': null,
    'live-returned': null,
  }
```

**In `tests/ui/StatusScreen.test.tsx`, replace (2 of 2):**

```tsx
    )
    const inTheAir = ['flying', 'last-leg', 'live-ahead', 'live-ocean-gap', 'live-on-ground-late', 'live-landed', 'live-long-gap']
    expect(container.querySelector('.inflight') != null).toBe(inTheAir.includes(scene))
```

**with:**

```tsx
    )
    const inTheAir = ['flying', 'last-leg', 'live-ahead', 'live-ocean-gap', 'live-on-ground-late', 'live-landed', 'live-long-gap', 'live-returned']
    expect(container.querySelector('.inflight') != null).toBe(inTheAir.includes(scene))
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/data/demoLive.test.ts tests/data/demoScenes.test.ts tests/ui/StatusScreen.test.tsx
```

Expected: 3 of the 154 tests fail, in two of the three files, because `live-returned` isn't a scene yet: its test, its plane staying itself while the page is open, and its trip card. `tests/ui/StatusScreen.test.tsx` passes. Its tests, and the rest of `tests/data/demoScenes.test.ts`'s, go through the scenes there are, and `live-returned` joins them with the code: three tests more at Step 4.

- [x] **Step 3: Write the code, the README's line.**

**In `src/data/demo.ts`, replace (1 of 3):**

```ts
  | 'last-leg' | 'driving-home' | 'commuting-home' | 'reserve' | 'training' | 'nothing-ahead' | 'recap'
  | 'live-ahead' | 'live-ocean-gap' | 'live-on-ground-late' | 'live-landed' | 'live-long-gap'

```

**with:**

```ts
  | 'last-leg' | 'driving-home' | 'commuting-home' | 'reserve' | 'training' | 'nothing-ahead' | 'recap'
  | 'live-ahead' | 'live-ocean-gap' | 'live-on-ground-late' | 'live-landed' | 'live-long-gap' | 'live-returned'

```

**In `src/data/demo.ts`, replace (2 of 3):**

```ts
  // takeoff; down in Anchorage a minute ago, not yet at the gate; and out of tracking range for 2 h 8 min on the way to
  // Anchorage, 87 minutes from its gate (long gap design §3). `flying` stays the schedule's alone.
  'live-ahead': { variant: 'driver', offset: 100 },
```

**with:**

```ts
  // takeoff; down in Anchorage a minute ago, not yet at the gate; and out of tracking range for 2 h 8 min on the way to
  // Anchorage, 87 minutes from its gate (long gap design §3); and back at Rockford after an air return, 50 minutes after
  // the plan's takeoff (air return design §3). `flying` stays the schedule's alone.
  'live-ahead': { variant: 'driver', offset: 100 },
```

**In `src/data/demo.ts`, replace (3 of 3):**

```ts
  'live-long-gap': { variant: 'driver', offset: 463 },
}
```

**with:**

```ts
  'live-long-gap': { variant: 'driver', offset: 463 },
  'live-returned': { variant: 'driver', offset: 290 },
}
```

**In `src/data/demoLive.ts`, replace (1 of 6):**

```ts
import type { Move, Schedule } from '../engine/types'
import { airborneWindow } from '../map/flightProgress'
import { distanceMeters, pointAlong, type GeoPoint } from '../map/greatCircle'
import type { LiveFix, LiveFlight, TrailPoint } from '../map/liveFlight'
import { flatMapAngle } from '../map/planeHeading'
```

**with:**

```ts
import type { Move, Schedule } from '../engine/types'
import { airborneWindow } from '../map/flightProgress'
import { distanceMeters, METERS_PER_NM, pointAlong, type GeoPoint } from '../map/greatCircle'
import type { LiveFix, LiveFlight, TrailPoint } from '../map/liveFlight'
import { flatMapAngle } from '../map/planeHeading'
```

**In `src/data/demoLive.ts`, replace (2 of 6):**

```ts
 */

export type LiveDemoScene = 'live-ahead' | 'live-ocean-gap' | 'live-on-ground-late' | 'live-landed' | 'live-long-gap'

interface Story {
```

**with:**

```ts
 */

export type LiveDemoScene = 'live-ahead' | 'live-ocean-gap' | 'live-on-ground-late' | 'live-landed' | 'live-long-gap' | 'live-returned'

interface Story {
```

**In `src/data/demoLive.ts`, replace (3 of 6):**

```ts
  /** Minutes after the takeoff it was last seen, or null when it's seen all the way. */
  lastSeen: number | null
}

```

**with:**

```ts
  /** Minutes after the takeoff it was last seen, or null when it's seen all the way. */
  lastSeen: number | null
  /**
   * Minutes after the takeoff it's down at its departure airport again, having flown out 40 nm and straight back,
   * climbing to 9,000 ft at the turn: an air return (air return design §2). Absent for a flight that goes on.
   */
  backAfter?: number
}

```

**In `src/data/demoLive.ts`, replace (4 of 6):**

```ts
  // to make after them wait until it's at the gate (long gap design §3). The demo's trips cross no ocean.
  'live-long-gap': { number: '2963', bow: 1.5, takeoffLate: 0, unseen: [], lastSeen: 95 },
}

```

**with:**

```ts
  // to make after them wait until it's at the gate (long gap design §3). The demo's trips cross no ocean.
  'live-long-gap': { number: '2963', bow: 1.5, takeoffLate: 0, unseen: [], lastSeen: 95 },
  // Rockford to Anchorage, off on time, out 40 nm and back, and on the ground at Rockford again 30 minutes after it took
  // off: "Returned to Rockford", 20 minutes on (air return design §3).
  'live-returned': { number: '2963', bow: 0, takeoffLate: 0, unseen: [], lastSeen: null, backAfter: 30 },
}

```

**In `src/data/demoLive.ts`, replace (5 of 6):**

```ts
  const length = steps.slice(1).reduce((sum, p, i) => sum + distanceMeters(steps[i], p), 0)
  const takeoff = plan.start + story.takeoffLate * MINUTE
  const inAir = (plan.end - plan.start) * (length / distanceMeters(from, to))
  const touchdown = takeoff + inAir
```

**with:**

```ts
  const length = steps.slice(1).reduce((sum, p, i) => sum + distanceMeters(steps[i], p), 0)
  const takeoff = plan.start + story.takeoffLate * MINUTE
  if (story.backAfter != null) return cameBack(base, from, to, takeoff, takeoff + story.backAfter * MINUTE, now)
  const inAir = (plan.end - plan.start) * (length / distanceMeters(from, to))
  const touchdown = takeoff + inAir
```

**In `src/data/demoLive.ts`, replace (6 of 6):**

```ts
  return { ...base, state: 'airborne', fix: fixAt(place(seenAt), track(seenAt), seenAt, false), trail }
}
```

**with:**

```ts
  return { ...base, state: 'airborne', fix: fixAt(place(seenAt), track(seenAt), seenAt, false), trail }
}

/** How far out an air return flies before it turns back: 40 nautical miles. */
const RETURN_TURN_METERS = 40 * METERS_PER_NM

/**
 * A plane off from `from` at `takeoff`, out 40 nm toward `to` and straight back, climbing to 9,000 ft at the turn, and
 * on the ground at `from` again at `back`: an air return (air return design §2). In the air before then, as its trail
 * so far and its fix.
 */
function cameBack(
  base: Pick<LiveFlight, 'legId' | 'callsign' | 'landedAt'>, from: GeoPoint, to: GeoPoint, takeoff: number, back: number, now: number,
): LiveFlight {
  // 0 at the takeoff and back at the airport, 1 at the turn.
  const out = (t: number) => 1 - Math.abs((2 * (t - takeoff)) / (back - takeoff) - 1)
  const turn = RETURN_TURN_METERS / distanceMeters(from, to)
  const place = (t: number) => pointAlong(from, to, out(t) * turn)
  const trail: TrailPoint[] = []
  for (let t = takeoff + MINUTE; t < back && t <= now - MINUTE; t += MINUTE) {
    trail.push({ time: t, place: place(t), altitudeFt: Math.round(1_000 + 8_000 * out(t)) })
  }
  const seenAt = now - FIX_AGE_MS
  if (seenAt >= back) return { ...base, state: 'ground', fix: fixAt(from, null, seenAt, true), trail }
  return { ...base, state: 'airborne', fix: fixAt(place(seenAt), null, seenAt, false), trail }
}
```

**In `README.md`, replace:**

```markdown
  - A marker shows what the pilot is doing on the ground: a bed on a layover (`layover`), an hourglass at a turn (`turn`), a briefcase at base (`base`), a house at home (`home`).
  - The real plane, from Crewlu Cloud's `partner_live` (Stage 3): `live-ahead` (in the air, ahead of schedule), `live-ocean-gap` (faded, an estimate past a stretch nobody saw), `live-on-ground-late` (still at the gate after the plan's takeoff), `live-landed` (down, a few minutes from the gate) and `live-long-gap` (out of tracking range for more than 2 hours: nothing below named, and its crossings held until the gate), with made-up flights. `flying` stays the schedule's alone.
  - The full map's timeline is colored by what the pilot is doing. Its "Quick layovers" switch, on by default and remembered in the browser, hurries a replay through each wait.
```

**with:**

```markdown
  - A marker shows what the pilot is doing on the ground: a bed on a layover (`layover`), an hourglass at a turn (`turn`), a briefcase at base (`base`), a house at home (`home`).
  - The real plane, from Crewlu Cloud's `partner_live` (Stage 3): `live-ahead` (in the air, ahead of schedule), `live-ocean-gap` (faded, an estimate past a stretch nobody saw), `live-on-ground-late` (still at the gate after the plan's takeoff), `live-landed` (down, a few minutes from the gate), `live-long-gap` (out of tracking range for more than 2 hours: nothing below named, and its crossings held until the gate) and `live-returned` (back at Rockford after an air return), with made-up flights. `flying` stays the schedule's alone.
  - The full map's timeline is colored by what the pilot is doing. Its "Quick layovers" switch, on by default and remembered in the browser, hurries a replay through each wait.
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 157 tests pass. Then `npx tsc --noEmit`: nothing; `npm test`: 179 test files and 3,853 tests pass, and the same with `TZ=UTC npm test`, as GitHub's build runs; and `npm run build` ends `✓ built`. Last, the shared cases:

```bash
git diff --name-only 74acf06 -- tests/fixtures/trip-map && shasum -a 256 tests/fixtures/trip-map/live-cases.json
```

Expected: `tests/fixtures/trip-map/live-cases.json` alone, Task 2's copy, and the checksum of Task 2's Step 1. No other step changes them.

- [x] **Step 5: The checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && TZ=UTC npm test && npm run build
```

Expected: 179 test files and 3,853 tests pass, twice (in this Mac's time zone, then in UTC as GitHub's build runs), and the build ends `✓ built`.

- [x] **Step 6: Commit, on Todd's yes.** Only these files, by path:

```bash
git add README.md src/data/demo.ts src/data/demoLive.ts tests/data/demoLive.test.ts tests/data/demoScenes.test.ts tests/ui/StatusScreen.test.tsx
git commit -m "The demo scene live-returned: a plane back at Rockford after an air return"
```

---

### Task 6: Todd looks at the words

The tests check the words. This is the look at them.

- [x] **Step 1: Start the site with Apple's map.**
  - The worktree has the MapKit token in `.env.local` from plan 3C-2. The file is git-ignored, and the token lasts to 22 Nov 2026. If the site's own map shows instead of Apple's, the token has run out, and Todd makes another as the README says.
  - The session starts the `crewluve-mapkit` server (`.claude/launch.json`, port 5182) with its preview tool.
  - In `live-returned`, it reads:
    - the card's bar;
    - the card's chip;
    - the card's sentence: the card's button's `aria-label`, `[data-trip-map-open]`;
    - the status sentence;
    - on the full map: the pill, the first line, "More facts" first row, the list, the line under the timeline and the plane's popup.
  - It gives Todd those, and these addresses:
    - `http://localhost:5182/?demo=1&scene=live-returned`, and the same with `#map` at the end.
    - `http://localhost:5182/?demo=1&scene=live-on-ground-late` and `…scene=live-ahead`, each also with `#map`: a plane that never left, and one in the air, unchanged.
- [x] **Step 2: Todd looks, on a phone and a computer.**
  - In `live-returned`:
    - the card's bar: "Returned to Rockford", with "Lands about …";
    - the chip: "Returned to Rockford";
    - the status sentence: "Alex has returned to Rockford on UPS flight 2963 to Anchorage — landing in … which is about …";
    - the plane at Rockford, with no ghost;
    - the line under the timeline: "… · Returned to Rockford";
    - the popup: "Returned to Rockford", then "Lands about …".
  - In `live-returned`'s "More facts":
    - the first row "Returned to Rockford";
    - "2,788 mi to go";
    - no sky row;
    - the flight left out of the list.
  - Unchanged: `live-on-ground-late` ("Still on the ground in Rockford") and `live-ahead`.
- [x] **Step 3: Write down what was wrong.** Anything that needs a change:
  - goes in "Changes made during execution";
  - is fixed in Tasks 2 to 5's files, with a test where a test can see it;
  - and has Todd run the tests again.

---

### Task 7: The review, and the record

- [x] **Step 1: The review.**
  - Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Tasks 2 to 5's commits (from `74acf06`).
  - It reviews them against:
    - the app's design and plan (`git -C ~/Dev/Crewluv show c935f21:…`);
    - the app's commits `3128507`, `2a9e33b`, `113006d` and `e084213`;
    - this plan's list of where it settles details.
  - Make its fixes, tests first.
  - Run `npm test`, `TZ=UTC npm test` and `npm run build`.
  - Record what it found.
- [x] **Step 2: Todd runs everything once more,** if the review changed anything. That's Task 5 Step 5's command. The fix is committed on his yes, its own files by path.
- [x] **Step 3: This plan's record.** Under "Changes made during execution":
  - the review;
  - each of Todd's runs, with the count and the time;
  - what Task 6 turned up;
  - each commit's hash.
- [x] **Step 4: Commit, on Todd's yes.**

```bash
git add docs/superpowers/plans/2026-11-17-website-air-return.md
git commit -m "The website's air return plan, with its record"
```

---

### Task 8: Going live, on Todd's yes

This plan goes live. Pushing to `main` publishes the site: `.github/workflows` tests and builds every push to `main` in UTC, then publishes it to Pages. **Nothing here runs without Todd's yes in the conversation, asked when this task is reached.**

- [ ] **Step 1: Ask Todd** whether to go live now. If not, stop: the branch stays as it is, and this task waits.
- [ ] **Step 2: Bring the branch up to `main`.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git fetch origin && git merge-base --is-ancestor origin/main HEAD && echo "fast-forward"
```

Expected: `fast-forward`.

If it isn't, `main` has moved on from `74acf06`, where it was when this plan was written:
1. Merge it in here: `git merge origin/main`.
2. If any file conflicts, STOP and tell Todd.
3. Then run `npm test && npm run build`.

- [ ] **Step 3: The suite as GitHub runs it,** in UTC, on the branch as it will go live:

```bash
TZ=UTC npx vitest run
```

Expected: every test file and test passes, the same counts as `npm test`. If any fails, STOP: fix it here, tests first, before anything is pushed.

- [ ] **Step 4: Todd runs everything** on the branch as it will go live. That's Task 5 Step 5's command.
- [ ] **Step 5: Push the branch to `main`, on Todd's yes.** A fast-forward only; never force.

```bash
git push origin claude/trip-map-live-598046:main
```

- [ ] **Step 6: Watch the deploy** (`gh run watch` on the run the push started) until it succeeds. If it fails, tell Todd at once with its log: the site stays as it was until a deploy succeeds.
- [ ] **Step 7: Look at the live site** with Todd:
  - `https://crewluve.crewlu.net/?demo=1&scene=live-returned` and `…&scene=live-returned#map`: "Returned to Rockford" on the bar, the chip, the first row and under the timeline, and "has returned to Rockford" in the status sentence.
  - `…scene=live-on-ground-late#map` and `…scene=live-ahead#map`: unchanged.
- [ ] **Step 8: The record.** Under "Changes made during execution":
  - the push's commit;
  - the deploy's run and time;
  - what Todd saw.

  Then commit the plan on his yes, and push it (a fast-forward only), as Step 5.

---

## What the website shares with the app

The same rule and words (the design's §2 to §4), as the website has them:

- **When it has returned:**
  - on the ground by Crewlu Cloud's state, with a fresh fix within 10 nm of the departure airport;
  - and the trail has climbed 1,000 ft, its highest point over its lowest. Points with no height don't count.
  - Otherwise it's still on the ground, as before. A stray point while taxiing can't climb.
- **While it's back:**
  - the plane is at its fix, with no ghost;
  - it lands at "now plus the plan's time in the air", so the leg stays open;
  - "Returned to Rockford" on the bar, the popup, the facts' headline and first row, the chip and under the timeline;
  - "has returned to Rockford" in the status sentence, and "returned to Rockford" in the card's sentence;
  - otherwise the facts read as a plane still at the gate;
  - now only: a replay reads as before.
- **A second takeoff** starts the path afresh, at a point within 30 nm of the airport, more than 10 minutes after one within 10 nm, once the try before had climbed. The fix in the air can start it. The path, the record and the own speed follow it.
- **The website's own:**
  - the card's heading for screen readers, "On the ground";
  - the demo scene `live-returned`;
  - a test file of the rule's edges, `tests/map/airReturn.test.ts`.

## Changes made during execution

- **Tasks 1 to 5** were run in session `68f03a67` on 17 Nov 2026, from this plan's own text: tests first, every file the same as tested. Each Step 2 failed as written: 29 of 348, 15 of 154, 5 of 98 and 3 of 154.
- **Todd's runs** (`npm test && TZ=UTC npm test && npm run build`, in his Terminal) all passed, and each task was committed on his "Run each, commit each":
  - **Task 2:** 3,827 tests in Eastern time and in UTC (22:27 UTC), and the build. Commit `77915c5`.
  - **Task 3:** 3,842 tests (22:32 UTC). Commit `58da556`.
  - **Task 4:** 3,848 tests (5:33 PM EST and 22:34 UTC). Commit `b96037c`.
  - **Task 5:** 3,853 tests (5:35 PM EST and 22:35 UTC). Commit `81dd9db`.
- **Task 6, Todd's look:** "Looks good". On this Mac, `live-returned` read as planned:
  - "Returned to Rockford" on the bar, the chip, the pill, the first row and under the timeline ("Tue 5:36 PM · Returned to Rockford");
  - the status sentence: "Alex has returned to Rockford on UPS flight 2963 to Anchorage — landing in 5h 14m which is about 10:51pm EST";
  - the card's sentence: "UPS2963 to Anchorage, returned to Rockford. Lands about 10:51 PM your time.";
  - the popup: "Returned to Rockford", then "Lands about 10:52 PM";
  - "2,788 mi to go", no sky row, the flight left out of the list, and no ghost;
  - `live-on-ground-late` unchanged ("Still on the ground · 20 min behind").
- **Task 7, the review:** the review before the plan (above, in "How this plan was checked") read every source file these commits hold, byte for byte. After it, only two test files changed. A check found every committed file the same as the tested copy, and every source file in the diff it reviewed. So no second review was dispatched: it would have read the same code. Nothing was found to fix.

## Self-review

- **The design covered:**
  - §2's rule, with its constant, the shared cases and the stray point (Task 2).
  - §3's plane, estimate, ghost, label (Task 2) and words (Tasks 3 and 4), and "now only" (Tasks 3 and 4).
  - §4's restart, with the fix that starts one (Task 2).
  - §5's tests: the shared cases (Task 2), and the words in each place in §3, with a replay (Tasks 3 and 4).
  - A scene to look at (Task 5).
- **Not covered here, on purpose:** §6's three, as the app leaves them, and the app's own words and docs, which its plan has done.
- **Placeholders:** none. Every step's code is the tested file or a replacement made from it, and the shared cases are the app's file.
- **What could it break?**
  - The path of a flight whose trail holds a gap of more than 10 minutes that starts within 10 nm of its departure airport and ends within 30 nm of it, after a climb of 1,000 ft. That's only an air return and a second takeoff: points come every 2 minutes in the air, and none on the ground. The shared cases pass with the new file.
  - A plane on the ground at its departure airport whose trail climbed: it reads "Returned" instead of "Still on the ground". A plane that never left has no trail, as Crewlu Cloud keeps only points in the air.
  - Everything else is unchanged: the shared cases' 30 other flights, every plan, gap and window, and `facts-cases.json`.

## Left for later

- **The design's §6,** as the app leaves it:
  - a return to another airport;
  - a cancelled flight after a return;
  - the first out-and-back drawn as a faint line.
- **The landed plan's "Left for later"** holds, with plans 3C-1 to 3C-4's.
