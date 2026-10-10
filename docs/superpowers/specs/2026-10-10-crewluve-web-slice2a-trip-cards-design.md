# Crewluve Web — Slice 2, Part A: trip cards

Status: approved in brainstorming on 2026-10-10. Builds on slice 1 (`docs/superpowers/specs/2026-10-08-crewluve-web-slice1-design.md`), which is live at https://crewluve.crewlu.net.

## 1. Goal

Add the two trip cards from the Crewluve app's main screen:

- **Upcoming trip**, shown while the pilot is home or at base: the trip type, when it departs, how many days it lasts, and the route as a row of airport dots.
- **Day N of M**, shown during a trip: "Day 2 of 4", a progress bar, and the next three cities as colorful pills.

The look copies the current Crewluve app (`UpcomingTripCard.swift`, `TripProgressView` in `PilotStatusView.swift`). The data comes from what the site already reads from CrewLu Cloud. There are no new tables, no new network requests at run time, and the site stays read-only.

## 2. Slice 2 is split into three parts

Slice 2 ("the rest of the Crewluve main screen", slice 1 spec §13) was about as big as all of slice 1, so the user chose to build it in three rounds. Each round gets its own spec, plan, build and release.

| Part | What | Notes |
|---|---|---|
| **A (this spec)** | Upcoming trip card, Day N of M card with upcoming cities | Uses data the site already has. |
| B | Location card: local time, time difference, weather, 24-hour sun dial and its popup | Needs a free, keyless weather service (the app uses Apple's WeatherKit, which a website can't). |
| C | In-flight map: great-circle route, day and night shading, plane position, distance | Drawn by the site itself, like the app's custom `FlightRouteMapView`; no map service. |

The **View Schedule button** and the upcoming-trip card's **tap-through arrow** both open the Schedule page, which arrives in slice 3. They move to slice 3, so nothing on the site leads nowhere (user decision, 2026-10-10).

## 3. Where the cards go and when they show

The app's main screen order (`PilotStatusView.swift`) is: narrative → countdown cards → View Schedule → location card → upcoming trip → trip progress → sync bar. With parts B and C and the View Schedule button still to come, the site's order becomes:

1. Title, demo banner (built)
2. Narrative card (built)
3. Home cards (Leaves Home In, days-home pill) or the away card (Back Home In / fallback) (built)
4. **Upcoming trip card** (new) or **Day N of M card** (new)
5. Footer (built)

Part B will put the location card between 3 and 4, and slice 3 adds the View Schedule button there too.

Visibility follows the app's `isSettled` rule (`PilotDisplayStatus.swift`: home or base):

- **Upcoming trip card:** status is `home` or `base`, and a trip lies ahead.
- **Day N of M card:** status is anything else, and a trip covers now. That's Duty's `findCurrentTrip`, written as start ≤ now < end, the same test slice 1 uses for a trip whose flights are all hidden.
  - The end is the later of two times: the stored release time (`trips.end_date`) and when the trip's last flight actually lands.
  - Duty keeps the release time when flights run late. Without this, a late final flight would drop the card just before landing (Batch B review; §10 item 8).

So the two never show together.

- **At base:** the upcoming trip card appears alongside the Back Home In countdown, as in the app.
- **Overnight at home or base in the middle of a trip:** the status is settled, so the upcoming trip card shows the rest of that trip, again as in the app (§10 item 9).
- **Between trips:** neither card shows. That covers driving to work before a trip starts, driving or commuting home after one has ended, and reserve or training days.

## 4. Upcoming trip card

Copies `UpcomingTripCard.swift`. Mockup approved on 2026-10-10.

**Header row**
- **Type badge:** a blue capsule with an airplane icon and "Line Trip" in white. The app infers Reserve, Hot Standby or Training from the trip's own legs, but on CrewLu Cloud those duty events never belong to a trip, so the app always shows Line Trip. The site shows Line Trip and doesn't carry the other three.
- **Departure line:** "Departs today at 11:32am", "Departs tomorrow at 11:32am", or "Departs Tue Oct 13 at 11:32am" (abbreviated weekday and month, as in the app). It uses the pilot's home time zone, like slice 1's card subtitles, and the viewer's 12- or 24-hour preference. 24-hour gives "at 23:32", fixing the app's fixed "h:mma".
- **Days:** "1 day" or "N days". This is the same trip length slice 1's narrative uses (`tripDays`: `trips.days` when above 0, else the calendar-day count in the base time zone).
- **Delay badge:** "Delayed" (orange) or "Early" (green), with a clock icon. It shows when slice 1's snapshot reports a 15+ minute departure delay (`DELAY_THRESHOLD_MIN`) on a flight of this trip.

**When it departs.** If slice 1's bounded commute rule finds a logged jumpseat from home to the trip's first airport (`Snapshot.nextCommute`), the departure is that jumpseat's start. Otherwise it's the trip's first flight's start, which already includes a known delay. The app adds the trip flight's delay to the commute's time as well; the site doesn't.

**Route row.** The trip's remaining flights (those starting after now) in order, each departure and arrival added once (deduplicated, as the app does). Home is put first when a commute jumpseat was found, unless the route already has it. It shows up to 6 stops. The first and last dots and codes are blue, the middle ones gray, joined by short gray lines. Codes are bold monospace. The row scrolls sideways if it ever runs out of room.

**Not on the site yet:** the chevron and the tap-through to the Schedule (slice 3).

## 5. Day N of M card

Copies `TripProgressView` with its default "gradient pills" style. The data rules follow Duty's `calculateTripOverview`.

- **Header:** a blue calendar icon and "Day N of M".
- **Day N:** calendar days since the trip started, plus one, counted in the **base time zone** and kept between 1 and M. Duty counts in UTC, which late in a US evening can read "Day 5 of 4" and overfill the bar.
- **M:** the same `tripDays` as the upcoming trip card.
- **Progress bar:** 10 px tall, rounded, gray track, blue fill N/M wide.
- **Upcoming Cities:** a small gray label, then up to **three** pills. They name the different cities, in order, that the trip's remaining flights land in. A flight counts as remaining while its start is after now. Cities are matched by name, as Duty does, so two airports in one city make one pill. The section is left out when no flights remain (for example, on the last leg).
- **Pills:** white bold city name over a small subtitle. The subtitle is the US state code for US airports, otherwise the country name (the app's `subtitleSuffix`: `state ?? country`). An airport missing from the site's list shows its code with no subtitle. The pill colors cycle through the app's five two-tone blends: blue→cyan, purple→pink, orange→yellow, teal→green, indigo→purple. Each pill is a capsule with a soft shadow, in a row that scrolls sideways.
- **Not copied:** tapping "Upcoming Cities" doesn't cycle the app's six hidden alternative styles (user decision, 2026-10-10).

## 6. Data: country names and US state codes

The pill subtitles need two things the airport list doesn't have yet. Today `public/data/airports.json` labels countries two ways: about 390 airports from Crewlu's own tables use names ("USA", "Germany"), and the other ~8,700 use two-letter codes ("US", "DE"). So `scripts/build-airports.mjs` gains two steps.

- **Country names.** Every row gets a name, spelled one way.
  - US rows, whether `US`, `USA` or "United States", become "USA", as the app writes it.
  - Two-letter codes become English short names via `Intl.DisplayNames` (style `short`): `GB` is "UK", `KR` is "South Korea", close to the app's own names.
  - The few long names that have a shorter form become it too, so "United Kingdom" also reads "UK".
  - Where ICU's English name differs from the spelling in the Crewluve app's own airport table (`AirportDataProvider.swift`), the app's spelling wins:
    - "Turkey" (not "Türkiye"), "Czech Republic", "Turks and Caicos", "Trinidad and Tobago" and "US Virgin Islands";
    - "UK" and "UAE";
    - "China" for Hong Kong, as the app's table files HKG.
  - Each country therefore has exactly one spelling.
  - **Guard:** the build stops, naming the country, if any would come out spelled two ways. A different Node/ICU version can rename one (an older ICU says "China mainland"), and the build logs the ICU version.
  - Other names stay as they are.
  - Nothing else on the site reads `country` today.
- **US state codes.** US rows gain a seventh field, the state code: `[iata, city, country, lat, lng, tz, state]`.
  - It comes from `iso_region` in the OurAirports list the Flight Globe keeps next to its generated airport list: `../crewlu-globe/scripts/ourairports.csv` (override with `AIRPORTS_REGIONS_SOURCE`), matched on `iata_code`. `US-KY` becomes `KY`.
  - Where the app's table gives the city's state rather than the airport's, the app wins: CVG is "OH" (Cincinnati) and IAD is "DC" (Washington).
  - DJT replaced PBI on 2026-08-18 and isn't in OurAirports yet, so it's set to "FL" by hand.
  - The CSV has quoted fields, so the script parses it properly. It stops with a clear error if the file is missing or damaged. Nothing is downloaded.
  - Other rows stay at six fields.
- **Reading it.** `src/data/airports.ts` reads the field into `Airport.state` (string or null). A 6-field row parses as `state: null`, so an old cached copy keeps working.
- **Size.** The file grows by roughly 50 KB uncompressed, a few KB once compressed.

## 7. Engine

The engine gains two pure functions, built with the same TDD and `RawBuilder` tests as slice 1. They live in a new `src/engine/trips.ts`.

```ts
interface UpcomingTrip {
  tripId: string
  /** When the pilot leaves for it: the logged commute jumpseat's start, else the first flight's start. */
  departs: number
  days: number
  /** Up to 6 airports: each remaining departure and arrival once, in order, with home first when a commute was found and isn't already on the route. */
  route: Iata[]
  /** The departure delay on this trip's flight when it's 15+ minutes off schedule; negative means early. */
  delayMinutes: number | null
}

interface TripProgress {
  tripId: string
  day: number // 1…days
  days: number
  /** Arrival airports of the trip's flights still to depart, in order, each once. Cities are matched and capped at 3 in the copy layer, where the airport list is. */
  upcoming: Iata[]
}
```

`Snapshot` gains `upcomingTrip: UpcomingTrip | null` and `tripProgress: TripProgress | null`. They follow the visibility rules in §3, so `StatusScreen` stays a thin view. "The next trip" is the trip of the first trip flight after now. It's the same flight slice 1 calls `nextTripFlight`, so hidden flights and trips stay out, as in slice 1 (C22). Overnight at home or base mid-trip, that's the rest of the current trip.

## 8. UI and copy

- `src/ui/UpcomingTripCard.tsx` and `src/ui/TripProgressCard.tsx`, in the same rounded card style as the existing cards (`.card` / `.glass`).
- `src/copy`:
  - a departure formatter, `tripCardDepartsText(ms, now, timeZone, h24)`;
  - a pill builder, `upcomingCityPills(codes, airports)`, which turns codes into `{ city, subtitle }`, matches cities by name, keeps 3, and falls back to the code.
- **Icons:** the Phosphor set (`scripts/build-icons.mjs`) gains a calendar and the delay badges' clock icons.
- **Accessibility:**
  - The route has a visually hidden sentence, "Route: Louisville, Rockford, Anchorage", and the dots are hidden from screen readers.
  - The progress bar is hidden from screen readers, since "Day 2 of 4" already says it.
  - The pills are a list.
  - The badges are text, so they read as "Line Trip" and "Delayed".
- **Light and dark:** the cards use the existing tokens. Blue is the app's system blue, already a token. The pill blends need five more iOS 26 system colors as tokens, in light and dark: cyan, pink, yellow, teal and indigo. The pills keep white text in both modes, as in the app.

## 9. Demo

The demo data doesn't change.

| Scene | Card |
|---|---|
| `home` | Upcoming trip: SDF · RFD · ANC, departing about a day ahead, 2 days |
| `base` | Back Home In countdown plus upcoming trip, departing within the hour |
| `flying`, `turn` | Day N of 2: Anchorage AK, Louisville KY |
| `layover` | Day N of 2: Louisville KY |
| `delayed`, `last-leg` | Day N of 2, with Louisville KY until the last flight leaves, then no pills |
| `driving-to-work`, `driving-home`, `commuting-home`, `reserve`, `training` | Neither card |

The demo is anchored to the moment the page loads, so N and the words "today" or "tomorrow" depend on the time of day.

## 10. Deliberate differences from the app

1. Day N is counted in the base time zone and capped at M (the app uses UTC and can overflow).
2. A commute counts only when it belongs to this trip (slice 1's bounded rule, §6.11 C7/C11/C22).
3. The departure time doesn't add the trip flight's delay to a commute's own time.
4. Only "Line Trip" is shown, because that's all CrewLu Cloud data can produce.
5. 24-hour time is respected.
6. No chevron, tap-through or View Schedule button until slice 3.
7. No hidden alternative city styles.
8. Day N of M stays up until the trip's last flight actually lands, even after the stored release time. Duty's `findCurrentTrip` drops it then.
9. Overnight at home or base mid-trip, the upcoming trip card gives the whole trip's length, matching the narrative's `tripDays`. The app counts only the remaining legs' days.

## 11. Testing

- **Engine (`tests/engine/trips.test.ts`):**
  - the next trip at home and at base;
  - deduplicated route capped at 6;
  - home put first for a bounded commute jumpseat, and ignored for a stale or other-trip one;
  - departs from the commute or the first flight;
  - delay and early badges at the 15-minute threshold;
  - null with no trip ahead;
  - day number in the base zone across midnight, and kept at M where UTC would overflow;
  - `days` falls back when `trips.days` is 0;
  - remaining arrivals in order without repeats;
  - null after the trip ends and at home or base.
- **Copy:**
  - departure text for today, tomorrow and later, in 12- and 24-hour;
  - pills match cities by name, keep 3, use state then country, and fall back to the code.
- **UI:**
  - both cards render from snapshots;
  - accessible names;
  - `StatusScreen` shows the right card per demo scene and none when null.
- **Data:**
  - the airport parser accepts 6- and 7-field rows;
  - the built file has `KY` for SDF and `AK` for ANC, no state for CGN, and country names "USA", "Germany" and "UK" where the source had `US`, `DE` and `GB`.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`. The read-only guard and the test network guard are unchanged.

## 12. Decisions log

| # | Decision | Source |
|---|---|---|
| 1 | Slice 2 is split into parts A (trip cards), B (location card) and C (in-flight map), each its own spec, plan and release. | User, 2026-10-10 |
| 2 | Part A goes first. | User |
| 3 | The View Schedule button and the card's tap-through move to slice 3, with the Schedule page. | User |
| 4 | Only the default gradient-pill city style is copied. | User |
| 5 | The two cards' look, as mocked up on 2026-10-10. | User |
| 6 | Day N uses the base time zone, capped at M. | Design |
| 7 | Slice 1's bounded commute rule is reused for the route and departure. | Design (slice 1 §6.11) |
| 8 | US state codes come from the globe's OurAirports copy at build time, and country codes become short English names. Where either differs from the Crewluve app's own airport table, the app wins (CVG OH, IAD DC, DJT FL; "UAE", "Turkey"…), so each country reads one way. The build stops if a country would read two ways. | Design (Batch A reviews) |
| 9 | Trip length is slice 1's `tripDays`, so it matches the narrative. | Design |
| 10 | Day N of M's trip window runs until the last flight actually lands when that's after the stored release time. | Design (Batch B review) |

## 13. Roadmap after Part A

1. Part B: location card (weather via a keyless service, local time, time difference, sun dial and popup).
2. Part C: in-flight map.
3. Slice 3: the Schedule page (calendar and timeline), with the View Schedule button and the trip card's tap-through.
4. The idea-board features and the optional family logins, as in slice 1 spec §13.
