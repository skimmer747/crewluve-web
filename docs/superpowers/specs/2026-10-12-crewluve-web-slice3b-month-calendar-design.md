# Crewluve Web — Slice 3B: the month calendar

Status: approved in brainstorming on 2026-10-12. Slice 3A, the Schedule page and its list of legs, is live (`af61ade`). Its spec (`2026-10-12-crewluve-web-slice3a-schedule-list-design.md`, §2) scoped this part: "the month calendar above the list. Tapping a day or a row, and the 'Current Event' button, scroll the list."

## 1. Goal

- **The month calendar** at the top of the Schedule page, as the Crewluve app draws it (`TripCalendarView.swift`, `CalendarWeekRowView.swift`, `CalendarTripBarView.swift`, `CalendarDataBuilder.swift`): the month's days, a bar for every trip and duty, and a line at the current time.
- **It drives the list:** tapping a day or a row, or "Current Event", scrolls the list, as the app's `EventTimelineView` does.
- **The page takes the app's shape:** the bar and the calendar stay put, and only the list scrolls, in its own box below them.

## 2. Scope

- **In:** the calendar, the page's new shape, the taps, keyboard and screen-reader use, and a rest at base in the demo.
- **Not in:**
  - 3C, the status and the schedule side by side on iPad and desktop. Until then the page keeps the site's single column at every width.
  - Remembering the selected day or month: leaving the page and coming back starts fresh, as in the app. The address stays `#schedule`.
  - Swiping between months. The app has only its arrows.

## 3. The page's shape

### 3.1 Only the list scrolls (decisions 1 and 3)

- **The page is exactly the window's visible height:** the bar, then the calendar, then a hairline, then the list in its own scrolling box filling the rest.
- **The bar and the calendar stay put.** The list scrolls under nothing: its box starts below the hairline, as the app's scroll view starts below its calendar.
- **The window itself never scrolls** while the Schedule page shows, including in Safari before 15.4. The list's box doesn't hand its scroll on to the window at its ends.
- **The status page is untouched.** It still scrolls as the window, and comes back where it was (3A §3.3).

### 3.2 Short windows (decision 1)

- **Below 500 px tall,** such as a phone on its side, the calendar and its hairline move into the top of the list's box and scroll away with the list. The bar stays.
- **The rule is the window's height alone,** so it doesn't change from month to month as the calendar grows from four week rows to six. Phones held upright, the iPhone SE included, are taller than that in Safari, so they pin the calendar.
- **Turning the phone** moves the calendar, and the day at the top of the list stays at the top.

### 3.3 The bar

- **Its plain page color.** 3A gave it iOS's bar material because rows scrolled under it; now nothing does. This is the app's look: iOS 26's bar has no background over content that doesn't scroll.
- **Otherwise unchanged:** 60 px, the round glass back button, and the "Schedule" title (3A §4.1).

### 3.4 The list's box

- **Fills the rest of the column**, 16 px from its sides, with 12 px above the first day and below the last (3A §4.1), plus the phone's bottom safe area.
- **Day headings stick to the very top of the box** (3A §4.3), with the same pills and solid band. The stuck heading is the last one within 20 px of the box's top.
  - A sticky heading stops short of its scroll box's padding, and rows would show in the gap. So the box has no padding at the top; a list inside it keeps the 12 px (decision 8).
- **It doesn't scroll sideways.** A code near a week's right edge, or an arrow's tap area, can't make it (decision 8).
- **Its edges are plain cuts.** The app softens them with iOS 26's scroll edge effect.
- **The keyboard can scroll it:** the box takes Tab focus, named "Legs", so the arrow keys and Page Down scroll it.

## 4. The calendar

Sizes are the app's points, as CSS pixels.

### 4.1 Layout

- **16 px from the screen's sides, and 16 px above and below,** on the page's color. The column's own 16 px sides (3A §4.1) are the calendar's.
- **From the top, 8 px apart:** the month header, the weekday letters, and the week rows.
- **Below it:** a hairline as wide as the calendar's content, 16 px in from each side, as the app's `Divider().padding(.horizontal)`. Then the list's box.

### 4.2 The month header

One row, in this order:
- **‹**, the previous month's arrow: the site's chevron (3A §5.1) at 17 px, as heavy as the back button's, in blue, named "Previous month".
- **Space,** a third of what's left.
- **The month and year,** "October 2026": 17 px, semibold.
- **Space,** a third.
- **Current Event:** "Current Event" in 12 px regular blue text on a gray capsule, iOS's bordered button: 7 px above and below the text, 12 px at the sides. The look check matches it against the phone.
- **Space,** a third.
- **›**, the next month's arrow, named "Next month".

Each arrow takes taps over a 44 px square around it, within the column's 16 px sides, without making the row taller (decision 8).

### 4.3 The weekday letters

- **One letter a day:** "S M T W T F S", or from whichever day the visitor's week starts (§5.8).
- **11 px, medium weight, in the secondary color,** each centered in its seventh of the width.

### 4.4 The week rows

- **Four to six rows a month,** as the month needs, each 50 px tall:
  - the day numbers, 28 px;
  - the codes, 12 px (§4.6);
  - the bars, 10 px (§4.5).
- **The grid** (`CalendarDataBuilder.buildMonthGrid`): the month's days, led and trailed by the days of the months either side to fill the first and last weeks.
- **A day number:** 12 px, regular, centered in its seventh, and:
  - **today:** bold, with a 1.5 px blue ring, 26 px across;
  - **the selected day:** white on a filled blue circle, 26 px across, and still bold when it's today;
  - **days of the months either side:** the secondary color at 40%;
  - **any other day:** the text color.
- **Grid lines,** 0.5 px in `--grid-line` (§4.8): six down between the columns, across all the week rows, and one between each pair of rows. The weekday letters have none.

### 4.5 The bars

- **Which legs:** the list's legs (3A §4.2), less the time at home, which gets no bar.
- **One kind and color per leg:**

| Legs | Kind | Light | Dark |
|---|---|---|---|
| Trip flights, ground transport, turns | on duty | navy `#1A3373` | blue `#4D73E6` |
| Layovers, rests at base (decision 2), drives | off duty | light blue `#99BFEB` | gray blue `#8CA6CC` |
| Reserve, hot standby | reserve | the site's pink | its pink |
| Training and other events | training | the site's purple | its purple |
| Jumpseats | jumpseat | the site's green | its green |

- **Grouped by trip** (`CalendarDataBuilder.buildSegments`):
  - Each leg is its own piece, in its kind's color, so a trip reads as navy flying broken by light-blue rests.
  - A trip's pieces join up: where one of its legs ends less than 30 minutes before its next leg begins, the first piece stretches to meet the next.
  - A leg with no trip, such as a drive, an event or a jumpseat, is a trip of its own.
- **Rounded ends,** 3 px:
  - only where the whole trip starts or ends;
  - only in the week row where that happens.
  - A trip running on into the next week row has a square end at the row's edge, and a square start in the next.
  - A home stop in the middle of a trip leaves a gap with square ends.
  - A trip's start and end come from all its legs in the list, not only the ones in that week row.
- **Where a bar sits:**
  - Across the row, by time: the row's start is the first day's midnight and its end the midnight seven days later, both in the visitor's zone.
  - In a week with a clock change, the row is 167 or 169 hours long, and bars are measured against that.
  - Each bar is 6 px tall, in the middle of the 10 px strip.
- **Overlaps:** bars are drawn in start order, a later one over an earlier.

### 4.6 The codes

- **Over each layover and each rest at base:** its airport code, such as "ANC" or "SDF".
- **9 px, semibold, in `--rest-text`,** the off-duty color (§4.8). It's centered over the middle of its bar, with its center 8 px below the top of the 12 px row.
- **A stop running into the next week row** gets a code over each of its two pieces.

### 4.7 The time line

- **A green line, 1.5 px wide,** down the whole week row that holds today, at the current time.
- **Measured as the bars are** (§4.5), so a leg starting now begins exactly at the line.
- **It moves once a minute,** as the app's does.
- **When today is a greyed day** at the edge of another month's grid, the line shows there too.

### 4.8 Colors

Six new tokens join `tokens.css`, in light and dark:

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--duty` | `#1A3373` | `#4D73E6` | on-duty bars |
| `--rest` | `#99BFEB` | `#8CA6CC` | off-duty bars and codes |
| `--rest-text` | `#99BFEB` | `#8CA6CC` | the codes |
| `--grid-line` | `rgba(0, 0, 0, 0.15)` | `rgba(255, 255, 255, 0.4)` | grid lines |
| `--button-fill` | `rgba(118, 118, 128, 0.12)` | `rgba(118, 118, 128, 0.24)` | Current Event's capsule |
| `--separator` | `rgba(60, 60, 67, 0.29)` | `rgba(84, 84, 88, 0.6)` | the hairline |

- **Under Increase Contrast** (`prefers-contrast: more`), `--rest-text` is `#2A6FB8` in light mode, 5.2:1 on white. The 9 px codes are hard to read in the app's light blue, which is 1.9:1. Dark mode's `#8CA6CC` is already 8.4:1, so it stays. The bars keep the app's colors (decision 4).
- **Blue, green, pink and purple, and the secondary color,** are the site's tokens, with their existing high-contrast values.

## 5. Behavior

Copied from `EventTimelineView` and `TripCalendarView` (decision 5).

### 5.1 Opening

- **The calendar opens on this month, with today selected:** today's number is white on the blue circle.
- **The list opens at its day as in 3A** (§4.11): the next leg's day, else the day of the leg happening now, else today. That day's heading sits at the top of the list's box.

### 5.2 Tapping a day

- **The day becomes the selected day.**
- **A greyed day** of the month before or after turns the calendar to that month.
- **The list scrolls** that day's heading to the top of its box:
  - **Today, while a leg is happening:** to the day that leg started. For an overnight flight, that's yesterday.
  - **A day with legs:** to that day.
  - **A day without legs:** to the latest day before it that has some.
  - **A day before every leg:** the list doesn't move.
- **Every tap scrolls,** even on the day already selected. The app ignores a tap on the selected day, which leaves nothing to do after scrolling away (§8).

### 5.3 Tapping a row

- **The row's day becomes the selected day,** the day its leg starts. The calendar turns to that month when needed.
- **When that changes the selected day,** the list scrolls as for a tap on that day (§5.2). A row of the day already selected moves nothing, as in the app.
- **A row's tap is for the pointer only.** It isn't a button for keyboards or screen readers, as the calendar's days do the same.

### 5.4 Current Event

- **Turns the calendar back to this month and selects today.**
- **Scrolls the list as on opening** (§5.1): to the next leg's day, else the day of the leg happening now, else today. It doesn't move when that day has no legs.

### 5.5 The arrows

- **‹ and ›** turn to the month before or after, with no limit either way.
- **The selected day stays selected,** even when it's no longer shown. The list doesn't move.
- **The new month appears at once.** The app fades it in.

### 5.6 Scrolling

- **The list's scroll is animated,** unless the visitor asks for reduced motion. Then it jumps.
- **Scrolling the list by hand** doesn't change the selected day, as in the app.

### 5.7 Keyboard and screen readers

- **The days are one grid,** with one Tab stop. That stop is the selected day when it's in the month shown, else today when it is, else the month's 1st.
- **Moving around:** the arrow keys move a day left or right, or a week up or down. Moving onto a day of another month turns the calendar to it. Enter or Space taps the day. Moving alone selects nothing.
- **What's read:**
  - A day: its weekday and date, such as "Thursday, October 15".
  - Today is marked as the current date, and the selected day as selected.
  - The columns are named with full weekday names, such as "Sunday".
  - The arrows: "Previous month" and "Next month".
  - The month's name is a polite live region, so turning the month announces it.
- **Hidden from screen readers:** the bars, the codes, the time line and the grid lines. The list says the same in words.
- **Focus stays on the day** after a tap. The list scrolls without moving focus.

### 5.8 Data and timing

- **One clock:** the page's own (3A §4.13). The calendar redraws when the minute, the legs, the selected day or the month changes.
- **At midnight,** today's ring and bold move to the new day. The selected day and the month shown stay.
- **When new data arrives,** the bars change in place. The selected day, the month and the list's scroll stay.
- **Days are the visitor's,** in their time zone, as the list's are (3A §4.3).
- **The week starts** on the first day of the visitor's region, from the browser's `Intl.Locale` week information (`getWeekInfo()`, or the older `weekInfo`): Sunday in the US, Monday in much of Europe. Without it, Sunday. The app's grid follows the phone's region the same way; its letters don't (§8).
- **With no legs at all,** the calendar still shows, without bars, above 3A's empty state (§4.12). Current Event then moves nothing.

## 6. How it's built

### 6.1 New files

- **`src/ui/calendarFacts.ts`:** the calendar as plain data, ported from `CalendarDataBuilder`:
  - `firstWeekday`: the region's first day, else Sunday;
  - `monthGrid`: a month's week rows of days, each with its date and whether it's in the month. Today is marked as the calendar draws, so the grid stays the same as the day changes;
  - `weekBars`: a week row's bars, with kind, ends and code;
  - `barKind`: each leg's kind (§4.5), or none for home;
  - `timeLine`: where the line sits in a week row, if anywhere;
  - `scrollDay`: the list's day a tapped day scrolls to (§5.2), or none. Current Event uses 3A's `openingDay`.
- **`src/copy/calendar.ts`:** the month's name, the weekday letters and full names, and a day's spoken name.
- **`src/ui/TripCalendar.tsx`:** draws the calendar from what it's given, and reports taps.
  - It holds no state but the keyboard's place, so it can move into the list's box on short windows without losing anything.
  - The bars' positions and widths are set through the CSSOM, as 3A sets each row's color.
- **`src/styles/calendar.css`:** the calendar's styles.

### 6.2 Changes

- **`src/time/zoned.ts`** gains two helpers:
  - `dayStart`: the instant a calendar day begins in a time zone;
  - date arithmetic on the day numbers `calendarDay` gives.
- **`src/ui/SchedulePage.tsx`:**
  - the page's shape (§3), and moving the calendar into the box below 500 px;
  - the selected day and the month shown;
  - the scrolling of §5;
  - the opening position and the stuck heading, measured in the box instead of the window.
- **`src/ui/TimelineRow.tsx`:** an optional `onTap` for the row (§5.3).
- **`src/styles/schedule.css`:**
  - the page fills the window's visible height;
  - the bar's plain color;
  - the list's box;
  - headings stick at the box's top.
- **`src/styles/tokens.css`:** the six tokens of §4.8.
- **The demo, `src/data/demo.ts`:** the third trip rests 16 hours at base, SDF, before a new third duty period, so the light SDF bar can be seen. Both variants fly the same trips, so both rest there. The `nothing-ahead` scene moves after the longer trip; no other scene moves.

## 7. Security and privacy

Nothing new: no requests, storage or scripts. The content security policy is unchanged. The bars' positions are set through the CSSOM, which the policy allows.

## 8. Deliberate differences from the app

- **Rests at base** are drawn as off duty, with their code (decision 2). The app draws them as on duty, its catch-all for anything it doesn't name.
- **A tap on the selected day scrolls the list again.** The app ignores it.
- **Right after opening, a tap on one of today's rows moves nothing,** since today is already the selected day. The app scrolls to today's heading, where its list has usually just opened anyway. Its opening selects the current moment, not the day.
- **The time line is measured as the bars are,** so it meets them exactly on the days the clocks change. The app measures it within the day.
- **The new month appears at once.** The app fades it in.
- **The weekday letters start on the week's first day.** The app always prints them from Sunday, so where a week starts on Monday, its letters don't line up with its columns.
- **The arrows take 44 px of taps.** The app's take only the chevron's size.
- **Windows under 500 px tall** scroll the calendar away with the list. The app doesn't face such a window.
- **Under Increase Contrast** the codes darken in light mode.
- **The list's edges are plain cuts.** iOS 26 softens them.
- **The web's own parts:** keyboard use of the days, names for screen readers, and the list's box taking focus.

## 9. Testing

- **`calendarFacts`:**
  - month grids of four, five and six week rows, with weeks from Sunday and from Monday. February 2026 starts on a Sunday and fills exactly four rows.
  - the first weekday from the region, and Sunday without one;
  - bars:
    - each kind in §4.5, and home left out;
    - a trip across two week rows, and a home stop in mid-trip;
    - gaps under 30 minutes closed, and 30 minutes or more left open;
    - rounded ends only where a trip starts and ends;
    - legs without a trip;
    - overlaps in start order;
    - the week of the November clock change;
  - codes on layovers and rests at base, and on both pieces of one across rows;
  - the time line's place, including on a greyed day, and none outside today's row;
  - `scrollDay` in every case of §5.2.
- **`copy/calendar`:** month names, the letters from either first day, and spoken day names.
- **`zoned`:** `dayStart` across clock changes, including a zone whose clocks change at midnight, and the date arithmetic over month and year ends.
- **`TripCalendar`:**
  - today's ring, the selected circle, greyed days and bold;
  - the arrows, Current Event, and a greyed day turning the month;
  - the keyboard's moves and the single Tab stop;
  - names and roles, and the live month name.
- **`SchedulePage`:**
  - opening on this month with today selected, at 3A's opening day;
  - each tap of §5.2–5.4 scrolling the box to the right heading, or not;
  - a row tap turning the month;
  - reduced motion jumping;
  - the calendar moving into the box below 500 px and back, keeping the day at the top;
  - the stuck heading measured in the box;
  - new data keeping the selection, the month and the scroll.
- **Styles:**
  - the sizes in §4 and the tokens in §4.8, with their high-contrast value;
  - the page filling the window, and the box scrolling;
  - no new `<style>` elements.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`.
- **In the browser:**
  - the demo at 375 and 320 px wide, in light and dark;
  - a six-week month;
  - a window under 500 px tall;
  - Increase Contrast, by copying the `prefers-contrast` rules out of their media queries through the CSSOM (Part A follow-ups);
  - every tap of §5, and the keyboard;
  - the look check with the user, against the app on their phone, including the Current Event button.

## 10. Decisions log

| # | Decision | Source |
|---|---|---|
| 1 | The calendar stays pinned under the bar while the list scrolls, as in the app. On a window too short for that, such as a phone on its side, it scrolls with the list. | User, 2026-10-12 |
| 2 | A rest at base between duty periods is drawn like a layover: light blue, with its code. The app draws it as on duty. | User, 2026-10-12 |
| 3 | Only the list scrolls: the page is the window's height and the list has its own scrolling box, as the app's screen is built. | User, 2026-10-12 |
| 4 | The calendar's look as mocked up, at the app's sizes and colors. The small codes darken only under Increase Contrast. | User, 2026-10-12 |
| 5 | The behavior in §5, copying the app, including a row tap scrolling its day to the top. | User, 2026-10-12 |
| 6 | The build in §6, with a rest at base added to the demo. | User, 2026-10-12 |
| 7 | "Too short" is a window under 500 px tall; the bar takes the page's plain color; a tap on the selected day scrolls again; the time line is measured as the bars are; the arrows take 44 px of taps. | Design, from decisions 1, 3 and 5 |
| 8 | The list's box has no padding at the top, so the headings stick at its very top, and it doesn't scroll sideways; the arrows' tap areas stay within the column's sides. | Design, from the browser check while planning |

## 11. Roadmap

1. Slice 3C: side by side on iPad and desktop.
2. Left from 3A: `memo` on rows, and a check in Safari on an iPhone (the ring's masks, VoiceOver on the lists, the headings and the gaps, and the focus ring after a return in Safari before 15.4). The sticky bar's blur is gone with this slice.
3. Still on the list from Part C: longitude's spelling (`GeoPoint.lon` where the rest of the site uses `lng`), and one source for the delay.
