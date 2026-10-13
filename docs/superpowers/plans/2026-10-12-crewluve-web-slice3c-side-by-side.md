# Crewluve Web Slice 3C: the Status and the Schedule Side by Side Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On iPads and computers, windows at least 744 px wide and 500 px tall, the status on the left and the schedule on the right under one bar titled "Where's {Name}?", as the Crewluve app's iPad lays them out. Phones and smaller windows keep today's two pages.

**Architecture:**
- `useSideBySide` watches the window's size with one media query.
- The Schedule page's calendar and list move into `ScheduleView`, unchanged, so the page and the new layout share them.
- `useSchedulePage` learns the layout, and leaves focus and the scroll alone when both pages show.
- `StatusScreen` draws the side-by-side layout when it's given the schedule's view, keeping its popups over all of it; `split.css` styles it.
- `PilotPages` picks the layout.

**Tech Stack:** Vite 5.4, TypeScript 5.9 (strict), Preact 10, Vitest 3 with happy-dom and @testing-library/preact.

**Spec:** `docs/superpowers/specs/2026-10-12-crewluve-web-slice3c-side-by-side-design.md`

---

## Execution notes

**Setup and gates**
- **Branch:** work on `slice3c` in the main project folder. Run `git switch -c slice3c` from `main`. Don't use git worktrees; auto mode blocked a worktree builder during slice 1.
- **Working directory:** run every command from the project root, `~/Dev/Crewluve Website`. Quote it in shells, since it has a space.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass before every commit that touches code.
  - The suite is 2121 tests in 91 files before this plan, and 2154 tests in 93 files after it.
  - The read-only scan (`tests/data/readOnly.test.ts`) adds one test for each new file in `src/`, so the totals grow a little faster than the task counts below.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Nothing to install:** no task adds a package or regenerates a file.

**How the printed code was checked**
- **Built and replayed:** every code block below was built and run in a scratch copy of the project before this plan was written, and all three gates passed there. A script then applied this plan's changes, step by step, to a fresh copy of `main`. Each Step 2 failed, each Step 4 passed with its count, and every file came out identical to the scratch copy's.
- **Deliberate breaks:** 32 of 32 were caught by the new tests.
  - Planning them showed one gap, now closed. `useSchedulePage`'s new argument first had a default that nothing used, so changing the default went unnoticed. The argument is now required: Task 3 passes `false` from `PilotPages`, its one caller, until Task 6 passes the real answer.
- **In the browser:** the scratch copy's production build ran in the browser pane at 1180 × 820, 744 × 1133 and 402 × 874 in dark, and at 1920 × 1080 in light.
  - One bug turned up, fixed before this plan was printed. The status column is a box of fixed height, and in it the in-flight card shrank to a sliver of its map: a flex item that clips what it holds shrinks to fit, where the phone's page lets the window grow instead. The column's cards now keep their heights (Task 5).
  - The rest worked as the spec says: the columns 320 and 424 px wide at 744 × 1133, 472 and 708 px at 1180 × 820, and 550 and 826 px, centered, at 1920 × 1080; one column at 743 px wide and at 499 px tall; resizing across the line both ways; Tab from the title to the status column's box, with Page Down scrolling it; the tracking and sun popups over the whole window, the page inert behind them, and focus back on their buttons as they close; `#schedule` on a wide window showing the same layout; and no console errors.
- **The browser pane** can hand back the previous frame right after a page changes, so take a small throwaway screenshot first, then the real one.
- **happy-dom** reports a media query's first change only from not matching, where a browser reports any change. So the tests that resize the window start on the narrow side of the line; the `setWindowSize` fixture says so.
- **happy-dom's window is 1024 × 768,** which is wide enough for the new layout. The pages' tests set a phone's window first (Task 6); `Root`'s tests pass either way.

**Network and other repos**
- **No new requests.** Nothing in this plan adds requests, storage or scripts. Tests never use the network; `tests/setup/noNetwork.ts` blocks it.
- **Security:** the layout uses classes only. The built page's content security policy blocks `style` attributes written in markup and `<style>` elements; sizes set from code go through the CSSOM, which it allows.
- **Read-only site:** nothing in this plan talks to CrewLu Cloud.
- **The Crewluve app (`~/Dev/Crewluv`) is reference only.** Read it; never change it.

**Reviews and changes**
- **One batch:** after Task 6, a spec review and a code-quality review of the whole branch, each with its own frozen copy.
- **Tasks 7–8 are for the controller, working with the user:** the look check, then merge and release.
- **If the code has to differ from a printed block, write it down.** Note it under "Execution notes" at the end of this file, and update the spec's §10 decisions log if a decision changed.

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/ui/hooks/useSideBySide.ts` | create | Whether the window is at least 744 × 500, following it as it's resized |
| `tests/fixtures/ui.ts` | modify | `setWindowSize`, to size happy-dom's window in tests |
| `src/ui/ScheduleView.tsx` | create, moved from `SchedulePage.tsx` | The calendar and the list with all of 3B's scrolling, under the page's bar or beside the status |
| `src/ui/SchedulePage.tsx` | modify, written anew | The page: its bar, the title that takes focus, and the view |
| `src/ui/hooks/useSchedulePage.ts` | modify | Follows the address without moving focus or the scroll when both pages show |
| `src/ui/StatusScreen.tsx` | modify | The side-by-side layout, when it's given the schedule's view |
| `src/styles/split.css`, `src/main.tsx` | create, modify | The layout's styles, imported |
| `src/ui/PilotPages.tsx` | modify | Picks the layout by the window's size |
| Tests | create and modify | Two new test files, and additions to four more |

---

### Task 1: The window-size check

**Files:**
- Create: `src/ui/hooks/useSideBySide.ts`
- Test: `tests/fixtures/ui.ts`, `tests/ui/useSideBySide.test.tsx`

- [x] **Step 1: Write the failing tests**

In `tests/fixtures/ui.ts`, add a way to size happy-dom's window, at the end of the file:

```ts
/**
 * Sets happy-dom's window to `width` × `height` CSS px, as a resized window or a turned tablet would be, and sends the
 * resize that media queries follow. happy-dom starts at 1024 × 768, which is wide enough for the side-by-side layout
 * (slice 3C §3). Wrap it in act() while something on the page follows the window.
 *
 * happy-dom reports a media query's first change only from not matching, where a browser reports any change. So a test
 * that resizes across a line starts on the narrow, or short, side of it.
 */
export function setWindowSize(width: number, height: number) {
  ;(window as unknown as { happyDOM: { setViewport(size: { width: number; height: number }): void } }).happyDOM.setViewport({ width, height })
}
```

Then create `tests/ui/useSideBySide.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SIDE_BY_SIDE, useSideBySide } from '../../src/ui/hooks/useSideBySide'
import { setWindowSize } from '../fixtures/ui'

/** Shows which layout the hook picks. */
function Layout() {
  return <p>{useSideBySide() ? 'side by side' : 'one column'}</p>
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  setWindowSize(1024, 768)
})

describe('useSideBySide (slice 3C §3)', () => {
  it('asks for a window at least 744 px wide, an iPad mini held upright, and 500 px tall', () => {
    expect(SIDE_BY_SIDE).toBe('(min-width: 744px) and (min-height: 500px)')
  })

  it.each([
    ['an iPad mini held upright', 744, 1133, 'side by side'],
    ['an iPad on its side', 1180, 820, 'side by side'],
    ['a computer', 1920, 1080, 'side by side'],
    ['one side of an iPad’s split screen', 743, 1133, 'one column'],
    ['a phone', 402, 874, 'one column'],
    ['a phone on its side', 874, 402, 'one column'],
    ['a short computer window', 1440, 499, 'one column'],
  ])('picks for %s, %i × %i px: %s', (_name, width, height, layout) => {
    setWindowSize(width, height)
    expect(render(<Layout />).container.textContent).toBe(layout)
  })

  it('follows the window as it is resized across the line, both ways', () => {
    setWindowSize(700, 820)
    const { container } = render(<Layout />)
    act(() => setWindowSize(820, 1180))
    expect(container.textContent).toBe('side by side')
    act(() => setWindowSize(700, 820))
    expect(container.textContent).toBe('one column')
  })

  it('keeps one column where the browser can’t say', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(render(<Layout />).container.textContent).toBe('one column')
  })

  it('stops following the window once it’s gone', () => {
    const removed = vi.spyOn(Object.getPrototypeOf(matchMedia(SIDE_BY_SIDE)), 'removeEventListener')
    render(<Layout />).unmount()
    expect(removed).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/useSideBySide.test.tsx`
Expected: FAIL with `Error: Failed to resolve import "../../src/ui/hooks/useSideBySide" from "tests/ui/useSideBySide.test.tsx"`; no tests run.

- [x] **Step 3: Implement**

Create `src/ui/hooks/useSideBySide.ts`:

```ts
import { useEffect, useState } from 'preact/hooks'

/**
 * The windows that show the status and the schedule side by side (slice 3C §3): at least 744 px wide, an iPad mini held
 * upright, and 500 px tall, so phones keep one column even on their side.
 */
export const SIDE_BY_SIDE = '(min-width: 744px) and (min-height: 500px)'

/** Whether the window is that big now: no where the browser can't say. */
const sideBySideNow = () => typeof matchMedia === 'function' && matchMedia(SIDE_BY_SIDE).matches

/** Whether the status and the schedule show side by side, following the window as it's resized (slice 3C §3, §5.2). */
export function useSideBySide(): boolean {
  const [sideBySide, setSideBySide] = useState(sideBySideNow)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const query = matchMedia(SIDE_BY_SIDE)
    const follow = () => setSideBySide(query.matches)
    query.addEventListener?.('change', follow)
    return () => query.removeEventListener?.('change', follow)
  }, [])
  return sideBySide
}
```

It follows changes as 3B's height check does (`ScheduleView`'s `TALL`), with `?.` because some tests stub `matchMedia` with plain objects.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/useSideBySide.test.tsx`
Expected: PASS, 11 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2133 tests in 92 files after this task.

```bash
git add tests/fixtures/ui.ts tests/ui/useSideBySide.test.tsx src/ui/hooks/useSideBySide.ts
git commit -m "useSideBySide: whether the status and the schedule show side by side, from the window's size (slice 3C §3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The schedule's view, out of the Schedule page

**Files:**
- Rename: `src/ui/SchedulePage.tsx` → `src/ui/ScheduleView.tsx`
- Modify: `src/ui/SchedulePage.tsx`
- Test: `tests/ui/ScheduleView.test.tsx`

- [x] **Step 1: Write the failing tests**

Create `tests/ui/ScheduleView.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { createRef, type RefObject } from 'preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Leg } from '../../src/engine/legs'
import { DAY } from '../../src/time/zoned'
import { ScheduleView } from '../../src/ui/ScheduleView'
import { testAirports } from '../fixtures/airports'
import { flight, H, pilot, place } from '../fixtures/legs'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const NY = 'America/New_York'
/** Midnight in New York on Thursday 15 Oct 2026, in the fixtures' hours; THU is that calendar day. */
const T0 = Date.UTC(2026, 9, 15, 4) / H
const THU = Date.UTC(2026, 9, 15) / DAY
const at = (hours: number) => (T0 + hours) * H
const LEGS: Leg[] = [
  flight('SDF', 'RFD', T0 + 6.25, T0 + 7.75, 'T1', { number: '2961' }), // Thursday 6:15am
  place('layover', 'RFD', T0 + 7.75, T0 + 30.25),
  flight('RFD', 'SDF', T0 + 30.25, T0 + 32, 'T1', { number: '2962' }), // Friday 6:15am, next at 10am Thursday
]

const view = (focusOnOpen?: RefObject<HTMLElement>) => (
  <ScheduleView legs={LEGS} pilot={pilot('LEX', 'SDF')} now={at(10)} timeZone={NY} h24={false} airports={testAirports} weekStart={0}
    focusOnOpen={focusOnOpen} />
)

describe('ScheduleView (slice 3C §6.1)', () => {
  it('is the Schedule page below its bar: the calendar, its hairline and the list’s box, in whatever holds it', () => {
    const { container } = render(<section class="column">{view()}</section>)
    expect([...container.querySelector('.column')!.children].map((el) => el.className)).toEqual(['calendar', 'calendar-rule', 'schedule-days'])
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
  })

  it('takes no focus as it opens beside the status, and still opens the list at the next leg’s day', () => {
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})
    // The list's box 60 px down, and Friday's day 700 px down in it.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const top = this.classList.contains('schedule-days') ? 60 : this.dataset.day === String(THU + 1) ? 700 : 0
      return { top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect
    })
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    render(view())
    expect(focus).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(document.body)
    expect(scrollTo).toHaveBeenCalledWith(0, 640)
  })

  it('focuses what it’s given before it scrolls, as the Schedule page does with its title', () => {
    const calls: string[] = []
    vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {
      calls.push('scroll')
    })
    const focus = HTMLElement.prototype.focus
    vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement, options?: FocusOptions) {
      calls.push('focus')
      focus.call(this, options)
    })
    const title = createRef<HTMLHeadingElement>()
    render(
      <main>
        <h1 ref={title} tabIndex={-1}>Schedule</h1>
        {view(title)}
      </main>,
    )
    expect(calls).toEqual(['focus', 'scroll'])
    expect(document.activeElement).toBe(title.current)
  })

  it('takes the body’s full height away while it shows, wherever it is, and gives it back', () => {
    const { unmount } = render(<section>{view()}</section>)
    expect(document.documentElement.classList.contains('schedule-open')).toBe(true)
    unmount()
    expect(document.documentElement.classList.contains('schedule-open')).toBe(false)
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/ScheduleView.test.tsx tests/ui/SchedulePage.test.tsx`
Expected: FAIL: `tests/ui/ScheduleView.test.tsx` can't load (`Failed to resolve import "../../src/ui/ScheduleView"`), while the Schedule page's 43 tests pass (`Test Files  1 failed | 1 passed (2)`, `Tests  43 passed (43)`).

- [x] **Step 3: Implement**

Move the page's file to the view's name, so its history follows the code that stays:

```bash
git mv src/ui/SchedulePage.tsx src/ui/ScheduleView.tsx
```

In `src/ui/ScheduleView.tsx`, take a ref's type, and leave the chevron to the page:

Replace this:

```tsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import { dayHeading, legTimes } from '../copy/schedule'
import type { AirportIndex } from '../data/airports'
import type { Leg } from '../engine/legs'
import type { Pilot } from '../engine/types'
import { calendarDay, MINUTE } from '../time/zoned'
import { firstWeekday, monthOf, scrollDay, type Month } from './calendarFacts'
import { Chevron } from './Chevron'
import { Icon } from './Icon'
```

with this:

```tsx
import type { RefObject } from 'preact'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import { dayHeading, legTimes } from '../copy/schedule'
import type { AirportIndex } from '../data/airports'
import type { Leg } from '../engine/legs'
import type { Pilot } from '../engine/types'
import { calendarDay, MINUTE } from '../time/zoned'
import { firstWeekday, monthOf, scrollDay, type Month } from './calendarFacts'
import { Icon } from './Icon'
```

The props lose the back button, and gain what takes focus as the view opens:

Replace this:

```tsx
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
  /** The week's first day, 0 = Sunday: the visitor's region's, unless a test gives one (slice 3B §5.8). */
  weekStart?: number
}
```

with this:

```tsx
export interface ScheduleViewProps {
  /** The legs to list, in start order (scheduleLegs). */
  legs: Leg[]
  pilot: Pilot
  now: number
  /** The visitor's zone: the days and times are theirs (slice 3A §4.3, §4.7). */
  timeZone: string
  h24: boolean
  airports: AirportIndex
  /** The week's first day, 0 = Sunday: the visitor's region's, unless a test gives one (slice 3B §5.8). */
  weekStart?: number
  /**
   * What takes focus as the view opens, before the list scrolls: the Schedule page's title, so screen readers announce
   * the page (3A §3.3). Beside the status, nothing does (3C §5.4).
   */
  focusOnOpen?: RefObject<HTMLElement>
}
```

The name and its comment:

Replace this:

```tsx
/**
 * The Schedule page (EventTimelineView, slice 3A §4, 3B §3): the window's height exactly, with a bar holding the back
 * button and the title, the month calendar pinned under it, then every leg by day in a box of its own that scrolls, as
 * the app's scroll view does. The days' headings stick at the top of the box, and the list opens at the next leg's day.
 * Today's heading is green, and the one stuck at the top yellow. Tapping a day or a row, or Current Event, scrolls the
 * list (3B §5).
 */
export function SchedulePage({ legs, pilot, now, timeZone, h24, airports, onBack, weekStart }: SchedulePageProps) {
```

with this:

```tsx
/**
 * The schedule below the Schedule page's bar (EventTimelineView, slice 3A §4, 3B §3): the month calendar pinned at the
 * top, then every leg by day in a box of its own that scrolls, as the app's scroll view does. The days' headings stick
 * at the top of the box, and the list opens at the next leg's day. Today's heading is green, and the one stuck at the
 * top yellow. Tapping a day or a row, or Current Event, scrolls the list (3B §5). It goes under the Schedule page's
 * bar, or beside the status on a wide window (3C §4.5).
 */
export function ScheduleView({ legs, pilot, now, timeZone, h24, airports, weekStart, focusOnOpen }: ScheduleViewProps) {
```

The title's ref goes with the page:

Replace this:

```tsx
  const kept = useRef<Place | null>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const list = useRef<HTMLDivElement>(null)
```

with this:

```tsx
  const kept = useRef<Place | null>(null)
  const list = useRef<HTMLDivElement>(null)
```

Focus goes to what the view was given, still before the scroll:

Replace this:

```tsx
  // The list appears already at its opening day, with that day's heading stuck, and focus goes to the title so screen
  // readers announce the page (3A §3.3, §4.11). Focus comes first: Safari before 15 ignores preventScroll and scrolls to
  // what takes focus. Only once: later renders leave the scroll where it is.
  useLayoutEffect(() => {
    const box = list.current!
    const day = openingDay(days, now, timeZone)
    const section = day == null ? null : box.querySelector<HTMLElement>(`[data-day="${day}"]`)
    title.current?.focus({ preventScroll: true })
```

with this:

```tsx
  // The list appears already at its opening day, with that day's heading stuck, and focus goes to what it was given,
  // the Schedule page's title, so screen readers announce the page (3A §3.3, §4.11). Focus comes first: Safari before
  // 15 ignores preventScroll and scrolls to what takes focus. Only once: later renders leave the scroll where it is.
  useLayoutEffect(() => {
    const box = list.current!
    const day = openingDay(days, now, timeZone)
    const section = day == null ? null : box.querySelector<HTMLElement>(`[data-day="${day}"]`)
    focusOnOpen?.current?.focus({ preventScroll: true })
```

The body's full height, now for both places the view goes:

Replace this:

```tsx
  // While the page shows, the body gives up its full height: Safari before 15.4 has no dvh, and its 100vh, taller than
  // the window with the toolbar showing, would leave the window something to scroll (3B §3.1).
```

with this:

```tsx
  // While the view shows, on the Schedule page or beside the status, the body gives up its full height: Safari
  // before 15.4 has no dvh, and its 100vh, taller than the window with the toolbar showing, would leave the window
  // something to scroll (3B §3.1, 3C §6.1).
```

And the view gives back its parts, without the page around them:

Replace this:

```tsx
  return (
    <main class="schedule">
      <header class="schedule-bar">
        <button type="button" class="glass round schedule-back" aria-label="Back" onClick={onBack}>
          <Chevron direction="left" size={17} weight={2.2} />
        </button>
        <h1 class="schedule-title" ref={title} tabIndex={-1}>Schedule</h1>
      </header>
      {pinned && calendar}
```

with this:

```tsx
  return (
    <>
      {pinned && calendar}
```

and at the end:

Replace this:

```tsx
        </div>
      </div>
    </main>
  )
}
```

with this:

```tsx
        </div>
      </div>
    </>
  )
}
```

Everything else in the view stays as it was: the selected day and the month, the opening scroll, the stuck heading, the move below 500 px, and the taps.

Then write `src/ui/SchedulePage.tsx` anew, as its bar and the view:

```tsx
import { useRef } from 'preact/hooks'
import { Chevron } from './Chevron'
import { ScheduleView, type ScheduleViewProps } from './ScheduleView'

export interface SchedulePageProps extends Omit<ScheduleViewProps, 'focusOnOpen'> {
  onBack: () => void
}

/**
 * The Schedule page (EventTimelineView, slice 3A §4, 3B §3): the window's height exactly, with a bar holding the back
 * button and the title, and the schedule's view under it (3C §6.1). The title takes focus as the page opens, so screen
 * readers announce the page (3A §3.3).
 */
export function SchedulePage({ onBack, ...view }: SchedulePageProps) {
  const title = useRef<HTMLHeadingElement>(null)
  return (
    <main class="schedule">
      <header class="schedule-bar">
        <button type="button" class="glass round schedule-back" aria-label="Back" onClick={onBack}>
          <Chevron direction="left" size={17} weight={2.2} />
        </button>
        <h1 class="schedule-title" ref={title} tabIndex={-1}>Schedule</h1>
      </header>
      <ScheduleView {...view} focusOnOpen={title} />
    </main>
  )
}
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/ScheduleView.test.tsx tests/ui/SchedulePage.test.tsx`
Expected: PASS, 47 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2138 tests in 93 files after this task.

```bash
git add tests/ui/ScheduleView.test.tsx src/ui/ScheduleView.tsx src/ui/SchedulePage.tsx
git commit -m "ScheduleView: the Schedule page below its bar, moved out so the page and the side-by-side layout share it (slice 3C §6.1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The address, side by side

**Files:**
- Modify: `src/ui/hooks/useSchedulePage.ts`, `src/ui/PilotPages.tsx`
- Test: `tests/ui/useSchedulePage.test.tsx`

- [x] **Step 1: Write the failing test**

In `tests/ui/useSchedulePage.test.tsx`, let the test's pages say whether the window is wide:

Replace this:

```tsx
/** The two pages, reduced to what the hook moves between: the status page's title and one link, the schedule's back button. */
function Pages() {
  const page = useSchedulePage()
```

with this:

```tsx
/**
 * The two pages, reduced to what the hook moves between: the status page's title and one link, the schedule's back
 * button. `sideBySide` says the window is wide enough to show both at once (slice 3C §3).
 */
function Pages({ sideBySide = false }: { sideBySide?: boolean }) {
  const page = useSchedulePage(sideBySide)
```

and add this block at the end:

```tsx
describe('useSchedulePage on a wide window (slice 3C §5.1)', () => {
  it('follows Back and Forward, but moves neither focus nor the window’s scroll, since nothing on screen changes', async () => {
    render(<Pages sideBySide />)
    window.scrollTo(0, 300)
    location.hash = '#schedule'
    await settle()
    expect(onSchedule()).toBe(true)
    window.scrollTo(0, 50)
    history.back()
    await settle()
    expect(onSchedule()).toBe(false)
    expect(document.activeElement).toBe(document.body)
    expect(window.scrollY).toBe(50)
    history.forward()
    await settle()
    expect(onSchedule()).toBe(true)
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/useSchedulePage.test.tsx`
Expected: FAIL in 1 test (`1 failed | 11 passed (12)`): focus goes back to the status page's title, `expected <h1 tabindex="-1" class="title"></h1> to be <body>…`.

- [x] **Step 3: Implement**

In `src/ui/hooks/useSchedulePage.ts`, take the layout:

Replace this:

```ts
 * - The status page comes back where it was scrolled, with focus on the link that opened the schedule, or on the
 *   page's title when that link has gone.
 */
export function useSchedulePage() {
```

with this:

```ts
 * - The status page comes back where it was scrolled, with focus on the link that opened the schedule, or on the
 *   page's title when that link has gone.
 * - On a wide window, where the status and the schedule show side by side, it follows the address the same way, but
 *   moves neither focus nor the window's scroll: nothing on screen changes (slice 3C §5.1).
 */
export function useSchedulePage(sideBySide: boolean) {
```

and leave focus and the scroll alone when both pages show:

Replace this:

```ts
  // Runs once the status page is back on screen, before it's painted. Focus comes first: Safari before 15 ignores
  // preventScroll and scrolls to what takes focus, and the scroll after it puts the page back.
  useLayoutEffect(() => {
    if (wasOpen.current && !open) {
```

with this:

```ts
  // Runs once the status page is back on screen, before it's painted. Focus comes first: Safari before 15 ignores
  // preventScroll and scrolls to what takes focus, and the scroll after it puts the page back. Side by side, the status
  // page never left.
  useLayoutEffect(() => {
    if (wasOpen.current && !open && !sideBySide) {
```

In `src/ui/PilotPages.tsx`, the hook's one caller, keep one column until Task 6 picks the layout:

Replace this:

```tsx
  const page = useSchedulePage()
```

with this:

```tsx
  const page = useSchedulePage(false)
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/useSchedulePage.test.tsx`
Expected: PASS, 12 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2139 tests in 93 files after this task.

```bash
git add tests/ui/useSchedulePage.test.tsx src/ui/hooks/useSchedulePage.ts src/ui/PilotPages.tsx
git commit -m "useSchedulePage: on a wide window, follows Back and Forward without moving focus or the window's scroll (slice 3C §5.1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The status page beside the schedule

**Files:**
- Modify: `src/ui/StatusScreen.tsx`
- Test: `tests/ui/StatusScreen.test.tsx`

- [x] **Step 1: Write the failing tests**

In `tests/ui/StatusScreen.test.tsx`, add this block at the end:

```tsx
describe('StatusScreen beside the schedule (slice 3C §4, §5)', () => {
  const sideBySide = (minutes: number, snap: Snapshot = makeSnapshot(e.schedule, e.legs, at(minutes), NY)) => {
    const now = at(minutes)
    return (
      <StatusScreen snap={snap} now={now} viewerTz={NY} homeTz={NY} h24={false} airports={testAirports} weather={null} demo celebrateKey={0}
        footer={footer(now)} beside={<p class="beside">The schedule</p>} />
    )
  }
  const reduceMotion = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
  const openTracking = () => fireEvent.click(screen.getByRole('button', { name: 'UPS2961. Opens flight tracking.' }))

  it('puts the title in a bar across the top, the cards in a scrolling region of their own, and the schedule beside them', () => {
    const { container } = render(sideBySide(100))
    expect(container.querySelectorAll('main').length).toBe(1)
    const main = container.querySelector('main')!
    expect(main.className).toBe('split')
    expect([...main.children].map((el) => `${el.tagName} ${el.className}`)).toEqual(['HEADER split-bar', 'SECTION split-status', 'SECTION split-schedule'])
    expect(screen.getByRole('heading', { level: 1, name: "Where's Alex?" }).parentElement!.className).toBe('split-bar')
    // The cards' column takes Tab focus, so the keys scroll it, as the list's box does (3B §3.4).
    const status = screen.getByRole('region', { name: 'Status' })
    expect(status.tabIndex).toBe(0)
    expect(status.firstElementChild!.className).toBe('glass demo-banner')
    expect(status.querySelector('.countdown')).not.toBeNull()
    expect(status.lastElementChild!.className).toBe('footer')
    // The schedule's region is named by a heading only screen readers see, so heading navigation reaches it.
    const schedule = screen.getByRole('region', { name: 'Schedule' })
    expect([...schedule.children].map((el) => el.outerHTML)).toEqual([
      '<h2 id="split-schedule-heading" class="sr-only">Schedule</h2>',
      '<p class="beside">The schedule</p>',
    ])
  })

  it('adds no <style> elements, which the site’s content security policy would block', () => {
    const before = document.querySelectorAll('style').length
    render(sideBySide(100))
    expect(document.querySelectorAll('style').length).toBe(before)
  })

  it('hides the bar and both columns behind a popup, and gives them back once it has closed', () => {
    reduceMotion()
    const { container } = render(sideBySide(100))
    const main = container.querySelector('main')!
    openTracking()
    expect(main.contains(screen.getByRole('dialog', { name: 'UPS2961' }))).toBe(false)
    expect([main.getAttribute('aria-hidden'), main.hasAttribute('inert')]).toEqual(['true', true])
    // The one main holds the bar and both columns, so all three are hidden with it.
    expect([...main.children].map((el) => el.className)).toEqual(['split-bar', 'split-status', 'split-schedule'])
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect([main.getAttribute('aria-hidden'), main.hasAttribute('inert')]).toEqual([null, false])
  })

  it('sends focus to the title in the bar when a popup closes by itself and no card has the location card’s place', async () => {
    // The sentence can't tell what a flight without its leg is doing: it says "On duty", and logs that once.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const snap = makeSnapshot(e.schedule, e.legs, at(100), NY)
    const { rerender } = render(sideBySide(100, snap))
    openTracking()
    // Still in the air, so no location card, but with no leg to draw the in-flight card from.
    rerender(sideBySide(100, { ...snap, status: { ...snap.status, current: null } }))
    await act(() => {})
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: "Where's Alex?" }))
    expect(document.activeElement!.parentElement!.className).toBe('split-bar')
    error.mockRestore()
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/StatusScreen.test.tsx`
Expected: FAIL in 3 tests (`3 failed | 80 passed (83)`): the page ignores `beside` and keeps its one column, `expected 'screen' to be 'split'`. The `<style>` test passes already; it guards the new layout.

- [x] **Step 3: Implement**

In `src/ui/StatusScreen.tsx`, import the children's type:

```tsx
import type { ComponentChildren } from 'preact'
```

add the prop after `onOpenSchedule`:

```tsx
  /**
   * The schedule's view, to show beside the cards on a wide window (slice 3C §4). The title then goes in a bar across
   * both, and the cards in a column of their own.
   */
  beside?: ComponentChildren
```

say what it does at the end of the component's comment:

```tsx
 *
 * Given the schedule's view, it lays the page out as the app's iPad does (slice 3C §4): the title in a bar across the
 * top, the cards in a column of their own, and the view beside them, all in the one <main> a popup hides (§5.3).
```

and draw the layout:

Replace this:

```tsx
  return (
    <>
      <main class="screen" aria-hidden={hidden ? 'true' : undefined} inert={hidden || undefined}>
        <Title text={titleFor(snap.hasName ? snap.name : null)} headingRef={titleHeading} />
        {p.demo && <DemoBanner />}
        <NarrativeCard spans={spans} visual={statusVisual(snap)} ring={snap.ring} />
        {home ? <HomeCards {...p} /> : <AwayCard {...p} />}
        {p.onOpenSchedule && !cardLeadsThere && <ViewScheduleLink onOpen={p.onOpenSchedule} />}
        {facts && (
          <LocationCard
            airport={airport}
            facts={facts}
            now={p.now}
            homeTz={p.homeTz}
            h24={p.h24}
            weather={p.weather}
            headingRef={locationHeading}
            onOpenSun={sun.show}
          />
        )}
        {flying && (
          <InFlightCard facts={flying} now={p.now} h24={p.h24} headingRef={inFlightHeading} onOpenTracking={tracking.show} />
        )}
        {snap.upcomingTrip && (
          <UpcomingTripCard trip={snap.upcomingTrip} now={p.now} timeZone={p.homeTz} h24={p.h24} airports={p.airports}
            link={linkTo('trip', p.onOpenSchedule)} />
        )}
        {snap.tripProgress && <TripProgressCard progress={snap.tripProgress} airports={p.airports} />}
        <Footer {...p.footer} />
      </main>
```

with this:

```tsx
  const title = <Title text={titleFor(snap.hasName ? snap.name : null)} headingRef={titleHeading} />
  const cards = (
    <>
      {p.demo && <DemoBanner />}
      <NarrativeCard spans={spans} visual={statusVisual(snap)} ring={snap.ring} />
      {home ? <HomeCards {...p} /> : <AwayCard {...p} />}
      {p.onOpenSchedule && !cardLeadsThere && <ViewScheduleLink onOpen={p.onOpenSchedule} />}
      {facts && (
        <LocationCard
          airport={airport}
          facts={facts}
          now={p.now}
          homeTz={p.homeTz}
          h24={p.h24}
          weather={p.weather}
          headingRef={locationHeading}
          onOpenSun={sun.show}
        />
      )}
      {flying && (
        <InFlightCard facts={flying} now={p.now} h24={p.h24} headingRef={inFlightHeading} onOpenTracking={tracking.show} />
      )}
      {snap.upcomingTrip && (
        <UpcomingTripCard trip={snap.upcomingTrip} now={p.now} timeZone={p.homeTz} h24={p.h24} airports={p.airports}
          link={linkTo('trip', p.onOpenSchedule)} />
      )}
      {snap.tripProgress && <TripProgressCard progress={snap.tripProgress} airports={p.airports} />}
      <Footer {...p.footer} />
    </>
  )
  const ariaHidden = hidden ? 'true' : undefined
  const inert = hidden || undefined
  return (
    <>
      {p.beside ? (
        <main class="split" aria-hidden={ariaHidden} inert={inert}>
          <header class="split-bar">{title}</header>
          {/* The cards' own scrolling box, which keyboards reach to scroll it, as the list's box (3C §5.4). */}
          <section class="split-status" aria-label="Status" tabIndex={0}>
            {cards}
          </section>
          <section class="split-schedule" aria-labelledby="split-schedule-heading">
            <h2 id="split-schedule-heading" class="sr-only">Schedule</h2>
            {p.beside}
          </section>
        </main>
      ) : (
        <main class="screen" aria-hidden={ariaHidden} inert={inert}>
          {title}
          {cards}
        </main>
      )}
```

The cards are the same in both layouts, in the same order. The one `<main>` holds the bar and both columns, so the popups, which come after it, hide all of it as they open, and focus that falls back to the title finds it in the bar.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/StatusScreen.test.tsx`
Expected: PASS, 83 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2143 tests in 93 files after this task.

```bash
git add tests/ui/StatusScreen.test.tsx src/ui/StatusScreen.tsx
git commit -m "StatusScreen: given the schedule's view, the side-by-side layout: the title in a bar, the cards in a column, the view beside them, all hidden behind a popup (slice 3C §4, §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The layout's styles

**Files:**
- Create: `src/styles/split.css`
- Modify: `src/main.tsx`
- Test: `tests/styles/styles.test.ts`

- [x] **Step 1: Write the failing tests**

In `tests/styles/styles.test.ts`, add this block at the end:

```ts
describe('split.css', () => {
  // Read when each test runs, so a missing file fails the tests below and not the whole file.
  const rule = (head: string) => declarations(find(rulesIn(css('split')), head)!.body)

  it('fills the window as the Schedule page does, the status 40% wide but never under 320 px, up to 1376 px (slice 3C §4.1)', () => {
    expect(rule('.split')).toEqual([
      ['position', 'fixed'], ['top', '0'], ['right', '0'], ['bottom', '0'], ['left', '0'], ['max-width', '1376px'], ['margin', '0 auto'],
      ['display', 'grid'], ['grid-template-columns', 'max(320px, 40%) minmax(0, 1fr)'], ['grid-template-rows', '60px minmax(0, 1fr)'],
    ])
  })

  it('centers the title in a 60 px bar across both columns, on the page’s plain color (§4.2)', () => {
    expect(rule('.split-bar')).toEqual([
      ['grid-column', '1 / -1'], ['display', 'flex'], ['align-items', 'center'], ['justify-content', 'center'], ['padding', '0 16px'],
    ])
    expect(rule('.split-bar .title')).toEqual([['margin', '0']])
  })

  it('scrolls the status in a box of its own, spaced as the status page’s column, with its focus ring inside (§4.3)', () => {
    expect(rule('.split-status')).toEqual([
      ['min-height', '0'], ['overflow-x', 'hidden'], ['overflow-y', 'auto'], ['overscroll-behavior', 'contain'],
      ['padding', '12px 16px calc(16px + env(safe-area-inset-bottom))'], ['display', 'flex'], ['flex-direction', 'column'], ['gap', '24px'],
    ])
    expect(declarations(find(rulesIn(css('base')), '.screen')!.body)).toEqual(expect.arrayContaining([
      ['padding', '12px 16px calc(16px + env(safe-area-inset-bottom))'], ['gap', '24px'],
    ]))
    // The cards keep their heights: the in-flight card, which clips its map, shrank to fit the box in the browser.
    expect(rule('.split-status > *')).toEqual([['flex-shrink', '0']])
    expect(rule('.split-status:focus-visible')).toEqual([['outline-offset', '-2px']])
  })

  it('puts the schedule after a 0.5 px hairline in iOS’s separator color, with the Schedule page’s 16 px sides (§4.4, §4.5)', () => {
    expect(rule('.split-schedule')).toEqual([
      ['min-width', '0'], ['min-height', '0'], ['padding', '0 16px'], ['border-left', '0.5px solid var(--separator)'],
      ['display', 'flex'], ['flex-direction', 'column'],
    ])
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/styles/styles.test.ts`
Expected: FAIL in 4 tests (`4 failed | 180 passed (184)`) with `ENOENT: no such file or directory, open '…/src/styles/split.css'`.

- [x] **Step 3: Implement**

Create `src/styles/split.css`:

```css
/* The status and the schedule side by side on a wide window (slice 3C §4), as the app's iPad lays them out: one bar
   across the top with the title, the status in a column of its own, a hairline, then the schedule. */

/* Fixed to the window's edges, so the window itself never scrolls; each column scrolls on its own, as the app's two
   scroll views do. The status takes 40% of the width, never less than the narrowest phone's 320 px, and the schedule
   the rest. Past 1376 px, a 13-inch iPad on its side, the layout stops growing and sits in the middle (§4.1). */
.split {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  max-width: 1376px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: max(320px, 40%) minmax(0, 1fr);
  grid-template-rows: 60px minmax(0, 1fr);
}

/* The bar: the page's title in the middle, across both columns, on the page's plain color, as the Schedule page's bar
   (§4.2). The title keeps its 22 px bold, the app's iPad title. */
.split-bar {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
}

.split-bar .title {
  margin: 0;
}

/* The status: the phone's column, spaced as .screen, in a box of its own that scrolls, and doesn't hand its scroll on
   to the window or scroll sideways (§4.3). */
.split-status {
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px 16px calc(16px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Its cards keep their own heights. In a box of fixed height, a flex item that clips what it holds, as the in-flight
   card clips its map, would otherwise shrink to fit, where the phone's page lets the window grow instead. */
.split-status > * {
  flex-shrink: 0;
}

/* Its focus ring inside its edges, which the bar and the hairline would otherwise cover. */
.split-status:focus-visible {
  outline-offset: -2px;
}

/* The schedule: the Schedule page below its bar, with the same 16 px sides for its list's box to span, after the app's
   Divider, a 0.5 px hairline in iOS's separator color (§4.4, §4.5). */
.split-schedule {
  min-width: 0;
  min-height: 0;
  padding: 0 16px;
  border-left: 0.5px solid var(--separator);
  display: flex;
  flex-direction: column;
}
```

and import it in `src/main.tsx`, after the calendar's:

```tsx
import './styles/split.css'
```

`max(320px, 40%)` gives the status column 40% of the width, and never less than 320 px; `minmax(0, 1fr)` lets the schedule take the rest without its content widening it.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/styles/styles.test.ts`
Expected: PASS, 184 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2147 tests in 93 files after this task.

```bash
git add tests/styles/styles.test.ts src/styles/split.css src/main.tsx
git commit -m "split.css: the bar, the status column, the hairline and the schedule column, side by side on a wide window (slice 3C §4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The pages pick the layout

**Files:**
- Modify: `src/ui/PilotPages.tsx`
- Test: `tests/ui/PilotPages.test.tsx`

- [x] **Step 1: Write the failing tests**

In `tests/ui/PilotPages.test.tsx`, import `within` and the scenes' type:

Replace this:

```tsx
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRawForScene } from '../../src/data/demo'
```

with this:

```tsx
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRawForScene, type DemoScene } from '../../src/data/demo'
```

give every test a phone's window unless it says otherwise, since happy-dom's own is wide:

Replace this:

```tsx
import { stubAnimationFrames } from '../fixtures/ui'

const NOW = Date.UTC(2026, 9, 20, 16)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(NOW)
})
```

with this:

```tsx
import { setWindowSize, stubAnimationFrames } from '../fixtures/ui'

const NOW = Date.UTC(2026, 9, 20, 16)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(NOW)
  // A phone's window, for the one-column pages, unless a test makes it wider (slice 3C §3).
  setWindowSize(402, 874)
})
```

and add this block at the end:

```tsx
describe('PilotPages side by side (slice 3C)', () => {
  /** Lets the browser's history events arrive: happy-dom sends popstate a moment after history.back(). */
  const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)))
  const pages = (scene: DemoScene = 'flying') => (
    <PilotPages schedule={handle(demoRawForScene(scene, NOW))} airports={testAirports} demo onSignOut={() => {}} />
  )
  const layout = (container: Element) => container.querySelector('main')!.className
  beforeEach(() => {
    history.replaceState(null, '', '/')
    setWindowSize(1180, 820)
  })
  afterEach(() => history.replaceState(null, '', '/'))

  it('shows the status and the schedule side by side on a wide window, under one bar with the title (§4)', () => {
    const raw = demoRawForScene('flying', NOW)
    const { container } = render(<PilotPages schedule={handle(raw)} airports={testAirports} demo onSignOut={() => {}} />)
    expect(layout(container)).toBe('split')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Where's Alex?")
    expect(screen.getByRole('region', { name: 'Status' }).querySelector('.countdown')).not.toBeNull()
    const schedule = screen.getByRole('region', { name: 'Schedule' })
    expect(schedule.querySelector('.calendar-title')!.textContent).toBe('October 2026')
    const legs = within(schedule).getByRole('region', { name: 'Legs' }).querySelectorAll('.leg')
    expect(legs.length).toBe(scheduleLegs(buildLegs(buildSchedule(raw, NOW))).length)
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
    // Nothing takes focus as it opens, as on the status page (§5.4).
    expect(document.activeElement).toBe(document.body)
  })

  it('has no way into the schedule beside it: no chevrons, and no View Schedule, at home or away (§4.3)', () => {
    for (const scene of ['home', 'nothing-ahead', 'flying'] as const) {
      const { container, unmount } = render(pages(scene))
      expect(container.querySelector('[data-schedule-link]')).toBeNull()
      unmount()
    }
  })

  it('shows the same at the schedule’s own address (§5.1)', () => {
    history.replaceState(null, '', '/#schedule')
    const { container } = render(pages())
    expect(layout(container)).toBe('split')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Where's Alex?")
  })

  it('changes nothing on screen as Back and Forward move between the two addresses (§5.1)', async () => {
    const { container } = render(pages())
    const main = container.querySelector('main')!
    location.hash = '#schedule'
    await settle()
    history.back()
    await settle()
    history.forward()
    await settle()
    expect(container.querySelector('main')).toBe(main)
    expect(layout(container)).toBe('split')
    expect(document.activeElement).toBe(document.body)
  })

  it('switches layouts as the window crosses the line, opening the schedule again at this month each time (§5.2)', () => {
    // From the narrow side: happy-dom reports a media query's first change only from not matching.
    setWindowSize(402, 874)
    const { container } = render(pages())
    expect(layout(container)).toBe('screen')
    act(() => setWindowSize(1180, 820))
    expect(layout(container)).toBe('split')
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(container.querySelector('.calendar-title')!.textContent).toBe('November 2026')
    act(() => setWindowSize(402, 874))
    expect(layout(container)).toBe('screen')
    expect(container.querySelector('.calendar')).toBeNull()
    act(() => setWindowSize(1180, 820))
    expect(container.querySelector('.calendar-title')!.textContent).toBe('October 2026')
  })

  it('opens the Schedule page, with focus on its title, as the window narrows at the schedule’s address (§5.2)', () => {
    history.replaceState(null, '', '/#schedule')
    setWindowSize(402, 874)
    render(pages())
    act(() => setWindowSize(1180, 820))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Where's Alex?")
    act(() => setWindowSize(402, 874))
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Schedule' }))
  })

  it('keeps the screens it always has while there’s nothing to show (§2)', () => {
    render(<PilotPages schedule={handle(null)} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CrewLuve')
    cleanup()
    const { container } = render(<PilotPages schedule={handle(new RawBuilder(NOW).build())} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(screen.getByText('No schedule in CrewLu Cloud yet')).toBeTruthy()
    expect(layout(container)).toBe('screen')
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/PilotPages.test.tsx`
Expected: FAIL in 6 tests (`6 failed | 17 passed (23)`): the pages ignore the window's size, `expected 'screen' to be 'split'`, and the Schedule page opens at its address, `expected 'schedule' to be 'split'`. The empty-screen test passes already.

- [x] **Step 3: Implement**

In `src/ui/PilotPages.tsx`, import the hook and the view:

```tsx
import { useSideBySide } from './hooks/useSideBySide'
```

```tsx
import { ScheduleView } from './ScheduleView'
```

say what the pages show now:

Replace this:

```tsx
 * Rebuilds the schedule when new rows arrive, and the snapshot every second. Shows the status page, or the Schedule
 * page when the address ends in #schedule (slice 3A §3.3); while there's nothing to show, the same screen as ever.
 */
```

with this:

```tsx
 * Rebuilds the schedule when new rows arrive, and the snapshot every second. Shows the status page, or the Schedule
 * page when the address ends in #schedule (slice 3A §3.3). On a wide window it shows both side by side, whatever the
 * address (3C §3, §5.1). While there's nothing to show, the same screen as ever, at every width.
 */
```

ask the window, and tell the address hook:

Replace this:

```tsx
  // The page the address asks for, and the legs the Schedule page lists.
  const page = useSchedulePage(false)
```

with this:

```tsx
  // The page the address asks for, and the legs the Schedule page lists. A wide window shows both pages side by side
  // (slice 3C §3).
  const sideBySide = useSideBySide()
  const page = useSchedulePage(sideBySide)
```

and draw the layout it picks:

Replace this:

```tsx
  if (page.open) {
    return <SchedulePage legs={listed} pilot={snap.pilot} now={now} timeZone={viewerTz} h24={h24} airports={airports} onBack={page.back} />
  }

  return (
    <StatusScreen snap={snap} now={now} viewerTz={viewerTz} homeTz={homeTz} h24={h24} airports={airports} weather={weather} demo={demo}
      celebrateKey={celebrateKey} footer={footer} onOpenSchedule={page.show} />
  )
}
```

with this:

```tsx
  const status = { snap, now, viewerTz, homeTz, h24, airports, weather, demo, celebrateKey, footer }
  // Side by side, the schedule sits beside the cards, and nothing on the status page opens it (3C §4.3).
  if (sideBySide) {
    const beside = <ScheduleView legs={listed} pilot={snap.pilot} now={now} timeZone={viewerTz} h24={h24} airports={airports} />
    return <StatusScreen {...status} beside={beside} />
  }

  if (page.open) {
    return <SchedulePage legs={listed} pilot={snap.pilot} now={now} timeZone={viewerTz} h24={h24} airports={airports} onBack={page.back} />
  }

  return <StatusScreen {...status} onOpenSchedule={page.show} />
}
```

On a wide window the status always shows, whatever the address, and without `onOpenSchedule` it has no chevrons and no View Schedule. Crossing the line rebuilds the pages: the view beside the status opens fresh, at this month and today.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/PilotPages.test.tsx`
Expected: PASS, 23 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 2154 tests in 93 files after this task.

```bash
git add tests/ui/PilotPages.test.tsx src/ui/PilotPages.tsx
git commit -m "PilotPages: the status and the schedule side by side on a wide window, whatever the address; one column otherwise, as before (slice 3C §3, §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Look check with the user (controller)

**Files:**
- Modify (only if nudges are needed): `src/styles/split.css`

- [x] **Step 1: Build and open the preview**

Run `npm run build`, then start or reuse the `crewluve-preview` server from `.claude/launch.json` (port 5181) in the browser pane.

- [x] **Step 2: Take the screenshots, in light and in dark**

Take a small throwaway screenshot first, then the real one. If a page was built again since it was last opened, add a new query word, such as `&v=2`, so the browser doesn't show the old one.

- `/?demo=1&scene=flying` at 1180 × 820, an iPad on its side; 820 × 1180, upright; 744 × 1133, an iPad mini upright; and 1440 × 900 and 1920 × 1080, computers, where the layout stops at 1376 px.
- The flight-tracking popup open over the layout.
- `/?demo=1&scene=delayed`, on the ground, with the location card and its dial, at 744 × 1133 too.

Then resize across the line both ways, with the browser pane showing: while it's hidden, the pane can hold back the media query's change. Tab through both columns, and scroll each column and the list's box with the keys.

- [x] **Step 3: Ask the user to sign off**

Put the screenshots side by side, next to the mockups the user approved while brainstorming, and ask one question: "Looks right (Recommended)" or "Change something". Apply their notes, then show them again.

- [x] **Step 4: Run the gates and commit any nudges**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/styles/split.css
git commit -m "Side by side: visual nudges from the look check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Merge and release (controller, asks first)

- [ ] **Step 1: Merge**

Use superpowers:finishing-a-development-branch. Ask the user one question about how to merge `slice3c` into `main`.

- [ ] **Step 2: Release, only with a fresh yes**

Ask before pushing `main`; the push redeploys crewluve.crewlu.net. After the "Deploy to GitHub Pages" run succeeds, check the live site:
- the live page's files match the local build;
- https://crewluve.crewlu.net/?demo=1&scene=flying at 1180 × 820 shows the status and the schedule side by side under one bar, and at 402 × 874 the status page alone, with its chevron;
- `read_console_messages` with `onlyErrors: true` shows nothing, and the demo makes no requests beyond the page's own files.

- [ ] **Step 3: Update the memory**

Update the project memory with the new tip and what's next: the items left from 3A and 3B, then the roadmap's web-only ideas.

---

## Done when

- `npx vitest run`, `npx tsc --noEmit` and `npm run build` are all green, with 2154 tests in 93 files from this plan's blocks, and 2156 after the reviews.
- On a window at least 744 px wide and 500 px tall, the status and the schedule show side by side under one bar, as on the app's iPad, and phones and smaller windows keep the two pages (Tasks 1–6).
- The user has signed off on the look (Task 7), and it's live on crewluve.crewlu.net, released with the user's yes (Task 8).

## Spec coverage

| Spec section | Tasks |
|---|---|
| §3 When it shows | 1, 6 |
| §4.1 The frame | 5 (the widths and the 1376 px limit), 2 (the body's height) |
| §4.2 The bar | 4, 5 |
| §4.3 The status column | 4, 5 (the cards keep their heights), 6 (no ways into the schedule) |
| §4.4 The hairline | 5 |
| §4.5 The schedule column | 2, 5, 6 |
| §5.1 The address | 3, 6 |
| §5.2 Crossing the line | 1, 6 |
| §5.3 Popups | 4 |
| §5.4 Keyboard and screen readers | 2 (no focus beside the status), 4 (the regions and the Tab stop), 5 (the focus ring) |
| §5.5 Data and timing | 6 (one clock and one schedule for both) |
| §6 How it's built | 1–6 |
| §7 Security and privacy | no new requests; classes only (4, 5) |
| §8 Deliberate differences | 1 (when it shows), 5 (320 px, 1376 px, plain cuts), 4 (the regions) |
| §9 Testing | every task, then 7 |

## Execution notes

**Build, 2026-10-12**
- Tasks 1–6 were built on `slice3c` in the main folder from this plan's own blocks (`scratchpad/s3c/drive.py`), test first.
  - Each Step 2 failed and each Step 4 passed as printed.
  - All 15 files came out identical to the scratch copy: `3e566c0`..`1dbe70d`, 2154 tests in 93 files.

**Reviews**
- **Two reviewers at once,** each with its own frozen copy at `1dbe70d`: a spec review, and a code-quality review of the whole branch. Neither was blocked.
- **The spec review:** matches the spec, with fixes.
  - Important: nothing pinned the bar title's 22 px bold, which §9 promises.
  - Minor:
    - no test that the schedule comes back with today selected after a crossing;
    - the countdown's fallback size, for browsers without container units such as Safari before 16, assumed a card as wide as the window, too big in the 320 px status column;
    - Task 7's list left out 1440 × 900 and the list's keys.
- **The code-quality review:** ready to merge.
  - Minor:
    - a popup open as the window crossed the line stayed open, and on close its focus went to a heading, its button rebuilt under it;
    - the Back and Forward test couldn't tell a rebuilt column;
    - the listener test didn't check that the function taken away was the one added;
    - the countdown's fallback, as above.
  - It timed each clock tick side by side at 0.87 ms with the demo's 22 legs, about the two pages' sum.
- **The controller's own check** of the location card at 744 × 1133 found the sun dial, 42% of the window, covering the card's words. On a 320 px phone, the same card has a 134 px dial.

**Changes after the reviews** (spec decision 9)
- `ae1b6f3`: in the status column, the sun dial and the countdown's fallback go by the column's width, `max(320px, 40vw)`. Tests pin the title's 22 px bold and `split.css`'s rules.
- `34d2060`:
  - each layout has a status page of its own, by its `key`, so crossing the line rebuilds it and closes an open popup;
  - one set of the schedule's props for both layouts;
  - tests for today selected again after a crossing, the month kept through Back and Forward, and a popup across the line.
- `6f34a6f`: the listener test checks the function taken away.
- Not taken:
  - re-reading the window in `useSideBySide`'s effect, the same shape as 3B's height check, which no test could pin;
  - a generated id for the hidden heading, as there's only ever one.
- **Checks:** deliberate breaks against the fixes and the rest caught 39 of 39. The suite is 2156 tests in 93 files.

**Look check (Task 7)**
- The user said "Looks right" to a sheet of six screenshots of the reviewed build:
  - an iPad upright, 820 × 1180, in light, and an iPad mini upright, 744 × 1133, in dark, both on the ground, with the location card's dial at 138 and 134 px;
  - an iPad on its side, 1180 × 820, in dark, in the air, and the flight-tracking popup over it;
  - computers at 1440 × 900, in light, at home, and at 1920 × 1080, in dark, where the layout stops at 1376 px.
- Resizing across the line with the tracking popup open closed it, and the one-column page came back with its chevron. Widening brought the layout back, on this month. There were no console errors.
- No visual nudges were needed.

**Re-checks, after the look check**
- Both reviewers re-checked the changes at `d63c226`, each with deliberate breaks of its own:
  - the spec review: matches the spec, with all four of its findings fixed. Its earlier breaks, the title at 17 px, a rule shrinking the bar's `h1` and a remembered day, now fail the tests.
  - the code-quality review: ready to merge, with all four of its findings fixed and no regressions in its probes: popups across the line both ways, the body's class, the listeners, and the window shrinking under 500 px tall.
- Their Minor items:
  - §8 didn't list the dial as a difference from the app, whose dial stays 160 points;
  - §9 didn't name the new style test;
  - a comment cited §5.2 for the popup's closing, which the spec puts in §5.3.

**Changes after the re-checks**
- `ce9bbdb`: the comment's sections.
- `4a8e0ae`: the spec's §8 and §9.
