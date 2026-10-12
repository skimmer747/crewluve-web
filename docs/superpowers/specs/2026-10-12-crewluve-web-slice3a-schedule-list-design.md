# Crewluve Web — Slice 3A: the Schedule page and its list of legs

Status: approved in brainstorming on 2026-10-12. Parts A, B1, B2 and C, the Part A follow-ups and the popup follow-ups are live. Slice 3 was first scoped in the slice 1 spec (§13, "Slice 3 — Schedule"). Slice 2A (§2, §3) moved the View Schedule button and the trip card's tap-through here.

## 1. Goal

- **The Schedule page:** every leg the site reads, grouped by day, as the Crewluve app's Schedule screen lists them (`EventTimelineView.swift`, `TimelineRowView.swift`, `TimeGapView.swift`, `RotatingGradientBorder.swift`).
- **Getting there and back:** the cards that open the schedule in the app get their chevron. The View Schedule button appears whenever none of those cards is on the page. The page has its own address, and Back returns to the status page.

## 2. Scope

The user asked for Slice 3 on 2026-10-12, split into three parts (decision 1):
- **3A, this spec:** the page, its list of legs, and the ways in and out.
- **3B:** the month calendar above the list. Tapping a day or a row, and the "Current Event" button, scroll the list.
- **3C:** on iPad and desktop widths, the status on the left and the schedule on the right, without the View Schedule button or the chevrons, as on the app's iPad.

Until 3C, the Schedule page uses the site's single column at every width.

## 3. Getting there and back

### 3.1 The cards that open the schedule

These are the cards the app wraps in its schedule link (`PilotStatusView.swift`, `scheduleLink`):
- **Leaves Home In:** the countdown to leaving home.
- **The arrival countdown:** "Back Home In", or the same card's other titles.
- **The "~N days" card:** "Back Home In" with "~3 days" (`EstimatedReturnCardView`).
- **The upcoming trip card.**

Each of them changes in three ways:
- **A chevron (›)** at the right end of its top row: 14 px, semibold, in the secondary color.
  - On the countdown cards and the "~N days" card, it ends the icon-and-title row.
  - On the upcoming trip card, it comes after the delay badge, when there is one.
- **The whole card opens the schedule.** It's one link: Tab stops once per card, and the focus ring outlines the whole card.
- **Pressing it** shrinks the card to 97% and fades it to 85%, then lets it go, over about 0.3 s (`CardButtonStyle`). With reduced motion, it only fades.

The narrative card, the days-home pill, the location card, the in-flight card and the trip progress card don't open the schedule, as in the app.

### 3.2 The View Schedule button

- **Look** (`PilotStatusView.swift:166-187`), all inside one glass card with 16 px padding and a 20 px radius:
  - a `calendar` icon, 22 px, blue;
  - "View Schedule", 20 px, semibold;
  - a chevron at the far right, 12 px, in the secondary color.
- **Pressing it** acts as pressing the cards does (§3.1).
- **Where:** after the countdown cards and the days-home pill, and before the location card.
- **When it shows (decision 4):** whenever none of the four cards in §3.1 is on the page.
  - The app shows it only when the pilot is home or at base, with no flight ahead and no leave-home countdown.
  - The app then has no way into the schedule at other times, for example on reserve or at training with no trip. The site's rule covers those.
  - One case goes the other way: at base with a countdown card on the page, the app shows the card and the button. The site shows only the card, since it already leads to the schedule.

### 3.3 The address and Back (decision 3)

- **The address:** opening the schedule changes the address to `crewluve.crewlu.net/#schedule`, without reloading. The demo keeps its scene: `?demo=…#schedule`.
- **Back:**
  - The phone's Back, swipe-back and the browser's Back return to the status page.
  - The page's own back button does the same. If the schedule was opened straight from its address (a bookmark or a reload), the back button goes to the status page instead of leaving the site.
- **Bookmarks and reloads** open the schedule. Signed out, the sign-in page comes first, then the schedule.
- **The status page comes back scrolled to where it was.**
- **Focus:**
  - When the schedule opens, focus moves to its "Schedule" heading, so screen readers announce the new page. The heading takes focus without a focus ring, as the status page's headings do (popup follow-ups §4.2).
  - Coming back, focus returns to the card or button that opened the schedule when it's still on the page. Otherwise it goes to the status page's title.
- **When there's nothing to show:** while the data first loads, after an error with nothing saved, or when CrewLu Cloud has nothing for the account, the address doesn't matter. The site shows the same screen it shows today.

## 4. The Schedule page

### 4.1 Layout

- **The top bar** stays at the top while the page scrolls:
  - **The back button:** on the left, a 44 px round glass button with a chevron (‹) in blue. It's named "Back" for screen readers. This copies iOS 26, where the back button is a chevron in a glass circle.
  - **The title:** "Schedule", centered, 17 px, semibold. It's the page's heading.
  - **Behind them:** the page's color, slightly see-through and blurred, so rows scroll under it as under iOS's bars.
- **The list** comes next: 16 px from the column's sides, with 12 px above and below.
- **The page has no footer.** The app's Schedule screen has no sync bar. The data keeps refreshing in the background.
- **The demo banner** stays on the status page only, as in the app.

### 4.2 Which legs

- **Every leg the status page already reads:** the last 60 days and the next 120 days of CrewLu Cloud data, built by the same leg builder (`buildLegs`).
  - That builder copies the legs Duty sends the app (`PartnerStatusGenerator.swift:707-1065`). That means trip flights, turns, layovers, home and base stops between duty periods, jumpseats, drives, reserve, hot standby, training and other events.
  - A layover, home or base stop ends early when a flight leaves during it, as the app's `adjustLayoversForOverlappingFlights` does.
- **Left out:** the report-time leg the status page adds before a trip's first flight. Duty doesn't send one, and the app doesn't list it.
- **Hidden items stay hidden:** the site already skips rows the pilot hid from the timeline.
- **The order:** by start time.

### 4.3 Days

- **Grouping:** by the calendar day each leg starts on, in the visitor's time zone. A leg that crosses midnight sits under the day it starts.
- **The day's heading:**
  - "Today", "Yesterday" or "Tomorrow", else the weekday and date, for example "Thursday, Oct 16".
  - 12 px, semibold, in capitals: "THURSDAY, OCT 16".
  - 12 px above it and 2 px below.
- **Headings stick:** each day's heading sticks under the top bar while its legs scroll past, and the next day's heading pushes it up.
- **Colors:**
  - **Today's heading** is a green pill with black text: 8 px by 4 px of padding, 6 px radius.
  - **The heading stuck at the top** is a yellow pill with black text, unless it's today's, which stays green.
  - **Other headings** have no pill and use the secondary color.
  - **Behind each heading:** the same see-through, blurred page color as the top bar, across the list's width.
- **Live:** the words follow the clock. At midnight, "Today" becomes "Yesterday".
- **For screen readers,** each day is a heading over a list of its legs. Its words are read normally ("Thursday, Oct 16"), not in capitals.

### 4.4 Rows

- **Layout:** a glass card with a 14 px radius and 12 px by 10 px of padding. It holds, 12 px apart:
  - **An icon in a circle:** 36 px, in the leg's color at 20%. The icon is 15 px, in the leg's color.
  - **Two lines:**
    - the title, 15 px, semibold;
    - the times, 12 px, in the secondary color, 3 px below.
  - **The right-hand column,** at least 56 px wide and right-aligned (§4.8).
- **Spacing:** rows and gap lines in a day are 6 px apart.
- **Taps:** rows don't respond to taps yet. In 3B, tapping a row picks its day on the calendar, as in the app.

### 4.5 Titles

| Leg | Title |
|---|---|
| Flight or jumpseat | "{flight}: {from} → {to}", for example "UPS2961: RFD → SDF", or just "RFD → SDF" when there's no usable flight number |
| Turn | "Turn in Louisville", else "Turn at SDF", else "Turn" |
| Layover | "Layover in Ontario", else "Layover at ONT", else "Layover" |
| Home stop | "Home" |
| Base stop | "At base in Louisville", else "At base in SDF" |
| Drive | "Driving home: SDF → RFD" or "Driving to work: RFD → SDF" |
| Reserve | "RSV-A in Louisville", else "RSV-A at SDF", else "RSV-A" |
| Hot standby | "Hot Standby in Louisville", and so on |
| Training or event | "CQ Training in Louisville", and so on |

- **The label** of a reserve, hot standby, training or other event is its name as the status page already has it: the reserve code ("RSV-A"), "Hot Standby", the training's name, or the event's title.

- **{flight}:**
  - a flight or jumpseat entered with its airline: the code as entered and the number, "AA1234";
  - a UPS company flight, entered without an airline: "UPS" and the number, "UPS2961", as Duty writes it;
  - ground transport: "GND";
  - a jumpseat entered without an airline: the number alone, "2961".
- **"In" or "at":** "in" with the city's name from the airport list, else "at" with the airport code. For a base stop, the code also takes "in", as the status page says "at base in SDF".

### 4.6 Icons and colors

| Leg | Icon | Color |
|---|---|---|
| Trip flight with UPS, the company flights ★ | package | UPS brown (dark mode's gold) |
| Trip flight with another airline, such as a commercial deadhead ★ | that airline's icon | that airline's color |
| Trip flight with no airline, such as a placeholder number | airplane | blue |
| Ground transport ★ | car | blue |
| Jumpseat entered with its airline | that airline's icon | that airline's color |
| Jumpseat entered without an airline | seat | green |
| Turn | clock with an arrow | orange |
| Layover | bed | yellow |
| Home stop | house | green |
| Base stop ★ | buildings | blue |
| Drive | car | green when it ends at home, else blue |
| Reserve | clock | red |
| Hot standby | lightning bolt | orange |
| Training or event at the pilot's home airport | house | green |
| Training or event at the pilot's base | buildings | blue |
| Other training or event | book | purple |

- **★ marks the three fixes** to the app (decision 2). Each matches what the status page shows at the same moment.
  - **Trip flights go by the airline the site works out,** as the status page does: the code entered, else UPS for a company flight. The app's list knows an airline only for commercial deadheads, so it shows every other trip flight as a blue airplane, a FedEx pilot's company flights included.
  - **Jumpseats go by the airline entered for them,** as in the app (decision 7).
- **Airline icons and colors** come from the site's airline table, as on the status page.
- **Icons:** the site's Phosphor icons stand in for SF Symbols, as everywhere else:
  - package Package, airplane Airplane, car Car, seat Seat, clock with an arrow ClockCounterClockwise;
  - bed Bed, house House, buildings Buildings, clock ClockCountdown (as on the status page), lightning bolt Lightning, book BookOpen;
  - the empty state's calendar CalendarBlank.
  - Seat and ClockCounterClockwise are new to the site.
- **"Home" and "base"** are the pilot's home airport (or base, when no home is set) and base, the same ones the status page uses.

### 4.7 Times

- **The second line** is the start and end times in the visitor's time zone, each with its zone, in lower case: "6:05am edt – 7:40am edt".
- **24-hour devices** get "06:05 edt – 07:40 edt", as the rest of the site does.
- **Each zone abbreviation is the one in force at that time.** A December leg viewed in October reads "est".

### 4.8 The right-hand column

- **Two lines,** 2 px apart:
  - **The label,** 9 px: "Ends in" while the leg is happening, "Starts in" for the next leg, else "Duration".
  - **The time,** 11 px, with digits of equal width.
- **Values:**
  - **Happening now:** the time left. It's semibold, in the leg's color.
  - **The next leg:** the time until it starts. The label and time are cyan, and the time is semibold.
  - **Every other leg:** its length, regular weight, in the secondary color.
- **Formats:**
  - **A day or more:** "1d 4h", or "1d" on the hour.
  - **Under a day, for "Ends in" and "Starts in":** "3:12:45", or "12:09" under an hour, ticking every second.
  - **Under a day, for "Duration":** "4h 30m", "4h" or "35m".
- **For screen readers,** the time is in words, "Starts in 3 hours, 12 minutes", as on the countdown cards. It isn't read out as it ticks.

### 4.9 Happening now, up next, and ending at home

- **Happening now** means started and not yet ended:
  - The row's edge is 2 px, in its color at 50% (green at 50% when it ends at home).
  - Its icon pulses gently, fading to about half and back roughly once a second (`.symbolEffect(.pulse)`).
- **Up next** means the first leg that hasn't started:
  - **The edge** is a 2 px ring of cyan and blue with fainter cyan and blue, turning once every 4 s.
  - **A red "UP NEXT" tag:** 11 px, bold, white, in a capsule with 8 px by 3 px of padding, 6 px from the row's top and 8 px from its right. As in the app, it sits over the top of the right-hand column.
- **Ending at home** means:
  - a flight, jumpseat or drive that lands at the pilot's home airport;
  - or a training or other event at it.
  - Such a row has a green edge at 50% when it isn't happening now or up next. For screen readers, it says "Arriving at home airport", the app's hint.
- **Reduced motion:** no pulse, and the up-next edge is a still cyan ring at 60%, as in the app.
- **Live:** when a leg starts, its row switches to "Ends in", and the edge and tag move to the next leg.

### 4.10 Gaps

- **When:** between two legs on the same day, when the second starts at least a minute after the first ends.
- **Look:** a dashed line, 1 px wide and 20 px tall, under the icons' centers, and beside it a label, 11 px.
- **Label and color** go by the second leg:
  - "Home 2h" in green;
  - "Turn 45m" in orange;
  - "Layover 3h 10m" in blue;
  - else "Gap 1h 25m" in the secondary color.
  - The line is the same color at 40%.
- **Lengths** use the "Duration" formats.

### 4.11 Where it opens

- **The list opens at the day of the next leg.** With no next leg, it opens at the day of the leg happening now, and with neither, at today.
- **That day's heading sits just under the top bar.** It's the stuck heading, so it's yellow, or green when it's today.
- **If that day has no section,** for example today with no legs, the list opens at the top.
- **The page appears already there.** The app scrolls down to it as the screen opens.

### 4.12 No legs

- **When there are no legs at all,** the list shows the app's empty state, centered with 32 px of padding:
  - a calendar icon, 40 px;
  - "No schedule data", 15 px;
  - "Schedule will appear when your pilot's Duty app sends trip details.", 12 px.
  - All three are in the secondary color, 12 px apart.

### 4.13 Data and timing

- **One clock:** the page ticks every second from the same clock as the status page.
- **One copy of the data:** both pages use the same data and the same background refresh. When new data arrives, the list updates in place. It doesn't scroll back to its opening day.
- **Light and dark mode, and Increase Contrast,** use the site's existing colors.

## 5. How it's built

### 5.1 New files

- **`src/ui/scheduleFacts.ts`:** the list as plain data.
  - the days and their legs;
  - each row's title, icon, color, and whether it ends at home;
  - the leg happening now, the next leg, the gaps, and the day to open at.
- **`src/copy/schedule.ts`:** the words and numbers:
  - day headings, times, durations and gap labels;
  - the right-hand column's text, and its spoken form.
- **`src/ui/SchedulePage.tsx`:** the page itself:
  - the top bar, the day sections and their rows, and the empty state;
  - the opening position, and which heading is stuck.
- **`src/ui/hooks/useSchedulePage.ts`:** the address:
  - whether the schedule is open;
  - opening and going back with the browser's history;
  - the status page's scroll position, and handing focus back.
- **`src/ui/Chevron.tsx`:** the chevron, drawn as a short stroked line with round ends, as the in-flight map's arrow is, pointing right on the cards and left on the back button.
- **`src/styles/schedule.css`:** the page's styles.
  - The turning edge is a conic gradient behind a ring mask, rotated with a CSS animation, which works in Safari 14.1.
  - The see-through bars use `-webkit-backdrop-filter`.

### 5.2 Changes

- **`src/ui/ScheduleScreen.tsx` becomes `src/ui/PilotPages.tsx`.**
  - It loads the data and shows the status page or the Schedule page, so its old name would clash with the new page.
  - Its job doesn't change otherwise.
- **The status page and its cards:**
  - The four cards in §3.1 take the schedule link and its chevron.
  - The status page adds the View Schedule button by its new rule.
- **The data:** each flight and jumpseat keeps the airline code as entered, beside the airline the site works it out to be.
  - The list's titles need it ("AA1234", "2961").
  - It also decides whether a jumpseat gets its airline's look or the seat.
  - Nothing on the status page changes.
- **Icons:** Seat and ClockCounterClockwise join the icon list, and `npm run icons` regenerates `iconPaths.ts`.

## 6. Security and privacy

Nothing new: no requests, storage or scripts. The content security policy is unchanged.
- The page's styles live in its stylesheet.
- The few values that change while it runs, such as the stuck heading's offset, are set through the CSSOM, which the policy allows.

## 7. Deliberate differences from the app

- **The three fixes (decision 2):**
  - the base stop's title, icon and color;
  - each trip flight's airline look: the UPS package for company flights, and the airline's own for any other airline entered;
  - the car for ground transport.
- **The View Schedule button's rule (decision 4):** it shows whenever no card leads to the schedule.
- **Flight numbers:**
  - A placeholder number such as XXXX shows just the route. The app shows "UPSXXXX".
  - A commercial ticket entered without an airline shows its number alone. The app writes "UPS" before it.
- **Time zones:** each time carries the abbreviation in force at that time. The app uses today's for every row.
- **24-hour devices** get 24-hour times, as on the rest of the site. The app always shows "6:05am".
- **Opening:** the list appears at its opening day. The app scrolls down to it as the screen opens.
- **The web's own parts:**
  - the address, `#schedule`, and the browser's Back;
  - moving focus for keyboards and screen readers;
  - countdowns read in words.

## 8. Testing

- **`scheduleFacts`:**
  - every row in §4.5 and §4.6, including the three fixes and each flight-number case;
  - grouping by the visitor's day, including a leg across midnight and a daylight-saving change;
  - happening now, up next and ending at home;
  - gaps: when they show, and their labels;
  - the day to open at, in every case of §4.11;
  - the report leg is left out.
- **`copy/schedule`:**
  - the day headings, including across midnight;
  - the times in 12- and 24-hour formats, with each instant's zone abbreviation;
  - every duration format, and the spoken form.
- **The status page:**
  - each card in §3.1 carries the link and the chevron;
  - the View Schedule button shows exactly when none of them is on the page;
  - the narrative, location, in-flight and trip progress cards don't link.
- **Getting there and back:**
  - opening changes the address;
  - Back returns, with the status page's scroll position and focus;
  - the page's back button after a direct load stays on the site;
  - a reload at `#schedule` opens the schedule;
  - the loading, error and empty screens ignore the address.
- **The page:**
  - its headings and lists;
  - the stuck heading;
  - the opening position;
  - the empty state;
  - the live switch when a leg starts;
  - reduced motion.
- **Styles:**
  - the sizes and colors above;
  - the pill colors;
  - no new `<style>` elements.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`.
- **In the browser:**
  - the page at phone width in light and dark, in demo scenes with flights, a layover, a turn, a drive, reserve and training;
  - the turning edge and the pulse, and both with reduced motion;
  - Back and swipe-back;
  - the look check with the user, against the app on their phone.

## 9. Decisions log

| # | Decision | Source |
|---|---|---|
| 1 | Slice 3 in three parts: 3A the page and its list with the ways in and out, 3B the calendar, 3C side by side on wide screens. | User, 2026-10-12 |
| 2 | Fix three app quirks so the list matches the status page: "At base in …" with buildings in blue, the UPS look for company flights, and a car for ground transport. | User, 2026-10-12 |
| 3 | The schedule gets its own address on the same page, `#schedule`, so Back and bookmarks work. | User, 2026-10-12 |
| 4 | The page and the ways in as mocked up, with View Schedule shown whenever no card leads to the schedule. | User, 2026-10-12 |
| 5 | The row rules and the page's behavior in §4. | User, 2026-10-12 |
| 6 | The back button copies iOS 26's: a chevron in a round glass button. | Design, copying the app |
| 7 | A jumpseat goes by the airline entered for it: its airline's look with one, the green seat without. | Design, from decision 2's table |

## 10. Roadmap

1. Slice 3B: the month calendar above the list.
2. Slice 3C: side by side on iPad and desktop.
3. Still on the list from Part C: longitude's spelling (`GeoPoint.lon` where the rest of the site uses `lng`), and one source for the delay.
