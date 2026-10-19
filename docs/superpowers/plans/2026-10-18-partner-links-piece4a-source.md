# Partner Links Piece 4a: Crewluve's Status Source and Pushes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crewluve reads the pilot's status through one source that reads Crewlu Cloud as well as iCloud. On Crewlu Cloud, it registers its push token, treats Crewlu Cloud's silent push as "check now", and checks every 60 seconds while it's open. Nothing a partner sees changes yet: connecting to Crewlu Cloud comes with plan 4b.

**Architecture:**
- **One status source.** `PilotStatusSource` is the only code that reads the status, for the screen, a push and the background refresh alike. It reads Crewlu Cloud once the device is connected there, and iCloud otherwise, through today's CloudKit read, moved into `ICloudStatusFetcher`. Each new status goes to the alerts once, from here.
- **Translated at the door.** `CloudSummary` decodes Crewlu Cloud's summary and turns it into today's `SharedPilotStatus`, with this partner's name and quick status. So the screens, `TripStateResolver` and `StatusChangeNotifier` don't change.
- **A small client.** `PartnerDoor` and `LivePartnerDoor` make the partner door's calls over URLSession with the publishable key, and every failure comes back as one typed error. Each device's own key lives in the Keychain (`KeychainDeviceKeyStore`).
- **Pushes.** `PushRegistrar` sends the token with the environment the build's provisioning profile gives (`PushEnvironment`). `PushRoute` says what a push means.
- **Tested on the Mac.** Everything new except the app's wiring runs in a Mac harness, against stand-ins and against CrewLu's nine example summaries as Crewlu Cloud trims them for partners A and B.

**Tech stack:** Swift 5 mode on iOS 26 (main actor by default, Approachable Concurrency), SwiftUI, Observation, CloudKit, URLSession, the Keychain, Swift Testing.

**Design:** `docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md` in this repo: §5 (where the status comes from), §6 (pushes and background refresh), §9 (security), §10.1 and §11. The contract is `~/Dev/Duty/supabase/partner-api.md`.

---

## Before you start

- **Two repos.**
  - The code goes in `~/Dev/Crewluv` (Crewluve).
  - This plan and the spec live in `~/Dev/Crewluve Website`.
  - Paths are relative to `~/Dev/Crewluv` unless they start with `~`, `$HARNESS` or `$BUILD`.
- **Branch.** Build on `feature/partner-cloud-source`, cut from the release line `hotfix/icloud-account-unavailable` at `739abd3` (1.1.6, build 42) (Task 0).
- **Leave the untracked folders alone.** `~/Dev/Crewluv` has untracked `.claude/` and `.superpowers/` folders that aren't part of this work. Never run `git add -A` or `git add .` there. Add the exact paths each step lists.
- **Who runs which tests.**
  - **Crewluve's rule:** never run `xcodebuild test`, never boot a simulator, and never build against the copy the user has open in Xcode. The user runs Crewluve's tests (Task 15).
  - **The Mac harness (Task 1)** compiles Crewluve's model and service files and their tests unchanged, with the app's concurrency settings, and runs the Swift Testing tests in a small Swift package outside both repos. The test-first steps use it. It boots no simulator and shares no build folder with Xcode.
  - **Checked only in Xcode:** `KeychainDeviceKeyStoreTests`, which needs the iOS Keychain, and the app's wiring (`AppDelegate`, `BackgroundRefreshManager`, `ContentView` and the diagnostics sheet), which needs UIKit, BackgroundTasks and SwiftUI's iOS views. Task 13's compile, the review (Task 14) and the user's run (Task 15) check them.
  - **One compile-only build (Task 13)** checks the whole app and its tests, in a separate clone with its own build folder.
- **No Crewlu Cloud.** The tests answer for Crewlu Cloud through stand-ins. The app itself calls Crewlu Cloud only for a device key, and nothing makes one before plan 4b.
- **New files need no project edit.** `Crewluv/` and `CrewluvTests/` are synchronized folders, so a new file joins its target by itself. Editor errors such as "Cannot find type" on a new file are a stale index: trust the harness and Task 13.
- **Pick two scratch folders,** outside both repos: one for the harness (`$HARNESS`, Task 1) and one for the compile-only clone (`$BUILD`, Task 13). Shell variables don't carry from one command to the next in Claude's Bash tool, so begin each command that uses them with `export HARNESS=<the folder> &&` (or `BUILD`).
- **If an expected value doesn't match, stop and ask.** Never change a test to make it pass.

## Decisions made while planning

These refine the spec. Task 17 writes them into it.

1. **The door starts with the two calls 4a uses,** `partner_view` and `partner_set_push`. Joining, codes and leaving come with plan 4b's screens, as piece 2's `PartnerCloudAPI` grew with its plans.
2. **The door's network is a closure** (`LivePartnerDoor.Transport`, URLSession by default), so the tests answer for Crewlu Cloud and no request leaves the Mac.
3. **The summary decodes as sent,** with every field but four optional. The translation fills in what `SharedPilotStatus.from(record:)` fills in for iCloud: "Home", false, no cities. Only `pilotId`, `pilotFirstName`, `lastUpdated` and `appVersion` are required.
4. **The legs become `tripLegsJSON` with sorted keys,** so the same legs always give the same bytes. The alerts compare those bytes.
5. **The quick status is chosen each time the screen resolves** (`PilotReading.status(at:)`), and the screen also wakes when the shown one expires (`PilotReading.change(after:)`), so an expired personal status gives way to the one for everyone.
6. **The test summaries come from Crewlu Cloud's own trimming.** `trim-examples.mjs` runs `private.trim_status_for` in piece 1's local test database and writes 18 files. Only the trimmed ones are kept in Crewluve. The untrimmed examples stay in CrewLu (this refines spec §10.1).
7. **The source says how each refresh ended** (`RefreshOutcome`). The screen keeps its messages and its iCloud account check, which now runs only off Crewlu Cloud. A share that's gone from iCloud resets the share data for every caller (a push, the background refresh), not only the screen.
8. **The display name saved for the alerts follows every reading:** saved when there is one, removed when there's none. Before, an iCloud record without any names left the last saved one.
9. **`p_since` is dropped after any failed read,** not only an HTTP 400 (spec §5.2), because the door reports both as unavailable. The next read gets the whole summary, and counts as unchanged if `updated_at` is the same.
10. **A refresh asked for during another joins it,** so a push that lands during the 60-second check makes one read.
11. **The screen hears of new readings from the source** (`.pilotReadingDidChange`), in place of `.cloudKitPushReceived`. A push or the background refresh no longer makes the screen read again.
12. **The 60-second check is `RepeatingRefresh`,** started when the screen appears and whenever the app comes to the front, and stopped when it leaves the front. It runs only on Crewlu Cloud and outside the demo, so in 4a it never starts.
13. **What a push means is `PushRoute`:** on Crewlu Cloud, a silent push without `ck` refreshes and iCloud's are ignored; on iCloud, iCloud's refresh, as before. iOS is told "new data" for a new status or sharing ended, "no data" for unchanged, no status yet or not connected, and "failed" for a failed read. The background refresh is rescheduled after every push but a failed one, as before.
14. **The registrar notes each try for the diagnostics** ("Sent (sandbox)", "Couldn't reach Crewlu Cloud", "Refused: …", "Sharing ended"). The debug diagnostics sheet shows it, with the build's environment.
15. **A key with no saved connection is read on every refresh until it answers** (spec §5.3). If its partner has no summary yet and iCloud has a share, the device stays on iCloud, so plan 4c's move-over can use the same key.
16. **Reset Share Data also forgets the source's iCloud reading** (`forgetICloudReading()`), as it forgot the screen's status before.
17. **The screen uses `PilotStatusSource.shared` directly.** It isn't built in the harness, so it has nothing to inject: Task 13's compile and the user's run check it.

## The four questions

- **Is this wise?**
  - It's the base the rest of piece 4 builds on: 4b connects through it and 4c moves partners over through it.
  - On its own it changes nothing a partner sees. Every device stays on iCloud, because nothing connects to Crewlu Cloud before 4b.
  - It removes the three copies of the iCloud read (spec §2.1), so a fix to how the status is read happens once.
- **Will it break anything?**
  - *iCloud partners:* the same read by the same rules, now in one place. The alerts still fire once per new status: the source evaluates each new reading once, and the alerts' own check skips a status they've seen.
  - *Pushes:* iCloud's still wake the app and refresh as before. A push no longer reads twice (once for the alerts, once for the screen).
  - *The screen:* it shows what the source read, re-resolves at leg changes as before, and also when a Crewlu Cloud quick status expires.
  - *Reset Share Data, a share that ends, demo mode:* as before.
  - *Network and battery:* no new call on iCloud, apart from a Keychain look-up per refresh. The 60-second check runs only on Crewlu Cloud.
  - *Privacy:* the key and the token are never logged. The publishable key is public by design (spec §9).
  - *A crash:* nothing new traps. The one `!` is on the door's fixed address.
- **Is this what a brilliant Apple engineer would do?** One source behind small protocols, typed throws for the door, Observation, Swift Testing, the Keychain with this-device-only access, and no packages, as Crewluve's `CLAUDE.md` asks. The translation is pure and checked against the server's own output.
- **Does it fix the disease or the symptom?** The disease is that partners depend on iCloud, and that its read was written three times. 4a makes a single source that can read Crewlu Cloud, rather than adding Crewlu Cloud to each copy.

## Not in this plan

- Connecting: links, joining, the welcome screen, Use on Another Device, Disconnect and sharing ended's note (plan 4b), and the move-over (plan 4c).
- The sync line's and the error screen's wording on Crewlu Cloud (spec §7.7, plan 4b).
- `CloudKitSubscriptionManager` (spec §4.2): its launch check already skips a device without an iCloud share, and deleting the subscription comes with the move-over (plan 4c).
- The golden cases (spec P4-1), which get their own spec.

## How this plan was checked

- **Built test-first in a scratch clone** of `739abd3`, outside `~/Dev/Crewluv`.
- **The Swift tests:** the Mac harness ran all 105 and caught 70 of 70 deliberate breaks, one at a time, in the translation, the push environment, the door, the key, the source, the reading, the timer, the registrar and the push routes.
- **The compile-only build** of the whole app and its tests passed in the scratch clone, with no warnings.
- **A replay on a fresh clone of `739abd3`:** every Run step gave the result printed here, including each test-first failure, and every file matched the scratch copy byte for byte. Task 13's build passed on the replayed branch.

## Files

In `~/Dev/Crewluv`:

| File | Responsibility |
|---|---|
| `Crewluv/Models/CloudSummary.swift` | Crewlu Cloud's summary, and the status the screens make of it |
| `Crewluv/Models/PilotReading.swift` | What was last read, from iCloud or Crewlu Cloud |
| `Crewluv/Models/PartnerConnection.swift` | The Crewlu Cloud connection, kept in the settings |
| `Crewluv/Services/PartnerCloud/PartnerDoor.swift` | The door's calls, answers and error |
| `Crewluv/Services/PartnerCloud/LivePartnerDoor.swift` | The calls over HTTPS |
| `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift` | Making the device key, and keeping it in the Keychain |
| `Crewluv/Services/ICloudStatusFetcher.swift` | Today's iCloud read, in one place |
| `Crewluv/Services/PilotStatusSource.swift` | The one place that reads the status |
| `Crewluv/Services/RepeatingRefresh.swift` | The 60-second check's timer |
| `Crewluv/Services/PushRegistrar.swift` | Sending the push token |
| `Crewluv/Services/PushRoute.swift` | What a push means, and what iOS is told |
| `Crewluv/Utils/PushEnvironment.swift` | The build's push environment |
| `Crewluv/Services/PartnerStatusReceiver.swift` (changed) | Reads through the source; the 60-second check |
| `Crewluv/Services/NotificationDiagnostics.swift` (changed) | The last push registration |
| `Crewluv/Services/BackgroundRefreshManager.swift` (changed) | Reads through the source |
| `Crewluv/App/AppDelegate.swift`, `CrewluvApp.swift` (changed) | The token and the pushes |
| `Crewluv/Views/Welcome/ContentView.swift`, `Crewluv/Views/Status/NotificationDiagnosticsView.swift` (changed) | The check and the retry; the diagnostics |
| `CrewluvTests/Fixtures/PartnerSummary/` | The example summaries as Crewlu Cloud gives them to partners A and B |
| `CrewluvTests/Helpers/PartnerSummaryFixtures.swift`, `PartnerCloudStandIns.swift` | Reading the fixtures; stand-ins |
| `CrewluvTests/CloudSummaryTests.swift`, `PushEnvironmentTests.swift`, `LivePartnerDoorTests.swift`, `DeviceKeyTests.swift`, `KeychainDeviceKeyStoreTests.swift`, `PilotStatusSourceTests.swift`, `RepeatingRefreshTests.swift`, `PushRegistrarTests.swift`, `PushRouteTests.swift` | The new tests |

In `~/Dev/Crewluve Website`: this plan, ticked as it goes, and the piece 4 spec (Task 17).

Outside both repos: the Mac harness (`$HARNESS`, Task 1) and the compile-only clone (`$BUILD`, Task 13).

---

### Task 0: Branch

- [ ] **Step 1: Check the working tree**

Run:

```bash
git -C ~/Dev/Crewluv status --short
```

Expected: only `?? .claude/` and `?? .superpowers/`. If anything else shows, stop and ask the user.

- [ ] **Step 2: Check the branch and its tip**

Run:

```bash
git -C ~/Dev/Crewluv branch --show-current && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: `hotfix/icloud-account-unavailable`, then `739abd3 chore(crewluv): bump version to 1.1.6 (build 42)`. If either differs, stop and ask: this plan was checked against `739abd3`.

- [ ] **Step 3: Create the branch**

Run:

```bash
git -C ~/Dev/Crewluv switch -c feature/partner-cloud-source
```

Expected: `Switched to a new branch 'feature/partner-cloud-source'`. It's the same commit, so no file changes on disk.

### Task 1: The Mac harness

**Files (outside both repos):** `$HARNESS/Package.swift`, `$HARNESS/run.sh`, `$HARNESS/trim-examples.mjs`

A Swift package that compiles Crewluve's model and service files and their tests unchanged, on the Mac, and runs the Swift Testing tests. The app target gets the app's settings: Swift 5 mode, the main actor by default, Approachable Concurrency and member import visibility. The test target gets the same, without the main actor default, as `CrewluvTests` has.

`run.sh` copies the files that exist so far from `~/Dev/Crewluv` (or `$CREWLUV`), takes the app's notification names out of `CrewluvApp.swift`, and links the fixtures, then runs `swift test`. It needs no Xcode project, no simulator and no network, and it builds into its own `.build` folder. Views, `AppDelegate`, `BackgroundRefreshManager` and XCTest files aren't copied: they need UIKit, BackgroundTasks or SwiftUI's iOS views.

`trim-examples.mjs` is for Task 2.

- [ ] **Step 1: Write the package**

File: `$HARNESS/Package.swift`

```swift
// swift-tools-version: 6.2
// A Mac-only harness: compiles Crewluve's model and service files and their tests unchanged, with
// the app's concurrency settings, and runs the tests without Xcode or a simulator. Not part of Crewluve.
import PackageDescription

// Xcode's "Approachable Concurrency", as both Crewluve targets set it.
let approachableConcurrency: [SwiftSetting] = [
    .enableUpcomingFeature("DisableOutwardActorInference"),
    .enableUpcomingFeature("GlobalActorIsolatedTypesUsability"),
    .enableUpcomingFeature("InferIsolatedConformances"),
    .enableUpcomingFeature("InferSendableFromCaptures"),
    .enableUpcomingFeature("NonisolatedNonsendingByDefault"),
    .enableUpcomingFeature("MemberImportVisibility"),
]

let package = Package(
    name: "CrewluvHarness",
    platforms: [.macOS(.v26)],
    targets: [
        // The app target runs on the main actor by default (SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor).
        .target(name: "Crewluv", path: "Sources/Crewluv",
                swiftSettings: approachableConcurrency + [.defaultIsolation(MainActor.self)]),
        .testTarget(name: "CrewluvTests", dependencies: ["Crewluv"], path: "Tests/CrewluvTests",
                    exclude: ["Fixtures"], swiftSettings: approachableConcurrency),
    ],
    swiftLanguageModes: [.v5]
)
```

- [ ] **Step 2: Write the runner**

File: `$HARNESS/run.sh`

```bash
#!/bin/bash
# Runs Crewluve's model and service tests on the Mac, without Xcode or a simulator: copies the files
# that exist so far from the Crewluve checkout (~/Dev/Crewluv, or $CREWLUV), then runs `swift test`.
set -u
HARNESS="$(cd "$(dirname "$0")" && pwd)"
CREWLUV="${CREWLUV:-$HOME/Dev/Crewluv}"

# Start empty, so a file removed from Crewluve doesn't linger here.
rm -rf "$HARNESS/Sources/Crewluv" "$HARNESS/Tests/CrewluvTests"
mkdir -p "$HARNESS/Sources/Crewluv" "$HARNESS/Tests/CrewluvTests/Helpers"

# The app files these tests reach: models and services, but no views, no UIKit and no BackgroundTasks.
for f in Models/SharedPilotStatus.swift Models/TripLeg.swift Models/PilotDisplayStatus.swift \
         Models/TripStateResolver.swift Models/CloudAccountIssue.swift Models/CloudSummary.swift \
         Models/PartnerConnection.swift Models/PilotReading.swift \
         Services/StatusChangeNotifier.swift Services/NotificationDiagnostics.swift \
         Services/CloudKitShareManager.swift Services/CloudKitSubscriptionManager.swift \
         Services/PartnerStatusReceiver.swift Services/ICloudStatusFetcher.swift \
         Services/PilotStatusSource.swift Services/PushRegistrar.swift Services/PushRoute.swift \
         Services/RepeatingRefresh.swift Utils/DebugLog.swift Utils/PushEnvironment.swift; do
  [ -f "$CREWLUV/Crewluv/$f" ] && cp "$CREWLUV/Crewluv/$f" "$HARNESS/Sources/Crewluv/"
done
for f in "$CREWLUV"/Crewluv/Services/PartnerCloud/*.swift; do
  [ -f "$f" ] && cp "$f" "$HARNESS/Sources/Crewluv/"
done
# The app's notification names live in CrewluvApp.swift, which is SwiftUI app code: take just that block.
{ echo "import Foundation"; awk '/^extension Notification.Name \{/,/^\}/' "$CREWLUV/Crewluv/App/CrewluvApp.swift"; } \
  > "$HARNESS/Sources/Crewluv/NotificationNames.swift"

# Swift Testing files only. KeychainDeviceKeyStoreTests needs the iOS Keychain, so it runs only in Xcode.
for f in "$CREWLUV"/CrewluvTests/*.swift "$CREWLUV"/CrewluvTests/Helpers/*.swift; do
  [ -f "$f" ] || continue
  grep -q '^import XCTest' "$f" && continue
  [ "$(basename "$f")" = KeychainDeviceKeyStoreTests.swift ] && continue
  rel="${f#"$CREWLUV"/CrewluvTests/}"
  cp "$f" "$HARNESS/Tests/CrewluvTests/$rel"
done
# The fixture tests find Fixtures/ beside themselves, as in Crewluve.
[ -d "$CREWLUV/CrewluvTests/Fixtures" ] && ln -sfn "$CREWLUV/CrewluvTests/Fixtures" "$HARNESS/Tests/CrewluvTests/Fixtures"

out="$(mktemp)"
(cd "$HARNESS" && swift test) 2>&1 | sed -E $'s/\x1b\\[[0-9;]*m//g' > "$out"
code=${PIPESTATUS[0]}
grep -E "^(/.*|macro expansion .*): error: " "$out" | sed -E 's|^.*/Sources/|Sources/|; s|^.*/Tests/|Tests/|' | sort -u | head -20
grep -E "Test .*(recorded an issue|failed after)" "$out" | grep -v "Test run with" | sed -E 's/^[^T]*Test /Test /' | head -40
grep -E "Test run with [0-9]+ tests?" "$out" | tail -1 | sed -E 's/^[^T]*Test run/Test run/'
rm -f "$out"
exit $code
```

- [ ] **Step 3: Write the summaries' script**

It uses piece 1's local test database in `~/Dev/Duty/supabase/tests`, whose packages are already installed there.

File: `$HARNESS/trim-examples.mjs`

```javascript
// Trims CrewLu's nine example summaries (~/Dev/Duty/supabase/partner-status/examples) for partner A and
// for partner B with Crewlu Cloud's own private.trim_status_for, in piece 1's local test database, and
// writes each result: the `status` partner_view gives that partner. Keys are sorted, so the files are
// the same on every run. Usage: node --no-maglev trim-examples.mjs <output folder>
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const supabase = join(homedir(), 'Dev', 'Duty', 'supabase')
const { freshDb } = await import(pathToFileURL(join(supabase, 'tests', 'helpers', 'db.js')).href)
const examples = join(supabase, 'partner-status', 'examples')
const out = process.argv[2]
const partners = { A: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }

const sorted = (value) =>
  Array.isArray(value)
    ? value.map(sorted)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]))
      : value

const db = await freshDb()
mkdirSync(out, { recursive: true })
for (const file of readdirSync(examples).filter((name) => name.endsWith('.json')).sort()) {
  const summary = readFileSync(join(examples, file), 'utf8')
  for (const [letter, id] of Object.entries(partners)) {
    const { rows } = await db.query('select private.trim_status_for($1::jsonb, $2::uuid) as status', [summary, id])
    writeFileSync(join(out, file.replace(/\.json$/, `.${letter}.json`)), JSON.stringify(sorted(rows[0].status), null, 1) + '\n')
  }
}
await db.close()
console.log(`${readdirSync(out).filter((name) => name.endsWith('.json')).length} files`)
```

- [ ] **Step 4: Run today's tests**

Run:

```bash
chmod +x "$HARNESS/run.sh" && "$HARNESS/run.sh"
```

Expected: `Test run with 29 tests in 5 suites passed`: Crewluve's Swift Testing tests as they are. The first build takes about a minute; later runs take seconds. Nothing to commit: the harness isn't part of Crewluve.

### Task 2: The summaries partners get

**Files:**
- Create: `CrewluvTests/Fixtures/PartnerSummary/` (18 summaries and a README)

CrewLu's nine example summaries (`~/Dev/Duty/supabase/partner-status/examples/`), each as partner_view gives it to partner A and to partner B. Crewlu Cloud's own trimming makes them (decision 6), so the tests check the translation against what Crewlu Cloud really sends.

- [ ] **Step 1: Make the summaries**

Run:

```bash
node --no-maglev "$HARNESS/trim-examples.mjs" ~/Dev/Crewluv/CrewluvTests/Fixtures/PartnerSummary
```

Expected: `18 files`. `--no-maglev` keeps Node 23.11 from hanging with PGlite.

- [ ] **Step 2: Check they're the ones the plan was checked with**

Run:

```bash
cd ~/Dev/Crewluv/CrewluvTests/Fixtures/PartnerSummary && ls | LC_ALL=C sort | grep 'json$' | xargs cat | shasum -a 256 | cut -c1-16
```

Expected: `b977c271979f59cb`. If it differs, CrewLu's examples have changed since this plan was written: stop and ask.

- [ ] **Step 3: Say where they come from**

File: `CrewluvTests/Fixtures/PartnerSummary/README.md`

```markdown
# Partner summaries, as Crewlu Cloud gives them to each partner

What `partner_view` answers as `status` for CrewLu's nine example summaries
(`~/Dev/Duty/supabase/partner-status/examples/`): `<example>.A.json` for partner A
(`aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`) and `<example>.B.json` for partner B
(`bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`).

They come from Crewlu Cloud's own trimming, `private.trim_status_for`, run in the local test
database of `~/Dev/Duty/supabase/tests` by `trim-examples.mjs` (partner links plan 4a, Task 2),
with keys sorted. When CrewLu's examples change, make them again the same way.

`CloudSummaryTests` reads them.
```

- [ ] **Step 4: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add CrewluvTests/Fixtures/PartnerSummary && git -C ~/Dev/Crewluv commit -q -m "test(crewluv): the partner summaries Crewlu Cloud gives partners A and B" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 3: The summary becomes today's status

**Files:**
- Create: `Crewluv/Models/CloudSummary.swift`
- Test: `CrewluvTests/CloudSummaryTests.swift`, `CrewluvTests/Helpers/PartnerSummaryFixtures.swift`

Spec §5.4 and decisions 3–5: Crewlu Cloud's summary decodes as sent and becomes today's `SharedPilotStatus`. Every field of the same name is copied, the legs become iCloud's blob, and the name and the quick status are this partner's.

- [ ] **Step 1: Write the fixtures' reader**

The tests find the fixtures beside them on the Mac's disk. That works in the harness and on a simulator. On a phone the suite skips.

File: `CrewluvTests/Helpers/PartnerSummaryFixtures.swift`

```swift
//
//  PartnerSummaryFixtures.swift
//  CrewluvTests
//
//  Reads Fixtures/PartnerSummary: CrewLu's example summaries as Crewlu Cloud gives them
//  to partners A and B (see its README).
//

import Foundation
@testable import Crewluv

enum PartnerSummaryFixtures {
    static let partnerA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    static let partnerB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

    static let examples = [
        "commuting-home", "display-names", "hidden-trip-left-out", "home", "in-flight",
        "layover", "quick-status-everyone", "quick-status-one-partner", "turn",
    ]

    /// Found beside this file on the Mac's disk, which tests on a simulator can read.
    static let folder = URL(filePath: #filePath)
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .appending(path: "Fixtures/PartnerSummary")

    static var areReachable: Bool {
        FileManager.default.fileExists(atPath: folder.path(percentEncoded: false))
    }

    /// Partner A's or B's id, by letter.
    static func partnerID(_ letter: String) -> String {
        letter == "A" ? partnerA : partnerB
    }

    /// The `status` partner_view gives that partner, as sent.
    static func data(_ example: String, partner letter: String) throws -> Data {
        try Data(contentsOf: folder.appending(path: "\(example).\(letter).json"))
    }

    /// The same, as a dictionary to change or compare.
    static func json(_ example: String, partner letter: String) throws -> [String: Any] {
        guard let json = try JSONSerialization.jsonObject(with: data(example, partner: letter)) as? [String: Any] else {
            throw CocoaError(.coderReadCorrupt)
        }
        return json
    }

    @MainActor
    static func summary(_ example: String, partner letter: String) throws -> CloudSummary {
        try decode(data(example, partner: letter))
    }

    /// A summary from a dictionary, such as a fixture with a field changed.
    @MainActor
    static func summary(_ json: [String: Any]) throws -> CloudSummary {
        try decode(JSONSerialization.data(withJSONObject: json))
    }

    @MainActor
    private static func decode(_ data: Data) throws -> CloudSummary {
        try CloudSummary.decoder().decode(CloudSummary.self, from: data)
    }
}
```

- [ ] **Step 2: Write the failing tests**

Each fixture's status, field by field; the legs; the display name; the quick status's rules, with a fixed clock; and what decoding needs.

File: `CrewluvTests/CloudSummaryTests.swift`

```swift
//
//  CloudSummaryTests.swift
//  CrewluvTests
//
//  Crewlu Cloud's summary, as each partner gets it, becomes the status the screens and
//  alerts use (partner links piece 4 spec §5.4).
//

import Foundation
import Testing
@testable import Crewluv

@MainActor
@Suite(.enabled(if: PartnerSummaryFixtures.areReachable, "Reads its fixtures from the Mac's disk: run it on a simulator"))
struct CloudSummaryTests {
    private typealias Fixtures = PartnerSummaryFixtures

    /// When CrewLu wrote the quick-status examples, before any status in them expires.
    private static let written = Date(timeIntervalSince1970: 1_792_605_600)

    // MARK: - Every Field

    /// Status fields that aren't copied by name: the quick status is chosen (below), and the legs
    /// and display names arrive as JSON instead of iCloud's blobs.
    private static let notCopied: Set<String> = [
        "quickStatus", "quickStatusIcon", "quickStatusExpiry", "tripLegsJSON", "displayNameByPartnerJSON",
    ]

    @Test(arguments: PartnerSummaryFixtures.examples, ["A", "B"])
    func test_pilotStatus_copiesEveryFieldOfTheSameName(example: String, letter: String) throws {
        let sent = try Fixtures.json(example, partner: letter)
        let status = try Fixtures.summary(example, partner: letter)
            .pilotStatus(partnerID: Fixtures.partnerID(letter), at: Self.written)

        for field in Mirror(reflecting: status).children {
            let name = try #require(field.label)
            guard !Self.notCopied.contains(name) else { continue }
            let value = try #require(sent[name], "\(name) isn't in \(example).\(letter).json")
            #expect(Self.isSame(field.value, value), "\(name): \(field.value) against \(value)")
        }
    }

    // MARK: - Legs

    @Test func test_pilotStatus_turnsTheLegsIntoTodaysBlob() throws {
        let sent = try #require(try Fixtures.json("in-flight", partner: "A")["tripLegs"] as? [[String: Any]])
        let status = try Fixtures.summary("in-flight", partner: "A")
            .pilotStatus(partnerID: Fixtures.partnerA, at: Self.written)

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .secondsSince1970
        let legs = try decoder.decode([TripLeg].self, from: try #require(status.tripLegsJSON))

        #expect(legs.map(\.id) == sent.map { $0["id"] as? String })
        #expect(legs.map(\.type.rawValue) == sent.map { $0["type"] as? String })
        #expect(legs.map(\.startTime.timeIntervalSince1970) == sent.map { $0["startTime"] as? Double })
        #expect(legs.map(\.endTime.timeIntervalSince1970) == sent.map { $0["endTime"] as? Double })
        #expect(legs.map(\.flightNumber) == sent.map { $0["flightNumber"] as? String })
        #expect(legs.map(\.arrivalAirport) == sent.map { $0["arrivalAirport"] as? String })
    }

    @Test func test_pilotStatus_givesTheSameLegsTheSameBytes() throws {
        let summary = try Fixtures.summary("in-flight", partner: "A")
        let first = summary.pilotStatus(partnerID: Fixtures.partnerA, at: Self.written).tripLegsJSON
        let later = summary.pilotStatus(partnerID: Fixtures.partnerA, at: Self.written.addingTimeInterval(60)).tripLegsJSON

        #expect(first != nil)
        #expect(first == later)
    }

    @Test func test_pilotStatus_withoutLegs_hasNoBlob() throws {
        var sent = try Fixtures.json("home", partner: "A")
        sent["tripLegs"] = NSNull()

        #expect(try Fixtures.summary(sent).pilotStatus(partnerID: Fixtures.partnerA, at: Self.written).tripLegsJSON == nil)
    }

    // MARK: - Display Name

    @Test func test_displayName_isTheNameThePilotSetForThisPartner() throws {
        let forA = try Fixtures.summary("display-names", partner: "A")

        #expect(forA.displayName(for: Fixtures.partnerA) == "Dad")
        #expect(forA.displayName(for: Fixtures.partnerA.uppercased()) == "Dad")
        #expect(try Fixtures.summary("display-names", partner: "B").displayName(for: Fixtures.partnerB) == nil)
        #expect(try Fixtures.summary("home", partner: "A").displayName(for: Fixtures.partnerA) == nil)
    }

    @Test func test_displayName_empty_isNone() throws {
        var sent = try Fixtures.json("display-names", partner: "A")
        sent["displayNameByPartner"] = [Fixtures.partnerA: ""]

        #expect(try Fixtures.summary(sent).displayName(for: Fixtures.partnerA) == nil)
    }

    // MARK: - Quick Status

    @Test func test_quickStatus_sentToOnePartner_reachesOnlyThem() throws {
        let forA = try Fixtures.summary("quick-status-one-partner", partner: "A")
            .pilotStatus(partnerID: Fixtures.partnerA, at: Self.written)
        let forB = try Fixtures.summary("quick-status-one-partner", partner: "B")
            .pilotStatus(partnerID: Fixtures.partnerB, at: Self.written)

        #expect(forA.quickStatus == "Call Me")
        #expect(forA.quickStatusIcon == "phone.fill")
        #expect(forA.quickStatusExpiry == Date(timeIntervalSince1970: 1_792_612_800))
        #expect(forB.quickStatus == nil)
        #expect(forB.quickStatusIcon == nil)
        #expect(forB.quickStatusExpiry == nil)
    }

    @Test(arguments: ["A", "B"])
    func test_quickStatus_sentToEveryone_reachesEachPartner(letter: String) throws {
        let status = try Fixtures.summary("quick-status-everyone", partner: letter)
            .pilotStatus(partnerID: Fixtures.partnerID(letter), at: Self.written)

        #expect(status.quickStatus == "Sleeping")
        #expect(status.quickStatusIcon == "moon.zzz.fill")
        #expect(status.quickStatusExpiry == nil)
        #expect(status.isSleeping)
    }

    @Test func test_quickStatus_ownComesBeforeEveryones() throws {
        let summary = try ownAndEveryone(ownExpiry: nil, everyoneExpiry: nil)

        #expect(summary.quickStatus(for: Fixtures.partnerA, at: Self.written)?.status == "Call Me")
    }

    @Test func test_quickStatus_ownExpired_givesWayToEveryones() throws {
        let expiry = Self.written.addingTimeInterval(3600)
        let summary = try ownAndEveryone(ownExpiry: expiry, everyoneExpiry: nil)

        #expect(summary.quickStatus(for: Fixtures.partnerA, at: expiry.addingTimeInterval(-1))?.status == "Call Me")
        #expect(summary.quickStatus(for: Fixtures.partnerA, at: expiry)?.status == "Sleeping")
    }

    @Test func test_quickStatus_bothExpired_isNone() throws {
        let later = Self.written.addingTimeInterval(60)
        let summary = try ownAndEveryone(ownExpiry: Self.written, everyoneExpiry: later)
        let status = summary.pilotStatus(partnerID: Fixtures.partnerA, at: later)

        #expect(summary.quickStatus(for: Fixtures.partnerA, at: later) == nil)
        #expect(status.quickStatus == nil)
        #expect(status.quickStatusIcon == nil)
        #expect(status.quickStatusExpiry == nil)
    }

    @Test func test_quickStatus_empty_isNone() throws {
        var sent = try Fixtures.json("quick-status-everyone", partner: "A")
        sent["quickStatusByPartner"] = [Fixtures.partnerA: ["status": "", "icon": "phone.fill"]]

        #expect(try Fixtures.summary(sent).quickStatus(for: Fixtures.partnerA, at: Self.written)?.status == "Sleeping")
        sent["quickStatus"] = ""
        #expect(try Fixtures.summary(sent).quickStatus(for: Fixtures.partnerA, at: Self.written) == nil)
    }

    @Test func test_quickStatus_forEveryone_needsThisPartnerAmongItsTargets() throws {
        var sent = try Fixtures.json("quick-status-everyone", partner: "A")
        sent["quickStatusByPartner"] = NSNull()

        sent["quickStatusTargets"] = [Fixtures.partnerB]
        #expect(try Fixtures.summary(sent).quickStatus(for: Fixtures.partnerA, at: Self.written) == nil)
        sent["quickStatusTargets"] = [Fixtures.partnerA]
        #expect(try Fixtures.summary(sent).quickStatus(for: Fixtures.partnerA, at: Self.written)?.status == "Sleeping")
    }

    @Test func test_quickStatusChange_isWhenTheShownOneExpires() throws {
        let ownExpiry = Self.written.addingTimeInterval(3600)
        let everyoneExpiry = Self.written.addingTimeInterval(7200)
        let summary = try ownAndEveryone(ownExpiry: ownExpiry, everyoneExpiry: everyoneExpiry)

        #expect(summary.quickStatusChange(for: Fixtures.partnerA, after: Self.written) == ownExpiry)
        #expect(summary.quickStatusChange(for: Fixtures.partnerA, after: ownExpiry) == everyoneExpiry)
        #expect(summary.quickStatusChange(for: Fixtures.partnerA, after: everyoneExpiry) == nil)
        #expect(try ownAndEveryone(ownExpiry: nil, everyoneExpiry: nil)
            .quickStatusChange(for: Fixtures.partnerA, after: Self.written) == nil)
    }

    // MARK: - Decoding

    @Test func test_decoding_fillsWhatsMissing_andIgnoresWhatsNew() throws {
        let sent: [String: Any] = [
            "pilotId": "pilot", "pilotFirstName": "Alex", "lastUpdated": 1_792_605_600, "appVersion": "3.1",
            "fieldFromANewerCrewLu": true,
        ]
        let status = try Fixtures.summary(sent).pilotStatus(partnerID: Fixtures.partnerA, at: Self.written)

        #expect(status.pilotFirstName == "Alex")
        #expect(status.displayStatus == .home)
        #expect(!status.isSleeping && !status.isHome && !status.isInFlight && !status.isOnDuty)
        #expect(status.upcomingCities.isEmpty)
        #expect(status.tripLegsJSON == nil)
        #expect(status.homeArrivalTime == nil)
        #expect(status.quickStatus == nil)
    }

    @Test(arguments: ["pilotId", "pilotFirstName", "lastUpdated", "appVersion"])
    func test_decoding_needsTheFieldsTheRecordNeeds(missing: String) throws {
        var sent = try Fixtures.json("home", partner: "A")
        sent[missing] = nil

        #expect(throws: DecodingError.self) { try Fixtures.summary(sent) }
    }

    // MARK: - Helpers

    /// Partner A's own Call Me over Sleeping for everyone, each until its expiry (nil for none).
    private func ownAndEveryone(ownExpiry: Date?, everyoneExpiry: Date?) throws -> CloudSummary {
        var sent = try Fixtures.json("quick-status-everyone", partner: "A")
        sent["quickStatusByPartner"] = [
            Fixtures.partnerA: [
                "status": "Call Me", "icon": "phone.fill",
                "expiry": ownExpiry.map { $0.timeIntervalSince1970 } ?? NSNull(),
            ] as [String: Any],
        ]
        sent["quickStatusExpiry"] = everyoneExpiry.map { $0.timeIntervalSince1970 } ?? NSNull()
        return try Fixtures.summary(sent)
    }

    /// Whether a status field holds what the summary sent: dates as seconds since 1970, and the
    /// display status as the words CrewLu sends.
    private static func isSame(_ value: Any, _ sent: Any) -> Bool {
        let mirror = Mirror(reflecting: value)
        if mirror.displayStyle == .optional {
            guard let wrapped = mirror.children.first?.value else { return sent is NSNull }
            return isSame(wrapped, sent)
        }
        switch value {
        case let text as String: return sent as? String == text
        case let flag as Bool: return sent as? Bool == flag
        case let number as Int: return sent as? Int == number
        case let number as Double: return sent as? Double == number
        case let date as Date: return sent as? Double == date.timeIntervalSince1970
        case let list as [String]: return sent as? [String] == list
        case let status as PilotDisplayStatus: return sent as? String == status.rawDisplayString
        default: return false
        }
    }
}
```

- [ ] **Step 3: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `cannot find type 'CloudSummary' in scope` (or `cannot find 'CloudSummary' in scope`).

- [ ] **Step 4: Write the summary**

File: `Crewluv/Models/CloudSummary.swift`

```swift
//
//  CloudSummary.swift
//  CrewLuve
//
//  The pilot's summary as Crewlu Cloud gives it to this partner, and the status
//  the screens and alerts make of it
//

import Foundation

/// The pilot's summary as Crewlu Cloud's partner door gives it to this partner: partner_view's
/// `status`, which is CrewLu's `SharedPilotStatus` with only this partner's own entries left in it.
/// Its shape is CrewLu's `supabase/partner-status/schema.json`.
///
/// Decoding is as forgiving as the iCloud record's: only the pilot's id and first name,
/// `lastUpdated` and `appVersion` must be there. Anything else missing reads as nothing, the way
/// the door leaves out a quick status meant for someone else, and fields this version doesn't
/// know are ignored.
struct CloudSummary: Decodable, Sendable {

    // MARK: - Quick Status

    /// A quick status: this partner's own, or the one for everyone.
    struct QuickStatus: Decodable, Equatable, Sendable {
        let status: String
        let icon: String?
        /// When it stops showing. Nil means it has no limit.
        let expiry: Date?
    }

    // MARK: - Fields, Named as CrewLu Names Them

    let pilotId: String
    let pilotFirstName: String
    let homeAirportCode: String?
    let baseAirportCode: String?
    let homeTimezone: String?
    let displayStatus: String?
    let isSleeping: Bool?
    let isHome: Bool?
    let isInFlight: Bool?
    let isOnDuty: Bool?
    let currentAirport: String?
    let currentCity: String?
    let currentTimezone: String?
    let localTimeAtPilot: String?
    let currentLatitude: Double?
    let currentLongitude: Double?
    let currentFlightNumber: String?
    let currentFlightDeparture: String?
    let currentFlightArrival: String?
    let currentFlightDepartureTime: Date?
    let currentFlightArrivalTime: Date?
    let currentFlightArrivalTimezone: String?
    let homeArrivalTime: Date?
    let homeArrivalLabel: String?
    let homeArrivalCity: String?
    let nextDepartureTime: Date?
    let nextFlightNumber: String?
    let nextFlightDestination: String?
    let nextDepartureLabel: String?
    let lastTripEndDate: Date?
    let lastTripDurationDays: Int?
    let currentTripId: String?
    let tripDayNumber: Int?
    let tripTotalDays: Int?
    let upcomingCities: [String]?
    let tripLegs: [TripLeg]?
    let quickStatus: String?
    let quickStatusIcon: String?
    let quickStatusExpiry: Date?
    /// Who the top-level quick status is for, or nil for everyone. The door leaves the status in
    /// only when it's for everyone or names this partner.
    let quickStatusTargets: [String]?
    /// This partner's own quick status, under their id in lower case.
    let quickStatusByPartner: [String: QuickStatus]?
    /// The name the pilot set for this partner, under the same id.
    let displayNameByPartner: [String: String]?
    let flightDelayMinutes: Int?
    let lastUpdated: Date
    let appVersion: String

    /// Reads dates as CrewLu writes them: seconds since 1970.
    static func decoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .secondsSince1970
        return decoder
    }
}

// MARK: - The Status the Screens Use

extension CloudSummary {

    /// The status the screens and alerts use, for this partner at `now`. The legs become iCloud's
    /// blob, so the trip logic reads them as before, and the quick status is the one this
    /// partner sees at `now`.
    func pilotStatus(partnerID: String, at now: Date) -> SharedPilotStatus {
        let shown = quickStatus(for: partnerID, at: now)
        return SharedPilotStatus(
            pilotId: pilotId,
            pilotFirstName: pilotFirstName,
            homeAirportCode: homeAirportCode,
            baseAirportCode: baseAirportCode,
            homeTimezone: homeTimezone,
            displayStatus: PilotDisplayStatus(rawDisplayString: displayStatus ?? "Home"),
            isSleeping: isSleeping ?? false,
            isHome: isHome ?? false,
            isInFlight: isInFlight ?? false,
            isOnDuty: isOnDuty ?? false,
            currentAirport: currentAirport,
            currentCity: currentCity,
            currentTimezone: currentTimezone,
            localTimeAtPilot: localTimeAtPilot,
            currentLatitude: currentLatitude,
            currentLongitude: currentLongitude,
            currentFlightNumber: currentFlightNumber,
            currentFlightDeparture: currentFlightDeparture,
            currentFlightArrival: currentFlightArrival,
            currentFlightDepartureTime: currentFlightDepartureTime,
            currentFlightArrivalTime: currentFlightArrivalTime,
            currentFlightArrivalTimezone: currentFlightArrivalTimezone,
            homeArrivalTime: homeArrivalTime,
            homeArrivalLabel: homeArrivalLabel,
            homeArrivalCity: homeArrivalCity,
            nextDepartureTime: nextDepartureTime,
            nextFlightNumber: nextFlightNumber,
            nextFlightDestination: nextFlightDestination,
            nextDepartureLabel: nextDepartureLabel,
            lastTripEndDate: lastTripEndDate,
            lastTripDurationDays: lastTripDurationDays,
            currentTripId: currentTripId,
            tripDayNumber: tripDayNumber,
            tripTotalDays: tripTotalDays,
            upcomingCities: upcomingCities ?? [],
            tripLegsJSON: tripLegs.flatMap { Self.legsBlob($0) },
            quickStatus: shown?.status,
            quickStatusIcon: shown?.icon,
            quickStatusExpiry: shown?.expiry,
            flightDelayMinutes: flightDelayMinutes,
            displayNameByPartnerJSON: nil,
            lastUpdated: lastUpdated,
            appVersion: appVersion
        )
    }

    /// The name the pilot set for this partner, or nil when there's none.
    func displayName(for partnerID: String) -> String? {
        guard let name = displayNameByPartner?[partnerID.lowercased()], !name.isEmpty else { return nil }
        return name
    }

    /// The quick status this partner sees at `now`: their own while it lasts, then the one for
    /// everyone while it lasts. A status shows until its expiry, as on the screen.
    func quickStatus(for partnerID: String, at now: Date) -> QuickStatus? {
        let id = partnerID.lowercased()
        if let own = quickStatusByPartner?[id], Self.shows(own.status, until: own.expiry, at: now) {
            return own
        }
        guard let status = quickStatus,
              Self.shows(status, until: quickStatusExpiry, at: now),
              quickStatusTargets.map({ $0.contains { $0.lowercased() == id } }) ?? true
        else { return nil }
        return QuickStatus(status: status, icon: quickStatusIcon, expiry: quickStatusExpiry)
    }

    /// When the quick status this partner sees changes by itself: when the one shown now expires.
    func quickStatusChange(for partnerID: String, after now: Date) -> Date? {
        quickStatus(for: partnerID, at: now)?.expiry
    }

    private static func shows(_ status: String, until expiry: Date?, at now: Date) -> Bool {
        !status.isEmpty && (expiry.map { $0 > now } ?? true)
    }

    /// The legs as iCloud's `tripLegsJSON` carries them. Sorted keys give the same legs the same
    /// bytes on every run, which the alerts compare.
    private static func legsBlob(_ legs: [TripLeg]) -> Data? {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .secondsSince1970
        encoder.outputFormatting = .sortedKeys
        return try? encoder.encode(legs)
    }
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 45 tests in 6 suites passed`.

- [ ] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Models/CloudSummary.swift CrewluvTests/CloudSummaryTests.swift CrewluvTests/Helpers/PartnerSummaryFixtures.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): Crewlu Cloud's summary becomes the status the screens use" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 4: The push environment

**Files:**
- Create: `Crewluv/Utils/PushEnvironment.swift`
- Test: `CrewluvTests/PushEnvironmentTests.swift`

Spec §6.1: `sandbox` for every build Xcode installs, Debug or Release, and `production` for TestFlight and the App Store. It's read from the build's own provisioning profile, which is what decides it.

- [ ] **Step 1: Write the failing tests**

File: `CrewluvTests/PushEnvironmentTests.swift`

```swift
//
//  PushEnvironmentTests.swift
//  CrewluvTests
//
//  A push token's environment follows the build's provisioning profile, not Debug or
//  Release (partner-api.md, "Pushes"; partner links piece 4 spec §6.1).
//

import Foundation
import Testing
@testable import Crewluv

struct PushEnvironmentTests {

    /// A provisioning profile as Xcode embeds it: signed data with the profile's plist inside.
    private func profile(apsEnvironment: String?) throws -> Data {
        var entitlements: [String: Any] = ["application-identifier": "UV96Z83C7B.com.ToddAnderson.Crewluv"]
        entitlements["aps-environment"] = apsEnvironment
        let plist = try PropertyListSerialization.data(
            fromPropertyList: ["Name": "Crewluv Development", "Entitlements": entitlements],
            format: .xml,
            options: 0
        )
        return Data([0x30, 0x82, 0x4E, 0x1F, 0x06, 0x09]) + plist + Data([0xA0, 0x82, 0x0D, 0x3C])
    }

    @Test func test_developmentProfile_isSandbox() throws {
        #expect(PushEnvironment.from(provisioningProfile: try profile(apsEnvironment: "development")) == .sandbox)
    }

    @Test func test_adHocProfile_isProduction() throws {
        #expect(PushEnvironment.from(provisioningProfile: try profile(apsEnvironment: "production")) == .production)
    }

    @Test func test_noProfile_asOnTestFlightAndTheAppStore_isProduction() {
        #expect(PushEnvironment.from(provisioningProfile: nil) == .production)
    }

    @Test func test_profileWithoutPushes_isSandbox() throws {
        #expect(PushEnvironment.from(provisioningProfile: try profile(apsEnvironment: nil)) == .sandbox)
    }

    @Test func test_unreadableProfile_isSandbox() {
        #expect(PushEnvironment.from(provisioningProfile: Data("not a profile".utf8)) == .sandbox)
    }

    @Test func test_rawValues_areWhatTheDoorTakes() {
        #expect(PushEnvironment.sandbox.rawValue == "sandbox")
        #expect(PushEnvironment.production.rawValue == "production")
    }
}
```

- [ ] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `cannot find 'PushEnvironment' in scope`.

- [ ] **Step 3: Write the environment**

File: `Crewluv/Utils/PushEnvironment.swift`

```swift
//
//  PushEnvironment.swift
//  CrewLuve
//
//  Which of Apple's push services this build's tokens belong to
//

import Foundation

/// Which of Apple's push services this build's tokens belong to: `sandbox` for every build Xcode
/// installs, Debug or Release, and `production` for TestFlight and the App Store. It follows the
/// `aps-environment` entitlement that the build's provisioning profile sets (partner-api.md,
/// "Pushes"). A token sent with the wrong one is turned away by Apple and dropped.
nonisolated enum PushEnvironment: String, Sendable {
    case sandbox
    case production

    /// This build's environment.
    static var current: PushEnvironment {
        #if targetEnvironment(simulator)
        .sandbox
        #else
        from(provisioningProfile: Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision")
            .flatMap { try? Data(contentsOf: $0) })
        #endif
    }

    /// The environment a build with this embedded provisioning profile has. TestFlight and the
    /// App Store remove the profile, so none means `production`. A profile is signed data with
    /// its plist inside: ad hoc profiles say `production`, and the ones Xcode installs don't.
    static func from(provisioningProfile data: Data?) -> PushEnvironment {
        guard let data else { return .production }
        guard let start = data.range(of: Data("<?xml".utf8)),
              let end = data.range(of: Data("</plist>".utf8), in: start.lowerBound..<data.endIndex),
              let plist = try? PropertyListSerialization.propertyList(
                  from: data[start.lowerBound..<end.upperBound], format: nil
              ) as? [String: Any],
              let entitlements = plist["Entitlements"] as? [String: Any],
              entitlements["aps-environment"] as? String == "production"
        else { return .sandbox }
        return .production
    }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 51 tests in 7 suites passed`.

- [ ] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Utils/PushEnvironment.swift CrewluvTests/PushEnvironmentTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): the push environment follows the build's provisioning profile" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 5: The partner door

**Files:**
- Create: `Crewluv/Services/PartnerCloud/PartnerDoor.swift`, `Crewluv/Services/PartnerCloud/LivePartnerDoor.swift`
- Test: `CrewluvTests/LivePartnerDoorTests.swift`

Spec §5.2 and decisions 1–2: `partner_view` and `partner_set_push` over HTTPS, with the publishable key in the `apikey` header only. Each call answers, or throws one `PartnerDoorError`: a refusal, or unavailable.

- [ ] **Step 1: Write the failing tests**

A stand-in for the network records each request and answers it.

File: `CrewluvTests/LivePartnerDoorTests.swift`

```swift
//
//  LivePartnerDoorTests.swift
//  CrewluvTests
//
//  The partner door's calls and answers, against a stand-in for the network
//  (partner-api.md; partner links piece 4 spec §5.2).
//

import Foundation
import Testing
@testable import Crewluv

@MainActor
struct LivePartnerDoorTests {

    private static let partner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    private static let key = String(repeating: "ab", count: 32)
    private static let updatedAt = "2026-10-18T22:01:40.493+00:00"
    private static let status = #"{"pilotId": "pilot", "pilotFirstName": "Alex", "lastUpdated": 1792605600, "appVersion": "3.0"}"#

    // MARK: - The Request

    @Test func test_view_postsTheKeyWithOnlyThePublishableKey() async throws {
        let network = StandInNetwork(body: #"{"partner_id": "\#(Self.partner)", "updated_at": null, "status": null}"#)
        _ = try await network.door.view(key: Self.key, since: nil)

        let request = try #require(network.requests.first)
        #expect(network.requests.count == 1)
        #expect(request.url?.absoluteString == "https://corxvurxpnrzekbxdgye.supabase.co/rest/v1/rpc/partner_view")
        #expect(request.httpMethod == "POST")
        #expect(request.value(forHTTPHeaderField: "apikey") == LivePartnerDoor.publishableKey)
        #expect(LivePartnerDoor.publishableKey.hasPrefix("sb_publishable_"))
        #expect(request.value(forHTTPHeaderField: "Authorization") == nil)
        #expect(request.value(forHTTPHeaderField: "Content-Type") == "application/json")
        #expect(request.timeoutInterval == 20)
        #expect(try network.parameters(request) == ["p_key": Self.key])
    }

    @Test func test_view_sendsSinceBackAsItCame() async throws {
        let network = StandInNetwork(body: #"{"partner_id": "\#(Self.partner)", "updated_at": "\#(Self.updatedAt)", "unchanged": true}"#)
        _ = try await network.door.view(key: Self.key, since: Self.updatedAt)

        #expect(try network.parameters(#require(network.requests.first)) == ["p_key": Self.key, "p_since": Self.updatedAt])
    }

    @Test func test_setPush_postsTheTokenAndItsEnvironment() async throws {
        let network = StandInNetwork(body: #"{"ok": true}"#)
        try await network.door.setPush(key: Self.key, token: "0a1b2c", environment: .sandbox)

        let request = try #require(network.requests.first)
        #expect(request.url?.absoluteString == "https://corxvurxpnrzekbxdgye.supabase.co/rest/v1/rpc/partner_set_push")
        #expect(request.value(forHTTPHeaderField: "apikey") == LivePartnerDoor.publishableKey)
        #expect(try network.parameters(request) == ["p_key": Self.key, "p_token": "0a1b2c", "p_env": "sandbox"])
    }

    // MARK: - Answers

    @Test func test_view_summary() async throws {
        let network = StandInNetwork(
            body: #"{"partner_id": "\#(Self.partner)", "updated_at": "\#(Self.updatedAt)", "status": \#(Self.status)}"#
        )
        let answer = try await network.door.view(key: Self.key, since: nil)

        #expect(answer.partnerID == Self.partner)
        #expect(answer.updatedAt == Self.updatedAt)
        guard case .summary(let summary) = answer.content else {
            Issue.record("expected a summary, got \(answer.content)")
            return
        }
        #expect(summary.pilotFirstName == "Alex")
    }

    @Test func test_view_beforeTheFirstSummary() async throws {
        let network = StandInNetwork(body: #"{"partner_id": "\#(Self.partner)", "updated_at": null, "status": null}"#)
        let answer = try await network.door.view(key: Self.key, since: nil)

        #expect(answer.partnerID == Self.partner)
        #expect(answer.updatedAt == nil)
        guard case .noSummaryYet = answer.content else {
            Issue.record("expected no summary yet, got \(answer.content)")
            return
        }
    }

    @Test func test_view_unchanged() async throws {
        let network = StandInNetwork(body: #"{"partner_id": "\#(Self.partner)", "updated_at": "\#(Self.updatedAt)", "unchanged": true}"#)
        let answer = try await network.door.view(key: Self.key, since: Self.updatedAt)

        #expect(answer.updatedAt == Self.updatedAt)
        guard case .unchanged = answer.content else {
            Issue.record("expected unchanged, got \(answer.content)")
            return
        }
    }

    @Test func test_setPush_ok() async throws {
        try await StandInNetwork(body: #"{"ok": true}"#).door.setPush(key: Self.key, token: "0a1b2c", environment: .production)
    }

    @Test(arguments: [
        ("sharing_ended", PartnerDoorError.refused(.sharingEnded)),
        ("invalid_input", .refused(.invalidInput)),
        ("key_in_use", .refused(.keyInUse)),
        ("too_many_devices", .refused(.tooManyDevices)),
        ("try_later", .refused(.tryLater)),
        ("a_refusal_from_a_newer_door", .unavailable),
    ])
    func test_refusals(error: String, expected: PartnerDoorError) async {
        let network = StandInNetwork(body: #"{"error": "\#(error)"}"#)

        await #expect(throws: expected) { try await network.door.view(key: Self.key, since: nil) }
        await #expect(throws: expected) { try await network.door.setPush(key: Self.key, token: "0a1b2c", environment: .sandbox) }
    }

    @Test(arguments: [400, 401, 404, 500, 503])
    func test_anHTTPStatusOtherThan200_isUnavailable(status: Int) async {
        let network = StandInNetwork(status: status, body: #"{"partner_id": "\#(Self.partner)", "updated_at": null, "status": null}"#)

        await #expect(throws: PartnerDoorError.unavailable) { try await network.door.view(key: Self.key, since: nil) }
    }

    @Test func test_noNetwork_isUnavailable() async {
        let network = StandInNetwork(error: URLError(.notConnectedToInternet))

        await #expect(throws: PartnerDoorError.unavailable) { try await network.door.view(key: Self.key, since: nil) }
        await #expect(throws: PartnerDoorError.unavailable) {
            try await network.door.setPush(key: Self.key, token: "0a1b2c", environment: .sandbox)
        }
    }

    @Test(arguments: [
        "<html>Bad gateway</html>",
        #"{"updated_at": null, "status": null}"#,
        #"{"partner_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "updated_at": null, "status": {"pilotFirstName": "Alex"}}"#,
    ])
    func test_anAnswerThatDoesntDecode_isUnavailable(body: String) async {
        let network = StandInNetwork(body: body)

        await #expect(throws: PartnerDoorError.unavailable) { try await network.door.view(key: Self.key, since: nil) }
    }
}

// MARK: - A Stand-in for the Network

/// Records each request and answers every one with the same status and body, or fails them all.
@MainActor
private final class StandInNetwork {
    private(set) var requests: [URLRequest] = []
    private let answer: Result<(status: Int, body: Data), any Error>

    init(status: Int = 200, body: String) {
        answer = .success((status, Data(body.utf8)))
    }

    init(error: any Error) {
        answer = .failure(error)
    }

    var door: LivePartnerDoor {
        LivePartnerDoor(transport: { request in try await self.send(request) })
    }

    /// A request's JSON body.
    func parameters(_ request: URLRequest) throws -> [String: String] {
        try JSONDecoder().decode([String: String].self, from: #require(request.httpBody))
    }

    private func send(_ request: URLRequest) async throws -> (Data, URLResponse) {
        requests.append(request)
        let (status, body) = try answer.get()
        let url = try #require(request.url)
        let response = try #require(HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/2", headerFields: nil))
        return (body, response)
    }
}
```

- [ ] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `cannot find 'PartnerDoorError' in scope` and `cannot find type 'LivePartnerDoor' in scope`. Which ones it lists depends on which file the compiler reaches first.

- [ ] **Step 3: Write the door**

File: `Crewluv/Services/PartnerCloud/PartnerDoor.swift`

```swift
//
//  PartnerDoor.swift
//  CrewLuve
//
//  Crewlu Cloud's partner door: the calls a partner's device makes
//

import Foundation

/// Crewlu Cloud's partner door: the calls a partner's device makes with only the publishable key
/// and its own device key (CrewLu's `supabase/partner-api.md`). This version reads the summary and
/// registers for pushes; joining, codes and leaving come with the screens that use them.
protocol PartnerDoor {
    /// partner_view: the pilot's summary, trimmed for the partner whose device holds `key`.
    /// `since` is the last answer's `updatedAt`, sent back exactly as it came, so a summary that
    /// hasn't changed isn't sent again.
    func view(key: String, since: String?) async throws(PartnerDoorError) -> PartnerViewAnswer

    /// partner_set_push: this device's push token, as lower-case hex, and the Apple service it
    /// belongs to.
    func setPush(key: String, token: String, environment: PushEnvironment) async throws(PartnerDoorError)
}

/// Why a partner-door call gave no answer to use.
nonisolated enum PartnerDoorError: Error, Equatable {
    /// The door answered with one of its refusals: HTTP 200 and `{"error": …}`.
    case refused(Refusal)
    /// No usable answer: no network, a timeout, an HTTP status other than 200, or an answer
    /// that doesn't decode.
    case unavailable

    /// The door's refusals (partner-api.md, "Answers").
    nonisolated enum Refusal: String, Sendable {
        /// The key, link, code or ticket isn't valid, or no longer is.
        case sharingEnded = "sharing_ended"
        case invalidInput = "invalid_input"
        /// Another partner's device has this key.
        case keyInUse = "key_in_use"
        case tooManyDevices = "too_many_devices"
        /// Too many wrong codes in the last minute.
        case tryLater = "try_later"
    }
}

/// partner_view's answer.
struct PartnerViewAnswer: Sendable {

    /// What came with the partner and the time.
    enum Content: Sendable {
        case summary(CloudSummary)
        /// The pilot's CrewLu hasn't sent a summary yet.
        case noSummaryYet
        /// Nothing is newer than `since`.
        case unchanged
    }

    let partnerID: String
    /// When the summary last changed, to the millisecond, as text to send back as `since`.
    /// Nil before the first summary.
    let updatedAt: String?
    let content: Content
}
```

- [ ] **Step 4: Write its live version**

The publishable key is the website's (`~/Dev/Crewluve Website/src/cloud.ts`). It's public by design, as on the website.

File: `Crewluv/Services/PartnerCloud/LivePartnerDoor.swift`

```swift
//
//  LivePartnerDoor.swift
//  CrewLuve
//
//  The partner door over the network
//

import Foundation

/// The partner door over HTTPS. Each call is a PostgREST RPC: a POST of its named parameters as
/// JSON, with the publishable key in the `apikey` header and nothing else (partner-api.md).
struct LivePartnerDoor: PartnerDoor {
    /// Sends a request and gives back the answer's body and response.
    typealias Transport = (URLRequest) async throws -> (Data, URLResponse)

    /// Crewlu Cloud's RPC address. A fixed, well-formed URL, so it always parses.
    static let rpcURL = URL(string: "https://corxvurxpnrzekbxdgye.supabase.co/rest/v1/rpc/")!
    /// The publishable key, as the website has it (`src/cloud.ts`). It's public by design: the
    /// partner door's own checks guard the data.
    static let publishableKey = "sb_publishable_1wBeBjIIvEmMygoM9vWA2A_ptocrFGM"
    /// How long a call may take before it counts as unavailable.
    static let timeout: TimeInterval = 20

    private let transport: Transport

    init(transport: @escaping Transport = { try await URLSession.shared.data(for: $0) }) {
        self.transport = transport
    }

    func view(key: String, since: String?) async throws(PartnerDoorError) -> PartnerViewAnswer {
        let answer: ViewAnswer = try await call("partner_view", ViewParameters(key: key, since: since))
        let content: PartnerViewAnswer.Content
        if answer.unchanged == true {
            content = .unchanged
        } else if let summary = answer.status {
            content = .summary(summary)
        } else {
            content = .noSummaryYet
        }
        return PartnerViewAnswer(partnerID: answer.partnerID, updatedAt: answer.updatedAt, content: content)
    }

    func setPush(key: String, token: String, environment: PushEnvironment) async throws(PartnerDoorError) {
        let _: OKAnswer = try await call(
            "partner_set_push", PushParameters(key: key, token: token, environment: environment.rawValue)
        )
    }

    // MARK: - Calls

    /// Posts one RPC and decodes its answer, or the door's refusal.
    private func call<Answer: Decodable>(
        _ name: String, _ parameters: some Encodable
    ) async throws(PartnerDoorError) -> Answer {
        var request = URLRequest(url: Self.rpcURL.appending(path: name), timeoutInterval: Self.timeout)
        request.httpMethod = "POST"
        request.setValue(Self.publishableKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: Data
        do {
            request.httpBody = try JSONEncoder().encode(parameters)
            let (data, response) = try await transport(request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw PartnerDoorError.unavailable }
            body = data
        } catch {
            throw .unavailable
        }

        let decoder = CloudSummary.decoder()
        if let refusal = try? decoder.decode(RefusalAnswer.self, from: body) {
            guard let reason = PartnerDoorError.Refusal(rawValue: refusal.error) else { throw .unavailable }
            throw .refused(reason)
        }
        guard let answer = try? decoder.decode(Answer.self, from: body) else { throw .unavailable }
        return answer
    }
}

// MARK: - What Goes Out and Comes Back

private struct ViewParameters: Encodable {
    let key: String
    /// Left out when nil, so the door sends the whole summary.
    let since: String?

    enum CodingKeys: String, CodingKey {
        case key = "p_key"
        case since = "p_since"
    }
}

private struct PushParameters: Encodable {
    let key: String
    let token: String
    let environment: String

    enum CodingKeys: String, CodingKey {
        case key = "p_key"
        case token = "p_token"
        case environment = "p_env"
    }
}

private struct RefusalAnswer: Decodable {
    let error: String
}

private struct OKAnswer: Decodable {
    let ok: Bool
}

private struct ViewAnswer: Decodable {
    let partnerID: String
    let updatedAt: String?
    let unchanged: Bool?
    let status: CloudSummary?

    enum CodingKeys: String, CodingKey {
        case partnerID = "partner_id"
        case updatedAt = "updated_at"
        case unchanged
        case status
    }
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 62 tests in 8 suites passed`.

- [ ] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PartnerCloud/PartnerDoor.swift Crewluv/Services/PartnerCloud/LivePartnerDoor.swift CrewluvTests/LivePartnerDoorTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): the partner door's read and push registration, over HTTPS" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 6: The device key

**Files:**
- Create: `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift`
- Test: `CrewluvTests/DeviceKeyTests.swift`, `CrewluvTests/KeychainDeviceKeyStoreTests.swift`

Spec §5.3: each device makes its own key and keeps it in the Keychain, for this device only and readable once the phone has been unlocked since it started. `KeychainDeviceKeyStoreTests` runs only in Xcode (Task 15): the harness can't reach the iOS Keychain, so `run.sh` leaves it out.

- [ ] **Step 1: Write the failing tests**

File: `CrewluvTests/DeviceKeyTests.swift`

```swift
//
//  DeviceKeyTests.swift
//  CrewluvTests
//
//  Each device makes its own key (partner-api.md, "The device key").
//

import Foundation
import Testing
@testable import Crewluv

struct DeviceKeyTests {

    @Test func test_make_gives64LowerCaseHexCharacters() throws {
        let key = try #require(DeviceKey.make())

        #expect(key.count == 64)
        #expect(key.allSatisfy { "0123456789abcdef".contains($0) })
    }

    @Test func test_make_givesANewKeyEachTime() throws {
        let keys = try (0..<20).map { _ in try #require(DeviceKey.make()) }

        #expect(Set(keys).count == keys.count)
    }
}
```

File: `CrewluvTests/KeychainDeviceKeyStoreTests.swift`

```swift
//
//  KeychainDeviceKeyStoreTests.swift
//  CrewluvTests
//
//  The device key in the Keychain (partner links piece 4 spec §5.3). These run only in
//  Xcode: the Mac harness can't reach the iOS Keychain.
//

import Foundation
import Security
import Testing
@testable import Crewluv

@MainActor
@Suite(.serialized)
struct KeychainDeviceKeyStoreTests {
    /// Its own service, so the tests never touch the app's key.
    private let store = KeychainDeviceKeyStore(service: "com.ToddAnderson.Crewluv.partnerCloud.tests")

    init() {
        store.forgetDeviceKey()
    }

    @Test func test_noKey_readsNil() {
        #expect(store.deviceKey() == nil)
    }

    @Test func test_save_thenRead() {
        #expect(store.save(deviceKey: "first"))
        #expect(store.deviceKey() == "first")
    }

    @Test func test_save_replacesTheKey() {
        store.save(deviceKey: "first")
        #expect(store.save(deviceKey: "second"))
        #expect(store.deviceKey() == "second")
    }

    @Test func test_forget_leavesNoKey() {
        store.save(deviceKey: "first")
        store.forgetDeviceKey()
        #expect(store.deviceKey() == nil)
    }

    @Test func test_key_staysOnThisDevice_andCanBeReadWhileLocked() throws {
        store.save(deviceKey: "first")
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "com.ToddAnderson.Crewluv.partnerCloud.tests",
            kSecReturnAttributes as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: CFTypeRef?
        #expect(SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess)
        let attributes = try #require(result as? [String: Any])

        #expect(attributes[kSecAttrAccessible as String] as? String == kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly as String)
        #expect(attributes[kSecAttrSynchronizable as String] as? Bool != true)
    }
}
```

- [ ] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `cannot find 'DeviceKey' in scope`.

- [ ] **Step 3: Write the key and its store**

File: `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift`

```swift
//
//  DeviceKeyStore.swift
//  CrewLuve
//
//  This device's partner-door key, and where it's kept
//

import Foundation
import Security

/// A device's partner-door key: 32 random bytes as 64 lower-case hex characters, made on the
/// device itself (partner-api.md, "The device key").
nonisolated enum DeviceKey {
    /// A new key, or nil if the system couldn't give random bytes.
    static func make() -> String? {
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else { return nil }
        return bytes.map { String(format: "%02x", $0) }.joined()
    }
}

/// Where this device keeps its partner-door key.
protocol DeviceKeyStore {
    /// This device's key, or nil when it has none.
    func deviceKey() -> String?
    /// Saves this device's key in place of any other. False if it couldn't be saved.
    @discardableResult func save(deviceKey: String) -> Bool
    func forgetDeviceKey()
}

/// This device's key in the Keychain, as a generic password for this device only. iOS can read it
/// in the background once the phone has been unlocked since it started, so a push at night still
/// finds it. It never syncs, and never moves to another device in a backup.
struct KeychainDeviceKeyStore: DeviceKeyStore {
    static let service = "com.ToddAnderson.Crewluv.partnerCloud"
    private static let account = "deviceKey"

    private let service: String

    init(service: String = Self.service) {
        self.service = service
    }

    func deviceKey() -> String? {
        var query = item
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data
        else { return nil }
        return String(data: data, encoding: .utf8)
    }

    @discardableResult
    func save(deviceKey: String) -> Bool {
        let data = Data(deviceKey.utf8)
        let updated = SecItemUpdate(item as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        guard updated == errSecItemNotFound else { return updated == errSecSuccess }
        var newItem = item
        newItem[kSecValueData as String] = data
        newItem[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        return SecItemAdd(newItem as CFDictionary, nil) == errSecSuccess
    }

    func forgetDeviceKey() {
        SecItemDelete(item as CFDictionary)
    }

    private var item: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: Self.account,
        ]
    }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 64 tests in 9 suites passed`. The Keychain tests wait for Task 15.

- [ ] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PartnerCloud/DeviceKeyStore.swift CrewluvTests/DeviceKeyTests.swift CrewluvTests/KeychainDeviceKeyStoreTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): each device makes its own partner key and keeps it in the Keychain" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 7: The iCloud read, in one place

**Files:**
- Create: `Crewluv/Services/ICloudStatusFetcher.swift`

Spec §5.1: the CloudKit read that the screen, the push handler and the background refresh each wrote out, now once. It picks the database and the owner as they did, reads the `pilot-status` record, and looks up the pilot's name for this partner by their own iCloud user record name. It says when there's no share, and when the share is gone. Task 8 tests it through a stand-in; CloudKit can't run in the harness, so the harness only compiles it.

- [ ] **Step 1: Write the read**

File: `Crewluv/Services/ICloudStatusFetcher.swift`

```swift
//
//  ICloudStatusFetcher.swift
//  CrewLuve
//
//  Reads the pilot's status record from iCloud
//

import CloudKit
import Foundation

/// What one iCloud read gives.
struct ICloudReading {
    let status: SharedPilotStatus
    /// The name the pilot set for this partner, or nil when there's none.
    let displayName: String?
    /// When CloudKit last saved the record, for the debug log of leg changes.
    let recordModifiedAt: Date?
}

/// Why an iCloud read gave no status.
nonisolated enum ICloudFetchError: Error, Equatable {
    /// No share has been accepted, and this isn't the pilot's own iCloud.
    case notConnected
    /// The record or its zone is gone because the pilot stopped sharing
    /// (`unknownItem`, `zoneNotFound`).
    case shareGone
    /// The record lacks the fields a status needs.
    case unreadableRecord
}

/// Reads the pilot's status from iCloud.
protocol ICloudStatusFetching {
    func fetch() async throws -> ICloudReading
}

/// Reads the pilot's `pilot-status` record: from the shared database, in the zone of the pilot
/// whose share was accepted, or from the private database when Crewluve runs on the pilot's own
/// iCloud. The screen, the push handler and the background refresh each used to read it this way.
final class ICloudStatusFetcher: ICloudStatusFetching {
    /// Made on first use, so nothing touches CloudKit before a read.
    private lazy var container = CKContainer(identifier: "iCloud.com.toddanderson.duty")
    /// This partner's iCloud user record name, which keys the pilot's names for each partner.
    private var userRecordName: String?

    func fetch() async throws -> ICloudReading {
        let database: CKDatabase
        let ownerName: String
        if UserDefaults.standard.string(forKey: "PilotDataSource") == "privateDB" {
            database = container.privateCloudDatabase
            ownerName = CKCurrentUserDefaultName
        } else {
            guard let storedOwner = UserDefaults.standard.string(forKey: "SharedZoneOwner") else {
                throw ICloudFetchError.notConnected
            }
            database = container.sharedCloudDatabase
            ownerName = storedOwner
        }

        let zoneID = CKRecordZone.ID(zoneName: "PartnerBeaconZone", ownerName: ownerName)
        let recordID = CKRecord.ID(recordName: "pilot-status", zoneID: zoneID)
        let record: CKRecord
        do {
            record = try await database.record(for: recordID)
        } catch let error as CKError where error.code == .unknownItem || error.code == .zoneNotFound {
            throw ICloudFetchError.shareGone
        }

        guard let status = SharedPilotStatus.from(record: record) else { throw ICloudFetchError.unreadableRecord }
        return ICloudReading(
            status: status,
            displayName: await displayName(in: status),
            recordModifiedAt: record.modificationDate
        )
    }

    /// The name the pilot set for this partner, looked up strictly by this partner's own iCloud
    /// user record name: falling back to another entry would show a name meant for someone else.
    private func displayName(in status: SharedPilotStatus) async -> String? {
        let names = status.displayNameByPartner
        guard !names.isEmpty else { return nil }
        if userRecordName == nil {
            userRecordName = try? await container.userRecordID().recordName
        }
        guard let name = userRecordName.flatMap({ names[$0] }), !name.isEmpty else { return nil }
        return name
    }
}
```

- [ ] **Step 2: Check it compiles**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 64 tests in 9 suites passed`.

- [ ] **Step 3: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/ICloudStatusFetcher.swift && git -C ~/Dev/Crewluv commit -q -m "refactor(crewluv): the iCloud read, in one place" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 8: The status source

**Files:**
- Create: `Crewluv/Services/PilotStatusSource.swift`, `Crewluv/Models/PilotReading.swift`, `Crewluv/Models/PartnerConnection.swift`
- Test: `CrewluvTests/PilotStatusSourceTests.swift`, `CrewluvTests/Helpers/PartnerCloudStandIns.swift`

Spec §5.1–§5.3 and decisions 7–10, 15 and 16: the one place that reads the status. It reads Crewlu Cloud once connected and iCloud otherwise, hands each new status to the alerts once, sends `since` back, forgets the key and the connection when sharing ends, and tries a key a reinstall left. Nothing uses it yet: Tasks 10 and 12 do.

- [ ] **Step 1: Write the stand-ins**

Crewlu Cloud, iCloud, the Keychain and the alerts, each answering from a script, and statuses made from a few fields.

File: `CrewluvTests/Helpers/PartnerCloudStandIns.swift`

```swift
//
//  PartnerCloudStandIns.swift
//  CrewluvTests
//
//  Stand-ins for Crewlu Cloud, iCloud, the Keychain and the alerts, and statuses made
//  from a few fields
//

import Foundation
@testable import Crewluv

/// The partner door, answering from a script and recording each call.
@MainActor
final class StandInPartnerDoor: PartnerDoor {
    /// The answers to `view`, in order. With none left, the door can't be reached.
    var viewAnswers: [Result<PartnerViewAnswer, PartnerDoorError>] = []
    /// The answers to `setPush`, in order. With none left, it says ok.
    var setPushAnswers: [Result<Void, PartnerDoorError>] = []
    /// While true, each `view` waits for `release()`.
    var holdsViews = false

    private(set) var views: [(key: String, since: String?)] = []
    private(set) var pushes: [(key: String, token: String, environment: PushEnvironment)] = []
    private var held: [CheckedContinuation<Void, Never>] = []

    func view(key: String, since: String?) async throws(PartnerDoorError) -> PartnerViewAnswer {
        views.append((key, since))
        if holdsViews {
            await withCheckedContinuation { held.append($0) }
        }
        guard !viewAnswers.isEmpty else { throw .unavailable }
        return try viewAnswers.removeFirst().get()
    }

    func setPush(key: String, token: String, environment: PushEnvironment) async throws(PartnerDoorError) {
        pushes.append((key, token, environment))
        guard !setPushAnswers.isEmpty else { return }
        try setPushAnswers.removeFirst().get()
    }

    /// Lets every held `view` go on.
    func release() {
        held.forEach { $0.resume() }
        held.removeAll()
    }
}

/// iCloud, answering from a script and counting reads.
@MainActor
final class StandInICloud: ICloudStatusFetching {
    /// The reads' results, in order. With none left, there's no share.
    var results: [Result<ICloudReading, any Error>] = []
    private(set) var fetches = 0

    func fetch() async throws -> ICloudReading {
        fetches += 1
        guard !results.isEmpty else { throw ICloudFetchError.notConnected }
        return try results.removeFirst().get()
    }
}

/// The Keychain, in memory.
@MainActor
final class InMemoryDeviceKeyStore: DeviceKeyStore {
    var key: String?

    func deviceKey() -> String? {
        key
    }

    func save(deviceKey: String) -> Bool {
        key = deviceKey
        return true
    }

    func forgetDeviceKey() {
        key = nil
    }
}

/// The alerts, recording what they're handed.
actor RecordingNotifier: StatusNotifying {
    private(set) var evaluations: [(status: SharedPilotStatus, pilotName: String)] = []

    func evaluateChanges(
        old: SharedPilotStatus?,
        new: SharedPilotStatus,
        pilotName: String,
        newEffectiveDelay: Int?,
        resolvedHomeArrivalTime: Date?
    ) {
        evaluations.append((new, pilotName))
    }
}

/// Counts what a test is told.
@MainActor
final class Counter {
    var count = 0
}

/// Summaries, door answers and iCloud readings for tests, made from a few fields.
@MainActor
enum Make {
    static let partnerA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    static let key = String(repeating: "5e", count: 32)

    /// A summary with the four fields every summary has, and `fields`.
    static func summary(lastUpdated: TimeInterval = 1_792_605_600, _ fields: [String: Any] = [:]) throws -> CloudSummary {
        var json: [String: Any] = ["pilotId": "pilot", "pilotFirstName": "Alex", "lastUpdated": lastUpdated, "appVersion": "3.0"]
        json.merge(fields) { $1 }
        return try CloudSummary.decoder().decode(CloudSummary.self, from: JSONSerialization.data(withJSONObject: json))
    }

    /// partner_view's answer with a summary for partner A.
    static func answer(updatedAt: String, _ summary: CloudSummary) -> Result<PartnerViewAnswer, PartnerDoorError> {
        .success(PartnerViewAnswer(partnerID: partnerA, updatedAt: updatedAt, content: .summary(summary)))
    }

    static func unchanged(updatedAt: String) -> Result<PartnerViewAnswer, PartnerDoorError> {
        .success(PartnerViewAnswer(partnerID: partnerA, updatedAt: updatedAt, content: .unchanged))
    }

    static let noSummaryYet: Result<PartnerViewAnswer, PartnerDoorError> =
        .success(PartnerViewAnswer(partnerID: partnerA, updatedAt: nil, content: .noSummaryYet))

    /// An iCloud read of a record made at `lastUpdated`.
    static func iCloud(lastUpdated: TimeInterval, displayName: String? = nil) throws -> ICloudReading {
        ICloudReading(
            status: try summary(lastUpdated: lastUpdated).pilotStatus(partnerID: partnerA, at: .now),
            displayName: displayName,
            recordModifiedAt: nil
        )
    }
}
```

- [ ] **Step 2: Write the failing tests**

File: `CrewluvTests/PilotStatusSourceTests.swift`

```swift
//
//  PilotStatusSourceTests.swift
//  CrewluvTests
//
//  The one place that reads the pilot's status, from iCloud or Crewlu Cloud
//  (partner links piece 4 spec §5.1–§5.3).
//

import Foundation
import Testing
@testable import Crewluv

@MainActor
final class PilotStatusSourceTests {
    private let defaultsName = "PilotStatusSourceTests.\(UUID().uuidString)"
    private let defaults: UserDefaults
    private let door = StandInPartnerDoor()
    private let iCloud = StandInICloud()
    private let keys = InMemoryDeviceKeyStore()
    private let notifier = RecordingNotifier()
    private let iCloudResets = Counter()

    init() throws {
        defaults = try #require(UserDefaults(suiteName: defaultsName))
    }

    deinit {
        defaults.removePersistentDomain(forName: defaultsName)
    }

    private func makeSource() -> PilotStatusSource {
        PilotStatusSource(
            iCloud: iCloud,
            door: door,
            keys: keys,
            defaults: defaults,
            notifier: notifier,
            iCloudShareEnded: { [iCloudResets] in iCloudResets.count += 1 }
        )
    }

    /// A device on Crewlu Cloud as partner A.
    private func connectedSource() -> PilotStatusSource {
        defaults.set(Make.partnerA, forKey: "partnerCloud.partnerID")
        keys.key = Make.key
        return makeSource()
    }

    // MARK: - iCloud

    @Test func test_iCloud_newStatus_becomesTheReading_andAlertsOnce() async throws {
        iCloud.results = [.success(try Make.iCloud(lastUpdated: 1)), .success(try Make.iCloud(lastUpdated: 1))]
        let source = makeSource()

        #expect(await source.refresh() == .newStatus)
        #expect(source.reading?.lastUpdated == Date(timeIntervalSince1970: 1))
        #expect(await source.refresh() == .unchanged)
        #expect(await notifier.evaluations.count == 1)
        #expect(await notifier.evaluations.first?.pilotName == "Alex")
        #expect(!source.isOnCrewluCloud)
    }

    @Test func test_iCloud_changedStatus_alertsAgain() async throws {
        iCloud.results = [.success(try Make.iCloud(lastUpdated: 1)), .success(try Make.iCloud(lastUpdated: 2))]
        let source = makeSource()

        #expect(await source.refresh() == .newStatus)
        #expect(await source.refresh() == .newStatus)
        #expect(await notifier.evaluations.count == 2)
    }

    @Test func test_displayName_titlesTheAlerts_andIsSavedForThem() async throws {
        iCloud.results = [
            .success(try Make.iCloud(lastUpdated: 1, displayName: "Dad")),
            .success(try Make.iCloud(lastUpdated: 2)),
        ]
        let source = makeSource()

        _ = await source.refresh()
        #expect(await notifier.evaluations.last?.pilotName == "Dad")
        #expect(defaults.string(forKey: "ResolvedPilotDisplayName") == "Dad")
        _ = await source.refresh()
        #expect(await notifier.evaluations.last?.pilotName == "Alex")
        #expect(defaults.string(forKey: "ResolvedPilotDisplayName") == nil)
    }

    @Test func test_iCloud_noShare_isNotConnected() async {
        iCloud.results = [.failure(ICloudFetchError.notConnected)]
        let source = makeSource()

        #expect(await source.refresh() == .notConnected)
        #expect(source.reading == nil)
        #expect(await notifier.evaluations.isEmpty)
    }

    @Test func test_iCloud_shareGone_endsSharing() async throws {
        iCloud.results = [.success(try Make.iCloud(lastUpdated: 1)), .failure(ICloudFetchError.shareGone)]
        let source = makeSource()

        _ = await source.refresh()
        #expect(await source.refresh() == .sharingEnded)
        #expect(source.reading == nil)
        #expect(iCloudResets.count == 1)
    }

    @Test func test_iCloudReset_forgetsAnICloudReading() async throws {
        iCloud.results = [.success(try Make.iCloud(lastUpdated: 1))]
        let source = makeSource()
        _ = await source.refresh()

        source.forgetICloudReading()
        #expect(source.reading == nil)
    }

    @Test func test_iCloudReset_leavesACrewluCloudReading() async throws {
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary())]
        let source = connectedSource()
        _ = await source.refresh()

        source.forgetICloudReading()
        #expect(source.reading != nil)
    }

    @Test func test_iCloud_otherFailure_isFailed_withItsMessage() async {
        iCloud.results = [.failure(URLError(.notConnectedToInternet))]

        #expect(await makeSource().refresh() == .failed(URLError(.notConnectedToInternet).localizedDescription))
    }

    // MARK: - Crewlu Cloud

    @Test func test_crewluCloud_summary_becomesTheReading_andItsTimeGoesBackAsSince() async throws {
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary()), Make.unchanged(updatedAt: "t1")]
        let source = connectedSource()

        #expect(await source.refresh() == .newStatus)
        #expect(await source.refresh() == .unchanged)
        #expect(door.views.map(\.key) == [Make.key, Make.key])
        #expect(door.views.map(\.since) == [nil, "t1"])
        #expect(await notifier.evaluations.count == 1)
        #expect(source.isOnCrewluCloud)
        #expect(iCloud.fetches == 0)
    }

    @Test func test_crewluCloud_alertsWithThisPartnersNameAndQuickStatus() async throws {
        let summary = try Make.summary([
            "displayNameByPartner": [Make.partnerA: "Dad"],
            "quickStatusByPartner": [Make.partnerA: ["status": "Call Me", "icon": "phone.fill"]],
        ])
        door.viewAnswers = [Make.answer(updatedAt: "t1", summary)]

        _ = await connectedSource().refresh()
        let evaluation = try #require(await notifier.evaluations.first)
        #expect(evaluation.pilotName == "Dad")
        #expect(evaluation.status.quickStatus == "Call Me")
        #expect(defaults.string(forKey: "ResolvedPilotDisplayName") == "Dad")
    }

    @Test func test_crewluCloud_beforeTheFirstSummary_hasNoStatusYet() async {
        door.viewAnswers = [Make.noSummaryYet]
        let source = connectedSource()

        #expect(await source.refresh() == .noStatusYet)
        #expect(source.reading == nil)
        #expect(source.isOnCrewluCloud)
        #expect(await notifier.evaluations.isEmpty)
    }

    @Test func test_crewluCloud_sharingEnded_forgetsTheKeyAndTheConnection() async throws {
        door.viewAnswers = [
            Make.answer(updatedAt: "t1", try Make.summary(["displayNameByPartner": [Make.partnerA: "Dad"]])),
            .failure(.refused(.sharingEnded)),
        ]
        let source = connectedSource()
        _ = await source.refresh()
        defaults.set(Data([1]), forKey: "LastSeenPilotSnapshot")

        #expect(await source.refresh() == .sharingEnded)
        #expect(keys.key == nil)
        #expect(!source.isOnCrewluCloud)
        #expect(defaults.string(forKey: "partnerCloud.partnerID") == nil)
        #expect(source.reading == nil)
        #expect(defaults.string(forKey: "ResolvedPilotDisplayName") == nil)
        #expect(defaults.data(forKey: "LastSeenPilotSnapshot") == nil)
        #expect(iCloudResets.count == 0)
    }

    @Test func test_crewluCloud_unreachable_isFailed_andTheNextReadAsksForEverything() async throws {
        door.viewAnswers = [
            Make.answer(updatedAt: "t1", try Make.summary()),
            .failure(.unavailable),
            Make.answer(updatedAt: "t1", try Make.summary()),
        ]
        let source = connectedSource()

        _ = await source.refresh()
        #expect(await source.refresh() == .failed("No connection to Crewlu Cloud"))
        #expect(await source.refresh() == .unchanged)
        #expect(door.views.map(\.since) == [nil, "t1", nil])
        #expect(keys.key == Make.key)
        #expect(await notifier.evaluations.count == 1)
    }

    @Test func test_crewluCloud_otherRefusal_isFailed_andKeepsTheKey() async {
        door.viewAnswers = [.failure(.refused(.invalidInput))]
        let source = connectedSource()

        #expect(await source.refresh() == .failed("No connection to Crewlu Cloud"))
        #expect(keys.key == Make.key)
        #expect(source.isOnCrewluCloud)
    }

    @Test func test_crewluCloud_withoutAKey_isNotConnected() async {
        defaults.set(Make.partnerA, forKey: "partnerCloud.partnerID")
        let source = makeSource()

        #expect(await source.refresh() == .notConnected)
        #expect(!source.isOnCrewluCloud)
        #expect(door.views.isEmpty)
    }

    // MARK: - A Key Left by a Reinstall

    @Test func test_leftoverKey_withASummary_connects() async throws {
        keys.key = Make.key
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary())]
        let source = makeSource()

        #expect(await source.refresh() == .newStatus)
        #expect(source.crewluCloudPartnerID == Make.partnerA)
        #expect(defaults.string(forKey: "partnerCloud.partnerID") == Make.partnerA)
        #expect(door.views.map(\.since) == [nil])
        #expect(iCloud.fetches == 0)
    }

    @Test func test_leftoverKey_sharingEnded_isForgotten_andICloudIsRead() async throws {
        keys.key = Make.key
        door.viewAnswers = [.failure(.refused(.sharingEnded))]
        iCloud.results = [.success(try Make.iCloud(lastUpdated: 1))]
        let source = makeSource()

        #expect(await source.refresh() == .newStatus)
        #expect(keys.key == nil)
        #expect(!source.isOnCrewluCloud)
        #expect(iCloud.fetches == 1)
    }

    @Test func test_leftoverKey_unreachable_isKept_andTriedAgainNextTime() async {
        keys.key = Make.key
        let source = makeSource()

        #expect(await source.refresh() == .notConnected)
        #expect(keys.key == Make.key)
        #expect(iCloud.fetches == 1)
        _ = await source.refresh()
        #expect(door.views.count == 2)
    }

    @Test(arguments: [("SharedZoneOwner", "_owner"), ("PilotDataSource", "privateDB")])
    func test_leftoverKey_beforeTheFirstSummary_withICloud_staysOnICloud(setting: String, value: String) async throws {
        keys.key = Make.key
        defaults.set(value, forKey: setting)
        door.viewAnswers = [Make.noSummaryYet]
        iCloud.results = [.success(try Make.iCloud(lastUpdated: 1))]
        let source = makeSource()

        #expect(await source.refresh() == .newStatus)
        #expect(!source.isOnCrewluCloud)
        #expect(iCloud.fetches == 1)
    }

    @Test func test_leftoverKey_beforeTheFirstSummary_withoutICloud_connects() async {
        keys.key = Make.key
        door.viewAnswers = [Make.noSummaryYet]
        let source = makeSource()

        #expect(await source.refresh() == .noStatusYet)
        #expect(source.isOnCrewluCloud)
        #expect(iCloud.fetches == 0)
    }

    // MARK: - Refreshes and the Screen

    @Test func test_overlappingRefreshes_shareOneRead() async throws {
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary())]
        door.holdsViews = true
        let source = connectedSource()

        async let first = source.refresh()
        async let second = source.refresh()
        while door.views.isEmpty {
            await Task.yield()
        }
        door.release()

        #expect(await [first, second] == [.newStatus, .newStatus])
        #expect(door.views.count == 1)
    }

    @Test func test_theScreenHearsOfNewStatusesAndOfSharingEnding() async throws {
        door.viewAnswers = [
            Make.answer(updatedAt: "t1", try Make.summary()),
            Make.unchanged(updatedAt: "t1"),
            .failure(.refused(.sharingEnded)),
        ]
        let source = connectedSource()
        let heard = Counter()
        let observer = NotificationCenter.default.addObserver(forName: .pilotReadingDidChange, object: source, queue: nil) { _ in
            MainActor.assumeIsolated { heard.count += 1 }
        }
        defer { NotificationCenter.default.removeObserver(observer) }

        _ = await source.refresh()
        #expect(heard.count == 1)
        _ = await source.refresh()
        #expect(heard.count == 1)
        _ = await source.refresh()
        #expect(heard.count == 2)
    }

    // MARK: - The Reading

    @Test func test_reading_fromCrewluCloud_changesWhenItsQuickStatusExpires() throws {
        let expiry = Date(timeIntervalSince1970: 1_792_609_200)
        let summary = try Make.summary([
            "quickStatusByPartner": [Make.partnerA: ["status": "Call Me", "icon": "phone.fill", "expiry": expiry.timeIntervalSince1970]],
        ])
        let reading = PilotReading.crewluCloud(summary, partnerID: Make.partnerA, updatedAt: "t1")

        #expect(reading.change(after: expiry.addingTimeInterval(-60)) == expiry)
        #expect(reading.status(at: expiry.addingTimeInterval(-60)).quickStatus == "Call Me")
        #expect(reading.status(at: expiry).quickStatus == nil)
        #expect(reading.change(after: expiry) == nil)
    }

    @Test func test_reading_fromICloud_neverChangesByItself() throws {
        let reading = PilotReading.iCloud(try Make.iCloud(lastUpdated: 1, displayName: "Dad"))

        #expect(reading.change(after: Date(timeIntervalSince1970: 0)) == nil)
        #expect(reading.displayName == "Dad")
        #expect(reading.lastUpdated == Date(timeIntervalSince1970: 1))
    }
}
```

- [ ] **Step 3: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `cannot find type 'StatusNotifying' in scope` or `cannot find 'PilotStatusSource' in scope`, depending on which file the compiler reaches first.

- [ ] **Step 4: Write the connection**

File: `Crewluv/Models/PartnerConnection.swift`

```swift
//
//  PartnerConnection.swift
//  CrewLuve
//
//  How this device follows its pilot, as kept in its settings
//

import Foundation

/// How this device follows its pilot, as kept in its settings: through Crewlu Cloud once it has a
/// partner id there, and through iCloud otherwise, which decides by its own settings as before.
struct PartnerConnection {
    static let partnerIDKey = "partnerCloud.partnerID"

    let defaults: UserDefaults

    /// This device's partner id on Crewlu Cloud, or nil while it follows its pilot through iCloud.
    var partnerID: String? {
        get { defaults.string(forKey: Self.partnerIDKey) }
        nonmutating set { defaults.set(newValue, forKey: Self.partnerIDKey) }
    }

    /// Whether an iCloud share was accepted, or Crewluve runs on the pilot's own iCloud.
    var hasICloudShare: Bool {
        defaults.string(forKey: "SharedZoneOwner") != nil || defaults.string(forKey: "PilotDataSource") == "privateDB"
    }
}
```

- [ ] **Step 5: Write the reading**

File: `Crewluv/Models/PilotReading.swift`

```swift
//
//  PilotReading.swift
//  CrewLuve
//
//  What was last read of the pilot's status, from iCloud or Crewlu Cloud
//

import Foundation

/// What `PilotStatusSource` last read: the iCloud record, or Crewlu Cloud's summary for this
/// partner. The screen resolves it at any moment, because a Crewlu Cloud quick status can give way
/// to another as time passes.
enum PilotReading {
    case iCloud(ICloudReading)
    /// The summary, the partner it was trimmed for, and when it last changed, as the door said.
    case crewluCloud(CloudSummary, partnerID: String, updatedAt: String?)

    /// The pilot's status at `now`, before the screen resolves it against the legs.
    func status(at now: Date) -> SharedPilotStatus {
        switch self {
        case .iCloud(let reading): reading.status
        case .crewluCloud(let summary, let partnerID, _): summary.pilotStatus(partnerID: partnerID, at: now)
        }
    }

    /// The name the pilot set for this partner, or nil when there's none.
    var displayName: String? {
        switch self {
        case .iCloud(let reading): reading.displayName
        case .crewluCloud(let summary, let partnerID, _): summary.displayName(for: partnerID)
        }
    }

    /// When the status changes by itself: when the quick status shown at `now` expires. iCloud's
    /// one quick status simply disappears then, so it never needs a wake-up.
    func change(after now: Date) -> Date? {
        guard case .crewluCloud(let summary, let partnerID, _) = self else { return nil }
        return summary.quickStatusChange(for: partnerID, after: now)
    }

    /// When CrewLu made the status.
    var lastUpdated: Date {
        switch self {
        case .iCloud(let reading): reading.status.lastUpdated
        case .crewluCloud(let summary, _, _): summary.lastUpdated
        }
    }

    /// When CloudKit last saved the record, for iCloud's debug log of leg changes.
    var recordModifiedAt: Date? {
        guard case .iCloud(let reading) = self else { return nil }
        return reading.recordModifiedAt
    }
}
```

- [ ] **Step 6: Write the source**

File: `Crewluv/Services/PilotStatusSource.swift`

```swift
//
//  PilotStatusSource.swift
//  CrewLuve
//
//  The one place that reads the pilot's status
//

import Foundation
import Observation

extension Notification.Name {
    /// The source has a new reading, or none any more because sharing ended.
    static let pilotReadingDidChange = Notification.Name("pilotReadingDidChange")
}

/// How a refresh ended.
nonisolated enum RefreshOutcome: Equatable, Sendable {
    /// A status the source hadn't read before.
    case newStatus
    /// The same status as last time.
    case unchanged
    /// On Crewlu Cloud, but the pilot's CrewLu hasn't sent a status yet.
    case noStatusYet
    /// No accepted share, and no Crewlu Cloud connection.
    case notConnected
    /// The pilot stopped sharing with this device, which has forgotten the connection.
    case sharingEnded
    /// The read failed. The message says why, for the sync line.
    case failed(String)
}

/// What hears of each new status: the alerts.
nonisolated protocol StatusNotifying: Sendable {
    func evaluateChanges(
        old: SharedPilotStatus?,
        new: SharedPilotStatus,
        pilotName: String,
        newEffectiveDelay: Int?,
        resolvedHomeArrivalTime: Date?
    ) async
}

extension StatusChangeNotifier: StatusNotifying {}

/// The one place that reads the pilot's status, whoever asks: the screen, a push or the background
/// refresh (partner links piece 4 spec §5.1). It reads Crewlu Cloud once this device is connected
/// there, and iCloud otherwise, as before. Each new status goes to the alerts once, from here.
@Observable
final class PilotStatusSource {
    static let shared = PilotStatusSource()

    /// What was last read, or nil before the first read and after sharing ends.
    private(set) var reading: PilotReading?
    /// This device's partner id on Crewlu Cloud, or nil while it follows its pilot through iCloud.
    private(set) var crewluCloudPartnerID: String?

    var isOnCrewluCloud: Bool { crewluCloudPartnerID != nil }

    @ObservationIgnored private let iCloud: ICloudStatusFetching
    @ObservationIgnored private let door: PartnerDoor
    @ObservationIgnored private let keys: DeviceKeyStore
    @ObservationIgnored private let connection: PartnerConnection
    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let notifier: StatusNotifying
    @ObservationIgnored private let iCloudShareEnded: @MainActor () -> Void
    /// The last Crewlu Cloud answer's `updatedAt`, sent back as `since` within this run of the app.
    /// The first read after a launch sends none, since the app doesn't keep the summary.
    @ObservationIgnored private var since: String?
    @ObservationIgnored private var refreshInFlight: Task<RefreshOutcome, Never>?

    /// Where the alerts' title name is kept, as before.
    private static let displayNameKey = "ResolvedPilotDisplayName"
    /// What the alerts compare against. Sharing ending forgets it, as `resetShareData()` does.
    private static let snapshotKey = "LastSeenPilotSnapshot"
    private static let unreachable = "No connection to Crewlu Cloud"

    init(
        iCloud: ICloudStatusFetching = ICloudStatusFetcher(),
        door: PartnerDoor = LivePartnerDoor(),
        keys: DeviceKeyStore = KeychainDeviceKeyStore(),
        defaults: UserDefaults = .standard,
        notifier: StatusNotifying = StatusChangeNotifier.shared,
        iCloudShareEnded: @escaping @MainActor () -> Void = { CloudKitShareManager.shared.resetShareData() }
    ) {
        self.iCloud = iCloud
        self.door = door
        self.keys = keys
        self.defaults = defaults
        self.notifier = notifier
        self.iCloudShareEnded = iCloudShareEnded
        connection = PartnerConnection(defaults: defaults)
        crewluCloudPartnerID = connection.partnerID
    }

    // MARK: - Refreshing

    /// Reads the status from wherever this device follows its pilot. A refresh asked for while
    /// another is under way gets that one's outcome.
    func refresh() async -> RefreshOutcome {
        if let refreshInFlight {
            return await refreshInFlight.value
        }
        let read = Task { await self.read() }
        refreshInFlight = read
        let outcome = await read.value
        refreshInFlight = nil
        return outcome
    }

    /// The pilot stopped sharing with this device: forget its key and the connection, as today's
    /// iCloud reset forgets the share (spec §7.6).
    func endSharing() {
        keys.forgetDeviceKey()
        connection.partnerID = nil
        crewluCloudPartnerID = nil
        since = nil
        defaults.removeObject(forKey: Self.displayNameKey)
        defaults.removeObject(forKey: Self.snapshotKey)
        show(nil)
    }

    /// iCloud's share data was reset, by Reset Share Data or the share ending: an iCloud reading
    /// is no longer the pilot's status.
    func forgetICloudReading() {
        guard case .iCloud? = reading else { return }
        show(nil)
    }

    private func read() async -> RefreshOutcome {
        if isOnCrewluCloud {
            return await readCrewluCloud()
        }
        if let outcome = await adoptLeftoverKey() {
            return outcome
        }
        return await readICloud()
    }

    // MARK: - Crewlu Cloud

    private func readCrewluCloud() async -> RefreshOutcome {
        guard let key = keys.deviceKey() else {
            connection.partnerID = nil
            crewluCloudPartnerID = nil
            return .notConnected
        }
        do {
            return await take(try await door.view(key: key, since: since))
        } catch .refused(.sharingEnded) {
            endSharing()
            return .sharingEnded
        } catch {
            since = nil
            return .failed(Self.unreachable)
        }
    }

    /// A key with no Crewlu Cloud connection saved is what a reinstall leaves: iOS keeps an app's
    /// Keychain items, not its settings (spec §5.3). It's tried on every refresh until Crewlu
    /// Cloud answers. Nil carries on with iCloud.
    private func adoptLeftoverKey() async -> RefreshOutcome? {
        guard let key = keys.deviceKey() else { return nil }
        let answer: PartnerViewAnswer
        do {
            answer = try await door.view(key: key, since: nil)
        } catch .refused(.sharingEnded) {
            keys.forgetDeviceKey()
            return nil
        } catch {
            return nil
        }
        if case .noSummaryYet = answer.content, connection.hasICloudShare {
            return nil
        }
        connection.partnerID = answer.partnerID
        crewluCloudPartnerID = answer.partnerID
        return await take(answer)
    }

    /// Takes partner_view's answer. A summary newer than the one already read becomes the reading.
    private func take(_ answer: PartnerViewAnswer) async -> RefreshOutcome {
        switch answer.content {
        case .unchanged:
            return .unchanged
        case .noSummaryYet:
            return .noStatusYet
        case .summary(let summary):
            since = answer.updatedAt
            if case .crewluCloud(_, _, let updatedAt)? = reading, updatedAt != nil, updatedAt == answer.updatedAt {
                return .unchanged
            }
            return await adopt(.crewluCloud(summary, partnerID: answer.partnerID, updatedAt: answer.updatedAt))
        }
    }

    // MARK: - iCloud

    private func readICloud() async -> RefreshOutcome {
        do {
            let fetched = try await iCloud.fetch()
            if let reading, reading.lastUpdated == fetched.status.lastUpdated {
                return .unchanged
            }
            return await adopt(.iCloud(fetched))
        } catch ICloudFetchError.notConnected {
            return .notConnected
        } catch ICloudFetchError.shareGone {
            show(nil)
            iCloudShareEnded()
            return .sharingEnded
        } catch {
            return .failed(error.localizedDescription)
        }
    }

    // MARK: - A New Reading

    /// Makes `newReading` the reading, tells the screen, and hands it to the alerts once.
    private func adopt(_ newReading: PilotReading) async -> RefreshOutcome {
        let previous = reading
        if let name = newReading.displayName {
            defaults.set(name, forKey: Self.displayNameKey)
        } else {
            defaults.removeObject(forKey: Self.displayNameKey)
        }
        logLegChanges(from: previous, to: newReading)
        show(newReading)
        await alert(newReading)
        return .newStatus
    }

    private func show(_ newReading: PilotReading?) {
        reading = newReading
        NotificationCenter.default.post(name: .pilotReadingDidChange, object: self)
    }

    /// Hands a new status to the alerts, with what they compare: the effective delay and the
    /// resolved home arrival, worked out as the screen used to.
    private func alert(_ reading: PilotReading) async {
        let now = Date()
        let status = reading.status(at: now)
        let homeArrival = TripStateResolver.resolveHomeArrival(
            legs: status.tripLegs, homeAirportCode: status.homeAirportCode, at: now
        )?.arrivalTime
        await notifier.evaluateChanges(
            old: nil,
            new: status,
            pilotName: reading.displayName ?? status.pilotFirstName,
            newEffectiveDelay: status.effectiveFlightDelayMinutes,
            resolvedHomeArrivalTime: homeArrival ?? status.homeArrivalTime
        )
    }

    // MARK: - Diagnostic Logging

    /// Logs legs that appeared or disappeared between two readings, to catch disappearing legs.
    private func logLegChanges(from old: PilotReading?, to new: PilotReading) {
        let now = Date()
        let oldLegs = old?.status(at: now).tripLegs ?? []
        let newLegs = new.status(at: now).tripLegs
        let oldIds = Set(oldLegs.map(\.id))
        let newIds = Set(newLegs.map(\.id))
        guard oldIds != newIds else { return }

        debugLog("[TripLegDiff] === LEG CHANGE DETECTED ===")
        debugLog("[TripLegDiff] Count: \(oldLegs.count) → \(newLegs.count)")
        debugLog("[TripLegDiff] Record mod date: \(new.recordModifiedAt?.formatted(date: .abbreviated, time: .standard) ?? "unknown")")
        for leg in oldLegs where !newIds.contains(leg.id) {
            debugLog("[TripLegDiff] REMOVED: \(Self.describe(leg))")
        }
        for leg in newLegs where !oldIds.contains(leg.id) {
            debugLog("[TripLegDiff] ADDED: \(Self.describe(leg))")
        }
    }

    private static func describe(_ leg: TripLeg) -> String {
        let route = leg.type == .flight
            ? "\(leg.departureAirport ?? "?")→\(leg.arrivalAirport ?? "?")"
            : leg.airportCode ?? "?"
        let trip = leg.tripId.map { "trip:\($0)" } ?? "standalone"
        let start = leg.startTime.formatted(date: .abbreviated, time: .shortened)
        let end = leg.endTime.formatted(date: .abbreviated, time: .shortened)
        return "[\(leg.type.rawValue)] \(route) (\(trip)) \(start)–\(end)"
    }
}
```

- [ ] **Step 7: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 88 tests in 10 suites passed`.

- [ ] **Step 8: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PilotStatusSource.swift Crewluv/Models/PilotReading.swift Crewluv/Models/PartnerConnection.swift CrewluvTests/PilotStatusSourceTests.swift CrewluvTests/Helpers/PartnerCloudStandIns.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): one status source reads iCloud or Crewlu Cloud and alerts once per new status" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 9: The 60-second timer

**Files:**
- Create: `Crewluv/Services/RepeatingRefresh.swift`
- Test: `CrewluvTests/RepeatingRefreshTests.swift`

Spec §5.5 and decision 12: a loop that runs an action every 60 seconds until stopped. The tests drive it with a clock they tick by hand.

- [ ] **Step 1: Write the failing tests**

File: `CrewluvTests/RepeatingRefreshTests.swift`

```swift
//
//  RepeatingRefreshTests.swift
//  CrewluvTests
//
//  The 60-second check's timer (partner links piece 4 spec §5.5)
//

import Foundation
import Testing
@testable import Crewluv

@MainActor
struct RepeatingRefreshTests {

    @Test func test_start_runsTheActionAfterEachInterval() async {
        let clock = HandClock()
        let runs = Counter()
        let check = RepeatingRefresh(sleep: clock.sleep)

        check.start { runs.count += 1 }
        await until { clock.sleeps.count == 1 }
        #expect(runs.count == 0)
        clock.tick()
        await until { runs.count == 1 }
        clock.tick()
        await until { runs.count == 2 }

        #expect(clock.sleeps.allSatisfy { $0 == .seconds(60) })
        #expect(check.isRunning)
        check.stop()
    }

    @Test func test_stop_endsTheChecks() async {
        let clock = HandClock()
        let runs = Counter()
        let check = RepeatingRefresh(sleep: clock.sleep)

        check.start { runs.count += 1 }
        await until { clock.sleeps.count == 1 }
        check.stop()
        clock.tick()
        for _ in 0..<100 {
            await Task.yield()
        }

        #expect(runs.count == 0)
        #expect(!check.isRunning)
    }

    @Test func test_startAgain_replacesTheChecks() async {
        let clock = HandClock()
        let first = Counter()
        let second = Counter()
        let check = RepeatingRefresh(sleep: clock.sleep)

        check.start { first.count += 1 }
        await until { clock.sleeps.count == 1 }
        check.start { second.count += 1 }
        await until { clock.sleeps.count == 2 && clock.waitingCount == 1 }
        clock.tick()
        await until { second.count == 1 }
        for _ in 0..<100 {
            await Task.yield()
        }

        #expect(first.count == 0)
        check.stop()
    }

    /// Yields until `condition` holds, failing the test if it never does.
    private func until(_ condition: () -> Bool, sourceLocation: SourceLocation = #_sourceLocation) async {
        for _ in 0..<10_000 where !condition() {
            await Task.yield()
        }
        #expect(condition(), "never happened", sourceLocation: sourceLocation)
    }
}

/// A clock whose sleeps end when the test says: each `tick()` ends the oldest sleep, and a
/// cancelled sleep ends by throwing, as `Task.sleep` does.
@MainActor
private final class HandClock {
    private(set) var sleeps: [Duration] = []
    private var waiting: [(id: UUID, continuation: CheckedContinuation<Void, any Error>)] = []

    /// How many sleeps are waiting for a tick.
    var waitingCount: Int { waiting.count }

    func sleep(_ duration: Duration) async throws {
        sleeps.append(duration)
        let id = UUID()
        try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, any Error>) in
                self.wait(id, continuation)
            }
        } onCancel: {
            Task { @MainActor in self.cancel(id) }
        }
    }

    func tick() {
        guard !waiting.isEmpty else { return }
        waiting.removeFirst().continuation.resume()
    }

    private func wait(_ id: UUID, _ continuation: CheckedContinuation<Void, any Error>) {
        if Task.isCancelled {
            continuation.resume(throwing: CancellationError())
        } else {
            waiting.append((id: id, continuation: continuation))
        }
    }

    private func cancel(_ id: UUID) {
        guard let index = waiting.firstIndex(where: { $0.id == id }) else { return }
        waiting.remove(at: index).continuation.resume(throwing: CancellationError())
    }
}
```

- [ ] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `cannot find 'RepeatingRefresh' in scope`.

- [ ] **Step 3: Write the timer**

File: `Crewluv/Services/RepeatingRefresh.swift`

```swift
//
//  RepeatingRefresh.swift
//  CrewLuve
//
//  Runs an action every so often, while started
//

import Foundation

/// Runs an action every `interval` while started: the 60-second check while the app is in front
/// and on Crewlu Cloud (partner links piece 4 spec §5.5).
final class RepeatingRefresh {
    typealias Sleep = (Duration) async throws -> Void

    private let interval: Duration
    private let sleep: Sleep
    private var task: Task<Void, Never>?

    init(interval: Duration = .seconds(60), sleep: @escaping Sleep = { try await Task.sleep(for: $0) }) {
        self.interval = interval
        self.sleep = sleep
    }

    var isRunning: Bool { task != nil }

    /// Runs `action` after each `interval` until `stop()`, in place of anything started before.
    func start(_ action: @escaping () async -> Void) {
        task?.cancel()
        task = Task { [interval, sleep] in
            while true {
                do {
                    try await sleep(interval)
                } catch {
                    return
                }
                guard !Task.isCancelled else { return }
                await action()
            }
        }
    }

    func stop() {
        task?.cancel()
        task = nil
    }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 91 tests in 11 suites passed`.

- [ ] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/RepeatingRefresh.swift CrewluvTests/RepeatingRefreshTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): a timer for checking every 60 seconds" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 10: The status screen reads through the source

**Files:**
- Modify: `Crewluv/Services/PartnerStatusReceiver.swift`, `Crewluv/Views/Welcome/ContentView.swift`

Spec §5.1, §5.4 and §5.5, and decisions 5, 7, 11, 12, 16 and 17. The screen's model asks the source instead of reading CloudKit itself, and keeps its messages and its iCloud discovery. It shows what a push or the background refresh read when the source says so. It re-resolves at leg changes, as before, and when a quick status expires. It runs the 60-second check while the app is in front. The harness compiles `PartnerStatusReceiver`; `ContentView` waits for Task 13.

- [ ] **Step 1: Read through the source**

The header, the stored properties and `init`; the push observer becomes the source's; the reset forgets the source's iCloud reading; `checkForSharedData` asks the source; `refresh`, `hasRecordedConnection` and `resolveAndSchedule` follow; the leg log moves to the source (Task 8), and the 60-second check takes its place.

11 replacements, in order, in `Crewluv/Services/PartnerStatusReceiver.swift`:

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift
//  PartnerStatusReceiver.swift
//  CrewLuve
//
//  Receives shared pilot status from CloudKit
//

import Foundation
```

with:

```swift
//  PartnerStatusReceiver.swift
//  CrewLuve
//
//  The status screen's model: the pilot's status as PilotStatusSource reads it
//

import Foundation
```

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift
    var dataSource: DataSource? = nil

    private let container = CKContainer(identifier: "iCloud.com.toddanderson.duty")
    private var sharedDatabase: CKDatabase { container.sharedCloudDatabase }
    private var privateDatabase: CKDatabase { container.privateCloudDatabase }
    private let dataSourceKey = "PilotDataSource"
    private var rawPilotStatus: SharedPilotStatus?
    private var transitionTask: Task<Void, Never>?
    private var cachedUserRecordName: String?
    private var resolvedDisplayName: String?

    init(shareManager: CloudKitShareManager) {
        // Restore persisted data source
        if let raw = UserDefaults.standard.string(forKey: dataSourceKey),
           let source = DataSource(rawValue: raw) {
```

with:

```swift
    var dataSource: DataSource? = nil

    private let container = CKContainer(identifier: "iCloud.com.toddanderson.duty")
    private var privateDatabase: CKDatabase { container.privateCloudDatabase }
    private let dataSourceKey = "PilotDataSource"
    private let statusSource: PilotStatusSource
    private let periodicCheck = RepeatingRefresh()
    private var transitionTask: Task<Void, Never>?

    init(shareManager: CloudKitShareManager) {
        statusSource = .shared

        // Restore persisted data source
        if let raw = UserDefaults.standard.string(forKey: dataSourceKey),
           let source = DataSource(rawValue: raw) {
```

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift
            }
        }

        // Listen for CloudKit silent pushes
        NotificationCenter.default.addObserver(
            forName: .cloudKitPushReceived,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            debugLog("[StatusReceiver] Received CloudKit push, refreshing...")
            Task { @MainActor in
                await self?.refresh()
            }
        }
```

with:

```swift
            }
        }

        // Show what a push or the background refresh read, too
        NotificationCenter.default.addObserver(
            forName: .pilotReadingDidChange,
            object: statusSource,
            queue: .main
        ) { [weak self] _ in
            debugLog("[StatusReceiver] The status source has a new reading")
            guard let self else { return }
            Task { @MainActor in
                self.showReading()
            }
        }
```

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift
            debugLog("[StatusReceiver] Share data reset, clearing state")
            guard let self else { return }
            Task { @MainActor in
                self.dataSource = nil
                self.hasAcceptedShare = false
                self.pilotStatus = nil
                self.rawPilotStatus = nil
                self.errorMessage = nil
                self.lastSyncError = nil
            }
```

with:

```swift
            debugLog("[StatusReceiver] Share data reset, clearing state")
            guard let self else { return }
            Task { @MainActor in
                self.statusSource.forgetICloudReading()
                self.dataSource = nil
                self.hasAcceptedShare = false
                self.pilotStatus = nil
                self.errorMessage = nil
                self.lastSyncError = nil
            }
```

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift
        }
    }

    /// Check if user has accepted a share and can access pilot status
    func checkForSharedData() async {
        if pilotStatus == nil {
            isLoading = true
```

with:

```swift
        }
    }

    /// Reads the pilot's status through the status source, and shows how that went.
    func checkForSharedData() async {
        if pilotStatus == nil {
            isLoading = true
```

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift
        let syncStartTime = Date()
        debugLog("[StatusReceiver] Starting sync")

        do {
            // Use the account status to check if we have iCloud access
            let accountStatus = try await container.accountStatus()
            if let issue = CloudAccountIssue(accountStatus: accountStatus) {
                debugLog("[StatusReceiver] iCloud account not available: \(accountStatus.rawValue)")
                errorMessage = issue.message
                lastSyncError = "iCloud unavailable"
                // An account that isn't ready says nothing about the share. Keep a recorded
                // connection so the partner sees how to fix iCloud rather than onboarding;
                // the CKAccountChanged observer retries once the account is available.
                hasAcceptedShare = hasRecordedConnection
                return
            }

            // Determine which database and owner to use
            let database: CKDatabase
            let ownerName: String

            if dataSource == .privateDB {
                database = privateDatabase
                ownerName = CKCurrentUserDefaultName
                debugLog("[StatusReceiver] Using private database (same-account mode)")
            } else {
                // Get the stored zone owner name from when the share was accepted
                guard let storedOwner = UserDefaults.standard.string(forKey: "SharedZoneOwner") else {
                    debugLog("[StatusReceiver] No stored zone owner - share not yet accepted")
                    hasAcceptedShare = false
                    lastSyncError = "No share accepted"
                    errorMessage = "Please accept the share invitation from your pilot."
                    return
                }
                database = sharedDatabase
                ownerName = storedOwner
                debugLog("[StatusReceiver] Using shared database with zone owner: \(ownerName)")
            }

            // Construct the zone ID with the owner name
            let zoneID = CKRecordZone.ID(zoneName: "PartnerBeaconZone", ownerName: ownerName)

            // Fetch the SharedPilotStatus record by its well-known ID
            // We use a fixed record name "pilot-status" so we can fetch without querying
            let statusRecordID = CKRecord.ID(recordName: "pilot-status", zoneID: zoneID)

            let statusRecord = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<CKRecord, Error>) in
                database.fetch(withRecordID: statusRecordID) { record, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else if let record = record {
                        continuation.resume(returning: record)
                    } else {
                        continuation.resume(throwing: NSError(domain: "CrewLuve", code: -1, userInfo: [NSLocalizedDescriptionKey: "No status record found"]))
                    }
                }
            }

            guard let newStatus = SharedPilotStatus.from(record: statusRecord) else {
                throw NSError(domain: "CrewLuve", code: -2, userInfo: [NSLocalizedDescriptionKey: "Failed to parse status record"])
            }

            debugLog("[StatusReceiver] Raw delay: \(newStatus.flightDelayMinutes.map(String.init) ?? "nil"), effective: \(newStatus.effectiveFlightDelayMinutes.map(String.init) ?? "nil")")

            // Resolve per-partner display name (stored separately — model stays immutable).
            // Reset so removals are reflected.
            resolvedDisplayName = nil
            let nameMap = newStatus.displayNameByPartner
            if !nameMap.isEmpty {
                if cachedUserRecordName == nil {
                    cachedUserRecordName = try? await container.userRecordID().recordName
                }
                // Look up strictly by this user's own recordID. Previously we fell back to
                // `nameMap.min(...)` in .privateDB mode, but that picked an arbitrary entry
                // (typically intended for some OTHER partner) and applied it as the pilot's
                // own display name — so e.g. setting Mom's Display Name to "Magic man"
                // would make the pilot's own Crewluve label themselves "Magic man." Falling
                // through to pilotFirstName when there is no entry for this user is the
                // correct behavior.
                let name = cachedUserRecordName.flatMap { nameMap[$0] }
                if let name, !name.isEmpty {
                    resolvedDisplayName = name
                    UserDefaults.standard.set(name, forKey: "ResolvedPilotDisplayName")
                    debugLog("[StatusReceiver] Resolved display name: \(name)")
                } else {
                    UserDefaults.standard.removeObject(forKey: "ResolvedPilotDisplayName")
                }
            }

            // Check if data actually changed
            let isInitialLoad = pilotStatus == nil
            let changed = pilotStatus.map { $0.lastUpdated != newStatus.lastUpdated } ?? true
            debugLog("[StatusReceiver] Data changed: \(changed ? "YES" : "NO"), initial: \(isInitialLoad)")

            if changed {
                let effectiveDelay = newStatus.effectiveFlightDelayMinutes
                let pilotName = UserDefaults.standard.string(forKey: "ResolvedPilotDisplayName")
                    ?? newStatus.pilotFirstName
                let previousStatus = pilotStatus
                let resolvedHome = TripStateResolver.resolveHomeArrival(
                    legs: newStatus.tripLegs, homeAirportCode: newStatus.homeAirportCode, at: Date()
                )?.arrivalTime
                Task.detached {
                    await StatusChangeNotifier.shared.evaluateChanges(
                        old: previousStatus, new: newStatus, pilotName: pilotName,
                        newEffectiveDelay: effectiveDelay,
                        resolvedHomeArrivalTime: resolvedHome ?? newStatus.homeArrivalTime
                    )
                }
            }

            logTripLegDiff(old: rawPilotStatus, new: newStatus, recordModDate: statusRecord.modificationDate)
            rawPilotStatus = newStatus
            resolveAndSchedule()
            hasAcceptedShare = true
            lastSyncTime = syncStartTime
            lastSyncError = nil

            debugLog("[StatusReceiver] Sync complete")
        } catch let ckError as CKError
                where (ckError.code == .unknownItem || ckError.code == .zoneNotFound)
                && (UserDefaults.standard.string(forKey: "SharedZoneOwner") != nil
                    || dataSource == .privateDB) {
            // The pilot revoked sharing — either the pilot-status record was deleted
            // (`unknownItem`) or the entire shared zone is gone (`zoneNotFound`, which
            // is what shows up on the receiver after CloudKit tears down access). Both
            // are permanent; reset local share state so we stop hammering a zone that
            // no longer exists and surface a copy that says so.
            debugLog("[StatusReceiver] ⚠️ Fetch returned \(ckError.code) — treating as share revoked")
            CloudKitShareManager.shared.resetShareData()
            hasAcceptedShare = false
            pilotStatus = nil
            rawPilotStatus = nil
            errorMessage = "Sharing has ended. Ask your pilot for a new pairing link."
            lastSyncError = "share ended"
        } catch {
            debugLog("[StatusReceiver] ❌ Error fetching status: \(error)")
            lastSyncError = error.localizedDescription
            // Keep hasAcceptedShare true if we have a known data source
            if hasRecordedConnection {
                hasAcceptedShare = true
                errorMessage = "Unable to load pilot status. Please try again."
            } else {
                hasAcceptedShare = false
                errorMessage = "Please accept the share invitation from your pilot."
            }
        }
    }
```

with:

```swift
        let syncStartTime = Date()
        debugLog("[StatusReceiver] Starting sync")

        // The iCloud account matters only while the status comes through iCloud.
        if !statusSource.isOnCrewluCloud {
            do {
                let accountStatus = try await container.accountStatus()
                if let issue = CloudAccountIssue(accountStatus: accountStatus) {
                    debugLog("[StatusReceiver] iCloud account not available: \(accountStatus.rawValue)")
                    errorMessage = issue.message
                    lastSyncError = "iCloud unavailable"
                    // An account that isn't ready says nothing about the share. Keep a recorded
                    // connection so the partner sees how to fix iCloud rather than onboarding;
                    // the CKAccountChanged observer retries once the account is available.
                    hasAcceptedShare = hasRecordedConnection
                    return
                }
            } catch {
                showFailure(error.localizedDescription)
                return
            }
        }

        switch await statusSource.refresh() {
        case .newStatus, .unchanged:
            showReading()
            lastSyncTime = syncStartTime
            lastSyncError = nil
            debugLog("[StatusReceiver] Sync complete")
        case .noStatusYet:
            hasAcceptedShare = true
            lastSyncTime = syncStartTime
            lastSyncError = nil
            errorMessage = "Waiting for your pilot's first update."
        case .notConnected:
            debugLog("[StatusReceiver] No stored zone owner - share not yet accepted")
            hasAcceptedShare = false
            lastSyncError = "No share accepted"
            errorMessage = "Please accept the share invitation from your pilot."
        case .sharingEnded:
            // The pilot revoked sharing. The source has already reset the share data, so stop
            // showing the status and surface a copy that says so.
            debugLog("[StatusReceiver] ⚠️ Sharing has ended")
            hasAcceptedShare = false
            pilotStatus = nil
            errorMessage = "Sharing has ended. Ask your pilot for a new pairing link."
            lastSyncError = "share ended"
        case .failed(let message):
            showFailure(message)
        }
    }

    /// Shows the source's reading, resolved for now. With none, there's nothing to show.
    private func showReading() {
        guard !isInDemoMode else { return }
        guard statusSource.reading != nil else {
            transitionTask?.cancel()
            pilotStatus = nil
            hasAcceptedShare = false
            return
        }
        resolveAndSchedule()
        hasAcceptedShare = true
    }

    private func showFailure(_ message: String) {
        debugLog("[StatusReceiver] ❌ Error fetching status: \(message)")
        lastSyncError = message
        // Keep hasAcceptedShare true if we have a known data source
        if hasRecordedConnection {
            hasAcceptedShare = true
            errorMessage = "Unable to load pilot status. Please try again."
        } else {
            hasAcceptedShare = false
            errorMessage = "Please accept the share invitation from your pilot."
        }
    }
```

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift
        await checkForSharedData()

        // If shared path found nothing and we're not already in private mode, try private DB
        if !hasAcceptedShare && dataSource != .privateDB {
            await checkPrivateDatabase()
        }
    }
```

with:

```swift
        await checkForSharedData()

        // If shared path found nothing and we're not already in private mode, try private DB
        if !hasAcceptedShare && dataSource != .privateDB && !statusSource.isOnCrewluCloud {
            await checkPrivateDatabase()
        }
    }
```

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift
        dataSource = source
    }

    /// Whether this device has connected to pilot data — a stored share owner or the
    /// same-account private zone. Transient iCloud failures must not undo that.
    private var hasRecordedConnection: Bool {
        dataSource == .privateDB || UserDefaults.standard.string(forKey: "SharedZoneOwner") != nil
    }

    /// Check the private database for PartnerBeaconZone (same-account scenario)
```

with:

```swift
        dataSource = source
    }

    /// Whether this device has connected to pilot data — Crewlu Cloud, a stored share owner or
    /// the same-account private zone. Transient failures must not undo that.
    private var hasRecordedConnection: Bool {
        statusSource.isOnCrewluCloud
            || dataSource == .privateDB
            || UserDefaults.standard.string(forKey: "SharedZoneOwner") != nil
    }

    /// Check the private database for PartnerBeaconZone (same-account scenario)
```

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift
    /// Trusts Duty's pre-computed fields; only overrides displayStatus and location
    /// when the resolver finds an active leg for real-time transitions.
    private func resolveAndSchedule() {
        guard let raw = rawPilotStatus else {
            pilotStatus = nil
            return
        }

        let displayName = resolvedDisplayName ?? raw.pilotFirstName

        guard raw.hasTripLegs else {
            debugLog("[Resolve] No trip legs, using raw status")
            pilotStatus = raw
            return
        }

        let legs = raw.tripLegs
        debugLog("[Resolve] Passing \(legs.count) legs to TripStateResolver")

        let now = Date()
        let resolved = TripStateResolver.resolve(legs: legs, flightDelayMinutes: raw.flightDelayMinutes, homeAirportCode: raw.homeAirportCode, baseAirportCode: raw.baseAirportCode, at: now)

        // If resolver found an active leg, use its real-time data for status/location/flight.
```

with:

```swift
    /// Trusts Duty's pre-computed fields; only overrides displayStatus and location
    /// when the resolver finds an active leg for real-time transitions.
    private func resolveAndSchedule() {
        let now = Date()
        guard let reading = statusSource.reading else {
            pilotStatus = nil
            return
        }

        let raw = reading.status(at: now)
        let displayName = reading.displayName ?? raw.pilotFirstName

        guard raw.hasTripLegs else {
            debugLog("[Resolve] No trip legs, using raw status")
            pilotStatus = raw
            scheduleResolve(transition: nil, reading: reading, now: now)
            return
        }

        let legs = raw.tripLegs
        debugLog("[Resolve] Passing \(legs.count) legs to TripStateResolver")

        let resolved = TripStateResolver.resolve(legs: legs, flightDelayMinutes: raw.flightDelayMinutes, homeAirportCode: raw.homeAirportCode, baseAirportCode: raw.baseAirportCode, at: now)

        // If resolver found an active leg, use its real-time data for status/location/flight.
```

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift
        let transitionInfo = resolved?.timeUntilNextTransition.map { String(format: "%.0f", $0) } ?? "nil"
        debugLog("[StatusReceiver] Resolved status: \(displayStatus.rawDisplayString), next transition in \(transitionInfo)s")

        // Schedule re-resolve at next leg boundary for real-time updates
        transitionTask?.cancel()
        if let delay = resolved?.timeUntilNextTransition, delay > 0 {
            transitionTask = Task { [weak self] in
                try? await Task.sleep(for: .seconds(delay + 0.5))
                guard !Task.isCancelled else { return }
                guard let self else { return }
                self.resolveAndSchedule()
            }
        }
    }
```

with:

```swift
        let transitionInfo = resolved?.timeUntilNextTransition.map { String(format: "%.0f", $0) } ?? "nil"
        debugLog("[StatusReceiver] Resolved status: \(displayStatus.rawDisplayString), next transition in \(transitionInfo)s")

        scheduleResolve(transition: resolved?.timeUntilNextTransition, reading: reading, now: now)
    }

    /// Schedules a re-resolve at the next leg boundary, or when the quick status shown now
    /// expires and another may take its place, whichever comes first.
    private func scheduleResolve(transition: TimeInterval?, reading: PilotReading, now: Date) {
        transitionTask?.cancel()
        let quickStatusChange = reading.change(after: now).map { $0.timeIntervalSince(now) }
        guard let delay = [transition, quickStatusChange].compactMap({ $0 }).filter({ $0 > 0 }).min() else { return }
        transitionTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(delay + 0.5))
            guard !Task.isCancelled else { return }
            guard let self else { return }
            self.resolveAndSchedule()
        }
    }
```

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift
        return nextLeg?.tripId ?? completedLeg?.tripId
    }

    // MARK: - Diagnostic Logging

    /// Compare trip leg IDs between cached and incoming data to detect disappearing legs
    private func logTripLegDiff(old: SharedPilotStatus?, new: SharedPilotStatus, recordModDate: Date?) {
        let oldLegs = old?.tripLegs ?? []
        let newLegs = new.tripLegs

        let oldIds = Set(oldLegs.map(\.id))
        let newIds = Set(newLegs.map(\.id))

        guard oldIds != newIds else { return }

        let removed = oldLegs.filter { !newIds.contains($0.id) }
        let added = newLegs.filter { !oldIds.contains($0.id) }

        debugLog("[TripLegDiff] === LEG CHANGE DETECTED ===")
        debugLog("[TripLegDiff] Count: \(oldLegs.count) → \(newLegs.count)")
        debugLog("[TripLegDiff] Record mod date: \(recordModDate?.formatted(date: .abbreviated, time: .standard) ?? "unknown")")

        for leg in removed {
            debugLog("[TripLegDiff] REMOVED: \(legDescription(leg))")
        }
        for leg in added {
            debugLog("[TripLegDiff] ADDED: \(legDescription(leg))")
        }
    }

    private func legDescription(_ leg: TripLeg) -> String {
        let type = "[\(leg.type.rawValue)]"
        let route: String
        if leg.type == .flight {
            route = "\(leg.departureAirport ?? "?")→\(leg.arrivalAirport ?? "?")"
        } else {
            route = leg.airportCode ?? "?"
        }
        let trip = leg.tripId.map { "trip:\($0)" } ?? "standalone"
        let start = leg.startTime.formatted(date: .abbreviated, time: .shortened)
        let end = leg.endTime.formatted(date: .abbreviated, time: .shortened)
        return "\(type) \(route) (\(trip)) \(start)–\(end)"
    }
}
```

with:

```swift
        return nextLeg?.tripId ?? completedLeg?.tripId
    }

    // MARK: - The 60-Second Check

    /// While the app is in front, on Crewlu Cloud and outside the demo, reads every 60 seconds
    /// (partner links piece 4 spec §5.5). With nothing new, Crewlu Cloud answers "unchanged".
    func startPeriodicCheck() {
        guard statusSource.isOnCrewluCloud, !isInDemoMode else {
            periodicCheck.stop()
            return
        }
        periodicCheck.start { [weak self] in
            await self?.refresh()
        }
    }

    func stopPeriodicCheck() {
        periodicCheck.stop()
    }
}
```

- [ ] **Step 2: Start and stop the check with the app**

2 replacements, in order, in `Crewluv/Views/Welcome/ContentView.swift`:

In `Crewluv/Views/Welcome/ContentView.swift`, replace:

```swift
            if statusReceiver == nil {
                statusReceiver = PartnerStatusReceiver(shareManager: shareManager)
            }
        }
        .alert("Share Error", isPresented: $showShareError) {
            Button("OK") { shareManager.resetShareState() }
```

with:

```swift
            if statusReceiver == nil {
                statusReceiver = PartnerStatusReceiver(shareManager: shareManager)
            }
            statusReceiver?.startPeriodicCheck()
        }
        .alert("Share Error", isPresented: $showShareError) {
            Button("OK") { shareManager.resetShareState() }
```

In `Crewluv/Views/Welcome/ContentView.swift`, replace:

```swift
                    if !receiver.isSyncing {
                        Task { await receiver.refresh() }
                    }
                    Task { await BackgroundRefreshManager.shared.scheduleNextRefresh() }
                }
            }
            .pasteShareLinkAlert(isPresented: $showPasteShareAlert)
```

with:

```swift
                    if !receiver.isSyncing {
                        Task { await receiver.refresh() }
                    }
                    receiver.startPeriodicCheck()
                    Task { await BackgroundRefreshManager.shared.scheduleNextRefresh() }
                } else {
                    receiver.stopPeriodicCheck()
                }
            }
            .pasteShareLinkAlert(isPresented: $showPasteShareAlert)
```

- [ ] **Step 3: Check it compiles**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 91 tests in 11 suites passed`.

- [ ] **Step 4: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PartnerStatusReceiver.swift Crewluv/Views/Welcome/ContentView.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): the status screen reads through the status source and checks every 60 seconds on Crewlu Cloud" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 11: The push token and what a push means

**Files:**
- Create: `Crewluv/Services/PushRegistrar.swift`, `Crewluv/Services/PushRoute.swift`
- Modify: `Crewluv/Services/NotificationDiagnostics.swift`
- Test: `CrewluvTests/PushRegistrarTests.swift`, `CrewluvTests/PushRouteTests.swift`

Spec §6 and decisions 13–14: on Crewlu Cloud the token goes to `partner_set_push`, and a registration that couldn't reach Crewlu Cloud is tried again on coming to the front. `sharing_ended` ends sharing. A silent push means "check now" as `PushRoute` says, and iOS is told how it went.

- [ ] **Step 1: Write the failing tests**

File: `CrewluvTests/PushRegistrarTests.swift`

```swift
//
//  PushRegistrarTests.swift
//  CrewluvTests
//
//  This device's push token goes to Crewlu Cloud while it's connected there
//  (partner links piece 4 spec §6.1).
//

import Foundation
import Testing
@testable import Crewluv

@MainActor
final class PushRegistrarTests {
    private let defaultsName = "PushRegistrarTests.\(UUID().uuidString)"
    private let defaults: UserDefaults
    private let door = StandInPartnerDoor()
    private let keys = InMemoryDeviceKeyStore()
    private let log = Log()

    init() throws {
        defaults = try #require(UserDefaults(suiteName: defaultsName))
    }

    deinit {
        defaults.removePersistentDomain(forName: defaultsName)
    }

    /// A registrar for a device on Crewlu Cloud as partner A, or on iCloud.
    private func makeRegistrar(onCrewluCloud: Bool = true) -> (PushRegistrar, PilotStatusSource) {
        if onCrewluCloud {
            defaults.set(Make.partnerA, forKey: "partnerCloud.partnerID")
            keys.key = Make.key
        }
        let source = PilotStatusSource(
            iCloud: StandInICloud(), door: door, keys: keys, defaults: defaults,
            notifier: RecordingNotifier(), iCloudShareEnded: {}
        )
        let registrar = PushRegistrar(
            statusSource: source, door: door, keys: keys,
            environment: { .sandbox }, record: { [log] in log.entries.append($0) }
        )
        return (registrar, source)
    }

    @Test func test_token_goesAsLowerCaseHex_withTheBuildsEnvironment() async {
        let (registrar, _) = makeRegistrar()

        await registrar.didReceive(deviceToken: Data([0x0A, 0xFF, 0x01]))

        #expect(door.pushes.map(\.key) == [Make.key])
        #expect(door.pushes.map(\.token) == ["0aff01"])
        #expect(door.pushes.map(\.environment) == [.sandbox])
        #expect(log.entries == ["Sent (sandbox)"])
    }

    @Test func test_onICloud_nothingIsSent_evenWithAKey() async {
        keys.key = Make.key
        let (registrar, _) = makeRegistrar(onCrewluCloud: false)

        await registrar.didReceive(deviceToken: Data([0x0A]))

        #expect(door.pushes.isEmpty)
        #expect(registrar.token == "0a")
    }

    @Test func test_withoutAToken_nothingIsSent() async {
        let (registrar, _) = makeRegistrar()

        await registrar.register()

        #expect(door.pushes.isEmpty)
    }

    @Test func test_register_sendsTheTokenItAlreadyHas() async {
        let (registrar, _) = makeRegistrar()
        await registrar.didReceive(deviceToken: Data([0x0A]))

        await registrar.register()

        #expect(door.pushes.map(\.token) == ["0a", "0a"])
    }

    @Test func test_unreachable_isTriedAgainOnComingToTheFront() async {
        door.setPushAnswers = [.failure(.unavailable)]
        let (registrar, _) = makeRegistrar()

        await registrar.didReceive(deviceToken: Data([0x0A]))
        #expect(registrar.isOwed)
        await registrar.appBecameActive()

        #expect(door.pushes.count == 2)
        #expect(!registrar.isOwed)
        #expect(log.entries == ["Couldn't reach Crewlu Cloud", "Sent (sandbox)"])
    }

    @Test func test_sent_isntSentAgainOnComingToTheFront() async {
        let (registrar, _) = makeRegistrar()

        await registrar.didReceive(deviceToken: Data([0x0A]))
        await registrar.appBecameActive()

        #expect(door.pushes.count == 1)
    }

    @Test func test_sharingEnded_endsSharing() async {
        door.setPushAnswers = [.failure(.refused(.sharingEnded))]
        let (registrar, source) = makeRegistrar()

        await registrar.didReceive(deviceToken: Data([0x0A]))

        #expect(!source.isOnCrewluCloud)
        #expect(keys.key == nil)
        #expect(!registrar.isOwed)
    }

    @Test func test_refused_isntTriedAgainUntilTheNextLaunch() async {
        door.setPushAnswers = [.failure(.refused(.invalidInput))]
        let (registrar, source) = makeRegistrar()

        await registrar.didReceive(deviceToken: Data([0x0A]))
        await registrar.appBecameActive()

        #expect(door.pushes.count == 1)
        #expect(!registrar.isOwed)
        #expect(source.isOnCrewluCloud)
        #expect(log.entries == ["Refused: invalid_input"])
    }
}

/// What the registrar recorded for the diagnostics.
@MainActor
private final class Log {
    var entries: [String] = []
}
```

File: `CrewluvTests/PushRouteTests.swift`

```swift
//
//  PushRouteTests.swift
//  CrewluvTests
//
//  What a silent push means, and what iOS is told afterwards
//  (partner links piece 4 spec §6.2).
//

import Foundation
import Testing
@testable import Crewluv

struct PushRouteTests {

    /// What Crewlu Cloud's push service sends.
    private static func crewluCloudPush() -> [AnyHashable: Any] {
        ["aps": ["content-available": 1]]
    }

    /// What a CloudKit subscription sends.
    private static func iCloudPush() -> [AnyHashable: Any] {
        ["aps": ["content-available": 1], "ck": ["ce": 2, "cid": "iCloud.com.toddanderson.duty", "nid": "1"]]
    }

    @Test func test_onCrewluCloud_itsPushRefreshes() {
        #expect(PushRoute(userInfo: Self.crewluCloudPush(), isOnCrewluCloud: true) == .refresh)
    }

    @Test func test_onCrewluCloud_iCloudsPushIsIgnored() {
        #expect(PushRoute(userInfo: Self.iCloudPush(), isOnCrewluCloud: true) == .ignore)
    }

    @Test func test_onCrewluCloud_aPushThatIsntSilentIsIgnored() {
        #expect(PushRoute(userInfo: ["aps": ["alert": "Hello"]], isOnCrewluCloud: true) == .ignore)
    }

    @Test func test_onICloud_iCloudsPushRefreshes() {
        #expect(PushRoute(userInfo: Self.iCloudPush(), isOnCrewluCloud: false) == .refresh)
    }

    @Test func test_onICloud_otherPushesAreIgnored() {
        #expect(PushRoute(userInfo: Self.crewluCloudPush(), isOnCrewluCloud: false) == .ignore)
    }

    @Test(arguments: [
        (RefreshOutcome.newStatus, BackgroundFetchOutcome.newData),
        (.sharingEnded, .newData),
        (.unchanged, .noData),
        (.noStatusYet, .noData),
        (.notConnected, .noData),
        (.failed("No connection to Crewlu Cloud"), .failed),
    ])
    func test_whatIOSIsTold(outcome: RefreshOutcome, expected: BackgroundFetchOutcome) {
        #expect(outcome.backgroundFetchOutcome == expected)
    }
}
```

- [ ] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `cannot find type 'PushRegistrar' in scope` or `cannot find 'PushRoute' in scope`, depending on which file the compiler reaches first.

- [ ] **Step 3: Write the routes**

File: `Crewluv/Services/PushRoute.swift`

```swift
//
//  PushRoute.swift
//  CrewLuve
//
//  What a silent push means, and what iOS is told afterwards
//

import Foundation

/// What a remote notification means (partner links piece 4 spec §6.2). On Crewlu Cloud, a silent
/// push without iCloud's `ck` key means "check now", and iCloud's own pushes no longer matter.
/// On iCloud, iCloud's pushes do, as before.
nonisolated enum PushRoute: Equatable, Sendable {
    case refresh
    case ignore

    init(userInfo: [AnyHashable: Any], isOnCrewluCloud: Bool) {
        let isFromICloud = userInfo["ck"] != nil
        guard isOnCrewluCloud else {
            self = isFromICloud ? .refresh : .ignore
            return
        }
        let aps = userInfo["aps"] as? [AnyHashable: Any]
        let isSilent = aps?["content-available"] as? Int == 1
        self = isSilent && !isFromICloud ? .refresh : .ignore
    }
}

/// What a background wake-up tells iOS: whether it brought anything new.
nonisolated enum BackgroundFetchOutcome: Equatable, Sendable {
    case newData
    case noData
    case failed
}

extension RefreshOutcome {
    /// What to tell iOS once a push or the background refresh has read the status.
    nonisolated var backgroundFetchOutcome: BackgroundFetchOutcome {
        switch self {
        case .newStatus, .sharingEnded: .newData
        case .unchanged, .noStatusYet, .notConnected: .noData
        case .failed: .failed
        }
    }
}
```

- [ ] **Step 4: Note each registration for the diagnostics**

3 replacements, in order, in `Crewluv/Services/NotificationDiagnostics.swift`:

In `Crewluv/Services/NotificationDiagnostics.swift`, replace:

```swift
        let lastBackgroundRefreshAt: Date?
        let localNotificationCount: Int
        let lastLocalNotificationAt: Date?
    }

    // MARK: - UserDefaults Keys
```

with:

```swift
        let lastBackgroundRefreshAt: Date?
        let localNotificationCount: Int
        let lastLocalNotificationAt: Date?
        let crewluCloudPushRegisteredAt: Date?
        let crewluCloudPushResult: String?
    }

    // MARK: - UserDefaults Keys
```

In `Crewluv/Services/NotificationDiagnostics.swift`, replace:

```swift
        }
    }

    // MARK: - Snapshot

    func snapshot() -> Snapshot {
```

with:

```swift
        }
    }

    /// Records how the last push registration with Crewlu Cloud went.
    nonisolated func recordPushRegistration(_ result: String) {
        Task { await _recordPushRegistration(result) }
    }

    private func _recordPushRegistration(_ result: String) {
        defaults.set(Date(), forKey: prefix + "crewluCloudPushRegisteredAt")
        defaults.set(result, forKey: prefix + "crewluCloudPushResult")
    }

    // MARK: - Snapshot

    func snapshot() -> Snapshot {
```

In `Crewluv/Services/NotificationDiagnostics.swift`, replace:

```swift
            backgroundRefreshCount: defaults.integer(forKey: prefix + "bgRefreshCount"),
            lastBackgroundRefreshAt: defaults.object(forKey: prefix + "lastBgRefreshAt") as? Date,
            localNotificationCount: defaults.integer(forKey: prefix + "localNotifCount"),
            lastLocalNotificationAt: defaults.object(forKey: prefix + "lastLocalNotifAt") as? Date
        )
    }
}
```

with:

```swift
            backgroundRefreshCount: defaults.integer(forKey: prefix + "bgRefreshCount"),
            lastBackgroundRefreshAt: defaults.object(forKey: prefix + "lastBgRefreshAt") as? Date,
            localNotificationCount: defaults.integer(forKey: prefix + "localNotifCount"),
            lastLocalNotificationAt: defaults.object(forKey: prefix + "lastLocalNotifAt") as? Date,
            crewluCloudPushRegisteredAt: defaults.object(forKey: prefix + "crewluCloudPushRegisteredAt") as? Date,
            crewluCloudPushResult: defaults.string(forKey: prefix + "crewluCloudPushResult")
        )
    }
}
```

- [ ] **Step 5: Write the registrar**

File: `Crewluv/Services/PushRegistrar.swift`

```swift
//
//  PushRegistrar.swift
//  CrewLuve
//
//  Sends this device's push token to Crewlu Cloud
//

import Foundation

/// Sends this device's push token to Crewlu Cloud, so a change in the pilot's status wakes it
/// (partner links piece 4 spec §6.1): when iOS gives the token at launch, right after
/// connecting, and on coming to the front when the last try couldn't reach Crewlu Cloud.
final class PushRegistrar {
    static let shared = PushRegistrar()

    /// The token iOS gave in this launch, as lower-case hex.
    private(set) var token: String?
    /// Whether the last registration couldn't reach Crewlu Cloud, so it's tried again.
    private(set) var isOwed = false

    private let statusSource: PilotStatusSource
    private let door: PartnerDoor
    private let keys: DeviceKeyStore
    private let environment: () -> PushEnvironment
    /// Notes how each registration went, for the diagnostics.
    private let record: (String) -> Void

    init(
        statusSource: PilotStatusSource = .shared,
        door: PartnerDoor = LivePartnerDoor(),
        keys: DeviceKeyStore = KeychainDeviceKeyStore(),
        environment: @escaping () -> PushEnvironment = { .current },
        record: @escaping (String) -> Void = { NotificationDiagnostics.shared.recordPushRegistration($0) }
    ) {
        self.statusSource = statusSource
        self.door = door
        self.keys = keys
        self.environment = environment
        self.record = record
    }

    /// iOS gave this device's push token, as it does at every launch.
    func didReceive(deviceToken: Data) async {
        token = deviceToken.map { String(format: "%02x", $0) }.joined()
        await register()
    }

    /// The app came to the front: tries again if the last registration couldn't reach Crewlu Cloud.
    func appBecameActive() async {
        guard isOwed else { return }
        await register()
    }

    /// Sends the token, while this device is on Crewlu Cloud. Connecting calls this too.
    func register() async {
        guard let token, statusSource.isOnCrewluCloud, let key = keys.deviceKey() else { return }
        let environment = environment()
        do {
            try await door.setPush(key: key, token: token, environment: environment)
            isOwed = false
            record("Sent (\(environment.rawValue))")
        } catch .refused(.sharingEnded) {
            isOwed = false
            record("Sharing ended")
            statusSource.endSharing()
        } catch .refused(let refusal) {
            isOwed = false
            record("Refused: \(refusal.rawValue)")
        } catch {
            isOwed = true
            record("Couldn't reach Crewlu Cloud")
        }
    }
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 105 tests in 13 suites passed`.

- [ ] **Step 7: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PushRegistrar.swift Crewluv/Services/PushRoute.swift Crewluv/Services/NotificationDiagnostics.swift CrewluvTests/PushRegistrarTests.swift CrewluvTests/PushRouteTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): the push token goes to Crewlu Cloud, and its silent push means check now" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 12: Pushes and the background refresh read through the source

**Files:**
- Modify: `Crewluv/App/AppDelegate.swift`, `Crewluv/App/CrewluvApp.swift`, `Crewluv/Services/BackgroundRefreshManager.swift`, `Crewluv/Views/Welcome/ContentView.swift`, `Crewluv/Views/Status/NotificationDiagnosticsView.swift`

Spec §6 and decisions 11, 13 and 14: the token goes to the registrar, a push asks the source, and the background refresh does too. The screen's `.cloudKitPushReceived` goes, since the source tells it (Task 10). Coming to the front tries an owed registration again, and the diagnostics sheet shows the last one. These need UIKit, BackgroundTasks or SwiftUI's iOS views, so Task 13 compiles them.

- [ ] **Step 1: Send the token, and ask the source on a push**

3 replacements, in order, in `Crewluv/App/AppDelegate.swift`:

In `Crewluv/App/AppDelegate.swift`, replace:

```swift
    ) {
        debugLog("[AppDelegate] Registered for remote notifications")
        NotificationDiagnostics.shared.record(.apnsRegistered)
    }

    func application(
```

with:

```swift
    ) {
        debugLog("[AppDelegate] Registered for remote notifications")
        NotificationDiagnostics.shared.record(.apnsRegistered)
        Task { await PushRegistrar.shared.didReceive(deviceToken: deviceToken) }
    }

    func application(
```

In `Crewluv/App/AppDelegate.swift`, replace:

```swift
    ) {
        debugLog("[AppDelegate] Received remote notification")

        guard userInfo["ck"] != nil else {
            debugLog("[AppDelegate] Not a CloudKit notification, ignoring")
            completionHandler(.noData)
            return
        }

        NotificationDiagnostics.shared.record(.silentPushReceived)

        // Post for foreground UI updates (PartnerStatusReceiver observes this)
        NotificationCenter.default.post(name: .cloudKitPushReceived, object: nil)

        // Fetch status directly so notifications fire even when the app is suspended
        Task {
            do {
                let newStatus = try await fetchPilotStatusFromCloudKit()
                let pilotName = UserDefaults.standard.string(forKey: "ResolvedPilotDisplayName")
                    ?? newStatus.pilotFirstName
                let resolvedHome = TripStateResolver.resolveHomeArrival(
                    legs: newStatus.tripLegs, homeAirportCode: newStatus.homeAirportCode, at: Date()
                )?.arrivalTime

                await StatusChangeNotifier.shared.evaluateChanges(
                    old: nil,
                    new: newStatus,
                    pilotName: pilotName,
                    newEffectiveDelay: newStatus.effectiveFlightDelayMinutes,
                    resolvedHomeArrivalTime: resolvedHome ?? newStatus.homeArrivalTime
                )

                // Re-schedule BG refresh after successful push handling
                await BackgroundRefreshManager.shared.scheduleNextRefresh()

                debugLog("[AppDelegate] Background fetch + evaluate completed")
                completionHandler(.newData)
            } catch {
                debugLog("[AppDelegate] Background fetch failed: \(error)")
                completionHandler(.failed)
            }
        }
    }

    // MARK: - Background CloudKit Fetch

    /// Fetches the pilot-status record directly from CloudKit using persisted config.
    /// Mirrors the database/owner resolution logic in PartnerStatusReceiver.
    private func fetchPilotStatusFromCloudKit() async throws -> SharedPilotStatus {
        let container = CKContainer(identifier: "iCloud.com.toddanderson.duty")

        let database: CKDatabase
        let ownerName: String

        if UserDefaults.standard.string(forKey: "PilotDataSource") == "privateDB" {
            database = container.privateCloudDatabase
            ownerName = CKCurrentUserDefaultName
        } else {
            guard let storedOwner = UserDefaults.standard.string(forKey: "SharedZoneOwner") else {
                throw NSError(
                    domain: "CrewLuve",
                    code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "No stored zone owner"]
                )
            }
            database = container.sharedCloudDatabase
            ownerName = storedOwner
        }

        let zoneID = CKRecordZone.ID(zoneName: "PartnerBeaconZone", ownerName: ownerName)
        let recordID = CKRecord.ID(recordName: "pilot-status", zoneID: zoneID)
        let record = try await database.record(for: recordID)

        guard let status = SharedPilotStatus.from(record: record) else {
            throw NSError(
                domain: "CrewLuve",
                code: -2,
                userInfo: [NSLocalizedDescriptionKey: "Failed to parse status record"]
            )
        }

        return status
    }

    // MARK: - UNUserNotificationCenterDelegate
```

with:

```swift
    ) {
        debugLog("[AppDelegate] Received remote notification")

        let source = PilotStatusSource.shared
        guard PushRoute(userInfo: userInfo, isOnCrewluCloud: source.isOnCrewluCloud) == .refresh else {
            debugLog("[AppDelegate] Not a status push, ignoring")
            completionHandler(.noData)
            return
        }

        NotificationDiagnostics.shared.record(.silentPushReceived)

        // Read the status now, so alerts fire even when the app is suspended. The source hands a
        // new status to the alerts, and the screen hears of it from the source.
        Task {
            let outcome = await source.refresh().backgroundFetchOutcome
            if outcome != .failed {
                // Re-schedule BG refresh after successful push handling
                await BackgroundRefreshManager.shared.scheduleNextRefresh()
            }
            debugLog("[AppDelegate] Push handled: \(outcome)")
            completionHandler(outcome.backgroundFetchResult)
        }
    }

    // MARK: - UNUserNotificationCenterDelegate
```

In `Crewluv/App/AppDelegate.swift`, replace:

```swift
        }
    }
}
```

with:

```swift
        }
    }
}

// MARK: - Background Fetch Results

private extension BackgroundFetchOutcome {
    var backgroundFetchResult: UIBackgroundFetchResult {
        switch self {
        case .newData: .newData
        case .noData: .noData
        case .failed: .failed
        }
    }
}
```

- [ ] **Step 2: Retire the push notification's name**

One replacement in `Crewluv/App/CrewluvApp.swift`:

In `Crewluv/App/CrewluvApp.swift`, replace:

```swift
// Notification names
extension Notification.Name {
    static let shareAccepted = Notification.Name("shareAccepted")
    static let cloudKitPushReceived = Notification.Name("cloudKitPushReceived")
    static let shareDataReset = Notification.Name("shareDataReset")
}
```

with:

```swift
// Notification names
extension Notification.Name {
    static let shareAccepted = Notification.Name("shareAccepted")
    static let shareDataReset = Notification.Name("shareDataReset")
}
```

- [ ] **Step 3: Read through the source in the background**

2 replacements, in order, in `Crewluv/Services/BackgroundRefreshManager.swift`:

In `Crewluv/Services/BackgroundRefreshManager.swift`, replace:

```swift
//  CrewLuve
//
//  Schedules BGAppRefreshTask as a fallback for when iOS throttles
//  silent push notifications, ensuring periodic CloudKit polling.
//

import BackgroundTasks
import CloudKit
import Foundation

actor BackgroundRefreshManager {
    static let shared = BackgroundRefreshManager()

    private let taskIdentifier = "com.ToddAnderson.Crewluv.statusRefresh"
    private let container = CKContainer(identifier: "iCloud.com.toddanderson.duty")

    // MARK: - Registration
```

with:

```swift
//  CrewLuve
//
//  Schedules BGAppRefreshTask as a fallback for when iOS throttles
//  silent push notifications, ensuring the status is read now and then.
//

import BackgroundTasks
import Foundation

actor BackgroundRefreshManager {
    static let shared = BackgroundRefreshManager()

    private let taskIdentifier = "com.ToddAnderson.Crewluv.statusRefresh"

    // MARK: - Registration
```

In `Crewluv/Services/BackgroundRefreshManager.swift`, replace:

```swift
        }
    }

    /// Fetches CloudKit status and evaluates changes — mirrors `AppDelegate.fetchPilotStatusFromCloudKit`.
    private func fetchAndEvaluate() async throws {
        let database: CKDatabase
        let ownerName: String

        if UserDefaults.standard.string(forKey: "PilotDataSource") == "privateDB" {
            database = container.privateCloudDatabase
            ownerName = CKCurrentUserDefaultName
        } else {
            guard let storedOwner = UserDefaults.standard.string(forKey: "SharedZoneOwner") else {
                debugLog("[BGRefresh] No stored zone owner, skipping")
                return
            }
            database = container.sharedCloudDatabase
            ownerName = storedOwner
        }

        let zoneID = CKRecordZone.ID(zoneName: "PartnerBeaconZone", ownerName: ownerName)
        let recordID = CKRecord.ID(recordName: "pilot-status", zoneID: zoneID)
        let record = try await database.record(for: recordID)

        guard let newStatus = await SharedPilotStatus.from(record: record) else {
            throw NSError(
                domain: "CrewLuve",
                code: -2,
                userInfo: [NSLocalizedDescriptionKey: "Failed to parse status record"]
            )
        }

        let pilotName = UserDefaults.standard.string(forKey: "ResolvedPilotDisplayName")
            ?? newStatus.pilotFirstName

        let effectiveDelay: Int? = await MainActor.run { newStatus.effectiveFlightDelayMinutes }
        let resolvedHome: Date? = await MainActor.run {
            TripStateResolver.resolveHomeArrival(
                legs: newStatus.tripLegs, homeAirportCode: newStatus.homeAirportCode, at: Date()
            )?.arrivalTime
        }
        await StatusChangeNotifier.shared.evaluateChanges(
            old: nil,
            new: newStatus,
            pilotName: pilotName,
            newEffectiveDelay: effectiveDelay,
            resolvedHomeArrivalTime: resolvedHome ?? newStatus.homeArrivalTime
        )
    }
}

// MARK: - CancellableHandle
```

with:

```swift
        }
    }

    /// Reads the status through the status source, which hands a new one to the alerts.
    private func fetchAndEvaluate() async throws {
        let outcome = await PilotStatusSource.shared.refresh()
        if case .failed(let reason) = outcome {
            throw BackgroundReadFailed(reason: reason)
        }
    }
}

/// A background read that didn't get the status.
private struct BackgroundReadFailed: Error {
    let reason: String
}

// MARK: - CancellableHandle
```

- [ ] **Step 4: Try an owed registration on coming to the front**

One replacement in `Crewluv/Views/Welcome/ContentView.swift`:

In `Crewluv/Views/Welcome/ContentView.swift`, replace:

```swift
                    }
                    receiver.startPeriodicCheck()
                    Task { await BackgroundRefreshManager.shared.scheduleNextRefresh() }
                } else {
                    receiver.stopPeriodicCheck()
                }
```

with:

```swift
                    }
                    receiver.startPeriodicCheck()
                    Task { await BackgroundRefreshManager.shared.scheduleNextRefresh() }
                    Task { await PushRegistrar.shared.appBecameActive() }
                } else {
                    receiver.stopPeriodicCheck()
                }
```

- [ ] **Step 5: Show the registration in the diagnostics**

2 replacements, in order, in `Crewluv/Views/Status/NotificationDiagnosticsView.swift`:

In `Crewluv/Views/Status/NotificationDiagnosticsView.swift`, replace:

```swift
            List {
                apnsSection
                pushSection
                backgroundRefreshSection
                localNotificationSection
                subscriptionSection
```

with:

```swift
            List {
                apnsSection
                pushSection
                crewluCloudSection
                backgroundRefreshSection
                localNotificationSection
                subscriptionSection
```

In `Crewluv/Views/Status/NotificationDiagnosticsView.swift`, replace:

```swift
            } else {
                row("Last Received", value: "Never")
            }
        }
    }
```

with:

```swift
            } else {
                row("Last Received", value: "Never")
            }
        }
    }

    private var crewluCloudSection: some View {
        Section("Crewlu Cloud Pushes") {
            row("On Crewlu Cloud", value: PilotStatusSource.shared.isOnCrewluCloud ? "Yes" : "No")
            row("Environment", value: PushEnvironment.current.rawValue)
            if let registeredAt = snapshot?.crewluCloudPushRegisteredAt {
                row("Last Registration", value: registeredAt.formatted(date: .abbreviated, time: .standard))
            } else {
                row("Last Registration", value: "Never")
            }
            row("Result", value: snapshot?.crewluCloudPushResult ?? "None")
        }
    }
```

- [ ] **Step 6: Check the rest still compiles**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 105 tests in 13 suites passed`. Nothing in the harness uses the retired name.

- [ ] **Step 7: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/App/AppDelegate.swift Crewluv/App/CrewluvApp.swift Crewluv/Services/BackgroundRefreshManager.swift Crewluv/Views/Welcome/ContentView.swift Crewluv/Views/Status/NotificationDiagnosticsView.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): pushes and the background refresh read through the status source" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 13: Compile everything, without a simulator

**Files:** none. A build in a separate clone of the branch, with its own build folder, so it can't disturb the user's open Xcode or touch a simulator. It compiles the app and `CrewluvTests`, including the wiring and the Keychain tests the harness can't build. Crewluve has no packages to copy.

- [ ] **Step 1: Make the clone**

Use a scratch folder outside both repos as `$BUILD`, for example `export BUILD=<your scratchpad>/partner-cloud-source-build`.

Run:

```bash
rm -rf "${BUILD:?set BUILD first}" && mkdir -p "$BUILD" && git clone -q --shared ~/Dev/Crewluv "$BUILD/crewluv" && git -C "$BUILD/crewluv" switch -q feature/partner-cloud-source && git -C "$BUILD/crewluv" log --oneline -1
```

Expected: the branch's last commit: Task 12's `feat(crewluv): pushes and the background refresh read through the status source`, or a later fix from Task 14.

- [ ] **Step 2: Build for testing**

It takes a few minutes, so run it in the background and wait for it to finish.

Run:

```bash
cd "$BUILD/crewluv" && xcodebuild build-for-testing -project Crewluv.xcodeproj -scheme Crewluv -destination "generic/platform=iOS Simulator" -derivedDataPath "$BUILD/derived" -quiet > "$BUILD/build.log" 2>&1; echo "exit $?"; echo "errors: $(grep -c " error: " "$BUILD/build.log")"; echo "warnings: $(grep -c " warning: " "$BUILD/build.log")"
```

Expected: `exit 0`, `errors: 0` and `warnings: 0`. Nothing to commit.

### Task 14: Review

**Files:** whatever the review finds.

- [ ] **Step 1: Ask for a review**

Use superpowers:requesting-code-review with a read-only reviewer: it reads `git -C ~/Dev/Crewluv diff 739abd3..feature/partner-cloud-source`, this plan, the spec (§5, §6, §9, §10.1) and `~/Dev/Duty/supabase/partner-api.md`, and runs no `xcodebuild` and no simulator. State facts neutrally, and don't tell it what not to flag.

- [ ] **Step 2: Act on it**

For each finding, fix it test-first where the harness can test it, re-run `"$HARNESS/run.sh"`, and commit. If any Swift changed, run Task 13 again. Note each fix in this plan's Execution notes.

### Task 15: The user runs Crewluve's tests

**Files:** none.

- [ ] **Step 1: Ask the user to run the tests in Xcode**

Send them these steps:

1. In Xcode, open `~/Dev/Crewluv/Crewluv.xcodeproj` if it isn't open. At the top of the window, check that the scheme says **Crewluv** and the destination is an iPhone **simulator** (such as iPhone 17 Pro), not your phone. On a phone, `CloudSummaryTests` skips, because it reads its fixtures from the Mac.
2. Press **⌘U** (Product → Test) and wait for it to finish.
3. Press **⌘6** to open the Test navigator. Red marks show failures.

Expected: no failures. The new suites, counted before Task 14's fixes:

| Suite | Tests |
|---|---|
| `CloudSummaryTests` | 16 |
| `PushEnvironmentTests` | 6 |
| `LivePartnerDoorTests` | 11 |
| `DeviceKeyTests` | 2 |
| `KeychainDeviceKeyStoreTests` | 5 |
| `PilotStatusSourceTests` | 24 |
| `RepeatingRefreshTests` | 3 |
| `PushRegistrarTests` | 8 |
| `PushRouteTests` | 6 |

- [ ] **Step 2: If anything fails, stop**

Ask for the test's name and its message. Fix the cause, never the test's expected value, then ask for another run.

### Task 16: The user's look, on their phone

**Files:** none.

- [ ] **Step 1: Offer the look, and say what it shows**

Ask the user one question: do they want to check, on their phone, that Crewluve still works on iCloud? It's their choice. 4a changes how every read is done, but nothing they'll see, so the look is about nothing having broken:
- Crewluve still shows the pilot's status, and pull-to-refresh still works.
- A change in CrewLu still wakes Crewluve and alerts, through iCloud's push.
- Running from Xcode replaces the App Store's Crewluve on that phone with this build, keeping its data, until the App Store version is installed again.

- [ ] **Step 2: If yes, send the steps**

1. Connect the iPhone that has Crewluve following a pilot. In Xcode, at the top of the window, check the scheme says **Crewluv**, and pick that iPhone as the destination.
2. Press **⌘R** (Product → Run). Crewluve opens and shows the pilot's status as before.
3. Pull down on the status to refresh. The sync line says "Synced just now".
4. Press and hold the sync line. The diagnostics sheet opens. Under **Crewlu Cloud Pushes** it says **On Crewlu Cloud: No**, **Environment: sandbox** and **Last Registration: Never**, which is right before plan 4b. Close it.
5. Leave Crewluve (swipe up to the Home Screen). In CrewLu, on the pilot's phone, set a quick status such as **Call Me** for this partner. Within a minute or so, Crewluve's alert arrives, as it did before.

Note anything that looks wrong with a screenshot (press the side button and volume up together).

### Task 17: Record the decisions

**Files (in `~/Dev/Crewluve Website`):**
- Modify: `docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md`, and this plan

- [ ] **Step 1: Add the planning decisions to the spec**

At the end of the spec, after §13, add `## 14. Decisions made while planning 4a`, followed by this plan's "Decisions made while planning" list, copied as it stands, and any changes from the review (Task 14). Then update its status line.

In `~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md`, replace:

```markdown
Plan 4a: `docs/superpowers/plans/2026-10-18-partner-links-piece4a-source.md`.
```

with:

```markdown
Plan 4a is built (`docs/superpowers/plans/2026-10-18-partner-links-piece4a-source.md`); next: plan 4b.
```

- [ ] **Step 2: Tick this plan and commit**

Run:

```bash
cd ~/"Dev/Crewluve Website" && git add docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md docs/superpowers/plans/2026-10-18-partner-links-piece4a-source.md && git commit -q -m "Plan 4a built: Crewluve's status source and pushes; spec records the planning decisions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit. Don't push.

### Task 18: Finish

**Files:** none.

- [ ] **Step 1: Ask how to merge**

4a changes how every partner's Crewluve reads the status, but nothing a partner sees, and it calls Crewlu Cloud only once a device has joined (plan 4b). Ask the user one question: merge `feature/partner-cloud-source` into `hotfix/icloud-account-unavailable` now, so the next 1.1.x build carries it, or keep it apart until 4b and 4c. To merge without changing any file on disk while Xcode is open: `git -C ~/Dev/Crewluv fetch . feature/partner-cloud-source:hotfix/icloud-account-unavailable`, a fast-forward that works only while the release line is still `739abd3`. Then switch to it (`git -C ~/Dev/Crewluv switch hotfix/icloud-account-unavailable`: the same commit, so no files change) and delete the branch with `git -C ~/Dev/Crewluv branch -d feature/partner-cloud-source`.

- [ ] **Step 2: Push only with a fresh yes**

Ask separately before each push: the branch Crewluve's work ends up on, in `~/Dev/Crewluv`, and `main` in `~/Dev/Crewluve Website`.

---

## Execution notes

Filled in during the build: any place the code ends up different from the printed blocks, and why.
