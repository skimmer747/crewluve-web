# Crewluve Web — Part C leftovers: longitude spelled one way, and one source for the delay

Status: chosen by the user on 2026-10-13, after their own Safari check on iPhone and iPad found nothing to fix. Everything through Redraws is live (`46495f0`). These are the last two items in Part C's "Left for later" (the Execution notes of `docs/superpowers/plans/2026-10-11-crewluve-web-slice2c-inflight-map.md`), carried in every roadmap since.

## 1. Goal

- **Longitude is spelled `lng` wherever a place passes from one file to another,** as the airport list, `sun.ts` and the weather already spell it.
- **The in-flight card's delay banner reads the snapshot's delay,** the one the sentence under the pilot's name reads.
- **Nothing on screen changes.**

## 2. Why

- **Two spellings for one thing invite mix-ups where they meet.** `GeoPoint` spells it `lon`, so the one line that turns an airport into a map point reads `{ lat: airport.lat, lon: airport.lng }`.
- **The banner and the sentence agree today only because they repeat the same sum.** `inFlightFacts` works out the delay with `departureOffset` itself, as `makeSnapshot` does for `snap.delay`. Reading `snap.delay` makes them agree by construction.

## 3. Scope

- **In:** `GeoPoint`'s field renamed; `inFlightFacts` reading `snap.delay`; their tests.
- **Not in:**
  - **The map's own names** (`lon1`, `minLon`, `maxLon`, `lonSpan`, `lonOffset`, `boxLongitude(lon, …)`, and `MapBounds`' fields). They follow the app's `FlightRouteMapView` line for line, which spells them so (`lon1`, `minLon`, `lonSpan`), and a line-for-line comparison with the app is worth more than one spelling inside the map's own file.
  - **The sun dial's use of `departureOffset`** (`bigDial.ts`, `sunDetail.ts`). It works from the next departure's two times, which it draws, not from the snapshot's flight.

## 4. The design

### 4.1 Longitude

- **`GeoPoint` becomes `{ lat, lng }`.** Every `.lon` on a `GeoPoint` becomes `.lng`: in `flightMapGeometry.ts`, `flightSky.ts`, `FlightMap.tsx` and `inFlightFacts.ts`, and in the five test files that build points.
- **`inFlightFacts`' airport line becomes `{ lat: airport.lat, lng: airport.lng }`.**

### 4.2 The delay

- **`inFlightFacts` returns `delayMinutes: snap.delay?.minutes ?? null`,** and no longer imports `departureOffset`.
- **It's always the same flight.** While the pilot is in the air, `relevantDelay` takes the current leg (`c && isMove(c) ? c`), and `inFlightFacts` only answers when the status is in flight and its current leg is a move. So it doesn't check `snap.delay.flight`.
- **`InFlightFacts.delayMinutes`' comment says it's the snapshot's delay.**

## 5. Testing

- **Red first:** a snapshot whose delay says 25 minutes on the current flight gives facts with 25. Today's code works the delay out from the leg, which is on time, and gives null.
- **Two tests splice a leg into a snapshot,** and the splice leaves the snapshot's delay behind, so they can't work once the delay comes from the snapshot:
  - **"Takes the delay from the departure, not from the landing"** is rebuilt through the engine: a flight that leaves 40 minutes late and lands 10 minutes late gives 40.
  - **"Notes a delay of 15 minutes or more, late or early, and none at 14"** goes. `snapshot.test.ts` already covers the rule, at 15, 14, −15, −14 and 0 (`leaving %i minutes off schedule is flagged…`), and in the air (`is flagged at home, at base, away from base, and in the air`).
- **Longitude:** the existing tests, with `lng`. `tsc` finds any spot missed, and a search confirms no `lon` field is left.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`.
- **Deliberate breaks:** the old delay sum back; `?? null` dropped; the 25 ignored.
- **In the browser:** the demo's flying and delayed scenes show the same map, block time and banner ("DELAYED 40m" in the delayed scene), with no console errors.

## 6. Decisions log

| # | Decision | Source |
|---|---|---|
| 1 | Take up Part C's two leftovers, now that the Safari check found nothing to fix. | User, 2026-10-13 |
| 2 | Rename `GeoPoint`'s field only; the map's own names keep the app's spelling. | Design |
| 3 | The banner reads `snap.delay`, without checking its flight. | Design |

## 7. Roadmap

1. Optionally, the page's scrolling in a hook (a 3B leftover).
2. Then the slice 1 roadmap's web-only ideas, from the 2026-10-08 idea board.
