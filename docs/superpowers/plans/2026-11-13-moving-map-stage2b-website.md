# Moving Map Stage 2B (Crewluve Website) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the website's trip map the facts the app gets in Stage 2A:
- what's below the plane, and when it crosses somewhere new;
- the sun and moon from the cockpit;
- distance and what it's like;
- weather on landing;
- the trip so far, a forecast of a trip ahead, and a recap card for a day after a trip.

They show on the card's chip in flight, in a side panel on the full map at 900 px or wider, and in a bottom panel with "More facts" below that.

**Architecture:**
- **The app's facts engine, ported to TypeScript** in `src/facts/`:
  - `geography`, `legStory`, `milestone`, `sky`, `moonPosition`, `tripTotals`, `comparisons`;
  - `tripFacts` and `tripFactsRows`, which answer every question at any moment.
  - The words go in `src/copy/facts.ts` and `src/copy/factsTrip.ts`, as Stage 1B's went in `src/copy/tripMap.ts`.
  - The app's shared cases (`facts-cases.json`) hold both to the same answers.
- **The data:**
  - copies of the app's `geography.json` and `comparisons.json` in `public/data/`, fetched from the site itself only when needed;
  - landing weather from Open-Meteo's hourly forecast, which the CSP already allows.
- **The views:**
  - the full map's panel becomes the facts' panel: a side panel over the map at 900 px or wider, and a bottom panel below the map under that;
  - the camera's fit keeps the trip clear of the side panel;
  - the card gets the headline chip in flight, and a recap card.
- **Security:** no new address and no third-party code, so the Content-Security-Policy in `vite.config.ts` doesn't change.

**Tech Stack:** Preact 10, TypeScript 5.9, Vite 5, Vitest 3 with `@testing-library/preact` and happy-dom.

**Spec:** `/Users/toddanderson/Dev/Crewluv/docs/superpowers/specs/2026-11-13-crewluve-moving-map-stage2-facts-design.md` ("the Stage 2 spec"), especially §10 (the website) and §12 (the shared cases and testing). It refines the moving map spec, `2026-11-13-crewluve-moving-map-design.md` in the same folder.

**The app's half:** Stage 2A, on Crewluv's `feature/trip-map-facts` branch (draft PR skimmer747/Crewluv#5). Its plan is `docs/superpowers/plans/2026-11-13-moving-map-stage2a-app.md` on that branch. The TypeScript in this plan's port tasks is drafted from that plan's Swift. The Swift 2A commits after its reviews is the reference (ground rule 6).

**Where this plan settles details the spec left open:**
- **The sun:** the facts use the site's own NOAA sun (`sunAltitude`, `subsolarPoint` in `src/time/sun.ts`), not a port of the app's `SolarPosition`.
  - Checked before writing: both meet every sun case in the 2A plan's `facts-cases.json` within 4 seconds, where the cases allow 60.
  - With the NOAA sun, the layover row's "sunrise at 7:45 AM there" agrees with the location card's sunrise.
- **The weather's words:**
  - Open-Meteo's weather code becomes the site's condition words (Apple's, in `src/copy/weather.ts`), in lower case: "48°F and rain on landing";
  - the temperature is `temperatureText` with the unit's letter;
  - a failed request gives no line and isn't logged, like the site's current weather.
- **Icons:** the Phosphor counterparts of the app's SF Symbols:
  - below and where they are: `MapPin`;
  - sky: `SunHorizon`, else `Sun` or `Moon`;
  - distance: `Path`;
  - headed: `AirplaneLanding`;
  - next flight and leaves: `AirplaneTakeoff`;
  - trip ahead and the trip: `GlobeHemisphereWest`;
  - on the way and trip so far: `ChartBar`;
  - longest flight: `ArrowsHorizontal`.

  `Path` and `ChartBar` are new (Task 2).
- **Which windows get the side panel:** 900 px or wider, or a phone on its side (landscape and at most 500 px tall). That's Stage 1B's query, and the Stage 2 spec's "iPhone in landscape" (§2).
- **The two panels:**
  - the bottom panel stays under the map, as in Stage 1B, so opening it shrinks the map and the camera refits to what's left;
  - the side panel lies over the map, and the camera keeps the trip clear of it (Task 3). Open, it leaves the panel's width clear; collapsed to its headline and timeline, its height.
- **The recap's trip** is chosen by the site's engine, as `upcomingTrip` and `tripProgress` are: a new `recap` on the snapshot (Task 16).
  - Its days are CrewLu's trip days (`tripDays`).
  - The trip map carries `days` for every mode: the recap's, the upcoming trip's or the trip under way's. Without them, it counts the calendar days its span covers.
- **Loading:**
  - `geography.json` loads while a flight is in the air or the full map is open; `comparisons.json` and landing weather only while it's open (spec §7.2, §10).
  - A failed `geography.json` load gives an empty geography, as `useLand` gives empty land: the facts go on without places (spec §11).
- **Stories and sun events:**
  - they're worked out on the main thread and cached by route and by leg times, where the app has `LegStoryStore`;
  - a long flight's story takes a few milliseconds, once.
- **The card's spoken summary in flight** takes the app's Stage 2 sentence, "UPS2961 to Rockford, over Indiana. Lands at 7:30 AM your time. Estimated from the schedule.", in place of Stage 1B's "…, landing at …". The card adds "Opens the full map.", or "Opens the map to replay the trip." on the recap.
- **The recap card's numbers** sit in a bar under the card's map, where Stage 1B's bars sit, outside its button. In the app the whole card is the button (§6.5). On the website the button's label already says everything the bar shows, so screen readers skip the bar.
- **The website's test legs** number their flights UPS201, UPS202 and UPS203 (`tests/map/tripMapLegs.ts`), where the app's are UPS207 and on, so a few expected strings differ from the app's tests.

---

## Ground rules

1. **Running tests here is fine,** unlike the app.
   - Run one file with `npx vitest run <file>`, and type-check with `npx tsc --noEmit`. Vitest doesn't type-check.
   - Before asking to commit, run `npm test` and `npm run build`. Both must pass.
2. **Commits and pushes need Todd's live yes, every time.**
   - Each task ends with a suggested message in this repo's style: a plain sentence, with no `feat:` prefix.
   - A commit takes only its own task's files.
   - Never push `main`: `deploy-pages.yml` publishes the live site on every push to it. Push `trip-map-facts`, and open a PR into `main`, only when Todd says so. Merge only on his word.
   - Leave alone the untracked `docs/superpowers/plans/2026-10-26-partner-links-piece2-release.md`, an older plan that isn't this one's.
3. **Downloading anything needs Todd's OK first.** That's Task 2's `npm run icons`, which installs `@phosphor-icons/core` without saving it. This plan adds no dependency.
4. **Keep to the site's rules:**
   - every `fetch` is a plain GET, to the site itself or Open-Meteo (`tests/fixtures/sourceScan.ts`);
   - no `innerHTML`;
   - comments say what and why in plain words, citing "Stage 2 spec §N" or "moving map spec §N";
   - CSS uses the site's tokens (`--text-2`, `--glass-fill`, `--separator`, `--blue`), and every `backdrop-filter` has its `-webkit-` pair (`tests/styles/styles.test.ts`).
5. **Times are the family's own,** in `viewerTz`, through `shortTimeText(ms, zone, h24)`. It writes a narrow no-break space before AM and PM, so tests spell it ` `. "There" times use the airport's zone (`AirportMark.timeZone`).
6. **2A's files are read, never touched.**
   - The Crewluv checkout belongs to the Stage 2A session. Never edit, switch or commit anything there.
   - Read a file only once it's committed, with `git -C /Users/toddanderson/Dev/Crewluv show feature/trip-map-facts:<path>`.
   - To see whether it's committed: `git -C /Users/toddanderson/Dev/Crewluv log --oneline -1 feature/trip-map-facts -- <path>`. Nothing printed means it isn't yet. Then stop, tell Todd which file the task waits for, and wait.
   - **Port from the committed Swift.** Each port task's first step compares it with the 2A plan's draft, which the TypeScript here comes from. Where they differ, the committed Swift wins. Change this plan's code to match, and record it under "Changes made during execution".
   - If porting turns up what looks like a bug in 2A's Swift, its tests or its cases, tell Todd, and send the same note to the session running 2A, "Brainstorm moving map Stage 2: the fun facts" (`local_c18c013a-5914-4711-90ce-c6635dcb41ca`). Don't fix it in Crewluv, and don't make the website differ to hide it.
7. **The Content-Security-Policy in `vite.config.ts` doesn't change.** `tests/viteConfig.test.ts` pins it.
8. **Reviews:** dispatch `superpowers:code-reviewer` with `model: "sonnet"`.
9. **Keep the coordination notes current.** Before making, pushing or deleting a branch, add a line to the website section of `/Users/toddanderson/Library/Application Support/Claude/side-session-notes/local_1a5c7dff-d57c-49fe-97ef-10b521db7b14/repo-state.md`.

## File map

| File | Status | Responsibility |
|---|---|---|
| `scripts/build-icons.mjs`, `src/icons/iconPaths.ts` | modify | `Path` and `ChartBar` |
| `src/map/mapFit.ts` | modify | `fitClear`: the camera keeps the trip clear of a panel |
| `src/ui/TripMapSvg.tsx` | modify | takes `insets` |
| `src/facts/factRow.ts` | create | a row, the trip so far, the facts at a moment |
| `src/ui/FactRowView.tsx`, `TripSoFarList.tsx`, `FactsFooter.tsx`, `FactsBody.tsx` | create | the rows, the trip so far and the footer |
| `src/ui/hooks/useSidePanel.ts` | create | side panel or bottom panel |
| `src/ui/TripMapPage.tsx` | modify | the facts' panel, its insets, a recap opening paused |
| `src/data/weather.ts`, `src/data/demoWeather.ts`, `src/copy/weather.ts` | modify | the landing hour's forecast, its demo samples and its words |
| `src/facts/landingWeather.ts` | create | which flights get weather |
| `src/ui/hooks/useLandingWeather.ts` | create | fetching it while the full map is open |
| `src/facts/moonPosition.ts` | create | the sub-lunar point and the moon's height |
| `public/data/geography.json`, `public/data/comparisons.json` | create (copies) | 2A's data |
| `tests/fixtures/trip-map/facts-cases.json` | create (copy) | 2A's shared cases |
| `src/facts/comparisons.ts` | create | "Like driving coast to coast" |
| `src/facts/geography.ts` | create | what's under a point; nearby cities |
| `src/map/flightProgress.ts`, `src/map/tripMap.ts` | modify | times along a flight; destinations and miles; `days`, `dayCount` and the recap mode |
| `src/facts/legStory.ts` | create | a flight's places and closest point to home |
| `src/facts/milestone.ts` | create | crossings, halfway, closest to home, as times |
| `src/facts/sky.ts` | create | cockpit sun events, the people below, chasing the sun, the moon, ground sun events |
| `src/facts/tripTotals.ts` | create | cities, miles, time zones, cockpit sunsets, the longest flight |
| `src/copy/facts.ts`, `src/copy/factsTrip.ts` | create | the facts' sentences |
| `src/engine/trips.ts`, `src/engine/snapshot.ts`, `src/map/tripMapFor.ts`, `src/copy/tripMap.ts` | modify | the recap |
| `src/facts/tripFacts.ts`, `src/facts/tripFactsRows.ts` | create | the headline, the trip so far, the card's words, the rows |
| `src/facts/factsData.ts`, `src/ui/hooks/useFactsData.ts` | create | loading `geography.json` and `comparisons.json` |
| `src/ui/PilotPages.tsx`, `src/ui/StatusScreen.tsx` | modify | builds the facts and hands them on |
| `src/ui/TripMapCard.tsx`, `src/ui/TripRecapBar.tsx` | modify, create | the headline chip and the recap card |
| `src/data/demo.ts` | modify | a `recap` scene |
| `src/styles/tripMap.css` | modify | the panels, the rows and the recap bar |
| `tests/facts/*`, `tests/ui/*`, others | create or modify | tests |
| `README.md` | modify | the facts, the `recap` scene |

## Batches

Review with `superpowers:code-reviewer` (sonnet) after each batch.

- **A, what needs nothing from 2A:** Tasks 1–7. The branch, two icons, the camera's fit, the rows' views, the side and bottom panels, weather on landing, and the moon. These run now.
- **B, the data and the stories:** Tasks 8–14. These need 2A's Tasks 2–10 committed.
- **C, the words, the recap and the facts:** Tasks 15–20. These need 2A's Tasks 11–15 committed.
- **D, on screen:** Tasks 21–24. Task 23 compares the card with 2A's Task 20 when that's committed, and runs from the spec when it isn't.

---

### Task 1: The branch

**Files:** none.

- [ ] **Step 1: Check the tree.**

```bash
git -C "/Users/toddanderson/Dev/Crewluve Website" status --short && git -C "/Users/toddanderson/Dev/Crewluve Website" log --oneline -1
```

  - Expected:
    - `?? docs/superpowers/plans/2026-10-26-partner-links-piece2-release.md`, left alone;
    - `?? docs/superpowers/plans/2026-11-13-moving-map-stage2b-website.md`, this plan;
    - `a76bacf` on `main`.
  - Anything else: stop and ask Todd.

- [ ] **Step 2: Note the branch in the coordination notes** (ground rule 9). Add to the website section of `repo-state.md`: "The Stage 2B session makes `trip-map-facts` from `main` (`a76bacf`). Not pushed."

- [ ] **Step 3: Branch from `main`.**

```bash
git -C "/Users/toddanderson/Dev/Crewluve Website" switch -c trip-map-facts
```

  Expected: `Switched to a new branch 'trip-map-facts'`.

- [ ] **Step 4: Ask to commit the plan.** Only `docs/superpowers/plans/2026-11-13-moving-map-stage2b-website.md`. Suggested message: `Moving map Stage 2B plan: the trip map's facts on the website`

---

### Task 2: Two more icons

The distance row's `Path` and the totals rows' `ChartBar` (see "Icons" above).

**Files:**
- Modify: `scripts/build-icons.mjs`
- Modify (generated): `src/icons/iconPaths.ts`

- [ ] **Step 1: Ask Todd** (ground rule 3): "Task 2 runs `npm run icons`, which installs `@phosphor-icons/core@2.1.1` into `node_modules` without saving it, then regenerates `src/icons/iconPaths.ts` with two more icons. OK to download?" Wait for a yes.

- [ ] **Step 2: Add the icons.** In `scripts/build-icons.mjs`:
  - at the end of the comment above `const ICONS`, after "the seventh, the quick status's (partner links piece 5a §7).", add " The eighth, the trip map's facts (moving map Stage 2 spec §6.3).";
  - after the line `  Phone: 'phone', ChatCircle: 'chat-circle', ForkKnife: 'fork-knife',`, add a blank line and:

```js
  Path: 'path', ChartBar: 'chart-bar',
```

- [ ] **Step 3: Regenerate.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website" && npm run icons && git diff --stat src/icons/iconPaths.ts
```

  - Expected: `iconPaths.ts` changes by a few lines, adding `Path` and `ChartBar`, and no other icon changes.
  - If another icon's paths change, the installed version isn't 2.1.1. Stop and tell Todd.

- [ ] **Step 4: Run the icon tests.** Run `npx vitest run tests/icons/iconPaths.test.ts`. Expected: PASS.

- [ ] **Step 5: Ask to commit.** Suggested message: `Two more icons for the trip map's facts: Path and ChartBar`

---

### Task 3: The camera keeps the trip clear of a panel

At 900 px or wider the facts' panel lies over the map's left side, and collapsed, over its bottom-left corner. The camera's fit has to allow for it (Stage 2 spec §10). This closes Stage 1B's "left for later" note about the wide panel.

**Files:**
- Modify: `src/map/mapFit.ts` (add after `toAspect`)
- Modify: `src/ui/TripMapSvg.tsx`
- Test: `tests/map/mapFit.test.ts` (add a `describe` at the end), `tests/ui/TripMapSvg.test.tsx` (add a test at the end of its `describe`)

- [ ] **Step 1: Write the failing tests.** In `tests/map/mapFit.test.ts`, add `fitClear` to the import from `'../../src/map/mapFit'`. Then add at the end of the file:

```ts
describe('fitClear (Stage 2 spec §10)', () => {
  const rect = { x: 0.4, y: 0.4, width: 0.1, height: 0.1 }

  it('is toAspect without insets', () => {
    const plain = toAspect(rect, 2)
    const clear = fitClear(rect, 1000, 500, { top: 0, right: 0, bottom: 0, left: 0 })
    expect(clear.x).toBeCloseTo(plain.x, 12)
    expect(clear.y).toBeCloseTo(plain.y, 12)
    expect(clear.width).toBeCloseTo(plain.width, 12)
    expect(clear.height).toBeCloseTo(plain.height, 12)
  })

  it('centres the trip in the part a panel on the left leaves clear', () => {
    // 1000 × 500 px with 400 px covered: the clear part is 600 × 500, so the trip spans 0.12 × 0.1 of the world there,
    // at 0.0002 world units a pixel, and the whole view starts 400 px further left.
    const clear = fitClear(rect, 1000, 500, { top: 0, right: 0, bottom: 0, left: 400 })
    expect(clear.width).toBeCloseTo(0.2, 12)
    expect(clear.height).toBeCloseTo(0.1, 12)
    expect(clear.x).toBeCloseTo(0.31, 12)
    expect(clear.y).toBeCloseTo(0.4, 12)
    // The trip's centre lands in the middle of the clear part: 400 + 600 / 2 px from the left.
    expect((0.45 - clear.x) / (clear.width / 1000)).toBeCloseTo(700, 6)
  })

  it('leaves a panel along the bottom clear', () => {
    const clear = fitClear(rect, 400, 800, { top: 0, right: 0, bottom: 300, left: 0 })
    expect((0.45 - clear.y) / (clear.height / 800)).toBeCloseTo(250, 6)
  })

  it('ignores insets that leave less than 120 px clear', () => {
    const plain = toAspect(rect, 1)
    const clear = fitClear(rect, 400, 400, { top: 0, right: 0, bottom: 0, left: 300 })
    expect(clear.x).toBeCloseTo(plain.x, 12)
    expect(clear.width).toBeCloseTo(plain.width, 12)
  })
})
```

  In `tests/ui/TripMapSvg.test.tsx`, add inside its `describe`, at the end:

```tsx
  it('keeps every airport clear of a panel over the left side (Stage 2 spec §10)', () => {
    const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!
    const xs = (insets?: { top: number; right: number; bottom: number; left: number }) => {
      const { container, unmount } = render(<TripMapSvg map={map} t={at(12)} width={1000} height={500} focus={null} land={null} nightStep={60_000} insets={insets} />)
      const found = [...container.querySelectorAll('.trip-map-airport circle')].map((c) => Number(c.getAttribute('cx')))
      unmount()
      return found
    }
    expect(Math.min(...xs())).toBeLessThan(400)
    expect(Math.min(...xs({ top: 0, right: 0, bottom: 0, left: 400 }))).toBeGreaterThanOrEqual(400)
  })
```

  The file already imports `makeTripMap`, `EUROPE`, `AIRPORTS` and `at`.

- [ ] **Step 2: Run them to see them fail.** Run `npx vitest run tests/map/mapFit.test.ts tests/ui/TripMapSvg.test.tsx`. Expected: FAIL, because `fitClear` isn't exported and `insets` does nothing.

- [ ] **Step 3: Write `fitClear`.** In `src/map/mapFit.ts`, after `toAspect`, add:

```ts
/** Room the view keeps clear for a panel over the map, in px from each edge (Stage 2 spec §10). */
export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 }

/** With less clear map than this either way, the insets are ignored and the trip fills the whole view. */
export const MIN_CLEAR_PX = 120

/**
 * The rectangle a `width` × `height` view shows so that `rect`, grown to the clear part's shape, fills the part the
 * insets leave clear: a panel over the map then hides no route (Stage 2 spec §10). Without room for that, `toAspect`.
 */
export function fitClear(rect: WorldRect, width: number, height: number, insets: Insets = NO_INSETS): WorldRect {
  const clearWidth = width - insets.left - insets.right
  const clearHeight = height - insets.top - insets.bottom
  if (clearWidth < MIN_CLEAR_PX || clearHeight < MIN_CLEAR_PX) return toAspect(rect, width / height)
  const clear = toAspect(rect, clearWidth / clearHeight)
  const perPixel = clear.width / clearWidth
  return normalized({
    x: clear.x - insets.left * perPixel,
    y: clear.y - insets.top * perPixel,
    width: width * perPixel,
    height: height * perPixel,
  })
}
```

- [ ] **Step 4: Let the drawing take insets.** In `src/ui/TripMapSvg.tsx`:
  - change the import from `'../map/mapFit'` to `import { fitClear, NO_INSETS, type Insets } from '../map/mapFit'`;
  - in `TripMapSvgProps`, after `nightStep: number`, add:

```ts
  /** Room to keep clear for a panel over the map (Stage 2 spec §10). */
  insets?: Insets
```

  - change the function's first line and the `rect` line to:

```tsx
export function TripMapSvg({ map, t, width, height, focus, land, nightStep, insets = NO_INSETS }: TripMapSvgProps) {
  const { top, right, bottom, left } = insets
  const rect = useMemo(
    () => fitClear(fitRect(framingPoints(map, focus)) ?? { x: 0, y: 0, width: 1, height: 1 }, width, height, { top, right, bottom, left }),
    [map, focus, width, height, top, right, bottom, left],
  )
```

- [ ] **Step 5: Run them to see them pass.** Run the same command. Expected: PASS, with the file's other tests still passing.

- [ ] **Step 6: Ask to commit.** Suggested message: `The trip map's camera keeps the trip clear of a panel over the map (Stage 2 spec §10)`

---

### Task 4: A fact row, and the views that show the facts

The rows, the trip so far and the footer (Stage 2 spec §5, §6.3). The views only render what they're given. The engine fills them in Batch C, so these tests use rows made by hand.

**Files:**
- Create: `src/facts/factRow.ts`
- Create: `src/ui/FactRowView.tsx`, `src/ui/TripSoFarList.tsx`, `src/ui/FactsFooter.tsx`, `src/ui/FactsBody.tsx`
- Modify: `src/styles/tripMap.css` (add at the end)
- Test: `tests/ui/FactsBody.test.tsx`

- [ ] **Step 1: Write the failing test.** Create `tests/ui/FactsBody.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { factRow, rowSentence, type TripSoFar } from '../../src/facts/factRow'
import { FactsBody } from '../../src/ui/FactsBody'

afterEach(cleanup)

const below = factRow('below', 'MapPin', 'Over Bravo, near Testville', ['Passes 35 mi from home at 8:21 AM'])
const headed = factRow('headed', 'AirplaneLanding', 'Lands Cologne 9:30 PM', [null, '6 hours ahead of you'])
const soFar: TripSoFar = {
  flights: [{ id: 'f1', title: 'UPS201 · Louisville → Cologne', milestones: ['Crossed into Canada · 1:12 PM', 'Halfway · 4:12 PM'] }],
  totalsTitle: 'Trip so far',
  totals: 'Day 1 of 4 · 2,140 mi',
}

describe('a fact row (Stage 2 spec §5, §13)', () => {
  it('joins its other parts, leaving out the empty ones', () => {
    expect(headed.detail).toBe('6 hours ahead of you')
    expect(factRow('sky', 'Sun', 'Chasing the sun: their afternoon is stretching').detail).toBeNull()
  })

  it('is one sentence for screen readers', () => {
    expect(rowSentence(below)).toBe('Over Bravo, near Testville. Passes 35 mi from home at 8:21 AM')
    expect(rowSentence(factRow('sky', 'Moon', 'Full moon, up'))).toBe('Full moon, up')
  })
})

describe('the facts body (Stage 2 spec §5.2, §6.3)', () => {
  it('shows each row, the trip so far and the footer', () => {
    const { container } = render(<FactsBody rows={[below, headed]} tripSoFar={soFar} />)
    expect(container.querySelectorAll('.fact-row')).toHaveLength(2)
    expect(screen.getByText('Over Bravo, near Testville. Passes 35 mi from home at 8:21 AM')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'UPS201 · Louisville → Cologne' })).toBeTruthy()
    expect(screen.getByText('Halfway · 4:12 PM')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Trip so far' })).toBeTruthy()
    expect(screen.getByText('Day 1 of 4 · 2,140 mi')).toBeTruthy()
    expect(screen.getByText('Estimated from the schedule')).toBeTruthy()
  })

  it('credits Open-Meteo only when a row shows a forecast (§7.2)', () => {
    render(<FactsBody rows={[below]} tripSoFar={soFar} />)
    expect(screen.queryByRole('link', { name: /Open-Meteo/ })).toBeNull()
    cleanup()
    render(<FactsBody rows={[factRow('headed', 'AirplaneLanding', 'Lands Cologne 9:30 PM', ['48°F and rain on landing'], true)]} tripSoFar={soFar} />)
    expect(screen.getByRole('link', { name: /Open-Meteo/ })).toBeTruthy()
  })

  it('leaves out the totals when there are none', () => {
    render(<FactsBody rows={[]} tripSoFar={{ flights: [], totalsTitle: 'Trip so far', totals: null }} />)
    expect(screen.queryByRole('heading', { name: 'Trip so far' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run it to see it fail.** Run `npx vitest run tests/ui/FactsBody.test.tsx`. Expected: FAIL, because the modules don't exist.

- [ ] **Step 3: Write the row's data.** Create `src/facts/factRow.ts`:

```ts
import type { IconName } from '../icons/iconPaths'

/**
 * One row of the trip map's facts (Stage 2 spec §5), as the app's FactRow: an icon, a title, and a second line made of
 * the row's other parts.
 */
export type FactRowKind =
  // In flight (§5.1)
  | 'below' | 'sky' | 'distance' | 'headed'
  // On a layover (§5.3), at home before a trip (§5.4) and in the recap (§5.5)
  | 'whereTheyAre' | 'nextFlight' | 'leaves' | 'tripAhead' | 'theTrip' | 'onTheWay' | 'tripSoFar' | 'longestFlight'

export interface FactRow {
  kind: FactRowKind
  icon: IconName
  title: string
  /** The other parts, joined by " · ", or null when there are none. */
  detail: string | null
  /** True when the row shows a forecast, which needs Open-Meteo's credit under the rows (§7.2). */
  hasWeather: boolean
}

/** A row whose second line is `details` without the nulls. */
export function factRow(kind: FactRowKind, icon: IconName, title: string, details: (string | null)[] = [], hasWeather = false): FactRow {
  const parts = details.filter((d): d is string => d != null)
  return { kind, icon, title, detail: parts.length > 0 ? parts.join(' · ') : null, hasWeather }
}

/** The row as screen readers hear it: one sentence (§13). */
export const rowSentence = (row: FactRow) => (row.detail ? `${row.title}. ${row.detail}` : row.title)

/** The facts dragged all the way up (§5.2, §5.5): each started flight's milestones, newest flight first, then the totals. */
export interface TripSoFar {
  /** Flights with at least one milestone so far. */
  flights: { id: string; title: string; milestones: string[] }[]
  /** "Trip so far", or "Trip recap" once a recap's trip is over. */
  totalsTitle: string
  totals: string | null
}

/** Everything the full map's panel shows at one moment on the timeline. */
export interface FactsAtMoment {
  headline: string
  rows: FactRow[]
  tripSoFar: TripSoFar
}
```

- [ ] **Step 4: Write the views.** Create `src/ui/FactRowView.tsx`:

```tsx
import { rowSentence, type FactRow } from '../facts/factRow'
import { Icon } from './Icon'

/** One row of the facts (Stage 2 spec §6.3): an icon, a title and a second line, which screen readers hear as one sentence. */
export function FactRowView({ row }: { row: FactRow }) {
  return (
    <li class="fact-row">
      <span class="fact-row-icon">
        <Icon name={row.icon} size={22} />
      </span>
      <span class="fact-row-text" aria-hidden="true">
        <span class="fact-row-title">{row.title}</span>
        {row.detail && <span class="fact-row-detail">{row.detail}</span>}
      </span>
      <span class="sr-only">{rowSentence(row)}</span>
    </li>
  )
}
```

  Create `src/ui/TripSoFarList.tsx`:

```tsx
import type { TripSoFar } from '../facts/factRow'

/** The trip so far (Stage 2 spec §5.2, §5.5): each flight's milestones under its name, newest flight first, then the totals. */
export function TripSoFarList({ tripSoFar }: { tripSoFar: TripSoFar }) {
  return (
    <div class="trip-so-far">
      {tripSoFar.flights.map((flight) => (
        <section key={flight.id} class="trip-so-far-flight">
          <h3>{flight.title}</h3>
          <ul>
            {flight.milestones.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </section>
      ))}
      {tripSoFar.totals && (
        <section class="trip-so-far-totals">
          <h3>{tripSoFar.totalsTitle}</h3>
          <p>{tripSoFar.totals}</p>
        </section>
      )}
    </div>
  )
}
```

  Create `src/ui/FactsFooter.tsx`:

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

  Create `src/ui/FactsBody.tsx`:

```tsx
import type { FactRow, TripSoFar } from '../facts/factRow'
import { FactRowView } from './FactRowView'
import { FactsFooter } from './FactsFooter'
import { TripSoFarList } from './TripSoFarList'

/** The facts under the panel's headline (Stage 2 spec §5, §6.3): the rows, the trip so far, then the footer. */
export function FactsBody({ rows, tripSoFar }: { rows: FactRow[]; tripSoFar: TripSoFar }) {
  return (
    <div class="facts-body">
      {rows.length > 0 && (
        <ul class="fact-rows">
          {rows.map((row) => <FactRowView key={row.kind} row={row} />)}
        </ul>
      )}
      <TripSoFarList tripSoFar={tripSoFar} />
      <FactsFooter showsWeather={rows.some((row) => row.hasWeather)} />
    </div>
  )
}
```

- [ ] **Step 5: Style them.** At the end of `src/styles/tripMap.css`, add:

```css
/* The facts (Stage 2 spec §6.3): an icon, a title and a grey second line, rows split by a hairline. */
.facts-body { display: flex; flex-direction: column; gap: 16px; }
.fact-rows { margin: 0; padding: 0; list-style: none; }
.fact-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; }
.fact-row + .fact-row { border-top: 0.5px solid var(--separator); }
.fact-row-icon { flex: none; width: 22px; height: 22px; color: var(--blue); }
.fact-row-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fact-row-title { font-weight: 600; }
.fact-row-detail { color: var(--text-2); font-size: 0.9rem; }
.trip-so-far { display: flex; flex-direction: column; gap: 12px; }
.trip-so-far h3 { margin: 0 0 4px; font-size: 0.95rem; font-weight: 600; }
.trip-so-far ul { margin: 0; padding: 0; list-style: none; color: var(--text-2); font-size: 0.9rem; }
.trip-so-far p { margin: 0; color: var(--text-2); font-size: 0.9rem; }
.facts-footer { color: var(--text-2); font-size: 0.8rem; }
.facts-footer p { margin: 0; }
```

- [ ] **Step 6: Run it to see it pass.** Run `npx vitest run tests/ui/FactsBody.test.tsx tests/styles/styles.test.ts`, then `npx tsc --noEmit`. Expected: PASS, and no type errors.

- [ ] **Step 7: Ask to commit.** Suggested message: `A fact row and the views that show the trip map's facts: the rows, the trip so far and the footer (Stage 2 spec §5, §6.3)`

---

### Task 5: The side panel and the bottom panel

The full map's panel becomes the facts' panel (Stage 2 spec §10):
- At 900 px or wider, or on a phone on its side, it's a side panel over the map's left edge. Open, it runs the full height under the top bar, with the rows scrolling and the timeline at the bottom. A chevron, "Hide facts" or "Show facts", collapses it to the headline and timeline.
- Below that, it stays a bottom panel under the map. "More facts" opens the rows and the trip so far, which scroll inside it, and "Fewer facts" closes it.

The page takes the facts as a function of the moment, `factsAt`. Task 21 passes the real one. Without it the panel is Stage 1B's.

**Files:**
- Create: `src/ui/hooks/useSidePanel.ts`
- Modify: `src/ui/TripMapPage.tsx`
- Modify: `src/styles/tripMap.css` (replace the last `@media` block; change `.trip-map-headline`)
- Test: `tests/ui/useSidePanel.test.tsx`, `tests/ui/TripMapPage.test.tsx` (add a `describe` at the end)

- [ ] **Step 1: Write the failing tests.** Create `tests/ui/useSidePanel.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { SIDE_PANEL, useSidePanel } from '../../src/ui/hooks/useSidePanel'
import { setWindowSize } from '../fixtures/ui'

function Layout() {
  return <p>{useSidePanel() ? 'side' : 'bottom'}</p>
}

afterEach(() => {
  cleanup()
  setWindowSize(1024, 768)
})

describe('useSidePanel (Stage 2 spec §10)', () => {
  it('is Stage 1B’s query: 900 px or wider, or a phone on its side', () => {
    expect(SIDE_PANEL).toBe('(min-width: 900px), (orientation: landscape) and (max-height: 500px)')
  })

  it.each([
    ['a computer', 1440, 900, 'side'],
    ['an iPad on its side', 1180, 820, 'side'],
    ['a phone on its side', 874, 402, 'side'],
    ['a phone', 402, 874, 'bottom'],
    ['an iPad mini held upright', 744, 1133, 'bottom'],
  ])('picks for %s, %i × %i px: %s', (_name, width, height, layout) => {
    setWindowSize(width, height)
    expect(render(<Layout />).container.textContent).toBe(layout)
  })

  it('follows the window across the line', () => {
    setWindowSize(402, 874)
    const { container } = render(<Layout />)
    act(() => setWindowSize(1280, 800))
    expect(container.textContent).toBe('side')
  })
})
```

  In `tests/ui/TripMapPage.test.tsx`:
  - add `import { factRow, type FactsAtMoment } from '../../src/facts/factRow'` and `import { setWindowSize } from '../fixtures/ui'`;
  - change `afterEach(cleanup)` to:

```tsx
afterEach(() => {
  cleanup()
  setWindowSize(1024, 768)
})
```

  - add at the end of the file:

```tsx
describe('the facts’ panel (Stage 2 spec §10)', () => {
  const facts: FactsAtMoment = {
    headline: 'Over Kansas',
    rows: [factRow('distance', 'Path', '2,140 mi flown · 1,960 to go', ['Halfway at 4:12 PM'])],
    tripSoFar: { flights: [], totalsTitle: 'Trip so far', totals: 'Day 1 of 4 · 2,140 mi' },
  }
  const show = (factsAt?: () => FactsAtMoment) => {
    const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!
    return render(<TripMapPage map={map} now={at(12)} viewerTz="America/New_York" h24={false} day={1} days={4} land={null}
      onBack={() => {}} factsAt={factsAt} />)
  }
  const body = (container: HTMLElement) => container.querySelector<HTMLElement>('#trip-facts')!

  it('on a phone, opens with "More facts" and closes with "Fewer facts"', () => {
    setWindowSize(402, 874)
    const { container } = show(() => facts)
    expect(screen.getByRole('heading', { level: 2, name: 'Over Kansas' })).toBeTruthy()
    const more = screen.getByRole('button', { name: 'More facts' })
    expect(more.getAttribute('aria-expanded')).toBe('false')
    expect(body(container).hidden).toBe(true)
    fireEvent.click(more)
    expect(screen.getByRole('button', { name: 'Fewer facts' }).getAttribute('aria-expanded')).toBe('true')
    expect(body(container).hidden).toBe(false)
    expect(screen.getByText('2,140 mi flown · 1,960 to go. Halfway at 4:12 PM')).toBeTruthy()
  })

  it('on a wide window, opens with its facts showing and folds to the headline and timeline', () => {
    setWindowSize(1280, 800)
    const { container } = show(() => facts)
    const hide = screen.getByRole('button', { name: 'Hide facts' })
    expect(hide.getAttribute('aria-expanded')).toBe('true')
    expect(body(container).hidden).toBe(false)
    fireEvent.click(hide)
    expect(screen.getByRole('button', { name: 'Show facts' })).toBeTruthy()
    expect(body(container).hidden).toBe(true)
    expect(screen.getByRole('slider', { name: 'Trip time' })).toBeTruthy()
  })

  it('without facts, is Stage 1B’s panel', () => {
    const { container } = show()
    expect(screen.queryByRole('button', { name: /facts/ })).toBeNull()
    expect(container.querySelector('#trip-facts')).toBeNull()
    expect(container.querySelector('h2.trip-map-headline')!.textContent).toContain('Cologne')
  })
})
```

- [ ] **Step 2: Run them to see them fail.** Run `npx vitest run tests/ui/useSidePanel.test.tsx tests/ui/TripMapPage.test.tsx`. Expected: FAIL, because the hook doesn't exist and the page has no `factsAt`.

- [ ] **Step 3: Write the hook.** Create `src/ui/hooks/useSidePanel.ts`:

```ts
import { useEffect, useState } from 'preact/hooks'

/**
 * The windows where the full map's facts are a side panel (Stage 2 spec §2 item 2, §10): 900 px or wider, and a phone on
 * its side, where a panel under the map would leave little map. Stage 1B's panel moved aside at the same sizes.
 */
export const SIDE_PANEL = '(min-width: 900px), (orientation: landscape) and (max-height: 500px)'

const sidePanelNow = () => typeof matchMedia === 'function' && matchMedia(SIDE_PANEL).matches

/** Whether the facts are a side panel, following the window as it's resized. */
export function useSidePanel(): boolean {
  const [side, setSide] = useState(sidePanelNow)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const query = matchMedia(SIDE_PANEL)
    const follow = () => setSide(query.matches)
    query.addEventListener?.('change', follow)
    return () => query.removeEventListener?.('change', follow)
  }, [])
  return side
}
```

- [ ] **Step 4: Give the page its panel.** Replace `src/ui/TripMapPage.tsx` with:

```tsx
import { useEffect, useRef, useState } from 'preact/hooks'
import { panelHeadline, topPill } from '../copy/tripMap'
import type { FactsAtMoment } from '../facts/factRow'
import type { GeoPoint } from '../map/greatCircle'
import { NO_INSETS, type Insets } from '../map/mapFit'
import { clockTime, finishesAt, isPlaying, liveClock, REPLAY_BASE_RATE } from '../map/replayClock'
import { currentLeg, legInMotion, type TripMap } from '../map/tripMap'
import { Chevron } from './Chevron'
import { FactsBody } from './FactsBody'
import { useFrameClock } from './hooks/useFrameClock'
import { useSidePanel } from './hooks/useSidePanel'
import { useSize } from './hooks/useSize'
import { Icon } from './Icon'
import { TripMapSvg } from './TripMapSvg'
import { TripTimeline } from './TripTimeline'

export interface TripMapPageProps {
  map: TripMap
  now: number
  viewerTz: string
  h24: boolean
  day: number | null
  days: number | null
  land: GeoPoint[][] | null
  onBack: () => void
  /** The facts at a moment on the timeline, with `now` the real time (Stage 2 spec §5). Without it the panel is Stage 1B's. */
  factsAt?: (t: number, now: number) => FactsAtMoment
}

/** The side panel's gap from the screen's edge, and from the clear part of the map (Stage 2 spec §10). */
const PANEL_MARGIN = 16

/**
 * The full map at #map (moving map spec §6, §11; Stage 2 spec §10): the trip, filling the screen, framed on the leg in
 * motion or the whole trip, with a timeline to replay it and the facts at the moment it shows. Back, the close button
 * and Escape all close it. It doesn't pan or zoom.
 */
export function TripMapPage({ map, now, viewerTz, h24, day, days, land, onBack, factsAt }: TripMapPageProps) {
  const [kept, setClock] = useState(() => liveClock(map.span))
  // The span always follows the map, so the slider's range is right if the trip changes while the page is open.
  const clock = { ...kept, span: map.span }
  const frameNow = useFrameClock(isPlaying(clock), now, finishesAt(clock) ?? Infinity)
  const t = clockTime(clock, frameNow)
  const box = useRef<HTMLDivElement>(null)
  const { width, height } = useSize(box, { width: 390, height: 520 })
  const panel = useRef<HTMLElement>(null)
  const panelSize = useSize(panel, { width: 0, height: 0 })
  const heading = useRef<HTMLHeadingElement>(null)
  const focus = legInMotion(map, t) ?? (t === now ? currentLeg(map) : null)
  const side = useSidePanel()
  // The side panel opens with its facts showing; the bottom panel opens small, with "More facts" (§10).
  const [open, setOpen] = useState(side)
  useEffect(() => setOpen(side), [side])
  const facts = factsAt ? factsAt(t, now) : null
  const showsFacts = facts != null && open

  // Focus the heading once, as the page opens. The page re-renders every second, so this must not depend on onBack.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onBack])

  // A side panel lies over the map, so the camera keeps the trip clear of it: its width while open, its height while
  // folded to the corner. The bottom panel sits under the map, which shrinks to make room (§10).
  const insets: Insets = !side || panelSize.width === 0 ? NO_INSETS
    : showsFacts ? { ...NO_INSETS, left: panelSize.width + 2 * PANEL_MARGIN }
    : { ...NO_INSETS, bottom: panelSize.height + 2 * PANEL_MARGIN }

  // Night moves about a degree every four minutes: live it's redrawn each minute; in replay about ten times a second.
  const nightStep = isPlaying(clock) ? (REPLAY_BASE_RATE / 10) * clock.speed * 1000 : 60_000
  return (
    <main class="trip-map-page">
      <header class="trip-map-top">
        <button type="button" class="trip-map-close" aria-label="Close map" onClick={onBack}>
          <Icon name="XCircle" size={28} />
        </button>
        <h1 ref={heading} class="trip-map-pill" tabIndex={-1}>{topPill(map, t, day, days)}</h1>
      </header>
      <div ref={box} class="trip-map-full">
        <TripMapSvg map={map} t={t} width={width} height={height} focus={focus} land={land} nightStep={nightStep} insets={insets} />
      </div>
      <section ref={panel} class={`trip-map-panel ${side ? 'side' : 'bottom'}${showsFacts ? ' open' : ''}`}
        aria-label={facts ? 'Trip facts' : 'Timeline'}>
        <div class="trip-map-panel-top">
          <h2 class="trip-map-headline">{facts ? facts.headline : panelHeadline(map, t, viewerTz, h24)}</h2>
          {facts && side && (
            <button type="button" class="facts-toggle chevron-toggle" aria-expanded={open} aria-controls="trip-facts"
              aria-label={open ? 'Hide facts' : 'Show facts'} onClick={() => setOpen(!open)}>
              <Chevron direction="right" size={16} />
            </button>
          )}
          {facts && !side && (
            <button type="button" class="facts-toggle" aria-expanded={open} aria-controls="trip-facts" onClick={() => setOpen(!open)}>
              {open ? 'Fewer facts' : 'More facts'}
            </button>
          )}
        </div>
        {facts && (
          <div id="trip-facts" class="trip-facts" hidden={!open}>
            <FactsBody rows={facts.rows} tripSoFar={facts.tripSoFar} />
          </div>
        )}
        <TripTimeline clock={clock} onChange={setClock} now={frameNow} viewerTz={viewerTz} h24={h24} />
      </section>
    </main>
  )
}
```

- [ ] **Step 5: Style the panels.** In `src/styles/tripMap.css`:
  - replace the `.trip-map-headline` rule with:

```css
.trip-map-headline { margin: 0; font-size: 1rem; font-weight: 600; }
```

  - replace the whole last block, `@media (min-width: 900px), (orientation: landscape) and (max-height: 500px) { … }`, with:

```css
/* The facts' panel (Stage 2 spec §10): the headline and its toggle, the facts, then the timeline. Below 900 px it sits
   under the map, and "More facts" opens its facts, which scroll inside it. */
.trip-map-panel { display: flex; flex-direction: column; gap: 12px; }
.trip-map-panel-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.facts-toggle {
  flex: none;
  min-height: 44px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--blue);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.chevron-toggle { min-width: 44px; padding: 0; color: inherit; }
/* Up to show the facts, down to fold them away. */
.chevron-toggle .chevron { transform: rotate(-90deg); }
.trip-map-panel.open .chevron-toggle .chevron { transform: rotate(90deg); }
.trip-facts { max-height: 45vh; max-height: 45dvh; overflow-y: auto; }

/* At 900 px or wider, or on a phone on its side, the panel lies over the map's left edge. Open, it runs the full height
   under the top bar, its facts scroll and the timeline stays at the bottom; folded, it's the headline and timeline in
   the corner. The camera keeps the trip clear of it (TripMapPage's insets). */
@media (min-width: 900px), (orientation: landscape) and (max-height: 500px) {
  .trip-map-panel {
    position: fixed;
    left: calc(16px + env(safe-area-inset-left));
    bottom: calc(16px + env(safe-area-inset-bottom));
    width: 380px;
    max-width: calc(100% - 32px);
    margin: 0;
  }
  .trip-map-panel.open { top: calc(76px + env(safe-area-inset-top)); }
  .trip-map-panel.open .trip-facts { flex: 1; min-height: 0; max-height: none; }
}
```

- [ ] **Step 6: Run them to see them pass.** Run `npx vitest run tests/ui/useSidePanel.test.tsx tests/ui/TripMapPage.test.tsx tests/styles/styles.test.ts tests/ui/PilotPages.test.tsx`, then `npx tsc --noEmit`. Expected: PASS. The page's earlier tests still pass, at happy-dom's 1024 × 768, which is the side panel.

- [ ] **Step 7: Look at it (Todd).** Run `npm run dev` and open `http://localhost:5180/?demo=1&scene=layover#map` at a narrow and a wide width. There are no facts yet, so the panel is Stage 1B's. On the wide window, check that it sits in the bottom-left corner and the trip is framed clear of it.

- [ ] **Step 8: Ask to commit.** Suggested message: `The full map's facts panel: a side panel over the map at 900 px or wider, and under it a bottom panel with More facts (Stage 2 spec §10)`

---

### Task 6: Weather on landing

The forecast for the hour a flight lands (Stage 2 spec §7):
- **Which flights:** the one in the air, and the next when it lands within 48 hours.
- **When:** fetched only while the full map is open, and kept by airport and hour for 30 minutes.
- **Where from:** Open-Meteo's hourly forecast, which the site already uses and credits. The demo uses samples.

**Files:**
- Modify: `src/data/weather.ts`, `src/data/demoWeather.ts`, `src/copy/weather.ts`
- Create: `src/facts/landingWeather.ts`, `src/ui/hooks/useLandingWeather.ts`
- Test: `tests/data/weather.test.ts`, `tests/copy/weather.test.ts` (add a `describe` at the end of each), `tests/facts/landingWeather.test.ts`, `tests/ui/useLandingWeather.test.tsx`

- [ ] **Step 1: Write the failing tests.** At the end of `tests/data/weather.test.ts`, add the following, and add `fetchLandingForecast`, `landingForecastUrl`, `landingHour` and `parseLandingForecast` to its import from `'../../src/data/weather'`:

```ts
describe('the landing hour’s forecast (Stage 2 spec §7.1)', () => {
  const landing = Date.UTC(2026, 10, 14, 2, 30)

  it('asks for the hour holding the landing, in GMT', () => {
    expect(landingHour(landing)).toBe('2026-11-14T02:00')
    expect(landingForecastUrl(50.8659, 7.1427, 'fahrenheit', landing)).toBe(
      'https://api.open-meteo.com/v1/forecast?latitude=50.87&longitude=7.14&hourly=temperature_2m,weather_code' +
        '&temperature_unit=fahrenheit&timezone=GMT&start_hour=2026-11-14T02:00&end_hour=2026-11-14T02:00',
    )
  })

  it('reads the hour’s temperature and sky', () => {
    const body = { hourly: { time: ['2026-11-14T02:00'], temperature_2m: [47.6], weather_code: [61] } }
    expect(parseLandingForecast(body, 'fahrenheit')).toEqual({ temperature: 47.6, unit: 'fahrenheit', code: 61 })
  })

  it('gives null for anything else', () => {
    expect(parseLandingForecast({ hourly: { temperature_2m: [], weather_code: [] } }, 'celsius')).toBeNull()
    expect(parseLandingForecast({ hourly: { temperature_2m: [9], weather_code: [42] } }, 'celsius')).toBeNull()
    expect(parseLandingForecast(null, 'celsius')).toBeNull()
  })

  it('sends a plain GET with no cookies or referrer, and gives null on a failure', async () => {
    const ok = vi.fn(async () => new Response(JSON.stringify({ hourly: { temperature_2m: [9], weather_code: [3] } })))
    expect(await fetchLandingForecast(50.87, 7.14, 'celsius', landing, ok as unknown as typeof fetch)).toEqual({ temperature: 9, unit: 'celsius', code: 3 })
    expect(ok.mock.calls[0][1]).toMatchObject({ cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' })
    const down = vi.fn(async () => new Response('', { status: 503 }))
    expect(await fetchLandingForecast(50.87, 7.14, 'celsius', landing, down as unknown as typeof fetch)).toBeNull()
  })
})
```

  If the file doesn't import `vi`, add it to the import from `'vitest'`.

  At the end of `tests/copy/weather.test.ts`, add the following, and add `landingWeatherText` to its import from `'../../src/copy/weather'`:

```ts
describe('weather on landing (Stage 2 spec §4.7)', () => {
  it('says the temperature with its unit and the sky in lower case', () => {
    expect(landingWeatherText({ temperature: 47.6, unit: 'fahrenheit', code: 61 })).toBe('48°F and rain on landing')
    expect(landingWeatherText({ temperature: 30.2, unit: 'celsius', code: 2 })).toBe('30°C and partly cloudy on landing')
  })
})
```

  Create `tests/facts/landingWeather.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { flightsToForecast, landsWithinHorizon, WEATHER_HORIZON_MS } from '../../src/facts/landingWeather'
import { makeTripMap } from '../../src/map/tripMap'
import { AIRPORTS, at, EUROPE, HOUR } from '../map/tripMapLegs'

/** The Europe trip's flights land at +8, +38 and +72 hours. */
const ids = (hours: number) =>
  flightsToForecast(makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(hours), airports: AIRPORTS })!, at(hours)).map((l) => l.id)

describe('which flights get weather (Stage 2 spec §7.2)', () => {
  it('is 48 hours', () => {
    expect(WEATHER_HORIZON_MS).toBe(48 * HOUR)
  })

  it('in the air, is this flight and the next', () => {
    expect(ids(4)).toEqual(['f1', 'f2'])
  })

  it('on a layover, is the next flight', () => {
    expect(ids(12)).toEqual(['f2'])
  })

  it('leaves out a flight landing more than 48 hours out', () => {
    expect(ids(-24)).toEqual(['f1'])
    expect(ids(-48)).toEqual([])
  })

  it('in replay, shows only for a landing between the real now and 48 hours on (§7.3)', () => {
    const f1 = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(0), airports: AIRPORTS })!.legs[0]
    expect(landsWithinHorizon(f1, at(4))).toBe(true)
    expect(landsWithinHorizon(f1, at(9))).toBe(false)
    expect(landsWithinHorizon(f1, at(8 - 49))).toBe(false)
  })
})
```

  Create `tests/ui/useLandingWeather.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LandingLoader } from '../../src/data/weather'
import { makeTripMap, type TripMap } from '../../src/map/tripMap'
import { useLandingWeather } from '../../src/ui/hooks/useLandingWeather'
import { AIRPORTS, at, EUROPE } from '../map/tripMapLegs'

afterEach(cleanup)

const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(4), airports: AIRPORTS })!

function Shown({ trip, load }: { trip: TripMap | null; load: LandingLoader }) {
  const forecasts = useLandingWeather(trip, at(4), 'fahrenheit', load)
  return <p>{Object.entries(forecasts).map(([id, f]) => `${id}:${f.temperature}`).join(' ')}</p>
}

describe('useLandingWeather (Stage 2 spec §7.1, §7.2)', () => {
  it('fetches each flight’s landing hour once and gives the forecasts by leg', async () => {
    const load = vi.fn<LandingLoader>(async (place) => ({ temperature: place.code === 'CGN' ? 48 : 86, unit: 'fahrenheit', code: 0 }))
    const { container, rerender } = render(<Shown trip={map} load={load} />)
    await waitFor(() => expect(container.textContent).toBe('f1:48 f2:86'))
    rerender(<Shown trip={map} load={load} />)
    expect(load).toHaveBeenCalledTimes(2)
    expect(load.mock.calls.map(([place, landing]) => [place.code, landing])).toEqual([['CGN', at(8)], ['DXB', at(38)]])
  })

  it('fetches nothing while the full map is closed', () => {
    const load = vi.fn<LandingLoader>(async () => null)
    render(<Shown trip={null} load={load} />)
    expect(load).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run them to see them fail.** Run `npx vitest run tests/data/weather.test.ts tests/copy/weather.test.ts tests/facts/landingWeather.test.ts tests/ui/useLandingWeather.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Fetch the landing hour.** In `src/data/weather.ts`:
  - add at the top: `import { HOUR } from '../time/zoned'`;
  - at the end of the file, add:

```ts
/** The forecast for the hour a flight lands (Stage 2 spec §7): degrees in `unit`, and the sky. */
export interface LandingForecast {
  temperature: number
  unit: TempUnit
  code: WeatherCode
}

/** Where landing forecasts come from: Open-Meteo when live, made-up samples in the demo. Resolves to null when there's none. */
export type LandingLoader = (place: WeatherPlace, landing: number) => Promise<LandingForecast | null>

/** The hour holding `landing`, as Open-Meteo names hours in GMT: "2026-11-14T02:00". */
export function landingHour(landing: number): string {
  return new Date(Math.floor(landing / HOUR) * HOUR).toISOString().slice(0, 16)
}

/** The request for one hour of an airport's hourly forecast, the hour holding the landing (Stage 2 spec §7.1). */
export function landingForecastUrl(lat: number, lng: number, unit: TempUnit, landing: number): string {
  const hour = landingHour(landing)
  return `${OPEN_METEO_URL}/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}&hourly=temperature_2m,weather_code` +
    `&temperature_unit=${unit}&timezone=GMT&start_hour=${hour}&end_hour=${hour}`
}

/** Open-Meteo's reply for one hour, checked: a finite temperature and a code the site has words for. Anything else is null. */
export function parseLandingForecast(body: unknown, unit: TempUnit): LandingForecast | null {
  const hourly = field(body, 'hourly')
  const temperatures = field(hourly, 'temperature_2m')
  const codes = field(hourly, 'weather_code')
  const temperature: unknown = Array.isArray(temperatures) ? temperatures[0] : undefined
  const code: unknown = Array.isArray(codes) ? codes[0] : undefined
  if (typeof temperature !== 'number' || !Number.isFinite(temperature) || !isWeatherCode(code)) return null
  return { temperature, unit, code }
}

/**
 * The landing hour's forecast from Open-Meteo, or null when it can't be had within 10 seconds: a plain GET with no
 * cookies or referrer that the browser never caches, as `fetchWeather` sends. Tests pass their own `fetch`.
 */
export async function fetchLandingForecast(
  lat: number, lng: number, unit: TempUnit, landing: number, fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<LandingForecast | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS)
  try {
    const res = await fetch(landingForecastUrl(lat, lng, unit, landing), {
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    })
    return res.ok ? parseLandingForecast(await res.json(), unit) : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** The live landing loader: Open-Meteo, at the airport's coordinates. */
export const loadLiveLandingForecast: LandingLoader = (place, landing) => fetchLandingForecast(place.lat, place.lng, place.unit, landing)
```

- [ ] **Step 4: The demo's landing weather.** In `src/data/demoWeather.ts`:
  - change the second import to `import type { LandingLoader, WeatherCode, WeatherLoader } from './weather'`;
  - at the end of the file, add:

```ts
/** The demo's landing forecasts (Stage 2 spec §7): each airport's sample, in the visitor's unit. The demo never calls Open-Meteo. */
export const loadDemoLandingForecast: LandingLoader = async (place) => {
  const sample = SAMPLES.get(place.code)
  if (!sample) return null
  return {
    temperature: place.unit === 'fahrenheit' ? sample.fahrenheit : ((sample.fahrenheit - 32) * 5) / 9,
    unit: place.unit,
    code: sample.code,
  }
}
```

- [ ] **Step 5: The words.** In `src/copy/weather.ts`:
  - change the first import to `import type { LandingForecast, WeatherCode } from '../data/weather'`;
  - at the end of the file, add:

```ts
/** "48°F and rain on landing" (Stage 2 spec §4.7): whole degrees with the unit's letter, and the app's words for the sky in lower case. */
export function landingWeatherText(forecast: LandingForecast): string {
  const letter = forecast.unit === 'fahrenheit' ? 'F' : 'C'
  return `${temperatureText(forecast.temperature)}${letter} and ${CONDITIONS[forecast.code][0].toLowerCase()} on landing`
}
```

- [ ] **Step 6: Which flights.** Create `src/facts/landingWeather.ts`:

```ts
import { isMoving, type MapLeg, type TripMap } from '../map/tripMap'
import { HOUR } from '../time/zoned'

/** Weather shows for a flight landing within this of now (Stage 2 spec §7.2). */
export const WEATHER_HORIZON_MS = 48 * HOUR

/**
 * True when `leg` lands between the real `now` and 48 hours on. The rows ask this with the real time, whatever moment
 * the timeline shows: a forecast can't describe a landing that's already happened (§7.3).
 */
export const landsWithinHorizon = (leg: MapLeg, now: number) => leg.end > now && leg.end - now <= WEATHER_HORIZON_MS

/** The flight in the air at `now`, and the next flight, each only when it lands within 48 hours of `now` (§7.2). */
export function flightsToForecast(map: TripMap, now: number): MapLeg[] {
  const flights = map.legs.filter((l) => l.kind === 'flight')
  const inAir = flights.find((l) => isMoving(l, now))
  const next = flights.find((l) => l.start > now)
  return [inAir, next].filter((l): l is MapLeg => l != null && l.end - now <= WEATHER_HORIZON_MS)
}
```

- [ ] **Step 7: Fetch it while the map is open.** Create `src/ui/hooks/useLandingWeather.ts`:

```ts
import { useEffect, useRef, useState } from 'preact/hooks'
import { landingHour, type LandingForecast, type LandingLoader, type TempUnit } from '../../data/weather'
import { flightsToForecast } from '../../facts/landingWeather'
import type { MapLeg, TripMap } from '../../map/tripMap'

/** A landing forecast is kept this long, then fetched again (Stage 2 spec §7.1, §7.2). */
export const LANDING_REFRESH_MS = 30 * 60_000

/** How often a visible page checks whether a forecast has turned 30 minutes old. */
const CHECK_MS = 60_000

/**
 * Landing-hour forecasts by leg id for the flights `flightsToForecast` picks, while `map` is given: the full map is open
 * (Stage 2 spec §7.2). They're kept by airport and hour for 30 minutes, and checked once a minute while the page is
 * visible. A failure is kept as none, so it's tried again only 30 minutes later, never in a rapid loop. `load` never
 * changes, so it's left out of the effect's dependencies, as `useWeather` does.
 */
export function useLandingWeather(map: TripMap | null, now: number, unit: TempUnit, load: LandingLoader): Record<string, LandingForecast> {
  const kept = useRef(new Map<string, { forecast: LandingForecast | null; at: number }>())
  const pending = useRef(new Set<string>())
  const [, setVersion] = useState(0)
  const keyOf = (leg: MapLeg) => `${leg.destination.code}@${landingHour(leg.end)}|${unit}`
  const wanted = map ? flightsToForecast(map, now) : []
  const latest = useRef(wanted)
  latest.current = wanted
  const keys = wanted.map(keyOf).join(' ')
  const mounted = useRef(true)
  useEffect(
    () => () => {
      mounted.current = false
    },
    [],
  )

  useEffect(() => {
    if (!keys) return
    const refresh = () => {
      for (const leg of latest.current) {
        const key = keyOf(leg)
        const entry = kept.current.get(key)
        if (pending.current.has(key) || (entry && Date.now() - entry.at < LANDING_REFRESH_MS)) continue
        pending.current.add(key)
        const { code, place, timeZone } = leg.destination
        // Called inside a promise's executor, so a loader that throws at once counts as a failure like any other.
        void new Promise<LandingForecast | null>((resolve) => resolve(load({ code, lat: place.lat, lng: place.lng, tz: timeZone, unit }, leg.end)))
          .catch(() => null)
          .then((forecast) => {
            pending.current.delete(key)
            kept.current.set(key, { forecast, at: Date.now() })
            if (mounted.current) setVersion((v) => v + 1)
          })
      }
    }
    refresh()
    const check = setInterval(() => {
      if (document.visibilityState !== 'hidden') refresh()
    }, CHECK_MS)
    return () => clearInterval(check)
  }, [keys])

  const forecasts: Record<string, LandingForecast> = {}
  for (const leg of wanted) {
    const forecast = kept.current.get(keyOf(leg))?.forecast
    if (forecast) forecasts[leg.id] = forecast
  }
  return forecasts
}
```

- [ ] **Step 8: Run them to see them pass.** Run the command from Step 2, then `npx vitest run tests/fixtures tests/data tests/viteConfig.test.ts` and `npx tsc --noEmit`. Expected: PASS. The source rules and the CSP test still pass: the new request is a plain GET to Open-Meteo.

- [ ] **Step 9: Ask to commit.** Suggested message: `Weather on landing from Open-Meteo's hourly forecast, for the flight in the air and the next within 48 hours, fetched only while the full map is open (Stage 2 spec §7)`

---

### Task 7: The moon

Whether the moon is up at the plane (Stage 2 spec §4.5). The point it's straight above is `crewlu-globe`'s `subLunarPoint` (`/Users/toddanderson/Dev/crewlu-globe/src/astro/moon.ts`), ported as is. Its phase is the site's own `moonPhase` (`src/time/moon.ts`), which the app's `MoonPosition` ports in turn.

**Files:**
- Create: `src/facts/moonPosition.ts`
- Test: `tests/facts/moonPosition.test.ts`

- [ ] **Step 1: Write the failing test.** Create `tests/facts/moonPosition.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { moonAltitude, subLunarPoint } from '../../src/facts/moonPosition'
import { moonPhase } from '../../src/time/moon'

const DAY = 86_400_000

describe('the moon (Stage 2 spec §4.5)', () => {
  it('names each phase at its middle in November 2026, as the app does', () => {
    expect(
      ['2026-11-09T21:58:00Z', '2026-11-13T14:33:00Z', '2026-11-17T07:09:00Z', '2026-11-20T23:44:00Z', '2026-11-24T16:20:00Z',
        '2026-11-28T08:55:00Z', '2026-12-02T01:31:00Z', '2026-12-05T18:06:00Z'].map((iso) => moonPhase(Date.parse(iso))),
    ).toEqual(['new', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'full', 'waningGibbous', 'lastQuarter', 'waningCrescent'])
  })

  it('keeps the point below the moon within its reach', () => {
    for (let day = 0; day < 60; day++) {
      const point = subLunarPoint(Date.UTC(2026, 0, 1) + day * DAY)
      expect(Math.abs(point.lat)).toBeLessThanOrEqual(29)
      expect(Math.abs(point.lng)).toBeLessThanOrEqual(180)
    }
  })

  it('is high over Cologne on a waxing gibbous evening', () => {
    expect(moonAltitude(50.87, 7.14, Date.parse('2026-11-20T21:00:00Z'))).toBeCloseTo(44.3, 0)
  })

  it('is below the horizon at dawn over the Netherlands', () => {
    expect(moonAltitude(51.79, 4.25, Date.parse('2026-11-14T06:38:00Z'))).toBeCloseTo(-45.5, 0)
  })
})
```

- [ ] **Step 2: Run it to see it fail.** Run `npx vitest run tests/facts/moonPosition.test.ts`. Expected: FAIL, because the module doesn't exist.

- [ ] **Step 3: Write it.** Create `src/facts/moonPosition.ts`:

```ts
import type { GeoPoint } from '../map/greatCircle'

/**
 * Where the moon is (Stage 2 spec §4.5): the point it's straight above, ported from crewlu-globe's subLunarPoint
 * (src/astro/moon.ts, Paul Schlyter's method, good to a degree or two, plenty to say whether it's up), and its height
 * at a place. Its phase is the site's own moonPhase (src/time/moon.ts).
 */

const rev = (x: number) => ((x % 360) + 360) % 360
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** The point on the earth with the moon straight overhead at `t`, in degrees, longitude east positive. */
export function subLunarPoint(t: number): GeoPoint {
  const d = t / 86_400_000 + 2440587.5 - 2451543.5 // days from Schlyter's epoch
  const node = rev(125.1228 - 0.0529538083 * d)
  const inclination = 5.1454
  const perigee = rev(318.0634 + 0.1643573223 * d)
  const meanDistance = 60.2666
  const eccentricity = 0.0549
  const meanAnomaly = rev(115.3654 + 13.0649929509 * d)

  let eccentricAnomaly = meanAnomaly + deg(eccentricity * Math.sin(rad(meanAnomaly)) * (1 + eccentricity * Math.cos(rad(meanAnomaly))))
  for (let k = 0; k < 4; k++) {
    eccentricAnomaly -= (eccentricAnomaly - deg(eccentricity * Math.sin(rad(eccentricAnomaly))) - meanAnomaly) /
      (1 - eccentricity * Math.cos(rad(eccentricAnomaly)))
  }

  const x = meanDistance * (Math.cos(rad(eccentricAnomaly)) - eccentricity)
  const y = meanDistance * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(rad(eccentricAnomaly))
  const trueAnomaly = rev(deg(Math.atan2(y, x)))
  const distance = Math.hypot(x, y)
  const argument = rad(trueAnomaly + perigee)

  const xh = distance * (Math.cos(rad(node)) * Math.cos(argument) - Math.sin(rad(node)) * Math.sin(argument) * Math.cos(rad(inclination)))
  const yh = distance * (Math.sin(rad(node)) * Math.cos(argument) + Math.cos(rad(node)) * Math.sin(argument) * Math.cos(rad(inclination)))
  const zh = distance * Math.sin(argument) * Math.sin(rad(inclination))
  const eclipticLongitude = rad(rev(deg(Math.atan2(yh, xh))))
  const eclipticLatitude = Math.atan2(zh, Math.hypot(xh, yh))

  const obliquity = rad(23.4393 - 3.563e-7 * d)
  const xe = Math.cos(eclipticLongitude) * Math.cos(eclipticLatitude)
  const ye = Math.sin(eclipticLongitude) * Math.cos(eclipticLatitude) * Math.cos(obliquity) - Math.sin(eclipticLatitude) * Math.sin(obliquity)
  const ze = Math.sin(eclipticLongitude) * Math.cos(eclipticLatitude) * Math.sin(obliquity) + Math.sin(eclipticLatitude) * Math.cos(obliquity)
  const rightAscension = rev(deg(Math.atan2(ye, xe)))
  const declination = deg(Math.atan2(ze, Math.hypot(xe, ye)))

  const siderealTime = rev(280.46061837 + 360.98564736629 * (t / 86_400_000 + 2440587.5 - 2451545.0))
  return { lat: declination, lng: ((rightAscension - siderealTime + 540) % 360) - 180 }
}

/** The moon's height above the horizon at a place, in degrees. Its parallax, about a degree, is left out (§4.5). */
export function moonAltitude(lat: number, lng: number, t: number): number {
  const moon = subLunarPoint(t)
  const sine = Math.sin(rad(lat)) * Math.sin(rad(moon.lat)) + Math.cos(rad(lat)) * Math.cos(rad(moon.lat)) * Math.cos(rad(lng - moon.lng))
  return deg(Math.asin(Math.min(Math.max(sine, -1), 1)))
}
```

- [ ] **Step 4: Run it to see it pass.** Run the same command. Expected: PASS.

- [ ] **Step 5: Ask to commit.** Suggested message: `The moon's sub-lunar point and height, ported from crewlu-globe, for the trip map's sky (Stage 2 spec §4.5)`

**Batch A review:** dispatch `superpowers:code-reviewer` (sonnet) on Tasks 2–7 against the Stage 2 spec §7, §10 and §4.5 and this plan.

---
### Task 8: 2A's data, and the comparisons

The site's copies of `geography.json` and `comparisons.json` (Stage 2 spec §9, §10), and "Like driving coast to coast" (§4.9). This task ports 2A's Tasks 2–3.

**Files:**
- Create (copies): `public/data/geography.json`, `public/data/comparisons.json`
- Create: `src/facts/comparisons.ts`
- Test: `tests/facts/comparisons.test.ts`

- [ ] **Step 1: Port check.** Run:

```bash
git -C /Users/toddanderson/Dev/Crewluv log --oneline -1 feature/trip-map-facts -- Crewluv/Resources/TripMap/geography.json; git -C /Users/toddanderson/Dev/Crewluv log --oneline -1 feature/trip-map-facts -- Crewluv/Resources/TripMap/comparisons.json Crewluv/Services/TripMap/Facts/ComparisonPicker.swift CrewluvTests/ComparisonPickerTests.swift
```

  - Either command printing nothing means 2A hasn't committed that yet. Tell Todd this task waits for 2A's Task 2 (`geography.json`) or Task 3 (`comparisons.json`, `ComparisonPicker`), and stop.
  - Otherwise, read `ComparisonPicker.swift` and its tests with `git -C /Users/toddanderson/Dev/Crewluv show feature/trip-map-facts:<path>`. Compare them with 2A's plan, Task 3 (`git -C /Users/toddanderson/Dev/Crewluv show feature/trip-map-facts:docs/superpowers/plans/2026-11-13-moving-map-stage2a-app.md`). Where the committed Swift differs, change the code and tests below to match (ground rule 6).

- [ ] **Step 2: Copy the data.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website" && for name in geography comparisons; do git -C /Users/toddanderson/Dev/Crewluv show "feature/trip-map-facts:Crewluv/Resources/TripMap/$name.json" > "public/data/$name.json"; done; ls -l public/data/geography.json public/data/comparisons.json
```

  Expected: `geography.json` about 500 KB or less (spec §9.1), and `comparisons.json` about 1 KB.

- [ ] **Step 3: Write the failing test.** Create `tests/facts/comparisons.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { comparisonFor, parseComparisons, timesText } from '../../src/facts/comparisons'

/** The site's copy of the app's comparisons.json. */
const site = parseComparisons(JSON.parse(readFileSync(new URL('../../public/data/comparisons.json', import.meta.url), 'utf8')))

describe('what a distance is like (Stage 2 spec §4.9, §9.2)', () => {
  it('reads the app’s eleven', () => {
    expect(site).toHaveLength(11)
  })

  it('uses the one phrase about once', () => {
    expect(comparisonFor(site, 4_100)).toBe('Like sailing the length of the Nile')
    expect(comparisonFor(site, 2_980)).toBe('Like driving coast to coast')
  })

  it('says twice', () => {
    expect(comparisonFor(site, 600)).toBe('Like rafting the Grand Canyon twice')
  })

  it('says the count from three up', () => {
    expect(comparisonFor(site, 9_800)).toBe('Like driving the Alaska Highway 7 times')
    expect(comparisonFor(site, 200)).toBe('Like sailing the Panama Canal 4 times')
  })

  it('puts the number in the middle for marathons', () => {
    expect(comparisonFor([{ miles: 26.2, one: 'Like running a marathon', many: 'Like running {n} marathons' }], 26.2 * 7)).toBe('Like running 7 marathons')
  })

  it('has none outside one to ten times', () => {
    expect(comparisonFor(site, 10)).toBeNull()
    expect(comparisonFor(site, 300_000)).toBeNull()
  })

  it('gives a half to the smaller number', () => {
    const entries = [{ miles: 100, one: 'Once', many: '{n} times' }]
    expect(comparisonFor(entries, 150)).toBe('Once')
    expect(comparisonFor(entries, 151)).toBe('2 times')
  })

  it('breaks a tie by the smaller number, then the earlier entry', () => {
    const entries = [
      { miles: 100, one: 'A once', many: 'A {n}' },
      { miles: 50, one: 'B once', many: 'B {n}' },
      { miles: 100, one: 'C once', many: 'C {n}' },
    ]
    // 200 mi is exactly 2 × A, 4 × B and 2 × C: the smaller number wins, then the earlier entry.
    expect(comparisonFor(entries, 200)).toBe('A 2')
  })

  it('says twice, then “3 times”', () => {
    expect(timesText(2)).toBe('twice')
    expect(timesText(3)).toBe('3 times')
  })

  it('leaves out entries it can’t read', () => {
    expect(parseComparisons([{ miles: 5, one: 'Once', many: '{n} times' }, { miles: 'far' }, null])).toEqual([{ miles: 5, one: 'Once', many: '{n} times' }])
    expect(parseComparisons({})).toEqual([])
  })
})
```

- [ ] **Step 4: Run it to see it fail.** Run `npx vitest run tests/facts/comparisons.test.ts`. Expected: FAIL, because the module doesn't exist.

- [ ] **Step 5: Write it.** Create `src/facts/comparisons.ts`:

```ts
/**
 * What a distance is like (Stage 2 spec §4.9): "Like driving coast to coast", "Like rafting the Grand Canyon twice", as
 * the app's ComparisonPicker. The entries are public/data/comparisons.json, a copy of the app's (§9.2).
 */
export interface Comparison {
  miles: number
  /** Used once: "Like driving coast to coast". */
  one: string
  /** Used 2 to 10 times. `{n}` is the number and `{times}` is "twice" or "3 times". */
  many: string
}

/** comparisons.json's entries. Anything it can't read is left out. */
export function parseComparisons(json: unknown): Comparison[] {
  if (!Array.isArray(json)) return []
  return json.filter((e): e is Comparison =>
    typeof e === 'object' && e !== null && typeof e.miles === 'number' && typeof e.one === 'string' && typeof e.many === 'string')
    .map(({ miles, one, many }) => ({ miles, one, many }))
}

/** "twice", "3 times". */
export const timesText = (count: number) => (count === 2 ? 'twice' : `${count} times`)

/**
 * The entry whose multiple of `miles` is closest to a whole number from 1 to 10, in words. Ties go to the smaller number,
 * then to the earlier entry. Null when no entry fits.
 */
export function comparisonFor(entries: Comparison[], miles: number): string | null {
  let best: { entry: Comparison; count: number; error: number } | null = null
  for (const entry of entries) {
    if (!(entry.miles > 0)) continue
    const multiple = miles / entry.miles
    // The nearest whole number, with a half going to the smaller one.
    const count = Math.ceil(multiple - 0.5)
    if (count < 1 || count > 10) continue
    const error = Math.abs(multiple - count)
    if (best && (error > best.error || (error === best.error && count >= best.count))) continue
    best = { entry, count, error }
  }
  if (!best) return null
  if (best.count === 1) return best.entry.one
  return best.entry.many.replace(/\{n\}/g, String(best.count)).replace(/\{times\}/g, timesText(best.count))
}
```

- [ ] **Step 6: Run it to see it pass.** Run the same command. Expected: PASS.

- [ ] **Step 7: Ask to commit.** The files are `public/data/geography.json`, `public/data/comparisons.json`, `src/facts/comparisons.ts` and its test. Suggested message: `The app's geography.json and comparisons.json, copied in, and what a distance is like (Stage 2 spec §4.9, §9)`

---

### Task 9: What's under the plane

A state or province, else a country, else a named water, and a city of a million or more within 40 mi (Stage 2 spec §4.1). This task ports 2A's Task 4, and adds the facts tests' shared helpers.

**Files:**
- Create: `src/facts/geography.ts`
- Create: `tests/facts/factsTestData.ts`
- Test: `tests/facts/geography.test.ts`

- [ ] **Step 1: Port check.** Run:

```bash
git -C /Users/toddanderson/Dev/Crewluv log --oneline -1 feature/trip-map-facts -- Crewluv/Services/TripMap/Facts/Geography.swift CrewluvTests/GeographyTests.swift CrewluvTests/Helpers/FactsTestData.swift
```

  - Nothing printed: tell Todd this task waits for 2A's Task 4, and stop.
  - Otherwise, read the three files and compare them with 2A's plan, Task 4. Where the committed Swift differs, change the code and tests below to match (ground rule 6).

- [ ] **Step 2: Write the test helpers.** Create `tests/facts/factsTestData.ts`:

```ts
import { readFileSync } from 'node:fs'
import { parseComparisons, type Comparison } from '../../src/facts/comparisons'
import { makeGeography, parseGeography, type Area, type AreaKind, type Geography } from '../../src/facts/geography'
import type { AirportMark, MapLeg } from '../../src/map/tripMap'

/**
 * Made-up places along the equator, where a fraction of the way is a fraction of the longitude, and flights across them
 * at the March equinox, so the facts' tests can be worked out by hand (Stage 2 spec §12). The app's FactsTestData.
 */

const MINUTE = 60_000

/** A rectangle a degree either side of the equator, from `west`° to `east`°. */
export function box(name: string, kind: AreaKind, west: number, east: number, country: string | null = null): Area {
  return { name, kind, country, box: [west, -1, east, 1], rings: [[west, -1, east, -1, east, 1, west, 1]] }
}

/**
 * Along the equator: Alpha to 5° E; Bravo to 12° E, with a Wedge 0.3° (about 21 mi) wide at 9° E that the hold rule
 * drops; then the Test Sea to 21° E. Testville sits 0.3° north of 6° E.
 */
export const EQUATOR: Geography = makeGeography(
  [box('Wedge', 'country', 9, 9.3), box('Alpha', 'country', -1, 5), box('Bravo', 'country', 5, 12), box('the Test Sea', 'water', 12, 21)],
  [{ name: 'Testville', lat: 0.3, lon: 6 }],
)

export function mark(code: string, lat: number, lng: number, city: string = code, timeZone: string | null = null): AirportMark {
  return { code, city, place: { lat, lng }, timeZone }
}

/** 2026-03-20 10:00 UTC, the March equinox: 6:00 AM in Louisville. */
export const EQUINOX = Date.UTC(2026, 2, 20, 10)

/**
 * A flight along the equator from `west`° to `east`° longitude: 3 h 22 min from gate to gate, so in the air from 10:15
 * to 13:15 UTC with the taxi allowances, a tenth of the way every 18 minutes.
 */
export function equatorFlight(west: number, east: number, departure = EQUINOX, id = 'eq'): MapLeg {
  return {
    id, kind: 'flight', origin: mark(`E${west}`, 0, west), destination: mark(`E${east}`, 0, east),
    start: departure, end: departure + 202 * MINUTE, flightNumber: 'TST1',
  }
}

const readJson = (path: string): unknown => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'))

let geography: Geography | null = null

/** The site's copy of the app's geography.json, read once. */
export const appGeography = (): Geography => (geography ??= parseGeography(readJson('public/data/geography.json')))

/** The site's copy of the app's comparisons.json. */
export const appComparisons = (): Comparison[] => parseComparisons(readJson('public/data/comparisons.json'))
```

- [ ] **Step 3: Write the failing test.** Create `tests/facts/geography.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { cityNear, makeGeography, parseGeography, placeAt, type Area } from '../../src/facts/geography'
import { appGeography, box, EQUATOR } from './factsTestData'

const at = (lat: number, lng: number) => ({ lat, lng })

describe('what’s under a point (Stage 2 spec §4.1)', () => {
  it('gives a state inside its country, and the country outside the state', () => {
    const geography = makeGeography([box('Delta', 'country', 0, 10), box('North', 'state', 0, 5, 'Delta')], [])
    expect(placeAt(geography, at(0, 2))).toEqual({ name: 'North', kind: 'state', country: 'Delta' })
    expect(placeAt(geography, at(0, 7))).toEqual({ name: 'Delta', kind: 'country', country: 'Delta' })
  })

  it('tries land before water', () => {
    const geography = makeGeography([box('the Sea', 'water', 0, 10), box('Island', 'country', 4, 6)], [])
    expect(placeAt(geography, at(0, 5))?.name).toBe('Island')
    expect(placeAt(geography, at(0, 8))).toEqual({ name: 'the Sea', kind: 'water', country: null })
  })

  it('is null outside everything', () => {
    expect(placeAt(EQUATOR, at(10, 5))).toBeNull()
  })

  it('counts a point in a hole as outside', () => {
    const ringed: Area = { name: 'Ring', kind: 'country', country: null, box: [0, -5, 10, 5], rings: [[0, -5, 10, -5, 10, 5, 0, 5], [4, -1, 6, -1, 6, 1, 4, 1]] }
    const geography = makeGeography([ringed], [])
    expect(placeAt(geography, at(0, 2))?.name).toBe('Ring')
    expect(placeAt(geography, at(0, 5))).toBeNull()
  })

  it('counts both of two separate rings', () => {
    const twoParts: Area = { name: 'Islands', kind: 'country', country: null, box: [0, -1, 20, 1], rings: [[0, -1, 2, -1, 2, 1, 0, 1], [18, -1, 20, -1, 20, 1, 18, 1]] }
    const geography = makeGeography([twoParts], [])
    expect(placeAt(geography, at(0, 1))?.name).toBe('Islands')
    expect(placeAt(geography, at(0, 19))?.name).toBe('Islands')
    expect(placeAt(geography, at(0, 10))).toBeNull()
  })

  it('wraps a longitude past the date line', () => {
    expect(placeAt(makeGeography([box('East', 'country', -175, -165)], []), at(0, 190))?.name).toBe('East')
  })

  it('finds the nearest city within 40 miles', () => {
    const geography = makeGeography([], [{ name: 'Near', lat: 0.3, lon: 6 }, { name: 'Nearer', lat: 0.1, lon: 6 }])
    expect(cityNear(geography, at(0, 6))?.name).toBe('Nearer')
  })

  it('finds none farther', () => {
    // 0.6° of latitude is about 41 mi.
    expect(cityNear(EQUATOR, at(-0.3, 6))).toBeNull()
  })

  it('reads the file’s format, leaving out what it can’t read', () => {
    const geography = parseGeography({
      source: 'test',
      areas: [
        { name: 'Kansas', kind: 'state', country: 'the United States', box: [-102, 37, -94.6, 40], rings: [[-102, 37, -94.6, 37, -94.6, 40, -102, 40]] },
        { name: 'Nowhere', kind: 'moon', box: [0, 0, 1, 1], rings: [[0, 0, 1, 0, 1, 1]] },
        { name: 'Broken', kind: 'country', box: [0, 0], rings: [] },
      ],
      cities: [{ name: 'Wichita', lat: 37.69, lon: -97.34 }, { name: 'Nowhere' }],
    })
    expect(geography.areas.map((a) => a.name)).toEqual(['Kansas'])
    expect(placeAt(geography, at(38.5, -98.5))).toEqual({ name: 'Kansas', kind: 'state', country: 'the United States' })
    expect(geography.cities.map((c) => c.name)).toEqual(['Wichita'])
    expect(parseGeography(null).areas).toEqual([])
  })

  it('finds a state, a province, a country, a sea and a city in the site’s copy of the app’s file (§12.2)', () => {
    const geography = appGeography()
    expect(placeAt(geography, at(38.5, -98.5))?.name).toBe('Kansas')
    expect(placeAt(geography, at(50.0, -85.0))?.name).toBe('Ontario')
    expect(placeAt(geography, at(51.0, 10.0))?.name).toBe('Germany')
    expect(placeAt(geography, at(58.0, -54.0))?.name).toBe('the Labrador Sea')
    expect(cityNear(geography, at(45.55, -73.7))?.name).toBe('Montréal')
  })
})
```

- [ ] **Step 4: Run it to see it fail.** Run `npx vitest run tests/facts/geography.test.ts`. Expected: FAIL, because the module doesn't exist.

- [ ] **Step 5: Write it.** Create `src/facts/geography.ts`:

```ts
import { distanceMeters, METERS_PER_MILE, type GeoPoint } from '../map/greatCircle'

/**
 * What's under a point on the earth (Stage 2 spec §4.1), as the app's Geography: a US state or Canadian province, else a
 * country, else a named sea or ocean, and any city of a million or more within 40 mi. Read from
 * public/data/geography.json, a copy of the app's, which its scripts/build-geography.mjs makes from Natural Earth (§9.1).
 */

export type AreaKind = 'state' | 'province' | 'country' | 'water'

/** What's under a point, named as the facts read it: "Kansas", "the Netherlands", "the Labrador Sea". */
export interface Place {
  name: string
  kind: AreaKind
  /** The country a state or province is in, or the country itself. Null over water. */
  country: string | null
}

export interface Area {
  name: string
  kind: AreaKind
  /** For a state or province, its country. */
  country: string | null
  /** West, south, east and north edges, in degrees. */
  box: [number, number, number, number]
  /** Each ring as longitude, latitude, longitude, latitude, … */
  rings: number[][]
}

export interface City {
  name: string
  lat: number
  lon: number
}

export interface Geography {
  areas: Area[]
  cities: City[]
  /** The areas in the order they're tried: states and provinces, then countries, then waters. */
  lookupOrder: Area[][]
}

/** A city of a million or more this close adds "near Montréal" (§4.1). */
export const CITY_RADIUS_M = 40 * METERS_PER_MILE

export function makeGeography(areas: Area[], cities: City[]): Geography {
  return {
    areas,
    cities,
    lookupOrder: [
      areas.filter((a) => a.kind === 'state' || a.kind === 'province'),
      areas.filter((a) => a.kind === 'country'),
      areas.filter((a) => a.kind === 'water'),
    ],
  }
}

/** No places at all: what the facts use when geography.json can't be had, so they go on without places (§11). */
export const EMPTY_GEOGRAPHY: Geography = makeGeography([], [])

const KINDS: readonly string[] = ['state', 'province', 'country', 'water']
const isNumberList = (v: unknown): v is number[] => Array.isArray(v) && v.every((n) => typeof n === 'number' && Number.isFinite(n))
const record = (v: unknown): Record<string, unknown> | null => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null)

function parseArea(value: unknown): Area | null {
  const a = record(value)
  if (!a || typeof a.name !== 'string' || typeof a.kind !== 'string' || !KINDS.includes(a.kind)) return null
  if (!isNumberList(a.box) || a.box.length !== 4 || !Array.isArray(a.rings)) return null
  const rings = a.rings.filter((r): r is number[] => isNumberList(r) && r.length >= 6 && r.length % 2 === 0)
  if (rings.length === 0) return null
  const [west, south, east, north] = a.box
  return { name: a.name, kind: a.kind as AreaKind, country: typeof a.country === 'string' ? a.country : null, box: [west, south, east, north], rings }
}

function parseCity(value: unknown): City | null {
  const c = record(value)
  if (!c || typeof c.name !== 'string' || typeof c.lat !== 'number' || typeof c.lon !== 'number') return null
  return { name: c.name, lat: c.lat, lon: c.lon }
}

/** geography.json's areas and cities. Anything it can't read is left out rather than looked up wrong. */
export function parseGeography(json: unknown): Geography {
  const file = record(json)
  const areas = Array.isArray(file?.areas) ? file.areas.map(parseArea).filter((a): a is Area => a != null) : []
  const cities = Array.isArray(file?.cities) ? file.cities.map(parseCity).filter((c): c is City => c != null) : []
  return makeGeography(areas, cities)
}

/** True when both are the same place. */
export const samePlace = (a: Place | null, b: Place | null) =>
  a != null && b != null && a.name === b.name && a.kind === b.kind && a.country === b.country

const placeOf = (area: Area): Place => ({ name: area.name, kind: area.kind, country: area.kind === 'water' ? null : (area.country ?? area.name) })

/** Even-odd ray casting on longitude and latitude, for rings that don't cross the date line: Natural Earth splits its shapes there. */
function ringContains(ring: number[], lat: number, lng: number): boolean {
  const count = ring.length / 2
  let inside = false
  for (let current = 0, previous = count - 1; current < count; previous = current++) {
    const currentLng = ring[2 * current]
    const currentLat = ring[2 * current + 1]
    const previousLng = ring[2 * previous]
    const previousLat = ring[2 * previous + 1]
    if ((currentLat > lat) !== (previousLat > lat)) {
      const crossing = ((previousLng - currentLng) * (lat - currentLat)) / (previousLat - currentLat) + currentLng
      if (lng < crossing) inside = !inside
    }
  }
  return inside
}

/** Inside when an odd number of the rings hold the point, so a hole (Lesotho in South Africa) is outside. Only areas whose box holds it are tested. */
function areaContains(area: Area, lat: number, lng: number): boolean {
  const [west, south, east, north] = area.box
  if (lng < west || lat < south || lng > east || lat > north) return false
  return area.rings.filter((ring) => ringContains(ring, lat, lng)).length % 2 === 1
}

/** A longitude within −180…180. */
const wrapped = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180

/** The state or province, else the country, else the named water under `point`, or null. */
export function placeAt(geography: Geography, point: GeoPoint): Place | null {
  const lng = wrapped(point.lng)
  for (const areas of geography.lookupOrder) {
    const area = areas.find((a) => areaContains(a, point.lat, lng))
    if (area) return placeOf(area)
  }
  return null
}

/** The nearest city of a million or more within 40 mi of `point`, or null. */
export function cityNear(geography: Geography, point: GeoPoint): City | null {
  let best: { city: City; meters: number } | null = null
  for (const city of geography.cities) {
    const meters = distanceMeters(point, { lat: city.lat, lng: city.lon })
    if (meters <= CITY_RADIUS_M && (!best || meters < best.meters)) best = { city, meters }
  }
  return best?.city ?? null
}
```

- [ ] **Step 6: Run it to see it pass.** Run the same command. Expected: PASS.
  - If the site's-copy test fails, the generated file names that place differently. Tell Todd what it says. 2A's `FactsCasesTests` will show the same.

- [ ] **Step 7: Ask to commit.** Suggested message: `What's under the plane: a state or province, a country or a named water, and a city nearby (Stage 2 spec §4.1)`

---

### Task 10: Times along a flight

A story keeps fractions along the route, and the schedule turns them into times (Stage 2 spec §4.2). This task ports 2A's Task 5, and adds where the schedule has the pilot at a time.

**Files:**
- Modify: `src/map/flightProgress.ts` (add after `scheduledFraction`)
- Modify: `src/map/tripMap.ts` (add after `positionAt`)
- Test: `tests/map/flightProgress.test.ts`, `tests/map/tripMap.test.ts` (add a `describe` at the end of each)

- [ ] **Step 1: Port check.** Run:

```bash
git -C /Users/toddanderson/Dev/Crewluv log --oneline -1 feature/trip-map-facts -- Crewluv/Services/TripMap/FlightProgress.swift Crewluv/Services/TripMap/MapLeg.swift
```

  - Nothing printed: tell Todd this task waits for 2A's Task 5, and stop.
  - Otherwise, read `git -C /Users/toddanderson/Dev/Crewluv diff 984e87c feature/trip-map-facts -- Crewluv/Services/TripMap/FlightProgress.swift Crewluv/Services/TripMap/MapLeg.swift CrewluvTests/FlightProgressTests.swift`, and compare it with 2A's plan, Task 5. Where the committed Swift differs, change the code and tests below to match (ground rule 6).

- [ ] **Step 2: Write the failing tests.** In `tests/map/flightProgress.test.ts`, add `scheduledTime` to the import from `'../../src/map/flightProgress'`, and add at the end of the file:

```ts
describe('from a fraction to a time (Stage 2 spec §4.2)', () => {
  const departure = Date.UTC(2026, 2, 20, 10)

  it('is steady along the airborne window', () => {
    const arrival = departure + 202 * MINUTE
    expect(scheduledTime(departure, arrival, 0)).toBe(departure + 15 * MINUTE)
    expect(scheduledTime(departure, arrival, 0.5)).toBe(departure + 105 * MINUTE)
    expect(scheduledTime(departure, arrival, 1)).toBe(departure + 195 * MINUTE)
  })

  it('is the inverse of scheduledFraction', () => {
    const arrival = departure + 8 * 60 * MINUTE
    expect(scheduledFraction(departure, arrival, scheduledTime(departure, arrival, 0.37)!)).toBeCloseTo(0.37, 9)
  })

  it('uses the whole block for a short one', () => {
    expect(scheduledTime(departure, departure + 20 * MINUTE, 0.5)).toBe(departure + 10 * MINUTE)
  })

  it('is null with no block', () => {
    expect(scheduledTime(departure, departure, 0.5)).toBeNull()
  })
})
```

  In `tests/map/tripMap.test.ts`, add `legProgress`, `positionAt`, `positionAtTime` and `timeAtFraction` to the import from `'../../src/map/tripMap'` where they're missing, and `drive` to the import from `'./tripMapLegs'` if it's missing. Then add at the end of the file:

```ts
describe('times and places along a leg (Stage 2 spec §4.2)', () => {
  const options = { isNextTrip: false, home: 'SDF', now: at(0), airports: AIRPORTS }

  it('gives a drive’s time steadily from start to end', () => {
    const leg = makeTripMap([drive('d', 'LEX', 'SDF', 0, 1)], options)!.legs[0]
    expect(timeAtFraction(leg, 0.25)).toBe(at(0.25))
  })

  it('gives a flight’s time with the taxi allowances', () => {
    const leg = makeTripMap(EUROPE, options)!.legs[0]
    expect(timeAtFraction(leg, 0)).toBe(at(0) + 15 * 60_000)
  })

  it('places the pilot where the schedule has them', () => {
    const leg = makeTripMap(EUROPE, options)!.legs[0]
    expect(positionAtTime(leg, at(4))).toEqual(positionAt(leg, legProgress(leg, at(4))))
  })
})
```

- [ ] **Step 3: Run them to see them fail.** Run `npx vitest run tests/map/flightProgress.test.ts tests/map/tripMap.test.ts`. Expected: FAIL.

- [ ] **Step 4: Write them.** In `src/map/flightProgress.ts`, after `scheduledFraction`, add:

```ts
/**
 * When the schedule's plane is `fraction` of the way along its route: the inverse of `scheduledFraction`, for the facts'
 * milestones (Stage 2 spec §4.2). Null when the flight has no time in the air.
 */
export function scheduledTime(departure: number, arrival: number, fraction: number): number | null {
  const window = airborneWindow(departure, arrival)
  if (!window) return null
  return window.start + Math.min(Math.max(fraction, 0), 1) * (window.end - window.start)
}
```

  In `src/map/tripMap.ts`:
  - change the import from `'./flightProgress'` to `import { scheduledFraction, scheduledTime } from './flightProgress'`;
  - after `positionAt`, add:

```ts
/** When the schedule has the pilot `fraction` of the way along (Stage 2 spec §4.2): in the air for a flight, steadily for a drive. */
export function timeAtFraction(leg: MapLeg, fraction: number): number | null {
  if (leg.kind === 'flight') return scheduledTime(leg.start, leg.end, fraction)
  return leg.start + Math.min(Math.max(fraction, 0), 1) * (leg.end - leg.start)
}

/** Where the schedule has the pilot along `leg` at `t`. */
export const positionAtTime = (leg: MapLeg, t: number) => positionAt(leg, legProgress(leg, t))
```

- [ ] **Step 5: Run them to see them pass.** Run the same command, then `npx tsc --noEmit`. Expected: PASS.

- [ ] **Step 6: Ask to commit.** Suggested message: `The time the schedule's plane reaches a fraction of its route, and where it is at a time (Stage 2 spec §4.2)`

---

### Task 11: A flight's story

A flight's places and its closest point to home, as fractions along its route, worked out once (Stage 2 spec §4.2). This task ports 2A's Task 7.

**Files:**
- Create: `src/facts/legStory.ts`
- Test: `tests/facts/legStory.test.ts`

- [ ] **Step 1: Port check.** Run:

```bash
git -C /Users/toddanderson/Dev/Crewluv log --oneline -1 feature/trip-map-facts -- Crewluv/Services/TripMap/Facts/LegStory.swift CrewluvTests/LegStoryTests.swift
```

  - Nothing printed: tell Todd this task waits for 2A's Task 7, and stop.
  - Otherwise, read both files and compare them with 2A's plan, Task 7. Where the committed Swift differs, change the code and tests below to match (ground rule 6).

- [ ] **Step 2: Write the failing test.** Create `tests/facts/legStory.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { makeGeography, type Geography } from '../../src/facts/geography'
import { legStory, placeAtFraction, routeStory } from '../../src/facts/legStory'
import type { GeoPoint } from '../../src/map/greatCircle'
import { box, EQUATOR, equatorFlight, mark } from './factsTestData'

/** Along the equator from 0° to 20° E, where a fraction of the way is a fraction of the longitude. */
const story = (geography: Geography | null = EQUATOR, home: GeoPoint | null = null) => routeStory({ lat: 0, lng: 0 }, { lat: 0, lng: 20 }, geography, home)

describe('a flight’s story (Stage 2 spec §4.2)', () => {
  it('names each place under the route from where it starts', () => {
    const { stretches } = story()
    // The 21-mile Wedge is dropped by the hold rule.
    expect(stretches.map((s) => s.place.name)).toEqual(['Alpha', 'Bravo', 'the Test Sea'])
    expect(stretches[0].start).toBe(0)
    expect(stretches[1].start).toBeCloseTo(0.25, 3)
    expect(stretches[2].start).toBeCloseTo(0.6, 3)
  })

  it('changes nothing across a gap with no place', () => {
    const geography = makeGeography([box('Alpha', 'country', -1, 5), box('Alpha', 'country', 7, 21)], [])
    expect(story(geography).stretches.map((s) => s.place.name)).toEqual(['Alpha'])
  })

  it('counts a place held for 25 miles or more', () => {
    // 0.5° is about 35 mi.
    const geography = makeGeography([box('Wide', 'country', 9, 9.5), box('Alpha', 'country', -1, 21)], [])
    expect(story(geography).stretches.map((s) => s.place.name)).toEqual(['Alpha', 'Wide', 'Alpha'])
  })

  it('has no places without geography', () => {
    expect(story(null).stretches).toEqual([])
  })

  it('reads the place at a fraction', () => {
    const equator = story()
    expect(placeAtFraction(equator, 0.1)?.name).toBe('Alpha')
    // Inside the dropped Wedge.
    expect(placeAtFraction(equator, 0.46)?.name).toBe('Bravo')
    expect(placeAtFraction(equator, 0.9)?.name).toBe('the Test Sea')
  })

  it('finds where the route passes closest to home', () => {
    const closest = story(EQUATOR, { lat: 0.5, lng: 14 }).closestToHome!
    expect(closest.fraction).toBeCloseTo(0.7, 3)
    // Half a degree.
    expect(Math.abs(closest.meters - 55_597)).toBeLessThan(100)
  })

  it('has no closest point over 100 miles away', () => {
    // 2° is about 138 mi.
    expect(story(EQUATOR, { lat: 2, lng: 14 }).closestToHome).toBeNull()
  })

  it('has no closest point at an end of the route', () => {
    expect(story(EQUATOR, { lat: 0.5, lng: 21 }).closestToHome).toBeNull()
  })

  it('leaves home out of a flight from home', () => {
    const leg = equatorFlight(0, 20)
    expect(legStory(leg, null, leg.origin).closestToHome).toBeNull()
    expect(legStory(leg, null, mark('HOME', 0.5, 14)).closestToHome).not.toBeNull()
  })
})
```

- [ ] **Step 3: Run it to see it fail.** Run `npx vitest run tests/facts/legStory.test.ts`. Expected: FAIL, because the module doesn't exist.

- [ ] **Step 4: Write it.** Create `src/facts/legStory.ts`:

```ts
import { distanceMeters, METERS_PER_MILE, pointAlong, type GeoPoint } from '../map/greatCircle'
import type { AirportMark, MapLeg } from '../map/tripMap'
import { placeAt, samePlace, type Geography, type Place } from './geography'

/**
 * A flight's story, worked out once (Stage 2 spec §4.2), as the app's LegStory: the places under its route and its
 * closest point to home, as fractions of the way along, 0 at the departure airport and 1 at the arrival. The schedule
 * turns a fraction into a time (`timeAtFraction`), so a new delay moves every time without redoing the geography.
 */

/** A place under the route, from where it starts. */
export interface Stretch {
  place: Place
  start: number
}

/** The route's closest point to home. */
export interface ClosestToHome {
  fraction: number
  meters: number
}

export interface LegStory {
  /** In order. The first starts at 0. Empty without geography. */
  stretches: Stretch[]
  closestToHome: ClosestToHome | null
}

/** The route is looked up this often. */
export const SAMPLE_SPACING_M = 10 * METERS_PER_MILE
export const MINIMUM_SAMPLES = 16
/** A place counts once the route stays in it this far, so a route along a border doesn't flicker. */
export const HOLD_DISTANCE_M = 25 * METERS_PER_MILE
/** Crossings and the closest point are narrowed down to this. */
export const PRECISION_M = 0.1 * METERS_PER_MILE
/** Home counts when the route passes this close. */
export const HOME_RADIUS_M = 100 * METERS_PER_MILE

interface Route {
  origin: GeoPoint
  destination: GeoPoint
  length: number
  sampleCount: number
  step: number
}

function route(origin: GeoPoint, destination: GeoPoint): Route {
  const length = distanceMeters(origin, destination)
  const sampleCount = Math.max(MINIMUM_SAMPLES, Math.ceil(length / SAMPLE_SPACING_M) + 1)
  return { origin, destination, length, sampleCount, step: 1 / (sampleCount - 1) }
}

const pointOn = (r: Route, fraction: number) => pointAlong(r.origin, r.destination, fraction)

interface Run {
  place: Place
  first: number
  last: number
}

function stretchesAlong(r: Route, geography: Geography): Stretch[] {
  const places = Array.from({ length: r.sampleCount }, (_, i) => placeAt(geography, pointOn(r, i * r.step)))

  // Runs of one place. A sample with no place joins no run, so a gap changes nothing.
  const runs: Run[] = []
  places.forEach((place, index) => {
    if (!place) return
    const last = runs[runs.length - 1]
    if (last && samePlace(last.place, place)) last.last = index
    else runs.push({ place, first: index, last: index })
  })

  // The hold rule: a run shorter than 25 mi goes, and the runs either side of it join if they're one place.
  const spacing = r.length * r.step
  const held: Run[] = []
  for (const run of runs) {
    if ((run.last - run.first + 1) * spacing < HOLD_DISTANCE_M) continue
    const last = held[held.length - 1]
    if (last && samePlace(last.place, run.place)) last.last = run.last
    else held.push({ ...run })
  }

  if (held.length === 0) return []
  const stretches: Stretch[] = [{ place: held[0].place, start: 0 }]
  for (let i = 1; i < held.length; i++) {
    const start = boundary(held[i].place, held[i - 1].last * r.step, held[i].first * r.step, r, geography)
    stretches.push({ place: held[i].place, start })
  }
  return stretches
}

/** Where `place` begins between two fractions, by bisection. */
function boundary(place: Place, after: number, before: number, r: Route, geography: Geography): number {
  let low = after
  let high = before
  while ((high - low) * r.length > PRECISION_M) {
    const middle = (low + high) / 2
    if (samePlace(placeAt(geography, pointOn(r, middle)), place)) high = middle
    else low = middle
  }
  return high
}

function closestPoint(r: Route, home: GeoPoint): ClosestToHome | null {
  const distances = Array.from({ length: r.sampleCount }, (_, i) => distanceMeters(pointOn(r, i * r.step), home))
  let nearest = 0
  distances.forEach((d, i) => {
    if (d < distances[nearest]) nearest = i
  })
  if (nearest === 0 || nearest === r.sampleCount - 1) return null

  // The distance has one minimum between the nearest sample's neighbours: narrow it down by thirds.
  let low = (nearest - 1) * r.step
  let high = (nearest + 1) * r.step
  while ((high - low) * r.length > PRECISION_M) {
    const third = (high - low) / 3
    if (distanceMeters(pointOn(r, low + third), home) < distanceMeters(pointOn(r, high - third), home)) high -= third
    else low += third
  }
  const fraction = (low + high) / 2
  const meters = distanceMeters(pointOn(r, fraction), home)
  return meters <= HOME_RADIUS_M ? { fraction, meters } : null
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

/** The place `fraction` of the way along, or null where no place is known. */
export function placeAtFraction(story: LegStory, fraction: number): Place | null {
  let found: Place | null = null
  for (const stretch of story.stretches) if (stretch.start <= fraction) found = stretch.place
  return found
}
```

- [ ] **Step 5: Run it to see it pass.** Run the same command. Expected: PASS.

- [ ] **Step 6: Ask to commit.** Suggested message: `A flight's story: the places under its route and its closest point to home, worked out once (Stage 2 spec §4.2)`

---

### Task 12: Milestones

Crossings, halfway and the closest point to home, as times (Stage 2 spec §4.3). This task ports 2A's Task 8.

**Files:**
- Create: `src/facts/milestone.ts`
- Test: `tests/facts/milestone.test.ts`

- [ ] **Step 1: Port check.** Run:

```bash
git -C /Users/toddanderson/Dev/Crewluv log --oneline -1 feature/trip-map-facts -- Crewluv/Services/TripMap/Facts/Milestone.swift CrewluvTests/MilestoneTests.swift
```

  - Nothing printed: tell Todd this task waits for 2A's Task 8, and stop.
  - Otherwise, read both files and compare them with 2A's plan, Task 8. Where the committed Swift differs, change the code and tests below to match (ground rule 6).

- [ ] **Step 2: Write the failing test.** Create `tests/facts/milestone.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { makeGeography, type Geography } from '../../src/facts/geography'
import { legStory } from '../../src/facts/legStory'
import { milestones, roundedMiles, type Milestone } from '../../src/facts/milestone'
import { METERS_PER_MILE } from '../../src/map/greatCircle'
import type { AirportMark, MapLeg } from '../../src/map/tripMap'
import { box, EQUATOR, equatorFlight, EQUINOX, mark } from './factsTestData'

const HOUR = 3_600_000
const found = (leg: MapLeg, geography: Geography, home: AirportMark | null = null) => milestones(leg, legStory(leg, geography, home))
/** The milestones without their times: `toEqual` passes over a property that's undefined. */
const what = (list: Milestone[]) => list.map((m) => ({ ...m, time: undefined }))
/** Within 5 seconds, as the app's tests allow. */
const at = (milestone: Milestone, iso: string) => expect(Math.abs(milestone.time - Date.parse(iso))).toBeLessThanOrEqual(5_000)

describe('a flight’s milestones (Stage 2 spec §4.3)', () => {
  it('along the equator, are the crossings, halfway and home, a tenth of the way every 18 minutes', () => {
    const list = found(equatorFlight(0, 20), EQUATOR, mark('HOME', 0.5, 14))
    expect(what(list)).toEqual([
      { kind: 'crossedInto', name: 'Bravo' },
      { kind: 'halfway' },
      { kind: 'outOver', name: 'the Test Sea' },
      { kind: 'closestToHome', miles: 35 },
    ])
    at(list[0], '2026-03-20T11:00:00Z')
    at(list[1], '2026-03-20T11:45:00Z')
    at(list[2], '2026-03-20T12:03:00Z')
    at(list[3], '2026-03-20T12:21:00Z')
  })

  it('names the state at a state line, and the country at a border', () => {
    const geography = makeGeography([
      box('North', 'state', 29, 35.5, 'Delta'),
      box('South', 'state', 35.5, 37, 'Delta'),
      box('Delta', 'country', 29, 37),
      box('Echo', 'country', 37, 41),
    ], [])
    const list = found(equatorFlight(30, 40, EQUINOX + 4 * HOUR), geography)
    expect(what(list)).toEqual([{ kind: 'halfway' }, { kind: 'crossedInto', name: 'South' }, { kind: 'crossedInto', name: 'Echo' }])
    at(list[1], '2026-03-20T15:54:00Z')
    at(list[2], '2026-03-20T16:21:00Z')
  })

  it('isn’t one from one sea into another, but landfall after it names the country', () => {
    const geography = makeGeography([
      box('the Test Sea', 'water', 49, 53),
      box('the Other Sea', 'water', 53, 56),
      box('Foxtrot', 'country', 56, 61),
    ], [])
    const list = found(equatorFlight(50, 60, EQUINOX + 8 * HOUR), geography)
    expect(what(list)).toEqual([{ kind: 'halfway' }, { kind: 'crossedInto', name: 'Foxtrot' }])
    at(list[1], '2026-03-20T20:03:00Z')
  })

  it('isn’t one across a gap where only the country is known', () => {
    const geography = makeGeography([
      box('Kansas', 'state', -1, 5, 'the United States'),
      box('Nebraska', 'state', 6, 21, 'the United States'),
      box('the United States', 'country', -1, 21),
    ], [])
    expect(what(found(equatorFlight(0, 20), geography))).toEqual([{ kind: 'crossedInto', name: 'Nebraska' }, { kind: 'halfway' }])
  })

  it('rounds the distance home to the nearest 5 miles, never under 5', () => {
    expect(roundedMiles(34.55 * METERS_PER_MILE)).toBe(35)
    expect(roundedMiles(52 * METERS_PER_MILE)).toBe(50)
    expect(roundedMiles(53 * METERS_PER_MILE)).toBe(55)
    expect(roundedMiles(2 * METERS_PER_MILE)).toBe(5)
  })
})
```

- [ ] **Step 3: Run it to see it fail.** Run `npx vitest run tests/facts/milestone.test.ts`. Expected: FAIL, because the module doesn't exist.

- [ ] **Step 4: Write it.** Create `src/facts/milestone.ts`:

```ts
import { METERS_PER_MILE } from '../map/greatCircle'
import { timeAtFraction, type MapLeg } from '../map/tripMap'
import { MINUTE } from '../time/zoned'
import type { Place } from './geography'
import type { LegStory } from './legStory'

/**
 * A moment worth a line on a flight (Stage 2 spec §4.3), as the app's Milestone: crossing into a new country, state or
 * province, out over a named sea, halfway, and the closest point to home. Each leads the headline for 5 minutes.
 */
export type MilestoneKind =
  /** A new country, or a new state or province in the same country: "Just crossed into Kansas". */
  | { kind: 'crossedInto'; name: string }
  /** From land onto a named water: "Out over the Atlantic". */
  | { kind: 'outOver'; name: string }
  | { kind: 'halfway' }
  /** The closest the route comes to home, to the nearest 5 mi. */
  | { kind: 'closestToHome'; miles: number }

export type Milestone = MilestoneKind & { time: number }

/** How long a milestone leads the headline. */
export const MILESTONE_HEADLINE_MS = 5 * MINUTE

/** To the nearest 5 mi, and never under 5. */
export function roundedMiles(meters: number): number {
  return Math.max(5, Math.round(meters / METERS_PER_MILE / 5) * 5)
}

/** What moving from one place to the next means, if anything. */
function crossingKind(previous: Place, next: Place): MilestoneKind | null {
  // One sea into another changes the "below" row but isn't a milestone.
  if (next.kind === 'water') return previous.kind === 'water' ? null : { kind: 'outOver', name: next.name }
  // An international border, or landfall, names the country.
  if (next.country !== previous.country) return { kind: 'crossedInto', name: next.country ?? next.name }
  // The same country: a new state or province counts. A gap between two, where only the country is known, doesn't.
  return next.kind === 'country' ? null : { kind: 'crossedInto', name: next.name }
}

/** A flight's milestones in time order, from its story and its delay-moved times. */
export function milestones(leg: MapLeg, story: LegStory): Milestone[] {
  const found: { what: MilestoneKind; fraction: number }[] = []
  for (let i = 1; i < story.stretches.length; i++) {
    const what = crossingKind(story.stretches[i - 1].place, story.stretches[i].place)
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
}
```

- [ ] **Step 5: Run it to see it pass.** Run the same command, then `npx tsc --noEmit`. Expected: PASS.

- [ ] **Step 6: Ask to commit.** Suggested message: `A flight's milestones: crossings, halfway and the closest point to home (Stage 2 spec §4.3)`

---

### Task 13: The sky from the cockpit

Sunrises and sunsets at cruise and when the people below see them, chasing the sun, and the moon (Stage 2 spec §4.5). Also the next sunrise or sunset on the ground at an airport (§5.3). This task ports 2A's Task 9 onto the site's own sun (`src/time/sun.ts`, see "The sun" above).

**Files:**
- Create: `src/facts/sky.ts`
- Test: `tests/facts/sky.test.ts`

- [ ] **Step 1: Port check.** Run:

```bash
git -C /Users/toddanderson/Dev/Crewluv log --oneline -1 feature/trip-map-facts -- Crewluv/Services/TripMap/Facts/SkyFacts.swift CrewluvTests/SkyFactsTests.swift
```

  - Nothing printed: tell Todd this task waits for 2A's Task 9, and stop.
  - Otherwise, read both files and compare them with 2A's plan, Task 9. Where the committed Swift differs, change the code and tests below to match (ground rule 6). The one deliberate difference stays: the site's `sunAltitude` and `subsolarPoint` stand in for the app's `SolarPosition`.

- [ ] **Step 2: Write the failing test.** Create `tests/facts/sky.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { chase, COCKPIT_HORIZON, horizonDip, moonSight, nextGroundSunEvent, sunEvents } from '../../src/facts/sky'
import { airportMark, makeTripMap, type MapLeg } from '../../src/map/tripMap'
import { AIRPORTS, at, drive, HOUR } from '../map/tripMapLegs'

/** A flight between two of the test airports, `hours` long. */
function flight(from: string, to: string, departing: string, hours: number): MapLeg {
  const start = Date.parse(departing)
  return { id: `${from}${to}`, kind: 'flight', origin: airportMark(from, AIRPORTS)!, destination: airportMark(to, AIRPORTS)!, start, end: start + hours * HOUR, flightNumber: null }
}
const near = (time: number, iso: string) => expect(Math.abs(time - Date.parse(iso))).toBeLessThanOrEqual(60_000)
const CGN = { lat: 50.8659, lng: 7.1427 }

describe('the sky from the cockpit (Stage 2 spec §4.5)', () => {
  it('puts the horizon about 3.86° down at 35,000 ft', () => {
    expect(horizonDip(35_000)).toBeCloseTo(3.03, 2)
    expect(COCKPIT_HORIZON).toBeCloseTo(-3.863, 3)
  })

  it('sees one sunset on an evening flight to Europe, about 21 minutes after the people below', () => {
    const events = sunEvents(flight('SDF', 'CGN', '2026-11-13T18:00:00Z', 8))
    expect(events.map((e) => e.kind)).toEqual(['sunset'])
    near(events[0].time, '2026-11-13T20:46:17Z')
    expect(events[0].peopleBelowGap! / 60_000).toBeCloseTo(21.4, 0)
  })

  it('sees one sunrise on an overnight flight to Europe, about 22 minutes before the people below', () => {
    const events = sunEvents(flight('SDF', 'CGN', '2026-11-13T23:00:00Z', 8))
    expect(events.map((e) => e.kind)).toEqual(['sunrise'])
    near(events[0].time, '2026-11-14T06:38:13Z')
    expect(events[0].peopleBelowGap! / 60_000).toBeCloseTo(22.0, 0)
  })

  it('sees none on a daylight flight west', () => {
    expect(sunEvents(flight('CGN', 'SDF', '2026-11-14T13:00:00Z', 9))).toEqual([])
  })

  it('sees none on a drive', () => {
    const leg = makeTripMap([drive('d', 'LEX', 'SDF', 9, 2)], { isNextTrip: false, home: 'SDF', now: at(9), airports: AIRPORTS })!.legs[0]
    expect(sunEvents(leg)).toEqual([])
  })

  it('chases the sun west over the Atlantic in the afternoon', () => {
    expect(chase(flight('CGN', 'SDF', '2026-11-14T13:00:00Z', 9), Date.parse('2026-11-14T15:00:00Z'))).toBe('afternoon')
  })

  it('doesn’t chase it east', () => {
    expect(chase(flight('SDF', 'CGN', '2026-11-13T12:00:00Z', 8), Date.parse('2026-11-13T15:00:00Z'))).toBeNull()
  })

  it('leaves out the moon in daylight', () => {
    expect(moonSight(flight('CGN', 'SDF', '2026-11-14T13:00:00Z', 9), Date.parse('2026-11-14T15:00:00Z'))).toBeNull()
  })

  it('sees a waxing gibbous moon up on a night leaving Cologne', () => {
    expect(moonSight(flight('CGN', 'DXB', '2026-11-20T20:00:00Z', 6), Date.parse('2026-11-20T20:30:00Z'))).toEqual({ phase: 'waxingGibbous', isUp: true })
  })
})

describe('the sun on the ground (Stage 2 spec §5.3)', () => {
  it('in Cologne at night, is tomorrow’s sunrise', () => {
    const event = nextGroundSunEvent(CGN, Date.parse('2026-11-13T20:14:00Z'))!
    expect(event.kind).toBe('sunrise')
    near(event.time, '2026-11-14T06:45:24Z')
  })

  it('in Cologne at noon, is that evening’s sunset', () => {
    const event = nextGroundSunEvent(CGN, Date.parse('2026-11-14T12:00:00Z'))!
    expect(event.kind).toBe('sunset')
    near(event.time, '2026-11-14T15:45:47Z')
  })
})
```

- [ ] **Step 3: Run it to see it fail.** Run `npx vitest run tests/facts/sky.test.ts`. Expected: FAIL, because the module doesn't exist.

- [ ] **Step 4: Write it.** Create `src/facts/sky.ts`:

```ts
import { airborneWindow } from '../map/flightProgress'
import type { GeoPoint } from '../map/greatCircle'
import { positionAtTime, type MapLeg } from '../map/tripMap'
import { moonPhase, type MoonPhase } from '../time/moon'
import { subsolarPoint, SUN_UP_ALTITUDE, sunAltitude } from '../time/sun'
import { DAY, HOUR, MINUTE } from '../time/zoned'
import { moonAltitude } from './moonPosition'

/**
 * The sky from the cockpit (Stage 2 spec §4.5), as the app's SkyFacts: sunrises and sunsets at cruise, when the people
 * below see them, chasing the sun, and the moon. Also the next sunrise or sunset on the ground at an airport (§5.3).
 * It uses the site's own sun (src/time/sun.ts), which the location card's sunrise and sunset use too.
 */

export type SunKind = 'sunrise' | 'sunset'

export interface SunEvent {
  kind: SunKind
  time: number
  /** How much later than the people below the cockpit sees a sunset, or how much earlier a sunrise, in ms, when that's 5 minutes or more. */
  peopleBelowGap: number | null
}

/** Which part of the day stretches while the plane chases the sun. */
export type Chase = 'morning' | 'afternoon'

export interface MoonSight {
  phase: MoonPhase
  isUp: boolean
}

/** The sun's centre at sunrise and sunset on the ground, after refraction. */
export const GROUND_HORIZON = SUN_UP_ALTITUDE
/** The schedule's height in the air. Stage 3 uses the live altitude. */
export const CRUISE_ALTITUDE_FEET = 35_000

/** How far below level the horizon lies from `feet` up, in degrees: 1.76′ × √(height in m). */
export const horizonDip = (feet: number) => (1.76 / 60) * Math.sqrt(Math.max(feet, 0) * 0.3048)

/** The sun's altitude at a cockpit sunrise or sunset at cruise: about −3.86°. */
export const COCKPIT_HORIZON = GROUND_HORIZON - horizonDip(CRUISE_ALTITUDE_FEET)
/** Under this, the cockpit and the people below see it at about the same time. */
export const PEOPLE_BELOW_THRESHOLD_MS = 5 * MINUTE
/** Chasing the sun: its hour angle at the plane moving at under half its usual 15° an hour. */
export const CHASE_RATE = 7.5

const SAMPLE_STEP_MS = 2 * MINUTE
const GROUND_SEARCH_MS = 3 * HOUR
const GROUND_STEP_MS = 10 * MINUTE

/** The sun's altitude at the schedule's plane, in degrees. */
export function sunAltitudeOnLeg(leg: MapLeg, t: number): number {
  const here = positionAtTime(leg, t)
  return sunAltitude(t, here.lat, here.lng)
}

/** Narrows a change of sign in `height` between two moments to `precisionMs`, and gives the middle. */
function crossing(height: (t: number) => number, earlier: number, later: number, isRising: boolean, precisionMs: number): number {
  let low = earlier
  let high = later
  while (high - low > precisionMs) {
    const middle = low + (high - low) / 2
    if (height(middle) > 0 === isRising) high = middle
    else low = middle
  }
  return low + (high - low) / 2
}

/** The sun's height above the ground's sunrise altitude at `place`. */
const groundHeight = (place: GeoPoint) => (t: number) => sunAltitude(t, place.lat, place.lng) - GROUND_HORIZON

/**
 * When the ground under a cockpit event sees the same event, as a gap in ms when that's 5 minutes or more. A sunset
 * reaches the ground first and a sunrise last, so it steps that way until the sun is on the other side of the ground's
 * horizon, up to 3 hours.
 */
function peopleBelowGap(point: GeoPoint, cockpitTime: number, isSunrise: boolean): number | null {
  const height = groundHeight(point)
  const step = isSunrise ? SAMPLE_STEP_MS : -SAMPLE_STEP_MS
  for (let near = cockpitTime; Math.abs(near - cockpitTime) < GROUND_SEARCH_MS; near += step) {
    const far = near + step
    if (height(far) > 0) {
      const ground = isSunrise ? crossing(height, near, far, true, 5_000) : crossing(height, far, near, false, 5_000)
      const gap = Math.abs(cockpitTime - ground)
      return gap >= PEOPLE_BELOW_THRESHOLD_MS ? gap : null
    }
  }
  return null
}

/** The sunrises and sunsets the cockpit sees while the schedule has the flight in the air, in order: sampled every 2 minutes and narrowed to 5 seconds. */
export function sunEvents(leg: MapLeg): SunEvent[] {
  const window = leg.kind === 'flight' ? airborneWindow(leg.start, leg.end) : null
  if (!window) return []
  const height = (t: number) => sunAltitudeOnLeg(leg, t) - COCKPIT_HORIZON
  const times: number[] = []
  for (let t = window.start; t < window.end; t += SAMPLE_STEP_MS) times.push(t)
  times.push(window.end)
  const heights = times.map(height)
  const events: SunEvent[] = []
  for (let i = 1; i < times.length; i++) {
    const isRising = heights[i - 1] <= 0 && heights[i] > 0
    const isSetting = heights[i - 1] > 0 && heights[i] <= 0
    if (!isRising && !isSetting) continue
    const time = crossing(height, times[i - 1], times[i], isRising, 5_000)
    events.push({ kind: isRising ? 'sunrise' : 'sunset', time, peopleBelowGap: peopleBelowGap(positionAtTime(leg, time), time, isRising) })
  }
  return events
}

/** A longitude difference within −180…180. */
const wrapped = (degrees: number) => ((((degrees + 180) % 360) + 360) % 360) - 180

/**
 * While the sun's up at the plane and its hour angle there changes at under 7.5° an hour: the afternoon, or the morning
 * while the sun is east of the plane's meridian.
 */
export function chase(leg: MapLeg, t: number): Chase | null {
  const window = leg.kind === 'flight' ? airborneWindow(leg.start, leg.end) : null
  if (!window || t < window.start || t > window.end || sunAltitudeOnLeg(leg, t) <= COCKPIT_HORIZON) return null
  const here = positionAtTime(leg, t)
  const soon = positionAtTime(leg, t + MINUTE)
  const degreesPerHour = 15 + wrapped(soon.lng - here.lng) * 60
  if (Math.abs(degreesPerHour) >= CHASE_RATE) return null
  return wrapped(here.lng - subsolarPoint(t).longitude) < 0 ? 'morning' : 'afternoon'
}

/** The moon while the sun is below the cockpit's horizon, or null in daylight. */
export function moonSight(leg: MapLeg, t: number): MoonSight | null {
  if (leg.kind !== 'flight' || sunAltitudeOnLeg(leg, t) > COCKPIT_HORIZON) return null
  const here = positionAtTime(leg, t)
  return { phase: moonPhase(t), isUp: moonAltitude(here.lat, here.lng, t) > 0 }
}

/** The next sunrise or sunset on the ground at `place` within a day of `after`: sampled every 10 minutes and narrowed to 30 seconds. */
export function nextGroundSunEvent(place: GeoPoint, after: number): { kind: SunKind; time: number } | null {
  const height = groundHeight(place)
  for (let earlier = after; earlier - after < DAY; earlier += GROUND_STEP_MS) {
    const later = earlier + GROUND_STEP_MS
    const before = height(earlier)
    const next = height(later)
    if (before <= 0 !== next <= 0) {
      const isRising = next > 0
      return { kind: isRising ? 'sunrise' : 'sunset', time: crossing(height, earlier, later, isRising, 30_000) }
    }
  }
  return null
}
```

- [ ] **Step 5: Run it to see it pass.** Run the same command. Expected: PASS. Before this plan was written, a script with these steps found the sunset at 20:46:13, the sunrise at 06:38:13, and the ground events within a second of the app's.

- [ ] **Step 6: Ask to commit.** Suggested message: `The sky from the cockpit: sunrises and sunsets at cruise, the people below, chasing the sun and the moon (Stage 2 spec §4.5)`

---

### Task 14: A trip's totals

Cities, miles, time zones and sunsets from the cockpit, so far or for the whole trip, and the longest flight (Stage 2 spec §4.8). This task ports 2A's Task 10. The trip map model gains the destinations and miles that Stage 1B's words worked out privately.

**Files:**
- Modify: `src/map/tripMap.ts` (add at the end), `src/copy/tripMap.ts`
- Create: `src/facts/tripTotals.ts`
- Test: `tests/facts/tripTotals.test.ts`, `tests/map/tripMap.test.ts` (add a `describe` at the end)

- [ ] **Step 1: Port check.** Run:

```bash
git -C /Users/toddanderson/Dev/Crewluv log --oneline -1 feature/trip-map-facts -- Crewluv/Services/TripMap/Facts/TripTotals.swift CrewluvTests/TripTotalsTests.swift
```

  - Nothing printed: tell Todd this task waits for 2A's Task 10, and stop.
  - Otherwise, read both files and compare them with 2A's plan, Task 10. Where the committed Swift differs, change the code and tests below to match (ground rule 6).

- [ ] **Step 2: Write the failing tests.** In `tests/map/tripMap.test.ts`, add `destinationsOf`, `milesFlown` and `totalMiles` to the import from `'../../src/map/tripMap'`, and add at the end of the file:

```ts
describe('a trip’s destinations and miles (Stage 2 spec §4.8)', () => {
  const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(0), airports: AIRPORTS })!

  it('lists the airports its flights reach, each once, home left out', () => {
    expect(destinationsOf(map.legs, map.home).map((a) => a.code)).toEqual(['CGN', 'DXB'])
  })

  it('counts the miles flown by a moment, and in all', () => {
    expect(milesFlown(map.legs, at(12))).toBe(4_351)
    expect(totalMiles(map.legs)).toBe(14_819)
  })
})
```

  Create `tests/facts/tripTotals.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sunEvents } from '../../src/facts/sky'
import { longestFlight, timeZonesCrossed, totalsSoFar, wholeTotals } from '../../src/facts/tripTotals'
import { makeTripMap, type MapLeg, type TripMap } from '../../src/map/tripMap'
import { AIRPORTS, at, EUROPE, HOUR } from '../map/tripMapLegs'
import { mark } from './factsTestData'

/** Louisville to Cologne to Dubai and home, from 2026-11-13 12:00 UTC. Its one cockpit sunset is on the first flight, at 17:45 UTC. */
const europe = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(0), airports: AIRPORTS })!
const eventsOf = (map: TripMap) => Object.fromEntries(map.legs.map((leg) => [leg.id, sunEvents(leg)]))

function zoned(id: string, from: string | null, to: string | null): MapLeg {
  return { id, kind: 'flight', origin: mark('A', 0, 0, 'A', from), destination: mark('B', 0, 10, 'B', to), start: at(0), end: at(0) + HOUR, flightNumber: null }
}

describe('a trip’s totals (Stage 2 spec §4.8)', () => {
  it('counts the whole Europe trip', () => {
    expect(wholeTotals(europe, eventsOf(europe))).toEqual({ cities: 2, miles: 14_819, timeZones: 18, cockpitSunsets: 1 })
  })

  it('counts the first flight once it has landed', () => {
    expect(totalsSoFar(europe, at(12), eventsOf(europe))).toEqual({ cities: 1, miles: 4_351, timeZones: 6, cockpitSunsets: 1 })
  })

  it('counts only miles in the first flight before its sunset', () => {
    const totals = totalsSoFar(europe, at(4), eventsOf(europe))
    expect(totals.cities).toBe(0)
    expect(totals.timeZones).toBe(0)
    expect(totals.cockpitSunsets).toBe(0)
    expect(totals.miles).toBeGreaterThan(0)
  })

  it('rounds half hours only at the end', () => {
    // 10½ hours.
    expect(timeZonesCrossed([zoned('1', 'America/New_York', 'Asia/Kolkata')])).toBe(11)
    // 1½ and 1½.
    expect(timeZonesCrossed([zoned('1', 'Asia/Kolkata', 'Asia/Dubai'), zoned('2', 'Asia/Dubai', 'Asia/Kolkata')])).toBe(3)
  })

  it('adds nothing for a flight with an unknown zone', () => {
    expect(timeZonesCrossed([zoned('1', 'America/New_York', null)])).toBe(0)
  })

  it('finds the longest flight: Dubai to Louisville', () => {
    expect(longestFlight(europe.legs)?.id).toBe('f3')
  })
})
```

- [ ] **Step 3: Run them to see them fail.** Run `npx vitest run tests/map/tripMap.test.ts tests/facts/tripTotals.test.ts`. Expected: FAIL.

- [ ] **Step 4: The model's destinations and miles.** At the end of `src/map/tripMap.ts`, add:

```ts
/** The airports the flights among `legs` reach, in order, each once, with home left out (moving map spec §5.3). */
export function destinationsOf(legs: MapLeg[], home: AirportMark | null): AirportMark[] {
  const seen = new Set(home ? [home.code] : [])
  return legs.filter((l) => l.kind === 'flight').map((l) => l.destination).filter((a) => !seen.has(a.code) && seen.add(a.code))
}

/** Whole miles flown by `t` along the flights' planned routes, with the one in the air counted in part. */
export function milesFlown(legs: MapLeg[], t: number): number {
  return Math.round(legs.filter((l) => l.kind === 'flight').reduce((sum, l) => sum + legDistanceMeters(l) * legProgress(l, t), 0) / METERS_PER_MILE)
}

/** Whole miles of every flight among `legs`. */
export function totalMiles(legs: MapLeg[]): number {
  return Math.round(legs.filter((l) => l.kind === 'flight').reduce((sum, l) => sum + legDistanceMeters(l), 0) / METERS_PER_MILE)
}
```

  Change the import from `'./greatCircle'` in `src/map/tripMap.ts` to `import { distanceMeters, METERS_PER_MILE, pointAlong, pointsAlong, type GeoPoint } from './greatCircle'`.

- [ ] **Step 5: Stage 1B's words use them.** In `src/copy/tripMap.ts`:
  - add `destinationsOf`, `milesFlown` and `totalMiles` to the import from `'../map/tripMap'`, and remove `legDistanceMeters` and `legProgress` from it if nothing else in the file uses them;
  - replace the private `miles` and `destinations` helpers with:

```ts
const milesText = (miles: number) => miles.toLocaleString('en-US')

/** The airports the trip's flights reach, in order, each once, home left out. */
const destinations = (map: TripMap) => destinationsOf(map.legs, map.home)
```

  - in `statsItems`, replace `const flown = flights.reduce((sum, l) => sum + legDistanceMeters(l) * legProgress(l, t), 0)` and its use with `milesText(milesFlown(map.legs, t))`, and `const total = …` and its use with `milesText(totalMiles(map.legs))`, so the two lines read:

```ts
      ...(flights.length > 0 ? [`${milesText(milesFlown(map.legs, t))} mi so far`] : []),
```

```ts
  const distance = flights.length > 0 ? `${milesText(totalMiles(map.legs))} mi` : ''
```

  - remove the `METERS_PER_MILE` import if nothing else uses it.

- [ ] **Step 6: Write the totals.** Create `src/facts/tripTotals.ts`:

```ts
import { destinationsOf, legDistanceMeters, milesFlown, totalMiles, type MapLeg, type TripMap } from '../map/tripMap'
import { zoneOffsetMinutes } from '../time/zoned'
import type { SunEvent } from './sky'

/**
 * A trip's numbers (Stage 2 spec §4.8), as the app's TripTotals: cities, miles, time zones crossed and sunsets from the
 * cockpit, so far or for the whole trip (a recap, or a forecast of a trip ahead), and its longest flight.
 */
export interface TripTotals {
  cities: number
  miles: number
  timeZones: number
  cockpitSunsets: number
}

/** Each flight's cockpit sunrises and sunsets, by leg id. */
export type SunEventsByLeg = Record<string, SunEvent[]>

const sunsetsBy = (legs: MapLeg[], t: number, events: SunEventsByLeg) =>
  legs.reduce((count, leg) => count + (events[leg.id] ?? []).filter((e) => e.kind === 'sunset' && e.time <= t).length, 0)

/**
 * Each flight's change in UTC offset as a positive number, summed in minutes and rounded to the nearest hour at the
 * end. A flight with an unknown time zone at either end adds nothing.
 */
export function timeZonesCrossed(legs: MapLeg[]): number {
  const minutes = legs.filter((l) => l.kind === 'flight').reduce((sum, leg) => {
    const from = leg.origin.timeZone
    const to = leg.destination.timeZone
    if (!from || !to) return sum
    return sum + Math.abs(zoneOffsetMinutes(leg.end, to) - zoneOffsetMinutes(leg.start, from))
  }, 0)
  return Math.round(minutes / 60)
}

/** Up to `t`: the finished flights, and the miles of the one in the air. */
export function totalsSoFar(map: TripMap, t: number, events: SunEventsByLeg): TripTotals {
  const finished = map.legs.filter((l) => l.kind === 'flight' && l.end <= t)
  return {
    cities: destinationsOf(finished, map.home).length,
    miles: milesFlown(map.legs, t),
    timeZones: timeZonesCrossed(finished),
    cockpitSunsets: sunsetsBy(map.legs, t, events),
  }
}

/** The whole trip. */
export function wholeTotals(map: TripMap, events: SunEventsByLeg): TripTotals {
  return {
    cities: destinationsOf(map.legs, map.home).length,
    miles: totalMiles(map.legs),
    timeZones: timeZonesCrossed(map.legs),
    cockpitSunsets: sunsetsBy(map.legs, Infinity, events),
  }
}

/** The flight with the greatest distance, the first of any tie. */
export function longestFlight(legs: MapLeg[]): MapLeg | null {
  let longest: MapLeg | null = null
  for (const leg of legs) if (leg.kind === 'flight' && (!longest || legDistanceMeters(leg) > legDistanceMeters(longest))) longest = leg
  return longest
}
```

- [ ] **Step 7: Run them to see them pass.** Run the command from Step 3, then `npx vitest run tests/copy/tripMap.test.ts` and `npx tsc --noEmit`. Expected: PASS: Stage 1B's words are unchanged.

- [ ] **Step 8: Ask to commit.** Suggested message: `A trip's totals: cities, miles, time zones, sunsets from the cockpit and the longest flight (Stage 2 spec §4.8)`

**Batch B review:** dispatch `superpowers:code-reviewer` (sonnet) on Tasks 8–14 against the Stage 2 spec §4.1–§4.9 and 2A's committed Swift for each.

---
### Task 15: The facts' words

Every sentence the facts show or speak (Stage 2 spec §4, §5, §6.5). This task ports 2A's Task 11.

**Files:**
- Create: `src/copy/facts.ts`, `src/copy/factsTrip.ts`
- Test: `tests/copy/facts.test.ts`

- [ ] **Step 1: Port check.** Run:

```bash
git -C /Users/toddanderson/Dev/Crewluv log --oneline -1 feature/trip-map-facts -- Crewluv/Services/TripMap/Facts/FactsWording.swift Crewluv/Services/TripMap/Facts/FactsWording+Trip.swift CrewluvTests/FactsWordingTests.swift
```

  - Nothing printed: tell Todd this task waits for 2A's Task 11, and stop.
  - Otherwise, read the three files and compare them with 2A's plan, Task 11. Where the committed Swift differs, change the code and tests below to match (ground rule 6). Wording changes matter most here: the two platforms must say the same things.

- [ ] **Step 2: Write the failing test.** Create `tests/copy/facts.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  averageSpeedText, belowWords, chaseText, closestToHomeText, cockpitCountdown, cockpitEventText, flightTitle, flownText, flyingInto,
  groundSunText, landsText, midLine, milestoneHeadline, milestoneLine, moonText, timeDifferenceText,
} from '../../src/copy/facts'
import { longestText, onTheWayText, recapChip, recapSummary, soFarText, totalsTiles } from '../../src/copy/factsTrip'
import type { MapLeg } from '../../src/map/tripMap'
import { mark } from '../facts/factsTestData'

const NY = 'America/New_York'
/** Friday 2026-11-13, 3:14 PM in Louisville. */
const NOW = Date.UTC(2026, 10, 13, 20, 14)
const MIN = 60_000
const AM = ' AM'
const PM = ' PM'

const louisville = mark('SDF', 38.17, -85.74, 'Louisville', NY)
const cologne = mark('CGN', 50.87, 7.14, 'Cologne', 'Europe/Berlin')
const toCologne: MapLeg = { id: 'f', kind: 'flight', origin: louisville, destination: cologne, start: NOW - 60 * MIN, end: NOW, flightNumber: 'UPS207' }
const home: MapLeg = { ...toCologne, origin: cologne, destination: louisville, flightNumber: null }

describe('milestones in words (Stage 2 spec §4.3)', () => {
  it('leads the headline', () => {
    expect(milestoneHeadline({ kind: 'crossedInto', name: 'Kansas' })).toBe('Just crossed into Kansas')
    expect(milestoneHeadline({ kind: 'outOver', name: 'the Atlantic' })).toBe('Out over the Atlantic')
    expect(milestoneHeadline({ kind: 'halfway' })).toBe('Halfway!')
    expect(milestoneHeadline({ kind: 'closestToHome', miles: 40 })).toBe('Closest to home: 40 mi, wave!')
  })

  it('lists them with the time in your zone', () => {
    expect(milestoneLine({ kind: 'crossedInto', name: 'Canada', time: NOW }, NY, false)).toBe(`Crossed into Canada · 3:14${PM}`)
    expect(milestoneLine({ kind: 'closestToHome', miles: 40, time: NOW }, NY, false)).toBe(`Closest to home, 40 mi · 3:14${PM}`)
  })

  it('names a flight by its number and cities', () => {
    expect(flightTitle(toCologne)).toBe('UPS207 · Louisville → Cologne')
    expect(flightTitle(home)).toBe('Cologne → Louisville')
  })
})

describe('below, the sky and the distance in words (Stage 2 spec §4.1, §4.5, §4.6)', () => {
  it('says what’s below, with a city when one is near', () => {
    const quebec = { name: 'Québec', kind: 'province' as const, country: 'Canada' }
    expect(belowWords(quebec, null)).toBe('Over Québec')
    expect(belowWords(quebec, { name: 'Montréal', lat: 45.5, lon: -73.57 })).toBe('Over Québec, near Montréal')
  })

  it('says when it passes closest to home, before and after', () => {
    expect(closestToHomeText(40, NOW + 60 * MIN, NOW, NY, false)).toBe(`Passes 40 mi from home at 4:14${PM}`)
    expect(closestToHomeText(40, NOW, NOW + 60 * MIN, NY, false)).toBe(`Closest to home was 40 mi at 3:14${PM}`)
  })

  it('counts down to a cockpit sunset, rounding up', () => {
    expect(cockpitCountdown({ kind: 'sunset', time: NOW + 24.5 * MIN, peopleBelowGap: null }, NOW)).toBe('Sunset from the cockpit in 25 min')
  })

  it('says how far the people below are behind a sunset soon', () => {
    expect(cockpitEventText({ kind: 'sunset', time: NOW + 24.5 * MIN, peopleBelowGap: 12.2 * MIN }, NOW, NY, false))
      .toBe('Sunset in 25 min, about 12 min after the people below')
  })

  it('gives the time of an event an hour or more away', () => {
    expect(cockpitEventText({ kind: 'sunrise', time: NOW + 120 * MIN, peopleBelowGap: 22 * MIN }, NOW, NY, false))
      .toBe(`Sunrise at 5:14${PM}, about 22 min before the people below`)
  })

  it('has the sky’s other lines', () => {
    expect(flyingInto('sunset')).toBe('Flying into the night')
    expect(flyingInto('sunrise')).toBe('Flying into the morning')
    expect(chaseText('afternoon')).toBe('Chasing the sun: their afternoon is stretching')
    expect(moonText({ phase: 'waxingGibbous', isUp: true })).toBe('Waxing gibbous moon, up')
    expect(moonText({ phase: 'full', isUp: false })).toBe('Full moon, below the horizon')
    expect(groundSunText('sunrise', NOW, 'Europe/Berlin', false)).toBe(`sunrise at 9:14${PM} there`)
  })

  it('says the distance and speed', () => {
    expect(flownText(2_140, 1_960)).toBe('2,140 mi flown · 1,960 to go')
    expect(averageSpeedText(504)).toBe('Averaging about 500 mph')
    expect(averageSpeedText(506)).toBe('Averaging about 510 mph')
    expect(midLine('Like driving coast to coast')).toBe('like driving coast to coast')
  })
})

describe('where they’re headed in words (Stage 2 spec §4.7)', () => {
  it('says the time difference, in quarters of an hour', () => {
    expect(timeDifferenceText('Europe/Berlin', NY, NOW)).toBe('6 hours ahead of you')
    expect(timeDifferenceText('America/Los_Angeles', NY, NOW)).toBe('3 hours behind you')
    expect(timeDifferenceText('Asia/Kolkata', NY, NOW)).toBe('10½ hours ahead of you')
    expect(timeDifferenceText('America/St_Johns', 'America/Halifax', NOW)).toBe('½ hour ahead of you')
    expect(timeDifferenceText('America/Chicago', NY, NOW)).toBe('1 hour behind you')
    expect(timeDifferenceText('America/Detroit', NY, NOW)).toBeNull()
  })

  it('says when a flight lands, there or in your time', () => {
    expect(landsText(toCologne, NY, false)).toBe(`lands 9:14${PM} there`)
    expect(landsText(home, NY, false)).toBe(`lands 3:14${PM}`)
  })
})

describe('the whole trip in words (Stage 2 spec §4.8, §5, §6.5)', () => {
  it('says the trip so far, leaving out zeros', () => {
    expect(soFarText({ cities: 1, miles: 4_351, timeZones: 6, cockpitSunsets: 0 }, 2, 4)).toBe('Day 2 of 4 · 1 city · 4,351 mi · 6 time zones')
    expect(soFarText({ cities: 0, miles: 0, timeZones: 0, cockpitSunsets: 0 }, null, null)).toBeNull()
  })

  it('says "about" for a trip ahead', () => {
    const totals = { cities: 2, miles: 9_800, timeZones: 8, cockpitSunsets: 2 }
    expect(onTheWayText(totals, true)).toBe('8 time zones · about 2 sunsets from the cockpit')
    expect(onTheWayText(totals, false)).toBe('8 time zones · 2 sunsets from the cockpit')
    expect(onTheWayText({ cities: 1, miles: 100, timeZones: 0, cockpitSunsets: 0 }, true)).toBeNull()
  })

  it('reads the recap card', () => {
    expect(recapChip(1)).toBe('Home from a day away')
    expect(recapChip(4)).toBe('Home from 4 days away')
    expect(totalsTiles({ cities: 2, miles: 14_819, timeZones: 0, cockpitSunsets: 1 })).toEqual([
      { value: '2', label: 'cities' },
      { value: '14,819', label: 'miles' },
      { value: '1', label: 'sunset aloft' },
    ])
  })

  it('says the recap as one paragraph', () => {
    const longest: MapLeg = {
      id: 'f3', kind: 'flight', origin: mark('DXB', 25.2532, 55.3657, 'Dubai'), destination: mark('SDF', 38.1744, -85.736, 'Louisville'),
      start: NOW, end: NOW + 14 * 60 * MIN, flightNumber: 'UPS209',
    }
    expect(longestText(longest)).toBe('Dubai → Louisville, 7,382 mi')
    expect(recapSummary(4, { cities: 2, miles: 14_819, timeZones: 18, cockpitSunsets: 1 }, longest)).toBe(
      'Trip recap: home from 4 days away. 2 cities, 14,819 miles, 18 time zones, 1 sunset from the cockpit. ' +
        'Longest flight, Dubai to Louisville, 7,382 miles.',
    )
  })
})
```

- [ ] **Step 3: Run it to see it fail.** Run `npx vitest run tests/copy/facts.test.ts`. Expected: FAIL, because the modules don't exist.

- [ ] **Step 4: Write the flight's words.** Create `src/copy/facts.ts`:

```ts
import type { City, Place } from '../facts/geography'
import type { Milestone, MilestoneKind } from '../facts/milestone'
import type { Chase, MoonSight, SunEvent, SunKind } from '../facts/sky'
import type { MapLeg } from '../map/tripMap'
import type { MoonPhase } from '../time/moon'
import { HOUR, MINUTE, zoneOffsetMinutes } from '../time/zoned'
import { shortTimeText } from './format'

/**
 * The facts' sentences about a flight (Stage 2 spec §4, §5), as the app's FactsWording: milestones, what's below, the
 * sky, distance and landing. Times are the family's own, in `viewerTz`, unless the words say "there". The whole trip's
 * sentences are in src/copy/factsTrip.ts.
 */

/** "4,351". */
export const numberText = (value: number) => value.toLocaleString('en-US')

// Milestones (§4.3)

/** The headline: "Just crossed into Kansas", "Out over the Atlantic", "Halfway!", "Closest to home: 40 mi, wave!". */
export function milestoneHeadline(milestone: MilestoneKind): string {
  switch (milestone.kind) {
    case 'crossedInto':
      return `Just crossed into ${milestone.name}`
    case 'outOver':
      return `Out over ${milestone.name}`
    case 'halfway':
      return 'Halfway!'
    case 'closestToHome':
      return `Closest to home: ${milestone.miles} mi, wave!`
  }
}

/** The trip so far's list: "Crossed into Kansas · 1:12 PM". */
export function milestoneLine(milestone: Milestone, viewerTz: string, h24: boolean): string {
  const time = shortTimeText(milestone.time, viewerTz, h24)
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

/** "UPS207 · Louisville → Cologne", or the cities alone without a flight number. */
export function flightTitle(leg: MapLeg): string {
  const route = `${leg.origin.city} → ${leg.destination.city}`
  return leg.flightNumber ? `${leg.flightNumber} · ${route}` : route
}

// Below (§4.1)

/** "Over Kansas", "Over Québec, near Montréal". */
export const belowWords = (place: Place, city: City | null) => (city ? `Over ${place.name}, near ${city.name}` : `Over ${place.name}`)

/** "Passes 40 mi from home at 1:05 PM", or "Closest to home was 40 mi at 1:05 PM" once it's passed. */
export function closestToHomeText(miles: number, at: number, now: number, viewerTz: string, h24: boolean): string {
  const clock = shortTimeText(at, viewerTz, h24)
  return at > now ? `Passes ${miles} mi from home at ${clock}` : `Closest to home was ${miles} mi at ${clock}`
}

// The sky (§4.5)

const sunName = (kind: SunKind) => (kind === 'sunrise' ? 'Sunrise' : 'Sunset')

/** Whole minutes until `time`, rounded up, and at least 1. */
const minutesUntil = (now: number, time: number) => Math.max(1, Math.ceil((time - now) / MINUTE))

/** The headline: "Sunset from the cockpit in 25 min". */
export const cockpitCountdown = (event: SunEvent, now: number) => `${sunName(event.kind)} from the cockpit in ${minutesUntil(now, event.time)} min`

/** The sky row: "Sunset in 25 min, about 12 min after the people below", or "Sunrise at 6:38 AM" an hour or more ahead. */
export function cockpitEventText(event: SunEvent, now: number, viewerTz: string, h24: boolean): string {
  const when = event.time - now < HOUR ? `in ${minutesUntil(now, event.time)} min` : `at ${shortTimeText(event.time, viewerTz, h24)}`
  if (event.peopleBelowGap == null) return `${sunName(event.kind)} ${when}`
  const side = event.kind === 'sunset' ? 'after' : 'before'
  return `${sunName(event.kind)} ${when}, about ${Math.round(event.peopleBelowGap / MINUTE)} min ${side} the people below`
}

export const flyingInto = (kind: SunKind) => (kind === 'sunset' ? 'Flying into the night' : 'Flying into the morning')

export const chaseText = (chase: Chase) => `Chasing the sun: their ${chase} is stretching`

const MOON_NAMES: Record<MoonPhase, string> = {
  new: 'New moon',
  waxingCrescent: 'Waxing crescent moon',
  firstQuarter: 'First quarter moon',
  waxingGibbous: 'Waxing gibbous moon',
  full: 'Full moon',
  waningGibbous: 'Waning gibbous moon',
  lastQuarter: 'Last quarter moon',
  waningCrescent: 'Waning crescent moon',
}

/** "Waxing gibbous moon", in sentence case. */
export const moonName = (phase: MoonPhase) => MOON_NAMES[phase]

/** "Waxing gibbous moon, up", "Full moon, below the horizon". */
export const moonText = (sight: MoonSight) => `${moonName(sight.phase)}, ${sight.isUp ? 'up' : 'below the horizon'}`

/** On the ground at an airport: "sunrise at 7:02 AM there". */
export const groundSunText = (kind: SunKind, time: number, zone: string, h24: boolean) => `${kind} at ${shortTimeText(time, zone, h24)} there`

// Distance (§4.6)

/** "2,140 mi flown · 1,960 to go". */
export const flownText = (flown: number, toGo: number) => `${numberText(flown)} mi flown · ${numberText(toGo)} to go`

export const halfwayText = (time: number, viewerTz: string, h24: boolean) => `Halfway at ${shortTimeText(time, viewerTz, h24)}`

/** "Averaging about 510 mph", to the nearest 10. */
export const averageSpeedText = (milesPerHour: number) => `Averaging about ${Math.round(milesPerHour / 10) * 10} mph`

/** A comparison in the middle of a line: "like driving coast to coast". */
export const midLine = (phrase: string) => phrase.charAt(0).toLowerCase() + phrase.slice(1)

// Where they're headed (§4.7)

/** "6 hours ahead of you", "5½ hours behind you", "½ hour ahead of you" at `t`, or null when the clocks match. */
export function timeDifferenceText(zone: string, viewerTz: string, t: number): string | null {
  const minutes = zoneOffsetMinutes(t, zone) - zoneOffsetMinutes(t, viewerTz)
  if (minutes === 0) return null
  const quarters = Math.floor(Math.abs(minutes) / 15)
  const whole = Math.floor(quarters / 4)
  const part = ['', '¼', '½', '¾'][quarters % 4]
  const amount = whole === 0 ? part : `${whole}${part}`
  return `${amount} ${quarters <= 4 ? 'hour' : 'hours'} ${minutes > 0 ? 'ahead of' : 'behind'} you`
}

/** "lands 4:05 PM there", or in the family's time when the destination keeps it or its zone isn't known. */
export function landsText(leg: MapLeg, viewerTz: string, h24: boolean): string {
  const there = leg.destination.timeZone
  if (there && zoneOffsetMinutes(leg.end, there) !== zoneOffsetMinutes(leg.end, viewerTz)) return `lands ${shortTimeText(leg.end, there, h24)} there`
  return `lands ${shortTimeText(leg.end, viewerTz, h24)}`
}
```

- [ ] **Step 5: Write the trip's words.** Create `src/copy/factsTrip.ts`:

```ts
import type { TripTotals } from '../facts/tripTotals'
import { METERS_PER_MILE } from '../map/greatCircle'
import { legDistanceMeters, type MapLeg } from '../map/tripMap'
import { numberText } from './facts'

/**
 * The facts' sentences about the whole trip (Stage 2 spec §4.8, §5, §6.5), as the app's FactsWording+Trip: the totals
 * so far, a trip ahead's forecast, and the recap.
 */

/** One number on the recap card: "2" and "cities". */
export interface RecapTile {
  value: string
  label: string
}

/** "1 city", "2 cities". */
export const countText = (value: number, one: string, many: string) => `${numberText(value)} ${value === 1 ? one : many}`

/** "4,351 mi". */
export const milesText = (miles: number) => `${numberText(miles)} mi`

const legMiles = (leg: MapLeg) => Math.round(legDistanceMeters(leg) / METERS_PER_MILE)

/** "8 time zones · about 2 sunsets from the cockpit" for a trip ahead, without "about" once flown. Null when both are zero. */
export function onTheWayText(totals: TripTotals, isForecast: boolean): string | null {
  const parts: string[] = []
  if (totals.timeZones > 0) parts.push(countText(totals.timeZones, 'time zone', 'time zones'))
  if (totals.cockpitSunsets > 0) {
    const sunsets = countText(totals.cockpitSunsets, 'sunset from the cockpit', 'sunsets from the cockpit')
    parts.push(isForecast ? `about ${sunsets}` : sunsets)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

/** "Day 2 of 4 · 1 city · 4,351 mi · 6 time zones · 1 sunset from the cockpit", with zeros left out. Null when there's nothing to say. */
export function soFarText(totals: TripTotals, day: number | null, days: number | null): string | null {
  const parts: string[] = []
  if (day != null && days != null) parts.push(`Day ${day} of ${days}`)
  if (totals.cities > 0) parts.push(countText(totals.cities, 'city', 'cities'))
  if (totals.miles > 0) parts.push(milesText(totals.miles))
  const onTheWay = onTheWayText(totals, false)
  if (onTheWay) parts.push(onTheWay)
  return parts.length > 0 ? parts.join(' · ') : null
}

/** "Dubai → Louisville, 7,382 mi". */
export const longestText = (leg: MapLeg) => `${leg.origin.city} → ${leg.destination.city}, ${milesText(legMiles(leg))}`

/** "Home from 4 days away", or "Home from a day away". */
export const recapChip = (days: number) => (days === 1 ? 'Home from a day away' : `Home from ${days} days away`)

/** Up to four numbers for the recap card, with zeros left out. "Sunsets aloft" is used only here (§6.5). */
export function totalsTiles(totals: TripTotals): RecapTile[] {
  const tiles: [number, string, string][] = [
    [totals.cities, 'city', 'cities'],
    [totals.miles, 'mile', 'miles'],
    [totals.timeZones, 'time zone', 'time zones'],
    [totals.cockpitSunsets, 'sunset aloft', 'sunsets aloft'],
  ]
  return tiles.filter(([value]) => value > 0).map(([value, one, many]) => ({ value: numberText(value), label: value === 1 ? one : many }))
}

/**
 * The recap card as screen readers hear it: "Trip recap: home from 4 days away. 2 cities, 14,819 miles, 18 time zones,
 * 1 sunset from the cockpit. Longest flight, Dubai to Louisville, 7,382 miles."
 */
export function recapSummary(days: number, totals: TripTotals, longest: MapLeg | null): string {
  const chip = recapChip(days)
  const sentences = [`Trip recap: ${chip.charAt(0).toLowerCase()}${chip.slice(1)}.`]
  const counts = [
    totals.cities > 0 ? countText(totals.cities, 'city', 'cities') : null,
    totals.miles > 0 ? countText(totals.miles, 'mile', 'miles') : null,
    totals.timeZones > 0 ? countText(totals.timeZones, 'time zone', 'time zones') : null,
    totals.cockpitSunsets > 0 ? countText(totals.cockpitSunsets, 'sunset from the cockpit', 'sunsets from the cockpit') : null,
  ].filter((c): c is string => c != null)
  if (counts.length > 0) sentences.push(`${counts.join(', ')}.`)
  if (longest) sentences.push(`Longest flight, ${longest.origin.city} to ${longest.destination.city}, ${numberText(legMiles(longest))} miles.`)
  return sentences.join(' ')
}
```

- [ ] **Step 6: Run it to see it pass.** Run the same command, then `npx tsc --noEmit`. Expected: PASS.

- [ ] **Step 7: Ask to commit.** Suggested message: `The trip map's facts in words: milestones, below, the sky, distance, landing, the trip so far and the recap (Stage 2 spec §4, §5, §6.5)`

---

### Task 16: The recap's trip

For 24 hours after a trip ends, at home or base, the map is that trip's recap, unless the next trip leaves within 12 hours (Stage 2 spec §8.1). The site chooses its trips in the engine, so the snapshot gains `recap`, as it has `upcomingTrip` and `tripProgress`. This task ports the choosing part of 2A's Task 12, and adds a `recap` demo scene.

**Files:**
- Modify: `src/engine/trips.ts` (add at the end), `src/engine/snapshot.ts`
- Modify: `src/data/demo.ts`
- Test: `tests/engine/recap.test.ts`, `tests/data/demoScenes.test.ts`

- [ ] **Step 1: Port check.** Run:

```bash
git -C /Users/toddanderson/Dev/Crewluv log --oneline -1 feature/trip-map-facts -- Crewluv/Services/TripMap/TripMap+Status.swift CrewluvTests/TripMapRecapTests.swift
```

  - Nothing printed: tell Todd this task waits for 2A's Task 12, and stop.
  - Otherwise, read `git -C /Users/toddanderson/Dev/Crewluv diff 984e87c feature/trip-map-facts -- Crewluv/Services/TripMap/TripMap+Status.swift` and `CrewluvTests/TripMapRecapTests.swift`, and compare them with 2A's plan, Task 12, Step 5. Where the committed Swift's rule differs, change the code and tests below to match (ground rule 6).

- [ ] **Step 2: Write the failing tests.** Create `tests/engine/recap.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { RawBuilder } from '../../src/data/rowBuilder'
import { buildLegs } from '../../src/engine/legs'
import { buildSchedule } from '../../src/engine/normalize'
import { makeSnapshot } from '../../src/engine/snapshot'
import { RECAP_MS, RECAP_YIELDS_WITHIN_MS } from '../../src/engine/trips'
import { HOUR } from '../../src/time/zoned'
import { A, at } from '../fixtures/engine'

const NY = 'America/New_York'
/** Sam's two-day trip lands home at Louisville at minute 2040. */
const LANDED = 2040

/** Sam's snapshot `minutes` after the trip's report, with a next trip leaving `nextIn` minutes after that, if given. */
function snapshotAt(minutes: number, nextIn: number | null = null) {
  let builder = new RawBuilder(A).pilot('Sam', 'SDF', null).trip('t1', {
    days: 2,
    dutyPeriods: [
      { start: 0, end: 600, flights: [{ dep: 'SDF', arr: 'CGN', out: 60, in: 540 }] },
      { start: 1500, end: 2100, flights: [{ dep: 'CGN', arr: 'SDF', out: 1560, in: LANDED }] },
    ],
  })
  if (nextIn != null) {
    const out = minutes + nextIn
    builder = builder.trip('t2', { days: 1, dutyPeriods: [{ start: out - 60, end: out + 240, flights: [{ dep: 'SDF', arr: 'MIA', out, in: out + 150 }] }] })
  }
  const schedule = buildSchedule(builder.build(), A)
  return makeSnapshot(schedule, buildLegs(schedule), at(minutes), NY)
}

describe('the recap’s trip (Stage 2 spec §8.1)', () => {
  it('shows for a day, and gives way to a trip leaving within 12 hours', () => {
    expect(RECAP_MS).toBe(24 * HOUR)
    expect(RECAP_YIELDS_WITHIN_MS).toBe(12 * HOUR)
  })

  it('is the trip that landed 3 hours ago, with CrewLu’s count of its days', () => {
    const snap = snapshotAt(LANDED + 180)
    expect(snap.status.kind).toBe('home')
    expect(snap.recap).toEqual({ tripId: 't1', days: 2 })
  })

  it('is gone 25 hours after', () => {
    expect(snapshotAt(LANDED + 25 * 60).recap).toBeNull()
  })

  it('gives way to the next trip leaving within 12 hours', () => {
    const snap = snapshotAt(LANDED + 180, 600)
    expect(snap.recap).toBeNull()
    expect(snap.upcomingTrip?.tripId).toBe('t2')
  })

  it('stays when the next trip leaves later', () => {
    expect(snapshotAt(LANDED + 180, 840).recap).toEqual({ tripId: 't1', days: 2 })
  })

  it('isn’t shown away from home, mid-trip', () => {
    expect(snapshotAt(1000).recap).toBeNull()
  })
})
```

  In `tests/data/demoScenes.test.ts`:
  - add `recap: 'home',` to `EXPECTED`, after `'nothing-ahead': 'home',`;
  - add at the end of its `describe`:

```ts
  it('recap is home the evening after the main trip, which it recaps', () => {
    expect(sceneSnapshot('recap').recap).toEqual({ tripId: 'demo-t1', days: 2 })
    expect(sceneSnapshot('nothing-ahead').recap).toBeNull()
    expect(sceneSnapshot('home').recap).toBeNull()
  })
```

- [ ] **Step 3: Run them to see them fail.** Run `npx vitest run tests/engine/recap.test.ts tests/data/demoScenes.test.ts`. Expected: FAIL.

- [ ] **Step 4: Choose the trip.** In `src/engine/trips.ts`:
  - change the first import to `import { calendarDay, HOUR } from '../time/zoned'`;
  - change `import type { Leg, MoveLeg } from './legs'` to `import { isMove, type Leg, type MoveLeg } from './legs'`, unless `isMove` is already imported;
  - at the end of the file, add:

```ts
/** The trip just finished, which the trip map recaps (Stage 2 spec §8). */
export interface RecapTrip {
  tripId: string
  /** CrewLu's count of the trip's days, else the calendar days it spans in the base's zone. */
  days: number
}

/** A recap shows this long after its trip's last flight lands (§8.1). */
export const RECAP_MS = 24 * HOUR
/** A next trip leaving this soon takes over from the recap. */
export const RECAP_YIELDS_WITHIN_MS = 12 * HOUR

/**
 * The trip whose last flight landed in the past 24 hours, as the app's TripMap+Status picks it (§8.1): the latest to
 * end, unless the next trip's first flight leaves within 12 hours. Flights without a trip, like a standalone jumpseat,
 * aren't a trip. The snapshot asks only at home or base.
 */
export function recapTrip(schedule: Schedule, legs: Leg[], t: number, baseTz: string): RecapTrip | null {
  const spans = new Map<string, { start: number; end: number }>()
  for (const leg of legs) {
    if (!isMove(leg) || leg.tripId == null) continue
    const span = spans.get(leg.tripId)
    spans.set(leg.tripId, span ? { start: Math.min(span.start, leg.start), end: Math.max(span.end, leg.end) } : { start: leg.start, end: leg.end })
  }
  let latest: { tripId: string; start: number; end: number } | null = null
  for (const [tripId, span] of spans) {
    if (span.end <= t && t - span.end < RECAP_MS && (!latest || span.end > latest.end)) latest = { tripId, ...span }
  }
  if (!latest) return null
  // Taken apart here: TypeScript doesn't carry the null check on a `let` into the `find` callback below.
  const { tripId, start, end } = latest
  const nextDeparture = Math.min(...legs.filter((l) => isMove(l) && l.tripId != null && l.start > t).map((l) => l.start))
  if (nextDeparture - t <= RECAP_YIELDS_WITHIN_MS) return null
  const trip = schedule.trips.find((tr) => tr.id === tripId)
  const days = trip ? tripDays(trip, baseTz) : calendarDay(end, baseTz) - calendarDay(start, baseTz) + 1
  return { tripId, days }
}
```

- [ ] **Step 5: Put it on the snapshot.** In `src/engine/snapshot.ts`:
  - add `recapTrip` and `type RecapTrip` to its import from `'./trips'`;
  - in `interface Snapshot`, after `tripProgress: TripProgress | null`, add:

```ts
  /** The trip just finished, for a day after it ends: at home or base, never on a night home mid-trip (Stage 2 spec §8.1). */
  recap: RecapTrip | null
```

  - in `makeSnapshot`'s returned object, after `tripProgress: …,`, add:

```ts
    recap: settled && !midTripAtHome ? recapTrip(schedule, legs, t, baseTz) : null,
```

  - in `safeSnapshot`'s fallback object, add `recap: null,` beside `tripProgress: null`.

- [ ] **Step 6: The demo scene.** In `src/data/demo.ts`:
  - add `| 'recap'` to `DemoScene`, after `'nothing-ahead'`;
  - in `DEMO_SCENES`, after the `'nothing-ahead'` entry, add:

```ts
  // Home the evening after the main trip, which lands at 1900 and is recapped for a day (Stage 2 spec §8.1).
  recap: { variant: 'driver', offset: 2400 },
```

- [ ] **Step 7: Run them to see them pass.** Run the command from Step 3, then `npm test` and `npx tsc --noEmit`. Expected: PASS. Every other demo scene's snapshot is unchanged: `nothing-ahead` is 25 hours after its trip, just past the recap.

- [ ] **Step 8: Ask to commit.** Suggested message: `The recap's trip: for a day after a trip ends at home or base, unless the next leaves within 12 hours, and a recap demo scene (Stage 2 spec §8.1)`

---

### Task 17: The recap on the map

The trip map's `recap` mode, its days, and Stage 1B's words for it; the full map opens a recap paused at its start (Stage 2 spec §6.5, §8.2). This task ports the rest of 2A's Task 12.

**Files:**
- Modify: `src/map/tripMap.ts`, `src/map/tripMapFor.ts`, `src/copy/tripMap.ts`, `src/ui/TripMapPage.tsx`
- Test: `tests/map/tripMap.test.ts`, `tests/map/tripMapFor.test.ts`, `tests/copy/tripMap.test.ts`, `tests/ui/TripMapPage.test.tsx` (add a `describe` at the end of each)

- [ ] **Step 1: Port check.** Run:

```bash
git -C /Users/toddanderson/Dev/Crewluv log --oneline -1 feature/trip-map-facts -- Crewluv/Services/TripMap/TripMap.swift Crewluv/Services/TripMap/TripMapWording.swift Crewluv/Services/TripMap/TripReplayClock.swift
```

  - Nothing printed: tell Todd this task waits for 2A's Task 12, and stop.
  - Otherwise, read `git -C /Users/toddanderson/Dev/Crewluv diff 984e87c feature/trip-map-facts -- Crewluv/Services/TripMap/TripMap.swift Crewluv/Services/TripMap/TripMapWording.swift Crewluv/Services/TripMap/TripReplayClock.swift`, and compare it with 2A's plan, Task 12, Steps 4, 6 and 7. Where the committed Swift differs, change the code and tests below to match (ground rule 6).

- [ ] **Step 2: Write the failing tests.** In `tests/map/tripMap.test.ts`, add `dayCount` and `pilotLocation` to the import from `'../../src/map/tripMap'` where missing, and add at the end:

```ts
describe('the recap mode (Stage 2 spec §8.2)', () => {
  const recap = makeTripMap(EUROPE, { isNextTrip: false, isRecap: true, home: 'SDF', now: at(0), airports: AIRPORTS })!

  it('is a recap whatever the moment', () => {
    expect(recap.mode).toEqual({ kind: 'recap' })
  })

  it('puts the pilot at home after the trip', () => {
    expect(pilotLocation(recap, at(80))?.code).toBe('SDF')
  })

  it('counts CrewLu’s days, else the calendar days the trip spans', () => {
    // Friday 7 AM to Monday 7 AM in Louisville.
    expect(dayCount(recap, 'America/New_York')).toBe(4)
    expect(dayCount(makeTripMap(EUROPE, { isNextTrip: false, isRecap: true, days: 5, home: 'SDF', now: at(0), airports: AIRPORTS })!, 'America/New_York')).toBe(5)
  })
})
```

  In `tests/map/tripMapFor.test.ts`, add at the end of its `describe`:

```ts
  it('shows the recap at home for a day after a trip, with its days (Stage 2 spec §8.1)', () => {
    const upcomingTrip = { tripId: 'T2', departs: at(200), days: 1, route: ['SDF', 'ANC'], delayMinutes: null }
    const map = tripMapFor(snap('home', at(75), { upcomingTrip, recap: { tripId: 'T1', days: 4 } }), LEGS, AIRPORTS)!
    expect(map.mode).toEqual({ kind: 'recap' })
    expect(map.legs.map((l) => l.id)).toEqual(['d0', 'f1', 'f2', 'f3'])
    expect(map.days).toBe(4)
  })

  it('carries the next trip’s and the trip under way’s days', () => {
    const upcomingTrip = { tripId: 'T2', departs: at(200), days: 1, route: ['SDF', 'ANC'], delayMinutes: null }
    expect(tripMapFor(snap('home', at(150), { upcomingTrip }), LEGS, AIRPORTS)!.days).toBe(1)
    const tripProgress = { tripId: 'T1', day: 1, days: 4, upcoming: ['DXB', 'SDF'] }
    expect(tripMapFor(snap('layover', at(12), { tripProgress }), LEGS, AIRPORTS)!.days).toBe(4)
  })
```

  In `tests/copy/tripMap.test.ts`, add at the end of the file:

```ts
describe('the recap in words (Stage 2 spec §6.5)', () => {
  const recap = makeTripMap(EUROPE, { isNextTrip: false, isRecap: true, home: 'SDF', now: at(0), airports: AIRPORTS })!

  it('reads "Home from 4 days away" and "Replay the trip" on the card', () => {
    expect(cardChips(recap, at(73), NY, false)).toEqual({ top: 'Home from 4 days away', bottom: 'Replay the trip' })
  })

  it('calls the full map the trip recap once the trip is over', () => {
    expect(topPill(recap, at(72), null, null)).toBe('Trip recap')
  })

  it('has no stats bar: the recap bar takes its place', () => {
    expect(statsItems(recap, at(73), null, null, NY)).toEqual([])
  })

  it('says what tapping it does', () => {
    expect(tripMapSummary(recap, at(73), 'Alex', NY, false)).toBe('Trip recap: home from 4 days away. Opens the map to replay the trip.')
  })
})
```

  In `tests/ui/TripMapPage.test.tsx`, add at the end:

```tsx
describe('opening a recap (Stage 2 spec §6.5)', () => {
  it('opens paused at the trip’s start, with Live to jump to now', () => {
    const map = makeTripMap(EUROPE, { isNextTrip: false, isRecap: true, home: 'SDF', now: at(80), airports: AIRPORTS })!
    render(<TripMapPage map={map} now={at(80)} viewerTz="America/New_York" h24={false} day={null} days={null} land={null} onBack={() => {}} />)
    expect(Number((screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement).value)).toBe(map.span.start)
    fireEvent.click(screen.getByRole('button', { name: 'Live' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Trip recap' })).toBeTruthy()
  })
})
```

- [ ] **Step 3: Run them to see them fail.** Run `npx vitest run tests/map/tripMap.test.ts tests/map/tripMapFor.test.ts tests/copy/tripMap.test.ts tests/ui/TripMapPage.test.tsx`. Expected: FAIL.

- [ ] **Step 4: The mode and the days.** In `src/map/tripMap.ts`:
  - add `import { calendarDay } from '../time/zoned'`;
  - change `TripMapMode` to:

```ts
export type TripMapMode = { kind: 'inFlight'; legId: string } | { kind: 'onTrip' } | { kind: 'nextTrip' } | { kind: 'recap' }
```

  - in `interface TripMap`, after `span`, add:

```ts
  /** CrewLu's count of the trip's days, when known: the recap's, the next trip's or the trip under way's (Stage 2 spec §8.1). */
  days: number | null
```

  - in `interface TripMapOptions`, after `isNextTrip: boolean`, add:

```ts
  /** The legs are a trip just finished, shown for a day as its recap (Stage 2 spec §8). */
  isRecap?: boolean
  /** CrewLu's count of the trip's days. */
  days?: number | null
```

  - in `makeTripMap`, change the parameter list to `{ isNextTrip, isRecap = false, days = null, home, now, airports }`, and change the `mode` line and the return to:

```ts
  const mode: TripMapMode = isRecap ? { kind: 'recap' } : isNextTrip ? { kind: 'nextTrip' } : flying ? { kind: 'inFlight', legId: flying.id } : { kind: 'onTrip' }
  return { mode, legs: mapped, home: home ? airportMark(home, airports) : null, span: { start, end }, days }
```

  - in `pilotLocation`, after its first line, add:

```ts
  // After a recap's trip, home, else where the trip ended (Stage 2 spec §8.2).
  if (map.mode.kind === 'recap' && t >= map.span.end) return map.home ?? map.legs[map.legs.length - 1].destination
```

  - at the end of the file, add:

```ts
/** The trip's days: CrewLu's count when known, else the calendar days its span covers in `timeZone` (Stage 2 spec §8.1). */
export function dayCount(map: TripMap, timeZone: string): number {
  return map.days ?? calendarDay(map.span.end, timeZone) - calendarDay(map.span.start, timeZone) + 1
}
```

- [ ] **Step 5: Choose the recap, and carry the days.** In `src/map/tripMapFor.ts`:
  - in the header comment, after the line `* - at home or base, the next trip;`, add ` * - at home or base for a day after a trip, its recap, unless the next trip leaves within 12 hours (Stage 2 spec §8.1);`;
  - replace the body of `tripMapFor` from `const kind = snap.status.kind` to the end with:

```ts
  const kind = snap.status.kind
  if (kind === 'home' || kind === 'base') {
    if (snap.recap) return makeTripMap(tripLegs(legs, snap.recap.tripId), { ...options(false), isRecap: true, days: snap.recap.days })
    // A night at home in the middle of a trip is still that trip, under way: its upcoming trip is the rest of it.
    const upcoming = snap.upcomingTrip
    return upcoming ? makeTripMap(tripLegs(legs, upcoming.tripId), { ...options(!snap.midTripAtHome), days: upcoming.days }) : null
  }
  const progress = snap.tripProgress
  const chosen = progress ? tripLegs(legs, progress.tripId) : []
  if (progress && chosen.length > 0) return makeTripMap(chosen, { ...options(false), days: progress.days })
  const current = snap.status.current
  return current && (isMove(current) || current.kind === 'drive') ? makeTripMap([current], options(false)) : null
```

- [ ] **Step 6: Stage 1B's words for the recap.** In `src/copy/tripMap.ts`:
  - add `dayCount` to the import from `'../map/tripMap'`, and add `import { recapChip } from './factsTrip'`;
  - in `statsItems`, change `if (map.mode.kind === 'inFlight') return []` to:

```ts
  // In flight the bar shows the flight; on the recap, the recap bar takes its place (Stage 2 spec §6.5).
  if (map.mode.kind === 'inFlight' || map.mode.kind === 'recap') return []
```

  - in `cardChips`, add as its first line:

```ts
  if (map.mode.kind === 'recap') return { top: recapChip(dayCount(map, viewerTz)), bottom: 'Replay the trip' }
```

  - in `topPill`, add as its first line:

```ts
  if (map.mode.kind === 'recap' && t >= map.span.end) return 'Trip recap'
```

  - in `tripMapSummary`, after `const opens = 'Opens the full map.'`, add:

```ts
  if (map.mode.kind === 'recap') {
    const chip = recapChip(dayCount(map, viewerTz))
    return `Trip recap: ${chip.charAt(0).toLowerCase()}${chip.slice(1)}. Opens the map to replay the trip.`
  }
```

- [ ] **Step 7: Open a recap paused at its start.** In `src/ui/TripMapPage.tsx`:
  - change the import from `'../map/replayClock'` to add `scrub`;
  - change the clock's first line to:

```tsx
  // A recap opens paused at its trip's start, ready to play; Live jumps to now, after the trip (Stage 2 spec §6.5).
  const [kept, setClock] = useState(() => (map.mode.kind === 'recap' ? scrub(liveClock(map.span), map.span.start) : liveClock(map.span)))
```

- [ ] **Step 8: Run them to see them pass.** Run the command from Step 3, then `npx tsc --noEmit`. TypeScript flags every trip map written out by hand without `days`, in `src/` or `tests/`: add `days: null` to each. Then run `npm test`. Expected: PASS.

- [ ] **Step 9: Ask to commit.** Suggested message: `The trip map's recap: its mode, its days, the card's and the full map's words, and a replay that opens paused at the trip's start (Stage 2 spec §6.5, §8)`

---

### Task 18: The facts at a moment

`TripFacts`: the headline, the trip so far, weather's window and the card's words, each a lookup at any moment (Stage 2 spec §3.1, §4.4, §5.2, §6.4, §7.3). This task ports 2A's Task 13. Task 19 adds the rows.

**Files:**
- Create: `src/facts/tripFacts.ts`
- Modify: `tests/facts/factsTestData.ts` (add `flightMap`)
- Test: `tests/facts/tripFacts.test.ts`

- [ ] **Step 1: Port check.** Run:

```bash
git -C /Users/toddanderson/Dev/Crewluv log --oneline -1 feature/trip-map-facts -- Crewluv/Services/TripMap/Facts/TripFacts.swift Crewluv/Services/TripMap/Facts/TripSoFar.swift Crewluv/Services/TripMap/Facts/FactRow.swift CrewluvTests/TripFactsTests.swift
```

  - Nothing printed: tell Todd this task waits for 2A's Task 13, and stop.
  - Otherwise, read the four files and compare them with 2A's plan, Task 13. Where the committed Swift differs, change the code and tests below to match, including `src/facts/factRow.ts` from Task 4 (ground rule 6).

- [ ] **Step 2: A one-flight map for the tests.** In `tests/facts/factsTestData.ts`:
  - change the import from `'../../src/map/tripMap'` to `import type { AirportMark, MapLeg, TripMap } from '../../src/map/tripMap'`;
  - at the end, add:

```ts
/** A trip map of one flight, in the air. */
export function flightMap(leg: MapLeg, home: AirportMark | null): TripMap {
  return { mode: { kind: 'inFlight', legId: leg.id }, legs: [leg], home, span: { start: leg.start, end: leg.end }, days: null }
}
```

- [ ] **Step 3: Write the failing test.** Create `tests/facts/tripFacts.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { LandingForecast } from '../../src/data/weather'
import type { Geography } from '../../src/facts/geography'
import {
  cardSummary, forecastFor, headline, isRecapOver, makeTripFacts, recapLongestLine, recapTiles, sheetHeadline, tripSoFar,
} from '../../src/facts/tripFacts'
import { airportMark, makeTripMap, type MapLeg } from '../../src/map/tripMap'
import { AIRPORTS, at, EUROPE, HOUR } from '../map/tripMapLegs'
import { EQUATOR, equatorFlight, flightMap, mark } from './factsTestData'

/**
 * The flight along the equator crosses into Bravo at 11:00 UTC, is halfway at 11:45, out over the Test Sea at 12:03
 * and closest to home (35 mi) at 12:21: 7:00, 7:45, 8:03 and 8:21 AM in Louisville.
 */
const NY = 'America/New_York'
const AM = ' AM'
const t = (hhmm: string) => Date.parse(`2026-03-20T${hhmm}:00Z`)

function equatorFacts(geography: Geography | null = EQUATOR, forecasts: Record<string, LandingForecast> = {}) {
  return makeTripFacts(flightMap(equatorFlight(0, 20), mark('HOME', 0.5, 14)), { geography, comparisons: null, forecasts, viewerTz: NY, h24: false, day: 1, days: 1 })
}

const europeRecap = () =>
  makeTripFacts(makeTripMap(EUROPE, { isNextTrip: false, isRecap: true, home: 'SDF', now: at(0), airports: AIRPORTS })!, { geography: null, comparisons: null, viewerTz: NY, h24: false })

describe('the headline (Stage 2 spec §4.4)', () => {
  it('in flight, is a recent milestone, else the place below', () => {
    const facts = equatorFacts()
    expect(headline(facts, t('11:02'))).toBe('Just crossed into Bravo')
    // The crossing was 10 minutes ago.
    expect(headline(facts, t('11:10'))).toBe('Over Bravo, near Testville')
    expect(headline(facts, t('11:46'))).toBe('Halfway!')
    expect(headline(facts, t('12:05'))).toBe('Out over the Test Sea')
    expect(headline(facts, t('12:22'))).toBe('Closest to home: 35 mi, wave!')
    expect(headline(facts, t('12:40'))).toBe('Over the Test Sea')
  })

  it('before the story is ready, is the landing countdown', () => {
    expect(headline(equatorFacts(null), t('12:10'))).toBe('Landing in 1 h 12 min')
  })

  it('puts a cockpit sunrise within 30 minutes before the place', () => {
    const start = Date.parse('2026-11-13T23:00:00Z')
    const leg: MapLeg = { id: 'night', kind: 'flight', origin: airportMark('SDF', AIRPORTS)!, destination: airportMark('CGN', AIRPORTS)!, start, end: start + 8 * HOUR, flightNumber: 'UPS207' }
    const facts = makeTripFacts(flightMap(leg, null), { geography: null, comparisons: null, viewerTz: NY, h24: false })
    expect(headline(facts, Date.parse('2026-11-14T06:17:43Z'))).toBe('Sunrise from the cockpit in 21 min')
  })

  it('on the ground, is none: Stage 1B’s words stay', () => {
    const facts = makeTripFacts(makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!, { geography: null, comparisons: null, viewerTz: NY, h24: false })
    expect(headline(facts, at(12))).toBeNull()
  })

  it('works out each route’s story once', () => {
    expect(equatorFacts().stories.eq).toBe(equatorFacts().stories.eq)
  })
})

describe('weather’s window (Stage 2 spec §7.3)', () => {
  it('shows only for a landing between the real now and 48 hours on', () => {
    const facts = equatorFacts(EQUATOR, { eq: { temperature: 81, unit: 'fahrenheit', code: 0 } })
    const leg = facts.map.legs[0]
    expect(forecastFor(facts, leg, t('11:10'))).not.toBeNull()
    // Already landed.
    expect(forecastFor(facts, leg, t('13:30'))).toBeNull()
    // More than 48 hours out.
    expect(forecastFor(facts, leg, leg.end - 49 * HOUR)).toBeNull()
  })
})

describe('the trip so far (Stage 2 spec §5.2, §5.5)', () => {
  it('lists this flight’s milestones, then the totals', () => {
    const soFar = tripSoFar(equatorFacts(), t('12:30'))
    expect(soFar.flights.map((f) => f.title)).toEqual(['TST1 · E0 → E20'])
    expect(soFar.flights[0].milestones).toEqual([
      `Crossed into Bravo · 7:00${AM}`, `Halfway · 7:45${AM}`, `Out over the Test Sea · 8:03${AM}`, `Closest to home, 35 mi · 8:21${AM}`,
    ])
    expect(soFar.totalsTitle).toBe('Trip so far')
    expect(soFar.totals).toBe('Day 1 of 1 · 1,036 mi')
  })

  it('lists only the milestones that have happened', () => {
    expect(tripSoFar(equatorFacts(), t('11:50')).flights[0].milestones).toHaveLength(2)
  })

  it('after a recap’s trip, is the recap', () => {
    const facts = europeRecap()
    const soFar = tripSoFar(facts, facts.map.span.end + HOUR)
    expect(soFar.totalsTitle).toBe('Trip recap')
    expect(soFar.totals).toBe('2 cities · 14,819 mi · 18 time zones · 1 sunset from the cockpit')
  })
})

describe('the card’s words (Stage 2 spec §6.4, §6.5)', () => {
  it('in flight, adds the place below to the spoken summary', () => {
    expect(cardSummary(equatorFacts(), t('11:10'), 'Alex')).toBe(
      `TST1 to E20, over Bravo. Lands at 9:22${AM} your time. Estimated from the schedule. Opens the full map.`,
    )
  })

  it('on the recap, has the tiles, the longest flight and one sentence', () => {
    const facts = europeRecap()
    expect(recapTiles(facts)).toEqual([
      { value: '2', label: 'cities' }, { value: '14,819', label: 'miles' }, { value: '18', label: 'time zones' }, { value: '1', label: 'sunset aloft' },
    ])
    expect(recapLongestLine(facts)).toBe('Longest: Dubai → Louisville, 7,382 mi')
    expect(cardSummary(facts, facts.map.span.end, 'Alex')).toBe(
      'Trip recap: home from 4 days away. 2 cities, 14,819 miles, 18 time zones, 1 sunset from the cockpit. ' +
        'Longest flight, Dubai to Louisville, 7,382 miles. Opens the map to replay the trip.',
    )
  })

  it('after a recap’s trip, heads the panel "Home from 4 days away"', () => {
    const facts = europeRecap()
    expect(isRecapOver(facts, facts.map.span.end)).toBe(true)
    expect(sheetHeadline(facts, facts.map.span.end + HOUR)).toBe('Home from 4 days away')
  })
})
```

- [ ] **Step 4: Run it to see it fail.** Run `npx vitest run tests/facts/tripFacts.test.ts`. Expected: FAIL, because the module doesn't exist.

- [ ] **Step 5: Write it.** Create `src/facts/tripFacts.ts`:

```ts
import { belowWords, cockpitCountdown, flightTitle, milestoneHeadline, milestoneLine } from '../copy/facts'
import { longestText, recapChip, recapSummary, soFarText, totalsTiles, type RecapTile } from '../copy/factsTrip'
import { shortTimeText } from '../copy/format'
import { landingCountdown, panelHeadline, tripMapSummary } from '../copy/tripMap'
import type { LandingForecast } from '../data/weather'
import type { GeoPoint } from '../map/greatCircle'
import { currentLeg, dayCount, legInMotion, legProgress, positionAtTime, type AirportMark, type MapLeg, type TripMap } from '../map/tripMap'
import { MINUTE } from '../time/zoned'
import type { Comparison } from './comparisons'
import type { TripSoFar } from './factRow'
import { cityNear, type Geography } from './geography'
import { landsWithinHorizon } from './landingWeather'
import { legStory, placeAtFraction, type LegStory } from './legStory'
import { MILESTONE_HEADLINE_MS, milestones, type Milestone } from './milestone'
import { sunEvents, type SunEvent } from './sky'
import { longestFlight, totalsSoFar, wholeTotals, type SunEventsByLeg } from './tripTotals'

/**
 * Everything the facts say about a trip at a moment (Stage 2 spec §3.1, §4.4, §5), as the app's TripFacts: the
 * headline, the trip so far and the card's words here, and the rows in tripFactsRows.ts. Each answer is a lookup in the
 * flights' stories and sun events, so replay and scrubbing need nothing extra (§4.10).
 */

/** A cockpit sunrise or sunset this close leads the headline (§4.4). */
export const SUN_HEADLINE_MS = 30 * MINUTE

export interface FactsOptions {
  /** Null until geography.json has loaded: the facts that need a story are left out until then (§3.3). */
  geography: Geography | null
  comparisons: Comparison[] | null
  /** Landing-hour forecasts, by leg id. */
  forecasts?: Record<string, LandingForecast>
  viewerTz: string
  h24: boolean
  /** The status's trip day, for "Day 2 of 4". */
  day?: number | null
  days?: number | null
}

export interface TripFacts {
  map: TripMap
  geography: Geography | null
  comparisons: Comparison[]
  /** By leg id, for the flights whose story is ready. */
  stories: Record<string, LegStory>
  sunEvents: SunEventsByLeg
  forecasts: Record<string, LandingForecast>
  viewerTz: string
  h24: boolean
  day: number | null
  days: number | null
}

/**
 * Each route's story, by geography: the status page remakes its map every second, and a story is worked out once per
 * route and home, as the app's LegStoryStore keeps them (§3.2).
 */
const stories = new WeakMap<Geography, Map<string, LegStory>>()
/** Each flight's sun events, by its route and its delay-moved times: a new delay works them out again (§3.2). */
const sunEventsByRoute = new Map<string, SunEvent[]>()

const pointKey = (p: GeoPoint) => `${p.lat},${p.lng}`

function storyOf(leg: MapLeg, geography: Geography, home: AirportMark | null): LegStory {
  let kept = stories.get(geography)
  if (!kept) stories.set(geography, (kept = new Map()))
  const key = [leg.origin.code, pointKey(leg.origin.place), leg.destination.code, pointKey(leg.destination.place), home?.code ?? '', home ? pointKey(home.place) : ''].join('|')
  let story = kept.get(key)
  if (!story) kept.set(key, (story = legStory(leg, geography, home)))
  return story
}

function sunEventsOf(leg: MapLeg): SunEvent[] {
  const key = [pointKey(leg.origin.place), pointKey(leg.destination.place), leg.start, leg.end].join('|')
  let events = sunEventsByRoute.get(key)
  if (!events) sunEventsByRoute.set(key, (events = sunEvents(leg)))
  return events
}

/** The facts for `map`: each flight's story, once the geography has loaded, and its sun events. */
export function makeTripFacts(map: TripMap, options: FactsOptions): TripFacts {
  const legStories: Record<string, LegStory> = {}
  const events: SunEventsByLeg = {}
  for (const leg of map.legs) {
    if (leg.kind !== 'flight') continue
    if (options.geography) legStories[leg.id] = storyOf(leg, options.geography, map.home)
    events[leg.id] = sunEventsOf(leg)
  }
  return {
    map,
    geography: options.geography,
    comparisons: options.comparisons ?? [],
    stories: legStories,
    sunEvents: events,
    forecasts: options.forecasts ?? {},
    viewerTz: options.viewerTz,
    h24: options.h24,
    day: options.day ?? null,
    days: options.days ?? null,
  }
}

/** A flight's milestones, once its story is ready. */
export function factsMilestones(facts: TripFacts, leg: MapLeg): Milestone[] {
  const story = facts.stories[leg.id]
  return story ? milestones(leg, story) : []
}

/** "Over Kansas", "Over Québec, near Montréal", from the flight's story. */
export function belowText(facts: TripFacts, leg: MapLeg, t: number): string | null {
  const story = facts.stories[leg.id]
  const place = story ? placeAtFraction(story, legProgress(leg, t)) : null
  if (!place) return null
  return belowWords(place, facts.geography ? cityNear(facts.geography, positionAtTime(leg, t)) : null)
}

/**
 * In flight: a milestone from the last 5 minutes, else a cockpit sunrise or sunset in the next 30, else the place below,
 * else the landing countdown (§4.4). Null on the ground and on a drive, where Stage 1B's words stay.
 */
export function headline(facts: TripFacts, t: number): string | null {
  const leg = legInMotion(facts.map, t)
  if (!leg || leg.kind !== 'flight') return null
  const recent = factsMilestones(facts, leg).filter((m) => m.time <= t && t - m.time < MILESTONE_HEADLINE_MS).pop()
  if (recent) return milestoneHeadline(recent)
  const soon = (facts.sunEvents[leg.id] ?? []).find((e) => e.time > t && e.time - t <= SUN_HEADLINE_MS)
  if (soon) return cockpitCountdown(soon, t)
  return belowText(facts, leg, t) ?? landingCountdown(leg, t)
}

/** True once a recap's trip is over at `t`. */
export const isRecapOver = (facts: TripFacts, t: number) => facts.map.mode.kind === 'recap' && t >= facts.map.span.end

/** The panel's first line: the headline in flight, "Home from 4 days away" after a recap's trip, else Stage 1B's. */
export function sheetHeadline(facts: TripFacts, t: number): string {
  const inFlight = headline(facts, t)
  if (inFlight) return inFlight
  if (isRecapOver(facts, t)) return recapChip(dayCount(facts.map, facts.viewerTz))
  return panelHeadline(facts.map, t, facts.viewerTz, facts.h24)
}

/** The forecast for `leg` when it lands between the real `now` and 48 hours on, whatever moment the timeline shows (§7.3). */
export function forecastFor(facts: TripFacts, leg: MapLeg, now: number): LandingForecast | null {
  return landsWithinHorizon(leg, now) ? (facts.forecasts[leg.id] ?? null) : null
}

/** Each started flight's milestones so far, newest flight first, then the totals: the trip so far, or the recap (§5.2, §5.5). */
export function tripSoFar(facts: TripFacts, t: number): TripSoFar {
  const started = facts.map.legs.filter((l) => l.kind === 'flight' && l.start <= t).reverse()
  const flights = started.flatMap((leg) => {
    const lines = factsMilestones(facts, leg).filter((m) => m.time <= t).map((m) => milestoneLine(m, facts.viewerTz, facts.h24))
    return lines.length > 0 ? [{ id: leg.id, title: flightTitle(leg), milestones: lines }] : []
  })
  if (isRecapOver(facts, t)) {
    return { flights, totalsTitle: 'Trip recap', totals: soFarText(wholeTotals(facts.map, facts.sunEvents), null, null) }
  }
  return { flights, totalsTitle: 'Trip so far', totals: soFarText(totalsSoFar(facts.map, t, facts.sunEvents), facts.day, facts.days) }
}

/** The card as one sentence for screen readers, ending with what it opens (§6.4, §6.5). */
export function cardSummary(facts: TripFacts, now: number, name: string): string {
  const { map, viewerTz, h24 } = facts
  if (map.mode.kind === 'recap') {
    const summary = recapSummary(dayCount(map, viewerTz), wholeTotals(map, facts.sunEvents), longestFlight(map.legs))
    return `${summary} Opens the map to replay the trip.`
  }
  const leg = currentLeg(map)
  if (leg) {
    const lead = leg.flightNumber ? `${leg.flightNumber} to` : 'Flying to'
    const story = facts.stories[leg.id]
    const place = story ? placeAtFraction(story, legProgress(leg, now)) : null
    const over = place ? `, over ${place.name}` : ''
    return `${lead} ${leg.destination.city}${over}. Lands at ${shortTimeText(leg.end, viewerTz, h24)} your time. Estimated from the schedule. Opens the full map.`
  }
  return tripMapSummary(map, now, name, viewerTz, h24)
}

/** The recap card's numbers. */
export const recapTiles = (facts: TripFacts): RecapTile[] => totalsTiles(wholeTotals(facts.map, facts.sunEvents))

/** "Longest: Dubai → Louisville, 7,382 mi". */
export function recapLongestLine(facts: TripFacts): string | null {
  const longest = longestFlight(facts.map.legs)
  return longest ? `Longest: ${longestText(longest)}` : null
}
```

- [ ] **Step 6: Run it to see it pass.** Run the same command, then `npx tsc --noEmit`. Expected: PASS.

- [ ] **Step 7: Ask to commit.** Suggested message: `The trip map's facts at a moment: the headline, the trip so far, weather's window and the card's words (Stage 2 spec §4.4, §5.2, §6)`

---

### Task 19: The rows

The panel's rows at any moment: in flight, on a layover, at home before a trip, and after a recap's trip (Stage 2 spec §5). This task ports 2A's Task 14.

**Files:**
- Create: `src/facts/tripFactsRows.ts`
- Test: `tests/facts/tripFactsRows.test.ts`

- [ ] **Step 1: Port check.** Run:

```bash
git -C /Users/toddanderson/Dev/Crewluv log --oneline -1 feature/trip-map-facts -- "Crewluv/Services/TripMap/Facts/TripFacts+Rows.swift" CrewluvTests/TripFactsRowsTests.swift
```

  - Nothing printed: tell Todd this task waits for 2A's Task 14, and stop.
  - Otherwise, read both files and compare them with 2A's plan, Task 14. Where the committed Swift differs, change the code and tests below to match (ground rule 6).

- [ ] **Step 2: Write the failing test.** Create `tests/facts/tripFactsRows.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { LandingForecast } from '../../src/data/weather'
import type { FactRow, FactRowKind } from '../../src/facts/factRow'
import { makeTripFacts } from '../../src/facts/tripFacts'
import { factRows, factsAtMoment } from '../../src/facts/tripFactsRows'
import { airportMark, makeTripMap, type MapLeg, type TripMap } from '../../src/map/tripMap'
import { AIRPORTS, at, drive, EUROPE, HOUR } from '../map/tripMapLegs'
import { appComparisons, EQUATOR, equatorFlight, flightMap, mark } from './factsTestData'

const NY = 'America/New_York'
const AM = ' AM'
const PM = ' PM'

const facts = (map: TripMap, forecasts: Record<string, LandingForecast> = {}) =>
  makeTripFacts(map, { geography: EQUATOR, comparisons: appComparisons(), forecasts, viewerTz: NY, h24: false })
const equator = () => flightMap(equatorFlight(0, 20), mark('HOME', 0.5, 14))
const europe = (now: number, options: { isNextTrip?: boolean; isRecap?: boolean } = {}) =>
  makeTripMap(EUROPE, { isNextTrip: options.isNextTrip ?? false, isRecap: options.isRecap, home: 'SDF', now, airports: AIRPORTS })!

function row(kind: FactRowKind, rows: FactRow[]): FactRow {
  const found = rows.find((r) => r.kind === kind)
  if (!found) throw new Error(`no ${kind} row`)
  return found
}

describe('the rows in flight (Stage 2 spec §5.1)', () => {
  const shown = Date.parse('2026-03-20T11:10:00Z')

  it('are below, distance and landing, with no sky row at midday eastbound', () => {
    const rows = factRows(facts(equator()), shown, shown)
    expect(rows.map((r) => r.kind)).toEqual(['below', 'distance', 'headed'])

    expect(row('below', rows)).toMatchObject({ icon: 'MapPin', title: 'Over Bravo, near Testville', detail: `Passes 35 mi from home at 8:21${AM}` })
    expect(row('distance', rows)).toMatchObject({
      icon: 'Path', title: '422 mi flown · 960 to go',
      detail: `Halfway at 7:45${AM} · Averaging about 460 mph · like driving the Alaska Highway`,
    })
    expect(row('headed', rows)).toMatchObject({ icon: 'AirplaneLanding', title: `Lands E20 9:22${AM}`, detail: null })
  })

  it('show weather only for a landing still ahead in real time', () => {
    const withWeather = facts(equator(), { eq: { temperature: 81, unit: 'fahrenheit', code: 0 } })
    const live = row('headed', factRows(withWeather, shown, shown))
    expect(live.detail).toBe('81°F and clear on landing')
    expect(live.hasWeather).toBe(true)

    const replayed = row('headed', factRows(withWeather, shown, Date.parse('2026-03-20T14:00:00Z')))
    expect(replayed.detail).toBeNull()
    expect(replayed.hasWeather).toBe(false)
  })

  it('give the sky before a cockpit sunset', () => {
    const start = Date.parse('2026-11-13T18:00:00Z')
    const leg: MapLeg = { id: 'evening', kind: 'flight', origin: airportMark('SDF', AIRPORTS)!, destination: airportMark('CGN', AIRPORTS)!, start, end: start + 8 * HOUR, flightNumber: 'UPS207' }
    const now = Date.parse('2026-11-13T20:30:00Z')
    expect(row('sky', factRows(facts(flightMap(leg, null)), now, now))).toMatchObject({
      icon: 'SunHorizon', title: 'Flying into the night', detail: 'Sunset in 17 min, about 21 min after the people below',
    })
  })
})

describe('the rows on the ground (Stage 2 spec §5.3, §5.4, §5.5)', () => {
  it('on a layover in Cologne, are where, the next flight and the trip so far', () => {
    const rows = factRows(facts(europe(at(12))), at(12), at(12))
    expect(rows.map((r) => r.kind)).toEqual(['whereTheyAre', 'nextFlight', 'tripSoFar'])
    expect(row('whereTheyAre', rows)).toMatchObject({ title: 'In Cologne', detail: `6 hours ahead of you · sunrise at 7:45${AM} there` })
    expect(row('nextFlight', rows)).toMatchObject({
      title: `Next: Dubai, tomorrow 3:00${PM}`, detail: `3,086 mi, like driving coast to coast · lands 6:00${AM} there`,
    })
    expect(row('tripSoFar', rows).detail).toBe('1 city · 4,351 mi · 6 time zones · 1 sunset from the cockpit')
  })

  it('at home the day before, are when they leave, the trip ahead and on the way', () => {
    const rows = factRows(facts(europe(at(-24), { isNextTrip: true })), at(-24), at(-24))
    expect(rows.map((r) => r.kind)).toEqual(['leaves', 'tripAhead', 'onTheWay'])
    expect(row('leaves', rows)).toMatchObject({ title: `Leaves tomorrow 7:00${AM}`, detail: 'UPS201 to Cologne' })
    expect(row('tripAhead', rows).detail).toBe('4 days · Cologne, Dubai · 14,819 mi · like digging straight through the Earth twice')
    expect(row('onTheWay', rows).detail).toBe('18 time zones · about 1 sunset from the cockpit')
  })

  it('after a recap’s trip, are the trip, on the way and the longest flight', () => {
    const map = europe(at(0), { isRecap: true })
    const later = map.span.end + HOUR
    const rows = factRows(facts(map), later, later)
    expect(rows.map((r) => r.kind)).toEqual(['theTrip', 'onTheWay', 'longestFlight'])
    expect(row('theTrip', rows).detail).toBe('4 days · Cologne, Dubai · 14,819 mi · like digging straight through the Earth twice')
    expect(row('onTheWay', rows).detail).toBe('18 time zones · 1 sunset from the cockpit')
    expect(row('longestFlight', rows).detail).toBe('Dubai → Louisville, 7,382 mi')
  })

  it('on a drive with nothing flown, are none', () => {
    const map = makeTripMap([drive('d', 'LEX', 'SDF', 0, 1)], { isNextTrip: false, home: null, now: at(0.5), airports: AIRPORTS })!
    expect(factRows(facts(map), at(0.5), at(0.5))).toEqual([])
  })
})

describe('the facts at a moment', () => {
  it('gather the headline, the rows and the trip so far', () => {
    const shown = Date.parse('2026-03-20T11:10:00Z')
    const moment = factsAtMoment(facts(equator()), shown, shown)
    expect(moment.headline).toBe('Over Bravo, near Testville')
    expect(moment.rows).toHaveLength(3)
    expect(moment.tripSoFar.totalsTitle).toBe('Trip so far')
  })
})
```

- [ ] **Step 3: Run it to see it fail.** Run `npx vitest run tests/facts/tripFactsRows.test.ts`. Expected: FAIL, because the module doesn't exist.

- [ ] **Step 4: Write it.** Create `src/facts/tripFactsRows.ts`:

```ts
import {
  averageSpeedText, chaseText, closestToHomeText, cockpitEventText, flownText, flyingInto, groundSunText, halfwayText, landsText, midLine,
  moonText, timeDifferenceText,
} from '../copy/facts'
import { longestText, milesText, onTheWayText, soFarText } from '../copy/factsTrip'
import { daysText, shortTimeText } from '../copy/format'
import { dayPhrase, landingLine, nextDepartureChip } from '../copy/tripMap'
import { landingWeatherText } from '../copy/weather'
import { airborneWindow } from '../map/flightProgress'
import { METERS_PER_MILE } from '../map/greatCircle'
import { dayCount, destinationsOf, legDistanceMeters, legInMotion, legProgress, nextFlight, pilotLocation, timeAtFraction, type MapLeg } from '../map/tripMap'
import { HOUR } from '../time/zoned'
import { comparisonFor } from './comparisons'
import { factRow, type FactRow, type FactRowKind, type FactsAtMoment } from './factRow'
import { roundedMiles } from './milestone'
import { chase, COCKPIT_HORIZON, moonSight, nextGroundSunEvent, sunAltitudeOnLeg } from './sky'
import { belowText, forecastFor, isRecapOver, sheetHeadline, tripSoFar, type TripFacts } from './tripFacts'
import { longestFlight, totalsSoFar, wholeTotals, type TripTotals } from './tripTotals'

/**
 * The panel's rows (Stage 2 spec §5), as the app's TripFacts+Rows: in flight, "now, then where to"; on a layover, where
 * they are, the next flight and the trip so far; at home, the trip ahead and its forecast; after a recap's trip, the
 * trip. A row with nothing to say is left out.
 */

const notNull = <T>(value: T | null): value is T => value != null
const miles = (leg: MapLeg) => legDistanceMeters(leg) / METERS_PER_MILE
const compared = (facts: TripFacts, distance: number) => {
  const phrase = comparisonFor(facts.comparisons, distance)
  return phrase ? midLine(phrase) : null
}

// In flight (§5.1)

function belowRow(facts: TripFacts, leg: MapLeg, t: number): FactRow | null {
  const closest = facts.stories[leg.id]?.closestToHome ?? null
  const closestAt = closest ? timeAtFraction(leg, closest.fraction) : null
  const closestLine = closest && closestAt != null ? closestToHomeText(roundedMiles(closest.meters), closestAt, t, facts.viewerTz, facts.h24) : null
  const place = belowText(facts, leg, t)
  if (place) return factRow('below', 'MapPin', place, [closestLine])
  return closestLine ? factRow('below', 'MapPin', closestLine) : null
}

function skyRow(facts: TripFacts, leg: MapLeg, t: number): FactRow | null {
  const next = (facts.sunEvents[leg.id] ?? []).find((e) => e.time > t) ?? null
  const chasing = chase(leg, t)
  const moon = moonSight(leg, t)
  const parts = [
    next ? flyingInto(next.kind) : null,
    next ? cockpitEventText(next, t, facts.viewerTz, facts.h24) : null,
    chasing ? chaseText(chasing) : null,
    moon ? moonText(moon) : null,
  ].filter(notNull)
  if (parts.length === 0) return null
  const icon = next ? 'SunHorizon' : sunAltitudeOnLeg(leg, t) > COCKPIT_HORIZON ? 'Sun' : 'Moon'
  return factRow('sky', icon, parts[0], parts.slice(1))
}

function distanceRow(facts: TripFacts, leg: MapLeg, t: number): FactRow {
  const total = miles(leg)
  const flown = Math.round(total * legProgress(leg, t))
  const halfwayAt = timeAtFraction(leg, 0.5)
  const window = airborneWindow(leg.start, leg.end)
  return factRow('distance', 'Path', flownText(flown, Math.round(total) - flown), [
    halfwayAt != null && halfwayAt > t ? halfwayText(halfwayAt, facts.viewerTz, facts.h24) : null,
    window ? averageSpeedText(total / ((window.end - window.start) / HOUR)) : null,
    compared(facts, total),
  ])
}

function headedRow(facts: TripFacts, leg: MapLeg, now: number): FactRow {
  const forecast = forecastFor(facts, leg, now)
  const zone = leg.destination.timeZone
  return factRow('headed', 'AirplaneLanding', landingLine(leg, facts.viewerTz, facts.h24), [
    forecast ? landingWeatherText(forecast) : null,
    zone ? timeDifferenceText(zone, facts.viewerTz, leg.end) : null,
  ], forecast != null)
}

// On a layover (§5.3)

function whereTheyAreRow(facts: TripFacts, t: number): FactRow | null {
  const place = pilotLocation(facts.map, t)
  if (!place) return null
  const zone = place.timeZone
  const sun = zone ? nextGroundSunEvent(place.place, t) : null
  return factRow('whereTheyAre', 'MapPin', `In ${place.city}`, [
    zone ? timeDifferenceText(zone, facts.viewerTz, t) : null,
    zone && sun ? groundSunText(sun.kind, sun.time, zone, facts.h24) : null,
  ])
}

function nextFlightRow(facts: TripFacts, t: number, now: number): FactRow | null {
  const next = nextFlight(facts.map, t)
  if (!next) return null
  const distance = [milesText(Math.round(miles(next))), compared(facts, miles(next))].filter(notNull).join(', ')
  const forecast = forecastFor(facts, next, now)
  return factRow('nextFlight', 'AirplaneTakeoff', nextDepartureChip(next, t, facts.viewerTz, facts.h24), [
    distance,
    landsText(next, facts.viewerTz, facts.h24),
    forecast ? landingWeatherText(forecast) : null,
  ], forecast != null)
}

function tripSoFarRow(facts: TripFacts, t: number): FactRow | null {
  const line = soFarText(totalsSoFar(facts.map, t, facts.sunEvents), facts.day, facts.days)
  return line ? factRow('tripSoFar', 'ChartBar', 'Trip so far', [line]) : null
}

// At home before a trip (§5.4)

function leavesRow(facts: TripFacts, t: number, now: number): FactRow | null {
  const first = nextFlight(facts.map, t)
  if (!first) return null
  const when = `${dayPhrase(first.start, t, facts.viewerTz)} ${shortTimeText(first.start, facts.viewerTz, facts.h24)}`
  const flight = first.flightNumber ? `${first.flightNumber} to ${first.destination.city}` : `Flying to ${first.destination.city}`
  const forecast = forecastFor(facts, first, now)
  return factRow('leaves', 'AirplaneTakeoff', `Leaves ${when}`, [flight, forecast ? landingWeatherText(forecast) : null], forecast != null)
}

// Shared by the trip ahead and the recap

/** "4 days · Cologne, Dubai · 9,800 mi · like driving the Alaska Highway 7 times". */
function tripRow(facts: TripFacts, kind: FactRowKind, title: string, totals: TripTotals): FactRow {
  const cities = destinationsOf(facts.map.legs, facts.map.home).map((a) => a.city)
  return factRow(kind, 'GlobeHemisphereWest', title, [
    daysText(dayCount(facts.map, facts.viewerTz)),
    cities.length > 0 ? cities.join(', ') : null,
    totals.miles > 0 ? milesText(totals.miles) : null,
    compared(facts, totals.miles),
  ])
}

function onTheWayRow(totals: TripTotals, isForecast: boolean): FactRow | null {
  const line = onTheWayText(totals, isForecast)
  return line ? factRow('onTheWay', 'ChartBar', 'On the way', [line]) : null
}

/** The rows at `t` on the timeline, with `now` the real time, for weather. */
export function factRows(facts: TripFacts, t: number, now: number): FactRow[] {
  const leg = legInMotion(facts.map, t)
  if (leg) {
    if (leg.kind !== 'flight') return [tripSoFarRow(facts, t)].filter(notNull)
    return [belowRow(facts, leg, t), skyRow(facts, leg, t), distanceRow(facts, leg, t), headedRow(facts, leg, now)].filter(notNull)
  }
  if (isRecapOver(facts, t)) {
    const whole = wholeTotals(facts.map, facts.sunEvents)
    const longest = longestFlight(facts.map.legs)
    return [
      tripRow(facts, 'theTrip', 'The trip', whole),
      onTheWayRow(whole, false),
      longest ? factRow('longestFlight', 'ArrowsHorizontal', 'Longest flight', [longestText(longest)]) : null,
    ].filter(notNull)
  }
  if (facts.map.mode.kind === 'nextTrip' && t < facts.map.span.start) {
    const whole = wholeTotals(facts.map, facts.sunEvents)
    return [leavesRow(facts, t, now), tripRow(facts, 'tripAhead', 'The trip ahead', whole), onTheWayRow(whole, true)].filter(notNull)
  }
  return [whereTheyAreRow(facts, t), nextFlightRow(facts, t, now), tripSoFarRow(facts, t)].filter(notNull)
}

/** Everything the full map's panel shows at `t`: the headline, the rows and the trip so far. */
export function factsAtMoment(facts: TripFacts, t: number, now: number): FactsAtMoment {
  return { headline: sheetHeadline(facts, t), rows: factRows(facts, t, now), tripSoFar: tripSoFar(facts, t) }
}
```

- [ ] **Step 5: Run it to see it pass.** Run the same command, then `npx tsc --noEmit`. Expected: PASS.

- [ ] **Step 6: Ask to commit.** Suggested message: `The trip map's facts rows in flight, on a layover, at home and in the recap (Stage 2 spec §5)`

---

### Task 20: The shared facts cases

`facts-cases.json` holds the app and the website to the same answers (Stage 2 spec §12.1), as `progress-cases.json` did for Stage 1. This task copies 2A's Task 15 file and runs every case.

**Files:**
- Create (copy): `tests/fixtures/trip-map/facts-cases.json`
- Test: `tests/facts/factsCases.test.ts`

- [ ] **Step 1: Port check, and the copy.** Run:

```bash
git -C /Users/toddanderson/Dev/Crewluv log --oneline -1 feature/trip-map-facts -- CrewluvTests/Fixtures/TripMap/facts-cases.json CrewluvTests/FactsCasesTests.swift
```

  - Nothing printed: tell Todd this task waits for 2A's Task 15, and stop.
  - Otherwise, read both, and compare `FactsCasesTests.swift` with 2A's plan, Task 15, Step 3. Where it differs, follow it below. Then copy the cases:

```bash
cd "/Users/toddanderson/Dev/Crewluve Website" && git -C /Users/toddanderson/Dev/Crewluv show feature/trip-map-facts:CrewluvTests/Fixtures/TripMap/facts-cases.json > tests/fixtures/trip-map/facts-cases.json && head -c 300 tests/fixtures/trip-map/facts-cases.json
```

- [ ] **Step 2: Write the test.** Create `tests/facts/factsCases.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { comparisonFor } from '../../src/facts/comparisons'
import { CITY_RADIUS_M, cityNear, parseGeography, placeAt } from '../../src/facts/geography'
import { WEATHER_HORIZON_MS } from '../../src/facts/landingWeather'
import { HOLD_DISTANCE_M, HOME_RADIUS_M, SAMPLE_SPACING_M } from '../../src/facts/legStory'
import { MILESTONE_HEADLINE_MS } from '../../src/facts/milestone'
import { moonAltitude } from '../../src/facts/moonPosition'
import { COCKPIT_HORIZON, nextGroundSunEvent, sunEvents } from '../../src/facts/sky'
import { factsMilestones, headline, makeTripFacts, SUN_HEADLINE_MS } from '../../src/facts/tripFacts'
import { wholeTotals } from '../../src/facts/tripTotals'
import { METERS_PER_MILE } from '../../src/map/greatCircle'
import type { MapLeg, TripMap } from '../../src/map/tripMap'
import { moonPhase } from '../../src/time/moon'
import { appComparisons, appGeography, flightMap, mark } from './factsTestData'

/** The app's shared cases (Crewluv's CrewluvTests/Fixtures/TripMap/facts-cases.json): change both copies together. */
interface Story {
  name: string
  /** Latitude, longitude. */
  from: number[]
  to: number[]
  departure: string
  arrival: string
  home: number[] | null
  milestones: { kind: string; name?: string; miles?: number; time: string }[]
}

interface Cases {
  constants: {
    cockpitHorizonDegrees: number; milestoneMinutes: number; sunHeadlineMinutes: number; sampleMiles: number
    holdMiles: number; homeRadiusMiles: number; cityRadiusMiles: number; weatherHours: number
  }
  comparisons: { miles: number; phrase: string | null }[]
  places: { lat: number; lon: number; place: string; kind: string; country: string | null }[]
  cities: { lat: number; lon: number; city: string | null }[]
  testGeography: unknown
  stories: Story[]
  headlines: { story: string; at: string; text: string }[]
  sunEvents: { name: string; from: number[]; to: number[]; departure: string; arrival: string; events: { kind: string; time: string; peopleBelowMinutes: number | null }[] }[]
  moonPhases: { at: string; phase: string }[]
  moonUp: { lat: number; lon: number; at: string; isUp: boolean }[]
  groundSun: { lat: number; lon: number; after: string; kind: string; time: string }[]
  totals: {
    airports: Record<string, number[]>
    home: string
    legs: { id: string; from: string; to: string; departure: string; arrival: string; fromZone: string; toZone: string }[]
    cities: number; miles: number; timeZones: number; cockpitSunsets: number
  }
}

const cases = JSON.parse(readFileSync(new URL('../fixtures/trip-map/facts-cases.json', import.meta.url), 'utf8')) as Cases
const testGeography = parseGeography(cases.testGeography)
const MINUTE = 60_000
const NY = 'America/New_York'

/** Times match to within a minute (§12.1): Swift and TypeScript round differently. */
const within = (time: number, iso: string) => expect(Math.abs(time - Date.parse(iso))).toBeLessThanOrEqual(MINUTE)
/** A milestone or a case without its time: `toEqual` passes over a property that's undefined. */
const withoutTime = <T extends { time: unknown }>(m: T) => ({ ...m, time: undefined })

function flight(id: string, from: number[], to: number[], departure: string, arrival: string): MapLeg {
  return {
    id, kind: 'flight', origin: mark(`${id}-from`, from[0], from[1]), destination: mark(`${id}-to`, to[0], to[1]),
    start: Date.parse(departure), end: Date.parse(arrival), flightNumber: null,
  }
}

function storyFacts(story: Story) {
  const leg = flight(story.name, story.from, story.to, story.departure, story.arrival)
  const home = story.home ? mark('HOME', story.home[0], story.home[1]) : null
  return makeTripFacts(flightMap(leg, home), { geography: testGeography, comparisons: null, viewerTz: NY, h24: false })
}

describe('the shared facts cases (Stage 2 spec §12.1)', () => {
  it('use the app’s constants', () => {
    const c = cases.constants
    expect(COCKPIT_HORIZON).toBeCloseTo(c.cockpitHorizonDegrees, 4)
    expect(MILESTONE_HEADLINE_MS).toBe(c.milestoneMinutes * MINUTE)
    expect(SUN_HEADLINE_MS).toBe(c.sunHeadlineMinutes * MINUTE)
    expect(SAMPLE_SPACING_M).toBeCloseTo(c.sampleMiles * METERS_PER_MILE, 6)
    expect(HOLD_DISTANCE_M).toBeCloseTo(c.holdMiles * METERS_PER_MILE, 6)
    expect(HOME_RADIUS_M).toBeCloseTo(c.homeRadiusMiles * METERS_PER_MILE, 6)
    expect(CITY_RADIUS_M).toBeCloseTo(c.cityRadiusMiles * METERS_PER_MILE, 6)
    expect(WEATHER_HORIZON_MS).toBe(c.weatherHours * 60 * MINUTE)
  })

  it.each(cases.comparisons)('compare $miles mi', ({ miles, phrase }) => {
    expect(comparisonFor(appComparisons(), miles)).toBe(phrase)
  })

  it.each(cases.places)('find $place at $lat, $lon', (c) => {
    expect(placeAt(appGeography(), { lat: c.lat, lng: c.lon })).toEqual({ name: c.place, kind: c.kind, country: c.country })
  })

  it.each(cases.cities)('find $city near $lat, $lon', (c) => {
    expect(cityNear(appGeography(), { lat: c.lat, lng: c.lon })?.name ?? null).toBe(c.city)
  })

  it.each(cases.stories)('list the $name story’s milestones', (story) => {
    const facts = storyFacts(story)
    const found = factsMilestones(facts, facts.map.legs[0])
    expect(found.map(withoutTime)).toEqual(story.milestones.map(withoutTime))
    found.forEach((m, i) => within(m.time, story.milestones[i].time))
  })

  it.each(cases.headlines)('read "$text" on the $story story at $at', (c) => {
    const story = cases.stories.find((s) => s.name === c.story)!
    expect(headline(storyFacts(story), Date.parse(c.at))).toBe(c.text)
  })

  it.each(cases.sunEvents)('see the sun from the cockpit: $name', (c) => {
    const events = sunEvents(flight('sun', c.from, c.to, c.departure, c.arrival))
    expect(events.map((e) => e.kind)).toEqual(c.events.map((e) => e.kind))
    events.forEach((e, i) => {
      within(e.time, c.events[i].time)
      expect(Math.abs((e.peopleBelowGap ?? 0) / MINUTE - (c.events[i].peopleBelowMinutes ?? 0))).toBeLessThanOrEqual(1)
    })
  })

  it.each(cases.moonPhases)('name the moon $phase at $at', (c) => {
    expect(moonPhase(Date.parse(c.at))).toBe(c.phase)
  })

  it.each(cases.moonUp)('know whether the moon is up at $lat, $lon at $at', (c) => {
    expect(moonAltitude(c.lat, c.lon, Date.parse(c.at)) > 0).toBe(c.isUp)
  })

  it.each(cases.groundSun)('find the next $kind on the ground after $after', (c) => {
    const event = nextGroundSunEvent({ lat: c.lat, lng: c.lon }, Date.parse(c.after))!
    expect(event.kind).toBe(c.kind)
    within(event.time, c.time)
  })

  it('total a trip', () => {
    const c = cases.totals
    const airport = (code: string, zone: string | null) => mark(code, c.airports[code][0], c.airports[code][1], code, zone)
    const legs: MapLeg[] = c.legs.map((l) => ({
      id: l.id, kind: 'flight', origin: airport(l.from, l.fromZone), destination: airport(l.to, l.toZone),
      start: Date.parse(l.departure), end: Date.parse(l.arrival), flightNumber: null,
    }))
    const map: TripMap = { mode: { kind: 'onTrip' }, legs, home: airport(c.home, null), span: { start: legs[0].start, end: legs[legs.length - 1].end }, days: null }
    const events = Object.fromEntries(legs.map((leg) => [leg.id, sunEvents(leg)]))
    expect(wholeTotals(map, events)).toEqual({ cities: c.cities, miles: c.miles, timeZones: c.timeZones, cockpitSunsets: c.cockpitSunsets })
  })
})
```

- [ ] **Step 3: Run it.** Run `npx vitest run tests/facts/factsCases.test.ts`. Expected: PASS, every case.
  - If a case fails, find out whether the port or the case is wrong. Read the committed Swift's answer for it in `FactsCasesTests.swift`.
  - A port bug: fix it in the task it belongs to, and note it.
  - A case that looks wrong for the app too: tell Todd (ground rule 6). Don't change the website's copy of the cases, and don't widen a tolerance.

- [ ] **Step 4: Ask to commit.** Suggested message: `The app's shared facts cases, copied in and run on the website too (Stage 2 spec §12.1)`

**Batch C review:** dispatch `superpowers:code-reviewer` (sonnet) on Tasks 15–20 against the Stage 2 spec §4, §5, §6.5, §8 and §12.1, and 2A's committed Swift.

---
### Task 21: Loading the facts' data

`geography.json` and `comparisons.json` are fetched from the site itself, once a page, and only when they're needed (Stage 2 spec §10). If the geography can't be had, the facts go on without places (§11).

**Files:**
- Create: `src/facts/factsData.ts`, `src/ui/hooks/useFactsData.ts`
- Test: `tests/ui/useFactsData.test.tsx`

- [ ] **Step 1: Write the failing test.** Create `tests/ui/useFactsData.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const KANSAS = { name: 'Kansas', kind: 'state', country: 'the United States', box: [-102, 37, -94.6, 40], rings: [[-102, 37, -94.6, 37, -94.6, 40, -102, 40]] }

/** A fresh copy of the hooks, so each test starts with nothing loaded. */
async function freshHooks() {
  vi.resetModules()
  return import('../../src/ui/hooks/useFactsData')
}

function stubFetch(reply: (url: string) => Response) {
  const fetch = vi.fn(async (url: string) => reply(url))
  vi.stubGlobal('fetch', fetch)
  return fetch
}

describe('loading the facts’ data (Stage 2 spec §10, §11)', () => {
  it('fetches nothing until it’s wanted, then each file once from the site itself', async () => {
    const { useComparisons, useGeography } = await freshHooks()
    const fetch = stubFetch((url) => new Response(JSON.stringify(url.includes('geography') ? { areas: [KANSAS], cities: [] } : [{ miles: 2800, one: 'Like driving coast to coast', many: 'x' }])))
    function Shown({ wanted }: { wanted: boolean }) {
      const geography = useGeography(wanted)
      const comparisons = useComparisons(wanted)
      return <p>{`${geography?.areas.length ?? 'none'} ${comparisons?.length ?? 'none'}`}</p>
    }
    const { container, rerender } = render(<Shown wanted={false} />)
    expect(fetch).not.toHaveBeenCalled()
    rerender(<Shown wanted />)
    await waitFor(() => expect(container.textContent).toBe('1 1'))
    render(<Shown wanted />)
    expect(fetch.mock.calls.map(([url]) => url).sort()).toEqual(['/data/comparisons.json', '/data/geography.json'])
  })

  it('goes on without places when the geography can’t be had', async () => {
    const { useGeography } = await freshHooks()
    stubFetch(() => new Response('', { status: 404 }))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Shown() {
      const geography = useGeography(true)
      return <p>{geography ? `${geography.areas.length} areas` : 'loading'}</p>
    }
    const { container } = render(<Shown />)
    await waitFor(() => expect(container.textContent).toBe('0 areas'))
    expect(error).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it to see it fail.** Run `npx vitest run tests/ui/useFactsData.test.tsx`. Expected: FAIL, because the modules don't exist.

- [ ] **Step 3: The loaders.** Create `src/facts/factsData.ts`:

```ts
import { parseComparisons, type Comparison } from './comparisons'
import { parseGeography, type Geography } from './geography'

/** The facts' data (Stage 2 spec §9, §10): copies of the app's files in public/data, fetched from the site itself. */

export async function loadGeography(url = `${import.meta.env.BASE_URL}data/geography.json`): Promise<Geography> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`geography.json ${res.status}`)
  return parseGeography(await res.json())
}

export async function loadComparisons(url = `${import.meta.env.BASE_URL}data/comparisons.json`): Promise<Comparison[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`comparisons.json ${res.status}`)
  return parseComparisons(await res.json())
}
```

- [ ] **Step 4: The hooks.** Create `src/ui/hooks/useFactsData.ts`:

```ts
import { useEffect, useState } from 'preact/hooks'
import type { Comparison } from '../../facts/comparisons'
import { loadComparisons, loadGeography } from '../../facts/factsData'
import { EMPTY_GEOGRAPHY, type Geography } from '../../facts/geography'

/** One download of each per page, shared by the card and the full map. A failed one is tried again the next time it's wanted. */
let geography: Promise<Geography> | null = null
let comparisons: Promise<Comparison[]> | null = null

/** What `start` gives once `enabled` has been true, else null. `start` stays out of the dependencies: it never changes. */
function useLoaded<T>(enabled: boolean, start: () => Promise<T>): T | null {
  const [value, setValue] = useState<T | null>(null)
  useEffect(() => {
    if (!enabled) return
    let live = true
    void start().then((loaded) => {
      if (live) setValue(loaded)
    })
    return () => {
      live = false
    }
  }, [enabled])
  return value
}

/**
 * The trip map's geography once it has loaded, else null (Stage 2 spec §10). Nothing is fetched until `enabled`: a
 * flight in the air, or the full map open. If it can't be had, it's logged and the geography is empty, so the facts go
 * on without places (§11).
 */
export function useGeography(enabled: boolean): Geography | null {
  return useLoaded(enabled, () =>
    (geography ??= loadGeography().catch((err: unknown) => {
      console.error('Could not load the trip map’s geography', err)
      geography = null
      return EMPTY_GEOGRAPHY
    })))
}

/** The comparisons once loaded, else null, fetched only when `enabled`: the full map open. If they can't be had, none (§10). */
export function useComparisons(enabled: boolean): Comparison[] | null {
  return useLoaded(enabled, () =>
    (comparisons ??= loadComparisons().catch((err: unknown) => {
      console.error('Could not load the trip map’s comparisons', err)
      comparisons = null
      return []
    })))
}
```

- [ ] **Step 5: Run it to see it pass.** Run the same command, then `npx vitest run tests/fixtures tests/data` and `npx tsc --noEmit`. Expected: PASS. The source rules allow both requests: plain GETs to the site.

- [ ] **Step 6: Ask to commit.** Suggested message: `Loading the trip map's geography and comparisons from the site, once a page and only when needed (Stage 2 spec §10, §11)`

---

### Task 22: The facts on the full map

The status page builds the facts and hands them to the full map, with the data loaded only as needed and the landing weather while the map is open (Stage 2 spec §7.2, §10).

**Files:**
- Modify: `src/ui/PilotPages.tsx`
- Test: `tests/ui/PilotPages.test.tsx`

- [ ] **Step 1: Write the failing tests.** In `tests/ui/PilotPages.test.tsx`:
  - after the `vi.mock` line for `useLand`, add:

```tsx
// So is the facts' data: these tests see the facts without places or comparisons.
vi.mock('../../src/ui/hooks/useFactsData', () => ({ useGeography: () => null, useComparisons: () => null }))
```

  - add inside `describe('PilotPages: the status page and the Schedule page (slice 3A §3.3)', …)`, after the test that opens the full map from its address:

```tsx
  it('shows the facts on the full map, with the demo’s weather on landing (Stage 2 spec §5.1, §7)', async () => {
    history.replaceState(null, '', '/#map')
    render(<PilotPages schedule={handle(demoRawForScene('flying', NOW))} airports={testAirports} demo onLeave={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'More facts' }))
    expect((await screen.findAllByText(/61°F and cloudy on landing/)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/mi flown/).length).toBeGreaterThan(0)
  })

  it('asks for no landing weather until the full map opens (Stage 2 spec §7.2)', () => {
    const loadLanding = vi.fn(async () => null)
    render(<PilotPages schedule={handle(demoRawForScene('flying', NOW))} airports={testAirports} demo={false} onLeave={() => {}}
      loadWeather={async () => null} loadLanding={loadLanding} />)
    expect(loadLanding).not.toHaveBeenCalled()
  })
```

- [ ] **Step 2: Run them to see them fail.** Run `npx vitest run tests/ui/PilotPages.test.tsx`. Expected: FAIL: the full map has no "More facts", and `loadLanding` isn't a prop.

- [ ] **Step 3: Build the facts.** In `src/ui/PilotPages.tsx`:
  - change the two data imports to:

```tsx
import { loadDemoLandingForecast, loadDemoWeather } from '../data/demoWeather'
import {
  loadLiveLandingForecast, loadLiveWeather, tempUnitFor, type LandingLoader, type TempUnit, type WeatherLoader, type WeatherPlace,
} from '../data/weather'
```

  - add:

```tsx
import { makeTripFacts } from '../facts/tripFacts'
import { factsAtMoment } from '../facts/tripFactsRows'
import { useComparisons, useGeography } from './hooks/useFactsData'
import { useLandingWeather } from './hooks/useLandingWeather'
```

  - in `PilotPagesProps`, after `loadWeather`, add:

```tsx
  /** Where the full map's landing forecasts come from: the demo's samples, or Open-Meteo (Stage 2 spec §7). Tests pass their own. */
  loadLanding?: LandingLoader
```

  - in the function's parameters, after `loadWeather = demo ? loadDemoWeather : loadLiveWeather,`, add `loadLanding = demo ? loadDemoLandingForecast : loadLiveLandingForecast,`;
  - after `const mapPage = useTripMapPage()`, add:

```tsx
  // The facts' data (Stage 2 spec §7.2, §10): the geography while a flight is in the air or the full map is open, the
  // comparisons and the landing weather only while it's open.
  const mapOpen = mapPage.open && tripMap != null
  const geography = useGeography(tripMap?.mode.kind === 'inFlight' || mapOpen)
  const comparisons = useComparisons(mapOpen)
  const forecasts = useLandingWeather(mapOpen ? tripMap : null, now, unit, loadLanding)
  const facts = tripMap && snap
    ? makeTripFacts(tripMap, { geography, comparisons, forecasts, viewerTz, h24, day: snap.tripProgress?.day ?? null, days: snap.tripProgress?.days ?? null })
    : null
```

  - in the `TripMapPage` element, after `onBack={mapPage.back}`, add `factsAt={facts ? (t, real) => factsAtMoment(facts, t, real) : undefined}`.

- [ ] **Step 4: Run them to see them pass.** Run the same command, then `npx tsc --noEmit`. Expected: PASS, with the file's other tests still passing.

- [ ] **Step 5: Look at it (Todd).** Run `npm run dev` and open `http://localhost:5180/?demo=1&scene=flying#map`:
  - wide: the side panel's rows, the trip so far and "Weather: Open-Meteo" under them; "Hide facts" folds it to the corner and the camera re-frames;
  - narrow: "More facts" and "Fewer facts";
  - the replay: the rows follow the timeline. Weather shows only for landings still ahead in real time, whatever moment the timeline shows (§7.3).

- [ ] **Step 6: Ask to commit.** Suggested message: `The trip map's facts on the full map: built on the status page, with the data and the landing weather loaded only when needed (Stage 2 spec §7.2, §10)`

---

### Task 23: The card and the recap card

In flight the card's chip shows the headline. For a day after a trip, the card is its recap: "Home from 2 days away", "Replay the trip", the trip's numbers and its longest flight (Stage 2 spec §6.4, §6.5). This task mirrors 2A's Task 20 for the website.

**Files:**
- Create: `src/ui/TripRecapBar.tsx`
- Modify: `src/ui/TripMapCard.tsx`, `src/ui/StatusScreen.tsx`, `src/ui/PilotPages.tsx`
- Modify: `src/styles/tripMap.css` (add at the end)
- Test: `tests/ui/TripMapCard.test.tsx` (add a `describe` at the end), `tests/ui/PilotPages.test.tsx`

- [ ] **Step 1: Port check.** Run:

```bash
git -C /Users/toddanderson/Dev/Crewluv log --oneline -1 feature/trip-map-facts -- Crewluv/Views/TripMap/TripMapCard.swift Crewluv/Views/TripMap/TripRecapBar.swift
```

  - Nothing printed: 2A's card isn't committed yet. This task can still run from the spec (§6.4, §6.5). Say so to Todd, and compare with 2A's card at the final review (Task 24).
  - Otherwise, read both files and compare them with 2A's plan, Task 20. Carry over any change to what the card says or shows.

- [ ] **Step 2: Write the failing tests.** In `tests/ui/TripMapCard.test.tsx`, add at the end:

```tsx
describe('the card’s facts (Stage 2 spec §6.4, §6.5)', () => {
  const NY = 'America/New_York'
  const show = (map: TripMap, now: number) => {
    const facts = makeTripFacts(map, { geography: null, comparisons: null, viewerTz: NY, h24: false })
    return render(<TripMapCard map={map} now={now} viewerTz={NY} h24={false} name="Alex" day={null} days={null} delayMinutes={null} land={null}
      onOpenMap={() => {}} facts={facts} />)
  }

  it('in flight, puts the headline on the chip: a cockpit sunset coming up', () => {
    const { container } = show(makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(5.5), airports: AIRPORTS })!, at(5.5))
    expect(container.querySelector('.trip-map-chip.bottom')!.textContent).toMatch(/^Sunset from the cockpit in \d+ min$/)
  })

  it('for a day after the trip, is its recap', () => {
    const map = makeTripMap(EUROPE, { isNextTrip: false, isRecap: true, home: 'SDF', now: at(75), airports: AIRPORTS })!
    const { container } = show(map, at(75))
    expect(screen.getByRole('heading', { name: 'Trip recap' })).toBeTruthy()
    expect(container.querySelector('.trip-map-chip.top')!.textContent).toBe('Home from 4 days away')
    expect(container.querySelector('.trip-map-chip.bottom')!.textContent).toBe('Replay the trip')
    expect([...container.querySelectorAll('.trip-recap-tiles li')].map((li) => li.textContent)).toEqual(['2cities', '14,819miles', '18time zones', '1sunset aloft'])
    expect(screen.getByText('Longest: Dubai → Louisville, 7,382 mi')).toBeTruthy()
    expect(container.querySelector('.trip-map-stats')).toBeNull()
    expect(container.querySelector('[data-trip-map-open]')!.getAttribute('aria-label')).toBe(
      'Trip recap: home from 4 days away. 2 cities, 14,819 miles, 18 time zones, 1 sunset from the cockpit. ' +
        'Longest flight, Dubai to Louisville, 7,382 miles. Opens the map to replay the trip.',
    )
  })
})
```

  Add the imports it needs: `import { makeTripFacts } from '../../src/facts/tripFacts'`, `type TripMap` and `makeTripMap` from `'../../src/map/tripMap'`, `screen` from `'@testing-library/preact'`, and `AIRPORTS`, `at` and `EUROPE` from `'../map/tripMapLegs'`, where missing.

  In `tests/ui/PilotPages.test.tsx`, add after the test from Task 22:

```tsx
  it('shows the recap card the evening after a trip, and opens its replay paused at the start (Stage 2 spec §6.5)', () => {
    const { container } = render(<PilotPages schedule={handle(demoRawForScene('recap', NOW))} airports={testAirports} demo onLeave={() => {}} />)
    expect(container.querySelector('.trip-map-chip.top')!.textContent).toBe('Home from 2 days away')
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-trip-map-open]')!)
    expect(container.querySelector('.trip-map-page')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Live' })).toBeTruthy()
  })
```

- [ ] **Step 3: Run them to see them fail.** Run `npx vitest run tests/ui/TripMapCard.test.tsx tests/ui/PilotPages.test.tsx`. Expected: FAIL.

- [ ] **Step 4: The recap bar.** Create `src/ui/TripRecapBar.tsx`:

```tsx
import type { RecapTile } from '../copy/factsTrip'

/**
 * The bar under the recap card's map (Stage 2 spec §6.5): up to four numbers, then the longest flight. The card's button
 * says all of it in one sentence, so screen readers skip the bar.
 */
export function TripRecapBar({ tiles, longest }: { tiles: RecapTile[]; longest: string | null }) {
  if (tiles.length === 0 && !longest) return null
  return (
    <div class="trip-recap-bar" aria-hidden="true">
      {tiles.length > 0 && (
        <ul class="trip-recap-tiles">
          {tiles.map((tile) => (
            <li key={tile.label}>
              <span class="trip-recap-value">{tile.value}</span>
              <span class="trip-recap-label">{tile.label}</span>
            </li>
          ))}
        </ul>
      )}
      {longest && <p class="trip-recap-longest">{longest}</p>}
    </div>
  )
}
```

- [ ] **Step 5: The card.** In `src/ui/TripMapCard.tsx`:
  - add `import { cardSummary, headline, recapLongestLine, recapTiles, type TripFacts } from '../facts/tripFacts'` and `import { TripRecapBar } from './TripRecapBar'`;
  - in `TripMapCardProps`, after `land`, add:

```tsx
  /** The facts (Stage 2 spec §6.4, §6.5): the headline on the chip in flight, the recap's numbers and the spoken summary. */
  facts?: TripFacts | null
```

  - replace the body of `TripMapCard`, from `const leg = currentLeg(p.map)` to the end of its `return`, with:

```tsx
  const leg = currentLeg(p.map)
  const isRecap = p.map.mode.kind === 'recap'
  const chips = cardChips(p.map, p.now, p.viewerTz, p.h24)
  // In flight the bottom chip is the facts' headline, which falls back to the landing countdown (§6.4).
  const bottom = (leg && p.facts ? headline(p.facts, p.now) : null) ?? chips.bottom
  const summary = p.facts ? cardSummary(p.facts, p.now, p.name) : tripMapSummary(p.map, p.now, p.name, p.viewerTz, p.h24)
  return (
    <section class="card glass trip-map-card">
      <h2 ref={p.headingRef} class="sr-only" tabIndex={-1}>{leg ? 'In flight' : isRecap ? 'Trip recap' : 'Trip map'}</h2>
      <button type="button" class="trip-map-open" data-trip-map-open aria-label={summary} onClick={() => p.onOpenMap()}>
        <span ref={box} class="trip-map-frame">
          <TripMapSvg map={p.map} t={p.now} width={width} height={MAP_HEIGHT} focus={leg} land={p.land} nightStep={60_000} />
        </span>
        {chips.top && <span class="trip-map-chip top" aria-hidden="true">{chips.top}</span>}
        {bottom && (
          <span class="trip-map-chip bottom" aria-hidden="true">
            {isRecap && <PlayMark />}
            {bottom}
          </span>
        )}
      </button>
      {leg && p.delayMinutes != null && (
        <p class={p.delayMinutes < 0 ? 'inflight-banner early' : 'inflight-banner late'}>
          <Icon name={p.delayMinutes < 0 ? 'CheckCircle' : 'Warning'} size={12} />
          <span aria-hidden="true">{delayBannerText(p.delayMinutes)}</span>
          <span class="sr-only">{spokenDelayBanner(p.delayMinutes)}</span>
        </p>
      )}
      {leg ? <InFlightBar leg={leg} {...p} />
        : isRecap && p.facts ? <TripRecapBar tiles={recapTiles(p.facts)} longest={recapLongestLine(p.facts)} />
        : <StatsBar items={statsItems(p.map, p.now, p.day, p.days, p.viewerTz)} />}
    </section>
  )
```

  - after `StatsBar`, add:

```tsx
/** The recap chip's play mark, drawn as the timeline's Replay button draws it (Stage 2 spec §6.5). */
function PlayMark() {
  return (
    <svg class="trip-map-chip-play" width="10" height="10" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 3l11 7-11 7z" />
    </svg>
  )
}
```

- [ ] **Step 6: Hand the facts to the card.** In `src/ui/StatusScreen.tsx`:
  - add `import type { TripFacts } from '../facts/tripFacts'`;
  - in its props interface, after `land?: GeoPoint[][] | null`, add:

```tsx
  /** The trip map's facts, for the card's chip and the recap card (Stage 2 spec §6.4, §6.5). */
  facts?: TripFacts | null
```

  - in the `TripMapCard` element, after `land={p.land ?? null}`, add `facts={p.facts ?? null}`.

  In `src/ui/PilotPages.tsx`, add `facts` to the `status` object, after `land`.

- [ ] **Step 7: Style them.** At the end of `src/styles/tripMap.css`, add:

```css
/* The recap card (Stage 2 spec §6.5): the play mark on its chip, and a bar of up to four numbers and the longest flight
   that wraps on narrow screens and at large text sizes. */
.trip-map-chip-play { margin-right: 4px; fill: currentColor; vertical-align: -1px; }
.trip-recap-bar { padding: 10px 16px 12px; }
.trip-recap-tiles { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 12px; margin: 0; padding: 0; list-style: none; }
.trip-recap-tiles li { display: flex; flex-direction: column; }
.trip-recap-value { font-size: 1.25rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.trip-recap-label { color: var(--text-2); font-size: 0.8rem; }
.trip-recap-longest { margin: 8px 0 0; color: var(--text-2); font-size: 0.85rem; }
```

- [ ] **Step 8: Run them to see them pass.** Run the command from Step 3, then `npm test` and `npx tsc --noEmit`. Expected: PASS.

- [ ] **Step 9: Ask to commit.** Suggested message: `The trip map card's facts: the headline on its chip in flight, and the recap card for a day after a trip (Stage 2 spec §6.4, §6.5)`

---

### Task 24: Docs, a look at every state, and the final review

**Files:**
- Modify: `README.md`
- Modify: this plan (a "Changes made during execution" section at the end)

- [ ] **Step 1: README.** In `README.md`:
  - in the Demo line, add `recap` to the scenes listed;
  - replace the Trip map line with: "Trip map: the card on every scene with a trip; tap it, or add `#map`, for the full map with the trip's facts. `recap` shows the recap card the evening after a trip.";
  - under "Regenerate data", after the `npm run land` paragraph, add: "`public/data/geography.json` and `public/data/comparisons.json` are copies of the app's, in Crewluv's `Crewluv/Resources/TripMap/`, and `tests/fixtures/trip-map/facts-cases.json` is a copy of its `CrewluvTests/Fixtures/TripMap/facts-cases.json`. The app makes `geography.json` from Natural Earth (public domain) with `node scripts/build-geography.mjs`. Change each pair together."

- [ ] **Step 2: The final review.** Dispatch `superpowers:code-reviewer` (sonnet) on the whole of Stage 2B against the Stage 2 spec §4–§8, §10–§12 and this plan. Ask it also to compare:
  - Task 6's `flightsToForecast` with 2A's committed `LandingWeather.swift`;
  - Task 7's moon with 2A's committed `MoonPosition.swift`;
  - Task 23's card with 2A's committed `TripMapCard.swift` and `TripRecapBar.swift`, if Task 23 ran before they were committed.

  Apply the fixes Todd agrees to.

- [ ] **Step 3: Check it all.** Run `npm test` and `npm run build`. Both must pass. Then confirm the CSP is unchanged:

```bash
git -C "/Users/toddanderson/Dev/Crewluve Website" diff main -- vite.config.ts
```

  Expected: no output.

- [ ] **Step 4: Look at every state (Todd).** Run `npm run dev`, then open `http://localhost:5180/?demo=1&scene=…` for each scene below. Look at each one at a phone width (about 400 px) and a wide window (1280 px or more), in light and dark mode.
  - **`flying`:**
    - the card's chip follows the headline: a milestone, a cockpit sunrise or sunset, the place below, or the landing countdown.
    - On the full map: the rows, below, sky, distance and headed, with the weather on landing and the Open-Meteo credit.
    - Wide: the side panel, and the plane framed clear of it. "Hide facts" folds it to the corner.
    - Narrow: "More facts" and "Fewer facts", with the rows scrolling inside the panel.
  - **`layover`:** where they are, with the time difference and the next sunrise or sunset there; the next flight with its comparison; the trip so far.
  - **`home`:** "Leaves …", the trip ahead with its comparison, and on the way.
  - **`recap`:**
    - the card reads "Home from 2 days away" and "Replay the trip", with the numbers and the longest flight;
    - tapping it opens the full map paused at the trip's start, and Play replays it;
    - Live jumps past the trip: the pill reads "Trip recap", and the panel "Home from 2 days away", with the trip, on the way and the longest flight.
  - **Replay:** the rows follow the timeline, and the trip so far lists the milestones up to the moment shown.

  Fix anything found in the task it belongs to, and note it under "Changes made during execution".

- [ ] **Step 5: Record what changed.** Add a "Changes made during execution" section at the end of this plan, as Stage 1B's plan has: what changed from the plan, and why, task by task, including every place the committed Swift differed from 2A's plan. Add a "Left for later" list. Close Stage 1B's "left for later" note about the wide panel there, now that the camera keeps clear of it.

- [ ] **Step 6: Ask to commit.** Suggested message: `The trip map's facts in the README, and the Stage 2B plan's record of changes`

- [ ] **Step 7: Ask about pushing.** Ask Todd whether to push `trip-map-facts` and open a PR into `main`.
  - Only on his yes: note the push in `repo-state.md` first (ground rule 9). Then `git push -u origin trip-map-facts`, and, when he asks for it, `gh pr create --base main`.
  - Remind him that merging into `main` publishes the site (`deploy-pages.yml`), and is his call.
