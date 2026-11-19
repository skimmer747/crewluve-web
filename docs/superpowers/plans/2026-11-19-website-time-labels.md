# The Website's Time Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every time on the website says whose time it is, in the app's words: the family's own time ends in "L", another city's time has the city's name after it, takeoff and landing give both when the clocks differ, a new takeoff row with its weather, the newest event in bold, a key "L = your time (Eastern Standard Time)", and a hover tip with the zone's full name on every time.

**Architecture:**
- **One helper writes the labels:** `src/copy/clockLabel.ts`, the app's `ClockLabel`: `clockTime`, `yours`, `place`, `pair`, `key`, `zoneName`, `spoken`, `hasMark`. The shared cases (`tests/fixtures/trip-map/clock-label-cases.json`, a byte-for-byte copy of the app's) hold both sides to the same words.
- **The words** change where they're written: `copy/tripMap.ts`, `copy/facts.ts`, `copy/planePopup.ts`, `copy/weather.ts` (trip map), and `copy/format.ts`, `copy/narrative.ts`, `copy/schedule.ts` (status page).
- **The takeoff row:** `facts/takeoff.ts` (`takeoffOf`, the app's `MapLeg.takeoff`), the row in `facts/tripFactsRows.ts`, and its weather from Open-Meteo by the landing weather's own request at the departure airport and the takeoff hour (`takeoffToFetch`, `useTakeoffWeather`).
- **On the page:** `ui/clockParts.ts` finds each time in a line and whose it is; `ui/ClockText.tsx` wraps it in `<time datetime title>`, with "your time" for screen readers in place of the "L", and draws the key (`ClockKey`) and a lone clock (`ZonedTime`). `PilotPages` gives them the viewer's zone, the moment and the trip's cities (`ClockZonesContext`).

**Tech Stack:** Preact 10, TypeScript 5.9 (strict), Vite 5, Vitest 3. No new package.

**Sources (read only):**
- **The design:** `/Users/toddanderson/Dev/Crewluv/docs/superpowers/specs/2026-11-19-crewluve-time-labels-design.md` on the app's branch `feature/time-labels`. Every row of its tables in §3.2, §3.3, §3.4, §3.5, §3.7 and §3.8 that names the website is built here.
- **The app's code:** `Crewluv/Services/ClockLabel.swift` and commits `9f58115` (trip map), `0d704bd` (status screen) and `c96868c` (takeoff weather) on that branch. The words here are theirs.

**How this plan was written.** As the site's earlier plans were: the code was built first, test-first, in the worktree, and this plan records it. The new files are given in full by path (they're in the branch); the edits to existing files are listed by function with their words before and after, in the tables below. Nothing is committed: Todd looks first.

**Where this plan settles details.**
- **The weather at takeoff is on the website too.** The site has landing weather (Open-Meteo's hourly forecast, `fetchLandingForecast`), and Open-Meteo's forecast service serves past hours, so the takeoff row asks the same request for the hour the flight took off, at its departure airport (checked against Open-Meteo on 19 Nov 2026, Task 8). Each answer is kept, so the line stays until the gate. With no answer, the row has no second line, as in the app.
- **24-hour time:** `clockTime` writes a morning hour without a leading zero ("5:35"), as Apple's formatter does. Every labelled time goes through it. Unlabelled clocks the design leaves alone (the location card's "09:14", the sun popup's, the in-flight card's) keep the site's `shortTimeText`.
- **The status page's times are the viewer's now,** as the design says: the trip card and the countdown cards were in the home airport's zone. Two tests that pinned the home airport's zone now pin the viewer's (`StatusScreen.test.tsx` "dates the departure in the viewer’s zone …", `PilotPages.test.tsx` "shows the homecoming in the viewer's own zone …").
- **The arrival card** reads "Fri, Nov 20, 6:44 PM L · Lexington", with a comma for "at", as the app's now does (`formatHomeArrival`).
- **Screen readers:** each L time on the page is `<time>4:35 PM<span aria-hidden> L</span><span class="sr-only"> your time</span></time>`, so a reader hears "4:35 PM your time" and keeps the `<time>`. A fact row's sentence, already its own, goes through `spoken`. The spoken card sentences keep "your time", as before; the next departure in the card's sentence now says "your time" too (`tripMapSummary`, as the app's).
- **The key** shows under "Estimated from the schedule" in the facts' footer, and above the status page's footer.
- **The location card beside the dial:** "Current time in Anchorage:" is longer than "Current time:" was, so with the dial showing, the time goes on its own line under the label rather than under the dial. "Anchorage time" sits under the dial (`aria-hidden`: the dial's own description already names its times).
- **A time never breaks across lines** (`time { white-space: nowrap }`): the narrative had "12:34 PM" and "L." on two lines.
- **Not on the website:** "Last sync" (the site's footer says "Checked 5s ago", with no clock), lock-screen alerts.

**Questions for Todd:** none; the design is his.

---

## Ground rules

1. **Work only in this worktree:** `/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/time-labels`, branch `feature/time-labels`, made from `main` at `d4bf0b1`. Its `node_modules` is a link to the main checkout's (no install). Never edit the main checkout: its untracked plan file isn't this work's.
2. **`~/Dev/Crewluv` is read only.**
3. **Never commit or push without Todd's yes in the conversation.** A push to `main` deploys the live site.
4. **The shared cases are the judge.** `clock-label-cases.json` is the app's, byte for byte. If a case fails, the code is wrong.
5. **Tests:** `npx vitest run` in Eastern and in UTC (`TZ=America/New_York`, `TZ=UTC`), `npx tsc --noEmit`, `npm run build`.
6. **Reviewers:** `superpowers:code-reviewer` with `model: "sonnet"`.

## File map

| File | Task | What |
|---|---|---|
| `src/copy/clockLabel.ts` | new (1) | the app's `ClockLabel` |
| `tests/fixtures/trip-map/clock-label-cases.json` | new (1) | the app's shared cases, copied |
| `src/copy/tripMap.ts` | modify (2) | `placeChip`, `nextDepartureChip`, `landingLine`, `gateLine`, new `takeoffLine`, `landsAt`, `barArrival`, `timelineLine`, `tripMapSummary`; `timelineTime` in `clockTime` |
| `src/copy/facts.ts` | modify (2) | `milestoneLine`, `eventWhen`, `spokenLatestEvent`, `closestToHomeText`, `cockpitEventText`, new `cockpitGapText`, `groundSunText` (takes the city), `halfwayText`, `landsText` |
| `src/copy/planePopup.ts` | modify (2) | every time `yours` |
| `src/copy/weather.ts` | modify (2) | new `takeoffWeatherText` |
| `src/facts/takeoff.ts` | new (3) | `takeoffOf` |
| `src/facts/factRow.ts` | modify (3, 4) | kind `takeoff`; `rowSentence` spoken; `isCurrent` |
| `src/facts/tripFacts.ts` | modify (3, 4) | `takeoffForecasts`; `newestOf`, shared by the list and the banner; `isCurrent` |
| `src/facts/tripFactsRows.ts` | modify (3) | the takeoff row; the sky row's split; the city in the ground sun; `leavesRow` |
| `src/facts/landingWeather.ts`, `src/ui/hooks/useLandingWeather.ts`, `src/ui/PilotPages.tsx` | modify (5) | `takeoffToFetch`, `useTakeoffWeather` (the landing hook's fetching shared), passed to the facts |
| `src/ui/clockParts.ts`, `src/ui/ClockText.tsx` | new (6) | which time is whose; `<time>`, the key, a lone clock; `cityZones` |
| `src/ui/FactRowView.tsx`, `FactsFooter.tsx`, `TripSoFarList.tsx`, `TripMapCard.tsx`, `TripMapPage.tsx`, `TripTimeline.tsx`, `LatestEventBanner.tsx`, `PlanePopup.tsx`, `PilotPages.tsx` | modify (6) | times through `ClockText`; the key; `current` and ", latest"; the zones given |
| `src/styles/tripMap.css`, `base.css`, `cards.css` | modify (6, 7) | `.trip-so-far li.current`, `time` nowrap, `.clock-key` |
| `src/copy/format.ts`, `narrative.ts`, `schedule.ts` | modify (7) | the status page's words; `timeWithZone` gone |
| `src/ui/StatusScreen.tsx`, `UpcomingTripCard.tsx`, `CountdownCard.tsx`, `TimelineRow.tsx`, `Footer.tsx`, `NarrativeCard.tsx`, `LocationCard.tsx`, `SunPopup.tsx` | modify (7) | viewer's zone; `ClockText`; the key; the pilot's city |
| `src/styles/location.css`, `split.css` | modify (7) | `--dial`, the caption, the clock row beside the dial |
| tests | (1–7) | below |

## The words, before and after (as built)

**Trip map (design §3.2, §3.3, §3.6)**

| Function | Before | After |
|---|---|---|
| `placeChip` | Cologne · 9:14 PM there | Cologne · 9:14 PM |
| `nextDepartureChip` (and the facts' next-flight row) | Next: Dubai, tomorrow 6:10 AM | Next: Dubai, tomorrow 6:10 AM L |
| `landingLine` | Lands Anchorage about 12:35 PM · 4:35 PM your time | Lands Anchorage about 12:35 PM · 4:35 PM L |
| `gateLine` | Reaches the gate at 3:52 PM · 7:52 PM your time | Reaches the gate in Anchorage at 3:52 PM · 7:52 PM L |
| `takeoffLine` (new) | — | Took off Taipei 7:42 PM · 6:42 AM L; … about …; Took off Louisville 9:05 AM L |
| `landsAt`, `barArrival` | Lands about 3:18 PM; At the gate 8:47 AM | Lands about 3:18 PM L; At the gate 8:47 AM L |
| `arrivalLocalTime` | 9:30 PM in Cologne | unchanged |
| `timelineLine` | Sat 1:40 PM · Layover in Denver | Sat 1:40 PM L · Layover in Denver |
| `milestoneLine` | Out over the Philippine Sea · 9:22 AM | … · 9:22 AM L |
| `eventWhen` (replay) | About 10:37 AM | About 10:37 AM L |
| `spokenLatestEvent` (replay) | Latest: halfway, at 3:14 PM. | Latest: halfway, at 3:14 PM your time. |
| `closestToHomeText` | Passes 40 mi from home at about 1:05 PM | … at about 1:05 PM L |
| `cockpitEventText`, `cockpitGapText` (new) | Sunrise at 2:40 PM, about 31 min before the people below | Sunrise at 2:40 PM L · The pilot sees it 31 min before the ground does |
| `groundSunText` | sunrise at 7:02 AM there | sunrise at 7:02 AM Cologne |
| `halfwayText` | Halfway at about 12:05 PM | Halfway at about 12:05 PM L |
| `landsText` | lands 4:05 PM there | lands 4:05 PM Dubai, or lands 4:05 PM L |
| `leavesRow` | Leaves tomorrow 6:10 AM | Leaves tomorrow 6:10 AM L |
| `planePopupWords` | Where it was at 10:37 AM; … lands about 3:18 PM | the same with " L" after each time |
| `takeoffWeatherText` (new) | — | 84°F and clear at takeoff |
| `liveSummary`, `cardSummary` | … your time. | unchanged |
| `tripMapSummary` | … Next: Dubai, tomorrow 6:10 AM. | … Next: Dubai, tomorrow 6:10 AM your time. |

**Status page (design §3.7, §3.8)**

| Where | Before | After |
|---|---|---|
| narrative `.time()` | which is 4:35pm EST | which is 4:35 PM L |
| `departureText` | Heading to Dubai Sunday the 1st at 6:00am | … at 6:00 AM L |
| `longDateTimeText` | Monday October 12th at 8:02pm EDT | Monday October 12th at 8:02 PM L |
| `tripCardDepartsText` | Departs Tue Nov 25 at 6:00am (home airport's zone) | Departs Tue Nov 25 at 6:00 AM L (viewer's) |
| `arrivalWhenText` | Fri, Nov 20 at 6:44 PM (home airport's zone) | Fri, Nov 20, 6:44 PM L (viewer's) |
| `leaveWhenText`, `tripDepartsText` | Departs Sunday March 1st at 5:57pm (home airport's zone) | … at 5:57 PM L (viewer's) |
| `legTimes` | 9:02am est – about 1:15pm est | 9:02 AM – about 1:15 PM L |
| footer, offline | Offline — showing the schedule from Thu 7:59am | … from Thu 7:59 AM L |
| location card | Current time: 3:45 PM | Current time in Taipei: 3:45 PM |
| under the sun dial | — | Taipei time (Pilot’s time with no city) |
| sun popup, pilot's clock | 3:45 PM | 3:45 PM Taipei |
| bottom of the status page | — | L = your time (Eastern Standard Time) |

---

### Task 1: The labels and the shared cases

**Files:** Create `src/copy/clockLabel.ts`, `tests/copy/clockLabel.test.ts`, `tests/fixtures/trip-map/clock-label-cases.json`.

- [x] **Step 1: Copy the shared cases, byte for byte.**

```bash
cp /Users/toddanderson/Dev/Crewluv/CrewluvTests/Fixtures/TripMap/clock-label-cases.json tests/fixtures/trip-map/clock-label-cases.json
cmp /Users/toddanderson/Dev/Crewluv/CrewluvTests/Fixtures/TripMap/clock-label-cases.json tests/fixtures/trip-map/clock-label-cases.json
```

- [x] **Step 2: Write the tests** (`tests/copy/clockLabel.test.ts`): all 15 shared cases, the locale's 12- or 24-hour clock from `prefers24Hour`, a plain space for the narrow one; and the app's `ClockLabelTests` for `spoken`, `hasMark`, `zoneName` (winter, summer, Phoenix, UTC, an unknown zone) and `keepsTheSameClock`.
- [x] **Step 3: Run them:** `npx vitest run tests/copy/clockLabel.test.ts`. Failed: no module.
- [x] **Step 4: Write `src/copy/clockLabel.ts`** (in the branch).
- [x] **Step 5: Run them again.** 33 passed, the 15 shared cases among them.

### Task 2: The trip map's words

**Files:** Modify `src/copy/tripMap.ts`, `facts.ts`, `planePopup.ts`, `weather.ts`. Tests: `tests/copy/tripMap.test.ts`, `facts.test.ts`, `planePopup.test.ts`, `liveWords.test.ts`, `activityWords.test.ts`, `weather.test.ts`.

- [x] **Step 1: Change the tests to the words in the table,** and add: `takeoffLine`'s three forms and 24-hour time; the card's spoken sentence saying "your time" for the next departure; `cockpitGapText` before and after, and null; `takeoffWeatherText`.
- [x] **Step 2: Run** `npx vitest run tests/copy`. 34 failed.
- [x] **Step 3: Change the words** as the table has them.
- [x] **Step 4: Run again.** 537 passed.

### Task 3: The takeoff row, and the facts' words

**Files:** Create `src/facts/takeoff.ts`, `tests/facts/timeLabelsFacts.test.ts`. Modify `src/facts/factRow.ts`, `tripFacts.ts`, `tripFactsRows.ts`; tests in `tests/facts/` and `tests/ui/` that read the rows.

- [x] **Step 1: Write the tests** (`tests/facts/timeLabelsFacts.test.ts`, the app's `TimeLabelsFactsTests`): "Took off E0 6:17 AM L" for the real plane, "Took off E0 about 6:15 AM L" from the schedule, its weather and Open-Meteo's credit, no second line without it, left out at 10:10 taxiing out and for a plane first seen 69 mi out, just above the landing row, "your time" in its sentence; `takeoffOf`; the newest event current, live, in a replay, and none once the flight is over.
- [x] **Step 2: Run them.** Failed: no module.
- [x] **Step 3: Write `takeoffOf` and the row,** split the sky row, name the city in the ground sun, mark `leavesRow`, `isCurrent`.
- [x] **Step 4: Run them.** 13 passed. Then the facts and page tests that pinned the old words were changed to the new ones, each failure read first: the row kinds gain `takeoff` before `headed` in flight, and the times gain "L".

### Task 4: The newest event, bold

Built with Task 3 (`isCurrent`, `newestOf`) and Task 6 (`current` class, ", latest" for screen readers, `font-weight: 600`; an estimate stays slanted).

### Task 5: The weather at takeoff

**Files:** Modify `src/facts/landingWeather.ts`, `src/ui/hooks/useLandingWeather.ts`, `src/ui/PilotPages.tsx`. Tests: `tests/facts/landingWeather.test.ts`, `tests/ui/useLandingWeather.test.tsx`.

- [x] **Step 1: Write the tests:** `takeoffToFetch` is the flight in the air at its takeoff, none taxiing out, none on a layover; `useTakeoffWeather` asks for the departure airport at the takeoff hour, by leg, and nothing with the map closed.
- [x] **Step 2: Run them.** 5 failed: no function.
- [x] **Step 3: Write `takeoffToFetch`,** share the landing hook's fetching (`useHourWeather`, keyed by airport and hour), add `useTakeoffWeather`, and pass `takeoffForecasts` to the facts.
- [x] **Step 4: Run them.** 13 passed; the landing hook's own tests unchanged and passing.

### Task 6: Times on the page: hover tips, "your time", the key

**Files:** Create `src/ui/clockParts.ts`, `src/ui/ClockText.tsx`, `tests/ui/clockParts.test.ts`, `tests/ui/clockText.test.tsx`. Modify the trip map's components, `tests/fixtures/ui.ts` (`shownText`), and the page tests that read shown text.

- [x] **Step 1: Write the tests:** which time is whose (an L, a city after it, a pair's first after the city named, "City · time", "time in City", 24-hour and midnight and noon, no time, "Lisbon"); `<time datetime title>` with the zone's full name, "your time" heard and "L" seen; the key; the footer's lines; `current` and ", latest".
- [x] **Step 2: Run them.** Failed: no modules.
- [x] **Step 3: Write `clockParts`, `ClockText`, `ClockKey`;** use them in the rows, the list, the footer, the headline, the chips, the bar, the timeline line, the banner and the popup; give the zones from `PilotPages`.
- [x] **Step 4: Run all.** Page tests that read `textContent` now read `visibleText` (the words a sighted reader sees), and those that look a sentence up by its words use `shownText`.

### Task 7: The status page

**Files:** Modify `src/copy/format.ts`, `narrative.ts`, `schedule.ts` and the status page's components and styles. Tests: `tests/copy/format.test.ts`, `narrativeAway.test.ts`, `narrativeHome.test.ts`, `schedule.test.ts`, and the page tests.

- [x] **Step 1: Change the tests to the words in the table.**
- [x] **Step 2: Run them.** They failed.
- [x] **Step 3: Change the words; the cards to the viewer's zone; `ClockText` on the sentence, the cards, the schedule rows and the offline footer; the key above the footer; the pilot's city on the location card and the sun popup; the caption under the dial.**
- [x] **Step 4: Run all,** both zones, the build.

### Task 8: Review and Todd's look

- [x] **Step 1: In the browser** (the demo, `?demo=1&scene=flying`, `layover`, the full map): the words, the hover tips (`<time>` titles read "11:34 AM Central Standard Time" for Rockford's time and "12:34 PM Eastern Standard Time" for the family's), the key, the takeoff row and its weather (the demo's samples), the location card at phone width and in the split view. Found and fixed: the narrative broke "12:34 PM" from "L."; "Current time in Miami:" ran under the dial.
- [x] **Step 2: The review** (`superpowers:code-reviewer`, sonnet), run from the session that asked for this work (auto mode refused it here: the context-mode hook rewrites the call). No Critical findings. Two acted on:
  - **The takeoff weather vanished at touchdown:** `useTakeoffWeather` gave only the flight in the air's, so the "… at takeoff" line went while the takeoff row still showed, until the gate. It now keeps each answer, as the app's `LandingWeather` does, and still asks only about the flight in the air. Test: "keeps the weather once the flight is down, as the app does, and fetches no more".
  - **Does Open-Meteo answer for a past hour?** Yes: the site's own request (`start_hour` = `end_hour`, no `past_days`) answered with that hour's temperature and code for Louisville 3 hours back and Taipei 15 hours back (19 Nov 2026). No change.
  - Left as they are, as they match the app: the in-flight card's arrival clock, the sun popup's sunrise and sunset rows, `spoken` taking a bare digit, the timeline's spoken value, and no hover tip for a city outside the trip's.
- [ ] **Step 3: Todd looks.**
- [ ] **Step 4: Commit, on Todd's yes,** by path, on `feature/time-labels`. Then going live (merge to `main` and push) only on his word.

## Record

- **Before:** 183 test files, 3,911 tests, all passing in Eastern and in UTC.
- **After:** 187 test files, 3,983 tests, all passing with `TZ=America/New_York` and with `TZ=UTC`; `tsc --noEmit` clean; `npm run build` builds. (One test went with `timeWithZone`, which nothing uses now.)
- **The shared cases:** `clock-label-cases.json` is identical to the app's (`cmp`), and all 15 pass.
- **Untouched:** `live-cases.json`, `facts-cases.json` and the other shared cases; no network in tests.
