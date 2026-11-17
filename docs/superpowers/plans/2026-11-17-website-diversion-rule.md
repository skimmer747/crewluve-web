# The Website's Diversion Rule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep "Landed in Anchorage" off a plane that landed somewhere other than its arrival airport, as the app does.

**Source:** the app's session, 17 Nov 2026: Todd, "yes, send the diversion rule to the website". The app's `MapFlight.hasLanded` (Crewluv repo, `feature/trip-map-live` at `b365e2f`, `Crewluv/Services/TripMap/Live/MapFlight.swift`), its test `test_hasLanded_isFalse_forAPlaneSeenOnTheGroundAwayFromItsArrivalAirport` (`CrewluvTests/LandedBeforeGateTests.swift`), and its copy of the landed design's §6.

**The rule:** the engine's phase is `landed`, as before; and where the last fix is on the ground, it's within 10 nm (`AIRPORT_RADIUS`) of the path's destination. Otherwise the plane landed somewhere else, and nothing says "Landed in …": the facts, the list's tag, the timeline, the bar, the card's heading and the status sentence all read as they did before the landed words. A fix still in the air, or none, can't tell a diversion from a stale fix, so it isn't used: the plane counts as landed.

**Architecture:** one function, `hasLanded` in `src/map/mapFlight.ts`, which every landed surface already asks (through `legLandedBeforeGate`, `landedIn` and `landedFlight`).

**Tech Stack:** Preact 10, TypeScript 5.9 (strict), Vitest 3. No new package.

**Ground rules:** as the website's other plans: work only in the worktree `/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046` on `claude/trip-map-live-598046`; commit only on Todd's yes, by path; push only on his yes, a fast-forward; run the suite in Eastern time and in `TZ=UTC` (GitHub's build).

---

### Task 1: The rule

**Files:**
- Modify: `src/map/mapFlight.ts` (`hasLanded`, and `AIRPORT_RADIUS` imported from `./liveProgress`)
- Test: `tests/map/liveTripMap.test.ts`

- [x] **Step 1: The test,** in "a real plane down, not yet at the gate": a landed plane last seen on the ground in Harrisburg, about 90 mi short of Philadelphia, isn't landed before the gate and names no airport; one down inside Philadelphia's 10 nm is; and one whose last fix is still in the air, short of Philadelphia, is.
- [x] **Step 2: Run it, and see it fail:** `npx vitest run tests/map/liveTripMap.test.ts`: 1 of 16 fails, the diverted plane still counted as landed.
- [x] **Step 3: The code:** `hasLanded` asks the phase, then, where the fix is on the ground, its distance from `flight.path.destination` against `AIRPORT_RADIUS`.
- [x] **Step 4: Run them again:** 16 pass; `npx tsc --noEmit` clean; `npm test` and `TZ=UTC npm test` 178 test files and 3,786 tests; `npm run build` builds. Three deliberate breaks (the radius dropped, the on-ground check turned round, landed for any landed phase) each fail the test.
- [x] **Step 5: Todd's checkpoint:** `npm test && TZ=UTC npm test && npm run build`.
- [x] **Step 6: Commit, on Todd's yes:** `src/map/mapFlight.ts`, `tests/map/liveTripMap.test.ts` and this plan.

### Task 2: Going live, on Todd's yes

- [x] **Step 1:** Push the branch to `main`, a fast-forward only, on Todd's yes.
- [x] **Step 2:** Watch the deploy until it succeeds; if it fails, tell Todd at once with its log.
- [x] **Step 3:** The record below, committed and pushed the same way.

## Changes made during execution

- **Task 1, Steps 1 to 4** done in session `68f03a67` on 17 Nov 2026, as above.
- **Todd chose "Run it, commit, go live":** his run, `npm test && TZ=UTC npm test && npm run build`, passed 178 test files and 3,786 tests in Eastern time and in UTC, and built.
- **Commit `4ccb260`;** pushed `b64eaad..4ccb260`, a fast-forward. **Deployed:** run `44165083382`, build and deploy succeeded, 3:03 PM EST (20:03 UTC).
