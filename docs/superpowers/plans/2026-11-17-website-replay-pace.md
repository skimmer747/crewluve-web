# The Website's Replay Pace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The full map's replay plays its flights at half the pace it does now, as the app now does. A short flight such as Louisville to Cleveland can then be followed at 1×. Then this plan goes live, on Todd's yes.

**Architecture:**
- Two constants in `src/map/replayClock.ts` change, as the app's `TripReplayClock` did: `REPLAY_BASE_RATE` from 1,800 to 900, and `LEG_MIN_REPLAY` from 3 s to 6 s.
- The app's shared replay cases are copied whole.
- The website's own tests of the pace are worked out again.

**Tech Stack:** Preact 10, TypeScript 5.9 (strict), Vitest 3. No new package.

**Sources:**
- **Todd's words (17 Nov 2026), on the website:** "these speeds are good for these long 9 hour flights, but alot of the flights are from SDF to CLE and 1x is just too fast. I would leave the numbers the same but slow each one down by one half". He then chose "Both: the app leads".
- **The app's session (17 Nov 2026):** the rule settled with Todd, "The flying only". The app's commit `5833945` on `feature/trip-map-live` (read only, in `~/Dev/Crewluv`) has:
  - `Crewluv/Services/TripMap/TripReplayClock.swift`;
  - the shared cases `CrewluvTests/Fixtures/TripMap/replay-cases.json`, worked out again and checked against an independent Python reference;
  - the app's own tests, worked out again.
- **The rule:**
  - The base rate is 900: a day in 96 s at 1×, half CrewLu's pace.
  - A leg is never under 6 s.
  - A wait with Quick layovers on keeps its pace: a day a second, never under 3 s, never slower than the base rate. So a wait under 45 minutes keeps its pace, and a 1-hour turn now takes 3 s (it was 2 s).
  - With Quick layovers off, waits play at the base rate, so they halve too.
  - The speed labels stay 1×, 2×, 5× and 10×.

**How this plan was checked.** Every code block here comes from a file that was run before the plan was put together. None was typed into the plan by hand: a script made each replacement from the tested files and built the plan.
- **A scratch copy of this branch** at `92e811e`, with this plan's files laid over it. Every count below is the same in this Mac's time zone and in UTC (`TZ=UTC`), as GitHub's build runs.
  - Before: 183 test files and 3,904 tests, all passing, and `tsc --noEmit` clean.
  - After Task 2: 183 test files and 3,905 tests, all passing; `tsc --noEmit` finds nothing, and `npm run build` builds.
  - `replay-cases.json` is the app's at `5833945`, byte for byte, and passes.
- **Tests first:** the task's tests were run before its code, and failed as its Step 2 says: 31 of 70 in Task 2.
- **4 deliberate breaks** were made in the code, one at a time, and every one fails at least one test.
  - Task 2's 4: the old pace, a day in 48 s; legs as short as 3 s; waits halved too, with Quick layovers on; quick waits halved too.
- **The plan itself** is checked by a script. Task 2's steps, followed on the branch's files at `92e811e`, give every file as tested.
- **A dry run:** the steps were followed again on a fresh copy of those files, tests first. Every file came out the same, the tests failed and passed as Steps 2 and 4 say, and the copy's tests, `tsc --noEmit` and the build passed.
- **Not checked:**
  - The pace in a browser: that's Todd's look, Task 3.
  - Nothing called Crewlu Cloud or adsb.lol, and nothing used the network.

**Where this plan settles details.**
- **The website's own tests,** worked out again at the new pace:
  - **The replay clock** (`tests/map/replayClock.test.ts`):
    - a day in 96 s;
    - the short-legs example at 6 s, 2 s, 6 s, 4 s and 32 s;
    - a leg overlapping another at 600× and 150×.
    - The 90-minute line, past which a leg plays at the base rate, stays where it was.
  - **Quick layovers' Europe trip** (`tests/map/replayQuickLayovers.test.ts`): 118 s with them on (32 s, 3 s, 24 s, 3 s and 56 s), and 288 s with them off.
  - **The timeline's blocks** (`tests/map/timelineBlocks.test.ts`): the same fractions of 118 s and 288 s.
  - **The full map's timeline** (`tests/ui/TripMapPage.test.tsx`):
    - the slider's length;
    - a 30-minute drive at 6 s;
    - Page Down, a tenth of 118 s, to 12:10 PM;
    - Quick layovers switched off during a replay, a second then being a quarter of an hour.
- **The app's picker lost taps during a replay** (its `0781744`). The website's picker is a native `<select>`, whose change comes before any redraw. A new test picks 5× while a replay plays, and holds it through the frames.
- **The app's padding fix at takeoff** (its `8d6ec64`) the website had already (the follow the plane plan's record).

---

## Ground rules for whoever runs this plan

These come from Todd's standing instructions. They override the skill's defaults.

1. **Work only in this worktree:** `/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046`, on its branch `claude/trip-map-live-598046`, at `92e811e` or later. `~/Dev/Crewluv` is shared with other sessions: only read it.
2. **Never commit without Todd's yes in the conversation,** and then only the task's own files, by path. **Never push, and never merge into `main`,** but in Task 5, on Todd's yes then.
3. **The tests:** the session runs them as it works. At the checkpoint (Task 2, Step 5), Todd runs the command himself.
4. **The shared cases are the judge.** `tests/fixtures/trip-map/replay-cases.json` is the app's, never edited: Task 2 copies it whole from `5833945`. If a case fails, the code is wrong. If you believe a case is wrong, STOP and tell Todd.
5. **Copy the code as written.** A replacement is exact: its text is in the file once. If it isn't, stop.
6. **Nothing here calls Crewlu Cloud or adsb.lol.** Change nothing in Crewlu Cloud's live Supabase project.
7. **Unchanged:** the door and its guard, no `innerHTML`, no download, no `npm install`.
8. **A clock time in a test is the viewer's zone's, never the Mac's:** GitHub's build runs in UTC. Step 4 runs the suite in UTC too.
9. **Reviewers:** `superpowers:code-reviewer` with `model: "sonnet"`.

## File map

| File | Task | Responsibility |
|---|---|---|
| `tests/fixtures/trip-map/replay-cases.json` | copy (2) | the app's shared cases at `5833945` |
| `src/map/replayClock.ts` | modify (2) | `REPLAY_BASE_RATE` 900, `LEG_MIN_REPLAY` 6 s, and their words |
| `tests/map/replayClock.test.ts`, `tests/map/replayQuickLayovers.test.ts`, `tests/map/timelineBlocks.test.ts`, `tests/ui/TripMapPage.test.tsx` | modify (2) | the pace's tests, worked out again |

---

### Task 1: Before starting

- [x] **Step 1: Check the worktree and the branch, and the app's commit.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git status --short && git branch --show-current && git log --oneline -1 && git -C ~/Dev/Crewluv cat-file -t 5833945
```

Expected:
- Nothing changed but this plan's file.
- The branch `claude/trip-map-live-598046`.
- `92e811e`, or a later commit of this plan's.
- `commit`.

---

### Task 2: The replay at half its pace, with the app's shared cases

The app's new pace (`5833945`, Todd's "The flying only"): `REPLAY_BASE_RATE` 900, a day in 96 s at 1×, half CrewLu's, and `LEG_MIN_REPLAY` 6 s, in `src/map/replayClock.ts`. `WAIT_MIN_REPLAY` (3 s) and `QUICK_WAIT_RATE` (a day a second) stay, so with Quick layovers on a wait plays as quickly as before, and never slower than the base rate; with them off, waits play at the base rate and halve too. The labels stay 1×, 2×, 5× and 10×. The shared cases come first, copied whole from the app. The website's own tests of the pace are worked out again at the new one: the replay clock's short legs, Quick layovers' Europe trip (118 s, or 288 s with them off), the timeline's blocks and the full map's timeline. A test also holds a new speed picked while a replay plays, which the app's picker once lost.

**Files:**
- Modify: `src/map/replayClock.ts`
- Copy from the app: `tests/fixtures/trip-map/replay-cases.json`
- Test: `tests/map/replayClock.test.ts`, `tests/map/replayQuickLayovers.test.ts`, `tests/map/timelineBlocks.test.ts`, `tests/ui/TripMapPage.test.tsx`

- [x] **Step 1: Copy the shared cases, and write the tests.**

**Copy `tests/fixtures/trip-map/replay-cases.json` whole from the app's commit `5833945`:**

```bash
git -C ~/Dev/Crewluv show 5833945:CrewluvTests/Fixtures/TripMap/replay-cases.json > tests/fixtures/trip-map/replay-cases.json
shasum -a 256 tests/fixtures/trip-map/replay-cases.json
```

Expected checksum: `90691d4a0502296fcffeade589b2ab63daa924e31616bff47a982d7a439f46b8`. Don't edit the file.

**In `tests/map/replayClock.test.ts`, replace (1 of 11):**

```ts

  it("plays from the trip's start at a day in 48 seconds, and faster at 10x without jumping", () => {
    const playing = play(liveClock(SPAN), NOW)
    expect(clockTime(playing, NOW + 48 * S)).toBe(SPAN.start + 86_400_000)
    const later = NOW + 10 * S
```

**with:**

```ts

  it("plays from the trip's start at a day in 96 seconds, and faster at 10x without jumping", () => {
    const playing = play(liveClock(SPAN), NOW)
    expect(clockTime(playing, NOW + 96 * S)).toBe(SPAN.start + 86_400_000)
    const later = NOW + 10 * S
```

**In `tests/map/replayClock.test.ts`, replace (2 of 11):**

```ts
    expect(clockTime(faster, later)).toBe(clockTime(playing, later))
    expect(clockTime(faster, later + S)).toBe(clockTime(playing, later) + 18_000 * S)
  })
```

**with:**

```ts
    expect(clockTime(faster, later)).toBe(clockTime(playing, later))
    expect(clockTime(faster, later + S)).toBe(clockTime(playing, later) + 9_000 * S)
  })
```

**In `tests/map/replayClock.test.ts`, replace (3 of 11):**

```ts
    const paused = pause(play(liveClock(SPAN), NOW), NOW + 5 * S)
    expect(clockTime(paused, NOW + 60 * S)).toBe(SPAN.start + 5 * 1800 * S)
    expect(isLive(goLive(paused))).toBe(true)
```

**with:**

```ts
    const paused = pause(play(liveClock(SPAN), NOW), NOW + 5 * S)
    expect(clockTime(paused, NOW + 60 * S)).toBe(SPAN.start + 5 * 900 * S)
    expect(isLive(goLive(paused))).toBe(true)
```

**In `tests/map/replayClock.test.ts`, replace (4 of 11):**

```ts

describe('short legs take at least 3 seconds at 1x (replay design, 2026-11-13)', () => {
  const MIN = 60_000
  const T0 = 1_800_000_000_000
  // A 25-minute drive, a 30-minute gap, a 50-minute hop, an hour's gap and an 8-hour flight. At 1x: 3 s, 1 s, 3 s, 2 s, 16 s.
  const LEGS = [
```

**with:**

```ts

describe('short legs take at least 6 seconds at 1x (replay design, 2026-11-13; 6 s since 17 Nov 2026)', () => {
  const MIN = 60_000
  const T0 = 1_800_000_000_000
  // A 25-minute drive, a 30-minute gap, a 50-minute hop, an hour's gap and an 8-hour flight. At 1x: 6 s, 2 s, 6 s, 4 s, 32 s.
  const LEGS = [
```

**In `tests/map/replayClock.test.ts`, replace (5 of 11):**

```ts

  it('slows a 25-minute drive to 3 s at 1x, and half that at 2x', () => {
    expect(clockTime(playing(), NOW + 1.5 * S)).toBe(T0 + 12.5 * MIN)
    expect(clockTime(playing(), NOW + 3 * S)).toBe(T0 + 25 * MIN)
    expect(clockTime(setSpeed(playing(), 2, NOW), NOW + 1.5 * S)).toBe(T0 + 25 * MIN)
  })

  it('slows a 50-minute flight to 3 s too, and plays the gaps between legs at a day in 48 s', () => {
    expect(clockTime(playing(), NOW + 4 * S)).toBe(T0 + 55 * MIN)
    expect(clockTime(playing(), NOW + 7 * S)).toBe(T0 + 105 * MIN)
    expect(clockTime(playing(), NOW + 9 * S)).toBe(T0 + 165 * MIN)
  })
```

**with:**

```ts

  it('slows a 25-minute drive to 6 s at 1x, and half that at 2x', () => {
    expect(clockTime(playing(), NOW + 3 * S)).toBe(T0 + 12.5 * MIN)
    expect(clockTime(playing(), NOW + 6 * S)).toBe(T0 + 25 * MIN)
    expect(clockTime(setSpeed(playing(), 2, NOW), NOW + 3 * S)).toBe(T0 + 25 * MIN)
  })

  it('slows a 50-minute flight to 6 s too, and plays the gaps between legs at a day in 96 s', () => {
    expect(clockTime(playing(), NOW + 8 * S)).toBe(T0 + 55 * MIN)
    expect(clockTime(playing(), NOW + 14 * S)).toBe(T0 + 105 * MIN)
    expect(clockTime(playing(), NOW + 18 * S)).toBe(T0 + 165 * MIN)
  })
```

**In `tests/map/replayClock.test.ts`, replace (6 of 11):**

```ts
  it('plays a leg of 90 minutes or more as before', () => {
    expect(clockTime(playing(), NOW + 17 * S)).toBe(T0 + 405 * MIN)
    expect(clockTime(playing(), NOW + 25 * S)).toBe(TRIP.end)
  })
```

**with:**

```ts
  it('plays a leg of 90 minutes or more as before', () => {
    expect(clockTime(playing(), NOW + 34 * S)).toBe(T0 + 405 * MIN)
    expect(clockTime(playing(), NOW + 50 * S)).toBe(TRIP.end)
  })
```

**In `tests/map/replayClock.test.ts`, replace (7 of 11):**

```ts
    const end = finishesAt(playing())!
    expect(end).toBe(NOW + 25 * S)
    expect(hasFinished(playing(), end - 1)).toBe(false)
    expect(hasFinished(playing(), end)).toBe(true)
    expect(finishesAt(setSpeed(playing(), 2, NOW))).toBe(NOW + 12.5 * S)
  })
```

**with:**

```ts
    const end = finishesAt(playing())!
    expect(end).toBe(NOW + 50 * S)
    expect(hasFinished(playing(), end - 1)).toBe(false)
    expect(hasFinished(playing(), end)).toBe(true)
    expect(finishesAt(setSpeed(playing(), 2, NOW))).toBe(NOW + 25 * S)
  })
```

**In `tests/map/replayClock.test.ts`, replace (8 of 11):**

```ts
  it('keeps the moment when paused or sped up in the middle of a slowed leg', () => {
    expect(clockTime(pause(playing(), NOW + 1.5 * S), NOW + 60 * S)).toBe(T0 + 12.5 * MIN)
    const faster = setSpeed(playing(), 5, NOW + 1.5 * S)
    expect(clockTime(faster, NOW + 1.5 * S)).toBe(T0 + 12.5 * MIN)
    expect(clockTime(faster, NOW + 1.8 * S)).toBe(T0 + 25 * MIN)
  })

  it('takes only the rest of the 3 s when played from partway through a slowed leg', () => {
    const fromMiddle = play(scrub(liveClock(TRIP, LEGS), T0 + 12.5 * MIN), NOW)
    expect(clockTime(fromMiddle, NOW + 1.5 * S)).toBe(T0 + 25 * MIN)
  })
```

**with:**

```ts
  it('keeps the moment when paused or sped up in the middle of a slowed leg', () => {
    expect(clockTime(pause(playing(), NOW + 3 * S), NOW + 60 * S)).toBe(T0 + 12.5 * MIN)
    const faster = setSpeed(playing(), 5, NOW + 3 * S)
    expect(clockTime(faster, NOW + 3 * S)).toBe(T0 + 12.5 * MIN)
    expect(clockTime(faster, NOW + 3.6 * S)).toBe(T0 + 25 * MIN)
  })

  it('takes only the rest of the 6 s when played from partway through a slowed leg', () => {
    const fromMiddle = play(scrub(liveClock(TRIP, LEGS), T0 + 12.5 * MIN), NOW)
    expect(clockTime(fromMiddle, NOW + 3 * S)).toBe(T0 + 25 * MIN)
  })
```

**In `tests/map/replayClock.test.ts`, replace (9 of 11):**

```ts
  it('takes the slower rate while two overlapping legs move', () => {
    // An hour's leg (3 s would be 1200x) with a 15-minute one inside it (300x): 1.5 s, then 3 s, then 0.75 s.
    const overlapping = play(liveClock({ start: T0, end: T0 + 60 * MIN }, [
```

**with:**

```ts
  it('takes the slower rate while two overlapping legs move', () => {
    // An hour's leg (6 s would be 600x) with a 15-minute one inside it (150x): 3 s, then 6 s, then 1.5 s.
    const overlapping = play(liveClock({ start: T0, end: T0 + 60 * MIN }, [
```

**In `tests/map/replayClock.test.ts`, replace (10 of 11):**

```ts
    ]), NOW)
    expect(clockTime(overlapping, NOW + 1.5 * S)).toBe(T0 + 30 * MIN)
    expect(clockTime(overlapping, NOW + 4.5 * S)).toBe(T0 + 45 * MIN)
    expect(finishesAt(overlapping)).toBe(NOW + 5.25 * S)
  })
```

**with:**

```ts
    ]), NOW)
    expect(clockTime(overlapping, NOW + 3 * S)).toBe(T0 + 30 * MIN)
    expect(clockTime(overlapping, NOW + 9 * S)).toBe(T0 + 45 * MIN)
    expect(finishesAt(overlapping)).toBe(NOW + 10.5 * S)
  })
```

**In `tests/map/replayClock.test.ts`, replace (11 of 11):**

```ts
    const withEmpty = play(liveClock(TRIP, [...LEGS, { start: T0 + 40 * MIN, end: T0 + 40 * MIN }]), NOW)
    expect(clockTime(withEmpty, NOW + 4 * S)).toBe(T0 + 55 * MIN)
    expect(finishesAt(withEmpty)).toBe(NOW + 25 * S)
  })
```

**with:**

```ts
    const withEmpty = play(liveClock(TRIP, [...LEGS, { start: T0 + 40 * MIN, end: T0 + 40 * MIN }]), NOW)
    expect(clockTime(withEmpty, NOW + 8 * S)).toBe(T0 + 55 * MIN)
    expect(finishesAt(withEmpty)).toBe(NOW + 50 * S)
  })
```

**In `tests/map/replayQuickLayovers.test.ts`, replace (1 of 6):**

```ts
  // The Europe trip: legs of 8, 6 and 14 hours, with a 24-hour and a 20-hour wait. At 1x with Quick layovers on that's
  // 16 s, 3 s, 12 s, 3 s and 28 s: 62 s. With it off, 144 s.
  const span = { start: at(0), end: at(72) }
```

**with:**

```ts
  // The Europe trip: legs of 8, 6 and 14 hours, with a 24-hour and a 20-hour wait. At 1x with Quick layovers on that's
  // 32 s, 3 s, 24 s, 3 s and 56 s: 118 s. With it off, 288 s.
  const span = { start: at(0), end: at(72) }
```

**In `tests/map/replayQuickLayovers.test.ts`, replace (2 of 6):**

```ts
    expect(liveClock(span, legs).quickLayovers).toBe(false)
    expect(replayDuration(liveClock(span, legs, waits))).toBe(144_000)
  })
```

**with:**

```ts
    expect(liveClock(span, legs).quickLayovers).toBe(false)
    expect(replayDuration(liveClock(span, legs, waits))).toBe(288_000)
  })
```

**In `tests/map/replayQuickLayovers.test.ts`, replace (3 of 6):**

```ts
  it('measures the whole replay at each pace', () => {
    expect(replayDuration(quick)).toBe(62_000)
    expect(replayDuration({ ...quick, quickLayovers: false })).toBe(144_000)
  })
```

**with:**

```ts
  it('measures the whole replay at each pace', () => {
    expect(replayDuration(quick)).toBe(118_000)
    expect(replayDuration({ ...quick, quickLayovers: false })).toBe(288_000)
  })
```

**In `tests/map/replayQuickLayovers.test.ts`, replace (4 of 6):**

```ts
  it('keeps the moment when switched during a replay, and carries on from there at the new pace', () => {
    const switched = setQuickLayovers(play(quick, 0), false, 17_500)
    expect(switched.quickLayovers).toBe(false)
    expect(clockTime(switched, 17_500)).toBe(at(20))
    // A second at a day in 48 s is half an hour.
    expect(clockTime(switched, 18_500)).toBe(at(20.5))
  })
```

**with:**

```ts
  it('keeps the moment when switched during a replay, and carries on from there at the new pace', () => {
    // 33.5 s in: the 32 s flight, then half of the day in Cologne, which plays in 3 s.
    const switched = setQuickLayovers(play(quick, 0), false, 33_500)
    expect(switched.quickLayovers).toBe(false)
    expect(clockTime(switched, 33_500)).toBe(at(20))
    // A second at a day in 96 s is a quarter of an hour.
    expect(clockTime(switched, 34_500)).toBe(at(20.25))
  })
```

**In `tests/map/replayQuickLayovers.test.ts`, replace (5 of 6):**

```ts
  it('turns a moment into replay time and back, held to the trip', () => {
    expect(replayOffset(quick, at(20))).toBe(17_500)
    expect(tripTimeAtOffset(quick, 17_500)).toBe(at(20))
    expect(tripTimeAtOffset(quick, -5)).toBe(at(0))
    expect(tripTimeAtOffset(quick, 99_000)).toBe(at(72))
  })
```

**with:**

```ts
  it('turns a moment into replay time and back, held to the trip', () => {
    expect(replayOffset(quick, at(20))).toBe(33_500)
    expect(tripTimeAtOffset(quick, 33_500)).toBe(at(20))
    expect(tripTimeAtOffset(quick, -5)).toBe(at(0))
    expect(tripTimeAtOffset(quick, 199_000)).toBe(at(72))
  })
```

**In `tests/map/replayQuickLayovers.test.ts`, replace (6 of 6):**

```ts
  it('places a moment along the bar, 0 to 1, held to its ends', () => {
    expect(progressAt(quick, at(8))).toBeCloseTo(16 / 62, 12)
    expect(progressAt(quick, at(-5))).toBe(0)
```

**with:**

```ts
  it('places a moment along the bar, 0 to 1, held to its ends', () => {
    expect(progressAt(quick, at(8))).toBeCloseTo(32 / 118, 12)
    expect(progressAt(quick, at(-5))).toBe(0)
```

**In `tests/map/timelineBlocks.test.ts`, replace (1 of 2):**

```ts
    expect(timelineBlocks(europe, clockFor(europe, true))).toEqual([
      { kind: 'flying', start: 0, end: 16 / 62, label: null },
      { kind: 'layover', start: 16 / 62, end: 19 / 62, label: '24h' },
      { kind: 'flying', start: 19 / 62, end: 31 / 62, label: null },
      { kind: 'layover', start: 31 / 62, end: 34 / 62, label: '20h' },
      { kind: 'flying', start: 34 / 62, end: 1, label: null },
    ])
```

**with:**

```ts
    expect(timelineBlocks(europe, clockFor(europe, true))).toEqual([
      { kind: 'flying', start: 0, end: 32 / 118, label: null },
      { kind: 'layover', start: 32 / 118, end: 35 / 118, label: '24h' },
      { kind: 'flying', start: 35 / 118, end: 59 / 118, label: null },
      { kind: 'layover', start: 59 / 118, end: 62 / 118, label: '20h' },
      { kind: 'flying', start: 62 / 118, end: 1, label: null },
    ])
```

**In `tests/map/timelineBlocks.test.ts`, replace (2 of 2):**

```ts
  it('give the layovers their full share with Quick layovers off', () => {
    // 144 s in all: each edge is its replay seconds over 144.
    expect(timelineBlocks(europe, clockFor(europe, false)).map((b) => [b.kind, b.start, b.end])).toEqual([
      ['flying', 0, 16 / 144], ['layover', 16 / 144, 64 / 144], ['flying', 64 / 144, 76 / 144], ['layover', 76 / 144, 116 / 144], ['flying', 116 / 144, 1],
    ])
```

**with:**

```ts
  it('give the layovers their full share with Quick layovers off', () => {
    // 288 s in all: each edge is its replay seconds over 288.
    expect(timelineBlocks(europe, clockFor(europe, false)).map((b) => [b.kind, b.start, b.end])).toEqual([
      ['flying', 0, 32 / 288], ['layover', 32 / 288, 128 / 288], ['flying', 128 / 288, 152 / 288], ['layover', 152 / 288, 232 / 288], ['flying', 232 / 288, 1],
    ])
```

**In `tests/ui/TripMapPage.test.tsx`, replace (1 of 8):**

```tsx
    expect(Number(slider.min)).toBe(0)
    // The Europe trip with Quick layovers: 62 s at 1x.
    expect(Number(slider.max)).toBe(62_000)
    expect(slider.step).toBe('any')
```

**with:**

```tsx
    expect(Number(slider.min)).toBe(0)
    // The Europe trip with Quick layovers: 118 s at 1x.
    expect(Number(slider.max)).toBe(118_000)
    expect(slider.step).toBe('any')
```

**In `tests/ui/TripMapPage.test.tsx`, replace (2 of 8):**

```tsx

  it('slows a short drive so it takes 3 seconds at 1x (replay design, 2026-11-13)', () => {
    vi.useFakeTimers({ toFake: ['Date', 'requestAnimationFrame', 'cancelAnimationFrame'] })
```

**with:**

```tsx

  it('slows a short drive so it takes 6 seconds at 1x (replay design, 2026-11-13; 6 s since 17 Nov 2026)', () => {
    vi.useFakeTimers({ toFake: ['Date', 'requestAnimationFrame', 'cancelAnimationFrame'] })
```

**In `tests/ui/TripMapPage.test.tsx`, replace (3 of 8):**

```tsx
      act(() => {
        vi.advanceTimersByTime(1500)
      })
      // About halfway through the 3 s drive after 1.5 s: some 15 minutes in, at 7:15 AM. At a day in 48 s it would be
      // 45 minutes in, past the drive. (The slider measures replay time, which passes alike at either pace, so the trip
```

**with:**

```tsx
      act(() => {
        vi.advanceTimersByTime(3000)
      })
      // About halfway through the 6 s drive after 3 s: some 15 minutes in, at 7:15 AM. At a day in 96 s it would be
      // 45 minutes in, past the drive. (The slider measures replay time, which passes alike at either pace, so the trip
```

**In `tests/ui/TripMapPage.test.tsx`, replace (4 of 8):**

```tsx
    expect(line()).toMatch(/^Fri 7:00\sPM · Layover in Cologne$/)
    // 16.5 s into the 62 s replay, less 6.2 s: 10.3 s into the first flight, at a day in 48 s 5 h 9 min after 7:00 AM.
    fireEvent.keyDown(slider, { key: 'PageDown' })
    expect(line()).toMatch(/^Fri 12:09\sPM · Flying to Cologne$/)
  })
```

**with:**

```tsx
    expect(line()).toMatch(/^Fri 7:00\sPM · Layover in Cologne$/)
    // 32.5 s into the 118 s replay, less 11.8 s: 20.7 s into the first flight, at a day in 96 s 5 h 10½ min after 7:00 AM.
    fireEvent.keyDown(slider, { key: 'PageDown' })
    expect(line()).toMatch(/^Fri 12:10\sPM · Flying to Cologne$/)
  })
```

**In `tests/ui/TripMapPage.test.tsx`, replace (5 of 8):**

```tsx
      const line = () => document.querySelector('.trip-timeline-time')!.textContent
      // 17.5 s in with Quick layovers: 16 s for the flight, then half of the day in Cologne, which plays in 3 s.
      act(() => {
        vi.advanceTimersByTime(17_500)
      })
```

**with:**

```tsx
      const line = () => document.querySelector('.trip-timeline-time')!.textContent
      // 33.5 s in with Quick layovers: 32 s for the flight, then half of the day in Cologne, which plays in 3 s.
      act(() => {
        vi.advanceTimersByTime(33_500)
      })
```

**In `tests/ui/TripMapPage.test.tsx`, replace (6 of 8):**

```tsx
      fireEvent.click(screen.getByRole('switch', { name: 'Quick layovers' }))
      // A second on at a day in 48 s is half an hour, from 3:00 AM. A quick second would be 8 hours.
      act(() => {
```

**with:**

```tsx
      fireEvent.click(screen.getByRole('switch', { name: 'Quick layovers' }))
      // A second on at a day in 96 s is a quarter of an hour, from 3:00 AM. A quick second would be 8 hours.
      act(() => {
```

**In `tests/ui/TripMapPage.test.tsx`, replace (7 of 8):**

```tsx
      })
      expect(line()).toMatch(/^Sat 3:[23]\d\sAM · Layover in Cologne$/)
    } finally {
```

**with:**

```tsx
      })
      expect(line()).toMatch(/^Sat 3:1\d\sAM · Layover in Cologne$/)
    } finally {
      vi.useRealTimers()
    }
  })

  it('takes a new speed while a replay plays, and keeps it as the frames go on (the app lost such taps, 17 Nov 2026)', () => {
    vi.useFakeTimers({ toFake: ['Date', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    try {
      vi.setSystemTime(at(100))
      page()
      fireEvent.click(screen.getByRole('button', { name: 'Replay the trip' }))
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      const speed = screen.getByRole('combobox', { name: 'Replay speed' }) as HTMLSelectElement
      fireEvent.change(speed, { target: { value: '5' } })
      const line = () => document.querySelector('.trip-timeline-time')!.textContent
      act(() => {
        vi.advanceTimersByTime(100)
      })
      const before = line()
      // Two seconds at 5x in the first flight is 2.5 hours; at 1x it would be half an hour.
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(speed.value).toBe('5')
      expect(line()).not.toBe(before)
      expect(line()).toMatch(/^Fri (9|10):\d\d\sAM · Flying to Cologne$/)
    } finally {
```

**In `tests/ui/TripMapPage.test.tsx`, replace (8 of 8):**

```tsx
    expect(document.querySelector('.trip-timeline-time')!.textContent).toBe(line)
    expect(Number((screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement).max)).toBe(144_000)
  })
```

**with:**

```tsx
    expect(document.querySelector('.trip-timeline-time')!.textContent).toBe(line)
    expect(Number((screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement).max)).toBe(288_000)
  })
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/map/replayClock.test.ts tests/map/replayQuickLayovers.test.ts tests/map/timelineBlocks.test.ts tests/ui/TripMapPage.test.tsx
```

Expected: 31 of the 70 tests fail, in all four files, because the code still plays a day in 48 s and a leg in 3 s. Nine are the shared cases: their constants, and all 8 cases. Ten are the replay clock's, of a day in 96 s and legs of 6 s. Five are Quick layovers' Europe trip, at 118 s and 288 s, and one the timeline's blocks. Six are the full map's: the slider's length, the 6 s drive, Page Down, Quick layovers switched off during a replay and its slower bar, and 5× picked during a replay, where 2 s at 5× of the old pace runs past the flight's hours. The rest pass already, as they should: what doesn't hang on the pace, as the end of a replay, the rounding of its end, and the wait labels.

- [x] **Step 3: Write the code.**

**In `src/map/replayClock.ts`, replace (1 of 3):**

```ts
 * The full-screen map's time (moving map spec §6), as the app's TripReplayClock: now, a moment dragged to, or a replay
 * at 1x to 10x. A value the page keeps in state and reads on each frame, so nothing changes per frame. A leg in motion
 * that would pass in under 3 s at 1x slows so it takes 3 s (docs/superpowers/specs/2026-11-13-replay-short-legs-design.md).
 * With Quick layovers on, a wait on the ground takes a second a day, never under 3 s and never slower than a day in 48 s,
 * and the clock places any moment along the timeline in replay time (the app's activity markers design §3.2, §4.3).
```

**with:**

```ts
 * The full-screen map's time (moving map spec §6), as the app's TripReplayClock: now, a moment dragged to, or a replay
 * at 1x to 10x. A value the page keeps in state and reads on each frame, so nothing changes per frame. The pace is a day
 * in 96 s at 1x, half CrewLu's, since 17 Nov 2026. A leg in motion that would pass in under 6 s at 1x slows so it takes
 * 6 s (docs/superpowers/specs/2026-11-13-replay-short-legs-design.md). With Quick layovers on, a wait on the ground takes
 * a second a day, never under 3 s and never slower than a day in 96 s,
 * and the clock places any moment along the timeline in replay time (the app's activity markers design §3.2, §4.3).
```

**In `src/map/replayClock.ts`, replace (2 of 3):**

```ts

/** Trip time per replay time at 1x: a day in 48 seconds, as on CrewLu's moving map. */
export const REPLAY_BASE_RATE = 1800

/** The least real time, in ms at 1x, that a leg in motion takes, so a drive to work can be seen. */
export const LEG_MIN_REPLAY = 3000

```

**with:**

```ts

/**
 * Trip time per replay time at 1x: a day in 96 seconds, half CrewLu's moving map's pace, so a short flight such as
 * Louisville to Cleveland can be followed (Todd, 17 Nov 2026; the app's, and the shared cases').
 */
export const REPLAY_BASE_RATE = 900

/** The least real time, in ms at 1x, that a leg in motion takes, so a drive to work can be seen: 6 s, as the app's. */
export const LEG_MIN_REPLAY = 6000

```

**In `src/map/replayClock.ts`, replace (3 of 3):**

```ts
/**
 * A wait of `length` plays in min(length / 1,800, max(3 s, length / 86,400)) at 1x: a second a day, never under 3 s,
 * and never slower than the normal rate. As a rate, that's its length over that time.
```

**with:**

```ts
/**
 * A wait of `length` plays in min(length / 900, max(3 s, length / 86,400)) at 1x: a second a day, never under 3 s,
 * and never slower than the normal rate. As a rate, that's its length over that time.
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 70 tests pass. Then `npx tsc --noEmit`: nothing; `npm test`: 183 test files and 3,905 tests pass, and the same with `TZ=UTC npm test`, as GitHub's build runs; and `npm run build` ends `✓ built`. Last, the shared cases:

```bash
git diff --name-only 92e811e -- tests/fixtures/trip-map && shasum -a 256 tests/fixtures/trip-map/replay-cases.json
```

Expected: `tests/fixtures/trip-map/replay-cases.json` alone, Task 2's copy, and the checksum of Task 2's Step 1. No other step changes them.

- [x] **Step 5: The checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && TZ=UTC npm test && npm run build
```

Expected: 183 test files and 3,905 tests pass, twice (in this Mac's time zone, then in UTC as GitHub's build runs), and the build ends `✓ built`.

- [x] **Step 6: Commit, on Todd's yes.** Only these files, by path:

```bash
git add src/map/replayClock.ts tests/fixtures/trip-map/replay-cases.json tests/map/replayClock.test.ts tests/map/replayQuickLayovers.test.ts tests/map/timelineBlocks.test.ts tests/ui/TripMapPage.test.tsx
git commit -m "The replay at half its pace, a day in 96 s and a leg never under 6 s, with Quick layovers' waits as quick as before, and the app's shared replay cases (Todd, 17 Nov 2026)"
```

---

### Task 3: Todd looks at the pace

- [x] **Step 1:** The session starts the `crewluve-mapkit` server (port 5182) and gives Todd `http://localhost:5182/?demo=1&scene=live-ahead#map`.
- [x] **Step 2: Todd plays a replay at 1× and at 10×.** The flight from Louisville to Rockford, about an hour, takes 6 s at 1×, where it took 3 s. The labels are unchanged, and Quick layovers' waits are as quick as before.
- [x] **Step 3:** Anything wrong goes in "Changes made during execution", and is fixed with a test.

---

### Task 4: The review, and the record

- [x] **Step 1: The review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Task 2's commit, against the app's `5833945`. Make its fixes, tests first.
- [x] **Step 2: Todd runs everything once more,** if the review changed anything. The fix is committed on his yes, by path.
- [x] **Step 3: This plan's record,** under "Changes made during execution".
- [x] **Step 4: Commit, on Todd's yes.**

```bash
git add docs/superpowers/plans/2026-11-17-website-replay-pace.md
git commit -m "The website's replay pace plan, with its record"
```

---

### Task 5: Going live, on Todd's yes

- [x] **Step 1: Ask Todd** whether to go live now.
- [x] **Step 2:** `git fetch origin && git merge-base --is-ancestor origin/main HEAD && echo "fast-forward"`. If it isn't a fast-forward, STOP and tell Todd.
- [x] **Step 3:** `TZ=UTC npx vitest run`: everything passes.
- [x] **Step 4: Todd runs everything** (Task 2 Step 5's command).
- [x] **Step 5: Push on Todd's yes,** a fast-forward only: `git push origin claude/trip-map-live-598046:main`. This also takes the follow the plane plan's record, `92e811e`, live.
- [x] **Step 6: Watch the deploy** until it succeeds; if it fails, tell Todd at once with its log.
- [x] **Step 7: Look at the live site** with Todd: a replay at 1× in `…scene=live-ahead#map`.
- [x] **Step 8: The record,** committed and pushed the same way.

---

## Changes made during execution

- **Task 2** was run in session `68f03a67` on 17 Nov 2026, from this plan's own text: tests first (31 of 70 failed, as written), every file the same as tested.
  - Todd's run passed 3,905 tests at 10:01 PM EST and again in UTC, and built.
  - Commit `4c01449`, on his "Run it, commit, go live".
- **Task 3, Todd's look:** "Good: go live", at 1× and 10× in `live-ahead`.
- **Task 4, the review** (`superpowers:code-reviewer`, sonnet) of `4c01449`, against the app's `5833945`:
  - It found nothing Critical or Important. It confirmed the constants, the shared cases (byte for byte), and the reworked arithmetic, recomputed.
  - It confirmed that the new speed test fails if the speed doesn't stick.
  - **One minor:** `pace()`'s comment still said "a leg's length over 3 s". It now says 6 s. That's comment only, committed with this record.
- **Task 5, gone live** on Todd's "Run it, commit, go live" and "Good: go live":
  - The branch was a fast-forward of `main`, and `TZ=UTC npx vitest run` passed 3,905 tests.
  - Todd's run passed 3,905 tests at 10:04 PM EST and again in UTC, and built.
  - Pushed `d45b2af..4d9458c`, with the follow the plane plan's record.
  - **Deployed:** run `44227897694`, succeeded, 10:06 PM EST.
  - The live site serves the build Todd's run made (`index-DaONf-Gz.js`), with the speeds still 1×, 2×, 5× and 10×.

## Self-review

- **The rule covered:** the base rate and the leg minimum, the waits as before, the labels unchanged, and the shared cases copied whole (Task 2).
- **Placeholders:** none.
- **What could it break?** Every replay plays its flights and drives twice as long. Quick waits are as before; with Quick layovers off, waits halve too. Nothing else reads the pace.
