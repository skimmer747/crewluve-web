# Crewluve Web — Back Home In across back-to-back trips

Status: reported by the user on 2026-10-13 with two screenshots taken at 3:36 PM EDT. The app's card said "Back Home In 3d 11h 44m, Sat, Oct 17 at 03:21 · Orlando". The site's card said "Back at Base In 1d 08h 00m, Wed, Oct 14 at 11:37 PM · Louisville". The partner wants to know when the pilot will be home. Everything through the UPS plane icon is live (`f2db00d`).

## 1. Goal

- **When the pilot goes straight from one trip into the next without going home, the away countdown counts to the homecoming after the last of those trips,** as the app does. On 2026-10-13 that is "Back Home In", Sat, Oct 17 at 3:21 AM · Orlando.
- **The home sentence's "Back home in …" ({HB}) follows the same rule,** because it runs the same steps (`nextTripHomecoming`).
- **Nothing else changes.** If no homecoming is logged down the line of trips, the card still says "Back at Base In" or "{City} In", and then shows nothing once that trip lands (C26).

## 2. Why

### 2.1 What the cloud holds

Todd's rows (home MCO, base SDF), from CrewLu Cloud:

| What | When (UTC) | Note |
|---|---|---|
| Commute MCO→SDF, to work | Oct 13 15:32–17:32 | for Z55377 |
| Trip Z55377 | report Oct 13 19:32; SDF→DFW→RFD→ORD; ORD→SDF lands Oct 15 03:37 | ends at base, Wed 11:37 PM EDT |
| Trip Z55423 | report Oct 15 19:20, 15 h 43 m later; SDF→SJU; SJU→SDF lands Oct 17 04:51 | |
| Commute SDF→MCO, to home | Oct 17 05:21–07:21 | for Z55423; lands Sat 3:21 AM EDT |

No ride home is logged between the two trips. He stays in Louisville.

### 2.2 Where the site goes wrong

- §6.5 step 3 picks Z55377 as the current trip.
- Step 4.1 finds no landing at home in it.
- Step 4.2 rejects the commute home, because a ride home must start before any other trip's first leg, and Z55423 comes first.
- Step 4.3 counts to Z55377's last landing, at the base: "Back at Base In".

### 2.3 What the app does

- `TripStateResolver.resolveHomeArrival` splits the legs into blocks wherever two legs are more than 24 h apart (`contiguousSegments`). It then takes the **last** arrival at home in the block that covers now.
- Both trips and the commute home are one block (gaps of 15 h 43 m and 30 min), so the app says Sat 03:21.
- The app's own notes call one side effect of this a known leftover: "C8's 24h segment merge can overshoot homecoming if two trips are <24h apart". When the pilot does go home between two such trips, taking the last arrival home skips the real, earlier one. The site's slice 1 spec avoided that (§6.11, "24-hour block merge overshoot"), and in doing so also lost this case.

### 2.4 Why 24 hours

- **It's the app's line,** so the two agree.
- **Todd's own history shows a longer gap can hide a trip home.** Trip CA02JUN26 landed at SDF on Jun 4 03:52 UTC and the next trip reported Jun 5 06:39, 26.8 h later. No ride home was logged, but a jumpseat MCO→SDF on Jun 5 01:05 shows he went home in between.

## 3. Scope

- **In:** §6.5 gets a new step 4.3 in `arrivalTarget` (`src/engine/targets.ts`); its tests; a pointer in the slice 1 spec's §6.5.
- **Not in:**
  - **The labels.** "Back at Base In" stays where no homecoming is known. The app would say "Louisville In" there, but the user's report is about the date, not the words.
  - **The app's "last arrival home in the block".** The site keeps the first homecoming, so a local pilot whose first trip ends at home is home after that trip.

## 4. The design

### 4.1 The new step

§6.5 step 4 becomes:

1. **Final arrival home** (unchanged).
2. **Ride home** (unchanged).
3. **Straight on to the next trip (new).** The next trip N is the one step 2 stops at: the trip of the earliest leg of another trip (§4.2). If all of these hold, the pilot stays away until N is over, and T's homecoming is N's. Run steps 1–3 on N. If that gives a homecoming → **"Back Home In"**, counting to its end.
   - N's first leg starts no more than 24 h after T's last flight lands. Both are effective times, so a late landing shortens the gap (C1).
   - No standalone flight, jumpseat or drive leaves effHome between T's last landing and N's first leg. A ride from home means he went home.
   - Step 2 found no ride home. A ride home before N is the homecoming.
4. **Final flight still ahead** (was 4.3, unchanged): still counts T's own last flight.
5. **Otherwise → no countdown** (was 4.4, C26).

### 4.2 "Other trips" for N

- Step 2 asks for a ride home that starts before any other trip's first leg. For T this counts the other trips' legs that start after now, as today.
- For N it counts the other trips' legs that start after N's first leg. Counting after now would put T's own remaining legs (while T is still flying) in front of N's ride home.

### 4.3 C14, restated

"Never a leg from the next trip" becomes: **never the next trip's homecoming when the pilot can have gone home in between.** That is, more than 24 h between the trips, or a ride from home logged between them.

### 4.4 What shows

- **The card:** "Back Home In", the house icon, green (red when the homecoming runs 15 min or more late), with the subtitle "Sat, Oct 17 at 3:21 AM · Orlando".
- **The celebration:** unchanged. It shows in the last 24 h, and never while the pilot is at the base.
- **The home sentence:** when the next trip runs straight into another, "Back home in …" names the later homecoming.

## 5. Testing

- **Red first, with Todd's week:** the two trips and the commute home, as in §2.1. In the report window, in the air on the first leg, and at base between the trips, the target is home at Sat 07:21 UTC. Today's code says base at Oct 15 03:37, then nothing.
- **The two C14 tests** move their second trip to more than 24 h after the first lands, so they still show the gate. The 16 h and 20 h gaps they used are exactly this report's case.
- **Edges:**
  - exactly 24 h between the trips chains; a minute more doesn't
  - the gap counts from the actual landing: scheduled 25 h, landing 2 h late, chains
  - a jumpseat from home between the trips stops the chain
  - three trips in a row chain to the ride home after the third
  - N's homecoming can be its own final landing at home
  - no homecoming down the line → still "Back at Base In", then nothing (C26)
  - {HB} at home names the later homecoming
- **Gates:** `npx vitest run`, `npx tsc --noEmit`, `npm run build`.
- **Deliberate breaks:** the 24 h made strict or dropped; the ride-from-home check dropped; N's "other trips" counted from now; the chain stopped after one trip.
- **In the browser:** the demo's scenes look as before (each demo trip has its own ride home), with no console errors.

## 6. Decisions log

| # | Decision | Source |
|---|---|---|
| 1 | Count to the homecoming after back-to-back trips, as the app does. | User, 2026-10-13 |
| 2 | Chain only when the next trip starts within 24 h of the landing (the app's line; Todd's Jun 4–5 trip home at 26.8 h). | Design |
| 3 | A ride from home between the trips stops the chain, so the app's known overshoot doesn't come back. | Design |
| 4 | Keep the first homecoming and the "Back at Base In" label. | Design |

## 7. Roadmap

1. Resume the idea-board brainstorm (recommended: Can I call?).
