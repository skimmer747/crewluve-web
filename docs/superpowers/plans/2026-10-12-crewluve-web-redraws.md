# Crewluve Web Redraws: the Calendar and the Rows Redraw Only When What They Show Changes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every second the Schedule page, and the side-by-side layout, draw the month calendar and every row of the list again, though most show nothing that changes. Afterwards the calendar draws again only as the minute turns or when what it shows changes, and of the rows only those whose clock shows the time. Nothing on screen changes.

**Architecture:**
- A small `memo` helper, `src/ui/memo.ts`, draws a component again only when one of its props has changed, as React's `memo` does.
- `TripCalendar` is memoized, and `ScheduleView` gives it steady handlers that call the latest code.
- `TimelineRow` is memoized. Its tap hands over its leg, so one steady handler serves every row, and only the happening and the next rows are given the ticking clock.

**Tech Stack:** Vite 5.4, TypeScript 5.9 (strict), Preact 10, Vitest 3 with happy-dom and @testing-library/preact.

**Spec:** `docs/superpowers/specs/2026-10-12-crewluve-web-redraws-design.md`

---

## Execution notes

**Setup and gates**
- **Branch:** work on `redraws` in the main project folder. Run `git switch -c redraws` from `main`. Don't use git worktrees; auto mode blocked a worktree builder during slice 1.
- **Working directory:** run every command from the project root, `~/Dev/Crewluve Website`. Quote it in shells, since it has a space.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass before every commit that touches code.
  - The suite is 2156 tests in 93 files before this plan, and 2163 tests in 95 files after it.
  - The read-only scan (`tests/data/readOnly.test.ts`) adds one test for each new file in `src/`, so the totals grow a little faster than the task counts below.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Nothing to install:** no task adds a package. `preact/compat` has a `memo`, but it brings the rest of compat with it, 2.65 kB gzipped (spec decision 2).

**How the printed code was checked**
- **Built and replayed:** every code block below was built and run in a scratch copy of the project before this plan was written, and all three gates passed there. A script then applied this plan's changes, step by step, to a fresh copy of `main`. Each Step 2 failed, each Step 4 passed with its count, and every file came out identical to the scratch copy's.
- **Deliberate breaks:** 12 of 12 were caught by the tests: the helper's comparisons, the calendar and the rows left unmemoized, handlers made anew every draw, steady handlers calling the first draw's code, every row given the ticking clock, and a row's tap handing over the click instead of its leg.
- **Measured** in happy-dom, with the demo's 22 legs, over 300 ticks: a tick on the Schedule page went from about 0.5 ms to 0.19 ms, and side by side from 0.6–0.9 ms to about 0.43 ms, mostly the status page now.
- **In the browser:** the scratch copy's production build ran in the browser pane at 402 × 874 and 1180 × 820. The happening and next rows' clocks ticked every second. A tap on a day, a tap on a row of another day, the arrows, Current Event and the arrow keys with Enter all worked as before, and there were no console errors.
- **The browser pane** can hand back the previous frame right after a page changes, so take a small throwaway screenshot first, then the real one. While the pane is hidden, smooth scrolling doesn't play; to see where a tap scrolls, have the page's motion check say "reduce" first (3B's plan shows how).

**Network and other repos**
- **No new requests, storage or scripts.** Tests never use the network; `tests/setup/noNetwork.ts` blocks it.
- **The Crewluve app (`~/Dev/Crewluv`) is reference only.** Read it; never change it.

**Reviews and changes**
- **One review:** after Task 3, a code-quality review of the whole branch, with its own frozen copy. It covers the spec too, since the spec is short.
- **Tasks 4–5 are for the controller, working with the user:** a browser check, then merge and release.
- **If the code has to differ from a printed block, write it down.** Note it under "Execution notes" at the end of this file, and update the spec's §6 decisions log if a decision changed.

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/ui/memo.ts` | create | A component drawn again only when one of its props has changed |
| `src/ui/TripCalendar.tsx` | modify | Memoized |
| `src/ui/TimelineRow.tsx` | modify | Memoized; its tap hands over its leg |
| `src/ui/ScheduleView.tsx` | modify | Steady handlers, and the clock only for the rows that show it |
| Tests | create and modify | `tests/ui/memo.test.tsx` and `tests/ui/redraws.test.tsx`, and one test in `tests/ui/TimelineRow.test.tsx` |

---

### Task 1: The memo helper

**Files:**
- Create: `src/ui/memo.ts`
- Test: `tests/ui/memo.test.tsx`

- [x] **Step 1: Write the failing tests**

Create `tests/ui/memo.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { useState } from 'preact/hooks'
import { afterEach, describe, expect, it } from 'vitest'
import { memo } from '../../src/ui/memo'

afterEach(cleanup)

/** How many times each probe below has drawn. */
let draws = 0

const Label = memo(({ text, onTap }: { text: string; onTap?: () => void }) => {
  draws++
  return <button type="button" onClick={onTap}>{text}</button>
})

describe('memo (redraws §4.1)', () => {
  it('draws again only when a prop has changed, compared one by one by identity', () => {
    draws = 0
    const tap = () => {}
    const { rerender } = render(<Label text="Today" onTap={tap} />)
    rerender(<Label text="Today" onTap={tap} />)
    expect(draws).toBe(1)
    rerender(<Label text="Tomorrow" onTap={tap} />)
    expect([draws, screen.getByRole('button').textContent]).toEqual([2, 'Tomorrow'])
  })

  it('counts a new function as a change, as the same code made again is a different function', () => {
    draws = 0
    const { rerender } = render(<Label text="Today" onTap={() => {}} />)
    rerender(<Label text="Today" onTap={() => {}} />)
    expect(draws).toBe(2)
  })

  it('counts a prop that comes or goes as a change', () => {
    draws = 0
    const tap = () => {}
    const { rerender } = render(<Label text="Today" />)
    rerender(<Label text="Today" onTap={tap} />)
    rerender(<Label text="Today" />)
    expect(draws).toBe(3)
  })

  it('still draws again for its own state, as the calendar does for the keyboard’s place', () => {
    draws = 0
    const Counter = memo(({ label }: { label: string }) => {
      const [count, setCount] = useState(0)
      draws++
      return <button type="button" onClick={() => setCount(count + 1)}>{`${label} ${count}`}</button>
    })
    render(<Counter label="Taps" />)
    fireEvent.click(screen.getByRole('button'))
    expect([draws, screen.getByRole('button').textContent]).toEqual([2, 'Taps 1'])
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/memo.test.tsx`
Expected: FAIL with `Error: Failed to resolve import "../../src/ui/memo" from "tests/ui/memo.test.tsx"`; no tests run.

- [x] **Step 3: Implement**

Create `src/ui/memo.ts`:

```ts
import { Component, createElement, type ComponentType, type FunctionComponent } from 'preact'

/** Whether any prop differs from before, compared one by one by identity, as React's memo compares them. */
function changed(before: object, after: object): boolean {
  const was = before as Record<string, unknown>
  const is = after as Record<string, unknown>
  for (const key in was) if (!(key in is)) return true
  for (const key in is) if (was[key] !== is[key]) return true
  return false
}

/**
 * The component, drawn again only when one of its props has changed (redraws §4.1), as React's memo does. Its own
 * state and hooks still draw it again as they would. preact/compat's memo works the same way, through
 * shouldComponentUpdate, but brings the rest of compat with it.
 */
export function memo<P extends object>(Inner: FunctionComponent<P>): ComponentType<P> {
  return class Memo extends Component<P> {
    shouldComponentUpdate(next: Readonly<P>) {
      return changed(this.props, next)
    }

    render() {
      return createElement(Inner, this.props)
    }
  }
}
```

The class sits around the component, and Preact asks it before drawing the component again. The component itself is drawn by `createElement`, so its own state and hooks still draw it again as before.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/memo.test.tsx`
Expected: PASS, 4 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2161 tests in 94 files after this task.

```bash
git add tests/ui/memo.test.tsx src/ui/memo.ts
git commit -m "memo: a component drawn again only when one of its props has changed, as React's memo (redraws §4.1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The calendar

**Files:**
- Modify: `src/ui/TripCalendar.tsx`, `src/ui/ScheduleView.tsx`
- Test: `tests/ui/redraws.test.tsx`

- [x] **Step 1: Write the failing test**

Create `tests/ui/redraws.test.tsx`. It counts the calendar's draws through `dayName`, which names every day as the calendar draws:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dayName } from '../../src/copy/calendar'
import type { Leg } from '../../src/engine/legs'
import { DAY, MINUTE } from '../../src/time/zoned'
import { ScheduleView } from '../../src/ui/ScheduleView'
import { testAirports } from '../fixtures/airports'
import { drive, duty, flight, H, pilot, place } from '../fixtures/legs'

// Each part's draws are counted through a function it calls as it draws: the calendar names every day it shows.
vi.mock('../../src/copy/calendar', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/copy/calendar')>()
  return { ...real, dayName: vi.fn(real.dayName) }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const NY = 'America/New_York'
/** Midnight in New York on Thursday 15 Oct 2026, in the fixtures' hours; THU is that calendar day. */
const T0 = Date.UTC(2026, 9, 15, 4) / H
const THU = Date.UTC(2026, 9, 15) / DAY
const at = (hours: number) => (T0 + hours) * H
const LEGS: Leg[] = [
  flight('SDF', 'RFD', T0 + 6.25, T0 + 7.75, 'T1', { number: '2961' }), // Thursday 6:15am
  place('layover', 'RFD', T0 + 7.75, T0 + 30.25), // happening at 10am Thursday
  flight('RFD', 'SDF', T0 + 30.25, T0 + 32, 'T1', { number: '2962' }), // the next leg then
  drive('SDF', 'LEX', true, T0 + 33, T0 + 34.5),
  duty('training', 'CQ Training', 'SDF', T0 + 52, T0 + 56),
]

// One pilot for every draw, as the app's schedule keeps one until new data comes.
const PILOT = pilot('LEX', 'SDF')
const view = (now: number) => (
  <ScheduleView legs={LEGS} pilot={PILOT} now={now} timeZone={NY} h24={false} airports={testAirports} weekStart={0} />
)

describe('redraws: the calendar (redraws §4.2)', () => {
  it('draws again as the minute turns, not with every second, and after a tap on a day', () => {
    const start = at(10)
    const { container, rerender } = render(view(start))
    const days = container.querySelectorAll('.calendar-day').length
    vi.mocked(dayName).mockClear()
    for (let second = 1; second < 60; second++) rerender(view(start + second * 1000))
    expect(dayName).not.toHaveBeenCalled()
    rerender(view(start + MINUTE))
    expect(dayName).toHaveBeenCalledTimes(days)
    vi.mocked(dayName).mockClear()
    fireEvent.click(container.querySelector<HTMLElement>(`[data-calendar-day="${THU + 1}"]`)!)
    expect(dayName).toHaveBeenCalledTimes(days)
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/redraws.test.tsx tests/ui/TripCalendar.test.tsx tests/ui/SchedulePage.test.tsx`
Expected: FAIL in 1 test (`1 failed | 62 passed (63)`) with `AssertionError: expected "dayName" to not be called at all, but actually been called 2065 times`: the calendar draws again every second.

- [x] **Step 3: Implement**

In `src/ui/TripCalendar.tsx`, import the helper:

```tsx
import { memo } from './memo'
```

memoize the calendar, saying so in its comment:

Replace this:

```tsx
 * rests at base, the bars, the time line and the grid lines. The page says what to show; the calendar keeps only the
 * keyboard's place among the days, one Tab stop that the arrow keys move (§5.7).
 */
export function TripCalendar({ month, firstDay, legs, now, timeZone, today, selected, onSelect, onMonth, onCurrentEvent }: TripCalendarProps) {
```

with this:

```tsx
 * rests at base, the bars, the time line and the grid lines. The page says what to show; the calendar keeps only the
 * keyboard's place among the days, one Tab stop that the arrow keys move (§5.7). It draws again only when what it's
 * given changes, or the keyboard's place does: the page's clock is to the minute, and its handlers are steady (redraws
 * §4.2).
 */
export const TripCalendar = memo(function TripCalendar({ month, firstDay, legs, now, timeZone, today, selected, onSelect, onMonth, onCurrentEvent }: TripCalendarProps) {
```

and close the call at the end of the function:

Replace this:

```tsx
    </div>
  )
}

function dayClass(
```

with this:

```tsx
    </div>
  )
})

function dayClass(
```

In `src/ui/ScheduleView.tsx`, import `useCallback`:

Replace this:

```tsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
```

with this:

```tsx
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
```

make the steady handlers after Current Event:

Replace this:

```tsx
    setJump({ day: openingDay(days, now, timeZone) })
  }

  const nextId = nextLegId(legs, now)
```

with this:

```tsx
    setJump({ day: openingDay(days, now, timeZone) })
  }

  // The calendar's handlers stay the same functions from draw to draw, and call the latest pick and Current Event, so
  // the memoized calendar draws again only when what it shows changes (redraws §4.2).
  const latest = useRef({ pick, currentEvent })
  latest.current = { pick, currentEvent }
  const onPick = useCallback((day: number) => latest.current.pick(day), [])
  const onCurrentEvent = useCallback(() => latest.current.currentEvent(), [])

  const nextId = nextLegId(legs, now)
```

and hand them to the calendar:

Replace this:

```tsx
        selected={selected} onSelect={pick} onMonth={setMonth} onCurrentEvent={currentEvent} />
```

with this:

```tsx
        selected={selected} onSelect={onPick} onMonth={setMonth} onCurrentEvent={onCurrentEvent} />
```

`onMonth` stays `setMonth`, which never changes. The calendar's other props already stay the same from tick to tick; its clock is rounded to the minute (3B §4.7).

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/redraws.test.tsx tests/ui/TripCalendar.test.tsx tests/ui/SchedulePage.test.tsx`
Expected: PASS, 63 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2162 tests in 95 files after this task.

```bash
git add tests/ui/redraws.test.tsx src/ui/TripCalendar.tsx src/ui/ScheduleView.tsx
git commit -m "TripCalendar memoized, with the page's handlers steady: it draws again only as the minute turns or what it shows changes (redraws §4.2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The rows

**Files:**
- Modify: `src/ui/TimelineRow.tsx`, `src/ui/ScheduleView.tsx`
- Test: `tests/ui/redraws.test.tsx`, `tests/ui/TimelineRow.test.tsx`

- [x] **Step 1: Write the failing tests**

In `tests/ui/redraws.test.tsx`, import the rows' clock:

```tsx
import { legClock } from '../../src/copy/schedule'
```

count its calls too:

Replace this:

```tsx
// Each part's draws are counted through a function it calls as it draws: the calendar names every day it shows.
vi.mock('../../src/copy/calendar', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/copy/calendar')>()
  return { ...real, dayName: vi.fn(real.dayName) }
})
```

with this:

```tsx
// Each part's draws are counted through a function it calls as it draws: the calendar names every day it shows, and a
// row works out its clock.
vi.mock('../../src/copy/calendar', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/copy/calendar')>()
  return { ...real, dayName: vi.fn(real.dayName) }
})
vi.mock('../../src/copy/schedule', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/copy/schedule')>()
  return { ...real, legClock: vi.fn(real.legClock) }
})
```

and add this block at the end:

```tsx
describe('redraws: the rows (redraws §4.3)', () => {
  it('draws only the happening and the next rows again each second; the others keep their durations', () => {
    const start = at(10)
    const { rerender } = render(view(start))
    vi.mocked(legClock).mockClear()
    rerender(view(start + 1000))
    // The layover happening at 10am, and the flight after it.
    expect(vi.mocked(legClock).mock.calls.map(([legStart]) => legStart)).toEqual([LEGS[1].start, LEGS[2].start])
  })
})
```

In `tests/ui/TimelineRow.test.tsx`, the tap test checks that the leg comes with the tap:

Replace this:

```tsx
    fireEvent.click(card.querySelector('.leg-title')!)
    expect(onTap).toHaveBeenCalledTimes(1)
    fireEvent.click(container.querySelector('.leg-gap')!)
```

with this:

```tsx
    fireEvent.click(card.querySelector('.leg-title')!)
    // It hands over its leg, so one handler serves every row (redraws §4.3).
    expect(onTap.mock.calls).toEqual([[ups]])
    fireEvent.click(container.querySelector('.leg-gap')!)
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/redraws.test.tsx tests/ui/TimelineRow.test.tsx tests/ui/SchedulePage.test.tsx`
Expected: FAIL in 2 tests (`2 failed | 50 passed (52)`): all five rows draw again each second (`expected [ 1792059300000, 1792064700000, …(3) ] to deeply equal [ 1792064700000, 1792145700000 ]`), and the tap hands over the click (`expected [ [ …(1) ] ] to deeply equal [ [ { kind: 'flight', …(13) } ] ]`).

- [x] **Step 3: Implement**

In `src/ui/TimelineRow.tsx`, import the helper:

```tsx
import { memo } from './memo'
```

hand the leg over with the tap:

Replace this:

```tsx
  /** A tap on the leg, which picks its day on the calendar (slice 3B §5.3). For the pointer only: the days do the same. */
  onTap?: () => void
```

with this:

```tsx
  /**
   * A tap on the leg, handed over with it, which picks its day on the calendar (slice 3B §5.3). For the pointer only:
   * the days do the same.
   */
  onTap?: (leg: Leg) => void
```

memoize the row, saying so in its comment:

Replace this:

```tsx
 * The gap before it comes first: a dashed line and a label, which screen readers hear in words (§4.10).
 */
export function TimelineRow({ leg, look, times, moment, now, gap, onTap }: TimelineRowProps) {
```

with this:

```tsx
 * The gap before it comes first: a dashed line and a label, which screen readers hear in words (§4.10). It draws again
 * only when its props change: the page gives the time only to the legs whose clock shows it (redraws §4.3).
 */
export const TimelineRow = memo(function TimelineRow({ leg, look, times, moment, now, gap, onTap }: TimelineRowProps) {
```

tap with the leg:

Replace this:

```tsx
style={{ '--leg': cssColor(look.color) }} onClick={onTap}>
```

with this:

```tsx
style={{ '--leg': cssColor(look.color) }} onClick={onTap && (() => onTap(leg))}>
```

and close the call at the end of the file:

Replace this:

```tsx
    </li>
  )
}
```

with this:

```tsx
    </li>
  )
})
```

In `src/ui/ScheduleView.tsx`, make the rows' steady handler with the calendar's:

Replace this:

```tsx
  // The calendar's handlers stay the same functions from draw to draw, and call the latest pick and Current Event, so
  // the memoized calendar draws again only when what it shows changes (redraws §4.2).
  const latest = useRef({ pick, currentEvent })
  latest.current = { pick, currentEvent }
  const onPick = useCallback((day: number) => latest.current.pick(day), [])
  const onCurrentEvent = useCallback(() => latest.current.currentEvent(), [])
```

with this:

```tsx
  // The calendar's and the rows' handlers stay the same functions from draw to draw, calling the latest pick, Current
  // Event and row tap, so the memoized calendar and rows draw again only when what they show changes (redraws §4).
  const latest = useRef({ pick, currentEvent, pickRow })
  latest.current = { pick, currentEvent, pickRow }
  const onPick = useCallback((day: number) => latest.current.pick(day), [])
  const onCurrentEvent = useCallback(() => latest.current.currentEvent(), [])
  const onRowTap = useCallback((leg: Leg) => latest.current.pickRow(leg), [])
```

and give the clock only to the rows that show it:

Replace this:

```tsx
                    {d.legs.map((row) => (
                      <TimelineRow key={row.leg.id} leg={row.leg} look={row.look} times={row.times} moment={legMoment(row.leg, now, nextId)}
                        now={now} gap={row.gap} onTap={() => pickRow(row.leg)} />
                    ))}
```

with this:

```tsx
                    {d.legs.map((row) => {
                      // Only the happening and the next legs show the time ticking. The others get a clock of 0,
                      // so they draw again only when they change (redraws §4.3).
                      const moment = legMoment(row.leg, now, nextId)
                      return (
                        <TimelineRow key={row.leg.id} leg={row.leg} look={row.look} times={row.times} moment={moment}
                          now={moment === 'other' ? 0 : now} gap={row.gap} onTap={onRowTap} />
                      )
                    })}
```

A row that's neither happening nor next shows its fixed duration, which `legClock` works out without the clock, so a clock of 0 changes nothing on screen.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/redraws.test.tsx tests/ui/TimelineRow.test.tsx tests/ui/SchedulePage.test.tsx`
Expected: PASS, 52 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2163 tests in 95 files after this task.

```bash
git add tests/ui/redraws.test.tsx tests/ui/TimelineRow.test.tsx src/ui/TimelineRow.tsx src/ui/ScheduleView.tsx
git commit -m "TimelineRow memoized, with its tap handing over its leg: each second only the happening and the next rows draw again (redraws §4.3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Browser check (controller)

- [x] **Step 1: Build and open the preview**

Run `npm run build`, then start or reuse the `crewluve-preview` server from `.claude/launch.json` (port 5181) in the browser pane.

- [x] **Step 2: Check that nothing changed**

At 402 × 874 on `/?demo=1&scene=flying#schedule`, and at 1180 × 820 on `/?demo=1&scene=flying`:
- the happening and next rows' clocks tick every second;
- a tap on a day, a tap on a row of another day, the arrows, Current Event, and the arrow keys with Enter work as before;
- `read_console_messages` with `onlyErrors: true` shows nothing.

---

### Task 5: Merge and release (controller, asks first)

- [x] **Step 1: Merge**

Use superpowers:finishing-a-development-branch. Ask the user one question about how to merge `redraws` into `main`.

- [x] **Step 2: Release, only with a fresh yes**

Ask before pushing `main`; the push redeploys crewluve.crewlu.net. After the "Deploy to GitHub Pages" run succeeds, check the live site:
- the live page's files match the local build;
- https://crewluve.crewlu.net/?demo=1&scene=flying#schedule ticks and takes taps as before;
- `read_console_messages` with `onlyErrors: true` shows nothing, and the demo makes no requests beyond the page's own files.

- [x] **Step 3: Update the memory**

Update the project memory with the new tip and what's next: fixes from the user's Safari check once they've tried their iPhone and iPad, then the roadmap.

---

## Done when

- `npx vitest run`, `npx tsc --noEmit` and `npm run build` are all green, with 2163 tests in 95 files from this plan's blocks, and 2167 after the review.
- The calendar draws again only as the minute turns or when what it shows changes, and of the rows only the happening and the next each second, with nothing on screen changed (Tasks 1–3, 4).
- It's live on crewluve.crewlu.net, released with the user's yes (Task 5).

## Spec coverage

| Spec section | Tasks |
|---|---|
| §4.1 The helper | 1 |
| §4.2 The calendar | 2 |
| §4.3 The rows | 3 |
| §4.4 Unchanged | 2, 3 (every existing test), 4 |
| §5 Testing | every task, then 4 |

## Execution notes

**Build, 2026-10-13**
- Tasks 1–3 were built on `redraws` in the main folder from this plan's own blocks (`scratchpad/rd/drive.py`), test first.
  - Each Step 2 failed and each Step 4 passed as printed.
  - All 7 files came out identical to the scratch copy: `798ea5d`..`80023b1`, 2163 tests in 95 files.
- **Task 4, the browser check,** on the branch's build at 402 × 874 and 1180 × 820: the clocks ticked; a tap on a day, a tap on a row, the arrows, Current Event and the arrow keys with Enter worked; there were no console errors. The date passed midnight during the check, and Current Event went to the new today.

**Review**
- **One code-quality review of the whole branch,** with its own frozen copy at `80023b1`: matches the spec; ready to merge with fixes.
  - It found the code correct. It compared a long-lived view with fresh draws at 55 moments around every leg's start and end, at midnight and at 20:00, with no mismatches. It timed a tick on the Schedule page at 0.16–0.22 ms, down from 0.73–1.16 ms.
  - Important: no test caught the calendar's handlers going stale. Frozen at the first draw, all 2163 tests passed, though Current Event after midnight would select yesterday.
  - Minor: no test of rows drawing again with new data; the wrapper had no name of its own; a comment for the ref set as the page draws.

**Changes after the review** (spec decision 5)
- `169fe9c`: tests that Current Event after midnight selects the new day, that a tap on a day takes the list by data that arrived after the first draw, and that a row draws again when new data changes its leg.
- `181b964`: the wrapper is named after what it holds, and its comment says it passes no ref on; `ScheduleView` says why setting the ref as it draws is safe.
- **Checks:** deliberate breaks caught 16 of 16, the review's frozen handlers among them. The suite is 2167 tests in 95 files.

**Merge and release (Task 5), 2026-10-13**
- **Merge:** the user chose "Merge into main locally". `main` fast-forwarded to `46495f0`, and the branch is deleted. On the merged `main`: 2167 tests in 95 files; tsc and build clean. The build makes `index-IAymGmrn.js`, 0.29 kB gzipped more than before.
- **Release:** with the user's separate yes, main was pushed (`e198fd8..46495f0`). The "Deploy to GitHub Pages" run 38345871809 succeeded, with no annotations.
- **The live check:** the live page and its files are byte for byte the local build. On https://crewluve.crewlu.net/?demo=1&scene=flying#schedule at 402 × 874, the happening row's clock ticked and a tap on a day selected it. There were no console errors, and the demo asked only for the page, `airports.json`, and its script and styles.
