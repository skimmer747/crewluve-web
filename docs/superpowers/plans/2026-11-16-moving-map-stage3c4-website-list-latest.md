# Moving Map Stage 3C-4 (the Website, the List and the Latest Event) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the trip's events as the app now does. The facts' list puts the newest event first, sets the flight in the air apart with a border and "In the air now", and says "Trip so far" once. The newest event of the flight in the air shows large on the card and the full map, with how long ago it was, until the next one, and the camera keeps the plane clear of it. Then this plan goes live, on Todd's yes.

**Architecture:**
- **The list** (`tripSoFar` in `src/facts/tripFacts.ts`, drawn by `src/ui/TripSoFarList.tsx`): under each flight its events, newest first. The flight between its gates is set apart, with a border and "In the air now" ("In the air" in a replay), and listed even before its first event. Earlier flights sit plain underneath. A best guess is drawn lighter and slanted. "Trip so far" is said once (`hasTripSoFarRow`).
- **The latest event** (`latestEvent` in `src/facts/tripFacts.ts`, in words from `src/copy/facts.ts`): what it was, how long ago, and a sentence for screen readers, which also ends the card's sentence. Beside it the headline leaves events out (`includesEvents`); the shared cases read it with them, as before.
- **The banner** (`src/ui/LatestEventBanner.tsx`) on the card and the full map. `bannerLayout` puts the key to the two planes beside it, or just under it where they don't fit side by side; the two together are the map's top inset.
- **The camera keeps the plane in view** (`keptInView` in `src/map/tripMapDrawing.ts`, `slideToShow` in `src/map/mapFit.ts`): the pilot's marker on the ground, and in flight the real plane and its ghost, on Apple's map and the site's own.

**Tech Stack:** Preact 10, TypeScript 5.9 (strict), Vite 5, Vitest 3 (node for the pure code, happy-dom for the views). No new package.

**Sources (read only):**
- **The best guesses design,** in the Crewluv repo (`~/Dev/Crewluv`, at `9f06e71`): `docs/superpowers/specs/2026-11-15-crewluve-facts-best-guesses-design.md`, its §4 (the list), and §3's best guess drawn lighter. Its §2 and §3 were plan 3C-3's.
- **The latest event design,** same repo: `docs/superpowers/specs/2026-11-15-crewluve-latest-event-design.md`.
- **The app's code at `9f06e71`** is this plan's reference: the best guesses plan's Task 3 (`docs/superpowers/plans/2026-11-15-facts-best-guesses.md`, commit `5ad717f`) and the latest event plan (`docs/superpowers/plans/2026-11-15-latest-event.md`, commits `a78e841` and `a94ed20`). Nothing after `9f06e71`.
- **Plan 3C-3** (`docs/superpowers/plans/2026-11-16-moving-map-stage3c3-website-facts.md`, on this branch): its "What plan 3C-4 takes from this one" and its "Left for later".

**This is the fourth and last of four plans for the website** (Todd's choice, 15 Nov 2026): 3C-1 the engine, 3C-2 the map and 3C-3 the facts (done, and live on `main` at `ed33ce5`); **3C-4 the list and the latest event** (this plan).

**Going live:** in this plan's last task, and only on Todd's yes then.

**How this plan was checked.** Every code block here comes from a file that was run before the plan was put together. None was typed into the plan by hand: a script made each replacement from the tested files and built the plan.
- **A scratch copy of this branch** at `ed33ce5`, with this plan's files laid over it.
  - Before: 175 test files and 3,614 tests, all passing.
  - With this plan: 176 test files and 3,674 tests, all passing. `tsc --noEmit` finds nothing, and `npm run build` builds.
  - The shared cases (`live-cases.json`, `facts-cases.json`) are unchanged, and pass: the headline they read keeps its events.
- **Task by task:** the copy was kept as it stood after each of Tasks 2 to 6, and type-checked and tested each time. Every one passed: after Task 2, 175 test files and 3,624 tests; after Task 3, 175 and 3,638; after Task 4, 176 and 3,658; after Task 5, 176 and 3,660; and after Task 6, 176 and 3,674. Each task's tests were also run before its code, and failed as its Step 2 says: 22 of 104 for Task 2; 17 of 107 for Task 3; for Task 4, the banner's file, which can't load, and 6 of the other 80; 1 of 13 for Task 5; and 31 of 122 for Task 6.
- **107 deliberate breaks** were made in the new code, one at a time, each task's in turn (21, 29, 30, 5 and 22), and 106 fail at least one test. The one that can't be caught is in Task 3: picking the last event along the path instead of the newest by time. On the website an event's time is read from its place along the path (by the record, else the schedule), so the two pick the same event, but for two at the very same moment, which no case has. The rule by time is the app's, and is kept.
- **Reviewed** by `superpowers:code-reviewer` (sonnet), Tasks 2 to 5, before the plan was put together. Nothing critical. One important: the key hopped between beside the banner and under it as the "when" under the banner grew; fixed in Task 6. Two minor, both as the app has them, left (see "Left for later"): the list's top line goes by the story's order and the banner by time; and the card's top chip gives way to the banner.
- **Seen in a browser,** in the scratch copy's dev server: the full map on a phone's width and a computer's, and the list, as they should be. One bug: on a phone's card (375 px wide, `live-ocean-gap`), the plane and its ghost sat under the banner. The card's map is 220 px tall, and the band left clear was about 87 px. Fixed in Task 6, with the key's hop, and seen again at 375 by 812: the plane and its ghost in the band under the key, above the bottom chip.
- **The plan itself** is checked by a script: every step of Tasks 2 to 6, followed in order on the branch's files at `ed33ce5`, gives every file as tested after each task. Followed again on a fresh copy of those files, a task at a time, tests first, every file came out the same as tested, each task's tests failed and passed as its Steps 2 and 4 say, and the copy's tests (176 files, 3,674 tests), `tsc --noEmit` and the build passed.
- **Not checked:** nothing called Crewlu Cloud or adsb.lol. Nothing was seen on a real phone: the phone was a browser at a phone's width. Not seen in a browser: the card on a computer, a replay's banner, and the key's steady place after Task 6; their tests check them. Task 6's fixes have had no review yet: batch B's is their first. Todd's look is Task 7.

**Where this plan settles details, or differs from the app.** Plan 3C-3's list holds; what's new:
- **The key and the banner** (Todd, 16 Nov 2026, "A: key just under the banner"). The app has no key yet. The banner sits where the app puts it: on the card in the map's top corner, in the top chip's place; on the full map under the pill. The key to the two planes stays at the map's top right where it fits beside the banner with a gap, as on a computer, and moves just under the banner, still at the right, where it doesn't, as on a phone. With no banner, the key is where it always was.
- **The key's place stays put while one event shows** (Task 6). It goes by the wider of the event's title and the widest "when" ("About 88 h 88 min ago"), measured in the banner's own font, so it doesn't hop as "Just now" grows to "About 1 h 5 min ago". The banner itself is as wide as what it shows.
- **The full map's banner is centred over the open map,** clear of a side panel open over its left edge. The app centres it under the pill, but the site's pill sits at the left of its bar.
- **The banner, and the key under it, are the map's top inset,** so the camera keeps the plane clear of both, as the app keeps it clear of the banner.
- **The camera's slide keeps the plane in the band** (Task 6). Where the clear part is too thin to frame the trip in, as on a phone's card, the view slides to show the real plane and its ghost there, or the real plane alone where both don't fit, or the schedule's plane; on the ground the pilot's marker, as before. It slides by whole pixels, so a plane moving each second moves the camera only once it has moved a pixel. Both maps do it.
- **The card's sentence** has "Latest: crossed into Canada, 12 minutes ago." before its closing "Opens the full map.", where the app's ends with it.
- **The list's events and totals are in the text's own colour,** as the app's, so a best guess can be drawn lighter (grey) and slanted. They were grey before.
- **No largest-text layout:** the banner's title wraps. The app moves its chips below the map at the largest text sizes; the website has no such layout.
- **"In the air now" during an on-time taxi-out:** the flight is "In the air now" from when it leaves its gate, as the app has it ("between its gates"); the site says "flying" then too.
- **A plane still at its gate after its takeoff time** (Todd, 16 Nov 2026, "Leave it out until it takes off"): its flight is left out of the list, with no "In the air now", until it takes off, as plan 3C-3 left out its events; once in the air it's listed, with the border and the tag. It has no banner, as it has passed no event.
- **With nothing to list,** as on a layover while no flight has an event yet, where the rows say "Trip so far", the list draws nothing (Task 5).

**Questions for Todd:** answered on 16 Nov 2026: where the key goes at a phone's width while the banner shows ("A: key just under the banner"); and a plane still at its gate after its takeoff time ("Leave it out until it takes off"). For the rest, copy the app. Plan 3C-3's answers stand.

---

## Ground rules for whoever runs this plan

These come from Todd's standing instructions. They override the skill's defaults.

1. **Work only in this worktree:** `/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046`, on its branch `claude/trip-map-live-598046`, at `ed33ce5` or later.
   - Never edit the main checkout, `/Users/toddanderson/Dev/Crewluve Website`: its untracked plan file isn't this work's.
   - `~/Dev/Crewluv` is shared with other sessions. Only read it: change, stash, reset or switch nothing there.
2. **Never commit without Todd's yes in the conversation,** and then only the task's own files, by path. **Never push, and never merge into `main`,** but in Task 9, on Todd's yes then.
3. **The tests:** the session runs them as it works (`npx vitest run <files>`, `npm test`, `npm run build`). At each batch's checkpoint, Todd runs the batch's command himself. Don't change files while he's running them, and don't ask for a run until the files are final.
4. **The shared cases are the judge.** `tests/fixtures/trip-map/live-cases.json` and `facts-cases.json` are the app's, never edited. If a case fails, the code is wrong. If you believe a case is wrong, STOP and tell Todd.
5. **Copy the code as written.** It was run as it stands. A replacement is exact: its text is in the file once. If it isn't, stop: the file has changed since this plan was written.
6. **Nothing here calls Crewlu Cloud or adsb.lol.** Every test uses a stand-in, and the tests can't reach the network. Change nothing in Crewlu Cloud's live Supabase project, and don't read it.
7. **Unchanged:** every request to Crewlu Cloud still goes through the door and its guard (`tests/data/doorRules.test.ts` and `doorRulesScan.test.ts` must pass), no `innerHTML`, no download, no `npm install`.
8. **Reviewers:** dispatch `superpowers:code-reviewer` with `model: "sonnet"`.
9. **No release note.** The website has none; Task 9 says what went live in this plan's record.
10. **One commit to a task.** Where two tasks of one batch change the same file, a task's commit takes the file as that task left it. So before a task's Step 1, copy aside every file it changes that an earlier task of its batch changed (that copy is the earlier task's version), and stage the copy for the earlier task's commit with `git update-index --cacheinfo 100644,$(git hash-object -w <copy>),<path>`, as plan 3C-3's tasks were committed.

## File map

| File | Tasks | Responsibility |
|---|---|---|
| `src/facts/factRow.ts` | modify (2, 3, 4) | the list's shape (each flight's events newest first, and its tag); the latest event; the full map's facts carry it |
| `src/copy/facts.ts` | modify (2, 3, 6) | "In the air now"; an event's title, when it was and its sentence; the widest "when" |
| `src/facts/tripFacts.ts` | modify (2, 3, 4) | the list newest first, the flight in the air set apart, "Trip so far" once; the latest event; the headline without events; the card's sentence |
| `src/facts/tripFactsRows.ts` | modify (4) | the full map's facts at a moment, with the latest event |
| `src/ui/TripSoFarList.tsx` | modify (2, 5) | the border, the tag and the best guesses; nothing drawn with nothing to list |
| `src/styles/tripMap.css` | modify (2, 4, 6) | the list's border, tag and best guesses; the banner; its widest "when", laid out unseen |
| `src/ui/LatestEventBanner.tsx` | create (4), modify (6) | the banner; where the key goes beside it; the size the key and the camera go by |
| `src/ui/hooks/useSizeOf.ts`, `src/ui/hooks/useHeightOf.ts` | create, modify (4) | an element's width and height; its height from them |
| `src/ui/PlaneKey.tsx` | modify (4) | the key's top while it's under the banner |
| `src/ui/TripMapCard.tsx`, `src/ui/TripMapPage.tsx` | modify (4, 6) | the banner on the card and the full map, the key under it, the camera clear of both |
| `src/map/tripMapDrawing.ts`, `src/map/mapFit.ts`, `src/map/appleMapPlan.ts` | modify (6) | what the camera keeps in view, and the slide that shows it |
| `src/ui/AppleTripMap.tsx`, `src/ui/TripMapSvg.tsx` | modify (6) | both maps keep the plane and its ghost in the clear part |
| `tests/copy/facts.test.ts`, `tests/facts/*.test.ts`, `tests/map/*.test.ts`, `tests/ui/*.test.tsx` | create / modify | each task's tests, named in its Files |

## Batches

Review with `superpowers:code-reviewer` (sonnet) after each batch, then Todd runs that batch's command, then ask to commit:

- **A, the facts and the words:** Tasks 2 and 3. The list changes for every family; nothing shows the banner yet, but the card's sentence for screen readers ends with the latest event.
- **B, the views and the fixes:** Tasks 4 to 6. The banner on the card and the full map, the key under it at a phone's width, the empty list, and the review's fixes.

Then Task 7, Todd's look at the demo scenes; Task 8, the review of the whole branch and this plan's record; and Task 9, going live, on Todd's yes.

---

### Task 1: Before starting

- [x] **Step 1: Check the worktree and the branch.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git status --short && git branch --show-current && git log --oneline -1
```

Expected: nothing changed but this plan's file, `claude/trip-map-live-598046`, and `ed33ce5` or a later commit of this plan's.

- [x] **Step 2: Read plan 3C-3's "What plan 3C-4 takes from this one"** and its "Left for later", the best guesses design's §4, and the latest event design (both in `~/Dev/Crewluv`, read only).

---

### Task 2: The list: newest first, the flight in the air set apart, and "Trip so far" once

Under each flight, the list puts the newest event first, so the latest is at the top without scrolling. The flight between its gates stands out: a border round it, and an "In the air now" tag beside its name ("In the air" in a replay, `inTheAirTag`). It's listed even before its first event. Earlier flights sit plain underneath, newest first. A best guess is drawn lighter and slanted, so the list's events and totals now take the text's own colour. "Trip so far" shows once: where the rows already have a "Trip so far" row (on a layover, on a drive), the list doesn't say it again (`hasTripSoFarRow`). The best guesses design's §4, the app's `5ad717f`. Todd's answer (16 Nov 2026), "Leave it out until it takes off": a real plane still at its gate after its takeoff time has its flight left out of the list, with no tag, until it's in the air.

**Files:**
- Modify: `src/copy/facts.ts`, `src/facts/factRow.ts`, `src/facts/tripFacts.ts`, `src/styles/tripMap.css`, `src/ui/TripSoFarList.tsx`
- Test: `tests/copy/facts.test.ts`, `tests/facts/liveTripFacts.test.ts`, `tests/facts/tripFacts.test.ts`, `tests/ui/FactsBody.test.tsx`

- [x] **Step 1: Write the tests.**

**In `tests/copy/facts.test.ts`, replace (1 of 2):**

```ts
  aircraftText, averageSpeedText, belowWords, chaseText, closestToHomeText, cockpitCountdown, cockpitEventText, flightTitle, flownText,
  flyingInto, groundSunText, halfwayText, heightAndSpeedText, landsText, lastSeenLine, LIVE_CREDIT, midLine, milestoneHeadline, milestoneLine,
  moonText, SPOKEN_LIVE_CREDIT, spokenLastSeen, stillOnGroundText, timeDifferenceText, toGoText,
```

**with:**

```ts
  aircraftText, averageSpeedText, belowWords, chaseText, closestToHomeText, cockpitCountdown, cockpitEventText, flightTitle, flownText,
  flyingInto, groundSunText, halfwayText, heightAndSpeedText, inTheAirTag, landsText, lastSeenLine, LIVE_CREDIT, midLine, milestoneHeadline, milestoneLine,
  moonText, SPOKEN_LIVE_CREDIT, spokenLastSeen, stillOnGroundText, timeDifferenceText, toGoText,
```

**In `tests/copy/facts.test.ts`, replace (2 of 2):**

```ts
    expect(flightTitle(home)).toBe('Cologne → Louisville')
  })
```

**with:**

```ts
    expect(flightTitle(home)).toBe('Cologne → Louisville')
  })

  it('tags the flight between its gates "In the air now", but not in a replay (best guesses design §4)', () => {
    expect(inTheAirTag(false)).toBe('In the air now')
    expect(inTheAirTag(true)).toBe('In the air')
  })
```

**In `tests/facts/liveTripFacts.test.ts`, replace (1 of 7):**

```ts
import { describe, expect, it } from 'vitest'
import { rowSentence, type FactRow, type FactRowKind } from '../../src/facts/factRow'
import { makeGeography, type Geography } from '../../src/facts/geography'
```

**with:**

```ts
import { describe, expect, it } from 'vitest'
import { rowSentence, type FactRow, type FactRowKind, type FactsAtMoment } from '../../src/facts/factRow'
import { makeGeography, type Geography } from '../../src/facts/geography'
```

**In `tests/facts/liveTripFacts.test.ts`, replace (2 of 7):**

```ts

describe('the trip so far with a real plane, and whether to credit adsb.lol (Stage 3 spec §8)', () => {
  it('counts the miles along the real path, and lists real times', () => {
    const soFar = tripSoFar(facts('11:10'), at('11:10'))
    expect(soFar.flights[0]?.milestones).toEqual([`Crossed into Bravo · 6:55${AM}`])
    expect(soFar.totals).toBe('Day 1 of 1 · 475 mi')
```

**with:**

```ts

/** The text of each event the trip so far lists under its first flight. */
const listed = (theFacts: TripFacts, t: string) => tripSoFar(theFacts, at(t)).flights[0]?.events.map((e) => e.text)

describe('the trip so far with a real plane, and whether to credit adsb.lol (Stage 3 spec §8, best guesses design §4)', () => {
  it('counts the miles along the real path, and lists real times', () => {
    const soFar = tripSoFar(facts('11:10'), at('11:10'))
    expect(soFar.flights[0]?.events.map((e) => e.text)).toEqual([`Crossed into Bravo · 6:55${AM}`])
    expect(soFar.flights[0]?.events.map((e) => e.isEstimate)).toEqual([false])
    expect(soFar.totals).toBe('Day 1 of 1 · 475 mi')
```

**In `tests/facts/liveTripFacts.test.ts`, replace (3 of 7):**

```ts

  it('in a replay, counts as far as the record has the plane', () => {
    const soFar = tripSoFar(facts('11:10', { isReplay: true }), at('10:35'))
    // At 10:35 it hadn't crossed into Bravo yet.
    expect(soFar.flights).toEqual([])
    expect(soFar.totals).toBe('Day 1 of 1 · 173 mi')
  })

  it('lists a crossing nobody saw with "about"', () => {
    expect(tripSoFar(facts('11:10', { unseen: [4, 6.5] }), at('11:10')).flights[0]?.milestones).toEqual([`Crossed into Bravo · about 6:55${AM}`])
  })
```

**with:**

```ts

  it('sets the flight in the air apart, even before its first event', () => {
    const now = tripSoFar(facts('10:35'), at('10:35'))
    expect(now.flights.map((f) => f.tag)).toEqual(['In the air now'])
    // At 10:35 it hasn't crossed into Bravo yet.
    expect(now.flights[0]?.events).toEqual([])

    // A replay's moment isn't now. It counts as far as the record has the plane.
    const replayed = tripSoFar(facts('11:10', { isReplay: true }), at('10:35'))
    expect(replayed.flights.map((f) => f.tag)).toEqual(['In the air'])
    expect(replayed.totals).toBe('Day 1 of 1 · 173 mi')
  })

  it('lists the newest event first', () => {
    expect(listed(facts('12:30'), '12:30')).toEqual([
      `Closest to home, 35 mi · 8:07${AM}`, `Out over the Test Sea · 7:51${AM}`, `Halfway · 7:35${AM}`, `Crossed into Bravo · 6:55${AM}`,
    ])
  })

  it('lists a crossing nobody saw as a best guess, with "about"', () => {
    // Nobody saw it from 4° E to 6.5° E. On the straight join it crossed into Bravo at 10:55.
    const events = tripSoFar(facts('11:10', { unseen: [4, 6.5] }), at('11:10')).flights[0]?.events
    expect(events?.map((e) => e.text)).toEqual([`Crossed into Bravo · about 6:55${AM}`])
    expect(events?.map((e) => e.isEstimate)).toEqual([true])
  })

  it('while it’s out of sight, lists what the plan has happened', () => {
    // Last seen at 4.375° E at 10:50. By the plan it crossed into Bravo at 10:55.
    expect(listed(facts('10:50', { now: '11:01' }), '11:01')).toEqual([`Crossed into Bravo · about 6:55${AM}`])
  })
```

**In `tests/facts/liveTripFacts.test.ts`, replace (4 of 7):**

```ts

  it('lists none of the leg’s crossings in the trip so far, as nothing of it is flown', () => {
    const soFar = tripSoFar(atTheGate('10:28', { geography: border }), at('10:28'))
```

**with:**

```ts

  it('leaves the flight out of the trip so far until it takes off, as nothing of it is flown: no crossing, and no "In the air now"', () => {
    const soFar = tripSoFar(atTheGate('10:28', { geography: border }), at('10:28'))
```

**In `tests/facts/liveTripFacts.test.ts`, replace (5 of 7):**

```ts
    expect(soFar.totals).toBe('Day 1 of 1')
  })
```

**with:**

```ts
    expect(soFar.totals).toBe('Day 1 of 1')
    // Before the plan's takeoff it's the flight between its gates, as the app has it, and set apart.
    expect(tripSoFar(atTheGate('10:05', { geography: border }), at('10:05')).flights.map((f) => f.tag)).toEqual(['In the air now'])
    // Once it's seen in the air it's set apart, with what it has passed.
    expect(tripSoFar(facts('10:35', { now: '10:35' }), at('10:35')).flights.map((f) => f.tag)).toEqual(['In the air now'])
  })
```

**In `tests/facts/liveTripFacts.test.ts`, replace (6 of 7):**

```ts
  it('in a replay, lists them where the map has the plane: the schedule’s, as it has no record', () => {
    expect(tripSoFar(atTheGate('10:28', { geography: border, isReplay: true }), at('10:28')).flights[0]?.milestones)
      .toEqual([`Crossed into Bravo · 6:24${AM}`])
  })
```

**with:**

```ts
  it('in a replay, lists them where the map has the plane: the schedule’s, as it has no record', () => {
    const soFar = tripSoFar(atTheGate('10:28', { geography: border, isReplay: true }), at('10:28'))
    expect(soFar.flights.map((f) => f.tag)).toEqual(['In the air'])
    expect(soFar.flights[0]?.events.map((e) => e.text)).toEqual([`Crossed into Bravo · 6:24${AM}`])
  })
```

**In `tests/facts/liveTripFacts.test.ts`, replace (7 of 7):**

```ts

  it('of a flight with no live data, are the same in a replay as they were', () => {
    for (const leg of [equatorFlight(0, 20), equatorLiveLeg(null, at('11:10'))]) {
      for (const t of ['10:05', '10:35', '11:10', '12:07', '13:20']) {
        expect(factsAtMoment(factsOf(leg, { isReplay: true }), at(t), at('11:10'))).toEqual(factsAtMoment(factsOf(leg), at(t), at('11:10')))
      }
```

**with:**

```ts

  it('of a flight with no live data, are the same in a replay as they were, but for the tag that says it’s now', () => {
    // The flight in the air is "In the air now", and in a replay "In the air" (best guesses design §4).
    const asReplay = (moment: FactsAtMoment): FactsAtMoment => ({
      ...moment,
      tripSoFar: { ...moment.tripSoFar, flights: moment.tripSoFar.flights.map((f) => ({ ...f, tag: f.tag && 'In the air' })) },
    })
    for (const leg of [equatorFlight(0, 20), equatorLiveLeg(null, at('11:10'))]) {
      for (const t of ['10:05', '10:35', '11:10', '12:07', '13:20']) {
        expect(factsAtMoment(factsOf(leg, { isReplay: true }), at(t), at('11:10'))).toEqual(asReplay(factsAtMoment(factsOf(leg), at(t), at('11:10'))))
      }
```

**In `tests/facts/tripFacts.test.ts`, replace (1 of 4):**

```ts
import {
  cardSummary, forecastFor, headline, isRecapOver, makeTripFacts, recapLongestLine, recapTiles, sheetHeadline, tripSoFar,
} from '../../src/facts/tripFacts'
import { airportMark, makeTripMap, type MapLeg } from '../../src/map/tripMap'
import { AIRPORTS, at, EUROPE, HOUR } from '../map/tripMapLegs'
import { box, EQUATOR, equatorFlight, flightMap, mark } from './factsTestData'
import { dogLeg, equatorLive, equatorLiveLeg, liveTime } from './liveFacts'
```

**with:**

```ts
import {
  cardSummary, forecastFor, hasTripSoFarRow, headline, isRecapOver, makeTripFacts, recapLongestLine, recapTiles, sheetHeadline, tripSoFar,
} from '../../src/facts/tripFacts'
import { factRows } from '../../src/facts/tripFactsRows'
import { airportMark, makeTripMap, type MapLeg, type TripMap } from '../../src/map/tripMap'
import { AIRPORTS, at, drive, EUROPE, HOUR } from '../map/tripMapLegs'
import { appGeography, box, EQUATOR, equatorFlight, flightMap, mark } from './factsTestData'
import { dogLeg, equatorLive, equatorLiveLeg, liveTime } from './liveFacts'
```

**In `tests/facts/tripFacts.test.ts`, replace (2 of 4):**

```ts
}

```

**with:**

```ts
}

const europeMap = (now: number, options: { isNextTrip?: boolean; isRecap?: boolean } = {}) =>
  makeTripMap(EUROPE, { isNextTrip: options.isNextTrip ?? false, isRecap: options.isRecap, home: 'SDF', now, airports: AIRPORTS })!

```

**In `tests/facts/tripFacts.test.ts`, replace (3 of 4):**

```ts

describe('the trip so far (Stage 2 spec §5.2, §5.5)', () => {
  it('lists this flight’s milestones, then the totals', () => {
    const soFar = tripSoFar(equatorFacts(), t('12:30'))
    expect(soFar.flights.map((f) => f.title)).toEqual(['TST1 · E0 → E20'])
    expect(soFar.flights[0].milestones).toEqual([
      `Crossed into Bravo · 7:00${AM}`, `Halfway · 7:45${AM}`, `Out over the Test Sea · 8:03${AM}`, `Closest to home, 35 mi · 8:21${AM}`,
    ])
    expect(soFar.totalsTitle).toBe('Trip so far')
```

**with:**

```ts

describe('the trip so far (Stage 2 spec §5.2, §5.5; best guesses design §4)', () => {
  it('lists this flight’s events newest first, as the flight in the air, then the totals', () => {
    const soFar = tripSoFar(equatorFacts(), t('12:30'))
    expect(soFar.flights.map((f) => f.title)).toEqual(['TST1 · E0 → E20'])
    // Newest first, so the latest is at the top, and the flight is the one in the air.
    expect(soFar.flights[0].events.map((e) => e.text)).toEqual([
      `Closest to home, 35 mi · 8:21${AM}`, `Out over the Test Sea · 8:03${AM}`, `Halfway · 7:45${AM}`, `Crossed into Bravo · 7:00${AM}`,
    ])
    // The schedule is told as it is.
    expect(soFar.flights[0].events.map((e) => e.isEstimate)).toEqual([false, false, false, false])
    expect(soFar.flights[0].tag).toBe('In the air now')
    expect(soFar.totalsTitle).toBe('Trip so far')
```

**In `tests/facts/tripFacts.test.ts`, replace (4 of 4):**

```ts

  it('lists only the milestones that have happened', () => {
    expect(tripSoFar(equatorFacts(), t('11:50')).flights[0].milestones).toHaveLength(2)
  })
```

**with:**

```ts

  it('lists only the events that have happened', () => {
    expect(tripSoFar(equatorFacts(), t('11:50')).flights[0].events).toHaveLength(2)
  })

  it('lists the flight in the air before its first event, and an earlier flight only with an event', () => {
    // The equator flight has left the gate at 10:00 and crosses into Bravo at 11:00.
    expect(tripSoFar(equatorFacts(), t('10:30')).flights).toEqual([{ id: 'eq', title: 'TST1 · E0 → E20', tag: 'In the air now', events: [] }])
    // On the ground in Cologne the first flight is done, and with no story it has no event.
    const europe = makeTripFacts(europeMap(at(12)), { geography: null, comparisons: null, viewerTz: NY, h24: false })
    expect(tripSoFar(europe, at(12)).flights).toEqual([])
    expect(tripSoFar(europe, at(4)).flights.map((f) => [f.title, f.tag])).toEqual([['UPS201 · Louisville → Cologne', 'In the air now']])
  })

  it('lists earlier flights plain underneath the flight in the air, newest first', () => {
    // On the way home from Dubai, with the site's own geography, so each earlier flight has crossed something.
    const facts = makeTripFacts(europeMap(at(60)), { geography: appGeography(), comparisons: null, viewerTz: NY, h24: false })
    const soFar = tripSoFar(facts, at(60))
    expect(soFar.flights.map((f) => [f.title, f.tag])).toEqual([
      ['UPS203 · Dubai → Louisville', 'In the air now'], ['UPS202 · Cologne → Dubai', null], ['UPS201 · Louisville → Cologne', null],
    ])
    expect(soFar.flights.slice(1).every((f) => f.events.length > 0)).toBe(true)
  })

  it('on a layover, says "Trip so far" once, in the rows', () => {
    // The rows have "Trip so far" on a layover, so it isn't said again under the list (best guesses design §4).
    const facts = makeTripFacts(europeMap(at(12)), { geography: null, comparisons: null, viewerTz: NY, h24: false, day: 1, days: 4 })
    expect(factRows(facts, at(12), at(12)).some((r) => r.kind === 'tripSoFar')).toBe(true)
    expect(hasTripSoFarRow(facts, at(12))).toBe(true)
    expect(tripSoFar(facts, at(12)).totals).toBeNull()
    // In flight the rows have none, so it's under the list.
    expect(factRows(facts, at(4), at(4)).some((r) => r.kind === 'tripSoFar')).toBe(false)
    expect(tripSoFar(facts, at(4)).totals).toMatch(/^Day 1 of 4 · [\d,]+ mi$/)
  })

  it('knows whether the rows have a "Trip so far" row, at every half hour of a trip, a trip ahead, a recap and a drive', () => {
    const maps: TripMap[] = [
      europeMap(at(0)),
      europeMap(at(-24), { isNextTrip: true }),
      europeMap(at(0), { isRecap: true }),
      makeTripMap([drive('d', 'LEX', 'SDF', 0, 1)], { isNextTrip: false, home: null, now: at(0), airports: AIRPORTS })!,
    ]
    let checked = 0
    for (const map of maps) {
      // With a day to tell, a "Trip so far" row always has something to say where there is one.
      const facts = makeTripFacts(map, { geography: EQUATOR, comparisons: null, viewerTz: NY, h24: false, day: 1, days: 4 })
      for (let half = -60; half <= 200; half++) {
        const moment = at(half / 2)
        expect(hasTripSoFarRow(facts, moment), `${map.mode.kind} at ${half} half hours`).toBe(
          factRows(facts, moment, moment).some((r) => r.kind === 'tripSoFar'),
        )
        checked++
      }
    }
    expect(checked).toBe(4 * 261)
  })
```

**In `tests/ui/FactsBody.test.tsx`, replace (1 of 2):**

```tsx
const below = factRow('below', 'MapPin', 'Over Bravo, near Testville', ['Passes 35 mi from home at 8:21 AM'])
const headed = factRow('headed', 'AirplaneLanding', 'Lands Cologne 9:30 PM', [null, '6 hours ahead of you'])
const soFar: TripSoFar = {
  flights: [{ id: 'f1', title: 'UPS201 · Louisville → Cologne', milestones: ['Crossed into Canada · 1:12 PM', 'Halfway · 4:12 PM'] }],
  totalsTitle: 'Trip so far',
  totals: 'Day 1 of 4 · 2,140 mi',
}
```

**with:**

```tsx
const below = factRow('below', 'MapPin', 'Over Bravo, near Testville', ['Passes 35 mi from home at 8:21 AM'])
const headed = factRow('headed', 'AirplaneLanding', 'Lands Cologne 9:30 PM', [null, '6 hours ahead of you'])
const soFar: TripSoFar = {
  flights: [{
    id: 'f1', title: 'UPS201 · Louisville → Cologne', tag: null,
    events: [{ text: 'Halfway · 4:12 PM', isEstimate: false }, { text: 'Crossed into Canada · 1:12 PM', isEstimate: false }],
  }],
  totalsTitle: 'Trip so far',
  totals: 'Day 1 of 4 · 2,140 mi',
}
```

**In `tests/ui/FactsBody.test.tsx`, replace (2 of 2):**

```tsx
    expect(screen.queryByText(/adsb\.lol/)).toBeNull()
  })
})
```

**with:**

```tsx
    expect(screen.queryByText(/adsb\.lol/)).toBeNull()
  })
})

describe('the trip so far’s list (best guesses design §3, §4)', () => {
  const inTheAir: TripSoFar = {
    flights: [
      {
        id: 'f2', title: 'UPS202 · Cologne → Dubai', tag: 'In the air now',
        events: [{ text: 'Out over the Persian Gulf · about 9:05 AM', isEstimate: true }, { text: 'Crossed into Iran · 8:40 AM', isEstimate: false }],
      },
      { id: 'f1', title: 'UPS201 · Louisville → Cologne', tag: null, events: [{ text: 'Crossed into Canada · 1:12 PM', isEstimate: false }] },
    ],
    totalsTitle: 'Trip so far',
    totals: 'Day 2 of 4 · 6,100 mi',
  }

  it('sets the flight in the air apart with a border, and its tag beside its name in its heading', () => {
    const { container } = render(<FactsBody rows={[]} tripSoFar={inTheAir} />)
    const sections = [...container.querySelectorAll('.trip-so-far-flight')]
    expect(sections.map((s) => s.classList.contains('in-the-air'))).toEqual([true, false])
    expect(sections[0].querySelector('.trip-so-far-tag')?.textContent).toBe('In the air now')
    expect(screen.getByRole('heading', { name: 'UPS202 · Cologne → Dubai In the air now' })).toBeTruthy()
    // An earlier flight sits plain underneath, with no tag.
    expect(sections[1].querySelector('.trip-so-far-tag')).toBeNull()
    expect(screen.getByRole('heading', { name: 'UPS201 · Louisville → Cologne' })).toBeTruthy()
  })

  it('lists each flight’s events in the order the facts give, newest first, a best guess drawn lighter and slanted', () => {
    const { container } = render(<FactsBody rows={[]} tripSoFar={inTheAir} />)
    const lines = [...container.querySelectorAll('.trip-so-far-flight li')]
    expect(lines.map((li) => li.textContent)).toEqual(['Out over the Persian Gulf · about 9:05 AM', 'Crossed into Iran · 8:40 AM', 'Crossed into Canada · 1:12 PM'])
    expect(lines.map((li) => li.classList.contains('estimate'))).toEqual([true, false, false])
  })

  it('shows the flight in the air before its first event, with no empty list', () => {
    const { container } = render(<FactsBody rows={[]} tripSoFar={{ ...inTheAir, flights: [{ ...inTheAir.flights[0], events: [] }] }} />)
    expect(container.querySelector('.trip-so-far-flight.in-the-air .trip-so-far-tag')?.textContent).toBe('In the air now')
    expect(container.querySelector('.trip-so-far-flight ul')).toBeNull()
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/copy/facts.test.ts tests/facts/liveTripFacts.test.ts tests/facts/tripFacts.test.ts tests/ui/FactsBody.test.tsx
```

Expected: 22 of the 104 tests fail: `inTheAirTag` and `hasTripSoFarRow` aren't there yet, and the list still has each flight's milestones oldest first, with no flight set apart.

- [x] **Step 3: Write the code.**

**In `src/copy/facts.ts`, replace:**

```ts
  }
}

/** "UPS207 · Louisville → Cologne", or the cities alone without a flight number. */
```

**with:**

```ts
  }
}

/**
 * The tag on the flight between its gates, in the list: "In the air now", or "In the air" at a moment of the replay
 * (best guesses design §4).
 */
export const inTheAirTag = (isReplay: boolean) => (isReplay ? 'In the air' : 'In the air now')

/** "UPS207 · Louisville → Cologne", or the cities alone without a flight number. */
```

**In `src/facts/factRow.ts`, replace:**

```ts

/** The facts dragged all the way up (§5.2, §5.5): each started flight's milestones, newest flight first, then the totals. */
export interface TripSoFar {
  /** Flights with at least one milestone so far. */
  flights: { id: string; title: string; milestones: string[] }[]
  /** "Trip so far", or "Trip recap" once a recap's trip is over. */
  totalsTitle: string
  totals: string | null
```

**with:**

```ts

/** One line of a flight's list: "Crossed into Canada · 1:12 PM". */
export interface TripSoFarEvent {
  text: string
  /** A best guess, where nobody saw the plane. Its time reads "about", and it's drawn lighter (best guesses design §3). */
  isEstimate: boolean
}

/** A flight in the trip so far. */
export interface TripSoFarFlight {
  id: string
  /** "UPS207 · Louisville → Cologne". */
  title: string
  /** "In the air now" for the flight between its gates, which the list sets apart. Null for any other. */
  tag: string | null
  /** What has happened so far, newest first. */
  events: TripSoFarEvent[]
}

/**
 * The facts dragged all the way up (§5.2, §5.5; best guesses design §4): the flight between its gates, set apart, and
 * each earlier flight, newest first. Under each, what has happened, newest first. Then the totals.
 */
export interface TripSoFar {
  /** The flight between its gates, and each earlier flight with at least one event so far. */
  flights: TripSoFarFlight[]
  /** "Trip so far", or "Trip recap" once a recap's trip is over. */
  totalsTitle: string
  /** Null with nothing to say, and where the rows above already have a "Trip so far" row. */
  totals: string | null
```

**In `src/facts/tripFacts.ts`, replace (1 of 5):**

```ts
import {
  belowWords, cockpitCountdown, flightTitle, lastSeenLine, milestoneHeadline, milestoneLine, spokenLastSeen, stillOnGroundText,
} from '../copy/facts'
```

**with:**

```ts
import {
  belowWords, cockpitCountdown, flightTitle, inTheAirTag, lastSeenLine, milestoneHeadline, milestoneLine, spokenLastSeen, stillOnGroundText,
} from '../copy/facts'
```

**In `src/facts/tripFacts.ts`, replace (2 of 5):**

```ts
import type { GeoPoint } from '../map/greatCircle'
import { currentLeg, dayCount, legInMotion, legStillOnGround, type AirportMark, type MapLeg, type TripMap } from '../map/tripMap'
import { MINUTE } from '../time/zoned'
```

**with:**

```ts
import type { GeoPoint } from '../map/greatCircle'
import { currentLeg, dayCount, isMoving, legInMotion, legStillOnGround, type AirportMark, type MapLeg, type TripMap } from '../map/tripMap'
import { MINUTE } from '../time/zoned'
```

**In `src/facts/tripFacts.ts`, replace (3 of 5):**

```ts
/**
 * Each started flight's milestones so far, newest flight first, then the totals: the trip so far, or the recap (§5.2,
 * §5.5). A real plane still on the ground at its departure airport has passed none of its flight's, whatever the
 * schedule's times say (the website's own, Todd, 16 Nov 2026).
 */
```

**with:**

```ts
/**
 * Whether the rows at `t` have a "Trip so far" row: on a drive, and on a layover, as `factRows` (tripFactsRows.ts) has
 * them. The list under the rows then doesn't say it again (best guesses design §4).
 */
export function hasTripSoFarRow(facts: TripFacts, t: number): boolean {
  const leg = legInMotion(facts.map, t)
  if (leg) return leg.kind !== 'flight'
  if (isRecapOver(facts, t)) return false
  return !(facts.map.mode.kind === 'nextTrip' && t < facts.map.span.start)
}

/**
 * The trip so far, or the recap (§5.2, §5.5; best guesses design §4): the flight between its gates, set apart and listed
 * even before its first event, then each earlier flight with an event, newest first. Under each, its events, newest
 * first, so the latest is at the top. Then the totals, unless the rows already have them.
 *
 * The website's own (Todd, 16 Nov 2026): a real plane still on the ground at its departure airport after the plan's
 * takeoff time has passed none of its flight's events, whatever the schedule's times say, and its flight is left out
 * until it takes off, with no "In the air now".
 */
```

**In `src/facts/tripFacts.ts`, replace (4 of 5):**

```ts
  const flights = started.flatMap((leg) => {
    const lines = factsMilestones(facts, leg).filter((m) => m.time <= t).map((m) => milestoneLine(m, facts.viewerTz, facts.h24))
    return lines.length > 0 ? [{ id: leg.id, title: flightTitle(leg), milestones: lines }] : []
  })
```

**with:**

```ts
  const flights = started.flatMap((leg) => {
    const events = factsMilestones(facts, leg)
      .filter((m) => m.time <= t)
      .reverse()
      .map((m) => ({ text: milestoneLine(m, facts.viewerTz, facts.h24), isEstimate: m.isEstimate === true }))
    const tag = isMoving(leg, t) ? inTheAirTag(facts.isReplay) : null
    return tag != null || events.length > 0 ? [{ id: leg.id, title: flightTitle(leg), tag, events }] : []
  })
```

**In `src/facts/tripFacts.ts`, replace (5 of 5):**

```ts
  }
  const totals = totalsSoFar(facts.map, t, facts.sunEvents, facts.isReplay)
  return { flights, totalsTitle: 'Trip so far', totals: soFarText(totals, facts.day, facts.days) }
}
```

**with:**

```ts
  }
  // Where the rows already have a "Trip so far" row, it isn't said again under the list.
  const totals = hasTripSoFarRow(facts, t) ? null : soFarText(totalsSoFar(facts.map, t, facts.sunEvents, facts.isReplay), facts.day, facts.days)
  return { flights, totalsTitle: 'Trip so far', totals }
}
```

**In `src/styles/tripMap.css`, replace:**

```css
.trip-so-far h3 { margin: 0 0 4px; font-size: 0.95rem; font-weight: 600; }
.trip-so-far ul { margin: 0; padding: 0; list-style: none; color: var(--text-2); font-size: 0.9rem; }
.trip-so-far p { margin: 0; color: var(--text-2); font-size: 0.9rem; }
.facts-footer { color: var(--text-2); font-size: 0.8rem; }
```

**with:**

```css
.trip-so-far h3 { margin: 0 0 4px; font-size: 0.95rem; font-weight: 600; }
/* The events and the totals in the text's own color, as the app's, so a best guess can be drawn lighter, and slanted
   (best guesses design §3). */
.trip-so-far ul { margin: 0; padding: 0; list-style: none; font-size: 0.9rem; }
.trip-so-far p { margin: 0; font-size: 0.9rem; }
.trip-so-far li.estimate { color: var(--text-2); font-style: italic; }
/* The flight between its gates (best guesses design §4): a border round it, and its tag beside its name, or under it
   where they don't fit on one line. */
.trip-so-far-flight.in-the-air { padding: 12px 14px; border: 1.5px solid var(--blue); border-radius: 12px; }
.trip-so-far-flight.in-the-air h3 { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 8px; }
.trip-so-far-tag {
  padding: 2px 8px;
  border-radius: 999px;
  /* A browser without color-mix (before Safari 16.2) shows the tag without its tint. */
  background: color-mix(in srgb, var(--blue) 15%, transparent);
  color: var(--blue);
  font-size: 0.75rem;
  font-weight: 600;
}
.facts-footer { color: var(--text-2); font-size: 0.8rem; }
```

**In `src/ui/TripSoFarList.tsx`, replace (1 of 2):**

```tsx

/** The trip so far (Stage 2 spec §5.2, §5.5): each flight's milestones under its name, newest flight first, then the totals. */
export function TripSoFarList({ tripSoFar }: { tripSoFar: TripSoFar }) {
```

**with:**

```tsx

/**
 * The trip so far (Stage 2 spec §5.2, §5.5; best guesses design §3, §4): each flight's events under its name, newest
 * first, then the trip's totals. The flight between its gates has a border, and its tag beside its name (or under it,
 * where they don't fit on one line), so it stands out from the flights before it. A best guess is drawn lighter, and
 * slanted.
 */
export function TripSoFarList({ tripSoFar }: { tripSoFar: TripSoFar }) {
```

**In `src/ui/TripSoFarList.tsx`, replace (2 of 2):**

```tsx
      {tripSoFar.flights.map((flight) => (
        <section key={flight.id} class="trip-so-far-flight">
          <h3>{flight.title}</h3>
          <ul>
            {flight.milestones.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </section>
```

**with:**

```tsx
      {tripSoFar.flights.map((flight) => (
        <section key={flight.id} class={flight.tag ? 'trip-so-far-flight in-the-air' : 'trip-so-far-flight'}>
          <h3>
            <span>{flight.title}</span>
            {flight.tag && <> <span class="trip-so-far-tag">{flight.tag}</span></>}
          </h3>
          {flight.events.length > 0 && (
            <ul>
              {flight.events.map((event, i) => <li key={i} class={event.isEstimate ? 'estimate' : undefined}>{event.text}</li>)}
            </ul>
          )}
        </section>
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 104 tests pass. Then `npx tsc --noEmit`: nothing; and `npm test`: 175 test files and 3,624 tests pass.

- [x] **Step 5: Commit, on Todd's yes (after batch A's checkpoint).**

```bash
git add src/copy/facts.ts src/facts/factRow.ts src/facts/tripFacts.ts src/styles/tripMap.css src/ui/TripSoFarList.tsx tests/copy/facts.test.ts tests/facts/liveTripFacts.test.ts tests/facts/tripFacts.test.ts tests/ui/FactsBody.test.tsx
git commit -m "The facts' list puts the newest event first, sets the flight in the air apart with a border and \"In the air now\", and says \"Trip so far\" once (best guesses design §4)"
```

---

### Task 3: The latest event, worked out and worded

The facts work out the newest event of the flight between its gates (`latestEvent`): what it was ("Crossed into Canada", `eventTitle`), how long ago ("Just now" in its first minute, then "12 min ago"; "About now" and "About 12 min ago" for a best guess; a replay's clock time, "10:37 AM"; `eventWhen`), and a sentence for screen readers ("Latest: crossed into Canada, 12 minutes ago.", `spokenLatestEvent`). It stays until the next event, from the flight's first until the gate. There's none before the first, on the ground, on a drive, or for a real plane still at its gate, which has passed nothing. The card's sentence has it before its closing "Opens the full map." The headline can leave events out (`includesEvents`), for beside the banner; by default it keeps them, so the shared cases read as before. The app's `a78e841`. Nothing shows the banner yet.

**Files:**
- Modify: `src/copy/facts.ts`, `src/facts/factRow.ts`, `src/facts/tripFacts.ts`
- Test: `tests/copy/facts.test.ts`, `tests/facts/liveTripFacts.test.ts`, `tests/facts/tripFacts.test.ts`

- [x] **Step 1: Write the tests.**

**In `tests/copy/facts.test.ts`, replace (1 of 2):**

```ts
import {
  aircraftText, averageSpeedText, belowWords, chaseText, closestToHomeText, cockpitCountdown, cockpitEventText, flightTitle, flownText,
  flyingInto, groundSunText, halfwayText, heightAndSpeedText, inTheAirTag, landsText, lastSeenLine, LIVE_CREDIT, midLine, milestoneHeadline, milestoneLine,
  moonText, SPOKEN_LIVE_CREDIT, spokenLastSeen, stillOnGroundText, timeDifferenceText, toGoText,
} from '../../src/copy/facts'
import { longestText, onTheWayText, recapChip, recapSummary, soFarText, totalsTiles } from '../../src/copy/factsTrip'
import type { MapLeg } from '../../src/map/tripMap'
```

**with:**

```ts
import {
  aircraftText, averageSpeedText, belowWords, chaseText, closestToHomeText, cockpitCountdown, cockpitEventText, eventTitle, eventWhen, flightTitle,
  flownText, flyingInto, groundSunText, halfwayText, heightAndSpeedText, inTheAirTag, landsText, lastSeenLine, LIVE_CREDIT, midLine, milestoneHeadline,
  milestoneLine, moonText, SPOKEN_LIVE_CREDIT, spokenLastSeen, spokenLatestEvent, stillOnGroundText, timeDifferenceText, toGoText,
} from '../../src/copy/facts'
import { longestText, onTheWayText, recapChip, recapSummary, soFarText, totalsTiles } from '../../src/copy/factsTrip'
import type { Milestone } from '../../src/facts/milestone'
import type { MapLeg } from '../../src/map/tripMap'
```

**In `tests/copy/facts.test.ts`, replace (2 of 2):**

```ts

describe('where they’re headed in words (Stage 2 spec §4.7)', () => {
```

**with:**

```ts

describe('the latest event in words (latest event design §1, §3)', () => {
  const SEC = 1_000
  const crossed: Milestone = { kind: 'crossedInto', name: 'Canada', time: NOW }

  it('names each kind of event on its own', () => {
    expect(eventTitle({ kind: 'crossedInto', name: 'Canada' })).toBe('Crossed into Canada')
    expect(eventTitle({ kind: 'outOver', name: 'the Pacific' })).toBe('Out over the Pacific')
    expect(eventTitle({ kind: 'halfway' })).toBe('Halfway')
    expect(eventTitle({ kind: 'closestToHome', miles: 35 })).toBe('Closest to home, 35 mi')
  })

  it('says "Just now" in its first minute, then how many minutes ago, to the nearest', () => {
    const when = (after: number) => eventWhen(crossed, NOW + after, NY, false)
    expect(when(0)).toBe('Just now')
    expect(when(59 * SEC)).toBe('Just now')
    expect(when(60 * SEC)).toBe('1 min ago')
    // To the nearest minute.
    expect(when(12 * MIN - SEC)).toBe('12 min ago')
    expect(when(89 * SEC)).toBe('1 min ago')
    expect(when(90 * SEC)).toBe('2 min ago')
    expect(when(130 * MIN)).toBe('2 h 10 min ago')
    // Held to a year.
    expect(when(2 * 365 * 24 * 60 * MIN)).toBe('8760 h ago')
    // A time that can't be right is never a number on the screen.
    expect(eventWhen(crossed, Number.NaN, NY, false)).toBe('Just now')
  })

  it('says "About" of a best guess', () => {
    const guessed: Milestone = { kind: 'outOver', name: 'the Pacific', time: NOW, isEstimate: true }
    expect(eventWhen(guessed, NOW + 20 * SEC, NY, false)).toBe('About now')
    expect(eventWhen(guessed, NOW + 40 * MIN, NY, false)).toBe('About 40 min ago')
  })

  it('at a moment of the replay, says its clock time', () => {
    const later = NOW + 10 * MIN
    expect(eventWhen(crossed, later, NY, false, true)).toBe(`3:14${PM}`)
    expect(eventWhen({ ...crossed, isEstimate: true }, later, NY, false, true)).toBe(`About 3:14${PM}`)
    expect(eventWhen(crossed, later, NY, true, true)).toBe('15:14')
  })

  it('is a sentence for screen readers', () => {
    expect(spokenLatestEvent(crossed, NOW + 12 * MIN, NY, false)).toBe('Latest: crossed into Canada, 12 minutes ago.')
    expect(spokenLatestEvent(crossed, NOW, NY, false)).toBe('Latest: crossed into Canada, just now.')
    const closest: Milestone = { kind: 'closestToHome', miles: 35, time: NOW, isEstimate: true }
    expect(spokenLatestEvent(closest, NOW + 60 * MIN, NY, false)).toBe('Latest: closest to home, 35 miles, about 1 hour ago.')
    expect(spokenLatestEvent(closest, NOW, NY, false)).toBe('Latest: closest to home, 35 miles, about now.')
    expect(spokenLatestEvent({ kind: 'halfway', time: NOW }, NOW + 10 * MIN, NY, false, true)).toBe(`Latest: halfway, at 3:14${PM}.`)
    expect(spokenLatestEvent({ kind: 'outOver', name: 'the Pacific', time: NOW, isEstimate: true }, NOW + 10 * MIN, NY, false, true))
      .toBe(`Latest: out over the Pacific, at about 3:14${PM}.`)
  })
})

describe('where they’re headed in words (Stage 2 spec §4.7)', () => {
```

**In `tests/facts/liveTripFacts.test.ts`, replace (1 of 3):**

```ts
import { makeGeography, type Geography } from '../../src/facts/geography'
import { COCKPIT_HORIZON, cockpitHorizonOnLeg, sunAltitudeOnLeg, sunEvents } from '../../src/facts/sky'
import { cardSummary, headline, makeTripFacts, showsLiveData, tripSoFar, type TripFacts } from '../../src/facts/tripFacts'
import { factRows, factsAtMoment } from '../../src/facts/tripFactsRows'
import type { GeoPoint } from '../../src/map/greatCircle'
```

**with:**

```ts
import { makeGeography, type Geography } from '../../src/facts/geography'
import { COCKPIT_HORIZON, cockpitHorizonOnLeg, sunAltitudeOnLeg, sunEvents } from '../../src/facts/sky'
import { cardSummary, headline, latestEvent, makeTripFacts, showsLiveData, tripSoFar, type TripFacts } from '../../src/facts/tripFacts'
import { factRows, factsAtMoment } from '../../src/facts/tripFactsRows'
import type { GeoPoint } from '../../src/map/greatCircle'
```

**In `tests/facts/liveTripFacts.test.ts`, replace (2 of 3):**

```ts

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
```

**with:**

```ts

describe('the card’s sentence for screen readers with a real plane (Stage 3 spec §9, §15)', () => {
  it('in the air, says what’s below the real plane, and the latest event', () => {
    // It lands at 13:05 by its estimate, where the plan has 13:15. It crossed into Bravo at 10:55.
    expect(cardSummary(facts('11:10'), at('11:10'), 'Alex')).toBe(
      `TST1 to E20, 10 minutes ahead of schedule, over Bravo. Lands about 9:11${AM} your time. Latest: crossed into Bravo, 15 minutes ago. ` +
        'Opens the full map.',
    )
  })

  it('while it’s out of sight, says "about", what’s below by the plan, and where it was last seen', () => {
    expect(cardSummary(facts('10:50', { now: '11:01' }), at('11:01'), 'Alex')).toBe(
      `TST1 to E20, about 10 minutes ahead of schedule, over Bravo, last seen over Alpha. Lands about 9:11${AM} your time. ` +
        'Latest: crossed into Bravo, about 6 minutes ago. Opens the full map.',
    )
    expect(cardSummary(facts('11:03', { now: '11:13' }), at('11:13'), 'Alex')).toBe(
      `TST1 to E20, about 10 minutes ahead of schedule, over Bravo, last seen near Testville. Lands about 9:11${AM} your time. ` +
        'Latest: crossed into Bravo, 18 minutes ago. Opens the full map.',
    )
    expect(cardSummary(facts('11:10', { now: '11:20', hasStory: false }), at('11:20'), 'Alex')).toBe(
      `TST1 to E20, about 10 minutes ahead of schedule, last seen 10 minutes ago. Lands about 9:11${AM} your time. Opens the full map.`,
    )
  })
})

describe('the latest event with a real plane (latest event design §1)', () => {
  it('while it’s out of sight, is a best guess, with "about"', () => {
    // Last seen at 4.375° E at 10:50. By the plan it crossed into Bravo at 10:55.
    expect(latestEvent(facts('10:50', { now: '11:01' }), at('11:01'))).toEqual({
      title: 'Crossed into Bravo', when: 'About 6 min ago', sentence: 'Latest: crossed into Bravo, about 6 minutes ago.',
    })
  })

  it('of a flight that landed early, goes at its real gate arrival', () => {
    // Seen down at 20° E at 12:55, ten minutes ahead of the plan: it reaches the gate at 13:02.
    const theFacts = facts('12:53', { now: '13:05', landed: true })
    expect(latestEvent(theFacts, at('12:58'))?.title).toBe('Closest to home, 35 mi')
    // At the gate.
    expect(latestEvent(theFacts, at('13:03'))).toBeNull()
  })

  it('in a replay, is the record’s newest, at its clock time', () => {
    const seen = facts('11:10', { isReplay: true })
    expect(latestEvent(seen, at('11:25'))?.when).toBe(`6:55${AM}`)
    // Before it crossed.
    expect(latestEvent(seen, at('10:50'))).toBeNull()
    expect(latestEvent(facts('10:50', { isReplay: true }), at('11:01'))?.when).toBe(`About 6:55${AM}`)
  })
})
```

**In `tests/facts/liveTripFacts.test.ts`, replace (3 of 3):**

```ts
  })

  it('in a replay, lists them where the map has the plane: the schedule’s, as it has no record', () => {
    const soFar = tripSoFar(atTheGate('10:28', { geography: border, isReplay: true }), at('10:28'))
```

**with:**

```ts
  })

  it('has no latest event, and the card’s sentence none, as it has passed nothing; in a replay, the schedule’s', () => {
    // The schedule's times have it cross the border at 10:24.
    const theFacts = atTheGate('10:28', { geography: border })
    expect(latestEvent(theFacts, at('10:28'))).toBeNull()
    expect(cardSummary(theFacts, at('10:28'), 'Alex')).not.toMatch(/Latest/)
    expect(latestEvent(atTheGate('10:28', { geography: border, isReplay: true }), at('10:28'))).toEqual({
      title: 'Crossed into Bravo', when: `6:24${AM}`, sentence: `Latest: crossed into Bravo, at 6:24${AM}.`,
    })
  })

  it('in a replay, lists them where the map has the plane: the schedule’s, as it has no record', () => {
    const soFar = tripSoFar(atTheGate('10:28', { geography: border, isReplay: true }), at('10:28'))
```

**In `tests/facts/tripFacts.test.ts`, replace (1 of 3):**

```ts
import {
  cardSummary, forecastFor, hasTripSoFarRow, headline, isRecapOver, makeTripFacts, recapLongestLine, recapTiles, sheetHeadline, tripSoFar,
} from '../../src/facts/tripFacts'
```

**with:**

```ts
import {
  cardSummary, factsMilestones, forecastFor, hasTripSoFarRow, headline, isRecapOver, latestEvent, makeTripFacts, recapLongestLine, recapTiles,
  sheetHeadline, tripSoFar,
} from '../../src/facts/tripFacts'
```

**In `tests/facts/tripFacts.test.ts`, replace (2 of 3):**

```ts
    expect(facts.stories.eq.length).toBe(legPathLength(real))
  })
```

**with:**

```ts
    expect(facts.stories.eq.length).toBe(legPathLength(real))
  })
})

describe('the latest event (latest event design §1)', () => {
  it('is the newest event of the flight in the air, until the next, and none at the gate', () => {
    const facts = equatorFacts()
    // Before the first event.
    expect(latestEvent(facts, t('10:59'))).toBeNull()
    expect(latestEvent(facts, Date.parse('2026-03-20T11:00:30Z'))).toEqual({
      title: 'Crossed into Bravo', when: 'Just now', sentence: 'Latest: crossed into Bravo, just now.',
    })
    expect(latestEvent(facts, t('11:12'))?.when).toBe('12 min ago')
    // It stays until the next.
    expect(latestEvent(facts, t('11:44'))?.title).toBe('Crossed into Bravo')
    expect(latestEvent(facts, t('11:46'))?.title).toBe('Halfway')
    expect(latestEvent(facts, t('12:10'))?.title).toBe('Out over the Test Sea')
    expect(latestEvent(facts, t('12:40'))).toEqual({
      title: 'Closest to home, 35 mi', when: '19 min ago', sentence: 'Latest: closest to home, 35 miles, 19 minutes ago.',
    })
    // It has reached the gate.
    expect(latestEvent(facts, t('13:30'))).toBeNull()
  })

  it('before the story is ready, is none, and the card’s sentence says nothing of it', () => {
    const facts = equatorFacts(null)
    expect(latestEvent(facts, t('11:10'))).toBeNull()
    expect(cardSummary(facts, t('11:10'), 'Alex')).toBe(`TST1 to E20. Lands at 9:22${AM} your time. Estimated from the schedule. Opens the full map.`)
  })

  it('in a replay, says its clock time', () => {
    const facts = makeTripFacts(flightMap(equatorFlight(0, 20), mark('HOME', 0.5, 14)), {
      geography: EQUATOR, comparisons: null, viewerTz: NY, h24: false, isReplay: true,
    })
    expect(latestEvent(facts, t('11:12'))?.when).toBe(`7:00${AM}`)
    expect(latestEvent(facts, t('11:12'))?.sentence).toBe(`Latest: crossed into Bravo, at 7:00${AM}.`)
  })

  it('on the ground and on a drive, is none', () => {
    // In Cologne, after a flight whose halfway, by the equator's story, has passed.
    const europe = makeTripFacts(europeMap(at(12)), { geography: EQUATOR, comparisons: null, viewerTz: NY, h24: false })
    expect(latestEvent(europe, at(6))?.title).toBe('Halfway')
    expect(latestEvent(europe, at(12))).toBeNull()
    const driving = makeTripMap([drive('d', 'LEX', 'SDF', 0, 1)], { isNextTrip: false, home: null, now: at(0.5), airports: AIRPORTS })!
    const onTheRoad = makeTripFacts(driving, { geography: EQUATOR, comparisons: null, viewerTz: NY, h24: false })
    expect(latestEvent(onTheRoad, at(0.5))).toBeNull()
    // Even were a drive given a story, with its halfway passed: an event is a flight's.
    const withAStory = { ...onTheRoad, stories: { d: equatorFacts().stories.eq } }
    expect(factsMilestones(withAStory, driving.legs[0]).some((m) => m.time <= at(0.75))).toBe(true)
    expect(latestEvent(withAStory, at(0.75))).toBeNull()
  })

  it('leaves events out of the headline beside it, which is otherwise as before', () => {
    const facts = equatorFacts()
    // As before, where the shared cases read it.
    expect(headline(facts, t('11:02'))).toBe('Just crossed into Bravo')
    expect(headline(facts, t('11:02'), false)).toBe('Over Bravo')
    expect(headline(facts, t('11:46'), false)).toBe('Over Bravo')
    expect(headline(facts, t('11:10'), false)).toBe('Over Bravo, near Testville')
  })
```

**In `tests/facts/tripFacts.test.ts`, replace (3 of 3):**

```ts
describe('the card’s words (Stage 2 spec §6.4, §6.5)', () => {
  it('in flight, adds the place below to the spoken summary', () => {
    expect(cardSummary(equatorFacts(), t('11:10'), 'Alex')).toBe(
      `TST1 to E20, over Bravo. Lands at 9:22${AM} your time. Estimated from the schedule. Opens the full map.`,
    )
```

**with:**

```ts
describe('the card’s words (Stage 2 spec §6.4, §6.5)', () => {
  it('in flight, adds the place below to the spoken summary, and the latest event', () => {
    expect(cardSummary(equatorFacts(), t('11:10'), 'Alex')).toBe(
      `TST1 to E20, over Bravo. Lands at 9:22${AM} your time. Estimated from the schedule. Latest: crossed into Bravo, 10 minutes ago. ` +
        'Opens the full map.',
    )
    // Before its first event.
    expect(cardSummary(equatorFacts(), t('10:50'), 'Alex')).toBe(
      `TST1 to E20, over Alpha. Lands at 9:22${AM} your time. Estimated from the schedule. Opens the full map.`,
    )
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/copy/facts.test.ts tests/facts/liveTripFacts.test.ts tests/facts/tripFacts.test.ts
```

Expected: 17 of the 107 tests fail: `eventTitle`, `eventWhen`, `spokenLatestEvent` and `latestEvent` aren't there yet, the headline can't leave events out, and the card's sentence says nothing of the latest event.

- [x] **Step 3: Write the code.**

**In `src/copy/facts.ts`, replace:**

```ts
 */
export function milestoneLine(milestone: Milestone, viewerTz: string, h24: boolean): string {
  const time = `${aboutIf(milestone.isEstimate)}${shortTimeText(milestone.time, viewerTz, h24)}`
  switch (milestone.kind) {
    case 'crossedInto':
      return `Crossed into ${milestone.name} · ${time}`
    case 'outOver':
      return `Out over ${milestone.name} · ${time}`
    case 'halfway':
      return `Halfway · ${time}`
    case 'closestToHome':
      return `Closest to home, ${milestone.miles} mi · ${time}`
  }
}
```

**with:**

```ts
 */
export const milestoneLine = (milestone: Milestone, viewerTz: string, h24: boolean) =>
  `${eventTitle(milestone)} · ${aboutIf(milestone.isEstimate)}${shortTimeText(milestone.time, viewerTz, h24)}`

/**
 * What an event was, on its own: "Crossed into Kansas", "Out over the Atlantic", "Halfway", "Closest to home, 40 mi".
 * The latest event's banner shows it large (latest event design §1).
 */
export function eventTitle(milestone: MilestoneKind): string {
  switch (milestone.kind) {
    case 'crossedInto':
      return `Crossed into ${milestone.name}`
    case 'outOver':
      return `Out over ${milestone.name}`
    case 'halfway':
      return 'Halfway'
    case 'closestToHome':
      return `Closest to home, ${milestone.miles} mi`
  }
}

/**
 * The whole minutes from `time` to `t`, to the nearest and held to a year, or null under a minute, and for a time that
 * can't be right.
 */
function minutesSince(time: number, t: number): number | null {
  const elapsed = t - time
  if (!(elapsed >= MINUTE)) return null
  return Math.min(Math.round(elapsed / MINUTE), 365 * 24 * 60)
}

/**
 * When an event was, under it in the banner (latest event design §1): "Just now" in its first minute, then "12 min ago".
 * A best guess says so: "About now", "About 12 min ago". At a moment of the replay, where "ago" means nothing, its clock
 * time: "10:37 AM", "About 10:37 AM".
 */
export function eventWhen(milestone: Milestone, t: number, viewerTz: string, h24: boolean, isReplay = false): string {
  const about = milestone.isEstimate ? 'About ' : ''
  if (isReplay) return `${about}${shortTimeText(milestone.time, viewerTz, h24)}`
  const minutes = minutesSince(milestone.time, t)
  if (minutes == null) return milestone.isEstimate ? 'About now' : 'Just now'
  return `${about}${minutesText(minutes)} ago`
}

/**
 * The banner as a screen reader reads it, as its own sentence (latest event design §3): "Latest: crossed into Canada, 12
 * minutes ago.", "Latest: halfway, about 40 minutes ago.", or at a moment of the replay "Latest: crossed into Canada, at
 * 10:37 AM." The card's sentence has it too.
 */
export function spokenLatestEvent(milestone: Milestone, t: number, viewerTz: string, h24: boolean, isReplay = false): string {
  const what = milestone.kind === 'closestToHome' ? `closest to home, ${milestone.miles} miles` : midLine(eventTitle(milestone))
  const about = aboutIf(milestone.isEstimate)
  const minutes = minutesSince(milestone.time, t)
  const when = isReplay ? `at ${about}${shortTimeText(milestone.time, viewerTz, h24)}`
    : minutes != null ? `${about}${spokenMinutes(minutes)} ago`
    : milestone.isEstimate ? 'about now' : 'just now'
  return `Latest: ${what}, ${when}.`
}
```

**In `src/facts/factRow.ts`, replace:**

```ts

/** Everything the full map's panel shows at one moment on the timeline. */
```

**with:**

```ts

/**
 * The newest event of the flight in the air, as the banner shows it large on the card and the full map (latest event
 * design §1): what it was, and how long ago.
 */
export interface LatestEvent {
  /** "Crossed into Canada", "Out over the Pacific", "Halfway" or "Closest to home, 35 mi". */
  title: string
  /** "12 min ago", "Just now", or "About 12 min ago" for a best guess. In a replay, its clock time: "10:37 AM". */
  when: string
  /** The banner as a screen reader reads it, as its own sentence: "Latest: crossed into Canada, 12 minutes ago." */
  sentence: string
}

/** Everything the full map's panel shows at one moment on the timeline. */
```

**In `src/facts/tripFacts.ts`, replace (1 of 9):**

```ts
import {
  belowWords, cockpitCountdown, flightTitle, inTheAirTag, lastSeenLine, milestoneHeadline, milestoneLine, spokenLastSeen, stillOnGroundText,
} from '../copy/facts'
```

**with:**

```ts
import {
  belowWords, cockpitCountdown, eventTitle, eventWhen, flightTitle, inTheAirTag, lastSeenLine, milestoneHeadline, milestoneLine, spokenLastSeen,
  spokenLatestEvent, stillOnGroundText,
} from '../copy/facts'
```

**In `src/facts/tripFacts.ts`, replace (2 of 9):**

```ts
import type { Comparison } from './comparisons'
import type { TripSoFar } from './factRow'
import { forgetOldPaths, realPathFacts, type FactsStore } from './factsStore'
```

**with:**

```ts
import type { Comparison } from './comparisons'
import type { LatestEvent, TripSoFar } from './factRow'
import { forgetOldPaths, realPathFacts, type FactsStore } from './factsStore'
```

**In `src/facts/tripFacts.ts`, replace (3 of 9):**

```ts
 * else the landing countdown (§4.4). While the real plane is out of sight they're its best guesses, in the same plain
 * words (best guesses design §2). Null on the ground and on a drive, where Stage 1B's words stay.
 *
```

**with:**

```ts
 * else the landing countdown (§4.4). While the real plane is out of sight they're its best guesses, in the same plain
 * words (best guesses design §2). Null on the ground and on a drive, where Stage 1B's words stay. `includesEvents` is
 * false beside the latest event's banner, which shows the milestone already (latest event design §2); the shared
 * cases read the headline with them.
 *
```

**In `src/facts/tripFacts.ts`, replace (4 of 9):**

```ts
 */
export function headline(facts: TripFacts, t: number): string | null {
  const leg = legInMotion(facts.map, t)
```

**with:**

```ts
 */
export function headline(facts: TripFacts, t: number, includesEvents = true): string | null {
  const leg = legInMotion(facts.map, t)
```

**In `src/facts/tripFacts.ts`, replace (5 of 9):**

```ts
  if (isStillOnGround(facts, leg, t)) return stillOnGroundText(leg.origin.city)
  const recent = factsMilestones(facts, leg).filter((m) => m.time <= t && t - m.time < MILESTONE_HEADLINE_MS).pop()
  if (recent) return milestoneHeadline(recent)
```

**with:**

```ts
  if (isStillOnGround(facts, leg, t)) return stillOnGroundText(leg.origin.city)
  const recent = includesEvents ? factsMilestones(facts, leg).filter((m) => m.time <= t && t - m.time < MILESTONE_HEADLINE_MS).pop() : null
  if (recent) return milestoneHeadline(recent)
```

**In `src/facts/tripFacts.ts`, replace (6 of 9):**

```ts
  return belowText(facts, leg, t) ?? landingCountdown(leg, t)
}
```

**with:**

```ts
  return belowText(facts, leg, t) ?? landingCountdown(leg, t)
}

/**
 * The newest event of the flight between its gates at `t`, for the banner (latest event design §1): what it was, how
 * long ago, and its sentence for screen readers. It stays until the next. Null on the ground, on a drive, and before the
 * flight's first event.
 *
 * The website's own (Todd, 16 Nov 2026): none for a real plane still on the ground at its departure airport after the
 * plan's takeoff time, which has passed nothing yet, whatever the schedule's times say.
 */
export function latestEvent(facts: TripFacts, t: number): LatestEvent | null {
  const leg = legInMotion(facts.map, t)
  if (!leg || leg.kind !== 'flight' || isStillOnGround(facts, leg, t)) return null
  // By time, not by the way along: a best guess and a sighting can disagree a little.
  const newest = factsMilestones(facts, leg)
    .filter((m) => m.time <= t)
    .reduce<Milestone | null>((latest, m) => (latest == null || m.time > latest.time ? m : latest), null)
  if (!newest) return null
  const { viewerTz, h24, isReplay } = facts
  return {
    title: eventTitle(newest),
    when: eventWhen(newest, t, viewerTz, h24, isReplay),
    sentence: spokenLatestEvent(newest, t, viewerTz, h24, isReplay),
  }
}
```

**In `src/facts/tripFacts.ts`, replace (7 of 9):**

```ts

/** The card as one sentence for screen readers, ending with what it opens (§6.4, §6.5). */
export function cardSummary(facts: TripFacts, now: number, name: string): string {
```

**with:**

```ts

/**
 * The card as one sentence for screen readers, ending with what it opens (§6.4, §6.5). In flight the latest event's
 * banner comes after the flight's words, as its own sentence (latest event design §3).
 */
export function cardSummary(facts: TripFacts, now: number, name: string): string {
```

**In `src/facts/tripFacts.ts`, replace (8 of 9):**

```ts
  if (leg) {
    const lead = leg.flightNumber ? `${leg.flightNumber} to` : 'Flying to'
```

**with:**

```ts
  if (leg) {
    const latest = latestEvent(facts, now)
    const ending = latest ? `${latest.sentence} Opens the full map.` : 'Opens the full map.'
    const lead = leg.flightNumber ? `${leg.flightNumber} to` : 'Flying to'
```

**In `src/facts/tripFacts.ts`, replace (9 of 9):**

```ts
    const live = liveSummary(leg, now, viewerTz, h24, place?.name ?? null, lastSeen)
    if (live) return `${live} Opens the full map.`
    const over = place ? `, over ${place.name}` : ''
    return `${lead} ${leg.destination.city}${over}. Lands at ${shortTimeText(leg.end, viewerTz, h24)} your time. Estimated from the schedule. Opens the full map.`
  }
```

**with:**

```ts
    const live = liveSummary(leg, now, viewerTz, h24, place?.name ?? null, lastSeen)
    if (live) return `${live} ${ending}`
    const over = place ? `, over ${place.name}` : ''
    return `${lead} ${leg.destination.city}${over}. Lands at ${shortTimeText(leg.end, viewerTz, h24)} your time. Estimated from the schedule. ${ending}`
  }
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 107 tests pass. Then `npx tsc --noEmit`: nothing; and `npm test`: 175 test files and 3,638 tests pass.

- [x] **Step 5: Batch A's review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Tasks 2 and 3, the facts and the words, against the best guesses design's §4, the latest event design, the app at `9f06e71` (`5ad717f`, `a78e841` and `a94ed20`), and this plan's list of where the website settles or differs. Make its fixes, rerun each task's tests, and record what it found under "Changes made during execution".

- [x] **Step 6: Batch A's checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test
```

Expected: 175 test files and 3,638 tests pass.

- [x] **Step 7: Commit, on Todd's yes.** Task 2's commit first. Where two tasks of this batch change one file (`src/copy/facts.ts`: Tasks 2, 3; `src/facts/factRow.ts`: Tasks 2, 3; `src/facts/tripFacts.ts`: Tasks 2, 3; `tests/copy/facts.test.ts`: Tasks 2, 3; `tests/facts/liveTripFacts.test.ts`: Tasks 2, 3; `tests/facts/tripFacts.test.ts`: Tasks 2, 3), each commit takes the file as its own task left it (ground rule 10). Then:

```bash
git add src/copy/facts.ts src/facts/factRow.ts src/facts/tripFacts.ts tests/copy/facts.test.ts tests/facts/liveTripFacts.test.ts tests/facts/tripFacts.test.ts
git commit -m "The facts work out the latest event of the flight in the air, with how long ago it was and a sentence for screen readers, and the headline beside it can leave events out (latest event design §1, §3)"
```

---

### Task 4: The banner on the card and the full map, with the key under it at phone width

The banner shows the latest event large, with how long ago under it, in the chips' glass (`src/ui/LatestEventBanner.tsx`): on the card in the map's top corner, in the top chip's place; on the full map centred under the pill, over the open part of the map (on a computer, beside the side panel). Beside it the card's bottom chip and the panel's first line leave events out, and the full map's facts at a moment carry it. Todd's answer (16 Nov 2026), "A: key just under the banner": the key to the two planes stays at the top right where it fits beside the banner with a gap, and moves just under it, still at the right, where it doesn't (`bannerLayout`). The banner, with the key under it, is the map's top inset, so the camera keeps the plane clear of both. `useSizeOf` measures an element's width and height; `useHeightOf` now reads its height from it. The app's `a94ed20`.

**Files:**
- Create: `src/ui/LatestEventBanner.tsx`, `src/ui/hooks/useSizeOf.ts`
- Modify: `src/facts/factRow.ts`, `src/facts/tripFacts.ts`, `src/facts/tripFactsRows.ts`, `src/styles/tripMap.css`, `src/ui/PlaneKey.tsx`, `src/ui/TripMapCard.tsx`, `src/ui/TripMapPage.tsx`, `src/ui/hooks/useHeightOf.ts`
- Test: `tests/facts/liveTripFacts.test.ts`, `tests/facts/tripFacts.test.ts`, `tests/facts/tripFactsRows.test.ts`, `tests/ui/latestEventBanner.test.tsx`

- [x] **Step 1: Write the tests.**

**In `tests/facts/liveTripFacts.test.ts`, replace (1 of 2):**

```ts

  it('of a flight with no live data, are the same in a replay as they were, but for the tag that says it’s now', () => {
    // The flight in the air is "In the air now", and in a replay "In the air" (best guesses design §4).
    const asReplay = (moment: FactsAtMoment): FactsAtMoment => ({
      ...moment,
      tripSoFar: { ...moment.tripSoFar, flights: moment.tripSoFar.flights.map((f) => ({ ...f, tag: f.tag && 'In the air' })) },
    })
```

**with:**

```ts

  it('of a flight with no live data, are the same in a replay as they were, but for the words that say it’s now', () => {
    // The flight in the air is "In the air now", and in a replay "In the air" (best guesses design §4). The latest event
    // was "10 min ago", and in a replay it was at a clock time (latest event design §1).
    const withoutNow = (moment: FactsAtMoment) => ({
      ...moment,
      tripSoFar: { ...moment.tripSoFar, flights: moment.tripSoFar.flights.map((f) => ({ ...f, tag: f.tag != null })) },
      latestEvent: moment.latestEvent?.title ?? null,
    })
```

**In `tests/facts/liveTripFacts.test.ts`, replace (2 of 2):**

```ts
      for (const t of ['10:05', '10:35', '11:10', '12:07', '13:20']) {
        expect(factsAtMoment(factsOf(leg, { isReplay: true }), at(t), at('11:10'))).toEqual(asReplay(factsAtMoment(factsOf(leg), at(t), at('11:10'))))
      }
    }
  })
```

**with:**

```ts
      for (const t of ['10:05', '10:35', '11:10', '12:07', '13:20']) {
        const replayed = factsAtMoment(factsOf(leg, { isReplay: true }), at(t), at('11:10'))
        expect(withoutNow(replayed)).toEqual(withoutNow(factsAtMoment(factsOf(leg), at(t), at('11:10'))))
      }
    }
    expect(factsAtMoment(factsOf(equatorFlight(0, 20), { isReplay: true }), at('11:10'), at('11:10')).latestEvent?.when).toBe(`7:00${AM}`)
  })
```

**In `tests/facts/tripFacts.test.ts`, replace:**

```ts
    expect(headline(facts, t('11:10'), false)).toBe('Over Bravo, near Testville')
  })
})

```

**with:**

```ts
    expect(headline(facts, t('11:10'), false)).toBe('Over Bravo, near Testville')
  })

  it('is on the map above the full map’s panel, so the panel’s first line leaves events out', () => {
    expect(sheetHeadline(equatorFacts(), t('11:02'))).toBe('Over Bravo')
    expect(sheetHeadline(equatorFacts(), t('11:46'))).toBe('Over Bravo')
  })
})

```

**In `tests/facts/tripFactsRows.test.ts`, replace (1 of 2):**

```ts
describe('the facts at a moment', () => {
  it('gather the headline, the rows and the trip so far', () => {
    const shown = Date.parse('2026-03-20T11:10:00Z')
```

**with:**

```ts
describe('the facts at a moment', () => {
  it('gather the headline, the rows, the trip so far and the latest event', () => {
    const shown = Date.parse('2026-03-20T11:10:00Z')
```

**In `tests/facts/tripFactsRows.test.ts`, replace (2 of 2):**

```ts
    expect(moment.tripSoFar.totalsTitle).toBe('Trip so far')
  })
```

**with:**

```ts
    expect(moment.tripSoFar.totalsTitle).toBe('Trip so far')
    expect(moment.latestEvent).toEqual({ title: 'Crossed into Bravo', when: '10 min ago', sentence: 'Latest: crossed into Bravo, 10 minutes ago.' })
  })

  it('beside the latest event, head the panel with what’s below (latest event design §2)', () => {
    const shown = Date.parse('2026-03-20T11:02:00Z')
    const moment = factsAtMoment(facts(equator()), shown, shown)
    expect(moment.headline).toBe('Over Bravo')
    expect(moment.latestEvent?.when).toBe('2 min ago')
  })

  it('have the latest event at the moment shown, not now’s', () => {
    const shown = Date.parse('2026-03-20T12:10:00Z')
    const now = Date.parse('2026-03-20T11:10:00Z')
    expect(factsAtMoment(facts(equator()), shown, now).latestEvent?.title).toBe('Out over the Test Sea')
  })

  it('have no latest event on the ground', () => {
    expect(factsAtMoment(facts(europe(at(12))), at(12), at(12)).latestEvent).toBeNull()
  })
```

**Create `tests/ui/latestEventBanner.test.tsx`:**

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FactsAtMoment, LatestEvent } from '../../src/facts/factRow'
import { makeGeography } from '../../src/facts/geography'
import { latestEvent, makeTripFacts } from '../../src/facts/tripFacts'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { bannerLayout } from '../../src/ui/LatestEventBanner'
import { TripMapCard } from '../../src/ui/TripMapCard'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { box, EQUATOR, equatorFlight, flightMap, mark } from '../facts/factsTestData'
import { fakeMapKit } from '../fixtures/fakeMapKit'
import { setWindowSize } from '../fixtures/ui'
import { liveTripMap } from '../map/liveTrip'
import { MINUTE, START } from '../map/madeUpFlights'

/**
 * The latest event shown large (latest event design §1, §2, §3): in the card's top corner, and centred under the full
 * map's pill, with the camera keeping the plane clear of it. And the website's own (Todd, 16 Nov 2026): the key to the
 * two planes moves just under the banner, still at the right, where they don't fit side by side.
 */

afterEach(() => {
  cleanup()
  resetAppleMapKit()
  localStorage.clear()
  vi.restoreAllMocks()
  setWindowSize(1024, 768)
})

const NY = 'America/New_York'
const t = (hhmm: string) => Date.parse(`2026-03-20T${hhmm}:00Z`)
/** The made-up live trip's real plane in the air, with its ghost: the key shows. */
const IN_THE_AIR = START + 59 * MINUTE

/** Two made-up countries, either side of 82° W, which the live trip's flight from Louisville to Philadelphia crosses. */
const WEST_AND_EAST = makeGeography([box('Westland', 'country', -90, -82, null, 35, 45), box('Eastland', 'country', -82, -70, null, 35, 45)], [])

const BANNER = { width: 200, height: 40 }
const KEY = { width: 190, height: 22 }

/** Measures the elements of these classes at these sizes, as happy-dom lays nothing out. */
function measure(sizes: Record<string, { width: number; height: number }>) {
  const measured = HTMLElement.prototype.getBoundingClientRect
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const found = Object.entries(sizes).find(([name]) => this.classList.contains(name))
    return found ? DOMRect.fromRect(found[1]) : measured.call(this)
  })
}

/** Apple's map, faked, so the camera's padding can be read. */
function appleMap() {
  const kit = fakeMapKit()
  startAppleMapKit(async () => kit as unknown as MapKitApi)
  return kit
}

const keyTop = () => document.querySelector<HTMLElement>('.trip-map-key')!.style.top

describe('where the key goes beside the banner, and what the camera keeps clear (Todd, 16 Nov 2026)', () => {
  it('keeps the key at the top right where it fits beside the banner with a gap', () => {
    // The banner's right edge at 210 px; the key's left at 416 - 10 - 190 = 216, 6 px on.
    expect(bannerLayout(210, BANNER, KEY, 416)).toEqual({ keyTop: null, inset: 10 + 40 + 4 })
    // A key taller than the banner reaches further down.
    expect(bannerLayout(210, { width: 200, height: 20 }, KEY, 416).inset).toBe(10 + 22 + 4)
  })

  it('moves it just under the banner, still at the right, where it doesn’t', () => {
    expect(bannerLayout(210, BANNER, KEY, 415)).toEqual({ keyTop: 10 + 40 + 6, inset: 10 + 40 + 6 + 22 + 4 })
  })

  it('with no key, or nothing measured yet, leaves the key alone and covers only what shows', () => {
    // A banner nearly as wide as the map would leave no room for a key, were there one.
    expect(bannerLayout(295, BANNER, { width: 0, height: 0 }, 300)).toEqual({ keyTop: null, inset: 54 })
    expect(bannerLayout(10, { width: 0, height: 0 }, { width: 0, height: 0 }, 300)).toEqual({ keyTop: null, inset: 0 })
  })
})

describe('the banner on the card (latest event design §1, §2, §3)', () => {
  const equatorCard = (now: number) => {
    const map = flightMap(equatorFlight(0, 20), mark('HOME', 0.5, 14))
    const facts = makeTripFacts(map, { geography: EQUATOR, comparisons: null, viewerTz: NY, h24: false, day: 1, days: 1 })
    return render(<TripMapCard map={map} now={now} viewerTz={NY} h24={false} name="Alex" day={1} days={1} delayMinutes={null} land={null}
      onOpenMap={() => {}} facts={facts} />).container
  }
  const banner = (container: Element) => container.querySelector('.trip-map-open .latest-event')

  it('shows the latest event in the map’s top corner, large, with how long ago under it', () => {
    const container = equatorCard(t('11:12'))
    expect(banner(container)?.querySelector('.latest-event-title')?.textContent).toBe('Crossed into Bravo')
    expect(banner(container)?.querySelector('.latest-event-when')?.textContent).toBe('12 min ago')
    // Screen readers hear it at the end of the card's sentence.
    expect(banner(container)?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('[data-trip-map-open]')?.getAttribute('aria-label'))
      .toMatch(/Estimated from the schedule\. Latest: crossed into Bravo, 12 minutes ago\. Opens the full map\.$/)
  })

  it('leaves the event off the bottom chip beside it', () => {
    // At 11:02 the headline is "Just crossed into Bravo": the banner says it, so the chip says what's below.
    const container = equatorCard(t('11:02'))
    expect(banner(container)?.textContent).toBe('Crossed into Bravo2 min ago')
    expect(container.querySelector('.trip-map-chip.bottom')?.textContent).toBe('Over Bravo')
  })

  it('isn’t there before the flight’s first event, nor without the facts', () => {
    expect(banner(equatorCard(t('10:50')))).toBeNull()
    cleanup()
    const map = liveTripMap(IN_THE_AIR)
    const { container } = render(<TripMapCard map={map} now={IN_THE_AIR} viewerTz={NY} h24={false} name="Alex" day={1} days={1}
      delayMinutes={null} land={null} onOpenMap={() => {}} />)
    expect(banner(container)).toBeNull()
  })

  /** The live trip's card with its facts, on Apple's map, the card's map `width` wide. */
  const liveCard = async (width: number) => {
    const kit = appleMap()
    measure({ 'latest-event': BANNER, 'trip-map-key': KEY, 'trip-map-frame': { width, height: 220 } })
    const map = liveTripMap(IN_THE_AIR)
    const facts = makeTripFacts(map, { geography: WEST_AND_EAST, comparisons: null, viewerTz: NY, h24: false })
    // By then it has crossed into Eastland, and passed halfway.
    expect(latestEvent(facts, IN_THE_AIR)?.title).toBe('Halfway')
    render(<TripMapCard map={map} now={IN_THE_AIR} viewerTz={NY} h24={false} name="Alex" day={1} days={1} delayMinutes={null} land={null}
      onOpenMap={() => {}} facts={facts} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    return kit
  }

  it('moves the key just under it on a narrow card, still at the right, and keeps the plane clear of both', async () => {
    // From the corner the banner reaches 10 + 200 = 210 px, and the key would start at 415 - 10 - 190 = 215: 1 px short
    // of the gap.
    const kit = await liveCard(415)
    expect(keyTop()).toBe('56px')
    await waitFor(() => expect(kit.maps[0].padding?.top).toBe(82))
  })

  it('leaves the key at the top right of a card with room for both', async () => {
    const kit = await liveCard(416)
    expect(keyTop()).toBe('')
    await waitFor(() => expect(kit.maps[0].padding?.top).toBe(54))
  })
})

describe('the banner on the full map (latest event design §1, §2, §3)', () => {
  const crossed: LatestEvent = { title: 'Crossed into Bravo', when: '12 min ago', sentence: 'Latest: crossed into Bravo, 12 minutes ago.' }
  const factsWith = (latest: LatestEvent | null) => (): FactsAtMoment => ({
    headline: 'Over Bravo', rows: [], tripSoFar: { flights: [], totalsTitle: 'Trip so far', totals: null }, latestEvent: latest,
  })
  const page = async (latest: LatestEvent | null = crossed) => {
    const kit = appleMap()
    render(<TripMapPage map={liveTripMap(IN_THE_AIR)} now={IN_THE_AIR} viewerTz={NY} h24={false} day={1} days={1} land={null}
      onBack={() => {}} factsAt={factsWith(latest)} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    return kit
  }
  const banner = () => document.querySelector('.trip-map-full .latest-event')
  const place = () => document.querySelector<HTMLElement>('.latest-event-place')

  it('shows the latest event under the pill, and reads its sentence to screen readers', async () => {
    setWindowSize(402, 874)
    await page()
    expect(banner()?.querySelector('.latest-event-title')?.textContent).toBe('Crossed into Bravo')
    expect(banner()?.querySelector('.latest-event-when')?.textContent).toBe('12 min ago')
    expect(banner()?.querySelector('.latest-event-title')?.getAttribute('aria-hidden')).toBe('true')
    const spoken = screen.getByText('Latest: crossed into Bravo, 12 minutes ago.')
    expect(banner()?.contains(spoken)).toBe(true)
    expect(spoken.closest('[aria-hidden="true"]')).toBeNull()
  })

  it('on a phone, centres it over the map, moves the key just under it at the right, and keeps the plane clear of both', async () => {
    setWindowSize(402, 874)
    measure({ 'latest-event': BANNER, 'trip-map-key': KEY, 'trip-map-full': { width: 390, height: 520 } })
    const kit = await page()
    expect(place()?.style.left).toBe('0px')
    // Centred, its right edge is at 295 px: past 390 - 10 - 190.
    expect(keyTop()).toBe('56px')
    await waitFor(() => expect(kit.maps[0].padding).toMatchObject({ top: 82, left: 0 }))
  })

  it('leaves the key at the top right where the map is wide enough for both, the banner centred', async () => {
    // Centred over 612 px, the banner ends at 406 px, and the key starts at 612 - 10 - 190 = 412: just the gap. One pixel
    // less, and the key moves under it.
    setWindowSize(700, 1000)
    measure({ 'latest-event': BANNER, 'trip-map-key': KEY, 'trip-map-full': { width: 612, height: 600 } })
    const kit = await page()
    expect(keyTop()).toBe('')
    await waitFor(() => expect(kit.maps[0].padding?.top).toBe(54))
    cleanup()
    resetAppleMapKit()
    vi.restoreAllMocks()
    measure({ 'latest-event': BANNER, 'trip-map-key': KEY, 'trip-map-full': { width: 611, height: 600 } })
    await page()
    expect(keyTop()).toBe('56px')
  })

  it('on a computer, centres it over the open map, clear of the side panel, with the key where it always is', async () => {
    setWindowSize(1280, 800)
    measure({ 'latest-event': BANNER, 'trip-map-key': KEY, 'trip-map-full': { width: 1280, height: 740 }, 'trip-map-panel': { width: 380, height: 600 } })
    const kit = await page()
    // The open panel and its margins cover 412 px. Centred over the rest, the banner ends at 946 px, well before the key.
    await waitFor(() => expect(place()?.style.left).toBe('412px'))
    expect(keyTop()).toBe('')
    await waitFor(() => expect(kit.maps[0].padding).toMatchObject({ top: 54, left: 412 }))
    // Folded to the corner, the panel leaves the whole width open.
    fireEvent.click(screen.getByRole('button', { name: 'Hide facts' }))
    expect(place()?.style.left).toBe('0px')
  })

  it('on a narrower computer screen, moves the key under it while the open panel leaves no room beside it', async () => {
    // Centred over the 588 px the open panel leaves, the banner ends at 806 px, and the key would start at 800.
    setWindowSize(1000, 800)
    measure({ 'latest-event': BANNER, 'trip-map-key': KEY, 'trip-map-full': { width: 1000, height: 740 }, 'trip-map-panel': { width: 380, height: 600 } })
    await page()
    await waitFor(() => expect(place()?.style.left).toBe('412px'))
    expect(keyTop()).toBe('56px')
    // Folded, the banner is centred over the whole map, ending at 600 px: room for the key at the top right again.
    fireEvent.click(screen.getByRole('button', { name: 'Hide facts' }))
    expect(keyTop()).toBe('')
  })

  it('with no latest event, isn’t there, and the key and the camera are as they were', async () => {
    setWindowSize(402, 874)
    measure({ 'latest-event': BANNER, 'trip-map-key': KEY, 'trip-map-full': { width: 390, height: 520 } })
    const kit = await page(null)
    expect(banner()).toBeNull()
    expect(keyTop()).toBe('')
    await waitFor(() => expect(kit.maps[0].padding?.top ?? 0).toBe(0))
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/facts/liveTripFacts.test.ts tests/facts/tripFacts.test.ts tests/facts/tripFactsRows.test.ts tests/ui/latestEventBanner.test.tsx
```

Expected: the banner's tests can't load (there's no `src/ui/LatestEventBanner`), and 6 of the other 80 tests fail: the full map's facts have no latest event yet, and the panel's first line still says the event.

- [x] **Step 3: Write the code.**

**In `src/facts/factRow.ts`, replace:**

```ts
  showsLiveCredit?: boolean
}
```

**with:**

```ts
  showsLiveCredit?: boolean
  /** The newest event of the flight in the air, for the banner over the map (latest event design §1). None unless it's said. */
  latestEvent?: LatestEvent | null
}
```

**In `src/facts/tripFacts.ts`, replace:**

```ts

/** The panel's first line: the headline in flight, "Home from 4 days away" after a recap's trip, else Stage 1B's. */
export function sheetHeadline(facts: TripFacts, t: number): string {
  const inFlight = headline(facts, t)
  if (inFlight) return inFlight
```

**with:**

```ts

/**
 * The panel's first line: the headline in flight, "Home from 4 days away" after a recap's trip, else Stage 1B's. The
 * latest event's banner is on the map above it, so the headline here leaves events out (latest event design §2).
 */
export function sheetHeadline(facts: TripFacts, t: number): string {
  const inFlight = headline(facts, t, false)
  if (inFlight) return inFlight
```

**In `src/facts/tripFactsRows.ts`, replace (1 of 3):**

```ts
import { chase, cockpitHorizonOnLeg, moonSight, nextGroundSunEvent, sunAltitudeOnLeg } from './sky'
import { belowText, forecastFor, isRecapOver, isStillOnGround, lastSeenText, sheetHeadline, showsLiveData, tripSoFar, type TripFacts } from './tripFacts'
import { longestFlight, totalsSoFar, wholeTotals, type TripTotals } from './tripTotals'
```

**with:**

```ts
import { chase, cockpitHorizonOnLeg, moonSight, nextGroundSunEvent, sunAltitudeOnLeg } from './sky'
import {
  belowText, forecastFor, isRecapOver, isStillOnGround, lastSeenText, latestEvent, sheetHeadline, showsLiveData, tripSoFar, type TripFacts,
} from './tripFacts'
import { longestFlight, totalsSoFar, wholeTotals, type TripTotals } from './tripTotals'
```

**In `src/facts/tripFactsRows.ts`, replace (2 of 3):**

```ts
 * Everything the full map's panel shows at `t`: the headline, the rows and the trip so far, and whether the footer
 * credits adsb.lol, as it does whenever a flight of the trip has live data (Stage 3 spec §8).
 */
```

**with:**

```ts
 * Everything the full map's panel shows at `t`: the headline, the rows and the trip so far, and whether the footer
 * credits adsb.lol, as it does whenever a flight of the trip has live data (Stage 3 spec §8). And the latest event, which
 * the full map shows large over the map (latest event design §1).
 */
```

**In `src/facts/tripFactsRows.ts`, replace (3 of 3):**

```ts
    headline: sheetHeadline(facts, t), rows: factRows(facts, t, now), tripSoFar: tripSoFar(facts, t), showsLiveCredit: showsLiveData(facts),
  }
```

**with:**

```ts
    headline: sheetHeadline(facts, t), rows: factRows(facts, t, now), tripSoFar: tripSoFar(facts, t), showsLiveCredit: showsLiveData(facts),
    latestEvent: latestEvent(facts, t),
  }
```

**In `src/styles/tripMap.css`, replace:**

```css
}
.trip-map-key-item { display: flex; align-items: center; gap: 5px; white-space: nowrap; }
```

**with:**

```css
}
/* The newest event of the flight in the air (latest event design §1, §2): the event large, and how long ago under it,
   smaller and muted, in the chips' glass. On the card at the map's top left, in the top chip's place; on the full map
   centred under the pill, over the open part of the map (TripMapPage sets where that starts). While it shows, the key
   moves just under it where they don't fit side by side (LatestEventBanner's bannerLayout sets its top). */
.latest-event {
  display: flex;
  flex-direction: column;
  gap: 1px;
  box-sizing: border-box;
  max-width: calc(100% - 20px);
  padding: 7px 12px;
  border-radius: 14px;
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  pointer-events: none;
}
.trip-map-open .latest-event { position: absolute; top: 10px; left: 10px; }
.latest-event-title { font-size: 1.0625rem; font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; }
.latest-event-when { color: var(--text-2); font-size: 0.75rem; }
.latest-event-place {
  position: absolute;
  top: 10px;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 0 10px;
  pointer-events: none;
}
.latest-event.centred { max-width: 100%; align-items: center; text-align: center; }
.trip-map-key-item { display: flex; align-items: center; gap: 5px; white-space: nowrap; }
```

**Create `src/ui/LatestEventBanner.tsx`:**

```tsx
import type { Ref } from 'preact'
import type { LatestEvent } from '../facts/factRow'
import type { Size } from './hooks/useSize'

/** How far the banner sits in from the map's edges, as the card's chips do (`.latest-event` in tripMap.css). */
export const BANNER_EDGE = 10

/** The room between the banner and the key to the two planes, beside it or under it. */
const KEY_GAP = 6

/** The room the camera leaves between the banner, or the key under it, and the plane: as under the card's chips. */
const CAMERA_GAP = 4

export interface BannerLayout {
  /** The key's top, down from the map's top edge, where it moves under the banner; null where it stays at the top right. */
  keyTop: number | null
  /** How far down from the map's top edge the banner, and the key with it, reach, and a gap: the camera keeps the plane below. */
  inset: number
}

/**
 * Where the key to the two planes goes while the banner shows, and how far down the two reach. The website's own (Todd,
 * 16 Nov 2026): the key stays where it always is, at the map's top right, where it fits beside the banner with a gap
 * between them, as on a computer; else it moves just under the banner, still at the right. `bannerRight` is the
 * banner's right edge from the map's left. A key of no width, none shown or not yet laid out, stays where it is.
 */
export function bannerLayout(bannerRight: number, banner: Size, key: Size, mapWidth: number): BannerLayout {
  const reach = (depth: number) => (depth > 0 ? BANNER_EDGE + depth + CAMERA_GAP : 0)
  const fitsBeside = bannerRight + KEY_GAP <= mapWidth - BANNER_EDGE - key.width
  if (fitsBeside || key.width === 0) return { keyTop: null, inset: reach(Math.max(banner.height, key.height)) }
  return { keyTop: BANNER_EDGE + banner.height + KEY_GAP, inset: reach(banner.height + KEY_GAP + key.height) }
}

export interface LatestEventBannerProps {
  event: LatestEvent
  /**
   * On the full map it's centred under the pill and reads its sentence to screen readers. On the card it sits in the
   * map's top corner, and the card's sentence has it.
   */
  isFullMap?: boolean
  /** The banner itself, measured for the key and the camera. */
  boxRef?: Ref<HTMLSpanElement>
}

/**
 * The newest event of the flight in the air, shown large until the next (latest event design §1, §2): what it was, and
 * under it, smaller, how long ago, in the chips' glass. Spans, as the card's map is inside its button.
 */
export function LatestEventBanner({ event, isFullMap = false, boxRef }: LatestEventBannerProps) {
  return (
    <span ref={boxRef} class={isFullMap ? 'latest-event centred' : 'latest-event'} aria-hidden={isFullMap ? undefined : 'true'}>
      <span class="latest-event-title" aria-hidden="true">{event.title}</span>
      <span class="latest-event-when" aria-hidden="true">{event.when}</span>
      {isFullMap && <span class="sr-only">{event.sentence}</span>}
    </span>
  )
}
```

**In `src/ui/PlaneKey.tsx`, replace (1 of 2):**

```tsx
import type { Ref } from 'preact'

```

**with:**

```tsx
import type { Ref } from 'preact'

export interface PlaneKeyProps {
  boxRef?: Ref<HTMLSpanElement>
  /**
   * Its top, down from the map's top edge, while it's moved just under the latest event's banner (Todd, 16 Nov 2026).
   * Null where it stays at the map's top right, as it always has.
   */
  top?: number | null
}

```

**In `src/ui/PlaneKey.tsx`, replace (2 of 2):**

```tsx
 */
export function PlaneKey({ boxRef }: { boxRef?: Ref<HTMLSpanElement> }) {
  return (
    <span ref={boxRef} class="trip-map-key" aria-hidden="true">
      <span class="trip-map-key-item"><span class="trip-map-key-mark real" />Real plane</span>
```

**with:**

```tsx
 */
export function PlaneKey({ boxRef, top = null }: PlaneKeyProps) {
  return (
    <span ref={boxRef} class="trip-map-key" aria-hidden="true" style={top == null ? undefined : { top: `${top}px` }}>
      <span class="trip-map-key-item"><span class="trip-map-key-mark real" />Real plane</span>
```

**In `src/ui/TripMapCard.tsx`, replace (1 of 7):**

```tsx
import { useRef, useState } from 'preact/hooks'
import { cardSummary, headline, recapLongestLine, recapTiles, type TripFacts } from '../facts/tripFacts'
import { delayBannerText, spokenDelayBanner } from '../copy/flight'
```

**with:**

```tsx
import { useRef, useState } from 'preact/hooks'
import { cardSummary, headline, latestEvent, recapLongestLine, recapTiles, type TripFacts } from '../facts/tripFacts'
import { delayBannerText, spokenDelayBanner } from '../copy/flight'
```

**In `src/ui/TripMapCard.tsx`, replace (2 of 7):**

```tsx
import { useMapStyle } from './hooks/useMapStyle'
import { useWidth } from './hooks/useWidth'
import { Icon } from './Icon'
import { PlaneKey } from './PlaneKey'
```

**with:**

```tsx
import { useMapStyle } from './hooks/useMapStyle'
import { useSizeOf } from './hooks/useSizeOf'
import { useWidth } from './hooks/useWidth'
import { Icon } from './Icon'
import { BANNER_EDGE, bannerLayout, LatestEventBanner } from './LatestEventBanner'
import { PlaneKey } from './PlaneKey'
```

**In `src/ui/TripMapCard.tsx`, replace (3 of 7):**

```tsx
  land: GeoPoint[][] | null
  /** The facts (Stage 2 spec §6.4, §6.5): the headline on the chip in flight, the recap's numbers and the spoken summary. */
  facts?: TripFacts | null
```

**with:**

```tsx
  land: GeoPoint[][] | null
  /**
   * The facts (Stage 2 spec §6.4, §6.5): the headline on the chip in flight, the recap's numbers and the spoken summary,
   * and the latest event's banner (latest event design §1).
   */
  facts?: TripFacts | null
```

**In `src/ui/TripMapCard.tsx`, replace (4 of 7):**

```tsx
  const chips = cardChips(p.map, p.now, p.viewerTz, p.h24)
  // In flight the bottom chip is the facts' headline, which falls back to the landing countdown (§6.4).
  const bottom = (leg && p.facts ? headline(p.facts, p.now) : null) ?? chips.bottom
  const summary = p.facts ? cardSummary(p.facts, p.now, p.name) : tripMapSummary(p.map, p.now, p.name, p.viewerTz, p.h24)
```

**with:**

```tsx
  const chips = cardChips(p.map, p.now, p.viewerTz, p.h24)
  // In flight, the newest event, large in the map's top corner, where the top chip would be (latest event design §2).
  const latest = p.facts ? latestEvent(p.facts, p.now) : null
  // In flight the bottom chip is the facts' headline, which falls back to the landing countdown (§6.4). The banner says
  // the event, so the chip leaves events out.
  const bottom = (leg && p.facts ? headline(p.facts, p.now, false) : null) ?? chips.bottom
  const summary = p.facts ? cardSummary(p.facts, p.now, p.name) : tripMapSummary(p.map, p.now, p.name, p.viewerTz, p.h24)
```

**In `src/ui/TripMapCard.tsx`, replace (5 of 7):**

```tsx
  // The camera keeps the trip in the band between the chips, so neither covers the pilot's marker or a route. The key
  // is kept clear as the top chip is.
  const [topChip, setTopChip] = useState<HTMLElement | null>(null)
```

**with:**

```tsx
  // The camera keeps the trip in the band between the chips, so neither covers the pilot's marker or a route. The key
  // is kept clear as the top chip is, and the banner as the top chip, with the key under it where it has moved there.
  const [topChip, setTopChip] = useState<HTMLElement | null>(null)
```

**In `src/ui/TripMapCard.tsx`, replace (6 of 7):**

```tsx
  const [key, setKey] = useState<HTMLElement | null>(null)
  const insets = chipInsets(Math.max(useHeightOf(topChip), useHeightOf(key)), useHeightOf(bottomChip))
  return (
```

**with:**

```tsx
  const [key, setKey] = useState<HTMLElement | null>(null)
  const [banner, setBanner] = useState<HTMLElement | null>(null)
  const keySize = useSizeOf(key)
  const bannerSize = useSizeOf(banner)
  const chipped = chipInsets(Math.max(useHeightOf(topChip), keySize.height), useHeightOf(bottomChip))
  const layout = latest ? bannerLayout(BANNER_EDGE + bannerSize.width, bannerSize, keySize, width) : null
  const insets = layout ? { ...chipped, top: layout.inset } : chipped
  return (
```

**In `src/ui/TripMapCard.tsx`, replace (7 of 7):**

```tsx
        </span>
        {chips.top && <span ref={setTopChip} class="trip-map-chip top" aria-hidden="true">{chips.top}</span>}
        {showsKey && <PlaneKey boxRef={setKey} />}
        {bottom && (
```

**with:**

```tsx
        </span>
        {latest ? <LatestEventBanner event={latest} boxRef={setBanner} />
          : chips.top && <span ref={setTopChip} class="trip-map-chip top" aria-hidden="true">{chips.top}</span>}
        {showsKey && <PlaneKey boxRef={setKey} top={layout?.keyTop} />}
        {bottom && (
```

**In `src/ui/TripMapPage.tsx`, replace (1 of 4):**

```tsx
import { useSize } from './hooks/useSize'
import { Icon } from './Icon'
import { PlaneKey } from './PlaneKey'
```

**with:**

```tsx
import { useSize } from './hooks/useSize'
import { useSizeOf } from './hooks/useSizeOf'
import { Icon } from './Icon'
import { bannerLayout, LatestEventBanner } from './LatestEventBanner'
import { PlaneKey } from './PlaneKey'
```

**In `src/ui/TripMapPage.tsx`, replace (2 of 4):**

```tsx
  const showsFacts = facts != null && open

```

**with:**

```tsx
  const showsFacts = facts != null && open
  // The newest event of the flight in the air, large under the pill until the next (latest event design §1, §2).
  const latest = facts?.latestEvent ?? null
  const [banner, setBanner] = useState<HTMLElement | null>(null)
  const [key, setKey] = useState<HTMLElement | null>(null)
  const bannerSize = useSizeOf(banner)
  const keySize = useSizeOf(key)

```

**In `src/ui/TripMapPage.tsx`, replace (3 of 4):**

```tsx
  // folded to the corner. The bottom panel sits under the map, which shrinks to make room (§10).
  const insets: Insets = !side || panelSize.width === 0 ? NO_INSETS
    : showsFacts ? { ...NO_INSETS, left: panelSize.width + 2 * PANEL_MARGIN }
    : { ...NO_INSETS, bottom: panelSize.height + 2 * PANEL_MARGIN }

```

**with:**

```tsx
  // folded to the corner. The bottom panel sits under the map, which shrinks to make room (§10).
  const panelInsets: Insets = !side || panelSize.width === 0 ? NO_INSETS
    : showsFacts ? { ...NO_INSETS, left: panelSize.width + 2 * PANEL_MARGIN }
    : { ...NO_INSETS, bottom: panelSize.height + 2 * PANEL_MARGIN }
  // The banner is centred over the open map, clear of a side panel open over its left edge, so its right edge is half
  // its width past the middle of what's open. The key moves just under it where they don't fit side by side (Todd, 16
  // Nov 2026), and the camera keeps the plane clear of both (latest event design §2).
  const openLeft = panelInsets.left
  const layout = latest ? bannerLayout(openLeft + (width - openLeft + bannerSize.width) / 2, bannerSize, keySize, width) : null
  const insets: Insets = layout ? { ...panelInsets, top: layout.inset } : panelInsets

```

**In `src/ui/TripMapPage.tsx`, replace (4 of 4):**

```tsx
          planeWords={(leg, plane) => planePopupWords(leg, plane, t, isReplay, viewerTz, h24)} />
        {/* The key to the real plane and its ghost, while both show: now, not in a replay (which plane design §2). */}
        {!isReplay && showsPlaneKey(tripMapDrawing(map, t)) && <PlaneKey />}
      </div>
```

**with:**

```tsx
          planeWords={(leg, plane) => planePopupWords(leg, plane, t, isReplay, viewerTz, h24)} />
        {latest && (
          <div class="latest-event-place" style={{ left: `${openLeft}px` }}>
            <LatestEventBanner event={latest} isFullMap boxRef={setBanner} />
          </div>
        )}
        {/* The key to the real plane and its ghost, while both show: now, not in a replay (which plane design §2). */}
        {!isReplay && showsPlaneKey(tripMapDrawing(map, t)) && <PlaneKey boxRef={setKey} top={layout?.keyTop} />}
      </div>
```

**In `src/ui/hooks/useHeightOf.ts`, replace (1 of 2):**

```ts
import { useLayoutEffect, useState } from 'preact/hooks'

```

**with:**

```ts
import { useSizeOf } from './useSizeOf'

```

**In `src/ui/hooks/useHeightOf.ts`, replace (2 of 2):**

```ts
 */
export function useHeightOf(element: HTMLElement | null): number {
  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    if (!element) {
      setHeight(0)
      return
    }
    const measure = () => setHeight(element.getBoundingClientRect().height)
    measure()
    if (typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])
  return height
}
```

**with:**

```ts
 */
export const useHeightOf = (element: HTMLElement | null): number => useSizeOf(element).height
```

**Create `src/ui/hooks/useSizeOf.ts`:**

```ts
import { useLayoutEffect, useState } from 'preact/hooks'
import type { Size } from './useSize'

const NOTHING: Size = { width: 0, height: 0 }

/**
 * An element's width and height in CSS pixels, measured as it appears and again whenever they change, or nothing while
 * there's none. Unlike `useSize`, it follows an element that comes and goes: pass the element itself, kept from a
 * callback ref.
 */
export function useSizeOf(element: HTMLElement | null): Size {
  const [size, setSize] = useState(NOTHING)
  useLayoutEffect(() => {
    if (!element) {
      setSize(NOTHING)
      return
    }
    const measure = () => {
      const { width, height } = element.getBoundingClientRect()
      setSize((was) => (was.width === width && was.height === height ? was : { width, height }))
    }
    measure()
    if (typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])
  return size
}
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 94 tests pass. Then `npx tsc --noEmit`: nothing; and `npm test`: 176 test files and 3,658 tests pass.

- [x] **Step 5: Commit, on Todd's yes (after batch B's checkpoint).**

```bash
git add src/facts/factRow.ts src/facts/tripFacts.ts src/facts/tripFactsRows.ts src/styles/tripMap.css src/ui/LatestEventBanner.tsx src/ui/PlaneKey.tsx src/ui/TripMapCard.tsx src/ui/TripMapPage.tsx src/ui/hooks/useHeightOf.ts src/ui/hooks/useSizeOf.ts tests/facts/liveTripFacts.test.ts tests/facts/tripFacts.test.ts tests/facts/tripFactsRows.test.ts tests/ui/latestEventBanner.test.tsx
git commit -m "The latest event shows large on the card and the full map until the next one, with the key just under it where they don't fit side by side, and the camera kept clear of both (latest event design §2, Todd's answer, 16 Nov 2026)"
```

---

### Task 5: The list draws nothing with nothing to list

With "Trip so far" said once, the list can have nothing to say: on a layover, where the rows have the totals, while no flight has an event yet (as before the geography has loaded). It then draws nothing at all, so no empty box adds a second gap between the rows and the footer.

**Files:**
- Modify: `src/ui/TripSoFarList.tsx`
- Test: `tests/ui/FactsBody.test.tsx`

- [x] **Step 1: Write the tests.**

**In `tests/ui/FactsBody.test.tsx`, replace:**

```tsx
    expect(screen.queryByRole('heading', { name: 'Trip so far' })).toBeNull()
  })
```

**with:**

```tsx
    expect(screen.queryByRole('heading', { name: 'Trip so far' })).toBeNull()
  })

  it('leaves no empty space where the trip so far has nothing to list', () => {
    // On a layover the rows have "Trip so far" (best guesses design §4): with no flight's event yet, as before the
    // geography has loaded, the list has nothing to say, and the footer follows the rows one gap below.
    const { container } = render(<FactsBody rows={[below]} tripSoFar={{ flights: [], totalsTitle: 'Trip so far', totals: null }} />)
    expect(container.querySelector('.trip-so-far')).toBeNull()
    expect([...container.querySelector('.facts-body')!.children].map((c) => c.className)).toEqual(['fact-rows', 'facts-footer'])
  })

  it('lists the flights alone where the rows have the totals, and the totals alone with no flight to list', () => {
    const { container } = render(<FactsBody rows={[below]} tripSoFar={{ ...soFar, totals: null }} />)
    expect(container.querySelector('.trip-so-far-flight h3')?.textContent).toBe('UPS201 · Louisville → Cologne')
    expect(container.querySelector('.trip-so-far-totals')).toBeNull()
    cleanup()
    const totalsOnly = render(<FactsBody rows={[below]} tripSoFar={{ ...soFar, flights: [] }} />)
    expect(totalsOnly.container.querySelector('.trip-so-far-flight')).toBeNull()
    expect(screen.getByText('Day 1 of 4 · 2,140 mi')).toBeTruthy()
  })
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/ui/FactsBody.test.tsx
```

Expected: 1 of the 13 tests fails: with nothing to list, the trip so far still draws an empty box.

- [x] **Step 3: Write the code.**

**In `src/ui/TripSoFarList.tsx`, replace:**

```tsx
 * slanted.
 */
export function TripSoFarList({ tripSoFar }: { tripSoFar: TripSoFar }) {
  return (
```

**with:**

```tsx
 * slanted.
 *
 * With nothing to list, as on a layover whose rows say "Trip so far" before any flight has an event, it's left out
 * altogether: an empty box would add a second gap between the rows and the footer.
 */
export function TripSoFarList({ tripSoFar }: { tripSoFar: TripSoFar }) {
  if (tripSoFar.flights.length === 0 && !tripSoFar.totals) return null
  return (
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 13 tests pass. Then `npx tsc --noEmit`: nothing; and `npm test`: 176 test files and 3,660 tests pass.

- [x] **Step 5: Commit, on Todd's yes (after batch B's checkpoint).**

```bash
git add src/ui/TripSoFarList.tsx tests/ui/FactsBody.test.tsx
git commit -m "The trip so far draws nothing with nothing to list, so no empty box adds a gap under the rows (best guesses design §4)"
```

---

### Task 6: The review's fixes: the card's plane kept clear of the banner, and the key's place steady

The review of Tasks 2 to 5 and a look in a browser (see "How this plan was checked") found two things. On a phone's card (375 px wide, `live-ocean-gap`) the plane and its ghost sat under the banner. The card's map is 220 px tall; with the banner, the key under it and the bottom chip, the clear band was about 87 px, too thin to frame the trip in. The camera then framed the trip over the whole map, and slid only the pilot's marker into the band, which isn't drawn in flight. Now `keptInView` says what to keep there: the pilot's marker on the ground; in flight the real plane, then its ghost, else the schedule's plane. The slide (`slideToShow`) shows them all where they fit, else the first alone, by whole pixels, and not at all for under half a pixel. Both maps do it: Apple's, in its first framing and its check once MapKit settles, and the site's own. And the key hopped between beside the banner and under it as the "when" grew. Its place now goes by the wider of the title and the widest "when" (`WIDEST_EVENT_WHEN`, "About 88 h 88 min ago"), laid out unseen in the banner to be measured in its own font (`useBannerSize`), so it stays put while the same event shows. The banner itself is still as wide as what it shows.

**Files:**
- Modify: `src/copy/facts.ts`, `src/map/appleMapPlan.ts`, `src/map/mapFit.ts`, `src/map/tripMapDrawing.ts`, `src/styles/tripMap.css`, `src/ui/AppleTripMap.tsx`, `src/ui/LatestEventBanner.tsx`, `src/ui/TripMapCard.tsx`, `src/ui/TripMapPage.tsx`, `src/ui/TripMapSvg.tsx`
- Test: `tests/copy/facts.test.ts`, `tests/map/appleMapPlan.test.ts`, `tests/map/mapFit.test.ts`, `tests/map/tripMapDrawing.test.ts`, `tests/ui/AppleTripMap.test.tsx`, `tests/ui/latestEventBanner.test.tsx`

- [x] **Step 1: Write the tests.**

**In `tests/copy/facts.test.ts`, replace (1 of 2):**

```ts
  flownText, flyingInto, groundSunText, halfwayText, heightAndSpeedText, inTheAirTag, landsText, lastSeenLine, LIVE_CREDIT, midLine, milestoneHeadline,
  milestoneLine, moonText, SPOKEN_LIVE_CREDIT, spokenLastSeen, spokenLatestEvent, stillOnGroundText, timeDifferenceText, toGoText,
} from '../../src/copy/facts'
```

**with:**

```ts
  flownText, flyingInto, groundSunText, halfwayText, heightAndSpeedText, inTheAirTag, landsText, lastSeenLine, LIVE_CREDIT, midLine, milestoneHeadline,
  milestoneLine, moonText, SPOKEN_LIVE_CREDIT, spokenLastSeen, spokenLatestEvent, stillOnGroundText, timeDifferenceText, toGoText, WIDEST_EVENT_WHEN,
} from '../../src/copy/facts'
```

**In `tests/copy/facts.test.ts`, replace (2 of 2):**

```ts

  it('is a sentence for screen readers', () => {
```

**with:**

```ts

  it('has a widest form, which the banner keeps room for: no "when" of a flight in the air is longer', () => {
    expect(WIDEST_EVENT_WHEN).toBe('About 88 h 88 min ago')
    // Any event of a flight up to 99 hours long, seen or a best guess, now or at a moment of the replay, 12- or 24-hour.
    const guessed = { ...crossed, isEstimate: true }
    for (let minutes = 0; minutes < 100 * 60; minutes++) {
      const t = NOW + minutes * MIN
      for (const event of [crossed, guessed]) {
        expect(eventWhen(event, t, NY, false).length).toBeLessThanOrEqual(WIDEST_EVENT_WHEN.length)
        expect(eventWhen({ ...event, time: t }, t + MIN, NY, false, true).length).toBeLessThanOrEqual(WIDEST_EVENT_WHEN.length)
        expect(eventWhen({ ...event, time: t }, t + MIN, NY, true, true).length).toBeLessThanOrEqual(WIDEST_EVENT_WHEN.length)
      }
    }
  })

  it('is a sentence for screen readers', () => {
```

**In `tests/map/appleMapPlan.test.ts`, replace (1 of 14):**

```ts
import { placeAt } from '../../src/map/svgPaths'
import { makeTripMap } from '../../src/map/tripMap'
import { tripMapDrawing } from '../../src/map/tripMapDrawing'
```

**with:**

```ts
import { placeAt } from '../../src/map/svgPaths'
import type { GeoPoint } from '../../src/map/greatCircle'
import { framingPoints, legProgress, makeTripMap, positionAt } from '../../src/map/tripMap'
import { tripMapDrawing } from '../../src/map/tripMapDrawing'
```

**In `tests/map/appleMapPlan.test.ts`, replace (2 of 14):**

```ts
  it('takes the view the SVG map takes, with nothing to keep clear', () => {
    const camera = appleCamera(places, null, 390, 520, NO_INSETS)
    expect(camera).toEqual({ rect: fitClear(fitRect(places)!, 390, 520), padding: NO_INSETS })
```

**with:**

```ts
  it('takes the view the SVG map takes, with nothing to keep clear', () => {
    const camera = appleCamera(places, [], 390, 520, NO_INSETS)
    expect(camera).toEqual({ rect: fitClear(fitRect(places)!, 390, 520), padding: NO_INSETS })
```

**In `tests/map/appleMapPlan.test.ts`, replace (3 of 14):**

```ts
    const insets = { top: 0, right: 0, bottom: 0, left: 400 }
    const camera = appleCamera(places, null, 1000, 500, insets)
    expect(camera.padding).toEqual(insets)
```

**with:**

```ts
    const insets = { top: 0, right: 0, bottom: 0, left: 400 }
    const camera = appleCamera(places, [], 1000, 500, insets)
    expect(camera.padding).toEqual(insets)
```

**In `tests/map/appleMapPlan.test.ts`, replace (4 of 14):**

```ts
    const pilot = map.legs[0].destination.place
    const camera = appleCamera(places, pilot, 343, 220, insets)
    // Too thin to frame in, so MapKit gets the whole view and no padding, and the marker sits in the band.
```

**with:**

```ts
    const pilot = map.legs[0].destination.place
    const camera = appleCamera(places, [pilot], 343, 220, insets)
    // Too thin to frame in, so MapKit gets the whole view and no padding, and the marker sits in the band.
```

**In `tests/map/appleMapPlan.test.ts`, replace (5 of 14):**

```ts
    // Without the slide the marker would lie outside the band.
    const unslid = placeAt(pilot, { rect: appleCamera(places, null, 343, 220, insets).rect, width: 343, height: 220 }).y
    expect(unslid < 90 || unslid > 130).toBe(true)
```

**with:**

```ts
    // Without the slide the marker would lie outside the band.
    const unslid = placeAt(pilot, { rect: appleCamera(places, [], 343, 220, insets).rect, width: 343, height: 220 }).y
    expect(unslid < 90 || unslid > 130).toBe(true)
```

**In `tests/map/appleMapPlan.test.ts`, replace (6 of 14):**

```ts
    const insets = { top: 0, right: 0, bottom: 0, left: 400 }
    const camera = appleCamera(ends, null, 1000, 500, insets)
    // The North Pacific, the short way round: 70° and its margins, where the long way would be over three quarters of the world.
```

**with:**

```ts
    const insets = { top: 0, right: 0, bottom: 0, left: 400 }
    const camera = appleCamera(ends, [], 1000, 500, insets)
    // The North Pacific, the short way round: 70° and its margins, where the long way would be over three quarters of the world.
```

**In `tests/map/appleMapPlan.test.ts`, replace (7 of 14):**

```ts
    }
  })
```

**with:**

```ts
    }
  })
})

describe('keeping the plane and its ghost in the card’s band under the latest event (latest event design §2)', () => {
  // Louisville to Anchorage, five hours into six: the plane is near Anchorage, at the top of the card's view of the leg,
  // and its ghost a little behind it. Todd's measures of the card at phone width: 342 × 220, the banner 50 px tall with
  // the key under it, 23 px, and the bottom chip 23 px: the camera keeps 93 px at the top and 37 at the bottom, a band
  // too thin to frame the leg in.
  const map = makeTripMap([flight('a1', 'SDF', 'ANC', 0, 6)], { isNextTrip: false, home: 'SDF', now: at(5), airports: AIRPORTS })!
  const leg = map.legs[0]
  const framing = framingPoints(map, leg)
  const plane = positionAt(leg, legProgress(leg, at(5)))
  const ghost = positionAt(leg, legProgress(leg, at(4.8)))
  const banner: Insets = { top: 93, right: 0, bottom: 37, left: 0 }
  const yOf = (place: GeoPoint, camera: AppleCamera) => placeAt(place, { rect: camera.rect, width: 342, height: 220 }).y

  it('slides the whole view so both sit in the band, their marks and margins clear of the banner, the key and the chip', () => {
    const camera = appleCamera(framing, [plane, ghost], 342, 220, banner)
    expect(camera.padding).toEqual(NO_INSETS)
    for (const place of [plane, ghost]) {
      expect(yOf(place, camera)).toBeGreaterThanOrEqual(93 + 20)
      expect(yOf(place, camera)).toBeLessThanOrEqual(220 - 37 - 20)
    }
    // Without them, as before, the plane sat under the banner.
    expect(yOf(plane, appleCamera(framing, [], 342, 220, banner))).toBeLessThan(93)
  })

  it('once MapKit shows what it was asked for, slides no more', () => {
    expect(slideIntoView(appleCamera(framing, [plane, ghost], 342, 220, banner), [plane, ghost], 342, 220, banner)).toBeNull()
  })
```

**In `tests/map/appleMapPlan.test.ts`, replace (8 of 14):**

```ts
  const marker = (shown: AppleCamera) => placeAt(home, { rect: wholeView(shown), width, height })
  const asked = appleCamera(places, home, width, height, insets)

  it('leaves the view alone when MapKit shows what it was asked for: the marker is in view', () => {
    expect(slideIntoView(asked, home, width, height, insets)).toBeNull()
  })
```

**with:**

```ts
  const marker = (shown: AppleCamera) => placeAt(home, { rect: wholeView(shown), width, height })
  const asked = appleCamera(places, [home], width, height, insets)

  it('leaves the view alone when MapKit shows what it was asked for: the marker is in view', () => {
    expect(slideIntoView(asked, [home], width, height, insets)).toBeNull()
  })
```

**In `tests/map/appleMapPlan.test.ts`, replace (9 of 14):**

```ts
    expect(marker(shown).x > width || marker(shown).y > height).toBe(true)
    const slid = slideIntoView(shown, home, width, height, insets)!
    expect(slid.padding).toEqual(insets)
```

**with:**

```ts
    expect(marker(shown).x > width || marker(shown).y > height).toBe(true)
    const slid = slideIntoView(shown, [home], width, height, insets)!
    expect(slid.padding).toEqual(insets)
```

**In `tests/map/appleMapPlan.test.ts`, replace (10 of 14):**

```ts
    expect(marker(nudged).y).toBeCloseTo(47, 0)
    const slid = slideIntoView(nudged, home, width, height, insets)!
    expect(marker(slid).x).toBeCloseTo(width / 2, 0)
```

**with:**

```ts
    expect(marker(nudged).y).toBeCloseTo(47, 0)
    const slid = slideIntoView(nudged, [home], width, height, insets)!
    expect(marker(slid).x).toBeCloseTo(width / 2, 0)
```

**In `tests/map/appleMapPlan.test.ts`, replace (11 of 14):**

```ts
    const thin = { top: 90, right: 0, bottom: 90, left: 0 }
    const camera = appleCamera(places, home, width, height, thin)
    expect(camera.padding).toEqual(NO_INSETS)
    const slid = slideIntoView(atLimit(camera, 0.6), home, width, height, thin)!
    expect(slid.padding).toEqual(NO_INSETS)
```

**with:**

```ts
    const thin = { top: 90, right: 0, bottom: 90, left: 0 }
    const camera = appleCamera(places, [home], width, height, thin)
    expect(camera.padding).toEqual(NO_INSETS)
    const slid = slideIntoView(atLimit(camera, 0.6), [home], width, height, thin)!
    expect(slid.padding).toEqual(NO_INSETS)
```

**In `tests/map/appleMapPlan.test.ts`, replace (12 of 14):**

```ts
      const { place, view } = scene(10, 5)
      const slid = slideIntoView(shownOf(view), place, width, height, insets)!
      expect(wholeView(slid).width).toBeCloseTo(view.width, 12)
```

**with:**

```ts
      const { place, view } = scene(10, 5)
      const slid = slideIntoView(shownOf(view), [place], width, height, insets)!
      expect(wholeView(slid).width).toBeCloseTo(view.width, 12)
```

**In `tests/map/appleMapPlan.test.ts`, replace (13 of 14):**

```ts
      expect(view.x - 0.3 * perPixel).toBeLessThan(0)
      expect(slideIntoView(shownOf(view), place, width, height, insets)).toBeNull()
    })
```

**with:**

```ts
      expect(view.x - 0.3 * perPixel).toBeLessThan(0)
      expect(slideIntoView(shownOf(view), [place], width, height, insets)).toBeNull()
    })
```

**In `tests/map/appleMapPlan.test.ts`, replace (14 of 14):**

```ts
  it('takes a marker already slid into view as in view, so a second check never chases rounding', () => {
    const slid = slideIntoView(atLimit(asked, 0.6), home, width, height, insets)!
    expect(slideIntoView(slid, home, width, height, insets)).toBeNull()
  })
```

**with:**

```ts
  it('takes a marker already slid into view as in view, so a second check never chases rounding', () => {
    const slid = slideIntoView(atLimit(asked, 0.6), [home], width, height, insets)!
    expect(slideIntoView(slid, [home], width, height, insets)).toBeNull()
  })
```

**In `tests/map/mapFit.test.ts`, replace (1 of 4):**

```ts
  it('leaves the view alone when the marker shows in the clear part', () => {
    expect(slideToShow(rect, 400, 200, { x: 200, y: 100 }, 12, chips)).toBe(rect)
  })
```

**with:**

```ts
  it('leaves the view alone when the marker shows in the clear part', () => {
    expect(slideToShow(rect, 400, 200, [{ x: 200, y: 100 }], 12, chips)).toBe(rect)
  })
```

**In `tests/map/mapFit.test.ts`, replace (2 of 4):**

```ts
    // The band ends 40 px from the bottom, at 160 px: the marker's centre goes to 140 px, 45 px up.
    const slid = slideToShow(rect, 400, 200, { x: 100, y: 185 }, 12, chips)
    expect(slid.x).toBe(rect.x)
```

**with:**

```ts
    // The band ends 40 px from the bottom, at 160 px: the marker's centre goes to 140 px, 45 px up.
    const slid = slideToShow(rect, 400, 200, [{ x: 100, y: 185 }], 12, chips)
    expect(slid.x).toBe(rect.x)
```

**In `tests/map/mapFit.test.ts`, replace (3 of 4):**

```ts
  it('slides each axis on its own: in from the right edge and down from the top', () => {
    const slid = slideToShow(rect, 400, 200, { x: 395, y: 5 }, 12)
    expect(slid.x).toBeCloseTo(rect.x + 15 * perPixel, 12)
```

**with:**

```ts
  it('slides each axis on its own: in from the right edge and down from the top', () => {
    const slid = slideToShow(rect, 400, 200, [{ x: 395, y: 5 }], 12)
    expect(slid.x).toBeCloseTo(rect.x + 15 * perPixel, 12)
```

**In `tests/map/mapFit.test.ts`, replace (4 of 4):**

```ts
    // 20 px clear between 90 and 110 px, less than the marker's 40: its centre goes to 100 px.
    const slid = slideToShow(rect, 400, 200, { x: 200, y: 150 }, 12, { ...NO_INSETS, top: 90, bottom: 90 })
    expect(slid.y).toBeCloseTo(rect.y + 50 * perPixel, 12)
  })
})
```

**with:**

```ts
    // 20 px clear between 90 and 110 px, less than the marker's 40: its centre goes to 100 px.
    const slid = slideToShow(rect, 400, 200, [{ x: 200, y: 150 }], 12, { ...NO_INSETS, top: 90, bottom: 90 })
    expect(slid.y).toBeCloseTo(rect.y + 50 * perPixel, 12)
  })

  // A band from 60 px down to 160 px, under the latest event's banner and over the bottom chip (latest event design §2).
  const band = { ...NO_INSETS, top: 60, bottom: 40 }

  it('shows every mark where they fit in the clear part together: the real plane and its ghost', () => {
    // Both above the band, 10 px apart: the higher one goes 20 px inside its top, 60 px down, and the other with it.
    const slid = slideToShow(rect, 400, 200, [{ x: 200, y: 30 }, { x: 210, y: 20 }], 12, band)
    expect(slid.x).toBe(rect.x)
    expect(slid.y).toBeCloseTo(rect.y - 60 * perPixel, 12)
  })

  it('shows the first mark alone where they don’t fit together: the real plane before its ghost', () => {
    // 180 px apart in a 100 px band: the real plane, below it, comes up to 140 px, and the ghost is left above.
    const slid = slideToShow(rect, 400, 200, [{ x: 200, y: 190 }, { x: 200, y: 10 }], 12, band)
    expect(slid.y).toBeCloseTo(rect.y + 50 * perPixel, 12)
  })

  it('with nothing to keep in view, as on a drive, leaves the view alone, however thin the band', () => {
    expect(slideToShow(rect, 400, 200, [], 12, band)).toBe(rect)
    expect(slideToShow(rect, 400, 200, [], 12, { ...NO_INSETS, top: 90, bottom: 90 })).toBe(rect)
  })

  it('slides by whole pixels, so a plane moving a little each second moves the camera only once it has moved a pixel', () => {
    // 35.1 or 35.9 px below where the band lets it be: it slides 36, so all of it is in.
    expect(slideToShow(rect, 400, 200, [{ x: 200, y: 175.1 }], 12, band).y).toBeCloseTo(rect.y + 36 * perPixel, 12)
    expect(slideToShow(rect, 400, 200, [{ x: 200, y: 175.9 }], 12, band).y).toBeCloseTo(rect.y + 36 * perPixel, 12)
    expect(slideToShow(rect, 400, 200, [{ x: 200, y: 24.6 }], 12, band).y).toBeCloseTo(rect.y - 56 * perPixel, 12)
    // Under half a pixel out, as a hair of rounding, is no slide at all; half a pixel is one.
    expect(slideToShow(rect, 400, 200, [{ x: 200, y: 140.3 }], 12, band)).toBe(rect)
    expect(slideToShow(rect, 400, 200, [{ x: 200, y: 140.5 }], 12, band).y).toBeCloseTo(rect.y + perPixel, 12)
  })
})
```

**In `tests/map/tripMapDrawing.test.ts`, replace (1 of 2):**

```ts
import type { Leg } from '../../src/engine/legs'
import { currentLeg, legProgress, makeTripMap, positionAt } from '../../src/map/tripMap'
import { nightTime, tripMapDrawing } from '../../src/map/tripMapDrawing'
import { AIRPORTS, at, drive, EUROPE, HOUR } from './tripMapLegs'

```

**with:**

```ts
import type { Leg } from '../../src/engine/legs'
import { currentLeg, legProgress, makeTripMap, positionAt } from '../../src/map/tripMap'
import { keptInView, nightTime, tripMapDrawing } from '../../src/map/tripMapDrawing'
import { liveTripMap } from './liveTrip'
import { MINUTE, START } from './madeUpFlights'
import { AIRPORTS, at, drive, EUROPE, HOUR } from './tripMapLegs'

```

**In `tests/map/tripMapDrawing.test.ts`, replace (2 of 2):**

```ts
  })
})
```

**with:**

```ts
  })
})

describe('what the camera keeps in view, the first above all (latest event design §2)', () => {
  it('is the pilot’s marker while nothing moves, and the schedule’s plane in flight', () => {
    const ground = tripMapDrawing(make(EUROPE, at(12)), at(12))
    expect(keptInView(ground)).toEqual([ground.pilot!.place.place])
    const flying = tripMapDrawing(make(EUROPE, at(4)), at(4))
    expect(keptInView(flying)).toEqual([flying.plane!.place])
  })

  it('is the real plane, then its ghost, now, and the real plane alone in a replay', () => {
    const t = START + 59 * MINUTE
    const now = tripMapDrawing(liveTripMap(t), t)
    expect(keptInView(now)).toEqual([now.realPlane!.place, now.ghost!.place])
    const replay = tripMapDrawing(liveTripMap(t), t, true)
    expect(replay.ghost).toBeNull()
    expect(keptInView(replay)).toEqual([replay.realPlane!.place])
  })

  it('is nothing on a drive', () => {
    expect(keptInView(tripMapDrawing(make([drive('d', 'LEX', 'SDF', 0, 1)], at(0.5)), at(0.5)))).toEqual([])
  })
})
```

**In `tests/ui/AppleTripMap.test.tsx`, replace (1 of 2):**

```tsx
    const leg = [map.legs[0].origin.place, map.legs[0].destination.place]
    expect(m.rects[0].rect).toMatchObject(appleCamera(framingPoints(map, map.legs[0]), null, 390, 520, NO_INSETS).rect)
    expect(leg).toHaveLength(2)
```

**with:**

```tsx
    const leg = [map.legs[0].origin.place, map.legs[0].destination.place]
    expect(m.rects[0].rect).toMatchObject(appleCamera(framingPoints(map, map.legs[0]), [], 390, 520, NO_INSETS).rect)
    expect(leg).toHaveLength(2)
```

**In `tests/ui/AppleTripMap.test.tsx`, replace (2 of 2):**

```tsx
    expect(kit.maps[0].padding).toMatchObject(insets)
    expect(kit.maps[0].rects[0].rect).toMatchObject(appleCamera(framingPoints(map, map.legs[0]), null, 390, 520, insets).rect)
  })
```

**with:**

```tsx
    expect(kit.maps[0].padding).toMatchObject(insets)
    expect(kit.maps[0].rects[0].rect).toMatchObject(appleCamera(framingPoints(map, map.legs[0]), [], 390, 520, insets).rect)
  })
```

**In `tests/ui/latestEventBanner.test.tsx`, replace (1 of 8):**

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FactsAtMoment, LatestEvent } from '../../src/facts/factRow'
import { makeGeography } from '../../src/facts/geography'
import { latestEvent, makeTripFacts } from '../../src/facts/tripFacts'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { bannerLayout } from '../../src/ui/LatestEventBanner'
import { TripMapCard } from '../../src/ui/TripMapCard'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { box, EQUATOR, equatorFlight, flightMap, mark } from '../facts/factsTestData'
import { fakeMapKit } from '../fixtures/fakeMapKit'
import { setWindowSize } from '../fixtures/ui'
import { liveTripMap } from '../map/liveTrip'
```

**with:**

```tsx
// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FactsAtMoment, LatestEvent } from '../../src/facts/factRow'
import { makeGeography } from '../../src/facts/geography'
import { factsMilestones, latestEvent, makeTripFacts } from '../../src/facts/tripFacts'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { placeAt } from '../../src/map/svgPaths'
import type { MapLeg } from '../../src/map/tripMap'
import { tripMapDrawing } from '../../src/map/tripMapDrawing'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { bannerLayout } from '../../src/ui/LatestEventBanner'
import { TripMapCard } from '../../src/ui/TripMapCard'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { box, EQUATOR, equatorFlight, EQUINOX, flightMap, mark } from '../facts/factsTestData'
import { fakeMapKit } from '../fixtures/fakeMapKit'
import { setWindowSize } from '../fixtures/ui'
import { liveTripMap } from '../map/liveTrip'
```

**In `tests/ui/latestEventBanner.test.tsx`, replace (2 of 8):**

```tsx
const WEST_AND_EAST = makeGeography([box('Westland', 'country', -90, -82, null, 35, 45), box('Eastland', 'country', -82, -70, null, 35, 45)], [])

const BANNER = { width: 200, height: 40 }
const KEY = { width: 190, height: 22 }

/** Measures the elements of these classes at these sizes, as happy-dom lays nothing out. */
```

**with:**

```tsx
const WEST_AND_EAST = makeGeography([box('Westland', 'country', -90, -82, null, 35, 45), box('Eastland', 'country', -82, -70, null, 35, 45)], [])

const BANNER = { width: 200, height: 40 }
/** The banner 200 px wide: its title 176 px, with 12 px of padding each side. */
const BANNER_PARTS = { 'latest-event': BANNER, 'latest-event-title': { width: 176, height: 25 } }
const KEY = { width: 190, height: 22 }

/** Measures the elements of these classes at these sizes, as happy-dom lays nothing out. */
```

**In `tests/ui/latestEventBanner.test.tsx`, replace (3 of 8):**

```tsx
  it('leaves the event off the bottom chip beside it', () => {
    // At 11:02 the headline is "Just crossed into Bravo": the banner says it, so the chip says what's below.
    const container = equatorCard(t('11:02'))
    expect(banner(container)?.textContent).toBe('Crossed into Bravo2 min ago')
    expect(container.querySelector('.trip-map-chip.bottom')?.textContent).toBe('Over Bravo')
  })

```

**with:**

```tsx
  it('leaves the event off the bottom chip beside it', () => {
    // At 11:02 the headline is "Just crossed into Bravo": the banner says it, so the chip says what's below.
    const container = equatorCard(t('11:02'))
    expect(banner(container)?.querySelector('.latest-event-title')?.textContent).toBe('Crossed into Bravo')
    expect(banner(container)?.querySelector('.latest-event-when:not(.latest-event-widest)')?.textContent).toBe('2 min ago')
    expect(container.querySelector('.trip-map-chip.bottom')?.textContent).toBe('Over Bravo')
  })

```

**In `tests/ui/latestEventBanner.test.tsx`, replace (4 of 8):**

```tsx
  /** The live trip's card with its facts, on Apple's map, the card's map `width` wide. */
  const liveCard = async (width: number) => {
    const kit = appleMap()
    measure({ 'latest-event': BANNER, 'trip-map-key': KEY, 'trip-map-frame': { width, height: 220 } })
    const map = liveTripMap(IN_THE_AIR)
    const facts = makeTripFacts(map, { geography: WEST_AND_EAST, comparisons: null, viewerTz: NY, h24: false })
    // By then it has crossed into Eastland, and passed halfway.
```

**with:**

```tsx
  /** The live trip's card with its facts, on Apple's map, the card's map `width` wide. */
  const liveCard = async (width: number) => {
    const kit = appleMap()
    measure({ ...BANNER_PARTS, 'trip-map-key': KEY, 'trip-map-frame': { width, height: 220 } })
    const map = liveTripMap(IN_THE_AIR)
    const facts = makeTripFacts(map, { geography: WEST_AND_EAST, comparisons: null, viewerTz: NY, h24: false })
    // By then it has crossed into Eastland, and passed halfway.
```

**In `tests/ui/latestEventBanner.test.tsx`, replace (5 of 8):**

```tsx

  it('on a phone, centres it over the map, moves the key just under it at the right, and keeps the plane clear of both', async () => {
    setWindowSize(402, 874)
    measure({ 'latest-event': BANNER, 'trip-map-key': KEY, 'trip-map-full': { width: 390, height: 520 } })
    const kit = await page()
    expect(place()?.style.left).toBe('0px')
    // Centred, its right edge is at 295 px: past 390 - 10 - 190.
```

**with:**

```tsx

  it('on a phone, centres it over the map, moves the key just under it at the right, and keeps the plane clear of both', async () => {
    setWindowSize(402, 874)
    measure({ ...BANNER_PARTS, 'trip-map-key': KEY, 'trip-map-full': { width: 390, height: 520 } })
    const kit = await page()
    expect(place()?.style.left).toBe('0px')
    // Centred, its right edge is at 295 px: past 390 - 10 - 190.
```

**In `tests/ui/latestEventBanner.test.tsx`, replace (6 of 8):**

```tsx
    // Centred over 612 px, the banner ends at 406 px, and the key starts at 612 - 10 - 190 = 412: just the gap. One pixel
    // less, and the key moves under it.
    setWindowSize(700, 1000)
    measure({ 'latest-event': BANNER, 'trip-map-key': KEY, 'trip-map-full': { width: 612, height: 600 } })
    const kit = await page()
    expect(keyTop()).toBe('')
    await waitFor(() => expect(kit.maps[0].padding?.top).toBe(54))
    cleanup()
    resetAppleMapKit()
    vi.restoreAllMocks()
    measure({ 'latest-event': BANNER, 'trip-map-key': KEY, 'trip-map-full': { width: 611, height: 600 } })
    await page()
    expect(keyTop()).toBe('56px')
  })

  it('on a computer, centres it over the open map, clear of the side panel, with the key where it always is', async () => {
    setWindowSize(1280, 800)
    measure({ 'latest-event': BANNER, 'trip-map-key': KEY, 'trip-map-full': { width: 1280, height: 740 }, 'trip-map-panel': { width: 380, height: 600 } })
    const kit = await page()
    // The open panel and its margins cover 412 px. Centred over the rest, the banner ends at 946 px, well before the key.
    await waitFor(() => expect(place()?.style.left).toBe('412px'))
```

**with:**

```tsx
    // Centred over 612 px, the banner ends at 406 px, and the key starts at 612 - 10 - 190 = 412: just the gap. One pixel
    // less, and the key moves under it.
    setWindowSize(700, 1000)
    measure({ ...BANNER_PARTS, 'trip-map-key': KEY, 'trip-map-full': { width: 612, height: 600 } })
    const kit = await page()
    expect(keyTop()).toBe('')
    await waitFor(() => expect(kit.maps[0].padding?.top).toBe(54))
    cleanup()
    resetAppleMapKit()
    vi.restoreAllMocks()
    measure({ ...BANNER_PARTS, 'trip-map-key': KEY, 'trip-map-full': { width: 611, height: 600 } })
    await page()
    expect(keyTop()).toBe('56px')
  })

  it('on a computer, centres it over the open map, clear of the side panel, with the key where it always is', async () => {
    setWindowSize(1280, 800)
    measure({ ...BANNER_PARTS, 'trip-map-key': KEY, 'trip-map-full': { width: 1280, height: 740 }, 'trip-map-panel': { width: 380, height: 600 } })
    const kit = await page()
    // The open panel and its margins cover 412 px. Centred over the rest, the banner ends at 946 px, well before the key.
    await waitFor(() => expect(place()?.style.left).toBe('412px'))
```

**In `tests/ui/latestEventBanner.test.tsx`, replace (7 of 8):**

```tsx
  it('on a narrower computer screen, moves the key under it while the open panel leaves no room beside it', async () => {
    // Centred over the 588 px the open panel leaves, the banner ends at 806 px, and the key would start at 800.
    setWindowSize(1000, 800)
    measure({ 'latest-event': BANNER, 'trip-map-key': KEY, 'trip-map-full': { width: 1000, height: 740 }, 'trip-map-panel': { width: 380, height: 600 } })
    await page()
    await waitFor(() => expect(place()?.style.left).toBe('412px'))
    expect(keyTop()).toBe('56px')
```

**with:**

```tsx
  it('on a narrower computer screen, moves the key under it while the open panel leaves no room beside it', async () => {
    // Centred over the 588 px the open panel leaves, the banner ends at 806 px, and the key would start at 800.
    setWindowSize(1000, 800)
    measure({ ...BANNER_PARTS, 'trip-map-key': KEY, 'trip-map-full': { width: 1000, height: 740 }, 'trip-map-panel': { width: 380, height: 600 } })
    await page()
    await waitFor(() => expect(place()?.style.left).toBe('412px'))
    expect(keyTop()).toBe('56px')
```

**In `tests/ui/latestEventBanner.test.tsx`, replace (8 of 8):**

```tsx

  it('with no latest event, isn’t there, and the key and the camera are as they were', async () => {
    setWindowSize(402, 874)
    measure({ 'latest-event': BANNER, 'trip-map-key': KEY, 'trip-map-full': { width: 390, height: 520 } })
    const kit = await page(null)
    expect(banner()).toBeNull()
    expect(keyTop()).toBe('')
    await waitFor(() => expect(kit.maps[0].padding?.top ?? 0).toBe(0))
  })
})
```

**with:**

```tsx

  it('with no latest event, isn’t there, and the key and the camera are as they were', async () => {
    setWindowSize(402, 874)
    measure({ ...BANNER_PARTS, 'trip-map-key': KEY, 'trip-map-full': { width: 390, height: 520 } })
    const kit = await page(null)
    expect(banner()).toBeNull()
    expect(keyTop()).toBe('')
    await waitFor(() => expect(kit.maps[0].padding?.top ?? 0).toBe(0))
  })
})

describe('the plane under the card’s banner (the review’s fixes)', () => {
  // A flight due north along the meridian, 20° in 3 h 22 min, 85% of the way: the plane near the top of the card's view
  // of the leg. The banner 50 px tall and the bottom chip 23 px leave a band from 64 px down to 183 px, too thin (119 px)
  // to frame the leg in.
  const north: MapLeg = { id: 'n', kind: 'flight', origin: mark('S0', 0, 0), destination: mark('N20', 20, 0), start: EQUINOX, end: EQUINOX + 202 * MINUTE, flightNumber: 'TST2' }
  const t = EQUINOX + Math.round(0.85 * 202) * MINUTE
  const NORTH_AND_SOUTH = makeGeography([box('Southland', 'country', -1, 1, null, -1, 10), box('Northland', 'country', -1, 1, null, 10, 21)], [])
  const sizes = {
    'latest-event': { width: 200, height: 50 }, 'latest-event-title': { width: 176, height: 25 }, 'trip-map-chip': { width: 186, height: 23 },
    'trip-map-frame': { width: 342, height: 220 },
  }
  const card = () => {
    const map = flightMap(north, null)
    const facts = makeTripFacts(map, { geography: NORTH_AND_SOUTH, comparisons: null, viewerTz: NY, h24: false })
    expect(latestEvent(facts, t)).not.toBeNull()
    render(<TripMapCard map={map} now={t} viewerTz={NY} h24={false} name="Alex" day={1} days={1} delayMinutes={null} land={null}
      onOpenMap={() => {}} facts={facts} />)
    return tripMapDrawing(map, t).plane!.place
  }
  // The plane's mark, 12 px round, and its 8 px margin, inside the band.
  const inTheBand = (y: number) => {
    expect(y).toBeGreaterThanOrEqual(64 + 20)
    expect(y).toBeLessThanOrEqual(220 - 37 - 20)
  }

  it('is slid into the band on the site’s own map', () => {
    measure(sizes)
    card()
    const transform = document.querySelector('.trip-map-plane')!.getAttribute('transform')!
    inTheBand(Number(transform.match(/^translate\(\S+ (\S+)\)/)![1]))
  })

  it('is slid into the band on Apple’s map', async () => {
    const kit = appleMap()
    measure(sizes)
    const plane = card()
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    // Too thin a band to frame in, so MapKit is given the whole card, and the plane sits in the band.
    await waitFor(() => expect(kit.maps[0].padding).toMatchObject({ top: 0, bottom: 0 }))
    const { rect } = kit.maps[0].rects.at(-1)!
    inTheBand(placeAt(plane, { rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, width: 342, height: 220 }).y)
  })
})

describe('where the key goes while the same event shows (the review’s fixes)', () => {
  afterEach(() => vi.unstubAllGlobals())

  /** ResizeObservers the test calls, as a browser does when a measured box changes size: happy-dom never does. */
  function resizeObservers() {
    const watching = new Set<() => void>()
    vi.stubGlobal('ResizeObserver', class {
      readonly measure: () => void
      constructor(measure: () => void) {
        this.measure = measure
      }
      observe() {
        watching.add(this.measure)
      }
      disconnect() {
        watching.delete(this.measure)
      }
    })
    return { resized: () => act(() => watching.forEach((measure) => measure())) }
  }

  /** Lines sized by their words, 7 px a letter, the banner by its widest line shown and its padding, as a browser would. */
  function measureByWords(sizes: Record<string, { width: number; height: number }>) {
    const words = (el: Element) => (el.textContent ?? '').length * 7
    const measured = HTMLElement.prototype.getBoundingClientRect
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('latest-event')) {
        const shown = [...this.children].filter((c) => c.classList.contains('latest-event-title') || c.classList.contains('latest-event-when'))
          .filter((c) => !c.classList.contains('latest-event-widest'))
        return DOMRect.fromRect({ width: Math.max(...shown.map(words)) + 24, height: 50 })
      }
      if (this.classList.contains('latest-event-title') || this.classList.contains('latest-event-widest')) return DOMRect.fromRect({ width: words(this), height: 20 })
      const found = Object.entries(sizes).find(([name]) => this.classList.contains(name))
      return found ? DOMRect.fromRect(found[1]) : measured.call(this)
    })
  }

  it('on the card, stays put as "when" grows under the same event, and so does the camera', async () => {
    // The live trip, its real plane and ghost with the key, half a minute after halfway and 20 minutes on.
    const cardAt = (now: number) => {
      const map = liveTripMap(now)
      const facts = makeTripFacts(map, { geography: WEST_AND_EAST, comparisons: null, viewerTz: NY, h24: false })
      return { facts, view: <TripMapCard map={map} now={now} viewerTz={NY} h24={false} name="Alex" day={1} days={1} delayMinutes={null}
        land={null} onOpenMap={() => {}} facts={facts} /> }
    }
    const halfway = factsMilestones(cardAt(IN_THE_AIR).facts, liveTripMap(IN_THE_AIR).legs[0]).find((m) => m.kind === 'halfway')!.time
    const [early, later] = [cardAt(halfway + 30_000), cardAt(halfway + 20 * MINUTE)]
    const [first, second] = [latestEvent(early.facts, halfway + 30_000)!, latestEvent(later.facts, halfway + 20 * MINUTE)!]
    expect(second.title).toBe(first.title)
    expect(second.when.length).toBeGreaterThan(first.when.length)
    // A card just wide enough for the key beside the banner as it was first, sized by what it showed: not as it is later.
    const width = 10 + Math.max(first.title.length, first.when.length) * 7 + 24 + 6 + 10 + KEY.width
    const kit = appleMap()
    const observers = resizeObservers()
    measureByWords({ 'trip-map-key': KEY, 'trip-map-frame': { width, height: 220 } })
    const view = render(early.view)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    expect(document.querySelector('.latest-event-when')?.textContent).toBe(first.when)
    const before = { keyTop: keyTop(), inset: kit.maps[0].padding?.top }
    view.rerender(later.view)
    await observers.resized()
    expect(document.querySelector('.latest-event-when')?.textContent).toBe(second.when)
    expect({ keyTop: keyTop(), inset: kit.maps[0].padding?.top }).toEqual(before)
    // With the widest "when" it would show, the banner leaves the key no room beside it on this card.
    expect(before.keyTop).toBe('66px')
  })

  it('on the full map, stays put as "Just now" grows to "About 1 h 5 min ago", and so does the camera', async () => {
    // A 520 px map: "Halfway" centred with "Just now" leaves the key room beside it, and with "About 1 h 5 min ago" not.
    setWindowSize(700, 1000)
    measureByWords({ 'trip-map-key': KEY, 'trip-map-full': { width: 520, height: 600 } })
    const kit = appleMap()
    const observers = resizeObservers()
    const halfway = (when: string): LatestEvent => ({ title: 'Halfway', when, sentence: `Latest: halfway, ${when.toLowerCase()}.` })
    const page = (latest: LatestEvent) => (
      <TripMapPage map={liveTripMap(IN_THE_AIR)} now={IN_THE_AIR} viewerTz={NY} h24={false} day={1} days={1} land={null} onBack={() => {}}
        factsAt={() => ({ headline: 'Over Ohio', rows: [], tripSoFar: { flights: [], totalsTitle: 'Trip so far', totals: null }, latestEvent: latest })} />
    )
    const view = render(page(halfway('Just now')))
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const before = { keyTop: keyTop(), inset: kit.maps[0].padding?.top }
    view.rerender(page(halfway('About 1 h 5 min ago')))
    await observers.resized()
    expect(document.querySelector('.trip-map-full .latest-event-when')?.textContent).toBe('About 1 h 5 min ago')
    expect({ keyTop: keyTop(), inset: kit.maps[0].padding?.top }).toEqual(before)
    // With the widest "when" it would show, 21 letters, the banner leaves the key no room beside it on this map.
    expect(before.keyTop).toBe('66px')
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/copy/facts.test.ts tests/map/appleMapPlan.test.ts tests/map/mapFit.test.ts tests/map/tripMapDrawing.test.ts tests/ui/AppleTripMap.test.tsx tests/ui/latestEventBanner.test.tsx
```

Expected: 31 of the 122 tests fail: `keptInView` and `WIDEST_EVENT_WHEN` aren't there yet, the slide and both maps' cameras still keep only the pilot's marker in view, and the key's place still follows the "when" as it grows.

- [x] **Step 3: Write the code.**

**In `src/copy/facts.ts`, replace:**

```ts
  return `${about}${minutesText(minutes)} ago`
}

/**
```

**with:**

```ts
  return `${about}${minutesText(minutes)} ago`
}

/**
 * The widest "when" of a flight in the air: a best guess two-digit hours ago, in eights, as wide as any digit. A replay's
 * clock time, "About 10:37 AM", is narrower. The banner keeps room for it when it decides where the key goes, so the key
 * doesn't move while the same event shows.
 */
export const WIDEST_EVENT_WHEN = 'About 88 h 88 min ago'

/**
```

**In `src/map/appleMapPlan.ts`, replace (1 of 2):**

```ts
 * The camera on Apple's map (Apple Maps spec §5): the very view the SVG map takes. The trip is framed in the part of the
 * view the insets leave clear (beside the full map's panel, between the card's chips), then the view slides the shortest
 * way that shows the pilot's marker (the app's card framing design §4). MapKit is given the clear part's rectangle, with
 * the insets as its padding, so its logo and controls keep clear too. When the clear part is too small to frame in,
 * MapKit gets the whole view and no padding.
 */
export function appleCamera(framing: GeoPoint[], pilot: GeoPoint | null, width: number, height: number, insets: Insets): AppleCamera {
  const framed = fitClear(fitRect(framing) ?? { x: 0, y: 0, width: 1, height: 1 }, width, height, insets)
  const view = pilot ? slideToShow(framed, width, height, placeAt(pilot, { rect: framed, width, height }), PILOT_RADIUS, insets) : framed
  return cameraFor(view, width, height, insets)
```

**with:**

```ts
 * The camera on Apple's map (Apple Maps spec §5): the very view the SVG map takes. The trip is framed in the part of the
 * view the insets leave clear (beside the full map's panel, between the card's chips and under the latest event's
 * banner), then the view slides the shortest way that shows what's kept in view (`keptInView`): the pilot's marker (the
 * app's card framing design §4), or in flight the plane and its ghost. MapKit is given the clear part's rectangle, with
 * the insets as its padding, so its logo and controls keep clear too. When the clear part is too small to frame in,
 * MapKit gets the whole view and no padding, and the slide alone keeps them in the clear part.
 */
export function appleCamera(framing: GeoPoint[], kept: readonly GeoPoint[], width: number, height: number, insets: Insets): AppleCamera {
  const framed = fitClear(fitRect(framing) ?? { x: 0, y: 0, width: 1, height: 1 }, width, height, insets)
  const view = slideToShow(framed, width, height, kept.map((p) => placeAt(p, { rect: framed, width, height })), PILOT_RADIUS, insets)
  return cameraFor(view, width, height, insets)
```

**In `src/map/appleMapPlan.ts`, replace (2 of 2):**

```ts
 * `shown`, what MapKit settled on (its visible rectangle, which is only the part inside its padding, and that padding),
 * this is what to ask for next: the same view, at the same zoom, slid the shortest way that shows the marker in the
 * clear part (as the app's TripMapSlide), or null when it's in view already.
 */
export function slideIntoView(shown: AppleCamera, pilot: GeoPoint, width: number, height: number, insets: Insets): AppleCamera | null {
  const view = wholeView(shown, width, height)
  const slid = slideToShow(view, width, height, placeAt(pilot, { rect: view, width, height }), PILOT_RADIUS, insets)
  const perPixel = view.width / width
```

**with:**

```ts
 * `shown`, what MapKit settled on (its visible rectangle, which is only the part inside its padding, and that padding),
 * this is what to ask for next: the same view, at the same zoom, slid the shortest way that shows what's kept in view
 * (the pilot's marker, or the plane and its ghost) in the clear part (as the app's TripMapSlide), or null when it's in
 * view already.
 */
export function slideIntoView(shown: AppleCamera, kept: readonly GeoPoint[], width: number, height: number, insets: Insets): AppleCamera | null {
  const view = wholeView(shown, width, height)
  const slid = slideToShow(view, width, height, kept.map((p) => placeAt(p, { rect: view, width, height })), PILOT_RADIUS, insets)
  const perPixel = view.width / width
```

**In `src/map/mapFit.ts`, replace:**

```ts
/**
 * The view `rect` slid the shortest way, along each axis on its own, that shows a marker of `radius` px at `at`, where
 * `rect` puts it, with `SLIDE_MARGIN` round it, inside the part of the view `insets` leave clear: between the card's
 * chips, or beside the full map's panel. The camera frames the trip there first when there's room; this keeps the
 * marker in view when there isn't. It never zooms, and a marker larger than the clear part is centred in it.
 */
export function slideToShow(
  rect: WorldRect, width: number, height: number, at: { x: number; y: number }, radius: number, insets: Insets = NO_INSETS,
): WorldRect {
  const r = radius + SLIDE_MARGIN
  const along = (p: number, low: number, high: number) =>
    high - low < 2 * r ? (low + high) / 2 - p : Math.max(low + r - p, Math.min(0, high - r - p))
  const dx = along(at.x, insets.left, width - insets.right)
  const dy = along(at.y, insets.top, height - insets.bottom)
  if (dx === 0 && dy === 0) return rect
```

**with:**

```ts
/**
 * The view `rect` slid the shortest way, along each axis on its own, that shows markers of `radius` px at `marks`, where
 * `rect` puts them, with `SLIDE_MARGIN` round them, inside the part of the view `insets` leave clear: between the card's
 * chips and under the latest event's banner, or beside the full map's panel. The camera frames the trip there first
 * when there's room; this keeps the markers in view when there isn't. Where they don't all fit along an axis, the first
 * alone is shown: the pilot's marker, or the real plane before its ghost. It never zooms, and a marker larger than the
 * clear part is centred in it. It slides by whole pixels, rounded up so the markers are fully in, so a plane moving a
 * little each second moves the camera only once it has moved a pixel; under half a pixel, as a hair of rounding, it
 * doesn't slide at all.
 */
export function slideToShow(
  rect: WorldRect, width: number, height: number, marks: readonly { x: number; y: number }[], radius: number, insets: Insets = NO_INSETS,
): WorldRect {
  if (marks.length === 0) return rect
  const r = radius + SLIDE_MARGIN
  const along = (places: number[], low: number, high: number) => {
    if (high - low < 2 * r) return (low + high) / 2 - places[0]
    const [first, last] = [Math.min(...places), Math.max(...places)]
    const [from, to] = last - first <= high - low - 2 * r ? [first, last] : [places[0], places[0]]
    return Math.max(low + r - from, Math.min(0, high - r - to))
  }
  const whole = (px: number) => (Math.abs(px) < 0.5 ? 0 : px > 0 ? Math.ceil(px) : Math.floor(px))
  const dx = whole(along(marks.map((m) => m.x), insets.left, width - insets.right))
  const dy = whole(along(marks.map((m) => m.y), insets.top, height - insets.bottom))
  if (dx === 0 && dy === 0) return rect
```

**In `src/map/tripMapDrawing.ts`, replace:**

```ts
  pilot: GroundActivity | null
}
```

**with:**

```ts
  pilot: GroundActivity | null
}

/**
 * What the camera keeps in the clear part of the map, the first above all: the pilot's marker while nothing moves (the
 * app's card framing design §4.2), and in flight the real plane, then its ghost, or the schedule's plane. On the card the
 * latest event's banner, the key under it and the bottom chip can leave a band too thin to frame the trip in (latest
 * event design §2): the view then slides to show these in it.
 */
export function keptInView(drawing: TripMapDrawing): GeoPoint[] {
  if (drawing.pilot) return [drawing.pilot.place.place]
  if (drawing.realPlane) return [drawing.realPlane.place, ...(drawing.ghost ? [drawing.ghost.place] : [])]
  return drawing.plane ? [drawing.plane.place] : []
}
```

**In `src/styles/tripMap.css`, replace (1 of 2):**

```css
   centred under the pill, over the open part of the map (TripMapPage sets where that starts). While it shows, the key
   moves just under it where they don't fit side by side (LatestEventBanner's bannerLayout sets its top). */
.latest-event {
  display: flex;
  flex-direction: column;
  gap: 1px;
```

**with:**

```css
   centred under the pill, over the open part of the map (TripMapPage sets where that starts). While it shows, the key
   moves just under it where they don't fit side by side (LatestEventBanner's bannerLayout sets its top), going by the
   title and the widest "when", laid out unseen out of the banner's flow. Its lines are as wide as their words, so the
   title can be measured on its own. */
.latest-event {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
```

**In `src/styles/tripMap.css`, replace (2 of 2):**

```css
.latest-event-when { color: var(--text-2); font-size: 0.75rem; }
.latest-event-place {
```

**with:**

```css
.latest-event-when { color: var(--text-2); font-size: 0.75rem; }
.latest-event-widest { position: absolute; top: 0; left: 0; visibility: hidden; white-space: nowrap; }
.latest-event-place {
```

**In `src/ui/AppleTripMap.tsx`, replace (1 of 7):**

```tsx
import { framingPoints, framingSubject } from '../map/tripMap'
import { nightTime, tripMapDrawing, type SegmentStyle } from '../map/tripMapDrawing'
import { markElement } from './appleMarks'
```

**with:**

```tsx
import { framingPoints, framingSubject } from '../map/tripMap'
import { keptInView, nightTime, tripMapDrawing, type SegmentStyle } from '../map/tripMapDrawing'
import { markElement } from './appleMarks'
```

**In `src/ui/AppleTripMap.tsx`, replace (2 of 7):**

```tsx
  /**
   * The latest framing, whether it was animated, until it has slid once to show the pilot's marker: each time MapKit
   * settles, its view is checked for the marker.
   */
```

**with:**

```tsx
  /**
   * The latest framing, whether it was animated, until it has slid once to show what's kept in view (the pilot's
   * marker, or the plane and its ghost): each time MapKit settles, its view is checked for them.
   */
```

**In `src/ui/AppleTripMap.tsx`, replace (3 of 7):**

```tsx
interface Latest {
  pilot: GeoPoint | null
  width: number
```

**with:**

```tsx
interface Latest {
  /** The pilot's marker, or in flight the plane and its ghost (`keptInView`). */
  kept: GeoPoint[]
  width: number
```

**In `src/ui/AppleTripMap.tsx`, replace (4 of 7):**

```tsx
 * than it was asked, on the middle of the trip, sometimes only in a second change after reporting the view it was asked
 * for, and the pilot's marker near the trip's edge can fall outside. So each time MapKit settles after a framing, while
 * the view is still the camera's, it slides the shortest way that shows the marker (the app's TripMapSlide), once:
 * should MapKit not settle where it's asked, the camera never chases it.
 */
function slideToPilot(mapkit: MapKitApi, state: Live, now: Latest | undefined) {
  const settling = state.settling
  if (!settling || state.moved || !now?.pilot) return
  const m = state.map
```

**with:**

```tsx
 * than it was asked, on the middle of the trip, sometimes only in a second change after reporting the view it was asked
 * for, and the pilot's marker near the trip's edge can fall outside, as can the plane in flight. So each time MapKit
 * settles after a framing, while the view is still the camera's, it slides the shortest way that shows them (the app's
 * TripMapSlide), once: should MapKit not settle where it's asked, the camera never chases it.
 */
function slideToKept(mapkit: MapKitApi, state: Live, now: Latest | undefined) {
  const settling = state.settling
  if (!settling || state.moved || !now || now.kept.length === 0) return
  const m = state.map
```

**In `src/ui/AppleTripMap.tsx`, replace (5 of 7):**

```tsx
  const shown = { rect: { x: origin.x, y: origin.y, width: size.width, height: size.height }, padding: { top, right, bottom, left } }
  const slide = slideIntoView(shown, now.pilot, now.width, now.height, now.insets)
  if (!slide) return
```

**with:**

```tsx
  const shown = { rect: { x: origin.x, y: origin.y, width: size.width, height: size.height }, padding: { top, right, bottom, left } }
  const slide = slideIntoView(shown, now.kept, now.width, now.height, now.insets)
  if (!slide) return
```

**In `src/ui/AppleTripMap.tsx`, replace (6 of 7):**

```tsx
    m.addEventListener('zoom-start', moved)
    m.addEventListener('region-change-end', () => slideToPilot(mapkit, state, latest.current))
    // The system turned light or dark while the map is open: Apple's tiles follow, the night takes its new colour, and
```

**with:**

```tsx
    m.addEventListener('zoom-start', moved)
    m.addEventListener('region-change-end', () => slideToKept(mapkit, state, latest.current))
    // The system turned light or dark while the map is open: Apple's tiles follow, the night takes its new colour, and
```

**In `src/ui/AppleTripMap.tsx`, replace (7 of 7):**

```tsx

  // The camera: the view the SVG map takes (the leg or the whole trip, clear of the panel or the chips, with the pilot's
  // marker in view), until the person moves the map (§5).
  const pilot = drawing.pilot?.place.place ?? null
  latest.current = { pilot, width, height, insets }
  const framing = useSteadyFraming(framingPoints(map, focus), framingSubject(map, focus))
  const { rect, padding } = appleCamera(framing, pilot, width, height, insets)
  const frame = `${rect.x},${rect.y},${rect.width},${rect.height}|${padding.top},${padding.right},${padding.bottom},${padding.left}|${recenter}`
```

**with:**

```tsx

  // The camera: the view the SVG map takes (the leg or the whole trip, clear of the panel or the chips and the banner,
  // with the pilot's marker, or the plane and its ghost, in view), until the person moves the map (§5).
  const kept = keptInView(drawing)
  latest.current = { kept, width, height, insets }
  const framing = useSteadyFraming(framingPoints(map, focus), framingSubject(map, focus))
  const { rect, padding } = appleCamera(framing, kept, width, height, insets)
  const frame = `${rect.x},${rect.y},${rect.width},${rect.height}|${padding.top},${padding.right},${padding.bottom},${padding.left}|${recenter}`
```

**In `src/ui/LatestEventBanner.tsx`, replace (1 of 4):**

```tsx
import type { Ref } from 'preact'
import type { LatestEvent } from '../facts/factRow'
import type { Size } from './hooks/useSize'

```

**with:**

```tsx
import type { Ref } from 'preact'
import { useState } from 'preact/hooks'
import { WIDEST_EVENT_WHEN } from '../copy/facts'
import type { LatestEvent } from '../facts/factRow'
import type { Size } from './hooks/useSize'
import { useSizeOf } from './hooks/useSizeOf'

```

**In `src/ui/LatestEventBanner.tsx`, replace (2 of 4):**

```tsx

export interface LatestEventBannerProps {
```

**with:**

```tsx

/** The banner's padding at each side (`.latest-event` in tripMap.css). */
const BANNER_PADDING = 12

/** The banner, its title and its hidden widest "when", each kept from a callback ref to be measured. */
export interface BannerRefs {
  box: Ref<HTMLSpanElement>
  title: Ref<HTMLSpanElement>
  widest: Ref<HTMLSpanElement>
}

/**
 * The banner's size as the key and the camera go by it. Its height is the banner's own. Its width is its title's or its
 * widest "when", whichever is wider, and its padding: the width it has with the widest "when" it could show. So where
 * the key goes doesn't change while the same event shows, as "Just now" grows to "About 1 h 5 min ago", or a replay's
 * clock time changes, and the camera doesn't frame again with it (the review's fixes). Nothing measured, it's 0 wide.
 */
export function useBannerSize(): { size: Size; refs: BannerRefs } {
  const [box, setBox] = useState<HTMLSpanElement | null>(null)
  const [title, setTitle] = useState<HTMLSpanElement | null>(null)
  const [widest, setWidest] = useState<HTMLSpanElement | null>(null)
  const height = useSizeOf(box).height
  const words = Math.max(useSizeOf(title).width, useSizeOf(widest).width)
  return { size: { width: words > 0 ? words + 2 * BANNER_PADDING : 0, height }, refs: { box: setBox, title: setTitle, widest: setWidest } }
}

export interface LatestEventBannerProps {
```

**In `src/ui/LatestEventBanner.tsx`, replace (3 of 4):**

```tsx
  isFullMap?: boolean
  /** The banner itself, measured for the key and the camera. */
  boxRef?: Ref<HTMLSpanElement>
}
```

**with:**

```tsx
  isFullMap?: boolean
  /** The banner's parts, measured for the key and the camera (`useBannerSize`). */
  refs?: BannerRefs
}
```

**In `src/ui/LatestEventBanner.tsx`, replace (4 of 4):**

```tsx
 * The newest event of the flight in the air, shown large until the next (latest event design §1, §2): what it was, and
 * under it, smaller, how long ago, in the chips' glass. Spans, as the card's map is inside its button.
 */
export function LatestEventBanner({ event, isFullMap = false, boxRef }: LatestEventBannerProps) {
  return (
    <span ref={boxRef} class={isFullMap ? 'latest-event centred' : 'latest-event'} aria-hidden={isFullMap ? undefined : 'true'}>
      <span class="latest-event-title" aria-hidden="true">{event.title}</span>
      <span class="latest-event-when" aria-hidden="true">{event.when}</span>
      {isFullMap && <span class="sr-only">{event.sentence}</span>}
```

**with:**

```tsx
 * The newest event of the flight in the air, shown large until the next (latest event design §1, §2): what it was, and
 * under it, smaller, how long ago, in the chips' glass. Spans, as the card's map is inside its button. The widest "when"
 * it could show is laid out unseen beside it, out of its flow, only to be measured.
 */
export function LatestEventBanner({ event, isFullMap = false, refs }: LatestEventBannerProps) {
  return (
    <span ref={refs?.box} class={isFullMap ? 'latest-event centred' : 'latest-event'} aria-hidden={isFullMap ? undefined : 'true'}>
      <span ref={refs?.title} class="latest-event-title" aria-hidden="true">{event.title}</span>
      <span class="latest-event-when" aria-hidden="true">{event.when}</span>
      <span ref={refs?.widest} class="latest-event-when latest-event-widest" aria-hidden="true">{WIDEST_EVENT_WHEN}</span>
      {isFullMap && <span class="sr-only">{event.sentence}</span>}
```

**In `src/ui/TripMapCard.tsx`, replace (1 of 3):**

```tsx
import { Icon } from './Icon'
import { BANNER_EDGE, bannerLayout, LatestEventBanner } from './LatestEventBanner'
import { PlaneKey } from './PlaneKey'
```

**with:**

```tsx
import { Icon } from './Icon'
import { BANNER_EDGE, bannerLayout, LatestEventBanner, useBannerSize } from './LatestEventBanner'
import { PlaneKey } from './PlaneKey'
```

**In `src/ui/TripMapCard.tsx`, replace (2 of 3):**

```tsx
  const [key, setKey] = useState<HTMLElement | null>(null)
  const [banner, setBanner] = useState<HTMLElement | null>(null)
  const keySize = useSizeOf(key)
  const bannerSize = useSizeOf(banner)
  const chipped = chipInsets(Math.max(useHeightOf(topChip), keySize.height), useHeightOf(bottomChip))
  const layout = latest ? bannerLayout(BANNER_EDGE + bannerSize.width, bannerSize, keySize, width) : null
  const insets = layout ? { ...chipped, top: layout.inset } : chipped
```

**with:**

```tsx
  const [key, setKey] = useState<HTMLElement | null>(null)
  const keySize = useSizeOf(key)
  const banner = useBannerSize()
  const chipped = chipInsets(Math.max(useHeightOf(topChip), keySize.height), useHeightOf(bottomChip))
  const layout = latest ? bannerLayout(BANNER_EDGE + banner.size.width, banner.size, keySize, width) : null
  const insets = layout ? { ...chipped, top: layout.inset } : chipped
```

**In `src/ui/TripMapCard.tsx`, replace (3 of 3):**

```tsx
        </span>
        {latest ? <LatestEventBanner event={latest} boxRef={setBanner} />
          : chips.top && <span ref={setTopChip} class="trip-map-chip top" aria-hidden="true">{chips.top}</span>}
```

**with:**

```tsx
        </span>
        {latest ? <LatestEventBanner event={latest} refs={banner.refs} />
          : chips.top && <span ref={setTopChip} class="trip-map-chip top" aria-hidden="true">{chips.top}</span>}
```

**In `src/ui/TripMapPage.tsx`, replace (1 of 4):**

```tsx
import { Icon } from './Icon'
import { bannerLayout, LatestEventBanner } from './LatestEventBanner'
import { PlaneKey } from './PlaneKey'
```

**with:**

```tsx
import { Icon } from './Icon'
import { bannerLayout, LatestEventBanner, useBannerSize } from './LatestEventBanner'
import { PlaneKey } from './PlaneKey'
```

**In `src/ui/TripMapPage.tsx`, replace (2 of 4):**

```tsx
  const latest = facts?.latestEvent ?? null
  const [banner, setBanner] = useState<HTMLElement | null>(null)
  const [key, setKey] = useState<HTMLElement | null>(null)
  const bannerSize = useSizeOf(banner)
  const keySize = useSizeOf(key)
```

**with:**

```tsx
  const latest = facts?.latestEvent ?? null
  const banner = useBannerSize()
  const [key, setKey] = useState<HTMLElement | null>(null)
  const keySize = useSizeOf(key)
```

**In `src/ui/TripMapPage.tsx`, replace (3 of 4):**

```tsx
  const openLeft = panelInsets.left
  const layout = latest ? bannerLayout(openLeft + (width - openLeft + bannerSize.width) / 2, bannerSize, keySize, width) : null
  const insets: Insets = layout ? { ...panelInsets, top: layout.inset } : panelInsets
```

**with:**

```tsx
  const openLeft = panelInsets.left
  const layout = latest ? bannerLayout(openLeft + (width - openLeft + banner.size.width) / 2, banner.size, keySize, width) : null
  const insets: Insets = layout ? { ...panelInsets, top: layout.inset } : panelInsets
```

**In `src/ui/TripMapPage.tsx`, replace (4 of 4):**

```tsx
          <div class="latest-event-place" style={{ left: `${openLeft}px` }}>
            <LatestEventBanner event={latest} isFullMap boxRef={setBanner} />
          </div>
```

**with:**

```tsx
          <div class="latest-event-place" style={{ left: `${openLeft}px` }}>
            <LatestEventBanner event={latest} isFullMap refs={banner.refs} />
          </div>
```

**In `src/ui/TripMapSvg.tsx`, replace (1 of 3):**

```tsx
import { framingPoints, framingSubject, type MapLeg, type TripMap } from '../map/tripMap'
import { nightTime, PILOT_RADIUS, routePoints, tripMapDrawing, type PlaneMark } from '../map/tripMapDrawing'
import { useSteadyFraming } from './hooks/useSteadyFraming'
```

**with:**

```tsx
import { framingPoints, framingSubject, type MapLeg, type TripMap } from '../map/tripMap'
import { keptInView, nightTime, PILOT_RADIUS, routePoints, tripMapDrawing, type PlaneMark } from '../map/tripMapDrawing'
import { useSteadyFraming } from './hooks/useSteadyFraming'
```

**In `src/ui/TripMapSvg.tsx`, replace (2 of 3):**

```tsx
  /**
   * Room to keep clear for what lies over the map: the full map's panel (Stage 2 spec §10), or the card's chips. The
   * trip is framed in the rest when there's room, and the pilot's marker is always kept there (`slideToShow`).
   */
```

**with:**

```tsx
  /**
   * Room to keep clear for what lies over the map: the full map's panel (Stage 2 spec §10), or the card's chips and the
   * latest event's banner. The trip is framed in the rest when there's room, and the pilot's marker, or in flight the
   * plane and its ghost, are always kept there (`keptInView`, `slideToShow`).
   */
```

**In `src/ui/TripMapSvg.tsx`, replace (3 of 3):**

```tsx
  const segments = [...drawing.segments.filter((s) => s.style !== 'seen'), ...drawing.segments.filter((s) => s.style === 'seen')]
  // The trip is framed in the clear part when there's room. Then, if the pilot's marker still lies outside it (the
  // card's chips at large text sizes), the view slides the shortest way that shows it (the app's card framing §4.2).
  const pilot = drawing.pilot ? placeAt(drawing.pilot.place.place, { rect: framed, width, height }) : null
  const rect = pilot ? slideToShow(framed, width, height, pilot, PILOT_RADIUS, { top, right, bottom, left }) : framed
  const view: Viewport = { rect, width, height }
```

**with:**

```tsx
  const segments = [...drawing.segments.filter((s) => s.style !== 'seen'), ...drawing.segments.filter((s) => s.style === 'seen')]
  // The trip is framed in the clear part when there's room. Then, if the pilot's marker, or in flight the plane, still
  // lies outside it (the card's chips at large text sizes, or the banner with the key under it), the view slides the
  // shortest way that shows it, and the ghost too where both fit (the app's card framing §4.2; latest event design §2).
  const kept = keptInView(drawing).map((place) => placeAt(place, { rect: framed, width, height }))
  const rect = slideToShow(framed, width, height, kept, PILOT_RADIUS, { top, right, bottom, left })
  const view: Viewport = { rect, width, height }
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 122 tests pass. Then `npx tsc --noEmit`: nothing; and `npm test`: 176 test files and 3,674 tests pass.

- [x] **Step 5: Batch B's review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Tasks 4 to 6, the views and the fixes, against the best guesses design's §4, the latest event design, the app at `9f06e71` (`5ad717f`, `a78e841` and `a94ed20`), and this plan's list of where the website settles or differs. Make its fixes, rerun each task's tests, and record what it found under "Changes made during execution".

- [x] **Step 6: Batch B's checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && npm run build
```

Expected: 176 test files and 3,674 tests pass, and the build ends `✓ built`.

- [x] **Step 7: Commit, on Todd's yes.** Tasks 4 and 5's commits first. Where two tasks of this batch change one file (`src/styles/tripMap.css`: Tasks 4, 6; `src/ui/LatestEventBanner.tsx`: Tasks 4, 6; `src/ui/TripMapCard.tsx`: Tasks 4, 6; `src/ui/TripMapPage.tsx`: Tasks 4, 6; `tests/ui/latestEventBanner.test.tsx`: Tasks 4, 6), each commit takes the file as its own task left it (ground rule 10). Then:

```bash
git add src/copy/facts.ts src/map/appleMapPlan.ts src/map/mapFit.ts src/map/tripMapDrawing.ts src/styles/tripMap.css src/ui/AppleTripMap.tsx src/ui/LatestEventBanner.tsx src/ui/TripMapCard.tsx src/ui/TripMapPage.tsx src/ui/TripMapSvg.tsx tests/copy/facts.test.ts tests/map/appleMapPlan.test.ts tests/map/mapFit.test.ts tests/map/tripMapDrawing.test.ts tests/ui/AppleTripMap.test.tsx tests/ui/latestEventBanner.test.tsx
git commit -m "The card's plane and its ghost kept in the band under the latest event, and the key's place steady while the same event shows (review of plan 3C-4)"
```

---

### Task 7: Todd looks at the demo scenes

The tests check the words, the list and where things go. This is the look at them.

- [x] **Step 1: Start the site with Apple's map.** The worktree has the MapKit token in `.env.local` from plan 3C-2 (git-ignored; it lasts to 22 Nov 2026: if the site's own map shows instead of Apple's, it has run out, and Todd makes another as the README says). The session starts the `crewluve-mapkit` server (`.claude/launch.json`, port 5182) with its preview tool, and gives Todd the addresses:
  - `http://localhost:5182/?demo=1&scene=live-ahead`, and the same with `#map` at the end
  - `http://localhost:5182/?demo=1&scene=live-ocean-gap`, and with `#map`
  - `http://localhost:5182/?demo=1&scene=live-on-ground-late`, and with `#map`
  - `http://localhost:5182/?demo=1&scene=flying`, and with `#map`, a flight with no live data.
- [x] **Step 2: Todd looks, on a phone and a computer:**
  - the card: the banner in the map's top corner, with how long ago under it; the key just under it on a phone, and beside it where there's room; the plane and its ghost in the band between them and the bottom chip; and the bottom chip without the event;
  - the full map: the banner centred over the open map (beside the side panel on a computer), the key, the plane clear of both, and the panel's first line without the event;
  - "More facts": the list newest first, the flight in the air in its border with "In the air now", a best guess lighter and slanted with "about", earlier flights plain underneath, and "Trip so far" said once;
  - in `live-on-ground-late`: no banner, and the flight at its gate left out of the list;
  - in a replay (the full map's timeline moved back): "In the air", the banner's clock time, and no key;
  - in `flying`, a flight with no live data: the list and the banner as the schedule has them, and no key.
- [x] **Step 3: Write down what was wrong.** Anything that needs a change goes in "Changes made during execution", is fixed in its own task's files with a test where a test can see it, and has Todd run the tests again.

---

### Task 8: The review of the whole branch, and the record

- [x] **Step 1: The whole branch's review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on this plan's commits as one thing (from `ed33ce5`), against the best guesses design's §4, the latest event design, the app at `9f06e71`, and this plan's list of where it settles or differs. Make its fixes, run `npm test` and `npm run build`, and record what it found.
- [x] **Step 2: Todd runs everything once more** (Task 6 Step 6's command), if the review changed anything.
- [x] **Step 3: This plan's record.** Under "Changes made during execution": each review, each of Todd's runs (the count and the time), what Task 7 turned up, and each commit's hash.
- [x] **Step 4: Commit, on Todd's yes.**

```bash
git add docs/superpowers/plans/2026-11-16-moving-map-stage3c4-website-list-latest.md
git commit -m "Plan 3C-4, the website's list newest first and the latest event shown large, with its record"
```

---

### Task 9: Going live, on Todd's yes

This plan goes live. Pushing to `main` publishes the site: `.github/workflows` tests and builds every push to `main`, then publishes it to Pages. **Nothing here runs without Todd's yes in the conversation, asked when this task is reached.**

- [x] **Step 1: Ask Todd** whether to go live now. If not, stop: the branch stays as it is, and this task waits.
- [x] **Step 2: Bring the branch up to `main`.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git fetch origin && git merge-base --is-ancestor origin/main HEAD && echo "fast-forward"
```

Expected: `fast-forward`. If it isn't (`main` has moved on since `ed33ce5`), merge it in here: `git merge origin/main`. If any file conflicts, STOP and tell Todd. Then run `npm test && npm run build`.

- [ ] **Step 3: Todd runs everything** (Task 6 Step 6's command) on the branch as it will go live.
- [ ] **Step 4: Push the branch to `main`, on Todd's yes.** A fast-forward only; never force.

```bash
git push origin claude/trip-map-live-598046:main
```

- [ ] **Step 5: Watch the deploy** (`gh run watch` on the run the push started) until it succeeds. If it fails, tell Todd at once with its log: the site stays as it was until a deploy succeeds.
- [ ] **Step 6: Look at the live site** with Todd, at `https://crewluve.crewlu.net/?demo=1&scene=live-ocean-gap`, the same with `#map`, and `…scene=flying#map`: the banner and the key, the list newest first, and the schedule-only scene.
- [ ] **Step 7: The record.** Under "Changes made during execution": the push's commit, the deploy's run and time, and what Todd saw. Commit the plan on his yes and push it (a fast-forward only), as Step 4.

---

## What the app takes from this one

The app's own later plan gives it the key, the popup and the at-the-gate words (plan 3C-3). From this plan:
- **The key just under the banner** where they don't fit side by side (Todd, 16 Nov 2026), its place going by the widest "when", so it doesn't hop.
- **The camera keeps the plane in the band:** in flight the real plane, then its ghost, else the schedule's plane; on the ground the pilot's marker (`keptInView`).
- **A plane still at its gate after its takeoff time** has its flight left out of the list until it takes off, and no banner (Todd, 16 Nov 2026).

## Changes made during execution

**Run in session `68f03a67` (16 Nov 2026), from the plan's own text** by the scratch folder's `run_steps.py` (tests first, seen failing as each Step 2 says, then the code). After each task every file it touched was the same as the copy tested after that task.

- **Task 1:** the worktree as expected (`ed33ce5`, only this plan untracked).
- **Batch A (Tasks 2 and 3), about 7:40 PM:** 22 of 104 and 17 of 107 failing first, then 104 and 107 passing; `tsc --noEmit` clean; `npm test` 175 / 3,624 and 175 / 3,638. Task 2's files were kept aside before Task 3 (ground rule 10); they are `stages/after-2`'s.
- **Batch A's review** (`superpowers:code-reviewer`, sonnet): nothing critical or important. **No change made.**
  - It found right: `hasTripSoFarRow` as the app's and in step with the rows; `latestEvent` newest by time, the first of two at the same time kept, as the app; "Just now" / "About now", the nearest minute and the year's cap as the app; the card's sentence with one full stop each; `milestoneLine` built on `eventTitle`, so the list and the banner can't drift; the shared cases untouched.
  - Minor, as the app has it: between touchdown and the gate the list still tags the flight "In the air now" while the card says it landed (the app's "between its gates"; for Todd's look, Task 7). Two flights overlapping in time (bad data) would both be tagged. The list's totals and events are now full-strength text (intended); the tag's blue on its tint is to be seen in dark mode at Task 7.
  - Test gaps it named: a best guess newer than a sighting of the same flight (the known parity note); `latestEvent` asserted null for a plane still at its gate (the card's side is tested).
- **Batch A's checkpoint:** Todd chose "Run it in my Terminal, then commit": `npm test` at 7:38 PM, 175 test files and 3,638 tests passed.
- **Batch A's commits:** Task 2 `4f8550a` (with its files as Task 2 left them), Task 3 `d5d5935`. Each commit's files are the same as tested after its task.
- **Batch B (Tasks 4 to 6), about 7:50 PM:** the banner's file failing to load and 6 of 80, 1 of 13, and 31 of 122 failing first, then 94, 13 and 122 passing; `tsc --noEmit` clean; `npm test` 176 / 3,658, 176 / 3,660 and 176 / 3,674; `npm run build` built. (A first try of Task 6's Step 1 passed its paths as one word and applied nothing; the script stopped, and the step was run again.)
- **Batch B's review** (`superpowers:code-reviewer`, sonnet), the first of Task 6's fixes: nothing critical; **two important, both fixed in Task 6's files:**
  - Apple's camera asked MapKit again, animated, each time the plane crossed a pixel near the clear part's edge; where MapKit can't zoom out as far as asked, the view would be tugged again and again on the card.
  - The ghost could pull the view off the trip: after a diversion, far off the planned arc, it was chased whenever plane and ghost fit the band together.
  - Minor, left: a jump where both stop fitting the band together (fixed with the second); up to 1 px of overshoot in the slide's rounding (the 8 px margin takes it); the schedule's plane now kept in view too for a flight with no live data (only within 20 px of the clear part's edge); the key under the banner a little early where the banner is clamped (harmless).
- **Task 6's first amendment** (written and tested in the scratch copy, tests first, as `stages/after-6b`; copied into the worktree): `src/map/mapFit.ts` (the real plane decides the slide; a ghost off the framed view doesn't move it, one on it pulls at most 20 px and never pushes the real plane out of the band, with no jump), `src/map/appleMapPlan.ts` (`keepInView`: between framings the view slides from where it is, only once the plane's marker reaches the clear part's edge, then gets its 8 px margin back), `src/ui/AppleTripMap.tsx` (MapKit asked again only when the framing changes: the leg, the size, what covers the map, Recenter), and their tests. 8 of 67 failing first; 18 breaks, all caught. 176 / 3,686.
- **The first amendment's review** (sonnet): nothing critical; **two important, fixed:** a late report from MapKit on an earlier ask was judged against the newest ask, so the camera could stop following the plane until the next framing; and a replay at up to 10× outran animated slides. Two minor, fixed: the framing's settle check could be cancelled in the same commit; and a slide's "none" was found by the object returned, not its offsets.
- **Task 6's second amendment** (`stages/after-6c`, copied in): the camera keeps its last 8 asks and matches each MapKit report to one (a late report changes nothing); slides jump without animation in a replay; the commit that frames doesn't also slide; offsets compared on both axes, a whole world across the date line counting as none. `src/ui/AppleTripMap.tsx`, `src/map/appleMapPlan.ts`, `tests/ui/AppleTripMap.test.tsx`, `tests/map/appleMapPlan.test.ts`, and new `tests/ui/appleCameraCommit.test.tsx`. 5 of 52 failing first; 13 breaks, all caught. **177 test files and 3,692 tests**, `tsc` clean, built; the shared cases unchanged.
- **Seen in a browser** (the worktree's `crewluve-mapkit` server, Apple's map): the card at 375 by 812 in `live-ocean-gap` with the plane and its ghost in the band under the key, above the bottom chip; a 10× replay on the full map, re-framing as the trip goes from flight to ground.
- **So Task 6's commit takes the files as amended** (`stages/after-6c`), and this plan's Task 6 code blocks are the first version: the amendments are recorded here.
- **Batch B's checkpoint:** Todd chose "Run it in my Terminal, then commit": `npm test && npm run build` at 8:09 PM, 177 test files and 3,692 tests passed, `✓ built`.
- **Batch B's commits:** Task 4 `4fde60e` (its files as Task 4 left them), Task 5 `0de6618`, Task 6 `672f745` (as amended). Each commit's files are the same as tested (`after-4`, `after-5`, `after-6c`).
- **Task 7, Todd's look:** the `crewluve-mapkit` server (5182, Apple's map) from the worktree. The session read `live-on-ground-late` first (no banner, "Still on the ground in Rockford", the list with only the earlier flight and "Trip so far"). Todd looked at the four scenes, the card and the full map, on a phone's width and a computer, with the list, a replay and dark mode. **Todd: "Looks good."** Nothing to change.
- **Task 8, the whole branch's review** (`superpowers:code-reviewer`, sonnet, on `ed33ce5..672f745` as one change): nothing critical; **one important, fixed:** on the in-flight card a banner left less than the 120 px the camera needs, and the camera then dropped all its padding, so the bottom chip covered Apple's logo and Legal link, which Apple requires to show (seen in the session's own screenshots of the card at 375 px: the logo under "Over Northwest Territories").
  - It found right, read together: the banner, the card's sentence and the panel's first line all come from one `latestEvent`, now, in a replay and at the gate; "Trip so far" never missing nor said twice; the ground and a drive framed as before; per-second and per-frame cost flat (the headline no longer works out the milestones, which pays for `latestEvent`).
  - Minor, left for later: a title long enough to wrap to three lines on a phone's card leaves a band thinner than a marker; the ghost's pull steps by up to 16 px where it crosses the framed view's edge (rare with the steady framing). Fixed with the important one: no test held the banner's measuring CSS.
- **The fix** (written and tested in the scratch copy as `stages/after-8`, tests first, then copied in): `insetsThatFit` in `src/map/mapFit.ts` keeps every inset where they leave 120 px clear, else the bottom one alone where it fits, else none; `cameraFor` in `src/map/appleMapPlan.ts` pads MapKit with the same, so the card with a banner keeps its bottom padding (37 to 38 px) and Apple's logo and Legal stay above the chip; `isSameView` compares the views alone, not their padding (a late MapKit report was missed once the padding changed); `src/ui/AppleTripMap.tsx` follows. Tests in `tests/map/mapFit.test.ts`, `tests/map/appleMapPlan.test.ts`, `tests/ui/AppleTripMap.test.tsx`, `tests/ui/latestEventBanner.test.tsx`, `tests/ui/TripMapCard.test.tsx`, `tests/ui/appleCameraCommit.test.tsx`, and a guard on the banner's hidden widest "when" (absolute, hidden, on one line) in `tests/styles/styles.test.ts`. 10 of 286 failing first; 16 breaks, all caught. **177 test files and 3,702 tests**, `tsc` clean, built; the shared cases unchanged. Seen: the card at 375 by 812, Apple's logo and Legal above the chip, the plane and its ghost in the band.
- **Task 8 Step 2, Todd's run** after the fix (he chose "Run it in my Terminal, then commit"): `npm test && npm run build` at 8:27 PM, 177 test files and 3,702 tests passed, `✓ built`. **The fix's commit:** `c392305`, its files the same as `stages/after-8`.
- **This plan's commits:** Task 2 `4f8550a`, Task 3 `d5d5935`, Task 4 `4fde60e`, Task 5 `0de6618`, Task 6 `672f745` (amended twice), the whole-branch review's fix `c392305`.
- **Task 9, going live:** Todd chose "Go live: run it, then push if it passes" (16 Nov 2026, about 8:30 PM). `origin/main` was still `ed33ce5`, so the branch is a fast-forward of it (no merge needed).

## Self-review

- **Design coverage.**
  - The best guesses design's §4, the list: newest first, the flight between its gates set apart with a border and its tag and listed before its first event, earlier flights plain underneath, "Trip so far" once: Task 2, and Task 5 for an empty list.
  - Its §3, a best guess drawn lighter and slanted in the list: Task 2.
  - The latest event design's §1, what it shows and when: Task 3.
  - Its §2, where: on the card and the full map, the camera keeping the plane clear, Tasks 4 and 6; the bottom chip and the panel's first line without events, the shared headline unchanged, Tasks 3 and 4.
  - Its §3, the sentence: the card's sentence (Task 3) and the full map's banner (Task 4).
  - Todd's answers: the key just under the banner (Tasks 4 and 6); a plane at its gate left out until it takes off (Tasks 2 and 3).
  - The demo scenes by eye: Task 7. Going live: Task 9, on Todd's yes.
  - Plan 3C-3's "What plan 3C-4 takes": every event a `Milestone` with `isEstimate` (Tasks 2 and 3), `isReplay` ("In the air" and a replay's clock time, Tasks 2 and 3), and a plane still at its gate (Tasks 2 and 3).
- **Not covered here, on purpose:** a flag on the map where the event happened (the latest event design's §4); the app's key, popup and at-the-gate words (the app's own later plan).
- **Placeholders:** none. Every step's code is the tested file or a replacement made from it.
- **What could it break?**
  - The list changes for every family: newest first, the flight in the air set apart, "Trip so far" once. The shared `facts-cases.json` and `live-cases.json` pass unchanged: the headline they read still has its events.
  - The card's bottom chip and the full map panel's first line no longer say an event: the banner does.
  - Both maps' cameras now keep the plane and its ghost in the clear part in flight, where they kept only the pilot's marker. On the ground they're as before, and every earlier test of the slide passes, its one marker now in a list.
  - The key moves under the banner where they don't fit side by side; with no banner it's where it was.

## Left for later

- **The list's top line and the banner** go by different rules, as in the app: the list by the story's order along the path, the banner by time. Were a best guess and a sighting ever out of order in time, the two could name different events. On the website an event's time is read from its place along the path, so they agree (the review; the one break no test can catch, in Task 3).
- **The card's top chip gives way to the banner** while it shows, as in the app, where both sit in the map's top corner. In flight the chip is usually empty (the review).
- **The map moves a little as the banner comes and goes,** at the flight's first event and at the gate, as it makes room, as in the app. It doesn't once the family has moved the full map.
- **The flight stays "In the air now" while it taxis in,** up to the gate, as the rest of the map has it, and as the app does.
- **A flag on the map where the event happened** (the latest event design's §4).
- **Plan 3C-3's "Left for later"** holds, with the engine's and the map's (plans 3C-1 and 3C-2).
