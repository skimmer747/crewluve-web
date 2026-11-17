# The Website's Landed, Not Yet at the Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** For the few minutes between touchdown and the gate, a flight with live data reads "Landed in Anchorage" on the website, now only, so the facts, the list, the line under the timeline, the status page's sentence, the card's heading and the bar's "At the gate 8:47 AM" tell the story the bar's label, the card's sentence and the popup already tell. A flight with no live data, and a replay, read as before. Then this plan goes live, on Todd's yes.

**Architecture:**
- **The moment,** as "Still on the ground in Rockford" has its own (plan 3C-3, Tasks 9 and 10): `hasLanded` (`src/map/mapFlight.ts`, Crewlu Cloud's state "landed", the engine's `landed` phase), `legLandedBeforeGate` (`src/map/tripMap.ts`: and the leg is between its gates, before `leg.end`, the real plane's gate arrival), `isLandedBeforeGate` (`src/facts/tripFacts.ts`: and the facts aren't a replay's), `landedIn` (`src/map/tripActivity.ts`, for the line under the timeline, which `TripTimeline` reads only while its clock is live) and `landedFlight` (`src/engine/liveLegs.ts`, for the status page's sentence).
- **The words:** `landedText` and `gateLine` (`src/copy/tripMap.ts`), `allFlownText` and `LANDED_TAG` (`src/copy/facts.ts`), the narrative's own branch (`src/copy/narrative.ts`), the timeline's `lineWords`, `cardHeading` and the bar's `barArrival` (`src/copy/tripMap.ts`, used by `TripMapCard`).
- **The facts:** the headline, the first row, the sky, distance and landing rows (`src/facts/tripFacts.ts`, `src/facts/tripFactsRows.ts`), and the list's tag (`tripSoFar`). `TripSoFarList` draws the border for any tag, so it's unchanged.
- **The demo:** `live-landed` (`src/data/demoLive.ts`, `src/data/demo.ts`), wired as the other live scenes are, and listed in the README.
- **The design** follows Todd's two answers of 17 Nov 2026: "at" in its examples, and the bar's right side in its table.

**Tech Stack:** Preact 10, TypeScript 5.9 (strict), Vite 5, Vitest 3. No new package.

**Sources (read only):**
- **The design:** `docs/superpowers/specs/2026-11-17-landed-before-gate-design.md`, committed at `9af2c47`. Its table of the words (§3) is what Tasks 2 and 3 build; its §4 is what they leave alone. Task 3 brings it up to Todd's two answers of 17 Nov 2026.
- **Todd's choice (17 Nov 2026),** from a sketch of three wordings, as the design has it:

  > A: 'Landed in Anchorage'

- **The model:** plan 3C-3's Tasks 9 and 10 (`docs/superpowers/plans/2026-11-16-moving-map-stage3c3-website-facts.md`), the other end of the flight: `isAtDeparture`, `legStillOnGround`, `stillOnGroundIn`, `stillOnGroundFlight`, `isStillOnGround` and their words. This plan's names and tests follow theirs.

**How this plan was checked.** Every code block here comes from a file that was run before the plan was put together. None was typed into the plan by hand: a script made each replacement from the tested files and built the plan.
- **A scratch copy of this branch** at `9af2c47`, with this plan's files laid over it task by task.
  - Before: 177 test files and 3,709 tests, all passing, and `tsc --noEmit` clean.
  - After Task 2: 177 test files and 3,727 tests; after Task 3: 177 and 3,751. All passing each time, `tsc --noEmit` finds nothing, and `npm run build` builds.
  - The shared cases (`live-cases.json`, `facts-cases.json`) are unchanged, and pass: `facts-cases.json` has no live data, and every landed moment of `live-cases.json` is after its gate.
- **Tests first:** each task's tests were run before its code, and failed as its Step 2 says: 14 of 151 in Task 2, and 18 of 305 in Task 3.
- **42 deliberate breaks** were made in the new code, one at a time, and every one fails at least one test.
  - Task 2's 17: "landed" told of any live phase, at the gate and after, or in a replay; the headline naming the departure city, or a recent crossing put ahead of it; the list's "In the air now" kept; the first row keeping closest to home under it; the sky row kept; "· 0 to go" kept, in the row or in the words; "Lands Anchorage" kept on the landing row, or its weather and time there dropped; the gate always "about", always "at", or without its time there; "Landed at Anchorage"; and the tag "Landed now".
  - Task 3's 25: the timeline naming the departure airport, saying "Landed" of any flight with live data, keeping "Flying to", saying "Arrived in", saying "Landed" in a replay, or its spoken value keeping "flying to"; the heading keeping "In flight", or saying "Landed" after the gate; the narrative's flight found after its gate, or being the one still at the gate; the sentence naming the departure city, dropping "on the flight", losing its red countdown, or saying "landing in"; the status page never telling the narrative, in `PilotPages` or `StatusScreen`; the demo's plane landing at its gate time, or its scene opening at the gate; and the bar keeping "Lands", saying "At the gate" after the gate, "Reaches the gate", "At the gate about" or the schedule's gate time, the card passing it another moment, or dropping the time there once the plane is down.
- **The plan itself** is checked by a script: Tasks 2 and 3's steps, followed in order on the branch's files at `9af2c47`, give every file as tested. Followed again on a fresh copy of those files, tests first, every file came out the same as tested, the tests failed and passed as Steps 2 and 4 say, and the copy's tests (177 files, 3,751 tests), `tsc --noEmit` and the build passed.
- **Not checked:** nothing was seen in a browser: the scene is Todd's look, Task 4. No review yet: Task 5's is the first. Nothing called Crewlu Cloud or adsb.lol.

**Where this plan settles details.**
- **"at", not "about", once the plane is down: Todd's answer (17 Nov 2026).** The design's first examples had "Reaches the gate about 3:52 PM" and "… which is about 7:52pm EST". Once Crewlu Cloud says "landed", the site no longer marks the gate time as an estimate (`isEstimate`, Stage 3 spec §9), and the card's sentence and the plane's popup say "Reaches the gate at 7:52 PM your time". Todd chose "at", as they do: "Reaches the gate at 3:52 PM · 7:52 PM your time", and "Alex has landed in Anchorage on UPS flight 2963 — at the gate in 8m which is 7:52pm EST.", with no "about" (the narrative says it only of `estimatedArrival`, none once landed). `gateLine` keeps "about" where a time is the real plane's estimate (`about(leg) || 'at '`, the popup's), which once down it never is. Task 3 makes the design's examples "at".
- **The bar's right side: "At the gate 8:47 AM": Todd's answer (17 Nov 2026).** In the window, under the same rule as the rest (landed, before `leg.end`, now only, live data only), the card's bar says "At the gate 8:47 AM" in place of "Lands 8:47 AM" (`barArrival`, used by `TripMapCard`), with no "about". The city's own time under it, and the bar's label ("Landed 13 min early"), are as they were. The popup keeps `landsAt` for a plane in the air, as before. Task 3 adds the bar to the design's table and takes it out of what's unchanged.
- **"Landed in Anchorage" leads the headline,** ahead of a crossing in the last five minutes or a sun countdown, as "Still on the ground in Rockford" leads it. The banner still shows the crossing: the latest event design keeps it until the gate.
- **The first row is "Landed in Anchorage" alone,** as the design says: nothing of what's below, where the plane was last tracked or the closest point to home. ("Still on the ground" keeps closest to home, with "about".) Its icon stays the map pin, and the landing row's the landing plane.
- **The distance row keeps its comparison line.** Its halfway line has gone by then, and the average speed is never said of a flight with live data.
- **The landing row keeps the weather and the time there** under "Reaches the gate", as the design says of the weather.
- **The list's border:** `TripSoFarList` draws it for any tag, so "Landed" keeps it with no change there. A test pins it (`tests/ui/FactsBody.test.tsx`).
- **The status sentence** keeps a delayed or early flight's red or green countdown, as "still on the ground" does, and says "on the flight" with no usable flight number, as the design says.
- **The slider's spoken value** says it as the line does, lower case after the time: "Monday 7:45 PM, landed in Anchorage".
- **The demo's `live-landed`** opens 541 minutes after the trip's report: UPS2963 (Rockford 225 minutes after the report to Anchorage at 555), off 8 minutes early and seen all the way, lands at 540, a minute before the page opens, and reaches the gate at 547, the plan's 7 minutes of taxi in later. The window is never longer than that taxi in, so the scene stays in it for about 6 minutes after the page loads; reloading starts it again.
- **One test of the branch's changes:** `tests/facts/liveTripFacts.test.ts`'s "landed, follows the app" had the old words for this very window ("Over the Test Sea", "1,382 mi flown · 0 to go"). It now says "Landed in E20" and "1,382 mi flown". It isn't a shared case.
- **The names** follow plan 3C-3's: `hasLanded`, `legLandedBeforeGate`, `isLandedBeforeGate`, `landedIn`, `landedFlight`, `landedText`, `gateLine`, `allFlownText`, `LANDED_TAG`; and the tests' made-up plane `LANDED_EARLY` (`tests/map/liveTrip.ts`).

**Questions for Todd:** none; the words are his, and he settled the two details this plan found ("at", and the bar's right side), the first two items above.

---

## Ground rules for whoever runs this plan

These come from Todd's standing instructions. They override the skill's defaults.

1. **Work only in this worktree:** `/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046`, on its branch `claude/trip-map-live-598046`, at `9af2c47` or later.
   - Never edit the main checkout, `/Users/toddanderson/Dev/Crewluve Website`: its untracked plan file isn't this work's.
   - `~/Dev/Crewluv` is shared with other sessions. Only read it: change, stash, reset or switch nothing there.
2. **Never commit without Todd's yes in the conversation,** and then only the task's own files, by path. **Never push, and never merge into `main`,** but in Task 6, on Todd's yes then.
3. **The tests:** the session runs them as it works (`npx vitest run <files>`, `npm test`, `npm run build`). At the checkpoints (Tasks 2 and 3, Step 5), Todd runs the command himself. Don't change files while he's running them, and don't ask for a run until the files are final.
4. **The shared cases are the judge.** `tests/fixtures/trip-map/live-cases.json` and `facts-cases.json` are the app's, never edited. If a case fails, the code is wrong. If you believe a case is wrong, STOP and tell Todd.
5. **Copy the code as written.** It was run as it stands. A replacement is exact: its text is in the file once. If it isn't, stop: the file has changed since this plan was written.
6. **Nothing here calls Crewlu Cloud or adsb.lol.** Every test uses a stand-in, and the tests can't reach the network. Change nothing in Crewlu Cloud's live Supabase project, and don't read it.
7. **Unchanged:** every request to Crewlu Cloud still goes through the door and its guard (`tests/data/doorRules.test.ts` and `doorRulesScan.test.ts` must pass), no `innerHTML`, no download, no `npm install`.
8. **Reviewers:** dispatch `superpowers:code-reviewer` with `model: "sonnet"`.
9. **No release note.** The website has none; Task 6 says what went live in this plan's record.

## File map

| File | Task | Responsibility |
|---|---|---|
| `src/map/mapFlight.ts` | modify (2) | `hasLanded`: Crewlu Cloud says the real plane has landed |
| `src/map/tripMap.ts` | modify (2) | `legLandedBeforeGate`: landed, and the leg still between its gates |
| `src/copy/tripMap.ts` | modify (2, 3) | "Landed in Anchorage" and "Reaches the gate at …" (2); the line under the timeline, the card's heading and the bar's "At the gate 8:47 AM" (3) |
| `src/ui/TripMapCard.tsx` | modify (3) | the card's bar says `barArrival` |
| `src/copy/facts.ts` | modify (2) | "2,788 mi flown" and the tag "Landed" |
| `src/facts/tripFacts.ts` | modify (2) | `isLandedBeforeGate`, now only; the headline; the list's tag |
| `src/facts/tripFactsRows.ts` | modify (2) | the first row alone, no sky row, all of it flown, "Reaches the gate" |
| `src/map/tripActivity.ts` | modify (3) | `landedIn`: the airport the line under the timeline names |
| `src/ui/TripTimeline.tsx` | modify (3) | the line and the slider's spoken value, now only |
| `src/engine/liveLegs.ts` | modify (3) | `landedFlight`: the flight the status sentence says has landed |
| `src/copy/narrative.ts` | modify (3) | "Alex has landed in Anchorage on UPS flight 2963 — at the gate in 8m which is …" |
| `src/ui/StatusScreen.tsx`, `src/ui/PilotPages.tsx` | modify (3) | the status page tells the narrative which flight is down |
| `src/data/demoLive.ts`, `src/data/demo.ts` | modify (3) | the demo scene `live-landed` |
| `README.md` | modify (3) | `live-landed` among the live scenes |
| `docs/superpowers/specs/2026-11-17-landed-before-gate-design.md` | modify (3) | Todd's two answers: "at" in the examples, and the bar's right side |
| `tests/map/liveTrip.ts` | modify (2) | `LANDED_EARLY`, a made-up plane down 13 minutes early |
| `tests/map/liveTripMap.test.ts`, `tests/copy/liveWords.test.ts` | modify (2, 3) | the moment, the words, the heading |
| `tests/copy/facts.test.ts`, `tests/facts/liveTripFacts.test.ts`, `tests/ui/FactsBody.test.tsx` | modify (2) | the words, the facts, the list's border |
| `tests/engine/liveLegs.test.ts`, `tests/copy/narrativeAway.test.ts`, `tests/copy/activityWords.test.ts`, `tests/ui/liveMapPage.test.tsx`, `tests/ui/livePages.test.tsx` | modify (3) | the status sentence, the timeline, the heading and the bar, on the page |
| `tests/data/demoLive.test.ts`, `tests/data/demoScenes.test.ts`, `tests/ui/StatusScreen.test.tsx` | modify (3) | the demo scene |

Two code tasks, then Task 4, Todd's look at the demo scene; Task 5, the review and this plan's record; and Task 6, going live, on Todd's yes.

---

### Task 1: Before starting

- [x] **Step 1: Check the worktree and the branch.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git status --short && git branch --show-current && git log --oneline -1
```

Expected: nothing changed but this plan's file, `claude/trip-map-live-598046`, and `9af2c47` or a later commit of this plan's.

- [x] **Step 2: Read the design** (`docs/superpowers/specs/2026-11-17-landed-before-gate-design.md`), and this plan's "Where this plan settles details".

---

### Task 2: The facts and the list: "Landed in Anchorage"

Between touchdown and the gate, now only, a flight with live data reads as Todd chose (17 Nov 2026). The map knows the moment: `hasLanded` (`src/map/mapFlight.ts`, Crewlu Cloud's "landed", the engine's `landed` phase) and `legLandedBeforeGate` (`src/map/tripMap.ts`, while the leg is between its gates), as `isAtDeparture` and `legStillOnGround` know "Still on the ground". The facts read it now only, by `isLandedBeforeGate` (`src/facts/tripFacts.ts`, never in a replay). Their headline, and so the card's bottom chip and the full map's first line, is "Landed in Anchorage" (`landedText`), ahead of an event or a sun countdown. The first row says it alone, with nothing of what's below, where the plane was last tracked or home. The distance row is "2,788 mi flown" (`allFlownText`), with its comparison line as before. There's no sky row. The landing row is "Reaches the gate at 3:52 PM · 7:52 PM your time" (`gateLine`), with the weather and the time there under it as before. The list tags the flight "Landed" (`LANDED_TAG`), and its border stays, as `TripSoFarList` draws it for any tag. The card's sentence, the latest event and the plane's row are as they were.

**Files:**
- Modify: `src/copy/facts.ts`, `src/copy/tripMap.ts`, `src/facts/tripFacts.ts`, `src/facts/tripFactsRows.ts`, `src/map/mapFlight.ts`, `src/map/tripMap.ts`
- Test: `tests/copy/facts.test.ts`, `tests/copy/liveWords.test.ts`, `tests/facts/liveTripFacts.test.ts`, `tests/map/liveTrip.ts`, `tests/map/liveTripMap.test.ts`, `tests/ui/FactsBody.test.tsx`

- [x] **Step 1: Write the tests.**

**In `tests/copy/facts.test.ts`, replace (1 of 2):**

```ts
import {
  aircraftText, averageSpeedText, belowWords, chaseText, closestToHomeText, cockpitCountdown, cockpitEventText, eventTitle, eventWhen, flightTitle,
  flownText, flyingInto, groundSunText, halfwayText, heightAndSpeedText, inTheAirTag, landsText, lastSeenLine, LIVE_CREDIT, midLine, milestoneHeadline,
  milestoneLine, moonText, SPOKEN_LIVE_CREDIT, spokenLastSeen, spokenLatestEvent, stillOnGroundText, timeDifferenceText, toGoText, WIDEST_EVENT_WHEN,
} from '../../src/copy/facts'
```

**with:**

```ts
import {
  aircraftText, allFlownText, averageSpeedText, belowWords, chaseText, closestToHomeText, cockpitCountdown, cockpitEventText, eventTitle, eventWhen,
  flightTitle, flownText, flyingInto, groundSunText, halfwayText, heightAndSpeedText, inTheAirTag, LANDED_TAG, landsText, lastSeenLine, LIVE_CREDIT,
  midLine, milestoneHeadline, milestoneLine, moonText, SPOKEN_LIVE_CREDIT, spokenLastSeen, spokenLatestEvent, stillOnGroundText, timeDifferenceText,
  toGoText, WIDEST_EVENT_WHEN,
} from '../../src/copy/facts'
```

**In `tests/copy/facts.test.ts`, replace (2 of 2):**

```ts
    expect(toGoText(2_788)).toBe('2,788 mi to go')
  })
```

**with:**

```ts
    expect(toGoText(2_788)).toBe('2,788 mi to go')
  })

  it('says a real plane down, not yet at the gate, has flown it all, and tags it "Landed" (the landed, not yet at the gate design §3, Todd, 17 Nov 2026)', () => {
    expect(allFlownText(2_788)).toBe('2,788 mi flown')
    expect(LANDED_TAG).toBe('Landed')
  })
```

**In `tests/copy/liveWords.test.ts`, replace (1 of 2):**

```ts
import { landsText } from '../../src/copy/facts'
import { Sentence } from '../../src/copy/narrative'
import {
  cardHeading, flightStatus, landingCountdown, landingLine, landsAt, liveSummary, spokenLiveLabel, spokenMinutes, topPill, tripMapSummary,
} from '../../src/copy/tripMap'
import type { AirportIndex } from '../../src/data/airports'
import { makeMapFlight } from '../../src/map/mapFlight'
```

**with:**

```ts
import { landsText } from '../../src/copy/facts'
import { Sentence } from '../../src/copy/narrative'
import {
  cardHeading, flightStatus, gateLine, landedText, landingCountdown, landingLine, landsAt, liveSummary, spokenLiveLabel, spokenMinutes, topPill,
  tripMapSummary,
} from '../../src/copy/tripMap'
import type { AirportIndex } from '../../src/data/airports'
import { makeMapFlight } from '../../src/map/mapFlight'
```

**In `tests/copy/liveWords.test.ts`, replace (2 of 2):**

```ts
    expect(cardHeading(mapOf(leg, { kind: 'nextTrip' }), t)).toBe('Trip map')
  })
})
```

**with:**

```ts
    expect(cardHeading(mapOf(leg, { kind: 'nextTrip' }), t)).toBe('Trip map')
  })
})

describe('the words for a real plane down, not yet at the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026)', () => {
  it('say it has landed in the arrival airport’s city', () => {
    expect(landedText('Anchorage')).toBe('Landed in Anchorage')
  })

  it('say when it reaches the gate, there and in the family’s time, "at" as the card’s sentence and the popup say it once it’s down', () => {
    // The gate at 13:21:51 UTC: 8:21 AM in Philadelphia and Louisville, 5:21 AM in Los Angeles.
    const { leg } = caseLeg('landed, seen all the way')
    expect(gateLine(leg, NY, false)).toMatch(/^Reaches the gate at 8:21\sAM$/)
    expect(gateLine(leg, 'America/Los_Angeles', false)).toMatch(/^Reaches the gate at 8:21\sAM · 5:21\sAM your time$/)
    expect(gateLine(leg, NY, true)).toBe('Reaches the gate at 08:21')
  })

  it('say "about" where the time is the real plane’s estimate, and "at" where it’s the schedule’s', () => {
    const { leg } = caseLeg('behind, with a late first point and an unseen ocean')
    expect(gateLine(leg, NY, false)).toMatch(/^Reaches the gate about \d{1,2}:\d\d\s[AP]M · \d{1,2}:\d\d\s[AP]M your time$/)
    expect(gateLine(scheduleOnly(leg), NY, false)).toMatch(/^Reaches the gate at \d{1,2}:\d\d\s[AP]M · \d{1,2}:\d\d\s[AP]M your time$/)
  })
})
```

**In `tests/facts/liveTripFacts.test.ts`, replace (1 of 3):**

```ts
import { factRows, factsAtMoment } from '../../src/facts/tripFactsRows'
import type { GeoPoint } from '../../src/map/greatCircle'
```

**with:**

```ts
import { factRows, factsAtMoment } from '../../src/facts/tripFactsRows'
import type { LandingForecast } from '../../src/data/weather'
import type { GeoPoint } from '../../src/map/greatCircle'
```

**In `tests/facts/liveTripFacts.test.ts`, replace (2 of 3):**

```ts

  it('landed, follows the app: what’s below the arrival airport, all of it flown', () => {
    // Down at 12:55, and at the gate 7 minutes later.
    const theFacts = facts('12:53', { now: '12:58', landed: true })
    expect(headline(theFacts, at('12:58'))).toBe('Over the Test Sea')
    expect(row('distance', rowsAt(theFacts, '12:58')).title).toBe('1,382 mi flown · 0 to go')
  })
```

**with:**

```ts

  it('landed, says so: down, and not yet at the gate (the landed, not yet at the gate design, Todd, 17 Nov 2026)', () => {
    // Down at 12:55, and at the gate 7 minutes later.
    const theFacts = facts('12:53', { now: '12:58', landed: true })
    expect(headline(theFacts, at('12:58'))).toBe('Landed in E20')
    expect(row('distance', rowsAt(theFacts, '12:58')).title).toBe('1,382 mi flown')
  })
```

**In `tests/facts/liveTripFacts.test.ts`, replace (3 of 3):**

```ts

describe('the full map’s facts at a moment, with and without live data (Stage 3 spec §7.3, §8)', () => {
```

**with:**

```ts

// The landed, not yet at the gate design (Todd, 17 Nov 2026)

/**
 * The equator flight to Anchorage, in Anchorage's time, with its real plane down at 20° E at 12:55, twenty minutes
 * early: at the gate at 13:02, 5:02 AM there and 9:02 AM in Louisville. Its facts as the status page makes them at
 * `now`, all of it `later` ms on.
 */
function landedIn(
  now: string,
  { isReplay = false, geography = EQUATOR, forecasts = {}, later = 0 }:
    { isReplay?: boolean; geography?: Geography; forecasts?: Record<string, LandingForecast>; later?: number } = {},
): TripFacts {
  const scheduled = equatorFlight(0, 20, EQUINOX + later)
  const live = movedOn(equatorLive(at('12:53'), { landedAt: liveTime(20) }), later)
  const flight = makeMapFlight(scheduled.start, scheduled.end, scheduled.origin.place, scheduled.destination.place, live)
  if (!flight) throw new Error('The equator flight has no plan')
  const progress = mapFlightProgress(flight, at(now) + later)
  const destination = { ...scheduled.destination, city: 'Anchorage', timeZone: 'America/Anchorage' }
  return makeTripFacts(flightMap({ ...scheduled, start: progress.start, end: progress.end, destination, flight }, HOME_BY_THE_EQUATOR), {
    geography, comparisons: appComparisons(), forecasts, viewerTz: NY, h24: false, day: 1, days: 1, isReplay,
  })
}

describe('a real plane down, not yet at the gate (the landed, not yet at the gate design §2, §3, Todd, 17 Nov 2026)', () => {
  it('heads the facts "Landed in Anchorage", alone on its row: nothing of what’s below, where it was last tracked or home', () => {
    const theFacts = landedIn('12:58')
    expect(headline(theFacts, at('12:58'))).toBe('Landed in Anchorage')
    const rows = rowsAt(theFacts, '12:58')
    expect(rows.map((r) => r.kind)).toEqual(['below', 'plane', 'distance', 'headed'])
    expect(row('below', rows)).toMatchObject({ title: 'Landed in Anchorage', detail: null })
    // The plane's row as before: the aircraft's name, with no height or speed.
    expect(row('plane', rows)).toMatchObject({ title: 'Boeing 767-300 · N370UP', detail: null })
  })

  it('leads the headline before a crossing of the last five minutes, which the banner still shows', () => {
    // A border 19.6° E along, crossed at 12:51:48, three minutes before the landing.
    const border = makeGeography([box('Alpha', 'country', -1, 19.6), box('Bravo', 'country', 19.6, 21)], [])
    const theFacts = landedIn('12:56', { geography: border })
    expect(headline(theFacts, at('12:56'))).toBe('Landed in Anchorage')
    expect(latestEvent(theFacts, at('12:56'))?.title).toBe('Crossed into Bravo')
  })

  it('says all of it flown, with nothing to go, and its comparison as before', () => {
    expect(row('distance', rowsAt(landedIn('12:58'), '12:58'))).toMatchObject({ title: '1,382 mi flown', detail: 'like driving the Alaska Highway' })
  })

  it('leaves out the sky’s row, as at the gate', () => {
    // Five hours later, at 17:58, the moon is up: a replay of the same moment has the sky's row.
    const later = 5 * 3_600_000
    const t = at('12:58') + later
    expect(row('sky', factRows(landedIn('12:58', { later, isReplay: true }), t, t)).title).toBe('Waxing crescent moon, up')
    expect(factRows(landedIn('12:58', { later }), t, t).map((r) => r.kind)).toEqual(['below', 'plane', 'distance', 'headed'])
  })

  it('says when it reaches the gate, "at" as the card’s sentence says it, with the weather and the time there under it as before', () => {
    const forecasts: Record<string, LandingForecast> = { eq: { temperature: 28, unit: 'fahrenheit', code: 71 } }
    expect(row('headed', rowsAt(landedIn('12:58', { forecasts }), '12:58'))).toMatchObject({
      title: `Reaches the gate at 5:02${AM} · 9:02${AM} your time`, detail: '28°F and flurries on landing · 4 hours behind you', hasWeather: true,
    })
  })

  it('tags the flight "Landed" in the trip so far, with what it passed as before', () => {
    const soFar = tripSoFar(landedIn('12:58'), at('12:58'))
    expect(soFar.flights.map((f) => f.tag)).toEqual(['Landed'])
    expect(soFar.flights[0]?.events.map((e) => e.text))
      .toEqual([`Closest to home, 35 mi · 8:07${AM}`, `Out over the Test Sea · 7:51${AM}`, `Halfway · 7:35${AM}`, `Crossed into Bravo · 6:55${AM}`])
  })

  it('keeps the card’s sentence as it was: how it landed, and when it reaches the gate', () => {
    expect(cardSummary(landedIn('12:58'), at('12:58'), 'Alex')).toBe(
      `TST1 to Anchorage, landed 20 minutes early. Reaches the gate at 9:02${AM} your time. Latest: closest to home, 35 miles, 51 minutes ago. Opens the full map.`,
    )
  })

  it('in a replay, reads where the map has the plane, as before', () => {
    const theFacts = landedIn('12:58', { isReplay: true })
    expect(headline(theFacts, at('12:58'))).toBe('Over the Test Sea')
    const rows = rowsAt(theFacts, '12:58')
    expect(row('distance', rows).title).toBe('1,382 mi flown · 0 to go')
    expect(row('headed', rows).title).toBe(`Lands Anchorage 5:02${AM} · 9:02${AM} your time`)
    expect(tripSoFar(theFacts, at('12:58')).flights.map((f) => f.tag)).toEqual(['In the air'])
  })

  it('says none of it at the gate, where the flight is over', () => {
    expect(headline(landedIn('13:02'), at('13:02'))).toBeNull()
    expect(tripSoFar(landedIn('13:02'), at('13:02')).flights.map((f) => f.tag)).toEqual([null])
  })

  it('of a flight with no live data, reads as it always has: it never knows its touchdown', () => {
    // 13:18, after the schedule's touchdown at 13:15 and before its gate at 13:22.
    const theFacts = factsOf(equatorFlight(0, 20))
    expect(headline(theFacts, at('13:18'))).toBe('Over the Test Sea')
    expect(row('distance', rowsAt(theFacts, '13:18')).title).toBe('1,382 mi flown · 0 to go')
    expect(tripSoFar(theFacts, at('13:18')).flights.map((f) => f.tag)).toEqual(['In the air now'])
  })
})

describe('the full map’s facts at a moment, with and without live data (Stage 3 spec §7.3, §8)', () => {
```

**In `tests/map/liveTrip.ts`, replace:**

```ts

/** The flight as the trip's leg, at its gate times. */
```

**with:**

```ts

/**
 * Seen from just after takeoff, and down in Philadelphia 100 minutes after START, 13 minutes early: it reaches the gate
 * 7 minutes later, at 107 (the landed, not yet at the gate design, Todd, 17 Nov 2026).
 */
export const LANDED_EARLY = liveFlight([...TRAIL, point(90, 39.8, -75.8)],
  { legId: 'f1', state: 'landed', landedAt: START + 100 * MINUTE, fix: fix(100, PHL.lat, PHL.lng, { onGround: true }) })

/** The flight as the trip's leg, at its gate times. */
```

**In `tests/map/liveTripMap.test.ts`, replace (1 of 2):**

```ts
import { pointsAlong } from '../../src/map/greatCircle'
import { fitRect } from '../../src/map/mapFit'
import { stillOnGroundIn } from '../../src/map/tripActivity'
import { framingPoints, isArrivalEstimated, legStillOnGround, makeTripMap, type TripMap } from '../../src/map/tripMap'
import { atTheGate, FLYING, LIVE_AIRPORTS as AIRPORTS, liveTripMap, PHL, placeOf, SCHEDULE, SDF, SDF_PHL as F1 } from './liveTrip'
import { fix, liveFlight, MINUTE, point, START } from './madeUpFlights'

/** Seen north of the line, then far north of it, 40 minutes in: still in the air. */
```

**with:**

```ts
import { pointsAlong } from '../../src/map/greatCircle'
import { fitRect } from '../../src/map/mapFit'
import { stillOnGroundIn } from '../../src/map/tripActivity'
import { framingPoints, isArrivalEstimated, legLandedBeforeGate, legStillOnGround, makeTripMap, type TripMap } from '../../src/map/tripMap'
import { atTheGate, FLYING, LANDED_EARLY, LIVE_AIRPORTS as AIRPORTS, liveTripMap, PHL, placeOf, SCHEDULE, SDF, SDF_PHL as F1 } from './liveTrip'
import { fix, liveFlight, MINUTE, point, START } from './madeUpFlights'

/** Seen north of the line, then far north of it, 40 minutes in: still in the air. */
```

**In `tests/map/liveTripMap.test.ts`, replace (2 of 2):**

```ts
    }
  })
})
```

**with:**

```ts
    }
  })
})

describe('a real plane down, not yet at the gate (the landed, not yet at the gate design §2, Todd, 17 Nov 2026)', () => {
  const flightOf = (map: TripMap) => map.legs.find((l) => l.kind === 'flight')!

  it('is told from its touchdown until the gate, while the leg is between its gates', () => {
    for (const minutes of [100, 103, 106.9]) {
      const now = START + minutes * MINUTE
      expect(legLandedBeforeGate(flightOf(liveTripMap(now, LANDED_EARLY)), now), `${minutes}`).toBe(true)
    }
  })

  it('isn’t told at the gate: the leg is over', () => {
    const now = START + 107 * MINUTE
    const map = liveTripMap(now, LANDED_EARLY)
    expect(flightOf(map).end).toBe(now)
    expect(legLandedBeforeGate(flightOf(map), now)).toBe(false)
  })

  it('isn’t told of a plane in the air, still at its departure airport, on the ground somewhere else, or with no live data', () => {
    // A diversion: on the ground in Cincinnati, 80 mi from Louisville.
    const elsewhere = liveFlight([], { legId: 'f1', state: 'ground', fix: fix(25 - 1 / 3, 39.05, -84.67, { onGround: true }) })
    for (const [live, minutes] of [[FLYING, 59], [atTheGate(25), 25], [elsewhere, 25], [null, 103]] as const) {
      const now = START + minutes * MINUTE
      expect(legLandedBeforeGate(flightOf(liveTripMap(now, live)), now)).toBe(false)
    }
  })
})
```

**In `tests/ui/FactsBody.test.tsx`, replace:**

```tsx
    expect(container.querySelector('.trip-so-far-flight ul')).toBeNull()
  })
})
```

**with:**

```tsx
    expect(container.querySelector('.trip-so-far-flight ul')).toBeNull()
  })

  it('keeps the border on a flight down, not yet at the gate, its tag "Landed" (the landed, not yet at the gate design §3, Todd, 17 Nov 2026)', () => {
    const { container } = render(<FactsBody rows={[]} tripSoFar={{ ...inTheAir, flights: [{ ...inTheAir.flights[0], tag: 'Landed' }] }} />)
    expect(container.querySelector('.trip-so-far-flight.in-the-air .trip-so-far-tag')?.textContent).toBe('Landed')
    expect(screen.getByRole('heading', { name: 'UPS202 · Cologne → Dubai Landed' })).toBeTruthy()
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/copy/facts.test.ts tests/copy/liveWords.test.ts tests/facts/liveTripFacts.test.ts tests/map/liveTripMap.test.ts tests/ui/FactsBody.test.tsx
```

Expected: 14 of the 151 tests fail, in four of the five files. Seven because `legLandedBeforeGate`, `gateLine`, `landedText` and `allFlownText` aren't there yet (`LANDED_TAG`'s test is one of them). Seven because the facts still read the plane as in the air: "Over the Test Sea" where the headline and the first row should say "Landed in …" (and "Just crossed into Bravo" ahead of it), "· 0 to go", the sky's row, "Lands Anchorage …" and "In the air now". The rest pass already, as they should: the card's sentence, a replay, the gate and a flight with no live data read as before, and `tests/ui/FactsBody.test.tsx` passes, as the list keeps the border for any tag.

- [x] **Step 3: Write the code.**

**In `src/copy/facts.ts`, replace (1 of 2):**

```ts
export const inTheAirTag = (isReplay: boolean) => (isReplay ? 'In the air' : 'In the air now')

```

**with:**

```ts
export const inTheAirTag = (isReplay: boolean) => (isReplay ? 'In the air' : 'In the air now')

/**
 * The tag on that flight while its real plane is down and not yet at the gate: "Landed", its border kept (the landed,
 * not yet at the gate design §3, Todd, 17 Nov 2026).
 */
export const LANDED_TAG = 'Landed'

```

**In `src/copy/facts.ts`, replace (2 of 2):**

```ts

/** "Halfway at 4:12 PM", or with the real plane's estimate "Halfway at about 12:05 PM" (Stage 3 spec §8). */
```

**with:**

```ts

/**
 * "2,788 mi flown": a real plane down and not yet at the gate has nothing to go (the landed, not yet at the gate design
 * §3, Todd, 17 Nov 2026).
 */
export const allFlownText = (flown: number) => `${numberText(flown)} mi flown`

/** "Halfway at 4:12 PM", or with the real plane's estimate "Halfway at about 12:05 PM" (Stage 3 spec §8). */
```

**In `src/copy/tripMap.ts`, replace:**

```ts

/** "Lands 3:30 PM", for the card's bar. With the real plane's estimate, "Lands about 3:18 PM". */
```

**with:**

```ts

/**
 * "Reaches the gate at 3:52 PM · 7:52 PM your time", or "Reaches the gate at 3:30 PM": the landing line once the real
 * plane is down and not yet at the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026). "about" where the
 * time is the real plane's estimate, else "at", as the plane's popup says it.
 */
export function gateLine(leg: MapLeg, viewerTz: string, h24: boolean): string {
  const yours = shortTimeText(leg.end, viewerTz, h24)
  const there = thereAtLanding(leg, viewerTz, h24)
  const lead = `Reaches the gate ${about(leg) || 'at '}`
  return there ? `${lead}${there} · ${yours} your time` : `${lead}${yours}`
}

/**
 * "Landed in Anchorage": a real plane down at its arrival airport and not yet at the gate, at the head of the facts (the
 * landed, not yet at the gate design §3, Todd, 17 Nov 2026).
 */
export const landedText = (city: string) => `Landed in ${city}`

/** "Lands 3:30 PM", for the card's bar. With the real plane's estimate, "Lands about 3:18 PM". */
```

**In `src/facts/tripFacts.ts`, replace (1 of 8):**

```ts
import {
  belowWords, cockpitCountdown, eventTitle, eventWhen, flightTitle, inTheAirTag, lastSeenLine, milestoneHeadline, milestoneLine, spokenLastSeen,
  spokenLatestEvent, stillOnGroundText,
} from '../copy/facts'
```

**with:**

```ts
import {
  belowWords, cockpitCountdown, eventTitle, eventWhen, flightTitle, inTheAirTag, LANDED_TAG, lastSeenLine, milestoneHeadline, milestoneLine,
  spokenLastSeen, spokenLatestEvent, stillOnGroundText,
} from '../copy/facts'
```

**In `src/facts/tripFacts.ts`, replace (2 of 8):**

```ts
import { shortTimeText } from '../copy/format'
import { landingCountdown, liveSummary, panelHeadline, tripMapSummary } from '../copy/tripMap'
import type { LandingForecast } from '../data/weather'
```

**with:**

```ts
import { shortTimeText } from '../copy/format'
import { landedText, landingCountdown, liveSummary, panelHeadline, tripMapSummary } from '../copy/tripMap'
import type { LandingForecast } from '../data/weather'
```

**In `src/facts/tripFacts.ts`, replace (3 of 8):**

```ts
import type { GeoPoint } from '../map/greatCircle'
import { currentLeg, dayCount, isMoving, legInMotion, legStillOnGround, type AirportMark, type MapLeg, type TripMap } from '../map/tripMap'
import { MINUTE } from '../time/zoned'
```

**with:**

```ts
import type { GeoPoint } from '../map/greatCircle'
import {
  currentLeg, dayCount, isMoving, legInMotion, legLandedBeforeGate, legStillOnGround, type AirportMark, type MapLeg, type TripMap,
} from '../map/tripMap'
import { MINUTE } from '../time/zoned'
```

**In `src/facts/tripFacts.ts`, replace (4 of 8):**

```ts

/** Whether a flight with live data shows, which adsb.lol is credited for (Stage 3 spec §8). */
```

**with:**

```ts

/**
 * Whether the real plane of `leg`, the leg between its gates at `t`, has landed and isn't at the gate yet. The facts then
 * say "Landed in Anchorage" in place of what's below, and nothing to go (the landed, not yet at the gate design §2, §3,
 * Todd, 17 Nov 2026). Now only, as "Still on the ground" is: a replay reads where the map has the plane.
 */
export function isLandedBeforeGate(facts: TripFacts, leg: MapLeg, t: number): boolean {
  return !facts.isReplay && legLandedBeforeGate(leg, t)
}

/** Whether a flight with live data shows, which adsb.lol is credited for (Stage 3 spec §8). */
```

**In `src/facts/tripFacts.ts`, replace (5 of 8):**

```ts
 * The website's own (Todd, 16 Nov 2026): a real plane still on the ground at its departure airport is "Still on the
 * ground in Rockford", ahead of all of them. It has crossed nothing yet, whatever the schedule's times say.
 */
```

**with:**

```ts
 * The website's own (Todd, 16 Nov 2026): a real plane still on the ground at its departure airport is "Still on the
 * ground in Rockford", ahead of all of them. It has crossed nothing yet, whatever the schedule's times say. And at the
 * other end, down and not yet at the gate, "Landed in Anchorage", ahead of them too (the landed, not yet at the gate
 * design §3, Todd, 17 Nov 2026).
 */
```

**In `src/facts/tripFacts.ts`, replace (6 of 8):**

```ts
  if (isStillOnGround(facts, leg, t)) return stillOnGroundText(leg.origin.city)
  const recent = includesEvents ? factsMilestones(facts, leg).filter((m) => m.time <= t && t - m.time < MILESTONE_HEADLINE_MS).pop() : null
```

**with:**

```ts
  if (isStillOnGround(facts, leg, t)) return stillOnGroundText(leg.origin.city)
  if (isLandedBeforeGate(facts, leg, t)) return landedText(leg.destination.city)
  const recent = includesEvents ? factsMilestones(facts, leg).filter((m) => m.time <= t && t - m.time < MILESTONE_HEADLINE_MS).pop() : null
```

**In `src/facts/tripFacts.ts`, replace (7 of 8):**

```ts
 * takeoff time has passed none of its flight's events, whatever the schedule's times say, and its flight is left out
 * until it takes off, with no "In the air now".
 */
```

**with:**

```ts
 * takeoff time has passed none of its flight's events, whatever the schedule's times say, and its flight is left out
 * until it takes off, with no "In the air now". Down and not yet at the gate, it's tagged "Landed" (the landed, not yet
 * at the gate design §3, Todd, 17 Nov 2026).
 */
```

**In `src/facts/tripFacts.ts`, replace (8 of 8):**

```ts
      .map((m) => ({ text: milestoneLine(m, facts.viewerTz, facts.h24), isEstimate: m.isEstimate === true }))
    const tag = isMoving(leg, t) ? inTheAirTag(facts.isReplay) : null
    return tag != null || events.length > 0 ? [{ id: leg.id, title: flightTitle(leg), tag, events }] : []
```

**with:**

```ts
      .map((m) => ({ text: milestoneLine(m, facts.viewerTz, facts.h24), isEstimate: m.isEstimate === true }))
    const tag = !isMoving(leg, t) ? null : isLandedBeforeGate(facts, leg, t) ? LANDED_TAG : inTheAirTag(facts.isReplay)
    return tag != null || events.length > 0 ? [{ id: leg.id, title: flightTitle(leg), tag, events }] : []
```

**In `src/facts/tripFactsRows.ts`, replace (1 of 9):**

```ts
import {
  aircraftText, averageSpeedText, chaseText, closestToHomeText, cockpitEventText, flownText, flyingInto, groundSunText, halfwayText,
  heightAndSpeedText, landsText, midLine, moonText, stillOnGroundText, timeDifferenceText, toGoText,
} from '../copy/facts'
```

**with:**

```ts
import {
  aircraftText, allFlownText, averageSpeedText, chaseText, closestToHomeText, cockpitEventText, flownText, flyingInto, groundSunText,
  halfwayText, heightAndSpeedText, landsText, midLine, moonText, stillOnGroundText, timeDifferenceText, toGoText,
} from '../copy/facts'
```

**In `src/facts/tripFactsRows.ts`, replace (2 of 9):**

```ts
import { daysText, shortTimeText } from '../copy/format'
import { dayPhrase, landingLine, nextDepartureChip } from '../copy/tripMap'
import { landingWeatherText } from '../copy/weather'
```

**with:**

```ts
import { daysText, shortTimeText } from '../copy/format'
import { dayPhrase, gateLine, landedText, landingLine, nextDepartureChip } from '../copy/tripMap'
import { landingWeatherText } from '../copy/weather'
```

**In `src/facts/tripFactsRows.ts`, replace (3 of 9):**

```ts
import {
  belowText, forecastFor, isRecapOver, isStillOnGround, lastSeenText, latestEvent, sheetHeadline, showsLiveData, tripSoFar, type TripFacts,
} from './tripFacts'
```

**with:**

```ts
import {
  belowText, forecastFor, isLandedBeforeGate, isRecapOver, isStillOnGround, lastSeenText, latestEvent, sheetHeadline, showsLiveData, tripSoFar,
  type TripFacts,
} from './tripFacts'
```

**In `src/facts/tripFactsRows.ts`, replace (4 of 9):**

```ts
  const plane = legPlane(leg, t, facts.isReplay)
  return [belowRow(facts, leg, t), planeRow(leg, plane), skyRow(facts, leg, t), distanceRow(facts, leg, plane, t), headedRow(facts, leg, now)]
    .filter(notNull)
```

**with:**

```ts
  const plane = legPlane(leg, t, facts.isReplay)
  return [belowRow(facts, leg, t), planeRow(leg, plane), skyRow(facts, leg, t), distanceRow(facts, leg, plane, t), headedRow(facts, leg, t, now)]
    .filter(notNull)
```

**In `src/facts/tripFactsRows.ts`, replace (5 of 9):**

```ts
 * that there is leads the row. A real plane still at its departure airport says so in place of what's below (the
 * website's own, Todd, 16 Nov 2026).
 */
function belowRow(facts: TripFacts, leg: MapLeg, t: number): FactRow | null {
  const where = isStillOnGround(facts, leg, t) ? stillOnGroundText(leg.origin.city) : belowText(facts, leg, t)
```

**with:**

```ts
 * that there is leads the row. A real plane still at its departure airport says so in place of what's below (the
 * website's own, Todd, 16 Nov 2026). One down, not yet at the gate, says "Landed in Anchorage", alone: the rest goes
 * with what's below (the landed, not yet at the gate design §3, Todd, 17 Nov 2026).
 */
function belowRow(facts: TripFacts, leg: MapLeg, t: number): FactRow | null {
  if (isLandedBeforeGate(facts, leg, t)) return factRow('below', 'MapPin', landedText(leg.destination.city))
  const where = isStillOnGround(facts, leg, t) ? stillOnGroundText(leg.origin.city) : belowText(facts, leg, t)
```

**In `src/facts/tripFactsRows.ts`, replace (6 of 9):**

```ts
 * at its departure airport after the plan's takeoff time, as nothing says "flying" then (the website's own, Todd, 16
 * Nov 2026): its times would be the schedule's, for a plane that hasn't left.
 */
function skyRow(facts: TripFacts, leg: MapLeg, t: number): FactRow | null {
  if (isStillOnGround(facts, leg, t)) return null
  const next = (facts.sunEvents[leg.id] ?? []).find((e) => e.time > t) ?? null
```

**with:**

```ts
 * at its departure airport after the plan's takeoff time, as nothing says "flying" then (the website's own, Todd, 16
 * Nov 2026): its times would be the schedule's, for a plane that hasn't left. And once it's down, until the gate, as at
 * the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026).
 */
function skyRow(facts: TripFacts, leg: MapLeg, t: number): FactRow | null {
  if (isStillOnGround(facts, leg, t) || isLandedBeforeGate(facts, leg, t)) return null
  const next = (facts.sunEvents[leg.id] ?? []).find((e) => e.time > t) ?? null
```

**In `src/facts/tripFactsRows.ts`, replace (7 of 9):**

```ts
 * has flown nothing yet: "2,788 mi to go", and its halfway time is a guess from a takeoff that hasn't happened, "about"
 * (the website's own, Todd, 16 Nov 2026).
 */
```

**with:**

```ts
 * has flown nothing yet: "2,788 mi to go", and its halfway time is a guess from a takeoff that hasn't happened, "about"
 * (the website's own, Todd, 16 Nov 2026). One down, not yet at the gate, has nothing to go: "2,788 mi flown" (the landed,
 * not yet at the gate design §3, Todd, 17 Nov 2026).
 */
```

**In `src/facts/tripFactsRows.ts`, replace (8 of 9):**

```ts
  const onGround = isStillOnGround(facts, leg, t)
  const title = onGround ? toGoText(Math.round(total)) : flownText(flown, Math.round(total) - flown)
  return factRow('distance', 'Path', title, [
```

**with:**

```ts
  const onGround = isStillOnGround(facts, leg, t)
  const title = onGround ? toGoText(Math.round(total))
    : isLandedBeforeGate(facts, leg, t) ? allFlownText(flown)
    : flownText(flown, Math.round(total) - flown)
  return factRow('distance', 'Path', title, [
```

**In `src/facts/tripFactsRows.ts`, replace (9 of 9):**

```ts

function headedRow(facts: TripFacts, leg: MapLeg, now: number): FactRow {
  const forecast = forecastFor(facts, leg, now)
  const zone = leg.destination.timeZone
  return factRow('headed', 'AirplaneLanding', landingLine(leg, facts.viewerTz, facts.h24), [
    forecast ? landingWeatherText(forecast) : null,
```

**with:**

```ts

/**
 * When it lands, then the weather there and its time. Down, not yet at the gate, when it reaches the gate: "Reaches the
 * gate at 3:52 PM · 7:52 PM your time" (the landed, not yet at the gate design §3, Todd, 17 Nov 2026).
 */
function headedRow(facts: TripFacts, leg: MapLeg, t: number, now: number): FactRow {
  const forecast = forecastFor(facts, leg, now)
  const zone = leg.destination.timeZone
  const title = isLandedBeforeGate(facts, leg, t) ? gateLine(leg, facts.viewerTz, facts.h24) : landingLine(leg, facts.viewerTz, facts.h24)
  return factRow('headed', 'AirplaneLanding', title, [
    forecast ? landingWeatherText(forecast) : null,
```

**In `src/map/mapFlight.ts`, replace:**

```ts
/**
 * Whether `arrival`, the leg's gate arrival as it's shown, is the real plane's estimate, which the words mark with
```

**with:**

```ts
/**
 * Whether the real plane has landed, when this browser's clock says `now`: Crewlu Cloud's state for the flight is
 * "landed" (spec §5.1's `landed`). Until the gate the words say "Landed in Anchorage" (the landed, not yet at the gate
 * design §2, Todd, 17 Nov 2026).
 */
export const hasLanded = (flight: MapFlight, now: number): boolean => mapFlightProgress(flight, now).phase === 'landed'

/**
 * Whether `arrival`, the leg's gate arrival as it's shown, is the real plane's estimate, which the words mark with
```

**In `src/map/tripMap.ts`, replace (1 of 2):**

```ts
import { calendarDay } from '../time/zoned'
import { isAtDeparture, isEstimate, type MapFlight } from './mapFlight'
import { aimFractions, flatMapAngle } from './planeHeading'
```

**with:**

```ts
import { calendarDay } from '../time/zoned'
import { hasLanded, isAtDeparture, isEstimate, type MapFlight } from './mapFlight'
import { aimFractions, flatMapAngle } from './planeHeading'
```

**In `src/map/tripMap.ts`, replace (2 of 2):**

```ts

/** How far along the leg the schedule has the pilot, 0…1: a flight with the taxi allowances, a drive steadily. */
```

**with:**

```ts

/**
 * Whether the leg is between its gates at `now` while its real plane has landed: down, not yet at the gate (`leg.end`,
 * the real plane's estimate), and the words say "Landed in Anchorage" in place of "flying" (the landed, not yet at the
 * gate design §2, Todd, 17 Nov 2026). It reads the live data at `now`, so it's for now only, as `legStillOnGround` is.
 */
export const legLandedBeforeGate = (leg: MapLeg, now: number): boolean =>
  leg.flight != null && isMoving(leg, now) && hasLanded(leg.flight, now)

/** How far along the leg the schedule has the pilot, 0…1: a flight with the taxi allowances, a drive steadily. */
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 151 tests pass. Then `npx tsc --noEmit`: nothing; `npm test`: 177 test files and 3,727 tests pass; and `npm run build` ends `✓ built`. Last, the shared cases:

```bash
git status --short tests/fixtures/trip-map
```

Expected: nothing. No step changes them.

- [x] **Step 5: The checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && npm run build
```

Expected: 177 test files and 3,727 tests pass, and the build ends `✓ built`.

- [x] **Step 6: Commit, on Todd's yes.** Only these files, by path:

```bash
git add src/copy/facts.ts src/copy/tripMap.ts src/facts/tripFacts.ts src/facts/tripFactsRows.ts src/map/mapFlight.ts src/map/tripMap.ts tests/copy/facts.test.ts tests/copy/liveWords.test.ts tests/facts/liveTripFacts.test.ts tests/map/liveTrip.ts tests/map/liveTripMap.test.ts tests/ui/FactsBody.test.tsx
git commit -m "A real plane down, not yet at the gate, reads \"Landed in Anchorage\" on the facts and the card's chip, all of it flown, \"Reaches the gate\", and \"Landed\" in the list (Todd, 17 Nov 2026)"
```

---

### Task 3: The line under the timeline, the status sentence, the card's heading and bar, and the demo scene

The rest of the design's words, now only, and a scene for Todd's look. The line under the full map's timeline, and the slider's spoken value, say "Landed in Anchorage" (`landedIn` in `src/map/tripActivity.ts`, read by `TripTimeline` only while the clock is live; `lineWords` in `src/copy/tripMap.ts`). The status page's sentence says "Alex has landed in Anchorage on UPS flight 2963 — at the gate in 6m which is 7:52pm EST.", or "on the flight" with no flight number (`landedFlight` in `src/engine/liveLegs.ts`, passed by `PilotPages` and `StatusScreen` to the narrative's own branch). The card's heading for screen readers is "Landed" (`cardHeading`), and the card's bar says "At the gate 8:47 AM" in place of "Lands 8:47 AM" (`barArrival`, Todd, 17 Nov 2026), its label and the city's own time under it as before. And the demo's `live-landed`: UPS2963 off 8 minutes early, down in Anchorage a minute ago, "Landed 8 min early", at the gate 6 minutes on; the README lists it with the other live scenes. The design follows Todd's two answers of 17 Nov: "at" in its examples, and the bar's right side in its table, out of what's unchanged.

**Files:**
- Modify: `src/copy/narrative.ts`, `src/copy/tripMap.ts`, `src/data/demo.ts`, `src/data/demoLive.ts`, `src/engine/liveLegs.ts`, `src/map/tripActivity.ts`, `src/ui/PilotPages.tsx`, `src/ui/StatusScreen.tsx`, `src/ui/TripMapCard.tsx`, `src/ui/TripTimeline.tsx`, `README.md`, `docs/superpowers/specs/2026-11-17-landed-before-gate-design.md`
- Test: `tests/copy/activityWords.test.ts`, `tests/copy/liveWords.test.ts`, `tests/copy/narrativeAway.test.ts`, `tests/data/demoLive.test.ts`, `tests/data/demoScenes.test.ts`, `tests/engine/liveLegs.test.ts`, `tests/map/liveTripMap.test.ts`, `tests/ui/StatusScreen.test.tsx`, `tests/ui/liveMapPage.test.tsx`, `tests/ui/livePages.test.tsx`

- [x] **Step 1: Write the tests.**

**In `tests/copy/activityWords.test.ts`, replace:**

```ts
    expect(timelineSpokenValue(at(12), flying, 'America/New_York', false, null)).toMatch(/^Friday 7:00\sPM, flying to Cologne$/)
  })
})

```

**with:**

```ts
    expect(timelineSpokenValue(at(12), flying, 'America/New_York', false, null)).toMatch(/^Friday 7:00\sPM, flying to Cologne$/)
  })

  it('says where a flight’s real plane is down, not yet at the gate, in place of flying (the landed, not yet at the gate design §3, Todd, 17 Nov 2026)', () => {
    const flying = { kind: 'flying', place: cologne } as const
    expect(timelineLine(at(12), flying, 'America/New_York', false, null, cologne)).toMatch(/^Fri 7:00\sPM · Landed in Cologne$/)
    expect(timelineSpokenValue(at(12), flying, 'America/New_York', false, null, cologne)).toMatch(/^Friday 7:00\sPM, landed in Cologne$/)
    // Without it, flying, as before.
    expect(timelineLine(at(12), flying, 'America/New_York', false, null, null)).toMatch(/^Fri 7:00\sPM · Flying to Cologne$/)
  })
})

```

**In `tests/copy/liveWords.test.ts`, replace (1 of 3):**

```ts
import {
  cardHeading, flightStatus, gateLine, landedText, landingCountdown, landingLine, landsAt, liveSummary, spokenLiveLabel, spokenMinutes, topPill,
  tripMapSummary,
} from '../../src/copy/tripMap'
```

**with:**

```ts
import {
  barArrival, cardHeading, flightStatus, gateLine, landedText, landingCountdown, landingLine, landsAt, liveSummary, spokenLiveLabel, spokenMinutes,
  topPill, tripMapSummary,
} from '../../src/copy/tripMap'
```

**In `tests/copy/liveWords.test.ts`, replace (2 of 3):**

```ts

  it('is "Trip recap" or "Trip map" with no flight in the air, as before', () => {
```

**with:**

```ts

  it('is "Landed" while the real plane is down, not yet at the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026)', () => {
    // Down at 13:14:51, and at the gate 7 minutes later.
    const { leg } = caseLeg('landed, seen all the way')
    expect(cardHeading(mapOf(leg), leg.end - 3 * 60_000)).toBe('Landed')
    expect(cardHeading(mapOf(scheduleOnly(leg)), leg.end - 3 * 60_000)).toBe('In flight')
  })

  it('is "Trip recap" or "Trip map" with no flight in the air, as before', () => {
```

**In `tests/copy/liveWords.test.ts`, replace (3 of 3):**

```ts

  it('say "about" where the time is the real plane’s estimate, and "at" where it’s the schedule’s', () => {
```

**with:**

```ts

  it('say on the card’s bar when it reaches the gate, and "Lands" otherwise, as before (Todd, 17 Nov 2026)', () => {
    // Down at 13:14:51, and at the gate 7 minutes later, at 8:21 AM in Louisville.
    const { leg } = caseLeg('landed, seen all the way')
    expect(barArrival(leg, leg.end - 3 * 60_000, NY, false)).toMatch(/^At the gate 8:21\sAM$/)
    // At the gate, and with no live data.
    expect(barArrival(leg, leg.end, NY, false)).toMatch(/^Lands 8:21\sAM$/)
    expect(barArrival(scheduleOnly(leg), leg.end - 3 * 60_000, NY, false)).toMatch(/^Lands 8:21\sAM$/)
    // In the air, with "about" the real plane's estimate.
    const flying = caseLeg('ahead, in the air')
    expect(barArrival(flying.leg, flying.t, NY, false)).toBe(landsAt(flying.leg, NY, false))
    expect(barArrival(flying.leg, flying.t, NY, false)).toMatch(/^Lands about /)
  })

  it('say "about" where the time is the real plane’s estimate, and "at" where it’s the schedule’s', () => {
```

**In `tests/copy/narrativeAway.test.ts`, replace:**

```ts
    expect(plain(narrative(snapAt(driver, 100), { ...ctx(100), stillOnGroundFlight: null }))).toBe(flying)
  })
})
```

**with:**

```ts
    expect(plain(narrative(snapAt(driver, 100), { ...ctx(100), stillOnGroundFlight: null }))).toBe(flying)
  })
})

describe('narrative while the real plane is down, not yet at the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026)', () => {
  const driver = engineFor(demoRaw('driver', A))
  const snapAt = (e: ReturnType<typeof engineFor>, minutes: number) => makeSnapshot(e.schedule, e.legs, at(minutes), NY)
  /** The sentence at `minutes`, with the flight under way's real plane down at its arrival airport. */
  const landed = (e: ReturnType<typeof engineFor>, minutes: number, more: Partial<NarrativeCtx> = {}) => {
    const snap = snapAt(e, minutes)
    return narrative(snap, { ...ctx(minutes), landedFlight: (snap.status.current as MoveLeg).id, ...more })
  }
  const tripWith = (flight: Partial<FlightSpec>) =>
    engineFor(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX').trip('t1', {
        dutyPeriods: [{ start: 0, end: 400, flights: [{ dep: 'SDF', arr: 'ANC', out: 30, in: 330, ...flight }] }],
      }).build(),
    )

  it('says it has landed, and counts down to the gate, with the time as before', () => {
    expect(plain(landed(driver, 145))).toBe('Alex has landed in Rockford on UPS flight 2961 — at the gate in 5m which is 8:00am EDT.')
  })

  it('says "about" of a gate time that’s the real plane’s estimate, as before', () => {
    const end = (snapAt(driver, 145).status.current as MoveLeg).end
    expect(plain(landed(driver, 145, { estimatedArrival: end })))
      .toBe('Alex has landed in Rockford on UPS flight 2961 — at the gate in 5m which is about 8:00am EDT.')
  })

  it('bolds the place and the times, and colors the countdown with the status color', () => {
    const spans = landed(driver, 145)
    expect(spans.filter((s) => s.bold).map((s) => s.text)).toEqual(['Rockford', '5m', '8:00am EDT'])
    expect(coloredSpans(spans)).toEqual(['5m:status'])
    expect(spans.find((s) => s.text === '5m')?.spoken).toBe('5 minutes')
  })

  it('takes the place of a delayed flight’s words too, keeping its red countdown', () => {
    const spans = landed(driver, 1890)
    expect(plain(spans)).toBe('Alex has landed in Louisville on UPS flight 2962 — at the gate in 10m which is 1:10pm EDT.')
    expect(coloredSpans(spans)).toEqual(['10m:red'])
  })

  it('reads the same for a deadhead, and says "on the flight" when it has no usable number', () => {
    expect(plain(landed(tripWith({ dh: true }), 320))).toBe('Alex has landed in Anchorage on UPS flight 1000 — at the gate in 10m which is 11:00am EDT.')
    expect(plain(landed(tripWith({ number: null }), 320))).toBe('Alex has landed in Anchorage on the flight — at the gate in 10m which is 11:00am EDT.')
  })

  it('says flying, as before, when the plane down is another flight’s, or none is', () => {
    const flying = 'Alex is flying to Rockford on UPS flight 2961 from Louisville — landing in 5m which is 8:00am EDT.'
    expect(plain(narrative(snapAt(driver, 145), { ...ctx(145), landedFlight: 'another flight' }))).toBe(flying)
    expect(plain(narrative(snapAt(driver, 145), { ...ctx(145), landedFlight: null }))).toBe(flying)
  })
})
```

**In `tests/data/demoLive.test.ts`, replace:**

```ts

  it('stays itself while the page is open', () => {
```

**with:**

```ts

  it('live-landed: down in Anchorage 8 minutes early, a minute ago, and at the gate 6 minutes on (the landed, not yet at the gate design)', () => {
    const scene = sceneAt('live-landed')!
    expect(scene.progress.phase).toBe('landed')
    expect(scene.label).toBe('Landed 8 min early')
    expect(scene.flight.live?.callsign).toBe('UPS2963')
    expect(Math.round((NOW - scene.progress.touchdown!) / MINUTE)).toBe(1)
    expect(Math.round((scene.progress.end - NOW) / MINUTE)).toBe(6)
    expect(scene.flight.path.stretches.every((s) => s.kind !== 'unseen')).toBe(true)
  })

  it('stays itself while the page is open', () => {
```

**In `tests/data/demoScenes.test.ts`, replace (1 of 2):**

```ts
  'live-on-ground-late': 'inFlight',
}
```

**with:**

```ts
  'live-on-ground-late': 'inFlight',
  'live-landed': 'inFlight',
}
```

**In `tests/data/demoScenes.test.ts`, replace (2 of 2):**

```ts
    'live-on-ground-late': { progress: { day: 1, days: 2, upcoming: ['SDF'] } },
  }
```

**with:**

```ts
    'live-on-ground-late': { progress: { day: 1, days: 2, upcoming: ['SDF'] } },
    'live-landed': { progress: { day: 1, days: 2, upcoming: ['SDF'] } },
  }
```

**In `tests/engine/liveLegs.test.ts`, replace (1 of 2):**

```ts
import { describe, expect, it } from 'vitest'
import { buildLegs, type Leg } from '../../src/engine/legs'
import { estimatedArrival, isEstimatedArrival, liveMapFlights, stillOnGroundFlight, watchedFlights, withLiveTimes } from '../../src/engine/liveLegs'
import { resolveStatus } from '../../src/engine/status'
import type { Schedule } from '../../src/engine/types'
import type { GeoPoint } from '../../src/map/greatCircle'
```

**with:**

```ts
import { describe, expect, it } from 'vitest'
import { buildLegs, type Leg } from '../../src/engine/legs'
import {
  estimatedArrival, isEstimatedArrival, landedFlight, liveMapFlights, stillOnGroundFlight, watchedFlights, withLiveTimes,
} from '../../src/engine/liveLegs'
import { resolveStatus } from '../../src/engine/status'
import type { Schedule } from '../../src/engine/types'
import type { GeoPoint } from '../../src/map/greatCircle'
```

**In `tests/engine/liveLegs.test.ts`, replace (2 of 2):**

```ts
    expect(onGroundAt(null, 25)).toBeNull()
  })
})
```

**with:**

```ts
    expect(onGroundAt(null, 25)).toBeNull()
  })
})

describe('a real plane down, not yet at the gate (the landed, not yet at the gate design §2, Todd, 17 Nov 2026)', () => {
  const landedAt = (live: LiveFlight | null, minutes: number) => {
    const schedule = scheduleOf(TURN_TRIP)
    const now = START + minutes * MINUTE
    const flights = live ? flightsFor(schedule, live) : new Map()
    return landedFlight(buildLegs(withLiveTimes(schedule, flights, now)), flights, now)
  }

  it('is the flight between its gates whose plane has landed, by its id: the narrative says so', () => {
    // Down at 1:40, 20 minutes early, and at the gate at 1:47.
    expect(landedAt(OFF_EARLY_LANDED, 100)).toBe('f1')
    expect(landedAt(OFF_EARLY_LANDED, 106)).toBe('f1')
  })

  it('is nothing at the gate, in the air, still at its departure airport, and with no live data', () => {
    const atTheGate = liveFlight([], { legId: 'f1', state: 'ground', fix: fix(25 - 1 / 3, airport('SDF').lat, airport('SDF').lng, { onGround: true }) })
    expect(landedAt(OFF_EARLY_LANDED, 107)).toBeNull()
    expect(landedAt(IN_THE_AIR, 52)).toBeNull()
    expect(landedAt(atTheGate, 25)).toBeNull()
    expect(landedAt(null, 103)).toBeNull()
  })
})
```

**In `tests/map/liveTripMap.test.ts`, replace (1 of 2):**

```ts
import { pathPoints } from '../../src/map/flightPathDrawing'
import { pointsAlong } from '../../src/map/greatCircle'
import { fitRect } from '../../src/map/mapFit'
import { stillOnGroundIn } from '../../src/map/tripActivity'
import { framingPoints, isArrivalEstimated, legLandedBeforeGate, legStillOnGround, makeTripMap, type TripMap } from '../../src/map/tripMap'
import { atTheGate, FLYING, LANDED_EARLY, LIVE_AIRPORTS as AIRPORTS, liveTripMap, PHL, placeOf, SCHEDULE, SDF, SDF_PHL as F1 } from './liveTrip'
import { fix, liveFlight, MINUTE, point, START } from './madeUpFlights'
```

**with:**

```ts
import { pathPoints } from '../../src/map/flightPathDrawing'
import { pointsAlong } from '../../src/map/greatCircle'
import { fitRect } from '../../src/map/mapFit'
import { landedIn, stillOnGroundIn } from '../../src/map/tripActivity'
import { framingPoints, isArrivalEstimated, legLandedBeforeGate, legStillOnGround, makeTripMap, type TripMap } from '../../src/map/tripMap'
import { atTheGate, FLYING, LANDED_EARLY, LIVE_AIRPORTS as AIRPORTS, liveTripMap, PHL, placeOf, SCHEDULE, SDF, SDF_PHL as F1 } from './liveTrip'
import { fix, liveFlight, MINUTE, point, START } from './madeUpFlights'
```

**In `tests/map/liveTripMap.test.ts`, replace (2 of 2):**

```ts
      expect(legLandedBeforeGate(flightOf(liveTripMap(now, live)), now)).toBe(false)
    }
  })
})
```

**with:**

```ts
      expect(legLandedBeforeGate(flightOf(liveTripMap(now, live)), now)).toBe(false)
    }
  })

  it('names the airport it’s down at, which the line under the timeline names in place of "Flying to", and none otherwise', () => {
    const now = START + 103 * MINUTE
    expect(landedIn(liveTripMap(now, LANDED_EARLY), now)).toMatchObject({ code: 'PHL', city: 'Philadelphia' })
    for (const [live, minutes] of [[LANDED_EARLY, 107], [FLYING, 59], [atTheGate(25), 25], [null, 103]] as const) {
      const then = START + minutes * MINUTE
      expect(landedIn(liveTripMap(then, live), then)).toBeNull()
    }
  })
})
```

**In `tests/ui/StatusScreen.test.tsx`, replace (1 of 2):**

```tsx
    'live-on-ground-late': null,
  }
```

**with:**

```tsx
    'live-on-ground-late': null,
    'live-landed': null,
  }
```

**In `tests/ui/StatusScreen.test.tsx`, replace (2 of 2):**

```tsx
    )
    expect(container.querySelector('.inflight') != null).toBe(['flying', 'last-leg', 'live-ahead', 'live-ocean-gap', 'live-on-ground-late'].includes(scene))
  })
```

**with:**

```tsx
    )
    expect(container.querySelector('.inflight') != null).toBe(['flying', 'last-leg', 'live-ahead', 'live-ocean-gap', 'live-on-ground-late', 'live-landed'].includes(scene))
  })
```

**In `tests/ui/liveMapPage.test.tsx`, replace (1 of 2):**

```tsx
import { resetAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { TripMapCard } from '../../src/ui/TripMapCard'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { atTheGate, FLYING, liveTripMap } from '../map/liveTrip'
import { fix, MINUTE, START } from '../map/madeUpFlights'

afterEach(() => {
```

**with:**

```tsx
import { resetAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { TripMapCard } from '../../src/ui/TripMapCard'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { atTheGate, FLYING, LANDED_EARLY, liveTripMap } from '../map/liveTrip'
import { fix, MINUTE, START } from '../map/madeUpFlights'

afterEach(() => {
```

**In `tests/ui/liveMapPage.test.tsx`, replace (2 of 2):**

```tsx
    expect(line()).toMatch(/ · Flying to Philadelphia$/)
  })
})
```

**with:**

```tsx
    expect(line()).toMatch(/ · Flying to Philadelphia$/)
  })
})

describe('a real plane down, not yet at the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026)', () => {
  /** Three minutes after it landed, 13 minutes early, and four before it reaches the gate. */
  const DOWN = START + 103 * MINUTE
  const page = (t: number, live: Parameters<typeof liveTripMap>[1]) =>
    <TripMapPage map={liveTripMap(t, live)} now={t} viewerTz={NY} h24={false} day={1} days={1} land={null} onBack={() => {}} />
  const line = () => document.querySelector('.trip-timeline-time')?.textContent
  const slider = () => screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement

  it('heads the card "Landed" for screen readers, not "In flight"', () => {
    card(DOWN, LANDED_EARLY)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Landed')
  })

  it('says on the card’s bar when it reaches the gate, with its label and the time there under it as before (Todd, 17 Nov 2026)', () => {
    // In Los Angeles, the gate at 8:47 AM in Philadelphia is 5:47 AM.
    render(<TripMapCard map={liveTripMap(DOWN, LANDED_EARLY)} now={DOWN} viewerTz="America/Los_Angeles" h24={false} name="Alex" day={1} days={1}
      delayMinutes={null} land={null} onOpenMap={() => {}} />)
    expect(document.querySelector('.inflight-status')?.textContent).toBe('Landed 13 min early')
    expect(document.querySelector('.inflight-time')?.textContent).toMatch(/^At the gate 5:47\sAM$/)
    expect(document.querySelector('.inflight-code')?.textContent).toMatch(/^8:47\sAM in Philadelphia$/)
  })

  it('says under the full map’s timeline that it has landed there, now', () => {
    render(page(DOWN, LANDED_EARLY))
    expect(line()).toMatch(/^Fri 8:43\sAM · Landed in Philadelphia$/)
    expect(slider().getAttribute('aria-valuetext')).toMatch(/^Friday 8:43\sAM, landed in Philadelphia$/)
  })

  it('says "Flying to" in a replay, which reads where the map has the plane, and with no live data, as before', () => {
    render(page(DOWN, LANDED_EARLY))
    fireEvent.input(slider(), { target: { value: String(Number(slider().max) / 2) } })
    expect(line()).toMatch(/ · Flying to Philadelphia$/)
    cleanup()
    render(page(DOWN, null))
    expect(line()).toMatch(/^Fri 8:43\sAM · Flying to Philadelphia$/)
  })
})
```

**In `tests/ui/livePages.test.tsx`, replace (1 of 2):**

```tsx
import { PilotPages } from '../../src/ui/PilotPages'
import { atTheGate, FLYING, LIVE_AIRPORTS, SCHEDULE, SDF } from '../map/liveTrip'
import { fix, liveFlight, MINUTE, START } from '../map/madeUpFlights'
```

**with:**

```tsx
import { PilotPages } from '../../src/ui/PilotPages'
import { atTheGate, FLYING, LANDED_EARLY, LIVE_AIRPORTS, SCHEDULE, SDF } from '../map/liveTrip'
import { fix, liveFlight, MINUTE, START } from '../map/madeUpFlights'
```

**In `tests/ui/livePages.test.tsx`, replace (2 of 2):**

```tsx

describe('the Schedule page with a real plane (Stage 3 spec §9)', () => {
```

**with:**

```tsx

describe('the status page with a real plane down, not yet at the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026)', () => {
  /** Three minutes after it landed in Philadelphia, 13 minutes early, and four before it reaches the gate. */
  const DOWN = START + 103 * MINUTE
  const LANDED = { flights: new Map([['f1', LANDED_EARLY]]), clockOffset: 0 }

  it('says so in the narrative, counting down to the gate, and on the card’s heading and its chip', () => {
    vi.setSystemTime(DOWN)
    const container = page(LANDED)
    expect(container.querySelector('.narrative-text')?.textContent)
      // The countdown's digits, then its words for screen readers.
      .toMatch(/^Alex has landed in Philadelphia on UPS flight 1234 — at the gate in 4m4 minutes which is 8:47am EST\.$/)
    expect(container.querySelector('.trip-map-card h2')?.textContent).toBe('Landed')
    expect(container.querySelector('.trip-map-chip.bottom')?.textContent).toBe('Landed in Philadelphia')
  })

  it('keeps the bar’s label and the card’s sentence as they were, and the bar says when it reaches the gate (Todd, 17 Nov 2026)', () => {
    vi.setSystemTime(DOWN)
    const container = page(LANDED)
    expect(container.querySelector('.inflight-status')?.textContent).toBe('Landed 13 min early')
    expect(container.querySelector('.inflight-time')?.textContent).toMatch(/^At the gate 8:47\sAM$/)
    expect(container.querySelector('.trip-map-open')?.getAttribute('aria-label'))
      .toMatch(/^UPS1234 to Philadelphia, landed 13 minutes early\. Reaches the gate at 8:47\sAM your time\. (.+\. )?Opens the full map\.$/)
  })

  it('says flying, as before, with no live data', () => {
    vi.setSystemTime(DOWN)
    const container = page(null)
    expect(container.querySelector('.narrative-text')?.textContent).toMatch(/^Alex is flying to Philadelphia on UPS flight 1234 from Louisville — /)
    expect(container.querySelector('.trip-map-card h2')?.textContent).toBe('In flight')
    expect(container.querySelector('.inflight-time')?.textContent).toMatch(/^Lands 9:00\sAM$/)
  })
})

describe('the Schedule page with a real plane (Stage 3 spec §9)', () => {
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/copy/activityWords.test.ts tests/copy/liveWords.test.ts tests/copy/narrativeAway.test.ts tests/data/demoLive.test.ts tests/data/demoScenes.test.ts tests/engine/liveLegs.test.ts tests/map/liveTripMap.test.ts tests/ui/StatusScreen.test.tsx tests/ui/liveMapPage.test.tsx tests/ui/livePages.test.tsx
```

Expected: 18 of the 305 tests fail, in nine of the ten files. Four because `landedIn`, `landedFlight` and `barArrival` aren't there yet, two because `live-landed` isn't a scene yet, ten because the words still say the plane is flying: "Alex is flying to …" in five of the narrative's, "Flying to …" under the timeline (two), "In flight" for the card's heading (two), and the status page's sentence (one); and two because the card's bar still says "Lands 8:47 AM". `tests/ui/StatusScreen.test.tsx` passes. Its tests, and one of `tests/data/demoScenes.test.ts`'s, go through the scenes there are, and `live-landed` joins them with the code: three tests more at Step 4.

- [x] **Step 3: Write the code, the README's line and the design's words.**

**In `src/copy/narrative.ts`, replace (1 of 2):**

```ts
  stillOnGroundFlight?: string | null
}
```

**with:**

```ts
  stillOnGroundFlight?: string | null
  /**
   * The flight under way, by its leg's id, while its real plane is down at its arrival airport and not yet at the gate:
   * the sentence says it has landed (the landed, not yet at the gate design §3, Todd, 17 Nov 2026).
   */
  landedFlight?: string | null
}
```

**In `src/copy/narrative.ts`, replace (2 of 2):**

```ts
          .t(' — landing in ').cd(f.end, delay ? changed : 'status').t(' which is ').time(f.end).t('.').spans
      }
```

**with:**

```ts
          .t(' — landing in ').cd(f.end, delay ? changed : 'status').t(' which is ').time(f.end).t('.').spans
      }
      // Down, and on its way to the gate: "Alex has landed in Anchorage on UPS flight 2963 — at the gate in 8m which is
      // 7:52pm EST." (the landed, not yet at the gate design §3, Todd, 17 Nov 2026).
      if (ctx.landedFlight === f.id) {
        return n.t(`${name} has landed in `).b(city(f.arr)).t(`${fl || ' on the flight'} — at the gate in `)
          .cd(f.end, delay ? changed : 'status').t(' which is ').time(f.end).t('.').spans
      }
```

**In `src/copy/tripMap.ts`, replace (1 of 8):**

```ts
import {
  dayCount, destinationsOf, isArrivalEstimated, legInMotion, legStillOnGround, nextFlight, pilotLocation, currentLeg, type AirportMark, type MapLeg,
  type TripMap,
} from '../map/tripMap'
```

**with:**

```ts
import {
  dayCount, destinationsOf, isArrivalEstimated, legInMotion, legLandedBeforeGate, legStillOnGround, nextFlight, pilotLocation, currentLeg,
  type AirportMark, type MapLeg, type TripMap,
} from '../map/tripMap'
```

**In `src/copy/tripMap.ts`, replace (2 of 8):**

```ts

/** "9:30 PM in Cologne", or null when the destination keeps the family's time. */
```

**with:**

```ts

/**
 * The card's bar's arrival: "Lands 3:30 PM" (`landsAt`), or "At the gate 8:47 AM" while the real plane is down and not
 * yet at the gate, with no "about" (Todd, 17 Nov 2026, the landed, not yet at the gate design §3). The card is always now.
 */
export function barArrival(leg: MapLeg, now: number, viewerTz: string, h24: boolean): string {
  return legLandedBeforeGate(leg, now) ? `At the gate ${shortTimeText(leg.end, viewerTz, h24)}` : landsAt(leg, viewerTz, h24)
}

/** "9:30 PM in Cologne", or null when the destination keeps the family's time. */
```

**In `src/copy/tripMap.ts`, replace (3 of 8):**

```ts
 * The words under the timeline: the activity's, or "On the ground in Rockford" where the flight's real plane is still on
 * the ground at its departure airport, `stillOnGroundIn` (the website's own, Todd, 16 Nov 2026).
 */
function lineWords(activity: TripActivity | null, stillOnGroundIn: AirportMark | null): string | null {
  if (stillOnGroundIn) return `On the ground in ${stillOnGroundIn.city}`
  return activity ? activityWords(activity) : null
```

**with:**

```ts
 * The words under the timeline: the activity's, or "On the ground in Rockford" where the flight's real plane is still on
 * the ground at its departure airport, `stillOnGroundIn` (the website's own, Todd, 16 Nov 2026), or "Landed in
 * Anchorage" where it's down at its arrival airport and not yet at the gate, `landedIn` (the landed, not yet at the gate
 * design §3, Todd, 17 Nov 2026).
 */
function lineWords(activity: TripActivity | null, stillOnGroundIn: AirportMark | null, landedIn: AirportMark | null): string | null {
  if (stillOnGroundIn) return `On the ground in ${stillOnGroundIn.city}`
  if (landedIn) return landedText(landedIn.city)
  return activity ? activityWords(activity) : null
```

**In `src/copy/tripMap.ts`, replace (4 of 8):**

```ts
 * the flight's real plane is still on the ground at its departure airport, `stillOnGroundIn`, "Mon 12:21 PM · On the
 * ground in Rockford" (the website's own, Todd, 16 Nov 2026).
 */
```

**with:**

```ts
 * the flight's real plane is still on the ground at its departure airport, `stillOnGroundIn`, "Mon 12:21 PM · On the
 * ground in Rockford" (the website's own, Todd, 16 Nov 2026); while it's down and not yet at the gate, `landedIn`, "Mon
 * 7:45 PM · Landed in Anchorage" (the landed, not yet at the gate design §3, Todd, 17 Nov 2026).
 */
```

**In `src/copy/tripMap.ts`, replace (5 of 8):**

```ts
  ms: number, activity: TripActivity | null, viewerTz: string, h24: boolean, stillOnGroundIn: AirportMark | null = null,
): string {
  const time = timelineTime(ms, viewerTz, h24)
  const words = lineWords(activity, stillOnGroundIn)
  return words ? `${time} · ${words}` : time
```

**with:**

```ts
  ms: number, activity: TripActivity | null, viewerTz: string, h24: boolean, stillOnGroundIn: AirportMark | null = null,
  landedIn: AirportMark | null = null,
): string {
  const time = timelineTime(ms, viewerTz, h24)
  const words = lineWords(activity, stillOnGroundIn, landedIn)
  return words ? `${time} · ${words}` : time
```

**In `src/copy/tripMap.ts`, replace (6 of 8):**

```ts
  ms: number, activity: TripActivity | null, viewerTz: string, h24: boolean, stillOnGroundIn: AirportMark | null = null,
): string {
  const time = `${WEEKDAYS[zonedParts(ms, viewerTz).weekday]} ${shortTimeText(ms, viewerTz, h24)}`
  const words = lineWords(activity, stillOnGroundIn)
  if (!words) return time
```

**with:**

```ts
  ms: number, activity: TripActivity | null, viewerTz: string, h24: boolean, stillOnGroundIn: AirportMark | null = null,
  landedIn: AirportMark | null = null,
): string {
  const time = `${WEEKDAYS[zonedParts(ms, viewerTz).weekday]} ${shortTimeText(ms, viewerTz, h24)}`
  const words = lineWords(activity, stillOnGroundIn, landedIn)
  if (!words) return time
```

**In `src/copy/tripMap.ts`, replace (7 of 8):**

```ts
 * The map card's heading, for screen readers: "In flight", or "On the ground" while the flight's real plane is still
 * on the ground at its departure airport (the website's own, Todd, 16 Nov 2026); else "Trip recap" or "Trip map".
 */
```

**with:**

```ts
 * The map card's heading, for screen readers: "In flight", or "On the ground" while the flight's real plane is still
 * on the ground at its departure airport (the website's own, Todd, 16 Nov 2026), or "Landed" while it's down and not yet
 * at the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026); else "Trip recap" or "Trip map".
 */
```

**In `src/copy/tripMap.ts`, replace (8 of 8):**

```ts
  const leg = currentLeg(map)
  if (leg) return legStillOnGround(leg, now) ? 'On the ground' : 'In flight'
  return map.mode.kind === 'recap' ? 'Trip recap' : 'Trip map'
```

**with:**

```ts
  const leg = currentLeg(map)
  if (leg) return legStillOnGround(leg, now) ? 'On the ground' : legLandedBeforeGate(leg, now) ? 'Landed' : 'In flight'
  return map.mode.kind === 'recap' ? 'Trip recap' : 'Trip map'
```

**In `src/data/demo.ts`, replace (1 of 3):**

```ts
  | 'last-leg' | 'driving-home' | 'commuting-home' | 'reserve' | 'training' | 'nothing-ahead' | 'recap'
  | 'live-ahead' | 'live-ocean-gap' | 'live-on-ground-late'

```

**with:**

```ts
  | 'last-leg' | 'driving-home' | 'commuting-home' | 'reserve' | 'training' | 'nothing-ahead' | 'recap'
  | 'live-ahead' | 'live-ocean-gap' | 'live-on-ground-late' | 'live-landed'

```

**In `src/data/demo.ts`, replace (2 of 3):**

```ts
  // The real plane (Stage 3 spec §12), made up in demoLive.ts: ahead on the way to Rockford, the moment `flying` shows;
  // faded past a stretch nobody saw on the way to Anchorage; and still at Rockford's gate 20 minutes after the plan's
  // takeoff. `flying` stays the schedule's alone.
  'live-ahead': { variant: 'driver', offset: 100 },
```

**with:**

```ts
  // The real plane (Stage 3 spec §12), made up in demoLive.ts: ahead on the way to Rockford, the moment `flying` shows;
  // faded past a stretch nobody saw on the way to Anchorage; still at Rockford's gate 20 minutes after the plan's
  // takeoff; and down in Anchorage a minute ago, not yet at the gate. `flying` stays the schedule's alone.
  'live-ahead': { variant: 'driver', offset: 100 },
```

**In `src/data/demo.ts`, replace (3 of 3):**

```ts
  'live-on-ground-late': { variant: 'driver', offset: 260 },
}
```

**with:**

```ts
  'live-on-ground-late': { variant: 'driver', offset: 260 },
  'live-landed': { variant: 'driver', offset: 541 },
}
```

**In `src/data/demoLive.ts`, replace (1 of 2):**

```ts

export type LiveDemoScene = 'live-ahead' | 'live-ocean-gap' | 'live-on-ground-late'

```

**with:**

```ts

export type LiveDemoScene = 'live-ahead' | 'live-ocean-gap' | 'live-on-ground-late' | 'live-landed'

```

**In `src/data/demoLive.ts`, replace (2 of 2):**

```ts
  'live-on-ground-late': { number: '2963', bow: 0, takeoffLate: null, unseen: [], lastSeen: null },
}
```

**with:**

```ts
  'live-on-ground-late': { number: '2963', bow: 0, takeoffLate: null, unseen: [], lastSeen: null },
  // Rockford to Anchorage, off 8 minutes early and seen all the way: down a minute ago, "Landed 8 min early", and at the
  // gate 6 minutes on (the landed, not yet at the gate design, Todd, 17 Nov 2026).
  'live-landed': { number: '2963', bow: 0, takeoffLate: -8, unseen: [], lastSeen: null },
}
```

**In `src/engine/liveLegs.ts`, replace (1 of 2):**

```ts
import type { GeoPoint } from '../map/greatCircle'
import type { LiveFlight } from '../map/liveFlight'
import { isAtDeparture, isEstimate, makeMapFlight, mapFlightProgress, type MapFlight } from '../map/mapFlight'
import { isMove, type Leg } from './legs'
import type { DutyPeriod, Iata, Move, Schedule, Trip } from './types'
```

**with:**

```ts
import type { GeoPoint } from '../map/greatCircle'
import type { LiveFlight } from '../map/liveFlight'
import { hasLanded, isAtDeparture, isEstimate, makeMapFlight, mapFlightProgress, type MapFlight } from '../map/mapFlight'
import { isMove, type Leg } from './legs'
import type { DutyPeriod, Iata, Move, Schedule, Trip } from './types'
```

**In `src/engine/liveLegs.ts`, replace (2 of 2):**

```ts
  return leg ? leg.id : null
}
```

**with:**

```ts
  return leg ? leg.id : null
}

/**
 * The flight between its gates at `now` whose real plane has landed, by its leg's id: the narrative says so in place of
 * "flying", and counts down to the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026). Null with no such
 * flight.
 */
export function landedFlight(legs: Leg[], flights: ReadonlyMap<string, MapFlight>, now: number): string | null {
  if (flights.size === 0) return null
  const leg = legs.find((l) => {
    const flight = isMove(l) && l.start <= now && now < l.end ? flights.get(l.id) : undefined
    return flight != null && hasLanded(flight, now)
  })
  return leg ? leg.id : null
}
```

**In `src/map/tripActivity.ts`, replace (1 of 2):**

```ts
import { HOUR } from '../time/zoned'
import { isMoving, legInMotion, legStillOnGround, pilotLocation, type AirportMark, type GroundStop, type TripMap } from './tripMap'

```

**with:**

```ts
import { HOUR } from '../time/zoned'
import {
  isMoving, legInMotion, legLandedBeforeGate, legStillOnGround, pilotLocation, type AirportMark, type GroundStop, type TripMap,
} from './tripMap'

```

**In `src/map/tripActivity.ts`, replace (2 of 2):**

```ts
/**
 * Before the first departure, home for a next trip, or base while the pilot waits there, else home or base by where
```

**with:**

```ts
/**
 * Where the pilot's flight is down at `now`, while it's between its gates and its real plane has landed: its arrival
 * airport, which the line under the timeline names in place of "Flying to" (the landed, not yet at the gate design §3,
 * Todd, 17 Nov 2026). Null otherwise. Now only, as `stillOnGroundIn` is.
 */
export function landedIn(map: TripMap, now: number): AirportMark | null {
  const flight = map.legs.find((l) => l.kind === 'flight' && isMoving(l, now))
  return flight && legLandedBeforeGate(flight, now) ? flight.destination : null
}

/**
 * Before the first departure, home for a next trip, or base while the pilot waits there, else home or base by where
```

**In `src/ui/PilotPages.tsx`, replace (1 of 2):**

```tsx
import { buildLegs, type Leg } from '../engine/legs'
import { estimatedArrival, liveMapFlights, stillOnGroundFlight, withLiveTimes } from '../engine/liveLegs'
import { safeSnapshot, type Snapshot } from '../engine/snapshot'
```

**with:**

```tsx
import { buildLegs, type Leg } from '../engine/legs'
import { estimatedArrival, landedFlight, liveMapFlights, stillOnGroundFlight, withLiveTimes } from '../engine/liveLegs'
import { safeSnapshot, type Snapshot } from '../engine/snapshot'
```

**In `src/ui/PilotPages.tsx`, replace (2 of 2):**

```tsx
  const onGround = ready ? stillOnGroundFlight(ready.legs, ready.flights, now) : null
  const status = {
    snap, now, viewerTz, homeTz, h24, airports, weather, demo, celebrateKey, footer, notice, quickStatus, tripMap, land, facts,
    onOpenMap: mapPage.show, estimatedArrival: estimated, stillOnGroundFlight: onGround,
  }
```

**with:**

```tsx
  const onGround = ready ? stillOnGroundFlight(ready.legs, ready.flights, now) : null
  // And the flight under way while its real plane is down, not yet at the gate: the narrative says it has landed (the
  // landed, not yet at the gate design §3, Todd, 17 Nov 2026).
  const down = ready ? landedFlight(ready.legs, ready.flights, now) : null
  const status = {
    snap, now, viewerTz, homeTz, h24, airports, weather, demo, celebrateKey, footer, notice, quickStatus, tripMap, land, facts,
    onOpenMap: mapPage.show, estimatedArrival: estimated, stillOnGroundFlight: onGround, landedFlight: down,
  }
```

**In `src/ui/StatusScreen.tsx`, replace (1 of 2):**

```tsx
  stillOnGroundFlight?: string | null
}
```

**with:**

```tsx
  stillOnGroundFlight?: string | null
  /**
   * The flight under way, by its leg's id, while its real plane is down and not yet at the gate: the narrative says it
   * has landed (the landed, not yet at the gate design §3, Todd, 17 Nov 2026).
   */
  landedFlight?: string | null
}
```

**In `src/ui/StatusScreen.tsx`, replace (2 of 2):**

```tsx
    now: p.now, viewerTz: p.viewerTz, h24: p.h24, airports: p.airports, estimatedArrival: p.estimatedArrival, stillOnGroundFlight: p.stillOnGroundFlight,
  })
```

**with:**

```tsx
    now: p.now, viewerTz: p.viewerTz, h24: p.h24, airports: p.airports, estimatedArrival: p.estimatedArrival, stillOnGroundFlight: p.stillOnGroundFlight,
    landedFlight: p.landedFlight,
  })
```

**In `src/ui/TripMapCard.tsx`, replace (1 of 2):**

```tsx
import { delayBannerText, spokenDelayBanner } from '../copy/flight'
import { arrivalLocalTime, cardChips, cardHeading, flightStatus, landsAt, statsItems, tripMapSummary } from '../copy/tripMap'
import type { GeoPoint } from '../map/greatCircle'
```

**with:**

```tsx
import { delayBannerText, spokenDelayBanner } from '../copy/flight'
import { arrivalLocalTime, barArrival, cardChips, cardHeading, flightStatus, statsItems, tripMapSummary } from '../copy/tripMap'
import type { GeoPoint } from '../map/greatCircle'
```

**In `src/ui/TripMapCard.tsx`, replace (2 of 2):**

```tsx
      <div class="inflight-arrival">
        <p class="inflight-time">{landsAt(leg, viewerTz, h24)}</p>
        {local && <span class="inflight-code">{local}</span>}
```

**with:**

```tsx
      <div class="inflight-arrival">
        {/* "Lands 3:30 PM", or "At the gate 8:47 AM" once the real plane is down (Todd, 17 Nov 2026). */}
        <p class="inflight-time">{barArrival(leg, now, viewerTz, h24)}</p>
        {local && <span class="inflight-code">{local}</span>}
```

**In `src/ui/TripTimeline.tsx`, replace (1 of 4):**

```tsx
import { timelineBlocks } from '../map/timelineBlocks'
import { activityAt, stillOnGroundIn } from '../map/tripActivity'
import type { TripMap } from '../map/tripMap'
```

**with:**

```tsx
import { timelineBlocks } from '../map/timelineBlocks'
import { activityAt, landedIn, stillOnGroundIn } from '../map/tripActivity'
import type { TripMap } from '../map/tripMap'
```

**In `src/ui/TripTimeline.tsx`, replace (2 of 4):**

```tsx
  const waitingIn = isLive(clock) ? stillOnGroundIn(map, t) : null
  // The blocks follow the trip and the pace alone: the clock's span, legs and waits are the map's. Worked out once
```

**with:**

```tsx
  const waitingIn = isLive(clock) ? stillOnGroundIn(map, t) : null
  // And down at the arrival airport before the gate, "Landed" there, now only (the landed, not yet at the gate design §3,
  // Todd, 17 Nov 2026).
  const downIn = isLive(clock) ? landedIn(map, t) : null
  // The blocks follow the trip and the pace alone: the clock's span, legs and waits are the map's. Worked out once
```

**In `src/ui/TripTimeline.tsx`, replace (3 of 4):**

```tsx
          <TripTimelineBlocks blocks={blocks} progress={progressAt(clock, t)} />
          <input type="range" class="trip-timeline-slider" aria-label="Trip time" aria-valuetext={timelineSpokenValue(t, activity, viewerTz, h24, waitingIn)}
            min={0} max={Math.max(whole, 1)} step="any" value={offset} onKeyDown={onKeyDown}
```

**with:**

```tsx
          <TripTimelineBlocks blocks={blocks} progress={progressAt(clock, t)} />
          <input type="range" class="trip-timeline-slider" aria-label="Trip time" aria-valuetext={timelineSpokenValue(t, activity, viewerTz, h24, waitingIn, downIn)}
            min={0} max={Math.max(whole, 1)} step="any" value={offset} onKeyDown={onKeyDown}
```

**In `src/ui/TripTimeline.tsx`, replace (4 of 4):**

```tsx
      </div>
      <p class="trip-timeline-time" aria-hidden="true">{timelineLine(t, activity, viewerTz, h24, waitingIn)}</p>
      <div class="trip-timeline-row trip-timeline-settings">
```

**with:**

```tsx
      </div>
      <p class="trip-timeline-time" aria-hidden="true">{timelineLine(t, activity, viewerTz, h24, waitingIn, downIn)}</p>
      <div class="trip-timeline-row trip-timeline-settings">
```

**In `README.md`, replace:**

```markdown
  - A marker shows what the pilot is doing on the ground: a bed on a layover (`layover`), an hourglass at a turn (`turn`), a briefcase at base (`base`), a house at home (`home`).
  - The real plane, from Crewlu Cloud's `partner_live` (Stage 3): `live-ahead` (in the air, ahead of schedule), `live-ocean-gap` (faded, an estimate past a stretch nobody saw) and `live-on-ground-late` (still at the gate after the plan's takeoff), with made-up flights. `flying` stays the schedule's alone.
  - The full map's timeline is colored by what the pilot is doing. Its "Quick layovers" switch, on by default and remembered in the browser, hurries a replay through each wait.
```

**with:**

```markdown
  - A marker shows what the pilot is doing on the ground: a bed on a layover (`layover`), an hourglass at a turn (`turn`), a briefcase at base (`base`), a house at home (`home`).
  - The real plane, from Crewlu Cloud's `partner_live` (Stage 3): `live-ahead` (in the air, ahead of schedule), `live-ocean-gap` (faded, an estimate past a stretch nobody saw), `live-on-ground-late` (still at the gate after the plan's takeoff) and `live-landed` (down, a few minutes from the gate), with made-up flights. `flying` stays the schedule's alone.
  - The full map's timeline is colored by what the pilot is doing. Its "Quick layovers" switch, on by default and remembered in the browser, hurries a replay through each wait.
```

**In `docs/superpowers/specs/2026-11-17-landed-before-gate-design.md`, replace (1 of 3):**

```markdown
the website's "Still on the ground in Rockford" (plan 3C-3, Todd, 16 Nov 2026), and it settles an item that plans 3C-3 and
3C-4 left for later. The app gets the same words, by its own plan.

```

**with:**

```markdown
the website's "Still on the ground in Rockford" (plan 3C-3, Todd, 16 Nov 2026), and it settles an item that plans 3C-3 and
3C-4 left for later. The app gets the same words, by its own plan. Todd settled two details on 17 Nov 2026, from the
website's plan: "at", not "about", once the plane is down, as the card's sentence and the popup say it; and the bar's right
side, "At the gate 8:47 AM".

```

**In `docs/superpowers/specs/2026-11-17-landed-before-gate-design.md`, replace (2 of 3):**

```markdown
| The sky row | shown | **left out**, as at the gate |
| The landing row | "Lands Anchorage about 3:52 PM · 7:52 PM your time" | **Reaches the gate about 3:52 PM · 7:52 PM your time** ("at" where the time is the schedule's, "about" where it's the real plane's estimate, as the card's sentence); the weather line under it as before |
| The list's tag on the flight | "In the air now" | **Landed** (its border kept) |
| The line under the timeline (and the slider's spoken value) | "Flying to Anchorage" | **Landed in Anchorage** |
| The status page's sentence | "Alex is flying to Anchorage on UPS flight 2963 from Rockford — landing in 8m which is about 7:52pm EST." | **Alex has landed in Anchorage on UPS flight 2963 — at the gate in 8m which is about 7:52pm EST.** (with no flight number, "on the flight") |
| The card's heading for screen readers | "In flight" | **Landed** |
```

**with:**

```markdown
| The sky row | shown | **left out**, as at the gate |
| The landing row | "Lands Anchorage about 3:52 PM · 7:52 PM your time" | **Reaches the gate at 3:52 PM · 7:52 PM your time** ("at", as the card's sentence and the popup say it once the plane is down); the weather line under it as before |
| The card's bar, its right side | "Lands 8:47 AM" | **At the gate 8:47 AM** (the city's own time under it as before) |
| The list's tag on the flight | "In the air now" | **Landed** (its border kept) |
| The line under the timeline (and the slider's spoken value) | "Flying to Anchorage" | **Landed in Anchorage** |
| The status page's sentence | "Alex is flying to Anchorage on UPS flight 2963 from Rockford — landing in 8m which is about 7:52pm EST." | **Alex has landed in Anchorage on UPS flight 2963 — at the gate in 8m which is 7:52pm EST.** (with no flight number, "on the flight") |
| The card's heading for screen readers | "In flight" | **Landed** |
```

**In `docs/superpowers/specs/2026-11-17-landed-before-gate-design.md`, replace (3 of 3):**

```markdown

- The flight's bar ("Landed 8 min early", "Landed on time", "Landed 8 min late").
- The card's sentence for screen readers ("…, landed 8 minutes early. Reaches the gate at 7:52 PM your time.").
```

**with:**

```markdown

- The flight's bar's left side ("Landed 8 min early", "Landed on time", "Landed 8 min late").
- The card's sentence for screen readers ("…, landed 8 minutes early. Reaches the gate at 7:52 PM your time.").
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 308 tests pass. Then `npx tsc --noEmit`: nothing; `npm test`: 177 test files and 3,751 tests pass; and `npm run build` ends `✓ built`. Last, the shared cases:

```bash
git status --short tests/fixtures/trip-map
```

Expected: nothing. No step changes them.

- [x] **Step 5: The checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && npm run build
```

Expected: 177 test files and 3,751 tests pass, and the build ends `✓ built`.

- [x] **Step 6: Commit, on Todd's yes.** Only these files, by path:

```bash
git add README.md docs/superpowers/specs/2026-11-17-landed-before-gate-design.md src/copy/narrative.ts src/copy/tripMap.ts src/data/demo.ts src/data/demoLive.ts src/engine/liveLegs.ts src/map/tripActivity.ts src/ui/PilotPages.tsx src/ui/StatusScreen.tsx src/ui/TripMapCard.tsx src/ui/TripTimeline.tsx tests/copy/activityWords.test.ts tests/copy/liveWords.test.ts tests/copy/narrativeAway.test.ts tests/data/demoLive.test.ts tests/data/demoScenes.test.ts tests/engine/liveLegs.test.ts tests/map/liveTripMap.test.ts tests/ui/StatusScreen.test.tsx tests/ui/liveMapPage.test.tsx tests/ui/livePages.test.tsx
git commit -m "A real plane down, not yet at the gate, reads \"Landed in Anchorage\" under the timeline, \"has landed … at the gate in\" on the status page, \"Landed\" in the card's heading and \"At the gate\" on its bar, with the demo scene live-landed (Todd, 17 Nov 2026)"
```

---

### Task 4: Todd looks at the words

The tests check the words. This is the look at them.

- [x] **Step 1: Start the site with Apple's map.** The worktree has the MapKit token in `.env.local` from plan 3C-2 (git-ignored; it lasts to 22 Nov 2026: if the site's own map shows instead of Apple's, it has run out, and Todd makes another as the README says). The session starts the `crewluve-mapkit` server (`.claude/launch.json`, port 5182) with its preview tool, reads in `live-landed` the card's heading (`.trip-map-card h2`), the card's sentence (the card's button's `aria-label`, `[data-trip-map-open]`) and, on the full map, the slider's spoken value (`aria-valuetext`), and gives Todd those and the addresses:
  - `http://localhost:5182/?demo=1&scene=live-landed`, and the same with `#map` at the end. The plane landed a minute before the page loads and reaches the gate about 6 minutes after: reload the page to start the scene again.
  - `http://localhost:5182/?demo=1&scene=live-ahead` and `…scene=flying`, each also with `#map`: a plane in the air, and a flight with no live data.
- [x] **Step 2: Todd looks, on a phone and a computer:**
  - in `live-landed`, the status page's sentence: "Alex has landed in Anchorage on UPS flight 2963 — at the gate in 6m which is …", counting down; the card's chip: "Landed in Anchorage"; the card's bar: "Landed 8 min early" and "At the gate …", with the time in Anchorage under it;
  - on the full map, its first line and "More facts": "Landed in Anchorage" alone on the first row, the plane's row with no height or speed, "… mi flown" with its comparison, no sky row, "Reaches the gate at …" with the weather and the time there, and the list's "Landed", its border kept;
  - the line under the timeline: "… · Landed in Anchorage"; and dragged back into the flight, "… · Flying to Anchorage";
  - unchanged: the popup's "Reaches the gate at …", the card's sentence's "landed 8 minutes early. Reaches the gate at …", and the latest event's banner;
  - in `live-ahead` and `flying`: as before, "Flying to …", "In the air now", "… mi flown · … to go", the bar's "Lands …", and the sentence's "is flying to".
- [x] **Step 3: Write down what was wrong.** Anything that needs a change goes in "Changes made during execution", is fixed in Task 2's or Task 3's files with a test where a test can see it, and has Todd run the tests again.

---

### Task 5: The review, and the record

- [x] **Step 1: The review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Tasks 2 and 3's commits (from `9af2c47`), against the design and this plan's list of where it settles details. Make its fixes, tests first, run `npm test` and `npm run build`, and record what it found.
- [x] **Step 2: Todd runs everything once more** (Task 3 Step 5's command), if the review changed anything, and the fix is committed on his yes, its own files by path.
- [x] **Step 3: This plan's record.** Under "Changes made during execution": the review, each of Todd's runs (the count and the time), what Task 4 turned up, and each commit's hash.
- [x] **Step 4: Commit, on Todd's yes.**

```bash
git add docs/superpowers/plans/2026-11-17-website-landed-before-gate.md
git commit -m "The website's landed, not yet at the gate plan, with its record"
```

---

### Task 6: Going live, on Todd's yes

This plan goes live, with the design's commit before it (`9af2c47`). Pushing to `main` publishes the site: `.github/workflows` tests and builds every push to `main`, then publishes it to Pages. **Nothing here runs without Todd's yes in the conversation, asked when this task is reached.**

- [x] **Step 1: Ask Todd** whether to go live now. If not, stop: the branch stays as it is, and this task waits.
- [x] **Step 2: Bring the branch up to `main`.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git fetch origin && git merge-base --is-ancestor origin/main HEAD && echo "fast-forward"
```

Expected: `fast-forward`. If it isn't (`main`, at `e5e054d` when this plan was written, has moved on), merge it in here: `git merge origin/main`. If any file conflicts, STOP and tell Todd. Then run `npm test && npm run build`.

- [x] **Step 3: Todd runs everything** (Task 3 Step 5's command) on the branch as it will go live.
- [x] **Step 4: Push the branch to `main`, on Todd's yes.** A fast-forward only; never force.

```bash
git push origin claude/trip-map-live-598046:main
```

- [x] **Step 5: Watch the deploy** (`gh run watch` on the run the push started) until it succeeds. If it fails, tell Todd at once with its log: the site stays as it was until a deploy succeeds.
- [x] **Step 6: Look at the live site** with Todd, at `https://crewluve.crewlu.net/?demo=1&scene=live-landed` and `…&scene=live-landed#map` (reload to start the scene again): the status sentence, the chip, the bar's "At the gate …", "More facts", the list's "Landed" and the line under the timeline; and `…scene=live-ahead#map` and `…scene=flying#map`, unchanged.
- [x] **Step 7: The record.** Under "Changes made during execution": the push's commit, the deploy's run and time, and what Todd saw. Commit the plan on his yes and push it (a fast-forward only), as Step 4.

---

## What the app takes from this one

The design gives the app the same words, by its own plan. As the website has them:

- **When:** Crewlu Cloud's state is "landed" and the moment is before the leg's gate arrival (the real plane's), now only: a replay reads the map's plane, and a flight with no live data reads as before.
- **The facts' headline, their first row and the card's chip:** "Landed in Anchorage", ahead of an event or a sun countdown. The first row says it alone.
- **The distance row:** "2,788 mi flown", with its comparison line. **No sky row.**
- **The landing row:** "Reaches the gate at 3:52 PM · 7:52 PM your time", with the weather and the time there under it: "at" once the plane is down, as the card's sentence and the popup say it (Todd, 17 Nov 2026).
- **The card's bar, its right side:** "At the gate 8:47 AM" in place of "Lands 8:47 AM", the city's own time under it as before (Todd, 17 Nov 2026).
- **The list's tag:** "Landed", set apart as the flight in the air is.
- **Under the timeline, and its spoken value:** "Landed in Anchorage", "Monday 7:45 PM, landed in Anchorage".
- **The status sentence:** "Alex has landed in Anchorage on UPS flight 2963 — at the gate in 8m which is 7:52pm EST.", with no "about", and "on the flight" with no flight number.
- **The card's heading for screen readers:** "Landed".
- **Unchanged:** the bar's label ("Landed 8 min early"), the card's sentence, the popup, the latest event's banner, and the plane's row.

## Changes made during execution

**Run in session `68f03a67` (17 Nov 2026, from about 12:50 PM), from the plan's own text** by the scratch folder's `run_steps.py` (tests first, then the code). Every file each task touched was the same as tested.

- **Task 1:** the worktree as expected (`9af2c47`, only this plan untracked).
- **Task 2:** 14 of 151 failing first; then 151 passing; `tsc` clean; `npm test` 177 / 3,727; built. Todd chose "Run each in my Terminal, commit each": his run at 12:56 PM, 177 test files and 3,727 tests passed, built. **Commit:** `82daf4d`, the same as tested.
- **Task 3:** 18 of 305 failing first; then 308 passing; `tsc` clean; `npm test` 177 / 3,751; built. Todd's run at 12:58 PM, 177 test files and 3,751 tests passed, built. **Commit:** `329ce7a`, the same as tested.
- **Task 4, Todd's look** at `live-landed` on the worktree's site (the session read it first: "At the gate 1:05 PM", the "Landed" heading, "Landed in Anchorage", "Alex has landed in Anchorage on UPS flight 2963 — at the gate in 5m…"). **Todd: "Looks good."**
- **Task 5, the review** (`superpowers:code-reviewer`, sonnet, on `82daf4d` and `329ce7a`): nothing critical or important. **No change made.**
  - It found right: every surface asks both "landed" and "the leg under way", so nothing shows at or after the gate or on another leg; the engine's `landed` phase is the plane on the ground at its arrival airport (one down elsewhere is `elsewhere`); never in a replay; "at" everywhere once down; the banner kept; the status sentence's branch after "still on the ground" and before the delay's; the demo scene's timing pinned by its test; the shared cases untouched.
  - Minor, left: "Reaches the gate" is built in three places (the card's sentence says "at" outright; the facts' row and the popup ask `about(leg)`, which is empty once down), so a change to what counts as an estimate would have to touch all three; `LANDED_TAG` is a constant beside the function `inTheAirTag`; a deadhead reads "has landed", as the plan intends; a landed flight with no fix is the engine's `notLive`, unchanged.
- **Task 6, going live:** Todd chose "Go live: run it, then push if it passes" (about 1 PM). `origin/main` was `e5e054d`, a fast-forward (no merge needed).
  - **Plan committed:** `0dc94d5`. **Todd's run on the branch as it went live:** at 1:02 PM, 177 test files and 3,751 tests passed, built.
  - **Pushed:** `e5e054d..0dc94d5`. **The deploy failed** (run `44143542325`): GitHub's build runs in UTC, and three of Task 3's tests in `tests/ui/livePages.test.tsx` wrote the gate's time as Eastern ("8:47 AM", "8:47am EST", "9:00 AM"); they passed on Todd's Mac and failed there. The live site stayed at `e5e054d`. The session reproduced it with `TZ=UTC npx vitest run` (only those three failed), and Todd chose "Commit and push the fix": the three tests match the hour and zone loosely and keep the minutes, as the still-on-the-ground tests beside them do; the whole suite passed in UTC and in Eastern time. **Fix:** `8d5bd2d`, pushed `0dc94d5..8d5bd2d`. **Deployed:** run `44144158414`, build and deploy succeeded, 1:07 PM EST (18:07 UTC).
  - **The live site:** the session read `https://crewluve.crewlu.net/?demo=1&scene=live-landed` (the new bundle; "At the gate 1:13 PM", "Landed in Anchorage", "2,788 mi flown", "Reaches the gate at 9:13 AM · 1:13 PM your time", "Alex has landed in Anchorage on UPS flight 2963 — at the gate in 5m…"). **Todd: "Looks good."**
  - Left for later: in a zone written "GMT+9" rather than letters, four tests of `tests/ui/livePages.test.tsx` (three older ones among them) don't match the zone's name; GitHub's build and Todd's Mac aren't such zones.

## Self-review

- **The design covered:** §2's moment, now only, and a flight with no live data as before (Task 2's `hasLanded`, `legLandedBeforeGate`, `isLandedBeforeGate`; Task 3's `landedIn`, `landedFlight`); every row of §3's table: the headline, the first row and the card's chip, the distance row, the sky row, the landing row, the list's tag (Task 2); the line under the timeline and the slider's spoken value, the status sentence, the card's heading and the bar's right side (Task 3); §3's note on the first row's other lines (Task 2). The demo scene, and the design brought up to Todd's two answers (Task 3).
- **Not covered here, on purpose:** §4's unchanged words (the bar's label, the card's sentence, the popup, the banner, the plane's row), each with a test that it stays; §5's diversion, air return and the app's words.
- **Placeholders:** none. Every step's code is the tested file or a replacement made from it.
- **What could it break?**
  - The words change for every family whose pilot's flight has live data, for the minutes between touchdown and the gate. The shared `facts-cases.json` and `live-cases.json` pass unchanged: neither has a moment in that window.
  - The facts' headline now leads with "Landed in Anchorage" over a crossing of the last five minutes: the card's chip and the full map's first line leave events out already (the banner shows them), so only the shared cases' reading of the headline, which has none in that window, could see it.
  - The status page works out one more flight a second (`landedFlight`), as it does `stillOnGroundFlight`: a few legs, a lookup each.

## Left for later

- **A diversion,** a plane down somewhere other than its arrival airport, and **an air return,** back at its departure airport: the design's §5, as plan 3C-3 left them.
- **Plan 3C-4's "Left for later"** holds, with plans 3C-1 to 3C-3's.
