# The Trip Map's Replay: Short Legs Take at Least 3 Seconds

- **Status:** Design approved in brainstorming on 2026-11-13. The website's half goes on `trip-map-facts`. The app's half is a change to the moving map spec and the app's `TripReplayClock`, made in the Crewluv repo (§5).
- **Changes:** moving map spec §6 (the timeline). In that spec, 1x plays a day in 48 s.

## 1. The problem

At 1x the full map's replay runs at one rate, a day of the trip in 48 seconds (1,800 times real time). That suits a long flight, which takes 16 s for 8 hours. A 25-minute drive to work is over in 0.8 s, and a 50-minute hop in 1.7 s. In that time the camera has framed the leg and moved on before anyone can see the car or the plane move.

## 2. The rule

- **While a leg is moving** (a drive or a flight, from its start to its end), 1x plays at whichever is slower:
  - the normal rate, a day in 48 s;
  - the leg's length spread over 3 s.
- **Between legs,** 1x plays at the normal rate.
- **The speed setting** (1x, 2x, 5x, 10x) multiplies both, as it does now. A 25-minute drive takes 3 s at 1x, 1.5 s at 2x and 0.3 s at 10x.
- **Legs that overlap** in the data: while more than one is moving, the slowest rate wins.
- **A leg with no length** (its end at or before its start) adds no time.
- **Long legs** keep the normal rate. A leg slows only when it would take less than 3 s at 1x, so any leg of 90 minutes or more plays as it does now.

At 1x, a typical trip:

| Part of the trip | Before | After |
|---|---|---|
| Drive to work, 25 min | 0.8 s | 3 s |
| Short flight, 50 min | 1.7 s | 3 s |
| Long flight, 8 h | 16 s | 16 s |
| Layover, 24 h | 48 s | 48 s |
| Drive home, 25 min | 0.8 s | 3 s |

## 3. What stays the same

- **The slider** is in trip time, so dragging, its steps and its labels don't change.
- **Live, play, pause and the speed menu** work as before. Play starts from the trip's start when live or finished.
- **The night** is worked out from trip time. On the website it's redrawn every 3 minutes of trip time at 1x while playing. During a slowed leg that's less often in real time, which is fine.
- **Everything shown at a moment** (the planes, the car, the facts, the camera) depends only on the trip time, so none of it changes.

## 4. The website

- **The pace** (`src/map/replayClock.ts`): built from the map's legs. Its pieces cover the trip, each a stretch of trip time with one rate. It turns real time since play into trip time and trip time back into real time.
- **The clock** keeps its trip-time anchor. `clockTime` and `finishesAt` go through the pace instead of multiplying by one rate. `play`, `pause`, `setSpeed` and `scrub` keep their meaning.
- **It follows the map:** `TripMapPage` already sets the clock's span from the map on each render. It sets the legs the same way, so the pace stays right if the trip changes while the map is open.
- **`REPLAY_BASE_RATE`** stays the normal rate. The night's step still uses it.

## 5. The app

The same rule in the app's `TripReplayClock`, with the same tests. Moving map spec §6 says "At 1x a day passes in 48 s." It gains: "A leg in motion that would take less than 3 s at 1x slows so it takes 3 s; the speed setting multiplies that too." The Crewluv repo is changed only by the session working there.

## 6. Tests

On the website, in `tests/map/replayClock.test.ts`:

- At 1x:
  - a 25-minute drive takes 3 s from its start to its end;
  - a 50-minute flight takes 3 s;
  - an 8-hour flight takes 16 s;
  - a gap between legs runs at the normal rate.
- At 2x, each of those takes half as long.
- With two overlapping legs, the slower rate wins while both are moving.
- A leg with no length adds no time.
- Pausing, or changing speed, in the middle of a slowed leg keeps the same trip time.
- `finishesAt` is when `clockTime` reaches the trip's end, across slowed legs and gaps.
- A replay started partway through a slowed leg takes the rest of that leg's 3 s, not all of it.
