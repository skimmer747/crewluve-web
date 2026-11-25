# Live or Scheduled, Said Everywhere: the Website's Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every word on the trip map, the map card and the status sentence says whether a flight is tracked live or shown by the schedule, and a plane on the ground at its departure airport never reads as flying.

**Architecture:** One rule, `src/map/flightTracking.ts`, says how the flight between its gates is known now (`live`, `bestGuess`, `notTracked`, `waiting`) and whether it's on the ground at departure (`due`, `atGate`, `stillAtGate`, `returned`). The pill, the card's bar and heading, the card's sentence, the line under the timeline, the facts and the list read it. The status sentence reads two small helpers in `src/engine/liveLegs.ts` built on the same `MapFlight` phases. The live source says when Crewlu Cloud has first answered, so nothing flips from "Not tracked live" to "Live" in the first second.

**Tech Stack:** TypeScript, Preact, Vitest (happy-dom for UI tests). Run tests with `npm test` or `npx vitest run <file>`; type-check with `npx tsc --noEmit` (tests are type-checked too: `noUnusedLocals` is on).

**Spec:** Crewluv's `docs/superpowers/specs/2026-11-25-crewluve-live-or-scheduled-design.md`. Section numbers below (§2, §4.1…) are the spec's.

**Commits:** none. Todd commits when he says so (his standing rule): every task ends with the tests passing, not a commit.

---

## File map

| File | What changes |
|---|---|
| `src/map/flightProgress.ts` | `scheduledTakeoff(departure, arrival)` |
| `src/map/mapFlight.ts` | `isNotLive`, `isAtGate` |
| `src/map/flightTracking.ts` (new) | `FlightTracking`, `legTracking`, `isBySchedule`, `AtDeparture`, `legAtDeparture`, `isSeenAtDeparture` |
| `src/map/tripMap.ts` | `MapLeg.isAwaitingLive`, `TripMapOptions.isAwaitingLive` |
| `src/map/tripMapFor.ts` | passes `isAwaitingLive` on |
| `src/partner/liveSource.ts` | `hasAnswered`, told to listeners once |
| `src/ui/hooks/useLivePlane.ts` | `LivePlane.isAwaiting` |
| `src/copy/tripMap.ts` | the words: `NOT_TRACKED_LIVE`, `TRACKED_LIVE`, `BY_THE_SCHEDULE`, `flightStatus`, `topPill`, `cardHeading`, `liveSummary`, `spokenSource`, `spokenDueClause`, `tripMapSummary`, `lineWords` |
| `src/map/tripActivity.ts` | `atDepartureAirport` (was `stillOnGroundIn`), `FlightBySchedule`, `flightBySchedule`, `FlightNow`, `flightNow` |
| `src/ui/TripTimeline.tsx` | reads `flightNow` |
| `src/ui/TripMapCard.tsx` | the bar shows no status while waiting |
| `src/copy/facts.ts` | `onTheGroundText`, `scheduledTakeoffText`, `NOT_TRACKED_LINES` |
| `src/facts/factRow.ts` | the `source` row kind |
| `src/facts/tripFacts.ts` | `atDepartureOf`, `atDepartureText`, `isGuessedFromSchedule`; headline, latest event, list, events, card sentence |
| `src/facts/tripFactsRows.ts` | the source row; the place, sky, distance, takeoff rows and closest point by the new rule |
| `src/engine/liveLegs.ts` | `ScheduleOnlyFlight`, `scheduleOnlyFlight`, `atGateFlight` |
| `src/copy/narrative.ts` | "should be flying … — not tracked live —", "is due to take off", "is on the ground in" |
| `src/ui/StatusScreen.tsx`, `src/ui/PilotPages.tsx` | pass the new context on |
| `src/data/demo.ts`, `README.md` | the `schedule-at-gate` scene |
| Tests | new: `tests/map/flightTracking.test.ts`, `tests/facts/liveOrScheduledFacts.test.ts`; added to: `tests/partner/liveSource.test.ts`, `tests/ui/useLivePlane.test.tsx`, `tests/copy/liveWords.test.ts`, `tests/map/liveTripMap.test.ts`, `tests/engine/liveLegs.test.ts`, `tests/copy/narrativeAway.test.ts`, `tests/ui/livePages.test.tsx`, `tests/data/demoScenes.test.ts`; old expectations updated in Task 9 |

---

### Task 0: Branch

- [ ] **Step 1: Make the branch**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website" && git checkout main && git pull --ff-only && git checkout -b fix/live-or-scheduled
```

Expected: `Switched to a new branch 'fix/live-or-scheduled'`. The untracked `docs/superpowers/plans/2026-10-26-partner-links-piece2-release.md` stays as it is.

- [ ] **Step 2: Note the suite's starting point**

Run: `npm test 2>&1 | tail -5`
Expected: all passing. If anything fails before any change, stop and tell Todd.

---

### Task 1: How a flight is known, and on the ground at departure (§2, §3)

**Files:**
- Modify: `src/map/flightProgress.ts`, `src/map/mapFlight.ts`, `src/map/tripMap.ts`, `src/map/tripMapFor.ts`
- Create: `src/map/flightTracking.ts`
- Test: `tests/map/flightTracking.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/map/flightTracking.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildLegs } from '../../src/engine/legs'
import { scheduledTakeoff } from '../../src/map/flightProgress'
import { isBySchedule, isSeenAtDeparture, legAtDeparture, legTracking } from '../../src/map/flightTracking'
import type { LiveFlight } from '../../src/map/liveFlight'
import { makeTripMap, type MapLeg, type TripMap } from '../../src/map/tripMap'
import { atTheGate, backAtTheGate, FLYING, LANDED_EARLY, LIVE_AIRPORTS, liveTripMap, SCHEDULE } from './liveTrip'
import { MINUTE, START } from './madeUpFlights'

/**
 * The made-up flight, Louisville to Philadelphia from noon to 2 PM (liveTrip.ts): the schedule's plane takes off 15
 * minutes after the gate, and so does the plan's.
 */
const when = (minutes: number) => START + minutes * MINUTE
const flightOf = (map: TripMap): MapLeg => map.legs.find((l) => l.kind === 'flight')!
/** The flight at `minutes`, with `live` as Crewlu Cloud's answer for it, or none. */
const legAt = (minutes: number, live: LiveFlight | null) => flightOf(liveTripMap(when(minutes), live))
/** The flight at `minutes` while Crewlu Cloud's first answer is on its way. */
const awaiting = (minutes: number) =>
  flightOf(makeTripMap(buildLegs(SCHEDULE), { isNextTrip: false, home: 'SDF', now: when(minutes), airports: LIVE_AIRPORTS, isAwaitingLive: true })!)

describe('how a flight is known now (live or scheduled design §2)', () => {
  it('is live while Crewlu Cloud saw the plane in the last 3 minutes: at its gate, in the air or landed', () => {
    expect(legTracking(legAt(5, atTheGate(5)), when(5))).toBe('live')
    expect(legTracking(legAt(59, FLYING), when(59))).toBe('live')
    expect(legTracking(legAt(103, LANDED_EARLY), when(103))).toBe('live')
  })

  it('is a best guess once a plane last seen in the air hasn’t been for over 3 minutes', () => {
    // FLYING's last fix is 58 minutes in.
    expect(legTracking(legAt(62, FLYING), when(62))).toBe('bestGuess')
  })

  it('isn’t tracked with no live data, or with a fix on the ground over 3 minutes old', () => {
    expect(legTracking(legAt(30, null), when(30))).toBe('notTracked')
    // Seen at its gate at 4 min 40 s: 4 min 20 s before.
    expect(legTracking(legAt(9, atTheGate(5)), when(9))).toBe('notTracked')
  })

  it('is waiting while Crewlu Cloud hasn’t answered since the page opened', () => {
    expect(legTracking(awaiting(30), when(30))).toBe('waiting')
    const answered = makeTripMap(buildLegs(SCHEDULE), { isNextTrip: false, home: 'SDF', now: when(30), airports: LIVE_AIRPORTS })!
    expect('isAwaitingLive' in flightOf(answered)).toBe(false)
  })

  it('is by the schedule alone when not tracked or waiting', () => {
    expect(isBySchedule('notTracked')).toBe(true)
    expect(isBySchedule('waiting')).toBe(true)
    expect(isBySchedule('live')).toBe(false)
    expect(isBySchedule('bestGuess')).toBe(false)
  })
})

describe('on the ground at departure (live or scheduled design §3)', () => {
  it('is due, by the schedule alone, until the schedule’s takeoff 15 minutes after the gate', () => {
    expect(scheduledTakeoff(SCHEDULE.trips[0].start, SCHEDULE.trips[0].end)).toBe(when(15))
    expect(legAtDeparture(legAt(5, null), when(5))).toBe('due')
    expect(legAtDeparture(awaiting(14), when(14))).toBe('due')
    expect(legAtDeparture(legAt(15, null), when(15))).toBeNull()
    // A fix on the ground gone stale is the schedule's again.
    expect(legAtDeparture(legAt(9, atTheGate(5)), when(9))).toBe('due')
  })

  it('is the real plane at its gate before the plan’s takeoff, still there after it, or back after an air return', () => {
    expect(legAtDeparture(legAt(5, atTheGate(5)), when(5))).toBe('atGate')
    expect(legAtDeparture(legAt(25, atTheGate(25)), when(25))).toBe('stillAtGate')
    expect(legAtDeparture(legAt(45, backAtTheGate(45)), when(45))).toBe('returned')
  })

  it('is none in the air, out of sight, landed, before the gate time, or by the schedule after its takeoff', () => {
    expect(legAtDeparture(legAt(59, FLYING), when(59))).toBeNull()
    expect(legAtDeparture(legAt(62, FLYING), when(62))).toBeNull()
    expect(legAtDeparture(legAt(103, LANDED_EARLY), when(103))).toBeNull()
    expect(legAtDeparture(legAt(-10, null), when(-10))).toBeNull()
    expect(legAtDeparture(legAt(30, null), when(30))).toBeNull()
  })

  it('gives a block too short for the taxi allowances its takeoff at the gate', () => {
    expect(scheduledTakeoff(START, START + 20 * MINUTE)).toBe(START)
    const short: MapLeg = { ...legAt(5, null), end: START + 20 * MINUTE }
    expect(legAtDeparture(short, when(5))).toBeNull()
  })

  it('is seen at departure for the real plane, never for the schedule’s', () => {
    expect(isSeenAtDeparture('atGate')).toBe(true)
    expect(isSeenAtDeparture('stillAtGate')).toBe(true)
    expect(isSeenAtDeparture('returned')).toBe(true)
    expect(isSeenAtDeparture('due')).toBe(false)
    expect(isSeenAtDeparture(null)).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/map/flightTracking.test.ts`
Expected: FAIL, `Failed to resolve import "../../src/map/flightTracking"`.

- [ ] **Step 3: Add the schedule's takeoff**

In `src/map/flightProgress.ts`, after `airborneWindow`:

```ts
/**
 * When the schedule's plane takes off for a flight from `departure` to `arrival` (both delay-moved): the start of its
 * time in the air, or the gate departure for a flight with none (live or scheduled design §3).
 */
export const scheduledTakeoff = (departure: number, arrival: number): number => airborneWindow(departure, arrival)?.start ?? departure
```

- [ ] **Step 4: Add the two phase questions to `MapFlight`**

In `src/map/mapFlight.ts`, after `hasReturned`:

```ts
/**
 * Whether Crewlu Cloud's answer says nothing of the plane now, when this browser's clock says `now`: never seen, or seen
 * on the ground over 3 minutes ago (Stage 3 spec §5.1's `notLive`). The flight is then known by the schedule alone (live
 * or scheduled design §2).
 */
export const isNotLive = (flight: MapFlight, now: number): boolean => mapFlightProgress(flight, now).phase === 'notLive'

/**
 * Whether the real plane is seen at its departure airport before the plan's takeoff, when this browser's clock says
 * `now`: at its gate, not late yet (live or scheduled design §3). The words say "On the ground in Louisville".
 */
export function isAtGate(flight: MapFlight, now: number): boolean {
  const { phase, label } = mapFlightProgress(flight, now)
  return phase === 'onGround' && label?.kind !== 'stillOnGround'
}
```

- [ ] **Step 5: Let a leg say it's waiting for the first answer**

In `src/map/tripMap.ts`, add to `MapLeg` after `flight?: MapFlight`:

```ts
  /**
   * The flight has no live data yet because Crewlu Cloud hasn't answered since the page opened (live or scheduled design
   * §2). Set only on a flight with no `flight`, and only then.
   */
  isAwaitingLive?: boolean
```

Change `mapLeg` to take it, and set it:

```ts
function mapLeg(leg: Leg, airports: AirportIndex, flights: ReadonlyMap<string, MapFlight>, isAwaitingLive: boolean): MapLeg | null {
```

and in its returned object, after `...(flight && { flight }),`:

```ts
    ...(isFlight && !flight && isAwaitingLive && { isAwaitingLive: true }),
```

Add to `TripMapOptions` after `flights?`:

```ts
  /** Crewlu Cloud hasn't answered since the page opened: a flight with no live data may yet have some (live or scheduled design §2). */
  isAwaitingLive?: boolean
```

In `makeTripMap`, add `isAwaitingLive = false` to the destructured options and pass it: `.map((l) => mapLeg(l, airports, flights, isAwaitingLive))`.

- [ ] **Step 6: Pass it through `tripMapFor`**

In `src/map/tripMapFor.ts`:

```ts
export function tripMapFor(
  snap: Snapshot, legs: Leg[], airports: AirportIndex, flights?: ReadonlyMap<string, MapFlight>, isAwaitingLive = false,
): TripMap | null {
  const options = (isNextTrip: boolean) => ({ isNextTrip, home: snap.pilot.effHome, base: snap.pilot.base, now: snap.t, airports, flights, isAwaitingLive })
```

(the rest unchanged).

- [ ] **Step 7: Write the rule**

Create `src/map/flightTracking.ts`:

```ts
import { scheduledTakeoff } from './flightProgress'
import { mapFlightProgress } from './mapFlight'
import { isMoving, type MapLeg } from './tripMap'

/**
 * How the flight between its gates is known now (live or scheduled design §2), as the app's FlightTracking:
 * - live: Crewlu Cloud saw the plane in the last 3 minutes: at its gate, in the air, landed or down somewhere else;
 * - bestGuess: last seen in the air over 3 minutes ago, the faded plane;
 * - notTracked: no live data, never seen, or seen on the ground over 3 minutes ago: the schedule's plane alone;
 * - waiting: no live data yet, as Crewlu Cloud hasn't answered since the page opened. It reads as notTracked, but the
 *   pill, the card's bar and the facts say nothing of where it comes from, so nothing flips from "Not tracked live" to
 *   "Live" in the first second.
 * It reads the live data at `now`, so it's for now only: a replay's moment shows the plane the map draws.
 */
export type FlightTracking = 'live' | 'bestGuess' | 'notTracked' | 'waiting'

export function legTracking(leg: MapLeg, now: number): FlightTracking {
  if (!leg.flight) return leg.isAwaitingLive ? 'waiting' : 'notTracked'
  switch (mapFlightProgress(leg.flight, now).phase) {
    case 'notLive':
      return 'notTracked'
    case 'estimated':
      return 'bestGuess'
    case 'onGround':
    case 'inAir':
    case 'landed':
    case 'elsewhere':
    case 'returned':
      return 'live'
  }
}

/** Whether the flight is known by the schedule alone: not tracked live, or waiting to hear (§2). */
export const isBySchedule = (tracking: FlightTracking): boolean => tracking === 'notTracked' || tracking === 'waiting'

/**
 * How a flight on the ground at its departure airport is told (§3, §4.2):
 * - due: known by the schedule alone, before the schedule's takeoff: "Scheduled to take off about 3:14 PM L";
 * - atGate: its real plane seen there before the plan's takeoff: "On the ground in Louisville";
 * - stillAtGate: seen there after it: "Still on the ground in Louisville" (which plane design §4);
 * - returned: back there after an air return: "Returned to Rockford" (air return design §3).
 */
export type AtDeparture = 'due' | 'atGate' | 'stillAtGate' | 'returned'

/**
 * Whether `leg`, between its gates at `now`, is on the ground at its departure airport, and how that's told. Null in the
 * air, out of sight, down, outside its gate times, and for a drive. A plane on the ground at departure never reads
 * "Over …", "In the air now" or "Flying into the night", and has passed nothing yet. Now only, as `legTracking` is.
 */
export function legAtDeparture(leg: MapLeg, now: number): AtDeparture | null {
  if (leg.kind !== 'flight' || !isMoving(leg, now)) return null
  const isDue = now < scheduledTakeoff(leg.start, leg.end)
  if (!leg.flight) return isDue ? 'due' : null
  const { phase, label } = mapFlightProgress(leg.flight, now)
  switch (phase) {
    case 'notLive':
      return isDue ? 'due' : null
    case 'onGround':
      return label?.kind === 'stillOnGround' ? 'stillAtGate' : 'atGate'
    case 'returned':
      return 'returned'
    default:
      return null
  }
}

/** Whether `at` is the real plane seen at its departure airport, not the schedule's: the list leaves it out until it takes off. */
export const isSeenAtDeparture = (at: AtDeparture | null): boolean => at != null && at !== 'due'
```

- [ ] **Step 8: Run the test to see it pass**

Run: `npx vitest run tests/map/flightTracking.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 9: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

---

### Task 2: The first answer (§2)

**Files:**
- Modify: `src/partner/liveSource.ts`, `src/ui/hooks/useLivePlane.ts`
- Test: `tests/partner/liveSource.test.ts`, `tests/ui/useLivePlane.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to the end of `tests/partner/liveSource.test.ts`:

```ts
describe('the first answer (live or scheduled design §2)', () => {
  it('hasn’t come until the first call settles, and is told once even when it brings no flights', async () => {
    const { source, answer: give } = made()
    const told = vi.fn()
    source.subscribe(told)
    expect(source.hasAnswered).toBe(false)
    give(answer([]), answer([]))
    await source.ask()
    expect(source.hasAnswered).toBe(true)
    expect(told).toHaveBeenCalledTimes(1)
    await source.ask()
    expect(told).toHaveBeenCalledTimes(1)
  })

  it('has come when the call fails: the flights are then not tracked', async () => {
    const { source, answer: give } = made()
    give(new Error('offline'))
    await source.ask()
    expect(source.hasAnswered).toBe(true)
    expect(source.flights.size).toBe(0)
  })
})
```

Add to the `describe("the status page's live plane …")` block of `tests/ui/useLivePlane.test.tsx`:

```ts
  it('is awaiting until Crewlu Cloud first answers, whatever the answer holds (live or scheduled design §2)', async () => {
    const seen: LivePlane[] = []
    render(<Probe door={door(() => ({ now: Date.now(), cursor: 1, flights: [] }))} schedule={SCHEDULE} seen={(p) => seen.push(p)} />)
    expect(seen[0].isAwaiting).toBe(true)
    await settle()
    expect(seen[seen.length - 1].isAwaiting).toBe(false)
  })
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/partner/liveSource.test.ts tests/ui/useLivePlane.test.tsx`
Expected: FAIL: `hasAnswered` is `undefined`, and `isAwaiting` is `undefined`.

- [ ] **Step 3: Keep and tell the first answer**

In `src/partner/liveSource.ts`, add to the `LiveSource` interface after `clockOffset`:

```ts
  /**
   * Crewlu Cloud has answered since the source was made, or a call to it failed (live or scheduled design §2). Until then
   * a flight with no live data may yet have some, and the page says nothing of where it comes from.
   */
  readonly hasAnswered: boolean
```

and change `subscribe`'s comment to: `Hears each change of \`flights\`, and the first answer whatever it holds. Returns what stops it. …` (keep the rest of the sentence).

In `makeLiveSource`, after `let timer …`:

```ts
  let hasAnswered = false
```

Replace `setFlights` with a `tell` and `setFlights`:

```ts
  /** Tells every listener. */
  function tell() {
    for (const listener of [...listeners]) callBack(listener)
  }

  function setFlights(next: ReadonlyMap<string, LiveFlight>) {
    if (sameFlights(flights, next)) return
    flights = next
    tell()
  }
```

In `ask()`, replace the `.finally` callback:

```ts
    void askCrewluCloud().finally(() => {
      asking = null
      // The first answer is told even when it brings no flights: the page waits for it (live or scheduled design §2).
      const isFirst = !hasAnswered
      hasAnswered = true
      if (isFirst) tell()
      settle()
    })
```

In the returned object, after `get clockOffset()`:

```ts
    get hasAnswered() {
      return hasAnswered
    },
```

- [ ] **Step 4: Hand it to the page**

In `src/ui/hooks/useLivePlane.ts`, add to `LivePlane`:

```ts
  /**
   * Crewlu Cloud hasn't answered since the page opened: a flight with no live data may yet have some (live or scheduled
   * design §2). False unless it's said.
   */
  isAwaiting?: boolean
```

Change the state's start: `const [plane, setPlane] = useState<LivePlane>({ ...NO_LIVE_PLANE, isAwaiting: true })`, and the listener:

```ts
    const stop = source.subscribe(() =>
      setPlane({ flights: source.flights, clockOffset: source.clockOffset, isAwaiting: !source.hasAnswered }))
```

- [ ] **Step 5: Run them to see them pass**

Run: `npx vitest run tests/partner/liveSource.test.ts tests/ui/useLivePlane.test.tsx`
Expected: PASS, all tests.

---

### Task 3: The pill, the card's bar and its heading (§4.1, §4.2, §6, §7)

**Files:**
- Modify: `src/copy/tripMap.ts`, `src/ui/TripMapCard.tsx`
- Test: `tests/copy/liveWords.test.ts`

- [ ] **Step 1: Change the tests to the new words**

In `tests/copy/liveWords.test.ts`, replace the whole `describe("the card's bar and the full map's pill (Stage 3 spec §9)", …)` block with:

```ts
describe("the card's bar and the full map's pill (Stage 3 spec §9, live or scheduled design §4.1, §6)", () => {
  it('say "Live" before the real plane’s label while it’s seen, and the label alone for a best guess', () => {
    const { leg, t } = caseLeg('ahead, in the air')
    expect(flightStatus(leg, t)).toBe('Live · 14 min ahead')
    const estimated = caseLeg('ahead, in the air', 2)
    expect(flightStatus(estimated.leg, estimated.t)).toBe('About 14 min ahead')
    const late = caseLeg('still on the ground twenty minutes after')
    expect(flightStatus(late.leg, late.t)).toBe('Live · Still on the ground · 20 min behind')
    const elsewhere = caseLeg('on the ground somewhere else')
    expect(flightStatus(elsewhere.leg, elsewhere.t)).toBe('Live')
  })

  it('say "Not tracked live" by the schedule alone, and nothing while the first answer is on its way', () => {
    const { leg, t } = caseLeg('ahead, in the air')
    expect(flightStatus(scheduleOnly(leg), t)).toBe('Not tracked live')
    expect(flightStatus({ ...scheduleOnly(leg), isAwaitingLive: true }, t)).toBe('')
  })

  it('say "In flight" in a replay of a flight with a real path, and "By the schedule" of one without', () => {
    const { leg, t } = caseLeg('ahead, in the air')
    expect(flightStatus(leg, t, true)).toBe('In flight')
    expect(flightStatus(scheduleOnly(leg), t, true)).toBe('By the schedule')
  })

  it('put the words on the pill after the flight number, or the flight alone while waiting', () => {
    const { leg, t } = caseLeg('ahead, in the air')
    const airports = { get: (code: string) => ({ iata: code, lat: airport(code).lat, lng: airport(code).lng }), city: () => null, tz: () => NY } as unknown as AirportIndex
    const map = makeTripMap(
      [{ kind: 'flight', id: 'f1', tripId: 'T1', dep: 'SDF', arr: 'PHL', start: leg.start, end: leg.end, schedStart: leg.start, schedEnd: leg.end, airline: '5X', enteredAirline: null, number: '207', deadhead: false, ground: false }],
      { isNextTrip: false, home: 'SDF', now: t, airports, flights: new Map([['f1', leg.flight!]]) },
    )!
    expect(topPill(map, t, 1, 2)).toBe('UPS207 · Live · 14 min ahead')
    expect(topPill(map, t, 1, 2, true)).toBe('UPS207 · In flight')
    const bySchedule = { ...map, legs: map.legs.map(scheduleOnly) }
    expect(topPill(bySchedule, t, 1, 2)).toBe('UPS207 · Not tracked live')
    expect(topPill(bySchedule, t, 1, 2, true)).toBe('UPS207 · By the schedule')
    const waiting = { ...map, legs: map.legs.map((l) => ({ ...scheduleOnly(l), isAwaitingLive: true })) }
    expect(topPill(waiting, t, 1, 2)).toBe('UPS207')
    expect(topPill({ ...waiting, legs: waiting.legs.map((l) => ({ ...l, flightNumber: null })) }, t, 1, 2)).toBe('Flight to PHL')
  })
})
```

The last line's city is the airport code: this test's airport index has no cities, so `airportMark` falls back to the code, `PHL`. In the map card heading's `describe`, replace the test `'is "In flight" in the air, landed, on the ground somewhere else and with no live data, as before'` with:

```ts
  it('is "In flight" in the air, landed and on the ground somewhere else, as before', () => {
    for (const name of ['ahead, in the air', 'landed, seen all the way', 'on the ground somewhere else']) {
      const { leg, t } = caseLeg(name)
      expect(cardHeading(mapOf(leg), t)).toBe('In flight')
    }
  })

  it('is "Not tracked live" by the schedule alone, and "Flight" while the first answer is on its way (live or scheduled design §7)', () => {
    const late = caseLeg('still on the ground twenty minutes after')
    expect(cardHeading(mapOf(scheduleOnly(late.leg)), late.t)).toBe('Not tracked live')
    expect(cardHeading(mapOf({ ...scheduleOnly(late.leg), isAwaitingLive: true }), late.t)).toBe('Flight')
  })
```

In the `'is "Landed" while the real plane is down …'` test, change the last line's expected `'In flight'` to `'Not tracked live'`.

In the air return block, replace `'put "Returned to Louisville" on the card’s bar …'` with:

```ts
  it('put "Live · Returned to Louisville" on the card’s bar and the full map’s pill, and "By the schedule" in a replay, as it has no real path', () => {
    const { leg, t } = back()
    expect(flightStatus(leg, t)).toBe('Live · Returned to Louisville')
    expect(flightStatus(leg, t, true)).toBe('By the schedule')
    expect(spokenLiveLabel({ kind: 'returned' })).toBe('returned')
  })
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/copy/liveWords.test.ts`
Expected: FAIL on the new words (`'14 min ahead'` where `'Live · 14 min ahead'` is expected, and so on).

- [ ] **Step 3: Write the words**

In `src/copy/tripMap.ts`, change the imports:

```ts
import { legAtDeparture, isSeenAtDeparture, legTracking } from '../map/flightTracking'
```

and remove `legStillOnGround` from the `'../map/tripMap'` import (`cardHeading` no longer reads it).

After `about`, add:

```ts
/** A flight known by the schedule alone: the pill, the card's bar, the facts' first row and the card's heading (live or scheduled design §4.1). */
export const NOT_TRACKED_LIVE = 'Not tracked live'

/** The facts' first row for a flight Crewlu Cloud sees now (§4.1). */
export const TRACKED_LIVE = 'Tracked live'

/** The list's tag for a flight known by the schedule alone, and a replay's pill for one without a real path (§4.1, §6). */
export const BY_THE_SCHEDULE = 'By the schedule'
```

Replace `flightStatus`:

```ts
/**
 * What the card's bar and the full map's pill say of a flight between its gates (Stage 3 spec §9, live or scheduled
 * design §4.1): how it's known, then the real plane's label. Seen now, "Live · 12 min ahead", or "Live" alone with no
 * label; back at its departure airport after an air return, "Live · Returned to Rockford" (air return design §3). A best
 * guess, its label alone, "About 12 min ahead", or "In flight" with none, as before. By the schedule alone, "Not tracked
 * live", and nothing while Crewlu Cloud's first answer is on its way. A moment of the replay is "In flight" for a flight
 * with a real path, and "By the schedule" for one without (§6).
 */
export function flightStatus(leg: MapLeg, now: number, isReplay = false): string {
  if (isReplay) return leg.flight?.path.isReal ? 'In flight' : BY_THE_SCHEDULE
  const label = leg.flight ? mapFlightProgress(leg.flight, now).label : null
  const words = label?.kind === 'returned' ? returnedText(leg.origin.city) : label ? liveLabelText(label) : null
  switch (legTracking(leg, now)) {
    case 'live':
      return words ? `Live · ${words}` : 'Live'
    case 'bestGuess':
      return words ?? 'In flight'
    case 'notTracked':
      return NOT_TRACKED_LIVE
    case 'waiting':
      return ''
  }
}
```

In `topPill`, replace the `if (leg) return …` line with:

```ts
  if (leg) {
    if (leg.kind !== 'flight') return `Driving to ${leg.destination.city}`
    // While Crewlu Cloud's first answer is on its way the status is empty: the flight number alone, or where it's going.
    return [leg.flightNumber, flightStatus(leg, t, isReplay)].filter(Boolean).join(' · ') || `Flight to ${leg.destination.city}`
  }
```

Replace `cardHeading`:

```ts
/**
 * The map card's heading, for screen readers (live or scheduled design §7): "On the ground" while the flight's real plane
 * is at its departure airport (the website's own, Todd, 16 Nov 2026), "Landed" while it's down and not yet at the gate
 * (the landed, not yet at the gate design §3), "Not tracked live" by the schedule alone, "Flight" while Crewlu Cloud's
 * first answer is on its way, else "In flight"; with no flight, "Trip recap" or "Trip map".
 */
export function cardHeading(map: TripMap, now: number): string {
  const leg = currentLeg(map)
  if (!leg) return map.mode.kind === 'recap' ? 'Trip recap' : 'Trip map'
  if (isSeenAtDeparture(legAtDeparture(leg, now))) return 'On the ground'
  if (legLandedBeforeGate(leg, now)) return 'Landed'
  switch (legTracking(leg, now)) {
    case 'notTracked':
      return NOT_TRACKED_LIVE
    case 'waiting':
      return 'Flight'
    default:
      return 'In flight'
  }
}
```

- [ ] **Step 4: Show no status on the card's bar while waiting**

In `src/ui/TripMapCard.tsx`, in `InFlightBar`, add `const status = flightStatus(leg, now)` after `const local = …`, and replace the status span and its comment with:

```tsx
        {/* "Live · 12 min ahead", "Not tracked live", or nothing while the first answer is on its way (live or scheduled design §4.1). */}
        {status && <span class="inflight-status">{status}</span>}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npx vitest run tests/copy/liveWords.test.ts`
Expected: the bar, pill and heading tests PASS. The card sentence tests in this file (`tripMapSummary`) still fail: Task 4 changes them.

---

### Task 4: The card's sentence for screen readers (§7)

**Files:**
- Modify: `src/copy/tripMap.ts`
- Test: `tests/copy/liveWords.test.ts`

- [ ] **Step 1: Change the tests to the new sentences**

In `tests/copy/liveWords.test.ts`, replace `"is the card's sentence with a real plane, and the schedule's without one, as before"` with:

```ts
  it("is the card's sentence with a real plane, saying it's tracked live, and the schedule's without one, saying it isn't (live or scheduled design §7)", () => {
    const { leg, t } = caseLeg('ahead, in the air')
    const map: TripMap = { mode: { kind: 'inFlight', legId: 'f1' }, legs: [leg], groundStops: [], home: null, base: null, isWaitingAtBase: false, span: { start: leg.start, end: leg.end }, days: null }
    expect(tripMapSummary(map, t, 'Alex', NY, false)).toMatch(/^UPS207 to Philadelphia, 14 minutes ahead of schedule\. Lands about .* your time\. Tracked live\. Opens the full map\.$/)
    expect(tripMapSummary({ ...map, legs: [scheduleOnly(leg)] }, t, 'Alex', NY, false))
      .toMatch(/^UPS207 to Philadelphia, landing at .* your time\. Not tracked live, so it's shown where the schedule has it\. Opens the full map\.$/)
    // While the first answer is on its way, nothing of where it comes from.
    expect(tripMapSummary({ ...map, legs: [{ ...scheduleOnly(leg), isAwaitingLive: true }] }, t, 'Alex', NY, false))
      .toMatch(/^UPS207 to Philadelphia, landing at .* your time\. Opens the full map\.$/)
  })

  it('says a flight by the schedule alone is scheduled to take off, before its takeoff', () => {
    const { leg } = caseLeg('ahead, in the air')
    const bySchedule = scheduleOnly(leg)
    const map: TripMap = { mode: { kind: 'inFlight', legId: 'f1' }, legs: [bySchedule], groundStops: [], home: null, base: null, isWaitingAtBase: false, span: { start: leg.start, end: leg.end }, days: null }
    expect(tripMapSummary(map, bySchedule.start + 5 * 60_000, 'Alex', NY, false))
      .toMatch(/^UPS207 to Philadelphia, scheduled to take off about \d{1,2}:\d\d\s[AP]M your time, landing at .* your time\. Not tracked live, so it's shown where the schedule has it\. Opens the full map\.$/)
  })

  it('says a real plane at its gate before the plan’s takeoff is on the ground', () => {
    // Seen at the Louisville gate 5 minutes after the gate time, 10 before the plan's takeoff: no label yet.
    const now = START + 5 * MINUTE
    const leg = liveTripMap(now, atTheGate(5)).legs[0]
    expect(liveSummary(leg, now, NY, false)).toMatch(/^UPS1234 to Philadelphia, on the ground in Louisville\. Lands at .* your time\.$/)
  })
```

Add the imports this needs: `atTheGate, liveTripMap` from `'../map/liveTrip'`, and `MINUTE, START` from `'../map/madeUpFlights'`.

In the air return block, change the `tripMapSummary` expectation in `'give the card’s sentence for screen readers its words, and when it lands'` to:

```ts
    expect(tripMapSummary(mapOf(leg), t, 'Alex', NY, false)).toMatch(/^UPS207 to Philadelphia, returned to Louisville\. Lands about 9:11\sAM your time\. Tracked live\. Opens the full map\.$/)
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/copy/liveWords.test.ts`
Expected: FAIL on "Tracked live", "Not tracked live, so it's shown …", "scheduled to take off" and "on the ground in Louisville".

- [ ] **Step 3: Write the sentences**

In `src/copy/tripMap.ts`, add to the imports: `import { scheduledTakeoff } from '../map/flightProgress'`.

After `BY_THE_SCHEDULE`, add:

```ts
/** "Not tracked live, so it's shown where the schedule has it.": the card's sentence for a flight by the schedule alone (§7). */
export const SPOKEN_NOT_TRACKED = `${NOT_TRACKED_LIVE}, so it's shown where the schedule has it.`

/**
 * What the card's sentence says of where the flight comes from (§7): "Tracked live." while Crewlu Cloud sees it, "Not
 * tracked live, so …" by the schedule alone, and nothing for a best guess, whose sentence says where it was last tracked,
 * or while the first answer is on its way.
 */
export function spokenSource(leg: MapLeg, now: number): string | null {
  switch (legTracking(leg, now)) {
    case 'live':
      return `${TRACKED_LIVE}.`
    case 'notTracked':
      return SPOKEN_NOT_TRACKED
    default:
      return null
  }
}

/** ", scheduled to take off about 3:14 PM your time": a flight by the schedule alone, before its takeoff (§7). Else nothing. */
export function spokenDueClause(leg: MapLeg, now: number, viewerTz: string, h24: boolean): string {
  if (legAtDeparture(leg, now) !== 'due') return ''
  return `, scheduled to take off about ${shortTimeText(scheduledTakeoff(leg.start, leg.end), viewerTz, h24)} your time`
}
```

Replace `liveSummary` (its comment gains one sentence: "Seen at its gate before the plan's takeoff, with no label yet, "UPS70 to Honolulu, on the ground in Louisville. Lands at 12:11 AM your time." (live or scheduled design §7)."):

```ts
export function liveSummary(
  leg: MapLeg, now: number, viewerTz: string, h24: boolean, over: string | null = null, lastSeen: string | null = null,
): string | null {
  const label = leg.flight ? mapFlightProgress(leg.flight, now).label : null
  // A plane back at its departure airport after an air return names it (air return design §3).
  const spoken = label?.kind === 'returned' ? `returned to ${leg.origin.city}`
    : label ? spokenLiveLabel(label)
    : legAtDeparture(leg, now) === 'atGate' ? `on the ground in ${leg.origin.city}`
    : null
  if (!spoken) return null
  const lead = leg.flightNumber ? `${leg.flightNumber} to` : 'Flying to'
  const time = shortTimeText(leg.end, viewerTz, h24)
  const isDown = label?.kind === 'landedOnTime' || label?.kind === 'landedEarly' || label?.kind === 'landedLate'
  const isFlying = label?.kind === 'onSchedule' || label?.kind === 'ahead' || label?.kind === 'behind'
  // It's down and on its way in: "landed 8 minutes early. Lands at 3:18 PM" would say so twice.
  const arrival = isDown ? `Reaches the gate at ${time} your time.` : `Lands ${isArrivalEstimated(leg) ? 'about' : 'at'} ${time} your time.`
  const where = isFlying ? `${over ? `, over ${over}` : ''}${lastSeen ? `, last tracked ${lastSeen}` : ''}` : ''
  return `${lead} ${leg.destination.city}, ${spoken}${where}. ${arrival}`
}
```

In `tripMapSummary`, replace the `inFlight` branch's body after `if (!leg) return …`:

```ts
    const source = spokenSource(leg, t)
    const live = liveSummary(leg, t, viewerTz, h24)
    if (live) return [live, source, opens].filter(Boolean).join(' ')
    const lead = leg.flightNumber ? `${leg.flightNumber} to` : 'Flying to'
    const landing = `${lead} ${leg.destination.city}${spokenDueClause(leg, t, viewerTz, h24)}, landing at ${shortTimeText(leg.end, viewerTz, h24)} your time.`
    return [landing, source, opens].filter(Boolean).join(' ')
```

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run tests/copy/liveWords.test.ts`
Expected: PASS.

---

### Task 5: The line under the timeline (§4.1, §4.2)

**Files:**
- Modify: `src/map/tripActivity.ts`, `src/copy/tripMap.ts`, `src/ui/TripTimeline.tsx`
- Test: `tests/map/liveTripMap.test.ts`, `tests/copy/liveWords.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/map/liveTripMap.test.ts`, change the import `stillOnGroundIn` to `atDepartureAirport`, and add `flightBySchedule, flightNow` to the same import. Rename every `stillOnGroundIn(` call to `atDepartureAirport(`. Replace the test `'isn’t told while an on-time plane is still before the plan’s takeoff time: it’s taxiing as the schedule has it'` with:

```ts
  it('is told of an on-time plane seen at its gate before the plan’s takeoff, though it isn’t late (live or scheduled design §3)', () => {
    // A minute after its leg begins, 14 before the plan's takeoff.
    const map = liveTripMap(START + MINUTE, atTheGate(1))
    expect(legStillOnGround(flightOf(map), START + MINUTE)).toBe(false)
    expect(atDepartureAirport(map, START + MINUTE)).toMatchObject({ code: 'SDF', city: 'Louisville' })
    expect(flightOnGround(map, START + MINUTE)).toMatchObject({ kind: 'stillIn', airport: { code: 'SDF' } })
  })
```

Add a new `describe` at the end of the file:

```ts
describe('a flight by the schedule alone, under the timeline (live or scheduled design §4.1, §4.2)', () => {
  it('is due to fly to Philadelphia before the schedule’s takeoff, and should be flying there after', () => {
    expect(flightBySchedule(liveTripMap(START + 5 * MINUTE, null), START + 5 * MINUTE)).toMatchObject({ kind: 'dueTo', airport: { code: 'PHL' } })
    expect(flightBySchedule(liveTripMap(START + 30 * MINUTE, null), START + 30 * MINUTE)).toMatchObject({ kind: 'shouldBeFlyingTo', airport: { code: 'PHL' } })
  })

  it('is none for a flight Crewlu Cloud sees, and the plane on the ground comes first', () => {
    expect(flightBySchedule(liveTripMap(START + 59 * MINUTE, FLYING), START + 59 * MINUTE)).toBeNull()
    const atGate = liveTripMap(START + 5 * MINUTE, atTheGate(5))
    expect(flightNow(atGate, START + 5 * MINUTE)).toMatchObject({ kind: 'stillIn' })
    const bySchedule = liveTripMap(START + 30 * MINUTE, null)
    expect(flightNow(bySchedule, START + 30 * MINUTE)).toMatchObject({ kind: 'shouldBeFlyingTo' })
  })
})
```

In `tests/copy/liveWords.test.ts`, add `timelineLine` to the `'../../src/copy/tripMap'` import if it isn't there, add `import type { AirportMark } from '../../src/map/tripMap'` to the existing `tripMap` type import, and add:

```ts
describe('the line under the timeline for a flight by the schedule alone (live or scheduled design §4.1, §4.2)', () => {
  const honolulu: AirportMark = { code: 'HNL', city: 'Honolulu', place: { lat: 21.3, lng: -157.9 }, timeZone: 'Pacific/Honolulu' }
  const ms = Date.UTC(2026, 10, 25, 20, 12)

  it('says it’s scheduled to fly there, then that it should be flying there', () => {
    expect(timelineLine(ms, null, NY, false, { kind: 'dueTo', airport: honolulu })).toMatch(/^Wed 3:12\sPM L · Scheduled to fly to Honolulu$/)
    expect(timelineLine(ms, null, NY, false, { kind: 'shouldBeFlyingTo', airport: honolulu })).toMatch(/^Wed 3:12\sPM L · Should be flying to Honolulu$/)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/map/liveTripMap.test.ts tests/copy/liveWords.test.ts`
Expected: FAIL: `atDepartureAirport`, `flightBySchedule` and `flightNow` aren't exported, and `timelineLine` doesn't know `dueTo`.

- [ ] **Step 3: Widen the timeline's flight in `tripActivity.ts`**

In `src/map/tripActivity.ts`, change the `'./tripMap'` import to drop `legReturned` and `legStillOnGround`, and add:

```ts
import { isBySchedule, isSeenAtDeparture, legAtDeparture, legTracking } from './flightTracking'
```

Replace `stillOnGroundIn` with:

```ts
/**
 * Where the pilot's flight is on the ground at `now`, while it's between its gates and its real plane is seen at its
 * departure airport: at its gate before the plan's takeoff, still there after it, or back after an air return (live or
 * scheduled design §3). The line under the timeline names it in place of "Flying to". Null otherwise. Now only: a
 * replay's moment flies as the map has the plane.
 */
export function atDepartureAirport(map: TripMap, now: number): AirportMark | null {
  const flight = map.legs.find((l) => l.kind === 'flight' && isMoving(l, now))
  return flight && isSeenAtDeparture(legAtDeparture(flight, now)) ? flight.origin : null
}
```

Change `landedIn`'s comment's "as `stillOnGroundIn` is" to "as `atDepartureAirport` is", and `flightOnGround`'s body:

```ts
export function flightOnGround(map: TripMap, now: number): FlightOnGround | null {
  const arrival = landedIn(map, now)
  if (arrival) return { kind: 'landedIn', airport: arrival }
  const departure = atDepartureAirport(map, now)
  if (!departure) return null
  const flight = map.legs.find((l) => l.kind === 'flight' && isMoving(l, now))
  return { kind: flight && legAtDeparture(flight, now) === 'returned' ? 'returnedTo' : 'stillIn', airport: departure }
}
```

(and in its comment and `FlightOnGround`'s: `stillIn` is "at its departure airport, before or after the plan's takeoff time").

After `flightOnGround`, add:

```ts
/**
 * The flight between its gates at `now` known by the schedule alone, as the line under the timeline names it in place of
 * "Flying to" (live or scheduled design §4.1, §4.2): before the schedule's takeoff, `dueTo` ("Scheduled to fly to
 * Honolulu"); after it, `shouldBeFlyingTo` ("Should be flying to Honolulu"). Null otherwise. Now only.
 */
export interface FlightBySchedule {
  kind: 'dueTo' | 'shouldBeFlyingTo'
  /** Where it's going. */
  airport: AirportMark
}

export function flightBySchedule(map: TripMap, now: number): FlightBySchedule | null {
  const flight = map.legs.find((l) => l.kind === 'flight' && isMoving(l, now))
  if (!flight || !isBySchedule(legTracking(flight, now))) return null
  return { kind: legAtDeparture(flight, now) === 'due' ? 'dueTo' : 'shouldBeFlyingTo', airport: flight.destination }
}

/** What the line under the timeline names of the flight between its gates now, in place of the activity's words. */
export type FlightNow = FlightOnGround | FlightBySchedule

/** The real plane on the ground first, else the flight by the schedule alone. Now only. */
export const flightNow = (map: TripMap, now: number): FlightNow | null => flightOnGround(map, now) ?? flightBySchedule(map, now)
```

- [ ] **Step 4: Write the words**

In `src/copy/tripMap.ts`, change the type import to `import type { FlightNow, TripActivity } from '../map/tripActivity'`, and replace `lineWords`, keeping its comment and adding: "By the schedule alone, "Scheduled to fly to Honolulu" before its takeoff and "Should be flying to Honolulu" after (live or scheduled design §4.1, §4.2)."

```ts
function lineWords(activity: TripActivity | null, flight: FlightNow | null): string | null {
  switch (flight?.kind) {
    case 'stillIn': return `On the ground in ${flight.airport.city}`
    case 'returnedTo': return returnedText(flight.airport.city)
    case 'landedIn': return landedText(flight.airport.city)
    case 'dueTo': return `Scheduled to fly to ${flight.airport.city}`
    case 'shouldBeFlyingTo': return `Should be flying to ${flight.airport.city}`
    case undefined: return activity ? activityWords(activity) : null
  }
}
```

In `timelineLine` and `timelineSpokenValue`, rename the last parameter `onGround: FlightOnGround | null = null` to `flight: FlightNow | null = null`, and pass `flight` to `lineWords`.

- [ ] **Step 5: Read it in the timeline**

In `src/ui/TripTimeline.tsx`, change the import to `import { activityAt, flightNow } from '../map/tripActivity'`, and replace line 79 and its comment:

```tsx
  // Now, the flight's real plane on the ground at its departure airport is "On the ground" there, one back there after an
  // air return has "Returned" there, and one down before the gate has "Landed" there; a flight by the schedule alone is
  // "Scheduled to fly to" or "Should be flying to" (live or scheduled design §4). A replay's moment flies as the map has
  // the plane.
  const flight = isLive(clock) ? flightNow(map, t) : null
```

and pass `flight` in place of `onGround` to `timelineSpokenValue` and `timelineLine`.

- [ ] **Step 6: Run them to see them pass**

Run: `npx vitest run tests/map/liveTripMap.test.ts tests/copy/liveWords.test.ts tests/map/tripActivity.test.ts tests/map/airReturn.test.ts`
Expected: PASS. If `tests/map/airReturn.test.ts` imports `stillOnGroundIn`, rename it there too.

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. A leftover `stillOnGroundIn` or `FlightOnGround` in `src/copy/tripMap.ts` shows here.

---

### Task 6: The facts and the list (§4, §5)

**Files:**
- Modify: `src/copy/facts.ts`, `src/facts/factRow.ts`, `src/facts/tripFacts.ts`, `src/facts/tripFactsRows.ts`
- Create: `tests/facts/liveOrScheduledFacts.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/facts/liveOrScheduledFacts.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { cardSummary, headline, latestEvent, makeTripFacts, tripSoFar, type TripFacts } from '../../src/facts/tripFacts'
import { factRows } from '../../src/facts/tripFactsRows'
import type { MapLeg, TripMap } from '../../src/map/tripMap'
import { atTheGate, liveTripMap } from '../map/liveTrip'
import { MINUTE, START } from '../map/madeUpFlights'
import { EQUATOR, equatorFlight, EQUINOX, flightMap, mark } from './factsTestData'
import { equatorLive, equatorLiveLeg, HOME_BY_THE_EQUATOR } from './liveFacts'

/**
 * The flight along the equator by the schedule alone (factsTestData.ts): at the gate at 10:00 UTC (6:00 AM in
 * Louisville), off at 10:15, into Bravo at 11:00, halfway at 11:45, closest to home at 12:21, at the gate at 13:22.
 */
const NY = 'America/New_York'
const t = (hhmm: string) => Date.parse(`2026-03-20T${hhmm}:00Z`)
const HOME = mark('HOME', 0.5, 14)

function factsOf(map: TripMap, isReplay = false): TripFacts {
  return makeTripFacts(map, { geography: EQUATOR, comparisons: null, viewerTz: NY, h24: false, day: 1, days: 1, isReplay })
}
const bySchedule = (leg: MapLeg = equatorFlight(0, 20), isReplay = false) => factsOf(flightMap(leg, HOME), isReplay)

describe('a flight by the schedule alone, before its takeoff (live or scheduled design §4.2)', () => {
  it('heads the facts with when it’s scheduled to take off, not what’s below, in either clock', () => {
    expect(headline(bySchedule(), t('10:05'))).toMatch(/^Scheduled to take off about 6:15\sAM L$/)
    const h24 = makeTripFacts(flightMap(equatorFlight(0, 20), HOME), { geography: EQUATOR, comparisons: null, viewerTz: NY, h24: true })
    expect(headline(h24, t('10:05'))).toBe('Scheduled to take off about 6:15 L')
  })

  it('has the source row first, then the takeoff, the miles to go and the landing: no sky, no takeoff row', () => {
    const rows = factRows(bySchedule(), t('10:05'), t('10:05'))
    expect(rows.map((r) => r.kind)).toEqual(['source', 'below', 'distance', 'headed'])
    expect(rows[0]).toMatchObject({ icon: 'CalendarBlank', title: 'Not tracked live', detail: "Shown where the schedule has it · If it's running late, it may still be at the gate" })
    expect(rows[1]).toMatchObject({ icon: 'AirplaneTakeoff' })
    expect(rows[1].title).toMatch(/^Scheduled to take off about 6:15\sAM L$/)
    expect(rows[2].title).toBe('1,382 mi to go')
    expect(rows[2].detail).toMatch(/Halfway at about 7:45\sAM L/)
  })

  it('has no latest event, and lists the flight "By the schedule" with nothing passed yet', () => {
    expect(latestEvent(bySchedule(), t('10:05'))).toBeNull()
    expect(tripSoFar(bySchedule(), t('10:05')).flights).toEqual([{ id: 'eq', title: 'TST1 · E0 → E20', tag: 'By the schedule', events: [] }])
  })

  it('tells screen readers when it’s scheduled to take off, and that it isn’t tracked', () => {
    expect(cardSummary(bySchedule(), t('10:05'), 'Alex'))
      .toMatch(/^TST1 to E20, scheduled to take off about 6:15\sAM your time\. Lands at 9:22\sAM your time\. Not tracked live, so it's shown where the schedule has it\. Opens the full map\.$/)
  })
})

describe('a flight by the schedule alone, in the air (live or scheduled design §4.1, §5)', () => {
  it('heads the facts with what’s below, as before, under the source row', () => {
    const facts = bySchedule()
    expect(headline(facts, t('11:10'))).toBe('Over Bravo, near Testville')
    expect(factRows(facts, t('11:10'), t('11:10'))[0]).toMatchObject({ kind: 'source', title: 'Not tracked live' })
  })

  it('reads its events, halfway and closest point to home "about"', () => {
    const facts = bySchedule()
    expect(latestEvent(facts, t('11:10'))?.when).toBe('About 10 min ago')
    const soFar = tripSoFar(facts, t('11:10'))
    expect(soFar.flights[0].tag).toBe('By the schedule')
    expect(soFar.flights[0].events.length).toBeGreaterThan(0)
    expect(soFar.flights[0].events.every((e) => e.isEstimate)).toBe(true)
    const distance = factRows(facts, t('11:10'), t('11:10')).find((r) => r.kind === 'distance')!
    expect(distance.detail).toMatch(/Halfway at about 7:45\sAM L/)
  })

  it('says nothing of where it comes from while Crewlu Cloud’s first answer is on its way', () => {
    const facts = bySchedule({ ...equatorFlight(0, 20), isAwaitingLive: true })
    expect(factRows(facts, t('11:10'), t('11:10')).map((r) => r.kind)).not.toContain('source')
    expect(tripSoFar(facts, t('11:10')).flights[0].tag).toBe('By the schedule')
  })

  it('reads a replay as before: no source row, its events not guesses, and "By the schedule" with no real path', () => {
    const facts = bySchedule(equatorFlight(0, 20), true)
    expect(factRows(facts, t('11:10'), t('11:10')).map((r) => r.kind)).not.toContain('source')
    expect(latestEvent(facts, t('11:10'))?.when).not.toMatch(/About/)
    const soFar = tripSoFar(facts, t('11:10'))
    expect(soFar.flights[0].tag).toBe('By the schedule')
    expect(soFar.flights[0].events.every((e) => !e.isEstimate)).toBe(true)
  })

  it('leaves an earlier flight’s events as before', () => {
    const first = equatorFlight(0, 20)
    const second = equatorFlight(20, 40, EQUINOX + 5 * 60 * MINUTE, 'eq2')
    const map: TripMap = {
      mode: { kind: 'inFlight', legId: 'eq2' }, legs: [first, second], groundStops: [], base: null, isWaitingAtBase: false, home: HOME,
      span: { start: first.start, end: second.end }, days: null,
    }
    const soFar = tripSoFar(factsOf(map), EQUINOX + 6 * 60 * MINUTE)
    const earlier = soFar.flights.find((f) => f.id === 'eq')!
    expect(earlier.events.length).toBeGreaterThan(0)
    expect(earlier.events.every((e) => !e.isEstimate)).toBe(true)
  })
})

describe('a flight Crewlu Cloud sees (live or scheduled design §4.1, §4.2)', () => {
  it('has "Tracked live" first in the air', () => {
    const leg = equatorLiveLeg(equatorLive(t('10:55')), t('10:55'))
    const facts = makeTripFacts(flightMap(leg, HOME_BY_THE_EQUATOR), { geography: EQUATOR, comparisons: null, viewerTz: NY, h24: false })
    expect(factRows(facts, t('10:55'), t('10:55'))[0]).toMatchObject({ kind: 'source', icon: 'Broadcast', title: 'Tracked live', detail: null })
  })

  it('at its gate before the plan’s takeoff, is on the ground in Louisville: no sky, nothing listed, no latest event', () => {
    const now = START + 5 * MINUTE
    const facts = makeTripFacts(liveTripMap(now, atTheGate(5)), { geography: null, comparisons: null, viewerTz: NY, h24: false })
    expect(headline(facts, now)).toBe('On the ground in Louisville')
    const rows = factRows(facts, now, now)
    expect(rows.map((r) => r.kind)).not.toContain('sky')
    expect(rows[0]).toMatchObject({ kind: 'source', title: 'Tracked live' })
    expect(rows.find((r) => r.kind === 'below')?.title).toBe('On the ground in Louisville')
    expect(rows.find((r) => r.kind === 'distance')?.title).toMatch(/^[\d,]+ mi to go$/)
    expect(tripSoFar(facts, now).flights).toEqual([])
    expect(latestEvent(facts, now)).toBeNull()
    expect(cardSummary(facts, now, 'Alex')).toMatch(/^UPS1234 to Philadelphia, on the ground in Louisville\. Lands (at|about) .* your time\. Tracked live\. Opens the full map\.$/)
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/facts/liveOrScheduledFacts.test.ts`
Expected: FAIL: no `source` row, the headline still "Over Alpha…", and so on.

- [ ] **Step 3: Add the facts' words**

In `src/copy/facts.ts`, after `stillOnGroundText`:

```ts
/**
 * In place of what's below, a real plane seen at its gate before the plan's takeoff: "On the ground in Louisville" (live
 * or scheduled design §4.2).
 */
export const onTheGroundText = (city: string) => `On the ground in ${city}`

/**
 * In place of what's below, a flight by the schedule alone before its takeoff: "Scheduled to take off about 3:14 PM L"
 * (§4.2). The time is the gate's plus the map's own taxi allowance, so "about".
 */
export const scheduledTakeoffText = (takeoff: number, viewerTz: string, h24: boolean) => `Scheduled to take off about ${yours(takeoff, viewerTz, h24)}`

/** The second line of the facts' first row for a flight by the schedule alone, as the schedule's plane's popup says it (§4.1). */
export const NOT_TRACKED_LINES = ['Shown where the schedule has it', "If it's running late, it may still be at the gate"]
```

- [ ] **Step 4: Add the source row's kind**

In `src/facts/factRow.ts`, change the in-flight kinds:

```ts
  // In flight (§5.1): first, how the flight is known now (live or scheduled design §4.1), with the plane's row for a
  // flight with live data (Stage 3 spec §8): "Boeing 767-300 · N370UP", and the takeoff row just above the landing row
  // (time labels design §3.3)
  | 'source' | 'below' | 'plane' | 'sky' | 'distance' | 'takeoff' | 'headed'
```

and `TripSoFarFlight.tag`'s comment: `"In the air now" for the flight between its gates, which the list sets apart, "By the schedule" for one known by the schedule alone, or "Landed". Null for any other.`

- [ ] **Step 5: Change the facts in `tripFacts.ts`**

In `src/facts/tripFacts.ts`:

Imports: from `'../copy/facts'` drop nothing and add `onTheGroundText`, `scheduledTakeoffText`; from `'../copy/tripMap'` add `BY_THE_SCHEDULE`, `spokenDueClause`, `spokenSource`; from `'../map/tripMap'` drop `legReturned` and `legStillOnGround`; add:

```ts
import { scheduledTakeoff } from '../map/flightProgress'
import { isBySchedule, isSeenAtDeparture, legAtDeparture, legTracking, type AtDeparture } from '../map/flightTracking'
```

Replace `isStillOnGround` and `atDepartureText` with:

```ts
/**
 * Whether `leg`, the leg between its gates at `t`, is on the ground at its departure airport, and how that's told (live
 * or scheduled design §3): by the schedule before its takeoff, or its real plane seen there. The facts then say so in
 * place of what's below, count nothing as flown, and pass nothing. Now only: a replay reads where the map has the plane.
 */
export function atDepartureOf(facts: TripFacts, leg: MapLeg, t: number): AtDeparture | null {
  return facts.isReplay ? null : legAtDeparture(leg, t)
}

/**
 * What the facts say in place of what's below while `atDepartureOf` holds (§4.2): "Scheduled to take off about 3:14 PM
 * L", "On the ground in Louisville", "Still on the ground in Louisville" (the website's own, Todd, 16 Nov 2026), or
 * "Returned to Rockford" (air return design §3).
 */
export function atDepartureText(at: AtDeparture, leg: MapLeg, viewerTz: string, h24: boolean): string {
  switch (at) {
    case 'due':
      return scheduledTakeoffText(scheduledTakeoff(leg.start, leg.end), viewerTz, h24)
    case 'atGate':
      return onTheGroundText(leg.origin.city)
    case 'stillAtGate':
      return stillOnGroundText(leg.origin.city)
    case 'returned':
      return returnedText(leg.origin.city)
  }
}

/**
 * Whether `leg`'s guessed times at `t` are the schedule's alone (§5): it's between its gates now and known by the
 * schedule. Its events, halfway and closest point to home then read "about", as an unseen stretch's do. Now only, and
 * only the flight between its gates: earlier flights, the recap and a replay read as before.
 */
export function isGuessedFromSchedule(facts: TripFacts, leg: MapLeg, t: number): boolean {
  return !facts.isReplay && isMoving(leg, t) && isBySchedule(legTracking(leg, t))
}
```

In `toldMilestones`, after `const all = factsMilestones(facts, leg)`:

```ts
  // Nobody saw a flight by the schedule alone: each of its events is the schedule's guess (live or scheduled design §5).
  if (isGuessedFromSchedule(facts, leg, t)) return all.map((m) => ({ ...m, isEstimate: true }))
```

In `headline`, replace `if (isStillOnGround(facts, leg, t)) return atDepartureText(leg, t)` with:

```ts
  const at = atDepartureOf(facts, leg, t)
  if (at) return atDepartureText(at, leg, facts.viewerTz, facts.h24)
```

In `latestEvent`, replace `isStillOnGround(facts, leg, t)` with `atDepartureOf(facts, leg, t) != null`.

In `tripSoFar`, replace the `started` and `tag` lines:

```ts
  // A real plane seen at its departure airport is left out until it takes off; one due by the schedule is listed.
  const started = facts.map.legs.filter((l) => l.kind === 'flight' && l.start <= t && !isSeenAtDeparture(atDepartureOf(facts, l, t))).reverse()
```

```ts
    const tag = !isMoving(leg, t) ? null : isLandedBeforeGate(facts, leg, t) ? LANDED_TAG : flightTag(facts, leg, t)
```

and add before `tripSoFar`:

```ts
/**
 * The tag on the flight between its gates (live or scheduled design §4.1, §6): "By the schedule" for one known by the
 * schedule alone, now, or with no real path, in a replay; else "In the air now", or "In the air" in a replay.
 */
function flightTag(facts: TripFacts, leg: MapLeg, t: number): string {
  const bySchedule = facts.isReplay ? leg.flight?.path.isReal !== true : isBySchedule(legTracking(leg, t))
  return bySchedule ? BY_THE_SCHEDULE : inTheAirTag(facts.isReplay)
}
```

Update `tripSoFar`'s comment: "…its flight is left out until it takes off, with no "In the air now"" now reads "a real plane seen at its departure airport, before or after the plan's takeoff time, …", and add "A flight by the schedule alone is tagged "By the schedule" (live or scheduled design §4.1)."

In `cardSummary`, replace from `if (live) return …` to the end of the `if (leg)` block:

```ts
    const source = spokenSource(leg, now)
    if (live) return [live, source, ending].filter(Boolean).join(' ')
    // By the schedule alone (live or scheduled design §7): when it's due to take off, else what's below, then the source.
    const due = spokenDueClause(leg, now, viewerTz, h24)
    const over = !due && place ? `, over ${place.name}` : ''
    const lands = `${lead} ${leg.destination.city}${due}${over}. Lands at ${shortTimeText(leg.end, viewerTz, h24)} your time.`
    return [lands, source, ending].filter(Boolean).join(' ')
```

Add `isMoving` to the `'../map/tripMap'` import if it isn't there (it is: `isMoving` is imported already).

- [ ] **Step 6: Change the rows in `tripFactsRows.ts`**

In `src/facts/tripFactsRows.ts`:

Imports: from `'../copy/facts'` add `NOT_TRACKED_LINES`; from `'../copy/tripMap'` add `NOT_TRACKED_LIVE`, `TRACKED_LIVE`; from `'./tripFacts'` replace `atDepartureText, … isStillOnGround` with `atDepartureOf, atDepartureText, isGuessedFromSchedule` (keep the others); add `import { legTracking } from '../map/flightTracking'`.

`flightRows`:

```ts
function flightRows(facts: TripFacts, leg: MapLeg, t: number, now: number): FactRow[] {
  const plane = legPlane(leg, t, facts.isReplay)
  return [
    sourceRow(facts, leg, t), belowRow(facts, leg, t), planeRow(leg, plane), skyRow(facts, leg, t), distanceRow(facts, leg, plane, t),
    takeoffRow(facts, leg, t), headedRow(facts, leg, t, now),
  ].filter(notNull)
}

/**
 * How the flight is known now (live or scheduled design §4.1): "Tracked live" while Crewlu Cloud sees it, "Not tracked
 * live" with why the plane may not be where it's drawn by the schedule alone. None for a best guess, whose place has
 * "Last tracked near …" under it, while the first answer is on its way, and in a replay.
 */
function sourceRow(facts: TripFacts, leg: MapLeg, t: number): FactRow | null {
  if (facts.isReplay) return null
  switch (legTracking(leg, t)) {
    case 'live':
      return factRow('source', 'Broadcast', TRACKED_LIVE)
    case 'notTracked':
      return factRow('source', 'CalendarBlank', NOT_TRACKED_LIVE, NOT_TRACKED_LINES)
    default:
      return null
  }
}
```

`belowRow`:

```ts
function belowRow(facts: TripFacts, leg: MapLeg, t: number): FactRow | null {
  if (isLandedBeforeGate(facts, leg, t)) return factRow('below', 'MapPin', landedText(leg.destination.city))
  const at = atDepartureOf(facts, leg, t)
  const where = at ? atDepartureText(at, leg, facts.viewerTz, facts.h24) : belowText(facts, leg, t)
  const lines = [where, lastSeenText(facts, leg, t), closestToHomeLine(facts, leg, t)].filter(notNull)
  // Due to take off by the schedule, the row is the takeoff's (live or scheduled design §4.2).
  return lines.length > 0 ? factRow('below', at === 'due' ? 'AirplaneTakeoff' : 'MapPin', lines[0], lines.slice(1)) : null
}
```

In `closestToHomeLine`, replace `const onGround = isStillOnGround(facts, leg, t)` and the return:

```ts
  const onGround = atDepartureOf(facts, leg, t) != null
  if (onGround && time <= t) return null
  const isGuess = onGround || isGuessedFromSchedule(facts, leg, t) || !isSeenAt(leg, distance)
  return closestToHomeText(roundedMiles(closest.meters), time, t, facts.viewerTz, facts.h24, isGuess)
```

In `skyRow`, replace `isStillOnGround(facts, leg, t)` with `atDepartureOf(facts, leg, t) != null`.

In `distanceRow`, replace `const onGround = isStillOnGround(facts, leg, t)` with `const onGround = atDepartureOf(facts, leg, t) != null`, and the halfway line's last argument `onGround || !isSeenAt(leg, length / 2)` with `onGround || isGuessedFromSchedule(facts, leg, t) || !isSeenAt(leg, length / 2)`.

In `takeoffRow`, replace `isStillOnGround(facts, leg, t)` with `atDepartureOf(facts, leg, t) != null`.

Update each changed function's comment where it says "a real plane still at its departure airport" to "a plane on the ground at its departure airport (live or scheduled design §3)".

- [ ] **Step 7: Run it to see it pass**

Run: `npx vitest run tests/facts/liveOrScheduledFacts.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `src/`. Errors in `tests/` naming `isStillOnGround`, `atDepartureText` or `stillOnGroundIn` are fixed in Task 9.

---

### Task 7: The status sentence (§4)

**Files:**
- Modify: `src/engine/liveLegs.ts`, `src/copy/narrative.ts`, `src/ui/StatusScreen.tsx`, `src/ui/PilotPages.tsx`
- Test: `tests/engine/liveLegs.test.ts`, `tests/copy/narrativeAway.test.ts`, `tests/ui/livePages.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `tests/engine/liveLegs.test.ts` (add the imports it lacks: `buildLegs` from `'../../src/engine/legs'`, `atGateFlight, liveMapFlights, scheduleOnlyFlight` from `'../../src/engine/liveLegs'`, `type LiveFlight` from `'../../src/map/liveFlight'`, `atTheGate, FLYING, placeOf, SCHEDULE` from `'../map/liveTrip'`, `MINUTE, START` from `'../map/madeUpFlights'`):

```ts
describe('the flight by the schedule alone, and the one at its gate, for the status sentence (live or scheduled design §4)', () => {
  const legs = buildLegs(SCHEDULE)
  const flightsWith = (live: LiveFlight | null) => liveMapFlights(SCHEDULE, new Map(live ? [['f1', live]] : []), 0, placeOf)
  const when = (minutes: number) => START + minutes * MINUTE

  it('names a flight with no live data, due before the schedule’s takeoff and not after', () => {
    expect(scheduleOnlyFlight(legs, flightsWith(null), when(5))).toEqual({ id: 'f1', isDue: true })
    expect(scheduleOnlyFlight(legs, flightsWith(null), when(30))).toEqual({ id: 'f1', isDue: false })
  })

  it('names one whose fix on the ground is over 3 minutes old, and none Crewlu Cloud sees or has a best guess of', () => {
    expect(scheduleOnlyFlight(legs, flightsWith(atTheGate(5)), when(9))).toEqual({ id: 'f1', isDue: true })
    expect(scheduleOnlyFlight(legs, flightsWith(atTheGate(5)), when(5))).toBeNull()
    expect(scheduleOnlyFlight(legs, flightsWith(FLYING), when(59))).toBeNull()
    expect(scheduleOnlyFlight(legs, flightsWith(FLYING), when(62))).toBeNull()
  })

  it('names none outside the gate times', () => {
    expect(scheduleOnlyFlight(legs, flightsWith(null), when(-5))).toBeNull()
    expect(scheduleOnlyFlight(legs, flightsWith(null), when(120))).toBeNull()
  })

  it('names the flight whose real plane is at its gate before the plan’s takeoff, and not after it', () => {
    expect(atGateFlight(legs, flightsWith(atTheGate(5)), when(5))).toBe('f1')
    expect(atGateFlight(legs, flightsWith(atTheGate(25)), when(25))).toBeNull()
    expect(atGateFlight(legs, flightsWith(null), when(5))).toBeNull()
    expect(atGateFlight(legs, flightsWith(FLYING), when(59))).toBeNull()
  })
})
```

Add to `tests/copy/narrativeAway.test.ts`:

```ts
describe('narrative for a flight by the schedule alone (live or scheduled design §4)', () => {
  const driver = engineFor(demoRaw('driver', A))
  const snapAt = (e: ReturnType<typeof engineFor>, minutes: number) => makeSnapshot(e.schedule, e.legs, at(minutes), NY)
  /** The sentence at `minutes`, with the flight under way by the schedule alone, due to take off or not. */
  const bySchedule = (e: ReturnType<typeof engineFor>, minutes: number, isDue: boolean, more: Partial<NarrativeCtx> = {}) => {
    const snap = snapAt(e, minutes)
    return plain(narrative(snap, { ...ctx(minutes), scheduleOnlyFlight: { id: (snap.status.current as MoveLeg).id, isDue }, ...more }))
  }

  it('says the pilot should be flying, and that it isn’t tracked live, after the schedule’s takeoff', () => {
    expect(bySchedule(driver, 100, false))
      .toBe('Alex should be flying to Rockford on UPS flight 2961 from Louisville — not tracked live — landing in 50m which is 8:00 AM L.')
  })

  it('leaves out "not tracked live" while Crewlu Cloud’s first answer is on its way', () => {
    expect(bySchedule(driver, 100, false, { isAwaitingLive: true }))
      .toBe('Alex should be flying to Rockford on UPS flight 2961 from Louisville — landing in 50m which is 8:00 AM L.')
  })

  it('says the pilot is due to take off before it', () => {
    expect(bySchedule(driver, 65, true))
      .toBe('Alex is due to take off from Louisville on UPS flight 2961 to Rockford — landing in 1h 25m which is 8:00 AM L.')
  })

  it('says so of a delayed flight, keeping its red countdown', () => {
    expect(bySchedule(driver, 1700, false))
      .toBe('Alex was delayed in Anchorage and should be flying to Louisville on UPS flight 2962 — not tracked live — landing in 3h 20m which is 1:10 PM L.')
    expect(bySchedule(driver, 1700, true))
      .toBe('Alex was delayed in Anchorage and is due to take off on UPS flight 2962 to Louisville — landing in 3h 20m which is 1:10 PM L.')
  })

  it('says "should be riding" of a deadhead', () => {
    const deadhead = engineFor(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX').trip('t1', {
        dutyPeriods: [{ start: 0, end: 400, flights: [{ dep: 'SDF', arr: 'ANC', out: 30, in: 330, dh: true }] }],
      }).build(),
    )
    expect(bySchedule(deadhead, 270, false))
      .toBe('Alex should be riding to Anchorage on UPS flight 1000 from Louisville — not tracked live — landing in 1h 0m which is 11:00 AM L.')
  })

  it('says the pilot is on the ground of a real plane seen at its gate before the plan’s takeoff', () => {
    const snap = snapAt(driver, 65)
    expect(plain(narrative(snap, { ...ctx(65), atGateFlight: (snap.status.current as MoveLeg).id })))
      .toBe('Alex is on the ground in Louisville on UPS flight 2961 to Rockford — landing in 1h 25m which is 8:00 AM L.')
  })

  it('says flying, as before, of a flight Crewlu Cloud sees', () => {
    expect(plain(narrative(snapAt(driver, 100), ctx(100))))
      .toBe('Alex is flying to Rockford on UPS flight 2961 from Louisville — landing in 50m which is 8:00 AM L.')
  })
})
```

In `tests/ui/livePages.test.tsx`, add `import type { LivePlane } from '../../src/ui/hooks/useLivePlane'`, change `page`'s parameter to `(live: LivePlane | null)`, and add:

```ts
describe('the status page by the schedule alone (live or scheduled design §2, §4)', () => {
  it('says nothing of where the flight comes from while Crewlu Cloud’s first answer is on its way', () => {
    const container = page({ flights: new Map(), clockOffset: 0, isAwaiting: true })
    expect(container.querySelector('.inflight-status')).toBeNull()
    expect(container.querySelector('.narrative-text')?.textContent)
      .toMatch(/^Alex should be flying to Philadelphia on UPS flight 1234 from Louisville — landing in /)
  })

  it('says "Not tracked live" on the bar and in the sentence once it has answered with nothing', () => {
    const container = page({ flights: new Map(), clockOffset: 0 })
    expect(container.querySelector('.inflight-status')?.textContent).toBe('Not tracked live')
    expect(container.querySelector('.narrative-text')?.textContent)
      .toMatch(/^Alex should be flying to Philadelphia on UPS flight 1234 from Louisville — not tracked live — landing in /)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/engine/liveLegs.test.ts tests/copy/narrativeAway.test.ts tests/ui/livePages.test.tsx`
Expected: FAIL: `scheduleOnlyFlight` and `atGateFlight` aren't exported, the narrative says "is flying", and the page says "In flight".

- [ ] **Step 3: Name the flights in `liveLegs.ts`**

In `src/engine/liveLegs.ts`, change the `'../map/mapFlight'` import to add `isAtGate, isNotLive`, and add `import { scheduledTakeoff } from '../map/flightProgress'`. At the end of the file:

```ts
/** The flight under way known by the schedule alone, by its leg's id, and whether it's before the schedule's takeoff. */
export interface ScheduleOnlyFlight {
  id: string
  isDue: boolean
}

/**
 * The flight between its gates at `now` known by the schedule alone (live or scheduled design §2, §4): Crewlu Cloud
 * answered nothing for it, or last saw it on the ground over 3 minutes ago. The narrative says "should be flying … — not
 * tracked live —", or "is due to take off" before the schedule's takeoff. Null with no such flight.
 */
export function scheduleOnlyFlight(legs: Leg[], flights: ReadonlyMap<string, MapFlight>, now: number): ScheduleOnlyFlight | null {
  const leg = legs.find((l) => isMove(l) && !l.ground && l.start <= now && now < l.end)
  if (!leg) return null
  const flight = flights.get(leg.id)
  if (flight && !isNotLive(flight, now)) return null
  return { id: leg.id, isDue: now < scheduledTakeoff(leg.start, leg.end) }
}

/**
 * The flight between its gates at `now` whose real plane is seen at its departure airport before the plan's takeoff, by
 * its leg's id: the narrative says "is on the ground in" (live or scheduled design §4.2). Null with no such flight.
 */
export function atGateFlight(legs: Leg[], flights: ReadonlyMap<string, MapFlight>, now: number): string | null {
  if (flights.size === 0) return null
  const leg = legs.find((l) => {
    const flight = isMove(l) && l.start <= now && now < l.end ? flights.get(l.id) : undefined
    return flight != null && isAtGate(flight, now)
  })
  return leg ? leg.id : null
}
```

- [ ] **Step 4: Write the sentences in `narrative.ts`**

In `src/copy/narrative.ts`, add `import type { ScheduleOnlyFlight } from '../engine/liveLegs'`, and to `NarrativeCtx`:

```ts
  /**
   * The flight under way, by its leg's id, while its real plane is seen at its departure airport before the plan's
   * takeoff: the sentence says "is on the ground in" (live or scheduled design §4.2).
   */
  atGateFlight?: string | null
  /**
   * The flight under way known by the schedule alone, and whether it's before the schedule's takeoff (live or scheduled
   * design §4): the sentence says "should be flying … — not tracked live —", or "is due to take off".
   */
  scheduleOnlyFlight?: ScheduleOnlyFlight | null
  /** Crewlu Cloud hasn't answered since the page opened: the sentence leaves out "not tracked live" (§2). */
  isAwaitingLive?: boolean
```

In the `'inFlight'` case, after the `stillOnGroundFlight` branch, add:

```ts
      // Seen at its gate before the plan's takeoff: "Alex is on the ground in Louisville on UPS flight 70 to Honolulu —
      // landing in 8h 59m which is 12:11am EST." (live or scheduled design §4.2).
      if (ctx.atGateFlight === f.id) {
        return n.t(`${name} is on the ground in `).b(city(f.dep)).t(`${fl || ' on the flight'} to `).b(city(f.arr))
          .t(' — landing in ').cd(f.end, delay ? changed : 'status').t(' which is ').time(f.end).t('.').spans
      }
```

After the `landedFlight` branch, replace the two closing returns (the `if (delay)` one and the last one) with:

```ts
      const bySchedule = ctx.scheduleOnlyFlight?.id === f.id ? ctx.scheduleOnlyFlight : null
      // By the schedule alone, before its takeoff: "Alex is due to take off from Louisville on UPS flight 70 to Honolulu —
      // landing in …" (live or scheduled design §4.2).
      if (bySchedule?.isDue) {
        const lead = delay
          ? n.t(`${name} ${early ? 'pushed early' : 'was delayed'} in `).b(city(f.dep)).t(' and is due to take off')
          : n.t(`${name} is due to take off from `).b(city(f.dep))
        return lead.t(`${fl || ' on the flight'} to `).b(city(f.arr)).t(' — landing in ').cd(f.end, delay ? changed : 'status')
          .t(' which is ').time(f.end).t('.').spans
      }
      // After it: "Alex should be flying to Honolulu on UPS flight 70 from Louisville — not tracked live — landing in …"
      // (§4.1), without "not tracked live" while Crewlu Cloud's first answer is on its way (§2).
      const being = bySchedule ? `should be ${verb}` : `is ${verb}`
      const untracked = bySchedule && !ctx.isAwaitingLive ? ' — not tracked live' : ''
      if (delay) {
        return n.t(`${name} ${early ? 'pushed early' : 'was delayed'} in `).b(city(f.dep)).t(` and ${being} to `).b(city(f.arr))
          .t(`${fl}${untracked} — landing in `).cd(f.end, changed).t(' which is ').time(f.end).t('.').spans
      }
      return n.t(`${name} ${being} to `).b(city(f.arr)).t(`${fl} from `).b(city(f.dep)).t(`${untracked} — landing in `).cd(f.end)
        .t(' which is ').time(f.end).t('.').spans
```

- [ ] **Step 5: Pass the context on**

In `src/ui/StatusScreen.tsx`, add `import type { ScheduleOnlyFlight } from '../engine/liveLegs'` and to `StatusScreenProps` after `landedFlight`:

```ts
  /** The flight under way, by its leg's id, while its real plane is at its gate before the plan's takeoff (live or scheduled design §4.2). */
  atGateFlight?: string | null
  /** The flight under way known by the schedule alone, and whether it's due to take off (live or scheduled design §4). */
  scheduleOnlyFlight?: ScheduleOnlyFlight | null
  /** Crewlu Cloud hasn't answered since the page opened (live or scheduled design §2). */
  isAwaitingLive?: boolean
```

and in the `safeNarrative` call add `atGateFlight: p.atGateFlight, scheduleOnlyFlight: p.scheduleOnlyFlight, isAwaitingLive: p.isAwaitingLive`.

In `src/ui/PilotPages.tsx`, add `atGateFlight, scheduleOnlyFlight` to the `'../engine/liveLegs'` import. After `const minute = …`:

```ts
  // Crewlu Cloud hasn't answered since the page opened: nothing yet says where a flight comes from (live or scheduled design §2).
  const isAwaitingLive = live?.isAwaiting === true
```

Change the trip map line to `const tripMap = snap ? tripMapFor(snap, ready?.legs ?? [], airports, ready?.flights, isAwaitingLive) : null`. After `const down = …`:

```ts
  // The flight under way seen at its gate before the plan's takeoff, and the one by the schedule alone: the narrative
  // says "is on the ground in", "is due to take off" or "should be flying" (live or scheduled design §4).
  const atGate = ready ? atGateFlight(ready.legs, ready.flights, now) : null
  const bySchedule = ready ? scheduleOnlyFlight(ready.legs, ready.flights, now) : null
```

and add `atGateFlight: atGate, scheduleOnlyFlight: bySchedule, isAwaitingLive` to `status`.

- [ ] **Step 6: Run them to see them pass**

Run: `npx vitest run tests/engine/liveLegs.test.ts tests/copy/narrativeAway.test.ts tests/ui/livePages.test.tsx`
Expected: the new tests PASS. Older tests in `livePages.test.tsx` that expect "In flight" or "Alex is flying to" by the schedule alone fail: Task 9 changes them.

---

### Task 8: A demo scene for the schedule's plane at its gate

**Files:**
- Modify: `src/data/demo.ts`, `README.md`
- Test: `tests/data/demoScenes.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/data/demoScenes.test.ts`, add to `EXPECTED` after `'live-returned'`:

```ts
  // The schedule's plane alone, 5 minutes after its gate time: "Scheduled to take off about …" (live or scheduled design §4.2).
  'schedule-at-gate': 'inFlight',
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx tsc --noEmit -p . 2>&1 | grep demoScenes; npx vitest run tests/data/demoScenes.test.ts`
Expected: a type error, `'schedule-at-gate'` isn't a `DemoScene`.

- [ ] **Step 3: Add the scene**

In `src/data/demo.ts`, add `| 'schedule-at-gate'` to `DemoScene`'s last line, and to `DEMO_SCENES` after `'live-returned'`:

```ts
  // The schedule's plane alone, 5 minutes after the Louisville gate and 10 before its takeoff: "Not tracked live" and
  // "Scheduled to take off about …" (live or scheduled design §4.2).
  'schedule-at-gate': { variant: 'driver', offset: 65 },
```

In `README.md`, after the line about the real plane's scenes, add:

```md
  - With no live data, a flight says so: "Not tracked live" on the pill and the card, and "Scheduled to take off about …" until the schedule's takeoff, `schedule-at-gate` (Crewluv's `docs/superpowers/specs/2026-11-25-crewluve-live-or-scheduled-design.md`).
```

and change "`flying` stays the schedule's alone." to "`flying` stays the schedule's alone, not tracked live."

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run tests/data/demoScenes.test.ts`
Expected: PASS.

---

### Task 9: The old expectations the spec changes

**Files:** the tests below.

The spec changes these words for a flight with no live data, now: "In flight" becomes "Not tracked live"; "UPS207 · In flight" becomes "UPS207 · Not tracked live"; the list's "In the air now" becomes "By the schedule"; the card's "Estimated from the schedule." becomes "Not tracked live, so it's shown where the schedule has it."; its event times, halfway and closest point to home gain "about" ("12 min ago" becomes "About 12 min ago", "12 minutes ago" becomes "about 12 minutes ago"); its rows start with the `source` row; and "Alex is flying to" becomes "Alex should be flying to … — not tracked live —". For a real plane seen in the air, "14 min ahead" gains "Live · ", and the card's sentence gains "Tracked live." before what it opens. A real plane at its gate before the plan's takeoff is now on the ground: left out of the list.

- [ ] **Step 1: Run the whole suite**

Run: `npm test 2>&1 | grep -E "FAIL|✗|×" | head -60`

- [ ] **Step 2: Change each failure that one of the changes above explains**

These are known:
- `tests/copy/tripMap.test.ts:98`: `Estimated from the schedule.` → `Not tracked live, so it's shown where the schedule has it.`
- `tests/facts/tripFacts.test.ts:100`, `:234`, `:239`: the same, and `:234`'s `crossed into Bravo, 10 minutes ago` → `crossed into Bravo, about 10 minutes ago`.
- `tests/facts/tripFacts.test.ts:162`, `:173`, `:177`, `:185`: the flight between its gates' tag `'In the air now'` → `'By the schedule'`.
- `tests/facts/liveTripFacts.test.ts:492`: a real plane at its gate before the plan's takeoff is left out: `.toEqual(['In the air now'])` → `.toEqual([])`, and the comment above it: "Before the plan's takeoff it's at its gate too, and left out (live or scheduled design §3)."
- `tests/ui/latestEventBanner.test.tsx:101`: `Estimated from the schedule\. Latest: crossed into Bravo, 12 minutes ago\.` → `Not tracked live, so it's shown where the schedule has it\. Latest: crossed into Bravo, about 12 minutes ago\.`, and the banner's `12 min ago` → `About 12 min ago` in the same test.
- `tests/ui/livePages.test.tsx:61`, `:69`: `'In flight'` → `'Not tracked live'`; `:106` (no live data): `/^Alex is flying to Philadelphia …/` → `/^Alex should be flying to Philadelphia on UPS flight 1234 from Louisville — not tracked live — /`.
- `tests/ui/liveMapPage.test.tsx:42-44`: the test's name → `'says "Not tracked live" with no live data'`, and `'In flight'` → `'Not tracked live'`; `:103-108`: `'In flight'` for the flight with no live data → `'Not tracked live'`.
- `tests/map/liveTripMap.test.ts`: done in Task 5.
- Any test importing `isStillOnGround`, `atDepartureText(leg, t)` or `stillOnGroundIn`: use `atDepartureOf(facts, leg, t) != null`, `atDepartureText(at, leg, tz, h24)` or `atDepartureAirport`.

For any other failure: read it. If one of the changes above explains it, change the expectation the same way. If none does, stop: it's a bug in Tasks 1 to 8, not an old expectation. Fix the code, not the test.

- [ ] **Step 3: Run the whole suite**

Run: `npm test 2>&1 | tail -6`
Expected: all passing.

---

### Task 10: Type-check and build

- [ ] **Step 1: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Build**

Run: `npx vite build 2>&1 | tail -3`
Expected: `✓ built in …`. (`npm run build` refuses a build carrying a local MapKit token; `vite build` alone checks the bundle.)

---

### Task 11: See it

- [ ] **Step 1: Start the dev server**

Use the Browser pane's `preview_start` with the `crewluve` configuration (port 5180).

- [ ] **Step 2: Look at each scene's full map and status page**

Open each and read the pill, the facts' first rows, the list's tag, the line under the timeline, and the status sentence:
- `http://localhost:5180/?demo=1&scene=schedule-at-gate#map`: "Not tracked live" on the pill; "Not tracked live" row; "Scheduled to take off about … L"; "… mi to go"; no sky row; the list "By the schedule"; under the timeline "Scheduled to fly to Rockford". Status page: "Alex is due to take off from Louisville on UPS flight 2961 to Rockford — …".
- `?demo=1&scene=flying#map`: "Not tracked live"; what's below; events "about"; "Should be flying to Rockford"; "Alex should be flying to Rockford … — not tracked live — …".
- `?demo=1&scene=live-ahead#map`: "UPS… · Live · … ahead"; "Tracked live" row; "In the air now".
- `?demo=1&scene=live-on-ground-late#map`: "Live · Still on the ground · 20 min behind"; "Still on the ground in Rockford".
- `?demo=1&scene=live-ocean-gap#map`: "About … ahead"; no source row; "Last tracked near …".

- [ ] **Step 3: Check the card's bar on a narrow phone**

`resize_window` preset `mobile`, open `?demo=1&scene=live-on-ground-late`, and look at the map card's bar: "Live · Still on the ground · 20 min behind" beside "Lands about …". If it overflows or clips, stop and show Todd a screenshot before changing any CSS. Reset with preset `desktop`.

---

### Task 12: Hand off

- [ ] **Step 1: Report to Todd** what changed, the test count, and the screenshots. Commit nothing: Todd says when, and the app's plan follows once the website's words are settled.
