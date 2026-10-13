# Crewluve Web Part C Leftovers: Longitude Spelled One Way, and One Source for the Delay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `GeoPoint` spells longitude `lng`, as the rest of the site does, and the in-flight card's delay banner reads the snapshot's delay, the one the sentence reads. Nothing on screen changes.

**Architecture:**
- `inFlightFacts` returns `snap.delay?.minutes ?? null` instead of working the delay out from the leg.
- `GeoPoint`'s field is renamed; the map's own names keep the app's spelling.

**Tech Stack:** Vite 5.4, TypeScript 5.9 (strict), Preact 10, Vitest 3 with happy-dom and @testing-library/preact.

**Spec:** `docs/superpowers/specs/2026-10-13-crewluve-web-part-c-leftovers-design.md`

---

## Execution notes

**Setup and gates**
- **Branch:** `part-c-leftovers`, from `main` at `f983fb5`, in the main project folder. Run every command from the project root, `~/Dev/Crewluve Website`, quoted.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass before every commit that touches code. The suite is 2167 tests in 95 files before this plan and after it: Task 1 adds one test and drops one.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Sized to the fix:** the two changes are small enough that the plan was written alongside the build, from the spec, rather than replayed in a scratch copy first.

**Reviews and changes**
- **One review:** after Task 2, a code-quality review of the branch, covering the spec too.
- **If the code has to differ from a printed block, write it down** under "Execution notes" at the end of this file.

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/ui/inFlightFacts.ts` | modify | Takes the snapshot's delay; builds `GeoPoint`s with `lng` |
| `src/ui/flightMapGeometry.ts` | modify | `GeoPoint` is `{ lat, lng }` |
| `src/ui/flightSky.ts`, `src/ui/FlightMap.tsx` | modify | Read `.lng` |
| Tests | modify | `tests/ui/inFlightFacts.test.ts`; `lng` in `FlightMap`, `InFlightCard`, `flightMapGeometry`, `flightSky` and `inFlightFacts` tests |

---

### Task 1: One source for the delay

- [x] **Step 1: Write the failing test**

In `tests/ui/inFlightFacts.test.ts`, import `RawBuilder` from `../../src/data/rowBuilder` and the `MoveLeg` type from `../../src/engine/legs`, drop `H` from the `../fixtures/legs` import, and replace the two tests that splice a leg into a snapshot ("takes the delay from the departure, not from the landing" and "notes a delay of 15 minutes or more, late or early, and none at 14") with:

```ts
  it('gives the snapshot’s delay, the one the sentence reads', () => {
    const air = snapAt(100)
    const late: Snapshot = { ...air, delay: { flight: air.status.current as MoveLeg, minutes: 25 } }
    expect(inFlightFacts(late, testAirports)!.delayMinutes).toBe(25)
  })

  it('takes the delay from the departure, not from the landing', () => {
    const late = engineFor(new RawBuilder(A).pilot('Sam', 'SDF', null).trip('t1', {
      dutyPeriods: [{ start: 0, end: 600, flights: [{ dep: 'SDF', arr: 'RFD', out: 60, in: 150, actualOut: 100, actualIn: 160 }] }],
    }).build())
    expect(inFlightFacts(snapAt(120, late), testAirports)!.delayMinutes).toBe(40)
  })
```

The 15-minute rule stays covered in `tests/engine/snapshot.test.ts` (spec §5).

- [x] **Step 2: Run it and watch it fail**

`npx vitest run tests/ui/inFlightFacts.test.ts`: 1 failed, 10 passed, with "expected null to be 25".

- [x] **Step 3: Implement**

In `src/ui/inFlightFacts.ts`:

```ts
import type { Snapshot } from '../engine/snapshot'
```

```ts
  /**
   * How late (positive) or early the departure is, when that's 15 minutes or more; else null. It's the snapshot's
   * delay, which the sentence reads too (Part C leftovers §4.2).
   */
  delayMinutes: number | null
```

```ts
    delayMinutes: snap.delay?.minutes ?? null,
```

- [x] **Step 4: Run it and watch it pass**

`npx vitest run tests/ui/inFlightFacts.test.ts`: 11 passed.

- [x] **Step 5: Run the gates and commit**

2167 tests in 95 files, `tsc` clean, build clean. Commit `0d03f56`.

---

### Task 2: Longitude's spelling

- [x] **Step 1: Rename the field**

In `src/ui/flightMapGeometry.ts`, `src/ui/flightSky.ts`, `src/ui/FlightMap.tsx`, `src/ui/inFlightFacts.ts` and the five test files, every `.lon` becomes `.lng`, and every `lon:` key on a `GeoPoint` becomes `lng:`. `boxLongitude(lon: number, lonOffset: number)` is a parameter, not a field, and keeps `lon`, as do `lon1`, `lon2`, `minLon`, `maxLon`, `lonSpan`, `lonOffset` and `MapBounds`' fields (spec §3).

- [x] **Step 2: Check none is left**

`grep -rn -E "\.lon\b|\blon:" src tests` finds only `boxLongitude`'s parameter.

- [x] **Step 3: Run the gates and commit**

2167 tests in 95 files, `tsc` clean, build clean. Commit `0e2cda2`.

---

### Task 3: Deliberate breaks (controller)

- [x] **Step 1: Break the new code and check the tests catch it**

Run the in-flight tests and `tsc` after each break, then restore the file:
1. The old sum back: 1 test fails.
2. `?? null` dropped (cast to keep `tsc` quiet): 1 test fails.
3. The upcoming trip's delay read instead: 3 tests fail.
4. One `lon:` left in `greatCirclePoint`'s answer: 5 tests fail, and `tsc` fails.

---

### Task 4: Browser check (controller)

- [x] **Step 1: Build and open the preview**

`npm run build`, then the `crewluve-preview` server from `.claude/launch.json` (port 5181) in the browser pane, at 375 × 812.

- [x] **Step 2: Check that nothing changed**

On `/?demo=1&scene=last-leg` and `/?demo=1&scene=flying`, locally and on the live site (`index-IAymGmrn.js`):
- the map's drawing, without its moving parts' `transform` and `style`, hashes the same: `bed3c4939fba` (last leg) and `f7a7f7f3324e` (flying);
- the last leg shows "DELAYED 40m", heard as "Delayed 40 minutes", and 2,706 nm; the flying scene has no banner and shows 286 nm;
- `read_console_messages` with `onlyErrors: true` shows nothing.

---

### Task 5: Merge and release (controller, asks first)

- [ ] **Step 1: Merge**

Use superpowers:finishing-a-development-branch. Ask the user one question about how to merge `part-c-leftovers` into `main`.

- [ ] **Step 2: Release, only with a fresh yes**

Ask before pushing `main`; the push redeploys crewluve.crewlu.net. After the "Deploy to GitHub Pages" run succeeds, check that the live page's files match the local build, that the last-leg and flying scenes look as in Task 4, and that there are no console errors.

- [ ] **Step 3: Update the memory**

Update the project memory with the new tip and what's next: the optional page-scrolling hook, then the idea board.

---

## Done when

- `npx vitest run`, `npx tsc --noEmit` and `npm run build` are all green, with 2167 tests in 95 files.
- The banner takes the snapshot's delay, and `GeoPoint` spells longitude `lng`, with nothing on screen changed (Tasks 1–4).
- It's live on crewluve.crewlu.net, released with the user's yes (Task 5).

## Spec coverage

| Spec section | Tasks |
|---|---|
| §4.1 Longitude | 2 |
| §4.2 The delay | 1 |
| §5 Testing | 1, 2, 3, 4 |

## Execution notes
