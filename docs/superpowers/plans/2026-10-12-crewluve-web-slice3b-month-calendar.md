# Crewluve Web Slice 3B: the Month Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The month calendar at the top of the Schedule page, as the Crewluve app draws it, pinned under the bar while only the list scrolls, in its own box. Tapping a day or a row, or Current Event, scrolls the list.

**Architecture:** Pure modules first:
- `src/time/zoned.ts` gains a calendar day's date and back, and the instant a day begins in a zone.
- `src/copy/calendar.ts` holds the words: the month's title, the weekday letters and names, and a day's spoken name.
- `src/ui/calendarFacts.ts` holds the calendar as data: months, the visitor's first weekday, a month's grid, each week row's bars (the app's `CalendarDataBuilder`, line for line), the time line, and the day a tap scrolls to.
- The demo's third trip rests at base.

Then the parts:
- `TripCalendar` draws the calendar, and moves among its days from the keyboard.
- `TimelineRow` takes a tap.
- `SchedulePage` becomes the window's height with the list in its own box. Then it holds the calendar, the selected day and the month, and the taps. On a short window it moves the calendar into the list.

**Tech Stack:** Vite 5.4, TypeScript 5.9 (strict), Preact 10, Vitest 3 with happy-dom and @testing-library/preact.

**Spec:** `docs/superpowers/specs/2026-10-12-crewluve-web-slice3b-month-calendar-design.md`

---

## Execution notes

**Setup and gates**
- **Branch:** work on `slice3b` in the main project folder. Run `git switch -c slice3b` from `main`. Don't use git worktrees; auto mode blocked a worktree builder during slice 1.
- **Working directory:** run every command from the project root, `~/Dev/Crewluve Website`. Quote it in shells, since it has a space.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass before every commit that touches code.
  - The suite is 2013 tests in 88 files before this plan, and 2100 tests in 91 files after it.
  - The read-only scan (`tests/data/readOnly.test.ts`) adds one test for each new file in `src/`, so the totals grow a little faster than the task counts below.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Nothing to install:** no task adds a package or regenerates a file.

**How the printed code was checked**
- **Built and replayed:** every code block below was built and run in a scratch copy of the project before this plan was written, and all three gates passed there. A script then applied this plan's changes, step by step, to a fresh copy of `main`. Each Step 2 failed, each Step 4 passed with its count, and every file came out identical to the scratch copy's.
- **Deliberate breaks:** 58 of 58 were caught by the new tests.
  - Planning them showed two gaps, now covered. A month whose last day spills into a sixth row: May 2026. And a trip's leg in a later week row, after a stop at home, whose start comes from the trip's earlier legs.
- **In the browser:** the scratch copy's production build ran in the browser pane, at 375 and 320 px wide in light, and on a phone turned on its side, 812 × 375, in dark.
  - The calendar showed October 2026 as mocked up: today selected, with the time line; the MIA and ANC trips; reserve and training; and the third trip, with its light SDF rest at base.
  - A tap on a day took its heading to the top of the list, and a day without legs went to the day before it that has some. Current Event went back to today.
  - On the turned phone, the calendar sat at the top of the list, and the day at the top stayed there.
  - The arrow keys moved among the days and turned the month, with one Tab stop. There were no console errors.
  - Two changes came from this check, before the plan was printed:
    - The list's box has no padding at the top. A sticky heading stops short of its scroll box's padding, and rows showed in the gap above it (spec decision 8).
    - The month arrows' tap areas stay within the column's sides, and the box clips sideways. On the turned phone they had made the list scroll sideways.
- **The browser pane:** while it's hidden, smooth scrolling doesn't play, and a tap's scroll seems to go nowhere. To check where a tap scrolls, have the page's motion check say "reduce" first, so the list jumps:
  - `const realMatch = window.matchMedia.bind(window)`
  - `window.matchMedia = (q) => (q.includes('reduce') ? { matches: true, media: q } : realMatch(q))`
- **Preact renders a moment later:** a script that presses arrow keys waits a little between them. In the tests, `fireEvent` waits for the render.

**Network and other repos**
- **No new requests.** Nothing in this plan adds requests, storage or scripts. Tests never use the network; `tests/setup/noNetwork.ts` blocks it.
- **Security:** the bars', codes' and time line's places (`left`, `width`) are set through the CSSOM, as Preact's `style={{…}}` already does, which the CSP allows.
- **Read-only site:** nothing in this plan talks to CrewLu Cloud.
- **The Crewluve app (`~/Dev/Crewluv`) is reference only.** Read it; never change it.

**Reviews and changes**
- **Two batches:** Tasks 1–6, the data and the words; then Tasks 7–12, the calendar and the page. After each batch, a spec review and a code-quality review, each with its own frozen copy of the branch. The second code-quality review also covers the whole branch.
- **Tasks 13–14 are for the controller, working with the user:** the look check, then merge and release.
- **If the code has to differ from a printed block, write it down.** Note it under "Execution notes" at the end of this file, and update the spec's §10 decisions log if a decision changed.

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/time/zoned.ts` | modify | A calendar day's date and back (`dayParts`, `dayOf`), and the instant a day begins in a zone (`dayStart`) |
| `src/copy/calendar.ts` | create | The month's title, the weekday columns, and a day's spoken name |
| `src/ui/calendarFacts.ts` | create | Months, the first weekday, a month's grid, each week row's bars, the time line, the day a tap scrolls to |
| `src/data/demo.ts` | modify | The third trip's rest at base, and the `nothing-ahead` scene after it |
| `src/styles/tokens.css` | modify | The calendar's six colors, and the codes' darker blue under Increase Contrast |
| `src/styles/calendar.css`, `src/main.tsx` | create, modify | The calendar's styles, imported |
| `src/ui/TripCalendar.tsx` | create | The calendar drawn, and its days from the keyboard |
| `src/ui/TimelineRow.tsx` | modify | A tap on the leg |
| `src/ui/SchedulePage.tsx`, `src/styles/schedule.css` | modify | The window's height, with the list in its own box; the calendar, its day and month, the taps, and the short window |
| Tests | create and modify | Three new test files, and additions to six more |

---

### Task 1: The time helpers

**Files:**
- Modify: `src/time/zoned.ts`
- Test: `tests/time/zoned.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/time/zoned.test.ts`, import the three new helpers and `HOUR`:

Replace this:

```ts
import { calendarDay, isKnownZone, prefers24Hour, viewerTimeZone, zoneAbbr, zonedParts, zoneOffsetMinutes } from '../../src/time/zoned'
```

with this:

```ts
import { calendarDay, dayOf, dayParts, dayStart, HOUR, isKnownZone, prefers24Hour, viewerTimeZone, zoneAbbr, zonedParts, zoneOffsetMinutes } from '../../src/time/zoned'
```

and add these tests at the end of the file:

```ts
describe('dayParts and dayOf (slice 3B §6.2)', () => {
  it('turn a calendar day number into its date, and a date into its number', () => {
    const day = calendarDay(T, 'America/New_York')
    expect(dayParts(day)).toEqual({ year: 2026, month: 10, day: 8, weekday: 4 })
    expect(dayOf(2026, 10, 8)).toBe(day)
    expect(dayParts(dayOf(2028, 2, 29))).toEqual({ year: 2028, month: 2, day: 29, weekday: 2 })
  })

  it('roll a month or a day past its end over, as Date.UTC does', () => {
    expect(dayOf(2026, 13, 1)).toBe(dayOf(2027, 1, 1))
    expect(dayOf(2026, 0, 1)).toBe(dayOf(2025, 12, 1))
    expect(dayOf(2026, 3, 0)).toBe(dayOf(2026, 2, 28))
  })
})

describe('dayStart (slice 3B §4.5)', () => {
  const NY = 'America/New_York'

  it('is the instant a calendar day begins in the zone', () => {
    expect(dayStart(calendarDay(T, NY), NY)).toBe(Date.UTC(2026, 9, 8, 4))
    expect(dayStart(dayOf(2026, 10, 9), 'Asia/Kolkata')).toBe(Date.UTC(2026, 9, 8, 18, 30))
    expect(dayStart(dayOf(2026, 10, 9), 'UTC')).toBe(Date.UTC(2026, 9, 9))
  })

  it('makes the days the clocks change 23 and 25 hours long', () => {
    const spring = dayOf(2026, 3, 8)
    const fall = dayOf(2026, 11, 1)
    expect(dayStart(spring + 1, NY) - dayStart(spring, NY)).toBe(23 * HOUR)
    expect(dayStart(fall + 1, NY) - dayStart(fall, NY)).toBe(25 * HOUR)
  })

  it('starts a day at its first minute where the clocks skip midnight', () => {
    // Chile's clocks go from midnight to 1:00 on Sunday 6 September 2026, so that day begins at 1:00, 4:00 UTC.
    expect(dayStart(dayOf(2026, 9, 6), 'America/Santiago')).toBe(Date.UTC(2026, 8, 6, 4))
  })

  it('reaches the zones furthest from UTC, 14 hours ahead and 12 behind', () => {
    expect(dayStart(dayOf(2026, 10, 9), 'Pacific/Kiritimati')).toBe(Date.UTC(2026, 9, 8, 10))
    expect(dayStart(dayOf(2026, 10, 9), 'Etc/GMT+12')).toBe(Date.UTC(2026, 9, 9, 12))
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/time/zoned.test.ts`
Expected: FAIL in 6 tests (`6 failed | 13 passed (19)`) with `TypeError: dayParts is not a function`, `TypeError: dayOf is not a function` and `TypeError: dayStart is not a function`.

- [ ] **Step 3: Implement**

In `src/time/zoned.ts`, add the three helpers after `calendarDay`:

```ts
/** A calendar day number, as calendarDay gives it, as its date: `month` is 1–12 and `weekday` 0 = Sunday. */
export function dayParts(day: number): { year: number; month: number; day: number; weekday: number } {
  const date = new Date(day * DAY)
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), weekday: date.getUTCDay() }
}

/** A date's calendar day number, the reverse of dayParts. A month or a day past its end rolls over, as in Date.UTC. */
export function dayOf(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day) / DAY
}

/**
 * The instant a calendar day begins in a zone: its midnight, or its first minute where the clocks skip midnight. The
 * month calendar's week rows run from one to another, so a week with a clock change is 167 or 169 hours long (slice
 * 3B §4.5).
 */
export function dayStart(day: number, timeZone: string): number {
  // Zones run from 12 hours behind UTC to 14 ahead, so the day begins between 15 hours before the same date's
  // midnight in UTC and 13 hours after it. Halve that span down to the minute.
  let before = day * DAY - 15 * HOUR
  let from = day * DAY + 13 * HOUR
  while (from - before > MINUTE) {
    const mid = before + Math.floor((from - before) / 2 / MINUTE) * MINUTE
    if (calendarDay(mid, timeZone) >= day) from = mid
    else before = mid
  }
  return from
}
```

`dayStart` halves a 28-hour span down to the minute, about 11 lookups. It finds the first minute of the day even where a zone skips midnight, as Chile's clocks do on 6 September 2026.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/time/zoned.test.ts`
Expected: PASS, 19 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2019 tests in 88 files after this task.

```bash
git add tests/time/zoned.test.ts src/time/zoned.ts
git commit -m "zoned: a calendar day's date and back, and the instant a day begins in a zone (slice 3B §4.5, §6.2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The calendar's words

**Files:**
- Create: `src/copy/calendar.ts`
- Test: `tests/copy/calendar.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/copy/calendar.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { dayName, monthTitle, weekdayColumns } from '../../src/copy/calendar'
import { dayOf } from '../../src/time/zoned'

describe('monthTitle (slice 3B §4.2)', () => {
  it('names the month and its year, as the app’s "MMMM yyyy"', () => {
    expect(monthTitle(2026, 10)).toBe('October 2026')
    expect(monthTitle(2027, 1)).toBe('January 2027')
    expect(monthTitle(2026, 12)).toBe('December 2026')
  })
})

describe('weekdayColumns (slice 3B §4.3, §5.7)', () => {
  it('runs from Sunday in the US, a letter each as the app’s, with full names for screen readers', () => {
    const columns = weekdayColumns(0)
    expect(columns.map((c) => c.letter).join(' ')).toBe('S M T W T F S')
    expect(columns.map((c) => c.name)).toEqual(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
  })

  it('starts on whichever day the visitor’s week starts', () => {
    expect(weekdayColumns(1).map((c) => c.letter).join(' ')).toBe('M T W T F S S')
    expect(weekdayColumns(1)[6].name).toBe('Sunday')
    expect(weekdayColumns(6).map((c) => c.name).slice(0, 2)).toEqual(['Saturday', 'Sunday'])
  })
})

describe('dayName (slice 3B §5.7)', () => {
  it('says the weekday and the date in full', () => {
    expect(dayName(dayOf(2026, 10, 15))).toBe('Thursday, October 15')
    expect(dayName(dayOf(2027, 1, 1))).toBe('Friday, January 1')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/copy/calendar.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/copy/calendar' imported from 'tests/copy/calendar.test.ts'`.

- [ ] **Step 3: Implement**

Create `src/copy/calendar.ts`:

```ts
import { dayParts, MONTHS, WEEKDAYS } from '../time/zoned'

/** The month header's title, TripCalendarView's "MMMM yyyy": "October 2026". `month` is 1–12 (slice 3B §4.2). */
export function monthTitle(year: number, month: number): string {
  return `${MONTHS[month - 1]} ${year}`
}

/** A weekday column: the app's very short symbol, "S", and the full name screen readers hear, "Sunday". */
export interface WeekdayColumn {
  letter: string
  name: string
}

/** The seven weekday columns, from the week's first day, 0 = Sunday (slice 3B §4.3, §5.7). */
export function weekdayColumns(firstDay: number): WeekdayColumn[] {
  return Array.from({ length: 7 }, (_, i) => {
    const name = WEEKDAYS[(firstDay + i) % 7]
    return { letter: name[0], name }
  })
}

/** A calendar day as screen readers hear it: "Thursday, October 15" (slice 3B §5.7). */
export function dayName(day: number): string {
  const { month, day: date, weekday } = dayParts(day)
  return `${WEEKDAYS[weekday]}, ${MONTHS[month - 1]} ${date}`
}
```

The letters are the app's `veryShortWeekdaySymbols` in English, as all the site's words are.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/copy/calendar.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2024 tests in 89 files after this task.

```bash
git add tests/copy/calendar.test.ts src/copy/calendar.ts
git commit -m "copy/calendar: the month's title, the weekday columns, and a day's name for screen readers (slice 3B §4.2, §4.3, §5.7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Months and the month's grid

**Files:**
- Create: `src/ui/calendarFacts.ts`
- Test: `tests/ui/calendarFacts.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/ui/calendarFacts.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dayOf, dayParts } from '../../src/time/zoned'
import { addMonths, firstWeekday, inMonth, monthGrid, monthOf } from '../../src/ui/calendarFacts'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A grid's rows as their days of the month, with the days of the months either side in brackets. */
const dates = (rows: ReturnType<typeof monthGrid>) => rows.map((row) => row.map((d) => (d.inMonth ? `${d.date}` : `(${d.date})`)).join(' '))

describe('months (slice 3B §5.5)', () => {
  it('finds a day’s month, and steps months forward and back across years', () => {
    expect(monthOf(dayOf(2026, 10, 15))).toEqual({ year: 2026, month: 10 })
    expect(addMonths({ year: 2026, month: 10 }, 1)).toEqual({ year: 2026, month: 11 })
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
    expect(addMonths({ year: 2026, month: 10 }, -13)).toEqual({ year: 2025, month: 9 })
  })

  it('tells whether a day is in a month', () => {
    expect(inMonth(dayOf(2026, 10, 31), { year: 2026, month: 10 })).toBe(true)
    expect(inMonth(dayOf(2026, 11, 1), { year: 2026, month: 10 })).toBe(false)
    expect(inMonth(dayOf(2025, 10, 15), { year: 2026, month: 10 })).toBe(false)
  })
})

describe('firstWeekday (slice 3B §5.8)', () => {
  it('starts the week on the region’s first day: Sunday in the US, Monday in Germany and France, Saturday in Egypt', () => {
    expect(firstWeekday('en-US')).toBe(0)
    expect(firstWeekday('en')).toBe(0)
    expect(firstWeekday('de-DE')).toBe(1)
    expect(firstWeekday('fr')).toBe(1)
    expect(firstWeekday('ar-EG')).toBe(6)
  })

  it('starts on Sunday when the language can’t be read, or the browser has no week information', () => {
    expect(firstWeekday('')).toBe(0)
    vi.stubGlobal('Intl', { Locale: class { maximize() { return this } } })
    expect(firstWeekday('de-DE')).toBe(0)
  })
})

describe('monthGrid (slice 3B §4.4)', () => {
  it('fills October 2026’s first and last weeks with the days either side, in five rows from Sunday', () => {
    expect(dates(monthGrid({ year: 2026, month: 10 }, 0))).toEqual([
      '(27) (28) (29) (30) 1 2 3',
      '4 5 6 7 8 9 10',
      '11 12 13 14 15 16 17',
      '18 19 20 21 22 23 24',
      '25 26 27 28 29 30 31',
    ])
  })

  it('needs four rows for February 2026, which starts on a Sunday, but five for a week from Monday', () => {
    expect(monthGrid({ year: 2026, month: 2 }, 0)).toHaveLength(4)
    expect(monthGrid({ year: 2026, month: 2 }, 1)).toHaveLength(5)
    expect(dates(monthGrid({ year: 2026, month: 2 }, 1))[0]).toBe('(26) (27) (28) (29) (30) (31) 1')
  })

  it('needs six rows for August 2026, which starts on a Saturday, and for May 2026, whose last day spills into a sixth', () => {
    const rows = monthGrid({ year: 2026, month: 8 }, 0)
    expect(rows).toHaveLength(6)
    expect(dates(rows)[5]).toBe('30 31 (1) (2) (3) (4) (5)')
    expect(dates(monthGrid({ year: 2026, month: 5 }, 0))[5]).toBe('31 (1) (2) (3) (4) (5) (6)')
  })

  it('gives each day its calendar day number, one after another from the week’s first day', () => {
    const days = monthGrid({ year: 2026, month: 10 }, 0).flat()
    expect(days[0].day).toBe(dayOf(2026, 9, 27))
    expect(dayParts(days[0].day).weekday).toBe(0)
    expect(days.every((d, i) => d.day === days[0].day + i)).toBe(true)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/calendarFacts.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/ui/calendarFacts' imported from 'tests/ui/calendarFacts.test.ts'`.

- [ ] **Step 3: Implement**

Create `src/ui/calendarFacts.ts`:

```ts
import { dayOf, dayParts } from '../time/zoned'

/** A month the calendar shows: its year, and its month, 1–12. */
export interface Month {
  year: number
  month: number
}

/** The month a calendar day falls in. */
export function monthOf(day: number): Month {
  const { year, month } = dayParts(day)
  return { year, month }
}

/** The month `count` months after `m`, or before it when `count` is negative: the calendar's arrows (slice 3B §5.5). */
export function addMonths(m: Month, count: number): Month {
  return monthOf(dayOf(m.year, m.month + count, 1))
}

/** Whether a calendar day falls in month `m`. */
export function inMonth(day: number, m: Month): boolean {
  const { year, month } = dayParts(day)
  return year === m.year && month === m.month
}

/**
 * The first day of the visitor's week, 0 = Sunday, from the browser's week information for their region, as the app
 * follows the phone's region: Sunday in the US, Monday in much of Europe. Sunday when the browser has none (§5.8).
 */
export function firstWeekday(locale: string = navigator.language): number {
  try {
    const region = new Intl.Locale(locale).maximize() as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number }
      weekInfo?: { firstDay: number }
    }
    // getWeekInfo() is the standard; Safari 17 and older Chromes have a weekInfo property instead. Its 7 is Sunday.
    const info = region.getWeekInfo?.() ?? region.weekInfo
    return info ? info.firstDay % 7 : 0
  } catch {
    return 0
  }
}

/** A day in the calendar's grid: its calendar day number, its day of the month, and whether it's in the month shown. */
export interface GridDay {
  day: number
  date: number
  inMonth: boolean
}

/**
 * The month's week rows, CalendarDataBuilder.buildMonthGrid: its days, led and trailed by the days of the months either
 * side to fill the first and last weeks. Four to six rows of seven (§4.4).
 */
export function monthGrid(m: Month, firstDay: number): GridDay[][] {
  const first = dayOf(m.year, m.month, 1)
  const last = dayOf(m.year, m.month + 1, 0)
  const start = first - ((dayParts(first).weekday - firstDay + 7) % 7)
  return Array.from({ length: Math.ceil((last - start + 1) / 7) }, (_, row) =>
    Array.from({ length: 7 }, (_, column) => {
      const day = start + row * 7 + column
      return { day, date: dayParts(day).day, inMonth: day >= first && day <= last }
    }),
  )
}
```

`firstWeekday` fills in the region first, so a bare "en" means the US, as `tempUnitFor` does for the weather. Browsers count the week's days from 1 = Monday to 7 = Sunday; `% 7` turns Sunday into the site's 0. Older browsers have neither `getWeekInfo()` nor `weekInfo`, and get Sunday.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/calendarFacts.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2033 tests in 90 files after this task.

```bash
git add tests/ui/calendarFacts.test.ts src/ui/calendarFacts.ts
git commit -m "calendarFacts: months, the visitor's first weekday, and a month's grid of days (slice 3B §4.4, §5.5, §5.8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The bars and the time line

**Files:**
- Modify: `src/ui/calendarFacts.ts`
- Test: `tests/ui/calendarFacts.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/ui/calendarFacts.test.ts`, change the imports:

Replace this:

```ts
import { dayOf, dayParts } from '../../src/time/zoned'
import { addMonths, firstWeekday, inMonth, monthGrid, monthOf } from '../../src/ui/calendarFacts'
```

with this:

```ts
import { dayOf, dayParts } from '../../src/time/zoned'
import { addMonths, barKind, firstWeekday, inMonth, monthGrid, monthOf, timeLine, weekBars, type Bar } from '../../src/ui/calendarFacts'
import { drive, duty, flight, H, place } from '../fixtures/legs'
```

and add these tests at the end:

```ts
const NY = 'America/New_York'
/** Sunday 11 Oct 2026, the first day of a week row, and its midnight in New York in the fixtures' hours. */
const SUN = dayOf(2026, 10, 11)
const T0 = Date.UTC(2026, 9, 11, 4) / H
/** A place in a week row as hours from its start, in a week without a clock change. */
const hours = (days: number) => Math.round(days * 24 * 100) / 100
const shape = (b: Bar) => [b.kind, hours(b.from), hours(b.to), b.code, b.roundStart, b.roundEnd]

describe('weekBars (slice 3B §4.5, §4.6)', () => {
  it('gives each leg its kind of bar, a rest at base among the rests, and time at home none', () => {
    const legs = [
      flight('SDF', 'RFD', T0 + 30, T0 + 31, 'A'),
      place('turn', 'RFD', T0 + 31, T0 + 32, 'A'),
      place('layover', 'ANC', T0 + 40, T0 + 41, 'B'),
      place('base', 'SDF', T0 + 50, T0 + 51, 'C'),
      place('home', 'LEX', T0 + 60, T0 + 61, 'D'),
      drive('LEX', 'SDF', false, T0 + 70, T0 + 71),
      duty('reserve', 'RSV-A', 'SDF', T0 + 80, T0 + 81),
      duty('hotStandby', 'Hot Standby', 'SDF', T0 + 90, T0 + 91),
      duty('training', 'CQ', 'SDF', T0 + 100, T0 + 101),
      duty('event', 'Dinner', null, T0 + 110, T0 + 111),
      flight('SDF', 'MCO', T0 + 120, T0 + 121, null),
    ]
    expect(legs.map(barKind)).toEqual(['duty', 'duty', 'rest', 'rest', null, 'rest', 'reserve', 'reserve', 'training', 'training', 'jumpseat'])
    expect(weekBars(SUN, legs, NY).map((b) => b.kind)).toEqual(['duty', 'duty', 'rest', 'rest', 'rest', 'reserve', 'reserve', 'training', 'training', 'jumpseat'])
  })

  it('measures bars across the row by time, from its first midnight, and cuts them at its edges', () => {
    const legs = [
      duty('reserve', 'RSV-A', 'SDF', T0 - 2, T0 + 2), // from the row before
      duty('training', 'CQ', 'SDF', T0 + 30, T0 + 42), // Monday 6am to 6pm
      flight('SDF', 'ANC', T0 + 164, T0 + 172, 'X'), // Saturday 8pm, into the next row
    ]
    expect(weekBars(SUN, legs, NY).map(shape)).toEqual([
      ['reserve', 0, 2, null, false, true],
      ['training', 30, 42, null, true, true],
      ['duty', 164, 168, null, true, false],
    ])
    expect(weekBars(SUN + 7, legs, NY).map(shape)).toEqual([['duty', 0, 4, null, false, true]])
  })

  it('stretches a trip’s leg to meet the next across a gap under 30 minutes, and leaves 30 minutes or more open', () => {
    const legs = [
      flight('SDF', 'RFD', T0 + 30, T0 + 31, 'T'),
      flight('RFD', 'ANC', T0 + 31.25, T0 + 33, 'T'), // 15 minutes later
      flight('ANC', 'SDF', T0 + 33.5, T0 + 36, 'T'), // 30 minutes later
      drive('SDF', 'LEX', true, T0 + 36.25, T0 + 37), // 15 minutes later, but not the trip’s
    ]
    expect(weekBars(SUN, legs, NY).map(shape)).toEqual([
      ['duty', 30, 31.25, null, true, false],
      ['duty', 31.25, 33, null, false, false],
      ['duty', 33.5, 36, null, false, true],
      ['rest', 36.25, 37, null, true, true],
    ])
  })

  it('rounds only where the whole trip starts and ends, and leaves a gap with square ends at a stop at home', () => {
    const legs = [
      flight('SDF', 'ANC', T0 + 30, T0 + 32),
      place('layover', 'ANC', T0 + 32, T0 + 50),
      flight('ANC', 'LEX', T0 + 50, T0 + 52),
      place('home', 'LEX', T0 + 52, T0 + 80),
      flight('LEX', 'SDF', T0 + 80, T0 + 82),
      place('base', 'SDF', T0 + 82, T0 + 100),
      flight('SDF', 'RFD', T0 + 100, T0 + 102),
    ]
    expect(weekBars(SUN, legs, NY).map(shape)).toEqual([
      ['duty', 30, 32, null, true, false],
      ['rest', 32, 50, 'ANC', false, false],
      ['duty', 50, 52, null, false, false],
      ['duty', 80, 82, null, false, false],
      ['rest', 82, 100, 'SDF', false, false],
      ['duty', 100, 102, null, false, true],
    ])
  })

  it('takes a trip’s ends from all its legs, time at home too: a row with its middle rounds nothing, one with its last leg only the end', () => {
    const middle = [flight('SDF', 'ANC', T0 - 10, T0 - 2), place('layover', 'ANC', T0 - 2, T0 + 200), flight('ANC', 'SDF', T0 + 200, T0 + 205)]
    expect(weekBars(SUN, middle, NY).map(shape)).toEqual([['rest', 0, 168, 'ANC', false, false]])
    const afterHome = [flight('SDF', 'LEX', T0 - 30, T0 - 28), place('home', 'LEX', T0 - 28, T0 + 20), flight('LEX', 'SDF', T0 + 20, T0 + 22)]
    expect(weekBars(SUN, afterHome, NY).map(shape)).toEqual([['duty', 20, 22, null, false, true]])
  })

  it('puts the code over both pieces of a layover that runs into the next row', () => {
    const legs = [flight('SDF', 'ANC', T0 + 150, T0 + 160, 'L'), place('layover', 'ANC', T0 + 160, T0 + 180, 'L'), flight('ANC', 'SDF', T0 + 180, T0 + 185, 'L')]
    expect(weekBars(SUN, legs, NY).map(shape)).toEqual([['duty', 150, 160, null, true, false], ['rest', 160, 168, 'ANC', false, false]])
    expect(weekBars(SUN + 7, legs, NY).map(shape)).toEqual([['rest', 0, 12, 'ANC', false, false], ['duty', 12, 17, null, false, true]])
  })

  it('draws overlapping legs in start order, a later one over an earlier', () => {
    const legs = [
      flight('SDF', 'MCO', T0 + 30, T0 + 40, 'A'),
      place('layover', 'MCO', T0 + 40, T0 + 60, 'A'),
      flight('MCO', 'SDF', T0 + 60, T0 + 62, 'A'),
      flight('MCO', 'TPA', T0 + 45, T0 + 47, null),
    ]
    expect(weekBars(SUN, legs, NY).map((b) => [b.kind, hours(b.from)])).toEqual([['duty', 30], ['rest', 40], ['jumpseat', 45], ['duty', 60]])
  })

  it('measures the week the clocks go back across its 169 hours, as the app does', () => {
    const midnight = Date.UTC(2026, 10, 1, 4) / H // Sunday 1 Nov 2026, midnight EDT
    const [bar] = weekBars(dayOf(2026, 11, 1), [duty('training', 'CQ', 'SDF', midnight + 73, midnight + 169)], NY) // Wednesday midnight EST on
    expect(bar.from).toBeCloseTo((73 / 169) * 7, 10)
    expect(bar.to).toBe(7)
  })
})

describe('timeLine (slice 3B §4.7)', () => {
  it('sits at now’s place in its week row, measured as the bars are, and in no other row', () => {
    expect(timeLine(SUN, (T0 + 30) * H, NY)).toBeCloseTo(1.25, 10)
    expect(timeLine(SUN + 7, (T0 + 168) * H, NY)).toBe(0)
    expect(timeLine(SUN, (T0 + 168) * H, NY)).toBeNull()
    expect(timeLine(SUN, (T0 - 1) * H, NY)).toBeNull()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/calendarFacts.test.ts`
Expected: FAIL in 9 tests (`9 failed | 8 passed (17)`) with `TypeError: weekBars is not a function`, `TypeError: undefined is not a function` (`barKind`) and `TypeError: timeLine is not a function`.

- [ ] **Step 3: Implement**

In `src/ui/calendarFacts.ts`, import the legs' type and two more time helpers:

Replace this:

```ts
import { dayOf, dayParts } from '../time/zoned'
```

with this:

```ts
import type { Leg } from '../engine/legs'
import { dayOf, dayParts, dayStart, MINUTE } from '../time/zoned'
```

then add to the end of the file:

```ts
/** A bar's kind, which gives its color (CalendarBarSegment.Category; §4.5). */
export type BarKind = 'duty' | 'rest' | 'reserve' | 'training' | 'jumpseat'

/**
 * The kind of bar a leg draws, as CalendarDataBuilder sorts them, or null for time at home, which draws none. A rest at
 * base is rest: the app draws it as duty, its catch-all for the legs it doesn't name (decision 2).
 */
export function barKind(leg: Leg): BarKind | null {
  switch (leg.kind) {
    case 'home':
      return null
    case 'layover':
    case 'base':
    case 'drive':
      return 'rest'
    case 'reserve':
    case 'hotStandby':
      return 'reserve'
    case 'training':
    case 'event':
      return 'training'
    case 'jumpseat':
      return 'jumpseat'
    default:
      // Trip flights, ground transport and turns.
      return 'duty'
  }
}

/** A bar in a week row: where it starts and ends, in days from the row's start (0–7), and how it looks. */
export interface Bar {
  /** Its leg's id. */
  id: string
  from: number
  to: number
  kind: BarKind
  /** The airport code over a layover or a rest at base (§4.6). */
  code: string | null
  /** Rounded where its trip starts or ends, in this row (§4.5). */
  roundStart: boolean
  roundEnd: boolean
}

/** A trip's leg stretches to meet the next when that begins less than this after it ends, as in the app. */
const JOIN_UNDER = 30 * MINUTE

/** A week row's span: from its first day's midnight to the midnight seven days later, both in the visitor's zone. */
function rowSpan(firstDay: number, timeZone: string) {
  const start = dayStart(firstDay, timeZone)
  const end = dayStart(firstDay + 7, timeZone)
  return { start, end, at: (ms: number) => ((ms - start) / (end - start)) * 7 }
}

/**
 * A week row's bars, CalendarDataBuilder.buildSegments: one for each leg the row overlaps, cut at its edges, measured
 * across it by time, and drawn in start order. A trip's legs stretch to meet the next across gaps under 30 minutes, and
 * a leg with no trip is a trip of its own. `legs` are all the list's legs, so a trip's start and end come from all of
 * them, not only this row's (§4.5, §4.6).
 */
export function weekBars(firstDay: number, legs: readonly Leg[], timeZone: string): Bar[] {
  const { start, end, at } = rowSpan(firstDay, timeZone)
  const trips = new Map<string, Leg[]>()
  legs.forEach((leg, i) => {
    if (barKind(leg) === null || leg.start >= end || leg.end <= start) return
    const key = leg.tripId ?? `solo ${i}`
    trips.set(key, [...(trips.get(key) ?? []), leg])
  })
  const bars: Bar[] = []
  for (const [tripId, inRow] of trips) {
    const sorted = [...inRow].sort((a, b) => a.start - b.start)
    const whole = sorted[0].tripId === null ? sorted : legs.filter((leg) => leg.tripId === tripId)
    const tripStart = Math.min(...whole.map((leg) => leg.start))
    const tripEnd = Math.max(...whole.map((leg) => leg.end))
    sorted.forEach((leg, i) => {
      const next = sorted[i + 1]
      const gap = next ? next.start - leg.end : 0
      const from = at(Math.max(leg.start, start))
      const to = gap > 0 && gap < JOIN_UNDER ? at(next.start) : at(Math.min(leg.end, end))
      if (to <= from) return
      bars.push({
        id: leg.id,
        from,
        to,
        kind: barKind(leg)!,
        code: leg.kind === 'layover' || leg.kind === 'base' ? leg.airport : null,
        roundStart: leg.start <= tripStart && tripStart >= start && tripStart < end,
        roundEnd: leg.end >= tripEnd && tripEnd > start && tripEnd <= end,
      })
    })
  }
  return bars.sort((a, b) => a.from - b.from)
}

/** Where the time line sits in a week row, in days from its start, measured as the bars are; null outside it (§4.7). */
export function timeLine(firstDay: number, now: number, timeZone: string): number | null {
  const { start, end, at } = rowSpan(firstDay, timeZone)
  return now >= start && now < end ? at(now) : null
}
```

This is `CalendarDataBuilder.buildSegments` line for line, with two differences the spec names:
- a rest at base is rest, not duty (decision 2);
- the week row runs between `dayStart`s in the visitor's zone, so a week with a clock change is 167 or 169 hours, as the app's calendar makes it.

As in the app, a trip's start and end come from all its legs in the list, time at home included, though that draws no bar.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/calendarFacts.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2042 tests in 90 files after this task.

```bash
git add tests/ui/calendarFacts.test.ts src/ui/calendarFacts.ts
git commit -m "calendarFacts: each leg's kind of bar, a week row's bars from the app's CalendarDataBuilder, and the time line (slice 3B §4.5–4.7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Where a tap scrolls the list

**Files:**
- Modify: `src/ui/calendarFacts.ts`
- Test: `tests/ui/calendarFacts.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/ui/calendarFacts.test.ts`, import `scrollDay`, and `scheduleDays` to build the list's days:

Replace this:

```ts
import { addMonths, barKind, firstWeekday, inMonth, monthGrid, monthOf, timeLine, weekBars, type Bar } from '../../src/ui/calendarFacts'
```

with this:

```ts
import { addMonths, barKind, firstWeekday, inMonth, monthGrid, monthOf, scrollDay, timeLine, weekBars, type Bar } from '../../src/ui/calendarFacts'
import { scheduleDays } from '../../src/ui/scheduleFacts'
```

and add these tests at the end:

```ts
describe('scrollDay (slice 3B §5.2)', () => {
  /** Thursday 15 Oct 2026 in New York, and its midnight in the fixtures' hours. The list has Thursday, Friday and Sunday. */
  const THU = dayOf(2026, 10, 15)
  const T = Date.UTC(2026, 9, 15, 4) / H
  const days = scheduleDays([
    flight('SDF', 'RFD', T + 6, T + 8, 'A'),
    place('layover', 'RFD', T + 8, T + 30, 'A'), // Thursday 8am to Friday 6am
    flight('RFD', 'SDF', T + 30, T + 32, 'A'),
    duty('training', 'CQ', 'SDF', T + 76, T + 80), // Sunday
  ], NY)
  const fridayNoon = (T + 36) * H

  it('goes to a day that has legs', () => {
    expect(scrollDay(THU + 1, days, fridayNoon, NY)).toBe(THU + 1)
    expect(scrollDay(THU + 3, days, fridayNoon, NY)).toBe(THU + 3)
  })

  it('goes from a day without legs to the latest day before it that has some', () => {
    expect(scrollDay(THU + 2, days, fridayNoon, NY)).toBe(THU + 1)
    expect(scrollDay(THU + 20, days, fridayNoon, NY)).toBe(THU + 3)
  })

  it('stays put for a day before every leg', () => {
    expect(scrollDay(THU - 1, days, fridayNoon, NY)).toBeNull()
  })

  it('goes from today to the day a leg happening now started, though that was yesterday', () => {
    const friday2am = (T + 26) * H // the layover from Thursday is happening
    expect(scrollDay(THU + 1, days, friday2am, NY)).toBe(THU)
    expect(scrollDay(THU + 3, days, friday2am, NY)).toBe(THU + 3)
  })

  it('takes today like any other day when nothing is happening', () => {
    const saturdayNoon = (T + 60) * H
    expect(scrollDay(THU + 2, days, saturdayNoon, NY)).toBe(THU + 1)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/calendarFacts.test.ts`
Expected: FAIL in 5 tests (`5 failed | 17 passed (22)`) with `TypeError: scrollDay is not a function`.

- [ ] **Step 3: Implement**

In `src/ui/calendarFacts.ts`, import `calendarDay`, and `isHappening` and the day's type from `scheduleFacts`:

Replace this:

```ts
import type { Leg } from '../engine/legs'
import { dayOf, dayParts, dayStart, MINUTE } from '../time/zoned'
```

with this:

```ts
import type { Leg } from '../engine/legs'
import { calendarDay, dayOf, dayParts, dayStart, MINUTE } from '../time/zoned'
import { isHappening, type ScheduleDay } from './scheduleFacts'
```

then add to the end of the file:

```ts
/**
 * The day whose heading a tap on calendar day `day` scrolls the list to, as EventTimelineView does on a new selection,
 * or null to stay: the day a leg happening now started, when `day` is today; else the latest day of the list on or
 * before `day` (slice 3B §5.2).
 */
export function scrollDay(day: number, days: readonly ScheduleDay[], now: number, timeZone: string): number | null {
  if (day === calendarDay(now, timeZone)) {
    const happening = days.flatMap((d) => d.legs).find((leg) => isHappening(leg, now))
    if (happening) return calendarDay(happening.start, timeZone)
  }
  let target: number | null = null
  for (const d of days) if (d.day <= day) target = d.day
  return target
}
```

It's the calendar's half of `EventTimelineView`'s `onChange(of: selectedDate)`. Current Event's half is 3A's `openingDay`, which already does what the app's `isCurrentEventScroll` branch does.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/calendarFacts.test.ts`
Expected: PASS, 22 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2047 tests in 90 files after this task.

```bash
git add tests/ui/calendarFacts.test.ts src/ui/calendarFacts.ts
git commit -m "calendarFacts: the day a tap on the calendar scrolls the list to, as the app's selection does (slice 3B §5.2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The demo's rest at base

**Files:**
- Modify: `src/data/demo.ts`
- Test: `tests/data/demo.test.ts`, `tests/ui/StatusScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

In `tests/data/demo.test.ts`, import the schedule's and the legs' builders:

```ts
import { buildLegs } from '../../src/engine/legs'
import { buildSchedule } from '../../src/engine/normalize'
```

and add this test just before "keeps the ANC→SDF flight 40 minutes late":

```ts
  it('rests the third trip at base, SDF, for 16 hours between two duty periods, for the calendar’s light bar (slice 3B §6.2)', () => {
    const legs = buildLegs(buildSchedule(demoRaw('driver', A), A))
    const rests = legs.filter((leg) => leg.kind === 'base')
    expect(rests).toMatchObject([{ tripId: 'demo-t2', airport: 'SDF' }])
    expect((rests[0].end - rests[0].start) / 3_600_000).toBe(16)
  })
```

In `tests/ui/StatusScreen.test.tsx`, move "home, with no trip ahead" past the longer third trip:

Replace this:

```tsx
    const { container, names } = linksAt(12000) // home, with no trip ahead
```

with this:

```tsx
    const { container, names } = linksAt(14400) // home, with no trip ahead
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/data/demo.test.ts tests/data/demoScenes.test.ts tests/ui/StatusScreen.test.tsx`
Expected: FAIL in 1 test (`1 failed | 114 passed (115)`) with `AssertionError: expected [] to match object [ { tripId: 'demo-t2', …(1) } ]`.

- [ ] **Step 3: Implement**

In `src/data/demo.ts`, move the `nothing-ahead` scene past the longer trip:

Replace this:

```ts
  // Home after the last trip, with nothing ahead: the status page shows View Schedule (slice 3A §3.2).
  'nothing-ahead': { variant: 'driver', offset: 12000 },
```

with this:

```ts
  // Home after the last trip, with nothing ahead: the status page shows View Schedule (slice 3A §3.2).
  'nothing-ahead': { variant: 'driver', offset: 14400 },
```

give the third trip a third duty period, after 16 hours at base:

Replace this:

```ts
  b.trip('demo-t2', {
    days: 2,
    base: 'SDF',
    dutyPeriods: [
      { start: 10080, end: 10470, flights: [{ dep: 'SDF', arr: 'ONT', out: 10140, in: 10440, number: '2970' }] },
      { start: 11400, end: 11730, flights: [{ dep: 'ONT', arr: 'SDF', out: 11460, in: 11700, number: '2971' }] },
    ],
  })
```

with this:

```ts
  // The third trip rests 16 hours at base between its second and third duty periods (slice 3B §6.2).
  b.trip('demo-t2', {
    days: 3,
    base: 'SDF',
    dutyPeriods: [
      { start: 10080, end: 10470, flights: [{ dep: 'SDF', arr: 'ONT', out: 10140, in: 10440, number: '2970' }] },
      { start: 11400, end: 11730, flights: [{ dep: 'ONT', arr: 'SDF', out: 11460, in: 11700, number: '2971' }] },
      {
        start: 12600,
        end: 12990,
        flights: [
          { dep: 'SDF', arr: 'RFD', out: 12660, in: 12750, number: '2972' },
          { dep: 'RFD', arr: 'SDF', out: 12810, in: 12900, number: '2973' },
        ],
      },
    ],
  })
```

and move the driver's drive home after it:

Replace this:

```ts
    b.commute('demo-c2-home', 'SDF', 'LEX', 'toHome', 11730, 11800, 'demo-t2')
```

with this:

```ts
    b.commute('demo-c2-home', 'SDF', 'LEX', 'toHome', 12990, 13060, 'demo-t2')
```

The jumpseater flies the same trips, so it rests at base too; it has no drive home to move. No other scene moves: the third trip starts a week after the main one, and only `nothing-ahead` came after it.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/data/demo.test.ts tests/data/demoScenes.test.ts tests/ui/StatusScreen.test.tsx`
Expected: PASS, 115 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2048 tests in 90 files after this task.

```bash
git add tests/data/demo.test.ts tests/ui/StatusScreen.test.tsx src/data/demo.ts
git commit -m "Demo: the third trip rests 16 hours at base between duty periods, for the calendar's light SDF bar (slice 3B §6.2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The calendar, drawn

**Files:**
- Create: `src/styles/calendar.css`, `src/ui/TripCalendar.tsx`
- Modify: `src/styles/tokens.css`, `src/main.tsx`
- Test: `tests/ui/TripCalendar.test.tsx`, `tests/styles/styles.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/ui/TripCalendar.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Leg } from '../../src/engine/legs'
import { dayOf } from '../../src/time/zoned'
import type { Month } from '../../src/ui/calendarFacts'
import { TripCalendar, type TripCalendarProps } from '../../src/ui/TripCalendar'
import { drive, flight, H, place } from '../fixtures/legs'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const NY = 'America/New_York'
const OCT: Month = { year: 2026, month: 10 }
/** Monday 12 Oct 2026, today in these tests, and its midnight in New York in the fixtures' hours. */
const TODAY = dayOf(2026, 10, 12)
const MON = Date.UTC(2026, 9, 12, 4) / H
const LEGS: Leg[] = [
  drive('LEX', 'SDF', false, MON + 13.75, MON + 15),
  flight('SDF', 'RFD', MON + 16.25, MON + 17.75, 'T1'),
  place('turn', 'RFD', MON + 17.75, MON + 19, 'T1'),
  flight('RFD', 'ANC', MON + 19, MON + 24.5, 'T1'),
  place('layover', 'ANC', MON + 24.5, MON + 41.25, 'T1'),
  flight('ANC', 'SDF', MON + 41.25, MON + 46.25, 'T1'),
]

function calendar(props: Partial<TripCalendarProps> = {}) {
  const handlers = { onSelect: vi.fn(), onMonth: vi.fn(), onCurrentEvent: vi.fn() }
  const result = render(
    <TripCalendar month={OCT} firstDay={0} legs={LEGS} now={(MON + 17) * H} timeZone={NY} today={TODAY} selected={TODAY} {...handlers} {...props} />,
  )
  return { ...result, ...handlers }
}

const dayButton = (container: Element, day: number) => container.querySelector<HTMLElement>(`[data-calendar-day="${day}"]`)!
/** Where an element sits in its week, as hours from the week's start, from its left edge and its width. */
const hoursAt = (percent: string) => Math.round(((parseFloat(percent) * 7) / 100) * 24 * 100) / 100
const span = (el: HTMLElement) => [hoursAt(el.style.left), hoursAt(el.style.left) + hoursAt(el.style.width)]

describe('TripCalendar (slice 3B §4)', () => {
  it('shows the month between its arrows and Current Event, and the weekday letters named in full', () => {
    const { container } = calendar()
    const header = container.querySelector('.calendar-header')!
    expect([...header.children].map((el) => el.className)).toEqual([
      'calendar-arrow', 'calendar-space', 'calendar-title', 'calendar-space', 'calendar-now', 'calendar-space', 'calendar-arrow',
    ])
    expect(screen.getByRole('button', { name: 'Previous month' }).querySelector('polyline')!.getAttribute('points')).toBe('6.5,1.5 1.5,7 6.5,12.5')
    expect(screen.getByRole('button', { name: 'Next month' }).querySelector('polyline')!.getAttribute('points')).toBe('1.5,1.5 6.5,7 1.5,12.5')
    expect(screen.getByRole('button', { name: 'Current Event' }).className).toBe('calendar-now')
    const title = header.querySelector('.calendar-title')!
    expect([title.textContent, title.getAttribute('aria-live')]).toEqual(['October 2026', 'polite'])
    expect(screen.getByRole('grid').getAttribute('aria-labelledby')).toBe(title.id)
    const columns = screen.getAllByRole('columnheader')
    expect(columns.map((c) => c.textContent).join('')).toBe('SMTWTFS')
    expect(columns.map((c) => c.getAttribute('aria-label'))).toEqual(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
  })

  it('lays the month out in weeks, with the days of the months either side', () => {
    const { container } = calendar()
    const weeks = [...container.querySelectorAll('.calendar-week')]
    expect(weeks.map((w) => [...w.querySelectorAll('.calendar-day')].map((d) => d.textContent).join(' '))).toEqual([
      '27 28 29 30 1 2 3', '4 5 6 7 8 9 10', '11 12 13 14 15 16 17', '18 19 20 21 22 23 24', '25 26 27 28 29 30 31',
    ])
    expect(weeks.every((w) => w.getAttribute('role') === 'row')).toBe(true)
    expect(dayButton(container, dayOf(2026, 9, 30)).className).toBe('calendar-day other')
    expect(dayButton(container, dayOf(2026, 10, 1)).className).toBe('calendar-day')
    expect(dayButton(container, dayOf(2026, 10, 15)).getAttribute('aria-label')).toBe('Thursday, October 15')
  })

  it('marks today with a ring and the selected day with a filled circle, for screen readers too', () => {
    const { container, rerender } = calendar()
    const today = dayButton(container, TODAY)
    expect([today.className, today.getAttribute('aria-current'), today.parentElement!.getAttribute('aria-selected')]).toEqual([
      'calendar-day today selected', 'date', 'true',
    ])
    const thursday = dayOf(2026, 10, 15)
    rerender(<TripCalendar month={OCT} firstDay={0} legs={LEGS} now={(MON + 17) * H} timeZone={NY} today={TODAY} selected={thursday}
      onSelect={() => {}} onMonth={() => {}} onCurrentEvent={() => {}} />)
    expect([today.className, today.parentElement!.getAttribute('aria-selected')]).toEqual(['calendar-day today', 'false'])
    const selected = dayButton(container, thursday)
    expect([selected.className, selected.getAttribute('aria-current'), selected.parentElement!.getAttribute('aria-selected')]).toEqual([
      'calendar-day selected', null, 'true',
    ])
    expect(container.querySelectorAll('[role="gridcell"]').length).toBe(35)
  })

  it('reports a tap on a day, a day of the month before, the arrows, and Current Event', () => {
    const { container, onSelect, onMonth, onCurrentEvent } = calendar()
    fireEvent.click(dayButton(container, dayOf(2026, 10, 15)))
    fireEvent.click(dayButton(container, dayOf(2026, 9, 30)))
    expect(onSelect.mock.calls).toEqual([[dayOf(2026, 10, 15)], [dayOf(2026, 9, 30)]])
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(onMonth.mock.calls).toEqual([[{ year: 2026, month: 9 }], [{ year: 2026, month: 11 }]])
    fireEvent.click(screen.getByRole('button', { name: 'Current Event' }))
    expect(onCurrentEvent).toHaveBeenCalledTimes(1)
  })

  it('draws each week’s bars by kind, rounded where the trip starts and ends, with the layover’s code, hidden from screen readers', () => {
    const { container } = calendar()
    const week = container.querySelectorAll('.calendar-week')[2]
    const art = week.querySelector<HTMLElement>('.calendar-art')!
    expect(art.getAttribute('aria-hidden')).toBe('true')
    const bars = [...art.querySelectorAll<HTMLElement>('.calendar-bar')]
    expect(bars.map((b) => b.className)).toEqual([
      'calendar-bar bar-rest round-start round-end',
      'calendar-bar bar-duty round-start',
      'calendar-bar bar-duty',
      'calendar-bar bar-duty',
      'calendar-bar bar-rest',
      'calendar-bar bar-duty round-end',
    ])
    expect(bars.map(span)).toEqual([[37.75, 39], [40.25, 41.75], [41.75, 43], [43, 48.5], [48.5, 65.25], [65.25, 70.25]])
    const code = art.querySelector<HTMLElement>('.calendar-code')!
    expect(code.textContent).toBe('ANC')
    expect((parseFloat(code.style.left) * 7 * 24) / 100).toBeCloseTo((48.5 + 65.25) / 2, 6)
    expect(container.querySelectorAll('.calendar-week')[1].querySelector('.calendar-bar')).toBeNull()
  })

  it('draws the time line in the week of now only, at now, and none when now is outside the month shown', () => {
    const { container, rerender } = calendar()
    const lines = [...container.querySelectorAll<HTMLElement>('.calendar-line')]
    expect(lines).toHaveLength(1)
    expect(lines[0].closest('.calendar-week')).toBe(container.querySelectorAll('.calendar-week')[2])
    expect(hoursAt(lines[0].style.left)).toBe(41)
    rerender(<TripCalendar month={{ year: 2026, month: 12 }} firstDay={0} legs={LEGS} now={(MON + 17) * H} timeZone={NY} today={TODAY}
      selected={TODAY} onSelect={() => {}} onMonth={() => {}} onCurrentEvent={() => {}} />)
    expect(container.querySelector('.calendar-line')).toBeNull()
  })

  it('draws six grid lines down every week, after its bars so they cross them, as the app lays its lines over', () => {
    const { container } = calendar()
    for (const art of container.querySelectorAll('.calendar-art')) {
      const lines = [...art.querySelectorAll<HTMLElement>('.calendar-vline')]
      expect(lines.map((l) => Math.round(parseFloat(l.style.left) * 7) / 100)).toEqual([1, 2, 3, 4, 5, 6])
      expect(art.lastElementChild).toBe(lines[5])
    }
  })

  it('starts the weeks on Monday for a visitor whose week does', () => {
    const { container } = calendar({ firstDay: 1 })
    expect(screen.getAllByRole('columnheader')[0].getAttribute('aria-label')).toBe('Monday')
    expect(container.querySelector('.calendar-day')!.textContent).toBe('28')
  })
})
```

In `tests/styles/styles.test.ts`, add the six colors to `SPEC_COLORS`, after `--bar-fill`:

```ts
  // Slice 3B §4.8: the calendar's on-duty and off-duty bars, its codes, its grid lines, Current Event's capsule and the
  // hairline under the calendar.
  ['--duty', '#1A3373', '#4D73E6'],
  ['--rest', '#99BFEB', '#8CA6CC'],
  ['--rest-text', '#99BFEB', '#8CA6CC'],
  ['--grid-line', 'rgba(0,0,0,.15)', 'rgba(255,255,255,.4)'],
  ['--button-fill', 'rgba(118,118,128,.12)', 'rgba(118,118,128,.24)'],
  ['--separator', 'rgba(60,60,67,.29)', 'rgba(84,84,88,.6)'],
```

add the codes' high-contrast color to `HIGH_CONTRAST`, after `--bar-track`:

```ts
  // Slice 3B §4.8: the calendar's 9 px codes, 5.2:1 on white. Dark mode's light blue is already 8.4:1 on black.
  ['--rest-text', '#2A6FB8', '#8CA6CC'],
```

rename the test that lists what Increase Contrast changes:

Replace this:

```ts
  it('changes only the system colors, the secondary text, the track and the glass, never the background, the text or UPS', () => {
```

with this:

```ts
  it('changes only the system colors, the secondary text, the track, the glass and the calendar’s codes, never the background, the text or UPS', () => {
```

and add a block for the new stylesheet just before "backdrop blurs":

```ts
describe('calendar.css', () => {
  // Read when each test runs, so a missing file fails the tests below and not the whole file.
  const rule = (head: string) => declarations(find(rulesIn(css('calendar')), head)!.body)

  it('lays the calendar out as TripCalendarView: 16 px above and below, 8 px between its header, letters and weeks', () => {
    expect(rule('.calendar')).toEqual(expect.arrayContaining([['padding', '16px 0'], ['gap', '8px']]))
    expect(rule('.calendar-weekdays')).toEqual(expect.arrayContaining([['margin-bottom', '8px'], ['font-size', '11px'], ['font-weight', '500'], ['color', 'var(--text-2)']]))
    expect(rule('.calendar-space')).toEqual([['flex', '1']])
  })

  it('sets the month at 17 px semibold, Current Event in 12 px blue on the gray capsule, and blue arrows with 44 px to tap', () => {
    expect(rule('.calendar-title')).toEqual(expect.arrayContaining([['font-size', '17px'], ['font-weight', '600']]))
    expect(rule('.calendar-now')).toEqual(expect.arrayContaining([
      ['padding', '7px 12px'], ['border-radius', '999px'], ['background', 'var(--button-fill)'], ['color', 'var(--blue)'], ['font-size', '12px'],
    ]))
    // 44 px squares, with margins that keep the row at the capsule's height and the tap areas within the column's sides.
    expect(rule('.calendar-arrow')).toEqual(expect.arrayContaining([['width', '44px'], ['height', '44px'], ['margin', '-7px -16px'], ['color', 'var(--blue)']]))
  })

  it('makes each week 50 px: the numbers’ 28 px, the codes’ 12 px and the bars’ 10 px', () => {
    expect(rule('.calendar-week')).toEqual(expect.arrayContaining([['height', '50px'], ['grid-template-columns', 'repeat(7, 1fr)']]))
    expect(rule('.calendar-day')).toEqual(expect.arrayContaining([['height', '28px'], ['font-size', '12px']]))
    expect(rule('.calendar-code')).toEqual(expect.arrayContaining([['top', '30px'], ['font-size', '9px'], ['font-weight', '600'], ['color', 'var(--rest-text)']]))
    expect(rule('.calendar-bar')).toEqual(expect.arrayContaining([['top', '42px'], ['height', '6px']]))
  })

  it('rings today in blue and fills the selected day with it, both 26 px, and fades the months either side to 40%', () => {
    expect(rule('.calendar-day::before')).toEqual(expect.arrayContaining([['width', '26px'], ['height', '26px'], ['border-radius', '50%']]))
    expect(rule('.calendar-day.today')).toEqual([['font-weight', '700']])
    expect(rule('.calendar-day.today::before')).toEqual([['border', '1.5px solid var(--blue)']])
    expect(rule('.calendar-day.selected')).toEqual([['color', '#ffffff']])
    expect(rule('.calendar-day.selected::before')).toEqual([['border', '0'], ['background', 'var(--blue)']])
    expect(rule('.calendar-day.other:not(.selected) .calendar-num')).toEqual([['opacity', '0.4']])
    const heads = rulesIn(css('calendar')).map((r) => r.head)
    expect(heads.indexOf('.calendar-day.selected::before')).toBeGreaterThan(heads.indexOf('.calendar-day.today::before'))
  })

  it('colors the bars by kind, rounds them 3 px where a trip starts or ends, and draws the time line in green', () => {
    expect([rule('.bar-duty'), rule('.bar-rest'), rule('.bar-reserve'), rule('.bar-training'), rule('.bar-jumpseat')]).toEqual([
      [['background', 'var(--duty)']], [['background', 'var(--rest)']], [['background', 'var(--pink)']], [['background', 'var(--purple)']],
      [['background', 'var(--green)']],
    ])
    expect(rule('.calendar-bar.round-start')).toEqual([['border-top-left-radius', '3px'], ['border-bottom-left-radius', '3px']])
    expect(rule('.calendar-bar.round-end')).toEqual([['border-top-right-radius', '3px'], ['border-bottom-right-radius', '3px']])
    expect(rule('.calendar-line')).toEqual(expect.arrayContaining([['width', '1.5px'], ['margin-left', '-0.75px'], ['background', 'var(--green)']]))
  })

  it('draws the grid lines 0.5 px in their gray, and the hairline under the calendar in iOS’s separator color', () => {
    expect(rule('.calendar-vline')).toEqual(expect.arrayContaining([['width', '0.5px'], ['background', 'var(--grid-line)']]))
    expect(rule('.calendar-week + .calendar-week .calendar-art::after')).toEqual(expect.arrayContaining([['height', '0.5px'], ['background', 'var(--grid-line)']]))
    expect(rule('.calendar-rule')).toEqual(expect.arrayContaining([['height', '0.5px'], ['background', 'var(--separator)']]))
    expect(rule('.calendar-art')).toContainEqual(['pointer-events', 'none'])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/TripCalendar.test.tsx tests/styles/styles.test.ts`
Expected: FAIL:
- `TripCalendar.test.tsx` can't load: `Error: Failed to resolve import "../../src/ui/TripCalendar" from "tests/ui/TripCalendar.test.tsx". Does the file exist?`
- 21 style tests fail (`21 failed | 159 passed (180)`): the twelve light and dark values of the new colors, `--rest-text`'s two high-contrast values, the list of what Increase Contrast changes, and the six `calendar.css` tests, with `Error: ENOENT: no such file or directory, open 'src/styles/calendar.css'`.

- [ ] **Step 3: Implement**

In `src/styles/tokens.css`, add the six colors to the light `:root`, after `--bar-fill`:

```css
  /* The month calendar (slice 3B §4.8): the app's on-duty and off-duty bars, the off-duty blue again for the small codes
     (darker under Increase Contrast), its grid lines, and iOS's bordered-button fill and separator. */
  --duty: #1a3373;
  --rest: #99bfeb;
  --rest-text: #99bfeb;
  --grid-line: rgba(0, 0, 0, 0.15);
  --button-fill: rgba(118, 118, 128, 0.12);
  --separator: rgba(60, 60, 67, 0.29);
```

to the dark `:root`, after its `--bar-fill`:

```css
    --duty: #4d73e6;
    --rest: #8ca6cc;
    --rest-text: #8ca6cc;
    --grid-line: rgba(255, 255, 255, 0.4);
    --button-fill: rgba(118, 118, 128, 0.24);
    --separator: rgba(84, 84, 88, 0.6);
```

to `.force-dark`, which must match the dark block exactly:

```css
  --duty: #4d73e6;
  --rest: #8ca6cc;
  --rest-text: #8ca6cc;
  --grid-line: rgba(255, 255, 255, 0.4);
  --button-fill: rgba(118, 118, 128, 0.24);
  --separator: rgba(84, 84, 88, 0.6);
```

the codes' darker blue to the light Increase Contrast `:root`, after its `--glass-edge`:

```css
    --rest-text: #2a6fb8;
```

and dark mode's own light blue to both dark Increase Contrast sets, `.force-dark` and the dark `:root`, after each `--glass-edge: rgba(255, 255, 255, 0.35);`, so the light set's darker blue never reaches a dark device:

```css
    --rest-text: #8ca6cc;
```

Create `src/styles/calendar.css`:

```css
/* The month calendar (slice 3B §4). Sizes are the app's TripCalendarView, CalendarWeekRowView and CalendarTripBarView
   in points. */

/* 16 px above and below; the page's column gives it its 16 px sides. The header, the weekday letters and the weeks are
   8 px apart. */
.calendar {
  flex: none;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* The header: ‹, the month, Current Event and ›, with a third of the room left over between each (§4.2). */
.calendar-header {
  display: flex;
  align-items: center;
}

.calendar-space {
  flex: 1;
}

.calendar-title {
  font-size: 17px;
  line-height: 22px;
  font-weight: 600;
}

/* SF Symbols' chevrons in blue. Each takes taps over 44 px, centered on it; the margins keep the row at the capsule's
   height, and the tap areas within the column's 16 px sides, with the chevrons a pixel in from the content's edges. */
.calendar-arrow {
  width: 44px;
  height: 44px;
  margin: -7px -16px;
  padding: 0;
  border: 0;
  background: none;
  display: grid;
  place-items: center;
  color: var(--blue);
  -webkit-tap-highlight-color: transparent;
}

/* Current Event: iOS's bordered button, 12 px blue words on a gray capsule. */
.calendar-now {
  padding: 7px 12px;
  border: 0;
  border-radius: 999px;
  background: var(--button-fill);
  color: var(--blue);
  font-size: 12px;
  line-height: 16px;
  -webkit-tap-highlight-color: transparent;
}

/* The weekday letters: 11 px, medium, in the secondary color, each centered in its seventh. */
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 8px;
  text-align: center;
  font-size: 11px;
  line-height: 13px;
  font-weight: 500;
  color: var(--text-2);
}

/* A week: the day numbers' 28 px, then the codes' 12 px and the bars' 10 px. */
.calendar-week {
  position: relative;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  height: 50px;
}

/* A day's number: 12 px in its 28 px row, bold for today. Today has a 1.5 px blue ring and the selected day a filled
   blue circle, both 26 px; the days of the months either side are the secondary color at 40%. */
.calendar-day {
  position: relative;
  width: 100%;
  height: 28px;
  padding: 0;
  border: 0;
  background: none;
  display: grid;
  place-items: center;
  color: var(--text);
  font-size: 12px;
  line-height: 16px;
  -webkit-tap-highlight-color: transparent;
}

.calendar-day::before {
  content: '';
  position: absolute;
  top: 1px;
  left: 50%;
  width: 26px;
  height: 26px;
  margin-left: -13px;
  border-radius: 50%;
}

.calendar-num {
  position: relative;
}

.calendar-day.today {
  font-weight: 700;
}

.calendar-day.today::before {
  border: 1.5px solid var(--blue);
}

.calendar-day.selected {
  color: #ffffff;
}

.calendar-day.selected::before {
  border: 0;
  background: var(--blue);
}

.calendar-day.other:not(.selected) {
  color: var(--text-2);
}

.calendar-day.other:not(.selected) .calendar-num {
  opacity: 0.4;
}

/* The codes, the bars, the time line and the grid lines, drawn over the week, which takes no taps there. */
.calendar-art {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
}

/* A code: 9 px semibold, centered over its bar, its middle 8 px down the 12 px row under the numbers. */
.calendar-code {
  position: absolute;
  top: 30px;
  transform: translateX(-50%);
  font-size: 9px;
  line-height: 12px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--rest-text);
}

/* A bar: 6 px tall in the middle of the 10 px strip, rounded 3 px where its trip starts or ends. */
.calendar-bar {
  position: absolute;
  top: 42px;
  height: 6px;
}

.calendar-bar.round-start {
  border-top-left-radius: 3px;
  border-bottom-left-radius: 3px;
}

.calendar-bar.round-end {
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
}

.bar-duty {
  background: var(--duty);
}

.bar-rest {
  background: var(--rest);
}

.bar-reserve {
  background: var(--pink);
}

.bar-training {
  background: var(--purple);
}

.bar-jumpseat {
  background: var(--green);
}

/* The time line: green, 1.5 px, down the whole week, centered on now. */
.calendar-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1.5px;
  margin-left: -0.75px;
  background: var(--green);
}

/* The grid lines, 0.5 px, drawn last, over the bars, as the app lays its lines over the weeks: six down each week, and
   one along the top of every week but the first. */
.calendar-vline {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0.5px;
  margin-left: -0.25px;
  background: var(--grid-line);
}

.calendar-week + .calendar-week .calendar-art::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 0.5px;
  background: var(--grid-line);
}

/* The hairline under the calendar, as wide as its content: the app's Divider, inset 16 px. */
.calendar-rule {
  flex: none;
  height: 0.5px;
  background: var(--separator);
}
```

In `src/main.tsx`, import it after `schedule.css`:

```tsx
import './styles/calendar.css'
```

Create `src/ui/TripCalendar.tsx`:

```tsx
import { useMemo } from 'preact/hooks'
import { dayName, monthTitle, weekdayColumns } from '../copy/calendar'
import type { Leg } from '../engine/legs'
import { addMonths, monthGrid, timeLine, weekBars, type Bar, type GridDay, type Month } from './calendarFacts'
import { Chevron } from './Chevron'

export interface TripCalendarProps {
  /** The month shown. */
  month: Month
  /** The week's first day, 0 = Sunday. */
  firstDay: number
  /** The list's legs, in start order. */
  legs: readonly Leg[]
  /** The page's clock, for the time line. */
  now: number
  timeZone: string
  /** Today and the selected day, as calendar day numbers in the visitor's zone. */
  today: number
  selected: number
  onSelect: (day: number) => void
  onMonth: (month: Month) => void
  onCurrentEvent: () => void
}

/** A place across a week, in days from its start, as a share of its width. */
const percent = (days: number) => `${(days / 7) * 100}%`

/**
 * The month calendar (TripCalendarView, CalendarWeekRowView, CalendarTripBarView; slice 3B §4): the month between its
 * arrows and Current Event, the weekday letters, and a row a week with the days' numbers, the codes over layovers and
 * rests at base, the bars, the time line and the grid lines. It keeps no state: the page says what to show.
 */
export function TripCalendar({ month, firstDay, legs, now, timeZone, today, selected, onSelect, onMonth, onCurrentEvent }: TripCalendarProps) {
  const weeks = useMemo(
    () => monthGrid(month, firstDay).map((days) => ({ days, bars: weekBars(days[0].day, legs, timeZone) })),
    [month.year, month.month, firstDay, legs, timeZone],
  )
  return (
    <div class="calendar">
      <div class="calendar-header">
        <button type="button" class="calendar-arrow" aria-label="Previous month" onClick={() => onMonth(addMonths(month, -1))}>
          <Chevron direction="left" size={17} weight={2.2} />
        </button>
        <span class="calendar-space" />
        <span id="calendar-title" class="calendar-title" aria-live="polite">{monthTitle(month.year, month.month)}</span>
        <span class="calendar-space" />
        <button type="button" class="calendar-now" onClick={onCurrentEvent}>Current Event</button>
        <span class="calendar-space" />
        <button type="button" class="calendar-arrow" aria-label="Next month" onClick={() => onMonth(addMonths(month, 1))}>
          <Chevron size={17} weight={2.2} />
        </button>
      </div>
      <div role="grid" aria-labelledby="calendar-title">
        <div class="calendar-weekdays" role="row">
          {weekdayColumns(firstDay).map((column) => (
            <span key={column.name} role="columnheader" aria-label={column.name}>{column.letter}</span>
          ))}
        </div>
        {weeks.map(({ days, bars }) => {
          const line = timeLine(days[0].day, now, timeZone)
          return (
            <div key={days[0].day} class="calendar-week" role="row">
              {days.map((d) => (
                <span key={d.day} role="gridcell" aria-selected={d.day === selected ? 'true' : 'false'}>
                  <button type="button" class={dayClass(d, today, selected)} data-calendar-day={d.day} aria-label={dayName(d.day)}
                    aria-current={d.day === today ? 'date' : undefined} onClick={() => onSelect(d.day)}>
                    <span class="calendar-num">{d.date}</span>
                  </button>
                </span>
              ))}
              <span class="calendar-art" aria-hidden="true">
                {bars.map((bar) => <WeekBar key={bar.id} bar={bar} />)}
                {bars.map((bar) => bar.code && (
                  <span key={`${bar.id} code`} class="calendar-code" style={{ left: percent((bar.from + bar.to) / 2) }}>{bar.code}</span>
                ))}
                {line != null && <span class="calendar-line" style={{ left: percent(line) }} />}
                {[1, 2, 3, 4, 5, 6].map((column) => <span key={column} class="calendar-vline" style={{ left: percent(column) }} />)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function dayClass(d: GridDay, today: number, selected: number): string {
  const marks = [d.inMonth ? null : 'other', d.day === today ? 'today' : null, d.day === selected ? 'selected' : null]
  return ['calendar-day', ...marks.filter(Boolean)].join(' ')
}

/** One bar, in its kind's color, rounded where its trip starts or ends (CalendarTripBarView). */
function WeekBar({ bar }: { bar: Bar }) {
  const ends = `${bar.roundStart ? ' round-start' : ''}${bar.roundEnd ? ' round-end' : ''}`
  return <span class={`calendar-bar bar-${bar.kind}${ends}`} style={{ left: percent(bar.from), width: percent(bar.to - bar.from) }} />
}
```

The grid lines come last in each week, after the bars and the time line, as the app lays its lines over the weeks.

The days carry `data-calendar-day`, not `data-day`. The list finds a day's section by `data-day`, and on a short window the calendar sits inside the list (Task 12).

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/TripCalendar.test.tsx tests/styles/styles.test.ts`
Expected: PASS, 188 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2077 tests in 91 files after this task.

```bash
git add tests/ui/TripCalendar.test.tsx tests/styles/styles.test.ts src/styles/tokens.css src/styles/calendar.css src/main.tsx src/ui/TripCalendar.tsx
git commit -m "TripCalendar: the month, its weekday letters, and each week's days, bars, codes, time line and grid lines, with the calendar's colors (slice 3B §4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The calendar from the keyboard

**Files:**
- Modify: `src/ui/TripCalendar.tsx`
- Test: `tests/ui/TripCalendar.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `tests/ui/TripCalendar.test.tsx`, import `useState`:

```tsx
import { useState } from 'preact/hooks'
```

and add these tests at the end:

```tsx
describe('TripCalendar from the keyboard (slice 3B §5.7)', () => {
  /** The days that take Tab: only ever one. */
  const stops = (container: Element) =>
    [...container.querySelectorAll<HTMLElement>('.calendar-day')].filter((b) => b.tabIndex === 0).map((b) => Number(b.dataset.calendarDay))

  /** The calendar on a page that turns its month, as the Schedule page does. */
  function Paged() {
    const [month, setMonth] = useState<Month>(OCT)
    return <TripCalendar month={month} firstDay={0} legs={LEGS} now={(MON + 17) * H} timeZone={NY} today={TODAY} selected={TODAY}
      onSelect={() => {}} onMonth={setMonth} onCurrentEvent={() => {}} />
  }

  it('gives the days one Tab stop: the selected day in the month shown, else today, else the 1st', () => {
    const { container, rerender } = calendar()
    expect(stops(container)).toEqual([TODAY])
    expect(dayButton(container, TODAY).tagName).toBe('BUTTON')
    const again = (month: Month, selected: number) =>
      rerender(<TripCalendar month={month} firstDay={0} legs={LEGS} now={(MON + 17) * H} timeZone={NY} today={TODAY} selected={selected}
        onSelect={() => {}} onMonth={() => {}} onCurrentEvent={() => {}} />)
    again(OCT, dayOf(2026, 10, 15))
    expect(stops(container)).toEqual([dayOf(2026, 10, 15)])
    again(OCT, dayOf(2026, 9, 30))
    expect(stops(container)).toEqual([TODAY])
    again({ year: 2026, month: 11 }, TODAY)
    expect(stops(container)).toEqual([dayOf(2026, 11, 1)])
  })

  it('moves a day with the left and right arrows and a week with up and down, focus following, without selecting', () => {
    const { container, onSelect } = calendar()
    dayButton(container, TODAY).focus()
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(dayButton(container, TODAY + 1))
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(dayButton(container, TODAY + 8))
    expect(stops(container)).toEqual([TODAY + 8])
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' })
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(dayButton(container, TODAY))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('keeps the arrows from scrolling the page, and leaves other keys to the browser, which taps a day on Enter or Space', () => {
    const { container } = calendar()
    expect(fireEvent.keyDown(dayButton(container, TODAY), { key: 'ArrowDown' })).toBe(false)
    expect(fireEvent.keyDown(dayButton(container, TODAY + 7), { key: 'Enter' })).toBe(true)
    expect(fireEvent.keyDown(dayButton(container, TODAY + 7), { key: ' ' })).toBe(true)
  })

  it('turns the month when a move leaves it, landing on that day, and turns back', () => {
    const { container } = render(<Paged />)
    const oct31 = dayOf(2026, 10, 31)
    dayButton(container, oct31).focus()
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    expect(container.querySelector('.calendar-title')!.textContent).toBe('November 2026')
    expect(document.activeElement).toBe(dayButton(container, oct31 + 1))
    expect(stops(container)).toEqual([oct31 + 1])
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' })
    expect(container.querySelector('.calendar-title')!.textContent).toBe('October 2026')
    expect(document.activeElement).toBe(dayButton(container, oct31 - 6))
  })

  it('goes back to the selected day as the Tab stop after a tap', () => {
    const { container } = calendar()
    dayButton(container, TODAY).focus()
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    fireEvent.click(dayButton(container, TODAY + 2))
    expect(stops(container)).toEqual([TODAY])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/TripCalendar.test.tsx`
Expected: FAIL in 5 tests (`5 failed | 8 passed (13)`):
- every day takes Tab: `expected [ 20723, 20724, 20725, 20726, …(31) ] to deeply equal [ 20738 ]`;
- the arrows move nothing and scroll the page: `expected true to be false`;
- the month never turns: `expected 'October 2026' to be 'November 2026'`.

- [ ] **Step 3: Implement**

In `src/ui/TripCalendar.tsx`, change the imports:

Replace this:

```tsx
import { useMemo } from 'preact/hooks'
import { dayName, monthTitle, weekdayColumns } from '../copy/calendar'
import type { Leg } from '../engine/legs'
import { addMonths, monthGrid, timeLine, weekBars, type Bar, type GridDay, type Month } from './calendarFacts'
```

with this:

```tsx
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import { dayName, monthTitle, weekdayColumns } from '../copy/calendar'
import type { Leg } from '../engine/legs'
import { dayOf } from '../time/zoned'
import { addMonths, inMonth, monthGrid, monthOf, timeLine, weekBars, type Bar, type GridDay, type Month } from './calendarFacts'
```

add the keys' steps after `percent`:

```tsx
/** How far each arrow key moves, in days (slice 3B §5.7). */
const STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
```

keep the keyboard's place in the component:

Replace this:

```tsx
/**
 * The month calendar (TripCalendarView, CalendarWeekRowView, CalendarTripBarView; slice 3B §4): the month between its
 * arrows and Current Event, the weekday letters, and a row a week with the days' numbers, the codes over layovers and
 * rests at base, the bars, the time line and the grid lines. It keeps no state: the page says what to show.
 */
export function TripCalendar({ month, firstDay, legs, now, timeZone, today, selected, onSelect, onMonth, onCurrentEvent }: TripCalendarProps) {
  const weeks = useMemo(
    () => monthGrid(month, firstDay).map((days) => ({ days, bars: weekBars(days[0].day, legs, timeZone) })),
    [month.year, month.month, firstDay, legs, timeZone],
  )
  return (
```

with this:

```tsx
/**
 * The month calendar (TripCalendarView, CalendarWeekRowView, CalendarTripBarView; slice 3B §4): the month between its
 * arrows and Current Event, the weekday letters, and a row a week with the days' numbers, the codes over layovers and
 * rests at base, the bars, the time line and the grid lines. The page says what to show; the calendar keeps only the
 * keyboard's place among the days, one Tab stop that the arrow keys move (§5.7).
 */
export function TripCalendar({ month, firstDay, legs, now, timeZone, today, selected, onSelect, onMonth, onCurrentEvent }: TripCalendarProps) {
  const weeks = useMemo(
    () => monthGrid(month, firstDay).map((days) => ({ days, bars: weekBars(days[0].day, legs, timeZone) })),
    [month.year, month.month, firstDay, legs, timeZone],
  )
  const grid = useRef<HTMLDivElement>(null)
  // Where the arrow keys left off, and the day to focus once the month the move turned to is drawn.
  const [keyDay, setKeyDay] = useState<number | null>(null)
  const focusNext = useRef<number | null>(null)
  const stop = [keyDay, selected, today].find((day) => day !== null && inMonth(day, month)) ?? dayOf(month.year, month.month, 1)

  useLayoutEffect(() => {
    const day = focusNext.current
    if (day === null) return
    focusNext.current = null
    grid.current?.querySelector<HTMLElement>(`[data-calendar-day="${day}"]`)?.focus()
  })

  const move = (e: KeyboardEvent, day: number) => {
    const step = STEPS[e.key]
    if (step === undefined) return
    e.preventDefault()
    const next = day + step
    setKeyDay(next)
    focusNext.current = next
    if (!inMonth(next, month)) onMonth(monthOf(next))
  }

  const tap = (day: number) => {
    setKeyDay(null)
    onSelect(day)
  }

  return (
```

give the grid its ref:

Replace this:

```tsx
      <div role="grid" aria-labelledby="calendar-title">
```

with this:

```tsx
      <div role="grid" aria-labelledby="calendar-title" ref={grid}>
```

and give each day its Tab stop and its keys:

Replace this:

```tsx
                  <button type="button" class={dayClass(d, today, selected)} data-calendar-day={d.day} aria-label={dayName(d.day)}
                    aria-current={d.day === today ? 'date' : undefined} onClick={() => onSelect(d.day)}>
```

with this:

```tsx
                  <button type="button" class={dayClass(d, today, selected)} data-calendar-day={d.day} aria-label={dayName(d.day)}
                    aria-current={d.day === today ? 'date' : undefined} tabIndex={d.day === stop ? 0 : -1} onClick={() => tap(d.day)}
                    onKeyDown={(e) => move(e, d.day)}>
```

Enter and Space stay with the browser, which clicks a button on them, so a key picks a day just as a finger does. Moving alone selects nothing, as in any date picker. A tap puts the Tab stop back on the selected day.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/TripCalendar.test.tsx`
Expected: PASS, 13 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2082 tests in 91 files after this task.

```bash
git add tests/ui/TripCalendar.test.tsx src/ui/TripCalendar.tsx
git commit -m "TripCalendar from the keyboard: one Tab stop for the days, arrows by day and week, turning the month when a move leaves it (slice 3B §5.7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: A row's tap

**Files:**
- Modify: `src/ui/TimelineRow.tsx`
- Test: `tests/ui/TimelineRow.test.tsx`

- [ ] **Step 1: Write the failing test**

In `tests/ui/TimelineRow.test.tsx`, import `fireEvent` and `vi`:

Replace this:

```tsx
import { cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
```

with this:

```tsx
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
```

and add this block at the end:

```tsx
describe('TimelineRow taps (slice 3B §5.3)', () => {
  it('reports a tap on the leg, not on its gap, and is no button for keyboards or screen readers, as the calendar’s days do the same', () => {
    const onTap = vi.fn()
    const { container } = render(
      <ol>
        <TimelineRow leg={ups} look={rowLook(ups, commuter, testAirports)} times={legTimes(ups.start, ups.end, NY, false)} moment="other" now={at(9)}
          gap={{ kind: 'gap', ms: H }} onTap={onTap} />
      </ol>,
    )
    const card = container.querySelector<HTMLElement>('.leg')!
    fireEvent.click(card.querySelector('.leg-title')!)
    expect(onTap).toHaveBeenCalledTimes(1)
    fireEvent.click(container.querySelector('.leg-gap')!)
    expect(onTap).toHaveBeenCalledTimes(1)
    expect([card.tagName, card.getAttribute('role'), card.getAttribute('tabindex')]).toEqual(['DIV', null, null])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/TimelineRow.test.tsx`
Expected: FAIL in 1 test (`1 failed | 6 passed (7)`) with `AssertionError: expected "spy" to be called 1 times, but got 0 times`.

- [ ] **Step 3: Implement**

In `src/ui/TimelineRow.tsx`, add the prop:

```tsx
  /** A tap on the leg, which picks its day on the calendar (slice 3B §5.3). For the pointer only: the days do the same. */
  onTap?: () => void
```

take it:

Replace this:

```tsx
export function TimelineRow({ leg, look, times, moment, now, gap }: TimelineRowProps) {
```

with this:

```tsx
export function TimelineRow({ leg, look, times, moment, now, gap, onTap }: TimelineRowProps) {
```

and put it on the leg, not on the gap before it:

Replace this:

```tsx
      <div class={`leg glass${edge}${look.homeward ? ' homeward' : ''}`} style={{ '--leg': cssColor(look.color) }}>
```

with this:

```tsx
      <div class={`leg glass${edge}${look.homeward ? ' homeward' : ''}`} style={{ '--leg': cssColor(look.color) }} onClick={onTap}>
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/TimelineRow.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2083 tests in 91 files after this task.

```bash
git add tests/ui/TimelineRow.test.tsx src/ui/TimelineRow.tsx
git commit -m "TimelineRow: a tap on the leg, for the page to pick its day on the calendar (slice 3B §5.3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The page's new shape

**Files:**
- Modify: `src/ui/SchedulePage.tsx`, `src/styles/schedule.css`, `src/styles/tokens.css`
- Test: `tests/ui/SchedulePage.test.tsx`, `tests/styles/styles.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/ui/SchedulePage.test.tsx`, lay the page out from the top of the list's box instead of the bar's bottom, and add a way to find the box:

Replace this:

```tsx
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
```

with this:

```tsx
/** Lays the page out for the browser-free tests: the list's box from 60 px down, each day and heading where `tops` say. */
function layOut(tops: { days?: Record<number, number>; headings?: Record<number, number> }) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const day = Number((this.closest('[data-day]') as HTMLElement | null)?.dataset.day)
    const top = this.classList.contains('schedule-days') ? 60
      : this.classList.contains('day-heading') ? tops.headings?.[day] ?? 0
      : this.classList.contains('schedule-day') ? tops.days?.[day] ?? 0 : 0
    return { top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect
  })
}

/** The list's own scrolling box (slice 3B §3.4). */
const listBox = (container: Element) => container.querySelector<HTMLElement>('.schedule-days')!
```

add a test for the box just before the title's focus test, and have that test watch the box's scroll:

Replace this:

```tsx
  it('focuses the title before it scrolls, since Safari before 15 scrolls to whatever takes focus', () => {
    const calls: string[] = []
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {
```

with this:

```tsx
  it('scrolls the list in its own box under the bar, which keyboards can reach and screen readers name (slice 3B §3.1, §3.4)', () => {
    const { container } = render(page(LEGS, at(10)))
    const box = listBox(container)
    expect(box.parentElement!.firstElementChild!.className).toBe('schedule-bar')
    expect(box.parentElement!.lastElementChild).toBe(box)
    expect([box.getAttribute('tabindex'), box.getAttribute('role'), box.getAttribute('aria-label')]).toEqual(['0', 'region', 'Legs'])
    expect(box.querySelectorAll('.schedule-day').length).toBe(3)
  })

  it('focuses the title before it scrolls, since Safari before 15 scrolls to whatever takes focus', () => {
    const calls: string[] = []
    vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {
```

watch the box in the test that updates in place:

Replace this:

```tsx
  it('updates in place as the clock runs and new data arrives, without scrolling again', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
```

with this:

```tsx
  it('updates in place as the clock runs and new data arrives, without scrolling again', () => {
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})
```

in the two opening tests, and at the start of the stuck heading's:

Replace this:

```tsx
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
```

with this:

```tsx
  it('opens with the next leg’s day at the top of the list’s box, scrolling the box and not the window', () => {
    const windowScroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})
    layOut({ days: { [THU]: 100, [THU + 1]: 700, [THU + 2]: 1400 } })
    const { container } = render(page(LEGS, at(10)))
    expect(scrollTo).toHaveBeenCalledWith(0, 640)
    expect(scrollTo.mock.contexts[0]).toBe(listBox(container))
    expect(windowScroll).not.toHaveBeenCalled()
  })

  it('opens at the top when the day it would open at has no legs', () => {
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})
    layOut({ days: { [THU]: 100 } })
    render(page(LEGS.slice(0, 1), at(36)))
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('turns the heading stuck at the top of the list yellow, the last one within 20 px of it, as the list scrolls; today’s stays green', async () => {
    vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})
```

and scroll the box in the stuck heading's test, then check the box's and the window's listeners go:

Replace this:

```tsx
    layOut({ headings: { [THU]: -900, [THU + 1]: -100, [THU + 2]: 75 } })
    fireEvent.scroll(window)
    await frames.frame(16)
    expect(pills()).toEqual(['day-pill today', 'day-pill', 'day-pill stuck'])
    layOut({ headings: { [THU]: 60, [THU + 1]: 900, [THU + 2]: 1400 } })
    fireEvent.scroll(window)
    await frames.frame(32)
    expect(pills()).toEqual(['day-pill today', 'day-pill', 'day-pill'])
    // 21 px below the bar is too far.
    layOut({ headings: { [THU]: -900, [THU + 1]: 60, [THU + 2]: 81 } })
    fireEvent.scroll(window)
    await frames.frame(48)
    expect(pills()).toEqual(['day-pill today', 'day-pill stuck', 'day-pill'])
  })

  it('stops listening to the page’s scrolling and resizing once it’s gone', () => {
    const removed = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(page(LEGS, at(10)))
    unmount()
    expect(removed.mock.calls.map(([type]) => type)).toEqual(expect.arrayContaining(['scroll', 'resize']))
  })
```

with this:

```tsx
    layOut({ headings: { [THU]: -900, [THU + 1]: -100, [THU + 2]: 75 } })
    fireEvent.scroll(listBox(container))
    await frames.frame(16)
    expect(pills()).toEqual(['day-pill today', 'day-pill', 'day-pill stuck'])
    layOut({ headings: { [THU]: 60, [THU + 1]: 900, [THU + 2]: 1400 } })
    fireEvent.scroll(listBox(container))
    await frames.frame(32)
    expect(pills()).toEqual(['day-pill today', 'day-pill', 'day-pill'])
    // 21 px below the top of the list is too far.
    layOut({ headings: { [THU]: -900, [THU + 1]: 60, [THU + 2]: 81 } })
    fireEvent.scroll(listBox(container))
    await frames.frame(48)
    expect(pills()).toEqual(['day-pill today', 'day-pill stuck', 'day-pill'])
  })

  it('stops listening to the list’s scrolling and the window’s resizing once it’s gone', () => {
    const fromWindow = vi.spyOn(window, 'removeEventListener')
    const fromElements = vi.spyOn(HTMLElement.prototype, 'removeEventListener')
    const { unmount } = render(page(LEGS, at(10)))
    unmount()
    expect(fromWindow.mock.calls.map(([type]) => type)).toContain('resize')
    expect(fromElements.mock.calls.map(([type]) => type)).toContain('scroll')
  })
```

In `tests/styles/styles.test.ts`, replace the first `schedule.css` test:

Replace this:

```ts
  it('keeps the bar at the top and each day’s heading stuck just under it, both over iOS’s bar material', () => {
    expect(rule('.schedule-bar')).toEqual(expect.arrayContaining([['position', 'sticky'], ['top', '0'], ['height', '60px'], ['background', 'var(--bar-fill)']]))
    expect(rule('.day-heading')).toEqual(expect.arrayContaining([
      // The bar's color over the page's: the same shade, solid, so a row sliding under the heading doesn't show through.
      ['position', 'sticky'], ['top', '60px'], ['padding', '12px 0 2px'], ['background', 'linear-gradient(var(--bar-fill), var(--bar-fill)), var(--bg)'],
      ['font-size', '12px'], ['font-weight', '600'], ['text-transform', 'uppercase'],
    ]))
    expect(rule('.schedule-back')).toEqual([['width', '44px'], ['height', '44px'], ['-webkit-tap-highlight-color', 'transparent']])
    // The list's own 12 px is the space at the bottom, as the app's, above the home indicator's.
    expect(rule('.schedule')).toContainEqual(['padding', '0 16px env(safe-area-inset-bottom)'])
    expect(rule('.schedule-title')).toEqual(expect.arrayContaining([['font-size', '17px'], ['font-weight', '600']]))
  })
```

with this:

```ts
  it('fills the window with the page: the bar on the page’s plain color, then the list in its own box, headings stuck at its top (slice 3B §3)', () => {
    // Fixed to the window's edges, which holds in Safari before 15.4 too, so the window itself never scrolls.
    expect(rule('.schedule')).toEqual(expect.arrayContaining([
      ['position', 'fixed'], ['top', '0'], ['right', '0'], ['bottom', '0'], ['left', '0'], ['max-width', '480px'], ['margin', '0 auto'],
      ['padding', '0 16px'], ['display', 'flex'], ['flex-direction', 'column'],
    ]))
    // Nothing scrolls under the bar now, so it has no material, as iOS 26's bar over content that doesn't move.
    expect(rule('.schedule-bar')).toEqual(expect.arrayContaining([['flex', 'none'], ['height', '60px']]))
    expect(rule('.schedule-bar').map(([prop]) => prop)).not.toContain('background')
    expect(rule('.schedule-bar').map(([prop]) => prop)).not.toContain('position')
    // The box spans the column, so its scroll bar sits at the edge. It has no padding at the top, where a sticky heading
    // would stop short of its edge: the list inside keeps the app's 12 px, the bottom above the home indicator.
    expect(rule('.schedule-days')).toEqual([
      ['flex', '1'], ['min-height', '0'], ['overflow-x', 'hidden'], ['overflow-y', 'auto'], ['overscroll-behavior', 'contain'],
      ['margin', '0 -16px'], ['padding', '0 16px'],
    ])
    expect(rule('.schedule-list')).toEqual([['padding', '12px 0 calc(12px + env(safe-area-inset-bottom))']])
    expect(rule('.day-heading')).toEqual(expect.arrayContaining([
      // The bar material's shade over the page's, solid, so a row sliding under the heading doesn't show through.
      ['position', 'sticky'], ['top', '0'], ['padding', '12px 0 2px'], ['background', 'linear-gradient(var(--bar-fill), var(--bar-fill)), var(--bg)'],
      ['font-size', '12px'], ['font-weight', '600'], ['text-transform', 'uppercase'],
    ]))
    expect(rule('.schedule-back')).toEqual([['width', '44px'], ['height', '44px'], ['-webkit-tap-highlight-color', 'transparent']])
    expect(rule('.schedule-title')).toEqual(expect.arrayContaining([['font-size', '17px'], ['font-weight', '600']]))
  })
```

and the start of the spacing test, as the bar no longer needs to sit over anything:

Replace this:

```ts
  it('spaces the list as the app does, slides rows under the headings and headings under the bar, and pulses once a second', () => {
    expect(rule('.day-legs')).toContainEqual(['gap', '6px'])
    expect(rule('.leg-text')).toContainEqual(['gap', '3px'])
    expect(rule('.schedule-days')).toEqual([['padding', '12px 0']])
    expect(rule('.schedule-empty')).toContainEqual(['padding', '32px'])
    expect(rule('.schedule-bar')).toContainEqual(['z-index', '2'])
    expect(rule('.day-heading')).toContainEqual(['z-index', '1'])
```

with this:

```ts
  it('spaces the list as the app does, slides rows under the headings, and pulses once a second', () => {
    expect(rule('.day-legs')).toContainEqual(['gap', '6px'])
    expect(rule('.leg-text')).toContainEqual(['gap', '3px'])
    expect(rule('.schedule-empty')).toContainEqual(['padding', '32px'])
    expect(rule('.day-heading')).toContainEqual(['z-index', '1'])
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/SchedulePage.test.tsx tests/styles/styles.test.ts`
Expected: FAIL in 8 tests (`8 failed | 185 passed (193)`): the box has no Tab stop, role or name (`expected [ null, null, null ] to deeply equal [ '0', 'region', 'Legs' ]`), the window scrolls instead of the box, and the stylesheet still has the sticky bar.

- [ ] **Step 3: Implement**

In `src/ui/SchedulePage.tsx`, measure from the top of the list's box instead of the bar:

Replace this:

```tsx
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
```

with this:

```tsx
/** How far below the top of the list's box a heading counts as stuck there: the app's 20 points (EventTimelineView). */
const STUCK_SLACK = 20

const topOf = (el: HTMLElement | null) => el?.getBoundingClientRect().top ?? 0

/**
 * The Schedule page (EventTimelineView, slice 3A §4, 3B §3): the window's height exactly, with a bar holding the back
 * button and the title, then every leg by day in a box of its own that scrolls, as the app's scroll view does. The days'
 * headings stick at the top of the box, and the list opens at the next leg's day. Today's heading is green, and the one
 * stuck at the top yellow.
 */
export function SchedulePage({ legs, pilot, now, timeZone, h24, airports, onBack }: SchedulePageProps) {
  const days = useMemo(() => scheduleDays(legs, timeZone), [legs, timeZone])
  const title = useRef<HTMLHeadingElement>(null)
```

in the stuck heading:

Replace this:

```tsx
  /** The day whose heading is stuck under the bar: the last heading within 20 px of it (§4.3). */
  const stuckDay = () => {
    const limit = bottomOf(bar.current) + STUCK_SLACK
```

with this:

```tsx
  /** The day whose heading is stuck at the top of the list: the last heading within 20 px of it (3A §4.3, 3B §3.4). */
  const stuckDay = () => {
    const limit = topOf(list.current) + STUCK_SLACK
```

scroll the box as the page opens, and listen to the box's scrolling:

Replace this:

```tsx
  // The page appears already at its opening day, with that day's heading stuck, and focus goes to the title so screen
  // readers announce the page (§3.3, §4.11). Focus comes first: Safari before 15 ignores preventScroll and scrolls to
  // the title, and the scroll after it puts the page right. Only once: later renders leave the scroll where it is.
  useLayoutEffect(() => {
    const day = openingDay(days, now, timeZone)
    const section = day == null ? null : list.current?.querySelector<HTMLElement>(`[data-day="${day}"]`)
    title.current?.focus({ preventScroll: true })
    window.scrollTo(0, section ? window.scrollY + section.getBoundingClientRect().top - bottomOf(bar.current) : 0)
    setStuck(stuckDay())
  }, [])

  // The stuck heading again whenever the page scrolls or resizes, once a frame, and when the days change.
  useEffect(() => {
    let frame = 0
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0
        setStuck(stuckDay())
      })
    }
    setStuck(stuckDay())
    window.addEventListener('scroll', soon, { passive: true })
    window.addEventListener('resize', soon)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', soon)
      window.removeEventListener('resize', soon)
    }
  }, [days])
```

with this:

```tsx
  // The list appears already at its opening day, with that day's heading stuck, and focus goes to the title so screen
  // readers announce the page (3A §3.3, §4.11). Focus comes first: Safari before 15 ignores preventScroll and scrolls to
  // what takes focus. Only once: later renders leave the scroll where it is.
  useLayoutEffect(() => {
    const box = list.current!
    const day = openingDay(days, now, timeZone)
    const section = day == null ? null : box.querySelector<HTMLElement>(`[data-day="${day}"]`)
    title.current?.focus({ preventScroll: true })
    box.scrollTo(0, section ? box.scrollTop + section.getBoundingClientRect().top - topOf(box) : 0)
    setStuck(stuckDay())
  }, [])

  // The stuck heading again whenever the list scrolls or the window resizes, once a frame, and when the days change.
  useEffect(() => {
    const box = list.current!
    let frame = 0
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0
        setStuck(stuckDay())
      })
    }
    setStuck(stuckDay())
    box.addEventListener('scroll', soon, { passive: true })
    window.addEventListener('resize', soon)
    return () => {
      cancelAnimationFrame(frame)
      box.removeEventListener('scroll', soon)
      window.removeEventListener('resize', soon)
    }
  }, [days])
```

drop the bar's ref:

Replace this:

```tsx
      <header class="schedule-bar" ref={bar}>
```

with this:

```tsx
      <header class="schedule-bar">
```

and put the days in the box, inside an inner list:

Replace this:

```tsx
      <div class="schedule-days" ref={list}>
        {rows.length === 0 ? (
          <div class="schedule-empty">
            <Icon name="CalendarBlank" size={40} />
            <p class="schedule-empty-title">No schedule data</p>
            <p class="schedule-empty-text">Schedule will appear when your pilot's Duty app sends trip details.</p>
          </div>
        ) : (
          rows.map((d) => {
            const heading = dayHeading(d.day, today)
            return (
              <section key={d.day} class="schedule-day" data-day={d.day}>
                {/* Shown in capitals; the label keeps the words as written, so screen readers don't spell them out. */}
                <h2 class="day-heading" aria-label={heading}>
                  <span class={d.day === today ? 'day-pill today' : d.day === stuck ? 'day-pill stuck' : 'day-pill'}>{heading}</span>
                </h2>
                {/* Safari drops the list role from a list shown without bullets; the role puts it back. */}
                <ol class="day-legs" role="list">
                  {d.legs.map((row) => (
                    <TimelineRow key={row.leg.id} leg={row.leg} look={row.look} times={row.times} moment={legMoment(row.leg, now, nextId)} now={now}
                      gap={row.gap} />
                  ))}
                </ol>
              </section>
            )
          })
        )}
      </div>
```

with this:

```tsx
      {/* The list's own scrolling box, which keyboards reach to scroll it. The list inside keeps the 12 px above and
          below, so the box has no padding at the top and the headings stick at its very top (3B §3.4). */}
      <div class="schedule-days" ref={list} tabIndex={0} role="region" aria-label="Legs">
        <div class="schedule-list">
          {rows.length === 0 ? (
            <div class="schedule-empty">
              <Icon name="CalendarBlank" size={40} />
              <p class="schedule-empty-title">No schedule data</p>
              <p class="schedule-empty-text">Schedule will appear when your pilot's Duty app sends trip details.</p>
            </div>
          ) : (
            rows.map((d) => {
              const heading = dayHeading(d.day, today)
              return (
                <section key={d.day} class="schedule-day" data-day={d.day}>
                  {/* Shown in capitals; the label keeps the words as written, so screen readers don't spell them out. */}
                  <h2 class="day-heading" aria-label={heading}>
                    <span class={d.day === today ? 'day-pill today' : d.day === stuck ? 'day-pill stuck' : 'day-pill'}>{heading}</span>
                  </h2>
                  {/* Safari drops the list role from a list shown without bullets; the role puts it back. */}
                  <ol class="day-legs" role="list">
                    {d.legs.map((row) => (
                      <TimelineRow key={row.leg.id} leg={row.leg} look={row.look} times={row.times} moment={legMoment(row.leg, now, nextId)}
                        now={now} gap={row.gap} />
                    ))}
                  </ol>
                </section>
              )
            })
          )}
        </div>
      </div>
```

In `src/styles/schedule.css`, make the page the window's height, and the bar plain:

Replace this:

```css
/* The page: the site's column, without the status page's 24 px gaps. */
.schedule {
  max-width: 480px;
  margin: 0 auto;
  padding: 0 16px env(safe-area-inset-bottom);
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
```

with this:

```css
/* The page: the site's column, exactly the window's height, which it never scrolls; only the list does, in its own box
   (slice 3B §3.1). Fixed to the window's edges, which holds in Safari before 15.4 too. */
.schedule {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  max-width: 480px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
}

/* The bar: the back button, 44 px of round glass with a chevron as in iOS 26, and the title in the middle, on the
   page's plain color, as iOS 26's bar over content that doesn't scroll under it (slice 3B §3.3). */
.schedule-bar {
  flex: none;
  height: 60px;
  margin: 0 -16px;
  padding: 0 16px;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
}
```

and give the list its own box, the 12 px inside it, with the headings stuck at its top:

Replace this:

```css
/* The list, 12 px above and below; the page gives it its 16 px sides. */
.schedule-days {
  padding: 12px 0;
}

/* A day's heading sticks under the bar while its legs scroll past, and the next day's pushes it up. Its band is the
   bar's color laid over the page's: the same shade, but solid, as a backdrop blur on every heading costs Safari a
   layer each, and without one a row sliding under would show through. */
.day-heading {
  position: sticky;
  top: 60px;
```

with this:

```css
/* The list's box: the rest of the page, scrolling on its own, which doesn't hand its scroll on to the window at its ends
   or scroll sideways. It spans the column, so its scroll bar sits at the edge, and keeps the 16 px sides inside. It has
   no padding at the top, where a sticky heading would stop short of the box's edge (slice 3B §3.4). */
.schedule-days {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  margin: 0 -16px;
  padding: 0 16px;
}

/* The list, 12 px above and below as the app's, the bottom above the home indicator. */
.schedule-list {
  padding: 12px 0 calc(12px + env(safe-area-inset-bottom));
}

/* A day's heading sticks at the top of the list while its legs scroll past, and the next day's pushes it up. Its band
   is iOS's bar material's shade laid over the page's: the same shade, but solid, as a backdrop blur on every heading
   costs Safari a layer each, and without one a row sliding under would show through. */
.day-heading {
  position: sticky;
  top: 0;
```

In `src/styles/tokens.css`, `--bar-fill` now colors only the headings:

Replace this:

```css
  /* The Schedule page's bars (slice 3A §4.1): iOS's bar material over the page. */
```

with this:

```css
  /* The Schedule page's day headings (slice 3A §4.3): the shade of iOS's bar material over the page. */
```

A sticky heading stops short of its scroll box's padding, so the box has none at the top, and the inner `.schedule-list` keeps the app's 12 px.

The status page still scrolls the window, and comes back where it was. The Schedule page is fixed to the window's edges, so the window has nothing to scroll while it shows.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/SchedulePage.test.tsx tests/styles/styles.test.ts`
Expected: PASS, 193 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2084 tests in 91 files after this task.

```bash
git add tests/ui/SchedulePage.test.tsx tests/styles/styles.test.ts src/ui/SchedulePage.tsx src/styles/schedule.css src/styles/tokens.css
git commit -m "SchedulePage: the window's height exactly, with the list in its own scrolling box under the bar and its headings stuck at the box's top (slice 3B §3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The calendar on the page

**Files:**
- Modify: `src/ui/SchedulePage.tsx`
- Test: `tests/ui/SchedulePage.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `tests/ui/SchedulePage.test.tsx`, give the page a week from Sunday, so the tests don't depend on the computer's region:

Replace this:

```tsx
function page(legs: Leg[], now: number, onBack = () => {}) {
  return <SchedulePage legs={legs} pilot={pilot('LEX', 'SDF')} now={now} timeZone={NY} h24={false} airports={testAirports} onBack={onBack} />
}
```

with this:

```tsx
function page(legs: Leg[], now: number, onBack = () => {}) {
  return <SchedulePage legs={legs} pilot={pilot('LEX', 'SDF')} now={now} timeZone={NY} h24={false} airports={testAirports} onBack={onBack} weekStart={0} />
}
```

and add this block at the end:

```tsx
describe('SchedulePage’s calendar (slice 3B §3.1, §5)', () => {
  /** The days laid out as the list's box would hold them: Thursday at 100 px, Friday at 700 and Saturday at 1400. */
  const DAYS = { days: { [THU]: 100, [THU + 1]: 700, [THU + 2]: 1400 } }
  const day = (container: Element, n: number) => container.querySelector<HTMLElement>(`[data-calendar-day="${n}"]`)!
  const title = (container: Element) => container.querySelector('.calendar-title')!.textContent
  const scrolls = () => vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})

  it('sits between the bar and the list with its hairline, on this month with today selected', () => {
    const { container } = render(page(LEGS, at(10)))
    const calendar = container.querySelector('.calendar')!
    expect(calendar.previousElementSibling!.className).toBe('schedule-bar')
    expect(calendar.nextElementSibling!.className).toBe('calendar-rule')
    expect(calendar.nextElementSibling!.nextElementSibling!.className).toBe('schedule-days')
    expect(title(container)).toBe('October 2026')
    expect(day(container, THU).className).toBe('calendar-day today selected')
  })

  it('takes the list to a tapped day’s heading, gliding there, and selects the day', () => {
    const scrollTo = scrolls()
    layOut(DAYS)
    const { container } = render(page(LEGS, at(10)))
    fireEvent.click(day(container, THU + 1))
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 640, behavior: 'smooth' })
    expect(day(container, THU + 1).className).toBe('calendar-day selected')
    expect(day(container, THU).className).toBe('calendar-day today')
  })

  it('takes a day without legs to the latest day before it that has some, and leaves the list still for a day before every leg', () => {
    const scrollTo = scrolls()
    layOut(DAYS)
    const { container } = render(page(LEGS, at(10)))
    fireEvent.click(day(container, THU + 3))
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1340, behavior: 'smooth' })
    const calls = scrollTo.mock.calls.length
    fireEvent.click(day(container, THU - 1))
    expect(scrollTo.mock.calls.length).toBe(calls)
    expect(day(container, THU - 1).className).toBe('calendar-day selected')
  })

  it('takes today, while a leg is happening, to the day that leg started', () => {
    const scrollTo = scrolls()
    layOut(DAYS)
    const { container } = render(page(LEGS, at(26))) // Friday 2am, in the layover from Thursday
    fireEvent.click(day(container, THU + 1))
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 40, behavior: 'smooth' })
  })

  it('scrolls again for a tap on the day already selected, where the app does nothing', () => {
    const scrollTo = scrolls()
    layOut(DAYS)
    const { container } = render(page(LEGS, at(10)))
    fireEvent.click(day(container, THU + 2))
    fireEvent.click(day(container, THU + 2))
    expect(scrollTo.mock.calls.slice(-2)).toEqual([[{ top: 1340, behavior: 'smooth' }], [{ top: 1340, behavior: 'smooth' }]])
  })

  it('turns to a greyed day’s month as it selects it', () => {
    const { container } = render(page(LEGS, at(10)))
    fireEvent.click(day(container, THU - 15)) // Wednesday 30 September
    expect(title(container)).toBe('September 2026')
    expect(day(container, THU - 15).className).toBe('calendar-day selected')
  })

  it('turns the month with the arrows, keeping the day selected and the list still', () => {
    const scrollTo = scrolls()
    const { container } = render(page(LEGS, at(10)))
    const calls = scrollTo.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(title(container)).toBe('November 2026')
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(title(container)).toBe('September 2026')
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(day(container, THU).className).toBe('calendar-day today selected')
    expect(scrollTo.mock.calls.length).toBe(calls)
  })

  it('goes back to this month and today with Current Event, and takes the list where it opened', () => {
    const scrollTo = scrolls()
    layOut(DAYS)
    const { container } = render(page(LEGS, at(10)))
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    fireEvent.click(day(container, THU + 19)) // Tuesday 3 November
    expect(title(container)).toBe('November 2026')
    fireEvent.click(screen.getByRole('button', { name: 'Current Event' }))
    expect(title(container)).toBe('October 2026')
    expect(day(container, THU).className).toBe('calendar-day today selected')
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 640, behavior: 'smooth' })
  })

  it('picks a row’s day on the calendar and takes the list to it, unless it’s the selected day already, as in the app', () => {
    const scrollTo = scrolls()
    layOut(DAYS)
    const { container } = render(page(LEGS, at(10)))
    const calls = scrollTo.mock.calls.length
    const row = (n: number) => container.querySelector<HTMLElement>(`[data-day="${n}"] .leg`)!
    fireEvent.click(row(THU))
    expect(scrollTo.mock.calls.length).toBe(calls)
    fireEvent.click(row(THU + 2))
    expect(day(container, THU + 2).className).toBe('calendar-day selected')
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1340, behavior: 'smooth' })
    fireEvent.click(row(THU + 2))
    expect(scrollTo.mock.calls.length).toBe(calls + 1)
  })

  it('jumps instead of gliding for a visitor who asks for reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
    const scrollTo = scrolls()
    layOut(DAYS)
    const { container } = render(page(LEGS, at(10)))
    fireEvent.click(day(container, THU + 1))
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 640, behavior: 'auto' })
  })

  it('keeps the selected day and the month when the clock runs and new data arrives', () => {
    const { container, rerender } = render(page(LEGS, at(10)))
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    fireEvent.click(day(container, THU + 19))
    rerender(page([...LEGS], at(11)))
    expect(title(container)).toBe('November 2026')
    expect(day(container, THU + 19).className).toBe('calendar-day selected')
  })

  it('moves the time line once a minute, as the app’s does', () => {
    const { container, rerender } = render(page(LEGS, at(10)))
    const line = () => container.querySelector<HTMLElement>('.calendar-line')!.style.left
    const before = line()
    rerender(page(LEGS, at(10) + 59_000))
    expect(line()).toBe(before)
    rerender(page(LEGS, at(10) + 60_000))
    expect(line()).not.toBe(before)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/SchedulePage.test.tsx`
Expected: FAIL in 12 tests (`12 failed | 13 passed (25)`): there's no calendar on the page, as in `TypeError: Cannot use 'in' operator to search for 'onclick' in null` and `TypeError: Cannot read properties of null (reading 'previousElementSibling')`.

- [ ] **Step 3: Implement**

In `src/ui/SchedulePage.tsx`, change the imports:

Replace this:

```tsx
import { dayHeading, legTimes } from '../copy/schedule'
import type { AirportIndex } from '../data/airports'
import type { Leg } from '../engine/legs'
import type { Pilot } from '../engine/types'
import { calendarDay } from '../time/zoned'
import { Chevron } from './Chevron'
import { Icon } from './Icon'
import { gapBefore, legMoment, nextLegId, openingDay, rowLook, scheduleDays } from './scheduleFacts'
import { TimelineRow } from './TimelineRow'
```

with this:

```tsx
import { dayHeading, legTimes } from '../copy/schedule'
import type { AirportIndex } from '../data/airports'
import type { Leg } from '../engine/legs'
import type { Pilot } from '../engine/types'
import { calendarDay, MINUTE } from '../time/zoned'
import { firstWeekday, monthOf, scrollDay, type Month } from './calendarFacts'
import { Chevron } from './Chevron'
import { Icon } from './Icon'
import { prefersReducedMotion } from './motion'
import { gapBefore, legMoment, nextLegId, openingDay, rowLook, scheduleDays } from './scheduleFacts'
import { TimelineRow } from './TimelineRow'
import { TripCalendar } from './TripCalendar'
```

add the week's first day to the props:

```tsx
  /** The week's first day, 0 = Sunday: the visitor's region's, unless a test gives one (slice 3B §5.8). */
  weekStart?: number
```

keep the selected day, the month and the week's first day:

Replace this:

```tsx
/**
 * The Schedule page (EventTimelineView, slice 3A §4, 3B §3): the window's height exactly, with a bar holding the back
 * button and the title, then every leg by day in a box of its own that scrolls, as the app's scroll view does. The days'
 * headings stick at the top of the box, and the list opens at the next leg's day. Today's heading is green, and the one
 * stuck at the top yellow.
 */
export function SchedulePage({ legs, pilot, now, timeZone, h24, airports, onBack }: SchedulePageProps) {
  const days = useMemo(() => scheduleDays(legs, timeZone), [legs, timeZone])
```

with this:

```tsx
/**
 * The Schedule page (EventTimelineView, slice 3A §4, 3B §3): the window's height exactly, with a bar holding the back
 * button and the title, the month calendar pinned under it, then every leg by day in a box of its own that scrolls, as
 * the app's scroll view does. The days' headings stick at the top of the box, and the list opens at the next leg's day.
 * Today's heading is green, and the one stuck at the top yellow. Tapping a day or a row, or Current Event, scrolls the
 * list (3B §5).
 */
export function SchedulePage({ legs, pilot, now, timeZone, h24, airports, onBack, weekStart }: SchedulePageProps) {
  const days = useMemo(() => scheduleDays(legs, timeZone), [legs, timeZone])
  const today = calendarDay(now, timeZone)
  // The calendar opens on this month with today selected (3B §5.1). The page keeps both, so the calendar can move.
  const [selected, setSelected] = useState(today)
  const [month, setMonth] = useState<Month>(() => monthOf(today))
  const firstDay = useMemo(() => weekStart ?? firstWeekday(), [weekStart])
```

add the taps' handlers just before `nextId`; `today` has moved up:

Replace this:

```tsx
  const today = calendarDay(now, timeZone)
  const nextId = nextLegId(legs, now)
  return (
```

with this:

```tsx
  /** Scrolls the list so `day`'s heading sits at the top of its box, gliding unless the visitor asks for reduced motion (3B §5.6). */
  const scrollToDay = (day: number | null) => {
    const box = list.current
    const section = day === null ? null : box?.querySelector<HTMLElement>(`[data-day="${day}"]`)
    if (!box || !section) return
    box.scrollTo({ top: box.scrollTop + section.getBoundingClientRect().top - topOf(box), behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  /** A day picked on the calendar: selected, its month shown, and the list taken to it (3B §5.2). */
  const pick = (day: number) => {
    setSelected(day)
    setMonth(monthOf(day))
    scrollToDay(scrollDay(day, days, now, timeZone))
  }

  /** A row's day, picked as the calendar's would be, unless it's the selected day already, as in the app (3B §5.3). */
  const pickRow = (leg: Leg) => {
    const day = calendarDay(leg.start, timeZone)
    if (day !== selected) pick(day)
  }

  /** Current Event: this month and today, and the list where it opened (3B §5.4). */
  const currentEvent = () => {
    setSelected(today)
    setMonth(monthOf(today))
    scrollToDay(openingDay(days, now, timeZone))
  }

  const nextId = nextLegId(legs, now)
  return (
```

put the calendar and its hairline under the bar:

```tsx
      {/* The time line moves once a minute, as the app's (3B §4.7). */}
      <TripCalendar month={month} firstDay={firstDay} legs={legs} now={Math.floor(now / MINUTE) * MINUTE} timeZone={timeZone} today={today}
        selected={selected} onSelect={pick} onMonth={setMonth} onCurrentEvent={currentEvent} />
      <div class="calendar-rule" />
```

and give each row its tap:

Replace this:

```tsx
                      <TimelineRow key={row.leg.id} leg={row.leg} look={row.look} times={row.times} moment={legMoment(row.leg, now, nextId)}
                        now={now} gap={row.gap} />
```

with this:

```tsx
                      <TimelineRow key={row.leg.id} leg={row.leg} look={row.look} times={row.times} moment={legMoment(row.leg, now, nextId)}
                        now={now} gap={row.gap} onTap={() => pickRow(row.leg)} />
```

The page keeps the selected day and the month, not the calendar, so the calendar can move into the list without losing them (Task 12). `scrollToDay` asks about reduced motion at each tap, as the sun popup does as it opens.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/SchedulePage.test.tsx`
Expected: PASS, 25 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2096 tests in 91 files after this task.

```bash
git add tests/ui/SchedulePage.test.tsx src/ui/SchedulePage.tsx
git commit -m "SchedulePage: the month calendar pinned under the bar, and the day taps, row taps, arrows and Current Event that scroll the list (slice 3B §3.1, §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The short window

**Files:**
- Modify: `src/ui/SchedulePage.tsx`
- Test: `tests/ui/SchedulePage.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `tests/ui/SchedulePage.test.tsx`, import `act`:

Replace this:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
```

with this:

```tsx
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
```

and add this block at the end:

```tsx
describe('SchedulePage on a short window (slice 3B §3.2)', () => {
  /** A window `height` px tall, as matchMedia sees it, with the change event a turn of the phone sends. */
  function windowOf(height: number) {
    const listeners = new Set<() => void>()
    const tall = {
      get matches() {
        return height >= 500
      },
      media: '(min-height: 500px)',
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    }
    vi.stubGlobal('matchMedia', (query: string) => (query === tall.media ? tall : { matches: false, media: query }))
    return {
      listeners,
      turn(to: number) {
        height = to
        act(() => listeners.forEach((listener) => listener()))
      },
    }
  }

  it('pins the calendar under the bar on a window 500 px tall', () => {
    windowOf(500)
    const { container } = render(page(LEGS, at(10)))
    expect(container.querySelector('.calendar')!.parentElement!.className).toBe('schedule')
  })

  it('puts the calendar and its hairline at the top of the list on a shorter window, to scroll away with it', () => {
    windowOf(499)
    const { container } = render(page(LEGS, at(10)))
    expect([...listBox(container).children].slice(0, 3).map((el) => el.className)).toEqual(['calendar', 'calendar-rule', 'schedule-list'])
    expect(container.querySelector('.schedule')!.children[1]).toBe(listBox(container))
  })

  it('moves the calendar as the phone turns, keeping the day at the top of the list there', () => {
    const phone = windowOf(800)
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})
    layOut({ days: { [THU + 1]: 700 } })
    const { container } = render(page(LEGS, at(10)))
    expect(scrollTo).toHaveBeenLastCalledWith(0, 640)
    layOut({ headings: { [THU]: -300, [THU + 1]: 60, [THU + 2]: 900 }, days: { [THU + 1]: 260 } })
    phone.turn(400)
    expect(listBox(container).firstElementChild!.className).toBe('calendar')
    expect(scrollTo).toHaveBeenLastCalledWith(0, 200)
    phone.turn(800)
    expect(container.querySelector('.calendar')!.parentElement!.className).toBe('schedule')
  })

  it('stops listening for the window’s height once it’s gone', () => {
    const phone = windowOf(800)
    const { unmount } = render(page(LEGS, at(10)))
    expect(phone.listeners.size).toBe(1)
    unmount()
    expect(phone.listeners.size).toBe(0)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/SchedulePage.test.tsx`
Expected: FAIL in 3 tests (`3 failed | 26 passed (29)`): the calendar stays under the bar on a short window (`expected [ 'schedule-list' ] to deeply equal [ 'calendar', 'calendar-rule', …(1) ]`), and nothing listens for the window's height (`expected +0 to be 1`).

- [ ] **Step 3: Implement**

In `src/ui/SchedulePage.tsx`, add the rule after `STUCK_SLACK`:

```tsx
/** The windows tall enough to keep the calendar pinned under the bar (slice 3B §3.2). */
const TALL = '(min-height: 500px)'

/** Whether the window is tall enough for the pinned calendar: yes where the browser can't say. */
const tallEnough = () => typeof matchMedia !== 'function' || matchMedia(TALL).matches
```

keep whether the calendar is pinned, after the week's first day:

```tsx
  // Under 500 px tall, the calendar moves into the list and scrolls away with it; a turn of the phone moves it, keeping
  // the day at the top of the list there (3B §3.2).
  const [pinned, setPinned] = useState(tallEnough)
  const keepDay = useRef<number | null>(null)
```

listen for the window's height, and keep the top day, just before `scrollToDay`:

```tsx
  // A turn of the phone across 500 px moves the calendar, noting first the day at the top of the list.
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const query = matchMedia(TALL)
    const turn = () => {
      keepDay.current = stuckDay()
      setPinned(query.matches)
    }
    query.addEventListener?.('change', turn)
    return () => query.removeEventListener?.('change', turn)
  }, [])

  // Once the calendar has moved, that day is back at the top of the list.
  useLayoutEffect(() => {
    const day = keepDay.current
    keepDay.current = null
    const box = list.current!
    const section = day === null ? null : box.querySelector<HTMLElement>(`[data-day="${day}"]`)
    if (section) box.scrollTo(0, box.scrollTop + section.getBoundingClientRect().top - topOf(box))
  }, [pinned])
```

name the calendar just before `return`:

```tsx
  // The time line moves once a minute, as the app's (3B §4.7).
  const calendar = (
    <>
      <TripCalendar month={month} firstDay={firstDay} legs={legs} now={Math.floor(now / MINUTE) * MINUTE} timeZone={timeZone} today={today}
        selected={selected} onSelect={pick} onMonth={setMonth} onCurrentEvent={currentEvent} />
      <div class="calendar-rule" />
    </>
  )
```

and put it under the bar, or at the top of the list:

Replace this:

```tsx
      {/* The time line moves once a minute, as the app's (3B §4.7). */}
      <TripCalendar month={month} firstDay={firstDay} legs={legs} now={Math.floor(now / MINUTE) * MINUTE} timeZone={timeZone} today={today}
        selected={selected} onSelect={pick} onMonth={setMonth} onCurrentEvent={currentEvent} />
      <div class="calendar-rule" />
      {/* The list's own scrolling box, which keyboards reach to scroll it. The list inside keeps the 12 px above and
          below, so the box has no padding at the top and the headings stick at its very top (3B §3.4). */}
      <div class="schedule-days" ref={list} tabIndex={0} role="region" aria-label="Legs">
```

with this:

```tsx
      {pinned && calendar}
      {/* The list's own scrolling box, which keyboards reach to scroll it. The list inside keeps the 12 px above and
          below, so the box has no padding at the top and the headings stick at its very top (3B §3.4). */}
      <div class="schedule-days" ref={list} tabIndex={0} role="region" aria-label="Legs">
        {!pinned && calendar}
```

The rule is a media query, so a phone turning on its side moves the calendar without the page measuring anything. A browser without `matchMedia` keeps the calendar pinned.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/SchedulePage.test.tsx`
Expected: PASS, 29 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2100 tests in 91 files after this task.

```bash
git add tests/ui/SchedulePage.test.tsx src/ui/SchedulePage.tsx
git commit -m "SchedulePage: on a window under 500 px tall, the calendar moves into the list and scrolls away with it, keeping the top day as the phone turns (slice 3B §3.2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Look check with the user (controller)

**Files:**
- Modify (only if nudges are needed): `src/styles/calendar.css`, `src/styles/schedule.css`

- [ ] **Step 1: Build and open the preview**

Run `npm run build`, then start or reuse the `crewluve-preview` server from `.claude/launch.json` (port 5181) in the browser pane. Set the viewport to 375 × 812 for the phone's screenshots.

- [ ] **Step 2: Take the screenshots, in light and in dark**

The browser pane can hand back the previous frame right after a page changes, so take a small throwaway screenshot first, then the real one. If a page was built again since it was last opened, add a new query word, such as `&v=2`, so the browser doesn't show the old one.

- `/?demo=1&scene=flying#schedule`: the calendar on this month with today selected, the time line, the trips' bars and codes, and the list at today's heading.
- The same after tapping the third trip's second day: the light SDF rest at base, and the list at that day's heading, in yellow.
- The same at 320 px wide.
- A phone on its side, 812 × 375: the calendar at the top of the list.

Then tap the arrows, Current Event, and a row of another day, and move among the days with the arrow keys.

- [ ] **Step 3: Ask the user to sign off**

Put the screenshots side by side, and ask one question: "Looks right (Recommended)" or "Change something". Point out the Current Event button, iOS's default bordered button (a gray capsule with blue words), so they can compare it with their phone. Apply their notes, then show them again.

- [ ] **Step 4: Run the gates and commit any nudges**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/styles/calendar.css src/styles/schedule.css
git commit -m "Month calendar: visual nudges from the look check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Merge and release (controller, asks first)

- [ ] **Step 1: Merge**

Use superpowers:finishing-a-development-branch. Ask the user one question about how to merge `slice3b` into `main`.

- [ ] **Step 2: Release, only with a fresh yes**

Ask before pushing `main`; the push redeploys crewluve.crewlu.net. After the "Deploy to GitHub Pages" run succeeds, check the live site:
- the live page's files match the local build;
- https://crewluve.crewlu.net/?demo=1&scene=flying#schedule shows the calendar on this month with today selected; a tap on a day takes the list to it; and the back button returns to the status page;
- `read_console_messages` with `onlyErrors: true` shows nothing, and the demo makes no requests beyond the page's own files.

- [ ] **Step 3: Update the memory**

Update the project memory with the new tip and what's next: Slice 3C, the status and the schedule side by side on iPad and desktop.

---

## Done when

- `npx vitest run`, `npx tsc --noEmit` and `npm run build` are all green, with 2100 tests in 91 files.
- The calendar shows each month as the app does, with its bars, codes and time line. The page is the window's height and only the list scrolls. Taps on days and rows, the arrows and Current Event work as the app's, and a short window scrolls the calendar away with the list (Tasks 1–12).
- The user has signed off on the look (Task 13), and it's live on crewluve.crewlu.net, released with the user's yes (Task 14).

## Spec coverage

| Spec section | Tasks |
|---|---|
| §3.1 Only the list scrolls | 10 |
| §3.2 Short windows | 12 |
| §3.3 The bar | 10 |
| §3.4 The list's box | 10 |
| §4.1 Layout | 7, 11 (the hairline under the calendar) |
| §4.2 The month header | 2 (the title), 7 |
| §4.3 The weekday letters | 2, 3 (the first day), 7 |
| §4.4 The week rows | 3 (the grid), 7 |
| §4.5 The bars | 1 (`dayStart`), 4, 7 |
| §4.6 The codes | 4, 7 |
| §4.7 The time line | 4, 7, 11 (once a minute) |
| §4.8 Colors | 7 |
| §5.1 Opening | 11 |
| §5.2 Tapping a day | 5, 11 |
| §5.3 Tapping a row | 9, 11 |
| §5.4 Current Event | 11 |
| §5.5 The arrows | 3 (`addMonths`), 7, 11 |
| §5.6 Scrolling | 11 |
| §5.7 Keyboard and screen readers | 2 (names), 7 (roles and labels), 8 (keys), 10 (the box's Tab stop) |
| §5.8 Data and timing | 3 (`firstWeekday`), 11 (one clock, new data) |
| §6 How it's built | 1–12; the demo, 6 |
| §7 Security and privacy | no new requests; places through the CSSOM (7) |
| §8 Deliberate differences | 4 (rests at base, the time line), 7 (the arrows), 10, 11 (a tap on the selected day), 12 |
| §9 Testing | every task, then 13 |

## Execution notes

(Add notes here as the build goes: where the code had to differ from a printed block, and why.)
