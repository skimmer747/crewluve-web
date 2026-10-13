# Crewluve Web Back Home In Across Back-to-Back Trips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the pilot goes straight from one trip into the next without going home, "Back Home In" counts to the homecoming after the last of those trips, as the app does.

**Architecture:** One new step in `arrivalTarget` (`src/engine/targets.ts`). Steps 4.1–4.2 run in a loop over the current trip and the trips that follow it straight on. Every caller (`makeSnapshot`, `nextTripHomecoming`) gets the rule from there.

**Tech Stack:** Vite 5.4, TypeScript 5.9 (strict), Preact 10, Vitest 3.

**Spec:** `docs/superpowers/specs/2026-10-13-crewluve-web-back-home-design.md`

---

## Execution notes

- **Branch:** `back-home`, from `main` at `f5b64a8`, in the main project folder. Run every command from `~/Dev/Crewluve Website`, quoted.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`. The suite is 2169 tests in 95 files before this plan, 2184 after Task 2, and 2190 after the review.
- **The Crewluve app (`~/Dev/Crewluv`) is reference only.**
- **One review** after Task 2, covering the spec too.

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/engine/targets.ts` | modify | Step 4.3: straight on to the next trip within 24 h, unless a ride from home comes between |
| `tests/fixtures/engine.ts` | modify | `B2B` and `backToBackRaw()`: the report's week from CrewLu Cloud |
| `tests/engine/arrival.test.ts` | modify | The week at six moments; the edges; the two C14 tests' second trip moved past 24 h |
| `tests/engine/home.test.ts` | modify | {HB} names the later homecoming |
| `docs/superpowers/specs/2026-10-08-crewluve-web-slice1-design.md` | modify | Pointers in §6.5 to the new step |

---

### Task 1: Red

- [x] **Step 1:** add the fixture and the tests listed in the spec §5.
- [x] **Step 2:** `npx vitest run tests/engine/arrival.test.ts tests/engine/home.test.ts` → 10 fail. The report-window case gets `{ label: 'base', time: 2026-10-15T03:37Z, airport: 'SDF' }`, exactly the live card.

### Task 2: Green

- [x] **Step 1:** in `arrivalTarget`, `nextTripLeg(trip, from)` returns the leg (not just its start); `ride` takes the bound; `leavesHome(from, to)` is new; steps 4.1–4.2 run in a loop that moves on to the next trip while it starts ≤ 24 h after the landing and no ride from home comes between; step 4.4 still counts the current trip's own last flight.
- [x] **Step 2:** all three gates green.
- [x] **Step 3:** deliberate breaks, each run with a 90 s limit.
- [x] **Step 4:** the demo's seven scenes, local against live at the same moment.
- [x] **Step 5:** commit.

### Task 3: Review, merge and release

- [x] **Step 1:** one code review of the branch against the spec.
- [ ] **Step 2:** ask the user to merge (one question), then to push (a separate yes).
- [ ] **Step 3:** after the push: the Pages run, the live files against the local build, the demo scenes.
- [ ] **Step 4:** update the memory.

---

## Done when

- The three gates are green with 2190 tests in 95 files.
- On the report's week, the card says "Back Home In", Sat, Oct 17 at 3:21 AM · Orlando, at every moment from the report to the second trip (Task 1's test).
- It's live on crewluve.crewlu.net, released with the user's yes (Task 3).

## Execution notes

- **Task 1:** 10 failed first, as above.
- **Task 2:** 2184 tests in 95 files, `tsc` and build clean. Deliberate breaks, 9 of 9 caught: the 24 h made strict (1 failing), dropped (3), the ride-from-home check dropped (2), N's other trips counted from now (the loop never ends: `from` must grow), the chain stopped after one trip (1), the gap from the scheduled landing (1), the chain never taken (10), the fallback on the last chained trip (1), N's ride not bounded by the trip after it (5). Demo: home "Leaves Home In 22h 29m"; driving-to-work, base, flying, turn, layover and delayed "Back Home In" to Lexington, the same as live, to the minute.
- **Review (after Task 2): ready to merge after one fix.** Gates and the 10 red tests confirmed; 20k random schedules old vs new: every change is base, city or nothing becoming home, never a past target, the loop always ends. Taken:
  - **Important:** a ride home before the next trip wasn't tested against going on to it → test added.
  - **Minor:** two breaks of N's ride window passed → tests for N's own 3 days and for a ride inside N.
  - **Minor:** only a ride from home stopped the chain → now any standalone leg from or at home, a drive to work, or N leaving from home (spec decision 5).
  - **Minor:** spec fixes: the celebration does change (as in the app), the 24 h is measured differently from the app, a ride home in the middle of N and a trip with no flights in between are accepted (§3, decision 6).
  - **Minor:** names: `ofTrip`, `after`, `homeBetween`; `nextTripLeg` returns a leg with a trip id; the doc says legs are sorted.
  - Fixes: 2190 tests in 95 files, `tsc` and build clean; deliberate breaks 15 of 15 caught (the reviewer's two included).
