# Crewluve Web — Slice 2, Part B1: the location card

Status: approved in brainstorming on 2026-10-10. It follows Part A, the trip cards, which went live the same day (`docs/superpowers/specs/2026-10-10-crewluve-web-slice2a-trip-cards-design.md`).

## 1. Goal

Add the Crewluve app's location card, `LocationCardView`'s standard view in `PilotStatusView.swift`. It's the card that tells the family where the pilot is right now:

- the city, with a flag for countries the app has flags for;
- the current weather there;
- the pilot's local time;
- how far ahead of or behind home that is;
- a small 24-hour sun dial in the card's corner, showing day, night, sunrise, sunset and where the sun is now.

The look copies the current app. The weather comes from Open-Meteo, a free, keyless, worldwide weather service, because the app's Apple WeatherKit isn't available to websites. The user approved Open-Meteo on 2026-10-10. Sunrise and sunset are worked out on the site. CrewLu Cloud access is unchanged and still read-only.

## 2. Part B is split in two

| Part | What |
|---|---|
| **B1 (this spec)** | The location card: city and flag, weather, current time, time difference, the small sun dial |
| B2 | The full-screen popup that opens when you tap the dial (`SunCircleDetailView`): the big dial with home time and the departure countdown arc, weather animations, daylight length, sunrise and sunset, moon phase |

The user chose "card first, popup next" on 2026-10-10. In B1 the dial isn't tappable yet.

## 3. Where the card goes and when it shows

The app's order is: narrative → countdowns → View Schedule → **location card** → upcoming trip / trip progress → sync bar. So on the site, the card goes between the home or away cards and the trip cards from Part A.

- **Hidden while the pilot is flying** (status `inFlight`). The app swaps in its in-flight map there, and Part C brings that. The app checks only `inFlight`, so the card shows in every other status, including drives and jumpseat commutes.
- **Where the pilot is:** the snapshot's `status.airport`, as slice 1 works it out. With no airport (the "On duty" fallback), the header reads "Unknown Location" and nothing else shows, as in the app.

## 4. The card

Copies `standardLocationView`. Mockups approved on 2026-10-10: a daytime Anchorage layover, and home at night.

**Header row**
- A red map-pin icon (Phosphor `MapPin`, filled, `--red`) and the city name (20 px semibold). The city name comes from the airport list's `city()`, with the code as fallback.
- At the right, the country's flag emoji, for the 74 countries in the app's own flag list (`countryFlags` in `AirportDataProvider.swift`, Canada through Jordan). None shows for the US, or for countries the app has no flag for. The airport list's country names already follow the app's spellings (Part A §6), so the app's names match directly.

**Weather row**, when weather has loaded:
- the condition icon (about 22 px, in its own color), the temperature (20 px bold), and the condition in words (15 px, secondary);
- below it, a small credit, "Weather: Open-Meteo", linking to open-meteo.com. It opens in a new tab with `rel="noopener noreferrer"`. Open-Meteo's free tier asks for credit (CC BY 4.0), as WeatherKit does in the app.

While the weather is loading, or if it couldn't be fetched, the row shows a plane icon and the airport code in secondary text instead, as in the app.

**Current time row**
- A blue clock icon, then "Current time:" (15 px, secondary), then the pilot's local time in blue, 20 px bold with steady-width digits.
- It uses the visitor's 12- or 24-hour setting, like the rest of the site, and updates on the minute.

**Time difference**, indented under the time (12 px), comparing the pilot's time zone with home's (`homeTz`, as for the card subtitles). "You" in the app means the family at home.
- "4h behind you", "1h 30m ahead of you", or "30m ahead of you". The numbers are blue when ahead and orange when behind; "h", "m" and the words are secondary.
- When the hours match exactly, it reads "same time as you" (secondary).
- **Odometer:** like the app's default style, the hours count up from 0 one step at a time, and the minutes then fade in. Each hour takes about 150 ms. People who ask for reduced motion see the final text at once.

## 5. The 24-hour sun dial

Copies `SunCircleView` at the card's size, 160 pt with a 42 pt radius and the app's other proportions. It shows only the parts the app draws at that size; the popup adds the rest in B2. It sits in the card's upper right, overlapping the card's right side as in the app, and scales down on narrow phones.

**Layout**
- The whole day goes around the circle once. Midnight is at the bottom, 6 am at the left, noon at the top and 6 pm at the right, so the sun moves clockwise. The angle is `90° + (minutes since local midnight / 1440) × 360°`, measured clockwise from 3 o'clock, in the pilot's time zone.

**What it draws:**
- **Sky:** the circle filled with the app's colors at 25% opacity: navy at night, amber at sunrise and sunset, and sky blue in the day. The color changes 2% of the day before sunrise and after sunset, and 4% of the day into daylight, as in the app.
- **Daylight arc:** sunrise to sunset, 2.5 pt, orange to yellow to orange.
- **Night arc:** sunset to sunrise, 2 pt, dashed (4, 3), blue to gray to blue.
- **Glow bands,** 30 minutes each and never more than half the daylight, 2.5 × the day arc's width:
  - amber golden hour after sunrise and before sunset;
  - blue twilight before sunrise and after sunset.
- **Markers:** ticks at sunrise and sunset; a small triangle at noon (top) and at midnight (bottom).
- **Now:** a faint hand from the center to the current time, ending in a sun icon in daylight (yellow with an orange glow, like the app's multicolor sun) or a gray moon icon at night.
- **Labels:** "Noon" above the top triangle, and the sunrise and sunset times beside their ticks. The app writes these as "8:12a" and "6:41p". 24-hour visitors get "08:12" and "18:41" instead.

It updates every minute.

**No sunrise or sunset today** (polar day or night, as at Utqiaġvik in midwinter): no dial, just as the app shows none without sun times.

**Screen readers** hear the dial as one image: "Sunrise 8:12 AM, sunset 6:41 PM, daytime in Anchorage".

## 6. Data

**Sun times are worked out on the site** (`src/time/sun.ts`). It uses the NOAA solar formulas with the standard sunrise and sunset zenith of 90.833°, for the pilot's local date at the airport's latitude and longitude. That way:
- the dial doesn't depend on the weather service;
- the demo's dial works with no network;
- the times are always for the pilot's own day. The app takes "today" from the viewer's calendar.

The tests check the results against NOAA Solar Calculator times, worked out separately with NOAA's own formulas, for several airports and dates, to within 2 minutes.

**Weather** (`src/data/weather.ts`):
- **The request:** `https://api.open-meteo.com/v1/forecast?latitude=…&longitude=…&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit|celsius`.
  - The latitude and longitude are the airport's, from the airport list, rounded to 2 decimals.
  - It's a plain GET with `cache: 'no-store'`, `credentials: 'omit'` and `referrerPolicy: 'no-referrer'`. Besides the URL, only the headers every browser sends go with it.
- **Units:** Fahrenheit where Apple's weather format, which the app uses, gives it: the US, Puerto Rico, the Bahamas, Belize, the Cayman Islands and Palau (US, PR, BS, BZ, KY, PW). The region is read with `Intl.Locale(navigator.language).maximize()`. Everyone else gets Celsius.
- **Rounding:** the temperature shows as whole degrees, as "41°", rounded like the app's format. Halves round to the even number (40.5 shows 40°), and a reading just below zero shows "-0°".
- **Parsing:** the reply is checked for finite numbers and a known code. Anything else counts as no weather. No text from the reply is ever shown; the words come from the site's own table.
- **Freshness:** results are kept in memory for each airport and unit for 15 minutes, like the app's cache. The site fetches again when the pilot's airport changes, every 15 minutes, and when the page becomes visible again with stale weather. A request that takes more than 10 seconds counts as a failure. A failure shows the plane-and-code row and tries again at the next refresh, so it never retries rapidly. Nothing is stored on the device; `no-store` keeps the reply out of the browser's cache too.

**Weather codes to words and icons** (`src/copy/weather.ts`): Open-Meteo's WMO codes map to the app's wording (Apple's condition names). The icon and color come from the site's Phosphor set. At night, clear-sky codes get moon icons (`is_day`).

| Codes | Words | Icon (day / night) |
|---|---|---|
| 0 | Clear | Sun / Moon |
| 1 | Mostly Clear | Sun / Moon |
| 2 | Partly Cloudy | CloudSun / CloudMoon |
| 3 | Cloudy | Cloud |
| 45, 48 | Fog | CloudFog |
| 51, 53, 55 | Drizzle | CloudRain |
| 56, 57 | Freezing Drizzle | CloudRain |
| 61, 63, 80, 81 | Rain | CloudRain |
| 65, 82 | Heavy Rain | CloudRain |
| 66, 67 | Freezing Rain | CloudRain |
| 71 | Flurries | CloudSnow |
| 73, 77, 85 | Snow | CloudSnow |
| 75, 86 | Heavy Snow | CloudSnow |
| 95, 96, 99 | Thunderstorm | CloudLightning |

Colors: sun orange, moon indigo, clouds and fog gray, rain blue, snow cyan, lightning yellow. Partly cloudy takes the sun's or the moon's color.

The Phosphor icon set (`scripts/build-icons.mjs`) gains Moon, CloudSun, CloudMoon, CloudFog, CloudRain, CloudSnow and CloudLightning. It already has Sun, Cloud, MapPin, Clock and Airplane.

**Time difference:** the pilot's zone offset minus home's at the current moment, in hours and minutes.

**Demo:** made-up weather for each airport in the demo, shown in the visitor's units: Lexington 58° Clear, Louisville 66° Clear, Miami 84° Partly Cloudy, Rockford 61° Cloudy, Anchorage 41° Cloudy, Orlando 79° Partly Cloudy, Ontario 75° Clear. It makes no network calls, like the rest of the demo. Sun times are worked out for the demo moment as usual.

## 7. Security and privacy

- **CSP:** `connect-src` gains exactly one address, `https://api.open-meteo.com`, and nothing else changes.
- **Read-only guarantee:** the weather fetch is a GET with no body. It passes the existing read-only scan, which allows read-only fetches like the airport list. The CrewLu Cloud guard (`readOnlyFetch`) is untouched.
- **What Open-Meteo sees:** the airport's rounded coordinates, the visitor's internet address, and the headers every browser sends: the site's address (crewluve.crewlu.net), the browser's name and its language. It never sees names, the account or the schedule. The user approved this on 2026-10-10.
- **Tests never use the network:** the weather module takes its fetch function as an argument, and the suite's network guard stays in place.

## 8. Deliberate differences from the app

1. Sun times are worked out on the site rather than taken from the weather. The dial shows even when weather fails, works offline in the demo, and uses the pilot's own date.
2. Weather comes from Open-Meteo, mapped to the app's wording, rather than Apple WeatherKit. The icons are the site's.
3. 24-hour visitors get 24-hour dial labels.
4. Only the default time-difference animation. The app hides two others behind a tap, as with Part A's city styles.
5. No quick-status or "Sleeping" notes, because those come from the pilot's phone, not CrewLu Cloud.
6. The card is hidden in flight until Part C's map takes its place.
7. The dial isn't tappable until Part B2.
8. A difference under an hour reads "30m ahead of you", as the app's other two styles write it. The app's odometer shows "0h 30m".
9. During ground transport the card shows, with the departure city, as it does for a drive. Slice 1 gave ground legs their own status instead of "In Flight" (its deliberate difference 9). The app counts them as flights, so it shows its in-flight map there.

## 9. Testing

- **Sun:** NOAA reference sunrise and sunset to within 2 minutes for SDF, ANC, MIA, HKG and CGN on fixed dates, including a DST changeover. Polar night and polar day return none. The local date is respected for a zone far ahead of UTC.
- **Weather data:** the URL is built from rounded coordinates and the unit. Good replies parse; bad ones (missing fields, NaN, an unknown code) give null. Units come from the locale. The cache keeps results for 15 minutes and refreshes when stale. A failure gives null and doesn't retry until the next refresh. The demo makes no fetch.
- **Copy:** every WMO code maps to words and an icon, with night variants. The time difference reads ahead, behind, minutes only, or same time. Flags exist for the app's list only.
- **Dial:** angles for midnight, 6 am, noon and 6 pm; the arcs run from sunrise to sunset; the sun or moon icon matches day or night; labels in 12- and 24-hour; no dial on a polar day; the screen-reader label.
- **Card:** the header, the weather row and its fallback, the time, the time difference and its odometer end state, and reduced motion.
- **Screen:**
  - placement between the countdowns and the trip cards;
  - hidden in flight;
  - "Unknown Location" with no airport;
  - each demo scene shows or hides the card as expected.
- **CSP:** the test pins the added `connect-src` address.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`.

## 10. Decisions log

| # | Decision | Source |
|---|---|---|
| 1 | Part B splits into B1 (the card) and B2 (the popup). | User, 2026-10-10 |
| 2 | Weather comes from Open-Meteo, which sees only the airport's coordinates. | User, 2026-10-10 |
| 3 | The card's look and behavior, as mocked up on 2026-10-10. | User |
| 4 | Sun times are worked out on the site with the NOAA formulas. | Design |
| 5 | Hidden in flight; otherwise shown, "Unknown Location" with no airport, as in the app. | Design (copying the app) |
| 6 | The time difference compares with home's zone, and only the default odometer animation is copied. | Design (Part A precedent) |
| 7 | Flags come from the app's own 74-country list. | Design (copying the app) |

## 11. Roadmap

1. Part A follow-ups: high-contrast colors, and city names from the app's table (Part A spec §13).
2. **Part B2:** the sun dial popup.
3. Part C: the in-flight map.
4. Slice 3: the Schedule page.
