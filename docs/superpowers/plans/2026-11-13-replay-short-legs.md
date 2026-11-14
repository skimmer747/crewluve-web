# The Replay's Short Legs: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the full map, a drive or flight that would pass in under 3 s at 1x slows so it takes 3 s, as `docs/superpowers/specs/2026-11-13-replay-short-legs-design.md` sets out.

**Architecture:** The replay clock (`src/map/replayClock.ts`) gains the trip's legs. A pace built from them cuts the span at every leg's start and end, and gives each piece a rate: the normal one (a day in 48 s), or the slowest of the legs moving there. `clockTime` and `finishesAt` go through the pace. `TripMapPage` keeps the clock's legs following the map, as it already does for the span.

**Tech Stack:** Preact 10, TypeScript 5.9 (lib ES2020), Vitest 3 with happy-dom and @testing-library/preact.

---

## Ground rules

- **Branch:** `trip-map-facts`. Never push `main`: a push to `main` publishes the live site.
- **Commits:** only with Todd's yes, every time, and each commit takes only its own files.
- **`src/ui/TripMapPage.tsx`** already has an uncommitted line from Stage 2B's Task 24: the panel's `aria-label`. Task 2's commit must not take it (Task 2, Step 6 shows how).
- **Leave alone:** the untracked `docs/superpowers/plans/2026-10-26-partner-links-piece2-release.md`, and the uncommitted `README.md` and `docs/superpowers/plans/2026-11-13-moving-map-stage2b-website.md` (Stage 2B's Task 24).
- **Checks:** `npm test` and `npm run build`.
- **The Crewluv repo:** never edit it. The app's half (spec §5) is for the session working there.

## Files

- Modify: `src/map/replayClock.ts`: the legs on the clock, the pace, and `clockTime` and `finishesAt` through it.
- Modify: `tests/map/replayClock.test.ts`: the pace's tests (spec §6).
- Modify: `src/ui/TripMapPage.tsx:41-42`: the clock's legs follow the map.
- Modify: `tests/ui/TripMapPage.test.tsx`: a short drive plays slowly on the page.

---

### Task 1: The pace

**Files:**
- Modify: `src/map/replayClock.ts`
- Test: `tests/map/replayClock.test.ts`

- [ ] **Step 1: Write the failing tests**

The import line in `tests/map/replayClock.test.ts` stays as it is: no new names are needed. Add this block at the end of the file:

```ts
describe('short legs take at least 3 seconds at 1x (replay design, 2026-11-13)', () => {
  const MIN = 60_000
  const T0 = 1_800_000_000_000
  // A 25-minute drive, a 30-minute gap, a 50-minute hop, an hour's gap and an 8-hour flight. At 1x: 3 s, 1 s, 3 s, 2 s, 16 s.
  const LEGS = [
    { start: T0, end: T0 + 25 * MIN },
    { start: T0 + 55 * MIN, end: T0 + 105 * MIN },
    { start: T0 + 165 * MIN, end: T0 + 645 * MIN },
  ]
  const TRIP = { start: T0, end: T0 + 645 * MIN }
  const playing = () => play(liveClock(TRIP, LEGS), NOW)

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

  it('plays a leg of 90 minutes or more as before', () => {
    expect(clockTime(playing(), NOW + 17 * S)).toBe(T0 + 405 * MIN)
    expect(clockTime(playing(), NOW + 25 * S)).toBe(TRIP.end)
  })

  it('knows when the slowed replay reaches the end, at any speed', () => {
    const end = finishesAt(playing())!
    expect(end).toBe(NOW + 25 * S)
    expect(hasFinished(playing(), end - 1)).toBe(false)
    expect(hasFinished(playing(), end)).toBe(true)
    expect(finishesAt(setSpeed(playing(), 2, NOW))).toBe(NOW + 12.5 * S)
  })

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

  it('takes the slower rate while two overlapping legs move', () => {
    // An hour's leg (3 s would be 1200x) with a 15-minute one inside it (300x): 1.5 s, then 3 s, then 0.75 s.
    const overlapping = play(liveClock({ start: T0, end: T0 + 60 * MIN }, [
      { start: T0, end: T0 + 60 * MIN },
      { start: T0 + 30 * MIN, end: T0 + 45 * MIN },
    ]), NOW)
    expect(clockTime(overlapping, NOW + 1.5 * S)).toBe(T0 + 30 * MIN)
    expect(clockTime(overlapping, NOW + 4.5 * S)).toBe(T0 + 45 * MIN)
    expect(finishesAt(overlapping)).toBe(NOW + 5.25 * S)
  })

  it('gives a leg with no length no time', () => {
    const withEmpty = play(liveClock(TRIP, [...LEGS, { start: T0 + 40 * MIN, end: T0 + 40 * MIN }]), NOW)
    expect(clockTime(withEmpty, NOW + 4 * S)).toBe(T0 + 55 * MIN)
    expect(finishesAt(withEmpty)).toBe(NOW + 25 * S)
  })
})
```

`NOW` and `S` are the file's own constants (`NOW = 1_800_050_000_000`, `S = 1000`). The numbers are chosen so every rate and every expected time is a whole number of milliseconds:
- the drive's rate is 1,500,000 / 3,000 = 500;
- the hop's is 1,000;
- the 8-hour flight keeps 1,800.

- [ ] **Step 2: Run the tests and see them fail**

Run: `npx vitest run tests/map/replayClock.test.ts`

Expected: the new tests FAIL. Vitest doesn't check types, and today's `liveClock` ignores the legs. For example, the first one gets `T0 + 45 * MIN` (1,500 ms at 1,800x) instead of `T0 + 12.5 * MIN`. The six old tests PASS.

- [ ] **Step 3: Write the pace**

Replace the whole of `src/map/replayClock.ts` with:

```ts
/**
 * The full-screen map's time (moving map spec §6), as the app's TripReplayClock: now, a moment dragged to, or a replay
 * at 1x to 10x. A value the page keeps in state and reads on each frame, so nothing changes per frame. A leg in motion
 * that would pass in under 3 s at 1x slows so it takes 3 s (docs/superpowers/specs/2026-11-13-replay-short-legs-design.md).
 */

export type ReplaySpeed = 1 | 2 | 5 | 10
export const REPLAY_SPEEDS: readonly ReplaySpeed[] = [1, 2, 5, 10]

/** Trip time per replay time at 1x: a day in 48 seconds, as on CrewLu's moving map. */
export const REPLAY_BASE_RATE = 1800

/** The least real time, in ms at 1x, that a leg in motion takes, so a drive to work can be seen. */
export const LEG_MIN_REPLAY = 3000

/** A stretch of trip time. */
export interface Stretch {
  start: number
  end: number
}

export interface ReplayClock {
  span: Stretch
  /** The trip's legs. A short one slows the replay while it moves. */
  legs: readonly Stretch[]
  speed: ReplaySpeed
  /** Null while live. Otherwise the trip time it was set to, and when it started playing from there. */
  anchor: { tripTime: number; playingSince: number | null } | null
}

export const liveClock = (span: Stretch, legs: readonly Stretch[] = []): ReplayClock => ({ span, legs, speed: 1, anchor: null })
export const isLive = (c: ReplayClock) => c.anchor == null
/** True while a replay plays, and still true once it has reached the trip's end: check `hasFinished` for that. */
export const isPlaying = (c: ReplayClock) => c.anchor?.playingSince != null

const held = (c: ReplayClock, t: number) => Math.min(Math.max(t, c.span.start), c.span.end)

/** A stretch of the trip played at one rate: trip time per real time at 1x. */
interface Piece extends Stretch {
  rate: number
}

/**
 * The span cut at every leg's start and end. Each piece plays at the normal rate or, while legs move through it, at the
 * slowest of their rates: a leg's length over 3 s. A leg with no length covers no piece, so it adds no time.
 */
function pace(c: ReplayClock): Piece[] {
  const { start, end } = c.span
  const cuts = [start, end, ...c.legs.flatMap((l) => [l.start, l.end])].filter((t) => t >= start && t <= end)
  const times = [...new Set(cuts)].sort((a, b) => a - b)
  return times.slice(1).map((to, i) => {
    const from = times[i]
    const rate = c.legs.reduce(
      (slowest, l) => (l.start <= from && to <= l.end ? Math.min(slowest, (l.end - l.start) / LEG_MIN_REPLAY) : slowest),
      REPLAY_BASE_RATE,
    )
    return { start: from, end: to, rate }
  })
}

/** The real time at 1x from the span's start to the trip time `t`. */
const realAt = (pieces: Piece[], t: number) => pieces.reduce((sum, p) => sum + Math.max(0, Math.min(t, p.end) - p.start) / p.rate, 0)

/** The trip time `real` ms after the span's start at 1x, short of the end. */
function tripAt(pieces: Piece[], real: number, end: number): number {
  let left = real
  for (const p of pieces) {
    const length = (p.end - p.start) / p.rate
    if (left < length) return p.start + left * p.rate
    left -= length
  }
  return end
}

/** Room for float rounding, in real ms: `finishesAt` rounds up, so at that time the replay must read the end. */
const SLACK = 1e-6

/** The trip time to show at the real time `now`. */
export function clockTime(c: ReplayClock, now: number): number {
  if (!c.anchor) return now
  const since = c.anchor.playingSince
  if (since == null) return c.anchor.tripTime
  const pieces = pace(c)
  const real = realAt(pieces, c.anchor.tripTime) + Math.max(now - since, 0) * c.speed
  return real >= realAt(pieces, c.span.end) - SLACK ? c.span.end : tripAt(pieces, real, c.span.end)
}

/** The real time a playing clock reaches the trip's end, or null when it isn't playing. */
export function finishesAt(c: ReplayClock): number | null {
  const since = c.anchor?.playingSince
  if (c.anchor == null || since == null) return null
  const pieces = pace(c)
  return Math.ceil(since + (realAt(pieces, c.span.end) - realAt(pieces, c.anchor.tripTime)) / c.speed)
}

/** True once a replay has run to the trip's end. `isPlaying` stays true then, so the page shows Play again. */
export const hasFinished = (c: ReplayClock, now: number) => isPlaying(c) && clockTime(c, now) >= c.span.end

export const scrub = (c: ReplayClock, t: number): ReplayClock => ({ ...c, anchor: { tripTime: held(c, t), playingSince: null } })

/** Plays from where it is: from the start when live, and again from the start once finished. */
export function play(c: ReplayClock, now: number): ReplayClock {
  const current = isLive(c) ? c.span.start : clockTime(c, now)
  return { ...c, anchor: { tripTime: current >= c.span.end ? c.span.start : current, playingSince: now } }
}

export const pause = (c: ReplayClock, now: number): ReplayClock =>
  isPlaying(c) ? { ...c, anchor: { tripTime: clockTime(c, now), playingSince: null } } : c

export const setSpeed = (c: ReplayClock, speed: ReplaySpeed, now: number): ReplayClock =>
  isPlaying(c) ? { ...c, speed, anchor: { tripTime: clockTime(c, now), playingSince: now } } : { ...c, speed }

export const goLive = (c: ReplayClock): ReplayClock => ({ ...c, anchor: null })
```

With no legs the pace is one piece at 1,800x, so `clockTime` and `finishesAt` give exactly what they gave before, and the six old tests hold.

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run tests/map/replayClock.test.ts`

Expected: all 14 tests PASS.

- [ ] **Step 5: Run everything**

Run: `npm test` and `npm run build`

Expected: both pass. No other file builds a `ReplayClock` by hand. Every clock starts from `liveClock`, whose `legs` default to none, and the others spread an existing clock.

- [ ] **Step 6: Commit (only with Todd's yes)**

```bash
git add src/map/replayClock.ts tests/map/replayClock.test.ts
git commit -m "The trip map's replay: a leg in motion takes at least 3 seconds at 1x (replay design §2, §4)"
```

---

### Task 2: The full map's replay paced by its legs

**Files:**
- Modify: `src/ui/TripMapPage.tsx:41-42`
- Test: `tests/ui/TripMapPage.test.tsx`

- [ ] **Step 1: Write the failing test**

In `tests/ui/TripMapPage.test.tsx`:
- change the first import to `import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'`;
- change the fixture import to `import { AIRPORTS, at, drive, EUROPE, flight } from '../map/tripMapLegs'`;
- add this test at the end of the `describe('the full map (moving map spec §6)', …)` block:

```tsx
  it('slows a short drive so it takes 3 seconds at 1x (replay design, 2026-11-13)', () => {
    vi.useFakeTimers({ toFake: ['Date', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    try {
      vi.setSystemTime(at(100))
      // A 30-minute drive to work, then the flight.
      const map = makeTripMap([drive('d1', 'SDF', 'LEX', 0, 0.5), flight('f1', 'LEX', 'CGN', 1, 8)], {
        isNextTrip: true, home: 'SDF', now: at(-2), airports: AIRPORTS,
      })!
      render(<TripMapPage map={map} now={at(-2)} viewerTz="America/New_York" h24={false} day={null} days={null} land={null} onBack={() => {}} />)
      fireEvent.click(screen.getByRole('button', { name: 'Replay the trip' }))
      act(() => {
        vi.advanceTimersByTime(1500)
      })
      // About halfway through the drive after 1.5 s. At a day in 48 s it would be some 45 minutes in, past the drive.
      const into = Number((screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement).value) - at(0)
      expect(into).toBeGreaterThan(10 * 60_000)
      expect(into).toBeLessThan(20 * 60_000)
    } finally {
      vi.useRealTimers()
    }
  })
```

The bounds are loose on purpose. Fake animation frames come every 16 ms, so the last one before 1,500 ms is a little short of it. The slider may also round its value to its 15-minute step.

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/ui/TripMapPage.test.tsx`

Expected: the new test FAILS with `into` near 45 minutes (2,700,000), because the page's clock has no legs yet. The other tests PASS.

If it fails for another reason, for example the slider not moving at all, check whether the fake frames run first. Put `expect(into).not.toBe(0)` before the bounds. Fix the test's timing, not the page.

- [ ] **Step 3: Give the page's clock the map's legs**

In `src/ui/TripMapPage.tsx`, replace:

```tsx
  // The span always follows the map, so the slider's range is right if the trip changes while the page is open.
  const clock = { ...kept, span: map.span }
```

with:

```tsx
  // The span and legs always follow the map, so the slider's range and the replay's pace are right if the trip changes
  // while the page is open.
  const clock = { ...kept, span: map.span, legs: map.legs }
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run tests/ui/TripMapPage.test.tsx`

Expected: all PASS.

- [ ] **Step 5: Run everything**

Run: `npm test` and `npm run build`

Expected: both pass.

- [ ] **Step 6: Commit only this task's lines (only with Todd's yes)**

`src/ui/TripMapPage.tsx` also has Stage 2B Task 24's uncommitted `aria-label` line. Stage the file as it is in `HEAD` plus this task's edit alone, then put the whole file back:

```bash
SCRATCH=/private/tmp/claude-501/-Users-toddanderson-Dev-Crewluve-Website/62c35c45-af18-4c32-a765-b0dd40a2197c/scratchpad
cp src/ui/TripMapPage.tsx "$SCRATCH/TripMapPage.full.tsx"
git show HEAD:src/ui/TripMapPage.tsx > src/ui/TripMapPage.tsx
```

Make Step 3's edit again on this copy (the same replacement). Then:

```bash
git diff src/ui/TripMapPage.tsx   # shows only Step 3's three lines
git add src/ui/TripMapPage.tsx tests/ui/TripMapPage.test.tsx
cp "$SCRATCH/TripMapPage.full.tsx" src/ui/TripMapPage.tsx
git diff src/ui/TripMapPage.tsx   # shows only the aria-label line, still uncommitted
git commit -m "The full map's replay paced by the trip's legs, so a short drive takes 3 seconds at 1x (replay design §4)"
```

---

### Task 3: Review and Todd's look

- [ ] **Step 1:** A superpowers:code-reviewer (`model: "sonnet"`) over the two commits, against the spec.
- [ ] **Step 2:** On localhost:5180, play a replay with a drive at 1x and 2x. The demo's pilot drives from Lexington to Louisville: try `?demo=1&scene=driving-to-work#map` and `?demo=1&scene=recap` (its drive home), and check the drive is on each map before timing it. Check that a drive takes about 3 s at 1x, and that the long flights and layovers play as before.
- [ ] **Step 3:** Ask Todd where the app's half goes (spec §5): a session in the Crewluv repo.

## Changes made during execution (2026-11-14)

- **From review:** `finishesAt` now checks its own answer. Near today's epoch a double is good to only about 0.0002 ms, so `Math.ceil` could land a hair short of the end. At that time the page's frames stopped, and the replay showed Pause forever, about once in 30,000 plays. The old clock had the same flaw. `finishesAt` now steps on a millisecond until `clockTime` reads the end, at most once. The plan's 1e-6 ms `SLACK` is gone. A test pins a failing case (5x from 34,217,999 ms into a two-day trip) and sweeps 20,000 more.
- **Left as is, from review:**
  - the night's step during a slowed leg: it snaps about 3 times a second, not 10;
  - the pace being rebuilt on every call, which costs microseconds a frame.
