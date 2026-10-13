# Crewluve Web — Redraws: the calendar and the rows redraw only when what they show changes

Status: approved in brainstorming on 2026-10-12. Slice 3 (3A, 3B and 3C) is live (`e198fd8`). This takes up the `memo` on rows that 3A and 3B left for later (3B §11), with the month calendar alongside them.

## 1. Goal

- **Every second the page draws its clock again:** the countdowns, the rows' clocks, and the footer's "Checked … ago". The Schedule page and the side-by-side layout also redraw the month calendar and every row in the list, though most of them show nothing that changes from second to second.
- **The calendar and the rows redraw only when something they show changes.** Nothing on screen changes.

## 2. Why

Measured in the tests' browser (happy-dom), with the demo's 22 legs, over 300 ticks:

| Page | A tick now | With the calendar and the rows memoized |
|---|---|---|
| The Schedule page | about 0.5 ms | about 0.19 ms |
| Side by side | 0.6–0.9 ms | about 0.43 ms, mostly the status page |

- **Most of it is the calendar:** its 42 days and their bars. Memoizing the rows alone saved 10–15%.
- **It matters most for a screen left open all day,** such as an iPad on the kitchen counter.

## 3. Scope

- **In:** a `memo` helper; the calendar and the rows memoized, with steady handlers.
- **Not in:**
  - The status page's cards. Their clocks change every second or minute, and they cost less.
  - Preact's signals or any other state library.
  - The Safari check, which the user does on their own iPhone and iPad (decision 3). Fixes from it come separately.

## 4. The design (decision 4)

### 4.1 The helper (decision 2)

- **`src/ui/memo.ts`:** `memo(Component)` gives back a component that Preact redraws only when one of its props has changed, compared one by one by identity, as React's `memo` does.
- **It's built on Preact's `shouldComponentUpdate`,** as `preact/compat`'s `memo` is, without the rest of compat, which would add 2.65 kB gzipped to the site's script.

### 4.2 The calendar

- **`TripCalendar` is memoized.**
- **Its props already stay the same from tick to tick:** the month shown, the first weekday, the legs, the clock, rounded to the minute (3B §4.7), the zone, today and the selected day. `onMonth` is a state setter, which never changes.
- **`onSelect` and `onCurrentEvent` become steady:** functions made once, which call the latest pick and Current Event, so a tap always works from the latest selection and data.
- **So it redraws when the minute turns,** and when the month, the selection, today or the data change. Its own state, the keyboard's place, still redraws it as before.

### 4.3 The rows

- **`TimelineRow` is memoized.**
- **A row reads the clock only when it's the leg happening ("Ends in") or the next leg ("Starts in").** Every other row shows its fixed duration, so it's given a clock of 0, and its props stay the same.
- **A row's tap hands over its leg:** `onTap(leg)`. One steady handler serves every row, calling the latest row-tap code (3B §5.3).
- **So each second only the happening and the next rows redraw.** The others redraw when they change: when a leg starts or ends, or when new data arrives.

### 4.4 Unchanged

- What's on screen, the taps, focus, scrolling, the countdowns' seconds, and the time line's once-a-minute move.
- Every existing test passes unchanged, except that a row's tap now hands over its leg.

## 5. Testing (decision 4)

- **`memo`:** redraws when a prop changes; not when the same props come again; a new function counts as a change.
- **Redraws over a run of ticks,** counted through functions each part calls as it draws:
  - the calendar: none within a minute, one as the minute turns, and one after a tap on a day;
  - the rows: only the happening and the next rows each second.
- **A row's tap hands over its leg.**
- **The steady handlers work from the latest draw** (decision 5): Current Event after midnight selects the new day, and a tap on a day takes the list by data that arrived after the first draw. A row draws again when new data changes its leg.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`.
- **Deliberate breaks** of the new code, to check that the tests catch them.
- **In the browser:** the demo's Schedule page and the side-by-side layout behave as before, with taps, Current Event, the arrows and the keys, and no console errors.

## 6. Decisions log

| # | Decision | Source |
|---|---|---|
| 1 | Take up the leftovers from 3A–3C: the redraws, and the Safari check. | User, 2026-10-12 |
| 2 | Our own small `memo`, not `preact/compat`'s. | User, 2026-10-12 |
| 3 | The Safari check on the user's own iPhone and iPad, with fixes from what they find. | User, 2026-10-12 |
| 4 | The design in §4 and the testing in §5. | User, 2026-10-12 |
| 5 | Tests that the steady handlers work from the latest draw, after midnight and with new data, and that a row draws again with new data; the helper's wrapper is named after what it holds. | Design, from the review |

## 7. Roadmap

1. Fixes from the user's Safari check, once it's done.
2. Still on the list: optionally, the page's scrolling in a hook; from Part C, longitude's spelling (`GeoPoint.lon` where the rest of the site uses `lng`) and one source for the delay.
3. Then the slice 1 roadmap's web-only ideas, from the 2026-10-08 idea board.
