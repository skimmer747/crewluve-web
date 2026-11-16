# Moving Map Stage 3C-3 (the Website, the Facts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tell the facts about the real plane, as the app does. Where Crewlu Cloud has seen the pilot's flight, the facts follow the path it really flew: what's below it, the borders it crossed and when (a best guess, with "about", where nobody saw it), where it was last seen while it's out of sight, the sun from where it really was, and the miles it really flew. The facts gain a row for the plane itself, adsb.lol is credited, a plane still at its gate after its takeoff time is told as on the ground, and then 3C-1, 3C-2 and 3C-3 go live together.

**Architecture:**
- **One place says where the plane is** (`src/facts/planePosition.ts`): `legPlane(leg, t, isReplay)`, by the map's own rule, so the facts' plane is the one the map draws, now and in a replay. A leg answers for its path and times (`src/facts/legCourse.ts`), from the record where there is one and from the schedule, exactly as before, where there isn't.
- **The story is made along the path and read by distance** (`src/facts/legStory.ts`), so a real path's places stay put as it grows. **Every event is told** (`src/facts/milestone.ts`); one the plane wasn't seen at is a best guess (`isEstimate`), and its time reads "about".
- **The sky follows the record** (`src/facts/sky.ts`), and **the miles count along real paths** (`src/facts/tripTotals.ts`, which takes `milesFlown` and `totalMiles` from the map's model).
- **The words** are `src/copy/facts.ts`'s, with the aircraft's names in `src/facts/aircraftTypeNames.ts`.
- **The facts read the real plane** (`src/facts/tripFacts.ts`, `tripFactsRows.ts`), and know whether their moments are a replay's.
- **A store** (`src/facts/factsStore.ts`), owned by the status page, keeps a real path's story and sun events by its flight, made again as the path grows, no oftener than once a minute.
- **The views** credit adsb.lol under the facts, and the full map's replay gets a replay's facts.
- **The website's own:** a plane still on the ground at its gate after its takeoff time is told as on the ground everywhere, and the Schedule page says "about" before a landing estimate.

**Tech Stack:** Preact 10, TypeScript 5.9 (strict), Vite 5, Vitest 3 (node for the pure code, happy-dom for the views). No new package.

**Sources (read only):**
- **The spec,** in the Crewluv repo (`~/Dev/Crewluv`, at `9f06e71`): `docs/superpowers/specs/2026-11-14-crewluve-moving-map-stage3-live-design.md` ("the spec"), §8, §9, §15 and §16.4.
- **The best guesses design,** same repo: `docs/superpowers/specs/2026-11-15-crewluve-facts-best-guesses-design.md` (§2 and §3), which refines the spec's §8, §9 and §15. Its §4 (the list newest first) is plan 3C-4's.
- **The app's code at `6d3e74e`** is this plan's reference: plan 3B-3 (`docs/superpowers/plans/2026-11-15-moving-map-stage3b3-app-facts.md`, commits `8774c6a` to `f7df490`) and the best guesses plan's Task 2 (`docs/superpowers/plans/2026-11-15-facts-best-guesses.md`, `6d3e74e`). Not its later commits: the list newest first (`5ad717f`) and the latest event (`a78e841`, `a94ed20`) are plan 3C-4's. Plan 3B-3's list of where it differs from the spec holds here too, and its "What the website's plan takes from this one".
- **Plan 3C-2** (`docs/superpowers/plans/2026-11-16-moving-map-stage3c2-website-map.md`, on this branch): its "What plan 3C-3 takes from this one".

**This is the third of four plans for the website** (Todd's choice, 15 Nov 2026): 3C-1 the engine and 3C-2 the map (done, on this branch); **3C-3 the facts** (this plan); 3C-4 the newest-first list and the latest event.

**Going live (Todd, 16 Nov 2026):** 3C-1, 3C-2 and 3C-3 go live together, in this plan's last task, and only on Todd's yes then. The spec's rollout (§17) has the website follow once the app has followed a real flight on TestFlight: Todd decides then.

**How this plan was checked.** Every code block here comes from a file that was run before the plan was put together. None was typed into the plan by hand: a script made each replacement from the tested files and built the plan.
- **A scratch copy of this branch** at `0c5c639`, with this plan's files laid over it.
  - Before: 164 test files and 3,421 tests, all passing.
  - With this plan: 175 test files and 3,614 tests, all passing. `tsc --noEmit` finds nothing, and `npm run build` builds.
  - The new tests run the shared cases through the new code: at every moment of every flight of `live-cases.json`, the facts' plane is where the map draws it and as far along its path as the case says.
- **Task by task:** the copy was kept as it stood after each of Tasks 2 to 10, and type-checked and tested each time. Every one passed: after Task 2, 166 test files and 3,450 tests; after Task 3, 167 and 3,465; after Task 4, 169 and 3,484; after Task 5, 171 and 3,505; after Task 6, 172 and 3,536; after Task 7, 174 and 3,556; after Task 8, 175 and 3,575; after Task 9, 175 and 3,608; and after Task 10, 175 and 3,614. Each task's tests were also run before its code, and failed as its Step 2 says.
- **235 deliberate breaks** were made in the new code, one at a time, each task's in turn (10, 19, 27, 50, 38, 33, 31, 24 and 3), and each fails at least one test. The ones that slipped through at first each led to a sharper test. A few can't be caught by any test, each for its reason: a key's part another part already covers (the store, as the app's own plan found of its key), `t > leg.end` for `t >= leg.end` in the miles (at the arrival the plane is already at the path's end), the replay flag on a "Trip so far" row that only shows when no flight is under way, and a landed path's flown length being its whole length.
- **Reviewed** by `superpowers:code-reviewer` (sonnet), the whole change, before the plan was put together. Nothing critical. One important: the at-the-gate words came on during an on-time flight's taxi-out, against Todd's "after its takeoff time"; fixed in Task 10, with the sky row at the gate and the sun events' height, each with tests. What it left is in "Left for later". It checked and found right: the facts', the map's and the popup's planes agree now and in a replay; the store is at most a minute old, never made twice and bounded; "about" only where the plane wasn't seen; the at-the-gate words now only.
- **Seen in a browser,** in the scratch copy's dev server with Apple's map: `live-on-ground-late` (the chip, the heading, the status sentence, "Still on the ground in Rockford", "2,788 mi to go · Halfway at about 7:32 PM", "On the ground in Rockford" under the timeline, no sky row, nothing of the flight listed, the credit); `live-ocean-gap` ("Over Northwest Territories", "Last seen over Alberta · 45 min ago", the plane's row without its height, "1,880 mi flown · 922 to go", the crossings nobody saw with "about", the credit); `live-ahead` ("Over Indiana", "Boeing 767-300", "35,000 ft · 530 mph", "168 mi flown · 162 to go"); and `flying`, as before: no plane's row, "Averaging about 290 mph", no credit.
- **The plan itself** is checked by a script: every step of Tasks 2 to 10, followed in order on the branch's files at `0c5c639`, gives every file as tested after each task.
- **Not checked:** nothing called Crewlu Cloud or adsb.lol. The aircraft's names are the app's table, copied exactly; the app's plan noted that table was written from memory of ICAO's list.

**Where this plan settles details, or differs from the app.** Plan 3B-3's list and the best guesses plan's hold here; what's the website's own:
- **A plane still on the ground at its departure airport after the plan's takeoff time** (Todd, 16 Nov 2026; the bar's own "Still on the ground") is told as on the ground, now only (a replay reads the schedule's or the record's plane):
  - the facts' headline and first row: "Still on the ground in Rockford", leading the headline ahead of any event or sun countdown (the schedule's times could otherwise tell a crossing the plane hasn't made); the distance row: "2,788 mi to go"; no sky row; nothing of that flight listed as passed; its halfway and closest point to home with "about", and a guessed closest point already past left out;
  - under the full map's timeline: "On the ground in Rockford" (and in the slider's spoken value);
  - the status page's sentence: "Alex is still on the ground in Rockford on UPS flight 2963 to Anchorage — landing in …", in place of the delayed-departure sentence too; with no flight number, "on the flight to Anchorage";
  - the card's heading for screen readers: "On the ground".
  - The app says "flying" there; it gets these words later, with the key and the popup (Todd, 16 Nov 2026).
- **The Schedule page says "about"** before a landing time that's the real plane's estimate: "7:00am est – about 9:10am est".
- **"Last seen" is said only of a plane in the air,** in the card's sentence, as "over" already is. The app adds it whatever the plane is doing.
- **The miles live in the facts:** `milesFlown` and `totalMiles` move from `src/map/tripMap.ts` to `src/facts/tripTotals.ts`, as the map's code never reads the facts'.
- **The store makes a real path's first story at once.** The website has no wait like the app's `prepare`. The first is made when the path is first met, and the next no sooner than a minute after the last. The route's story then never has to stand in. Memory is bounded: a flight back on the schedule loses its entry, and past 20 kept, flights not on the map are forgotten.
- **The store makes a real path's story again when the geography arrives or home changes.** The app's key leaves home out, so there a home change in mid-flight leaves the closest point to home stale.
- **The credit is one panel's:** the website has one facts panel, where the app has a sheet and a panel. Its spoken sentence is in a hidden span, as the delay banner's is.
- **The full map's facts at a replay moment** are made by the status page with `isReplay` and the same store, once a render, and handed in with the moment: `factsAt(t, now, isReplay)`.
- **No "In the air now" tag** and no newest-first list: plan 3C-4's.

**Questions for Todd:** answered on 16 Nov 2026: the words for a plane still on the ground ("Yes, these words"); this plan ends by going live, on his yes then ("Last task: go live on my yes"); the app gets the same words later, with the key and the popup ("Yes, with the key and popup"). Plan 3B-3's answers stand for the website: the last-seen words, and no credit on the status page's card.

---

## Ground rules for whoever runs this plan

These come from Todd's standing instructions. They override the skill's defaults.

1. **Work only in this worktree:** `/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046`, on its branch `claude/trip-map-live-598046`, at `0c5c639` or later.
   - Never edit the main checkout, `/Users/toddanderson/Dev/Crewluve Website`: its untracked plan file isn't this work's.
   - `~/Dev/Crewluv` is shared with other sessions. Only read it: change, stash, reset or switch nothing there.
2. **Never commit without Todd's yes in the conversation,** and then only the task's own files, by path. **Never push, and never merge into `main`,** but in Task 13, on Todd's yes then.
3. **The tests:** the session runs them as it works (`npx vitest run <files>`, `npm test`, `npm run build`). At each batch's checkpoint, Todd runs the batch's command himself. Don't change files while he's running them, and don't ask for a run until the files are final.
4. **The shared cases are the judge.** `tests/fixtures/trip-map/live-cases.json` and `facts-cases.json` are the app's, never edited. If a case fails, the code is wrong. If you believe a case is wrong, STOP and tell Todd.
5. **Copy the code as written.** It was run as it stands. A replacement is exact: its text is in the file once. If it isn't, stop: the file has changed since this plan was written.
6. **Nothing here calls Crewlu Cloud or adsb.lol.** Every test uses a stand-in, and the tests can't reach the network. Change nothing in Crewlu Cloud's live Supabase project, and don't read it.
7. **Unchanged:** every request to Crewlu Cloud still goes through the door and its guard (`tests/data/doorRules.test.ts` and `doorRulesScan.test.ts` must pass), no `innerHTML`, no download, no `npm install`.
8. **Reviewers:** dispatch `superpowers:code-reviewer` with `model: "sonnet"`.
9. **No release note.** The website has none; Task 13 says what went live in this plan's record.
10. **One commit to a task.** Where two tasks of one batch change the same file, a task's commit takes the file as that task left it. So before a task's Step 1, copy aside every file it changes that an earlier task of its batch changed (that copy is the earlier task's version), and stage the copy for the earlier task's commit with `git update-index --cacheinfo 100644,$(git hash-object -w <copy>),<path>`, as plan 3C-2's Tasks 5 and 8 were committed.

## File map

| File | Tasks | Responsibility |
|---|---|---|
| `src/facts/planePosition.ts` | create (2) | where the facts have the plane, by the map's rule |
| `src/facts/legCourse.ts` | create (2) | a leg's path and its times as the facts follow them, and where the plane was seen |
| `src/facts/legStory.ts`, `src/facts/milestone.ts` | modify (3) | the story along the path, read by distance; every event told, a best guess where nobody saw it |
| `src/facts/sky.ts`, `src/facts/tripTotals.ts`, `src/copy/factsTrip.ts` | modify (4) | the sky along the record from the real plane's cruise; the miles along real paths |
| `src/map/tripMap.ts` | modify (4, 9) | the miles move to the facts; whether a leg's real plane is still on the ground |
| `src/facts/aircraftTypeNames.ts` | create (5) | an aircraft's name from its type code |
| `src/copy/facts.ts`, `src/facts/factRow.ts` | modify (5, 6, 8) | the words: last seen, the aircraft, height and speed, "about", still on the ground, the credit; the plane's row; the credit's flag |
| `src/copy/tripMap.ts` | modify (4, 5, 9) | the card's sentence with where a plane was last seen; the line under the timeline at the gate |
| `src/facts/tripFacts.ts`, `src/facts/tripFactsRows.ts` | modify (3, 6, 7, 8, 9, 10) | the headline, the rows, the card's sentence and the trip so far from the real plane |
| `src/facts/factsStore.ts` | create (7) | a real path's story and sun events, kept by its flight |
| `src/ui/FactsFooter.tsx`, `src/ui/FactsBody.tsx`, `src/ui/TripMapPage.tsx` | modify (8) | the credit; a replay's facts |
| `src/ui/PilotPages.tsx` | modify (7, 8, 9) | owns the store; a replay's facts; who's still on the ground |
| `src/map/mapFlight.ts`, `src/map/tripActivity.ts`, `src/engine/liveLegs.ts` | modify (9, 10) | whether a real plane is still at its gate after its takeoff time |
| `src/copy/narrative.ts`, `src/copy/schedule.ts`, `src/ui/StatusScreen.tsx`, `src/ui/ScheduleView.tsx`, `src/ui/TripMapCard.tsx`, `src/ui/TripTimeline.tsx` | modify (9) | the status sentence, the Schedule page's "about", the card's heading and the timeline's line |
| `tests/facts/liveFacts.ts` | create (2) | made-up real planes the facts' tests can work out by hand, and the shared cases' legs |
| `tests/facts/*.test.ts`, `tests/copy/*.test.ts`, `tests/map/*.test.ts`, `tests/engine/liveLegs.test.ts`, `tests/ui/*.test.tsx` | create / modify | each task's tests, named in its Files |

## Batches

Review with `superpowers:code-reviewer` (sonnet) after each batch, then Todd runs that batch's command, then ask to commit:

- **A, the pieces:** Tasks 2 to 5. Nothing a family sees changes but the card's sentence for a plane out of sight.
- **B, the facts and their store:** Tasks 6 and 7. After Task 7 the facts follow the real plane.
- **C, the views, the website's own and the review's fixes:** Tasks 8 to 10.

Then Task 11, Todd's look at the demo scenes; Task 12, the review of the whole branch and this plan's record; and Task 13, going live, on Todd's yes.

---

### Task 1: Before starting

- [x] **Step 1: Check the worktree and the branch.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git status --short && git branch --show-current && git log --oneline -1
```

Expected: nothing changed but this plan's file, `claude/trip-map-live-598046`, and `0c5c639` or a later commit of this plan's.

- [x] **Step 2: Read plan 3C-2's "What plan 3C-3 takes from this one",** the best guesses design, and plan 3B-3's list of where it differs from the spec (its lines 46 to 72).

---

### Task 2: Where the plane is, and the leg as the facts follow it

The facts get one place that says where the plane is at a moment, by the map's own rule: the real plane at its last fix while it's seen, flying the plan from there once it's an estimate, where the record has it in a replay, and the schedule's plane otherwise (`legPlane`). Beside it, a leg answers for its path: its length, the time it reaches any distance, whether the plane was seen there, its halfway time and its time in the air (`legCourse`), from the record where there is one and from the schedule, exactly as before, where there isn't. The app's `PlanePosition` and `MapLeg+Course` at `6d3e74e`, where "about" is decided by whether the plane was seen. Nothing uses them yet.

**Files:**
- Create: `src/facts/legCourse.ts`, `src/facts/planePosition.ts`
- Test: `tests/facts/legCourse.test.ts`, `tests/facts/liveFacts.ts`, `tests/facts/planePosition.test.ts`

- [x] **Step 1: Write the tests.**

**Create `tests/facts/legCourse.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import {
  coursePositionAt, hasLiveData, isSeenAt, kindAtDistance, legAirborne, legHalfwayTime, legPath, legPathLength,
  legTimeAtDistance,
} from '../../src/facts/legCourse'
import { legPlane } from '../../src/facts/planePosition'
import { METERS_PER_NM } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { legDistanceMeters, type MapLeg } from '../../src/map/tripMap'
import { at as atIso, expectNear, LIVE_CASES } from '../map/liveCases'
import { equatorFlight } from './factsTestData'
import { caseMapLeg, dogLeg, equatorLive, equatorLiveLeg, liveTime, meters } from './liveFacts'

/**
 * A leg as the facts follow it (Stage 3 spec §8), as the app's MapLegCourseTests: its path, and its times by its record
 * or by the schedule. The made-up real plane is liveFacts': a degree of longitude every 8 minutes from 10:15 UTC.
 */

const SECOND = 1000

/** That time on the day of the equator flight, the March equinox. */
const at = (time: string) => Date.parse(`2026-03-20T${time}:00Z`)

const schedule = equatorFlight(0, 20)

/** The real plane, last seen at `seenUntil`, with the leg as it's handed on then. */
const live = (seenUntil: string, unseen?: [number, number]): MapLeg => equatorLiveLeg(equatorLive(at(seenUntil), { unseen }), at(seenUntil))

describe("a leg's path (Stage 3 spec §8)", () => {
  it('with no flight, is the great circle', () => {
    expect(legPath(schedule).isReal).toBe(false)
    expect(legPath(schedule).length).toBe(legDistanceMeters(schedule))
    expect(legPathLength(schedule)).toBe(legDistanceMeters(schedule))
  })

  it('is longer, for a real path that leaves the great circle', () => {
    const seenUntil = liveTime(13)
    const leg = equatorLiveLeg(equatorLive(seenUntil, { latitude: dogLeg }), seenUntil)
    expect(legPath(leg).isReal).toBe(true)
    // Each ramp is the long side of a 1° by 2° triangle: about 1.24° more than the degree it covers.
    expectNear(legPathLength(leg) - legDistanceMeters(leg), meters(2 * (Math.sqrt(5) - 1)), meters(0.05), 'the extra')
  })

  it("has the kind of the path's stretch at any distance", () => {
    const leg = live('11:10', [4, 6.5])
    expect(kindAtDistance(legPath(leg), meters(3))).toBe('seen')
    expect(kindAtDistance(legPath(leg), meters(5)), 'nobody saw it from 4° E to 6.5° E').toBe('unseen')
    expect(kindAtDistance(legPath(leg), meters(6.7))).toBe('seen')
    expect(kindAtDistance(legPath(leg), meters(15)), 'the way ahead').toBe('planned')
    expect(kindAtDistance(legPath(schedule), meters(5))).toBe('planned')
  })

  it('has live data once Crewlu Cloud has seen the flight', () => {
    expect(hasLiveData(schedule), 'a leg made by hand').toBe(false)
    expect(hasLiveData(equatorLiveLeg(null, at('11:10'))), 'no answer for the leg').toBe(false)
    const waiting: LiveFlight = { legId: 'eq', callsign: 'TST1', state: 'waiting', fix: null, landedAt: null, trail: [] }
    expect(hasLiveData(equatorLiveLeg(waiting, at('11:10'))), 'watched, and never seen').toBe(false)
    expect(hasLiveData(live('11:10'))).toBe(true)
    // Not in the app's test: a fix with no real path yet, the plane seen at its gate.
    const atTheGate: LiveFlight = {
      ...waiting, state: 'ground', fix: { place: { lat: 0, lng: 0 }, altitudeFt: null, groundSpeedKt: 0, trackDeg: null, onGround: true, registration: null, typeCode: null, seenAt: at('10:05') },
    }
    expect(hasLiveData(equatorLiveLeg(atTheGate, at('10:05'))), 'seen at the gate').toBe(true)
  })
})

describe("a leg's times (Stage 3 spec §8)", () => {
  it("with a record, are the record's, for every shared case", () => {
    let checked = 0
    for (const flightCase of LIVE_CASES.flights) {
      const moment = flightCase.moments[0]
      if (!flightCase.record || !moment) continue
      const leg = caseMapLeg(flightCase, moment)
      for (const time of flightCase.record.times) {
        const found = legTimeAtDistance(leg, time.alongNm * METERS_PER_NM)
        expect(found, flightCase.name).not.toBeNull()
        expectNear(found!, atIso(time.at), 0.5 * SECOND, `${flightCase.name} at ${time.alongNm} nm`)
        checked += 1
      }
    }
    expect(checked, "the cases' times").toBeGreaterThan(15)
  })

  it('on the schedule, are that share of its time in the air', () => {
    expect(legTimeAtDistance(schedule, legDistanceMeters(schedule) / 4), 'a quarter of three hours after 10:15').toBe(at('11:00'))
    expect(legTimeAtDistance(schedule, 0)).toBe(at('10:15'))
    expect(legTimeAtDistance(schedule, legDistanceMeters(schedule))).toBe(at('13:15'))
  })

  it('of a leg that goes nowhere, is its takeoff', () => {
    const nowhere = equatorFlight(0, 0)
    expect(legPathLength(nowhere)).toBe(0)
    expect(legTimeAtDistance(nowhere, 0)).toBe(at('10:15'))
    expect(legHalfwayTime(nowhere), 'halfway through its time in the air, as before').toBe(at('11:45'))
  })

  it('with a record, are when the real plane was there', () => {
    const leg = live('11:10')
    expectNear(legTimeAtDistance(leg, meters(5))!, at('10:55'), 2 * SECOND, 'at 5° E')
    expect(legTimeAtDistance(schedule, meters(5)), "the schedule's plane is there five minutes later").toBe(at('11:00'))
  })

  it('halfway, on the schedule, is the middle of its time in the air', () => {
    expect(legHalfwayTime(schedule)).toBe(at('11:45'))
  })

  it('halfway, with a record, is when the real plane is halfway along its path', () => {
    // Seen as far as 6.875° E. At its own 450 kt it's at 10° E 25 minutes later.
    const leg = live('11:10')
    expectNear(legHalfwayTime(leg)!, at('11:35'), 30 * SECOND, 'halfway')
  })

  it('are seen all the way on a flight seen to its landing', () => {
    const landedAt = liveTime(20)
    const landed = equatorLiveLeg(equatorLive(liveTime(19.75), { landedAt }), landedAt)
    expect(isSeenAt(landed, meters(5))).toBe(true)
    expect(isSeenAt(landed, meters(19.9)), 'it was seen down two minutes after it was last seen in the air').toBe(true)
  })

  it('are not seen over a landing nobody saw', () => {
    // Last seen at 15.625° E at 12:30, and seen down at 20° E 25 minutes later: nobody saw its approach.
    const landedAt = liveTime(20)
    const leg = equatorLiveLeg(equatorLive(at('12:30'), { landedAt }), landedAt)
    expect(isSeenAt(leg, meters(15))).toBe(true)
    expect(isSeenAt(leg, meters(18))).toBe(false)
  })

  it('are seen only where the real plane was seen', () => {
    const leg = live('11:10', [4, 6.5])
    expect(isSeenAt(leg, meters(3))).toBe(true)
    expect(isSeenAt(leg, meters(5)), 'nobody saw it cross 5° E').toBe(false)
    expect(isSeenAt(leg, meters(6.7))).toBe(true)
    expect(isSeenAt(leg, meters(15)), "it isn't there yet").toBe(false)
    expect(isSeenAt(schedule, meters(5)), 'the schedule tells every crossing').toBe(true)
  })
})

describe("the sky's questions of a leg (Stage 3 spec §8)", () => {
  it('in the air, on the schedule, is its time in the air', () => {
    expect(legAirborne(schedule)).toEqual({ start: at('10:15'), end: at('13:15') })
  })

  it('in the air, with a record, is from leaving the airport to its touchdown', () => {
    const leg = live('11:10')
    const record = leg.flight?.record
    expect(record).toBeTruthy()
    const airborne = legAirborne(leg)
    expect(airborne).not.toBeNull()
    // The first place it was seen is 15 nm out at 10:17. At the plan's 420 kt it left about two minutes before.
    expectNear(airborne!.start, at('10:15'), 30 * SECOND, 'takeoff')
    // Not in the app's test: the record's takeoff, 10:14:51, not the schedule's 10:15 the leg's real times also give.
    expect(airborne!.start).toBeLessThan(at('10:15'))
    expect(airborne!.end).toBe(record!.touchdown)
    expect(airborne!.end, "it's ahead of the schedule").toBeLessThan(at('13:15'))
  })

  it('the course keeps moving after the plane was last seen', () => {
    const leg = live('11:10')
    expectNear(coursePositionAt(leg, at('11:10')).lng, 6.875, 0.001, 'where it was last seen')
    expectNear(coursePositionAt(leg, at('11:12')).lng, 7.125, 0.01, 'two more minutes at 450 kt')
    expectNear(legPlane(leg, at('11:12'), false).place.lng, 6.875, 0.001, 'while the plane the map draws waits where it was last seen')
  })

  it("the course, on the schedule, is the schedule's plane", () => {
    expectNear(coursePositionAt(schedule, at('11:45')).lng, 10, 1e-6, '10° E')
  })
})
```

**Create `tests/facts/liveFacts.ts`:**

```ts
import { EARTH_RADIUS_M, METERS_PER_MILE } from '../../src/map/greatCircle'
import type { LiveFlight, TrailPoint } from '../../src/map/liveFlight'
import { makeMapFlight, mapFlightProgress, type MapFlight } from '../../src/map/mapFlight'
import type { MapLeg } from '../../src/map/tripMap'
import { airport, at, caseFlight, LIVE_CASES, type CaseFlight } from '../map/liveCases'
import { equatorFlight, EQUINOX, mark } from './factsTestData'

/**
 * A made-up real plane for the equator flight (Stage 3 spec §8), so the facts on a real path can be worked out by hand,
 * as the app's FactsTestData+Live. The schedule has the flight in the air from 10:15 to 13:15 UTC, and its plan
 * cruises at about 420 kt. The real plane leaves 0° E at 10:15 too, and flies a degree of longitude every 8 minutes
 * (450 kt): it's at 5° E at 10:55, 10° E at 11:35, 14° E at 12:07 and 20° E at 12:55. It's seen every 2 minutes from
 * 10:17. Made up, as the shared cases' flights are: no real flight's data.
 */

const MINUTE = 60_000

/** When the real plane leaves the ground: 10:15 UTC. */
export const LIVE_TAKEOFF = EQUINOX + 15 * MINUTE

/** The real plane takes this long for each degree of longitude, in ms. */
export const LIVE_MS_A_DEGREE = 480_000

/** One degree along the equator, in meters and in miles. */
export const METERS_A_DEGREE = (EARTH_RADIUS_M * Math.PI) / 180
export const MILES_A_DEGREE = METERS_A_DEGREE / METERS_PER_MILE

/** `degrees` of longitude along the equator, in meters. */
export const meters = (degrees: number) => degrees * METERS_A_DEGREE

export const liveLongitude = (t: number) => (t - LIVE_TAKEOFF) / LIVE_MS_A_DEGREE

export const liveTime = (longitude: number) => LIVE_TAKEOFF + longitude * LIVE_MS_A_DEGREE

/** An ISO time as epoch ms. */
export const date = (iso: string) => Date.parse(iso)

export interface EquatorLiveOptions {
  /** Longitudes between which nobody saw it, both ends left out. */
  unseen?: [number, number]
  /** When it was seen on the ground at the arrival airport, for a flight that has landed. */
  landedAt?: number
  altitudeFt?: number | null
  typeCode?: string | null
  registration?: string | null
  /** How far north of the equator it flies at a longitude, for a path that leaves the great circle. */
  latitude?: (longitude: number) => number
}

/** The real plane's live data as Crewlu Cloud has it once it was last seen at `seenUntil`. */
export function equatorLive(
  seenUntil: number,
  { unseen, landedAt, altitudeFt = 36_000, typeCode = 'B763', registration = 'N370UP', latitude = () => 0 }: EquatorLiveOptions = {},
): LiveFlight {
  const trail: TrailPoint[] = []
  for (let t = LIVE_TAKEOFF + 2 * MINUTE; t <= seenUntil; t += 2 * MINUTE) {
    const longitude = liveLongitude(t)
    const isSeen = !unseen || !(unseen[0] < longitude && longitude < unseen[1])
    if (isSeen) trail.push({ time: t, place: { lat: latitude(longitude), lng: longitude }, altitudeFt })
  }
  const longitude = liveLongitude(seenUntil)
  const fix = landedAt != null
    ? { place: { lat: 0, lng: 20 }, altitudeFt: null, groundSpeedKt: 30, trackDeg: null, onGround: true, registration, typeCode, seenAt: landedAt }
    : { place: { lat: latitude(longitude), lng: longitude }, altitudeFt, groundSpeedKt: 450, trackDeg: 90, onGround: false, registration, typeCode, seenAt: seenUntil }
  return { legId: 'eq', callsign: 'TST1', state: landedAt == null ? 'airborne' : 'landed', fix, landedAt: landedAt ?? null, trail }
}

export interface EquatorLegOptions {
  east?: number
  id?: string
  /** Crewlu Cloud's clock minus this browser's, in ms. */
  clockOffset?: number
}

/** The equator flight with `live` for its real plane, as the status page hands it on at `now`: between the real plane's times. */
export function equatorLiveLeg(live: LiveFlight | null, now: number, { east = 20, id = 'eq', clockOffset = 0 }: EquatorLegOptions = {}): MapLeg {
  const scheduled = equatorFlight(0, east, EQUINOX, id)
  const flight = makeMapFlight(scheduled.start, scheduled.end, scheduled.origin.place, scheduled.destination.place, live, clockOffset)
  if (!flight) throw new Error('The equator flight has no plan')
  const progress = mapFlightProgress(flight, now)
  return { ...scheduled, start: progress.start, end: progress.end, flight }
}

/** Home, half a degree north of 14° E: the equator flight passes 35 mi from it. */
export const HOME_BY_THE_EQUATOR = mark('HOME', 0.5, 14)

/**
 * A path that leaves the great circle: north from 6° E to 2° N by 7° E, along it to 9° E, and back to the equator by
 * 10° E.
 */
export const dogLeg = (longitude: number) => Math.max(0, Math.min(longitude - 6, 10 - longitude, 1)) * 2

// The shared cases' flights (tests/fixtures/trip-map/live-cases.json) as the facts take them, as the app's LiveCaseLegs.

export type CaseMoment = CaseFlight['moments'][number]

/** The shared case of that name. */
export function caseNamed(name: string): CaseFlight {
  const found = LIVE_CASES.flights.find((f) => f.name === name)
  if (!found) throw new Error(`No shared case named ${name}`)
  return found
}

/** The case's moment at `time`, written as the app's tests write it: "13T12:45:00" is 2026-11-13 12:45 UTC. */
export function caseMoment(flightCase: CaseFlight, time: string): CaseMoment {
  const wanted = at(`2026-11-${time}Z`)
  const found = flightCase.moments.find((m) => at(m.at) === wanted)
  if (!found) throw new Error(`${flightCase.name} has no moment at ${time}`)
  return found
}

/** A flight case as the map's flight: its plan, its path and its record, made together. */
export function caseMapFlight(flightCase: CaseFlight, clockOffset = 0): MapFlight {
  const flight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), airport(flightCase.from), airport(flightCase.to), caseFlight(flightCase.flight), clockOffset)
  if (!flight) throw new Error(`${flightCase.name} has no plan`)
  return flight
}

const caseMark = (code: string) => ({ code, city: code, place: airport(code), timeZone: null })

/**
 * A flight case as a leg of the map, between the gates at the times the case expects at `moment`: the real plane's,
 * as the status page hands them on.
 */
export function caseMapLeg(flightCase: CaseFlight, moment: CaseMoment, id = 'f1'): MapLeg {
  return {
    id, kind: 'flight', origin: caseMark(flightCase.from), destination: caseMark(flightCase.to),
    start: at(moment.start), end: at(moment.end), flightNumber: 'UPS207', flight: caseMapFlight(flightCase),
  }
}
```

**Create `tests/facts/planePosition.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { legPathLength, legPath } from '../../src/facts/legCourse'
import { legPlane, mapFlightPlane } from '../../src/facts/planePosition'
import { flightDrawing } from '../../src/map/flightDrawing'
import { METERS_PER_NM, type GeoPoint } from '../../src/map/greatCircle'
import type { LiveFix, LiveFlight } from '../../src/map/liveFlight'
import { isMoving, legDistanceMeters, legProgress, positionAtTime } from '../../src/map/tripMap'
import { at, expectNear, LIVE_CASES } from '../map/liveCases'
import { equatorFlight } from './factsTestData'
import { caseMapFlight, caseMapLeg, caseMoment, caseNamed, date, dogLeg, equatorLive, equatorLiveLeg, liveTime, METERS_A_DEGREE } from './liveFacts'

/**
 * Where the facts have a flight's plane (Stage 3 spec §8), as the app's PlanePositionTests: wherever the map draws it,
 * for every moment of the shared cases in tests/fixtures/trip-map/live-cases.json, and where the record has it in a
 * replay.
 */

const SECOND = 1000

/** Both places there, and within `accuracy` of a degree. */
function expectSame(place: GeoPoint | null | undefined, expected: GeoPoint | null | undefined, what: string, accuracy = 1e-9) {
  expect(place != null && expected != null, `a place is missing: ${what}`).toBe(true)
  if (!place || !expected) return
  expectNear(place.lat, expected.lat, accuracy, `${what}, latitude`)
  expectNear(place.lng, expected.lng, accuracy, `${what}, longitude`)
}

describe('the plane now (Stage 3 spec §8)', () => {
  it('at every shared moment, is where the map draws the plane', () => {
    let real = 0
    let scheduled = 0
    for (const flightCase of LIVE_CASES.flights) {
      for (const moment of flightCase.moments) {
        const what = `${flightCase.name} at ${moment.at}`
        const t = at(moment.at)
        const leg = caseMapLeg(flightCase, moment)
        if (!isMoving(leg, t)) continue
        const drawing = flightDrawing(leg, t, false)
        const plane = legPlane(leg, t, false)
        const drawn = drawing.realPlane
        if (drawn) {
          expectSame(plane.place, drawn.place, what)
          expect(plane.isEstimated, what).toBe(drawn.isEstimated)
          expect(plane.isEstimated, what).toBe(moment.phase === 'estimated')
          expect(plane.isSeenInAir, what).toBe(moment.phase === 'inAir')
          // A plane on the ground somewhere else isn't on the path: it counts as far as it was last seen.
          expectNear(plane.distance / METERS_PER_NM, moment.planeAlongNm ?? flightCase.path.flownNm, 0.01, what)
          real += 1
        } else {
          expectSame(plane.place, drawing.plane?.place, what)
          expectNear(plane.distance, legProgress(leg, t) * legPathLength(leg), 0.001, what)
          expect(plane.isEstimated, what).toBe(false)
          expect(plane.isSeenInAir, what).toBe(false)
          scheduled += 1
        }
      }
    }
    expect(real, "the cases' real planes").toBeGreaterThan(20)
    expect(scheduled, "and the moments with the schedule's plane alone").toBeGreaterThan(2)
  })

  it("an estimated plane says how long ago it was seen, by Crewlu Cloud's clock", () => {
    const flightCase = caseNamed('ahead, in the air')
    const seenAt = caseMapFlight(flightCase).live!.fix!.seenAt

    const estimated = caseMoment(flightCase, '13T12:45:00')
    const plane = mapFlightPlane(caseMapFlight(flightCase), at(estimated.at), false)
    expectNear(plane!.unseenFor!, at(estimated.at) - seenAt, 1, 'unseen for')

    // This browser's clock is ten minutes slow: by Crewlu Cloud's the plane was last seen ten minutes longer ago.
    const inAir = caseMoment(flightCase, '13T12:41:50')
    const slow = mapFlightPlane(caseMapFlight(flightCase, 600 * SECOND), at(inAir.at), false)
    expectNear(slow!.unseenFor!, at(inAir.at) - seenAt + 600 * SECOND, 1, 'unseen for, by the slow clock')
    expect(slow?.isSeenInAir).toBe(false)
  })

  it('a plane seen in the air is no estimate', () => {
    const flightCase = caseNamed('ahead, in the air')
    const moment = caseMoment(flightCase, '13T12:41:50')
    const plane = mapFlightPlane(caseMapFlight(flightCase), at(moment.at), false)
    expect(plane).not.toBeNull()
    expect(plane!.unseenFor).toBeNull()
    expect(plane!.isSeenInAir).toBe(true)
  })

  it('on the ground somewhere else, counts as far as it was last seen flying', () => {
    // It was seen flying as far as 6.75° E, and came down at a field off its path.
    const flown = equatorLive(date('2026-03-20T11:09:00Z'))
    const down = date('2026-03-20T11:30:00Z')
    const fix: LiveFix = { place: { lat: 1.5, lng: 7 }, altitudeFt: null, groundSpeedKt: 0, trackDeg: null, onGround: true, registration: null, typeCode: null, seenAt: down }
    const live: LiveFlight = { legId: 'eq', callsign: 'TST1', state: 'ground', fix, landedAt: null, trail: flown.trail }
    const leg = equatorLiveLeg(live, down)

    const plane = legPlane(leg, down, false)
    expectSame(plane.place, fix.place, 'where it is')
    expectNear(plane.distance, legPath(leg).flownLength, 0.001, 'as far as it was last seen')
    expectNear(plane.distance, 6.75 * METERS_A_DEGREE, 1_000, '6.75° E')
    expect(plane.isEstimated).toBe(false)
    expect(plane.isSeenInAir).toBe(false)
  })

  it("a flight that isn't live, with a real path, is the schedule's plane, that share of the way along it", () => {
    // It flew north of the great circle as far as 8° E, went back, and has sat at the gate unseen for ten minutes.
    const flown = equatorLive(liveTime(8), { latitude: dogLeg })
    const now = date('2026-03-20T12:00:00Z')
    const fix: LiveFix = { place: { lat: 0, lng: 0 }, altitudeFt: null, groundSpeedKt: 0, trackDeg: null, onGround: true, registration: null, typeCode: null, seenAt: now - 600 * SECOND }
    const live: LiveFlight = { legId: 'eq', callsign: 'TST1', state: 'ground', fix, landedAt: null, trail: flown.trail }
    const leg = equatorLiveLeg(live, now)
    expect(mapFlightPlane(leg.flight!, now, false), 'no real plane shows').toBeNull()
    expect(legPathLength(leg)).toBeGreaterThan(legDistanceMeters(leg))

    const plane = legPlane(leg, now, false)
    expectSame(plane.place, flightDrawing(leg, now, false).plane?.place, "where the map draws the schedule's plane")
    expectNear(plane.distance, legProgress(leg, now) * legPathLength(leg), 0.001, 'that share of the way along its path')
    expect(plane.isEstimated).toBe(false)
  })
})

describe('the plane in a replay (Stage 3 spec §8)', () => {
  it('at every place of the shared records, is where the record has it', () => {
    let checked = 0
    for (const flightCase of LIVE_CASES.flights) {
      if (!flightCase.record) continue
      const flight = caseMapFlight(flightCase)
      for (const place of flightCase.record.places) {
        const what = `${flightCase.name} at ${place.at}`
        const plane = mapFlightPlane(flight, at(place.at), true)
        expect(plane, what).not.toBeNull()
        expectNear(plane!.distance / METERS_PER_NM, place.alongNm, 0.01, what)
        expectSame(plane!.place, { lat: place.point[0], lng: place.point[1] }, what, 0.0001)
        expect(plane!.isSeenInAir, `its height and speed are for now only: ${what}`).toBe(false)
        checked += 1
      }
    }
    expect(checked, "the cases' places").toBeGreaterThan(20)
  })

  it('past where it was last seen, is an estimate, and says for how long', () => {
    const flight = caseMapFlight(caseNamed('ahead, in the air'))
    const knots = flight.path.knots
    expect(knots.length).toBeGreaterThan(0)
    const lastSeen = knots[knots.length - 1].time

    const before = mapFlightPlane(flight, lastSeen - 300 * SECOND, true)
    expect(before).not.toBeNull()
    expect(before!.unseenFor, 'where it was seen, the replay shows it as it was').toBeNull()

    const after = mapFlightPlane(flight, lastSeen + 1200 * SECOND, true)
    expect(after).not.toBeNull()
    expectNear(after!.unseenFor!, 1200 * SECOND, 1, 'unseen for')
    expect(after!.distance).toBeGreaterThan(flight.path.flownLength)
  })

  it('a flight that landed is never an estimate', () => {
    const flight = caseMapFlight(caseNamed('landed, seen all the way'))
    expect(flight.record).not.toBeNull()
    const plane = mapFlightPlane(flight, flight.record!.touchdown + 3600 * SECOND, true)
    expect(plane).not.toBeNull()
    expect(plane!.unseenFor).toBeNull()
    expectNear(plane!.distance, flight.path.length, 0.001, 'at the arrival airport')
  })

  it("with no record, is the schedule's plane", () => {
    const flightCase = caseNamed('no live data')
    expect(mapFlightPlane(caseMapFlight(flightCase), at(flightCase.departure) + 3600 * SECOND, true)).toBeNull()

    const leg = caseMapLeg(flightCase, flightCase.moments[0])
    const t = at(flightCase.departure) + 3600 * SECOND
    const plane = legPlane(leg, t, true)
    expectNear(plane.distance, legProgress(leg, t) * legDistanceMeters(leg), 0.001, 'that share of the way')
    expectSame(plane.place, positionAtTime(leg, t), "the schedule's plane")
  })
})

describe('the plane of a leg made by hand', () => {
  it("is the schedule's plane", () => {
    const leg = equatorFlight(0, 20)
    const t = date('2026-03-20T11:45:00Z')
    const plane = legPlane(leg, t, false)
    expectNear(plane.distance, legDistanceMeters(leg) / 2, 0.001, 'halfway through its time in the air')
    expectSame(plane.place, { lat: 0, lng: 10 }, '10° E', 1e-6)
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/facts/legCourse.test.ts tests/facts/planePosition.test.ts
```

Expected: both files fail to load: they can't find `src/facts/planePosition` and `src/facts/legCourse`.

- [x] **Step 3: Write the code.**

**Create `src/facts/legCourse.ts`:**

```ts
import { makeFlightPath, type FlightPath, type StretchKind } from '../map/flightPath'
import { airborneWindow } from '../map/flightProgress'
import { recordPositionAt, recordTimeAt } from '../map/flightRecord'
import type { GeoPoint } from '../map/greatCircle'
import { legDistanceMeters, positionAtTime, timeAtFraction, type MapLeg } from '../map/tripMap'

/**
 * A leg as the facts follow it (Stage 3 spec §8), as the app's MapLeg+Course: along its real path at the times of its
 * record, once the plane has been seen in the air, and otherwise along the great circle on the schedule. The facts ask
 * these, so they needn't know which kind of flight it is. The map's own `legProgress`, `positionAt` and
 * `timeAtFraction` stay the schedule's: the schedule's plane and the replay's clock read them. Distances are meters
 * along the path, and times epoch ms.
 */

// The path

/** The path the facts follow: the flight's own, real once the plane has been seen in the air, else the great circle between the airports. */
export const legPath = (leg: MapLeg): FlightPath => leg.flight?.path ?? makeFlightPath(leg.origin.place, leg.destination.place)

/** The path's whole length, flown and ahead. Without a real path, the great-circle distance. */
export const legPathLength = (leg: MapLeg): number => leg.flight?.path.length ?? legDistanceMeters(leg)

/** Whether Crewlu Cloud has seen this flight: it knows a place it was last seen, or the path it flew. */
export const hasLiveData = (leg: MapLeg): boolean => leg.flight != null && (leg.flight.live?.fix != null || leg.flight.path.isReal)

/** The kind of `path` `distance` meters along it: the stretch `pointAtDistance` reads there. */
export function kindAtDistance(path: FlightPath, distance: number): StretchKind {
  const far = Math.min(Math.max(distance, 0), path.length)
  return path.stretches.find((s) => far <= s.startDistance + s.length)?.kind ?? 'planned'
}

// Its times

/**
 * When the plane was, or is expected to be, `distance` meters along its path: by its record, and without one by the
 * schedule. Null for a flight with no time in the air.
 */
export function legTimeAtDistance(leg: MapLeg, distance: number): number | null {
  const record = leg.flight?.record
  if (record) return recordTimeAt(record, distance)
  const length = legPathLength(leg)
  return timeAtFraction(leg, length > 0 ? distance / length : 0)
}

/** When the plane is halfway along its path, flown and ahead: by its record, else the middle of the schedule's time in the air. */
export function legHalfwayTime(leg: MapLeg): number | null {
  const record = leg.flight?.record
  if (record) return recordTimeAt(record, record.path.length / 2)
  return timeAtFraction(leg, 0.5)
}

/**
 * Whether the plane was seen `distance` meters along its path. Where nobody saw it, on a stretch with no coverage or past
 * the last place it was seen, what happens there is a best guess, and its time reads "about" (best guesses design §1). A
 * flight with no real path flies the schedule, which is told as it is.
 */
export function isSeenAt(leg: MapLeg, distance: number): boolean {
  const path = leg.flight?.path
  if (!path?.isReal) return true
  return kindAtDistance(path, distance) === 'seen'
}

// The sky's questions

/**
 * When the plane is in the air. With a record, from leaving the departure airport to its touchdown, real or estimated.
 * Otherwise the schedule's time in the air. Null for a flight that arrives no later than it leaves.
 */
export function legAirborne(leg: MapLeg): { start: number; end: number } | null {
  const record = leg.flight?.record
  if (!record) return airborneWindow(leg.start, leg.end)
  const takeoff = recordTimeAt(record, 0)
  return record.touchdown > takeoff ? { start: takeoff, end: record.touchdown } : null
}

/**
 * Where the plane was, or is expected to be, at `t`: by its record, else by the schedule. Unlike `legPlane` it keeps
 * moving between the places the real plane is seen, which the sun's times and the plane's speed across the sky need.
 */
export function coursePositionAt(leg: MapLeg, t: number): GeoPoint {
  const record = leg.flight?.record
  return record ? recordPositionAt(record, t) : positionAtTime(leg, t)
}
```

**Create `src/facts/planePosition.ts`:**

```ts
import { pointAtDistance } from '../map/flightPath'
import { recordDistanceAt } from '../map/flightRecord'
import type { GeoPoint } from '../map/greatCircle'
import { mapFlightProgress, type MapFlight } from '../map/mapFlight'
import { legProgress, positionAt, type MapLeg } from '../map/tripMap'
import { legPathLength } from './legCourse'

/**
 * Where the facts have a flight's plane at a moment (Stage 3 spec §8), as the app's PlanePosition: the real plane
 * wherever the map draws one, placed by the map's own rule (`flightDrawing`'s sighting) so the two agree, and
 * otherwise the schedule's. A test holds the two together at every moment of the shared cases.
 */

export interface PlanePosition {
  /** How far along the leg's path, in meters. */
  distance: number
  place: GeoPoint
  /** Set while the real plane is an estimate: how long ago it was last seen, in ms. It's where the plan has it by now. */
  unseenFor: number | null
  /** Whether `unseenFor` is set: the real plane is an estimate, faded on the map and "about" in the words. */
  isEstimated: boolean
  /**
   * The real plane, seen in the air just now. Never in a replay: what only the newest fix tells, its height and its
   * speed, is for now only.
   */
  isSeenInAir: boolean
}

const position = (distance: number, place: GeoPoint, unseenFor: number | null, isSeenInAir: boolean): PlanePosition =>
  ({ distance, place, unseenFor, isEstimated: unseenFor != null, isSeenInAir })

/**
 * The real plane at `t`, or null where the schedule's plane shows instead: the flight isn't live now, or has no record
 * to replay. `t` is now by this browser's clock, or a moment of the replay when `isReplay`, when the plane is where its
 * record has it.
 */
export function mapFlightPlane(flight: MapFlight, t: number, isReplay: boolean): PlanePosition | null {
  const path = flight.path
  if (isReplay) {
    const lastSeen = path.knots[path.knots.length - 1]
    if (!flight.record || !lastSeen) return null
    const distance = recordDistanceAt(flight.record, t)
    // Past the last place it was seen, the record flies the plan: an estimate.
    const isEstimated = !path.hasLanded && distance > path.flownLength
    return position(distance, pointAtDistance(path, distance), isEstimated ? Math.max(0, t - lastSeen.time) : null, false)
  }
  const progress = mapFlightProgress(flight, t)
  if (!progress.plane) return null
  // Crewlu Cloud's clock ages the fix, as it decides the phase.
  const fix = flight.live?.fix
  const unseenFor = progress.phase === 'estimated' && fix ? Math.max(0, t + flight.clockOffset - fix.seenAt) : null
  // A plane on the ground somewhere else isn't on the path: it counts as far as it was last seen flying.
  return position(progress.planeDistance ?? path.flownLength, progress.plane, unseenFor, progress.phase === 'inAir')
}

/**
 * Where the plane is at `t`: the real one where the map draws it, and otherwise the schedule's, where the map draws
 * that. The schedule's plane counts as far along the leg's path as the schedule has it along the great circle, which
 * without a real path is the same thing.
 */
export function legPlane(leg: MapLeg, t: number, isReplay: boolean): PlanePosition {
  const real = leg.flight ? mapFlightPlane(leg.flight, t, isReplay) : null
  if (real) return real
  const fraction = legProgress(leg, t)
  return position(fraction * legPathLength(leg), positionAt(leg, fraction), null, false)
}
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 27 tests pass. Then `npx tsc --noEmit`: nothing; and `npm test`: 166 test files and 3,450 tests pass.

- [x] **Step 5: Commit, on Todd's yes (after batch A's checkpoint).**

```bash
git add src/facts/legCourse.ts src/facts/planePosition.ts tests/facts/legCourse.test.ts tests/facts/liveFacts.ts tests/facts/planePosition.test.ts
git commit -m "Where the facts have the plane, the real one wherever the map draws it, and a leg's path and times as the facts follow them (Stage 3 spec §8, best guesses design §3)"
```

---

### Task 3: The story along the path, with best guesses

A flight's story is made along its path and read by distance along it, so a real path's places stay where they are as it grows. Every crossing, halfway and closest point to home is told on a real path too: one the plane wasn't seen at is a best guess (`isEstimate`), timed where the plan has the plane. The app's `LegStory` and `Milestone` at `6d3e74e`. Until the store (Task 7), a live flight keeps the route's story, read by distance.

**Files:**
- Modify: `src/facts/legStory.ts`, `src/facts/milestone.ts`, `src/facts/tripFacts.ts`
- Test: `tests/facts/factsTestData.ts`, `tests/facts/legStory.test.ts`, `tests/facts/liveStory.test.ts`, `tests/facts/tripFacts.test.ts`

- [x] **Step 1: Write the tests.**

**In `tests/facts/factsTestData.ts`, replace:**

```ts

/** A rectangle a degree either side of the equator, from `west`° to `east`°. */
export function box(name: string, kind: AreaKind, west: number, east: number, country: string | null = null): Area {
  return { name, kind, country, box: [west, -1, east, 1], rings: [[west, -1, east, -1, east, 1, west, 1]] }
}
```

**with:**

```ts

/** A rectangle from `west`° to `east`°, and from `south`° to `north`°: unless they're given, a degree either side of the equator. */
export function box(name: string, kind: AreaKind, west: number, east: number, country: string | null = null, south = -1, north = 1): Area {
  return { name, kind, country, box: [west, south, east, north], rings: [[west, south, east, south, east, north, west, north]] }
}
```

**In `tests/facts/legStory.test.ts`, replace (1 of 2):**

```ts
import { makeGeography, type Geography } from '../../src/facts/geography'
import { legStory, placeAtFraction, routeStory } from '../../src/facts/legStory'
import type { GeoPoint } from '../../src/map/greatCircle'
import { box, EQUATOR, equatorFlight, mark } from './factsTestData'
```

**with:**

```ts
import { makeGeography, type Geography } from '../../src/facts/geography'
import { legStory, placeAtDistance, placeAtFraction, routeStory } from '../../src/facts/legStory'
import { distanceMeters, type GeoPoint } from '../../src/map/greatCircle'
import { box, EQUATOR, equatorFlight, mark } from './factsTestData'
```

**In `tests/facts/legStory.test.ts`, replace (2 of 2):**

```ts

  it('finds where the route passes closest to home', () => {
```

**with:**

```ts

  it('reads the place at a distance, by meters (Stage 3 spec §8)', () => {
    const equator = story()
    expect(equator.length).toBe(distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 20 }))
    expect(placeAtDistance(equator, 0.1 * equator.length)?.name).toBe('Alpha')
    expect(placeAtDistance(equator, 0.46 * equator.length)?.name).toBe('Bravo')
    expect(placeAtDistance(equator, 0.9 * equator.length)?.name).toBe('the Test Sea')
    // Past the arrival airport.
    expect(placeAtDistance(equator, 2 * equator.length)?.name).toBe('the Test Sea')
  })

  it('reads a story with no length at its start', () => {
    // Not in the app's tests: it's read there, not divided by nothing. One made along a route that goes nowhere has no
    // places (the hold rule drops them all), so this one is made by hand.
    const alpha = { name: 'Alpha', kind: 'country' as const, country: 'Alpha' }
    expect(routeStory({ lat: 0, lng: 3 }, { lat: 0, lng: 3 }, EQUATOR, null)).toEqual({ stretches: [], closestToHome: null, length: 0 })
    expect(placeAtDistance({ stretches: [{ place: alpha, start: 0 }], closestToHome: null, length: 0 }, 0)).toEqual(alpha)
  })

  it('finds where the route passes closest to home', () => {
```

**Create `tests/facts/liveStory.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { makeGeography } from '../../src/facts/geography'
import { legHalfwayTime, legPath, legPathLength, legTimeAtDistance } from '../../src/facts/legCourse'
import { legStory, placeAtDistance, storyAlong } from '../../src/facts/legStory'
import { milestones, type Milestone, type MilestoneKind } from '../../src/facts/milestone'
import { pointAtDistance } from '../../src/map/flightPath'
import type { AirportMark, MapLeg } from '../../src/map/tripMap'
import { box, EQUATOR, equatorFlight } from './factsTestData'
import { date, dogLeg, equatorLive, equatorLiveLeg, HOME_BY_THE_EQUATOR, liveTime, METERS_A_DEGREE } from './liveFacts'

/**
 * A flight's story and milestones along its real path (Stage 3 spec §8, §16.3; best guesses design §3), as the app's
 * LiveStoryTests: the places under the path it really flew, the real plane's times, and what nobody saw told as a best
 * guess. The made-up real plane is liveFacts': a degree of longitude every 8 minutes from 10:15 UTC.
 */

/** That time on the day of the equator flight, the March equinox. */
const at = (time: string) => date(`2026-03-20T${time}:00Z`)

const home = HOME_BY_THE_EQUATOR

/** The real plane last seen at `seenUntil`, as the leg is handed on then. */
const leg = (seenUntil: string, unseen?: [number, number]): MapLeg => equatorLiveLeg(equatorLive(at(seenUntil), { unseen }), at(seenUntil))

/** The real plane on the path that goes north to 2° N and back, last seen at `seenUntil`. */
const dogLegLeg = (seenUntil: number): MapLeg => equatorLiveLeg(equatorLive(seenUntil, { latitude: dogLeg }), seenUntil)

/** The equator, with Charlie north of Bravo, where the great circle never goes. */
const withCharlie = makeGeography([...EQUATOR.areas, box('Charlie', 'country', 5.5, 10.5, null, 1, 3)], [])

const found = (leg: MapLeg, homeMark: AirportMark | null = null) => milestones(leg, legStory(leg, EQUATOR, homeMark))

/** A milestone's kind, without its time or whether it's a best guess. */
const kindOf = ({ time: _time, isEstimate: _isEstimate, ...kind }: Milestone): MilestoneKind => kind

/** Whether each is a best guess. */
const estimates = (list: Milestone[]) => list.map((m) => m.isEstimate === true)

/** That kind, within 5 seconds of `iso`, as the app's tests allow. */
function expectMilestone(milestone: Milestone | undefined, kind: MilestoneKind, iso: string) {
  expect(milestone && kindOf(milestone)).toEqual(kind)
  expect(Math.abs((milestone?.time ?? NaN) - date(iso))).toBeLessThanOrEqual(5_000)
}

const ALL_FOUR: MilestoneKind[] = [
  { kind: 'crossedInto', name: 'Bravo' },
  { kind: 'halfway' },
  { kind: 'outOver', name: 'the Test Sea' },
  { kind: 'closestToHome', miles: 35 },
]

describe('a flight’s story along its real path (Stage 3 spec §8)', () => {
  it('follows the real path, not the great circle', () => {
    const real = dogLegLeg(liveTime(13))
    const story = legStory(real, withCharlie, null)
    expect(story.stretches.map((s) => s.place.name)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Bravo', 'the Test Sea'])
    expect(story.length).toBe(legPathLength(real))

    // The great circle stays on the equator.
    const scheduled = legStory(equatorFlight(0, 20), withCharlie, null)
    expect(scheduled.stretches.map((s) => s.place.name)).toEqual(['Alpha', 'Bravo', 'the Test Sea'])
  })

  it('reads the path by its meters', () => {
    const story = legStory(leg('11:10'), EQUATOR, null)
    expect(placeAtDistance(story, 3 * METERS_A_DEGREE)?.name).toBe('Alpha')
    expect(placeAtDistance(story, 7 * METERS_A_DEGREE)?.name).toBe('Bravo')
    expect(placeAtDistance(story, 15 * METERS_A_DEGREE)?.name).toBe('the Test Sea')
  })

  it('made for a shorter path, is still right where the plane has flown', () => {
    // The story was made when the path was shorter. A place this far along it is still this far along it.
    const earlier = dogLegLeg(liveTime(8))
    const later = dogLegLeg(liveTime(13))
    expect(legPathLength(earlier)).not.toBe(legPathLength(later))

    const old = legStory(earlier, withCharlie, null)
    const now = legStory(later, withCharlie, null)
    for (let degrees = 0.5; degrees <= 7.5; degrees += 0.5) {
      const far = legPath(later).knots[degrees * 4 - 1].distance
      expect(placeAtDistance(old, far), `${degrees}° E`).toEqual(placeAtDistance(now, far))
    }
  })

  it('measures the closest point to home along the real path', () => {
    // Home is 2.4° N of 8° E: 166 mi from the great circle, and 28 mi from the path that goes north to 2° N.
    const homeUpNorth = { lat: 2.4, lng: 8 }
    const real = dogLegLeg(liveTime(13))

    const closest = storyAlong(legPath(real), null, homeUpNorth).closestToHome
    expect(closest).not.toBeNull()
    expect(Math.abs(closest!.meters - 0.4 * METERS_A_DEGREE)).toBeLessThanOrEqual(500)
    expect(Math.abs(pointAtDistance(legPath(real), closest!.fraction * legPathLength(real)).lng - 8)).toBeLessThanOrEqual(0.05)
    // Too far from the great circle.
    expect(storyAlong(legPath(equatorFlight(0, 20)), null, homeUpNorth).closestToHome).toBeNull()
  })
})

describe('a flight’s milestones along its real path (Stage 3 spec §8, best guesses design §3)', () => {
  it('have the real plane’s times', () => {
    // The real plane is faster than the plan: it crosses into Bravo at 10:55, where the schedule has 11:00.
    const list = found(leg('12:30'), home)
    expect(list.map(kindOf)).toEqual(ALL_FOUR)
    expectMilestone(list[0], ALL_FOUR[0], '2026-03-20T10:55:00Z')
    expectMilestone(list[1], ALL_FOUR[1], '2026-03-20T11:35:00Z')
    // 5 mi offshore, by the coast snap.
    expectMilestone(list[2], ALL_FOUR[2], '2026-03-20T11:51:35Z')
    expectMilestone(list[3], ALL_FOUR[3], '2026-03-20T12:07:00Z')
    // It was seen all the way.
    expect(estimates(list)).toEqual([false, false, false, false])
  })

  it('tell a crossing nobody saw as a best guess', () => {
    // Nobody saw it from 4° E (10:47) to 6.5° E (11:07), where it crossed into Bravo. On the straight join between the
    // two it's at 5° E at 10:55.
    const list = found(leg('12:30', [4, 6.5]), home)
    expect(list.map(kindOf)).toEqual(ALL_FOUR)
    expect(estimates(list)).toEqual([true, false, false, false])
    expectMilestone(list[0], ALL_FOUR[0], '2026-03-20T10:55:00Z')
  })

  it('tell the closest point to home where nobody saw it as a best guess', () => {
    // Nobody saw it from 13° E to 15° E, where it passed home.
    const list = found(leg('12:30', [13, 15]), home)
    expect(list.map(kindOf)).toEqual(ALL_FOUR)
    expect(estimates(list)).toEqual([false, false, false, true])
  })

  it('of a leg that goes nowhere, are halfway in the middle of its time in the air', () => {
    // It has no length, so halfway is timed as it always was: half its time in the air, 10:15 to 13:15.
    const list = found(equatorFlight(0, 0))
    expect(list.map(kindOf)).toEqual([{ kind: 'halfway' }])
    expectMilestone(list[0], { kind: 'halfway' }, '2026-03-20T11:45:00Z')
  })

  it('ahead of where the plane was last seen, are best guesses', () => {
    // Last seen at 3.75° E at 10:45. Everything is still ahead, where the plan has the plane flying on.
    const list = found(leg('10:45'), home)
    expect(list.map(kindOf)).toEqual(ALL_FOUR)
    expect(estimates(list)).toEqual([true, true, true, true])
    expect(list.every((m) => m.time > at('10:45'))).toBe(true)
    // At its own 450 kt it's at 5° E ten minutes after it was last seen.
    expectMilestone(list[0], ALL_FOUR[0], '2026-03-20T10:55:00Z')
  })

  it('have halfway at half the path’s whole length', () => {
    // The path north to 2° N and back is about 22.5° long. Its half, 11.24° along it, is on the way back down, at about
    // 9.45° E: before 10° E, the great circle's halfway, which the real plane passes at 11:35.
    const real = dogLegLeg(liveTime(13))
    const halfway = milestones(real, legStory(real, EQUATOR, null)).find((m) => m.kind === 'halfway')
    expect(halfway).toBeDefined()
    const place = pointAtDistance(legPath(real), legPathLength(real) / 2)
    expect(Math.abs(place.lng - 9.45)).toBeLessThanOrEqual(0.05)
    expect(Math.abs(halfway!.time - liveTime(place.lng))).toBeLessThanOrEqual(5_000)
    expect(halfway!.time).toBeLessThan(at('11:32'))
  })

  it('read with a story made along another path, are where that story has them, by distance', () => {
    // Not in the app's tests. The route's story stands in until a real path's is ready, and it's read by distance: near
    // the departure airport the two agree. The real plane, on the path north to 2° N, was last seen at 9° E.
    const real = dogLegLeg(liveTime(9))
    const routes = legStory(equatorFlight(0, 20), EQUATOR, home)
    expect(routes.length).toBeLessThan(legPathLength(real))
    const list = milestones(real, routes)
    expect(list.map(kindOf)).toEqual(ALL_FOUR)
    // 5° along both, before the path turns north.
    expectMilestone(list[0], ALL_FOUR[0], '2026-03-20T10:55:00Z')
    // Halfway is half the real path's whole length, past where the plane was last seen: a best guess.
    expect(list[1].time).toBe(legHalfwayTime(real))
    expect(estimates(list)).toEqual([false, true, true, true])
    // Home is as far along the real path as the route's story has it along the great circle.
    expect(list[3].time).toBe(legTimeAtDistance(real, routes.closestToHome!.fraction * routes.length))
  })

  it('with no live data, are the schedule’s, as before', () => {
    const scheduled = equatorFlight(0, 20)
    const withNoAnswer = equatorLiveLeg(null, at('11:10'))
    const before = found(scheduled, home)
    const after = found(withNoAnswer, home)
    expect(after.map(kindOf)).toEqual(before.map(kindOf))
    before.forEach((earlier, i) => expect(Math.abs(earlier.time - after[i].time)).toBeLessThanOrEqual(1))
    expect(before.map(kindOf)).toEqual(ALL_FOUR)
    // The schedule is told as it is.
    expect(estimates(after)).toEqual([false, false, false, false])
    expectMilestone(before[0], ALL_FOUR[0], '2026-03-20T11:00:00Z')
  })
})
```

**In `tests/facts/tripFacts.test.ts`, replace (1 of 3):**

```ts
import type { LandingForecast } from '../../src/data/weather'
import type { Geography } from '../../src/facts/geography'
import {
```

**with:**

```ts
import type { LandingForecast } from '../../src/data/weather'
import { makeGeography, type Geography } from '../../src/facts/geography'
import {
```

**In `tests/facts/tripFacts.test.ts`, replace (2 of 3):**

```ts
import { AIRPORTS, at, EUROPE, HOUR } from '../map/tripMapLegs'
import { EQUATOR, equatorFlight, flightMap, mark } from './factsTestData'

```

**with:**

```ts
import { AIRPORTS, at, EUROPE, HOUR } from '../map/tripMapLegs'
import { box, EQUATOR, equatorFlight, flightMap, mark } from './factsTestData'
import { dogLeg, equatorLive, equatorLiveLeg, liveTime } from './liveFacts'

```

**In `tests/facts/tripFacts.test.ts`, replace (3 of 3):**

```ts
    expect(equatorFacts().stories.eq).toBe(equatorFacts().stories.eq)
  })
```

**with:**

```ts
    expect(equatorFacts().stories.eq).toBe(equatorFacts().stories.eq)
  })

  it('keeps the route’s story, along the great circle, for a flight with a real path', () => {
    // A story is kept by route, which another flight on that route shares: a real path's story, made again as the path
    // grows, is the store's (a later task of plan 3C-3). Charlie is north of Bravo, where only the real path goes.
    const seenUntil = liveTime(13)
    const real = equatorLiveLeg(equatorLive(seenUntil, { latitude: dogLeg }), seenUntil)
    const geography = makeGeography([...EQUATOR.areas, box('Charlie', 'country', 5.5, 10.5, null, 1, 3)], [])
    const facts = makeTripFacts(flightMap(real, null), { geography, comparisons: null, viewerTz: NY, h24: false })
    expect(facts.stories.eq.stretches.map((s) => s.place.name)).toEqual(['Alpha', 'Bravo', 'the Test Sea'])
  })
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/facts/legStory.test.ts tests/facts/liveStory.test.ts tests/facts/tripFacts.test.ts
```

Expected: 12 of the 36 tests fail: `storyAlong` and `placeAtDistance` aren't there yet, and no milestone is a best guess.

- [x] **Step 3: Write the code.**

**In `src/facts/legStory.ts`, replace (1 of 6):**

```ts
import { distanceMeters, METERS_PER_MILE, pointAlong, type GeoPoint } from '../map/greatCircle'
import type { AirportMark, MapLeg } from '../map/tripMap'
import { placeAt, samePlace, type Geography, type Place } from './geography'

/**
 * A flight's story, worked out once (Stage 2 spec §4.2), as the app's LegStory: the places under its route and its
 * closest point to home, as fractions of the way along, 0 at the departure airport and 1 at the arrival. The schedule
 * turns a fraction into a time (`timeAtFraction`), so a new delay moves every time without redoing the geography.
 */

```

**with:**

```ts
import { makeFlightPath, pointAtDistance, type FlightPath } from '../map/flightPath'
import { distanceMeters, METERS_PER_MILE, type GeoPoint } from '../map/greatCircle'
import type { AirportMark, MapLeg } from '../map/tripMap'
import { placeAt, samePlace, type Geography, type Place } from './geography'
import { legPath } from './legCourse'

/**
 * A flight's story (Stage 2 spec §4.2, Stage 3 spec §8), as the app's LegStory: the places under its path and its
 * closest point to home, as fractions of the way along, 0 at the departure airport and 1 at the arrival. The path is the
 * great circle until the plane has been seen in the air, and its real path from then on, when the story is made again
 * as the path grows. The leg turns a distance along its path into a time (`legTimeAtDistance`), so a new delay moves
 * every time without redoing the geography.
 */

```

**In `src/facts/legStory.ts`, replace (2 of 6):**

```ts
  stretches: Stretch[]
  closestToHome: ClosestToHome | null
}

```

**with:**

```ts
  stretches: Stretch[]
  closestToHome: ClosestToHome | null
  /**
   * The length of the path the story was made along, in meters: a fraction of the way is that share of it. A real path
   * grows at its far end, and a place this far along it stays this far along it, so the story is read by distance.
   */
  length: number
}

```

**In `src/facts/legStory.ts`, replace (3 of 6):**

```ts
export const HOME_RADIUS_M = 100 * METERS_PER_MILE

interface Route {
  origin: GeoPoint
  destination: GeoPoint
  length: number
  sampleCount: number
```

**with:**

```ts
export const HOME_RADIUS_M = 100 * METERS_PER_MILE

/** A path as the story samples it, by the fraction of the way along. */
interface Route {
  path: FlightPath
  length: number
  sampleCount: number
```

**In `src/facts/legStory.ts`, replace (4 of 6):**

```ts
}

function route(origin: GeoPoint, destination: GeoPoint): Route {
  const length = distanceMeters(origin, destination)
  const sampleCount = Math.max(MINIMUM_SAMPLES, Math.ceil(length / SAMPLE_SPACING_M) + 1)
  return { origin, destination, length, sampleCount, step: 1 / (sampleCount - 1) }
}

const pointOn = (r: Route, fraction: number) => pointAlong(r.origin, r.destination, fraction)

interface Run {
```

**with:**

```ts
}

function route(path: FlightPath): Route {
  const length = path.length
  const sampleCount = Math.max(MINIMUM_SAMPLES, Math.ceil(length / SAMPLE_SPACING_M) + 1)
  return { path, length, sampleCount, step: 1 / (sampleCount - 1) }
}

const pointOn = (r: Route, fraction: number) => pointAtDistance(r.path, fraction * r.length)

interface Run {
```

**In `src/facts/legStory.ts`, replace (5 of 6):**

```ts
}

/** The story of the great circle from `origin` to `destination`. `home` is null for a flight that starts or ends there. */
export function routeStory(origin: GeoPoint, destination: GeoPoint, geography: Geography | null, home: GeoPoint | null): LegStory {
  const r = route(origin, destination)
  return { stretches: geography ? stretchesAlong(r, geography) : [], closestToHome: home ? closestPoint(r, home) : null }
}

/** A flight's story. Home counts only when the flight doesn't start or end there. */
export function legStory(leg: MapLeg, geography: Geography | null, home: AirportMark | null): LegStory {
  const isHomeLeg = home == null || home.code === leg.origin.code || home.code === leg.destination.code
  return routeStory(leg.origin.place, leg.destination.place, geography, isHomeLeg ? null : home.place)
}

```

**with:**

```ts
}

/** The story along `path`. `home` is null for a flight that starts or ends there. */
export function storyAlong(path: FlightPath, geography: Geography | null, home: GeoPoint | null): LegStory {
  const r = route(path)
  return { stretches: geography ? stretchesAlong(r, geography) : [], closestToHome: home ? closestPoint(r, home) : null, length: path.length }
}

/** The story along the great circle from `origin` to `destination`. `home` is null for a flight that starts or ends there. */
export function routeStory(origin: GeoPoint, destination: GeoPoint, geography: Geography | null, home: GeoPoint | null): LegStory {
  return storyAlong(makeFlightPath(origin, destination), geography, home)
}

/** A flight's story, along its path (`legPath`). Home counts only when the flight doesn't start or end there. */
export function legStory(leg: MapLeg, geography: Geography | null, home: AirportMark | null): LegStory {
  const isHomeLeg = home == null || home.code === leg.origin.code || home.code === leg.destination.code
  return storyAlong(legPath(leg), geography, isHomeLeg ? null : home.place)
}

```

**In `src/facts/legStory.ts`, replace (6 of 6):**

```ts
  return found
}
```

**with:**

```ts
  return found
}

/** The place `distance` meters along the path, or null where no place is known. */
export const placeAtDistance = (story: LegStory, distance: number): Place | null =>
  placeAtFraction(story, story.length > 0 ? distance / story.length : 0)
```

**In `src/facts/milestone.ts`, replace (1 of 4):**

```ts
import { METERS_PER_MILE } from '../map/greatCircle'
import { timeAtFraction, type MapLeg } from '../map/tripMap'
import { MINUTE } from '../time/zoned'
import type { Place } from './geography'
import type { LegStory } from './legStory'
```

**with:**

```ts
import { METERS_PER_MILE } from '../map/greatCircle'
import type { MapLeg } from '../map/tripMap'
import { MINUTE } from '../time/zoned'
import type { Place } from './geography'
import { isSeenAt, legHalfwayTime, legPathLength, legTimeAtDistance } from './legCourse'
import type { LegStory } from './legStory'
```

**In `src/facts/milestone.ts`, replace (2 of 4):**

```ts

export type Milestone = MilestoneKind & { time: number }

```

**with:**

```ts

export type Milestone = MilestoneKind & {
  time: number
  /**
   * Nobody saw the plane where this happened, so it's a best guess from where the plan has the plane, and its time reads
   * "about" (best guesses design §2, §3). Set, and true, only then: a milestone the plane was seen at, or one of a
   * flight on the schedule, leaves it out, as the app's is false unless it's said.
   */
  isEstimate?: boolean
}

```

**In `src/facts/milestone.ts`, replace (3 of 4):**

```ts

/** A flight's milestones in time order, from its story and its delay-moved times. */
export function milestones(leg: MapLeg, story: LegStory): Milestone[] {
  const found: { what: MilestoneKind; fraction: number }[] = []
  // The state or province the plane is in, kept across a stretch where only the country is known.
```

**with:**

```ts

/**
 * A flight's milestones in time order, from its story and the leg's own times: the real plane's along a real path, else
 * the schedule's (Stage 3 spec §8). Where nobody saw the real plane, on a stretch with no coverage or past the last place
 * it was seen, a milestone is a best guess from where the plan has the plane, and says so (`isEstimate`, best guesses
 * design §3). Halfway is half the path's whole length, flown and ahead.
 */
export function milestones(leg: MapLeg, story: LegStory): Milestone[] {
  const found: { what: MilestoneKind; distance: number }[] = []
  // The state or province the plane is in, kept across a stretch where only the country is known.
```

**In `src/facts/milestone.ts`, replace (4 of 4):**

```ts
    const what = crossingKind(previous, next)
    if (what) found.push({ what, fraction: story.stretches[i].start })
  }
  found.push({ what: { kind: 'halfway' }, fraction: 0.5 })
  const closest = story.closestToHome
  if (closest) found.push({ what: { kind: 'closestToHome', miles: roundedMiles(closest.meters) }, fraction: closest.fraction })
  // The sort is stable, so a tie keeps the order found, as the app's does.
  return [...found]
    .sort((a, b) => a.fraction - b.fraction)
    .flatMap(({ what, fraction }) => {
      const time = timeAtFraction(leg, fraction)
      return time == null ? [] : [{ ...what, time }]
    })
```

**with:**

```ts
    const what = crossingKind(previous, next)
    if (what) found.push({ what, distance: story.stretches[i].start * story.length })
  }
  found.push({ what: { kind: 'halfway' }, distance: legPathLength(leg) / 2 })
  const closest = story.closestToHome
  if (closest) found.push({ what: { kind: 'closestToHome', miles: roundedMiles(closest.meters) }, distance: closest.fraction * story.length })
  // The sort is stable, so a tie keeps the order found, as the app's does.
  return [...found]
    .sort((a, b) => a.distance - b.distance)
    .flatMap(({ what, distance }) => {
      // Halfway keeps its own time: a leg that goes nowhere is halfway in the middle of its time in the air.
      const time = what.kind === 'halfway' ? legHalfwayTime(leg) : legTimeAtDistance(leg, distance)
      if (time == null) return []
      return [isSeenAt(leg, distance) ? { ...what, time } : { ...what, time, isEstimate: true }]
    })
```

**In `src/facts/tripFacts.ts`, replace (1 of 2):**

```ts

function storyOf(leg: MapLeg, geography: Geography, home: AirportMark | null): LegStory {
```

**with:**

```ts

/**
 * The route's story: along the great circle, whatever path the plane flew, since another flight on the route shares it.
 * A real path's story, made again as the path grows, is the store's (Stage 3 spec §8; a later task of plan 3C-3).
 */
function storyOf(leg: MapLeg, geography: Geography, home: AirportMark | null): LegStory {
```

**In `src/facts/tripFacts.ts`, replace (2 of 2):**

```ts
  let story = kept.get(key)
  if (!story) kept.set(key, (story = legStory(leg, geography, home)))
  return story
```

**with:**

```ts
  let story = kept.get(key)
  if (!story) {
    const { flight: _, ...route } = leg
    kept.set(key, (story = legStory(route, geography, home)))
  }
  return story
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 36 tests pass. Then `npx tsc --noEmit`: nothing; and `npm test`: 167 test files and 3,465 tests pass.

- [x] **Step 5: Commit, on Todd's yes (after batch A's checkpoint).**

```bash
git add src/facts/legStory.ts src/facts/milestone.ts src/facts/tripFacts.ts tests/facts/factsTestData.ts tests/facts/legStory.test.ts tests/facts/liveStory.test.ts tests/facts/tripFacts.test.ts
git commit -m "The facts' story along the flight's path, read by distance, and every crossing, halfway and closest point told, one nobody saw as a best guess (Stage 3 spec §8, best guesses design §3)"
```

---

### Task 4: The sky, and the miles

The sun and the moon are read along the record, from where the real plane was and when, and the sky is seen from the last fix's height while the plane is at a cruise of 25,000 to 60,000 ft, else 35,000 ft. The miles flown and the trip's totals count along real paths. `milesFlown` and `totalMiles` move from `src/map/tripMap.ts` to `src/facts/tripTotals.ts`: they need the facts' plane, and the map's code never reads the facts'.

**Files:**
- Modify: `src/copy/factsTrip.ts`, `src/copy/tripMap.ts`, `src/facts/sky.ts`, `src/facts/tripTotals.ts`, `src/map/tripMap.ts`
- Test: `tests/facts/liveSky.test.ts`, `tests/facts/liveTripTotals.test.ts`, `tests/map/tripMap.test.ts`

- [x] **Step 1: Write the tests.**

**Create `tests/facts/liveSky.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { legAirborne } from '../../src/facts/legCourse'
import { chase, COCKPIT_HORIZON, cockpitHorizonOnLeg, GROUND_HORIZON, horizonDip, moonSight, sunAltitudeOnLeg, sunEvents } from '../../src/facts/sky'
import { recordPositionAt } from '../../src/map/flightRecord'
import type { LiveState, TrailPoint } from '../../src/map/liveFlight'
import { makeMapFlight, mapFlightProgress } from '../../src/map/mapFlight'
import { airportMark, positionAtTime, type MapLeg } from '../../src/map/tripMap'
import { sunAltitude } from '../../src/time/sun'
import { AIRPORTS, HOUR } from '../map/tripMapLegs'

/**
 * The sky from the cockpit of a real plane (Stage 3 spec §8), as the app's LiveSkyFactsTests: its sunrises and sunsets
 * along the path it really flew, at the times it was really there, seen from the height it's really at.
 */

const MINUTE = 60_000

/** Where a test flight goes, and how long it takes from gate to gate. */
interface Route {
  from?: string
  to?: string
  hours?: number
}

/** The flight from Louisville to Cologne, 8 hours from gate to gate, unless the test says. */
function flight(departing: string, { from = 'SDF', to = 'CGN', hours = 8 }: Route = {}): MapLeg {
  const start = Date.parse(departing)
  return { id: `${from}${to}`, kind: 'flight', origin: airportMark(from, AIRPORTS)!, destination: airportMark(to, AIRPORTS)!, start, end: start + hours * HOUR, flightNumber: null }
}

/** The same leg, `ms` later. */
const delayed = (leg: MapLeg, ms: number): MapLeg => ({ ...leg, start: leg.start + ms, end: leg.end + ms })

interface LiveOptions extends Route {
  altitudeFt?: number
  state?: LiveState
  departing?: string
  /** Whether its last fix says it's on the ground. */
  onGround?: boolean
}

/**
 * The flight to Cologne, scheduled out at 18:00 UTC unless the test says, with a real plane that flies as the schedule
 * has it but `late` ms behind: seen every 2 minutes for its first five hours in the air.
 */
function liveFlight(
  late: number,
  { altitudeFt = 35_000, state = 'airborne', departing = '2026-11-13T18:00:00Z', onGround = false, ...route }: LiveOptions = {},
): MapLeg {
  const scheduled = flight(departing, route)
  const asFlown = delayed(scheduled, late)
  const takeoff = legAirborne(asFlown)!.start
  const seenUntil = takeoff + 5 * HOUR
  const trail: TrailPoint[] = []
  for (let time = takeoff + 2 * MINUTE; time <= seenUntil; time += 2 * MINUTE) {
    trail.push({ time, place: positionAtTime(asFlown, time), altitudeFt })
  }
  const last = trail[trail.length - 1]
  const fix = { place: last.place, altitudeFt, groundSpeedKt: 480, trackDeg: 60, onGround, registration: 'N370UP', typeCode: 'B763', seenAt: last.time }
  const live = { legId: scheduled.id, callsign: 'UPS207', state, fix, landedAt: null, trail }
  const mapFlight = makeMapFlight(scheduled.start, scheduled.end, scheduled.origin.place, scheduled.destination.place, live)!
  const progress = mapFlightProgress(mapFlight, last.time)
  return { ...scheduled, start: progress.start, end: progress.end, flight: mapFlight }
}

describe('the height the sky is seen from (Stage 3 spec §8)', () => {
  it('is the real plane’s while it’s at its cruise', () => {
    const high = liveFlight(0, { altitudeFt: 38_000 })
    expect(Math.abs(cockpitHorizonOnLeg(high) - (GROUND_HORIZON - horizonDip(38_000)))).toBeLessThanOrEqual(1e-9)
    // Higher up, the horizon is lower.
    expect(cockpitHorizonOnLeg(high)).toBeLessThan(COCKPIT_HORIZON)
  })

  it('is 35,000 ft while it climbs or comes down', () => {
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: 8_000 }))).toBe(COCKPIT_HORIZON)
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: 24_999 }))).toBe(COCKPIT_HORIZON)
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: 25_000 }))).not.toBe(COCKPIT_HORIZON)
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: 60_000 }))).not.toBe(COCKPIT_HORIZON)
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: 60_001 }))).toBe(COCKPIT_HORIZON)
  })

  it('is 35,000 ft with no plane in the air, or a height that can’t be right', () => {
    expect(cockpitHorizonOnLeg(flight('2026-11-13T18:00:00Z')), 'no live data').toBe(COCKPIT_HORIZON)
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: 38_000, state: 'landed' })), 'it’s down').toBe(COCKPIT_HORIZON)
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: 1e12 }))).toBe(COCKPIT_HORIZON)
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: NaN }))).toBe(COCKPIT_HORIZON)
  })

  // Not in the app's tests, which have no fix on the ground: its height isn't a cruise, whatever it says.
  it('is 35,000 ft from a fix that says it’s on the ground', () => {
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: 38_000, onGround: true }))).toBe(COCKPIT_HORIZON)
  })
})

describe('sunrise and sunset along the record (Stage 3 spec §8)', () => {
  it('are where and when the real plane was', () => {
    // The real plane is 40 minutes behind the schedule. Its sunset is the one a flight scheduled 40 minutes later
    // would see, not the schedule's.
    const scheduled = sunEvents(flight('2026-11-13T18:00:00Z'))[0]
    const later = sunEvents(flight('2026-11-13T18:40:00Z'))[0]
    const events = sunEvents(liveFlight(40 * MINUTE))
    const real = events[0]

    expect(events).toHaveLength(1)
    expect(real.kind).toBe('sunset')
    expect(Math.abs(real.time - later.time)).toBeLessThanOrEqual(MINUTE)
    // The schedule's sunset is minutes off.
    expect(Math.abs(real.time - scheduled.time)).toBeGreaterThan(5 * MINUTE)
    expect(real.peopleBelowGap).not.toBeNull()
    expect(later.peopleBelowGap).not.toBeNull()
    expect(Math.abs(real.peopleBelowGap! - later.peopleBelowGap!)).toBeLessThanOrEqual(MINUTE)
  })

  it('has a plane that left late in the air from when it really left', () => {
    // The schedule has it off the ground at 18:15. It left 40 minutes after that.
    const airborne = legAirborne(liveFlight(40 * MINUTE))!
    expect(Math.abs(airborne.start - Date.parse('2026-11-13T18:55:00Z'))).toBeLessThanOrEqual(2 * MINUTE)
  })

  it('has no sunset for a plane that left after dark, though the schedule had it off before', () => {
    // The schedule has it off at 22:35 UTC, minutes after sunset in Louisville, with the sun still above the cockpit's
    // horizon at cruise: its plane sees a sunset. The real plane left 40 minutes later, in the dark.
    const scheduled = sunEvents(flight('2026-11-13T22:20:00Z'))
    expect(scheduled[0]?.kind).toBe('sunset')
    const real = sunEvents(liveFlight(40 * MINUTE, { departing: '2026-11-13T22:20:00Z' }))
    expect(real.some((e) => e.kind === 'sunset'), JSON.stringify(real)).toBe(false)
  })

  it('sets later seen from higher up, by a minute or two', () => {
    const lower = sunEvents(liveFlight(0, { altitudeFt: 30_000 }))[0]
    const higher = sunEvents(liveFlight(0, { altitudeFt: 41_000 }))[0]
    expect(higher.time).toBeGreaterThan(lower.time)
    expect(higher.time - lower.time).toBeLessThan(5 * MINUTE)
  })

  it('are the schedule’s, as before, with no live data', () => {
    const scheduled = flight('2026-11-13T18:00:00Z')
    const withNoAnswer: MapLeg = {
      ...scheduled,
      flight: makeMapFlight(scheduled.start, scheduled.end, scheduled.origin.place, scheduled.destination.place)!,
    }
    expect(sunEvents(withNoAnswer)).toEqual(sunEvents(scheduled))
  })

  it('has the sun’s altitude at the record’s place', () => {
    const leg = liveFlight(40 * MINUTE)
    const t = Date.parse('2026-11-13T21:00:00Z')
    const here = recordPositionAt(leg.flight!.record!, t)
    expect(sunAltitudeOnLeg(leg, t)).toBe(sunAltitude(t, here.lat, here.lng))
  })
})

// Not in the app's tests: chasing the sun and the moon follow the record too, and these hold them to it.
describe('chasing the sun, and the moon, along the record (Stage 3 spec §8)', () => {
  const west: Route = { from: 'CGN', to: 'SDF', hours: 9 }

  it('stretches the real plane’s morning or afternoon, from where it really is', () => {
    // Out of Cologne at 10:00 UTC on the schedule, 40 minutes late for real. At 13:30 the plane on time is west of the
    // sun's meridian, still in its morning; the real plane, further back, is past its noon.
    const t = Date.parse('2026-11-14T13:30:00Z')
    const onTime = flight('2026-11-14T10:00:00Z', west)
    expect(chase(onTime, t)).toBe('morning')
    expect(chase(delayed(onTime, 40 * MINUTE), t)).toBe('afternoon')
    expect(chase(liveFlight(40 * MINUTE, { ...west, departing: '2026-11-14T10:00:00Z' }), t)).toBe('afternoon')
  })

  it('doesn’t chase the sun until the real plane leaves the ground', () => {
    // The schedule has it in the air from 10:15. The real plane, 40 minutes late, is still on the ground seconds before
    // it leaves, and chases the sun once it's away.
    const leg = liveFlight(40 * MINUTE, { ...west, departing: '2026-11-14T10:00:00Z' })
    const takeoff = legAirborne(leg)!.start
    expect(chase(leg, takeoff - 5_000)).toBeNull()
    expect(chase(leg, takeoff + 10 * MINUTE)).toBe('morning')
  })

  it('chases the sun from when it rises at the real plane’s height', () => {
    // Flying west before dawn, at 41,000 ft the sun rises a few minutes before it would at 35,000.
    const higher = liveFlight(0, { ...west, departing: '2026-11-14T05:00:00Z', altitudeFt: 41_000 })
    const cruise = liveFlight(0, { ...west, departing: '2026-11-14T05:00:00Z' })
    const [risesHigher] = sunEvents(higher)
    const [risesAtCruise] = sunEvents(cruise)
    expect([risesHigher.kind, risesAtCruise.kind]).toEqual(['sunrise', 'sunrise'])
    const between = (risesHigher.time + risesAtCruise.time) / 2
    expect(chase(higher, between)).toBe('morning')
    expect(chase(cruise, between)).toBeNull()
  })

  it('shows no moon while the sun is still up from the real plane’s height', () => {
    const higher = liveFlight(0, { altitudeFt: 41_000 })
    const cruise = liveFlight(0)
    const between = (sunEvents(higher)[0].time + sunEvents(cruise)[0].time) / 2
    expect(moonSight(higher, between)).toBeNull()
    expect(moonSight(cruise, between)).toEqual({ phase: 'waxingCrescent', isUp: true })
  })

  it('has the moon up or down where the real plane is', () => {
    // 40 minutes behind the schedule, the real plane is far enough west that the moon hasn't set there yet.
    const t = Date.parse('2026-11-13T22:08:00Z')
    const onTime = flight('2026-11-13T18:00:00Z')
    expect(moonSight(onTime, t)?.isUp).toBe(false)
    expect(moonSight(delayed(onTime, 40 * MINUTE), t)?.isUp).toBe(true)
    expect(moonSight(liveFlight(40 * MINUTE), t)?.isUp).toBe(true)
  })
})
```

**Create `tests/facts/liveTripTotals.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { longestText, milesText } from '../../src/copy/factsTrip'
import { legPathLength } from '../../src/facts/legCourse'
import { longestFlight, milesFlown, totalMiles, totalsSoFar } from '../../src/facts/tripTotals'
import { METERS_PER_MILE } from '../../src/map/greatCircle'
import { legDistanceMeters } from '../../src/map/tripMap'
import { equatorFlight, flightMap } from './factsTestData'
import { date, dogLeg, equatorLive, equatorLiveLeg, liveTime } from './liveFacts'

/**
 * The trip's miles along real paths (Stage 3 spec §8), as the app's LiveTripTotalsTests. The made-up real plane is
 * `liveFacts.ts`': a degree of longitude every 8 minutes from 10:15 UTC. One degree along the equator is 69.09 mi, and
 * the flight is 1,382 mi.
 */

const at = (time: string) => date(`2026-03-20T${time}:00Z`)

describe('the trip’s miles along real paths (Stage 3 spec §8)', () => {
  it('count the whole trip, and find the longest flight, along the real path', () => {
    // The flight north to 2° N and back is about 171 mi longer than its great circle: longer than a flight to 20.5° E,
    // whose airports are further apart.
    const seenUntil = liveTime(13)
    const wandering = equatorLiveLeg(equatorLive(seenUntil, { latitude: dogLeg }), seenUntil)
    const straight = equatorFlight(0, 20.5, undefined, 'straight')
    expect(legDistanceMeters(wandering)).toBeLessThan(legDistanceMeters(straight))

    expect(longestFlight([straight, wandering])?.id).toBe(wandering.id)
    expect(totalMiles([wandering])).toBe(Math.round(legPathLength(wandering) / METERS_PER_MILE))
    expect(totalMiles([wandering])).toBeGreaterThan(1_382 + 150)
    expect(milesFlown([wandering], wandering.end), 'once it’s in, every mile of its path counts').toBe(totalMiles([wandering]))
    expect(longestText(wandering)).toBe(`E0 → E20, ${milesText(totalMiles([wandering]))}`)
  })

  // Not in the app's tests: of two flights along the same real path, the longest is the first, as the app's max(by:) has it.
  it('find the first of two longest flights', () => {
    const seenUntil = liveTime(13)
    const live = equatorLive(seenUntil, { latitude: dogLeg })
    expect(longestFlight([equatorLiveLeg(live, seenUntil, { id: 'first' }), equatorLiveLeg(live, seenUntil, { id: 'second' })])?.id).toBe('first')
  })

  it('flown by a flight in the air, are as far as the real plane is', () => {
    const leg = equatorLiveLeg(equatorLive(at('11:10')), at('11:10'))
    expect(milesFlown([leg], at('11:10'))).toBe(475)
    expect(milesFlown([leg], at('10:35'), true)).toBe(173)
    expect(milesFlown([leg], leg.start - 60_000)).toBe(0)
    expect(milesFlown([leg], leg.end)).toBe(1_382)
  })

  it('so far, in a replay, count as far as the record has the plane', () => {
    const leg = equatorLiveLeg(equatorLive(at('11:10')), at('11:10'))
    const map = flightMap(leg, null)
    expect(totalsSoFar(map, at('11:10'), {}).miles).toBe(475)
    expect(totalsSoFar(map, at('10:35'), {}, true).miles).toBe(173)
  })
})
```

**In `tests/map/tripMap.test.ts`, replace:**

```ts
import { scheduledFraction } from '../../src/map/flightProgress'
import {
  currentLeg, dayCount, destinationsOf, framingPoints, headingAt, legInMotion, legProgress, makeTripMap, milesFlown, nextFlight, pilotLocation,
  positionAt, positionAtTime, timeAtFraction, totalMiles,
} from '../../src/map/tripMap'
```

**with:**

```ts
import { scheduledFraction } from '../../src/map/flightProgress'
import { milesFlown, totalMiles } from '../../src/facts/tripTotals'
import {
  currentLeg, dayCount, destinationsOf, framingPoints, headingAt, legInMotion, legProgress, makeTripMap, nextFlight, pilotLocation,
  positionAt, positionAtTime, timeAtFraction,
} from '../../src/map/tripMap'
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/facts/liveSky.test.ts tests/facts/liveTripTotals.test.ts tests/map/tripMap.test.ts
```

Expected: 17 of the 37 tests fail: `cockpitHorizonOnLeg` isn't there yet, and `milesFlown` hasn't moved to the facts.

- [x] **Step 3: Write the code.**

**In `src/copy/factsTrip.ts`, replace (1 of 2):**

```ts
import type { TripTotals } from '../facts/tripTotals'
import { METERS_PER_MILE } from '../map/greatCircle'
import { legDistanceMeters, type MapLeg } from '../map/tripMap'
import { numberText } from './facts'
```

**with:**

```ts
import { legPathLength } from '../facts/legCourse'
import type { TripTotals } from '../facts/tripTotals'
import { METERS_PER_MILE } from '../map/greatCircle'
import type { MapLeg } from '../map/tripMap'
import { numberText } from './facts'
```

**In `src/copy/factsTrip.ts`, replace (2 of 2):**

```ts

const legMiles = (leg: MapLeg) => Math.round(legDistanceMeters(leg) / METERS_PER_MILE)

```

**with:**

```ts

/** A flight's whole miles, along its real path where it has one (Stage 3 spec §8). */
const legMiles = (leg: MapLeg) => Math.round(legPathLength(leg) / METERS_PER_MILE)

```

**In `src/copy/tripMap.ts`, replace:**

```ts
import {
  dayCount, destinationsOf, isArrivalEstimated, legInMotion, milesFlown, nextFlight, pilotLocation, currentLeg, totalMiles, type AirportMark,
  type MapLeg, type TripMap,
} from '../map/tripMap'
import { calendarDay, MONTHS, WEEKDAYS, zoneOffsetMinutes, zonedParts } from '../time/zoned'
```

**with:**

```ts
import {
  dayCount, destinationsOf, isArrivalEstimated, legInMotion, nextFlight, pilotLocation, currentLeg, type AirportMark, type MapLeg, type TripMap,
} from '../map/tripMap'
import { milesFlown, totalMiles } from '../facts/tripTotals'
import { calendarDay, MONTHS, WEEKDAYS, zoneOffsetMinutes, zonedParts } from '../time/zoned'
```

**In `src/facts/sky.ts`, replace (1 of 9):**

```ts
import { airborneWindow } from '../map/flightProgress'
import type { GeoPoint } from '../map/greatCircle'
import { positionAtTime, type MapLeg } from '../map/tripMap'
import { moonPhase, type MoonPhase } from '../time/moon'
```

**with:**

```ts
import type { GeoPoint } from '../map/greatCircle'
import type { MapLeg } from '../map/tripMap'
import { moonPhase, type MoonPhase } from '../time/moon'
```

**In `src/facts/sky.ts`, replace (2 of 9):**

```ts
import { DAY, HOUR, MINUTE } from '../time/zoned'
import { moonAltitude } from './moonPosition'
```

**with:**

```ts
import { DAY, HOUR, MINUTE } from '../time/zoned'
import { coursePositionAt, legAirborne } from './legCourse'
import { moonAltitude } from './moonPosition'
```

**In `src/facts/sky.ts`, replace (3 of 9):**

```ts
 * below see them, chasing the sun, and the moon. Also the next sunrise or sunset on the ground at an airport (§5.3).
 * It uses the site's own sun (src/time/sun.ts), which the location card's sunrise and sunset use too.
 */
```

**with:**

```ts
 * below see them, chasing the sun, and the moon. Also the next sunrise or sunset on the ground at an airport (§5.3).
 * It uses the site's own sun (src/time/sun.ts), which the location card's sunrise and sunset use too. A flight with a
 * record is followed along its real path at its real times, and seen from the real plane's height at its cruise
 * (Stage 3 spec §8); any other, from the schedule as before.
 */
```

**In `src/facts/sky.ts`, replace (4 of 9):**

```ts
export const GROUND_HORIZON = SUN_UP_ALTITUDE
/** The schedule's height in the air. Stage 3 uses the live altitude. */
export const CRUISE_ALTITUDE_FEET = 35_000

```

**with:**

```ts
export const GROUND_HORIZON = SUN_UP_ALTITUDE
/** The schedule's height in the air. It also stands in for a real plane that's climbing or coming down. */
export const CRUISE_ALTITUDE_FEET = 35_000
/**
 * A real plane's own height counts while it's at its cruise: from 25,000 to 60,000 ft. Lower, it's on its way up or
 * down, and the sunrises and sunsets ahead are seen from the cruise it's climbing to. Higher can't be right.
 */
export const CRUISE_ALTITUDES_FEET = { lowest: 25_000, highest: 60_000 }

```

**In `src/facts/sky.ts`, replace (5 of 9):**

```ts

/** The sun's altitude at the schedule's plane, in degrees. */
export function sunAltitudeOnLeg(leg: MapLeg, t: number): number {
  const here = positionAtTime(leg, t)
  return sunAltitude(t, here.lat, here.lng)
```

**with:**

```ts

/**
 * The sun's altitude at a cockpit sunrise or sunset on `leg` (Stage 3 spec §8): from the height the real plane was last
 * seen at, while it's in the air at its cruise, and from 35,000 ft otherwise.
 */
export function cockpitHorizonOnLeg(leg: MapLeg): number {
  const live = leg.flight?.live
  const fix = live?.state === 'airborne' ? live.fix : null
  const feet = fix && !fix.onGround ? fix.altitudeFt : null
  // NaN fails both comparisons, so it's left out too.
  if (feet == null || !(feet >= CRUISE_ALTITUDES_FEET.lowest && feet <= CRUISE_ALTITUDES_FEET.highest)) return COCKPIT_HORIZON
  return GROUND_HORIZON - horizonDip(feet)
}

/** The sun's altitude at the plane, in degrees: where its record has it, else where the schedule does. */
export function sunAltitudeOnLeg(leg: MapLeg, t: number): number {
  const here = coursePositionAt(leg, t)
  return sunAltitude(t, here.lat, here.lng)
```

**In `src/facts/sky.ts`, replace (6 of 9):**

```ts

/** The sunrises and sunsets the cockpit sees while the schedule has the flight in the air, in order: sampled every 2 minutes and narrowed to 5 seconds. */
export function sunEvents(leg: MapLeg): SunEvent[] {
  const window = leg.kind === 'flight' ? airborneWindow(leg.start, leg.end) : null
  if (!window) return []
  const height = (t: number) => sunAltitudeOnLeg(leg, t) - COCKPIT_HORIZON
  const times: number[] = []
```

**with:**

```ts

/**
 * The sunrises and sunsets the cockpit sees while the flight is in the air, in order: sampled every 2 minutes and
 * narrowed to 5 seconds. A flight with a record is followed along its real path, at its real times.
 */
export function sunEvents(leg: MapLeg): SunEvent[] {
  const window = leg.kind === 'flight' ? legAirborne(leg) : null
  if (!window) return []
  const horizon = cockpitHorizonOnLeg(leg)
  const height = (t: number) => sunAltitudeOnLeg(leg, t) - horizon
  const times: number[] = []
```

**In `src/facts/sky.ts`, replace (7 of 9):**

```ts
    const time = crossing(height, times[i - 1], times[i], isRising, 5_000)
    events.push({ kind: isRising ? 'sunrise' : 'sunset', time, peopleBelowGap: peopleBelowGap(positionAtTime(leg, time), time, isRising) })
  }
```

**with:**

```ts
    const time = crossing(height, times[i - 1], times[i], isRising, 5_000)
    events.push({ kind: isRising ? 'sunrise' : 'sunset', time, peopleBelowGap: peopleBelowGap(coursePositionAt(leg, time), time, isRising) })
  }
```

**In `src/facts/sky.ts`, replace (8 of 9):**

```ts
export function chase(leg: MapLeg, t: number): Chase | null {
  const window = leg.kind === 'flight' ? airborneWindow(leg.start, leg.end) : null
  if (!window || t < window.start || t > window.end || sunAltitudeOnLeg(leg, t) <= COCKPIT_HORIZON) return null
  const here = positionAtTime(leg, t)
  const soon = positionAtTime(leg, t + MINUTE)
  const degreesPerHour = 15 + wrapped(soon.lng - here.lng) * 60
```

**with:**

```ts
export function chase(leg: MapLeg, t: number): Chase | null {
  const window = leg.kind === 'flight' ? legAirborne(leg) : null
  if (!window || t < window.start || t > window.end || sunAltitudeOnLeg(leg, t) <= cockpitHorizonOnLeg(leg)) return null
  const here = coursePositionAt(leg, t)
  const soon = coursePositionAt(leg, t + MINUTE)
  const degreesPerHour = 15 + wrapped(soon.lng - here.lng) * 60
```

**In `src/facts/sky.ts`, replace (9 of 9):**

```ts
export function moonSight(leg: MapLeg, t: number): MoonSight | null {
  if (leg.kind !== 'flight' || sunAltitudeOnLeg(leg, t) > COCKPIT_HORIZON) return null
  const here = positionAtTime(leg, t)
  return { phase: moonPhase(t), isUp: moonAltitude(here.lat, here.lng, t) > 0 }
```

**with:**

```ts
export function moonSight(leg: MapLeg, t: number): MoonSight | null {
  if (leg.kind !== 'flight' || sunAltitudeOnLeg(leg, t) > cockpitHorizonOnLeg(leg)) return null
  const here = coursePositionAt(leg, t)
  return { phase: moonPhase(t), isUp: moonAltitude(here.lat, here.lng, t) > 0 }
```

**In `src/facts/tripTotals.ts`, replace (1 of 5):**

```ts
import { destinationsOf, legDistanceMeters, milesFlown, totalMiles, type MapLeg, type TripMap } from '../map/tripMap'
import { zoneOffsetMinutes } from '../time/zoned'
import type { SunEvent } from './sky'
```

**with:**

```ts
import { METERS_PER_MILE } from '../map/greatCircle'
import { destinationsOf, type MapLeg, type TripMap } from '../map/tripMap'
import { zoneOffsetMinutes } from '../time/zoned'
import { legPathLength } from './legCourse'
import { legPlane } from './planePosition'
import type { SunEvent } from './sky'
```

**In `src/facts/tripTotals.ts`, replace (2 of 5):**

```ts
 * A trip's numbers (Stage 2 spec §4.8), as the app's TripTotals: cities, miles, time zones crossed and sunsets from the
 * cockpit, so far or for the whole trip (a recap, or a forecast of a trip ahead), and its longest flight.
 */
```

**with:**

```ts
 * A trip's numbers (Stage 2 spec §4.8), as the app's TripTotals: cities, miles, time zones crossed and sunsets from the
 * cockpit, so far or for the whole trip (a recap, or a forecast of a trip ahead), and its longest flight. A flight with
 * a real path counts the miles along it (Stage 3 spec §8). The miles are here, not in the map's model, as they need
 * the facts' plane.
 */
```

**In `src/facts/tripTotals.ts`, replace (3 of 5):**

```ts

/** Up to `t`: the finished flights, and the miles of the one in the air. */
export function totalsSoFar(map: TripMap, t: number, events: SunEventsByLeg): TripTotals {
  const finished = map.legs.filter((l) => l.kind === 'flight' && l.end <= t)
```

**with:**

```ts

/**
 * Whole miles flown by `t`: every mile of a flight that's in, none of one that hasn't left, and as far as the facts'
 * plane has come on the one in the air. A flight with a real path counts the miles along it. `isReplay`: `t` is a
 * moment of the replay, not now.
 */
export function milesFlown(legs: MapLeg[], t: number, isReplay = false): number {
  const meters = legs.filter((l) => l.kind === 'flight').reduce((sum, leg) => {
    if (t >= leg.end) return sum + legPathLength(leg)
    if (t < leg.start) return sum
    return sum + legPlane(leg, t, isReplay).distance
  }, 0)
  return Math.round(meters / METERS_PER_MILE)
}

/** Whole miles of every flight among `legs`, along each one's real path where it has one. */
export function totalMiles(legs: MapLeg[]): number {
  return Math.round(legs.filter((l) => l.kind === 'flight').reduce((sum, l) => sum + legPathLength(l), 0) / METERS_PER_MILE)
}

/** Up to `t`: the finished flights, and the miles of the one in the air. `isReplay`: `t` is a moment of the replay, not now. */
export function totalsSoFar(map: TripMap, t: number, events: SunEventsByLeg, isReplay = false): TripTotals {
  const finished = map.legs.filter((l) => l.kind === 'flight' && l.end <= t)
```

**In `src/facts/tripTotals.ts`, replace (4 of 5):**

```ts
    cities: destinationsOf(finished, map.home).length,
    miles: milesFlown(map.legs, t),
    timeZones: timeZonesCrossed(finished),
```

**with:**

```ts
    cities: destinationsOf(finished, map.home).length,
    miles: milesFlown(map.legs, t, isReplay),
    timeZones: timeZonesCrossed(finished),
```

**In `src/facts/tripTotals.ts`, replace (5 of 5):**

```ts

/** The flight with the greatest distance, the first of any tie. */
export function longestFlight(legs: MapLeg[]): MapLeg | null {
  let longest: MapLeg | null = null
  for (const leg of legs) if (leg.kind === 'flight' && (!longest || legDistanceMeters(leg) > legDistanceMeters(longest))) longest = leg
  return longest
```

**with:**

```ts

/** The flight with the most miles, along its real path where it has one: the first of any tie. */
export function longestFlight(legs: MapLeg[]): MapLeg | null {
  let longest: MapLeg | null = null
  for (const leg of legs) if (leg.kind === 'flight' && (!longest || legPathLength(leg) > legPathLength(longest))) longest = leg
  return longest
```

**In `src/map/tripMap.ts`, replace (1 of 2):**

```ts
import { scheduledFraction, scheduledTime } from './flightProgress'
import { distanceMeters, METERS_PER_MILE, pointAlong, pointsAlong, type GeoPoint } from './greatCircle'
import { calendarDay } from '../time/zoned'
```

**with:**

```ts
import { scheduledFraction, scheduledTime } from './flightProgress'
import { distanceMeters, pointAlong, pointsAlong, type GeoPoint } from './greatCircle'
import { calendarDay } from '../time/zoned'
```

**In `src/map/tripMap.ts`, replace (2 of 2):**

```ts

/** Whole miles flown by `t` along the flights' planned routes, with the one in the air counted in part. */
export function milesFlown(legs: MapLeg[], t: number): number {
  return Math.round(legs.filter((l) => l.kind === 'flight').reduce((sum, l) => sum + legDistanceMeters(l) * legProgress(l, t), 0) / METERS_PER_MILE)
}

/** Whole miles of every flight among `legs`. */
export function totalMiles(legs: MapLeg[]): number {
  return Math.round(legs.filter((l) => l.kind === 'flight').reduce((sum, l) => sum + legDistanceMeters(l), 0) / METERS_PER_MILE)
}

/** The trip's days: CrewLu's count when known (at least 1), else the calendar days its span covers in `timeZone` (Stage 2 spec §8.1). */
```

**with:**

```ts

/** The trip's days: CrewLu's count when known (at least 1), else the calendar days its span covers in `timeZone` (Stage 2 spec §8.1). */
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 37 tests pass. Then `npx tsc --noEmit`: nothing; and `npm test`: 169 test files and 3,484 tests pass.

- [x] **Step 5: Commit, on Todd's yes (after batch A's checkpoint).**

```bash
git add src/copy/factsTrip.ts src/copy/tripMap.ts src/facts/sky.ts src/facts/tripTotals.ts src/map/tripMap.ts tests/facts/liveSky.test.ts tests/facts/liveTripTotals.test.ts tests/map/tripMap.test.ts
git commit -m "The sky along the record, seen from the real plane's cruise, and the miles along real paths (Stage 3 spec §8)"
```

---

### Task 5: The words, and the aircraft's names

The words for the real plane: "Last seen near Montréal · 2 h 10 min ago", "Boeing 767-300 · N370UP" (`aircraftTypeName`, the app's table of 84 codes, copied exactly), "35,000 ft · 540 mph", "Halfway at about 12:05 PM", "Passes 40 mi from home at about 1:05 PM", "about" before a guessed event in the list, and "Live position: adsb.lol". The card's sentence adds where an out-of-sight plane was last seen. The rows' kinds gain the plane's. Nothing uses them yet but the card's sentence.

**Files:**
- Create: `src/facts/aircraftTypeNames.ts`
- Modify: `src/copy/facts.ts`, `src/copy/tripMap.ts`, `src/facts/factRow.ts`
- Test: `tests/copy/facts.test.ts`, `tests/copy/liveWords.test.ts`, `tests/facts/aircraftTypeNames.test.ts`, `tests/facts/factRow.test.ts`

- [x] **Step 1: Write the tests.**

**In `tests/copy/facts.test.ts`, replace (1 of 4):**

```ts
import {
  averageSpeedText, belowWords, chaseText, closestToHomeText, cockpitCountdown, cockpitEventText, flightTitle, flownText, flyingInto,
  groundSunText, landsText, midLine, milestoneHeadline, milestoneLine, moonText, timeDifferenceText,
} from '../../src/copy/facts'
```

**with:**

```ts
import {
  aircraftText, averageSpeedText, belowWords, chaseText, closestToHomeText, cockpitCountdown, cockpitEventText, flightTitle, flownText,
  flyingInto, groundSunText, halfwayText, heightAndSpeedText, landsText, lastSeenLine, LIVE_CREDIT, midLine, milestoneHeadline, milestoneLine,
  moonText, SPOKEN_LIVE_CREDIT, spokenLastSeen, timeDifferenceText,
} from '../../src/copy/facts'
```

**In `tests/copy/facts.test.ts`, replace (2 of 4):**

```ts

  it('names a flight by its number and cities', () => {
```

**with:**

```ts

  it('says "about" before a best guess’s time (best guesses design §2)', () => {
    expect(milestoneLine({ kind: 'outOver', name: 'the Pacific', time: NOW }, NY, false)).toBe(`Out over the Pacific · 3:14${PM}`)
    expect(milestoneLine({ kind: 'outOver', name: 'the Pacific', time: NOW, isEstimate: true }, NY, false)).toBe(`Out over the Pacific · about 3:14${PM}`)
    expect(milestoneLine({ kind: 'halfway', time: NOW, isEstimate: true }, NY, false)).toBe(`Halfway · about 3:14${PM}`)
    expect(milestoneLine({ kind: 'crossedInto', name: 'Kansas', time: NOW, isEstimate: true }, NY, false)).toBe(`Crossed into Kansas · about 3:14${PM}`)
    expect(milestoneLine({ kind: 'closestToHome', miles: 40, time: NOW, isEstimate: true }, NY, false)).toBe(`Closest to home, 40 mi · about 3:14${PM}`)
  })

  it('names a flight by its number and cities', () => {
```

**In `tests/copy/facts.test.ts`, replace (3 of 4):**

```ts
    expect(closestToHomeText(40, NOW, NOW + 60 * MIN, NY, false)).toBe(`Closest to home was 40 mi at 3:14${PM}`)
  })
```

**with:**

```ts
    expect(closestToHomeText(40, NOW, NOW + 60 * MIN, NY, false)).toBe(`Closest to home was 40 mi at 3:14${PM}`)
  })

  it('says "about" before the closest point’s time ahead of a real plane, and after it where nobody saw it pass', () => {
    expect(closestToHomeText(40, NOW + 60 * MIN, NOW, NY, false, true)).toBe(`Passes 40 mi from home at about 4:14${PM}`)
    // Where nobody saw the plane pass, it's still a best guess.
    expect(closestToHomeText(40, NOW, NOW + 60 * MIN, NY, false, true)).toBe(`Closest to home was 40 mi at about 3:14${PM}`)
  })
```

**In `tests/copy/facts.test.ts`, replace (4 of 4):**

```ts
    expect(midLine('Like driving coast to coast')).toBe('like driving coast to coast')
  })
```

**with:**

```ts
    expect(midLine('Like driving coast to coast')).toBe('like driving coast to coast')
  })

  it('says "about" before the halfway time that’s the real plane’s estimate (Stage 3 spec §8)', () => {
    expect(halfwayText(NOW, NY, false)).toBe(`Halfway at 3:14${PM}`)
    expect(halfwayText(NOW, NY, false, true)).toBe(`Halfway at about 3:14${PM}`)
  })
})

describe('the real plane in words (Stage 3 spec §8, best guesses design §2)', () => {
  const quebec = { name: 'Québec', kind: 'province' as const, country: 'Canada' }
  const montreal = { name: 'Montréal', lat: 45.5, lon: -73.57 }

  it('says where it was last seen, by the city near it, else the place under it, and how long ago', () => {
    expect(lastSeenLine(quebec, montreal, 10 * MIN)).toBe('Last seen near Montréal · 10 min ago')
    expect(lastSeenLine(quebec, null, 130 * MIN)).toBe('Last seen over Québec · 2 h 10 min ago')
    expect(lastSeenLine(null, null, 120 * MIN)).toBe('Last seen 2 h ago')
  })

  it('says it for a screen reader, by the city near it, else the place under it, else how long ago', () => {
    expect(spokenLastSeen(quebec, montreal, 10 * MIN)).toBe('near Montréal')
    expect(spokenLastSeen(quebec, null, 10 * MIN)).toBe('over Québec')
    expect(spokenLastSeen(null, null, 10 * MIN)).toBe('10 minutes ago')
    expect(spokenLastSeen(null, null, 130 * MIN)).toBe('2 hours 10 minutes ago')
  })

  it('holds a time that can’t be right from a minute to a year', () => {
    expect(lastSeenLine(null, null, 20_000)).toBe('Last seen 1 min ago')
    expect(lastSeenLine(null, null, -500_000)).toBe('Last seen 1 min ago')
    expect(lastSeenLine(null, null, Infinity)).toBe('Last seen 8760 h ago')
    expect(lastSeenLine(null, null, NaN)).toBe('Last seen 1 min ago')
    expect(spokenLastSeen(null, null, NaN)).toBe('1 minute ago')
  })

  it('says how long ago to the nearest minute', () => {
    expect(lastSeenLine(null, null, 10 * MIN + 29_000)).toBe('Last seen 10 min ago')
    expect(lastSeenLine(null, null, 10 * MIN + 31_000)).toBe('Last seen 11 min ago')
    expect(spokenLastSeen(null, null, 10 * MIN + 31_000)).toBe('11 minutes ago')
  })

  it('names the plane by its type and registration, each where it’s known', () => {
    expect(aircraftText('B763', 'N370UP')).toBe('Boeing 767-300 · N370UP')
    // An unknown type shows as itself.
    expect(aircraftText('ZZZZ', 'N370UP')).toBe('ZZZZ · N370UP')
    expect(aircraftText('B763', null)).toBe('Boeing 767-300')
    expect(aircraftText(null, 'N370UP')).toBe('N370UP')
    expect(aircraftText(null, null)).toBeNull()
    expect(aircraftText('  ', '')).toBeNull()
  })

  it('leaves the spaces off a registration', () => {
    expect(aircraftText(' b763 ', ' N370UP ')).toBe('Boeing 767-300 · N370UP')
  })

  it('says the height to the nearest 100 ft and the speed to the nearest 10 mph', () => {
    // 470 kt is 540.9 mph.
    expect(heightAndSpeedText(34_975, 470)).toBe('35,000 ft · 540 mph')
    expect(heightAndSpeedText(35_000, null)).toBe('35,000 ft')
    expect(heightAndSpeedText(null, 470)).toBe('540 mph')
    expect(heightAndSpeedText(null, null)).toBeNull()
    expect(heightAndSpeedText(34_949, null)).toBe('34,900 ft')
    expect(heightAndSpeedText(34_950, null)).toBe('35,000 ft')
  })

  it('shows a height and a speed at the edges of what’s believed', () => {
    expect(heightAndSpeedText(0, 0)).toBe('0 ft · 0 mph')
    // 800 kt is 920.6 mph.
    expect(heightAndSpeedText(60_000, 800)).toBe('60,000 ft · 920 mph')
    expect(heightAndSpeedText(60_001, 801)).toBeNull()
  })

  it('leaves out a number that can’t be right', () => {
    expect(heightAndSpeedText(1e12, 470)).toBe('540 mph')
    expect(heightAndSpeedText(-500, 470)).toBe('540 mph')
    expect(heightAndSpeedText(35_000, 5_000)).toBe('35,000 ft')
    expect(heightAndSpeedText(NaN, Infinity)).toBeNull()
  })

  it('never writes a minus before nothing', () => {
    // JSON can carry -0, and JavaScript writes it "-0": a number rounded to nothing is 0.
    expect(heightAndSpeedText(-0, -0)).toBe('0 ft · 0 mph')
    expect(heightAndSpeedText(20, 0.001)).toBe('0 ft · 0 mph')
  })

  it('credits adsb.lol', () => {
    expect(LIVE_CREDIT).toBe('Live position: adsb.lol')
    expect(SPOKEN_LIVE_CREDIT).toBe('Live position from adsb.lol.')
  })
```

**In `tests/copy/liveWords.test.ts`, replace (1 of 2):**

```ts

  it('says it is still on the ground, and when it will land, and nothing of what is below', () => {
```

**with:**

```ts

  it("while it's out of sight, says what's below by the plan, and where it was last seen (Stage 3 spec §15, best guesses design §2)", () => {
    const { leg, t } = caseLeg('ahead, in the air', 3)
    expect(liveSummary(leg, t, NY, false, 'Ohio', 'near Columbus'))
      .toBe('UPS207 to Philadelphia, about 14 minutes ahead of schedule, over Ohio, last seen near Columbus. Lands about 8:30 AM your time.')
    expect(liveSummary(leg, t, NY, false, null, '12 minutes ago'))
      .toBe('UPS207 to Philadelphia, about 14 minutes ahead of schedule, last seen 12 minutes ago. Lands about 8:30 AM your time.')
  })

  it('says it is still on the ground, and when it will land, and nothing of what is below', () => {
```

**In `tests/copy/liveWords.test.ts`, replace (2 of 2):**

```ts
    expect(liveSummary(leg, t, NY, false, 'Indiana')).toMatch(/^UPS207 to Philadelphia, still on the ground, 20 minutes behind schedule\. Lands about /)
  })
```

**with:**

```ts
    expect(liveSummary(leg, t, NY, false, 'Indiana')).toMatch(/^UPS207 to Philadelphia, still on the ground, 20 minutes behind schedule\. Lands about /)
    // Nor where it was last seen: a plane on the ground or landed is over nothing, and out of sight of nothing.
    expect(liveSummary(leg, t, NY, false, 'Indiana', 'near Indianapolis')).toMatch(/^UPS207 to Philadelphia, still on the ground, 20 minutes behind schedule\. Lands about /)
    const landed = caseLeg('landed, seen all the way')
    expect(liveSummary(landed.leg, landed.t, NY, false, null, '2 hours ago')).toMatch(/^UPS207 to Philadelphia, landed 23 minutes early\. Reaches the gate/)
  })
```

**Create `tests/facts/aircraftTypeNames.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { aircraftTypeName } from '../../src/facts/aircraftTypeNames'

describe('an aircraft’s name from its type code (Stage 3 spec §8)', () => {
  it('names the freighters a pilot’s family sees', () => {
    expect(aircraftTypeName('B763')).toBe('Boeing 767-300')
    expect(aircraftTypeName('B748')).toBe('Boeing 747-8')
    expect(aircraftTypeName('B744')).toBe('Boeing 747-400')
    expect(aircraftTypeName('B752')).toBe('Boeing 757-200')
    expect(aircraftTypeName('A306')).toBe('Airbus A300-600')
    expect(aircraftTypeName('MD11')).toBe('McDonnell Douglas MD-11')
    // One code for the 777-200LR and the 777 Freighter, which is built on it.
    expect(aircraftTypeName('B77L')).toBe('Boeing 777-200')
  })

  it('names an airliner', () => {
    expect(aircraftTypeName('B738')).toBe('Boeing 737-800')
    expect(aircraftTypeName('A20N')).toBe('Airbus A320neo')
    expect(aircraftTypeName('E75L')).toBe('Embraer 175')
    expect(aircraftTypeName('CRJ9')).toBe('Bombardier CRJ900')
  })

  it('shows an unknown code as itself', () => {
    expect(aircraftTypeName('ZZZZ')).toBe('ZZZZ')
    expect(aircraftTypeName('GLF6')).toBe('GLF6')
  })

  it('reads a code in any case, with spaces around it', () => {
    expect(aircraftTypeName(' b763 ')).toBe('Boeing 767-300')
    expect(aircraftTypeName('zzzz')).toBe('ZZZZ')
  })
})
```

**Create `tests/facts/factRow.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { factRow, type FactRowKind } from '../../src/facts/factRow'

describe('the facts’ rows (Stage 2 spec §5)', () => {
  it('have a kind for the plane’s own row, on a flight with live data (Stage 3 spec §8)', () => {
    // A kind the type doesn't have fails `tsc`, which reads the tests too.
    const kind: FactRowKind = 'plane'
    const row = factRow(kind, 'Airplane', 'Boeing 767-300 · N370UP', ['35,000 ft · 540 mph'])
    expect(row.kind).toBe('plane')
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/copy/facts.test.ts tests/copy/liveWords.test.ts tests/facts/aircraftTypeNames.test.ts tests/facts/factRow.test.ts
```

Expected: the aircraft's names can't load (there's no `src/facts/aircraftTypeNames`), and 15 of the other 51 tests fail: `aircraftText`, `heightAndSpeedText` and the other new words aren't there yet.

- [x] **Step 3: Write the code.**

**In `src/copy/facts.ts`, replace (1 of 6):**

```ts
import type { City, Place } from '../facts/geography'
```

**with:**

```ts
import { aircraftTypeName } from '../facts/aircraftTypeNames'
import type { City, Place } from '../facts/geography'
```

**In `src/copy/facts.ts`, replace (2 of 6):**

```ts
import type { Chase, MoonSight, SunEvent, SunKind } from '../facts/sky'
import { isArrivalEstimated, type MapLeg } from '../map/tripMap'
```

**with:**

```ts
import type { Chase, MoonSight, SunEvent, SunKind } from '../facts/sky'
import { METERS_PER_MILE, METERS_PER_NM } from '../map/greatCircle'
import { isArrivalEstimated, type MapLeg } from '../map/tripMap'
```

**In `src/copy/facts.ts`, replace (3 of 6):**

```ts
import { shortTimeText } from './format'

```

**with:**

```ts
import { shortTimeText } from './format'
import { minutesText, spokenMinutes } from './tripMap'

```

**In `src/copy/facts.ts`, replace (4 of 6):**

```ts

/** The trip so far's list: "Crossed into Kansas · 1:12 PM". */
export function milestoneLine(milestone: Milestone, viewerTz: string, h24: boolean): string {
  const time = shortTimeText(milestone.time, viewerTz, h24)
  switch (milestone.kind) {
```

**with:**

```ts

/** "about " before a time that's a best guess, else nothing (best guesses design §2). */
const aboutIf = (isEstimate: boolean | undefined) => (isEstimate ? 'about ' : '')

/**
 * The trip so far's list: "Crossed into Kansas · 1:12 PM". A best guess reads "about": "Out over the Pacific · about
 * 4:05 PM" (best guesses design §2).
 */
export function milestoneLine(milestone: Milestone, viewerTz: string, h24: boolean): string {
  const time = `${aboutIf(milestone.isEstimate)}${shortTimeText(milestone.time, viewerTz, h24)}`
  switch (milestone.kind) {
```

**In `src/copy/facts.ts`, replace (5 of 6):**

```ts

/** "Passes 40 mi from home at 1:05 PM", or "Closest to home was 40 mi at 1:05 PM" once it's passed. */
export function closestToHomeText(miles: number, at: number, now: number, viewerTz: string, h24: boolean): string {
  const clock = shortTimeText(at, viewerTz, h24)
  return at > now ? `Passes ${miles} mi from home at ${clock}` : `Closest to home was ${miles} mi at ${clock}`
}

```

**with:**

```ts

/**
 * "Passes 40 mi from home at 1:05 PM", or "Closest to home was 40 mi at 1:05 PM" once it's passed. Where nobody saw the
 * real plane (`isEstimate`) the time is a best guess: "Passes 40 mi from home at about 1:05 PM".
 */
export function closestToHomeText(miles: number, at: number, now: number, viewerTz: string, h24: boolean, isEstimate = false): string {
  const clock = `${aboutIf(isEstimate)}${shortTimeText(at, viewerTz, h24)}`
  return at > now ? `Passes ${miles} mi from home at ${clock}` : `Closest to home was ${miles} mi at ${clock}`
}

// The real plane (Stage 3 spec §8)

/** Whole minutes in `ago` ms, held from a minute to a year, so a length that can't be right never reaches the screen. */
function minutesAgo(ago: number): number {
  const asked = Math.round(ago / MINUTE)
  return Number.isNaN(asked) ? 1 : Math.min(Math.max(asked, 1), 365 * 24 * 60)
}

/**
 * Under what's below, while the real plane is out of sight, `ago` ms after it was last seen: "Last seen near Montréal ·
 * 12 min ago" by a city of a million or more, else "Last seen over Québec · 12 min ago", else "Last seen 12 min ago".
 * It's the one line that says the place above it is worked out, not seen (best guesses design §2).
 */
export function lastSeenLine(place: Place | null, city: City | null, ago: number): string {
  const time = `${minutesText(minutesAgo(ago))} ago`
  if (city) return `Last seen near ${city.name} · ${time}`
  if (place) return `Last seen over ${place.name} · ${time}`
  return `Last seen ${time}`
}

/**
 * Where a plane that's out of sight was last seen, for the card's sentence for a screen reader: "near Montréal" by a
 * city of a million or more, else "over Québec", else how long ago, "2 hours ago".
 */
export function spokenLastSeen(place: Place | null, city: City | null, ago: number): string {
  if (city) return `near ${city.name}`
  if (place) return `over ${place.name}`
  return `${spokenMinutes(minutesAgo(ago))} ago`
}

/** `text` without the spaces around it, or null when nothing is left. */
const nonEmpty = (text: string | null) => text?.trim() || null

/**
 * The plane's row: "Boeing 767-300 · N370UP". An unknown type code shows as itself, "ZZZZ · N370UP", and a missing type
 * or registration is left out. Null with neither.
 */
export function aircraftText(typeCode: string | null, registration: string | null): string | null {
  const type = nonEmpty(typeCode)
  const parts = [type == null ? null : aircraftTypeName(type), nonEmpty(registration)].filter((p): p is string => p != null)
  return parts.length > 0 ? parts.join(' · ') : null
}

/**
 * A height or a speed outside these is left out: no airliner sends one, and a number that can't be right mustn't reach
 * the screen.
 */
export const BELIEVED_HEIGHTS_FEET = { lowest: 0, highest: 60_000 }
export const BELIEVED_SPEEDS_KNOTS = { lowest: 0, highest: 800 }

/** Whether `value` is within `range`: never a value that isn't a number. */
const isWithin = (value: number, range: { lowest: number; highest: number }) => value >= range.lowest && value <= range.highest

/** `value` to the nearest `step`, as a whole number: "35,000", never "-0". */
const toNearest = (value: number, step: number) => numberText(Math.round(value / step) * step + 0)

/**
 * "35,000 ft · 540 mph": the real plane's height to the nearest 100 ft and its speed over the ground to the nearest 10
 * mph, each where the plane sent one that could be right. Null with neither.
 */
export function heightAndSpeedText(altitudeFeet: number | null, groundSpeedKnots: number | null): string | null {
  const height = altitudeFeet != null && isWithin(altitudeFeet, BELIEVED_HEIGHTS_FEET) ? `${toNearest(altitudeFeet, 100)} ft` : null
  const speed = groundSpeedKnots != null && isWithin(groundSpeedKnots, BELIEVED_SPEEDS_KNOTS)
    ? `${toNearest((groundSpeedKnots * METERS_PER_NM) / METERS_PER_MILE, 10)} mph`
    : null
  const parts = [height, speed].filter((p): p is string => p != null)
  return parts.length > 0 ? parts.join(' · ') : null
}

/** The credit under the facts wherever a flight with live data shows: adsb.lol's data is under the ODbL. */
export const LIVE_CREDIT = 'Live position: adsb.lol'
/** The credit as a screen reader reads it. */
export const SPOKEN_LIVE_CREDIT = 'Live position from adsb.lol.'

```

**In `src/copy/facts.ts`, replace (6 of 6):**

```ts

export const halfwayText = (time: number, viewerTz: string, h24: boolean) => `Halfway at ${shortTimeText(time, viewerTz, h24)}`

```

**with:**

```ts

/** "Halfway at 4:12 PM", or with the real plane's estimate "Halfway at about 12:05 PM" (Stage 3 spec §8). */
export const halfwayText = (time: number, viewerTz: string, h24: boolean, isEstimate = false) =>
  `Halfway at ${aboutIf(isEstimate)}${shortTimeText(time, viewerTz, h24)}`

```

**In `src/copy/tripMap.ts`, replace (1 of 2):**

```ts
 * schedule, over Québec. Lands about 3:18 PM your time." Once it's down, "…, landed 8 minutes early. Reaches the gate at
 * 3:18 PM your time." Null when the plane has no label, and the schedule's sentence stands. `over` is what's below,
 * said only of a plane in the air: one on the ground or landed is over nothing.
 */
export function liveSummary(leg: MapLeg, now: number, viewerTz: string, h24: boolean, over: string | null = null): string | null {
  const label = leg.flight ? mapFlightProgress(leg.flight, now).label : null
```

**with:**

```ts
 * schedule, over Québec. Lands about 3:18 PM your time." Once it's down, "…, landed 8 minutes early. Reaches the gate at
 * 3:18 PM your time." Null when the plane has no label, and the schedule's sentence stands.
 * - `over` is what's below.
 * - `lastSeen` is where a plane that's out of sight was last seen, as `spokenLastSeen` words it: "near Montréal", "over
 *   Québec" or "2 hours ago". It follows what's below, which is then a best guess: "…, about 14 minutes ahead of
 *   schedule, over Ohio, last seen near Columbus." (Stage 3 spec §15, best guesses design §2).
 * Both are said only of a plane in the air: one on the ground or landed is over nothing, and out of sight of nothing.
 */
export function liveSummary(
  leg: MapLeg, now: number, viewerTz: string, h24: boolean, over: string | null = null, lastSeen: string | null = null,
): string | null {
  const label = leg.flight ? mapFlightProgress(leg.flight, now).label : null
```

**In `src/copy/tripMap.ts`, replace (2 of 2):**

```ts
  const arrival = isDown ? `Reaches the gate at ${time} your time.` : `Lands ${isArrivalEstimated(leg) ? 'about' : 'at'} ${time} your time.`
  return `${lead} ${leg.destination.city}, ${spokenLiveLabel(label)}${over && isFlying ? `, over ${over}` : ''}. ${arrival}`
}
```

**with:**

```ts
  const arrival = isDown ? `Reaches the gate at ${time} your time.` : `Lands ${isArrivalEstimated(leg) ? 'about' : 'at'} ${time} your time.`
  const where = isFlying ? `${over ? `, over ${over}` : ''}${lastSeen ? `, last seen ${lastSeen}` : ''}` : ''
  return `${lead} ${leg.destination.city}, ${spokenLiveLabel(label)}${where}. ${arrival}`
}
```

**Create `src/facts/aircraftTypeNames.ts`:**

```ts
/**
 * An aircraft's name from the type code it broadcasts (Stage 3 spec §8), as the app's AircraftTypeNames: "Boeing
 * 767-300" for "B763". The codes are ICAO's type designators (Doc 8643), for the airliners and freighters a pilot's
 * family is likely to see. The table is the app's, copied as it is.
 */

/** The names by code. A Map, so a code is only ever one of these, never a word every object has. */
const NAMES = new Map<string, string>(Object.entries({
  // Airbus
  A306: 'Airbus A300-600', A30B: 'Airbus A300', A310: 'Airbus A310',
  A318: 'Airbus A318', A319: 'Airbus A319', A320: 'Airbus A320', A321: 'Airbus A321',
  A19N: 'Airbus A319neo', A20N: 'Airbus A320neo', A21N: 'Airbus A321neo',
  A332: 'Airbus A330-200', A333: 'Airbus A330-300', A338: 'Airbus A330-800', A339: 'Airbus A330-900',
  A342: 'Airbus A340-200', A343: 'Airbus A340-300', A345: 'Airbus A340-500', A346: 'Airbus A340-600',
  A359: 'Airbus A350-900', A35K: 'Airbus A350-1000', A388: 'Airbus A380',
  BCS1: 'Airbus A220-100', BCS3: 'Airbus A220-300',
  // Boeing
  B712: 'Boeing 717',
  B722: 'Boeing 727-200',
  B733: 'Boeing 737-300', B734: 'Boeing 737-400', B735: 'Boeing 737-500', B736: 'Boeing 737-600',
  B737: 'Boeing 737-700', B738: 'Boeing 737-800', B739: 'Boeing 737-900',
  B37M: 'Boeing 737 MAX 7', B38M: 'Boeing 737 MAX 8', B39M: 'Boeing 737 MAX 9', B3XM: 'Boeing 737 MAX 10',
  B742: 'Boeing 747-200', B744: 'Boeing 747-400', B748: 'Boeing 747-8',
  B752: 'Boeing 757-200', B753: 'Boeing 757-300',
  B762: 'Boeing 767-200', B763: 'Boeing 767-300', B764: 'Boeing 767-400',
  // B77L is one code for the 777-200LR and the 777 Freighter, which is built on it: "777-200" is true of both.
  B772: 'Boeing 777-200', B77L: 'Boeing 777-200', B773: 'Boeing 777-300', B77W: 'Boeing 777-300ER',
  B778: 'Boeing 777-8', B779: 'Boeing 777-9',
  B788: 'Boeing 787-8', B789: 'Boeing 787-9', B78X: 'Boeing 787-10',
  // McDonnell Douglas
  DC10: 'McDonnell Douglas DC-10', MD11: 'McDonnell Douglas MD-11',
  MD82: 'McDonnell Douglas MD-82', MD83: 'McDonnell Douglas MD-83', MD88: 'McDonnell Douglas MD-88',
  MD90: 'McDonnell Douglas MD-90',
  // Embraer
  E135: 'Embraer ERJ 135', E145: 'Embraer ERJ 145', E45X: 'Embraer ERJ 145',
  E170: 'Embraer 170', E75L: 'Embraer 175', E75S: 'Embraer 175',
  E190: 'Embraer 190', E195: 'Embraer 195', E290: 'Embraer E190-E2', E295: 'Embraer E195-E2',
  // Bombardier and De Havilland Canada
  CRJ2: 'Bombardier CRJ200', CRJ7: 'Bombardier CRJ700', CRJ9: 'Bombardier CRJ900', CRJX: 'Bombardier CRJ1000',
  DH8C: 'De Havilland Dash 8-300', DH8D: 'De Havilland Dash 8-400',
  // ATR and the feeders
  AT43: 'ATR 42', AT45: 'ATR 42', AT46: 'ATR 42-600',
  AT72: 'ATR 72', AT75: 'ATR 72', AT76: 'ATR 72-600',
  C208: 'Cessna Caravan', SF34: 'Saab 340', B190: 'Beechcraft 1900',
}))

/** "Boeing 767-300" for "B763" or " b763 ", or the code itself, in capitals, when it isn't one of these: "ZZZZ". */
export function aircraftTypeName(typeCode: string): string {
  const code = typeCode.trim().toUpperCase()
  return NAMES.get(code) ?? code
}
```

**In `src/facts/factRow.ts`, replace:**

```ts
export type FactRowKind =
  // In flight (§5.1)
  | 'below' | 'sky' | 'distance' | 'headed'
  // On a layover (§5.3), at home before a trip (§5.4) and in the recap (§5.5)
```

**with:**

```ts
export type FactRowKind =
  // In flight (§5.1), with the plane's row for a flight with live data (Stage 3 spec §8): "Boeing 767-300 · N370UP"
  | 'below' | 'plane' | 'sky' | 'distance' | 'headed'
  // On a layover (§5.3), at home before a trip (§5.4) and in the recap (§5.5)
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 55 tests pass. Then `npx tsc --noEmit`: nothing; and `npm test`: 171 test files and 3,505 tests pass.

- [x] **Step 5: Batch A's review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Tasks 2 to 5, the pieces, against the spec's §8, §9 and §15, the best guesses design's §2 and §3, the app at `6d3e74e`, and this plan's list of where the website settles or differs. Make its fixes, rerun each task's tests, and record what it found under "Changes made during execution".

- [x] **Step 6: Batch A's checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test
```

Expected: 171 test files and 3,505 tests pass.

- [x] **Step 7: Commit, on Todd's yes.** Tasks 2, 3 and 4's commits first. Where two tasks of this batch change one file (`src/copy/tripMap.ts`: Tasks 4, 5), each commit takes the file as its own task left it (ground rule 10). Then:

```bash
git add src/copy/facts.ts src/copy/tripMap.ts src/facts/aircraftTypeNames.ts src/facts/factRow.ts tests/copy/facts.test.ts tests/copy/liveWords.test.ts tests/facts/aircraftTypeNames.test.ts tests/facts/factRow.test.ts
git commit -m "The words for the real plane: where it was last seen, the aircraft and its height and speed, "about" before a best guess, and the credit to adsb.lol (Stage 3 spec §8, §9, best guesses design §2)"
```

---

### Task 6: The headline, the rows and the card's sentence

The facts read the real plane: what's below is read where the map draws it, in plain words; the last-seen line sits under it while the plane is out of sight; the plane's row comes second, with its height and speed only while it's seen in the air now; the distance is along the path; "Averaging about" shows only with no live data; and the card's sentence says where an out-of-sight plane was last seen. The facts learn whether their moments are a replay's. And the website's own (Todd, 16 Nov 2026): a real plane still on the ground at its departure airport reads "Still on the ground in Rockford" at the head of the facts, and only what's to go on the distance row.

**Files:**
- Modify: `src/copy/facts.ts`, `src/facts/tripFacts.ts`, `src/facts/tripFactsRows.ts`
- Test: `tests/copy/facts.test.ts`, `tests/facts/liveTripFacts.test.ts`

- [x] **Step 1: Write the tests.**

**In `tests/copy/facts.test.ts`, replace (1 of 2):**

```ts
  flyingInto, groundSunText, halfwayText, heightAndSpeedText, landsText, lastSeenLine, LIVE_CREDIT, midLine, milestoneHeadline, milestoneLine,
  moonText, SPOKEN_LIVE_CREDIT, spokenLastSeen, timeDifferenceText,
} from '../../src/copy/facts'
```

**with:**

```ts
  flyingInto, groundSunText, halfwayText, heightAndSpeedText, landsText, lastSeenLine, LIVE_CREDIT, midLine, milestoneHeadline, milestoneLine,
  moonText, SPOKEN_LIVE_CREDIT, spokenLastSeen, stillOnGroundText, timeDifferenceText, toGoText,
} from '../../src/copy/facts'
```

**In `tests/copy/facts.test.ts`, replace (2 of 2):**

```ts
    expect(midLine('Like driving coast to coast')).toBe('like driving coast to coast')
  })
```

**with:**

```ts
    expect(midLine('Like driving coast to coast')).toBe('like driving coast to coast')
  })

  it('says where a real plane still at its departure airport is, and only what’s to go (the website’s own, Todd, 16 Nov 2026)', () => {
    expect(stillOnGroundText('Rockford')).toBe('Still on the ground in Rockford')
    expect(toGoText(2_788)).toBe('2,788 mi to go')
  })
```

**Create `tests/facts/liveTripFacts.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { rowSentence, type FactRow, type FactRowKind } from '../../src/facts/factRow'
import { makeGeography, type Geography } from '../../src/facts/geography'
import { COCKPIT_HORIZON, cockpitHorizonOnLeg, sunAltitudeOnLeg } from '../../src/facts/sky'
import { cardSummary, headline, makeTripFacts, showsLiveData, tripSoFar, type TripFacts } from '../../src/facts/tripFacts'
import { factRows } from '../../src/facts/tripFactsRows'
import type { GeoPoint } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { makeMapFlight, mapFlightProgress } from '../../src/map/mapFlight'
import type { MapLeg } from '../../src/map/tripMap'
import { appComparisons, box, EQUATOR, equatorFlight, EQUINOX, flightMap } from './factsTestData'
import { date, dogLeg, equatorLive, equatorLiveLeg, HOME_BY_THE_EQUATOR, liveTime } from './liveFacts'

/**
 * The headline, the rows and the card's sentence for a flight with a real plane (Stage 3 spec §8, §9, §15), in US
 * English for a family in Louisville, as the app's LiveTripFactsTests. The made-up real plane is liveFacts.ts's: a
 * degree of longitude every 8 minutes from 10:15 UTC, so it's at 5° E at 10:55 (6:55 AM in Louisville), 10° E at 11:35
 * and 14° E at 12:07. One degree along the equator is 69.09 mi, and the flight is 1,382 mi.
 */

const NY = 'America/New_York'
/** The time's own space, narrow and unbreaking, as the browser writes it. */
const AM = ' AM'
const at = (hhmm: string) => date(`2026-03-20T${hhmm}:00Z`)

interface FactsOptions {
  /** When the map was made: when the real plane was last seen, unless it's given. */
  now?: string
  unseen?: [number, number]
  landed?: boolean
  hasStory?: boolean
  isReplay?: boolean
  typeCode?: string | null
  registration?: string | null
}

/** The facts of a map of `leg` alone, with home by the equator. */
function factsOf(leg: MapLeg, { hasStory = true, isReplay = false }: { hasStory?: boolean; isReplay?: boolean } = {}): TripFacts {
  return makeTripFacts(flightMap(leg, HOME_BY_THE_EQUATOR), {
    geography: hasStory ? EQUATOR : null, comparisons: appComparisons(), viewerTz: NY, h24: false, day: 1, days: 1, isReplay,
  })
}

/** The facts of a map of the one flight, with the real plane last seen at `seenUntil` and the map made at `now`. */
function facts(seenUntil: string, { now, unseen, landed = false, hasStory = true, isReplay = false, typeCode = 'B763', registration = 'N370UP' }: FactsOptions = {}): TripFacts {
  const live = equatorLive(at(seenUntil), { unseen, landedAt: landed ? liveTime(20) : undefined, typeCode, registration })
  return factsOf(equatorLiveLeg(live, at(now ?? seenUntil)), { hasStory, isReplay })
}

const rowsAt = (theFacts: TripFacts, t: string, now = t) => factRows(theFacts, at(t), at(now))

/** `live` with every time moved on by `by` ms. */
function movedOn(live: LiveFlight, by: number): LiveFlight {
  return {
    ...live,
    fix: live.fix && { ...live.fix, seenAt: live.fix.seenAt + by },
    landedAt: live.landedAt == null ? null : live.landedAt + by,
    trail: live.trail.map((p) => ({ ...p, time: p.time + by })),
  }
}

/**
 * The equator flight 7 hours later, at dusk, with its real plane at 25,000 ft, seen as far as 10° E. From that height the
 * cockpit's horizon is 3.4° below the sky's, against 3.9° from 35,000 ft, and its sunset is near 5.5° E, at about 17:59 UTC.
 */
function duskLeg(): MapLeg {
  const later = 7 * 3_600_000
  const scheduled = equatorFlight(0, 20, EQUINOX + later, 'dusk')
  const live = movedOn(equatorLive(liveTime(10), { altitudeFt: 25_000 }), later)
  const flight = makeMapFlight(scheduled.start, scheduled.end, scheduled.origin.place, scheduled.destination.place, live)
  if (!flight) throw new Error('The dusk flight has no plan')
  const progress = mapFlightProgress(flight, liveTime(10) + later)
  return { ...scheduled, start: progress.start, end: progress.end, flight }
}

function row(kind: FactRowKind, rows: FactRow[]): FactRow {
  const found = rows.find((r) => r.kind === kind)
  if (!found) throw new Error(`no ${kind} row`)
  return found
}

describe('the headline with a real plane (Stage 3 spec §8, §9)', () => {
  it('is what’s below the real plane, not the schedule’s', () => {
    // At 11:10 the real plane is at 6.875° E, 64 mi from Testville. The schedule's is at 6.1° E, beside it.
    expect(headline(facts('11:10'), at('11:10'))).toBe('Over Bravo')
    expect(headline(factsOf(equatorFlight(0, 20)), at('11:10'))).toBe('Over Bravo, near Testville')
  })

  it('leads with a crossing when the real plane crosses', () => {
    // It crossed into Bravo at 10:55. The schedule's plane crosses at 11:00.
    expect(headline(facts('10:57'), at('10:57'))).toBe('Just crossed into Bravo')
    expect(headline(facts('10:53'), at('10:53'))).toBe('Over Alpha')
    // At 10:57 the real plane is over Bravo, at 5.25° E. The schedule's is still over Alpha, at 4.7° E.
    expect(row('below', rowsAt(facts('10:57'), '10:57')).title).toBe('Over Bravo')
  })

  it('while it’s out of sight, is what’s below where the plan has the plane', () => {
    // Last seen over Alpha, at 4.375° E at 10:50. Eleven minutes on at its own 450 kt it's at 5.75° E: over Bravo, 25 mi
    // from Testville. The words are as plain as when it's seen.
    expect(headline(facts('10:50', { now: '11:01' }), at('11:01'))).toBe('Over Bravo, near Testville')
    // Last seen at 6.875° E ten minutes ago, it's at 8.125° E by now: no city within 40 mi.
    expect(headline(facts('11:10', { now: '11:20' }), at('11:20'))).toBe('Over Bravo')
  })

  it('while it’s out of sight with no place known, is the landing countdown', () => {
    // It lands at 13:11:47 by its estimate: 112 minutes after 11:20.
    expect(headline(facts('11:10', { now: '11:20', hasStory: false }), at('11:20'))).toBe('Landing in 1 h 52 min')
  })

  it('while it’s out of sight, keeps its order', () => {
    // Last seen at 9.375° E at 11:30. By the plan it's halfway at 11:35: that leads for five minutes, and then what's
    // below does.
    const theFacts = facts('11:30', { now: '11:37' })
    expect(headline(theFacts, at('11:37'))).toBe('Halfway!')
    expect(headline(theFacts, at('11:41'))).toBe('Over Bravo')
  })

  it('while it’s out of sight, tells a crossing as its best guess', () => {
    // Last seen at 4.375° E at 10:50. By the plan it crosses the border at 5° E at 10:55, and nobody saw it.
    expect(headline(facts('10:50', { now: '10:58' }), at('10:58'))).toBe('Just crossed into Bravo')
    // Not there yet, by the plan.
    expect(headline(facts('10:50', { now: '10:54' }), at('10:54'))).toBe('Over Alpha')
  })

  it('in a replay, is where the record has the plane', () => {
    const theFacts = facts('11:10', { isReplay: true })
    // 2.5° E at 10:35.
    expect(headline(theFacts, at('10:35'))).toBe('Over Alpha')
    // Past where it was last seen, at 8.75° E by the plan.
    expect(headline(theFacts, at('11:25'))).toBe('Over Bravo')
  })
})

describe('the rows with a real plane (Stage 3 spec §8)', () => {
  it('in the air, have the plane’s row second', () => {
    const rows = rowsAt(facts('11:10'), '11:10')
    expect(rows.map((r) => r.kind)).toEqual(['below', 'plane', 'distance', 'headed'])

    // 14° E is still ahead: its time is the estimate.
    expect(row('below', rows)).toMatchObject({ title: 'Over Bravo', detail: `Passes 35 mi from home at about 8:07${AM}` })

    const plane = row('plane', rows)
    // 450 kt.
    expect(plane).toMatchObject({ icon: 'Airplane', title: 'Boeing 767-300 · N370UP', detail: '36,000 ft · 520 mph', hasWeather: false })
    expect(rowSentence(plane)).toBe('Boeing 767-300 · N370UP. 36,000 ft, 520 mph')

    // 6.875° is 475 mi, of 1,382. No "Averaging about": that's the schedule's speed.
    expect(row('distance', rows)).toMatchObject({
      icon: 'Path', title: '475 mi flown · 907 to go', detail: `Halfway at about 7:35${AM} · like driving the Alaska Highway`,
    })

    // 788 nm to go: the last 120 at 280 kt and the rest at its own 450 is 1 h 55 min, and 7 minutes to the gate.
    expect(row('headed', rows).title).toBe(`Lands E20 about 9:11${AM}`)
  })

  it('while it’s out of sight, say where it was last seen under what’s below, and leave out its height and speed', () => {
    const rows = rowsAt(facts('11:10', { now: '11:20' }), '11:20')
    expect(row('below', rows)).toMatchObject({
      title: 'Over Bravo', detail: `Last seen over Bravo · 10 min ago · Passes 35 mi from home at about 8:07${AM}`,
    })

    // Last seen at 6° E, 21 mi from Testville.
    const byACity = rowsAt(facts('11:03', { now: '11:13' }), '11:13')
    expect(row('below', byACity).detail).toBe(`Last seen near Testville · 10 min ago · Passes 35 mi from home at about 8:07${AM}`)

    // With no place known, when it was last seen leads the row.
    const noPlace = rowsAt(facts('11:10', { now: '11:20', hasStory: false }), '11:20')
    expect(row('below', noPlace)).toMatchObject({ title: 'Last seen 10 min ago', detail: null })

    expect(row('plane', rows)).toMatchObject({ title: 'Boeing 767-300 · N370UP', detail: null })

    // Ten more minutes at 450 kt from 6.875° E is 8.125° E: 561 mi.
    expect(row('distance', rows).title).toBe('561 mi flown · 821 to go')
  })

  it('in a replay, have no height or speed', () => {
    const rows = rowsAt(facts('11:10', { isReplay: true }), '10:35', '11:10')
    // Its height and speed are for now only.
    expect(row('plane', rows)).toMatchObject({ title: 'Boeing 767-300 · N370UP', detail: null })
    expect(row('below', rows).title).toBe('Over Alpha')
    // 2.5° E at 10:35.
    expect(row('distance', rows).title).toBe('173 mi flown · 1,209 to go')
  })

  it('of a flight that has landed, have real times, with no "about"', () => {
    const rows = rowsAt(facts('12:53', { now: '12:56', landed: true, isReplay: true }), '11:00', '12:56')
    expect(row('below', rows).detail).toBe(`Passes 35 mi from home at 8:07${AM}`)
    expect(row('distance', rows).detail).toBe(`Halfway at 7:35${AM} · like driving the Alaska Highway`)
  })

  it('tell the closest point to home where nobody saw it as a best guess, with "about"', () => {
    // Nobody saw it from 13° E to 15° E, where it passed home.
    expect(row('below', rowsAt(facts('12:30', { unseen: [13, 15] }), '12:30')).detail).toBe(`Closest to home was 35 mi at about 8:07${AM}`)
    // Seen all the way, it's told with its real time.
    expect(row('below', rowsAt(facts('12:30'), '12:30')).detail).toBe(`Closest to home was 35 mi at 8:07${AM}`)
  })

  it('show an unknown type as itself in the plane’s row, and leave out what’s missing', () => {
    expect(row('plane', rowsAt(facts('11:10', { typeCode: 'ZZZZ' }), '11:10')).title).toBe('ZZZZ · N370UP')
    expect(row('plane', rowsAt(facts('11:10', { registration: null }), '11:10')).title).toBe('Boeing 767-300')
    // What it has leads the row.
    const neither = row('plane', rowsAt(facts('11:10', { typeCode: null, registration: null }), '11:10'))
    expect(neither).toMatchObject({ title: '36,000 ft · 520 mph', detail: null })
  })

  it('count the miles along a real path that leaves the great circle', () => {
    // Seen as far as 13° E along the dog-leg: 6° along the equator, two climbs of 2.236° each to and from 2° N, 2° along
    // it (1.999°) and 3° more along the equator, 15.471° in all, then 7° to go: 1,069 and 484 of 1,553 mi. The great
    // circle is 1,382.
    const seenUntil = liveTime(13)
    const rows = factRows(factsOf(equatorLiveLeg(equatorLive(seenUntil, { latitude: dogLeg }), seenUntil)), seenUntil, seenUntil)
    expect(row('distance', rows).title).toBe('1,069 mi flown · 484 to go')
  })

  it('at dusk, have the plane’s row before the sky’s, and the sky’s icon from the plane’s own height', () => {
    const leg = duskLeg()
    const theFacts = factsOf(leg, { isReplay: true })
    const sunset = theFacts.sunEvents.dusk?.[0]
    if (sunset?.kind !== 'sunset') throw new Error('no sunset from the cockpit')
    // Half a minute after the sunset seen from 25,000 ft the sun is below that horizon, and still above the one from
    // 35,000 ft: night, from where the plane is.
    const t = sunset.time + 30_000
    expect(sunAltitudeOnLeg(leg, t)).toBeLessThan(cockpitHorizonOnLeg(leg))
    expect(sunAltitudeOnLeg(leg, t)).toBeGreaterThan(COCKPIT_HORIZON)
    const rows = factRows(theFacts, t, t)
    expect(rows.map((r) => r.kind)).toEqual(['below', 'plane', 'sky', 'distance', 'headed'])
    expect(row('sky', rows).icon).toBe('Moon')
  })

  it('with no live data, are the schedule’s, as before', () => {
    const rows = rowsAt(factsOf(equatorLiveLeg(null, at('11:10'))), '11:10')
    // No plane's row.
    expect(rows.map((r) => r.kind)).toEqual(['below', 'distance', 'headed'])
    expect(row('below', rows).title).toBe('Over Bravo, near Testville')
    expect(row('distance', rows)).toMatchObject({
      title: '422 mi flown · 960 to go', detail: `Halfway at 7:45${AM} · Averaging about 460 mph · like driving the Alaska Highway`,
    })
  })
})

describe('the trip so far with a real plane, and whether to credit adsb.lol (Stage 3 spec §8)', () => {
  it('counts the miles along the real path, and lists real times', () => {
    const soFar = tripSoFar(facts('11:10'), at('11:10'))
    expect(soFar.flights[0]?.milestones).toEqual([`Crossed into Bravo · 6:55${AM}`])
    expect(soFar.totals).toBe('Day 1 of 1 · 475 mi')
  })

  it('in a replay, counts as far as the record has the plane', () => {
    const soFar = tripSoFar(facts('11:10', { isReplay: true }), at('10:35'))
    // At 10:35 it hadn't crossed into Bravo yet.
    expect(soFar.flights).toEqual([])
    expect(soFar.totals).toBe('Day 1 of 1 · 173 mi')
  })

  it('lists a crossing nobody saw with "about"', () => {
    expect(tripSoFar(facts('11:10', { unseen: [4, 6.5] }), at('11:10')).flights[0]?.milestones).toEqual([`Crossed into Bravo · about 6:55${AM}`])
  })

  it('shows live data when a flight of the trip has it', () => {
    expect(showsLiveData(facts('11:10'))).toBe(true)
    expect(showsLiveData(factsOf(equatorFlight(0, 20)))).toBe(false)
    expect(showsLiveData(factsOf(equatorLiveLeg(null, at('11:10'))))).toBe(false)
  })
})

describe('the card’s sentence for screen readers with a real plane (Stage 3 spec §9, §15)', () => {
  it('in the air, says what’s below the real plane', () => {
    // It lands at 13:05 by its estimate, where the plan has 13:15.
    expect(cardSummary(facts('11:10'), at('11:10'), 'Alex'))
      .toBe(`TST1 to E20, 10 minutes ahead of schedule, over Bravo. Lands about 9:11${AM} your time. Opens the full map.`)
  })

  it('while it’s out of sight, says "about", what’s below by the plan, and where it was last seen', () => {
    expect(cardSummary(facts('10:50', { now: '11:01' }), at('11:01'), 'Alex')).toBe(
      `TST1 to E20, about 10 minutes ahead of schedule, over Bravo, last seen over Alpha. Lands about 9:11${AM} your time. Opens the full map.`,
    )
    expect(cardSummary(facts('11:03', { now: '11:13' }), at('11:13'), 'Alex')).toBe(
      `TST1 to E20, about 10 minutes ahead of schedule, over Bravo, last seen near Testville. Lands about 9:11${AM} your time. Opens the full map.`,
    )
    expect(cardSummary(facts('11:10', { now: '11:20', hasStory: false }), at('11:20'), 'Alex')).toBe(
      `TST1 to E20, about 10 minutes ahead of schedule, last seen 10 minutes ago. Lands about 9:11${AM} your time. Opens the full map.`,
    )
  })
})

// The website's own: a real plane still on the ground at its departure airport (Todd, 16 Nov 2026)

/** The real plane seen on the ground at `place` at `seenAt`, before it has flown. */
function onTheGround(seenAt: number, place: GeoPoint = { lat: 0, lng: 0 }): LiveFlight {
  return {
    legId: 'eq', callsign: 'TST1', state: 'ground', landedAt: null, trail: [],
    fix: { place, altitudeFt: null, groundSpeedKt: 0, trackDeg: null, onGround: true, registration: 'N370UP', typeCode: 'B763', seenAt },
  }
}

/** The equator flight from Rockford, as the status page hands it on at `now`, with `live` its real plane. */
function fromRockford(live: LiveFlight, now: string): MapLeg {
  const leg = equatorLiveLeg(live, at(now))
  return { ...leg, origin: { ...leg.origin, city: 'Rockford' } }
}

/** The facts with the real plane seen at its gate at `now`, its leg having begun at 10:00 and the plan's takeoff at 10:15. */
const atTheGate = (now: string, options: { geography?: Geography; isReplay?: boolean } = {}) => {
  const leg = fromRockford(onTheGround(at(now)), now)
  return makeTripFacts(flightMap(leg, HOME_BY_THE_EQUATOR), {
    geography: options.geography ?? EQUATOR, comparisons: appComparisons(), viewerTz: NY, h24: false, day: 1, days: 1, isReplay: options.isReplay,
  })
}

describe('a real plane still on the ground at its departure airport (the website’s own, Todd, 16 Nov 2026)', () => {
  it('heads the facts "Still on the ground in Rockford", not what’s below', () => {
    // 20 minutes past the plan's takeoff the schedule's plane is 2° E along, over Alpha. The real one is at the gate.
    const theFacts = atTheGate('10:35')
    expect(headline(theFacts, at('10:35'))).toBe('Still on the ground in Rockford')
    const rows = rowsAt(theFacts, '10:35')
    expect(rows.map((r) => r.kind)).toEqual(['below', 'plane', 'distance', 'headed'])
    expect(row('below', rows).title).toBe('Still on the ground in Rockford')
    expect(row('below', rows).detail).toMatch(/^Passes 35 mi from home at /)
  })

  it('says only what’s to go, as nothing is flown yet', () => {
    expect(row('distance', rowsAt(atTheGate('10:35'), '10:35')).title).toBe('1,382 mi to go')
  })

  it('says so from the moment its leg begins, before the plan’s takeoff', () => {
    expect(headline(atTheGate('10:05'), at('10:05'))).toBe('Still on the ground in Rockford')
  })

  it('leads the headline before a crossing the schedule’s times have it make', () => {
    // A border 1° E along: at 10:28 the schedule's plane, flying the plan's three hours from 10:15 to the live landing,
    // crossed it three minutes ago.
    const border = makeGeography([box('Alpha', 'country', -1, 1), box('Bravo', 'country', 1, 21)], [])
    expect(headline(atTheGate('10:28', { geography: border }), at('10:28'))).toBe('Still on the ground in Rockford')
  })

  it('has a sentence for screen readers that names nothing below it', () => {
    // It lands three hours after the moment it takes off, as if that were now, and 7 minutes later reaches the gate.
    expect(cardSummary(atTheGate('10:35'), at('10:35'), 'Alex'))
      .toBe(`TST1 to E20, still on the ground, 20 minutes behind schedule. Lands about 9:42${AM} your time. Opens the full map.`)
  })

  it('in a replay, reads where the map has the plane: the schedule’s, as it has no record', () => {
    const theFacts = atTheGate('10:35', { isReplay: true })
    expect(headline(theFacts, at('10:35'))).toBe('Over Alpha')
    expect(row('distance', rowsAt(theFacts, '10:35')).title).toBe('138 mi flown · 1,244 to go')
  })

  it('on the ground somewhere else, follows the app: what’s below as far as it was seen flying', () => {
    // A diversion: on the ground at 3° E, never seen in the air, so 0 mi along its path.
    const theFacts = factsOf(equatorLiveLeg(onTheGround(at('10:35'), { lat: 0, lng: 3 }), at('10:35')))
    expect(headline(theFacts, at('10:35'))).toBe('Over Alpha')
    expect(row('distance', rowsAt(theFacts, '10:35')).title).toBe('0 mi flown · 1,382 to go')
  })

  it('landed, follows the app: what’s below the arrival airport, all of it flown', () => {
    // Down at 12:55, and at the gate 7 minutes later.
    const theFacts = facts('12:53', { now: '12:58', landed: true })
    expect(headline(theFacts, at('12:58'))).toBe('Over the Test Sea')
    expect(row('distance', rowsAt(theFacts, '12:58')).title).toBe('1,382 mi flown · 0 to go')
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/copy/facts.test.ts tests/facts/liveTripFacts.test.ts
```

Expected: 20 of the 63 tests fail: the facts don't read the real plane yet, and `showsLiveData` and `stillOnGroundText` aren't there.

- [x] **Step 3: Write the code.**

**In `src/copy/facts.ts`, replace (1 of 2):**

```ts
export const belowWords = (place: Place, city: City | null) => (city ? `Over ${place.name}, near ${city.name}` : `Over ${place.name}`)

```

**with:**

```ts
export const belowWords = (place: Place, city: City | null) => (city ? `Over ${place.name}, near ${city.name}` : `Over ${place.name}`)

/**
 * In place of what's below, a real plane still on the ground at its departure airport once its leg has begun: "Still on
 * the ground in Rockford" (the website's own, Todd, 16 Nov 2026).
 */
export const stillOnGroundText = (city: string) => `Still on the ground in ${city}`

```

**In `src/copy/facts.ts`, replace (2 of 2):**

```ts

/** "Halfway at 4:12 PM", or with the real plane's estimate "Halfway at about 12:05 PM" (Stage 3 spec §8). */
```

**with:**

```ts

/** "2,788 mi to go": a real plane still at its departure airport has flown nothing yet (the website's own, Todd, 16 Nov 2026). */
export const toGoText = (toGo: number) => `${numberText(toGo)} mi to go`

/** "Halfway at 4:12 PM", or with the real plane's estimate "Halfway at about 12:05 PM" (Stage 3 spec §8). */
```

**In `src/facts/tripFacts.ts`, replace (1 of 13):**

```ts
import { belowWords, cockpitCountdown, flightTitle, milestoneHeadline, milestoneLine } from '../copy/facts'
import { longestText, recapChip, recapSummary, soFarText, totalsTiles, type RecapTile } from '../copy/factsTrip'
```

**with:**

```ts
import {
  belowWords, cockpitCountdown, flightTitle, lastSeenLine, milestoneHeadline, milestoneLine, spokenLastSeen, stillOnGroundText,
} from '../copy/facts'
import { longestText, recapChip, recapSummary, soFarText, totalsTiles, type RecapTile } from '../copy/factsTrip'
```

**In `src/facts/tripFacts.ts`, replace (2 of 13):**

```ts
import type { LandingForecast } from '../data/weather'
import type { GeoPoint } from '../map/greatCircle'
import { currentLeg, dayCount, legInMotion, legProgress, positionAtTime, type AirportMark, type MapLeg, type TripMap } from '../map/tripMap'
import { MINUTE } from '../time/zoned'
```

**with:**

```ts
import type { LandingForecast } from '../data/weather'
import { pointAtDistance } from '../map/flightPath'
import type { GeoPoint } from '../map/greatCircle'
import { mapFlightProgress } from '../map/mapFlight'
import { currentLeg, dayCount, legInMotion, type AirportMark, type MapLeg, type TripMap } from '../map/tripMap'
import { MINUTE } from '../time/zoned'
```

**In `src/facts/tripFacts.ts`, replace (3 of 13):**

```ts
import type { TripSoFar } from './factRow'
import { cityNear, type Geography } from './geography'
import { landsWithinHorizon } from './landingWeather'
import { legStory, placeAtFraction, type LegStory } from './legStory'
import { MILESTONE_HEADLINE_MS, milestones, type Milestone } from './milestone'
import { sunEvents, type SunEvent } from './sky'
```

**with:**

```ts
import type { TripSoFar } from './factRow'
import { cityNear, type City, type Geography, type Place } from './geography'
import { landsWithinHorizon } from './landingWeather'
import { hasLiveData, legPath } from './legCourse'
import { legStory, placeAtDistance, type LegStory } from './legStory'
import { MILESTONE_HEADLINE_MS, milestones, type Milestone } from './milestone'
import { legPlane } from './planePosition'
import { sunEvents, type SunEvent } from './sky'
```

**In `src/facts/tripFacts.ts`, replace (4 of 13):**

```ts
 * headline, the trip so far and the card's words here, and the rows in tripFactsRows.ts. Each answer is a lookup in the
 * flights' stories and sun events, so replay and scrubbing need nothing extra (§4.10).
 */
```

**with:**

```ts
 * headline, the trip so far and the card's words here, and the rows in tripFactsRows.ts. Each answer is a lookup in the
 * flights' stories and sun events, so replay and scrubbing need nothing extra (§4.10). A flight with a real plane is read
 * where the real plane is, along the path it really flew (Stage 3 spec §8).
 */
```

**In `src/facts/tripFacts.ts`, replace (5 of 13):**

```ts
  days?: number | null
}
```

**with:**

```ts
  days?: number | null
  /** The moments asked about are a replay's, not now: the full map's clock isn't live. False unless it's said. */
  isReplay?: boolean
}
```

**In `src/facts/tripFacts.ts`, replace (6 of 13):**

```ts
  days: number | null
}
```

**with:**

```ts
  days: number | null
  /**
   * The moments asked about are a replay's, not now: the full map's clock isn't live. A real plane is then where its
   * record has it, and what only its newest fix tells is left out (Stage 3 spec §7.3).
   */
  isReplay: boolean
}
```

**In `src/facts/tripFacts.ts`, replace (7 of 13):**

```ts
 * The route's story: along the great circle, whatever path the plane flew, since another flight on the route shares it.
 * A real path's story, made again as the path grows, is the store's (Stage 3 spec §8; a later task of plan 3C-3).
 */
```

**with:**

```ts
 * The route's story: along the great circle, whatever path the plane flew, since another flight on the route shares it.
 * It's read by distance along the flight's path. A real path's story, made again as the path grows, is the store's
 * (Stage 3 spec §8; a later task of plan 3C-3).
 */
```

**In `src/facts/tripFacts.ts`, replace (8 of 13):**

```ts
    days: options.days ?? null,
  }
```

**with:**

```ts
    days: options.days ?? null,
    isReplay: options.isReplay ?? false,
  }
```

**In `src/facts/tripFacts.ts`, replace (9 of 13):**

```ts

/** "Over Kansas", "Over Québec, near Montréal", from the flight's story. */
export function belowText(facts: TripFacts, leg: MapLeg, t: number): string | null {
  const story = facts.stories[leg.id]
  const place = story ? placeAtFraction(story, legProgress(leg, t)) : null
  if (!place) return null
  return belowWords(place, facts.geography ? cityNear(facts.geography, positionAtTime(leg, t)) : null)
}
```

**with:**

```ts

/**
 * "Over Kansas", "Over Québec, near Montréal", from the flight's story, read where the plane is (Stage 3 spec §8). A real
 * plane that's out of sight is where the plan has it, flying on from the last place it was seen, and reads the same
 * (best guesses design §2).
 */
export function belowText(facts: TripFacts, leg: MapLeg, t: number): string | null {
  const story = facts.stories[leg.id]
  const plane = legPlane(leg, t, facts.isReplay)
  const place = story ? placeAtDistance(story, plane.distance) : null
  if (!place) return null
  return belowWords(place, facts.geography ? cityNear(facts.geography, plane.place) : null)
}

/** What was under the real plane where it was last seen, and the city by it. */
function lastSeenPlace(facts: TripFacts, leg: MapLeg): [place: Place | null, city: City | null] {
  const path = legPath(leg)
  const story = facts.stories[leg.id]
  return [
    story ? placeAtDistance(story, path.flownLength) : null,
    facts.geography ? cityNear(facts.geography, pointAtDistance(path, path.flownLength)) : null,
  ]
}

/** "Last seen near Montréal · 12 min ago", while the real plane is out of sight, or null while it's seen (best guesses design §2). */
export function lastSeenText(facts: TripFacts, leg: MapLeg, t: number): string | null {
  const { unseenFor } = legPlane(leg, t, facts.isReplay)
  return unseenFor == null ? null : lastSeenLine(...lastSeenPlace(facts, leg), unseenFor)
}
```

**In `src/facts/tripFacts.ts`, replace (10 of 13):**

```ts
/**
 * In flight: a milestone from the last 5 minutes, else a cockpit sunrise or sunset in the next 30, else the place below,
 * else the landing countdown (§4.4). Null on the ground and on a drive, where Stage 1B's words stay.
 */
```

**with:**

```ts
/**
 * Whether the real plane of `leg`, the leg between its gates at `t`, is still on the ground at its departure airport.
 * The facts then say so in place of what's below, and count nothing as flown: "Still on the ground in Rockford" (the
 * website's own, Todd, 16 Nov 2026). Now only: a replay reads where the map has the plane, as the app does.
 */
export function isStillOnGround(facts: TripFacts, leg: MapLeg, t: number): boolean {
  return !facts.isReplay && leg.flight != null && mapFlightProgress(leg.flight, t).phase === 'onGround'
}

/** Whether a flight with live data shows, which adsb.lol is credited for (Stage 3 spec §8). */
export const showsLiveData = (facts: TripFacts): boolean => facts.map.legs.some(hasLiveData)

/**
 * In flight: a milestone from the last 5 minutes, else a cockpit sunrise or sunset in the next 30, else the place below,
 * else the landing countdown (§4.4). While the real plane is out of sight they're its best guesses, in the same plain
 * words (best guesses design §2). Null on the ground and on a drive, where Stage 1B's words stay.
 *
 * The website's own (Todd, 16 Nov 2026): a real plane still on the ground at its departure airport is "Still on the
 * ground in Rockford", ahead of all of them. It has crossed nothing yet, whatever the schedule's times say.
 */
```

**In `src/facts/tripFacts.ts`, replace (11 of 13):**

```ts
  if (!leg || leg.kind !== 'flight') return null
  const recent = factsMilestones(facts, leg).filter((m) => m.time <= t && t - m.time < MILESTONE_HEADLINE_MS).pop()
```

**with:**

```ts
  if (!leg || leg.kind !== 'flight') return null
  if (isStillOnGround(facts, leg, t)) return stillOnGroundText(leg.origin.city)
  const recent = factsMilestones(facts, leg).filter((m) => m.time <= t && t - m.time < MILESTONE_HEADLINE_MS).pop()
```

**In `src/facts/tripFacts.ts`, replace (12 of 13):**

```ts
  }
  return { flights, totalsTitle: 'Trip so far', totals: soFarText(totalsSoFar(facts.map, t, facts.sunEvents), facts.day, facts.days) }
}
```

**with:**

```ts
  }
  const totals = totalsSoFar(facts.map, t, facts.sunEvents, facts.isReplay)
  return { flights, totalsTitle: 'Trip so far', totals: soFarText(totals, facts.day, facts.days) }
}
```

**In `src/facts/tripFacts.ts`, replace (13 of 13):**

```ts
    const story = facts.stories[leg.id]
    const place = story ? placeAtFraction(story, legProgress(leg, now)) : null
    // With a real plane, its sentence (Stage 3 spec §9, §15). What's below is still read along the great circle (plan 3C-3).
    const live = liveSummary(leg, now, viewerTz, h24, place?.name ?? null)
    if (live) return `${live} Opens the full map.`
```

**with:**

```ts
    const story = facts.stories[leg.id]
    const plane = legPlane(leg, now, facts.isReplay)
    const place = story ? placeAtDistance(story, plane.distance) : null
    // With a real plane the sentence says how it's doing against the schedule (Stage 3 spec §9), and while it's out of
    // sight, where it was last seen (§15).
    const ago = plane.unseenFor
    const lastSeen = ago == null ? null : spokenLastSeen(...lastSeenPlace(facts, leg), ago)
    const live = liveSummary(leg, now, viewerTz, h24, place?.name ?? null, lastSeen)
    if (live) return `${live} Opens the full map.`
```

**In `src/facts/tripFactsRows.ts`, replace (1 of 9):**

```ts
import {
  averageSpeedText, chaseText, closestToHomeText, cockpitEventText, flownText, flyingInto, groundSunText, halfwayText, landsText, midLine,
  moonText, timeDifferenceText,
} from '../copy/facts'
```

**with:**

```ts
import {
  aircraftText, averageSpeedText, chaseText, closestToHomeText, cockpitEventText, flownText, flyingInto, groundSunText, halfwayText,
  heightAndSpeedText, landsText, midLine, moonText, stillOnGroundText, timeDifferenceText, toGoText,
} from '../copy/facts'
```

**In `src/facts/tripFactsRows.ts`, replace (2 of 9):**

```ts
import { METERS_PER_MILE } from '../map/greatCircle'
import { dayCount, destinationsOf, legDistanceMeters, legInMotion, legProgress, nextFlight, pilotLocation, timeAtFraction, type MapLeg } from '../map/tripMap'
import { HOUR } from '../time/zoned'
```

**with:**

```ts
import { METERS_PER_MILE } from '../map/greatCircle'
import { dayCount, destinationsOf, legDistanceMeters, legInMotion, nextFlight, pilotLocation, type MapLeg } from '../map/tripMap'
import { HOUR } from '../time/zoned'
```

**In `src/facts/tripFactsRows.ts`, replace (3 of 9):**

```ts
import { factRow, type FactRow, type FactRowKind, type FactsAtMoment } from './factRow'
import { roundedMiles } from './milestone'
import { chase, COCKPIT_HORIZON, moonSight, nextGroundSunEvent, sunAltitudeOnLeg } from './sky'
import { belowText, forecastFor, isRecapOver, sheetHeadline, tripSoFar, type TripFacts } from './tripFacts'
import { longestFlight, totalsSoFar, wholeTotals, type TripTotals } from './tripTotals'
```

**with:**

```ts
import { factRow, type FactRow, type FactRowKind, type FactsAtMoment } from './factRow'
import { hasLiveData, isSeenAt, legHalfwayTime, legPathLength, legTimeAtDistance } from './legCourse'
import { roundedMiles } from './milestone'
import { legPlane, type PlanePosition } from './planePosition'
import { chase, cockpitHorizonOnLeg, moonSight, nextGroundSunEvent, sunAltitudeOnLeg } from './sky'
import { belowText, forecastFor, isRecapOver, isStillOnGround, lastSeenText, sheetHeadline, tripSoFar, type TripFacts } from './tripFacts'
import { longestFlight, totalsSoFar, wholeTotals, type TripTotals } from './tripTotals'
```

**In `src/facts/tripFactsRows.ts`, replace (4 of 9):**

```ts
 * they are, the next flight and the trip so far; at home, the trip ahead and its forecast; after a recap's trip, the
 * trip. A row with nothing to say is left out.
 */
```

**with:**

```ts
 * they are, the next flight and the trip so far; at home, the trip ahead and its forecast; after a recap's trip, the
 * trip. A row with nothing to say is left out. A flight with live data has the plane's row second (Stage 3 spec §8).
 */
```

**In `src/facts/tripFactsRows.ts`, replace (5 of 9):**

```ts

function belowRow(facts: TripFacts, leg: MapLeg, t: number): FactRow | null {
  const closest = facts.stories[leg.id]?.closestToHome ?? null
  const closestAt = closest ? timeAtFraction(leg, closest.fraction) : null
  const closestLine = closest && closestAt != null ? closestToHomeText(roundedMiles(closest.meters), closestAt, t, facts.viewerTz, facts.h24) : null
  const place = belowText(facts, leg, t)
  if (place) return factRow('below', 'MapPin', place, [closestLine])
  return closestLine ? factRow('below', 'MapPin', closestLine) : null
}
```

**with:**

```ts

function flightRows(facts: TripFacts, leg: MapLeg, t: number, now: number): FactRow[] {
  const plane = legPlane(leg, t, facts.isReplay)
  return [belowRow(facts, leg, t), planeRow(leg, plane), skyRow(facts, leg, t), distanceRow(facts, leg, plane, t), headedRow(facts, leg, now)]
    .filter(notNull)
}

/**
 * What's below, then where a plane that's out of sight was last seen, then the closest point to home. The first of them
 * that there is leads the row. A real plane still at its departure airport says so in place of what's below (the
 * website's own, Todd, 16 Nov 2026).
 */
function belowRow(facts: TripFacts, leg: MapLeg, t: number): FactRow | null {
  const where = isStillOnGround(facts, leg, t) ? stillOnGroundText(leg.origin.city) : belowText(facts, leg, t)
  const lines = [where, lastSeenText(facts, leg, t), closestToHomeLine(facts, leg, t)].filter(notNull)
  return lines.length > 0 ? factRow('below', 'MapPin', lines[0], lines.slice(1)) : null
}

/**
 * "Passes 40 mi from home at 1:05 PM", or "Closest to home was 40 mi at 1:05 PM" once it's passed. Where nobody saw the
 * real plane it's a best guess, and its time reads "about" (best guesses design §2).
 */
function closestToHomeLine(facts: TripFacts, leg: MapLeg, t: number): string | null {
  const story = facts.stories[leg.id]
  const closest = story?.closestToHome
  if (!story || !closest) return null
  const distance = closest.fraction * story.length
  const time = legTimeAtDistance(leg, distance)
  if (time == null) return null
  return closestToHomeText(roundedMiles(closest.meters), time, t, facts.viewerTz, facts.h24, !isSeenAt(leg, distance))
}

/**
 * The plane's row, for a flight Crewlu Cloud has seen (Stage 3 spec §8): "Boeing 767-300 · N370UP", then "35,000 ft · 540
 * mph" while the plane is seen in the air. Its height and speed are for now only, so a replay and an estimated plane have
 * the first line alone.
 */
function planeRow(leg: MapLeg, plane: PlanePosition): FactRow | null {
  const fix = leg.flight?.live?.fix
  if (!fix) return null
  const flying = plane.isSeenInAir ? heightAndSpeedText(fix.altitudeFt, fix.groundSpeedKt) : null
  const parts = [aircraftText(fix.typeCode, fix.registration), flying].filter(notNull)
  return parts.length > 0 ? factRow('plane', 'Airplane', parts[0], parts.slice(1)) : null
}
```

**In `src/facts/tripFactsRows.ts`, replace (6 of 9):**

```ts
  if (parts.length === 0) return null
  const icon = next ? 'SunHorizon' : sunAltitudeOnLeg(leg, t) > COCKPIT_HORIZON ? 'Sun' : 'Moon'
  return factRow('sky', icon, parts[0], parts.slice(1))
```

**with:**

```ts
  if (parts.length === 0) return null
  const icon = next ? 'SunHorizon' : sunAltitudeOnLeg(leg, t) > cockpitHorizonOnLeg(leg) ? 'Sun' : 'Moon'
  return factRow('sky', icon, parts[0], parts.slice(1))
```

**In `src/facts/tripFactsRows.ts`, replace (7 of 9):**

```ts

function distanceRow(facts: TripFacts, leg: MapLeg, t: number): FactRow {
  const total = miles(leg)
  const flown = Math.round(total * legProgress(leg, t))
  const halfwayAt = timeAtFraction(leg, 0.5)
  const window = airborneWindow(leg.start, leg.end)
  return factRow('distance', 'Path', flownText(flown, Math.round(total) - flown), [
    halfwayAt != null && halfwayAt > t ? halfwayText(halfwayAt, facts.viewerTz, facts.h24) : null,
    window ? averageSpeedText(total / ((window.end - window.start) / HOUR)) : null,
```

**with:**

```ts

/**
 * "1,140 mi flown · 3,010 to go": flown along the path so far, and to go along the rest of it, which for a real plane is
 * the great circle from where it is to the arrival airport (Stage 3 spec §8). A real plane still at its departure airport
 * has flown nothing yet: "2,788 mi to go" (the website's own, Todd, 16 Nov 2026).
 */
function distanceRow(facts: TripFacts, leg: MapLeg, plane: PlanePosition, t: number): FactRow {
  const length = legPathLength(leg)
  const total = length / METERS_PER_MILE
  const flown = Math.round(plane.distance / METERS_PER_MILE)
  const halfwayAt = legHalfwayTime(leg)
  // The schedule's speed is told only of a flight with no live data: a real plane's row has its own.
  const window = hasLiveData(leg) ? null : airborneWindow(leg.start, leg.end)
  const title = isStillOnGround(facts, leg, t) ? toGoText(Math.round(total)) : flownText(flown, Math.round(total) - flown)
  return factRow('distance', 'Path', title, [
    halfwayAt != null && halfwayAt > t ? halfwayText(halfwayAt, facts.viewerTz, facts.h24, !isSeenAt(leg, length / 2)) : null,
    window ? averageSpeedText(total / ((window.end - window.start) / HOUR)) : null,
```

**In `src/facts/tripFactsRows.ts`, replace (8 of 9):**

```ts
function tripSoFarRow(facts: TripFacts, t: number): FactRow | null {
  const line = soFarText(totalsSoFar(facts.map, t, facts.sunEvents), facts.day, facts.days)
  return line ? factRow('tripSoFar', 'ChartBar', 'Trip so far', [line]) : null
```

**with:**

```ts
function tripSoFarRow(facts: TripFacts, t: number): FactRow | null {
  const line = soFarText(totalsSoFar(facts.map, t, facts.sunEvents, facts.isReplay), facts.day, facts.days)
  return line ? factRow('tripSoFar', 'ChartBar', 'Trip so far', [line]) : null
```

**In `src/facts/tripFactsRows.ts`, replace (9 of 9):**

```ts
    if (leg.kind !== 'flight') return [tripSoFarRow(facts, t)].filter(notNull)
    return [belowRow(facts, leg, t), skyRow(facts, leg, t), distanceRow(facts, leg, t), headedRow(facts, leg, now)].filter(notNull)
  }
```

**with:**

```ts
    if (leg.kind !== 'flight') return [tripSoFarRow(facts, t)].filter(notNull)
    return flightRows(facts, leg, t, now)
  }
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 63 tests pass. Then `npx tsc --noEmit`: nothing; and `npm test`: 172 test files and 3,536 tests pass.

- [x] **Step 5: Commit, on Todd's yes (after batch B's checkpoint).**

```bash
git add src/copy/facts.ts src/facts/tripFacts.ts src/facts/tripFactsRows.ts tests/copy/facts.test.ts tests/facts/liveTripFacts.test.ts
git commit -m "The facts' headline, rows and card sentence from the real plane, with its own row, the miles along its path, and a plane still at its gate told as on the ground (Stage 3 spec §8, §9, §15)"
```

---

### Task 7: The store

A flight with a real path gets its own story along that path, kept by its leg's id and made again as the path grows, but no oftener than once a minute, with its sun events made with it and kept until the next, so nothing blinks at a new landing estimate (`src/facts/factsStore.ts`). The website has no wait like the app's: a real path's first story is made at once. The status page owns one store, which the card and the full map share. A flight with no real path keeps today's caches.

**Files:**
- Create: `src/facts/factsStore.ts`
- Modify: `src/facts/tripFacts.ts`, `src/ui/PilotPages.tsx`
- Test: `tests/facts/factsStore.test.ts`, `tests/facts/tripFacts.test.ts`, `tests/ui/factsStorePage.test.tsx`

- [x] **Step 1: Write the tests.**

**Create `tests/facts/factsStore.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { makeFactsStore, pathKey, PATHS_KEPT, type FactsStore } from '../../src/facts/factsStore'
import type { Geography } from '../../src/facts/geography'
import { legPathLength } from '../../src/facts/legCourse'
import { makeTripFacts, type TripFacts } from '../../src/facts/tripFacts'
import type { LiveFlight } from '../../src/map/liveFlight'
import { makeMapFlight, mapFlightProgress } from '../../src/map/mapFlight'
import { airportMark, legDistanceMeters, type AirportMark, type MapLeg, type TripMap } from '../../src/map/tripMap'
import { AIRPORTS } from '../map/tripMapLegs'
import { EQUATOR, equatorFlight, EQUINOX, flightMap } from './factsTestData'
import { dogLeg, equatorLive, equatorLiveLeg, HOME_BY_THE_EQUATOR, liveTime } from './liveFacts'

/**
 * Keeping each flight's story and sun events between renders (Stage 2 spec §3.2, Stage 3 spec §8), as the app's
 * LegStoryStoreTests at 6d3e74e. The website works the facts out on each render, so what the app's `prepare` waits for
 * is here what a later render makes: a real path's story is made at once the first time, and again as the path grows,
 * no oftener than once a minute by the store's clock. The made-up real plane is liveFacts': a degree of longitude every
 * 8 minutes from 10:15 UTC, seen every 2 minutes (a quarter of a degree).
 */

const NY = 'America/New_York'
const HOUR = 3_600_000

/** A store whose clock the test moves by hand, from the equinox, as the app's TestClock. */
function storeWithClock(): { store: FactsStore; later: (seconds: number) => void } {
  const clock = { now: EQUINOX }
  return { store: makeFactsStore(() => clock.now), later: (seconds) => (clock.now += seconds * 1000) }
}

/** The facts of `map` as the page asks for them, with `store` keeping what it can. */
function factsFor(store: FactsStore | null, map: TripMap, { geography = EQUATOR, isReplay = false }: { geography?: Geography | null; isReplay?: boolean } = {}): TripFacts {
  return makeTripFacts(map, { geography, comparisons: null, viewerTz: NY, h24: false, store, isReplay })
}

/** The equator flight alone, with a real plane that left the great circle and was last seen at `longitude`° E. */
function liveMap(longitude: number, { altitudeFt = 36_000, id = 'eq', home = null }: { altitudeFt?: number; id?: string; home?: AirportMark | null } = {}): TripMap {
  const seenUntil = liveTime(longitude)
  return flightMap(equatorLiveLeg(equatorLive(seenUntil, { altitudeFt, latitude: dogLeg }), seenUntil, { id }), home)
}

/** The length of the path of the map's one flight. */
const lengthOf = (map: TripMap) => legPathLength(map.legs[0])

/**
 * The equator flight seven hours later, into the evening: the real plane and the schedule's each see the sun set, at
 * different times. With `longitude`, the real plane was last seen there; without, its live data is gone.
 */
function eveningMap(longitude: number | null): TripMap {
  const evening = 7 * HOUR
  const seenUntil = liveTime(longitude ?? 13)
  const flown = equatorLive(seenUntil)
  const live: LiveFlight | null = longitude == null ? null : {
    ...flown,
    fix: flown.fix && { ...flown.fix, seenAt: flown.fix.seenAt + evening },
    trail: flown.trail.map((p) => ({ ...p, time: p.time + evening })),
  }
  const scheduled = equatorFlight(0, 20, EQUINOX + evening)
  const flight = makeMapFlight(scheduled.start, scheduled.end, scheduled.origin.place, scheduled.destination.place, live)
  if (!flight) throw new Error('The evening flight has no plan')
  const progress = mapFlightProgress(flight, seenUntil + evening)
  return flightMap({ ...scheduled, start: progress.start, end: progress.end, flight }, null)
}

describe('the store: a flight on the schedule (Stage 2 spec §3.2)', () => {
  it('keeps the route’s story at a new delay, and has the new times’ sun events at once: they never vanish', () => {
    // Overnight from Louisville to Cologne: the cockpit sees the sun rise.
    const store = makeFactsStore()
    const night = (delay: number): TripMap => {
      const start = Date.parse('2026-11-13T23:00:00Z') + delay
      const leg: MapLeg = { id: 'night', kind: 'flight', origin: airportMark('SDF', AIRPORTS)!, destination: airportMark('CGN', AIRPORTS)!, start, end: start + 8 * HOUR, flightNumber: 'UPS207' }
      return flightMap(leg, null)
    }
    const onTime = factsFor(store, night(0))
    const sunrise = onTime.sunEvents.night?.[0]
    expect(sunrise?.kind).toBe('sunrise')

    const delayed = factsFor(store, night(1.5 * HOUR))
    expect(delayed.stories.night).toBe(onTime.stories.night)
    expect(delayed.sunEvents.night?.[0]?.kind).toBe('sunrise')
    expect(delayed.sunEvents.night?.[0]?.time).not.toBe(sunrise?.time)
  })
})

describe('the store: a real path (Stage 3 spec §8)', () => {
  it('makes a real path a story of its own, along the path, at once', () => {
    const { store } = storeWithClock()
    const map = liveMap(13)
    const facts = factsFor(store, map)
    expect(facts.stories.eq?.length).toBe(lengthOf(map))
    expect(facts.stories.eq?.length).toBeGreaterThan(legDistanceMeters(map.legs[0]))
    expect(facts.sunEvents.eq).toBeDefined()
  })

  it('keeps the story and the sun events it has while the path grows within a minute, then makes them again', () => {
    const { store, later } = storeWithClock()
    const first = factsFor(store, liveMap(8))
    const grown = liveMap(8.25)
    expect(lengthOf(grown)).not.toBe(lengthOf(liveMap(8)))

    // A new place 20 seconds later: what it has shows meanwhile.
    later(20)
    expect(factsFor(store, grown).stories.eq).toBe(first.stories.eq)
    expect(factsFor(store, grown).sunEvents.eq).toBe(first.sunEvents.eq)
    later(39.999)
    expect(factsFor(store, grown).stories.eq).toBe(first.stories.eq)

    // The minute is out.
    later(0.001)
    const again = factsFor(store, grown)
    expect(again.stories.eq?.length).toBe(lengthOf(grown))
    expect(again.sunEvents.eq).not.toBe(first.sunEvents.eq)
  })

  it('makes the story at once when the path grows a minute later', () => {
    const { store, later } = storeWithClock()
    factsFor(store, liveMap(8))
    later(60)
    const grown = liveMap(9)
    expect(factsFor(store, grown).stories.eq?.length).toBe(lengthOf(grown))
  })

  it('counts the minute from the story it has, so a path that keeps growing still has a new one each minute', () => {
    const { store, later } = storeWithClock()
    const first = factsFor(store, liveMap(8))
    later(20)
    expect(factsFor(store, liveMap(8.25)).stories.eq).toBe(first.stories.eq)

    // The path changes again: still the story it had, and the next is a minute after it, not after this change.
    later(10)
    const grownAgain = liveMap(8.5)
    expect(factsFor(store, grownAgain).stories.eq).toBe(first.stories.eq)
    later(30)
    const second = factsFor(store, grownAgain).stories.eq
    expect(second?.length).toBe(lengthOf(grownAgain))

    // And the minute after that is counted from this one.
    later(20)
    const grownOnceMore = liveMap(8.75)
    expect(factsFor(store, grownOnceMore).stories.eq).toBe(second)
    later(40)
    expect(factsFor(store, grownOnceMore).stories.eq?.length).toBe(lengthOf(grownOnceMore))
  })

  it('makes nothing for the same path again', () => {
    const { store, later } = storeWithClock()
    const first = factsFor(store, liveMap(8))
    later(5)
    const again = factsFor(store, liveMap(8))
    expect(again.stories.eq).toBe(first.stories.eq)
    expect(again.sunEvents.eq).toBe(first.sunEvents.eq)
    later(120)
    expect(factsFor(store, liveMap(8)).stories.eq).toBe(first.stories.eq)
  })

  it('shows a real path’s sun events until the next are made, so nothing blinks at a new landing estimate', () => {
    const { store, later } = storeWithClock()
    const sunEvents = factsFor(store, eveningMap(13)).sunEvents.eq
    expect(sunEvents?.map((e) => e.kind)).toEqual(['sunset'])

    later(20)
    expect(factsFor(store, eveningMap(13.25)).sunEvents.eq).toBe(sunEvents)
    later(40)
    const next = factsFor(store, eveningMap(13.25)).sunEvents.eq
    expect(next).not.toBe(sunEvents)
    expect(next?.map((e) => e.kind)).toEqual(['sunset'])
  })

  it('gives a flight back on the schedule its route’s story again, and a real path that comes back its own at once', () => {
    // Its live data is gone, as after Disconnect: the leg flies the great circle again.
    const { store, later } = storeWithClock()
    factsFor(store, liveMap(8))
    const leg = equatorFlight(0, 20)
    expect(factsFor(store, flightMap(leg, null)).stories.eq?.length).toBe(legDistanceMeters(leg))

    // Seen again 5 seconds later, a place further on: a flight newly seen, whose story isn't held up by the one before.
    later(5)
    const back = liveMap(8.25)
    expect(lengthOf(back)).not.toBe(lengthOf(liveMap(8)))
    expect(factsFor(store, back).stories.eq?.length).toBe(lengthOf(back))
  })

  it('gives a flight back on its real path, after a turn on the schedule, its own sun events again, at once', () => {
    const { store, later } = storeWithClock()
    const real = factsFor(store, eveningMap(13)).sunEvents.eq
    expect(real?.map((e) => e.kind)).toEqual(['sunset'])

    const planned = factsFor(store, eveningMap(null)).sunEvents.eq
    expect(planned?.[0]?.time).not.toBe(real?.[0]?.time)

    later(5)
    expect(factsFor(store, eveningMap(13)).sunEvents.eq).toEqual(real)
  })

  it('doesn’t hold a story up when the clock was set back', () => {
    // The clock goes back five minutes. The last story now looks as if it were made in the future.
    const { store, later } = storeWithClock()
    factsFor(store, liveMap(8))
    later(-300)
    const grown = liveMap(8.25)
    expect(factsFor(store, grown).stories.eq?.length).toBe(lengthOf(grown))
  })

  it('makes a real path’s story at once when the geography comes, or home changes, whatever the minute', () => {
    const { store, later } = storeWithClock()
    const before = factsFor(store, liveMap(8), { geography: null })
    expect(before.stories.eq).toBeUndefined()
    expect(before.sunEvents.eq).toBeDefined()

    later(5)
    const grown = liveMap(8.25)
    expect(factsFor(store, grown).stories.eq?.length).toBe(lengthOf(grown))
    expect(factsFor(store, grown).stories.eq?.closestToHome).toBeNull()

    // Home by the equator, which the path passes 35 mi from once it's back on the equator by 10° E.
    later(5)
    expect(factsFor(store, liveMap(8.25, { home: HOME_BY_THE_EQUATOR })).stories.eq?.closestToHome).not.toBeNull()
  })

  it('hides a story while there’s no geography, and shows it again when it’s back', () => {
    const { store, later } = storeWithClock()
    const first = factsFor(store, liveMap(8))
    later(5)
    expect(factsFor(store, liveMap(8), { geography: null }).stories.eq).toBeUndefined()
    later(5)
    expect(factsFor(store, liveMap(8)).stories.eq).toBe(first.stories.eq)
  })

  it('without a store, has each real path’s own facts, made afresh', () => {
    const grown = liveMap(8.25)
    factsFor(null, liveMap(8))
    expect(factsFor(null, grown).stories.eq?.length).toBe(lengthOf(grown))
  })

  it('forgets old flights’ paths, but never one on the map it’s asked about', () => {
    const { store, later } = storeWithClock()
    // It keeps up to PATHS_KEPT flights, and then starts again from the one asked about.
    for (let i = 0; i < 3 * PATHS_KEPT; i++) {
      factsFor(store, liveMap(8, { id: `eq${i}` }))
      expect(store.paths.size).toBe(i < PATHS_KEPT ? i + 1 : ((i - PATHS_KEPT) % PATHS_KEPT) + 1)
    }

    // A trip with more flights than that keeps every one of them.
    const legs = Array.from({ length: PATHS_KEPT + 2 }, (_, i) => liveMap(8, { id: `trip${i}` }).legs[0])
    const trip: TripMap = { ...flightMap(legs[0], null), legs }
    const first = factsFor(store, trip)
    expect(store.paths.size).toBe(PATHS_KEPT + 2)
    later(5)
    const again = factsFor(store, trip)
    for (const leg of legs) expect(again.stories[leg.id]).toBe(first.stories[leg.id])
  })

  it('hands on whether it’s a replay', () => {
    const { store } = storeWithClock()
    expect(factsFor(store, liveMap(8)).isReplay).toBe(false)
    expect(factsFor(store, liveMap(8), { isReplay: true }).isReplay).toBe(true)
  })
})

describe('the store’s key for a real path (Stage 3 spec §8)', () => {
  it('changes when a real path grows, or its sky is seen from another height', () => {
    const key = pathKey(liveMap(8).legs[0])
    expect(key).toBe(pathKey(liveMap(8).legs[0]))
    expect(key).not.toBe(pathKey(liveMap(8.25).legs[0]))
    expect(key).not.toBe(pathKey(liveMap(8, { altitudeFt: 38_000 }).legs[0]))
  })

  it('changes with a new landing estimate, from the same places seen', () => {
    // Early in the flight, before the plane's own speed is known, a later arrival on the schedule moves the estimate.
    const live = equatorLive(liveTime(1))
    const scheduled = equatorFlight(0, 20)
    const arrivingAt = (arrival: number): MapLeg => {
      const flight = makeMapFlight(scheduled.start, arrival, scheduled.origin.place, scheduled.destination.place, live)
      if (!flight) throw new Error('No plan')
      return { ...scheduled, flight }
    }
    expect(pathKey(arrivingAt(scheduled.end))).not.toBe(pathKey(arrivingAt(scheduled.end + 30 * 60_000)))
  })

  it('is only for a flight with a real path', () => {
    expect(pathKey(equatorFlight(0, 20))).toBeNull()
    expect(pathKey(equatorLiveLeg(null, EQUINOX))).toBeNull()
    expect(pathKey(liveMap(8).legs[0])).not.toBeNull()
  })
})
```

**In `tests/facts/tripFacts.test.ts`, replace (1 of 3):**

```ts
import { makeGeography, type Geography } from '../../src/facts/geography'
import {
```

**with:**

```ts
import { makeGeography, type Geography } from '../../src/facts/geography'
import { legPathLength } from '../../src/facts/legCourse'
import {
```

**In `tests/facts/tripFacts.test.ts`, replace (2 of 3):**

```ts

  it('keeps the route’s story, along the great circle, for a flight with a real path', () => {
    // A story is kept by route, which another flight on that route shares: a real path's story, made again as the path
    // grows, is the store's (a later task of plan 3C-3). Charlie is north of Bravo, where only the real path goes.
    const seenUntil = liveTime(13)
```

**with:**

```ts

  it('makes a flight with a real path a story of its own, along the path it flew', () => {
    // Not the route's, along the great circle (Stage 3 spec §8; factsStore.test.ts has how it's kept). Charlie is north
    // of Bravo, where only the real path goes.
    const seenUntil = liveTime(13)
```

**In `tests/facts/tripFacts.test.ts`, replace (3 of 3):**

```ts
    const facts = makeTripFacts(flightMap(real, null), { geography, comparisons: null, viewerTz: NY, h24: false })
    expect(facts.stories.eq.stretches.map((s) => s.place.name)).toEqual(['Alpha', 'Bravo', 'the Test Sea'])
  })
```

**with:**

```ts
    const facts = makeTripFacts(flightMap(real, null), { geography, comparisons: null, viewerTz: NY, h24: false })
    expect(facts.stories.eq.stretches.map((s) => s.place.name)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Bravo', 'the Test Sea'])
    expect(facts.stories.eq.length).toBe(legPathLength(real))
  })
```

**Create `tests/ui/factsStorePage.test.tsx`:**

```tsx
// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTripFacts } from '../../src/facts/tripFacts'
import type { ScheduleHandle } from '../../src/ui/hooks/useSchedule'
import { PilotPages } from '../../src/ui/PilotPages'
import { FLYING, LIVE_AIRPORTS, SCHEDULE } from '../map/liveTrip'
import { MINUTE, START } from '../map/madeUpFlights'

/**
 * The page owns one store for the facts (Stage 3 spec §8), as the app's status screen owns its LegStoryStore: a real
 * path's story and sun events are kept from one render to the next, and made again at most once a minute.
 */

vi.mock('../../src/facts/tripFacts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/facts/tripFacts')>()
  return { ...original, makeTripFacts: vi.fn(original.makeTripFacts) }
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(START + 59 * MINUTE)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  localStorage.clear()
})

const handle: ScheduleHandle = { schedule: SCHEDULE, lastSuccessAt: START, problem: null, refreshing: false, refresh: () => {} }

describe('the facts’ store on the status page (Stage 3 spec §8)', () => {
  it('hands the same store to the facts at every render', () => {
    vi.mocked(makeTripFacts).mockClear()
    render(<PilotPages schedule={handle} airports={LIVE_AIRPORTS} demo={false} onLeave={() => {}}
      live={{ flights: new Map([['f1', FLYING]]), clockOffset: 0 }} loadWeather={async () => null} />)
    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    const stores = vi.mocked(makeTripFacts).mock.calls.map(([, options]) => options.store)
    expect(stores.length).toBeGreaterThan(1)
    expect(stores[0]).toBeTruthy()
    for (const store of stores) expect(store).toBe(stores[0])
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/facts/factsStore.test.ts tests/facts/tripFacts.test.ts tests/ui/factsStorePage.test.tsx
```

Expected: the store's tests can't load (there's no `src/facts/factsStore`), and 2 of the other 14 fail: a real path's story isn't its own yet.

- [x] **Step 3: Write the code.**

**Create `src/facts/factsStore.ts`:**

```ts
import type { AirportMark, MapLeg, TripMap } from '../map/tripMap'
import { MINUTE } from '../time/zoned'
import type { Geography } from './geography'
import { legStory, type LegStory } from './legStory'
import { cockpitHorizonOnLeg, sunEvents, type SunEvent } from './sky'

/**
 * The facts kept for each flight with a real path between renders (Stage 3 spec §8), as the app's LegStoryStore keeps
 * them. The page owns one store and hands it to every TripFacts it makes, so the card and the full map read the same.
 * - A flight with a real path has a story of its own, along that path, by its leg's id, and its sun events with it.
 * - They're made again when the path changes, but no oftener than once a minute by the store's clock: meanwhile, what
 *   the flight has shows, so the sky row and the trip's sunset count don't blink at each new landing estimate.
 * - The first are made at once: the website works the facts out as it draws them, so there's no wait for them, and the
 *   route's story never has to stand in.
 * A flight with no real path keeps the route's story and its sun events by its times, tripFacts.ts's caches as before.
 */

/** A flight with a real path gets its story again no sooner than this after the last one was made (Stage 3 spec §8). */
export const PATH_STORY_INTERVAL_MS = MINUTE

/** More flights kept than this, and those not on the map asked about are forgotten. */
export const PATHS_KEPT = 20

/** A flight's story and sun events along its real path, and what they were made from. */
export interface PathFacts {
  /** The path's key (`pathKey`) when they were made. */
  key: string
  /** When they were made, by the store's clock. */
  madeAt: number
  /** The geography and home the story was made with: another is a story made afresh, at once. */
  geography: Geography | null
  home: string
  /** Null when there was no geography to make it with. */
  story: LegStory | null
  sunEvents: SunEvent[]
}

export interface FactsStore {
  /** This browser's clock, in epoch ms. Tests hand in their own. */
  now: () => number
  /** By leg id. */
  paths: Map<string, PathFacts>
}

export const makeFactsStore = (now: () => number = () => Date.now()): FactsStore => ({ now, paths: new Map() })

/**
 * What tells one state of a flight's real path from the next, or null for a flight without one: the places it was
 * seen, its landing, real or estimated, and the height its sky is seen from. Its story and its sun events are made
 * from these, so they're made again when it changes.
 */
export function pathKey(leg: MapLeg): string | null {
  const record = leg.flight?.record
  if (!record) return null
  const { path } = record
  return [leg.id, path.knots.length, path.flownLength, path.length, path.hasLanded, record.touchdown, cockpitHorizonOnLeg(leg)].join('|')
}

const homeKey = (home: AirportMark | null) => (home ? `${home.code}|${home.place.lat},${home.place.lng}` : '')

/**
 * Whether `kept` must be made again for the path whose key is `key`, at `now`: it was made for another geography or
 * home while there's one to make a story with, or the path changed and its facts weren't made in the last minute. A
 * clock that was set back doesn't hold them up: only facts made in the last minute do.
 */
function isStale(kept: PathFacts, key: string, geography: Geography | null, home: string, now: number): boolean {
  if (geography && (kept.geography !== geography || kept.home !== home)) return true
  if (kept.key === key) return false
  const age = now - kept.madeAt
  return !(age >= 0 && age < PATH_STORY_INTERVAL_MS)
}

/**
 * The story and sun events of `leg` along its real path, or null for a flight without one, which reads the route's.
 * With `store`, what it has is kept and remade by the rules above. Without, as in the tests, they're made afresh. The
 * story is left out while there's no geography (Stage 2 spec §3.3).
 */
export function realPathFacts(
  store: FactsStore | null, leg: MapLeg, geography: Geography | null, home: AirportMark | null,
): { story: LegStory | null; sunEvents: SunEvent[] } | null {
  const key = pathKey(leg)
  if (key == null) {
    // Back on the schedule, as when its live data goes: should a real path come back, its facts are made afresh, at once.
    store?.paths.delete(leg.id)
    return null
  }
  const now = store ? store.now() : 0
  let kept = store?.paths.get(leg.id)
  if (!kept || isStale(kept, key, geography, homeKey(home), now)) {
    kept = {
      key, madeAt: now, geography, home: homeKey(home), story: geography ? legStory(leg, geography, home) : null, sunEvents: sunEvents(leg),
    }
    store?.paths.set(leg.id, kept)
  }
  return { story: geography ? kept.story : null, sunEvents: kept.sunEvents }
}

/** Keeps `store` small: once it holds more than PATHS_KEPT flights, it forgets those `map` doesn't have. */
export function forgetOldPaths(store: FactsStore, map: TripMap): void {
  if (store.paths.size <= PATHS_KEPT) return
  const onMap = new Set(map.legs.map((l) => l.id))
  for (const id of [...store.paths.keys()]) if (!onMap.has(id)) store.paths.delete(id)
}
```

**In `src/facts/tripFacts.ts`, replace (1 of 6):**

```ts
import type { TripSoFar } from './factRow'
import { cityNear, type City, type Geography, type Place } from './geography'
```

**with:**

```ts
import type { TripSoFar } from './factRow'
import { forgetOldPaths, realPathFacts, type FactsStore } from './factsStore'
import { cityNear, type City, type Geography, type Place } from './geography'
```

**In `src/facts/tripFacts.ts`, replace (2 of 6):**

```ts
  isReplay?: boolean
}
```

**with:**

```ts
  isReplay?: boolean
  /**
   * Where a real path's story and sun events are kept between renders, made again at most once a minute as the path
   * grows (Stage 3 spec §8). The page owns one. Without it, as in the tests, they're made afresh each time.
   */
  store?: FactsStore | null
}
```

**In `src/facts/tripFacts.ts`, replace (3 of 6):**

```ts
/**
 * The route's story: along the great circle, whatever path the plane flew, since another flight on the route shares it.
 * It's read by distance along the flight's path. A real path's story, made again as the path grows, is the store's
 * (Stage 3 spec §8; a later task of plan 3C-3).
 */
```

**with:**

```ts
/**
 * The route's story, along the great circle, for a flight with no real path: another flight on the route shares it. A
 * real path's story is factsStore.ts's (Stage 3 spec §8).
 */
```

**In `src/facts/tripFacts.ts`, replace (4 of 6):**

```ts

/** The facts for `map`: each flight's story, once the geography has loaded, and its sun events. */
export function makeTripFacts(map: TripMap, options: FactsOptions): TripFacts {
```

**with:**

```ts

/**
 * The facts for `map`: each flight's story, once the geography has loaded, and its sun events. A flight with a real
 * path has its own, from the store; any other, the route's story and its times' sun events.
 */
export function makeTripFacts(map: TripMap, options: FactsOptions): TripFacts {
```

**In `src/facts/tripFacts.ts`, replace (5 of 6):**

```ts
  const events: SunEventsByLeg = {}
  for (const leg of map.legs) {
    if (leg.kind !== 'flight') continue
    if (options.geography) legStories[leg.id] = storyOf(leg, options.geography, map.home)
```

**with:**

```ts
  const events: SunEventsByLeg = {}
  const store = options.store ?? null
  for (const leg of map.legs) {
    if (leg.kind !== 'flight') continue
    const real = realPathFacts(store, leg, options.geography, map.home)
    if (real) {
      if (real.story) legStories[leg.id] = real.story
      events[leg.id] = real.sunEvents
      continue
    }
    if (options.geography) legStories[leg.id] = storyOf(leg, options.geography, map.home)
```

**In `src/facts/tripFacts.ts`, replace (6 of 6):**

```ts
  }
  return {
```

**with:**

```ts
  }
  if (store) forgetOldPaths(store, map)
  return {
```

**In `src/ui/PilotPages.tsx`, replace (1 of 2):**

```tsx
} from '../data/weather'
import { makeTripFacts } from '../facts/tripFacts'
```

**with:**

```tsx
} from '../data/weather'
import { makeFactsStore } from '../facts/factsStore'
import { makeTripFacts } from '../facts/tripFacts'
```

**In `src/ui/PilotPages.tsx`, replace (2 of 2):**

```tsx
  const forecasts = useLandingWeather(mapOpen ? tripMap : null, now, unit, loadLanding)
  const facts = tripMap && snap
    ? makeTripFacts(tripMap, { geography, comparisons, forecasts, viewerTz, h24, day: snap.tripProgress?.day ?? null, days: snap.tripProgress?.days ?? null })
    : null
```

**with:**

```tsx
  const forecasts = useLandingWeather(mapOpen ? tripMap : null, now, unit, loadLanding)
  // One store for every facts this page makes, so a real path's story is kept between renders (Stage 3 spec §8).
  const factsStore = useMemo(() => makeFactsStore(), [])
  const facts = tripMap && snap
    ? makeTripFacts(tripMap, {
      geography, comparisons, forecasts, viewerTz, h24, day: snap.tripProgress?.day ?? null, days: snap.tripProgress?.days ?? null, store: factsStore,
    })
    : null
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 32 tests pass. Then `npx tsc --noEmit`: nothing; and `npm test`: 174 test files and 3,556 tests pass.

- [x] **Step 5: Batch B's review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Tasks 6 and 7, the facts and their store, against the spec's §8, §9 and §15, the best guesses design's §2 and §3, the app at `6d3e74e`, and this plan's list of where the website settles or differs. Make its fixes, rerun each task's tests, and record what it found under "Changes made during execution".

- [x] **Step 6: Batch B's checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test
```

Expected: 174 test files and 3,556 tests pass.

- [x] **Step 7: Commit, on Todd's yes.** Task 6's commit first. Where two tasks of this batch change one file (`src/facts/tripFacts.ts`: Tasks 6, 7), each commit takes the file as its own task left it (ground rule 10). Then:

```bash
git add src/facts/factsStore.ts src/facts/tripFacts.ts src/ui/PilotPages.tsx tests/facts/factsStore.test.ts tests/facts/tripFacts.test.ts tests/ui/factsStorePage.test.tsx
git commit -m "A real path's story kept by its flight, made again as the path grows no oftener than once a minute, with sun events that don't blink (Stage 3 spec §8)"
```

---

### Task 8: The views: the credit, and a replay's facts

"Live position: adsb.lol" shows in the facts' footer whenever a flight of the trip has live data, under "Estimated from the schedule" and beside the weather's credit, and as a sentence for screen readers. It isn't on the status page's card (Todd, 15 Nov 2026). The full map's facts at a moment of the replay are the replay's, made with the same store.

**Files:**
- Modify: `src/facts/factRow.ts`, `src/facts/tripFactsRows.ts`, `src/ui/FactsBody.tsx`, `src/ui/FactsFooter.tsx`, `src/ui/PilotPages.tsx`, `src/ui/TripMapPage.tsx`
- Test: `tests/facts/liveTripFacts.test.ts`, `tests/ui/FactsBody.test.tsx`, `tests/ui/TripMapPage.test.tsx`, `tests/ui/liveMapFacts.test.tsx`

- [x] **Step 1: Write the tests.**

**In `tests/facts/liveTripFacts.test.ts`, replace (1 of 2):**

```ts
import { makeGeography, type Geography } from '../../src/facts/geography'
import { COCKPIT_HORIZON, cockpitHorizonOnLeg, sunAltitudeOnLeg } from '../../src/facts/sky'
import { cardSummary, headline, makeTripFacts, showsLiveData, tripSoFar, type TripFacts } from '../../src/facts/tripFacts'
import { factRows } from '../../src/facts/tripFactsRows'
import type { GeoPoint } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { makeMapFlight, mapFlightProgress } from '../../src/map/mapFlight'
```

**with:**

```ts
import { makeGeography, type Geography } from '../../src/facts/geography'
import { COCKPIT_HORIZON, cockpitHorizonOnLeg, sunAltitudeOnLeg } from '../../src/facts/sky'
import { cardSummary, headline, makeTripFacts, showsLiveData, tripSoFar, type TripFacts } from '../../src/facts/tripFacts'
import { factRows, factsAtMoment } from '../../src/facts/tripFactsRows'
import type { GeoPoint } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { makeMapFlight, mapFlightProgress } from '../../src/map/mapFlight'
```

**In `tests/facts/liveTripFacts.test.ts`, replace (2 of 2):**

```ts
    expect(row('distance', rowsAt(theFacts, '12:58')).title).toBe('1,382 mi flown · 0 to go')
  })
})
```

**with:**

```ts
    expect(row('distance', rowsAt(theFacts, '12:58')).title).toBe('1,382 mi flown · 0 to go')
  })
})

describe('the full map’s facts at a moment, with and without live data (Stage 3 spec §7.3, §8)', () => {
  it('credit adsb.lol whenever a flight of the trip has live data', () => {
    expect(factsAtMoment(facts('11:10'), at('11:10'), at('11:10')).showsLiveCredit).toBe(true)
    // In a replay too, and at a moment before the real plane was seen: it's the trip on screen that has live data.
    expect(factsAtMoment(facts('11:10', { isReplay: true }), at('10:05'), at('11:10')).showsLiveCredit).toBe(true)
    expect(factsAtMoment(factsOf(equatorFlight(0, 20)), at('11:10'), at('11:10')).showsLiveCredit).toBe(false)
    expect(factsAtMoment(factsOf(equatorLiveLeg(null, at('11:10'))), at('11:10'), at('11:10')).showsLiveCredit).toBe(false)
  })

  it('credit adsb.lol for a real path with no fix, and for a plane seen only at its gate, with no path yet', () => {
    const pathOnly = equatorLiveLeg({ ...equatorLive(at('11:10')), fix: null }, at('11:10'))
    expect(pathOnly.flight?.path.isReal).toBe(true)
    expect(factsAtMoment(factsOf(pathOnly), at('11:10'), at('11:10')).showsLiveCredit).toBe(true)
    const gate = atTheGate('10:35')
    const leg = gate.map.legs.find((l) => l.kind === 'flight')!
    expect(leg.flight?.live?.fix).not.toBeNull()
    expect(leg.flight?.path.isReal).toBe(false)
    expect(factsAtMoment(gate, at('10:35'), at('10:35')).showsLiveCredit).toBe(true)
  })

  it('of a flight with no live data, are the same in a replay as they were', () => {
    for (const leg of [equatorFlight(0, 20), equatorLiveLeg(null, at('11:10'))]) {
      for (const t of ['10:05', '10:35', '11:10', '12:07', '13:20']) {
        expect(factsAtMoment(factsOf(leg, { isReplay: true }), at(t), at('11:10'))).toEqual(factsAtMoment(factsOf(leg), at(t), at('11:10')))
      }
    }
  })
})
```

**In `tests/ui/FactsBody.test.tsx`, replace:**

```tsx
    expect(screen.queryByRole('heading', { name: 'Trip so far' })).toBeNull()
  })
})
```

**with:**

```tsx
    expect(screen.queryByRole('heading', { name: 'Trip so far' })).toBeNull()
  })
})

describe('the credit to adsb.lol under the facts (Stage 3 spec §8, §15)', () => {
  const withWeather = factRow('headed', 'AirplaneLanding', 'Lands Cologne 9:30 PM', ['48°F and rain on landing'], true)
  const footer = (container: Element) => container.querySelector('footer.facts-footer')!

  it('shows under "Estimated from the schedule", beside the weather credit, whenever a flight with live data shows', () => {
    const { container } = render(<FactsBody rows={[withWeather]} tripSoFar={soFar} showsLiveCredit />)
    const lines = [...footer(container).children]
    expect(lines).toHaveLength(3)
    expect(lines[0].textContent).toBe('Estimated from the schedule')
    expect(lines[1].classList.contains('live-credit')).toBe(true)
    expect(lines[2].classList.contains('weather-credit')).toBe(true)
  })

  it('reads "Live position: adsb.lol", and is a sentence for screen readers', () => {
    const { container } = render(<FactsBody rows={[below]} tripSoFar={soFar} showsLiveCredit />)
    const credit = footer(container).querySelector('.live-credit')!
    const shown = screen.getByText('Live position: adsb.lol')
    expect(credit.contains(shown)).toBe(true)
    expect(shown.getAttribute('aria-hidden')).toBe('true')
    const spoken = screen.getByText('Live position from adsb.lol.')
    expect(credit.contains(spoken)).toBe(true)
    expect(spoken.classList.contains('sr-only')).toBe(true)
    expect(spoken.closest('[aria-hidden="true"]')).toBeNull()
    // Plain words, as the app's: no link.
    expect(credit.querySelector('a')).toBeNull()
  })

  it('leaves the footer as it was with no live data', () => {
    const { container } = render(<FactsBody rows={[below]} tripSoFar={soFar} />)
    const before = footer(container).outerHTML
    expect(footer(container).textContent).toBe('Estimated from the schedule')
    expect(container.querySelector('.live-credit')).toBeNull()
    cleanup()
    const none = render(<FactsBody rows={[below]} tripSoFar={soFar} showsLiveCredit={false} />)
    expect(footer(none.container).outerHTML).toBe(before)
    expect(screen.queryByText(/adsb\.lol/)).toBeNull()
  })
})
```

**In `tests/ui/TripMapPage.test.tsx`, replace:**

```tsx
    expect(screen.getByRole('heading', { level: 1, name: 'Trip recap' })).toBeTruthy()
  })
})
```

**with:**

```tsx
    expect(screen.getByRole('heading', { level: 1, name: 'Trip recap' })).toBeTruthy()
  })
})

describe('the facts at a replay’s moment, and the credit to adsb.lol (Stage 3 spec §7.3, §8)', () => {
  const facts: FactsAtMoment = {
    headline: 'Over Kansas',
    rows: [factRow('distance', 'Path', '2,140 mi flown · 1,960 to go')],
    tripSoFar: { flights: [], totalsTitle: 'Trip so far', totals: null },
  }
  const show = (factsAt: (t: number, now: number, isReplay: boolean) => FactsAtMoment) => {
    setWindowSize(1280, 800)
    const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!
    return render(<TripMapPage map={map} now={at(12)} viewerTz="America/New_York" h24={false} day={1} days={4} land={null}
      onBack={() => {}} factsAt={factsAt} />)
  }

  it('asks for the facts of a replay’s moment as a replay’s, and of now as now’s', () => {
    const factsAt = vi.fn((_t: number, _now: number, _isReplay: boolean) => facts)
    show(factsAt)
    expect(factsAt.mock.lastCall).toEqual([at(12), at(12), false])
    const slider = screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement
    fireEvent.input(slider, { target: { value: String(Number(slider.max) / 4) } })
    const [t, now, isReplay] = factsAt.mock.lastCall!
    expect(isReplay).toBe(true)
    expect(t).not.toBe(at(12))
    expect(now).toBe(at(12))
    fireEvent.click(screen.getByRole('button', { name: 'Live' }))
    expect(factsAt.mock.lastCall).toEqual([at(12), at(12), false])
  })

  it('credits adsb.lol under the facts when they say a flight with live data shows', () => {
    const { container } = show(() => ({ ...facts, showsLiveCredit: true }))
    const credit = container.querySelector('#trip-facts .facts-footer .live-credit')!
    expect(credit.querySelector('[aria-hidden="true"]')?.textContent).toBe('Live position: adsb.lol')
    expect(credit.querySelector('.sr-only')?.textContent).toBe('Live position from adsb.lol.')
  })

  it('has no credit when they don’t', () => {
    const { container } = show(() => facts)
    expect(container.querySelector('#trip-facts .facts-footer')).not.toBeNull()
    expect(container.querySelector('.live-credit')).toBeNull()
    expect(container.textContent).not.toMatch(/adsb\.lol/)
  })
})
```

**Create `tests/ui/liveMapFacts.test.tsx`:**

```tsx
// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTripFacts } from '../../src/facts/tripFacts'
import type { ScheduleHandle } from '../../src/ui/hooks/useSchedule'
import { PilotPages } from '../../src/ui/PilotPages'
import { setWindowSize } from '../fixtures/ui'
import { FLYING, LIVE_AIRPORTS, SCHEDULE } from '../map/liveTrip'
import { MINUTE, START } from '../map/madeUpFlights'

/**
 * The full map's facts with a real plane (Stage 3 spec §7.3, §8), as the app's TripMapScreen and FactsFooter have them:
 * the credit to adsb.lol under the facts whenever a flight with live data shows, never on the status page's card, and
 * a replay's facts are the replay's: the real plane where its record has it, with no height or speed. They're made from
 * the page's one store, so a real path's story is never made twice.
 */

// The map's land and the facts' data are downloads these tests don't make: the facts go without places.
vi.mock('../../src/ui/hooks/useLand', () => ({ useLand: () => null }))
vi.mock('../../src/ui/hooks/useFactsData', () => ({ useGeography: () => null, useComparisons: () => null }))
vi.mock('../../src/facts/tripFacts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/facts/tripFacts')>()
  return { ...original, makeTripFacts: vi.fn(original.makeTripFacts) }
})

const NOW = START + 59 * MINUTE

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(NOW)
  // Wide, so the full map opens with its facts showing.
  setWindowSize(1280, 800)
  history.replaceState(null, '', '/')
  vi.mocked(makeTripFacts).mockClear()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  localStorage.clear()
  history.replaceState(null, '', '/')
  setWindowSize(1024, 768)
})

const handle: ScheduleHandle = { schedule: SCHEDULE, lastSuccessAt: START, problem: null, refreshing: false, refresh: () => {} }
const LIVE = { flights: new Map([['f1', FLYING]]), clockOffset: 0 }

/** The pilot's pages, at the full map's address when `atMap`. */
function pages(live: typeof LIVE | null, atMap = true) {
  if (atMap) history.replaceState(null, '', '/#map')
  return render(<PilotPages schedule={handle} airports={LIVE_AIRPORTS} demo={false} onLeave={() => {}} live={live} loadWeather={async () => null} />).container
}

/** The row of that kind on the full map's facts, as the screen shows it: its title, and its second line. */
function shownRow(container: Element, title: RegExp): { title: string; detail: string | null } {
  const rows = [...container.querySelectorAll('#trip-facts .fact-row')]
  const found = rows.find((r) => title.test(r.querySelector('.fact-row-title')?.textContent ?? ''))
  if (!found) throw new Error(`No row titled ${title}`)
  return { title: found.querySelector('.fact-row-title')!.textContent!, detail: found.querySelector('.fact-row-detail')?.textContent ?? null }
}

const milesFlown = (container: Element) => Number(shownRow(container, /mi flown/).title.match(/^([\d,]+) mi flown/)![1].replace(/,/g, ''))

/** Moves the full map's timeline a quarter of the way through the trip: a replay's moment, paused. */
function replayAQuarterIn() {
  const slider = screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement
  fireEvent.input(slider, { target: { value: String(Number(slider.max) / 4) } })
}

const credit = (container: Element) => container.querySelector('#trip-facts .facts-footer .live-credit')

describe('the credit to adsb.lol (Stage 3 spec §8, §15)', () => {
  it('shows under the full map’s facts while a flight with live data shows, now and in a replay', () => {
    const container = pages(LIVE)
    expect(credit(container)?.querySelector('.sr-only')?.textContent).toBe('Live position from adsb.lol.')
    replayAQuarterIn()
    expect(credit(container)).not.toBeNull()
  })

  it('isn’t on the status page’s card, which is too small for it (Todd, 15 Nov 2026)', () => {
    const container = pages(LIVE, false)
    expect(container.querySelector('.trip-map-card')).not.toBeNull()
    expect(container.textContent).not.toMatch(/adsb\.lol/)
    for (const labelled of container.querySelectorAll('[aria-label]')) expect(labelled.getAttribute('aria-label')).not.toMatch(/adsb\.lol/)
  })

  it('isn’t under the facts with no live data', () => {
    const container = pages(null)
    expect(container.querySelector('#trip-facts .facts-footer')?.textContent).toBe('Estimated from the schedule')
    replayAQuarterIn()
    expect(container.textContent).not.toMatch(/adsb\.lol/)
  })
})

describe('a replay’s facts on the full map (Stage 3 spec §7.3)', () => {
  it('are now’s at now: the real plane at its newest fix, with its height and speed', () => {
    const container = pages(LIVE)
    expect(shownRow(container, /^Boeing 767-300/)).toEqual({ title: 'Boeing 767-300 · N000XX', detail: '30,000 ft · 490 mph' })
    expect(milesFlown(container)).toBe(342)
  })

  it('are the replay’s: the real plane where its record has it, with no height or speed', () => {
    const container = pages(LIVE)
    replayAQuarterIn()
    expect(shownRow(container, /^Boeing 767-300/)).toEqual({ title: 'Boeing 767-300 · N000XX', detail: null })
    // A quarter of the way through the trip, it had flown less than it has now.
    const flown = milesFlown(container)
    expect(flown).toBeGreaterThan(0)
    expect(flown).toBeLessThan(342)
  })

  it('go back to now’s at Live', () => {
    const container = pages(LIVE)
    replayAQuarterIn()
    fireEvent.click(screen.getByRole('button', { name: 'Live' }))
    expect(shownRow(container, /^Boeing 767-300/).detail).toBe('30,000 ft · 490 mph')
    expect(milesFlown(container)).toBe(342)
  })
})

describe('the facts of a replay’s moment and the page’s store (Stage 3 spec §8)', () => {
  const calls = () => vi.mocked(makeTripFacts).mock.calls.map(([, options], i) => ({ options, made: vi.mocked(makeTripFacts).mock.results[i].value }))

  it('are made with isReplay, from the store every other facts on the page are made from', () => {
    pages(LIVE)
    expect(calls().every(({ options }) => !options.isReplay)).toBe(true)
    replayAQuarterIn()
    const replays = calls().filter(({ options }) => options.isReplay === true)
    expect(replays).toHaveLength(1)
    const store = calls()[0].options.store
    expect(store).toBeTruthy()
    for (const { options } of calls()) expect(options.store).toBe(store)
  })

  it('make nothing twice: the real path’s sun events are the ones now’s facts have', () => {
    pages(LIVE)
    replayAQuarterIn()
    const all = calls()
    const replay = all.findIndex(({ options }) => options.isReplay === true)
    // Now's facts, made at the same render, just before.
    const nowFacts = all[replay - 1].made
    expect(all[replay - 1].options.isReplay).toBeFalsy()
    expect(nowFacts.sunEvents.f1).toBeDefined()
    expect(all[replay].made.sunEvents.f1).toBe(nowFacts.sunEvents.f1)
  })

  it('are made once a render of the page, however often the full map draws the moment', () => {
    const container = pages(LIVE)
    replayAQuarterIn()
    // Folding the facts and opening them again draws the full map twice more, not the page.
    fireEvent.click(screen.getByRole('button', { name: 'Hide facts' }))
    fireEvent.click(screen.getByRole('button', { name: 'Show facts' }))
    expect(calls().filter(({ options }) => options.isReplay === true)).toHaveLength(1)
    // A second later the page draws again, with the replay's moment still showing: its facts are made again, once.
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(calls().filter(({ options }) => options.isReplay === true)).toHaveLength(2)
    expect(credit(container)).not.toBeNull()
  })

  it('aren’t made while the full map shows now', () => {
    pages(LIVE)
    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    expect(calls().length).toBeGreaterThan(1)
    expect(calls().some(({ options }) => options.isReplay)).toBe(false)
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/facts/liveTripFacts.test.ts tests/ui/FactsBody.test.tsx tests/ui/TripMapPage.test.tsx tests/ui/liveMapFacts.test.tsx
```

Expected: 11 of the 75 tests fail: there's no credit under the facts, and the full map's facts at a moment of the replay aren't the replay's.

- [x] **Step 3: Write the code.**

**In `src/facts/factRow.ts`, replace:**

```ts
  tripSoFar: TripSoFar
}
```

**with:**

```ts
  tripSoFar: TripSoFar
  /** A flight of the trip on screen has live data, which the footer credits adsb.lol for (Stage 3 spec §8). False unless it's said. */
  showsLiveCredit?: boolean
}
```

**In `src/facts/tripFactsRows.ts`, replace (1 of 2):**

```ts
import { chase, cockpitHorizonOnLeg, moonSight, nextGroundSunEvent, sunAltitudeOnLeg } from './sky'
import { belowText, forecastFor, isRecapOver, isStillOnGround, lastSeenText, sheetHeadline, tripSoFar, type TripFacts } from './tripFacts'
import { longestFlight, totalsSoFar, wholeTotals, type TripTotals } from './tripTotals'
```

**with:**

```ts
import { chase, cockpitHorizonOnLeg, moonSight, nextGroundSunEvent, sunAltitudeOnLeg } from './sky'
import { belowText, forecastFor, isRecapOver, isStillOnGround, lastSeenText, sheetHeadline, showsLiveData, tripSoFar, type TripFacts } from './tripFacts'
import { longestFlight, totalsSoFar, wholeTotals, type TripTotals } from './tripTotals'
```

**In `src/facts/tripFactsRows.ts`, replace (2 of 2):**

```ts

/** Everything the full map's panel shows at `t`: the headline, the rows and the trip so far. */
export function factsAtMoment(facts: TripFacts, t: number, now: number): FactsAtMoment {
  return { headline: sheetHeadline(facts, t), rows: factRows(facts, t, now), tripSoFar: tripSoFar(facts, t) }
}
```

**with:**

```ts

/**
 * Everything the full map's panel shows at `t`: the headline, the rows and the trip so far, and whether the footer
 * credits adsb.lol, as it does whenever a flight of the trip has live data (Stage 3 spec §8).
 */
export function factsAtMoment(facts: TripFacts, t: number, now: number): FactsAtMoment {
  return {
    headline: sheetHeadline(facts, t), rows: factRows(facts, t, now), tripSoFar: tripSoFar(facts, t), showsLiveCredit: showsLiveData(facts),
  }
}
```

**In `src/ui/FactsBody.tsx`, replace (1 of 2):**

```tsx

/** The facts under the panel's headline (Stage 2 spec §5, §6.3): the rows, the trip so far, then the footer. */
export function FactsBody({ rows, tripSoFar }: { rows: FactRow[]; tripSoFar: TripSoFar }) {
  return (
```

**with:**

```tsx

export interface FactsBodyProps {
  rows: FactRow[]
  tripSoFar: TripSoFar
  /** A flight with live data shows, which the footer credits adsb.lol for (Stage 3 spec §8). False unless it's said. */
  showsLiveCredit?: boolean
}

/** The facts under the panel's headline (Stage 2 spec §5, §6.3): the rows, the trip so far, then the footer. */
export function FactsBody({ rows, tripSoFar, showsLiveCredit = false }: FactsBodyProps) {
  return (
```

**In `src/ui/FactsBody.tsx`, replace (2 of 2):**

```tsx
      <TripSoFarList tripSoFar={tripSoFar} />
      <FactsFooter showsWeather={rows.some((row) => row.hasWeather)} />
    </div>
```

**with:**

```tsx
      <TripSoFarList tripSoFar={tripSoFar} />
      <FactsFooter showsWeather={rows.some((row) => row.hasWeather)} showsLiveCredit={showsLiveCredit} />
    </div>
```

**In `src/ui/FactsFooter.tsx`, replace:**

```tsx
import { WeatherCredit } from './WeatherCredit'

/** Under the facts (Stage 2 spec §5.2, §7.2): that they come from the schedule, and Open-Meteo's credit when a forecast shows. */
export function FactsFooter({ showsWeather }: { showsWeather: boolean }) {
  return (
    <footer class="facts-footer">
      <p>Estimated from the schedule</p>
      {showsWeather && <WeatherCredit />}
    </footer>
  )
}
```

**with:**

```tsx
import { LIVE_CREDIT, SPOKEN_LIVE_CREDIT } from '../copy/facts'
import { WeatherCredit } from './WeatherCredit'

export interface FactsFooterProps {
  showsWeather: boolean
  /** A flight with live data shows: its position is adsb.lol's. */
  showsLiveCredit: boolean
}

/**
 * Under the facts (Stage 2 spec §5.2, §7.2; Stage 3 spec §8): that they come from the schedule, the credit to adsb.lol
 * whenever a flight with live data shows, and Open-Meteo's credit when a forecast shows.
 */
export function FactsFooter({ showsWeather, showsLiveCredit }: FactsFooterProps) {
  return (
    <footer class="facts-footer">
      <p>Estimated from the schedule</p>
      {showsLiveCredit && <LiveCredit />}
      {showsWeather && <WeatherCredit />}
    </footer>
  )
}

/** "Live position: adsb.lol", which screen readers hear as a sentence (Stage 3 spec §15). Plain words, as the app's. */
function LiveCredit() {
  return (
    <p class="live-credit">
      <span aria-hidden="true">{LIVE_CREDIT}</span>
      <span class="sr-only">{SPOKEN_LIVE_CREDIT}</span>
    </p>
  )
}
```

**In `src/ui/PilotPages.tsx`, replace (1 of 5):**

```tsx
} from '../data/weather'
import { makeFactsStore } from '../facts/factsStore'
import { makeTripFacts } from '../facts/tripFacts'
import { factsAtMoment } from '../facts/tripFactsRows'
```

**with:**

```tsx
} from '../data/weather'
import type { FactsAtMoment } from '../facts/factRow'
import { makeFactsStore } from '../facts/factsStore'
import { makeTripFacts, type FactsOptions, type TripFacts } from '../facts/tripFacts'
import { factsAtMoment } from '../facts/tripFactsRows'
```

**In `src/ui/PilotPages.tsx`, replace (2 of 5):**

```tsx
import type { MapFlight } from '../map/mapFlight'
import { tripMapFor } from '../map/tripMapFor'
```

**with:**

```tsx
import type { MapFlight } from '../map/mapFlight'
import type { TripMap } from '../map/tripMap'
import { tripMapFor } from '../map/tripMapFor'
```

**In `src/ui/PilotPages.tsx`, replace (3 of 5):**

```tsx
  const factsStore = useMemo(() => makeFactsStore(), [])
  const facts = tripMap && snap
    ? makeTripFacts(tripMap, {
      geography, comparisons, forecasts, viewerTz, h24, day: snap.tripProgress?.day ?? null, days: snap.tripProgress?.days ?? null, store: factsStore,
    })
    : null
  const listed = useMemo(() => (ready ? scheduleLegs(ready.legs) : []), [ready])
```

**with:**

```tsx
  const factsStore = useMemo(() => makeFactsStore(), [])
  const factsOptions: FactsOptions | null = snap
    ? {
      geography, comparisons, forecasts, viewerTz, h24, day: snap.tripProgress?.day ?? null, days: snap.tripProgress?.days ?? null, store: factsStore,
    }
    : null
  const facts = tripMap && factsOptions ? makeTripFacts(tripMap, factsOptions) : null
  const listed = useMemo(() => (ready ? scheduleLegs(ready.legs) : []), [ready])
```

**In `src/ui/PilotPages.tsx`, replace (4 of 5):**

```tsx
      days={snap.tripProgress?.days ?? null} land={land} onBack={mapPage.back}
      factsAt={facts ? (t, real) => factsAtMoment(facts, t, real) : undefined} />
  }
```

**with:**

```tsx
      days={snap.tripProgress?.days ?? null} land={land} onBack={mapPage.back}
      factsAt={facts && factsOptions ? factsAtMoments(tripMap, facts, factsOptions) : undefined} />
  }
```

**In `src/ui/PilotPages.tsx`, replace (5 of 5):**

```tsx

/** The airport whose weather the location card shows, or null when the card is hidden or the airport isn't in the list. */
```

**with:**

```tsx

/**
 * The full map's facts at its moments (Stage 3 spec §7.3, §8). Now's are the page's own. A replay's are made as they
 * are, but as a replay's: the real plane is where its record has it, with no height or speed. They're made from the
 * same store, so a real path's story and sun events aren't made twice, and only once a render, the first time a
 * replay's moment is asked about: the full map draws a playing replay every frame.
 */
function factsAtMoments(map: TripMap, facts: TripFacts, options: FactsOptions) {
  let replay: TripFacts | null = null
  return (t: number, now: number, isReplay: boolean): FactsAtMoment =>
    factsAtMoment(isReplay ? (replay ??= makeTripFacts(map, { ...options, isReplay: true })) : facts, t, now)
}

/** The airport whose weather the location card shows, or null when the card is hidden or the airport isn't in the list. */
```

**In `src/ui/TripMapPage.tsx`, replace (1 of 3):**

```tsx
  onBack: () => void
  /** The facts at a moment on the timeline, with `now` the real time (Stage 2 spec §5). Without it the panel is Stage 1B's. */
  factsAt?: (t: number, now: number) => FactsAtMoment
}
```

**with:**

```tsx
  onBack: () => void
  /**
   * The facts at a moment on the timeline, with `now` the real time (Stage 2 spec §5). `isReplay` while the clock isn't
   * live: a replay's facts are the replay's (Stage 3 spec §7.3). Without it the panel is Stage 1B's.
   */
  factsAt?: (t: number, now: number, isReplay: boolean) => FactsAtMoment
}
```

**In `src/ui/TripMapPage.tsx`, replace (2 of 3):**

```tsx
  useEffect(() => setOpen(side), [side])
  const facts = factsAt ? factsAt(t, now) : null
  const showsFacts = facts != null && open
```

**with:**

```tsx
  useEffect(() => setOpen(side), [side])
  // A replay's moment has a replay's facts: the real plane where its record has it, with no height or speed (Stage 3
  // spec §7.3).
  const facts = factsAt ? factsAt(t, now, isReplay) : null
  const showsFacts = facts != null && open
```

**In `src/ui/TripMapPage.tsx`, replace (3 of 3):**

```tsx
          <div id="trip-facts" class="trip-facts" hidden={!open}>
            <FactsBody rows={facts.rows} tripSoFar={facts.tripSoFar} />
          </div>
```

**with:**

```tsx
          <div id="trip-facts" class="trip-facts" hidden={!open}>
            <FactsBody rows={facts.rows} tripSoFar={facts.tripSoFar} showsLiveCredit={facts.showsLiveCredit} />
          </div>
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 75 tests pass. Then `npx tsc --noEmit`: nothing; and `npm test`: 175 test files and 3,575 tests pass.

- [x] **Step 5: Commit, on Todd's yes (after batch C's checkpoint).**

```bash
git add src/facts/factRow.ts src/facts/tripFactsRows.ts src/ui/FactsBody.tsx src/ui/FactsFooter.tsx src/ui/PilotPages.tsx src/ui/TripMapPage.tsx tests/facts/liveTripFacts.test.ts tests/ui/FactsBody.test.tsx tests/ui/TripMapPage.test.tsx tests/ui/liveMapFacts.test.tsx
git commit -m "adsb.lol is credited under the facts whenever a flight with live data shows, and a replay's facts are the replay's (Stage 3 spec §7.3, §8)"
```

---

### Task 9: The website's own: a plane still on the ground, and "about" on the Schedule page

Todd's words (16 Nov 2026) for a real plane still on the ground at its departure airport: "On the ground in Rockford" under the full map's timeline (a replay keeps "Flying to …"), "Alex is still on the ground in Rockford on UPS flight 2963 to Anchorage — landing in …" on the status page, "On the ground" as the card's heading for screen readers, nothing of that flight listed as passed, and its halfway and closest point to home said with "about". And the Schedule page says "about" before a landing time that's the real plane's estimate.

**Files:**
- Modify: `src/copy/narrative.ts`, `src/copy/schedule.ts`, `src/copy/tripMap.ts`, `src/engine/liveLegs.ts`, `src/facts/tripFacts.ts`, `src/facts/tripFactsRows.ts`, `src/map/mapFlight.ts`, `src/map/tripActivity.ts`, `src/map/tripMap.ts`, `src/ui/PilotPages.tsx`, `src/ui/ScheduleView.tsx`, `src/ui/StatusScreen.tsx`, `src/ui/TripMapCard.tsx`, `src/ui/TripTimeline.tsx`
- Test: `tests/copy/activityWords.test.ts`, `tests/copy/liveWords.test.ts`, `tests/copy/narrativeAway.test.ts`, `tests/copy/schedule.test.ts`, `tests/engine/liveLegs.test.ts`, `tests/facts/liveTripFacts.test.ts`, `tests/map/liveTrip.ts`, `tests/map/liveTripMap.test.ts`, `tests/ui/SchedulePage.test.tsx`, `tests/ui/liveMapPage.test.tsx`, `tests/ui/livePages.test.tsx`

- [x] **Step 1: Write the tests.**

**In `tests/copy/activityWords.test.ts`, replace:**

```ts
    expect(timelineSpokenValue(at(12), { kind: 'home', place: cologne }, 'America/New_York', false)).toMatch(/^Friday 7:00\sPM, home$/)
  })
})

```

**with:**

```ts
    expect(timelineSpokenValue(at(12), { kind: 'home', place: cologne }, 'America/New_York', false)).toMatch(/^Friday 7:00\sPM, home$/)
  })

  it('says where a flight’s real plane is still on the ground, in place of flying (the website’s own, Todd, 16 Nov 2026)', () => {
    const flying = { kind: 'flying', place: cologne } as const
    const rockford = { ...cologne, code: 'RFD', city: 'Rockford' }
    expect(timelineLine(at(12), flying, 'America/New_York', false, rockford)).toMatch(/^Fri 7:00\sPM · On the ground in Rockford$/)
    expect(timelineSpokenValue(at(12), flying, 'America/New_York', false, rockford)).toMatch(/^Friday 7:00\sPM, on the ground in Rockford$/)
    // Without it, flying, as before.
    expect(timelineLine(at(12), flying, 'America/New_York', false, null)).toMatch(/^Fri 7:00\sPM · Flying to Cologne$/)
    expect(timelineSpokenValue(at(12), flying, 'America/New_York', false, null)).toMatch(/^Friday 7:00\sPM, flying to Cologne$/)
  })
})

```

**In `tests/copy/liveWords.test.ts`, replace (1 of 2):**

```ts
import { landsText } from '../../src/copy/facts'
import { Sentence } from '../../src/copy/narrative'
import {
  flightStatus, landingCountdown, landingLine, landsAt, liveSummary, spokenLiveLabel, spokenMinutes, topPill, tripMapSummary,
} from '../../src/copy/tripMap'
import type { AirportIndex } from '../../src/data/airports'
import { makeMapFlight } from '../../src/map/mapFlight'
```

**with:**

```ts
import { landsText } from '../../src/copy/facts'
import { Sentence } from '../../src/copy/narrative'
import {
  cardHeading, flightStatus, landingCountdown, landingLine, landsAt, liveSummary, spokenLiveLabel, spokenMinutes, topPill, tripMapSummary,
} from '../../src/copy/tripMap'
import type { AirportIndex } from '../../src/data/airports'
import { makeMapFlight } from '../../src/map/mapFlight'
```

**In `tests/copy/liveWords.test.ts`, replace (2 of 2):**

```ts
    expect(tripMapSummary({ ...map, legs: [scheduleOnly(leg)] }, t, 'Alex', NY, false)).toMatch(/^UPS207 to Philadelphia, landing at .* your time\. Estimated from the schedule\. Opens the full map\.$/)
  })
})
```

**with:**

```ts
    expect(tripMapSummary({ ...map, legs: [scheduleOnly(leg)] }, t, 'Alex', NY, false)).toMatch(/^UPS207 to Philadelphia, landing at .* your time\. Estimated from the schedule\. Opens the full map\.$/)
  })
})

describe("the map card's heading for screen readers (the website's own, Todd, 16 Nov 2026)", () => {
  const mapOf = (leg: MapLeg, mode: TripMap['mode'] = { kind: 'inFlight', legId: leg.id }): TripMap =>
    ({ mode, legs: [leg], groundStops: [], home: null, base: null, isWaitingAtBase: false, span: { start: leg.start, end: leg.end }, days: null })

  it('is "On the ground" while the real plane is still at its departure airport', () => {
    const { leg, t } = caseLeg('still on the ground twenty minutes after')
    expect(cardHeading(mapOf(leg), t)).toBe('On the ground')
  })

  it('is "In flight" in the air, landed, on the ground somewhere else and with no live data, as before', () => {
    for (const name of ['ahead, in the air', 'landed, seen all the way', 'on the ground somewhere else']) {
      const { leg, t } = caseLeg(name)
      expect(cardHeading(mapOf(leg), t)).toBe('In flight')
    }
    const late = caseLeg('still on the ground twenty minutes after')
    expect(cardHeading(mapOf(scheduleOnly(late.leg)), late.t)).toBe('In flight')
  })

  it('is "Trip recap" or "Trip map" with no flight in the air, as before', () => {
    const { leg, t } = caseLeg('still on the ground twenty minutes after')
    expect(cardHeading(mapOf(leg, { kind: 'recap' }), t)).toBe('Trip recap')
    expect(cardHeading(mapOf(leg, { kind: 'onTrip' }), t)).toBe('Trip map')
    expect(cardHeading(mapOf(leg, { kind: 'nextTrip' }), t)).toBe('Trip map')
  })
})
```

**In `tests/copy/narrativeAway.test.ts`, replace (1 of 2):**

```ts
import { narrative, safeNarrative, type NarrativeCtx, type Span } from '../../src/copy/narrative'
import { demoRaw } from '../../src/data/demo'
import { RawBuilder, type FlightSpec } from '../../src/data/rowBuilder'
import type { Leg } from '../../src/engine/legs'
import { makeSnapshot, safeSnapshot } from '../../src/engine/snapshot'
import { testAirports } from '../fixtures/airports'
import { alex, firstFlight, overnight, twoFlights } from '../fixtures/departures'
```

**with:**

```ts
import { narrative, safeNarrative, type NarrativeCtx, type Span } from '../../src/copy/narrative'
import { demoRaw } from '../../src/data/demo'
import { RawBuilder, type FlightSpec } from '../../src/data/rowBuilder'
import type { Leg, MoveLeg } from '../../src/engine/legs'
import { makeSnapshot, safeSnapshot } from '../../src/engine/snapshot'
import { testAirports } from '../fixtures/airports'
import { alex, firstFlight, overnight, twoFlights } from '../fixtures/departures'
```

**In `tests/copy/narrativeAway.test.ts`, replace (2 of 2):**

```ts
    expect(spans.filter((s) => !s.digits).every((s) => s.spoken === undefined)).toBe(true)
  })
})
```

**with:**

```ts
    expect(spans.filter((s) => !s.digits).every((s) => s.spoken === undefined)).toBe(true)
  })
})

describe('narrative while the real plane is still on the ground at its departure airport (the website’s own, Todd, 16 Nov 2026)', () => {
  const driver = engineFor(demoRaw('driver', A))
  const snapAt = (e: ReturnType<typeof engineFor>, minutes: number) => makeSnapshot(e.schedule, e.legs, at(minutes), NY)
  /** The sentence at `minutes`, with the flight under way's real plane at its gate. */
  const onGround = (e: ReturnType<typeof engineFor>, minutes: number, more: Partial<NarrativeCtx> = {}) => {
    const snap = snapAt(e, minutes)
    return narrative(snap, { ...ctx(minutes), stillOnGroundFlight: (snap.status.current as MoveLeg).id, ...more })
  }
  const tripWith = (flight: Partial<FlightSpec>) =>
    engineFor(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX').trip('t1', {
        dutyPeriods: [{ start: 0, end: 400, flights: [{ dep: 'SDF', arr: 'ANC', out: 30, in: 330, ...flight }] }],
      }).build(),
    )

  it('says so in place of flying, with the countdown and the time as before', () => {
    expect(plain(onGround(driver, 100))).toBe('Alex is still on the ground in Louisville on UPS flight 2961 to Rockford — landing in 50m which is 8:00am EDT.')
  })

  it('says "about" of a landing time that’s the real plane’s estimate, as before', () => {
    const end = (snapAt(driver, 100).status.current as MoveLeg).end
    expect(plain(onGround(driver, 100, { estimatedArrival: end })))
      .toBe('Alex is still on the ground in Louisville on UPS flight 2961 to Rockford — landing in 50m which is about 8:00am EDT.')
  })

  it('bolds the places and the times, and colors the countdown with the status color', () => {
    const spans = onGround(driver, 100)
    expect(spans.filter((s) => s.bold).map((s) => s.text)).toEqual(['Louisville', 'Rockford', '50m', '8:00am EDT'])
    expect(coloredSpans(spans)).toEqual(['50m:status'])
    expect(spans.find((s) => s.text === '50m')?.spoken).toBe('50 minutes')
  })

  it('takes the place of a delayed departure’s words too, keeping its red countdown', () => {
    const spans = onGround(driver, 1700)
    expect(plain(spans)).toBe('Alex is still on the ground in Anchorage on UPS flight 2962 to Louisville — landing in 3h 20m which is 1:10pm EDT.')
    expect(coloredSpans(spans)).toEqual(['3h 20m:red'])
  })

  it('reads the same for a deadhead, and names the flight plainly when it has no usable number', () => {
    expect(plain(onGround(tripWith({ dh: true }), 270)))
      .toBe('Alex is still on the ground in Louisville on UPS flight 1000 to Anchorage — landing in 1h 0m which is 11:00am EDT.')
    expect(plain(onGround(tripWith({ number: null }), 270)))
      .toBe('Alex is still on the ground in Louisville on the flight to Anchorage — landing in 1h 0m which is 11:00am EDT.')
  })

  it('says flying, as before, when the plane on the ground is another flight’s, or none is', () => {
    const flying = 'Alex is flying to Rockford on UPS flight 2961 from Louisville — landing in 50m which is 8:00am EDT.'
    expect(plain(narrative(snapAt(driver, 100), { ...ctx(100), stillOnGroundFlight: 'another flight' }))).toBe(flying)
    expect(plain(narrative(snapAt(driver, 100), { ...ctx(100), stillOnGroundFlight: null }))).toBe(flying)
  })
})
```

**In `tests/copy/schedule.test.ts`, replace:**

```ts
    expect(legTimes(out, landed, NY, true)).toBe('06:05 edt – 07:40 edt')
  })
```

**with:**

```ts
    expect(legTimes(out, landed, NY, true)).toBe('06:05 edt – 07:40 edt')
  })

  it('says "about" before a landing time that’s the real plane’s estimate (Stage 3 spec §9)', () => {
    expect(legTimes(out, landed, NY, false, true)).toBe('6:05am edt – about 7:40am edt')
    expect(legTimes(out, landed, NY, true, true)).toBe('06:05 edt – about 07:40 edt')
    expect(legTimes(out, landed, NY, false, false)).toBe('6:05am edt – 7:40am edt')
  })
```

**In `tests/engine/liveLegs.test.ts`, replace (1 of 2):**

```ts
import { describe, expect, it } from 'vitest'
import { buildLegs, type Leg } from '../../src/engine/legs'
import { estimatedArrival, isEstimatedArrival, liveMapFlights, watchedFlights, withLiveTimes } from '../../src/engine/liveLegs'
import { resolveStatus } from '../../src/engine/status'
import type { Schedule } from '../../src/engine/types'
import type { GeoPoint } from '../../src/map/greatCircle'
```

**with:**

```ts
import { describe, expect, it } from 'vitest'
import { buildLegs, type Leg } from '../../src/engine/legs'
import { estimatedArrival, isEstimatedArrival, liveMapFlights, stillOnGroundFlight, watchedFlights, withLiveTimes } from '../../src/engine/liveLegs'
import { resolveStatus } from '../../src/engine/status'
import type { Schedule } from '../../src/engine/types'
import type { GeoPoint } from '../../src/map/greatCircle'
```

**In `tests/engine/liveLegs.test.ts`, replace (2 of 2):**

```ts
    expect(estimatedArrival(legs, new Map(), START + 52 * MINUTE)).toBeNull()
  })
})
```

**with:**

```ts
    expect(estimatedArrival(legs, new Map(), START + 52 * MINUTE)).toBeNull()
  })
})

describe('a real plane still on the ground at its departure airport (the website’s own, Todd, 16 Nov 2026)', () => {
  /** Seen at its gate in Louisville 20 seconds before `minutes` after the gate time, never yet in the air. */
  const atTheGate = (minutes: number) =>
    liveFlight([], { legId: 'f1', state: 'ground', fix: fix(minutes - 1 / 3, airport('SDF').lat, airport('SDF').lng, { onGround: true }) })

  it('is the flight between its gates whose plane hasn’t left, by its id: the narrative says so', () => {
    const schedule = scheduleOf(TURN_TRIP)
    for (const minutes of [25, 1]) {
      const now = START + minutes * MINUTE
      const flights = flightsFor(schedule, atTheGate(minutes))
      expect(stillOnGroundFlight(buildLegs(withLiveTimes(schedule, flights, now)), flights, now)).toBe('f1')
    }
  })

  it('is nothing before its leg begins, in the air, landed, and with no live data', () => {
    const schedule = scheduleOf(TURN_TRIP)
    const onGroundAt = (live: LiveFlight | null, minutes: number) => {
      const now = START + minutes * MINUTE
      const flights = live ? flightsFor(schedule, live) : new Map()
      return stillOnGroundFlight(buildLegs(withLiveTimes(schedule, flights, now)), flights, now)
    }
    expect(onGroundAt(atTheGate(-10), -10)).toBeNull()
    expect(onGroundAt(IN_THE_AIR, 52)).toBeNull()
    expect(onGroundAt(OFF_EARLY_LANDED, 103)).toBeNull()
    expect(onGroundAt(null, 25)).toBeNull()
  })
})
```

**In `tests/facts/liveTripFacts.test.ts`, replace (1 of 2):**

```ts
import type { MapLeg } from '../../src/map/tripMap'
import { appComparisons, box, EQUATOR, equatorFlight, EQUINOX, flightMap } from './factsTestData'
import { date, dogLeg, equatorLive, equatorLiveLeg, HOME_BY_THE_EQUATOR, liveTime } from './liveFacts'
```

**with:**

```ts
import type { MapLeg } from '../../src/map/tripMap'
import { appComparisons, box, EQUATOR, equatorFlight, EQUINOX, flightMap, mark } from './factsTestData'
import { date, dogLeg, equatorLive, equatorLiveLeg, HOME_BY_THE_EQUATOR, liveTime } from './liveFacts'
```

**In `tests/facts/liveTripFacts.test.ts`, replace (2 of 2):**

```ts

describe('the full map’s facts at a moment, with and without live data (Stage 3 spec §7.3, §8)', () => {
```

**with:**

```ts

describe('a real plane still at its departure airport: nothing passed, and its times guesses (the website’s own, Todd, 16 Nov 2026)', () => {
  /** A border 1° E along: the schedule's times have the plane cross it at 10:24, before the real one has left. */
  const border = makeGeography([box('Alpha', 'country', -1, 1), box('Bravo', 'country', 1, 21)], [])

  it('lists none of the leg’s crossings in the trip so far, as nothing of it is flown', () => {
    const soFar = tripSoFar(atTheGate('10:28', { geography: border }), at('10:28'))
    expect(soFar.flights).toEqual([])
    expect(soFar.totals).toBe('Day 1 of 1')
  })

  it('in a replay, lists them where the map has the plane: the schedule’s, as it has no record', () => {
    expect(tripSoFar(atTheGate('10:28', { geography: border, isReplay: true }), at('10:28')).flights[0]?.milestones)
      .toEqual([`Crossed into Bravo · 6:24${AM}`])
  })

  it('says "about" of the leg’s halfway and closest-to-home times, worked out from a takeoff that hasn’t happened', () => {
    const rows = rowsAt(atTheGate('10:35'), '10:35')
    expect(row('below', rows).detail).toMatch(/^Passes 35 mi from home at about \d{1,2}:\d\d AM$/)
    expect(row('distance', rows).detail).toMatch(/^Halfway at about \d{1,2}:\d\d AM · /)
  })

  it('never says it has passed closest to home: a guessed time already gone by is left out, as halfway’s is', () => {
    // Home by 1° E, and the plane held at the gate until 11:00: the schedule's times have it pass home at 10:26.
    const leg = fromRockford(onTheGround(at('11:00')), '11:00')
    const theFacts = makeTripFacts(flightMap(leg, mark('HOME', 0.5, 1)), {
      geography: EQUATOR, comparisons: appComparisons(), viewerTz: NY, h24: false, day: 1, days: 1,
    })
    const rows = rowsAt(theFacts, '11:00')
    expect(row('below', rows)).toMatchObject({ title: 'Still on the ground in Rockford', detail: null })
    expect(row('distance', rows).detail).toMatch(/^Halfway at about /)
  })

  it('in a replay, and on the ground somewhere else, tells the schedule’s times as they are', () => {
    expect(row('below', rowsAt(atTheGate('10:35', { isReplay: true }), '10:35')).detail).toMatch(/^Passes 35 mi from home at \d/)
    const elsewhere = factsOf(equatorLiveLeg(onTheGround(at('10:35'), { lat: 0, lng: 3 }), at('10:35')))
    expect(row('below', rowsAt(elsewhere, '10:35')).detail).toMatch(/^Passes 35 mi from home at \d/)
    expect(row('distance', rowsAt(elsewhere, '10:35')).detail).toMatch(/^Halfway at \d/)
  })
})

describe('the full map’s facts at a moment, with and without live data (Stage 3 spec §7.3, §8)', () => {
```

**In `tests/map/liveTrip.ts`, replace:**

```ts
export const FLYING = liveFlight(TRAIL, { legId: 'f1', fix: fix(58, 39.66, -79.7, { trackDeg: 75 }) })

```

**with:**

```ts
export const FLYING = liveFlight(TRAIL, { legId: 'f1', fix: fix(58, 39.66, -79.7, { trackDeg: 75 }) })

/**
 * Still at its gate in Louisville, seen there 20 seconds before `minutes` after START, never yet in the air: from 15
 * minutes, it's late leaving (the website's "on the ground" words, Todd, 16 Nov 2026).
 */
export const atTheGate = (minutes: number) =>
  liveFlight([], { legId: 'f1', state: 'ground', fix: fix(minutes - 1 / 3, SDF.lat, SDF.lng, { onGround: true }) })

```

**In `tests/map/liveTripMap.test.ts`, replace (1 of 2):**

```ts
import { pathPoints } from '../../src/map/flightPathDrawing'
import { pointsAlong } from '../../src/map/greatCircle'
import { fitRect } from '../../src/map/mapFit'
import { framingPoints, isArrivalEstimated, makeTripMap, type TripMap } from '../../src/map/tripMap'
import { LIVE_AIRPORTS as AIRPORTS, PHL, placeOf, SCHEDULE, SDF, SDF_PHL as F1 } from './liveTrip'
import { fix, liveFlight, MINUTE, point, START } from './madeUpFlights'

/** Seen north of the line, then far north of it, 40 minutes in: still in the air. */
```

**with:**

```ts
import { pathPoints } from '../../src/map/flightPathDrawing'
import { pointsAlong } from '../../src/map/greatCircle'
import { fitRect } from '../../src/map/mapFit'
import { stillOnGroundIn } from '../../src/map/tripActivity'
import { framingPoints, isArrivalEstimated, legStillOnGround, makeTripMap, type TripMap } from '../../src/map/tripMap'
import { atTheGate, FLYING, LIVE_AIRPORTS as AIRPORTS, liveTripMap, PHL, placeOf, SCHEDULE, SDF, SDF_PHL as F1 } from './liveTrip'
import { fix, liveFlight, MINUTE, point, START } from './madeUpFlights'

/** Seen north of the line, then far north of it, 40 minutes in: still in the air. */
```

**In `tests/map/liveTripMap.test.ts`, replace (2 of 2):**

```ts
    expect(live.y).toBeLessThan(schedule.y)
  })
})
```

**with:**

```ts
    expect(live.y).toBeLessThan(schedule.y)
  })
})

describe('a real plane still on the ground at its departure airport (the website’s own, Todd, 16 Nov 2026)', () => {
  const flightOf = (map: TripMap) => map.legs.find((l) => l.kind === 'flight')!

  it('is told while its leg is between its gates and the plane hasn’t left: the airport it waits at', () => {
    // Ten minutes after the plan's takeoff, and from the moment its leg begins.
    for (const minutes of [25, 1]) {
      const map = liveTripMap(START + minutes * MINUTE, atTheGate(minutes))
      expect(legStillOnGround(flightOf(map), START + minutes * MINUTE)).toBe(true)
      expect(stillOnGroundIn(map, START + minutes * MINUTE)).toMatchObject({ code: 'SDF', city: 'Louisville' })
    }
  })

  it('isn’t told of a plane at its gate before its leg begins: the pilot isn’t flying yet', () => {
    const map = liveTripMap(START - 10 * MINUTE, atTheGate(-10))
    expect(legStillOnGround(flightOf(map), START - 10 * MINUTE)).toBe(false)
    expect(stillOnGroundIn(map, START - 10 * MINUTE)).toBeNull()
  })

  it('isn’t told of a plane in the air, landed, on the ground somewhere else, or with no live data', () => {
    const landed = liveFlight([point(20, 38.6, -84.2), point(90, 39.8, -75.8)],
      { legId: 'f1', state: 'landed', landedAt: START + 100 * MINUTE, fix: fix(100, PHL.lat, PHL.lng, { onGround: true }) })
    // A diversion: on the ground in Cincinnati, 80 mi from Louisville.
    const elsewhere = liveFlight([], { legId: 'f1', state: 'ground', fix: fix(25 - 1 / 3, 39.05, -84.67, { onGround: true }) })
    for (const [live, minutes] of [[FLYING, 59], [landed, 103], [elsewhere, 25], [null, 25]] as const) {
      const now = START + minutes * MINUTE
      const map = liveTripMap(now, live)
      expect(stillOnGroundIn(map, now)).toBeNull()
      expect(legStillOnGround(flightOf(map), now)).toBe(false)
    }
  })
})
```

**In `tests/ui/SchedulePage.test.tsx`, replace (1 of 2):**

```tsx
// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Leg } from '../../src/engine/legs'
import { DAY } from '../../src/time/zoned'
import { SchedulePage } from '../../src/ui/SchedulePage'
import { testAirports } from '../fixtures/airports'
import { drive, duty, flight, H, pilot, place } from '../fixtures/legs'
import { stubAnimationFrames, visibleText } from '../fixtures/ui'

afterEach(() => {
  cleanup()
```

**with:**

```tsx
// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Leg, MoveLeg } from '../../src/engine/legs'
import type { LiveFlight } from '../../src/map/liveFlight'
import { makeMapFlight } from '../../src/map/mapFlight'
import { DAY } from '../../src/time/zoned'
import { SchedulePage } from '../../src/ui/SchedulePage'
import { testAirports } from '../fixtures/airports'
import { drive, duty, flight, H, pilot, place } from '../fixtures/legs'
import { stubAnimationFrames, visibleText } from '../fixtures/ui'
import { fix, liveFlight } from '../map/madeUpFlights'

afterEach(() => {
  cleanup()
```

**In `tests/ui/SchedulePage.test.tsx`, replace (2 of 2):**

```tsx
    expect(phone.listeners.size).toBe(0)
  })
})
```

**with:**

```tsx
    expect(phone.listeners.size).toBe(0)
  })
})

describe('SchedulePage with a real plane (Stage 3 spec §9)', () => {
  const first = LEGS[0] as MoveLeg
  /** Thursday's flight with `live` its real plane, which the plan has landing 10 minutes before the leg's end: the end is the real plane's. */
  const flightsWith = (live: LiveFlight) =>
    new Map([[first.id, makeMapFlight(first.start, first.end - 10 * 60_000, { lat: 38.17, lng: -85.74 }, { lat: 42.2, lng: -89.1 }, live)!]])
  const timesOf = (container: Element) => [...container.querySelectorAll('.leg-times')].map((e) => e.textContent)
  // One pilot for every render, so a new answer is all that changes.
  const PILOT = pilot('LEX', 'SDF')
  const pageWith = (flights?: ReturnType<typeof flightsWith>) =>
    <SchedulePage legs={LEGS} pilot={PILOT} now={at(7)} timeZone={NY} h24={false} airports={testAirports} onBack={() => {}}
      weekStart={0} flights={flights} />

  it('says "about" before a landing time that’s the real plane’s estimate, as the card does', () => {
    const { container } = render(pageWith(flightsWith(liveFlight([], { fix: fix(0, 40, -87) }))))
    const times = timesOf(container)
    expect(times[0]).toBe('6:15am edt – about 7:45am edt')
    expect(times.slice(1).some((t) => t?.includes('about'))).toBe(false)
  })

  it('says "about" as soon as a new answer makes the time an estimate, with the same legs', () => {
    const view = render(pageWith())
    expect(timesOf(view.container)[0]).toBe('6:15am edt – 7:45am edt')
    view.rerender(pageWith(flightsWith(liveFlight([], { fix: fix(0, 40, -87) }))))
    expect(timesOf(view.container)[0]).toBe('6:15am edt – about 7:45am edt')
  })

  it('says no "about" once the plane has landed, nor with no live data, as before', () => {
    const landed = liveFlight([], { state: 'landed', landedAt: first.end - 15 * 60_000, fix: fix(0, 42.2, -89.1, { onGround: true }) })
    expect(timesOf(render(pageWith(flightsWith(landed))).container)[0]).toBe('6:15am edt – 7:45am edt')
    cleanup()
    expect(timesOf(render(pageWith()).container)[0]).toBe('6:15am edt – 7:45am edt')
  })
})
```

**In `tests/ui/liveMapPage.test.tsx`, replace (1 of 2):**

```tsx
import { resetAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { TripMapCard } from '../../src/ui/TripMapCard'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { FLYING, liveTripMap } from '../map/liveTrip'
import { fix, MINUTE, START } from '../map/madeUpFlights'

afterEach(() => {
```

**with:**

```tsx
import { resetAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { TripMapCard } from '../../src/ui/TripMapCard'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { atTheGate, FLYING, liveTripMap } from '../map/liveTrip'
import { fix, MINUTE, START } from '../map/madeUpFlights'

afterEach(() => {
```

**In `tests/ui/liveMapPage.test.tsx`, replace (2 of 2):**

```tsx
    expect(slider().value).toBe(slider().max)
  })
})
```

**with:**

```tsx
    expect(slider().value).toBe(slider().max)
  })
})

describe('a real plane still on the ground at its departure airport (the website’s own, Todd, 16 Nov 2026)', () => {
  /** Ten minutes after the plan's takeoff, the plane still at its gate in Louisville. */
  const LATE = START + 25 * MINUTE
  const page = (t: number, live: Parameters<typeof liveTripMap>[1]) =>
    <TripMapPage map={liveTripMap(t, live)} now={t} viewerTz={NY} h24={false} day={1} days={1} land={null} onBack={() => {}} />
  const line = () => document.querySelector('.trip-timeline-time')?.textContent
  const slider = () => screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement

  it('heads the card "On the ground" for screen readers, not "In flight"', () => {
    card(LATE, atTheGate(25))
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('On the ground')
  })

  it('heads the card "In flight" in the air, and with no live data, as before', () => {
    card(IN_THE_AIR)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('In flight')
    cleanup()
    card(LATE, null as never)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('In flight')
  })

  it('says under the full map’s timeline that it’s on the ground there, now', () => {
    render(page(LATE, atTheGate(25)))
    expect(line()).toMatch(/^Fri 7:25\sAM · On the ground in Louisville$/)
    expect(slider().getAttribute('aria-valuetext')).toMatch(/^Friday 7:25\sAM, on the ground in Louisville$/)
  })

  it('says "Flying to" in a replay, which reads where the map has the plane', () => {
    render(page(LATE, atTheGate(25)))
    // A moment early in the flight, before the plane was seen at its gate.
    fireEvent.input(slider(), { target: { value: String(Number(slider().max) / 20) } })
    expect(line()).toMatch(/ · Flying to Philadelphia$/)
    expect(slider().getAttribute('aria-valuetext')).toMatch(/, flying to Philadelphia$/)
  })

  it('says "Flying to" in the air, and with no live data, as before', () => {
    render(page(IN_THE_AIR, FLYING))
    expect(line()).toMatch(/ · Flying to Philadelphia$/)
    cleanup()
    render(page(LATE, null))
    expect(line()).toMatch(/ · Flying to Philadelphia$/)
  })
})
```

**In `tests/ui/livePages.test.tsx`, replace (1 of 2):**

```tsx
import type { ScheduleHandle } from '../../src/ui/hooks/useSchedule'
import { PilotPages } from '../../src/ui/PilotPages'
import { FLYING, LIVE_AIRPORTS, SCHEDULE, SDF } from '../map/liveTrip'
import { fix, liveFlight, MINUTE, START } from '../map/madeUpFlights'

```

**with:**

```tsx
import type { ScheduleHandle } from '../../src/ui/hooks/useSchedule'
import { PilotPages } from '../../src/ui/PilotPages'
import { atTheGate, FLYING, LIVE_AIRPORTS, SCHEDULE, SDF } from '../map/liveTrip'
import { fix, liveFlight, MINUTE, START } from '../map/madeUpFlights'

```

**In `tests/ui/livePages.test.tsx`, replace (2 of 2):**

```tsx
  })
})
```

**with:**

```tsx
  })
})

describe('the status page with a real plane still on the ground at its departure airport (the website’s own, Todd, 16 Nov 2026)', () => {
  /** Ten minutes after the plan's takeoff, the plane still at its gate in Louisville. */
  const LATE = START + 25 * MINUTE
  const AT_THE_GATE = { flights: new Map([['f1', atTheGate(25)]]), clockOffset: 0 }

  it('says so in the narrative, with the countdown and "about" the landing time, and in the card’s heading', () => {
    vi.setSystemTime(LATE)
    const container = page(AT_THE_GATE)
    expect(container.querySelector('.narrative-text')?.textContent)
      // The countdown's digits, then its words for screen readers.
      .toMatch(/^Alex is still on the ground in Louisville on UPS flight 1234 to Philadelphia — landing in \d+h \d+m\d.* which is about \d{1,2}:\d\d[ap]m [A-Z]+\.$/)
    expect(container.querySelector('.trip-map-card h2')?.textContent).toBe('On the ground')
  })

  it('says flying, as before, once the plane is in the air, and with no live data', () => {
    expect(page(LIVE).querySelector('.narrative-text')?.textContent).toMatch(/^Alex is flying to Philadelphia on UPS flight 1234 from Louisville — /)
    cleanup()
    vi.setSystemTime(LATE)
    expect(page(null).querySelector('.narrative-text')?.textContent).toMatch(/^Alex is flying to Philadelphia on UPS flight 1234 from Louisville — /)
  })
})

describe('the Schedule page with a real plane (Stage 3 spec §9)', () => {
  afterEach(() => history.replaceState(null, '', '/'))

  it('says "about" before the landing time that’s the real plane’s estimate', () => {
    history.replaceState(null, '', '/#schedule')
    expect(page(LIVE).querySelector('.leg-times')?.textContent).toMatch(/ – about \d{1,2}:\d\d[ap]m [a-z]+$/)
  })

  it('says no "about" with no live data, as before', () => {
    history.replaceState(null, '', '/#schedule')
    expect(page(null).querySelector('.leg-times')?.textContent).toMatch(/ – \d{1,2}:\d\d[ap]m [a-z]+$/)
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/copy/activityWords.test.ts tests/copy/liveWords.test.ts tests/copy/narrativeAway.test.ts tests/copy/schedule.test.ts tests/engine/liveLegs.test.ts tests/facts/liveTripFacts.test.ts tests/map/liveTripMap.test.ts tests/ui/SchedulePage.test.tsx tests/ui/liveMapPage.test.tsx tests/ui/livePages.test.tsx
```

Expected: 24 of the 243 tests fail: `legStillOnGround`, `stillOnGroundFlight` and `cardHeading` aren't there yet, the words still say "flying", and the Schedule page has no "about".

- [x] **Step 3: Write the code.**

**In `src/copy/narrative.ts`, replace (1 of 2):**

```ts
  estimatedArrival?: number | null
}
```

**with:**

```ts
  estimatedArrival?: number | null
  /**
   * The flight under way, by its leg's id, while its real plane is still on the ground at its departure airport: the
   * sentence says so in place of "flying" (the website's own, Todd, 16 Nov 2026).
   */
  stillOnGroundFlight?: string | null
}
```

**In `src/copy/narrative.ts`, replace (2 of 2):**

```ts
      const fl = flightPhrase(f.airline, f.number)
      if (delay) {
```

**with:**

```ts
      const fl = flightPhrase(f.airline, f.number)
      // A late flight whose real plane hasn't left yet, delayed or not: "Alex is still on the ground in Rockford on UPS
      // flight 2963 to Anchorage — landing in 5h 37m which is about 6:58pm EST." (the website's own, Todd, 16 Nov 2026).
      if (ctx.stillOnGroundFlight === f.id) {
        return n.t(`${name} is still on the ground in `).b(city(f.dep)).t(`${fl || ' on the flight'} to `).b(city(f.arr))
          .t(' — landing in ').cd(f.end, delay ? changed : 'status').t(' which is ').time(f.end).t('.').spans
      }
      if (delay) {
```

**In `src/copy/schedule.ts`, replace:**

```ts
 * A row's second line (TimelineRowView.subtitle): "6:05am edt – 7:40am edt", or "06:05 edt – 07:40 edt" on 24-hour
 * devices. Each time carries the abbreviation in force then; the app puts today's on both (slice 3A §4.7).
 */
export function legTimes(start: number, end: number, timeZone: string, h24: boolean): string {
  return `${timeWithZone(start, timeZone, h24).toLowerCase()} – ${timeWithZone(end, timeZone, h24).toLowerCase()}`
}
```

**with:**

```ts
 * A row's second line (TimelineRowView.subtitle): "6:05am edt – 7:40am edt", or "06:05 edt – 07:40 edt" on 24-hour
 * devices. Each time carries the abbreviation in force then; the app puts today's on both (slice 3A §4.7). A landing
 * time that's the real plane's estimate (`isEndEstimated`) reads "about", as the status page's: "6:05am edt – about
 * 7:52am edt" (Stage 3 spec §9).
 */
export function legTimes(start: number, end: number, timeZone: string, h24: boolean, isEndEstimated = false): string {
  const about = isEndEstimated ? 'about ' : ''
  return `${timeWithZone(start, timeZone, h24).toLowerCase()} – ${about}${timeWithZone(end, timeZone, h24).toLowerCase()}`
}
```

**In `src/copy/tripMap.ts`, replace (1 of 2):**

```ts
import {
  dayCount, destinationsOf, isArrivalEstimated, legInMotion, nextFlight, pilotLocation, currentLeg, type AirportMark, type MapLeg, type TripMap,
} from '../map/tripMap'
```

**with:**

```ts
import {
  dayCount, destinationsOf, isArrivalEstimated, legInMotion, legStillOnGround, nextFlight, pilotLocation, currentLeg, type AirportMark, type MapLeg,
  type TripMap,
} from '../map/tripMap'
```

**In `src/copy/tripMap.ts`, replace (2 of 2):**

```ts

/** "Sat 1:40 PM · Layover in Denver": the line under the timeline, when and what (activity markers design §4.2). */
export function timelineLine(ms: number, activity: TripActivity | null, viewerTz: string, h24: boolean): string {
  const time = timelineTime(ms, viewerTz, h24)
  return activity ? `${time} · ${activityWords(activity)}` : time
}

/** "Saturday 1:40 PM, layover in Denver": the timeline's value for screen readers (activity markers design §4.3). */
export function timelineSpokenValue(ms: number, activity: TripActivity | null, viewerTz: string, h24: boolean): string {
  const time = `${WEEKDAYS[zonedParts(ms, viewerTz).weekday]} ${shortTimeText(ms, viewerTz, h24)}`
  if (!activity) return time
  const words = activityWords(activity)
  return `${time}, ${words.charAt(0).toLowerCase()}${words.slice(1)}`
}
```

**with:**

```ts

/**
 * The words under the timeline: the activity's, or "On the ground in Rockford" where the flight's real plane is still on
 * the ground at its departure airport, `stillOnGroundIn` (the website's own, Todd, 16 Nov 2026).
 */
function lineWords(activity: TripActivity | null, stillOnGroundIn: AirportMark | null): string | null {
  if (stillOnGroundIn) return `On the ground in ${stillOnGroundIn.city}`
  return activity ? activityWords(activity) : null
}

/**
 * "Sat 1:40 PM · Layover in Denver": the line under the timeline, when and what (activity markers design §4.2). While
 * the flight's real plane is still on the ground at its departure airport, `stillOnGroundIn`, "Mon 12:21 PM · On the
 * ground in Rockford" (the website's own, Todd, 16 Nov 2026).
 */
export function timelineLine(
  ms: number, activity: TripActivity | null, viewerTz: string, h24: boolean, stillOnGroundIn: AirportMark | null = null,
): string {
  const time = timelineTime(ms, viewerTz, h24)
  const words = lineWords(activity, stillOnGroundIn)
  return words ? `${time} · ${words}` : time
}

/** "Saturday 1:40 PM, layover in Denver": the timeline's value for screen readers (activity markers design §4.3), as the line under it. */
export function timelineSpokenValue(
  ms: number, activity: TripActivity | null, viewerTz: string, h24: boolean, stillOnGroundIn: AirportMark | null = null,
): string {
  const time = `${WEEKDAYS[zonedParts(ms, viewerTz).weekday]} ${shortTimeText(ms, viewerTz, h24)}`
  const words = lineWords(activity, stillOnGroundIn)
  if (!words) return time
  return `${time}, ${words.charAt(0).toLowerCase()}${words.slice(1)}`
}

/**
 * The map card's heading, for screen readers: "In flight", or "On the ground" while the flight's real plane is still
 * on the ground at its departure airport (the website's own, Todd, 16 Nov 2026); else "Trip recap" or "Trip map".
 */
export function cardHeading(map: TripMap, now: number): string {
  const leg = currentLeg(map)
  if (leg) return legStillOnGround(leg, now) ? 'On the ground' : 'In flight'
  return map.mode.kind === 'recap' ? 'Trip recap' : 'Trip map'
}
```

**In `src/engine/liveLegs.ts`, replace (1 of 2):**

```ts
import type { GeoPoint } from '../map/greatCircle'
import type { LiveFlight } from '../map/liveFlight'
import { isEstimate, makeMapFlight, mapFlightProgress, type MapFlight } from '../map/mapFlight'
import { isMove, type Leg } from './legs'
import type { DutyPeriod, Iata, Move, Schedule, Trip } from './types'
```

**with:**

```ts
import type { GeoPoint } from '../map/greatCircle'
import type { LiveFlight } from '../map/liveFlight'
import { isAtDeparture, isEstimate, makeMapFlight, mapFlightProgress, type MapFlight } from '../map/mapFlight'
import { isMove, type Leg } from './legs'
import type { DutyPeriod, Iata, Move, Schedule, Trip } from './types'
```

**In `src/engine/liveLegs.ts`, replace (2 of 2):**

```ts
  return leg ? leg.end : null
}
```

**with:**

```ts
  return leg ? leg.end : null
}

/**
 * The flight between its gates at `now` whose real plane is still on the ground at its departure airport, by its leg's
 * id: the narrative says so in place of "flying" (the website's own, Todd, 16 Nov 2026). Null with no such flight.
 */
export function stillOnGroundFlight(legs: Leg[], flights: ReadonlyMap<string, MapFlight>, now: number): string | null {
  if (flights.size === 0) return null
  const leg = legs.find((l) => {
    const flight = isMove(l) && l.start <= now && now < l.end ? flights.get(l.id) : undefined
    return flight != null && isAtDeparture(flight, now)
  })
  return leg ? leg.id : null
}
```

**In `src/facts/tripFacts.ts`, replace (1 of 3):**

```ts
import type { GeoPoint } from '../map/greatCircle'
import { mapFlightProgress } from '../map/mapFlight'
import { currentLeg, dayCount, legInMotion, type AirportMark, type MapLeg, type TripMap } from '../map/tripMap'
import { MINUTE } from '../time/zoned'
```

**with:**

```ts
import type { GeoPoint } from '../map/greatCircle'
import { currentLeg, dayCount, legInMotion, legStillOnGround, type AirportMark, type MapLeg, type TripMap } from '../map/tripMap'
import { MINUTE } from '../time/zoned'
```

**In `src/facts/tripFacts.ts`, replace (2 of 3):**

```ts
export function isStillOnGround(facts: TripFacts, leg: MapLeg, t: number): boolean {
  return !facts.isReplay && leg.flight != null && mapFlightProgress(leg.flight, t).phase === 'onGround'
}
```

**with:**

```ts
export function isStillOnGround(facts: TripFacts, leg: MapLeg, t: number): boolean {
  return !facts.isReplay && legStillOnGround(leg, t)
}
```

**In `src/facts/tripFacts.ts`, replace (3 of 3):**

```ts

/** Each started flight's milestones so far, newest flight first, then the totals: the trip so far, or the recap (§5.2, §5.5). */
export function tripSoFar(facts: TripFacts, t: number): TripSoFar {
  const started = facts.map.legs.filter((l) => l.kind === 'flight' && l.start <= t).reverse()
  const flights = started.flatMap((leg) => {
```

**with:**

```ts

/**
 * Each started flight's milestones so far, newest flight first, then the totals: the trip so far, or the recap (§5.2,
 * §5.5). A real plane still on the ground at its departure airport has passed none of its flight's, whatever the
 * schedule's times say (the website's own, Todd, 16 Nov 2026).
 */
export function tripSoFar(facts: TripFacts, t: number): TripSoFar {
  const started = facts.map.legs.filter((l) => l.kind === 'flight' && l.start <= t && !isStillOnGround(facts, l, t)).reverse()
  const flights = started.flatMap((leg) => {
```

**In `src/facts/tripFactsRows.ts`, replace (1 of 4):**

```ts
 * real plane it's a best guess, and its time reads "about" (best guesses design §2).
 */
```

**with:**

```ts
 * real plane it's a best guess, and its time reads "about" (best guesses design §2).
 *
 * The website's own (Todd, 16 Nov 2026): a real plane still on the ground at its departure airport has passed nothing,
 * and its time is a guess from a takeoff that hasn't happened: "about", and left out once that guess has gone by, as
 * halfway's is.
 */
```

**In `src/facts/tripFactsRows.ts`, replace (2 of 4):**

```ts
  if (time == null) return null
  return closestToHomeText(roundedMiles(closest.meters), time, t, facts.viewerTz, facts.h24, !isSeenAt(leg, distance))
}
```

**with:**

```ts
  if (time == null) return null
  const onGround = isStillOnGround(facts, leg, t)
  if (onGround && time <= t) return null
  return closestToHomeText(roundedMiles(closest.meters), time, t, facts.viewerTz, facts.h24, onGround || !isSeenAt(leg, distance))
}
```

**In `src/facts/tripFactsRows.ts`, replace (3 of 4):**

```ts
 * the great circle from where it is to the arrival airport (Stage 3 spec §8). A real plane still at its departure airport
 * has flown nothing yet: "2,788 mi to go" (the website's own, Todd, 16 Nov 2026).
 */
```

**with:**

```ts
 * the great circle from where it is to the arrival airport (Stage 3 spec §8). A real plane still at its departure airport
 * has flown nothing yet: "2,788 mi to go", and its halfway time is a guess from a takeoff that hasn't happened, "about"
 * (the website's own, Todd, 16 Nov 2026).
 */
```

**In `src/facts/tripFactsRows.ts`, replace (4 of 4):**

```ts
  const window = hasLiveData(leg) ? null : airborneWindow(leg.start, leg.end)
  const title = isStillOnGround(facts, leg, t) ? toGoText(Math.round(total)) : flownText(flown, Math.round(total) - flown)
  return factRow('distance', 'Path', title, [
    halfwayAt != null && halfwayAt > t ? halfwayText(halfwayAt, facts.viewerTz, facts.h24, !isSeenAt(leg, length / 2)) : null,
    window ? averageSpeedText(total / ((window.end - window.start) / HOUR)) : null,
```

**with:**

```ts
  const window = hasLiveData(leg) ? null : airborneWindow(leg.start, leg.end)
  const onGround = isStillOnGround(facts, leg, t)
  const title = onGround ? toGoText(Math.round(total)) : flownText(flown, Math.round(total) - flown)
  return factRow('distance', 'Path', title, [
    halfwayAt != null && halfwayAt > t ? halfwayText(halfwayAt, facts.viewerTz, facts.h24, onGround || !isSeenAt(leg, length / 2)) : null,
    window ? averageSpeedText(total / ((window.end - window.start) / HOUR)) : null,
```

**In `src/map/mapFlight.ts`, replace:**

```ts
/**
 * Whether `arrival`, the leg's gate arrival as it's shown, is the real plane's estimate, which the words mark with
```

**with:**

```ts
/**
 * Whether the real plane is still on the ground at its departure airport when this browser's clock says `now`: seen
 * there lately, and not yet in the air (spec §5.1's `onGround`).
 */
export const isAtDeparture = (flight: MapFlight, now: number): boolean => mapFlightProgress(flight, now).phase === 'onGround'

/**
 * Whether `arrival`, the leg's gate arrival as it's shown, is the real plane's estimate, which the words mark with
```

**In `src/map/tripActivity.ts`, replace (1 of 2):**

```ts
import { HOUR } from '../time/zoned'
import { isMoving, legInMotion, pilotLocation, type AirportMark, type GroundStop, type TripMap } from './tripMap'

```

**with:**

```ts
import { HOUR } from '../time/zoned'
import { isMoving, legInMotion, legStillOnGround, pilotLocation, type AirportMark, type GroundStop, type TripMap } from './tripMap'

```

**In `src/map/tripActivity.ts`, replace (2 of 2):**

```ts
/**
 * Before the first departure, home for a next trip, or base while the pilot waits there, else home or base by where
```

**with:**

```ts
/**
 * Where the pilot's flight waits at `now`, while it's between its gates and its real plane is still on the ground at its
 * departure airport: that airport, which the line under the timeline names in place of "Flying to" (the website's own,
 * Todd, 16 Nov 2026). Null otherwise. Now only: a replay's moment is flying, as the map has the plane.
 */
export function stillOnGroundIn(map: TripMap, now: number): AirportMark | null {
  const flight = map.legs.find((l) => l.kind === 'flight' && isMoving(l, now))
  return flight && legStillOnGround(flight, now) ? flight.origin : null
}

/**
 * Before the first departure, home for a next trip, or base while the pilot waits there, else home or base by where
```

**In `src/map/tripMap.ts`, replace (1 of 2):**

```ts
import { calendarDay } from '../time/zoned'
import { isEstimate, type MapFlight } from './mapFlight'
import { aimFractions, flatMapAngle } from './planeHeading'
```

**with:**

```ts
import { calendarDay } from '../time/zoned'
import { isAtDeparture, isEstimate, type MapFlight } from './mapFlight'
import { aimFractions, flatMapAngle } from './planeHeading'
```

**In `src/map/tripMap.ts`, replace (2 of 2):**

```ts

/** How far along the leg the schedule has the pilot, 0…1: a flight with the taxi allowances, a drive steadily. */
```

**with:**

```ts

/**
 * Whether the leg is between its gates at `now` while its real plane is still on the ground at its departure airport:
 * the flight is late leaving, and the words say "on the ground" in place of "flying" (the website's own, Todd, 16 Nov
 * 2026). It reads the live data at `now`, so it's for now only: a replay's moment reads where the map has the plane.
 */
export const legStillOnGround = (leg: MapLeg, now: number): boolean =>
  leg.flight != null && isMoving(leg, now) && isAtDeparture(leg.flight, now)

/** How far along the leg the schedule has the pilot, 0…1: a flight with the taxi allowances, a drive steadily. */
```

**In `src/ui/PilotPages.tsx`, replace (1 of 3):**

```tsx
import { buildLegs, type Leg } from '../engine/legs'
import { estimatedArrival, liveMapFlights, withLiveTimes } from '../engine/liveLegs'
import { safeSnapshot, type Snapshot } from '../engine/snapshot'
```

**with:**

```tsx
import { buildLegs, type Leg } from '../engine/legs'
import { estimatedArrival, liveMapFlights, stillOnGroundFlight, withLiveTimes } from '../engine/liveLegs'
import { safeSnapshot, type Snapshot } from '../engine/snapshot'
```

**In `src/ui/PilotPages.tsx`, replace (2 of 3):**

```tsx
  const estimated = ready ? estimatedArrival(ready.legs, ready.flights, now) : null
  const status = {
    snap, now, viewerTz, homeTz, h24, airports, weather, demo, celebrateKey, footer, notice, quickStatus, tripMap, land, facts,
    onOpenMap: mapPage.show, estimatedArrival: estimated,
  }
```

**with:**

```tsx
  const estimated = ready ? estimatedArrival(ready.legs, ready.flights, now) : null
  // The flight under way while its real plane is still at its departure airport: the narrative says "still on the
  // ground" (the website's own, Todd, 16 Nov 2026).
  const onGround = ready ? stillOnGroundFlight(ready.legs, ready.flights, now) : null
  const status = {
    snap, now, viewerTz, homeTz, h24, airports, weather, demo, celebrateKey, footer, notice, quickStatus, tripMap, land, facts,
    onOpenMap: mapPage.show, estimatedArrival: estimated, stillOnGroundFlight: onGround,
  }
```

**In `src/ui/PilotPages.tsx`, replace (3 of 3):**

```tsx
  }
  const view = { legs: listed, pilot: snap.pilot, now, timeZone: viewerTz, h24, airports }
  // Side by side, the schedule sits beside the cards, and nothing on the status page opens it (3C §4.3). Each layout
```

**with:**

```tsx
  }
  // The Schedule page says "about" of a landing time that's the real plane's estimate, as the cards do (Stage 3 spec §9).
  const view = { legs: listed, pilot: snap.pilot, now, timeZone: viewerTz, h24, airports, flights: ready?.flights }
  // Side by side, the schedule sits beside the cards, and nothing on the status page opens it (3C §4.3). Each layout
```

**In `src/ui/ScheduleView.tsx`, replace (1 of 5):**

```tsx
import type { Leg } from '../engine/legs'
import type { Pilot } from '../engine/types'
import { calendarDay, MINUTE } from '../time/zoned'
```

**with:**

```tsx
import type { Leg } from '../engine/legs'
import { isEstimatedArrival } from '../engine/liveLegs'
import type { Pilot } from '../engine/types'
import type { MapFlight } from '../map/mapFlight'
import { calendarDay, MINUTE } from '../time/zoned'
```

**In `src/ui/ScheduleView.tsx`, replace (2 of 5):**

```tsx
  focusOnOpen?: RefObject<HTMLElement>
}

```

**with:**

```tsx
  focusOnOpen?: RefObject<HTMLElement>
  /**
   * The flights Crewlu Cloud has seen, by leg id (Stage 3 spec §7.1): a landing time that's the real plane's estimate
   * reads "about", as on the status page (§9). None, as in the tests, lists the times as they are.
   */
  flights?: ReadonlyMap<string, MapFlight>
}

const NO_FLIGHTS: ReadonlyMap<string, MapFlight> = new Map()

```

**In `src/ui/ScheduleView.tsx`, replace (3 of 5):**

```tsx
 */
export function ScheduleView({ legs, pilot, now, timeZone, h24, airports, weekStart, focusOnOpen }: ScheduleViewProps) {
  const days = useMemo(() => scheduleDays(legs, timeZone), [legs, timeZone])
```

**with:**

```tsx
 */
export function ScheduleView({ legs, pilot, now, timeZone, h24, airports, weekStart, focusOnOpen, flights = NO_FLIGHTS }: ScheduleViewProps) {
  const days = useMemo(() => scheduleDays(legs, timeZone), [legs, timeZone])
```

**In `src/ui/ScheduleView.tsx`, replace (4 of 5):**

```tsx
          look: rowLook(leg, pilot, airports),
          times: legTimes(leg.start, leg.end, timeZone, h24),
          gap: i > 0 ? gapBefore(d.legs[i - 1], leg) : null,
```

**with:**

```tsx
          look: rowLook(leg, pilot, airports),
          times: legTimes(leg.start, leg.end, timeZone, h24, isEstimatedArrival(leg, flights)),
          gap: i > 0 ? gapBefore(d.legs[i - 1], leg) : null,
```

**In `src/ui/ScheduleView.tsx`, replace (5 of 5):**

```tsx
      })),
    [days, pilot, airports, timeZone, h24],
  )
```

**with:**

```tsx
      })),
    [days, pilot, airports, timeZone, h24, flights],
  )
```

**In `src/ui/StatusScreen.tsx`, replace (1 of 2):**

```tsx
  estimatedArrival?: number | null
}
```

**with:**

```tsx
  estimatedArrival?: number | null
  /**
   * The flight under way, by its leg's id, while its real plane is still on the ground at its departure airport: the
   * narrative says so in place of "flying" (the website's own, Todd, 16 Nov 2026).
   */
  stillOnGroundFlight?: string | null
}
```

**In `src/ui/StatusScreen.tsx`, replace (2 of 2):**

```tsx
  const inTheirPlace = () => [inFlightHeading.current, locationHeading.current, titleHeading.current].find((el) => el?.isConnected) ?? null
  const spans = safeNarrative(snap, { now: p.now, viewerTz: p.viewerTz, h24: p.h24, airports: p.airports, estimatedArrival: p.estimatedArrival })
  const airport = snap.status.airport
```

**with:**

```tsx
  const inTheirPlace = () => [inFlightHeading.current, locationHeading.current, titleHeading.current].find((el) => el?.isConnected) ?? null
  const spans = safeNarrative(snap, {
    now: p.now, viewerTz: p.viewerTz, h24: p.h24, airports: p.airports, estimatedArrival: p.estimatedArrival, stillOnGroundFlight: p.stillOnGroundFlight,
  })
  const airport = snap.status.airport
```

**In `src/ui/TripMapCard.tsx`, replace (1 of 2):**

```tsx
import { delayBannerText, spokenDelayBanner } from '../copy/flight'
import { arrivalLocalTime, cardChips, flightStatus, landsAt, statsItems, tripMapSummary } from '../copy/tripMap'
import type { GeoPoint } from '../map/greatCircle'
```

**with:**

```tsx
import { delayBannerText, spokenDelayBanner } from '../copy/flight'
import { arrivalLocalTime, cardChips, cardHeading, flightStatus, landsAt, statsItems, tripMapSummary } from '../copy/tripMap'
import type { GeoPoint } from '../map/greatCircle'
```

**In `src/ui/TripMapCard.tsx`, replace (2 of 2):**

```tsx
    <section class="card glass trip-map-card">
      <h2 ref={p.headingRef} class="sr-only" tabIndex={-1}>{leg ? 'In flight' : isRecap ? 'Trip recap' : 'Trip map'}</h2>
      <button type="button" class="trip-map-open" data-trip-map-open aria-label={summary} onClick={() => p.onOpenMap()}>
```

**with:**

```tsx
    <section class="card glass trip-map-card">
      <h2 ref={p.headingRef} class="sr-only" tabIndex={-1}>{cardHeading(p.map, p.now)}</h2>
      <button type="button" class="trip-map-open" data-trip-map-open aria-label={summary} onClick={() => p.onOpenMap()}>
```

**In `src/ui/TripTimeline.tsx`, replace (1 of 4):**

```tsx
import { timelineBlocks } from '../map/timelineBlocks'
import { activityAt } from '../map/tripActivity'
import type { TripMap } from '../map/tripMap'
```

**with:**

```tsx
import { timelineBlocks } from '../map/timelineBlocks'
import { activityAt, stillOnGroundIn } from '../map/tripActivity'
import type { TripMap } from '../map/tripMap'
```

**In `src/ui/TripTimeline.tsx`, replace (2 of 4):**

```tsx
  const activity = activityAt(map, t)
  // The blocks follow the trip and the pace alone: the clock's span, legs and waits are the map's. Worked out once
```

**with:**

```tsx
  const activity = activityAt(map, t)
  // Now, a late flight's real plane still at its departure airport is "On the ground" there. A replay's moment flies as
  // the map has the plane (the website's own, Todd, 16 Nov 2026).
  const waitingIn = isLive(clock) ? stillOnGroundIn(map, t) : null
  // The blocks follow the trip and the pace alone: the clock's span, legs and waits are the map's. Worked out once
```

**In `src/ui/TripTimeline.tsx`, replace (3 of 4):**

```tsx
          <TripTimelineBlocks blocks={blocks} progress={progressAt(clock, t)} />
          <input type="range" class="trip-timeline-slider" aria-label="Trip time" aria-valuetext={timelineSpokenValue(t, activity, viewerTz, h24)}
            min={0} max={Math.max(whole, 1)} step="any" value={offset} onKeyDown={onKeyDown}
```

**with:**

```tsx
          <TripTimelineBlocks blocks={blocks} progress={progressAt(clock, t)} />
          <input type="range" class="trip-timeline-slider" aria-label="Trip time" aria-valuetext={timelineSpokenValue(t, activity, viewerTz, h24, waitingIn)}
            min={0} max={Math.max(whole, 1)} step="any" value={offset} onKeyDown={onKeyDown}
```

**In `src/ui/TripTimeline.tsx`, replace (4 of 4):**

```tsx
      </div>
      <p class="trip-timeline-time" aria-hidden="true">{timelineLine(t, activity, viewerTz, h24)}</p>
      <div class="trip-timeline-row trip-timeline-settings">
```

**with:**

```tsx
      </div>
      <p class="trip-timeline-time" aria-hidden="true">{timelineLine(t, activity, viewerTz, h24, waitingIn)}</p>
      <div class="trip-timeline-row trip-timeline-settings">
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 243 tests pass. Then `npx tsc --noEmit`: nothing; and `npm test`: 175 test files and 3,608 tests pass.

- [x] **Step 5: Commit, on Todd's yes (after batch C's checkpoint).**

```bash
git add src/copy/narrative.ts src/copy/schedule.ts src/copy/tripMap.ts src/engine/liveLegs.ts src/facts/tripFacts.ts src/facts/tripFactsRows.ts src/map/mapFlight.ts src/map/tripActivity.ts src/map/tripMap.ts src/ui/PilotPages.tsx src/ui/ScheduleView.tsx src/ui/StatusScreen.tsx src/ui/TripMapCard.tsx src/ui/TripTimeline.tsx tests/copy/activityWords.test.ts tests/copy/liveWords.test.ts tests/copy/narrativeAway.test.ts tests/copy/schedule.test.ts tests/engine/liveLegs.test.ts tests/facts/liveTripFacts.test.ts tests/map/liveTrip.ts tests/map/liveTripMap.test.ts tests/ui/SchedulePage.test.tsx tests/ui/liveMapPage.test.tsx tests/ui/livePages.test.tsx
git commit -m "A plane still on the ground at its gate is told as on the ground under the timeline, on the status page and in the card's heading, and the Schedule page says "about" before a real plane's landing estimate (Todd's words, 16 Nov 2026)"
```

---

### Task 10: The review's fixes

The review of the whole change before this plan was written (see "How this plan was checked") found three things: the at-the-gate words waited for nothing, so an on-time flight taxiing out read "Still on the ground"; they now wait for the plan's takeoff time, as the bar's own label does, and as Todd's words were for. The sky row said "Flying into the night" of a plane at its gate: it's left out then. And the sun events of a flight with no record were kept without its height.

**Files:**
- Modify: `src/facts/tripFacts.ts`, `src/facts/tripFactsRows.ts`, `src/map/mapFlight.ts`
- Test: `tests/engine/liveLegs.test.ts`, `tests/facts/liveTripFacts.test.ts`, `tests/map/liveTripMap.test.ts`, `tests/ui/liveMapPage.test.tsx`, `tests/ui/livePages.test.tsx`

- [x] **Step 1: Write the tests.**

**In `tests/engine/liveLegs.test.ts`, replace:**

```ts

  it('is the flight between its gates whose plane hasn’t left, by its id: the narrative says so', () => {
    const schedule = scheduleOf(TURN_TRIP)
    for (const minutes of [25, 1]) {
      const now = START + minutes * MINUTE
      const flights = flightsFor(schedule, atTheGate(minutes))
      expect(stillOnGroundFlight(buildLegs(withLiveTimes(schedule, flights, now)), flights, now)).toBe('f1')
    }
  })
```

**with:**

```ts

  it('is the flight between its gates whose plane hasn’t left by the plan’s takeoff time, by its id: the narrative says so', () => {
    const schedule = scheduleOf(TURN_TRIP)
    const now = START + 25 * MINUTE
    const flights = flightsFor(schedule, atTheGate(25))
    expect(stillOnGroundFlight(buildLegs(withLiveTimes(schedule, flights, now)), flights, now)).toBe('f1')
  })

  it('is nothing while an on-time plane is still before the plan’s takeoff time: the narrative says flying, as before', () => {
    const schedule = scheduleOf(TURN_TRIP)
    const now = START + MINUTE
    const flights = flightsFor(schedule, atTheGate(1))
    expect(stillOnGroundFlight(buildLegs(withLiveTimes(schedule, flights, now)), flights, now)).toBeNull()
  })
```

**In `tests/facts/liveTripFacts.test.ts`, replace (1 of 3):**

```ts
import { makeGeography, type Geography } from '../../src/facts/geography'
import { COCKPIT_HORIZON, cockpitHorizonOnLeg, sunAltitudeOnLeg } from '../../src/facts/sky'
import { cardSummary, headline, makeTripFacts, showsLiveData, tripSoFar, type TripFacts } from '../../src/facts/tripFacts'
```

**with:**

```ts
import { makeGeography, type Geography } from '../../src/facts/geography'
import { COCKPIT_HORIZON, cockpitHorizonOnLeg, sunAltitudeOnLeg, sunEvents } from '../../src/facts/sky'
import { cardSummary, headline, makeTripFacts, showsLiveData, tripSoFar, type TripFacts } from '../../src/facts/tripFacts'
```

**In `tests/facts/liveTripFacts.test.ts`, replace (2 of 3):**

```ts

  it('with no live data, are the schedule’s, as before', () => {
```

**with:**

```ts

  it('at dusk, of a flight with no record, have the sunset seen from its own height, not another’s on its route and times', () => {
    // The status page makes a record from any fix in the air, so this flight, its plane at 25,000 ft with no record, is
    // made by hand: the sun events kept by route and times must still tell its height from the schedule's 35,000 ft.
    const scheduled = equatorFlight(0, 20, EQUINOX + 7 * 3_600_000, 'dusk')
    const live = movedOn(equatorLive(liveTime(10), { altitudeFt: 25_000 }), 7 * 3_600_000)
    const flight = makeMapFlight(scheduled.start, scheduled.end, scheduled.origin.place, scheduled.destination.place, live)
    if (!flight) throw new Error('The dusk flight has no plan')
    const lower = { ...scheduled, flight: { ...flight, record: null } }
    expect(cockpitHorizonOnLeg(lower)).not.toBe(COCKPIT_HORIZON)
    const fromCruise = factsOf(scheduled).sunEvents.dusk
    expect(fromCruise).toEqual(sunEvents(scheduled))
    expect(fromCruise?.[0]?.kind).toBe('sunset')
    // Seen from 25,000 ft its horizon is higher, and the sun sets sooner.
    expect(factsOf(lower).sunEvents.dusk).toEqual(sunEvents(lower))
    expect(factsOf(lower).sunEvents.dusk?.[0]?.time).toBeLessThan(fromCruise?.[0]?.time ?? -Infinity)
    // And the schedule's are still its own.
    expect(factsOf(scheduled).sunEvents.dusk).toEqual(fromCruise)
  })

  it('with no live data, are the schedule’s, as before', () => {
```

**In `tests/facts/liveTripFacts.test.ts`, replace (3 of 3):**

```ts

  it('says so from the moment its leg begins, before the plan’s takeoff', () => {
    expect(headline(atTheGate('10:05'), at('10:05'))).toBe('Still on the ground in Rockford')
  })
```

**with:**

```ts

  it('leaves out the sky’s row, as nothing is flying yet', () => {
    // The equator flight 7 hours later, at dusk: the plan's takeoff is at 17:15, and at 17:35 the plane is at its gate.
    const dusk = (isReplay: boolean) => {
      const scheduled = equatorFlight(0, 20, EQUINOX + 7 * 3_600_000, 'dusk')
      const flight = makeMapFlight(scheduled.start, scheduled.end, scheduled.origin.place, scheduled.destination.place, onTheGround(at('17:35')))
      if (!flight) throw new Error('The dusk flight has no plan')
      const progress = mapFlightProgress(flight, at('17:35'))
      return factsOf({ ...scheduled, start: progress.start, end: progress.end, flight }, { isReplay })
    }
    // In a replay the map has the schedule's plane in the air, flying into the sunset: the same leg has a sky row then.
    expect(row('sky', rowsAt(dusk(true), '17:35')).title).toBe('Flying into the night')
    expect(rowsAt(dusk(false), '17:35').map((r) => r.kind)).toEqual(['below', 'plane', 'distance', 'headed'])
  })

  it('says nothing of it before the plan’s takeoff: an on-time plane taxiing out reads as before', () => {
    // 10:05, ten minutes before the plan's takeoff: what's below the plane at the gate, and nothing flown yet.
    const theFacts = atTheGate('10:05')
    expect(headline(theFacts, at('10:05'))).toBe('Over Alpha')
    const rows = rowsAt(theFacts, '10:05')
    expect(row('below', rows).title).toBe('Over Alpha')
    expect(row('below', rows).detail).toMatch(/^Passes 35 mi from home at \d/)
    expect(row('distance', rows).title).toBe('0 mi flown · 1,382 to go')
    expect(row('distance', rows).detail).toMatch(/^Halfway at \d/)
  })
```

**In `tests/map/liveTripMap.test.ts`, replace:**

```ts

  it('is told while its leg is between its gates and the plane hasn’t left: the airport it waits at', () => {
    // Ten minutes after the plan's takeoff, and from the moment its leg begins.
    for (const minutes of [25, 1]) {
      const map = liveTripMap(START + minutes * MINUTE, atTheGate(minutes))
      expect(legStillOnGround(flightOf(map), START + minutes * MINUTE)).toBe(true)
      expect(stillOnGroundIn(map, START + minutes * MINUTE)).toMatchObject({ code: 'SDF', city: 'Louisville' })
    }
  })
```

**with:**

```ts

  it('is told once the plan’s takeoff time has gone by and the plane hasn’t left: the airport it waits at', () => {
    // Ten minutes after the plan's takeoff.
    const map = liveTripMap(START + 25 * MINUTE, atTheGate(25))
    expect(legStillOnGround(flightOf(map), START + 25 * MINUTE)).toBe(true)
    expect(stillOnGroundIn(map, START + 25 * MINUTE)).toMatchObject({ code: 'SDF', city: 'Louisville' })
  })

  it('isn’t told while an on-time plane is still before the plan’s takeoff time: it’s taxiing as the schedule has it', () => {
    // A minute after its leg begins, 14 before the plan's takeoff: Todd's words are for a plane late leaving.
    const map = liveTripMap(START + MINUTE, atTheGate(1))
    expect(legStillOnGround(flightOf(map), START + MINUTE)).toBe(false)
    expect(stillOnGroundIn(map, START + MINUTE)).toBeNull()
  })
```

**In `tests/ui/liveMapPage.test.tsx`, replace:**

```tsx

  it('says "Flying to" in a replay, which reads where the map has the plane', () => {
```

**with:**

```tsx

  it('says "Flying to", as before, while an on-time plane is still before the plan’s takeoff time', () => {
    // A minute after its leg begins, 14 before the plan's takeoff.
    render(page(START + MINUTE, atTheGate(1)))
    expect(line()).toMatch(/ · Flying to Philadelphia$/)
    expect(slider().getAttribute('aria-valuetext')).toMatch(/, flying to Philadelphia$/)
  })

  it('says "Flying to" in a replay, which reads where the map has the plane', () => {
```

**In `tests/ui/livePages.test.tsx`, replace:**

```tsx

  it('says flying, as before, once the plane is in the air, and with no live data', () => {
```

**with:**

```tsx

  it('says flying, as with no live data, while an on-time plane is still before the plan’s takeoff time', () => {
    // A minute after its leg begins, 14 before the plan's takeoff.
    const taxiing = START + MINUTE
    vi.setSystemTime(taxiing)
    const before = page(null).querySelector('.narrative-text')?.textContent
    cleanup()
    const container = page({ flights: new Map([['f1', atTheGate(1)]]), clockOffset: 0 })
    expect(container.querySelector('.narrative-text')?.textContent).toMatch(/^Alex is flying to Philadelphia on UPS flight 1234 from Louisville — /)
    expect(container.querySelector('.narrative-text')?.textContent).toBe(before)
    expect(container.querySelector('.trip-map-card h2')?.textContent).toBe('In flight')
  })

  it('says flying, as before, once the plane is in the air, and with no live data', () => {
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/engine/liveLegs.test.ts tests/facts/liveTripFacts.test.ts tests/map/liveTripMap.test.ts tests/ui/liveMapPage.test.tsx tests/ui/livePages.test.tsx
```

Expected: 7 of the 98 tests fail: the at-the-gate words show during an on-time taxi, the sky row shows at the gate, and two flights of one route share sun events whatever their heights.

- [x] **Step 3: Write the code.**

**In `src/facts/tripFacts.ts`, replace (1 of 3):**

```ts
import { legPlane } from './planePosition'
import { sunEvents, type SunEvent } from './sky'
import { longestFlight, totalsSoFar, wholeTotals, type SunEventsByLeg } from './tripTotals'
```

**with:**

```ts
import { legPlane } from './planePosition'
import { cockpitHorizonOnLeg, sunEvents, type SunEvent } from './sky'
import { longestFlight, totalsSoFar, wholeTotals, type SunEventsByLeg } from './tripTotals'
```

**In `src/facts/tripFacts.ts`, replace (2 of 3):**

```ts
const stories = new WeakMap<Geography, Map<string, LegStory>>()
/** Each flight's sun events, by its route and its delay-moved times: a new delay works them out again (§3.2). */
const sunEventsByRoute = new Map<string, SunEvent[]>()
```

**with:**

```ts
const stories = new WeakMap<Geography, Map<string, LegStory>>()
/** Each flight's sun events, by its route, its delay-moved times and its sky's height: a new delay works them out again (§3.2). */
const sunEventsByRoute = new Map<string, SunEvent[]>()
```

**In `src/facts/tripFacts.ts`, replace (3 of 3):**

```ts

function sunEventsOf(leg: MapLeg): SunEvent[] {
  const key = [pointKey(leg.origin.place), pointKey(leg.destination.place), leg.start, leg.end].join('|')
  let events = sunEventsByRoute.get(key)
```

**with:**

```ts

/**
 * The sun events of a flight with no record, kept by its route, its times and the height its sky is seen from: a fix at
 * its cruise moves them, so two flights alike but for that don't share them. With no live data it's 35,000 ft, as before.
 */
function sunEventsOf(leg: MapLeg): SunEvent[] {
  const key = [pointKey(leg.origin.place), pointKey(leg.destination.place), leg.start, leg.end, cockpitHorizonOnLeg(leg)].join('|')
  let events = sunEventsByRoute.get(key)
```

**In `src/facts/tripFactsRows.ts`, replace:**

```ts

function skyRow(facts: TripFacts, leg: MapLeg, t: number): FactRow | null {
  const next = (facts.sunEvents[leg.id] ?? []).find((e) => e.time > t) ?? null
```

**with:**

```ts

/**
 * The sky from the cockpit: the next sunrise or sunset, chasing the sun, the moon. Left out while the real plane is still
 * at its departure airport after the plan's takeoff time, as nothing says "flying" then (the website's own, Todd, 16
 * Nov 2026): its times would be the schedule's, for a plane that hasn't left.
 */
function skyRow(facts: TripFacts, leg: MapLeg, t: number): FactRow | null {
  if (isStillOnGround(facts, leg, t)) return null
  const next = (facts.sunEvents[leg.id] ?? []).find((e) => e.time > t) ?? null
```

**In `src/map/mapFlight.ts`, replace:**

```ts
/**
 * Whether the real plane is still on the ground at its departure airport when this browser's clock says `now`: seen
 * there lately, and not yet in the air (spec §5.1's `onGround`).
 */
export const isAtDeparture = (flight: MapFlight, now: number): boolean => mapFlightProgress(flight, now).phase === 'onGround'

```

**with:**

```ts
/**
 * Whether the real plane is still on the ground at its departure airport after the plan's takeoff time, when this
 * browser's clock says `now`: seen there lately, not yet in the air (spec §5.1's `onGround`), and late leaving, as its
 * bar says "Still on the ground". Before the plan's takeoff it's taxiing as the schedule has it, and nothing says so
 * (the website's own, Todd, 16 Nov 2026).
 */
export function isAtDeparture(flight: MapFlight, now: number): boolean {
  const { phase, label } = mapFlightProgress(flight, now)
  return phase === 'onGround' && label?.kind === 'stillOnGround'
}

```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 98 tests pass. Then `npx tsc --noEmit`: nothing; and `npm test`: 175 test files and 3,614 tests pass.

- [x] **Step 5: Batch C's review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Tasks 8 to 10, the views, the website's own and the review's fixes, against the spec's §8, §9 and §15, the best guesses design's §2 and §3, the app at `6d3e74e`, and this plan's list of where the website settles or differs. Make its fixes, rerun each task's tests, and record what it found under "Changes made during execution".

- [x] **Step 6: Batch C's checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && npm run build
```

Expected: 175 test files and 3,614 tests pass, and the build ends `✓ built`.

- [x] **Step 7: Commit, on Todd's yes.** Tasks 8 and 9's commits first. Where two tasks of this batch change one file (`src/facts/tripFacts.ts`: Tasks 9, 10; `src/facts/tripFactsRows.ts`: Tasks 8, 9, 10; `src/map/mapFlight.ts`: Tasks 9, 10; `src/ui/PilotPages.tsx`: Tasks 8, 9; `tests/engine/liveLegs.test.ts`: Tasks 9, 10; `tests/facts/liveTripFacts.test.ts`: Tasks 8, 9, 10; `tests/map/liveTripMap.test.ts`: Tasks 9, 10; `tests/ui/liveMapPage.test.tsx`: Tasks 9, 10; `tests/ui/livePages.test.tsx`: Tasks 9, 10), each commit takes the file as its own task left it (ground rule 10). Then:

```bash
git add src/facts/tripFacts.ts src/facts/tripFactsRows.ts src/map/mapFlight.ts tests/engine/liveLegs.test.ts tests/facts/liveTripFacts.test.ts tests/map/liveTripMap.test.ts tests/ui/liveMapPage.test.tsx tests/ui/livePages.test.tsx
git commit -m "The at-the-gate words wait for the plan's takeoff time, no sky row for a plane at its gate, and sun events kept by the height they're seen from (review of plan 3C-3)"
```

---

### Task 11: Todd looks at the demo scenes

The tests check the words and the rows. This is the look at them (spec §16.4).

- [x] **Step 1: Start the site with Apple's map.** The worktree has the MapKit token in `.env.local` from plan 3C-2 (git-ignored; it lasts to 22 Nov 2026: if the site's own map shows instead of Apple's, it has run out, and Todd makes another as the README says). The session starts the `crewluve-mapkit` server (`.claude/launch.json`, port 5182) with its preview tool, and gives Todd the addresses:
  - `http://localhost:5182/?demo=1&scene=live-ahead`, and the same with `#map` at the end
  - `http://localhost:5182/?demo=1&scene=live-ocean-gap#map`
  - `http://localhost:5182/?demo=1&scene=live-on-ground-late`, and with `#map`
  - `http://localhost:5182/?demo=1&scene=flying#map`, which should read as it always has.
- [x] **Step 2: Todd looks, on a computer and a phone,** at the card's chip and the full map's facts ("More facts"):
  - what's below the plane, the last-seen line while it's out of sight, the plane's row (and its height and speed only while it's seen in the air), the miles, halfway, and the credit under the facts (not on the card);
  - the crossings nobody saw, with "about";
  - in `live-on-ground-late`: "Still on the ground in Rockford", the line under the timeline, and the status page's sentence;
  - in a replay: no height or speed, and the plane where the record has it;
  - the Schedule page's "about".
- [x] **Step 3: Write down what was wrong.** Anything that needs a change goes in "Changes made during execution", is fixed in its own task's files with a test where a test can see it, and has Todd run the tests again.

---

### Task 12: The review of the whole branch, and the record

- [x] **Step 1: The whole branch's review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on this plan's commits as one thing, against the spec's §8, §9 and §15, the best guesses design's §2 and §3, the app at `6d3e74e`, and this plan's list of where it differs. Make its fixes, run `npm test` and `npm run build`, and record what it found.
- [x] **Step 2: Todd runs everything once more** (Task 10 Step 6's command), if the review changed anything.
- [x] **Step 3: This plan's record.** Under "Changes made during execution": each review, each of Todd's runs (the count and the time), what Task 11 turned up, and each commit's hash.
- [x] **Step 4: Commit, on Todd's yes.**

```bash
git add docs/superpowers/plans/2026-11-16-moving-map-stage3c3-website-facts.md
git commit -m "Plan 3C-3, the website's facts on the real plane, with its record"
```

---

### Task 13: Going live, on Todd's yes

Plans 3C-1, 3C-2 and 3C-3 go live together. Pushing to `main` publishes the site: `.github/workflows` tests and builds every push to `main`, then publishes it to Pages. **Nothing here runs without Todd's yes in the conversation, asked when this task is reached:** he decides then whether the app has followed a real flight (the spec's rollout, §17).

- [x] **Step 1: Ask Todd** whether to go live now. If not, stop: the branch stays as it is, and this task waits.
- [x] **Step 2: Bring the branch up to `main`.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git fetch origin && git merge-base --is-ancestor origin/main HEAD && echo "fast-forward"
```

Expected: `fast-forward`. If it isn't (`main` has moved on since `ee8f0cb`), merge it in here: `git merge origin/main`. If any file conflicts, STOP and tell Todd. Then run `npm test && npm run build`.

- [ ] **Step 3: Todd runs everything** (Task 10 Step 6's command) on the branch as it will go live.
- [ ] **Step 4: Push the branch to `main`, on Todd's yes.** A fast-forward only; never force.

```bash
git push origin claude/trip-map-live-598046:main
```

- [ ] **Step 5: Watch the deploy** (`gh run watch` on the run the push started) until it succeeds. If it fails, tell Todd at once with its log: the site stays as it was until a deploy succeeds.
- [ ] **Step 6: Look at the live site** with Todd, at `https://crewluve.crewlu.net/?demo=1&scene=live-ahead#map` and `…scene=flying#map`: the real plane, its facts and the credit, and the schedule-only scene as before.
- [ ] **Step 7: The record.** Under "Changes made during execution": the push's commit, the deploy's run and time, and what Todd saw. Commit the plan on his yes and push it (a fast-forward only), as Step 4.

---

## What plan 3C-4 takes from this one

- **Every event is a `Milestone` with `isEstimate`,** told on real paths too, its time where the plan has the plane where nobody saw it. The list newest first, the flight in the air set apart ("In the air now", "In the air" in a replay), and "Trip so far" said once are the best guesses design's §4, the app's `5ad717f`.
- **The latest event** shown large on the map is the app's latest event design (`a78e841`, `a94ed20`).
- **`TripFacts.isReplay`** says whether a moment is a replay's, and `showsLiveData` whether a flight of the trip has live data.
- **A plane still at its gate** has no events listed (`isStillOnGround`).

## Changes made during execution

**Run in session `68f03a67` (16 Nov 2026), from the plan's own text** by the planning session's `run_steps.py` (tests first, seen failing as each Step 2 says, then the code). After each task every file it touched was the same as the copy tested after that task.

- **Task 1:** the worktree as expected (`0c5c639`, only this plan untracked).
- **Batch A (Tasks 2 to 5), 5:27 PM:** each task's counts as the plan says: 27, 36, 37 and 55 tests; `tsc --noEmit` clean each time; `npm test` 166 / 3,450, 167 / 3,465, 169 / 3,484, 171 / 3,505. Task 4's `src/copy/tripMap.ts` was kept aside before Task 5 (ground rule 10); it is `stages/after-4`'s.
- **Batch A's review** (`superpowers:code-reviewer`, sonnet): nothing critical, nothing important that fails on its own. **No change made.**
  - It found `PlanePosition`, `MapLeg+Course`, `LegStory` and `Milestone` the app's line for line, the units consistent, a flight with no live data unchanged (`legPlane(...).distance` is the old `legDistanceMeters × legProgress`), and the aircraft table identical.
  - *Between Tasks 3 and 7* a live flight's milestones read the route's great-circle story with the record's times (`storyOf` drops the flight; `milestones` gets the whole leg), so on a path longer than the great circle a crossing's time would come early. That is the in-between Task 3 names ("Until the store (Task 7), a live flight keeps the route's story"); it never goes live alone (Task 13), and Task 7's store replaces it.
  - Minor, left: the import cycle `copy/facts` → `copy/tripMap` → `copy/factsTrip` → `copy/facts` is safe while every use is inside a function (known when the plan was written); `const { flight: _, ...route }` would trip a no-unused-vars rule, but the project has no linter.
  - It asked whether the sky's 25,000 and 60,000 ft edges are pinned: they are (`tests/facts/liveSky.test.ts`, 24,999, 25,000, 60,000 and 60,001 ft).
- **Batch A's checkpoint:** Todd chose "Run it in my Terminal, then commit": `npm test` at 5:30 PM, 171 test files and 3,505 tests passed.
- **Batch A's commits:** Task 2 `3c8d78b`, Task 3 `1aae15b`, Task 4 `0f9a422` (with `src/copy/tripMap.ts` as Task 4 left it), Task 5 `9a61e0c`. Each commit's files are the same as tested after its task.
- **Batch B (Tasks 6 and 7), 5:40 PM:** 63 and 32 tests; `tsc --noEmit` clean; `npm test` 172 / 3,536 and 174 / 3,556. Task 6's `src/facts/tripFacts.ts` was kept aside before Task 7; it is `stages/after-6`'s.
- **Batch B's review** (`superpowers:code-reviewer`, sonnet): nothing critical or important. **No change made.**
  - It found right: the headline's order (the app's, with "Still on the ground" leading), the rows, the plane's row (never in a replay), "Averaging about" only with no live data, a flight with no live data unchanged, the store's key (the app's) and every rule of the plan's list for it, and the status page's `useMemo` store above its early return.
  - Minor, left: *an air return* (a fresh ground fix back at the departure airport after takeoff) would read "Still on the ground in Rockford". After Task 10 the rule is the engine's own phase and label (`isAtDeparture`: `onGround` and `stillOnGround`), which already put "Still on the ground" on the flight's bar (plans 3C-1, 3C-2, the shared rules), so the facts agree with the bar; telling a return apart is the engine's, for later. A store past 20 entries with more than 20 real legs on the map scans each render (cheap). A story up to a minute old can put a place a few miles off past where the plane was last seen, as in the app.
  - Test gaps it named, none hiding a likely bug: the page's test proves one store reaches every render but not the minute's pace at page level; a second, different geography after the first; sun events asked twice with no store.
- **Batch B's checkpoint:** Todd chose "Run it in my Terminal, then commit": `npm test` at 5:39 PM, 174 test files and 3,556 tests passed.
- **Batch B's commits:** Task 6 `fc2b422` (with `src/facts/tripFacts.ts` as Task 6 left it), Task 7 `9c08c53`. Each commit's files are the same as tested after its task.
- **Batch C (Tasks 8 to 10), about 5:50 PM:** 75, 243 and 98 tests; `tsc --noEmit` clean; `npm test` 175 / 3,575, 175 / 3,608 and 175 / 3,614; `npm run build` built. Task 8's and Task 9's files were kept aside as each task left them; they are `stages/after-8`'s and `stages/after-9`'s.
- **Batch C's review** (`superpowers:code-reviewer`, sonnet): nothing critical or important. **No change made.**
  - It found right: the at-the-gate rule is one predicate in all four places (an on-time taxi has no label before the plan's takeoff; a landed plane, one elsewhere and any leg but the one under way are left out; a replay keeps "Flying to"); the Schedule page's "about" (not after landing, not at the plan's time); the credit only with live data and only under the full map's facts, its spoken sentence beside it; a replay's facts made once a render, with the replay's plane; a flight with no live data unchanged.
  - Minor, already in "Left for later": "Trip so far" on the full map counts a cockpit sunset the schedule had during a plane's delay at its gate (its sunsets so far follow the schedule's times); a replay's sky is seen from the newest fix's height (one height for the whole flight, as the app).
  - Minor, left: the sun events' cache key holds the cruise height, so a flight with a fix and no record makes them again at each step of a step climb (bounded at 200, cheap).
  - Test gaps it named: the trip's sunset count at the gate (above), and `isAtDeparture` with a clock offset that isn't zero (it goes through `mapFlightProgress`, whose offset the plane's tests cover).
- **Batch C's checkpoint:** Todd chose "Run it in my Terminal, then commit": `npm test && npm run build` at 5:46 PM, 175 test files and 3,614 tests passed, `✓ built`.
- **Batch C's commits:** Task 8 `8b014c6`, Task 9 `bf28241` (each with its files as its own task left them), Task 10 `fdbf015`. Each commit's files are the same as tested after its task.
- **Task 11, Todd's look:** the `crewluve-mapkit` server (5182, Apple's map) from the worktree. The session read each scene first: `live-on-ground-late` (the status sentence, "On the ground", "Still on the ground in Rockford", the plane's row with no height, "2,788 mi to go · Halfway at about 8:11 PM", no sky row, only the earlier flight listed, the credit, "On the ground in Rockford" under the timeline); `live-ocean-gap` ("Over Northwest Territories", "Last seen over Alberta · 45 min ago", "1,880 mi flown · 922 to go", the crossings nobody saw with "about"); `live-ahead` ("Over Indiana", "35,000 ft · 530 mph", "168 mi flown · 162 to go"); `flying` as before (no plane's row, "Averaging about 290 mph", no credit); no console errors. **Todd: "Looks good"** (5:48 PM). Nothing to change.
- **Task 12, the whole branch's review** (`superpowers:code-reviewer`, sonnet, on `0c5c639..fdbf015` as one change): nothing critical or important. **No change made,** so Todd's run of Task 10 Step 6 stands (Step 2 not needed).
  - It swept the facts and the card's sentence, now and in a replay, from 3 hours before a flight to 1 hour after, for a normal flight, a one-point path, a missing fix (with and without a trail), a plane last seen 2.5 hours before, a landed plane, a plane on the ground late and early, and a height that's NaN: no exception, no NaN, no "undefined". "About" comes from one test (`isEstimate(flight, leg.end)`) on the card, the status sentence, the facts and the Schedule page; "on the ground" from one (`isAtDeparture`) in all four places and the facts. A flight with no live data reads as before. A real flight's story takes about 22 ms (Louisville to Frankfurt, the real geography), at most once a minute.
  - Minor, left (added to "Left for later"): between touchdown and the gate, the facts still say "Over …" and "0 to go" while the card says it landed (the app's facts do the same, and a flight with no live data always has); a replay at the present moment, while the plane waits at its gate, reads the schedule's plane, as the map draws it; no one test reads every surface at one moment. And, recorded already: a story up to a minute old after a gap closes.
- **Task 13, going live:** Todd chose "Go live: run it, then push if it passes" (16 Nov 2026, about 6 PM). `origin/main` was still `ee8f0cb`, so the branch is a fast-forward of it (Step 2: no merge needed).

## Self-review

- **Spec coverage.**
  - §8, the story along the path, made again as it grows, at most once a minute: Tasks 3 and 7.
  - §8, what's below, in the air and out of sight (the best guesses design's §2): Tasks 2, 5 and 6.
  - §8 and the best guesses design's §3, every event told, a best guess with "about" where nobody saw it: Tasks 3, 5 and 6.
  - §8, halfway as half the path's whole length; the distance row; the plane's row with the aircraft's names: Tasks 2, 5 and 6.
  - §8, the sky along the record, and the trip's totals along real paths: Task 4. Weather on landing was already the live arrival's (plan 3C-2).
  - §8, the credit: Tasks 5 and 8.
  - §9, the headline's order and the card's sentence: Task 6, with Task 5's words.
  - §15, the card's sentence while out of sight, and the plane's row and the credit as sentences: Tasks 5, 6 and 8.
  - §16.4, vitest on the shared cases and the words: every task; the demo scenes by eye: Task 11.
  - §17, the rollout: Task 13, on Todd's yes.
  - Plan 3C-2's "What plan 3C-3 takes": the facts on the path and the record (Tasks 2 to 7), the moment and replays (Tasks 6 and 8), "about" (Tasks 3, 5 and 9), "last seen" and the headline's order (Tasks 5 and 6), the credit (Task 8), the miles (Task 4), and the at-the-gate words and the Schedule page's "about" (Tasks 6, 9 and 10).
- **Not covered here, on purpose:** the newest-first list and the latest event (plan 3C-4); the app's key, popup and at-the-gate words (the app's own later plan).
- **Placeholders:** none. Every step's code is the tested file or a replacement made from it.
- **What could it break?**
  - A flight with no live data must read exactly as before. Every test of the facts, the words and the views that was there before passes unchanged, the shared `facts-cases.json` among them, and the new tests pin it: the same rows, the same story and the same sun events.
  - The status page now owns a store and makes the facts of a real path along it: the first story at once, then no oftener than once a minute.
  - The full map makes a replay's facts once a render while a replay plays.
  - The words change for any family whose pilot's plane is still at its gate after its takeoff time.

## Left for later

- **The milestones are worked out on every call:** each frame of a replay on the full map, about 0.5 to 1 ms a frame on an eight-flight trip. A cache by story and record would remove it.
- **A flight with a real path but no live phase** (briefly, after a stale fix) reads the story at the path's distance and the city at the great circle's place, as the app does.
- **A past flight whose live state stays "airborne"** would keep "about" on the Schedule page, as the status page would.
- **A plane at its gate** has its guessed times worked from a takeoff time already past, so they come out early; its cockpit sunsets so far follow the schedule's times. The pilot's marker, the plane's popup and the old in-flight card are as they were.
- **A replay paused at the very moment the plane was last seen** reads as an estimate ("Last seen 1 min ago"), from a rounding of a few micrometres past where it was seen, as the map draws it.
- **A place smaller than a city of a million:** "Last seen near Gander" needs towns in `geography.json`, as in the app.
- **The plane's height at each past moment:** the sun's events use one height for the whole flight, as in the app.
- **Landed, not yet at the gate:** the facts' headline and first row still say what's below ("Over …") and the distance "0 to go", while the card says the plane landed. The app's facts do the same, and so has a flight with no live data during its taxi-in (whole-branch review).
- **An air return** (a fresh ground fix back at the departure airport after takeoff) reads "Still on the ground in Rockford", as the flight's bar already says "Still on the ground": the engine's phase and label don't tell a return apart (batch B's review).
- **A replay at the present moment** while the plane waits at its gate reads the schedule's plane, as the map draws it, where now reads "Still on the ground" (whole-branch review).
- **No one test reads every surface at one moment** (the status sentence, the card's heading, the line under the timeline, the facts and the Schedule page); each is tested on the same cases in its own file (whole-branch review).
- **The sun events' cache key holds the cruise height,** so a flight with a fix and no record makes them again at each step of a step climb (bounded, cheap; batch C's review).
- **The engine's and the map's own "Left for later"** (plans 3C-1 and 3C-2) hold.
