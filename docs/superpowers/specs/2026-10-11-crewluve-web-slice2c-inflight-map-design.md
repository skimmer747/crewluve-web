# Crewluve Web — slice 2, Part C: the in-flight map

Status: approved in brainstorming on 2026-10-11, from the mockups of the card and the tracking popup. Parts A (trip cards), B1 (location card), B2 (sun popup) and the Part A follow-ups are live. Part C was first scoped in the Part A spec (§2): the in-flight map, drawn by the site itself like the app's custom `FlightRouteMapView`, with no map service.

## 1. Goal

While the pilot is in the air, show what the Crewluve app shows in the location card's place: a drawn map of the flight, with the route, day and night, the plane's position and the distance, then a delay banner and an info bar. The flight number opens the app's small tracking popup, with links to FlightRadar24 and FlightAware.

## 2. Scope

The user chose the whole card and the tracking popup, in one part (decision 1):

- the in-flight card: the map (§4), the delay banner (§5.1) and the info bar (§5.2);
- the tracking popup (§6).

## 3. When it shows

- **While the pilot is in the air:** the snapshot's status is `inFlight`, and its current leg is a flight or a jumpseat. The app shows its in-flight view on `displayStatus == .inFlight`, which covers both (decision 3).
- **Where:** in the location card's place, between the countdown and the trip cards. The location card is already hidden in flight (B1 §3), so the two never show together.
- **Not during ground transport:** a ground leg has its own status on the site, and the location card shows then (B1 §8 item 9). The app counts ground legs as flights and shows its map; that difference stays.
- **Unknown airport:** when either airport is missing from the site's list, the map shows the app's fallback (§4.8). The banner and the info bar still show.

## 4. The map

It copies `FlightRouteMapView.swift` line for line, except where §10 says otherwise. All sizes are CSS pixels, equal to the app's points.

### 4.1 Size and layout

- **200 px tall**, the card's full width, with the card's 20 px radius on its top corners only.
- **Laid out at the card's real width**, like the app's `GeometryReader`, and again whenever that width changes. Until the width is known it uses 343 px, a phone's card width.
- **60 px of padding** on every side of the drawing area: points are projected into the box inside it.

### 4.2 Bounds and projection

- **The route:** a great circle between the two airports, as 51 points (50 segments), using the app's spherical interpolation. Two airports less than 0.0001 rad apart give the start point.
- **Across the antimeridian:** when the airports lie in different hemispheres (one longitude ≥ 0, the other < 0) and the way west is shorter than the way east, every negative longitude gets 360 added for the layout. A flight from Anchorage to Tokyo is drawn continuously, not split at the date line.
- **The box:** the smallest latitude and longitude range holding both airports and all 51 points. Each axis is padded by 15% of its span. If the longitude span is then under half the latitude span, it's widened to 0.6 × the latitude span, evenly on both sides.
- **The projection:** x = 60 + (longitude − min) / span × (width − 120), and y = 60 + (1 − (latitude − min) / span) × (200 − 120). A span of zero puts the point in the middle.

### 4.3 The sky

- **Daylight at each end:** the sun's altitude at the departure airport at the departure time, and at the arrival airport at the arrival time (§7). Above −0.833° counts as daylight, as in the app.
- **The altitude** comes from the site's own sun module: the NOAA formulas behind the location card's sunrise and sunset. The app's formula is wrong by up to two hours, so the site doesn't copy it (§10, item 8).
- **Both ends the same:** a top-to-bottom gradient of the day pair or the night pair.
- **Ends that differ:** a left-to-right gradient. It uses only the first color of each pair: the left airport's color on the left, the right airport's on the right.
  - **The transition:** the app samples the flight every 5 minutes along its route. At the first sample whose daylight differs from the one before, it calls that progress (i − 0.5) / n the sunrise or sunset point.
  - **Its position:** it sits at x = the departure's x + (the arrival's x − the departure's x) × that progress, as a fraction of the width. The sky holds the left color up to 0.075 before it and the right color from 0.075 after it.
  - **No sample, or a flight of 30 minutes or less:** a plain left-to-right gradient.
- **Colors (RGB 0–1, fixed, as in the app):**

  | | Light, first | Light, second | Dark, first | Dark, second |
  |---|---|---|---|---|
  | Day | 0.85, 0.92, 0.98 | 0.75, 0.85, 0.95 | 0.12, 0.18, 0.30 | 0.10, 0.15, 0.26 |
  | Night | 0.70, 0.80, 0.92 | 0.65, 0.75, 0.88 | 0.04, 0.08, 0.16 | 0.02, 0.05, 0.12 |

### 4.4 The route and its arrow

- **The line:** the 51 points joined, 3 px wide, with round caps and joins.
  - **Color:** blue in light mode at full strength; cyan in dark mode at 80%.
  - **Fading:** a left-to-right gradient across the map's whole width, at 75%, 100% and 75% of that strength.
  - **Glow:** the route color at 50%, 4 px of blur.
- **The arrow:** at point 25 (the middle), pointing along the route from point 24.
  - **Shape:** a 3 px chevron, round caps. Its tip is 12 px ahead, and its arms 9.6 px out at ±2.5 radians from the heading.
  - **Color:** the route color at full strength, glowing at 80% with 4 px of blur.

### 4.5 The airports

Each airport has a column centered on its projected point, 4 px between lines:

1. **A sun or a moon**, 14 px, by the daylight of §4.3: a yellow sun or a blue moon, each glowing in its own color at 80% with 4 px of blur.
2. **The code**, 16 px bold rounded, in the primary color.
3. **The city**, 11 px medium, secondary color, on one line: the airport list's `city()`.
4. **The local time**, 10 px medium, primary color, on one line.
   - **Format:** "MO 5:40AM": the first two letters of the weekday, then the time with no space before AM or PM. In 24-hour mode it reads "MO 05:40" (§10, item 3).
   - **When:** the departure's time in its own zone, and the arrival's time in its own zone. The line is left out when the zone isn't known.

**Text colors:**
- **Primary:** black in light mode, white in dark.
- **Secondary:** RGB 0.4, 0.4, 0.45 in light mode, and the system gray in dark.

### 4.6 The plane

- **When:** only while the flight is under way, from its estimated departure to its estimated landing (§10, item 1).
- **Where:** at the great-circle point for its progress, from 0 at departure to 1 at landing.
- **Heading:** toward the point 2% further along. Near the end, when that point is the same or under 1 px away, it's taken from the point 2% behind instead.
- **How it looks:**
  - a blue glow, 30 px across at 30%, blurred 8 px;
  - a plane icon, 20 px, in the primary color, with a blue glow at 80% and 4 px of blur.
  - The site's plane icon points up rather than right, so it's turned by the heading plus 90°.

### 4.7 Duration and distance

Centered 20 px above the map's bottom edge, 8 px apart:

- **The duration**, when it's over zero: a 10 px blue timer icon, then 12 px medium rounded text in the primary color. It's the scheduled block time, as "5:00", or "45m" under an hour.
- **The distance:** a 10 px blue left-right arrow icon, then "2,706 nm" in the same style. It's the haversine distance (radius 6,371 km) in nautical miles, rounded down, with a thousands separator.

### 4.8 Fallback

When either airport is unknown:
- the sky is the day pair, top to bottom;
- in the middle, 8 px apart: a 24 px plane icon, and the codes as "ANC → SDF" in 14 px medium. Both are in the secondary color.

### 4.9 Updates

- **The plane** moves with the screen's own clock, which ticks every second. The app's map ticks every 10 seconds.
- **The rest:** the route, the box and the sky are worked out again only when the flight, its times or the width change.

### 4.10 For screen readers

The map is one image with a spoken description, which the app doesn't have (§10, item 5). Its parts are left out when they don't apply:

- "Flight from Anchorage to Louisville, 2,706 nautical miles, 5 hours, about a third of the way". The duration is the site's spoken form ("5 hours, 20 minutes").
- The progress is in plain words, by the nearest of 0, ¼, ⅓, ½, ⅔, ¾ and 1: "just taking off", "about a quarter of the way", "about a third of the way", "halfway", "about two thirds of the way", "about three quarters of the way" and "about to land".

## 5. Under the map

### 5.1 The delay banner

- **When:** only when the departure is 15 minutes or more off schedule, as everywhere on the site (§10, item 2).
- **What it says:**
  - "DELAYED 1h 30m" beside a warning triangle, on orange;
  - "EARLY DEP 20m" beside a check in a circle, on green.
  - Durations read "1h 30m", "1h" or "45m".
- **How it looks:** white 12 px bold text, the icon 12 px, 6 px apart. It spans the card's width, with 6 px of padding above and below.

### 5.2 The info bar

- **Left**, 2 px between lines:
  - **The flight number:** 18 px heavy rounded, in the bar's primary color, underlined in the same color at 30%. It's a button that opens the tracking popup (§6). Without a flight number there's no line and no popup.
    - **Text, as the pilot's Duty app writes it:** "UPS2962" for company flights (airline 5X), the airline and digits for others ("DL1235"), and the digits alone without an airline.
  - **"In Flight"**, 11 px medium, in the bar's secondary color. In flight the app sets no current city, so it shows this fallback.
- **Right**, aligned right, 2 px between lines:
  - **The local time:** a 12 px location-arrow icon, then the current time, 16 px semibold with steady digits. It's in the arrival airport's zone, or the departure's when that's unknown, in the site's short format ("11:19 AM"). It updates every second.
  - **The arrival code**, 10 px medium, secondary color.
- **The bar:** 16 px padding on the sides and 10 px top and bottom, over its own background. It takes the card's 20 px radius on its bottom corners.
- **Colors (fixed, as in the app):**
  - primary: RGB 0.1, 0.15, 0.25 in light mode, white in dark;
  - secondary: RGB 0.3, 0.38, 0.5 in light mode, the system gray in dark;
  - background: RGB 0.65, 0.78, 0.90 at 60% in light mode, RGB 0.08, 0.12, 0.25 at 60% in dark.

### 5.3 The card

The map, the banner and the bar sit stacked with no gaps, inside the site's frosted card with its 20 px radius.

## 6. The tracking popup

It copies `FlightTrackingPopupView.swift`, as in the mockup approved on 2026-10-11 (decision 8).

- **Opening:**
  - The flight number opens it, by tap, click, Enter or Space.
  - The page behind is dimmed (black at 30%, over a blur) and hidden from screen readers.
  - The card springs in from half size and transparent, and fades and shrinks back out in 0.2 s. Visitors who ask for reduced motion see it appear and go at once, as the sun popup does.
- **Closing:** the ✕ button, a tap outside the card, or Escape. Focus goes back to the flight number.
- **The card:** up to 340 px wide, 20 px padding, 16 px between rows, frosted, with a 28 px radius. It's a dialog named by its heading.
  - **The header:** a blue plane icon, then the flight number in its ICAO form, 20 px bold. On the right is a close button: a 22 px gray ✕ in a circle, labelled "Close".
  - **"Track this flight"**, 15 px, secondary color.
  - **Two links**, each in a row: a 20 px icon in a 32 px column, then the name (17 px semibold) over a caption (12 px, secondary color), then a 15 px "opens elsewhere" icon in the secondary color. Each row has 14 px padding and a 14 px radius.
    - **FlightRadar24**, "Live tracking map": a broadcast icon, on blue at 12% with blue text. It links to `https://fr24.com/{callsign}`.
    - **FlightAware**, "Flight status & history": a GPS-fix icon, on orange at 12% with orange text. It links to `https://www.flightaware.com/live/flight/{callsign}`.
  - The links open in a new tab with `rel="noopener noreferrer"`, so the tracking sites aren't told which page sent the visitor. Following one closes the popup, as the app's buttons do. Screen readers hear "(opens in a new tab)".
- **The callsign**, with the app's `FlightTrackingHelper` airline codes:
  1. **The ICAO airline:** the site has the airline and the digits apart, so it swaps the airline's IATA code for its ICAO code directly. The map is 5X→UPS, FX→FDX, AA→AAL, DL→DAL, UA→UAL, WN→SWA, B6→JBU, NK→NKS, F9→FFT, AS→ASA, HA→HAL, OO→SKW, YX→RPA, MQ→ENY and OH→PSA. Codes it doesn't map stay as they are.
  2. **The callsign** is that code and the digits, in capitals: "UPS2962", "DAL1235". The popup's header shows it too.
  3. **No links:** without an airline or digits, or when the result holds anything but letters and digits, there are no links. The popup then shows only its header (the info bar's flight number) and "Track this flight", as the app does.
  4. **The app's way:** it splits its flight number at the first digit instead, which misses airline codes with a digit in them. B6 reads "B61234" there and "JBU1234" on the site (§10, item 9).

## 7. Data

Everything comes from what the site already has; there are no new requests.

| What | From |
|---|---|
| The flight | The snapshot's current leg in flight: departure and arrival codes, estimated departure and landing (`start`, `end`), scheduled times (`schedStart`, `schedEnd`), airline and number |
| The departure and arrival times on the map | The estimated times, `start` and `end` (§10, item 1) |
| The duration | The scheduled block time, `schedEnd − schedStart`, as in the app |
| The delay | `departureOffset` of the scheduled and estimated departure: 15 minutes or more (slice 1 decision 9) |
| Positions, cities and zones | The airport list: latitude, longitude, `city()` and `tz()` |
| The time | The screen's clock |

## 8. How it's built

- **Pure modules for the math, each ported from the app with its tests:**
  - the great circle, the box, the antimeridian and the projection;
  - the sky's colors and stops;
  - the sun's altitude, added to the site's sun module beside sunrise and sunset, and the sunrise or sunset point along the route;
  - the plane's position and heading;
  - the distance, the duration and the labels;
  - the callsign and the tracking links.
- **The map:** a Preact component drawing one SVG at the measured width, with HTML columns for the airports and the duration and distance. Its colors are CSS custom properties: the app's fixed colors as fixed values, and its system colors as the site's theme colors.
- **The card:** a component, `InFlightCard`, that the status screen draws in the location card's place while the pilot is in the air.
- **The popup:** a component, `TrackingPopup`, drawn after `<main>` like the sun popup. It reuses the sun popup's dialog behavior: focus, Escape, the inert page and focus returning.
- **Icons:** the site's Phosphor icons. It already has the plane, sun, moon, warning, location arrow and ✕ in a circle. Part C adds a timer, left-right arrows, a broadcast, a GPS fix, "arrow square out" and a check in a circle.
- **Styles:** a new stylesheet for the card and the popup, imported by `main.tsx` like the others.

## 9. Security and privacy

- No new requests, scripts or storage, and the CSP is unchanged. Links are ordinary navigation, which the visitor chooses to follow.
- The tracking links carry the flight number, which is public, and nothing else. They send no referrer.
- Nothing reads tables the site doesn't already read. The read-only scan covers every new file.

## 10. Deliberate differences from the app

1. **The plane's progress, the sky and the airport times** use the site's estimated departure and landing. Then the plane always agrees with the site's "landing in 49m" countdown. The app moves the plane on the scheduled block time, shifted by the departure delay.
2. **The delay banner** shows only at 15 minutes or more off schedule, as everywhere on the site. The app shows any delay.
3. **Times follow the site's 24-hour setting.** The app's map labels are always 12-hour.
4. **FlightRadar24 opens its website.** The app tries the FlightRadar24 app first. On an iPhone with that app installed, the website may hand over to it.
5. **Screen readers get more than in the app:** the map's spoken description, an "In flight" heading for the card, and "Time in Louisville" before the info bar's time.
6. **There's no map during ground transport,** where the location card shows (B1 §8 item 9).
7. **"EARLY DEP" uses a check in a circle,** since the site's icon set has no clock with a check badge.
8. **The sun's position comes from the site's own sun module,** the NOAA formulas behind the location card's sunrise and sunset (decision 9).
   - **The app's error:** its map has its own formula, whose equation-of-time term is wrong. Its day and night run up to about two hours early or late, depending on the season.
   - **The evidence:** run unchanged, the app's code puts Louisville's sunrise on 15 October 2026 at 10:02 AM, and on 15 March at 5:56 AM. The US Naval Observatory says 7:52 AM and 7:54 AM.
   - **Where it shows:** the site and the app differ only within about two hours of sunrise or sunset.
9. **The tracking flight number is built from the airline and the digits,** which the site has apart. The app splits its flight number at the first digit, so airline codes with a digit in them (B6, F9, 5X) never reach its ICAO table. The difference shows only for those airlines.

## 11. Increase Contrast

The Part A follow-ups' rule applies: a color that's a system color in the app follows the setting, and a fixed one stays.

- **Follows:**
  - the route's blue or cyan;
  - the sun, the moon, the plane's glow and the small icons;
  - the banner's orange or green, which uses the readable fills behind its white text;
  - the popup's blue and orange;
  - the dark mode's system gray.
- **Stays:** the sky's colors, and the map's and bar's fixed text colors and backgrounds.

## 12. Testing

- **The math (unit tests),** against the app's formulas and cases worked by hand:
  - the great circle: its ends, its middle, and two airports at the same place;
  - the box and the projection, including a route across the antimeridian (Anchorage–Tokyo) and a north–south route that gets widened;
  - the sun's altitude: at solar noon on the solstice, at midnight, and its sunrise and sunset crossings for Louisville. The crossings are checked against the US Naval Observatory's times for 15 October and 15 March 2026, within 2 minutes;
  - the daylight threshold, the midnight sun and the polar night;
  - the sunrise or sunset point, its stops at the edges, and flights of 30 minutes or less;
  - the plane's position and heading, near both ends;
  - the distance (Anchorage–Louisville, 2,706 nm), the durations "5:00" and "45m", the delay texts, the labels in 12- and 24-hour modes, and the spoken description;
  - the tracking flight numbers and links, including airline codes with a digit in them, no airline, no digits, and anything but letters and digits.
- **The card (component tests):**
  - It shows in flight and on a jumpseat, and not during ground transport or on the ground. It's in the location card's place.
  - The map draws the route, the arrow, both airports and the plane, or the fallback when an airport is unknown.
  - The banner shows at 15 minutes and not at 14, in both directions.
  - The info bar has the flight number in Duty's form, "In Flight", the arrival's time and code, and no flight number line without a number.
  - It lays out again when the width changes.
- **The popup (component tests):**
  - It opens by the flight number, with focus on ✕.
  - It closes by ✕, by the backdrop and by Escape, with focus going back to the flight number.
  - Its links have the right addresses, a new tab and no referrer.
  - The page behind is inert.
- **The styles:** the colors, the readable fills on the banner, and the stylesheet imported.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`.
- **Look check with the user:** the demo's `flying` scene (Louisville → Rockford) and its `last-leg` scene (Anchorage → Louisville, 40 minutes late, with the banner). Each is checked in light and dark, at phone width, with the popup open, and with the high-contrast rules switched on by the Part A follow-ups' script.

## 13. Decisions log

| # | Decision | Source |
|---|---|---|
| 1 | Part C is the whole in-flight card and the tracking popup. | User, 2026-10-11 |
| 2 | The map is drawn by the site itself, as SVG like the sun dial, with no map service. | Part A §2 (2026-10-10), user 2026-10-11 |
| 3 | It shows while the pilot is in the air, on flights and jumpseats, in the location card's place. Ground transport keeps the location card. | B1 §3 and §8 item 9, user 2026-10-11 |
| 4 | The plane, the sky and the airport times follow the site's estimated departure and landing. | User, 2026-10-11 |
| 5 | The delay banner shows at 15 minutes or more. | Slice 1 decision 9, user 2026-10-11 |
| 6 | Times follow the 24-hour setting. | User, 2026-10-11 |
| 7 | FlightRadar24 opens its website. | User, 2026-10-11 |
| 8 | The popup copies the app as mocked up, with its text exactly ("Flight status & history"). | User, 2026-10-11 |
| 9 | The map's day and night come from the site's own sun module, not the app's formula, which is wrong by up to two hours. | User, 2026-10-11 |

## 14. Roadmap

1. Slice 3: the Schedule page, with the View Schedule button and the upcoming trip card's tap-through (Part A §2).
