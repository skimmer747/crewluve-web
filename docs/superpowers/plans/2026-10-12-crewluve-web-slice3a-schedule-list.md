# Crewluve Web Slice 3A: the Schedule Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Schedule page: every leg the site reads, by day, as the Crewluve app's Schedule screen lists them. The cards that open it in the app get their chevron, View Schedule shows whenever none of them is on the page, and the page has its own address with Back.

**Architecture:** Pure modules first:
- `src/copy/schedule.ts` holds the words and numbers: durations, day headings, times, gap labels, the right-hand column.
- `src/ui/scheduleFacts.ts` holds the list as data: which legs, each row's title, icon and color, the days, the leg happening now and the next one, the gaps, and the day the list opens at.

Then the parts:
- `Chevron` and `ScheduleLink` make the card links and the View Schedule button.
- `TimelineRow` is one row.
- `SchedulePage` is the page.
- `useSchedulePage` handles the address, history, scroll and focus.

Last, `ScheduleScreen` becomes `PilotPages`, which shows one page or the other.

**Tech Stack:** Vite 5.4, TypeScript 5.9 (strict), Preact 10, Vitest 3 with happy-dom and @testing-library/preact.

**Spec:** `docs/superpowers/specs/2026-10-12-crewluve-web-slice3a-schedule-list-design.md`

---

## Execution notes

**Setup and gates**
- **Branch:** work on `slice3a` in the main project folder. Run `git switch -c slice3a` from `main`. Don't use git worktrees; auto mode blocked a worktree builder during slice 1.
- **Working directory:** run every command from the project root, `~/Dev/Crewluve Website`. Quote it in shells, since it has a space.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass before every commit that touches code.
  - The suite is 1873 tests in 82 files before this plan, and 1988 tests in 88 files after it.
  - The read-only scan (`tests/data/readOnly.test.ts`) adds one test for each new file in `src/`, so the totals grow a little faster than the task counts below.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **One build script uses npm:** `npm run icons` (Task 1) runs `npm install --no-save @phosphor-icons/core@2.1.1`, then builds the icon file. If the package is already in `node_modules`, `node scripts/build-icons.mjs` does the same without npm. If `package-lock.json` changes afterwards, restore it with `git checkout -- package-lock.json`.

**How the printed code was checked**
- **Built and replayed:** every code block below was built and run in a scratch copy of the project before this plan was written, and all three gates passed there. A script then applied this plan's changes, step by step, to a fresh copy of `main`. Each Step 2 failed, each Step 4 passed with its count, and every file came out identical to the scratch copy's.
- **Deliberate breaks:** 51 of 51 were caught by the new tests.
  - Planning them showed three gaps, now covered: the trip card as the only way in, at base between trips; no UP NEXT tag on the leg happening now; and today's heading staying green when it's the stuck one.
  - One was missed at first: a back button that always stepped back through history, which would leave the site after a bookmark. The test now puts another page before the bookmarked schedule.
- **In the browser:** the scratch copy's production build ran in the browser pane at 375 and 320 px wide, in light and dark.
  - The page opens at the next leg's day, with that heading stuck under the bar in yellow.
  - The UP NEXT tag covers the "Starts in" label, as the app's layout does.
  - The ring turns, with its masks applied under the site's content security policy.
  - Focus lands on "Schedule".
  - The page's back button and the browser's Back both return. The status page comes back at its scroll position (345.5 px) with focus on the trip card's link.
  - A held card goes to 97% and 85%.
  - View Schedule shows in the new `nothing-ahead` scene.
  - There were no console errors.
  - Two changes came from this check (spec decision 8): the bars' color, `--bar-fill`, and the `nothing-ahead` demo scene.
- **happy-dom:** `history.back()` sends `popstate` a moment later, so the tests that go back wait 20 ms.

**Network and other repos**
- **No new requests.** Nothing in this plan adds requests, storage or scripts. Tests never use the network; `tests/setup/noNetwork.ts` blocks it.
- **Security:** the rows' colors (`--leg`) are set through the CSSOM, which the CSP allows, as Preact's `style={{…}}` already does.
- **Read-only site:** nothing in this plan talks to CrewLu Cloud.
- **The Crewluve app (`~/Dev/Crewluv`) is reference only.** Read it; never change it.

**Reviews and changes**
- **Two batches:** Tasks 1–5, the data and the words; then Tasks 6–11, the page and the ways in and out. After each batch, a spec review and a code-quality review, each with its own frozen copy of the branch. The second code-quality review also covers the whole branch.
- **Tasks 12–13 are for the controller, working with the user:** the look check, then merge and release.
- **If the code has to differ from a printed block, write it down.** Note it under "Execution notes" at the end of this file, and update the spec's §9 decisions log if a decision changed.

## File map

| File | Change | Responsibility |
|---|---|---|
| `scripts/build-icons.mjs`, `src/icons/iconPaths.ts` | modify, regenerate | The jumpseat's seat and the turn's clock with an arrow |
| `src/engine/types.ts`, `src/engine/normalize.ts` | modify | Each flight and jumpseat keeps the airline code as entered |
| `src/copy/schedule.ts` | create | Durations, day headings, times, gap labels and the right-hand column |
| `src/ui/scheduleFacts.ts` | create | The list as data: legs, looks, days, now and next, gaps, the opening day |
| `src/ui/Chevron.tsx` | create | SF Symbols' chevron, drawn |
| `src/ui/ScheduleLink.tsx` | create | The card links into the schedule, their press, and the View Schedule button |
| `src/ui/CountdownCard.tsx`, `src/ui/FallbackCard.tsx`, `src/ui/UpcomingTripCard.tsx` | modify | A chevron and the whole card as a link, when given one |
| `src/ui/StatusScreen.tsx` | modify | The four cards' links, and View Schedule when none is there |
| `src/data/demo.ts` | modify | The `nothing-ahead` scene |
| `src/ui/TimelineRow.tsx` | create | One row, with its gap line |
| `src/ui/SchedulePage.tsx` | create | The page: the bar, the days, the stuck heading, the opening day, the empty state |
| `src/ui/hooks/useSchedulePage.ts` | create | The address, history, and the status page's scroll and focus on return |
| `src/ui/ScheduleScreen.tsx` → `src/ui/PilotPages.tsx` | rename, modify | The loaded data, and which page shows |
| `src/ui/Root.tsx` | modify | Uses `PilotPages` |
| `src/styles/cards.css`, `src/styles/schedule.css`, `src/styles/tokens.css`, `src/main.tsx` | modify, create | The links' press and focus ring, View Schedule, the page's styles, and the bars' color |
| Tests | create and modify | Seven new test files, one renamed, additions to six more |

---

### Task 1: The icons

**Files:**
- Modify: `scripts/build-icons.mjs`, `src/icons/iconPaths.ts`
- Test: `tests/icons/iconPaths.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/icons/iconPaths.test.ts`, add this test after the in-flight card's:

```ts
  it('has the schedule list’s jumpseat seat and turn clock', () => {
    for (const name of ['Seat', 'ClockCounterClockwise']) expect(ICON_PATHS).toHaveProperty(name)
  })
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/icons/iconPaths.test.ts`
Expected: FAIL in 1 test (`1 failed | 6 passed (7)`) with `AssertionError: expected { …(59) } to have property "Seat"`.

- [ ] **Step 3: Implement**

In `scripts/build-icons.mjs`, end the comment above `ICONS` with the sixth group:

Replace this:

```js
// the fifth, the slice 2C in-flight card's and tracking popup's.
```

with this:

```js
// the fifth, the slice 2C in-flight card's and tracking popup's; the sixth, the slice 3A schedule list's.
```

and add the sixth group at the end of `ICONS`, just before its closing brace:

```js
  Seat: 'seat', ClockCounterClockwise: 'clock-counter-clockwise',
```

Then regenerate the icon file:

```bash
npm run icons
```

Expected: `wrote 61 icons to …/src/icons/iconPaths.ts`. `git diff src/icons/iconPaths.ts` shows two added lines, `Seat` and `ClockCounterClockwise`, and no other change.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/icons/iconPaths.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1874 tests in 82 files after this task.

```bash
git add tests/icons/iconPaths.test.ts scripts/build-icons.mjs src/icons/iconPaths.ts
git commit -m "Icons: the schedule list's seat and turn clock (slice 3A §4.6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The airline as entered

**Files:**
- Modify: `src/engine/types.ts`, `src/engine/normalize.ts`
- Test: `tests/engine/normalize.test.ts`, `tests/fixtures/legs.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/engine/normalize.test.ts`, import `enteredAirline`:

Replace this:

```ts
import {
  buildSchedule, classifyManualEvent, effectiveTimes, normalizeFlightNumber, parseInstant, pickPilot,
  resolveAirline, toIata, trainingTitle,
} from '../../src/engine/normalize'
```

with this:

```ts
import {
  buildSchedule, classifyManualEvent, effectiveTimes, enteredAirline, normalizeFlightNumber, parseInstant, pickPilot,
  resolveAirline, toIata, trainingTitle,
} from '../../src/engine/normalize'
```

add this test at the end of the "flight numbers and airlines" block:

```ts
  it('keeps the airline code as entered, trimmed and in upper case, or null when blank', () => {
    expect(enteredAirline(' dl ')).toBe('DL')
    expect(enteredAirline('5X')).toBe('5X')
    expect(enteredAirline('  ')).toBeNull()
    expect(enteredAirline(null)).toBeNull()
    expect(enteredAirline(undefined)).toBeNull()
  })
```

and this one in the `buildSchedule` block, just before "drops jumpseats that duplicate a trip deadhead":

```ts
  it('keeps the airline as entered beside the airline each flight and jumpseat resolves to (slice 3A §5.2)', () => {
    const flights = s.trips[0].dutyPeriods[0].flights
    expect(flights.map((f) => [f.airline, f.enteredAirline])).toEqual([['5X', null], [null, null]])
    expect(s.jumpseats.map((j) => [j.airline, j.enteredAirline])).toEqual([['5X', null]])
    const entered = buildSchedule(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')
        .trip('t2', { dutyPeriods: [{ start: 0, end: 300, flights: [{ dep: 'SDF', arr: 'ATL', out: 60, in: 150, number: '1234', airline: ' aa ', commercialDh: true }] }] })
        .jumpseat('j2', 'SDF', 'MCO', 400, 500, { airline: 'dl', number: '1230' })
        .build(),
      A,
    )
    expect(entered.trips[0].dutyPeriods[0].flights[0]).toMatchObject({ airline: 'AA', enteredAirline: 'AA' })
    expect(entered.jumpseats[0]).toMatchObject({ airline: 'DL', enteredAirline: 'DL' })
  })
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/engine/normalize.test.ts`
Expected: FAIL in 2 tests (`2 failed | 54 passed (56)`): `TypeError: enteredAirline is not a function`, and `expected [ [ '5X', undefined ], …(1) ] to deeply equal [ [ '5X', null ], [ null, null ] ]`.

- [ ] **Step 3: Implement**

In `src/engine/types.ts`, add the field after `airline` in `Move`:

```ts
  /** The airline code as the pilot entered it, trimmed and in upper case, or null: `airline` without the UPS guess. */
  enteredAirline: string | null
```

In `src/engine/normalize.ts`, add the helper just before `resolveAirline`'s comment:

```ts
/** The airline code as the pilot entered it, trimmed and in upper case, or null when it's blank. */
export function enteredAirline(airlineCode: string | null | undefined): string | null {
  return (airlineCode ?? '').trim().toUpperCase() || null
}
```

let `resolveAirline` use it:

Replace this:

```ts
  const code = (airlineCode ?? '').trim().toUpperCase()
  if (code) return code
```

with this:

```ts
  const code = enteredAirline(airlineCode)
  if (code) return code
```

and keep the code on each jumpseat, after its `airline`:

```ts
      enteredAirline: enteredAirline(j.airline_code),
```

and on each trip flight in `toMove`, after its `airline`:

```ts
    enteredAirline: enteredAirline(row.airline_code),
```

In `tests/fixtures/legs.ts`, give the `flight` fixture the field after `airline`: a trip flight is a company flight entered without an airline, and the jumpseat was entered as Delta.

```ts
    enteredAirline: tripId ? null : 'DL',
```

`airline` stays as it was, so nothing on the status page changes. The list needs the code as entered for its titles ("AA1234", a jumpseat's "2961"), and to tell a jumpseat entered with an airline from one the site only guesses is UPS.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/engine/normalize.test.ts`
Expected: PASS, 56 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1876 tests in 82 files after this task.

```bash
git add tests/engine/normalize.test.ts src/engine/types.ts src/engine/normalize.ts tests/fixtures/legs.ts
git commit -m "Flights and jumpseats keep the airline code as entered, beside the airline they resolve to (slice 3A §5.2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The schedule's words and numbers

**Files:**
- Create: `src/copy/schedule.ts`
- Test: `tests/copy/schedule.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/copy/schedule.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { dayHeading, gapText, legClock, legDuration, legTimes } from '../../src/copy/schedule'

const NY = 'America/New_York'
const S = 1000
const M = 60 * S
const H = 60 * M
/** Thu 15 Oct 2026, noon in New York. */
const NOON = Date.UTC(2026, 9, 15, 16)

describe('legDuration', () => {
  it.each([
    [26 * H, false, '1d 2h'], [24 * H, false, '1d'], [24 * H + 59 * M, false, '1d'],
    [4 * H + 30 * M, false, '4h 30m'], [4 * H, false, '4h'], [35 * M, false, '35m'], [59 * S, false, '0m'],
    [3 * H + 12 * M + 45 * S, true, '3:12:45'], [2 * H + 5 * S, true, '2:00:05'], [12 * M + 9 * S, true, '12:09'],
    [9 * S, true, '0:09'], [50 * H, true, '2d 2h'], [-5 * M, false, '0m'],
  ])('%i ms, with seconds %s → %s', (ms, seconds, text) => expect(legDuration(ms, seconds)).toBe(text))
})

describe('dayHeading', () => {
  it('names today, yesterday and tomorrow, and spells out other days (EventTimelineView.sectionHeaderText)', () => {
    expect(dayHeading(NOON, NOON, NY)).toBe('Today')
    expect(dayHeading(NOON - 24 * H, NOON, NY)).toBe('Yesterday')
    expect(dayHeading(NOON + 24 * H, NOON, NY)).toBe('Tomorrow')
    expect(dayHeading(NOON + 48 * H, NOON, NY)).toBe('Saturday, Oct 17')
    expect(dayHeading(NOON - 72 * H, NOON, NY)).toBe('Monday, Oct 12')
    expect(dayHeading(Date.UTC(2026, 8, 1, 16), NOON, NY)).toBe('Tuesday, Sep 1')
  })

  it('goes by the calendar day in the visitor’s zone, so 11:30pm and 12:30am are different days', () => {
    const lateTonight = Date.UTC(2026, 9, 16, 3, 30) // 11:30pm in New York on Thursday
    const justAfter = Date.UTC(2026, 9, 16, 4, 30) // 12:30am in New York on Friday, 11:30pm in Chicago on Thursday
    expect(dayHeading(lateTonight, NOON, NY)).toBe('Today')
    expect(dayHeading(justAfter, NOON, NY)).toBe('Tomorrow')
    expect(dayHeading(justAfter, NOON, 'America/Chicago')).toBe('Today')
  })
})

describe('legTimes', () => {
  const out = Date.UTC(2026, 9, 15, 10, 5)
  const landed = Date.UTC(2026, 9, 15, 11, 40)

  it('gives both times in the visitor’s zone, each with its abbreviation, in lower case (TimelineRowView.subtitle)', () => {
    expect(legTimes(out, landed, NY, false)).toBe('6:05am edt – 7:40am edt')
  })

  it('uses 24-hour times on 24-hour devices', () => {
    expect(legTimes(out, landed, NY, true)).toBe('06:05 edt – 07:40 edt')
  })

  it('gives each time the abbreviation in force then, across the change back to standard time', () => {
    // Sunday 1 November 2026: New York's clocks go back from 2am EDT to 1am EST.
    expect(legTimes(Date.UTC(2026, 10, 1, 4), Date.UTC(2026, 10, 1, 12), NY, false)).toBe('12:00am edt – 7:00am est')
  })

  it('lower-cases a zone with no letter abbreviation', () => {
    expect(legTimes(Date.UTC(2026, 9, 15, 8), Date.UTC(2026, 9, 15, 9), 'Europe/Berlin', false)).toBe('10:00am gmt+2 – 11:00am gmt+2')
  })
})

describe('gapText', () => {
  it('names a gap by the leg after it, with its length (TimeGapView)', () => {
    expect(gapText('home', 2 * H)).toBe('Home 2h')
    expect(gapText('turn', 45 * M)).toBe('Turn 45m')
    expect(gapText('layover', 3 * H + 10 * M)).toBe('Layover 3h 10m')
    expect(gapText('gap', 85 * M)).toBe('Gap 1h 25m')
    expect(gapText('gap', 26 * H)).toBe('Gap 1d 2h')
  })
})

describe('legClock', () => {
  const start = NOON
  const end = NOON + 4 * H + 30 * M

  it('counts down to the end while the leg is happening, with seconds', () => {
    expect(legClock(start, end, NOON + H + 17 * M + 15 * S, 'happening')).toEqual({
      label: 'Ends in', value: '3:12:45', spoken: 'Ends in 3 hours, 12 minutes',
    })
  })

  it('counts down to the start of the next leg, with seconds under a day', () => {
    expect(legClock(start, end, NOON - 12 * M - 9 * S, 'next')).toEqual({ label: 'Starts in', value: '12:09', spoken: 'Starts in 12 minutes' })
    expect(legClock(start, end, NOON - 50 * H, 'next')).toEqual({ label: 'Starts in', value: '2d 2h', spoken: 'Starts in 2 days, 2 hours' })
  })

  it('gives every other leg its length, without seconds', () => {
    expect(legClock(start, end, NOON + 9 * H, 'other')).toEqual({ label: 'Duration', value: '4h 30m', spoken: 'Duration 4 hours, 30 minutes' })
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/copy/schedule.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/copy/schedule' imported from 'tests/copy/schedule.test.ts'`.

- [ ] **Step 3: Implement**

Create `src/copy/schedule.ts`:

```ts
import { calendarDay, MONTHS, WEEKDAYS, zoneAbbr, zonedParts } from '../time/zoned'
import { clockText, spokenDuration } from './format'

const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * A leg's length or countdown as the app's schedule writes it (TimelineRowView and TimeGapView, formattedDuration):
 * "1d 4h" or "1d" from a day up; under a day "4h 30m", "4h" or "35m", or with seconds "3:12:45" and "12:09".
 */
export function legDuration(ms: number, withSeconds: boolean): string {
  const total = Math.floor(Math.max(ms, 0) / 1000)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  if (hours > 0) {
    if (withSeconds) return `${hours}:${pad2(minutes)}:${pad2(seconds)}`
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  return withSeconds ? `${minutes}:${pad2(seconds)}` : `${minutes}m`
}

/** A day's heading (EventTimelineView.sectionHeaderText): "Today", "Yesterday", "Tomorrow", or "Thursday, Oct 16". */
export function dayHeading(ms: number, now: number, timeZone: string): string {
  const offset = calendarDay(ms, timeZone) - calendarDay(now, timeZone)
  if (offset === 0) return 'Today'
  if (offset === -1) return 'Yesterday'
  if (offset === 1) return 'Tomorrow'
  const p = zonedParts(ms, timeZone)
  return `${WEEKDAYS[p.weekday]}, ${MONTHS[p.month - 1].slice(0, 3)} ${p.day}`
}

/**
 * A row's second line (TimelineRowView.subtitle): "6:05am edt – 7:40am edt", or "06:05 edt – 07:40 edt" on 24-hour
 * devices. Each time carries the abbreviation in force then; the app puts today's on both (slice 3A §4.7).
 */
export function legTimes(start: number, end: number, timeZone: string, h24: boolean): string {
  const at = (ms: number) => `${clockText(ms, timeZone, h24)} ${zoneAbbr(ms, timeZone).toLowerCase()}`
  return `${at(start)} – ${at(end)}`
}

/** What names a gap between two legs: the leg after it (TimeGapView.gapType). */
export type GapKind = 'home' | 'turn' | 'layover' | 'gap'

const GAP_LABELS: Record<GapKind, string> = { home: 'Home', turn: 'Turn', layover: 'Layover', gap: 'Gap' }

/** A gap's label (TimeGapView.gapLabel): "Layover 3h 10m", "Gap 1h 25m". */
export function gapText(kind: GapKind, ms: number): string {
  return `${GAP_LABELS[kind]} ${legDuration(ms, false)}`
}

/** Where a leg stands: happening now, the next to start, or neither (TimelineRowView's isActive and showUpNext). */
export type LegMoment = 'happening' | 'next' | 'other'

export interface LegClock {
  label: 'Ends in' | 'Starts in' | 'Duration'
  value: string
  /** The label and value in words, for screen readers: "Starts in 3 hours, 12 minutes". */
  spoken: string
}

/** A row's right-hand column (CountdownText): the time left, the time until it starts, or its length. */
export function legClock(start: number, end: number, now: number, moment: LegMoment): LegClock {
  const ms = moment === 'happening' ? end - now : moment === 'next' ? start - now : end - start
  const label = moment === 'happening' ? 'Ends in' : moment === 'next' ? 'Starts in' : 'Duration'
  return { label, value: legDuration(ms, moment !== 'other'), spoken: `${label} ${spokenDuration(ms)}` }
}
```

The formats are the app's `formattedDuration`, which `TimelineRowView`, its `CountdownText` and `TimeGapView` each carry. The times reuse the site's `clockText`, so 24-hour devices get 24-hour times, and `zoneAbbr` at each instant.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/copy/schedule.test.ts`
Expected: PASS, 23 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1900 tests in 83 files after this task.

```bash
git add tests/copy/schedule.test.ts src/copy/schedule.ts
git commit -m "copy/schedule: the schedule's durations, day headings, times, gap labels and right-hand column (slice 3A §4.3, §4.7, §4.8, §4.10)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Each row's title, icon and color

**Files:**
- Create: `src/ui/scheduleFacts.ts`
- Test: `tests/ui/scheduleFacts.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/ui/scheduleFacts.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { airlineColor, airlineIcon } from '../../src/copy/airlines'
import type { Leg } from '../../src/engine/legs'
import { rowLook, scheduleLegs } from '../../src/ui/scheduleFacts'
import { testAirports } from '../fixtures/airports'
import { drive, duty, flight, pilot, place } from '../fixtures/legs'

/** A commuter: home Lexington, base Louisville. */
const commuter = pilot('LEX', 'SDF')
const look = (leg: Leg, who = commuter) => rowLook(leg, who, testAirports)

describe('scheduleLegs', () => {
  it('lists every leg but the report time, which Duty never sends the app (slice 3A §4.2)', () => {
    const legs = [place('report', 'SDF', 0, 1), flight('SDF', 'RFD', 1, 2), place('turn', 'RFD', 2, 3), drive('SDF', 'LEX', true, 4, 5)]
    expect(scheduleLegs(legs).map((l) => l.kind)).toEqual(['flight', 'turn', 'drive'])
  })
})

describe('rowLook: flights and jumpseats (slice 3A §4.5, §4.6)', () => {
  it('writes a company flight as Duty does, with the UPS package in UPS brown', () => {
    expect(look(flight('RFD', 'SDF', 0, 1, 'T1', { number: '2961' }))).toEqual({ title: 'UPS2961: RFD → SDF', icon: 'Package', color: 'ups', homeward: false })
  })

  it('gives a flight entered with its airline that code, icon and color, a FedEx pilot’s company flights too', () => {
    const ticket = flight('SDF', 'ATL', 0, 1, 'T1', { airline: 'AA', enteredAirline: 'AA', number: '1234', deadhead: true })
    expect(look(ticket)).toEqual({ title: 'AA1234: SDF → ATL', icon: airlineIcon('AA'), color: airlineColor('AA'), homeward: false })
    const fedex = flight('MEM', 'IND', 0, 1, 'T1', { airline: 'FX', enteredAirline: 'FX', number: '1407' })
    expect(look(fedex)).toEqual({ title: 'FX1407: MEM → IND', icon: airlineIcon('FX'), color: airlineColor('FX'), homeward: false })
  })

  it('shows a trip flight with no airline as a blue airplane, with its number alone or just its route', () => {
    const ticket = flight('MCO', 'SDF', 0, 1, 'T1', { airline: null, number: '1234', deadhead: true })
    expect(look(ticket)).toEqual({ title: '1234: MCO → SDF', icon: 'Airplane', color: 'blue', homeward: false })
    const placeholder = flight('SDF', 'RFD', 0, 1, 'T1', { airline: null, number: null })
    expect(look(placeholder)).toEqual({ title: 'SDF → RFD', icon: 'Airplane', color: 'blue', homeward: false })
  })

  it('shows ground transport as GND with a blue car, whatever its number', () => {
    const van = flight('SDF', 'IND', 0, 1, 'T1', { ground: true, airline: null, number: null })
    expect(look(van)).toEqual({ title: 'GND: SDF → IND', icon: 'Car', color: 'blue', homeward: false })
    expect(look({ ...van, number: '1234' }).title).toBe('GND: SDF → IND')
  })

  it('gives a jumpseat its airline when one was entered, else its number and the green seat', () => {
    expect(look(flight('MCO', 'SDF', 0, 1, null))).toEqual({ title: 'DL100: MCO → SDF', icon: airlineIcon('DL'), color: airlineColor('DL'), homeward: false })
    // The site counts a numbered jumpseat with no airline as UPS for the status page; the list goes by what was entered.
    const company = flight('SDF', 'RFD', 0, 1, null, { airline: '5X', enteredAirline: null, number: '451' })
    expect(look(company)).toEqual({ title: '451: SDF → RFD', icon: 'Seat', color: 'green', homeward: false })
    expect(look({ ...company, airline: null, number: null }).title).toBe('SDF → RFD')
  })

  it('marks a flight or jumpseat that lands at the pilot’s home airport', () => {
    expect(look(flight('SDF', 'LEX', 0, 1)).homeward).toBe(true)
    expect(look(flight('ATL', 'LEX', 0, 1, null)).homeward).toBe(true)
    expect(look(flight('LEX', 'SDF', 0, 1)).homeward).toBe(false)
    expect(look(flight('SDF', 'LEX', 0, 1), pilot(null, null)).homeward).toBe(false)
  })
})

describe('rowLook: stops (slice 3A §4.5, §4.6)', () => {
  it('names a turn and a layover in the city, or at the airport when the list doesn’t know it', () => {
    expect(look(place('turn', 'RFD', 0, 1))).toEqual({ title: 'Turn in Rockford', icon: 'ClockCounterClockwise', color: 'orange', homeward: false })
    expect(look(place('turn', 'XYZ', 0, 1)).title).toBe('Turn at XYZ')
    expect(look(place('layover', 'ONT', 0, 1))).toEqual({ title: 'Layover in Ontario', icon: 'Bed', color: 'yellow', homeward: false })
    expect(look(place('layover', 'XYZ', 0, 1)).title).toBe('Layover at XYZ')
  })

  it('shows a stop at home as Home with the green house', () => {
    expect(look(place('home', 'LEX', 0, 1))).toEqual({ title: 'Home', icon: 'House', color: 'green', homeward: false })
  })

  it('says a stop at base is at base, with the buildings in blue, where the app says On Duty', () => {
    expect(look(place('base', 'SDF', 0, 1))).toEqual({ title: 'At base in Louisville', icon: 'Buildings', color: 'blue', homeward: false })
    expect(look(place('base', 'XYZ', 0, 1)).title).toBe('At base in XYZ')
  })

  it('falls back to the app’s look for a leg it doesn’t list', () => {
    expect(look(place('report', 'SDF', 0, 1))).toEqual({ title: 'On Duty', icon: 'Clock', color: 'gray', homeward: false })
  })
})

describe('rowLook: drives, reserve and events (slice 3A §4.5, §4.6)', () => {
  it('names a drive by its direction and route, green when it ends at home', () => {
    expect(look(drive('SDF', 'LEX', true, 0, 1))).toEqual({ title: 'Driving home: SDF → LEX', icon: 'Car', color: 'green', homeward: true })
    expect(look(drive('LEX', 'SDF', false, 0, 1))).toEqual({ title: 'Driving to work: LEX → SDF', icon: 'Car', color: 'blue', homeward: false })
  })

  it('labels reserve and hot standby with where they are', () => {
    expect(look(duty('reserve', 'RSV-A', 'SDF', 0, 1))).toEqual({ title: 'RSV-A in Louisville', icon: 'ClockCountdown', color: 'red', homeward: false })
    expect(look(duty('reserve', 'RSV-A', 'XYZ', 0, 1)).title).toBe('RSV-A at XYZ')
    expect(look(duty('reserve', 'RSV-A', null, 0, 1)).title).toBe('RSV-A')
    expect(look(duty('hotStandby', 'Hot Standby', 'SDF', 0, 1))).toEqual({ title: 'Hot Standby in Louisville', icon: 'Lightning', color: 'orange', homeward: false })
  })

  it('shows training and events with the house at home, the buildings at base, and the book elsewhere', () => {
    expect(look(duty('event', 'Drive home', 'LEX', 0, 1))).toEqual({ title: 'Drive home in Lexington', icon: 'House', color: 'green', homeward: true })
    expect(look(duty('training', 'CQ Training', 'SDF', 0, 1))).toEqual({ title: 'CQ Training in Louisville', icon: 'Buildings', color: 'blue', homeward: false })
    expect(look(duty('event', 'Recurrent', 'ATL', 0, 1))).toEqual({ title: 'Recurrent in Atlanta', icon: 'BookOpen', color: 'purple', homeward: false })
    expect(look(duty('training', 'CQ Training', null, 0, 1))).toEqual({ title: 'CQ Training', icon: 'BookOpen', color: 'purple', homeward: false })
  })

  it('never marks reserve or hot standby at home as ending there, as the app doesn’t', () => {
    expect(look(duty('reserve', 'RSV-A', 'LEX', 0, 1)).homeward).toBe(false)
    expect(look(duty('hotStandby', 'Hot Standby', 'LEX', 0, 1)).homeward).toBe(false)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/scheduleFacts.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/ui/scheduleFacts' imported from 'tests/ui/scheduleFacts.test.ts'`.

- [ ] **Step 3: Implement**

Create `src/ui/scheduleFacts.ts`:

```ts
import { airlineColor, airlineIcon } from '../copy/airlines'
import type { ColorToken } from '../copy/colors'
import type { AirportIndex } from '../data/airports'
import type { Leg, MoveLeg } from '../engine/legs'
import type { Pilot } from '../engine/types'
import type { IconName } from '../icons/iconPaths'

/** The legs the Schedule page lists: every leg but the report time, which Duty never sends the app (slice 3A §4.2). */
export function scheduleLegs(legs: readonly Leg[]): Leg[] {
  return legs.filter((l) => l.kind !== 'report')
}

/** What a row shows of its leg: TimelineRowView's title, icon and color, with slice 3A's three fixes (§4.5, §4.6). */
export interface RowLook {
  title: string
  icon: IconName
  color: ColorToken
  /** It ends at the pilot's home airport (the app's isHomebound): a green edge, and a hint for screen readers. */
  homeward: boolean
}

export function rowLook(leg: Leg, pilot: Pilot, airports: AirportIndex): RowLook {
  const homeward = endsAtHome(leg, pilot.effHome)
  switch (leg.kind) {
    case 'flight':
    case 'jumpseat':
      return { title: moveTitle(leg), ...moveLook(leg), homeward }
    case 'turn':
      return { title: `Turn ${where(leg.airport, airports)}`, icon: 'ClockCounterClockwise', color: 'orange', homeward }
    case 'layover':
      return { title: `Layover ${where(leg.airport, airports)}`, icon: 'Bed', color: 'yellow', homeward }
    case 'home':
      return { title: 'Home', icon: 'House', color: 'green', homeward }
    case 'base':
      // The app shows "On Duty" with a grey clock here; the site says what the status page says (decision 2).
      return { title: `At base in ${airports.city(leg.airport) ?? leg.airport}`, icon: 'Buildings', color: 'blue', homeward }
    case 'drive':
      return {
        title: `${leg.toHome ? 'Driving home' : 'Driving to work'}: ${leg.from} → ${leg.to}`,
        icon: 'Car',
        color: homeward ? 'green' : 'blue',
        homeward,
      }
    case 'reserve':
      return { title: labelled(leg.title, leg.airport, airports), icon: 'ClockCountdown', color: 'red', homeward }
    case 'hotStandby':
      return { title: labelled(leg.title, leg.airport, airports), icon: 'Lightning', color: 'orange', homeward }
    case 'training':
    case 'event': {
      const title = labelled(leg.title, leg.airport, airports)
      if (homeward) return { title, icon: 'House', color: 'green', homeward }
      if (leg.airport != null && leg.airport === pilot.base) return { title, icon: 'Buildings', color: 'blue', homeward }
      return { title, icon: 'BookOpen', color: 'purple', homeward }
    }
    default:
      // The app's look for a leg it doesn't know. The report time never gets here: scheduleLegs leaves it out.
      return { title: 'On Duty', icon: 'Clock', color: 'gray', homeward }
  }
}

/** "UPS2961: RFD → SDF", or just "RFD → SDF" when there's no usable flight number. */
function moveTitle(leg: MoveLeg): string {
  const route = `${leg.dep} → ${leg.arr}`
  const flight = flightLabel(leg)
  return flight ? `${flight}: ${route}` : route
}

/**
 * The flight as Duty writes it for the app (PartnerStatusGenerator.formatFlightNumber): "GND" for ground transport;
 * the airline as entered and the number, "AA1234"; "UPS2961" for a company flight; else a jumpseat's number alone.
 */
function flightLabel(leg: MoveLeg): string | null {
  if (leg.ground) return 'GND'
  if (leg.number == null) return null
  if (leg.enteredAirline) return `${leg.enteredAirline}${leg.number}`
  if (leg.kind === 'flight' && leg.airline === '5X') return `UPS${leg.number}`
  return leg.number
}

/**
 * A trip flight goes by the airline the site works out, as the status page does; a jumpseat by the airline entered
 * for it, else the app's green seat. Ground transport is the status page's blue car.
 */
function moveLook(leg: MoveLeg): { icon: IconName; color: ColorToken } {
  if (leg.ground) return { icon: 'Car', color: 'blue' }
  if (leg.kind === 'jumpseat') {
    return leg.enteredAirline
      ? { icon: airlineIcon(leg.enteredAirline), color: airlineColor(leg.enteredAirline) }
      : { icon: 'Seat', color: 'green' }
  }
  return { icon: airlineIcon(leg.airline), color: airlineColor(leg.airline) }
}

/** "in Louisville" when the airport list has its city, else "at SDF", as the app picks the leg's city or its code. */
function where(airport: string, airports: AirportIndex): string {
  const city = airports.get(airport)?.city
  return city ? `in ${city}` : `at ${airport}`
}

/** "RSV-A in Louisville", "RSV-A at XYZ", or the label alone when there's no airport. */
function labelled(label: string, airport: string | null, airports: AirportIndex): string {
  return airport ? `${label} ${where(airport, airports)}` : label
}

/** The app's isHomebound: a flight, jumpseat or drive that lands at home, or training or another event there. */
function endsAtHome(leg: Leg, home: string | null): boolean {
  if (!home) return false
  switch (leg.kind) {
    case 'flight':
    case 'jumpseat':
      return leg.arr === home
    case 'drive':
      return leg.to === home
    case 'training':
    case 'event':
      return leg.airport === home
    default:
      return false
  }
}
```

The three fixes to the app (spec decision 2) are the `base` case, `moveLook`'s airline for trip flights, and its car for ground transport. `where` asks the airport list for a city itself, since the list's `city()` falls back to the code, and the app writes "at SDF" when it has no city.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/scheduleFacts.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1916 tests in 84 files after this task.

```bash
git add tests/ui/scheduleFacts.test.ts src/ui/scheduleFacts.ts
git commit -m "scheduleFacts: the legs the list shows, and each row's title, icon and color, with the three fixes (slice 3A §4.2, §4.5, §4.6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Days, now and next, gaps, and the opening day

**Files:**
- Modify: `src/ui/scheduleFacts.ts`
- Test: `tests/ui/scheduleFacts.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/ui/scheduleFacts.test.ts`, change the imports:

Replace this:

```ts
import { rowLook, scheduleLegs } from '../../src/ui/scheduleFacts'
import { testAirports } from '../fixtures/airports'
import { drive, duty, flight, pilot, place } from '../fixtures/legs'
```

with this:

```ts
import { DAY } from '../../src/time/zoned'
import { gapBefore, legMoment, nextLegId, openingDay, rowLook, scheduleDays, scheduleLegs } from '../../src/ui/scheduleFacts'
import { testAirports } from '../fixtures/airports'
import { drive, duty, flight, H, pilot, place } from '../fixtures/legs'
```

and add these at the end of the file:

```ts
/** Midnight in New York on Thursday 15 Oct 2026, in the fixtures' hours; THU is that calendar day. */
const T0 = Date.UTC(2026, 9, 15, 4) / H
const THU = Date.UTC(2026, 9, 15) / DAY
const NY = 'America/New_York'

describe('scheduleDays (slice 3A §4.3)', () => {
  const thuFlight = flight('SDF', 'RFD', T0 + 6, T0 + 7.5) // 6:00am Thursday in New York
  const overnight = place('layover', 'RFD', T0 + 7.5, T0 + 30) // until 6:00am Friday
  const pastMidnight = duty('event', 'Sim', 'RFD', T0 + 25, T0 + 26) // 1:00am Friday in New York, 10:00pm Thursday in Los Angeles
  const friFlight = flight('RFD', 'SDF', T0 + 30, T0 + 31.5)

  it('groups legs by the calendar day they start on, so a leg across midnight sits under its first day', () => {
    const days = scheduleDays([friFlight, pastMidnight, overnight, thuFlight], NY)
    expect(days.map((d) => [d.day, d.legs.map((l) => l.id)])).toEqual([
      [THU, [thuFlight.id, overnight.id]],
      [THU + 1, [pastMidnight.id, friFlight.id]],
    ])
  })

  it('counts the days in the visitor’s zone', () => {
    const days = scheduleDays([thuFlight, overnight, pastMidnight, friFlight], 'America/Los_Angeles')
    expect(days.map((d) => [d.day, d.legs.length])).toEqual([[THU, 3], [THU + 1, 1]])
  })
})

describe('nextLegId and legMoment (slice 3A §4.9)', () => {
  const legs = [flight('SDF', 'RFD', 1, 2), place('turn', 'RFD', 2, 3), flight('RFD', 'SDF', 3, 4)]

  it('finds the next leg: the first that hasn’t started (EventTimelineView.upNextLegID)', () => {
    expect(nextLegId(legs, 0.5 * H)).toBe(legs[0].id)
    expect(nextLegId(legs, 2 * H)).toBe(legs[2].id)
    expect(nextLegId(legs, 2.5 * H)).toBe(legs[2].id)
    expect(nextLegId(legs, 5 * H)).toBeNull()
  })

  it('says a leg is happening from its start to its end, both included, and marks only the next leg as next', () => {
    expect(legs.map((l) => legMoment(l, 2 * H, nextLegId(legs, 2 * H)))).toEqual(['happening', 'happening', 'next'])
    expect(legs.map((l) => legMoment(l, 2.5 * H, nextLegId(legs, 2.5 * H)))).toEqual(['other', 'happening', 'next'])
    expect(legs.map((l) => legMoment(l, 5 * H, nextLegId(legs, 5 * H)))).toEqual(['other', 'other', 'other'])
  })
})

describe('gapBefore (slice 3A §4.10)', () => {
  const landed = flight('SDF', 'RFD', 1, 2)
  const startingAt = (ms: number) => ({ ...flight('RFD', 'SDF', 3, 4), start: ms })

  it('shows a gap only when the next leg starts a minute or more after one ends', () => {
    expect(gapBefore(landed, startingAt(2 * H))).toBeNull()
    expect(gapBefore(landed, startingAt(2 * H + 59_000))).toBeNull()
    expect(gapBefore(landed, startingAt(2 * H + 60_000))).toEqual({ kind: 'gap', ms: 60_000 })
    expect(gapBefore(landed, startingAt(H))).toBeNull()
  })

  it('names a gap by the leg after it (TimeGapView.gapType)', () => {
    expect(gapBefore(landed, place('home', 'LEX', 4, 9))).toEqual({ kind: 'home', ms: 2 * H })
    expect(gapBefore(landed, place('turn', 'RFD', 3, 4))).toEqual({ kind: 'turn', ms: H })
    expect(gapBefore(landed, place('layover', 'RFD', 3, 9))).toEqual({ kind: 'layover', ms: H })
    expect(gapBefore(landed, drive('RFD', 'LEX', true, 3, 4))).toEqual({ kind: 'gap', ms: H })
  })
})

describe('openingDay (slice 3A §4.11)', () => {
  const thuFlight = flight('SDF', 'RFD', T0 + 6, T0 + 7.5)
  const layover = place('layover', 'RFD', T0 + 7.5, T0 + 54)
  const satFlight = flight('RFD', 'SDF', T0 + 54, T0 + 55.5) // 6:00am Saturday
  const at = (hours: number) => (T0 + hours) * H

  it('opens at the next leg’s day, even while another leg is happening', () => {
    expect(openingDay(scheduleDays([thuFlight, layover, satFlight], NY), at(8), NY)).toBe(THU + 2)
  })

  it('opens at the happening leg’s day when no leg is next', () => {
    expect(openingDay(scheduleDays([thuFlight, layover], NY), at(40), NY)).toBe(THU)
  })

  it('opens at today when nothing is next or happening, and at the top when today has no legs', () => {
    expect(openingDay(scheduleDays([thuFlight], NY), at(12), NY)).toBe(THU)
    expect(openingDay(scheduleDays([thuFlight], NY), at(36), NY)).toBeNull()
    expect(openingDay([], at(12), NY)).toBeNull()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/scheduleFacts.test.ts`
Expected: FAIL in 9 tests (`9 failed | 15 passed (24)`), with `TypeError: scheduleDays is not a function` and the like.

- [ ] **Step 3: Implement**

In `src/ui/scheduleFacts.ts`, change the imports:

Replace this:

```ts
import { airlineColor, airlineIcon } from '../copy/airlines'
import type { ColorToken } from '../copy/colors'
import type { AirportIndex } from '../data/airports'
import type { Leg, MoveLeg } from '../engine/legs'
import type { Pilot } from '../engine/types'
import type { IconName } from '../icons/iconPaths'
```

with this:

```ts
import { airlineColor, airlineIcon } from '../copy/airlines'
import type { ColorToken } from '../copy/colors'
import type { GapKind, LegMoment } from '../copy/schedule'
import type { AirportIndex } from '../data/airports'
import type { Leg, MoveLeg } from '../engine/legs'
import type { Pilot } from '../engine/types'
import type { IconName } from '../icons/iconPaths'
import { calendarDay } from '../time/zoned'
```

and add these at the end of the file:

```ts
/** One day of the list: the legs that start on that calendar day in the visitor's zone (slice 3A §4.3). */
export interface ScheduleDay {
  /** That calendar date as days since the epoch, as calendarDay gives it. */
  day: number
  legs: Leg[]
}

/** The list's days in order, each with its legs by start time (EventTimelineView.groupedSections). */
export function scheduleDays(legs: readonly Leg[], timeZone: string): ScheduleDay[] {
  const days: ScheduleDay[] = []
  for (const leg of [...legs].sort((a, b) => a.start - b.start)) {
    const day = calendarDay(leg.start, timeZone)
    const last = days[days.length - 1]
    if (last?.day === day) last.legs.push(leg)
    else days.push({ day, legs: [leg] })
  }
  return days
}

/** The next leg to start: the first that hasn't begun (EventTimelineView.upNextLegID). `legs` are in start order. */
export function nextLegId(legs: readonly Leg[], now: number): string | null {
  return legs.find((l) => l.start > now)?.id ?? null
}

/** Where a leg stands at `now`: happening from its start to its end, both included, the next leg, or neither (§4.9). */
export function legMoment(leg: Leg, now: number, nextId: string | null): LegMoment {
  if (leg.start <= now && now <= leg.end) return 'happening'
  return leg.id === nextId ? 'next' : 'other'
}

/** The gap before `next`, named by it, when it starts a minute or more after `prev` ends (TimeGapView, §4.10). */
export function gapBefore(prev: Leg, next: Leg): { kind: GapKind; ms: number } | null {
  const ms = next.start - prev.end
  if (ms < 60_000) return null
  return { kind: next.kind === 'home' || next.kind === 'turn' || next.kind === 'layover' ? next.kind : 'gap', ms }
}

/**
 * The day the list opens at, as the app's screen scrolls when it opens: the next leg's day, else the happening leg's,
 * else today. Null when that day has no legs, and the list opens at the top (§4.11).
 */
export function openingDay(days: readonly ScheduleDay[], now: number, timeZone: string): number | null {
  const legs = days.flatMap((d) => d.legs)
  const leg = legs.find((l) => l.start > now) ?? legs.find((l) => l.start <= now && now <= l.end)
  const target = calendarDay(leg?.start ?? now, timeZone)
  return days.some((d) => d.day === target) ? target : null
}
```

`openingDay` copies the app's first scroll: the next leg's day comes first, even while another leg is happening, as `EventTimelineView` does when it opens.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/scheduleFacts.test.ts`
Expected: PASS, 24 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1925 tests in 84 files after this task.

```bash
git add tests/ui/scheduleFacts.test.ts src/ui/scheduleFacts.ts
git commit -m "scheduleFacts: days, the leg happening now, the next leg, gaps, and the day the list opens at (slice 3A §4.3, §4.9–4.11)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The chevron, and the cards as links

**Files:**
- Create: `src/ui/Chevron.tsx`, `src/ui/ScheduleLink.tsx`
- Modify: `src/ui/CountdownCard.tsx`, `src/ui/FallbackCard.tsx`, `src/ui/UpcomingTripCard.tsx`, `src/styles/cards.css`
- Test: `tests/ui/scheduleLinks.test.tsx`, `tests/styles/styles.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/ui/scheduleLinks.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UpcomingTrip } from '../../src/engine/trips'
import { Chevron } from '../../src/ui/Chevron'
import { CountdownCard } from '../../src/ui/CountdownCard'
import { FallbackCard } from '../../src/ui/FallbackCard'
import { SCHEDULE_HASH, type ScheduleLinkName } from '../../src/ui/ScheduleLink'
import { UpcomingTripCard } from '../../src/ui/UpcomingTripCard'
import { testAirports } from '../fixtures/airports'

afterEach(cleanup)

const NOW = Date.UTC(2026, 9, 9, 12)
const leaveCard = (onOpen?: (name: ScheduleLinkName) => void) => (
  <CountdownCard title="Leaves Home In" icon="Car" color="blue" target={NOW + 3_600_000} now={NOW} subtitle={null}
    link={onOpen && { name: 'leave', onOpen }} />
)
const trip: UpcomingTrip = { tripId: 't1', departs: NOW + 86_400_000, days: 2, route: ['SDF', 'RFD'], delayMinutes: 40 }

describe('Chevron', () => {
  it('draws SF Symbols’ chevron as a line with round ends, right or left, hidden from screen readers', () => {
    const { container, rerender } = render(<Chevron />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect([svg.getAttribute('width'), svg.getAttribute('height'), svg.getAttribute('viewBox')]).toEqual(['8', '14', '0 0 8 14'])
    const line = svg.querySelector('polyline')!
    expect(line.getAttribute('points')).toBe('1.5,1.5 6.5,7 1.5,12.5')
    expect([line.getAttribute('stroke'), line.getAttribute('stroke-width'), line.getAttribute('stroke-linecap')]).toEqual(['currentColor', '2', 'round'])
    rerender(<Chevron direction="left" size={17} weight={2.4} />)
    expect(container.querySelector('polyline')!.getAttribute('points')).toBe('6.5,1.5 1.5,7 6.5,12.5')
    expect(container.querySelector('svg')!.getAttribute('height')).toBe('17')
    expect(container.querySelector('polyline')!.getAttribute('stroke-width')).toBe('2.4')
  })
})

describe('the cards that open the schedule (slice 3A §3.1)', () => {
  it('ends the countdown card’s top row with a link named Schedule to the schedule’s address, and marks the card', () => {
    const { container } = render(leaveCard(() => {}))
    const link = screen.getByRole('link', { name: 'Schedule' })
    expect(link.getAttribute('href')).toBe(SCHEDULE_HASH)
    expect(link.getAttribute('data-schedule-link')).toBe('leave')
    expect(link.parentElement!.className).toBe('countdown-head')
    expect(link.previousElementSibling!.tagName).toBe('H2')
    expect(link.querySelector('svg polyline')).not.toBeNull()
    expect(container.querySelector('section')!.className).toBe('card glass countdown linked')
  })

  it('leaves a card without a link as it was', () => {
    const { container } = render(leaveCard())
    expect(screen.queryByRole('link')).toBeNull()
    expect(container.querySelector('section')!.className).toBe('card glass countdown')
  })

  it('opens the schedule on a plain click, and leaves a click with a modifier key or another button to the browser', () => {
    const onOpen = vi.fn()
    render(leaveCard(onOpen))
    const link = screen.getByRole('link', { name: 'Schedule' })
    // Records whether the card's own handler took the click, then keeps the test page where it is.
    const taken: boolean[] = []
    const record = (e: Event) => {
      taken.push(e.defaultPrevented)
      e.preventDefault()
    }
    document.addEventListener('click', record)
    try {
      fireEvent.click(link)
      for (const init of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) fireEvent.click(link, init)
    } finally {
      document.removeEventListener('click', record)
    }
    expect(taken).toEqual([true, false, false, false, false, false])
    expect(onOpen.mock.calls).toEqual([['leave']])
  })

  it('gives the ~N days card and the upcoming trip card the same link, the trip card’s after its delay badge', () => {
    render(<FallbackCard daysRemaining={2} link={{ name: 'fallback', onOpen: () => {} }} />)
    expect(screen.getByRole('link', { name: 'Schedule' }).getAttribute('data-schedule-link')).toBe('fallback')
    cleanup()
    const { container } = render(
      <UpcomingTripCard trip={trip} now={NOW} timeZone="America/New_York" h24={false} airports={testAirports} link={{ name: 'trip', onOpen: () => {} }} />,
    )
    const link = screen.getByRole('link', { name: 'Schedule' })
    expect(link.getAttribute('data-schedule-link')).toBe('trip')
    expect(link.parentElement!.className).toBe('trip-head')
    expect(link.previousElementSibling!.className).toBe('badge')
    expect(container.querySelector('section')!.className).toBe('card glass trip-card linked')
  })

  it('presses the card in while a pointer holds the link, and lets go when it lifts, leaves or turns into a scroll', () => {
    const { container } = render(leaveCard(() => {}))
    const card = container.querySelector('section')!
    const link = screen.getByRole('link', { name: 'Schedule' })
    for (const end of ['pointerUp', 'pointerLeave', 'pointerCancel'] as const) {
      fireEvent.pointerDown(link, { button: 0 })
      expect(card.className).toBe('card glass countdown linked pressed')
      fireEvent[end](link)
      expect(card.className).toBe('card glass countdown linked')
    }
    fireEvent.pointerDown(link, { button: 2 })
    expect(card.className).toBe('card glass countdown linked')
  })
})
```

In `tests/styles/styles.test.ts`, add these tests at the end of the `cards.css` block:

```ts
  it('lets a linked card’s chevron link cover the whole card, and presses the card in to 97% and 85% (slice 3A §3.1)', () => {
    expect(declarations(find(top, '.linked')!.body)).toContainEqual(['position', 'relative'])
    expect(declarations(find(top, '.linked.pressed')!.body)).toEqual([['transform', 'scale(0.97)'], ['opacity', '0.85']])
    expect(declarations(find(top, '.schedule-link::after')!.body)).toEqual(
      expect.arrayContaining([['content', "''"], ['position', 'absolute'], ['inset', '0']]),
    )
  })

  it('rings the whole card while its link has keyboard focus, and only fades a pressed card for reduced motion', () => {
    expect(declarations(find(top, '.schedule-link:focus::after')!.body)).toContainEqual(['box-shadow', '0 0 0 2px var(--blue)'])
    const media = find(top, '@media (prefers-reduced-motion: reduce)')!
    expect(declarations(find(blocks(media.body), '.linked.pressed')!.body)).toEqual([['transform', 'none']])
  })
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/scheduleLinks.test.tsx tests/styles/styles.test.ts`
Expected: FAIL. The new test file can't load (`Failed to resolve import "../../src/ui/Chevron"`), and the two style tests fail (`2 failed | 139 passed (141)`) with `Cannot read properties of undefined (reading 'body')`: the rules aren't there yet.

- [ ] **Step 3: Implement**

Create `src/ui/Chevron.tsx`:

```tsx
/**
 * SF Symbols' chevron.right or chevron.left, drawn as a line with round ends like the in-flight map's arrow (slice 3A
 * §5.1). `size` is its height in pixels and `weight` the line's width, both in the 8 × 14 box it's drawn in.
 */
export function Chevron({ direction = 'right', size = 14, weight = 2 }: { direction?: 'left' | 'right'; size?: number; weight?: number }) {
  return (
    <svg class="chevron" width={(size * 8) / 14} height={size} viewBox="0 0 8 14" aria-hidden="true">
      <polyline
        points={direction === 'right' ? '1.5,1.5 6.5,7 1.5,12.5' : '6.5,1.5 1.5,7 6.5,12.5'}
        fill="none"
        stroke="currentColor"
        stroke-width={weight}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  )
}
```

Create `src/ui/ScheduleLink.tsx`:

```tsx
import type { JSX } from 'preact'
import { useState } from 'preact/hooks'
import { Chevron } from './Chevron'

/** The Schedule page's address, on this same page (slice 3A §3.3). */
export const SCHEDULE_HASH = '#schedule'

/** Which way into the schedule was taken, so focus can go back to it afterwards (slice 3A §3.3). */
export type ScheduleLinkName = 'leave' | 'arrival' | 'fallback' | 'trip' | 'view'

/** A card's way into the schedule: its name, and what opens the page. */
export interface ScheduleLinkProps {
  name: ScheduleLinkName
  onOpen: (name: ScheduleLinkName) => void
}

/**
 * Opens the schedule on this page for a plain click, as the app's buttons do. A click with a modifier key, or with
 * another button, is left to the browser, which opens the page's address in a new tab or window.
 */
export function openOnPlainClick(e: MouseEvent, open: () => void): void {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  open()
}

/**
 * Whether a pointer is holding a link down, for the app's CardButtonStyle: pressed from the moment it goes down, let
 * go when it lifts, leaves, or turns into a scroll (slice 3A §3.1).
 */
export function usePressed() {
  const [pressed, setPressed] = useState(false)
  const release = () => setPressed(false)
  return {
    pressed,
    handlers: {
      onPointerDown: (e: PointerEvent) => {
        if (e.button === 0) setPressed(true)
      },
      onPointerUp: release,
      onPointerLeave: release,
      onPointerCancel: release,
    },
  }
}

/**
 * A card's way into the schedule (PilotStatusView.scheduleLink, slice 3A §3.1). `chevron` ends the card's top row: a
 * link whose area covers the whole card, so a tap anywhere on it opens the schedule. `linked` is the card's extra
 * classes, with "pressed" while a pointer holds it. Without `link`, the card stays as it was.
 */
export function useScheduleLink(link: ScheduleLinkProps | undefined): { linked: string; chevron: JSX.Element | null } {
  const { pressed, handlers } = usePressed()
  if (!link) return { linked: '', chevron: null }
  return {
    linked: pressed ? ' linked pressed' : ' linked',
    chevron: (
      <a class="schedule-link" href={SCHEDULE_HASH} data-schedule-link={link.name}
        onClick={(e) => openOnPlainClick(e, () => link.onOpen(link.name))} {...handlers}>
        <span class="sr-only">Schedule</span>
        <Chevron />
      </a>
    ),
  }
}
```

The press is followed with pointer events, not `:active`, which iOS Safari applies only to elements with a touch listener. A touch that turns into a scroll sends `pointercancel`, which lets the card go.

In `src/ui/CountdownCard.tsx`, import the link after `Icon`:

```tsx
import { useScheduleLink, type ScheduleLinkProps } from './ScheduleLink'
```

and give the card its link:

Replace this:

```tsx
  celebrateKey?: number
}

/** "Back Home In" / "Leaves Home In" card (CountdownCardView). */
export function CountdownCard({ title, icon, color, target, now, subtitle, celebrate = false, celebrateKey = 0 }: CountdownCardProps) {
  const css = cssColor(color)
  const parts = cardCountdown(target - now)
  return (
    <section class="card glass countdown">
      <div class="countdown-head">
        <Icon name={icon} size={28} color={css} />
        <h2>{title}</h2>
      </div>
```

with this:

```tsx
  celebrateKey?: number
  /** The way into the schedule: a chevron, and the whole card as a link (slice 3A §3.1). */
  link?: ScheduleLinkProps
}

/** "Back Home In" / "Leaves Home In" card (CountdownCardView). */
export function CountdownCard({ title, icon, color, target, now, subtitle, celebrate = false, celebrateKey = 0, link }: CountdownCardProps) {
  const css = cssColor(color)
  const parts = cardCountdown(target - now)
  const { linked, chevron } = useScheduleLink(link)
  return (
    <section class={`card glass countdown${linked}`}>
      <div class="countdown-head">
        <Icon name={icon} size={28} color={css} />
        <h2>{title}</h2>
        {chevron}
      </div>
```

In `src/ui/FallbackCard.tsx`, import the link after `Icon`:

```tsx
import { useScheduleLink, type ScheduleLinkProps } from './ScheduleLink'
```

and give the card its link:

Replace this:

```tsx
export function FallbackCard({ daysRemaining }: { daysRemaining: number }) {
  return (
    <section class="card glass countdown">
      <div class="countdown-head">
        <Icon name="House" size={28} color="var(--green)" />
        <h2>Back Home In</h2>
      </div>
```

with this:

```tsx
/** The way into the schedule is `link`: a chevron, and the whole card as a link (slice 3A §3.1). */
export function FallbackCard({ daysRemaining, link }: { daysRemaining: number; link?: ScheduleLinkProps }) {
  const { linked, chevron } = useScheduleLink(link)
  return (
    <section class={`card glass countdown${linked}`}>
      <div class="countdown-head">
        <Icon name="House" size={28} color="var(--green)" />
        <h2>Back Home In</h2>
        {chevron}
      </div>
```

In `src/ui/UpcomingTripCard.tsx`, import the link after `Icon`:

```tsx
import { useScheduleLink, type ScheduleLinkProps } from './ScheduleLink'
```

take it as a prop:

Replace this:

```tsx
  h24: boolean
  airports: AirportIndex
}

/** UpcomingTripCard: the type badge, departure and length, a delay badge when late or early, then the route dots. */
export function UpcomingTripCard({ trip, now, timeZone, h24, airports }: UpcomingTripCardProps) {
  const last = trip.route.length - 1
  return (
    <section class="card glass trip-card">
```

with this:

```tsx
  h24: boolean
  airports: AirportIndex
  /** The way into the schedule: a chevron, and the whole card as a link (slice 3A §3.1). */
  link?: ScheduleLinkProps
}

/** UpcomingTripCard: the type badge, departure and length, a delay badge when late or early, then the route dots. */
export function UpcomingTripCard({ trip, now, timeZone, h24, airports, link }: UpcomingTripCardProps) {
  const last = trip.route.length - 1
  const { linked, chevron } = useScheduleLink(link)
  return (
    <section class={`card glass trip-card${linked}`}>
```

and put the chevron after the delay badge:

```tsx
        {chevron}
```

In `src/styles/cards.css`, replace the reduced-motion block near the end with the links' rules and the block, which now also covers a pressed card:

```css
/* A card that opens the schedule (slice 3A §3.1). Its link's area covers the whole card, and the card presses in as the
   app's CardButtonStyle does: to 97% and 85% while held, springing back over about 0.3 s. */
.linked {
  position: relative;
  transition: transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.3s ease-out;
}

.linked.pressed {
  transform: scale(0.97);
  opacity: 0.85;
}

.schedule-link {
  margin-left: auto;
  display: flex;
  align-items: center;
  color: var(--text-2);
}

.schedule-link::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
}

/* The focus ring goes round the whole card. Safari before 15.4 has no :focus-visible, drops the last rule, and keeps
   the ring; it doesn't focus a link that's clicked. */
.schedule-link:focus {
  outline: none;
}

.schedule-link:focus::after {
  box-shadow: 0 0 0 2px var(--blue);
}

.schedule-link:focus:not(:focus-visible)::after {
  box-shadow: none;
}

@media (prefers-reduced-motion: reduce) {
  .digits {
    animation: none;
  }

  .linked.pressed {
    transform: none;
  }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/scheduleLinks.test.tsx tests/styles/styles.test.ts`
Expected: PASS, 147 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1935 tests in 85 files after this task.

```bash
git add tests/ui/scheduleLinks.test.tsx tests/styles/styles.test.ts src/ui/Chevron.tsx src/ui/ScheduleLink.tsx src/ui/CountdownCard.tsx src/ui/FallbackCard.tsx src/ui/UpcomingTripCard.tsx src/styles/cards.css
git commit -m "The chevron, and the countdown, ~N days and upcoming trip cards as links into the schedule (slice 3A §3.1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The status page's ways in, View Schedule, and the nothing-ahead scene

**Files:**
- Modify: `src/data/demo.ts`, `src/ui/ScheduleLink.tsx`, `src/ui/StatusScreen.tsx`, `src/styles/cards.css`
- Test: `tests/ui/scheduleLinks.test.tsx`, `tests/ui/StatusScreen.test.tsx`, `tests/data/demoScenes.test.ts`, `tests/styles/styles.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/ui/scheduleLinks.test.tsx`, change the imports:

Replace this:

```tsx
import { SCHEDULE_HASH, type ScheduleLinkName } from '../../src/ui/ScheduleLink'
import { UpcomingTripCard } from '../../src/ui/UpcomingTripCard'
import { testAirports } from '../fixtures/airports'
```

with this:

```tsx
import { SCHEDULE_HASH, ViewScheduleLink, type ScheduleLinkName } from '../../src/ui/ScheduleLink'
import { UpcomingTripCard } from '../../src/ui/UpcomingTripCard'
import { testAirports } from '../fixtures/airports'
import { iconNameOf } from '../fixtures/ui'
```

and add this at the end of the file:

```tsx
describe('ViewScheduleLink (slice 3A §3.2)', () => {
  it('is one link named View Schedule, with the blue calendar and a small chevron, that opens the schedule', () => {
    const onOpen = vi.fn()
    render(<ViewScheduleLink onOpen={onOpen} />)
    const link = screen.getByRole('link', { name: 'View Schedule' })
    expect(link.getAttribute('href')).toBe(SCHEDULE_HASH)
    expect(link.getAttribute('data-schedule-link')).toBe('view')
    expect(link.className).toBe('card glass view-schedule linked')
    expect(iconNameOf(link.querySelector('svg.icon'))).toBe('CalendarBlank')
    expect(link.querySelector('.chevron')!.getAttribute('height')).toBe('12')
    expect(fireEvent.click(link)).toBe(false)
    expect(onOpen).toHaveBeenCalledWith('view')
    fireEvent.pointerDown(link, { button: 0 })
    expect(link.className).toBe('card glass view-schedule linked pressed')
    fireEvent.pointerUp(link)
    expect(link.className).toBe('card glass view-schedule linked')
  })
})
```

In `tests/ui/StatusScreen.test.tsx`, import the link's name type after the `Footer` import:

```tsx
import type { ScheduleLinkName } from '../../src/ui/ScheduleLink'
```

add this block at the end of the file:

```tsx
describe('StatusScreen: the ways into the schedule (slice 3A §3.1, §3.2)', () => {
  const linksAt = (minutes: number, snap: Snapshot = makeSnapshot(e.schedule, e.legs, at(minutes), NY), onOpen?: (name: ScheduleLinkName) => void) => {
    const now = at(minutes)
    const { container } = render(
      <StatusScreen snap={snap} now={now} viewerTz={NY} homeTz={NY} h24={false} airports={testAirports} weather={null} demo={false}
        celebrateKey={0} footer={footer(now)} onOpenSchedule={onOpen ?? (() => {})} />,
    )
    return { container, names: [...container.querySelectorAll('[data-schedule-link]')].map((a) => a.getAttribute('data-schedule-link')) }
  }
  const away = () => makeSnapshot(e.schedule, e.legs, at(100), NY)

  it('links the Leaves Home In card and the upcoming trip card at home, with no View Schedule button', () => {
    expect(linksAt(-1440).names).toEqual(['leave', 'trip'])
    expect(screen.queryByRole('link', { name: 'View Schedule' })).toBeNull()
  })

  it('links the arrival countdown away, and the trip card too at base', () => {
    expect(linksAt(100).names).toEqual(['arrival'])
    cleanup()
    expect(linksAt(30).names).toEqual(['arrival', 'trip'])
  })

  it('links only the trip card at base between trips, with no View Schedule button', () => {
    expect(linksAt(7000).names).toEqual(['trip'])
  })

  it('links the ~N days card when no arrival can be worked out', () => {
    expect(linksAt(100, { ...away(), arrival: null, fallbackDaysRemaining: 2 }).names).toEqual(['fallback'])
  })

  it('shows View Schedule after the narrative and before the location card when no card leads to the schedule', () => {
    const { container, names } = linksAt(12000) // home, with no trip ahead
    expect(names).toEqual(['view'])
    const button = screen.getByRole('link', { name: 'View Schedule' })
    expect(container.querySelector('.narrative')!.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(button.compareDocumentPosition(container.querySelector('.location')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows View Schedule away when nothing else leads there, where the app has no way in', () => {
    expect(linksAt(100, { ...away(), arrival: null, fallbackDaysRemaining: null }).names).toEqual(['view'])
  })

  it('opens the schedule with the name of the link taken', () => {
    const opened: ScheduleLinkName[] = []
    linksAt(-1440, undefined, (name) => opened.push(name))
    fireEvent.click(screen.getAllByRole('link', { name: 'Schedule' })[1])
    expect(opened).toEqual(['trip'])
  })

  it('shows View Schedule in the demo’s nothing-ahead scene: home, with no trip ahead', () => {
    const now = Date.UTC(2026, 9, 20, 16, 0)
    const schedule = buildSchedule(demoRawForScene('nothing-ahead', now), now)
    render(
      <StatusScreen snap={makeSnapshot(schedule, buildLegs(schedule), now, NY)} now={now} viewerTz={NY} homeTz={NY} h24={false}
        airports={testAirports} weather={null} demo celebrateKey={0} footer={footer(now)} onOpenSchedule={() => {}} />,
    )
    expect(screen.getByRole('link', { name: 'View Schedule' })).toBeTruthy()
  })

  it('has no way into the schedule without onOpenSchedule, as on the app’s iPad', () => {
    for (const minutes of [-1440, 100, 12000]) {
      const { container } = renderAt(minutes)
      expect(container.querySelector('[data-schedule-link]')).toBeNull()
      cleanup()
    }
  })
})
```

and add the new scene to the location card's table in "the location card in each demo scene":

```tsx
    'nothing-ahead': 'Lexington',
```

In `tests/data/demoScenes.test.ts`, add the scene to `EXPECTED`:

```ts
  'nothing-ahead': 'home',
```

and to `CARDS`:

```ts
    'nothing-ahead': {},
```

In `tests/styles/styles.test.ts`, add this test at the end of the `cards.css` block:

```ts
  it('lays the View Schedule button out as the app does: 16 px in, the words at 20 px semibold filling the row (slice 3A §3.2)', () => {
    expect(declarations(find(top, '.view-schedule')!.body)).toEqual(expect.arrayContaining([['display', 'flex'], ['gap', '8px'], ['padding', '16px']]))
    expect(declarations(find(top, '.view-schedule-text')!.body)).toEqual(
      expect.arrayContaining([['flex', '1'], ['font-size', '20px'], ['font-weight', '600']]),
    )
  })
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/StatusScreen.test.tsx tests/ui/scheduleLinks.test.tsx tests/styles/styles.test.ts tests/data/demoScenes.test.ts`
Expected: FAIL in 11 tests (`11 failed | 243 passed (254)`). The status page has no links yet (`expected [] to deeply equal [ 'leave', 'trip' ]`), `ViewScheduleLink` isn't there, the `nothing-ahead` scene doesn't exist, and the View Schedule rules are missing.

- [ ] **Step 3: Implement**

In `src/data/demo.ts`, add the scene to `DemoScene`:

Replace this:

```ts
  | 'last-leg' | 'driving-home' | 'commuting-home' | 'reserve' | 'training'
```

with this:

```ts
  | 'last-leg' | 'driving-home' | 'commuting-home' | 'reserve' | 'training' | 'nothing-ahead'
```

and to `DEMO_SCENES`, after `training`:

```ts
  // Home after the last trip, with nothing ahead: the status page shows View Schedule (slice 3A §3.2).
  'nothing-ahead': { variant: 'driver', offset: 12000 },
```

In `src/ui/ScheduleLink.tsx`, import `Icon` after `Chevron`:

```tsx
import { Icon } from './Icon'
```

and add the button at the end of the file:

```tsx
/**
 * The View Schedule button (PilotStatusView, slice 3A §3.2): the blue calendar, "View Schedule" and a small chevron in
 * one glass card that's a link into the schedule, pressing in as the cards do.
 */
export function ViewScheduleLink({ onOpen }: { onOpen: (name: ScheduleLinkName) => void }) {
  const { pressed, handlers } = usePressed()
  return (
    <a class={`card glass view-schedule linked${pressed ? ' pressed' : ''}`} href={SCHEDULE_HASH} data-schedule-link="view"
      onClick={(e) => openOnPlainClick(e, () => onOpen('view'))} {...handlers}>
      <Icon name="CalendarBlank" size={22} color="var(--blue)" />
      <span class="view-schedule-text">View Schedule</span>
      <Chevron size={12} weight={1.5} />
    </a>
  )
}
```

In `src/ui/StatusScreen.tsx`, import the links after `NarrativeCard`:

```tsx
import { ViewScheduleLink, type ScheduleLinkName, type ScheduleLinkProps } from './ScheduleLink'
```

take the way to open the schedule as a prop, with a helper after the props:

Replace this:

```tsx
  celebrateKey: number
  footer: FooterProps
}
```

with this:

```tsx
  celebrateKey: number
  footer: FooterProps
  /**
   * Opens the schedule from the link named (slice 3A §3). Without it the page has no way into the schedule, as on the
   * app's iPad, where the schedule sits beside it.
   */
  onOpenSchedule?: (name: ScheduleLinkName) => void
}

/** The link into the schedule named `name`, or none when the page has no way into it. */
const linkTo = (name: ScheduleLinkName, open?: (name: ScheduleLinkName) => void): ScheduleLinkProps | undefined =>
  open && { name, onOpen: open }
```

work out whether a card leads to the schedule, after `flight`:

```tsx
  // The cards that lead to the schedule (slice 3A §3.1); View Schedule shows whenever none of them is here (§3.2).
  const home = snap.status.kind === 'home'
  const cardLeadsThere = (home ? snap.leave != null : snap.arrival != null || snap.fallbackDaysRemaining != null) || snap.upcomingTrip != null
```

show View Schedule after the countdown cards:

Replace this:

```tsx
        {snap.status.kind === 'home' ? <HomeCards {...p} /> : <AwayCard {...p} />}
```

with this:

```tsx
        {home ? <HomeCards {...p} /> : <AwayCard {...p} />}
        {p.onOpenSchedule && !cardLeadsThere && <ViewScheduleLink onOpen={p.onOpenSchedule} />}
```

give the upcoming trip card its link:

Replace this:

```tsx
          <UpcomingTripCard trip={snap.upcomingTrip} now={p.now} timeZone={p.homeTz} h24={p.h24} airports={p.airports} />
```

with this:

```tsx
          <UpcomingTripCard trip={snap.upcomingTrip} now={p.now} timeZone={p.homeTz} h24={p.h24} airports={p.airports}
            link={linkTo('trip', p.onOpenSchedule)} />
```

take the prop in `HomeCards`:

Replace this:

```tsx
function HomeCards({ snap, now, homeTz, h24, airports }: StatusScreenProps) {
```

with this:

```tsx
function HomeCards({ snap, now, homeTz, h24, airports, onOpenSchedule }: StatusScreenProps) {
```

give the Leaves Home In card its link:

Replace this:

```tsx
        <CountdownCard title={visual.title} icon={visual.icon} color={visual.color} target={leave.time} now={now} subtitle={subtitle} />
```

with this:

```tsx
        <CountdownCard title={visual.title} icon={visual.icon} color={visual.color} target={leave.time} now={now} subtitle={subtitle}
          link={linkTo('leave', onOpenSchedule)} />
```

take the prop in `AwayCard`, and give the "~N days" card its link:

Replace this:

```tsx
function AwayCard({ snap, now, homeTz, h24, airports, celebrateKey }: StatusScreenProps) {
  const arrival = snap.arrival
  if (!arrival) {
    return snap.fallbackDaysRemaining != null ? <FallbackCard daysRemaining={snap.fallbackDaysRemaining} /> : null
  }
```

with this:

```tsx
function AwayCard({ snap, now, homeTz, h24, airports, celebrateKey, onOpenSchedule }: StatusScreenProps) {
  const arrival = snap.arrival
  if (!arrival) {
    return snap.fallbackDaysRemaining != null
      ? <FallbackCard daysRemaining={snap.fallbackDaysRemaining} link={linkTo('fallback', onOpenSchedule)} />
      : null
  }
```

and give the arrival countdown its link, after `celebrateKey`:

```tsx
      link={linkTo('arrival', onOpenSchedule)}
```

In `src/styles/cards.css`, add the View Schedule rules after the links' focus rules:

```css
/* The View Schedule button (slice 3A §3.2): the 22 px calendar, the words at 20 px semibold, and a 12 px chevron. */
.view-schedule {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: var(--text);
  text-decoration: none;
}

.view-schedule-text {
  flex: 1;
  font-size: 20px;
  line-height: 25px;
  font-weight: 600;
}

.view-schedule .chevron {
  color: var(--text-2);
}
```

Without `onOpenSchedule`, the status page has no links into the schedule. That's how 3C will show it beside the schedule on wide screens, as the app's iPad does.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/StatusScreen.test.tsx tests/ui/scheduleLinks.test.tsx tests/styles/styles.test.ts tests/data/demoScenes.test.ts`
Expected: PASS, 257 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1950 tests in 85 files after this task.

```bash
git add tests/ui/scheduleLinks.test.tsx tests/ui/StatusScreen.test.tsx tests/data/demoScenes.test.ts tests/styles/styles.test.ts src/data/demo.ts src/ui/ScheduleLink.tsx src/ui/StatusScreen.tsx src/styles/cards.css
git commit -m "The status page's ways into the schedule: the four cards' links, and View Schedule whenever none of them is there (slice 3A §3.1, §3.2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: One row

**Files:**
- Create: `src/ui/TimelineRow.tsx`, `src/styles/schedule.css`
- Modify: `src/main.tsx`
- Test: `tests/ui/TimelineRow.test.tsx`, `tests/styles/styles.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/ui/TimelineRow.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import type { GapKind, LegMoment } from '../../src/copy/schedule'
import type { Leg } from '../../src/engine/legs'
import { rowLook } from '../../src/ui/scheduleFacts'
import { TimelineRow } from '../../src/ui/TimelineRow'
import { testAirports } from '../fixtures/airports'
import { drive, flight, H, pilot, place } from '../fixtures/legs'
import { iconNameOf } from '../fixtures/ui'

afterEach(cleanup)

const NY = 'America/New_York'
/** Midnight in New York on Thursday 15 Oct 2026, in the fixtures' hours. */
const T0 = Date.UTC(2026, 9, 15, 4) / H
const at = (hours: number) => (T0 + hours) * H
const commuter = pilot('LEX', 'SDF')
const ups = flight('RFD', 'SDF', T0 + 6.25, T0 + 7.75, 'T1', { number: '2961' }) // 6:15am to 7:45am

function row(leg: Leg, moment: LegMoment, now: number, gap: { kind: GapKind; ms: number } | null = null) {
  const { container } = render(
    <ol>
      <TimelineRow leg={leg} look={rowLook(leg, commuter, testAirports)} moment={moment} now={now} timeZone={NY} h24={false} gap={gap} />
    </ol>,
  )
  const card = container.querySelector<HTMLElement>('.leg')!
  const text = (selector: string) => card.querySelector(selector)?.textContent ?? null
  return { container, card, text }
}

describe('TimelineRow (slice 3A §4.4–4.9)', () => {
  it('shows the icon in a circle of the leg’s color, the title, the times, and the leg’s length', () => {
    const { card, text } = row(ups, 'other', at(9))
    expect(card.className).toBe('leg glass')
    expect(card.style.getPropertyValue('--leg')).toBe('var(--ups)')
    const icon = card.querySelector('.leg-icon svg')!
    expect(iconNameOf(icon)).toBe('Package')
    expect(icon.getAttribute('width')).toBe('15')
    expect(text('.leg-title')).toBe('UPS2961: RFD → SDF')
    expect(text('.leg-times')).toBe('6:15am edt – 7:45am edt')
    expect([text('.leg-clock-label'), text('.leg-clock-value'), text('.leg-clock .sr-only')]).toEqual(['Duration', '1h 30m', 'Duration 1 hour, 30 minutes'])
    expect(card.querySelector('.up-next')).toBeNull()
    expect(card.querySelector('.leg-icon')!.className).toBe('leg-icon')
  })

  it('counts down the leg happening now, with its edge and a pulsing icon', () => {
    const { card, text } = row(ups, 'happening', at(7))
    expect(card.className).toBe('leg glass leg-happening')
    expect(card.querySelector('.leg-icon')!.className).toBe('leg-icon pulsing')
    expect([text('.leg-clock-label'), text('.leg-clock-value')]).toEqual(['Ends in', '45:00'])
    expect(card.querySelector('.up-next')).toBeNull()
  })

  it('rings the next leg, tags it UP NEXT, and counts down to its start', () => {
    const { card, text } = row(ups, 'next', at(5))
    expect(card.className).toBe('leg glass leg-next')
    const ring = card.querySelector('.leg-ring')!
    expect(ring.getAttribute('aria-hidden')).toBe('true')
    expect(ring.querySelector('.leg-ring-turn')).not.toBeNull()
    expect(text('.up-next')).toBe('UP NEXT')
    expect([text('.leg-clock-label'), text('.leg-clock-value')]).toEqual(['Starts in', '1:15:00'])
    expect(card.querySelector('.leg-icon')!.className).toBe('leg-icon')
  })

  it('edges a leg that ends at home in green, and tells screen readers it arrives home', () => {
    const home = drive('SDF', 'LEX', true, T0 + 9, T0 + 10.5)
    const { card } = row(home, 'other', at(12))
    expect(card.className).toBe('leg glass leg-home homeward')
    expect([...card.querySelectorAll('.sr-only')].map((s) => s.textContent)).toContain('Arriving at home airport')
    cleanup()
    expect(row(home, 'happening', at(10)).card.className).toBe('leg glass leg-happening homeward')
  })

  it('puts the gap before the row as a dashed line and its label, hidden from screen readers', () => {
    const layover = place('layover', 'ONT', T0 + 10, T0 + 30)
    const { container } = row(layover, 'other', at(40), { kind: 'layover', ms: 2 * H })
    const item = container.querySelector('li')!
    const gap = item.firstElementChild!
    expect(gap.className).toBe('leg-gap leg-gap-layover')
    expect(gap.getAttribute('aria-hidden')).toBe('true')
    expect(gap.textContent).toBe('Layover 2h')
    expect(gap.querySelector('.leg-gap-line')).not.toBeNull()
    expect(gap.nextElementSibling!.className).toBe('leg glass')
    cleanup()
    expect(row(layover, 'other', at(40)).container.querySelector('.leg-gap')).toBeNull()
  })
})
```

In `tests/styles/styles.test.ts`, add this block just before the "backdrop blurs" block:

```ts
describe('schedule.css', () => {
  // Read when each test runs, so a missing file fails the tests below and not the whole file.
  const rule = (head: string) => declarations(find(rulesIn(css('schedule')), head)!.body)

  it('lays a row out as TimelineRowView: 12 px apart, 10 by 12 px in, with a 14 px radius', () => {
    expect(rule('.leg')).toEqual(expect.arrayContaining([['display', 'flex'], ['gap', '12px'], ['padding', '10px 12px'], ['border-radius', '14px']]))
  })

  it('tints the 36 px icon circle with the leg’s color at 20%', () => {
    expect(rule('.leg-icon')).toEqual(expect.arrayContaining([['width', '36px'], ['height', '36px'], ['color', 'var(--leg)']]))
    expect(rule('.leg-icon::before')).toEqual(expect.arrayContaining([['background', 'currentColor'], ['opacity', '0.2']]))
  })

  it('sizes the title, the times and the right-hand column as the app does', () => {
    expect(rule('.leg-title')).toEqual(expect.arrayContaining([['font-size', '15px'], ['font-weight', '600']]))
    expect(rule('.leg-times')).toEqual(expect.arrayContaining([['font-size', '12px'], ['color', 'var(--text-2)']]))
    expect(rule('.leg-clock')).toContainEqual(['min-width', '56px'])
    expect(rule('.leg-clock-label')).toContainEqual(['font-size', '9px'])
    expect(rule('.leg-clock-value')).toEqual(expect.arrayContaining([['font-size', '11px'], ['font-variant-numeric', 'tabular-nums']]))
  })

  it('edges the happening leg in its color at 50%, and a leg ending at home in green', () => {
    expect(rule('.leg-happening::after, .leg-home::after')).toEqual(expect.arrayContaining([['border', '2px solid var(--leg)'], ['opacity', '0.5']]))
    expect(rule('.leg-home::after, .leg-happening.homeward::after')).toEqual([['border-color', 'var(--green)']])
  })

  it('turns the next leg’s cyan and blue ring once every 4 s, and holds it still in cyan at 60% for reduced motion', () => {
    expect(rule('.leg-ring-turn')).toEqual(expect.arrayContaining([
      ['background', 'conic-gradient(var(--cyan), var(--blue), var(--cyan), var(--blue), var(--cyan))'],
      ['animation', 'leg-turn 4s linear infinite'],
    ]))
    const reduced = rulesIn(find(blocks(css('schedule')), '@media (prefers-reduced-motion: reduce)')!.body)
    expect(declarations(find(reduced, '.leg-ring')!.body)).toEqual([['opacity', '0.6']])
    expect(declarations(find(reduced, '.leg-ring-turn')!.body)).toEqual(expect.arrayContaining([['animation', 'none'], ['background', 'var(--cyan)']]))
    expect(declarations(find(reduced, '.leg-icon.pulsing .icon')!.body)).toEqual([['animation', 'none']])
  })

  it('masks the ring to its 2 px band, with the -webkit- names first for Safari 14', () => {
    const ring = rule('.leg-ring')
    const names = ring.map(([prop]) => prop)
    expect(names.indexOf('-webkit-mask')).toBeLessThan(names.indexOf('mask'))
    expect(ring).toEqual(expect.arrayContaining([['padding', '2px'], ['-webkit-mask-composite', 'xor'], ['mask-composite', 'exclude']]))
  })

  it('puts the red UP NEXT tag 6 px from the top and 8 px from the right', () => {
    expect(rule('.up-next')).toEqual(expect.arrayContaining([
      ['position', 'absolute'], ['top', '6px'], ['right', '8px'], ['background', 'var(--red)'], ['font-size', '11px'], ['font-weight', '700'],
    ]))
  })

  it('lines a gap up under the icons’ centers, its line at 40% of the label’s color', () => {
    expect(rule('.leg-gap')).toContainEqual(['padding', '0 12px 0 30px'])
    expect(rule('.leg-gap-line')).toEqual(expect.arrayContaining([['width', '1px'], ['height', '20px'], ['opacity', '0.4']]))
    expect([rule('.leg-gap-home'), rule('.leg-gap-turn'), rule('.leg-gap-layover'), rule('.leg-gap-gap')]).toEqual([
      [['--gap', 'var(--green)']], [['--gap', 'var(--orange)']], [['--gap', 'var(--blue)']], [['--gap', 'var(--text-2)']],
    ])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/TimelineRow.test.tsx tests/styles/styles.test.ts`
Expected: FAIL. The new test file can't load (`Failed to resolve import "../../src/ui/TimelineRow"`), and the eight `schedule.css` tests fail (`8 failed | 142 passed (150)`) with `ENOENT: no such file or directory, open '…/src/styles/schedule.css'`.

- [ ] **Step 3: Implement**

Create `src/ui/TimelineRow.tsx`:

```tsx
import { gapText, legClock, legTimes, type GapKind, type LegMoment } from '../copy/schedule'
import type { Leg } from '../engine/legs'
import { cssColor } from './colors'
import { Icon } from './Icon'
import type { RowLook } from './scheduleFacts'

export interface TimelineRowProps {
  leg: Leg
  look: RowLook
  moment: LegMoment
  now: number
  /** The visitor's zone, for the times. */
  timeZone: string
  h24: boolean
  /** The gap before this leg, or null (TimeGapView). */
  gap: { kind: GapKind; ms: number } | null
}

/**
 * One leg in the list (TimelineRowView, slice 3A §4.4–4.9): its icon in a circle of its color, its title, times and
 * right-hand column on glass, with the edge and tag of the leg happening now, the next leg, or a leg ending at home.
 * The gap before it comes first: a dashed line and a label, which screen readers skip since the times say it (§4.10).
 */
export function TimelineRow({ leg, look, moment, now, timeZone, h24, gap }: TimelineRowProps) {
  const clock = legClock(leg.start, leg.end, now, moment)
  const edge = moment === 'happening' ? ' leg-happening' : moment === 'next' ? ' leg-next' : look.homeward ? ' leg-home' : ''
  return (
    <li class="leg-item">
      {gap && (
        <div class={`leg-gap leg-gap-${gap.kind}`} aria-hidden="true">
          <span class="leg-gap-line" />
          {gapText(gap.kind, gap.ms)}
        </div>
      )}
      <div class={`leg glass${edge}${look.homeward ? ' homeward' : ''}`} style={{ '--leg': cssColor(look.color) }}>
        {moment === 'next' && (
          <span class="leg-ring" aria-hidden="true">
            <span class="leg-ring-turn" />
          </span>
        )}
        <span class={moment === 'happening' ? 'leg-icon pulsing' : 'leg-icon'}>
          <Icon name={look.icon} size={15} />
        </span>
        <span class="leg-text">
          <span class="leg-title">{look.title}</span>
          <span class="leg-times">{legTimes(leg.start, leg.end, timeZone, h24)}</span>
        </span>
        <span class="leg-clock">
          <span class="leg-clock-label" aria-hidden="true">{clock.label}</span>
          <span class="leg-clock-value" aria-hidden="true">{clock.value}</span>
          <span class="sr-only">{clock.spoken}</span>
        </span>
        {moment === 'next' && <span class="up-next">UP NEXT</span>}
        {look.homeward && <span class="sr-only">Arriving at home airport</span>}
      </div>
    </li>
  )
}
```

Create `src/styles/schedule.css`:

```css
/* The Schedule page (slice 3A §4). Sizes are the app's TimelineRowView and TimeGapView in points. */

/* A row: a gap line, if any, then the leg on glass. */
.leg-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.leg {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
}

/* The 36 px circle: the leg's color at 20% behind its 15 px icon. */
.leg-icon {
  position: relative;
  flex: none;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  color: var(--leg);
}

.leg-icon::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.2;
}

.leg-icon .icon {
  position: relative;
}

/* The leg happening now pulses its icon, as the app's .symbolEffect(.pulse). */
.leg-icon.pulsing .icon {
  animation: leg-pulse 1s ease-in-out infinite;
}

@keyframes leg-pulse {
  50% {
    opacity: 0.5;
  }
}

.leg-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.leg-title {
  font-size: 15px;
  line-height: 20px;
  font-weight: 600;
}

.leg-times {
  font-size: 12px;
  line-height: 16px;
  color: var(--text-2);
}

/* The right-hand column: the label at 9 px over the time at 11 px, with steady digits. */
.leg-clock {
  flex: none;
  min-width: 56px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  text-align: right;
}

.leg-clock-label {
  font-size: 9px;
  line-height: 11px;
  color: var(--text-2);
}

.leg-clock-value {
  font-size: 11px;
  line-height: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--text-2);
}

.leg-happening .leg-clock-value {
  font-weight: 600;
  color: var(--leg);
}

.leg-next .leg-clock-label,
.leg-next .leg-clock-value {
  color: var(--cyan);
}

.leg-next .leg-clock-value {
  font-weight: 600;
}

/* The edges: 2 px in the leg's color at 50% while it's happening, green at 50% when it ends at home. */
.leg-happening::after,
.leg-home::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 14px;
  border: 2px solid var(--leg);
  opacity: 0.5;
  pointer-events: none;
}

.leg-home::after,
.leg-happening.homeward::after {
  border-color: var(--green);
}

/* The next leg's ring (RotatingGradientBorder): a 2 px band, masked out of a cyan and blue conic gradient that turns
   once every 4 s; the mask's alpha fades its second half to 30%. The -webkit- names come first, for Safari 14. */
.leg-ring {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  padding: 2px;
  overflow: hidden;
  pointer-events: none;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
}

.leg-ring-turn {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1000px;
  height: 1000px;
  margin: -500px 0 0 -500px;
  background: conic-gradient(var(--cyan), var(--blue), var(--cyan), var(--blue), var(--cyan));
  -webkit-mask-image: conic-gradient(#000, #000, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3), #000);
  mask-image: conic-gradient(#000, #000, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3), #000);
  animation: leg-turn 4s linear infinite;
}

@keyframes leg-turn {
  to {
    transform: rotate(1turn);
  }
}

/* The red UP NEXT tag, over the row's top right corner. */
.up-next {
  position: absolute;
  top: 6px;
  right: 8px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--red);
  color: #ffffff;
  font-size: 11px;
  line-height: 13px;
  font-weight: 700;
}

/* A gap: its dashed line under the icons' centers (12 px in, then 18), and its label at 11 px. */
.leg-gap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px 0 30px;
  font-size: 11px;
  line-height: 13px;
  color: var(--gap);
}

.leg-gap-line {
  flex: none;
  width: 1px;
  height: 20px;
  margin-left: -0.5px;
  background: repeating-linear-gradient(to bottom, var(--gap) 0 4px, transparent 4px 8px);
  opacity: 0.4;
}

.leg-gap-home {
  --gap: var(--green);
}

.leg-gap-turn {
  --gap: var(--orange);
}

.leg-gap-layover {
  --gap: var(--blue);
}

.leg-gap-gap {
  --gap: var(--text-2);
}

@media (prefers-reduced-motion: reduce) {
  .leg-icon.pulsing .icon {
    animation: none;
  }

  .leg-ring {
    opacity: 0.6;
  }

  .leg-ring-turn {
    animation: none;
    background: var(--cyan);
    -webkit-mask-image: none;
    mask-image: none;
  }
}
```

The ring's colors come from the theme, so dark mode and Increase Contrast follow. Its fainter half is a mask of black at 30%, since Safari 14 has no `color-mix`.

In `src/main.tsx`, import the stylesheet after `inFlight.css`:

```tsx
import './styles/schedule.css'
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/TimelineRow.test.tsx tests/styles/styles.test.ts`
Expected: PASS, 155 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1964 tests in 86 files after this task.

```bash
git add tests/ui/TimelineRow.test.tsx tests/styles/styles.test.ts src/ui/TimelineRow.tsx src/styles/schedule.css src/main.tsx
git commit -m "TimelineRow: one leg in the list, with its gap line, edges, up-next ring and tag (slice 3A §4.4–4.10)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The page

**Files:**
- Create: `src/ui/SchedulePage.tsx`
- Modify: `src/styles/tokens.css`, `src/styles/schedule.css`
- Test: `tests/ui/SchedulePage.test.tsx`, `tests/styles/styles.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/ui/SchedulePage.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Leg } from '../../src/engine/legs'
import { DAY } from '../../src/time/zoned'
import { SchedulePage } from '../../src/ui/SchedulePage'
import { testAirports } from '../fixtures/airports'
import { drive, duty, flight, H, pilot, place } from '../fixtures/legs'
import { stubAnimationFrames } from '../fixtures/ui'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const NY = 'America/New_York'
/** Midnight in New York on Thursday 15 Oct 2026, in the fixtures' hours; THU is that calendar day. */
const T0 = Date.UTC(2026, 9, 15, 4) / H
const THU = Date.UTC(2026, 9, 15) / DAY
const at = (hours: number) => (T0 + hours) * H
const LEGS: Leg[] = [
  flight('SDF', 'RFD', T0 + 6.25, T0 + 7.75, 'T1', { number: '2961' }), // Thursday 6:15am
  place('layover', 'RFD', T0 + 7.75, T0 + 30.25),
  flight('RFD', 'SDF', T0 + 30.25, T0 + 32, 'T1', { number: '2962' }), // Friday 6:15am
  drive('SDF', 'LEX', true, T0 + 33, T0 + 34.5), // an hour after landing
  duty('training', 'CQ Training', 'SDF', T0 + 52, T0 + 56), // Saturday 4:00am
]

function page(legs: Leg[], now: number, onBack = () => {}) {
  return <SchedulePage legs={legs} pilot={pilot('LEX', 'SDF')} now={now} timeZone={NY} h24={false} airports={testAirports} onBack={onBack} />
}

/** Lays the page out for the browser-free tests: the bar's bottom at 60 px, each day and heading where `tops` say. */
function layOut(tops: { days?: Record<number, number>; headings?: Record<number, number> }) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const day = Number((this.closest('[data-day]') as HTMLElement | null)?.dataset.day)
    const top = this.classList.contains('schedule-bar') ? 0
      : this.classList.contains('day-heading') ? tops.headings?.[day] ?? 0
      : this.classList.contains('schedule-day') ? tops.days?.[day] ?? 0 : 0
    const bottom = this.classList.contains('schedule-bar') ? 60 : top
    return { top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) } as DOMRect
  })
}

const rowsOf = (container: Element) =>
  [...container.querySelectorAll('.schedule-day')].map((d) => [...d.querySelectorAll('.leg')].map((l) => l.className))

describe('SchedulePage (slice 3A §4)', () => {
  it('has a round back button and the Schedule heading, which takes focus as the page opens', () => {
    const onBack = vi.fn()
    render(page(LEGS, at(10), onBack))
    const back = screen.getByRole('button', { name: 'Back' })
    expect(back.className).toBe('glass round schedule-back')
    expect(back.querySelector('polyline')!.getAttribute('points')).toBe('6.5,1.5 1.5,7 6.5,12.5')
    const title = screen.getByRole('heading', { level: 1, name: 'Schedule' })
    expect(title.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(title)
    fireEvent.click(back)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('lists each day under its heading, with its legs as rows, a gap line between, and today’s heading in green', () => {
    const { container } = render(page(LEGS, at(10)))
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Today', 'Tomorrow', 'Saturday, Oct 17'])
    expect([...container.querySelectorAll('.schedule-day')].map((d) => (d as HTMLElement).dataset.day)).toEqual([THU, THU + 1, THU + 2].map(String))
    expect(rowsOf(container).map((rows) => rows.length)).toEqual([2, 2, 1])
    expect([...container.querySelectorAll('.leg-gap')].map((g) => g.textContent)).toEqual(['Gap 1h'])
    expect(container.querySelector('.day-pill')!.className).toBe('day-pill today')
    expect(container.querySelectorAll('ol.day-legs > li').length).toBe(5)
  })

  it('marks the leg happening now, the next leg, and the drive home', () => {
    expect(rowsOf(render(page(LEGS, at(10))).container)).toEqual([
      ['leg glass', 'leg glass leg-happening'],
      ['leg glass leg-next', 'leg glass leg-home homeward'],
      ['leg glass'],
    ])
  })

  it('updates in place as the clock runs, without scrolling again', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const { container, rerender } = render(page(LEGS, at(10)))
    rerender(page(LEGS, at(30.5)))
    expect(rowsOf(container)[1]).toEqual(['leg glass leg-happening', 'leg glass leg-next homeward'])
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Yesterday', 'Today', 'Tomorrow'])
    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  it('opens with the next leg’s day just under the bar', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    layOut({ days: { [THU]: 100, [THU + 1]: 700, [THU + 2]: 1400 } })
    render(page(LEGS, at(10)))
    expect(scrollTo).toHaveBeenCalledWith(0, 640)
  })

  it('opens at the top when the day it would open at has no legs', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    layOut({ days: { [THU]: 100 } })
    render(page(LEGS.slice(0, 1), at(36)))
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('turns the heading stuck under the bar yellow, the last one within 20 px of it, as the page scrolls; today’s stays green', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const frames = stubAnimationFrames()
    layOut({ headings: { [THU]: -300, [THU + 1]: 60, [THU + 2]: 900 } })
    const { container } = render(page(LEGS, at(10)))
    const pills = () => [...container.querySelectorAll('.day-pill')].map((p) => p.className)
    expect(pills()).toEqual(['day-pill today', 'day-pill stuck', 'day-pill'])
    layOut({ headings: { [THU]: -900, [THU + 1]: -100, [THU + 2]: 75 } })
    fireEvent.scroll(window)
    await frames.frame(16)
    expect(pills()).toEqual(['day-pill today', 'day-pill', 'day-pill stuck'])
    layOut({ headings: { [THU]: 60, [THU + 1]: 900, [THU + 2]: 1400 } })
    fireEvent.scroll(window)
    await frames.frame(32)
    expect(pills()).toEqual(['day-pill today', 'day-pill', 'day-pill'])
  })

  it('shows the app’s empty state when there are no legs at all', () => {
    const { container } = render(page([], at(10)))
    expect(screen.getByText('No schedule data')).toBeTruthy()
    expect(screen.getByText("Schedule will appear when your pilot's Duty app sends trip details.")).toBeTruthy()
    expect(container.querySelector('.schedule-day')).toBeNull()
  })
})
```

In `tests/styles/styles.test.ts`, add the bars' color at the end of `SPEC_COLORS`:

```ts
  // Slice 3A §4.1: the Schedule page's bars, as iOS's bar material looks over the page.
  ['--bar-fill', 'rgba(249,249,249,.94)', 'rgba(29,29,29,.94)'],
```

and add these tests at the start of the `schedule.css` block, just before "lays a row out as TimelineRowView":

```ts
  it('keeps the bar at the top and each day’s heading stuck just under it, both over iOS’s bar material', () => {
    expect(rule('.schedule-bar')).toEqual(expect.arrayContaining([['position', 'sticky'], ['top', '0'], ['height', '60px'], ['background', 'var(--bar-fill)']]))
    expect(rule('.day-heading')).toEqual(expect.arrayContaining([
      ['position', 'sticky'], ['top', '60px'], ['padding', '12px 0 2px'], ['background', 'var(--bar-fill)'],
      ['font-size', '12px'], ['font-weight', '600'], ['text-transform', 'uppercase'],
    ]))
    expect(rule('.schedule-back')).toEqual([['width', '44px'], ['height', '44px']])
    expect(rule('.schedule-title')).toEqual(expect.arrayContaining([['font-size', '17px'], ['font-weight', '600']]))
  })

  it('pills today’s heading in green and the stuck one in yellow, with black words', () => {
    expect(rule('.day-pill.today, .day-pill.stuck')).toEqual(expect.arrayContaining([['padding', '4px 8px'], ['border-radius', '6px'], ['color', '#000000']]))
    expect(rule('.day-pill.today')).toEqual([['background', 'var(--green)']])
    expect(rule('.day-pill.stuck')).toEqual([['background', 'var(--yellow)']])
  })
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/SchedulePage.test.tsx tests/styles/styles.test.ts`
Expected: FAIL. The new test file can't load (`Failed to resolve import "../../src/ui/SchedulePage"`), and four style tests fail (`4 failed | 150 passed (154)`): `--bar-fill` isn't defined, and the bar and heading rules aren't there.

- [ ] **Step 3: Implement**

Create `src/ui/SchedulePage.tsx`:

```tsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import { dayHeading } from '../copy/schedule'
import type { AirportIndex } from '../data/airports'
import type { Leg } from '../engine/legs'
import type { Pilot } from '../engine/types'
import { calendarDay } from '../time/zoned'
import { Chevron } from './Chevron'
import { Icon } from './Icon'
import { gapBefore, legMoment, nextLegId, openingDay, rowLook, scheduleDays } from './scheduleFacts'
import { TimelineRow } from './TimelineRow'

export interface SchedulePageProps {
  /** The legs to list, in start order (scheduleLegs). */
  legs: Leg[]
  pilot: Pilot
  now: number
  /** The visitor's zone: the days and times are theirs (slice 3A §4.3, §4.7). */
  timeZone: string
  h24: boolean
  airports: AirportIndex
  onBack: () => void
}

/** How far below the bar a heading counts as stuck there: the app's 20 points (EventTimelineView). */
const STUCK_SLACK = 20

const bottomOf = (el: HTMLElement | null) => el?.getBoundingClientRect().bottom ?? 0

/**
 * The Schedule page (EventTimelineView, slice 3A §4): a bar with the back button and the title, then every leg by day
 * under headings that stick, opening at the next leg's day. Today's heading is green, and the one stuck under the bar
 * yellow.
 */
export function SchedulePage({ legs, pilot, now, timeZone, h24, airports, onBack }: SchedulePageProps) {
  const days = useMemo(() => scheduleDays(legs, timeZone), [legs, timeZone])
  const bar = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState<number | null>(null)

  // The page appears already at its opening day, and focus goes to the title so screen readers announce the page
  // (§3.3, §4.11). Only once: later renders leave the scroll where the visitor has it.
  useLayoutEffect(() => {
    const day = openingDay(days, now, timeZone)
    const section = day == null ? null : list.current?.querySelector<HTMLElement>(`[data-day="${day}"]`)
    window.scrollTo(0, section ? window.scrollY + section.getBoundingClientRect().top - bottomOf(bar.current) : 0)
    title.current?.focus({ preventScroll: true })
  }, [])

  // The stuck heading is the last one within 20 px of the bar, checked once a frame while the page scrolls (§4.3).
  useEffect(() => {
    const check = () => {
      const limit = bottomOf(bar.current) + STUCK_SLACK
      let found: number | null = null
      for (const heading of list.current?.querySelectorAll<HTMLElement>('.day-heading') ?? []) {
        if (heading.getBoundingClientRect().top <= limit) found = Number(heading.parentElement!.dataset.day)
      }
      setStuck(found)
    }
    let frame = 0
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0
        check()
      })
    }
    check()
    window.addEventListener('scroll', soon, { passive: true })
    window.addEventListener('resize', soon)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', soon)
      window.removeEventListener('resize', soon)
    }
  }, [days])

  const today = calendarDay(now, timeZone)
  const nextId = nextLegId(legs, now)
  return (
    <main class="schedule">
      <header class="schedule-bar" ref={bar}>
        <button type="button" class="glass round schedule-back" aria-label="Back" onClick={onBack}>
          <Chevron direction="left" size={17} weight={2.2} />
        </button>
        <h1 class="schedule-title" ref={title} tabIndex={-1}>Schedule</h1>
      </header>
      <div class="schedule-days" ref={list}>
        {days.length === 0 ? (
          <div class="schedule-empty">
            <Icon name="CalendarBlank" size={40} />
            <p class="schedule-empty-title">No schedule data</p>
            <p class="schedule-empty-text">Schedule will appear when your pilot's Duty app sends trip details.</p>
          </div>
        ) : (
          days.map((d) => (
            <section key={d.day} class="schedule-day" data-day={d.day}>
              <h2 class="day-heading">
                <span class={d.day === today ? 'day-pill today' : d.day === stuck ? 'day-pill stuck' : 'day-pill'}>
                  {dayHeading(d.legs[0].start, now, timeZone)}
                </span>
              </h2>
              <ol class="day-legs">
                {d.legs.map((leg, i) => (
                  <TimelineRow key={leg.id} leg={leg} look={rowLook(leg, pilot, airports)} moment={legMoment(leg, now, nextId)} now={now}
                    timeZone={timeZone} h24={h24} gap={i > 0 ? gapBefore(d.legs[i - 1], leg) : null} />
                ))}
              </ol>
            </section>
          ))
        )}
      </div>
    </main>
  )
}
```

In `src/styles/tokens.css`, add the bars' color after `--glass-shadow` in the light `:root`:

```css
  /* The Schedule page's bars (slice 3A §4.1): iOS's bar material over the page. */
  --bar-fill: rgba(249, 249, 249, 0.94);
```

after `--glass-shadow` in the dark block:

```css
    --bar-fill: rgba(29, 29, 29, 0.94);
```

and after `--glass-shadow` in `.force-dark`, which must match the dark block:

```css
  --bar-fill: rgba(29, 29, 29, 0.94);
```

In `src/styles/schedule.css`, replace the first line, its comment, with the page's rules:

```css
/* The Schedule page (slice 3A §4). Sizes are the app's EventTimelineView, TimelineRowView and TimeGapView in points. */

/* The page: the site's column, without the status page's 24 px gaps. */
.schedule {
  max-width: 480px;
  margin: 0 auto;
  padding: 0 16px calc(12px + env(safe-area-inset-bottom));
}

/* The bar stays at the top: the back button, 44 px of round glass with a chevron as in iOS 26, and the title in the
   middle, over iOS's bar material: nearly white, or dark gray in dark mode, and a little see-through. */
.schedule-bar {
  position: sticky;
  top: 0;
  z-index: 2;
  height: 60px;
  margin: 0 -16px;
  padding: 0 16px;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  background: var(--bar-fill);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
}

.schedule-back {
  width: 44px;
  height: 44px;
}

.schedule-title {
  grid-column: 2;
  margin: 0;
  text-align: center;
  font-size: 17px;
  line-height: 22px;
  font-weight: 600;
}

/* The list, 12 px above and below; the page gives it its 16 px sides. */
.schedule-days {
  padding: 12px 0;
}

/* A day's heading sticks under the bar while its legs scroll past, and the next day's pushes it up. */
.day-heading {
  position: sticky;
  top: 60px;
  z-index: 1;
  margin: 0;
  padding: 12px 0 2px;
  background: var(--bar-fill);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  font-size: 12px;
  line-height: 16px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-2);
}

/* Today's heading is a green pill, and the stuck one a yellow pill, both with black words. */
.day-pill.today,
.day-pill.stuck {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  color: #000000;
}

.day-pill.today {
  background: var(--green);
}

.day-pill.stuck {
  background: var(--yellow);
}

.day-legs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* No legs at all: the app's empty state. */
.schedule-empty {
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  color: var(--text-2);
}

.schedule-empty p {
  margin: 0;
}

.schedule-empty-title {
  font-size: 15px;
  line-height: 20px;
}

.schedule-empty-text {
  font-size: 12px;
  line-height: 16px;
}
```

The heading's sticky `top` is the bar's 60 px height. The stuck heading is worked out once a frame while the page scrolls, as the app's 20-point rule: the last heading within 20 px of the bar.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/SchedulePage.test.tsx tests/styles/styles.test.ts`
Expected: PASS, 162 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1977 tests in 87 files after this task.

```bash
git add tests/ui/SchedulePage.test.tsx tests/styles/styles.test.ts src/ui/SchedulePage.tsx src/styles/tokens.css src/styles/schedule.css
git commit -m "SchedulePage: the bar, the days under headings that stick, where the list opens, and the empty state (slice 3A §4.1, §4.3, §4.11, §4.12)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The address and Back

**Files:**
- Create: `src/ui/hooks/useSchedulePage.ts`
- Test: `tests/ui/useSchedulePage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/ui/useSchedulePage.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useSchedulePage } from '../../src/ui/hooks/useSchedulePage'

/** The two pages, reduced to what the hook moves between: the status page's title and one link, the schedule's back button. */
function Pages() {
  const page = useSchedulePage()
  if (page.open) {
    return (
      <main>
        <h1 tabIndex={-1}>Schedule</h1>
        <button type="button" onClick={page.back}>Back</button>
      </main>
    )
  }
  return (
    <main>
      <h1 class="title" tabIndex={-1}>Where's Alex?</h1>
      <a href="#schedule" data-schedule-link="trip" onClick={(e) => {
        e.preventDefault()
        page.show('trip')
      }}>Schedule</a>
    </main>
  )
}

/** Lets the browser's history events arrive: happy-dom sends popstate a moment after history.back(). */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)))
const onSchedule = () => screen.queryByRole('heading', { level: 1, name: 'Schedule' }) != null

beforeEach(() => {
  history.replaceState(null, '', '/?demo=1&scene=home')
  window.scrollTo(0, 0)
})

afterEach(cleanup)

describe('useSchedulePage (slice 3A §3.3)', () => {
  it('starts on the status page, or on the schedule when the address says so', () => {
    render(<Pages />)
    expect(onSchedule()).toBe(false)
    cleanup()
    history.replaceState(null, '', '/?demo=1&scene=home#schedule')
    render(<Pages />)
    expect(onSchedule()).toBe(true)
  })

  it('opens the schedule at its own address, keeping the rest, in a history entry marked as its own', () => {
    render(<Pages />)
    const entries = history.length
    fireEvent.click(screen.getByRole('link', { name: 'Schedule' }))
    expect(onSchedule()).toBe(true)
    expect([location.pathname, location.search, location.hash]).toEqual(['/', '?demo=1&scene=home', '#schedule'])
    expect(history.state).toEqual({ crewluveSchedule: true })
    expect(history.length).toBe(entries + 1)
  })

  it('steps back through history from its back button, to the status page’s scroll and the link it left from', async () => {
    render(<Pages />)
    window.scrollTo(0, 420)
    fireEvent.click(screen.getByRole('link', { name: 'Schedule' }))
    window.scrollTo(0, 50)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await settle()
    expect(onSchedule()).toBe(false)
    expect([location.search, location.hash]).toEqual(['?demo=1&scene=home', ''])
    expect(window.scrollY).toBe(420)
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Schedule' }))
  })

  it('follows the phone’s Back and the browser’s', async () => {
    render(<Pages />)
    fireEvent.click(screen.getByRole('link', { name: 'Schedule' }))
    history.back()
    await settle()
    expect(onSchedule()).toBe(false)
  })

  it('stays on the site when the schedule was opened straight from its address: its back button goes to the status page', async () => {
    // Another page came before, as when a bookmark opens the schedule.
    history.pushState(null, '', '/another-page')
    history.pushState(null, '', '/?demo=1&scene=home#schedule')
    render(<Pages />)
    const entries = history.length
    window.scrollTo(0, 300)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await settle()
    expect(onSchedule()).toBe(false)
    expect([location.pathname, location.search, location.hash]).toEqual(['/', '?demo=1&scene=home', ''])
    expect(history.length).toBe(entries)
    expect(window.scrollY).toBe(0)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: "Where's Alex?" }))
  })

  it('follows the address when it changes to the schedule some other way', async () => {
    render(<Pages />)
    location.hash = '#schedule'
    await settle()
    expect(onSchedule()).toBe(true)
  })

  it('lets the pages set their own scroll, instead of the browser restoring it', () => {
    history.scrollRestoration = 'auto'
    render(<Pages />)
    expect(history.scrollRestoration).toBe('manual')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/useSchedulePage.test.tsx`
Expected: FAIL with `Error: Failed to resolve import "../../src/ui/hooks/useSchedulePage" from "tests/ui/useSchedulePage.test.tsx". Does the file exist?`

- [ ] **Step 3: Implement**

Create `src/ui/hooks/useSchedulePage.ts`:

```ts
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { SCHEDULE_HASH, type ScheduleLinkName } from '../ScheduleLink'

/** Marks the history entry the site added for the schedule, so the page's back button knows it can step back. */
const OPENED_HERE = 'crewluveSchedule'

const atSchedule = () => window.location.hash === SCHEDULE_HASH

/**
 * Which page shows, by the address (slice 3A §3.3): the Schedule page at #schedule, else the status page.
 * - Opening adds a history entry, so the phone's Back and the browser's return to the status page.
 * - The page's own back button does the same. When the schedule was opened straight from its address, there's no
 *   entry of the site's to go back to, so it goes to the status page instead of leaving the site.
 * - The status page comes back where it was scrolled, with focus on the link that opened the schedule, or on the
 *   page's title when that link has gone.
 */
export function useSchedulePage() {
  const [open, setOpen] = useState(atSchedule)
  const from = useRef<ScheduleLinkName | null>(null)
  const statusScroll = useRef(0)
  const wasOpen = useRef(open)

  useEffect(() => {
    // Each page sets its own scroll: the schedule its opening day, the status page where it was.
    history.scrollRestoration = 'manual'
    const follow = () => setOpen(atSchedule())
    window.addEventListener('popstate', follow)
    window.addEventListener('hashchange', follow)
    return () => {
      window.removeEventListener('popstate', follow)
      window.removeEventListener('hashchange', follow)
    }
  }, [])

  // Runs once the status page is back on screen, before it's painted.
  useLayoutEffect(() => {
    if (wasOpen.current && !open) {
      window.scrollTo(0, statusScroll.current)
      const link = from.current && document.querySelector<HTMLElement>(`[data-schedule-link="${from.current}"]`)
      ;(link ?? document.querySelector<HTMLElement>('h1.title'))?.focus({ preventScroll: true })
    }
    wasOpen.current = open
  }, [open])

  return {
    open,
    /** Opens the schedule from the link named, which takes focus back afterwards. */
    show: (name: ScheduleLinkName) => {
      from.current = name
      statusScroll.current = window.scrollY
      history.pushState({ [OPENED_HERE]: true }, '', SCHEDULE_HASH)
      setOpen(true)
    },
    /** The schedule's own back button. */
    back: () => {
      if (history.state?.[OPENED_HERE] === true) {
        history.back()
        return
      }
      history.replaceState(null, '', window.location.pathname + window.location.search)
      setOpen(false)
    },
  }
}
```

Opening uses `history.pushState`, so it doesn't fire `hashchange` and the browser doesn't try to scroll to an element named "schedule". `history.state` survives a reload, so after a reload the back button still steps back through history.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/useSchedulePage.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1985 tests in 88 files after this task.

```bash
git add tests/ui/useSchedulePage.test.tsx src/ui/hooks/useSchedulePage.ts
git commit -m "useSchedulePage: the schedule's own address, Back through history, and the status page's scroll and focus on return (slice 3A §3.3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: PilotPages

**Files:**
- Rename: `tests/ui/ScheduleScreen.test.tsx` → `tests/ui/PilotPages.test.tsx`, `src/ui/ScheduleScreen.tsx` → `src/ui/PilotPages.tsx`
- Modify: `src/ui/Root.tsx`
- Test: `tests/ui/useWeather.test.tsx`

- [ ] **Step 1: Write the failing tests**

Rename the loader's tests:

```bash
git mv tests/ui/ScheduleScreen.test.tsx tests/ui/PilotPages.test.tsx
```

In `tests/ui/PilotPages.test.tsx`, replace every `ScheduleScreen` with `PilotPages` (18 places). Then import the leg builders after the weather import:

```tsx
import { buildLegs } from '../../src/engine/legs'
import { buildSchedule } from '../../src/engine/normalize'
```

import the list's legs after `PilotPages`:

```tsx
import { scheduleLegs } from '../../src/ui/scheduleFacts'
```

and add this block at the end of the file:

```tsx
describe('PilotPages: the status page and the Schedule page (slice 3A §3.3)', () => {
  /** Lets the browser's history events arrive: happy-dom sends popstate a moment after history.back(). */
  const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)))
  beforeEach(() => history.replaceState(null, '', '/'))
  afterEach(() => history.replaceState(null, '', '/'))

  it('opens the schedule from a card, and its back button brings the status page back', async () => {
    render(<PilotPages schedule={handle(demoRawForScene('home', NOW))} airports={testAirports} demo onSignOut={() => {}} />)
    fireEvent.click(screen.getAllByRole('link', { name: 'Schedule' })[0])
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Schedule')
    expect(location.hash).toBe('#schedule')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await settle()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Where's Alex?")
    expect(location.hash).toBe('')
  })

  it('opens straight at the schedule from its address, listing every leg but the report time', () => {
    history.replaceState(null, '', '/#schedule')
    const raw = demoRawForScene('home', NOW)
    const { container } = render(<PilotPages schedule={handle(raw)} airports={testAirports} demo onSignOut={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Schedule')
    const all = buildLegs(buildSchedule(raw, NOW))
    expect(all.some((l) => l.kind === 'report')).toBe(true)
    expect(container.querySelectorAll('.leg').length).toBe(scheduleLegs(all).length)
  })

  it('shows the screens it always has at the schedule’s address while there’s nothing to list', () => {
    history.replaceState(null, '', '/#schedule')
    render(<PilotPages schedule={handle(null)} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CrewLuve')
    cleanup()
    render(<PilotPages schedule={handle(new RawBuilder(NOW).build())} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(screen.getByText('No schedule in CrewLu Cloud yet')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/PilotPages.test.tsx`
Expected: FAIL with `Error: Failed to resolve import "../../src/ui/PilotPages" from "tests/ui/PilotPages.test.tsx". Does the file exist?`

- [ ] **Step 3: Implement**

Rename the loader:

```bash
git mv src/ui/ScheduleScreen.tsx src/ui/PilotPages.tsx
```

In `src/ui/PilotPages.tsx`, replace every `ScheduleScreen` with `PilotPages` (3 places). Then import the hook after `useNow`:

```tsx
import { useSchedulePage } from './hooks/useSchedulePage'
```

import the page and the list's legs:

```tsx
import { scheduleLegs } from './scheduleFacts'
import { SchedulePage } from './SchedulePage'
```

say what it now does:

Replace this:

```tsx
/** Rebuilds the schedule when new rows arrive, and the snapshot every second. */
```

with this:

```tsx
/**
 * Rebuilds the schedule when new rows arrive, and the snapshot every second. Shows the status page, or the Schedule
 * page when the address ends in #schedule (slice 3A §3.3); while there's nothing to show, the same screen as ever.
 */
```

keep the page and the legs, after the weather:

```tsx
  // The page the address asks for, and the legs the Schedule page lists.
  const page = useSchedulePage()
  const listed = useMemo(() => (ready ? scheduleLegs(ready.legs) : []), [ready])
```

and show the page the address asks for:

Replace this:

```tsx
  return (
    <StatusScreen snap={snap} now={now} viewerTz={viewerTz} homeTz={homeTz} h24={h24} airports={airports} weather={weather} demo={demo}
      celebrateKey={celebrateKey} footer={footer} />
  )
```

with this:

```tsx
  if (page.open) {
    return <SchedulePage legs={listed} pilot={snap.pilot} now={now} timeZone={viewerTz} h24={h24} airports={airports} onBack={page.back} />
  }

  return (
    <StatusScreen snap={snap} now={now} viewerTz={viewerTz} homeTz={homeTz} h24={h24} airports={airports} weather={weather} demo={demo}
      celebrateKey={celebrateKey} footer={footer} onOpenSchedule={page.show} />
  )
```

In `src/ui/Root.tsx`, replace every `ScheduleScreen` with `PilotPages` (4 places). In `tests/ui/useWeather.test.tsx`, update the comment that names the loader:

Replace this:

```tsx
/** Like ScheduleScreen, which builds an equal but new place on every render. */
```

with this:

```tsx
/** Like PilotPages, which builds an equal but new place on every render. */
```

Older specs and plans in `docs/` still say `ScheduleScreen`. They record the history, so leave them.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/PilotPages.test.tsx`
Expected: PASS, 15 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1988 tests in 88 files after this task.

```bash
git add tests/ui/PilotPages.test.tsx src/ui/PilotPages.tsx src/ui/Root.tsx tests/ui/useWeather.test.tsx
git commit -m "ScheduleScreen becomes PilotPages, showing the status page or, at #schedule, the Schedule page (slice 3A §3.3, §5.2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Look check with the user (controller)

**Files:**
- Modify (only if nudges are needed): `src/styles/schedule.css`, `src/styles/cards.css`

- [ ] **Step 1: Build and open the preview**

Run `npm run build`, then start or reuse the `crewluve-preview` server from `.claude/launch.json` (port 5181) in the browser pane. Set the viewport to 375 × 600 for screenshots, so they come back sharp.

- [ ] **Step 2: Take the screenshots, in light and in dark**

The browser pane can hand back the previous frame right after a page changes, so take a small throwaway screenshot first, then the real one.

- `/?demo=1&scene=home`: the Leaves Home In and trip cards with their chevrons.
- `/?demo=1&scene=nothing-ahead`: View Schedule.
- `/?demo=1&scene=flying#schedule`: today's heading in green; the leg happening now with its edge and "Ends in"; the next leg with its ring and UP NEXT; a gap line.
- The same page scrolled until tomorrow's heading is stuck under the bar, in yellow.
- `/?demo=1&scene=layover#schedule` at 320 px: long titles wrapping.

Then tap a card, check that the schedule opens at the next leg's day, and go back with the page's button and with the browser's Back. Each time the status page should return where it was.

- [ ] **Step 3: Ask the user to sign off**

Put the screenshots side by side, and ask one question: "Looks right (Recommended)" or "Change something". Point out the UP NEXT tag over "Starts in", which the app's layout does too, so they can compare it with their phone. Apply their notes, then show them again.

- [ ] **Step 4: Run the gates and commit any nudges**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/styles/schedule.css src/styles/cards.css
git commit -m "Schedule page: visual nudges from the look check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Merge and release (controller, asks first)

- [ ] **Step 1: Merge**

Use superpowers:finishing-a-development-branch. Ask the user one question about how to merge `slice3a` into `main`.

- [ ] **Step 2: Release, only with a fresh yes**

Ask before pushing `main`; the push redeploys crewluve.crewlu.net. After the "Deploy to GitHub Pages" run succeeds, check the live site:
- the live page's files match the local build;
- https://crewluve.crewlu.net/?demo=1&scene=flying#schedule opens the schedule at today, and its back button returns to the status page;
- `read_console_messages` with `onlyErrors: true` shows nothing, and the demo makes no requests beyond the page's own files.

- [ ] **Step 3: Update the memory**

Update the project memory with the new tip and what's next: Slice 3B, the month calendar.

---

## Done when

- `npx vitest run`, `npx tsc --noEmit` and `npm run build` are all green, with 1988 tests in 88 files.
- The Schedule page lists every leg by day as the app does, with the three fixes; the cards that open it carry a chevron, View Schedule shows when none does, and the page has its own address with Back (Tasks 1–11).
- The user has signed off on the look (Task 12), and it's live on crewluve.crewlu.net, released with the user's yes (Task 13).

## Spec coverage

| Spec section | Tasks |
|---|---|
| §3.1 The cards that open the schedule | 6 (the links, the chevron, the press), 7 (the status page's four cards) |
| §3.2 The View Schedule button | 7 (the button, its rule, the `nothing-ahead` scene) |
| §3.3 The address and Back | 10 (address, history, scroll, focus), 11 (which page shows; the loading, error and empty screens) |
| §4.1 Layout | 9 (the bar, `--bar-fill`, no footer, no demo banner) |
| §4.2 Which legs | 4 (`scheduleLegs`), 11 (the list from the loaded legs) |
| §4.3 Days | 3 (headings), 5 (grouping), 9 (sticky headings, pills, the stuck heading) |
| §4.4 Rows | 8 |
| §4.5 Titles | 2 (the airline as entered), 4 |
| §4.6 Icons and colors | 1 (two icons), 4 |
| §4.7 Times | 3 |
| §4.8 The right-hand column | 3 (`legClock`), 8 |
| §4.9 Happening now, up next, ending at home | 5 (`legMoment`, `nextLegId`), 8 (edges, ring, tag, pulse, reduced motion) |
| §4.10 Gaps | 3 (labels), 5 (`gapBefore`), 8 (the line) |
| §4.11 Where it opens | 5 (`openingDay`), 9 (the scroll) |
| §4.12 No legs | 9 |
| §4.13 Data and timing | 11 (one clock, one copy of the data) |
| §5 How it's built | 1–11 |
| §6 Security and privacy | no new requests; `--leg` through the CSSOM (8) |
| §7 Deliberate differences | 2, 3, 4, 7, 9, 10 |
| §8 Testing | every task, then 12 |

## Execution notes

(Add notes here as the build goes: where the code had to differ from a printed block, and why.)
