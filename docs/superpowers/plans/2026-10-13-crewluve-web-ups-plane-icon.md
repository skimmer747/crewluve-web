# Crewluve Web UPS Plane Icon: a Tilted Plane for UPS Flights, Not a Box Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** UPS flights show Phosphor's tilted plane, in UPS brown, where they show a box today: in the schedule rows and in the status sentence card's icon. FedEx keeps the box.

**Architecture:** One entry in the airline table, `SYMBOLS['5X']` in `src/copy/airlines.ts`, changes from `'Package'` to `'AirplaneTilt'`. Both places that draw an airline's icon read it through `airlineIcon`, so nothing else changes.

**Tech Stack:** Vite 5.4, TypeScript 5.9 (strict), Preact 10, Vitest 3 with happy-dom and @testing-library/preact.

**Spec:** `docs/superpowers/specs/2026-10-13-crewluve-web-ups-plane-icon-design.md`

---

## Execution notes

- **Branch:** `ups-plane-icon`, from `main` at `527b007`, in the main project folder. The spec is its first commit (`bde1392`). Run every command from the project root, `~/Dev/Crewluve Website`, quoted.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`, all green before every commit that touches code. The suite is 2167 tests in 95 files before this plan, and 2168 after it (Task 1 adds the FedEx case).
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Nothing to install:** `AirplaneTilt` is already in `src/icons/iconPaths.ts`, and `Package` stays there for FedEx.
- **The Crewluve app (`~/Dev/Crewluv`) is reference only.** It keeps its box; never change it.
- **One review** after Task 1, covering the spec too. Tasks 2–3 are for the controller, working with the user.

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/copy/airlines.ts` | modify | UPS's icon is the tilted plane; the comment says why it differs from the app |
| `tests/copy/airlines.test.ts` | modify | `5X` → `AirplaneTilt`, `FX` → `Package` |
| `tests/ui/scheduleFacts.test.ts` | modify | A UPS row's look has the plane |
| `tests/ui/TimelineRow.test.tsx` | modify | A UPS row draws the plane |
| `tests/copy/visuals.test.ts` | modify | The status card's icon in the air on UPS is the plane |

---

### Task 1: The tilted plane for UPS

- [x] **Step 1: Move the tests to the plane**

In `tests/copy/airlines.test.ts`, replace the `airlineIcon` table's first line, keeping it within 120 characters:

```ts
  it.each([
    ['5X', 'AirplaneTilt'], ['FX', 'Package'], ['DL', 'Triangle'], ['WN', 'Heart'], ['IB', 'Airplane'], [null, 'Airplane'],
  ])(
```

In `tests/ui/scheduleFacts.test.ts`, the first `rowLook` test becomes:

```ts
  it('writes a company flight as Duty does, with the UPS plane in UPS brown', () => {
    expect(look(flight('RFD', 'SDF', 0, 1, 'T1', { number: '2961' }))).toEqual({ title: 'UPS2961: RFD → SDF', icon: 'AirplaneTilt', color: 'ups', homeward: false })
  })
```

In `tests/ui/TimelineRow.test.tsx`, in "shows the icon in a circle of the leg’s color…":

```ts
    expect(iconNameOf(icon)).toBe('AirplaneTilt')
```

In `tests/copy/visuals.test.ts`, the two in-the-air rows of `statusVisual`:

```ts
    [100, 'AirplaneTilt', 'ups'],
```

```ts
    [1700, 'AirplaneTilt', 'orange'],
```

and the early departure in "statusVisual in the less common states":

```ts
    { name: 'in the air, left early', engine: twoFlights(-40), minutes: 400, visual: { icon: 'AirplaneTilt', color: 'green' } },
```

- [x] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/copy/airlines.test.ts tests/ui/scheduleFacts.test.ts tests/ui/TimelineRow.test.tsx tests/copy/visuals.test.ts`
Expected: 6 failed, each "expected 'Package' to be 'AirplaneTilt'" or the same inside an object; the new `FX → Package` case passes.

- [x] **Step 3: Implement**

In `src/copy/airlines.ts`, under the SF Symbol → Phosphor comment and before `const SYMBOLS`, add:

```ts
// UPS breaks from the app on purpose: the app gives it shippingbox.fill, and the site the tilted plane the user chose
// (UPS plane icon spec, decision 1). FedEx keeps the box.
```

and in `SYMBOLS`:

```ts
  FX: 'Package', '5X': 'AirplaneTilt', AC: 'Leaf', LH: 'Bird', BA: 'Crown', AF: 'AirplaneTilt', CX: 'Bird',
```

- [x] **Step 4: Run them and watch them pass**

Run: `npx vitest run tests/copy/airlines.test.ts tests/ui/scheduleFacts.test.ts tests/ui/TimelineRow.test.tsx tests/copy/visuals.test.ts`
Expected: all pass.

- [x] **Step 5: Run the gates and commit**

Run the three gates: 2168 tests in 95 files, `tsc` clean, build clean. Then:

```bash
git add src/copy/airlines.ts tests/copy/airlines.test.ts tests/ui/scheduleFacts.test.ts tests/ui/TimelineRow.test.tsx tests/copy/visuals.test.ts
git commit -m "UPS flights show the tilted plane, not the app's box; FedEx keeps it (UPS plane icon §3)"
```

with the trailer.

---

### Task 2: Browser check (controller)

- [x] **Step 1: Build and open the preview**

`npm run build`, then the `crewluve-preview` server from `.claude/launch.json` (port 5181) in the browser pane, at 375 × 812.

- [x] **Step 2: Check the plane**

On `/?demo=1&scene=flying`, in light and dark:
- the status card's icon is the tilted plane in UPS brown, inside its ring;
- on `#schedule`, the UPS rows show the tilted plane in their brown circles, and the row happening now still pulses;
- `/?demo=1&scene=last-leg` shows the plane in orange (the late departure);
- `read_console_messages` with `onlyErrors: true` shows nothing.

---

### Task 3: Merge and release (controller, asks first)

- [ ] **Step 1: Merge**

Use superpowers:finishing-a-development-branch. Ask the user one question about how to merge `ups-plane-icon` into `main`.

- [ ] **Step 2: Release, only with a fresh yes**

Ask before pushing `main`; the push redeploys crewluve.crewlu.net. After the "Deploy to GitHub Pages" run succeeds, check that the live page's files match the local build, that the flying scene shows the plane, and that there are no console errors.

- [ ] **Step 3: Update the memory**

Update the project memory with the new tip, the site's first deliberate break from the app's look, and what's next: back to the idea board.

---

## Done when

- `npx vitest run`, `npx tsc --noEmit` and `npm run build` are all green, with 2168 tests in 95 files.
- UPS flights show the tilted plane in the schedule rows and the status card's icon, and FedEx still shows the box (Tasks 1–2).
- It's live on crewluve.crewlu.net, released with the user's yes (Task 3).

## Spec coverage

| Spec section | Tasks |
|---|---|
| §2 Where it shows | 1 (both callers' tests), 2 |
| §3 The design | 1 |
| §4 Testing | 1, 2 |

## Execution notes
- **Task 1:** built as printed; 6 tests failed first ("expected 'Package' to be 'AirplaneTilt'"), then 2168 tests in 95 files passed, `tsc` and build clean. Commit `c809af2`; 2169 after the review.
- **Task 2:** at 375 × 812, `scene=flying`: the status card's icon is the tilted plane in UPS brown in its ring; on `#schedule` every UPS row (UPS2950, 2951, 2961, 2963, 2962, …) draws the tilted plane, the drives keep the car, and UPS2961, happening, still pulses. Dark: the planes are the lighter UPS gold. `scene=last-leg`: the plane in orange. No console errors.
- **Review (after Task 1): ready to merge,** no findings. It confirmed both icon paths (`scheduleFacts.ts` `moveLook`, `copy/visuals.ts` `statusVisual`) go through `airlineIcon`; `UPS`, `ups` and `5X` all resolve to `5X`; a company flight with no code becomes `5X` in `normalize.ts`; nothing else draws an airline's icon. A break back to `Package` failed exactly 6 tests. Taken: a `UPS → AirplaneTilt` case in `airlines.test.ts` (2169 tests). Noted, not changed: a numbered jumpseat with no airline already shows the airline's icon on the status card but the green seat in its row (`scheduleFacts.test.ts` documents it), so it now shows the plane there instead of the box.

