# Moving Map Stage 3C-2 (the Website, the Map) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the real plane on the website. Where Crewlu Cloud has seen the pilot's flight, the family sees the path it really flew, the real plane on it with the schedule's ghost beside it, how far ahead or behind it is, and one landing time on every card. The demo gets three scenes with made-up real planes.

**Architecture:**
- **One landing time** is worked out in one place. `src/engine/liveLegs.ts` writes each live flight's real times into the engine's `Schedule` (its `Move`s), and the status page builds every leg from that schedule, so the status, the map, the countdown, the narrative and the trip cards all read one landing time. The waits either side follow by themselves: `buildLegs` makes the turns and the nights from the flights' times.
- **`MapFlight`** (`src/map/mapFlight.ts`) is a flight's plan, path and record, made together from one answer. A flight leg of the map carries one on `MapLeg.flight` when Crewlu Cloud has answered for it. A flight with none draws exactly as before.
- **`flightDrawing`** (`src/map/flightDrawing.ts`) says what one flight draws at a moment, by `LiveProgress.phase`: the real path (solid where the plane was seen, dotted where it wasn't), the real plane, and the ghost. `tripMapDrawing` puts the flights together, and the SVG map and Apple's map render it.
- **The status page owns the live source.** `useLivePlane` (`src/ui/hooks/useLivePlane.ts`) makes one `makeLiveSource` with the page, tells it which flights to watch, asks when the page is shown and stops when it's hidden. `Root`'s `PartnerLive` owns it and hands its flights to `PilotPages`, which writes the real times in at each new answer and each minute.
- **The words** are `src/copy/tripMap.ts`'s: the label on the card's bar and the full map's pill, "about" before a landing time that's the real plane's estimate, and the card's sentence for a screen reader.
- **The demo** (`src/data/demoLive.ts`) makes up a real plane for three new scenes, worked out from the clock, so each scene stays itself while it's open.

**Tech Stack:** Preact 10, TypeScript 5.9 (strict), Vite 5, Vitest 3 (node for the pure code, happy-dom for the views), MapKit JS. No new package.

**Sources (read only):**
- **The spec,** in the Crewluv repo (`~/Dev/Crewluv`, at `9f06e71`): `docs/superpowers/specs/2026-11-14-crewluve-moving-map-stage3-live-design.md` ("the spec"), §5 to §7, §9, §12, §13 and §15.
- **The app's map plan,** same repo: `docs/superpowers/plans/2026-11-15-moving-map-stage3b2-app-map.md`. This plan follows it: its list of where it settles or differs from the spec, and the table at the head of its Task 6, hold here too, but for the website's own choices below. Its Swift is the reference: `Crewluv/Services/TripMap/Live/MapFlight.swift`, `FlightPath+Drawing.swift`, `LiveLegs.swift`, and `Crewluv/Services/TripMap/FlightDrawing.swift`, `TripReplayClock.swift`, `TripMapWording.swift`.
- **Plan 3C-1** (`docs/superpowers/plans/2026-11-15-moving-map-stage3c1-website-engine.md`, on this branch): the engine this plan builds on, and its "What plan 3C-2 takes from this one".

**This is the second of four plans for the website** (Todd's choice, 15 Nov 2026): 3C-1 the engine (done, on this branch); **3C-2 the map** (this plan); 3C-3 the facts on the real path, with best guesses, the plane's row and the credit to adsb.lol; 3C-4 the newest-first list and the latest event.

**Going live (Todd, 16 Nov 2026):** 3C-1 and 3C-2 stay on this branch, not merged and not live, until 3C-3 and its credit to adsb.lol are done. They go live together, as the app's map waited for its credit.

**How this plan was checked.** Every code block here comes from a file that was run before the plan was put together. None was typed into the plan by hand: a script made each replacement from the tested files and built the plan.
- **A scratch copy of this branch** at `f7b9d3b`, with this plan's files laid over it.
  - Before: 146 test files and 3,208 tests, all passing.
  - With this plan: 161 test files and 3,377 tests, all passing. `tsc --noEmit` finds nothing, and `npm run build` builds.
  - The new tests run the shared cases through the new code: every flight and every moment of them is drawn, worded and given its real times, and compared with what the cases expect.
- **Task by task:** the copy was built as it stands after each of Tasks 2 to 9, in order, and type-checked and tested each time. Every one passed: after Task 2, 148 test files and 3,233 tests; after Task 3, 149 and 3,257; after Task 4, 152 and 3,277; after Task 5, 155 and 3,315; after Task 6, 156 and 3,332; after Task 7, 158 and 3,343; after Task 8, 160 and 3,354; and after Task 9, 161 and 3,377.
- **95 deliberate breaks** were made in the new code, one at a time, and each fails at least one test. They ran on the final code, but for Apple's map's last change (from the review's second look), after which its breaks ran again. The runs found four gaps in the tests, each now closed: none drew a plane that came down somewhere else after it was seen flying; none framed another trip; none checked that Apple's map, or the site's own, holds its frame, so both now grow a path just past the places framed, inside the frame's room. And one guard no test can see is left without a break: a replay never calls a landed plane an estimate, but a landed path's flown length is its whole length, so no distance is past it. It's kept, as the app has it.
- **Reviewed** by `superpowers:code-reviewer` (sonnet) before the plan was put together. It found nothing critical, and two important things, each now fixed with a test and a deliberate break: the dashed line ahead of a real plane started at the plane, so its dashes would crawl as the plane moved, and is written from the arrival airport back now; and on Apple's map a ghost made after the real plane (back from a replay) lay on top of it, and a line made later over the seen path, so a new mark or line now has the ones after it added again, in the plan's order. Also fixed: a comment that named Recenter, two functions named `isArrivalEstimated` (the engine's is `isEstimatedArrival` now), and the demo, which now asks again as its page is shown, and makes nothing for a scene without a plane. Left, each for its reason: the airline stays in what makes two legs one flight, since a DL1234 and a UPS1234 from one airport at one time are two flights; "About" before the countdown's date, as the app has it; an estimate's "over" place along the great circle, until 3C-3, as in the app; and a time that moves by itself, a minute late at most, as in the app. **Its second look found every fix right.** On its word, a new mark or line with nothing kept after it adds nothing again, as on the first draw.
- **Seen in a browser,** in the scratch copy's dev server, before the review: the three new demo scenes and `flying`, on the site's own map (Apple's didn't load there: the scratch copy has no MapKit token). Each read and drew as this plan says. The ghost's white outline didn't show on the light map, so it takes the seen path's colour there now (below). The review's fixes change the order a line's places are written in and which mark Apple's map adds last, not what's drawn.
- **The plan itself was followed by a script** on the branch at `f7b9d3b`: it created each file and made each replacement, in the plan's order, and all 49 files came out the same as the tested ones.
- **Not checked:** nothing called Crewlu Cloud or adsb.lol. Apple's map was checked with the tests' stand-in for MapKit, not seen: Task 10 is Todd's look at it.
- **Task 11 was added on 16 Nov 2026,** after Todd's look (Task 10), and checked the same way. Its code was written and tested in a scratch copy at `2b222bb`: 164 test files and 3,420 tests pass, `tsc --noEmit` finds nothing, and the build builds. 67 deliberate breaks each fail a test. `superpowers:code-reviewer` (sonnet) reviewed it, and it was seen in a browser on Apple's map and on the site's own. A script then made its steps from the tested files and checked that they give all 15 of them.

**Where this plan settles details, or differs from the app.** The app's list holds here: the real plane shows from gate to gate; a flight that isn't live draws the schedule even with a real path; the plan's line behind a plane only said to have flown it is dotted; in a replay the path ahead is dashed along the real path, and a moment after the plane was last seen shows it faded; the plane in the air points its track; the planes don't slide between fixes; "about" is read from the leg; a real plane with no label keeps the schedule's sentence; once down, the sentence says when it reaches the gate; the delay banner stays; legs that are one flight are watched once and all take its answer; a replay keeps its moment when the trip's times change, and one at either end stays at that end. What's the website's own:
- **The real times go into the engine's `Schedule`,** not into each leg with the waits beside it moved one by one, as the app's `LiveLegs.replacingTimes` does. The website's waits (turns, layovers, base, home, the report) are made by `buildLegs` from the flights' times, so they follow by themselves. A duty period or a trip that began or ended where the flight did, within a minute, moves with it; one that begins with a report or ends after another leg doesn't.
- **A reported delay stays inside the real times.** A `Move` carries its delay as `start - schedStart`, so when the real plane moves a time, the scheduled time moves by the same amount. Every reader that measures a delay (the countdown's colour, "Departed 20 min late", the delay banner) still finds the one CrewLu reported (spec §13). The app writes the real time less the delay, for the same reason.
- **No summary-wide delay.** The site's summaries carry a delay on each leg only, so the app's rule for a CrewLu that doesn't tag legs has nothing to apply to.
- **No `forTheSchedule`.** The site's schedule list shows a leg's times with its delay in them, so it shows the real times as they are.
- **A van or bus between airports (`GND`) isn't watched:** the map draws it as a drive.
- **Dotted lines are written forward,** from the end that stays still. SVG's `stroke-dasharray` and MapKit JS's `lineDash` both start the pattern at a line's first place, so a dotted line that reaches a moving plane is written from the place it was last seen to the plane. The app writes it the other way, as MapKit on iOS lays the pattern from a line's last place.
- **A line along a real path** is drawn with each of its joins in steps of a degree at most (spec §13). A line of two places keeps its 101 places, as before.
- **The ghost is the seen path's colour:** white on a dark map, and blue on a light one (the site's own map in light mode, and Apple's standard map in light mode), where white didn't show. The spec and the app have it white.
- **"Over" is said only of a plane in the air.** On the ground, or landed, the card's sentence names nothing below it: what's below is still read along the great circle until plan 3C-3, and "still on the ground, … over Wisconsin" read wrong in the demo.
- **Both maps hold their frame** until a real path grows past it, or another leg is framed. The app does so for the card, and leaves the full map alone; here the full map frames itself until it's moved by hand, as it already does, and Recenter frames the held places, which hold every place of the path.
- **The live source is the page's.** `useLivePlane` makes it once with `PartnerLive` and asks on `visibilitychange`, as `useSchedule` polls. `sharing_ended` from `partner_live` ends sharing as a refresh that meets it does: the key and the summary go, and the welcome screen names the pilot.
- **The real times are written in** at each new schedule, each new answer, and each minute while there's one, since an estimate on the ground moves by itself. The app resolves at each answer and each read of the status, every 60 seconds.
- **The demo's planes are made up** (Todd, 15 Nov 2026) and worked out from the clock every 30 seconds, as partner_live would answer, so a scene open for an hour still shows what it's named for. A plane flies the plan's speed along a path that bows away from the great circle, so a longer path takes longer. `live-ocean-gap`'s stretch nobody saw is over northern Canada, where the spec's first real flight went unseen (spec §2.1).

**Questions for Todd:** answered on 16 Nov 2026: 3C-1 and 3C-2 wait for 3C-3's credit before going live. Answered before: made-up flights for the demo scenes (15 Nov 2026).

---

## Ground rules for whoever runs this plan

These come from Todd's standing instructions. They override the skill's defaults.

1. **Work only in this worktree:** `/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046`, on its branch `claude/trip-map-live-598046`, at `f7b9d3b` or later.
   - Never edit the main checkout, `/Users/toddanderson/Dev/Crewluve Website`: its untracked plan file isn't this work's.
   - `~/Dev/Crewluv` is shared with other sessions. Only read it: change, stash, reset or switch nothing there.
2. **Never commit without Todd's yes in the conversation,** and then only the task's own files, by path. **Never push, and never merge into `main`:** this work waits for plan 3C-3 (above).
3. **The tests:** the session runs them as it works (`npx vitest run <files>`, `npm test`, `npm run build`). At each batch's checkpoint, Todd runs the batch's command himself. Don't change files while he's running them, and don't ask for a run until the files are final.
4. **The shared cases are the judge.** `tests/fixtures/trip-map/live-cases.json` is the app's, never edited. If a case fails, the code is wrong. If you believe a case is wrong, STOP and tell Todd.
5. **Copy the code as written.** It was run as it stands. A replacement is exact: its text is in the file once. If it isn't, stop: the file has changed since this plan was written.
6. **Nothing here calls Crewlu Cloud or adsb.lol.** Every test uses a stand-in, and the tests can't reach the network. Change nothing in Crewlu Cloud's live Supabase project, and don't read it.
7. **Unchanged:** every request to Crewlu Cloud still goes through the door and its guard (`tests/data/doorRules.test.ts` and `doorRulesScan.test.ts` must pass), no `innerHTML`, no download, no `npm install`.
8. **Reviewers:** dispatch `superpowers:code-reviewer` with `model: "sonnet"`.
9. **No release note.** Nothing here reaches a family until 3C-3's credit is in.

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/map/mapFlight.ts` | create | a flight's plan, path and record, made together, its progress by Crewlu Cloud's clock, and whether a time is its estimate |
| `src/map/flightPathDrawing.ts` | create | a path's places, its runs by kind, its framing, and a plane's heading on it |
| `src/engine/liveLegs.ts` | create | one landing time: which flights to watch, each answered flight's `MapFlight`, the schedule at its real times, and "about" |
| `src/map/tripMap.ts` | modify | `MapLeg.flight`, `isArrivalEstimated`, framing along a real path, `framingSubject` |
| `src/map/tripMapFor.ts` | modify | the status page's map takes the flights |
| `src/map/replayClock.ts` | modify | `hasTimes` and `carried`: a replay keeps its moment when the trip's times change |
| `src/map/mapFit.ts` | modify | `framesAll`: whether a frame still shows a path that grew |
| `src/map/flightDrawing.ts` | create | one flight's lines and planes at a moment, by its phase |
| `src/map/tripMapDrawing.ts` | modify | lines as places, the real plane and the ghost, `isReplay`, `routePoints` |
| `src/map/appleMapPlan.ts` | modify | the two planes' marks, the estimate faded, the seen path on top |
| `src/ui/appleMarks.ts`, `src/ui/AppleTripMap.tsx`, `src/ui/TripMapSvg.tsx`, `src/styles/tripMap.css` | modify | the new lines and planes on Apple's map and on the site's own |
| `src/copy/tripMap.ts`, `src/copy/facts.ts`, `src/copy/narrative.ts`, `src/facts/tripFacts.ts` | modify | the label, "about", and the card's sentence |
| `src/ui/hooks/useSteadyFraming.ts` | create | the frame held until the path grows past it |
| `src/ui/TripMapCard.tsx`, `src/ui/TripMapPage.tsx` | modify | the label on the bar and the pill, and a replay that carries on |
| `src/ui/hooks/useLivePlane.ts` | create | the page's live source |
| `src/ui/Root.tsx` | modify | `PartnerLive` owns the live plane; the demo makes up its planes |
| `src/ui/PilotPages.tsx`, `src/ui/StatusScreen.tsx` | modify | the real times written in once; "about" on the countdown and the narrative |
| `src/data/demoLive.ts` | create | the demo's made-up real planes |
| `src/data/demo.ts`, `README.md` | modify | three new scenes |
| `src/copy/planePopup.ts`, `src/ui/PlaneKey.tsx`, `src/ui/PlanePopup.tsx` | create (Task 11) | which plane is which: the popup's words, the key, and the popup and where it goes |
| `src/map/tripMapDrawing.ts`, `src/map/mapkitApi.ts`, `src/ui/TripMapSvg.tsx`, `src/ui/AppleTripMap.tsx`, `src/ui/TripMapCard.tsx`, `src/ui/TripMapPage.tsx`, `src/styles/tripMap.css` | modify (Task 11) | the planes' flight, the key on the card and the full map, and the popup on both maps |
| `tests/copy/planePopup.test.ts`, `tests/map/planeKey.test.ts`, `tests/ui/planePopup.test.tsx`; `tests/fixtures/fakeMapKit.ts` | create; modify (Task 11) | the key and the popup; the stand-in for MapKit puts its marks inside the map and says where a place is on the page |
| `tests/map/madeUpFlights.ts`, `tests/map/liveTrip.ts` | create | made-up flights, and a made-up trip with its real plane, for the tests |
| `tests/fixtures/partner.ts` | modify | the stand-in door answers `live` |
| `tests/map/mapFlight.test.ts`, `flightPathDrawing.test.ts`, `liveTripMap.test.ts`, `replayCarry.test.ts`, `steadyFraming.test.ts`, `flightDrawing.test.ts`, `liveMarks.test.ts`, `tests/engine/liveLegs.test.ts`, `tests/copy/liveWords.test.ts`, `tests/data/demoLive.test.ts` | create | the pure pieces |
| `tests/ui/liveMapViews.test.tsx`, `useSteadyFraming.test.tsx`, `liveMapPage.test.tsx`, `useLivePlane.test.tsx`, `livePages.test.tsx` | create | the views and the page |
| `tests/ui/Root.test.tsx`, `StatusScreen.test.tsx`, `tests/data/demoScenes.test.ts` | modify | partner_live from the page; the new scenes |

## Batches

Review with `superpowers:code-reviewer` (sonnet) after each batch, then Todd runs that batch's command, then ask to commit:

- **A, the pieces:** Tasks 2 to 4. Nothing a family sees changes.
- **B, the drawing, the words and the views:** Tasks 5 to 7. Still nothing changes: nothing hands the map a flight yet.
- **C, the page and the demo:** Tasks 8 and 9. After Task 8 the status page asks for the real plane; after Task 9 the demo shows it.

Then Task 10, Todd's look at the demo scenes; Task 11, which plane is which, added after that look (16 Nov 2026); and Task 12, the review of the whole branch and this plan's record.

---

### Task 1: Before starting

- [x] **Step 1: Check the worktree and the branch.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git status --short && git branch --show-current && git log --oneline -1
```

Expected: nothing changed, `claude/trip-map-live-598046`, and `f7b9d3b` or a later commit of this plan's.

- [x] **Step 2: Read plan 3C-1's "What plan 3C-2 takes from this one",** and the engine's files it names in `src/map/` and `src/partner/liveSource.ts`.

### Task 2: A flight as the map knows it, and its path as the map draws it

`MapFlight` keeps a flight's plan, path and record together, made from one answer, as the app's does. The path's drawing helpers say what the map draws and frames of it. Nothing uses them yet.

**Files:**
- Create: `src/map/mapFlight.ts`, `src/map/flightPathDrawing.ts`
- Test: `tests/map/madeUpFlights.ts` (made-up live flights for every later test), `tests/map/mapFlight.test.ts`, `tests/map/flightPathDrawing.test.ts`

- [x] **Step 1: Write the tests.**

**Create `tests/map/madeUpFlights.ts`:**

```ts
import type { LiveFix, LiveFlight, LiveState, TrailPoint } from '../../src/map/liveFlight'

/**
 * Made-up live flights for the map's tests: a trail, a fix and a flight, in minutes after `START`. Real flights' data
 * stays out of the repo (Todd, 15 Nov 2026): these are invented, as the shared cases' own are.
 */

export const MINUTE = 60_000
export const START = Date.UTC(2027, 0, 15, 12)

/** A place the plane was seen in the air `minutes` after START. */
export const point = (minutes: number, lat: number, lng: number): TrailPoint => ({ time: START + minutes * MINUTE, place: { lat, lng }, altitudeFt: 30_000 })

/** The plane's latest fix, `minutes` after START. */
export const fix = (minutes: number, lat: number, lng: number, more: { onGround?: boolean; trackDeg?: number | null } = {}): LiveFix => ({
  place: { lat, lng },
  altitudeFt: more.onGround ? null : 30_000,
  groundSpeedKt: more.onGround ? 0 : 430,
  trackDeg: more.trackDeg === undefined ? 80 : more.trackDeg,
  onGround: more.onGround ?? false,
  registration: 'N000XX',
  typeCode: 'B763',
  seenAt: START + minutes * MINUTE,
})

/** One flight of partner_live's answer. */
export const liveFlight = (
  trail: TrailPoint[], more: { legId?: string; state?: LiveState; fix?: LiveFix | null; landedAt?: number | null } = {},
): LiveFlight => ({
  legId: more.legId ?? 'leg-1',
  callsign: 'UPS1234',
  state: more.state ?? 'airborne',
  fix: more.fix === undefined ? null : more.fix,
  landedAt: more.landedAt ?? null,
  trail,
})
```

**Create `tests/map/mapFlight.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { liveLabelText } from '../../src/copy/tripMap'
import { makeFlightPlan } from '../../src/map/flightPlan'
import { distanceMeters } from '../../src/map/greatCircle'
import { isEstimate, makeMapFlight, mapFlightProgress } from '../../src/map/mapFlight'
import { airport, at, expectNearOrNull, expectPlace, LIVE_CASES, made, NEAR } from './liveCases'
import { fix, liveFlight, MINUTE, point, START } from './madeUpFlights'

const LOUISVILLE = airport('SDF')
const PHILADELPHIA = airport('PHL')
const DEPARTURE = START
const ARRIVAL = START + 120 * MINUTE

describe('a flight as the map measures and draws it (Stage 3 spec §11)', () => {
  it("with no live data has the schedule's plan, the great circle, and no record", () => {
    const flight = makeMapFlight(DEPARTURE, ARRIVAL, LOUISVILLE, PHILADELPHIA)
    expect(flight?.plan).toEqual(makeFlightPlan(DEPARTURE, ARRIVAL, distanceMeters(LOUISVILLE, PHILADELPHIA)))
    expect(flight?.path.isReal).toBe(false)
    expect(flight?.path.stretches.map((s) => s.kind)).toEqual(['planned'])
    expect(flight?.record).toBeNull()
    expect(flight?.live).toBeNull()
    expect(flight?.clockOffset).toBe(0)
  })

  it('is null for a leg that arrives no later than it leaves', () => {
    expect(makeMapFlight(DEPARTURE, DEPARTURE, LOUISVILLE, PHILADELPHIA)).toBeNull()
    expect(makeMapFlight(DEPARTURE, DEPARTURE - MINUTE, LOUISVILLE, PHILADELPHIA)).toBeNull()
  })

  it('makes the plan, the path and the record of every shared case together, as the cases have them', () => {
    for (const flightCase of LIVE_CASES.flights) {
      const { plan, flight, path, record } = made(flightCase)
      const mapFlight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), airport(flightCase.from), airport(flightCase.to), flight, 0)
      expect(mapFlight, flightCase.name).toEqual({ plan, path, record, live: flight, clockOffset: 0 })
    }
  })

  it("puts the real plane where every shared moment has it, with the moment's phase, touchdown and label", () => {
    for (const flightCase of LIVE_CASES.flights) {
      const { flight } = made(flightCase)
      const mapFlight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), airport(flightCase.from), airport(flightCase.to), flight)!
      for (const moment of flightCase.moments) {
        const what = `${flightCase.name} at ${moment.at}`
        const progress = mapFlightProgress(mapFlight, at(moment.at))
        expect(progress.phase, what).toBe(moment.phase)
        expectNearOrNull(progress.touchdown, moment.touchdown == null ? null : at(moment.touchdown), NEAR.ms, `${what}, touchdown`)
        expect(progress.label == null ? null : liveLabelText(progress.label), what).toBe(moment.label)
        expectPlace(progress.plane, moment.plane, `${what}, plane`)
      }
    }
  })

  it("measures a fix's age by Crewlu Cloud's clock, so a wrong clock here doesn't age it", () => {
    // Seen 2 minutes ago by Crewlu Cloud's clock, on a browser whose clock runs 4 minutes fast.
    const live = liveFlight([point(30, 39.5, -80)], { fix: fix(40, 39.6, -79.5) })
    const browserNow = START + 46 * MINUTE
    const right = makeMapFlight(DEPARTURE, ARRIVAL, LOUISVILLE, PHILADELPHIA, live, -4 * MINUTE)!
    const wrong = makeMapFlight(DEPARTURE, ARRIVAL, LOUISVILLE, PHILADELPHIA, live, 0)!
    expect(mapFlightProgress(right, browserNow).phase).toBe('inAir')
    expect(mapFlightProgress(wrong, browserNow).phase).toBe('estimated')
  })

  it("calls a time that isn't the plan's an estimate, by a second or more, until the plane has landed", () => {
    const flying = makeMapFlight(DEPARTURE, ARRIVAL, LOUISVILLE, PHILADELPHIA, liveFlight([point(30, 39.5, -80)]))!
    expect(isEstimate(flying, ARRIVAL)).toBe(false)
    expect(isEstimate(flying, ARRIVAL + 999)).toBe(false)
    expect(isEstimate(flying, ARRIVAL + 1000)).toBe(true)
    expect(isEstimate(flying, ARRIVAL - 12 * MINUTE)).toBe(true)
    const landed = makeMapFlight(DEPARTURE, ARRIVAL, LOUISVILLE, PHILADELPHIA,
      liveFlight([point(30, 39.5, -80)], { state: 'landed', landedAt: START + 100 * MINUTE }))!
    expect(isEstimate(landed, ARRIVAL - 12 * MINUTE)).toBe(false)
  })
})
```

**Create `tests/map/flightPathDrawing.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { makeFlightPath, pointAtDistance, type FlightPath } from '../../src/map/flightPath'
import { pathFramingPoints, pathHeadingAt, pathPoints, pathPointsBetween, pathRuns } from '../../src/map/flightPathDrawing'
import { pointAlong, pointsAlong, type GeoPoint } from '../../src/map/greatCircle'
import { flatMapAngle } from '../../src/map/planeHeading'
import { airport } from './liveCases'
import { liveFlight, point } from './madeUpFlights'

const LOUISVILLE = airport('SDF')
const PHILADELPHIA = airport('PHL')

/** Seen near Louisville, then north of the line, then nobody saw it for 20 minutes, then seen again: still in the air. */
const TRAIL = [point(16, 38.3, -85.4), point(22, 38.9, -84.3), point(28, 39.6, -83.1), point(48, 40.4, -79.6), point(52, 40.3, -78.9)]
const REAL = makeFlightPath(LOUISVILLE, PHILADELPHIA, liveFlight(TRAIL))
const GREAT_CIRCLE = makeFlightPath(LOUISVILLE, PHILADELPHIA)

const close = (a: GeoPoint, b: GeoPoint) => {
  expect(a.lat).toBeCloseTo(b.lat, 9)
  expect(a.lng).toBeCloseTo(b.lng, 9)
}
const closeAll = (actual: GeoPoint[], expected: GeoPoint[]) => {
  expect(actual).toHaveLength(expected.length)
  actual.forEach((p, i) => close(p, expected[i]))
}

describe("a path's places (Stage 3 spec §6.2)", () => {
  it('of a great circle are its two airports', () => {
    expect(pathPoints(GREAT_CIRCLE)).toEqual([LOUISVILLE, PHILADELPHIA])
  })

  it('of a real path pass every place the plane was seen, in order', () => {
    expect(pathPoints(REAL)).toEqual([LOUISVILLE, ...TRAIL.map((p) => p.place), PHILADELPHIA])
  })
})

describe("a path's runs", () => {
  it('of the whole path are its kinds in order, each beginning where the last ended', () => {
    const runs = pathRuns(REAL, 0, REAL.length)
    expect(runs.map((r) => r.kind)).toEqual(['seen', 'unseen', 'seen', 'planned'])
    expect(runs[0].points).toEqual([LOUISVILLE, ...TRAIL.slice(0, 3).map((p) => p.place)])
    for (let i = 1; i < runs.length; i++) expect(runs[i].points[0]).toEqual(runs[i - 1].points[runs[i - 1].points.length - 1])
    expect(runs[runs.length - 1].points).toEqual([TRAIL[4].place, PHILADELPHIA])
  })

  it('cut inside a stretch end at the place that far along', () => {
    const halfway = REAL.stretches[1].startDistance + REAL.stretches[1].length / 2
    const runs = pathRuns(REAL, 0, halfway)
    expect(runs.map((r) => r.kind)).toEqual(['seen'])
    close(runs[0].points[runs[0].points.length - 1], pointAtDistance(REAL, halfway))
    const ahead = pathRuns(REAL, halfway, REAL.length)
    close(ahead[0].points[0], pointAtDistance(REAL, halfway))
  })

  it('up to where the plane was last seen leave out the way ahead', () => {
    const runs = pathRuns(REAL, 0, REAL.flownLength)
    expect(runs.map((r) => r.kind)).toEqual(['seen', 'unseen', 'seen'])
    expect(runs[runs.length - 1].points[runs[runs.length - 1].points.length - 1]).toEqual(TRAIL[4].place)
  })

  it('of a cut with no length, or backwards, are empty', () => {
    expect(pathRuns(REAL, 1000, 1000)).toEqual([])
    expect(pathRuns(REAL, 2000, 1000)).toEqual([])
    expect(pathRuns(REAL, REAL.length, REAL.length + 5000)).toEqual([])
    expect(pathRuns(REAL, -5000, 0)).toEqual([])
  })

  it('of a path that goes nowhere are empty', () => {
    expect(pathRuns(makeFlightPath(LOUISVILLE, LOUISVILLE), 0, 1000)).toEqual([])
  })

  it('of a long real path keep every place in order', () => {
    const trail = Array.from({ length: 600 }, (_, i) => point(16 + i * 0.1, 38.2 + (i * 1.6) / 600, -85.6 + (i * 10.2) / 600))
    const path = makeFlightPath(LOUISVILLE, PHILADELPHIA, liveFlight(trail))
    const runs = pathRuns(path, 0, path.flownLength)
    expect(runs).toHaveLength(1)
    expect(runs[0].points).toEqual([LOUISVILLE, ...trail.map((p) => p.place)])
  })
})

describe("a path's places between two distances", () => {
  it('are the runs joined, without their shared places twice', () => {
    const points = pathPointsBetween(REAL, 0, REAL.length)
    expect(points).toEqual(pathPoints(REAL))
    expect(pathPointsBetween(REAL, 5000, 5000)).toEqual([])
    const from = REAL.stretches[2].startDistance + 1000
    const between = pathPointsBetween(REAL, from, REAL.flownLength)
    close(between[0], pointAtDistance(REAL, from))
    expect(between.slice(1)).toEqual(TRAIL.slice(2).map((p) => p.place))
  })
})

describe("the places a path's camera frames", () => {
  it('of a great circle are the 33 places of before', () => {
    closeAll(pathFramingPoints(GREAT_CIRCLE), pointsAlong(LOUISVILLE, PHILADELPHIA, 33))
  })

  it('of a real path hold every place the plane was seen, and the airports', () => {
    const framing = pathFramingPoints(REAL)
    // Each stretch's places are worked out along its great circle, so its last can be a rounding error off the place seen.
    for (const place of pathPoints(REAL)) {
      expect(framing.some((f) => Math.abs(f.lat - place.lat) < 1e-9 && Math.abs(f.lng - place.lng) < 1e-9), JSON.stringify(place)).toBe(true)
    }
    expect(framing[0]).toEqual(LOUISVILLE)
    expect(framing[framing.length - 1]).toEqual(PHILADELPHIA)
    expect(framing.length).toBeGreaterThanOrEqual(33)
  })

  it('of a path that goes nowhere are its airport', () => {
    expect(pathFramingPoints(makeFlightPath(LOUISVILLE, LOUISVILLE))).toEqual([LOUISVILLE, LOUISVILLE])
  })
})

describe('the way a plane points on its path', () => {
  const along = (path: FlightPath, fraction: number) =>
    flatMapAngle(pointAlong(path.origin, path.destination, fraction), pointAlong(path.origin, path.destination, fraction + 0.005))

  it('along a great circle is the way ahead', () => {
    expect(pathHeadingAt(GREAT_CIRCLE, GREAT_CIRCLE.length * 0.3)).toBeCloseTo(along(GREAT_CIRCLE, 0.3)!, 9)
  })

  it('at the end is along the last of the path', () => {
    expect(pathHeadingAt(GREAT_CIRCLE, GREAT_CIRCLE.length)).toBeCloseTo(along(GREAT_CIRCLE, 0.995)!, 9)
    expect(pathHeadingAt(GREAT_CIRCLE, GREAT_CIRCLE.length * 2)).toBeCloseTo(along(GREAT_CIRCLE, 0.995)!, 9)
  })

  it("before the path's start is the way at its start", () => {
    expect(pathHeadingAt(GREAT_CIRCLE, -10_000)).toBeCloseTo(pathHeadingAt(GREAT_CIRCLE, 0)!, 12)
  })

  it('on a real path is along the path flown, not towards the airport', () => {
    // Between the second and third places seen the plane flew west-north-west of the line to Philadelphia.
    const middle = REAL.stretches[2].startDistance + REAL.stretches[2].length / 2
    const flown = flatMapAngle(TRAIL[1].place, TRAIL[2].place)!
    const straight = flatMapAngle(pointAtDistance(REAL, middle), PHILADELPHIA)!
    const heading = pathHeadingAt(REAL, middle)!
    expect(Math.abs(heading - flown)).toBeLessThan(0.01)
    expect(Math.abs(heading - straight)).toBeGreaterThan(0.05)
  })

  it('is null on a path that goes nowhere', () => {
    expect(pathHeadingAt(makeFlightPath(LOUISVILLE, LOUISVILLE), 0)).toBeNull()
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/map/mapFlight.test.ts tests/map/flightPathDrawing.test.ts
```

Expected: both files fail to load: they can't find `src/map/mapFlight` and `src/map/flightPathDrawing`.

- [x] **Step 3: Write the code.**

**Create `src/map/mapFlight.ts`:**

```ts
import { makeFlightPath, type FlightPath } from './flightPath'
import { makeFlightPlan, type FlightPlan } from './flightPlan'
import { makeFlightRecord, type FlightRecord } from './flightRecord'
import { distanceMeters, type GeoPoint } from './greatCircle'
import type { LiveFlight } from './liveFlight'
import { liveProgress, type LiveProgress } from './liveProgress'

/**
 * A flight leg as the trip map measures and draws it (Stage 3 spec §11), as the app's MapFlight: the schedule's plan,
 * the path, and once the plane has been seen in the air, its record. The three are made together from one answer of
 * Crewlu Cloud's, so they always agree.
 */
export interface MapFlight {
  /** The schedule's plan, from the leg's gate times moved by its reported delay and by nothing else. */
  plan: FlightPlan
  /** The real path once the plane has been seen in the air, else the great circle between the airports. */
  path: FlightPath
  /** Where the plane was at any moment. Null without a real path. */
  record: FlightRecord | null
  /** The flight's live data, or null when Crewlu Cloud answered none for its leg. */
  live: LiveFlight | null
  /** Crewlu Cloud's clock minus this browser's, in ms, as of the answer `live` came in. */
  clockOffset: number
}

/**
 * The flight from `origin` to `destination` between its gate times, `departure` and `arrival`, both moved by any
 * reported delay. Null for a leg that arrives no later than it leaves.
 */
export function makeMapFlight(
  departure: number, arrival: number, origin: GeoPoint, destination: GeoPoint, live: LiveFlight | null = null, clockOffset = 0,
): MapFlight | null {
  const plan = makeFlightPlan(departure, arrival, distanceMeters(origin, destination))
  if (!plan) return null
  const path = makeFlightPath(origin, destination, live)
  return { plan, path, record: makeFlightRecord(path, plan), live, clockOffset }
}

/** The real plane when this browser's clock says `now`. A fix's age is measured by Crewlu Cloud's clock, so a wrong clock here doesn't age it. */
export const mapFlightProgress = (flight: MapFlight, now: number): LiveProgress =>
  liveProgress(flight.plan, flight.path, flight.record, flight.live, now + flight.clockOffset)

/**
 * Whether `arrival`, the leg's gate arrival as it's shown, is the real plane's estimate, which the words mark with
 * "about" (spec §9): it isn't the plan's, by a second or more, and the plane hasn't landed.
 */
export const isEstimate = (flight: MapFlight, arrival: number): boolean =>
  flight.live?.state !== 'landed' && Math.abs(arrival - flight.plan.arrival) >= 1000
```

**Create `src/map/flightPathDrawing.ts`:**

```ts
import { pointAtDistance, type FlightPath, type StretchKind } from './flightPath'
import { pointsAlong, type GeoPoint } from './greatCircle'
import { flatMapAngle, LOOK_AHEAD } from './planeHeading'

/** What the map draws and frames of a flight's path (Stage 3 spec §6.2), as the app's FlightPath+Drawing. Distances are meters along it. */

/** A part of the path that's all one kind, as the places it passes. */
export interface PathRun {
  kind: StretchKind
  points: GeoPoint[]
}

/** Every place the path passes, from the departure airport to the arrival airport. */
export const pathPoints = (path: FlightPath): GeoPoint[] => [...path.stretches.map((s) => s.start), path.destination]

/**
 * The path between `start` and `end` meters along it, cut wherever its kind changes. Each run begins where the one
 * before it ended. Empty when `end` isn't past `start`.
 */
export function pathRuns(path: FlightPath, start: number, end: number): PathRun[] {
  const from = Math.min(Math.max(start, 0), path.length)
  const to = Math.min(Math.max(end, 0), path.length)
  if (!(to > from)) return []
  const runs: PathRun[] = []
  for (const stretch of path.stretches) {
    const stretchEnd = stretch.startDistance + stretch.length
    if (!(stretchEnd > from && stretch.startDistance < to)) continue
    const first = stretch.startDistance >= from ? stretch.start : pointAtDistance(path, from)
    const last = stretchEnd <= to ? stretch.end : pointAtDistance(path, to)
    const run = runs[runs.length - 1]
    // Added in place: a real path has hundreds of places, and a replay asks every frame.
    if (run?.kind === stretch.kind) run.points.push(last)
    else runs.push({ kind: stretch.kind, points: [first, last] })
  }
  return runs
}

/** The places the path passes between `start` and `end` meters along it, both ends included. Empty when `end` isn't past `start`. */
export function pathPointsBetween(path: FlightPath, start: number, end: number): GeoPoint[] {
  const runs = pathRuns(path, start, end)
  if (runs.length === 0) return []
  const points = [...runs[0].points]
  for (const run of runs.slice(1)) points.push(...run.points.slice(1))
  return points
}

/**
 * Places all along the path for the camera to frame (spec §6.2): 33 along a great circle, as before, and every place a
 * real path passes.
 */
export function pathFramingPoints(path: FlightPath): GeoPoint[] {
  if (!(path.length > 0)) return [path.origin, path.destination]
  const places = [path.origin]
  for (const stretch of path.stretches) {
    const count = Math.max(Math.ceil((stretch.length / path.length) * 32), 1) + 1
    places.push(...pointsAlong(stretch.start, stretch.end, count).slice(1))
  }
  return places
}

/**
 * The angle a plane `distance` meters along the path points at, on a map with north up (`planeHeading`): along the path
 * just ahead of it, or along the last of the path at its end. Null for a path with no length, and where the two places
 * it's aimed between are one.
 */
export function pathHeadingAt(path: FlightPath, distance: number): number | null {
  const look = LOOK_AHEAD * path.length
  if (!(look > 0)) return null
  const from = Math.min(Math.min(Math.max(distance, 0), path.length), path.length - look)
  return flatMapAngle(pointAtDistance(path, from), pointAtDistance(path, from + look))
}
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 23 tests pass. Then `npx tsc --noEmit`: nothing.

- [x] **Step 5: Commit, on Todd's yes (after batch A's checkpoint).**

```bash
git add src/map/mapFlight.ts src/map/flightPathDrawing.ts tests/map/madeUpFlights.ts tests/map/mapFlight.test.ts tests/map/flightPathDrawing.test.ts
git commit -m "A flight as the map knows it: its plan, path and record made together from one answer, and what the map draws and frames of its path (Stage 3 spec §6.2, §11)"
```

---

### Task 3: One landing time

`src/engine/liveLegs.ts` is the app's `LiveLegs` on the site's own model. It says which flights the source watches, makes each answered flight's `MapFlight` from its delay-moved times, and writes the real plane's times into the `Schedule` that every card is built from. The shared cases run through it three times: on time, 20 minutes late and 10 minutes early.

**Files:**
- Create: `src/engine/liveLegs.ts`
- Test: `tests/engine/liveLegs.test.ts`

- [x] **Step 1: Write the tests.**

**Create `tests/engine/liveLegs.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { buildLegs, type Leg } from '../../src/engine/legs'
import { estimatedArrival, isEstimatedArrival, liveMapFlights, watchedFlights, withLiveTimes } from '../../src/engine/liveLegs'
import { resolveStatus } from '../../src/engine/status'
import type { Schedule } from '../../src/engine/types'
import type { GeoPoint } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { mapFlightProgress } from '../../src/map/mapFlight'
import { toSchedule } from '../../src/partner/convert'
import type { PartnerSummary, SummaryLeg } from '../../src/partner/summary'
import { airport, at, LIVE_CASES, made } from '../map/liveCases'
import { fix, liveFlight, MINUTE, point, START } from '../map/madeUpFlights'

/** Where an airport is: the shared cases' airports, and no others. */
const placeOf = (code: string): GeoPoint | null => (code in LIVE_CASES.airports ? airport(code) : null)

const leg = (id: string, type: SummaryLeg['type'], startMinutes: number, endMinutes: number, more: Partial<SummaryLeg> = {}): SummaryLeg => ({
  id, tripId: 'T1', type, start: START + startMinutes * MINUTE, end: START + endMinutes * MINUTE, airportCode: null, flightNumber: null,
  departureAirport: null, arrivalAirport: null, tripTotalDays: 1, delayMinutes: null, airlineCode: null, label: null, ...more,
})

const flightLeg = (id: string, dep: string, arr: string, startMinutes: number, endMinutes: number, more: Partial<SummaryLeg> = {}) =>
  leg(id, 'flight', startMinutes, endMinutes, { flightNumber: `UPS${1200 + Number(id.replace(/\D/g, ''))}`, departureAirport: dep, arrivalAirport: arr, ...more })

const scheduleOf = (legs: SummaryLeg[]): Schedule => {
  const summary: PartnerSummary = { pilotId: 'pilot', name: 'Alex', home: 'MIA', base: 'SDF', lastUpdated: START, legs, quickStatuses: [] }
  return toSchedule(summary, START)
}

/** SDF → PHL, written from noon to 2 PM, a turn in Philadelphia, then PHL → SDF from 2:45 to 4:45. */
const TURN_TRIP = [flightLeg('f1', 'SDF', 'PHL', 0, 120), leg('t1', 'turn', 120, 165, { airportCode: 'PHL' }), flightLeg('f2', 'PHL', 'SDF', 165, 285)]

/** Off 7 minutes early: first seen near Louisville 8 minutes after the gate time, and landed at 1:40, 20 minutes early. */
const OFF_EARLY_LANDED = liveFlight([point(8, 38.25, -85.55), point(40, 38.9, -81.5), point(90, 39.8, -75.8)],
  { legId: 'f1', state: 'landed', landedAt: START + 100 * MINUTE, fix: fix(100, 39.87, -75.24, { onGround: true }) })

/** Seen only far from Louisville, still in the air: its start stays the schedule's, and its end is an estimate. */
const IN_THE_AIR = liveFlight([point(30, 38.6, -83.6), point(50, 39.1, -80.6)], { legId: 'f1', fix: fix(51, 39.15, -80.4) })

const answered = (...flights: LiveFlight[]) => new Map(flights.map((f) => [f.legId, f]))
const flightsFor = (schedule: Schedule, ...live: LiveFlight[]) => liveMapFlights(schedule, answered(...live), 0, placeOf)
const legsAt = (schedule: Schedule, live: LiveFlight[], now: number) => buildLegs(withLiveTimes(schedule, flightsFor(schedule, ...live), now))
const byId = (legs: Leg[], id: string) => legs.find((l) => l.id === id)!

describe('the flights the live source watches (Stage 3 spec §10.2, §11)', () => {
  it('are the flights, at their gate times moved by their delay, earliest first', () => {
    const schedule = scheduleOf([
      flightLeg('f2', 'PHL', 'SDF', 165, 285, { delayMinutes: 20 }),
      flightLeg('f1', 'SDF', 'PHL', 0, 120),
      leg('j1', 'flight', 400, 480, { tripId: null, flightNumber: 'DL1234', airlineCode: 'DL', departureAirport: 'SDF', arrivalAirport: 'ATL' }),
      leg('g1', 'flight', 300, 360, { flightNumber: 'GND', departureAirport: 'SDF', arrivalAirport: 'LEX' }),
    ])
    expect(watchedFlights(schedule)).toEqual([
      { id: 'f1', departure: START, arrival: START + 120 * MINUTE },
      { id: 'f2', departure: START + 185 * MINUTE, arrival: START + 305 * MINUTE },
      { id: 'j1', departure: START + 400 * MINUTE, arrival: START + 480 * MINUTE },
    ])
  })

  it("watch two airlines' flights of one number, from one airport at one time, as two flights", () => {
    const schedule = scheduleOf([
      flightLeg('f1', 'SDF', 'PHL', 0, 120, { flightNumber: 'UPS1234' }),
      leg('j1', 'flight', 0, 120, { tripId: null, flightNumber: 'DL1234', airlineCode: 'DL', departureAirport: 'SDF', arrivalAirport: 'PHL' }),
    ])
    expect(watchedFlights(schedule).map((l) => l.id)).toEqual(['f1', 'j1'])
  })

  it('watch legs that are one flight once, under the first of their ids in text order', () => {
    const schedule = scheduleOf([flightLeg('f9', 'SDF', 'PHL', 0, 120, { flightNumber: 'UPS1201' }), flightLeg('f1', 'SDF', 'PHL', 0, 120)])
    expect(watchedFlights(schedule).map((l) => l.id)).toEqual(['f1'])
  })
})

describe("the map's flights for the answers", () => {
  it('are only the flights Crewlu Cloud answered', () => {
    const schedule = scheduleOf(TURN_TRIP)
    expect([...flightsFor(schedule, IN_THE_AIR).keys()]).toEqual(['f1'])
    expect(flightsFor(schedule).size).toBe(0)
  })

  it('give legs that are one flight its answer, which comes under the first of their ids', () => {
    const schedule = scheduleOf([flightLeg('f9', 'SDF', 'PHL', 0, 120, { flightNumber: 'UPS1201' }), flightLeg('f1', 'SDF', 'PHL', 0, 120)])
    const flights = flightsFor(schedule, IN_THE_AIR)
    expect([...flights.keys()].sort()).toEqual(['f1', 'f9'])
    expect(flights.get('f9')?.live).toBe(IN_THE_AIR)
    expect(liveMapFlights(schedule, new Map([['f9', { ...IN_THE_AIR, legId: 'f9' }]]), 0, placeOf).size).toBe(0)
  })

  it("hand Crewlu Cloud's clock on", () => {
    const schedule = scheduleOf(TURN_TRIP)
    expect(liveMapFlights(schedule, answered(IN_THE_AIR), 42_000, placeOf).get('f1')?.clockOffset).toBe(42_000)
  })

  it("plan from the schedule moved by the leg's own delay", () => {
    const schedule = scheduleOf([flightLeg('f1', 'SDF', 'PHL', 0, 120, { delayMinutes: 20 })])
    const plan = flightsFor(schedule, IN_THE_AIR).get('f1')!.plan
    expect([plan.departure, plan.arrival]).toEqual([START + 20 * MINUTE, START + 140 * MINUTE])
  })

  it("leave out a flight to or from an airport this site doesn't know", () => {
    const schedule = scheduleOf([flightLeg('f1', 'SDF', 'XYZ', 0, 120)])
    expect(flightsFor(schedule, IN_THE_AIR).size).toBe(0)
  })
})

describe('one landing time (Stage 3 spec §7.1)', () => {
  it('changes nothing with no live data', () => {
    const schedule = scheduleOf(TURN_TRIP)
    expect(withLiveTimes(schedule, new Map(), START)).toBe(schedule)
    expect(withLiveTimes(schedule, flightsFor(schedule), START)).toBe(schedule)
  })

  it("gives the flight every shared moment's times, on time, 20 minutes late and 10 minutes early, keeping its delay", () => {
    for (const delay of [0, 20, -10]) {
      for (const flightCase of LIVE_CASES.flights) {
        const shift = delay * MINUTE
        const summaryLeg: SummaryLeg = {
          ...flightLeg('f1', flightCase.from, flightCase.to, 0, 0, { delayMinutes: delay === 0 ? null : delay }),
          start: at(flightCase.departure) - shift, end: at(flightCase.arrival) - shift,
        }
        const schedule = scheduleOf([summaryLeg])
        const { flight } = made(flightCase)
        const flights = flight ? liveMapFlights(schedule, new Map([['f1', flight]]), 0, placeOf) : new Map()
        for (const moment of flightCase.moments) {
          const what = `${flightCase.name} at ${moment.at}, ${delay} min late`
          const move = withLiveTimes(schedule, flights, at(moment.at)).trips[0].dutyPeriods[0].flights[0]
          expect(move.start, what).toBeCloseTo(at(moment.start), -2)
          expect(move.end, what).toBeCloseTo(at(moment.end), -2)
          expect(move.start - move.schedStart, `${what}: the delay at the start`).toBeCloseTo(shift, -2)
          expect(move.end - move.schedEnd, `${what}: the delay at the end`).toBeCloseTo(shift, -2)
        }
      }
    }
  })

  it('keeps a flight with nothing real as it was', () => {
    const schedule = scheduleOf(TURN_TRIP)
    // On the ground at the gate, before the plan's takeoff: the schedule stands.
    const atTheGate = liveFlight([], { legId: 'f1', state: 'ground', fix: fix(5, 38.1744, -85.736, { onGround: true }) })
    expect(withLiveTimes(schedule, flightsFor(schedule, atTheGate), START + 6 * MINUTE)).toBe(schedule)
  })

  it('ends the wait before, and starts the wait after, where the flight does: here one wait between two live flights', () => {
    const schedule = scheduleOf(TURN_TRIP)
    // The second flight is first seen near Philadelphia at 2:40, five minutes before its gate time: off 20 minutes early.
    const offEarly = liveFlight([point(160, 39.95, -75.5), point(190, 39.5, -80)], { legId: 'f2', fix: fix(191, 39.48, -80.1) })
    const legs = legsAt(schedule, [OFF_EARLY_LANDED, offEarly], START + 192 * MINUTE)
    expect([byId(legs, 'f1').start, byId(legs, 'f1').end]).toEqual([START - 7 * MINUTE, START + 107 * MINUTE])
    expect(byId(legs, 'f2').start).toBe(START + 145 * MINUTE)
    const turn = legs.find((l) => l.kind === 'turn')!
    expect([turn.start, turn.end]).toEqual([START + 107 * MINUTE, START + 145 * MINUTE])
  })

  it('starts the wait after a late arrival later, and leaves the wait before alone', () => {
    // Seen far from Louisville, an hour along, and still well short of halfway: it lands late.
    const late = liveFlight([point(40, 38.4, -84.6), point(60, 38.6, -83.6)], { legId: 'f1', fix: fix(61, 38.62, -83.5) })
    const schedule = scheduleOf(TURN_TRIP)
    const flights = flightsFor(schedule, late)
    const now = START + 62 * MINUTE
    const real = mapFlightProgress(flights.get('f1')!, now)
    expect(real.end).toBeGreaterThan(START + 120 * MINUTE)
    const legs = buildLegs(withLiveTimes(schedule, flights, now))
    expect(byId(legs, 'f1').start).toBe(START)
    const turn = legs.find((l) => l.kind === 'turn')!
    expect([turn.start, turn.end]).toEqual([real.end, START + 165 * MINUTE])
  })

  it('moves a duty period or a trip only where it began or ended with the flight', () => {
    const base = scheduleOf(TURN_TRIP)
    const trip = base.trips[0]
    // A report 45 minutes before the first flight, and a trip that ends after the last, as the demo's rows have them.
    const reported: Schedule = { ...base, trips: [{ ...trip, start: START - 45 * MINUTE, dutyPeriods: [{ ...trip.dutyPeriods[0], start: START - 45 * MINUTE }] }] }
    const moved = withLiveTimes(reported, flightsFor(reported, OFF_EARLY_LANDED), START + 130 * MINUTE)
    expect(moved.trips[0].start).toBe(START - 45 * MINUTE)
    expect(moved.trips[0].dutyPeriods[0].start).toBe(START - 45 * MINUTE)
    // With the flight first, the period and the trip begin where it does.
    const plain = withLiveTimes(base, flightsFor(base, OFF_EARLY_LANDED), START + 130 * MINUTE)
    expect(plain.trips[0].start).toBe(START - 7 * MINUTE)
    expect(plain.trips[0].dutyPeriods[0].start).toBe(START - 7 * MINUTE)
    expect(plain.trips[0].end).toBe(base.trips[0].end)
  })

  it('ends a period and a trip where their last flight now lands', () => {
    const schedule = scheduleOf([flightLeg('f1', 'SDF', 'PHL', 0, 120)])
    const moved = withLiveTimes(schedule, flightsFor(schedule, OFF_EARLY_LANDED), START + 110 * MINUTE)
    expect(moved.trips[0].end).toBe(START + 107 * MINUTE)
    expect(moved.trips[0].dutyPeriods[0].end).toBe(START + 107 * MINUTE)
  })

  it('meets a delayed flight at its scheduled time or its delayed one', () => {
    const late = scheduleOf([flightLeg('f1', 'SDF', 'PHL', -20, 100, { delayMinutes: 20 })])
    // The trip's end is the written end (1:40) or the delayed one (2:00), whichever is later: here the delayed.
    expect(late.trips[0].end).toBe(START + 120 * MINUTE)
    const moved = withLiveTimes(late, flightsFor(late, OFF_EARLY_LANDED), START + 110 * MINUTE)
    expect(moved.trips[0].end).toBe(START + 107 * MINUTE)
    const early = scheduleOf([flightLeg('f1', 'SDF', 'PHL', 10, 130, { delayMinutes: -10 })])
    // Early, the trip ends at the written end (2:10), the flight's scheduled one.
    expect(early.trips[0].end).toBe(START + 130 * MINUTE)
    expect(withLiveTimes(early, flightsFor(early, OFF_EARLY_LANDED), START + 110 * MINUTE).trips[0].end).toBe(START + 107 * MINUTE)
  })

  it('keeps the status in flight until the real plane arrives, and no longer', () => {
    const schedule = scheduleOf(TURN_TRIP)
    const statusAt = (minutes: number) => {
      const now = START + minutes * MINUTE
      return resolveStatus(legsAt(schedule, [OFF_EARLY_LANDED], now), schedule.pilot, now).kind
    }
    expect(statusAt(106)).toBe('inFlight')
    expect(statusAt(108)).toBe('turn')
    // Without the real plane, the schedule has it in the air until 2 PM.
    expect(resolveStatus(buildLegs(schedule), schedule.pilot, START + 108 * MINUTE).kind).toBe('inFlight')
  })

  it('gives legs that are one flight the real times, so none is left on the schedule', () => {
    const schedule = scheduleOf([flightLeg('f9', 'SDF', 'PHL', 0, 120, { flightNumber: 'UPS1201' }), flightLeg('f1', 'SDF', 'PHL', 0, 120)])
    const legs = legsAt(schedule, [OFF_EARLY_LANDED], START + 110 * MINUTE)
    expect(byId(legs, 'f1').end).toBe(START + 107 * MINUTE)
    expect(byId(legs, 'f9').end).toBe(START + 107 * MINUTE)
  })

  it("moves a jumpseat's times too", () => {
    const schedule = scheduleOf([
      leg('j1', 'flight', 0, 120, { tripId: null, flightNumber: 'DL1234', airlineCode: 'DL', departureAirport: 'SDF', arrivalAirport: 'PHL' }),
    ])
    const moved = withLiveTimes(schedule, flightsFor(schedule, { ...OFF_EARLY_LANDED, legId: 'j1' }), START + 110 * MINUTE)
    expect(moved.jumpseats[0].end).toBe(START + 107 * MINUTE)
  })
})

describe('"about" a landing time (Stage 3 spec §9)', () => {
  it("is said of a leg whose end is the real plane's estimate", () => {
    const schedule = scheduleOf(TURN_TRIP)
    const flights = flightsFor(schedule, IN_THE_AIR)
    const now = START + 52 * MINUTE
    const legs = buildLegs(withLiveTimes(schedule, flights, now))
    expect(isEstimatedArrival(byId(legs, 'f1'), flights)).toBe(true)
    expect(isEstimatedArrival(byId(legs, 'f2'), flights)).toBe(false)
    // The schedule's own end isn't an estimate.
    expect(isEstimatedArrival({ id: 'f1', end: START + 120 * MINUTE }, flights)).toBe(false)
  })

  it('is no longer said once the plane has landed', () => {
    const schedule = scheduleOf(TURN_TRIP)
    const flights = flightsFor(schedule, OFF_EARLY_LANDED)
    const legs = buildLegs(withLiveTimes(schedule, flights, START + 105 * MINUTE))
    expect(isEstimatedArrival(byId(legs, 'f1'), flights)).toBe(false)
  })

  it("is the flight under way's arrival while that's the real plane's estimate", () => {
    const schedule = scheduleOf(TURN_TRIP)
    const flights = flightsFor(schedule, IN_THE_AIR)
    const now = START + 52 * MINUTE
    const legs = buildLegs(withLiveTimes(schedule, flights, now))
    expect(estimatedArrival(legs, flights, now)).toBe(byId(legs, 'f1').end)
  })

  it('is nothing before the flight leaves its gate, once it reaches it, and once the plane is down', () => {
    const schedule = scheduleOf(TURN_TRIP)
    const flying = flightsFor(schedule, IN_THE_AIR)
    const legs = buildLegs(withLiveTimes(schedule, flying, START + 52 * MINUTE))
    expect(estimatedArrival(legs, flying, START - MINUTE)).toBeNull()
    expect(estimatedArrival(legs, flying, byId(legs, 'f1').end)).toBeNull()
    const landed = flightsFor(schedule, OFF_EARLY_LANDED)
    const down = buildLegs(withLiveTimes(schedule, landed, START + 103 * MINUTE))
    expect(estimatedArrival(down, landed, START + 103 * MINUTE)).toBeNull()
    expect(estimatedArrival(legs, new Map(), START + 52 * MINUTE)).toBeNull()
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/engine/liveLegs.test.ts
```

Expected: the file fails to load: it can't find `src/engine/liveLegs`.

- [x] **Step 3: Write the code.**

**Create `src/engine/liveLegs.ts`:**

```ts
import type { GeoPoint } from '../map/greatCircle'
import type { LiveFlight } from '../map/liveFlight'
import { isEstimate, makeMapFlight, mapFlightProgress, type MapFlight } from '../map/mapFlight'
import { isMove, type Leg } from './legs'
import type { DutyPeriod, Iata, Move, Schedule, Trip } from './types'

/**
 * One landing time (Stage 3 spec §7.1, §12), as the app's LiveLegs. The status page builds every leg, the status, the
 * map, the countdown, the narrative and the trip cards from one Schedule. Before it does, each flight with live data
 * gets its real times here in place of the schedule's, so no card works them out itself. The waits either side follow
 * by themselves: `buildLegs` makes the turns, the layovers and the time at base or home from the flights' times.
 */

/** A wait's edge counts as a flight's when it's within this of it. */
const MEETS_WITHIN_MS = 60_000

/** The schedule's flights: each trip's and each jumpseat. A van or bus between airports (`ground`) goes by road. */
function flightsOf(schedule: Schedule): Move[] {
  return [...schedule.trips.flatMap((t) => t.dutyPeriods.flatMap((dp) => dp.flights)), ...schedule.jumpseats].filter((m) => !m.ground)
}

/** What makes two legs one flight: the same airline and number, departure airport and scheduled departure. */
const flightKey = (m: Move) => `${m.airline ?? ''}|${m.number ?? ''}|${m.dep}|${m.schedStart}`

/** Of the legs that are each flight, the first by its id in text order: the one Crewlu Cloud answers under. */
function firstOfEachFlight(schedule: Schedule): Map<string, Move> {
  const first = new Map<string, Move>()
  for (const move of flightsOf(schedule)) {
    const key = flightKey(move)
    const kept = first.get(key)
    if (!kept || move.id < kept.id) first.set(key, move)
  }
  return first
}

/**
 * The schedule's flights for the live source to watch: each one's id, and its gate times moved by its delay. Legs that
 * are one flight are answered once by Crewlu Cloud, under the first of their ids in text order: only that one is
 * watched, or the others' windows would stay open after the flight had landed.
 */
export function watchedFlights(schedule: Schedule): { id: string; departure: number; arrival: number }[] {
  return [...firstOfEachFlight(schedule).values()]
    .sort((a, b) => a.schedStart - b.schedStart || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((m) => ({ id: m.id, departure: m.start, arrival: m.end }))
}

/**
 * Each flight of `schedule` that Crewlu Cloud answered, by its leg's id: its plan, from its gate times moved by its own
 * delay, with the path and the record made from the answer. Legs that are one flight share its answer, so each shows the
 * real plane and none is left on the schedule beside it. `schedule` is the summary's, before `withLiveTimes`.
 */
export function liveMapFlights(
  schedule: Schedule, answered: ReadonlyMap<string, LiveFlight>, clockOffset: number, placeOf: (code: Iata) => GeoPoint | null,
): Map<string, MapFlight> {
  const flights = new Map<string, MapFlight>()
  if (answered.size === 0) return flights
  const answeredUnder = firstOfEachFlight(schedule)
  for (const move of flightsOf(schedule)) {
    const first = answeredUnder.get(flightKey(move))
    const live = first ? answered.get(first.id) : undefined
    const origin = placeOf(move.dep)
    const destination = placeOf(move.arr)
    if (!live || !origin || !destination) continue
    const flight = makeMapFlight(move.start, move.end, origin, destination, live, clockOffset)
    if (flight) flights.set(move.id, flight)
  }
  return flights
}

/** Whether a wait's or a period's `edge` is where its flight's was: at its scheduled time, or at that time moved by its delay. */
const meets = (edge: number, scheduled: number, delayed: number) =>
  Math.abs(edge - scheduled) <= MEETS_WITHIN_MS || Math.abs(edge - delayed) <= MEETS_WITHIN_MS

/** The flight's times by the real plane at `now`: what changes, or null when the real plane has moved neither. */
function realTimes(flight: MapFlight | undefined, now: number): { start: number | null; end: number | null } | null {
  if (!flight) return null
  const progress = mapFlightProgress(flight, now)
  const start = progress.start !== flight.plan.departure ? progress.start : null
  const end = progress.end !== flight.plan.arrival ? progress.end : null
  if ((start == null && end == null) || !(progress.end > progress.start)) return null
  return { start, end }
}

/**
 * The flight at its real times. Its reported delay stays inside them: the scheduled times move with the real ones, so
 * every reader that measures a delay from the two still finds the one CrewLu reported (spec §13: the real plane wins for
 * the times, and the delay stays the pilot's).
 */
function moved(move: Move, real: { start: number | null; end: number | null }): Move {
  return {
    ...move,
    start: real.start ?? move.start,
    schedStart: real.start == null ? move.schedStart : real.start - (move.start - move.schedStart),
    end: real.end ?? move.end,
    schedEnd: real.end == null ? move.schedEnd : real.end - (move.end - move.schedEnd),
  }
}

/** A flight before and after its real times. */
interface Moved {
  from: Move
  to: Move
}

/**
 * `edge`, a duty period's or a trip's start or end, moved with the first of `flights` whose same edge the real plane
 * moved and that it met: at that edge's scheduled time or its delayed one, within a minute.
 */
function shifted(edge: number, side: 'start' | 'end', flights: Moved[]): number {
  for (const { from, to } of flights) {
    if (to[side] === from[side]) continue
    if (meets(edge, side === 'start' ? from.schedStart : from.schedEnd, from[side])) return to[side]
  }
  return edge
}

/**
 * `schedule` with each live flight's real times at `now`, this browser's time, in place of the schedule's
 * (`LiveProgress.start` and `.end`). A duty period or a trip that began where the flight did, or ended where it did,
 * within a minute, begins or ends where it now does: one that begins with a report time, or ends after another leg, is
 * left alone. The same schedule comes back when no flight has anything real.
 */
export function withLiveTimes(schedule: Schedule, flights: ReadonlyMap<string, MapFlight>, now: number): Schedule {
  if (flights.size === 0) return schedule
  let changed = false
  const move = (m: Move): Move => {
    const real = realTimes(flights.get(m.id), now)
    if (!real) return m
    changed = true
    return moved(m, real)
  }
  const trips = schedule.trips.map((trip): Trip => {
    const inTrip: Moved[] = []
    const dutyPeriods = trip.dutyPeriods.map((dp): DutyPeriod => {
      const own = dp.flights.map((from) => ({ from, to: move(from) })).filter(({ from, to }) => to !== from)
      if (own.length === 0) return dp
      inTrip.push(...own)
      const flightsNow = dp.flights.map((m) => own.find(({ from }) => from === m)?.to ?? m)
      return { ...dp, flights: flightsNow, start: shifted(dp.start, 'start', own), end: shifted(dp.end, 'end', own) }
    })
    if (inTrip.length === 0) return trip
    return { ...trip, dutyPeriods, start: shifted(trip.start, 'start', inTrip), end: shifted(trip.end, 'end', inTrip) }
  })
  const jumpseats = schedule.jumpseats.map(move)
  return changed ? { ...schedule, trips, jumpseats } : schedule
}

/**
 * Whether the gate arrival a leg shows is the real plane's estimate, which the words mark with "about" (spec §9): a
 * schedule's leg, by its id. The map's own legs say so themselves (`isArrivalEstimated` in `src/map/tripMap.ts`).
 */
export function isEstimatedArrival(leg: { id: string; end: number }, flights: ReadonlyMap<string, MapFlight>): boolean {
  const flight = flights.get(leg.id)
  return flight != null && isEstimate(flight, leg.end)
}

/**
 * When the flight between its gates at `now` reaches its gate, while that time is the real plane's estimate: the time
 * the countdown and the narrative say "about" of (spec §9). Null with no such flight.
 */
export function estimatedArrival(legs: Leg[], flights: ReadonlyMap<string, MapFlight>, now: number): number | null {
  if (flights.size === 0) return null
  const leg = legs.find((l) => isMove(l) && l.start <= now && now < l.end && isEstimatedArrival(l, flights))
  return leg ? leg.end : null
}
```

- [x] **Step 4: Run them again.** Expected: 23 tests pass. Then `npx tsc --noEmit`: nothing.

- [x] **Step 5: Commit, on Todd's yes (after batch A's checkpoint).**

```bash
git add src/engine/liveLegs.ts tests/engine/liveLegs.test.ts
git commit -m "One landing time: each flight Crewlu Cloud has seen gets the real plane's times in the schedule every card is built from, its reported delay kept inside them (Stage 3 spec §7.1, §11, §12)"
```

---

### Task 4: The map takes the flights, frames their paths, and the replay keeps its moment

A flight leg of the map carries its `MapFlight` when Crewlu Cloud has answered for it, and frames all of a real path. Two pieces the views use later come with it: `framesAll`, whether a frame still shows a path that grew, and the replay clock's `carried`, which keeps a replay's moment when a new estimate changes the trip's times.

**Files:**
- Modify: `src/map/tripMap.ts`, `src/map/tripMapFor.ts`, `src/map/replayClock.ts`, `src/map/mapFit.ts`
- Test: `tests/map/liveTrip.ts` (a made-up trip with its real plane, as the status page makes it), `tests/map/liveTripMap.test.ts`, `tests/map/replayCarry.test.ts`, `tests/map/steadyFraming.test.ts`

- [x] **Step 1: Write the tests.**

**Create `tests/map/liveTrip.ts`:**

```ts
import { buildAirportIndex } from '../../src/data/airports'
import { buildLegs, type MoveLeg } from '../../src/engine/legs'
import { liveMapFlights, withLiveTimes } from '../../src/engine/liveLegs'
import type { Schedule } from '../../src/engine/types'
import type { GeoPoint } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { makeTripMap, type TripMap } from '../../src/map/tripMap'
import { airport } from './liveCases'
import { fix, liveFlight, MINUTE, point, START } from './madeUpFlights'

/** A made-up trip of one flight, Louisville to Philadelphia from noon to 2 PM, and its real plane, for the map's tests. */

export const SDF = airport('SDF')
export const PHL = airport('PHL')

export const LIVE_AIRPORTS = buildAirportIndex([
  ['SDF', 'Louisville', 'US', SDF.lat, SDF.lng, 'America/New_York', 'KY'],
  ['PHL', 'Philadelphia', 'US', PHL.lat, PHL.lng, 'America/New_York', 'PA'],
])

/** Seen from just after takeoff, every few minutes, then not for 25 minutes, then again: in the air, heading east. */
export const TRAIL = [point(16, 38.25, -85.55), point(22, 38.6, -84.6), point(28, 38.95, -83.6), point(53, 39.6, -80.3), point(57, 39.65, -79.8)]
export const FLYING = liveFlight(TRAIL, { legId: 'f1', fix: fix(58, 39.66, -79.7, { trackDeg: 75 }) })

/** The flight as the trip's leg, at its gate times. */
export const SDF_PHL: MoveLeg = {
  kind: 'flight', id: 'f1', tripId: 'T1', dep: 'SDF', arr: 'PHL', start: START, end: START + 120 * MINUTE, schedStart: START,
  schedEnd: START + 120 * MINUTE, airline: '5X', enteredAirline: null, number: '1234', deadhead: false, ground: false,
}

/** The trip as the engine's schedule: the one flight, in trip T1. */
export const SCHEDULE: Schedule = {
  pilot: { firstName: 'Alex', base: 'SDF', home: 'SDF', effHome: 'SDF' },
  trips: [{ id: 'T1', start: SDF_PHL.start, end: SDF_PHL.end, days: 1, dutyPeriods: [{ id: 'T1|dp|0', tripId: 'T1', start: SDF_PHL.start, end: SDF_PHL.end, flights: [SDF_PHL] }] }],
  jumpseats: [], commutes: [], events: [], fetchedAt: START, newestUpdatedAt: null, empty: false,
}

/** Where an airport is, as the status page finds it in its airport list. */
export const placeOf = (code: string): GeoPoint | null => {
  const a = LIVE_AIRPORTS.get(code)
  return a ? { lat: a.lat, lng: a.lng } : null
}

/** The trip's map at `t`, as the status page makes it: `live` as the flight's answer, or none, and the real times in the legs. */
export function liveTripMap(t: number, live: LiveFlight | null = FLYING): TripMap {
  const flights = liveMapFlights(SCHEDULE, new Map(live ? [['f1', live]] : []), 0, placeOf)
  const legs = buildLegs(withLiveTimes(SCHEDULE, flights, t))
  return makeTripMap(legs, { isNextTrip: false, home: 'SDF', now: t, airports: LIVE_AIRPORTS, flights })!
}
```

**Create `tests/map/liveTripMap.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { buildLegs, type Leg } from '../../src/engine/legs'
import { liveMapFlights, withLiveTimes } from '../../src/engine/liveLegs'
import { pathPoints } from '../../src/map/flightPathDrawing'
import { pointsAlong } from '../../src/map/greatCircle'
import { fitRect } from '../../src/map/mapFit'
import { framingPoints, isArrivalEstimated, makeTripMap, type TripMap } from '../../src/map/tripMap'
import { LIVE_AIRPORTS as AIRPORTS, PHL, placeOf, SCHEDULE, SDF, SDF_PHL as F1 } from './liveTrip'
import { fix, liveFlight, MINUTE, point, START } from './madeUpFlights'

/** Seen north of the line, then far north of it, 40 minutes in: still in the air. */
const LIVE = liveFlight([point(20, 38.6, -84.2), point(40, 40.6, -81.2)], { fix: fix(41, 40.65, -81.0) })
const LANDED = liveFlight([point(20, 38.6, -84.2), point(90, 39.8, -75.8)],
  { state: 'landed', landedAt: START + 100 * MINUTE, fix: fix(100, PHL.lat, PHL.lng, { onGround: true }) })

function mapAt(legs: Leg[], now: number, flights = new Map()): TripMap {
  return makeTripMap(legs, { isNextTrip: false, home: 'SDF', now, airports: AIRPORTS, flights })!
}

describe('the trip map with live data (Stage 3 spec §6.2, §11)', () => {
  it('leaves a flight with no live data as it was: no flight, the schedule drawn as before', () => {
    const map = mapAt([F1], START + 30 * MINUTE)
    expect(map.legs[0].flight).toBeUndefined()
    expect('flight' in map.legs[0]).toBe(false)
    expect(isArrivalEstimated(map.legs[0])).toBe(false)
  })

  it('gives a drive no flight', () => {
    const drive: Leg = { kind: 'drive', id: 'd1', tripId: null, from: 'PHL', to: 'SDF', toHome: true, start: START, end: START + 60 * MINUTE, schedEnd: START + 60 * MINUTE }
    const flights = new Map([['d1', liveMapFlights(SCHEDULE, new Map([['f1', LIVE]]), 0, placeOf).get('f1')!]])
    expect(mapAt([drive], START + 30 * MINUTE, flights).legs[0].flight).toBeUndefined()
  })

  it("carries a live flight's real path, at the real plane's times, with its end an estimate", () => {
    const now = START + 42 * MINUTE
    const flights = liveMapFlights(SCHEDULE, new Map([['f1', LIVE]]), 0, placeOf)
    const legs = buildLegs(withLiveTimes(SCHEDULE, flights, now))
    const leg = mapAt(legs, now, flights).legs[0]
    expect(leg.flight?.path.isReal).toBe(true)
    expect(leg.flight?.live).toBe(LIVE)
    expect(leg.end).not.toBe(F1.end)
    expect(isArrivalEstimated(leg)).toBe(true)
  })

  it('has no estimate once the plane has landed', () => {
    const now = START + 103 * MINUTE
    const flights = liveMapFlights(SCHEDULE, new Map([['f1', LANDED]]), 0, placeOf)
    const leg = mapAt(buildLegs(withLiveTimes(SCHEDULE, flights, now)), now, flights).legs[0]
    expect(leg.end).toBe(START + 107 * MINUTE)
    expect(isArrivalEstimated(leg)).toBe(false)
  })
})

describe("the trip map's camera with live data", () => {
  it('frames the great circles of before for a flight with no live data', () => {
    expect(framingPoints(mapAt([F1], START), null)).toEqual([...pointsAlong(SDF, PHL, 33), SDF])
  })

  it('frames every place a real path passes', () => {
    const flights = liveMapFlights(SCHEDULE, new Map([['f1', LIVE]]), 0, placeOf)
    const map = mapAt([F1], START + 42 * MINUTE, flights)
    const framed = fitRect(framingPoints(map, map.legs[0]))!
    for (const place of pathPoints(flights.get('f1')!.path)) {
      const one = fitRect([place, place])!
      expect(one.x).toBeGreaterThanOrEqual(framed.x - 1e-12)
      expect(one.x).toBeLessThanOrEqual(framed.x + framed.width + 1e-12)
      expect(one.y).toBeGreaterThanOrEqual(framed.y - 1e-12)
      expect(one.y).toBeLessThanOrEqual(framed.y + framed.height + 1e-12)
    }
  })

  it('reaches a path far from the great circle', () => {
    const flights = liveMapFlights(SCHEDULE, new Map([['f1', LIVE]]), 0, placeOf)
    const before = mapAt([F1], START)
    const schedule = fitRect(framingPoints(before, before.legs[0]))!
    const live = fitRect(framingPoints(mapAt([F1], START + 42 * MINUTE, flights), null))!
    // The plane was seen at 40.6° north, well north of the great circle, whose frame tops out near Philadelphia.
    expect(live.y).toBeLessThan(schedule.y)
  })
})
```

**Create `tests/map/replayCarry.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { carried, clockTime, hasFinished, hasTimes, isLive, isPlaying, liveClock, play, scrub, setSpeed, type Stretch } from '../../src/map/replayClock'

const HOUR = 3_600_000
const T = Date.UTC(2027, 0, 15, 12)
const at = (hours: number) => T + hours * HOUR

/** A flight from noon to 2, a wait, and one from 3 to 5: the trip's times before a new landing estimate. */
const SPAN: Stretch = { start: at(0), end: at(5) }
const LEGS: Stretch[] = [{ start: at(0), end: at(2) }, { start: at(3), end: at(5) }]
const WAITS: Stretch[] = [{ start: at(2), end: at(3) }]
/** The first flight lands 20 minutes early: its wait starts then. */
const EARLY_LEGS: Stretch[] = [{ start: at(0), end: at(2) - HOUR / 3 }, LEGS[1]]
const EARLY_WAITS: Stretch[] = [{ start: at(2) - HOUR / 3, end: at(3) }]
/** The last flight lands half an hour late: the trip grows. */
const LATE_SPAN: Stretch = { start: at(0), end: at(5.5) }
const LATE_LEGS: Stretch[] = [LEGS[0], { start: at(3), end: at(5.5) }]

const REAL_NOW = Date.UTC(2027, 0, 16, 9)

describe("the replay's clock when the trip's times change (Stage 3 spec §7.3)", () => {
  it('stays live when live', () => {
    const clock = carried(liveClock(SPAN, LEGS, WAITS), SPAN, EARLY_LEGS, EARLY_WAITS, REAL_NOW)
    expect(isLive(clock)).toBe(true)
    expect(hasTimes(clock, SPAN, EARLY_LEGS, EARLY_WAITS)).toBe(true)
  })

  it('keeps a paused moment', () => {
    const paused = scrub(liveClock(SPAN, LEGS, WAITS), at(1))
    const clock = carried(paused, SPAN, EARLY_LEGS, EARLY_WAITS, REAL_NOW)
    expect(isPlaying(clock)).toBe(false)
    expect(clockTime(clock, REAL_NOW + HOUR)).toBe(at(1))
  })

  it('plays on from the same moment, at the same speed and at the new legs’ pace', () => {
    const playing = setSpeed(play(scrub(liveClock(SPAN, LEGS, WAITS), at(1)), REAL_NOW - 1000), 5, REAL_NOW - 1000)
    const before = clockTime(playing, REAL_NOW)
    const clock = carried(playing, SPAN, EARLY_LEGS, EARLY_WAITS, REAL_NOW)
    expect(isPlaying(clock)).toBe(true)
    expect(clock.speed).toBe(5)
    expect(clockTime(clock, REAL_NOW)).toBe(before)
    expect(clockTime(clock, REAL_NOW + 1000)).toBeGreaterThan(before)
    expect(hasTimes(clock, SPAN, EARLY_LEGS, EARLY_WAITS)).toBe(true)
  })

  it('holds a moment past the new end to it', () => {
    const paused = scrub(liveClock(LATE_SPAN, LATE_LEGS, WAITS), at(5.25))
    expect(clockTime(carried(paused, SPAN, LEGS, WAITS, REAL_NOW), REAL_NOW)).toBe(SPAN.end)
  })

  it('moves a clock at the old end to the new end when the trip grows', () => {
    const paused = scrub(liveClock(SPAN, LEGS, WAITS), SPAN.end)
    expect(clockTime(carried(paused, LATE_SPAN, LATE_LEGS, WAITS, REAL_NOW), REAL_NOW)).toBe(LATE_SPAN.end)
  })

  it('moves a clock at the old start to the new start when the trip starts earlier', () => {
    const earlier: Stretch = { start: at(-0.25), end: SPAN.end }
    const paused = scrub(liveClock(SPAN, LEGS, WAITS), SPAN.start)
    expect(clockTime(carried(paused, earlier, LEGS, WAITS, REAL_NOW), REAL_NOW)).toBe(earlier.start)
  })

  it('keeps a finished replay at the end, paused', () => {
    const finished = play(scrub(liveClock(SPAN, LEGS, WAITS), at(4.99)), REAL_NOW - HOUR)
    expect(hasFinished(finished, REAL_NOW)).toBe(true)
    const clock = carried(finished, LATE_SPAN, LATE_LEGS, WAITS, REAL_NOW)
    expect(isPlaying(clock)).toBe(false)
    expect(clockTime(clock, REAL_NOW)).toBe(LATE_SPAN.end)
  })

  it('keeps Quick layovers, and says which times it was made for', () => {
    const clock = carried({ ...scrub(liveClock(SPAN, LEGS, WAITS), at(1)), quickLayovers: true }, SPAN, EARLY_LEGS, EARLY_WAITS, REAL_NOW)
    expect(clock.quickLayovers).toBe(true)
    expect(hasTimes(clock, SPAN, LEGS, WAITS)).toBe(false)
    expect(hasTimes(clock, SPAN, EARLY_LEGS, WAITS)).toBe(false)
    expect(hasTimes(clock, LATE_SPAN, EARLY_LEGS, EARLY_WAITS)).toBe(false)
    expect(hasTimes(clock, SPAN, EARLY_LEGS, EARLY_WAITS)).toBe(true)
  })
})
```

**Create `tests/map/steadyFraming.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { framesAll } from '../../src/map/mapFit'
import { framingSubject } from '../../src/map/tripMap'
import { liveTripMap } from './liveTrip'
import { MINUTE, START } from './madeUpFlights'

const p = (lat: number, lng: number) => ({ lat, lng })

describe('whether a frame still shows a path that grew (Stage 3 spec §6.2)', () => {
  const kept = [p(38, -86), p(40, -75)]

  it('holds places inside the rectangle the kept places frame, with its room around them', () => {
    expect(framesAll(kept, [p(39, -80), p(38, -86)])).toBe(true)
    // The frame has a fifth of its size spare on each side.
    expect(framesAll(kept, [p(40.3, -74.5)])).toBe(true)
  })

  it('lets go once a place lies outside it', () => {
    expect(framesAll(kept, [p(39, -80), p(46, -80)])).toBe(false)
    expect(framesAll(kept, [p(39, -60)])).toBe(false)
  })

  it('counts a place across the date line on the copy of the world nearest the frame', () => {
    const pacific = [p(61, 150), p(61, -150)]
    expect(framesAll(pacific, [p(61, 179.5), p(61, -179.5)])).toBe(true)
  })

  it('frames nothing from no places, but no places', () => {
    expect(framesAll([], [])).toBe(true)
    expect(framesAll([], [p(0, 0)])).toBe(false)
  })
})

describe('what the camera frames, as a key', () => {
  const map = liveTripMap(START + 30 * MINUTE)

  it('is the leg in focus, or the whole trip by its legs, so another trip is framed afresh', () => {
    expect(framingSubject(map, map.legs[0])).toBe('f1')
    expect(framingSubject(map, null)).toBe('f1')
    const other = { ...map, legs: [{ ...map.legs[0], id: 'f7' }, { ...map.legs[0], id: 'f8' }] }
    expect(framingSubject(other, null)).toBe('f7,f8')
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/map/liveTripMap.test.ts tests/map/replayCarry.test.ts tests/map/steadyFraming.test.ts
```

Expected: 18 of the 20 fail: `carried`, `framesAll`, `framingSubject` and `isArrivalEstimated` aren't there yet, and the map's legs carry no flight.

- [x] **Step 3: Give the map's legs their flights.** `flight` is left out of a leg with no live data, so every test that writes a leg by hand still builds, and every leg made before reads as it did.

**In `src/map/tripMap.ts`, replace (1 of 8):**

```ts
import { isMove, type Leg, type PlaceLeg } from '../engine/legs'
import type { Iata } from '../engine/types'
import { scheduledFraction, scheduledTime } from './flightProgress'
import { distanceMeters, METERS_PER_MILE, pointAlong, pointsAlong, type GeoPoint } from './greatCircle'
import { calendarDay } from '../time/zoned'
import { aimFractions, flatMapAngle } from './planeHeading'
import type { GroundKind } from './tripActivity'
```

**with:**

```ts
import { isMove, type Leg, type PlaceLeg } from '../engine/legs'
import type { Iata } from '../engine/types'
import { pathFramingPoints } from './flightPathDrawing'
import { scheduledFraction, scheduledTime } from './flightProgress'
import { distanceMeters, METERS_PER_MILE, pointAlong, pointsAlong, type GeoPoint } from './greatCircle'
import { calendarDay } from '../time/zoned'
import { isEstimate, type MapFlight } from './mapFlight'
import { aimFractions, flatMapAngle } from './planeHeading'
import type { GroundKind } from './tripActivity'
```

**In `src/map/tripMap.ts`, replace (2 of 8):**

```ts
  end: number
  flightNumber: string | null
}

```

**with:**

```ts
  end: number
  flightNumber: string | null
  /**
   * A flight's plan, path and record, once Crewlu Cloud has answered for it (Stage 3 spec §11). Left out for a drive,
   * and for a flight with no live data, which the map draws from the schedule as before.
   */
  flight?: MapFlight
}

```

**In `src/map/tripMap.ts`, replace (3 of 8):**

```ts
}

function mapLeg(leg: Leg, airports: AirportIndex): MapLeg | null {
  const ends = isMove(leg) ? [leg.dep, leg.arr] : leg.kind === 'drive' ? [leg.from, leg.to] : null
  if (!ends) return null
```

**with:**

```ts
}

function mapLeg(leg: Leg, airports: AirportIndex, flights: ReadonlyMap<string, MapFlight>): MapLeg | null {
  const ends = isMove(leg) ? [leg.dep, leg.arr] : leg.kind === 'drive' ? [leg.from, leg.to] : null
  if (!ends) return null
```

**In `src/map/tripMap.ts`, replace (4 of 8):**

```ts
  // A van or bus between airports (`ground`) goes by road, so it's drawn as a drive.
  const isFlight = isMove(leg) && !leg.ground
  return {
    id: leg.id,
```

**with:**

```ts
  // A van or bus between airports (`ground`) goes by road, so it's drawn as a drive.
  const isFlight = isMove(leg) && !leg.ground
  const flight = isFlight ? flights.get(leg.id) : undefined
  return {
    id: leg.id,
```

**In `src/map/tripMap.ts`, replace (5 of 8):**

```ts
    end: leg.end,
    flightNumber: isFlight ? flightNumberText(leg.airline, leg.number) : null,
  }
}
```

**with:**

```ts
    end: leg.end,
    flightNumber: isFlight ? flightNumberText(leg.airline, leg.number) : null,
    ...(flight && { flight }),
  }
}
```

**In `src/map/tripMap.ts`, replace (6 of 8):**

```ts
  now: number
  airports: AirportIndex
}

/** The map of one trip's legs, or null when none can be drawn (moving map spec §12). */
export function makeTripMap(
  legs: Leg[], { isNextTrip, isRecap = false, days = null, home, base = null, isWaitingAtBase = false, now, airports }: TripMapOptions,
): TripMap | null {
  const mapped = [...legs].sort((a, b) => a.start - b.start).map((l) => mapLeg(l, airports)).filter((l): l is MapLeg => l != null)
  if (mapped.length === 0) return null
  const start = Math.min(...mapped.map((l) => l.start))
```

**with:**

```ts
  now: number
  airports: AirportIndex
  /** Each flight Crewlu Cloud answered for, by its leg's id (`liveMapFlights`). */
  flights?: ReadonlyMap<string, MapFlight>
}

const NO_FLIGHTS: ReadonlyMap<string, MapFlight> = new Map()

/** The map of one trip's legs, or null when none can be drawn (moving map spec §12). */
export function makeTripMap(
  legs: Leg[],
  { isNextTrip, isRecap = false, days = null, home, base = null, isWaitingAtBase = false, now, airports, flights = NO_FLIGHTS }: TripMapOptions,
): TripMap | null {
  const mapped = [...legs].sort((a, b) => a.start - b.start).map((l) => mapLeg(l, airports, flights)).filter((l): l is MapLeg => l != null)
  if (mapped.length === 0) return null
  const start = Math.min(...mapped.map((l) => l.start))
```

**In `src/map/tripMap.ts`, replace (7 of 8):**

```ts
  }
}

/** True from leaving the gate (or the driveway) until reaching the other end. */
```

**with:**

```ts
  }
}

/** Whether the leg's gate arrival is the real plane's estimate, which the words mark with "about" (Stage 3 spec §9). */
export const isArrivalEstimated = (leg: MapLeg) => leg.flight != null && isEstimate(leg.flight, leg.end)

/** True from leaving the gate (or the driveway) until reaching the other end. */
```

**In `src/map/tripMap.ts`, replace (8 of 8):**

```ts
}

/** The places the camera must show: one leg's arc, or every leg's arcs and home. */
export function framingPoints(map: TripMap, focus: MapLeg | null): GeoPoint[] {
  const shown = focus ? [focus] : map.legs
  const points = shown.flatMap((l) => pointsAlong(l.origin.place, l.destination.place, 33))
  if (!focus && map.home) points.push(map.home.place)
  return points
}

/** The airports the flights among `legs` reach, in order, each once, with home left out (moving map spec §5.3). */
```

**with:**

```ts
}

/** The places the camera must show: one leg's arc, or every leg's arcs and home. A flight with a real path frames all of it (Stage 3 spec §6.2). */
export function framingPoints(map: TripMap, focus: MapLeg | null): GeoPoint[] {
  const shown = focus ? [focus] : map.legs
  const points = shown.flatMap((l) => (l.flight ? pathFramingPoints(l.flight.path) : pointsAlong(l.origin.place, l.destination.place, 33)))
  if (!focus && map.home) points.push(map.home.place)
  return points
}

/** What the camera frames, as a key: the leg in focus, or the whole trip. */
export const framingSubject = (map: TripMap, focus: MapLeg | null) => focus?.id ?? map.legs.map((l) => l.id).join(',')

/** The airports the flights among `legs` reach, in order, each once, with home left out (moving map spec §5.3). */
```

**In `src/map/tripMapFor.ts`, replace (1 of 2):**

```ts
import { HOUR } from '../time/zoned'
import { isGroundLeg, makeTripMap, type TripMap } from './tripMap'
```

**with:**

```ts
import { HOUR } from '../time/zoned'
import type { MapFlight } from './mapFlight'
import { isGroundLeg, makeTripMap, type TripMap } from './tripMap'
```

**In `src/map/tripMapFor.ts`, replace (2 of 2):**

```ts

/** The status page's trip map, or null when there's nothing to draw. */
export function tripMapFor(snap: Snapshot, legs: Leg[], airports: AirportIndex): TripMap | null {
  const options = (isNextTrip: boolean) => ({ isNextTrip, home: snap.pilot.effHome, base: snap.pilot.base, now: snap.t, airports })
  const kind = snap.status.kind
```

**with:**

```ts

/**
 * The status page's trip map, or null when there's nothing to draw. `flights` are the flights Crewlu Cloud answered for,
 * by leg id: the map draws their real planes (Stage 3 spec §11).
 */
export function tripMapFor(snap: Snapshot, legs: Leg[], airports: AirportIndex, flights?: ReadonlyMap<string, MapFlight>): TripMap | null {
  const options = (isNextTrip: boolean) => ({ isNextTrip, home: snap.pilot.effHome, base: snap.pilot.base, now: snap.t, airports, flights })
  const kind = snap.status.kind
```

- [x] **Step 4: Let the replay's clock carry on.**

**In `src/map/replayClock.ts`, replace:**

```ts

// Positions along the timeline (activity markers design §4.3): the bar measures replay time at 1x at the clock's pace.
```

**with:**

```ts

const sameStretches = (a: readonly Stretch[], b: readonly Stretch[]) =>
  a.length === b.length && a.every((s, i) => s.start === b[i].start && s.end === b[i].end)

/** Whether the clock was made for these times: the trip's span, its legs and its waits. */
export const hasTimes = (c: ReplayClock, span: Stretch, legs: readonly Stretch[], waits: readonly Stretch[]) =>
  c.span.start === span.start && c.span.end === span.end && sameStretches(c.legs, legs) && sameStretches(c.waits, waits)

/**
 * The clock for the trip's new times, as the app's TripReplayClock.carried: each new landing estimate moves a leg
 * (Stage 3 spec §7.3). Live stays live. A replay keeps its moment, playing or paused, at its speed, and plays on at the
 * new legs' pace. A moment at either end of the trip stays at that end, wherever the new times put it. A replay that
 * has finished stays at the end.
 */
export function carried(c: ReplayClock, span: Stretch, legs: readonly Stretch[], waits: readonly Stretch[], now: number): ReplayClock {
  const next: ReplayClock = { ...c, span, legs, waits, anchor: null }
  if (isLive(c)) return next
  const moment = clockTime(c, now)
  const tripTime = held(next, moment >= c.span.end ? span.end : moment <= c.span.start ? span.start : moment)
  return { ...next, anchor: { tripTime, playingSince: isPlaying(c) && !hasFinished(c, now) ? now : null } }
}

// Positions along the timeline (activity markers design §4.3): the bar measures replay time at 1x at the clock's pace.
```

- [x] **Step 5: Say whether a frame still shows a path that grew.**

**In `src/map/mapFit.ts`, replace:**

```ts
  return normalized({ x: (minX + maxX) / 2 - width / 2, y: (minY + maxY) / 2 - height / 2, width, height })
}
```

**with:**

```ts
  return normalized({ x: (minX + maxX) / 2 - width / 2, y: (minY + maxY) / 2 - height / 2, width, height })
}

/**
 * Whether every place of `next` lies inside the rectangle that frames `kept`, with the same room around it: the camera
 * framed on `kept` already shows them. A real path grows as the plane is seen (Stage 3 spec §6.2), and the map frames
 * again only once it grows past its frame, so the camera doesn't move with every answer.
 */
export function framesAll(kept: GeoPoint[], next: GeoPoint[]): boolean {
  const rect = fitRect(kept)
  if (!rect) return next.length === 0
  return next.every((place) => {
    const p = toWorld(place)
    // The copy of the world that puts the place nearest the rectangle's middle.
    const x = p.x + Math.round(rect.x + rect.width / 2 - p.x)
    return x >= rect.x && x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height
  })
}
```

- [x] **Step 6: Run them again.** Expected: 20 tests pass. Then `npx tsc --noEmit`: nothing.

- [x] **Step 7: Batch A's review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Tasks 2 to 4, against the spec's §6, §7.1, §11 and §12, the app's plan 3B-2 Tasks 3 to 5, and this plan's list of where it differs. Make its fixes, rerun Steps 4 to 6 of each task, and record what it found under "Changes made during execution".

- [x] **Step 8: Batch A's checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npx vitest run tests/map tests/engine
```

Expected: 846 tests pass.

- [x] **Step 9: Commit, on Todd's yes.** Tasks 2 and 3's commits, then:

```bash
git add src/map/tripMap.ts src/map/tripMapFor.ts src/map/replayClock.ts src/map/mapFit.ts tests/map/liveTrip.ts tests/map/liveTripMap.test.ts tests/map/replayCarry.test.ts tests/map/steadyFraming.test.ts
git commit -m "The trip map takes each flight's plan, path and record, frames all of a real path, knows when a frame still shows a path that grew, and its replay keeps its moment when the trip's times change (Stage 3 spec §6.2, §7.3, §11)"
```

---

### Task 5: The drawing: the real path, the real plane and the ghost

`flightDrawing` is where the map chooses what to draw of a flight, by `LiveProgress.phase`, by the table at the head of `src/map/flightDrawing.ts` (the app's Task 6 table). Lines become lists of places, so a real path can be drawn, and both maps draw the new lines and the two planes in the same task: their switches over a line's style and a mark's kind must cover the new ones to build.

**Files:**
- Create: `src/map/flightDrawing.ts`
- Modify: `src/map/tripMapDrawing.ts`, `src/map/appleMapPlan.ts`, `src/ui/appleMarks.ts`, `src/ui/AppleTripMap.tsx`, `src/ui/TripMapSvg.tsx`, `src/styles/tripMap.css`
- Test: `tests/map/flightDrawing.test.ts`, `tests/map/liveMarks.test.ts`, `tests/ui/liveMapViews.test.tsx`

- [x] **Step 1: Write the tests.**

**Create `tests/map/flightDrawing.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { flightDrawing, type FlightDrawing, type RouteSegment } from '../../src/map/flightDrawing'
import { pointAtDistance } from '../../src/map/flightPath'
import { pathHeadingAt, pathPoints } from '../../src/map/flightPathDrawing'
import { recordPositionAt } from '../../src/map/flightRecord'
import type { GeoPoint } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { makeMapFlight, mapFlightProgress, type MapFlight } from '../../src/map/mapFlight'
import { isMoving, type MapLeg } from '../../src/map/tripMap'
import { airport, at, caseFlight, expectPlace, LIVE_CASES, type CaseFlight } from './liveCases'
import { FLYING, PHL, SDF, TRAIL } from './liveTrip'
import { fix, liveFlight, MINUTE, point, START } from './madeUpFlights'

const mark = (code: string, place: GeoPoint) => ({ code, city: code, place, timeZone: null })

/** A flight leg of the map, at `start` and `end`, with `flight` when it has one. */
function legOf(from: string, to: string, start: number, end: number, flight: MapFlight | null): MapLeg {
  return {
    id: 'f1', kind: 'flight', origin: mark(from, airport(from)), destination: mark(to, airport(to)), start, end, flightNumber: 'UPS1234',
    ...(flight && { flight }),
  }
}

/** SDF → PHL from noon to 2 PM, with `live`. */
function sdfPhl(live: LiveFlight | null, end = START + 120 * MINUTE): MapLeg {
  const flight = live ? makeMapFlight(START, START + 120 * MINUTE, SDF, PHL, live) : null
  return legOf('SDF', 'PHL', START, end, flight)
}

const styles = (d: FlightDrawing) => d.segments.map((s) => s.style)
const lastPoint = (s: RouteSegment) => s.points[s.points.length - 1]
const near = (a: GeoPoint, b: GeoPoint) => Math.abs(a.lat - b.lat) < 1e-9 && Math.abs(a.lng - b.lng) < 1e-9

/** A line's places from the departure airport's side: the line ahead of a real plane is written from the arrival airport back. */
const forward = (s: RouteSegment, destination: GeoPoint) =>
  s.points.length > 1 && near(s.points[0], destination) && !near(lastPoint(s), destination) ? [...s.points].reverse() : s.points

/** The lines run on from one to the next, with no break, from the departure airport to the arrival airport. */
function expectUnbroken(d: FlightDrawing, origin: GeoPoint, destination: GeoPoint, what: string) {
  const lines = d.segments.map((s) => forward(s, destination))
  expect(near(lines[0][0], origin), `${what}: starts at the departure airport`).toBe(true)
  for (let i = 1; i < lines.length; i++) {
    expect(near(lines[i][0], lines[i - 1][lines[i - 1].length - 1]), `${what}: line ${i} starts where line ${i - 1} ends`).toBe(true)
  }
  const last = lines[lines.length - 1]
  expect(near(last[last.length - 1], destination), `${what}: ends at the arrival airport`).toBe(true)
}

const named = (name: string): CaseFlight => {
  const found = LIVE_CASES.flights.find((f) => f.name === name)
  if (!found) throw new Error(`No shared case named ${name}`)
  return found
}

describe("a flight's drawing now (Stage 3 spec §5.1, §5.4, §6.2)", () => {
  it('draws the planes every shared moment expects, with lines that never break', () => {
    for (const flightCase of LIVE_CASES.flights) {
      const live = caseFlight(flightCase.flight)
      const origin = airport(flightCase.from)
      const destination = airport(flightCase.to)
      const flight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), origin, destination, live)
      for (const moment of flightCase.moments) {
        const what = `${flightCase.name} at ${moment.at}`
        const t = at(moment.at)
        const leg = legOf(flightCase.from, flightCase.to, at(moment.start), at(moment.end), flight)
        const d = flightDrawing(leg, t, false)
        expectUnbroken(d, origin, destination, what)
        if (!isMoving(leg, t)) {
          expect([d.plane, d.realPlane, d.ghost], what).toEqual([null, null, null])
        } else if (moment.plane == null) {
          expect(d.realPlane, what).toBeNull()
          expect(d.plane, what).not.toBeNull()
        } else {
          expect(d.plane, what).toBeNull()
          expectPlace(d.realPlane?.place ?? null, moment.plane, `${what}, the real plane`)
          expect(d.realPlane?.isEstimated, what).toBe(moment.phase === 'estimated')
          expectPlace(d.ghost?.place ?? null, moment.ghost, `${what}, the ghost`)
        }
      }
    }
  })

  it('in the air, draws the real path solid behind the plane, dotted where nobody saw it, and dashed ahead', () => {
    const d = flightDrawing(sdfPhl(FLYING), START + 59 * MINUTE, false)
    expect(styles(d)).toEqual(['seen', 'unseen', 'seen', 'upcoming'])
    expect(d.segments[0].points).toEqual([SDF, ...TRAIL.slice(0, 3).map((p) => p.place)])
    expect(d.segments[1].points).toEqual([TRAIL[2].place, TRAIL[3].place])
    // The line ahead is written from the airport back to the plane, so its dashes stay put as the plane moves.
    expect(d.segments[3].points[0]).toEqual(PHL)
    expect(near(lastPoint(d.segments[3]), d.realPlane!.place)).toBe(true)
    expect(d.realPlane?.isEstimated).toBe(false)
    expect(d.ghost).not.toBeNull()
  })

  it('in the air, points the plane the way it is really going', () => {
    const angle = (trackDeg: number) => flightDrawing(sdfPhl({ ...FLYING, fix: fix(58, 39.66, -79.7, { trackDeg }) }), START + 59 * MINUTE, false).realPlane!.angle
    expect(angle(0)).toBeCloseTo(-Math.PI / 2, 12)
    expect(angle(90)).toBeCloseTo(0, 12)
    expect(angle(180)).toBeCloseTo(Math.PI / 2, 12)
    expect(angle(75)).toBeCloseTo((-15 * Math.PI) / 180, 12)
  })

  it('points a plane with no track along its path', () => {
    const leg = sdfPhl({ ...FLYING, fix: fix(58, 39.66, -79.7, { trackDeg: null }) })
    const t = START + 59 * MINUTE
    const along = pathHeadingAt(leg.flight!.path, mapFlightProgress(leg.flight!, t).planeDistance!)
    expect(flightDrawing(leg, t, false).realPlane!.angle).toBe(along)
  })

  it('while estimated, dots the plan behind the faded plane, from the last place it was seen', () => {
    const t = START + 75 * MINUTE
    const flight = sdfPhl(FLYING)
    const d = flightDrawing(flight, t, false)
    expect(mapFlightProgress(flight.flight!, t).phase).toBe('estimated')
    expect(styles(d)).toEqual(['seen', 'unseen', 'seen', 'unseen', 'upcoming'])
    const dotted = d.segments[3]
    expect(near(dotted.points[0], fix(58, 39.66, -79.7).place)).toBe(true)
    expect(near(lastPoint(dotted), d.realPlane!.place)).toBe(true)
    expect(d.realPlane?.isEstimated).toBe(true)
    // An estimate points along its path, not the way it was going when last seen.
    expect(d.realPlane!.angle).toBe(pathHeadingAt(flight.flight!.path, mapFlightProgress(flight.flight!, t).planeDistance!))
  })

  it('draws a stretch nobody saw and the plan behind an estimated plane as one dotted line', () => {
    // Seen to 12:28, then once at 12:45, 17 minutes later, and not since.
    const gap = liveFlight(TRAIL.slice(0, 3), { fix: fix(45, 39.4, -81.8) })
    const d = flightDrawing(sdfPhl(gap), START + 60 * MINUTE, false)
    expect(styles(d)).toEqual(['seen', 'unseen', 'upcoming'])
    expect(d.segments[1].points[0]).toEqual(TRAIL[2].place)
    expect(near(lastPoint(d.segments[1]), d.realPlane!.place)).toBe(true)
  })

  it("writes the dotted line to an estimated plane from the place it was last seen, so its dots stay put as the plane flies on", () => {
    const flight = sdfPhl(FLYING)
    const first = flightDrawing(flight, START + 70 * MINUTE, false).segments
    const later = flightDrawing(flight, START + 80 * MINUTE, false).segments
    expect(first[3].style).toBe('unseen')
    expect(later[3].points[0]).toEqual(first[3].points[0])
    expect(near(lastPoint(later[3]), lastPoint(first[3]))).toBe(false)
    // And the dashed line ahead starts at the airport.
    expect(later[4].points[0]).toEqual(first[4].points[0])
  })

  it("on the ground after the plan's takeoff, draws the whole path ahead, with the ghost gone on", () => {
    const flightCase = named('still on the ground twenty minutes after')
    const moment = flightCase.moments[flightCase.moments.length - 1]
    const flight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), airport(flightCase.from), airport(flightCase.to), caseFlight(flightCase.flight))
    const d = flightDrawing(legOf(flightCase.from, flightCase.to, at(moment.start), at(moment.end), flight), at(moment.at), false)
    expect(styles(d)).toEqual(['upcoming'])
    expect(d.ghost).not.toBeNull()
    expect(near(d.ghost!.place, d.realPlane!.place)).toBe(false)
  })

  it('landed and never seen in the air, dots the great circle, with the plane at the arrival airport', () => {
    const flightCase = named('landed, and never seen in the air')
    const moment = flightCase.moments[flightCase.moments.length - 1]
    const destination = airport(flightCase.to)
    const flight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), airport(flightCase.from), destination, caseFlight(flightCase.flight))
    const leg = legOf(flightCase.from, flightCase.to, at(moment.start), at(moment.end), flight)
    const t = Math.min(at(moment.at), leg.end - 1)
    const d = flightDrawing(leg, t, false)
    expect(mapFlightProgress(flight!, t).phase).toBe('landed')
    expect(styles(d)).toEqual(['unseen'])
    expect(near(d.realPlane!.place, destination)).toBe(true)
    expect(d.ghost).toBeNull()
  })

  it('on the ground somewhere else, shows the real plane where it is, with no ghost', () => {
    const flightCase = named('on the ground somewhere else')
    const moment = flightCase.moments[flightCase.moments.length - 1]
    const flight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), airport(flightCase.from), airport(flightCase.to), caseFlight(flightCase.flight))
    const d = flightDrawing(legOf(flightCase.from, flightCase.to, at(moment.start), at(moment.end), flight), at(moment.at), false)
    expectPlace(d.realPlane?.place ?? null, moment.plane, 'the plane')
    expect(d.ghost).toBeNull()
  })

  it('draws a plane that came down somewhere else, after it was seen flying, where it is, with its lines as it was last seen flying them', () => {
    const diverted = liveFlight(TRAIL, { state: 'ground', fix: fix(75, 39.2, -78.4, { onGround: true }) })
    const leg = sdfPhl(diverted)
    const t = START + 76 * MINUTE
    expect(mapFlightProgress(leg.flight!, t).phase).toBe('elsewhere')
    const d = flightDrawing(leg, t, false)
    expect(near(d.realPlane!.place, { lat: 39.2, lng: -78.4 })).toBe(true)
    expect(d.ghost).toBeNull()
    expect(styles(d)).toEqual(['seen', 'unseen', 'seen', 'upcoming'])
    expect(near(lastPoint(d.segments[3]), pointAtDistance(leg.flight!.path, leg.flight!.path.flownLength))).toBe(true)
    expect(near(lastPoint(d.segments[3]), TRAIL[4].place)).toBe(true)
  })

  it("draws a flight that isn't live as before: the schedule's plane on the great circle", () => {
    const waiting = liveFlight([], { state: 'waiting' })
    const d = flightDrawing(sdfPhl(waiting), START + 60 * MINUTE, false)
    expect(d.realPlane).toBeNull()
    expect(d.plane).not.toBeNull()
    expect(d.segments.map((s) => [s.id, s.style, s.points.length])).toEqual([['f1-flying', 'flying', 2], ['f1-upcoming', 'upcoming', 2]])
    expect(flightDrawing(sdfPhl(null), START + 60 * MINUTE, false)).toEqual(d)
  })

  it('after it reaches its gate, is one grey line along its real path', () => {
    const landed = liveFlight(TRAIL, { state: 'landed', landedAt: START + 100 * MINUTE, fix: fix(100, PHL.lat, PHL.lng, { onGround: true }) })
    const leg = sdfPhl(landed, START + 107 * MINUTE)
    const d = flightDrawing(leg, START + 108 * MINUTE, false)
    expect(d.segments).toEqual([{ id: 'f1-flown', points: pathPoints(leg.flight!.path), style: 'flown', geodesic: true }])
    expect([d.plane, d.realPlane, d.ghost]).toEqual([null, null, null])
  })

  it('before it leaves its gate, is dashed along its path, with no plane', () => {
    const d = flightDrawing(sdfPhl(FLYING), START - MINUTE, false)
    expect(d.segments.map((s) => s.style)).toEqual(['upcoming'])
    expect([d.plane, d.realPlane, d.ghost]).toEqual([null, null, null])
  })
})

describe("a flight's drawing in the replay (Stage 3 spec §7.3)", () => {
  it('flies a flight with a record on its record, alone', () => {
    const leg = sdfPhl(FLYING)
    const t = START + 25 * MINUTE
    const d = flightDrawing(leg, t, true)
    expect(near(d.realPlane!.place, recordPositionAt(leg.flight!.record!, t))).toBe(true)
    expect(d.realPlane?.isEstimated).toBe(false)
    expect(d.ghost).toBeNull()
    expect(d.plane).toBeNull()
  })

  it('before the plane was first seen, flies the stretch from the airport', () => {
    const late = liveFlight([point(30, 38.95, -83.6), point(40, 39.3, -82.0)], { fix: fix(41, 39.32, -81.9) })
    const d = flightDrawing(sdfPhl(late), START + 20 * MINUTE, true)
    expect(styles(d)).toEqual(['unseen', 'upcoming'])
    expect(d.segments[0].points[0]).toEqual(SDF)
  })

  it('ahead of where the plane was last seen, is an estimate', () => {
    const leg = sdfPhl(FLYING)
    const d = flightDrawing(leg, START + 80 * MINUTE, true)
    expect(d.realPlane?.isEstimated).toBe(true)
    expect(styles(d)).toEqual(['seen', 'unseen', 'seen', 'unseen', 'upcoming'])
  })

  it('of a landed flight is never an estimate', () => {
    const landed = liveFlight(TRAIL, { state: 'landed', landedAt: START + 100 * MINUTE, fix: fix(100, PHL.lat, PHL.lng, { onGround: true }) })
    const leg = sdfPhl(landed, START + 107 * MINUTE)
    for (const minutes of [20, 40, 80, 99]) expect(flightDrawing(leg, START + minutes * MINUTE, true).realPlane?.isEstimated).toBe(false)
  })

  it("draws the schedule's plane for a flight with no record", () => {
    const d = flightDrawing(sdfPhl(liveFlight([], { state: 'waiting' })), START + 60 * MINUTE, true)
    expect(d.realPlane).toBeNull()
    expect(d.plane).not.toBeNull()
  })
})

describe("a leg with no flight's live data", () => {
  it("draws the schedule's plane on the great circle, now and in the replay alike", () => {
    const leg = sdfPhl(null)
    const now = flightDrawing(leg, START + 60 * MINUTE, false)
    expect(flightDrawing(leg, START + 60 * MINUTE, true)).toEqual(now)
    expect(now.segments.map((s) => s.points)).toEqual([[SDF, now.plane!.place], [now.plane!.place, PHL]])
  })
})
```

**Create `tests/map/liveMarks.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { appleMapPlan } from '../../src/map/appleMapPlan'
import { distanceMeters, EARTH_RADIUS_M, pointsAlong } from '../../src/map/greatCircle'
import { makeMapFlight } from '../../src/map/mapFlight'
import { makeTripMap } from '../../src/map/tripMap'
import { routePoints, tripMapDrawing } from '../../src/map/tripMapDrawing'
import { FLYING, LIVE_AIRPORTS, liveTripMap, PHL, SDF, SDF_PHL, TRAIL } from './liveTrip'
import { MINUTE, START } from './madeUpFlights'

const IN_THE_AIR = START + 59 * MINUTE
const ESTIMATED = START + 75 * MINUTE

describe('the trip map with a real plane (Stage 3 spec §5.4, §7.3)', () => {
  it("draws it and its ghost, and not the schedule's plane", () => {
    const d = tripMapDrawing(liveTripMap(IN_THE_AIR), IN_THE_AIR)
    expect(d.plane).toBeNull()
    expect(d.realPlane).not.toBeNull()
    expect(d.ghost).not.toBeNull()
  })

  it('marks an estimated plane as one', () => {
    expect(tripMapDrawing(liveTripMap(ESTIMATED), ESTIMATED).realPlane?.isEstimated).toBe(true)
    expect(tripMapDrawing(liveTripMap(IN_THE_AIR), IN_THE_AIR).realPlane?.isEstimated).toBe(false)
  })

  it('in the replay draws the real plane alone', () => {
    const d = tripMapDrawing(liveTripMap(IN_THE_AIR), START + 30 * MINUTE, true)
    expect(d.realPlane).not.toBeNull()
    expect([d.plane, d.ghost]).toEqual([null, null])
  })

  it("draws legs that are one flight as one real plane, with no schedule's plane", () => {
    const flight = makeMapFlight(SDF_PHL.start, SDF_PHL.end, SDF, PHL, FLYING)!
    const twin = { ...SDF_PHL, id: 'f9' }
    const map = makeTripMap([SDF_PHL, twin], { isNextTrip: false, home: 'SDF', now: IN_THE_AIR, airports: LIVE_AIRPORTS, flights: new Map([['f1', flight], ['f9', flight]]) })!
    const plan = appleMapPlan(tripMapDrawing(map, IN_THE_AIR), null)
    expect(plan.marks.filter((m) => m.kind === 'realPlane')).toHaveLength(1)
    expect(plan.marks.filter((m) => m.kind === 'plane')).toHaveLength(0)
  })
})

describe("Apple's map with a real plane", () => {
  it('puts the ghost under the real plane, which is faded while it is an estimate', () => {
    const kinds = (t: number) => appleMapPlan(tripMapDrawing(liveTripMap(t), t), null).marks.filter((m) => m.kind === 'ghost' || m.kind === 'realPlane')
    expect(kinds(IN_THE_AIR).map((m) => [m.id, m.faded ?? false])).toEqual([['ghost', false], ['realPlane', false]])
    expect(kinds(ESTIMATED).map((m) => [m.id, m.faded ?? false])).toEqual([['ghost', false], ['realPlane', true]])
  })

  it('turns the real plane the way it goes, a quarter more than its screen angle, as the plane icon points up', () => {
    const drawing = tripMapDrawing(liveTripMap(IN_THE_AIR), IN_THE_AIR)
    const real = appleMapPlan(drawing, null).marks.find((m) => m.kind === 'realPlane')!
    expect(real.degrees).toBeCloseTo((drawing.realPlane!.angle * 180) / Math.PI + 90, 12)
  })

  it('draws the seen path over every other line', () => {
    const lines = appleMapPlan(tripMapDrawing(liveTripMap(IN_THE_AIR), IN_THE_AIR), null).lines.map((l) => l.style)
    expect(lines).toEqual(['unseen', 'upcoming', 'seen', 'seen'])
  })
})

describe("a route's line", () => {
  const ONE_DEGREE = (EARTH_RADIUS_M * Math.PI) / 180

  it('of two places is 101 places along their great circle, as before', () => {
    expect(routePoints({ id: 'a', points: [SDF, PHL], style: 'upcoming', geodesic: true })).toEqual(pointsAlong(SDF, PHL, 101))
    expect(routePoints({ id: 'b', points: [SDF, PHL], style: 'drive', geodesic: false })).toEqual([SDF, PHL])
  })

  it('of a real path passes every place, in steps of a degree at most', () => {
    const places = [SDF, ...TRAIL.map((p) => p.place), PHL]
    const line = routePoints({ id: 'c', points: places, style: 'seen', geodesic: true })
    // Each join's places are worked out along its great circle, so its last can be a rounding error off the place seen.
    for (const place of places) expect(line.some((p) => Math.abs(p.lat - place.lat) < 1e-9 && Math.abs(p.lng - place.lng) < 1e-9)).toBe(true)
    for (let i = 1; i < line.length; i++) expect(distanceMeters(line[i - 1], line[i])).toBeLessThanOrEqual(ONE_DEGREE + 1e-6)
    expect(line[0]).toEqual(SDF)
  })
})
```

**Create `tests/ui/liveMapViews.test.tsx`:**

```tsx
// @vitest-environment happy-dom
import { cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { AppleTripMap } from '../../src/ui/AppleTripMap'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { TripMapSvg } from '../../src/ui/TripMapSvg'
import { fakeMapKit } from '../fixtures/fakeMapKit'
import { liveTripMap } from '../map/liveTrip'
import { MINUTE, START } from '../map/madeUpFlights'

afterEach(() => {
  cleanup()
  resetAppleMapKit()
})

const IN_THE_AIR = START + 59 * MINUTE
const ESTIMATED = START + 75 * MINUTE

const svgAt = (t: number, isReplay = false) => {
  const map = liveTripMap(t)
  return render(<TripMapSvg map={map} t={t} width={390} height={300} focus={map.legs[0]} land={null} nightStep={60_000} isReplay={isReplay} />).container
}

describe('the SVG map with a real plane (Stage 3 spec §5.4, §6.2)', () => {
  it('draws the real plane in its circle over the ghost, and no schedule’s plane', () => {
    const svg = svgAt(IN_THE_AIR)
    const planes = [...svg.querySelectorAll('.trip-map-ghost, .trip-map-real-plane')].map((g) => g.getAttribute('class'))
    expect(planes).toEqual(['trip-map-ghost', 'trip-map-real-plane'])
    expect(svg.querySelector('.trip-map-plane')).toBeNull()
  })

  it('fades the real plane while it’s an estimate', () => {
    expect(svgAt(ESTIMATED).querySelector('.trip-map-real-plane')?.getAttribute('class')).toBe('trip-map-real-plane estimated')
  })

  it('draws the path seen, unseen and ahead, with the seen path over the rest', () => {
    const routes = [...svgAt(IN_THE_AIR).querySelectorAll('.trip-map-route')].map((p) => p.getAttribute('class'))
    expect(routes).toEqual(['trip-map-route unseen', 'trip-map-route upcoming', 'trip-map-route seen', 'trip-map-route seen'])
  })

  it('in the replay draws the real plane alone', () => {
    const svg = svgAt(START + 30 * MINUTE, true)
    expect(svg.querySelector('.trip-map-real-plane')).not.toBeNull()
    expect(svg.querySelector('.trip-map-ghost')).toBeNull()
  })
})

describe('Apple’s map with a real plane', () => {
  async function shown(t: number, isReplay = false) {
    const kit = fakeMapKit()
    startAppleMapKit(async () => kit as unknown as MapKitApi)
    const map = liveTripMap(IN_THE_AIR)
    const view = render(<AppleTripMap map={map} t={t} width={390} height={300} focus={map.legs[0]} land={null} nightStep={60_000} mapStyle="standard" interactive={false} isReplay={isReplay} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    return { kit, view, map }
  }
  const classes = (kit: ReturnType<typeof fakeMapKit>) => kit.maps[0].annotations.map((a) => a.element.className).filter((c) => /realPlane|ghost/.test(c))

  it('marks the real plane and its ghost, and fades the real plane while it’s an estimate', async () => {
    const { kit, view, map } = await shown(IN_THE_AIR)
    expect(classes(kit)).toEqual(['apple-mark ghost', 'apple-mark realPlane'])
    view.rerender(<AppleTripMap map={map} t={ESTIMATED} width={390} height={300} focus={map.legs[0]} land={null} nightStep={60_000} mapStyle="standard" interactive={false} />)
    expect(classes(kit)).toEqual(['apple-mark ghost', 'apple-mark realPlane estimated'])
  })

  it('in the replay shows the real plane alone', async () => {
    const { kit } = await shown(START + 30 * MINUTE, true)
    expect(classes(kit)).toEqual(['apple-mark realPlane'])
  })

  it('keeps the real plane over its ghost, and the seen path over the other lines, when the replay goes back to now', async () => {
    const { kit, view, map } = await shown(START + 30 * MINUTE, true)
    view.rerender(<AppleTripMap map={map} t={ESTIMATED} width={390} height={300} focus={map.legs[0]} land={null} nightStep={60_000} mapStyle="standard" interactive={false} />)
    // MapKit stacks a later annotation and overlay over the ones added before them.
    expect(classes(kit)).toEqual(['apple-mark ghost', 'apple-mark realPlane estimated'])
    const dashes = kit.maps[0].overlays.filter((o) => o instanceof kit.PolylineOverlay).map((o) => (o.style as { lineDash: number[] }).lineDash)
    expect(dashes.slice(-2)).toEqual([[], []])
    expect(dashes.slice(0, -2).every((d) => d.length > 0)).toBe(true)
  })

  it('dots the path nobody saw, and names the style on the map so the seen path takes its colour', async () => {
    const { kit, view } = await shown(IN_THE_AIR)
    const dashes = kit.maps[0].overlays.filter((o) => o instanceof kit.PolylineOverlay).map((o) => (o.style as { lineDash: number[] }).lineDash)
    expect(dashes).toContainEqual([1, 6])
    expect(view.container.querySelector('.apple-trip-map')?.className).toBe('apple-trip-map standard still')
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/map/flightDrawing.test.ts tests/map/liveMarks.test.ts tests/ui/liveMapViews.test.tsx
```

Expected: the first file fails to load (it can't find `src/map/flightDrawing`), and every test of the other two fails: no real plane or ghost is drawn, and Apple's map has no marks for them.

- [x] **Step 3: Write `flightDrawing`.**

**Create `src/map/flightDrawing.ts`:**

```ts
import { pointAtDistance, type FlightPath } from './flightPath'
import { pathHeadingAt, pathPoints, pathPointsBetween, pathRuns } from './flightPathDrawing'
import { recordDistanceAt } from './flightRecord'
import type { GeoPoint } from './greatCircle'
import { mapFlightProgress, type MapFlight } from './mapFlight'
import { headingAt, isMoving, legProgress, positionAt, type MapLeg } from './tripMap'

/**
 * What one flight draws at a moment (Stage 3 spec §5.1, §5.4, §6.2, §7.3), as the app's FlightDrawing, chosen by the
 * real plane's phase:
 *
 * | The flight is | Lines | Planes |
 * |---|---|---|
 * | past its gate | one grey line along its path, real or not | none |
 * | still to leave its gate | dashed along its path | none |
 * | between its gates, not live | as before: the great circle, flown and ahead | the schedule's |
 * | on the ground at the departure airport | the whole path dashed | the real plane at its fix, and the ghost |
 * | in the air | solid where it was seen, dotted where it wasn't, dashed ahead | the real plane at its fix, and the ghost |
 * | estimated | the same, with the plan's line dotted from its last fix to it | the real plane faded, and the ghost |
 * | landed | the whole path flown | the real plane at the arrival airport |
 * | on the ground somewhere else | flown as far as it was seen, dashed from there | the real plane where it is |
 * | at a moment of the replay, with a record | flown as far as the record has it, dashed from there | the real plane alone |
 */

/**
 * - upcoming: still to fly, dashed;
 * - flying: flown so far on the leg in the air, by the schedule's plane, solid;
 * - flown: a flight earlier in the trip, grey;
 * - drive: dotted;
 * - seen: a real path flown, where the plane was seen, solid;
 * - unseen: a real path flown where nobody saw the plane, or the plan's line behind a plane only estimated to have flown it, dotted.
 */
export type SegmentStyle = 'upcoming' | 'flying' | 'flown' | 'drive' | 'seen' | 'unseen'

export interface RouteSegment {
  id: string
  /**
   * The places the line passes, at least two. A dashed or dotted line's pattern starts at its first place, on the SVG
   * map and on Apple's, so a real path's line whose one end moves is written from the end that stays still, and its
   * dashes don't crawl as the plane moves: a dotted line from the place the plane was last seen, and the line ahead from
   * the arrival airport back to the plane. (The app writes them the other way round: MapKit on iOS lays the pattern from
   * a line's last place.)
   */
  points: GeoPoint[]
  style: SegmentStyle
  /** Flights follow great circles between their places; drives are short enough to draw straight. */
  geodesic: boolean
}

/** A plane: where, and its angle in radians (0 east, clockwise). */
export interface PlaneMark {
  place: GeoPoint
  angle: number
}

/** The real plane, faded while it's an estimate (spec §5.4). */
export interface RealPlaneMark extends PlaneMark {
  isEstimated: boolean
}

export interface FlightDrawing {
  segments: RouteSegment[]
  /** The schedule's plane, alone: the flight has no real plane at this moment. */
  plane: PlaneMark | null
  realPlane: RealPlaneMark | null
  /** Where an on-schedule plane would be, beside the real one. Now only: a replay has none. */
  ghost: PlaneMark | null
}

const NO_PLANES = { plane: null, realPlane: null, ghost: null }

/**
 * `leg`, a flight, at `t`: now by this browser's clock, or a moment of the replay when `isReplay`, when the real plane
 * flies its record, alone.
 */
export function flightDrawing(leg: MapLeg, t: number, isReplay: boolean): FlightDrawing {
  const path = leg.flight?.path
  const whole = path ? pathPoints(path) : [leg.origin.place, leg.destination.place]
  if (t >= leg.end) return { segments: [{ id: `${leg.id}-flown`, points: whole, style: 'flown', geodesic: true }], ...NO_PLANES }
  if (!isMoving(leg, t)) return { segments: [{ id: `${leg.id}-upcoming`, points: whole, style: 'upcoming', geodesic: true }], ...NO_PLANES }
  const sighting = leg.flight ? sightingOf(leg.flight, t, isReplay) : null
  if (path && sighting) {
    return { segments: pathSegments(leg.id, path, sighting.distance), plane: null, realPlane: sighting.plane, ghost: sighting.ghost }
  }
  // The schedule's plane on the great circle, as before Stage 3.
  const fraction = legProgress(leg, t)
  const here = positionAt(leg, fraction)
  const segments: RouteSegment[] = []
  if (fraction > 0) segments.push({ id: `${leg.id}-flying`, points: [leg.origin.place, here], style: 'flying', geodesic: true })
  if (fraction < 1) segments.push({ id: `${leg.id}-upcoming`, points: [here, leg.destination.place], style: 'upcoming', geodesic: true })
  return { segments, plane: { place: here, angle: headingAt(leg, t) ?? 0 }, realPlane: null, ghost: null }
}

/** The real plane of a flight between its gates: how far along the path the lines turn from flown to still to come, and its planes. */
interface Sighting {
  distance: number
  plane: RealPlaneMark
  ghost: PlaneMark | null
}

/** The real plane at `t`, or null when the schedule's plane shows instead: the flight isn't live now, or has no record to replay. */
function sightingOf(flight: MapFlight, t: number, isReplay: boolean): Sighting | null {
  const path = flight.path
  if (isReplay) {
    if (!flight.record) return null
    const distance = recordDistanceAt(flight.record, t)
    // Past the last place it was seen, the record flies the plan: an estimate, drawn as one.
    const isEstimated = !path.hasLanded && distance > path.flownLength
    return { distance, plane: { place: pointAtDistance(path, distance), angle: pathHeadingAt(path, distance) ?? 0, isEstimated }, ghost: null }
  }
  const progress = mapFlightProgress(flight, t)
  if (!progress.plane) return null
  // A plane on the ground somewhere else isn't on the path: the lines stay as it was last seen flying them.
  const distance = progress.planeDistance ?? path.flownLength
  // In the air the plane points the way it's really going, and otherwise along its path.
  const track = progress.phase === 'inAir' ? flight.live?.fix?.trackDeg ?? null : null
  const angle = track != null ? ((track - 90) * Math.PI) / 180 : pathHeadingAt(path, distance) ?? 0
  const ghost = progress.ghostDistance == null ? null
    : { place: pointAtDistance(path, progress.ghostDistance), angle: pathHeadingAt(path, progress.ghostDistance) ?? 0 }
  return { distance, plane: { place: progress.plane, angle, isEstimated: progress.phase === 'estimated' }, ghost }
}

/**
 * The path's lines with the plane `distance` meters along it (spec §6.2). Behind the plane the path is flown: solid where
 * the plane was seen, and dotted where nobody saw it, which is also the plan's line behind a plane that's only estimated
 * to have flown it. Ahead of the plane it's still to come. Two runs drawn the same way are one line, so its dots don't
 * start again where they meet.
 */
function pathSegments(legId: string, path: FlightPath, distance: number): RouteSegment[] {
  const segments: RouteSegment[] = []
  for (const run of pathRuns(path, 0, distance)) {
    const style = run.kind === 'seen' ? 'seen' : 'unseen'
    const last = segments[segments.length - 1]
    if (last?.style === style) last.points.push(...run.points.slice(1))
    else segments.push({ id: `${legId}-${style}-${segments.length}`, points: [...run.points], style, geodesic: true })
  }
  // Written from the airport back to the plane, which moves.
  const ahead = pathPointsBetween(path, distance, path.length).reverse()
  if (ahead.length > 0) segments.push({ id: `${legId}-upcoming`, points: ahead, style: 'upcoming', geodesic: true })
  return segments
}
```

- [x] **Step 4: Have `tripMapDrawing` use it.** A flight with no live data draws the same lines as before, now as their places: `routePoints` gives a line of two places its 101, as before.

**In `src/map/tripMapDrawing.ts`, replace (1 of 4):**

```ts
import type { GeoPoint } from './greatCircle'
import { activityAt, isGroundKind, type GroundActivity } from './tripActivity'
import { headingAt, isMoving, legProgress, positionAt, type AirportMark, type TripMap } from './tripMap'

/** Everything the trip map draws at one instant (moving map spec §7.1, §7.2), worked out here so the SVG only renders it. */

/** Still to fly (dashed), flown so far on the leg in the air (solid), flown earlier (grey), or a drive (dotted). */
export type SegmentStyle = 'upcoming' | 'flying' | 'flown' | 'drive'

export interface RouteSegment {
  id: string
  from: GeoPoint
  to: GeoPoint
  style: SegmentStyle
  /** Flights follow the great circle; drives are short enough to draw straight. */
  geodesic: boolean
}

```

**with:**

```ts
import { flightDrawing, type PlaneMark, type RealPlaneMark, type RouteSegment } from './flightDrawing'
import { distanceMeters, EARTH_RADIUS_M, pointsAlong, type GeoPoint } from './greatCircle'
import { activityAt, isGroundKind, type GroundActivity } from './tripActivity'
import { isMoving, legProgress, positionAt, type AirportMark, type TripMap } from './tripMap'

export type { PlaneMark, RealPlaneMark, RouteSegment, SegmentStyle } from './flightDrawing'

/** Everything the trip map draws at one instant (moving map spec §7.1, §7.2), worked out here so the SVG only renders it. */

```

**In `src/map/tripMapDrawing.ts`, replace (2 of 4):**

```ts
  /** The schedule's plane: where, and its angle in radians (0 east, clockwise). */
  plane: { place: GeoPoint; angle: number } | null
  /** The pilot's marker: what they're doing and where, while nothing moves (activity markers design §2). */
```

**with:**

```ts
  /** The schedule's plane: where, and its angle in radians (0 east, clockwise). */
  plane: PlaneMark | null
  /** The real plane, of a flight Crewlu Cloud has seen (Stage 3 spec §5.4). */
  realPlane: RealPlaneMark | null
  /** Where an on-schedule plane would be, beside the real one. */
  ghost: PlaneMark | null
  /** The pilot's marker: what they're doing and where, while nothing moves (activity markers design §2). */
```

**In `src/map/tripMapDrawing.ts`, replace (3 of 4):**

```ts

export function tripMapDrawing(map: TripMap, t: number): TripMapDrawing {
  const segments: RouteSegment[] = []
  const cars: TripMapDrawing['cars'] = []
  let plane: TripMapDrawing['plane'] = null
  for (const leg of map.legs) {
    const from = leg.origin.place
    const to = leg.destination.place
    if (leg.kind === 'drive') {
      segments.push({ id: `${leg.id}-drive`, from, to, style: 'drive', geodesic: false })
      if (isMoving(leg, t)) cars.push({ id: `${leg.id}-car`, place: positionAt(leg, legProgress(leg, t)) })
    } else if (t >= leg.end) {
      segments.push({ id: `${leg.id}-flown`, from, to, style: 'flown', geodesic: true })
    } else if (isMoving(leg, t)) {
      const fraction = legProgress(leg, t)
      const here = positionAt(leg, fraction)
      if (fraction > 0) segments.push({ id: `${leg.id}-flying`, from, to: here, style: 'flying', geodesic: true })
      if (fraction < 1) segments.push({ id: `${leg.id}-upcoming`, from: here, to, style: 'upcoming', geodesic: true })
      plane = { place: here, angle: headingAt(leg, t) ?? 0 }
    } else {
      segments.push({ id: `${leg.id}-upcoming`, from, to, style: 'upcoming', geodesic: true })
    }
```

**with:**

```ts

/**
 * The trip at `t`: now, or a moment of the replay when `isReplay`, when a flight with a record shows its real plane alone
 * (Stage 3 spec §7.3).
 */
export function tripMapDrawing(map: TripMap, t: number, isReplay = false): TripMapDrawing {
  const segments: RouteSegment[] = []
  const cars: TripMapDrawing['cars'] = []
  let plane: PlaneMark | null = null
  let realPlane: RealPlaneMark | null = null
  let ghost: PlaneMark | null = null
  for (const leg of map.legs) {
    if (leg.kind === 'drive') {
      segments.push({ id: `${leg.id}-drive`, points: [leg.origin.place, leg.destination.place], style: 'drive', geodesic: false })
      if (isMoving(leg, t)) cars.push({ id: `${leg.id}-car`, place: positionAt(leg, legProgress(leg, t)) })
    } else {
      const flight = flightDrawing(leg, t, isReplay)
      segments.push(...flight.segments)
      plane = flight.plane ?? plane
      realPlane = flight.realPlane ?? realPlane
      ghost = flight.ghost ?? ghost
    }
```

**In `src/map/tripMapDrawing.ts`, replace (4 of 4):**

```ts
  const pilot = activity && isGroundKind(activity.kind) ? { kind: activity.kind, place: activity.place } : null
  return { segments, airports, cars, plane, pilot }
}
```

**with:**

```ts
  const pilot = activity && isGroundKind(activity.kind) ? { kind: activity.kind, place: activity.place } : null
  return { segments, airports, cars, plane, realPlane, ghost, pilot }
}

/** About a degree of arc, in meters: the longest step of a real path's line (Stage 3 spec §13). */
const STEP_M = (EARTH_RADIUS_M * Math.PI) / 180

/**
 * A route's line as places to join straight. A drive's are its own. A flight's follow great circles: a line of two
 * places in 101 steps, as before, and a longer one, a real path, with each of its joins in steps of a degree at most.
 */
export function routePoints(segment: RouteSegment): GeoPoint[] {
  const { points } = segment
  if (!segment.geodesic) return points
  if (points.length === 2) return pointsAlong(points[0], points[1], 101)
  const line = points.slice(0, 1)
  for (let i = 1; i < points.length; i++) {
    line.push(...pointsAlong(points[i - 1], points[i], Math.ceil(distanceMeters(points[i - 1], points[i]) / STEP_M) + 1).slice(1))
  }
  return line
}
```

- [x] **Step 5: Plan the two planes on Apple's map.**

**In `src/map/appleMapPlan.ts`, replace (1 of 5):**

```ts
import { pointsAlong, type GeoPoint } from './greatCircle'
import { fitClear, fitRect, MIN_CLEAR_PX, NO_INSETS, slideToShow, type Insets, type WorldRect } from './mapFit'
```

**with:**

```ts
import type { GeoPoint } from './greatCircle'
import { fitClear, fitRect, MIN_CLEAR_PX, NO_INSETS, slideToShow, type Insets, type WorldRect } from './mapFit'
```

**In `src/map/appleMapPlan.ts`, replace (2 of 5):**

```ts
import type { MapLeg } from './tripMap'
import { PILOT_RADIUS, type SegmentStyle, type TripMapDrawing } from './tripMapDrawing'

```

**with:**

```ts
import type { MapLeg } from './tripMap'
import { PILOT_RADIUS, routePoints, type SegmentStyle, type TripMapDrawing } from './tripMapDrawing'

```

**In `src/map/appleMapPlan.ts`, replace (3 of 5):**

```ts

export type MarkKind = 'airport' | 'car' | 'pilot' | 'plane'

```

**with:**

```ts

export type MarkKind = 'airport' | 'car' | 'pilot' | 'plane' | 'realPlane' | 'ghost'

```

**In `src/map/appleMapPlan.ts`, replace (4 of 5):**

```ts
  priority: 'lowest' | 'low' | 'high' | 'required'
}
```

**with:**

```ts
  priority: 'lowest' | 'low' | 'high' | 'required'
  /** The real plane while it's an estimate, shown faded (Stage 3 spec §5.4). */
  faded?: boolean
}
```

**In `src/map/appleMapPlan.ts`, replace (5 of 5):**

```ts
  // The plane icon points up, so it turns a quarter more than the route's screen angle, as on the SVG map.
  if (drawing.plane) {
    marks.push({ ...shown, id: 'plane', kind: 'plane', place: drawing.plane.place, degrees: (drawing.plane.angle * 180) / Math.PI + 90 })
  }
  return {
    lines: drawing.segments.map((s) => ({ id: s.id, style: s.style, points: laidOut(s.geodesic ? pointsAlong(s.from, s.to, 101) : [s.from, s.to]) })),
    marks,
  }
}
```

**with:**

```ts
  // The plane icon points up, so it turns a quarter more than the route's screen angle, as on the SVG map.
  const degrees = (angle: number) => (angle * 180) / Math.PI + 90
  if (drawing.plane) marks.push({ ...shown, id: 'plane', kind: 'plane', place: drawing.plane.place, degrees: degrees(drawing.plane.angle) })
  // The ghost goes just under the real plane, which is on top (Stage 3 spec §5.4): MapKit stacks later marks higher.
  if (drawing.ghost) marks.push({ ...shown, id: 'ghost', kind: 'ghost', place: drawing.ghost.place, degrees: degrees(drawing.ghost.angle) })
  if (drawing.realPlane) {
    const { place, angle, isEstimated } = drawing.realPlane
    marks.push({ ...shown, id: 'realPlane', kind: 'realPlane', place, degrees: degrees(angle), faded: isEstimated })
  }
  // The real path where the plane was seen goes over every other line.
  const lines = [...drawing.segments.filter((s) => s.style !== 'seen'), ...drawing.segments.filter((s) => s.style === 'seen')]
  return { lines: lines.map((s) => ({ id: s.id, style: s.style, points: laidOut(routePoints(s)) })), marks }
}
```

**In `src/ui/appleMarks.ts`, replace (1 of 5):**

```ts

const ICONS: Record<'plane' | 'car', { name: IconName; size: number }> = {
  plane: { name: 'Airplane', size: 22 },
  car: { name: 'Car', size: 16 },
}

```

**with:**

```ts

const ICONS: Record<'plane' | 'car' | 'realPlane' | 'ghost', { name: IconName; size: number }> = {
  plane: { name: 'Airplane', size: 22 },
  car: { name: 'Car', size: 16 },
  // The real plane and its ghost: a plane in a circle, one size (Stage 3 spec §5.4).
  realPlane: { name: 'Airplane', size: 14 },
  ghost: { name: 'Airplane', size: 14 },
}

/** What a mark that doesn't fade does with its fading. */
const NEVER_FADES = () => {}

```

**In `src/ui/appleMarks.ts`, replace (2 of 5):**

```ts
 * The element for a mark on Apple's map (Apple Maps spec §8), styled by tripMap.css as on the SVG map: an airport's dot
 * and code, the plane, a car, or the pilot's marker, a white icon on the colour of what they're doing (activity markers
 * design §2). `turn` sets the mark's turn later, for the plane.
 */
export function markElement(kind: MarkKind, label: string | null, activity: GroundKind | null = null): { element: HTMLElement; turn: (degrees: number) => void } {
  const element = document.createElement('div')
```

**with:**

```ts
 * The element for a mark on Apple's map (Apple Maps spec §8), styled by tripMap.css as on the SVG map: an airport's dot
 * and code, the plane, a car, the pilot's marker, a white icon on the colour of what they're doing (activity markers
 * design §2), or the real plane and its ghost (Stage 3 spec §5.4). `turn` sets the mark's turn later, for a plane, and
 * `fade` fades the real plane while it's an estimate.
 */
export function markElement(
  kind: MarkKind, label: string | null, activity: GroundKind | null = null,
): { element: HTMLElement; turn: (degrees: number) => void; fade: (faded: boolean) => void } {
  const element = document.createElement('div')
```

**In `src/ui/appleMarks.ts`, replace (3 of 5):**

```ts
    element.appendChild(icon(PILOT_ICONS[doing], 13))
    return { element, turn: () => {} }
  }
```

**with:**

```ts
    element.appendChild(icon(PILOT_ICONS[doing], 13))
    return { element, turn: () => {}, fade: NEVER_FADES }
  }
```

**In `src/ui/appleMarks.ts`, replace (4 of 5):**

```ts
    element.append(dot, code)
    return { element, turn: () => {} }
  }
```

**with:**

```ts
    element.append(dot, code)
    return { element, turn: () => {}, fade: NEVER_FADES }
  }
```

**In `src/ui/appleMarks.ts`, replace (5 of 5):**

```ts
  element.appendChild(svg)
  return { element, turn: (degrees) => svg.style.setProperty('transform', `rotate(${degrees}deg)`) }
}
```

**with:**

```ts
  element.appendChild(svg)
  const fade = kind === 'realPlane' ? (faded: boolean) => element.classList.toggle('estimated', faded) : NEVER_FADES
  return { element, turn: (degrees) => svg.style.setProperty('transform', `rotate(${degrees}deg)`), fade }
}
```

- [x] **Step 6: Draw them.** Apple's map takes the new line styles, fades the real plane, keeps the order the plan gives its marks and lines (`restack`), and names its style on its element so the seen path takes its colour. The site's own map draws the same.

**In `src/ui/AppleTripMap.tsx`, replace (1 of 14):**

```tsx
/** Each route style's look, as on the SVG map: colours come from the page's CSS, so dark mode follows. */
const LINES: Record<SegmentStyle, { color: '--trip-route' | '--trip-flown'; width: number; dash: number[] }> = {
  upcoming: { color: '--trip-route', width: 2, dash: [6, 6] },
```

**with:**

```tsx
/** Each route style's look, as on the SVG map: colours come from the page's CSS, so dark mode follows. */
const LINES: Record<SegmentStyle, { color: '--trip-route' | '--trip-flown' | '--trip-seen'; width: number; dash: number[] }> = {
  upcoming: { color: '--trip-route', width: 2, dash: [6, 6] },
```

**In `src/ui/AppleTripMap.tsx`, replace (2 of 14):**

```tsx
  drive: { color: '--trip-flown', width: 3, dash: [1, 6] },
}
```

**with:**

```tsx
  drive: { color: '--trip-flown', width: 3, dash: [1, 6] },
  seen: { color: '--trip-seen', width: 3, dash: [] },
  unseen: { color: '--trip-seen', width: 2.5, dash: [1, 6] },
}
```

**In `src/ui/AppleTripMap.tsx`, replace (3 of 14):**

```tsx
const PRIORITY: Record<PlannedMark['priority'], number> = { lowest: 100, low: 250, high: 750, required: 1000 }

```

**with:**

```tsx
const PRIORITY: Record<PlannedMark['priority'], number> = { lowest: 100, low: 250, high: 750, required: 1000 }

/**
 * MapKit stacks each line and mark over the ones added before it, and keeps one where it is when it's moved. So when
 * one is made, every one the plan puts after it is added again, in the plan's order: the real plane stays over its
 * ghost when the ghost comes back after a replay, and the seen path over a line made later (Stage 3 spec §5.4, §6.2).
 */
function restack(order: string[], made: Set<string>, addAgain: (id: string) => void) {
  const after = order.slice(order.findIndex((id) => made.has(id)) + 1)
  // Nothing made, or nothing kept after what was: all is in order already, as on the first draw.
  if (made.size === 0 || after.every((id) => made.has(id))) return
  for (const id of after) addAgain(id)
}

```

**In `src/ui/AppleTripMap.tsx`, replace (4 of 14):**

```tsx
  nightAt: number
  marks: Map<string, { annotation: MkAnnotation; turn: (degrees: number) => void; priority: PlannedMark['priority'] }>
  framed: string
```

**with:**

```tsx
  nightAt: number
  marks: Map<string, { annotation: MkAnnotation; turn: (degrees: number) => void; fade: (faded: boolean) => void; priority: PlannedMark['priority'] }>
  framed: string
```

**In `src/ui/AppleTripMap.tsx`, replace (5 of 14):**

```tsx

function AppleMapView({ mapkit, map, t, width, height, focus, nightStep, insets = NO_INSETS, mapStyle, interactive, recenter = 0, onUserMove }: AppleTripMapProps & { mapkit: MapKitApi }) {
  const box = useRef<HTMLDivElement>(null)
```

**with:**

```tsx

function AppleMapView({
  mapkit, map, t, width, height, focus, nightStep, insets = NO_INSETS, mapStyle, interactive, recenter = 0, onUserMove, isReplay = false,
}: AppleTripMapProps & { mapkit: MapKitApi }) {
  const box = useRef<HTMLDivElement>(null)
```

**In `src/ui/AppleTripMap.tsx`, replace (6 of 14):**

```tsx
  useEffect(() => {
    if (live.current) live.current.map.mapType = types[mapStyle]
  }, [mapStyle])

  const drawing = tripMapDrawing(map, t)

```

**with:**

```tsx
  useEffect(() => {
    const state = live.current
    if (!state) return
    state.map.mapType = types[mapStyle]
    // The real path's colour follows the style (tripMap.css): restyle the lines.
    for (const kept of state.lines.values()) kept.key = ''
    repaint((n) => n + 1)
  }, [mapStyle])

  const drawing = tripMapDrawing(map, t, isReplay)

```

**In `src/ui/AppleTripMap.tsx`, replace (7 of 14):**

```tsx
    const seen = new Set<string>()
    for (const line of plan.lines) {
```

**with:**

```tsx
    const seen = new Set<string>()
    const madeLines = new Set<string>()
    for (const line of plan.lines) {
```

**In `src/ui/AppleTripMap.tsx`, replace (8 of 14):**

```tsx
        state.lines.set(line.id, { overlay, key })
      } else if (kept.key !== key) {
```

**with:**

```tsx
        state.lines.set(line.id, { overlay, key })
        madeLines.add(line.id)
      } else if (kept.key !== key) {
```

**In `src/ui/AppleTripMap.tsx`, replace (9 of 14):**

```tsx
    }
    for (const [id, kept] of state.lines) {
```

**with:**

```tsx
    }
    restack(plan.lines.map((l) => l.id), madeLines, (id) => {
      const { overlay } = state.lines.get(id)!
      state.map.removeOverlay(overlay)
      state.map.addOverlay(overlay)
    })
    for (const [id, kept] of state.lines) {
```

**In `src/ui/AppleTripMap.tsx`, replace (10 of 14):**

```tsx
    const marked = new Set<string>()
    for (const mark of plan.marks) {
```

**with:**

```tsx
    const marked = new Set<string>()
    const madeMarks = new Set<string>()
    for (const mark of plan.marks) {
```

**In `src/ui/AppleTripMap.tsx`, replace (11 of 14):**

```tsx
      if (!kept) {
        const { element, turn } = markElement(mark.kind, mark.label, mark.activity)
        // Airports give way to each other where they crowd. The pilot's marker, the plane and a car sit on top of an
```

**with:**

```tsx
      if (!kept) {
        const { element, turn, fade } = markElement(mark.kind, mark.label, mark.activity)
        // Airports give way to each other where they crowd. The pilot's marker, the plane and a car sit on top of an
```

**In `src/ui/AppleTripMap.tsx`, replace (12 of 14):**

```tsx
        state.map.addAnnotation(annotation)
        kept = { annotation, turn, priority: mark.priority }
        state.marks.set(mark.id, kept)
      } else {
```

**with:**

```tsx
        state.map.addAnnotation(annotation)
        kept = { annotation, turn, fade, priority: mark.priority }
        state.marks.set(mark.id, kept)
        madeMarks.add(mark.id)
      } else {
```

**In `src/ui/AppleTripMap.tsx`, replace (13 of 14):**

```tsx
      kept.turn(mark.degrees)
    }
    for (const [id, kept] of state.marks) {
```

**with:**

```tsx
      kept.turn(mark.degrees)
      kept.fade(mark.faded ?? false)
    }
    restack(plan.marks.map((m) => m.id), madeMarks, (id) => {
      const { annotation } = state.marks.get(id)!
      state.map.removeAnnotation(annotation)
      state.map.addAnnotation(annotation)
    })
    for (const [id, kept] of state.marks) {
```

**In `src/ui/AppleTripMap.tsx`, replace (14 of 14):**

```tsx
  // Apple's Legal link isn't a link inside a button. The full map's controls and Legal link stay reachable.
  return <div ref={box} class={`apple-trip-map${interactive ? '' : ' still'}`} {...(interactive ? {} : { 'aria-hidden': 'true', inert: true })} />
}
```

**with:**

```tsx
  // Apple's Legal link isn't a link inside a button. The full map's controls and Legal link stay reachable.
  return <div ref={box} class={`apple-trip-map ${mapStyle}${interactive ? '' : ' still'}`} {...(interactive ? {} : { 'aria-hidden': 'true', inert: true })} />
}
```

**In `src/ui/TripMapSvg.tsx`, replace (1 of 7):**

```tsx
import { useMemo } from 'preact/hooks'
import { ICON_PATHS, type IconName } from '../icons/iconPaths'
import { pointsAlong, type GeoPoint } from '../map/greatCircle'
import { fitClear, fitRect, NO_INSETS, slideToShow, type Insets } from '../map/mapFit'
import { LAYER_ALPHA, nightLayers } from '../map/nightShade'
```

**with:**

```tsx
import { useMemo } from 'preact/hooks'
import { ICON_PATHS, type IconName } from '../icons/iconPaths'
import type { GeoPoint } from '../map/greatCircle'
import { fitClear, fitRect, NO_INSETS, slideToShow, type Insets } from '../map/mapFit'
import { LAYER_ALPHA, nightLayers } from '../map/nightShade'
```

**In `src/ui/TripMapSvg.tsx`, replace (2 of 7):**

```tsx
import type { GroundKind } from '../map/tripActivity'
import { framingPoints, type MapLeg, type TripMap } from '../map/tripMap'
import { nightTime, PILOT_RADIUS, tripMapDrawing } from '../map/tripMapDrawing'

export interface TripMapSvgProps {
```

**with:**

```tsx
import type { GroundKind } from '../map/tripActivity'
import { framingPoints, type MapLeg, type TripMap } from '../map/tripMap'
import { nightTime, PILOT_RADIUS, routePoints, tripMapDrawing, type PlaneMark } from '../map/tripMapDrawing'

export interface TripMapSvgProps {
```

**In `src/ui/TripMapSvg.tsx`, replace (3 of 7):**

```tsx
   */
  insets?: Insets
}

```

**with:**

```tsx
   */
  insets?: Insets
  /** `t` is a moment of the replay, not now: a flight with a record shows its real plane alone (Stage 3 spec §7.3). */
  isReplay?: boolean
}

```

**In `src/ui/TripMapSvg.tsx`, replace (4 of 7):**

```tsx
}

/**
 * The trip map (moving map spec §7.1, §11): ocean, land, night, routes, airports, cars, the pilot's marker and the plane,
 * drawn by the site in SVG. The card and the full map describe it in words, so to screen readers it's hidden.
 */
export function TripMapSvg({ map, t, width, height, focus, land, nightStep, insets = NO_INSETS }: TripMapSvgProps) {
  const { top, right, bottom, left } = insets
  const framed = useMemo(
```

**with:**

```tsx
}

/** The real plane and its ghost (Stage 3 spec §5.4): a plane in a circle, the pilot's marker's size. */
function PlaneBadge({ plane, at, class: cls }: { plane: PlaneMark; at: { x: number; y: number }; class: string }) {
  return (
    <g class={cls}>
      <circle cx={at.x} cy={at.y} r={PILOT_RADIUS} />
      {/* The site's plane icon points up, so it turns a quarter more than the screen angle. */}
      <Mark name="Airplane" at={at} size={14} degrees={(plane.angle * 180) / Math.PI + 90} class="trip-map-badge-icon" />
    </g>
  )
}

/**
 * The trip map (moving map spec §7.1, §11): ocean, land, night, routes, airports, cars, the pilot's marker and the plane,
 * drawn by the site in SVG. The card and the full map describe it in words, so to screen readers it's hidden.
 */
export function TripMapSvg({ map, t, width, height, focus, land, nightStep, insets = NO_INSETS, isReplay = false }: TripMapSvgProps) {
  const { top, right, bottom, left } = insets
  const framed = useMemo(
```

**In `src/ui/TripMapSvg.tsx`, replace (5 of 7):**

```tsx
    [map, focus, width, height, top, right, bottom, left],
  )
  const drawing = tripMapDrawing(map, t)
  // The trip is framed in the clear part when there's room. Then, if the pilot's marker still lies outside it (the
  // card's chips at large text sizes), the view slides the shortest way that shows it (the app's card framing §4.2).
```

**with:**

```tsx
    [map, focus, width, height, top, right, bottom, left],
  )
  const drawing = tripMapDrawing(map, t, isReplay)
  // The real path where the plane was seen goes over every other line.
  const segments = [...drawing.segments.filter((s) => s.style !== 'seen'), ...drawing.segments.filter((s) => s.style === 'seen')]
  // The trip is framed in the clear part when there's room. Then, if the pilot's marker still lies outside it (the
  // card's chips at large text sizes), the view slides the shortest way that shows it (the app's card framing §4.2).
```

**In `src/ui/TripMapSvg.tsx`, replace (6 of 7):**

```tsx
      {landPath && <path class="trip-map-land" d={landPath} />}
      {nightPaths.map((d, i) => <path key={i} class="trip-map-night" d={d} fill-opacity={LAYER_ALPHA} />)}
      {drawing.segments.map((s) => (
        <path key={s.id} class={`trip-map-route ${s.style}`} d={linePath(s.geodesic ? pointsAlong(s.from, s.to, 101) : [s.from, s.to], view)} />
      ))}
      {airportMarks.map(({ code, at, labelled }) => (
        <g key={code} class="trip-map-airport">
```

**with:**

```tsx
      {landPath && <path class="trip-map-land" d={landPath} />}
      {nightPaths.map((d, i) => <path key={i} class="trip-map-night" d={d} fill-opacity={LAYER_ALPHA} />)}
      {segments.map((s) => <path key={s.id} class={`trip-map-route ${s.style}`} d={linePath(routePoints(s), view)} />)}
      {airportMarks.map(({ code, at, labelled }) => (
        <g key={code} class="trip-map-airport">
```

**In `src/ui/TripMapSvg.tsx`, replace (7 of 7):**

```tsx
        <Mark name="Airplane" at={placeAt(drawing.plane.place, view)} size={22} degrees={(drawing.plane.angle * 180) / Math.PI + 90} class="trip-map-plane" />
      )}
    </svg>
  )
```

**with:**

```tsx
        <Mark name="Airplane" at={placeAt(drawing.plane.place, view)} size={22} degrees={(drawing.plane.angle * 180) / Math.PI + 90} class="trip-map-plane" />
      )}
      {/* The ghost just under the real plane, which is drawn on top. */}
      {drawing.ghost && <PlaneBadge plane={drawing.ghost} at={placeAt(drawing.ghost.place, view)} class="trip-map-ghost" />}
      {drawing.realPlane && (
        <PlaneBadge plane={drawing.realPlane} at={placeAt(drawing.realPlane.place, view)}
          class={`trip-map-real-plane${drawing.realPlane.isEstimated ? ' estimated' : ''}`} />
      )}
    </svg>
  )
```

**In `src/styles/tripMap.css`, replace (1 of 4):**

```css
  --trip-text: #000000;
}
```

**with:**

```css
  --trip-text: #000000;
  /* The real path where the plane was seen, or wasn't (Stage 3 spec §6.2), and the ghost's outline: white on a dark map,
     blue on a light one, where white wouldn't show. */
  --trip-seen: var(--blue);
}
```

**In `src/styles/tripMap.css`, replace (2 of 4):**

```css
    --trip-text: #ffffff;
  }
}

```

**with:**

```css
    --trip-text: #ffffff;
    --trip-seen: #ffffff;
  }
}

/* Apple's hybrid and satellite maps are photographs, dark in either scheme. */
.apple-trip-map.hybrid,
.apple-trip-map.satellite { --trip-seen: #ffffff; }

```

**In `src/styles/tripMap.css`, replace (3 of 4):**

```css
.trip-map-route.drive { stroke: var(--trip-flown); stroke-width: 3; stroke-dasharray: 0.5 6; }
.trip-map-airport circle { fill: #ffffff; stroke: rgba(0, 0, 0, 0.4); stroke-width: 0.5; }
```

**with:**

```css
.trip-map-route.drive { stroke: var(--trip-flown); stroke-width: 3; stroke-dasharray: 0.5 6; }
.trip-map-route.seen { stroke: var(--trip-seen); stroke-width: 3; }
.trip-map-route.unseen { stroke: var(--trip-seen); stroke-width: 2.5; stroke-dasharray: 0.5 6; }
/* The real plane: a filled blue circle with a white border and a white plane, faded while it's an estimate. The ghost: a
   dashed white outline with a faint white plane (Stage 3 spec §5.4), blue on a light map. */
.trip-map-real-plane circle { fill: var(--blue); stroke: #ffffff; stroke-width: 1.5; }
.trip-map-real-plane .trip-map-badge-icon { fill: #ffffff; }
.trip-map-real-plane.estimated { opacity: 0.6; }
.trip-map-ghost circle { fill: none; stroke: var(--trip-seen); stroke-width: 1.5; stroke-dasharray: 3 3; }
.trip-map-ghost .trip-map-badge-icon { fill: var(--trip-seen); opacity: 0.4; }
.trip-map-airport circle { fill: #ffffff; stroke: rgba(0, 0, 0, 0.4); stroke-width: 0.5; }
```

**In `src/styles/tripMap.css`, replace (4 of 4):**

```css
.apple-mark.car svg { fill: var(--trip-text); }
.apple-mark-dot { width: 7px; height: 7px; border: 0.5px solid rgba(0, 0, 0, 0.4); border-radius: 50%; background: #ffffff; }
```

**with:**

```css
.apple-mark.car svg { fill: var(--trip-text); }
/* The real plane and its ghost, as on the SVG map: one size, the pilot's marker's. */
.apple-mark.realPlane,
.apple-mark.ghost {
  justify-content: center;
  box-sizing: border-box;
  width: 24px;
  height: 24px;
  border-radius: 50%;
}
.apple-mark.realPlane { border: 1.5px solid #ffffff; background: var(--blue); }
.apple-mark.realPlane svg { fill: #ffffff; }
.apple-mark.realPlane.estimated { opacity: 0.6; }
.apple-mark.ghost { border: 1.5px dashed var(--trip-seen); }
.apple-mark.ghost svg { fill: var(--trip-seen); opacity: 0.4; }
.apple-mark-dot { width: 7px; height: 7px; border: 0.5px solid rgba(0, 0, 0, 0.4); border-radius: 50%; background: #ffffff; }
```

- [x] **Step 7: Run them again.** Expected: 37 tests pass. Then `npx tsc --noEmit`: nothing, and `npx vitest run tests/map tests/ui`: every test passes, the drawing's own unchanged.

- [x] **Step 8: Commit, on Todd's yes (after batch B's checkpoint).**

```bash
git add src/map/flightDrawing.ts src/map/tripMapDrawing.ts src/map/appleMapPlan.ts src/ui/appleMarks.ts src/ui/AppleTripMap.tsx src/ui/TripMapSvg.tsx src/styles/tripMap.css tests/map/flightDrawing.test.ts tests/map/liveMarks.test.ts tests/ui/liveMapViews.test.tsx
git commit -m "The trip map draws a flight by what the live data says: the real path, solid where the plane was seen and dotted where it wasn't, the real plane and the schedule's ghost, and in a replay the real plane alone, on Apple's map and the site's own (Stage 3 spec §5.1, §5.4, §6.2, §7.3)"
```

---

### Task 6: The words

Spec §9. The label goes on the card's bar and the full map's pill. A landing time that's the real plane's estimate says "about", on the map's words, the facts' and the narrative's. The card's sentence for a screen reader says how the plane is doing. The landing countdown needs no change: it counts to the leg's end, which is already the real plane's.

**Files:**
- Modify: `src/copy/tripMap.ts`, `src/copy/facts.ts`, `src/copy/narrative.ts`, `src/facts/tripFacts.ts`
- Test: `tests/copy/liveWords.test.ts`

- [x] **Step 1: Write the tests.**

**Create `tests/copy/liveWords.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { landsText } from '../../src/copy/facts'
import { Sentence } from '../../src/copy/narrative'
import {
  flightStatus, landingCountdown, landingLine, landsAt, liveSummary, spokenLiveLabel, spokenMinutes, topPill, tripMapSummary,
} from '../../src/copy/tripMap'
import type { AirportIndex } from '../../src/data/airports'
import { makeMapFlight } from '../../src/map/mapFlight'
import { makeTripMap, type MapLeg, type TripMap } from '../../src/map/tripMap'
import { airport, at, caseFlight, LIVE_CASES } from '../map/liveCases'

const NY = 'America/New_York'

/** A shared case's flight as the map's leg at one of its moments: its real times then, with Philadelphia's or Cologne's names. */
function caseLeg(name: string, moment = 0): { leg: MapLeg; t: number } {
  const flightCase = LIVE_CASES.flights.find((f) => f.name === name)!
  const m = flightCase.moments[moment]
  const flight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), airport(flightCase.from), airport(flightCase.to), caseFlight(flightCase.flight))!
  const city = (code: string) => ({ SDF: 'Louisville', PHL: 'Philadelphia', CGN: 'Cologne', CVG: 'Cincinnati' })[code] ?? code
  const zone = (code: string) => (code === 'CGN' ? 'Europe/Berlin' : NY)
  const mark = (code: string) => ({ code, city: city(code), place: airport(code), timeZone: zone(code) })
  return {
    leg: { id: 'f1', kind: 'flight', origin: mark(flightCase.from), destination: mark(flightCase.to), start: at(m.start), end: at(m.end), flightNumber: 'UPS207', flight },
    t: at(m.at),
  }
}

/** The same leg on the schedule alone. */
const scheduleOnly = ({ flight: _, ...leg }: MapLeg): MapLeg => leg

describe("the card's bar and the full map's pill (Stage 3 spec §9)", () => {
  it("say the real plane's label", () => {
    const { leg, t } = caseLeg('ahead, in the air')
    expect(flightStatus(leg, t)).toBe('14 min ahead')
    const estimated = caseLeg('ahead, in the air', 2)
    expect(flightStatus(estimated.leg, estimated.t)).toBe('About 14 min ahead')
    const late = caseLeg('still on the ground twenty minutes after')
    expect(flightStatus(late.leg, late.t)).toBe('Still on the ground · 20 min behind')
  })

  it('say "In flight" with no label, as before, and in a replay', () => {
    const { leg, t } = caseLeg('ahead, in the air')
    expect(flightStatus(scheduleOnly(leg), t)).toBe('In flight')
    expect(flightStatus(leg, t, true)).toBe('In flight')
    const elsewhere = caseLeg('on the ground somewhere else')
    expect(flightStatus(elsewhere.leg, elsewhere.t)).toBe('In flight')
  })

  it('put the label on the pill, and "In flight" in a replay', () => {
    const { leg, t } = caseLeg('ahead, in the air')
    const airports = { get: (code: string) => ({ iata: code, lat: airport(code).lat, lng: airport(code).lng }), city: () => null, tz: () => NY } as unknown as AirportIndex
    const map = makeTripMap(
      [{ kind: 'flight', id: 'f1', tripId: 'T1', dep: 'SDF', arr: 'PHL', start: leg.start, end: leg.end, schedStart: leg.start, schedEnd: leg.end, airline: '5X', enteredAirline: null, number: '207', deadhead: false, ground: false }],
      { isNextTrip: false, home: 'SDF', now: t, airports, flights: new Map([['f1', leg.flight!]]) },
    )!
    expect(topPill(map, t, 1, 2)).toBe('UPS207 · 14 min ahead')
    expect(topPill(map, t, 1, 2, true)).toBe('UPS207 · In flight')
    expect(topPill({ ...map, legs: map.legs.map(scheduleOnly) }, t, 1, 2)).toBe('UPS207 · In flight')
  })
})

describe('"about" a landing time (Stage 3 spec §9)', () => {
  it("is said of the real plane's estimate on the bar", () => {
    const { leg } = caseLeg('ahead, in the air')
    expect(landsAt(leg, NY, false)).toBe(`Lands about ${landsAt(scheduleOnly(leg), NY, false).slice(6)}`)
    expect(landsAt(leg, NY, false)).toMatch(/^Lands about \d{1,2}:\d\d\s[AP]M$/)
  })

  it("isn't said of the schedule's time, or once the plane has landed", () => {
    const { leg } = caseLeg('ahead, in the air')
    expect(landsAt(scheduleOnly(leg), NY, false)).toMatch(/^Lands \d/)
    const landed = caseLeg('landed, seen all the way')
    expect(landsAt(landed.leg, NY, false)).toMatch(/^Lands \d/)
  })

  it('is said once on the landing line, before the time there', () => {
    const { leg } = caseLeg('behind, with a late first point and an unseen ocean')
    expect(landingLine(leg, NY, false)).toMatch(/^Lands Cologne about \d{1,2}:\d\d\s[AP]M · \d{1,2}:\d\d\s[AP]M your time$/)
  })

  it("is said in the facts' landing words", () => {
    const { leg } = caseLeg('behind, with a late first point and an unseen ocean')
    expect(landsText(leg, NY, false)).toMatch(/^lands about \d{1,2}:\d\d\s[AP]M there$/)
    expect(landsText(scheduleOnly(leg), NY, false)).toMatch(/^lands \d/)
  })

  it("is said in the narrative of the time that's the estimate, and of no other", () => {
    const ctx = { now: 0, viewerTz: NY, h24: false, airports: {} as AirportIndex, estimatedArrival: Date.UTC(2027, 0, 15, 20, 18) }
    const text = (ms: number) => new Sentence(ctx).t('which is ').time(ms).spans.map((s) => s.text).join('')
    expect(text(Date.UTC(2027, 0, 15, 20, 18))).toBe('which is about 3:18pm EST')
    expect(text(Date.UTC(2027, 0, 15, 20, 30))).toBe('which is 3:30pm EST')
    expect(new Sentence({ ...ctx, estimatedArrival: null }).time(Date.UTC(2027, 0, 15, 20, 18)).spans.map((s) => s.text)).toEqual(['3:18pm EST'])
  })

  it("counts the landing countdown to the real plane's arrival", () => {
    const { leg } = caseLeg('ahead, in the air')
    expect(landingCountdown(leg, leg.end - 30 * 60_000)).toBe('Landing in 30 min')
  })
})

describe("the card's sentence for a screen reader (Stage 3 spec §9, §15)", () => {
  it('says each label in full', () => {
    expect(spokenLiveLabel({ kind: 'onSchedule' })).toBe('on schedule')
    expect(spokenLiveLabel({ kind: 'ahead', minutes: 12, isEstimated: false })).toBe('12 minutes ahead of schedule')
    expect(spokenLiveLabel({ kind: 'behind', minutes: 61, isEstimated: true })).toBe('about 1 hour 1 minute behind schedule')
    expect(spokenLiveLabel({ kind: 'stillOnGround', minutesBehind: null })).toBe('still on the ground')
    expect(spokenLiveLabel({ kind: 'stillOnGround', minutesBehind: 20 })).toBe('still on the ground, 20 minutes behind schedule')
    expect(spokenLiveLabel({ kind: 'landedOnTime' })).toBe('landed on time')
    expect(spokenLiveLabel({ kind: 'landedEarly', minutes: 8 })).toBe('landed 8 minutes early')
    expect(spokenLiveLabel({ kind: 'landedLate', minutes: 120 })).toBe('landed 2 hours late')
  })

  it('counts hours and minutes', () => {
    expect([1, 45, 60, 61, 130].map(spokenMinutes)).toEqual(['1 minute', '45 minutes', '1 hour', '1 hour 1 minute', '2 hours 10 minutes'])
  })

  it("says how the plane is doing, what's below, and when it lands", () => {
    const { leg, t } = caseLeg('ahead, in the air')
    expect(liveSummary(leg, t, NY, false, 'West Virginia')).toMatch(/^UPS207 to Philadelphia, 14 minutes ahead of schedule, over West Virginia\. Lands about \d{1,2}:\d\d\s[AP]M your time\.$/)
  })

  it('says "about" while the plane is an estimate', () => {
    const { leg, t } = caseLeg('ahead, in the air', 2)
    expect(liveSummary(leg, t, NY, false)).toMatch(/^UPS207 to Philadelphia, about 14 minutes ahead of schedule\. Lands about /)
  })

  it('says it is still on the ground, and when it will land, and nothing of what is below', () => {
    const { leg, t } = caseLeg('still on the ground twenty minutes after')
    expect(liveSummary(leg, t, NY, false, 'Indiana')).toMatch(/^UPS207 to Philadelphia, still on the ground, 20 minutes behind schedule\. Lands about /)
  })

  it('once it has landed, says when it reaches the gate, not that it lands', () => {
    const { leg, t } = caseLeg('landed, seen all the way')
    expect(liveSummary(leg, t, NY, false, 'New Jersey')).toMatch(/^UPS207 to Philadelphia, landed 23 minutes early\. Reaches the gate at \d{1,2}:\d\d\s[AP]M your time\.$/)
  })

  it('is nothing with no label', () => {
    const { leg, t } = caseLeg('on the ground somewhere else')
    expect(liveSummary(leg, t, NY, false)).toBeNull()
    expect(liveSummary(scheduleOnly(caseLeg('ahead, in the air').leg), t, NY, false)).toBeNull()
  })

  it("is the card's sentence with a real plane, and the schedule's without one, as before", () => {
    const { leg, t } = caseLeg('ahead, in the air')
    const map: TripMap = { mode: { kind: 'inFlight', legId: 'f1' }, legs: [leg], groundStops: [], home: null, base: null, isWaitingAtBase: false, span: { start: leg.start, end: leg.end }, days: null }
    expect(tripMapSummary(map, t, 'Alex', NY, false)).toMatch(/^UPS207 to Philadelphia, 14 minutes ahead of schedule\. Lands about .* your time\. Opens the full map\.$/)
    expect(tripMapSummary({ ...map, legs: [scheduleOnly(leg)] }, t, 'Alex', NY, false)).toMatch(/^UPS207 to Philadelphia, landing at .* your time\. Estimated from the schedule\. Opens the full map\.$/)
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/copy/liveWords.test.ts
```

Expected: 15 of the 17 fail: `flightStatus` isn't there, and nothing says "about" or the label.

- [x] **Step 3: Write the words.**

**In `src/copy/tripMap.ts`, replace (1 of 7):**

```ts
import type { LiveLabel } from '../map/liveLabel'
import {
  dayCount, destinationsOf, legInMotion, milesFlown, nextFlight, pilotLocation, currentLeg, totalMiles, type AirportMark, type MapLeg, type TripMap,
} from '../map/tripMap'
```

**with:**

```ts
import type { LiveLabel } from '../map/liveLabel'
import { mapFlightProgress } from '../map/mapFlight'
import {
  dayCount, destinationsOf, isArrivalEstimated, legInMotion, milesFlown, nextFlight, pilotLocation, currentLeg, totalMiles, type AirportMark,
  type MapLeg, type TripMap,
} from '../map/tripMap'
```

**In `src/copy/tripMap.ts`, replace (2 of 7):**

```ts

/** "45 min", "2 h" or "2 h 10 min": the landing countdown's length, and the real plane's gap. */
```

**with:**

```ts

/** "about " before a landing time that's the real plane's estimate, else nothing (Stage 3 spec §9). */
export const about = (leg: MapLeg) => (isArrivalEstimated(leg) ? 'about ' : '')

/**
 * What the card's bar and the full map's pill say of a flight between its gates (Stage 3 spec §9): the real plane's
 * label, or "In flight" when it has none. A moment of the replay is always "In flight" (§7.3).
 */
export function flightStatus(leg: MapLeg, now: number, isReplay = false): string {
  const label = !isReplay && leg.flight ? mapFlightProgress(leg.flight, now).label : null
  return label ? liveLabelText(label) : 'In flight'
}

/** "45 min", "2 h" or "2 h 10 min": the landing countdown's length, and the real plane's gap. */
```

**In `src/copy/tripMap.ts`, replace (3 of 7):**

```ts

/** The destination's own time at landing, or null when it keeps the family's. */
```

**with:**

```ts

/** "1 minute", "45 minutes", "2 hours" or "2 hours 10 minutes": a length as a screen reader says it. */
export function spokenMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const hoursText = hours === 1 ? '1 hour' : `${hours} hours`
  const restText = rest === 1 ? '1 minute' : `${rest} minutes`
  if (hours === 0) return restText
  return rest === 0 ? hoursText : `${hoursText} ${restText}`
}

/** The label as a screen reader hears it in the card's sentence: "12 minutes ahead of schedule", "landed 8 minutes early". */
export function spokenLiveLabel(label: LiveLabel): string {
  switch (label.kind) {
    case 'onSchedule':
      return 'on schedule'
    case 'ahead':
      return `${label.isEstimated ? 'about ' : ''}${spokenMinutes(label.minutes)} ahead of schedule`
    case 'behind':
      return `${label.isEstimated ? 'about ' : ''}${spokenMinutes(label.minutes)} behind schedule`
    case 'stillOnGround':
      return label.minutesBehind == null ? 'still on the ground' : `still on the ground, ${spokenMinutes(label.minutesBehind)} behind schedule`
    case 'landedOnTime':
      return 'landed on time'
    case 'landedEarly':
      return `landed ${spokenMinutes(label.minutes)} early`
    case 'landedLate':
      return `landed ${spokenMinutes(label.minutes)} late`
  }
}

/**
 * The card's sentence for a flight with a real plane (Stage 3 spec §9, §15): "UPS207 to Cologne, 12 minutes ahead of
 * schedule, over Québec. Lands about 3:18 PM your time." Once it's down, "…, landed 8 minutes early. Reaches the gate at
 * 3:18 PM your time." Null when the plane has no label, and the schedule's sentence stands. `over` is what's below,
 * said only of a plane in the air: one on the ground or landed is over nothing.
 */
export function liveSummary(leg: MapLeg, now: number, viewerTz: string, h24: boolean, over: string | null = null): string | null {
  const label = leg.flight ? mapFlightProgress(leg.flight, now).label : null
  if (!label) return null
  const lead = leg.flightNumber ? `${leg.flightNumber} to` : 'Flying to'
  const time = shortTimeText(leg.end, viewerTz, h24)
  const isDown = label.kind === 'landedOnTime' || label.kind === 'landedEarly' || label.kind === 'landedLate'
  const isFlying = label.kind === 'onSchedule' || label.kind === 'ahead' || label.kind === 'behind'
  // It's down and on its way in: "landed 8 minutes early. Lands at 3:18 PM" would say so twice.
  const arrival = isDown ? `Reaches the gate at ${time} your time.` : `Lands ${isArrivalEstimated(leg) ? 'about' : 'at'} ${time} your time.`
  return `${lead} ${leg.destination.city}, ${spokenLiveLabel(label)}${over && isFlying ? `, over ${over}` : ''}. ${arrival}`
}

/** The destination's own time at landing, or null when it keeps the family's. */
```

**In `src/copy/tripMap.ts`, replace (4 of 7):**

```ts

/** "Lands Cologne 9:30 PM · 3:30 PM your time", or "Lands Louisville 3:30 PM". */
export function landingLine(leg: MapLeg, viewerTz: string, h24: boolean): string {
```

**with:**

```ts

/**
 * "Lands Cologne 9:30 PM · 3:30 PM your time", or "Lands Louisville 3:30 PM". With the real plane's estimate, "Lands
 * Cologne about 9:18 PM · 3:18 PM your time": "about" once.
 */
export function landingLine(leg: MapLeg, viewerTz: string, h24: boolean): string {
```

**In `src/copy/tripMap.ts`, replace (5 of 7):**

```ts
  const there = thereAtLanding(leg, viewerTz, h24)
  return there ? `Lands ${leg.destination.city} ${there} · ${yours} your time` : `Lands ${leg.destination.city} ${yours}`
}

/** "Lands 3:30 PM", for the card's bar. */
export const landsAt = (leg: MapLeg, viewerTz: string, h24: boolean) => `Lands ${shortTimeText(leg.end, viewerTz, h24)}`

```

**with:**

```ts
  const there = thereAtLanding(leg, viewerTz, h24)
  const city = `Lands ${leg.destination.city} ${about(leg)}`
  return there ? `${city}${there} · ${yours} your time` : `${city}${yours}`
}

/** "Lands 3:30 PM", for the card's bar. With the real plane's estimate, "Lands about 3:18 PM". */
export const landsAt = (leg: MapLeg, viewerTz: string, h24: boolean) => `Lands ${about(leg)}${shortTimeText(leg.end, viewerTz, h24)}`

```

**In `src/copy/tripMap.ts`, replace (6 of 7):**

```ts

/** The full map's pill: "UPS207 · In flight", "Driving to Louisville", "Day 2 of 4" or "Next trip". */
export function topPill(map: TripMap, t: number, day: number | null, days: number | null): string {
  if (map.mode.kind === 'recap' && t >= map.span.end) return 'Trip recap'
  const leg = legInMotion(map, t)
  if (leg) return leg.kind === 'flight' ? [leg.flightNumber, 'In flight'].filter(Boolean).join(' · ') : `Driving to ${leg.destination.city}`
  if (map.mode.kind === 'nextTrip' && t < map.span.start) return 'Next trip'
```

**with:**

```ts

/**
 * The full map's pill: "UPS207 · In flight", "UPS207 · 12 min ahead", "Driving to Louisville", "Day 2 of 4" or "Next
 * trip". A moment of the replay (`isReplay`) is "In flight" (Stage 3 spec §7.3).
 */
export function topPill(map: TripMap, t: number, day: number | null, days: number | null, isReplay = false): string {
  if (map.mode.kind === 'recap' && t >= map.span.end) return 'Trip recap'
  const leg = legInMotion(map, t)
  if (leg) return leg.kind === 'flight' ? [leg.flightNumber, flightStatus(leg, t, isReplay)].filter(Boolean).join(' · ') : `Driving to ${leg.destination.city}`
  if (map.mode.kind === 'nextTrip' && t < map.span.start) return 'Next trip'
```

**In `src/copy/tripMap.ts`, replace (7 of 7):**

```ts
    if (!leg) return `Trip map. ${opens}`
    const lead = leg.flightNumber ? `${leg.flightNumber} to` : 'Flying to'
```

**with:**

```ts
    if (!leg) return `Trip map. ${opens}`
    const live = liveSummary(leg, t, viewerTz, h24)
    if (live) return `${live} ${opens}`
    const lead = leg.flightNumber ? `${leg.flightNumber} to` : 'Flying to'
```

**In `src/copy/facts.ts`, replace (1 of 2):**

```ts
import type { Chase, MoonSight, SunEvent, SunKind } from '../facts/sky'
import type { MapLeg } from '../map/tripMap'
import type { MoonPhase } from '../time/moon'
```

**with:**

```ts
import type { Chase, MoonSight, SunEvent, SunKind } from '../facts/sky'
import { isArrivalEstimated, type MapLeg } from '../map/tripMap'
import type { MoonPhase } from '../time/moon'
```

**In `src/copy/facts.ts`, replace (2 of 2):**

```ts
  const there = leg.destination.timeZone
  if (there && zoneOffsetMinutes(leg.end, there) !== zoneOffsetMinutes(leg.end, viewerTz)) return `lands ${shortTimeText(leg.end, there, h24)} there`
  return `lands ${shortTimeText(leg.end, viewerTz, h24)}`
}
```

**with:**

```ts
  const there = leg.destination.timeZone
  // "lands about 4:05 PM there" when it's the real plane's estimate (Stage 3 spec §9).
  const about = isArrivalEstimated(leg) ? 'about ' : ''
  if (there && zoneOffsetMinutes(leg.end, there) !== zoneOffsetMinutes(leg.end, viewerTz)) return `lands ${about}${shortTimeText(leg.end, there, h24)} there`
  return `lands ${about}${shortTimeText(leg.end, viewerTz, h24)}`
}
```

**In `src/copy/narrative.ts`, replace (1 of 2):**

```ts
  airports: AirportIndex
}
```

**with:**

```ts
  airports: AirportIndex
  /** When the flight under way reaches its gate, while that's the real plane's estimate: the time says "about" (Stage 3 spec §9). */
  estimatedArrival?: number | null
}
```

**In `src/copy/narrative.ts`, replace (2 of 2):**

```ts
  time(ms: number): this {
    return this.b(timeWithZone(ms, this.ctx.viewerTz, this.ctx.h24))
```

**with:**

```ts
  time(ms: number): this {
    if (this.ctx.estimatedArrival != null && Math.abs(ms - this.ctx.estimatedArrival) < 1000) this.t('about ')
    return this.b(timeWithZone(ms, this.ctx.viewerTz, this.ctx.h24))
```

**In `src/facts/tripFacts.ts`, replace (1 of 2):**

```ts
import { shortTimeText } from '../copy/format'
import { landingCountdown, panelHeadline, tripMapSummary } from '../copy/tripMap'
import type { LandingForecast } from '../data/weather'
```

**with:**

```ts
import { shortTimeText } from '../copy/format'
import { landingCountdown, liveSummary, panelHeadline, tripMapSummary } from '../copy/tripMap'
import type { LandingForecast } from '../data/weather'
```

**In `src/facts/tripFacts.ts`, replace (2 of 2):**

```ts
    const place = story ? placeAtFraction(story, legProgress(leg, now)) : null
    const over = place ? `, over ${place.name}` : ''
```

**with:**

```ts
    const place = story ? placeAtFraction(story, legProgress(leg, now)) : null
    // With a real plane, its sentence (Stage 3 spec §9, §15). What's below is still read along the great circle (plan 3C-3).
    const live = liveSummary(leg, now, viewerTz, h24, place?.name ?? null)
    if (live) return `${live} Opens the full map.`
    const over = place ? `, over ${place.name}` : ''
```

- [x] **Step 4: Run them again.** Expected: 17 tests pass. Then `npx tsc --noEmit`: nothing.

- [x] **Step 5: Commit, on Todd's yes (after batch B's checkpoint).**

```bash
git add src/copy/tripMap.ts src/copy/facts.ts src/copy/narrative.ts src/facts/tripFacts.ts tests/copy/liveWords.test.ts
git commit -m "The trip map's words for a real plane: its label for the bar and the pill, \"about\" before a landing time that's its estimate, and the card's sentence for a screen reader (Stage 3 spec §9, §15)"
```

---

### Task 7: The map's views

The label goes on the card's bar. The full map says "In flight" in a replay and draws it so, and its clock carries on through a new estimate. Both maps hold their frame until a real path grows past it.

**Files:**
- Create: `src/ui/hooks/useSteadyFraming.ts`
- Modify: `src/ui/TripMapSvg.tsx`, `src/ui/AppleTripMap.tsx`, `src/ui/TripMapCard.tsx`, `src/ui/TripMapPage.tsx`
- Test: `tests/ui/useSteadyFraming.test.tsx`, `tests/ui/liveMapPage.test.tsx`

- [x] **Step 1: Write the tests.**

**Create `tests/ui/useSteadyFraming.test.tsx`:**

```tsx
// @vitest-environment happy-dom
import { cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import type { GeoPoint } from '../../src/map/greatCircle'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { AppleTripMap } from '../../src/ui/AppleTripMap'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { useSteadyFraming } from '../../src/ui/hooks/useSteadyFraming'
import { TripMapSvg } from '../../src/ui/TripMapSvg'
import { fakeMapKit } from '../fixtures/fakeMapKit'
import { FLYING, liveTripMap, TRAIL } from '../map/liveTrip'
import { MINUTE, point, START } from '../map/madeUpFlights'

afterEach(() => {
  cleanup()
  resetAppleMapKit()
})

const IN_THE_AIR = START + 59 * MINUTE

const p = (lat: number, lng: number) => ({ lat, lng })

describe('the frame held steady while a real path grows (Stage 3 spec §6.2)', () => {
  let held: GeoPoint[] = []
  function Probe({ framing, what }: { framing: GeoPoint[]; what: string }) {
    held = useSteadyFraming(framing, what)
    return null
  }
  const first = [p(38, -86), p(40, -75)]

  it('keeps its places while the new ones fit their frame, and takes the new ones once they don’t', () => {
    const view = render(<Probe framing={first} what="f1" />)
    expect(held).toBe(first)
    view.rerender(<Probe framing={[...first, p(39, -80)]} what="f1" />)
    expect(held).toBe(first)
    const grown = [...first, p(47, -80)]
    view.rerender(<Probe framing={grown} what="f1" />)
    expect(held).toBe(grown)
  })

  it('takes the new places when something else is framed, even inside the old frame', () => {
    const view = render(<Probe framing={first} what="trip" />)
    const leg = [p(39, -80), p(39.5, -78)]
    view.rerender(<Probe framing={leg} what="f1" />)
    expect(held).toBe(leg)
  })
})

/**
 * The made-up flight seen once more: a little north of every place framed so far, in the room the frame keeps around
 * them, or far north of the trip. Without the hold, the first would move the camera a little.
 */
const grownInside = { ...FLYING, trail: [...TRAIL.slice(0, 3), point(40, 40.05, -82.0), ...TRAIL.slice(3)] }
const grownPast = { ...FLYING, trail: [...TRAIL.slice(0, 3), point(40, 47.5, -82.0), ...TRAIL.slice(3)] }

describe('the SVG map’s frame while a real path grows (Stage 3 spec §6.2)', () => {
  const louisville = (container: Element) => {
    const dot = [...container.querySelectorAll('.trip-map-airport')].find((g) => g.textContent === 'SDF')!.querySelector('circle')!
    return [dot.getAttribute('cx'), dot.getAttribute('cy')]
  }
  const svg = (live = FLYING) => {
    const map = liveTripMap(IN_THE_AIR, live)
    return <TripMapSvg map={map} t={IN_THE_AIR} width={390} height={300} focus={map.legs[0]} land={null} nightStep={60_000} />
  }

  it('holds it while the path grows inside it, and frames again once it grows past', () => {
    const view = render(svg())
    const before = louisville(view.container)
    view.rerender(svg(grownInside))
    expect(louisville(view.container)).toEqual(before)
    view.rerender(svg(grownPast))
    expect(louisville(view.container)).not.toEqual(before)
  })
})

describe('Apple’s map’s frame while a real path grows', () => {
  it('holds Apple’s map’s frame while the path grows inside it, and frames again once it grows past', async () => {
    const kit = fakeMapKit()
    startAppleMapKit(async () => kit as unknown as MapKitApi)
    const apple = (live = FLYING) => {
      const map = liveTripMap(IN_THE_AIR, live)
      return <AppleTripMap map={map} t={IN_THE_AIR} width={390} height={300} focus={map.legs[0]} land={null} nightStep={60_000} mapStyle="standard" interactive={false} />
    }
    const view = render(apple())
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    expect(kit.maps[0].rects).toHaveLength(1)
    view.rerender(apple(grownInside))
    expect(kit.maps[0].rects).toHaveLength(1)
    view.rerender(apple(grownPast))
    expect(kit.maps[0].rects).toHaveLength(2)
  })

})
```

**Create `tests/ui/liveMapPage.test.tsx`:**

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { flightStatus } from '../../src/copy/tripMap'
import { currentLeg } from '../../src/map/tripMap'
import { resetAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { TripMapCard } from '../../src/ui/TripMapCard'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { FLYING, liveTripMap } from '../map/liveTrip'
import { fix, MINUTE, START } from '../map/madeUpFlights'

afterEach(() => {
  cleanup()
  resetAppleMapKit()
  localStorage.clear()
})

const NY = 'America/New_York'
const IN_THE_AIR = START + 59 * MINUTE

function card(t: number, live = FLYING) {
  const map = liveTripMap(t, live)
  render(<TripMapCard map={map} now={t} viewerTz={NY} h24={false} name="Alex" day={1} days={1} delayMinutes={null} land={null} onOpenMap={() => {}} />)
  return map
}

describe("the map card with a real plane (Stage 3 spec §9)", () => {
  it("says how the plane is doing on its bar, and lands about the real plane's time", () => {
    const map = card(IN_THE_AIR)
    const status = document.querySelector('.inflight-status')?.textContent
    expect(status).toBe(flightStatus(currentLeg(map)!, IN_THE_AIR))
    expect(status).toMatch(/ (ahead|behind)$|^On schedule$/)
    expect(document.querySelector('.inflight-time')?.textContent).toMatch(/^Lands about \d{1,2}:\d\d\s[AP]M$/)
  })

  it('says it all to a screen reader in one sentence', () => {
    card(IN_THE_AIR)
    expect(screen.getByRole('button', { name: /^UPS1234 to Philadelphia, .* schedule\. Lands about .* your time\. Opens the full map\.$/ })).toBeTruthy()
  })

  it('says "In flight", as before, with no live data', () => {
    card(IN_THE_AIR, null as never)
    expect(document.querySelector('.inflight-status')?.textContent).toBe('In flight')
    expect(document.querySelector('.inflight-time')?.textContent).toMatch(/^Lands \d/)
  })
})

describe('the full map with a real plane (Stage 3 spec §7.3, §9)', () => {
  const page = (t: number, live = FLYING) =>
    <TripMapPage map={liveTripMap(t, live)} now={t} viewerTz={NY} h24={false} day={1} days={1} land={null} onBack={() => {}} />

  it('puts the label on the pill now, and "In flight" in the replay, which shows the real plane alone', () => {
    render(page(IN_THE_AIR))
    const pill = () => document.querySelector('.trip-map-pill')?.textContent
    expect(pill()).toBe(`UPS1234 · ${flightStatus(currentLeg(liveTripMap(IN_THE_AIR))!, IN_THE_AIR)}`)
    expect(document.querySelector('.trip-map-ghost')).not.toBeNull()
    const slider = screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement
    fireEvent.input(slider, { target: { value: String(Number(slider.max) / 4) } })
    expect(pill()).toBe('UPS1234 · In flight')
    expect(document.querySelector('.trip-map-real-plane')).not.toBeNull()
    expect(document.querySelector('.trip-map-ghost')).toBeNull()
  })

  it("keeps the replay's moment when a new landing estimate changes the trip's times", () => {
    const view = render(page(IN_THE_AIR))
    const slider = () => screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement
    fireEvent.input(slider(), { target: { value: String(Number(slider().max) / 4) } })
    const moment = slider().getAttribute('aria-valuetext')
    // A new fix, further along: the landing estimate, and so the trip's end, moves.
    const later = { ...FLYING, fix: fix(61, 39.7, -79.2, { trackDeg: 75 }) }
    view.rerender(page(START + 62 * MINUTE, later))
    expect(liveTripMap(START + 62 * MINUTE, later).span.end).not.toBe(liveTripMap(IN_THE_AIR).span.end)
    expect(slider().getAttribute('aria-valuetext')).toBe(moment)
    expect(document.querySelector('.trip-map-pill')?.textContent).toBe('UPS1234 · In flight')
  })

  it("keeps a replay at the trip's end at its end when a later estimate makes the trip longer", () => {
    const view = render(page(IN_THE_AIR))
    const slider = () => screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement
    fireEvent.input(slider(), { target: { value: slider().max } })
    // Seen again where it was at 1:53: it has slowed, and lands later.
    const slower = { ...FLYING, fix: fix(61, 39.6, -80.3, { trackDeg: 75 }) }
    expect(liveTripMap(START + 62 * MINUTE, slower).span.end).toBeGreaterThan(liveTripMap(IN_THE_AIR).span.end)
    view.rerender(page(START + 62 * MINUTE, slower))
    expect(slider().value).toBe(slider().max)
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/ui/useSteadyFraming.test.tsx tests/ui/liveMapPage.test.tsx
```

Expected: the first file fails to load (it can't find `src/ui/hooks/useSteadyFraming`), and 4 of the second's fail: the bar says "In flight", the pill keeps the label in a replay, and a replay at the trip's end isn't kept there.

- [x] **Step 3: Hold the frame.**

**Create `src/ui/hooks/useSteadyFraming.ts`:**

```ts
import { useRef } from 'preact/hooks'
import type { GeoPoint } from '../../map/greatCircle'
import { framesAll } from '../../map/mapFit'

/**
 * The places the camera frames, held while the same thing is framed (`what`: the leg in focus or the whole trip) and
 * `framing` stays inside their frame, as the app's card frames a real path again only once it grows past its frame
 * (Stage 3 spec §6.2). Recenter frames the held places, which hold every place of the path. Without a real path the
 * places never change, so nothing does.
 */
export function useSteadyFraming(framing: GeoPoint[], what: string): GeoPoint[] {
  const kept = useRef<{ what: string; framing: GeoPoint[] } | null>(null)
  const held = kept.current
  if (!held || held.what !== what || !framesAll(held.framing, framing)) kept.current = { what, framing }
  return kept.current!.framing
}
```

**In `src/ui/TripMapSvg.tsx`, replace (1 of 2):**

```tsx
import type { GroundKind } from '../map/tripActivity'
import { framingPoints, type MapLeg, type TripMap } from '../map/tripMap'
import { nightTime, PILOT_RADIUS, routePoints, tripMapDrawing, type PlaneMark } from '../map/tripMapDrawing'

```

**with:**

```tsx
import type { GroundKind } from '../map/tripActivity'
import { framingPoints, framingSubject, type MapLeg, type TripMap } from '../map/tripMap'
import { nightTime, PILOT_RADIUS, routePoints, tripMapDrawing, type PlaneMark } from '../map/tripMapDrawing'
import { useSteadyFraming } from './hooks/useSteadyFraming'

```

**In `src/ui/TripMapSvg.tsx`, replace (2 of 2):**

```tsx
  const { top, right, bottom, left } = insets
  const framed = useMemo(
    () => fitClear(fitRect(framingPoints(map, focus)) ?? { x: 0, y: 0, width: 1, height: 1 }, width, height, { top, right, bottom, left }),
    [map, focus, width, height, top, right, bottom, left],
  )
```

**with:**

```tsx
  const { top, right, bottom, left } = insets
  const framing = useSteadyFraming(framingPoints(map, focus), framingSubject(map, focus))
  const framed = useMemo(
    () => fitClear(fitRect(framing) ?? { x: 0, y: 0, width: 1, height: 1 }, width, height, { top, right, bottom, left }),
    [framing, width, height, top, right, bottom, left],
  )
```

**In `src/ui/AppleTripMap.tsx`, replace (1 of 3):**

```tsx
import { LAYER_ALPHA, nightLayers, SUN_DEPTHS } from '../map/nightShade'
import { framingPoints } from '../map/tripMap'
import { nightTime, tripMapDrawing, type SegmentStyle } from '../map/tripMapDrawing'
```

**with:**

```tsx
import { LAYER_ALPHA, nightLayers, SUN_DEPTHS } from '../map/nightShade'
import { framingPoints, framingSubject } from '../map/tripMap'
import { nightTime, tripMapDrawing, type SegmentStyle } from '../map/tripMapDrawing'
```

**In `src/ui/AppleTripMap.tsx`, replace (2 of 3):**

```tsx
import { useAppleMapKit } from './hooks/useAppleMapKit'
import { TripMapSvg, type TripMapSvgProps } from './TripMapSvg'
```

**with:**

```tsx
import { useAppleMapKit } from './hooks/useAppleMapKit'
import { useSteadyFraming } from './hooks/useSteadyFraming'
import { TripMapSvg, type TripMapSvgProps } from './TripMapSvg'
```

**In `src/ui/AppleTripMap.tsx`, replace (3 of 3):**

```tsx
  latest.current = { pilot, width, height, insets }
  const { rect, padding } = appleCamera(framingPoints(map, focus), pilot, width, height, insets)
  const frame = `${rect.x},${rect.y},${rect.width},${rect.height}|${padding.top},${padding.right},${padding.bottom},${padding.left}|${recenter}`
```

**with:**

```tsx
  latest.current = { pilot, width, height, insets }
  const framing = useSteadyFraming(framingPoints(map, focus), framingSubject(map, focus))
  const { rect, padding } = appleCamera(framing, pilot, width, height, insets)
  const frame = `${rect.x},${rect.y},${rect.width},${rect.height}|${padding.top},${padding.right},${padding.bottom},${padding.left}|${recenter}`
```

- [x] **Step 4: The card's bar, and the full map's replay.**

**In `src/ui/TripMapCard.tsx`, replace (1 of 3):**

```tsx
import { delayBannerText, spokenDelayBanner } from '../copy/flight'
import { arrivalLocalTime, cardChips, landsAt, statsItems, tripMapSummary } from '../copy/tripMap'
import type { GeoPoint } from '../map/greatCircle'
```

**with:**

```tsx
import { delayBannerText, spokenDelayBanner } from '../copy/flight'
import { arrivalLocalTime, cardChips, flightStatus, landsAt, statsItems, tripMapSummary } from '../copy/tripMap'
import type { GeoPoint } from '../map/greatCircle'
```

**In `src/ui/TripMapCard.tsx`, replace (2 of 3):**

```tsx

function InFlightBar({ leg, viewerTz, h24, onOpenTracking }: TripMapCardProps & { leg: MapLeg }) {
  const local = arrivalLocalTime(leg, viewerTz, h24)
```

**with:**

```tsx

function InFlightBar({ leg, now, viewerTz, h24, onOpenTracking }: TripMapCardProps & { leg: MapLeg }) {
  const local = arrivalLocalTime(leg, viewerTz, h24)
```

**In `src/ui/TripMapCard.tsx`, replace (3 of 3):**

```tsx
        ) : leg.flightNumber && <span class="inflight-number">{leg.flightNumber}</span>}
        <span class="inflight-status">In flight</span>
      </div>
```

**with:**

```tsx
        ) : leg.flightNumber && <span class="inflight-number">{leg.flightNumber}</span>}
        {/* The real plane's label, or "In flight" (Stage 3 spec §9). */}
        <span class="inflight-status">{flightStatus(leg, now)}</span>
      </div>
```

**In `src/ui/TripMapPage.tsx`, replace (1 of 4):**

```tsx
import { NO_INSETS, type Insets } from '../map/mapFit'
import { clockTime, finishesAt, isPlaying, liveClock, scrub, setQuickLayovers } from '../map/replayClock'
import { tripWaits } from '../map/tripActivity'
```

**with:**

```tsx
import { NO_INSETS, type Insets } from '../map/mapFit'
import { carried, clockTime, finishesAt, hasTimes, isLive, isPlaying, liveClock, scrub, setQuickLayovers } from '../map/replayClock'
import { tripWaits } from '../map/tripActivity'
```

**In `src/ui/TripMapPage.tsx`, replace (2 of 4):**

```tsx
  // The span, legs and waits always follow the map, so the slider's range and the replay's pace are right if the trip
  // changes while the page is open. Quick layovers is this browser's choice (activity markers design §3.1).
  const clock = { ...kept, span: map.span, legs: map.legs, waits, quickLayovers }
  // Switching keeps the moment shown, and a replay carries on from it at the new pace.
```

**with:**

```tsx
  // The span, legs and waits always follow the map, so the slider's range and the replay's pace are right if the trip
  // changes while the page is open. A new landing estimate changes them: a replay keeps its moment and plays on from it
  // (Stage 3 spec §7.3). Quick layovers is this browser's choice (activity markers design §3.1).
  const current = hasTimes(kept, map.span, map.legs, waits) ? kept : carried(kept, map.span, map.legs, waits, Date.now())
  useEffect(() => {
    if (current !== kept) setClock(current)
  })
  const clock = { ...current, quickLayovers }
  // A moment of the replay shows the real plane alone, and the pill says "In flight".
  const isReplay = !isLive(clock)
  // Switching keeps the moment shown, and a replay carries on from it at the new pace.
```

**In `src/ui/TripMapPage.tsx`, replace (3 of 4):**

```tsx
        </button>
        <h1 ref={heading} class="trip-map-pill" tabIndex={-1}>{topPill(map, t, day, days)}</h1>
        {apple && moved && (
```

**with:**

```tsx
        </button>
        <h1 ref={heading} class="trip-map-pill" tabIndex={-1}>{topPill(map, t, day, days, isReplay)}</h1>
        {apple && moved && (
```

**In `src/ui/TripMapPage.tsx`, replace (4 of 4):**

```tsx
        <AppleTripMap map={map} t={t} width={width} height={height} focus={focus} land={land} nightStep={nightStep} insets={insets}
          mapStyle={mapStyle} interactive recenter={recenter} onUserMove={() => setMoved(true)} />
      </div>
```

**with:**

```tsx
        <AppleTripMap map={map} t={t} width={width} height={height} focus={focus} land={land} nightStep={nightStep} insets={insets}
          mapStyle={mapStyle} interactive recenter={recenter} onUserMove={() => setMoved(true)} isReplay={isReplay} />
      </div>
```

- [x] **Step 5: Run them again.** Expected: 10 tests pass. Then `npx tsc --noEmit`: nothing.

- [x] **Step 6: Batch B's review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Tasks 5 to 7, against the spec's §5, §6.2, §7.3, §9 and §15, the table at the head of `src/map/flightDrawing.ts`, and this plan's list of where it differs. Make its fixes, rerun each task's tests, and record what it found.

- [x] **Step 7: Batch B's checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npx vitest run tests/map tests/copy tests/facts tests/ui
```

Expected: 2,038 tests pass.

- [x] **Step 8: Commit, on Todd's yes.** Tasks 5 and 6's commits, then:

```bash
git add src/ui/hooks/useSteadyFraming.ts src/ui/TripMapSvg.tsx src/ui/AppleTripMap.tsx src/ui/TripMapCard.tsx src/ui/TripMapPage.tsx tests/ui/useSteadyFraming.test.tsx tests/ui/liveMapPage.test.tsx
git commit -m "The trip map's views show the real plane: its label on the card's bar and the pill, a replay that shows it alone and carries on through a new estimate, and a frame held until a real path grows past it (Stage 3 spec §6.2, §7.3, §9)"
```

---

### Task 8: The status page owns the live plane

This is the task that turns it on. `PartnerLive` gets its live plane: one source, asked while the page shows. `PilotPages` writes each answered flight's real times into the schedule once, at each new schedule, each new answer and each minute, and every card reads them. From here a listed pilot's family sees the real plane.

**Files:**
- Create: `src/ui/hooks/useLivePlane.ts`
- Modify: `src/ui/Root.tsx`, `src/ui/PilotPages.tsx`, `src/ui/StatusScreen.tsx`, `tests/fixtures/partner.ts`, `tests/ui/Root.test.tsx`
- Test: `tests/ui/useLivePlane.test.tsx`, `tests/ui/livePages.test.tsx`

- [x] **Step 1: The stand-in door answers `live`,** with no flights unless a test sets some, and keeps its calls apart from the other four's, so no test of those changes.

**In `tests/fixtures/partner.ts`, replace (1 of 4):**

```ts
import { join } from 'node:path'
import type { Joined, PartnerDoor, Refused, Viewed } from '../../src/partner/door'
import type { KeyValueStore } from '../../src/partner/store'
```

**with:**

```ts
import { join } from 'node:path'
import type { Joined, LiveFlightDoor, PartnerDoor, Refused, Viewed } from '../../src/partner/door'
import type { AnsweredFlight } from '../../src/partner/liveAnswer'
import type { KeyValueStore } from '../../src/partner/store'
```

**In `tests/fixtures/partner.ts`, replace (2 of 4):**

```ts
  const calls: string[] = []
  const network = { down: false, loseNext: false }
```

**with:**

```ts
  const calls: string[] = []
  /** partner_live's calls, kept apart so the other calls read as they always have. */
  const liveCalls: string[] = []
  /** What partner_live answers each partner: no flights unless a test sets some. */
  const liveFlights = new Map<string, AnsweredFlight[]>()
  const network = { down: false, loseNext: false }
```

**In `tests/fixtures/partner.ts`, replace (3 of 4):**

```ts
  }
  const door: PartnerDoor = {
    async join(invite, key, label) {
```

**with:**

```ts
  }
  const door: PartnerDoor & LiveFlightDoor = {
    async join(invite, key, label) {
```

**In `tests/fixtures/partner.ts`, replace (4 of 4):**

```ts
    },
  }
  return { door, invites, codes, summaries, devices, calls, network }
}
```

**with:**

```ts
    },
    async live(key, after) {
      liveCalls.push(`live ${key} ${after}`)
      reach()
      const partner = devices.get(key)
      if (!partner) return { error: 'sharing_ended' }
      return { now: Date.now(), cursor: after ?? 0, flights: liveFlights.get(partner) ?? [] }
    },
  }
  return { door, invites, codes, summaries, devices, calls, liveCalls, liveFlights, network }
}
```

- [x] **Step 2: Write the tests.**

**Create `tests/ui/useLivePlane.test.tsx`:**

```tsx
// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Schedule } from '../../src/engine/types'
import type { LiveFlightDoor, Refused } from '../../src/partner/door'
import type { LiveAnswer } from '../../src/partner/liveAnswer'
import { useLivePlane, type LivePlane } from '../../src/ui/hooks/useLivePlane'
import { key } from '../fixtures/partner'
import { FLYING, SCHEDULE } from '../map/liveTrip'
import { MINUTE, START } from '../map/madeUpFlights'

let visibility: DocumentVisibilityState = 'visible'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  // Half an hour into the made-up flight: its window is open.
  vi.setSystemTime(START + 30 * MINUTE)
  visibility = 'visible'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  delete (document as { visibilityState?: unknown }).visibilityState
})

/** The made-up flight, as partner_live answers it: its whole trail, or none of it after the cursor, as nothing new came. */
const flying = (after: number | null): LiveAnswer =>
  ({ now: Date.now(), cursor: 7, flights: [{ ...FLYING, trail: after == null ? FLYING.trail : [], trailCount: FLYING.trail.length }] })

/** A door that answers the made-up flight, or what a test sets, and counts its calls. */
function door(answer: (after: number | null) => LiveAnswer | Refused = flying) {
  const calls: (number | null)[] = []
  const live: LiveFlightDoor['live'] = async (_key, after) => {
    calls.push(after)
    return answer(after)
  }
  return { live, calls }
}

/** The hook on a page of its own, which shows how many flights reached it. */
function Probe(props: { door: LiveFlightDoor; schedule: Schedule | null; onSharingEnded?: () => void; seen: (plane: LivePlane) => void }) {
  const plane = useLivePlane({ door: props.door, device: () => ({ key: key(1), partnerId: 'p' }), schedule: props.schedule, onSharingEnded: props.onSharingEnded ?? (() => {}) })
  props.seen(plane)
  return <p>{plane.flights.size}</p>
}

/** Lets the calls under way answer. */
const settle = () => act(async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
})

const show = (next: DocumentVisibilityState) => act(() => {
  visibility = next
  document.dispatchEvent(new Event('visibilitychange'))
})

describe("the status page's live plane (Stage 3 spec §11, §12)", () => {
  it('asks once as the page shows, and hands the flights to the page', async () => {
    const d = door()
    let plane: LivePlane | null = null
    const { container } = render(<Probe door={d} schedule={SCHEDULE} seen={(p) => (plane = p)} />)
    await settle()
    expect(d.calls).toEqual([null])
    expect(container.textContent).toBe('1')
    expect(plane!.flights.get('f1')?.trail).toEqual(FLYING.trail)
  })

  it("asks every 30 seconds while a flight's window is open, and never while the page is hidden", async () => {
    const d = door()
    render(<Probe door={d} schedule={SCHEDULE} seen={() => {}} />)
    await settle()
    await act(() => {
      vi.advanceTimersByTime(30_000)
    })
    await settle()
    expect(d.calls).toEqual([null, 7])
    await show('hidden')
    await act(() => {
      vi.advanceTimersByTime(90_000)
    })
    await settle()
    expect(d.calls).toHaveLength(2)
    await show('visible')
    await settle()
    expect(d.calls).toHaveLength(3)
  })

  it("doesn't ask every 30 seconds with no flight's window open", async () => {
    const d = door()
    render(<Probe door={d} schedule={null} seen={() => {}} />)
    await settle()
    await act(() => {
      vi.advanceTimersByTime(90_000)
    })
    await settle()
    expect(d.calls).toEqual([null])
  })

  it('stops asking once the page is gone', async () => {
    const d = door()
    const { unmount } = render(<Probe door={d} schedule={SCHEDULE} seen={() => {}} />)
    await settle()
    unmount()
    await act(() => {
      vi.advanceTimersByTime(90_000)
    })
    await settle()
    expect(d.calls).toHaveLength(1)
  })

  it('tells the page when partner_live says sharing has ended', async () => {
    const ended = vi.fn()
    render(<Probe door={door(() => ({ error: 'sharing_ended' }))} schedule={SCHEDULE} onSharingEnded={ended} seen={() => {}} />)
    await settle()
    expect(ended).toHaveBeenCalledTimes(1)
  })
})
```

**Create `tests/ui/livePages.test.tsx`:**

```tsx
// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScheduleHandle } from '../../src/ui/hooks/useSchedule'
import { PilotPages } from '../../src/ui/PilotPages'
import { FLYING, LIVE_AIRPORTS, SCHEDULE, SDF } from '../map/liveTrip'
import { fix, liveFlight, MINUTE, START } from '../map/madeUpFlights'

const NOW = START + 59 * MINUTE

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  localStorage.clear()
})

const handle: ScheduleHandle = { schedule: SCHEDULE, lastSuccessAt: START, problem: null, refreshing: false, refresh: () => {} }
const LIVE = { flights: new Map([['f1', FLYING]]), clockOffset: 0 }
const noWeather = async () => null

const page = (live: typeof LIVE | null) =>
  render(<PilotPages schedule={handle} airports={LIVE_AIRPORTS} demo={false} onLeave={() => {}} live={live} loadWeather={noWeather} />).container

describe('the status page with a real plane (Stage 3 spec §7.1, §9)', () => {
  it("shows one landing time, the real plane's, said with \"about\" on the map's bar, the countdown and the narrative", () => {
    const container = page(LIVE)
    expect(container.querySelector('.inflight-status')?.textContent).not.toBe('In flight')
    const lands = container.querySelector('.inflight-time')?.textContent ?? ''
    expect(lands).toMatch(/^Lands about \d{1,2}:\d\d\s[AP]M$/)
    expect(container.querySelector('.countdown-sub')?.textContent).toMatch(/^About /)
    expect(container.querySelector('.narrative-text')?.textContent).toMatch(/ which is about \d/)
    expect(container.querySelector('.trip-map-open')?.getAttribute('aria-label')).toMatch(/^UPS1234 to Philadelphia, .* schedule(, over [^.]+)?\. Lands about .* your time\. Opens the full map\.$/)
  })

  it('moves an estimate that moves by itself each minute: a plane still at the gate lands later as time goes by', () => {
    vi.setSystemTime(START + 25 * MINUTE)
    // At the gate ten minutes after the plan's takeoff, seen 20 seconds ago.
    const atTheGate = liveFlight([], { legId: 'f1', state: 'ground', fix: fix(25 - 1 / 3, SDF.lat, SDF.lng, { onGround: true }) })
    const container = page({ flights: new Map([['f1', atTheGate]]), clockOffset: 0 })
    const lands = () => container.querySelector('.inflight-time')?.textContent
    const before = lands()
    expect(before).toMatch(/^Lands about /)
    act(() => {
      vi.advanceTimersByTime(2 * MINUTE)
    })
    expect(lands()).toMatch(/^Lands about /)
    expect(lands()).not.toBe(before)
  })

  it('shows the schedule as before with no live data', () => {
    const container = page(null)
    expect(container.querySelector('.inflight-status')?.textContent).toBe('In flight')
    expect(container.querySelector('.inflight-time')?.textContent).toMatch(/^Lands \d/)
    expect(container.querySelector('.countdown-sub')?.textContent).not.toMatch(/^About /)
    expect(container.querySelector('.narrative-text')?.textContent).not.toMatch(/about/)
  })
})
```

**In `tests/ui/Root.test.tsx`, replace:**

```tsx

  it('goes back to a plain welcome screen when another tab disconnected', async () => {
```

**with:**

```tsx

  it("asks partner_live for the real plane as the page shows, with this browser's key (Stage 3 spec §11, §12)", async () => {
    const { f, store } = connectedAsB()
    render(<Root door={f.door} store={store} />)
    await pollAnswered()
    await settle()
    expect(f.liveCalls).toEqual([`live ${key(1)} null`])
  })

  it('goes back to the welcome screen, naming the pilot, when partner_live says sharing has ended', async () => {
    const { f, store } = connectedAsB()
    f.door.live = async () => ({ error: 'sharing_ended' })
    render(<Root door={f.door} store={store} />)
    expect(await waitFor(() => page().getByText('Sharing with Alex has ended.'))).toBeTruthy()
    expect(store.device()).toBeNull()
  })

  it('goes back to a plain welcome screen when another tab disconnected', async () => {
```

- [x] **Step 3: Run them, and see them fail.**

```bash
npx vitest run tests/ui/useLivePlane.test.tsx tests/ui/livePages.test.tsx tests/ui/Root.test.tsx
```

Expected: the first file fails to load (it can't find `src/ui/hooks/useLivePlane`); the status page shows "In flight" and the schedule's time; and Root's two new tests fail: it asks `partner_live` nothing, and so never hears that sharing has ended.

- [x] **Step 4: The page's live source.**

**Create `src/ui/hooks/useLivePlane.ts`:**

```ts
import { useEffect, useRef, useState } from 'preact/hooks'
import { watchedFlights } from '../../engine/liveLegs'
import type { Schedule } from '../../engine/types'
import type { LiveFlight } from '../../map/liveFlight'
import type { LiveFlightDoor } from '../../partner/door'
import { makeLiveSource } from '../../partner/liveSource'
import type { Device } from '../../partner/store'

/** What Crewlu Cloud last said of the pilot's flights: each by its leg's id, and its clock less this browser's. */
export interface LivePlane {
  flights: ReadonlyMap<string, LiveFlight>
  clockOffset: number
}

export const NO_LIVE_PLANE: LivePlane = { flights: new Map(), clockOffset: 0 }

export interface UseLivePlaneOptions {
  door: LiveFlightDoor
  /** This browser's connection, read before every call. */
  device: () => Device | null
  /** The summary's schedule, before any real time replaces its own: its flights are the ones to watch. */
  schedule: Schedule | null
  /** partner_live said sharing has ended. */
  onSharingEnded: () => void
}

/**
 * The status page's live plane (Stage 3 spec §11, §12): one source, made with the page and gone with it, as the app's
 * status screen owns its LiveFlightSource. It's told which flights to watch whenever the schedule changes, asks when
 * the page is shown and every 30 seconds while a flight's window is open, and stops while the page is hidden, so it
 * never asks in the background.
 */
export function useLivePlane({ door, device, schedule, onSharingEnded }: UseLivePlaneOptions): LivePlane {
  const latest = useRef({ device, onSharingEnded })
  latest.current = { device, onSharingEnded }
  const [source] = useState(() => makeLiveSource({
    door,
    device: () => latest.current.device(),
    onSharingEnded: () => latest.current.onSharingEnded(),
  }))
  const [plane, setPlane] = useState<LivePlane>(NO_LIVE_PLANE)

  // The flights to watch, told before the first ask. Keyed by their ids and times: the schedule is a new object at every refresh.
  const watched = schedule ? watchedFlights(schedule) : []
  const watchedKey = watched.map((l) => `${l.id}:${l.departure}:${l.arrival}`).join(',')
  useEffect(() => {
    source.watch(watched)
  }, [source, watchedKey])

  useEffect(() => {
    const stop = source.subscribe(() => setPlane({ flights: source.flights, clockOffset: source.clockOffset }))
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') source.pageHidden()
      else void source.pageShown()
    }
    document.addEventListener('visibilitychange', onVisibility)
    if (document.visibilityState !== 'hidden') void source.pageShown()
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
      source.pageHidden()
    }
  }, [source])

  return plane
}
```

- [x] **Step 5: `PartnerLive` owns it.** The door is the partner door with `live`, as `liveDoor` already is.

**In `src/ui/Root.tsx`, replace (1 of 7):**

```tsx
import { scheduleFromStored } from '../partner/convert'
import { liveDoor, type PartnerDoor } from '../partner/door'
import { joinWithLink, type JoinOutcome } from '../partner/join'
```

**with:**

```tsx
import { scheduleFromStored } from '../partner/convert'
import { liveDoor, type LiveFlightDoor, type PartnerDoor } from '../partner/door'
import { joinWithLink, type JoinOutcome } from '../partner/join'
```

**In `src/ui/Root.tsx`, replace (2 of 7):**

```tsx
import { useAirports } from './hooks/useAirports'
import { useSchedule } from './hooks/useSchedule'
```

**with:**

```tsx
import { useAirports } from './hooks/useAirports'
import { useLivePlane } from './hooks/useLivePlane'
import { useSchedule } from './hooks/useSchedule'
```

**In `src/ui/Root.tsx`, replace (3 of 7):**

```tsx
  /** Crewlu Cloud's partner door, and where this browser keeps its connection. Tests pass fakes. */
  door?: PartnerDoor
  store?: PartnerStore
```

**with:**

```tsx
  /** Crewlu Cloud's partner door, and where this browser keeps its connection. Tests pass fakes. */
  door?: PartnerDoor & LiveFlightDoor
  store?: PartnerStore
```

**In `src/ui/Root.tsx`, replace (4 of 7):**

```tsx
/** A browser's own connection: the welcome screen, joining, or its pilot's status (piece 5a §4, §5). */
function PartnerRoot({ door, given }: { door: PartnerDoor; given?: PartnerStore }) {
  const [store] = useState(() => given ?? localPartnerStore())
```

**with:**

```tsx
/** A browser's own connection: the welcome screen, joining, or its pilot's status (piece 5a §4, §5). */
function PartnerRoot({ door, given }: { door: PartnerDoor & LiveFlightDoor; given?: PartnerStore }) {
  const [store] = useState(() => given ?? localPartnerStore())
```

**In `src/ui/Root.tsx`, replace (5 of 7):**

```tsx
interface PartnerLiveProps {
  door: PartnerDoor
  store: PartnerStore
```

**with:**

```tsx
interface PartnerLiveProps {
  door: PartnerDoor & LiveFlightDoor
  store: PartnerStore
```

**In `src/ui/Root.tsx`, replace (6 of 7):**

```tsx
  })

```

**with:**

```tsx
  })
  // The real plane (Stage 3 spec §11, §12), asked for while this page shows. Sharing ended there ends it as a refresh
  // that meets it does: the key and the summary go, and the welcome screen says so.
  const live = useLivePlane({
    door,
    device: () => store.device(),
    schedule: schedule.schedule,
    onSharingEnded: () => {
      if (leaving.current) return
      const name = shown.current?.name ?? 'your pilot'
      store.forget()
      onEnded(name)
    },
  })

```

**In `src/ui/Root.tsx`, replace (7 of 7):**

```tsx
      quickStatusAt={(now) => (shown.current ? currentQuickStatus(shown.current, now) : null)}
      onLeave={() => void disconnect()}
```

**with:**

```tsx
      quickStatusAt={(now) => (shown.current ? currentQuickStatus(shown.current, now) : null)}
      live={live}
      onLeave={() => void disconnect()}
```

- [x] **Step 6: One landing time, written in once, and "about" on the countdown and the narrative.**

**In `src/ui/PilotPages.tsx`, replace (1 of 8):**

```tsx
import { buildLegs, type Leg } from '../engine/legs'
import { safeSnapshot, type Snapshot } from '../engine/snapshot'
import type { Schedule } from '../engine/types'
import { tripMapFor } from '../map/tripMapFor'
```

**with:**

```tsx
import { buildLegs, type Leg } from '../engine/legs'
import { estimatedArrival, liveMapFlights, withLiveTimes } from '../engine/liveLegs'
import { safeSnapshot, type Snapshot } from '../engine/snapshot'
import type { Schedule } from '../engine/types'
import type { MapFlight } from '../map/mapFlight'
import { tripMapFor } from '../map/tripMapFor'
```

**In `src/ui/PilotPages.tsx`, replace (2 of 8):**

```tsx
import { useLandingWeather } from './hooks/useLandingWeather'
import type { ScheduleHandle } from './hooks/useSchedule'
```

**with:**

```tsx
import { useLandingWeather } from './hooks/useLandingWeather'
import type { LivePlane } from './hooks/useLivePlane'
import type { ScheduleHandle } from './hooks/useSchedule'
```

**In `src/ui/PilotPages.tsx`, replace (3 of 8):**

```tsx
  notice?: string | null
}

```

**with:**

```tsx
  notice?: string | null
  /** What Crewlu Cloud has said of the pilot's flights: the live page's source, or the demo's made-up planes. */
  live?: LivePlane | null
}

const NO_FLIGHTS: ReadonlyMap<string, MapFlight> = new Map()

```

**In `src/ui/PilotPages.tsx`, replace (4 of 8):**

```tsx
  schedule, airports, demo, onLeave, loadWeather = demo ? loadDemoWeather : loadLiveWeather,
  loadLanding = demo ? loadDemoLandingForecast : loadLiveLandingForecast, quickStatusAt, notice = null,
}: PilotPagesProps) {
```

**with:**

```tsx
  schedule, airports, demo, onLeave, loadWeather = demo ? loadDemoWeather : loadLiveWeather,
  loadLanding = demo ? loadDemoLandingForecast : loadLiveLandingForecast, quickStatusAt, notice = null, live = null,
}: PilotPagesProps) {
```

**In `src/ui/PilotPages.tsx`, replace (5 of 8):**

```tsx
  const unit = useMemo(() => tempUnitFor(), [])
  const built = useMemo<{ s: Schedule; legs: Leg[] } | null>(() => {
    const s = schedule.schedule
    if (!s) return null
    try {
      return { s, legs: buildLegs(s) }
    } catch (err) {
```

**with:**

```tsx
  const unit = useMemo(() => tempUnitFor(), [])
  // One landing time (Stage 3 spec §7.1): each flight Crewlu Cloud has seen gets the real plane's times here, once for
  // every card, at each new schedule, each new answer, and each minute while there's one, as an estimate moves by itself.
  const hasLive = live != null && live.flights.size > 0
  const minute = hasLive ? Math.floor(now / 60_000) : 0
  const built = useMemo<{ s: Schedule; legs: Leg[]; flights: ReadonlyMap<string, MapFlight> } | null>(() => {
    const summary = schedule.schedule
    if (!summary) return null
    try {
      const placeOf = (code: string) => {
        const airport = airports.get(code)
        return airport ? { lat: airport.lat, lng: airport.lng } : null
      }
      const flights = hasLive ? liveMapFlights(summary, live.flights, live.clockOffset, placeOf) : NO_FLIGHTS
      const s = withLiveTimes(summary, flights, now)
      return { s, legs: buildLegs(s), flights }
    } catch (err) {
```

**In `src/ui/PilotPages.tsx`, replace (6 of 8):**

```tsx
    }
  }, [schedule.schedule])

```

**with:**

```tsx
    }
  }, [schedule.schedule, live, airports, minute])

```

**In `src/ui/PilotPages.tsx`, replace (7 of 8):**

```tsx
  // snap is only set with ready, so the legs are always there; the fallback is for the type checker.
  const tripMap = snap ? tripMapFor(snap, ready?.legs ?? [], airports) : null
  const land = useLand(tripMap != null)
```

**with:**

```tsx
  // snap is only set with ready, so the legs are always there; the fallback is for the type checker.
  const tripMap = snap ? tripMapFor(snap, ready?.legs ?? [], airports, ready?.flights) : null
  const land = useLand(tripMap != null)
```

**In `src/ui/PilotPages.tsx`, replace (8 of 8):**

```tsx
  const quickStatus = quickStatusAt?.(now) ?? null
  const status = { snap, now, viewerTz, homeTz, h24, airports, weather, demo, celebrateKey, footer, notice, quickStatus, tripMap, land, facts, onOpenMap: mapPage.show }
  // A #map address with no trip to draw falls through to the status page (moving map spec §6).
```

**with:**

```tsx
  const quickStatus = quickStatusAt?.(now) ?? null
  // The flight in the air's arrival, while it's the real plane's estimate: the cards say "about" of it (Stage 3 spec §9).
  const estimated = ready ? estimatedArrival(ready.legs, ready.flights, now) : null
  const status = {
    snap, now, viewerTz, homeTz, h24, airports, weather, demo, celebrateKey, footer, notice, quickStatus, tripMap, land, facts,
    onOpenMap: mapPage.show, estimatedArrival: estimated,
  }
  // A #map address with no trip to draw falls through to the status page (moving map spec §6).
```

**In `src/ui/StatusScreen.tsx`, replace (1 of 4):**

```tsx
  onOpenMap?: () => void
}
```

**with:**

```tsx
  onOpenMap?: () => void
  /** When the flight in the air reaches its gate, while that's the real plane's estimate: the narrative and the countdown say "about" (Stage 3 spec §9). */
  estimatedArrival?: number | null
}
```

**In `src/ui/StatusScreen.tsx`, replace (2 of 4):**

```tsx
  const inTheirPlace = () => [inFlightHeading.current, locationHeading.current, titleHeading.current].find((el) => el?.isConnected) ?? null
  const spans = safeNarrative(snap, { now: p.now, viewerTz: p.viewerTz, h24: p.h24, airports: p.airports })
  const airport = snap.status.airport
```

**with:**

```tsx
  const inTheirPlace = () => [inFlightHeading.current, locationHeading.current, titleHeading.current].find((el) => el?.isConnected) ?? null
  const spans = safeNarrative(snap, { now: p.now, viewerTz: p.viewerTz, h24: p.h24, airports: p.airports, estimatedArrival: p.estimatedArrival })
  const airport = snap.status.airport
```

**In `src/ui/StatusScreen.tsx`, replace (3 of 4):**

```tsx

function AwayCard({ snap, now, homeTz, h24, airports, celebrateKey, onOpenSchedule }: StatusScreenProps) {
  const arrival = snap.arrival
```

**with:**

```tsx

function AwayCard({ snap, now, homeTz, h24, airports, celebrateKey, onOpenSchedule, estimatedArrival }: StatusScreenProps) {
  const arrival = snap.arrival
```

**In `src/ui/StatusScreen.tsx`, replace (4 of 4):**

```tsx
  const city = airports.city(arrival.airport)
  const when = arrivalWhenText(arrival.time, homeTz, h24)
  return (
```

**with:**

```tsx
  const city = airports.city(arrival.airport)
  // A time that's the real plane's estimate reads "About" (Stage 3 spec §9).
  const isEstimate = estimatedArrival != null && Math.abs(arrival.time - estimatedArrival) < 1000
  const when = `${isEstimate ? 'About ' : ''}${arrivalWhenText(arrival.time, homeTz, h24)}`
  return (
```

- [x] **Step 7: Run them again.** Expected: 58 tests pass. Then `npx tsc --noEmit`: nothing.

- [x] **Step 8: Commit, on Todd's yes (after batch C's checkpoint).**

```bash
git add src/ui/hooks/useLivePlane.ts src/ui/Root.tsx src/ui/PilotPages.tsx src/ui/StatusScreen.tsx tests/fixtures/partner.ts tests/ui/Root.test.tsx tests/ui/useLivePlane.test.tsx tests/ui/livePages.test.tsx
git commit -m "The status page asks Crewlu Cloud for the live plane while it's shown and gives each flight it has seen the real plane's times, so the map and every card show one landing time (Stage 3 spec §7.1, §9, §11, §12)"
```

---

### Task 9: The demo scenes

Three new scenes, with made-up real planes (Todd, 15 Nov 2026): `live-ahead`, `live-ocean-gap` and `live-on-ground-late` (spec §12). `flying` stays the schedule's alone. The demo asks `partner_live` nothing: `DemoApp` works its plane out from the clock every 30 seconds, and as the page is shown again.

**Files:**
- Create: `src/data/demoLive.ts`
- Modify: `src/data/demo.ts`, `src/ui/Root.tsx`, `README.md`, `tests/data/demoScenes.test.ts`, `tests/ui/StatusScreen.test.tsx`, `tests/ui/Root.test.tsx`
- Test: `tests/data/demoLive.test.ts`

- [x] **Step 1: Write the tests.** The demo's tables of scenes gain the three: on the schedule alone, each is in the air.

**Create `tests/data/demoLive.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { liveLabelText } from '../../src/copy/tripMap'
import { DEMO_SCENES, demoRawForScene, type DemoScene } from '../../src/data/demo'
import { demoLiveFlights, isLiveDemoScene } from '../../src/data/demoLive'
import { liveMapFlights } from '../../src/engine/liveLegs'
import { buildSchedule } from '../../src/engine/normalize'
import { mapFlightProgress } from '../../src/map/mapFlight'
import { testAirports } from '../fixtures/airports'

const NOW = Date.UTC(2026, 9, 20, 16, 0)
const MINUTE = 60_000

const placeOf = (code: string) => {
  const airport = testAirports.get(code)
  return airport ? { lat: airport.lat, lng: airport.lng } : null
}

/** The scene's real plane `minutes` after it opens, as the status page would see it: its phase, label, and path. */
function sceneAt(scene: DemoScene, minutes = 0) {
  const schedule = buildSchedule(demoRawForScene(scene, NOW), NOW)
  const at = NOW + minutes * MINUTE
  const answered = demoLiveFlights(scene, schedule, placeOf, at)
  const flights = liveMapFlights(schedule, answered, 0, placeOf)
  const [flight] = [...flights.values()]
  if (!flight) return null
  const progress = mapFlightProgress(flight, at)
  return { flight, progress, label: progress.label ? liveLabelText(progress.label) : null }
}

describe("the demo's made-up real planes (Stage 3 spec §12)", () => {
  it('live-ahead: in the air on the way to Rockford, 10 minutes ahead, seen all the way', () => {
    const scene = sceneAt('live-ahead')!
    expect(scene.progress.phase).toBe('inAir')
    expect(scene.label).toBe('10 min ahead')
    expect(scene.flight.path.stretches.every((s) => s.kind !== 'unseen')).toBe(true)
    expect(scene.flight.live?.callsign).toBe('UPS2961')
  })

  it('live-ocean-gap: faded past a stretch nobody saw, on the way to Anchorage', () => {
    const scene = sceneAt('live-ocean-gap')!
    expect(scene.progress.phase).toBe('estimated')
    expect(scene.label).toMatch(/^About \d+ min behind$/)
    expect(scene.flight.path.stretches.some((s) => s.kind === 'unseen')).toBe(true)
    expect(scene.flight.live?.callsign).toBe('UPS2963')
  })

  it("live-on-ground-late: still at Rockford's gate, 20 minutes after the plan's takeoff", () => {
    const scene = sceneAt('live-on-ground-late')!
    expect(scene.progress.phase).toBe('onGround')
    expect(scene.label).toBe('Still on the ground · 20 min behind')
  })

  it('stays itself while the page is open', () => {
    expect(sceneAt('live-ahead', 20)?.label).toBe('10 min ahead')
    expect(sceneAt('live-ocean-gap', 60)?.progress.phase).toBe('estimated')
    expect(sceneAt('live-on-ground-late', 60)?.label).toBe('Still on the ground · 1 h 20 min behind')
  })

  it('lands live-ahead when it is due, 10 minutes early', () => {
    expect(sceneAt('live-ahead', 45)?.label).toBe('Landed 10 min early')
  })

  it('gives every other scene no real plane, so `flying` stays the schedule’s alone', () => {
    for (const scene of Object.keys(DEMO_SCENES) as DemoScene[]) {
      if (isLiveDemoScene(scene)) continue
      const schedule = buildSchedule(demoRawForScene(scene, NOW), NOW)
      expect(demoLiveFlights(scene, schedule, placeOf, NOW).size, scene).toBe(0)
    }
  })

  it('gives none when its flight or its airports are missing', () => {
    const schedule = buildSchedule(demoRawForScene('live-ahead', NOW), NOW)
    expect(demoLiveFlights('live-ahead', schedule, () => null, NOW).size).toBe(0)
    expect(demoLiveFlights('live-ahead', { ...schedule, trips: [] }, placeOf, NOW).size).toBe(0)
  })
})
```

**In `tests/data/demoScenes.test.ts`, replace (1 of 2):**

```ts
  recap: 'home',
}
```

**with:**

```ts
  recap: 'home',
  // On the schedule alone: the real planes are demoLive's (tests/data/demoLive.test.ts).
  'live-ahead': 'inFlight',
  'live-ocean-gap': 'inFlight',
  'live-on-ground-late': 'inFlight',
}
```

**In `tests/data/demoScenes.test.ts`, replace (2 of 2):**

```ts
    recap: { upcoming: { tripId: 'demo-t2', days: 3, route: ['SDF', 'ONT', 'RFD'], departs: NOW + 7740 * MIN } },
  }
```

**with:**

```ts
    recap: { upcoming: { tripId: 'demo-t2', days: 3, route: ['SDF', 'ONT', 'RFD'], departs: NOW + 7740 * MIN } },
    'live-ahead': { progress: { day: 1, days: 2, upcoming: ['ANC', 'SDF'] } },
    'live-ocean-gap': { progress: { day: 1, days: 2, upcoming: ['SDF'] } },
    'live-on-ground-late': { progress: { day: 1, days: 2, upcoming: ['SDF'] } },
  }
```

**In `tests/ui/StatusScreen.test.tsx`, replace (1 of 2):**

```tsx
    recap: 'Lexington',
  }
```

**with:**

```tsx
    recap: 'Lexington',
    'live-ahead': null,
    'live-ocean-gap': null,
    'live-on-ground-late': null,
  }
```

**In `tests/ui/StatusScreen.test.tsx`, replace (2 of 2):**

```tsx
    )
    expect(container.querySelector('.inflight') != null).toBe(scene === 'flying' || scene === 'last-leg')
  })
```

**with:**

```tsx
    )
    expect(container.querySelector('.inflight') != null).toBe(['flying', 'last-leg', 'live-ahead', 'live-ocean-gap', 'live-on-ground-late'].includes(scene))
  })
```

**In `tests/ui/Root.test.tsx`, replace:**

```tsx
    await waitFor(() => expect(window.location.search).toBe(''))
  })
})
```

**with:**

```tsx
    await waitFor(() => expect(window.location.search).toBe(''))
  })

  it("shows a live scene's made-up real plane, and asks partner_live nothing (Stage 3 spec §12)", async () => {
    window.history.replaceState(null, '', '/?demo=1&scene=live-ahead')
    const { f, store } = setUp()
    render(<Root door={f.door} store={store} />)
    expect(await screen.findByText('10 min ahead')).toBeTruthy()
    expect(f.liveCalls).toEqual([])
  })

  it('answers the made-up plane afresh every 30 seconds, as partner_live would be: it lands when it is due', async () => {
    window.history.replaceState(null, '', '/?demo=1&scene=live-ahead')
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    try {
      const { f, store } = setUp()
      render(<Root door={f.door} store={store} />)
      expect(await screen.findByText('10 min ahead')).toBeTruthy()
      // It touches down 33 minutes after the scene opens, and reaches the gate 7 minutes after that.
      await act(async () => {
        vi.advanceTimersByTime(36 * 60_000)
      })
      expect(await screen.findByText('Landed 10 min early')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('answers the made-up plane afresh as the page is shown again, as a hidden tab may have missed its 30 seconds', async () => {
    window.history.replaceState(null, '', '/?demo=1&scene=live-ahead')
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    try {
      const { f, store } = setUp()
      render(<Root door={f.door} store={store} />)
      expect(await screen.findByText('10 min ahead')).toBeTruthy()
      // The clock moves on with no 30-second answer, as in a tab the browser held back, and then the page is shown.
      vi.setSystemTime(Date.now() + 36 * 60_000)
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'))
        vi.advanceTimersByTime(1000)
      })
      expect(await screen.findByText('Landed 10 min early')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/data/demoLive.test.ts tests/data/demoScenes.test.ts tests/ui/StatusScreen.test.tsx tests/ui/Root.test.tsx
```

Expected: the first file fails to load (it can't find `src/data/demoLive`), the three new scenes aren't scenes yet, and Root's new tests find no "10 min ahead".

- [x] **Step 3: The made-up planes, and the scenes.**

**Create `src/data/demoLive.ts`:**

```ts
import type { Move, Schedule } from '../engine/types'
import { airborneWindow } from '../map/flightProgress'
import { distanceMeters, pointAlong, type GeoPoint } from '../map/greatCircle'
import type { LiveFix, LiveFlight, TrailPoint } from '../map/liveFlight'
import { flatMapAngle } from '../map/planeHeading'
import { MINUTE } from '../time/zoned'

/**
 * The demo's real planes (Stage 3 spec §12): made up, as the shared cases' are (Todd, 15 Nov 2026), so no real flight's
 * data is in the site. Each is worked out from the moment shown, as partner_live would answer then, so a scene stays
 * itself for as long as the page is open: the plane flies on, and lands when it's due.
 */

export type LiveDemoScene = 'live-ahead' | 'live-ocean-gap' | 'live-on-ground-late'

interface Story {
  /** The flight's number in the demo's trip. */
  number: string
  /** How far north of the great circle the made-up path bows at its middle, in degrees: a real route is rarely straight. */
  bow: number
  /** How many minutes after the plan's takeoff the plane takes off, early when negative. Null: it's still at the gate. */
  takeoffLate: number | null
  /** Stretches nobody saw, in minutes after the takeoff, from and to. */
  unseen: [number, number][]
  /** Minutes after the takeoff it was last seen, or null when it's seen all the way. */
  lastSeen: number | null
}

const STORIES: Record<LiveDemoScene, Story> = {
  // Louisville to Rockford, off ten minutes early and seen all the way, on the great circle: "10 min ahead".
  'live-ahead': { number: '2961', bow: 0, takeoffLate: -10, unseen: [], lastSeen: null },
  // Rockford to Anchorage, off 25 minutes late, unseen for 35 minutes over northern Canada, where adsb.lol has no
  // receivers (spec §2.1), then seen again, and not since: faded, an estimate, "About … behind".
  'live-ocean-gap': { number: '2963', bow: 2.5, takeoffLate: 25, unseen: [[90, 125]], lastSeen: 150 },
  // Rockford to Anchorage, still at the gate twenty minutes after the plan's takeoff.
  'live-on-ground-late': { number: '2963', bow: 0, takeoffLate: null, unseen: [], lastSeen: null },
}

export const isLiveDemoScene = (scene: string): scene is LiveDemoScene => Object.prototype.hasOwnProperty.call(STORIES, scene)

/** A fix seen 20 seconds before the moment shown, as Crewlu Cloud asks adsb.lol every minute. */
const FIX_AGE_MS = 20_000

/**
 * The demo's real plane at `now` for `scene`, by its leg's id, as the live source would hold it: none for a scene
 * without one, or when its flight or airports aren't found.
 */
export function demoLiveFlights(scene: string, schedule: Schedule, placeOf: (code: string) => GeoPoint | null, now: number): ReadonlyMap<string, LiveFlight> {
  if (!isLiveDemoScene(scene)) return new Map()
  const story = STORIES[scene]
  const move = schedule.trips.flatMap((t) => t.dutyPeriods.flatMap((dp) => dp.flights)).find((m) => m.number === story.number)
  const from = move ? placeOf(move.dep) : null
  const to = move ? placeOf(move.arr) : null
  if (!move || !from || !to) return new Map()
  const flight = madeUp(story, move, from, to, now)
  return flight ? new Map([[move.id, flight]]) : new Map()
}

function fixAt(place: GeoPoint, trackDeg: number | null, seenAt: number, onGround: boolean): LiveFix {
  return {
    place, altitudeFt: onGround ? null : 35_000, groundSpeedKt: onGround ? 0 : 460, trackDeg, onGround, registration: null, typeCode: 'B763', seenAt,
  }
}

function madeUp(story: Story, move: Move, from: GeoPoint, to: GeoPoint, now: number): LiveFlight | null {
  const plan = airborneWindow(move.start, move.end)
  if (!plan) return null
  const base = { legId: move.id, callsign: `UPS${move.number}`, landedAt: null }
  if (story.takeoffLate == null) return { ...base, state: 'ground', fix: fixAt(from, null, now - FIX_AGE_MS, true), trail: [] }
  // It flies the plan's speed along a path that bows north of the great circle, so a longer path takes longer.
  const along = (fraction: number): GeoPoint => {
    const p = pointAlong(from, to, fraction)
    return { lat: p.lat + story.bow * Math.sin(Math.PI * fraction), lng: p.lng }
  }
  const steps = Array.from({ length: 65 }, (_, i) => along(i / 64))
  const length = steps.slice(1).reduce((sum, p, i) => sum + distanceMeters(steps[i], p), 0)
  const takeoff = plan.start + story.takeoffLate * MINUTE
  const inAir = (plan.end - plan.start) * (length / distanceMeters(from, to))
  const touchdown = takeoff + inAir
  const place = (t: number) => along(Math.min(Math.max((t - takeoff) / inAir, 0), 1))
  const track = (t: number) => {
    const angle = flatMapAngle(place(t), place(t + MINUTE))
    return angle == null ? null : ((angle * 180) / Math.PI + 90 + 360) % 360
  }
  const lastSeen = story.lastSeen == null ? Infinity : takeoff + story.lastSeen * MINUTE
  const isUnseen = (t: number) => story.unseen.some(([a, b]) => t >= takeoff + a * MINUTE && t < takeoff + b * MINUTE)
  // A point a minute, up to a minute before the moment shown, as a trail's points come.
  const trail: TrailPoint[] = []
  for (let t = takeoff + MINUTE; t <= Math.min(now - MINUTE, lastSeen, touchdown); t += MINUTE) {
    if (!isUnseen(t)) trail.push({ time: t, place: place(t), altitudeFt: 35_000 })
  }
  if (lastSeen === Infinity && now - FIX_AGE_MS >= touchdown) {
    return { ...base, state: 'landed', landedAt: touchdown, fix: fixAt(to, null, now - FIX_AGE_MS, true), trail }
  }
  const seenAt = Math.min(now - FIX_AGE_MS, lastSeen)
  return { ...base, state: 'airborne', fix: fixAt(place(seenAt), track(seenAt), seenAt, false), trail }
}
```

**In `src/data/demo.ts`, replace (1 of 2):**

```ts
  | 'last-leg' | 'driving-home' | 'commuting-home' | 'reserve' | 'training' | 'nothing-ahead' | 'recap'

```

**with:**

```ts
  | 'last-leg' | 'driving-home' | 'commuting-home' | 'reserve' | 'training' | 'nothing-ahead' | 'recap'
  | 'live-ahead' | 'live-ocean-gap' | 'live-on-ground-late'

```

**In `src/data/demo.ts`, replace (2 of 2):**

```ts
  recap: { variant: 'driver', offset: 2400 },
}
```

**with:**

```ts
  recap: { variant: 'driver', offset: 2400 },
  // The real plane (Stage 3 spec §12), made up in demoLive.ts: ahead on the way to Rockford, the moment `flying` shows;
  // faded past a stretch nobody saw on the way to Anchorage; and still at Rockford's gate 20 minutes after the plan's
  // takeoff. `flying` stays the schedule's alone.
  'live-ahead': { variant: 'driver', offset: 100 },
  'live-ocean-gap': { variant: 'driver', offset: 460 },
  'live-on-ground-late': { variant: 'driver', offset: 260 },
}
```

**In `src/ui/Root.tsx`, replace (1 of 3):**

```tsx
import { DEFAULT_SCENE, demoRawForScene, isDemoScene, type DemoScene } from '../data/demo'
import { buildSchedule } from '../engine/normalize'
```

**with:**

```tsx
import { DEFAULT_SCENE, demoRawForScene, isDemoScene, type DemoScene } from '../data/demo'
import { demoLiveFlights, isLiveDemoScene } from '../data/demoLive'
import { buildSchedule } from '../engine/normalize'
```

**In `src/ui/Root.tsx`, replace (2 of 3):**

```tsx
import { joinWithLink, type JoinOutcome } from '../partner/join'
import { browserLabel, platformOf } from '../partner/label'
```

**with:**

```tsx
import { joinWithLink, type JoinOutcome } from '../partner/join'
import { LIVE_INTERVAL_MS } from '../partner/liveSource'
import { browserLabel, platformOf } from '../partner/label'
```

**In `src/ui/Root.tsx`, replace (3 of 3):**

```tsx
  const schedule = useSchedule({ load: async () => buildSchedule({ ...demoRawForScene(scene, anchor), fetchedAt: Date.now() }, Date.now()) })
  if (!airports) return null
  return (
    <PilotPages schedule={schedule} airports={airports} demo onLeave={() => { window.location.href = window.location.pathname }} />
  )
```

**with:**

```tsx
  const schedule = useSchedule({ load: async () => buildSchedule({ ...demoRawForScene(scene, anchor), fetchedAt: Date.now() }, Date.now()) })
  // The scene's made-up real plane, answered afresh every 30 seconds and as the page is shown again, as partner_live
  // would be. A scene without one has none.
  const [asked, setAsked] = useState(() => Date.now())
  useEffect(() => {
    if (!isLiveDemoScene(scene)) return
    const ask = () => setAsked(Date.now())
    const tick = setInterval(ask, LIVE_INTERVAL_MS)
    const onShown = () => {
      if (document.visibilityState === 'visible') ask()
    }
    document.addEventListener('visibilitychange', onShown)
    return () => {
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onShown)
    }
  }, [scene])
  const live = useMemo(() => {
    const s = schedule.schedule
    if (!isLiveDemoScene(scene) || !s || !airports) return null
    const placeOf = (code: string) => {
      const airport = airports.get(code)
      return airport ? { lat: airport.lat, lng: airport.lng } : null
    }
    return { flights: demoLiveFlights(scene, s, placeOf, asked), clockOffset: 0 }
  }, [scene, schedule.schedule, airports, asked])
  if (!airports) return null
  return (
    <PilotPages schedule={schedule} airports={airports} demo live={live} onLeave={() => { window.location.href = window.location.pathname }} />
  )
```

**In `README.md`, replace:**

```md
  - A marker shows what the pilot is doing on the ground: a bed on a layover (`layover`), an hourglass at a turn (`turn`), a briefcase at base (`base`), a house at home (`home`).
  - The full map's timeline is colored by what the pilot is doing. Its "Quick layovers" switch, on by default and remembered in the browser, hurries a replay through each wait.
```

**with:**

```md
  - A marker shows what the pilot is doing on the ground: a bed on a layover (`layover`), an hourglass at a turn (`turn`), a briefcase at base (`base`), a house at home (`home`).
  - The real plane, from Crewlu Cloud's `partner_live` (Stage 3): `live-ahead` (in the air, ahead of schedule), `live-ocean-gap` (faded, an estimate past a stretch nobody saw) and `live-on-ground-late` (still at the gate after the plan's takeoff), with made-up flights. `flying` stays the schedule's alone.
  - The full map's timeline is colored by what the pilot is doing. Its "Quick layovers" switch, on by default and remembered in the browser, hurries a replay through each wait.
```

- [x] **Step 4: Run them again.** Expected: 194 tests pass. Then `npx tsc --noEmit`: nothing.

- [x] **Step 5: Batch C's review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Tasks 8 and 9, against the spec's §7, §9, §11, §12 and §13, and this plan's list. Ask it in particular about the page: an order of events that asks from a hidden page, a call left out after the page is gone, sharing ended twice, and anything that reads the schedule's own times after Task 8.

- [x] **Step 6: Batch C's checkpoint: Todd runs everything.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && npm run build
```

Expected: 161 test files and 3,377 tests pass, and the build ends `✓ built`.

- [x] **Step 7: Commit, on Todd's yes.** Task 8's commit, then:

```bash
git add src/data/demoLive.ts src/data/demo.ts src/ui/Root.tsx README.md tests/data/demoLive.test.ts tests/data/demoScenes.test.ts tests/ui/StatusScreen.test.tsx tests/ui/Root.test.tsx
git commit -m "Three demo scenes with a made-up real plane: ahead of schedule, faded past a stretch nobody saw, and still at the gate after the plan's takeoff (Stage 3 spec §12)"
```

---

### Task 10: Todd looks at the demo scenes

The tests check Apple's map against a stand-in. This is the look at the real one (spec §16.4). Nothing is committed here unless something needs changing.

- [x] **Step 1: Give the worktree the MapKit token.** Apple's map shows locally only with the dev token in `.env.local` (README, "Apple's map needs a MapKit JS token"), which git ignores, and the worktree has none. Copy the main checkout's, which only reads it: `cp "/Users/toddanderson/Dev/Crewluve Website/.env.local" .env.local`. Never print it or commit it. It lasts 7 days, and the main checkout's was made on 14 Nov 2026: if the site's own map shows instead of Apple's, it has run out, and Todd makes another as the README says.

- [x] **Step 2: Start the site with Apple's map.** The session starts the `crewluve-mapkit` server (`.claude/launch.json`, port 5182) with its preview tool, and gives Todd the addresses:
  - `http://localhost:5182/?demo=1&scene=live-ahead`
  - `http://localhost:5182/?demo=1&scene=live-ocean-gap`, and the same with `#map` at the end
  - `http://localhost:5182/?demo=1&scene=live-on-ground-late`
  - `http://localhost:5182/?demo=1&scene=flying`, which should look as it always has.

- [x] **Step 3: Todd looks, on the card and the full map, in hybrid, the standard map (light and dark) and satellite:**
  - the real plane, a blue circle with a white plane, on top of its ghost, a dashed outline; faded in `live-ocean-gap`;
  - the path: solid where the plane was seen, dotted over northern Canada and from the last place seen to the faded plane, dashed ahead; white on hybrid and satellite, blue on the light standard map;
  - **that dashes and dots don't crawl** as the faded plane moves: watch `live-ocean-gap` for a minute, and play a replay. (This plan writes them from the end that stays still, on the belief that MapKit JS starts a pattern at a line's first place. If they crawl on Apple's map but not on the site's own, say so.)
  - the bar's label ("10 min ahead", "About 20 min behind", "Still on the ground · 20 min behind"), "Lands about …", and the pill; and in a replay, "In flight" and the real plane alone.

- [x] **Step 4: Write down what was wrong.** Anything that needs a change goes in "Changes made during execution", is fixed in its own task's files with a test where a test can see it, and has Todd run that task's tests again.

---

### Task 11: Which plane is which: the key and the popup

Todd's look (Task 10) found the real plane and its ghost hard to tell apart. The design, approved with him on 16 Nov 2026, is `docs/superpowers/specs/2026-11-16-trip-map-which-plane-design.md` (committed as `2b222bb`): a key to the two planes on the card and the full map while both show, and on the full map a popup on each plane when it's pointed at or tapped, on Apple's map and the site's own. This task also brings the design's words in line with what was built and approved: a landed plane reaches the gate "at" a time, and the popup is hidden from screen readers, as the key is.

**Files:**
- Create: `src/copy/planePopup.ts`, `src/ui/PlanePopup.tsx`, `src/ui/PlaneKey.tsx`
- Modify: `src/map/tripMapDrawing.ts`, `src/map/mapkitApi.ts`, `src/ui/TripMapSvg.tsx`, `src/ui/AppleTripMap.tsx`, `src/ui/TripMapCard.tsx`, `src/ui/TripMapPage.tsx`, `src/styles/tripMap.css`, `docs/superpowers/specs/2026-11-16-trip-map-which-plane-design.md`
- Test: `tests/copy/planePopup.test.ts`, `tests/map/planeKey.test.ts`, `tests/ui/planePopup.test.tsx`; modify `tests/fixtures/fakeMapKit.ts` (the stand-in for MapKit puts its marks inside the map, as MapKit does, and says where a place is on the page)

- [x] **Step 1: Write the tests.**

**In `tests/fixtures/fakeMapKit.ts`, replace (1 of 5):**

```ts
  visibleMapRect: MapRect | null
  fire(type: string): void
```

**with:**

```ts
  visibleMapRect: MapRect | null
  /** Where every place is on the page, as `convertCoordinateToPointOnPage` says: the middle of a 390 by 300 map, until a test moves it. */
  pagePoint: { x: number; y: number }
  fire(type: string): void
```

**In `tests/fixtures/fakeMapKit.ts`, replace (2 of 5):**

```ts
    visibleMapRect: MapRect | null = null
    private events = new Map<string, (() => void)[]>()
```

**with:**

```ts
    visibleMapRect: MapRect | null = null
    pagePoint = { x: 195, y: 150 }
    private events = new Map<string, (() => void)[]>()
```

**In `tests/fixtures/fakeMapKit.ts`, replace (3 of 5):**

```ts
    }
    addAnnotation(a: Annotation) {
      this.annotations.push(a)
    }
```

**with:**

```ts
    }
    // As MapKit does, an annotation's element goes inside the map, over the ones added before it.
    addAnnotation(a: Annotation) {
      this.annotations.push(a)
      this.parent.appendChild(a.element)
    }
```

**In `tests/fixtures/fakeMapKit.ts`, replace (4 of 5):**

```ts
      this.annotations = this.annotations.filter((x) => x !== a)
    }
```

**with:**

```ts
      this.annotations = this.annotations.filter((x) => x !== a)
      a.element.remove()
    }
```

**In `tests/fixtures/fakeMapKit.ts`, replace (5 of 5):**

```ts
      this.visibleMapRect = rect
    }
```

**with:**

```ts
      this.visibleMapRect = rect
    }
    convertCoordinateToPointOnPage() {
      return this.pagePoint
    }
```

**Create `tests/copy/planePopup.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { shortTimeText } from '../../src/copy/format'
import { planePopupWords } from '../../src/copy/planePopup'
import { landsAt } from '../../src/copy/tripMap'
import { makeMapFlight } from '../../src/map/mapFlight'
import type { MapLeg } from '../../src/map/tripMap'
import { airport, at, caseFlight, LIVE_CASES } from '../map/liveCases'

const NY = 'America/New_York'
const time = (ms: number) => shortTimeText(ms, NY, false)

/** A shared case's flight as the map's leg at one of its moments, with its real times then. */
function caseLeg(name: string, moment = 0): { leg: MapLeg; t: number } {
  const flightCase = LIVE_CASES.flights.find((f) => f.name === name)!
  const m = flightCase.moments[moment]
  const flight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), airport(flightCase.from), airport(flightCase.to), caseFlight(flightCase.flight))!
  const mark = (code: string) => ({ code, city: code, place: airport(code), timeZone: NY })
  return {
    leg: { id: 'f1', kind: 'flight', origin: mark(flightCase.from), destination: mark(flightCase.to), start: at(m.start), end: at(m.end), flightNumber: 'UPS207', flight },
    t: at(m.at),
  }
}

/** The real plane's popup in a shared case's moment, now. */
function realPlane(name: string, moment = 0) {
  const { leg, t } = caseLeg(name, moment)
  return { leg, t, words: planePopupWords(leg, 'realPlane', t, false, NY, false) }
}

describe("a plane's popup (which plane design §3)", () => {
  it('calls the ghost the schedule', () => {
    const { leg, t } = caseLeg('ahead, in the air')
    expect(planePopupWords(leg, 'ghost', t, false, NY, false)).toEqual({ title: 'On schedule', lines: ['Where UPS207 would be if it were on time'] })
  })

  it("names the real plane in the air, with the bar's words and when it lands", () => {
    const { leg, words } = realPlane('ahead, in the air')
    expect(words).toEqual({ title: 'UPS207 · real plane', lines: ['14 min ahead', landsAt(leg, NY, false)] })
    expect(landsAt(leg, NY, false)).toBe(`Lands about ${time(leg.end)}`)
  })

  it('names the real plane still at the gate after its takeoff time', () => {
    const { leg, words } = realPlane('still on the ground twenty minutes after')
    expect(words).toEqual({ title: 'UPS207 · real plane', lines: ['Still on the ground · 20 min behind', landsAt(leg, NY, false)] })
  })

  it('calls a faded plane a best guess, says when it was last seen, and lands it about its estimate', () => {
    const { leg, words } = realPlane('ahead, in the air', 2)
    const seen = leg.flight!.live!.fix!.seenAt
    expect(words).toEqual({
      title: 'UPS207 · best guess',
      lines: [`Not seen since ${time(seen)}, so it's drawn where it should be by now`, `About 14 min ahead · lands about ${time(leg.end)}`],
    })
  })

  it('says when a landed plane reaches the gate', () => {
    const { leg, words } = realPlane('landed, seen all the way')
    expect(words).toEqual({ title: 'UPS207 · real plane', lines: ['Landed 23 min early', `Reaches the gate at ${time(leg.end)}`] })
  })

  it('says only which plane it is when it came down somewhere else, with no label to give', () => {
    expect(realPlane('on the ground somewhere else').words).toEqual({ title: 'UPS207 · real plane', lines: [] })
  })

  it('names a real plane with no live data, and says nothing more', () => {
    const { leg, t } = caseLeg('ahead, in the air')
    const { flight: _, ...scheduleOnly } = leg
    expect(planePopupWords(scheduleOnly, 'realPlane', t, false, NY, false)).toEqual({ title: 'UPS207 · real plane', lines: [] })
  })

  it('says where the real plane was at a moment of the replay', () => {
    const { leg, t } = caseLeg('ahead, in the air')
    expect(planePopupWords(leg, 'realPlane', t, true, NY, false)).toEqual({ title: 'UPS207 · real plane', lines: [`Where it was at ${time(t)}`] })
  })

  it('says "the flight" of a flight with no number, and keeps the viewer\'s clock', () => {
    const { leg, t } = caseLeg('ahead, in the air')
    const unnamed = { ...leg, flightNumber: null }
    expect(planePopupWords(unnamed, 'ghost', t, false, NY, false).lines).toEqual(['Where the flight would be if it were on time'])
    expect(planePopupWords(unnamed, 'realPlane', t, false, NY, false).title).toBe('The flight · real plane')
    expect(planePopupWords(leg, 'realPlane', t, true, NY, true).lines).toEqual([`Where it was at ${shortTimeText(t, NY, true)}`])
    expect(shortTimeText(t, NY, true)).toMatch(/^\d\d:\d\d$/)
  })

  it("says the card's bar's words in every shared case and moment the real plane shows", () => {
    let checked = 0
    for (const flightCase of LIVE_CASES.flights) {
      if (!flightCase.flight) continue
      flightCase.moments.forEach((m, i) => {
        if (!m.label || m.phase === 'notLive') return
        const { words } = realPlane(flightCase.name, i)
        expect(words.lines.join(' · '), `${flightCase.name}, moment ${i}`).toContain(m.label)
        checked += 1
      })
    }
    expect(checked).toBeGreaterThan(20)
  })
})
```

**Create `tests/map/planeKey.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { showsPlaneKey, tripMapDrawing } from '../../src/map/tripMapDrawing'
import { liveTripMap, PHL, SDF, TRAIL } from './liveTrip'
import { fix, liveFlight, MINUTE, START } from './madeUpFlights'

const IN_THE_AIR = START + 59 * MINUTE
const ESTIMATED = START + 75 * MINUTE

/** The map's drawing at `t`, with `live` as the flight's answer. */
const drawingAt = (t: number, live: Parameters<typeof liveTripMap>[1], isReplay = false) => {
  const map = liveTripMap(t, live)
  return { map, drawing: tripMapDrawing(map, t, isReplay) }
}

describe('the key to the two planes (which plane design §2)', () => {
  it('shows while the real plane flies beside its ghost, and the drawing names their flight', () => {
    const { map, drawing } = drawingAt(IN_THE_AIR, undefined)
    expect(showsPlaneKey(drawing)).toBe(true)
    expect(drawing.liveLeg).toBe(map.legs[0])
  })

  it('shows while the real plane is an estimate', () => {
    expect(showsPlaneKey(drawingAt(ESTIMATED, undefined).drawing)).toBe(true)
  })

  it('shows while the real plane is still at the gate after its takeoff time', () => {
    const atTheGate = liveFlight([], { legId: 'f1', state: 'ground', fix: fix(24, SDF.lat, SDF.lng, { onGround: true, trackDeg: null }) })
    const { drawing } = drawingAt(START + 25 * MINUTE, atTheGate)
    expect(drawing.realPlane).not.toBeNull()
    expect(showsPlaneKey(drawing)).toBe(true)
  })

  it("doesn't show in a replay, which draws the real plane alone", () => {
    const { map, drawing } = drawingAt(START + 30 * MINUTE, undefined, true)
    expect(drawing.realPlane).not.toBeNull()
    expect(showsPlaneKey(drawing)).toBe(false)
    expect(drawing.liveLeg).toBe(map.legs[0])
  })

  it("doesn't show once the plane has landed and its ghost has gone", () => {
    const landed = liveFlight(TRAIL, { legId: 'f1', state: 'landed', landedAt: START + 110 * MINUTE, fix: fix(111, PHL.lat, PHL.lng, { onGround: true, trackDeg: null }) })
    const { drawing } = drawingAt(START + 112 * MINUTE, landed)
    expect(drawing.realPlane).not.toBeNull()
    expect(showsPlaneKey(drawing)).toBe(false)
  })

  it("doesn't show for a flight with no live data, and the drawing names no flight", () => {
    const { drawing } = drawingAt(IN_THE_AIR, null)
    expect(showsPlaneKey(drawing)).toBe(false)
    expect(drawing.liveLeg).toBeNull()
  })
})
```

**Create `tests/ui/planePopup.test.tsx`:**

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { planePopupWords } from '../../src/copy/planePopup'
import type { MapKitApi } from '../../src/map/mapkitApi'
import type { MapLeg, TripMap } from '../../src/map/tripMap'
import { AppleTripMap } from '../../src/ui/AppleTripMap'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { PlanePopup, popupPlacement } from '../../src/ui/PlanePopup'
import { TripMapCard } from '../../src/ui/TripMapCard'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { TripMapSvg } from '../../src/ui/TripMapSvg'
import { fakeMapKit } from '../fixtures/fakeMapKit'
import { FLYING, liveTripMap, PHL, TRAIL } from '../map/liveTrip'
import { fix, liveFlight, MINUTE, START } from '../map/madeUpFlights'

afterEach(() => {
  cleanup()
  resetAppleMapKit()
  localStorage.clear()
  vi.restoreAllMocks()
})

const NY = 'America/New_York'
const IN_THE_AIR = START + 59 * MINUTE
/** Seen again further on, two minutes later. */
const LATER = START + 61 * MINUTE
const FURTHER = { ...FLYING, fix: fix(60, 39.7, -79.2, { trackDeg: 75 }) }

const wordsAt = (t: number, isReplay = false) => (leg: MapLeg, plane: 'realPlane' | 'ghost') => planePopupWords(leg, plane, t, isReplay, NY, false)
const popup = () => document.querySelector('.trip-map-popup')
const popupTitle = () => popup()?.querySelector('.trip-map-popup-title')?.textContent ?? null

describe('where a popup goes (which plane design §3)', () => {
  it('over its plane, in the open', () => {
    expect(popupPlacement({ x: 200, y: 150 }, 390)).toEqual({ below: false, shift: 0 })
  })

  it('under its plane near the map’s top', () => {
    expect(popupPlacement({ x: 200, y: 40 }, 390).below).toBe(true)
  })

  it('slid in from either side, to stay inside the map', () => {
    expect(popupPlacement({ x: 20, y: 150 }, 390).shift).toBe(108)
    expect(popupPlacement({ x: 380, y: 150 }, 390).shift).toBe(-118)
  })

  it('in the middle of a map too narrow for it', () => {
    expect(popupPlacement({ x: 50, y: 150 }, 200).shift).toBe(50)
  })

  it('is drawn over its plane, or under it, slid sideways by the shift', () => {
    const words = { title: 'On schedule', lines: ['Where UPS1234 would be if it were on time'] }
    const view = render(<PlanePopup words={words} at={{ x: 20, y: 150 }} placement={{ below: false, shift: 108 }} />)
    expect((popup() as HTMLElement).style.transform).toBe('translate(calc(-50% + 108px), calc(-100% - 18px))')
    view.rerender(<PlanePopup words={words} at={{ x: 20, y: 40 }} placement={{ below: true, shift: 0 }} />)
    expect((popup() as HTMLElement).style.transform).toBe('translate(calc(-50% + 0px), 18px)')
    expect(popup()?.textContent).toBe('On scheduleWhere UPS1234 would be if it were on time')
  })
})

describe("the popup on the site's own map", () => {
  const svg = (t: number, opts: { live?: typeof FLYING | null; isReplay?: boolean; words?: boolean; map?: TripMap } = {}) => {
    const map = opts.map ?? liveTripMap(t, opts.live === undefined ? FLYING : opts.live)
    return <TripMapSvg map={map} t={t} width={390} height={300} focus={map.legs[0]} land={null} nightStep={60_000} isReplay={opts.isReplay}
      planeWords={opts.words === false ? undefined : wordsAt(t, opts.isReplay)} />
  }
  const real = () => document.querySelector('.trip-map-real-plane')!
  const ghost = () => document.querySelector('.trip-map-ghost')!

  it('opens over the real plane when it’s pointed at, and closes when the pointer leaves', () => {
    render(svg(IN_THE_AIR))
    expect(document.querySelector('svg')?.getAttribute('class')).toBe('trip-map-svg points')
    fireEvent.pointerEnter(real())
    expect(popupTitle()).toBe('UPS1234 · real plane')
    const circle = real().querySelector('circle')!
    expect(popup()?.getAttribute('style')).toContain(`left: ${circle.getAttribute('cx')}px`)
    fireEvent.pointerLeave(real(), { pointerType: 'mouse' })
    expect(popup()).toBeNull()
  })

  it('stays open after a tap, moves to the other plane on a tap there, and closes on a tap elsewhere', () => {
    render(svg(IN_THE_AIR))
    fireEvent.click(ghost())
    fireEvent.pointerLeave(ghost(), { pointerType: 'touch' })
    expect(popupTitle()).toBe('On schedule')
    fireEvent.pointerDown(ghost())
    expect(popupTitle()).toBe('On schedule')
    fireEvent.click(real())
    expect(popupTitle()).toBe('UPS1234 · real plane')
    fireEvent.pointerDown(document.querySelector('.trip-map-ocean')!)
    expect(popup()).toBeNull()
  })

  it('moves with its plane', () => {
    const view = render(svg(IN_THE_AIR))
    fireEvent.pointerEnter(real())
    const before = popup()!.getAttribute('style')
    view.rerender(svg(LATER, { live: FURTHER }))
    expect(popup()!.getAttribute('style')).not.toBe(before)
    expect(popup()!.getAttribute('style')).toContain(`left: ${real().querySelector('circle')!.getAttribute('cx')}px`)
  })

  it('closes as a replay starts, and when its plane goes', () => {
    const view = render(svg(IN_THE_AIR))
    fireEvent.pointerEnter(real())
    view.rerender(svg(IN_THE_AIR, { isReplay: true }))
    expect(popup()).toBeNull()
    view.rerender(svg(IN_THE_AIR))
    fireEvent.pointerEnter(ghost())
    const landed = liveFlight(TRAIL, { legId: 'f1', state: 'landed', landedAt: START + 110 * MINUTE, fix: fix(111, PHL.lat, PHL.lng, { onGround: true, trackDeg: null }) })
    view.rerender(svg(START + 112 * MINUTE, { live: landed }))
    expect(document.querySelector('.trip-map-ghost')).toBeNull()
    expect(popup()).toBeNull()
    // It stays closed when a ghost comes back.
    view.rerender(svg(IN_THE_AIR))
    expect(popup()).toBeNull()
  })

  it('opens nothing on the card’s map, whose planes take no pointer', () => {
    render(svg(IN_THE_AIR, { words: false }))
    fireEvent.pointerEnter(real())
    fireEvent.click(real())
    expect(popup()).toBeNull()
    expect(document.querySelector('svg')?.getAttribute('class')).toBe('trip-map-svg')
  })
})

describe("the popup on Apple's map", () => {
  async function shown(t: number, opts: { words?: boolean; map?: TripMap } = {}) {
    const kit = fakeMapKit()
    startAppleMapKit(async () => kit as unknown as MapKitApi)
    const map = opts.map ?? liveTripMap(t)
    const props = (at: number, m: TripMap, isReplay = false) => ({
      map: m, t: at, width: 390, height: 300, focus: m.legs[0], land: null, nightStep: 60_000, mapStyle: 'standard' as const,
      interactive: opts.words !== false, isReplay, planeWords: opts.words === false ? undefined : wordsAt(at, isReplay),
    })
    const view = render(<AppleTripMap {...props(t, map)} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    return { kit, view, map, props }
  }
  const mark = (kit: ReturnType<typeof fakeMapKit>, kind: string) => kit.maps[0].annotations.find((a) => a.element.classList.contains(kind))!
  const popupMark = (kit: ReturnType<typeof fakeMapKit>) => kit.maps[0].annotations.find((a) => a.element.className === 'apple-popup')
  const point = (element: HTMLElement, type: string, pointerType = 'mouse') => fireEvent(element, new PointerEvent(type, { bubbles: true, pointerType }))
  // MapKit lays out its marks itself: the stand-in keeps them off the page, so the popup is read from its own mark.
  const shownTitle = (kit: ReturnType<typeof fakeMapKit>) => popupMark(kit)?.element.querySelector('.trip-map-popup-title')?.textContent ?? null

  it('opens over every mark when a plane is pointed at, and closes when the pointer leaves', async () => {
    const { kit } = await shown(IN_THE_AIR)
    point(mark(kit, 'realPlane').element, 'pointerenter')
    await waitFor(() => expect(popupMark(kit)).toBeDefined())
    expect(kit.maps[0].annotations.at(-1)).toBe(popupMark(kit))
    expect(popupMark(kit)!.coordinate).toEqual(mark(kit, 'realPlane').coordinate)
    expect(popupMark(kit)!.displayPriority).toBe(1000)
    expect(shownTitle(kit)).toBe('UPS1234 · real plane')
    point(mark(kit, 'realPlane').element, 'pointerleave')
    await waitFor(() => expect(popupMark(kit)).toBeUndefined())
  })

  it('stays open after a tap, until a tap elsewhere on the map', async () => {
    const { kit, view } = await shown(IN_THE_AIR)
    fireEvent.click(mark(kit, 'ghost').element)
    point(mark(kit, 'ghost').element, 'pointerleave', 'touch')
    await waitFor(() => expect(shownTitle(kit)).toBe('On schedule'))
    point(mark(kit, 'ghost').element, 'pointerdown', 'touch')
    await new Promise((r) => setTimeout(r, 0))
    expect(shownTitle(kit)).toBe('On schedule')
    point(view.container.querySelector('.apple-trip-map') as HTMLElement, 'pointerdown', 'touch')
    await waitFor(() => expect(popupMark(kit)).toBeUndefined())
  })

  it('moves with its plane, and goes over a mark made after it', async () => {
    const { kit, view, props } = await shown(IN_THE_AIR)
    point(mark(kit, 'realPlane').element, 'pointerenter')
    await waitFor(() => expect(popupMark(kit)).toBeDefined())
    const before = popupMark(kit)!.coordinate
    const later = liveTripMap(LATER, FURTHER)
    // A drive on to Trenton after the flight: a new airport's mark.
    const drive: MapLeg = {
      id: 'd1', kind: 'drive', origin: later.legs[0].destination, flightNumber: null, start: later.legs[0].end + 30 * MINUTE, end: later.legs[0].end + 60 * MINUTE,
      destination: { code: 'TTN', city: 'Trenton', place: { lat: 40.28, lng: -74.81 }, timeZone: NY },
    }
    view.rerender(<AppleTripMap {...props(LATER, { ...later, legs: [...later.legs, drive] })} />)
    await waitFor(() => expect(kit.maps[0].annotations.some((a) => a.element.textContent === 'TTN')).toBe(true))
    expect(popupMark(kit)!.coordinate).toEqual(mark(kit, 'realPlane').coordinate)
    expect(popupMark(kit)!.coordinate).not.toEqual(before)
    expect(kit.maps[0].annotations.at(-1)).toBe(popupMark(kit))
  })

  it('closes on a press elsewhere that MapKit keeps to itself', async () => {
    const { kit, view } = await shown(IN_THE_AIR)
    fireEvent.click(mark(kit, 'ghost').element)
    await waitFor(() => expect(popupMark(kit)).toBeDefined())
    const tile = document.createElement('div')
    tile.addEventListener('pointerdown', (e) => e.stopPropagation())
    view.container.querySelector('.apple-trip-map')!.appendChild(tile)
    point(tile, 'pointerdown', 'touch')
    await waitFor(() => expect(popupMark(kit)).toBeUndefined())
  })

  it('goes under its plane near the map’s top', async () => {
    const { kit } = await shown(IN_THE_AIR)
    kit.maps[0].pagePoint = { x: 195, y: 30 }
    point(mark(kit, 'ghost').element, 'pointerenter')
    await waitFor(() => expect(popupMark(kit)?.element.querySelector('.trip-map-popup')?.className).toBe('trip-map-popup below'))
  })

  it('measures its plane from the map, on a page scrolled down', async () => {
    const { kit } = await shown(IN_THE_AIR)
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(100)
    // 130 px down the page is 30 px down the map: near its top.
    kit.maps[0].pagePoint = { x: 195, y: 130 }
    point(mark(kit, 'ghost').element, 'pointerenter')
    await waitFor(() => expect(popupMark(kit)?.element.querySelector('.trip-map-popup')?.className).toBe('trip-map-popup below'))
  })

  it('closes as a replay starts, emptying its mark', async () => {
    const { kit, view, map, props } = await shown(IN_THE_AIR)
    point(mark(kit, 'realPlane').element, 'pointerenter')
    await waitFor(() => expect(popupMark(kit)).toBeDefined())
    const element = popupMark(kit)!.element
    view.rerender(<AppleTripMap {...props(START + 30 * MINUTE, map, true)} />)
    await waitFor(() => expect(popupMark(kit)).toBeUndefined())
    expect(element.childNodes).toHaveLength(0)
  })

  it('closes when its plane goes, and stays closed when it comes back', async () => {
    const { kit, view, props } = await shown(IN_THE_AIR)
    fireEvent.click(mark(kit, 'ghost').element)
    await waitFor(() => expect(popupMark(kit)).toBeDefined())
    const landed = liveFlight(TRAIL, { legId: 'f1', state: 'landed', landedAt: START + 110 * MINUTE, fix: fix(111, PHL.lat, PHL.lng, { onGround: true, trackDeg: null }) })
    view.rerender(<AppleTripMap {...props(START + 112 * MINUTE, liveTripMap(START + 112 * MINUTE, landed))} />)
    await waitFor(() => expect(popupMark(kit)).toBeUndefined())
    view.rerender(<AppleTripMap {...props(IN_THE_AIR, liveTripMap(IN_THE_AIR))} />)
    await waitFor(() => expect(kit.maps[0].annotations.some((a) => a.element.classList.contains('ghost'))).toBe(true))
    expect(popupMark(kit)).toBeUndefined()
  })

  it('empties its mark when the map goes', async () => {
    const { kit, view } = await shown(IN_THE_AIR)
    point(mark(kit, 'realPlane').element, 'pointerenter')
    await waitFor(() => expect(popupMark(kit)).toBeDefined())
    const element = popupMark(kit)!.element
    view.unmount()
    expect(element.childNodes).toHaveLength(0)
  })

  it('opens nothing on the card’s map', async () => {
    const { kit } = await shown(IN_THE_AIR, { words: false })
    point(mark(kit, 'realPlane').element, 'pointerenter')
    fireEvent.click(mark(kit, 'realPlane').element)
    await new Promise((r) => setTimeout(r, 0))
    expect(popupMark(kit)).toBeUndefined()
  })
})

describe('the key to the two planes (which plane design §2)', () => {
  const card = (t: number, live: typeof FLYING | null = FLYING) => {
    const map = liveTripMap(t, live)
    return <TripMapCard map={map} now={t} viewerTz={NY} h24={false} name="Alex" day={1} days={1} delayMinutes={null} land={null} onOpenMap={() => {}} />
  }
  const key = () => document.querySelector('.trip-map-key')

  it('names the real plane and the schedule on the card, hidden from screen readers', () => {
    render(card(IN_THE_AIR))
    expect(key()?.textContent).toBe('Real planeOn schedule')
    expect(key()?.getAttribute('aria-hidden')).toBe('true')
    expect(key()?.querySelectorAll('.trip-map-key-mark.real, .trip-map-key-mark.ghost')).toHaveLength(2)
  })

  it("isn't on the card for a flight with no live data", () => {
    render(card(IN_THE_AIR, null))
    expect(key()).toBeNull()
  })

  it("keeps the card's trip clear of it, as of the top chip", async () => {
    const padding = async (keyHeight: number) => {
      const kit = fakeMapKit()
      startAppleMapKit(async () => kit as unknown as MapKitApi)
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        const height = this.classList.contains('trip-map-key') ? keyHeight : 0
        return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: height, width: 0, height, toJSON: () => ({}) } as DOMRect
      })
      render(card(IN_THE_AIR))
      await waitFor(() => expect(kit.maps[0]?.padding).toBeTruthy())
      const top = kit.maps[0].padding!.top
      cleanup()
      resetAppleMapKit()
      vi.restoreAllMocks()
      return top
    }
    expect(await padding(22)).toBeGreaterThan(await padding(0))
  })

  it('is on the full map now, and not in a replay; its planes open their popups there', () => {
    render(<TripMapPage map={liveTripMap(IN_THE_AIR)} now={IN_THE_AIR} viewerTz={NY} h24={false} day={1} days={1} land={null} onBack={() => {}} />)
    expect(key()?.textContent).toBe('Real planeOn schedule')
    fireEvent.pointerEnter(document.querySelector('.trip-map-real-plane')!)
    expect(popupTitle()).toBe('UPS1234 · real plane')
    const slider = screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement
    fireEvent.input(slider, { target: { value: String(Number(slider.max) / 4) } })
    expect(key()).toBeNull()
    expect(popup()).toBeNull()
    // In the replay the real plane's popup says where it was at the moment shown.
    fireEvent.pointerEnter(document.querySelector('.trip-map-real-plane')!)
    const shownTime = document.querySelector('.trip-timeline-time')!.textContent!.split(' · ')[0].replace(/^\S+\s/, '')
    expect(popup()?.textContent).toBe(`UPS1234 · real planeWhere it was at ${shownTime}`)
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/copy/planePopup.test.ts tests/map/planeKey.test.ts tests/ui/planePopup.test.tsx
```

Expected: the first and third fail to load (they can't find `src/copy/planePopup`), and all 6 of the second's fail: `showsPlaneKey` isn't there yet. Every other test still passes with the stand-in for MapKit changed.

- [x] **Step 3: Write the code.**

**Create `src/copy/planePopup.ts`:**

```ts
import { mapFlightProgress } from '../map/mapFlight'
import type { MapLeg } from '../map/tripMap'
import { shortTimeText } from './format'
import { about, landsAt, liveLabelText } from './tripMap'

/** Which of a flight's two planes: the real one, or the ghost where an on-schedule plane would be. */
export type PlaneKind = 'realPlane' | 'ghost'

/** What a plane's popup says (which plane design §3): a title, then a line or two. */
export interface PopupWords {
  title: string
  lines: string[]
}

const capitalized = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

/**
 * The popup on one of `leg`'s planes at `t`: now, or a moment of the replay when `isReplay` (which plane design §3). It
 * names the plane, then says what the card's bar says of it, with its landing time, in the viewer's time zone and clock.
 */
export function planePopupWords(leg: MapLeg, plane: PlaneKind, t: number, isReplay: boolean, viewerTz: string, h24: boolean): PopupWords {
  const name = leg.flightNumber ?? 'the flight'
  const time = (ms: number) => shortTimeText(ms, viewerTz, h24)
  if (plane === 'ghost') return { title: 'On schedule', lines: [`Where ${name} would be if it were on time`] }
  const title = `${capitalized(name)} · real plane`
  if (isReplay) return { title, lines: [`Where it was at ${time(t)}`] }
  if (!leg.flight) return { title, lines: [] }
  const progress = mapFlightProgress(leg.flight, t)
  const label = progress.label ? liveLabelText(progress.label) : null
  switch (progress.phase) {
    case 'estimated': {
      const seen = leg.flight.live?.fix?.seenAt
      const lands = `lands ${about(leg)}${time(leg.end)}`
      return {
        title: `${capitalized(name)} · best guess`,
        lines: [
          ...(seen != null ? [`Not seen since ${time(seen)}, so it's drawn where it should be by now`] : []),
          label ? `${label} · ${lands}` : capitalized(lands),
        ],
      }
    }
    case 'onGround':
    case 'inAir':
      return { title, lines: [...(label ? [label] : []), landsAt(leg, viewerTz, h24)] }
    case 'landed':
      // "at" the gate, as the card's sentence says once the plane is down, or "about" while that's still an estimate.
      return { title, lines: [...(label ? [label] : []), `Reaches the gate ${about(leg) || 'at '}${time(leg.end)}`] }
    default:
      // Down somewhere else: it has no label, and no landing time to give.
      return { title, lines: [] }
  }
}
```

**In `src/map/tripMapDrawing.ts`, replace (1 of 5):**

```ts
import { distanceMeters, EARTH_RADIUS_M, pointsAlong, type GeoPoint } from './greatCircle'
import { activityAt, isGroundKind, type GroundActivity } from './tripActivity'
import { isMoving, legProgress, positionAt, type AirportMark, type TripMap } from './tripMap'

export type { PlaneMark, RealPlaneMark, RouteSegment, SegmentStyle } from './flightDrawing'
```

**with:**

```ts
import { distanceMeters, EARTH_RADIUS_M, pointsAlong, type GeoPoint } from './greatCircle'
import { activityAt, isGroundKind, type GroundActivity } from './tripActivity'
import { isMoving, legProgress, positionAt, type AirportMark, type MapLeg, type TripMap } from './tripMap'

export type { PlaneMark, RealPlaneMark, RouteSegment, SegmentStyle } from './flightDrawing'
```

**In `src/map/tripMapDrawing.ts`, replace (2 of 5):**

```ts
  /** Where an on-schedule plane would be, beside the real one. */
  ghost: PlaneMark | null
  /** The pilot's marker: what they're doing and where, while nothing moves (activity markers design §2). */
  pilot: GroundActivity | null
}

/**
```

**with:**

```ts
  /** Where an on-schedule plane would be, beside the real one. */
  ghost: PlaneMark | null
  /** The flight the real plane and its ghost are of, while there's a real plane: what their popups speak of. */
  liveLeg: MapLeg | null
  /** The pilot's marker: what they're doing and where, while nothing moves (activity markers design §2). */
  pilot: GroundActivity | null
}

/** Whether the map shows the key to its two planes: while it draws a real plane and its ghost (which plane design §2). */
export const showsPlaneKey = (drawing: TripMapDrawing) => drawing.realPlane != null && drawing.ghost != null

/**
```

**In `src/map/tripMapDrawing.ts`, replace (3 of 5):**

```ts
  let realPlane: RealPlaneMark | null = null
  let ghost: PlaneMark | null = null
  for (const leg of map.legs) {
    if (leg.kind === 'drive') {
```

**with:**

```ts
  let realPlane: RealPlaneMark | null = null
  let ghost: PlaneMark | null = null
  let liveLeg: MapLeg | null = null
  for (const leg of map.legs) {
    if (leg.kind === 'drive') {
```

**In `src/map/tripMapDrawing.ts`, replace (4 of 5):**

```ts
      segments.push(...flight.segments)
      plane = flight.plane ?? plane
      realPlane = flight.realPlane ?? realPlane
      ghost = flight.ghost ?? ghost
    }
  }
```

**with:**

```ts
      segments.push(...flight.segments)
      plane = flight.plane ?? plane
      if (flight.realPlane) {
        realPlane = flight.realPlane
        ghost = flight.ghost
        liveLeg = leg
      }
    }
  }
```

**In `src/map/tripMapDrawing.ts`, replace (5 of 5):**

```ts
  const activity = activityAt(map, t)
  const pilot = activity && isGroundKind(activity.kind) ? { kind: activity.kind, place: activity.place } : null
  return { segments, airports, cars, plane, realPlane, ghost, pilot }
}

```

**with:**

```ts
  const activity = activityAt(map, t)
  const pilot = activity && isGroundKind(activity.kind) ? { kind: activity.kind, place: activity.place } : null
  return { segments, airports, cars, plane, realPlane, ghost, liveLeg, pilot }
}

```

**In `src/map/mapkitApi.ts`, replace:**

```ts
  setVisibleMapRectAnimated(rect: unknown, animated: boolean): void
  addEventListener(type: string, listener: () => void): void
```

**with:**

```ts
  setVisibleMapRectAnimated(rect: unknown, animated: boolean): void
  /** Where a place is on the page, in px: a popup's place on the map (which plane design §3). */
  convertCoordinateToPointOnPage(coordinate: MkCoordinate): { x: number; y: number }
  addEventListener(type: string, listener: () => void): void
```

**Create `src/ui/PlanePopup.tsx`:**

```tsx
import type { PopupWords } from '../copy/planePopup'

/** The room a popup needs over its plane, and either side of it, in px: `.trip-map-popup` is 240 px wide at most. */
export const POPUP_ROOM = { above: 96, side: 128 }

/** The gap between a plane's centre and its popup, in px: the plane's radius and a little more. */
const POPUP_GAP = 18

export interface PopupPlacement {
  /** Under the plane, near the map's top, where there's no room over it. */
  below: boolean
  /** How far the popup is slid sideways from the plane, in px, to stay inside a map `width` wide. */
  shift: number
}

/** Where the popup of a plane `at` px into a map `width` wide goes (which plane design §3). */
export function popupPlacement(at: { x: number; y: number }, width: number): PopupPlacement {
  const x = width < 2 * POPUP_ROOM.side ? width / 2 : Math.min(Math.max(at.x, POPUP_ROOM.side), width - POPUP_ROOM.side)
  return { below: at.y < POPUP_ROOM.above, shift: Math.round(x - at.x) }
}

/**
 * A plane's popup (which plane design §3), over or under its plane, `at` px into what it's laid over. It's part of the
 * map's picture, which screen readers don't see.
 */
export function PlanePopup({ words, at, placement }: { words: PopupWords; at: { x: number; y: number }; placement: PopupPlacement }) {
  const across = `calc(-50% + ${placement.shift}px)`
  const transform = placement.below ? `translate(${across}, ${POPUP_GAP}px)` : `translate(${across}, calc(-100% - ${POPUP_GAP}px))`
  return (
    <div class={`trip-map-popup${placement.below ? ' below' : ''}`} style={{ left: `${at.x}px`, top: `${at.y}px`, transform }} aria-hidden="true">
      <p class="trip-map-popup-title">{words.title}</p>
      {words.lines.map((line) => <p key={line}>{line}</p>)}
    </div>
  )
}
```

**Create `src/ui/PlaneKey.tsx`:**

```tsx
import type { Ref } from 'preact'

/**
 * The key to the map's two planes (which plane design §2): the real plane's mark and the ghost's, each named. It's the
 * key to a picture screen readers don't see, so they don't see it either: the card's sentence says it all.
 */
export function PlaneKey({ boxRef }: { boxRef?: Ref<HTMLSpanElement> }) {
  return (
    <span ref={boxRef} class="trip-map-key" aria-hidden="true">
      <span class="trip-map-key-item"><span class="trip-map-key-mark real" />Real plane</span>
      <span class="trip-map-key-item"><span class="trip-map-key-mark ghost" />On schedule</span>
    </span>
  )
}
```

**In `src/ui/TripMapSvg.tsx`, replace (1 of 7):**

```tsx
import { useMemo } from 'preact/hooks'
import { ICON_PATHS, type IconName } from '../icons/iconPaths'
import type { GeoPoint } from '../map/greatCircle'
```

**with:**

```tsx
import { useEffect, useMemo, useState } from 'preact/hooks'
import type { PlaneKind, PopupWords } from '../copy/planePopup'
import { ICON_PATHS, type IconName } from '../icons/iconPaths'
import type { GeoPoint } from '../map/greatCircle'
```

**In `src/ui/TripMapSvg.tsx`, replace (2 of 7):**

```tsx
import { nightTime, PILOT_RADIUS, routePoints, tripMapDrawing, type PlaneMark } from '../map/tripMapDrawing'
import { useSteadyFraming } from './hooks/useSteadyFraming'

export interface TripMapSvgProps {
```

**with:**

```tsx
import { nightTime, PILOT_RADIUS, routePoints, tripMapDrawing, type PlaneMark } from '../map/tripMapDrawing'
import { useSteadyFraming } from './hooks/useSteadyFraming'
import { PlanePopup, popupPlacement } from './PlanePopup'

export interface TripMapSvgProps {
```

**In `src/ui/TripMapSvg.tsx`, replace (3 of 7):**

```tsx
  /** `t` is a moment of the replay, not now: a flight with a record shows its real plane alone (Stage 3 spec §7.3). */
  isReplay?: boolean
}

/** A Phosphor icon (256 units, pointing up) centred on `at`, `size` px wide, turned `degrees` clockwise. */
```

**with:**

```tsx
  /** `t` is a moment of the replay, not now: a flight with a record shows its real plane alone (Stage 3 spec §7.3). */
  isReplay?: boolean
  /**
   * What a plane's popup says, on the full map (which plane design §3): the real plane and its ghost then open one when
   * pointed at or tapped. The card's map has none, and its planes take no pointer.
   */
  planeWords?: (leg: MapLeg, plane: PlaneKind) => PopupWords
}

/** What a plane does with the pointer and taps on the full map (which plane design §3), with `setOpen` for its popup. */
export const pointingAt = (kind: PlaneKind, setOpen: (open: (was: PlaneKind | null) => PlaneKind | null) => void) => ({
  onPointerEnter: () => setOpen(() => kind),
  // A finger lifted leaves the plane too: a tapped popup stays until the next tap.
  onPointerLeave: (e: PointerEvent) => {
    if (e.pointerType !== 'touch') setOpen((was) => (was === kind ? null : was))
  },
  onClick: () => setOpen(() => kind),
})

/** Whether a press on the map, at `target`, is on one of the two planes: a press anywhere else closes the popup. */
export const isOnPlane = (target: EventTarget | null) =>
  target instanceof Element && target.closest('.trip-map-ghost, .trip-map-real-plane, .apple-mark.ghost, .apple-mark.realPlane') != null

/** A Phosphor icon (256 units, pointing up) centred on `at`, `size` px wide, turned `degrees` clockwise. */
```

**In `src/ui/TripMapSvg.tsx`, replace (4 of 7):**

```tsx

/** The real plane and its ghost (Stage 3 spec §5.4): a plane in a circle, the pilot's marker's size. */
function PlaneBadge({ plane, at, class: cls }: { plane: PlaneMark; at: { x: number; y: number }; class: string }) {
  return (
    <g class={cls}>
      <circle cx={at.x} cy={at.y} r={PILOT_RADIUS} />
      {/* The site's plane icon points up, so it turns a quarter more than the screen angle. */}
```

**with:**

```tsx

/** The real plane and its ghost (Stage 3 spec §5.4): a plane in a circle, the pilot's marker's size. */
function PlaneBadge({ plane, at, class: cls, ...pointing }: { plane: PlaneMark; at: { x: number; y: number }; class: string } & Partial<ReturnType<typeof pointingAt>>) {
  return (
    <g class={cls} {...pointing}>
      <circle cx={at.x} cy={at.y} r={PILOT_RADIUS} />
      {/* The site's plane icon points up, so it turns a quarter more than the screen angle. */}
```

**In `src/ui/TripMapSvg.tsx`, replace (5 of 7):**

```tsx
 * drawn by the site in SVG. The card and the full map describe it in words, so to screen readers it's hidden.
 */
export function TripMapSvg({ map, t, width, height, focus, land, nightStep, insets = NO_INSETS, isReplay = false }: TripMapSvgProps) {
  const { top, right, bottom, left } = insets
  const framing = useSteadyFraming(framingPoints(map, focus), framingSubject(map, focus))
```

**with:**

```tsx
 * drawn by the site in SVG. The card and the full map describe it in words, so to screen readers it's hidden.
 */
export function TripMapSvg({ map, t, width, height, focus, land, nightStep, insets = NO_INSETS, isReplay = false, planeWords }: TripMapSvgProps) {
  const { top, right, bottom, left } = insets
  const framing = useSteadyFraming(framingPoints(map, focus), framingSubject(map, focus))
```

**In `src/ui/TripMapSvg.tsx`, replace (6 of 7):**

```tsx
  const nightPaths = useMemo(() => nightLayers(night).map((shapes) => polygonsPath(shapes, view)), [night, x, y, rectWidth, rectHeight, width, height])
  const airportMarks = placeAirports(drawing.airports.map((a) => ({ code: a.code, at: placeAt(a.place, view), driveOnly: a.driveOnly })))
  return (
    <svg class="trip-map-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <rect class="trip-map-ocean" width={width} height={height} />
      {landPath && <path class="trip-map-land" d={landPath} />}
```

**with:**

```tsx
  const nightPaths = useMemo(() => nightLayers(night).map((shapes) => polygonsPath(shapes, view)), [night, x, y, rectWidth, rectHeight, width, height])
  const airportMarks = placeAirports(drawing.airports.map((a) => ({ code: a.code, at: placeAt(a.place, view), driveOnly: a.driveOnly })))
  // The plane whose popup is open (which plane design §3). It closes when its plane goes, and as a replay starts or stops.
  const [open, setOpen] = useState<PlaneKind | null>(null)
  useEffect(() => setOpen(null), [isReplay])
  const opened = planeWords && open && drawing.liveLeg ? drawing[open] : null
  useEffect(() => {
    if (open && !opened) setOpen(null)
  })
  const pointing = (kind: PlaneKind) => (planeWords ? pointingAt(kind, setOpen) : {})
  const popupAt = opened ? placeAt(opened.place, view) : null
  const svg = (
    <svg class={`trip-map-svg${planeWords ? ' points' : ''}`} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true"
      onPointerDown={planeWords ? (e) => { if (!isOnPlane(e.target)) setOpen(null) } : undefined}>
      <rect class="trip-map-ocean" width={width} height={height} />
      {landPath && <path class="trip-map-land" d={landPath} />}
```

**In `src/ui/TripMapSvg.tsx`, replace (7 of 7):**

```tsx
      )}
      {/* The ghost just under the real plane, which is drawn on top. */}
      {drawing.ghost && <PlaneBadge plane={drawing.ghost} at={placeAt(drawing.ghost.place, view)} class="trip-map-ghost" />}
      {drawing.realPlane && (
        <PlaneBadge plane={drawing.realPlane} at={placeAt(drawing.realPlane.place, view)}
          class={`trip-map-real-plane${drawing.realPlane.isEstimated ? ' estimated' : ''}`} />
      )}
    </svg>
  )
}
```

**with:**

```tsx
      )}
      {/* The ghost just under the real plane, which is drawn on top. */}
      {drawing.ghost && <PlaneBadge plane={drawing.ghost} at={placeAt(drawing.ghost.place, view)} class="trip-map-ghost" {...pointing('ghost')} />}
      {drawing.realPlane && (
        <PlaneBadge plane={drawing.realPlane} at={placeAt(drawing.realPlane.place, view)}
          class={`trip-map-real-plane${drawing.realPlane.isEstimated ? ' estimated' : ''}`} {...pointing('realPlane')} />
      )}
    </svg>
  )
  if (!popupAt) return svg
  return (
    <>
      {svg}
      <PlanePopup words={planeWords!(drawing.liveLeg!, open!)} at={popupAt} placement={popupPlacement(popupAt, width)} />
    </>
  )
}
```

**In `src/ui/AppleTripMap.tsx`, replace (1 of 10):**

```tsx
import { useEffect, useRef, useState } from 'preact/hooks'
import { appleCamera, appleMapPlan, offDateLine, slideIntoView, type PlannedMark } from '../map/appleMapPlan'
```

**with:**

```tsx
import { render } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { PlaneKind } from '../copy/planePopup'
import { appleCamera, appleMapPlan, offDateLine, slideIntoView, type PlannedMark } from '../map/appleMapPlan'
```

**In `src/ui/AppleTripMap.tsx`, replace (2 of 10):**

```tsx
import { useSteadyFraming } from './hooks/useSteadyFraming'
import { TripMapSvg, type TripMapSvgProps } from './TripMapSvg'

```

**with:**

```tsx
import { useSteadyFraming } from './hooks/useSteadyFraming'
import { PlanePopup, popupPlacement } from './PlanePopup'
import { isOnPlane, pointingAt, TripMapSvg, type TripMapSvgProps } from './TripMapSvg'

```

**In `src/ui/AppleTripMap.tsx`, replace (3 of 10):**

```tsx
  marks: Map<string, { annotation: MkAnnotation; turn: (degrees: number) => void; fade: (faded: boolean) => void; priority: PlannedMark['priority'] }>
  framed: string
```

**with:**

```tsx
  marks: Map<string, { annotation: MkAnnotation; turn: (degrees: number) => void; fade: (faded: boolean) => void; priority: PlannedMark['priority'] }>
  /** The open plane's popup, a mark of its own over the rest (which plane design §3). */
  popup: { annotation: MkAnnotation; element: HTMLElement } | null
  framed: string
```

**In `src/ui/AppleTripMap.tsx`, replace (4 of 10):**

```tsx
function AppleMapView({
  mapkit, map, t, width, height, focus, nightStep, insets = NO_INSETS, mapStyle, interactive, recenter = 0, onUserMove, isReplay = false,
}: AppleTripMapProps & { mapkit: MapKitApi }) {
```

**with:**

```tsx
function AppleMapView({
  mapkit, map, t, width, height, focus, nightStep, insets = NO_INSETS, mapStyle, interactive, recenter = 0, onUserMove, isReplay = false, planeWords,
}: AppleTripMapProps & { mapkit: MapKitApi }) {
```

**In `src/ui/AppleTripMap.tsx`, replace (5 of 10):**

```tsx
  const [, repaint] = useState(0)
  const types: Record<AppleMapStyle, string> = { hybrid: mapkit.MapType.Hybrid, standard: mapkit.MapType.Standard, satellite: mapkit.MapType.Satellite }
```

**with:**

```tsx
  const [, repaint] = useState(0)
  // The plane whose popup is open (which plane design §3). It closes when its plane goes, and as a replay starts or stops.
  const [open, setOpen] = useState<PlaneKind | null>(null)
  useEffect(() => setOpen(null), [isReplay])
  const types: Record<AppleMapStyle, string> = { hybrid: mapkit.MapType.Hybrid, standard: mapkit.MapType.Standard, satellite: mapkit.MapType.Satellite }
```

**In `src/ui/AppleTripMap.tsx`, replace (6 of 10):**

```tsx
    })
    const state: Live = { map: m, lines: new Map(), night, nightAt: NaN, marks: new Map(), framed: '', settling: null, moved: false, recenterSeen: recenter }
    const moved = () => {
```

**with:**

```tsx
    })
    const state: Live = { map: m, lines: new Map(), night, nightAt: NaN, marks: new Map(), popup: null, framed: '', settling: null, moved: false, recenterSeen: recenter }
    const moved = () => {
```

**In `src/ui/AppleTripMap.tsx`, replace (7 of 10):**

```tsx
    scheme?.addEventListener('change', onScheme)
    live.current = state
```

**with:**

```tsx
    scheme?.addEventListener('change', onScheme)
    // A press anywhere but on a plane closes its popup. It's heard on its way in, before MapKit's own handling of the
    // map's gestures can stop it.
    const frame = box.current!
    const onPress = (e: PointerEvent) => {
      if (!isOnPlane(e.target)) setOpen(null)
    }
    frame.addEventListener('pointerdown', onPress, { capture: true })
    live.current = state
```

**In `src/ui/AppleTripMap.tsx`, replace (8 of 10):**

```tsx
      scheme?.removeEventListener('change', onScheme)
      m.destroy()
```

**with:**

```tsx
      scheme?.removeEventListener('change', onScheme)
      frame.removeEventListener('pointerdown', onPress, { capture: true })
      if (state.popup) render(null, state.popup.element)
      m.destroy()
```

**In `src/ui/AppleTripMap.tsx`, replace (9 of 10):**

```tsx
        const { element, turn, fade } = markElement(mark.kind, mark.label, mark.activity)
        // Airports give way to each other where they crowd. The pilot's marker, the plane and a car sit on top of an
```

**with:**

```tsx
        const { element, turn, fade } = markElement(mark.kind, mark.label, mark.activity)
        // On the full map the real plane and its ghost open their popups when pointed at or tapped.
        if (planeWords && (mark.kind === 'realPlane' || mark.kind === 'ghost')) {
          const pointing = pointingAt(mark.kind, setOpen)
          element.addEventListener('pointerenter', pointing.onPointerEnter)
          element.addEventListener('pointerleave', pointing.onPointerLeave)
          element.addEventListener('click', pointing.onClick)
        }
        // Airports give way to each other where they crowd. The pilot's marker, the plane and a car sit on top of an
```

**In `src/ui/AppleTripMap.tsx`, replace (10 of 10):**

```tsx
    }
  })
```

**with:**

```tsx
    }
    // The open plane's popup, moving with its plane, over every mark: a mark made since goes under it again.
    const opened = planeWords && open && drawing.liveLeg ? drawing[open] : null
    if (opened) {
      if (!state.popup) {
        const element = document.createElement('div')
        element.className = 'apple-popup'
        const annotation = new mapkit.Annotation(C(opened.place), () => element, {
          displayPriority: PRIORITY.required, collisionMode: mapkit.AnnotationCollisionMode.None,
        })
        state.map.addAnnotation(annotation)
        state.popup = { annotation, element }
      } else {
        state.popup.annotation.coordinate = C(opened.place)
        if (madeMarks.size > 0) {
          state.map.removeAnnotation(state.popup.annotation)
          state.map.addAnnotation(state.popup.annotation)
        }
      }
      // MapKit gives the plane's place on the page, which scrolls; the map's box is measured in the window.
      const page = state.map.convertCoordinateToPointOnPage(C(opened.place))
      const frame = box.current!.getBoundingClientRect()
      const placement = popupPlacement({ x: page.x - frame.left - scrollX, y: page.y - frame.top - scrollY }, width)
      render(<PlanePopup words={planeWords!(drawing.liveLeg!, open!)} at={{ x: 0, y: 0 }} placement={placement} />, state.popup.element)
    } else if (state.popup) {
      render(null, state.popup.element)
      state.map.removeAnnotation(state.popup.annotation)
      state.popup = null
    }
    if (open && !opened) setOpen(null)
  })
```

**In `src/ui/TripMapCard.tsx`, replace (1 of 4):**

```tsx
import { currentLeg, type MapLeg, type TripMap } from '../map/tripMap'
import { AppleTripMap } from './AppleTripMap'
```

**with:**

```tsx
import { currentLeg, type MapLeg, type TripMap } from '../map/tripMap'
import { showsPlaneKey, tripMapDrawing } from '../map/tripMapDrawing'
import { AppleTripMap } from './AppleTripMap'
```

**In `src/ui/TripMapCard.tsx`, replace (2 of 4):**

```tsx
import { Icon } from './Icon'
import { TripRecapBar } from './TripRecapBar'
```

**with:**

```tsx
import { Icon } from './Icon'
import { PlaneKey } from './PlaneKey'
import { TripRecapBar } from './TripRecapBar'
```

**In `src/ui/TripMapCard.tsx`, replace (3 of 4):**

```tsx
  const summary = p.facts ? cardSummary(p.facts, p.now, p.name) : tripMapSummary(p.map, p.now, p.name, p.viewerTz, p.h24)
  // The camera keeps the trip in the band between the chips, so neither covers the pilot's marker or a route.
  const [topChip, setTopChip] = useState<HTMLElement | null>(null)
  const [bottomChip, setBottomChip] = useState<HTMLElement | null>(null)
  const insets = chipInsets(useHeightOf(topChip), useHeightOf(bottomChip))
  return (
```

**with:**

```tsx
  const summary = p.facts ? cardSummary(p.facts, p.now, p.name) : tripMapSummary(p.map, p.now, p.name, p.viewerTz, p.h24)
  // The key to the real plane and its ghost, while both show (which plane design §2), at the map's top right.
  const showsKey = showsPlaneKey(tripMapDrawing(p.map, p.now))
  // The camera keeps the trip in the band between the chips, so neither covers the pilot's marker or a route. The key
  // is kept clear as the top chip is.
  const [topChip, setTopChip] = useState<HTMLElement | null>(null)
  const [bottomChip, setBottomChip] = useState<HTMLElement | null>(null)
  const [key, setKey] = useState<HTMLElement | null>(null)
  const insets = chipInsets(Math.max(useHeightOf(topChip), useHeightOf(key)), useHeightOf(bottomChip))
  return (
```

**In `src/ui/TripMapCard.tsx`, replace (4 of 4):**

```tsx
        {chips.top && <span ref={setTopChip} class="trip-map-chip top" aria-hidden="true">{chips.top}</span>}
        {bottom && (
```

**with:**

```tsx
        {chips.top && <span ref={setTopChip} class="trip-map-chip top" aria-hidden="true">{chips.top}</span>}
        {showsKey && <PlaneKey boxRef={setKey} />}
        {bottom && (
```

**In `src/ui/TripMapPage.tsx`, replace (1 of 4):**

```tsx
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { MAP_STYLE_NAMES, panelHeadline, topPill } from '../copy/tripMap'
```

**with:**

```tsx
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { planePopupWords } from '../copy/planePopup'
import { MAP_STYLE_NAMES, panelHeadline, topPill } from '../copy/tripMap'
```

**In `src/ui/TripMapPage.tsx`, replace (2 of 4):**

```tsx
import { currentLeg, legInMotion, type TripMap } from '../map/tripMap'
import { AppleTripMap } from './AppleTripMap'
```

**with:**

```tsx
import { currentLeg, legInMotion, type TripMap } from '../map/tripMap'
import { showsPlaneKey, tripMapDrawing } from '../map/tripMapDrawing'
import { AppleTripMap } from './AppleTripMap'
```

**In `src/ui/TripMapPage.tsx`, replace (3 of 4):**

```tsx
import { Icon } from './Icon'
import { TripTimeline } from './TripTimeline'
```

**with:**

```tsx
import { Icon } from './Icon'
import { PlaneKey } from './PlaneKey'
import { TripTimeline } from './TripTimeline'
```

**In `src/ui/TripMapPage.tsx`, replace (4 of 4):**

```tsx
        <AppleTripMap map={map} t={t} width={width} height={height} focus={focus} land={land} nightStep={nightStep} insets={insets}
          mapStyle={mapStyle} interactive recenter={recenter} onUserMove={() => setMoved(true)} isReplay={isReplay} />
      </div>
```

**with:**

```tsx
        <AppleTripMap map={map} t={t} width={width} height={height} focus={focus} land={land} nightStep={nightStep} insets={insets}
          mapStyle={mapStyle} interactive recenter={recenter} onUserMove={() => setMoved(true)} isReplay={isReplay}
          planeWords={(leg, plane) => planePopupWords(leg, plane, t, isReplay, viewerTz, h24)} />
        {/* The key to the real plane and its ghost, while both show: now, not in a replay (which plane design §2). */}
        {!isReplay && showsPlaneKey(tripMapDrawing(map, t)) && <PlaneKey />}
      </div>
```

**In `src/styles/tripMap.css`, replace (1 of 3):**

```css

.trip-map-stats {
```

**with:**

```css

/* The key to the real plane and its ghost (which plane design §2): at the map's top right, in the chips' glass. */
.trip-map-key {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  font-size: 0.8rem;
  font-weight: 600;
  pointer-events: none;
}
.trip-map-key-item { display: flex; align-items: center; gap: 5px; white-space: nowrap; }
.trip-map-key-mark { box-sizing: border-box; width: 12px; height: 12px; border-radius: 50%; }
.trip-map-key-mark.real { border: 1.5px solid #ffffff; background: var(--blue); }
.trip-map-key-mark.ghost { border: 1.5px dashed currentColor; }

/* A plane's popup (which plane design §3): over its plane, or under it near the map's top, in the panel's glass. */
.trip-map-popup {
  position: absolute;
  z-index: 1;
  box-sizing: border-box;
  width: max-content;
  max-width: 240px;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  color: var(--text);
  font-size: 0.8rem;
  line-height: 1.35;
  pointer-events: none;
}
.trip-map-popup p { margin: 0; color: var(--text-2); }
/* A line that wraps stays apart from the next. */
.trip-map-popup p + p { margin-top: 3px; }
.trip-map-popup .trip-map-popup-title { color: inherit; font-weight: 600; }
/* On the full map, the real plane and its ghost take the pointer: the rest of the site's map doesn't. */
.trip-map-svg.points .trip-map-ghost,
.trip-map-svg.points .trip-map-real-plane { cursor: pointer; pointer-events: all; }

.trip-map-stats {
```

**In `src/styles/tripMap.css`, replace (2 of 3):**

```css
.trip-map-round + .trip-map-style { margin-left: 0; }
.trip-map-full { flex: 1; min-height: 0; overflow: hidden; }
.trip-map-panel { margin: 0 16px 16px; padding: 16px; border-radius: 24px; background: var(--glass-fill); -webkit-backdrop-filter: blur(16px);
```

**with:**

```css
.trip-map-round + .trip-map-style { margin-left: 0; }
.trip-map-full { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.trip-map-panel { margin: 0 16px 16px; padding: 16px; border-radius: 24px; background: var(--glass-fill); -webkit-backdrop-filter: blur(16px);
```

**In `src/styles/tripMap.css`, replace (3 of 3):**

```css
.apple-mark.ghost svg { fill: var(--trip-seen); opacity: 0.4; }
.apple-mark-dot { width: 7px; height: 7px; border: 0.5px solid rgba(0, 0, 0, 0.4); border-radius: 50%; background: #ffffff; }
```

**with:**

```css
.apple-mark.ghost svg { fill: var(--trip-seen); opacity: 0.4; }
.apple-trip-map:not(.still) .apple-mark.realPlane,
.apple-trip-map:not(.still) .apple-mark.ghost { cursor: pointer; }
/* The popup's own mark: a point, where MapKit puts its bottom centre, with the popup laid out from it. */
.apple-popup { position: relative; width: 0; height: 0; pointer-events: none; }
.apple-mark-dot { width: 7px; height: 7px; border: 0.5px solid rgba(0, 0, 0, 0.4); border-radius: 50%; background: #ffffff; }
```

- [x] **Step 4: Bring the design's words in line.**

**In `docs/superpowers/specs/2026-11-16-trip-map-which-plane-design.md`, replace (1 of 3):**

```markdown
  - It closes when its plane is no longer drawn: the leg ends, or, for the ghost, the plane lands. It also closes when a replay starts or stops, since what it says changes.
- **It moves with its plane,** just above the plane's mark, and its words change as the map's do, every second.
- **The words** (Todd, 16 Nov 2026), by what the map draws. Each popup is a title and one or two lines.
```

**with:**

```markdown
  - It closes when its plane is no longer drawn: the leg ends, or, for the ghost, the plane lands. It also closes when a replay starts or stops, since what it says changes.
- **It moves with its plane,** just above the plane's mark, and its words change as the map's do, every second. Near the map's top it goes under the plane, and near a side it slides in, to stay inside the map.
- **Screen readers:** like the key, it's part of the map's picture, so it's hidden from them.
- **The words** (Todd, 16 Nov 2026), by what the map draws. Each popup is a title and one or two lines.
```

**In `docs/superpowers/specs/2026-11-16-trip-map-which-plane-design.md`, replace (2 of 3):**

```markdown
| The real plane, estimated (faded) | {flight} · best guess | Not seen since {seen}, so it's drawn where it should be by now / {label} · lands {about}{landing} |
| The real plane, landed | {flight} · real plane | {label} / Reaches the gate {about}{landing} |
| The real plane, down somewhere else | {flight} · real plane | {label}, if it has one |
| The real plane in a replay | {flight} · real plane | Where it was at {moment} |
```

**with:**

```markdown
| The real plane, estimated (faded) | {flight} · best guess | Not seen since {seen}, so it's drawn where it should be by now / {label} · lands {about}{landing} |
| The real plane, landed | {flight} · real plane | {label} / Reaches the gate {at}{landing} |
| The real plane, down somewhere else | {flight} · real plane | nothing more: it has no label, and no landing time |
| The real plane in a replay | {flight} · real plane | Where it was at {moment} |
```

**In `docs/superpowers/specs/2026-11-16-trip-map-which-plane-design.md`, replace (3 of 3):**

```markdown
  - `{about}` is "about " when the landing time is the real plane's estimate (`about(leg)`, spec §9), and nothing otherwise.
  - `{landing}` is the leg's real end (`MapLeg.end`).
```

**with:**

```markdown
  - `{about}` is "about " when the landing time is the real plane's estimate (`about(leg)`, spec §9), and nothing otherwise.
  - `{at}` is "at ", as the card's sentence says once the plane is down, or "about " while the gate time is still an estimate.
  - `{landing}` is the leg's real end (`MapLeg.end`).
```

- [x] **Step 5: Run them again.** The command of Step 2. Expected: 40 tests pass. Then `npx tsc --noEmit`: nothing; and `npm test && npm run build`: 164 test files and 3,420 tests pass, and the build ends `✓ built`.

- [x] **Step 6: Todd runs everything.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && npm run build
```

Expected: 164 test files and 3,420 tests pass, and the build ends `✓ built`.

- [x] **Step 7: Commit, on Todd's yes.**

```bash
git add tests/fixtures/fakeMapKit.ts tests/copy/planePopup.test.ts tests/map/planeKey.test.ts tests/ui/planePopup.test.tsx src/copy/planePopup.ts src/map/tripMapDrawing.ts src/map/mapkitApi.ts src/ui/PlanePopup.tsx src/ui/PlaneKey.tsx src/ui/TripMapSvg.tsx src/ui/AppleTripMap.tsx src/ui/TripMapCard.tsx src/ui/TripMapPage.tsx src/styles/tripMap.css docs/superpowers/specs/2026-11-16-trip-map-which-plane-design.md
git commit -m "Which plane is which: a key to the real plane and its ghost on the trip map, and on the full map a popup on each, on Apple's map and the site's own (which plane design)"
```

- [x] **Step 8: Todd looks again.** The `crewluve-mapkit` server (port 5182), Task 10's addresses, on a computer and a phone:
  - the key at the map's top right on the card and the full map in `live-ahead`, `live-ocean-gap` and `live-on-ground-late`; none in `flying`, or in a replay;
  - pointing at each plane on a computer opens its popup, and moving away closes it; on a phone a tap opens it, and a tap elsewhere closes it;
  - the popup's words, its place over the plane (or under it near the top, slid in near a side), and that it moves with the plane;
  - on Apple's map and on the site's own (which shows when Apple's can't load).

---

### Task 12: The review of the whole branch, and the record

- [x] **Step 1: The whole branch's review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on this plan's commits as one thing, against the spec's §5 to §7, §9, §11 to §13 and §15, and this plan's list of where it differs. Make its fixes, run `npm test` and `npm run build`, and record what it found.
- [x] **Step 2: Todd runs everything once more** (Task 9 Step 6's command), if the review changed anything.
- [x] **Step 3: This plan's record.** Under "Changes made during execution": each review, each of Todd's runs (the count and the time), what Task 10 turned up, and each commit's hash.
- [x] **Step 4: Commit, on Todd's yes.**

```bash
git add docs/superpowers/plans/2026-11-16-moving-map-stage3c2-website-map.md
git commit -m "Plan 3C-2, the website's map for the real plane, with its record"
```

---

## What plan 3C-3 takes from this one

- **Todd's look (Task 10):** a plane still at the gate after its takeoff time read "Over Wisconsin", "193 mi flown" and "Flying to Anchorage" beside it. 3C-3's facts on the real path must say where the real plane is, in the facts panel **and the line under the timeline**. The whole-branch review (Task 12) adds two more that say "flying" of a plane still at the gate: the card's heading for screen readers ("In flight") and the status page's narrative.
- **The Schedule page** shows a leg's estimated landing time without "about", where the card, the countdown line and the popup say it (whole-branch review). The time is the same; only the word is missing.
- **`MapLeg.flight`** holds a flight's plan, path and record. `MapLeg`'s own `legProgress`, `positionAt`, `timeAtFraction` and `headingAt` are still the schedule's along the great circle, between the leg's real gate times, and the facts read them: "Over Québec" can name a place the real plane isn't over, and an estimated plane's sentence still says what's below by them. 3C-3 moves the facts to the path and the record.
- **The moment:** `mapFlightProgress(flight, now)` adds Crewlu Cloud's clock itself. A flight's record takes the trip's own time: a replay hands it the moment on the timeline.
- **Whether a moment is now or a replay** is `!isLive(clock)` on the full map; the card is always now. 3C-3's rows that are "for now only", like the plane's height and speed, need it.
- **"About"** is `isArrivalEstimated(leg)` (`src/map/tripMap.ts`) and `about(leg)` (`src/copy/tripMap.ts`).
- **"Last seen near Gander"** and the headline chip's order (spec §8, §9) are 3C-3's, with the story along the path. `liveSummary` takes what's below as `over`, and says it only of a plane in the air.
- **The credit** goes in the facts' footer whenever a leg has `flight?.live`. Then 3C-1, 3C-2 and 3C-3 can go live together.
- **Miles along the real path** (the app's `milesFlown` and `totalMiles`) are the facts'.

## Changes made during execution

**Batch A (Tasks 2 to 4), 16 Nov 2026.**
- Each task's steps were applied by script from this plan's own text, tests first: each test file failed as the plan says (Tasks 2 and 3: couldn't load; Task 4: 18 of 20), then passed with the code (23, 23 and 20). Every file came out the same as the tested copy. `npx tsc --noEmit`: nothing.
- The session's runs: `npx vitest run tests/map tests/engine`, 39 files and 846 tests pass; `npm test`, 152 files and 3,277 tests pass (the count this plan gives for after Task 4).
- **Review** (`superpowers:code-reviewer`, sonnet): nothing critical or important. Its answers: `withLiveTimes` keeps the delay inside the real times, and moves a duty period's or trip's edge only where it meets the flight; legs of one flight get one watch and all take its answer, as `LiveLegs.swift`; `carried` matches `TripReplayClock.carried`; `framesAll` and the framing points hold at the date line; a flight with no live data reads as before. Three minor notes, none changed:
  1. `watchedFlights`, `liveMapFlights` and `withLiveTimes` must all get the summary's schedule from before the real times are written in, and only their comments say so. Checked against Task 8's tested code: `Root` hands `useLivePlane` the summary's `schedule.schedule`, and `PilotPages` reads `schedule.schedule` for both of its calls, so it holds. Batch C's review looks at it again.
  2. `framesAll` compares with the frame before it's fitted to the map's shape, so a map may frame again a little early, never late. Harmless.
  3. A duty period's edge within a minute of two moved flights takes the first in order. No real schedule has two flights a minute apart.
- No code changed, so nothing to run again.
- **Todd's checkpoint run** (Task 4 Step 8), 16 Nov 2026 at 11:58 am: 39 files and 846 tests pass.
- **Committed on Todd's yes:** `f6e1b04` (Task 2), `9486c3c` (Task 3), `be981e3` (Task 4).

**Batch B (Tasks 5 to 7), 16 Nov 2026.**
- Applied by script from this plan's own text, tests first: each test file failed as the plan says (Task 5: the first couldn't load, all 17 of the other two failed; Task 6: 15 of 17; Task 7: the first couldn't load, 4 of the second's 6), then passed with the code (37, 17 and 10). Every file came out the same as the tested copy. `npx tsc --noEmit`: nothing.
- Tasks 5 and 7 both change `src/ui/AppleTripMap.tsx` and `src/ui/TripMapSvg.tsx`. Their state after Task 5 was saved before Task 7 was applied, so Task 5's commit carries its own version of them.
- The session's runs: `npx vitest run tests/map tests/copy tests/facts tests/ui`, 116 files and 2,038 tests pass; `npm test`, 158 files and 3,343 tests pass (this plan's count for after Task 7).
- **Review** (`superpowers:code-reviewer`, sonnet): nothing critical or important. Its answers: every phase draws what `flightDrawing`'s table says, live and in a replay; a flight with no live data draws, marks, frames and reads as before; on Apple's map a ghost made after the real plane ends up under it, a line made after the seen path under it, and nothing leaks; `useSteadyFraming` holds and lets go as this plan says, on both maps; "about" comes only from `isArrivalEstimated`; a replay says "In flight"; a replay's moment carries through without a loop. Three minor notes, none changed:
  1. On Apple's map a new line or mark has every item after it in the plan added again, also at an ordinary trip's turns (a leg's flying line appearing). Correct, and a small redraw; not worth narrowing.
  2. The narrative's "about" is said of a time within a second of the estimated arrival, so another time that equalled it would get it too. None was found; batch C's review looks at it where `estimatedArrival` is set.
  3. The seen path's colour on Apple's hybrid and satellite maps comes from the CSS on the map's box, not seen rendered. Task 10 looks at it.
- No code changed, so nothing to run again.
- **Todd's checkpoint run** (Task 7 Step 7), 16 Nov 2026 at 12:06 pm: 116 files and 2,038 tests pass.
- **Committed on Todd's yes:** `754f6fd` (Task 5, its two map files as tested after Task 5), `4689ed4` (Task 6), `fa85c59` (Task 7).

**Batch C (Tasks 8 and 9), 16 Nov 2026.**
- Applied by script from this plan's own text, tests first: each test file failed as the plan says (Task 8: `useLivePlane` couldn't load, 2 of `livePages`' 3 and Root's 2 new ones failed; Task 9: `demoLive` couldn't load, 3 of the scenes' tests and 3 of Root's failed), then passed with the code (58 and 194). Every file came out the same as the tested copy, and the whole worktree is the tested copy. `npx tsc --noEmit`: nothing.
- Tasks 8 and 9 both change `src/ui/Root.tsx` and `tests/ui/Root.test.tsx`. Their state after Task 8 (the same as the tested stage after Task 8) was saved before Task 9 was applied, so Task 8's commit carries its own version of them.
- The session's run: `npm test`, 161 files and 3,377 tests pass, and `npm run build` ends `✓ built` (this plan's numbers for after Task 9).
- **Review** (`superpowers:code-reviewer`, sonnet): nothing critical or important. Its answers: nothing asks `partner_live` from a hidden page (a page that opens hidden asks nothing until it's shown; a schedule arriving while hidden only tells the source what to watch); one source, made once, and nothing left running after the page goes; sharing ends once, and the welcome screen names the pilot; every reader takes the real times, and `watchedFlights`, `liveMapFlights` and `withLiveTimes` all get the summary's schedule from before them (batch A's first note); "about" comes from the one leg in the air with an estimate; the old scenes make nothing, a new one stays itself while open, and its plane is made up. No `innerHTML`, and nothing new reaches the network but through the door. Four minor notes, none changed:
  1. If `partner_live` ends sharing while a refresh is out, and the refresh's answer lands before Preact's next render (a microtask later), the refresh finds no device and calls `onEnded(null)`, and the welcome screen loses the pilot's name. The guard the review suggests (`mounted.current`) flips at the same moment as `useSchedule`'s own, so it wouldn't narrow it. Left: the window is a microtask and the cost a missing name. (The other order is guarded: a refresh that ends sharing first forgets the device, and the live answer after it says nothing.)
  2. The first ask goes out as the page opens, before a schedule, with no flights watched: harmless, and a flight whose window opens later waits for the next 30-second ask.
  3. `clockOffset` in the plane is refreshed only when the flights change. A browser's clock drifts slowly.
  4. When the door moves this browser to another partner, an answer in flight is dropped, and the schedule's times can show for up to 30 seconds. Rare and harmless.
- No code changed, so nothing to run again.
- **Todd said yes to commit** (Task 9 Step 7) without a run of his own in the terminal; the run on record for batch C is the session's (161 files, 3,377 tests, `✓ built`). His run of everything comes at Task 11, Step 6.
- **Committed on Todd's yes:** `a869d4e` (Task 8, its Root files as tested after Task 8), `7dd4441` (Task 9).

**Task 10, Todd's look (16 Nov 2026).** The site ran with Apple's map (`crewluve-mapkit`, port 5182), the worktree given the main checkout's MapKit token (git-ignored, good to 22 Nov).
- **`live-on-ground-late`, full map, hybrid:** the real plane at the gate in Rockford, its ghost over Wisconsin, and the pill "UPS2963 · Still on the ground · 23 min behind", as this plan says. But the facts panel said "Over Wisconsin", "193 mi flown · 2,595 to go", and the line under the timeline "Flying to Anchorage": they still read the schedule along the great circle from its takeoff, since a late plane's leg keeps the schedule's start (spec §7.1). Todd: "it's showing on the left side that it is moving, but the plane is still in Rockford?" Not changed here: it's plan 3C-3's (the facts on the real path), and nothing is live before it. **3C-3 must cover the line under the timeline too,** not only the facts panel.
- **Todd asked for a popup on the planes** ("It's not sure which plane is which, the scheduled or the real time"). Neither the app nor the site had one. Designed with him (brainstorming, mockups, one question at a time): a key and a popup, both (his pick, as recommended); the popup's words as mocked up; the app to get the same later in its own plan; and the work added to this plan before the whole-branch review. Design `docs/superpowers/specs/2026-11-16-trip-map-which-plane-design.md`, committed on his "looks good" as `2b222bb`. It became Task 11.

**Task 11, which plane is which (16 Nov 2026), built before it was written into this plan.**
- Written and tested in a scratch copy at `2b222bb`, tests and code together. Seen in a browser:
  - On Apple's map (`live-on-ground-late`, full map): the key at the top right; pointing at the real plane opened "UPS2963 · real plane / Still on the ground · 20 min behind / Lands about 6:06 PM", slid left near the edge; moving away closed it; pointing at the ghost opened "On schedule / Where UPS2963 would be if it were on time".
  - On the card (`live-ahead`): the key at the map's top right.
  - On the site's own map (`live-ocean-gap`, with no MapKit token): a click on the faded plane opened "UPS2963 · best guess / Not seen since 12:06 PM, so it's drawn where it should be by now / About 20 min behind · lands about 2:46 PM". Its two lines ran together where the first wrapped, so they're 3 px apart now.
- **Review** (`superpowers:code-reviewer`, sonnet): nothing critical. Three marked important:
  1. The card's key could run over a long top chip. **Not so:** the key shows only while a flight is under way, and the card has no top chip then (`cardChips`).
  2. MapKit may stop a press on the bare map reaching the map's box, so a tap there might not close the popup. **Fixed:** the box hears presses on their way in (`capture`), with a test where something inside stops one.
  3. `convertCoordinateToPointOnPage` is in page coordinates, which scroll, and the box's place is in the window's. **Fixed:** the scroll is taken off, with a test on a scrolled page.
- Minor notes, each left with its reason:
  4. The popup's place is worked out once a second, so a pan can leave it clipped until the next second.
  5. The thought that MapKit stacks marks north to south, not in the order added. **Checked on Apple's real map:** the marks are kept in the order added, the popup last and on top, and a tap on a plane doesn't reorder them.
  6. A plane re-added while the pointer is over it may not hear the pointer leave, so its popup stays until the next press.
  7. The key's ghost is drawn in the text's colour, not the map's ghost colour, so it shows on the key's glass in light and dark.
  8. A landed plane's popup says "at" its gate time. The design now says so (Task 11 Step 4).
  9. A popup carried from one flight's real plane to the next's. **Can't happen:** the turn between has no real plane, so the popup closes.
- The stand-in for MapKit now puts its marks inside the map, as MapKit does: a press on a plane's mark reached nothing in the tests before. Every earlier test still passes with it.
- **Run on the branch** by script from this plan's own text, tests first: the first and third test files couldn't load and all 6 of the second's failed, as Step 2 says; then 40 tests passed, `tsc --noEmit` found nothing, and `npm test` passed 164 files and 3,420 tests, with the build built. Every file came out the same as the tested copy.
- **Todd's run** (Task 11 Step 6), started in his Terminal at his choice, 16 Nov 2026 at 1:08 pm: 164 files and 3,420 tests pass, and the build built. It covers batch C too. **Committed** as he chose ("if it passes, commit"): `bd503fe`.
- **Breaks:** 67, each caught by a test. The first run caught 62 of 66: two gaps closed with tests (a press on Apple's plane; the replay's moment in the popup), one line no case reaches made plain (a plane down somewhere else has no label), and one guard no test can see left without a break (the popup opens only with words to show, and only the full map has them).

**Task 12, the review of the whole branch (16 Nov 2026).** `superpowers:code-reviewer` (sonnet) on `f7b9d3b..bd503fe` as one thing: nothing critical or important. It confirmed:
- One landing time holds end to end. The countdown, the narrative, the cards, the schedule list, the timeline, the map and the popup all read the legs built from the real times, and the three live functions all take the summary's own schedule.
- A flight with no live data draws and reads as before.
- The live source, the demo, the map's flights and the popup agree on the leg and the moment, now or in a replay.
- A popup follows a new answer.
- No reason the batch reviews left is wrong.

Seven minor notes:
1. **Fixed, on Todd's word** ("Add the safety net"). One `try` covered both the schedule and the new live code in `PilotPages`, so an answer the live code couldn't read would have left every family's status page blank. Now the live part has its own guard: on a failure the page shows the schedule as before, and the console says "Could not show the real plane". It's tested with an answer whose trail has a place with no place. That test failed first (a blank page), and 4 deliberate breaks of the guard were each caught. `npm test`: 164 files and 3,421 tests pass; the build builds.
2. A real plane running late can overlap the next flight. Its turn then goes, and the next flight's schedule plane shows beside the real one. Left: the app shifts its waits by hand and the website by `buildLegs`, so it isn't a step back. Todd looks if he meets it.
3. The card's camera moves once as the key comes and goes, since the key's height is kept clear. Left: once a flight, not a loop.
4. The Schedule page has no "about" before an estimated landing. Passed to plan 3C-3 ("What plan 3C-3 takes").
5. The card's heading for screen readers says "In flight", and the narrative "flying", of a plane still at the gate. Passed to plan 3C-3 with the facts panel.
6. `clockOffset`, and two legs of one flight whose airlines are written differently: already in "Left for later", for the reasons there.
7. A real plane on time sits on its ghost, which can't then be pointed at. That's by design: the real plane is on top.

- **Todd's run** (Task 12 Step 2), started in his Terminal at his choice, 16 Nov 2026 at 1:21 pm: 164 files and 3,421 tests pass, and the build built. **Committed** as he chose: `4492e9b` (the safety net).
- **This plan's commits, all on `claude/trip-map-live-598046`, none pushed:** `f6e1b04` (Task 2), `9486c3c` (Task 3), `be981e3` (Task 4), `754f6fd` (Task 5), `4689ed4` (Task 6), `fa85c59` (Task 7), `a869d4e` (Task 8), `7dd4441` (Task 9), `2b222bb` (the which plane design), `bd503fe` (Task 11), `4492e9b` (Task 12's fix), and this plan with its record.
- **Still to do with Todd:** his second look at the key and the popup (Task 11 Step 8). Anything it turns up gets its own fix, with a test where a test can see it.

**Todd's second look (Task 11 Step 8), 16 Nov 2026.**
- The ghost's popup: "It should say 'Where UPS2961 was scheduled to be'". Changed from "Where … would be if it were on time" in `src/copy/planePopup.ts` and the design's table; with no flight number it's "Where the flight was scheduled to be". The title stays "On schedule". Tests first: the two words tests in `tests/copy/planePopup.test.ts` failed, then passed with the change, as did the popup test in `tests/ui/planePopup.test.tsx`; Task 11's 40 tests pass, and `tsc --noEmit` finds nothing. (Task 11's code above still shows the first words; this is the change to them.) Seen on Apple's map, opened from the card as a family would. Todd's run of Task 11's tests, started in his Terminal at his choice, 16 Nov 2026 at 2:28 pm: 3 files and 40 tests pass. Committed as he chose.
- Then the key and the popup with the new words: Todd, "Looks good" (16 Nov 2026). Task 11 Step 8 is done.
- While the dev server updated the page in place as files changed, an open full map was once drawn twice, one over the other. A fresh load, and the full map opened from the card, show one map and one popup: it's the dev server's live update, not the site.

## Self-review

- **Spec coverage.**
  - §5.1, what shows in each state: Task 5. §5.3, the label: Task 6, with the engine's `liveLabel`. §5.4 and §5.5, the ghost and the estimated plane, and their looks: Task 5.
  - §6.2, how the path is drawn, and the camera framing it: Tasks 2, 4, 5 and 7.
  - §7.1, the real times: Task 3, and Task 8 where the page uses them. Alerts stay on the schedule: the website sends none.
  - §7.3, the replay: Task 5 (the real plane alone, on its record), Task 6 (the pill), Tasks 4 and 7 (the clock carries on). The timeline's blocks use the legs' times, which are the real ones.
  - §9, the words: Task 6, and Task 8 for the countdown and the narrative.
  - §12: the source owned by the page (Task 8), the engine's times (Tasks 3 and 8), the drawing on both maps (Task 5), the words (Task 6), the demo scenes (Task 9).
  - §13: no coverage at either airport, a plane seen again after its estimate, a return, a diversion and a wrong clock are each a shared case or an engine rule the drawing follows; Task 5's tests draw every shared case. The date line and long legs: a real path's joins in steps of a degree.
  - §15: the card's one sentence (Task 6); the label's words, not colour; the planes are inside the map, which is hidden from screen readers; no sliding, so Reduce Motion needs nothing new.
  - §16.4: vitest on the shared cases, the polling, the engine's times and the words; the demo scenes by eye (Task 10).
  - The which plane design (Task 10's look): the key, the popup, its words and where it goes, on both maps (Task 11).
- **Not covered here, on purpose:** §8's facts on the real path, the plane's row, "last seen near", and the credit: plan 3C-3's.
- **Placeholders:** none. Every step's code is the tested file or a replacement made from it.
- **Names** are the same in every task: `makeMapFlight(departure, arrival, origin, destination, live, clockOffset)`, `mapFlightProgress(flight, now)`, `isEstimate(flight, arrival)`, `pathPoints`, `pathRuns`, `pathPointsBetween`, `pathFramingPoints`, `pathHeadingAt`, `watchedFlights(schedule)`, `liveMapFlights(schedule, answered, clockOffset, placeOf)`, `withLiveTimes(schedule, flights, now)`, `isEstimatedArrival(leg, flights)`, `estimatedArrival(legs, flights, now)`, `MapLeg.flight`, `isArrivalEstimated(leg)`, `framingSubject(map, focus)`, `framesAll(kept, next)`, `hasTimes` and `carried(clock, span, legs, waits, now)`, `flightDrawing(leg, t, isReplay)`, `tripMapDrawing(map, t, isReplay)`, `routePoints(segment)`, `about`, `flightStatus(leg, now, isReplay)`, `spokenMinutes`, `spokenLiveLabel`, `liveSummary(leg, now, viewerTz, h24, over)`, `topPill(…, isReplay)`, `useSteadyFraming(framing, what)`, `useLivePlane({ door, device, schedule, onSharingEnded })`, `LivePlane`, `demoLiveFlights(scene, schedule, placeOf, now)` and `isLiveDemoScene`.
- **Is it the right size?** Five new modules and two hooks, each with one job, as the app has them, and no new package. What was left out on purpose: sliding the plane between fixes, a real plane parked before its leg starts, and the facts. Each is in the list of where this plan differs, or in "Left for later".
- **What could it break?**
  - A flight with no live data must draw, frame and read exactly as before. Every test of the drawing, the marks, the map, the words and the facts that was there before passes unchanged, and the new tests pin the schedule's lines and sentence.
  - The status page changes for everyone on Crewlu Cloud, not only listed pilots: it now asks `partner_live` when it's shown and every 30 seconds while a flight's window is open. With no flights answered, `withLiveTimes` hands back the very same schedule, so every card reads as before.
  - `PilotPages` builds its legs again each minute while there's a real plane. It built them only at each new schedule before.
  - The demo's 14 scenes read as before; the three new ones are new.

## Left for later

- **The facts on the real path,** the plane's row, "last seen near", and the credit: plan 3C-3. Until then an estimate's "over" place is read along the great circle.
- **Whether MapKit JS lays a dash pattern from a line's first place,** as this plan believes (Task 10 looks).
- **A real plane parked at the gate before its leg starts** isn't shown, as in the app.
- **The planes don't slide between fixes,** as in the app.
- **A time that changes by itself** waits for the next answer or the next minute.
- **Two legs of one flight logged with differently written airlines** (one `5X`, one entered) count as two flights here, and the app's key would count them as one. Rare: the second is watched and never answered, so its window stays open until 2 hours after its arrival, and the page asks for nothing it will hear.
- **The engine's own "Left for later"** (plan 3C-1) holds: asks that come back empty until the switch is `all`, a flight back on the ground after a return, a trail count that stays wrong.
