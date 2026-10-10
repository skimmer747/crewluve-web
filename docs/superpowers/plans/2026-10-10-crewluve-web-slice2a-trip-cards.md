# Crewluve Web Slice 2 Part A (Trip Cards) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Crewluve app's upcoming-trip card and Day N of M card to crewluve.crewlu.net.

**Architecture:** Two pure engine functions in a new `src/engine/trips.ts` work out the cards' data. They feed two new `Snapshot` fields, which follow the app's home-or-base rule. Two Preact cards render those fields. A small copy module turns airport codes into city pills and a spoken route. The airport list gains tidy country names and US state codes when it is rebuilt.

**Tech Stack:** Vite 5.4, TypeScript 5.9 (strict), Preact 10, Vitest 3 with happy-dom and @testing-library/preact.

**Spec:** `docs/superpowers/specs/2026-10-10-crewluve-web-slice2a-trip-cards-design.md`

---

## Execution notes

**Setup and gates**
- **Branch:** work on `slice2a` in the main project folder. Run `git switch -c slice2a` from an up-to-date `main`. Don't use git worktrees; auto mode blocked a worktree builder during slice 1.
- **Working directory:** run every command from the project root, `~/Dev/Crewluve Website`. Quote it in shells, since it has a space.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass before every commit that touches code. The suite was 1006 tests in 45 files before this plan.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Network and other repos**
- **Tests never use the network**; `tests/setup/noNetwork.ts` blocks it. Two build scripts do use it: `npm run airports` (Task 2) and `npm run icons` (Task 3) each install one package from npm with `--no-save`. If `package-lock.json` changes after either one, restore it with `git checkout -- package-lock.json`.
- **The Flight Globe folder (`../crewlu-globe`) is read-only for this plan.** Its working copy has an uncommitted change to `public/data/airports.json` that belongs to the user. It adds DJT, West Palm Beach. The site's current list was built from that working copy, matching all 9,056 airports, so Task 2 rebuilds from it as it is. Step 5 then proves only the country and state fields changed. Never edit, stage or commit anything in that folder.
- **Read-only site:** nothing in this plan talks to CrewLu Cloud or changes `src/data/readOnlyFetch.ts`.

**Batches and changes**
- **Batches for helper execution:** A = Tasks 1–4 (data, icons, colors), B = Tasks 5–8 (engine), C = Tasks 9–10 (copy), D = Tasks 11–14 (cards, screen, demo). E = Tasks 15–16 are for the controller, working with the user.
- **If the code has to differ from a printed block, write it down.** Note it under "Execution notes" at the end of this file, and update the spec's §12 decisions log if a decision changed.

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/data/airports.ts` | modify | `Airport.state`, read from an optional seventh tuple field |
| `scripts/build-airports.mjs` | modify | Country names in one spelling, and US state codes from OurAirports |
| `public/data/airports.json` | regenerate | The airport list the site preloads |
| `scripts/build-icons.mjs`, `src/icons/iconPaths.ts` | modify, regenerate | Adds the calendar and clock icons |
| `src/styles/tokens.css` | modify | Five more iOS 26 system colors for the pill blends |
| `src/engine/trips.ts` | create | `tripDays` (moved here), `tripDayNumber`, `upcomingTrip`, `tripProgress` |
| `src/engine/snapshot.ts` | modify | `upcomingTrip` and `tripProgress` fields, and the home-or-base rule |
| `src/copy/format.ts` | modify | `tripCardDepartsText` |
| `src/copy/trips.ts` | create | `upcomingCityPills`, `routeLabel` |
| `src/ui/UpcomingTripCard.tsx` | create | The upcoming trip card |
| `src/ui/TripProgressCard.tsx` | create | The Day N of M card |
| `src/styles/cards.css` | modify | Styles for both cards |
| `src/ui/StatusScreen.tsx` | modify | Places the cards between the countdowns and the footer |
| Tests | create and modify | `tests/engine/trips.test.ts`, `tests/copy/trips.test.ts`, `tests/ui/tripCards.test.tsx`, plus additions to existing files |

---

### Task 1: Airport records carry an optional state

**Files:**
- Modify: `src/data/airports.ts` (the `AirportTuple` type, the `Airport` interface, the loop in `buildAirportIndex`)
- Modify: `tests/fixtures/airports.ts`
- Test: `tests/data/airports.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test inside `describe('buildAirportIndex', …)` in `tests/data/airports.test.ts`, after the last existing `it(…)` in that block:

```ts
  it('keeps a US airport’s state, and has none for a six-field row', () => {
    const idx = buildAirportIndex([
      ['SDF', 'Louisville', 'USA', 38.17, -85.74, 'America/Kentucky/Louisville', 'KY'],
      ['CGN', 'Cologne', 'Germany', 50.87, 7.14, 'Europe/Berlin'],
    ])
    expect(idx.get('SDF')?.state).toBe('KY')
    expect(idx.get('CGN')?.state).toBeNull()
  })
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/data/airports.test.ts`
Expected: FAIL in "keeps a US airport’s state…" with `expected undefined to be 'KY'`.

- [ ] **Step 3: Implement**

In `src/data/airports.ts`, replace the `AirportTuple` type and the `Airport` interface with:

```ts
/** One airport in public/data/airports.json. US airports carry a seventh field, the state code. */
export type AirportTuple = [iata: string, city: string, country: string, lat: number, lng: number, tz: string, state?: string]

export interface Airport {
  iata: string
  city: string
  country: string
  /** USPS state code for US airports ("KY"), else null. An older copy of the file has none. */
  state: string | null
  lat: number
  lng: number
  tz: string
}
```

In `buildAirportIndex`, replace the loop with:

```ts
  for (const [iata, city, country, lat, lng, tz, state] of rows) {
    const code = clean(iata)
    if (!code) continue
    map.set(code, { iata: code, city, country, state: state ?? null, lat, lng, tz })
  }
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/data/airports.test.ts`
Expected: PASS.

- [ ] **Step 5: Give the shared test airports their states, and add Cologne**

Replace the whole of `tests/fixtures/airports.ts` with:

```ts
import { buildAirportIndex } from '../../src/data/airports'

/** A small, fixed airport index so copy/UI tests don't depend on the generated file. */
export const testAirports = buildAirportIndex([
  ['SDF', 'Louisville', 'USA', 38.1746, -85.7382, 'America/Kentucky/Louisville', 'KY'],
  ['LEX', 'Lexington', 'USA', 38.0365, -84.6059, 'America/New_York', 'KY'],
  ['RFD', 'Rockford', 'USA', 42.1954, -89.0972, 'America/Chicago', 'IL'],
  ['ANC', 'Anchorage', 'USA', 61.1744, -149.9983, 'America/Anchorage', 'AK'],
  ['MIA', 'Miami', 'USA', 25.7959, -80.2871, 'America/New_York', 'FL'],
  ['MCO', 'Orlando', 'USA', 28.4312, -81.3081, 'America/New_York', 'FL'],
  ['ONT', 'Ontario', 'USA', 34.056, -117.6012, 'America/Los_Angeles', 'CA'],
  ['HNL', 'Honolulu', 'USA', 21.3245, -157.9251, 'Pacific/Honolulu', 'HI'],
  ['ATL', 'Atlanta', 'USA', 33.6407, -84.4277, 'America/New_York', 'GA'],
  ['CGN', 'Cologne', 'Germany', 50.8659, 7.1427, 'Europe/Berlin'],
])
```

- [ ] **Step 6: Run the gates**

Run: `npx vitest run` and `npx tsc --noEmit`
Expected: everything passes, and tsc prints nothing.

- [ ] **Step 7: Commit**

```bash
git add src/data/airports.ts tests/data/airports.test.ts tests/fixtures/airports.ts
git commit -m "Airport records carry an optional US state code

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Airport list: one spelling per country, and US states

**Files:**
- Modify: `scripts/build-airports.mjs` (whole file)
- Regenerate: `public/data/airports.json`
- Test: `tests/data/airports.test.ts` (the `describe('generated public/data/airports.json', …)` block)

- [ ] **Step 1: Write the failing tests**

Add these two tests at the end of `describe('generated public/data/airports.json', …)` in `tests/data/airports.test.ts`. That block already defines `rows` and `idx`.

```ts
  it('spells every country one way: "USA" for the US, the short English name elsewhere', () => {
    expect(idx.get('SDF')?.country).toBe('USA')
    expect(idx.get('ABE')?.country).toBe('USA') // was "US"
    expect(idx.get('CGN')?.country).toBe('Germany')
    expect(idx.get('AGB')?.country).toBe('Germany') // was "DE"
    expect(idx.get('LHR')?.country).toBe('UK') // was "United Kingdom"
    expect(idx.get('ABZ')?.country).toBe('UK') // was "GB"
    expect(rows.some((r) => r[2] === 'US' || r[2] === 'United States')).toBe(false)
  })

  it('gives US airports their state code, and only them', () => {
    expect(idx.get('SDF')?.state).toBe('KY')
    expect(idx.get('ANC')?.state).toBe('AK')
    expect(idx.get('ABE')?.state).toBe('PA')
    expect(idx.get('CGN')?.state).toBeNull()
    for (const row of rows) if (row.length === 7) expect(row[2]).toBe('USA')
    expect(rows.filter((r) => r.length === 7).length).toBeGreaterThan(1500)
  })
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/data/airports.test.ts`
Expected: both new tests FAIL. For example, `expected 'US' to be 'USA'` for ABE, and `expected null to be 'KY'` for SDF.

- [ ] **Step 3: Replace the build script**

Replace the whole of `scripts/build-airports.mjs` with:

```js
// Builds public/data/airports.json as [iata, city, country, lat, lng, tz] tuples, plus a seventh field, the state code,
// for US airports.
// Source: the Flight Globe's merged list (Crewlu's own airport tables win over OurAirports there).
// Countries: one spelling each, "USA" for the US (as the Crewluve app writes it) and short English names elsewhere.
// States: iso_region from the OurAirports list the globe keeps beside its own ("US-KY" -> "KY").
// Time zones: geo-tz, installed on demand by `npm run airports` and never saved as a dependency.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
// The full dataset keeps apart zones that the default (1970) one merges: the default puts Papeete in
// Pacific/Honolulu ("HST") and La Paz in America/Puerto_Rico ("AST").
const { find } = require('geo-tz/all')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// The Flight Globe checkout is expected next to this repo; set AIRPORTS_SOURCE to read it from elsewhere.
const source = process.env.AIRPORTS_SOURCE ?? resolve(root, '../crewlu-globe/public/data/airports.json')
// The OurAirports list the globe keeps next to it; set AIRPORTS_REGIONS_SOURCE to read it from elsewhere.
const regionsSource = process.env.AIRPORTS_REGIONS_SOURCE ?? resolve(root, '../crewlu-globe/scripts/ourairports.csv')
const outFile = resolve(root, 'public/data/airports.json')

// Zones renamed in recent years, mapped to their older names. These are true aliases: the older name
// is a link to the same zone, and modern runtimes still accept it, but older browsers know only it.
const OLDER_NAMES = new Map([
  ['America/Nuuk', 'America/Godthab'],
  ['Europe/Kyiv', 'Europe/Kiev'],
  ['Pacific/Kanton', 'Pacific/Enderbury'],
])

// Zones too new for older browsers, mapped to a DIFFERENT zone that only has the same rules today.
// These are stand-ins, not aliases: if Mexico or Chile change their rules, they become wrong even in
// modern browsers. Recheck each one every time this file is regenerated.
const SAME_RULES_TODAY = new Map([
  ['America/Ciudad_Juarez', 'America/Denver'], // same rules since Nov 2022
  ['America/Coyhaique', 'America/Punta_Arenas'], // same rules since tzdata 2025b (both are permanently UTC-3)
])
const remapped = new Map()

/** RFC 4180 CSV: a quoted field may hold commas, doubled quotes and line breaks. */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c !== '"') field += c
      else if (text[i + 1] === '"') {
        field += '"'
        i++
      } else quoted = false
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') field += c
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** iata_code -> iso_region ("US-KY") from OurAirports' airports.csv. Closed airports are skipped; the first open one wins. */
function regionsByIata(text) {
  const [header, ...rows] = parseCsv(text)
  const column = (name) => {
    const i = header.indexOf(name)
    if (i < 0) throw new Error(`${regionsSource} has no ${name} column`)
    return i
  }
  const iataAt = column('iata_code')
  const regionAt = column('iso_region')
  const typeAt = column('type')
  const regions = new Map()
  for (const row of rows) {
    const iata = String(row[iataAt] ?? '').trim().toUpperCase()
    if (!iata || row[typeAt] === 'closed' || regions.has(iata)) continue
    regions.set(iata, String(row[regionAt] ?? ''))
  }
  return regions
}
const regions = regionsByIata(readFileSync(regionsSource, 'utf8'))

const longRegionNames = new Intl.DisplayNames(['en'], { type: 'region' })
const shortRegionNames = new Intl.DisplayNames(['en'], { type: 'region', style: 'short' })
// Long English names that have a shorter form: "United Kingdom" -> "UK", "Hong Kong SAR China" -> "Hong Kong".
const shortByLongName = new Map()
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
for (const a of LETTERS) {
  for (const b of LETTERS) {
    const long = longRegionNames.of(a + b)
    const short = shortRegionNames.of(a + b)
    if (long && short && long !== a + b && long !== short) shortByLongName.set(long, short)
  }
}

/** One spelling per country: "USA" for the US (as the Crewluve app writes it), else the short English name. */
function countryName(raw) {
  const value = String(raw ?? '').trim()
  if (value === 'US' || value === 'USA' || value === 'United States') return 'USA'
  if (/^[A-Z]{2}$/.test(value)) return shortRegionNames.of(value) ?? value
  return shortByLongName.get(value) ?? value
}

/** "KY" for a US airport whose OurAirports region is "US-KY"; null for anything else. */
function usState(iata, country) {
  if (country !== 'USA') return null
  return /^US-([A-Z]{2})$/.exec(regions.get(iata) ?? '')?.[1] ?? null
}

const skipped = { 'bad code': 0, duplicate: 0, 'bad coordinates': 0, 'no zone': 0 }
const inRange = (n, limit) => Number.isFinite(n) && Math.abs(n) <= limit
let withoutState = 0

const seen = new Set()
const out = []
for (const r of JSON.parse(readFileSync(source, 'utf8'))) {
  const iata = String(r.iata ?? '').trim().toUpperCase()
  if (!/^[A-Z0-9]{3}$/.test(iata)) {
    skipped['bad code']++
    continue
  }
  if (seen.has(iata)) {
    skipped.duplicate++
    continue
  }
  if (!inRange(r.lat, 90) || !inRange(r.lng, 180)) {
    skipped['bad coordinates']++
    continue
  }
  const found = find(r.lat, r.lng)[0]
  if (!found) {
    skipped['no zone']++
    continue
  }
  const tz = OLDER_NAMES.get(found) ?? SAME_RULES_TODAY.get(found) ?? found
  if (tz !== found) remapped.set(found, (remapped.get(found) ?? 0) + 1)
  seen.add(iata)
  const round = (n) => Math.round(n * 1e4) / 1e4
  const country = countryName(r.country)
  const state = usState(iata, country)
  if (country === 'USA' && !state) withoutState++
  const row = [iata, String(r.city || iata), country, round(r.lat), round(r.lng), tz]
  if (state) row.push(state)
  out.push(row)
}
out.sort((a, b) => (a[0] < b[0] ? -1 : 1))
mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, JSON.stringify(out))
console.log(`wrote ${out.length} airports to ${outFile}`)
console.log(`skipped: ${Object.entries(skipped).map(([reason, n]) => `${n} ${reason}`).join(', ')}`)
console.log(`US airports without a state: ${withoutState}`)
const summarize = (names) =>
  [...remapped]
    .filter(([from]) => names.has(from))
    .map(([from, n]) => `${from} -> ${names.get(from)} (${n})`)
    .join(', ')
const aliases = summarize(OLDER_NAMES)
const standIns = summarize(SAME_RULES_TODAY)
if (aliases) console.log(`mapped to older names: ${aliases}`)
if (standIns) console.log(`stand-ins that only share today's rules, recheck them: ${standIns}`)

// A zone this Node's Intl rejects would throw when a time is formatted in it, so flag any that are left.
const rejected = [...new Set(out.map((row) => row[5]))].filter((zone) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return false
  } catch {
    return true
  }
})
if (rejected.length > 0) console.warn(`warning: this Node's Intl does not know ${rejected.join(', ')}`)
```

- [ ] **Step 4: Rebuild the list**

Run: `npm run airports`

This reads the globe's working copy, the same source slice 1 used. It includes DJT, which the globe hasn't committed yet.

Expected: the output includes `wrote 9056 airports to …public/data/airports.json` and `US airports without a state: N`, where N is small (under 100).

- [ ] **Step 5: Check that only the country and state fields changed**

Run:

```bash
git show HEAD:public/data/airports.json > "${TMPDIR:-/tmp}/airports-before.json"
node -e '
const fs = require("fs")
const [before, after] = process.argv.slice(1).map((f) => JSON.parse(fs.readFileSync(f, "utf8")))
const key = (r) => [r[0], r[1], r[3], r[4], r[5]].join("|")
const a = new Set(before.map(key)), b = new Set(after.map(key))
const lost = [...a].filter((k) => !b.has(k)), added = [...b].filter((k) => !a.has(k))
console.log(`rows ${before.length} -> ${after.length}; code, city, position or zone changed: ${lost.length} lost, ${added.length} new; US states: ${after.filter((r) => r.length === 7).length}`)
if (lost.length || added.length) { console.log(lost.slice(0, 5), added.slice(0, 5)); process.exit(1) }
' "${TMPDIR:-/tmp}/airports-before.json" public/data/airports.json
```

Expected: `rows 9056 -> 9056; code, city, position or zone changed: 0 lost, 0 new; US states: …` with a count above 1500.

If anything was lost or new, **stop and report** to the controller. The globe's list has changed since slice 1, and taking that along isn't this task's change to make.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/data/airports.test.ts`, then `npx vitest run`
Expected: everything passes.

- [ ] **Step 7: Commit**

```bash
git status --short   # package-lock.json must not be listed; if it is: git checkout -- package-lock.json
git add scripts/build-airports.mjs public/data/airports.json tests/data/airports.test.ts
git commit -m "Airport list: one spelling per country, and US state codes

Countries read \"USA\" for the US and short English names elsewhere;
US airports gain their state from the globe's OurAirports copy.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Calendar and clock icons

**Files:**
- Modify: `scripts/build-icons.mjs` (the `ICONS` map)
- Regenerate: `src/icons/iconPaths.ts`
- Test: `tests/icons/iconPaths.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test inside `describe('ICON_PATHS', …)` in `tests/icons/iconPaths.test.ts`:

```ts
  it('has the trip cards’ calendar and clock icons', () => {
    for (const name of ['CalendarBlank', 'Clock']) expect(ICON_PATHS).toHaveProperty(name)
  })
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/icons/iconPaths.test.ts`
Expected: FAIL with `expected { …(59) } to have property "CalendarBlank"` (the count may differ).

- [ ] **Step 3: Add the icons to the build script**

In `scripts/build-icons.mjs`, change the comment above `ICONS` and the end of its first block so they read:

```js
// Component name -> Phosphor file stem. The first block maps the SF Symbols Crewluve uses on these
// cards (spec §4.1, and the slice 2A trip cards); the second maps AirlineBranding's airline symbols (spec §6.10).
const ICONS = {
  House: 'house', Airplane: 'airplane', Car: 'car', ArrowsClockwise: 'arrows-clockwise', Bed: 'bed',
  Buildings: 'buildings', ClockCountdown: 'clock-countdown', Lightning: 'lightning', BookOpen: 'book-open',
  MapPin: 'map-pin', Circle: 'circle', Package: 'package', AirplaneTakeoff: 'airplane-takeoff',
  AirplaneLanding: 'airplane-landing', Cloud: 'cloud', ArrowCircleUp: 'arrow-circle-up', Warning: 'warning',
  ArrowClockwise: 'arrow-clockwise', SignOut: 'sign-out', Heart: 'heart', CalendarBlank: 'calendar-blank', Clock: 'clock',
```

Leave the second block (`Triangle: 'triangle', …`) and the rest of the file as they are.

- [ ] **Step 4: Regenerate the icon paths**

Run: `npm run icons`
Expected: it finishes without an error. `git diff --stat` then lists `src/icons/iconPaths.ts`, with the two new entries added and nothing else changed.

- [ ] **Step 5: Run the test and watch it pass**

Run: `npx vitest run tests/icons/iconPaths.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git status --short   # package-lock.json must not be listed; if it is: git checkout -- package-lock.json
git add scripts/build-icons.mjs src/icons/iconPaths.ts tests/icons/iconPaths.test.ts
git commit -m "Add the calendar and clock icons for the trip cards

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Colors for the city pills

**Files:**
- Modify: `src/styles/tokens.css`
- Test: `tests/styles/styles.test.ts` (the `SPEC_COLORS` table)

- [ ] **Step 1: Write the failing test**

In `tests/styles/styles.test.ts`, add these rows at the end of the `SPEC_COLORS` array, after `['--ups', '#663300', '#E09E33'],`:

```ts
  // Slice 2A spec §8: the iOS 26 system colors the city pills blend.
  ['--pink', '#FF2D55', '#FF375F'],
  ['--yellow', '#FFCC00', '#FFD600'],
  ['--teal', '#00C3D0', '#00D2E0'],
  ['--cyan', '#00C0E8', '#3CD3FE'],
  ['--indigo', '#6155F5', '#6D7CFF'],
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/styles/styles.test.ts`
Expected: 10 failing tests, the five new colors in light and in dark mode.

- [ ] **Step 3: Add the tokens**

In `src/styles/tokens.css`, add these lines after `--purple: #cb30e0;` in the light `:root`:

```css
  --pink: #ff2d55;
  --yellow: #ffcc00;
  --teal: #00c3d0;
  --cyan: #00c0e8;
  --indigo: #6155f5;
```

Add these lines after `--purple: #db34f2;` in the dark `:root` inside `@media (prefers-color-scheme: dark)`:

```css
    --pink: #ff375f;
    --yellow: #ffd600;
    --teal: #00d2e0;
    --cyan: #3cd3fe;
    --indigo: #6d7cff;
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/styles/styles.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.css tests/styles/styles.test.ts
git commit -m "Add the iOS 26 colors the city pills blend

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Engine: trip days and Day N

**Files:**
- Create: `src/engine/trips.ts`
- Modify: `src/engine/snapshot.ts` (imports, the `tripDays` function, `daysRemaining`)
- Test: `tests/engine/trips.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/engine/trips.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { RawBuilder } from '../../src/data/rowBuilder'
import { buildLegs } from '../../src/engine/legs'
import { buildSchedule } from '../../src/engine/normalize'
import { tripDayNumber, tripDays } from '../../src/engine/trips'
import { A, at } from '../fixtures/engine'

const NY = 'America/New_York'

/** A schedule and its legs from a RawBuilder. A is Fri 9 Oct 2026, 5:30am EDT. */
function engineOf(b: RawBuilder) {
  const schedule = buildSchedule(b.build(), A)
  return { schedule, legs: buildLegs(schedule) }
}
const alex = () => new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')

describe('tripDayNumber', () => {
  /** Fri 9 Oct 5:30am to Mon 12 Oct 10:00pm EDT: four calendar days in New York. */
  const fourDays = (days?: number) =>
    engineOf(
      alex().trip('t1', {
        days,
        dutyPeriods: [
          { start: 0, end: 600, flights: [{ dep: 'SDF', arr: 'ANC', out: 60, in: 400 }] },
          { start: 4800, end: 5310, flights: [{ dep: 'ANC', arr: 'SDF', out: 4860, in: 5250 }] },
        ],
      }),
    ).schedule.trips[0]

  it('counts calendar days from the start of the trip in the base time zone', () => {
    expect(tripDayNumber(fourDays(4), at(100), NY)).toBe(1)
    expect(tripDayNumber(fourDays(4), at(1440), NY)).toBe(2)
  })

  it('stays on the last day late on a US evening, where a UTC count reads one more', () => {
    // Mon 9:00pm EDT is already Tue 1:00am UTC, so Duty's UTC count says "Day 5 of 4".
    expect(tripDayNumber(fourDays(4), at(5250), NY)).toBe(4)
  })

  it('never goes past the trip length', () => {
    expect(tripDayNumber(fourDays(3), at(5250), NY)).toBe(3)
  })

  it('turns over at midnight in the base zone, not in UTC', () => {
    // Starts Sat 10 Oct 11:00pm EDT (Sun 3:00am UTC). At Sun 1:00am EDT it is day 2 in New York, still day 1 in UTC.
    const late = engineOf(
      alex().trip('t1', {
        days: 2,
        dutyPeriods: [{ start: 2490, end: 3000, flights: [{ dep: 'SDF', arr: 'ANC', out: 2550, in: 2900 }] }],
      }),
    ).schedule.trips[0]
    expect(tripDayNumber(late, at(2610), NY)).toBe(2)
  })

  it('uses the calendar-day length when trips.days is 0', () => {
    expect(tripDays(fourDays(0), NY)).toBe(4)
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/engine/trips.test.ts`
Expected: FAIL, because `../../src/engine/trips` doesn't exist yet. Vite reports that it couldn't resolve the import.

- [ ] **Step 3: Create the module**

Create `src/engine/trips.ts`:

```ts
import { calendarDay } from '../time/zoned'
import type { Trip } from './types'

/** Trip length in days: trips.days when it is above 0 (Duty writes 0 for a trip under 24 hours), else the inclusive calendar-day count in `timeZone`. */
export function tripDays(trip: Trip, timeZone: string): number {
  return trip.days != null && trip.days > 0 ? trip.days : calendarDay(trip.end, timeZone) - calendarDay(trip.start, timeZone) + 1
}

/**
 * "Day N" of a trip: calendar days since it started, plus one, counted in `timeZone` (the base's) and kept between 1 and
 * tripDays. Duty counts in UTC, which late on a US evening reads "Day 5 of 4" (slice 2A spec §5).
 */
export function tripDayNumber(trip: Trip, t: number, timeZone: string): number {
  const day = calendarDay(t, timeZone) - calendarDay(trip.start, timeZone) + 1
  return Math.min(Math.max(day, 1), tripDays(trip, timeZone))
}
```

- [ ] **Step 4: Point the snapshot module at it**

In `src/engine/snapshot.ts`:

1. Change the second import line to `import { DAY, MINUTE } from '../time/zoned'`. `calendarDay` is no longer used here.
2. Add `import { tripDayNumber, tripDays } from './trips'` between the `./targets` and `./types` imports.
3. Replace the whole `tripDays` function, with its doc comment, with:

```ts
// Kept here too, so existing imports of tripDays from the snapshot module keep working.
export { tripDays }
```

4. Replace `daysRemaining` with:

```ts
/** EstimatedReturnCardView: max(total days − day number, 0), counting days in the base's zone. */
function daysRemaining(trip: Trip, t: number, timeZone: string): number {
  return Math.max(tripDays(trip, timeZone) - tripDayNumber(trip, t, timeZone), 0)
}
```

- [ ] **Step 5: Run the engine tests**

Run: `npx vitest run tests/engine`
Expected: PASS, including the existing `tripDays` and fallback-card tests in `snapshot.test.ts`.

- [ ] **Step 6: Run the gates and commit**

Run: `npx vitest run` and `npx tsc --noEmit`. Expected: both clean.

```bash
git add src/engine/trips.ts src/engine/snapshot.ts tests/engine/trips.test.ts
git commit -m "Engine: trip length and Day N in the base time zone, never past the last day

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Engine: the upcoming trip

**Files:**
- Modify: `src/engine/trips.ts`
- Test: `tests/engine/trips.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/engine/trips.test.ts`, change two import lines to:

```ts
import { buildLegs, type MoveLeg } from '../../src/engine/legs'
import { tripDayNumber, tripDays, upcomingTrip } from '../../src/engine/trips'
```

Add this helper under `const alex = …`:

```ts
const pat = () => new RawBuilder(A).pilot('Pat', 'SDF', 'MCO')
```

Then add at the end of the file:

```ts
describe('upcomingTrip', () => {
  const none = { commute: null, delay: null }
  /** Sat 10 Oct: SDF→RFD→ANC; Sun 11 Oct: ANC→SDF. */
  const withTrip = (b: RawBuilder) =>
    b.trip('t1', {
      days: 2,
      dutyPeriods: [
        { start: 1440, end: 2000, flights: [{ dep: 'SDF', arr: 'RFD', out: 1500, in: 1590 }, { dep: 'RFD', arr: 'ANC', out: 1650, in: 1980 }] },
        { start: 3000, end: 3500, flights: [{ dep: 'ANC', arr: 'SDF', out: 3060, in: 3360 }] },
      ],
    })

  it('is the next trip: each airport once in order, its first flight, and its length', () => {
    const { schedule, legs } = engineOf(withTrip(alex()))
    expect(upcomingTrip(schedule, legs, at(0), NY, none)).toEqual({
      tripId: 't1',
      departs: at(1500),
      days: 2,
      route: ['SDF', 'RFD', 'ANC'],
      delayMinutes: null,
    })
  })

  it('shows at most six stops', () => {
    const b = alex().trip('t1', {
      dutyPeriods: [
        {
          start: 1440,
          end: 2400,
          flights: [
            { dep: 'SDF', arr: 'RFD', out: 1500, in: 1560 },
            { dep: 'RFD', arr: 'ANC', out: 1600, in: 1700 },
            { dep: 'ANC', arr: 'ONT', out: 1750, in: 1850 },
            { dep: 'ONT', arr: 'HNL', out: 1900, in: 2000 },
            { dep: 'HNL', arr: 'MIA', out: 2050, in: 2150 },
            { dep: 'MIA', arr: 'ATL', out: 2200, in: 2300 },
          ],
        },
      ],
    })
    const { schedule, legs } = engineOf(b)
    expect(upcomingTrip(schedule, legs, at(0), NY, none)?.route).toEqual(['SDF', 'RFD', 'ANC', 'ONT', 'HNL', 'MIA'])
  })

  it('starts from home, and leaves when the commute jumpseat does, when one was logged', () => {
    const { schedule, legs } = engineOf(withTrip(pat()).jumpseat('js1', 'MCO', 'SDF', 1300, 1420))
    const commute = legs.find((l) => l.id === 'js1') as MoveLeg
    expect(upcomingTrip(schedule, legs, at(0), NY, { commute, delay: null })).toMatchObject({
      departs: at(1300),
      route: ['MCO', 'SDF', 'RFD', 'ANC'],
    })
  })

  it('leaves home where the route already has it, as the app does', () => {
    const b = pat()
      .trip('t1', {
        dutyPeriods: [
          { start: 1440, end: 2000, flights: [{ dep: 'SDF', arr: 'MCO', out: 1500, in: 1620 }, { dep: 'MCO', arr: 'SDF', out: 1700, in: 1820 }] },
        ],
      })
      .jumpseat('js1', 'MCO', 'SDF', 1300, 1420)
    const { schedule, legs } = engineOf(b)
    const commute = legs.find((l) => l.id === 'js1') as MoveLeg
    expect(upcomingTrip(schedule, legs, at(0), NY, { commute, delay: null })?.route).toEqual(['SDF', 'MCO'])
  })

  it('carries a delay or an early departure on this trip’s flight, and ignores one on another trip', () => {
    const { schedule, legs } = engineOf(
      withTrip(alex()).trip('t0', {
        dutyPeriods: [{ start: -600, end: -100, flights: [{ dep: 'SDF', arr: 'MIA', out: -500, in: -300 }] }],
      }),
    )
    const flightOf = (id: string) => legs.find((l) => l.kind === 'flight' && l.tripId === id) as MoveLeg
    const delayed = (id: string, minutes: number) => ({ commute: null, delay: { flight: flightOf(id), minutes } })
    expect(upcomingTrip(schedule, legs, at(0), NY, delayed('t1', 40))?.delayMinutes).toBe(40)
    expect(upcomingTrip(schedule, legs, at(0), NY, delayed('t1', -20))?.delayMinutes).toBe(-20)
    expect(upcomingTrip(schedule, legs, at(0), NY, delayed('t0', 40))?.delayMinutes).toBeNull()
  })

  it('is null with no trip flight ahead', () => {
    const { schedule, legs } = engineOf(withTrip(alex()))
    expect(upcomingTrip(schedule, legs, at(4000), NY, none)).toBeNull()
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/engine/trips.test.ts`
Expected: the `upcomingTrip` tests FAIL with `upcomingTrip is not a function`.

- [ ] **Step 3: Implement**

Replace the import lines at the top of `src/engine/trips.ts` with:

```ts
import { calendarDay } from '../time/zoned'
import { nextTripFlight } from './home'
import type { Leg, MoveLeg } from './legs'
import type { Iata, Schedule, Trip } from './types'
```

Append to `src/engine/trips.ts`:

```ts
/** The most stops the upcoming trip card's route shows (UpcomingTripCard.displayRoute). */
export const ROUTE_STOPS = 6

export interface UpcomingTrip {
  tripId: string
  /** When the pilot leaves for it: the logged commute jumpseat's start, else the first flight's start. */
  departs: number
  days: number
  /** Up to 6 airports: each remaining departure and arrival once, in order, with home first when a commute was found. */
  route: Iata[]
  /** The departure delay on this trip's flight when it's 15+ minutes off schedule; negative means early. */
  delayMinutes: number | null
}

export interface TripExtras {
  /** The logged commute jumpseat from home to the trip's first airport (Snapshot.nextCommute). */
  commute: MoveLeg | null
  /** The relevant flight's departure delay when it is 15+ minutes off schedule (Snapshot.delay). */
  delay: { flight: MoveLeg; minutes: number } | null
}

/**
 * UpcomingTripInfo.from on CrewLu Cloud data: the trip of the next trip flight after t. Its route is each remaining flight's
 * departure and arrival once, in order. Home goes first when a commute was found, unless the route already has it.
 */
export function upcomingTrip(schedule: Schedule, legs: Leg[], t: number, baseTz: string, extras: TripExtras): UpcomingTrip | null {
  const first = nextTripFlight(legs, t)
  const trip = first?.tripId ? schedule.trips.find((tr) => tr.id === first.tripId) : undefined
  if (!first || !trip) return null
  const route: Iata[] = []
  for (const l of legs) {
    if (l.kind !== 'flight' || l.tripId !== trip.id || l.start <= t) continue
    if (!route.includes(l.dep)) route.push(l.dep)
    if (!route.includes(l.arr)) route.push(l.arr)
  }
  const { commute, delay } = extras
  if (commute && !route.includes(commute.dep)) route.unshift(commute.dep)
  return {
    tripId: trip.id,
    departs: commute ? commute.start : first.start,
    days: tripDays(trip, baseTz),
    route: route.slice(0, ROUTE_STOPS),
    delayMinutes: delay && delay.flight.tripId === trip.id ? delay.minutes : null,
  }
}
```

- [ ] **Step 4: Run them and watch them pass**

Run: `npx vitest run tests/engine/trips.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run` and `npx tsc --noEmit`. Expected: both clean.

```bash
git add src/engine/trips.ts tests/engine/trips.test.ts
git commit -m "Engine: the upcoming trip's route, departure, length and delay

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Engine: the trip in progress

**Files:**
- Modify: `src/engine/trips.ts`
- Test: `tests/engine/trips.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/engine/trips.test.ts`, change the trips import to:

```ts
import { tripDayNumber, tripDays, tripProgress, upcomingTrip } from '../../src/engine/trips'
```

Add at the end of the file:

```ts
describe('tripProgress', () => {
  /** Sat 10 Oct: SDF→RFD→ANC; Sun 11 Oct: ANC→SDF. Three days. */
  const threeDayTrip = () =>
    engineOf(
      alex().trip('t1', {
        days: 3,
        dutyPeriods: [
          { start: 1440, end: 2000, flights: [{ dep: 'SDF', arr: 'RFD', out: 1500, in: 1590 }, { dep: 'RFD', arr: 'ANC', out: 1650, in: 1980 }] },
          { start: 3000, end: 3500, flights: [{ dep: 'ANC', arr: 'SDF', out: 3060, in: 3360 }] },
        ],
      }),
    )

  it('gives the day, the length, and where the remaining flights land, in order', () => {
    const { schedule, legs } = threeDayTrip()
    expect(tripProgress(schedule, legs, at(1600), NY)).toEqual({ tripId: 't1', day: 1, days: 3, upcoming: ['ANC', 'SDF'] })
  })

  it('names each airport once', () => {
    const b = alex().trip('t1', {
      dutyPeriods: [
        {
          start: 0,
          end: 900,
          flights: [
            { dep: 'SDF', arr: 'ANC', out: 60, in: 300 },
            { dep: 'ANC', arr: 'SDF', out: 360, in: 600 },
            { dep: 'SDF', arr: 'ANC', out: 660, in: 880 },
          ],
        },
      ],
    })
    const { schedule, legs } = engineOf(b)
    expect(tripProgress(schedule, legs, at(30), NY)?.upcoming).toEqual(['ANC', 'SDF'])
  })

  it('has no cities left once the last flight is off', () => {
    const { schedule, legs } = threeDayTrip()
    expect(tripProgress(schedule, legs, at(3100), NY)).toMatchObject({ day: 2, upcoming: [] })
  })

  it('is null before and after the trip', () => {
    const { schedule, legs } = threeDayTrip()
    expect(tripProgress(schedule, legs, at(1000), NY)).toBeNull()
    expect(tripProgress(schedule, legs, at(3600), NY)).toBeNull()
  })

  it('counts the length in calendar days when trips.days is 0', () => {
    const b = alex().trip('t1', {
      days: 0,
      dutyPeriods: [
        { start: 1440, end: 2000, flights: [{ dep: 'SDF', arr: 'ANC', out: 1500, in: 1900 }] },
        { start: 3000, end: 3500, flights: [{ dep: 'ANC', arr: 'SDF', out: 3060, in: 3360 }] },
      ],
    })
    const { schedule, legs } = engineOf(b)
    expect(tripProgress(schedule, legs, at(1600), NY)?.days).toBe(2)
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/engine/trips.test.ts`
Expected: the `tripProgress` tests FAIL with `tripProgress is not a function`.

- [ ] **Step 3: Implement**

Append to `src/engine/trips.ts`:

```ts
export interface TripProgress {
  tripId: string
  /** 1…days */
  day: number
  days: number
  /** Arrival airports of the trip's flights still to depart, in order, each once. The copy layer matches cities and keeps 3. */
  upcoming: Iata[]
}

/**
 * calculateTripOverview on CrewLu Cloud data: the trip covering t, its day number and length, and the airports its
 * remaining flights land at. Covering means start ≤ t < end, the same test slice 1 uses for an all-hidden trip.
 */
export function tripProgress(schedule: Schedule, legs: Leg[], t: number, baseTz: string): TripProgress | null {
  const trip = schedule.trips.find((tr) => tr.start <= t && t < tr.end)
  if (!trip) return null
  const upcoming: Iata[] = []
  for (const l of legs) {
    if (l.kind === 'flight' && l.tripId === trip.id && l.start > t && !upcoming.includes(l.arr)) upcoming.push(l.arr)
  }
  return { tripId: trip.id, day: tripDayNumber(trip, t, baseTz), days: tripDays(trip, baseTz), upcoming }
}
```

- [ ] **Step 4: Run them and watch them pass**

Run: `npx vitest run tests/engine/trips.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run` and `npx tsc --noEmit`. Expected: both clean.

```bash
git add src/engine/trips.ts tests/engine/trips.test.ts
git commit -m "Engine: the trip in progress, its day and the cities ahead

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Snapshot: the cards follow the app's home-or-base rule

**Files:**
- Modify: `src/engine/snapshot.ts` (imports, the `Snapshot` interface, `makeSnapshot`, `safeSnapshot`)
- Test: `tests/engine/snapshot.test.ts`

- [ ] **Step 1: Write the failing tests**

Add this test inside `describe('safeSnapshot', …)` in `tests/engine/snapshot.test.ts`:

```ts
  it('has no trip cards when it falls back', async () => {
    quiet()
    const { safeSnapshot } = await freshSnapshotModule()
    expect(safeSnapshot(null as unknown as Schedule, [], A, NY)).toMatchObject({ upcomingTrip: null, tripProgress: null })
  })
```

Add at the end of the file:

```ts
describe('the trip cards (slice 2A)', () => {
  it('at home: the upcoming trip, and no progress', () => {
    const sn = snap(-1440)
    expect(sn.upcomingTrip).toEqual({ tripId: 'demo-t1', departs: at(60), days: 2, route: ['SDF', 'RFD', 'ANC'], delayMinutes: null })
    expect(sn.tripProgress).toBeNull()
  })

  it('at base: the upcoming trip too, as Crewluve shows it while settled', () => {
    expect(snap(30)).toMatchObject({ status: { kind: 'base' }, upcomingTrip: { tripId: 'demo-t1', departs: at(60) }, tripProgress: null })
  })

  it('away on a trip: Day N of M with the cities ahead, and no upcoming trip', () => {
    expect(snap(100)).toMatchObject({ upcomingTrip: null, tripProgress: { tripId: 'demo-t1', day: 1, days: 2, upcoming: ['ANC', 'SDF'] } })
  })

  it('driving home after the trip has ended: neither card', () => {
    expect(snap(1950)).toMatchObject({ upcomingTrip: null, tripProgress: null })
  })

  it('a commuter at home: the route starts at home, and the trip leaves with the logged jumpseat', () => {
    const j = engineFor(demoRaw('jumpseater', A))
    expect(makeSnapshot(j.schedule, j.legs, at(-1440), NY).upcomingTrip).toMatchObject({
      departs: at(-300),
      route: ['MCO', 'SDF', 'RFD', 'ANC'],
    })
  })

  it('a late first flight puts its delay on the upcoming trip', () => {
    const b = new RawBuilder(A).pilot('Alex', 'SDF', 'LEX').trip('t1', {
      dutyPeriods: [{ start: 1440, end: 2000, flights: [{ dep: 'SDF', arr: 'ANC', out: 1500, in: 1900, actualOut: 1540, actualIn: 1940 }] }],
    })
    expect(snapOf(b, 0).upcomingTrip).toMatchObject({ departs: at(1540), delayMinutes: 40 })
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/engine/snapshot.test.ts`
Expected: the new tests FAIL. For example, `expected undefined to deeply equal { tripId: 'demo-t1', … }`.

- [ ] **Step 3: Implement**

In `src/engine/snapshot.ts`:

1. Change the trips import to:

```ts
import { tripDayNumber, tripDays, tripProgress, upcomingTrip, type TripProgress, type UpcomingTrip } from './trips'
```

2. In `interface Snapshot`, add after the `daysHome: number | null` line:

```ts
  /** The next trip, for the upcoming trip card: shown at home or base, Crewluve's isSettled (slice 2A §3). */
  upcomingTrip: UpcomingTrip | null
  /** Day N of M and the cities still ahead, for the trip progress card: shown during a trip, away from home and base. */
  tripProgress: TripProgress | null
```

3. In `makeSnapshot`, add after the `const nextHomeTrip = …` statement:

```ts
  const delay = relevantDelay(status, nextFlight, nextMove)
  const nextCommute = atHome ? pendingCommute(legs, pilot.effHome, t, nextFlight) : null
  // Crewluve's isSettled: the upcoming trip shows at home or base, the trip's progress everywhere else (slice 2A §3).
  const settled = status.kind === 'home' || status.kind === 'base'
```

4. In the object `makeSnapshot` returns, replace `delay: relevantDelay(status, nextFlight, nextMove),` with `delay,`. Replace `nextCommute: atHome ? pendingCommute(legs, pilot.effHome, t, nextFlight) : null,` with `nextCommute,`. Then add after the `daysHome: …,` line:

```ts
    upcomingTrip: settled ? upcomingTrip(schedule, legs, t, baseTz, { commute: nextCommute, delay }) : null,
    tripProgress: settled ? null : tripProgress(schedule, legs, t, baseTz),
```

5. In the object `safeSnapshot` returns when it falls back, change `nextTripDays: null, midTripAtHome: false, daysHome: null, celebrate: false,` to:

```ts
      nextTripDays: null, midTripAtHome: false, daysHome: null, upcomingTrip: null, tripProgress: null, celebrate: false,
```

- [ ] **Step 4: Run them and watch them pass**

Run: `npx vitest run tests/engine`
Expected: PASS.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run` and `npx tsc --noEmit`. Expected: both clean. Some screen tests that look for a single level-2 heading still pass for now, because no card renders the new fields yet.

```bash
git add src/engine/snapshot.ts tests/engine/snapshot.test.ts
git commit -m "Snapshot: the upcoming trip at home or base, the trip's progress everywhere else

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Copy: the departure line

**Files:**
- Modify: `src/copy/format.ts`
- Test: `tests/copy/format.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/copy/format.test.ts`, add `tripCardDepartsText,` to the import list from `'../../src/copy/format'`, right after `timeWithZone,`. Then add at the end of the file:

```ts
describe('tripCardDepartsText', () => {
  const now = Date.UTC(2026, 9, 8, 13, 30) // Thu 8 Oct, 9:30am EDT

  it('says today, tomorrow, or the short weekday and date', () => {
    expect(tripCardDepartsText(Date.UTC(2026, 9, 8, 22, 0), now, NY, false)).toBe('Departs today at 6:00pm')
    expect(tripCardDepartsText(Date.UTC(2026, 9, 9, 10, 30), now, NY, false)).toBe('Departs tomorrow at 6:30am')
    expect(tripCardDepartsText(Date.UTC(2026, 9, 13, 15, 32), now, NY, false)).toBe('Departs Tue Oct 13 at 11:32am')
  })

  it('uses 24-hour time when the viewer does', () => {
    expect(tripCardDepartsText(Date.UTC(2026, 9, 13, 15, 32), now, NY, true)).toBe('Departs Tue Oct 13 at 11:32')
  })

  it('compares calendar days in the given zone', () => {
    const lateNight = Date.UTC(2026, 9, 8, 3, 30) // Wed 7 Oct, 11:30pm EDT
    expect(tripCardDepartsText(Date.UTC(2026, 9, 8, 10, 30), lateNight, NY, false)).toBe('Departs tomorrow at 6:30am')
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/copy/format.test.ts`
Expected: FAIL with `tripCardDepartsText is not a function`.

- [ ] **Step 3: Implement**

In `src/copy/format.ts`, add right after `departureText`:

```ts
/** Upcoming trip card: "Departs today at 6:00am", "Departs tomorrow at 6:00am", or "Departs Tue Oct 13 at 6:00am" (UpcomingTripCard.formattedDeparture, with 24-hour times respected). */
export function tripCardDepartsText(ms: number, now: number, timeZone: string, h24: boolean): string {
  const time = clockText(ms, timeZone, h24)
  const diff = calendarDay(ms, timeZone) - calendarDay(now, timeZone)
  if (diff === 0) return `Departs today at ${time}`
  if (diff === 1) return `Departs tomorrow at ${time}`
  const p = zonedParts(ms, timeZone)
  return `Departs ${WEEKDAYS[p.weekday].slice(0, 3)} ${MONTHS[p.month - 1].slice(0, 3)} ${p.day} at ${time}`
}
```

- [ ] **Step 4: Run them and watch them pass**

Run: `npx vitest run tests/copy/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/copy/format.ts tests/copy/format.test.ts
git commit -m "Copy: the upcoming trip card's departure line

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Copy: city pills and the spoken route

**Files:**
- Create: `src/copy/trips.ts`
- Test: `tests/copy/trips.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/copy/trips.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { routeLabel, upcomingCityPills } from '../../src/copy/trips'
import { buildAirportIndex } from '../../src/data/airports'
import { testAirports } from '../fixtures/airports'

describe('upcomingCityPills', () => {
  it('names each city with its state, or its country abroad', () => {
    expect(upcomingCityPills(['ANC', 'CGN', 'SDF'], testAirports)).toEqual([
      { city: 'Anchorage', subtitle: 'AK' },
      { city: 'Cologne', subtitle: 'Germany' },
      { city: 'Louisville', subtitle: 'KY' },
    ])
  })

  it('keeps the first three different cities', () => {
    expect(upcomingCityPills(['ANC', 'SDF', 'ANC', 'MIA', 'ONT'], testAirports).map((p) => p.city)).toEqual(['Anchorage', 'Louisville', 'Miami'])
  })

  it('makes one pill for two airports in the same city', () => {
    const nyc = buildAirportIndex([
      ['JFK', 'New York', 'USA', 40.64, -73.78, 'America/New_York', 'NY'],
      ['LGA', 'New York', 'USA', 40.78, -73.87, 'America/New_York', 'NY'],
    ])
    expect(upcomingCityPills(['JFK', 'LGA'], nyc)).toEqual([{ city: 'New York', subtitle: 'NY' }])
  })

  it('shows an unknown airport as its code, with no subtitle', () => {
    expect(upcomingCityPills(['XYZ'], testAirports)).toEqual([{ city: 'XYZ', subtitle: null }])
  })

  it('falls back to the country for a US airport without a state', () => {
    const odd = buildAirportIndex([['ZZV', 'Zanesville', 'USA', 39.94, -81.89, 'America/New_York']])
    expect(upcomingCityPills(['ZZV'], odd)).toEqual([{ city: 'Zanesville', subtitle: 'USA' }])
  })
})

describe('routeLabel', () => {
  it('reads the route as city names, and codes for unknown airports', () => {
    expect(routeLabel(['SDF', 'RFD', 'XYZ'], testAirports)).toBe('Route: Louisville, Rockford, XYZ')
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/copy/trips.test.ts`
Expected: FAIL, because `../../src/copy/trips` doesn't exist yet.

- [ ] **Step 3: Implement**

Create `src/copy/trips.ts`:

```ts
import type { AirportIndex } from '../data/airports'

/** The most pills the Upcoming Cities row shows (Duty's calculateTripOverview keeps three). */
export const CITY_PILLS = 3

export interface CityPill {
  city: string
  /** The state code for a US airport, else its country (AirportData.subtitleSuffix); null for an airport the list doesn't have. */
  subtitle: string | null
}

/** The trip progress card's pills: the first three different cities among the remaining arrivals, matched by name as Duty does. */
export function upcomingCityPills(codes: string[], airports: AirportIndex): CityPill[] {
  const pills: CityPill[] = []
  for (const code of codes) {
    const city = airports.city(code)
    if (!city || pills.some((pill) => pill.city === city)) continue
    const airport = airports.get(code)
    pills.push({ city, subtitle: airport ? airport.state ?? (airport.country || null) : null })
    if (pills.length === CITY_PILLS) break
  }
  return pills
}

/** What a screen reader hears for the route dots: "Route: Louisville, Rockford, Anchorage". */
export function routeLabel(codes: string[], airports: AirportIndex): string {
  return `Route: ${codes.map((code) => airports.city(code) ?? code).join(', ')}`
}
```

- [ ] **Step 4: Run them and watch them pass**

Run: `npx vitest run tests/copy/trips.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run` and `npx tsc --noEmit`. Expected: both clean.

```bash
git add src/copy/trips.ts tests/copy/trips.test.ts
git commit -m "Copy: upcoming city pills and the spoken route

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The upcoming trip card

**Files:**
- Create: `src/ui/UpcomingTripCard.tsx`
- Modify: `src/styles/cards.css` (append)
- Test: `tests/ui/tripCards.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/ui/tripCards.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import type { UpcomingTrip } from '../../src/engine/trips'
import { UpcomingTripCard } from '../../src/ui/UpcomingTripCard'
import { testAirports } from '../fixtures/airports'

afterEach(cleanup)

const NY = 'America/New_York'
const NOW = Date.UTC(2026, 9, 8, 13, 30) // Thu 8 Oct, 9:30am EDT

describe('UpcomingTripCard', () => {
  const trip = (over: Partial<UpcomingTrip> = {}): UpcomingTrip => ({
    tripId: 't1',
    departs: Date.UTC(2026, 9, 9, 10, 30), // Fri 9 Oct, 6:30am EDT
    days: 2,
    route: ['SDF', 'RFD', 'ANC'],
    delayMinutes: null,
    ...over,
  })
  const card = (t: UpcomingTrip, h24 = false) => <UpcomingTripCard trip={t} now={NOW} timeZone={NY} h24={h24} airports={testAirports} />

  it('shows the Line Trip badge, when it departs, and how long it lasts', () => {
    render(card(trip()))
    expect(screen.getByText('Line Trip')).toBeTruthy()
    expect(screen.getByText('Departs tomorrow at 6:30am')).toBeTruthy()
    expect(screen.getByText('2 days')).toBeTruthy()
  })

  it('draws the route with blue ends, and reads it to screen readers as cities', () => {
    const { container } = render(card(trip()))
    const stops = [...container.querySelectorAll('.route-stop')]
    expect(stops.map((s) => s.textContent)).toEqual(['SDF', 'RFD', 'ANC'])
    expect(stops.map((s) => s.classList.contains('end'))).toEqual([true, false, true])
    expect(container.querySelectorAll('.route-line')).toHaveLength(2)
    expect(container.querySelector('.route-stops')!.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('.route .sr-only')!.textContent).toBe('Route: Louisville, Rockford, Anchorage')
  })

  it('flags a delayed or early departure, and nothing when on time', () => {
    const { rerender } = render(card(trip({ delayMinutes: 40 })))
    expect(screen.getByText('Delayed')).toBeTruthy()
    rerender(card(trip({ delayMinutes: -20 })))
    expect(screen.getByText('Early')).toBeTruthy()
    rerender(card(trip()))
    expect(screen.queryByText('Delayed')).toBeNull()
    expect(screen.queryByText('Early')).toBeNull()
  })

  it('says "1 day" for a one-day trip, and uses 24-hour time when asked', () => {
    render(card(trip({ days: 1 }), true))
    expect(screen.getByText('1 day')).toBeTruthy()
    expect(screen.getByText('Departs tomorrow at 06:30')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/ui/tripCards.test.tsx`
Expected: FAIL, because `../../src/ui/UpcomingTripCard` doesn't exist yet.

- [ ] **Step 3: Implement the card**

Create `src/ui/UpcomingTripCard.tsx`:

```tsx
import { Fragment } from 'preact'
import { daysText, tripCardDepartsText } from '../copy/format'
import { routeLabel } from '../copy/trips'
import type { AirportIndex } from '../data/airports'
import type { UpcomingTrip } from '../engine/trips'
import { Icon } from './Icon'

interface UpcomingTripCardProps {
  trip: UpcomingTrip
  now: number
  /** The pilot's home time zone, like the other cards' subtitles. */
  timeZone: string
  h24: boolean
  airports: AirportIndex
}

/** UpcomingTripCard: the type badge, departure and length, a delay badge when late or early, then the route dots. */
export function UpcomingTripCard({ trip, now, timeZone, h24, airports }: UpcomingTripCardProps) {
  const early = trip.delayMinutes != null && trip.delayMinutes < 0
  const last = trip.route.length - 1
  return (
    <section class="card glass trip-card">
      <div class="trip-head">
        <span class="badge" style={{ background: 'var(--blue)' }}>
          <Icon name="Airplane" size={11} />
          Line Trip
        </span>
        <div class="trip-when">
          <p class="trip-departs">{tripCardDepartsText(trip.departs, now, timeZone, h24)}</p>
          <p class="trip-days">{daysText(trip.days)}</p>
        </div>
        {trip.delayMinutes != null && (
          <span class="badge" style={{ background: early ? 'var(--green)' : 'var(--orange)' }}>
            <Icon name={early ? 'Clock' : 'ClockCountdown'} size={11} />
            {early ? 'Early' : 'Delayed'}
          </span>
        )}
      </div>
      {trip.route.length > 0 && (
        <div class="route">
          <p class="sr-only">{routeLabel(trip.route, airports)}</p>
          <div class="route-stops" aria-hidden="true">
            {trip.route.map((code, i) => (
              <Fragment key={`${i}-${code}`}>
                {i > 0 && <span class="route-line" />}
                <span class={i === 0 || i === last ? 'route-stop end' : 'route-stop'}>
                  <span class="route-dot" />
                  <span class="route-code">{code}</span>
                </span>
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Add its styles**

Append to `src/styles/cards.css`:

```css
/* Trip cards: 16 px padding and 16 px between rows (UpcomingTripCard, TripProgressView). */
.trip-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trip-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.trip-when {
  flex: 1;
  min-width: 0;
}

.trip-departs {
  margin: 0;
  font-size: 15px;
  line-height: 20px;
  font-weight: 500;
}

.trip-days {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 16px;
  color: var(--text-2);
}

/* Capsule badges: white 12 px semibold text on a system color, 10 × 6 px padding. */
.badge {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 999px;
  color: #ffffff;
  font-size: 12px;
  line-height: 16px;
  font-weight: 600;
  white-space: nowrap;
}

/* Route: 10 px dots over 11 px bold monospaced codes, joined by 24 × 2 px lines, blue at both ends. */
.route {
  overflow-x: auto;
  scrollbar-width: none;
}

.route-stops {
  display: flex;
  align-items: flex-start;
  width: max-content;
  padding: 0 4px;
}

.route-stop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--text-2);
}

.route-stop.end {
  color: var(--blue);
}

.route-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}

.route-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  line-height: 13px;
  font-weight: 700;
}

.route-line {
  width: 24px;
  height: 2px;
  margin-top: 4px;
  background: var(--text-2);
  opacity: 0.3;
}
```

- [ ] **Step 5: Run them and watch them pass**

Run: `npx vitest run tests/ui/tripCards.test.tsx tests/styles/styles.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the gates and commit**

Run: `npx vitest run` and `npx tsc --noEmit`. Expected: both clean.

```bash
git add src/ui/UpcomingTripCard.tsx src/styles/cards.css tests/ui/tripCards.test.tsx
git commit -m "The upcoming trip card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The Day N of M card

**Files:**
- Create: `src/ui/TripProgressCard.tsx`
- Modify: `src/styles/cards.css` (append)
- Test: `tests/ui/tripCards.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `tests/ui/tripCards.test.tsx`, replace the two engine/UI import lines with:

```tsx
import type { TripProgress, UpcomingTrip } from '../../src/engine/trips'
import { TripProgressCard } from '../../src/ui/TripProgressCard'
import { UpcomingTripCard } from '../../src/ui/UpcomingTripCard'
```

Add at the end of the file:

```tsx
describe('TripProgressCard', () => {
  const progress = (over: Partial<TripProgress> = {}): TripProgress => ({
    tripId: 't1',
    day: 1,
    days: 2,
    upcoming: ['ANC', 'CGN', 'SDF', 'MIA'],
    ...over,
  })

  it('heads the card with Day N of M, and fills the bar to match', () => {
    const { container } = render(<TripProgressCard progress={progress()} airports={testAirports} />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Day 1 of 2')
    expect((container.querySelector('.trip-bar-fill') as HTMLElement).style.width).toBe('50%')
    expect(container.querySelector('.trip-bar')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('lists up to three upcoming cities as pills, cycling the color blends', () => {
    const { container } = render(<TripProgressCard progress={progress()} airports={testAirports} />)
    expect(screen.getByText('Upcoming Cities')).toBeTruthy()
    const pills = [...container.querySelectorAll('.city-pills > li')]
    expect(pills.map((li) => [li.querySelector('.city-name')!.textContent, li.querySelector('.city-sub')?.textContent ?? null])).toEqual([
      ['Anchorage', 'AK'],
      ['Cologne', 'Germany'],
      ['Louisville', 'KY'],
    ])
    expect(pills.map((li) => li.className)).toEqual(['city-pill blend-0', 'city-pill blend-1', 'city-pill blend-2'])
  })

  it('leaves out the cities when no flights remain', () => {
    const { container } = render(<TripProgressCard progress={progress({ day: 2, upcoming: [] })} airports={testAirports} />)
    expect(screen.queryByText('Upcoming Cities')).toBeNull()
    expect(container.querySelector('.city-pills')).toBeNull()
    expect((container.querySelector('.trip-bar-fill') as HTMLElement).style.width).toBe('100%')
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/ui/tripCards.test.tsx`
Expected: FAIL, because `../../src/ui/TripProgressCard` doesn't exist yet.

- [ ] **Step 3: Implement the card**

Create `src/ui/TripProgressCard.tsx`:

```tsx
import { upcomingCityPills } from '../copy/trips'
import type { AirportIndex } from '../data/airports'
import type { TripProgress } from '../engine/trips'
import { Icon } from './Icon'

/** The two-tone blends the pills cycle through (TripProgressView.pillGradients). */
export const PILL_BLENDS = 5

/** TripProgressView in its default "gradient pills" style: Day N of M, a progress bar, and up to three upcoming cities. */
export function TripProgressCard({ progress, airports }: { progress: TripProgress; airports: AirportIndex }) {
  const pills = upcomingCityPills(progress.upcoming, airports)
  return (
    <section class="card glass trip-card">
      <div class="trip-progress-head">
        <Icon name="CalendarBlank" size={22} color="var(--blue)" />
        <h2>{`Day ${progress.day} of ${progress.days}`}</h2>
      </div>
      <div class="trip-bar" aria-hidden="true">
        <div class="trip-bar-fill" style={{ width: `${(progress.day / progress.days) * 100}%` }} />
      </div>
      {pills.length > 0 && (
        <div class="cities">
          <p class="cities-label">Upcoming Cities</p>
          <ul class="city-pills">
            {pills.map((pill, i) => (
              <li key={pill.city} class={`city-pill blend-${i % PILL_BLENDS}`}>
                <span class="city-name">{pill.city}</span>
                {pill.subtitle && <span class="city-sub">{pill.subtitle}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Add its styles**

Append to `src/styles/cards.css`:

```css
.trip-progress-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trip-progress-head h2 {
  margin: 0;
  font-size: 20px;
  line-height: 25px;
  font-weight: 600;
}

/* Progress bar: 10 px, gray track at 20%, blue fill. */
.trip-bar {
  height: 10px;
  border-radius: 5px;
  background: rgba(142, 142, 147, 0.2);
  overflow: hidden;
}

.trip-bar-fill {
  height: 100%;
  border-radius: 5px;
  background: var(--blue);
}

.cities {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cities-label {
  margin: 0;
  font-size: 15px;
  line-height: 20px;
  font-weight: 500;
  color: var(--text-2);
}

/* Gradient pills: a 12 px bold city over a 9 px subtitle, 14 × 6 px padding, a soft shadow; the row scrolls sideways. */
.city-pills {
  display: flex;
  gap: 8px;
  margin: 0;
  padding: 0 4px 6px;
  list-style: none;
  overflow-x: auto;
  scrollbar-width: none;
}

.city-pill {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.city-name {
  font-size: 12px;
  line-height: 16px;
  font-weight: 700;
  white-space: nowrap;
}

.city-sub {
  font-size: 9px;
  line-height: 11px;
  font-weight: 500;
  opacity: 0.85;
  white-space: nowrap;
}

.blend-0 {
  background: linear-gradient(to right, var(--blue), var(--cyan));
}

.blend-1 {
  background: linear-gradient(to right, var(--purple), var(--pink));
}

.blend-2 {
  background: linear-gradient(to right, var(--orange), var(--yellow));
}

.blend-3 {
  background: linear-gradient(to right, var(--teal), var(--green));
}

.blend-4 {
  background: linear-gradient(to right, var(--indigo), var(--purple));
}
```

- [ ] **Step 5: Run them and watch them pass**

Run: `npx vitest run tests/ui/tripCards.test.tsx tests/styles/styles.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the gates and commit**

Run: `npx vitest run` and `npx tsc --noEmit`. Expected: both clean.

```bash
git add src/ui/TripProgressCard.tsx src/styles/cards.css tests/ui/tripCards.test.tsx
git commit -m "The Day N of M card with upcoming city pills

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Put the cards on the screen

**Files:**
- Modify: `src/ui/StatusScreen.tsx`
- Test: `tests/ui/StatusScreen.test.tsx`, `tests/ui/ScheduleScreen.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add at the end of `tests/ui/StatusScreen.test.tsx`:

```tsx
describe('StatusScreen trip cards (slice 2A)', () => {
  it('home: the upcoming trip card sits after the been-home pill, before the footer', () => {
    const { container } = renderAt(-1440)
    const card = container.querySelector('.trip-card')!
    expect(screen.getByText('Departs tomorrow at 6:30am')).toBeTruthy()
    expect(container.querySelector('.pill')!.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(card.compareDocumentPosition(container.querySelector('.footer')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText(/^Day \d+ of \d+$/)).toBeNull()
  })

  it('away: Day N of M with the cities ahead, and no upcoming trip card', () => {
    const { container } = renderAt(100)
    expect(screen.getByRole('heading', { level: 2, name: 'Day 1 of 2' })).toBeTruthy()
    expect([...container.querySelectorAll('.city-name')].map((n) => n.textContent)).toEqual(['Anchorage', 'Louisville'])
    expect(screen.queryByText('Line Trip')).toBeNull()
  })

  it('base: the countdown and the upcoming trip together', () => {
    const { container } = renderAt(30)
    expect(container.querySelector('.countdown')).not.toBeNull()
    expect(screen.getByText('Line Trip')).toBeTruthy()
  })

  it('shows neither card when the snapshot has none', () => {
    const { container } = renderAt(1950)
    expect(container.querySelector('.trip-card')).toBeNull()
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/ui/StatusScreen.test.tsx`
Expected: the new tests FAIL. For example, `Unable to find an element with the text: Departs tomorrow at 6:30am`.

- [ ] **Step 3: Implement**

In `src/ui/StatusScreen.tsx`, add the two imports in alphabetical order with the other `./` imports:

```tsx
import { TripProgressCard } from './TripProgressCard'
import { UpcomingTripCard } from './UpcomingTripCard'
```

Change the doc comment above `StatusScreen` to:

```tsx
/** The top of Crewluve's main screen, in its card order (spec §4.4; the trip cards, slice 2A §3). */
```

In `StatusScreen`'s JSX, insert the two cards between the home/away line and the footer:

```tsx
      {snap.status.kind === 'home' ? <HomeCards {...p} /> : <AwayCard {...p} />}
      {snap.upcomingTrip && (
        <UpcomingTripCard trip={snap.upcomingTrip} now={p.now} timeZone={p.homeTz} h24={p.h24} airports={p.airports} />
      )}
      {snap.tripProgress && <TripProgressCard progress={snap.tripProgress} airports={p.airports} />}
      <Footer {...p.footer} />
```

- [ ] **Step 4: Run the screen tests**

Run: `npx vitest run tests/ui`
Expected: the new tests PASS. Three existing tests now FAIL with `Found multiple elements with the role "heading" and level 2`, because the Day N card adds a second level-2 heading:
- `StatusScreen.test.tsx`: "away: title, sentence, and the Back Home In card…"
- `StatusScreen.test.tsx`: "falls back to the ~N days card…"
- `ScheduleScreen.test.tsx`: "renders the demo pilot on the late last leg"

- [ ] **Step 5: Point those three tests at the heading by name**

In `tests/ui/StatusScreen.test.tsx`, both places that read:

```tsx
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Back Home In')
```

become:

```tsx
    expect(screen.getByRole('heading', { level: 2, name: 'Back Home In' })).toBeTruthy()
```

Make the same change at that line in `tests/ui/ScheduleScreen.test.tsx`. Leave the `'Leaves Home In'` and `'No schedule in CrewLu Cloud yet'` assertions alone; those screens still have one level-2 heading.

- [ ] **Step 6: Run the gates**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`
Expected: all clean.

- [ ] **Step 7: Commit**

```bash
git add src/ui/StatusScreen.tsx tests/ui/StatusScreen.test.tsx tests/ui/ScheduleScreen.test.tsx
git commit -m "Show the trip cards between the countdowns and the footer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Pin what each demo scene shows

**Files:**
- Test: `tests/data/demoScenes.test.ts`

- [ ] **Step 1: Write the tests**

In `tests/data/demoScenes.test.ts`, add this import after the `makeSnapshot` import:

```ts
import type { TripProgress, UpcomingTrip } from '../../src/engine/trips'
```

Add at the end of the file:

```ts
describe('demo trip cards (slice 2A)', () => {
  const MIN = 60_000
  const route = ['SDF', 'RFD', 'ANC']
  const CARDS: Record<DemoScene, { upcoming?: Partial<UpcomingTrip>; progress?: Partial<TripProgress> }> = {
    home: { upcoming: { route, days: 2, departs: NOW + 1500 * MIN } },
    'driving-to-work': {},
    base: { upcoming: { route, days: 2, departs: NOW + 30 * MIN } },
    flying: { progress: { day: 1, days: 2, upcoming: ['ANC', 'SDF'] } },
    turn: { progress: { day: 1, days: 2, upcoming: ['ANC', 'SDF'] } },
    layover: { progress: { day: 2, days: 2, upcoming: ['SDF'] } },
    delayed: { progress: { day: 2, days: 2, upcoming: ['SDF'] } },
    'last-leg': { progress: { day: 2, days: 2, upcoming: [] } },
    'driving-home': {},
    'commuting-home': {},
    reserve: {},
    training: {},
  }

  it.each(Object.keys(CARDS) as DemoScene[])('%s shows the right trip card', (scene) => {
    const snap = sceneSnapshot(scene)
    const want = CARDS[scene]
    if (want.upcoming) expect(snap.upcomingTrip).toMatchObject(want.upcoming)
    else expect(snap.upcomingTrip).toBeNull()
    if (want.progress) expect(snap.tripProgress).toMatchObject(want.progress)
    else expect(snap.tripProgress).toBeNull()
  })
})
```

- [ ] **Step 2: Run them**

Run: `npx vitest run tests/data/demoScenes.test.ts`
Expected: PASS. These pin what Tasks 5–8 built. `NOW` here is noon Eastern on Tue 20 Oct, so each scene's day number is fixed.

If any row fails, don't edit the row to match. Work out whether the engine or the table is wrong against spec §3 and §9, and report it in the execution notes.

- [ ] **Step 3: Commit**

```bash
git add tests/data/demoScenes.test.ts
git commit -m "Pin which trip card each demo scene shows

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Visual check with the user (controller)

**Files:**
- Modify (only if nudges are needed): `src/styles/cards.css`

- [ ] **Step 1: Build and open the preview**

Run `npm run build`, then start or reuse the `crewluve-preview` server from `.claude/launch.json` (port 5181) in the browser pane.

- [ ] **Step 2: Screenshot the demo scenes**

At the mobile preset (375 × 812), in light and dark, open `/?demo=1&scene=` with `home`, `base`, `flying`, `layover` and `last-leg`.

- [ ] **Step 3: Compare with the app**

Compare each screenshot with the app's Swift: `UpcomingTripCard.swift`, and `TripProgressView` in `PilotStatusView.swift`. Check the text sizes and weights, the 16 px padding and gaps, the badge capsules, the dot colors, the bar, the pill blends and shadow. Fix any differences in `cards.css`, then take the screenshots again.

- [ ] **Step 4: Check a 320 px phone**

At 320 px wide, check that a six-stop route and three long city names scroll inside their card instead of spilling past it.

- [ ] **Step 5: Ask the user to sign off**

Show the user the screenshots and ask one question: "Looks right (Recommended)" or "Change something". Apply their notes, then show them again.

- [ ] **Step 6: Check the real schedule too**

If the user is still signed in on the preview, look at their real screen, then run `read_console_messages` with `onlyErrors: true`. Never type the user's credentials.

- [ ] **Step 7: Run the gates and commit any nudges**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. Then commit any style changes:

```bash
git add src/styles/cards.css
git commit -m "Trip cards: visual nudges from the side-by-side check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Merge and release (controller, asks first)

- [ ] **Step 1: Final review**

Run a final whole-branch code review of `main..slice2a`, and fix what it raises test-first.

- [ ] **Step 2: Merge**

Use superpowers:finishing-a-development-branch. Ask the user one question about how to merge `slice2a` into `main`.

- [ ] **Step 3: Release, only with a fresh yes**

Ask before pushing `main`; the push redeploys crewluve.crewlu.net. After the "Deploy to GitHub Pages" run succeeds, open https://crewluve.crewlu.net/?demo=1&scene=home and `…&scene=flying`. Confirm the two cards, with no console errors.

- [ ] **Step 4: Update the memory**

Update the project memory with the new tip and what's next: Part B, the location card.

---

## Done when

- `npx vitest run`, `npx tsc --noEmit` and `npm run build` are all green.
- Every demo scene shows the card the spec says (Task 14), and the user has signed off on the look (Task 15).
- The cards are live on crewluve.crewlu.net, released with the user's yes (Task 16).

## Spec coverage

| Spec section | Tasks |
|---|---|
| §2 Split, View Schedule moved to slice 3 | Nothing to build. No task adds the button or a tap-through. |
| §3 Where the cards go and when they show | 8 (rule), 13 (placement), 14 (scenes) |
| §4 Upcoming trip card | 6 (data), 9 (departure line), 11 (card) |
| §5 Day N of M card | 5 (day count), 7 (data), 10 (pills), 12 (card) |
| §6 Country names and US state codes | 1, 2 |
| §7 Engine | 5–8 |
| §8 UI and copy, icons, accessibility, colors | 3, 4, 9–13 |
| §9 Demo | 14 |
| §10 Deliberate differences | 5 (1), 6 (2–4), 9 (5), 13 (6), 12 (7) |
| §11 Testing | Every task, then 15 |

## Execution notes

(Add notes here as the build goes: where the code had to differ from a printed block, and why.)
