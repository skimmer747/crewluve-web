# The Website's Follow the Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Follow the plane" on the website, as the app now has it.
- It's one setting, off at first and remembered, switched under the full map's timeline. A tap says beside the switch, for a moment, what it did.
- While it's on and a flight's plane has left, the full map and the card frame the plane, a short tail behind it and everything ahead to the destination, and glide there smoothly.
- Between legs, the glide makes every move too.

Then this plan goes live, on Todd's yes.

**Architecture:**
- **The frame and the glide** (Task 2) are plain logic, as the app's:
  - `followRect` and `followingFrame` in `src/map/tripMapFollow.ts`.
  - `glideStep` in `src/map/tripMapGlide.ts`.
  - `followView` in `src/map/appleMapPlan.ts`.
- **The switch** (Task 3): `useFollowsPlane`, and a switch in `TripTimeline` under Quick layovers, with its caption (`followCaption`) and hint.
- **The maps** (Task 4):
  - Apple's map asks MapKit for each display frame's step, without MapKit's own animation.
  - The SVG map draws each step, through `useGlide`.
  - The full map and the card both pass the setting on.

**Tech Stack:** Preact 10, TypeScript 5.9 (strict), Vite 5, Vitest 3, MapKit JS. No new package.

**Sources (read only, in `~/Dev/Crewluv` at `92de48a` on `feature/trip-map-live`):**
- **The design:** `docs/superpowers/specs/2026-11-17-follow-the-plane-design.md`, approved by Todd on 17 Nov 2026 and revised the same day after he tried it. The first build zoomed in steps; Todd said it "zooms and stops and zooms and stops", with "way more behind the plane than in front". The design now has a 10% tail and a continuous glide (§3, §4).
- **The app's plans:**
  - `docs/superpowers/plans/2026-11-17-follow-the-plane.md`: the first build.
  - `docs/superpowers/plans/2026-11-17-follow-the-plane-gliding.md`: the fix Todd tried and liked ("Better").
- **The app's code:** `Crewluv/Services/TripMap/TripMapFollow.swift` and `TripMapGlide.swift`, with their tests `CrewluvTests/TripMapFollowTests.swift` and `TripMapGlideTests.swift`. This plan's frame, glide and tests follow them.
- **The app session's notes (17 Nov 2026):**
  - **The banner at takeoff:** the app's map skipped at every takeoff, as the latest event's banner came and the padding changed. The fix: while following, the glide starts from what's on screen in the new padding.
  - Todd asked for it on the website ("Can we do it on the website now?"), and picks where the website's switch goes.
  - **What the button says** (the design's §2, revised): Todd found the app's button gave no sign of its state or purpose. The app now tints it while it's on, and on each tap shows a caption for about 2 seconds, which VoiceOver announces:
    - "Following the plane", turned on with a flight in the air;
    - "Showing the whole flight", turned off;
    - "Follows the plane when a flight is in the air", turned on with none.

    Its hint is "Keeps the map on the plane and where it's headed."
  - **Between legs** (the design's new §5): Todd saw the app "zoom in and zoom out like its trying to do more things than one" as each new leg began. While the setting is on, the glide now makes every move, between legs too: the app's `TripMap.followingFrame(at:isReplay:)`, in its working copy, not committed yet.
- **Todd's decisions for the website (17 Nov 2026):**
  - The switch goes "under the timeline", beside Quick layovers (option B of two sketches).
  - After trying the scratch build: "Feels right: write the plan".
  - The caption goes beside the switch, in the panel, not over the map (option A of two sketches).

**How this plan was checked.** Every code block here comes from a file that was run before the plan was put together. None was typed into the plan by hand: a script made each replacement from the tested files and built the plan.
- **A scratch copy of this branch** at `e9d8466`, with this plan's files laid over it task by task. Every count below is the same in this Mac's time zone and in UTC (`TZ=UTC`), as GitHub's build runs.
  - Before: 179 test files and 3,853 tests, all passing, and `tsc --noEmit` clean.
  - After Task 2: 181 test files and 3,873 tests. After Task 3: 182 test files and 3,880 tests. After Task 4: 183 test files and 3,900 tests.
  - Each time, all of them pass, `tsc --noEmit` finds nothing, and `npm run build` builds.
  - The shared cases, `live-cases.json` and `facts-cases.json`, are unchanged: each surface's camera is its own, and the app's design has no shared cases for it.
- **Tests first:** each task's tests were run before its code, and failed as its Step 2 says: all 3 of Task 2's test files, which can't load before its code, Task 3's test file, which can't load before its code, and 13 of 19 in Task 4.
- **41 deliberate breaks** were made in the new code, one at a time, and every one fails at least one test.
  - Task 2's 16: no tail; the whole way behind; no 300-mile floor; following before the plane has left; a drive followed; the live plane in a replay; the plane not followed in the air; the whole trip while a flight waits to leave; the whole trip between flights; the next flight before the first; a jump, not a glide; the zoom eased in a line; the long way round the world; a frame left off the map; never arriving; no slide for the card’s band.
  - Task 3's 11: on at first; not remembered; on where storage is blocked; the switch does nothing; the switch shows another state; the page forgets it; no caption; a caption that stays; a flight always in the air; the words of on for off; no hint.
  - Task 4's 14: the SVG map never follows; the SVG map jumps; the SVG map glides with reduced motion; the SVG glide starts over each frame; Apple’s map never follows; each step animated by MapKit; reduced motion glides; a pan doesn’t stop it; MapKit asked again for the same frame; the glide starts over each frame; no check once there; turning it off doesn’t frame again; the full map doesn’t pass it on; the card doesn’t follow.
- **Seen in a browser,** the scratch copy on Apple's map, at a computer's width and a phone's:
  - In `live-ahead` and `live-ocean-gap`, turning the switch on framed the plane, its tail and the way ahead beside the panel. A replay at 10× followed the plane to Anchorage.
  - A pan stopped the following, and Recenter glided back in about a second. Turning it off framed the whole flight again.
  - The card kept the plane between the banner and the bottom chip. This was the browser's catch: the first build let the plane fall under the key, and `followView`'s slide fixed it.
  - At phone width the switch sits under Quick layovers.
  - Todd tried it too: "Feels right".
- **The plan itself** is checked by a script. Tasks 2 to 4's steps, followed in order on the branch's files at `e9d8466`, give every file as tested.
- **A dry run:** the steps were followed again on a fresh copy of those files, tests first:
  - every file came out the same as tested;
  - the tests failed and passed as Steps 2 and 4 say;
  - the copy's tests (183 test files and 3,900 tests, in both time zones), `tsc --noEmit` and the build passed.
- **Not checked:**
  - The glide's look on a real phone: that's Todd's look, Task 5.
  - There's no review yet: Task 6's is the first.
  - Nothing called Crewlu Cloud or adsb.lol, and nothing used the network.
- **A review before the plan** (`superpowers:code-reviewer`, sonnet) of the first build, against the app's design, plans and Swift. It found no Critical issue, and these Important ones, all fixed here before the plan, with tests:
  - **A.** The SVG map's glide could stall while a replay plays, as each new frame started its loop over. Now one loop reads the newest frame on every step.
  - **B and C.** Apple's map judged the glide against the view MapKit reports, which can differ where MapKit won't zoom out so far. Then it could start glide after glide, and ask MapKit again on every render. Now it glides from, and compares with, the view it last asked for.
  - **D.** While following, nothing checked MapKit's view for the plane. Now, once a glide is there, MapKit's view is checked once, as after a framing, and slid to show the plane if MapKit settled elsewhere.
  - Of its minor points, two are taken: a frame too close to glide to is shown in the same drawing, not the next; and tests of a frame that moves as it glides. The two maps still differ on turning it off: the SVG map shows the whole flight at once, as it always framed, and Apple's map animates there, as its framings always have.

**Where this plan settles details.**
- **The switch** is the website's own, where Todd chose it: "Follow the plane", a switch under Quick layovers in the full map's panel.
  - It's always there, as Quick layovers is.
  - It's off at first, and remembered by this browser as `crewluve.tripMap.followsPlane`.
  - Where storage can't be read, as in a private window, it reads as off; where it can't be written, the choice lasts until the page closes.
  - The card has no switch: it follows the same setting.
  - The full map closes the status page while it's open, so the card reads the setting fresh when it comes back.
- **Where the plane is:** `legPlane`, the facts' plane, which the facts' tests already hold to where the map draws it, now and in a replay. A real plane at the gate isn't followed now, since it hasn't left, but a replay's plane is.
- **300 miles across** is in world units at the plane's latitude, the website's `worldPerMeterAt`, as the app's `MKMapPointsPerMeterAtLatitude`. It's applied to each side by `fitRect`'s `minSide`, as the app's `MapFit` does.
- **Between legs** (`followingFrame`, the app's): while the setting is on, the glide makes every move, and the maps' own framings stand aside:
  - in the air, once the plane has left: the follow frame;
  - a flight that hasn't left: the whole flight;
  - on the ground between two flights: the next flight's whole route, Todd's choice in the app;
  - otherwise, before the trip's first flight, after its last, and on a drive: what the map frames without the setting, the leg in motion or the whole trip.
- **The caption** (`followCaption`, the app's words):
  - It sits beside the switch, in the panel, where Todd chose it, for `FOLLOW_CAPTION_MS`, 2 seconds.
  - It's a status (`role="status"`) outside the switch's label, so screen readers hear it and the switch keeps its name.
  - "With a flight in the air" is a flight between its gates at the moment the timeline shows, as the app's `flightInMotion`.
  - The hint is the switch's description (`aria-describedby`).
  - The switch's on state is its own: green and labeled. The app's tint is for its round button.
- **The card's band:**
  - `followView` frames in the clear part, as the trip's framing does.
  - Where the banner, the key and the chips leave too little room to frame in, the frame fills the card, and the same slide (`slideToShow`) keeps the plane, its ghost or the pilot's marker between them.
  - While Apple's map glides, nothing else moves it. Once it's there, MapKit's view is checked once, as after a framing (the review's D).
  - The SVG map keeps its own slide after the glide, as before.
- **The glide on Apple's map:**
  - MapKit draws its own lines, night and marks, so the app's need to redraw them each frame doesn't arise.
  - MapKit is asked for each step without its animation.
  - One loop glides at a time, reading the newest frame on every step.
  - It glides from the view it last asked for, and MapKit isn't asked again while the frame is the same (the review's B and C). After a pan it has none, so Recenter glides on from the view MapKit shows.
  - With nothing asked of MapKit yet, its first view goes straight there.
  - **When the padding changes,** as the latest event's banner comes at takeoff and goes, the view on screen stays put and the glide eases to the frame laid out in the new padding. It glides in whole views, which don't depend on the padding, so nothing is laid out again at once. That was the app's last fix, after its map skipped at every takeoff, and a test holds the website to it.
- **The glide on the SVG map** (`useGlide`):
  - One loop, reading the newest frame on every step (the review's A).
  - It starts from the frame it showed before following began.
  - It draws each frame, as the SVG map is the site's own drawing.
  - It isn't used when the setting is off, so the SVG map frames as before.
- **Reduced motion:** both maps go straight to the frame, as the app does.
- **Left as the app leaves them (the design's §7):** following a drive, and a frame that leads the plane on a flight that turns back on itself.

---

## Ground rules for whoever runs this plan

These come from Todd's standing instructions. They override the skill's defaults.

1. **Work only in this worktree:** `/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046`, on its branch `claude/trip-map-live-598046`, at `e9d8466` or later.
   - Never edit the main checkout, `/Users/toddanderson/Dev/Crewluve Website`: its untracked plan file isn't this work's.
   - `~/Dev/Crewluv` is shared with other sessions. Only read it (`git -C ~/Dev/Crewluv show`, `log`, `ls-tree`): change, stash, reset or switch nothing there.
2. **Never commit without Todd's yes in the conversation,** and then only the task's own files, by path. **Never push, and never merge into `main`,** but in Task 7, on Todd's yes then.
3. **The tests:** the session runs them as it works (`npx vitest run <files>`, `npm test`, `TZ=UTC npm test`, `npm run build`). At the checkpoints (Tasks 2 to 4, Step 5), Todd runs the command himself. Don't change files while he's running them, and don't ask for a run until the files are final.
4. **The shared cases** (`tests/fixtures/trip-map/live-cases.json`, `facts-cases.json`) are the app's, never edited. No step changes them.
5. **Copy the code as written.** It was run as it stands. A replacement is exact: its text is in the file once. If it isn't, stop: the file has changed since this plan was written.
6. **Nothing here calls Crewlu Cloud or adsb.lol.** Every test uses a stand-in, and the tests can't reach the network. Change nothing in Crewlu Cloud's live Supabase project, and don't read it.
7. **Unchanged:** every request to Crewlu Cloud still goes through the door and its guard (`tests/data/doorRules.test.ts` and `doorRulesScan.test.ts` must pass), no `innerHTML`, no download, no `npm install`.
8. **A clock time in a test is the viewer's zone's, never the Mac's:** GitHub's build runs in UTC. Each task's Step 4 runs the suite in UTC too.
9. **Reviewers:** dispatch `superpowers:code-reviewer` with `model: "sonnet"`.
10. **No release note.** The website has none; Task 7 says what went live in this plan's record.

## File map

| File | Task | Responsibility |
|---|---|---|
| `src/map/tripMapFollow.ts` | create (2) | `followRect`, `followingFrame`, `TAIL_SHARE`, `LEAST_WIDTH_M`, `worldPerMeterAt` |
| `src/map/tripMapGlide.ts` | create (2) | `glideStep`, `isThere` |
| `src/map/appleMapPlan.ts` | modify (2) | `followView`; `wholeView` and `cameraFor` exported |
| `tests/map/tripMapFollow.test.ts`, `tests/map/tripMapGlide.test.ts` | create (2) | the app's tests, ported |
| `tests/map/appleMapPlan.test.ts` | modify (2) | `followView` and the card's band |
| `src/ui/hooks/useFollowsPlane.ts` | create (3) | the setting, remembered |
| `src/ui/TripTimeline.tsx`, `src/ui/TripMapPage.tsx` | modify (3, and the page in 4) | the switch and its caption; the page passes it to the map (4) |
| `src/copy/tripMap.ts`, `src/styles/tripMap.css` | modify (3) | the caption's words and the hint; the caption's look |
| `tests/ui/followSwitch.test.tsx` | create (3) | the switch |
| `src/ui/hooks/useGlide.ts` | create (4) | the SVG map's glide, and `prefersStill` |
| `src/ui/AppleTripMap.tsx`, `src/ui/TripMapSvg.tsx`, `src/ui/TripMapCard.tsx` | modify (4) | following, and the glide |
| `tests/ui/followThePlane.test.tsx` | create (4) | both maps, the full map and the card |

Three code tasks, then:
- Task 5: Todd's look.
- Task 6: the review and this plan's record.
- Task 7: going live, on Todd's yes.

---

### Task 1: Before starting

- [x] **Step 1: Check the worktree and the branch, and the app's commit.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git status --short && git branch --show-current && git log --oneline -1 && git -C ~/Dev/Crewluv cat-file -t 92de48a
```

Expected:
- Nothing changed but this plan's file.
- The branch `claude/trip-map-live-598046`.
- `e9d8466`, or a later commit of this plan's.
- `commit`.

- [x] **Step 2: Read the design** (`git -C ~/Dev/Crewluv show 92de48a:docs/superpowers/specs/2026-11-17-follow-the-plane-design.md`), and this plan's "Where this plan settles details".

---

### Task 2: The frame that follows the plane, between legs too, and the glide toward it (design §3 to §5)

Plain logic, as the app's `TripMapFollow` and `TripMapGlide`, tested with the app's examples. `followRect` (`src/map/tripMapFollow.ts`): while a flight is between its gates and its plane has left, the frame of 33 places along its path from a tail of `TAIL_SHARE` (10%) of the path behind the plane to the destination, and the plane itself, where the map draws it (`legPlane`, the facts' plane: the real one, the replay's, or the schedule's), fitted with `fitRect`'s margins and at least `LEAST_WIDTH_M` (300 miles) across. `followingFrame` is what the camera glides to while the setting is on, between legs too (the app's `TripMap.followingFrame`): the follow frame in the air, the whole flight while it waits to leave, the next flight's route between two flights, and otherwise the leg in motion or the whole trip. `glideStep` (`src/map/tripMapGlide.ts`): each display frame closes 1 − e^(−dt ÷ 350 ms) of the gap, the middle in a line and the zoom by its log, the short way across the date line, and arrives exactly within a thousandth. `followView` (`src/map/appleMapPlan.ts`): the frame fitted to the clear part, and slid, as the trip's framing is, to keep the plane between the card's banner and its bottom chip; `wholeView` and `cameraFor` are exported for the glide.

**Files:**
- Modify: `src/map/appleMapPlan.ts`
- Create: `tests/map/tripMapFollow.test.ts`, `tests/map/tripMapGlide.test.ts`
- Test: `tests/map/appleMapPlan.test.ts`

- [x] **Step 1: Write the tests.**

**In `tests/map/appleMapPlan.test.ts`, replace (1 of 2):**

```ts
import { describe, expect, it } from 'vitest'
import { appleCamera, appleMapPlan, isSameView, keepInView, laidOut, offDateLine, slideIntoView, type AppleCamera } from '../../src/map/appleMapPlan'
import { fitClear, fitRect, NO_INSETS, type Insets, type WorldRect } from '../../src/map/mapFit'
import { toWorld } from '../../src/map/mercator'
import { placeAt } from '../../src/map/svgPaths'
import type { GeoPoint } from '../../src/map/greatCircle'
import { framingPoints, legProgress, makeTripMap, positionAt } from '../../src/map/tripMap'
import { tripMapDrawing } from '../../src/map/tripMapDrawing'
import { AIRPORTS, at, drive, EUROPE, flight } from '../map/tripMapLegs'

/** Where a place is on the whole `width` × `height` view MapKit shows for `camera`: its rectangle, grown by its padding. */
```

**with:**

```ts
import { describe, expect, it } from 'vitest'
import {
  appleCamera, appleMapPlan, followView, isSameView, keepInView, laidOut, offDateLine, slideIntoView, type AppleCamera,
} from '../../src/map/appleMapPlan'
import { fitClear, fitRect, NO_INSETS, type Insets, type WorldRect } from '../../src/map/mapFit'
import { toWorld } from '../../src/map/mercator'
import { placeAt } from '../../src/map/svgPaths'
import type { GeoPoint } from '../../src/map/greatCircle'
import { framingPoints, legProgress, makeTripMap, positionAt } from '../../src/map/tripMap'
import { tripMapDrawing } from '../../src/map/tripMapDrawing'
import { followRect } from '../../src/map/tripMapFollow'
import { legPlane } from '../../src/facts/planePosition'
import { equatorFlight } from '../facts/factsTestData'
import { date } from '../facts/liveFacts'
import { AIRPORTS, at, drive, EUROPE, flight } from '../map/tripMapLegs'

/** Where a place is on the whole `width` × `height` view MapKit shows for `camera`: its rectangle, grown by its padding. */
```

**In `tests/map/appleMapPlan.test.ts`, replace (2 of 2):**

```ts
    expect(slideIntoView(slid, [home], width, height, insets)).toBeNull()
  })
})
```

**with:**

```ts
    expect(slideIntoView(slid, [home], width, height, insets)).toBeNull()
  })
})

describe('the view that follows the plane on Apple’s map (follow the plane design §3)', () => {
  const leg = equatorFlight(0, 20)
  const t = date('2026-03-20T11:45:00Z')
  const follow = followRect(leg, t, false)!
  const plane = legPlane(leg, t, false).place

  it('is the frame fitted to the clear part, where the plane is in it already', () => {
    expect(followView(follow, [plane], 390, 520, NO_INSETS)).toEqual(fitClear(follow, 390, 520, NO_INSETS))
  })

  it('slides to keep the plane between the card’s banner and its bottom chip, where they leave too little to frame in', () => {
    // A card 220 px tall: the banner and key take 150 at the top, the chip 40 at the bottom, so the frame fills the card
    // and the plane, in its middle, would be under the banner.
    const insets: Insets = { top: 150, right: 0, bottom: 40, left: 0 }
    const view = followView(follow, [plane], 343, 220, insets)
    const y = placeAt(plane, { rect: view, width: 343, height: 220 }).y
    expect(placeAt(plane, { rect: fitClear(follow, 343, 220, insets), width: 343, height: 220 }).y).toBeLessThan(150)
    expect(y).toBeGreaterThanOrEqual(150)
    expect(y).toBeLessThanOrEqual(180)
  })
})
```

**Create `tests/map/tripMapFollow.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { legPlane } from '../../src/facts/planePosition'
import type { GeoPoint } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { fitRect, type WorldRect } from '../../src/map/mapFit'
import { toWorld } from '../../src/map/mercator'
import { framingPoints, makeTripMap } from '../../src/map/tripMap'
import { followingFrame, followRect, LEAST_WIDTH_M, TAIL_SHARE, worldPerMeterAt } from '../../src/map/tripMapFollow'
import { equatorFlight, flightMap } from '../facts/factsTestData'
import { date, equatorLive, equatorLiveLeg, liveTime } from '../facts/liveFacts'
import { AIRPORTS, at as tripAt, drive, EUROPE, flight as tripFlight } from './tripMapLegs'

/**
 * The frame that follows the plane (the app's follow the plane design §3), as the app's TripMapFollowTests. The flight is
 * the equator flight from E0 to E20, 1,382 mi: its gates at 10:00 and 13:22 UTC, its plan in the air from 10:15 to 13:15,
 * flown by the schedule.
 */
const at = (time: string) => date(`2026-03-20T${time}:00Z`)
const flight = equatorFlight(0, 20)

/** Whether `rect` holds `place`, in the copy of the world nearest its middle. */
function holds(rect: WorldRect, place: GeoPoint): boolean {
  const p = toWorld(place)
  const x = p.x + Math.round(rect.x + rect.width / 2 - p.x)
  return x >= rect.x && x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height
}
const onEquator = (lng: number): GeoPoint => ({ lat: 0, lng })

describe('the frame that follows the plane (follow the plane design §3)', () => {
  it('holds the plane, its tail and the way ahead mid-flight, but not the start', () => {
    const rect = followRect(flight, at('11:45'), false)!
    const plane = legPlane(flight, at('11:45'), false).place
    expect(holds(rect, plane)).toBe(true)
    expect(holds(rect, onEquator(20)), 'the destination').toBe(true)
    // The tail is 10% of the flight behind the plane, 2° of its 20, and the margin adds a fifth of the width.
    expect(holds(rect, onEquator(plane.lng - 3)), 'the tail and its margin').toBe(true)
    expect(holds(rect, onEquator(plane.lng - 5))).toBe(false)
    expect(holds(rect, onEquator(0)), 'E0 is left behind').toBe(false)
    const whole = fitRect(framingPoints(flightMap(flight, null), flight))!
    expect(rect.width).toBeLessThan(whole.width * 0.85)
  })

  it('holds more ahead than behind, until the last tenth of the flight', () => {
    const rect = followRect(flight, at('11:45'), false)!
    const plane = toWorld(legPlane(flight, at('11:45'), false).place)
    expect(rect.x + rect.width - plane.x).toBeGreaterThan(2 * (plane.x - rect.x))
  })

  it('grows smaller as the flight goes on', () => {
    const [early, middle, late] = ['10:45', '11:45', '12:45'].map((time) => followRect(flight, at(time), false)!)
    expect(early.width).toBeGreaterThan(middle.width)
    expect(middle.width).toBeGreaterThan(late.width)
  })

  it('is never narrower than 300 miles', () => {
    // E0 to E2 is 138 mi: half way, the plane, a tail and the way ahead span far less than 300.
    const short = equatorFlight(0, 2, at('10:00'), 'short')
    const rect = followRect(short, (short.start + short.end) / 2, false)!
    const least = LEAST_WIDTH_M * worldPerMeterAt(0)
    expect(Math.abs(rect.width - least)).toBeLessThan(least * 0.01)
    expect(TAIL_SHARE).toBe(0.1)
  })

  it('is none before the plane has left, after the gate, and on a drive', () => {
    expect(followRect(flight, at('10:10'), false), 'taxiing out: the whole flight').toBeNull()
    expect(followRect(flight, at('13:30'), false), 'at the gate').toBeNull()
    expect(followRect({ ...flight, kind: 'drive', flightNumber: null }, at('11:45'), false)).toBeNull()
  })

  it('follows the real plane, where the map draws it', () => {
    // The real plane is seen to 6° E, ahead of the schedule's.
    const seenUntil = liveTime(6)
    const leg = equatorLiveLeg(equatorLive(seenUntil), seenUntil)
    const rect = followRect(leg, seenUntil, false)!
    const plane = legPlane(leg, seenUntil, false).place
    expect(Math.abs(plane.lng - 6)).toBeLessThan(0.1)
    expect(holds(rect, plane)).toBe(true)
    expect(holds(rect, onEquator(4.5)), 'its tail').toBe(true)
  })

  it('of a real plane still at the gate, is the whole flight now, but follows the replay’s plane', () => {
    const atTheGate: LiveFlight = {
      legId: 'eq', callsign: 'TST1', state: 'ground', landedAt: null, trail: [],
      fix: { place: onEquator(0), altitudeFt: null, groundSpeedKt: 0, trackDeg: null, onGround: true, registration: 'N370UP', typeCode: 'B763', seenAt: at('11:19') },
    }
    const leg = equatorLiveLeg(atTheGate, at('11:20'))
    expect(followRect(leg, at('11:20'), false), 'it hasn’t left').toBeNull()
    expect(followRect(leg, at('11:20'), true), 'the replay’s plane, by the schedule').not.toBeNull()
  })

})

describe('the frame the camera glides to while following, between legs too (follow the plane design §5)', () => {
  // Louisville to Cologne from 0 to 8 h, Cologne to Dubai from 32 to 38 h, Dubai to Louisville from 58 to 72 h.
  const trip = (now: number) => makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now, airports: AIRPORTS })!

  it('follows the plane in the air, and frames the whole flight while it hasn’t left', () => {
    const map = flightMap(flight, null)
    expect(followingFrame(map, at('11:45'), false)).toEqual(followRect(flight, at('11:45'), false))
    expect(followingFrame(map, at('10:10'), false)).toEqual(fitRect(framingPoints(map, flight)))
    // On a trip, the flight's own route, not the whole trip: Cologne to Dubai, five minutes after its gate time.
    const taxiing = trip(tripAt(32) + 5 * 60_000)
    expect(followingFrame(taxiing, tripAt(32) + 5 * 60_000, false)).toEqual(fitRect(framingPoints(taxiing, taxiing.legs[1])))
  })

  it('frames the next flight’s whole route on the ground between two flights (“The next flight”, Todd, 17 Nov 2026)', () => {
    const map = trip(tripAt(20))
    expect(followingFrame(map, tripAt(20), false)).toEqual(fitRect(framingPoints(map, map.legs[1])))
  })

  it('frames what the map frames without the setting before the first flight, after the last, and on a drive', () => {
    const before = trip(tripAt(-5))
    expect(followingFrame(before, tripAt(-5), false)).toEqual(fitRect(framingPoints(before, null)))
    const after = trip(tripAt(80))
    expect(followingFrame(after, tripAt(80), false)).toEqual(fitRect(framingPoints(after, null)))
    const driving = makeTripMap([tripFlight('f1', 'SDF', 'CGN', 0, 8), drive('d1', 'CGN', 'DXB', 10, 2), tripFlight('f2', 'DXB', 'SDF', 20, 6)],
      { isNextTrip: false, home: 'SDF', now: tripAt(11), airports: AIRPORTS })!
    expect(followingFrame(driving, tripAt(11), false)).toEqual(fitRect(framingPoints(driving, driving.legs[1])))
  })
})
```

**Create `tests/map/tripMapGlide.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import type { WorldRect } from '../../src/map/mapFit'
import { GLIDE_TIME_CONSTANT_MS, glideStep, isThere } from '../../src/map/tripMapGlide'

/**
 * The glide toward the frame that follows the plane (the app's follow the plane design §4), as the app's
 * TripMapGlideTests, in world units (a world across is 1) where the app's are MapKit's map points (268,435,456 across).
 */
const WORLD = 268_435_456
const rect = (x: number, y: number, width: number, height: number): WorldRect => ({ x: x / WORLD, y: y / WORLD, width: width / WORLD, height: height / WORLD })
const current = rect(100_000_000, 100_000_000, 8_000_000, 8_000_000)
const FRAME = 1000 / 60
const midX = (r: WorldRect) => r.x + r.width / 2
const midY = (r: WorldRect) => r.y + r.height / 2
/** Within a map point of the app's, in world units. */
const NEAR = 1 / WORLD

describe('the glide toward the frame (follow the plane design §4)', () => {
  it('closes part of the gap, in its middle and its zoom alike', () => {
    const target = rect(104_000_000, 102_000_000, 2_000_000, 2_000_000)
    const next = glideStep(current, target, GLIDE_TIME_CONSTANT_MS)
    const share = 1 - Math.exp(-1)
    expect(Math.abs(midX(next) - (midX(current) + (midX(target) - midX(current)) * share))).toBeLessThan(NEAR)
    expect(Math.abs(midY(next) - (midY(current) + (midY(target) - midY(current)) * share))).toBeLessThan(NEAR)
    // The zoom eases by the same share of its log: from 8 to 2 million is a quarter, so 4^0.632 smaller.
    expect(Math.abs(next.width - 8_000_000 / WORLD / 4 ** share)).toBeLessThan(NEAR)
    expect(Math.abs(next.height - next.width)).toBeLessThan(NEAR)
  })

  it('catches up in about a second, frame by frame', () => {
    const target = rect(104_000_000, 102_000_000, 2_000_000, 2_000_000)
    let r = current
    for (let i = 0; i < 60; i++) r = glideStep(r, target, FRAME)
    expect(Math.abs(midX(r) - midX(target)), 'within 6% after a second').toBeLessThan(0.06 * Math.abs(midX(current) - midX(target)))
    for (let i = 0; i < 240; i++) r = glideStep(r, target, FRAME)
    expect(r, 'there, exactly, and no further').toEqual(target)
  })

  it('is never in a hurry', () => {
    // A fifth of a second on, more than half the gap is still to go.
    const target = rect(104_000_000, 100_000_000, 8_000_000, 8_000_000)
    const next = glideStep(current, target, 200)
    expect(midX(target) - midX(next)).toBeGreaterThan(0.5 * (midX(target) - midX(current)))
  })

  it('never overshoots', () => {
    const target = rect(104_000_000, 102_000_000, 2_000_000, 2_000_000)
    expect(glideStep(current, target, 60_000)).toEqual(target)
    expect(glideStep(current, target, 0), 'no time, no move').toEqual(current)
  })

  it('goes the short way across the date line', () => {
    const west = rect(WORLD - 6_000_000, 100_000_000, 4_000_000, 4_000_000)
    const east = rect(2_000_000, 100_000_000, 4_000_000, 4_000_000)
    const next = glideStep(west, east, GLIDE_TIME_CONSTANT_MS)
    // Its middle moves east across the line, 6.32 million of the 8 million, not back across the world.
    const moved = (midX(next) - midX(west) + 1) % 1
    expect(Math.abs(moved - (8_000_000 / WORLD) * (1 - Math.exp(-1)))).toBeLessThan(NEAR)
    expect(next.x).toBeGreaterThanOrEqual(0)
    expect(next.x).toBeLessThan(1)
    // And back west across it, still starting on the map.
    const back = glideStep(east, west, GLIDE_TIME_CONSTANT_MS)
    expect(back.x).toBeGreaterThanOrEqual(0)
    expect(back.x).toBeLessThan(1)
  })

  it('is there only when the gap is tiny', () => {
    const nudged = { ...current, x: current.x + 4_000 / WORLD }
    expect(isThere(current, nudged), '4,000 of 8 million: a twentieth of a percent').toBe(true)
    expect(isThere(current, { ...current, x: current.x + 80_000 / WORLD })).toBe(false)
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/map/appleMapPlan.test.ts tests/map/tripMapFollow.test.ts tests/map/tripMapGlide.test.ts
```

Expected: all three files fail. `tests/map/tripMapFollow.test.ts` and `tripMapGlide.test.ts` can't load, because `src/map/tripMapFollow.ts` and `tripMapGlide.ts` aren't there yet. `tests/map/appleMapPlan.test.ts` can't load either, because its new tests import `followView` and `followRect`. Step 4 has their 42 tests.

- [x] **Step 3: Write the code.**

**In `src/map/appleMapPlan.ts`, replace (1 of 3):**

```ts

/** The pilot's marker counts as in view when a slide would move it less than this, in px: never a slide for rounding. */
```

**with:**

```ts

/**
 * The whole view that follows the plane (follow the plane design §3), from `follow`, the frame that holds it, its tail
 * and the way ahead: framed in the clear part as the trip is (`appleCamera`), then slid the shortest way that shows what's
 * kept in view, the plane and its ghost, there. Where the card's chips and the banner leave too little clear to frame in,
 * the frame fills the card and the slide keeps the plane between them, as it does today. The glide heads for it.
 */
export function followView(follow: WorldRect, kept: readonly GeoPoint[], width: number, height: number, insets: Insets): WorldRect {
  const framed = fitClear(follow, width, height, insets)
  return slideToShow(framed, width, height, kept.map((p) => placeAt(p, { rect: framed, width, height })), PILOT_RADIUS, insets)
}

/** The pilot's marker counts as in view when a slide would move it less than this, in px: never a slide for rounding. */
```

**In `src/map/appleMapPlan.ts`, replace (2 of 3):**

```ts
/** The whole `width` × `height` view MapKit shows for `camera`: its rectangle, grown by its padding. */
function wholeView({ rect, padding }: AppleCamera, width: number, height: number): WorldRect {
  const perPixel = rect.width / (width - padding.left - padding.right)
```

**with:**

```ts
/** The whole `width` × `height` view MapKit shows for `camera`: its rectangle, grown by its padding. */
export function wholeView({ rect, padding }: AppleCamera, width: number, height: number): WorldRect {
  const perPixel = rect.width / (width - padding.left - padding.right)
```

**In `src/map/appleMapPlan.ts`, replace (3 of 3):**

```ts
 */
function cameraFor(view: WorldRect, width: number, height: number, all: Insets): AppleCamera {
  const insets = insetsThatFit(all, width, height)
```

**with:**

```ts
 */
export function cameraFor(view: WorldRect, width: number, height: number, all: Insets): AppleCamera {
  const insets = insetsThatFit(all, width, height)
```

**Create `src/map/tripMapFollow.ts`:**

```ts
import { legPath } from '../facts/legCourse'
import { legPlane } from '../facts/planePosition'
import { pointAtDistance } from './flightPath'
import { EARTH_RADIUS_M, METERS_PER_MILE } from './greatCircle'
import { fitRect, type WorldRect } from './mapFit'
import { framingPoints, isMoving, legInMotion, nextFlight, type MapLeg, type TripMap } from './tripMap'

/**
 * Following the plane (the app's follow the plane design §3, as its TripMapFollow): the frame that holds a flight's
 * plane, a short tail behind it and everything left to the destination. The map glides toward it (`tripMapGlide`).
 */

/** The tail behind the plane: this share of the path's whole length, so it's a steady size all flight. */
export const TAIL_SHARE = 0.1

/** The frame is never narrower than this across: about 300 miles, in meters, so the end is a regional view. */
export const LEAST_WIDTH_M = 300 * METERS_PER_MILE

/** How many places along the tail and the way ahead the frame is made from. */
const PLACE_COUNT = 33

/** World units (a whole world across is 1) in a meter east and west at `latitude`, as MapKit's map points a meter. */
export const worldPerMeterAt = (latitude: number) => 1 / (2 * Math.PI * EARTH_RADIUS_M * Math.cos((latitude * Math.PI) / 180))

/**
 * The frame that follows `leg`'s plane at `t` (§3): the plane where the map draws it, the tail behind it and the path
 * ahead to the destination, with `fitRect`'s margins, at least `LEAST_WIDTH_M` across. Null where the whole flight is
 * framed as before: it isn't a flight between its gates, or its plane hasn't left.
 * - `isReplay`: `t` is a moment of the replay, so the real plane is where its record has it.
 */
export function followRect(leg: MapLeg, t: number, isReplay: boolean): WorldRect | null {
  if (leg.kind !== 'flight' || !isMoving(leg, t)) return null
  const plane = legPlane(leg, t, isReplay)
  const path = legPath(leg)
  const distance = Math.min(plane.distance, path.length)
  if (!(distance > 0) || !(path.length > 0)) return null
  const tailStart = Math.max(0, distance - TAIL_SHARE * path.length)
  const step = (path.length - tailStart) / (PLACE_COUNT - 1)
  const places = [...Array.from({ length: PLACE_COUNT }, (_, i) => pointAtDistance(path, tailStart + i * step)), plane.place]
  return fitRect(places, undefined, LEAST_WIDTH_M * worldPerMeterAt(plane.place.lat))
}

/**
 * The frame the camera glides to at `t` while the family follows the plane (follow the plane design §3, §5), as the app's
 * `TripMap.followingFrame(at:isReplay:)`: the flight's plane once it has left (`followRect`), the whole flight while it
 * waits to, the next flight's whole route on the ground between two flights ("The next flight", Todd, 17 Nov 2026), and
 * otherwise what the map frames without the setting: the leg in motion, or the whole trip and home. The glide makes every
 * move with it, between legs too, so no two animations compete as a leg changes. Null only with nothing to frame.
 */
export function followingFrame(map: TripMap, t: number, isReplay: boolean): WorldRect | null {
  const flight = map.legs.find((l) => l.kind === 'flight' && isMoving(l, t))
  if (flight) return followRect(flight, t, isReplay) ?? fitRect(framingPoints(map, flight))
  const moving = legInMotion(map, t)
  const next = moving ? null : nextFlight(map, t)
  if (next && map.legs.some((l) => l.kind === 'flight' && l.end <= t)) return fitRect(framingPoints(map, next))
  return fitRect(framingPoints(map, moving))
}
```

**Create `src/map/tripMapGlide.ts`:**

```ts
import type { WorldRect } from './mapFit'

/**
 * The glide toward the frame that follows the plane (the app's follow the plane design §4, as its TripMapGlide): on every
 * display frame the map closes part of the gap to the frame it wants, its middle and its zoom together, so it tracks the
 * plane smoothly with no steps, and catches up in about a second.
 */

/** How quickly the gap closes: it shrinks by e (to 37%) every this long, so it's down to 5% in about a second. */
export const GLIDE_TIME_CONSTANT_MS = 350

/** Closer than this share of the frame's size, in its middle and its zoom, the glide has arrived. */
export const GLIDE_ARRIVAL = 0.001

/**
 * The frame `elapsedMs` on from `current`, gliding toward `target`. Its middle and its zoom (the log of its size) each
 * close the same share of their gaps, 1 − e^(−elapsed ÷ `GLIDE_TIME_CONSTANT_MS`), so zooming in and out ease alike, and
 * a frame across the date line glides the short way round. It's `target` once within `GLIDE_ARRIVAL`.
 */
export function glideStep(current: WorldRect, target: WorldRect, elapsedMs: number): WorldRect {
  if (!(current.width > 0 && current.height > 0 && target.width > 0 && target.height > 0)) return target
  const share = elapsedMs > 0 ? 1 - Math.exp(-elapsedMs / GLIDE_TIME_CONSTANT_MS) : 0
  const midX = (r: WorldRect) => r.x + r.width / 2
  const midY = (r: WorldRect) => r.y + r.height / 2
  // The short way round: a whole world (1 across) is no move.
  let dx = midX(target) - midX(current)
  dx -= Math.round(dx)
  const dy = midY(target) - midY(current)
  const widthRatio = target.width / current.width
  const heightRatio = target.height / current.height
  const left = 1 - share
  const isThere = Math.abs(dx * left) < GLIDE_ARRIVAL * target.width && Math.abs(dy * left) < GLIDE_ARRIVAL * target.height
    && Math.abs(Math.log(widthRatio) * left) < GLIDE_ARRIVAL && Math.abs(Math.log(heightRatio) * left) < GLIDE_ARRIVAL
  if (isThere) return target
  const width = current.width * widthRatio ** share
  const height = current.height * heightRatio ** share
  let x = midX(current) + dx * share - width / 2
  // A frame is kept starting on the map, running on past its right edge if it must, as `fitRect` keeps it.
  x -= Math.floor(x)
  return { x, y: midY(current) + dy * share - height / 2, width, height }
}

/** Whether `current` is close enough to `target` to show `target` at once, with no glide. */
export const isThere = (current: WorldRect, target: WorldRect): boolean => {
  const next = glideStep(current, target, 0)
  return next.x === target.x && next.y === target.y && next.width === target.width && next.height === target.height
}
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 42 tests pass. Then `npx tsc --noEmit`: nothing; `npm test`: 181 test files and 3,873 tests pass, and the same with `TZ=UTC npm test`, as GitHub's build runs; and `npm run build` ends `✓ built`. Last, the shared cases:

```bash
git diff --name-only e9d8466 -- tests/fixtures/trip-map
```

Expected: nothing. The shared cases are the app's, and no step changes them.

- [x] **Step 5: The checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && TZ=UTC npm test && npm run build
```

Expected: 181 test files and 3,873 tests pass, twice (in this Mac's time zone, then in UTC as GitHub's build runs), and the build ends `✓ built`.

- [x] **Step 6: Commit, on Todd's yes.** Only these files, by path:

```bash
git add src/map/appleMapPlan.ts src/map/tripMapFollow.ts src/map/tripMapGlide.ts tests/map/appleMapPlan.test.ts tests/map/tripMapFollow.test.ts tests/map/tripMapGlide.test.ts
git commit -m "The frame that follows the plane, its tail and the way ahead, between legs too, and the glide toward it, as the app's TripMapFollow, TripMap.followingFrame and TripMapGlide (follow the plane design §3 to §5)"
```

---

### Task 3: The Follow the plane switch, under Quick layovers, and what a tap did beside it (design §2)

`useFollowsPlane` (`src/ui/hooks/useFollowsPlane.ts`): the setting, off at first, remembered by this browser as Quick layovers is (`crewluve.tripMap.followsPlane`), and off where storage can't be read. The switch under the full map's timeline, beside Quick layovers, where Todd chose it (`src/ui/TripTimeline.tsx`), and the full map keeps it (`src/ui/TripMapPage.tsx`). Each tap says beside the switch for 2 seconds what it did, in the app's words (`followCaption`, `src/copy/tripMap.ts`), as a status screen readers hear, and the switch has the app's hint. The maps follow it in Task 4.

**Files:**
- Modify: `src/copy/tripMap.ts`, `src/styles/tripMap.css`, `src/ui/TripMapPage.tsx`, `src/ui/TripTimeline.tsx`
- Create: `tests/ui/followSwitch.test.tsx`

- [x] **Step 1: Write the tests.**

**Create `tests/ui/followSwitch.test.tsx`:**

```tsx
// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFollowsPlane } from '../../src/ui/hooks/useFollowsPlane'
import { FOLLOW_CAPTION_MS } from '../../src/ui/TripTimeline'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { equatorFlight, flightMap } from '../facts/factsTestData'
import { date } from '../facts/liveFacts'

/**
 * The Follow the plane switch (the app's follow the plane design §2): under the full map's timeline, beside Quick
 * layovers (Todd, 17 Nov 2026), off at first and remembered by this browser. The flight is the equator flight from E0 to
 * E20, its plan in the air from 10:15 to 13:15 UTC.
 */
const at = (time: string) => date(`2026-03-20T${time}:00Z`)
const leg = equatorFlight(0, 20)
const map = flightMap(leg, null)

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('the Follow the plane switch (follow the plane design §2; under the timeline, Todd, 17 Nov 2026)', () => {
  const page = (now = at('11:45')) => render(<TripMapPage map={map} now={now} viewerTz="America/New_York" h24={false} day={1} days={1} land={null} onBack={() => {}} />)
  const toggle = () => screen.getByRole('switch', { name: 'Follow the plane' }) as HTMLInputElement

  it('is off at first, under Quick layovers', () => {
    page()
    expect(toggle().checked).toBe(false)
    const switches = screen.getAllByRole('switch').map((s) => s.closest('label')?.textContent?.trim())
    expect(switches).toEqual(['Quick layovers', 'Follow the plane'])
  })

  it('is remembered by this browser', () => {
    page()
    fireEvent.click(toggle())
    expect(toggle().checked).toBe(true)
    expect(localStorage.getItem('crewluve.tripMap.followsPlane')).toBe('on')
    cleanup()
    page()
    expect(toggle().checked).toBe(true)
    fireEvent.click(toggle())
    expect(localStorage.getItem('crewluve.tripMap.followsPlane')).toBe('off')
  })

  it('reads as off, and still switches, where storage can’t be read or written', () => {
    const blocked = () => {
      throw new Error('blocked')
    }
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked })
    let shown: [boolean, (on: boolean) => void] | null = null
    function Probe() {
      shown = useFollowsPlane()
      return null
    }
    render(<Probe />)
    expect(shown![0]).toBe(false)
    act(() => shown![1](true))
    expect(shown![0]).toBe(true)
  })

  it('says beside it for a moment what a tap did, as a status screen readers hear, and the app’s words', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      page()
      const status = () => screen.getByRole('status').textContent
      expect(status()).toBe('')
      fireEvent.click(toggle())
      expect(status()).toBe('Following the plane')
      act(() => {
        vi.advanceTimersByTime(FOLLOW_CAPTION_MS)
      })
      expect(status()).toBe('')
      fireEvent.click(toggle())
      expect(status()).toBe('Showing the whole flight')
      // The switch keeps its name: the caption is beside it, not in its label.
      expect(screen.getByRole('switch', { name: 'Follow the plane' })).toBe(toggle())
    } finally {
      vi.useRealTimers()
    }
  })

  it('says when it will follow, turned on with no flight in the air', () => {
    page(at('13:30'))
    fireEvent.click(toggle())
    expect(screen.getByRole('status').textContent).toBe('Follows the plane when a flight is in the air')
  })

  it('tells screen readers what it does', () => {
    page()
    const hint = document.getElementById(toggle().getAttribute('aria-describedby')!)
    expect(hint?.textContent).toBe('Keeps the map on the plane and where it’s headed.')
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/ui/followSwitch.test.tsx
```

Expected: the file fails: it can't load, because `src/ui/hooks/useFollowsPlane.ts` isn't there yet. Step 4 has its 6 tests.

- [x] **Step 3: Write the code.**

**In `src/copy/tripMap.ts`, replace:**

```ts
  return label ? liveLabelText(label) : 'In flight'
}

/** "45 min", "2 h" or "2 h 10 min": the landing countdown's length, and the real plane's gap. */
```

**with:**

```ts
  return label ? liveLabelText(label) : 'In flight'
}

/**
 * The caption a tap on Follow the plane shows for a moment beside the switch, and screen readers hear (follow the plane
 * design §2, as the app's TripMapWording.followCaption): what the map does now. With no flight in the air, turning it on
 * changes nothing yet, so it says when it will.
 */
export function followCaption(isOn: boolean, hasFlightInAir: boolean): string {
  if (!isOn) return 'Showing the whole flight'
  return hasFlightInAir ? 'Following the plane' : 'Follows the plane when a flight is in the air'
}

/** What Follow the plane does, for screen readers, as the app's hint. */
export const FOLLOW_HINT = 'Keeps the map on the plane and where it’s headed.'

/** "45 min", "2 h" or "2 h 10 min": the landing countdown's length, and the real plane's gap. */
```

**In `src/styles/tripMap.css`, replace:**

```css
.trip-timeline-quick { display: flex; align-items: center; gap: 10px; min-height: 44px; cursor: pointer; }
.trip-timeline-switch {
```

**with:**

```css
.trip-timeline-quick { display: flex; align-items: center; gap: 10px; min-height: 44px; cursor: pointer; }
/* Follow the plane, and beside it for a moment what a tap did (follow the plane design §2). */
.trip-timeline-follow { display: flex; align-items: center; flex-wrap: wrap; column-gap: 12px; }
.trip-timeline-caption { color: var(--text-2); font-size: 0.85rem; }
.trip-timeline-switch {
```

**In `src/ui/TripMapPage.tsx`, replace (1 of 3):**

```tsx
import { useMapStyle } from './hooks/useMapStyle'
import { useQuickLayovers } from './hooks/useQuickLayovers'
```

**with:**

```tsx
import { useMapStyle } from './hooks/useMapStyle'
import { useFollowsPlane } from './hooks/useFollowsPlane'
import { useQuickLayovers } from './hooks/useQuickLayovers'
```

**In `src/ui/TripMapPage.tsx`, replace (2 of 3):**

```tsx
  const [quickLayovers, rememberQuickLayovers] = useQuickLayovers()
  const waits = useMemo(() => tripWaits(map), [map])
```

**with:**

```tsx
  const [quickLayovers, rememberQuickLayovers] = useQuickLayovers()
  // Whether the map follows the plane: this browser's choice, which the card follows too (follow the plane design §2).
  const [followsPlane, rememberFollowsPlane] = useFollowsPlane()
  const waits = useMemo(() => tripWaits(map), [map])
```

**In `src/ui/TripMapPage.tsx`, replace (3 of 3):**

```tsx
        )}
        <TripTimeline map={map} clock={clock} onChange={setClock} onQuickLayovers={onQuickLayovers} now={frameNow} viewerTz={viewerTz} h24={h24} />
      </section>
```

**with:**

```tsx
        )}
        <TripTimeline map={map} clock={clock} onChange={setClock} onQuickLayovers={onQuickLayovers} followsPlane={followsPlane}
          onFollowsPlane={rememberFollowsPlane} now={frameNow} viewerTz={viewerTz} h24={h24} />
      </section>
```

**In `src/ui/TripTimeline.tsx`, replace (1 of 5):**

```tsx
import type { JSX } from 'preact'
import { useMemo } from 'preact/hooks'
import { timelineLine, timelineSpokenValue } from '../copy/tripMap'
import {
  clockTime, goLive, hasFinished, isLive, isPlaying, pause, play, progressAt, REPLAY_SPEEDS, replayDuration, replayOffset, scrub,
```

**with:**

```tsx
import type { JSX } from 'preact'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { FOLLOW_HINT, followCaption, timelineLine, timelineSpokenValue } from '../copy/tripMap'
import {
  clockTime, goLive, hasFinished, isLive, isPlaying, pause, play, progressAt, REPLAY_SPEEDS, replayDuration, replayOffset, scrub,
```

**In `src/ui/TripTimeline.tsx`, replace (2 of 5):**

```tsx
import { timelineBlocks } from '../map/timelineBlocks'
import { activityAt, flightOnGround } from '../map/tripActivity'
import type { TripMap } from '../map/tripMap'
import { TripTimelineBlocks } from './TripTimelineBlocks'

```

**with:**

```tsx
import { timelineBlocks } from '../map/timelineBlocks'
import { activityAt, flightOnGround } from '../map/tripActivity'
import { isMoving, type TripMap } from '../map/tripMap'
import { TripTimelineBlocks } from './TripTimelineBlocks'

```

**In `src/ui/TripTimeline.tsx`, replace (3 of 5):**

```tsx
  /** Quick layovers switched on or off (activity markers design §3.1). */
  onQuickLayovers: (on: boolean) => void
  now: number
  viewerTz: string
  h24: boolean
}

/** An arrow key moves half a second of replay at 1x: a quarter hour of a flight, and more of a quick layover. */
```

**with:**

```tsx
  /** Quick layovers switched on or off (activity markers design §3.1). */
  onQuickLayovers: (on: boolean) => void
  /** Whether the map follows the plane (follow the plane design §2), this browser's setting. */
  followsPlane: boolean
  /** Follow the plane switched on or off. */
  onFollowsPlane: (on: boolean) => void
  now: number
  viewerTz: string
  h24: boolean
}

/** How long the caption a tap on Follow the plane shows beside it: about 2 seconds, as the app's. */
export const FOLLOW_CAPTION_MS = 2000

/** An arrow key moves half a second of replay at 1x: a quarter hour of a flight, and more of a quick layover. */
```

**In `src/ui/TripTimeline.tsx`, replace (4 of 5):**

```tsx
 * is doing, with when and what under it.
 */
export function TripTimeline({ map, clock, onChange, onQuickLayovers, now, viewerTz, h24 }: TripTimelineProps) {
  const t = clockTime(clock, now)
  const showsPause = isPlaying(clock) && !hasFinished(clock, now)
  const whole = replayDuration(clock)
```

**with:**

```tsx
 * is doing, with when and what under it.
 */
export function TripTimeline({ map, clock, onChange, onQuickLayovers, followsPlane, onFollowsPlane, now, viewerTz, h24 }: TripTimelineProps) {
  const t = clockTime(clock, now)
  // What a tap on Follow the plane did, beside it for a moment, and to screen readers (follow the plane design §2).
  const [caption, setCaption] = useState<{ text: string; tapped: number } | null>(null)
  useEffect(() => {
    if (!caption) return
    const shown = setTimeout(() => setCaption(null), FOLLOW_CAPTION_MS)
    return () => clearTimeout(shown)
  }, [caption])
  const follow = (on: boolean) => {
    onFollowsPlane(on)
    const hasFlightInAir = map.legs.some((l) => l.kind === 'flight' && isMoving(l, t))
    setCaption({ text: followCaption(on, hasFlightInAir), tapped: Date.now() })
  }
  const showsPause = isPlaying(clock) && !hasFinished(clock, now)
  const whole = replayDuration(clock)
```

**In `src/ui/TripTimeline.tsx`, replace (5 of 5):**

```tsx
        </select>
      </div>
    </div>
  )
```

**with:**

```tsx
        </select>
      </div>
      {/* Follow the plane (follow the plane design §2): the website's own place for it, under Quick layovers, with what a
          tap did beside it (Todd, 17 Nov 2026). The caption is a status, so screen readers hear it, outside the label so
          the switch keeps its name. */}
      <div class="trip-timeline-follow">
        <label class="trip-timeline-quick">
          <input type="checkbox" role="switch" class="trip-timeline-switch" checked={followsPlane} aria-describedby="trip-timeline-follow-hint"
            onChange={(e) => follow(e.currentTarget.checked)} />
          Follow the plane
        </label>
        <span class="trip-timeline-caption" role="status">{caption?.text ?? ''}</span>
        <span id="trip-timeline-follow-hint" class="sr-only">{FOLLOW_HINT}</span>
      </div>
    </div>
  )
```

**Create `src/ui/hooks/useFollowsPlane.ts`:**

```ts
import { useState } from 'preact/hooks'

/**
 * Where this browser remembers "Follow the plane" (the app's follow the plane design §2), the same for every trip, as
 * Quick layovers is: the card and the full map both follow it.
 */
const KEY = 'crewluve.tripMap.followsPlane'

/** Off, unless this browser turned it on. Storage that can't be read, as in a private window, reads as off. */
function readFollowsPlane(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on'
  } catch {
    return false
  }
}

/** Follow the plane, and a way to change it that this browser remembers. */
export function useFollowsPlane(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(readFollowsPlane)
  const remember = (value: boolean) => {
    setOn(value)
    try {
      localStorage.setItem(KEY, value ? 'on' : 'off')
    } catch {
      // Storage that can't be written: the choice lasts until the page closes.
    }
  }
  return [on, remember]
}
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 6 tests pass. Then `npx tsc --noEmit`: nothing; `npm test`: 182 test files and 3,880 tests pass, and the same with `TZ=UTC npm test`, as GitHub's build runs; and `npm run build` ends `✓ built`. Last, the shared cases:

```bash
git diff --name-only e9d8466 -- tests/fixtures/trip-map
```

Expected: nothing. The shared cases are the app's, and no step changes them.

- [x] **Step 5: The checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && TZ=UTC npm test && npm run build
```

Expected: 182 test files and 3,880 tests pass, twice (in this Mac's time zone, then in UTC as GitHub's build runs), and the build ends `✓ built`.

- [x] **Step 6: Commit, on Todd's yes.** Only these files, by path:

```bash
git add src/copy/tripMap.ts src/styles/tripMap.css src/ui/TripMapPage.tsx src/ui/TripTimeline.tsx src/ui/hooks/useFollowsPlane.ts tests/ui/followSwitch.test.tsx
git commit -m "The Follow the plane switch under the full map's timeline, off at first and remembered, saying beside it what a tap did (follow the plane design §2, Todd, 17 Nov 2026)"
```

---

### Task 4: Both maps follow the plane, and glide, between legs too (design §3 to §5)

Apple's map (`src/ui/AppleTripMap.tsx`): while the setting is on, the framing stands aside and the glide makes every move, between legs too: on each display frame, MapKit is asked for the next step toward `followView` of `followingFrame`, without its own animation, and MapKit moves its lines, night and marks with the view. One loop glides at a time, from the view it last asked for, and MapKit is asked nothing while the frame is the same; once there, MapKit's view is checked once, as after a framing. The first view, a gap too small to see and reduced motion go straight there; a pan stops it until Recenter, which glides on from where the map is; and starting or stopping frames again. The SVG map (`src/ui/TripMapSvg.tsx`, `useGlide`) glides the same way, drawing each frame. The full map passes its switch on (`src/ui/TripMapPage.tsx`), and the card follows the same setting (`src/ui/TripMapCard.tsx`).

**Files:**
- Modify: `src/ui/AppleTripMap.tsx`, `src/ui/TripMapCard.tsx`, `src/ui/TripMapPage.tsx`, `src/ui/TripMapSvg.tsx`
- Create: `tests/ui/followThePlane.test.tsx`

- [x] **Step 1: Write the tests.**

**Create `tests/ui/followThePlane.test.tsx`:**

```tsx
// @vitest-environment happy-dom
import { act, cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appleCamera, cameraFor, followView, wholeView } from '../../src/map/appleMapPlan'
import { fitRect, NO_INSETS, type WorldRect } from '../../src/map/mapFit'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { framingPoints, makeTripMap } from '../../src/map/tripMap'
import { keptInView, tripMapDrawing } from '../../src/map/tripMapDrawing'
import { legPlane } from '../../src/facts/planePosition'
import { followRect } from '../../src/map/tripMapFollow'
import { placeAt } from '../../src/map/svgPaths'
import { AppleTripMap } from '../../src/ui/AppleTripMap'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { TripMapCard } from '../../src/ui/TripMapCard'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { TripMapSvg } from '../../src/ui/TripMapSvg'
import { equatorFlight, flightMap } from '../facts/factsTestData'
import { date } from '../facts/liveFacts'
import { fakeMapKit } from '../fixtures/fakeMapKit'
import { AIRPORTS, at as europeAt, EUROPE } from '../map/tripMapLegs'

/**
 * Following the plane on the website (the app's follow the plane design §2 to §4): the glide on Apple's map and the SVG
 * map, and the card, which follows the full map's switch (tests/ui/followSwitch.test.tsx). The flight is the equator
 * flight from E0 to E20, its plan in the air from 10:15 to 13:15 UTC.
 */
const at = (time: string) => date(`2026-03-20T${time}:00Z`)
const leg = equatorFlight(0, 20)
const map = flightMap(leg, null)
const WIDTH = 390
const HEIGHT = 520
const props = { map, t: at('11:45'), width: WIDTH, height: HEIGHT, focus: leg, land: null, nightStep: 60_000, mapStyle: 'hybrid' as const, interactive: true }

/** The whole view that follows the plane at `t`, as MapKit is asked for it. */
const followed = (t: number) => cameraFor(followView(followRect(leg, t, false)!, keptInView(tripMapDrawing(map, t)), WIDTH, HEIGHT, NO_INSETS), WIDTH, HEIGHT, NO_INSETS)

/** Display frames, run by the test: each callback waits until `frame` runs it, `ms` after the last. */
function stubFrames() {
  const waiting = new Map<number, FrameRequestCallback>()
  let id = 0
  let requested = 0
  let now = 0
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    waiting.set(++id, callback)
    requested += 1
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (which: number) => void waiting.delete(which))
  return {
    get waiting() {
      return waiting.size
    },
    /** How many display frames have been asked for in all. */
    get requested() {
      return requested
    },
    frame(ms = 1000 / 60) {
      now += ms
      const due = [...waiting.values()]
      waiting.clear()
      for (const callback of due) callback(now)
    },
  }
}

/** Reduced motion asked for, or not: other queries go to the real `matchMedia`. */
function stubStill(still: boolean) {
  const real = globalThis.matchMedia
  vi.stubGlobal('matchMedia', (query: string) =>
    query.includes('prefers-reduced-motion') ? { matches: still, addEventListener() {}, removeEventListener() {} } : real.call(globalThis, query))
}

async function ready() {
  const kit = fakeMapKit()
  startAppleMapKit(async () => kit as unknown as MapKitApi)
  return kit
}

const sameRect = (a: WorldRect, b: WorldRect) => [a.x, a.y, a.width, a.height].every((v, i) => Math.abs(v - [b.x, b.y, b.width, b.height][i]) < 1e-12)

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  resetAppleMapKit()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('following the plane on Apple’s map (follow the plane design §3, §4)', () => {
  it('frames the plane, its tail and the way ahead at once when the map opens, with no animation', async () => {
    const kit = await ready()
    render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    expect(kit.maps[0].rects).toHaveLength(1)
    expect(kit.maps[0].rects[0].animated).toBe(false)
    expect(sameRect(kit.maps[0].rects[0].rect, followed(at('11:45')).rect)).toBe(true)
  })

  it('frames the whole flight, as before, with the setting off, and before the plane has left', async () => {
    const kit = await ready()
    render(<AppleTripMap {...props} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    expect(kit.maps[0].rects[0].rect).toMatchObject(appleCamera(framingPoints(map, leg), [], WIDTH, HEIGHT, NO_INSETS).rect)
    cleanup()
    resetAppleMapKit()
    const later = await ready()
    render(<AppleTripMap {...props} t={at('10:10')} followsPlane />)
    await waitFor(() => expect(later.maps).toHaveLength(1))
    expect(later.maps[0].rects[0].rect).toMatchObject(appleCamera(framingPoints(map, leg), [], WIDTH, HEIGHT, NO_INSETS).rect)
  })

  it('glides to a new frame a step a display frame, without MapKit’s animation, and arrives exactly', async () => {
    const kit = await ready()
    const frames = stubFrames()
    const view = render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    // An hour on in a replay: the frame is smaller and further east.
    view.rerender(<AppleTripMap {...props} t={at('12:45')} followsPlane />)
    expect(frames.waiting).toBe(1)
    frames.frame()
    const target = followed(at('12:45')).rect
    const first = m.rects.at(-1)!
    expect(first.animated).toBe(false)
    expect(first.rect.width).toBeLessThan(m.rects[0].rect.width)
    expect(first.rect.width).toBeGreaterThan(target.width)
    for (let i = 0; i < 300 && frames.waiting > 0; i++) frames.frame()
    expect(frames.waiting).toBe(0)
    expect(sameRect(m.rects.at(-1)!.rect, target)).toBe(true)
    expect(m.rects.every((r) => !r.animated)).toBe(true)
  })

  it('goes straight to the new frame with reduced motion', async () => {
    stubStill(true)
    const kit = await ready()
    const frames = stubFrames()
    const view = render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    view.rerender(<AppleTripMap {...props} t={at('12:45')} followsPlane />)
    expect(frames.waiting).toBe(0)
    expect(sameRect(kit.maps[0].rects.at(-1)!.rect, followed(at('12:45')).rect)).toBe(true)
  })

  it('asks MapKit nothing more while the frame is the same', async () => {
    const kit = await ready()
    const view = render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    view.rerender(<AppleTripMap {...props} followsPlane />)
    view.rerender(<AppleTripMap {...props} followsPlane />)
    expect(kit.maps[0].rects).toHaveLength(1)
  })

  it('stops once the person moves the map, and glides again from where it is on Recenter', async () => {
    const kit = await ready()
    const frames = stubFrames()
    const view = render(<AppleTripMap {...props} followsPlane recenter={0} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    m.fire('scroll-start')
    view.rerender(<AppleTripMap {...props} t={at('12:45')} followsPlane recenter={0} />)
    expect(frames.waiting).toBe(0)
    expect(m.rects).toHaveLength(1)
    view.rerender(<AppleTripMap {...props} t={at('12:45')} followsPlane recenter={1} />)
    expect(frames.waiting).toBe(1)
    for (let i = 0; i < 300 && frames.waiting > 0; i++) frames.frame()
    expect(sameRect(m.rects.at(-1)!.rect, followed(at('12:45')).rect)).toBe(true)
  })

  it('follows a frame that moves as it glides, in one loop, to where the frame is then', async () => {
    const kit = await ready()
    const frames = stubFrames()
    const view = render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    view.rerender(<AppleTripMap {...props} t={at('12:15')} followsPlane />)
    let ran = 0
    for (const time of ['12:20', '12:25', '12:30']) {
      frames.frame()
      ran += 1
      view.rerender(<AppleTripMap {...props} t={at(time)} followsPlane />)
    }
    for (; ran < 300 && frames.waiting > 0; ran++) frames.frame()
    expect(frames.requested, 'never started over').toBe(ran)
    expect(sameRect(kit.maps[0].rects.at(-1)!.rect, followed(at('12:30')).rect)).toBe(true)
  })

  it('makes every move between legs too, to the next flight’s route, with no animation of MapKit’s (follow the plane design §5)', async () => {
    const kit = await ready()
    const frames = stubFrames()
    const trip = (now: number) => makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now, airports: AIRPORTS })!
    const europe = { ...props, map: trip(europeAt(4)), t: europeAt(4), focus: trip(europeAt(4)).legs[0] }
    const view = render(<AppleTripMap {...europe} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    // Landed in Cologne, a day before the flight to Dubai.
    const between = trip(europeAt(20))
    view.rerender(<AppleTripMap {...europe} map={between} t={europeAt(20)} focus={null} followsPlane />)
    for (let i = 0; i < 300 && frames.waiting > 0; i++) frames.frame()
    const next = cameraFor(followView(fitRect(framingPoints(between, between.legs[1]))!, keptInView(tripMapDrawing(between, europeAt(20))), WIDTH, HEIGHT, NO_INSETS),
      WIDTH, HEIGHT, NO_INSETS)
    expect(sameRect(kit.maps[0].rects.at(-1)!.rect, next.rect)).toBe(true)
    expect(kit.maps[0].rects.every((r) => !r.animated)).toBe(true)
  })

  it('asks MapKit nothing more while the frame is the same, though MapKit shows a view of its own, as at its zoom limit', async () => {
    const kit = await ready()
    const view = render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    // MapKit settles a little closer in than it was asked, with the plane still in view.
    const asked = m.rects[0].rect
    m.visibleMapRect = new kit.MapRect(asked.x + asked.width * 0.05, asked.y + asked.height * 0.05, asked.width * 0.9, asked.height * 0.9)
    m.fire('region-change-end')
    view.rerender(<AppleTripMap {...props} followsPlane />)
    view.rerender(<AppleTripMap {...props} followsPlane />)
    expect(m.rects).toHaveLength(1)
  })

  it('once there, slides the plane back into view where MapKit shows a view of its own without it', async () => {
    const kit = await ready()
    render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    const asked = m.rects[0].rect
    // MapKit shows a view a whole view's width east, the plane off its left.
    m.visibleMapRect = new kit.MapRect(asked.x + asked.width, asked.y, asked.width, asked.height)
    m.fire('region-change-end')
    expect(m.rects).toHaveLength(2)
    const slid = m.rects[1].rect
    const plane = placeAt(legPlane(leg, at('11:45'), false).place, { rect: slid, width: WIDTH, height: HEIGHT })
    expect(plane.x).toBeGreaterThan(0)
    expect(plane.x).toBeLessThan(WIDTH)
  })

  it('glides from the view on screen when the latest event’s banner comes and the frame keeps clear of it, with no jump', async () => {
    const kit = await ready()
    const frames = stubFrames()
    const view = render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    // "Took off from …": the banner takes 100 px at the top.
    const banner = { top: 100, right: 0, bottom: 0, left: 0 }
    view.rerender(<AppleTripMap {...props} insets={banner} followsPlane />)
    expect(m.rects, 'nothing laid out again at once').toHaveLength(1)
    expect(frames.waiting).toBe(1)
    frames.frame()
    // The first step shows nearly what was on screen, in the new padding.
    const before = wholeView({ rect: m.rects[0].rect, padding: NO_INSETS }, WIDTH, HEIGHT)
    const first = wholeView({ rect: m.rects[1].rect, padding: banner }, WIDTH, HEIGHT)
    expect(Math.abs(first.y - before.y)).toBeLessThan(0.1 * before.height)
    for (let i = 0; i < 300 && frames.waiting > 0; i++) frames.frame()
    const target = cameraFor(followView(followRect(leg, at('11:45'), false)!, keptInView(tripMapDrawing(map, at('11:45'))), WIDTH, HEIGHT, banner), WIDTH, HEIGHT, banner)
    expect(sameRect(m.rects.at(-1)!.rect, target.rect)).toBe(true)
  })

  it('frames the whole flight again, animated, when the setting is turned off', async () => {
    const kit = await ready()
    const view = render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    view.rerender(<AppleTripMap {...props} followsPlane={false} />)
    const last = kit.maps[0].rects.at(-1)!
    expect(last.animated).toBe(true)
    expect(last.rect).toMatchObject(appleCamera(framingPoints(map, leg), [], WIDTH, HEIGHT, NO_INSETS).rect)
  })
})

describe('following the plane on the SVG map (follow the plane design §3, §4)', () => {
  const svgProps = { map, t: at('11:45'), width: WIDTH, height: HEIGHT, focus: leg, land: null, nightStep: 60_000 }
  /** Where the airport with `code` is drawn, across the view. */
  const airportX = (container: Element, code: string) => {
    const group = [...container.querySelectorAll('.trip-map-airport')].find((g) => g.textContent === code)
    return group ? Number(group.querySelector('circle')!.getAttribute('cx')) : null
  }

  it('leaves the start behind and keeps the destination in view, at once when it opens', () => {
    const { container } = render(<TripMapSvg {...svgProps} followsPlane />)
    expect(airportX(container, 'E20')).toBeLessThanOrEqual(WIDTH)
    expect(airportX(container, 'E0')).toBeLessThan(0)
  })

  it('frames the whole flight with the setting off', () => {
    const { container } = render(<TripMapSvg {...svgProps} />)
    expect(airportX(container, 'E0')).toBeGreaterThan(0)
    expect(airportX(container, 'E20')).toBeLessThan(WIDTH)
  })

  it('follows a frame that moves as it glides, in one loop, as a replay plays', () => {
    const frames = stubFrames()
    const view = render(<TripMapSvg {...svgProps} followsPlane />)
    view.rerender(<TripMapSvg {...svgProps} t={at('12:15')} followsPlane />)
    let ran = 0
    for (const time of ['12:20', '12:25', '12:30']) {
      act(() => frames.frame())
      ran += 1
      view.rerender(<TripMapSvg {...svgProps} t={at(time)} followsPlane />)
    }
    for (; ran < 300 && frames.waiting > 0; ran++) act(() => frames.frame())
    expect(frames.requested, 'never started over').toBe(ran)
    const end = render(<TripMapSvg {...svgProps} t={at('12:30')} followsPlane />)
    expect(airportX(view.container, 'E0')).toBe(airportX(end.container, 'E0'))
  })

  it('goes straight to the new frame with reduced motion', () => {
    stubStill(true)
    const frames = stubFrames()
    const view = render(<TripMapSvg {...svgProps} followsPlane />)
    view.rerender(<TripMapSvg {...svgProps} t={at('12:45')} followsPlane />)
    expect(frames.requested).toBe(0)
    const end = render(<TripMapSvg {...svgProps} t={at('12:45')} followsPlane />)
    expect(airportX(view.container, 'E0')).toBe(airportX(end.container, 'E0'))
  })

  it('glides there from the whole flight when it’s turned on', () => {
    const frames = stubFrames()
    const view = render(<TripMapSvg {...svgProps} />)
    // A panel opens over the map's left side first: the glide starts from the frame it shows now, not the one it opened with.
    const panel = { top: 0, right: 0, bottom: 0, left: 150 }
    view.rerender(<TripMapSvg {...svgProps} insets={panel} />)
    const before = airportX(view.container, 'E0')!
    view.rerender(<TripMapSvg {...svgProps} insets={panel} followsPlane />)
    expect(airportX(view.container, 'E0'), 'from where it was').toBe(before)
    // Each frame draws the map again, which the test waits for.
    act(() => frames.frame())
    const step = airportX(view.container, 'E0')!
    expect(step).toBeLessThan(before)
    expect(step).toBeGreaterThan(0)
    for (let i = 0; i < 300 && frames.waiting > 0; i++) act(() => frames.frame())
    // Left behind: under the panel, out of the part of the map it leaves clear.
    expect(airportX(view.container, 'E0')).toBeLessThan(panel.left)
  })
})

describe('the full map follows its switch (follow the plane design §2)', () => {
  it('frames the plane, not the whole flight, once the switch is on', async () => {
    const asked = async () => {
      const kit = await ready()
      render(<TripMapPage map={map} now={at('11:45')} viewerTz="America/New_York" h24={false} day={1} days={1} land={null} onBack={() => {}} />)
      await waitFor(() => expect(kit.maps).toHaveLength(1))
      const width = kit.maps[0].rects.at(-1)!.rect.width
      cleanup()
      resetAppleMapKit()
      return width
    }
    const whole = await asked()
    localStorage.setItem('crewluve.tripMap.followsPlane', 'on')
    expect(await asked()).toBeLessThan(whole * 0.85)
  })
})

describe('the card follows the setting (follow the plane design §2)', () => {
  it('frames the plane, not the whole flight, once the full map’s switch is on', async () => {
    const asked = async () => {
      const kit = await ready()
      const now = europeAt(4)
      render(<TripMapCard map={makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now, airports: AIRPORTS })!} now={now} viewerTz="America/New_York"
        h24={false} name="Alex" day={1} days={4} delayMinutes={null} land={null} onOpenMap={() => {}} onOpenTracking={() => {}} />)
      await waitFor(() => expect(kit.maps).toHaveLength(1))
      const width = kit.maps[0].rects.at(-1)!.rect.width
      cleanup()
      resetAppleMapKit()
      return width
    }
    const whole = await asked()
    localStorage.setItem('crewluve.tripMap.followsPlane', 'on')
    expect(await asked()).toBeLessThan(whole * 0.85)
  })
})
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/ui/followThePlane.test.tsx
```

Expected: 13 of the 19 tests fail, because neither map follows yet. The first view, the glide, a frame that moves as it glides, between legs, the banner's padding, reduced motion on Apple's map, a pan and Recenter, turning it off, the SVG map's frame and glide, the full map and the card. The six that pass already pass as they should, because the camera of before does what they ask: both maps frame the whole flight with the setting off; MapKit is asked nothing more while the view is the same, whatever view MapKit shows; once there, the plane is slid into a view MapKit chose without it, as after any framing; and the SVG map with reduced motion asks for no display frames.

- [x] **Step 3: Write the code.**

**In `src/ui/AppleTripMap.tsx`, replace (1 of 11):**

```tsx
import type { PlaneKind } from '../copy/planePopup'
import { appleCamera, appleMapPlan, isSameView, keepInView, offDateLine, slideIntoView, type AppleCamera, type PlannedMark } from '../map/appleMapPlan'
import type { AppleMapStyle } from '../map/appleMapStyle'
import type { GeoPoint } from '../map/greatCircle'
import { NO_INSETS, type Insets } from '../map/mapFit'
import type { MapKitApi, MkAnnotation, MkMap, MkPolygon, MkPolyline } from '../map/mapkitApi'
```

**with:**

```tsx
import type { PlaneKind } from '../copy/planePopup'
import {
  appleCamera, appleMapPlan, cameraFor, followView, isSameView, keepInView, offDateLine, slideIntoView, wholeView, type AppleCamera, type PlannedMark,
} from '../map/appleMapPlan'
import type { AppleMapStyle } from '../map/appleMapStyle'
import type { GeoPoint } from '../map/greatCircle'
import { NO_INSETS, type Insets, type WorldRect } from '../map/mapFit'
import type { MapKitApi, MkAnnotation, MkMap, MkPolygon, MkPolyline } from '../map/mapkitApi'
```

**In `src/ui/AppleTripMap.tsx`, replace (2 of 11):**

```tsx
import { keptInView, nightTime, tripMapDrawing, type SegmentStyle } from '../map/tripMapDrawing'
import { markElement } from './appleMarks'
import { useAppleMapKit } from './hooks/useAppleMapKit'
import { useSteadyFraming } from './hooks/useSteadyFraming'
```

**with:**

```tsx
import { keptInView, nightTime, tripMapDrawing, type SegmentStyle } from '../map/tripMapDrawing'
import { followingFrame } from '../map/tripMapFollow'
import { glideStep, isThere } from '../map/tripMapGlide'
import { markElement } from './appleMarks'
import { useAppleMapKit } from './hooks/useAppleMapKit'
import { prefersStill } from './hooks/useGlide'
import { useSteadyFraming } from './hooks/useSteadyFraming'
```

**In `src/ui/AppleTripMap.tsx`, replace (3 of 11):**

```tsx
  recenterSeen: number
}
```

**with:**

```tsx
  recenterSeen: number
  /** The display frame the glide toward the frame that follows the plane waits for, or 0 while it isn't gliding. */
  glide: number
  /**
   * The whole view the glide last asked MapKit for, while it follows the plane: the next glide starts from it, and MapKit
   * isn't asked again while the frame is the same. None until it has asked, and again once the person moves the map.
   */
  followed: WorldRect | null
}
```

**In `src/ui/AppleTripMap.tsx`, replace (4 of 11):**

```tsx
  mapkit, map, t, width, height, focus, nightStep, insets = NO_INSETS, mapStyle, interactive, recenter = 0, onUserMove, isReplay = false, planeWords,
}: AppleTripMapProps & { mapkit: MapKitApi }) {
```

**with:**

```tsx
  mapkit, map, t, width, height, focus, nightStep, insets = NO_INSETS, mapStyle, interactive, recenter = 0, onUserMove, isReplay = false, planeWords,
  followsPlane = false,
}: AppleTripMapProps & { mapkit: MapKitApi }) {
```

**In `src/ui/AppleTripMap.tsx`, replace (5 of 11):**

```tsx
  const latest = useRef<Latest>()
  // Bumped when the system turns light or dark, to draw the lines again in the new colours.
```

**with:**

```tsx
  const latest = useRef<Latest>()
  /** The whole view that follows the plane, as of the latest render: the glide heads for it on every display frame. */
  const following = useRef<WorldRect | null>(null)
  // Bumped when the system turns light or dark, to draw the lines again in the new colours.
```

**In `src/ui/AppleTripMap.tsx`, replace (6 of 11):**

```tsx
      map: m, lines: new Map(), night, nightAt: NaN, marks: new Map(), popup: null, framed: '', settling: null, asks: [], view: null,
      justFramed: false, moved: false, recenterSeen: recenter,
    }
```

**with:**

```tsx
      map: m, lines: new Map(), night, nightAt: NaN, marks: new Map(), popup: null, framed: '', settling: null, asks: [], view: null,
      justFramed: false, moved: false, recenterSeen: recenter, glide: 0, followed: null,
    }
```

**In `src/ui/AppleTripMap.tsx`, replace (7 of 11):**

```tsx
      if (state.popup) render(null, state.popup.element)
      m.destroy()
```

**with:**

```tsx
      if (state.popup) render(null, state.popup.element)
      cancelAnimationFrame(state.glide)
      m.destroy()
```

**In `src/ui/AppleTripMap.tsx`, replace (8 of 11):**

```tsx
  const { rect, padding } = appleCamera(framing, [], width, height, insets)
  const frame = `${rect.x},${rect.y},${rect.width},${rect.height}|${padding.top},${padding.right},${padding.bottom},${padding.left}|${recenter}`
  const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  useEffect(() => {
```

**with:**

```tsx
  const { rect, padding } = appleCamera(framing, [], width, height, insets)
  // Following the plane, the view the setting gives the camera, in the air and between legs (follow the plane design §3
  // to §5): the glide below makes every move to it, and the framing stands aside. Starting or stopping frames again.
  const follow = followsPlane ? followingFrame(map, t, isReplay) : null
  following.current = follow ? followView(follow, kept, width, height, insets) : null
  const frame = `${rect.x},${rect.y},${rect.width},${rect.height}|${padding.top},${padding.right},${padding.bottom},${padding.left}|${recenter}|${follow ? 'follow' : ''}`
  const still = prefersStill
  useEffect(() => {
```

**In `src/ui/AppleTripMap.tsx`, replace (9 of 11):**

```tsx
    if (state.moved || state.framed === frame) return
    const animated = state.framed !== '' && !still()
```

**with:**

```tsx
    if (state.moved || state.framed === frame) return
    if (following.current) {
      state.framed = frame
      state.settling = null
      return
    }
    const animated = state.framed !== '' && !still()
```

**In `src/ui/AppleTripMap.tsx`, replace (10 of 11):**

```tsx
    }
    if (state.moved || !state.view) return
    const slide = keepInView(state.view, kept, width, height, insets)
```

**with:**

```tsx
    }
    // Following, the plane is in its frame already: the glide keeps it there.
    if (state.moved || !state.view || following.current) return
    const slide = keepInView(state.view, kept, width, height, insets)
```

**In `src/ui/AppleTripMap.tsx`, replace (11 of 11):**

```tsx

  // The card's map is a picture inside the card's button: it's kept from screen readers and out of the Tab order, so
```

**with:**

```tsx

  // Following the plane (follow the plane design §4, §5): on every display frame the view closes part of the gap to the
  // frame, until it's there; MapKit is asked for each step without its own animation, and moves its lines, night and
  // marks with it. One loop glides at a time, reading the newest frame on every step, and from the view it last asked
  // for, not the one MapKit reports, which can differ where MapKit won't zoom out so far: so MapKit is asked nothing while
  // the frame is the same. Once there, MapKit's view is checked once for what's kept in view, as after a framing. Its
  // first framing, a gap too small to see and reduced motion go straight there. A pan or a pinch stops it until
  // Recenter, which glides on from where the map is.
  useEffect(() => {
    const state = live.current
    if (!state) return
    const target = following.current
    if (!target || state.moved) {
      cancelAnimationFrame(state.glide)
      state.glide = 0
      state.followed = null
      return
    }
    if (state.glide) return
    const followed = state.followed
    if (followed && (['x', 'y', 'width', 'height'] as const).every((k) => followed[k] === target[k])) return
    const m = state.map
    const from = followed ?? (m.visibleMapRect && m.padding
      ? wholeView({ rect: { x: m.visibleMapRect.origin.x, y: m.visibleMapRect.origin.y, width: m.visibleMapRect.size.width, height: m.visibleMapRect.size.height },
        padding: { top: m.padding.top, right: m.padding.right, bottom: m.padding.bottom, left: m.padding.left } }, width, height)
      : null)
    const show = (view: WorldRect) => {
      const at = latest.current!
      ask(mapkit, state, cameraFor(view, at.width, at.height, at.insets), false, true)
      state.followed = view
    }
    // Nothing asked of MapKit yet: its own first view is no place to glide from.
    if (!from || state.asks.length === 0 || still() || isThere(from, target)) {
      show(target)
      state.settling = { animated: false }
      return
    }
    // No check slides the view while it glides: the glide makes every move.
    state.settling = null
    let current = from
    let last = performance.now()
    const step = (now: number) => {
      const heading = following.current
      if (!heading || state.moved) {
        state.glide = 0
        return
      }
      current = glideStep(current, heading, now - last)
      last = now
      show(current)
      if (current !== heading) {
        state.glide = requestAnimationFrame(step)
        return
      }
      state.glide = 0
      state.settling = { animated: false }
    }
    state.glide = requestAnimationFrame(step)
  })

  // The card's map is a picture inside the card's button: it's kept from screen readers and out of the Tab order, so
```

**In `src/ui/TripMapCard.tsx`, replace (1 of 3):**

```tsx
import { AppleTripMap } from './AppleTripMap'
import { useHeightOf } from './hooks/useHeightOf'
```

**with:**

```tsx
import { AppleTripMap } from './AppleTripMap'
import { useFollowsPlane } from './hooks/useFollowsPlane'
import { useHeightOf } from './hooks/useHeightOf'
```

**In `src/ui/TripMapCard.tsx`, replace (2 of 3):**

```tsx
  const [mapStyle] = useMapStyle()
  const leg = currentLeg(p.map)
```

**with:**

```tsx
  const [mapStyle] = useMapStyle()
  // The card follows the plane as the full map's switch says (follow the plane design §2).
  const [followsPlane] = useFollowsPlane()
  const leg = currentLeg(p.map)
```

**In `src/ui/TripMapCard.tsx`, replace (3 of 3):**

```tsx
          <AppleTripMap map={p.map} t={p.now} width={width} height={MAP_HEIGHT} focus={leg} land={p.land} nightStep={60_000} insets={insets}
            mapStyle={mapStyle} interactive={false} />
        </span>
```

**with:**

```tsx
          <AppleTripMap map={p.map} t={p.now} width={width} height={MAP_HEIGHT} focus={leg} land={p.land} nightStep={60_000} insets={insets}
            mapStyle={mapStyle} interactive={false} followsPlane={followsPlane} />
        </span>
```

**In `src/ui/TripMapPage.tsx`, replace:**

```tsx
        <AppleTripMap map={map} t={t} width={width} height={height} focus={focus} land={land} nightStep={nightStep} insets={insets}
          mapStyle={mapStyle} interactive recenter={recenter} onUserMove={() => setMoved(true)} isReplay={isReplay}
          planeWords={(leg, plane) => planePopupWords(leg, plane, t, isReplay, viewerTz, h24)} />
```

**with:**

```tsx
        <AppleTripMap map={map} t={t} width={width} height={height} focus={focus} land={land} nightStep={nightStep} insets={insets}
          mapStyle={mapStyle} interactive recenter={recenter} onUserMove={() => setMoved(true)} isReplay={isReplay} followsPlane={followsPlane}
          planeWords={(leg, plane) => planePopupWords(leg, plane, t, isReplay, viewerTz, h24)} />
```

**In `src/ui/TripMapSvg.tsx`, replace (1 of 4):**

```tsx
import { framingPoints, framingSubject, type MapLeg, type TripMap } from '../map/tripMap'
import { keptInView, nightTime, PILOT_RADIUS, routePoints, tripMapDrawing, type PlaneMark } from '../map/tripMapDrawing'
import { useSteadyFraming } from './hooks/useSteadyFraming'
```

**with:**

```tsx
import { framingPoints, framingSubject, type MapLeg, type TripMap } from '../map/tripMap'
import { followingFrame } from '../map/tripMapFollow'
import { keptInView, nightTime, PILOT_RADIUS, routePoints, tripMapDrawing, type PlaneMark } from '../map/tripMapDrawing'
import { useGlide } from './hooks/useGlide'
import { useSteadyFraming } from './hooks/useSteadyFraming'
```

**In `src/ui/TripMapSvg.tsx`, replace (2 of 4):**

```tsx
  planeWords?: (leg: MapLeg, plane: PlaneKind) => PopupWords
}
```

**with:**

```tsx
  planeWords?: (leg: MapLeg, plane: PlaneKind) => PopupWords
  /**
   * The map follows the plane (follow the plane design §3): while a flight between its gates has a plane that has left,
   * the view frames the plane, a tail behind it and the way ahead, and glides there (§4). Else it frames as before.
   */
  followsPlane?: boolean
}
```

**In `src/ui/TripMapSvg.tsx`, replace (3 of 4):**

```tsx
 */
export function TripMapSvg({ map, t, width, height, focus, land, nightStep, insets = NO_INSETS, isReplay = false, planeWords }: TripMapSvgProps) {
  const { top, right, bottom, left } = insets
  const framing = useSteadyFraming(framingPoints(map, focus), framingSubject(map, focus))
  const framed = useMemo(
    () => fitClear(fitRect(framing) ?? { x: 0, y: 0, width: 1, height: 1 }, width, height, { top, right, bottom, left }),
```

**with:**

```tsx
 */
export function TripMapSvg({
  map, t, width, height, focus, land, nightStep, insets = NO_INSETS, isReplay = false, planeWords, followsPlane = false,
}: TripMapSvgProps) {
  const { top, right, bottom, left } = insets
  const framing = useSteadyFraming(framingPoints(map, focus), framingSubject(map, focus))
  const whole = useMemo(
    () => fitClear(fitRect(framing) ?? { x: 0, y: 0, width: 1, height: 1 }, width, height, { top, right, bottom, left }),
```

**In `src/ui/TripMapSvg.tsx`, replace (4 of 4):**

```tsx
  )
  const drawing = tripMapDrawing(map, t, isReplay)
```

**with:**

```tsx
  )
  // Following the plane, the view glides to the frame the setting gives it, the plane, its tail and the way ahead in the
  // air, and between legs too (follow the plane design §3 to §5); else it's the leg's or the trip's, as before.
  const follow = followsPlane ? followingFrame(map, t, isReplay) : null
  const framed = useGlide(follow ? fitClear(follow, width, height, { top, right, bottom, left }) : whole, follow != null)
  const drawing = tripMapDrawing(map, t, isReplay)
```

**Create `src/ui/hooks/useGlide.ts`:**

```ts
import { useEffect, useRef, useState } from 'preact/hooks'
import type { WorldRect } from '../../map/mapFit'
import { glideStep, isThere } from '../../map/tripMapGlide'

/** Whether the person asked for less motion: the map then goes straight to its frame (follow the plane design §4). */
export const prefersStill = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The view the SVG map shows while it follows the plane (follow the plane design §4): `target` while `gliding` is off,
 * and else the view gliding toward it, a step on every display frame, from wherever the map was. One loop glides at a
 * time and reads the newest `target` on every step, so a frame that moves as a replay plays is followed, not started
 * over. The first view, a gap too small to see, and every view with reduced motion, are `target` at once.
 */
export function useGlide(target: WorldRect, gliding: boolean): WorldRect {
  const [, redraw] = useState(0)
  const shown = useRef(target)
  const latest = useRef(target)
  const frame = useRef(0)
  latest.current = target
  if (!gliding || prefersStill() || isThere(shown.current, target)) shown.current = target
  useEffect(() => {
    if (!gliding) {
      cancelAnimationFrame(frame.current)
      frame.current = 0
      return
    }
    if (frame.current || shown.current === latest.current) return
    let last = performance.now()
    const step = (now: number) => {
      shown.current = glideStep(shown.current, latest.current, now - last)
      last = now
      redraw((n) => n + 1)
      frame.current = shown.current === latest.current ? 0 : requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  })
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  return shown.current
}
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 19 tests pass. Then `npx tsc --noEmit`: nothing; `npm test`: 183 test files and 3,900 tests pass, and the same with `TZ=UTC npm test`, as GitHub's build runs; and `npm run build` ends `✓ built`. Last, the shared cases:

```bash
git diff --name-only e9d8466 -- tests/fixtures/trip-map
```

Expected: nothing. The shared cases are the app's, and no step changes them.

- [x] **Step 5: The checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && TZ=UTC npm test && npm run build
```

Expected: 183 test files and 3,900 tests pass, twice (in this Mac's time zone, then in UTC as GitHub's build runs), and the build ends `✓ built`.

- [x] **Step 6: Commit, on Todd's yes.** Only these files, by path:

```bash
git add src/ui/AppleTripMap.tsx src/ui/TripMapCard.tsx src/ui/TripMapPage.tsx src/ui/TripMapSvg.tsx src/ui/hooks/useGlide.ts tests/ui/followThePlane.test.tsx
git commit -m "Both maps follow the plane when the switch is on, gliding a step a display frame, between legs too, on the full map and the card (follow the plane design §3 to §5, Todd, 17 Nov 2026)"
```

---

### Task 5: Todd looks at it

The tests check the frame and the glide. This is the look at them.

- [x] **Step 1: Start the site with Apple's map.**
  - The worktree has the MapKit token in `.env.local`. The file is git-ignored, and the token lasts to 22 Nov 2026. If the site's own map shows instead of Apple's, the token has run out, and Todd makes another as the README says.
  - The session starts the `crewluve-mapkit` server (`.claude/launch.json`, port 5182) with its preview tool.
  - It gives Todd these addresses:
    - `http://localhost:5182/?demo=1&scene=live-ahead#map`
    - `…scene=live-ocean-gap#map`, and the same without `#map` for the card.
- [x] **Step 2: Todd looks, on a phone and a computer.**
  - The switch under Quick layovers is off at first. A tap says beside it, for about 2 seconds, "Following the plane" or "Showing the whole flight".
  - On, the map frames the plane, its tail and the way ahead, and the destination stays in view.
  - A replay at 10× follows the plane smoothly, with no steps, and between flights eases out to the next flight's route, with no zooming out to the whole trip and back.
  - A pan stops it; Recenter glides back.
  - Off, the whole flight again.
  - The card follows too, with the plane between the banner and the bottom chip.
  - After a reload, the switch is still on.
- [x] **Step 3: Write down what was wrong.** Anything that needs a change:
  - goes in "Changes made during execution";
  - is fixed in Tasks 2 to 4's files, with a test where a test can see it;
  - and has Todd run the tests again.

---

### Task 6: The review, and the record

- [x] **Step 1: The review.**
  - Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Tasks 2 to 4's commits (from `e9d8466`).
  - It reviews them against:
    - the app's design and plans (`git -C ~/Dev/Crewluv show 92de48a:…`);
    - the app's `TripMapFollow.swift` and `TripMapGlide.swift`;
    - this plan's list of where it settles details.
  - Make its fixes, tests first.
  - Run `npm test`, `TZ=UTC npm test` and `npm run build`.
  - Record what it found.
- [x] **Step 2: Todd runs everything once more,** if the review changed anything. That's Task 4 Step 5's command. The fix is committed on his yes, its own files by path.
- [x] **Step 3: This plan's record.** Under "Changes made during execution":
  - the review;
  - each of Todd's runs, with the count and the time;
  - what Task 5 turned up;
  - each commit's hash.
- [x] **Step 4: Commit, on Todd's yes.**

```bash
git add docs/superpowers/plans/2026-11-17-website-follow-the-plane.md
git commit -m "The website's follow the plane plan, with its record"
```

---

### Task 7: Going live, on Todd's yes

This plan goes live. Pushing to `main` publishes the site: `.github/workflows` tests and builds every push to `main` in UTC, then publishes it to Pages. **Nothing here runs without Todd's yes in the conversation, asked when this task is reached.**

- [ ] **Step 1: Ask Todd** whether to go live now. If not, stop: the branch stays as it is, and this task waits.
- [ ] **Step 2: Bring the branch up to `main`.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git fetch origin && git merge-base --is-ancestor origin/main HEAD && echo "fast-forward"
```

Expected: `fast-forward`.

If it isn't, `main` has moved on from `e9d8466`, where it was when this plan was written:
1. Merge it in here: `git merge origin/main`.
2. If any file conflicts, STOP and tell Todd.
3. Then run `npm test && npm run build`.

- [ ] **Step 3: The suite as GitHub runs it,** in UTC, on the branch as it will go live:

```bash
TZ=UTC npx vitest run
```

Expected: every test file and test passes, the same counts as `npm test`. If any fails, STOP: fix it here, tests first, before anything is pushed.

- [ ] **Step 4: Todd runs everything** on the branch as it will go live. That's Task 4 Step 5's command.
- [ ] **Step 5: Push the branch to `main`, on Todd's yes.** A fast-forward only; never force.

```bash
git push origin claude/trip-map-live-598046:main
```

- [ ] **Step 6: Watch the deploy** (`gh run watch` on the run the push started) until it succeeds. If it fails, tell Todd at once with its log: the site stays as it was until a deploy succeeds.
- [ ] **Step 7: Look at the live site** with Todd: `https://crewluve.crewlu.net/?demo=1&scene=live-ocean-gap#map` with the switch on, then off, and the card.
- [ ] **Step 8: The record.** Under "Changes made during execution":
  - the push's commit;
  - the deploy's run and time;
  - what Todd saw.

  Then commit the plan on his yes, and push it (a fast-forward only), as Step 5.

---

## What the website shares with the app

The same frame and glide (the design's §3 and §4), as the website has them:

- **The frame,** while a flight is between its gates and its plane has left:
  - the plane where the map draws it;
  - a tail of 10% of the path's whole length behind it;
  - everything ahead to the destination;
  - the whole-flight framing's 20% margins;
  - at least 300 miles across.
- **Otherwise** the framing is today's: before the plane has left, on the ground, on a drive, before a trip, in a recap, and with the setting off.
- **The glide:**
  - each display frame closes 1 − e^(−dt ÷ 350 ms) of the gap, the middle in a line and the zoom by its log;
  - it crosses the date line the short way;
  - it arrives exactly within a thousandth;
  - it goes straight there when the gap is that small, at the first framing, and with reduced motion.
- **A pan** stops it until Recenter, which glides on from where the map is.
- **Between legs,** while the setting is on, the glide makes every move: the whole flight before the plane has left, the next flight's route between two flights, and otherwise the leg in motion or the whole trip.
- **The setting:** one, off at first, remembered, followed by both the full map and the card. A tap says what it did, in the app's words, and screen readers hear them, with the app's hint.
- **The website's own:**
  - the switch's place, under Quick layovers, and the caption's, beside it (Todd's choices);
  - the card's band, kept by the same slide its framing has;
  - the SVG map's glide.

## Changes made during execution

- **Tasks 1 to 4** were run in session `68f03a67` on 17 Nov 2026, from this plan's own text: tests first, every file the same as tested. Each Step 2 failed as written: Task 2's three test files and Task 3's one couldn't load, and 13 of Task 4's 19 tests failed.
- **Todd's runs** (`npm test && TZ=UTC npm test && npm run build`, in his Terminal) all passed, and each task was committed on his "Run each, commit each":
  - **Task 2:** 3,873 tests (8:32 PM EST and in UTC). Commit `858ba03`.
  - **Task 3:** 3,880 tests (8:34 PM EST and in UTC). Commit `ed774de`.
  - **Task 4:** 3,900 tests (8:36 PM EST and in UTC). Commit `2798380`.
- **Task 5, Todd's look:** "Looks good", in `live-ocean-gap` and `live-ahead`, on the full map and the card. The look covered the switch and its caption, a replay at 10× across the legs, a pan and Recenter, and a reload.
- **Task 6, the review** (`superpowers:code-reviewer`, sonnet) of `e9d8466..2798380`:
  - It found the first review's A to D fixed, and no Critical issue.
  - **One Important:** where MapKit can't zoom out to the follow frame, as on the card with a long flight, its recovery slide and the next glide would undo each other on every tick. The plane would jump out of view and back.
    - Fixed tests first: once MapKit shows a view of its own after a glide, the slide that keeps the plane in view follows it, as the card does today (`state.clamped`). The glide comes back once the frame is narrower than what MapKit showed.
    - A test shows MapKit settling on half the width asked for: one slide, no glide back a minute on, and the glide again near the end.
  - **Minor, taken:**
    - `worldPerMeterAt` is measured no nearer a pole than the map draws, with a test.
    - The caption's unused `tapped` field is gone.
  - **Minor, left:**
    - MapKit's padding is set on every glide step. That costs some work, not a visible change.
    - A first display frame can come a hair before the glide's start time. `glideStep` treats it as no time.
    - The SVG map redraws whole each glide frame.
    - Two tabs don't share the setting until a reload, as Quick layovers.
  - **Todd's run of the fix** passed 3,902 tests at 9:09 PM EST and again in UTC, and built. Commit `2753b02`, on his "Run it, then commit".
- **The app session's last note** (the banner at takeoff, its padding eased in with the glide, and a glide from the frame last asked for) needs no change here. The website's glide already starts from the whole view it last asked for. A change of padding asks for that same whole view, so nothing on screen moves until the glide eases it, which "glides from the view on screen when the latest event's banner comes" holds.

## Self-review

- **The design covered:**
  - §2's setting: off at first, remembered, the card following it, switched in the website's own place, with the caption and the hint (Task 3).
  - §3's frame, with its tail, the way ahead, the margins and the 300 miles, and when it stands aside (Task 2).
  - §4's glide, with reduced motion, a pan and Recenter, and turning it on or off (Tasks 2 and 4).
  - §5's camera between legs, and standing aside with the setting off (Tasks 2 and 4).
  - §6's tests: the app's frame and glide tests, ported (Task 2), and the website's own, of the switch, both maps, the full map and the card (Tasks 3 and 4).
- **Not covered here, on purpose:** §7's two, as the app leaves them, and the app's own button and previews.
- **Placeholders:** none. Every step's code is the tested file or a replacement made from it.
- **What could it break?**
  - Nothing while the setting is off, which it is at first: every framing is as before, and a test holds each map to its old framing then.
  - On:
    - Apple's map is asked for a view each display frame while gliding, and each change of the frame live (once a second on the full map, every 10 seconds on the card).
    - The SVG map draws each frame while gliding.
    - Both stop once the frame is reached.

## Left for later

- **The design's §7,** as the app leaves it:
  - following a drive;
  - a frame that leads the plane on a flight that turns back on itself.
- **The landed plan's "Left for later"** holds, with plans 3C-1 to 3C-4's.
