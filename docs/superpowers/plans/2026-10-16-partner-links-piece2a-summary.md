# Partner Links Piece 2a: the Summary on Crewlu Cloud — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CrewLu writes the partner summary to Crewlu Cloud, next to the iCloud record and in the shape all three apps share, whenever the pilot is signed in and has Crewlu Cloud partners.

**Architecture:**
- **One seam to Crewlu Cloud.** `PartnerCloudAPI` is a protocol; `LivePartnerCloudAPI` implements it over the Supabase client, and tests use an actor stand-in.
- **A pure encoder.** `PartnerSummaryEncoder` turns a `SharedPilotStatus` and the per-person settings into the cloud JSON. Its contract is `supabase/partner-status/`: a JSON Schema and nine examples, checked by CrewLu's tests and by the SQL tests.
- **The partner list and the writer.** `PartnerCloudStore` keeps the account's partner ids, saved per account. `PartnerSummaryCloudWriter` sends one summary at a time, the newest wins, and skips one that shows partners nothing new.
- **The hook.** `PartnerBeaconAutoSync` hands every summary it makes to the writer, and keeps running while either kind of sharing is on.

**Tech stack:** Swift 5 mode on iOS 18, supabase-swift 2.46.0, XCTest; for the SQL tests, Node's `node:test`, PGlite 0.5.8 and Ajv 8.17.1.

**Design:** `docs/superpowers/specs/2026-10-16-partner-links-piece2-crewlu-design.md` in this repo: §4, §5, §8 and 2a in §9. The API contract is `~/Dev/Duty/supabase/partner-api.md`.

---

## Before you start

- **Two repos.**
  - The code goes in `~/Dev/Duty` (CrewLu).
  - This plan and the spec live in `~/Dev/Crewluve Website`.
  - Paths are relative to `~/Dev/Duty` unless they start with `~`, `$HARNESS` or `$BUILD`.
- **Branch.** Build on `feature/partner-cloud-summary`, cut from `feature/supabase-account-backend` at `282a6cc0` (Task 0).
- **Leave the Xcode scheme files alone.**
  - `~/Dev/Duty` has uncommitted changes to `Duty.xcodeproj/xcshareddata/xcschemes/*` that aren't part of this work.
  - Never run `git add -A` or `git add .` there. Add the exact paths each step lists.
- **Who runs which tests.**
  - **CrewLu's rule:** never run `xcodebuild test`, never boot a simulator, and never build against the copy the user has open in Xcode. The user runs CrewLu's tests (Task 11).
  - **The Mac harness (Task 3)** runs the partner-cloud tests in a small Swift package outside both repos, with stand-ins for the few app types they touch. The test-first steps use it. It boots no simulator and shares no build folder with Xcode.
  - **Two things are checked only in Xcode:** `PartnerCloudErrorTests`, which needs the Supabase SDK, and Task 8's hook, which is in app files the harness can't build.
  - **The SQL tests** run from `~/Dev/Duty/supabase/tests` with `npm test`, in about 20 seconds.
  - **One compile-only build (Task 9)** checks the whole app and its tests, in a separate clone with its own build folder.
- **New files need no project edit.** `Duty/` and `DutyTests/` are synchronized folders, so a new file joins its target by itself. Editor errors such as "Cannot find type" on a new file are a stale index: trust the harness and Task 9.
- **Pick two scratch folders,** outside both repos: one for the harness (`$HARNESS`, Task 3) and one for the compile-only clone (`$BUILD`, Task 9). Shell variables don't carry from one command to the next in Claude's Bash tool, so begin each command that uses them with `export HARNESS=<the folder> &&` (or `BUILD`).
- **If an expected value doesn't match, stop and ask.** Never change a test to make it pass.

## Decisions made while planning

These refine the spec. Task 12 writes them into it.

1. **`PartnerCloudAPI` starts with the three calls 2a uses:** `set_partner_status`, and the `partners` and `partner_devices` reads. Plan 2b adds the partner actions, together with the screens that call them and their tests.
2. **The live version has its own file,** `LivePartnerCloudAPI.swift`. It's the only one that imports the Supabase SDK, so the rest builds and tests without it.
3. **How failures map** (`PartnerCloudError`):

   | What the SDK throws | Becomes |
   |---|---|
   | `PostgrestError` with code `22023`, `PT404`, `PT409` or `PT413` | `refused(code)` |
   | `PostgrestError` with `42501` (no sign-in), `28000` or `PGRST301`–`PGRST303`; `HTTPError` 401 or 403; an `AuthError` that `SupabaseSyncEngine.isSessionRevoked` calls final | `notSignedIn` |
   | `HTTPError` with another 4xx; a `DecodingError` | `refused("HTTP …")` or `refused("decoding")` |
   | anything else: the network, 5xx, other codes, other `AuthError`s | `unavailable` |

   Before each call, the live version asks for the session, which renews it. A sign-in that can't be renewed then shows as `notSignedIn`. Without this, the SDK would send the call without the sign-in.
4. **The partner list saves only the ids, per account** (`partnerCloud.partnerIDs.<account id>` in UserDefaults), so a relaunched app keeps writing before its first refresh. Names, devices and invite tokens stay in memory, because an invite token is a link anyone could use. Signing out deletes every saved list.
5. **A refresh that changes the ids starts the updates** (`syncNowIfSharing`), so a newly signed-in device writes without anyone opening a screen. With no partners the devices aren't read, so a pilot who shares with no one costs one small read per return to the app.
6. **The store starts at the first activation, not at launch.** `DutyApp.init` only registers for it, so launch doesn't make the Supabase client any earlier than today.
7. **`forceUpdate` sends even an unchanged summary,** as it already does for iCloud. A summary Crewlu Cloud refused isn't sent again, even forced.
8. **When the iCloud share ends, the loop keeps going for Crewlu Cloud partners** (`iCloudSharingEnded()`, called by `clearLocalSharingState`). It stops itself once neither kind of sharing is on.
9. **A pilot who shares only through Crewlu Cloud never starts `PilotStatusBeaconManager`.** AutoSync keeps reading the iCloud flag from UserDefaults, and skips the iCloud write and its start-up wait.
10. **The examples** are one made-up schedule at nine moments: Alex lives in Atlanta and flies from Louisville (trip Z55120). All nine carry the same seven legs. The partners are `aaaaaaaa-…` (A) and `bbbbbbbb-…` (B).
11. **The examples test skips on a device.** `#filePath` finds the files only when the tests run on the Mac's simulator (see `DutyTests/Helpers/FixtureLoading.swift`).
12. **The newer-build message, and the screen's use of `problem` and `lastAppliedAt`,** come with the screens in 2b.
13. **Ajv 8.17.1 checks the examples against the schema** in the SQL tests. It's their second dev dependency.
14. **`partner-api.md` is corrected:** the server refuses any field whose name contains `partner`, in any case, not only `ByPartner`.

## The four questions

- **Is this wise?**
  - 2a adds the data path and nothing a pilot sees. Cloud partners only arrive with 2b's invites, so on its own it writes nothing.
  - All three plans ship in one CrewLu release, after Crewluve piece 4 (P2-1).
  - A mistake would show in partners' views, so the shape is pinned by a schema, nine examples and two test suites.
- **Will it break anything?**
  - *iCloud sharing:* the same triggers, the same skip rule and the same writes. The iCloud write now also checks the iCloud flag, which was always on when it ran. The cloud writer returns at once for a pilot who isn't signed in.
  - *Launch:* `DutyApp.init` only adds a notification observer.
  - *Network and battery:* at most one write per changed summary, one at a time, and one or two small reads per return to the app while signed in.
  - *Privacy:* per-person settings go out only under cloud partner ids. The blobs, `__everyone__`, iCloud ids and tickets never do; a test checks each. Invite tokens aren't saved.
  - *Accounts:* ids are kept per account, the owner rule gates every write, and signing out forgets them.
  - *A crash on every update:* nothing new force-unwraps or traps. An encoding failure is logged and skipped.
- **Is this what a brilliant Apple engineer would do?** It reuses the app's own pieces (`SyncOwnerGuard`, `BuildVersionGuard`, `SyncISO`, `debugLog`, today's settings keys), documented SDK calls, Observation and Combine. The encoder is pure, the stand-in is an actor, and nothing depends on undocumented behavior.
- **Does it fix the disease or the symptom?** The disease is iCloud sharing's limits, which the partner-links project as a whole replaces. Within 2a, the quick status reaching everyone (spec §2.3) is fixed at its source, the summary's shape (P2-3), rather than in each app that reads it.

## Not in this plan

- The screens, invites, settings writes and the sign-out question (2b), and the move-over (2c).
- The push service (piece 3), Crewluve (4), the website (5), and removing iCloud sharing (6).
- A retry timer. The 5-minute loop and every other trigger already try again.
- Remembering the last applied summary across launches. The first update after a launch writes once more, which also moves partners' `updated_at` forward.

## How this plan was checked

- **Built test-first in a scratch clone** of `282a6cc0`, outside `~/Dev/Duty`.
- **The Swift tests:** the Mac harness ran all 39 and caught 43 of 43 deliberate breaks, one at a time, in the encoder, the writer, the store and the settings.
- **The SQL tests:** 168 pass. The contract's tests caught 15 of 15 deliberate breaks of the schema and the examples.
- **A replay on a fresh clone of `282a6cc0`:** every Run step gave the result printed here, including each test-first failure, and all 31 files matched the scratch copy byte for byte.
- **The compile-only build (Task 9)** passed on the replayed branch, with only the existing StoreKit warning.

## Files

In `~/Dev/Duty`:

| File | Responsibility |
|---|---|
| `Duty/Utils/PartnerCloud/PartnerCloudAPI.swift` | The seam: `PartnerCloudAPI`, the partner and device rows, `PartnerCloudError` |
| `Duty/Utils/PartnerCloud/LivePartnerCloudAPI.swift` | The live version, over `SupabaseClientProvider.shared`, and how the SDK's errors map |
| `Duty/Utils/PartnerCloud/PartnerSettings.swift` | Reads the per-person settings |
| `Duty/Utils/PartnerCloud/PartnerSummaryEncoder.swift` | Pure: the cloud JSON, and its comparison key |
| `Duty/Utils/PartnerCloud/PartnerCloudStore.swift` | The account's partner list: saved ids, refresh, sign-out |
| `Duty/Utils/PartnerCloud/PartnerSummaryCloudWriter.swift` | When the summary is sent, and what happens to each answer |
| `Duty/Utils/PartnerBeacon/PartnerBeaconAutoSync.swift` (changed) | Runs while either kind of sharing is on; hands each summary to the writer |
| `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift` (changed) | Its stop path keeps the loop for cloud partners |
| `Duty/App/DutyApp.swift` (changed) | Registers the partner list for app activation |
| `DutyTests/Helpers/StubPartnerCloudAPI.swift` | The stand-in API, an actor |
| `DutyTests/Helpers/PartnerSummaryExamples.swift` | The made-up schedule behind the examples |
| `DutyTests/PartnerCloudErrorTests.swift`, `PartnerSettingsTests.swift`, `PartnerSummaryEncoderTests.swift`, `PartnerCloudStoreTests.swift`, `PartnerSummaryCloudWriterTests.swift` | The new tests |
| `DutyTests/PartnerBeaconModeIndependenceTests.swift` (changed) | One more: Crewlu Cloud sharing follows the sign-in |
| `supabase/partner-status/schema.json`, `examples/*.json`, `README.md` | The contract |
| `supabase/tests/partner_status.test.js` | The contract's SQL tests |
| `supabase/tests/package.json`, `package-lock.json` (changed) | Ajv |
| `supabase/tests/README.md`, `supabase/partner-api.md` (changed) | Docs |

In `~/Dev/Crewluve Website`: this plan, ticked as it goes, and the piece 2 spec (Task 12).

Outside both repos: the Mac harness (`$HARNESS`, Task 3) and the compile-only clone (`$BUILD`, Task 9).

---

### Task 0: Branch

- [x] **Step 1: Check the working tree**

Run:

```bash
git -C ~/Dev/Duty status --short
```

Expected: only the Xcode scheme lines (` M Duty.xcodeproj/xcshareddata/xcschemes/Duty.xcscheme` and four `??` scheme files). If anything else shows, stop and ask the user.

- [x] **Step 2: Create the branch**

Run:

```bash
git -C ~/Dev/Duty switch -c feature/partner-cloud-summary feature/supabase-account-backend && git -C ~/Dev/Duty log --oneline -1
```

Expected: `Switched to a new branch 'feature/partner-cloud-summary'`, then `282a6cc0 Merge branch 'docs/rerun-pin-warnings'…`. The scheme changes carry over untouched. If the tip isn't `282a6cc0`, stop and ask: the spec was checked against it.

### Task 1: The summary's contract

**Files:**
- Create: `supabase/tests/partner_status.test.js`, `supabase/partner-status/schema.json`, `supabase/partner-status/README.md`, and nine files in `supabase/partner-status/examples/`
- Modify: `supabase/tests/package.json` and `package-lock.json` (Ajv), `supabase/tests/README.md`, `supabase/partner-api.md`

The contract comes first: CrewLu's encoder is then written to produce these examples exactly (Task 5).

- [x] **Step 1: Add Ajv to the SQL tests**

Run:

```bash
cd ~/Dev/Duty/supabase/tests && npm install --save-dev --save-exact --no-audit --no-fund ajv@8.17.1
```

Expected: `added 5 packages` (Ajv and its four dependencies). `package.json`'s `devDependencies` now lists `"ajv": "8.17.1"` after PGlite.

- [x] **Step 2: Write the failing test**

File: `supabase/tests/partner_status.test.js`

```js
// The partner summary's contract (partner links, piece 2): every example in ../partner-status/examples matches
// schema.json, set_partner_status accepts it, and partner_view gives each partner only what's theirs.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import { addUser, freshDb } from './helpers/db.js'
import { createPartner, join as joinLink, setStatus, view } from './helpers/rpc.js'

const contract = join(dirname(fileURLToPath(import.meta.url)), '..', 'partner-status')
const schema = JSON.parse(readFileSync(join(contract, 'schema.json'), 'utf8'))
const examples = readdirSync(join(contract, 'examples'))
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => ({ file, summary: JSON.parse(readFileSync(join(contract, 'examples', file), 'utf8')) }))

// The examples' two partners, as in CrewLu's DutyTests/Helpers/PartnerSummaryExamples.swift.
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

/** A copy of an example, by name. */
const example = (name) => structuredClone(examples.find((e) => e.file === `${name}.json`).summary)

/** The summary with the examples' partner ids swapped for real ones. */
const withPartners = (summary, ids) =>
  JSON.parse(JSON.stringify(summary).replaceAll(A, ids.a).replaceAll(B, ids.b))

describe('the partner summary contract (supabase/partner-status)', () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
  const validate = ajv.compile(schema)

  test('there are nine examples', () => {
    assert.deepEqual(
      examples.map((e) => e.file),
      [
        'commuting-home.json',
        'display-names.json',
        'hidden-trip-left-out.json',
        'home.json',
        'in-flight.json',
        'layover.json',
        'quick-status-everyone.json',
        'quick-status-one-partner.json',
        'turn.json',
      ],
    )
  })

  for (const { file, summary } of examples) {
    test(`${file} matches the schema`, () => {
      assert.ok(validate(summary), ajv.errorsText(validate.errors))
    })
  }

  test('the schema allows a pilot with nothing scheduled: no legs, no quick statuses and no names', () => {
    const nothing = { ...example('home'), tripLegs: null, quickStatusByPartner: null, displayNameByPartner: null }
    assert.ok(validate(nothing), ajv.errorsText(validate.errors))
  })

  test("the schema refuses a field it doesn't list: at the top, in a quick status, in a trip leg", () => {
    assert.equal(validate({ ...example('home'), favoriteColor: 'blue' }), false)
    const status = example('quick-status-one-partner')
    status.quickStatusByPartner[A].note = 'hi'
    assert.equal(validate(status), false)
    const legs = example('in-flight')
    legs.tripLegs[0].gate = 'B12'
    assert.equal(validate(legs), false)
  })

  test('the schema refuses a missing field, a date as text, an upper-case partner id and the old blobs', () => {
    const missing = example('home')
    delete missing.isHome
    assert.equal(validate(missing), false)
    assert.equal(validate({ ...example('home'), lastUpdated: '2026-10-19T16:00:00Z' }), false)
    const upper = example('display-names')
    upper.displayNameByPartner = { [A.toUpperCase()]: 'Dad' }
    assert.equal(validate(upper), false)
    assert.equal(validate({ ...example('home'), tripLegsJSON: 'W10=' }), false)
  })

  test('the schema refuses quick status targets that name people: a status for one person goes in quickStatusByPartner', () => {
    assert.equal(validate({ ...example('quick-status-one-partner'), quickStatusTargets: [A] }), false)
  })

  describe('on Crewlu Cloud', () => {
    let db
    before(async () => {
      db = await freshDb()
    })
    after(async () => {
      await db.close()
    })

    /** A pilot with partners A and B, each with one connected device. */
    async function pilotWithTwoPartners() {
      const pilot = await addUser(db)
      const a = await createPartner(db, pilot, 'Sam')
      const b = await createPartner(db, pilot, 'Jo')
      const keyA = (await joinLink(db, a.invite_token)).device_key
      const keyB = (await joinLink(db, b.invite_token)).device_key
      return { pilot, ids: { a: a.id, b: b.id }, keyA, keyB }
    }

    for (const { file, summary } of examples) {
      test(`set_partner_status accepts ${file}`, async () => {
        const { pilot, ids } = await pilotWithTwoPartners()
        assert.deepEqual(await setStatus(db, pilot, withPartners(summary, ids), 412), { applied: true })
      })
    }

    test("each partner sees their own entries and the status for everyone, and nothing of the other's", async () => {
      const { pilot, ids, keyA, keyB } = await pilotWithTwoPartners()
      const summary = example('quick-status-everyone')
      summary.displayNameByPartner = { [A]: 'Dad', [B]: 'Alex' }
      await setStatus(db, pilot, withPartners(summary, ids), 412)

      const seenByA = (await view(db, keyA)).status
      assert.deepEqual(seenByA.displayNameByPartner, { [ids.a]: 'Dad' })
      assert.deepEqual(Object.keys(seenByA.quickStatusByPartner), [ids.a])
      assert.equal(seenByA.quickStatus, 'Sleeping')
      assert.equal(seenByA.quickStatusTargets, null)
      assert.equal(seenByA.isSleeping, true)

      const seenByB = (await view(db, keyB)).status
      assert.deepEqual(seenByB.displayNameByPartner, { [ids.b]: 'Alex' })
      assert.deepEqual(Object.keys(seenByB.quickStatusByPartner), [ids.b])
      assert.equal(seenByB.quickStatus, 'Sleeping')
    })

    test('a status for one partner reaches only them', async () => {
      const { pilot, ids, keyA, keyB } = await pilotWithTwoPartners()
      await setStatus(db, pilot, withPartners(example('quick-status-one-partner'), ids), 412)

      const seenByA = (await view(db, keyA)).status
      assert.equal(seenByA.quickStatusByPartner[ids.a].status, 'Call Me')
      assert.equal('quickStatus' in seenByA, false, 'there is no status for everyone')

      const seenByB = (await view(db, keyB)).status
      assert.deepEqual(seenByB.quickStatusByPartner, {})
      assert.equal('quickStatus' in seenByB, false)
      assert.equal('quickStatusTargets' in seenByB, false)
      assert.equal(JSON.stringify(seenByB).includes('Call Me'), false)
    })
  })
})
```

- [x] **Step 3: Run it to see it fail**

Run:

```bash
cd ~/Dev/Duty/supabase/tests && node --no-maglev --test partner_status.test.js
```

Expected: exit code 1, with `ENOENT: no such file or directory` for `partner-status/schema.json`.

- [x] **Step 4: Write the schema**

File: `supabase/partner-status/schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CrewLu's partner summary, schemaVersion 1",
  "description": "The JSON object CrewLu sends to set_partner_status as p_status: every field of CrewLu's SharedPilotStatus under its Swift name, with null for nothing, except the three Data blobs. Dates count seconds from 1970. Each partner gets it trimmed by partner_view (supabase/partner-api.md): only their own entries of displayNameByPartner and quickStatusByPartner, and the four top-level quickStatus fields only while quickStatusTargets is null.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "appVersion", "baseAirportCode", "currentAirport", "currentCity", "currentFlightArrival",
    "currentFlightArrivalTime", "currentFlightArrivalTimezone", "currentFlightDeparture",
    "currentFlightDepartureTime", "currentFlightNumber", "currentLatitude", "currentLongitude",
    "currentTimezone", "currentTripId", "displayNameByPartner", "displayStatus", "flightDelayMinutes",
    "homeAirportCode", "homeArrivalCity", "homeArrivalLabel", "homeArrivalTime", "homeTimezone",
    "isHome", "isInFlight", "isOnDuty", "isSleeping", "lastTripDurationDays", "lastTripEndDate",
    "lastUpdated", "localTimeAtPilot", "nextDepartureLabel", "nextDepartureTime",
    "nextFlightDestination", "nextFlightNumber", "pilotFirstName", "pilotId", "quickStatus",
    "quickStatusByPartner", "quickStatusExpiry", "quickStatusIcon", "quickStatusTargets",
    "schemaVersion", "tripDayNumber", "tripLegs", "tripTotalDays", "upcomingCities"
  ],
  "properties": {
    "schemaVersion": { "const": 1 },
    "pilotId": { "type": "string", "description": "CrewLu's own id for the pilot (PilotInfo.id)." },
    "pilotFirstName": { "type": "string" },
    "homeAirportCode": { "type": ["string", "null"], "description": "Where the pilot lives." },
    "baseAirportCode": { "type": ["string", "null"], "description": "Where the pilot reports for work." },
    "homeTimezone": { "type": ["string", "null"], "description": "A time zone identifier, such as America/New_York." },
    "displayStatus": {
      "type": "string",
      "description": "Home, Base, In Flight, Turn, Layover, Commuting Home, Driving Home, Driving to Work, Reserve, Hot Standby, Training, or a short event title (24 characters at most)."
    },
    "isSleeping": { "type": "boolean", "description": "True only when the status sent to everyone is Sleeping." },
    "isHome": { "type": "boolean" },
    "isInFlight": { "type": "boolean" },
    "isOnDuty": { "type": "boolean" },
    "currentAirport": { "type": ["string", "null"], "description": "In flight, the departure airport." },
    "currentCity": { "type": ["string", "null"], "description": "In flight, the words In Flight." },
    "currentTimezone": { "type": ["string", "null"] },
    "localTimeAtPilot": { "type": ["string", "null"], "description": "Already formatted, such as 11:00 AM." },
    "currentLatitude": { "type": ["number", "null"] },
    "currentLongitude": { "type": ["number", "null"] },
    "currentFlightNumber": { "type": ["string", "null"] },
    "currentFlightDeparture": { "type": ["string", "null"] },
    "currentFlightArrival": { "type": ["string", "null"] },
    "currentFlightDepartureTime": { "$ref": "#/$defs/timeOrNull" },
    "currentFlightArrivalTime": { "$ref": "#/$defs/timeOrNull" },
    "currentFlightArrivalTimezone": { "type": ["string", "null"] },
    "homeArrivalTime": { "$ref": "#/$defs/timeOrNull" },
    "homeArrivalLabel": { "type": ["string", "null"], "description": "Back Home In, Back at Base In, {City} In, or Released In." },
    "homeArrivalCity": { "type": ["string", "null"] },
    "nextDepartureTime": { "$ref": "#/$defs/timeOrNull" },
    "nextFlightNumber": { "type": ["string", "null"] },
    "nextFlightDestination": { "type": ["string", "null"] },
    "nextDepartureLabel": { "type": ["string", "null"] },
    "lastTripEndDate": { "$ref": "#/$defs/timeOrNull" },
    "lastTripDurationDays": { "type": ["integer", "null"] },
    "currentTripId": { "type": ["string", "null"] },
    "tripDayNumber": { "type": ["integer", "null"] },
    "tripTotalDays": { "type": ["integer", "null"] },
    "upcomingCities": { "type": "array", "items": { "type": "string" } },
    "tripLegs": {
      "type": ["array", "null"],
      "description": "The trips from the last 60 days and every future one, then jumpseats, events, training and drives. Null when CrewLu has none.",
      "items": { "$ref": "#/$defs/tripLeg" }
    },
    "quickStatus": { "type": ["string", "null"], "description": "The status sent to everyone." },
    "quickStatusIcon": { "type": ["string", "null"], "description": "An SF Symbol name." },
    "quickStatusExpiry": { "$ref": "#/$defs/timeOrNull" },
    "quickStatusTargets": {
      "type": ["array", "null"],
      "maxItems": 0,
      "description": "Null when the status above goes to everyone; empty when there's no status for everyone."
    },
    "quickStatusByPartner": {
      "type": ["object", "null"],
      "description": "Each partner's own quick status, by partner id.",
      "propertyNames": { "$ref": "#/$defs/partnerId" },
      "additionalProperties": { "$ref": "#/$defs/quickStatus" }
    },
    "displayNameByPartner": {
      "type": ["object", "null"],
      "description": "The name each partner sees the pilot as, by partner id.",
      "propertyNames": { "$ref": "#/$defs/partnerId" },
      "additionalProperties": { "type": "string", "minLength": 1 }
    },
    "flightDelayMinutes": { "type": ["integer", "null"], "description": "Positive when late, negative when early." },
    "lastUpdated": { "$ref": "#/$defs/time" },
    "appVersion": { "type": "string" }
  },
  "$defs": {
    "time": { "type": "number", "description": "Seconds since 1970-01-01 00:00 UTC." },
    "timeOrNull": { "type": ["number", "null"], "description": "Seconds since 1970-01-01 00:00 UTC, or null." },
    "partnerId": {
      "type": "string",
      "description": "A partners.id, in lower case.",
      "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
    },
    "quickStatus": {
      "type": "object",
      "additionalProperties": false,
      "required": ["status", "icon", "expiry"],
      "properties": {
        "status": { "type": "string", "description": "Call Me, Free to Talk, Out for Dinner, Sleeping or Flight Delayed." },
        "icon": { "type": "string", "description": "An SF Symbol name." },
        "expiry": { "$ref": "#/$defs/timeOrNull", "description": "Null for no limit." }
      }
    },
    "tripLeg": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "airlineCode", "airportCode", "arrivalAirport", "arrivalCity", "arrivalTimezoneIdentifier", "city",
        "delayMinutes", "departureAirport", "departureCity", "endTime", "flightNumber", "id", "label",
        "startTime", "timezoneIdentifier", "tripDayNumber", "tripId", "tripTotalDays", "type"
      ],
      "properties": {
        "id": { "type": "string" },
        "tripId": { "type": ["string", "null"], "description": "Null for a leg that isn't part of a trip, such as a jumpseat." },
        "type": {
          "enum": ["flight", "turn", "layover", "home", "base", "drive", "reserve", "hotStandby", "event", "unknown"]
        },
        "startTime": { "$ref": "#/$defs/time" },
        "endTime": { "$ref": "#/$defs/time" },
        "airportCode": { "type": ["string", "null"] },
        "city": { "type": ["string", "null"] },
        "timezoneIdentifier": { "type": ["string", "null"] },
        "arrivalTimezoneIdentifier": { "type": ["string", "null"] },
        "flightNumber": { "type": ["string", "null"] },
        "departureAirport": { "type": ["string", "null"] },
        "arrivalAirport": { "type": ["string", "null"] },
        "departureCity": { "type": ["string", "null"] },
        "arrivalCity": { "type": ["string", "null"] },
        "tripDayNumber": { "type": ["integer", "null"] },
        "tripTotalDays": { "type": ["integer", "null"] },
        "delayMinutes": { "type": ["integer", "null"], "description": "Only on the delayed flight. Positive when late." },
        "airlineCode": { "type": ["string", "null"], "description": "Null for the pilot's company flights." },
        "label": { "type": ["string", "null"], "description": "For a leg that isn't a flight, such as RSV-A." }
      }
    }
  }
}
```

- [x] **Step 5: Write the nine examples**

They're the encoder's output for `DutyTests/Helpers/PartnerSummaryExamples.swift` (Task 5), one trip leg per line. Dates are whole seconds. Copy them exactly: CrewLu's tests compare against them.

File: `supabase/partner-status/examples/home.json`

```json
{
  "appVersion": "3.0",
  "baseAirportCode": "SDF",
  "currentAirport": "SDF",
  "currentCity": "Louisville",
  "currentFlightArrival": null,
  "currentFlightArrivalTime": null,
  "currentFlightArrivalTimezone": null,
  "currentFlightDeparture": null,
  "currentFlightDepartureTime": null,
  "currentFlightNumber": null,
  "currentLatitude": null,
  "currentLongitude": null,
  "currentTimezone": "America/New_York",
  "currentTripId": null,
  "displayNameByPartner": null,
  "displayStatus": "Home",
  "flightDelayMinutes": null,
  "homeAirportCode": "ATL",
  "homeArrivalCity": "Atlanta",
  "homeArrivalLabel": "Back Home In",
  "homeArrivalTime": 1792674300,
  "homeTimezone": "America/New_York",
  "isHome": true,
  "isInFlight": false,
  "isOnDuty": false,
  "isSleeping": false,
  "lastTripDurationDays": null,
  "lastTripEndDate": null,
  "lastUpdated": 1792425600,
  "localTimeAtPilot": "12:00 PM",
  "nextDepartureLabel": null,
  "nextDepartureTime": 1792537200,
  "nextFlightDestination": "RFD",
  "nextFlightNumber": "UPS2961",
  "pilotFirstName": "Alex",
  "pilotId": "6F1C2D3E-4B5A-4C6D-8E7F-90A1B2C3D4E5",
  "quickStatus": null,
  "quickStatusByPartner": null,
  "quickStatusExpiry": null,
  "quickStatusIcon": null,
  "quickStatusTargets": [],
  "schemaVersion": 1,
  "tripDayNumber": null,
  "tripLegs": [
    {"airlineCode":null,"airportCode":"SDF","arrivalAirport":"RFD","arrivalCity":"Rockford","arrivalTimezoneIdentifier":"America/Chicago","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792542000,"flightNumber":"UPS2961","id":"Z55120-leg-0","label":null,"startTime":1792537200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Rockford","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792548600,"flightNumber":null,"id":"Z55120-leg-1","label":null,"startTime":1792542000,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"turn"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":"ONT","arrivalCity":"Ontario","arrivalTimezoneIdentifier":"America/Los_Angeles","city":"Rockford","delayMinutes":null,"departureAirport":"RFD","departureCity":"Rockford","endTime":1792563600,"flightNumber":"UPS2962","id":"Z55120-leg-2","label":null,"startTime":1792548600,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Ontario","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792638000,"flightNumber":null,"id":"Z55120-leg-3","label":null,"startTime":1792563600,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"layover"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Ontario","delayMinutes":null,"departureAirport":"ONT","departureCity":"Ontario","endTime":1792652700,"flightNumber":"UPS2963","id":"Z55120-leg-4","label":null,"startTime":1792638000,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":2,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":"DL","airportCode":"ATL","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Atlanta","delayMinutes":null,"departureAirport":"ATL","departureCity":"Atlanta","endTime":1792521300,"flightNumber":"DL1180","id":"js-3B1F6A2C-8D4E-4F70-9A15-6C2E8B0D4F13","label":null,"startTime":1792515900,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"},
    {"airlineCode":"DL","airportCode":"SDF","arrivalAirport":"ATL","arrivalCity":"Atlanta","arrivalTimezoneIdentifier":"America/New_York","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792674300,"flightNumber":"DL2215","id":"js-9E0D5C7B-2A41-4B8C-8F36-D1C4A7E2B590","label":null,"startTime":1792669200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"}
  ],
  "tripTotalDays": null,
  "upcomingCities": []
}
```

File: `supabase/partner-status/examples/hidden-trip-left-out.json`

```json
{
  "appVersion": "3.0",
  "baseAirportCode": "SDF",
  "currentAirport": "SDF",
  "currentCity": "Louisville",
  "currentFlightArrival": null,
  "currentFlightArrivalTime": null,
  "currentFlightArrivalTimezone": null,
  "currentFlightDeparture": null,
  "currentFlightDepartureTime": null,
  "currentFlightNumber": null,
  "currentLatitude": null,
  "currentLongitude": null,
  "currentTimezone": "America/New_York",
  "currentTripId": null,
  "displayNameByPartner": null,
  "displayStatus": "Home",
  "flightDelayMinutes": null,
  "homeAirportCode": "ATL",
  "homeArrivalCity": "Atlanta",
  "homeArrivalLabel": "Back Home In",
  "homeArrivalTime": 1792674300,
  "homeTimezone": "America/New_York",
  "isHome": true,
  "isInFlight": false,
  "isOnDuty": false,
  "isSleeping": false,
  "lastTripDurationDays": null,
  "lastTripEndDate": null,
  "lastUpdated": 1792072800,
  "localTimeAtPilot": "10:00 AM",
  "nextDepartureLabel": null,
  "nextDepartureTime": 1792537200,
  "nextFlightDestination": "RFD",
  "nextFlightNumber": "UPS2961",
  "pilotFirstName": "Alex",
  "pilotId": "6F1C2D3E-4B5A-4C6D-8E7F-90A1B2C3D4E5",
  "quickStatus": null,
  "quickStatusByPartner": null,
  "quickStatusExpiry": null,
  "quickStatusIcon": null,
  "quickStatusTargets": [],
  "schemaVersion": 1,
  "tripDayNumber": null,
  "tripLegs": [
    {"airlineCode":null,"airportCode":"SDF","arrivalAirport":"RFD","arrivalCity":"Rockford","arrivalTimezoneIdentifier":"America/Chicago","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792542000,"flightNumber":"UPS2961","id":"Z55120-leg-0","label":null,"startTime":1792537200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Rockford","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792548600,"flightNumber":null,"id":"Z55120-leg-1","label":null,"startTime":1792542000,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"turn"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":"ONT","arrivalCity":"Ontario","arrivalTimezoneIdentifier":"America/Los_Angeles","city":"Rockford","delayMinutes":null,"departureAirport":"RFD","departureCity":"Rockford","endTime":1792563600,"flightNumber":"UPS2962","id":"Z55120-leg-2","label":null,"startTime":1792548600,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Ontario","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792638000,"flightNumber":null,"id":"Z55120-leg-3","label":null,"startTime":1792563600,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"layover"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Ontario","delayMinutes":null,"departureAirport":"ONT","departureCity":"Ontario","endTime":1792652700,"flightNumber":"UPS2963","id":"Z55120-leg-4","label":null,"startTime":1792638000,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":2,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":"DL","airportCode":"ATL","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Atlanta","delayMinutes":null,"departureAirport":"ATL","departureCity":"Atlanta","endTime":1792521300,"flightNumber":"DL1180","id":"js-3B1F6A2C-8D4E-4F70-9A15-6C2E8B0D4F13","label":null,"startTime":1792515900,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"},
    {"airlineCode":"DL","airportCode":"SDF","arrivalAirport":"ATL","arrivalCity":"Atlanta","arrivalTimezoneIdentifier":"America/New_York","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792674300,"flightNumber":"DL2215","id":"js-9E0D5C7B-2A41-4B8C-8F36-D1C4A7E2B590","label":null,"startTime":1792669200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"}
  ],
  "tripTotalDays": null,
  "upcomingCities": []
}
```

File: `supabase/partner-status/examples/turn.json`

```json
{
  "appVersion": "3.0",
  "baseAirportCode": "SDF",
  "currentAirport": "RFD",
  "currentCity": "Rockford",
  "currentFlightArrival": null,
  "currentFlightArrivalTime": null,
  "currentFlightArrivalTimezone": null,
  "currentFlightDeparture": null,
  "currentFlightDepartureTime": null,
  "currentFlightNumber": null,
  "currentLatitude": null,
  "currentLongitude": null,
  "currentTimezone": "America/Chicago",
  "currentTripId": "Z55120",
  "displayNameByPartner": null,
  "displayStatus": "Turn",
  "flightDelayMinutes": null,
  "homeAirportCode": "ATL",
  "homeArrivalCity": "Atlanta",
  "homeArrivalLabel": "Back Home In",
  "homeArrivalTime": 1792674300,
  "homeTimezone": "America/New_York",
  "isHome": false,
  "isInFlight": false,
  "isOnDuty": true,
  "isSleeping": false,
  "lastTripDurationDays": null,
  "lastTripEndDate": null,
  "lastUpdated": 1792544400,
  "localTimeAtPilot": "8:00 PM",
  "nextDepartureLabel": null,
  "nextDepartureTime": 1792548600,
  "nextFlightDestination": "ONT",
  "nextFlightNumber": "UPS2962",
  "pilotFirstName": "Alex",
  "pilotId": "6F1C2D3E-4B5A-4C6D-8E7F-90A1B2C3D4E5",
  "quickStatus": null,
  "quickStatusByPartner": null,
  "quickStatusExpiry": null,
  "quickStatusIcon": null,
  "quickStatusTargets": [],
  "schemaVersion": 1,
  "tripDayNumber": 2,
  "tripLegs": [
    {"airlineCode":null,"airportCode":"SDF","arrivalAirport":"RFD","arrivalCity":"Rockford","arrivalTimezoneIdentifier":"America/Chicago","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792542000,"flightNumber":"UPS2961","id":"Z55120-leg-0","label":null,"startTime":1792537200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Rockford","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792548600,"flightNumber":null,"id":"Z55120-leg-1","label":null,"startTime":1792542000,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"turn"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":"ONT","arrivalCity":"Ontario","arrivalTimezoneIdentifier":"America/Los_Angeles","city":"Rockford","delayMinutes":null,"departureAirport":"RFD","departureCity":"Rockford","endTime":1792563600,"flightNumber":"UPS2962","id":"Z55120-leg-2","label":null,"startTime":1792548600,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Ontario","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792638000,"flightNumber":null,"id":"Z55120-leg-3","label":null,"startTime":1792563600,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"layover"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Ontario","delayMinutes":null,"departureAirport":"ONT","departureCity":"Ontario","endTime":1792652700,"flightNumber":"UPS2963","id":"Z55120-leg-4","label":null,"startTime":1792638000,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":2,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":"DL","airportCode":"ATL","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Atlanta","delayMinutes":null,"departureAirport":"ATL","departureCity":"Atlanta","endTime":1792521300,"flightNumber":"DL1180","id":"js-3B1F6A2C-8D4E-4F70-9A15-6C2E8B0D4F13","label":null,"startTime":1792515900,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"},
    {"airlineCode":"DL","airportCode":"SDF","arrivalAirport":"ATL","arrivalCity":"Atlanta","arrivalTimezoneIdentifier":"America/New_York","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792674300,"flightNumber":"DL2215","id":"js-9E0D5C7B-2A41-4B8C-8F36-D1C4A7E2B590","label":null,"startTime":1792669200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"}
  ],
  "tripTotalDays": 2,
  "upcomingCities": [
    "Ontario",
    "Louisville"
  ]
}
```

File: `supabase/partner-status/examples/in-flight.json`

```json
{
  "appVersion": "3.0",
  "baseAirportCode": "SDF",
  "currentAirport": "RFD",
  "currentCity": "In Flight",
  "currentFlightArrival": "ONT",
  "currentFlightArrivalTime": 1792563600,
  "currentFlightArrivalTimezone": "America/Los_Angeles",
  "currentFlightDeparture": "RFD",
  "currentFlightDepartureTime": 1792548600,
  "currentFlightNumber": "UPS2962",
  "currentLatitude": 39.4806,
  "currentLongitude": -102.4341,
  "currentTimezone": null,
  "currentTripId": "Z55120",
  "displayNameByPartner": null,
  "displayStatus": "In Flight",
  "flightDelayMinutes": null,
  "homeAirportCode": "ATL",
  "homeArrivalCity": "Atlanta",
  "homeArrivalLabel": "Back Home In",
  "homeArrivalTime": 1792674300,
  "homeTimezone": "America/New_York",
  "isHome": false,
  "isInFlight": true,
  "isOnDuty": true,
  "isSleeping": false,
  "lastTripDurationDays": null,
  "lastTripEndDate": null,
  "lastUpdated": 1792555200,
  "localTimeAtPilot": null,
  "nextDepartureLabel": null,
  "nextDepartureTime": 1792638000,
  "nextFlightDestination": "SDF",
  "nextFlightNumber": "UPS2963",
  "pilotFirstName": "Alex",
  "pilotId": "6F1C2D3E-4B5A-4C6D-8E7F-90A1B2C3D4E5",
  "quickStatus": null,
  "quickStatusByPartner": null,
  "quickStatusExpiry": null,
  "quickStatusIcon": null,
  "quickStatusTargets": [],
  "schemaVersion": 1,
  "tripDayNumber": 2,
  "tripLegs": [
    {"airlineCode":null,"airportCode":"SDF","arrivalAirport":"RFD","arrivalCity":"Rockford","arrivalTimezoneIdentifier":"America/Chicago","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792542000,"flightNumber":"UPS2961","id":"Z55120-leg-0","label":null,"startTime":1792537200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Rockford","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792548600,"flightNumber":null,"id":"Z55120-leg-1","label":null,"startTime":1792542000,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"turn"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":"ONT","arrivalCity":"Ontario","arrivalTimezoneIdentifier":"America/Los_Angeles","city":"Rockford","delayMinutes":null,"departureAirport":"RFD","departureCity":"Rockford","endTime":1792563600,"flightNumber":"UPS2962","id":"Z55120-leg-2","label":null,"startTime":1792548600,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Ontario","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792638000,"flightNumber":null,"id":"Z55120-leg-3","label":null,"startTime":1792563600,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"layover"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Ontario","delayMinutes":null,"departureAirport":"ONT","departureCity":"Ontario","endTime":1792652700,"flightNumber":"UPS2963","id":"Z55120-leg-4","label":null,"startTime":1792638000,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":2,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":"DL","airportCode":"ATL","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Atlanta","delayMinutes":null,"departureAirport":"ATL","departureCity":"Atlanta","endTime":1792521300,"flightNumber":"DL1180","id":"js-3B1F6A2C-8D4E-4F70-9A15-6C2E8B0D4F13","label":null,"startTime":1792515900,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"},
    {"airlineCode":"DL","airportCode":"SDF","arrivalAirport":"ATL","arrivalCity":"Atlanta","arrivalTimezoneIdentifier":"America/New_York","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792674300,"flightNumber":"DL2215","id":"js-9E0D5C7B-2A41-4B8C-8F36-D1C4A7E2B590","label":null,"startTime":1792669200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"}
  ],
  "tripTotalDays": 2,
  "upcomingCities": [
    "Louisville"
  ]
}
```

File: `supabase/partner-status/examples/layover.json`

```json
{
  "appVersion": "3.0",
  "baseAirportCode": "SDF",
  "currentAirport": "ONT",
  "currentCity": "Ontario",
  "currentFlightArrival": null,
  "currentFlightArrivalTime": null,
  "currentFlightArrivalTimezone": null,
  "currentFlightDeparture": null,
  "currentFlightDepartureTime": null,
  "currentFlightNumber": null,
  "currentLatitude": null,
  "currentLongitude": null,
  "currentTimezone": "America/Los_Angeles",
  "currentTripId": "Z55120",
  "displayNameByPartner": null,
  "displayStatus": "Layover",
  "flightDelayMinutes": null,
  "homeAirportCode": "ATL",
  "homeArrivalCity": "Atlanta",
  "homeArrivalLabel": "Back Home In",
  "homeArrivalTime": 1792674300,
  "homeTimezone": "America/New_York",
  "isHome": false,
  "isInFlight": false,
  "isOnDuty": false,
  "isSleeping": false,
  "lastTripDurationDays": null,
  "lastTripEndDate": null,
  "lastUpdated": 1792605600,
  "localTimeAtPilot": "11:00 AM",
  "nextDepartureLabel": null,
  "nextDepartureTime": 1792638000,
  "nextFlightDestination": "SDF",
  "nextFlightNumber": "UPS2963",
  "pilotFirstName": "Alex",
  "pilotId": "6F1C2D3E-4B5A-4C6D-8E7F-90A1B2C3D4E5",
  "quickStatus": null,
  "quickStatusByPartner": null,
  "quickStatusExpiry": null,
  "quickStatusIcon": null,
  "quickStatusTargets": [],
  "schemaVersion": 1,
  "tripDayNumber": 2,
  "tripLegs": [
    {"airlineCode":null,"airportCode":"SDF","arrivalAirport":"RFD","arrivalCity":"Rockford","arrivalTimezoneIdentifier":"America/Chicago","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792542000,"flightNumber":"UPS2961","id":"Z55120-leg-0","label":null,"startTime":1792537200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Rockford","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792548600,"flightNumber":null,"id":"Z55120-leg-1","label":null,"startTime":1792542000,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"turn"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":"ONT","arrivalCity":"Ontario","arrivalTimezoneIdentifier":"America/Los_Angeles","city":"Rockford","delayMinutes":null,"departureAirport":"RFD","departureCity":"Rockford","endTime":1792563600,"flightNumber":"UPS2962","id":"Z55120-leg-2","label":null,"startTime":1792548600,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Ontario","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792638000,"flightNumber":null,"id":"Z55120-leg-3","label":null,"startTime":1792563600,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"layover"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Ontario","delayMinutes":null,"departureAirport":"ONT","departureCity":"Ontario","endTime":1792652700,"flightNumber":"UPS2963","id":"Z55120-leg-4","label":null,"startTime":1792638000,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":2,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":"DL","airportCode":"ATL","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Atlanta","delayMinutes":null,"departureAirport":"ATL","departureCity":"Atlanta","endTime":1792521300,"flightNumber":"DL1180","id":"js-3B1F6A2C-8D4E-4F70-9A15-6C2E8B0D4F13","label":null,"startTime":1792515900,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"},
    {"airlineCode":"DL","airportCode":"SDF","arrivalAirport":"ATL","arrivalCity":"Atlanta","arrivalTimezoneIdentifier":"America/New_York","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792674300,"flightNumber":"DL2215","id":"js-9E0D5C7B-2A41-4B8C-8F36-D1C4A7E2B590","label":null,"startTime":1792669200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"}
  ],
  "tripTotalDays": 2,
  "upcomingCities": [
    "Louisville"
  ]
}
```

File: `supabase/partner-status/examples/commuting-home.json`

```json
{
  "appVersion": "3.0",
  "baseAirportCode": "SDF",
  "currentAirport": "SDF",
  "currentCity": "Louisville",
  "currentFlightArrival": null,
  "currentFlightArrivalTime": null,
  "currentFlightArrivalTimezone": null,
  "currentFlightDeparture": null,
  "currentFlightDepartureTime": null,
  "currentFlightNumber": null,
  "currentLatitude": null,
  "currentLongitude": null,
  "currentTimezone": "America/New_York",
  "currentTripId": null,
  "displayNameByPartner": null,
  "displayStatus": "Commuting Home",
  "flightDelayMinutes": null,
  "homeAirportCode": "ATL",
  "homeArrivalCity": null,
  "homeArrivalLabel": null,
  "homeArrivalTime": null,
  "homeTimezone": "America/New_York",
  "isHome": true,
  "isInFlight": false,
  "isOnDuty": false,
  "isSleeping": false,
  "lastTripDurationDays": 2,
  "lastTripEndDate": 1792653600,
  "lastUpdated": 1792659600,
  "localTimeAtPilot": "5:00 AM",
  "nextDepartureLabel": null,
  "nextDepartureTime": null,
  "nextFlightDestination": null,
  "nextFlightNumber": null,
  "pilotFirstName": "Alex",
  "pilotId": "6F1C2D3E-4B5A-4C6D-8E7F-90A1B2C3D4E5",
  "quickStatus": null,
  "quickStatusByPartner": null,
  "quickStatusExpiry": null,
  "quickStatusIcon": null,
  "quickStatusTargets": [],
  "schemaVersion": 1,
  "tripDayNumber": null,
  "tripLegs": [
    {"airlineCode":null,"airportCode":"SDF","arrivalAirport":"RFD","arrivalCity":"Rockford","arrivalTimezoneIdentifier":"America/Chicago","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792542000,"flightNumber":"UPS2961","id":"Z55120-leg-0","label":null,"startTime":1792537200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Rockford","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792548600,"flightNumber":null,"id":"Z55120-leg-1","label":null,"startTime":1792542000,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"turn"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":"ONT","arrivalCity":"Ontario","arrivalTimezoneIdentifier":"America/Los_Angeles","city":"Rockford","delayMinutes":null,"departureAirport":"RFD","departureCity":"Rockford","endTime":1792563600,"flightNumber":"UPS2962","id":"Z55120-leg-2","label":null,"startTime":1792548600,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Ontario","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792638000,"flightNumber":null,"id":"Z55120-leg-3","label":null,"startTime":1792563600,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"layover"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Ontario","delayMinutes":null,"departureAirport":"ONT","departureCity":"Ontario","endTime":1792652700,"flightNumber":"UPS2963","id":"Z55120-leg-4","label":null,"startTime":1792638000,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":2,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":"DL","airportCode":"ATL","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Atlanta","delayMinutes":null,"departureAirport":"ATL","departureCity":"Atlanta","endTime":1792521300,"flightNumber":"DL1180","id":"js-3B1F6A2C-8D4E-4F70-9A15-6C2E8B0D4F13","label":null,"startTime":1792515900,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"},
    {"airlineCode":"DL","airportCode":"SDF","arrivalAirport":"ATL","arrivalCity":"Atlanta","arrivalTimezoneIdentifier":"America/New_York","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792674300,"flightNumber":"DL2215","id":"js-9E0D5C7B-2A41-4B8C-8F36-D1C4A7E2B590","label":null,"startTime":1792669200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"}
  ],
  "tripTotalDays": null,
  "upcomingCities": []
}
```

File: `supabase/partner-status/examples/quick-status-everyone.json`

```json
{
  "appVersion": "3.0",
  "baseAirportCode": "SDF",
  "currentAirport": "ONT",
  "currentCity": "Ontario",
  "currentFlightArrival": null,
  "currentFlightArrivalTime": null,
  "currentFlightArrivalTimezone": null,
  "currentFlightDeparture": null,
  "currentFlightDepartureTime": null,
  "currentFlightNumber": null,
  "currentLatitude": null,
  "currentLongitude": null,
  "currentTimezone": "America/Los_Angeles",
  "currentTripId": "Z55120",
  "displayNameByPartner": null,
  "displayStatus": "Layover",
  "flightDelayMinutes": null,
  "homeAirportCode": "ATL",
  "homeArrivalCity": "Atlanta",
  "homeArrivalLabel": "Back Home In",
  "homeArrivalTime": 1792674300,
  "homeTimezone": "America/New_York",
  "isHome": false,
  "isInFlight": false,
  "isOnDuty": false,
  "isSleeping": true,
  "lastTripDurationDays": null,
  "lastTripEndDate": null,
  "lastUpdated": 1792605600,
  "localTimeAtPilot": "11:00 AM",
  "nextDepartureLabel": null,
  "nextDepartureTime": 1792638000,
  "nextFlightDestination": "SDF",
  "nextFlightNumber": "UPS2963",
  "pilotFirstName": "Alex",
  "pilotId": "6F1C2D3E-4B5A-4C6D-8E7F-90A1B2C3D4E5",
  "quickStatus": "Sleeping",
  "quickStatusByPartner": {
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": {
      "expiry": null,
      "icon": "moon.zzz.fill",
      "status": "Sleeping"
    },
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb": {
      "expiry": null,
      "icon": "moon.zzz.fill",
      "status": "Sleeping"
    }
  },
  "quickStatusExpiry": null,
  "quickStatusIcon": "moon.zzz.fill",
  "quickStatusTargets": null,
  "schemaVersion": 1,
  "tripDayNumber": 2,
  "tripLegs": [
    {"airlineCode":null,"airportCode":"SDF","arrivalAirport":"RFD","arrivalCity":"Rockford","arrivalTimezoneIdentifier":"America/Chicago","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792542000,"flightNumber":"UPS2961","id":"Z55120-leg-0","label":null,"startTime":1792537200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Rockford","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792548600,"flightNumber":null,"id":"Z55120-leg-1","label":null,"startTime":1792542000,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"turn"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":"ONT","arrivalCity":"Ontario","arrivalTimezoneIdentifier":"America/Los_Angeles","city":"Rockford","delayMinutes":null,"departureAirport":"RFD","departureCity":"Rockford","endTime":1792563600,"flightNumber":"UPS2962","id":"Z55120-leg-2","label":null,"startTime":1792548600,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Ontario","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792638000,"flightNumber":null,"id":"Z55120-leg-3","label":null,"startTime":1792563600,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"layover"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Ontario","delayMinutes":null,"departureAirport":"ONT","departureCity":"Ontario","endTime":1792652700,"flightNumber":"UPS2963","id":"Z55120-leg-4","label":null,"startTime":1792638000,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":2,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":"DL","airportCode":"ATL","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Atlanta","delayMinutes":null,"departureAirport":"ATL","departureCity":"Atlanta","endTime":1792521300,"flightNumber":"DL1180","id":"js-3B1F6A2C-8D4E-4F70-9A15-6C2E8B0D4F13","label":null,"startTime":1792515900,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"},
    {"airlineCode":"DL","airportCode":"SDF","arrivalAirport":"ATL","arrivalCity":"Atlanta","arrivalTimezoneIdentifier":"America/New_York","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792674300,"flightNumber":"DL2215","id":"js-9E0D5C7B-2A41-4B8C-8F36-D1C4A7E2B590","label":null,"startTime":1792669200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"}
  ],
  "tripTotalDays": 2,
  "upcomingCities": [
    "Louisville"
  ]
}
```

File: `supabase/partner-status/examples/quick-status-one-partner.json`

```json
{
  "appVersion": "3.0",
  "baseAirportCode": "SDF",
  "currentAirport": "ONT",
  "currentCity": "Ontario",
  "currentFlightArrival": null,
  "currentFlightArrivalTime": null,
  "currentFlightArrivalTimezone": null,
  "currentFlightDeparture": null,
  "currentFlightDepartureTime": null,
  "currentFlightNumber": null,
  "currentLatitude": null,
  "currentLongitude": null,
  "currentTimezone": "America/Los_Angeles",
  "currentTripId": "Z55120",
  "displayNameByPartner": null,
  "displayStatus": "Layover",
  "flightDelayMinutes": null,
  "homeAirportCode": "ATL",
  "homeArrivalCity": "Atlanta",
  "homeArrivalLabel": "Back Home In",
  "homeArrivalTime": 1792674300,
  "homeTimezone": "America/New_York",
  "isHome": false,
  "isInFlight": false,
  "isOnDuty": false,
  "isSleeping": false,
  "lastTripDurationDays": null,
  "lastTripEndDate": null,
  "lastUpdated": 1792605600,
  "localTimeAtPilot": "11:00 AM",
  "nextDepartureLabel": null,
  "nextDepartureTime": 1792638000,
  "nextFlightDestination": "SDF",
  "nextFlightNumber": "UPS2963",
  "pilotFirstName": "Alex",
  "pilotId": "6F1C2D3E-4B5A-4C6D-8E7F-90A1B2C3D4E5",
  "quickStatus": null,
  "quickStatusByPartner": {
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": {
      "expiry": 1792612800,
      "icon": "phone.fill",
      "status": "Call Me"
    }
  },
  "quickStatusExpiry": null,
  "quickStatusIcon": null,
  "quickStatusTargets": [],
  "schemaVersion": 1,
  "tripDayNumber": 2,
  "tripLegs": [
    {"airlineCode":null,"airportCode":"SDF","arrivalAirport":"RFD","arrivalCity":"Rockford","arrivalTimezoneIdentifier":"America/Chicago","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792542000,"flightNumber":"UPS2961","id":"Z55120-leg-0","label":null,"startTime":1792537200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Rockford","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792548600,"flightNumber":null,"id":"Z55120-leg-1","label":null,"startTime":1792542000,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"turn"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":"ONT","arrivalCity":"Ontario","arrivalTimezoneIdentifier":"America/Los_Angeles","city":"Rockford","delayMinutes":null,"departureAirport":"RFD","departureCity":"Rockford","endTime":1792563600,"flightNumber":"UPS2962","id":"Z55120-leg-2","label":null,"startTime":1792548600,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Ontario","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792638000,"flightNumber":null,"id":"Z55120-leg-3","label":null,"startTime":1792563600,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"layover"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Ontario","delayMinutes":null,"departureAirport":"ONT","departureCity":"Ontario","endTime":1792652700,"flightNumber":"UPS2963","id":"Z55120-leg-4","label":null,"startTime":1792638000,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":2,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":"DL","airportCode":"ATL","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Atlanta","delayMinutes":null,"departureAirport":"ATL","departureCity":"Atlanta","endTime":1792521300,"flightNumber":"DL1180","id":"js-3B1F6A2C-8D4E-4F70-9A15-6C2E8B0D4F13","label":null,"startTime":1792515900,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"},
    {"airlineCode":"DL","airportCode":"SDF","arrivalAirport":"ATL","arrivalCity":"Atlanta","arrivalTimezoneIdentifier":"America/New_York","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792674300,"flightNumber":"DL2215","id":"js-9E0D5C7B-2A41-4B8C-8F36-D1C4A7E2B590","label":null,"startTime":1792669200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"}
  ],
  "tripTotalDays": 2,
  "upcomingCities": [
    "Louisville"
  ]
}
```

File: `supabase/partner-status/examples/display-names.json`

```json
{
  "appVersion": "3.0",
  "baseAirportCode": "SDF",
  "currentAirport": "SDF",
  "currentCity": "Louisville",
  "currentFlightArrival": null,
  "currentFlightArrivalTime": null,
  "currentFlightArrivalTimezone": null,
  "currentFlightDeparture": null,
  "currentFlightDepartureTime": null,
  "currentFlightNumber": null,
  "currentLatitude": null,
  "currentLongitude": null,
  "currentTimezone": "America/New_York",
  "currentTripId": null,
  "displayNameByPartner": {
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": "Dad"
  },
  "displayStatus": "Home",
  "flightDelayMinutes": null,
  "homeAirportCode": "ATL",
  "homeArrivalCity": "Atlanta",
  "homeArrivalLabel": "Back Home In",
  "homeArrivalTime": 1792674300,
  "homeTimezone": "America/New_York",
  "isHome": true,
  "isInFlight": false,
  "isOnDuty": false,
  "isSleeping": false,
  "lastTripDurationDays": null,
  "lastTripEndDate": null,
  "lastUpdated": 1792425600,
  "localTimeAtPilot": "12:00 PM",
  "nextDepartureLabel": null,
  "nextDepartureTime": 1792537200,
  "nextFlightDestination": "RFD",
  "nextFlightNumber": "UPS2961",
  "pilotFirstName": "Alex",
  "pilotId": "6F1C2D3E-4B5A-4C6D-8E7F-90A1B2C3D4E5",
  "quickStatus": null,
  "quickStatusByPartner": null,
  "quickStatusExpiry": null,
  "quickStatusIcon": null,
  "quickStatusTargets": [],
  "schemaVersion": 1,
  "tripDayNumber": null,
  "tripLegs": [
    {"airlineCode":null,"airportCode":"SDF","arrivalAirport":"RFD","arrivalCity":"Rockford","arrivalTimezoneIdentifier":"America/Chicago","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792542000,"flightNumber":"UPS2961","id":"Z55120-leg-0","label":null,"startTime":1792537200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Rockford","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792548600,"flightNumber":null,"id":"Z55120-leg-1","label":null,"startTime":1792542000,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"turn"},
    {"airlineCode":null,"airportCode":"RFD","arrivalAirport":"ONT","arrivalCity":"Ontario","arrivalTimezoneIdentifier":"America/Los_Angeles","city":"Rockford","delayMinutes":null,"departureAirport":"RFD","departureCity":"Rockford","endTime":1792563600,"flightNumber":"UPS2962","id":"Z55120-leg-2","label":null,"startTime":1792548600,"timezoneIdentifier":"America/Chicago","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":null,"arrivalCity":null,"arrivalTimezoneIdentifier":null,"city":"Ontario","delayMinutes":null,"departureAirport":null,"departureCity":null,"endTime":1792638000,"flightNumber":null,"id":"Z55120-leg-3","label":null,"startTime":1792563600,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":1,"tripId":"Z55120","tripTotalDays":2,"type":"layover"},
    {"airlineCode":null,"airportCode":"ONT","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Ontario","delayMinutes":null,"departureAirport":"ONT","departureCity":"Ontario","endTime":1792652700,"flightNumber":"UPS2963","id":"Z55120-leg-4","label":null,"startTime":1792638000,"timezoneIdentifier":"America/Los_Angeles","tripDayNumber":2,"tripId":"Z55120","tripTotalDays":2,"type":"flight"},
    {"airlineCode":"DL","airportCode":"ATL","arrivalAirport":"SDF","arrivalCity":"Louisville","arrivalTimezoneIdentifier":"America/New_York","city":"Atlanta","delayMinutes":null,"departureAirport":"ATL","departureCity":"Atlanta","endTime":1792521300,"flightNumber":"DL1180","id":"js-3B1F6A2C-8D4E-4F70-9A15-6C2E8B0D4F13","label":null,"startTime":1792515900,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"},
    {"airlineCode":"DL","airportCode":"SDF","arrivalAirport":"ATL","arrivalCity":"Atlanta","arrivalTimezoneIdentifier":"America/New_York","city":"Louisville","delayMinutes":null,"departureAirport":"SDF","departureCity":"Louisville","endTime":1792674300,"flightNumber":"DL2215","id":"js-9E0D5C7B-2A41-4B8C-8F36-D1C4A7E2B590","label":null,"startTime":1792669200,"timezoneIdentifier":"America/New_York","tripDayNumber":1,"tripId":null,"tripTotalDays":1,"type":"flight"}
  ],
  "tripTotalDays": null,
  "upcomingCities": []
}
```

- [x] **Step 6: Run the test to see it pass**

Run:

```bash
cd ~/Dev/Duty/supabase/tests && node --no-maglev --test partner_status.test.js
```

Expected: `ℹ pass 25` and `ℹ fail 0`.

- [x] **Step 7: Write the folder's README**

File: `supabase/partner-status/README.md`

```markdown
# The partner summary

What CrewLu sends to Crewlu Cloud's `set_partner_status` as `p_status`, and what Crewluve and the website read back
through `partner_view`. One contract for the three apps.

- **`schema.json`:** the shape, as a JSON Schema (2020-12). Every field is listed, with its type and whether it can
  be null. Unknown fields are refused at the top level, in quick statuses and in trip legs, so a new field has to
  be added on purpose.
- **`examples/`:** nine summaries, each one moment of a made-up schedule (`DutyTests/Helpers/PartnerSummaryExamples.swift`):

  | File | The moment |
  |---|---|
  | `home.json` | At home before the trip |
  | `hidden-trip-left-out.json` | At home, with a hidden trip before the next one |
  | `turn.json` | A turn in Rockford |
  | `in-flight.json` | On UPS2962, Rockford to Ontario |
  | `layover.json` | The night in Ontario |
  | `commuting-home.json` | After the trip, waiting for the jumpseat home |
  | `quick-status-everyone.json` | Sleeping, sent to everyone |
  | `quick-status-one-partner.json` | Call Me, for partner A only |
  | `display-names.json` | Partner A sees the pilot as "Dad" |

  Partner A is `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` and partner B is `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`.

## Who checks it

- **CrewLu's tests** (`DutyTests/PartnerSummaryEncoderTests.swift`) build each example's status in code and check
  that the encoder's JSON equals the file.
- **The SQL tests** (`../tests/partner_status.test.js`) check each example against the schema and against
  `set_partner_status`, and that `partner_view` shows each partner only their own entries.
- **Crewluve and the website** copy these files for their own tests.

## What each partner sees

`partner_view` trims the summary for each partner (`../partner-api.md`):

- `displayNameByPartner` and `quickStatusByPartner` keep only that partner's own entry;
- `quickStatus`, `quickStatusIcon`, `quickStatusExpiry` and `quickStatusTargets` are there only when
  `quickStatusTargets` is null, which means the status went to everyone.

So show the partner's own quick status first, then the one for everyone.
```

- [x] **Step 8: Point the API doc to the contract, and correct its rule on per-partner names**

In `supabase/partner-api.md`, replace:

```markdown
It's CrewLu's `SharedPilotStatus`, encoded with `Codable`: dates as seconds since 1970, plus `schemaVersion: 1`. Piece 2 defines the full schema.
```

with:

```markdown
It's CrewLu's `SharedPilotStatus`: every field under its Swift name, null for nothing, dates as seconds since 1970, plus `schemaVersion: 1`. The full shape is [`partner-status/schema.json`](partner-status/schema.json), with nine examples beside it; [`partner-status/README.md`](partner-status/README.md) says what each one is.
```

In `supabase/partner-api.md`, replace:

```markdown
- **No other per-partner fields.** Any other field whose name contains `ByPartner` is refused, including today's base64 blobs `displayNameByPartnerJSON` and `quickStatusByPartnerJSON`. Encode the maps as real JSON objects.
```

with:

```markdown
- **No other per-partner fields.** Any other field whose name contains `partner`, in any case, is refused, including today's base64 blobs `displayNameByPartnerJSON` and `quickStatusByPartnerJSON`. Encode the maps as real JSON objects.
```

- [x] **Step 9: Add the contract to the tests README**

In `supabase/tests/README.md`, replace:

```markdown
- guards that mirror three of the Supabase security advisor's lints (0011, 0028 and 0029) on a build of every migration, so a new migration that undoes the fix fails here first.

They run in [PGlite](https://pglite.dev), which is Postgres compiled to WebAssembly, so they need only Node. There's no Docker, no Supabase CLI and no connection to CrewLu Cloud.
```

with:

```markdown
- guards that mirror three of the Supabase security advisor's lints (0011, 0028 and 0029) on a build of every migration, so a new migration that undoes the fix fails here first;
- the partner summary's contract (`../partner-status`): each example matches `schema.json` (checked with [Ajv](https://ajv.js.org), the only other dependency), `set_partner_status` accepts it, and `partner_view` shows each partner only their own entries.

They run in [PGlite](https://pglite.dev), which is Postgres compiled to WebAssembly, so they need only Node. There's no Docker, no Supabase CLI and no connection to CrewLu Cloud.
```

In `supabase/tests/README.md`, replace:

```markdown
143 tests run in about 20 seconds,
```

with:

```markdown
168 tests run in about 20 seconds,
```

- [x] **Step 10: Run every SQL test**

Run:

```bash
cd ~/Dev/Duty/supabase/tests && npm test
```

Expected: `ℹ tests 168`, `ℹ pass 168`, `ℹ fail 0`, in about 20 seconds.

- [x] **Step 11: Commit**

Run:

```bash
git -C ~/Dev/Duty add supabase/tests/package.json supabase/tests/package-lock.json supabase/tests/partner_status.test.js supabase/tests/README.md supabase/partner-status supabase/partner-api.md && git -C ~/Dev/Duty commit -q -m "feat(partners): the cloud summary's contract: a JSON Schema, nine examples, and SQL tests that each partner sees only their own" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 2: The partner door seam

**Files:**
- Create: `Duty/Utils/PartnerCloud/PartnerCloudAPI.swift`, `Duty/Utils/PartnerCloud/LivePartnerCloudAPI.swift`, `DutyTests/Helpers/StubPartnerCloudAPI.swift`
- Test: `DutyTests/PartnerCloudErrorTests.swift`

`PartnerCloudErrorTests` needs the Supabase SDK, so it runs only in Xcode: Task 9 compiles it and Task 11 runs it. The other partner-cloud tests run in the Mac harness from Task 3 on.

- [x] **Step 1: Write the error-mapping tests**

File: `DutyTests/PartnerCloudErrorTests.swift`

```swift
//
//  PartnerCloudErrorTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §4.1): what the Supabase SDK's errors mean for a
//  partner call. The codes are supabase/partner-api.md's "Pilot RPCs" table.
//

import XCTest
import Supabase
@testable import Duty

final class PartnerCloudErrorTests: XCTestCase {
    private func postgrest(_ code: String?) -> PostgrestError {
        PostgrestError(code: code, message: "test")
    }

    private func http(_ status: Int) -> HTTPError {
        HTTPError(data: Data(),
                  response: HTTPURLResponse(url: URL(string: "https://example.supabase.co/rest/v1/rpc/test")!,
                                            statusCode: status, httpVersion: nil, headerFields: nil)!)
    }

    private func auth(_ code: ErrorCode) -> AuthError {
        .api(message: "test",
             errorCode: code,
             underlyingData: Data(),
             underlyingResponse: HTTPURLResponse(url: URL(string: "https://example.supabase.co/auth/v1/token")!,
                                                 statusCode: 400, httpVersion: nil, headerFields: nil)!)
    }

    func test_theDoorsOwnRefusals_areRefused_withTheirCode() {
        for code in ["22023", "PT404", "PT409", "PT413"] {
            XCTAssertEqual(PartnerCloudError(postgrest(code)), .refused(code: code))
        }
    }

    func test_aMissingOrDeadSignIn_isNotSignedIn() {
        for code in ["42501", "28000", "PGRST301", "PGRST302", "PGRST303"] {
            XCTAssertEqual(PartnerCloudError(postgrest(code)), .notSignedIn, code)
        }
        XCTAssertEqual(PartnerCloudError(AuthError.sessionMissing), .notSignedIn)
        XCTAssertEqual(PartnerCloudError(auth(.refreshTokenNotFound)), .notSignedIn)
        XCTAssertEqual(PartnerCloudError(http(401)), .notSignedIn)
    }

    func test_otherClientErrors_areRefused() {
        XCTAssertEqual(PartnerCloudError(http(404)), .refused(code: "HTTP 404"))
        let decoding = DecodingError.dataCorrupted(.init(codingPath: [], debugDescription: "test"))
        XCTAssertEqual(PartnerCloudError(decoding), .refused(code: "decoding"))
    }

    /// Worth another try later: the network, the server, and sign-in trouble that isn't final.
    func test_everythingElse_isUnavailable() {
        XCTAssertEqual(PartnerCloudError(URLError(.notConnectedToInternet)), .unavailable)
        XCTAssertEqual(PartnerCloudError(postgrest("57014")), .unavailable)
        XCTAssertEqual(PartnerCloudError(postgrest(nil)), .unavailable)
        XCTAssertEqual(PartnerCloudError(http(503)), .unavailable)
        XCTAssertEqual(PartnerCloudError(auth(.emailNotConfirmed)), .unavailable)
    }

    func test_aPartnerCloudError_staysAsItIs() {
        XCTAssertEqual(PartnerCloudError(PartnerCloudError.refused(code: "PT404")), .refused(code: "PT404"))
    }
}
```

- [x] **Step 2: Write the seam**

File: `Duty/Utils/PartnerCloud/PartnerCloudAPI.swift`

```swift
//
//  PartnerCloudAPI.swift
//  Duty
//
//  Partner links, piece 2: the pilot's side of Crewlu Cloud's partner door
//  (supabase/partner-api.md). LivePartnerCloudAPI is the real one; tests use a
//  stand-in, so they never touch the network. The partner actions (invite,
//  rename, remove…) join this protocol with the partner screens.
//

import Foundation

/// How a call to the partner door can fail. Every call is safe to repeat.
enum PartnerCloudError: Error, Equatable, Sendable {
    /// Signed out, or the sign-in can't be renewed (401). Nothing was written.
    case notSignedIn
    /// Crewlu Cloud refused the call (400, 404, 409 or 413). `code` is its error code,
    /// such as `PT404`. Sending the same thing again gets the same answer.
    case refused(code: String)
    /// Crewlu Cloud couldn't be reached, or failed (network, 5xx). Try again later.
    case unavailable
}

/// Someone the pilot shares with: a row of `partners`.
struct PartnerCloudPartner: Equatable, Sendable, Identifiable {
    /// Lower-case, as the server returns it. Per-person settings are keyed by it.
    let id: String
    let name: String
    let inviteToken: String
    let createdAt: Date?
}

/// One of a partner's connected devices: a row of `partner_devices`.
struct PartnerCloudDevice: Equatable, Sendable, Identifiable {
    let id: String
    let partnerID: String
    /// `app` (Crewluve) or `web` (the website).
    let kind: String
    let label: String
    let createdAt: Date?
    let lastSeenAt: Date?
}

/// The calls CrewLu makes, signed in as the pilot. They throw `PartnerCloudError`.
protocol PartnerCloudAPI: Sendable {
    /// `set_partner_status`. `summary` is PartnerSummaryEncoder's JSON object. False
    /// means a newer CrewLu on another of the pilot's devices wrote the summary first.
    func setStatus(_ summary: Data, build: Int) async throws -> Bool
    /// The pilot's partners, oldest first.
    func partners() async throws -> [PartnerCloudPartner]
    /// Every partner's devices, oldest first.
    func devices() async throws -> [PartnerCloudDevice]
}
```

- [x] **Step 3: Write the live version**

File: `Duty/Utils/PartnerCloud/LivePartnerCloudAPI.swift`

```swift
//
//  LivePartnerCloudAPI.swift
//  Duty
//
//  PartnerCloudAPI over the shared Supabase client: PostgREST RPCs, and the
//  pilot's own rows through RLS. Every failure comes out as a PartnerCloudError.
//

import Foundation
import Supabase

struct LivePartnerCloudAPI: PartnerCloudAPI {
    let client: SupabaseClient

    init(client: SupabaseClient = SupabaseClientProvider.shared) {
        self.client = client
    }

    // The SDK writes dates as ISO-8601 text, so the summary arrives already
    // encoded (dates as seconds since 1970) and goes out as plain JSON.
    private struct SetStatusParams: Encodable {
        let p_status: AnyJSON
        let p_build: Int
    }

    private struct SetStatusAnswer: Decodable {
        let applied: Bool
    }

    func setStatus(_ summary: Data, build: Int) async throws -> Bool {
        try await call {
            let status = try JSONDecoder().decode(AnyJSON.self, from: summary)
            let answer: SetStatusAnswer = try await client
                .rpc("set_partner_status", params: SetStatusParams(p_status: status, p_build: build))
                .execute()
                .value
            return answer.applied
        }
    }

    // Timestamps stay text on the wire and are read with SyncISO, as the sync rows do.
    private struct PartnerRow: Decodable {
        let id: String
        let name: String
        let invite_token: String
        let created_at: String
    }

    func partners() async throws -> [PartnerCloudPartner] {
        try await call {
            let rows: [PartnerRow] = try await client
                .from("partners")
                .select("id,name,invite_token,created_at")
                .order("created_at", ascending: true)
                .execute()
                .value
            return rows.map {
                PartnerCloudPartner(id: $0.id, name: $0.name, inviteToken: $0.invite_token,
                                    createdAt: SyncISO.date(from: $0.created_at))
            }
        }
    }

    private struct DeviceRow: Decodable {
        let id: String
        let partner_id: String
        let kind: String
        let label: String
        let created_at: String
        let last_seen_at: String
    }

    func devices() async throws -> [PartnerCloudDevice] {
        try await call {
            let rows: [DeviceRow] = try await client
                .from("partner_devices")
                .select("id,partner_id,kind,label,created_at,last_seen_at")
                .order("created_at", ascending: true)
                .execute()
                .value
            return rows.map {
                PartnerCloudDevice(id: $0.id, partnerID: $0.partner_id, kind: $0.kind, label: $0.label,
                                   createdAt: SyncISO.date(from: $0.created_at),
                                   lastSeenAt: SyncISO.date(from: $0.last_seen_at))
            }
        }
    }

    /// Asks for the session first, which renews an expired one. Without this, a sign-in
    /// that can't be renewed would go unnoticed: the SDK sends the call without it.
    private func call<T>(_ body: () async throws -> T) async throws -> T {
        do {
            _ = try await client.auth.session
            return try await body()
        } catch {
            throw PartnerCloudError(error)
        }
    }
}

extension PartnerCloudError {
    /// What the SDK's errors mean for a partner call (supabase/partner-api.md, "Pilot RPCs").
    init(_ error: Error) {
        switch error {
        case let error as PartnerCloudError:
            self = error
        case let error as PostgrestError:
            let code = error.code ?? ""
            switch code {
            case "22023", "PT404", "PT409", "PT413":
                self = .refused(code: code)
            // 42501: called without a sign-in. 28000: a sign-in with no account.
            // PGRST301-303: a sign-in PostgREST can't use.
            case "42501", "28000", "PGRST301", "PGRST302", "PGRST303":
                self = .notSignedIn
            default:
                self = .unavailable
            }
        case let error as HTTPError:
            switch error.response.statusCode {
            case 401, 403: self = .notSignedIn
            case 400..<500: self = .refused(code: "HTTP \(error.response.statusCode)")
            default: self = .unavailable
            }
        case is AuthError:
            self = SupabaseSyncEngine.isSessionRevoked(error) ? .notSignedIn : .unavailable
        case is DecodingError:
            // A 2xx answer in a shape this build doesn't know: asking again won't help.
            self = .refused(code: "decoding")
        default:
            self = .unavailable
        }
    }
}
```

- [x] **Step 4: Write the tests' stand-in**

File: `DutyTests/Helpers/StubPartnerCloudAPI.swift`

```swift
//
//  StubPartnerCloudAPI.swift
//  DutyTests
//
//  A PartnerCloudAPI with no network. Answers are queued; writes can be held
//  open to test what happens while one is in flight.
//

import Foundation
@testable import Duty

actor StubPartnerCloudAPI: PartnerCloudAPI {
    /// Every summary set_partner_status was given, oldest first, and the build sent with it.
    private(set) var sentSummaries: [Data] = []
    private(set) var sentBuilds: [Int] = []
    private(set) var partnersCalls = 0
    private(set) var devicesCalls = 0

    /// Answers for set_partner_status, oldest first. When none are queued, the write is applied.
    private var statusAnswers: [Result<Bool, PartnerCloudError>] = []
    private var partnersAnswer: Result<[PartnerCloudPartner], PartnerCloudError> = .success([])
    private var devicesAnswer: Result<[PartnerCloudDevice], PartnerCloudError> = .success([])

    private var holdsWrites = false
    private var heldWrites: [CheckedContinuation<Void, Never>] = []
    private var writeWatchers: [CheckedContinuation<Void, Never>] = []
    private var holdsReads = false
    private var heldReads: [CheckedContinuation<Void, Never>] = []
    private var readWatchers: [CheckedContinuation<Void, Never>] = []

    func queueStatusAnswers(_ answers: Result<Bool, PartnerCloudError>...) {
        statusAnswers += answers
    }

    func answerPartners(_ answer: Result<[PartnerCloudPartner], PartnerCloudError>) {
        partnersAnswer = answer
    }

    func answerDevices(_ answer: Result<[PartnerCloudDevice], PartnerCloudError>) {
        devicesAnswer = answer
    }

    /// Writes stay open until `releaseWrites()`.
    func holdWrites() {
        holdsWrites = true
    }

    func releaseWrites() {
        holdsWrites = false
        let held = heldWrites
        heldWrites = []
        held.forEach { $0.resume() }
    }

    /// Returns once `count` writes have started.
    func waitForWrites(_ count: Int) async {
        while sentSummaries.count < count {
            await withCheckedContinuation { writeWatchers.append($0) }
        }
    }

    func setStatus(_ summary: Data, build: Int) async throws -> Bool {
        sentSummaries.append(summary)
        sentBuilds.append(build)
        let watchers = writeWatchers
        writeWatchers = []
        watchers.forEach { $0.resume() }
        if holdsWrites {
            await withCheckedContinuation { heldWrites.append($0) }
        }
        return try (statusAnswers.isEmpty ? .success(true) : statusAnswers.removeFirst()).get()
    }

    /// Reads of the partner list stay open until `releaseReads()`.
    func holdReads() {
        holdsReads = true
    }

    func releaseReads() {
        holdsReads = false
        let held = heldReads
        heldReads = []
        held.forEach { $0.resume() }
    }

    /// Returns once `count` reads of the partner list have started.
    func waitForReads(_ count: Int) async {
        while partnersCalls < count {
            await withCheckedContinuation { readWatchers.append($0) }
        }
    }

    func partners() async throws -> [PartnerCloudPartner] {
        partnersCalls += 1
        let watchers = readWatchers
        readWatchers = []
        watchers.forEach { $0.resume() }
        if holdsReads {
            await withCheckedContinuation { heldReads.append($0) }
        }
        return try partnersAnswer.get()
    }

    func devices() async throws -> [PartnerCloudDevice] {
        devicesCalls += 1
        return try devicesAnswer.get()
    }
}
```

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerCloudAPI.swift Duty/Utils/PartnerCloud/LivePartnerCloudAPI.swift DutyTests/Helpers/StubPartnerCloudAPI.swift DutyTests/PartnerCloudErrorTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): PartnerCloudAPI, its live version over the Supabase client, and how the SDK's errors map" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 3: The Mac harness

**Files (outside both repos):** `$HARNESS/Package.swift`, `$HARNESS/Sources/UIKit/UIKitStandIn.swift`, `$HARNESS/Sources/Duty/AppStandIns.swift`, `$HARNESS/run.sh`

A Swift package that compiles CrewLu's partner-cloud files and their tests unchanged, on the Mac, with stand-ins for the few app types they touch. `run.sh` copies whatever partner-cloud files exist so far from `~/Dev/Duty` (or `$DUTY`), then runs `swift test`. It needs no Xcode project, no simulator and no network, and it builds into its own `.build` folder. The test target uses the same concurrency settings as `DutyTests` (Swift 5 mode, Approachable Concurrency, member import visibility).

- [x] **Step 1: Write the package**

File: `$HARNESS/Package.swift`

```swift
// swift-tools-version: 6.0
// A Mac-only harness: compiles CrewLu's partner-cloud files and their tests unchanged,
// with stand-ins for the app types they touch. Not part of CrewLu.
import PackageDescription

let approachableConcurrency: [SwiftSetting] = [
    .enableUpcomingFeature("DisableOutwardActorInference"),
    .enableUpcomingFeature("GlobalActorIsolatedTypesUsability"),
    .enableUpcomingFeature("InferIsolatedConformances"),
    .enableUpcomingFeature("InferSendableFromCaptures"),
    .enableUpcomingFeature("NonisolatedNonsendingByDefault"),
    .enableUpcomingFeature("MemberImportVisibility"),
]

let package = Package(
    name: "DutyHarness",
    platforms: [.macOS(.v14)],
    targets: [
        .target(name: "UIKit", path: "Sources/UIKit"),
        .target(name: "Duty", dependencies: ["UIKit"], path: "Sources/Duty"),
        .testTarget(name: "DutyTests", dependencies: ["Duty"], path: "Tests/DutyTests",
                    swiftSettings: approachableConcurrency),
    ],
    swiftLanguageModes: [.v5]
)
```

- [x] **Step 2: Write the stand-ins**

File: `$HARNESS/Sources/UIKit/UIKitStandIn.swift`

```swift
// Stand-in for UIKit on the Mac: only what the partner-cloud files use.
import Foundation

public final class UIApplication {
    public static let didBecomeActiveNotification = Notification.Name("UIApplicationDidBecomeActiveNotification")
}
```

File: `$HARNESS/Sources/Duty/AppStandIns.swift`

```swift
// Stand-ins for the app types the partner-cloud files reach for in their `.shared` values.
import Foundation
import Combine

@MainActor
final class AccountController: ObservableObject {
    static let shared = AccountController()
    @Published private(set) var isSignedIn = false
    var currentUserID: String? { nil }
}

enum AccountMigration {
    static let sharedDefaults = UserDefaults.standard
    static let ownerUserIDKey = "sync.ownerUserID"
}

@MainActor
final class PartnerBeaconAutoSync {
    static let shared = PartnerBeaconAutoSync()
    func syncNowIfSharing() async {}
}

struct LivePartnerCloudAPI: PartnerCloudAPI {
    func setStatus(_ summary: Data, build: Int) async throws -> Bool { throw PartnerCloudError.unavailable }
    func partners() async throws -> [PartnerCloudPartner] { throw PartnerCloudError.unavailable }
    func devices() async throws -> [PartnerCloudDevice] { throw PartnerCloudError.unavailable }
}
```

- [x] **Step 3: Write the runner**

File: `$HARNESS/run.sh`

```bash
#!/bin/bash
# Runs CrewLu's partner-cloud tests on the Mac, without Xcode or a simulator: copies the
# partner-cloud files that exist so far from the CrewLu checkout, then runs `swift test`.
set -u
HARNESS="$(cd "$(dirname "$0")" && pwd)"
DUTY="${DUTY:-$HOME/Dev/Duty}"

# Start from the stand-ins alone, so a file removed from CrewLu doesn't linger here.
mkdir -p "$HARNESS/Sources/Duty" "$HARNESS/Tests/DutyTests"
find "$HARNESS/Sources/Duty" "$HARNESS/Tests/DutyTests" -name '*.swift' ! -name AppStandIns.swift -delete

for f in Models/SharedPilotStatus.swift Models/TripLeg.swift Utils/DebugLog.swift \
         Utils/BuildVersionGuard.swift Utils/Sync/SyncOwnerGuard.swift; do
  cp "$DUTY/Duty/$f" "$HARNESS/Sources/Duty/"
done
for f in "$DUTY"/Duty/Utils/PartnerCloud/*.swift; do
  # The live API needs the Supabase SDK; AppStandIns.swift stands in for it.
  [ -f "$f" ] && [ "$(basename "$f")" != LivePartnerCloudAPI.swift ] && cp "$f" "$HARNESS/Sources/Duty/"
done
for f in Helpers/StubPartnerCloudAPI.swift Helpers/PartnerSummaryExamples.swift PartnerSettingsTests.swift \
         PartnerSummaryEncoderTests.swift PartnerCloudStoreTests.swift PartnerSummaryCloudWriterTests.swift; do
  [ -f "$DUTY/DutyTests/$f" ] && cp "$DUTY/DutyTests/$f" "$HARNESS/Tests/DutyTests/"
done
# The encoder's tests find supabase/partner-status two folders above themselves, as in CrewLu.
ln -sfn "$DUTY/supabase" "$HARNESS/Tests/supabase"

out="$(mktemp)"
(cd "$HARNESS" && swift test) > "$out" 2>&1
code=$?
grep -E "error:" "$out" | sed -E 's|^.*/Sources/|Sources/|; s|^.*/Tests/|Tests/|' | sort -u | head -20
grep -E "^Test Case .* failed" "$out"
grep -E "Executed [0-9]+ tests?, with" "$out" | tail -1
rm -f "$out"
exit $code
```

Run:

```bash
chmod +x "$HARNESS/run.sh" && "$HARNESS/run.sh"
```

Expected: `Executed 0 tests, with 0 failures`. The first build takes about a minute; later runs take seconds. Nothing to commit: the harness isn't part of CrewLu.

### Task 4: The per-person settings

**Files:**
- Create: `Duty/Utils/PartnerCloud/PartnerSettings.swift`
- Test: `DutyTests/PartnerSettingsTests.swift`

- [x] **Step 1: Write the failing tests**

File: `DutyTests/PartnerSettingsTests.swift`

```swift
//
//  PartnerSettingsTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §6.6): reading the per-person settings.
//

import XCTest
@testable import Duty

final class PartnerSettingsTests: XCTestCase {
    private let suite = "PartnerSettingsTests"
    private var defaults: UserDefaults!

    override func setUp() {
        super.setUp()
        defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
    }

    func test_load_readsTheQuickStatusesAndTheNames() throws {
        let fourPM = Date(timeIntervalSince1970: 1_792_612_800)    // 2026-10-21 20:00 UTC
        let callMe = PartnerQuickStatusEntry(status: "Call Me", icon: "phone.fill", expiry: fourPM)
        defaults.set(try JSONEncoder().encode([PartnerSettings.everyoneKey: callMe]),
                     forKey: PartnerSettings.quickStatusKey)
        defaults.set(try JSONEncoder().encode(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": "Dad"]),
                     forKey: PartnerSettings.displayNameKey)

        let settings = PartnerSettings.load(from: defaults)
        XCTAssertEqual(settings.quickStatusByPartner[PartnerSettings.everyoneKey]?.status, "Call Me")
        XCTAssertEqual(settings.quickStatusByPartner[PartnerSettings.everyoneKey]?.expiry, fourPM)
        XCTAssertEqual(settings.displayNameByPartner, ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": "Dad"])
    }

    func test_load_withNothingSaved_orSomethingUnreadable_isEmpty() {
        XCTAssertTrue(PartnerSettings.load(from: defaults).quickStatusByPartner.isEmpty)
        defaults.set(Data("not json".utf8), forKey: PartnerSettings.quickStatusKey)
        defaults.set(Data("not json".utf8), forKey: PartnerSettings.displayNameKey)
        let settings = PartnerSettings.load(from: defaults)
        XCTAssertTrue(settings.quickStatusByPartner.isEmpty)
        XCTAssertTrue(settings.displayNameByPartner.isEmpty)
    }
}
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails because `PartnerSettings` doesn't exist yet: `cannot find 'PartnerSettings' in scope`, or `cannot find type 'PartnerSettings' in scope`, depending on which use the compiler reaches first.

- [x] **Step 3: Write the settings**

File: `Duty/Utils/PartnerCloud/PartnerSettings.swift`

```swift
//
//  PartnerSettings.swift
//  Duty
//
//  The per-person partner settings (spec §6.6): a quick status, and the name the
//  partner sees the pilot as. They stay in today's keys, synced across the pilot's
//  devices by PartnerDataKVSync, and are keyed by cloud id for Crewlu Cloud
//  partners. The partner screens add writing; the move-over adds the lookup by
//  iCloud id for people who moved over.
//

import Foundation

/// A snapshot of the per-person settings.
struct PartnerCloudSettings: Sendable {
    /// Keyed by partner id. `PartnerSettings.everyoneKey` holds a status sent to everyone.
    var quickStatusByPartner: [String: PartnerQuickStatusEntry] = [:]
    /// The name each partner sees the pilot as, keyed by partner id.
    var displayNameByPartner: [String: String] = [:]
}

enum PartnerSettings {
    static let quickStatusKey = "crewluve.quickStatusByPartner"
    static let displayNameKey = "crewluve.displayNameByPartner"
    /// The quick status sheet's key for a status sent to everyone (Send To with every partner picked).
    static let everyoneKey = "__everyone__"

    /// The saved settings. One that can't be read counts as none.
    static func load(from defaults: UserDefaults = .standard) -> PartnerCloudSettings {
        // Saved with the default JSONEncoder (PartnerQuickStatusSheet), so the default
        // decoder reads their dates, which count seconds from 2001, correctly.
        let decoder = JSONDecoder()
        return PartnerCloudSettings(
            quickStatusByPartner: defaults.data(forKey: quickStatusKey)
                .flatMap { try? decoder.decode([String: PartnerQuickStatusEntry].self, from: $0) } ?? [:],
            displayNameByPartner: defaults.data(forKey: displayNameKey)
                .flatMap { try? decoder.decode([String: String].self, from: $0) } ?? [:]
        )
    }
}
```

- [x] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 2 tests, with 0 failures`.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerSettings.swift DutyTests/PartnerSettingsTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): read the per-person settings the cloud summary carries" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 5: The encoder

**Files:**
- Create: `Duty/Utils/PartnerCloud/PartnerSummaryEncoder.swift`, `DutyTests/Helpers/PartnerSummaryExamples.swift`
- Test: `DutyTests/PartnerSummaryEncoderTests.swift`

- [x] **Step 1: Write the examples' schedule**

File: `DutyTests/Helpers/PartnerSummaryExamples.swift`

```swift
//
//  PartnerSummaryExamples.swift
//  DutyTests
//
//  The test schedule behind supabase/partner-status/examples (spec §5.3, P2-7).
//  Nothing here comes from a real schedule.
//
//  Alex lives in Atlanta and flies from Louisville. Trip Z55120 (2 days): UPS2961
//  SDF–RFD, a turn in Rockford, UPS2962 RFD–ONT, a night in Ontario, UPS2963
//  ONT–SDF, with jumpseats to work (DL1180) and home (DL2215). Each example is that
//  schedule at one moment, with the fields PartnerStatusGenerator fills in then.
//

import Foundation
@testable import Duty

enum PartnerSummaryExamples {
    /// The examples' two Crewlu Cloud partners. The SQL tests swap in real ids.
    static let partnerA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    static let partnerB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
    static let partnerIDs: Set<String> = [partnerA, partnerB]
    /// An iCloud partner (a CloudKit user record name). It never reaches a cloud summary.
    static let iCloudPartner = "_4d3c2b1a0f9e8d7c6b5a493827161504"

    struct Example {
        /// The file in supabase/partner-status/examples, without `.json`.
        let name: String
        let status: SharedPilotStatus
        let settings: PartnerCloudSettings
        let now: Date
    }

    static let all: [Example] = [
        home, commutingHome, inFlight, turn, layover, hiddenTripLeftOut,
        quickStatusEveryone, quickStatusOnePartner, displayNames,
    ]

    /// Before the trip: at home, two days before the jumpseat to work.
    static let home = example("home", now: "2026-10-19T16:00:00Z") { f in
        f.localTimeAtPilot = "12:00 PM"
    }

    /// Trip Z54980 (October 16–17) is hidden in full, so it isn't the next departure and has no legs.
    static let hiddenTripLeftOut = example("hidden-trip-left-out", now: "2026-10-15T14:00:00Z") { f in
        f.localTimeAtPilot = "10:00 AM"
    }

    /// Between UPS2961 and UPS2962: a turn in Rockford.
    static let turn = example("turn", now: "2026-10-21T01:00:00Z") { f in
        f.displayStatus = "Turn"
        f.isHome = false
        f.isOnDuty = true
        f.currentAirport = "RFD"
        f.currentCity = "Rockford"
        f.currentTimezone = "America/Chicago"
        f.localTimeAtPilot = "8:00 PM"
        f.nextDepartureTime = utc("2026-10-21T02:10:00Z")
        f.nextFlightNumber = "UPS2962"
        f.nextFlightDestination = "ONT"
        f.currentTripId = "Z55120"
        f.tripDayNumber = 2
        f.tripTotalDays = 2
        f.upcomingCities = ["Ontario", "Louisville"]
    }

    /// On UPS2962, 44% of the way from Rockford to Ontario.
    static let inFlight = example("in-flight", now: "2026-10-21T04:00:00Z") { f in
        f.displayStatus = "In Flight"
        f.isHome = false
        f.isInFlight = true
        f.isOnDuty = true
        f.currentAirport = "RFD"
        f.currentCity = "In Flight"
        f.currentTimezone = nil
        f.currentLatitude = 39.4806
        f.currentLongitude = -102.4341
        f.currentFlightNumber = "UPS2962"
        f.currentFlightDeparture = "RFD"
        f.currentFlightArrival = "ONT"
        f.currentFlightDepartureTime = utc("2026-10-21T02:10:00Z")
        f.currentFlightArrivalTime = utc("2026-10-21T06:20:00Z")
        f.currentFlightArrivalTimezone = "America/Los_Angeles"
        f.nextDepartureTime = utc("2026-10-22T03:00:00Z")
        f.nextFlightNumber = "UPS2963"
        f.nextFlightDestination = "SDF"
        f.currentTripId = "Z55120"
        f.tripDayNumber = 2
        f.tripTotalDays = 2
        f.upcomingCities = ["Louisville"]
    }

    /// The night in Ontario.
    static let layover = example("layover", now: "2026-10-21T18:00:00Z", edit: layoverFields)

    /// After the trip, waiting for the jumpseat home. The generator has no trip to
    /// count down to then, so the home arrival is empty.
    static let commutingHome = example("commuting-home", now: "2026-10-22T09:00:00Z") { f in
        f.displayStatus = "Commuting Home"
        f.localTimeAtPilot = "5:00 AM"
        f.homeArrivalTime = nil
        f.homeArrivalLabel = nil
        f.homeArrivalCity = nil
        f.nextDepartureTime = nil
        f.nextFlightNumber = nil
        f.nextFlightDestination = nil
        f.lastTripEndDate = utc("2026-10-22T07:20:00Z")
        f.lastTripDurationDays = 2
    }

    /// Sleeping, sent to everyone. Send To with everyone picked saves the everyone
    /// key plus each partner (PartnerQuickStatusSheet).
    static let quickStatusEveryone: Example = {
        let sleeping = PartnerQuickStatusEntry(status: "Sleeping", icon: "moon.zzz.fill", expiry: nil)
        let statuses = [PartnerSettings.everyoneKey: sleeping, partnerA: sleeping, partnerB: sleeping]
        return example("quick-status-everyone", now: "2026-10-21T18:00:00Z",
                       settings: PartnerCloudSettings(quickStatusByPartner: statuses)) { f in
            layoverFields(&f)
            // The iCloud record's fields, as the generator fills them
            f.isSleeping = true
            f.quickStatus = "Sleeping"
            f.quickStatusIcon = "moon.zzz.fill"
            f.quickStatusByPartnerJSON = try? JSONEncoder().encode(statuses)
        }
    }()

    /// Call Me, for partner A only, until 4:00 PM in Atlanta.
    static let quickStatusOnePartner: Example = {
        let callMe = PartnerQuickStatusEntry(status: "Call Me", icon: "phone.fill",
                                             expiry: utc("2026-10-21T20:00:00Z"))
        let statuses = [partnerA: callMe]
        return example("quick-status-one-partner", now: "2026-10-21T18:00:00Z",
                       settings: PartnerCloudSettings(quickStatusByPartner: statuses)) { f in
            layoverFields(&f)
            f.quickStatus = "Call Me"
            f.quickStatusIcon = "phone.fill"
            f.quickStatusExpiry = callMe.expiry
            f.quickStatusTargets = [partnerA]
            f.quickStatusByPartnerJSON = try? JSONEncoder().encode(statuses)
        }
    }()

    /// Partner A sees Alex as "Dad". The iCloud partner's name stays out of the cloud summary.
    static let displayNames: Example = {
        let names = [partnerA: "Dad", iCloudPartner: "Daddy"]
        return example("display-names", now: "2026-10-19T16:00:00Z",
                       settings: PartnerCloudSettings(displayNameByPartner: names)) { f in
            f.localTimeAtPilot = "12:00 PM"
            f.displayNameByPartnerJSON = try? JSONEncoder().encode(names)
        }
    }()

    // MARK: - The schedule

    /// Trip Z55120's legs, then the jumpseats: the order PartnerStatusGenerator builds them in.
    static let legs: [TripLeg] = [
        TripLeg(id: "Z55120-leg-0", tripId: "Z55120", type: .flight,
                startTime: utc("2026-10-20T23:00:00Z"), endTime: utc("2026-10-21T00:20:00Z"),
                airportCode: "SDF", city: "Louisville",
                timezoneIdentifier: "America/New_York", arrivalTimezoneIdentifier: "America/Chicago",
                flightNumber: "UPS2961", departureAirport: "SDF", arrivalAirport: "RFD",
                departureCity: "Louisville", arrivalCity: "Rockford",
                tripDayNumber: 1, tripTotalDays: 2, delayMinutes: nil, airlineCode: nil, label: nil),
        TripLeg(id: "Z55120-leg-1", tripId: "Z55120", type: .turn,
                startTime: utc("2026-10-21T00:20:00Z"), endTime: utc("2026-10-21T02:10:00Z"),
                airportCode: "RFD", city: "Rockford",
                timezoneIdentifier: "America/Chicago", arrivalTimezoneIdentifier: nil,
                flightNumber: nil, departureAirport: nil, arrivalAirport: nil,
                departureCity: nil, arrivalCity: nil,
                tripDayNumber: 1, tripTotalDays: 2, delayMinutes: nil, airlineCode: nil, label: nil),
        TripLeg(id: "Z55120-leg-2", tripId: "Z55120", type: .flight,
                startTime: utc("2026-10-21T02:10:00Z"), endTime: utc("2026-10-21T06:20:00Z"),
                airportCode: "RFD", city: "Rockford",
                timezoneIdentifier: "America/Chicago", arrivalTimezoneIdentifier: "America/Los_Angeles",
                flightNumber: "UPS2962", departureAirport: "RFD", arrivalAirport: "ONT",
                departureCity: "Rockford", arrivalCity: "Ontario",
                tripDayNumber: 1, tripTotalDays: 2, delayMinutes: nil, airlineCode: nil, label: nil),
        TripLeg(id: "Z55120-leg-3", tripId: "Z55120", type: .layover,
                startTime: utc("2026-10-21T06:20:00Z"), endTime: utc("2026-10-22T03:00:00Z"),
                airportCode: "ONT", city: "Ontario",
                timezoneIdentifier: "America/Los_Angeles", arrivalTimezoneIdentifier: nil,
                flightNumber: nil, departureAirport: nil, arrivalAirport: nil,
                departureCity: nil, arrivalCity: nil,
                tripDayNumber: 1, tripTotalDays: 2, delayMinutes: nil, airlineCode: nil, label: nil),
        TripLeg(id: "Z55120-leg-4", tripId: "Z55120", type: .flight,
                startTime: utc("2026-10-22T03:00:00Z"), endTime: utc("2026-10-22T07:05:00Z"),
                airportCode: "ONT", city: "Ontario",
                timezoneIdentifier: "America/Los_Angeles", arrivalTimezoneIdentifier: "America/New_York",
                flightNumber: "UPS2963", departureAirport: "ONT", arrivalAirport: "SDF",
                departureCity: "Ontario", arrivalCity: "Louisville",
                tripDayNumber: 2, tripTotalDays: 2, delayMinutes: nil, airlineCode: nil, label: nil),
        TripLeg(id: "js-3B1F6A2C-8D4E-4F70-9A15-6C2E8B0D4F13", tripId: nil, type: .flight,
                startTime: utc("2026-10-20T17:05:00Z"), endTime: utc("2026-10-20T18:35:00Z"),
                airportCode: "ATL", city: "Atlanta",
                timezoneIdentifier: "America/New_York", arrivalTimezoneIdentifier: "America/New_York",
                flightNumber: "DL1180", departureAirport: "ATL", arrivalAirport: "SDF",
                departureCity: "Atlanta", arrivalCity: "Louisville",
                tripDayNumber: 1, tripTotalDays: 1, delayMinutes: nil, airlineCode: "DL", label: nil),
        TripLeg(id: "js-9E0D5C7B-2A41-4B8C-8F36-D1C4A7E2B590", tripId: nil, type: .flight,
                startTime: utc("2026-10-22T11:40:00Z"), endTime: utc("2026-10-22T13:05:00Z"),
                airportCode: "SDF", city: "Louisville",
                timezoneIdentifier: "America/New_York", arrivalTimezoneIdentifier: "America/New_York",
                flightNumber: "DL2215", departureAirport: "SDF", arrivalAirport: "ATL",
                departureCity: "Louisville", arrivalCity: "Atlanta",
                tripDayNumber: 1, tripTotalDays: 1, delayMinutes: nil, airlineCode: "DL", label: nil),
    ]

    /// The legs as the iCloud record carries them (`tripLegsJSON`).
    static let legsJSON: Data = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .secondsSince1970
        return (try? encoder.encode(legs)) ?? Data()
    }()

    /// SharedPilotStatus's fields, so each example sets only what differs from home.
    struct Fields {
        var pilotId = "6F1C2D3E-4B5A-4C6D-8E7F-90A1B2C3D4E5"
        var pilotFirstName = "Alex"
        var homeAirportCode: String? = "ATL"
        var baseAirportCode: String? = "SDF"
        var homeTimezone: String? = "America/New_York"
        var displayStatus = "Home"
        var isSleeping = false
        var isHome = true
        var isInFlight = false
        var isOnDuty = false
        // At home the generator reports the base airport (calculateLocationInfo).
        var currentAirport: String? = "SDF"
        var currentCity: String? = "Louisville"
        var currentTimezone: String? = "America/New_York"
        var localTimeAtPilot: String?
        var currentLatitude: Double?
        var currentLongitude: Double?
        var currentFlightNumber: String?
        var currentFlightDeparture: String?
        var currentFlightArrival: String?
        var currentFlightDepartureTime: Date?
        var currentFlightArrivalTime: Date?
        var currentFlightArrivalTimezone: String?
        // DL2215 lands in Atlanta within 3 days of the trip's end (findHomeJumpseatNearTripEnd).
        var homeArrivalTime: Date? = utc("2026-10-22T13:05:00Z")
        var homeArrivalLabel: String? = "Back Home In"
        var homeArrivalCity: String? = "Atlanta"
        var nextDepartureTime: Date? = utc("2026-10-20T23:00:00Z")
        var nextFlightNumber: String? = "UPS2961"
        var nextFlightDestination: String? = "RFD"
        var nextDepartureLabel: String?
        var lastTripEndDate: Date?
        var lastTripDurationDays: Int?
        var currentTripId: String?
        var tripDayNumber: Int?
        var tripTotalDays: Int?
        var upcomingCities: [String] = []
        var tripLegsJSON: Data? = PartnerSummaryExamples.legsJSON
        var quickStatus: String?
        var quickStatusIcon: String?
        var quickStatusExpiry: Date?
        var quickStatusTargets: [String]?
        var quickStatusByPartnerJSON: Data?
        var displayNameByPartnerJSON: Data?
        var flightDelayMinutes: Int?
        var lastUpdated: Date
        var appVersion = "3.0"

        var status: SharedPilotStatus {
            SharedPilotStatus(
                pilotId: pilotId, pilotFirstName: pilotFirstName,
                homeAirportCode: homeAirportCode, baseAirportCode: baseAirportCode, homeTimezone: homeTimezone,
                displayStatus: displayStatus, isSleeping: isSleeping,
                isHome: isHome, isInFlight: isInFlight, isOnDuty: isOnDuty,
                currentAirport: currentAirport, currentCity: currentCity, currentTimezone: currentTimezone,
                localTimeAtPilot: localTimeAtPilot,
                currentLatitude: currentLatitude, currentLongitude: currentLongitude,
                currentFlightNumber: currentFlightNumber, currentFlightDeparture: currentFlightDeparture,
                currentFlightArrival: currentFlightArrival,
                currentFlightDepartureTime: currentFlightDepartureTime,
                currentFlightArrivalTime: currentFlightArrivalTime,
                currentFlightArrivalTimezone: currentFlightArrivalTimezone,
                homeArrivalTime: homeArrivalTime, homeArrivalLabel: homeArrivalLabel, homeArrivalCity: homeArrivalCity,
                nextDepartureTime: nextDepartureTime, nextFlightNumber: nextFlightNumber,
                nextFlightDestination: nextFlightDestination, nextDepartureLabel: nextDepartureLabel,
                lastTripEndDate: lastTripEndDate, lastTripDurationDays: lastTripDurationDays,
                currentTripId: currentTripId, tripDayNumber: tripDayNumber, tripTotalDays: tripTotalDays,
                upcomingCities: upcomingCities, tripLegsJSON: tripLegsJSON,
                quickStatus: quickStatus, quickStatusIcon: quickStatusIcon, quickStatusExpiry: quickStatusExpiry,
                quickStatusTargets: quickStatusTargets,
                quickStatusByPartnerJSON: quickStatusByPartnerJSON, displayNameByPartnerJSON: displayNameByPartnerJSON,
                flightDelayMinutes: flightDelayMinutes, lastUpdated: lastUpdated, appVersion: appVersion)
        }
    }

    /// One example: home's fields at `now`, changed by `edit`.
    static func example(_ name: String, now: String,
                        settings: PartnerCloudSettings = PartnerCloudSettings(),
                        edit: (inout Fields) -> Void = { _ in }) -> Example {
        let moment = utc(now)
        var fields = Fields(lastUpdated: moment)
        edit(&fields)
        return Example(name: name, status: fields.status, settings: settings, now: moment)
    }

    /// The night in Ontario's fields, shared by the layover examples.
    static func layoverFields(_ f: inout Fields) {
        f.displayStatus = "Layover"
        f.isHome = false
        f.currentAirport = "ONT"
        f.currentCity = "Ontario"
        f.currentTimezone = "America/Los_Angeles"
        f.localTimeAtPilot = "11:00 AM"
        f.nextDepartureTime = utc("2026-10-22T03:00:00Z")
        f.nextFlightNumber = "UPS2963"
        f.nextFlightDestination = "SDF"
        f.currentTripId = "Z55120"
        f.tripDayNumber = 2
        f.tripTotalDays = 2
        f.upcomingCities = ["Louisville"]
    }

    /// A moment written in UTC, such as "2026-10-21T18:00:00Z".
    static func utc(_ text: String) -> Date {
        guard let date = ISO8601DateFormatter().date(from: text) else {
            preconditionFailure("Not an ISO-8601 moment: \(text)")
        }
        return date
    }
}
```

- [x] **Step 2: Write the failing tests**

File: `DutyTests/PartnerSummaryEncoderTests.swift`

```swift
//
//  PartnerSummaryEncoderTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §5.1, §8.1): the cloud summary's shape. The
//  examples in supabase/partner-status/examples are the shared contract with
//  Crewluve and the website, so the encoder must produce each one exactly.
//

import XCTest
@testable import Duty

final class PartnerSummaryEncoderTests: XCTestCase {
    private typealias Examples = PartnerSummaryExamples
    private let a = PartnerSummaryExamples.partnerA
    private let b = PartnerSummaryExamples.partnerB

    /// supabase/partner-status/examples, found from this file's path on the Mac.
    private static let examplesFolder = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent()          // DutyTests
        .deletingLastPathComponent()          // the repo
        .appendingPathComponent("supabase/partner-status/examples")

    private func object(_ example: PartnerSummaryExamples.Example,
                        settings: PartnerCloudSettings? = nil) throws -> [String: Any] {
        let output = try PartnerSummaryEncoder.encode(example.status,
                                                      settings: settings ?? example.settings,
                                                      partnerIDs: Examples.partnerIDs,
                                                      now: example.now)
        return try XCTUnwrap(try JSONSerialization.jsonObject(with: output.json) as? [String: Any])
    }

    /// The same JSON, written one way: sorted keys, so two encodings of equal values compare equal.
    private func canonical(_ data: Data) throws -> String {
        let value = try JSONSerialization.jsonObject(with: data)
        let text = try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys, .prettyPrinted])
        return String(decoding: text, as: UTF8.self)
    }

    // MARK: - The shared examples

    func test_everyExample_comesOutExactly() throws {
        guard FileManager.default.fileExists(atPath: Self.examplesFolder.path) else {
            throw XCTSkip("\(Self.examplesFolder.path) can't be read here. Run the tests on a simulator, not a device.")
        }
        for example in Examples.all {
            let file = Self.examplesFolder.appendingPathComponent(example.name + ".json")
            let expected = try Data(contentsOf: file)
            let actual = try PartnerSummaryEncoder.encode(example.status, settings: example.settings,
                                                          partnerIDs: Examples.partnerIDs, now: example.now).json
            XCTAssertEqual(try canonical(actual), try canonical(expected), "\(example.name).json")
        }
    }

    func test_theExamplesFolder_holdsExactlyTheseExamples() throws {
        guard FileManager.default.fileExists(atPath: Self.examplesFolder.path) else {
            throw XCTSkip("\(Self.examplesFolder.path) can't be read here. Run the tests on a simulator, not a device.")
        }
        let files = try FileManager.default.contentsOfDirectory(atPath: Self.examplesFolder.path)
            .filter { $0.hasSuffix(".json") }
        XCTAssertEqual(Set(files), Set(Examples.all.map { $0.name + ".json" }))
    }

    // MARK: - Fields

    /// Every stored field of SharedPilotStatus goes out under its Swift name, except the three
    /// blobs, plus the four the cloud adds. A new field has to be added here on purpose.
    func test_carriesEveryStoredFieldOfSharedPilotStatus_exceptTheBlobs() throws {
        let stored = Mirror(reflecting: Examples.home.status).children.compactMap(\.label)
        let blobs: Set<String> = ["tripLegsJSON", "quickStatusByPartnerJSON", "displayNameByPartnerJSON"]
        let expected = Set(stored).subtracting(blobs)
            .union(["tripLegs", "quickStatusByPartner", "displayNameByPartner", "schemaVersion"])
        XCTAssertEqual(stored.count, 45)
        XCTAssertEqual(Set(try object(Examples.home).keys), expected)
    }

    func test_tripLegs_carryEveryField_withNullForNil() throws {
        let legs = try XCTUnwrap(try object(Examples.turn)["tripLegs"] as? [[String: Any]])
        XCTAssertEqual(legs.count, 7)
        let fields = Set(Mirror(reflecting: Examples.legs[0]).children.compactMap(\.label))
        XCTAssertEqual(fields.count, 19)
        for leg in legs {
            XCTAssertEqual(Set(leg.keys), fields)
        }
        XCTAssertTrue(legs[1]["flightNumber"] is NSNull, "the turn has no flight number")
        XCTAssertEqual(legs[1]["type"] as? String, "turn")
    }

    func test_tripLegs_areNull_whenTheICloudRecordCarriesNone() throws {
        let example = Examples.example("no-legs", now: "2026-10-19T16:00:00Z") { $0.tripLegsJSON = nil }
        XCTAssertTrue(try object(example)["tripLegs"] is NSNull)
    }

    func test_neverCarriesTheBlobs_theEveryoneKey_iCloudIds_orTickets() throws {
        for example in Examples.all {
            let output = try PartnerSummaryEncoder.encode(example.status, settings: example.settings,
                                                          partnerIDs: Examples.partnerIDs, now: example.now)
            let text = String(decoding: output.json, as: UTF8.self)
            let keys = Set(try object(example).keys)
            for field in ["tripLegsJSON", "quickStatusByPartnerJSON", "displayNameByPartnerJSON",
                          "moveTicketByPartnerJSON"] {
                XCTAssertFalse(keys.contains(field), "\(example.name): \(field)")
            }
            XCTAssertFalse(text.contains(PartnerSettings.everyoneKey), example.name)
            XCTAssertFalse(text.contains(Examples.iCloudPartner), example.name)
        }
    }

    func test_schemaVersion_isOne() throws {
        XCTAssertEqual(try object(Examples.home)["schemaVersion"] as? Int, 1)
    }

    // MARK: - Dates

    func test_datesCountSecondsFrom1970_insideTripLegsToo() throws {
        let json = try object(Examples.inFlight)
        XCTAssertEqual(json["currentFlightDepartureTime"] as? Double, 1_792_548_600)  // 2026-10-21 02:10 UTC
        XCTAssertEqual(json["lastUpdated"] as? Double, 1_792_555_200)                 // 04:00 UTC
        let legs = try XCTUnwrap(json["tripLegs"] as? [[String: Any]])
        XCTAssertEqual(legs[0]["startTime"] as? Double, 1_792_537_200)                // 2026-10-20 23:00 UTC
    }

    /// The quick status sheet saves with the default JSONEncoder: seconds from 2001.
    func test_savedQuickStatuses_countFrom2001_andGoOutCountingFrom1970() throws {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: "PartnerSummaryEncoderTests"))
        defaults.removePersistentDomain(forName: "PartnerSummaryEncoderTests")
        let callMe = PartnerQuickStatusEntry(status: "Call Me", icon: "phone.fill",
                                             expiry: Examples.utc("2026-10-21T20:00:00Z"))
        let saved = try JSONEncoder().encode([a: callMe])
        defaults.set(saved, forKey: PartnerSettings.quickStatusKey)
        let raw = try XCTUnwrap(try JSONSerialization.jsonObject(with: saved) as? [String: [String: Any]])
        XCTAssertEqual(raw[a]?["expiry"] as? Double, 814_305_600, "saved counting from 2001")

        let json = try object(Examples.layover, settings: PartnerSettings.load(from: defaults))
        let entry = try XCTUnwrap((json["quickStatusByPartner"] as? [String: [String: Any]])?[a])
        XCTAssertEqual(entry["expiry"] as? Double, 1_792_612_800, "sent counting from 1970")
    }

    // MARK: - Quick statuses (P2-3)

    func test_aStatusForEveryone_isTheTopLevelQuickStatus_withNullTargets() throws {
        let callMe = PartnerQuickStatusEntry(status: "Call Me", icon: "phone.fill",
                                             expiry: Examples.utc("2026-10-21T20:00:00Z"))
        let json = try object(Examples.layover,
                              settings: PartnerCloudSettings(quickStatusByPartner: [PartnerSettings.everyoneKey: callMe]))
        XCTAssertEqual(json["quickStatus"] as? String, "Call Me")
        XCTAssertEqual(json["quickStatusIcon"] as? String, "phone.fill")
        XCTAssertEqual(json["quickStatusExpiry"] as? Double, 1_792_612_800)
        XCTAssertTrue(json["quickStatusTargets"] is NSNull)
        XCTAssertTrue(json["quickStatusByPartner"] is NSNull, "no one has a status of their own")
        XCTAssertEqual(json["isSleeping"] as? Bool, false)
    }

    func test_withoutAStatusForEveryone_theTopLevelQuickStatusIsEmpty_andTargetsNoOne() throws {
        let json = try object(Examples.quickStatusOnePartner)
        XCTAssertTrue(json["quickStatus"] is NSNull)
        XCTAssertTrue(json["quickStatusIcon"] is NSNull)
        XCTAssertTrue(json["quickStatusExpiry"] is NSNull)
        XCTAssertEqual(json["quickStatusTargets"] as? [String], [])
        let byPartner = try XCTUnwrap(json["quickStatusByPartner"] as? [String: [String: Any]])
        XCTAssertEqual(Set(byPartner.keys), [a])
        XCTAssertEqual(byPartner[a]?["status"] as? String, "Call Me")
    }

    func test_aStatusWithNoLimit_hasANullExpiry() throws {
        let json = try object(Examples.quickStatusEveryone)
        XCTAssertTrue(json["quickStatusExpiry"] is NSNull)
        let entry = try XCTUnwrap((json["quickStatusByPartner"] as? [String: [String: Any]])?[a])
        XCTAssertEqual(Set(entry.keys), ["status", "icon", "expiry"])
        XCTAssertTrue(entry["expiry"] is NSNull)
    }

    func test_expiredStatuses_andPeopleNotOnCrewluCloud_areLeftOut() throws {
        let now = Examples.layover.now
        func entry(_ status: String, expiresIn seconds: TimeInterval?) -> PartnerQuickStatusEntry {
            PartnerQuickStatusEntry(status: status, icon: "phone.fill", expiry: seconds.map { now.addingTimeInterval($0) })
        }
        let settings = PartnerCloudSettings(quickStatusByPartner: [
            a: entry("Call Me", expiresIn: 0),                        // expires right now
            b: entry("Free to Talk", expiresIn: 60),
            Examples.iCloudPartner: entry("Call Me", expiresIn: nil),
            "cccccccc-cccc-4ccc-8ccc-cccccccccccc": entry("Call Me", expiresIn: nil),  // removed from Crewlu Cloud
            PartnerSettings.everyoneKey: entry("Out for Dinner", expiresIn: -60),
        ])
        let json = try object(Examples.layover, settings: settings)
        let byPartner = try XCTUnwrap(json["quickStatusByPartner"] as? [String: [String: Any]])
        XCTAssertEqual(Set(byPartner.keys), [b])
        XCTAssertTrue(json["quickStatus"] is NSNull, "the status for everyone has expired")
        XCTAssertEqual(json["quickStatusTargets"] as? [String], [])
    }

    func test_isSleeping_onlyWhenTheStatusForEveryoneIsSleeping() throws {
        let sleeping = PartnerQuickStatusEntry(status: "Sleeping", icon: "moon.zzz.fill", expiry: nil)
        // The iCloud record says sleeping when anyone's status is Sleeping; the cloud summary doesn't.
        let forA = try object(Examples.quickStatusEveryone,
                              settings: PartnerCloudSettings(quickStatusByPartner: [a: sleeping]))
        XCTAssertEqual(forA["isSleeping"] as? Bool, false)
        XCTAssertEqual(try object(Examples.quickStatusEveryone)["isSleeping"] as? Bool, true)
    }

    // MARK: - Display names

    func test_displayNames_onlyForCrewluCloudPartners_andNeverEmpty() throws {
        let settings = PartnerCloudSettings(displayNameByPartner: [a: "Dad", b: "", Examples.iCloudPartner: "Daddy"])
        let json = try object(Examples.home, settings: settings)
        XCTAssertEqual(json["displayNameByPartner"] as? [String: String], [a: "Dad"])
    }

    func test_emptyMaps_areNull() throws {
        let json = try object(Examples.home)
        XCTAssertTrue(json["displayNameByPartner"] is NSNull)
        XCTAssertTrue(json["quickStatusByPartner"] is NSNull)
    }

    // MARK: - The comparison key

    func test_comparisonKey_ignoresOnlyLastUpdatedAndTheLocalTime() throws {
        let earlier = Examples.example("home", now: "2026-10-19T16:00:00Z") { $0.localTimeAtPilot = "12:00 PM" }
        let later = Examples.example("home", now: "2026-10-19T16:05:00Z") { $0.localTimeAtPilot = "12:05 PM" }
        let moved = Examples.example("home", now: "2026-10-19T16:05:00Z") { f in
            f.localTimeAtPilot = "12:05 PM"
            f.currentCity = "Jeffersonville"
        }
        func output(_ example: PartnerSummaryExamples.Example) throws -> PartnerSummaryEncoder.Output {
            try PartnerSummaryEncoder.encode(example.status, settings: example.settings,
                                             partnerIDs: Examples.partnerIDs, now: example.now)
        }
        XCTAssertNotEqual(try output(earlier).json, try output(later).json)
        XCTAssertEqual(try output(earlier).comparisonKey, try output(later).comparisonKey)
        XCTAssertNotEqual(try output(later).comparisonKey, try output(moved).comparisonKey)
    }
}
```

- [x] **Step 3: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails because `PartnerSummaryEncoder` doesn't exist yet: `cannot find 'PartnerSummaryEncoder' in scope`, or `cannot find type 'PartnerSummaryEncoder' in scope`, depending on which use the compiler reaches first.

- [x] **Step 4: Write the encoder**

File: `Duty/Utils/PartnerCloud/PartnerSummaryEncoder.swift`

```swift
//
//  PartnerSummaryEncoder.swift
//  Duty
//
//  Turns CrewLu's partner summary into Crewlu Cloud's JSON, the `p_status` of
//  set_partner_status (spec §5.1). The shape is supabase/partner-status/schema.json,
//  and the examples beside it are this encoder's test cases. Pure: no I/O.
//
//  Every field of SharedPilotStatus goes out under its Swift name, with null for
//  nil, except the three Data blobs. Dates count seconds from 1970. Per-person
//  settings go out only for the account's Crewlu Cloud partners.
//

import Foundation

enum PartnerSummaryEncoder {
    static let schemaVersion = 1

    struct Output: Equatable, Sendable {
        /// The JSON object to send.
        let json: Data
        /// The same JSON without `lastUpdated` and `localTimeAtPilot`, which change on
        /// every update: equal keys mean a partner would see nothing new.
        let comparisonKey: Data
    }

    /// - Parameters:
    ///   - partnerIDs: the account's Crewlu Cloud partners, lower-case as the server
    ///     returns them. Settings for anyone else, such as iCloud partners, stay out.
    ///   - now: quick statuses that have expired by then stay out.
    static func encode(_ status: SharedPilotStatus,
                       settings: PartnerCloudSettings,
                       partnerIDs: Set<String>,
                       now: Date) throws -> Output {
        let summary = Summary(status: status, settings: settings, partnerIDs: partnerIDs, now: now)
        return Output(json: try encoder(leavingOutChangingFields: false).encode(summary),
                      comparisonKey: try encoder(leavingOutChangingFields: true).encode(summary))
    }

    private static func encoder(leavingOutChangingFields: Bool) -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .secondsSince1970
        encoder.outputFormatting = [.sortedKeys]
        encoder.userInfo[Summary.leavesOutChangingFields] = leavingOutChangingFields
        return encoder
    }
}

private struct Summary: Encodable {
    static let leavesOutChangingFields = CodingUserInfoKey(rawValue: "PartnerSummary.leavesOutChangingFields")!

    let status: SharedPilotStatus
    let tripLegs: [Leg]?
    let displayNameByPartner: [String: String]?
    let quickStatusByPartner: [String: QuickStatus]?
    /// The quick status sent to everyone, while it hasn't expired.
    let everyone: QuickStatus?

    init(status: SharedPilotStatus, settings: PartnerCloudSettings, partnerIDs: Set<String>, now: Date) {
        func isCurrent(_ entry: PartnerQuickStatusEntry) -> Bool {
            entry.expiry.map { $0 > now } ?? true
        }
        self.status = status
        // Null exactly when the iCloud record carries no legs.
        tripLegs = status.tripLegsJSON == nil ? nil : status.tripLegs.map(Leg.init)
        let names = settings.displayNameByPartner.filter { partnerIDs.contains($0.key) && !$0.value.isEmpty }
        displayNameByPartner = names.isEmpty ? nil : names
        let statuses = settings.quickStatusByPartner
            .filter { partnerIDs.contains($0.key) && isCurrent($0.value) }
            .mapValues(QuickStatus.init)
        quickStatusByPartner = statuses.isEmpty ? nil : statuses
        everyone = settings.quickStatusByPartner[PartnerSettings.everyoneKey]
            .flatMap { isCurrent($0) ? QuickStatus($0) : nil }
    }

    enum Key: String, CodingKey {
        case pilotId, pilotFirstName, homeAirportCode, baseAirportCode, homeTimezone
        case displayStatus, isSleeping, isHome, isInFlight, isOnDuty
        case currentAirport, currentCity, currentTimezone, localTimeAtPilot
        case currentLatitude, currentLongitude
        case currentFlightNumber, currentFlightDeparture, currentFlightArrival
        case currentFlightDepartureTime, currentFlightArrivalTime, currentFlightArrivalTimezone
        case homeArrivalTime, homeArrivalLabel, homeArrivalCity
        case nextDepartureTime, nextFlightNumber, nextFlightDestination, nextDepartureLabel
        case lastTripEndDate, lastTripDurationDays
        case currentTripId, tripDayNumber, tripTotalDays, upcomingCities
        case tripLegs
        case quickStatus, quickStatusIcon, quickStatusExpiry, quickStatusTargets
        case quickStatusByPartner, displayNameByPartner
        case flightDelayMinutes, lastUpdated, appVersion, schemaVersion
    }

    // Optionals go through encode(_:forKey:), not encodeIfPresent, so nil is written as null.
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: Key.self)
        let s = status
        try c.encode(s.pilotId, forKey: .pilotId)
        try c.encode(s.pilotFirstName, forKey: .pilotFirstName)
        try c.encode(s.homeAirportCode, forKey: .homeAirportCode)
        try c.encode(s.baseAirportCode, forKey: .baseAirportCode)
        try c.encode(s.homeTimezone, forKey: .homeTimezone)
        try c.encode(s.displayStatus, forKey: .displayStatus)
        // Sleeping only when everyone is told so: a status for one person stays theirs (P2-3).
        try c.encode(everyone?.entry.status == "Sleeping", forKey: .isSleeping)
        try c.encode(s.isHome, forKey: .isHome)
        try c.encode(s.isInFlight, forKey: .isInFlight)
        try c.encode(s.isOnDuty, forKey: .isOnDuty)
        try c.encode(s.currentAirport, forKey: .currentAirport)
        try c.encode(s.currentCity, forKey: .currentCity)
        try c.encode(s.currentTimezone, forKey: .currentTimezone)
        try c.encode(s.currentLatitude, forKey: .currentLatitude)
        try c.encode(s.currentLongitude, forKey: .currentLongitude)
        try c.encode(s.currentFlightNumber, forKey: .currentFlightNumber)
        try c.encode(s.currentFlightDeparture, forKey: .currentFlightDeparture)
        try c.encode(s.currentFlightArrival, forKey: .currentFlightArrival)
        try c.encode(s.currentFlightDepartureTime, forKey: .currentFlightDepartureTime)
        try c.encode(s.currentFlightArrivalTime, forKey: .currentFlightArrivalTime)
        try c.encode(s.currentFlightArrivalTimezone, forKey: .currentFlightArrivalTimezone)
        try c.encode(s.homeArrivalTime, forKey: .homeArrivalTime)
        try c.encode(s.homeArrivalLabel, forKey: .homeArrivalLabel)
        try c.encode(s.homeArrivalCity, forKey: .homeArrivalCity)
        try c.encode(s.nextDepartureTime, forKey: .nextDepartureTime)
        try c.encode(s.nextFlightNumber, forKey: .nextFlightNumber)
        try c.encode(s.nextFlightDestination, forKey: .nextFlightDestination)
        try c.encode(s.nextDepartureLabel, forKey: .nextDepartureLabel)
        try c.encode(s.lastTripEndDate, forKey: .lastTripEndDate)
        try c.encode(s.lastTripDurationDays, forKey: .lastTripDurationDays)
        try c.encode(s.currentTripId, forKey: .currentTripId)
        try c.encode(s.tripDayNumber, forKey: .tripDayNumber)
        try c.encode(s.tripTotalDays, forKey: .tripTotalDays)
        try c.encode(s.upcomingCities, forKey: .upcomingCities)
        try c.encode(tripLegs, forKey: .tripLegs)
        try c.encode(everyone?.entry.status, forKey: .quickStatus)
        try c.encode(everyone?.entry.icon, forKey: .quickStatusIcon)
        try c.encode(everyone?.entry.expiry, forKey: .quickStatusExpiry)
        // Null: everyone sees the status above. []: no one does (supabase/partner-api.md).
        let targets: [String]? = everyone == nil ? [] : nil
        try c.encode(targets, forKey: .quickStatusTargets)
        try c.encode(quickStatusByPartner, forKey: .quickStatusByPartner)
        try c.encode(displayNameByPartner, forKey: .displayNameByPartner)
        try c.encode(s.flightDelayMinutes, forKey: .flightDelayMinutes)
        try c.encode(s.appVersion, forKey: .appVersion)
        try c.encode(PartnerSummaryEncoder.schemaVersion, forKey: .schemaVersion)
        if encoder.userInfo[Self.leavesOutChangingFields] as? Bool != true {
            try c.encode(s.lastUpdated, forKey: .lastUpdated)
            try c.encode(s.localTimeAtPilot, forKey: .localTimeAtPilot)
        }
    }
}

/// A quick status: `{status, icon, expiry}`, with a null expiry for no limit.
private struct QuickStatus: Encodable {
    let entry: PartnerQuickStatusEntry

    init(_ entry: PartnerQuickStatusEntry) {
        self.entry = entry
    }

    enum Key: String, CodingKey {
        case status, icon, expiry
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: Key.self)
        try c.encode(entry.status, forKey: .status)
        try c.encode(entry.icon, forKey: .icon)
        try c.encode(entry.expiry, forKey: .expiry)
    }
}

/// A trip leg with every field, null for nil (TripLeg's own Codable leaves nils out).
private struct Leg: Encodable {
    let leg: TripLeg

    init(_ leg: TripLeg) {
        self.leg = leg
    }

    enum Key: String, CodingKey {
        case id, tripId, type, startTime, endTime
        case airportCode, city, timezoneIdentifier, arrivalTimezoneIdentifier
        case flightNumber, departureAirport, arrivalAirport, departureCity, arrivalCity
        case tripDayNumber, tripTotalDays, delayMinutes, airlineCode, label
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: Key.self)
        try c.encode(leg.id, forKey: .id)
        try c.encode(leg.tripId, forKey: .tripId)
        try c.encode(leg.type.rawValue, forKey: .type)
        try c.encode(leg.startTime, forKey: .startTime)
        try c.encode(leg.endTime, forKey: .endTime)
        try c.encode(leg.airportCode, forKey: .airportCode)
        try c.encode(leg.city, forKey: .city)
        try c.encode(leg.timezoneIdentifier, forKey: .timezoneIdentifier)
        try c.encode(leg.arrivalTimezoneIdentifier, forKey: .arrivalTimezoneIdentifier)
        try c.encode(leg.flightNumber, forKey: .flightNumber)
        try c.encode(leg.departureAirport, forKey: .departureAirport)
        try c.encode(leg.arrivalAirport, forKey: .arrivalAirport)
        try c.encode(leg.departureCity, forKey: .departureCity)
        try c.encode(leg.arrivalCity, forKey: .arrivalCity)
        try c.encode(leg.tripDayNumber, forKey: .tripDayNumber)
        try c.encode(leg.tripTotalDays, forKey: .tripTotalDays)
        try c.encode(leg.delayMinutes, forKey: .delayMinutes)
        try c.encode(leg.airlineCode, forKey: .airlineCode)
        try c.encode(leg.label, forKey: .label)
    }
}
```

- [x] **Step 5: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 19 tests, with 0 failures`, with nothing skipped: the harness reaches the examples through `$HARNESS/Tests/supabase`. If `test_everyExample_comesOutExactly` fails, the message shows both JSONs; stop and compare them with Task 1's files rather than changing either.

- [x] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerSummaryEncoder.swift DutyTests/Helpers/PartnerSummaryExamples.swift DutyTests/PartnerSummaryEncoderTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): PartnerSummaryEncoder, which produces the contract's nine examples exactly" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 6: The partner list

**Files:**
- Create: `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`
- Test: `DutyTests/PartnerCloudStoreTests.swift`

- [x] **Step 1: Write the failing tests**

File: `DutyTests/PartnerCloudStoreTests.swift`

```swift
//
//  PartnerCloudStoreTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §5.2, §6.7, §8.1): the account's partner list
//  the summary writer goes by.
//

import XCTest
@testable import Duty

@MainActor
final class PartnerCloudStoreTests: XCTestCase {
    private let suite = "PartnerCloudStoreTests"
    private let a = PartnerSummaryExamples.partnerA
    private let b = PartnerSummaryExamples.partnerB
    private var defaults: UserDefaults!
    private var api: StubPartnerCloudAPI!
    private var signedInAs: String?
    private var scheduleIsTheAccounts = true
    private var changes = 0

    override func setUp() {
        super.setUp()
        defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        api = StubPartnerCloudAPI()
        signedInAs = "PILOT-1"
        scheduleIsTheAccounts = true
        changes = 0
    }

    private func makeStore() -> PartnerCloudStore {
        PartnerCloudStore(api: api,
                          currentUserID: { [unowned self] in self.signedInAs },
                          ownerAllows: { [unowned self] _ in self.scheduleIsTheAccounts },
                          defaults: defaults,
                          partnersChanged: { [unowned self] in self.changes += 1 })
    }

    private func partner(_ id: String, _ name: String) -> PartnerCloudPartner {
        PartnerCloudPartner(id: id, name: name, inviteToken: "invite-\(name)", createdAt: nil)
    }

    private func saved(_ account: String) -> [String]? {
        defaults.stringArray(forKey: PartnerCloudStore.savedIDsKeyPrefix + account)
    }

    func test_cloudSharing_needsASignIn_theOwnerRule_andAPartner() async {
        await api.answerPartners(.success([partner(a, "Sam")]))
        let store = makeStore()
        store.accountChanged()
        XCTAssertFalse(store.isCloudSharing, "no partners yet")
        await store.refresh()
        XCTAssertTrue(store.isCloudSharing)
        scheduleIsTheAccounts = false
        XCTAssertFalse(store.isCloudSharing, "the schedule on this phone is another account's")
        scheduleIsTheAccounts = true
        signedInAs = nil
        XCTAssertFalse(store.isCloudSharing, "signed out")
    }

    func test_refresh_keepsTheListAndTheDevices() async {
        let device = PartnerCloudDevice(id: "d1", partnerID: a, kind: "app", label: "Sam's iPhone",
                                        createdAt: nil, lastSeenAt: nil)
        await api.answerPartners(.success([partner(a, "Sam")]))
        await api.answerDevices(.success([device]))
        let store = makeStore()
        store.accountChanged()
        await store.refresh()
        XCTAssertEqual(store.accountID, "PILOT-1")
        XCTAssertEqual(store.partnerIDs, [a])
        XCTAssertEqual(store.partners.map(\.name), ["Sam"])
        XCTAssertEqual(store.devices, [device])
        XCTAssertEqual(saved("PILOT-1"), [a], "only the ids are saved")
    }

    func test_withNoPartners_theDevicesArentRead() async {
        let store = makeStore()
        store.accountChanged()
        await store.refresh()
        let partnerReads = await api.partnersCalls
        let deviceReads = await api.devicesCalls
        XCTAssertEqual(partnerReads, 1)
        XCTAssertEqual(deviceReads, 0)
        XCTAssertFalse(store.lastRefreshFailed)
    }

    func test_aRelaunch_sharesBeforeItsFirstRefresh() async {
        await api.answerPartners(.success([partner(a, "Sam")]))
        let first = makeStore()
        first.accountChanged()
        await first.refresh()

        let relaunched = makeStore()
        XCTAssertTrue(relaunched.isCloudSharing, "before it has followed the sign-in")
        relaunched.accountChanged()
        XCTAssertEqual(relaunched.partnerIDs, [a])
        XCTAssertEqual(relaunched.partners, [], "names and devices come with a refresh")
    }

    func test_signingOut_forgetsEveryAccountsList() async {
        defaults.set([b], forKey: PartnerCloudStore.savedIDsKeyPrefix + "PILOT-2")
        await api.answerPartners(.success([partner(a, "Sam")]))
        let store = makeStore()
        store.accountChanged()
        await store.refresh()

        signedInAs = nil
        XCTAssertTrue(store.accountChanged())
        XCTAssertNil(store.accountID)
        XCTAssertEqual(store.partnerIDs, [])
        XCTAssertEqual(store.partners, [])
        XCTAssertNil(saved("PILOT-1"))
        XCTAssertNil(saved("PILOT-2"))

        signedInAs = "PILOT-1"
        XCTAssertFalse(makeStore().isCloudSharing, "nothing saved for a relaunch")
    }

    func test_anotherAccount_getsItsOwnList() async {
        await api.answerPartners(.success([partner(a, "Sam")]))
        let store = makeStore()
        store.accountChanged()
        await store.refresh()

        signedInAs = "PILOT-2"
        XCTAssertTrue(store.accountChanged())
        XCTAssertEqual(store.partnerIDs, [], "PILOT-1's partners aren't PILOT-2's")
        XCTAssertEqual(store.partners, [])
        await api.answerPartners(.success([partner(b, "Jo")]))
        await store.refresh()
        XCTAssertEqual(store.partnerIDs, [b])
        XCTAssertEqual(saved("PILOT-1"), [a])
        XCTAssertEqual(saved("PILOT-2"), [b])
    }

    func test_partnersChanged_onlyWhenTheIdsChange() async {
        let store = makeStore()
        store.accountChanged()
        await api.answerPartners(.success([partner(a, "Sam")]))
        await store.refresh()
        XCTAssertEqual(changes, 1)
        await api.answerPartners(.success([partner(a, "Samantha")]))
        await store.refresh()
        XCTAssertEqual(changes, 1, "a new name changes no id")
        XCTAssertEqual(store.partners.map(\.name), ["Samantha"])
        await api.answerPartners(.success([partner(a, "Samantha"), partner(b, "Jo")]))
        await store.refresh()
        XCTAssertEqual(changes, 2)
        await api.answerPartners(.success([]))
        await store.refresh()
        XCTAssertEqual(changes, 3)
        XCTAssertFalse(store.isCloudSharing)
    }

    func test_aFailedRefresh_keepsTheList() async {
        let store = makeStore()
        store.accountChanged()
        await api.answerPartners(.success([partner(a, "Sam")]))
        await store.refresh()
        await api.answerPartners(.failure(.unavailable))
        await store.refresh()
        XCTAssertTrue(store.lastRefreshFailed)
        XCTAssertEqual(store.partnerIDs, [a])
        XCTAssertEqual(store.partners.map(\.name), ["Sam"])
        await api.answerPartners(.success([partner(a, "Sam")]))
        await store.refresh()
        XCTAssertFalse(store.lastRefreshFailed)
    }

    func test_aRefreshThatEndsAfterASignOut_isDropped() async {
        let store = makeStore()
        store.accountChanged()
        await api.answerPartners(.success([partner(a, "Sam")]))
        await api.holdReads()
        let refresh = Task { await store.refresh() }
        await api.waitForReads(1)
        signedInAs = nil
        store.accountChanged()
        await api.releaseReads()
        await refresh.value
        XCTAssertEqual(store.partnerIDs, [])
        XCTAssertEqual(store.partners, [])
        XCTAssertNil(saved("PILOT-1"))
        XCTAssertEqual(changes, 0)
    }
}
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails because `PartnerCloudStore` doesn't exist yet: `cannot find 'PartnerCloudStore' in scope`, or `cannot find type 'PartnerCloudStore' in scope`, depending on which use the compiler reaches first.

- [x] **Step 3: Write the store**

File: `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`

```swift
//
//  PartnerCloudStore.swift
//  Duty
//
//  The signed-in account's Crewlu Cloud partners (spec §6). It keeps the list the
//  summary writer needs: refreshed at launch, on coming back to the app and on
//  signing in; forgotten on signing out. Only the partner ids are saved, per
//  account, so a relaunch keeps writing before the first refresh. The partner
//  screens add the actions.
//

import Foundation
import Combine
import Observation
import UIKit

@MainActor
@Observable
final class PartnerCloudStore {
    static let shared = PartnerCloudStore(
        api: LivePartnerCloudAPI(),
        currentUserID: { AccountController.shared.currentUserID },
        ownerAllows: { SyncOwnerGuard.allowsSync(uid: $0) },
        defaults: .standard,
        partnersChanged: {
            // A changed list can start (or stop) the summary writes without anyone opening a screen.
            Task { await PartnerBeaconAutoSync.shared.syncNowIfSharing() }
        }
    )

    /// Where an account's partner ids are saved: this prefix plus the account id.
    static let savedIDsKeyPrefix = "partnerCloud.partnerIDs."

    /// The account this list belongs to, or nil when signed out.
    private(set) var accountID: String?
    /// The account's partner ids: from the last refresh, or saved by an earlier launch.
    private(set) var partnerIDs: Set<String> = []
    /// The account's partners and their devices, as of the last refresh on this launch.
    private(set) var partners: [PartnerCloudPartner] = []
    private(set) var devices: [PartnerCloudDevice] = []
    /// The last refresh failed. The list keeps what it had.
    private(set) var lastRefreshFailed = false

    private let api: any PartnerCloudAPI
    private let currentUserID: () -> String?
    private let ownerAllows: (String) -> Bool
    private let defaults: UserDefaults
    private let partnersChanged: () -> Void
    @ObservationIgnored private var hasLoadedAccount = false
    @ObservationIgnored private var isRefreshing = false
    @ObservationIgnored private var signInObserver: AnyCancellable?
    private static var activeObserver: NSObjectProtocol?

    init(api: any PartnerCloudAPI,
         currentUserID: @escaping () -> String?,
         ownerAllows: @escaping (String) -> Bool,
         defaults: UserDefaults,
         partnersChanged: @escaping () -> Void) {
        self.api = api
        self.currentUserID = currentUserID
        self.ownerAllows = ownerAllows
        self.defaults = defaults
        self.partnersChanged = partnersChanged
    }

    /// The account whose summary this device writes, with its partner ids: signed in, and
    /// the schedule on this phone is that account's (`SyncOwnerGuard`). Nil otherwise.
    func sharingAccount() -> (id: String, partnerIDs: Set<String>)? {
        guard let uid = currentUserID(), ownerAllows(uid) else { return nil }
        // Before this launch has followed the sign-in, use the ids saved last time.
        return (uid, uid == accountID ? partnerIDs : savedIDs(for: uid))
    }

    /// Crewlu Cloud sharing is on: this device writes the summary of an account with partners.
    var isCloudSharing: Bool {
        sharingAccount().map { !$0.partnerIDs.isEmpty } ?? false
    }

    /// Follows a sign-in, a sign-out or a switch of accounts. True when the account changed.
    @discardableResult
    func accountChanged() -> Bool {
        let uid = currentUserID()
        guard !hasLoadedAccount || uid != accountID else { return false }
        hasLoadedAccount = true
        accountID = uid
        partners = []
        devices = []
        lastRefreshFailed = false
        if let uid {
            partnerIDs = savedIDs(for: uid)
        } else {
            // Signed out: this device forgets every account's list (spec §6.7).
            partnerIDs = []
            for key in defaults.dictionaryRepresentation().keys where key.hasPrefix(Self.savedIDsKeyPrefix) {
                defaults.removeObject(forKey: key)
            }
        }
        return true
    }

    /// Reads the account's partners and devices from Crewlu Cloud.
    func refresh() async {
        guard let uid = accountID, uid == currentUserID(), !isRefreshing else { return }
        isRefreshing = true
        defer { isRefreshing = false }
        do {
            let newPartners = try await api.partners()
            // Most pilots share with no one: one read is enough then.
            let newDevices = newPartners.isEmpty ? [] : try await api.devices()
            guard accountID == uid else { return }    // signed out or switched meanwhile
            partners = newPartners
            devices = newDevices
            lastRefreshFailed = false
            let ids = Set(newPartners.map(\.id))
            guard ids != partnerIDs else { return }
            partnerIDs = ids
            defaults.set(ids.sorted(), forKey: Self.savedIDsKeyPrefix + uid)
            partnersChanged()
        } catch {
            guard accountID == uid else { return }
            lastRefreshFailed = true
            debugLog("[PartnerCloud] Couldn't refresh the partner list: \(error)")
        }
    }

    /// Starts following the app: coming back to it, and signing in or out. Called once, at
    /// launch. The store, and the Supabase client it uses, are made on the first activation.
    static func startObservingApp() {
        guard activeObserver == nil else { return }
        activeObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { _ in
            Task { @MainActor in PartnerCloudStore.shared.appBecameActive() }
        }
    }

    private func appBecameActive() {
        if signInObserver == nil {
            // Signing out posts no notification, so follow the published flag. The Task
            // runs after the flag has changed (@Published announces it just before).
            signInObserver = AccountController.shared.$isSignedIn
                .dropFirst()
                .sink { [weak self] _ in
                    Task { @MainActor in
                        guard let self, self.accountChanged() else { return }
                        await self.refresh()
                    }
                }
        }
        accountChanged()
        Task { await refresh() }
    }

    private func savedIDs(for uid: String) -> Set<String> {
        Set(defaults.stringArray(forKey: Self.savedIDsKeyPrefix + uid) ?? [])
    }
}
```

- [x] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 28 tests, with 0 failures`.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerCloudStore.swift DutyTests/PartnerCloudStoreTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): PartnerCloudStore, the account's partner list: ids saved per account, refreshed, forgotten on sign-out" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 7: The writer

**Files:**
- Create: `Duty/Utils/PartnerCloud/PartnerSummaryCloudWriter.swift`
- Test: `DutyTests/PartnerSummaryCloudWriterTests.swift`

- [x] **Step 1: Write the failing tests**

File: `DutyTests/PartnerSummaryCloudWriterTests.swift`

```swift
//
//  PartnerSummaryCloudWriterTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §5.2, §8.1): when the cloud summary is sent.
//

import XCTest
@testable import Duty

@MainActor
final class PartnerSummaryCloudWriterTests: XCTestCase {
    private typealias Examples = PartnerSummaryExamples
    private let suite = "PartnerSummaryCloudWriterTests"
    private let account = "PILOT-1"
    private var defaults: UserDefaults!
    private var api: StubPartnerCloudAPI!
    private var signedInAs: String?
    private var scheduleIsTheAccounts = true

    override func setUp() {
        super.setUp()
        defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        api = StubPartnerCloudAPI()
        signedInAs = account
        scheduleIsTheAccounts = true
    }

    /// A writer for the account, whose saved partner list is `partners`.
    private func makeWriter(partners: [String] = [PartnerSummaryExamples.partnerA],
                            settings: PartnerCloudSettings = PartnerCloudSettings()) -> PartnerSummaryCloudWriter {
        defaults.set(partners, forKey: PartnerCloudStore.savedIDsKeyPrefix + account)
        let store = PartnerCloudStore(api: api,
                                      currentUserID: { [unowned self] in self.signedInAs },
                                      ownerAllows: { [unowned self] _ in self.scheduleIsTheAccounts },
                                      defaults: defaults,
                                      partnersChanged: {})
        store.accountChanged()
        return PartnerSummaryCloudWriter(api: api, store: store, settings: { settings }, build: 412,
                                         now: { Examples.layover.now })
    }

    /// The layover five minutes later: only the time has moved.
    private var layoverLater: SharedPilotStatus {
        Examples.example("layover", now: "2026-10-21T18:05:00Z") { f in
            Examples.layoverFields(&f)
            f.localTimeAtPilot = "11:05 AM"
        }.status
    }

    /// The display status of each summary sent, oldest first.
    private func sentStatuses() async -> [String] {
        let summaries = await api.sentSummaries
        return summaries.map { data in
            let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            return object?["displayStatus"] as? String ?? "?"
        }
    }

    func test_sendsTheSummary_withThisBuild() async {
        let writer = makeWriter()
        writer.submit(Examples.layover.status)
        await writer.waitUntilIdle()
        let builds = await api.sentBuilds
        XCTAssertEqual(builds, [412])
        XCTAssertEqual(writer.lastAppliedAt, Examples.layover.now)
        XCTAssertNil(writer.problem)
    }

    func test_sendsNothing_unlessSignedIn_theScheduleIsTheAccounts_andThereArePartners() async {
        signedInAs = nil
        let signedOut = makeWriter()
        signedOut.submit(Examples.layover.status)
        await signedOut.waitUntilIdle()

        signedInAs = account
        scheduleIsTheAccounts = false
        let anotherAccountsSchedule = makeWriter()
        anotherAccountsSchedule.submit(Examples.layover.status)
        await anotherAccountsSchedule.waitUntilIdle()

        scheduleIsTheAccounts = true
        let noPartners = makeWriter(partners: [])
        noPartners.submit(Examples.layover.status)
        await noPartners.waitUntilIdle()

        let sent = await api.sentSummaries
        XCTAssertEqual(sent.count, 0)
    }

    func test_onlyTheAccountsPartners_areInTheSummary() async throws {
        let names = [Examples.partnerA: "Dad", Examples.partnerB: "Alex"]
        let writer = makeWriter(partners: [Examples.partnerA], settings: PartnerCloudSettings(displayNameByPartner: names))
        writer.submit(Examples.home.status)
        await writer.waitUntilIdle()
        let summaries = await api.sentSummaries
        let sent = try XCTUnwrap(summaries.first)
        let object = try XCTUnwrap(try JSONSerialization.jsonObject(with: sent) as? [String: Any])
        XCTAssertEqual(object["displayNameByPartner"] as? [String: String], [Examples.partnerA: "Dad"])
    }

    func test_skipsASummary_thatShowsAPartnerNothingNew() async {
        let writer = makeWriter()
        writer.submit(Examples.layover.status)
        await writer.waitUntilIdle()
        writer.submit(layoverLater)
        await writer.waitUntilIdle()
        let sent = await api.sentSummaries
        XCTAssertEqual(sent.count, 1)
    }

    func test_force_sendsAnUnchangedSummary() async {
        let writer = makeWriter()
        writer.submit(Examples.layover.status)
        await writer.waitUntilIdle()
        writer.submit(layoverLater, force: true)
        await writer.waitUntilIdle()
        let sent = await api.sentSummaries
        XCTAssertEqual(sent.count, 2)
    }

    func test_oneWriteAtATime_andTheNewestWaitingSummaryWins() async {
        let writer = makeWriter()
        await api.holdWrites()
        writer.submit(Examples.turn.status)
        await api.waitForWrites(1)
        writer.submit(Examples.inFlight.status)     // waits for the turn's write
        writer.submit(Examples.layover.status)      // replaces the waiting one
        await api.releaseWrites()
        await writer.waitUntilIdle()
        let sent = await sentStatuses()
        XCTAssertEqual(sent, ["Turn", "Layover"])
    }

    func test_signingOut_dropsAWaitingSummary() async {
        let writer = makeWriter()
        await api.holdWrites()
        writer.submit(Examples.turn.status)
        await api.waitForWrites(1)
        writer.submit(Examples.layover.status)
        signedInAs = nil
        writer.submit(Examples.inFlight.status)
        await api.releaseWrites()
        await writer.waitUntilIdle()
        let sent = await sentStatuses()
        XCTAssertEqual(sent, ["Turn"])
    }

    func test_whenCrewluCloudIsUnavailable_theNextUpdateSendsAgain() async {
        let writer = makeWriter()
        await api.queueStatusAnswers(.failure(.unavailable))
        writer.submit(Examples.layover.status)
        await writer.waitUntilIdle()
        XCTAssertNil(writer.lastAppliedAt, "nothing was applied")
        writer.submit(layoverLater)
        await writer.waitUntilIdle()
        let sent = await api.sentSummaries
        XCTAssertEqual(sent.count, 2)
        XCTAssertEqual(writer.lastAppliedAt, Examples.layover.now)
    }

    func test_aRefusedSummary_isNotSentAgain_butADifferentOneIs() async {
        let writer = makeWriter()
        await api.queueStatusAnswers(.failure(.refused(code: "22023")))
        writer.submit(Examples.layover.status)
        await writer.waitUntilIdle()
        writer.submit(layoverLater)
        await writer.waitUntilIdle()
        writer.submit(layoverLater, force: true)
        await writer.waitUntilIdle()
        writer.submit(Examples.turn.status)
        await writer.waitUntilIdle()
        let sent = await sentStatuses()
        XCTAssertEqual(sent, ["Layover", "Turn"])
        XCTAssertNil(writer.problem, "a refusal is a bug to log, not something for the pilot")
    }

    func test_aNewerBuildOnAnotherDevice_isReported_andTheNextUpdateTriesAgain() async {
        let writer = makeWriter()
        await api.queueStatusAnswers(.success(false))
        writer.submit(Examples.layover.status)
        await writer.waitUntilIdle()
        XCTAssertEqual(writer.problem, .newerBuild)
        XCTAssertNil(writer.lastAppliedAt)

        writer.submit(layoverLater)
        await writer.waitUntilIdle()
        let sent = await api.sentSummaries
        XCTAssertEqual(sent.count, 2)
        XCTAssertNil(writer.problem, "the next applied write clears it")
    }

    func test_anExpiredSignIn_isReported() async {
        let writer = makeWriter()
        await api.queueStatusAnswers(.failure(.notSignedIn))
        writer.submit(Examples.layover.status)
        await writer.waitUntilIdle()
        XCTAssertEqual(writer.problem, .signInExpired)
        XCTAssertNil(writer.lastAppliedAt)
    }
}
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails because `PartnerSummaryCloudWriter` doesn't exist yet: `cannot find 'PartnerSummaryCloudWriter' in scope`, or `cannot find type 'PartnerSummaryCloudWriter' in scope`, depending on which use the compiler reaches first.

- [x] **Step 3: Write the writer**

File: `Duty/Utils/PartnerCloud/PartnerSummaryCloudWriter.swift`

```swift
//
//  PartnerSummaryCloudWriter.swift
//  Duty
//
//  Sends the partner summary to Crewlu Cloud (spec §5.2), next to the iCloud
//  record. PartnerBeaconAutoSync hands over every summary it makes; this writer
//  decides whether to send it. One write at a time: a summary that arrives
//  meanwhile waits, and a newer one replaces it.
//

import Foundation
import Observation

@MainActor
@Observable
final class PartnerSummaryCloudWriter {
    static let shared = PartnerSummaryCloudWriter(
        api: LivePartnerCloudAPI(),
        store: .shared,
        settings: { PartnerSettings.load() },
        build: BuildVersionGuard.currentBuild,
        now: { Date() }
    )

    enum Problem: Equatable {
        /// A newer CrewLu on another of the pilot's devices wrote the summary (`applied: false`).
        case newerBuild
        /// Crewlu Cloud needs the pilot to sign in again.
        case signInExpired
    }

    /// What the Partner Sharing screen should mention. The next applied write clears it.
    private(set) var problem: Problem?
    /// When Crewlu Cloud last applied a summary from this device.
    private(set) var lastAppliedAt: Date?

    private let api: any PartnerCloudAPI
    private let store: PartnerCloudStore
    private let settings: () -> PartnerCloudSettings
    private let build: Int
    private let now: () -> Date

    private struct Pending {
        let account: String
        let output: PartnerSummaryEncoder.Output
    }

    @ObservationIgnored private var waiting: Pending?
    @ObservationIgnored private var drainTask: Task<Void, Never>?
    /// Per account, the comparison key of the last summary Crewlu Cloud applied,
    /// and of the last one it refused. Kept apart from the iCloud writer's.
    @ObservationIgnored private var lastApplied: [String: Data] = [:]
    @ObservationIgnored private var lastRefused: [String: Data] = [:]

    init(api: any PartnerCloudAPI,
         store: PartnerCloudStore,
         settings: @escaping () -> PartnerCloudSettings,
         build: Int,
         now: @escaping () -> Date) {
        self.api = api
        self.store = store
        self.settings = settings
        self.build = build
        self.now = now
    }

    /// Hands over a new summary. It's sent while the pilot shares through Crewlu Cloud
    /// (signed in, the owner rule, at least one partner), unless a partner would see
    /// nothing new. `force` sends it anyway, as forceUpdate does for iCloud.
    func submit(_ status: SharedPilotStatus, force: Bool = false) {
        guard let account = store.sharingAccount(), !account.partnerIDs.isEmpty else {
            waiting = nil
            return
        }
        let output: PartnerSummaryEncoder.Output
        do {
            output = try PartnerSummaryEncoder.encode(status, settings: settings(),
                                                     partnerIDs: account.partnerIDs, now: now())
        } catch {
            debugLog("[PartnerCloud] Couldn't encode the summary: \(error)")
            return
        }
        // A refused summary is a bug: sending it again would get the same answer.
        if output.comparisonKey == lastRefused[account.id] { return }
        if !force, output.comparisonKey == lastApplied[account.id] { return }
        waiting = Pending(account: account.id, output: output)
        if drainTask == nil {
            drainTask = Task { await drain() }
        }
    }

    /// Returns once nothing is waiting or being sent.
    func waitUntilIdle() async {
        while let task = drainTask {
            await task.value
        }
    }

    private func drain() async {
        while let next = waiting {
            waiting = nil
            await send(next)
        }
        drainTask = nil
    }

    private func send(_ pending: Pending) async {
        do {
            if try await api.setStatus(pending.output.json, build: build) {
                lastApplied[pending.account] = pending.output.comparisonKey
                lastAppliedAt = now()
                problem = nil
            } else {
                // Nothing is resent until the next update hands over a summary.
                debugLog("[PartnerCloud] A newer CrewLu build wrote the summary first")
                problem = .newerBuild
            }
        } catch {
            switch error as? PartnerCloudError ?? .unavailable {
            case .notSignedIn:
                problem = .signInExpired
            case .refused(let code):
                lastRefused[pending.account] = pending.output.comparisonKey
                debugLog("[PartnerCloud] Crewlu Cloud refused the summary (\(code)); it won't be sent again")
            case .unavailable:
                // The last applied summary didn't change, so the next update sends again.
                debugLog("[PartnerCloud] Couldn't reach Crewlu Cloud; the next update tries again")
            }
        }
    }
}
```

- [x] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 39 tests, with 0 failures`.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerSummaryCloudWriter.swift DutyTests/PartnerSummaryCloudWriterTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): PartnerSummaryCloudWriter: one write at a time, the newest wins, nothing new is skipped" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 8: The auto-update hook

**Files:**
- Modify: `Duty/Utils/PartnerBeacon/PartnerBeaconAutoSync.swift`, `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, `Duty/App/DutyApp.swift`
- Test: `DutyTests/PartnerBeaconModeIndependenceTests.swift`

These are app files the harness can't build, so they're checked by Task 9's compile and Task 11's test run. Every edit replaces text that appears exactly once.

- [x] **Step 1: Add the independence test**

In `DutyTests/PartnerBeaconModeIndependenceTests.swift`, replace:

```swift
        // Both modes are orthogonal to PartnerBeacon's own dedicated CKContainer.
    }
}
```

with:

```swift
        // Both modes are orthogonal to PartnerBeacon's own dedicated CKContainer.
    }

    // MARK: - Crewlu Cloud sharing follows the sign-in, not SyncBackendMode

    /// Partner links (piece 2): a pilot shares through Crewlu Cloud while signed in with at least
    /// one cloud partner, whichever backend syncs the schedule. PartnerCloudStore takes no
    /// SyncBackendMode at all; only the sign-in, the owner rule and the partner list count.
    @MainActor func testCrewluCloudSharingFollowsTheSignIn_notSyncBackendMode() {
        let suite = "PartnerBeaconModeIndependenceTests.cloud"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        defaults.set(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"], forKey: PartnerCloudStore.savedIDsKeyPrefix + "PILOT-1")
        var signedInAs: String? = "PILOT-1"
        let store = PartnerCloudStore(api: StubPartnerCloudAPI(),
                                      currentUserID: { signedInAs },
                                      ownerAllows: { _ in true },
                                      defaults: defaults,
                                      partnersChanged: {})

        XCTAssertTrue(store.isCloudSharing, "signed in, with \(SyncBackendMode.current) syncing the schedule")
        signedInAs = nil
        XCTAssertFalse(store.isCloudSharing, "signed out, with \(SyncBackendMode.current) syncing the schedule")
    }
}
```

- [x] **Step 2: Let the loop run while either kind of sharing is on**

In `PartnerBeaconAutoSync.swift`, four edits. First, after `stopMonitoring()`, the iCloud-ended hook and the two sharing checks, used by `resumeMonitoringIfNeeded`:

In `Duty/Utils/PartnerBeacon/PartnerBeaconAutoSync.swift`, replace:

```swift
        updateTask?.cancel()
        updateTask = nil
    }

    /// Resume monitoring on app activation if partner sharing is already configured.
    /// Awaits beacon manager initialization so fetchExistingShare() can reconcile stale state
    /// before we decide whether to resume sync.
    private func resumeMonitoringIfNeeded() {
        guard !isMonitoring else { return }
        guard UserDefaults.standard.bool(forKey: "partnerBeacon.isSharing") else { return }

        Task { @MainActor in
            // Wait for fetchExistingShare() to finish — it may clear isSharing
            await PilotStatusBeaconManager.shared.awaitInitialization()

            // Re-check after initialization (fetchExistingShare may have cleared it)
            guard PilotStatusBeaconManager.shared.isSharing else {
```

with:

```swift
        updateTask?.cancel()
        updateTask = nil
    }

    /// The iCloud share ended. Monitoring goes on while Crewlu Cloud sharing is on;
    /// forgetting the last status makes the next iCloud write, if one starts, go out.
    func iCloudSharingEnded() {
        guard PartnerCloudStore.shared.isCloudSharing else {
            stopMonitoring()
            return
        }
        lastSentStatus = nil
    }

    /// The iCloud share is on. Read from UserDefaults, so a pilot who shares only through
    /// Crewlu Cloud never starts PilotStatusBeaconManager and its iCloud zone.
    private static var isICloudSharing: Bool {
        UserDefaults.standard.bool(forKey: "partnerBeacon.isSharing")
    }

    /// Partners get updates while an iCloud share is on or Crewlu Cloud sharing is on (spec §4.2).
    private var isSharingAnywhere: Bool {
        Self.isICloudSharing || PartnerCloudStore.shared.isCloudSharing
    }

    /// Resume monitoring on app activation if partner sharing is already configured.
    /// Awaits beacon manager initialization so fetchExistingShare() can reconcile stale state
    /// before we decide whether to resume sync.
    private func resumeMonitoringIfNeeded() {
        guard !isMonitoring else { return }
        guard isSharingAnywhere else { return }

        Task { @MainActor in
            // Wait for fetchExistingShare() to finish — it may clear isSharing
            if Self.isICloudSharing {
                await PilotStatusBeaconManager.shared.awaitInitialization()
            }

            // Re-check after initialization (fetchExistingShare may have cleared it)
            guard isSharingAnywhere else {
```

Second, `performUpdate()` stops the loop once nothing is shared:

In `Duty/Utils/PartnerBeacon/PartnerBeaconAutoSync.swift`, replace:

```swift
    private func performUpdate() async {
        guard let pilotId = monitoredPilotId else { return }

        // Rate limit
```

with:

```swift
    private func performUpdate() async {
        guard let pilotId = monitoredPilotId else { return }
        guard isSharingAnywhere else {
            debugLog("[AutoSync] Neither iCloud nor Crewlu Cloud sharing is on — stopping")
            stopMonitoring()
            return
        }

        // Rate limit
```

Third, each summary goes to the cloud writer, and the iCloud write happens only with an iCloud share, in `performUpdate()` and `forceUpdate`:

In `Duty/Utils/PartnerBeacon/PartnerBeaconAutoSync.swift`, replace:

```swift
        let generator = PartnerStatusGenerator(modelContext: modelContext)
        let status = generator.generateStatus(for: pilot)

        if let lastSent = lastSentStatus, status.isEquivalent(to: lastSent) {
            debugLog("[AutoSync] Status unchanged, skipping CloudKit update")
            return
        }

        await PilotStatusBeaconManager.shared.updateStatus(status)
        lastSentStatus = status
        clearOnDutyStateIfNeeded(for: status)
        PartnerDataKVSync.shared.pushToKVS()
    }

    /// Force an immediate update (bypasses rate limiting and dirty check)
    func forceUpdate(modelContext: ModelContext, pilotInfo: PilotInfo) async {
        debugLog("[AutoSync] Forcing immediate status update")
        lastUpdateTime = Date()

        let generator = PartnerStatusGenerator(modelContext: modelContext)
        let status = generator.generateStatus(for: pilotInfo)
        await PilotStatusBeaconManager.shared.updateStatus(status)
        lastSentStatus = status
```

with:

```swift
        let generator = PartnerStatusGenerator(modelContext: modelContext)
        let status = generator.generateStatus(for: pilot)

        // Crewlu Cloud's writer skips a summary that shows partners nothing new by itself.
        PartnerSummaryCloudWriter.shared.submit(status)

        if let lastSent = lastSentStatus, status.isEquivalent(to: lastSent) {
            debugLog("[AutoSync] Status unchanged, skipping CloudKit update")
            return
        }

        if Self.isICloudSharing {
            await PilotStatusBeaconManager.shared.updateStatus(status)
        }
        lastSentStatus = status
        clearOnDutyStateIfNeeded(for: status)
        PartnerDataKVSync.shared.pushToKVS()
    }

    /// Force an immediate update (bypasses rate limiting and dirty check)
    func forceUpdate(modelContext: ModelContext, pilotInfo: PilotInfo) async {
        debugLog("[AutoSync] Forcing immediate status update")
        lastUpdateTime = Date()

        let generator = PartnerStatusGenerator(modelContext: modelContext)
        let status = generator.generateStatus(for: pilotInfo)
        PartnerSummaryCloudWriter.shared.submit(status, force: true)
        if Self.isICloudSharing {
            await PilotStatusBeaconManager.shared.updateStatus(status)
        }
        lastSentStatus = status
```

Fourth, `syncNowIfSharing()` checks both:

In `Duty/Utils/PartnerBeacon/PartnerBeaconAutoSync.swift`, replace:

```swift
    func syncNowIfSharing() async {
        guard UserDefaults.standard.bool(forKey: "partnerBeacon.isSharing") else { return }
```

with:

```swift
    func syncNowIfSharing() async {
        guard isSharingAnywhere else { return }
```

- [x] **Step 3: Keep the loop when the iCloud share ends**

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
        participantIDCache = [:]
        PartnerBeaconAutoSync.shared.stopMonitoring()
    }
```

with:

```swift
        participantIDCache = [:]
        // Keeps the updates going for Crewlu Cloud partners, if there are any
        PartnerBeaconAutoSync.shared.iCloudSharingEnded()
    }
```

- [x] **Step 4: Register the partner list at launch**

In `Duty/App/DutyApp.swift`, replace:

```swift
        // Ensure partner beacon auto-sync observes app lifecycle for self-resumption
        _ = PartnerBeaconAutoSync.shared
        // Register iCloud KVS observer
```

with:

```swift
        // Ensure partner beacon auto-sync observes app lifecycle for self-resumption
        _ = PartnerBeaconAutoSync.shared
        // Partner links: keep the Crewlu Cloud partner list current (coming back to the app,
        // signing in and out), so the summary reaches partners without opening a screen
        PartnerCloudStore.startObservingApp()
        // Register iCloud KVS observer
```

- [x] **Step 5: Run the harness: the hook must not change what it tests**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 39 tests, with 0 failures`.

- [x] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerBeacon/PartnerBeaconAutoSync.swift Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift Duty/App/DutyApp.swift DutyTests/PartnerBeaconModeIndependenceTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): every partner update also goes to Crewlu Cloud, and the loop runs while either kind of sharing is on" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 9: Compile everything, without a simulator

**Files:** none. A build in a separate clone of the branch, with its own build folder and its own copy of the Swift packages, so it can't disturb the user's open Xcode or touch a simulator. It compiles the app and `DutyTests`, including the two test files the harness can't build.

- [x] **Step 1: Make the clone**

Use a scratch folder outside both repos as `$BUILD`, for example `export BUILD=<your scratchpad>/partner-cloud-build`. `Config.xcconfig` is ignored by git, so it's copied; never print it.

Run:

```bash
rm -rf "${BUILD:?set BUILD first}" && mkdir -p "$BUILD" && git clone -q --shared ~/Dev/Duty "$BUILD/duty" && git -C "$BUILD/duty" switch -q feature/partner-cloud-summary && cp ~/Dev/Duty/Config.xcconfig "$BUILD/duty/" && cp -R "$(ls -dt ~/Library/Developer/Xcode/DerivedData/Duty-*/SourcePackages | head -1)" "$BUILD/packages" && git -C "$BUILD/duty" log --oneline -1
```

Expected: the branch's last commit: Task 8's `feat(partners): every partner update also goes to Crewlu Cloud…`, or a later fix from Task 10.

- [x] **Step 2: Build for testing**

It takes several minutes, so run it in the background and wait for it to finish.

Run:

```bash
cd "$BUILD/duty" && xcodebuild build-for-testing -project Duty.xcodeproj -scheme Duty -destination "generic/platform=iOS Simulator" -derivedDataPath "$BUILD/derived" -clonedSourcePackagesDirPath "$BUILD/packages" -disableAutomaticPackageResolution -quiet > "$BUILD/build.log" 2>&1; echo "exit $?"; echo "errors: $(grep -c error: "$BUILD/build.log")"
```

Expected: `exit 0` and `errors: 0`. `grep warning "$BUILD/build.log"` shows only the existing StoreKit deprecation warning. Nothing to commit.

If the log says the packages don't match `Package.resolved`, delete `$BUILD/packages` and run the build again without `-clonedSourcePackagesDirPath` and `-disableAutomaticPackageResolution`. It then downloads them into `$BUILD/derived`, which takes a few minutes more.

### Task 10: Review

**Files:** whatever the review finds.

- [x] **Step 1: Ask for a review**

Use superpowers:requesting-code-review with a read-only reviewer: it reads `git -C ~/Dev/Duty diff 282a6cc0..feature/partner-cloud-summary`, this plan and the spec (§5, §8.1), and runs no `xcodebuild` and no simulator. State facts neutrally, and don't tell it what not to flag.

- [x] **Step 2: Act on it**

For each finding, fix it test-first, re-run `"$HARNESS/run.sh"` and `npm test`, and commit. If any Swift changed, run Task 9 again. Note each fix in this plan's Execution notes.

### Task 11: The user runs CrewLu's tests

**Files:** none.

- [x] **Step 1: Ask the user to run the tests in Xcode**

Send them these steps:

1. In Xcode, at the top of the window, check that the scheme says **Duty** and the destination is an iPhone **simulator** (such as iPhone 17 Pro), not your phone. On a phone, tests that read files on the Mac can't: the examples test and `CaptureOCRFixturesTests` skip, and `MatrixAuditTests` fails.
2. Press **⌘U** (Product → Test) and wait for it to finish.
3. Press **⌘6** to open the Test navigator. Red marks show failures.

Expected: no failures. The new and changed classes, counted after Task 10's fixes:

| Class | Tests |
|---|---|
| `PartnerCloudErrorTests` | 5 |
| `PartnerSettingsTests` | 2 |
| `PartnerSummaryEncoderTests` | 17 |
| `PartnerCloudStoreTests` | 10 |
| `PartnerSummaryCloudWriterTests` | 18 |
| `PartnerBeaconModeIndependenceTests` | 4 (one new) |

- [x] **Step 2: If anything fails, stop**

Ask for the test's name and its message. Fix the cause, never the test's expected value, then ask for another run.

### Task 12: Record the decisions

**Files (in `~/Dev/Crewluve Website`):**
- Modify: `docs/superpowers/specs/2026-10-16-partner-links-piece2-crewlu-design.md`, and this plan

- [x] **Step 1: Add the planning decisions to the spec**

At the end of the spec, after §11, add `## 12. Decisions made while planning 2a`, followed by this plan's "Decisions made while planning" list, copied as it stands, and any changes from the review (Task 10). Then update its status line.

In `~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-16-partner-links-piece2-crewlu-design.md`, replace:

```markdown
and the user approved this spec the same day. Next: plan 2a.
```

with:

```markdown
and the user approved this spec the same day. Plan 2a is built (`docs/superpowers/plans/2026-10-16-partner-links-piece2a-summary.md`); next: plan 2b.
```

- [x] **Step 2: Tick this plan and commit**

Run:

```bash
cd ~/"Dev/Crewluve Website" && git add docs/superpowers/specs/2026-10-16-partner-links-piece2-crewlu-design.md docs/superpowers/plans/2026-10-16-partner-links-piece2a-summary.md && git commit -q -m "Plan 2a built: the summary on Crewlu Cloud; spec records the planning decisions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit. Don't push.

### Task 13: Finish

**Files:** none.

- [x] **Step 1: Ask how to merge**

2a changes nothing a pilot sees: with no cloud partners yet (they come with 2b's invites), it only reads the partner list when the app opens. So it's safe in a build before 2b and 2c. Ask the user one question: merge into `feature/supabase-account-backend` now (a fast-forward, then delete the branch), or keep the branch until 2b.

- [x] **Step 2: Push only with a fresh yes**

Ask separately before pushing `feature/supabase-account-backend` in `~/Dev/Duty`, and separately again before pushing `main` in `~/Dev/Crewluve Website`.

---

## Execution notes

Filled in during the build: any place the code ends up different from the printed blocks, and why.

- **Tasks 4–7, the failing runs (2026-10-16).** The compiler names a missing type either as `cannot find 'X' in scope` or as `cannot find type 'X' in scope`, depending on which use it reaches first, and the order can change from one build to the next. Task 7's run printed only the second form, so each expected message now accepts either. The code is unchanged.
- **Task 9's clone step** expected Task 8's commit message. After Task 10's fixes the branch ends with a fix instead, so the step now accepts any `(partners)` commit.
- **Task 10, the review (2026-10-16).** The verdict was "with fixes": three Important findings and seven Minor ones, all checked by running. These commits came after the printed blocks:
  - **`6f0333be`, the writer and the store:**
    - "Nothing new" is decided just before sending: a status that went back while another write was in flight used to be dropped.
    - A waiting summary goes out only for the account it was made for: one could go out after a sign-out, or under another account's sign-in.
    - A changed partner list sends the summary again, because Stop Sharing with Everyone deletes the server's copy.
    - A forced summary stays forced when a newer one replaces it.
    - `problem` and `lastAppliedAt` belong to the account that wrote.
    - The store no longer makes a new account's refresh wait for the last account's.
    - Seven new tests, and the sign-out test now signs out the way the app does.
    - Results: harness 46/46; 47 of 47 deliberate breaks of the new logic caught.
  - **`199198bd`:** HTTP 408 and 429 mean "try again later", with tests for 403, 408 and 429.
  - **`e27bd9a2`:**
    - The schema now holds the quick status rules across fields: a status for everyone comes with null targets, otherwise its fields are null, and Sleeping only with it. Both maps are null rather than empty.
    - The README says how the examples are made, and to hide expired statuses.
    - AutoSync's header comment is updated.
    - Results: SQL 169/169; 19 of 19 deliberate breaks of the schema caught.
  - **`4ff32814`, after the re-check.**
    - The re-check found every fix held, and its verdict was "ready to merge". It found one new Minor: `problem` and `lastAppliedAt` still showed the last account's answers after a sign-out.
    - They're now kept per account, and the screen gets the signed-in account's.
    - Results: harness 47/47; 48 of 48 deliberate breaks caught.
  - **The spec's wording for `unavailable`:** §5.2 says it "keeps the summary waiting". The writer drops it instead, and the next update sends a fresh one, because the last applied summary didn't change. Task 12 records this.
  - **Left as is:**
    - the AutoSync hook has no behavior tests: it would have to be pulled apart, so Task 9's compile and Task 11's run check it;
    - a second account check inside the live API: the writer checks just before the call.
  - **For plan 2b:**
    - `PilotStatusBeaconManager.selfHealOrphanedPartnerState()` deletes both per-person settings keys, on every device, whenever the iCloud manager finds no share. 2b must keep it from deleting Crewlu Cloud partners' settings.
    - Update Status Now and the screen's `onAppear` still skip the cloud writer until 2b routes them through `forceUpdate` (spec §4.2).
- **Task 11, the user's run (2026-10-17).** ⌘U on the iPhone simulator: 1,434 XCTest tests ran with 0 failures and 1 skip, and all 9 Swift Testing tests passed. The six classes ran 5, 2, 17, 10, 18 and 4 tests, as in Task 11's table. The skip is `StoreKitEntitlementLifecycleTests.test_expiredSubscription_clearsLocalEntitlement`, which this branch doesn't touch: StoreKit's test session never showed the expiry.
- **Task 12** wrote the decisions into the spec's §12. Writing up `unavailable` turned up one more difference from §5.2: a forced summary that fails that way loses its force (spec §12.3). 2b decides whether to keep it.
- **Task 13 (2026-10-17).** The user chose to merge now. `feature/supabase-account-backend` moved forward `282a6cc0..4ff32814` with `git fetch . feature/partner-cloud-summary:feature/supabase-account-backend`, so no file changed on disk while Xcode had the project open, and `feature/partner-cloud-summary` was deleted. With a separate yes for each, Duty's branch was pushed (`282a6cc0..4ff32814`), then the website's `main` (`4426345..430624a`). Pages run 39041916142 succeeded, and the live site serves the same files as before the push.
- **Task 1's Steps 8–11** were done in `fcd49e0f` but hadn't been ticked; they're ticked now.
