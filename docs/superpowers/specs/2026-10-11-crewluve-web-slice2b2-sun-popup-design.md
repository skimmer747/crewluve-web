# Crewluve Web — Slice 2, Part B2: the sun dial popup

Status: approved in brainstorming on 2026-10-11. It follows Part B1, the location card, which went live the same day (`docs/superpowers/specs/2026-10-10-crewluve-web-slice2b1-location-card-design.md`).

## 1. Goal

Add the full-screen popup that opens when you tap the location card's sun dial. It copies the Crewluve app's `SunCircleDetailView` (`SunCircleDetailView.swift`) and the parts of `SunCircleView` that the app draws only at the big size (`size > 160` in `PilotStatusView.swift`). The popup shows:

- the city, the pilot's local time and home's time;
- a big 24-hour dial with home's time, the hours both places are in daylight, and the next departure;
- the dial's turn-taking loop: an arrow from home's time to the pilot's, then a sweep to the next departure;
- the weather, with the app's animations playing behind the card;
- the daylight length, sunrise and sunset, the moon phase, and where the pilot is.

It needs no new service or network request. Everything comes from data the site already has, or is worked out on the site.

## 2. Scope

The user chose to build all of the app's popup in one part on 2026-10-11:

- the popup and how it opens and closes (§3, §4);
- the big dial with its popup-only layers and its loop (§5);
- the rows under the dial (§6);
- the weather animations (§7).

## 3. Opening and closing

- **Opening:** tap or click the sun dial on the location card. The dial's whole 160 px box is a button, as the app's whole dial is its tap area. Keyboard users can press Enter or Space on it. The popup zooms up: a spring in which the big dial grows from half size and fades in, and the backdrop fades in.
- **Closing:** the close button, the Escape key, a tap on the backdrop, or dragging the card down more than 100 px. A shorter drag springs back. Closing takes 0.2 s, ease-out, back to nothing.
- **It closes by itself** when the card's dial goes away: at takeoff, or when the location has no sun times.
- **While it's open:** the page behind doesn't scroll and is hidden from screen readers. Focus moves to the close button, Tab stays inside the popup, and focus returns to the dial afterwards.
- **Reduced motion:** the popup appears and leaves without the zoom.

## 4. The popup card

It copies `SunCircleDetailView`, as in the day and night mockups approved on 2026-10-11.

- **Backdrop:** black at 30% with a blur, covering the page.
- **Card:** up to 360 px wide, leaving at least 8 px of screen on each side, with a 28 px corner radius. The big dial fills the card's width. It has the site's frosted glass and a soft shadow (black 20%, 20 px blur, 10 px down). It scrolls inside when the screen is short.
- **Light by day, dark at night:** the card uses the light colors only when it's daytime where the pilot is and the visitor's device is in light mode. Otherwise it uses the dark colors, as the app does.

From top to bottom:

1. **Drag handle:** a 36 × 5 px capsule in the secondary color at 40%, with 12 px above and 8 px below.
2. **Header:** the red map pin and the city (20 px semibold), then the close button at the right: Phosphor `XCircle`, 22 px, secondary color. 20 px sides, 4 px below.
3. **Times:** at the left, a sun (orange) or moon (indigo) icon at 15 px, then the pilot's local time. At the right, home's time, then a green house icon. The times are 20 px semibold rounded with steady digits, in the visitor's 12- or 24-hour style ("10:05 PM" or "22:05"). They update each second. 20 px sides, 8 px below.
4. **The big dial** (§5), 360 px, smaller on narrow screens.
5. **Weather**, when it has loaded (§6).
6. **A divider** with 24 px side insets and 12 px above and below.
7. **The rows** (§6), 12 px apart, with 24 px below the last.

## 5. The big dial

The card's dial grows a size setting, as the app's `SunCircleView` has one. The card uses 160 and the popup 360. Every card-size measurement scales by size ÷ 160, which is 2.25 at 360. The parts below draw only at the big size.

### 5.1 Always-shown layers

- **Home time**, when the pilot's clock differs from home's at that moment:
  - a dashed green line from the center to home's time (green at 60%, `max(1, 0.8 × scale)` wide, dashes 4 × scale and 3 × scale);
  - a green house icon (`10 × scale`) on the circle at home's time.
- **Shared daylight**, when the clocks differ and home's sun times exist:
  - a pale yellow wedge (yellow at 15%) over each span when both places are in daylight, placed by home's clock;
  - a white arc (80%, 1.5 × the daylight arc's width, round ends) along the same spans.
  - The spans come from a port of the app's `SharedDaylight` (§8).
- **The next departure**, while it's ahead:
  - a cyan hand (40%) from the center to the scheduled departure time;
  - a small cyan triangle (40%) just outside the circle there, pointing in, like the noon marker but turned to face the center;
  - a cyan plane icon (`10 × scale`) just beyond it, pointing along the dial's direction of travel;
  - the scheduled time as a cyan label (`9 × scale`, medium), placed and kept inside the box like the sunrise label.
- **A delay or early departure** of 15 minutes or more adds a red hand (40%), a red plane and a red label at the actual departure time.

### 5.2 The loop

- **Turn 1, home time** (when the clocks differ):
  - An arrow draws along a circle at 0.70 × the radius, from home's time to the pilot's. It goes clockwise when the pilot is ahead and counterclockwise when behind.
  - It's blue when ahead and orange when behind, at 70%, `2 × scale` wide with round ends. A triangular arrowhead (`5 × scale`, sides 25° off the arc) leads it.
  - In the middle: "+6h", "-4h", "+5:30" or "-9:30" (`10 × scale` semibold rounded), over "ahead" or "behind" (`7 × scale` medium rounded), in the arrow's color.
- **Turn 2, next departure** (when one is ahead):
  - A cyan arc sweeps clockwise from now's time along a circle at 0.85 × the radius.
  - A departure more than a day ahead sweeps one dashed lap (dashes `4 × scale`, `3 × scale`) per full day, then a solid arc for the rest.
  - The cyan runs to the actual time, but never past the scheduled time. A late departure continues in red (80%) from the scheduled time to the actual time.
  - A departure under 15 minutes off counts as on time, so its sweep is cyan all the way to its actual time.
  - When the scheduled time has already passed but the flight hasn't left, the sweep is cyan to the actual time, as the app draws it.
  - A plane (`8 × scale`) rides the arc's leading end, pointing along it. It's red when late, green when early, and cyan otherwise.
  - In the middle: the countdown to the actual departure ("1d 3h", "1d", "5h20m", "5h" or "45m", `10 × scale` semibold rounded), over "to go" (`7 × scale` medium rounded), in the plane's color.
- **Timing**, copying the app:
  - Each turn draws in over 0.8 s with an ease-out curve. The departure sweep takes 0.8 s × the number of days ahead, with a minimum of one.
  - At 2.0 s from the start of the turn, it fades out over 0.6 s. At 2.8 s it's gone, and the next turn starts after a 0.3 s pause.
  - A sweep that takes longer than 2 s starts fading before it finishes, as in the app.
  - The middle text fades with its arc.
  - With neither turn, nothing moves.
- **Reduced motion:** nothing sweeps. Both arcs are drawn in full and stay still, with their planes and arrowhead at the ends. The middle shows the departure countdown when a departure is ahead, and otherwise the time difference.

### 5.3 Labels and the screen reader

- Every label scales from the card's size. At 360 that's "Noon" at 18 px and the time labels at 20.25 px.
- The big dial is one image to screen readers, with a description like this: "Sunrise 8:30 AM, sunset 7:03 PM, nighttime in Anchorage, 4 hours behind you. Next departure 3:25 AM, in 5 hours, 20 minutes."
  - The departure time is the actual one, even when it's under 15 minutes off.
  - A delay or an early departure of 15 minutes or more is named right after the time, before the countdown, so it can't be heard as part of it: "Next departure 4:05 AM, 40 minutes late, in 6 hours."
  - Parts that don't apply are left out.

## 6. The rows

- **Weather**, when it has loaded:
  - the condition icon (28 px), the temperature (22 px bold) and the words (15 px, secondary), 12 px apart, with 8 px above;
  - the icon, its color and the words come from the card's table. Day or night comes from the card's sun times (B1 §6).
- **Daylight length:** an orange sun icon, then "10h 33m of daylight" (15 px medium). This is sunset minus sunrise, never less than zero, and always shows both the hours and the minutes.
- **Sunrise and sunset:** an orange sunrise and an indigo sunset, 24 px apart (15 px).
  - The icon is Phosphor `SunHorizon` for both, colored.
  - The times are in the pilot's zone, in the visitor's 12- or 24-hour style.
- **Moon phase:** a drawn moon icon (secondary color), then the phase name (15 px medium), using Apple's eight names: New Moon, Waxing Crescent, First Quarter, Waxing Gibbous, Full Moon, Waning Gibbous, Third Quarter, Waning Crescent.
- **Where:** a red pin with an area (Phosphor `MapPinArea`), then "In Anchorage" (15 px, secondary).
- **Credit**, when there's weather: the card's "Weather: Open-Meteo" link, 4 px above.

**Without weather:** there's no weather row, no credit and no animation. The rest of the popup works the same, since the dial needs only sun times.

## 7. Weather animations

They play behind the whole card, copying `WeatherBackgroundView`. Each is drawn on a canvas with particle positions worked out from time, as in the app.

| Animation | When (the card's words) | What it draws (the app's numbers) |
|---|---|---|
| Sun rays | Clear, Mostly Clear, by day | 12 rays from a point 85% across and 12% down, turning at 0.15 rad/s. Each runs from 20 px out to 60–180 px, pulsing. 3.5 px wide, orange and yellow by turns, at 12–27% |
| Stars | Clear, Mostly Clear, at night | 40 stars, 1–3 px, twinkling between 20% and 80% |
| Rain | Drizzle, Freezing Drizzle, Rain, Heavy Rain, Freezing Rain | 60 drops, 12–20 px long, falling at 280–480 px/s with an 8 px slant, 1.5 px wide, blue (every third cyan) at 25–40% |
| Snow | Flurries, Snow, Heavy Snow | 35 flakes, 2–5 px, falling at 30–70 px/s and swaying 15–40 px, white at 40–70% |
| Clouds | Partly Cloudy, Cloudy | 7 soft clouds, 120–270 × 50–100 px, drifting at 8–23 px/s, gray-blue at 25–45% |
| Thunderstorm | Thunderstorm | The rain, plus a flash every 6 s: white at 25% over the card for a moment, with a jagged white bolt (4 segments, 2 px) |
| Fog | Fog | 4 wide soft bands, 60–100 px tall, rising and falling 20–50 px, gray at 15–30% |

- **Priority**, as in the app: thunderstorm, snow, rain, fog, clouds, then clear.
- **Day or night** for the clear sky comes from the card's sun times.
- **Running:** the animation runs only while the popup is open and the page is visible. It fades in and out with the popup.
- **Reduced motion:** no animation.
- **Softness:** clouds and fog are softened with radial gradients, because Safari before version 18 can't blur on a canvas.

## 8. Data

- **The next departure** is the snapshot's next flight (`nextFlight`). The scheduled time is its scheduled start, and the actual time is its estimated start.
  - The difference counts as late or early only at 15 minutes or more either way, as slice 1 decided (its decision 9) for every delay on the site.
  - That rule decides only whether the departure is marked late or early. The countdown, the description and the layers always use the actual time, as the page's sentence does.
  - The departure layers and the sweep show while the actual time is still ahead.
- **Home's sunrise and sunset** come from the B1 sun formulas, for the home airport (`pilot.effHome`) on home's local date. They're needed only for the shared daylight.
- **Shared daylight** is a port of the app's `SharedDaylight.windows`:
  - Times are hours on home's clock, from 0 to 24.
  - The result is no span, one, or two: the pilot's daylight can wrap past midnight on home's clock and split in two.
  - There's no span when home's sunrise isn't before its sunset.
  - Spans of about a second or less are dropped, by the app's own filter (more than 1/3600 of an hour).
- **The time difference** is the pilot's zone offset minus home's at that moment, as on the card.
  - "+6h" when it's whole hours, otherwise "+5:30". The sign is "+" when the pilot is ahead or level.
- **The countdown:**
  - Days and hours when it's a day or more ("1d 3h", or "1d" when the hours are zero).
  - Otherwise hours and minutes with no space ("5h20m"), "5h" when the minutes are zero, or minutes alone ("45m").
- **The moon phase** comes from the moon's age:
  - The age is the time since the new moon of 6 January 2000, 18:14 UTC, modulo the synodic month of 29.530588853 days.
  - The name comes from eight equal parts centered on new moon, first quarter, full moon and third quarter.
  - The icon draws the lit part for the exact age.
- **The loop** is a timeline: a pure function from the time since the popup opened to how far each arc has drawn and how faded it is. The dial reads it on every animation frame.
- **No storage, and no new network requests.**

## 9. How it's built

- **The screen** keeps whether the popup is open. It draws the popup after `<main>`, not inside the location card, because the card's frosted glass would trap a full-screen overlay inside the card. While the popup is open, `<main>` is hidden from screen readers, and made inert where the browser supports it.
- **The location card's dial** becomes a button. B1's `pointer-events: none` is lifted, since the dial now takes taps, as in the app.
- **`SunDial`** gains the size setting and the popup-only layers.
- **New modules:**
  - the moon phase;
  - shared daylight;
  - the popup's words: daylight, the time difference, the countdown, moon names, and the big dial's description;
  - the weather-to-animation table;
  - the loop's timeline;
  - the particle formulas;
  - the weather backdrop (the canvas);
  - the popup itself;
  - its stylesheet.
- **Colors:** a dark set the popup can switch to at night. A test keeps it identical to the page's own dark colors.
- **Icons:** `XCircle`, `SunHorizon` and `MapPinArea` join the Phosphor set.

## 10. Security and privacy

- No new service, no new network request, and no change to the CSP.
- The read-only scan covers every new file. The canvas only draws.
- Nothing is stored on the device.

## 11. Deliberate differences from the app

1. A delay or early departure shows only at 15 minutes or more, as everywhere on the site (slice 1 decision 9). The app marks any offset.
2. The sunrise, sunset and departure times follow the visitor's 12- or 24-hour setting. The app's popup always shows 12-hour times.
3. The moon phase is worked out on the site. Near a change, its name may switch up to a day apart from Apple's.
4. There's no windy animation, because Open-Meteo has no windy condition.
5. Clouds and fog are softened with gradients rather than blur.
6. People who ask for reduced motion get no zoom, no sweeping loop and no weather animation. The app animates regardless.
7. The popup opens without weather, leaving out the weather row, the credit and the animation. In the app the dial itself needs weather.
8. Home's sunrise and sunset are worked out on the site rather than taken from home's weather, extending B1 §8 item 1.
9. The particles come from the site's own seeded hash, so their positions aren't identical to the app's.
10. Keyboard and screen-reader support: Enter or Space opens it, Escape closes it, and focus stays inside while it's open.

## 12. Testing

- **The moon:** phases against published new-moon and full-moon times, to within a day, and the eight names at their part boundaries.
- **Shared daylight:**
  - the app's cases: overlapping days, a pilot day that wraps past midnight on home's clock and splits in two, no overlap, and home's degenerate polar data;
  - tiny spans are dropped.
- **Words:**
  - daylight, including a zero clamp;
  - the time difference: whole hours, half hours, ahead, behind and level;
  - the countdown: every form;
  - the moon names;
  - the big dial's description with and without each part.
- **Geometry:**
  - scaled measurements at 360;
  - the home arrow and arrowhead, both ways;
  - departure arcs within a day, with laps beyond a day, and with a delay extension;
  - the turned triangle, the plane positions and angles, and the shared-daylight wedge.
- **The loop's timeline:**
  - progress and fade at 0, 0.4, 0.8, 2.0, 2.3, 2.6, 2.8 and 3.1 s;
  - the departure turn's longer sweep for far-off departures;
  - a skipped turn when it doesn't apply, and no motion at all;
  - reduced motion.
- **The weather animations:**
  - every weather word to its animation, in the app's priority order, with day or night;
  - particle counts and motion over time;
  - the backdrop doesn't draw for reduced motion or without weather, and stops when closed or hidden.
- **The dial at 360:** each layer shows or hides by its rule, the loop runs, and reduced motion holds still.
- **The popup:**
  - it opens from the dial by click, Enter or Space;
  - it closes by the button, Escape, the backdrop and a drag, and closes by itself when the dial goes away;
  - focus moves in and returns, and Tab stays inside;
  - the page behind is hidden from screen readers and doesn't scroll;
  - dark at night and light by day, following the device;
  - the rows, the case without weather, and reduced motion.
- **The colors:** the popup's dark set matches the page's dark colors exactly.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`, then a look check with the user before release.

## 13. Decisions log

| # | Decision | Source |
|---|---|---|
| 1 | Part B2 includes all of the app's popup: the popup, the big dial with its loop, the weather animations and the rows. | User, 2026-10-11 |
| 2 | One dial with two sizes, like the app's `SunCircleView`. | User, 2026-10-11 |
| 3 | The popup's layout and behavior, as in the day and night mockups. | User, 2026-10-11 |
| 4 | The big dial's loop and layers, as in the storyboard. | User, 2026-10-11 |
| 5 | The rows, the moon phase worked out on the site, and the seven weather animations. | User, 2026-10-11 |
| 6 | How it's built and tested (§8–§12). | User, 2026-10-11 |
| 7 | Delays count at 15 minutes or more, following slice 1's decision 9. | Design |
| 8 | Reduced motion: no zoom, a still dial with both arcs drawn, and no weather animation. | Design |
| 9 | The countdown, the description and the layers use the actual departure time however little it's off; the 15-minute rule decides only the late or early marks, so a departure under 15 minutes off sweeps cyan to its actual time. | Review of the build, 2026-10-11 |
| 10 | The description names a delay or an early departure before the countdown. | Review of the build, 2026-10-11 |
| 11 | When the scheduled time has passed but the flight hasn't left, the sweep is cyan to the actual time, as in the app. | Review of the build, 2026-10-11, copying the app |

## 14. Roadmap

1. Part A follow-ups: high-contrast colors, now also covering the location card's and the popup's small text, and city names from the app's table.
2. Part C: the in-flight map.
3. Slice 3: the Schedule page.
