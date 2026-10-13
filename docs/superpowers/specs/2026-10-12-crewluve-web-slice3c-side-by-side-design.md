# Crewluve Web — Slice 3C: the status and the schedule side by side

Status: approved in brainstorming on 2026-10-12. Slices 3A (the Schedule page) and 3B (the month calendar) are live (`75426fc`). 3A's spec (§2) scoped this part: "on iPad and desktop widths, the status on the left and the schedule on the right, without the View Schedule button or the chevrons, as on the app's iPad."

## 1. Goal

- **The app's iPad layout on wide windows** (`ContentView.swift`, `iPadStatusLayout`): the status on the left, 40% of the width, a hairline, then the schedule on the right, all under one bar titled "Where's {Name}?".
- **Both at once:** the status page's cards next to the Schedule page's calendar and list, with no going back and forth.

## 2. Scope

- **In:** when the layout shows, the bar, the two columns, the address, resizing across the line, popups, the keyboard and screen readers.
- **Not in:**
  - Phones and narrower windows. They keep 3A's and 3B's two pages, unchanged.
  - The sign-in page and the "nothing to show" screen. They keep one column at every width, as the app's iPad shows its own such screens across the whole window.
  - Keeping the selected day, the month or the scroll positions when the layout changes (decision 3).
  - Taps on the status cards doing anything beside the schedule. On the app's iPad they don't.

## 3. When it shows (decision 1)

- **Windows at least 744 px wide and 500 px tall.** 744 px is an iPad mini held upright, the narrowest iPad.
  - Every iPad, either way up, and most computer windows, get the layout.
  - Phones don't, even on their side: a turned phone is under 500 px tall. The iPhone app only runs upright.
  - A window narrower than 744 px, such as one side of an iPad's split screen, or under 500 px tall, gets one column.
- **The rule is the window's size alone,** read with a media query and followed as it changes (§5.2).
- **Where the browser can't say** (no `matchMedia`), one column.

## 4. The layout (decisions 2 and 4)

### 4.1 The frame

- **Exactly the window's visible height,** fixed to its edges, as the Schedule page is (3B §3.1). The window itself never scrolls. Each column scrolls on its own, in its own box, as on the app's iPad, where each is its own scroll view.
- **Safari before 15.4:** the body gives up its full height while the layout shows, as it does for the Schedule page (3B decision 9).
- **The widths:** the status column takes 40% of the width, never less than 320 px, the narrowest phone's width. The schedule column takes the rest.
- **Past 1376 px,** the width of a 13-inch iPad on its side, the bar and the columns stop growing and stay centered, with the page's plain color on both sides (decision 2).

| Window | Status | Schedule |
|---|---|---|
| iPad mini upright, 744 × 1133 | 320 px | 424 px |
| 11-inch iPad upright, 820 × 1180 | 328 px | 492 px |
| The same on its side, 1180 × 820 | 472 px | 708 px |
| 13-inch iPad on its side, 1376 × 1032 | 550 px | 826 px |
| Computer, 1920 × 1080 | 550 px | 826 px, with 272 px of page on each side |

### 4.2 The bar

- **60 px tall, across both columns,** with the page's title centered in it: "Where's {Name}?", or "Where's your pilot?" without a name. It's the app's iPad title, 22 px bold, the same text and size as the status page's title.
- **The page's plain color,** as the Schedule page's bar (3B §3.3). Nothing scrolls under it.
- **Nothing else:** no back button and no "Schedule" title. The app's iPad bar shows only the title.

### 4.3 The status column

- **The status page's content, as on a phone:** the demo pill, the narrative card, the cards in their order, and the footer, with its sync line, refresh and sign-out. The app keeps its sync bar in this column too.
- **Without the title,** which is in the bar.
- **Without ways into the schedule** (3A §2): the cards that lead to the schedule have no chevron and take no tap, and View Schedule never shows. This is what `PilotStatusView` does with `isCompanionLayout`.
- **Spacing as the status page's column** (`.screen`): 12 px above, 16 px at the sides, 16 px below plus the safe area, and 24 px between cards. It fills the column, with no 480 px limit.
- **It scrolls in its own box,** which doesn't hand its scroll on to the window at its ends.

### 4.4 The hairline

- **0.5 px wide, in iOS's separator color** (`--separator`), from under the bar to the bottom. It is the app's `Divider` between the columns, and matches the line under the calendar.

### 4.5 The schedule column

- **The Schedule page below its bar, unchanged:** the month calendar pinned at the top, its hairline, and the list in its own scrolling box (3B §3). It fills the column, and the calendar's days and the rows grow with it, as on the app's iPad.
- **The calendar is always pinned.** The layout needs a window 500 px tall, which is 3B's line for pinning it (3B §3.2).
- **It opens as the Schedule page does** (3B §5.1): this month, today selected, and the list at 3A's opening day with its heading stuck. Taps, the arrows, Current Event and the keyboard work as there (3B §5).
- **16 px at the sides,** as the Schedule page's column.

## 5. Behavior (decision 5)

### 5.1 The address

- **On a wide window, `#schedule` changes nothing.** Both columns show with or without it, and the address is left as it is.
- **When the window narrows to one column, the address picks the page,** as now: the Schedule page at `#schedule`, else the status page (3A §3.3).
- **Nothing in the layout adds a history entry,** since no card opens the schedule there. Back and Forward between the two addresses change nothing on screen, and leave focus and the scroll positions alone.

### 5.2 Crossing the line (decision 3)

- **A window resized across 744 × 500 switches layouts at once,** and both pages are rebuilt:
  - the status starts from its top;
  - the schedule opens as it does when opened: this month, today selected, and the list at its opening day.
  - Going from wide to narrow at `#schedule`, the Schedule page opens with focus on its title, and its back button works as now: it steps back to the status page's entry when the site added the schedule's, and otherwise goes to the status page in place (3A §3.3). Otherwise focus is wherever the browser leaves it.
- **Who crosses it:** computer windows being resized, and windows in an iPad's split screen or Stage Manager. Turning an iPad doesn't, since every iPad is at least 744 px wide either way up. Phones never reach it.

### 5.3 Popups

- **The sun and flight-tracking popups cover the whole window,** as now (slices 2B2 and 2C).
- **While one is open,** the bar and both columns are hidden from screen readers and inert, as the status page alone is now.
- **When one closes,** focus goes back to its button. When it closes by itself, focus goes to the heading of the card in the location card's place, or else to the title, now in the bar (popup follow-ups §4.2).

### 5.4 Keyboard and screen readers

- **One `main`:** the bar, whose title is the page's `h1`, then the status column, then the schedule column.
- **The columns are regions:**
  - "Status";
  - "Schedule", labelled by a hidden `h2` at its top, so heading navigation reaches it. The list's box inside keeps its name, "Legs" (3B §3.4).
- **Tab order:** the status column's box and its controls, then the calendar's controls and the list's box.
  - Both boxes take focus, so the arrow keys and Page Down scroll them, as the list's box does (3B §3.4).
  - Their focus rings sit inside their edges.
- **Nothing takes focus on load,** as on the status page. Only the Schedule page moves focus to its title when it opens.

### 5.5 Data and timing

- **One clock and one schedule** for both columns, as for each page now (3A §4.13). The countdowns and the rows tick every second, the calendar's time line once a minute, and new data updates both in place.
- **No new requests.** The weather and the airports load as for the status page.

## 6. How it's built (decision 6)

### 6.1 New files

- **`src/ui/hooks/useSideBySide.ts`:** whether the window is at least 744 × 500, from `matchMedia('(min-width: 744px) and (min-height: 500px)')`, following its changes. False without `matchMedia`.
- **`src/ui/ScheduleView.tsx`:** the Schedule page below its bar, moved out of `SchedulePage` unchanged:
  - the calendar, its hairline and the list's box;
  - the selected day and the month shown;
  - the opening scroll and the stuck heading;
  - the move into the list below 500 px;
  - the scrolling of 3B §5;
  - the body giving up its full height while it shows (`html.schedule-open`, 3B §3.1). Both the Schedule page and the layout hold the view, and neither lets the window scroll.
- **`src/styles/split.css`:** the frame, the bar, the two columns and the hairline.

### 6.2 Changes

- **`src/ui/SchedulePage.tsx`:** its `main`, the bar and the title, with `ScheduleView` below. It moves focus to its title when it opens, as now.
- **`src/ui/StatusScreen.tsx`:** when given the schedule column to put beside it, it draws the layout of §4: its title in the bar, its cards in the status column, and the schedule column beside them.
  - It keeps the popups and what they hide, so a popup hides the bar and both columns (§5.3).
  - Without a column beside it, the page is as now.
- **`src/ui/PilotPages.tsx`:** picks the layout with `useSideBySide`. On a wide window, the status with the schedule column beside it and no links; otherwise, as now.
- **`src/ui/hooks/useSchedulePage.ts`:** on a wide window, it follows the address without moving focus or the window's scroll (§5.1).
- **`src/styles/schedule.css`:** unchanged. The schedule column gives the view the same 16 px sides as the page.

## 7. Security and privacy

Nothing new: no requests, storage or scripts. The content security policy is unchanged. The layout uses classes only, and any size set from code goes through the CSSOM, which the policy allows.

## 8. Deliberate differences from the app

- **When it shows:** the app splits on every iPad, whatever its window. The site splits windows at least 744 × 500, so a narrow window in an iPad's split screen keeps one column, and computers split too.
- **The status column never goes under 320 px.** The app's is always 40%, as narrow as 298 points on an iPad mini held upright.
- **Past 1376 px the layout stops growing,** centered. No iPad is wider.
- **The columns' edges are plain cuts.** iOS 26 softens them, and scrolls the status under its bar.
- **The web's own parts:** the columns as named regions with focusable scroll boxes, and the hidden "Schedule" heading.

## 9. Testing (decision 6)

- **`useSideBySide`:** the query; true and false; following a change; false without `matchMedia`.
- **`PilotPages`:**
  - a wide window gets the layout, with the bar's title, both columns and the hairline; a narrow one gets today's pages;
  - beside the schedule, no chevrons and no View Schedule, in a home scene and an away one;
  - `#schedule` on a wide window shows the same layout;
  - crossing the line both ways rebuilds the pages: the schedule back on this month at today, and at `#schedule` the Schedule page opening with focus on its title;
  - the empty screen unchanged at any width.
- **`StatusScreen`:** with a column beside it:
  - the title in the bar;
  - a popup hiding the bar and both columns, and giving them back;
  - focus after a popup closes by itself going to the bar's title when no card is in the location card's place.
- **`useSchedulePage`:** on a wide window, Back and Forward following the address without moving focus or the window's scroll.
- **`SchedulePage` and `ScheduleView`:** every existing `SchedulePage` test passes unchanged, and the view beside the status takes no focus as it opens.
- **Styles:**
  - the frame filling the window;
  - the columns' widths, 40% and at least 320 px, and the 1376 px limit;
  - the hairline's color and the bar's title size;
  - no new `<style>` elements.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`.
- **Deliberate breaks** of the new code, to check that the tests catch them.
- **In the browser:**
  - the demo at 744 × 1133, 820 × 1180, 1180 × 820, 1440 × 900 and 1920 × 1080, in light and dark;
  - one column at 743 px wide and at 499 px tall;
  - resizing across the line both ways, at `#schedule` and without it;
  - Tab through both columns, the arrow keys in each box, and the popups;
  - the look check with the user.

## 10. Decisions log

| # | Decision | Source |
|---|---|---|
| 1 | Side by side on windows at least 744 px wide and 500 px tall: every iPad either way up, and computers. Phones keep one column, even on their side. | User, 2026-10-12 |
| 2 | The app's 40/60 split, with the status never under 320 px. Past 1376 px the pair stops growing and sits centered. | User, 2026-10-12 |
| 3 | One check on the window's size picks the layout. Crossing it rebuilds the pages, with the schedule back at today. | User, 2026-10-12 |
| 4 | The layout as mocked up on the live demo: the bar, the status column, the hairline and the schedule column (§4). | User, 2026-10-12 |
| 5 | The behavior in §5: the address, crossing the line, popups, the keyboard and screen readers. | User, 2026-10-12 |
| 6 | The build in §6 and the testing in §9. | User, 2026-10-12 |
| 7 | Only one calendar is ever on the page, so 3B's note about its fixed `id` needs no change. | Design, from decision 3 |

## 11. Roadmap

1. Left from 3A and 3B: `memo` on rows; optionally, the page's scrolling in a hook; and the check in Safari on an iPhone (3B §11). An iPad joins that check for this slice: the two columns' scrolling, the bar, and VoiceOver's regions and headings.
2. Still on the list from Part C: longitude's spelling (`GeoPoint.lon` where the rest of the site uses `lng`), and one source for the delay.
3. After Slice 3, the slice 1 roadmap (§13) goes on to the web-only ideas from the 2026-10-08 idea board.
