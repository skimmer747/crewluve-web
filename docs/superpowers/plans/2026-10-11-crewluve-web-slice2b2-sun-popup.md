# Crewluve Web Slice 2 Part B2 (Sun Popup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Crewluve app's sun popup to crewluve.crewlu.net. Tapping the location card's sun dial opens a card with the two clocks, a big 24-hour dial (home's time, the shared daylight, the next departure and the turn-taking loop), the weather with its animation, and the daylight, sunrise and sunset, moon and place rows.

**Architecture:** Pure modules work out the moon's phase, the shared daylight, the popup's words, the big dial's geometry, the loop's timeline and the weather particles. The sun dial gains the app's 360 size, which draws the popup-only layers from a small layer model and runs the loop from an animation-frame clock. The popup is a Preact component that the status screen draws after `<main>`. It has a canvas for the weather and a forced-dark color set at night. There are no new network requests and no change to the CSP.

**Tech Stack:** Vite 5.4, TypeScript 5.9 (strict), Preact 10, Vitest 3 with happy-dom and @testing-library/preact.

**Spec:** `docs/superpowers/specs/2026-10-11-crewluve-web-slice2b2-sun-popup-design.md`

---

## Execution notes

**Setup and gates**
- **Branch:** work on `slice2b2` in the main project folder. Run `git switch -c slice2b2` from `main`. Don't use git worktrees; auto mode blocked a worktree builder during slice 1.
- **Working directory:** run every command from the project root, `~/Dev/Crewluve Website`. Quote it in shells, since it has a space.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass before every commit that touches code. The suite is 1409 tests in 59 files before this plan, and 1564 tests in 69 files after it. The read-only scan (`tests/data/readOnly.test.ts`) adds one test for each new file in `src/`, so the totals grow a little faster than the task counts below.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Narrow no-break spaces:** the site writes "9:14 AM" with U+202F before AM. Test files spell it `\u202F`, as the printed blocks do. If an editor or tool turns it into the raw character, change it back.

**How the printed code was checked**
- Every code block below was built and run in a scratch copy of the project before this plan was written. All three gates passed there. A script then applied this plan's changes, step by step, to a fresh copy of `main`, and every file came out identical to the scratch copy's.
- 63 deliberate breaks were tried against the new tests, and they caught 61. The two they missed are both in the port of the app's `SharedDaylight`, and both stay, line for line as in the app:
  - its early return when home's sunrise isn't before its sunset can't change the result, since every span is empty then anyway;
  - its one-second filter was thought unable to change it too, but the Batch A review showed it can: a span of exactly one second falls either side of it by rounding. A test now pins it (see the Execution notes).
- A look at the scratch build in the browser pane showed the popup as designed: dark at night, light by day, the loop's arrow and sweep, a red delay, drifting clouds, and narrow and short screens. It also turned up one bug, now fixed in the printed code: focus didn't go back to the dial after closing, because Preact takes the popup away before the page stops being inert (Task 16).

**Network and other repos**
- **No new requests.** The popup uses the weather and the schedule the page already has, and works the rest out on the site. Tests never use the network; `tests/setup/noNetwork.ts` blocks it.
- **One build script may use npm:** `npm run icons` (Task 5) installs `@phosphor-icons/core@2.1.1` with `--no-save` when it isn't in `node_modules` already. If `package-lock.json` changes afterwards, restore it with `git checkout -- package-lock.json`.
- **Read-only site:** nothing in this plan talks to CrewLu Cloud or changes `src/data/readOnlyFetch.ts`. The read-only scan checks every new file automatically.
- **The Crewluve app (`~/Dev/Crewluv`) is reference only.** Read it; never change it. The same goes for the Flight Globe folder.

**Batches and changes**
- **Batches for helper execution:**
  - A = Tasks 1–5: the moon, shared daylight, the popup's words, the weather animations, the icons.
  - B = Tasks 6–9: the big dial's geometry, the loop's timeline, the frame clock, the layer model.
  - C = Tasks 10–13: the dial at two sizes, the moon icon, the weather particles and their canvas.
  - D = Tasks 14–18: the card's button, the night colors, the popup, its styles, the screen.
  - E = Tasks 19–20 are for the controller, working with the user.
- **If the code has to differ from a printed block, write it down.** Note it under "Execution notes" at the end of this file, and update the spec's §13 decisions log if a decision changed.

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/time/moon.ts` | create | The moon's age in its cycle and its phase |
| `src/time/sharedDaylight.ts` | create | When both places are in daylight, on home's clock (the app's `SharedDaylight`) |
| `src/copy/sunDetail.ts` | create | The popup's words: daylight, the hour difference, the countdown, moon names, the big dial's description |
| `src/copy/weather.ts` | modify | `weatherAnimation`: which animation each weather word plays |
| `scripts/build-icons.mjs`, `src/icons/iconPaths.ts` | modify, regenerate | `XCircle`, `SunHorizon` and `MapPinArea` |
| `src/ui/sunDialGeometry.ts` | modify | `DETAIL`, `hourAngle`, `turnPath`, `homeArrow`, `departureSweep`, `departureMarkerPath`, `wedgePath`, `planeSpot` |
| `src/ui/dialTimeline.ts` | create | The loop as a pure function of time, and the app's ease-out curve |
| `src/ui/hooks/useElapsed.ts` | create | Milliseconds since the loop started, on every animation frame |
| `src/ui/bigDial.ts` | create | What the big dial draws beyond the card's: home's layers and the departure's |
| `src/ui/SunDial.tsx` | modify | Two sizes: a button on the card at 160, the big dial at 360 |
| `src/ui/MoonPhaseIcon.tsx` | create | The moon icon, lit for its exact age |
| `src/ui/weatherParticles.ts` | create | The seven weather animations' particles, worked out from time |
| `src/ui/WeatherBackdrop.tsx` | create | The canvas that draws them behind the popup |
| `src/ui/locationFacts.ts` | create | The city, flag, zone, sun times and weather words, shared by the card and the popup |
| `src/ui/LocationCard.tsx` | modify | Uses the shared facts; its dial opens the popup |
| `src/styles/location.css` | modify | The dial takes taps now, with no button look |
| `src/styles/tokens.css` | modify | `.force-dark`: the page's dark colors, for the popup at night |
| `src/ui/motion.ts` | create | Whether the visitor asks for reduced motion |
| `src/ui/SunPopup.tsx` | create | The popup: the card, its rows, opening, closing, focus and the drag |
| `src/styles/sunPopup.css` | create | The popup's styles, the big dial's layers and the zoom |
| `src/main.tsx` | modify | Imports sunPopup.css after location.css |
| `src/ui/StatusScreen.tsx` | modify | Keeps whether the popup is open, and draws it after `<main>` |
| Tests | create and modify | Ten new test files, plus additions to seven existing ones |

**Files the reviews added or reshaped (see the Execution notes at the end):**

| File | Change | Responsibility |
|---|---|---|
| `src/ui/bigDialGeometry.ts` | create | The big dial's geometry, moved out of `sunDialGeometry.ts`: `DETAIL`, the arrow, the sweep, the departure's marks, the wedges and the planes |
| `src/ui/BigDialDrawing.tsx` | create | The drawing of the big dial's layers, moved out of `SunDial.tsx` |
| `src/styles/bigDial.css` | create | The styles of those layers, moved out of `sunPopup.css` |
| `src/ui/hooks/useModalDialog.ts` | create | Focus, the Tab trap, Escape and the page held still, moved out of `SunPopup.tsx` |
| `src/ui/hooks/useDragToClose.ts` | create | The drag down to close, moved out of `SunPopup.tsx` |
| `src/ui/WeatherCredit.tsx` | create | The Open-Meteo credit, shared by the card and the popup |
| `src/engine/snapshot.ts` | modify | `Departure` and `departureOffset`, moved from `src/copy/sunDetail.ts` and used by the snapshot's own delay |

---

> **The printed code below is the code as first built.** The review fixes have changed some of these files since, and the Execution notes at the end list each change by commit. To rebuild, start from the branch, not from these blocks.

### Task 1: The moon's phase

**Files:**
- Create: `src/time/moon.ts`
- Test: `tests/time/moon.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/time/moon.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { moonCycle, moonPhase, SYNODIC_MONTH } from '../../src/time/moon'
import { DAY } from '../../src/time/zoned'

/** How many days `t` is from the point `target` (0 new, 0.5 full) in the moon's cycle, either way. */
const daysFrom = (t: number, target: number) => {
  const off = moonCycle(t) - target
  return Math.abs(off - Math.round(off)) * SYNODIC_MONTH
}

// Eclipses fall exactly at new moon (solar) or full moon (lunar), so they pin the phase to within the hour.
const ECLIPSES: Array<[name: string, at: string, phase: 'new' | 'full']> = [
  ['the annular solar eclipse of 17 February 2026', '2026-02-17T12:12:00Z', 'new'],
  ['the total lunar eclipse of 3 March 2026', '2026-03-03T11:33:00Z', 'full'],
  ['the total solar eclipse of 12 August 2026', '2026-08-12T17:46:00Z', 'new'],
  ['the partial lunar eclipse of 28 August 2026', '2026-08-28T04:12:00Z', 'full'],
]

describe('moonPhase', () => {
  it.each(ECLIPSES)('is right within a day at %s', (_name, at, phase) => {
    const t = Date.parse(at)
    expect(moonPhase(t)).toBe(phase)
    expect(daysFrom(t, phase === 'new' ? 0 : 0.5)).toBeLessThan(1)
  })

  it('walks through all eight phases in order across one cycle', () => {
    const newMoon = Date.parse('2026-08-12T17:46:00Z')
    const step = (SYNODIC_MONTH / 8) * DAY
    // Each phase's middle, starting from the new moon (nudged by the formula's offset at that eclipse).
    const start = newMoon - moonCycle(newMoon) * SYNODIC_MONTH * DAY + SYNODIC_MONTH * DAY
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((i) => moonPhase(start + i * step))).toEqual([
      'new', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'full', 'waningGibbous', 'lastQuarter', 'waningCrescent',
    ])
  })

  it('changes name halfway between the main points', () => {
    const fullMoon = Date.parse('2026-08-28T04:12:00Z')
    const cycleStart = fullMoon - moonCycle(fullMoon) * SYNODIC_MONTH * DAY
    const at = (fraction: number) => cycleStart + fraction * SYNODIC_MONTH * DAY
    expect(moonPhase(at(1 / 16 - 0.001))).toBe('new')
    expect(moonPhase(at(1 / 16 + 0.001))).toBe('waxingCrescent')
    expect(moonPhase(at(7 / 16 + 0.001))).toBe('full')
    expect(moonPhase(at(15 / 16 + 0.001))).toBe('new')
  })
})

describe('moonCycle', () => {
  it('runs from 0 up to 1 and starts again', () => {
    const t = Date.parse('2026-10-11T12:00:00Z')
    expect(moonCycle(t)).toBeGreaterThanOrEqual(0)
    expect(moonCycle(t)).toBeLessThan(1)
    expect(moonCycle(t + SYNODIC_MONTH * DAY)).toBeCloseTo(moonCycle(t), 9)
  })
})
```

Eclipses happen exactly at new moon (solar) or full moon (lunar), so the four eclipses of 2026 pin the formula to published times. It lands within 0.6 days of each, inside the spec's one-day allowance (§11 item 3).

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/time/moon.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/time/moon'`.

- [x] **Step 3: Implement**

Create `src/time/moon.ts`:

```ts
import { DAY } from './zoned'

/** The moon's eight phases, as Apple's WeatherKit has them (MoonPhase in the app). */
export type MoonPhase =
  | 'new' | 'waxingCrescent' | 'firstQuarter' | 'waxingGibbous' | 'full' | 'waningGibbous' | 'lastQuarter' | 'waningCrescent'

const PHASES: readonly MoonPhase[] = ['new', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'full', 'waningGibbous', 'lastQuarter', 'waningCrescent']

/** The mean length of the moon's cycle, new moon to new moon, in days. */
export const SYNODIC_MONTH = 29.530588853

/** A new moon to count from: 6 January 2000 at 18:14 UTC. */
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)

/** How far through its cycle the moon is at `t`: 0 at new moon, 0.5 at full, just under 1 before the next new moon. */
export function moonCycle(t: number): number {
  const cycles = (t - KNOWN_NEW_MOON) / DAY / SYNODIC_MONTH
  return cycles - Math.floor(cycles)
}

/**
 * The phase at `t` (slice 2B2 §8): eight equal parts of the cycle, each centered on its own point, so "Full Moon"
 * runs from 1/16 of a cycle before full to 1/16 after. The mean cycle keeps it within about a day of the true phase.
 */
export function moonPhase(t: number): MoonPhase {
  return PHASES[Math.floor(moonCycle(t) * 8 + 0.5) % 8]
}
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/time/moon.test.ts`
Expected: PASS, 7 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/time/moon.ts tests/time/moon.test.ts
git commit -m "Moon: the phase from the moon's age (slice 2B2 §8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Shared daylight

**Files:**
- Create: `src/time/sharedDaylight.ts`
- Test: `tests/time/sharedDaylight.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/time/sharedDaylight.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sharedDaylight } from '../../src/time/sharedDaylight'

// The app's SharedDaylightTests, case for case, with times written as UTC instants.
// Tokyo is UTC+9; New York is UTC-4 in June (EDT) and UTC-5 in January (EST).
const NY = 'America/New_York'
const tokyo = (iso: string) => Date.parse(`${iso}+09:00`)
const newYork = (iso: string) => Date.parse(`${iso}-04:00`)
const newYorkWinter = (iso: string) => Date.parse(`${iso}-05:00`)
const hours = (h: number, m = 0) => h + m / 60

describe('sharedDaylight', () => {
  it('splits a Tokyo day that wraps past midnight on Eastern time into a morning sliver and an afternoon', () => {
    // Pilot 04:22–18:54 JST is 15:22–05:54 on the home clock; home daylight is 05:30–20:30.
    const spans = sharedDaylight(
      { sunrise: tokyo('2026-06-10T04:22'), sunset: tokyo('2026-06-10T18:54') },
      { sunrise: newYork('2026-06-10T05:30'), sunset: newYork('2026-06-10T20:30') },
      NY,
    )
    expect(spans).toHaveLength(2)
    expect(spans[0].start).toBeCloseTo(hours(5, 30), 3)
    expect(spans[0].end).toBeCloseTo(hours(5, 54), 3)
    expect(spans[1].start).toBeCloseTo(hours(15, 22), 3)
    expect(spans[1].end).toBeCloseTo(hours(20, 30), 3)
  })

  it('looks only at the time of day, not the date, of each sunrise and sunset', () => {
    const home = { sunrise: newYork('2026-06-10T05:30'), sunset: newYork('2026-06-10T20:30') }
    const sameDay = sharedDaylight({ sunrise: tokyo('2026-06-10T04:22'), sunset: tokyo('2026-06-10T18:54') }, home, NY)
    const nextDay = sharedDaylight({ sunrise: tokyo('2026-06-11T04:22'), sunset: tokyo('2026-06-11T18:54') }, home, NY)
    expect(nextDay).toEqual(sameDay)
  })

  it('gives the pilot’s daylight when it sits inside home’s', () => {
    const spans = sharedDaylight(
      { sunrise: newYork('2026-06-10T06:00'), sunset: newYork('2026-06-10T18:00') },
      { sunrise: newYork('2026-06-10T05:00'), sunset: newYork('2026-06-10T19:00') },
      NY,
    )
    expect(spans).toEqual([{ start: 6, end: 18 }])
  })

  it('gives nothing when the pilot’s daylight is all in home’s night', () => {
    // January: 14 hours apart. Pilot 08:00–16:00 JST is 18:00–02:00 on the home clock; home daylight is 07:00–17:00.
    const spans = sharedDaylight(
      { sunrise: tokyo('2026-01-10T08:00'), sunset: tokyo('2026-01-10T16:00') },
      { sunrise: newYorkWinter('2026-01-10T07:00'), sunset: newYorkWinter('2026-01-10T17:00') },
      NY,
    )
    expect(spans).toEqual([])
  })

  it('gives nothing for spans that only touch', () => {
    // Pilot 04:00–16:30 JST is 15:00–03:30 on the home clock; home daylight is 03:30–14:00.
    const spans = sharedDaylight(
      { sunrise: tokyo('2026-06-10T04:00'), sunset: tokyo('2026-06-10T16:30') },
      { sunrise: newYork('2026-06-10T03:30'), sunset: newYork('2026-06-10T14:00') },
      NY,
    )
    expect(spans).toEqual([])
  })

  it('gives nothing when home’s sunrise isn’t before its sunset on home’s clock, as with polar data', () => {
    const spans = sharedDaylight(
      { sunrise: newYork('2026-06-10T06:00'), sunset: newYork('2026-06-10T18:00') },
      { sunrise: newYork('2026-06-10T20:00'), sunset: newYork('2026-06-11T04:00') },
      NY,
    )
    expect(spans).toEqual([])
  })

  it('counts whole seconds: a span within the same second is dropped, one of 30 seconds is kept', () => {
    const spans = sharedDaylight(
      { sunrise: newYork('2026-06-10T19:00:00.4'), sunset: newYork('2026-06-10T23:00') },
      { sunrise: newYork('2026-06-10T05:00'), sunset: newYork('2026-06-10T19:00:00.9') },
      NY,
    )
    expect(spans).toEqual([])
    const kept = sharedDaylight(
      { sunrise: newYork('2026-06-10T18:59:30'), sunset: newYork('2026-06-10T23:00') },
      { sunrise: newYork('2026-06-10T05:00'), sunset: newYork('2026-06-10T19:00') },
      NY,
    )
    expect(kept).toHaveLength(1)
    expect(kept[0].start).toBeCloseTo(18 + 59.5 / 60, 6)
  })
})
```

The first five cases are the app's `SharedDaylightTests`, case for case. The last two cover home's polar data and the whole seconds the sun times carry.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/time/sharedDaylight.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/time/sharedDaylight'`.

- [x] **Step 3: Implement**

Create `src/time/sharedDaylight.ts`. It follows `Utils/SharedDaylight.swift` line for line:

```ts
import type { SunTimes } from './sun'
import { zonedParts } from './zoned'

/** A span on home's 24-hour clock, in hours from 0 up to 24. `start` is always before `end`. */
export interface DaylightSpan {
  start: number
  end: number
}

/** The time of `ms` on `timeZone`'s clock, in hours, with the minutes and seconds as a fraction. */
function clockHour(ms: number, timeZone: string): number {
  const { hour, minute } = zonedParts(ms, timeZone)
  const seconds = ((Math.floor(ms / 1000) % 60) + 60) % 60
  return hour + minute / 60 + seconds / 3600
}

/**
 * When the pilot and home are both in daylight, as spans on home's clock: none, one or two (SharedDaylight.windows in the
 * app, slice 2B2 §8). Only the time of day of each sunrise and sunset counts, not its date, so sun times for different
 * days still line up.
 */
export function sharedDaylight(pilot: SunTimes, home: SunTimes, homeTz: string): DaylightSpan[] {
  const homeStart = clockHour(home.sunrise, homeTz)
  const homeEnd = clockHour(home.sunset, homeTz)
  // Home's daylight never wraps past midnight on its own clock; anything else is degenerate polar data, so show no spans.
  if (!(homeStart < homeEnd)) return []
  const pilotStart = clockHour(pilot.sunrise, homeTz)
  const pilotEnd = clockHour(pilot.sunset, homeTz)
  // The pilot's daylight can wrap past midnight on home's clock: split it before comparing.
  const pieces: Array<[number, number]> = pilotStart <= pilotEnd ? [[pilotStart, pilotEnd]] : [[pilotStart, 24], [0, pilotEnd]]
  const oneSecond = 1 / 3600
  return pieces
    .map(([start, end]) => ({ start: Math.max(start, homeStart), end: Math.min(end, homeEnd) }))
    .filter((span) => span.end - span.start > oneSecond)
    .sort((a, b) => a.start - b.start)
}
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/time/sharedDaylight.test.ts`
Expected: PASS, 7 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/time/sharedDaylight.ts tests/time/sharedDaylight.test.ts
git commit -m "Shared daylight: the app's SharedDaylight, ported (slice 2B2 §8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Copy: the popup's words

**Files:**
- Create: `src/copy/sunDetail.ts`
- Test: `tests/copy/sunDetail.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/copy/sunDetail.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  bigDialLabel,
  daylightText,
  departureCountdownText,
  departureOffset,
  departureTime,
  hourDifference,
  moonPhaseName,
} from '../../src/copy/sunDetail'
import { DAY, HOUR, MINUTE } from '../../src/time/zoned'

const NY = 'America/New_York'
const ANC = 'America/Anchorage'
const OCT = Date.UTC(2026, 9, 10, 16) // Saturday 10 October, noon in New York

describe('departureOffset and departureTime', () => {
  const scheduled = Date.UTC(2026, 9, 11, 11, 25)
  it('count a departure as late or early only at 15 minutes or more, as everywhere on the site', () => {
    expect(departureOffset({ scheduled, actual: scheduled + 40 * MINUTE })).toBe(40)
    expect(departureOffset({ scheduled, actual: scheduled - 20 * MINUTE })).toBe(-20)
    expect(departureOffset({ scheduled, actual: scheduled + 14 * MINUTE })).toBeNull()
    expect(departureOffset({ scheduled, actual: scheduled + 15 * MINUTE })).toBe(15)
  })

  it('leave at the estimated time when it counts as off, else at the scheduled time', () => {
    expect(departureTime({ scheduled, actual: scheduled + 40 * MINUTE })).toBe(scheduled + 40 * MINUTE)
    expect(departureTime({ scheduled, actual: scheduled + 10 * MINUTE })).toBe(scheduled)
  })
})

describe('daylightText', () => {
  it('reads like the app, always with hours and minutes', () => {
    expect(daylightText({ sunrise: Date.UTC(2026, 9, 10, 16, 30), sunset: Date.UTC(2026, 9, 11, 3, 3) })).toBe('10h 33m of daylight')
    expect(daylightText({ sunrise: Date.UTC(2026, 9, 10, 12), sunset: Date.UTC(2026, 9, 10, 21) })).toBe('9h 0m of daylight')
  })

  it('rounds down to the minute and never goes below zero', () => {
    expect(daylightText({ sunrise: 0, sunset: 59_999 })).toBe('0h 0m of daylight')
    expect(daylightText({ sunrise: 10 * HOUR, sunset: 9 * HOUR })).toBe('0h 0m of daylight')
  })
})

describe('hourDifference', () => {
  it('gives whole hours with a sign, and whether the pilot is ahead', () => {
    expect(hourDifference(OCT, 'Europe/Berlin', NY)).toEqual({ amount: '+6h', ahead: true })
    expect(hourDifference(OCT, ANC, NY)).toEqual({ amount: '-4h', ahead: false })
  })

  it('gives hours and minutes for a half-hour zone', () => {
    expect(hourDifference(OCT, 'Asia/Kolkata', NY)).toEqual({ amount: '+9:30', ahead: true })
    expect(hourDifference(OCT, NY, 'Asia/Kolkata')).toEqual({ amount: '-9:30', ahead: false })
    expect(hourDifference(OCT, 'Asia/Kathmandu', 'Asia/Kolkata')).toEqual({ amount: '+0:15', ahead: true })
  })

  it('gives "+0h", not ahead, when the clocks match', () => {
    expect(hourDifference(OCT, 'America/Detroit', NY)).toEqual({ amount: '+0h', ahead: false })
  })
})

describe('departureCountdownText', () => {
  it.each([
    [DAY + 3 * HOUR + 40 * MINUTE, '1d 3h'],
    [2 * DAY + 20 * MINUTE, '2d'],
    [5 * HOUR + 20 * MINUTE + 59_000, '5h20m'],
    [5 * HOUR, '5h'],
    [45 * MINUTE + 30_000, '45m'],
    [30_000, '0m'],
    [-MINUTE, '0m'],
  ])('%i ms reads "%s"', (ms, text) => {
    expect(departureCountdownText(ms)).toBe(text)
  })
})

describe('moonPhaseName', () => {
  it('uses Apple’s eight names', () => {
    expect(
      (['new', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'full', 'waningGibbous', 'lastQuarter', 'waningCrescent'] as const).map(moonPhaseName),
    ).toEqual(['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Third Quarter', 'Waning Crescent'])
  })
})

describe('bigDialLabel', () => {
  // Anchorage on 10 October 2026: sunrise 8:30 AM, sunset 7:03 PM; 10:05 PM now.
  const sun = { sunrise: Date.UTC(2026, 9, 10, 16, 30), sunset: Date.UTC(2026, 9, 11, 3, 3) }
  const now = Date.UTC(2026, 9, 11, 6, 5)
  const scheduled = now + 5 * HOUR + 20 * MINUTE // 3:25 AM
  const base = { sun, now, timeZone: ANC, homeTz: NY, h24: false, city: 'Anchorage' }

  it('reads the sun, the time difference and the next departure', () => {
    expect(bigDialLabel({ ...base, departure: { scheduled, actual: scheduled } })).toBe(
      'Sunrise 8:30\u202FAM, sunset 7:03\u202FPM, nighttime in Anchorage, 4 hours behind you. Next departure 3:25\u202FAM, in 5 hours, 20 minutes.',
    )
  })

  it('names the actual time, and says how late or early', () => {
    expect(bigDialLabel({ ...base, departure: { scheduled, actual: scheduled + 40 * MINUTE } })).toBe(
      'Sunrise 8:30\u202FAM, sunset 7:03\u202FPM, nighttime in Anchorage, 4 hours behind you. Next departure 4:05\u202FAM, in 6 hours, 40 minutes late.',
    )
    expect(bigDialLabel({ ...base, departure: { scheduled, actual: scheduled - 20 * MINUTE } })).toContain('Next departure 3:05\u202FAM, in 5 hours, 20 minutes early.')
  })

  it('leaves out what doesn’t apply: the same clock as home, and a departure already gone or missing', () => {
    expect(bigDialLabel({ ...base, homeTz: ANC, departure: null })).toBe('Sunrise 8:30\u202FAM, sunset 7:03\u202FPM, nighttime in Anchorage.')
    expect(bigDialLabel({ ...base, departure: { scheduled: now - MINUTE, actual: now - MINUTE } })).toBe(
      'Sunrise 8:30\u202FAM, sunset 7:03\u202FPM, nighttime in Anchorage, 4 hours behind you.',
    )
  })
})
```

The description's durations come from the site's `spokenDuration`, which puts a comma between hours and minutes ("in 5 hours, 20 minutes"). The spec's §5.3 example now reads the same way.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/copy/sunDetail.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/copy/sunDetail'`.

- [x] **Step 3: Implement**

Create `src/copy/sunDetail.ts`:

```ts
import { DELAY_THRESHOLD_MIN } from '../engine/snapshot'
import type { MoonPhase } from '../time/moon'
import type { SunTimes } from '../time/sun'
import { MINUTE, zoneOffsetMinutes } from '../time/zoned'
import { delayText, shortTimeText, spokenDuration } from './format'
import { spokenTimeDifference, sunDialLabel, timeDifference } from './location'

/** The next departure, from the schedule's next flight: its scheduled and its estimated block-out times. */
export interface DialDeparture {
  scheduled: number
  actual: number
}

/** How late (positive) or early (negative) the departure is, in minutes, when that's 15 minutes or more; else null (slice 1 decision 9). */
export function departureOffset(departure: DialDeparture): number | null {
  const minutes = Math.round((departure.actual - departure.scheduled) / MINUTE)
  return Math.abs(minutes) >= DELAY_THRESHOLD_MIN ? minutes : null
}

/** When the flight leaves as the dial counts it: the estimated time when it's off by 15 minutes or more, else the scheduled one. */
export function departureTime(departure: DialDeparture): number {
  return departureOffset(departure) == null ? departure.scheduled : departure.actual
}

/** "10h 33m of daylight": sunset minus sunrise, never below zero, always with both parts (daylightDurationText in the app). */
export function daylightText(sun: SunTimes): string {
  const minutes = Math.max(0, Math.floor((sun.sunset - sun.sunrise) / MINUTE))
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m of daylight`
}

/**
 * The middle of the big dial during the home-time turn: "+6h" or "+5:30", and whether the pilot is ahead
 * (hourDifferenceText in the app). The sign is "+" when the pilot is ahead or level.
 */
export function hourDifference(t: number, pilotTz: string, homeTz: string): { amount: string; ahead: boolean } {
  const diff = zoneOffsetMinutes(t, pilotTz) - zoneOffsetMinutes(t, homeTz)
  const hours = Math.floor(Math.abs(diff) / 60)
  const minutes = Math.abs(diff) % 60
  const sign = diff >= 0 ? '+' : '-'
  return { amount: minutes === 0 ? `${sign}${hours}h` : `${sign}${hours}:${String(minutes).padStart(2, '0')}`, ahead: diff > 0 }
}

/** The big dial's departure countdown: "1d 3h", "1d", "5h20m", "5h" or "45m" (departureCountdownText in the app). */
export function departureCountdownText(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const totalHours = Math.floor(seconds / 3600)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0 && hours > 0) return `${days}d ${hours}h`
  if (days > 0) return `${days}d`
  if (hours > 0 && minutes > 0) return `${hours}h${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}

const MOON_NAMES: Record<MoonPhase, string> = {
  new: 'New Moon',
  waxingCrescent: 'Waxing Crescent',
  firstQuarter: 'First Quarter',
  waxingGibbous: 'Waxing Gibbous',
  full: 'Full Moon',
  waningGibbous: 'Waning Gibbous',
  lastQuarter: 'Third Quarter',
  waningCrescent: 'Waning Crescent',
}

/** The moon phase in Apple's words (MoonPhase.displayName in the app): "Third Quarter", not "Last Quarter". */
export function moonPhaseName(phase: MoonPhase): string {
  return MOON_NAMES[phase]
}

export interface BigDialLabelArgs {
  sun: SunTimes
  now: number
  timeZone: string
  homeTz: string
  h24: boolean
  city: string
  departure: DialDeparture | null
}

/**
 * What screen readers hear for the big dial (slice 2B2 §5.3): "Sunrise 8:30 AM, sunset 7:03 PM, nighttime in Anchorage,
 * 4 hours behind you. Next departure 3:25 AM, in 5 hours, 20 minutes." Parts that don't apply are left out.
 */
export function bigDialLabel({ sun, now, timeZone, homeTz, h24, city, departure }: BigDialLabelArgs): string {
  const difference = timeDifference(now, timeZone, homeTz)
  const sentences = [
    difference.direction === 'same'
      ? sunDialLabel(sun, now, timeZone, h24, city)
      : `${sunDialLabel(sun, now, timeZone, h24, city)}, ${spokenTimeDifference(difference)}`,
  ]
  if (departure) {
    const leaves = departureTime(departure)
    if (leaves > now) {
      const offset = departureOffset(departure)
      const late = offset == null ? '' : `, ${delayText(offset)} ${offset > 0 ? 'late' : 'early'}`
      sentences.push(`Next departure ${shortTimeText(leaves, timeZone, h24)}, in ${spokenDuration(leaves - now)}${late}`)
    }
  }
  return `${sentences.join('. ')}.`
}
```

`departureOffset` uses `DELAY_THRESHOLD_MIN` from the snapshot, so the popup counts a delay at 15 minutes or more like every other part of the site (spec §11 item 1).

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/copy/sunDetail.test.ts`
Expected: PASS, 18 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/copy/sunDetail.ts tests/copy/sunDetail.test.ts
git commit -m "Copy: the sun popup's words (slice 2B2 §5, §6, §8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Copy: the weather animations

**Files:**
- Modify: `src/copy/weather.ts`
- Test: `tests/copy/weather.test.ts`

- [x] **Step 1: Write the failing test**

In `tests/copy/weather.test.ts`, change the first import from `../../src/copy/weather` to:

```ts
import { temperatureText, weatherAnimation, weatherVisual } from '../../src/copy/weather'
```

Then add this to the end of the file:

```ts

describe('weatherAnimation', () => {
  // Spec §7's table: the card's words to the app's animations.
  it.each<[WeatherCode[], string]>([
    [[95, 96, 99], 'thunderstorm'],
    [[71, 73, 75, 77, 85, 86], 'snow'],
    [[51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82], 'rain'],
    [[45, 48], 'fog'],
    [[2, 3], 'clouds'],
  ])('codes %j play %s, by day and by night', (codes, animation) => {
    for (const code of codes) {
      expect(weatherAnimation(code, true)).toBe(animation)
      expect(weatherAnimation(code, false)).toBe(animation)
    }
  })

  it('plays sun rays in a clear sky by day and stars at night', () => {
    for (const code of [0, 1] as WeatherCode[]) {
      expect(weatherAnimation(code, true)).toBe('sunRays')
      expect(weatherAnimation(code, false)).toBe('stars')
    }
  })

  it('has an animation for every code', () => {
    for (const code of WEATHER_CODES) expect(weatherAnimation(code, true)).toMatch(/^(sunRays|rain|snow|clouds|thunderstorm|fog)$/)
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/copy/weather.test.ts`
Expected: FAIL. The 19 existing tests pass; the 7 new ones fail with `TypeError: weatherAnimation is not a function`.

- [x] **Step 3: Implement**

In `src/copy/weather.ts`, add this after `weatherVisual`, just before the comment that begins "Whole degrees the way the app's weather format writes them":

```ts
/** Which of the app's weather animations plays behind the sun popup (slice 2B2 §7). */
export type WeatherAnimation = 'sunRays' | 'stars' | 'rain' | 'snow' | 'clouds' | 'thunderstorm' | 'fog'

/**
 * The animation for a weather code, read from the card's words in the app's order (WeatherAnimationType.from):
 * thunderstorm, snow, rain, fog, clouds, then the clear sky, with sun rays by day and stars at night.
 */
export function weatherAnimation(code: WeatherCode, isDay: boolean): WeatherAnimation {
  const words = CONDITIONS[code][0].toLowerCase()
  if (words.includes('thunderstorm')) return 'thunderstorm'
  if (words.includes('snow') || words.includes('flurries')) return 'snow'
  if (words.includes('rain') || words.includes('drizzle')) return 'rain'
  if (words.includes('fog')) return 'fog'
  if (words.includes('cloudy')) return 'clouds'
  return isDay ? 'sunRays' : 'stars'
}

/**
 * Whole degrees the way the app's weather format writes them
```

It reads the card's words in the app's order (`WeatherAnimationType.from`), so a code always plays the animation its words name. Open-Meteo has no windy weather, so the app's wind animation isn't needed (spec §11 item 4).

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/copy/weather.test.ts`
Expected: PASS, 26 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/copy/weather.ts tests/copy/weather.test.ts
git commit -m "Copy: the weather animation for each weather word (slice 2B2 §7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Icons for the popup

**Files:**
- Modify: `scripts/build-icons.mjs`
- Regenerate: `src/icons/iconPaths.ts`
- Test: `tests/icons/iconPaths.test.ts`

- [x] **Step 1: Write the failing test**

In `tests/icons/iconPaths.test.ts`, add this test inside the `describe`, after the last one:

```ts
  it('has the sun popup’s close, sunrise and sunset, and place icons', () => {
    for (const name of ['XCircle', 'SunHorizon', 'MapPinArea']) expect(ICON_PATHS).toHaveProperty(name)
  })
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/icons/iconPaths.test.ts`
Expected: FAIL. The new test fails with `expected { …(50) } to have property "XCircle"`.

- [x] **Step 3: Add the icons to the build script and regenerate**

In `scripts/build-icons.mjs`, change the last line of the comment above `const ICONS = {` to:

```js
// the third adds the weather and sun dial symbols of the slice 2B1 location card; the fourth, the slice 2B2 sun popup's.
```

Then add a fourth block at the end of `ICONS`, so it ends:

```js
  CloudSnow: 'cloud-snow', CloudLightning: 'cloud-lightning',

  XCircle: 'x-circle', SunHorizon: 'sun-horizon', MapPinArea: 'map-pin-area',
}
```

Then regenerate the icon table:

```bash
npm run icons
```

Expected: `wrote 53 icons to …/src/icons/iconPaths.ts`. If `@phosphor-icons/core` 2.1.1 is already in `node_modules`, `node scripts/build-icons.mjs` does the same without npm. `git diff src/icons/iconPaths.ts` shows three added lines, `XCircle`, `SunHorizon` and `MapPinArea`, and no other change. If `package-lock.json` changed, run `git checkout -- package-lock.json`.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/icons/iconPaths.test.ts`
Expected: PASS, 5 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add scripts/build-icons.mjs src/icons/iconPaths.ts tests/icons/iconPaths.test.ts
git commit -m "Icons: XCircle, SunHorizon and MapPinArea for the sun popup (slice 2B2 §9)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The big dial's geometry

**Files:**
- Modify: `src/ui/sunDialGeometry.ts`
- Test: `tests/ui/sunDialGeometry.test.ts`

- [x] **Step 1: Write the failing test**

In `tests/ui/sunDialGeometry.test.ts`, replace the one-line import from `../../src/ui/sunDialGeometry` with:

```ts
import {
  arcPath,
  cornerFor,
  departureMarkerPath,
  departureSweep,
  DETAIL,
  DIAL,
  dialAngle,
  glowBands,
  homeArrow,
  hourAngle,
  labelAt,
  markerPath,
  planeSpot,
  pointAt,
  skyBackground,
  skyStops,
  tickAt,
  turnPath,
  wedgePath,
} from '../../src/ui/sunDialGeometry'
```

Then add this to the end of the file:

```ts

describe('the big dial’s measurements', () => {
  it('scale every card measurement by 2.25 at the popup’s 360 px', () => {
    const scale = 360 / DIAL.size
    expect(scale).toBe(2.25)
    // The labels the spec names: "Noon" at 18 px and the time labels at 20.25 px (8 and 9 points on the card).
    expect(8 * scale).toBe(18)
    expect(9 * scale).toBe(20.25)
    expect(DETAIL.homeIcon * scale).toBe(22.5)
    expect(DETAIL.arrowhead * scale).toBe(11.25)
  })

  it('put the home arrow at 0.70 of the radius, the sweep at 0.85, and the departure plane 2 points past the triangle', () => {
    expect(DETAIL.arrowRadius).toBeCloseTo(29.4, 9)
    expect(DETAIL.sweepRadius).toBeCloseTo(35.7, 9)
    expect(DETAIL.planeRadius).toBe(50)
    expect([DETAIL.plane, DETAIL.sweepPlane, DETAIL.arrowheadSpread]).toEqual([10, 8, 25])
  })
})

describe('hourAngle', () => {
  it('places an hour of the day as dialAngle places a time', () => {
    expect(hourAngle(0)).toBe(90)
    expect(hourAngle(12)).toBe(270)
    expect(hourAngle(5.5)).toBe(172.5)
    expect(hourAngle(8 + 12 / 60)).toBe(dialAngle(ny(8, 12), NY))
  })
})

describe('turnPath', () => {
  it('turns clockwise for a positive sweep and counterclockwise for a negative one', () => {
    expect(turnPath(270, 90, 42)).toBe('M80 40A42 42 0 0 1 122 82')
    expect(turnPath(270, -90, 42)).toBe('M80 40A42 42 0 0 0 38 82')
  })

  it('goes round more than once in pieces of at most half a turn', () => {
    expect(turnPath(90, 450, 42)).toBe('M80 124A42 42 0 0 1 80 40A42 42 0 0 1 80 124A42 42 0 0 1 38 82')
  })

  it('is just a starting point when there’s nothing to turn', () => {
    expect(turnPath(270, 0, 42)).toBe('M80 40')
  })
})

describe('homeArrow', () => {
  it('runs clockwise from home’s time to the pilot’s when the pilot is ahead, with the arrowhead pointing on', () => {
    // Home at noon (270), pilot at 6 pm (360): the arrowhead's sides trail back up from the tip at 3 o'clock.
    expect(homeArrow(270, 360, true, 1)).toEqual({
      arc: turnPath(270, 90, DETAIL.arrowRadius),
      head: 'M109.4 82L111.51 77.47L107.29 77.47Z',
    })
  })

  it('runs counterclockwise when the pilot is behind', () => {
    // Home at noon, pilot at 8 am (210): the arrow turns back 60°.
    expect(homeArrow(270, 210, false, 1)).toEqual({
      arc: turnPath(270, -60, DETAIL.arrowRadius),
      head: 'M54.54 67.3L58.63 64.43L54.97 62.32Z',
    })
  })

  it('draws part of the way while it sweeps, and nothing before it starts', () => {
    expect(homeArrow(270, 360, true, 0.5)).toEqual({
      arc: turnPath(270, 45, DETAIL.arrowRadius),
      head: 'M100.79 61.21L99.08 56.51L96.09 59.5Z',
    })
    expect(homeArrow(270, 360, true, 0)).toBeNull()
  })

  it('takes the short way round past midnight', () => {
    // Home at 11 pm (435), pilot at 1 am the next day (465) and 2 hours ahead: 30° clockwise, not 330° back.
    expect(homeArrow(435, 465, true, 1)!.arc).toBe(turnPath(435, 30, DETAIL.arrowRadius))
  })
})

describe('departureSweep', () => {
  // Now is noon (270); 5 pm is 345.
  const base = { now: 270, scheduled: 345, actual: 345, hoursToScheduled: 5, hoursToActual: 5, progress: 1 }
  const r = DETAIL.sweepRadius

  it('sweeps clockwise from now to the departure within a day, solid', () => {
    expect(departureSweep(base)).toEqual({ laps: null, solid: turnPath(270, 75, r), delay: null, tip: 345 })
    expect(departureSweep({ ...base, progress: 0.5 })).toEqual({ laps: null, solid: turnPath(270, 37.5, r), delay: null, tip: 307.5 })
  })

  it('draws nothing before it starts', () => {
    expect(departureSweep({ ...base, progress: 0 })).toEqual({ laps: null, solid: null, delay: null, tip: 270 })
  })

  it('goes once round dashed for each full day ahead, then solid for the rest', () => {
    // Tomorrow at 3 pm, 27 hours ahead: one 360° lap, then 45° more.
    const far = { ...base, scheduled: 315, actual: 315, hoursToScheduled: 27, hoursToActual: 27 }
    expect(departureSweep(far)).toEqual({ laps: turnPath(270, 360, r), solid: turnPath(630, 45, r), delay: null, tip: 675 })
    // Halfway through, it's still on its first lap.
    expect(departureSweep({ ...far, progress: 0.5 })).toEqual({ laps: turnPath(270, 202.5, r), solid: null, delay: null, tip: 472.5 })
  })

  it('runs on in red from the scheduled time to the actual one when late', () => {
    // 40 minutes late: 5:40 pm is 355.
    const late = { ...base, actual: 355, hoursToActual: 5 + 40 / 60 }
    expect(departureSweep(late)).toEqual({ laps: null, solid: turnPath(270, 75, r), delay: turnPath(345, 10, r), tip: 355 })
  })

  it('stops at the actual time when early, short of the scheduled one', () => {
    // 20 minutes early: 4:40 pm is 340.
    const early = { ...base, actual: 340, hoursToActual: 4 + 40 / 60 }
    expect(departureSweep(early)).toEqual({ laps: null, solid: turnPath(270, 70, r), delay: null, tip: 340 })
  })
})

describe('the departure’s marks', () => {
  it('turns the triangle to point at the center wherever the departure falls', () => {
    // At noon it's the noon marker with its corners swapped; at 6 pm it points left, into the circle.
    expect(departureMarkerPath(270)).toBe('M80 40L83.5 34L76.5 34Z')
    expect(departureMarkerPath(0)).toBe('M122 82L128 85.5L128 78.5Z')
  })

  it('centers a plane on its spot and turns it to point clockwise along the circle', () => {
    // At 6 pm it points down; at noon, right.
    expect(planeSpot(0, DETAIL.planeRadius, DETAIL.plane)).toEqual({ corner: { x: 125, y: 77 }, rotate: 180 })
    expect(planeSpot(270, DETAIL.planeRadius, DETAIL.plane)).toEqual({ corner: { x: 75, y: 27 }, rotate: 90 })
    // A tip laps round: the angle wraps, the place doesn't change.
    expect(planeSpot(270 + 720, DETAIL.sweepRadius, DETAIL.sweepPlane)).toEqual(planeSpot(270, DETAIL.sweepRadius, DETAIL.sweepPlane))
  })
})

describe('wedgePath', () => {
  it('runs from the center out to the circle and clockwise round it', () => {
    // 8 am (210) to 2 pm (300).
    expect(wedgePath(210, 300)).toBe('M80 82L43.63 61A42 42 0 0 1 101 45.63Z')
  })

  it('takes the long way round for more than 12 hours', () => {
    expect(wedgePath(180, 405)).toBe('M80 82L38 82A42 42 0 1 1 109.7 111.7Z')
  })
})
```

The expected numbers were worked out separately, in plain JavaScript, before the code was written.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/sunDialGeometry.test.ts`
Expected: FAIL before any test runs, with `TypeError: Cannot read properties of undefined (reading 'sweepRadius')`: the new `departureSweep` block reads `DETAIL`, which doesn't exist yet.

- [x] **Step 3: Implement**

In `src/ui/sunDialGeometry.ts`, replace `dialAngle` with this pair, so the dial and the shared daylight place hours the same way:

```ts
export function dialAngle(ms: number, timeZone: string): number {
  const { hour, minute } = zonedParts(ms, timeZone)
  return hourAngle(hour + minute / 60)
}

/** Where an hour of the day, from 0 up to 24 with a fraction, sits on the dial (angleForClockHour): midnight 90, noon 270. */
export function hourAngle(hour: number): number {
  return 90 + (hour / 24) * 360
}
```

Replace `pointAt` and its comment with this pair. The new arrowhead, triangle and plane points start from the unrounded point and round only at the end:

```ts
/** The point `radius` from the dial's center at `angle` degrees, unrounded, for working out other points. */
function exactPoint(angle: number, radius: number): Point {
  const a = (angle * Math.PI) / 180
  return { x: DIAL.cx + radius * Math.cos(a), y: DIAL.cy + radius * Math.sin(a) }
}

/** The point `radius` from the dial's center at `angle` degrees, rounded to hundredths. */
export function pointAt(angle: number, radius: number): Point {
  const p = exactPoint(angle, radius)
  return { x: round(p.x), y: round(p.y) }
}
```

Then add this to the end of the file:

```ts

/**
 * The big dial's own measurements: the parts of SunCircleView the app draws only above the card's size (size > 160),
 * in points of the same 160-point box. The browser scales them with everything else, by 2.25 at 360.
 */
export const DETAIL = {
  /** The home-time arrow runs round a circle at 0.70 × the radius, the departure sweep round one at 0.85 ×. */
  arrowRadius: DIAL.radius * 0.7,
  sweepRadius: DIAL.radius * 0.85,
  arrowhead: 5,
  /** How far each side of the arrowhead turns off the arc, in degrees. */
  arrowheadSpread: 25,
  homeIcon: 10,
  plane: 10,
  sweepPlane: 8,
  /** The departure plane sits 2 points beyond the departure triangle. */
  planeRadius: DIAL.radius + DIAL.marker + 2,
} as const

/** An angle wrapped into 0 up to 360, like the app's (a - b + 360).truncatingRemainder(dividingBy: 360). */
const turn = (degrees: number) => ((degrees % 360) + 360) % 360

/**
 * An SVG path round the circle of `radius` from angle `from`, turning `sweep` degrees: clockwise when it's positive,
 * counterclockwise when negative. It goes in pieces of at most half a turn, so laps of a day or more draw over each
 * other as the app's do.
 */
export function turnPath(from: number, sweep: number, radius: number): string {
  const r = round(radius)
  const start = pointAt(from, radius)
  const direction = sweep < 0 ? -1 : 1
  let path = `M${start.x} ${start.y}`
  let at = from
  let left = Math.abs(sweep)
  while (left > 0.001) {
    const piece = Math.min(left, 180)
    at += direction * piece
    const end = pointAt(at, radius)
    path += `A${r} ${r} 0 0 ${direction > 0 ? 1 : 0} ${end.x} ${end.y}`
    left -= piece
  }
  return path
}

/** The home-time arrow's arc, and the arrowhead that leads it. */
export interface Arrow {
  arc: string
  head: string
}

/**
 * The home-time arrow, drawn `progress` (0 to 1) of the way round the 0.70 circle from home's time to the pilot's:
 * clockwise when the pilot is ahead, counterclockwise when behind (HomeTimeArcShape, HomeTimeArrowheadShape).
 */
export function homeArrow(home: number, pilot: number, ahead: boolean, progress: number): Arrow | null {
  if (progress <= 0) return null
  const sweep = (ahead ? turn(pilot - home) : -turn(home - pilot)) * progress
  const end = home + sweep
  const tip = exactPoint(end, DETAIL.arrowRadius)
  // The sides run back from the tip, 25° either side of straight back along the arc.
  const back = end + (ahead ? 90 : -90) + 180
  const side = (offset: number) => {
    const a = ((back + offset) * Math.PI) / 180
    return `${round(tip.x + DETAIL.arrowhead * Math.cos(a))} ${round(tip.y + DETAIL.arrowhead * Math.sin(a))}`
  }
  return {
    arc: turnPath(home, sweep, DETAIL.arrowRadius),
    head: `M${round(tip.x)} ${round(tip.y)}L${side(DETAIL.arrowheadSpread)}L${side(-DETAIL.arrowheadSpread)}Z`,
  }
}

export interface SweepInput {
  /** The dial's angles for now, the scheduled departure and the actual one. */
  now: number
  scheduled: number
  actual: number
  /** Hours from now to the scheduled departure and to the actual one. */
  hoursToScheduled: number
  hoursToActual: number
  /** How far the sweep has drawn, 0 to 1. */
  progress: number
}

export interface Sweep {
  /** The dashed full laps, one a day, when the departure is more than a day ahead. */
  laps: string | null
  /** The solid part, up to the scheduled time at most. */
  solid: string | null
  /** The red part, from the scheduled time to the actual one when that's later. */
  delay: string | null
  /** The angle of the leading end, where the plane rides. */
  tip: number
}

/**
 * The departure sweep round the 0.85 circle, clockwise from now and `progress` of the way to the actual departure,
 * cut into the pieces the app's DepartureArcShape instances draw. Each full day ahead is a lap. The red piece is
 * empty unless the actual time is past the scheduled one, so an early departure has none, as in the app.
 */
export function departureSweep(s: SweepInput): Sweep {
  const total = Math.floor(s.hoursToActual / 24) * 360 + turn(s.actual - s.now)
  const laps = Math.floor(Math.max(0, s.hoursToScheduled) / 24) * 360
  const toScheduled = laps + turn(s.scheduled - s.now)
  const drawn = total * s.progress
  /** What's drawn of the piece that starts `offset` degrees round and runs at most `cap`, or null when that's nothing. */
  const piece = (offset: number, cap: number) => {
    const start = Math.min(drawn, offset)
    const length = Math.min(drawn - start, cap)
    return length > 0.001 ? turnPath(s.now + start, length, DETAIL.sweepRadius) : null
  }
  const overDay = s.hoursToActual > 24
  return {
    laps: overDay ? piece(0, laps) : null,
    solid: overDay ? piece(laps, toScheduled - laps) : piece(0, toScheduled),
    delay: piece(toScheduled, Infinity),
    tip: s.now + drawn,
  }
}

/** The small triangle just outside the circle at the departure time: the noon marker, turned to point at the center. */
export function departureMarkerPath(angle: number): string {
  const tip = pointAt(angle, DIAL.radius)
  const base = exactPoint(angle, DIAL.radius + DIAL.marker)
  // Half the base, across the radius: the app's perpendicular (-sin, cos).
  const a = (angle * Math.PI) / 180
  const dx = -Math.sin(a) * DIAL.markerHalfWidth
  const dy = Math.cos(a) * DIAL.markerHalfWidth
  return `M${tip.x} ${tip.y}L${round(base.x + dx)} ${round(base.y + dy)}L${round(base.x - dx)} ${round(base.y - dy)}Z`
}

/** A wedge from the center out to the circle, clockwise from angle `from` to angle `to`: the shared daylight's fill. */
export function wedgePath(from: number, to: number): string {
  const a = pointAt(from, DIAL.radius)
  const b = pointAt(to, DIAL.radius)
  return `M${DIAL.cx} ${DIAL.cy}L${a.x} ${a.y}A${DIAL.radius} ${DIAL.radius} 0 ${turn(to - from) > 180 ? 1 : 0} 1 ${b.x} ${b.y}Z`
}

/** Where a plane icon goes: the corner of its box, and its turn in degrees about the box's center. */
export interface PlaneSpot {
  corner: Point
  rotate: number
}

/**
 * A plane icon of `size` centered on the circle of `radius` at `angle`, pointing clockwise along it. Phosphor's plane
 * points up, so it turns angle + 180; the app's SF Symbol points right and turns angle + 90.
 */
export function planeSpot(angle: number, radius: number, size: number): PlaneSpot {
  return { corner: cornerFor(pointAt(angle, radius), size), rotate: round(turn(angle + 180)) }
}
```

Notes on the copy from the app:
- `turnPath` draws in pieces of at most half a turn, so laps of a day or more overlap as the app's do. A piece of nearly a full turn would round to the same start and end point, and SVG skips an arc whose ends are equal.
- `departureSweep` cuts the sweep where the app's `DepartureArcShape` instances do: dashed laps, then solid up to the scheduled time, then red to the actual time. The red piece is empty unless the actual time is past the scheduled one, so an early departure has none, as in the app.
- `planeSpot` turns Phosphor's plane, which points up, by the angle + 180. The app's SF Symbol points right and turns by the angle + 90; both end up pointing clockwise along the dial.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/sunDialGeometry.test.ts`
Expected: PASS, 37 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/ui/sunDialGeometry.ts tests/ui/sunDialGeometry.test.ts
git commit -m "Sun dial geometry: the big dial's arrow, sweep, marks and wedges (slice 2B2 §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The loop's timeline

**Files:**
- Create: `src/ui/dialTimeline.ts`
- Test: `tests/ui/dialTimeline.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/ui/dialTimeline.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { dialMoment, easeOut, TURN_MS } from '../../src/ui/dialTimeline'

const both = { home: true, departureDays: 0.25, still: false }
const homeOnly = { home: true, departureDays: null, still: false }

describe('easeOut', () => {
  it('is SwiftUI’s ease-out curve, cubic-bezier(0, 0, 0.58, 1)', () => {
    expect(easeOut(0)).toBe(0)
    expect(easeOut(0.25)).toBeCloseTo(0.3781, 4)
    expect(easeOut(0.5)).toBeCloseTo(0.6846, 4)
    expect(easeOut(0.75)).toBeCloseTo(0.9065, 4)
    expect(easeOut(1)).toBe(1)
  })

  it('holds at the ends outside 0 to 1', () => {
    expect(easeOut(-1)).toBe(0)
    expect(easeOut(2)).toBe(1)
  })
})

describe('dialMoment', () => {
  it.each([
    [0, 0, 1],
    [400, 0.6846, 1],
    [800, 1, 1],
    [2000, 1, 1],
    [2300, 1, 0.3154],
    [2600, 1, 0],
  ])('at %i ms the home turn has drawn %f and shows at %f', (ms, progress, opacity) => {
    const { home, departure } = dialMoment(ms, both)
    expect(home.progress).toBeCloseTo(progress, 4)
    expect(home.opacity).toBeCloseTo(opacity, 4)
    expect(home.middle).toBeCloseTo(progress * opacity, 4)
    expect(departure.progress).toBe(0)
  })

  it('clears the turn at 2.8 s and starts the next after a 0.3 s pause, then goes round again', () => {
    expect(dialMoment(2800, both).home.progress).toBe(0)
    expect(TURN_MS).toBe(3100)
    expect(dialMoment(3100, both).departure).toEqual({ progress: 0, opacity: 1, middle: 0 })
    expect(dialMoment(3100 + 400, both).departure.progress).toBeCloseTo(0.6846, 4)
    expect(dialMoment(2 * 3100 + 400, both).home.progress).toBeCloseTo(0.6846, 4)
  })

  it('sweeps 0.8 s for each day to a departure more than a day ahead', () => {
    // A day and a half: 1.2 s.
    const far = { ...both, departureDays: 1.5 }
    expect(dialMoment(3100 + 800, far).departure.progress).toBeCloseTo(easeOut(800 / 1200), 9)
    expect(dialMoment(3100 + 1200, far).departure.progress).toBe(1)
  })

  it('starts fading a sweep that takes longer than 2 s before it finishes, as the app does', () => {
    // Four days: 3.2 s, so it's still drawing when it fades, and cleared at 2.8 s before it's done.
    const veryFar = { ...both, departureDays: 4 }
    const fading = dialMoment(3100 + 2300, veryFar).departure
    expect(fading.progress).toBeCloseTo(easeOut(2300 / 3200), 9)
    expect(fading.opacity).toBeCloseTo(0.3154, 4)
    expect(dialMoment(3100 + 2800, veryFar).departure.progress).toBe(0)
  })

  it('skips a turn that doesn’t apply', () => {
    expect(dialMoment(3100 + 400, homeOnly).home.progress).toBeCloseTo(0.6846, 4)
    expect(dialMoment(400, { home: false, departureDays: 0.25, still: false }).departure.progress).toBeCloseTo(0.6846, 4)
  })

  it('moves nothing when neither turn applies', () => {
    const none = { home: false, departureDays: null, still: false }
    for (const ms of [0, 400, 5000]) {
      expect(dialMoment(ms, none)).toEqual({ home: { progress: 0, opacity: 1, middle: 0 }, departure: { progress: 0, opacity: 1, middle: 0 } })
    }
  })

  it('holds both arcs drawn for reduced motion, with the countdown in the middle when there’s a departure', () => {
    for (const ms of [0, 1234]) {
      expect(dialMoment(ms, { ...both, still: true })).toEqual({
        home: { progress: 1, opacity: 1, middle: 0 },
        departure: { progress: 1, opacity: 1, middle: 1 },
      })
    }
    expect(dialMoment(0, { ...homeOnly, still: true }).home).toEqual({ progress: 1, opacity: 1, middle: 1 })
  })
})
```

The moments are the spec's §12 list: 0, 0.4, 0.8, 2.0, 2.3, 2.6, 2.8 and 3.1 s.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/dialTimeline.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/ui/dialTimeline'`.

- [x] **Step 3: Implement**

Create `src/ui/dialTimeline.ts`:

```ts
/**
 * The big dial's loop (slice 2B2 §5.2), copying SunCircleView's task: each turn draws its arc in with an ease-out, holds,
 * fades from 2.0 s over 0.6 s, is cleared at 2.8 s, and the next turn starts after a 0.3 s pause. The home-time turn
 * comes first, then the departure turn; a turn that doesn't apply is skipped.
 */

/** One turn, start to start: 2.0 s, then 0.8 s while it fades and clears, then the 0.3 s pause. */
export const TURN_MS = 3100
const DRAW_MS = 800
const FADE_AT_MS = 2000
const FADE_MS = 600
const CLEAR_AT_MS = 2800

/**
 * SwiftUI's .easeOut, which is CSS's cubic-bezier(0, 0, 0.58, 1): how much of the change is done when `x` of the time
 * (0 to 1) has passed. The curve's time runs x(u) = 1.74(1 − u)u² + u³, solved for u by halving.
 */
export function easeOut(x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  let low = 0
  let high = 1
  for (let i = 0; i < 30; i++) {
    const u = (low + high) / 2
    if (3 * (1 - u) * u * u * 0.58 + u * u * u < x) low = u
    else high = u
  }
  const u = (low + high) / 2
  return 3 * (1 - u) * u * u + u * u * u
}

/** Where one turn's arc stands at a moment. */
export interface TurnState {
  /** How far it has drawn, eased: 0 to 1. */
  progress: number
  /** How faded it is: 1 shown, 0 gone. */
  opacity: number
  /** The middle text's opacity: it comes in with the arc and fades out with it. */
  middle: number
}

export interface DialMoment {
  home: TurnState
  departure: TurnState
}

export interface DialTurns {
  /** The home-time turn applies: the pilot's clock differs from home's. */
  home: boolean
  /** Days until the departure when one is ahead, else null. The sweep takes 0.8 s a day, and at least 0.8 s. */
  departureDays: number | null
  /** Reduced motion: nothing sweeps, and both arcs stay drawn in full. */
  still: boolean
}

const NOTHING: TurnState = { progress: 0, opacity: 1, middle: 0 }

/** The state of a turn `ms` after it started, for an arc that draws in over `drawMs`. */
function turnAt(ms: number, drawMs: number): TurnState {
  if (ms >= CLEAR_AT_MS) return NOTHING
  const progress = easeOut(ms / drawMs)
  const opacity = ms < FADE_AT_MS ? 1 : 1 - easeOut((ms - FADE_AT_MS) / FADE_MS)
  return { progress, opacity, middle: progress * opacity }
}

/** Both turns' states `elapsed` ms after the dial appeared. A pure function, so the dial can read it on every frame. */
export function dialMoment(elapsed: number, turns: DialTurns): DialMoment {
  const departs = turns.departureDays != null
  if (turns.still) {
    // Both arcs in full; the middle shows the countdown when there's a departure, otherwise the time difference.
    return {
      home: turns.home ? { progress: 1, opacity: 1, middle: departs ? 0 : 1 } : NOTHING,
      departure: departs ? { progress: 1, opacity: 1, middle: 1 } : NOTHING,
    }
  }
  const order = [...(turns.home ? ['home' as const] : []), ...(departs ? ['departure' as const] : [])]
  if (order.length === 0) return { home: NOTHING, departure: NOTHING }
  const cycle = order.length * TURN_MS
  const at = ((elapsed % cycle) + cycle) % cycle
  const which = order[Math.floor(at / TURN_MS)]
  const ms = at % TURN_MS
  if (which === 'home') return { home: turnAt(ms, DRAW_MS), departure: NOTHING }
  return { home: NOTHING, departure: turnAt(ms, DRAW_MS * Math.max(1, turns.departureDays ?? 1)) }
}
```

It copies the app's `.task` loop in `SunCircleView`: `withAnimation(.easeOut(duration: 0.8))`, sleep 2.0 s, fade with `.easeOut(duration: 0.6)`, sleep 0.8 s, reset, sleep 0.3 s. The departure sweep's 0.8 s grows with the days ahead (`0.8 * max(1, depHours / 24)`), so a sweep of more than 2.5 days is still drawing when it starts to fade.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/dialTimeline.test.ts`
Expected: PASS, 14 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/ui/dialTimeline.ts tests/ui/dialTimeline.test.ts
git commit -m "Sun dial: the loop's timeline (slice 2B2 §5.2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The frame clock

**Files:**
- Create: `src/ui/hooks/useElapsed.ts`
- Test: `tests/ui/useElapsed.test.tsx`

- [x] **Step 1: Write the failing test**

Create `tests/ui/useElapsed.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useElapsed } from '../../src/ui/hooks/useElapsed'
import { stubAnimationFrames } from '../fixtures/ui'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function Clock({ running }: { running: boolean }) {
  return <p>{useElapsed(running)}</p>
}

describe('useElapsed', () => {
  it('counts milliseconds from the first frame, on every frame', async () => {
    const frames = stubAnimationFrames()
    render(<Clock running />)
    expect(screen.getByText('0')).toBeTruthy()
    await frames.frame(1000)
    expect(screen.getByText('0')).toBeTruthy()
    await frames.frame(1400)
    expect(screen.getByText('400')).toBeTruthy()
    expect(frames.pending).toBe(1)
  })

  it('asks for no frames while it isn’t running, and stops when the component goes away', async () => {
    const frames = stubAnimationFrames()
    const { rerender, unmount } = render(<Clock running={false} />)
    expect(frames.pending).toBe(0)
    rerender(<Clock running />)
    expect(frames.pending).toBe(1)
    unmount()
    expect(frames.pending).toBe(0)
  })
})
```

`stubAnimationFrames` (in `tests/fixtures/ui.ts`) holds every frame until the test hands it a time.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/useElapsed.test.tsx`
Expected: FAIL with `Error: Failed to resolve import "../../src/ui/hooks/useElapsed" from "tests/ui/useElapsed.test.tsx". Does the file exist?`

- [x] **Step 3: Implement**

Create `src/ui/hooks/useElapsed.ts`:

```ts
import { useEffect, useState } from 'preact/hooks'

/**
 * Milliseconds since `running` turned on, new on every animation frame while it stays on: the big dial reads its loop
 * from it. The clock starts at the first frame, as the celebration's does, and stops when the component goes away.
 */
export function useElapsed(running: boolean): number {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!running) return
    let start: number | null = null
    let raf = 0
    const tick = (now: number) => {
      start ??= now
      setElapsed(now - start)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])
  return elapsed
}
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/useElapsed.test.tsx`
Expected: PASS, 2 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/ui/hooks/useElapsed.ts tests/ui/useElapsed.test.tsx
git commit -m "Hooks: a frame clock for the big dial's loop (slice 2B2 §8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The big dial's layers

**Files:**
- Create: `src/ui/bigDial.ts`
- Test: `tests/ui/bigDial.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/ui/bigDial.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { bigDialLayers, bigDialTurns, type DialDetail } from '../../src/ui/bigDial'
import type { DialMoment } from '../../src/ui/dialTimeline'
import {
  arcPath,
  cornerFor,
  departureMarkerPath,
  departureSweep,
  DETAIL,
  dialAngle,
  homeArrow,
  hourAngle,
  labelAt,
  planeSpot,
  pointAt,
  wedgePath,
} from '../../src/ui/sunDialGeometry'
import { DAY, HOUR, MINUTE } from '../../src/time/zoned'

const ANC = 'America/Anchorage'
const NY = 'America/New_York'
// Anchorage on 10 October 2026: sunrise 8:30 AM, sunset 7:03 PM; 10:05 PM now. New York: 7:13 AM to 6:28 PM.
const sun = { sunrise: Date.UTC(2026, 9, 10, 16, 30), sunset: Date.UTC(2026, 9, 11, 3, 3) }
const homeSun = { sunrise: Date.UTC(2026, 9, 10, 11, 13), sunset: Date.UTC(2026, 9, 10, 22, 28) }
const now = Date.UTC(2026, 9, 11, 6, 5)
const scheduled = now + 5 * HOUR + 20 * MINUTE // 3:25 AM
const onTime = { scheduled, actual: scheduled }
const detail: DialDetail = { homeTz: NY, homeSun, departure: onTime, still: false }

const drawn: DialMoment = { home: { progress: 1, opacity: 1, middle: 1 }, departure: { progress: 1, opacity: 1, middle: 1 } }
const idle: DialMoment = { home: { progress: 0, opacity: 1, middle: 0 }, departure: { progress: 0, opacity: 1, middle: 0 } }
const layers = (d: DialDetail, moment = drawn, h24 = false) => bigDialLayers(sun, now, ANC, h24, d, moment)

describe('bigDialTurns', () => {
  it('has the home turn while the clocks differ, and the departure turn while the departure is ahead', () => {
    expect(bigDialTurns(now, ANC, detail)).toEqual({ home: true, departureDays: (5 * HOUR + 20 * MINUTE) / DAY, still: false })
    expect(bigDialTurns(now, ANC, { ...detail, homeTz: ANC, still: true })).toEqual({ home: false, departureDays: (5 * HOUR + 20 * MINUTE) / DAY, still: true })
    expect(bigDialTurns(now, ANC, { ...detail, departure: { scheduled: now - MINUTE, actual: now - MINUTE } }).departureDays).toBeNull()
    expect(bigDialTurns(now, ANC, { ...detail, departure: null }).departureDays).toBeNull()
  })

  it('counts to the actual time only when it’s 15 minutes or more off', () => {
    expect(bigDialTurns(now, ANC, { ...detail, departure: { scheduled, actual: scheduled + 40 * MINUTE } }).departureDays).toBe((6 * HOUR) / DAY)
    expect(bigDialTurns(now, ANC, { ...detail, departure: { scheduled, actual: scheduled + 10 * MINUTE } }).departureDays).toBe((5 * HOUR + 20 * MINUTE) / DAY)
  })
})

describe('bigDialLayers: home', () => {
  const homeAngle = dialAngle(now, NY)

  it('draws home’s hand and house at home’s time, and the shared daylight on home’s clock', () => {
    const home = layers(detail).home!
    expect(home.hand).toEqual(pointAt(homeAngle, 42))
    expect(home.house).toEqual(cornerFor(pointAt(homeAngle, 42), DETAIL.homeIcon))
    // Anchorage's day is 12:30 PM to 11:03 PM on New York's clock; New York's ends at 6:28 PM.
    const from = hourAngle(12.5)
    const to = hourAngle(18 + 28 / 60)
    expect(home.shared).toHaveLength(1)
    expect(home.shared[0].wedge).toBe(wedgePath(from, to))
    expect(home.shared[0].arc).toBe(arcPath(from, to, 42))
  })

  it('says how far behind, and draws the arrow back from home’s time to the pilot’s as the loop runs', () => {
    const home = layers(detail).home!
    expect([home.amount, home.ahead]).toEqual(['-4h', false])
    expect(home.arrow).toEqual(homeArrow(homeAngle, dialAngle(now, ANC), false, 1))
    expect(home.turn).toEqual(drawn.home)
    expect(layers(detail, idle).home!.arrow).toBeNull()
  })

  it('leaves out the shared daylight without home’s sun times, and everything of home’s on the same clock', () => {
    expect(layers({ ...detail, homeSun: null }).home!.shared).toEqual([])
    expect(layers({ ...detail, homeTz: ANC }).home).toBeNull()
  })
})

describe('bigDialLayers: the departure', () => {
  const at = (ms: number) => dialAngle(ms, ANC)

  it('marks the scheduled time with a hand, a turned triangle, a plane and its label', () => {
    const departure = layers(detail).departure!
    expect(departure.hand).toEqual(pointAt(at(scheduled), 42))
    expect(departure.marker).toBe(departureMarkerPath(at(scheduled)))
    expect(departure.plane).toEqual(planeSpot(at(scheduled), DETAIL.planeRadius, DETAIL.plane))
    expect(departure.label).toEqual({ at: labelAt(at(scheduled)), text: '3:25a' })
    expect(departure.delay).toBeNull()
    expect(layers(detail, drawn, true).departure!.label.text).toBe('03:25')
  })

  it('sweeps from now to the departure, with the plane riding its end and the countdown in the middle', () => {
    const departure = layers(detail).departure!
    expect(departure.sweep).toEqual(
      departureSweep({ now: at(now), scheduled: at(scheduled), actual: at(scheduled), hoursToScheduled: 5 + 1 / 3, hoursToActual: 5 + 1 / 3, progress: 1 }),
    )
    expect(departure.rider).toEqual(planeSpot(departure.sweep.tip, DETAIL.sweepRadius, DETAIL.sweepPlane))
    expect([departure.countdown, departure.tone]).toEqual(['5h20m', 'on-time'])
    expect(layers(detail, idle).departure!.sweep.solid).toBeNull()
  })

  it('adds red marks at the actual time and a red sweep past the scheduled one when late', () => {
    const late = layers({ ...detail, departure: { scheduled, actual: scheduled + 40 * MINUTE } }).departure!
    expect(late.delay).toEqual({
      hand: pointAt(at(scheduled + 40 * MINUTE), 42),
      plane: planeSpot(at(scheduled + 40 * MINUTE), DETAIL.planeRadius, DETAIL.plane),
      label: { at: labelAt(at(scheduled + 40 * MINUTE)), text: '4:05a' },
    })
    expect(late.sweep.delay).not.toBeNull()
    expect([late.countdown, late.tone]).toEqual(['6h', 'late'])
  })

  it('marks an early departure’s actual time too, with no red sweep and a green rider', () => {
    const early = layers({ ...detail, departure: { scheduled, actual: scheduled - 20 * MINUTE } }).departure!
    expect(early.delay!.label.text).toBe('3:05a')
    expect(early.sweep.delay).toBeNull()
    expect([early.countdown, early.tone]).toEqual(['5h', 'early'])
  })

  it('treats a departure under 15 minutes off as on time', () => {
    const slightly = layers({ ...detail, departure: { scheduled, actual: scheduled + 10 * MINUTE } }).departure!
    expect([slightly.delay, slightly.tone, slightly.countdown]).toEqual([null, 'on-time', '5h20m'])
  })

  it('shows nothing of a departure that’s gone or missing', () => {
    expect(layers({ ...detail, departure: { scheduled: now - MINUTE, actual: now - MINUTE } }).departure).toBeNull()
    expect(layers({ ...detail, departure: null }).departure).toBeNull()
  })
})
```

Anchorage is 4 hours behind New York in October, and the times are the ones the spec's §5.3 example uses.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/bigDial.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/ui/bigDial'`.

- [x] **Step 3: Implement**

Create `src/ui/bigDial.ts`:

```ts
import { dialTimeText } from '../copy/format'
import { timeDifference } from '../copy/location'
import { departureCountdownText, departureOffset, departureTime, hourDifference, type DialDeparture } from '../copy/sunDetail'
import { sharedDaylight } from '../time/sharedDaylight'
import type { SunTimes } from '../time/sun'
import { DAY, HOUR } from '../time/zoned'
import type { DialMoment, DialTurns, TurnState } from './dialTimeline'
import {
  arcPath,
  cornerFor,
  departureMarkerPath,
  departureSweep,
  DETAIL,
  DIAL,
  dialAngle,
  homeArrow,
  hourAngle,
  labelAt,
  planeSpot,
  pointAt,
  wedgePath,
  type Arrow,
  type PlaneSpot,
  type Point,
  type Sweep,
} from './sunDialGeometry'

/** What the popup's big dial knows beyond the card's dial (slice 2B2 §5, §8). */
export interface DialDetail {
  /** The family's time zone, for home's hand, the house and the arrow. */
  homeTz: string
  /** Home's sunrise and sunset, for the shared daylight, or null when home's airport isn't known. */
  homeSun: SunTimes | null
  /** The next departure, or null when there's none. */
  departure: DialDeparture | null
  /** Reduced motion: the loop holds still with both arcs drawn. */
  still: boolean
}

export interface DialLabel {
  at: Point
  text: string
}

/** The home-time layers, shown while the pilot's clock differs from home's. */
export interface HomeLayers {
  /** The end of the dashed green line, on the circle at home's time. */
  hand: Point
  /** The corner of the house icon's box. */
  house: Point
  /** Each span when both places are in daylight: its wedge and its arc. */
  shared: Array<{ wedge: string; arc: string }>
  arrow: Arrow | null
  /** "+6h" or "-9:30", over "ahead" or "behind". */
  amount: string
  ahead: boolean
  turn: TurnState
}

/** The departure's marks at one time: the hand's end, the plane outside the circle, and the time label. */
export interface DepartureMarks {
  hand: Point
  plane: PlaneSpot
  label: DialLabel
}

/** The departure layers, shown while the departure is ahead. */
export interface DepartureLayers extends DepartureMarks {
  /** The turned triangle at the scheduled time. */
  marker: string
  /** The red marks at the actual time, when it's 15 minutes or more off the schedule. */
  delay: DepartureMarks | null
  sweep: Sweep
  /** The plane riding the sweep's leading end. */
  rider: PlaneSpot
  /** "5h20m", over "to go". */
  countdown: string
  /** Red when late, green when early, cyan otherwise: the rider's and the countdown's color. */
  tone: 'late' | 'early' | 'on-time'
  turn: TurnState
}

export interface BigDialLayers {
  home: HomeLayers | null
  departure: DepartureLayers | null
}

/** Which turns of the loop apply now: home's while the clocks differ, the departure's while it's ahead. */
export function bigDialTurns(now: number, timeZone: string, detail: DialDetail): DialTurns {
  const leaves = detail.departure ? departureTime(detail.departure) : null
  return {
    home: timeDifference(now, timeZone, detail.homeTz).direction !== 'same',
    departureDays: leaves != null && leaves > now ? (leaves - now) / DAY : null,
    still: detail.still,
  }
}

/** The departure's marks at `ms`: its hand, its plane 2 points past the triangle, and its label. */
function marksAt(ms: number, timeZone: string, h24: boolean): DepartureMarks {
  const angle = dialAngle(ms, timeZone)
  return {
    hand: pointAt(angle, DIAL.radius),
    plane: planeSpot(angle, DETAIL.planeRadius, DETAIL.plane),
    label: { at: labelAt(angle), text: dialTimeText(ms, timeZone, h24) },
  }
}

/** Everything the big dial draws beyond the card's dial, at `now`, with the loop at `moment`. */
export function bigDialLayers(sun: SunTimes, now: number, timeZone: string, h24: boolean, detail: DialDetail, moment: DialMoment): BigDialLayers {
  const turns = bigDialTurns(now, timeZone, detail)
  const nowAngle = dialAngle(now, timeZone)
  let home: HomeLayers | null = null
  if (turns.home) {
    const homeAngle = dialAngle(now, detail.homeTz)
    const { amount, ahead } = hourDifference(now, timeZone, detail.homeTz)
    const spans = detail.homeSun ? sharedDaylight(sun, detail.homeSun, detail.homeTz) : []
    home = {
      hand: pointAt(homeAngle, DIAL.radius),
      house: cornerFor(pointAt(homeAngle, DIAL.radius), DETAIL.homeIcon),
      shared: spans.map((span) => ({
        wedge: wedgePath(hourAngle(span.start), hourAngle(span.end)),
        arc: arcPath(hourAngle(span.start), hourAngle(span.end), DIAL.radius),
      })),
      arrow: homeArrow(homeAngle, nowAngle, ahead, moment.home.progress),
      amount,
      ahead,
      turn: moment.home,
    }
  }
  let departure: DepartureLayers | null = null
  if (detail.departure && turns.departureDays != null) {
    const { scheduled } = detail.departure
    const leaves = departureTime(detail.departure)
    const offset = departureOffset(detail.departure)
    const sweep = departureSweep({
      now: nowAngle,
      scheduled: dialAngle(scheduled, timeZone),
      actual: dialAngle(leaves, timeZone),
      hoursToScheduled: (scheduled - now) / HOUR,
      hoursToActual: (leaves - now) / HOUR,
      progress: moment.departure.progress,
    })
    departure = {
      ...marksAt(scheduled, timeZone, h24),
      marker: departureMarkerPath(dialAngle(scheduled, timeZone)),
      delay: offset == null ? null : marksAt(leaves, timeZone, h24),
      sweep,
      rider: planeSpot(sweep.tip, DETAIL.sweepRadius, DETAIL.sweepPlane),
      countdown: departureCountdownText(leaves - now),
      tone: offset == null ? 'on-time' : offset > 0 ? 'late' : 'early',
      turn: moment.departure,
    }
  }
  return { home, departure }
}
```

The rules come from `SunCircleView`:
- home's layers show while the pilot's zone offset differs from home's at that moment (`hasDifferentTimezone`);
- the departure's show while the actual time is still ahead (`shouldShowDepartureArc`);
- the actual time counts only when it's 15 minutes or more off, through `departureTime` and `departureOffset` (spec §11 item 1);
- an early departure also gets the red marks at its actual time, as in the app, but no red sweep.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/bigDial.test.ts`
Expected: PASS, 11 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/ui/bigDial.ts tests/ui/bigDial.test.ts
git commit -m "Sun dial: the big dial's layers (slice 2B2 §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The dial at two sizes

**Files:**
- Modify: `src/ui/SunDial.tsx`
- Test: `tests/ui/SunDial.test.tsx`

- [x] **Step 1: Write the failing test**

In `tests/ui/SunDial.test.tsx`, replace everything above `const ANC` (the imports and the `afterEach`) with:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DialDetail } from '../../src/ui/bigDial'
import { SunDial } from '../../src/ui/SunDial'
import { arcPath, cornerFor, departureMarkerPath, dialAngle, glowBands, labelAt, markerPath, pointAt, skyBackground, tickAt } from '../../src/ui/sunDialGeometry'
import { HOUR, MINUTE } from '../../src/time/zoned'
import { iconNameOf, stubAnimationFrames } from '../fixtures/ui'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
```

Then add this to the end of the file:

```tsx

describe('SunDial on the card', () => {
  it('is a button that opens the popup when the card gives it somewhere to go', () => {
    const onOpen = vi.fn()
    render(<SunDial sun={sun} now={MORNING} timeZone={ANC} h24={false} city="Anchorage" onOpen={onOpen} />)
    const button = screen.getByRole('button', { name: 'Sunrise 8:12\u202FAM, sunset 6:41\u202FPM, daytime in Anchorage. Opens sun details.' })
    // A real button, so Enter and Space press it as well as a tap or click.
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('type')).toBe('button')
    expect(button.getAttribute('aria-haspopup')).toBe('dialog')
    fireEvent.click(button)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('draws none of the big dial’s layers', () => {
    const { container } = render(dial(MORNING))
    expect(container.querySelector('.sun-dial')!.getAttribute('class')).toBe('sun-dial')
    for (const layer of ['.sun-house', '.sun-home-line', '.sun-shared', '.sun-shared-wedge', '.sun-departure-marker', '.sun-plane', '.sun-arrow', '.sun-sweep', '.sun-middle']) {
      expect(container.querySelector(layer), layer).toBeNull()
    }
  })
})

describe('SunDial at 360', () => {
  const NY = 'America/New_York'
  // 10:05 PM in Anchorage is 2:05 AM in New York; New York's day runs 7:13 AM to 6:28 PM. The flight leaves at 3:25 AM.
  const homeSun = { sunrise: Date.UTC(2026, 9, 10, 11, 13), sunset: Date.UTC(2026, 9, 10, 22, 28) }
  const scheduled = NIGHT + 5 * HOUR + 20 * MINUTE
  const detail: DialDetail = { homeTz: NY, homeSun, departure: { scheduled, actual: scheduled }, still: false }
  const big = (d: DialDetail = detail) => <SunDial sun={sun} now={NIGHT} timeZone={ANC} h24={false} city="Anchorage" size={360} detail={d} />
  const middle = (container: Element) => [...container.querySelectorAll('.sun-middle text')].map((t) => t.textContent)

  it('is one image to screen readers, described with the time difference and the next departure', () => {
    const { container } = render(big())
    expect(
      screen.getByRole('img', {
        name: 'Sunrise 8:12\u202FAM, sunset 6:41\u202FPM, nighttime in Anchorage, 4 hours behind you. Next departure 3:25\u202FAM, in 5 hours, 20 minutes.',
      }),
    ).toBeTruthy()
    expect(container.querySelector('.sun-dial')!.getAttribute('class')).toBe('sun-dial big')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('draws home’s dashed line and house, the shared daylight, and the departure’s hand, triangle, plane and label', () => {
    const { container } = render(big())
    const homeTip = pointAt(dialAngle(NIGHT, NY), 42)
    const homeLine = container.querySelector('.sun-home-line')!
    expect([homeLine.getAttribute('x2'), homeLine.getAttribute('y2')]).toEqual([String(homeTip.x), String(homeTip.y)])
    expect(iconNameOf(container.querySelector('.sun-house svg'))).toBe('House')
    expect(container.querySelector('.sun-house svg')!.getAttribute('width')).toBe('10')
    expect(container.querySelectorAll('.sun-shared-wedge')).toHaveLength(1)
    expect(container.querySelectorAll('.sun-shared')).toHaveLength(1)
    expect(container.querySelector('.sun-hand.departure')).not.toBeNull()
    expect(container.querySelector('.sun-departure-marker')!.getAttribute('d')).toBe(departureMarkerPath(dialAngle(scheduled, ANC)))
    expect(iconNameOf(container.querySelector('.sun-plane.departure svg'))).toBe('Airplane')
    expect(container.querySelector('.sun-time.departure')!.textContent).toBe('3:25a')
    expect(container.querySelector('.sun-hand.delay')).toBeNull()
    expect(container.querySelector('.sun-plane.delay')).toBeNull()
  })

  it('adds the red hand, plane and label at the actual time for a delay', () => {
    const { container } = render(big({ ...detail, departure: { scheduled, actual: scheduled + 40 * MINUTE } }))
    expect(container.querySelector('.sun-hand.delay')).not.toBeNull()
    expect(iconNameOf(container.querySelector('.sun-plane.delay svg'))).toBe('Airplane')
    expect(container.querySelector('.sun-time.delay')!.textContent).toBe('4:05a')
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Next departure 4:05\u202FAM, in 6 hours, 40 minutes late.')
  })

  it('leaves out home’s layers on the same clock, and the departure’s when there is none', () => {
    const { container } = render(big({ ...detail, homeTz: ANC, departure: null }))
    for (const layer of ['.sun-house', '.sun-home-line', '.sun-shared', '.sun-shared-wedge', '.sun-hand.departure', '.sun-departure-marker', '.sun-plane']) {
      expect(container.querySelector(layer), layer).toBeNull()
    }
  })

  it('runs the loop: the home arrow and "-4h behind", then the departure sweep and "5h20m to go"', async () => {
    const frames = stubAnimationFrames()
    const { container } = render(big())
    await frames.frame(1000)
    expect(container.querySelector('.sun-arrow')).toBeNull()
    expect(middle(container)).toEqual([])
    await frames.frame(1400)
    expect(container.querySelector('.sun-arrow')!.getAttribute('class')).toBe('sun-arrow behind')
    expect(middle(container)).toEqual(['-4h', 'behind'])
    expect(Number(container.querySelector('.sun-middle')!.getAttribute('opacity'))).toBeCloseTo(0.6846, 4)
    expect(container.querySelector('.sun-sweep')).toBeNull()
    await frames.frame(1000 + 3100 + 400)
    expect(container.querySelector('.sun-arrow')).toBeNull()
    expect(container.querySelector('.sun-sweep-solid')).not.toBeNull()
    expect(container.querySelector('.sun-plane.rider')!.getAttribute('class')).toBe('sun-plane rider on-time')
    expect(middle(container)).toEqual(['5h20m', 'to go'])
  })

  it('holds still for reduced motion, with both arcs drawn and the countdown in the middle', () => {
    const frames = stubAnimationFrames()
    const { container } = render(big({ ...detail, still: true }))
    expect(frames.pending).toBe(0)
    expect(container.querySelector('.sun-arrow')!.getAttribute('opacity')).toBe('1')
    expect(container.querySelector('.sun-sweep-solid')).not.toBeNull()
    expect(middle(container)).toEqual(['5h20m', 'to go'])
  })

  it('asks for no frames when nothing moves', () => {
    const frames = stubAnimationFrames()
    render(big({ ...detail, homeTz: ANC, departure: null }))
    expect(frames.pending).toBe(0)
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/SunDial.test.tsx`
Expected: FAIL in 6 of the 9 new tests, since the dial has no button, no `big` class and no big layers yet. The other 3 check that layers stay out or that nothing moves, so they pass already, as do the 11 existing tests.

- [x] **Step 3: Implement**

Replace `src/ui/SunDial.tsx` with:

```tsx
import { useId } from 'preact/hooks'
import { dialTimeText } from '../copy/format'
import { sunDialLabel } from '../copy/location'
import { bigDialLabel } from '../copy/sunDetail'
import { isDaytime, type SunTimes } from '../time/sun'
import { bigDialLayers, bigDialTurns, type BigDialLayers, type DialDetail } from './bigDial'
import { dialMoment } from './dialTimeline'
import { useElapsed } from './hooks/useElapsed'
import { Icon } from './Icon'
import { arcPath, cornerFor, dialAngle, DETAIL, DIAL, glowBands, labelAt, markerPath, pointAt, skyBackground, tickAt, type PlaneSpot } from './sunDialGeometry'

interface DialBase {
  sun: SunTimes
  now: number
  /** The pilot's time zone: the dial shows their day. */
  timeZone: string
  h24: boolean
  /** The city, for the screen-reader label. */
  city: string
}

/**
 * SunCircleView's size setting: 160 on the location card, where `onOpen` makes the dial a button that opens the popup;
 * 360 in the popup, which draws the big dial's own layers from `detail` (the app's size > 160).
 */
export type SunDialProps = DialBase & ({ size?: 160; onOpen?: () => void; detail?: never } | { size: 360; detail: DialDetail; onOpen?: never })

/**
 * The 24-hour sun dial: SunCircleView with the parts the app draws at each size (slice 2B1 §5, slice 2B2 §5). Screen
 * readers hear it as one image, or as one button on the card.
 */
export function SunDial(props: SunDialProps) {
  const { sun, now, timeZone, h24, city } = props
  const id = useId()
  const detail = props.size === 360 ? props.detail : null
  const turns = detail ? bigDialTurns(now, timeZone, detail) : null
  // The loop runs only on the big dial, when it has a turn to show and motion is welcome.
  const elapsed = useElapsed(turns != null && !turns.still && (turns.home || turns.departureDays != null))
  const big = detail && turns ? bigDialLayers(sun, now, timeZone, h24, detail, dialMoment(elapsed, turns)) : null
  const r = DIAL.radius
  const rise = dialAngle(sun.sunrise, timeZone)
  const set = dialAngle(sun.sunset, timeZone)
  const risePoint = pointAt(rise, r)
  const setPoint = pointAt(set, r)
  const hand = pointAt(dialAngle(now, timeZone), r)
  const day = isDaytime(now, sun)
  const icon = day ? DIAL.sunIcon : DIAL.moonIcon
  const corner = cornerFor(hand, icon)
  const labels = [
    { at: labelAt(rise), text: dialTimeText(sun.sunrise, timeZone, h24) },
    { at: labelAt(set), text: dialTimeText(sun.sunset, timeZone, h24) },
  ]
  const drawing = (
    <>
      <div class="sun-sky" style={{ background: skyBackground(rise, set) }} />
      <svg viewBox={`0 0 ${DIAL.size} ${DIAL.size}`} aria-hidden="true">
        <defs>
          {/* userSpaceOnUse, so each arc's colors run from its own start to its end, as the app's do. */}
          <linearGradient id={`${id}-day`} gradientUnits="userSpaceOnUse" x1={risePoint.x} y1={risePoint.y} x2={setPoint.x} y2={setPoint.y}>
            <stop offset="0" class="sun-day-end" />
            <stop offset="0.5" class="sun-day-middle" />
            <stop offset="1" class="sun-day-end" />
          </linearGradient>
          <linearGradient id={`${id}-night`} gradientUnits="userSpaceOnUse" x1={setPoint.x} y1={setPoint.y} x2={risePoint.x} y2={risePoint.y}>
            <stop offset="0" class="sun-night-end" />
            <stop offset="0.5" class="sun-night-middle" />
            <stop offset="1" class="sun-night-end" />
          </linearGradient>
          {/* The sun's soft orange shadow (radius 4 in the app). */}
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
            <feFlood class="sun-glow" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {big?.home?.shared.map((span, i) => <path key={i} class="sun-shared-wedge" d={span.wedge} />)}
        <path class="sun-day" d={arcPath(rise, set, r)} stroke={`url(#${id}-day)`} />
        <path class="sun-night" d={arcPath(set, rise, r)} stroke={`url(#${id}-night)`} />
        {glowBands(rise, set).map((band, i) => (
          <path key={i} class={`sun-band ${band.kind}`} d={arcPath(band.from, band.to, r)} />
        ))}
        {big?.home?.shared.map((span, i) => <path key={i} class="sun-shared" d={span.arc} />)}
        {[rise, set].map((angle, i) => {
          const tick = tickAt(angle)
          return <line key={i} class="sun-tick" x1={tick.from.x} y1={tick.from.y} x2={tick.to.x} y2={tick.to.y} />
        })}
        <path class="sun-marker" d={markerPath(270)} />
        <path class="sun-marker" d={markerPath(90)} />
        <line class="sun-hand" x1={DIAL.cx} y1={DIAL.cy} x2={hand.x} y2={hand.y} />
        {big && <BigDialHands layers={big} />}
        <g
          class={day ? 'sun-now day' : 'sun-now night'}
          transform={`translate(${corner.x} ${corner.y})`}
          filter={day ? `url(#${id}-glow)` : undefined}
        >
          <Icon name={day ? 'Sun' : 'Moon'} size={icon} />
        </g>
        {big && <BigDialTop layers={big} />}
        <text class="sun-noon" x={DIAL.cx} y={DIAL.cy - r - DIAL.noonLabelOffset}>
          Noon
        </text>
        {labels.map((label, i) => (
          <text key={i} class="sun-time" x={label.at.x} y={label.at.y}>
            {label.text}
          </text>
        ))}
      </svg>
    </>
  )
  if (detail) {
    const label = bigDialLabel({ sun, now, timeZone, homeTz: detail.homeTz, h24, city, departure: detail.departure })
    return (
      <div class="sun-dial big" role="img" aria-label={label}>
        {drawing}
      </div>
    )
  }
  if (props.onOpen) {
    return (
      <button type="button" class="sun-dial" aria-label={`${sunDialLabel(sun, now, timeZone, h24, city)}. Opens sun details.`} aria-haspopup="dialog" onClick={props.onOpen}>
        {drawing}
      </button>
    )
  }
  return (
    <div class="sun-dial" role="img" aria-label={sunDialLabel(sun, now, timeZone, h24, city)}>
      {drawing}
    </div>
  )
}

/** The big dial's hands under the sun: the departure's, the delay's, home's dashed line, and the departure triangle. */
function BigDialHands({ layers: { home, departure } }: { layers: BigDialLayers }) {
  return (
    <>
      {departure && <line class="sun-hand departure" x1={DIAL.cx} y1={DIAL.cy} x2={departure.hand.x} y2={departure.hand.y} />}
      {departure?.delay && <line class="sun-hand delay" x1={DIAL.cx} y1={DIAL.cy} x2={departure.delay.hand.x} y2={departure.delay.hand.y} />}
      {home && <line class="sun-home-line" x1={DIAL.cx} y1={DIAL.cy} x2={home.hand.x} y2={home.hand.y} />}
      {departure && <path class="sun-departure-marker" d={departure.marker} />}
    </>
  )
}

/** The big dial's top layers, over the sun: the house, the departure's planes and labels, and the loop's two turns. */
function BigDialTop({ layers: { home, departure } }: { layers: BigDialLayers }) {
  return (
    <>
      {home && (
        <g class="sun-house" transform={`translate(${home.house.x} ${home.house.y})`}>
          <Icon name="House" size={DETAIL.homeIcon} />
        </g>
      )}
      {departure && (
        <>
          <Plane class="departure" spot={departure.plane} size={DETAIL.plane} />
          <text class="sun-time departure" x={departure.label.at.x} y={departure.label.at.y}>
            {departure.label.text}
          </text>
        </>
      )}
      {departure?.delay && (
        <>
          <Plane class="delay" spot={departure.delay.plane} size={DETAIL.plane} />
          <text class="sun-time delay" x={departure.delay.label.at.x} y={departure.delay.label.at.y}>
            {departure.delay.label.text}
          </text>
        </>
      )}
      {home?.arrow && (
        <g class={`sun-arrow ${home.ahead ? 'ahead' : 'behind'}`} opacity={home.turn.opacity}>
          <path class="sun-arrow-arc" d={home.arrow.arc} />
          <path class="sun-arrow-head" d={home.arrow.head} />
        </g>
      )}
      {home && home.turn.middle > 0 && (
        <Middle tone={home.ahead ? 'ahead' : 'behind'} big={home.amount} small={home.ahead ? 'ahead' : 'behind'} opacity={home.turn.middle} />
      )}
      {departure && departure.turn.progress > 0 && (
        <>
          <g class="sun-sweep" opacity={departure.turn.opacity}>
            {departure.sweep.laps && <path class="sun-sweep-laps" d={departure.sweep.laps} />}
            {departure.sweep.solid && <path class="sun-sweep-solid" d={departure.sweep.solid} />}
            {departure.sweep.delay && <path class="sun-sweep-delay" d={departure.sweep.delay} />}
          </g>
          <Plane class={`rider ${departure.tone}`} spot={departure.rider} size={DETAIL.sweepPlane} opacity={departure.turn.middle} />
          <Middle tone={departure.tone} big={departure.countdown} small="to go" opacity={departure.turn.middle} />
        </>
      )}
    </>
  )
}

/** A plane icon of `size` at its spot, turned to point clockwise along the dial. */
function Plane({ class: tone, spot, size, opacity }: { class: string; spot: PlaneSpot; size: number; opacity?: number }) {
  return (
    <g
      class={`sun-plane ${tone}`}
      transform={`translate(${spot.corner.x} ${spot.corner.y}) rotate(${spot.rotate} ${size / 2} ${size / 2})`}
      opacity={opacity}
    >
      <Icon name="Airplane" size={size} />
    </g>
  )
}

/** The middle of the big dial during a turn: "-4h" over "behind", or "5h20m" over "to go", fading with the turn. */
function Middle({ tone, big, small, opacity }: { tone: string; big: string; small: string; opacity: number }) {
  return (
    <g class={`sun-middle ${tone}`} opacity={opacity}>
      <text class="sun-middle-big" x={DIAL.cx} y={DIAL.cy - 4.2}>
        {big}
      </text>
      <text class="sun-middle-small" x={DIAL.cx} y={DIAL.cy + 6}>
        {small}
      </text>
    </g>
  )
}
```

What changed from B1:
- The props are a union: `size` 160 with an optional `onOpen`, or `size` 360 with `detail`, so the card can't ask for the big layers by mistake.
- The drawing is shared. Its root is an image on the card, a button when the card gives it `onOpen`, and the big image in the popup, described by `bigDialLabel`.
- The big layers go in at four places, in the app's drawing order:
  - the shared daylight's wedges, under the day arc;
  - its white arcs, over the glow bands;
  - the departure's and home's hands and the turned triangle, under the sun;
  - the house, the planes, the labels and the loop's two turns, over the sun.
- `useElapsed` runs only on the big dial, only when a turn applies, and never for reduced motion.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/SunDial.test.tsx`
Expected: PASS, 20 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/ui/SunDial.tsx tests/ui/SunDial.test.tsx
git commit -m "Sun dial: two sizes, a button on the card and the big dial's layers (slice 2B2 §3, §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The moon icon

**Files:**
- Create: `src/ui/MoonPhaseIcon.tsx`
- Test: `tests/ui/MoonPhaseIcon.test.tsx`

- [x] **Step 1: Write the failing test**

Create `tests/ui/MoonPhaseIcon.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { moonCycle } from '../../src/time/moon'
import { MoonPhaseIcon, moonLitPath } from '../../src/ui/MoonPhaseIcon'

afterEach(cleanup)

describe('moonLitPath', () => {
  it('lights the right half at first quarter and the left half at third quarter', () => {
    // The shadow line is then straight up the middle: an arc with no width.
    expect(moonLitPath(0.25)).toBe('M12 2.5A9.5 9.5 0 0 1 12 21.5A0 9.5 0 0 0 12 2.5Z')
    expect(moonLitPath(0.75)).toBe('M12 2.5A9.5 9.5 0 0 0 12 21.5A0 9.5 0 0 0 12 2.5Z')
  })

  it('lights nothing at new moon and the whole disc at full moon', () => {
    // New: the shadow line comes back up the same edge. Full: it comes back up the other side.
    expect(moonLitPath(0)).toBe('M12 2.5A9.5 9.5 0 0 1 12 21.5A9.5 9.5 0 0 0 12 2.5Z')
    expect(moonLitPath(0.5)).toBe('M12 2.5A9.5 9.5 0 0 0 12 21.5A9.5 9.5 0 0 0 12 2.5Z')
  })

  it('bulges the shadow line toward the lit side for a crescent and away from it when gibbous', () => {
    // Waxing crescent (lit right): the line comes up right of center. Waxing gibbous: left of center.
    expect(moonLitPath(0.125)).toBe('M12 2.5A9.5 9.5 0 0 1 12 21.5A6.72 9.5 0 0 0 12 2.5Z')
    expect(moonLitPath(0.375)).toBe('M12 2.5A9.5 9.5 0 0 1 12 21.5A6.72 9.5 0 0 1 12 2.5Z')
    // Waning gibbous (lit left): right of center. Waning crescent: left of center.
    expect(moonLitPath(0.625)).toBe('M12 2.5A9.5 9.5 0 0 0 12 21.5A6.72 9.5 0 0 0 12 2.5Z')
    expect(moonLitPath(0.875)).toBe('M12 2.5A9.5 9.5 0 0 0 12 21.5A6.72 9.5 0 0 1 12 2.5Z')
  })
})

describe('MoonPhaseIcon', () => {
  it('draws the outline and the lit part for the moon’s age at that moment', () => {
    const t = Date.parse('2026-10-11T12:00:00Z')
    const { container } = render(<MoonPhaseIcon t={t} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('width')).toBe('17')
    expect(svg.querySelector('circle')).not.toBeNull()
    expect(svg.querySelector('path')!.getAttribute('d')).toBe(moonLitPath(moonCycle(t)))
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/MoonPhaseIcon.test.tsx`
Expected: FAIL with `Error: Failed to resolve import "../../src/ui/MoonPhaseIcon" from "tests/ui/MoonPhaseIcon.test.tsx". Does the file exist?`

- [x] **Step 3: Implement**

Create `src/ui/MoonPhaseIcon.tsx`:

```tsx
import { moonCycle } from '../time/moon'

/** The icon's circle: center 12 and radius 9.5 in a 24-point box. */
const C = 12
const R = 9.5
const round = (v: number) => Math.round(v * 100) / 100

/**
 * The moon's lit part at `cycle` (0 new, 0.5 full) as an SVG path in the icon's box: the edge of the moon on the lit
 * side, then the shadow line back, a half ellipse whose width follows the phase. It's lit on the right while the moon
 * waxes and on the left while it wanes, as seen from the northern hemisphere.
 */
export function moonLitPath(cycle: number): string {
  const waxing = cycle < 0.5
  const k = Math.cos(cycle * 2 * Math.PI)
  const rx = round(R * Math.abs(k))
  // The edge runs top to bottom down the lit side; the shadow line comes back up, bulging toward the lit side while
  // the moon is a crescent (k > 0) and away from it when it's gibbous.
  const edgeSweep = waxing ? 1 : 0
  const lineSweep = waxing === k > 0 ? 0 : 1
  return `M${C} ${C - R}A${R} ${R} 0 0 ${edgeSweep} ${C} ${C + R}A${rx} ${R} 0 0 ${lineSweep} ${C} ${C - R}Z`
}

/** The popup's moon phase icon: the moon's outline with its lit part drawn for the exact age, in the text color. */
export function MoonPhaseIcon({ t, size = 17 }: { t: number; size?: number }) {
  return (
    <svg class="icon moon-phase" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx={C} cy={C} r={R} fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d={moonLitPath(moonCycle(t))} fill="currentColor" />
    </svg>
  )
}
```

The app's popup shows one of eight SF Symbols; the site draws the lit part for the moon's exact age instead (spec §8). The outline keeps a new moon visible.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/MoonPhaseIcon.test.tsx`
Expected: PASS, 4 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/ui/MoonPhaseIcon.tsx tests/ui/MoonPhaseIcon.test.tsx
git commit -m "Moon phase icon, lit for the exact age (slice 2B2 §6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The weather particles

**Files:**
- Create: `src/ui/weatherParticles.ts`
- Test: `tests/ui/weatherParticles.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/ui/weatherParticles.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { particleHash, weatherShapes, type WeatherShape } from '../../src/ui/weatherParticles'

const W = 360
const H = 720
const of = <K extends WeatherShape['kind']>(shapes: WeatherShape[], kind: K) => shapes.filter((s): s is Extract<WeatherShape, { kind: K }> => s.kind === kind)

describe('particleHash', () => {
  it('gives the same number from 0 up to 1 for the same seed and particle, and different ones otherwise', () => {
    expect(particleHash(10, 3)).toBe(particleHash(10, 3))
    const values = Array.from({ length: 200 }, (_, i) => particleHash(10, i))
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
    expect(new Set(values).size).toBeGreaterThan(190)
    expect(particleHash(11, 3)).not.toBe(particleHash(10, 3))
  })
})

describe('weatherShapes', () => {
  it('turns 12 rays from 85% across and 12% down, 20 to 60–180 px out, orange and yellow by turns', () => {
    const rays = of(weatherShapes('sunRays', 3, W, H), 'line')
    expect(rays).toHaveLength(12)
    for (const [i, ray] of rays.entries()) {
      const start = Math.hypot(ray.x1 - W * 0.85, ray.y1 - H * 0.12)
      const end = Math.hypot(ray.x2 - W * 0.85, ray.y2 - H * 0.12)
      expect(start).toBeCloseTo(20, 9)
      expect(end).toBeGreaterThanOrEqual(60)
      expect(end).toBeLessThanOrEqual(180)
      expect(ray.color).toBe(i % 2 === 0 ? 'orange' : 'yellow')
      expect(ray.width).toBe(3.5)
      expect(ray.alpha).toBeGreaterThanOrEqual(0.12)
      expect(ray.alpha).toBeLessThanOrEqual(0.27)
    }
    // They turn at 0.15 radians a second.
    const later = of(weatherShapes('sunRays', 4, W, H), 'line')
    const angle = (r: { x1: number; y1: number }) => Math.atan2(r.y1 - H * 0.12, r.x1 - W * 0.85)
    expect(angle(later[0]) - angle(rays[0])).toBeCloseTo(0.15, 9)
  })

  it('twinkles 40 white stars of 1 to 3 px between 20% and 80%', () => {
    const stars = of(weatherShapes('stars', 3, W, H), 'dot')
    expect(stars).toHaveLength(40)
    for (const star of stars) {
      expect(star.r).toBeGreaterThanOrEqual(1)
      expect(star.r).toBeLessThanOrEqual(3)
      expect(star.alpha).toBeGreaterThanOrEqual(0.2)
      expect(star.alpha).toBeLessThanOrEqual(0.8)
      expect(star.color).toBe('white')
    }
    // They stay put.
    expect(of(weatherShapes('stars', 4, W, H), 'dot').map((s) => [s.x, s.y])).toEqual(stars.map((s) => [s.x, s.y]))
  })

  it('drops 60 rain streaks of 12 to 20 px, falling at 280 to 480 px a second, every third one cyan', () => {
    const drops = of(weatherShapes('rain', 3, W, H), 'line')
    expect(drops).toHaveLength(60)
    for (const [i, drop] of drops.entries()) {
      expect(drop.y2 - drop.y1).toBeGreaterThanOrEqual(12)
      expect(drop.y2 - drop.y1).toBeLessThanOrEqual(20)
      expect(drop.color).toBe(i % 3 === 0 ? 'cyan' : 'blue')
      expect(drop.width).toBe(1.5)
    }
    // A tenth of a second later each drop has fallen 28 to 48 px, unless it has wrapped back to the top.
    const later = of(weatherShapes('rain', 3.1, W, H), 'line')
    const fallen = later.map((d, i) => d.y1 - drops[i].y1).filter((dy) => dy > 0)
    expect(fallen.length).toBeGreaterThan(50)
    for (const dy of fallen) {
      expect(dy).toBeGreaterThanOrEqual(28 - 1e-9)
      expect(dy).toBeLessThanOrEqual(48 + 1e-9)
    }
  })

  it('floats 35 white flakes of 2 to 5 px down at 30 to 70 px a second', () => {
    const flakes = of(weatherShapes('snow', 3, W, H), 'dot')
    expect(flakes).toHaveLength(35)
    for (const flake of flakes) {
      expect(flake.r).toBeGreaterThanOrEqual(2)
      expect(flake.r).toBeLessThanOrEqual(5)
      expect(flake.alpha).toBeGreaterThanOrEqual(0.4)
      expect(flake.alpha).toBeLessThanOrEqual(0.7)
    }
    const later = of(weatherShapes('snow', 4, W, H), 'dot')
    const fallen = later.map((f, i) => f.y - flakes[i].y).filter((dy) => dy > 0)
    for (const dy of fallen) {
      expect(dy).toBeGreaterThanOrEqual(30 - 1e-9)
      expect(dy).toBeLessThanOrEqual(70 + 1e-9)
    }
  })

  it('drifts 7 soft clouds of 120–270 by 50–100 px across, at 25% to 45%', () => {
    const clouds = of(weatherShapes('clouds', 3, W, H), 'soft')
    expect(clouds).toHaveLength(7)
    for (const cloud of clouds) {
      expect(cloud.rx * 2).toBeGreaterThanOrEqual(120)
      expect(cloud.rx * 2).toBeLessThanOrEqual(270)
      expect(cloud.ry * 2).toBeGreaterThanOrEqual(50)
      expect(cloud.ry * 2).toBeLessThanOrEqual(100)
      expect([cloud.color, cloud.blur]).toEqual(['cloud', 18])
      expect(cloud.alpha).toBeGreaterThanOrEqual(0.25)
      expect(cloud.alpha).toBeLessThanOrEqual(0.45)
    }
  })

  it('rolls 4 wide fog bands, 60 to 100 px tall, up and down', () => {
    const bands = of(weatherShapes('fog', 3, W, H), 'soft')
    expect(bands).toHaveLength(4)
    for (const band of bands) {
      expect(band.rx).toBe((W + 40) / 2)
      expect(band.ry * 2).toBeGreaterThanOrEqual(60)
      expect(band.ry * 2).toBeLessThanOrEqual(100)
      expect([band.color, band.blur]).toEqual(['fog', 30])
    }
    expect(of(weatherShapes('fog', 5, W, H), 'soft').map((b) => b.y)).not.toEqual(bands.map((b) => b.y))
  })

  it('rains in a thunderstorm and flashes for a moment every 6 seconds, with a 4-part bolt', () => {
    const calm = weatherShapes('thunderstorm', 3, W, H)
    expect(of(calm, 'line')).toHaveLength(60)
    expect(of(calm, 'flash')).toHaveLength(0)
    const flash = weatherShapes('thunderstorm', 12.05, W, H)
    expect(of(flash, 'flash')).toEqual([{ kind: 'flash', alpha: 0.25 }])
    const [bolt] = of(flash, 'bolt')
    expect(bolt.points).toHaveLength(5)
    expect(bolt.points[0][1]).toBe(0)
    expect(bolt.points[4][1]).toBeCloseTo(H / 2, 9)
    expect([bolt.width, bolt.alpha]).toEqual([2, 0.8])
    expect(of(weatherShapes('thunderstorm', 12.11, W, H), 'flash')).toHaveLength(0)
    // The next flash has a different bolt.
    expect(of(weatherShapes('thunderstorm', 18.05, W, H), 'bolt')[0].points).not.toEqual(bolt.points)
  })
})
```

Each test checks the spec's §7 table: how many particles, their sizes, colors and strengths, and how they move over time.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/weatherParticles.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/ui/weatherParticles'`.

- [x] **Step 3: Implement**

Create `src/ui/weatherParticles.ts`:

```ts
import type { WeatherAnimation } from '../copy/weather'

/**
 * The weather animations' particles (slice 2B2 §7), copying WeatherBackgroundView: every position is worked out from
 * the time and the particle's number, so nothing is stored between frames. Sizes are in CSS pixels of the card.
 */

/** The colors the particles use: theme colors, white, and the app's cloud and fog grays. */
export type ParticleColor = 'orange' | 'yellow' | 'blue' | 'cyan' | 'white' | 'cloud' | 'fog'

export type WeatherShape =
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; width: number; color: ParticleColor; alpha: number }
  | { kind: 'dot'; x: number; y: number; r: number; color: ParticleColor; alpha: number }
  /** A soft ellipse, centered at x, y: a cloud or a fog band, faded at its edges over `blur` pixels. */
  | { kind: 'soft'; x: number; y: number; rx: number; ry: number; blur: number; color: 'cloud' | 'fog'; alpha: number }
  /** The lightning flash over the whole card. */
  | { kind: 'flash'; alpha: number }
  /** The lightning bolt: a jagged white line. */
  | { kind: 'bolt'; points: Array<[number, number]>; width: number; alpha: number }

/**
 * A number from 0 up to 1 for a particle, the same every time: the app's seeded hash, worked in 32-bit integers, so the
 * particles sit in different places from the app's (slice 2B2 §11 item 9).
 */
export function particleHash(seed: number, index: number): number {
  let h = (Math.imul(seed, 2654435761) + Math.imul(index, 340573321)) >>> 0
  h = (h ^ (h >>> 16)) >>> 0
  h = Math.imul(h, 0x45d9f3b) >>> 0
  h = (h ^ (h >>> 16)) >>> 0
  return (h % 10000) / 10000
}

const hash = particleHash
const TAU = Math.PI * 2
const range = (count: number) => Array.from({ length: count }, (_, i) => i)

/** Twelve rays turning slowly from a point near the top right, each pulsing in length and strength. */
function sunRays(t: number, w: number, h: number): WeatherShape[] {
  const cx = w * 0.85
  const cy = h * 0.12
  return range(12).map((i) => {
    const angle = t * 0.15 + (i * TAU) / 12
    const seed = hash(7, i)
    const pulse = Math.sin(t * (0.4 + seed * 0.3) + seed * TAU) * 0.5 + 0.5
    const length = 60 + 120 * pulse
    return {
      kind: 'line',
      x1: cx + Math.cos(angle) * 20,
      y1: cy + Math.sin(angle) * 20,
      x2: cx + Math.cos(angle) * length,
      y2: cy + Math.sin(angle) * length,
      width: 3.5,
      color: i % 2 === 0 ? 'orange' : 'yellow',
      alpha: 0.12 + pulse * 0.15,
    }
  })
}

/** Forty stars, each twinkling at its own pace. */
function stars(t: number, w: number, h: number): WeatherShape[] {
  return range(40).map((i) => {
    const twinkle = Math.sin(t * (0.5 + hash(4, i) * 1.5) + hash(5, i) * TAU) * 0.5 + 0.5
    return { kind: 'dot', x: hash(1, i) * w, y: hash(2, i) * h, r: 1 + hash(3, i) * 2, color: 'white', alpha: 0.2 + twinkle * 0.6 }
  })
}

/** Sixty drops falling with a slight slant, every third one cyan. */
function rain(t: number, w: number, h: number): WeatherShape[] {
  const margin = 40
  const slant = 8
  return range(60).map((i) => {
    const length = 12 + hash(12, i) * 8
    const y = ((t * (280 + hash(11, i) * 200) + hash(13, i) * (h + margin)) % (h + margin)) - margin / 2
    const x = hash(10, i) * (w + 60) - 30 + (y / h) * slant
    return {
      kind: 'line',
      x1: x,
      y1: y,
      x2: x + slant * (length / h),
      y2: y + length,
      width: 1.5,
      color: i % 3 === 0 ? 'cyan' : 'blue',
      alpha: 0.25 + hash(14, i) * 0.15,
    }
  })
}

/** Thirty-five flakes drifting down and swaying. */
function snow(t: number, w: number, h: number): WeatherShape[] {
  const margin = 30
  return range(35).map((i) => {
    const y = ((t * (30 + hash(21, i) * 40) + hash(25, i) * (h + margin)) % (h + margin)) - margin / 2
    const sway = Math.sin(t * (0.3 + hash(23, i) * 0.5) + hash(26, i) * TAU) * (15 + hash(24, i) * 25)
    return { kind: 'dot', x: hash(20, i) * w + sway, y, r: 2 + hash(22, i) * 3, color: 'white', alpha: 0.4 + hash(27, i) * 0.3 }
  })
}

/** Seven soft clouds drifting across, coming back round from the left. */
function clouds(t: number, w: number, h: number): WeatherShape[] {
  return range(7).map((i) => {
    const cw = 120 + hash(32, i) * 150
    const ch = 50 + hash(33, i) * 50
    const left = ((t * (8 + hash(31, i) * 15) + hash(34, i) * (w + cw)) % (w + cw)) - cw / 2
    return { kind: 'soft', x: left + cw / 2, y: hash(30, i) * h, rx: cw / 2, ry: ch / 2, blur: 18, color: 'cloud', alpha: 0.25 + hash(35, i) * 0.2 }
  })
}

/** The rain, with a flash and a bolt for a moment every 6 seconds; the bolt changes each time. */
function thunderstorm(t: number, w: number, h: number): WeatherShape[] {
  const shapes = rain(t, w, h)
  const cycle = t / 6
  if (cycle - Math.floor(cycle) >= 0.017) return shapes
  const seed = Math.floor(cycle)
  let x = hash(50, seed) * w * 0.6 + w * 0.2
  let y = 0
  const points: Array<[number, number]> = [[x, y]]
  for (let s = 0; s < 4; s++) {
    x += (hash(51 + s, seed) - 0.5) * 60
    y += (h * 0.5) / 4
    points.push([x, y])
  }
  return [...shapes, { kind: 'flash', alpha: 0.25 }, { kind: 'bolt', points, width: 2, alpha: 0.8 }]
}

/** Four wide soft bands of fog, rising and falling slowly. */
function fog(t: number, w: number, h: number): WeatherShape[] {
  return range(4).map((i) => {
    const y = h * (0.2 + hash(40, i) * 0.6) + Math.sin(t * (0.15 + hash(41, i) * 0.25) + hash(45, i) * TAU) * (20 + hash(42, i) * 30)
    const bandHeight = 60 + hash(43, i) * 40
    return { kind: 'soft', x: w / 2, y, rx: (w + 40) / 2, ry: bandHeight / 2, blur: 30, color: 'fog', alpha: 0.15 + hash(44, i) * 0.15 }
  })
}

const DRAW: Record<WeatherAnimation, (t: number, w: number, h: number) => WeatherShape[]> = {
  sunRays,
  stars,
  rain,
  snow,
  clouds,
  thunderstorm,
  fog,
}

/** The shapes of animation `kind` at `t` seconds, on a card `w` by `h` pixels. */
export function weatherShapes(kind: WeatherAnimation, t: number, w: number, h: number): WeatherShape[] {
  return DRAW[kind](t, w, h)
}
```

Every formula is `WeatherBackgroundView.swift`'s, number for number. The one change is the hash: the app's works in 64-bit integers, and this one uses `Math.imul` on 32 bits, so the particles sit in different places (spec §11 item 9).

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/weatherParticles.test.ts`
Expected: PASS, 8 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/ui/weatherParticles.ts tests/ui/weatherParticles.test.ts
git commit -m "Weather animations: the particles (slice 2B2 §7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: The weather canvas

**Files:**
- Create: `src/ui/WeatherBackdrop.tsx`
- Test: `tests/ui/WeatherBackdrop.test.tsx`

- [x] **Step 1: Write the failing test**

Create `tests/ui/WeatherBackdrop.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WeatherBackdrop } from '../../src/ui/WeatherBackdrop'
import { stubAnimationFrames } from '../fixtures/ui'

/** A stand-in 2D context that records what's drawn: happy-dom's canvas has none. */
function fakeContext() {
  const calls: string[] = []
  const record = (name: string) => (...args: unknown[]) => {
    calls.push(`${name}(${args.length})`)
  }
  const ctx = {
    calls,
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: '',
    fillStyle: '' as unknown,
    setTransform: record('setTransform'),
    clearRect: record('clearRect'),
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    stroke: record('stroke'),
    arc: record('arc'),
    fill: record('fill'),
    fillRect: record('fillRect'),
    save: record('save'),
    restore: record('restore'),
    translate: record('translate'),
    scale: record('scale'),
    createRadialGradient: () => ({ addColorStop: record('addColorStop') }),
  }
  return ctx
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

let ctx: ReturnType<typeof fakeContext>

beforeEach(() => {
  ctx = fakeContext()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx as unknown as CanvasRenderingContext2D)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete (document as { visibilityState?: unknown }).visibilityState
})

describe('WeatherBackdrop', () => {
  it('is a canvas screen readers skip, drawing the animation afresh on every frame', async () => {
    const frames = stubAnimationFrames()
    const { container } = render(<WeatherBackdrop kind="rain" dark={false} />)
    expect(container.querySelector('canvas')!.getAttribute('aria-hidden')).toBe('true')
    await frames.frame(1000)
    expect(ctx.calls.filter((c) => c.startsWith('clearRect'))).toHaveLength(1)
    expect(ctx.calls.filter((c) => c.startsWith('stroke'))).toHaveLength(60)
    await frames.frame(1016)
    expect(ctx.calls.filter((c) => c.startsWith('clearRect'))).toHaveLength(2)
  })

  it('softens clouds with gradients rather than blur', async () => {
    const frames = stubAnimationFrames()
    render(<WeatherBackdrop kind="clouds" dark />)
    await frames.frame(1000)
    expect(ctx.calls.filter((c) => c.startsWith('addColorStop'))).toHaveLength(7 * 3)
    expect(ctx.calls.filter((c) => c.startsWith('fill('))).toHaveLength(7)
  })

  it('stops while the page is hidden and starts again when it comes back', async () => {
    const frames = stubAnimationFrames()
    render(<WeatherBackdrop kind="snow" dark />)
    expect(frames.pending).toBe(1)
    await act(() => setVisibility('hidden'))
    expect(frames.pending).toBe(0)
    await act(() => setVisibility('visible'))
    expect(frames.pending).toBe(1)
  })

  it('stops when the popup closes', () => {
    const frames = stubAnimationFrames()
    const { unmount } = render(<WeatherBackdrop kind="stars" dark />)
    unmount()
    expect(frames.pending).toBe(0)
  })

  it('draws nothing, and asks for no frames, where the browser has no canvas', () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(() => null)
    const frames = stubAnimationFrames()
    render(<WeatherBackdrop kind="fog" dark />)
    expect(frames.pending).toBe(0)
  })
})
```

happy-dom's canvas has no 2D context, so the test gives it a stand-in that records what's drawn.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/WeatherBackdrop.test.tsx`
Expected: FAIL with `Error: Failed to resolve import "../../src/ui/WeatherBackdrop" from "tests/ui/WeatherBackdrop.test.tsx". Does the file exist?`

- [x] **Step 3: Implement**

Create `src/ui/WeatherBackdrop.tsx`:

```tsx
import { useEffect, useRef } from 'preact/hooks'
import type { WeatherAnimation } from '../copy/weather'
import { weatherShapes, type ParticleColor, type WeatherShape } from './weatherParticles'

/** The app's cloud and fog grays, Color(red: 0.55, green: 0.6, blue: 0.7) and Color(red: 0.6, green: 0.63, blue: 0.68). */
const SOFT_RGB = { cloud: '140, 153, 179', fog: '153, 161, 173' } as const

type Palette = Record<ParticleColor, string>

/** The particles' colors: the theme's, read where the canvas sits, so they follow the popup's light or dark colors. */
function readPalette(el: Element): Palette {
  const style = getComputedStyle(el)
  const theme = (name: string, fallback: string) => style.getPropertyValue(`--${name}`).trim() || fallback
  return {
    orange: theme('orange', '#ff8d28'),
    yellow: theme('yellow', '#ffcc00'),
    blue: theme('blue', '#0088ff'),
    cyan: theme('cyan', '#00c0e8'),
    white: '#ffffff',
    cloud: `rgb(${SOFT_RGB.cloud})`,
    fog: `rgb(${SOFT_RGB.fog})`,
  }
}

/** Draws one shape. Soft shapes fade out toward their edges, in place of the app's blur, which Safari's canvas lacked before 18. */
function paint(ctx: CanvasRenderingContext2D, shape: WeatherShape, colors: Palette, w: number, h: number) {
  ctx.globalAlpha = shape.alpha
  switch (shape.kind) {
    case 'line':
      ctx.strokeStyle = colors[shape.color]
      ctx.lineWidth = shape.width
      ctx.beginPath()
      ctx.moveTo(shape.x1, shape.y1)
      ctx.lineTo(shape.x2, shape.y2)
      ctx.stroke()
      return
    case 'dot':
      ctx.fillStyle = colors[shape.color]
      ctx.beginPath()
      ctx.arc(shape.x, shape.y, shape.r, 0, Math.PI * 2)
      ctx.fill()
      return
    case 'soft': {
      // A circle of radius 1 stretched over the ellipse plus its blur: solid in the middle, clear at the edge.
      const rgb = SOFT_RGB[shape.color]
      const solid = Math.max(0, (Math.min(shape.rx, shape.ry) - shape.blur) / (Math.min(shape.rx, shape.ry) + shape.blur))
      ctx.save()
      ctx.translate(shape.x, shape.y)
      ctx.scale(shape.rx + shape.blur, shape.ry + shape.blur)
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      gradient.addColorStop(0, `rgba(${rgb}, 1)`)
      gradient.addColorStop(solid, `rgba(${rgb}, 1)`)
      gradient.addColorStop(1, `rgba(${rgb}, 0)`)
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(0, 0, 1, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }
    case 'flash':
      ctx.fillStyle = colors.white
      ctx.fillRect(0, 0, w, h)
      return
    case 'bolt':
      ctx.strokeStyle = colors.white
      ctx.lineWidth = shape.width
      ctx.beginPath()
      shape.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
      ctx.stroke()
      return
  }
}

export interface WeatherBackdropProps {
  kind: WeatherAnimation
  /** Whether the popup is in its dark colors: the particles' colors are read again when it changes. */
  dark: boolean
}

/**
 * The weather animation behind the popup card (slice 2B2 §7), drawn on a canvas each animation frame while the page is
 * visible. The popup leaves it out for reduced motion and when there's no weather.
 */
export function WeatherBackdrop({ kind, dark }: WeatherBackdropProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const colors = readPalette(canvas)
    let raf = 0
    const draw = (now: number) => {
      const ratio = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
        canvas.width = Math.round(w * ratio)
        canvas.height = Math.round(h * ratio)
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.clearRect(0, 0, w, h)
      for (const shape of weatherShapes(kind, now / 1000, w, h)) paint(ctx, shape, colors, w, h)
      raf = requestAnimationFrame(draw)
    }
    const start = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(draw)
    }
    // Browsers hold back frames for hidden pages anyway; this makes sure it stops there and starts again on return.
    const onVisibility = () => (document.visibilityState === 'hidden' ? cancelAnimationFrame(raf) : start())
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [kind, dark])
  return <canvas ref={ref} class="sun-popup-weather" aria-hidden="true" />
}
```

Notes:
- Clouds and fog fade out toward their edges with a radial gradient, because Safari's canvas couldn't blur before version 18 (spec §11 item 5).
- The colors are read from the theme where the canvas sits, so they follow the popup's light or dark set; `dark` reads them again when that changes.
- The drawing is capped at twice the screen's pixel density, to keep large phones smooth.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/WeatherBackdrop.test.tsx`
Expected: PASS, 5 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/ui/WeatherBackdrop.tsx tests/ui/WeatherBackdrop.test.tsx
git commit -m "Weather animations: the canvas behind the popup (slice 2B2 §7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: The card's dial opens the popup

**Files:**
- Create: `src/ui/locationFacts.ts`
- Modify: `src/ui/LocationCard.tsx`, `src/styles/location.css`
- Test: `tests/ui/LocationCard.test.tsx`, `tests/styles/styles.test.ts`

- [x] **Step 1: Write the failing tests**

In `tests/ui/LocationCard.test.tsx`, add `fireEvent` to the Testing Library import:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
```

Then add this test after "puts the sun dial in the corner, named for the city":

```tsx
  it('makes the dial a button that opens the sun popup when the screen gives it one', () => {
    const onOpenSun = vi.fn()
    render(<LocationCard airport="ANC" now={NOW} homeTz={NY} h24={false} airports={testAirports} weather={cloudy} onOpenSun={onOpenSun} />)
    fireEvent.click(screen.getByRole('button', { name: /^Sunrise .+, sunset .+, daytime in Anchorage\. Opens sun details\.$/ }))
    expect(onOpenSun).toHaveBeenCalledTimes(1)
  })
```

In `tests/styles/styles.test.ts`, replace the test "never lets the dial, which overlaps the text, catch a tap" with:

```ts
  it('lets the dial take a tap now that it opens the sun popup, with no button look', () => {
    expect(declarations(find(top, '.sun-dial')!.body).find(([prop]) => prop === 'pointer-events')).toBeUndefined()
    const button = declarations(find(top, 'button.sun-dial')!.body)
    expect(button).toContainEqual(['background', 'none'])
    expect(button).toContainEqual(['border', '0'])
    expect(button).toContainEqual(['padding', '0'])
  })
```

- [x] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/ui/LocationCard.test.tsx tests/styles/styles.test.ts`
Expected: FAIL in two tests. The card has no button yet, and `.sun-dial` still has `pointer-events: none`.

- [x] **Step 3: Implement**

Create `src/ui/locationFacts.ts`. It's the part of the card that works out where the pilot is, moved out so the popup can share it:

```ts
import { countryFlag } from '../copy/flags'
import { weatherVisual, type WeatherVisual } from '../copy/weather'
import type { AirportIndex } from '../data/airports'
import type { Weather } from '../data/weather'
import { isDaytime, sunTimes, type SunTimes } from '../time/sun'

/** What the location card and the sun popup both show about where the pilot is (slice 2B1 §4, slice 2B2 §4). */
export interface LocationFacts {
  /** The city, the airport's code when the list has no city, or "Unknown Location". */
  city: string
  flag: string | null
  /** The airport's time zone, or null when it isn't known. */
  tz: string | null
  /** Today's sunrise and sunset there, or null when the sun neither rises nor sets, or the airport isn't known. */
  sun: SunTimes | null
  /** The weather's words, icon and color, or null without weather. */
  visual: WeatherVisual | null
}

export function locationFacts(airport: string | null, now: number, airports: AirportIndex, weather: Weather | null): LocationFacts {
  const info = airports.get(airport)
  const tz = airports.tz(airport)
  const sun = info && tz ? sunTimes(now, info.lat, info.lng, tz) : null
  return {
    city: airports.city(airport) ?? 'Unknown Location',
    flag: countryFlag(info?.country),
    tz,
    sun,
    // Day or night comes from the sun times, so the weather icon always agrees with the dial, as the app's two do.
    // Open-Meteo's is_day is the fallback where the sun neither rises nor sets that day.
    visual: weather ? weatherVisual(weather.code, sun ? isDaytime(now, sun) : weather.isDay) : null,
  }
}
```

Replace `src/ui/LocationCard.tsx` with this version. It reads the facts from `locationFacts` and passes `onOpenSun` to the dial:

```tsx
import { shortTimeText } from '../copy/format'
import { timeDifference } from '../copy/location'
import { temperatureText } from '../copy/weather'
import type { AirportIndex } from '../data/airports'
import type { Weather } from '../data/weather'
import type { Snapshot } from '../engine/snapshot'
import { cssColor } from './colors'
import { Icon } from './Icon'
import { locationFacts } from './locationFacts'
import { SunDial } from './SunDial'
import { TimeDifferenceLine } from './TimeDifferenceLine'

/** The app shows the location card in every status but flying, where Part C's map will go (slice 2B1 §3). */
export function showsLocationCard(snap: Snapshot): boolean {
  return snap.status.kind !== 'inFlight'
}

export interface LocationCardProps {
  /** Where the pilot is: the snapshot's status.airport, or null when it can't be told. */
  airport: string | null
  now: number
  /** The family's time zone, for "ahead of you" and "behind you". */
  homeTz: string
  h24: boolean
  airports: AirportIndex
  weather: Weather | null
  /** Opens the sun popup: the dial becomes a button (slice 2B2 §3). */
  onOpenSun?: () => void
}

/**
 * LocationCardView's standard view (slice 2B1 §4): the city and flag, the weather, the local time and how far it is
 * from home's, with the sun dial in the upper right. With no airport it's just "Unknown Location", as in the app.
 */
export function LocationCard({ airport, now, homeTz, h24, airports, weather, onOpenSun }: LocationCardProps) {
  const { city, flag, tz, sun, visual } = locationFacts(airport, now, airports, weather)
  return (
    <section class="card glass location">
      <div class="location-body">
        <div class="location-head">
          <Icon name="MapPin" size={22} color="var(--red)" />
          <h2 class="location-city">{city}</h2>
          {flag && <span class="location-flag">{flag}</span>}
        </div>
        {airport &&
          (weather && visual ? (
            <>
              <p class="weather-row">
                <Icon name={visual.icon} size={22} color={cssColor(visual.color)} />
                <span class="weather-temp">{temperatureText(weather.temperature)}</span>
                <span class="weather-words">{visual.words}</span>
              </p>
              <p class="weather-credit">
                <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
                  Weather: Open-Meteo
                  <span class="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
            </>
          ) : (
            <p class="weather-row weather-none">
              <Icon name="Airplane" size={17} />
              <span>{airport}</span>
            </p>
          ))}
        {tz && (
          <div class="location-time">
            <p class="time-row">
              <Icon name="Clock" size={17} color="var(--blue)" />
              <span class="time-label">Current time:</span>
              <span class="time-value">{shortTimeText(now, tz, h24)}</span>
            </p>
            <TimeDifferenceLine diff={timeDifference(now, tz, homeTz)} />
          </div>
        )}
      </div>
      {sun && tz && <SunDial sun={sun} now={now} timeZone={tz} h24={h24} city={city} onOpen={onOpenSun} />}
    </section>
  )
}
```

In `src/styles/location.css`, replace the `.sun-dial` rule with this, which drops `pointer-events: none` and adds the button's rule after it:

```css
.sun-dial {
  position: relative;
  top: -6px;
  justify-self: end;
  align-self: start;
  width: min(160px, 42vw);
  height: min(160px, 42vw);
}

/* On the card the dial is a button that opens the sun popup, as the app's dial takes a tap (slice 2B2 §3): it keeps
   the dial's look, with no gray flash on iOS. */
button.sun-dial {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
```

The dial now takes taps, as the app's does, so its box covers the right side of the card's text. That's the app's layout too, and nothing under it can be tapped: the weather credit sits at the left.

- [x] **Step 4: Run them and watch them pass**

Run: `npx vitest run tests/ui/LocationCard.test.tsx tests/styles/styles.test.ts`
Expected: PASS, 73 tests (30 and 43).

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/ui/locationFacts.ts src/ui/LocationCard.tsx src/styles/location.css tests/ui/LocationCard.test.tsx tests/styles/styles.test.ts
git commit -m "Location card: the dial opens the sun popup (slice 2B2 §3, §9)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: The popup's night colors

**Files:**
- Modify: `src/styles/tokens.css`
- Test: `tests/styles/styles.test.ts`

- [x] **Step 1: Write the failing test**

In `tests/styles/styles.test.ts`, add this block just before `describe('cards.css', () => {`:

```ts
describe('tokens.css: the sun popup’s night colors', () => {
  const top = blocks(css('tokens'))
  const customProperties = (body = '') => new Map(declarations(body).filter(([prop]) => prop.startsWith('--')))
  const dark = customProperties(find(blocks(find(top, '@media (prefers-color-scheme: dark)')?.body ?? ''), ':root')?.body)
  const forced = find(top, '.force-dark')

  it('are the page’s dark colors exactly, every one of them', () => {
    expect(forced).toBeDefined()
    expect(customProperties(forced!.body)).toEqual(dark)
  })

  it('tell the browser the card is dark, for its own controls and scroll bars', () => {
    expect(declarations(forced!.body)).toContainEqual(['color-scheme', 'dark'])
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/styles/styles.test.ts`
Expected: FAIL in the two new tests: there's no `.force-dark` block yet.

- [x] **Step 3: Implement**

Add this to the end of `src/styles/tokens.css`:

```css

/* The sun popup's card at night (slice 2B2 §4): the dark colors above, whatever the device's setting. They must stay
   identical to the prefers-color-scheme: dark block; a test checks. */
.force-dark {
  color-scheme: dark;
  --bg: #000000;
  --text: #ffffff;
  --text-2: rgba(235, 235, 245, 0.6);
  --green: #30d158;
  --blue: #0091ff;
  --red: #ff4245;
  --orange: #ff9230;
  --purple: #db34f2;
  --pink: #ff375f;
  --yellow: #ffd600;
  --teal: #00d2e0;
  --cyan: #3cd3fe;
  --indigo: #6d7cff;
  --ups: #e09e33;
  --glass-fill: rgba(44, 44, 46, 0.6);
  --glass-edge: rgba(255, 255, 255, 0.08);
  --glass-rim: rgba(255, 255, 255, 0.12);
  --glass-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}
```

The popup adds `force-dark` to its card at night, so the card is dark then whatever the device's setting, as the app's is (spec §4). By day the card follows the device. The card sets `color: var(--text)` itself (Task 17), so its text picks up these values rather than the page's.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/styles/styles.test.ts`
Expected: PASS, 45 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/styles/tokens.css tests/styles/styles.test.ts
git commit -m "Colors: the popup's night set, the page's dark colors exactly (slice 2B2 §9)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: The popup

**Files:**
- Create: `src/ui/motion.ts`, `src/ui/SunPopup.tsx`
- Test: `tests/ui/SunPopup.test.tsx`

- [x] **Step 1: Write the failing test**

Create `tests/ui/SunPopup.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Weather } from '../../src/data/weather'
import { CLOSE_MS, SunPopup, type SunPopupProps } from '../../src/ui/SunPopup'
import { HOUR, MINUTE } from '../../src/time/zoned'
import { testAirports } from '../fixtures/airports'
import { iconNameOf, stubAnimationFrames } from '../fixtures/ui'

const NY = 'America/New_York'
const NIGHT = Date.UTC(2026, 9, 11, 6, 5) // 10:05 PM in Anchorage, 2:05 AM in New York
const DAYTIME = Date.UTC(2026, 9, 10, 21, 14) // 1:14 PM in Anchorage
const cloudy: Weather = { temperature: 41.2, code: 3, isDay: false }
const scheduled = NIGHT + 5 * HOUR + 20 * MINUTE

const props = (over: Partial<SunPopupProps> = {}): SunPopupProps => ({
  airport: 'ANC',
  now: NIGHT,
  homeTz: NY,
  homeAirport: 'LEX',
  h24: false,
  airports: testAirports,
  weather: cloudy,
  departure: { scheduled, actual: scheduled },
  onClose: () => {},
  ...over,
})
const popup = (over: Partial<SunPopupProps> = {}) => <SunPopup {...props(over)} />
const reduceMotion = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
const text = (container: Element, selector: string) => container.querySelector(selector)!.textContent

beforeEach(() => {
  // No canvas in happy-dom: the weather animation draws nothing, but its canvas is there.
  stubAnimationFrames()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('SunPopup', () => {
  it('is a dialog named for the city, with the two clocks and the big dial', () => {
    const { container } = render(popup())
    const dialog = screen.getByRole('dialog', { name: 'Anchorage' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    const [local, home] = [...container.querySelectorAll('.sun-popup-time')]
    expect(local.textContent).toBe('Local time 10:05\u202FPM')
    expect(home.textContent).toBe('Time at home 2:05\u202FAM')
    expect(
      screen.getByRole('img', {
        name: 'Sunrise 8:30\u202FAM, sunset 7:03\u202FPM, nighttime in Anchorage, 4 hours behind you. Next departure 3:25\u202FAM, in 5 hours, 20 minutes.',
      }),
    ).toBeTruthy()
    expect(container.querySelector('.sun-dial')!.getAttribute('class')).toBe('sun-dial big')
  })

  it('shows the weather, the daylight, sunrise and sunset, the moon, the place and the credit', () => {
    const { container } = render(popup())
    expect(iconNameOf(container.querySelector('.sun-popup-weather-row svg'))).toBe('Cloud')
    expect(container.querySelector('.sun-popup-weather-row svg')!.getAttribute('width')).toBe('28')
    expect(text(container, '.sun-popup-temp')).toBe('41°')
    expect(text(container, '.sun-popup-words')).toBe('Cloudy')
    const rows = [...container.querySelectorAll('.sun-popup-row')].map((row) => row.textContent)
    expect(rows).toEqual(['10h 32m of daylight', 'Sunrise 8:30\u202FAMSunset 7:03\u202FPM', 'New Moon', 'In Anchorage'])
    expect(screen.getByRole('link', { name: 'Weather: Open-Meteo (opens in a new tab)' }).getAttribute('href')).toBe('https://open-meteo.com/')
  })

  it('draws the app’s icons: the pin, the close button, the clocks’ sun or moon and house, and the rows’', () => {
    const { container } = render(popup())
    const icon = (selector: string) => iconNameOf(container.querySelector(selector))
    expect(icon('.sun-popup-head > svg')).toBe('MapPin')
    expect(iconNameOf(screen.getByRole('button', { name: 'Close' }).querySelector('svg'))).toBe('XCircle')
    const [local, home] = [...container.querySelectorAll('.sun-popup-time svg')] as SVGElement[]
    expect([iconNameOf(local), local.style.color, local.getAttribute('width')]).toEqual(['Moon', 'var(--indigo)', '15'])
    expect([iconNameOf(home), home.style.color]).toEqual(['House', 'var(--green)'])
    expect(icon('.sun-popup-sunrise svg')).toBe('SunHorizon')
    expect(icon('.sun-popup-sunset svg')).toBe('SunHorizon')
    expect(icon('.sun-popup-where svg')).toBe('MapPinArea')
    expect(container.querySelector('.sun-popup-moon .moon-phase')).not.toBeNull()
  })

  it('shows the sun in the clock row by day, and follows the visitor’s 24-hour clock', () => {
    const { container } = render(popup({ now: DAYTIME, h24: true }))
    const local = container.querySelector('.sun-popup-time svg') as SVGElement
    expect([iconNameOf(local), local.style.color]).toEqual(['Sun', 'var(--orange)'])
    expect([...container.querySelectorAll('.sun-popup-time')].map((t) => t.textContent)).toEqual(['Local time 13:14', 'Time at home 17:14'])
    expect(text(container, '.sun-popup-sunrise')).toBe('Sunrise 08:30')
  })

  it('is dark at night whatever the device, and follows the device by day', () => {
    const { container, rerender } = render(popup())
    expect(container.querySelector('.sun-popup-card')!.classList.contains('force-dark')).toBe(true)
    rerender(popup({ now: DAYTIME }))
    expect(container.querySelector('.sun-popup-card')!.classList.contains('force-dark')).toBe(false)
  })

  it('lays home’s shared daylight on the dial from home’s airport, and none without one', () => {
    const { container, rerender } = render(popup())
    expect(container.querySelectorAll('.sun-shared')).toHaveLength(1)
    rerender(popup({ homeAirport: null }))
    expect(container.querySelectorAll('.sun-shared')).toHaveLength(0)
  })

  it('plays the weather animation behind the card', () => {
    const { container } = render(popup())
    expect(container.querySelector('.sun-popup-card > canvas.sun-popup-weather')).not.toBeNull()
  })

  it('leaves out the weather row, the credit and the animation without weather, and keeps the rest', () => {
    const { container } = render(popup({ weather: null }))
    expect(container.querySelector('.sun-popup-weather-row')).toBeNull()
    expect(container.querySelector('canvas')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
    expect(container.querySelectorAll('.sun-popup-row')).toHaveLength(4)
    expect(container.querySelector('.sun-dial.big')).not.toBeNull()
  })
})

describe('SunPopup: opening and closing', () => {
  it('moves focus to the close button and stops the page scrolling, then puts both back', async () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const { unmount } = render(popup())
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
    // Focus goes back just after the page stops being inert, at the end of the render that closes the popup.
    await new Promise((resolve) => setTimeout(resolve))
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it.each([
    ['the close button', () => fireEvent.click(screen.getByRole('button', { name: 'Close' }))],
    ['the Escape key', () => fireEvent.keyDown(document, { key: 'Escape' })],
    ['a tap on the backdrop', () => fireEvent.click(document.querySelector('.sun-popup-backdrop')!)],
  ])('closes by %s, fading out over 0.2 s first', async (_how, ask) => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const { container } = render(popup({ onClose }))
    ask()
    await act(() => {})
    expect(container.querySelector('.sun-popup')!.classList.contains('closing')).toBe(true)
    expect(onClose).not.toHaveBeenCalled()
    vi.advanceTimersByTime(CLOSE_MS)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes only once, however often it’s asked', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(popup({ onClose }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    vi.advanceTimersByTime(CLOSE_MS * 3)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the card is dragged down more than 100 px, following the drag', async () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const { container } = render(popup({ onClose }))
    const grab = container.querySelector('.sun-popup-grab')!
    const card = container.querySelector('.sun-popup-card') as HTMLElement
    fireEvent.pointerDown(grab, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(grab, { clientY: 260, pointerId: 1 })
    await act(() => {})
    expect(card.style.transform).toBe('translateY(160px)')
    expect(card.classList.contains('dragging')).toBe(true)
    fireEvent.pointerUp(grab, { clientY: 260, pointerId: 1 })
    vi.advanceTimersByTime(CLOSE_MS)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('springs back from a shorter drag, or one the browser cancels', async () => {
    const onClose = vi.fn()
    const { container } = render(popup({ onClose }))
    const grab = container.querySelector('.sun-popup-grab')!
    const card = container.querySelector('.sun-popup-card') as HTMLElement
    fireEvent.pointerDown(grab, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(grab, { clientY: 180, pointerId: 1 })
    fireEvent.pointerUp(grab, { clientY: 180, pointerId: 1 })
    await act(() => {})
    expect(card.style.transform).toBe('')
    expect(card.classList.contains('dragging')).toBe(false)
    fireEvent.pointerDown(grab, { clientY: 100, pointerId: 2 })
    fireEvent.pointerMove(grab, { clientY: 400, pointerId: 2 })
    fireEvent.pointerCancel(grab, { clientY: 400, pointerId: 2 })
    await act(() => {})
    expect(card.style.transform).toBe('')
    expect(container.querySelector('.sun-popup')!.classList.contains('closing')).toBe(false)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('never drags up, and never starts a drag on the close button', async () => {
    const { container } = render(popup())
    const grab = container.querySelector('.sun-popup-grab')!
    const card = container.querySelector('.sun-popup-card') as HTMLElement
    fireEvent.pointerDown(grab, { clientY: 300, pointerId: 1 })
    fireEvent.pointerMove(grab, { clientY: 100, pointerId: 1 })
    await act(() => {})
    expect(card.style.transform).toBe('')
    fireEvent.pointerUp(grab, { clientY: 100, pointerId: 1 })
    const close = screen.getByRole('button', { name: 'Close' })
    fireEvent.pointerDown(close, { clientY: 100, pointerId: 3 })
    fireEvent.pointerMove(grab, { clientY: 300, pointerId: 3 })
    await act(() => {})
    expect(card.style.transform).toBe('')
  })

  it('keeps Tab inside: past the last link back to the close button, and Shift-Tab the other way', () => {
    render(popup())
    const close = screen.getByRole('button', { name: 'Close' })
    const link = screen.getByRole('link')
    link.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(close)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(link)
  })

  it('appears and goes at once for reduced motion, with no animation and a still dial', () => {
    reduceMotion()
    const frames = stubAnimationFrames()
    const onClose = vi.fn()
    const { container } = render(popup({ onClose }))
    expect(container.querySelector('canvas')).toBeNull()
    expect(frames.pending).toBe(0)
    expect(container.querySelector('.sun-sweep-solid')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
```

At 10:05 PM in Anchorage the card is dark; at 1:14 PM it follows the device. The times and the daylight are what the site's own sun formulas give for that day (sunrise 8:30 AM, sunset 7:03 PM), and the moon is new.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/SunPopup.test.tsx`
Expected: FAIL with `Error: Failed to resolve import "../../src/ui/SunPopup" from "tests/ui/SunPopup.test.tsx". Does the file exist?`

- [x] **Step 3: Implement**

Create `src/ui/motion.ts`:

```ts
/** Whether the visitor asks for reduced motion. The sun popup reads it once, as it opens. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}
```

Create `src/ui/SunPopup.tsx`:

```tsx
import { useEffect, useId, useRef, useState } from 'preact/hooks'
import { shortTimeText } from '../copy/format'
import { daylightText, moonPhaseName, type DialDeparture } from '../copy/sunDetail'
import { temperatureText, weatherAnimation } from '../copy/weather'
import type { AirportIndex } from '../data/airports'
import type { Weather } from '../data/weather'
import { moonPhase } from '../time/moon'
import { isDaytime, sunTimes } from '../time/sun'
import { cssColor } from './colors'
import { Icon } from './Icon'
import { locationFacts } from './locationFacts'
import { MoonPhaseIcon } from './MoonPhaseIcon'
import { prefersReducedMotion } from './motion'
import { SunDial } from './SunDial'
import { WeatherBackdrop } from './WeatherBackdrop'

/** Closing fades everything out over 0.2 s, as the app's dismissView does, before the popup goes. */
export const CLOSE_MS = 200
/** A drag down further than this closes the popup; a shorter one springs back. */
export const DRAG_CLOSE_PX = 100

export interface SunPopupProps {
  /** Where the pilot is. */
  airport: string
  now: number
  /** The family's time zone. */
  homeTz: string
  /** Home's airport, for home's sunrise and sunset, or null when it isn't known. */
  homeAirport: string | null
  h24: boolean
  airports: AirportIndex
  weather: Weather | null
  departure: DialDeparture | null
  /** Called once the popup has finished closing. */
  onClose: () => void
}

/**
 * The sun popup (slice 2B2 §3, §4): SunCircleDetailView. It covers the page, with the city, the two clocks, the big
 * dial, the weather, and the daylight, moon and place rows on a card that's light by day on a light device and dark
 * otherwise. The screen draws it outside <main> and hides the page from screen readers while it's open.
 */
export function SunPopup(p: SunPopupProps) {
  const titleId = useId()
  const card = useRef<HTMLElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const [still] = useState(prefersReducedMotion)
  const [closing, setClosing] = useState(false)
  const closed = useRef(false)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragFrom = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const close = () => {
    if (closed.current) return
    closed.current = true
    if (still) return p.onClose()
    setClosing(true)
    timer.current = setTimeout(p.onClose, CLOSE_MS)
  }
  // The keyboard listener lives as long as the popup, so it reaches the newest close through a ref.
  const latestClose = useRef(close)
  latestClose.current = close

  useEffect(() => {
    // Focus moves to the close button and comes back to whatever opened the popup; the page behind doesn't scroll.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButton.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        latestClose.current()
      } else if (e.key === 'Tab' && card.current) {
        keepFocusInside(card.current, e)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      clearTimeout(timer.current)
      document.body.style.overflow = overflow
      // Preact takes the popup away before it makes the page usable again, and nothing in an inert page can take
      // focus, so focus goes back once this render is done.
      setTimeout(() => {
        if (opener?.isConnected) opener.focus()
      })
    }
  }, [])

  const { city, tz, sun, visual } = locationFacts(p.airport, p.now, p.airports, p.weather)
  if (!tz || !sun) return null
  const home = p.airports.get(p.homeAirport)
  const homeZone = p.airports.tz(p.homeAirport)
  const homeSun = home && homeZone ? sunTimes(p.now, home.lat, home.lng, homeZone) : null
  const day = isDaytime(p.now, sun)

  // Dragging the top of the card down: past 100 px it closes, otherwise it springs back.
  const onPointerDown = (e: PointerEvent) => {
    if (e.target instanceof Element && e.target.closest('button')) return
    dragFrom.current = e.clientY
    setDragging(true)
    const grab = e.currentTarget as Element
    if (grab.setPointerCapture) grab.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent) => {
    if (dragFrom.current != null) setDrag(Math.max(0, e.clientY - dragFrom.current))
  }
  const endDrag = (e: PointerEvent, release: boolean) => {
    if (dragFrom.current == null) return
    const moved = e.clientY - dragFrom.current
    dragFrom.current = null
    setDragging(false)
    if (release && moved > DRAG_CLOSE_PX) close()
    else setDrag(0)
  }

  return (
    <div class={closing ? 'sun-popup closing' : 'sun-popup'}>
      <div class="sun-popup-backdrop" onClick={close} />
      <section
        ref={card}
        class={`sun-popup-card glass${day ? '' : ' force-dark'}${dragging ? ' dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={drag ? { transform: `translateY(${drag}px)` } : undefined}
      >
        {p.weather && !still && <WeatherBackdrop kind={weatherAnimation(p.weather.code, day)} dark={!day} />}
        <div class="sun-popup-scroll">
          <div
            class="sun-popup-grab"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => endDrag(e, true)}
            onPointerCancel={(e) => endDrag(e, false)}
          >
            <div class="sun-popup-handle" />
            <div class="sun-popup-head">
              <Icon name="MapPin" size={20} color="var(--red)" />
              <h2 id={titleId} class="sun-popup-city">
                {city}
              </h2>
              <button ref={closeButton} type="button" class="sun-popup-close" aria-label="Close" onClick={close}>
                <Icon name="XCircle" size={22} />
              </button>
            </div>
          </div>
          <div class="sun-popup-times">
            <p class="sun-popup-time">
              <Icon name={day ? 'Sun' : 'Moon'} size={15} color={day ? 'var(--orange)' : 'var(--indigo)'} />
              <span class="sr-only">Local time </span>
              {shortTimeText(p.now, tz, p.h24)}
            </p>
            <p class="sun-popup-time">
              <span class="sr-only">Time at home </span>
              {shortTimeText(p.now, p.homeTz, p.h24)}
              <Icon name="House" size={15} color="var(--green)" />
            </p>
          </div>
          <SunDial
            sun={sun}
            now={p.now}
            timeZone={tz}
            h24={p.h24}
            city={city}
            size={360}
            detail={{ homeTz: p.homeTz, homeSun, departure: p.departure, still }}
          />
          {p.weather && visual && (
            <p class="sun-popup-weather-row">
              <Icon name={visual.icon} size={28} color={cssColor(visual.color)} />
              <span class="sun-popup-temp">{temperatureText(p.weather.temperature)}</span>
              <span class="sun-popup-words">{visual.words}</span>
            </p>
          )}
          <hr class="sun-popup-divider" />
          <div class="sun-popup-rows">
            <p class="sun-popup-row">
              <Icon name="Sun" size={17} color="var(--orange)" />
              <span class="sun-popup-strong">{daylightText(sun)}</span>
            </p>
            <p class="sun-popup-row sun-popup-sun-times">
              <span class="sun-popup-sunrise">
                <Icon name="SunHorizon" size={15} />
                <span class="sr-only">Sunrise </span>
                {shortTimeText(sun.sunrise, tz, p.h24)}
              </span>
              <span class="sun-popup-sunset">
                <Icon name="SunHorizon" size={15} />
                <span class="sr-only">Sunset </span>
                {shortTimeText(sun.sunset, tz, p.h24)}
              </span>
            </p>
            <p class="sun-popup-row sun-popup-moon">
              <MoonPhaseIcon t={p.now} />
              <span class="sun-popup-strong">{moonPhaseName(moonPhase(p.now))}</span>
            </p>
            <p class="sun-popup-row sun-popup-where">
              <Icon name="MapPinArea" size={17} color="var(--red)" />
              <span>In {city}</span>
            </p>
            {p.weather && (
              <p class="weather-credit sun-popup-credit">
                <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
                  Weather: Open-Meteo
                  <span class="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

/** Tab and Shift-Tab go round the popup's buttons and links instead of leaving it. */
function keepFocusInside(container: HTMLElement, e: KeyboardEvent) {
  const stops = [...container.querySelectorAll<HTMLElement>('button, a[href]')]
  if (stops.length === 0) return
  const first = stops[0]
  const last = stops[stops.length - 1]
  const active = document.activeElement
  const outside = !(active instanceof Node) || !container.contains(active)
  if (e.shiftKey ? outside || active === first : outside || active === last) {
    e.preventDefault()
    ;(e.shiftKey ? last : first).focus()
  }
}
```

How it copies `SunCircleDetailView`, and where it has to differ:
- **Layout:** the drag handle, the header with the close button, the two clocks, the big dial, the weather, a divider and the rows, with the app's sizes and gaps. The screen-reader words "Local time", "Time at home", "Sunrise" and "Sunset" are hidden prefixes, since the site's icons are hidden from screen readers.
- **Light and dark:** the card gets `force-dark` at night (Task 15), so it's light only by day on a light device (spec §4).
- **Opening:** focus moves to the close button and the page stops scrolling. Escape, the close button and the backdrop all close it, once, after the 0.2 s fade (spec §3).
- **The drag** starts on the handle and the header only, which have `touch-action: none` (Task 17). The rest of the card may need to scroll on a short screen, and a browser can't tell a scroll from a drag that starts there. A press on the close button is left to the button.
- **Focus goes back** once the render that closes the popup is done. Preact takes the popup away before it lifts `inert` from `<main>`, and nothing in an inert page can take focus. The browser check in the scratch copy found this; happy-dom doesn't enforce `inert`, so the unit test can only check that focus comes back.
- **Reduced motion** is read once, as the popup opens: no weather canvas, a still dial, and it closes at once (spec §11 item 6).

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/SunPopup.test.tsx`
Expected: PASS, 18 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/ui/motion.ts src/ui/SunPopup.tsx tests/ui/SunPopup.test.tsx
git commit -m "Sun popup: the card, its rows, opening and closing (slice 2B2 §3, §4, §6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: The popup's styles

**Files:**
- Create: `src/styles/sunPopup.css`
- Modify: `src/main.tsx`
- Test: `tests/styles/styles.test.ts`

- [x] **Step 1: Write the failing test**

In `tests/styles/styles.test.ts`, add these two blocks just before `describe('full-height blocks', () => {`:

```ts
describe('sunPopup.css', () => {
  const top = blocks(css('sunPopup'))
  const rule = (head: string) => declarations(find(rulesIn(css('sunPopup')), head)!.body)

  it('makes the card up to 360 px wide with a 28 px corner radius, leaving 8 px of screen around it', () => {
    expect(rule('.sun-popup-card')).toEqual(expect.arrayContaining([['width', 'min(360px, 100%)'], ['border-radius', '28px']]))
    expect(rule('.sun-popup').find(([prop]) => prop === 'padding')?.[1]).toMatch(/^max\(8px, env\(safe-area-inset-top\)\)/)
  })

  it('keeps the big dial square at the card’s full width, without aspect-ratio, which Safari 14 lacks', () => {
    expect(rule('.sun-dial.big')).toEqual(expect.arrayContaining([['width', '100%'], ['height', '0'], ['padding-bottom', '100%']]))
  })

  it('dims the page with black at 30%', () => {
    expect(rule('.sun-popup-backdrop')).toContainEqual(['background', 'rgba(0, 0, 0, 0.3)'])
  })

  it('turns off the zoom, the fades and the spring back for people who prefer reduced motion', () => {
    const media = find(top, '@media (prefers-reduced-motion: reduce)')
    expect(media).toBeDefined()
    const inside = blocks(media!.body)
    expect(declarations(find(inside, '.sun-popup-backdrop, .sun-popup-card, .sun-popup .sun-dial.big')!.body)).toContainEqual(['animation', 'none'])
    const still = find(inside, '.sun-popup-card, .sun-popup.closing .sun-popup-backdrop, .sun-popup.closing .sun-popup-card, .sun-popup.closing .sun-dial.big')
    expect(declarations(still!.body)).toContainEqual(['transition', 'none'])
  })

  it('closes in 0.2 s, ease-out', () => {
    expect(rule('.sun-popup.closing .sun-popup-backdrop, .sun-popup.closing .sun-popup-card')).toContainEqual(['transition', 'opacity 0.2s ease-out'])
  })
})

describe('backdrop blurs', () => {
  it('come with the -webkit- name first, which Safari needs before version 18', () => {
    let blurs = 0
    for (const name of STYLESHEETS) {
      for (const r of rulesIn(css(name))) {
        const props = declarations(r.body).map(([prop]) => prop)
        props.forEach((prop, i) => {
          if (prop === 'backdrop-filter') {
            expect(props[i - 1], `${name}.css ${r.head}: backdrop-filter needs -webkit-backdrop-filter just before it`).toBe('-webkit-backdrop-filter')
            blurs++
          }
        })
      }
    }
    expect(blurs).toBeGreaterThanOrEqual(2) // the cards' glass and the sun popup's backdrop
  })
})
```

The existing test "imports every stylesheet in src/styles" will also check that `src/main.tsx` imports the new file.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/styles/styles.test.ts`
Expected: FAIL with `ENOENT: no such file or directory` for `src/styles/sunPopup.css`.

- [x] **Step 3: Implement**

Create `src/styles/sunPopup.css`:

```css
/* The sun popup (slice 2B2): the app's SunCircleDetailView, with the big sun dial's own layers. */

/* It covers the page, centering the card with at least 8 px of screen around it. */
.sun-popup {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom))
    max(8px, env(safe-area-inset-left));
}

/* Black at 30% over a blur of the page. touch-action keeps a drag here from scrolling the page behind on iOS. */
.sun-popup-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  touch-action: none;
}

/* Up to 360 px wide with a 28 px corner radius, frosted glass, and the app's shadow (black 20%, 20 px blur, 10 px down).
   color picks up the card's own colors, which are forced dark at night. */
.sun-popup-card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(360px, 100%);
  max-height: 100%;
  border-radius: 28px;
  overflow: hidden;
  color: var(--text);
  box-shadow: inset 0 1px 0 var(--glass-rim), 0 10px 20px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s cubic-bezier(0.2, 1.2, 0.4, 1);
}

.sun-popup-card.dragging {
  transition: none;
}

/* The weather animation fills the card behind its contents, and stays put while they scroll. */
.sun-popup-weather {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* The contents scroll inside the card when the screen is short; position puts them over the animation. */
.sun-popup-scroll {
  position: relative;
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* The drag handle and the header are where a drag down starts. */
.sun-popup-grab {
  touch-action: none;
  cursor: grab;
}

.sun-popup-handle {
  width: 36px;
  height: 5px;
  margin: 12px auto 8px;
  border-radius: 2.5px;
  background: var(--text-2);
  opacity: 0.4;
}

.sun-popup-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px 4px;
}

.sun-popup-city {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 20px;
  line-height: 25px;
  font-weight: 600;
}

/* The 22 px close icon, with a bigger area to tap that doesn't move it. */
.sun-popup-close {
  display: flex;
  margin: -6px;
  padding: 6px;
  border: 0;
  background: none;
  color: var(--text-2);
  cursor: pointer;
}

/* The pilot's time at the left and home's at the right: 20 px semibold rounded, with steady digits. */
.sun-popup-times {
  display: flex;
  justify-content: space-between;
  padding: 0 20px 8px;
}

.sun-popup-time {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  font-family: var(--font-rounded);
  font-size: 20px;
  line-height: 25px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* Weather: the 28 px icon, the temperature (22 px bold) and the words (15 px, secondary), 12 px apart. */
.sun-popup-weather-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 8px 0 0;
}

.sun-popup-temp {
  font-size: 22px;
  line-height: 28px;
  font-weight: 700;
}

.sun-popup-words {
  font-size: 15px;
  line-height: 20px;
  color: var(--text-2);
}

.sun-popup-divider {
  margin: 12px 24px;
  border: 0;
  border-top: 0.5px solid var(--text-2);
  opacity: 0.5;
}

/* The rows: 15 px, 12 px apart, 24 px below the last. */
.sun-popup-rows {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 0 20px 24px;
}

.sun-popup-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 15px;
  line-height: 20px;
}

.sun-popup-strong {
  font-weight: 500;
}

/* Sunrise in orange and sunset in indigo, icon and time alike, 24 px apart. */
.sun-popup-sun-times {
  gap: 24px;
}

.sun-popup-sunrise,
.sun-popup-sunset {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sun-popup-sunrise {
  color: var(--orange);
}

.sun-popup-sunset {
  color: var(--indigo);
}

.sun-popup-moon .moon-phase,
.sun-popup-where {
  color: var(--text-2);
}

.sun-popup-credit {
  margin-top: 4px;
}

/* The big dial fills the card's width, square. */
.sun-dial.big {
  top: 0;
  width: 100%;
  height: 0;
  padding-bottom: 100%;
}

/* Its own layers (slice 2B2 §5), in the dial's 160-point drawing, so they scale with it. */
.sun-shared-wedge {
  fill: var(--yellow);
  fill-opacity: 0.15;
}

.sun-shared {
  fill: none;
  stroke: #ffffff;
  stroke-opacity: 0.8;
  stroke-width: 3.75;
  stroke-linecap: round;
}

.sun-hand.departure {
  stroke: var(--cyan);
  stroke-opacity: 0.4;
}

.sun-hand.delay {
  stroke: var(--red);
  stroke-opacity: 0.4;
}

.sun-home-line {
  stroke: var(--green);
  stroke-opacity: 0.6;
  stroke-width: 0.8;
  stroke-dasharray: 4 3;
}

.sun-departure-marker {
  fill: var(--cyan);
  fill-opacity: 0.4;
}

.sun-house {
  color: var(--green);
}

.sun-plane.departure,
.sun-plane.on-time {
  color: var(--cyan);
}

.sun-plane.delay,
.sun-plane.late {
  color: var(--red);
}

.sun-plane.early {
  color: var(--green);
}

.sun-time.departure {
  fill: var(--cyan);
}

.sun-time.delay {
  fill: var(--red);
}

/* The home-time arrow: blue when the pilot is ahead, orange when behind, at 70%. */
.sun-arrow.ahead {
  color: var(--blue);
}

.sun-arrow.behind {
  color: var(--orange);
}

.sun-arrow-arc {
  fill: none;
  stroke: currentColor;
  stroke-opacity: 0.7;
  stroke-width: 2;
  stroke-linecap: round;
}

.sun-arrow-head {
  fill: currentColor;
  fill-opacity: 0.7;
}

/* The departure sweep: cyan at 70%, dashed for each full day, red at 80% past the scheduled time. */
.sun-sweep path {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
}

.sun-sweep-laps,
.sun-sweep-solid {
  stroke: var(--cyan);
  stroke-opacity: 0.7;
}

.sun-sweep-laps {
  stroke-dasharray: 4 3;
}

.sun-sweep-delay {
  stroke: var(--red);
  stroke-opacity: 0.8;
}

/* The middle: 10-point semibold over 7-point medium, rounded, in the turn's color. */
.sun-dial .sun-middle text {
  font-family: var(--font-rounded);
}

.sun-middle-big {
  font-size: 10px;
  font-weight: 600;
}

.sun-middle-small {
  font-size: 7px;
  font-weight: 500;
}

.sun-middle.ahead {
  fill: var(--blue);
}

.sun-middle.behind {
  fill: var(--orange);
}

.sun-middle.on-time {
  fill: var(--cyan);
}

.sun-middle.late {
  fill: var(--red);
}

.sun-middle.early {
  fill: var(--green);
}

/* Opening: the backdrop and the card fade in while the dial grows from half size, on SwiftUI's
   spring(response: 0.5, dampingFraction: 0.7), sampled every 0.1 s: a little past full size, then back. */
.sun-popup-backdrop,
.sun-popup-card {
  animation: sun-popup-fade 0.6s linear;
}

.sun-popup .sun-dial.big {
  animation: sun-popup-zoom 0.6s linear;
}

@keyframes sun-popup-fade {
  0% {
    opacity: 0;
  }
  17% {
    opacity: 0.423;
  }
  33% {
    opacity: 0.874;
  }
  50% {
    opacity: 1;
  }
}

@keyframes sun-popup-zoom {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  17% {
    transform: scale(0.712);
    opacity: 0.423;
  }
  33% {
    transform: scale(0.937);
    opacity: 0.874;
  }
  50% {
    transform: scale(1.017);
    opacity: 1;
  }
  67% {
    transform: scale(1.02);
  }
  83% {
    transform: scale(1.007);
  }
  100% {
    transform: none;
  }
}

/* Closing: 0.2 s, ease-out, back to nothing. */
.sun-popup.closing .sun-popup-backdrop,
.sun-popup.closing .sun-popup-card {
  opacity: 0;
  transition: opacity 0.2s ease-out;
}

.sun-popup.closing .sun-dial.big {
  opacity: 0;
  transform: scale(0.5);
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .sun-popup-backdrop,
  .sun-popup-card,
  .sun-popup .sun-dial.big {
    animation: none;
  }

  .sun-popup-card,
  .sun-popup.closing .sun-popup-backdrop,
  .sun-popup.closing .sun-popup-card,
  .sun-popup.closing .sun-dial.big {
    transition: none;
  }
}
```

In `src/main.tsx`, import it after `location.css`:

```tsx
import './styles/location.css'
import './styles/sunPopup.css'
```

Notes:
- The big dial stays square with `height: 0` and `padding-bottom: 100%`, because Safari 14 has no `aspect-ratio`. Its parts are already placed in percentages, so they fill the square.
- Everything inside the dial's drawing is in its 160-point box, so the browser scales the layers' widths, dashes and text by 2.25 at 360, as the app scales each measurement.
- The zoom samples SwiftUI's `spring(response: 0.5, dampingFraction: 0.7)` every 0.1 s. It overshoots to 1.02 and settles in 0.6 s.
- The spring back after a short drag is a CSS transition that overshoots slightly, like the app's `spring(response: 0.3, dampingFraction: 0.7)`.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/styles/styles.test.ts`
Expected: PASS, 51 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/styles/sunPopup.css src/main.tsx tests/styles/styles.test.ts
git commit -m "Sun popup: styles, the big dial's layers and the zoom (slice 2B2 §4, §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: The screen opens the popup

**Files:**
- Modify: `src/ui/StatusScreen.tsx`
- Test: `tests/ui/StatusScreen.test.tsx`

- [x] **Step 1: Write the failing test**

In `tests/ui/StatusScreen.test.tsx`, add `fireEvent` to the Testing Library import:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
```

Then add this block just before `describe('the location card in each demo scene', () => {`:

```tsx
describe('StatusScreen sun popup (slice 2B2)', () => {
  const rockford: Weather = { temperature: 61, code: 3, isDay: true }
  const turnAt = (minutes = 180) => {
    const now = at(minutes)
    return (
      <StatusScreen snap={makeSnapshot(e.schedule, e.legs, now, NY)} now={now} viewerTz={NY} homeTz={NY} h24={false} airports={testAirports}
        weather={rockford} demo={false} celebrateKey={0} footer={footer(now)} />
    )
  }
  const openDial = () => fireEvent.click(screen.getByRole('button', { name: /\. Opens sun details\.$/ }))

  it('opens from the location card’s dial, after <main>, and hides the page behind it', () => {
    const { container } = render(turnAt())
    const main = container.querySelector('main')!
    expect(screen.queryByRole('dialog')).toBeNull()
    openDial()
    const dialog = screen.getByRole('dialog', { name: 'Rockford' })
    expect(main.contains(dialog)).toBe(false)
    expect(main.compareDocumentPosition(dialog) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(main.getAttribute('aria-hidden')).toBe('true')
    expect(main.hasAttribute('inert')).toBe(true)
  })

  it('counts down to the snapshot’s next flight on the big dial', () => {
    render(turnAt())
    openDial()
    expect(screen.getByRole('img', { name: /Next departure .+, in .+\.$/ })).toBeTruthy()
  })

  it('shows the page again once the popup has closed', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
    const { container } = render(turnAt())
    openDial()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    const main = container.querySelector('main')!
    expect(main.getAttribute('aria-hidden')).toBeNull()
    expect(main.hasAttribute('inert')).toBe(false)
  })

  it('closes by itself when the dial goes away at takeoff, and stays closed when it comes back', () => {
    const { rerender } = render(turnAt())
    openDial()
    expect(screen.getByRole('dialog')).toBeTruthy()
    rerender(turnAt(100))
    expect(screen.queryByRole('dialog')).toBeNull()
    rerender(turnAt())
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
```

At minute 180 of the demo's driver schedule the pilot is on a turn at Rockford, in daylight, with the next flight ahead; at minute 100 the pilot is flying and the card is gone.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/StatusScreen.test.tsx`
Expected: FAIL. The 37 existing tests pass; the 4 new ones fail, since the card's dial isn't a button until the screen gives it `onOpenSun`.

- [x] **Step 3: Implement**

Replace `src/ui/StatusScreen.tsx` with this version. `HomeCards` and `AwayCard` are unchanged:

```tsx
import { useEffect, useState } from 'preact/hooks'
import { arrivalWhenText, leaveWhenText, tripDepartsText } from '../copy/format'
import { safeNarrative } from '../copy/narrative'
import { arrivalCard, leaveCard, statusVisual } from '../copy/visuals'
import type { AirportIndex } from '../data/airports'
import type { Weather } from '../data/weather'
import type { Snapshot } from '../engine/snapshot'
import { CountdownCard } from './CountdownCard'
import { DaysHomePill } from './DaysHomePill'
import { DemoBanner } from './DemoBanner'
import { FallbackCard } from './FallbackCard'
import { Footer, type FooterProps } from './Footer'
import { LocationCard, showsLocationCard } from './LocationCard'
import { locationFacts } from './locationFacts'
import { NarrativeCard } from './NarrativeCard'
import { SunPopup } from './SunPopup'
import { Title, titleFor } from './Title'
import { TripProgressCard } from './TripProgressCard'
import { UpcomingTripCard } from './UpcomingTripCard'

export interface StatusScreenProps {
  snap: Snapshot
  now: number
  viewerTz: string
  /** The pilot's home time zone, for the card subtitles. */
  homeTz: string
  h24: boolean
  airports: AirportIndex
  /** The location card's weather (slice 2B1 §6), or null while it loads or when there's none. */
  weather: Weather | null
  demo: boolean
  celebrateKey: number
  footer: FooterProps
}

/**
 * The top of Crewluve's main screen, in its card order (spec §4.4; the location card, slice 2B1 §3; the trip cards, slice
 * 2A §3), and the sun popup the location card's dial opens (slice 2B2 §9). The popup goes after <main>, since the card's
 * frosted glass would trap a full-screen overlay inside the card; while it's open, the page is hidden from screen readers.
 */
export function StatusScreen(p: StatusScreenProps) {
  const { snap } = p
  const [sunOpen, setSunOpen] = useState(false)
  const spans = safeNarrative(snap, { now: p.now, viewerTz: p.viewerTz, h24: p.h24, airports: p.airports })
  const airport = snap.status.airport
  const facts = showsLocationCard(snap) ? locationFacts(airport, p.now, p.airports, p.weather) : null
  const dialShown = airport != null && facts?.tz != null && facts.sun != null
  // The popup closes by itself when the dial goes away: at takeoff, or when the sun neither rises nor sets.
  useEffect(() => {
    if (sunOpen && !dialShown) setSunOpen(false)
  }, [sunOpen, dialShown])
  const open = sunOpen && dialShown
  const flight = snap.nextFlight
  return (
    <>
      <main class="screen" aria-hidden={open ? 'true' : undefined} inert={open || undefined}>
        <Title text={titleFor(snap.hasName ? snap.name : null)} />
        {p.demo && <DemoBanner />}
        <NarrativeCard spans={spans} visual={statusVisual(snap)} ring={snap.ring} />
        {snap.status.kind === 'home' ? <HomeCards {...p} /> : <AwayCard {...p} />}
        {showsLocationCard(snap) && (
          <LocationCard
            airport={airport}
            now={p.now}
            homeTz={p.homeTz}
            h24={p.h24}
            airports={p.airports}
            weather={p.weather}
            onOpenSun={() => setSunOpen(true)}
          />
        )}
        {snap.upcomingTrip && (
          <UpcomingTripCard trip={snap.upcomingTrip} now={p.now} timeZone={p.homeTz} h24={p.h24} airports={p.airports} />
        )}
        {snap.tripProgress && <TripProgressCard progress={snap.tripProgress} airports={p.airports} />}
        <Footer {...p.footer} />
      </main>
      {open && airport && (
        <SunPopup
          airport={airport}
          now={p.now}
          homeTz={p.homeTz}
          homeAirport={snap.pilot.effHome}
          h24={p.h24}
          airports={p.airports}
          weather={p.weather}
          departure={flight ? { scheduled: flight.schedStart, actual: flight.start } : null}
          onClose={() => setSunOpen(false)}
        />
      )}
    </>
  )
}

function HomeCards({ snap, now, homeTz, h24, airports }: StatusScreenProps) {
  const leave = snap.leave
  const visual = leave ? leaveCard(leave) : null
  const subtitle = !leave
    ? null
    : leave.commuterUnlogged
      ? tripDepartsText(airports.city(leave.airport) ?? '', leave.time, homeTz, h24)
      : leaveWhenText(leave.time, homeTz, h24)
  return (
    <>
      {leave && visual && (
        <CountdownCard title={visual.title} icon={visual.icon} color={visual.color} target={leave.time} now={now} subtitle={subtitle} />
      )}
      {snap.daysHome != null && snap.daysHome >= 1 && <DaysHomePill name={snap.name} days={snap.daysHome} />}
    </>
  )
}

function AwayCard({ snap, now, homeTz, h24, airports, celebrateKey }: StatusScreenProps) {
  const arrival = snap.arrival
  if (!arrival) {
    return snap.fallbackDaysRemaining != null ? <FallbackCard daysRemaining={snap.fallbackDaysRemaining} /> : null
  }
  const visual = arrivalCard(snap, arrival, airports)
  const city = airports.city(arrival.airport)
  const when = arrivalWhenText(arrival.time, homeTz, h24)
  return (
    <CountdownCard
      title={visual.title}
      icon={visual.icon}
      color={visual.color}
      target={arrival.time}
      now={now}
      subtitle={city ? `${when} · ${city}` : when}
      celebrate={snap.celebrate}
      celebrateKey={celebrateKey}
    />
  )
}
```

Notes:
- The popup goes after `<main>`, not inside the location card, because the card's frosted glass (`backdrop-filter`) would trap a `position: fixed` overlay inside the card (spec §9).
- While it's open, `<main>` has `aria-hidden="true"` and `inert`. Browsers without `inert` still get the hidden attribute and the focus trap.
- The popup closes by itself when the dial goes away, at takeoff or when the sun neither rises nor sets. The effect also resets the open state, so the popup doesn't come back on its own when the dial does.
- The departure is the snapshot's next flight: its scheduled start and its estimated start (spec §8).

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/StatusScreen.test.tsx`
Expected: PASS, 41 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

The whole suite should now be 1564 tests in 69 files.

```bash
git add src/ui/StatusScreen.tsx tests/ui/StatusScreen.test.tsx
git commit -m "Status screen: open the sun popup from the dial, after main (slice 2B2 §3, §9)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Visual check with the user (controller)

**Files:**
- Modify (only if nudges are needed): `src/styles/sunPopup.css`

- [x] **Step 1: Build and open the preview**

Run `npm run build`, then start or reuse the `crewluve-preview` server from `.claude/launch.json` (port 5181) in the browser pane.

- [x] **Step 2: Open the popup in the demo scenes**

At the mobile preset (375 × 812), open `/?demo=1&scene=delayed` (Anchorage, a 40-minute delay) and `/?demo=1&scene=turn` (Rockford), and tap the dial. The demo scenes run on the real clock, so day or night follows the real time at each airport; check one scene in daylight and one at night, or come back later for the other.

The browser pane can hold back CSS animations while it's hidden. If a screenshot catches the popup half faded, run `document.getAnimations().forEach((a) => a.finish())` in the page first.

- [x] **Step 3: Compare with the app and the mockups**

Compare with `SunCircleDetailView.swift`, the big-size parts of `SunCircleView`, and the mockups approved on 2026-10-11. Check:
- the card: handle, header, clocks, dial, weather, divider, rows and credit, with the spec's sizes and gaps;
- dark at night; by day, light on a light device and dark on a dark one (`resize_window` with `colorScheme`);
- the dial: home's dashed line and house, the shared daylight's wedge and white arc, the departure's hand, triangle, plane and label, and the red set for the delay;
- the loop: the home arrow with "-4h behind", then the sweep with its rider and "4h58m to go", red past the scheduled time when late;
- the weather animation behind the card (Cloudy in the demo);
- how far the clouds and fog spread. They're softened with gradients rather than blur (spec §11 item 5), and a stretched gradient fades along a band's whole length, where the app's blurred bands stay strong across most of the card. If they look too faint at the sides, show the user before changing anything;
- the card's shadow. It follows the spec's "20 px blur", taken from the app's `shadow(radius: 20)`, but SwiftUI's radius usually looks closer to a 40 px CSS blur. Compare, and show the user before changing it;
- if an iPhone on iOS 15 or earlier is to hand, that a swipe on the open popup doesn't scroll the page behind. Nothing here can emulate it; the code fixes the body in place for it.

Two overlaps come from the app's own layout, so show them rather than fix them: the departure and delay labels can touch near the top of the dial, and "Noon" can sit under the departure plane.

- [x] **Step 4: Check the controls**

- Tab to the dial and press Enter, then Space: the popup opens with focus on the close button.
- Tab goes round the close button and the credit link only.
- Escape, the close button and the backdrop close it, and focus goes back to the dial.
- Dragging the handle down more than 100 px closes it; a shorter drag springs back.

- [x] **Step 5: Check narrow and short screens**

At 320 × 568, the card leaves 8 px of screen on each side, the dial fills its width, the contents scroll inside the card, and nothing scrolls sideways.

- [x] **Step 6: Ask the user to sign off**

Show the user the screenshots and ask one question: "Looks right (Recommended)" or "Change something". Apply their notes, then show them again.

- [x] **Step 7: Run the gates and commit any nudges**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/styles/sunPopup.css
git commit -m "Sun popup: visual nudges from the side-by-side check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Merge and release (controller, asks first)

- [ ] **Step 1: Final review**

Run a final whole-branch code review of `main..slice2b2`, and fix what it raises test-first.

- [ ] **Step 2: Merge**

Use superpowers:finishing-a-development-branch. Ask the user one question about how to merge `slice2b2` into `main`.

- [ ] **Step 3: Release, only with a fresh yes**

Ask before pushing `main`; the push redeploys crewluve.crewlu.net. After the "Deploy to GitHub Pages" run succeeds, open https://crewluve.crewlu.net/?demo=1&scene=delayed and tap the dial. Confirm the popup opens and closes, that `read_console_messages` with `onlyErrors: true` shows nothing, and that the demo made no network requests beyond the page's own files.

- [ ] **Step 4: Update the memory**

Update the project memory with the new tip and what's next: the Part A follow-ups (high-contrast colors, now also for the popup's small text, and city names), then Part C, the in-flight map.

---

## Done when

- `npx vitest run`, `npx tsc --noEmit` and `npm run build` are all green, with 1564 tests in 69 files.
- The dial opens the popup by tap, click, Enter or Space; it closes by the button, Escape, the backdrop and a drag, and by itself at takeoff (Tasks 16 and 18).
- The user has signed off on the look (Task 19), and the popup is live on crewluve.crewlu.net, released with the user's yes (Task 20).

## Spec coverage

| Spec section | Tasks |
|---|---|
| §3 Opening and closing | 10 (the dial as a button), 14 (the card), 16 (closing, focus, the drag, reduced motion), 17 (the zoom and fades), 18 (after `<main>`, closes by itself) |
| §4 The popup card | 15 (night colors), 16 (layout and rows), 17 (sizes, glass, shadow, scrolling) |
| §5.1 Always-shown layers | 6 (geometry), 9 (when each shows), 10 (drawing), 17 (colors and widths) |
| §5.2 The loop | 6 (the arrow and the sweep), 7 (timeline), 8 (frame clock), 10 (drawing, reduced motion) |
| §5.3 Labels and the screen reader | 3 (the description), 6 (sizes at 360), 10 |
| §6 The rows | 3 (words), 5 (icons), 11 (moon icon), 16 |
| §7 Weather animations | 4 (which plays), 12 (particles), 13 (canvas), 16 (only with weather and motion) |
| §8 Data | 1 (moon), 2 (shared daylight), 3 (words, the 15-minute rule), 9 (the departure's layers), 16 (home's sun times), 18 (the next flight) |
| §9 How it's built | 14 (the button, shared facts), 15 (colors), 16 (popup), 17 (stylesheet), 18 (screen), 5 (icons) |
| §10 Security and privacy | Nothing to build: no new request and no CSP change. The read-only scan covers every new file. |
| §11 Deliberate differences | 3 and 9 (1), 3, 9 and 16 (2), 1 (3), 4 (4), 13 (5), 7, 16 and 17 (6), 16 (7, 8), 12 (9), 10, 16 and 18 (10) |
| §12 Testing | Every task, then 19 |

## Execution notes

**Build (2026-10-11):** Tasks 1–18 were built in order on `slice2b2`, each from its printed blocks, one commit per task (`6134b17`…`0fb2621`). Every step 2 failed and every step 4 passed as printed, and the branch matched the scratch copy exactly: 1564 tests in 69 files.

**Reviews:** auto mode blocked a new helper for Batch C's spec review. The user chose to send the remaining reviews to the two running reviewers by message: the Batch A reviewer takes Batch C, and the Batch B reviewer takes Batch D.

**Fixes from the Batch A and B spec reviews (`5ac5d31`):**
- **The actual departure time, always.** The plan's `departureTime` used the scheduled time for an offset under 15 minutes. That left the popup up to 14 minutes off the page's own sentence, and it dropped the departure from the dial between a small delay's scheduled and actual times. Spec §8 and §5.3 call for the actual time; the 15-minute rule decides only the late or early marks. `departureTime` is gone, and a departure under 15 minutes off sweeps cyan to its actual time (spec decision 9).
- **The description's order:** "Next departure 4:05 AM, 40 minutes late, in 6 hours", so the delay can't be heard as part of the countdown (spec decision 10).
- **No red for an early departure.** Task 6 dropped the app's late-only guard on the red sweep as redundant. It isn't: angles keep only the hour and minute, so an early departure a whole number of days out, to the minute, drew a red lap. The guard is back, as `hoursToActual > hoursToScheduled`.
- **Tests added:** the sweep's day rules (laps counted to the scheduled time, "more than a day" by the actual time, exactly a day, a scheduled time already past), all eight moon boundaries, the early side of the 15-minute rule, a departure exactly at now, the one-second filter, and the label and middle text sizes at 360 (moved from arithmetic in the geometry test to `styles.test.ts`).
- **A correction to "How the printed code was checked":** the one-second filter can change the result. A span of exactly one second is dropped or kept by floating-point rounding, as in the app (18:59:59 to 19:00:00 is dropped), and a test now pins that. The polar early return still can't change the result.
- **Spec clarifications (§5.2, §5.3, §8, decisions 9–11):** the actual-time rule; the description's order; and, copying the app, a sweep that stays cyan to the actual time when the scheduled time has already passed.
- The suite is 1574 tests in 69 files.

**Fixes from the Batch C spec review (`3f3f1b2`):** the code matched the spec and the app, and the review found these:
- **Invalid HTML:** the dial's sky was a `<div>` inside the card's `<button>`, which may hold only phrasing content. It's a `<span>` now. It's absolutely placed, so it still acts as a block.
- **Tests added for the dial at 360:** the red sweep and the red rider and countdown when late; the green ones when early; the dashed laps; the blue "ahead" arrow and "+2h"; and the fades of the arrow, the sweep, its rider and the countdown.
- **Tests added for the particles:** the rays' pulsing and the stars' twinkling over time, the rain's 8 px slant, the snow's sway, and the clouds' drift.
- **Look check:** whether the clouds and fog spread like the app's, since they're softened with gradients (Task 19).
- The suite is 1584 tests in 69 files.

**Fixes from the Batch B re-check and the Batch D spec review (`3db1eca`):**
- **Focus back to the dial (Important).** The popup handed focus back to whatever had it when it opened. In a real browser that was already the page body: Preact runs the popup's effect after `<main>` turns inert, and Safari, Firefox and iPhones never focus a button on click anyway. Now the dial hands its own button to the screen as it opens the popup (`onOpen(dial)`, `onOpenSun(dial)`), and the screen focuses it in an effect after the render that lifts `inert`. The popup no longer restores focus itself.
- **An on-time departure's marks at its actual time.** The re-check asked whether, under 15 minutes off, the label should show the scheduled 3:25 while the countdown and the description go by 3:35. Now such a departure is drawn as on time at its actual time: its cyan marks and label sit there, and every time on the page agrees (spec §5.1, §8, decision 9). The spec's "the layers always use the actual time" now reads "the departure turn".
- **A single fade.** The card's fade multiplied the dial's own, so the dial showed at about 18% at 0.1 s rather than the app's 42%. The dial now only grows from half size, and fades with the card (spec §3).
- **Recorded as deliberate differences (spec §11 items 11 and 12):** the drag starts on the handle and the header, and the card fades rather than sliding up.
- **Tests added:** the departure's scheduled and estimated times taken from the snapshot, home's airport for the shared daylight, closing by itself when the sun times go away, and focus coming back after a click that never focused the dial.
- **For the look check (Task 19):** the card's shadow.

**Fixes from the Batch A and C code-quality reviews (`b754c9a`, `7d580ea`, `885a749`):**
- **The big dial no longer works everything out on every frame (Important).** While the loop ran, each animation frame recomputed the angles, labels, description and layers: about 27 date-formatting calls a frame. Now `bigDialBase` and the labels are worked out with `useMemo` when the card or the popup renders, and each frame adds only the arrow, the sweep and its rider (`bigDialLayers(base, moment)`). A test counts the formatting calls during frames: none. The big layers' drawing moved to `src/ui/BigDialLayers.tsx`, and the middle text's offsets are named in `DETAIL`.
- **The weather canvas:** it skips drawing while it has no size; `paint` is checked to handle every shape; the palette holds only the line and dot colors, with white for any the stylesheet hasn't set; and `dark` became `night`, named for what the popup passes. New tests cover dots, the flash and bolt, no size, and re-reading the colors.
- **Batch A tidy-ups:** `Departure` and `departureOffset` moved to `src/engine/snapshot.ts`, and the snapshot's own delay uses them. `hourDifference` builds on `timeDifference`, and `weatherAnimation` goes by the card's typed sky. The moon's phases are written once. There are clearer names and a 24-hour description test.
- **Left as is:** `MoonPhaseIcon` keeps its own one-line `round`.
- The suite is 1595 tests in 69 files.

**Fixes from the Batch B and D code-quality reviews and the second Batch A and C check (`2614cc0`, `0842556`, `171a957`, `eb88d44`, `6a2743d`, `c654238`):**
- **The page held still on iOS before 16 (Important).** `overflow: hidden` on the body doesn't stop touch scrolling in iOS Safari before 16, inside the site's floor, so a swipe on the card could scroll the page behind. The body is now fixed where it was while the popup is open, and the page goes back to the same scroll position afterwards. The browser pane showed the page stay put and come back to the same place; an older iPhone is a Task 19 check if one is to hand.
- **Steady inputs for the dial.** The popup memoizes home's sun times and the dial's detail, so a drag (a render per pointer move) doesn't make the dial work itself out again. The dial's arcs, bands and ticks join what it works out once a second. A test changes each input at the same moment, so dropping any memo key fails it.
- **The place's facts from the screen.** `StatusScreen` passes the popup `DialFacts`, whose zone and sun times can't be missing, so the popup can't mount empty and lock the page. `showsDial` is the one rule for the card's dial and for when the popup may be open. The card still works out its own facts; a second `sunTimes` call a second is cheap.
- **Reshaped for one job per file:** `useModalDialog` and `useDragToClose` (the Tab trap now covers any focusable, and focus moves in a layout effect), `WeatherCredit`, `bigDialGeometry.ts`, `BigDialDrawing.tsx` (renamed from `BigDialLayers.tsx`, which shared its name with a type), and `bigDial.css`.
- **Small fixes:** `useElapsed` starts each run from zero; the timeline's shared do-nothing turn is frozen; `arcPath` uses the shared angle wrap; `bigDialBase` works out the time difference once; the engine test uses `MINUTE`; and the screen's `homeTz` comment names everything that uses it.
- The suite is 1606 tests in 70 files.

**Final whole-branch review (`997e7ee..054a828`):** ready to merge after the look check, with nothing above Minor. The fixes (`9ff5dd8`, `76b090c`):
- Tests now hold the drag fix (a drag's moves may cost only the popup's own four times), the popup's memo keys, the drag strip's `touch-action`, the single fade and the drag's exact 100 px boundary. The scroll-lock test cleans up in a `finally`.
- The screen works out the place's facts once, and the card takes them as a prop instead of working them out again.
- Spec §9's module list names the files the reviews added.
- **Left as is:** home's sun times are recomputed each second, not once a day; the popup's `detail` changes every second anyway, because the screen rebuilds the departure.
- **Review process:** for the re-check and the final review, I gave both reviewers the same frozen copy, and their deliberate breaks overlapped for a few minutes. The final reviewer re-ran its checks on a clean copy. Separate copies from now on.
- The suite is 1613 tests in 70 files.

**Look check (Task 19, 2026-10-11):** the user signed off ("Looks right") on screenshots and the live preview:
- the light card by day on a light phone;
- the departure sweep with a red delay;
- the dark card by day on a dark phone;
- a narrow 320 × 568 phone.

There were no nudges: the shadow stays at the spec's 20 px, and the clouds and fog as built. Night couldn't be shown live, since every demo place was in daylight; it uses the dark set the test keeps identical to the page's. No iOS 15 device was to hand.
