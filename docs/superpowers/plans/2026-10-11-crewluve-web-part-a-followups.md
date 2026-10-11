# Crewluve Web Part A Follow-ups (High Contrast and City Names) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a visitor's device has Increase Contrast on, switch crewluve.crewlu.net to Apple's high-contrast colors and more solid glass, with white text kept readable on its colored backgrounds; and use the Crewluve app's names for four cities.

**Architecture:** The contrast is stylesheet only. Two new blocks at the end of `tokens.css` hold the high-contrast colors under `prefers-contrast: more`: the light set, the dark set, and the popup's forced-dark set. The dark sets also define `--fill-*` colors, so white text keeps a dark enough background. Backgrounds behind white text read those fills with a fallback, through a new `cssFill` helper for the badges, and `cards.css` widens the glass's edge to 1 px. The city names come from a new `APP_CITY` map in the airport build script, and the airport list is regenerated.

**Tech Stack:** Vite 5.4, TypeScript 5.9 (strict), Preact 10, Vitest 3 with happy-dom and @testing-library/preact.

**Spec:** `docs/superpowers/specs/2026-10-11-crewluve-web-part-a-followups-design.md`

---

## Execution notes

**Setup and gates**
- **Branch:** work on `parta-followups` in the main project folder. Run `git switch -c parta-followups` from `main`. Don't use git worktrees; auto mode blocked a worktree builder during slice 1.
- **Working directory:** run every command from the project root, `~/Dev/Crewluve Website`. Quote it in shells, since it has a space.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass before every commit that touches code. The suite is 1613 tests in 70 files before this plan, and 1657 tests in 70 files after it. No test file is added.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**How the printed code was checked**
- Every code block below was built and run in a scratch copy of the project before this plan was written. All three gates passed there. A script then applied this plan's changes, step by step, to a fresh copy of `main`: each Step 2 failed, each Step 4 passed with its count, and every file came out identical to the scratch copy's.
- 25 deliberate breaks were tried against the new tests, and they caught all 25. Among them: a wrong value in either set, a color missing from the dark set, the popup's set drifting from the page's, a fill in the wrong place, the two blocks swapped, the 1 px edge losing to the sign-in fields' rule, and the badges back on `cssColor`.
- A look at the scratch build in the browser pane, with the high-contrast rules switched on by Task 6's script, showed the design working. That covered light and dark, the badge and pills on their darker fills, the progress track, the glass's edge, the popup by day and at night, and "Destin/Fort Walton Beach" at 375 px. There it fits on one line and runs under the dial's top, as in the app's card, whose city name has no line limit.

**Network and other repos**
- **No new requests.** Tests never use the network; `tests/setup/noNetwork.ts` blocks it.
- **One build script uses npm and the Flight Globe:** `npm run airports` (Task 5) installs `geo-tz@8.1.9` with `--no-save`, then reads `../crewlu-globe/public/data/airports.json` and `../crewlu-globe/scripts/ourairports.csv`. It never writes there.
  - The globe's working copy has the user's own uncommitted change to its `airports.json` (it adds DJT). Leave it as it is: never stage, commit or revert it.
  - If `package-lock.json` changes afterwards, restore it with `git checkout -- package-lock.json`.
- **Read-only site:** nothing in this plan talks to CrewLu Cloud or changes `src/data/readOnlyFetch.ts`.
- **The Crewluve app (`~/Dev/Crewluv`) is reference only.** Read it; never change it.

**Batches and changes**
- **One batch for helper execution:** A = Tasks 1–5, all the code. A spec review and a code-quality review follow it. Since the batch is the whole branch, the code-quality review also serves as the final whole-branch review. Give each reviewer its own frozen copy of the branch.
- **Tasks 6–7 are for the controller, working with the user:** the look check, then merge and release.
- **If the code has to differ from a printed block, write it down.** Note it under "Execution notes" at the end of this file, and update the spec's §9 decisions log if a decision changed.

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/styles/tokens.css` | modify | `--bar-track`; the high-contrast sets (light, dark, the popup's night set) and the `--fill-*` colors |
| `src/styles/trips.css` | modify | The progress track reads `--bar-track`; the pills' blends read the fills |
| `src/styles/cards.css` | modify | The sign-in button reads the blue fill; a 1 px edge on the glass and the sign-in fields under Increase Contrast |
| `src/ui/colors.ts` | modify | `cssFill`: a color as the background behind white text |
| `src/ui/UpcomingTripCard.tsx` | modify | The badges use `cssFill` |
| `scripts/build-airports.mjs` | modify | `APP_CITY`: the app's names for VPS, DEL, BAH and TAO |
| `public/data/airports.json` | regenerate | The airport list, with those four names |
| `tests/styles/styles.test.ts` | modify | The tokens, the fills, the edge, the track and the blends |
| `tests/ui/basics.test.tsx` | modify | `cssFill` |
| `tests/ui/tripCards.test.tsx` | modify | The badges' backgrounds |
| `tests/data/airports.test.ts` | modify | The four names |

---

### Task 1: The progress track's own color

The trip card's progress track is the gray at 20%, written today as a fixed color because the gray is the same in light and dark. Under Increase Contrast the gray differs between the two (spec §3.2), so the track needs a token that Task 2 can change.

**Files:**
- Modify: `src/styles/tokens.css:16`
- Modify: `src/styles/trips.css:113-119`
- Test: `tests/styles/styles.test.ts`

- [x] **Step 1: Write the failing test**

In `tests/styles/styles.test.ts`, add the track's row at the end of `SPEC_COLORS`, after the `--indigo` row:

```ts
  ['--indigo', '#6155F5', '#6D7CFF'],
  // Part A follow-ups spec §3.2: the trip card's progress track, the gray at 20% like the app's Color.gray.opacity(0.2).
  ['--bar-track', 'rgba(142,142,147,.2)', 'rgba(142,142,147,.2)'],
]
```

Then add this block just before `describe('location.css', () => {`:

```ts
describe('trips.css', () => {
  const top = blocks(css('trips'))
  const background = (head: string) => declarations(find(top, head)?.body ?? '').find(([prop]) => prop === 'background')?.[1]

  it('draws the progress track in --bar-track, so it can follow the high-contrast gray', () => {
    expect(background('.trip-bar')).toBe('var(--bar-track)')
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/styles/styles.test.ts`
Expected: FAIL in 3 tests: `--bar-track is the spec value in light mode`, the same in dark mode, and `draws the progress track in --bar-track…`, since neither exists yet.

- [x] **Step 3: Implement**

In `src/styles/tokens.css`, add `--bar-track` to the first `:root` block, after `--gray`:

```css
  --gray: #8e8e93;
  --bar-track: rgba(142, 142, 147, 0.2);
  --ups: #663300;
```

The dark block doesn't set it: the default track is the same in both modes. The existing test that keeps `.force-dark` identical to the dark block stays green because neither sets it.

In `src/styles/trips.css`, replace the progress bar's rule and its comment with:

```css
/* Progress bar: 10 px, the gray at 20% for the track (--bar-track, as Color.gray.opacity(0.2)); blue fill. */
.trip-bar {
  height: 10px;
  border-radius: 5px;
  background: var(--bar-track);
  overflow: hidden;
}
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/styles/styles.test.ts`
Expected: PASS, 59 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1616 tests in 70 files after this task.

```bash
git add src/styles/tokens.css src/styles/trips.css tests/styles/styles.test.ts
git commit -m "Progress track: its own color token, so it can follow the high-contrast gray (Part A follow-ups §3.2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The high-contrast colors

**Files:**
- Modify: `src/styles/tokens.css` (two blocks added at the end)
- Test: `tests/styles/styles.test.ts`

- [x] **Step 1: Write the failing test**

In `tests/styles/styles.test.ts`, add this block just before `describe('cards.css', () => {`:

```ts
// Part A follow-ups spec §3.2: Apple's high-contrast values (iOS 26) under Increase Contrast, light and dark. Secondary
// text keeps its color at 68% (173 of 255, as UIKit's), and the progress track is the high-contrast gray at 20%.
const HIGH_CONTRAST: Array<[name: string, light: string, dark: string]> = [
  ['--text-2', 'rgba(60,60,67,.678)', 'rgba(235,235,245,.678)'],
  ['--red', '#E9152D', '#FF6165'],
  ['--orange', '#C55300', '#FFA056'],
  ['--yellow', '#A16A00', '#FEDF43'],
  ['--green', '#008932', '#4AD968'],
  ['--teal', '#008198', '#3BDDEC'],
  ['--cyan', '#007EAE', '#6DD9FF'],
  ['--blue', '#1E6EF4', '#5CB8FF'],
  ['--indigo', '#564ADE', '#A7AAFF'],
  ['--purple', '#B02FC2', '#EA8DFF'],
  ['--pink', '#E7124D', '#FF8AC4'],
  ['--gray', '#6C6C70', '#AEAEB2'],
  ['--bar-track', 'rgba(108,108,112,.2)', 'rgba(174,174,178,.2)'],
]

/** The nine colors white text sits on: the city pills' blends, the badges and the sign-in button (spec §3.3). */
const FILLS = ['green', 'blue', 'orange', 'purple', 'pink', 'yellow', 'teal', 'cyan', 'indigo']

describe('tokens.css: Increase Contrast', () => {
  const top = blocks(css('tokens'))
  const customProperties = (body = '') => new Map(declarations(body).filter(([prop]) => prop.startsWith('--')))
  const lightMedia = find(top, '@media (prefers-contrast: more)')
  const darkMedia = find(top, '@media (prefers-color-scheme: dark) and (prefers-contrast: more)')
  const light = customProperties(find(blocks(lightMedia?.body ?? ''), ':root')?.body)
  const dark = customProperties(find(blocks(darkMedia?.body ?? ''), ':root')?.body)
  const forced = customProperties(find(blocks(lightMedia?.body ?? ''), '.force-dark')?.body)
  const lightDefault = customProperties(find(top, ':root')?.body)
  const darkDefault = customProperties(find(blocks(find(top, '@media (prefers-color-scheme: dark)')?.body ?? ''), ':root')?.body)

  it('comes after the default colors, light set first, so the dark set wins on a dark device', () => {
    expect(lightMedia).toBeDefined()
    expect(darkMedia).toBeDefined()
    expect(top.indexOf(lightMedia!)).toBeGreaterThan(top.indexOf(find(top, '.force-dark')!))
    expect(top.indexOf(darkMedia!)).toBeGreaterThan(top.indexOf(lightMedia!))
  })

  it.each(HIGH_CONTRAST)('%s is Apple’s high-contrast value in light mode', (name, lightSpec) => {
    expect(normalize(light.get(name))).toBe(normalize(lightSpec))
  })

  it.each(HIGH_CONTRAST)('%s is Apple’s high-contrast value in dark mode', (name, _lightSpec, darkSpec) => {
    expect(normalize(dark.get(name))).toBe(normalize(darkSpec))
  })

  it('sets in the dark set everything the light set sets, so none of the light set reaches a dark device', () => {
    expect(light.size).toBeGreaterThan(0)
    expect([...light.keys()].filter((name) => !dark.has(name))).toEqual([])
  })

  it('gives the popup at night the dark set exactly, every one of them', () => {
    expect(forced.size).toBeGreaterThan(0)
    expect(forced).toEqual(dark)
  })

  it('keeps white text on the light high-contrast colors in dark mode, and only there', () => {
    for (const color of FILLS) expect(normalize(dark.get(`--fill-${color}`)), `--fill-${color}`).toBe(normalize(light.get(`--${color}`)))
    expect([...dark.keys()].filter((name) => name.startsWith('--fill-'))).toHaveLength(FILLS.length)
    for (const set of [lightDefault, darkDefault, light]) expect([...set.keys()].filter((name) => name.startsWith('--fill-'))).toEqual([])
  })

  it('makes the glass more solid, with a stronger edge of the same color', () => {
    const rgba = (value = '') => /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(value)?.slice(1).map(Number) ?? []
    for (const [hc, base] of [[light, lightDefault], [dark, darkDefault]]) {
      for (const name of ['--glass-fill', '--glass-edge']) {
        const [r, g, b, a] = rgba(hc.get(name))
        const [r0, g0, b0, a0] = rgba(base.get(name))
        expect([r, g, b], name).toEqual([r0, g0, b0])
        expect(a, name).toBeGreaterThan(a0)
      }
    }
  })
})
```

What the tests pin:
- every value in the spec's §3.2 table, light and dark, plus the 68% secondary text and the track;
- that the dark set covers everything the light set does: the two blocks both match on a dark device, so anything the dark set left out would show its light value there;
- the popup's night set equal to the page's dark set;
- the nine fills, defined only in the dark sets;
- the glass more opaque with a stronger edge of the same color, not exact values, since Task 6 may tune them (spec §3.4).

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/styles/styles.test.ts`
Expected: FAIL in all 31 new tests: the high-contrast blocks don't exist yet.

- [x] **Step 3: Implement**

Add this to the end of `src/styles/tokens.css`, after the `.force-dark` block:

```css
/* Increase Contrast (Part A follow-ups spec §3): Apple's high-contrast system colors, as the app gets them from iOS,
   secondary text at 68%, and more solid glass with a stronger edge. These are the light ones. The dark ones are on
   .force-dark here, for the popup at night, and on :root for dark devices in the block after this one. */
@media (prefers-contrast: more) {
  :root {
    --text-2: rgba(60, 60, 67, 0.678);
    --green: #008932;
    --blue: #1e6ef4;
    --red: #e9152d;
    --orange: #c55300;
    --purple: #b02fc2;
    --pink: #e7124d;
    --yellow: #a16a00;
    --teal: #008198;
    --cyan: #007eae;
    --indigo: #564ade;
    --gray: #6c6c70;
    --bar-track: rgba(108, 108, 112, 0.2);
    --glass-fill: rgba(242, 242, 247, 0.94);
    --glass-edge: rgba(0, 0, 0, 0.3);
  }

  /* The dark high-contrast set in the next block, exactly; a test checks. */
  .force-dark {
    --text-2: rgba(235, 235, 245, 0.678);
    --green: #4ad968;
    --blue: #5cb8ff;
    --red: #ff6165;
    --orange: #ffa056;
    --purple: #ea8dff;
    --pink: #ff8ac4;
    --yellow: #fedf43;
    --teal: #3bddec;
    --cyan: #6dd9ff;
    --indigo: #a7aaff;
    --gray: #aeaeb2;
    --bar-track: rgba(174, 174, 178, 0.2);
    --glass-fill: rgba(44, 44, 46, 0.88);
    --glass-edge: rgba(255, 255, 255, 0.35);
    --fill-green: #008932;
    --fill-blue: #1e6ef4;
    --fill-orange: #c55300;
    --fill-purple: #b02fc2;
    --fill-pink: #e7124d;
    --fill-yellow: #a16a00;
    --fill-teal: #008198;
    --fill-cyan: #007eae;
    --fill-indigo: #564ade;
  }
}

/* The dark high-contrast colors. They're lighter, so white text would get harder to read on them: the --fill-* colors
   keep the light high-contrast ones behind the pills', badges' and sign-in button's white text (spec §3.3). */
@media (prefers-color-scheme: dark) and (prefers-contrast: more) {
  :root {
    --text-2: rgba(235, 235, 245, 0.678);
    --green: #4ad968;
    --blue: #5cb8ff;
    --red: #ff6165;
    --orange: #ffa056;
    --purple: #ea8dff;
    --pink: #ff8ac4;
    --yellow: #fedf43;
    --teal: #3bddec;
    --cyan: #6dd9ff;
    --indigo: #a7aaff;
    --gray: #aeaeb2;
    --bar-track: rgba(174, 174, 178, 0.2);
    --glass-fill: rgba(44, 44, 46, 0.88);
    --glass-edge: rgba(255, 255, 255, 0.35);
    --fill-green: #008932;
    --fill-blue: #1e6ef4;
    --fill-orange: #c55300;
    --fill-purple: #b02fc2;
    --fill-pink: #e7124d;
    --fill-yellow: #a16a00;
    --fill-teal: #008198;
    --fill-cyan: #007eae;
    --fill-indigo: #564ade;
  }
}
```

How the blocks work together:
- **Light device:** only the first block matches, so `:root` takes the light set.
- **Dark device:** both blocks match, and the second wins because it comes later.
- **The popup at night:** it has `.force-dark` (slice 2B2 §4). The first block's `.force-dark` rule matches on any device with Increase Contrast. It comes after the plain `.force-dark` block, so it wins over it.
- **The fills:** they're defined only in the dark sets, so anywhere else `var(--fill-blue, var(--blue))` falls back to the color itself (Task 3).
- **Unchanged:** `--bg`, `--text`, `--ups`, `--glass-rim` and `--glass-shadow` aren't in either set, so they keep their default values.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/styles/styles.test.ts`
Expected: PASS, 90 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1647 tests in 70 files after this task.

```bash
git add src/styles/tokens.css tests/styles/styles.test.ts
git commit -m "Increase Contrast: Apple's high-contrast colors, light and dark, and readable fills behind white text (Part A follow-ups §3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: White text on the readable fills

**Files:**
- Modify: `src/ui/colors.ts` (a function added at the end)
- Modify: `src/ui/UpcomingTripCard.tsx:7`, `:54-57`
- Modify: `src/styles/trips.css:179-189`, `:192-198`
- Modify: `src/styles/cards.css:275-277`
- Test: `tests/ui/basics.test.tsx`, `tests/ui/tripCards.test.tsx`, `tests/styles/styles.test.ts`

- [x] **Step 1: Write the failing tests**

In `tests/ui/basics.test.tsx`, import `cssFill` beside `cssColor`:

```tsx
import { cssColor, cssFill } from '../../src/ui/colors'
```

and add this block just before `describe('Icon', () => {`:

```tsx
describe('cssFill', () => {
  it('puts the readable fill first for a named color, and falls back to the color itself', () => {
    for (const token of ['green', 'blue', 'red', 'orange', 'purple', 'gray', 'cyan', 'indigo', 'yellow', 'ups'] as const) {
      expect(cssFill(token)).toBe(`var(--fill-${token}, var(--${token}))`)
    }
  })

  it('leaves a brand hex and the secondary color as cssColor gives them', () => {
    expect(cssFill('#002666')).toBe('#002666')
    expect(cssFill('secondary')).toBe('var(--text-2)')
  })
})
```

In `tests/ui/tripCards.test.tsx`, replace the badge colors test with:

```tsx
  it('colors the badges: blue Line Trip, orange Delayed, green Early, through the readable fills behind white text', () => {
    const { rerender } = render(card(trip({ delayMinutes: 40 })))
    expect((screen.getByText('Line Trip') as HTMLElement).style.background).toBe('var(--fill-blue, var(--blue))')
    expect((screen.getByText('Delayed') as HTMLElement).style.background).toBe('var(--fill-orange, var(--orange))')
    rerender(card(trip({ delayMinutes: -20 })))
    expect((screen.getByText('Early') as HTMLElement).style.background).toBe('var(--fill-green, var(--green))')
  })
```

In `tests/styles/styles.test.ts`, add this test at the end of the `cards.css` block:

```ts
  it('draws the sign-in button on the readable fill behind its white text', () => {
    expect(declarations(find(top, '.primary')!.body)).toContainEqual(['background', 'var(--fill-blue, var(--blue))'])
  })
```

and this one at the end of the `trips.css` block, after the progress track's test:

```ts
  it.each([
    ['.blend-0', 'blue', 'cyan'],
    ['.blend-1', 'purple', 'pink'],
    ['.blend-2', 'orange', 'yellow'],
    ['.blend-3', 'teal', 'green'],
    ['.blend-4', 'indigo', 'purple'],
  ])('%s blends %s into %s, through the readable fills behind white text', (head, from, to) => {
    expect(background(head)).toBe(`linear-gradient(to right, var(--fill-${from}, var(--${from})), var(--fill-${to}, var(--${to})))`)
  })
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/basics.test.tsx tests/ui/tripCards.test.tsx tests/styles/styles.test.ts`
Expected: FAIL in 9 tests: the two `cssFill` tests (`cssFill is not a function`), the badge colors test, the sign-in button's test and the five blends.

- [x] **Step 3: Implement**

Add this to the end of `src/ui/colors.ts`:

```ts
/**
 * A ColorToken as the background behind white text (Part A follow-ups spec §3.3): the --fill-* color where tokens.css
 * defines one, under Increase Contrast in dark mode, else the color itself. A brand hex and the secondary color come
 * back as cssColor gives them.
 */
export function cssFill(token: ColorToken): string {
  if (token.startsWith('#') || token === 'secondary') return cssColor(token)
  return `var(--fill-${token}, var(--${token}))`
}
```

In `src/ui/UpcomingTripCard.tsx`, import `cssFill` in place of `cssColor`, which the file no longer uses:

```tsx
import { cssFill } from './colors'
```

and give the badge its fill:

```tsx
/** A capsule badge: white text and icon on the badge's color, or its readable fill under Increase Contrast in dark mode. */
function Badge({ badge }: { badge: BadgeVisual }) {
  return (
    <span class="badge" style={{ background: cssFill(badge.color) }}>
```

In `src/styles/trips.css`, replace the first three blends with:

```css
/* The blends take the readable fills behind white text where tokens.css defines them (under Increase Contrast in dark
   mode), else the colors themselves. */
.blend-0 {
  background: linear-gradient(to right, var(--fill-blue, var(--blue)), var(--fill-cyan, var(--cyan)));
}

.blend-1 {
  background: linear-gradient(to right, var(--fill-purple, var(--purple)), var(--fill-pink, var(--pink)));
}

.blend-2 {
  background: linear-gradient(to right, var(--fill-orange, var(--orange)), var(--fill-yellow, var(--yellow)));
}
```

and the last two with:

```css
.blend-3 {
  background: linear-gradient(to right, var(--fill-teal, var(--teal)), var(--fill-green, var(--green)));
}

.blend-4 {
  background: linear-gradient(to right, var(--fill-indigo, var(--indigo)), var(--fill-purple, var(--purple)));
}
```

In `src/styles/cards.css`, in the `.primary` rule, change the background:

```css
  border-radius: 12px;
  background: var(--fill-blue, var(--blue));
  color: #ffffff;
```

These are the only places with white text on a color (spec §3.3). Nowhere else defines the fills, so without Increase Contrast, and on a light device, these read their ordinary colors exactly as before.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/basics.test.tsx tests/ui/tripCards.test.tsx tests/styles/styles.test.ts`
Expected: PASS, 128 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1655 tests in 70 files after this task.

```bash
git add src/ui/colors.ts src/ui/UpcomingTripCard.tsx src/styles/trips.css src/styles/cards.css tests/ui/basics.test.tsx tests/ui/tripCards.test.tsx tests/styles/styles.test.ts
git commit -m "White text on color: the readable fills behind the badges, the pills and the sign-in button (Part A follow-ups §3.3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: A 1 px edge on the glass

**Files:**
- Modify: `src/styles/cards.css` (a block added at the end)
- Test: `tests/styles/styles.test.ts`

- [x] **Step 1: Write the failing test**

In `tests/styles/styles.test.ts`, add this test at the end of the `cards.css` block, after the sign-in button's test:

```ts
  it('gives the glass and the sign-in fields a 1 px edge under Increase Contrast, after both rules so it wins', () => {
    const media = find(top, '@media (prefers-contrast: more)')
    expect(media).toBeDefined()
    const edge = find(blocks(media!.body), '.glass, .field')
    expect(edge).toBeDefined()
    expect(declarations(edge!.body)).toEqual([['border-width', '1px']])
    expect(top.indexOf(media!)).toBeGreaterThan(Math.max(top.indexOf(find(top, '.glass')!), top.indexOf(find(top, '.field')!)))
  })
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/styles/styles.test.ts`
Expected: FAIL in 1 test, with `expected undefined to be defined`: there's no `prefers-contrast` block in cards.css yet.

- [x] **Step 3: Implement**

Add this to the end of `src/styles/cards.css`:

```css
/* Increase Contrast (Part A follow-ups spec §3.4): the glass's edge, and the sign-in fields', at 1 px so it shows on
   every screen; tokens.css makes it stronger. It comes after both rules, so it wins. */
@media (prefers-contrast: more) {
  .glass,
  .field {
    border-width: 1px;
  }
}
```

`.glass` and `.field` both set `border: 0.5px solid var(--glass-edge)` earlier in the file. A media query adds no specificity, so this rule has to come after both to win, and the test checks that. Every frosted element has the `glass` class: the cards, the sun popup's card, the days-home pill, the demo banner and the footer's two round buttons (spec §3.4).

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/styles/styles.test.ts`
Expected: PASS, 97 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1656 tests in 70 files after this task.

```bash
git add src/styles/cards.css tests/styles/styles.test.ts
git commit -m "Increase Contrast: a 1 px edge on the glass and the sign-in fields (Part A follow-ups §3.4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The app's city names

**Files:**
- Modify: `scripts/build-airports.mjs:3`, `:167`, `:199`
- Regenerate: `public/data/airports.json`
- Test: `tests/data/airports.test.ts`

- [x] **Step 1: Write the failing test**

In `tests/data/airports.test.ts`, add this test at the end of the `generated public/data/airports.json` block:

```ts
  it('names cities as the Crewluve app’s table does where the globe’s list differs', () => {
    expect(idx.city('VPS')).toBe('Destin/Fort Walton Beach')
    expect(idx.city('DEL')).toBe('New Delhi')
    expect(idx.city('BAH')).toBe('Bahrain')
    expect(idx.city('TAO')).toBe('Qingdao')
  })
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/data/airports.test.ts`
Expected: FAIL in 1 test, with `expected 'Valparaiso' to be 'Destin/Fort Walton Beach'`.

- [x] **Step 3: Implement**

In `scripts/build-airports.mjs`, add a line about cities to the header comment, after the "Source:" line:

```js
// Source: the Flight Globe's merged list (Crewlu's own airport tables win over OurAirports there).
// Cities: the globe's, except where the Crewluve app's own airport table (AirportDataProvider.swift) names one
// differently: VPS, DEL, BAH and TAO.
```

add the map just before `const skipped = …`:

```js
// The Crewluve app's airport table names these four cities differently from the globe's list. The app's names win, so
// the site reads like the app.
const APP_CITY = new Map([
  ['VPS', 'Destin/Fort Walton Beach'],
  ['DEL', 'New Delhi'],
  ['BAH', 'Bahrain'],
  ['TAO', 'Qingdao'],
])

const skipped = { 'bad code': 0, duplicate: 0, 'bad coordinates': 0, 'no zone': 0 }
```

and use it where each row is built:

```js
  const row = [iata, APP_CITY.get(iata) ?? String(r.city || iata), country, round(r.lat), round(r.lng), tz]
```

Then regenerate the list:

```bash
npm run airports
```

Expected, among its lines: `wrote 9056 airports to …/public/data/airports.json`, `skipped: 0 bad code, 0 duplicate, 0 bad coordinates, 0 no zone` and `US airports without a state: 0`.

Check that only the four rows changed:

```bash
node -e "
const { execSync } = require('node:child_process')
const before = JSON.parse(execSync('git show HEAD:public/data/airports.json', { maxBuffer: 1 << 26 }))
const after = JSON.parse(require('node:fs').readFileSync('public/data/airports.json', 'utf8'))
const old = new Map(before.map((r) => [r[0], JSON.stringify(r)]))
console.log(before.length, after.length, after.filter((r) => old.get(r[0]) !== JSON.stringify(r)).map((r) => r[0] + ' ' + r[1]))
"
```

Expected: `9056 9056 [ 'BAH Bahrain', 'DEL New Delhi', 'TAO Qingdao', 'VPS Destin/Fort Walton Beach' ]`. Anything else means the globe's files or the runtime changed since 2026-10-11. Stop and report it rather than committing.

Then check the other repo and the lockfile:
- `git -C ../crewlu-globe status --short` still shows only ` M public/data/airports.json`, the user's own change.
- If `git status --short` lists `package-lock.json`, restore it with `git checkout -- package-lock.json`.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/data/airports.test.ts`
Expected: PASS, 34 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1657 tests in 70 files after this task.

```bash
git add tests/data/airports.test.ts scripts/build-airports.mjs public/data/airports.json
git commit -m "City names: the Crewluve app's for VPS, DEL, BAH and TAO (Part A follow-ups §4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Look check with the user (controller)

**Files:**
- Modify (only if the user wants the glass tuned): `src/styles/tokens.css`

- [x] **Step 1: Build and open the preview**

Run `npm run build`, then start or reuse the `crewluve-preview` server from `.claude/launch.json` (port 5181) in the browser pane.

- [x] **Step 2: Switch the high-contrast rules on**

The browser pane can't turn on Increase Contrast, so this debugging script copies the `prefers-contrast: more` rules out of their media queries for inspection. It changes nothing on disk, and a reload undoes it. Run it with `javascript_tool` after each page load:

```js
for (const sheet of document.styleSheets) {
  for (const rule of [...sheet.cssRules]) {
    if (!(rule instanceof CSSMediaRule) || !rule.media.mediaText.includes('prefers-contrast: more')) continue
    const rest = rule.media.mediaText.split(' and ').filter((m) => !m.includes('prefers-contrast')).join(' and ')
    const inner = [...rule.cssRules].map((r) => r.cssText)
    if (rest) sheet.insertRule(`@media ${rest} { ${inner.join(' ')} }`, sheet.cssRules.length)
    else for (const text of inner) sheet.insertRule(text, sheet.cssRules.length)
  }
}
document.getAnimations().forEach((a) => a.finish())
```

Light or dark comes from `resize_window` with `colorScheme`; reload after switching, then run the script again. The CSP allows this: it blocks new `<style>` elements, not changes through the CSSOM.

- [x] **Step 3: Take the screenshots**

At the mobile preset (375 × 812), in light and in dark, take screenshots of:
- `/?demo=1&scene=home`: the main screen, the countdown, the location card, and the upcoming trip card's "Line Trip" badge;
- `/?demo=1&scene=delayed`: the red countdown, the location card, and the progress card with its track and city pill;
- the popup from the `delayed` scene's dial, by day, then at night. For the night look, add the `force-dark` class to `.sun-popup-card` with `javascript_tool`, unless it's night in Anchorage anyway;
- the longest city name: with `javascript_tool`, put "Destin/Fort Walton Beach" in the location card's `.location-city`, a pill's `.city-name`, and the popup's `.sun-popup-city` and "In …" row (a reload undoes it). At 375 px it fits on one line and runs under the dial's top, as in the app's card (spec §4).

Before each screenshot, run `document.getAnimations().forEach((a) => a.finish())`, since the hidden pane holds back CSS animations. Also check in dark mode that `getComputedStyle(document.querySelector('.badge')).backgroundColor` is `rgb(30, 110, 244)`: the badge keeps the darker blue behind its white text.

- [x] **Step 4: Ask the user to sign off**

Show the user the screenshots, without and with the script, and ask one question: "Looks right (Recommended)" or "Change something". Mention that they can also turn on Increase Contrast on their own phone or Mac:
- on an iPhone: Settings → Accessibility → Display & Text Size → Increase Contrast;
- on a Mac: System Settings → Accessibility → Display → Increase contrast.

If they want the glass tuned (spec §3.4), change the `--glass-fill` and `--glass-edge` values in both high-contrast sets. Keep the two dark sets identical; the tests check that, and that each stays more opaque than its default.

- [x] **Step 5: Run the gates and commit any tuning**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/styles/tokens.css
git commit -m "Increase Contrast: the glass tuned in the look check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Merge and release (controller, asks first)

- [ ] **Step 1: Merge**

Use superpowers:finishing-a-development-branch. Ask the user one question about how to merge `parta-followups` into `main`.

- [ ] **Step 2: Release, only with a fresh yes**

Ask before pushing `main`; the push redeploys crewluve.crewlu.net. After the "Deploy to GitHub Pages" run succeeds:
- open https://crewluve.crewlu.net/?demo=1 and check that `read_console_messages` with `onlyErrors: true` shows nothing, and that the demo made no network requests beyond the page's own files;
- run Task 6's script on the live page and check that `getComputedStyle(document.documentElement).getPropertyValue('--blue')` reads `#1e6ef4` in light mode, or `#5cb8ff` in dark;
- check with `fetch('/data/airports.json')` that the row for VPS reads "Destin/Fort Walton Beach".

- [ ] **Step 3: Update the memory**

Update the project memory with the new tip and what's next: Part C, the in-flight map.

---

## Done when

- `npx vitest run`, `npx tsc --noEmit` and `npm run build` are all green, with 1657 tests in 70 files.
- Under `prefers-contrast: more`, the site uses Apple's high-contrast colors in light and dark; white text sits on the darker fills in dark mode; the glass is more solid with a 1 px edge; the popup's night set matches the page's dark set (Tasks 1–4).
- VPS, DEL, BAH and TAO carry the app's city names, and no other airport changed (Task 5).
- The user has signed off on the look (Task 6), and the change is live on crewluve.crewlu.net, released with the user's yes (Task 7).

## Spec coverage

| Spec section | Tasks |
|---|---|
| §3.1 When | 2 (the two media queries) |
| §3.2 Colors | 1 (the track's token), 2 (the high-contrast values, secondary text and the track) |
| §3.3 White text on color | 2 (the fills), 3 (the badges, the pills and the sign-in button) |
| §3.4 Frosted glass | 2 (fill and edge colors), 4 (the 1 px edge), 6 (tuning, if wanted) |
| §3.5 The popup at night | 2 (the `.force-dark` set) |
| §3.6 What it covers | 2: everything that reads the shared colors follows, including the weather animation, which reads them from the page. Fixed colors aren't touched. 6 checks the look. |
| §4 City names | 5 |
| §5 How it's built | 1–5 |
| §6 Security and privacy | Nothing to build: no request, script or storage is added, and Task 5 only reads the globe's files. |
| §7 Deliberate differences | 2 and 3 (1), 2 (2 and 3); nothing to build for 4, since the celebration figure keeps its fixed greens |
| §8 Testing | Every task, then 6 |

## Execution notes

- **Build, 2026-10-11:** Tasks 1–5 went in from the printed blocks on `parta-followups`, test-first: `3a5b27c`, `24a1a0c`, `82dbe21`, `137ca62` and `18781ea`. Every Step 2 failed and every Step 4 passed with the printed count, and the files came out byte-identical to the scratch copy's. `npm run airports` changed only the four rows; the Flight Globe and `package-lock.json` were untouched.
- **Look check (Task 6):** the user saw side-by-side screenshots of the built branch, today's look beside Increase Contrast, and said "Looks right". They covered the main screen in light and dark, the badge and pill in dark, the popup by day and at night, and the longest name. There was no tuning, so there's no tuning commit.
  - The browser pane sometimes hands back the previous frame right after a script changes the page. Taking a small throwaway screenshot first, then the real one, gets the current frame.
- **Spec review:** passed, and its own 26 deliberate breaks were all caught. From its notes, `1e4e62e` adds two tests:
  - the high-contrast sets change only what spec §3.2 lists, never `--bg`, `--text` or `--ups`;
  - no stylesheet but `tokens.css` defines a fill.
- **Code-quality review, which was also the final review:** "Ready to merge? Yes", with nothing Critical or Important. It checked the cascade in headless Chrome against the built CSS of both base and head. `9f6b79d` makes its minor changes:
  - the order test also checks the high-contrast blocks against the plain dark block (moving that block to the end passed before);
  - a test checks that every color a badge can take has a fill;
  - one custom-properties helper at the top of `styles.test.ts` replaces three copies;
  - `cssFill` builds its fallback with `cssColor`, with the same output.
- **Left as they are, by design:**
  - The weather animation reads its colors when the popup opens. Switching Increase Contrast while it's open recolors it only on the next opening, as with light and dark.
  - The pills' 9 px subtitles stay white at 85% like the app's. On the fills that reaches 3.6:1 or more rather than 4.5:1, and spec §3.2 now says so.
- **Totals:** after the review follow-ups, the suite is 1660 tests in 70 files.
