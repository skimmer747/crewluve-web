# Partner Alert Pushes, Plan 2a: Trip Alerts on Crewlu Cloud — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crewlu Cloud's partner-push alerts trips as spec §15 says. "Trip was cancelled" comes only when a trip is removed, and "Has a new trip" when one is added. A home arrival or a departure moving counts only within the same trip. The shared cases check all of it, and Crewluve 1.3 (plan 2b) runs them too.

**Architecture:** The rules live in partner-push's `alertsFor` and its helpers (`supabase/functions/partner-push/index.ts`). A trip is read from the summary's legs, by its `tripId`, and trips are matched by their time spans, never by id. The shared cases (`supabase/partner-status/alert-cases.json`) are the contract with Crewluve. No SQL changes: Crewlu Cloud only gets partner-push's new file.

**Tech Stack:** TypeScript (Deno in Supabase, Node 23 in the tests), Node's test runner with PGlite, JSON.

---

## Before you start

- **The spec:** `~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`, §15 (the trip alerts), with §5.3 (the rules) and §9.1 (the shared cases).
- **What's there:** plan 1 (`docs/superpowers/plans/2026-10-23-partner-alert-pushes-1-cloud.md`) is live on Crewlu Cloud since 2026-10-24. partner-push copies Crewluve's `StatusChangeNotifier` rules, and the 36 shared cases check them. `npm test` in `supabase/tests` runs 272 tests.
- **Who sees it:** nobody gets alert pushes until they have Crewluve 1.3 (plan 2b), so this changes nothing anyone sees yet. It must be live before 1.3 reaches the partners.
- **The CrewLu repo is public:** no names, emails or tokens in it.
- **The tests:** run them with `node --no-maglev --test`, or `npm test`, which does. Without `--no-maglev`, Node 23.11 can deadlock with PGlite.
- **Pushes:** never push without the user's fresh yes. Claude's Supabase connection is read-only.

## Decisions made while planning

These refine spec §15. Task 7 writes them into it.

1. **A departure belongs to the trip whose span holds it.** §15.3 said: the trip of the leg that starts at `nextDepartureTime`. For CrewLu's summaries they're the same, since `nextDepartureTime` is a flight's scheduled start (`PartnerStatusGenerator.findNextDeparture`). The span stays right if a delay-shifted time ever appears, as in the case "One change, two alerts".
2. **"Removed" is judged at the later moment, as "added" is.** A trip that's over by the change and gone from the summary says nothing. §15.3 said the earlier moment, which would call a trip that had just ended "cancelled".
3. **One helper serves both directions:** `tripsMissing(from, to, at)`. Its safety net checks `to` only: a summary with no legs has no trips to miss.
4. **`homeArrival` returns `{ time, trips }`,** the trips being those its arrival belongs to. Its tests read `.time`.
5. **The cases:**
   - **Out:** the five that read `currentTripId` as a new or cancelled trip.
   - **In:** 18 new ones, §15's plus two more: a trip under way cut short, which isn't cancelled, and a departure no trip holds, which is never compared. That makes 49 cases.
   - **Their words** follow §15.4. Plan 2b checks them against Crewluve's Swift once it has §15's rules.
6. **Built in a worktree,** `~/Dev/Duty-trip-alerts`, on the new branch `feature/trip-alerts` from `feature/supabase-account-backend` at `94253777`, as plan 1 was.

## How this plan was checked

- **Built test-first in a scratch clone:** the whole change gives 274 of 274 tests, and strict TypeScript is clean.
- **Deliberate breaks:** 22 breaks of the new code, and a test catches each one.
- **Against Crewluve's Swift:** in plan 1's harness, the cases ran through Crewluve's current `StatusChangeNotifier`. Exactly the 11 cases §15 changes differ. The other 38 match, words included.
- **A replay:** Tasks 1–4, applied from this plan's own text to a fresh clone, gave every Run's printed result, and the finished tree equals the scratch build's.

## Files

- **Modify:** `supabase/functions/partner-push/index.ts`: `homeArrival` and the trip helpers, `alertsFor`'s schedule rules, `ALERT_KINDS`, and the rules' comment.
- **Modify:** `supabase/partner-status/alert-cases.json`: five cases out, 18 in.
- **Modify:** `supabase/tests/partner_push.test.js`: `homeArrival`'s time, and two new tests.
- **Modify:** `supabase/partner-api.md`, `supabase/partner-status/README.md` and `supabase/tests/README.md`.
- **Modify (Task 7, in `~/Dev/Crewluve Website`):** the spec's §15 and status line, and this plan.

---

### Task 0: The worktree

**Files:** none.

- [x] **Step 1: Check the release line**

Run:

```bash
git -C ~/Dev/Duty status --short && git -C ~/Dev/Duty branch --show-current && git -C ~/Dev/Duty rev-parse --short HEAD origin/feature/supabase-account-backend
```

Expected: `feature/supabase-account-backend`, then `94253777` twice. The status lists only the scheme files, `Duty.xcodeproj/xcshareddata/xcschemes/`. If the tip moved on, stop and ask.

- [x] **Step 2: Make the worktree, on a new branch**

Run:

```bash
git -C ~/Dev/Duty worktree add -b feature/trip-alerts ~/Dev/Duty-trip-alerts 94253777
```

Expected: `Preparing worktree (new branch 'feature/trip-alerts')`.

- [x] **Step 3: Copy the test packages and run the tests**

Run:

```bash
cp -R ~/Dev/Duty/supabase/tests/node_modules ~/Dev/Duty-trip-alerts/supabase/tests/ && cd ~/Dev/Duty-trip-alerts/supabase/tests && npm test
```

Expected: `ℹ tests 272`, `ℹ pass 272`, `ℹ fail 0`.

### Task 1: Which trip a home arrival belongs to

**Files:**
- Modify: `supabase/functions/partner-push/index.ts` (`homeArrival`, and `alertsFor`'s home arrival rule)
- Test: `supabase/tests/partner_push.test.js`

- [x] **Step 1: Write the failing tests**

`homeArrival`'s tests read its time now, and a new test says which trips each arrival belongs to.

In `supabase/tests/partner_push.test.js`, replace:

```js
  test("the home arrival: from the legs of the block covering the moment, or else the next, else the summary's", () => {
    const H = 3600
    const leg = (id, start, end, to, type = 'flight', delayMinutes = null) => ({ id, type, startTime: start, endTime: end, arrivalAirport: to, delayMinutes })
    const summary = (tripLegs) => ({ homeAirportCode: 'ATL', homeArrivalTime: 777, tripLegs })
    // One block: the latest leg home that hasn't ended, its delay included, the airport in any case.
    const block = [leg('out', 0, 2 * H, 'SDF'), leg('home', 3 * H, 4 * H, 'atl', 'drive'), leg('home again', 5 * H, 6 * H, 'ATL', 'event', 30)]
    assert.equal(homeArrival(summary(block), H), 6 * H + 30 * 60)
    assert.equal(homeArrival(summary(block.slice(0, 2)), 4 * H - 1), 4 * H)
    assert.equal(homeArrival(summary(block.slice(0, 2)), 4 * H), 777, 'a leg home that has ended counts no more')
    // Before a block starts, the next block. A leg over 24 hours after the one before starts a block of its own.
    const nextTrip = leg('next trip', 31 * H, 32 * H, 'ATL')
    assert.equal(homeArrival(summary([...block, nextTrip]), -H), 6 * H + 30 * 60)
    assert.equal(homeArrival(summary([...block, nextTrip]), 7 * H), 32 * H)
    // A block runs on while each leg starts within 24 hours of the one before.
    assert.equal(homeArrival(summary([leg('out', 0, 2 * H, 'SDF'), leg('home', 22 * H, 23 * H, 'ATL')]), H), 23 * H)
    // In the block covering the moment, a leg home that has ended counts no more, and a late last leg keeps it covering.
    assert.equal(homeArrival(summary([leg('home', 0, H, 'ATL'), leg('out', 2 * H, 3 * H, 'SDF')]), 1.5 * H), 777)
    assert.equal(homeArrival(summary([leg('late home', 0, 2 * H, 'ATL', 'flight', 30)]), 2 * H + 600), 2.5 * H)
    // A turn doesn't take the pilot home, and without a home airport the legs aren't read.
    assert.equal(homeArrival(summary([leg('turn', 0, H, 'ATL', 'turn')]), 0), 777)
    assert.equal(homeArrival({ ...summary(block), homeAirportCode: '' }, 0), 777)
    assert.equal(homeArrival({ homeAirportCode: 'ATL' }, 0), null)
  })
```

with:

```js
  test("the home arrival: from the legs of the block covering the moment, or else the next, else the summary's", () => {
    const H = 3600
    const leg = (id, start, end, to, type = 'flight', delayMinutes = null) => ({ id, type, startTime: start, endTime: end, arrivalAirport: to, delayMinutes })
    const summary = (tripLegs) => ({ homeAirportCode: 'ATL', homeArrivalTime: 777, tripLegs })
    // One block: the latest leg home that hasn't ended, its delay included, the airport in any case.
    const block = [leg('out', 0, 2 * H, 'SDF'), leg('home', 3 * H, 4 * H, 'atl', 'drive'), leg('home again', 5 * H, 6 * H, 'ATL', 'event', 30)]
    assert.equal(homeArrival(summary(block), H)?.time, 6 * H + 30 * 60)
    assert.equal(homeArrival(summary(block.slice(0, 2)), 4 * H - 1)?.time, 4 * H)
    assert.equal(homeArrival(summary(block.slice(0, 2)), 4 * H)?.time, 777, 'a leg home that has ended counts no more')
    // Before a block starts, the next block. A leg over 24 hours after the one before starts a block of its own.
    const nextTrip = leg('next trip', 31 * H, 32 * H, 'ATL')
    assert.equal(homeArrival(summary([...block, nextTrip]), -H)?.time, 6 * H + 30 * 60)
    assert.equal(homeArrival(summary([...block, nextTrip]), 7 * H)?.time, 32 * H)
    // A block runs on while each leg starts within 24 hours of the one before.
    assert.equal(homeArrival(summary([leg('out', 0, 2 * H, 'SDF'), leg('home', 22 * H, 23 * H, 'ATL')]), H)?.time, 23 * H)
    // In the block covering the moment, a leg home that has ended counts no more, and a late last leg keeps it covering.
    assert.equal(homeArrival(summary([leg('home', 0, H, 'ATL'), leg('out', 2 * H, 3 * H, 'SDF')]), 1.5 * H)?.time, 777)
    assert.equal(homeArrival(summary([leg('late home', 0, 2 * H, 'ATL', 'flight', 30)]), 2 * H + 600)?.time, 2.5 * H)
    // A turn doesn't take the pilot home, and without a home airport the legs aren't read.
    assert.equal(homeArrival(summary([leg('turn', 0, H, 'ATL', 'turn')]), 0)?.time, 777)
    assert.equal(homeArrival({ ...summary(block), homeAirportCode: '' }, 0)?.time, 777)
    assert.equal(homeArrival({ homeAirportCode: 'ATL' }, 0), null)
  })

  test("a home arrival belongs to the trips of its block, or to the trip under way for the summary's own", () => {
    const H = 3600
    const leg = (id, tripId, start, end, to) => ({ id, tripId, type: 'flight', startTime: start, endTime: end, arrivalAirport: to })
    const summary = (tripLegs, currentTripId = 'T1') => ({ homeAirportCode: 'ATL', homeArrivalTime: 777, currentTripId, tripLegs })
    const block = [leg('out', 'T1', 0, 2 * H, 'SDF'), leg('commute', null, 3 * H, 4 * H, 'ATL')]
    assert.deepEqual(homeArrival(summary(block), H), { time: 4 * H, trips: ['T1'] })
    assert.deepEqual(homeArrival(summary([leg('commute', null, 3 * H, 4 * H, 'ATL')]), H), { time: 4 * H, trips: [] })
    assert.deepEqual(homeArrival(summary([]), 0), { time: 777, trips: ['T1'] })
    assert.deepEqual(homeArrival(summary(null, null), 0), { time: 777, trips: [] })
  })
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
cd ~/Dev/Duty-trip-alerts/supabase/tests && node --no-maglev --test partner_push.test.js partner_status.test.js
```

Expected: `ℹ tests 84`, `ℹ pass 82`, `ℹ fail 2`: the home arrival's test, and the new one.

- [x] **Step 3: Return the trips with the time, and compare arrivals within a trip**

In `supabase/functions/partner-push/index.ts`, replace:

```ts
/**
 * When the pilot gets home, as Crewluve works it out at `at` (TripStateResolver.resolveHomeArrival, else the summary's
 * homeArrivalTime): in the trip block covering `at`, or else the next one, the latest delay-shifted end of a flight,
 * event or drive that arrives home and hasn't ended. A block is a run of legs no more than 24 hours apart. Crewluve
 * first ends a layover, home or base leg where a flight inside it starts (adjustLayoversForOverlappingFlights). That
 * can't change this answer, so it isn't copied: such a leg is never counted, never ends its block, and the leg after
 * it starts before it ends, trimmed or not.
 */
export function homeArrival(view: View, at: number): number | null {
```

with:

```ts
/**
 * When the pilot gets home, as Crewluve works it out at `at` (TripStateResolver.resolveHomeArrival, else the summary's
 * homeArrivalTime): in the trip block covering `at`, or else the next one, the latest delay-shifted end of a flight,
 * event or drive that arrives home and hasn't ended. A block is a run of legs no more than 24 hours apart. Crewluve
 * first ends a layover, home or base leg where a flight inside it starts (adjustLayoversForOverlappingFlights). That
 * can't change this answer, so it isn't copied: such a leg is never counted, never ends its block, and the leg after
 * it starts before it ends, trimmed or not.
 *
 * With it come the trips it belongs to (alert pushes spec §15.3): the trip ids among its block's legs, or, for the
 * summary's homeArrivalTime, currentTripId's. Two home arrivals are compared only when they share one.
 */
export function homeArrival(view: View, at: number): { time: number; trips: string[] } | null {
```

In `supabase/functions/partner-push/index.ts`, replace:

```ts
      .map(effectiveEnd)
    if (ends.length > 0) return Math.max(...ends)
  }
  return view.homeArrivalTime ?? null
}
```

with:

```ts
      .map(effectiveEnd)
    if (ends.length > 0) return { time: Math.max(...ends), trips: [...new Set(block!.flatMap(tripIdOf))] }
  }
  if (view.homeArrivalTime == null) return null
  return { time: view.homeArrivalTime, trips: typeof view.currentTripId === 'string' ? [view.currentTripId] : [] }
}

/** A leg's trip id, or none for a leg that belongs to no trip: a jumpseat, an event or a commute. */
const tripIdOf = (leg: Leg): string[] => (typeof leg.tripId === 'string' ? [leg.tripId] : [])
```

In `supabase/functions/partner-push/index.ts`, replace:

```ts
  const homeBefore = homeArrival(before, beforeAt)
  const homeAfter = homeArrival(after, afterAt)
  if (homeBefore != null && homeAfter != null && Math.abs(homeAfter - homeBefore) > 15 * 60) {
    add(homeAfter > homeBefore ? 'home-later' : 'home-earlier')
  }
```

with:

```ts
  const homeBefore = homeArrival(before, beforeAt)
  const homeAfter = homeArrival(after, afterAt)
  if (
    homeBefore != null &&
    homeAfter != null &&
    homeBefore.trips.some((trip) => homeAfter.trips.includes(trip)) &&
    Math.abs(homeAfter.time - homeBefore.time) > 15 * 60
  ) {
    add(homeAfter.time > homeBefore.time ? 'home-later' : 'home-earlier')
  }
```

- [x] **Step 4: Run them to see them pass**

Run:

```bash
cd ~/Dev/Duty-trip-alerts/supabase/tests && node --no-maglev --test partner_push.test.js partner_status.test.js
```

Expected: `ℹ tests 84`, `ℹ pass 84`, `ℹ fail 0`.

- [x] **Step 5: Commit**

```bash
cd ~/Dev/Duty-trip-alerts && git add supabase/functions/partner-push/index.ts supabase/tests/partner_push.test.js && git commit -q -m "feat(partner-links): a home arrival says which trip it belongs to, and arrivals are compared within a trip (alert pushes spec §15)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

### Task 2: Trips added and taken off

**Files:**
- Modify: `supabase/functions/partner-push/index.ts` (the trip helpers)
- Test: `supabase/tests/partner_push.test.js`

- [x] **Step 1: Write the failing test**

In `supabase/tests/partner_push.test.js`, replace:

```js
  signingToken,
} from '../functions/partner-push/index.ts'
```

with:

```js
  signingToken,
  tripAt,
  tripsMissing,
} from '../functions/partner-push/index.ts'
```

In `supabase/tests/partner_push.test.js`, replace:

```js
    assert.deepEqual(homeArrival(summary(null, null), 0), { time: 777, trips: [] })
  })
```

with:

```js
    assert.deepEqual(homeArrival(summary(null, null), 0), { time: 777, trips: [] })
  })

  test('trips added or taken off: matched by span, only those not over, and never from a summary with no legs', () => {
    const leg = (tripId, start, end) => ({ id: `${tripId}-${start}`, tripId, type: 'flight', startTime: start, endTime: end })
    const of = (...tripLegs) => ({ tripLegs })
    const t1 = [leg('T1', 100, 200), leg('T1', 300, 400)]
    assert.equal(tripsMissing(of(...t1), of(leg('T2', 500, 600)), 0), 1, 'T1 has no part in the other')
    assert.equal(tripsMissing(of(...t1), of(leg('T9', 150, 160)), 0), 0, 'a leg of any trip in its span keeps it')
    assert.equal(tripsMissing(of(...t1), of(leg('T9', 400, 500)), 0), 1, 'spans that only touch do not overlap')
    assert.equal(tripsMissing(of(...t1), of(leg(null, 150, 160)), 0), 1, 'a leg of no trip keeps nothing')
    assert.equal(tripsMissing(of(...t1), of(leg('T2', 500, 600)), 400), 0, 'a trip over by then is not missing')
    assert.equal(tripsMissing(of(...t1, leg('T3', 700, 800)), of(leg('T2', 500, 600)), 0), 2)
    assert.equal(tripsMissing(of(leg('T1', 300, 400), leg('T1', 100, 200)), of(leg('T9', 150, 160)), 0), 0, 'legs in any order')
    assert.equal(tripsMissing(of(leg('T1', 300, 400), leg('T1', 100, 200)), of(leg('T9', 350, 360)), 0), 0)
    assert.equal(tripsMissing(of(...t1), of(), 0), 0, 'no legs after: nothing is taken off')
    assert.equal(tripsMissing(of(), of(...t1), 0), 0, 'no legs before: nothing is added')
    assert.equal(tripsMissing({ tripLegs: null }, of(...t1), 0), 0)
    assert.equal(tripAt(of(...t1), 100), 'T1')
    assert.equal(tripAt(of(...t1), 250), 'T1', 'between its legs, within its span')
    assert.equal(tripAt(of(...t1), 400), 'T1')
    assert.equal(tripAt(of(...t1), 401), null)
    assert.equal(tripAt(of(leg(null, 100, 200)), 150), null)
  })
```

- [x] **Step 2: Run it to see it fail**

Run:

```bash
cd ~/Dev/Duty-trip-alerts/supabase/tests && node --no-maglev --test partner_push.test.js partner_status.test.js
```

Expected: `does not provide an export named 'tripAt'`, and `ℹ fail 1`, since the rules' test file can't load.

- [x] **Step 3: Read the trips from the legs**

In `supabase/functions/partner-push/index.ts`, replace:

```ts
/** A leg's trip id, or none for a leg that belongs to no trip: a jumpseat, an event or a commute. */
const tripIdOf = (leg: Leg): string[] => (typeof leg.tripId === 'string' ? [leg.tripId] : [])
```

with:

```ts
/** A leg's trip id, or none for a leg that belongs to no trip: a jumpseat, an event or a commute. */
const tripIdOf = (leg: Leg): string[] => (typeof leg.tripId === 'string' ? [leg.tripId] : [])

/** A stretch of time, in seconds since 1970. */
type Span = { start: number; end: number }

/** Whether two spans overlap: each starts before the other ends. */
const overlap = (a: Span, b: Span) => a.start < b.end && b.start < a.end

/** The summary's trips, by id, each with its span: from its first leg's start to its last leg's end. */
function tripsOf(view: View): Map<string, Span> {
  const trips = new Map<string, Span>()
  for (const leg of legsOf(view)) {
    for (const id of tripIdOf(leg)) {
      const span = trips.get(id)
      trips.set(id, {
        start: Math.min(span?.start ?? leg.startTime, leg.startTime),
        end: Math.max(span?.end ?? leg.endTime, leg.endTime),
      })
    }
  }
  return trips
}

/**
 * How many of `from`'s trips `to` has no part of (alert pushes spec §15.3): trips that haven't ended at `at`, where no
 * leg of a trip in `to` overlaps their span. Matching by span, a trip merged on import, imported again, or with its
 * flights moved is still there. When `to` has no legs, none: a missing list never reads as every trip gone. (When
 * `from` has none, it has no trips.)
 */
export function tripsMissing(from: View, to: View, at: number): number {
  if (legsOf(to).length === 0) return 0
  const legs = legsOf(to).flatMap((leg) => tripIdOf(leg).map(() => ({ start: leg.startTime, end: leg.endTime })))
  return [...tripsOf(from).values()].filter((trip) => trip.end > at && !legs.some((leg) => overlap(trip, leg))).length
}

/** The trip a departure belongs to (alert pushes spec §15.3): the one whose span contains it, or none. */
export function tripAt(view: View, time: number): string | null {
  for (const [id, span] of tripsOf(view)) if (span.start <= time && time <= span.end) return id
  return null
}
```

- [x] **Step 4: Run it to see it pass**

Run:

```bash
cd ~/Dev/Duty-trip-alerts/supabase/tests && node --no-maglev --test partner_push.test.js partner_status.test.js
```

Expected: `ℹ tests 85`, `ℹ pass 85`, `ℹ fail 0`.

- [x] **Step 5: Commit**

```bash
cd ~/Dev/Duty-trip-alerts && git add supabase/functions/partner-push/index.ts supabase/tests/partner_push.test.js && git commit -q -m "feat(partner-links): the trips one summary has that another has no part of, matched by span, and the trip a departure belongs to (alert pushes spec §15)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

### Task 3: The shared cases, and the trip alerts they ask for

**Files:**
- Modify: `supabase/partner-status/alert-cases.json` (five cases out, 18 in)
- Modify: `supabase/functions/partner-push/index.ts` (`ALERT_KINDS`, and `alertsFor`'s schedule rules)

- [x] **Step 1: Change the cases**

The five cases that read `currentTripId` as a new or cancelled trip go. In their place come the cases of §15.3:
- trips added and taken off, one or several;
- a trip ending, with and without another scheduled;
- a trip starting;
- a merge, a trade and retimed flights;
- the safety net;
- trips over by the change;
- a trip cut short;
- a departure no trip holds;
- a trip added before, or taken off as, the next departure.

In `supabase/partner-status/alert-cases.json`, replace:

```json
    {
      "name": "A new trip",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "displayStatus": "Home", "currentTripId": null, "tripTotalDays": null },
      "after": { "lastUpdated": 1792605660, "displayStatus": "Home", "currentTripId": "Z55130", "tripTotalDays": 4 },
      "alerts": [{ "kind": "new-trip", "sound": true, "title": "Alex", "body": "Has a new 4-day trip" }]
    },
    {
      "name": "A new trip whose length isn't known",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "displayStatus": "Home", "currentTripId": null, "tripTotalDays": null },
      "after": { "lastUpdated": 1792605660, "displayStatus": "Home", "currentTripId": "Z55130", "tripTotalDays": null },
      "alerts": [{ "kind": "new-trip", "sound": true, "title": "Alex", "body": "Has a new trip" }]
    },
    {
      "name": "A new trip, with the last trip's length still set, isn't also a longer trip",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "displayStatus": "Home", "currentTripId": null, "tripTotalDays": 3 },
      "after": { "lastUpdated": 1792605660, "displayStatus": "Home", "currentTripId": "Z55130", "tripTotalDays": 4 },
      "alerts": [{ "kind": "new-trip", "sound": true, "title": "Alex", "body": "Has a new 4-day trip" }]
    },
    {
      "name": "A cancelled trip",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {},
      "after": { "lastUpdated": 1792605660, "currentTripId": null, "tripTotalDays": null },
      "alerts": [{ "kind": "trip-cancelled", "sound": true, "title": "Alex", "body": "Trip was cancelled" }]
    },
    {
      "name": "A cancelled trip with a length left isn't also a longer one",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {},
      "after": { "lastUpdated": 1792605660, "currentTripId": null, "tripTotalDays": 3 },
      "alerts": [{ "kind": "trip-cancelled", "sound": true, "title": "Alex", "body": "Trip was cancelled" }]
    },
```

with:

```json
    {
      "name": "A trip added to the schedule",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "alerts": [{ "kind": "new-trip", "sound": true, "title": "Alex", "body": "Has a new trip" }]
    },
    {
      "name": "Several trips added at once make one alert",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null },
          { "id": "Z55140-leg-1", "tripId": "Z55140", "type": "flight", "startTime": 1793300000, "endTime": 1793315000, "departureAirport": "SDF", "arrivalAirport": "ANC", "flightNumber": "UPS2200", "delayMinutes": null },
          { "id": "Z55140-leg-2", "tripId": "Z55140", "type": "flight", "startTime": 1793350000, "endTime": 1793365000, "departureAirport": "ANC", "arrivalAirport": "SDF", "flightNumber": "UPS2201", "delayMinutes": null }
        ]
      },
      "alerts": [{ "kind": "new-trips", "sound": true, "title": "Alex", "body": "Has new trips" }]
    },
    {
      "name": "A trip still to come, taken off the schedule",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "alerts": [{ "kind": "trip-cancelled", "sound": true, "title": "Alex", "body": "Trip was cancelled" }]
    },
    {
      "name": "Several trips taken off at once make one alert",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null },
          { "id": "Z55140-leg-1", "tripId": "Z55140", "type": "flight", "startTime": 1793300000, "endTime": 1793315000, "departureAirport": "SDF", "arrivalAirport": "ANC", "flightNumber": "UPS2200", "delayMinutes": null },
          { "id": "Z55140-leg-2", "tripId": "Z55140", "type": "flight", "startTime": 1793350000, "endTime": 1793365000, "departureAirport": "ANC", "arrivalAirport": "SDF", "flightNumber": "UPS2201", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "alerts": [{ "kind": "trips-cancelled", "sound": true, "title": "Alex", "body": "Trips were cancelled" }]
    },
    {
      "name": "The trip under way, taken off the schedule",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "tripLegs": [
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ],
        "currentTripId": null,
        "tripTotalDays": null
      },
      "alerts": [{ "kind": "trip-cancelled", "sound": true, "title": "Alex", "body": "Trip was cancelled" }]
    },
    {
      "name": "A trip ending alerts nothing",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792672000,
      "afterAt": 1792675000,
      "before": {
        "lastUpdated": 1792671900,
        "displayStatus": "Commuting Home",
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792674900,
        "displayStatus": "Commuting Home",
        "currentTripId": null,
        "tripTotalDays": null,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "alerts": []
    },
    {
      "name": "A trip ending with another scheduled says only that the pilot is home",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792672000,
      "afterAt": 1792675000,
      "before": {
        "lastUpdated": 1792671900,
        "displayStatus": "Commuting Home",
        "nextDepartureTime": 1792935000,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792674900,
        "currentTripId": null,
        "tripTotalDays": null,
        "displayStatus": "Home",
        "nextDepartureTime": 1792935000,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "alerts": [{ "kind": "home", "sound": true, "title": "Alex", "body": "is home!" }]
    },
    {
      "name": "A trip starting says nothing new, even with the last trip's length still set",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792924000,
      "afterAt": 1792925500,
      "before": {
        "lastUpdated": 1792923900,
        "currentTripId": null,
        "tripTotalDays": 3,
        "displayStatus": "Home",
        "nextDepartureTime": 1792935000,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792925400,
        "displayStatus": "Commuting",
        "currentTripId": "Z55130",
        "tripTotalDays": 2,
        "nextDepartureTime": 1792935000,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "alerts": []
    },
    {
      "name": "A split trip merged on import is neither added nor taken off",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130A-leg-1", "tripId": "Z55130A", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130B-leg-1", "tripId": "Z55130B", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "alerts": []
    },
    {
      "name": "A trip traded for another on the same days is neither added nor taken off",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55131-leg-1", "tripId": "Z55131", "type": "flight", "startTime": 1792936000, "endTime": 1792946000, "departureAirport": "SDF", "arrivalAirport": "MCO", "flightNumber": "UPS2110", "delayMinutes": null },
          { "id": "Z55131-leg-2", "tripId": "Z55131", "type": "flight", "startTime": 1792989000, "endTime": 1792999000, "departureAirport": "MCO", "arrivalAirport": "SDF", "flightNumber": "UPS2111", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "alerts": []
    },
    {
      "name": "Flights moved 10 minutes are neither added nor taken off",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935600, "endTime": 1792945600, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990600, "endTime": 1793000600, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "alerts": []
    },
    {
      "name": "A summary with no legs takes no trip off the schedule",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "after": { "lastUpdated": 1792605660, "tripLegs": null },
      "alerts": []
    },
    {
      "name": "A trip over by the change, gone from the summary, alerts nothing",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "tripLegs": [
          { "id": "Z55000-leg-1", "tripId": "Z55000", "type": "flight", "startTime": 1792590000, "endTime": 1792605630, "departureAirport": "SDF", "arrivalAirport": "BOS", "flightNumber": "UPS2000", "delayMinutes": null },
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "alerts": []
    },
    {
      "name": "A trip over by the change, added to the log, alerts nothing",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "tripLegs": [
          { "id": "Z55001-leg-1", "tripId": "Z55001", "type": "flight", "startTime": 1792590000, "endTime": 1792605630, "departureAirport": "SDF", "arrivalAirport": "DEN", "flightNumber": "UPS2001", "delayMinutes": null },
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "alerts": []
    },
    {
      "name": "The trip under way, cut short, is not cancelled",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "alerts": []
    },
    {
      "name": "A departure no trip holds is never compared",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "nextDepartureTime": 1792700000,
        "tripLegs": [
          { "id": "jumpseat-5", "tripId": null, "type": "flight", "startTime": 1792700000, "endTime": 1792703600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL5555", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "nextDepartureTime": 1792710000,
        "tripLegs": [
          { "id": "jumpseat-5", "tripId": null, "type": "flight", "startTime": 1792710000, "endTime": 1792713600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL5555", "delayMinutes": null }
        ]
      },
      "alerts": []
    },
    {
      "name": "A trip added before the next departure says only that it's new",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792700000,
      "afterAt": 1792700060,
      "before": {
        "lastUpdated": 1792699900,
        "currentTripId": null,
        "tripTotalDays": null,
        "displayStatus": "Home",
        "nextDepartureTime": 1792935000,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792700000,
        "currentTripId": null,
        "tripTotalDays": null,
        "displayStatus": "Home",
        "nextDepartureTime": 1792760000,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "Z55125-leg-1", "tripId": "Z55125", "type": "flight", "startTime": 1792760000, "endTime": 1792766000, "departureAirport": "SDF", "arrivalAirport": "PHL", "flightNumber": "UPS2050", "delayMinutes": null },
          { "id": "Z55125-leg-2", "tripId": "Z55125", "type": "flight", "startTime": 1792790000, "endTime": 1792796000, "departureAirport": "PHL", "arrivalAirport": "SDF", "flightNumber": "UPS2051", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "alerts": [{ "kind": "new-trip", "sound": true, "title": "Alex", "body": "Has a new trip" }]
    },
    {
      "name": "The next trip taken off says only that it was cancelled",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792700000,
      "afterAt": 1792700060,
      "before": {
        "lastUpdated": 1792699900,
        "currentTripId": null,
        "tripTotalDays": null,
        "displayStatus": "Home",
        "nextDepartureTime": 1792760000,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "Z55125-leg-1", "tripId": "Z55125", "type": "flight", "startTime": 1792760000, "endTime": 1792766000, "departureAirport": "SDF", "arrivalAirport": "PHL", "flightNumber": "UPS2050", "delayMinutes": null },
          { "id": "Z55125-leg-2", "tripId": "Z55125", "type": "flight", "startTime": 1792790000, "endTime": 1792796000, "departureAirport": "PHL", "arrivalAirport": "SDF", "flightNumber": "UPS2051", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792700000,
        "currentTripId": null,
        "tripTotalDays": null,
        "displayStatus": "Home",
        "nextDepartureTime": 1792935000,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2961", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null },
          { "id": "jumpseat-2", "tripId": null, "type": "flight", "startTime": 1792925000, "endTime": 1792928600, "departureAirport": "ATL", "arrivalAirport": "SDF", "flightNumber": "DL2345", "delayMinutes": null },
          { "id": "Z55130-leg-1", "tripId": "Z55130", "type": "flight", "startTime": 1792935000, "endTime": 1792945000, "departureAirport": "SDF", "arrivalAirport": "MIA", "flightNumber": "UPS2100", "delayMinutes": null },
          { "id": "Z55130-leg-2", "tripId": "Z55130", "type": "flight", "startTime": 1792990000, "endTime": 1793000000, "departureAirport": "MIA", "arrivalAirport": "SDF", "flightNumber": "UPS2101", "delayMinutes": null },
          { "id": "jumpseat-3", "tripId": null, "type": "flight", "startTime": 1793003000, "endTime": 1793006600, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL3456", "delayMinutes": null }
        ]
      },
      "alerts": [{ "kind": "trip-cancelled", "sound": true, "title": "Alex", "body": "Trip was cancelled" }]
    },
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
cd ~/Dev/Duty-trip-alerts/supabase/tests && node --no-maglev --test partner_push.test.js partner_status.test.js
```

Expected: `ℹ pass 82`, `ℹ fail 3`: every shared case's alerts, every kind having a case, and every case as the pushes it sends.

- [x] **Step 3: The kinds, and the rules**

In `supabase/functions/partner-push/index.ts`, replace:

```ts
export const ALERT_KINDS = [
  'new-trip',
  'trip-cancelled',
```

with:

```ts
export const ALERT_KINDS = [
  'new-trip',
  'new-trips',
  'trip-cancelled',
  'trips-cancelled',
```

In `supabase/functions/partner-push/index.ts`, replace:

```ts
  // The schedule (evaluateScheduleChanges).
  const hadTrip = before.currentTripId != null
  const hasTrip = after.currentTripId != null
  if (!hadTrip && hasTrip) add('new-trip')
  if (hadTrip && !hasTrip) add('trip-cancelled')
```

with:

```ts
  // The schedule (evaluateScheduleChanges, as alert pushes spec §15 changed it): a trip added or taken off, by its
  // legs, and the way home or the departure moving within the same trip.
  const hadTrip = before.currentTripId != null
  const hasTrip = after.currentTripId != null
  const added = tripsMissing(after, before, after.lastUpdated)
  const removed = tripsMissing(before, after, after.lastUpdated)
  if (added > 0) add(added > 1 ? 'new-trips' : 'new-trip')
  if (removed > 0) add(removed > 1 ? 'trips-cancelled' : 'trip-cancelled')
```

In `supabase/functions/partner-push/index.ts`, replace:

```ts
    departureBefore != null &&
    departureAfter != null &&
    Math.abs(departureAfter - departureBefore) > 15 * 60
```

with:

```ts
    departureBefore != null &&
    departureAfter != null &&
    tripAt(before, departureBefore) !== null &&
    tripAt(before, departureBefore) === tripAt(after, departureAfter) &&
    Math.abs(departureAfter - departureBefore) > 15 * 60
```

- [x] **Step 4: Run them to see them pass**

Run:

```bash
cd ~/Dev/Duty-trip-alerts/supabase/tests && node --no-maglev --test partner_push.test.js partner_status.test.js
```

Expected: `ℹ pass 85`, `ℹ fail 0`.

- [x] **Step 5: Commit**

```bash
cd ~/Dev/Duty-trip-alerts && git add supabase/partner-status/alert-cases.json supabase/functions/partner-push/index.ts && git commit -q -m "feat(partner-links): trip alerts that say what happened: cancelled only when a trip is taken off, new when one is added, and departures within a trip (alert pushes spec §15)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

### Task 4: The docs

**Files:** Modify `supabase/functions/partner-push/index.ts` (the rules' comment), `supabase/partner-api.md`, `supabase/partner-status/README.md` and `supabase/tests/README.md`.

- [x] **Step 1: partner-push's rules say whose they are**

In `supabase/functions/partner-push/index.ts`, replace:

```ts
// The alerts (alert pushes spec §5.3): Crewluve's StatusChangeNotifier, copied for one partner's view of the summary.
// A view is what partner_view gives that partner: CrewLu's summary (supabase/partner-status/schema.json), trimmed to
// their own entries. Times are seconds since 1970, as the summary writes them. Both copies are checked against
// supabase/partner-status/alert-cases.json.
```

with:

```ts
// The alerts (alert pushes spec §5.3): Crewluve's StatusChangeNotifier, copied for one partner's view of the summary,
// with the trip rules of alert pushes spec §15, which Crewluve has from 1.3. A view is what partner_view gives that
// partner: CrewLu's summary (supabase/partner-status/schema.json), trimmed to their own entries. Times are seconds
// since 1970, as the summary writes them. Both copies are checked against supabase/partner-status/alert-cases.json.
```

- [x] **Step 2: The partner door names the trip rules and the two new kinds**

In `supabase/partner-api.md`, replace:

```markdown
- **A Crewluve that registered `p_alerts`** gets one alert push per alert. CrewLu Cloud works out the alerts with Crewluve's own rules, from what that partner saw at the last change and sees now; `partner-status/alert-cases.json` holds the cases both sides are checked with. Like Crewluve, it passes over a summary that isn't newer than the last one, or that's missing what Crewluve needs to read it: the change after it is compared with the one before. A summary dated more than an hour ahead of CrewLu Cloud's clock stops counting as newer, so a phone whose clock ran ahead can't hold back the ones after it.
```

with:

```markdown
- **A Crewluve that registered `p_alerts`** gets one alert push per alert. CrewLu Cloud works out the alerts with Crewluve's own rules, with the alert pushes spec's §15 for trips, from what that partner saw at the last change and sees now; `partner-status/alert-cases.json` holds the cases both sides are checked with. `new-trips` and `trips-cancelled` are the kinds for several trips at once. Like Crewluve, it passes over a summary that isn't newer than the last one, or that's missing what Crewluve needs to read it: the change after it is compared with the one before. A summary dated more than an hour ahead of CrewLu Cloud's clock stops counting as newer, so a phone whose clock ran ahead can't hold back the ones after it.
```

- [x] **Step 3: The cases' README says which rules they hold**

In `supabase/partner-status/README.md`, replace:

```markdown
Crewluve's `StatusChangeNotifier` makes of it: each one's kind, whether it plays a sound, and its words, with times in
the file's `timeZone`. The summaries are cut down to the fields the alerts read, so they don't follow the schema's
list of required fields; every field they do set is one of the schema's.
```

with:

```markdown
Crewluve's `StatusChangeNotifier` makes of it, with the spec's §15 for trips (Crewluve 1.3): each one's kind, whether
it plays a sound, and its words, with times in the file's `timeZone`. The summaries are cut down to the fields the
alerts read, so they don't follow the schema's list of required fields; every field they do set is one of the schema's.
```

- [x] **Step 4: The tests' count**

In `supabase/tests/README.md`, replace:

```markdown
272 tests run in about 40 seconds, each test file in its own process. `npm test` runs `node --no-maglev --test`. Without `--no-maglev`, Node 23.11 sometimes deadlocks under the test runner:
```

with:

```markdown
274 tests run in about 40 seconds, each test file in its own process. `npm test` runs `node --no-maglev --test`. Without `--no-maglev`, Node 23.11 sometimes deadlocks under the test runner:
```

- [x] **Step 5: Run every test, and check the types**

Run:

```bash
cd ~/Dev/Duty-trip-alerts/supabase/tests && npm test && ~/Dev/"Crewluve Website"/node_modules/.bin/tsc --noEmit --strict --noUnusedLocals --noUnusedParameters --target es2022 --lib es2022,dom --skipLibCheck ../functions/partner-push/index.ts && echo "types ok"
```

Expected: `ℹ tests 274`, `ℹ pass 274`, `ℹ fail 0`, then `types ok`.

- [x] **Step 6: Commit**

```bash
cd ~/Dev/Duty-trip-alerts && git add supabase/functions/partner-push/index.ts supabase/partner-api.md supabase/partner-status/README.md supabase/tests/README.md && git commit -q -m "docs(partner-links): partner-push's trip rules, the two plural kinds, and the tests' count (alert pushes spec §15)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

### Task 5: A review

**Files:** whatever the review finds.

- [x] **Step 1: Ask for a review**

Use superpowers:requesting-code-review with a read-only reviewer. It reads:
- `git -C ~/Dev/Duty-trip-alerts diff 94253777..feature/trip-alerts`;
- spec §15 and this plan's decisions;
- Crewluve's rules, for what plan 2b will copy: `~/Dev/Crewluv/Crewluv/Services/StatusChangeNotifier.swift` and `TripStateResolver.swift`;
- CrewLu's summary writer, for what real summaries hold: `~/Dev/Duty/Duty/Utils/PartnerBeacon/PartnerStatusGenerator.swift`.

It may run `npm test` in `~/Dev/Duty-trip-alerts/supabase/tests`; nothing else. It changes nothing and contacts nothing. State facts neutrally, and don't tell it what not to flag.

- [x] **Step 2: Act on it**

For each finding, fix it test-first, run `npm test` again, and commit with the exact paths. A change to the rules changes `alert-cases.json` first. Note each fix in this plan's Execution notes.

### Task 6: The user's setup

**Files:** none. Crewlu Cloud changes here, by the user's hands, and only partner-push: there's no SQL.

- [x] **Step 1: Ask before going live**

Ask the user one question: deploy partner-push's new file now? It changes nothing anyone sees until Crewluve 1.3. If not now, stop: Tasks 7 and 8 wait too.

- [x] **Step 2: partner-push's new file on the clipboard**

Run it with the sandbox off, since from inside it `pbcopy` doesn't reach the user's clipboard. Plan 1 found that one copy can come up empty, so read it back:

Run:

```bash
F=~/Dev/Duty-trip-alerts/supabase/functions/partner-push/index.ts; LANG=en_US.UTF-8 pbcopy < "$F"; LANG=en_US.UTF-8 pbpaste | cmp - "$F" && echo "clipboard holds index.ts"
```

Expected: `clipboard holds index.ts`.

Then send the user these steps:

1. In the CrewLu Cloud project, open **Edge Functions**, then **partner-push**, then its **Code** tab.
2. Click in the editor, select everything (⌘A), and paste (⌘V).
3. Click **Deploy updates**, and wait for the success message.
4. On its **Settings** tab, check that **Verify JWT with legacy secret** is still off.

- [x] **Step 3: Check what's deployed**

With the user's yes, Claude reads it through its read-only connection:
- `list_edge_functions` shows partner-push ACTIVE, one version on from before, with `verify_jwt` false;
- `get_edge_function` shows the new file: `tripsMissing`, `tripAt`, and `'trips-cancelled'` in `ALERT_KINDS`.

- [ ] **Step 4: The probe, and a real run**

1. The user runs `select private.partner_push_probe();` in the SQL Editor. Five seconds later, they or Claude, with a yes, read its answer: `select status_code, content from net._http_response where id = N;`. Expected: 200, with `BadDeviceToken` from both of Apple's services, as before.
2. The next time CrewLu writes a status, Claude reads that run's answer: `select status_code, content from net._http_response order by id desc limit 1;`. Expected: 200, with `alerts` 0, since no Crewluve shows alert pushes yet.

The Execution notes record the results, with no names, labels or tokens.

### Task 7: Record the decisions

**Files (in `~/Dev/Crewluve Website`):** modify `docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`, and this plan.

- [x] **Step 1: The spec's §15.3 takes this plan's decisions 1 and 2**

In `docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`, replace:

```markdown
Both sides apply these to one partner's view. The earlier summary's moment is its own `lastUpdated`, and the later one's moment is its own too, so every Crewluve and Crewlu Cloud reach the same answer.
```

with:

```markdown
Both sides apply these to one partner's view, at the later summary's own `lastUpdated`, so every Crewluve and Crewlu Cloud reach the same answer.
```

In `docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`, replace:

```markdown
- **Removed:** a trip in the earlier summary whose span hadn't ended at the earlier moment, where no trip leg in the later summary overlaps its span. Two spans overlap when each starts before the other ends.
```

with:

```markdown
- **Removed:** a trip in the earlier summary whose span hasn't ended at that moment, where no trip leg in the later summary overlaps its span. Two spans overlap when each starts before the other ends. A trip that's over by the change says nothing, even when it's gone.
```

In `docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`, replace:

```markdown
- **Added:** a trip in the later summary whose span hasn't ended at the later moment, where no trip leg in the earlier summary overlaps its span.
```

with:

```markdown
- **Added:** a trip in the later summary whose span hasn't ended at that moment, where no trip leg in the earlier summary overlaps its span.
```

In `docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`, replace:

```markdown
- **The same trip, for a departure:** a departure belongs to the `tripId` of the leg that starts at `nextDepartureTime`. Two departures are compared only when both are found and share it.
```

with:

```markdown
- **The same trip, for a departure:** a departure belongs to the trip whose span holds `nextDepartureTime`. Two departures are compared only when both are found and share it.
```

- [x] **Step 2: The spec's status line**

In `docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`, replace:

```markdown
On 2026-10-24 the user changed the trip alerts (§15), which plan 2 builds on both sides. Next: plan 2, Crewluve 1.3.
```

with:

```markdown
On 2026-10-24 the user changed the trip alerts (§15). Plan 2a, Crewlu Cloud's part, is built and set up (`docs/superpowers/plans/2026-10-24-partner-alert-pushes-2a-cloud-trips.md`). Next: plan 2b, Crewluve 1.3.
```

- [x] **Step 3: Tick this plan and commit**

```bash
cd ~/"Dev/Crewluve Website" && git add docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md docs/superpowers/plans/2026-10-24-partner-alert-pushes-2a-cloud-trips.md && git commit -q -m "Plan 2a of the alert pushes built: the trip alerts on Crewlu Cloud; spec §15 takes its decisions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit. Don't push.

### Task 8: Finish

**Files:** none.

- [ ] **Step 1: Ask how to merge**

Ask the user one question: merge `feature/trip-alerts` into `feature/supabase-account-backend` now? It changes only `supabase/`. If yes, and `~/Dev/Duty` is still on `feature/supabase-account-backend` with only the scheme files changed, run `git -C ~/Dev/Duty merge --ff-only feature/trip-alerts`. Then `cd ~/Dev/Duty/supabase/tests && npm test` should give Task 4's count. If the release line moved on, ask before making a merge commit instead.

- [ ] **Step 2: Remove the worktree**

Only once the branch is merged: `rm -rf ~/Dev/Duty-trip-alerts/supabase/tests/node_modules && git -C ~/Dev/Duty worktree remove ~/Dev/Duty-trip-alerts && git -C ~/Dev/Duty branch -d feature/trip-alerts`. If it's kept apart, keep the worktree.

- [ ] **Step 3: Push only with a fresh yes**

Ask separately before each push: `feature/supabase-account-backend` in `~/Dev/Duty`, and `main` in `~/Dev/Crewluve Website`.

---

## Execution notes

Filled in during the build: any place the code ends up different from the printed blocks, and why, and the setup's results.

Built on 2026-10-24 in `~/Dev/Duty-trip-alerts`, on `feature/trip-alerts`, inline, with a read-only reviewer for Task 5.

- **Task 0 Step 1:** `git rev-parse --short` refuses two names at once, so `HEAD` and `origin/feature/supabase-account-backend` were read one at a time: both `94253777`.
- **Tasks 1–4** went in as printed (`99249db8`, `c1faf6d2`, `e22a6a4e`, `dbd71d2b`), and each Run gave its expected result: 274 of 274, types clean, and cases equal to the copy plans 2b and 2c were checked with.
- **Task 2:** one assertion beyond the printed test pinned which trip `tripAt` picks where two spans touch. The review's second fix replaced it.
- **Task 5, the review:** nothing critical, four important findings and five minor.
  1. **The safety net looked only for a summary with no legs at all.** CrewLu can write one with commutes or events but no trips: when a trip fetch fails, when trips have no duty periods yet, or after a reset of its data, before the trips download again. Every trip would read as cancelled, then as new. **The user chose:** a summary with no trip legs adds and removes nothing.
  2. **The departure's trip rested on the order of the legs.** The TypeScript took the first trip in the legs, and plan 2b's Swift the smallest id. Now a departure belongs to every trip whose span holds it, and two departures are compared when they share one. A new case: one trip ending as the next begins.
  3. **The trip check compared every trip with every leg.** At the 1 MB cap that's about half a second a call, twice per partner device, against a run's two seconds of CPU for everyone's pushes. Now each trip takes one binary search, with the same answers (checked against the old definition on 20,000 random pairs): 15 ms for 40,000 legs, and a test holds it under a second.
  4. **"Trip extended" or "shortened" fired across two different trips,** as in Crewluve 1.2. **The user chose:** only while the same trip is under way, as §15.3 said.
  5. **The minor ones:**
     - clearer test labels;
     - three more cases: the safety net's other direction, the moment being the summary's own time, and the summary's home arrival across a trip change;
     - the cases' `about` and a test title name Crewluve 1.3;
     - tidy-ups;
     - **left for later:** `readable()` doesn't check `tripId`'s and `currentTripId`'s types. That would mean changing `private.push_readable` too, and this plan has no SQL.
  - **Fixes:** `61739550` (the binary search, with its speed test) and `afcd2549` (the rules, eight cases in, 57 in all, and the tests). 275 of 275 tests, types clean, and 15 of 15 new deliberate breaks caught.
  - **Both sides:** plan 2b's Swift, in its scratch build, took the same changes, and all 57 cases give the same alerts there (339 harness tests). Plan 2b's text is updated to match.
- **Task 6:** partner-push version 9, ACTIVE, `verify_jwt` false, deployed on 2026-10-24 at 18:03 UTC, with the branch's file. The probe (request 66): 200, with `BadDeviceToken` from both of Apple's services. **Still to check:** the first real run, at CrewLu's next write, should answer 200 with `alerts` 0.
- **Task 7:** §15.3 takes decisions 1 and 2 and the user's two calls after the review, and §15.5 lists the review's limits.
