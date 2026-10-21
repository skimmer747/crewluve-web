# Partner Links Piece 4c: The Move-Over — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A partner who follows their pilot through iCloud moves to Crewlu Cloud by themselves, with no tap, once the pilot's CrewLu has moved them, and their other devices follow. Along the way, the switch fires no alerts, a device left behind is told how to follow, and an iCloud share link on a device already on Crewlu Cloud says so.

**Architecture:**
- **The ticket.** CrewLu writes `moveTicketByPartnerJSON` into the pilot's iCloud record: `{iCloud user record name: ticket}`. Each iCloud read brings this partner's ticket (`MoveTicket`).
- **The move-over takes its turn after each iCloud read**, once that read's status has shown. `MoveOver` tries three things in order:
  - a move under way: this device's key, saved before its redeem, and `partnerCloud.moveToPartnerID`;
  - the ticket, with `partner_handoff_redeem`;
  - another of this partner's devices, through the hand-off copy.
  It switches once Crewlu Cloud has a status. Otherwise it stays on iCloud, and the next read tries again.
- **The hand-off copy.** A third Keychain item, synced by iCloud Keychain, holds the key of this partner's device that moved most recently. Every switch saves it. Another device of the same partner checks that it shows the same pilot, then makes a code with it and joins with its own key.
- **The switch.** The source's connection changes move to `PilotStatusSource+Connecting.swift`. The move-over and a key a reinstall left both switch through the same `switchConnection` as a join, and keep what the alerts kept, since it's the same pilot.
- **When the share ends,** a move under way switches at once, and a hand-off copy is followed before the welcome screen shows. Failing both, the welcome screen's note says how to follow the other device (`SharingEndedNote`).
- **Tested on the Mac.** Everything but the views, the app's link wiring, the Keychain and CloudKit runs in the Mac harness, against stand-ins.

**Tech stack:** Swift 5 mode on iOS 26 (main actor by default, Approachable Concurrency), CloudKit, the Keychain with iCloud Keychain sync, typed throws, Observation, SwiftUI, Swift Testing.

**Design:** `docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md` in this repo:
- §8, the move-over;
- §7.6 and §7.7, the notes;
- §9 and §10;
- §14 and §15, what 4a and 4b left for 4c.

The contract is `~/Dev/Duty/supabase/partner-api.md`. Plans 4a and 4b (`docs/superpowers/plans/2026-10-18-partner-links-piece4a-source.md`, `docs/superpowers/plans/2026-10-19-partner-links-piece4b-connecting.md`) built what this one builds on.

---

## Before you start

- **Two repos.**
  - The code goes in `~/Dev/Crewluv` (Crewluve).
  - This plan and the spec live in `~/Dev/Crewluve Website`.
  - Paths are relative to `~/Dev/Crewluv` unless they start with `~`, `$HARNESS` or `$BUILD`.
- **Branch.** Keep building on `feature/partner-cloud-source`, where plan 4b and a later fix ended at `69865b3` (Task 0). Piece 4 ships as one release (spec §11), and the branch stays apart from the release line until then (Task 16).
- **Leave the untracked folders alone.** `~/Dev/Crewluv` has untracked `.claude/` and `.superpowers/` folders that aren't part of this work. Never run `git add -A` or `git add .` there. Add the exact paths each step lists.
- **Who runs which tests.**
  - **Crewluve's rule:** never run `xcodebuild test`, never boot a simulator, and never build against the copy the user has open in Xcode. The user runs Crewluve's tests (Task 13).
  - **The Mac harness (Task 1)** compiles Crewluve's model and service files and their tests unchanged, with the app's concurrency settings, and runs the Swift Testing tests in a small Swift package outside both repos. The test-first steps use it. It boots no simulator and shares no build folder with Xcode.
  - **Checked only in Xcode:**
    - `KeychainDeviceKeyStoreTests`, which needs the iOS Keychain, for the hand-off copy;
    - the welcome screen;
    - the app's share wiring (`AppDelegate`, `SceneDelegate`, `LinkRouter`).
    Task 11's compile, the review (Task 12) and the user's run (Task 13) check them.
  - **CloudKit's read of the ticket** (`ICloudStatusFetcher`) compiles in the harness but needs a real iCloud record. Its rule, `MoveTicket`, is tested. Spec §10.3's checks on real phones cover the rest.
  - **One compile-only build (Task 11)** checks the whole app and its tests, in a separate clone with its own build folder, then checks the test target's files in eight orders.
- **No live Crewlu Cloud, and no real partner moves.**
  - The tests answer for Crewlu Cloud through stand-ins.
  - This build moves a partner for real the first time it runs on a phone that follows a pilot through iCloud as a partner whose CrewLu has a ticket for them. Their CrewLu then counts them as moved.
  - So it runs on no such phone before spec §10.3's checks, which use a test pilot and a test partner (Task 14).
- **New files need no project edit.** `Crewluv/` and `CrewluvTests/` are synchronized folders, so a new file joins its target by itself. Editor errors such as "Cannot find type" on a new file are a stale index: trust the harness and Task 11.
- **Pick two scratch folders,** outside both repos: one for the harness (`$HARNESS`, Task 1) and one for the compile-only clone (`$BUILD`, Task 11).
  - Shell variables don't carry from one command to the next in Claude's Bash tool, so begin each command that uses them with `export HARNESS=<the folder> &&` (or `BUILD`).
  - Both must be absolute paths.
- **If an expected value doesn't match, stop and ask.** Never change a test to make it pass.

## Decisions made while planning

These refine the spec. Task 15 writes them into it.

1. **The ticket is read by this partner's iCloud user record name,** as the pilot's name for them is.
   - `moveTicketByPartnerJSON` holds `{record name: ticket}`.
   - An empty ticket, a field that doesn't read, or no record name means there's no ticket.
   - A ticket is never logged.
2. **A move under way is this device's key plus `partnerCloud.moveToPartnerID`.**
   - The redeem uses this device's own key, saved before it's sent, not 4b's pending key: a move asks no question.
   - The partner id marks the move, so a later read switches once Crewlu Cloud has a status, and a share that ends meanwhile ends nothing (§8.4).
   - A move ends with the switch, or when Crewlu Cloud answers `sharing_ended` for its key.
   - A move under way switches on its partner's first status whichever pilot iCloud showed, since its ticket came from this partner's own record.
3. **iCloud's status shows first, then the move-over takes its turn,** within the same read.
   - A slow Crewlu Cloud never holds up iCloud's status. This fixes 4a's wait of up to 20 seconds ahead of an iCloud read (spec §14).
   - A push or a refresh that comes during the turn waits for it, as for any read.
   - The turn belongs to its read: a switch since the read began, say by a join during the alerts' check, takes it away. A move under way also takes its turn after an iCloud read that failed, since it needs no record. (Both added by the review.)
4. **A key with no connection saved,** which a reinstall leaves (spec §5.3), is this device's last connection, so it wins over an iCloud share the launch finds again, as in 4b. (Changed by the review: as first planned, a status for another pilot gave way to the ticket, which undid 4b's reinstall case and sent that pilot's key with another partner's ticket, against `partner-api.md`.)
   - **With an iCloud share,** the move-over reads it first. A status switches, whichever pilot it's for. None yet gives way to the ticket, redeemed with the same key.
   - **Without one, or once the share is gone,** it connects whenever Crewlu Cloud answers for it, as in 4b.
   - **Either way,** it switches through the same `switchConnection` as a join. That lets the iCloud share go and sets `partnerCloud.leftICloud` (spec §15's items for 4c). It replaces no device, since the key is this device's own.
   - What the alerts kept stays only when the status is the same pilot's. Another pilot's statuses start afresh, so the switch alerts nothing.
5. **The hand-off copy is saved at every switch:** a join, the move-over, or a key a reinstall left.
   - It's deleted when this device forgets its key (sharing ended, or Disconnect) while the copy holds that key.
   - It's also deleted when the copy's own device answers `sharing_ended`.
   - A copy that shows another pilot is left alone, for the device it belongs to.
6. **Another device is followed** when the ticket was used or ran out (`sharing_ended`), when there's no ticket, and when the share ends.
   - The copy must show the pilot this device follows (`partnerCloud.pilotID`).
   - A ticket that can't be redeemed for any other reason (too many devices, try later, invalid, unreachable) waits for the next read.
7. **When the share ends during a move,** the switch happens even if Crewlu Cloud can't be reached just then, and the status shows when a read brings it. Only `sharing_ended` for the move's key ends the move.
   - **Without a move,** a copy that joins switches.
   - **A copy of this pilot's that can't make a code or join just then** leaves the welcome screen's note for a device left behind.
   - **Anything else** leaves today's "Sharing with Alex has ended."
8. **The note for a device left behind** reads "To keep seeing Alex's status here, type the code from CrewLuve on your other device."
   - It's saved (`partnerCloud.sharingEndedLeftBehind`), so it survives a relaunch, and it goes when the note does.
   - The wording lives in `SharingEndedNote`, and the source gives the screen whichever note applies.
9. **An iCloud share link on a device on Crewlu Cloud isn't accepted,** as the user chose while planning.
   - The alert **Already Connected** says "You're already connected to Alex. To follow another pilot, ask them for an invite link from CrewLu." with OK, and nothing changes.
   - Every way iOS hands the app a share goes through `LinkRouter`: a tap, a cold launch, or the paste box.
10. **The alerts compare a status's legs as legs** (`StatusChangeNotifier.legsDiffer`).
    - So the first Crewlu Cloud status after the switch alerts nothing, though its legs' keys come in another order. That also covers 4b's join to the same pilot.
    - Bytes that don't read as legs compare as bytes, as before.
    - The schedule rule reads only its arguments, so it became a static function, and a test checks it.
11. **Each step guards against a switch it didn't make.** A join that switches this device while the move-over waits on Crewlu Cloud wins, and the move-over stays as the join left it. A new key is never made while this device is connected. The review added two guards: when the share is gone, a join while another device is checked ends nothing, and a device a join switched makes no code with the copy.
12. **Files stay under 300 lines.**
    - The source's connection changes moved to `PilotStatusSource+Connecting.swift`: connect, the switch, Disconnect, sharing ended and its note.
    - The move-over's key steps live in `MoveOver`, not the device.
    - 4b's `CrewluCloudDevice.adoptLeftoverKey()` is gone: the move-over's `readUnconnectedKey()` serves both.
13. **A copy that shows another pilot is read with each iCloud read,** one `partner_view` each time. That happens only when one person follows two pilots on two devices under the same iCloud account, so it isn't cached.

## The four questions

- **Is this wise?**
  - It's what makes piece 4 reach today's partners: each moves to Crewlu Cloud without a tap, a link or a code, their second devices included, and nobody is disconnected.
  - It builds on 4b's switch, so the move-over, a join and a reinstall's key change the connection in one place.
  - CrewLu's "Needs Crewluve update" clears for a partner once their Crewluve redeems the ticket and has a device on Crewlu Cloud.
- **Will it break anything?**
  - *iCloud partners* see the same status, now shown before the move-over's turn rather than after a leftover key's read.
  - *The move-over itself* shows nothing until the switch. A failure stays on iCloud, and the next read tries again with the same key, so a retry reaches the same device.
  - *Alerts:* the switch keeps what the alerts kept, and the legs compare as legs, so the switch alerts nothing.
  - *A join during the move-over* wins, and the generation keeps the move-over from undoing it.
  - *Real partners:* none moves until this build reaches them in the release. Its first run on a real partner's phone moves them for real, so the real-phone checks use a test partner (spec §10.3).
  - *Privacy:* tickets, codes and keys are never logged (spec §9). The hand-off copy is readable only by Crewluve, on this partner's own devices, through end-to-end encrypted iCloud Keychain.
  - *A crash:* nothing new traps. 4c's app code has no `!`, `try!`, `as!` or `fatalError`.
- **Is this what a brilliant Apple engineer would do?**
  - iCloud Keychain's own sync for the copy (`kSecAttrSynchronizable`), typed throws for the door, the generation for every await, Swift Testing, and no packages, as Crewluve's `CLAUDE.md` asks.
  - The wording that can be tested lives outside the views.
- **Does it fix the disease or the symptom?** The disease is that iCloud partners stay on iCloud, which fails whenever iCloud does, until someone helps them move. 4c moves them by themselves, on the read they already make.

## Not in this plan

- Spec §10.3's checks on real phones, with a test pilot on CrewLu's TestFlight build and a test partner, before the release. Step 5 is the move-over's.
- Removing the hand-off copy in piece 6 (spec §8.3).
- Left as they are by 4b's review: the waiting screen has no ••• menu, and the Synced row keeps its `icloud.fill` icon on Crewlu Cloud.
- Merging into the release line (Task 16).

## How this plan was checked

- **Built test-first in a scratch clone** of `69865b3`, outside `~/Dev/Crewluv`.
- **The Swift tests:**
  - The Mac harness ran all 307, and every commit passed on its own.
  - They caught all 72 deliberate breaks, one at a time, in these areas: the alerts' legs, the ticket, the device's switch and forgetting, the move-over's three steps, a share gone during a move, following another device, this device's unconnected key, the move's redeem, the source's turn and switch, the note, the joiner and the messages.
  - The first run, of 72, missed 15, each a case no test reached; each now has a test:
    - six races with a join that switches this device while the move-over waits on Crewlu Cloud;
    - the alerts' rule at the switch, which became static so a test can reach it (decision 10);
    - a move under way whose pilot iCloud hadn't saved, or that can't reach Crewlu Cloud;
    - another device's code before the pilot's first status there;
    - a ticket that can't be redeemed now while a copy exists;
    - four in the source: the turn after an unchanged iCloud read, the switch's report, a share gone while Crewlu Cloud can't be reached, and the left-behind flag after the next status.
  - The Keychain's hand-off copy has three tests that run only in Xcode (Task 13).
- **Re-reading the code before the mutation run** found a `leave` that could never fire in the switch to a key this device already holds, now gone (decision 4), and moved the choice of the welcome screen's note into the source, where a test checks it.
- **The compile-only build** of the whole app and its tests passed in the scratch clone, with no warnings, and so did the order check, in all eight orders.
- **A replay on a fresh clone of `69865b3`:** every Run step gave the result printed here, including each test-first failure, and every file matched the scratch copy byte for byte. Task 11's build and order check passed on the replayed branch.

## Files

In `~/Dev/Crewluv`:

| File | Responsibility |
|---|---|
| `Crewluv/Services/PartnerCloud/MoveTicket.swift` | This partner's ticket in the pilot's iCloud record |
| `Crewluv/Services/PartnerCloud/MoveOver.swift` | The move-over: a move under way, the ticket, another of this partner's devices, a share gone during a move, and this device's key while it isn't connected with it |
| `Crewluv/Services/PilotStatusSource+Connecting.swift` | The source's connection changes: connect, the switch, Disconnect, sharing ended, and the welcome screen's note |
| `Crewluv/Models/SharingEndedNote.swift` | The welcome screen's note, for a device left behind too |
| `Crewluv/Models/TripLeg.swift`, `Crewluv/Services/StatusChangeNotifier.swift` (changed) | The alerts compare legs as legs; the schedule rule is static |
| `Crewluv/Services/ICloudStatusFetcher.swift` (changed) | Each read brings this partner's ticket |
| `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift` (changed) | The hand-off copy, in iCloud Keychain |
| `Crewluv/Models/PartnerConnection.swift` (changed) | A move under way, and whether the note is for a device left behind |
| `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift` (changed) | A switch saves the copy and ends a move; forgetting deletes this device's own copy |
| `Crewluv/Services/PilotStatusSource.swift` (changed) | The move-over's turn after an iCloud read, and a share gone during a move |
| `Crewluv/Services/PartnerStatusReceiver.swift`, `Crewluv/Views/Welcome/ContentView.swift`, `WelcomeView.swift` (changed) | The note on the welcome screen |
| `Crewluv/Models/JoinMessage.swift`, `Crewluv/Services/PartnerJoiner.swift` (changed) | Already Connected |
| `Crewluv/App/LinkRouter.swift`, `AppDelegate.swift`, `SceneDelegate.swift` (changed) | Every iCloud share goes through the router |
| `CrewluvTests/LegsComparisonTests.swift`, `MoveTicketTests.swift`, `MoveOverTests.swift`, `SharingEndedNoteTests.swift` | The new tests |
| `CrewluvTests/KeychainDeviceKeyStoreTests.swift`, `CrewluCloudDeviceTests.swift`, `PilotStatusSourceTests.swift`, `JoinMessageTests.swift`, `PartnerJoinerTests.swift`, `Helpers/PartnerCloudStandIns.swift` (changed) | Tests and stand-ins for the changes |

In `~/Dev/Crewluve Website`: this plan, ticked as it goes, and the piece 4 spec (Task 15).

Outside both repos: the Mac harness (`$HARNESS`, Task 1) and the compile-only clone with the order check (`$BUILD`, Task 11).

---

### Task 0: The branch

- [x] **Step 1: Check the working tree**

Run:

```bash
git -C ~/Dev/Crewluv status --short
```

Expected: only `?? .claude/` and `?? .superpowers/`. If anything else shows, stop and ask the user.

- [x] **Step 2: Check the branch and its tip**

Run:

```bash
git -C ~/Dev/Crewluv branch --show-current && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: `feature/partner-cloud-source`, then `69865b3 fix(crewluv): Hanoi and Ho Chi Minh City get their flag, code and greeting`, the fix that followed plan 4b. If either differs, stop and ask: this plan was checked against `69865b3`. 4c builds on the same branch, since piece 4 ships as one release (spec §11).

### Task 1: The Mac harness

**Files (outside both repos):** `$HARNESS/Package.swift`, `$HARNESS/run.sh`

Plan 4b's harness, with 4c's two new model and service files added to its list (`Models/SharingEndedNote.swift`, `Services/PilotStatusSource+Connecting.swift`); `Services/PartnerCloud/` is copied whole, so `MoveOver.swift` and `MoveTicket.swift` need no entry. A Swift package that compiles Crewluve's model and service files and their tests unchanged, on the Mac, and runs the Swift Testing tests. The app target gets the app's settings: Swift 5 mode, the main actor by default, Approachable Concurrency and member import visibility. The test target gets the same, without the main actor default, as `CrewluvTests` has.

`run.sh` copies the files that exist so far from `~/Dev/Crewluv` (or `$CREWLUV`, which must be an absolute path), takes the app's notification names out of `CrewluvApp.swift`, and links the fixtures, then runs `swift test`. It needs no Xcode project, no simulator and no network, and it builds into its own `.build` folder. Views, `AppDelegate`, `SceneDelegate`, `LinkRouter`, `BackgroundRefreshManager` and XCTest files aren't copied: they need UIKit, BackgroundTasks or SwiftUI's iOS views. If plan 4b's harness folder is still there, these two files replace its own.

- [x] **Step 1: Write the package**

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

- [x] **Step 2: Write the runner**

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
         Models/PartnerConnection.swift Models/PilotReading.swift Models/PilotStatusUpdate.swift \
         Models/PilotReading+LegChanges.swift Models/PartnerLink.swift Models/OpenedLink.swift Models/JoinMessage.swift \
         Models/HandOffCode.swift Models/DisconnectQuestion.swift Models/SyncLineWording.swift Models/SharedPilotStatus+Named.swift \
         Models/SharingEndedNote.swift \
         Services/StatusChangeNotifier.swift Services/NotificationDiagnostics.swift \
         Services/CloudKitShareManager.swift Services/CloudKitSubscriptionManager.swift \
         Services/PartnerStatusReceiver.swift Services/ICloudStatusFetcher.swift \
         Services/PilotStatusSource.swift Services/PilotStatusSource+Connecting.swift Services/PushRegistrar.swift Services/PushRoute.swift \
         Services/RepeatingRefresh.swift Services/PeriodicCheck.swift Services/StatusNotifying.swift Services/PartnerJoiner.swift \
         Utils/DebugLog.swift Utils/PushEnvironment.swift Utils/OneTimeCompletion.swift Utils/ReadQueue.swift; do
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

- [x] **Step 3: Run today's tests**

Run:

```bash
chmod +x "$HARNESS/run.sh" && "$HARNESS/run.sh"
```

Expected: `Test run with 232 tests in 24 suites passed`: Crewluve's Swift Testing tests as plan 4b left them, without the Keychain's. The first build takes about a minute; later runs take seconds. Nothing to commit: the harness isn't part of Crewluve.

### Task 2: The alerts compare legs as legs

**Files:**
- Modify: `Crewluv/Models/TripLeg.swift`, `Crewluv/Services/StatusChangeNotifier.swift`
- Test: `CrewluvTests/LegsComparisonTests.swift`

Spec §14, left for 4c, and decision 10. iCloud's and Crewlu Cloud's statuses carry the same legs with their keys in another order, and iCloud's with fields Crewluve doesn't read. Compared as bytes, the first Crewlu Cloud status after the switch would alert "Departure changed" whenever its next departure differs. So the alerts compare legs as legs, and bytes that don't read as legs compare as bytes, as before. The schedule rule reads only its arguments, so it becomes a static function, and a test checks the switch through it. `TripLeg` becomes nonisolated, so the alerts' actor can decode it.

- [x] **Step 1: Write the failing tests**

File: `CrewluvTests/LegsComparisonTests.swift`

```swift
//
//  LegsComparisonTests.swift
//  CrewluvTests
//
//  The alerts compare a status's legs as legs, not as bytes (partner links piece 4 spec §14)
//

import Foundation
import Testing
@testable import Crewluv

@MainActor
struct LegsComparisonTests {
    private static func legs(_ json: String) -> Data {
        Data(json.utf8)
    }

    private static let crewluCloud = legs(#"[{"endTime":1792612800,"flightNumber":"5X123","id":"1","startTime":1792605600,"type":"flight"}]"#)

    @Test func test_theSameLegs_inAnotherKeyOrder_areTheSame() {
        let iCloud = Self.legs(#"[{"id":"1","type":"flight","startTime":1792605600,"endTime":1792612800,"flightNumber":"5X123"}]"#)

        #expect(!StatusChangeNotifier.legsDiffer(iCloud, Self.crewluCloud))
    }

    @Test func test_aFieldThisAppDoesntRead_changesNothing() {
        let iCloud = Self.legs(#"[{"id":"1","type":"flight","startTime":1792605600,"endTime":1792612800,"flightNumber":"5X123","gate":"B7"}]"#)

        #expect(!StatusChangeNotifier.legsDiffer(iCloud, Self.crewluCloud))
    }

    @Test func test_aChangedLeg_differs() {
        let later = Self.legs(#"[{"endTime":1792616400,"flightNumber":"5X123","id":"1","startTime":1792605600,"type":"flight"}]"#)

        #expect(StatusChangeNotifier.legsDiffer(Self.crewluCloud, later))
    }

    @Test func test_legsAndNone_differ() {
        #expect(StatusChangeNotifier.legsDiffer(nil, Self.crewluCloud))
        #expect(StatusChangeNotifier.legsDiffer(Self.crewluCloud, nil))
        #expect(!StatusChangeNotifier.legsDiffer(nil, nil))
    }

    @Test func test_bytesThatDontReadAsLegs_compareAsBytes() {
        #expect(!StatusChangeNotifier.legsDiffer(Self.legs("not legs"), Self.legs("not legs")))
        #expect(StatusChangeNotifier.legsDiffer(Self.legs("not legs"), Self.crewluCloud))
    }

    // MARK: - The Alerts at the Switch

    /// A status on a trip whose next departure is at `departure`, with `legs` as its legs' bytes.
    private static func status(legs: Data, departure: TimeInterval) throws -> SharedPilotStatus {
        let status = try Make.summary(["currentTripId": "trip", "nextDepartureTime": departure])
            .pilotStatus(partnerID: Make.partnerA, at: .now)
        var json = try #require(JSONSerialization.jsonObject(with: JSONEncoder().encode(status)) as? [String: Any])
        json["tripLegsJSON"] = legs.base64EncodedString()
        return try JSONDecoder().decode(SharedPilotStatus.self, from: JSONSerialization.data(withJSONObject: json))
    }

    @Test func test_theSwitch_alertsNoNewDeparture_forTheSameLegsInAnotherKeyOrder() throws {
        let iCloudLegs = Self.legs(#"[{"id":"1","type":"flight","startTime":1792605600,"endTime":1792612800,"flightNumber":"5X123"}]"#)
        let iCloud = try Self.status(legs: iCloudLegs, departure: 1_792_605_600)
        // Crewlu Cloud's writer picked another next departure from the same legs, as it can each time one passes.
        let crewluCloud = try Self.status(legs: Self.crewluCloud, departure: 1_792_612_800)

        #expect(StatusChangeNotifier.evaluateScheduleChanges(old: iCloud, new: crewluCloud, name: "Dad").isEmpty)
    }

    @Test func test_aLegThatChanged_stillAlertsTheNewDeparture() throws {
        let later = Self.legs(#"[{"endTime":1792616400,"flightNumber":"5X123","id":"1","startTime":1792609200,"type":"flight"}]"#)
        let old = try Self.status(legs: Self.crewluCloud, departure: 1_792_605_600)
        let new = try Self.status(legs: later, departure: 1_792_609_200)

        #expect(StatusChangeNotifier.evaluateScheduleChanges(old: old, new: new, name: "Dad").map(\.id) == ["schedule-departure"])
    }
}
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `type 'StatusChangeNotifier' has no member 'legsDiffer'`.

- [x] **Step 3: Let the alerts' actor read legs**

One replacement in `Crewluv/Models/TripLeg.swift`:

In `Crewluv/Models/TripLeg.swift`, replace:

```swift

import Foundation

struct TripLeg: Codable, Sendable {
    enum LegType: String, Codable, Sendable {
        case flight, turn, layover, home, base
        case drive                       // ground commute (base <-> home)
        case reserve, hotStandby, event  // future
```

with:

```swift

import Foundation

/// Nonisolated, so the alerts compare legs off the main actor (partner links piece 4 spec §14).
nonisolated struct TripLeg: Codable, Sendable, Equatable {
    nonisolated enum LegType: String, Codable, Sendable {
        case flight, turn, layover, home, base
        case drive                       // ground commute (base <-> home)
        case reserve, hotStandby, event  // future
```

- [x] **Step 4: Compare legs as legs, in a static rule**

5 replacements, in order, in `Crewluv/Services/StatusChangeNotifier.swift`:

In `Crewluv/Services/StatusChangeNotifier.swift`, replace:

```swift
        var notifications: [NotificationSpec] = []

        // Schedule changes
        notifications += evaluateScheduleChanges(old: baseline, new: new, name: pilotName, resolvedHomeArrivalTime: resolvedHomeArrivalTime)

        // Quick status
        notifications += evaluateQuickStatus(old: baseline, new: new, name: pilotName)
```

with:

```swift
        var notifications: [NotificationSpec] = []

        // Schedule changes
        notifications += Self.evaluateScheduleChanges(old: baseline, new: new, name: pilotName, resolvedHomeArrivalTime: resolvedHomeArrivalTime)

        // Quick status
        notifications += evaluateQuickStatus(old: baseline, new: new, name: pilotName)
```

In `Crewluv/Services/StatusChangeNotifier.swift`, replace:

```swift

    // MARK: - Schedule Changes

    private func evaluateScheduleChanges(
        old: SharedPilotStatus,
        new: SharedPilotStatus,
        name: String,
```

with:

```swift

    // MARK: - Schedule Changes

    /// The schedule's alerts between two statuses. It reads only what it's given, so it's static, and
    /// a test checks that the switch to Crewlu Cloud alerts nothing (partner links piece 4 spec §14).
    nonisolated static func evaluateScheduleChanges(
        old: SharedPilotStatus,
        new: SharedPilotStatus,
        name: String,
```

In `Crewluv/Services/StatusChangeNotifier.swift`, replace:

```swift
        // diff is wall-clock drift from the resolver picking a different leg.
        let effectiveNewHome = resolvedHomeArrivalTime ?? new.homeArrivalTime
        let publishedHomeChanged = old.homeArrivalTime != effectiveNewHome
        let legsChanged = old.tripLegsJSON != new.tripLegsJSON

        if (publishedHomeChanged || legsChanged),
           let oldHome = old.homeArrivalTime, let newHome = effectiveNewHome {
```

with:

```swift
        // diff is wall-clock drift from the resolver picking a different leg.
        let effectiveNewHome = resolvedHomeArrivalTime ?? new.homeArrivalTime
        let publishedHomeChanged = old.homeArrivalTime != effectiveNewHome
        let legsChanged = Self.legsDiffer(old.tripLegsJSON, new.tripLegsJSON)

        if (publishedHomeChanged || legsChanged),
           let oldHome = old.homeArrivalTime, let newHome = effectiveNewHome {
```

In `Crewluv/Services/StatusChangeNotifier.swift`, replace:

```swift
        }

        return specs
    }

    // MARK: - Quick Status
```

with:

```swift
        }

        return specs
    }

    // MARK: - Legs

    /// Whether two statuses' legs differ, compared as legs: iCloud and Crewlu Cloud write the same
    /// legs with their keys in another order, and iCloud's with fields this app doesn't read
    /// (partner links piece 4 spec §14). Bytes that don't read as legs compare as bytes, as before.
    nonisolated static func legsDiffer(_ old: Data?, _ new: Data?) -> Bool {
        guard let old, let new, let oldLegs = legs(in: old), let newLegs = legs(in: new) else { return old != new }
        return oldLegs != newLegs
    }

    private nonisolated static func legs(in data: Data) -> [TripLeg]? {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .secondsSince1970
        return try? decoder.decode([TripLeg].self, from: data)
    }

    // MARK: - Quick Status
```

In `Crewluv/Services/StatusChangeNotifier.swift`, replace:

```swift

    // MARK: - Notification Delivery

    private struct NotificationSpec {
        let id: String
        let title: String
        let body: String
```

with:

```swift

    // MARK: - Notification Delivery

    struct NotificationSpec {
        let id: String
        let title: String
        let body: String
```

- [x] **Step 5: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 239 tests in 25 suites passed`.

- [x] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Models/TripLeg.swift Crewluv/Services/StatusChangeNotifier.swift CrewluvTests/LegsComparisonTests.swift && git -C ~/Dev/Crewluv commit -q -m "fix(crewluv): the alerts compare a status's legs as legs, whichever side wrote them" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 3: Each iCloud read brings this partner's ticket

**Files:**
- Create: `Crewluv/Services/PartnerCloud/MoveTicket.swift`
- Modify: `Crewluv/Services/ICloudStatusFetcher.swift`
- Test: `CrewluvTests/MoveTicketTests.swift`

Spec §8.1 and decision 1. CrewLu writes `moveTicketByPartnerJSON` into the pilot's iCloud record: a JSON object from each moved partner's iCloud user record name to their ticket. `MoveTicket` picks this partner's. `ICloudStatusFetcher` reads it with each read, by the record name it already looks up for the pilot's name for this partner, now looked up in one place. CloudKit's part needs a real record, so only `MoveTicket` is tested here; spec §10.3's checks cover the rest.

- [x] **Step 1: Write the failing tests**

File: `CrewluvTests/MoveTicketTests.swift`

```swift
//
//  MoveTicketTests.swift
//  CrewluvTests
//
//  This partner's move-over ticket in the pilot's iCloud record (partner links piece 4 spec §8.1)
//

import Foundation
import Testing
@testable import Crewluv

struct MoveTicketTests {
    /// As CrewLu writes it: `{iCloud user record name: ticket}`, with sorted keys.
    private static let tickets = Data(#"{"_0a1b":"ticket-for-mom","_2c3d":"ticket-for-ruthanne"}"#.utf8)

    @Test func test_thisPartnersTicket() {
        #expect(MoveTicket.ticket(in: Self.tickets, for: "_2c3d") == "ticket-for-ruthanne")
    }

    @Test func test_noTicketForThisPartner() {
        #expect(MoveTicket.ticket(in: Self.tickets, for: "_4e5f") == nil)
    }

    @Test func test_withoutThisPartnersRecordName_noTicket() {
        #expect(MoveTicket.ticket(in: Self.tickets, for: nil) == nil)
    }

    @Test func test_noField_orOneThatDoesntRead_givesNoTicket() {
        #expect(MoveTicket.ticket(in: nil, for: "_2c3d") == nil)
        #expect(MoveTicket.ticket(in: Data("not tickets".utf8), for: "_2c3d") == nil)
        #expect(MoveTicket.ticket(in: Data(#"{"_2c3d":""}"#.utf8), for: "_2c3d") == nil)
    }

    @Test func test_theRecordsField() {
        #expect(MoveTicket.recordKey == "moveTicketByPartnerJSON")
    }
}
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `cannot find 'MoveTicket' in scope`.

- [x] **Step 3: Pick this partner's ticket**

File: `Crewluv/Services/PartnerCloud/MoveTicket.swift`

```swift
//
//  MoveTicket.swift
//  CrewLuve
//
//  This partner's move-over ticket in the pilot's iCloud record
//

import Foundation

/// The move-over's tickets in the pilot's iCloud record (partner links piece 4 spec §8.1): CrewLu
/// writes `{iCloud user record name: ticket}` for each partner it moved to Crewlu Cloud who hasn't
/// moved over yet. A ticket joins Crewlu Cloud once, as that partner, so it's never logged (§9).
nonisolated enum MoveTicket {
    /// The record's field.
    static let recordKey = "moveTicketByPartnerJSON"

    /// The ticket for the partner whose iCloud user record name is `recordName`, or nil when there's
    /// none for them, or the field doesn't read.
    static func ticket(in tickets: Data?, for recordName: String?) -> String? {
        guard let tickets, let recordName,
              let ticketByRecordName = try? JSONDecoder().decode([String: String].self, from: tickets),
              let ticket = ticketByRecordName[recordName], !ticket.isEmpty
        else { return nil }
        return ticket
    }
}
```

- [x] **Step 4: Read it with each iCloud read**

3 replacements, in order, in `Crewluv/Services/ICloudStatusFetcher.swift`:

In `Crewluv/Services/ICloudStatusFetcher.swift`, replace:

```swift
    let isDisplayNameKnown: Bool
    /// When CloudKit last saved the record, for the debug log of leg changes.
    let recordModifiedAt: Date?
}

/// Why an iCloud read gave no status.
```

with:

```swift
    let isDisplayNameKnown: Bool
    /// When CloudKit last saved the record, for the debug log of leg changes.
    let recordModifiedAt: Date?
    /// This partner's move-over ticket in the record, once the pilot's CrewLu has moved them to
    /// Crewlu Cloud (partner links piece 4 spec §8.1).
    var moveTicket: String? = nil
}

/// Why an iCloud read gave no status.
```

In `Crewluv/Services/ICloudStatusFetcher.swift`, replace:

```swift
            status: status,
            displayName: name.name,
            isDisplayNameKnown: name.isKnown,
            recordModifiedAt: record.modificationDate
        )
    }

    /// The name the pilot set for this partner, looked up strictly by this partner's own iCloud
```

with:

```swift
            status: status,
            displayName: name.name,
            isDisplayNameKnown: name.isKnown,
            recordModifiedAt: record.modificationDate,
            moveTicket: await moveTicket(in: record)
        )
    }

    /// This partner's iCloud user record name, looked up once. It keys the pilot's names for each
    /// partner, and the move-over's tickets.
    private func recordName() async -> String? {
        if userRecordName == nil {
            userRecordName = try? await container.userRecordID().recordName
        }
        return userRecordName
    }

    /// This partner's move-over ticket, if the record has one for them (spec §8.1).
    private func moveTicket(in record: CKRecord) async -> String? {
        guard let tickets = record[MoveTicket.recordKey] as? Data else { return nil }
        return MoveTicket.ticket(in: tickets, for: await recordName())
    }

    /// The name the pilot set for this partner, looked up strictly by this partner's own iCloud
```

In `Crewluv/Services/ICloudStatusFetcher.swift`, replace:

```swift
    private func displayName(in status: SharedPilotStatus) async -> (name: String?, isKnown: Bool) {
        let names = status.displayNameByPartner
        guard !names.isEmpty else { return (nil, true) }
        if userRecordName == nil {
            userRecordName = try? await container.userRecordID().recordName
        }
        guard let userRecordName else { return (nil, false) }
        guard let name = names[userRecordName], !name.isEmpty else { return (nil, true) }
        return (name, true)
    }
```

with:

```swift
    private func displayName(in status: SharedPilotStatus) async -> (name: String?, isKnown: Bool) {
        let names = status.displayNameByPartner
        guard !names.isEmpty else { return (nil, true) }
        guard let userRecordName = await recordName() else { return (nil, false) }
        guard let name = names[userRecordName], !name.isEmpty else { return (nil, true) }
        return (name, true)
    }
```

- [x] **Step 5: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 244 tests in 26 suites passed`.

- [x] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PartnerCloud/MoveTicket.swift Crewluv/Services/ICloudStatusFetcher.swift CrewluvTests/MoveTicketTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): an iCloud read brings this partner's move-over ticket" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 4: The hand-off copy

**Files:**
- Modify: `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift`
- Test: `CrewluvTests/KeychainDeviceKeyStoreTests.swift`, `CrewluvTests/Helpers/PartnerCloudStandIns.swift`

Spec §8.3 (P4-2) and decision 5. A third Keychain item, `handOffCopy`, holds the key of this partner's device that moved most recently, for their other devices. Unlike this device's key and the pending key, it syncs through iCloud Keychain (`kSecAttrSynchronizable`), and it's readable after the first unlock, so a push in the background can use it. Every query for it names `kSecAttrSynchronizable`, since a query without it finds only items that don't sync. `KeychainDeviceKeyStoreTests` runs only in Xcode (Task 13): the harness can't reach the iOS Keychain, so `run.sh` leaves it out.

- [x] **Step 1: Write the failing tests**

3 replacements, in order, in `CrewluvTests/KeychainDeviceKeyStoreTests.swift`:

In `CrewluvTests/KeychainDeviceKeyStoreTests.swift`, replace:

```swift
//  KeychainDeviceKeyStoreTests.swift
//  CrewluvTests
//
//  The device key and the pending key in the Keychain (partner links piece 4 spec §5.3). These
//  run only in Xcode: the Mac harness can't reach the iOS Keychain.
//

import Foundation
```

with:

```swift
//  KeychainDeviceKeyStoreTests.swift
//  CrewluvTests
//
//  The device key, the pending key and the hand-off copy in the Keychain (partner links piece 4
//  spec §5.3, §8.3). These run only in Xcode: the Mac harness can't reach the iOS Keychain.
//

import Foundation
```

In `CrewluvTests/KeychainDeviceKeyStoreTests.swift`, replace:

```swift
    init() {
        store.forgetDeviceKey()
        store.forgetPendingKey()
    }

    @Test func test_noKey_readsNil() throws {
```

with:

```swift
    init() {
        store.forgetDeviceKey()
        store.forgetPendingKey()
        store.forgetHandOffCopy()
    }

    @Test func test_noKey_readsNil() throws {
```

In `CrewluvTests/KeychainDeviceKeyStoreTests.swift`, replace:

```swift
        #expect(attributes[kSecAttrAccessible as String] as? String == kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly as String)
        #expect(attributes[kSecAttrSynchronizable as String] as? Bool != true)
    }
}
```

with:

```swift
        #expect(attributes[kSecAttrAccessible as String] as? String == kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly as String)
        #expect(attributes[kSecAttrSynchronizable as String] as? Bool != true)
    }

    // MARK: - The Hand-Off Copy

    @Test func test_handOffCopy_isKeptApartFromTheDeviceKey() throws {
        store.save(deviceKey: "device")
        #expect(store.save(handOffCopy: "copy"))
        #expect(try store.handOffCopy() == "copy")
        #expect(try store.deviceKey() == "device")

        store.forgetHandOffCopy()
        #expect(try store.handOffCopy() == nil)
        #expect(try store.deviceKey() == "device")
    }

    @Test func test_handOffCopy_replacesTheLastOne() throws {
        store.save(handOffCopy: "first")
        #expect(store.save(handOffCopy: "second"))
        #expect(try store.handOffCopy() == "second")
    }

    @Test func test_handOffCopy_syncsThroughICloudKeychain_andCanBeReadWhileLocked() throws {
        store.save(handOffCopy: "copy")
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "com.ToddAnderson.Crewluv.partnerCloud.tests",
            kSecAttrAccount as String: "handOffCopy",
            kSecAttrSynchronizable as String: true,
            kSecReturnAttributes as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: CFTypeRef?
        #expect(SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess)
        let attributes = try #require(result as? [String: Any])

        #expect(attributes[kSecAttrAccessible as String] as? String == kSecAttrAccessibleAfterFirstUnlock as String)
        #expect(attributes[kSecAttrSynchronizable as String] as? Bool == true)
    }
}
```

- [x] **Step 2: Give the stand-in a copy**

2 replacements, in order, in `CrewluvTests/Helpers/PartnerCloudStandIns.swift`:

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift
final class InMemoryDeviceKeyStore: DeviceKeyStore {
    var key: String?
    var pending: String?
    /// While true, reading a key fails, as the Keychain's does before the phone's first unlock.
    var readFails = false
    /// While true, saving a key fails.
```

with:

```swift
final class InMemoryDeviceKeyStore: DeviceKeyStore {
    var key: String?
    var pending: String?
    /// The hand-off copy, as iCloud Keychain would carry it from another of this partner's devices.
    var copy: String?
    /// While true, reading a key fails, as the Keychain's does before the phone's first unlock.
    var readFails = false
    /// While true, saving a key fails.
```

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift

    func forgetPendingKey() {
        pending = nil
    }
}
```

with:

```swift

    func forgetPendingKey() {
        pending = nil
    }

    func handOffCopy() throws(DeviceKeyUnreadable) -> String? {
        if readFails {
            throw DeviceKeyUnreadable(status: errSecInteractionNotAllowed)
        }
        return copy
    }

    func save(handOffCopy: String) -> Bool {
        guard !savesFail else { return false }
        copy = handOffCopy
        return true
    }

    func forgetHandOffCopy() {
        copy = nil
    }
}
```

- [x] **Step 3: Keep the copy in iCloud Keychain**

4 replacements, in order, in `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift`:

In `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift`, replace:

```swift
    let status: OSStatus
}

/// Where this device keeps its partner-door key, and the key it joins with until it's connected
/// (spec §5.3).
protocol DeviceKeyStore {
    /// This device's key, or nil when it has none.
    func deviceKey() throws(DeviceKeyUnreadable) -> String?
```

with:

```swift
    let status: OSStatus
}

/// Where this device keeps its partner-door key, the key it joins with until it's connected
/// (spec §5.3), and the hand-off copy (§8.3).
protocol DeviceKeyStore {
    /// This device's key, or nil when it has none.
    func deviceKey() throws(DeviceKeyUnreadable) -> String?
```

In `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift`, replace:

```swift
    /// Saves the pending key in place of any other. False if it couldn't be saved.
    @discardableResult func save(pendingKey: String) -> Bool
    func forgetPendingKey()
}

/// This device's keys in the Keychain, each as a generic password for this device only. iOS can
/// read them in the background once the phone has been unlocked since it started, so a push at night
/// still finds the key. They never sync, and never move to another device in a backup.
struct KeychainDeviceKeyStore: DeviceKeyStore {
    static let service = "com.ToddAnderson.Crewluv.partnerCloud"
    private static let deviceAccount = "deviceKey"
    private static let pendingAccount = "pendingKey"

    private let service: String
```

with:

```swift
    /// Saves the pending key in place of any other. False if it couldn't be saved.
    @discardableResult func save(pendingKey: String) -> Bool
    func forgetPendingKey()

    /// The hand-off copy: the key of this partner's device that moved to Crewlu Cloud most recently,
    /// which their other devices read to follow it there (spec §8.3). Nil when there's none.
    func handOffCopy() throws(DeviceKeyUnreadable) -> String?
    /// Saves the hand-off copy in place of any other. False if it couldn't be saved.
    @discardableResult func save(handOffCopy: String) -> Bool
    func forgetHandOffCopy()
}

/// The keys in the Keychain, each as a generic password that iOS can read in the background once the
/// phone has been unlocked since it started, so a push at night still finds them. This device's key
/// and the pending key are for this device only: they never sync, and never move to another device
/// in a backup. The hand-off copy syncs through iCloud Keychain, which only Crewluve on this partner's
/// own devices can read, encrypted end to end (spec §8.3).
struct KeychainDeviceKeyStore: DeviceKeyStore {
    static let service = "com.ToddAnderson.Crewluv.partnerCloud"

    /// Where each key is kept.
    private enum Slot: String {
        case device = "deviceKey"
        case pending = "pendingKey"
        case handOffCopy

        var syncs: Bool { self == .handOffCopy }
    }

    private let service: String
```

In `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift`, replace:

```swift
    }

    func deviceKey() throws(DeviceKeyUnreadable) -> String? {
        try key(in: Self.deviceAccount)
    }

    @discardableResult
    func save(deviceKey: String) -> Bool {
        save(deviceKey, in: Self.deviceAccount)
    }

    func forgetDeviceKey() {
        SecItemDelete(item(Self.deviceAccount) as CFDictionary)
    }

    func pendingKey() throws(DeviceKeyUnreadable) -> String? {
        try key(in: Self.pendingAccount)
    }

    @discardableResult
    func save(pendingKey: String) -> Bool {
        save(pendingKey, in: Self.pendingAccount)
    }

    func forgetPendingKey() {
        SecItemDelete(item(Self.pendingAccount) as CFDictionary)
    }

    /// Nil when the Keychain has no key in `account`, or holds one that isn't text, which can't be
    /// used and which the next save replaces. Any other failure throws.
    private func key(in account: String) throws(DeviceKeyUnreadable) -> String? {
        var query = item(account)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
```

with:

```swift
    }

    func deviceKey() throws(DeviceKeyUnreadable) -> String? {
        try key(in: .device)
    }

    @discardableResult
    func save(deviceKey: String) -> Bool {
        save(deviceKey, in: .device)
    }

    func forgetDeviceKey() {
        SecItemDelete(item(.device) as CFDictionary)
    }

    func pendingKey() throws(DeviceKeyUnreadable) -> String? {
        try key(in: .pending)
    }

    @discardableResult
    func save(pendingKey: String) -> Bool {
        save(pendingKey, in: .pending)
    }

    func forgetPendingKey() {
        SecItemDelete(item(.pending) as CFDictionary)
    }

    func handOffCopy() throws(DeviceKeyUnreadable) -> String? {
        try key(in: .handOffCopy)
    }

    @discardableResult
    func save(handOffCopy: String) -> Bool {
        save(handOffCopy, in: .handOffCopy)
    }

    func forgetHandOffCopy() {
        SecItemDelete(item(.handOffCopy) as CFDictionary)
    }

    /// Nil when the Keychain has no key in `slot`, or holds one that isn't text, which can't be used
    /// and which the next save replaces. Any other failure throws.
    private func key(in slot: Slot) throws(DeviceKeyUnreadable) -> String? {
        var query = item(slot)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
```

In `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift`, replace:

```swift
            return nil
        }
        guard status == errSecSuccess else {
            debugLog("[DeviceKey] The \(account) couldn't be read: OSStatus \(status)")
            throw DeviceKeyUnreadable(status: status)
        }
        guard let data = result as? Data, let key = String(data: data, encoding: .utf8) else {
            debugLog("[DeviceKey] The Keychain holds a \(account) that isn't text")
            return nil
        }
        return key
    }

    private func save(_ key: String, in account: String) -> Bool {
        let data = Data(key.utf8)
        let updated = SecItemUpdate(item(account) as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        guard updated == errSecItemNotFound else { return updated == errSecSuccess }
        var newItem = item(account)
        newItem[kSecValueData as String] = data
        newItem[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        return SecItemAdd(newItem as CFDictionary, nil) == errSecSuccess
    }

    private func item(_ account: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }
}
```

with:

```swift
            return nil
        }
        guard status == errSecSuccess else {
            debugLog("[DeviceKey] The \(slot.rawValue) couldn't be read: OSStatus \(status)")
            throw DeviceKeyUnreadable(status: status)
        }
        guard let data = result as? Data, let key = String(data: data, encoding: .utf8) else {
            debugLog("[DeviceKey] The Keychain holds a \(slot.rawValue) that isn't text")
            return nil
        }
        return key
    }

    private func save(_ key: String, in slot: Slot) -> Bool {
        let data = Data(key.utf8)
        let updated = SecItemUpdate(item(slot) as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        guard updated == errSecItemNotFound else { return updated == errSecSuccess }
        var newItem = item(slot)
        newItem[kSecValueData as String] = data
        newItem[kSecAttrAccessible as String] = slot.syncs
            ? kSecAttrAccessibleAfterFirstUnlock
            : kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        return SecItemAdd(newItem as CFDictionary, nil) == errSecSuccess
    }

    /// A synced item is found, changed and deleted only when the query says it syncs.
    private func item(_ slot: Slot) -> [String: Any] {
        var item: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: slot.rawValue,
        ]
        if slot.syncs {
            item[kSecAttrSynchronizable as String] = true
        }
        return item
    }
}
```

- [x] **Step 4: Check it compiles**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 244 tests in 26 suites passed`. The Keychain tests wait for Task 13.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PartnerCloud/DeviceKeyStore.swift CrewluvTests/KeychainDeviceKeyStoreTests.swift CrewluvTests/Helpers/PartnerCloudStandIns.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): the hand-off copy, in iCloud Keychain for this partner's other devices" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 5: This device's key while it isn't connected, and the move's redeem

**Files:**
- Create: `Crewluv/Services/PartnerCloud/MoveOver.swift`
- Modify: `Crewluv/Models/PartnerConnection.swift`, `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`
- Test: `CrewluvTests/MoveOverTests.swift`, `CrewluvTests/CrewluCloudDeviceTests.swift`

Spec §5.3, §8.1 and decision 2: the move-over's two building blocks.
- `readUnconnectedKey()` reads this device's key while it isn't connected with it: the key of a move under way, or one a reinstall left. A key whose device is gone is forgotten, with a copy of it and the move. An answer or a refusal that a switch overtook brings nothing back and forgets nothing.
- `redeemForMove(_:)` redeems a ticket or a code with this device's key, or a new one saved first, and makes one more try with a new key when another person's device has it. It never makes a new key while this device is connected.
- `partnerCloud.moveToPartnerID` marks a move under way.
- Forgetting this device's key also deletes the hand-off copy when it holds that key (§8.3's housekeeping): sharing ended and Disconnect both forget.

- [x] **Step 1: Write the failing tests**

File: `CrewluvTests/MoveOverTests.swift`

```swift
//
//  MoveOverTests.swift
//  CrewluvTests
//
//  Moving this device from iCloud to Crewlu Cloud by itself (partner links piece 4 spec §8)
//

import Foundation
import Testing
@testable import Crewluv

@MainActor
final class MoveOverTests {
    private let defaultsName = "MoveOverTests.\(UUID().uuidString)"
    private let defaults: UserDefaults
    private let door = StandInPartnerDoor()
    private let keys = InMemoryDeviceKeyStore()

    init() throws {
        defaults = try #require(UserDefaults(suiteName: defaultsName))
    }

    deinit {
        defaults.removePersistentDomain(forName: defaultsName)
    }

    private func device() -> CrewluCloudDevice {
        CrewluCloudDevice(door: door, keys: keys, connection: PartnerConnection(defaults: defaults))
    }

    /// A device on Crewlu Cloud as partner A.
    private func connectedDevice() -> CrewluCloudDevice {
        defaults.set(Make.partnerA, forKey: "partnerCloud.partnerID")
        keys.key = Make.key
        return device()
    }

    private func moveOver(_ device: CrewluCloudDevice? = nil) -> MoveOver {
        MoveOver(door: door, keys: keys, connection: PartnerConnection(defaults: defaults), device: device ?? self.device(), label: "iPhone")
    }

    private static let joinedB = PartnerJoinAnswer(deviceID: "device-b", partnerID: Make.partnerB)

    // MARK: - This Device's Key, Unconnected

    @Test func test_unconnectedKey_none() async {
        guard case .noKey = await moveOver().readUnconnectedKey() else {
            Issue.record("expected no key")
            return
        }
        #expect(door.views.isEmpty)
    }

    @Test func test_unconnectedKey_answered_asksForEverything() async throws {
        keys.key = Make.key
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary(), partnerID: Make.partnerB)]

        guard case .answer(let key, let answer) = await moveOver().readUnconnectedKey() else {
            Issue.record("expected an answer")
            return
        }
        #expect(key == Make.key)
        #expect(answer.partnerID == Make.partnerB)
        #expect(door.views.map(\.since) == [nil])
    }

    @Test func test_unconnectedKey_gone_forgetsTheKey_theMove_andACopyOfIt() async {
        keys.key = Make.key
        keys.copy = Make.key
        defaults.set(Make.partnerB, forKey: "partnerCloud.moveToPartnerID")
        door.viewAnswers = [.failure(.refused(.sharingEnded))]

        guard case .gone = await moveOver().readUnconnectedKey() else {
            Issue.record("expected the key's device to be gone")
            return
        }
        #expect(keys.key == nil)
        #expect(keys.copy == nil)
        #expect(defaults.string(forKey: "partnerCloud.moveToPartnerID") == nil)
    }

    @Test func test_unconnectedKey_gone_keepsACopyOfAnotherDevicesKey() async {
        keys.key = Make.key
        keys.copy = "other"
        door.viewAnswers = [.failure(.refused(.sharingEnded))]

        _ = await moveOver().readUnconnectedKey()

        #expect(keys.key == nil)
        #expect(keys.copy == "other")
    }

    @Test func test_unconnectedKey_unreachable_keepsTheKey() async {
        keys.key = Make.key

        guard case .unavailable = await moveOver().readUnconnectedKey() else {
            Issue.record("expected unavailable")
            return
        }
        #expect(keys.key == Make.key)
    }

    @Test func test_unconnectedKey_thatASwitchOvertook_forgetsNothing() async {
        keys.key = Make.key
        door.viewAnswers = [.failure(.refused(.sharingEnded))]
        door.holdsViews = true
        let device = device()
        let moveOver = moveOver(device)

        let reading = Task { await moveOver.readUnconnectedKey() }
        await eventually { door.views.count == 1 }
        _ = device.switchTo(CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: Make.key, isDeviceKey: true))
        door.release()

        guard case .unavailable = await reading.value else {
            Issue.record("expected the read to bring nothing back")
            return
        }
        #expect(keys.key == Make.key)
    }

    @Test func test_unconnectedKey_answeredAfterASwitch_bringsNothingBack() async throws {
        keys.key = Make.key
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary(), partnerID: Make.partnerB)]
        door.holdsViews = true
        let device = device()
        let moveOver = moveOver(device)

        let reading = Task { await moveOver.readUnconnectedKey() }
        await eventually { door.views.count == 1 }
        _ = device.switchTo(CrewluCloudDevice.Joined(partnerID: Make.partnerA, key: "joined", isDeviceKey: false))
        door.release()

        guard case .unavailable = await reading.value else {
            Issue.record("expected the read to bring nothing back")
            return
        }
    }

    @Test func test_redeemForMove_withThisDevicesKey() async throws {
        keys.key = Make.key
        door.joinAnswers = [.success(Self.joinedB)]

        let joined = try await moveOver().redeemForMove("ticket")

        #expect(joined == CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: Make.key, isDeviceKey: true))
        #expect(door.joins.map(\.link) == [.code("ticket")])
        #expect(door.joins.map(\.label) == ["iPhone"])
        #expect(keys.pending == nil)
    }

    @Test func test_redeemForMove_withoutAKey_savesANewOneFirst() async throws {
        door.joinAnswers = [.success(Self.joinedB)]

        let joined = try await moveOver().redeemForMove("ticket")

        let key = try #require(keys.key)
        #expect(key.count == 64)
        #expect(door.joins.map(\.key) == [key])
        #expect(joined.key == key)
    }

    @Test func test_redeemForMove_aKeyAnotherPersonsDeviceHas_getsANewOne_andOneMoreTry() async throws {
        keys.key = Make.key
        door.joinAnswers = [.failure(.refused(.keyInUse)), .success(Self.joinedB)]

        let joined = try await moveOver().redeemForMove("ticket")

        let key = try #require(keys.key)
        #expect(key != Make.key)
        #expect(door.joins.map(\.key) == [Make.key, key])
        #expect(joined.key == key)
    }

    @Test func test_redeemForMove_whileConnected_makesNoNewKey() async {
        let moveOver = moveOver(connectedDevice())
        door.joinAnswers = [.failure(.refused(.keyInUse))]

        await #expect(throws: PartnerDoorError.unavailable) { try await moveOver.redeemForMove("ticket") }

        #expect(keys.key == Make.key)
    }

    @Test func test_redeemForMove_passesOnTheDoorsRefusal_andKeepsTheKey() async {
        keys.key = Make.key
        door.joinAnswers = [.failure(.refused(.sharingEnded))]

        await #expect(throws: PartnerDoorError.refused(.sharingEnded)) { try await self.moveOver().redeemForMove("ticket") }

        #expect(keys.key == Make.key)
    }
}
```

One replacement in `CrewluvTests/CrewluCloudDeviceTests.swift`:

In `CrewluvTests/CrewluCloudDeviceTests.swift`, replace:

```swift
        #expect(device.partnerID == Make.partnerA)
    }

    // MARK: - Reads the Connection Changed Under

    @Test func test_aLeftoverKeysRefusal_thatASwitchOvertook_forgetsNothing() async {
```

with:

```swift
        #expect(device.partnerID == Make.partnerA)
    }

    // MARK: - Forgetting

    @Test func test_forget_alsoForgetsACopyOfThisDevicesKey() {
        let device = connectedDevice()
        keys.copy = Make.key

        device.forget()

        #expect(keys.key == nil)
        #expect(keys.copy == nil)
    }

    @Test func test_forget_keepsACopyOfAnotherDevicesKey() {
        let device = connectedDevice()
        keys.copy = "other"

        device.forget()

        #expect(keys.copy == "other")
    }

    // MARK: - Reads the Connection Changed Under

    @Test func test_aLeftoverKeysRefusal_thatASwitchOvertook_forgetsNothing() async {
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `cannot find type 'MoveOver' in scope`.

- [x] **Step 3: Mark a move under way**

2 replacements, in order, in `Crewluv/Models/PartnerConnection.swift`:

In `Crewluv/Models/PartnerConnection.swift`, replace:

```swift
    static let pilotNameKey = "partnerCloud.pilotName"
    static let sharingEndedWithKey = "partnerCloud.sharingEndedWith"
    static let leftICloudKey = "partnerCloud.leftICloud"
    /// Where the alerts' title name is kept, as before.
    static let displayNameKey = "ResolvedPilotDisplayName"
```

with:

```swift
    static let pilotNameKey = "partnerCloud.pilotName"
    static let sharingEndedWithKey = "partnerCloud.sharingEndedWith"
    static let leftICloudKey = "partnerCloud.leftICloud"
    static let moveToPartnerIDKey = "partnerCloud.moveToPartnerID"
    /// Where the alerts' title name is kept, as before.
    static let displayNameKey = "ResolvedPilotDisplayName"
```

In `Crewluv/Models/PartnerConnection.swift`, replace:

```swift
    var partnerID: String? {
        get { defaults.string(forKey: Self.partnerIDKey) }
        nonmutating set { defaults.set(newValue, forKey: Self.partnerIDKey) }
    }

    /// The pilot of the last status seen, to tell whether a link is from another pilot (spec §7.2).
```

with:

```swift
    var partnerID: String? {
        get { defaults.string(forKey: Self.partnerIDKey) }
        nonmutating set { defaults.set(newValue, forKey: Self.partnerIDKey) }
    }

    /// A move under way (spec §8.1): the partner id that redeeming a ticket or a code gave this
    /// device's key, while this device still follows its pilot through iCloud.
    var moveToPartnerID: String? {
        get { defaults.string(forKey: Self.moveToPartnerIDKey) }
        nonmutating set { defaults.set(newValue, forKey: Self.moveToPartnerIDKey) }
    }

    /// The pilot of the last status seen, to tell whether a link is from another pilot (spec §7.2).
```

- [x] **Step 4: Forgetting deletes this device's own copy**

One replacement in `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`:

In `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`, replace:

```swift
        return true
    }

    /// Forgets this device's key and its connection.
    func forget() {
        generation += 1
        keys.forgetDeviceKey()
        connection.partnerID = nil
        partnerID = nil
```

with:

```swift
        return true
    }

    /// Forgets this device's key, with the hand-off copy when it holds the same key (spec §8.3), and
    /// its connection.
    func forget() {
        generation += 1
        if let key = try? keys.deviceKey(), (try? keys.handOffCopy()) == key {
            keys.forgetHandOffCopy()
        }
        keys.forgetDeviceKey()
        connection.partnerID = nil
        partnerID = nil
```

- [x] **Step 5: Write the building blocks**

File: `Crewluv/Services/PartnerCloud/MoveOver.swift`

```swift
//
//  MoveOver.swift
//  CrewLuve
//
//  Moves this device from iCloud to Crewlu Cloud by itself
//

import Foundation

/// Moves this device from iCloud to Crewlu Cloud by itself, once the pilot's CrewLu has moved this
/// partner there (partner links piece 4 spec §8). Nothing shows while it works: a step that fails
/// leaves the device on iCloud, and the next read tries again with the same key.
final class MoveOver {
    private let door: PartnerDoor
    private let keys: DeviceKeyStore
    private let connection: PartnerConnection
    private let device: CrewluCloudDevice
    /// "iPhone" or "iPad": this device's name in the pilot's list.
    private let label: String

    init(door: PartnerDoor, keys: DeviceKeyStore, connection: PartnerConnection, device: CrewluCloudDevice, label: String) {
        self.door = door
        self.keys = keys
        self.connection = connection
        self.device = device
        self.label = label
    }

    // MARK: - This Device's Key, Unconnected

    /// How reading this device's key went while it isn't connected with it: the key of a move under
    /// way, or one a reinstall left (spec §5.3, §8.1).
    enum UnconnectedRead {
        /// No key, or the Keychain couldn't be read just now.
        case noKey
        case answer(key: String, PartnerViewAnswer)
        /// The key's device is gone, so the key, a copy of it and any move under way are forgotten.
        case gone
        /// Crewlu Cloud couldn't be reached, or a switch overtook the read.
        case unavailable
    }

    /// partner_view with this device's key, asking for everything.
    func readUnconnectedKey() async -> UnconnectedRead {
        guard let key = try? keys.deviceKey() else { return .noKey }
        let generation = device.generation
        let answer: PartnerViewAnswer
        do {
            answer = try await door.view(key: key, since: nil)
        } catch .refused(.sharingEnded) {
            guard generation == device.generation else { return .unavailable }
            if (try? keys.handOffCopy()) == key {
                keys.forgetHandOffCopy()
            }
            keys.forgetDeviceKey()
            connection.moveToPartnerID = nil
            return .gone
        } catch {
            return .unavailable
        }
        guard generation == device.generation else { return .unavailable }
        return .answer(key: key, answer)
    }

    /// partner_handoff_redeem for the move-over (spec §8.1, §8.3): a ticket, or a code from another
    /// of this partner's devices, with this device's key, or a new one saved first. A key another
    /// person's device has gets a new one and one more try.
    func redeemForMove(_ token: String) async throws(PartnerDoorError) -> CrewluCloudDevice.Joined {
        let key: String
        do {
            key = try keys.deviceKey() ?? newKey()
        } catch {
            throw .unavailable
        }
        do {
            return try await redeem(token, key: key)
        } catch .refused(.keyInUse) {
            return try await redeem(token, key: newKey())
        }
    }

    private func redeem(_ token: String, key: String) async throws(PartnerDoorError) -> CrewluCloudDevice.Joined {
        let answer = try await door.redeem(code: token, key: key, label: label)
        return CrewluCloudDevice.Joined(partnerID: answer.partnerID, key: key, isDeviceKey: true)
    }

    /// A new key, saved as this device's key before it's sent. Never while this device is connected:
    /// a join that connected it meanwhile keeps its key.
    private func newKey() throws(PartnerDoorError) -> String {
        guard device.partnerID == nil, let key = DeviceKey.make(), keys.save(deviceKey: key) else { throw .unavailable }
        return key
    }
}
```

- [x] **Step 6: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 258 tests in 27 suites passed`.

- [x] **Step 7: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PartnerCloud/MoveOver.swift Crewluv/Models/PartnerConnection.swift Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift CrewluvTests/MoveOverTests.swift CrewluvTests/CrewluCloudDeviceTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): the move-over reads this device's unconnected key and redeems with it" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 6: The move-over

**Files:**
- Modify: `Crewluv/Services/PartnerCloud/MoveOver.swift`
- Test: `CrewluvTests/MoveOverTests.swift`, `CrewluvTests/Helpers/PartnerCloudStandIns.swift`

Spec §8.1, §8.3 and §8.4, and decisions 2, 6, 7 and 11.
- **After an iCloud read that brought the record,** `afterRead(ticket:)` tries three things in order: a move under way, then the ticket, then another of this partner's devices.
- **When the share is gone,** `afterShareGone()` switches a move under way at once, and follows another device before the welcome screen shows.
- **Each answers what the source should do:** stay, switch, or end with or without the note for a device left behind. The source acts on it in Task 8.
- **A join that switches this device while the move-over waits on Crewlu Cloud wins:** the move-over stays as the join left it. The door's stand-in learns to run something while a join or redeem waits, to test that.

- [x] **Step 1: Write the failing tests**

The door's stand-in can run something while a join or redeem waits, such as a switch.

2 replacements, in order, in `CrewluvTests/Helpers/PartnerCloudStandIns.swift`:

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift
    var holdsHandOffs = false
    /// Runs while `setPush` waits for its answer, as if something happened meanwhile.
    var whileSettingPush: (() -> Void)?

    private(set) var views: [(key: String, since: String?)] = []
    private(set) var pushes: [(key: String, token: String, environment: PushEnvironment)] = []
```

with:

```swift
    var holdsHandOffs = false
    /// Runs while `setPush` waits for its answer, as if something happened meanwhile.
    var whileSettingPush: (() -> Void)?
    /// Runs while `join` or `redeem` waits for its answer, as if something happened meanwhile.
    var whileJoining: (@MainActor () -> Void)?

    private(set) var views: [(key: String, since: String?)] = []
    private(set) var pushes: [(key: String, token: String, environment: PushEnvironment)] = []
```

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift
    }

    private func nextJoinAnswer() throws(PartnerDoorError) -> PartnerJoinAnswer {
        guard !joinAnswers.isEmpty else { throw .unavailable }
        return try joinAnswers.removeFirst().get()
    }
```

with:

```swift
    }

    private func nextJoinAnswer() throws(PartnerDoorError) -> PartnerJoinAnswer {
        whileJoining?()
        guard !joinAnswers.isEmpty else { throw .unavailable }
        return try joinAnswers.removeFirst().get()
    }
```

One replacement in `CrewluvTests/MoveOverTests.swift`:

In `CrewluvTests/MoveOverTests.swift`, replace:

```swift

        #expect(keys.key == Make.key)
    }
}
```

with:

```swift

        #expect(keys.key == Make.key)
    }

    // MARK: - After an iCloud Read (§8.1)

    private static let code = HandOffCode(code: "K7MQ2X", expiresAt: Date(timeIntervalSince1970: 1_792_419_308))

    private static func summary(for partnerID: String = Make.partnerB, pilot: String = "pilot") throws -> Result<PartnerViewAnswer, PartnerDoorError> {
        Make.answer(updatedAt: "t1", try Make.summary(["pilotId": pilot]), partnerID: partnerID)
    }

    private static let noSummaryForB: Result<PartnerViewAnswer, PartnerDoorError> =
        .success(PartnerViewAnswer(partnerID: Make.partnerB, updatedAt: nil, content: .noSummaryYet))

    /// This device follows the pilot "pilot" through iCloud.
    private func followsPilot() {
        defaults.set("pilot", forKey: "partnerCloud.pilotID")
    }

    private func switched(_ next: MoveOver.Next) -> (joined: CrewluCloudDevice.Joined, answer: PartnerViewAnswer?)? {
        guard case .switchTo(let joined, let answer) = next else { return nil }
        return (joined, answer)
    }

    private func stays(_ next: MoveOver.Next) -> Bool {
        if case .stay = next { return true }
        return false
    }

    @Test func test_nothingToDo_staysOnICloud() async {
        followsPilot()

        #expect(stays(await moveOver().afterRead(ticket: nil)))

        #expect(door.views.isEmpty)
        #expect(door.joins.isEmpty)
    }

    @Test func test_aTicket_isRedeemed_andAStatusMeansTheSwitch() async throws {
        followsPilot()
        door.joinAnswers = [.success(Self.joinedB)]
        door.viewAnswers = [try Self.summary()]

        let next = await moveOver().afterRead(ticket: "ticket")

        let key = try #require(keys.key)
        let (joined, answer) = try #require(switched(next))
        #expect(joined == CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: key, isDeviceKey: true))
        #expect(answer?.partnerID == Make.partnerB)
        #expect(door.joins.map(\.link) == [.code("ticket")])
        #expect(door.views.map(\.key) == [key])
        #expect(defaults.string(forKey: "partnerCloud.moveToPartnerID") == Make.partnerB)
    }

    @Test func test_aTicket_beforeTheFirstSummary_leavesTheMoveUnderWay() async throws {
        followsPilot()
        door.joinAnswers = [.success(Self.joinedB)]
        door.viewAnswers = [Self.noSummaryForB]

        #expect(stays(await moveOver().afterRead(ticket: "ticket")))

        #expect(keys.key != nil)
        #expect(defaults.string(forKey: "partnerCloud.moveToPartnerID") == Make.partnerB)
    }

    @Test func test_aMoveUnderWay_withAStatus_switches_withoutRedeemingAgain() async throws {
        followsPilot()
        keys.key = Make.key
        defaults.set(Make.partnerB, forKey: "partnerCloud.moveToPartnerID")
        door.viewAnswers = [try Self.summary()]

        let (joined, _) = try #require(switched(await moveOver().afterRead(ticket: "ticket")))

        #expect(joined == CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: Make.key, isDeviceKey: true))
        #expect(door.joins.isEmpty)
    }

    @Test func test_aMoveUnderWay_switches_withNoPilotSavedFromICloud() async throws {
        keys.key = Make.key
        defaults.set(Make.partnerB, forKey: "partnerCloud.moveToPartnerID")
        door.viewAnswers = [try Self.summary()]

        let (joined, _) = try #require(switched(await moveOver().afterRead(ticket: nil)))

        #expect(joined.partnerID == Make.partnerB)
    }

    @Test func test_aMoveUnderWay_beforeTheFirstSummary_waits() async {
        followsPilot()
        keys.key = Make.key
        defaults.set(Make.partnerB, forKey: "partnerCloud.moveToPartnerID")
        door.viewAnswers = [Self.noSummaryForB]

        #expect(stays(await moveOver().afterRead(ticket: "ticket")))

        #expect(door.joins.isEmpty)
        #expect(keys.key == Make.key)
    }

    @Test func test_aMoveUnderWay_thatCantReachCrewluCloud_staysWithoutRedeemingAgain() async {
        followsPilot()
        keys.key = Make.key
        defaults.set(Make.partnerB, forKey: "partnerCloud.moveToPartnerID")
        door.viewAnswers = [.failure(.unavailable)]

        #expect(stays(await moveOver().afterRead(ticket: "ticket")))

        #expect(door.joins.isEmpty)
        #expect(keys.key == Make.key)
    }

    @Test func test_aMoveUnderWay_whoseDeviceIsGone_redeemsTheTicketWithANewKey() async throws {
        followsPilot()
        keys.key = Make.key
        defaults.set(Make.partnerB, forKey: "partnerCloud.moveToPartnerID")
        door.viewAnswers = [.failure(.refused(.sharingEnded)), try Self.summary()]
        door.joinAnswers = [.success(Self.joinedB)]

        let (joined, _) = try #require(switched(await moveOver().afterRead(ticket: "ticket")))

        #expect(joined.key != Make.key)
        #expect(keys.key == joined.key)
        #expect(door.joins.map(\.key) == [joined.key])
    }

    @Test func test_aKeyAReinstallLeft_forThisPilot_switches() async throws {
        followsPilot()
        keys.key = Make.key
        door.viewAnswers = [try Self.summary()]

        let (joined, _) = try #require(switched(await moveOver().afterRead(ticket: nil)))

        #expect(joined.key == Make.key)
    }

    @Test func test_aKeyAReinstallLeft_forAnotherPilot_givesWayToTheTicket() async throws {
        followsPilot()
        keys.key = Make.key
        door.viewAnswers = [try Self.summary(for: Make.partnerA, pilot: "sam"), try Self.summary()]
        door.joinAnswers = [.failure(.refused(.keyInUse)), .success(Self.joinedB)]

        let (joined, _) = try #require(switched(await moveOver().afterRead(ticket: "ticket")))

        #expect(joined.key != Make.key)
        #expect(door.joins.map(\.key) == [Make.key, joined.key])
    }

    @Test(arguments: [PartnerDoorError.refused(.tooManyDevices), .refused(.tryLater), .refused(.invalidInput), .unavailable])
    func test_aTicketThatCantBeRedeemedNow_staysOnICloud(error: PartnerDoorError) async {
        followsPilot()
        keys.copy = "copy"
        door.joinAnswers = [.failure(error)]

        #expect(stays(await moveOver().afterRead(ticket: "ticket")))

        #expect(door.views.isEmpty)
        #expect(door.handOffs.isEmpty)
        #expect(defaults.string(forKey: "partnerCloud.moveToPartnerID") == nil)
    }

    @Test func test_aMoveOvertakenByASwitch_changesNothing() async throws {
        followsPilot()
        door.joinAnswers = [.success(Self.joinedB)]
        door.viewAnswers = [try Self.summary()]
        door.holdsViews = true
        let device = device()
        let moveOver = moveOver(device)

        let moving = Task { await moveOver.afterRead(ticket: "ticket") }
        await eventually { door.views.count == 1 }
        _ = device.switchTo(CrewluCloudDevice.Joined(partnerID: Make.partnerA, key: "joined", isDeviceKey: true))
        door.release()

        #expect(stays(await moving.value))
    }

    @Test func test_aRedeemOvertakenByASwitch_startsNoMove() async {
        followsPilot()
        door.joinAnswers = [.success(Self.joinedB)]
        let device = device()
        door.whileJoining = { _ = device.switchTo(CrewluCloudDevice.Joined(partnerID: Make.partnerA, key: "joined", isDeviceKey: true)) }

        #expect(stays(await moveOver(device).afterRead(ticket: "ticket")))

        #expect(defaults.string(forKey: "partnerCloud.moveToPartnerID") == nil)
        #expect(door.views.isEmpty)
    }

    // MARK: - Following Another of This Partner's Devices (§8.3)

    @Test func test_aUsedTicket_followsAnotherDevice() async throws {
        followsPilot()
        keys.copy = "copy"
        door.joinAnswers = [.failure(.refused(.sharingEnded)), .success(Self.joinedB)]
        door.viewAnswers = [try Self.summary(), try Self.summary()]
        door.handOffAnswers = [.success(Self.code)]

        let (joined, _) = try #require(switched(await moveOver().afterRead(ticket: "ticket")))

        #expect(door.joins.map(\.link) == [.code("ticket"), .code("K7MQ2X")])
        #expect(door.handOffs == ["copy"])
        #expect(door.views.map(\.key) == ["copy", joined.key])
        #expect(joined.key != "copy")
        #expect(keys.copy == "copy")
    }

    @Test func test_noTicket_followsAnotherDevice() async throws {
        followsPilot()
        keys.copy = "copy"
        door.joinAnswers = [.success(Self.joinedB)]
        door.viewAnswers = [try Self.summary(), try Self.summary()]
        door.handOffAnswers = [.success(Self.code)]

        let (joined, _) = try #require(switched(await moveOver().afterRead(ticket: nil)))

        #expect(joined.partnerID == Make.partnerB)
        #expect(defaults.string(forKey: "partnerCloud.moveToPartnerID") == Make.partnerB)
    }

    @Test func test_anotherDevicesCode_beforeTheFirstSummary_leavesTheMoveUnderWay() async throws {
        followsPilot()
        keys.copy = "copy"
        door.joinAnswers = [.success(Self.joinedB)]
        door.viewAnswers = [try Self.summary(), Self.noSummaryForB]
        door.handOffAnswers = [.success(Self.code)]

        #expect(stays(await moveOver().afterRead(ticket: nil)))

        #expect(defaults.string(forKey: "partnerCloud.moveToPartnerID") == Make.partnerB)
    }

    @Test func test_aCopyForAnotherPilot_isntFollowed() async throws {
        followsPilot()
        keys.copy = "copy"
        door.viewAnswers = [try Self.summary(pilot: "sam")]

        #expect(stays(await moveOver().afterRead(ticket: nil)))

        #expect(door.handOffs.isEmpty)
        #expect(keys.copy == "copy")
    }

    @Test func test_aCopyWhoseDeviceIsGone_isForgotten() async {
        followsPilot()
        keys.copy = "copy"
        door.viewAnswers = [.failure(.refused(.sharingEnded))]

        #expect(stays(await moveOver().afterRead(ticket: nil)))

        #expect(keys.copy == nil)
    }

    @Test func test_aCopyThatCantMakeACode_isForgotten_whenItsDeviceIsGone() async throws {
        followsPilot()
        keys.copy = "copy"
        door.viewAnswers = [try Self.summary()]
        door.handOffAnswers = [.failure(.refused(.sharingEnded))]

        #expect(stays(await moveOver().afterRead(ticket: nil)))

        #expect(keys.copy == nil)
        #expect(door.joins.isEmpty)
    }

    @Test func test_aCopyOfThisDevicesOwnKey_isntFollowed() async {
        followsPilot()
        keys.key = Make.key
        keys.copy = Make.key
        door.viewAnswers = [Self.noSummaryForB]

        #expect(stays(await moveOver().afterRead(ticket: nil)))

        #expect(door.views.map(\.key) == [Make.key])
        #expect(door.handOffs.isEmpty)
    }

    @Test func test_aCodeOvertakenByASwitch_isntRedeemed() async throws {
        followsPilot()
        keys.copy = "copy"
        door.viewAnswers = [try Self.summary()]
        door.handOffAnswers = [.success(Self.code)]
        door.holdsHandOffs = true
        let device = device()
        let moveOver = moveOver(device)

        let moving = Task { await moveOver.afterRead(ticket: nil) }
        await eventually { door.handOffs.count == 1 }
        _ = device.switchTo(CrewluCloudDevice.Joined(partnerID: Make.partnerA, key: "joined", isDeviceKey: true))
        door.release()

        #expect(stays(await moving.value))
        #expect(door.joins.isEmpty)
    }

    @Test func test_aCodesRedeemOvertakenByASwitch_startsNoMove() async throws {
        followsPilot()
        keys.copy = "copy"
        door.viewAnswers = [try Self.summary()]
        door.handOffAnswers = [.success(Self.code)]
        door.joinAnswers = [.success(Self.joinedB)]
        let device = device()
        door.whileJoining = { _ = device.switchTo(CrewluCloudDevice.Joined(partnerID: Make.partnerA, key: "joined", isDeviceKey: true)) }

        #expect(stays(await moveOver(device).afterRead(ticket: nil)))

        #expect(defaults.string(forKey: "partnerCloud.moveToPartnerID") == nil)
        #expect(door.views.map(\.key) == ["copy"])
    }

    // MARK: - When the Share Is Gone (§8.4)

    private func ended(_ next: MoveOver.Next) -> Bool? {
        guard case .ended(let leftBehind) = next else { return nil }
        return leftBehind
    }

    @Test func test_shareGone_duringAMove_switchesAtOnce() async throws {
        keys.key = Make.key
        defaults.set(Make.partnerB, forKey: "partnerCloud.moveToPartnerID")
        door.viewAnswers = [Self.noSummaryForB]

        let (joined, answer) = try #require(switched(await moveOver().afterShareGone()))

        #expect(joined == CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: Make.key, isDeviceKey: true))
        #expect(answer != nil)
    }

    @Test func test_shareGone_duringAMove_switchesEvenWhenCrewluCloudCantBeReached() async throws {
        keys.key = Make.key
        defaults.set(Make.partnerB, forKey: "partnerCloud.moveToPartnerID")

        let (joined, answer) = try #require(switched(await moveOver().afterShareGone()))

        #expect(joined == CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: Make.key, isDeviceKey: true))
        #expect(answer == nil)
    }

    @Test func test_shareGone_duringAMoveCrewluCloudEndedToo_ends() async {
        keys.key = Make.key
        defaults.set(Make.partnerB, forKey: "partnerCloud.moveToPartnerID")
        door.viewAnswers = [.failure(.refused(.sharingEnded))]

        #expect(ended(await moveOver().afterShareGone()) == false)
        #expect(keys.key == nil)
    }

    @Test func test_shareGone_withAKeyAReinstallLeft_doesntSwitchToIt() async {
        followsPilot()
        keys.key = Make.key

        #expect(ended(await moveOver().afterShareGone()) == false)
        #expect(door.views.isEmpty)
    }

    @Test func test_shareGone_followsAnotherDevice_beforeTheWelcomeScreen() async throws {
        followsPilot()
        keys.copy = "copy"
        door.viewAnswers = [try Self.summary(), Self.noSummaryForB]
        door.handOffAnswers = [.success(Self.code)]
        door.joinAnswers = [.success(Self.joinedB)]

        let (joined, answer) = try #require(switched(await moveOver().afterShareGone()))

        #expect(joined.partnerID == Make.partnerB)
        #expect(answer != nil)
    }

    @Test func test_shareGone_withAnotherDeviceThatCantBeFollowedNow_leavesThisOneBehind() async throws {
        followsPilot()
        keys.copy = "copy"
        door.viewAnswers = [try Self.summary()]

        #expect(ended(await moveOver().afterShareGone()) == true)
    }

    @Test func test_shareGone_withoutAnotherDevice_ends() async {
        followsPilot()

        #expect(ended(await moveOver().afterShareGone()) == false)
    }

    @Test func test_shareGone_withAnotherDeviceOfAnotherPilot_ends() async throws {
        followsPilot()
        keys.copy = "copy"
        door.viewAnswers = [try Self.summary(pilot: "sam")]

        #expect(ended(await moveOver().afterShareGone()) == false)
    }

    @Test func test_shareGone_whenTheCopysPilotCantBeChecked_ends() async {
        followsPilot()
        keys.copy = "copy"

        #expect(ended(await moveOver().afterShareGone()) == false)
    }
}
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `'Next' is not a member type of class 'Crewluv.MoveOver'`.

- [x] **Step 3: Write the move-over**

One replacement in `Crewluv/Services/PartnerCloud/MoveOver.swift`:

In `Crewluv/Services/PartnerCloud/MoveOver.swift`, replace:

```swift
        self.connection = connection
        self.device = device
        self.label = label
    }

    // MARK: - This Device's Key, Unconnected
```

with:

```swift
        self.connection = connection
        self.device = device
        self.label = label
    }

    /// What the status source does after the move-over's turn.
    enum Next {
        /// This device stays on iCloud.
        case stay
        /// Switch to Crewlu Cloud as `joined` (spec §8.2). `answer` is its read, nil when Crewlu Cloud
        /// couldn't be reached as the share ended (§8.4).
        case switchTo(CrewluCloudDevice.Joined, PartnerViewAnswer?)
        /// The share is gone, and nothing on Crewlu Cloud carries this device on. `leftBehind` when
        /// another of this partner's devices follows this pilot there, so a code from it works here.
        case ended(leftBehind: Bool)
    }

    /// After an iCloud read that brought the record, with this device's ticket in it (spec §8.1): a move
    /// under way, then the ticket, then another of this partner's devices (§8.3). Each switches once
    /// Crewlu Cloud has a status for it.
    func afterRead(ticket: String?) async -> Next {
        let generation = device.generation
        switch await readUnconnectedKey() {
        case .answer(let key, let answer):
            let isMoving = connection.moveToPartnerID != nil
            if case .summary(let summary) = answer.content, isMoving || summary.pilotId == connection.pilotID {
                return switching(to: .init(partnerID: answer.partnerID, key: key, isDeviceKey: true), answer, since: generation)
            }
            // A move waits for the pilot's first summary there. A key a reinstall left for another
            // pilot gives way to the ticket.
            if isMoving {
                return .stay
            }
        case .unavailable:
            return .stay
        case .noKey, .gone:
            break
        }
        if let ticket {
            let joined: CrewluCloudDevice.Joined
            do {
                joined = try await redeemForMove(ticket)
            } catch .refused(.sharingEnded) {
                // The ticket was used, by another of this partner's devices, or it ran out.
                return await followingOtherDevice(since: generation)
            } catch {
                return .stay
            }
            guard let answer = await startMove(joined, since: generation) else { return .stay }
            return switching(to: joined, answer, since: generation)
        }
        return await followingOtherDevice(since: generation)
    }

    /// When the iCloud share is gone (spec §8.4): a move under way switches at once, unless Crewlu
    /// Cloud ended sharing with its key too. Another of this partner's devices is followed before the
    /// welcome screen shows.
    func afterShareGone() async -> Next {
        let generation = device.generation
        if let movingTo = connection.moveToPartnerID {
            switch await readUnconnectedKey() {
            case .answer(let key, let answer):
                return switching(to: .init(partnerID: answer.partnerID, key: key, isDeviceKey: true), answer, since: generation)
            case .unavailable:
                if let key = try? keys.deviceKey() {
                    return switching(to: .init(partnerID: movingTo, key: key, isDeviceKey: true), nil, since: generation)
                }
            case .noKey, .gone:
                break
            }
        }
        switch await followOtherDevice(since: generation) {
        case .nothing, .couldntCheck:
            return .ended(leftBehind: false)
        case .couldntJoin:
            return .ended(leftBehind: true)
        case .joined(let joined, let answer):
            return switching(to: joined, answer, since: generation)
        }
    }

    /// A switch, unless the connection changed since the turn began, say by a join: then this device
    /// stays as that left it.
    private func switching(to joined: CrewluCloudDevice.Joined, _ answer: PartnerViewAnswer?, since generation: Int) -> Next {
        generation == device.generation ? .switchTo(joined, answer) : .stay
    }

    /// The move is under way once a redeem joined (spec §8.1): its read, or nil when it brought no
    /// status yet, or failed. The next read tries again.
    private func startMove(_ joined: CrewluCloudDevice.Joined, since generation: Int) async -> PartnerViewAnswer? {
        guard generation == device.generation else { return nil }
        connection.moveToPartnerID = joined.partnerID
        guard let answer = try? await door.view(key: joined.key, since: nil), case .summary = answer.content else { return nil }
        return answer
    }

    // MARK: - Another of This Partner's Devices

    /// How following another of this partner's devices went (spec §8.3).
    private enum Following {
        /// No hand-off copy, or one of another pilot's, or of a device that's gone.
        case nothing
        /// The copy's pilot couldn't be checked just now.
        case couldntCheck
        /// The copy is this pilot's, but no code or join came of it just now.
        case couldntJoin
        /// This device joined with a code from the other device: the move is under way, with its read.
        case joined(CrewluCloudDevice.Joined, PartnerViewAnswer?)
    }

    /// After an iCloud read: switches once Crewlu Cloud has a status, and otherwise stays.
    private func followingOtherDevice(since generation: Int) async -> Next {
        guard case .joined(let joined, let answer) = await followOtherDevice(since: generation),
              let answer, case .summary = answer.content
        else { return .stay }
        return switching(to: joined, answer, since: generation)
    }

    /// The hand-off copy's device must show the pilot this device follows. Then a code made with the
    /// copy joins this device with its own key: its own device in the pilot's list, with its own
    /// pushes. The copy never reads the status for the screen.
    private func followOtherDevice(since generation: Int) async -> Following {
        guard let copy = try? keys.handOffCopy(), copy != (try? keys.deviceKey()) else { return .nothing }
        do {
            let answer = try await door.view(key: copy, since: nil)
            guard case .summary(let summary) = answer.content, summary.pilotId == connection.pilotID else { return .nothing }
        } catch .refused(.sharingEnded) {
            keys.forgetHandOffCopy()
            return .nothing
        } catch {
            return .couldntCheck
        }
        let code: HandOffCode
        do {
            code = try await door.makeHandOffCode(key: copy)
        } catch .refused(.sharingEnded) {
            keys.forgetHandOffCopy()
            return .nothing
        } catch {
            return .couldntJoin
        }
        guard generation == device.generation, let joined = try? await redeemForMove(code.code),
              generation == device.generation
        else { return .couldntJoin }
        connection.moveToPartnerID = joined.partnerID
        return .joined(joined, try? await door.view(key: joined.key, since: nil))
    }

    // MARK: - This Device's Key, Unconnected
```

- [x] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 289 tests in 27 suites passed`.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PartnerCloud/MoveOver.swift CrewluvTests/MoveOverTests.swift CrewluvTests/Helpers/PartnerCloudStandIns.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): the move-over: a move under way, the ticket, then another of this partner's devices" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 7: A switch leaves the copy, and the source's connection changes get their own file

**Files:**
- Create: `Crewluv/Services/PilotStatusSource+Connecting.swift`
- Modify: `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`, `Crewluv/Services/PilotStatusSource.swift`
- Test: `CrewluvTests/CrewluCloudDeviceTests.swift`, `CrewluvTests/PilotStatusSourceTests.swift`

Decisions 5 and 12.
- Every switch saves its key as the hand-off copy and ends a move under way.
- The source's connection changes move, unchanged, to `PilotStatusSource+Connecting.swift`. The switch itself is split out as `switchConnection(to:keepingAlerts:)`, for Task 8, so the source stays under 300 lines.
- What the extension needs from the source becomes internal.

- [x] **Step 1: Write the failing tests**

One replacement in `CrewluvTests/CrewluCloudDeviceTests.swift`:

In `CrewluvTests/CrewluCloudDeviceTests.swift`, replace:

```swift
        #expect(device.partnerID == Make.partnerB)
    }

    @Test func test_switch_keyThatCantBeSaved_changesNothing() {
        let device = connectedDevice()
        keys.pending = "pending"
```

with:

```swift
        #expect(device.partnerID == Make.partnerB)
    }

    @Test func test_switch_makesTheKeyTheHandOffCopy_andEndsAMoveUnderWay() {
        let device = device()
        keys.copy = "older"
        defaults.set(Make.partnerB, forKey: "partnerCloud.moveToPartnerID")

        _ = device.switchTo(CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: Make.key, isDeviceKey: true))

        #expect(keys.copy == Make.key)
        #expect(defaults.string(forKey: "partnerCloud.moveToPartnerID") == nil)
    }

    @Test func test_switch_keyThatCantBeSaved_changesNothing() {
        let device = connectedDevice()
        keys.pending = "pending"
```

One replacement in `CrewluvTests/PilotStatusSourceTests.swift`:

In `CrewluvTests/PilotStatusSourceTests.swift`, replace:

```swift
        #expect(defaults.string(forKey: "partnerCloud.sharingEndedWith") == nil)
    }

    @Test func test_connect_keyThatCantBeSaved_changesNothing() async {
        keys.savesFail = true
        let source = makeSource()
```

with:

```swift
        #expect(defaults.string(forKey: "partnerCloud.sharingEndedWith") == nil)
    }

    @Test func test_connect_leavesTheKeyForThisPartnersOtherDevices() async {
        keys.pending = "pending"
        let source = makeSource()

        #expect(await source.connect(Self.joined(), keepingAlerts: false))

        #expect(keys.copy == "pending")
    }

    @Test func test_connect_keyThatCantBeSaved_changesNothing() async {
        keys.savesFail = true
        let source = makeSource()
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the tests run, and `test_switch_makesTheKeyTheHandOffCopy_andEndsAMoveUnderWay()` and `test_connect_leavesTheKeyForThisPartnersOtherDevices()` fail.

- [x] **Step 3: A switch leaves the copy and ends a move**

2 replacements, in order, in `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`:

In `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`, replace:

```swift
        let key: String?
    }

    /// Makes this device `joined`'s device (spec §7.2's switching): its key becomes this device's
    /// key, all at once, so no read sees half a switch. A key forgotten since the join sent it, say
    /// by a leftover key's refusal, is saved again. Nil when the key couldn't be saved, and then
    /// nothing changes.
    func switchTo(_ joined: Joined) -> Replaced? {
        let replacedKey = try? keys.deviceKey()
```

with:

```swift
        let key: String?
    }

    /// Makes this device `joined`'s device (spec §7.2's switching, §8.2): its key becomes this device's
    /// key, all at once, so no read sees half a switch, and the hand-off copy, so this partner's other
    /// devices can follow (§8.3). A move under way is over. A key forgotten since the join sent it,
    /// say by a leftover key's refusal, is saved again. Nil when the key couldn't be saved, and then
    /// nothing changes.
    func switchTo(_ joined: Joined) -> Replaced? {
        let replacedKey = try? keys.deviceKey()
```

In `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`, replace:

```swift
        if !joined.isDeviceKey {
            keys.forgetPendingKey()
        }
        generation += 1
        connection.partnerID = joined.partnerID
        partnerID = joined.partnerID
```

with:

```swift
        if !joined.isDeviceKey {
            keys.forgetPendingKey()
        }
        keys.save(handOffCopy: joined.key)
        connection.moveToPartnerID = nil
        generation += 1
        connection.partnerID = joined.partnerID
        partnerID = joined.partnerID
```

- [x] **Step 4: Move the connection changes to their own file**

File: `Crewluv/Services/PilotStatusSource+Connecting.swift`

```swift
//
//  PilotStatusSource+Connecting.swift
//  CrewLuve
//
//  How this device's connection changes: joining, Disconnect, and sharing ending
//

import Foundation

extension PilotStatusSource {
    /// The pilot stopped sharing with this device, as Crewlu Cloud told the push registration:
    /// forget the connection, and tell the screen. A refusal Disconnect's own leave caused ends nothing.
    func endSharing() {
        guard !device.isDisconnecting else { return }
        device.forget()
        noteSharingEnded()
        report(PilotStatusUpdate(outcome: .sharingEnded, readAt: Date()))
    }

    /// Switches this device to what a join joined (spec §7.2), then lets the device it replaced leave
    /// and reads the new connection. False when the key couldn't be saved; then nothing changes.
    func connect(_ joined: CrewluCloudDevice.Joined, keepingAlerts: Bool) async -> Bool {
        guard let replaced = switchConnection(to: joined, keepingAlerts: keepingAlerts) else { return false }
        await device.leave(replaced)
        _ = await refresh()
        return true
    }

    /// The switch itself, for a join, a key a reinstall left or the move-over (spec §7.2, §8.2): the
    /// key, an iCloud share forgotten quietly, the note gone and the push token sent. For another pilot,
    /// what the alerts kept of the last goes first. All of it changes before anything waits, so no read
    /// sees half a switch. Nil when the key couldn't be saved; then nothing changes.
    func switchConnection(to joined: CrewluCloudDevice.Joined, keepingAlerts: Bool) -> CrewluCloudDevice.Replaced? {
        guard let replaced = device.switchTo(joined) else { return nil }
        if !keepingAlerts {
            connection.forgetPilot()
        }
        connection.leaveICloud(forgetShare: forgetICloudShare)
        connection.sharingEndedWith = nil
        sharingEndedWith = nil
        reading = nil
        didConnect()
        return replaced
    }

    /// Disconnect (spec §7.5): this device leaves, then forgets its key, the connection, the pilot and
    /// any iCloud share, with no note. False when Crewlu Cloud couldn't be reached; then the device
    /// stays connected. A join that switched this device meanwhile keeps its new connection.
    func disconnect() async -> Bool {
        do {
            guard try await device.disconnect() else { return true }
        } catch {
            return false
        }
        forgetPilot()
        connection.leaveICloud(forgetShare: forgetICloudShare)
        report(PilotStatusUpdate(outcome: .notConnected, readAt: Date()))
        return true
    }

    /// Sharing with this device ended: the welcome screen's note names the pilot last seen, if any,
    /// and the pilot is forgotten (spec §7.6).
    func noteSharingEnded() {
        connection.sharingEndedWith = connection.pilotName
        sharingEndedWith = connection.pilotName
        forgetPilot()
    }

    func forgetPilot() {
        reading = nil
        connection.forgetPilot()
    }
}
```

5 replacements, in order, in `Crewluv/Services/PilotStatusSource.swift`:

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift

/// The one place that reads the pilot's status, whoever asks: the screen, a push or the background
/// refresh (partner links piece 4 spec §5.1). It reads Crewlu Cloud through `device` once connected
/// there, and iCloud otherwise, as before. Each new status goes to the alerts once, from here.
@Observable
final class PilotStatusSource {
    static let shared = PilotStatusSource()

    /// What was last read, or nil before the first read and after sharing ends.
    private(set) var reading: PilotReading?
    /// How the last read went, or how sharing ended outside a read.
    private(set) var lastUpdate: PilotStatusUpdate?
    /// This device's partner id on Crewlu Cloud, or nil while it follows its pilot through iCloud.
```

with:

```swift

/// The one place that reads the pilot's status, whoever asks: the screen, a push or the background
/// refresh (partner links piece 4 spec §5.1). It reads Crewlu Cloud through `device` once connected
/// there, and iCloud otherwise, as before. Each new status goes to the alerts once, from here. How the
/// connection changes, by joining, Disconnect or sharing ending, is in PilotStatusSource+Connecting.
@Observable
final class PilotStatusSource {
    static let shared = PilotStatusSource()

    /// What was last read, or nil before the first read and after sharing ends. The source and its
    /// extensions set it.
    var reading: PilotReading?
    /// How the last read went, or how sharing ended outside a read.
    private(set) var lastUpdate: PilotStatusUpdate?
    /// This device's partner id on Crewlu Cloud, or nil while it follows its pilot through iCloud.
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift

    /// The pilot whose sharing with this device ended, as this partner saw them, for the welcome
    /// screen's note (spec §7.6). It stays until the next status, and is nil when no pilot was seen.
    private(set) var sharingEndedWith: String?

    /// The name the pilot set for this partner, for the screen's title: the reading's, or the saved
    /// one while an iCloud read can't look it up, as the alerts use.
```

with:

```swift

    /// The pilot whose sharing with this device ended, as this partner saw them, for the welcome
    /// screen's note (spec §7.6). It stays until the next status, and is nil when no pilot was seen.
    /// The source and its extensions set it.
    var sharingEndedWith: String?

    /// The name the pilot set for this partner, for the screen's title: the reading's, or the saved
    /// one while an iCloud read can't look it up, as the alerts use.
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    /// This device on Crewlu Cloud, which joins through it (spec §7.2).
    @ObservationIgnored let device: CrewluCloudDevice
    @ObservationIgnored private let iCloud: ICloudStatusFetching
    @ObservationIgnored private let connection: PartnerConnection
    @ObservationIgnored private let notifier: StatusNotifying
    @ObservationIgnored private let iCloudShareEnded: @MainActor () -> Void
    @ObservationIgnored private let periodicCheck: PeriodicCheck
    /// Runs when this device connects to Crewlu Cloud, to send its push token (spec §6.1).
    @ObservationIgnored private let didConnect: @MainActor () -> Void
    /// Forgets the iCloud share without showing the welcome screen (spec §7.2).
    @ObservationIgnored private let forgetICloudShare: @MainActor () -> Void
    @ObservationIgnored private let reads = ReadQueue<RefreshOutcome>()

    private static let unreachable = "No connection to Crewlu Cloud"
    private static let keyUnreadable = "This device's key couldn't be read"

    init(
```

with:

```swift
    /// This device on Crewlu Cloud, which joins through it (spec §7.2).
    @ObservationIgnored let device: CrewluCloudDevice
    @ObservationIgnored private let iCloud: ICloudStatusFetching
    @ObservationIgnored let connection: PartnerConnection
    @ObservationIgnored private let notifier: StatusNotifying
    @ObservationIgnored private let iCloudShareEnded: @MainActor () -> Void
    @ObservationIgnored private let periodicCheck: PeriodicCheck
    /// Runs when this device connects to Crewlu Cloud, to send its push token (spec §6.1).
    @ObservationIgnored let didConnect: @MainActor () -> Void
    /// Forgets the iCloud share without showing the welcome screen (spec §7.2).
    @ObservationIgnored let forgetICloudShare: @MainActor () -> Void
    @ObservationIgnored private let reads = ReadQueue<RefreshOutcome>()

    static let unreachable = "No connection to Crewlu Cloud"
    private static let keyUnreadable = "This device's key couldn't be read"

    init(
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        }
    }

    private func report(_ update: PilotStatusUpdate) {
        lastUpdate = update
        NotificationCenter.default.post(name: .pilotStatusDidUpdate, object: self)
    }

    /// The pilot stopped sharing with this device, as Crewlu Cloud told the push registration:
    /// forget the connection, and tell the screen. A refusal Disconnect's own leave caused ends nothing.
    func endSharing() {
        guard !device.isDisconnecting else { return }
        device.forget()
        noteSharingEnded()
        report(PilotStatusUpdate(outcome: .sharingEnded, readAt: Date()))
    }

    /// Switches this device to what a join joined (spec §7.2): its key, an iCloud share forgotten
    /// quietly, the push token sent and the new connection read. For another pilot, what the alerts
    /// kept of the last goes first. All that changes before anything waits, so no read sees half a
    /// switch; the replaced device leaves after. False when the key couldn't be saved; then nothing
    /// changes.
    func connect(_ joined: CrewluCloudDevice.Joined, keepingAlerts: Bool) async -> Bool {
        guard let replaced = device.switchTo(joined) else { return false }
        if !keepingAlerts {
            connection.forgetPilot()
        }
        connection.leaveICloud(forgetShare: forgetICloudShare)
        connection.sharingEndedWith = nil
        sharingEndedWith = nil
        reading = nil
        didConnect()
        await device.leave(replaced)
        _ = await refresh()
        return true
    }

    /// Disconnect (spec §7.5): this device leaves, then forgets its key, the connection, the pilot and
    /// any iCloud share, with no note. False when Crewlu Cloud couldn't be reached; then the device
    /// stays connected. A join that switched this device meanwhile keeps its new connection.
    func disconnect() async -> Bool {
        do {
            guard try await device.disconnect() else { return true }
        } catch {
            return false
        }
        forgetPilot()
        connection.leaveICloud(forgetShare: forgetICloudShare)
        report(PilotStatusUpdate(outcome: .notConnected, readAt: Date()))
        return true
    }

    /// iCloud's share data was reset, as the share ended: an iCloud reading is no longer the pilot's
```

with:

```swift
        }
    }

    func report(_ update: PilotStatusUpdate) {
        lastUpdate = update
        NotificationCenter.default.post(name: .pilotStatusDidUpdate, object: self)
    }

    /// iCloud's share data was reset, as the share ended: an iCloud reading is no longer the pilot's
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    func forgetICloudReading() {
        guard case .iCloud? = reading else { return }
        reading = nil
    }

    /// Sharing with this device ended: the welcome screen's note names the pilot last seen, if any,
    /// and the pilot is forgotten (spec §7.6).
    private func noteSharingEnded() {
        connection.sharingEndedWith = connection.pilotName
        sharingEndedWith = connection.pilotName
        forgetPilot()
    }

    private func forgetPilot() {
        reading = nil
        connection.forgetPilot()
    }

    // MARK: - The 60-Second Check
```

with:

```swift
    func forgetICloudReading() {
        guard case .iCloud? = reading else { return }
        reading = nil
    }

    // MARK: - The 60-Second Check
```

- [x] **Step 5: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 291 tests in 27 suites passed`.

- [x] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PilotStatusSource+Connecting.swift Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift Crewluv/Services/PilotStatusSource.swift CrewluvTests/CrewluCloudDeviceTests.swift CrewluvTests/PilotStatusSourceTests.swift && git -C ~/Dev/Crewluv commit -q -m "refactor(crewluv): the source's connection changes get their own file, and a switch leaves the key for this partner's other devices" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 8: After iCloud's status shows, the move-over takes its turn

**Files:**
- Modify: `Crewluv/Models/PartnerConnection.swift`, `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`, `Crewluv/Services/PilotStatusSource.swift`, `Crewluv/Services/PilotStatusSource+Connecting.swift`
- Test: `CrewluvTests/PilotStatusSourceTests.swift`, `CrewluvTests/CrewluCloudDeviceTests.swift`, `CrewluvTests/Helpers/PartnerCloudStandIns.swift`

Spec §8.1, §8.2 and §8.4, and decisions 3, 4, 7 and 8.
- **Each read reports first.** Then, when it was iCloud's and brought the record, the move-over takes its turn, and a switch reports again.
- **A key a reinstall left goes through the move-over's read,** so 4b's `CrewluCloudDevice.adoptLeftoverKey()` and its two tests go.
- **When iCloud's share is gone,** the move-over decides: switch, or end with the right note. The note is saved, so it survives a relaunch.
- **Both switches go through `switchConnection`** and keep what the alerts kept.
- **The source names this device** in the pilot's list, for the move's redeem, as the joiner does.

- [x] **Step 1: Write the failing tests**

The iCloud read's stand-in can bring a ticket.

One replacement in `CrewluvTests/Helpers/PartnerCloudStandIns.swift`:

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift

    /// An iCloud read of a record made at `lastUpdated`.
    static func iCloud(
        lastUpdated: TimeInterval, displayName: String? = nil, isDisplayNameKnown: Bool = true
    ) throws -> ICloudReading {
        ICloudReading(
            status: try summary(lastUpdated: lastUpdated).pilotStatus(partnerID: partnerA, at: .now),
            displayName: displayName,
            isDisplayNameKnown: isDisplayNameKnown,
            recordModifiedAt: nil
        )
    }
}
```

with:

```swift

    /// An iCloud read of a record made at `lastUpdated`.
    static func iCloud(
        lastUpdated: TimeInterval, displayName: String? = nil, isDisplayNameKnown: Bool = true, moveTicket: String? = nil
    ) throws -> ICloudReading {
        ICloudReading(
            status: try summary(lastUpdated: lastUpdated).pilotStatus(partnerID: partnerA, at: .now),
            displayName: displayName,
            isDisplayNameKnown: isDisplayNameKnown,
            recordModifiedAt: nil,
            moveTicket: moveTicket
        )
    }
}
```

One replacement in `CrewluvTests/CrewluCloudDeviceTests.swift`:

In `CrewluvTests/CrewluCloudDeviceTests.swift`, replace:

```swift

    // MARK: - Reads the Connection Changed Under

    @Test func test_aLeftoverKeysRefusal_thatASwitchOvertook_forgetsNothing() async {
        keys.key = Make.key
        door.viewAnswers = [.failure(.refused(.sharingEnded))]
        door.holdsViews = true
        let device = device()

        let adopting = Task { await device.adoptLeftoverKey() }
        await eventually { door.views.count == 1 }
        _ = device.switchTo(CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: Make.key, isDeviceKey: true))
        door.release()

        #expect(await adopting.value == nil)
        #expect(keys.key == Make.key)
        #expect(device.partnerID == Make.partnerB)
    }

    @Test func test_aLeftoverKeysAnswer_thatASwitchOvertook_connectsNothing() async throws {
        keys.key = Make.key
        keys.pending = "pending"
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary())]
        door.holdsViews = true
        let device = device()

        let adopting = Task { await device.adoptLeftoverKey() }
        await eventually { door.views.count == 1 }
        _ = device.switchTo(CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: "pending", isDeviceKey: false))
        door.release()

        #expect(await adopting.value == nil)
        #expect(device.partnerID == Make.partnerB)
        #expect(defaults.string(forKey: "partnerCloud.partnerID") == Make.partnerB)
    }

    @Test func test_sharingEnded_forAKeyReplacedMeanwhile_forgetsNothing() async {
        door.viewAnswers = [.failure(.refused(.sharingEnded))]
        door.holdsViews = true
```

with:

```swift

    // MARK: - Reads the Connection Changed Under

    @Test func test_sharingEnded_forAKeyReplacedMeanwhile_forgetsNothing() async {
        door.viewAnswers = [.failure(.refused(.sharingEnded))]
        door.holdsViews = true
```

4 replacements, in order, in `CrewluvTests/PilotStatusSourceTests.swift`:

In `CrewluvTests/PilotStatusSourceTests.swift`, replace:

```swift
        #expect(source.crewluCloudPartnerID == Make.partnerA)
        #expect(defaults.string(forKey: "partnerCloud.partnerID") == Make.partnerA)
        #expect(door.views.map(\.since) == [nil])
        #expect(iCloud.fetches == 0)
        #expect(connects.count == 1)
    }

    @Test func test_leftoverKey_sharingEnded_isForgotten_andICloudIsRead() async throws {
```

with:

```swift
        #expect(source.crewluCloudPartnerID == Make.partnerA)
        #expect(defaults.string(forKey: "partnerCloud.partnerID") == Make.partnerA)
        #expect(door.views.map(\.since) == [nil])
        #expect(iCloud.fetches == 1)
        #expect(connects.count == 1)
        #expect(keys.copy == Make.key)
        #expect(defaults.bool(forKey: "partnerCloud.leftICloud"))
    }

    @Test func test_leftoverKey_sharingEnded_isForgotten_andICloudIsRead() async throws {
```

In `CrewluvTests/PilotStatusSourceTests.swift`, replace:

```swift

        #expect(await source.refresh() == .noStatusYet)
        #expect(source.isOnCrewluCloud)
        #expect(iCloud.fetches == 0)
        #expect(connects.count == 1)
    }
```

with:

```swift

        #expect(await source.refresh() == .noStatusYet)
        #expect(source.isOnCrewluCloud)
        #expect(iCloud.fetches == 1)
        #expect(connects.count == 1)
    }
```

In `CrewluvTests/PilotStatusSourceTests.swift`, replace:

```swift

        #expect(await source.refresh() == .sharingEnded)
        #expect(source.sharingEndedWith == "Dad")
    }

    @Test func test_sharingEnded_beforeAnyStatus_leavesNoNote() async {
```

with:

```swift

        #expect(await source.refresh() == .sharingEnded)
        #expect(source.sharingEndedWith == "Dad")
        #expect(!source.isLeftBehind)
    }

    @Test func test_sharingEnded_beforeAnyStatus_leavesNoNote() async {
```

In `CrewluvTests/PilotStatusSourceTests.swift`, replace:

```swift
        #expect(source.isOnCrewluCloud)
    }

    // MARK: - Disconnect

    @Test func test_disconnect_leaves_thenForgetsTheKeyTheConnectionAndThePilot() async throws {
```

with:

```swift
        #expect(source.isOnCrewluCloud)
    }

    // MARK: - The Move-Over

    /// This device follows the pilot through iCloud, whose last record had `moveTicket` for it.
    private func onICloud(moveTicket: String? = nil) throws {
        defaults.set("_owner", forKey: "SharedZoneOwner")
        iCloud.results = [.success(try Make.iCloud(lastUpdated: 1, displayName: "Dad", moveTicket: moveTicket))]
    }

    private static let joinedB = PartnerJoinAnswer(deviceID: "device-b", partnerID: Make.partnerB)

    @Test func test_moveOver_switchesOnceCrewluCloudHasAStatus_keepingWhatTheAlertsKept() async throws {
        try onICloud(moveTicket: "ticket")
        door.joinAnswers = [.success(Self.joinedB)]
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary(lastUpdated: 1), partnerID: Make.partnerB)]
        defaults.set(Data([1]), forKey: "LastSeenPilotSnapshot")
        let source = makeSource()

        #expect(await source.refresh() == .newStatus)

        let key = try #require(keys.key)
        #expect(source.crewluCloudPartnerID == Make.partnerB)
        #expect(door.joins.map(\.link) == [.code("ticket")])
        #expect(iCloudForgets.count == 1)
        #expect(iCloudResets.count == 0)
        #expect(defaults.bool(forKey: "partnerCloud.leftICloud"))
        #expect(keys.copy == key)
        #expect(connects.count == 1)
        #expect(defaults.data(forKey: "LastSeenPilotSnapshot") == Data([1]))
        #expect(defaults.string(forKey: "partnerCloud.moveToPartnerID") == nil)
        #expect(source.lastUpdate?.outcome == .newStatus)
    }

    @Test func test_moveOver_showsICloudsStatusFirst() async throws {
        try onICloud(moveTicket: "ticket")
        door.joinAnswers = [.success(Self.joinedB)]
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary(lastUpdated: 1), partnerID: Make.partnerB)]
        door.holdsViews = true
        let source = makeSource()

        let refreshing = Task { await source.refresh() }
        await eventually { door.views.count == 1 }

        #expect(source.lastUpdate?.outcome == .newStatus)
        #expect(!source.isOnCrewluCloud)
        door.release()
        #expect(await refreshing.value == .newStatus)
        #expect(source.isOnCrewluCloud)
    }

    @Test func test_moveOver_thatCantRedeemNow_staysOnICloud() async throws {
        try onICloud(moveTicket: "ticket")
        door.joinAnswers = [.failure(.refused(.tryLater))]
        let source = makeSource()

        #expect(await source.refresh() == .newStatus)

        #expect(!source.isOnCrewluCloud)
        #expect(source.reading != nil)
        #expect(iCloudForgets.count == 0)
    }

    @Test func test_moveOver_afterAnUnchangedICloudRead_switches_andSaysSo() async throws {
        try onICloud()
        iCloud.results.append(.success(try Make.iCloud(lastUpdated: 1, displayName: "Dad", moveTicket: "ticket")))
        door.joinAnswers = [.success(Self.joinedB)]
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary(lastUpdated: 1), partnerID: Make.partnerB)]
        let source = makeSource()
        _ = await source.refresh()

        #expect(await source.refresh() == .newStatus)

        #expect(source.crewluCloudPartnerID == Make.partnerB)
        #expect(source.lastUpdate?.outcome == .newStatus)
    }

    @Test func test_aKeyAReinstallLeft_forThisPilot_switchesAfterICloudsStatus() async throws {
        try onICloud()
        keys.key = Make.key
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary(lastUpdated: 1))]
        let source = makeSource()

        _ = await source.refresh()

        #expect(source.crewluCloudPartnerID == Make.partnerA)
        #expect(iCloudForgets.count == 1)
    }

    @Test func test_aKeyAReinstallLeft_forAnotherPilot_staysOnICloud() async throws {
        try onICloud()
        keys.key = Make.key
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary(["pilotId": "sam"]))]
        let source = makeSource()

        _ = await source.refresh()

        #expect(!source.isOnCrewluCloud)
        #expect(keys.key == Make.key)
    }

    @Test func test_shareGone_duringAMove_switchesAtOnce_withoutTheWelcomeScreen() async throws {
        defaults.set("_owner", forKey: "SharedZoneOwner")
        defaults.set("Dad", forKey: "partnerCloud.pilotName")
        keys.key = Make.key
        defaults.set(Make.partnerB, forKey: "partnerCloud.moveToPartnerID")
        iCloud.results = [.failure(ICloudFetchError.shareGone)]
        door.viewAnswers = [.success(PartnerViewAnswer(partnerID: Make.partnerB, updatedAt: nil, content: .noSummaryYet))]
        let source = makeSource()

        #expect(await source.refresh() == .noStatusYet)

        #expect(source.crewluCloudPartnerID == Make.partnerB)
        #expect(iCloudResets.count == 0)
        #expect(source.sharingEndedWith == nil)
    }

    @Test func test_shareGone_duringAMove_switchesEvenWhenCrewluCloudCantBeReached() async {
        defaults.set("_owner", forKey: "SharedZoneOwner")
        keys.key = Make.key
        defaults.set(Make.partnerB, forKey: "partnerCloud.moveToPartnerID")
        iCloud.results = [.failure(ICloudFetchError.shareGone)]
        let source = makeSource()

        #expect(await source.refresh() == .failed("No connection to Crewlu Cloud"))

        #expect(source.crewluCloudPartnerID == Make.partnerB)
        #expect(iCloudResets.count == 0)
    }

    @Test func test_shareGone_whileAJoinSwitchesThisDevice_endsNothing() async {
        defaults.set("_owner", forKey: "SharedZoneOwner")
        defaults.set("Dad", forKey: "partnerCloud.pilotName")
        keys.key = Make.key
        defaults.set(Make.partnerB, forKey: "partnerCloud.moveToPartnerID")
        iCloud.results = [.failure(ICloudFetchError.shareGone)]
        door.holdsViews = true
        let source = makeSource()

        let refreshing = Task { await source.refresh() }
        await eventually { door.views.count == 1 }
        _ = source.switchConnection(to: CrewluCloudDevice.Joined(partnerID: Make.partnerA, key: "joined", isDeviceKey: false), keepingAlerts: false)
        door.release()

        #expect(await refreshing.value == .superseded)
        #expect(source.sharingEndedWith == nil)
        #expect(iCloudResets.count == 0)
    }

    @Test func test_shareGone_withAnotherDeviceThatCantBeFollowedNow_saysSo() async throws {
        defaults.set("_owner", forKey: "SharedZoneOwner")
        defaults.set("pilot", forKey: "partnerCloud.pilotID")
        defaults.set("Dad", forKey: "partnerCloud.pilotName")
        keys.copy = "copy"
        iCloud.results = [.failure(ICloudFetchError.shareGone)]
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary())]
        let source = makeSource()

        #expect(await source.refresh() == .sharingEnded)

        #expect(source.sharingEndedWith == "Dad")
        #expect(source.isLeftBehind)
        #expect(iCloudResets.count == 1)
    }

    @Test func test_theLeftBehindNote_goesWithTheNextStatus() async throws {
        defaults.set("Dad", forKey: "partnerCloud.sharingEndedWith")
        defaults.set(true, forKey: "partnerCloud.sharingEndedLeftBehind")
        iCloud.results = [.success(try Make.iCloud(lastUpdated: 1))]
        let source = makeSource()
        #expect(source.isLeftBehind)

        _ = await source.refresh()

        #expect(!source.isLeftBehind)
    }

    @Test func test_theLeftBehindNote_staysAfterARelaunch() async throws {
        defaults.set("_owner", forKey: "SharedZoneOwner")
        defaults.set("pilot", forKey: "partnerCloud.pilotID")
        defaults.set("Dad", forKey: "partnerCloud.pilotName")
        keys.copy = "copy"
        iCloud.results = [.failure(ICloudFetchError.shareGone)]
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary())]
        _ = await makeSource().refresh()

        let relaunched = makeSource()

        #expect(relaunched.sharingEndedWith == "Dad")
        #expect(relaunched.isLeftBehind)
    }

    // MARK: - Disconnect

    @Test func test_disconnect_leaves_thenForgetsTheKeyTheConnectionAndThePilot() async throws {
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `value of type 'PilotStatusSource' has no member 'isLeftBehind'`.

- [x] **Step 3: Save whether the note is for a device left behind**

2 replacements, in order, in `Crewluv/Models/PartnerConnection.swift`:

In `Crewluv/Models/PartnerConnection.swift`, replace:

```swift
    static let sharingEndedWithKey = "partnerCloud.sharingEndedWith"
    static let leftICloudKey = "partnerCloud.leftICloud"
    static let moveToPartnerIDKey = "partnerCloud.moveToPartnerID"
    /// Where the alerts' title name is kept, as before.
    static let displayNameKey = "ResolvedPilotDisplayName"
```

with:

```swift
    static let sharingEndedWithKey = "partnerCloud.sharingEndedWith"
    static let leftICloudKey = "partnerCloud.leftICloud"
    static let moveToPartnerIDKey = "partnerCloud.moveToPartnerID"
    static let leftBehindKey = "partnerCloud.sharingEndedLeftBehind"
    /// Where the alerts' title name is kept, as before.
    static let displayNameKey = "ResolvedPilotDisplayName"
```

In `Crewluv/Models/PartnerConnection.swift`, replace:

```swift
    var partnerID: String? {
        get { defaults.string(forKey: Self.partnerIDKey) }
        nonmutating set { defaults.set(newValue, forKey: Self.partnerIDKey) }
    }

    /// A move under way (spec §8.1): the partner id that redeeming a ticket or a code gave this
```

with:

```swift
    var partnerID: String? {
        get { defaults.string(forKey: Self.partnerIDKey) }
        nonmutating set { defaults.set(newValue, forKey: Self.partnerIDKey) }
    }

    /// Whether the note is for a device left behind: another of this partner's devices follows the
    /// pilot on Crewlu Cloud, so a code from it works here (spec §7.7, §8.3).
    var isLeftBehind: Bool {
        get { defaults.bool(forKey: Self.leftBehindKey) }
        nonmutating set { defaults.set(newValue, forKey: Self.leftBehindKey) }
    }

    /// A move under way (spec §8.1): the partner id that redeeming a ticket or a code gave this
```

- [x] **Step 4: A key a reinstall left goes to the move-over**

One replacement in `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`:

In `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`, replace:

```swift
        }
        guard generation == self.generation else { return .superseded }
        return .answer(answer)
    }

    /// A key with no connection saved is what a reinstall leaves: iOS keeps an app's Keychain items,
    /// not its settings (spec §5.3). Reads with it, and connects when Crewlu Cloud answers with a
    /// summary, or with none yet on a device without an iCloud share. Nil carries on with iCloud;
    /// it's tried on every refresh until Crewlu Cloud answers, or the Keychain can be read. An
    /// answer that a switch overtook, say a join with the same key, forgets and connects nothing.
    func adoptLeftoverKey() async -> PartnerViewAnswer? {
        guard let key = try? keys.deviceKey() else { return nil }
        let generation = generation
        let answer: PartnerViewAnswer
        do {
            answer = try await door.view(key: key, since: nil)
        } catch .refused(.sharingEnded) {
            if generation == self.generation {
                keys.forgetDeviceKey()
            }
            return nil
        } catch {
            return nil
        }
        guard generation == self.generation else { return nil }
        if case .noSummaryYet = answer.content, connection.hasICloudShare {
            return nil
        }
        connection.partnerID = answer.partnerID
        partnerID = answer.partnerID
        return answer
    }

    // MARK: - Joining
```

with:

```swift
        }
        guard generation == self.generation else { return .superseded }
        return .answer(answer)
    }

    // MARK: - Joining
```

- [x] **Step 5: Note a device left behind**

One replacement in `Crewluv/Services/PilotStatusSource+Connecting.swift`:

In `Crewluv/Services/PilotStatusSource+Connecting.swift`, replace:

```swift
        return true
    }

    /// Sharing with this device ended: the welcome screen's note names the pilot last seen, if any,
    /// and the pilot is forgotten (spec §7.6).
    func noteSharingEnded() {
        connection.sharingEndedWith = connection.pilotName
        sharingEndedWith = connection.pilotName
        forgetPilot()
```

with:

```swift
        return true
    }

    /// Whether the welcome screen's note is for a device left behind: another of this partner's devices
    /// follows the pilot on Crewlu Cloud, so a code from it works here (spec §7.7).
    var isLeftBehind: Bool {
        sharingEndedWith != nil && connection.isLeftBehind
    }

    /// Sharing with this device ended: the welcome screen's note names the pilot last seen, if any,
    /// and the pilot is forgotten (spec §7.6).
    func noteSharingEnded(leftBehind: Bool = false) {
        connection.isLeftBehind = leftBehind
        connection.sharingEndedWith = connection.pilotName
        sharingEndedWith = connection.pilotName
        forgetPilot()
```

- [x] **Step 6: Give the move-over its turn**

8 replacements, in order, in `Crewluv/Services/PilotStatusSource.swift`:

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift

import Foundation
import Observation

/// The one place that reads the pilot's status, whoever asks: the screen, a push or the background
/// refresh (partner links piece 4 spec §5.1). It reads Crewlu Cloud through `device` once connected
```

with:

```swift

import Foundation
import Observation
#if canImport(UIKit)
import UIKit
#endif

/// The one place that reads the pilot's status, whoever asks: the screen, a push or the background
/// refresh (partner links piece 4 spec §5.1). It reads Crewlu Cloud through `device` once connected
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    /// Forgets the iCloud share without showing the welcome screen (spec §7.2).
    @ObservationIgnored let forgetICloudShare: @MainActor () -> Void
    @ObservationIgnored private let reads = ReadQueue<RefreshOutcome>()

    static let unreachable = "No connection to Crewlu Cloud"
    private static let keyUnreadable = "This device's key couldn't be read"

    init(
        iCloud: ICloudStatusFetching = ICloudStatusFetcher(),
```

with:

```swift
    /// Forgets the iCloud share without showing the welcome screen (spec §7.2).
    @ObservationIgnored let forgetICloudShare: @MainActor () -> Void
    @ObservationIgnored private let reads = ReadQueue<RefreshOutcome>()
    /// Moves this device from iCloud to Crewlu Cloud by itself (spec §8).
    @ObservationIgnored private let moveOver: MoveOver

    static let unreachable = "No connection to Crewlu Cloud"
    private static let keyUnreadable = "This device's key couldn't be read"
    private static let keyUnsaved = "This device's key couldn't be saved"

    /// "iPhone" or "iPad": this device's name in the pilot's list, since iOS doesn't give apps the
    /// device's own name.
    static var deviceLabel: String {
        #if canImport(UIKit)
        UIDevice.current.model
        #else
        "iPhone"
        #endif
    }

    init(
        iCloud: ICloudStatusFetching = ICloudStatusFetcher(),
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        iCloudShareEnded: @escaping @MainActor () -> Void = { CloudKitShareManager.shared.resetShareData() },
        periodicCheck: RepeatingRefresh = RepeatingRefresh(),
        didConnect: @escaping @MainActor () -> Void = { Task { await PushRegistrar.shared.register() } },
        forgetICloudShare: @escaping @MainActor () -> Void = { CloudKitShareManager.shared.forgetShareQuietly() }
    ) {
        self.iCloud = iCloud
        self.notifier = notifier
```

with:

```swift
        iCloudShareEnded: @escaping @MainActor () -> Void = { CloudKitShareManager.shared.resetShareData() },
        periodicCheck: RepeatingRefresh = RepeatingRefresh(),
        didConnect: @escaping @MainActor () -> Void = { Task { await PushRegistrar.shared.register() } },
        forgetICloudShare: @escaping @MainActor () -> Void = { CloudKitShareManager.shared.forgetShareQuietly() },
        deviceLabel: String = PilotStatusSource.deviceLabel
    ) {
        self.iCloud = iCloud
        self.notifier = notifier
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        self.forgetICloudShare = forgetICloudShare
        connection = PartnerConnection(defaults: defaults)
        device = CrewluCloudDevice(door: door, keys: keys, connection: connection)
        sharingEndedWith = connection.sharingEndedWith
    }
```

with:

```swift
        self.forgetICloudShare = forgetICloudShare
        connection = PartnerConnection(defaults: defaults)
        device = CrewluCloudDevice(door: door, keys: keys, connection: connection)
        moveOver = MoveOver(door: door, keys: keys, connection: connection, device: device, label: deviceLabel)
        sharingEndedWith = connection.sharingEndedWith
    }
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift

    /// Reads the status from wherever this device follows its pilot, and tells the screen how it
    /// went before anyone waiting on the read carries on. A refresh asked for during a read, say
    /// for a push that came mid-read, gets one more read once that one ends (`ReadQueue`).
    func refresh() async -> RefreshOutcome {
        await reads.run { [self] in
            let readAt = Date()
            let outcome = await read()
            report(PilotStatusUpdate(outcome: outcome, readAt: readAt))
            return outcome
        }
    }
```

with:

```swift

    /// Reads the status from wherever this device follows its pilot, and tells the screen how it
    /// went before anyone waiting on the read carries on. A refresh asked for during a read, say
    /// for a push that came mid-read, gets one more read once that one ends (`ReadQueue`). After
    /// iCloud's record is read and shown, the move-over takes its turn (spec §8.1).
    func refresh() async -> RefreshOutcome {
        await reads.run { [self] in
            let readAt = Date()
            let read = await read()
            report(PilotStatusUpdate(outcome: read.outcome, readAt: readAt))
            guard let record = read.record, let moved = await moveOverTurn(after: record) else { return read.outcome }
            report(PilotStatusUpdate(outcome: moved, readAt: Date()))
            return moved
        }
    }
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift

    // MARK: - Reading

    private func read() async -> RefreshOutcome {
        if isOnCrewluCloud {
            return await readCrewluCloud()
        }
        let generation = device.generation
        if let outcome = await adoptLeftoverKey() {
            return outcome
        }
        // A switch while the leftover key was read: the read that follows tells.
        guard generation == device.generation else { return .superseded }
        return await readICloud()
    }
```

with:

```swift

    // MARK: - Reading

    /// How a read went, and iCloud's record when it brought it, for the move-over's turn.
    private struct Read {
        let outcome: RefreshOutcome
        var record: ICloudReading?
    }

    private func read() async -> Read {
        if isOnCrewluCloud {
            return Read(outcome: await readCrewluCloud())
        }
        return await readICloud()
    }
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        }
    }

    /// A key a reinstall left connects this device when Crewlu Cloud answers for it (spec §5.3).
    /// Nil carries on with iCloud.
    private func adoptLeftoverKey() async -> RefreshOutcome? {
        guard let answer = await device.adoptLeftoverKey() else { return nil }
        didConnect()
        return await take(answer)
    }
```

with:

```swift
        }
    }

    /// With no iCloud to follow, a key a reinstall left connects this device when Crewlu Cloud
    /// answers for it, with a summary or none yet (spec §5.3). It's tried on every refresh until it
    /// answers. A read that a switch overtook brings nothing back.
    private func adoptLeftoverKey() async -> RefreshOutcome {
        let generation = device.generation
        guard case .answer(let key, let answer) = await moveOver.readUnconnectedKey() else {
            return generation == device.generation ? .notConnected : .superseded
        }
        return await switchOver(to: .init(partnerID: answer.partnerID, key: key, isDeviceKey: true), answer: answer)
    }

    /// The move-over's turn, after iCloud's record was read (spec §8.1). Nil while this device stays
    /// on iCloud.
    private func moveOverTurn(after record: ICloudReading) async -> RefreshOutcome? {
        guard case .switchTo(let joined, let answer) = await moveOver.afterRead(ticket: record.moveTicket) else { return nil }
        return await switchOver(to: joined, answer: answer)
    }

    /// Switches to a key this device already holds, from within a read: a key a reinstall left, or the
    /// move-over's (spec §5.3, §8.2). It replaces no other device, since the key is this device's own,
    /// and what the alerts kept stays, since it's the same pilot. The read is Crewlu Cloud's answer, or
    /// a failure when it couldn't be reached.
    private func switchOver(to joined: CrewluCloudDevice.Joined, answer: PartnerViewAnswer?) async -> RefreshOutcome {
        guard switchConnection(to: joined, keepingAlerts: true) != nil else { return .failed(Self.keyUnsaved) }
        guard let answer else { return .failed(Self.unreachable) }
        return await take(answer)
    }
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift

    /// iCloud's read. One that a switch to Crewlu Cloud overtook was the old connection's: it brings
    /// nothing back, and ends nothing.
    private func readICloud() async -> RefreshOutcome {
        let generation = device.generation
        do {
            let fetched = try await iCloud.fetch()
            guard generation == device.generation else { return .superseded }
            if let reading, reading.lastUpdated == fetched.status.lastUpdated {
                takeLookedUpName(from: fetched)
                return .unchanged
            }
            return await adopt(.iCloud(fetched))
        } catch _ where generation != device.generation {
            return .superseded
        } catch ICloudFetchError.notConnected {
            return .notConnected
        } catch ICloudFetchError.shareGone {
            noteSharingEnded()
            iCloudShareEnded()
            return .sharingEnded
        } catch {
            return .failed(error.localizedDescription)
        }
    }
```

with:

```swift

    /// iCloud's read. One that a switch to Crewlu Cloud overtook was the old connection's: it brings
    /// nothing back, and ends nothing.
    private func readICloud() async -> Read {
        let generation = device.generation
        do {
            let fetched = try await iCloud.fetch()
            guard generation == device.generation else { return Read(outcome: .superseded) }
            if let reading, reading.lastUpdated == fetched.status.lastUpdated {
                takeLookedUpName(from: fetched)
                return Read(outcome: .unchanged, record: fetched)
            }
            return Read(outcome: await adopt(.iCloud(fetched)), record: fetched)
        } catch _ where generation != device.generation {
            return Read(outcome: .superseded)
        } catch ICloudFetchError.notConnected {
            return Read(outcome: await adoptLeftoverKey())
        } catch ICloudFetchError.shareGone {
            return Read(outcome: await iCloudShareGone())
        } catch {
            return Read(outcome: .failed(error.localizedDescription))
        }
    }

    /// iCloud's share is gone (spec §7.6, §8.4): a move under way, or another of this partner's
    /// devices, carries this device on to Crewlu Cloud. Otherwise sharing ended. A switch that
    /// overtook it, say by a join, tells instead.
    private func iCloudShareGone() async -> RefreshOutcome {
        switch await moveOver.afterShareGone() {
        case .switchTo(let joined, let answer):
            return await switchOver(to: joined, answer: answer)
        case .ended(let leftBehind):
            noteSharingEnded(leftBehind: leftBehind)
            iCloudShareEnded()
            return .sharingEnded
        case .stay:
            return .superseded
        }
    }
```

- [x] **Step 7: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 301 tests in 27 suites passed`.

- [x] **Step 8: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Models/PartnerConnection.swift Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift Crewluv/Services/PilotStatusSource.swift Crewluv/Services/PilotStatusSource+Connecting.swift CrewluvTests/PilotStatusSourceTests.swift CrewluvTests/CrewluCloudDeviceTests.swift CrewluvTests/Helpers/PartnerCloudStandIns.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): after iCloud's status shows, the move-over takes its turn; a share that's gone carries a move on" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 9: The note for a device left behind

**Files:**
- Create: `Crewluv/Models/SharingEndedNote.swift`
- Modify: `Crewluv/Services/PilotStatusSource+Connecting.swift`, `Crewluv/Services/PartnerStatusReceiver.swift`, `Crewluv/Views/Welcome/WelcomeView.swift`, `Crewluv/Views/Welcome/ContentView.swift`
- Test: `CrewluvTests/SharingEndedNoteTests.swift`, `CrewluvTests/PilotStatusSourceTests.swift`

Spec §7.7 and decision 8. The welcome screen's note becomes a small model, `SharingEndedNote`. It says either that sharing ended or, on a device left behind, how to follow the other device. The source gives the screen whichever applies. The screen's capsule is renamed `SharingEndedCapsule`, since the model takes its old name.

- [x] **Step 1: Write the failing tests**

File: `CrewluvTests/SharingEndedNoteTests.swift`

```swift
//
//  SharingEndedNoteTests.swift
//  CrewluvTests
//
//  The welcome screen's note when sharing ended (partner links piece 4 spec §7.6, §7.7)
//

import Testing
@testable import Crewluv

struct SharingEndedNoteTests {
    @Test func test_sharingEnded() {
        #expect(SharingEndedNote(pilot: "Alex", isLeftBehind: false).text == "Sharing with Alex has ended.")
    }

    @Test func test_aDeviceLeftBehind_isToldHowToFollowTheOther() {
        #expect(SharingEndedNote(pilot: "Alex", isLeftBehind: true).text
            == "To keep seeing Alex's status here, type the code from CrewLuve on your other device.")
    }
}
```

One replacement in `CrewluvTests/PilotStatusSourceTests.swift`:

In `CrewluvTests/PilotStatusSourceTests.swift`, replace:

```swift
        #expect(relaunched.isLeftBehind)
    }

    // MARK: - Disconnect

    @Test func test_disconnect_leaves_thenForgetsTheKeyTheConnectionAndThePilot() async throws {
```

with:

```swift
        #expect(relaunched.isLeftBehind)
    }

    @Test func test_theWelcomeScreensNote_saysWhetherThisDeviceWasLeftBehind() {
        defaults.set("Dad", forKey: "partnerCloud.sharingEndedWith")
        #expect(makeSource().sharingEndedNote == SharingEndedNote(pilot: "Dad", isLeftBehind: false))

        defaults.set(true, forKey: "partnerCloud.sharingEndedLeftBehind")
        #expect(makeSource().sharingEndedNote == SharingEndedNote(pilot: "Dad", isLeftBehind: true))

        defaults.removeObject(forKey: "partnerCloud.sharingEndedWith")
        #expect(makeSource().sharingEndedNote == nil)
    }

    // MARK: - Disconnect

    @Test func test_disconnect_leaves_thenForgetsTheKeyTheConnectionAndThePilot() async throws {
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `cannot find 'SharingEndedNote' in scope`.

- [x] **Step 3: Write the note**

File: `Crewluv/Models/SharingEndedNote.swift`

```swift
//
//  SharingEndedNote.swift
//  CrewLuve
//
//  The welcome screen's note when sharing with this device ended
//

import Foundation

/// The welcome screen's note when sharing with this device ended (partner links piece 4 spec §7.6):
/// that it ended, or, for a device left behind when another of this partner's devices moved to
/// Crewlu Cloud, how to follow it there (§7.7).
nonisolated struct SharingEndedNote: Equatable, Sendable {
    /// The pilot, as this partner saw them.
    let pilot: String
    /// Another of this partner's devices follows the pilot on Crewlu Cloud, so a code from it works here.
    let isLeftBehind: Bool

    var text: String {
        isLeftBehind
            ? "To keep seeing \(pilot)'s status here, type the code from CrewLuve on your other device."
            : "Sharing with \(pilot) has ended."
    }
}
```

- [x] **Step 4: The source gives the note that applies**

One replacement in `Crewluv/Services/PilotStatusSource+Connecting.swift`:

In `Crewluv/Services/PilotStatusSource+Connecting.swift`, replace:

```swift
        sharingEndedWith != nil && connection.isLeftBehind
    }

    /// Sharing with this device ended: the welcome screen's note names the pilot last seen, if any,
    /// and the pilot is forgotten (spec §7.6).
    func noteSharingEnded(leftBehind: Bool = false) {
```

with:

```swift
        sharingEndedWith != nil && connection.isLeftBehind
    }

    /// The welcome screen's note after sharing with this device ended (spec §7.6, §7.7).
    var sharingEndedNote: SharingEndedNote? {
        sharingEndedWith.map { SharingEndedNote(pilot: $0, isLeftBehind: isLeftBehind) }
    }

    /// Sharing with this device ended: the welcome screen's note names the pilot last seen, if any,
    /// and the pilot is forgotten (spec §7.6).
    func noteSharingEnded(leftBehind: Bool = false) {
```

- [x] **Step 5: The screen's model passes it on**

One replacement in `Crewluv/Services/PartnerStatusReceiver.swift`:

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift

    /// Whether this device follows its pilot on Crewlu Cloud, for the screens' wording (spec §7.7).
    var isOnCrewluCloud: Bool { statusSource.isOnCrewluCloud }
    /// The pilot whose sharing with this device ended, for the welcome screen's note (spec §7.6).
    var sharingEndedWith: String? { statusSource.sharingEndedWith }

    // MARK: - Data Source
```

with:

```swift

    /// Whether this device follows its pilot on Crewlu Cloud, for the screens' wording (spec §7.7).
    var isOnCrewluCloud: Bool { statusSource.isOnCrewluCloud }
    /// The welcome screen's note after sharing with this device ended (spec §7.6, §7.7).
    var sharingEndedNote: SharingEndedNote? { statusSource.sharingEndedNote }

    // MARK: - Data Source
```

- [x] **Step 6: The welcome screen shows it**

3 replacements, in order, in `Crewluv/Views/Welcome/WelcomeView.swift`:

In `Crewluv/Views/Welcome/WelcomeView.swift`, replace:

```swift

/// The welcome screen (partner links piece 4 spec §7.4): today's three steps reworded for links,
/// the code from another device, Try Demo, and a small paste line for a link that opened a web page
/// instead. After sharing ends, a note at the top says so (§7.6).
struct WelcomeView: View {
    /// The pilot whose sharing with this device ended, for the note at the top.
    var sharingEndedWith: String?
    var onTryDemo: () -> Void
    /// Joins with a code. False when it didn't connect, so the boxes clear.
    var onJoin: (PartnerLink) async -> Bool
```

with:

```swift

/// The welcome screen (partner links piece 4 spec §7.4): today's three steps reworded for links,
/// the code from another device, Try Demo, and a small paste line for a link that opened a web page
/// instead. After sharing ends, a note at the top says so (§7.6), or, on a device left behind by a
/// move to Crewlu Cloud, how to follow the pilot there (§7.7).
struct WelcomeView: View {
    /// The note at the top after sharing with this device ended.
    var sharingEnded: SharingEndedNote?
    var onTryDemo: () -> Void
    /// Joins with a code. False when it didn't connect, so the boxes clear.
    var onJoin: (PartnerLink) async -> Bool
```

In `Crewluv/Views/Welcome/WelcomeView.swift`, replace:

```swift
        ScrollView {
            GlassEffectContainer(spacing: 20) {
                VStack(spacing: 32) {
                    if let sharingEndedWith {
                        SharingEndedNote(pilot: sharingEndedWith)
                    }
                    header
                    steps
```

with:

```swift
        ScrollView {
            GlassEffectContainer(spacing: 20) {
                VStack(spacing: 32) {
                    if let sharingEnded {
                        SharingEndedCapsule(note: sharingEnded)
                    }
                    header
                    steps
```

In `Crewluv/Views/Welcome/WelcomeView.swift`, replace:

```swift
// MARK: - Sharing Ended Note

/// "Sharing with Alex has ended." at the top of the welcome screen, until the next connection.
private struct SharingEndedNote: View {
    let pilot: String

    var body: some View {
        Label {
            Text("Sharing with \(pilot) has ended.")
        } icon: {
            Image(systemName: "info.circle")
                .foregroundStyle(.orange)
```

with:

```swift
// MARK: - Sharing Ended Note

/// "Sharing with Alex has ended." at the top of the welcome screen, until the next connection.
private struct SharingEndedCapsule: View {
    let note: SharingEndedNote

    var body: some View {
        Label {
            Text(note.text)
        } icon: {
            Image(systemName: "info.circle")
                .foregroundStyle(.orange)
```

One replacement in `Crewluv/Views/Welcome/ContentView.swift`:

In `Crewluv/Views/Welcome/ContentView.swift`, replace:

```swift
                        ConnectionErrorView(receiver: receiver)
                    } else {
                        WelcomeView(
                            sharingEndedWith: receiver.sharingEndedWith,
                            onTryDemo: { receiver.enterDemoMode() },
                            onJoin: { await joiner.join($0) },
                            onPaste: { LinkRouter.paste($0) }
```

with:

```swift
                        ConnectionErrorView(receiver: receiver)
                    } else {
                        WelcomeView(
                            sharingEnded: receiver.sharingEndedNote,
                            onTryDemo: { receiver.enterDemoMode() },
                            onJoin: { await joiner.join($0) },
                            onPaste: { LinkRouter.paste($0) }
```

- [x] **Step 7: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 304 tests in 28 suites passed`. The harness takes no views: Task 11 compiles them.

- [x] **Step 8: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Models/SharingEndedNote.swift Crewluv/Services/PilotStatusSource+Connecting.swift Crewluv/Services/PartnerStatusReceiver.swift Crewluv/Views/Welcome/WelcomeView.swift Crewluv/Views/Welcome/ContentView.swift CrewluvTests/SharingEndedNoteTests.swift CrewluvTests/PilotStatusSourceTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): a device left behind is told how to follow its pilot on Crewlu Cloud" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 10: An iCloud share link on Crewlu Cloud says it's already connected

**Files:**
- Modify: `Crewluv/Models/JoinMessage.swift`, `Crewluv/Services/PartnerJoiner.swift`, `Crewluv/App/LinkRouter.swift`, `Crewluv/App/AppDelegate.swift`, `Crewluv/App/SceneDelegate.swift`
- Test: `CrewluvTests/JoinMessageTests.swift`, `CrewluvTests/PartnerJoinerTests.swift`

Spec §15's item for 4c, and decision 9, which the user chose. An iCloud share link on a device on Crewlu Cloud isn't accepted: the alert **Already Connected** says whom the device follows, and nothing changes.
- The joiner decides, since it holds the join's alerts.
- `LinkRouter` asks it for a share link, tapped or pasted, and for a share iOS hands the app as metadata.
- `AppDelegate` and `SceneDelegate` now pass that metadata to the router instead of accepting the share themselves.

- [x] **Step 1: Write the failing tests**

One replacement in `CrewluvTests/JoinMessageTests.swift`:

In `CrewluvTests/JoinMessageTests.swift`, replace:

```swift
        (.tooManyTries, "Too Many Tries", "Too many tries. Wait a minute, then try again."),
        (.couldntConnect, "Couldn't Connect", "Couldn't connect. Check your connection and try again."),
        (.notAnInviteLink, "Not an Invite Link", "That doesn't look like an invite link."),
    ])
    func test_titleAndText(message: JoinMessage, title: String, text: String) {
        #expect(message.title == title)
```

with:

```swift
        (.tooManyTries, "Too Many Tries", "Too many tries. Wait a minute, then try again."),
        (.couldntConnect, "Couldn't Connect", "Couldn't connect. Check your connection and try again."),
        (.notAnInviteLink, "Not an Invite Link", "That doesn't look like an invite link."),
        (.alreadyConnected(to: "Alex"), "Already Connected",
         "You're already connected to Alex. To follow another pilot, ask them for an invite link from CrewLu."),
        (.alreadyConnected(to: nil), "Already Connected",
         "You're already connected to your pilot. To follow another pilot, ask them for an invite link from CrewLu."),
    ])
    func test_titleAndText(message: JoinMessage, title: String, text: String) {
        #expect(message.title == title)
```

One replacement in `CrewluvTests/PartnerJoinerTests.swift`:

In `CrewluvTests/PartnerJoinerTests.swift`, replace:

```swift
        #expect(keys.pending == door.joins.first?.key)
    }

    // MARK: - While a Join Is Under Way

    @Test func test_isConnecting_whileAJoinWaits_andAnotherJoinIsIgnored() async throws {
```

with:

```swift
        #expect(keys.pending == door.joins.first?.key)
    }

    // MARK: - An iCloud Share Link (spec §16)

    @Test func test_anICloudShareLink_onCrewluCloud_isntAccepted_andSaysWhoThisDeviceFollows() {
        onCrewluCloud()
        let (joiner, _) = makeJoiner()

        #expect(!joiner.mayAcceptICloudShare())
        #expect(joiner.message == .alreadyConnected(to: "Dad"))
    }

    @Test func test_anICloudShareLink_onICloud_isAccepted() {
        onICloud()
        let (joiner, _) = makeJoiner()

        #expect(joiner.mayAcceptICloudShare())
        #expect(joiner.message == nil)
    }

    @Test func test_anICloudShareLink_withNoConnection_isAccepted() {
        let (joiner, _) = makeJoiner()

        #expect(joiner.mayAcceptICloudShare())
        #expect(joiner.message == nil)
    }

    // MARK: - While a Join Is Under Way

    @Test func test_isConnecting_whileAJoinWaits_andAnotherJoinIsIgnored() async throws {
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors that name `alreadyConnected` or `mayAcceptICloudShare`, such as `cannot infer contextual base in reference to member 'alreadyConnected'`.

- [x] **Step 3: Write the message**

4 replacements, in order, in `Crewluv/Models/JoinMessage.swift`:

In `Crewluv/Models/JoinMessage.swift`, replace:

```swift

import Foundation

/// What a partner is told when a link or code didn't connect (partner links piece 4 spec §7.3).
/// Each is an alert with an OK button.
nonisolated enum JoinMessage: Equatable, Sendable {
    /// The invite link is dead. With the name of the pilot this device still follows, if any.
    case inviteNotWorking(stillConnectedTo: String?)
```

with:

```swift

import Foundation

/// What a partner is told when a link or code didn't connect (partner links piece 4 spec §7.3), or
/// when an iCloud share link was opened on a device already on Crewlu Cloud (§16). Each is an alert
/// with an OK button.
nonisolated enum JoinMessage: Equatable, Sendable {
    /// The invite link is dead. With the name of the pilot this device still follows, if any.
    case inviteNotWorking(stillConnectedTo: String?)
```

In `Crewluv/Models/JoinMessage.swift`, replace:

```swift
    case tooManyTries
    case couldntConnect
    case notAnInviteLink

    /// The message for the door's answer to joining `link`. `name` is the pilot this device still
    /// follows, as this partner sees them, if it follows one.
```

with:

```swift
    case tooManyTries
    case couldntConnect
    case notAnInviteLink
    /// An iCloud share link, on a device on Crewlu Cloud. With the name of the pilot it follows.
    case alreadyConnected(to: String?)

    /// The message for the door's answer to joining `link`. `name` is the pilot this device still
    /// follows, as this partner sees them, if it follows one.
```

In `Crewluv/Models/JoinMessage.swift`, replace:

```swift
        case .tooManyTries: "Too Many Tries"
        case .couldntConnect: "Couldn't Connect"
        case .notAnInviteLink: "Not an Invite Link"
        }
    }
```

with:

```swift
        case .tooManyTries: "Too Many Tries"
        case .couldntConnect: "Couldn't Connect"
        case .notAnInviteLink: "Not an Invite Link"
        case .alreadyConnected: "Already Connected"
        }
    }
```

In `Crewluv/Models/JoinMessage.swift`, replace:

```swift
            "Couldn't connect. Check your connection and try again."
        case .notAnInviteLink:
            "That doesn't look like an invite link."
        }
    }
}
```

with:

```swift
            "Couldn't connect. Check your connection and try again."
        case .notAnInviteLink:
            "That doesn't look like an invite link."
        case .alreadyConnected(let name):
            "You're already connected to \(name ?? "your pilot"). To follow another pilot, ask them for an invite link from CrewLu."
        }
    }
}
```

- [x] **Step 4: The joiner decides**

One replacement in `Crewluv/Services/PartnerJoiner.swift`:

In `Crewluv/Services/PartnerJoiner.swift`, replace:

```swift
            message = failure
            return false
        }
    }

    /// The partner's answer to `switchQuestion`.
```

with:

```swift
            message = failure
            return false
        }
    }

    /// Whether to accept an iCloud share link the app was given (spec §16). Not on a device on Crewlu
    /// Cloud, which follows its pilot there: the partner is told it's already connected, and nothing
    /// changes.
    func mayAcceptICloudShare() -> Bool {
        guard source.isOnCrewluCloud else { return true }
        message = .alreadyConnected(to: followedPilotName)
        return false
    }

    /// The partner's answer to `switchQuestion`.
```

- [x] **Step 5: Every share goes through the router**

2 replacements, in order, in `Crewluv/App/LinkRouter.swift`:

In `Crewluv/App/LinkRouter.swift`, replace:

```swift
//  Sends a link the app was given, or pasted text, where it goes
//

import Foundation

/// Sends a link the app was given, or text pasted into the paste box, where it goes (partner links
/// piece 4 spec §7.1): Crewluve's own links and codes to the joiner, and iCloud share links to
/// today's share handling.
enum LinkRouter {
    /// A link the app was given: a tap, a universal link or a cold launch. False when it's neither
    /// kind, and then nothing happens.
```

with:

```swift
//  Sends a link the app was given, or pasted text, where it goes
//

import CloudKit
import Foundation

/// Sends a link the app was given, or text pasted into the paste box, where it goes (partner links
/// piece 4 spec §7.1): Crewluve's own links and codes to the joiner, and iCloud share links to
/// today's share handling, unless this device is on Crewlu Cloud (§16).
enum LinkRouter {
    /// A link the app was given: a tap, a universal link or a cold launch. False when it's neither
    /// kind, and then nothing happens.
```

In `Crewluv/App/LinkRouter.swift`, replace:

```swift
        }
    }

    private static func go(_ link: OpenedLink) -> Bool {
        switch link {
        case .partner(let link):
            Task { await PartnerJoiner.shared.join(link) }
            return true
        case .iCloudShare(let url):
            Task { try? await CloudKitShareManager.shared.acceptShare(from: url) }
            return true
        case .neither:
            return false
```

with:

```swift
        }
    }

    /// An iCloud share iOS hands the app when its link is tapped: accepted as today, unless this
    /// device is on Crewlu Cloud (spec §16).
    static func accept(_ metadata: CKShare.Metadata) {
        guard PartnerJoiner.shared.mayAcceptICloudShare() else { return }
        Task { await CloudKitShareManager.shared.acceptShare(with: metadata) }
    }

    private static func go(_ link: OpenedLink) -> Bool {
        switch link {
        case .partner(let link):
            Task { await PartnerJoiner.shared.join(link) }
            return true
        case .iCloudShare(let url):
            if PartnerJoiner.shared.mayAcceptICloudShare() {
                Task { try? await CloudKitShareManager.shared.acceptShare(from: url) }
            }
            return true
        case .neither:
            return false
```

2 replacements, in order, in `Crewluv/App/AppDelegate.swift`:

In `Crewluv/App/AppDelegate.swift`, replace:

```swift
        // Path A: Direct metadata (preferred but often nil on iOS 17+)
        if let metadata = options.cloudKitShareMetadata {
            debugLog("[AppDelegate] Found CloudKit metadata — accepting share")
            Task { @MainActor in
                await CloudKitShareManager.shared.acceptShare(with: metadata)
            }
        }
        // Path B: an invite or code link, or a share URL (crewluv:// or icloud.com/share), in urlContexts
        else if let linkCtx = options.urlContexts.first(where: { OpenedLink(url: $0.url) != .neither }) {
```

with:

```swift
        // Path A: Direct metadata (preferred but often nil on iOS 17+)
        if let metadata = options.cloudKitShareMetadata {
            debugLog("[AppDelegate] Found CloudKit metadata — accepting share")
            LinkRouter.accept(metadata)
        }
        // Path B: an invite or code link, or a share URL (crewluv:// or icloud.com/share), in urlContexts
        else if let linkCtx = options.urlContexts.first(where: { OpenedLink(url: $0.url) != .neither }) {
```

In `Crewluv/App/AppDelegate.swift`, replace:

```swift
        userDidAcceptCloudKitShareWith cloudKitShareMetadata: CKShare.Metadata
    ) {
        debugLog("[AppDelegate] userDidAcceptCloudKitShareWith called")
        Task { @MainActor in
            await CloudKitShareManager.shared.acceptShare(with: cloudKitShareMetadata)
        }
    }
}
```

with:

```swift
        userDidAcceptCloudKitShareWith cloudKitShareMetadata: CKShare.Metadata
    ) {
        debugLog("[AppDelegate] userDidAcceptCloudKitShareWith called")
        LinkRouter.accept(cloudKitShareMetadata)
    }
}
```

One replacement in `Crewluv/App/SceneDelegate.swift`:

In `Crewluv/App/SceneDelegate.swift`, replace:

```swift
    ) {
        debugLog("[SceneDelegate] userDidAcceptCloudKitShareWith called")
        debugLog("[SceneDelegate]   share recordID: \(cloudKitShareMetadata.share.recordID)")
        Task { @MainActor in
            await CloudKitShareManager.shared.acceptShare(with: cloudKitShareMetadata)
        }
    }
}
```

with:

```swift
    ) {
        debugLog("[SceneDelegate] userDidAcceptCloudKitShareWith called")
        debugLog("[SceneDelegate]   share recordID: \(cloudKitShareMetadata.share.recordID)")
        LinkRouter.accept(cloudKitShareMetadata)
    }
}
```

- [x] **Step 6: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 307 tests in 28 suites passed`. The harness takes no app files: Task 11 compiles them.

- [x] **Step 7: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Models/JoinMessage.swift Crewluv/Services/PartnerJoiner.swift Crewluv/App/LinkRouter.swift Crewluv/App/AppDelegate.swift Crewluv/App/SceneDelegate.swift CrewluvTests/JoinMessageTests.swift CrewluvTests/PartnerJoinerTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): an iCloud share link on a device on Crewlu Cloud says it's already connected" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 11: Compile everything, without a simulator

**Files (outside both repos):** `$BUILD/order_check.py`

A build in a separate clone of the branch, with its own build folder, so it can't disturb the user's open Xcode or touch a simulator. It compiles the app and `CrewluvTests`, including what the harness can't build: the views, the app's share wiring and the Keychain tests. Then the order check. Xcode compiles a target's files in the order its folder lists them, and a fresh clone can list them differently, so a compiler problem that depends on the order can pass here and fail in the user's Xcode. That's what broke plan 4a's first ⌘U. The check takes the test target's compile from this build's log and repeats it with the files in eight orders, both type-checked whole and as the module-making step Xcode runs on its own. Crewluve has no packages to copy.

- [x] **Step 1: Make the clone**

Use a scratch folder outside both repos as `$BUILD`, for example `export BUILD=<your scratchpad>/partner-cloud-move-over-build`.

Run:

```bash
rm -rf "${BUILD:?set BUILD first}" && mkdir -p "$BUILD" && git clone -q --shared ~/Dev/Crewluv "$BUILD/crewluv" && git -C "$BUILD/crewluv" switch -q feature/partner-cloud-source && git -C "$BUILD/crewluv" log --oneline -1
```

Expected: the branch's last commit: Task 10's `feat(crewluv): an iCloud share link on a device on Crewlu Cloud says it's already connected`, or a later fix from Task 12.

- [x] **Step 2: Build for testing**

It takes a few minutes, so run it in the background and wait for it to finish.

Run:

```bash
cd "$BUILD/crewluv" && xcodebuild build-for-testing -project Crewluv.xcodeproj -scheme Crewluv -destination "generic/platform=iOS Simulator" -derivedDataPath "$BUILD/derived" -quiet > "$BUILD/build.log" 2>&1; echo "exit $?"; echo "errors: $(grep -c " error: " "$BUILD/build.log")"; echo "warnings: $(grep -c " warning: " "$BUILD/build.log")"
```

Expected: `exit 0`, `errors: 0` and `warnings: 0`.

- [x] **Step 3: Write the order check**

File: `$BUILD/order_check.py`

```python
#!/usr/bin/env python3
"""Type-checks CrewluvTests with its files in several orders, against the app module a build made.

Xcode compiles a target's files in the order its folder lists them, and a fresh clone lists them
differently, so a compiler problem that depends on order can pass in one and fail in the other
(plan 4a's first ⌘U). This takes the test target's swiftc command from the build's log, keeps what
describes the inputs, drops everything that writes outputs, and type-checks each order.

Each order is checked twice: type-checked whole, and as the module-making step Xcode runs on its
own, which skips function bodies. That second one is where plan 4a's first ⌘U failed.

Usage: order_check.py BUILD_DIR   (a build-for-testing's folder: crewluv/ and derived/ inside)
"""
import gzip, pathlib, random, re, shlex, subprocess, sys, tempfile

build = pathlib.Path(sys.argv[1]).resolve()
log = next((build / "derived/Logs/Build").glob("*.xcactivitylog"))
text = gzip.decompress(log.read_bytes()).decode("latin-1")
lines = ["".join(c if c.isprintable() else "\n" for c in line) for line in text.split("\n")]
command = next(
    re.sub(r"^\s*builtin-SwiftDriver -- ", "", part)
    for line in lines for part in line.split("\n")
    if "builtin-SwiftDriver -- " in part and "-module-name CrewluvTests" in part
)
args = shlex.split(command)

with_value = {"-output-file-map", "-emit-module-path", "-dependency-scan-serialize-diagnostics-path",
              "-const-gather-protocols-list", "-emit-objc-header-path", "-index-store-path",
              "-clang-scanner-module-cache-path", "-sdk-module-cache-path", "-clang-build-session-file"}
alone = {"-c", "-j10", "-enable-batch-mode", "-incremental", "-save-temps", "-explicit-module-build",
         "-emit-dependencies", "-emit-module", "-serialize-diagnostics", "-emit-const-values",
         "-emit-objc-header", "-experimental-emit-module-separately", "-disable-cmo",
         "-profile-generate", "-profile-coverage-mapping", "-validate-clang-modules-once", "-g"}
kept, files_list, module_caches, i = [], None, 0, 0
while i < len(args):
    a = args[i]
    if a.startswith("@"):
        files_list = a[1:]
        i += 1
    elif a in with_value:
        i += 2
    elif a == "-module-cache-path":
        module_caches += 1
        if module_caches == 1:
            kept += [a, args[i + 1]]
        i += 2
    elif a in alone:
        i += 1
    elif a == "-Xfrontend" and args[i + 1] == "-serialize-debugging-options":
        i += 2
    elif a == "-Xcc" and i + 1 < len(args) and (args[i + 1].startswith("-fmodules-prune") or args[i + 1] in ("-ivfsstatcache", "-iquote")
                                               or args[i + 1].startswith("-I") or args[i + 1].endswith(".sdkstatcache")):
        # -Xcc pairs for clang's caches and header maps: a Swift-only target needs none of them.
        i += 2
        if args[i - 1] in ("-ivfsstatcache", "-iquote") and i < len(args) and args[i] == "-Xcc":
            i += 2
    else:
        kept.append(a)
        i += 1

files = [line for line in pathlib.Path(files_list).read_text().splitlines() if line.strip()]
orders = {
    "as the clone lists them": files,
    "reversed": list(reversed(files)),
    "by name": sorted(files, key=lambda f: pathlib.Path(f).name),
    "by name, reversed": sorted(files, key=lambda f: pathlib.Path(f).name, reverse=True),
    "helpers last": [f for f in files if "/Helpers/" not in f] + [f for f in files if "/Helpers/" in f],
}
rng = random.Random(4)
for n in range(3):
    shuffled = files[:]
    rng.shuffle(shuffled)
    orders[f"shuffled {n + 1}"] = shuffled

out = pathlib.Path(tempfile.mkdtemp())
steps = {
    "type-check": ["-typecheck"],
    "module": ["-emit-module", "-experimental-emit-module-separately", "-emit-module-path", str(out / "CrewluvTests.swiftmodule")],
}
failed = 0
for name, order in orders.items():
    with tempfile.NamedTemporaryFile("w", suffix=".SwiftFileList", delete=False) as listing:
        listing.write("\n".join(order) + "\n")
    for step, flags in steps.items():
        result = subprocess.run(kept + flags + ["@" + listing.name], capture_output=True, text=True)
        errors = [l for l in (result.stdout + result.stderr).splitlines() if ": error: " in l]
        warnings = [l for l in (result.stdout + result.stderr).splitlines() if ": warning: " in l]
        ok = result.returncode == 0 and not errors and not warnings
        failed += not ok
        print(f"{'ok  ' if ok else 'FAIL'} {name}, {step}: exit {result.returncode}, {len(errors)} errors, {len(warnings)} warnings", flush=True)
        for line in (errors + warnings)[:4]:
            print("       ", re.sub(r"^.*/crewluv/", "", line)[:200])
print(f"{len(files)} files, {len(orders)} orders, {failed} failed")
sys.exit(1 if failed else 0)
```

- [x] **Step 4: Check the test target in every order**

It takes about five minutes, so run it in the background too.

Run:

```bash
python3 "$BUILD/order_check.py" "$BUILD"
```

Expected: sixteen `ok` lines, then `… files, 8 orders, 0 failed`. A `FAIL` line names the file and the error: fix it as plan 4a did (`ead6bfe`), then build again. Nothing to commit.

### Task 12: Review

**Files:** whatever the review finds.

- [x] **Step 1: Ask for a review**

Use superpowers:requesting-code-review with a read-only reviewer. It reads:
- `git -C ~/Dev/Crewluv diff 69865b3..feature/partner-cloud-source`;
- this plan;
- the spec (§5.3, §7.6, §7.7, §8, §9, §10, §14 and §15);
- `~/Dev/Duty/supabase/partner-api.md`;
- CrewLu's writer of `moveTicketByPartnerJSON`, on `~/Dev/Duty`'s `feature/partner-cloud-screens` branch, read with `git -C ~/Dev/Duty show` and `git -C ~/Dev/Duty grep`, without switching that repo's branch.

It runs no `xcodebuild` and no simulator. State facts neutrally, and don't tell it what not to flag.

- [x] **Step 2: Act on it**

For each finding, fix it test-first where the harness can test it, re-run `"$HARNESS/run.sh"`, and commit. If any Swift changed, run Task 11 again. Note each fix in this plan's Execution notes.

### Task 13: The user runs Crewluve's tests

**Files:** none.

- [x] **Step 1: Ask the user to run the tests in Xcode**

Send them these steps:

1. In Xcode, open `~/Dev/Crewluv/Crewluv.xcodeproj` if it isn't open. At the top of the window, check that the scheme says **Crewluv** and the destination is an iPhone **simulator** (such as iPhone 17 Pro), not your phone. On a phone, `CloudSummaryTests` skips, because it reads its fixtures from the Mac.
2. Press **⌘U** (Product → Test) and wait for it to finish.
3. Press **⌘6** to open the Test navigator. Red marks show failures.

Expected: no failures, and the console's last Swift Testing line says `Test run with 318 tests in 29 suites passed`, counted before Task 12's fixes. The new and changed suites:

| Suite | Tests |
|---|---|
| `LegsComparisonTests` (new) | 7 |
| `MoveTicketTests` (new) | 5 |
| `MoveOverTests` (new) | 43 |
| `SharingEndedNoteTests` (new) | 2 |
| `KeychainDeviceKeyStoreTests` | 11 (was 8) |
| `CrewluCloudDeviceTests` | 21 (was 20) |
| `PilotStatusSourceTests` | 80 (was 66) |
| `JoinMessageTests` | 3 (changed) |
| `PartnerJoinerTests` | 20 (was 17) |

- [x] **Step 2: If anything fails, stop**

Ask for the test's name and its message. Fix the cause, never the test's expected value, then ask for another run.

### Task 14: No look on a phone yet

**Files:** none.

- [x] **Step 1: Tell the user why, in plain words**

4c's changes show only on a phone that follows a pilot. The move-over and the note for a device left behind need a pilot whose CrewLu has moved this partner, and Already Connected needs a device already on Crewlu Cloud. Seeing them takes spec §10.3's test pilot, on CrewLu's TestFlight build, and a test partner, before the release. A simulator follows no pilot, so it has nothing new to show.

Say also, as a caution: this build moves a partner for real the first time it runs on a phone that follows a pilot through iCloud as a partner whose CrewLu has a ticket for them, and their CrewLu then counts them as moved. So don't install it before the release on a phone that follows a pilot as one of that pilot's real partners. Nothing to do.

### Task 15: Record the decisions

**Files (in `~/Dev/Crewluve Website`):**
- Modify: `docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md`, and this plan

- [x] **Step 1: Add the planning decisions to the spec**

At the end of the spec, after §15, add `## 16. Decisions made while planning 4c`, followed by this plan's "Decisions made while planning" list, copied as it stands, and any changes from the review (Task 12). Then update its status line.

In `~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md`, replace:

```markdown
Plans 4a and 4b are built (`docs/superpowers/plans/2026-10-18-partner-links-piece4a-source.md`, `docs/superpowers/plans/2026-10-19-partner-links-piece4b-connecting.md`); next: plan 4c.
```

with:

```markdown
Plans 4a, 4b and 4c are built (`docs/superpowers/plans/2026-10-18-partner-links-piece4a-source.md`, `docs/superpowers/plans/2026-10-19-partner-links-piece4b-connecting.md`, `docs/superpowers/plans/2026-10-20-partner-links-piece4c-move-over.md`); next: spec §10.3's checks on real phones, then the release (§11).
```

- [x] **Step 2: Tick this plan and commit**

Run:

```bash
cd ~/"Dev/Crewluve Website" && git add docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md docs/superpowers/plans/2026-10-20-partner-links-piece4c-move-over.md && git commit -q -m "Plan 4c built: the move-over; spec records the planning decisions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit. Don't push.

### Task 16: Finish

**Files:** none.

- [x] **Step 1: Keep the branch apart**

4c moves real partners the first time it reaches them, and the tickets come from CrewLu's partner screens, which wait for CrewLu 3.0.2 to be on the App Store. So `feature/partner-cloud-source` stays apart from the release line until spec §10.3's checks pass. Nothing to merge.

- [x] **Step 2: Push only with a fresh yes**

Ask separately before each push: `feature/partner-cloud-source` in `~/Dev/Crewluv`, and `main` in `~/Dev/Crewluve Website`.

---

## Execution notes

Filled in during the build: any place the code ends up different from the printed blocks, and why.

- **Tasks 0–11 went as printed** on 2026-10-20: every Run step gave the printed result, the branch's tree matched the scratch clone's, and Task 11's build (0 errors, 0 warnings) and order check (16 of 16) passed at `d77861e`.
- **Task 12, the review** (one read-only reviewer): "ready to merge with fixes": one Important finding, ten Minor, nothing Critical. It confirmed the Keychain attributes, and the contract with CrewLu's writer on `feature/partner-cloud-screens`: `moveTicketByPartnerJSON` is JSON `{participant.userIdentity.userRecordID.recordName: ticket}` with sorted keys, cleared when empty. Fixed, test-first, each as its own commit:
  - `697d1aa` (Important): when the share was gone, a join that switched this device while the move-over checked another of this partner's devices was answered with "sharing ended" and `resetShareData()`. Now a switch since the turn began ends nothing, and a device a join switched makes no code with the copy. Three tests.
  - `a846878` (Minor, and a regression found while checking it): a key a reinstall left switches on any status, as in 4b, and when the share is gone too, so it no longer shows "Sharing has ended" first. Another pilot's status starts the alerts afresh. Decision 4 is changed to match. The status source's `deviceLabel` moved to `PilotStatusSource+Connecting.swift`, to keep the source under 300 lines. Six tests, three of them in place of tests of the old rule.
  - `e2a423c` (Minor): the move-over's turn belongs to its read: none after a switch since the read began, and one for a move under way after a failed iCloud read. The alerts' stand-in can hold an evaluation. Three tests.
  - `c2b1a6a` (Minor): the move-over logs each step, naming no ticket, code or key, for spec §10.3's checks.
- **Review points left as they are:**
  - *Decision 7 against spec §8.3's note for a device left behind:* without a copy, a device can't tell that another of this partner's devices moved, so it says "Sharing with Alex has ended." A copy whose pilot can't be checked just then ends the same way.
  - *A key with no status yet* is still sent with the ticket (decision 4). If another partner's device has it, Crewlu Cloud answers `key_in_use`, consuming nothing, and a new key follows.
  - *A key a refused redeem saved* never became a device. The next read finds it gone, and the ticket gets a new key. Spec §8.1's "the same key" holds for a redeem whose answer was lost.
  - *Follow-ups:*
    - while another device's code can't be redeemed (`too_many_devices`, `try_later`), each iCloud read makes a new code with the copy, replacing one the partner has open (spec §8.3 notes this);
    - the move-over's calls count against a push's 25 seconds;
    - accepting another pilot's iCloud share during a move under way leaves `moveToPartnerID` set, so the move switches back to its pilot on that pilot's first status.
  - The wider access the `+Connecting` file needs, the two copies of the device's model name (the source's and the joiner's), and `ICloudReading.moveTicket` being a `var` with a default.
- **After the fixes:** the harness passed 316 tests in 28 suites. The deliberate breaks were re-checked against the reviewed code: all 77 caught: the 52 that still matched, the 20 rewritten for the reviewed code's text, and 5 new ones for its guards and rules. Task 11 passed again: at `c2b1a6a`, 0 errors, 0 warnings, and 16 of 16 in the order check. The user's ⌘U (Task 13) now expects 327 Swift Testing tests in 29 suites: the harness's 316 and the Keychain's 11.
- **Task 13, the user's ⌘U at `c2b1a6a`:** `Test run with 327 tests in 29 suites passed`, the hand-off copy's three Keychain tests among them, and every XCTest suite passed.
- **Task 16:** the branch stays apart from the release line. With the user's yes for each, `feature/partner-cloud-source` was pushed (`69865b3..c2b1a6a`) and website `main` was pushed (`d66d4aa..8badca8`).
