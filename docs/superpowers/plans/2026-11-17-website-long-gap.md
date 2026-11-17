# The Website's Best Guesses After a Long Gap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The website follows the app's two rules for a real plane out of tracking range for a long time. The landing estimate flies the plane's own speed for only the next 2 hours from where it was last tracked, and the schedule's after that. And past 2 hours out of range, the facts name only an ocean under the plane, with no city, and hold their events until it's tracked again or at its gate. Then this plan goes live, on Todd's yes.

**Architecture:**
- **The speed** (Task 2): `flownPlan` (`src/map/flightPlan.ts`) makes the plane's own speed for `OWN_SPEED_AHEAD_MS` and the schedule's after into one cruise speed, `cruiseSpeed`, as the app's `FlightPlan.flown(along:)` and `FlightPlan.cruiseSpeed(over:own:planned:)`. The estimate, the estimated plane, the ghost and the record already fly that one plan (`src/map/liveProgress.ts`, `src/map/flightRecord.ts`), so nothing else changes. The app's new shared cases test it.
- **What's below** (Task 3): `isPastGuessHorizon` (`src/facts/planePosition.ts`) says the plane has been out of range more than 2 hours; `isOcean` (`src/facts/geography.ts`) is one of the five oceans; `placeBelow` (`src/facts/tripFacts.ts`) is what's under the plane, and past 2 hours only an ocean. `belowText` and the card's sentence read it.
- **The events** (Task 4): `toldMilestones` (`src/facts/tripFacts.ts`), the app's `TripFacts.milestones(on:at:)`, leaves out an event guessed more than 2 hours after the last sighting while the flight is between its gates. The headline, the banner and the list read it.
- **The demo** (Task 5): `live-long-gap` (`src/data/demoLive.ts`, `src/data/demo.ts`), wired as the other live scenes are, and listed in the README.

**Tech Stack:** Preact 10, TypeScript 5.9 (strict), Vite 5, Vitest 3. No new package.

**Sources (read only, in `~/Dev/Crewluv` at `4186f60` on `feature/trip-map-live`):**
- **The design:** `docs/superpowers/specs/2026-11-17-crewluve-best-guesses-after-a-long-gap-design.md`, approved by Todd on 17 Nov 2026 after the check of UPS96 (Anchorage to Clark) against Crewlu Cloud's record. §2 is the speed, §3 the words past 2 hours, and §4 says the website follows with the same two rules, in its own plan.
- **Todd's decision (17 Nov 2026):**

  > Website gets the same rules

- **The app's plan,** `docs/superpowers/plans/2026-11-17-best-guesses-after-a-long-gap.md`, its commits `bc4ee39` (the speed) and `2cc8f1a` (the words and the events), and its tests: `CrewluvTests/LongGapFactsTests.swift`, and the `cruiseSpeed` tests and the new constant's in `CrewluvTests/FlightPlanTests.swift`. This plan's names, tests and answers follow theirs.
- **The reference,** `scripts/live-cases/live.mjs` (`flownPlan`, `OWN_SPEED_AHEAD`), which writes the shared cases, `CrewluvTests/Fixtures/TripMap/live-cases.json`. Task 2 copies that file whole.

**How this plan was checked.** Every code block here comes from a file that was run before the plan was put together. None was typed into the plan by hand: a script made each replacement from the tested files and built the plan.
- **A scratch copy of this branch** at `3c93b48`, with this plan's files laid over it task by task. Every count below is the same in this Mac's time zone and in UTC (`TZ=UTC`), as GitHub's build runs.
  - Before: 177 test files and 3,751 tests, all passing, and `tsc --noEmit` clean.
  - After Task 2: 177 test files and 3,762 tests; after Task 3: 178 test files and 3,773 tests; after Task 4: 178 test files and 3,779 tests; after Task 5: 178 test files and 3,785 tests. All passing each time, `tsc --noEmit` finds nothing, and `npm run build` builds.
  - The shared cases: `live-cases.json` is the app's at `4186f60`, byte for byte, and passes; `facts-cases.json` is unchanged, and passes.
- **Tests first:** each task's tests were run before its code, and failed as its Step 2 says: 18 of 289 in Task 2, 10 of 11 in Task 3, 5 of 17 in Task 4, and 4 of 149 in Task 5.
- **47 deliberate breaks** were made in the new code, one at a time, and every one fails at least one test.
  - Task 2's 13: its own speed all the way, as before; the plan's speed all the way; an hour in place of 2; 3 hours in place of 2; the descent counted as cruise; the cruise left counted from the takeoff, not the last sighting; the two speeds swapped; the two speeds averaged; averaged by the distance, not the time; 2 hours counted in seconds as ms; the 2 hours flown at its own speed even when less is left; no cruise left is the plan's speed; the believed range dropped.
  - Task 3's 13: a city still told past 2 hours; a sea or land still named past 2 hours; not even an ocean named past 2 hours; any water an ocean; a misspelt ocean; an ocean left out; an hour in place of 2; 3 hours in place of 2; past 2 hours at 2 hours exactly; every estimated plane past 2 hours; a plane seen now past 2 hours; the card's sentence still names land; the headline and the rows still name land.
  - Task 4's 11: no event held; every guess ahead held; an hour in place of 2; the 2 hours counted from the moment shown; the 2 hours counted from the first sighting; still held after the flight is over; held events told by the headline; held events told by the banner; held events told by the list; held events dropped from the list for good; the gate counted as the schedule's.
  - Task 5's 10: no real plane in the scene; last seen within 2 hours of the moment; seen all the way; tracked again after the gap; lost over the United States; off 25 minutes late; the flight to Rockford; opens 40 minutes sooner; opens after the gate; opens on the ground at Rockford.
- **The plan itself** is checked by a script: Tasks 2 to 5's steps, followed in order on the branch's files at `3c93b48`, give every file as tested. Followed again on a fresh copy of those files, tests first, every file came out the same as tested, the tests failed and passed as Steps 2 and 4 say, and the copy's tests (178 test files and 3,785 tests, in both time zones), `tsc --noEmit` and the build passed.
- **Not checked:** nothing was seen in a browser: the scene is Todd's look, Task 6. No review yet: Task 7's is the first. Nothing called Crewlu Cloud or adsb.lol, and nothing used the network.

**Where this plan settles details.**
- **The speed's names:** `OWN_SPEED_AHEAD_MS`, in ms beside `OWN_SPEED_LEAST_MS`, held to the shared cases' `ownSpeedAheadMinutes`; and `cruiseSpeed(cruise, own, planned)`, exported from `src/map/flightPlan.ts` and tested with the app's three examples. `src/map/flightPath.ts` keeps its own private `cruiseSpeed`, which measures the plane's own speed; neither module imports the other's.
- **3:55 to 3:54:** the app's words tests of the Cologne case changed a minute. The website's tests of that case match the time's form, not its minute (`tests/copy/liveWords.test.ts`), so none changes; the shared case itself pins its new touchdown, 02:47:35.9 UTC, 33.5 seconds sooner, in the nine files Task 2's Step 2 runs.
- **Where the words are read:** what's below goes through `placeBelow`, read by `belowText` (the headline, the card's chip, the full map's first line, "More facts" first row) and by `cardSummary` (the card's sentence for screen readers). The events go through `toldMilestones`, read by `headline`, `latestEvent` (the banner, and the card's "Latest: …") and `tripSoFar` (the list). `factsMilestones` still gives every event, as the shared facts cases read them.
- **`isPastGuessHorizon` is a function,** not a field: the website's `PlanePosition` is a plain object, made in one place, and its tests make their own. `GUESS_HORIZON_MS` is `OWN_SPEED_AHEAD_MS`, deliberately the same, as the app's is, and a test says so.
- **The first row of "More facts",** the website's own test (the app's tests leave its sheet's rows alone): past 2 hours over land, "Last tracked over Alpha · 2 h 25 min ago" leads it, with closest to home under it, as the row has always taken the first line there is; over an ocean, "Over the Atlantic", then the "Last tracked" line.
- **"Once the flight is over"** is the leg's end, the gate arrival the map has: the real plane's estimate (the app's `leg.end`). A plane Crewlu Cloud says has landed has its landing as its path's last place, so it holds nothing.
- **A replay** keeps the same rules, as the app's does: past 2 hours after the last sighting only an ocean, and an event past them held while the moment is before the gate. A gap closed by a new sighting is a straight join between two places the plane was seen, and reads it with cities, as before.
- **The website's own words stay ahead of all this:** "Still on the ground in Rockford" at the gate, "Landed in Anchorage" before it, the latest event's banner (now the newest event told), and the "tracked" words.
- **The oceans** are named as geography.json names them, "the Pacific", "the Atlantic", "the Indian Ocean", "the Arctic Ocean" and "the Southern Ocean", and a test holds the five to the site's copy of the file, as the app's does to its own.
- **On the site's own geography,** the website's own test: the new shared case, Louisville to Cologne last tracked over Québec at 19:39:30 UTC, reads "Over the Atlantic" at 22:30 with no city, and the landing countdown at 00:40, guessed over England. Halfway (guessed at 21:45, 2 h 5 min on), Ireland, the United Kingdom, the North Sea, the Netherlands and Germany wait until 01:39, its gate.
- **The demo scene can't cross an ocean.** The demo's trips fly Louisville, Rockford, Anchorage, Miami and Ontario, California, over land. So `live-long-gap` is UPS2963, Rockford to Anchorage, off on time and last tracked over Saskatchewan 95 minutes later; the page opens 2 h 8 min after that sighting, 87 minutes from the gate. It shows what's below unnamed (Canada, then Alaska), the landing countdown on the chip, "Last tracked over Saskatchewan", and the crossings into Yukon and the United States held until the gate. "Over the Atlantic" past 2 hours is the tests' (the item above), and a Pacific scene is Todd's to ask for (the question below).
- **Unchanged, as the design says:** how the own speed is measured and believed, a steady leg, a plane on the ground or landed, the "Last tracked …" line, the faded plane, and the rows for halfway and the closest point to home (already "about"). Sun countdowns still read the guessed course past 2 hours, minutes at most, as the app leaves them.

**Questions for Todd:**
1. **A Pacific demo scene?** `live-long-gap` shows a long gap over land, as the demo's trips cross no ocean. Seeing "Over the Pacific" on the site before a real ocean flight shows it would need a new flight across the Pacific in the demo's schedule, which every scene shares and several tests pin (three trips, the recap's next trip). This plan leaves the schedule alone; say if you want the flight, and it gets its own small plan.

---

## Ground rules for whoever runs this plan

These come from Todd's standing instructions. They override the skill's defaults.

1. **Work only in this worktree:** `/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046`, on its branch `claude/trip-map-live-598046`, at `3c93b48` or later.
   - Never edit the main checkout, `/Users/toddanderson/Dev/Crewluve Website`: its untracked plan file isn't this work's.
   - `~/Dev/Crewluv` is shared with other sessions. Only read it (`git -C ~/Dev/Crewluv show`, `log`, `ls-tree`): change, stash, reset or switch nothing there.
2. **Never commit without Todd's yes in the conversation,** and then only the task's own files, by path. **Never push, and never merge into `main`,** but in Task 8, on Todd's yes then.
3. **The tests:** the session runs them as it works (`npx vitest run <files>`, `npm test`, `TZ=UTC npm test`, `npm run build`). At the checkpoints (Tasks 2 to 5, Step 5), Todd runs the command himself. Don't change files while he's running them, and don't ask for a run until the files are final.
4. **The shared cases are the judge.** `tests/fixtures/trip-map/live-cases.json` and `facts-cases.json` are the app's, never edited: Task 2 copies the first whole from the app's commit `4186f60`. If a case fails, the code is wrong. If you believe a case is wrong, STOP and tell Todd.
5. **Copy the code as written.** It was run as it stands. A replacement is exact: its text is in the file once. If it isn't, stop: the file has changed since this plan was written.
6. **Nothing here calls Crewlu Cloud or adsb.lol.** Every test uses a stand-in, and the tests can't reach the network. Change nothing in Crewlu Cloud's live Supabase project, and don't read it.
7. **Unchanged:** every request to Crewlu Cloud still goes through the door and its guard (`tests/data/doorRules.test.ts` and `doorRulesScan.test.ts` must pass), no `innerHTML`, no download, no `npm install`.
8. **A clock time in a test is the viewer's zone's, never the Mac's:** GitHub's build runs in UTC (the landed plan's deploy failed on three tests that assumed Eastern). Each task's Step 4 runs the suite in UTC too.
9. **Reviewers:** dispatch `superpowers:code-reviewer` with `model: "sonnet"`.
10. **No release note.** The website has none; Task 8 says what went live in this plan's record.

## File map

| File | Task | Responsibility |
|---|---|---|
| `tests/fixtures/trip-map/live-cases.json` | copy (2) | the app's shared cases at `4186f60`: `ownSpeedAheadMinutes`, the long ocean gap case, the Cologne case a little sooner |
| `src/map/flightPlan.ts` | modify (2) | `OWN_SPEED_AHEAD_MS`, `cruiseSpeed`, and `flownPlan` with them |
| `tests/map/liveCases.ts`, `tests/map/flightPlan.test.ts` | modify (2) | the new constant, and the speed's tests |
| `src/facts/planePosition.ts` | modify (3) | `GUESS_HORIZON_MS`, `isPastGuessHorizon` |
| `src/facts/geography.ts` | modify (3) | `OCEAN_NAMES`, `isOcean` |
| `src/facts/tripFacts.ts` | modify (3, 4) | `placeBelow`, read by `belowText` and the card's sentence (3); `toldMilestones`, read by the headline, the banner and the list (4) |
| `tests/facts/longGap.test.ts` | create (3), modify (4) | the app's `LongGapFactsTests`, the website's rows, and the shared long ocean gap on the site's geography |
| `src/data/demoLive.ts`, `src/data/demo.ts`, `README.md` | modify (5) | the demo scene `live-long-gap` |
| `tests/data/demoLive.test.ts`, `tests/data/demoScenes.test.ts`, `tests/ui/StatusScreen.test.tsx` | modify (5) | the scene, and its facts on the site's geography |

Four code tasks, then Task 6, Todd's look at the demo scene; Task 7, the review and this plan's record; and Task 8, going live, on Todd's yes.

---

### Task 1: Before starting

- [x] **Step 1: Check the worktree and the branch, and the app's commit.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git status --short && git branch --show-current && git log --oneline -1 && git -C ~/Dev/Crewluv cat-file -t 4186f60
```

Expected: nothing changed but this plan's file, `claude/trip-map-live-598046`, `3c93b48` or a later commit of this plan's, and `commit`.

- [x] **Step 2: Read the design** (`git -C ~/Dev/Crewluv show 4186f60:docs/superpowers/specs/2026-11-17-crewluve-best-guesses-after-a-long-gap-design.md`), and this plan's "Where this plan settles details".

---

### Task 2: The plane's own speed for 2 hours, the schedule's after, and the new shared cases (design §2)

The landing estimate, the estimated plane, the ghost and the record all fly `flownPlan` (`src/map/flightPlan.ts`), as the app's `FlightPlan.flown(along:)`. From the last place the plane was seen, its cruise left (the path ahead, less the descent's 120 nm) is flown at its own speed for `OWN_SPEED_AHEAD_MS`, 2 hours, or all of it when less is left, and at the schedule's after; `cruiseSpeed` makes the two into the one speed that flies it all in the same time, the app's `FlightPlan.cruiseSpeed(over:own:planned:)`. How the own speed is measured and believed, a steady leg, a plane on the ground and one that has landed are unchanged. The shared cases come first, copied whole from the app at `4186f60`: the constant `ownSpeedAheadMinutes`, the case "faster than the plan, then a long ocean gap" at the end, and the Cologne case landing 33.5 seconds sooner. The tests of the speed are the app's three `cruiseSpeed` tests, the constant, and a check that a shared case flies a speed between its own and the plan's.

**Files:**
- Modify: `src/map/flightPlan.ts`
- Copy from the app: `tests/fixtures/trip-map/live-cases.json`
- Test: `tests/map/flightPlan.test.ts`, `tests/map/liveCases.ts`

- [x] **Step 1: Copy the shared cases, and write the tests.**

**Copy `tests/fixtures/trip-map/live-cases.json` whole from the app's commit `4186f60`:**

```bash
git -C ~/Dev/Crewluv show 4186f60:CrewluvTests/Fixtures/TripMap/live-cases.json > tests/fixtures/trip-map/live-cases.json
shasum -a 256 tests/fixtures/trip-map/live-cases.json
```

Expected checksum: `509b2bca8766b1e61ff734a6c7a2638706d68b4213e98bb154f08f400dd5134e`. Don't edit the file.

**In `tests/map/flightPlan.test.ts`, replace (1 of 4):**

```ts
import {
  DESCENT_DISTANCE, DESCENT_SPEED, distanceLeft, flownPlan, makeFlightPlan, OWN_SPEED_LEAST_SHARE, OWN_SPEED_MOST_SHARE, taxiIn, taxiOut,
  timeInAir, timeToFly,
} from '../../src/map/flightPlan'
```

**with:**

```ts
import {
  cruiseSpeed, DESCENT_DISTANCE, DESCENT_SPEED, distanceLeft, flownPlan, makeFlightPlan, OWN_SPEED_AHEAD_MS, OWN_SPEED_LEAST_SHARE, OWN_SPEED_MOST_SHARE,
  taxiIn, taxiOut, timeInAir, timeToFly,
} from '../../src/map/flightPlan'
```

**In `tests/map/flightPlan.test.ts`, replace (2 of 4):**

```ts
    expect([OWN_SPEED_LEAST_SHARE, OWN_SPEED_MOST_SHARE]).toEqual([c.ownSpeedLeastShare, c.ownSpeedMostShare])
  })
```

**with:**

```ts
    expect([OWN_SPEED_LEAST_SHARE, OWN_SPEED_MOST_SHARE]).toEqual([c.ownSpeedLeastShare, c.ownSpeedMostShare])
    expect(OWN_SPEED_AHEAD_MS).toBe(c.ownSpeedAheadMinutes * MINUTE)
  })
```

**In `tests/map/flightPlan.test.ts`, replace (3 of 4):**

```ts

describe("the plan as the plane flies it (Stage 3 spec §4, the plane's own speed)", () => {
```

**with:**

```ts

describe("its own speed for 2 hours, and the plan's after (long gap design §2)", () => {
  const knot = METERS_PER_NM / 3600

  it("is the plane's own with under 2 hours of cruise left", () => {
    // 800 nm at its own 450 kt is 1 h 47 min.
    expect(cruiseSpeed(800 * METERS_PER_NM, 450 * knot, 500 * knot) / knot).toBeCloseTo(450, 9)
  })

  it("flies the plan's speed for the rest past 2 hours", () => {
    // 2,000 nm: 900 at its own 450 kt in 2 hours, and 1,100 at the plan's 500 kt in 2.2 hours. 2,000 nm in 4.2 hours.
    expect(cruiseSpeed(2000 * METERS_PER_NM, 450 * knot, 500 * knot) / knot).toBeCloseTo(2000 / 4.2, 9)
    // Faster than the plan: 1,100 at its own 550 kt in 2 hours, and 900 at the plan's 500 in 1.8.
    expect(cruiseSpeed(2000 * METERS_PER_NM, 550 * knot, 500 * knot) / knot).toBeCloseTo(2000 / 3.8, 9)
  })

  it("is the plane's own with no cruise left", () => {
    expect(cruiseSpeed(0, 450 * knot, 500 * knot)).toBe(450 * knot)
    expect(cruiseSpeed(-10 * METERS_PER_NM, 450 * knot, 500 * knot)).toBe(450 * knot)
  })
})

describe("the plan as the plane flies it (Stage 3 spec §4, the plane's own speed)", () => {
```

**In `tests/map/flightPlan.test.ts`, replace (4 of 4):**

```ts

  it('takes no own speed that isn\'t a number', () => {
```

**with:**

```ts

  it("is a speed between its own and the plan's in some of the shared cases, so the cases test the 2 hours", () => {
    const mixed = LIVE_CASES.flights.filter((c) => {
      const { plan, path } = made(c)
      const flown = flownPlan(plan, path).speed
      return path.ownSpeed != null && flown !== plan.speed && flown !== path.ownSpeed
    })
    expect(mixed.map((c) => c.name)).toContain('faster than the plan, then a long ocean gap')
  })

  it('takes no own speed that isn\'t a number', () => {
```

**In `tests/map/liveCases.ts`, replace:**

```ts
    ownSpeedMostShare: number
    windowOpensMinutesBefore: number
```

**with:**

```ts
    ownSpeedMostShare: number
    ownSpeedAheadMinutes: number
    windowOpensMinutesBefore: number
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/map/flightPlan.test.ts tests/copy/planePopup.test.ts tests/engine/liveLegs.test.ts tests/facts/legCourse.test.ts tests/facts/planePosition.test.ts tests/map/flightDrawing.test.ts tests/map/flightRecord.test.ts tests/map/liveProgress.test.ts tests/map/mapFlight.test.ts
```

Expected: 18 of the 289 tests fail, in all nine files. Four because `cruiseSpeed` and `OWN_SPEED_AHEAD_MS` aren't there yet: the three `cruiseSpeed` tests, and the shared cases' constants. The other 14 because the code still flies the plane's own speed all the way: the new case "faster than the plan, then a long ocean gap" flies 560 kt where the case says 527.14 (touching down at 01:13 where it says 01:32), and "behind, with a late first point and an unseen ocean" 479.55 kt where it says 481.62, 33.5 seconds out at touchdown. They're in `tests/map/flightPlan.test.ts` (three: both cases' speeds, and no shared case flying a speed between its own and the plan's), `flightRecord.test.ts` and `liveProgress.test.ts` (two each), `tests/facts/planePosition.test.ts` (two: now and in a replay), and one in each of the other five files. The rest pass already, as they should: every other case is unchanged, and Step 4 has the same 289.

- [x] **Step 3: Write the code.**

**In `src/map/flightPlan.ts`, replace (1 of 4):**

```ts
 * touches down, and how fast it flies in between. The real plane is measured against it, flown at the plane's own
 * speed once that's known. The constants are written down in tests/fixtures/trip-map/live-cases.json, a copy of the
 * app's. Times are epoch ms, distances meters, and speeds meters a second.
 */
```

**with:**

```ts
 * touches down, and how fast it flies in between. The real plane is measured against it, flown at the plane's own
 * speed for the next 2 hours once that's known, and at the schedule's after that (long gap design §2). The constants
 * are written down in tests/fixtures/trip-map/live-cases.json, a copy of the app's. Times are epoch ms, distances
 * meters, and speeds meters a second.
 */
```

**In `src/map/flightPlan.ts`, replace (2 of 4):**

```ts
export const OWN_SPEED_MOST_SHARE = 1.5

```

**with:**

```ts
export const OWN_SPEED_MOST_SHARE = 1.5
/**
 * How far ahead of the last place the plane was seen its own speed is trusted: 2 hours of its cruise, in ms. Past that,
 * the winds it meets are the schedule's to know, and so is its speed (long gap design §2).
 */
export const OWN_SPEED_AHEAD_MS = 2 * 60 * 60_000

```

**In `src/map/flightPlan.ts`, replace (3 of 4):**

```ts
/**
 * `plan` as the plane flies it: with the plane's own speed over its cruise so far in place of the schedule's, once
 * `path` has one that could be right. The takeoff and the touchdown stay the schedule's, and a leg flown at one steady
 * speed keeps it. The landing estimate, the estimated plane and the ghost all fly this plan, so the gap between the
 * two planes is still the label.
 */
```

**with:**

```ts
/**
 * `plan` as the plane flies it, once `path` has an own speed that could be right: that speed for the next
 * `OWN_SPEED_AHEAD_MS` of the cruise left from the last place the plane was seen, and the schedule's after, made into the
 * one speed that flies the cruise left in the same time (long gap design §2). The takeoff and the touchdown stay the
 * schedule's, and a leg flown at one steady speed keeps it. The landing estimate, the estimated plane, the ghost and the
 * record all fly this plan, so the gap between the two planes is still the label. Only the time is meant: inside the
 * gap, the estimated plane is a little off where a plane flying the two speeds would be.
 */
```

**In `src/map/flightPlan.ts`, replace (4 of 4):**

```ts
  if (!(own >= plan.speed * OWN_SPEED_LEAST_SHARE && own <= plan.speed * OWN_SPEED_MOST_SHARE)) return plan
  return { ...plan, speed: own }
}
```

**with:**

```ts
  if (!(own >= plan.speed * OWN_SPEED_LEAST_SHARE && own <= plan.speed * OWN_SPEED_MOST_SHARE)) return plan
  // The way left from the last place it was seen is the great circle, and its last 120 nm the descent.
  const cruiseLeft = path.length - path.flownLength - DESCENT_DISTANCE
  return { ...plan, speed: cruiseSpeed(cruiseLeft, own, plan.speed) }
}

/**
 * The one speed that flies `cruise` meters in the time it takes at `own` for `OWN_SPEED_AHEAD_MS`, or all the way when
 * that's further, and at `planned` for the rest. With no cruise left, `own`. Speeds are meters a second.
 */
export function cruiseSpeed(cruise: number, own: number, planned: number): number {
  if (!(cruise > 0)) return own
  const atOwnSpeed = Math.min(cruise, (own * OWN_SPEED_AHEAD_MS) / 1000)
  return cruise / (atOwnSpeed / own + (cruise - atOwnSpeed) / planned)
}
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 289 tests pass. Then `npx tsc --noEmit`: nothing; `npm test`: 177 test files and 3,762 tests pass, and the same with `TZ=UTC npm test`, as GitHub's build runs; and `npm run build` ends `✓ built`. Last, the shared cases:

```bash
git diff --name-only 3c93b48 -- tests/fixtures/trip-map && shasum -a 256 tests/fixtures/trip-map/live-cases.json
```

Expected: `tests/fixtures/trip-map/live-cases.json` alone, Task 2's copy, and the checksum of Task 2's Step 1. No other step changes them.

- [x] **Step 5: The checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && npm run build
```

Expected: 177 test files and 3,762 tests pass, and the build ends `✓ built`.

- [x] **Step 6: Commit, on Todd's yes.** Only these files, by path:

```bash
git add src/map/flightPlan.ts tests/fixtures/trip-map/live-cases.json tests/map/flightPlan.test.ts tests/map/liveCases.ts
git commit -m "The real plane flies its own speed for 2 hours from where it was last tracked and the schedule's after, with the app's new shared cases (long gap design §2, Todd, 17 Nov 2026)"
```

---

### Task 3: Past 2 hours out of range, only an ocean is named (design §3)

`GUESS_HORIZON_MS` and `isPastGuessHorizon` (`src/facts/planePosition.ts`, the app's `PlanePosition.guessHorizon` and `isPastGuessHorizon`) say the real plane has been out of tracking range for more than 2 hours, a strict ">". `OCEAN_NAMES` and `isOcean` (`src/facts/geography.ts`, the app's `Geography.Place.isOcean`) are the five oceans as geography.json names them. `placeBelow` (`src/facts/tripFacts.ts`) is what's below the plane, and past 2 hours only an ocean: `belowText` reads it, with no city then, so the headline, the card's chip, the full map's first line and "More facts" first row name only an ocean, or go on (the headline to the landing countdown, the row to "Last tracked …"); and the card's sentence for screen readers reads it, so it leaves "over …" out. The tests are a new file, `tests/facts/longGap.test.ts`, the port of the app's `LongGapFactsTests` with the same answers, and the website's own: its first row, and the shared long ocean gap read with the site's geography.

**Files:**
- Modify: `src/facts/geography.ts`, `src/facts/planePosition.ts`, `src/facts/tripFacts.ts`
- Create: `tests/facts/longGap.test.ts`

- [x] **Step 1: Write the tests.**

**Create `tests/facts/longGap.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import type { FactRow } from '../../src/facts/factRow'
import { isOcean, makeGeography, OCEAN_NAMES } from '../../src/facts/geography'
import { GUESS_HORIZON_MS, isPastGuessHorizon, type PlanePosition } from '../../src/facts/planePosition'
import { belowText, cardSummary, headline, makeTripFacts, type TripFacts } from '../../src/facts/tripFacts'
import { factRows } from '../../src/facts/tripFactsRows'
import { OWN_SPEED_AHEAD_MS } from '../../src/map/flightPlan'
import { appGeography, box, flightMap } from './factsTestData'
import { caseMapLeg, caseMoment, caseNamed, date, equatorLive, equatorLiveLeg, HOME_BY_THE_EQUATOR } from './liveFacts'

/**
 * The facts past 2 hours out of tracking range (long gap design §3), in US English for a family in Louisville, as the
 * app's LongGapFactsTests. The made-up flight is liveFacts.ts's equator flight, to 24° E: in the air from 10:15 to 13:15
 * UTC by the schedule, whose cruise is 513.7 kt. The real plane flies a degree every 8 minutes (450 kt) and is last seen
 * at 3.75° E at 10:45. From there it's flown on at 450 kt for 2 hours of its cruise and at the plan's after, one speed of
 * 460.2 kt, so it touches down at 13:33.6 by its estimate and is guessed at 19.1° E at 12:45, 2 hours after it was last
 * seen.
 */

const NY = 'America/New_York'
const at = (hhmm: string) => date(`2026-03-20T${hhmm}:00Z`)

/** The time's own space, narrow and unbreaking, as an ordinary one. */
const plain = (text: string | null | undefined) => text?.replace(/\u202F/g, ' ')

/**
 * Along the equator: Alpha to 5° E, Bravo to 10° E, the Atlantic to 20° E, the Test Sea to 21° E and Delta to 25° E,
 * with Portville 0.1° north of 19.1° E.
 */
const GEOGRAPHY = makeGeography(
  [box('Alpha', 'country', -1, 5), box('Bravo', 'country', 5, 10), box('the Atlantic', 'water', 10, 20), box('the Test Sea', 'water', 20, 21),
    box('Delta', 'country', 21, 25)],
  [{ name: 'Portville', lat: 0.1, lon: 19.1 }],
)

interface Options {
  /** When the real plane was last seen: 10:45, unless it's given. */
  seenUntil?: string
  /** When the map was made. */
  now: string
  /** Longitudes between which nobody saw it, both ends left out. */
  unseen?: [number, number]
  isReplay?: boolean
}

/** The facts of a map of the one flight, last seen at `seenUntil` and nobody seeing it over `unseen`, made at `now`. */
function facts({ seenUntil = '10:45', now, unseen, isReplay = false }: Options): TripFacts {
  const leg = equatorLiveLeg(equatorLive(at(seenUntil), { unseen }), at(now), { east: 24 })
  return makeTripFacts(flightMap(leg, HOME_BY_THE_EQUATOR), { geography: GEOGRAPHY, comparisons: null, viewerTz: NY, h24: false, isReplay })
}

function belowRow(theFacts: TripFacts, t: string): FactRow | undefined {
  return factRows(theFacts, at(t), at(t)).find((r) => r.kind === 'below')
}

describe("what's below, past 2 hours out of tracking range (long gap design §3)", () => {
  it('names the ocean, with no city', () => {
    // At 12:43, 1 h 58 min after it was last seen, it's guessed at 18.8° E, 20 mi from Portville.
    expect(headline(facts({ now: '12:43' }), at('12:43'))).toBe('Over the Atlantic, near Portville')
    // At 12:48, 2 h 3 min after, at 19.5° E: still 26 mi from Portville, but past 2 hours no city is told.
    expect(headline(facts({ now: '12:48' }), at('12:48'))).toBe('Over the Atlantic')
  })

  it('names nothing over a sea or land, and the headline is the landing countdown', () => {
    // It reaches the gate at 13:40.6 by its estimate. At 12:58 it's guessed at 20.75° E, over the Test Sea.
    expect(headline(facts({ now: '12:58' }), at('12:58'))).toBe('Landing in 43 min')
    // At 13:10, at 22.2° E, over Delta.
    const overDelta = facts({ now: '13:10' })
    expect(headline(overDelta, at('13:10'))).toBe('Landing in 31 min')
    expect(belowText(overDelta, overDelta.map.legs[0], at('13:10'))).toBeNull()
    // Within 2 hours of the last sighting, land is named as before.
    expect(headline(facts({ seenUntil: '11:20', now: '13:10' }), at('13:10'))).toBe('Over Delta')
  })

  it('leaves the first row to where it was last tracked over land, and names the ocean above it', () => {
    // The website's own rows, which the app's tests leave to its sheet: "Last tracked …" and closest to home as before.
    const overLand = belowRow(facts({ now: '13:10' }), '13:10')
    expect(plain(overLand?.title)).toBe('Last tracked over Alpha · 2 h 25 min ago')
    expect(plain(overLand?.detail)).toBe('Closest to home was 35 mi at about 8:05 AM')
    const overTheOcean = belowRow(facts({ now: '12:48' }), '12:48')
    expect(plain(overTheOcean?.title)).toBe('Over the Atlantic')
    expect(plain(overTheOcean?.detail)).toBe('Last tracked over Alpha · 2 h 3 min ago · Closest to home was 35 mi at about 8:05 AM')
  })

  it('in a replay, past 2 hours after the last sighting, names only the ocean', () => {
    const replay = facts({ now: '13:10', isReplay: true })
    expect(headline(replay, at('12:43'))).toBe('Over the Atlantic, near Portville')
    expect(headline(replay, at('12:48'))).toBe('Over the Atlantic')
  })

  it("in a replay of a gap closed by a new sighting, is what's on the straight join", () => {
    // Seen again at 20.5° E at 12:59, the gap is a straight join between two places the plane was seen, so at 12:50, at
    // 19.4° E on it, the city by it is told as ever.
    const replay = facts({ seenUntil: '13:05', now: '13:05', unseen: [3.8, 20.5], isReplay: true })
    expect(headline(replay, at('12:50'))).toBe('Over the Atlantic, near Portville')
  })
})

describe("the shared long ocean gap, with the site's geography (long gap design §3)", () => {
  // live-cases.json's Louisville to Cologne: last tracked over Québec at 19:39:30 UTC and never again, at the gate at
  // 01:39 by its estimate.
  const flightCase = caseNamed('faster than the plan, then a long ocean gap')
  const shared = () => makeTripFacts(flightMap(caseMapLeg(flightCase, caseMoment(flightCase, '13T21:39:30')), null), {
    geography: appGeography(), comparisons: null, viewerTz: NY, h24: false,
  })

  it('names the Atlantic with no city, and nothing over England', () => {
    expect(headline(shared(), date('2026-11-13T22:30:00Z'))).toBe('Over the Atlantic')
    // At 00:40, 5 hours on, it's guessed over England: the landing countdown, and where it was last tracked.
    expect(headline(shared(), date('2026-11-14T00:40:00Z'))).toBe('Landing in 1 h')
    const row = factRows(shared(), date('2026-11-14T00:40:00Z'), date('2026-11-14T00:40:00Z')).find((r) => r.kind === 'below')
    expect(plain(row?.title)).toBe('Last tracked over Québec · 5 h 1 min ago')
  })
})

describe('2 hours out of tracking range (long gap design §3)', () => {
  const plane = (unseenFor: number | null): PlanePosition =>
    ({ distance: 0, place: { lat: 0, lng: 10 }, unseenFor, isEstimated: unseenFor != null, isSeenInAir: false })

  it('is past from just over 2 hours', () => {
    expect(isPastGuessHorizon(plane(null))).toBe(false)
    expect(isPastGuessHorizon(plane(2 * 60 * 60_000))).toBe(false)
    expect(isPastGuessHorizon(plane(2 * 60 * 60_000 + 1))).toBe(true)
  })

  it("is the 2 hours the plane's own speed is trusted for, deliberately the same", () => {
    expect(GUESS_HORIZON_MS).toBe(OWN_SPEED_AHEAD_MS)
  })
})

describe('the card for screen readers, past 2 hours (long gap design §3)', () => {
  it("leaves out what's below over land, and says the ocean", () => {
    expect(plain(cardSummary(facts({ now: '13:10' }), at('13:10'), 'Alex')))
      .toMatch(/^TST1 to E24, about 19 minutes behind schedule, last tracked over Alpha\. Lands about 9:40 AM your time\. /)
    expect(plain(cardSummary(facts({ now: '12:48' }), at('12:48'), 'Alex')))
      .toMatch(/^TST1 to E24, about 19 minutes behind schedule, over the Atlantic, last tracked over Alpha\. /)
  })
})

describe('the oceans (long gap design §3)', () => {
  it('are the five oceans only', () => {
    expect(isOcean({ name: 'the Pacific', kind: 'water', country: null })).toBe(true)
    expect(isOcean({ name: 'the Sea of Okhotsk', kind: 'water', country: null })).toBe(false)
    expect(isOcean({ name: 'Japan', kind: 'country', country: 'Japan' })).toBe(false)
  })

  it("are all in the site's geography, by its names", () => {
    const waters = new Set(appGeography().areas.filter((a) => a.kind === 'water').map((a) => a.name))
    expect([...OCEAN_NAMES].filter((name) => !waters.has(name))).toEqual([])
    expect(OCEAN_NAMES.size).toBe(5)
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/facts/longGap.test.ts
```

Expected: 10 of the 11 tests fail, all in the new file. Four because `isPastGuessHorizon`, `GUESS_HORIZON_MS`, `isOcean` and `OCEAN_NAMES` aren't there yet. Six because past 2 hours the facts still name what they did: "Over the Atlantic, near Portville" at 12:48, now and in a replay; "Over the Test Sea" at 12:58 where the landing countdown should be; "Over Delta" leading the first row at 13:10; the card's sentence with "over Delta"; and the shared long ocean gap "Over the United Kingdom, near Sheffield" at 00:40. One passes already, as it should: the replay of a gap closed by a new sighting reads the straight join, city and all, as before.

- [x] **Step 3: Write the code.**

**In `src/facts/geography.ts`, replace:**

```ts
  a != null && b != null && a.name === b.name && a.kind === b.kind && a.country === b.country

```

**with:**

```ts
  a != null && b != null && a.name === b.name && a.kind === b.kind && a.country === b.country

/** The five oceans, by the names geography.json gives them. */
export const OCEAN_NAMES: ReadonlySet<string> = new Set(['the Pacific', 'the Atlantic', 'the Indian Ocean', 'the Arctic Ocean', 'the Southern Ocean'])

/**
 * One of the five oceans: past 2 hours out of tracking range, the only places wide enough to be named under a guessed
 * plane (long gap design §3).
 */
export const isOcean = (place: Place) => place.kind === 'water' && OCEAN_NAMES.has(place.name)

```

**In `src/facts/planePosition.ts`, replace (1 of 2):**

```ts
import { pointAtDistance } from '../map/flightPath'
import { recordDistanceAt } from '../map/flightRecord'
```

**with:**

```ts
import { pointAtDistance } from '../map/flightPath'
import { OWN_SPEED_AHEAD_MS } from '../map/flightPlan'
import { recordDistanceAt } from '../map/flightRecord'
```

**In `src/facts/planePosition.ts`, replace (2 of 2):**

```ts
  ({ distance, place, unseenFor, isEstimated: unseenFor != null, isSeenInAir })

```

**with:**

```ts
  ({ distance, place, unseenFor, isEstimated: unseenFor != null, isSeenInAir })

/**
 * How long out of tracking range the facts tell the plane's best guesses in full, in ms: the 2 hours its own speed is
 * trusted for, deliberately the same. Past them, where it's guessed to be can be hundreds of miles from where it is, so
 * the facts name only an ocean under it, and hold their events until it's tracked again or the flight is over (long gap
 * design §3).
 */
export const GUESS_HORIZON_MS = OWN_SPEED_AHEAD_MS

/** Whether the real plane has been out of tracking range for longer than `GUESS_HORIZON_MS`. */
export const isPastGuessHorizon = (plane: PlanePosition) => plane.unseenFor != null && plane.unseenFor > GUESS_HORIZON_MS

```

**In `src/facts/tripFacts.ts`, replace (1 of 4):**

```ts
import { forgetOldPaths, realPathFacts, type FactsStore } from './factsStore'
import { cityNear, samePlace, type City, type Geography, type Place } from './geography'
import { landsWithinHorizon } from './landingWeather'
```

**with:**

```ts
import { forgetOldPaths, realPathFacts, type FactsStore } from './factsStore'
import { cityNear, isOcean, samePlace, type City, type Geography, type Place } from './geography'
import { landsWithinHorizon } from './landingWeather'
```

**In `src/facts/tripFacts.ts`, replace (2 of 4):**

```ts
import { MILESTONE_HEADLINE_MS, milestones, type Milestone } from './milestone'
import { legPlane } from './planePosition'
import { cockpitHorizonOnLeg, sunEvents, type SunEvent } from './sky'
```

**with:**

```ts
import { MILESTONE_HEADLINE_MS, milestones, type Milestone } from './milestone'
import { isPastGuessHorizon, legPlane, type PlanePosition } from './planePosition'
import { cockpitHorizonOnLeg, sunEvents, type SunEvent } from './sky'
```

**In `src/facts/tripFacts.ts`, replace (3 of 4):**

```ts
 * plane that's out of sight is where the plan has it, flying on from the last place it was seen, and reads the same
 * (best guesses design §2).
 */
export function belowText(facts: TripFacts, leg: MapLeg, t: number): string | null {
  const story = facts.stories[leg.id]
  const plane = legPlane(leg, t, facts.isReplay)
  const place = story ? placeAtDistance(story, plane.distance) : null
  if (!place) return null
  return belowWords(place, facts.geography ? cityNear(facts.geography, plane.place) : null)
}
```

**with:**

```ts
 * plane that's out of sight is where the plan has it, flying on from the last place it was seen, and reads the same
 * (best guesses design §2), but for one out of tracking range for more than 2 hours: only an ocean, with no city (long
 * gap design §3).
 */
export function belowText(facts: TripFacts, leg: MapLeg, t: number): string | null {
  const plane = legPlane(leg, t, facts.isReplay)
  const place = placeBelow(facts, leg, plane)
  if (!place) return null
  return belowWords(place, facts.geography && !isPastGuessHorizon(plane) ? cityNear(facts.geography, plane.place) : null)
}

/**
 * What's under `plane`. Past `GUESS_HORIZON_MS` out of tracking range, the guess can be hundreds of miles from the plane,
 * and only an ocean is wide enough to be right (long gap design §3).
 */
function placeBelow(facts: TripFacts, leg: MapLeg, plane: PlanePosition): Place | null {
  const story = facts.stories[leg.id]
  const place = story ? placeAtDistance(story, plane.distance) : null
  return place && (!isPastGuessHorizon(plane) || isOcean(place)) ? place : null
}
```

**In `src/facts/tripFacts.ts`, replace (4 of 4):**

```ts
    const lead = leg.flightNumber ? `${leg.flightNumber} to` : 'Flying to'
    const story = facts.stories[leg.id]
    const plane = legPlane(leg, now, facts.isReplay)
    const place = story ? placeAtDistance(story, plane.distance) : null
    // With a real plane the sentence says how it's doing against the schedule (Stage 3 spec §9), and while it's out of
    // sight, where it was last seen (§15).
    const ago = plane.unseenFor
```

**with:**

```ts
    const lead = leg.flightNumber ? `${leg.flightNumber} to` : 'Flying to'
    const plane = legPlane(leg, now, facts.isReplay)
    const place = placeBelow(facts, leg, plane)
    // With a real plane the sentence says how it's doing against the schedule (Stage 3 spec §9), and while it's out of
    // sight, where it was last seen (§15). Past 2 hours out of sight, what's below is only an ocean, or left out (long
    // gap design §3).
    const ago = plane.unseenFor
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 11 tests pass. Then `npx tsc --noEmit`: nothing; `npm test`: 178 test files and 3,773 tests pass, and the same with `TZ=UTC npm test`, as GitHub's build runs; and `npm run build` ends `✓ built`. Last, the shared cases:

```bash
git diff --name-only 3c93b48 -- tests/fixtures/trip-map && shasum -a 256 tests/fixtures/trip-map/live-cases.json
```

Expected: `tests/fixtures/trip-map/live-cases.json` alone, Task 2's copy, and the checksum of Task 2's Step 1. No other step changes them.

- [x] **Step 5: The checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && npm run build
```

Expected: 178 test files and 3,773 tests pass, and the build ends `✓ built`.

- [x] **Step 6: Commit, on Todd's yes.** Only these files, by path:

```bash
git add src/facts/geography.ts src/facts/planePosition.ts src/facts/tripFacts.ts tests/facts/longGap.test.ts
git commit -m "Past 2 hours out of tracking range the facts name only an ocean, with no city, and over a sea or land nothing (long gap design §3, Todd, 17 Nov 2026)"
```

---

### Task 4: Past 2 hours out of range, events wait (design §3)

`toldMilestones` (`src/facts/tripFacts.ts`, the app's `TripFacts.milestones(on:at:)`): while the flight is between its gates, an event guessed more than 2 hours after the path's last sighting isn't told. The headline, the latest event's banner (and so the card's "Latest: …"), and the list read it. Once the plane is tracked again the gap is a straight join and its events are told with "about"; once the flight is at its gate they're all told, as best guesses. Everything up to the last sighting happened before it, so only a guess ahead can be held, and a landed plane's last place is its landing. `factsMilestones` still gives them all, for the shared facts cases.

**Files:**
- Modify: `src/facts/tripFacts.ts`
- Test: `tests/facts/longGap.test.ts`

- [x] **Step 1: Write the tests.**

**In `tests/facts/longGap.test.ts`, replace (1 of 5):**

```ts
import { isOcean, makeGeography, OCEAN_NAMES } from '../../src/facts/geography'
import { GUESS_HORIZON_MS, isPastGuessHorizon, type PlanePosition } from '../../src/facts/planePosition'
import { belowText, cardSummary, headline, makeTripFacts, type TripFacts } from '../../src/facts/tripFacts'
import { factRows } from '../../src/facts/tripFactsRows'
import { OWN_SPEED_AHEAD_MS } from '../../src/map/flightPlan'
```

**with:**

```ts
import { isOcean, makeGeography, OCEAN_NAMES } from '../../src/facts/geography'
import { GUESS_HORIZON_MS, isPastGuessHorizon, type PlanePosition } from '../../src/facts/planePosition'
import { belowText, cardSummary, headline, latestEvent, makeTripFacts, tripSoFar, type TripFacts } from '../../src/facts/tripFacts'
import { factRows } from '../../src/facts/tripFactsRows'
import { OWN_SPEED_AHEAD_MS } from '../../src/map/flightPlan'
```

**In `tests/facts/longGap.test.ts`, replace (2 of 5):**

```ts
  return factRows(theFacts, at(t), at(t)).find((r) => r.kind === 'below')
}

describe("what's below, past 2 hours out of tracking range (long gap design §3)", () => {
```

**with:**

```ts
  return factRows(theFacts, at(t), at(t)).find((r) => r.kind === 'below')
}

/** The flight's lines in the list at `t`, newest first. */
const events = (theFacts: TripFacts, t: string) => tripSoFar(theFacts, at(t)).flights[0]?.events.map((e) => plain(e.text))

describe("what's below, past 2 hours out of tracking range (long gap design §3)", () => {
```

**In `tests/facts/longGap.test.ts`, replace (3 of 5):**

```ts
    expect(plain(row?.title)).toBe('Last tracked over Québec · 5 h 1 min ago')
  })
})

```

**with:**

```ts
    expect(plain(row?.title)).toBe('Last tracked over Québec · 5 h 1 min ago')
  })

  it("holds what it's guessed to pass more than 2 hours on, halfway among them, until it's at the gate", () => {
    // Halfway is guessed at 21:45, 2 h 5 min on; then Ireland, the United Kingdom, the North Sea, the Netherlands and
    // Germany.
    const lines = (iso: string) => tripSoFar(shared(), date(iso)).flights[0]?.events.map((e) => e.text.split(' · ')[0])
    expect(latestEvent(shared(), date('2026-11-14T01:00:00Z'))?.title).toBe('Out over the Labrador Sea')
    expect(lines('2026-11-14T01:00:00Z')?.[0]).toBe('Out over the Labrador Sea')
    expect(lines('2026-11-14T01:00:00Z')).not.toContain('Halfway')
    expect(lines('2026-11-14T01:45:00Z')?.slice(0, 3)).toEqual(['Crossed into Germany', 'Crossed into the Netherlands', 'Out over the North Sea'])
    expect(lines('2026-11-14T01:45:00Z')).toContain('Halfway')
  })
})

```

**In `tests/facts/longGap.test.ts`, replace (4 of 5):**

```ts
})

describe('the card for screen readers, past 2 hours (long gap design §3)', () => {
  it("leaves out what's below over land, and says the ocean", () => {
```

**with:**

```ts
})

describe('events, past 2 hours out of tracking range (long gap design §3)', () => {
  it('are held from the list when guessed more than 2 hours after the last sighting', () => {
    // By the guess it crosses into Delta at 21° E just before 13:00, over 2 hours after it was last seen: not told. The
    // others were guessed within the 2 hours, and are told with "about".
    expect(events(facts({ now: '13:10' }), '13:10')).toEqual([
      'Closest to home, 35 mi · about 8:05 AM', 'Halfway · about 7:49 AM', 'Out over the Atlantic · about 7:34 AM', 'Crossed into Bravo · about 6:54 AM',
    ])
  })

  it('are held from the banner and the headline', () => {
    const guessed = facts({ now: '13:10' })
    expect(latestEvent(guessed, at('13:10'))?.title).toBe('Closest to home, 35 mi')
    // Not "Just crossed into Delta": over land past 2 hours, the landing countdown.
    expect(headline(guessed, at('13:02'))).toBe('Landing in 39 min')
  })

  it('are all told as best guesses once the flight is over, if it is never tracked again', () => {
    // It reaches the gate at 13:40.6 by its estimate. After that the crossing into Delta is told too.
    const over = facts({ now: '13:45' })
    expect(events(over, '13:45')?.[0]).toBe('Crossed into Delta · about 8:59 AM')
    expect(events(over, '13:45')).toHaveLength(5)
    // Not before: at 13:30 it's past the schedule's 13:22 at the gate, but in the air by its estimate.
    expect(events(facts({ now: '13:30' }), '13:30')?.[0]).toBe('Closest to home, 35 mi · about 8:05 AM')
  })

  it('are told on the straight join once the plane is tracked again', () => {
    // Nobody saw it from 3.75° E at 10:45 to 20.5° E at 12:59. Seen again, it crossed into Delta just before 13:03, and
    // what it passed in the gap is told on the straight join between the two, with "about".
    const trackedAgain = facts({ seenUntil: '13:05', now: '13:05', unseen: [3.8, 20.5] })
    expect(events(trackedAgain, '13:05')).toEqual([
      'Crossed into Delta · 9:02 AM', 'Closest to home, 35 mi · about 8:06 AM', 'Halfway · about 7:51 AM', 'Out over the Atlantic · about 7:35 AM',
      'Crossed into Bravo · about 6:55 AM',
    ])
    // The website's own banner and headline: the newest event, seen, with its plain time.
    expect(latestEvent(trackedAgain, at('13:05'))?.title).toBe('Crossed into Delta')
    expect(headline(trackedAgain, at('13:05'))).toBe('Just crossed into Delta')
  })
})

describe('the card for screen readers, past 2 hours (long gap design §3)', () => {
  it("leaves out what's below over land, and says the ocean", () => {
```

**In `tests/facts/longGap.test.ts`, replace (5 of 5):**

```ts
    expect(plain(cardSummary(facts({ now: '12:48' }), at('12:48'), 'Alex')))
      .toMatch(/^TST1 to E24, about 19 minutes behind schedule, over the Atlantic, last tracked over Alpha\. /)
  })
})
```

**with:**

```ts
    expect(plain(cardSummary(facts({ now: '12:48' }), at('12:48'), 'Alex')))
      .toMatch(/^TST1 to E24, about 19 minutes behind schedule, over the Atlantic, last tracked over Alpha\. /)
  })

  it('tells the newest event told, and none held', () => {
    expect(plain(cardSummary(facts({ now: '13:10' }), at('13:10'), 'Alex'))).toBe(
      'TST1 to E24, about 19 minutes behind schedule, last tracked over Alpha. Lands about 9:40 AM your time. Latest: closest to home, 35 miles, about 1 hour 5 minutes ago. Opens the full map.',
    )
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/facts/longGap.test.ts
```

Expected: 5 of the 17 tests fail, all because every event is still told: the list at 13:10 has "Crossed into Delta" on top (and at 13:30, before the gate), the banner says it, so the card's sentence's "Latest" does, the headline at 13:02 is "Just crossed into Delta", and the shared long ocean gap's list at 01:00 has Ireland to the North Sea. The other 12 pass already, as they should: Task 3's eleven, and the gap closed by a new sighting, whose events are told on the straight join as before.

- [x] **Step 3: Write the code.**

**In `src/facts/tripFacts.ts`, replace (1 of 8):**

```ts
import { MILESTONE_HEADLINE_MS, milestones, type Milestone } from './milestone'
import { isPastGuessHorizon, legPlane, type PlanePosition } from './planePosition'
import { cockpitHorizonOnLeg, sunEvents, type SunEvent } from './sky'
```

**with:**

```ts
import { MILESTONE_HEADLINE_MS, milestones, type Milestone } from './milestone'
import { GUESS_HORIZON_MS, isPastGuessHorizon, legPlane, type PlanePosition } from './planePosition'
import { cockpitHorizonOnLeg, sunEvents, type SunEvent } from './sky'
```

**In `src/facts/tripFacts.ts`, replace (2 of 8):**

```ts
/**
 * "Over Kansas", "Over Québec, near Montréal", from the flight's story, read where the plane is (Stage 3 spec §8). A real
```

**with:**

```ts
/**
 * The flight's milestones as they're told at `t`. While the flight is in the air, one guessed more than 2 hours after the
 * plane was last seen waits until it's tracked again, as it can be hundreds of miles out. Once the flight is over they're
 * all told, as best guesses (long gap design §3). Everything up to the last place the plane was seen happened before it,
 * so only a guess ahead can be held. `factsMilestones` still gives them all, for the shared cases.
 */
export function toldMilestones(facts: TripFacts, leg: MapLeg, t: number): Milestone[] {
  const all = factsMilestones(facts, leg)
  const knots = leg.flight?.path.knots ?? []
  const lastSeen = knots[knots.length - 1]
  if (t >= leg.end || !lastSeen) return all
  return all.filter((m) => m.time - lastSeen.time <= GUESS_HORIZON_MS)
}

/**
 * "Over Kansas", "Over Québec, near Montréal", from the flight's story, read where the plane is (Stage 3 spec §8). A real
```

**In `src/facts/tripFacts.ts`, replace (3 of 8):**

```ts
 * else the landing countdown (§4.4). While the real plane is out of sight they're its best guesses, in the same plain
 * words (best guesses design §2). Null on the ground and on a drive, where Stage 1B's words stay. `includesEvents` is
 * false beside the latest event's banner, which shows the milestone already (latest event design §2); the shared
 * cases read the headline with them.
 *
```

**with:**

```ts
 * else the landing countdown (§4.4). While the real plane is out of sight they're its best guesses, in the same plain
 * words (best guesses design §2), and a milestone guessed more than 2 hours after it was last seen waits
 * (`toldMilestones`, long gap design §3). Null on the ground and on a drive, where Stage 1B's words stay.
 * `includesEvents` is false beside the latest event's banner, which shows the milestone already (latest event design
 * §2); the shared cases read the headline with them.
 *
```

**In `src/facts/tripFacts.ts`, replace (4 of 8):**

```ts
  if (isLandedBeforeGate(facts, leg, t)) return landedText(leg.destination.city)
  const recent = includesEvents ? factsMilestones(facts, leg).filter((m) => m.time <= t && t - m.time < MILESTONE_HEADLINE_MS).pop() : null
  if (recent) return milestoneHeadline(recent)
```

**with:**

```ts
  if (isLandedBeforeGate(facts, leg, t)) return landedText(leg.destination.city)
  const recent = includesEvents ? toldMilestones(facts, leg, t).filter((m) => m.time <= t && t - m.time < MILESTONE_HEADLINE_MS).pop() : null
  if (recent) return milestoneHeadline(recent)
```

**In `src/facts/tripFacts.ts`, replace (5 of 8):**

```ts
 * long ago, and its sentence for screen readers. It stays until the next. Null on the ground, on a drive, and before the
 * flight's first event.
 *
```

**with:**

```ts
 * long ago, and its sentence for screen readers. It stays until the next. Null on the ground, on a drive, and before the
 * flight's first event. One held past 2 hours out of tracking range isn't told yet (`toldMilestones`, long gap design §3).
 *
```

**In `src/facts/tripFacts.ts`, replace (6 of 8):**

```ts
  // By time, not by the way along: a best guess and a sighting can disagree a little.
  const newest = factsMilestones(facts, leg)
    .filter((m) => m.time <= t)
```

**with:**

```ts
  // By time, not by the way along: a best guess and a sighting can disagree a little.
  const newest = toldMilestones(facts, leg, t)
    .filter((m) => m.time <= t)
```

**In `src/facts/tripFacts.ts`, replace (7 of 8):**

```ts
 * even before its first event, then each earlier flight with an event, newest first. Under each, its events, newest
 * first, so the latest is at the top. Then the totals, unless the rows already have them.
 *
```

**with:**

```ts
 * even before its first event, then each earlier flight with an event, newest first. Under each, its events, newest
 * first, so the latest is at the top, but for those held past 2 hours out of tracking range (`toldMilestones`, long gap
 * design §3). Then the totals, unless the rows already have them.
 *
```

**In `src/facts/tripFacts.ts`, replace (8 of 8):**

```ts
  const flights = started.flatMap((leg) => {
    const events = factsMilestones(facts, leg)
      .filter((m) => m.time <= t)
```

**with:**

```ts
  const flights = started.flatMap((leg) => {
    const events = toldMilestones(facts, leg, t)
      .filter((m) => m.time <= t)
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 17 tests pass. Then `npx tsc --noEmit`: nothing; `npm test`: 178 test files and 3,779 tests pass, and the same with `TZ=UTC npm test`, as GitHub's build runs; and `npm run build` ends `✓ built`. Last, the shared cases:

```bash
git diff --name-only 3c93b48 -- tests/fixtures/trip-map && shasum -a 256 tests/fixtures/trip-map/live-cases.json
```

Expected: `tests/fixtures/trip-map/live-cases.json` alone, Task 2's copy, and the checksum of Task 2's Step 1. No other step changes them.

- [x] **Step 5: The checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && npm run build
```

Expected: 178 test files and 3,779 tests pass, and the build ends `✓ built`.

- [x] **Step 6: Commit, on Todd's yes.** Only these files, by path:

```bash
git add src/facts/tripFacts.ts tests/facts/longGap.test.ts
git commit -m "Past 2 hours out of tracking range an event waits until the plane is tracked again or at its gate: not in the list, the banner, the headline or the card's sentence (long gap design §3, Todd, 17 Nov 2026)"
```

---

### Task 5: The demo scene `live-long-gap`

A scene for Todd's look, wired as the other live scenes are (`src/data/demoLive.ts`, `src/data/demo.ts`, the README). The demo's trips cross no ocean, so it's UPS2963, Rockford to Anchorage, off on time and last tracked over Saskatchewan 95 minutes later: the page opens 2 h 8 min after that sighting and 87 minutes from the gate. Nothing below is named (it's over Canada, then Alaska), the chip is the landing countdown, the first row "Last tracked over Saskatchewan · 2 h 8 min ago", and the crossings into Yukon and the United States wait until the gate. Its test reads the scene's facts with the site's geography.

**Files:**
- Modify: `src/data/demo.ts`, `src/data/demoLive.ts`, `README.md`
- Test: `tests/data/demoLive.test.ts`, `tests/data/demoScenes.test.ts`, `tests/ui/StatusScreen.test.tsx`

- [x] **Step 1: Write the tests.**

**In `tests/data/demoLive.test.ts`, replace (1 of 3):**

```ts
import { DEMO_SCENES, demoRawForScene, type DemoScene } from '../../src/data/demo'
import { demoLiveFlights, isLiveDemoScene } from '../../src/data/demoLive'
import { liveMapFlights } from '../../src/engine/liveLegs'
import { buildSchedule } from '../../src/engine/normalize'
import { mapFlightProgress } from '../../src/map/mapFlight'
import { testAirports } from '../fixtures/airports'

const NOW = Date.UTC(2026, 9, 20, 16, 0)
const MINUTE = 60_000

const placeOf = (code: string) => {
```

**with:**

```ts
import { DEMO_SCENES, demoRawForScene, type DemoScene } from '../../src/data/demo'
import { demoLiveFlights, isLiveDemoScene } from '../../src/data/demoLive'
import { buildLegs } from '../../src/engine/legs'
import { liveMapFlights, withLiveTimes } from '../../src/engine/liveLegs'
import { buildSchedule } from '../../src/engine/normalize'
import { makeSnapshot } from '../../src/engine/snapshot'
import { headline, makeTripFacts, tripSoFar } from '../../src/facts/tripFacts'
import { factRows } from '../../src/facts/tripFactsRows'
import { mapFlightProgress } from '../../src/map/mapFlight'
import { tripMapFor } from '../../src/map/tripMapFor'
import { appGeography } from '../facts/factsTestData'
import { testAirports } from '../fixtures/airports'

const NOW = Date.UTC(2026, 9, 20, 16, 0)
const MINUTE = 60_000
const NY = 'America/New_York'

const placeOf = (code: string) => {
```

**In `tests/data/demoLive.test.ts`, replace (2 of 3):**

```ts
  return { flight, progress, label: progress.label ? liveLabelText(progress.label) : null }
}

describe("the demo's made-up real planes (Stage 3 spec §12)", () => {
```

**with:**

```ts
  return { flight, progress, label: progress.label ? liveLabelText(progress.label) : null }
}

/** The facts of the scene `minutes` after it opens, with the site's geography, as the status page makes them. */
function sceneFacts(scene: DemoScene, minutes = 0) {
  const at = NOW + minutes * MINUTE
  const summary = buildSchedule(demoRawForScene(scene, NOW), at)
  const flights = liveMapFlights(summary, demoLiveFlights(scene, summary, placeOf, at), 0, placeOf)
  const schedule = withLiveTimes(summary, flights, at)
  const legs = buildLegs(schedule)
  const map = tripMapFor(makeSnapshot(schedule, legs, at, NY), legs, testAirports, flights)
  if (!map) throw new Error(`${scene} has no trip map`)
  return { at, facts: makeTripFacts(map, { geography: appGeography(), comparisons: null, viewerTz: NY, h24: false }) }
}

/** The time's own space, narrow and unbreaking, as an ordinary one. */
const plain = (text: string | null | undefined) => text?.replace(/\u202F/g, ' ')

describe("the demo's made-up real planes (Stage 3 spec §12)", () => {
```

**In `tests/data/demoLive.test.ts`, replace (3 of 3):**

```ts
  })

  it('stays itself while the page is open', () => {
    expect(sceneAt('live-ahead', 20)?.label).toBe('10 min ahead')
    expect(sceneAt('live-ocean-gap', 60)?.progress.phase).toBe('estimated')
    expect(sceneAt('live-on-ground-late', 60)?.label).toBe('Still on the ground · 1 h 20 min behind')
  })
```

**with:**

```ts
  })

  it('live-long-gap: out of tracking range for 2 h 8 min on the way to Anchorage, 87 minutes from its gate (long gap design §3)', () => {
    const scene = sceneAt('live-long-gap')!
    expect(scene.progress.phase).toBe('estimated')
    expect(scene.flight.live?.callsign).toBe('UPS2963')
    expect(Math.round((NOW - scene.flight.live!.fix!.seenAt) / MINUTE)).toBe(128)
    expect(Math.round((scene.progress.end - NOW) / MINUTE)).toBe(87)
  })

  it('live-long-gap: names nothing below, and holds the crossings guessed past 2 hours until the gate (long gap design §3)', () => {
    const { at, facts } = sceneFacts('live-long-gap')
    expect(headline(facts, at, false)).toBe('Landing in 1 h 28 min')
    expect(plain(factRows(facts, at, at).find((r) => r.kind === 'below')?.title)).toBe('Last tracked over Saskatchewan · 2 h 8 min ago')
    const crossings = (minutes: number) => {
      const { at: t, facts: f } = sceneFacts('live-long-gap', minutes)
      return tripSoFar(f, t).flights.find((flight) => flight.title.includes('Anchorage'))?.events.map((e) => e.text.split(' · ')[0])
    }
    expect(crossings(0)).toEqual(['Crossed into British Columbia', 'Halfway', 'Crossed into Alberta', 'Crossed into Saskatchewan', 'Crossed into Canada',
      'Crossed into Minnesota', 'Crossed into Wisconsin'])
    // At the gate, 87 minutes on, the two it was guessed to make past the 2 hours are told too.
    expect(crossings(90)?.slice(0, 2)).toEqual(['Crossed into the United States', 'Crossed into Yukon'])
  })

  it('stays itself while the page is open', () => {
    expect(sceneAt('live-ahead', 20)?.label).toBe('10 min ahead')
    expect(sceneAt('live-ocean-gap', 60)?.progress.phase).toBe('estimated')
    expect(sceneAt('live-long-gap', 80)?.progress.phase).toBe('estimated')
    expect(sceneAt('live-on-ground-late', 60)?.label).toBe('Still on the ground · 1 h 20 min behind')
  })
```

**In `tests/data/demoScenes.test.ts`, replace (1 of 2):**

```ts
  'live-landed': 'inFlight',
}
```

**with:**

```ts
  'live-landed': 'inFlight',
  'live-long-gap': 'inFlight',
}
```

**In `tests/data/demoScenes.test.ts`, replace (2 of 2):**

```ts
    'live-landed': { progress: { day: 1, days: 2, upcoming: ['SDF'] } },
  }
```

**with:**

```ts
    'live-landed': { progress: { day: 1, days: 2, upcoming: ['SDF'] } },
    'live-long-gap': { progress: { day: 1, days: 2, upcoming: ['SDF'] } },
  }
```

**In `tests/ui/StatusScreen.test.tsx`, replace (1 of 2):**

```tsx
    'live-landed': null,
  }
```

**with:**

```tsx
    'live-landed': null,
    'live-long-gap': null,
  }
```

**In `tests/ui/StatusScreen.test.tsx`, replace (2 of 2):**

```tsx
    )
    expect(container.querySelector('.inflight') != null).toBe(['flying', 'last-leg', 'live-ahead', 'live-ocean-gap', 'live-on-ground-late', 'live-landed'].includes(scene))
  })
```

**with:**

```tsx
    )
    const inTheAir = ['flying', 'last-leg', 'live-ahead', 'live-ocean-gap', 'live-on-ground-late', 'live-landed', 'live-long-gap']
    expect(container.querySelector('.inflight') != null).toBe(inTheAir.includes(scene))
  })
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/data/demoLive.test.ts tests/data/demoScenes.test.ts tests/ui/StatusScreen.test.tsx
```

Expected: 4 of the 149 tests fail, in two of the three files, because `live-long-gap` isn't a scene yet: its two tests, its trip card, and its plane staying itself while the page is open. `tests/ui/StatusScreen.test.tsx` passes. Its tests, and the rest of `tests/data/demoScenes.test.ts`'s, go through the scenes there are, and `live-long-gap` joins them with the code: three tests more at Step 4.

- [x] **Step 3: Write the code, the README's line.**

**In `src/data/demo.ts`, replace (1 of 3):**

```ts
  | 'last-leg' | 'driving-home' | 'commuting-home' | 'reserve' | 'training' | 'nothing-ahead' | 'recap'
  | 'live-ahead' | 'live-ocean-gap' | 'live-on-ground-late' | 'live-landed'

```

**with:**

```ts
  | 'last-leg' | 'driving-home' | 'commuting-home' | 'reserve' | 'training' | 'nothing-ahead' | 'recap'
  | 'live-ahead' | 'live-ocean-gap' | 'live-on-ground-late' | 'live-landed' | 'live-long-gap'

```

**In `src/data/demo.ts`, replace (2 of 3):**

```ts
  // faded past a stretch nobody saw on the way to Anchorage; still at Rockford's gate 20 minutes after the plan's
  // takeoff; and down in Anchorage a minute ago, not yet at the gate. `flying` stays the schedule's alone.
  'live-ahead': { variant: 'driver', offset: 100 },
```

**with:**

```ts
  // faded past a stretch nobody saw on the way to Anchorage; still at Rockford's gate 20 minutes after the plan's
  // takeoff; down in Anchorage a minute ago, not yet at the gate; and out of tracking range for 2 h 8 min on the way to
  // Anchorage, 87 minutes from its gate (long gap design §3). `flying` stays the schedule's alone.
  'live-ahead': { variant: 'driver', offset: 100 },
```

**In `src/data/demo.ts`, replace (3 of 3):**

```ts
  'live-landed': { variant: 'driver', offset: 541 },
}
```

**with:**

```ts
  'live-landed': { variant: 'driver', offset: 541 },
  'live-long-gap': { variant: 'driver', offset: 463 },
}
```

**In `src/data/demoLive.ts`, replace (1 of 2):**

```ts

export type LiveDemoScene = 'live-ahead' | 'live-ocean-gap' | 'live-on-ground-late' | 'live-landed'

```

**with:**

```ts

export type LiveDemoScene = 'live-ahead' | 'live-ocean-gap' | 'live-on-ground-late' | 'live-landed' | 'live-long-gap'

```

**In `src/data/demoLive.ts`, replace (2 of 2):**

```ts
  'live-landed': { number: '2963', bow: 0, takeoffLate: -8, unseen: [], lastSeen: null },
}
```

**with:**

```ts
  'live-landed': { number: '2963', bow: 0, takeoffLate: -8, unseen: [], lastSeen: null },
  // Rockford to Anchorage, off on time, last tracked over Saskatchewan an hour and 35 minutes after it took off, and
  // never again: out of tracking range for more than 2 hours, so nothing below is named, and the crossings it's guessed
  // to make after them wait until it's at the gate (long gap design §3). The demo's trips cross no ocean.
  'live-long-gap': { number: '2963', bow: 1.5, takeoffLate: 0, unseen: [], lastSeen: 95 },
}
```

**In `README.md`, replace:**

```markdown
  - A marker shows what the pilot is doing on the ground: a bed on a layover (`layover`), an hourglass at a turn (`turn`), a briefcase at base (`base`), a house at home (`home`).
  - The real plane, from Crewlu Cloud's `partner_live` (Stage 3): `live-ahead` (in the air, ahead of schedule), `live-ocean-gap` (faded, an estimate past a stretch nobody saw), `live-on-ground-late` (still at the gate after the plan's takeoff) and `live-landed` (down, a few minutes from the gate), with made-up flights. `flying` stays the schedule's alone.
  - The full map's timeline is colored by what the pilot is doing. Its "Quick layovers" switch, on by default and remembered in the browser, hurries a replay through each wait.
```

**with:**

```markdown
  - A marker shows what the pilot is doing on the ground: a bed on a layover (`layover`), an hourglass at a turn (`turn`), a briefcase at base (`base`), a house at home (`home`).
  - The real plane, from Crewlu Cloud's `partner_live` (Stage 3): `live-ahead` (in the air, ahead of schedule), `live-ocean-gap` (faded, an estimate past a stretch nobody saw), `live-on-ground-late` (still at the gate after the plan's takeoff), `live-landed` (down, a few minutes from the gate) and `live-long-gap` (out of tracking range for more than 2 hours: nothing below named, and its crossings held until the gate), with made-up flights. `flying` stays the schedule's alone.
  - The full map's timeline is colored by what the pilot is doing. Its "Quick layovers" switch, on by default and remembered in the browser, hurries a replay through each wait.
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 152 tests pass. Then `npx tsc --noEmit`: nothing; `npm test`: 178 test files and 3,785 tests pass, and the same with `TZ=UTC npm test`, as GitHub's build runs; and `npm run build` ends `✓ built`. Last, the shared cases:

```bash
git diff --name-only 3c93b48 -- tests/fixtures/trip-map && shasum -a 256 tests/fixtures/trip-map/live-cases.json
```

Expected: `tests/fixtures/trip-map/live-cases.json` alone, Task 2's copy, and the checksum of Task 2's Step 1. No other step changes them.

- [x] **Step 5: The checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && npm run build
```

Expected: 178 test files and 3,785 tests pass, and the build ends `✓ built`.

- [x] **Step 6: Commit, on Todd's yes.** Only these files, by path:

```bash
git add README.md src/data/demo.ts src/data/demoLive.ts tests/data/demoLive.test.ts tests/data/demoScenes.test.ts tests/ui/StatusScreen.test.tsx
git commit -m "The demo scene live-long-gap: a plane out of tracking range for more than 2 hours on the way to Anchorage"
```

---

### Task 6: Todd looks at the words

The tests check the words. This is the look at them.

- [x] **Step 1: Start the site with Apple's map.** The worktree has the MapKit token in `.env.local` from plan 3C-2 (git-ignored; it lasts to 22 Nov 2026: if the site's own map shows instead of Apple's, it has run out, and Todd makes another as the README says). The session starts the `crewluve-mapkit` server (`.claude/launch.json`, port 5182) with its preview tool, reads in `live-long-gap` the card's chip, the card's sentence (the card's button's `aria-label`, `[data-trip-map-open]`) and, on the full map, the first line, "More facts" first row and the list, and gives Todd those and the addresses:
  - `http://localhost:5182/?demo=1&scene=live-long-gap`, and the same with `#map` at the end. The page opens 2 h 8 min after the plane was last tracked and 87 minutes from its gate: reload it to start the scene again.
  - `http://localhost:5182/?demo=1&scene=live-ocean-gap`, `…scene=live-ahead` and `…scene=flying`, each also with `#map`: a plane 45 minutes out of range, one in the air, and a flight with no live data.
  - Before this plan, no scene opened past 2 hours out of range: `live-ocean-gap` is 45 minutes out when it opens, and passes 2 hours only if the page stays open 75 minutes.
- [x] **Step 2: Todd looks, on a phone and a computer:**
  - in `live-long-gap`, the card's chip and the full map's first line: "Landing in 1 h 28 min", counting down, and no place; the card's sentence: "UPS2963 to Anchorage, on schedule, last tracked over Saskatchewan. Lands about … your time. Latest: crossed into British Columbia, about 41 minutes ago."; the plane faded;
  - "More facts": the first row "Last tracked over Saskatchewan · 2 h 8 min ago"; the list's newest line "Crossed into British Columbia · about …", with no Yukon or United States until the gate; the banner "Crossed into British Columbia · About 41 min ago";
  - unchanged: `live-ocean-gap`'s "Over …" (with a city where there's one) and its events, `live-ahead`, and `flying`;
  - "Over the Pacific" can't be seen in the demo (the first question for Todd above). On a real flight across an ocean, out of range more than 2 hours, the site names only the ocean, as the app does.
- [x] **Step 3: Write down what was wrong.** Anything that needs a change goes in "Changes made during execution", is fixed in Tasks 2 to 5's files with a test where a test can see it, and has Todd run the tests again.

---

### Task 7: The review, and the record

- [x] **Step 1: The review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Tasks 2 to 5's commits (from `3c93b48`), against the app's design and plan (`git -C ~/Dev/Crewluv show 4186f60:…`), the app's commits `bc4ee39` and `2cc8f1a`, and this plan's list of where it settles details. Make its fixes, tests first, run `npm test`, `TZ=UTC npm test` and `npm run build`, and record what it found.
- [x] **Step 2: Todd runs everything once more** (Task 5 Step 5's command), if the review changed anything, and the fix is committed on his yes, its own files by path.
- [x] **Step 3: This plan's record.** Under "Changes made during execution": the review, each of Todd's runs (the count and the time), what Task 6 turned up, and each commit's hash.
- [x] **Step 4: Commit, on Todd's yes.**

```bash
git add docs/superpowers/plans/2026-11-17-website-long-gap.md
git commit -m "The website's best guesses after a long gap plan, with its record"
```

---

### Task 8: Going live, on Todd's yes

This plan goes live. Pushing to `main` publishes the site: `.github/workflows` tests and builds every push to `main` in UTC, then publishes it to Pages. **Nothing here runs without Todd's yes in the conversation, asked when this task is reached.**

- [x] **Step 1: Ask Todd** whether to go live now. If not, stop: the branch stays as it is, and this task waits.
- [x] **Step 2: Bring the branch up to `main`.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git fetch origin && git merge-base --is-ancestor origin/main HEAD && echo "fast-forward"
```

Expected: `fast-forward`. If it isn't (`main`, at `3c93b48` when this plan was written, has moved on), merge it in here: `git merge origin/main`. If any file conflicts, STOP and tell Todd. Then run `npm test && npm run build`.

- [x] **Step 3: The suite as GitHub runs it,** in UTC, on the branch as it will go live:

```bash
TZ=UTC npx vitest run
```

Expected: every test file and test passes, the same counts as `npm test`. If any fails, STOP: fix it here, tests first, before anything is pushed.

- [x] **Step 4: Todd runs everything** (Task 5 Step 5's command) on the branch as it will go live.
- [x] **Step 5: Push the branch to `main`, on Todd's yes.** A fast-forward only; never force.

```bash
git push origin claude/trip-map-live-598046:main
```

- [x] **Step 6: Watch the deploy** (`gh run watch` on the run the push started) until it succeeds. If it fails, tell Todd at once with its log: the site stays as it was until a deploy succeeds.
- [x] **Step 7: Look at the live site** with Todd, at `https://crewluve.crewlu.net/?demo=1&scene=live-long-gap` and `…&scene=live-long-gap#map` (reload to start the scene again): the chip's countdown, the card's sentence without a place, "Last tracked over Saskatchewan", the list without Yukon; and `…scene=live-ocean-gap#map`, `…scene=live-ahead#map` and `…scene=flying#map`, unchanged.
- [x] **Step 8: The record.** Under "Changes made during execution": the push's commit, the deploy's run and time, and what Todd saw. Commit the plan on his yes and push it (a fast-forward only), as Step 5.

---

## What the website shares with the app

The same two rules (the design's §4), as the website has them:

- **The speed:** from the last place the plane was tracked, its own speed for 2 hours of the cruise left (the path ahead less the descent's 120 nm), and the schedule's after, as one cruise speed that takes the same time; the estimate, the estimated plane, the ghost and the record fly it. Tracked or not: a tracked plane is measured from its newest place, and nothing jumps when it goes out of range. The shared cases, the app's own file, test both sides.
- **2 hours out of range,** a strict ">", the same 2 hours as the speed's.
- **What's below:** past 2 hours only "the Pacific", "the Atlantic", "the Indian Ocean", "the Arctic Ocean" or "the Southern Ocean", with no city; over a sea, a bay or land nothing, so the headline and the chip go on to the landing countdown and the card's sentence leaves "over …" out.
- **Events:** one guessed more than 2 hours after the last sighting waits while the flight is between its gates: not in the list, the banner, the headline or the chip. Told on the straight join with "about" once the plane is tracked again, and as best guesses once it's at its gate. The same answers as the app's `LongGapFactsTests`, from the same made-up flight.
- **The website's own:** its first row's lines, its demo scene `live-long-gap`, and a test of the shared long ocean gap on its geography.

## Changes made during execution

**Run in session `68f03a67` (17 Nov 2026, from about 1:40 PM), from the plan's own text** by the scratch folder's `run_steps.py` (tests first, then the code; Task 2's shared cases copied from the app at `4186f60`). Every file each task touched was the same as tested. Todd answered "No, the tests are enough" to a Pacific flight in the demo, and chose "Run each, commit each": each task's checkpoint, `npm test && TZ=UTC npm test && npm run build`, ran in his Terminal and passed before its commit.

- **Task 2:** 18 of 289 failing first; then 289; 177 / 3,762 in Eastern time and in UTC; built. **Commit `89ac66b`.**
- **Task 3:** 10 of 11 failing first; then 11; 178 / 3,773 in both; built. **Commit `f9c95b1`.**
- **Task 4:** 5 of 17 failing first; then 17; 178 / 3,779 in both; built. **Commit `58599ca`.**
- **Task 5:** 4 of 149 failing first; then 152; 178 / 3,785 in both; built. **Commit `d78316e`.**
- **Task 6, Todd's look** at `live-long-gap` (the session read it first: the card's chip "Landing in 1 h 28 min", "Last tracked over Saskatchewan · 2 h 8 min ago", the card's sentence with no "over …", the list and the banner ending at "Crossed into British Columbia · about 2:11 PM", Yukon and the United States held). **Todd: "Looks good."**
- **Task 7, the review** (`superpowers:code-reviewer`, sonnet, on `3c93b48..d78316e`): nothing critical or important. **No change made.** It found `flownPlan` and `cruiseSpeed` the reference model's line for line; the shared cases byte-identical to the app's; both 2-hour edges strict, as the design has them; held events kept out of every surface (they all go through `toldMilestones` and `placeBelow`); the website's own rules untouched; the tests passing in Pacific/Auckland too.
  - Minor, left for later: no test puts an event exactly 2 hours after the last sighting, or a moment exactly at the leg's end (a `<=`/`<` slip there would pass); the held rule reads the last knot's time and the name rule the fix's age, which agree whenever the last knot is the fix; a second `cruiseSpeed` beside `flightPath.ts`'s private one of another meaning; a replay test of held events (only names are tested in a replay).
- **Task 8, going live:** Todd chose "Go live: run it, then push if it passes". `origin/main` was `3c93b48`, a fast-forward (no merge needed).
  - **Plan committed:** `1f20e42`. **Todd's run on the branch as it went live** (Steps 3 and 4 together): `npm test && TZ=UTC npm test && npm run build`, 178 test files and 3,785 tests passed in Eastern time and in UTC, built.
  - **Pushed:** `3c93b48..1f20e42`, a fast-forward. **Deployed:** run `44163876328`, build and deploy succeeded, 2:57 PM EST (19:57 UTC).
  - **The live site:** the session read `https://crewluve.crewlu.net/?demo=1&scene=live-long-gap` (the new bundle; the card's chip "Landing in 1 h 28 min"; its sentence "…on schedule, last tracked over Saskatchewan. Lands about 4:24 PM your time. Latest: crossed into British Columbia, about 41 minutes ago."). **Todd: "Looks good."**

## Self-review

- **The design covered:** §2's speed, with its constant and the shared cases (Task 2); §3's words: only an ocean, no city, nothing over a sea or land, the card's sentence (Task 3), and events held and told on the straight join, or at the gate (Task 4); §4, the website's same rules, with the app's file copied and the app's tests' answers (Tasks 2 to 4); a scene to look at (Task 5).
- **Not covered here, on purpose:** §5's routes, a flight never marked landed (the estimate carries it to the gate, as before), and tuning the 2 hours; the app's own words and docs, which its plan has done.
- **Placeholders:** none. Every step's code is the tested file or a replacement made from it, and the shared cases are the app's file.
- **What could it break?**
  - The landing time of every flight with live data and more than 2 hours of cruise ahead of its last place: it leans on the schedule's speed past them, tracked or not, so a tailwind's early estimate is later than before, and the label with it. That's the design's choice (§2.1: UPS96 from 42 minutes early to 17). Inside the last 2 hours of cruise, nothing changes.
  - The facts of a plane out of range more than 2 hours: fewer places named and fewer events, until it's tracked again or at its gate. Within 2 hours, nothing changes.
  - The shared cases' every flight passes with the new file, and `facts-cases.json`, which has no real plane, holds nothing back.

## Left for later

- **A Pacific flight in the demo,** if Todd asks for one (the question above).
- **Tuning the 2 hours** on more flights, once Crewlu Cloud has recorded more (the design's §5), in the app's reference and its cases first.
- **The landed plan's "Left for later"** holds, with plans 3C-1 to 3C-4's.
