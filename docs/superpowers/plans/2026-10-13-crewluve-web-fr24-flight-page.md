# Crewluve Web FlightRadar24 Flight Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The tracking popup's FlightRadar24 button opens the flight number's page, which shows the flight before takeoff too.

**Architecture:** `trackingLinks` (`src/copy/tracking.ts`) builds the address from `airlineIata` (`src/copy/airlines.ts`, formerly the private `resolve`). A code that isn't a two-character IATA code keeps the live-map link.

**Spec:** `docs/superpowers/specs/2026-10-13-crewluve-web-fr24-flight-page-design.md`

---

## Execution notes

- **Branch:** `fr24-flight-page`, from `main` at `515a867`, in the main project folder. Spec first (`d1de02a`).
- **Gates:** `npx vitest run`, `npx tsc --noEmit`, `npm run build`. 2192 tests in 95 files before, 2198 after the build, 2200 after the review.
- **One review**, then a re-check.

### Task 1: Build

- [x] **Step 1:** red: `airlineIata` cases; `trackingLinks` gives `/data/flights/5x2962`, "UPS" → `5x5768`; the popup's link. 8 failed.
- [x] **Step 2:** green: 2198 tests, `tsc` and build clean. A page check that the callsign's check already covers was folded into a comment, as no break could catch it. 4 of 4 deliberate breaks caught. Demo flying scene: the popup links to `/data/flights/5x2961`; no console errors. Commit `3e424c7`.

### Task 2: Review, merge and release

- [x] **Step 1:** review, fixes, re-check.
- [x] **Step 2:** merge and push (the user said in advance: "merge and push it when the review passes").
- [x] **Step 3:** the Pages run, the live files, the live popup.
- [x] **Step 4:** memory.

## Execution notes

- **Review: ready to merge with small fixes.**
  - **Important, taken:** a three-letter ICAO code outside the table ("ABX 3060"; Duty's custom airline field takes 2–3 letters) would get a page with no data. It now keeps `fr24.com/{callsign}` (decision 3).
  - **Minor, taken:**
    - the page's address is checked again, so `('5X', '12ı')` gives no links
    - the specs' section reference fixed, and the iPhone hand-over note added: FlightRadar24's `apple-app-site-association` excludes `/data*`
    - `resolve` became `airlineIata`
    - a lower-case `dl` case
  - **Kept:** the caption "Live tracking map" (decision 2).
  - 2200 tests; 5 of 5 deliberate breaks caught (no fallback, the fallback for every code, the page check dropped, ICAO back, upper case). Commit `6273c72`.
- **Re-check: ready to merge, yes.** No regressions. One- and four-character codes keep the live map, as before this branch.
- **Released, 2026-10-13:** fast-forward of main to `6273c72` (branch deleted; 2200 tests, `tsc` and build green on main), pushed `c376f37..6273c72` (4 commits, incl. Back Home's release note). Pages run 38469267175 succeeded (`gh run watch` hit a GitHub 502 once; polled to the end). Live serves `index-rgxKvbGq.js`/`index-DL9IXgqK.css`; they, `index.html` and the Supabase chunk are byte-identical to the local build. Live `?demo=1&scene=flying`: the popup links to `https://www.flightradar24.com/data/flights/5x2961` and `https://www.flightaware.com/live/flight/UPS2961`; no console errors.
