# Partner Links Piece 4b: Connecting Crewluve to Crewlu Cloud — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A partner connects Crewluve to Crewlu Cloud by tapping the pilot's invite link, or with a code from another of their devices. Once connected, a ••• menu offers Use on Another Device and Disconnect, and when the pilot stops sharing, the welcome screen says so.

**Architecture:**
- **Links in one place.** `PartnerLink` reads Crewluve's own links and typed codes. `OpenedLink` tells them from iCloud share links, and `LinkRouter` sends every link the app is given, or that's pasted, where it goes. iCloud share links keep today's handling.
- **Joining.** `PartnerJoiner` runs spec §7.2's flow and holds what the screen shows meanwhile. `CrewluCloudDevice`, moved out of 4a's source, is this device on Crewlu Cloud: it joins with this device's key or a pending one, switches, cancels, leaves and makes hand-off codes. The source's `connect` and `disconnect` do the rest: what the alerts keep, the iCloud share, the push token and the next read.
- **Safe while the key changes.** Every connection change moves a generation on, so a read or a refusal for a key this device has let go of brings nothing back and forgets nothing.
- **The screens.** `WelcomeView` and `CodeEntryView` replace `NoShareView`. `ConnectionMenu` and `HandOffSheet` take Paste Share Link's place on Crewlu Cloud. The wording that can be tested lives outside the views: `JoinMessage`, `SwitchQuestion`, `DisconnectQuestion`, `HandOffCode` and `SyncLineWording`.
- **Tested on the Mac.** Everything but the views and the app's link wiring runs in plan 4a's Mac harness, against stand-ins.

**Tech stack:** Swift 5 mode on iOS 26 (main actor by default, Approachable Concurrency), SwiftUI, Observation, URLSession, the Keychain, Core Image's QR code generator, universal links, Swift Testing.

**Design:** `docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md` in this repo: §7 (connecting), §9 (security), §10.1, §11 and §14 (4a's decisions, and what it left for 4b). The contract is `~/Dev/Duty/supabase/partner-api.md`. Plan 4a (`docs/superpowers/plans/2026-10-18-partner-links-piece4a-source.md`) built what this one builds on.

---

## Before you start

- **Two repos.**
  - The code goes in `~/Dev/Crewluv` (Crewluve).
  - This plan and the spec live in `~/Dev/Crewluve Website`.
  - Paths are relative to `~/Dev/Crewluv` unless they start with `~`, `$HARNESS` or `$BUILD`.
- **Branch.** Keep building on `feature/partner-cloud-source`, where plan 4a ended at `ead6bfe` (Task 0). Piece 4 ships as one release (spec §11), and the branch stays apart from the release line until then (Task 28).
- **Leave the untracked folders alone.** `~/Dev/Crewluv` has untracked `.claude/` and `.superpowers/` folders that aren't part of this work. Never run `git add -A` or `git add .` there. Add the exact paths each step lists.
- **Who runs which tests.**
  - **Crewluve's rule:** never run `xcodebuild test`, never boot a simulator, and never build against the copy the user has open in Xcode. The user runs Crewluve's tests (Task 25).
  - **The Mac harness (Task 1)** compiles Crewluve's model and service files and their tests unchanged, with the app's concurrency settings, and runs the Swift Testing tests in a small Swift package outside both repos. The test-first steps use it. It boots no simulator and shares no build folder with Xcode.
  - **Checked only in Xcode:** `KeychainDeviceKeyStoreTests`, which needs the iOS Keychain, and the views and the app's link wiring (`AppDelegate`, `CrewluvApp`, `LinkRouter`), which need UIKit and SwiftUI's iOS views. Task 23's compile, the review (Task 24) and the user's run (Task 25) check them.
  - **One compile-only build (Task 23)** checks the whole app and its tests, in a separate clone with its own build folder, then checks the test target's files in eight orders.
- **No live Crewlu Cloud.** The tests answer for Crewlu Cloud through stand-ins, so no step reaches the live service except Task 26's optional look, which types one made-up code.
- **New files need no project edit.** `Crewluv/` and `CrewluvTests/` are synchronized folders, so a new file joins its target by itself. Editor errors such as "Cannot find type" on a new file are a stale index: trust the harness and Task 23.
- **Pick two scratch folders,** outside both repos: one for the harness (`$HARNESS`, Task 1) and one for the compile-only clone (`$BUILD`, Task 23). Shell variables don't carry from one command to the next in Claude's Bash tool, so begin each command that uses them with `export HARNESS=<the folder> &&` (or `BUILD`). Both must be absolute paths.
- **If an expected value doesn't match, stop and ask.** Never change a test to make it pass.

## Decisions made while planning

These refine the spec. Task 27 writes them into it.

1. **A join uses a pending key until the device switches.** Spec §7.2 says a device without a key makes one, saved first. 4b keeps that key in a second Keychain item (`pendingKey`), so this device's key changes only when it switches. While "Switch to Sam?" waits, the current connection keeps working, and Cancel forgets only the pending key. A join that didn't finish keeps it, so the next try sends it again and gets the same device. `key_in_use` gets a pending key too: the kept one after this device's key was refused, a new one after a pending key was.
2. **A trailing slash is tolerated** (`/join/`), though piece 1b's links have none, and the host is read in any case. Spec §7.1 says there's no trailing slash; §10.1 tests one.
3. **A code is six ASCII letters or digits** once spaces and dashes are gone, so "É" or "!" never reaches the door. The code boxes keep letters and digits, in capitals, at most six (`PartnerLink.codeBoxes`).
4. **A read that a connection change overtook is `superseded`** (spec §14's item for 4b). It brings nothing back and forgets nothing, iOS hears "no data", and the screen waits for the read the change asks for. In 4a, such a read reported sharing ended; the change may now be a switch. The same holds for the other calls a switch can overtake: the push registration's `sharing_ended` ends sharing only while the key it sent is still this device's, a hand-off code's is only "couldn't make one", and a Disconnect that a join overtook keeps the join's new connection.
5. **The pilot's id and name are kept with the connection** (spec §14's item for 4b), as `partnerCloud.pilotID` and `partnerCloud.pilotName`, from each new status. The name is the nickname the pilot set for this partner, or their first name. Joining compares the ids, and the question and the messages use the name.
6. **Three pieces moved out of the status source,** to keep it under 300 lines: `CrewluCloudDevice` (this device's key, partner id, `since` and generation, with joining and leaving), `PeriodicCheck` (the screens the 60-second check runs for) and `PartnerConnection.remember(_:)`.
7. **"The same device" is this device's own key answering with the partner id it's connected as.** Nothing changes then but a read.
8. **The sharing-ended note is saved** (`partnerCloud.sharingEndedWith`), so it survives a relaunch, and it goes with the next status or connection. Spec §7.6 says "until the next connection": a status also covers an iCloud share accepted from the paste box.
9. **Forgetting a pilot also forgets when the alerts last looked** (`LastEvaluatedPilotStatusTimestamp`), with the pilot's id and name, the alerts' title name and their snapshot. It happens on a switch to another pilot, when sharing ends and on Disconnect. Otherwise the new pilot's statuses older than the last pilot's would be skipped. A switch to the same pilot keeps them all, so nothing alerts twice.
10. **Switching from iCloud forgets the share quietly** (`CloudKitShareManager.forgetShareQuietly()`): the share's settings and the iCloud subscriptions go, without `.shareDataReset`, so the welcome screen doesn't flash. The share itself is the pilot's to end.
11. **The nickname with no legs is fixed here,** though spec §14 left it as a follow-up: the screen names the status with no legs as it names one with legs (`SharedPilotStatus.named(_:)`).
12. **The screen stops showing the last pilot's status** when there's no status yet, and when a read fails with nothing read. So a switch to a pilot with no status yet shows the waiting screen, not the last pilot.
13. **The sync line's wording is `SyncLineWording`,** outside the view, so the harness tests it.
14. **A failed Disconnect's alert is titled "Couldn't Disconnect".** The spec gives only its message. The menu's items use the `qrcode` and `xmark.circle` symbols.
15. **`LinkRouter` takes every link:** taps, universal links, cold launches and the paste box. `OpenedLink` decides where each goes, and pasted text that's neither kind of link gets "Not an Invite Link".
16. **The waiting screen scrolls,** so pull-to-refresh works on it (spec §7.7).
17. **`ContentView` was split** to stay under 300 lines, into `LoadingAndErrorViews.swift` and `JoinAlerts.swift`. `PartnerStatusReceiver` was over 300 lines before piece 4, and stays so.
18. **Left for plan 4c:** the hand-off copy, which Disconnect and sharing ended will also forget (§7.5, §7.6); the note for a second device left behind (§7.7); and the move-over's exception to iCloud's sharing-ended note (§8.4).

## The four questions

- **Is this wise?**
  - It's what partners see of piece 4: connecting by a link or a code, with no account and nothing to type but an optional code.
  - It builds on 4a's source, so every read and every alert still goes through one place.
  - iCloud keeps working for every partner who isn't connected, since pilots on an older CrewLu still send iCloud links. 4c then moves them over.
- **Will it break anything?**
  - *iCloud partners:* the same reads and alerts. The status screen loses Paste Share Link, since the welcome screen's paste line takes iCloud links too, and Reset Share Data goes (spec P4-3).
  - *Alerts:* a switch to another pilot forgets what the alerts kept of the last one, so the new pilot's first status isn't compared with the last pilot's. A switch to the same pilot keeps it, so nothing alerts twice.
  - *A switch during a read:* the generation means a late answer for the old key can't delete the new key or show the old pilot.
  - *Keys:* a join never replaces this device's key until it switches. A failure keeps the keys, so a retry reaches the same device.
  - *Privacy:* logs show only the host and path of Crewluve's links. Keys, invites and codes are never logged (spec §9).
  - *A crash:* nothing new traps. 4b's app code has no `!`, `try!`, `as!` or `fatalError`.
  - *The release:* the branch stays apart, so nothing reaches partners before 4c and spec §10.3's checks.
- **Is this what a brilliant Apple engineer would do?** Observation for the joiner and the hand-off session, typed throws for the door, a checked continuation for the switch question, SwiftUI's own menu, alerts and sheets, Core Image's QR code generator, `TimelineView` for the countdown, universal links, Swift Testing, and no packages, as Crewluve's `CLAUDE.md` asks. The wording that can be tested lives outside the views.
- **Does it fix the disease or the symptom?** The disease is that partners can only connect through an iCloud share, which fails whenever iCloud does. 4b gives them a connection of their own: a link, a code, and a key kept in this device's Keychain.

## Not in this plan

- The move-over (plan 4c): iCloud partners moving by themselves, the hand-off copy (P4-2), the note for a second device left behind, and the move-over's exception to iCloud's sharing-ended note.
- Spec §10.3's checks on real phones, with a test pilot on CrewLu's TestFlight build, before the release.
- Use on Another Device and Disconnect for devices still on iCloud (spec §13).
- Merging into the release line (Task 28).

## How this plan was checked

- **Built test-first in a scratch clone** of `ead6bfe`, outside `~/Dev/Crewluv`.
- **The Swift tests:** the Mac harness ran all 216, and every commit passed on its own. They caught all 103 deliberate breaks, one at a time, in the links, the messages, the door's new calls, the hand-off code, the device's joining, switching and leaving, the source's switching, the note, Disconnect, the joiner, the hand-off session, the 60-second check's screens, the sync line's wording, the push registration and route, and the nickname's copy. The first run, of 100, missed four: a check that could never fail, now removed, and three gaps that now have tests (the joined key's read asks for everything, the switch question names the new pilot as this partner will see them, and a new code shows Making while it waits).
- **Checking the code against the spec** found two more calls a switch can overtake, a hand-off code and Disconnect. Both are guarded now, with tests (decision 4).
- **The compile-only build** of the whole app and its tests passed in the scratch clone, with no warnings, and so did the order check, in all eight orders. The order check was first run on 4a's commit before its fix (`9606811`), where it failed on the error that broke 4a's first ⌘U.
- **A replay on a fresh clone of `ead6bfe`:** every Run step gave the result printed here, including each test-first failure, and every file matched the scratch copy byte for byte. Task 23's build and order check passed on the replayed branch.

## Files

In `~/Dev/Crewluv`:

| File | Responsibility |
|---|---|
| `Crewluv/Models/PartnerLink.swift` | Invite links, code links, typed codes, the code boxes' rule, and how logs show a link |
| `Crewluv/Models/OpenedLink.swift` | Whether a link or pasted text is Crewluve's own, an iCloud share link, or neither |
| `Crewluv/Models/JoinMessage.swift` | The alerts when a join doesn't connect |
| `Crewluv/Models/HandOffCode.swift` | A code for another device: grouped, as a link, and its countdown |
| `Crewluv/Models/DisconnectQuestion.swift` | Disconnect's question, and what it says when it can't |
| `Crewluv/Models/SyncLineWording.swift` | The sync line's label and errors, on iCloud or Crewlu Cloud |
| `Crewluv/Models/SharedPilotStatus+Named.swift` | A status with only the pilot's name changed |
| `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift` | This device on Crewlu Cloud: reading, joining, switching, leaving |
| `Crewluv/Services/PartnerCloud/HandOffSession.swift` | What Use on Another Device's sheet shows |
| `Crewluv/Services/PartnerJoiner.swift` | Joining with a link or a code, and the switch question |
| `Crewluv/Services/PeriodicCheck.swift` | The screens the 60-second check runs for |
| `Crewluv/App/LinkRouter.swift` | Where each opened or pasted link goes |
| `Crewluv/Views/Welcome/WelcomeView.swift`, `CodeEntryView.swift` | The welcome screen and its code boxes |
| `Crewluv/Views/Welcome/JoinAlerts.swift` | The join's alerts and the switch question |
| `Crewluv/Views/Welcome/LoadingAndErrorViews.swift` | The loading, error and progress views, moved from `ContentView` |
| `Crewluv/Views/Status/ConnectionMenu.swift`, `HandOffSheet.swift` | The ••• menu, Disconnect's alerts, and Use on Another Device |
| `Crewluv/Services/PartnerCloud/PartnerDoor.swift`, `LivePartnerDoor.swift` (changed) | Joining, codes and leaving |
| `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift` (changed) | The pending key |
| `Crewluv/Models/PartnerConnection.swift` (changed) | The pilot last seen, and the note |
| `Crewluv/Models/PilotStatusUpdate.swift`, `Crewluv/Services/PushRoute.swift`, `PushRegistrar.swift` (changed) | A superseded read; the registration's check of its key |
| `Crewluv/Services/PilotStatusSource.swift` (changed) | Reads through the device; connect, Disconnect, and sharing ended's note |
| `Crewluv/Services/PartnerStatusReceiver.swift` (changed) | What the views ask; the nickname with no legs |
| `Crewluv/Services/CloudKitShareManager.swift` (changed) | Forgetting a share quietly; `ShareURLResolver` off the main actor |
| `Crewluv/App/AppDelegate.swift`, `CrewluvApp.swift`, `Crewluv.entitlements` (changed) | The links |
| `Crewluv/Views/Welcome/ContentView.swift`, `Crewluv/Views/Status/PilotStatusView.swift`, `SyncStatusBarView.swift` (changed) | The screens in place |
| `CrewluvTests/PartnerLinkTests.swift`, `OpenedLinkTests.swift`, `JoinMessageTests.swift`, `HandOffCodeTests.swift`, `CrewluCloudDeviceTests.swift`, `PartnerJoinerTests.swift`, `HandOffSessionTests.swift`, `DisconnectQuestionTests.swift`, `SyncLineWordingTests.swift`, `SharedPilotStatusNamedTests.swift` | The new tests |
| `CrewluvTests/LivePartnerDoorTests.swift`, `KeychainDeviceKeyStoreTests.swift`, `PilotStatusSourceTests.swift`, `PushRegistrarTests.swift`, `PushRouteTests.swift`, `Helpers/PartnerCloudStandIns.swift` (changed) | Tests and stand-ins for the changes |

In `~/Dev/Crewluve Website`: this plan, ticked as it goes, and the piece 4 spec (Task 27).

Outside both repos: the Mac harness (`$HARNESS`, Task 1) and the compile-only clone with the order check (`$BUILD`, Task 23).

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

Expected: `feature/partner-cloud-source`, then `ead6bfe test(crewluv): RecordingNotifier conforms to StatusNotifying in an extension`, plan 4a's last commit. If either differs, stop and ask: this plan was checked against `ead6bfe`. 4b builds on the same branch, since piece 4 ships as one release (spec §11).

### Task 1: The Mac harness

**Files (outside both repos):** `$HARNESS/Package.swift`, `$HARNESS/run.sh`

Plan 4a's harness, with 4b's files added to its list. A Swift package that compiles Crewluve's model and service files and their tests unchanged, on the Mac, and runs the Swift Testing tests. The app target gets the app's settings: Swift 5 mode, the main actor by default, Approachable Concurrency and member import visibility. The test target gets the same, without the main actor default, as `CrewluvTests` has.

`run.sh` copies the files that exist so far from `~/Dev/Crewluv` (or `$CREWLUV`, which must be an absolute path), takes the app's notification names out of `CrewluvApp.swift`, and links the fixtures, then runs `swift test`. It needs no Xcode project, no simulator and no network, and it builds into its own `.build` folder. Views, `AppDelegate`, `LinkRouter`, `BackgroundRefreshManager` and XCTest files aren't copied: they need UIKit, BackgroundTasks or SwiftUI's iOS views. If plan 4a's harness folder is still there, these two files replace its own.

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
         Services/StatusChangeNotifier.swift Services/NotificationDiagnostics.swift \
         Services/CloudKitShareManager.swift Services/CloudKitSubscriptionManager.swift \
         Services/PartnerStatusReceiver.swift Services/ICloudStatusFetcher.swift \
         Services/PilotStatusSource.swift Services/PushRegistrar.swift Services/PushRoute.swift \
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

Expected: `Test run with 127 tests in 14 suites passed`: Crewluve's Swift Testing tests as plan 4a left them, without the Keychain's. The first build takes about a minute; later runs take seconds. Nothing to commit: the harness isn't part of Crewluve.

### Task 2: Reading links and codes

**Files:**
- Create: `Crewluv/Models/PartnerLink.swift`
- Test: `CrewluvTests/PartnerLinkTests.swift`

Spec §7.1 and §9: Crewluve's own links, `https://crewluve.crewlu.net/join#t=<invite>` and `…/join#c=<code>`, pasted text holding one, and a typed code: 6 letters or digits in any case, with any spaces or dashes. Anything else is left to today's share handling. Logs show one of these links only by its host and path, since what follows the `#` is a secret.

- [x] **Step 1: Write the failing tests**

File: `CrewluvTests/PartnerLinkTests.swift`

```swift
//
//  PartnerLinkTests.swift
//  CrewluvTests
//
//  Invite links, code links and typed codes (partner links piece 4 spec §7.1)
//

import Foundation
import Testing
@testable import Crewluv

struct PartnerLinkTests {
    private let invite = "0f1e2d3c4b5a69788796a5b4c3d2e1f0"

    // MARK: - Links

    @Test func test_inviteLink() throws {
        let url = try #require(URL(string: "https://crewluve.crewlu.net/join#t=\(invite)"))

        #expect(PartnerLink(url: url) == .invite(invite))
    }

    @Test func test_codeLink_isReadInCapitals() throws {
        let url = try #require(URL(string: "https://crewluve.crewlu.net/join#c=k7mq2x"))

        #expect(PartnerLink(url: url) == .code("K7MQ2X"))
    }

    @Test func test_aTrailingSlash_isTolerated() throws {
        let url = try #require(URL(string: "https://crewluve.crewlu.net/join/#t=\(invite)"))

        #expect(PartnerLink(url: url) == .invite(invite))
    }

    @Test func test_theHost_inAnyCase() throws {
        let url = try #require(URL(string: "https://CrewLuve.CrewLu.net/join#t=\(invite)"))

        #expect(PartnerLink(url: url) == .invite(invite))
    }

    @Test(arguments: [
        "http://crewluve.crewlu.net/join#t=abc",
        "https://crewlu.net/join#t=abc",
        "https://crewluve.crewlu.net.example.com/join#t=abc",
        "https://crewluve.crewlu.net/join2#t=abc",
        "https://crewluve.crewlu.net/join/more#t=abc",
        "https://crewluve.crewlu.net/#t=abc",
        "https://crewluve.crewlu.net/join",
        "https://crewluve.crewlu.net/join#t=",
        "https://crewluve.crewlu.net/join#x=abc",
        "https://crewluve.crewlu.net/join?t=abc",
        "https://crewluve.crewlu.net/join#c=K7MQ2",
        "https://www.icloud.com/share/0abcDEF#Pilot_Status",
        "crewluv://accept-share?url=https%3A%2F%2Fwww.icloud.com%2Fshare%2F0abc",
    ])
    func test_otherLinks_arentPartnerLinks(text: String) throws {
        let url = try #require(URL(string: text))

        #expect(PartnerLink(url: url) == nil)
    }

    @Test func test_theFirstUsableValue_inTheFragment_counts() throws {
        let url = try #require(URL(string: "https://crewluve.crewlu.net/join#x=1&t=\(invite)&c=K7MQ2X"))

        #expect(PartnerLink(url: url) == .invite(invite))
    }

    // MARK: - Pasted or Typed Text

    @Test func test_pastedLink_withSpacesAndLineBreaks() {
        #expect(PartnerLink(text: "  https://crewluve.crewlu.net/join#t=\(invite)\n") == .invite(invite))
    }

    @Test(arguments: ["K7MQ2X", "k7mq2x", "K7M Q2X", "k7m-q2x", " K7M-Q2X ", "K 7 M Q 2 X"])
    func test_typedCode_inAnyCase_withSpacesOrDashes(text: String) {
        #expect(PartnerLink(text: text) == .code("K7MQ2X"))
    }

    @Test(arguments: ["K7MQ2", "K7MQ2XY", "K7MQ2!", "K7MQ2É", "", "   ", "hello there", "https://example.com/join#t=abc"])
    func test_otherText_isntAPartnerLink(text: String) {
        #expect(PartnerLink(text: text) == nil)
    }

    // MARK: - Logs

    @Test func test_logs_showOnlyTheHostAndPath_ofAPartnerLink() throws {
        let url = try #require(URL(string: "https://crewluve.crewlu.net/join#t=\(invite)"))

        #expect(PartnerLink.logDescription(of: url) == "crewluve.crewlu.net/join")
    }

    @Test func test_logs_showOtherLinks_asTheyAre() throws {
        let url = try #require(URL(string: "https://www.icloud.com/share/0abcDEF#Pilot_Status"))

        #expect(PartnerLink.logDescription(of: url) == "https://www.icloud.com/share/0abcDEF#Pilot_Status")
    }
}
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `cannot find 'PartnerLink' in scope`.

- [x] **Step 3: Write the link**

File: `Crewluv/Models/PartnerLink.swift`

```swift
//
//  PartnerLink.swift
//  CrewLuve
//
//  An invite link, a code link, or a typed code
//

import Foundation

/// What a link, pasted text or a typed code asks Crewluve to join (partner links piece 4 spec §7.1).
/// Crewluve's own links are `https://crewluve.crewlu.net/join#t=<invite>` and `…/join#c=<code>`.
/// Their secret is only after the `#`, so it never reaches a server log.
nonisolated enum PartnerLink: Equatable, Sendable {
    /// The pilot's invite, joined with partner_join.
    case invite(String)
    /// A code from another of this partner's devices, joined with partner_handoff_redeem.
    case code(String)

    static let host = "crewluve.crewlu.net"

    /// Reads one of Crewluve's own links. Nil for any other link, such as an iCloud share link,
    /// which today's share handling takes. A trailing slash is tolerated, though no link has one.
    init?(url: URL) {
        guard url.scheme?.lowercased() == "https",
              url.host()?.lowercased() == Self.host,
              url.path() == "/join" || url.path() == "/join/",
              let fragment = url.fragment(percentEncoded: true)
        else { return nil }

        for pair in fragment.split(separator: "&") {
            let parts = pair.split(separator: "=", maxSplits: 1)
            guard parts.count == 2, let value = String(parts[1]).removingPercentEncoding else { continue }
            switch parts[0] {
            case "t":
                self = .invite(value)
                return
            case "c":
                if let code = Self.code(from: value) {
                    self = .code(code)
                    return
                }
            default:
                continue
            }
        }
        return nil
    }

    /// Reads pasted or typed text: one of Crewluve's links, perhaps with spaces or line breaks around
    /// it, or a code.
    init?(text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if let url = URL(string: trimmed), let link = PartnerLink(url: url) {
            self = link
        } else if let code = Self.code(from: trimmed) {
            self = .code(code)
        } else {
            return nil
        }
    }

    /// A code as the door takes it: 6 letters or digits in capitals, from text in any case that may
    /// hold spaces or dashes. Nil for anything else.
    static func code(from text: String) -> String? {
        let code = text.filter { $0 != " " && $0 != "-" }.uppercased()
        guard code.count == 6, code.allSatisfy({ $0.isASCII && ($0.isLetter || $0.isNumber) }) else { return nil }
        return code
    }

    /// How logs show a link: one of Crewluve's own only by its host and path, since what follows the
    /// `#` is a secret (spec §9). Any other link as it is.
    static func logDescription(of url: URL) -> String {
        guard let host = url.host(), host.lowercased() == Self.host else { return url.absoluteString }
        return host + url.path()
    }
}
```

- [x] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 138 tests in 15 suites passed`.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Models/PartnerLink.swift CrewluvTests/PartnerLinkTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): read invite links, code links and typed codes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 3: The messages when a join doesn't connect

**Files:**
- Create: `Crewluv/Models/JoinMessage.swift`
- Test: `CrewluvTests/JoinMessageTests.swift`

Spec §7.3: each refusal or failure becomes one alert, with its title and message. A dead invite says whom this device still follows, when it follows a pilot.

- [x] **Step 1: Write the failing tests**

File: `CrewluvTests/JoinMessageTests.swift`

```swift
//
//  JoinMessageTests.swift
//  CrewluvTests
//
//  What a partner is told when a link or code didn't connect (partner links piece 4 spec §7.3)
//

import Foundation
import Testing
@testable import Crewluv

struct JoinMessageTests {

    @Test(arguments: [
        (JoinMessage.inviteNotWorking(stillConnectedTo: nil), "Invite Link Not Working",
         "This invite link doesn't work anymore. Ask your pilot to send it again."),
        (.inviteNotWorking(stillConnectedTo: "Dad"), "Invite Link Not Working",
         "This invite link doesn't work anymore. You're still connected to Dad."),
        (.codeNotWorking, "Code Not Working",
         "That code didn't work. Codes last 10 minutes and work once. Make a new one on your other device."),
        (.tooManyDevices, "Too Many Devices",
         "This invite already has 10 devices. Ask your pilot to remove one in CrewLu, then try again."),
        (.tooManyTries, "Too Many Tries", "Too many tries. Wait a minute, then try again."),
        (.couldntConnect, "Couldn't Connect", "Couldn't connect. Check your connection and try again."),
        (.notAnInviteLink, "Not an Invite Link", "That doesn't look like an invite link."),
    ])
    func test_titleAndText(message: JoinMessage, title: String, text: String) {
        #expect(message.title == title)
        #expect(message.text == text)
    }

    @Test(arguments: [
        (PartnerDoorError.refused(.sharingEnded), PartnerLink.invite("a"), JoinMessage.inviteNotWorking(stillConnectedTo: nil)),
        (.refused(.sharingEnded), .code("K7MQ2X"), .codeNotWorking),
        (.refused(.tooManyDevices), .invite("a"), .tooManyDevices),
        (.refused(.tooManyDevices), .code("K7MQ2X"), .tooManyDevices),
        (.refused(.tryLater), .code("K7MQ2X"), .tooManyTries),
        (.refused(.invalidInput), .invite("a"), .notAnInviteLink),
        (.refused(.keyInUse), .invite("a"), .couldntConnect),
        (.unavailable, .invite("a"), .couldntConnect),
        (.unavailable, .code("K7MQ2X"), .couldntConnect),
    ])
    func test_fromTheDoorsAnswer(error: PartnerDoorError, link: PartnerLink, expected: JoinMessage) {
        #expect(JoinMessage(error, joining: link, stillConnectedTo: nil) == expected)
    }

    @Test func test_aDeadInvite_saysWhoThisDeviceStillFollows() {
        #expect(JoinMessage(.refused(.sharingEnded), joining: .invite("a"), stillConnectedTo: "Dad")
                == .inviteNotWorking(stillConnectedTo: "Dad"))
    }
}
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `cannot find 'JoinMessage' in scope` (or `cannot find type 'JoinMessage' in scope`).

- [x] **Step 3: Write the messages**

File: `Crewluv/Models/JoinMessage.swift`

```swift
//
//  JoinMessage.swift
//  CrewLuve
//
//  What a partner is told when a link or code didn't connect
//

import Foundation

/// What a partner is told when a link or code didn't connect (partner links piece 4 spec §7.3).
/// Each is an alert with an OK button.
nonisolated enum JoinMessage: Equatable, Sendable {
    /// The invite link is dead. With the name of the pilot this device still follows, if any.
    case inviteNotWorking(stillConnectedTo: String?)
    case codeNotWorking
    case tooManyDevices
    case tooManyTries
    case couldntConnect
    case notAnInviteLink

    /// The message for the door's answer to joining `link`. `name` is the pilot this device still
    /// follows, as this partner sees them, if it follows one.
    init(_ error: PartnerDoorError, joining link: PartnerLink, stillConnectedTo name: String?) {
        switch (error, link) {
        case (.refused(.sharingEnded), .invite):
            self = .inviteNotWorking(stillConnectedTo: name)
        case (.refused(.sharingEnded), .code):
            self = .codeNotWorking
        case (.refused(.tooManyDevices), _):
            self = .tooManyDevices
        case (.refused(.tryLater), _):
            self = .tooManyTries
        case (.refused(.invalidInput), _):
            self = .notAnInviteLink
        case (.refused(.keyInUse), _), (.unavailable, _):
            self = .couldntConnect
        }
    }

    var title: String {
        switch self {
        case .inviteNotWorking: "Invite Link Not Working"
        case .codeNotWorking: "Code Not Working"
        case .tooManyDevices: "Too Many Devices"
        case .tooManyTries: "Too Many Tries"
        case .couldntConnect: "Couldn't Connect"
        case .notAnInviteLink: "Not an Invite Link"
        }
    }

    var text: String {
        switch self {
        case .inviteNotWorking(let name?):
            "This invite link doesn't work anymore. You're still connected to \(name)."
        case .inviteNotWorking(nil):
            "This invite link doesn't work anymore. Ask your pilot to send it again."
        case .codeNotWorking:
            "That code didn't work. Codes last 10 minutes and work once. Make a new one on your other device."
        case .tooManyDevices:
            "This invite already has 10 devices. Ask your pilot to remove one in CrewLu, then try again."
        case .tooManyTries:
            "Too many tries. Wait a minute, then try again."
        case .couldntConnect:
            "Couldn't connect. Check your connection and try again."
        case .notAnInviteLink:
            "That doesn't look like an invite link."
        }
    }
}
```

- [x] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 141 tests in 16 suites passed`.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Models/JoinMessage.swift CrewluvTests/JoinMessageTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): the messages for a link or code that didn't connect" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 4: The door's calls for joining, codes and leaving

**Files:**
- Create: `Crewluv/Models/HandOffCode.swift`
- Modify: `Crewluv/Services/PartnerCloud/PartnerDoor.swift`, `Crewluv/Services/PartnerCloud/LivePartnerDoor.swift`
- Test: `CrewluvTests/HandOffCodeTests.swift`, `CrewluvTests/LivePartnerDoorTests.swift`, `CrewluvTests/Helpers/PartnerCloudStandIns.swift`

Spec §7.2 and §7.5, and `~/Dev/Duty/supabase/partner-api.md`: `partner_join`, `partner_handoff_redeem`, `partner_handoff_create` and `partner_leave`, each as an `app` device. A hand-off code knows how it's shown: in two groups of three, as the code link its QR code holds, and as a countdown to when it runs out. Crewlu Cloud's `expires_at` is read with any fraction of a second and any offset; one that doesn't read makes the call unavailable.

- [x] **Step 1: Write the failing tests**

The door's stand-in answers the new calls from a script, and records each.

2 replacements, in order, in `CrewluvTests/Helpers/PartnerCloudStandIns.swift`:

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift
    var viewAnswers: [Result<PartnerViewAnswer, PartnerDoorError>] = []
    /// The answers to `setPush`, in order. With none left, it says ok.
    var setPushAnswers: [Result<Void, PartnerDoorError>] = []
    /// While true, each `view` waits for `release()`.
    var holdsViews = false

    private(set) var views: [(key: String, since: String?)] = []
    private(set) var pushes: [(key: String, token: String, environment: PushEnvironment)] = []
    private var held: [CheckedContinuation<Void, Never>] = []

    func view(key: String, since: String?) async throws(PartnerDoorError) -> PartnerViewAnswer {
```

with:

```swift
    var viewAnswers: [Result<PartnerViewAnswer, PartnerDoorError>] = []
    /// The answers to `setPush`, in order. With none left, it says ok.
    var setPushAnswers: [Result<Void, PartnerDoorError>] = []
    /// The answers to `join` and `redeem`, in order. With none left, the door can't be reached.
    var joinAnswers: [Result<PartnerJoinAnswer, PartnerDoorError>] = []
    /// The answers to `makeHandOffCode`, in order. With none left, the door can't be reached.
    var handOffAnswers: [Result<HandOffCode, PartnerDoorError>] = []
    /// The answers to `leave`, in order. With none left, it says ok.
    var leaveAnswers: [Result<Void, PartnerDoorError>] = []
    /// While true, each `view` waits for `release()`.
    var holdsViews = false

    private(set) var views: [(key: String, since: String?)] = []
    private(set) var pushes: [(key: String, token: String, environment: PushEnvironment)] = []
    /// Each join and redeem: what it joined with, and the key and label it sent.
    private(set) var joins: [(link: PartnerLink, key: String, label: String)] = []
    private(set) var handOffs: [String] = []
    private(set) var leaves: [String] = []
    private var held: [CheckedContinuation<Void, Never>] = []

    func view(key: String, since: String?) async throws(PartnerDoorError) -> PartnerViewAnswer {
```

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift
        pushes.append((key, token, environment))
        guard !setPushAnswers.isEmpty else { return }
        try setPushAnswers.removeFirst().get()
    }

    /// Lets every held `view` go on.
```

with:

```swift
        pushes.append((key, token, environment))
        guard !setPushAnswers.isEmpty else { return }
        try setPushAnswers.removeFirst().get()
    }

    func join(invite: String, key: String, label: String) async throws(PartnerDoorError) -> PartnerJoinAnswer {
        joins.append((.invite(invite), key, label))
        return try nextJoinAnswer()
    }

    func redeem(code: String, key: String, label: String) async throws(PartnerDoorError) -> PartnerJoinAnswer {
        joins.append((.code(code), key, label))
        return try nextJoinAnswer()
    }

    func makeHandOffCode(key: String) async throws(PartnerDoorError) -> HandOffCode {
        handOffs.append(key)
        guard !handOffAnswers.isEmpty else { throw .unavailable }
        return try handOffAnswers.removeFirst().get()
    }

    func leave(key: String) async throws(PartnerDoorError) {
        leaves.append(key)
        guard !leaveAnswers.isEmpty else { return }
        try leaveAnswers.removeFirst().get()
    }

    private func nextJoinAnswer() throws(PartnerDoorError) -> PartnerJoinAnswer {
        guard !joinAnswers.isEmpty else { throw .unavailable }
        return try joinAnswers.removeFirst().get()
    }

    /// Lets every held `view` go on.
```

File: `CrewluvTests/HandOffCodeTests.swift`

```swift
//
//  HandOffCodeTests.swift
//  CrewluvTests
//
//  The code Use on Another Device shows (partner links piece 4 spec §7.5)
//

import Foundation
import Testing
@testable import Crewluv

struct HandOffCodeTests {
    private let code = HandOffCode(code: "K7MQ2X", expiresAt: Date(timeIntervalSince1970: 1_792_419_308))

    @Test func test_grouped_inTwoGroupsOfThree() {
        #expect(code.grouped == "K7M Q2X")
    }

    @Test func test_link_isTheCodeLink_thatCrewluveReads() throws {
        #expect(code.link == "https://crewluve.crewlu.net/join#c=K7MQ2X")
        #expect(PartnerLink(url: try #require(URL(string: code.link))) == .code("K7MQ2X"))
    }

    @Test(arguments: [
        (600.0, "10:00 left · works once"),
        (581.0, "9:41 left · works once"),
        (59.4, "1:00 left · works once"),
        (0.5, "0:01 left · works once"),
        (0.0, "0:00 left · works once"),
        (-30.0, "0:00 left · works once"),
    ])
    func test_countdown(secondsLeft: Double, expected: String) {
        #expect(code.countdown(at: code.expiresAt.addingTimeInterval(-secondsLeft)) == expected)
    }

    @Test func test_runsOut_atItsExpiry() {
        #expect(!code.hasExpired(at: code.expiresAt.addingTimeInterval(-0.5)))
        #expect(code.hasExpired(at: code.expiresAt))
        #expect(code.hasExpired(at: code.expiresAt.addingTimeInterval(30)))
    }
}
```

4 replacements, in order, in `CrewluvTests/LivePartnerDoorTests.swift`:

In `CrewluvTests/LivePartnerDoorTests.swift`, replace:

```swift
struct LivePartnerDoorTests {

    private static let partner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    private static let key = String(repeating: "ab", count: 32)
    private static let updatedAt = "2026-10-18T22:01:40.493+00:00"
    private static let status = #"{"pilotId": "pilot", "pilotFirstName": "Alex", "lastUpdated": 1792605600, "appVersion": "3.0"}"#
```

with:

```swift
struct LivePartnerDoorTests {

    private static let partner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    private static let device = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
    private static let key = String(repeating: "ab", count: 32)
    private static let updatedAt = "2026-10-18T22:01:40.493+00:00"
    private static let status = #"{"pilotId": "pilot", "pilotFirstName": "Alex", "lastUpdated": 1792605600, "appVersion": "3.0"}"#
```

In `CrewluvTests/LivePartnerDoorTests.swift`, replace:

```swift
        #expect(request.url?.absoluteString == "https://corxvurxpnrzekbxdgye.supabase.co/rest/v1/rpc/partner_set_push")
        #expect(request.value(forHTTPHeaderField: "apikey") == LivePartnerDoor.publishableKey)
        #expect(try network.parameters(request) == ["p_key": Self.key, "p_token": "0a1b2c", "p_env": "sandbox"])
    }

    // MARK: - Answers
```

with:

```swift
        #expect(request.url?.absoluteString == "https://corxvurxpnrzekbxdgye.supabase.co/rest/v1/rpc/partner_set_push")
        #expect(request.value(forHTTPHeaderField: "apikey") == LivePartnerDoor.publishableKey)
        #expect(try network.parameters(request) == ["p_key": Self.key, "p_token": "0a1b2c", "p_env": "sandbox"])
    }

    @Test func test_join_postsTheInviteTheKeyAndTheLabel_asAnApp() async throws {
        let network = StandInNetwork(body: #"{"device_id": "\#(Self.device)", "partner_id": "\#(Self.partner)"}"#)
        let answer = try await network.door.join(invite: "0f1e2d3c", key: Self.key, label: "iPhone")

        let request = try #require(network.requests.first)
        #expect(request.url?.absoluteString == "https://corxvurxpnrzekbxdgye.supabase.co/rest/v1/rpc/partner_join")
        #expect(request.value(forHTTPHeaderField: "apikey") == LivePartnerDoor.publishableKey)
        #expect(try network.parameters(request) == ["p_invite": "0f1e2d3c", "p_device_key": Self.key, "p_kind": "app", "p_label": "iPhone"])
        #expect(answer == PartnerJoinAnswer(deviceID: Self.device, partnerID: Self.partner))
    }

    @Test func test_redeem_postsTheCodeTheKeyAndTheLabel_asAnApp() async throws {
        let network = StandInNetwork(body: #"{"device_id": "\#(Self.device)", "partner_id": "\#(Self.partner)"}"#)
        let answer = try await network.door.redeem(code: "K7MQ2X", key: Self.key, label: "iPad")

        let request = try #require(network.requests.first)
        #expect(request.url?.absoluteString == "https://corxvurxpnrzekbxdgye.supabase.co/rest/v1/rpc/partner_handoff_redeem")
        #expect(try network.parameters(request) == ["p_token": "K7MQ2X", "p_device_key": Self.key, "p_kind": "app", "p_label": "iPad"])
        #expect(answer == PartnerJoinAnswer(deviceID: Self.device, partnerID: Self.partner))
    }

    @Test func test_makeHandOffCode_postsTheKey() async throws {
        let network = StandInNetwork(body: #"{"code": "K7MQ2X", "expires_at": "2026-10-19T14:15:08.613123+00:00"}"#)
        let code = try await network.door.makeHandOffCode(key: Self.key)

        let request = try #require(network.requests.first)
        #expect(request.url?.absoluteString == "https://corxvurxpnrzekbxdgye.supabase.co/rest/v1/rpc/partner_handoff_create")
        #expect(try network.parameters(request) == ["p_key": Self.key])
        #expect(code.code == "K7MQ2X")
        #expect(abs(code.expiresAt.timeIntervalSince1970 - 1_792_419_308.613123) < 0.000_01)
    }

    @Test func test_leave_postsTheKey() async throws {
        let network = StandInNetwork(body: #"{"ok": true}"#)
        try await network.door.leave(key: Self.key)

        let request = try #require(network.requests.first)
        #expect(request.url?.absoluteString == "https://corxvurxpnrzekbxdgye.supabase.co/rest/v1/rpc/partner_leave")
        #expect(try network.parameters(request) == ["p_key": Self.key])
    }

    // MARK: - Answers
```

In `CrewluvTests/LivePartnerDoorTests.swift`, replace:

```swift
        }
    }

    @Test func test_setPush_ok() async throws {
        try await StandInNetwork(body: #"{"ok": true}"#).door.setPush(key: Self.key, token: "0a1b2c", environment: .production)
    }
```

with:

```swift
        }
    }

    @Test(arguments: [
        ("2026-10-19T14:15:08.613123+00:00", 1_792_419_308.613123),
        ("2026-10-19T14:15:08.613+00:00", 1_792_419_308.613),
        ("2026-10-19T14:15:08+00:00", 1_792_419_308.0),
        ("2026-10-19T09:15:08.613123-05:00", 1_792_419_308.613123),
    ])
    func test_handOffCode_expiry_inEachFormCrewluCloudSends(expiresAt: String, seconds: Double) async throws {
        let network = StandInNetwork(body: #"{"code": "K7MQ2X", "expires_at": "\#(expiresAt)"}"#)
        let code = try await network.door.makeHandOffCode(key: Self.key)

        #expect(abs(code.expiresAt.timeIntervalSince1970 - seconds) < 0.000_01)
    }

    @Test func test_handOffCode_withAnExpiryThatDoesntRead_isUnavailable() async {
        let network = StandInNetwork(body: #"{"code": "K7MQ2X", "expires_at": "tomorrow"}"#)

        await #expect(throws: PartnerDoorError.unavailable) { try await network.door.makeHandOffCode(key: Self.key) }
    }

    @Test func test_setPush_ok() async throws {
        try await StandInNetwork(body: #"{"ok": true}"#).door.setPush(key: Self.key, token: "0a1b2c", environment: .production)
    }
```

In `CrewluvTests/LivePartnerDoorTests.swift`, replace:

```swift

        await #expect(throws: expected) { try await network.door.view(key: Self.key, since: nil) }
        await #expect(throws: expected) { try await network.door.setPush(key: Self.key, token: "0a1b2c", environment: .sandbox) }
    }

    @Test(arguments: [400, 401, 404, 500, 503])
```

with:

```swift

        await #expect(throws: expected) { try await network.door.view(key: Self.key, since: nil) }
        await #expect(throws: expected) { try await network.door.setPush(key: Self.key, token: "0a1b2c", environment: .sandbox) }
        await #expect(throws: expected) { try await network.door.join(invite: "0f1e2d3c", key: Self.key, label: "iPhone") }
        await #expect(throws: expected) { try await network.door.redeem(code: "K7MQ2X", key: Self.key, label: "iPhone") }
        await #expect(throws: expected) { try await network.door.makeHandOffCode(key: Self.key) }
        await #expect(throws: expected) { try await network.door.leave(key: Self.key) }
    }

    @Test(arguments: [400, 401, 404, 500, 503])
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `cannot find 'HandOffCode' in scope` or `cannot find type 'PartnerJoinAnswer' in scope`, depending on which file the compiler reaches first.

- [x] **Step 3: Write the code**

File: `Crewluv/Models/HandOffCode.swift`

```swift
//
//  HandOffCode.swift
//  CrewLuve
//
//  A code another of this partner's devices joins with
//

import Foundation

/// A code another of this partner's devices joins with (partner links piece 4 spec §7.5):
/// partner_handoff_create's answer. It works once, until `expiresAt`, 10 minutes after it was made.
nonisolated struct HandOffCode: Equatable, Sendable {
    let code: String
    let expiresAt: Date

    /// The code as Use on Another Device shows it, in two groups of three: "K7M Q2X".
    var grouped: String {
        "\(code.prefix(3)) \(code.dropFirst(3))"
    }

    /// The link the QR code holds. The other device's camera opens Crewluve with it.
    var link: String {
        "https://\(PartnerLink.host)/join#c=\(code)"
    }

    /// "9:41 left · works once": the time left at `now`, rounded up, so 0:00 means it has run out.
    func countdown(at now: Date) -> String {
        let left = max(0, Int(expiresAt.timeIntervalSince(now).rounded(.up)))
        let seconds = left % 60
        return "\(left / 60):\(seconds < 10 ? "0" : "")\(seconds) left · works once"
    }

    func hasExpired(at now: Date) -> Bool {
        now >= expiresAt
    }
}
```

- [x] **Step 4: Add the calls to the door**

3 replacements, in order, in `Crewluv/Services/PartnerCloud/PartnerDoor.swift`:

In `Crewluv/Services/PartnerCloud/PartnerDoor.swift`, replace:

```swift
import Foundation

/// Crewlu Cloud's partner door: the calls a partner's device makes with only the publishable key
/// and its own device key (CrewLu's `supabase/partner-api.md`). This version reads the summary and
/// registers for pushes; joining, codes and leaving come with the screens that use them.
protocol PartnerDoor {
    /// partner_view: the pilot's summary, trimmed for the partner whose device holds `key`.
    /// `since` is the last answer's `updatedAt`, sent back exactly as it came, so a summary that
```

with:

```swift
import Foundation

/// Crewlu Cloud's partner door: the calls a partner's device makes with only the publishable key
/// and its own device key (CrewLu's `supabase/partner-api.md`).
protocol PartnerDoor {
    /// partner_view: the pilot's summary, trimmed for the partner whose device holds `key`.
    /// `since` is the last answer's `updatedAt`, sent back exactly as it came, so a summary that
```

In `Crewluv/Services/PartnerCloud/PartnerDoor.swift`, replace:

```swift
    /// partner_set_push: this device's push token, as lower-case hex, and the Apple service it
    /// belongs to.
    func setPush(key: String, token: String, environment: PushEnvironment) async throws(PartnerDoorError)
}

/// Why a partner-door call gave no answer to use.
```

with:

```swift
    /// partner_set_push: this device's push token, as lower-case hex, and the Apple service it
    /// belongs to.
    func setPush(key: String, token: String, environment: PushEnvironment) async throws(PartnerDoorError)

    /// partner_join: joins the partner the pilot's invite is for, as an app device holding `key`,
    /// named `label` in the pilot's list. The same key gets the same device again.
    func join(invite: String, key: String, label: String) async throws(PartnerDoorError) -> PartnerJoinAnswer

    /// partner_handoff_redeem: joins with a code from another of the partner's devices, as join does.
    func redeem(code: String, key: String, label: String) async throws(PartnerDoorError) -> PartnerJoinAnswer

    /// partner_handoff_create: a code another of this partner's devices can join with. It replaces
    /// the partner's open code.
    func makeHandOffCode(key: String) async throws(PartnerDoorError) -> HandOffCode

    /// partner_leave: this device leaves its partner's devices.
    func leave(key: String) async throws(PartnerDoorError)
}

/// Why a partner-door call gave no answer to use.
```

In `Crewluv/Services/PartnerCloud/PartnerDoor.swift`, replace:

```swift
    }
}

/// partner_view's answer.
struct PartnerViewAnswer: Sendable {
```

with:

```swift
    }
}

/// partner_join's and partner_handoff_redeem's answer: the device this key is, and its partner.
struct PartnerJoinAnswer: Equatable, Sendable {
    let deviceID: String
    let partnerID: String
}

/// partner_view's answer.
struct PartnerViewAnswer: Sendable {
```

- [x] **Step 5: Make them over HTTPS**

2 replacements, in order, in `Crewluv/Services/PartnerCloud/LivePartnerDoor.swift`:

In `Crewluv/Services/PartnerCloud/LivePartnerDoor.swift`, replace:

```swift
        let _: OKAnswer = try await call(
            "partner_set_push", PushParameters(key: key, token: token, environment: environment.rawValue)
        )
    }

    // MARK: - Calls
```

with:

```swift
        let _: OKAnswer = try await call(
            "partner_set_push", PushParameters(key: key, token: token, environment: environment.rawValue)
        )
    }

    func join(invite: String, key: String, label: String) async throws(PartnerDoorError) -> PartnerJoinAnswer {
        let answer: JoinAnswer = try await call("partner_join", JoinParameters(invite: invite, key: key, label: label))
        return answer.joined
    }

    func redeem(code: String, key: String, label: String) async throws(PartnerDoorError) -> PartnerJoinAnswer {
        let answer: JoinAnswer = try await call("partner_handoff_redeem", RedeemParameters(code: code, key: key, label: label))
        return answer.joined
    }

    func makeHandOffCode(key: String) async throws(PartnerDoorError) -> HandOffCode {
        let answer: HandOffAnswer = try await call("partner_handoff_create", KeyParameters(key: key))
        guard let expiresAt = try? Date(answer.expiresAt, strategy: .iso8601) else {
            debugLog("[PartnerDoor] partner_handoff_create's expiry didn't read")
            throw .unavailable
        }
        return HandOffCode(code: answer.code, expiresAt: expiresAt)
    }

    func leave(key: String) async throws(PartnerDoorError) {
        let _: OKAnswer = try await call("partner_leave", KeyParameters(key: key))
    }

    // MARK: - Calls
```

In `Crewluv/Services/PartnerCloud/LivePartnerDoor.swift`, replace:

```swift
    }
}

private struct RefusalAnswer: Decodable {
    let error: String
}

private struct OKAnswer: Decodable {
    let ok: Bool
}

private struct ViewAnswer: Decodable {
```

with:

```swift
    }
}

/// Crewluve joins as an app device, which gets pushes. The website joins as a web one.
private struct JoinParameters: Encodable {
    let invite: String
    let key: String
    let kind = "app"
    let label: String

    enum CodingKeys: String, CodingKey {
        case invite = "p_invite"
        case key = "p_device_key"
        case kind = "p_kind"
        case label = "p_label"
    }
}

private struct RedeemParameters: Encodable {
    let code: String
    let key: String
    let kind = "app"
    let label: String

    enum CodingKeys: String, CodingKey {
        case code = "p_token"
        case key = "p_device_key"
        case kind = "p_kind"
        case label = "p_label"
    }
}

private struct KeyParameters: Encodable {
    let key: String

    enum CodingKeys: String, CodingKey {
        case key = "p_key"
    }
}

private struct RefusalAnswer: Decodable {
    let error: String
}

private struct OKAnswer: Decodable {
    let ok: Bool
}

private struct JoinAnswer: Decodable {
    let deviceID: String
    let partnerID: String

    var joined: PartnerJoinAnswer {
        PartnerJoinAnswer(deviceID: deviceID, partnerID: partnerID)
    }

    enum CodingKeys: String, CodingKey {
        case deviceID = "device_id"
        case partnerID = "partner_id"
    }
}

/// The expiry comes as Crewlu Cloud writes a time: ISO 8601, with up to six decimals.
private struct HandOffAnswer: Decodable {
    let code: String
    let expiresAt: String

    enum CodingKeys: String, CodingKey {
        case code
        case expiresAt = "expires_at"
    }
}

private struct ViewAnswer: Decodable {
```

- [x] **Step 6: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 151 tests in 17 suites passed`.

- [x] **Step 7: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Models/HandOffCode.swift Crewluv/Services/PartnerCloud/PartnerDoor.swift Crewluv/Services/PartnerCloud/LivePartnerDoor.swift CrewluvTests/HandOffCodeTests.swift CrewluvTests/LivePartnerDoorTests.swift CrewluvTests/Helpers/PartnerCloudStandIns.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): the partner door joins, redeems codes, makes hand-off codes and leaves" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 5: A pending key

**Files:**
- Modify: `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift`
- Test: `CrewluvTests/KeychainDeviceKeyStoreTests.swift`, `CrewluvTests/Helpers/PartnerCloudStandIns.swift`

Decision 1: a join made without this device's key uses a pending key, kept in its own Keychain item, so this device's key changes only when the device switches. `KeychainDeviceKeyStoreTests` runs only in Xcode (Task 25): the harness can't reach the iOS Keychain, so `run.sh` leaves it out.

- [x] **Step 1: Write the failing tests**

3 replacements, in order, in `CrewluvTests/KeychainDeviceKeyStoreTests.swift`:

In `CrewluvTests/KeychainDeviceKeyStoreTests.swift`, replace:

```swift
//  KeychainDeviceKeyStoreTests.swift
//  CrewluvTests
//
//  The device key in the Keychain (partner links piece 4 spec §5.3). These run only in
//  Xcode: the Mac harness can't reach the iOS Keychain.
//

import Foundation
```

with:

```swift
//  KeychainDeviceKeyStoreTests.swift
//  CrewluvTests
//
//  The device key and the pending key in the Keychain (partner links piece 4 spec §5.3). These
//  run only in Xcode: the Mac harness can't reach the iOS Keychain.
//

import Foundation
```

In `CrewluvTests/KeychainDeviceKeyStoreTests.swift`, replace:

```swift

    init() {
        store.forgetDeviceKey()
    }

    @Test func test_noKey_readsNil() throws {
```

with:

```swift

    init() {
        store.forgetDeviceKey()
        store.forgetPendingKey()
    }

    @Test func test_noKey_readsNil() throws {
```

In `CrewluvTests/KeychainDeviceKeyStoreTests.swift`, replace:

```swift
        #expect(try store.deviceKey() == nil)
    }

    @Test func test_key_staysOnThisDevice_andCanBeReadWhileLocked() throws {
        store.save(deviceKey: "first")
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "com.ToddAnderson.Crewluv.partnerCloud.tests",
            kSecReturnAttributes as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
```

with:

```swift
        #expect(try store.deviceKey() == nil)
    }

    @Test func test_pendingKey_isKeptApartFromTheDeviceKey() throws {
        store.save(deviceKey: "device")
        #expect(store.save(pendingKey: "pending"))
        #expect(try store.deviceKey() == "device")
        #expect(try store.pendingKey() == "pending")

        store.forgetPendingKey()
        #expect(try store.pendingKey() == nil)
        #expect(try store.deviceKey() == "device")
    }

    @Test func test_pendingKey_replacesTheLastOne() throws {
        store.save(pendingKey: "first")
        #expect(store.save(pendingKey: "second"))
        #expect(try store.pendingKey() == "second")
    }

    @Test(arguments: ["deviceKey", "pendingKey"])
    func test_keys_stayOnThisDevice_andCanBeReadWhileLocked(account: String) throws {
        store.save(deviceKey: "device")
        store.save(pendingKey: "pending")
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "com.ToddAnderson.Crewluv.partnerCloud.tests",
            kSecAttrAccount as String: account,
            kSecReturnAttributes as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
```

- [x] **Step 2: Give the stand-in a pending key**

The in-memory store also learns to fail a save, for Task 9.

2 replacements, in order, in `CrewluvTests/Helpers/PartnerCloudStandIns.swift`:

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift
@MainActor
final class InMemoryDeviceKeyStore: DeviceKeyStore {
    var key: String?
    /// While true, reading the key fails, as the Keychain's does before the phone's first unlock.
    var readFails = false

    func deviceKey() throws(DeviceKeyUnreadable) -> String? {
        if readFails {
```

with:

```swift
@MainActor
final class InMemoryDeviceKeyStore: DeviceKeyStore {
    var key: String?
    var pending: String?
    /// While true, reading a key fails, as the Keychain's does before the phone's first unlock.
    var readFails = false
    /// While true, saving a key fails.
    var savesFail = false

    func deviceKey() throws(DeviceKeyUnreadable) -> String? {
        if readFails {
```

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift
    }

    func save(deviceKey: String) -> Bool {
        key = deviceKey
        return true
    }

    func forgetDeviceKey() {
        key = nil
    }
}
```

with:

```swift
    }

    func save(deviceKey: String) -> Bool {
        guard !savesFail else { return false }
        key = deviceKey
        return true
    }

    func forgetDeviceKey() {
        key = nil
    }

    func pendingKey() throws(DeviceKeyUnreadable) -> String? {
        if readFails {
            throw DeviceKeyUnreadable(status: errSecInteractionNotAllowed)
        }
        return pending
    }

    func save(pendingKey: String) -> Bool {
        guard !savesFail else { return false }
        pending = pendingKey
        return true
    }

    func forgetPendingKey() {
        pending = nil
    }
}
```

- [x] **Step 3: Keep the pending key in the Keychain**

3 replacements, in order, in `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift`:

In `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift`, replace:

```swift
    let status: OSStatus
}

/// Where this device keeps its partner-door key.
protocol DeviceKeyStore {
    /// This device's key, or nil when it has none.
    func deviceKey() throws(DeviceKeyUnreadable) -> String?
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
```

with:

```swift
    let status: OSStatus
}

/// Where this device keeps its partner-door key, and the key it joins with until it's connected
/// (spec §5.3).
protocol DeviceKeyStore {
    /// This device's key, or nil when it has none.
    func deviceKey() throws(DeviceKeyUnreadable) -> String?
    /// Saves this device's key in place of any other. False if it couldn't be saved.
    @discardableResult func save(deviceKey: String) -> Bool
    func forgetDeviceKey()

    /// The key a join used while this device isn't connected with it yet, or nil when there's none.
    func pendingKey() throws(DeviceKeyUnreadable) -> String?
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

In `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift`, replace:

```swift
        self.service = service
    }

    /// Nil when the Keychain has no key for this device, or holds one that isn't text, which can't
    /// be used and which the next save replaces. Any other failure throws.
    func deviceKey() throws(DeviceKeyUnreadable) -> String? {
        var query = item
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
```

with:

```swift
        self.service = service
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

In `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift`, replace:

```swift
            return nil
        }
        guard status == errSecSuccess else {
            debugLog("[DeviceKey] The key couldn't be read: OSStatus \(status)")
            throw DeviceKeyUnreadable(status: status)
        }
        guard let data = result as? Data, let key = String(data: data, encoding: .utf8) else {
            debugLog("[DeviceKey] The Keychain holds a key that isn't text")
            return nil
        }
        return key
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

with:

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

- [x] **Step 4: Check it compiles**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 151 tests in 17 suites passed`. The Keychain tests wait for Task 25.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PartnerCloud/DeviceKeyStore.swift CrewluvTests/KeychainDeviceKeyStoreTests.swift CrewluvTests/Helpers/PartnerCloudStandIns.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): a pending key, kept apart from the device's key while a join waits" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 6: This device on Crewlu Cloud, in its own type

**Files:**
- Create: `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`
- Modify: `Crewluv/Services/PilotStatusSource.swift`

Decision 6: the key, the partner id, `since` and the generation move out of the source into `CrewluCloudDevice`, which joining also uses (Tasks 9–14). The source reads through it. Nothing changes in what either does, so plan 4a's tests are the check.

- [x] **Step 1: Write the device**

File: `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`

```swift
//
//  CrewluCloudDevice.swift
//  CrewLuve
//
//  This device on Crewlu Cloud: its key, its partner, and its reads
//

import Foundation
import Observation

/// This device on Crewlu Cloud: the key it holds, the partner it's a device of, and what its reads
/// send back (partner links piece 4 spec §5.1–§5.3). The status source reads through it.
@Observable
final class CrewluCloudDevice {
    /// This device's partner id on Crewlu Cloud, or nil while it follows its pilot through iCloud.
    private(set) var partnerID: String?

    /// The last answer's `updatedAt`, sent back as `since` within this run of the app. The first read
    /// after a launch sends none, since the app doesn't keep the summary.
    @ObservationIgnored var since: String?

    @ObservationIgnored private let door: PartnerDoor
    @ObservationIgnored private let keys: DeviceKeyStore
    @ObservationIgnored private let connection: PartnerConnection
    /// Goes up each time the connection is forgotten, so a read begun before then brings nothing back.
    @ObservationIgnored private var generation = 0

    init(door: PartnerDoor, keys: DeviceKeyStore, connection: PartnerConnection) {
        self.door = door
        self.keys = keys
        self.connection = connection
        partnerID = connection.partnerID
    }

    /// How a read went.
    enum Read {
        case answer(PartnerViewAnswer)
        /// The Keychain couldn't be read just now. The connection stays: the key is most likely
        /// there, and readable after an unlock.
        case keyUnreadable
        /// The key is gone, so this device is no longer on Crewlu Cloud.
        case keyGone
        /// The pilot stopped sharing with this device, which has forgotten its key and the connection.
        case sharingEnded
        case unavailable
    }

    /// partner_view with this device's key, sending `since` back.
    func read() async -> Read {
        let storedKey: String?
        do {
            storedKey = try keys.deviceKey()
        } catch {
            return .keyUnreadable
        }
        guard let key = storedKey else {
            connection.partnerID = nil
            partnerID = nil
            since = nil
            return .keyGone
        }
        let generation = generation
        let answer: PartnerViewAnswer
        do {
            answer = try await door.view(key: key, since: since)
        } catch .refused(.sharingEnded) {
            forget()
            return .sharingEnded
        } catch {
            guard generation == self.generation else { return .sharingEnded }
            since = nil
            return .unavailable
        }
        // Sharing ended while the door answered, say through the push registration: the answer
        // is for a connection that's gone.
        guard generation == self.generation else { return .sharingEnded }
        return .answer(answer)
    }

    /// A key with no connection saved is what a reinstall leaves: iOS keeps an app's Keychain items,
    /// not its settings (spec §5.3). Reads with it, and connects when Crewlu Cloud answers with a
    /// summary, or with none yet on a device without an iCloud share. Nil carries on with iCloud;
    /// it's tried on every refresh until Crewlu Cloud answers, or the Keychain can be read.
    func adoptLeftoverKey() async -> PartnerViewAnswer? {
        guard let key = try? keys.deviceKey() else { return nil }
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
        partnerID = answer.partnerID
        return answer
    }

    /// Forgets this device's key and its connection.
    func forget() {
        generation += 1
        keys.forgetDeviceKey()
        connection.partnerID = nil
        partnerID = nil
        since = nil
    }
}
```

- [x] **Step 2: Read through it**

9 replacements, in order, in `Crewluv/Services/PilotStatusSource.swift`:

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
import Observation

/// The one place that reads the pilot's status, whoever asks: the screen, a push or the background
/// refresh (partner links piece 4 spec §5.1). It reads Crewlu Cloud once this device is connected
/// there, and iCloud otherwise, as before. Each new status goes to the alerts once, from here.
@Observable
final class PilotStatusSource {
    static let shared = PilotStatusSource()
```

with:

```swift
import Observation

/// The one place that reads the pilot's status, whoever asks: the screen, a push or the background
/// refresh (partner links piece 4 spec §5.1). It reads Crewlu Cloud, through `CrewluCloudDevice`,
/// once this device is connected there, and iCloud otherwise, as before. Each new status goes to
/// the alerts once, from here.
@Observable
final class PilotStatusSource {
    static let shared = PilotStatusSource()
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    /// How the last read went, or how sharing ended outside a read.
    private(set) var lastUpdate: PilotStatusUpdate?
    /// This device's partner id on Crewlu Cloud, or nil while it follows its pilot through iCloud.
    private(set) var crewluCloudPartnerID: String?

    var isOnCrewluCloud: Bool { crewluCloudPartnerID != nil }
```

with:

```swift
    /// How the last read went, or how sharing ended outside a read.
    private(set) var lastUpdate: PilotStatusUpdate?
    /// This device's partner id on Crewlu Cloud, or nil while it follows its pilot through iCloud.
    var crewluCloudPartnerID: String? { device.partnerID }

    var isOnCrewluCloud: Bool { crewluCloudPartnerID != nil }
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    }

    @ObservationIgnored private let iCloud: ICloudStatusFetching
    @ObservationIgnored private let door: PartnerDoor
    @ObservationIgnored private let keys: DeviceKeyStore
    @ObservationIgnored private let connection: PartnerConnection
    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let notifier: StatusNotifying
    @ObservationIgnored private let iCloudShareEnded: @MainActor () -> Void
```

with:

```swift
    }

    @ObservationIgnored private let iCloud: ICloudStatusFetching
    @ObservationIgnored private let device: CrewluCloudDevice
    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let notifier: StatusNotifying
    @ObservationIgnored private let iCloudShareEnded: @MainActor () -> Void
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    @ObservationIgnored private var screensInFront: [ObjectIdentifier: () -> Bool] = [:]
    /// Runs when this device connects to Crewlu Cloud, to send its push token (spec §6.1).
    @ObservationIgnored private let didConnect: @MainActor () -> Void
    /// The last Crewlu Cloud answer's `updatedAt`, sent back as `since` within this run of the app.
    /// The first read after a launch sends none, since the app doesn't keep the summary.
    @ObservationIgnored private var since: String?
    @ObservationIgnored private let reads = ReadQueue<RefreshOutcome>()
    /// Goes up each time the connection is forgotten, so a read begun before then brings nothing back.
    @ObservationIgnored private var connectionGeneration = 0

    /// Where the alerts' title name is kept, as before.
    private static let displayNameKey = "ResolvedPilotDisplayName"
```

with:

```swift
    @ObservationIgnored private var screensInFront: [ObjectIdentifier: () -> Bool] = [:]
    /// Runs when this device connects to Crewlu Cloud, to send its push token (spec §6.1).
    @ObservationIgnored private let didConnect: @MainActor () -> Void
    @ObservationIgnored private let reads = ReadQueue<RefreshOutcome>()

    /// Where the alerts' title name is kept, as before.
    private static let displayNameKey = "ResolvedPilotDisplayName"
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        didConnect: @escaping @MainActor () -> Void = { Task { await PushRegistrar.shared.register() } }
    ) {
        self.iCloud = iCloud
        self.door = door
        self.keys = keys
        self.defaults = defaults
        self.notifier = notifier
        self.iCloudShareEnded = iCloudShareEnded
        self.periodicCheck = periodicCheck
        self.didConnect = didConnect
        connection = PartnerConnection(defaults: defaults)
        crewluCloudPartnerID = connection.partnerID
    }

    // MARK: - Refreshing
```

with:

```swift
        didConnect: @escaping @MainActor () -> Void = { Task { await PushRegistrar.shared.register() } }
    ) {
        self.iCloud = iCloud
        self.defaults = defaults
        self.notifier = notifier
        self.iCloudShareEnded = iCloudShareEnded
        self.periodicCheck = periodicCheck
        self.didConnect = didConnect
        device = CrewluCloudDevice(door: door, keys: keys, connection: PartnerConnection(defaults: defaults))
    }

    // MARK: - Refreshing
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    /// The pilot stopped sharing with this device, as Crewlu Cloud told the push registration:
    /// forget the connection, and tell the screen.
    func endSharing() {
        forgetConnection()
        report(PilotStatusUpdate(outcome: .sharingEnded, readAt: Date()))
    }
```

with:

```swift
    /// The pilot stopped sharing with this device, as Crewlu Cloud told the push registration:
    /// forget the connection, and tell the screen.
    func endSharing() {
        device.forget()
        forgetPilot()
        report(PilotStatusUpdate(outcome: .sharingEnded, readAt: Date()))
    }
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        reading = nil
    }

    /// Forgets this device's key and its Crewlu Cloud connection, as today's iCloud reset forgets
    /// the share (spec §7.6).
    private func forgetConnection() {
        connectionGeneration += 1
        keys.forgetDeviceKey()
        connection.partnerID = nil
        crewluCloudPartnerID = nil
        since = nil
        reading = nil
        defaults.removeObject(forKey: Self.displayNameKey)
        defaults.removeObject(forKey: Self.snapshotKey)
```

with:

```swift
        reading = nil
    }

    /// Forgets the pilot's reading and what the alerts kept of them, as today's iCloud reset does
    /// (spec §7.6).
    private func forgetPilot() {
        reading = nil
        defaults.removeObject(forKey: Self.displayNameKey)
        defaults.removeObject(forKey: Self.snapshotKey)
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    // MARK: - Crewlu Cloud

    private func readCrewluCloud() async -> RefreshOutcome {
        let storedKey: String?
        do {
            storedKey = try keys.deviceKey()
        } catch {
            // The connection stays: the key is most likely there, and readable after an unlock.
            return .failed(Self.keyUnreadable)
        }
        guard let key = storedKey else {
            connection.partnerID = nil
            crewluCloudPartnerID = nil
            reading = nil
            since = nil
            return .notConnected
        }
        let generation = connectionGeneration
        let answer: PartnerViewAnswer
        do {
            answer = try await door.view(key: key, since: since)
        } catch .refused(.sharingEnded) {
            forgetConnection()
            return .sharingEnded
        } catch {
            guard generation == connectionGeneration else { return .sharingEnded }
            since = nil
            return .failed(Self.unreachable)
        }
        // Sharing ended while the door answered, say through the push registration: the answer
        // is for a connection that's gone.
        guard generation == connectionGeneration else { return .sharingEnded }
        return await take(answer)
    }

    /// A key with no Crewlu Cloud connection saved is what a reinstall leaves: iOS keeps an app's
    /// Keychain items, not its settings (spec §5.3). It's tried on every refresh until Crewlu
    /// Cloud answers, or the Keychain can be read. Nil carries on with iCloud.
    private func adoptLeftoverKey() async -> RefreshOutcome? {
        guard let key = try? keys.deviceKey() else { return nil }
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
        didConnect()
        return await take(answer)
    }
```

with:

```swift
    // MARK: - Crewlu Cloud

    private func readCrewluCloud() async -> RefreshOutcome {
        switch await device.read() {
        case .answer(let answer):
            return await take(answer)
        case .keyUnreadable:
            return .failed(Self.keyUnreadable)
        case .keyGone:
            reading = nil
            return .notConnected
        case .sharingEnded:
            forgetPilot()
            return .sharingEnded
        case .unavailable:
            return .failed(Self.unreachable)
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

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        case .noSummaryYet:
            return .noStatusYet
        case .summary(let summary):
            since = answer.updatedAt
            if case .crewluCloud(_, let partnerID, let updatedAt)? = reading, updatedAt != nil,
               updatedAt == answer.updatedAt, partnerID == answer.partnerID {
                return .unchanged
```

with:

```swift
        case .noSummaryYet:
            return .noStatusYet
        case .summary(let summary):
            device.since = answer.updatedAt
            if case .crewluCloud(_, let partnerID, let updatedAt)? = reading, updatedAt != nil,
               updatedAt == answer.updatedAt, partnerID == answer.partnerID {
                return .unchanged
```

- [x] **Step 3: Check the tests still pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 151 tests in 17 suites passed`.

- [x] **Step 4: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift Crewluv/Services/PilotStatusSource.swift && git -C ~/Dev/Crewluv commit -q -m "refactor(crewluv): this device on Crewlu Cloud gets its own type" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 7: A refusal for a replaced key ends nothing

**Files:**
- Modify: `Crewluv/Models/PilotStatusUpdate.swift`, `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`, `Crewluv/Services/PilotStatusSource.swift`, `Crewluv/Services/PartnerStatusReceiver.swift`, `Crewluv/Services/PushRegistrar.swift`, `Crewluv/Services/PushRoute.swift`
- Test: `CrewluvTests/CrewluCloudDeviceTests.swift`, `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, `CrewluvTests/PilotStatusSourceTests.swift`, `CrewluvTests/PushRegistrarTests.swift`, `CrewluvTests/PushRouteTests.swift`

Spec §14, left for 4b: once joining can change this device's key mid-read, the generation moves on at every connection change, and also guards `sharing_ended`, so a late one for an old key can't delete the new key. Decision 4: such a read is `superseded`. It brings nothing back and forgets nothing, iOS hears "no data", and the screen waits for the read the change asks for. The push registration ends sharing only if the key it sent is still this device's.

- [x] **Step 1: Write the failing tests**

The door's stand-in can run something while it answers the push registration, such as a switch to a new key.

2 replacements, in order, in `CrewluvTests/Helpers/PartnerCloudStandIns.swift`:

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift
    var leaveAnswers: [Result<Void, PartnerDoorError>] = []
    /// While true, each `view` waits for `release()`.
    var holdsViews = false

    private(set) var views: [(key: String, since: String?)] = []
    private(set) var pushes: [(key: String, token: String, environment: PushEnvironment)] = []
```

with:

```swift
    var leaveAnswers: [Result<Void, PartnerDoorError>] = []
    /// While true, each `view` waits for `release()`.
    var holdsViews = false
    /// Runs while `setPush` waits for its answer, as if something happened meanwhile.
    var whileSettingPush: (() -> Void)?

    private(set) var views: [(key: String, since: String?)] = []
    private(set) var pushes: [(key: String, token: String, environment: PushEnvironment)] = []
```

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift

    func setPush(key: String, token: String, environment: PushEnvironment) async throws(PartnerDoorError) {
        pushes.append((key, token, environment))
        guard !setPushAnswers.isEmpty else { return }
        try setPushAnswers.removeFirst().get()
    }
```

with:

```swift

    func setPush(key: String, token: String, environment: PushEnvironment) async throws(PartnerDoorError) {
        pushes.append((key, token, environment))
        whileSettingPush?()
        guard !setPushAnswers.isEmpty else { return }
        try setPushAnswers.removeFirst().get()
    }
```

File: `CrewluvTests/CrewluCloudDeviceTests.swift`

```swift
//
//  CrewluCloudDeviceTests.swift
//  CrewluvTests
//
//  This device on Crewlu Cloud: its key, its partner, and its reads (partner links piece 4 spec §5.1–§5.3)
//

import Foundation
import Testing
@testable import Crewluv

@MainActor
final class CrewluCloudDeviceTests {
    private let defaultsName = "CrewluCloudDeviceTests.\(UUID().uuidString)"
    private let defaults: UserDefaults
    private let door = StandInPartnerDoor()
    private let keys = InMemoryDeviceKeyStore()

    init() throws {
        defaults = try #require(UserDefaults(suiteName: defaultsName))
    }

    deinit {
        defaults.removePersistentDomain(forName: defaultsName)
    }

    /// A device on Crewlu Cloud as partner A.
    private func connectedDevice() -> CrewluCloudDevice {
        defaults.set(Make.partnerA, forKey: "partnerCloud.partnerID")
        keys.key = Make.key
        return CrewluCloudDevice(door: door, keys: keys, connection: PartnerConnection(defaults: defaults))
    }

    // MARK: - Reads the Connection Changed Under

    @Test func test_sharingEnded_forAKeyReplacedMeanwhile_forgetsNothing() async {
        door.viewAnswers = [.failure(.refused(.sharingEnded))]
        door.holdsViews = true
        let device = connectedDevice()

        let read = Task { await device.read() }
        await eventually { door.views.count == 1 }
        device.forget()
        keys.key = "new"
        door.release()

        guard case .superseded = await read.value else {
            Issue.record("expected the read to bring nothing back")
            return
        }
        #expect(keys.key == "new")
    }
}
```

3 replacements, in order, in `CrewluvTests/PilotStatusSourceTests.swift`:

In `CrewluvTests/PilotStatusSourceTests.swift`, replace:

```swift
        #expect(!source.isOnCrewluCloud)
    }

    @Test func test_crewluCloud_summaryAnsweredAfterSharingEnded_isDropped() async throws {
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary(["displayNameByPartner": [Make.partnerA: "Dad"]]))]
        door.holdsViews = true
        let source = connectedSource()
```

with:

```swift
        #expect(!source.isOnCrewluCloud)
    }

    @Test func test_crewluCloud_summaryAnsweredAfterSharingEnded_bringsNothingBack() async throws {
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary(["displayNameByPartner": [Make.partnerA: "Dad"]]))]
        door.holdsViews = true
        let source = connectedSource()
```

In `CrewluvTests/PilotStatusSourceTests.swift`, replace:

```swift
        source.endSharing()
        door.release()

        #expect(await read.value == .sharingEnded)
        #expect(source.reading == nil)
        #expect(!source.isOnCrewluCloud)
        #expect(defaults.string(forKey: "ResolvedPilotDisplayName") == nil)
        #expect(await notifier.evaluations.isEmpty)
    }

    @Test func test_crewluCloud_failureAfterSharingEnded_isSharingEnded() async {
        door.holdsViews = true
        let source = connectedSource()
```

with:

```swift
        source.endSharing()
        door.release()

        #expect(await read.value == .superseded)
        #expect(source.reading == nil)
        #expect(!source.isOnCrewluCloud)
        #expect(defaults.string(forKey: "ResolvedPilotDisplayName") == nil)
        #expect(await notifier.evaluations.isEmpty)
    }

    @Test func test_crewluCloud_failureAfterSharingEnded_bringsNothingBack() async {
        door.holdsViews = true
        let source = connectedSource()
```

In `CrewluvTests/PilotStatusSourceTests.swift`, replace:

```swift
        source.endSharing()
        door.release()

        #expect(await read.value == .sharingEnded)
    }

    @Test func test_crewluCloud_sameTimeForAnotherPartner_isANewStatus() async throws {
```

with:

```swift
        source.endSharing()
        door.release()

        #expect(await read.value == .superseded)
    }

    @Test func test_crewluCloud_sameTimeForAnotherPartner_isANewStatus() async throws {
```

One replacement in `CrewluvTests/PushRegistrarTests.swift`:

In `CrewluvTests/PushRegistrarTests.swift`, replace:

```swift
        #expect(!registrar.isOwed)
    }

    @Test func test_refused_isntTriedAgainUntilTheNextLaunch() async {
        door.setPushAnswers = [.failure(.refused(.invalidInput))]
        let (registrar, source) = makeRegistrar()
```

with:

```swift
        #expect(!registrar.isOwed)
    }

    @Test func test_sharingEnded_forAKeyReplacedMeanwhile_endsNothing() async {
        door.setPushAnswers = [.failure(.refused(.sharingEnded))]
        let (registrar, source) = makeRegistrar()
        door.whileSettingPush = { [keys] in keys.key = "new" }

        await registrar.didReceive(deviceToken: Data([0x0A]))

        #expect(source.isOnCrewluCloud)
        #expect(keys.key == "new")
        #expect(log.entries == ["Sharing ended"])
    }

    @Test func test_refused_isntTriedAgainUntilTheNextLaunch() async {
        door.setPushAnswers = [.failure(.refused(.invalidInput))]
        let (registrar, source) = makeRegistrar()
```

One replacement in `CrewluvTests/PushRouteTests.swift`:

In `CrewluvTests/PushRouteTests.swift`, replace:

```swift
        (.unchanged, .noData),
        (.noStatusYet, .noData),
        (.notConnected, .noData),
        (.failed("No connection to Crewlu Cloud"), .failed),
    ])
    func test_whatIOSIsTold(outcome: RefreshOutcome, expected: BackgroundFetchOutcome) {
```

with:

```swift
        (.unchanged, .noData),
        (.noStatusYet, .noData),
        (.notConnected, .noData),
        (.superseded, .noData),
        (.failed("No connection to Crewlu Cloud"), .failed),
    ])
    func test_whatIOSIsTold(outcome: RefreshOutcome, expected: BackgroundFetchOutcome) {
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors that name `superseded`, such as `reference to member 'superseded' cannot be resolved without a contextual type`.

- [x] **Step 3: Add the outcome**

One replacement in `Crewluv/Models/PilotStatusUpdate.swift`:

In `Crewluv/Models/PilotStatusUpdate.swift`, replace:

```swift
    case sharingEnded
    /// The read failed. The message says why, for the sync line.
    case failed(String)
}
```

with:

```swift
    case sharingEnded
    /// The read failed. The message says why, for the sync line.
    case failed(String)
    /// The connection changed while this read waited, so it brings nothing back. The read the change
    /// asks for tells.
    case superseded
}
```

- [x] **Step 4: Guard every answer by the generation**

3 replacements, in order, in `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`:

In `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`, replace:

```swift
    @ObservationIgnored private let door: PartnerDoor
    @ObservationIgnored private let keys: DeviceKeyStore
    @ObservationIgnored private let connection: PartnerConnection
    /// Goes up each time the connection is forgotten, so a read begun before then brings nothing back.
    @ObservationIgnored private var generation = 0

    init(door: PartnerDoor, keys: DeviceKeyStore, connection: PartnerConnection) {
```

with:

```swift
    @ObservationIgnored private let door: PartnerDoor
    @ObservationIgnored private let keys: DeviceKeyStore
    @ObservationIgnored private let connection: PartnerConnection
    /// Goes up each time the connection changes, so a read begun before then brings nothing back.
    @ObservationIgnored private var generation = 0

    init(door: PartnerDoor, keys: DeviceKeyStore, connection: PartnerConnection) {
```

In `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`, replace:

```swift
        /// The pilot stopped sharing with this device, which has forgotten its key and the connection.
        case sharingEnded
        case unavailable
    }

    /// partner_view with this device's key, sending `since` back.
```

with:

```swift
        /// The pilot stopped sharing with this device, which has forgotten its key and the connection.
        case sharingEnded
        case unavailable
        /// The connection changed while the door answered, so the answer is for one that's gone.
        case superseded
    }

    /// partner_view with this device's key, sending `since` back.
```

In `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`, replace:

```swift
        do {
            answer = try await door.view(key: key, since: since)
        } catch .refused(.sharingEnded) {
            forget()
            return .sharingEnded
        } catch {
            guard generation == self.generation else { return .sharingEnded }
            since = nil
            return .unavailable
        }
        // Sharing ended while the door answered, say through the push registration: the answer
        // is for a connection that's gone.
        guard generation == self.generation else { return .sharingEnded }
        return .answer(answer)
    }
```

with:

```swift
        do {
            answer = try await door.view(key: key, since: since)
        } catch .refused(.sharingEnded) {
            // A refusal for a key the connection has since let go of forgets nothing: the key
            // saved now may be a new one.
            guard generation == self.generation else { return .superseded }
            forget()
            return .sharingEnded
        } catch {
            guard generation == self.generation else { return .superseded }
            since = nil
            return .unavailable
        }
        guard generation == self.generation else { return .superseded }
        return .answer(answer)
    }
```

- [x] **Step 5: Pass it on, and tell iOS no data**

One replacement in `Crewluv/Services/PilotStatusSource.swift`:

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
            return .sharingEnded
        case .unavailable:
            return .failed(Self.unreachable)
        }
    }
```

with:

```swift
            return .sharingEnded
        case .unavailable:
            return .failed(Self.unreachable)
        case .superseded:
            return .superseded
        }
    }
```

One replacement in `Crewluv/Services/PushRoute.swift`:

In `Crewluv/Services/PushRoute.swift`, replace:

```swift
    nonisolated var backgroundFetchOutcome: BackgroundFetchOutcome {
        switch self {
        case .newStatus, .sharingEnded: .newData
        case .unchanged, .noStatusYet, .notConnected: .noData
        case .failed: .failed
        }
    }
```

with:

```swift
    nonisolated var backgroundFetchOutcome: BackgroundFetchOutcome {
        switch self {
        case .newStatus, .sharingEnded: .newData
        case .unchanged, .noStatusYet, .notConnected, .superseded: .noData
        case .failed: .failed
        }
    }
```

- [x] **Step 6: The screen waits for the next read**

One replacement in `Crewluv/Services/PartnerStatusReceiver.swift`:

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift
            lastSyncError = "share ended"
        case .failed(let message):
            showFailure(message)
        }
    }
```

with:

```swift
            lastSyncError = "share ended"
        case .failed(let message):
            showFailure(message)
        case .superseded:
            // The read that follows tells.
            break
        }
    }
```

- [x] **Step 7: The registration checks the key it sent**

One replacement in `Crewluv/Services/PushRegistrar.swift`:

In `Crewluv/Services/PushRegistrar.swift`, replace:

```swift
        } catch .refused(.sharingEnded) {
            isOwed = false
            record("Sharing ended")
            statusSource.endSharing()
        } catch .refused(let refusal) {
            isOwed = false
            record("Refused: \(refusal.rawValue)")
```

with:

```swift
        } catch .refused(.sharingEnded) {
            isOwed = false
            record("Sharing ended")
            // A refusal for a key this device has since replaced, say by switching, ends nothing.
            if (try? keys.deviceKey()) == key {
                statusSource.endSharing()
            }
        } catch .refused(let refusal) {
            isOwed = false
            record("Refused: \(refusal.rawValue)")
```

- [x] **Step 8: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 153 tests in 18 suites passed`.

- [x] **Step 9: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Models/PilotStatusUpdate.swift Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift Crewluv/Services/PilotStatusSource.swift Crewluv/Services/PartnerStatusReceiver.swift Crewluv/Services/PushRegistrar.swift Crewluv/Services/PushRoute.swift CrewluvTests/CrewluCloudDeviceTests.swift CrewluvTests/Helpers/PartnerCloudStandIns.swift CrewluvTests/PilotStatusSourceTests.swift CrewluvTests/PushRegistrarTests.swift CrewluvTests/PushRouteTests.swift && git -C ~/Dev/Crewluv commit -q -m "fix(crewluv): a refusal for a key this device has replaced ends nothing" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 8: The pilot last seen, and the note when sharing ends

**Files:**
- Modify: `Crewluv/Models/PartnerConnection.swift`, `Crewluv/Services/PilotStatusSource.swift`
- Test: `CrewluvTests/PilotStatusSourceTests.swift`

Spec §5.1, §7.6 and §14, left for 4b: each new status saves the pilot's id, and their name as this partner sees them, which joining compares (Task 11). When sharing ends, on Crewlu Cloud or iCloud, the welcome screen's note names that pilot (decision 8), and what the alerts kept of them goes (decision 9).

- [x] **Step 1: Write the failing tests**

One replacement in `CrewluvTests/PilotStatusSourceTests.swift`:

In `CrewluvTests/PilotStatusSourceTests.swift`, replace:

```swift
        #expect(keys.key == nil)
    }

    // MARK: - The 60-Second Check

    @Test func test_periodicCheck_readsAtEachTick_whileOnCrewluCloud() async throws {
```

with:

```swift
        #expect(keys.key == nil)
    }

    // MARK: - The Pilot Last Seen, and Sharing Ended

    @Test func test_eachNewStatus_savesThePilot_asThisPartnerSeesThem() async throws {
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary(["displayNameByPartner": [Make.partnerA: "Dad"]]))]
        _ = await connectedSource().refresh()

        #expect(defaults.string(forKey: "partnerCloud.pilotID") == "pilot")
        #expect(defaults.string(forKey: "partnerCloud.pilotName") == "Dad")
    }

    @Test func test_aPilotWithoutANickname_isSavedByFirstName() async throws {
        iCloud.results = [.success(try Make.iCloud(lastUpdated: 1))]
        _ = await makeSource().refresh()

        #expect(defaults.string(forKey: "partnerCloud.pilotName") == "Alex")
    }

    @Test func test_sharingEnded_onCrewluCloud_leavesTheNote_andForgetsThePilot() async throws {
        door.viewAnswers = [
            Make.answer(updatedAt: "t1", try Make.summary(["displayNameByPartner": [Make.partnerA: "Dad"]])),
            .failure(.refused(.sharingEnded)),
        ]
        let source = connectedSource()
        _ = await source.refresh()
        defaults.set(Date(timeIntervalSince1970: 1), forKey: "LastEvaluatedPilotStatusTimestamp")

        #expect(await source.refresh() == .sharingEnded)
        #expect(source.sharingEndedWith == "Dad")
        #expect(defaults.string(forKey: "partnerCloud.sharingEndedWith") == "Dad")
        #expect(defaults.string(forKey: "partnerCloud.pilotID") == nil)
        #expect(defaults.string(forKey: "partnerCloud.pilotName") == nil)
        #expect(defaults.object(forKey: "LastEvaluatedPilotStatusTimestamp") == nil)
    }

    @Test func test_sharingEnded_toldByThePushRegistration_leavesTheNote() async throws {
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary())]
        let source = connectedSource()
        _ = await source.refresh()

        source.endSharing()

        #expect(source.sharingEndedWith == "Alex")
    }

    @Test func test_sharingEnded_onICloud_leavesTheNote() async throws {
        iCloud.results = [.success(try Make.iCloud(lastUpdated: 1, displayName: "Dad")), .failure(ICloudFetchError.shareGone)]
        let source = makeSource()
        _ = await source.refresh()

        #expect(await source.refresh() == .sharingEnded)
        #expect(source.sharingEndedWith == "Dad")
    }

    @Test func test_sharingEnded_beforeAnyStatus_leavesNoNote() async {
        door.viewAnswers = [.failure(.refused(.sharingEnded))]
        let source = connectedSource()

        #expect(await source.refresh() == .sharingEnded)
        #expect(source.sharingEndedWith == nil)
    }

    @Test func test_theNote_staysAfterARelaunch_untilTheNextStatus() async throws {
        defaults.set("Dad", forKey: "partnerCloud.sharingEndedWith")
        iCloud.results = [.success(try Make.iCloud(lastUpdated: 1))]
        let source = makeSource()
        #expect(source.sharingEndedWith == "Dad")

        _ = await source.refresh()

        #expect(source.sharingEndedWith == nil)
        #expect(defaults.string(forKey: "partnerCloud.sharingEndedWith") == nil)
    }

    // MARK: - The 60-Second Check

    @Test func test_periodicCheck_readsAtEachTick_whileOnCrewluCloud() async throws {
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `value of type 'PartnerConnection' has no member 'pilotID'` or `value of type 'PilotStatusSource' has no member 'sharingEndedWith'`.

- [x] **Step 3: Keep the pilot with the connection**

2 replacements, in order, in `Crewluv/Models/PartnerConnection.swift`:

In `Crewluv/Models/PartnerConnection.swift`, replace:

```swift
import Foundation

/// How this device follows its pilot, as kept in its settings: through Crewlu Cloud once it has a
/// partner id there, and through iCloud otherwise, which decides by its own settings as before.
struct PartnerConnection {
    static let partnerIDKey = "partnerCloud.partnerID"

    let defaults: UserDefaults
```

with:

```swift
import Foundation

/// How this device follows its pilot, as kept in its settings: through Crewlu Cloud once it has a
/// partner id there, and through iCloud otherwise, which decides by its own settings as before. With
/// the pilot of the last status seen (spec §5.1).
struct PartnerConnection {
    static let partnerIDKey = "partnerCloud.partnerID"
    static let pilotIDKey = "partnerCloud.pilotID"
    static let pilotNameKey = "partnerCloud.pilotName"
    static let sharingEndedWithKey = "partnerCloud.sharingEndedWith"
    /// Where the alerts' title name is kept, as before.
    static let displayNameKey = "ResolvedPilotDisplayName"

    let defaults: UserDefaults
```

In `Crewluv/Models/PartnerConnection.swift`, replace:

```swift
        nonmutating set { defaults.set(newValue, forKey: Self.partnerIDKey) }
    }

    /// Whether an iCloud share was accepted, or Crewluve runs on the pilot's own iCloud.
    var hasICloudShare: Bool {
        defaults.string(forKey: "SharedZoneOwner") != nil || defaults.string(forKey: "PilotDataSource") == "privateDB"
```

with:

```swift
        nonmutating set { defaults.set(newValue, forKey: Self.partnerIDKey) }
    }

    /// The pilot of the last status seen, to tell whether a link is from another pilot (spec §7.2).
    var pilotID: String? {
        get { defaults.string(forKey: Self.pilotIDKey) }
        nonmutating set { defaults.set(newValue, forKey: Self.pilotIDKey) }
    }

    /// That pilot's name as this partner sees them: the nickname the pilot set, or their first name.
    var pilotName: String? {
        get { defaults.string(forKey: Self.pilotNameKey) }
        nonmutating set { defaults.set(newValue, forKey: Self.pilotNameKey) }
    }

    /// The pilot whose sharing with this device ended, for the welcome screen's note (spec §7.6).
    var sharingEndedWith: String? {
        get { defaults.string(forKey: Self.sharingEndedWithKey) }
        nonmutating set { defaults.set(newValue, forKey: Self.sharingEndedWithKey) }
    }

    /// The name the alerts' titles use: the nickname the pilot set for this partner, if any.
    var savedDisplayName: String? {
        get { defaults.string(forKey: Self.displayNameKey) }
        nonmutating set { defaults.set(newValue, forKey: Self.displayNameKey) }
    }

    /// Forgets the pilot: their id and name, and what the alerts keep of them, which is the title
    /// name, what they compare against and when they last looked, as today's iCloud reset does.
    func forgetPilot() {
        let keys = [Self.pilotIDKey, Self.pilotNameKey, Self.displayNameKey, "LastSeenPilotSnapshot", "LastEvaluatedPilotStatusTimestamp"]
        for key in keys {
            defaults.removeObject(forKey: key)
        }
    }

    /// Whether an iCloud share was accepted, or Crewluve runs on the pilot's own iCloud.
    var hasICloudShare: Bool {
        defaults.string(forKey: "SharedZoneOwner") != nil || defaults.string(forKey: "PilotDataSource") == "privateDB"
```

- [x] **Step 4: Save it with each status, and note sharing ended**

10 replacements, in order, in `Crewluv/Services/PilotStatusSource.swift`:

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift

    var isOnCrewluCloud: Bool { crewluCloudPartnerID != nil }

    /// The name the pilot set for this partner, for the screen's title: the reading's, or the saved
    /// one while an iCloud read can't look it up, as the alerts use.
    var displayName: String? {
        guard let reading else { return nil }
        return reading.isDisplayNameKnown ? reading.displayName : defaults.string(forKey: Self.displayNameKey)
    }

    @ObservationIgnored private let iCloud: ICloudStatusFetching
    @ObservationIgnored private let device: CrewluCloudDevice
    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let notifier: StatusNotifying
    @ObservationIgnored private let iCloudShareEnded: @MainActor () -> Void
    @ObservationIgnored private let periodicCheck: RepeatingRefresh
```

with:

```swift

    var isOnCrewluCloud: Bool { crewluCloudPartnerID != nil }

    /// The pilot whose sharing with this device ended, as this partner saw them, for the welcome
    /// screen's note (spec §7.6). It stays until the next status, and is nil when no pilot was seen.
    private(set) var sharingEndedWith: String?

    /// The name the pilot set for this partner, for the screen's title: the reading's, or the saved
    /// one while an iCloud read can't look it up, as the alerts use.
    var displayName: String? {
        guard let reading else { return nil }
        return reading.isDisplayNameKnown ? reading.displayName : connection.savedDisplayName
    }

    @ObservationIgnored private let iCloud: ICloudStatusFetching
    @ObservationIgnored private let device: CrewluCloudDevice
    @ObservationIgnored private let connection: PartnerConnection
    @ObservationIgnored private let notifier: StatusNotifying
    @ObservationIgnored private let iCloudShareEnded: @MainActor () -> Void
    @ObservationIgnored private let periodicCheck: RepeatingRefresh
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    @ObservationIgnored private let didConnect: @MainActor () -> Void
    @ObservationIgnored private let reads = ReadQueue<RefreshOutcome>()

    /// Where the alerts' title name is kept, as before.
    private static let displayNameKey = "ResolvedPilotDisplayName"
    /// What the alerts compare against. Sharing ending forgets it, as `resetShareData()` does.
    private static let snapshotKey = "LastSeenPilotSnapshot"
    private static let unreachable = "No connection to Crewlu Cloud"
    private static let keyUnreadable = "This device's key couldn't be read"
```

with:

```swift
    @ObservationIgnored private let didConnect: @MainActor () -> Void
    @ObservationIgnored private let reads = ReadQueue<RefreshOutcome>()

    private static let unreachable = "No connection to Crewlu Cloud"
    private static let keyUnreadable = "This device's key couldn't be read"
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        didConnect: @escaping @MainActor () -> Void = { Task { await PushRegistrar.shared.register() } }
    ) {
        self.iCloud = iCloud
        self.defaults = defaults
        self.notifier = notifier
        self.iCloudShareEnded = iCloudShareEnded
        self.periodicCheck = periodicCheck
        self.didConnect = didConnect
        device = CrewluCloudDevice(door: door, keys: keys, connection: PartnerConnection(defaults: defaults))
    }

    // MARK: - Refreshing
```

with:

```swift
        didConnect: @escaping @MainActor () -> Void = { Task { await PushRegistrar.shared.register() } }
    ) {
        self.iCloud = iCloud
        self.notifier = notifier
        self.iCloudShareEnded = iCloudShareEnded
        self.periodicCheck = periodicCheck
        self.didConnect = didConnect
        connection = PartnerConnection(defaults: defaults)
        device = CrewluCloudDevice(door: door, keys: keys, connection: connection)
        sharingEndedWith = connection.sharingEndedWith
    }

    // MARK: - Refreshing
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    /// forget the connection, and tell the screen.
    func endSharing() {
        device.forget()
        forgetPilot()
        report(PilotStatusUpdate(outcome: .sharingEnded, readAt: Date()))
    }
```

with:

```swift
    /// forget the connection, and tell the screen.
    func endSharing() {
        device.forget()
        noteSharingEnded()
        report(PilotStatusUpdate(outcome: .sharingEnded, readAt: Date()))
    }
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        reading = nil
    }

    /// Forgets the pilot's reading and what the alerts kept of them, as today's iCloud reset does
    /// (spec §7.6).
    private func forgetPilot() {
        reading = nil
        defaults.removeObject(forKey: Self.displayNameKey)
        defaults.removeObject(forKey: Self.snapshotKey)
    }

    // MARK: - The 60-Second Check
```

with:

```swift
        reading = nil
    }

    /// Sharing with this device ended: the welcome screen's note names the pilot last seen, if any,
    /// and the pilot is forgotten (spec §7.6).
    private func noteSharingEnded() {
        connection.sharingEndedWith = connection.pilotName
        sharingEndedWith = connection.pilotName
        reading = nil
        connection.forgetPilot()
    }

    // MARK: - The 60-Second Check
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
            reading = nil
            return .notConnected
        case .sharingEnded:
            forgetPilot()
            return .sharingEnded
        case .unavailable:
            return .failed(Self.unreachable)
```

with:

```swift
            reading = nil
            return .notConnected
        case .sharingEnded:
            noteSharingEnded()
            return .sharingEnded
        case .unavailable:
            return .failed(Self.unreachable)
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        } catch ICloudFetchError.notConnected {
            return .notConnected
        } catch ICloudFetchError.shareGone {
            reading = nil
            iCloudShareEnded()
            return .sharingEnded
        } catch {
```

with:

```swift
        } catch ICloudFetchError.notConnected {
            return .notConnected
        } catch ICloudFetchError.shareGone {
            noteSharingEnded()
            iCloudShareEnded()
            return .sharingEnded
        } catch {
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
              !current.isDisplayNameKnown || current.displayName != fetched.displayName
        else { return }
        let newReading = PilotReading.iCloud(fetched)
        _ = keepDisplayName(of: newReading)
        reading = newReading
    }
```

with:

```swift
              !current.isDisplayNameKnown || current.displayName != fetched.displayName
        else { return }
        let newReading = PilotReading.iCloud(fetched)
        rememberPilot(of: newReading, named: keepDisplayName(of: newReading))
        reading = newReading
    }
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    private func adopt(_ newReading: PilotReading) async -> RefreshOutcome {
        let previous = reading
        let name = keepDisplayName(of: newReading)
        PilotReading.logLegChanges(from: previous, to: newReading)
        reading = newReading
        await notifier.evaluate(newReading, titledWith: name)
```

with:

```swift
    private func adopt(_ newReading: PilotReading) async -> RefreshOutcome {
        let previous = reading
        let name = keepDisplayName(of: newReading)
        rememberPilot(of: newReading, named: name)
        PilotReading.logLegChanges(from: previous, to: newReading)
        reading = newReading
        await notifier.evaluate(newReading, titledWith: name)
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    /// When an iCloud read couldn't look the name up, the saved one stays.
    private func keepDisplayName(of reading: PilotReading) -> String? {
        guard reading.isDisplayNameKnown else {
            return defaults.string(forKey: Self.displayNameKey)
        }
        if let name = reading.displayName {
            defaults.set(name, forKey: Self.displayNameKey)
        } else {
            defaults.removeObject(forKey: Self.displayNameKey)
        }
        return reading.displayName
    }
}
```

with:

```swift
    /// When an iCloud read couldn't look the name up, the saved one stays.
    private func keepDisplayName(of reading: PilotReading) -> String? {
        guard reading.isDisplayNameKnown else {
            return connection.savedDisplayName
        }
        connection.savedDisplayName = reading.displayName
        return reading.displayName
    }

    /// Saves the reading's pilot, by the name the alerts use or else their first name (spec §5.1). A
    /// status means a connection, so a note that sharing ended goes.
    private func rememberPilot(of reading: PilotReading, named name: String?) {
        let status = reading.status(at: Date())
        connection.pilotID = status.pilotId
        connection.pilotName = name ?? status.pilotFirstName
        connection.sharingEndedWith = nil
        sharingEndedWith = nil
    }
}
```

- [x] **Step 5: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 160 tests in 18 suites passed`.

- [x] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Models/PartnerConnection.swift Crewluv/Services/PilotStatusSource.swift CrewluvTests/PilotStatusSourceTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): remember the pilot last seen, and note when sharing with them ended" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 9: The device joins, switches or cancels

**Files:**
- Modify: `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`
- Test: `CrewluvTests/CrewluCloudDeviceTests.swift`

Spec §7.2 steps 1–3 and its switching, with decision 1's pending key. A join sends this device's key, or else the pending key, saved before it's sent: the one a join that didn't finish kept, so trying again gets the same device. `key_in_use` gets a pending key and one more try. Switching makes the key that joined this device's key, moves the generation on, and lets the device it replaces leave, tried once. Cancelling lets the new device leave and forgets its key.

- [x] **Step 1: Write the failing tests**

One replacement in `CrewluvTests/CrewluCloudDeviceTests.swift`:

In `CrewluvTests/CrewluCloudDeviceTests.swift`, replace:

```swift
        return CrewluCloudDevice(door: door, keys: keys, connection: PartnerConnection(defaults: defaults))
    }

    // MARK: - Reads the Connection Changed Under

    @Test func test_sharingEnded_forAKeyReplacedMeanwhile_forgetsNothing() async {
```

with:

```swift
        return CrewluCloudDevice(door: door, keys: keys, connection: PartnerConnection(defaults: defaults))
    }

    private func device() -> CrewluCloudDevice {
        CrewluCloudDevice(door: door, keys: keys, connection: PartnerConnection(defaults: defaults))
    }

    private static let joinedB = PartnerJoinAnswer(deviceID: "device-b", partnerID: Make.partnerB)

    // MARK: - Joining

    @Test func test_join_withoutAKey_usesAPendingKey_savedFirst() async throws {
        door.joinAnswers = [.success(Self.joinedB)]

        let joined = try await device().join(.invite("invite"), label: "iPhone")

        let pending = try #require(keys.pending)
        #expect(door.joins.map(\.key) == [pending])
        #expect(door.joins.map(\.link) == [.invite("invite")])
        #expect(door.joins.map(\.label) == ["iPhone"])
        #expect(pending.count == 64)
        #expect(keys.key == nil)
        #expect(joined == CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: pending, isDeviceKey: false))
    }

    @Test func test_join_withThisDevicesKey() async throws {
        keys.key = Make.key
        door.joinAnswers = [.success(Self.joinedB)]

        let joined = try await device().join(.code("K7MQ2X"), label: "iPad")

        #expect(door.joins.map(\.key) == [Make.key])
        #expect(door.joins.map(\.link) == [.code("K7MQ2X")])
        #expect(joined == CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: Make.key, isDeviceKey: true))
        #expect(keys.pending == nil)
    }

    @Test func test_join_keyAnotherPersonsDeviceHas_triesAgainWithAPendingKey() async throws {
        keys.key = Make.key
        door.joinAnswers = [.failure(.refused(.keyInUse)), .success(Self.joinedB)]

        let joined = try await device().join(.invite("invite"), label: "iPhone")

        let pending = try #require(keys.pending)
        #expect(door.joins.map(\.key) == [Make.key, pending])
        #expect(joined == CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: pending, isDeviceKey: false))
        #expect(keys.key == Make.key)
    }

    @Test func test_join_reusesThePendingKeyAJoinThatDidntFinishKept() async throws {
        keys.key = Make.key
        keys.pending = "kept"
        door.joinAnswers = [.failure(.refused(.keyInUse)), .success(Self.joinedB)]

        _ = try await device().join(.invite("invite"), label: "iPhone")

        #expect(door.joins.map(\.key) == [Make.key, "kept"])
    }

    @Test func test_join_aPendingKeyAnotherPersonsDeviceHas_isReplaced() async throws {
        keys.pending = "kept"
        door.joinAnswers = [.failure(.refused(.keyInUse)), .success(Self.joinedB)]

        let joined = try await device().join(.invite("invite"), label: "iPhone")

        let pending = try #require(keys.pending)
        #expect(pending != "kept")
        #expect(door.joins.map(\.key) == ["kept", pending])
        #expect(joined.key == pending)
    }

    @Test func test_join_thatDoesntFinish_keepsThePendingKey() async {
        await #expect(throws: PartnerDoorError.unavailable) { try await self.device().join(.invite("invite"), label: "iPhone") }

        #expect(keys.pending != nil)
        #expect(door.joins.count == 1)
    }

    @Test func test_join_keyThatCantBeSaved_sendsNothing() async {
        keys.savesFail = true

        await #expect(throws: PartnerDoorError.unavailable) { try await self.device().join(.invite("invite"), label: "iPhone") }

        #expect(door.joins.isEmpty)
    }

    @Test func test_join_keychainThatCantBeRead_sendsNothing() async {
        keys.readFails = true

        await #expect(throws: PartnerDoorError.unavailable) { try await self.device().join(.invite("invite"), label: "iPhone") }

        #expect(door.joins.isEmpty)
    }

    @Test func test_join_passesOnTheDoorsRefusal_andKeepsTheKeys() async {
        keys.key = Make.key
        door.joinAnswers = [.failure(.refused(.sharingEnded))]

        await #expect(throws: PartnerDoorError.refused(.sharingEnded)) { try await self.device().join(.invite("invite"), label: "iPhone") }

        #expect(keys.key == Make.key)
    }

    @Test func test_view_readsWithTheKeyThatJoined_askingForEverything() async throws {
        door.viewAnswers = [Make.noSummaryYet]
        let device = connectedDevice()
        device.since = "t1"
        let joined = CrewluCloudDevice.Joined(partnerID: Make.partnerA, key: "pending", isDeviceKey: false)

        _ = try await device.view(joined)

        #expect(door.views.map(\.key) == ["pending"])
        #expect(door.views.map(\.since) == [nil])
    }

    // MARK: - Switching and Cancelling

    @Test func test_switch_makesThePendingKeyThisDevicesKey_andTheOldDeviceLeaves() async {
        let device = connectedDevice()
        device.since = "t1"
        keys.pending = "pending"

        let switched = await device.switchTo(CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: "pending", isDeviceKey: false))

        #expect(switched)
        #expect(keys.key == "pending")
        #expect(keys.pending == nil)
        #expect(device.partnerID == Make.partnerB)
        #expect(defaults.string(forKey: "partnerCloud.partnerID") == Make.partnerB)
        #expect(device.since == nil)
        #expect(door.leaves == [Make.key])
    }

    @Test func test_switch_withThisDevicesOwnKey_leavesNothing() async {
        keys.key = Make.key
        let device = device()

        _ = await device.switchTo(CrewluCloudDevice.Joined(partnerID: Make.partnerA, key: Make.key, isDeviceKey: true))

        #expect(device.partnerID == Make.partnerA)
        #expect(keys.key == Make.key)
        #expect(door.leaves.isEmpty)
    }

    @Test func test_switch_keyThatCantBeSaved_changesNothing() async {
        let device = connectedDevice()
        keys.pending = "pending"
        keys.savesFail = true

        let switched = await device.switchTo(CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: "pending", isDeviceKey: false))

        #expect(!switched)
        #expect(keys.key == Make.key)
        #expect(device.partnerID == Make.partnerA)
        #expect(door.leaves.isEmpty)
    }

    @Test func test_aReadThatASwitchOvertook_bringsNothingBack() async throws {
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary())]
        door.holdsViews = true
        let device = connectedDevice()

        let read = Task { await device.read() }
        await eventually { door.views.count == 1 }
        _ = await device.switchTo(CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: "pending", isDeviceKey: false))
        door.release()

        guard case .superseded = await read.value else {
            Issue.record("expected the read to bring nothing back")
            return
        }
    }

    @Test func test_cancel_leavesWithTheKeyThatJoined_andForgetsIt() async {
        let device = connectedDevice()
        keys.pending = "pending"

        await device.cancel(CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: "pending", isDeviceKey: false))

        #expect(door.leaves == ["pending"])
        #expect(keys.pending == nil)
        #expect(keys.key == Make.key)
        #expect(device.partnerID == Make.partnerA)
    }

    // MARK: - Reads the Connection Changed Under

    @Test func test_sharingEnded_forAKeyReplacedMeanwhile_forgetsNothing() async {
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `value of type 'CrewluCloudDevice' has no member 'join'` and `type 'CrewluCloudDevice' has no member 'Joined'`.

- [x] **Step 3: Join, switch and cancel**

2 replacements, in order, in `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`:

In `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`, replace:

```swift
import Observation

/// This device on Crewlu Cloud: the key it holds, the partner it's a device of, and what its reads
/// send back (partner links piece 4 spec §5.1–§5.3). The status source reads through it.
@Observable
final class CrewluCloudDevice {
    /// This device's partner id on Crewlu Cloud, or nil while it follows its pilot through iCloud.
```

with:

```swift
import Observation

/// This device on Crewlu Cloud: the key it holds, the partner it's a device of, and what its reads
/// send back (partner links piece 4 spec §5.1–§5.3). The status source reads through it, and joining
/// switches it (§7.2).
@Observable
final class CrewluCloudDevice {
    /// This device's partner id on Crewlu Cloud, or nil while it follows its pilot through iCloud.
```

In `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`, replace:

```swift
        return answer
    }

    /// Forgets this device's key and its connection.
    func forget() {
        generation += 1
```

with:

```swift
        return answer
    }

    // MARK: - Joining

    /// What a join used and got (spec §7.2 steps 1–2).
    struct Joined: Equatable {
        let partnerID: String
        /// The key the join sent: this device's own, or the pending one.
        let key: String
        let isDeviceKey: Bool
    }

    /// Joins with an invite or a code, as `label` in the pilot's list (spec §7.2 steps 1–2): with this
    /// device's key, or else the pending key, saved first, so this device's key changes only when it
    /// switches. A key another person's device has gets a pending key and one more try.
    func join(_ link: PartnerLink, label: String) async throws(PartnerDoorError) -> Joined {
        if let deviceKey = try readKey(keys.deviceKey) {
            do {
                return try await join(link, key: deviceKey, label: label, isDeviceKey: true)
            } catch .refused(.keyInUse) {
                return try await join(link, key: pendingKey(reusingKept: true), label: label, isDeviceKey: false)
            }
        }
        do {
            return try await join(link, key: pendingKey(reusingKept: true), label: label, isDeviceKey: false)
        } catch .refused(.keyInUse) {
            return try await join(link, key: pendingKey(reusingKept: false), label: label, isDeviceKey: false)
        }
    }

    /// partner_view with the key that joined, asking for everything, so the joiner can see whose
    /// status it is (spec §7.2 step 3).
    func view(_ joined: Joined) async throws(PartnerDoorError) -> PartnerViewAnswer {
        try await door.view(key: joined.key, since: nil)
    }

    /// Makes this device `joined`'s device (spec §7.2's switching): its key becomes this device's
    /// key, and the device it replaces leaves Crewlu Cloud, tried once. False when the key couldn't
    /// be saved, and then nothing changes.
    func switchTo(_ joined: Joined) async -> Bool {
        let replacedKey = try? keys.deviceKey()
        if !joined.isDeviceKey {
            guard keys.save(deviceKey: joined.key) else { return false }
            keys.forgetPendingKey()
        }
        generation += 1
        connection.partnerID = joined.partnerID
        partnerID = joined.partnerID
        since = nil
        if let replacedKey, replacedKey != joined.key {
            try? await door.leave(key: replacedKey)
        }
        return true
    }

    /// The partner chose not to switch: the device the join made leaves Crewlu Cloud, tried once, and
    /// its key is forgotten.
    func cancel(_ joined: Joined) async {
        try? await door.leave(key: joined.key)
        if joined.isDeviceKey {
            forget()
        } else {
            keys.forgetPendingKey()
        }
    }

    private func join(_ link: PartnerLink, key: String, label: String, isDeviceKey: Bool) async throws(PartnerDoorError) -> Joined {
        let answer: PartnerJoinAnswer
        switch link {
        case .invite(let invite):
            answer = try await door.join(invite: invite, key: key, label: label)
        case .code(let code):
            answer = try await door.redeem(code: code, key: key, label: label)
        }
        return Joined(partnerID: answer.partnerID, key: key, isDeviceKey: isDeviceKey)
    }

    /// The pending key: the one a join that didn't finish kept, when `reusingKept`, so trying again
    /// gets the same device, or else a new one, saved before it's sent (spec §5.3).
    private func pendingKey(reusingKept: Bool) throws(PartnerDoorError) -> String {
        if reusingKept, let kept = try readKey(keys.pendingKey) {
            return kept
        }
        guard let key = DeviceKey.make(), keys.save(pendingKey: key) else { throw .unavailable }
        return key
    }

    /// A key from the Keychain. One it can't read means the join can't go on.
    private func readKey(_ read: () throws(DeviceKeyUnreadable) -> String?) throws(PartnerDoorError) -> String? {
        do {
            return try read()
        } catch {
            throw .unavailable
        }
    }

    // MARK: - Forgetting

    /// Forgets this device's key and its connection.
    func forget() {
        generation += 1
```

- [x] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 175 tests in 18 suites passed`.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift CrewluvTests/CrewluCloudDeviceTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): this device joins with a link or code, switches to what it joined, or cancels" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 10: The source switches to what a join joined

**Files:**
- Modify: `Crewluv/Services/PilotStatusSource.swift`, `Crewluv/Services/CloudKitShareManager.swift`
- Test: `CrewluvTests/PilotStatusSourceTests.swift`

Spec §7.2's switching: the device switches (Task 9); for another pilot, what the alerts kept of the last one goes; an iCloud share is forgotten without showing the welcome screen (decision 10); the note goes; the push token is sent; and the new connection is read.

- [x] **Step 1: Write the failing tests**

3 replacements, in order, in `CrewluvTests/PilotStatusSourceTests.swift`:

In `CrewluvTests/PilotStatusSourceTests.swift`, replace:

```swift
    private let notifier = RecordingNotifier()
    private let iCloudResets = Counter()
    private let connects = Counter()
    private let clock = HandClock()

    init() throws {
```

with:

```swift
    private let notifier = RecordingNotifier()
    private let iCloudResets = Counter()
    private let connects = Counter()
    private let iCloudForgets = Counter()
    private let clock = HandClock()

    init() throws {
```

In `CrewluvTests/PilotStatusSourceTests.swift`, replace:

```swift
            notifier: notifier,
            iCloudShareEnded: { [iCloudResets] in iCloudResets.count += 1 },
            periodicCheck: RepeatingRefresh(sleep: clock.sleep),
            didConnect: { [connects] in connects.count += 1 }
        )
    }
```

with:

```swift
            notifier: notifier,
            iCloudShareEnded: { [iCloudResets] in iCloudResets.count += 1 },
            periodicCheck: RepeatingRefresh(sleep: clock.sleep),
            didConnect: { [connects] in connects.count += 1 },
            forgetICloudShare: { [iCloudForgets] in iCloudForgets.count += 1 }
        )
    }
```

In `CrewluvTests/PilotStatusSourceTests.swift`, replace:

```swift
        #expect(defaults.string(forKey: "partnerCloud.sharingEndedWith") == nil)
    }

    // MARK: - The 60-Second Check

    @Test func test_periodicCheck_readsAtEachTick_whileOnCrewluCloud() async throws {
```

with:

```swift
        #expect(defaults.string(forKey: "partnerCloud.sharingEndedWith") == nil)
    }

    // MARK: - Switching to What a Join Joined

    private static func joined(_ partnerID: String = Make.partnerA, key: String = "pending") -> CrewluCloudDevice.Joined {
        CrewluCloudDevice.Joined(partnerID: partnerID, key: key, isDeviceKey: false)
    }

    @Test func test_connect_fromNothing_readsTheNewConnection() async throws {
        keys.pending = "pending"
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary())]
        let source = makeSource()

        #expect(await source.connect(Self.joined(), keepingAlerts: false))

        #expect(source.crewluCloudPartnerID == Make.partnerA)
        #expect(keys.key == "pending")
        #expect(door.views.map(\.key) == ["pending"])
        #expect(source.lastUpdate?.outcome == .newStatus)
        #expect(connects.count == 1)
        #expect(iCloudForgets.count == 0)
    }

    @Test func test_connect_fromICloud_forgetsTheShareQuietly() async throws {
        defaults.set("_owner", forKey: "SharedZoneOwner")
        iCloud.results = [.success(try Make.iCloud(lastUpdated: 1))]
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary(lastUpdated: 1))]
        let source = makeSource()
        _ = await source.refresh()

        #expect(await source.connect(Self.joined(), keepingAlerts: true))

        #expect(iCloudForgets.count == 1)
        #expect(iCloudResets.count == 0)
        #expect(source.isOnCrewluCloud)
    }

    @Test func test_connect_toAnotherPilot_forgetsWhatTheAlertsKeptOfTheLastOne() async throws {
        defaults.set(Data([1]), forKey: "LastSeenPilotSnapshot")
        defaults.set(Date(timeIntervalSince1970: 1), forKey: "LastEvaluatedPilotStatusTimestamp")
        defaults.set("Dad", forKey: "ResolvedPilotDisplayName")
        let source = makeSource()

        _ = await source.connect(Self.joined(), keepingAlerts: false)

        #expect(defaults.data(forKey: "LastSeenPilotSnapshot") == nil)
        #expect(defaults.object(forKey: "LastEvaluatedPilotStatusTimestamp") == nil)
        #expect(defaults.string(forKey: "ResolvedPilotDisplayName") == nil)
    }

    @Test func test_connect_toTheSamePilot_keepsWhatTheAlertsKept() async {
        defaults.set(Data([1]), forKey: "LastSeenPilotSnapshot")
        let source = makeSource()

        _ = await source.connect(Self.joined(), keepingAlerts: true)

        #expect(defaults.data(forKey: "LastSeenPilotSnapshot") == Data([1]))
    }

    @Test func test_connect_takesTheNoteAway() async {
        defaults.set("Dad", forKey: "partnerCloud.sharingEndedWith")
        let source = makeSource()

        _ = await source.connect(Self.joined(), keepingAlerts: false)

        #expect(source.sharingEndedWith == nil)
        #expect(defaults.string(forKey: "partnerCloud.sharingEndedWith") == nil)
    }

    @Test func test_connect_keyThatCantBeSaved_changesNothing() async {
        keys.savesFail = true
        let source = makeSource()

        #expect(await !source.connect(Self.joined(), keepingAlerts: false))

        #expect(!source.isOnCrewluCloud)
        #expect(door.views.isEmpty)
        #expect(connects.count == 0)
    }

    // MARK: - The 60-Second Check

    @Test func test_periodicCheck_readsAtEachTick_whileOnCrewluCloud() async throws {
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `value of type 'PilotStatusSource' has no member 'connect'`, and an extra argument `forgetICloudShare` in the source's init.

- [x] **Step 3: Forget an iCloud share quietly**

One replacement in `Crewluv/Services/CloudKitShareManager.swift`:

In `Crewluv/Services/CloudKitShareManager.swift`, replace:

```swift
        }
    }

    /// Resets the share state to idle
    func resetShareState() {
        shareState = .idle
```

with:

```swift
        }
    }

    /// Forgets the share without posting `.shareDataReset`, so the welcome screen doesn't show:
    /// this device follows its pilot on Crewlu Cloud now (partner links piece 4 spec §7.2). The
    /// alerts' title name and snapshot stay, and the share itself is the pilot's to end.
    func forgetShareQuietly() {
        UserDefaults.standard.removeObject(forKey: zoneOwnerKey)
        UserDefaults.standard.removeObject(forKey: "PilotDataSource")
        shareState = .idle
        debugLog("[ShareManager] Forgot the share, now on Crewlu Cloud")

        Task.detached {
            await CloudKitSubscriptionManager.shared.removeAllSubscriptions()
        }
    }

    /// Resets the share state to idle
    func resetShareState() {
        shareState = .idle
```

- [x] **Step 4: Connect**

3 replacements, in order, in `Crewluv/Services/PilotStatusSource.swift`:

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    @ObservationIgnored private var screensInFront: [ObjectIdentifier: () -> Bool] = [:]
    /// Runs when this device connects to Crewlu Cloud, to send its push token (spec §6.1).
    @ObservationIgnored private let didConnect: @MainActor () -> Void
    @ObservationIgnored private let reads = ReadQueue<RefreshOutcome>()

    private static let unreachable = "No connection to Crewlu Cloud"
```

with:

```swift
    @ObservationIgnored private var screensInFront: [ObjectIdentifier: () -> Bool] = [:]
    /// Runs when this device connects to Crewlu Cloud, to send its push token (spec §6.1).
    @ObservationIgnored private let didConnect: @MainActor () -> Void
    /// Forgets the iCloud share without showing the welcome screen, once this device is on Crewlu
    /// Cloud instead (spec §7.2).
    @ObservationIgnored private let forgetICloudShare: @MainActor () -> Void
    @ObservationIgnored private let reads = ReadQueue<RefreshOutcome>()

    private static let unreachable = "No connection to Crewlu Cloud"
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        notifier: StatusNotifying = StatusChangeNotifier.shared,
        iCloudShareEnded: @escaping @MainActor () -> Void = { CloudKitShareManager.shared.resetShareData() },
        periodicCheck: RepeatingRefresh = RepeatingRefresh(),
        didConnect: @escaping @MainActor () -> Void = { Task { await PushRegistrar.shared.register() } }
    ) {
        self.iCloud = iCloud
        self.notifier = notifier
        self.iCloudShareEnded = iCloudShareEnded
        self.periodicCheck = periodicCheck
        self.didConnect = didConnect
        connection = PartnerConnection(defaults: defaults)
        device = CrewluCloudDevice(door: door, keys: keys, connection: connection)
        sharingEndedWith = connection.sharingEndedWith
```

with:

```swift
        notifier: StatusNotifying = StatusChangeNotifier.shared,
        iCloudShareEnded: @escaping @MainActor () -> Void = { CloudKitShareManager.shared.resetShareData() },
        periodicCheck: RepeatingRefresh = RepeatingRefresh(),
        didConnect: @escaping @MainActor () -> Void = { Task { await PushRegistrar.shared.register() } },
        forgetICloudShare: @escaping @MainActor () -> Void = { CloudKitShareManager.shared.forgetShareQuietly() }
    ) {
        self.iCloud = iCloud
        self.notifier = notifier
        self.iCloudShareEnded = iCloudShareEnded
        self.periodicCheck = periodicCheck
        self.didConnect = didConnect
        self.forgetICloudShare = forgetICloudShare
        connection = PartnerConnection(defaults: defaults)
        device = CrewluCloudDevice(door: door, keys: keys, connection: connection)
        sharingEndedWith = connection.sharingEndedWith
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        device.forget()
        noteSharingEnded()
        report(PilotStatusUpdate(outcome: .sharingEnded, readAt: Date()))
    }

    /// iCloud's share data was reset, by Reset Share Data or the share ending: an iCloud reading
```

with:

```swift
        device.forget()
        noteSharingEnded()
        report(PilotStatusUpdate(outcome: .sharingEnded, readAt: Date()))
    }

    /// Switches this device to what a join joined (spec §7.2): the joined key becomes its key, an
    /// iCloud share is forgotten without showing the welcome screen, the push token goes to Crewlu
    /// Cloud, and the new connection is read. For another pilot, what the alerts kept of the last one
    /// goes first. False when the key couldn't be saved, and then nothing changes.
    func connect(_ joined: CrewluCloudDevice.Joined, keepingAlerts: Bool) async -> Bool {
        guard await device.switchTo(joined) else { return false }
        if !keepingAlerts {
            connection.forgetPilot()
        }
        if connection.hasICloudShare {
            forgetICloudShare()
        }
        connection.sharingEndedWith = nil
        sharingEndedWith = nil
        reading = nil
        didConnect()
        _ = await refresh()
        return true
    }

    /// iCloud's share data was reset, by Reset Share Data or the share ending: an iCloud reading
```

- [x] **Step 5: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 181 tests in 18 suites passed`.

- [x] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PilotStatusSource.swift Crewluv/Services/CloudKitShareManager.swift CrewluvTests/PilotStatusSourceTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): switch to what a join joined" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 11: Joining with a link or a code

**Files:**
- Create: `Crewluv/Services/PartnerJoiner.swift`
- Modify: `Crewluv/Services/PilotStatusSource.swift`
- Test: `CrewluvTests/PartnerJoinerTests.swift`

Spec §7.2's whole flow and table, and §7.3: the key and the call (Task 9), the read, then the same device, the same pilot, another pilot ("Switch to Sam?"), or no status yet. The joiner holds what the screen shows meanwhile: whether it's connecting, the question, and the message. The source's `device` becomes visible to it.

- [x] **Step 1: Write the failing tests**

File: `CrewluvTests/PartnerJoinerTests.swift`

```swift
//
//  PartnerJoinerTests.swift
//  CrewluvTests
//
//  Joining with an invite link or a code: every row of partner links piece 4 spec §7.2's table,
//  and §7.3's messages
//

import Foundation
import Testing
@testable import Crewluv

@MainActor
final class PartnerJoinerTests {
    private let defaultsName = "PartnerJoinerTests.\(UUID().uuidString)"
    private let defaults: UserDefaults
    private let door = StandInPartnerDoor()
    private let iCloud = StandInICloud()
    private let keys = InMemoryDeviceKeyStore()
    private let connects = Counter()
    private let iCloudForgets = Counter()

    init() throws {
        defaults = try #require(UserDefaults(suiteName: defaultsName))
    }

    deinit {
        defaults.removePersistentDomain(forName: defaultsName)
    }

    private func makeJoiner() -> (PartnerJoiner, PilotStatusSource) {
        let source = PilotStatusSource(
            iCloud: iCloud, door: door, keys: keys, defaults: defaults, notifier: RecordingNotifier(),
            iCloudShareEnded: {}, didConnect: { [connects] in connects.count += 1 },
            forgetICloudShare: { [iCloudForgets] in iCloudForgets.count += 1 }
        )
        return (PartnerJoiner(source: source, defaults: defaults, deviceModel: "iPhone"), source)
    }

    /// This device on Crewlu Cloud as partner A, following the pilot "pilot", whom it calls Dad.
    private func onCrewluCloud() {
        defaults.set(Make.partnerA, forKey: "partnerCloud.partnerID")
        keys.key = Make.key
        followsPilot()
    }

    /// This device on iCloud, following the pilot "pilot", whom it calls Dad.
    private func onICloud() {
        defaults.set("_owner", forKey: "SharedZoneOwner")
        followsPilot()
    }

    private func followsPilot() {
        defaults.set("pilot", forKey: "partnerCloud.pilotID")
        defaults.set("Dad", forKey: "partnerCloud.pilotName")
    }

    private static let joinedB = PartnerJoinAnswer(deviceID: "device-b", partnerID: Make.partnerB)

    private static func summaryFromSam() throws -> CloudSummary {
        try Make.summary(["pilotId": "sam", "pilotFirstName": "Sam"])
    }

    // MARK: - §7.2's Table

    @Test func test_notConnected_connects() async throws {
        door.joinAnswers = [.success(Self.joinedB)]
        door.viewAnswers = [
            Make.answer(updatedAt: "t1", try Make.summary(), partnerID: Make.partnerB),
            Make.answer(updatedAt: "t1", try Make.summary(), partnerID: Make.partnerB),
        ]
        let (joiner, source) = makeJoiner()

        #expect(await joiner.join(.invite("invite")))

        let key = try #require(door.joins.first?.key)
        #expect(source.crewluCloudPartnerID == Make.partnerB)
        #expect(keys.key == key)
        #expect(source.reading != nil)
        #expect(connects.count == 1)
        #expect(joiner.message == nil)
        #expect(!joiner.isConnecting)
    }

    @Test func test_onCrewluCloud_theSameDevice_changesNothing() async throws {
        onCrewluCloud()
        door.joinAnswers = [.success(PartnerJoinAnswer(deviceID: "device-a", partnerID: Make.partnerA))]
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary())]
        let (joiner, source) = makeJoiner()

        #expect(await joiner.join(.invite("invite")))

        #expect(door.joins.map(\.key) == [Make.key])
        #expect(door.views.map(\.key) == [Make.key])
        #expect(source.crewluCloudPartnerID == Make.partnerA)
        #expect(keys.key == Make.key)
        #expect(door.leaves.isEmpty)
        #expect(connects.count == 0)
    }

    @Test func test_onCrewluCloud_theSamePilot_switchesQuietly() async throws {
        onCrewluCloud()
        defaults.set(Data([1]), forKey: "LastSeenPilotSnapshot")
        door.joinAnswers = [.failure(.refused(.keyInUse)), .success(Self.joinedB)]
        door.viewAnswers = [
            Make.answer(updatedAt: "t1", try Make.summary(), partnerID: Make.partnerB),
            Make.answer(updatedAt: "t1", try Make.summary(), partnerID: Make.partnerB),
        ]
        let (joiner, source) = makeJoiner()

        #expect(await joiner.join(.invite("invite")))

        let pending = try #require(door.joins.last?.key)
        #expect(joiner.switchQuestion == nil)
        #expect(source.crewluCloudPartnerID == Make.partnerB)
        #expect(keys.key == pending)
        #expect(door.leaves == [Make.key])
        #expect(defaults.data(forKey: "LastSeenPilotSnapshot") == Data([1]))
    }

    @Test func test_onICloud_theSamePilot_switchesQuietly() async throws {
        onICloud()
        door.joinAnswers = [.success(Self.joinedB)]
        door.viewAnswers = [
            Make.answer(updatedAt: "t1", try Make.summary(), partnerID: Make.partnerB),
            Make.answer(updatedAt: "t1", try Make.summary(), partnerID: Make.partnerB),
        ]
        let (joiner, source) = makeJoiner()

        #expect(await joiner.join(.code("K7MQ2X")))

        #expect(joiner.switchQuestion == nil)
        #expect(source.isOnCrewluCloud)
        #expect(iCloudForgets.count == 1)
        #expect(door.joins.map(\.link) == [.code("K7MQ2X")])
    }

    @Test func test_anotherPilot_asks_andSwitchingSwitches() async throws {
        onCrewluCloud()
        defaults.set(Data([1]), forKey: "LastSeenPilotSnapshot")
        door.joinAnswers = [.failure(.refused(.keyInUse)), .success(Self.joinedB)]
        door.viewAnswers = [
            Make.answer(updatedAt: "t1", try Self.summaryFromSam(), partnerID: Make.partnerB),
            Make.answer(updatedAt: "t1", try Self.summaryFromSam(), partnerID: Make.partnerB),
        ]
        let (joiner, source) = makeJoiner()

        let join = Task { await joiner.join(.invite("invite")) }
        await eventually { joiner.switchQuestion != nil }
        #expect(joiner.switchQuestion == SwitchQuestion(newPilot: "Sam", currentPilot: "Dad", deviceModel: "iPhone"))
        joiner.answerSwitch(true)

        #expect(await join.value)
        #expect(joiner.switchQuestion == nil)
        #expect(source.crewluCloudPartnerID == Make.partnerB)
        #expect(door.leaves == [Make.key])
        #expect(defaults.data(forKey: "LastSeenPilotSnapshot") == nil)
        #expect(defaults.string(forKey: "partnerCloud.pilotID") == "sam")
    }

    @Test func test_anotherPilot_isAskedAbout_byTheNameThisPartnerWillSee() async throws {
        onCrewluCloud()
        door.joinAnswers = [.failure(.refused(.keyInUse)), .success(Self.joinedB)]
        door.viewAnswers = [Make.answer(
            updatedAt: "t1",
            try Make.summary(["pilotId": "sam", "pilotFirstName": "Sam", "displayNameByPartner": [Make.partnerB: "Captain Sam"]]),
            partnerID: Make.partnerB
        )]
        let (joiner, _) = makeJoiner()

        let join = Task { await joiner.join(.invite("invite")) }
        await eventually { joiner.switchQuestion != nil }
        #expect(joiner.switchQuestion?.newPilot == "Captain Sam")
        joiner.answerSwitch(false)
        #expect(await !join.value)
    }

    @Test func test_anotherPilot_cancelled_leavesWithTheNewKey_andForgetsIt() async throws {
        onCrewluCloud()
        door.joinAnswers = [.failure(.refused(.keyInUse)), .success(Self.joinedB)]
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Self.summaryFromSam(), partnerID: Make.partnerB)]
        let (joiner, source) = makeJoiner()

        let join = Task { await joiner.join(.invite("invite")) }
        await eventually { joiner.switchQuestion != nil }
        joiner.answerSwitch(false)

        #expect(await !join.value)
        let pending = try #require(door.joins.last?.key)
        #expect(door.leaves == [pending])
        #expect(keys.pending == nil)
        #expect(keys.key == Make.key)
        #expect(source.crewluCloudPartnerID == Make.partnerA)
        #expect(joiner.message == nil)
    }

    @Test func test_anotherPilot_onICloud_asksToo() async throws {
        onICloud()
        door.joinAnswers = [.success(Self.joinedB)]
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Self.summaryFromSam(), partnerID: Make.partnerB)]
        let (joiner, _) = makeJoiner()

        let join = Task { await joiner.join(.invite("invite")) }
        await eventually { joiner.switchQuestion != nil }
        joiner.answerSwitch(false)

        #expect(await !join.value)
        #expect(iCloudForgets.count == 0)
    }

    @Test func test_noStatusYet_switchesWithoutAsking() async throws {
        onCrewluCloud()
        door.joinAnswers = [.failure(.refused(.keyInUse)), .success(Self.joinedB)]
        door.viewAnswers = [
            .success(PartnerViewAnswer(partnerID: Make.partnerB, updatedAt: nil, content: .noSummaryYet)),
            .success(PartnerViewAnswer(partnerID: Make.partnerB, updatedAt: nil, content: .noSummaryYet)),
        ]
        let (joiner, source) = makeJoiner()

        #expect(await joiner.join(.invite("invite")))

        #expect(joiner.switchQuestion == nil)
        #expect(source.crewluCloudPartnerID == Make.partnerB)
    }

    // MARK: - §7.3's Messages

    @Test(arguments: [
        (PartnerDoorError.refused(.sharingEnded), PartnerLink.invite("invite"), JoinMessage.inviteNotWorking(stillConnectedTo: nil)),
        (.refused(.sharingEnded), .code("K7MQ2X"), .codeNotWorking),
        (.refused(.tooManyDevices), .invite("invite"), .tooManyDevices),
        (.refused(.tryLater), .code("K7MQ2X"), .tooManyTries),
        (.refused(.invalidInput), .invite("invite"), .notAnInviteLink),
        (.unavailable, .invite("invite"), .couldntConnect),
    ])
    func test_whatDidntConnect_isSaid(error: PartnerDoorError, link: PartnerLink, expected: JoinMessage) async {
        door.joinAnswers = [.failure(error)]
        let (joiner, source) = makeJoiner()

        #expect(await !joiner.join(link))

        #expect(joiner.message == expected)
        #expect(!source.isOnCrewluCloud)
    }

    @Test func test_aDeadInvite_whileFollowingAPilot_saysSo() async {
        onCrewluCloud()
        door.joinAnswers = [.failure(.refused(.sharingEnded))]
        let (joiner, source) = makeJoiner()

        #expect(await !joiner.join(.invite("invite")))

        #expect(joiner.message == .inviteNotWorking(stillConnectedTo: "Dad"))
        #expect(source.crewluCloudPartnerID == Make.partnerA)
        #expect(keys.key == Make.key)
    }

    @Test func test_aJoinThatDidntFinish_keepsTheKey_forTheNextTry() async {
        door.joinAnswers = [.success(Self.joinedB)]
        let (joiner, source) = makeJoiner()

        #expect(await !joiner.join(.invite("invite")))

        #expect(joiner.message == .couldntConnect)
        #expect(!source.isOnCrewluCloud)
        #expect(keys.pending == door.joins.first?.key)
    }

    // MARK: - While a Join Is Under Way

    @Test func test_isConnecting_whileAJoinWaits_andAnotherJoinIsIgnored() async throws {
        door.joinAnswers = [.success(Self.joinedB)]
        door.viewAnswers = [
            Make.answer(updatedAt: "t1", try Make.summary(), partnerID: Make.partnerB),
            Make.answer(updatedAt: "t1", try Make.summary(), partnerID: Make.partnerB),
        ]
        door.holdsViews = true
        let (joiner, _) = makeJoiner()

        let first = Task { await joiner.join(.invite("invite")) }
        await eventually { door.views.count == 1 }
        #expect(joiner.isConnecting)
        #expect(await !joiner.join(.invite("another")))
        door.holdsViews = false
        door.release()

        #expect(await first.value)
        #expect(door.joins.count == 1)
        #expect(!joiner.isConnecting)
    }

    @Test func test_theQuestion_readsAsTheMockupDoes() {
        let question = SwitchQuestion(newPilot: "Sam", currentPilot: "Alex", deviceModel: "iPad")

        #expect(question.title == "Switch to Sam?")
        #expect(question.message == "You'll stop seeing Alex's status on this iPad.")
    }
}
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `cannot find type 'PartnerJoiner' in scope`.

- [x] **Step 3: Let the joiner reach the device**

One replacement in `Crewluv/Services/PilotStatusSource.swift`:

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        return reading.isDisplayNameKnown ? reading.displayName : connection.savedDisplayName
    }

    @ObservationIgnored private let iCloud: ICloudStatusFetching
    @ObservationIgnored private let device: CrewluCloudDevice
    @ObservationIgnored private let connection: PartnerConnection
    @ObservationIgnored private let notifier: StatusNotifying
    @ObservationIgnored private let iCloudShareEnded: @MainActor () -> Void
```

with:

```swift
        return reading.isDisplayNameKnown ? reading.displayName : connection.savedDisplayName
    }

    /// This device on Crewlu Cloud, which joins through it (spec §7.2).
    @ObservationIgnored let device: CrewluCloudDevice
    @ObservationIgnored private let iCloud: ICloudStatusFetching
    @ObservationIgnored private let connection: PartnerConnection
    @ObservationIgnored private let notifier: StatusNotifying
    @ObservationIgnored private let iCloudShareEnded: @MainActor () -> Void
```

- [x] **Step 4: Write the joiner**

File: `Crewluv/Services/PartnerJoiner.swift`

```swift
//
//  PartnerJoiner.swift
//  CrewLuve
//
//  Joins Crewlu Cloud with an invite link or a code
//

import Foundation
import Observation
#if canImport(UIKit)
import UIKit
#endif

/// Whether to follow another pilot's link (partner links piece 4 spec §7.2): "Switch to Sam?" /
/// "You'll stop seeing Alex's status on this iPhone."
nonisolated struct SwitchQuestion: Equatable, Sendable {
    /// The pilot the link is from, as this partner will see them.
    let newPilot: String
    /// The pilot this device follows now.
    let currentPilot: String
    /// "iPhone" or "iPad".
    let deviceModel: String

    var title: String { "Switch to \(newPilot)?" }
    var message: String { "You'll stop seeing \(currentPilot)'s status on this \(deviceModel)." }
}

/// Joins Crewlu Cloud with an invite link or a code (spec §7.2), and holds what the screen shows
/// meanwhile: the Connecting overlay, the question when the link is from another pilot, and the
/// message when it didn't connect (§7.3).
@Observable
final class PartnerJoiner {
    /// Whether a join is under way, for the Connecting overlay.
    private(set) var isConnecting = false
    /// The question a join waits on, while the link is from another pilot.
    private(set) var switchQuestion: SwitchQuestion?
    /// What the partner is told about the last join, until they dismiss it.
    var message: JoinMessage?

    /// "iPhone" or "iPad": this device's name in the pilot's list.
    @ObservationIgnored let deviceModel: String
    @ObservationIgnored private let source: PilotStatusSource
    @ObservationIgnored private let connection: PartnerConnection
    @ObservationIgnored private var switchAnswer: CheckedContinuation<Bool, Never>?

    init(source: PilotStatusSource, defaults: UserDefaults = .standard, deviceModel: String) {
        self.source = source
        connection = PartnerConnection(defaults: defaults)
        self.deviceModel = deviceModel
    }

    /// Joins with `link`, unless a join is under way. True when this device follows the link's
    /// partner afterwards; false when it didn't connect, the partner chose not to switch, or another
    /// join was under way.
    @discardableResult
    func join(_ link: PartnerLink) async -> Bool {
        guard !isConnecting else { return false }
        isConnecting = true
        defer { isConnecting = false }
        switch await outcome(of: link) {
        case .connected:
            return true
        case .cancelled:
            return false
        case .failed(let failure):
            message = failure
            return false
        }
    }

    /// The partner's answer to `switchQuestion`.
    func answerSwitch(_ shouldSwitch: Bool) {
        switchQuestion = nil
        switchAnswer?.resume(returning: shouldSwitch)
        switchAnswer = nil
    }

    private enum Outcome {
        case connected
        case cancelled
        case failed(JoinMessage)
    }

    /// Spec §7.2: the key and the call, the read, then the table.
    private func outcome(of link: PartnerLink) async -> Outcome {
        let device = source.device
        let joined: CrewluCloudDevice.Joined
        do {
            joined = try await device.join(link, label: deviceModel)
        } catch {
            return .failed(JoinMessage(error, joining: link, stillConnectedTo: followedPilotName))
        }
        // This device already: nothing changes, though a read shows anything new.
        if joined.isDeviceKey, joined.partnerID == device.partnerID {
            _ = await source.refresh()
            return .connected
        }
        let answer: PartnerViewAnswer
        do {
            answer = try await device.view(joined)
        } catch {
            return .failed(.couldntConnect)
        }
        let newPilot = Self.pilot(in: answer)
        if let newPilot, let followedPilotID, newPilot.id != followedPilotID {
            let question = SwitchQuestion(
                newPilot: newPilot.name, currentPilot: followedPilotName ?? "your pilot", deviceModel: deviceModel
            )
            guard await ask(question) else {
                await device.cancel(joined)
                return .cancelled
            }
        }
        let isSamePilot = newPilot != nil && newPilot?.id == followedPilotID
        guard await source.connect(joined, keepingAlerts: isSamePilot) else {
            return .failed(.couldntConnect)
        }
        return .connected
    }

    private func ask(_ question: SwitchQuestion) async -> Bool {
        await withCheckedContinuation { continuation in
            switchAnswer = continuation
            switchQuestion = question
        }
    }

    private var isFollowingAPilot: Bool {
        source.isOnCrewluCloud || connection.hasICloudShare
    }

    /// The pilot this device follows, on Crewlu Cloud or iCloud, by id.
    private var followedPilotID: String? {
        isFollowingAPilot ? connection.pilotID : nil
    }

    /// The pilot this device follows, as this partner sees them.
    private var followedPilotName: String? {
        isFollowingAPilot ? connection.pilotName : nil
    }

    /// The pilot whose summary a read brought, as this partner sees them. Nil before the first
    /// summary, when the pilots can't be compared.
    private static func pilot(in answer: PartnerViewAnswer) -> (id: String, name: String)? {
        guard case .summary(let summary) = answer.content else { return nil }
        return (summary.pilotId, summary.displayName(for: answer.partnerID) ?? summary.pilotFirstName)
    }
}

#if canImport(UIKit)
extension PartnerJoiner {
    /// The app's joiner. It names this device by its model, since iOS doesn't give apps the
    /// device's own name.
    static let shared = PartnerJoiner(source: .shared, deviceModel: UIDevice.current.model)
}
#endif
```

- [x] **Step 5: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 195 tests in 19 suites passed`.

- [x] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PartnerJoiner.swift Crewluv/Services/PilotStatusSource.swift CrewluvTests/PartnerJoinerTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): join with an invite link or a code" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 12: Two pieces leave the status source

**Files:**
- Create: `Crewluv/Services/PeriodicCheck.swift`
- Modify: `Crewluv/Models/PartnerConnection.swift`, `Crewluv/Services/PilotStatusSource.swift`

Decision 6, to keep the source under 300 lines: the screens the 60-second check runs for move to `PeriodicCheck`, and remembering the pilot of a new reading to `PartnerConnection.remember(_:)`. Nothing changes in what they do, so the tests are the check.

- [x] **Step 1: Write the check's screens**

File: `Crewluv/Services/PeriodicCheck.swift`

```swift
//
//  PeriodicCheck.swift
//  CrewLuve
//
//  The 60-second check, while a screen is in front
//

import Foundation

/// The 60-second check's timer, which runs while any screen is in front (partner links piece 4
/// spec §5.5). iPad can show several screens, and a tick goes on only while one of them isn't
/// showing the demo.
final class PeriodicCheck {
    private let timer: RepeatingRefresh
    /// The screens in front, each with what says whether it shows the demo.
    private var screensInFront: [ObjectIdentifier: () -> Bool] = [:]

    init(timer: RepeatingRefresh = RepeatingRefresh()) {
        self.timer = timer
    }

    /// `screen` is in front: while any screen is, `tick` runs every 60 seconds whenever a screen in
    /// front isn't showing the demo. Every caller passes the same tick.
    func start(for screen: AnyObject, pausedWhile isPaused: @escaping () -> Bool, tick: @escaping () async -> Void) {
        screensInFront[ObjectIdentifier(screen)] = isPaused
        guard !timer.isRunning else { return }
        timer.start { [weak self] in
            guard let self, self.screensInFront.values.contains(where: { !$0() }) else { return }
            await tick()
        }
    }

    /// `screen` left the front. The timer stops once no screen is in front.
    func stop(for screen: AnyObject) {
        screensInFront[ObjectIdentifier(screen)] = nil
        if screensInFront.isEmpty {
            timer.stop()
        }
    }
}
```

- [x] **Step 2: Remember the pilot in the connection**

One replacement in `Crewluv/Models/PartnerConnection.swift`:

In `Crewluv/Models/PartnerConnection.swift`, replace:

```swift
        nonmutating set { defaults.set(newValue, forKey: Self.displayNameKey) }
    }

    /// Forgets the pilot: their id and name, and what the alerts keep of them, which is the title
    /// name, what they compare against and when they last looked, as today's iCloud reset does.
    func forgetPilot() {
```

with:

```swift
        nonmutating set { defaults.set(newValue, forKey: Self.displayNameKey) }
    }

    /// Remembers the pilot of a new reading (spec §5.1), and gives the name to title the alerts with:
    /// the nickname the pilot set for this partner, kept while an iCloud read can't look it up. A
    /// status means a connection, so a note that sharing ended goes.
    func remember(_ reading: PilotReading) -> String? {
        if reading.isDisplayNameKnown {
            savedDisplayName = reading.displayName
        }
        let name = savedDisplayName
        let status = reading.status(at: Date())
        pilotID = status.pilotId
        pilotName = name ?? status.pilotFirstName
        sharingEndedWith = nil
        return name
    }

    /// Forgets the pilot: their id and name, and what the alerts keep of them, which is the title
    /// name, what they compare against and when they last looked, as today's iCloud reset does.
    func forgetPilot() {
```

- [x] **Step 3: Use both from the source**

8 replacements, in order, in `Crewluv/Services/PilotStatusSource.swift`:

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
import Observation

/// The one place that reads the pilot's status, whoever asks: the screen, a push or the background
/// refresh (partner links piece 4 spec §5.1). It reads Crewlu Cloud, through `CrewluCloudDevice`,
/// once this device is connected there, and iCloud otherwise, as before. Each new status goes to
/// the alerts once, from here.
@Observable
final class PilotStatusSource {
    static let shared = PilotStatusSource()
```

with:

```swift
import Observation

/// The one place that reads the pilot's status, whoever asks: the screen, a push or the background
/// refresh (partner links piece 4 spec §5.1). It reads Crewlu Cloud through `device` once connected
/// there, and iCloud otherwise, as before. Each new status goes to the alerts once, from here.
@Observable
final class PilotStatusSource {
    static let shared = PilotStatusSource()
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    @ObservationIgnored private let connection: PartnerConnection
    @ObservationIgnored private let notifier: StatusNotifying
    @ObservationIgnored private let iCloudShareEnded: @MainActor () -> Void
    @ObservationIgnored private let periodicCheck: RepeatingRefresh
    /// The screens in front, each with what says whether it shows the demo. iPad can show several.
    @ObservationIgnored private var screensInFront: [ObjectIdentifier: () -> Bool] = [:]
    /// Runs when this device connects to Crewlu Cloud, to send its push token (spec §6.1).
    @ObservationIgnored private let didConnect: @MainActor () -> Void
    /// Forgets the iCloud share without showing the welcome screen, once this device is on Crewlu
    /// Cloud instead (spec §7.2).
    @ObservationIgnored private let forgetICloudShare: @MainActor () -> Void
    @ObservationIgnored private let reads = ReadQueue<RefreshOutcome>()
```

with:

```swift
    @ObservationIgnored private let connection: PartnerConnection
    @ObservationIgnored private let notifier: StatusNotifying
    @ObservationIgnored private let iCloudShareEnded: @MainActor () -> Void
    @ObservationIgnored private let periodicCheck: PeriodicCheck
    /// Runs when this device connects to Crewlu Cloud, to send its push token (spec §6.1).
    @ObservationIgnored private let didConnect: @MainActor () -> Void
    /// Forgets the iCloud share without showing the welcome screen (spec §7.2).
    @ObservationIgnored private let forgetICloudShare: @MainActor () -> Void
    @ObservationIgnored private let reads = ReadQueue<RefreshOutcome>()
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        self.iCloud = iCloud
        self.notifier = notifier
        self.iCloudShareEnded = iCloudShareEnded
        self.periodicCheck = periodicCheck
        self.didConnect = didConnect
        self.forgetICloudShare = forgetICloudShare
        connection = PartnerConnection(defaults: defaults)
```

with:

```swift
        self.iCloud = iCloud
        self.notifier = notifier
        self.iCloudShareEnded = iCloudShareEnded
        self.periodicCheck = PeriodicCheck(timer: periodicCheck)
        self.didConnect = didConnect
        self.forgetICloudShare = forgetICloudShare
        connection = PartnerConnection(defaults: defaults)
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        report(PilotStatusUpdate(outcome: .sharingEnded, readAt: Date()))
    }

    /// Switches this device to what a join joined (spec §7.2): the joined key becomes its key, an
    /// iCloud share is forgotten without showing the welcome screen, the push token goes to Crewlu
    /// Cloud, and the new connection is read. For another pilot, what the alerts kept of the last one
    /// goes first. False when the key couldn't be saved, and then nothing changes.
    func connect(_ joined: CrewluCloudDevice.Joined, keepingAlerts: Bool) async -> Bool {
        guard await device.switchTo(joined) else { return false }
        if !keepingAlerts {
```

with:

```swift
        report(PilotStatusUpdate(outcome: .sharingEnded, readAt: Date()))
    }

    /// Switches this device to what a join joined (spec §7.2): its key, an iCloud share forgotten
    /// quietly, the push token sent and the new connection read. For another pilot, what the alerts
    /// kept of the last goes first. False when the key couldn't be saved; then nothing changes.
    func connect(_ joined: CrewluCloudDevice.Joined, keepingAlerts: Bool) async -> Bool {
        guard await device.switchTo(joined) else { return false }
        if !keepingAlerts {
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    private func noteSharingEnded() {
        connection.sharingEndedWith = connection.pilotName
        sharingEndedWith = connection.pilotName
        reading = nil
        connection.forgetPilot()
    }
```

with:

```swift
    private func noteSharingEnded() {
        connection.sharingEndedWith = connection.pilotName
        sharingEndedWith = connection.pilotName
        forgetPilot()
    }

    private func forgetPilot() {
        reading = nil
        connection.forgetPilot()
    }
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    /// With nothing new, Crewlu Cloud answers "unchanged". Each tick asks again, so a device that
    /// connects or leaves mid-session needs no restart.
    func startPeriodicCheck(for screen: AnyObject, pausedWhile isPaused: @escaping () -> Bool) {
        screensInFront[ObjectIdentifier(screen)] = isPaused
        guard !periodicCheck.isRunning else { return }
        periodicCheck.start { [weak self] in
            guard let self, self.isOnCrewluCloud, self.screensInFront.values.contains(where: { !$0() }) else { return }
            _ = await self.refresh()
        }
    }

    /// `screen` left the front. The check stops once no screen is in front.
    func stopPeriodicCheck(for screen: AnyObject) {
        screensInFront[ObjectIdentifier(screen)] = nil
        if screensInFront.isEmpty {
            periodicCheck.stop()
        }
    }

    // MARK: - Reading
```

with:

```swift
    /// With nothing new, Crewlu Cloud answers "unchanged". Each tick asks again, so a device that
    /// connects or leaves mid-session needs no restart.
    func startPeriodicCheck(for screen: AnyObject, pausedWhile isPaused: @escaping () -> Bool) {
        periodicCheck.start(for: screen, pausedWhile: isPaused) { [weak self] in
            guard let self, self.isOnCrewluCloud else { return }
            _ = await self.refresh()
        }
    }

    /// `screen` left the front. The check stops once no screen is in front.
    func stopPeriodicCheck(for screen: AnyObject) {
        periodicCheck.stop(for: screen)
    }

    // MARK: - Reading
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
              !current.isDisplayNameKnown || current.displayName != fetched.displayName
        else { return }
        let newReading = PilotReading.iCloud(fetched)
        rememberPilot(of: newReading, named: keepDisplayName(of: newReading))
        reading = newReading
    }
```

with:

```swift
              !current.isDisplayNameKnown || current.displayName != fetched.displayName
        else { return }
        let newReading = PilotReading.iCloud(fetched)
        _ = connection.remember(newReading)
        sharingEndedWith = nil
        reading = newReading
    }
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    /// the read ends.
    private func adopt(_ newReading: PilotReading) async -> RefreshOutcome {
        let previous = reading
        let name = keepDisplayName(of: newReading)
        rememberPilot(of: newReading, named: name)
        PilotReading.logLegChanges(from: previous, to: newReading)
        reading = newReading
        await notifier.evaluate(newReading, titledWith: name)
        return .newStatus
    }

    /// Saves the reading's name for the alerts' titles, and gives the name to title them with now.
    /// When an iCloud read couldn't look the name up, the saved one stays.
    private func keepDisplayName(of reading: PilotReading) -> String? {
        guard reading.isDisplayNameKnown else {
            return connection.savedDisplayName
        }
        connection.savedDisplayName = reading.displayName
        return reading.displayName
    }

    /// Saves the reading's pilot, by the name the alerts use or else their first name (spec §5.1). A
    /// status means a connection, so a note that sharing ended goes.
    private func rememberPilot(of reading: PilotReading, named name: String?) {
        let status = reading.status(at: Date())
        connection.pilotID = status.pilotId
        connection.pilotName = name ?? status.pilotFirstName
        connection.sharingEndedWith = nil
        sharingEndedWith = nil
    }
}
```

with:

```swift
    /// the read ends.
    private func adopt(_ newReading: PilotReading) async -> RefreshOutcome {
        let previous = reading
        let name = connection.remember(newReading)
        sharingEndedWith = nil
        PilotReading.logLegChanges(from: previous, to: newReading)
        reading = newReading
        await notifier.evaluate(newReading, titledWith: name)
        return .newStatus
    }
}
```

- [x] **Step 4: Check the tests still pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 195 tests in 19 suites passed`.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PeriodicCheck.swift Crewluv/Models/PartnerConnection.swift Crewluv/Services/PilotStatusSource.swift && git -C ~/Dev/Crewluv commit -q -m "refactor(crewluv): the 60-second check's screens and remembering the pilot leave the status source" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 13: Disconnect

**Files:**
- Modify: `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`, `Crewluv/Services/PilotStatusSource.swift`
- Test: `CrewluvTests/PilotStatusSourceTests.swift`, `CrewluvTests/Helpers/PartnerCloudStandIns.swift`

Spec §7.5: `partner_leave` with this device's key, then the key, the connection and the pilot are forgotten, with no note, and the screen hears "not connected". When Crewlu Cloud can't be reached, the device stays connected. A join that switched this device while the door answered keeps its new connection (decision 4).

- [x] **Step 1: Write the failing tests**

The door's stand-in can hold a leave until the test lets it go, as it can a read.

3 replacements, in order, in `CrewluvTests/Helpers/PartnerCloudStandIns.swift`:

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift
    var leaveAnswers: [Result<Void, PartnerDoorError>] = []
    /// While true, each `view` waits for `release()`.
    var holdsViews = false
    /// Runs while `setPush` waits for its answer, as if something happened meanwhile.
    var whileSettingPush: (() -> Void)?
```

with:

```swift
    var leaveAnswers: [Result<Void, PartnerDoorError>] = []
    /// While true, each `view` waits for `release()`.
    var holdsViews = false
    /// While true, each `leave` waits for `release()`.
    var holdsLeaves = false
    /// Runs while `setPush` waits for its answer, as if something happened meanwhile.
    var whileSettingPush: (() -> Void)?
```

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift

    func leave(key: String) async throws(PartnerDoorError) {
        leaves.append(key)
        guard !leaveAnswers.isEmpty else { return }
        try leaveAnswers.removeFirst().get()
    }
```

with:

```swift

    func leave(key: String) async throws(PartnerDoorError) {
        leaves.append(key)
        if holdsLeaves {
            await withCheckedContinuation { held.append($0) }
        }
        guard !leaveAnswers.isEmpty else { return }
        try leaveAnswers.removeFirst().get()
    }
```

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift
        return try joinAnswers.removeFirst().get()
    }

    /// Lets every held `view` go on.
    func release() {
        held.forEach { $0.resume() }
        held.removeAll()
```

with:

```swift
        return try joinAnswers.removeFirst().get()
    }

    /// Lets every held call go on.
    func release() {
        held.forEach { $0.resume() }
        held.removeAll()
```

One replacement in `CrewluvTests/PilotStatusSourceTests.swift`:

In `CrewluvTests/PilotStatusSourceTests.swift`, replace:

```swift
        #expect(connects.count == 0)
    }

    // MARK: - The 60-Second Check

    @Test func test_periodicCheck_readsAtEachTick_whileOnCrewluCloud() async throws {
```

with:

```swift
        #expect(connects.count == 0)
    }

    // MARK: - Disconnect

    @Test func test_disconnect_leaves_thenForgetsTheKeyTheConnectionAndThePilot() async throws {
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary(["displayNameByPartner": [Make.partnerA: "Dad"]]))]
        let source = connectedSource()
        _ = await source.refresh()
        defaults.set(Data([1]), forKey: "LastSeenPilotSnapshot")

        #expect(await source.disconnect())

        #expect(door.leaves == [Make.key])
        #expect(keys.key == nil)
        #expect(!source.isOnCrewluCloud)
        #expect(source.reading == nil)
        #expect(defaults.string(forKey: "partnerCloud.pilotID") == nil)
        #expect(defaults.string(forKey: "ResolvedPilotDisplayName") == nil)
        #expect(defaults.data(forKey: "LastSeenPilotSnapshot") == nil)
        #expect(source.sharingEndedWith == nil)
        #expect(source.lastUpdate?.outcome == .notConnected)
    }

    @Test func test_disconnect_withoutAConnection_staysConnected() async throws {
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary())]
        door.leaveAnswers = [.failure(.unavailable)]
        let source = connectedSource()
        _ = await source.refresh()

        #expect(await !source.disconnect())

        #expect(keys.key == Make.key)
        #expect(source.isOnCrewluCloud)
        #expect(source.reading != nil)
        #expect(source.lastUpdate?.outcome == .newStatus)
    }

    @Test func test_disconnect_thatAJoinOvertook_keepsTheNewConnection() async throws {
        door.viewAnswers = [Make.answer(updatedAt: "t1", try Make.summary())]
        let source = connectedSource()
        _ = await source.refresh()
        door.holdsLeaves = true
        keys.pending = "pending"

        let disconnecting = Task { await source.disconnect() }
        await eventually { door.leaves.count == 1 }
        door.holdsLeaves = false
        let joined = CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: "pending", isDeviceKey: false)
        #expect(await source.connect(joined, keepingAlerts: false))
        door.release()

        #expect(await disconnecting.value)
        #expect(keys.key == "pending")
        #expect(source.crewluCloudPartnerID == Make.partnerB)
        #expect(source.lastUpdate?.outcome != .notConnected)
    }

    // MARK: - The 60-Second Check

    @Test func test_periodicCheck_readsAtEachTick_whileOnCrewluCloud() async throws {
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `value of type 'PilotStatusSource' has no member 'disconnect'`.

- [x] **Step 3: Leave, then forget**

One replacement in `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`:

In `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`, replace:

```swift
        }
    }

    // MARK: - Forgetting

    /// Forgets this device's key and its connection.
    func forget() {
```

with:

```swift
        }
    }

    // MARK: - Leaving and Forgetting

    /// Disconnect (spec §7.5): partner_leave with this device's key, then forgets the key and the
    /// connection. Throws when the door couldn't be reached, and then nothing changes. False when a
    /// join switched this device while the door answered: its new connection stays.
    func leave() async throws(PartnerDoorError) -> Bool {
        let generation = generation
        if let key = try? keys.deviceKey() {
            try await door.leave(key: key)
        }
        guard generation == self.generation else { return false }
        forget()
        return true
    }

    /// Forgets this device's key and its connection.
    func forget() {
```

One replacement in `Crewluv/Services/PilotStatusSource.swift`:

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        reading = nil
        didConnect()
        _ = await refresh()
        return true
    }
```

with:

```swift
        reading = nil
        didConnect()
        _ = await refresh()
        return true
    }

    /// Disconnect (spec §7.5): this device leaves, then forgets its key, the connection and the pilot,
    /// with no note. False when Crewlu Cloud couldn't be reached; then the device stays connected. A
    /// join that switched this device meanwhile keeps its new connection.
    func disconnect() async -> Bool {
        do {
            guard try await device.leave() else { return true }
        } catch {
            return false
        }
        forgetPilot()
        report(PilotStatusUpdate(outcome: .notConnected, readAt: Date()))
        return true
    }
```

- [x] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 198 tests in 19 suites passed`.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift Crewluv/Services/PilotStatusSource.swift CrewluvTests/PilotStatusSourceTests.swift CrewluvTests/Helpers/PartnerCloudStandIns.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): Disconnect" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 14: Use on Another Device's code

**Files:**
- Create: `Crewluv/Services/PartnerCloud/HandOffSession.swift`
- Modify: `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`
- Test: `CrewluvTests/HandOffSessionTests.swift`, `CrewluvTests/Helpers/PartnerCloudStandIns.swift`

Spec §7.5: `partner_handoff_create` with this device's key, as the sheet opens and at New Code. The session says what the sheet shows: making, the code, couldn't make one, or sharing ended, which also ends sharing (§7.6) and closes the sheet. A refusal for a key that a switch replaced meanwhile is only "couldn't make one" (decision 4).

- [x] **Step 1: Write the failing tests**

The door's stand-in can hold a code's request too.

2 replacements, in order, in `CrewluvTests/Helpers/PartnerCloudStandIns.swift`:

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift
    var holdsViews = false
    /// While true, each `leave` waits for `release()`.
    var holdsLeaves = false
    /// Runs while `setPush` waits for its answer, as if something happened meanwhile.
    var whileSettingPush: (() -> Void)?
```

with:

```swift
    var holdsViews = false
    /// While true, each `leave` waits for `release()`.
    var holdsLeaves = false
    /// While true, each `makeHandOffCode` waits for `release()`.
    var holdsHandOffs = false
    /// Runs while `setPush` waits for its answer, as if something happened meanwhile.
    var whileSettingPush: (() -> Void)?
```

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift

    func makeHandOffCode(key: String) async throws(PartnerDoorError) -> HandOffCode {
        handOffs.append(key)
        guard !handOffAnswers.isEmpty else { throw .unavailable }
        return try handOffAnswers.removeFirst().get()
    }
```

with:

```swift

    func makeHandOffCode(key: String) async throws(PartnerDoorError) -> HandOffCode {
        handOffs.append(key)
        if holdsHandOffs {
            await withCheckedContinuation { held.append($0) }
        }
        guard !handOffAnswers.isEmpty else { throw .unavailable }
        return try handOffAnswers.removeFirst().get()
    }
```

File: `CrewluvTests/HandOffSessionTests.swift`

```swift
//
//  HandOffSessionTests.swift
//  CrewluvTests
//
//  Use on Another Device: making a code, and what happens when it can't be made
//  (partner links piece 4 spec §7.5, §7.6)
//

import Foundation
import Testing
@testable import Crewluv

@MainActor
final class HandOffSessionTests {
    private let defaultsName = "HandOffSessionTests.\(UUID().uuidString)"
    private let defaults: UserDefaults
    private let door = StandInPartnerDoor()
    private let keys = InMemoryDeviceKeyStore()

    init() throws {
        defaults = try #require(UserDefaults(suiteName: defaultsName))
    }

    deinit {
        defaults.removePersistentDomain(forName: defaultsName)
    }

    /// A device on Crewlu Cloud as partner A, which saw the pilot as Dad.
    private func connectedSource() -> PilotStatusSource {
        defaults.set(Make.partnerA, forKey: "partnerCloud.partnerID")
        defaults.set("Dad", forKey: "partnerCloud.pilotName")
        keys.key = Make.key
        return PilotStatusSource(
            iCloud: StandInICloud(), door: door, keys: keys, defaults: defaults,
            notifier: RecordingNotifier(), iCloudShareEnded: {}
        )
    }

    private static let code = HandOffCode(code: "K7MQ2X", expiresAt: Date(timeIntervalSince1970: 1_792_419_308))

    @Test func test_makesACode_withThisDevicesKey() async {
        door.handOffAnswers = [.success(Self.code)]
        let session = HandOffSession(source: connectedSource())
        #expect(session.state == .making)

        await session.makeCode()

        #expect(session.state == .ready(Self.code))
        #expect(door.handOffs == [Make.key])
    }

    @Test func test_aNewCode_replacesTheLastOne() async {
        let newCode = HandOffCode(code: "ABC234", expiresAt: Date(timeIntervalSince1970: 1_792_419_908))
        door.handOffAnswers = [.success(Self.code), .success(newCode)]
        let session = HandOffSession(source: connectedSource())

        await session.makeCode()
        await session.makeCode()

        #expect(session.state == .ready(newCode))
        #expect(door.handOffs.count == 2)
    }

    @Test func test_withoutAConnection_saysSo_andStaysConnected() async {
        door.handOffAnswers = [.failure(.unavailable)]
        let source = connectedSource()
        let session = HandOffSession(source: source)

        await session.makeCode()

        #expect(session.state == .couldntMake)
        #expect(source.isOnCrewluCloud)
        #expect(keys.key == Make.key)
    }

    @Test func test_sharingEnded_endsSharing_andClosesTheSheet() async {
        door.handOffAnswers = [.failure(.refused(.sharingEnded))]
        let source = connectedSource()
        let session = HandOffSession(source: source)

        await session.makeCode()

        #expect(session.state == .sharingEnded)
        #expect(!source.isOnCrewluCloud)
        #expect(keys.key == nil)
        #expect(source.sharingEndedWith == "Dad")
        #expect(source.lastUpdate?.outcome == .sharingEnded)
    }

    @Test func test_sharingEnded_forAKeyReplacedMeanwhile_endsNothing() async {
        door.handOffAnswers = [.failure(.refused(.sharingEnded))]
        door.holdsHandOffs = true
        let source = connectedSource()
        keys.pending = "pending"
        let session = HandOffSession(source: source)

        let making = Task { await session.makeCode() }
        await eventually { door.handOffs.count == 1 }
        _ = await source.device.switchTo(CrewluCloudDevice.Joined(partnerID: Make.partnerB, key: "pending", isDeviceKey: false))
        door.release()
        await making.value

        #expect(session.state == .couldntMake)
        #expect(source.crewluCloudPartnerID == Make.partnerB)
        #expect(keys.key == "pending")
        #expect(source.sharingEndedWith == nil)
    }

    @Test func test_aNewCode_showsMaking_whileItWaits() async {
        door.handOffAnswers = [.success(Self.code), .success(Self.code)]
        let session = HandOffSession(source: connectedSource())
        await session.makeCode()
        door.holdsHandOffs = true

        let making = Task { await session.makeCode() }
        await eventually { door.handOffs.count == 2 }
        #expect(session.state == .making)
        door.release()
        await making.value

        #expect(session.state == .ready(Self.code))
    }

    @Test func test_withoutAKey_saysItCouldntMakeOne() async {
        let source = connectedSource()
        keys.key = nil
        let session = HandOffSession(source: source)

        await session.makeCode()

        #expect(session.state == .couldntMake)
        #expect(door.handOffs.isEmpty)
    }
}
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `cannot find 'HandOffSession' in scope`.

- [x] **Step 3: Make a code with this device's key**

One replacement in `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`:

In `Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`, replace:

```swift
        }
    }

    // MARK: - Leaving and Forgetting

    /// Disconnect (spec §7.5): partner_leave with this device's key, then forgets the key and the
```

with:

```swift
        }
    }

    /// partner_handoff_create with this device's key: a code for another of this partner's devices
    /// (spec §7.5). A refusal for a key this device has since let go of, say by switching, ends
    /// nothing: the code is unavailable.
    func makeHandOffCode() async throws(PartnerDoorError) -> HandOffCode {
        guard let key = try? keys.deviceKey() else { throw .unavailable }
        let generation = generation
        do {
            return try await door.makeHandOffCode(key: key)
        } catch .refused(.sharingEnded) where generation != self.generation {
            throw .unavailable
        }
    }

    // MARK: - Leaving and Forgetting

    /// Disconnect (spec §7.5): partner_leave with this device's key, then forgets the key and the
```

- [x] **Step 4: Write the session**

File: `Crewluv/Services/PartnerCloud/HandOffSession.swift`

```swift
//
//  HandOffSession.swift
//  CrewLuve
//
//  Use on Another Device: a code for another of this partner's devices
//

import Foundation
import Observation

/// Use on Another Device (partner links piece 4 spec §7.5): makes a code as the sheet opens, and
/// another when the partner asks for one.
@Observable
final class HandOffSession {
    enum State: Equatable {
        case making
        case ready(HandOffCode)
        /// "Couldn't make a code. Check your connection and try again."
        case couldntMake
        /// The pilot stopped sharing with this device, so the sheet closes (§7.6).
        case sharingEnded
    }

    private(set) var state: State = .making

    @ObservationIgnored private let source: PilotStatusSource

    init(source: PilotStatusSource = .shared) {
        self.source = source
    }

    /// Makes a code, which replaces any code this partner has open.
    func makeCode() async {
        state = .making
        do {
            state = .ready(try await source.device.makeHandOffCode())
        } catch .refused(.sharingEnded) {
            source.endSharing()
            state = .sharingEnded
        } catch {
            state = .couldntMake
        }
    }
}
```

- [x] **Step 5: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 205 tests in 20 suites passed`.

- [x] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PartnerCloud/HandOffSession.swift Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift CrewluvTests/HandOffSessionTests.swift CrewluvTests/Helpers/PartnerCloudStandIns.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): Use on Another Device makes a code" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 15: The nickname, when the pilot has no legs

**Files:**
- Create: `Crewluv/Models/SharedPilotStatus+Named.swift`
- Modify: `Crewluv/Services/PartnerStatusReceiver.swift`
- Test: `CrewluvTests/SharedPilotStatusNamedTests.swift`

Spec §14 left this as a follow-up, and decision 11 folds it in: with no legs, the screen's title showed the pilot's first name, not the nickname they set for this partner. `named(_:)` copies the status with only the name changed, and the screen's no-legs branch uses it, as the branch with legs already names it.

- [x] **Step 1: Write the failing test**

It checks every field against a status with every field set, so a field added later and not copied fails here.

File: `CrewluvTests/SharedPilotStatusNamedTests.swift`

```swift
//
//  SharedPilotStatusNamedTests.swift
//  CrewluvTests
//
//  The status under the name this partner calls the pilot
//

import Foundation
import Testing
@testable import Crewluv

@MainActor
struct SharedPilotStatusNamedTests {

    @Test func test_named_changesOnlyThePilotsName() {
        for status in [SharedPilotStatus.demo, Self.everyFieldSet] {
            let named = status.named("Dad")

            #expect(named.pilotFirstName == "Dad")
            let before = Mirror(reflecting: status).children.filter { $0.label != "pilotFirstName" }
            let after = Mirror(reflecting: named).children.filter { $0.label != "pilotFirstName" }
            #expect(before.map { $0.label } == after.map { $0.label })
            for (field, copy) in zip(before, after) {
                #expect(String(describing: field.value) == String(describing: copy.value), "\(field.label ?? "?")")
            }
        }
    }

    /// A status with every field set, so a copy that drops one shows.
    private static let everyFieldSet = SharedPilotStatus(
        pilotId: "pilot", pilotFirstName: "Alex", homeAirportCode: "SDF", baseAirportCode: "ONT",
        homeTimezone: "America/Kentucky/Louisville", displayStatus: .inFlight, isSleeping: true, isHome: true,
        isInFlight: true, isOnDuty: true, currentAirport: "ONT", currentCity: "Ontario, CA",
        currentTimezone: "America/Los_Angeles", localTimeAtPilot: "11:04 AM", currentLatitude: 34.05,
        currentLongitude: -117.6, currentFlightNumber: "5X 123", currentFlightDeparture: "ONT",
        currentFlightArrival: "SDF", currentFlightDepartureTime: Date(timeIntervalSince1970: 1),
        currentFlightArrivalTime: Date(timeIntervalSince1970: 2), currentFlightArrivalTimezone: "America/New_York",
        homeArrivalTime: Date(timeIntervalSince1970: 3), homeArrivalLabel: "Back Home In", homeArrivalCity: "Louisville",
        nextDepartureTime: Date(timeIntervalSince1970: 4), nextFlightNumber: "5X 456", nextFlightDestination: "ANC",
        nextDepartureLabel: "Leaves From", lastTripEndDate: Date(timeIntervalSince1970: 5), lastTripDurationDays: 4,
        currentTripId: "trip", tripDayNumber: 2, tripTotalDays: 4, upcomingCities: ["Anchorage"],
        tripLegsJSON: Data([1]), quickStatus: "Call Me", quickStatusIcon: "phone.fill",
        quickStatusExpiry: Date(timeIntervalSince1970: 6), flightDelayMinutes: 15, displayNameByPartnerJSON: Data([2]),
        lastUpdated: Date(timeIntervalSince1970: 7), appVersion: "3.0"
    )
}
```

- [x] **Step 2: Run it to see it fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `value of type 'SharedPilotStatus' has no member 'named'`.

- [x] **Step 3: Write the copy**

File: `Crewluv/Models/SharedPilotStatus+Named.swift`

```swift
//
//  SharedPilotStatus+Named.swift
//  CrewLuve
//
//  The status under the name this partner calls the pilot
//

import Foundation

extension SharedPilotStatus {
    /// The same status with the pilot called `name`, the nickname the pilot set for this partner,
    /// as the title and the cards show it.
    func named(_ name: String) -> SharedPilotStatus {
        SharedPilotStatus(
            pilotId: pilotId,
            pilotFirstName: name,
            homeAirportCode: homeAirportCode,
            baseAirportCode: baseAirportCode,
            homeTimezone: homeTimezone,
            displayStatus: displayStatus,
            isSleeping: isSleeping,
            isHome: isHome,
            isInFlight: isInFlight,
            isOnDuty: isOnDuty,
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
            upcomingCities: upcomingCities,
            tripLegsJSON: tripLegsJSON,
            quickStatus: quickStatus,
            quickStatusIcon: quickStatusIcon,
            quickStatusExpiry: quickStatusExpiry,
            flightDelayMinutes: flightDelayMinutes,
            displayNameByPartnerJSON: displayNameByPartnerJSON,
            lastUpdated: lastUpdated,
            appVersion: appVersion
        )
    }
}
```

- [x] **Step 4: Name the status with no legs**

One replacement in `Crewluv/Services/PartnerStatusReceiver.swift`:

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift

        guard raw.hasTripLegs else {
            debugLog("[Resolve] No trip legs, using raw status")
            pilotStatus = raw
            scheduleResolve(transition: nil, reading: reading, now: now)
            return
        }
```

with:

```swift

        guard raw.hasTripLegs else {
            debugLog("[Resolve] No trip legs, using raw status")
            pilotStatus = raw.named(displayName)
            scheduleResolve(transition: nil, reading: reading, now: now)
            return
        }
```

- [x] **Step 5: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 206 tests in 21 suites passed`.

- [x] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Models/SharedPilotStatus+Named.swift Crewluv/Services/PartnerStatusReceiver.swift CrewluvTests/SharedPilotStatusNamedTests.swift && git -C ~/Dev/Crewluv commit -q -m "fix(crewluv): the nickname shows in the title when the pilot has no legs" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 16: The sync line on Crewlu Cloud

**Files:**
- Create: `Crewluv/Models/SyncLineWording.swift`
- Modify: `Crewluv/Views/Status/SyncStatusBarView.swift`
- Test: `CrewluvTests/SyncLineWordingTests.swift`

Spec §7.7: on Crewlu Cloud, the sync line's VoiceOver label says "Last sync", and its errors never mention iCloud. The wording moves out of the view (decision 13), so the harness tests it. The view is checked by Task 23's build.

- [x] **Step 1: Write the failing tests**

File: `CrewluvTests/SyncLineWordingTests.swift`

```swift
//
//  SyncLineWordingTests.swift
//  CrewluvTests
//
//  The sync line's words, on iCloud as today and on Crewlu Cloud (partner links piece 4 spec §7.7)
//

import Foundation
import Testing
@testable import Crewluv

struct SyncLineWordingTests {

    @Test func test_theSyncRowsLabel() {
        #expect(SyncLineWording(isOnCrewluCloud: false).syncLabel == "iCloud sync")
        #expect(SyncLineWording(isOnCrewluCloud: true).syncLabel == "Last sync")
    }

    @Test(arguments: [
        ("The network connection was lost.", "Sync failed — check your connection"),
        ("Not Authenticated", "Sync failed — sign into iCloud"),
        ("The request timed out.", "Sync timed out — will retry"),
        ("Server rejected request", "Sync failed — will retry"),
    ])
    func test_onICloud_errorsReadAsToday(error: String, expected: String) {
        #expect(SyncLineWording(isOnCrewluCloud: false).error(error) == expected)
    }

    @Test(arguments: [
        ("No connection to Crewlu Cloud", "Sync failed — check your connection"),
        ("This device's key couldn't be read", "Sync failed — will retry"),
        ("Not Authenticated", "Sync failed — will retry"),
        ("The request timed out.", "Sync failed — will retry"),
    ])
    func test_onCrewluCloud_errorsNeverMentionICloud(error: String, expected: String) {
        #expect(SyncLineWording(isOnCrewluCloud: true).error(error) == expected)
    }
}
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `cannot find 'SyncLineWording' in scope`.

- [x] **Step 3: Write the wording**

File: `Crewluv/Models/SyncLineWording.swift`

```swift
//
//  SyncLineWording.swift
//  CrewLuve
//
//  The sync line's words, on iCloud and on Crewlu Cloud
//

import Foundation

/// The sync line's words (partner links piece 4 spec §7.7). On iCloud they read as before; on
/// Crewlu Cloud they never mention iCloud.
nonisolated struct SyncLineWording {
    let isOnCrewluCloud: Bool

    /// The VoiceOver label of the "Synced" row.
    var syncLabel: String {
        isOnCrewluCloud ? "Last sync" : "iCloud sync"
    }

    /// A sync error as the line shows it.
    func error(_ message: String) -> String {
        let lowercased = message.lowercased()
        if lowercased.contains("network") || lowercased.contains("connection") || lowercased.contains("internet") {
            return "Sync failed — check your connection"
        }
        if !isOnCrewluCloud, lowercased.contains("not authenticated") || lowercased.contains("authentication") {
            return "Sync failed — sign into iCloud"
        }
        if !isOnCrewluCloud, lowercased.contains("timeout") || lowercased.contains("timed out") {
            return "Sync timed out — will retry"
        }
        return "Sync failed — will retry"
    }
}
```

- [x] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 209 tests in 22 suites passed`.

- [x] **Step 5: Use it in the sync line**

4 replacements, in order, in `Crewluv/Views/Status/SyncStatusBarView.swift`:

In `Crewluv/Views/Status/SyncStatusBarView.swift`, replace:

```swift
    let pilotUpdatedAt: Date
    let lastSyncTime: Date?
    let lastSyncError: String?

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
```

with:

```swift
    let pilotUpdatedAt: Date
    let lastSyncTime: Date?
    let lastSyncError: String?
    /// On Crewlu Cloud, the line doesn't mention iCloud (partner links piece 4 spec §7.7).
    var isOnCrewluCloud = false

    private var wording: SyncLineWording {
        SyncLineWording(isOnCrewluCloud: isOnCrewluCloud)
    }

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
```

In `Crewluv/Views/Status/SyncStatusBarView.swift`, replace:

```swift
    @ViewBuilder
    private func content(at now: Date) -> some View {
        if let error = lastSyncError {
            Label(friendlyError(error), systemImage: "exclamationmark.triangle")
                .font(.caption)
                .foregroundStyle(.orange)
        } else {
```

with:

```swift
    @ViewBuilder
    private func content(at now: Date) -> some View {
        if let error = lastSyncError {
            Label(wording.error(error), systemImage: "exclamationmark.triangle")
                .font(.caption)
                .foregroundStyle(.orange)
        } else {
```

In `Crewluv/Views/Status/SyncStatusBarView.swift`, replace:

```swift
                        icon: "icloud.fill",
                        text: agoText("Synced", elapsed: syncElapsed),
                        elapsed: syncElapsed,
                        label: "iCloud sync"
                    )
                }
```

with:

```swift
                        icon: "icloud.fill",
                        text: agoText("Synced", elapsed: syncElapsed),
                        elapsed: syncElapsed,
                        label: wording.syncLabel
                    )
                }
```

In `Crewluv/Views/Status/SyncStatusBarView.swift`, replace:

```swift
        }
        return "\(prefix) \(text) ago"
    }

    // MARK: - Friendly Error

    private func friendlyError(_ error: String) -> String {
        let lowercased = error.lowercased()
        if lowercased.contains("network") || lowercased.contains("connection") || lowercased.contains("internet") {
            return "Sync failed — check your connection"
        }
        if lowercased.contains("not authenticated") || lowercased.contains("authentication") {
            return "Sync failed — sign into iCloud"
        }
        if lowercased.contains("timeout") || lowercased.contains("timed out") {
            return "Sync timed out — will retry"
        }
        return "Sync failed — will retry"
    }
}

// MARK: - Previews
```

with:

```swift
        }
        return "\(prefix) \(text) ago"
    }
}

// MARK: - Previews
```

- [x] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Models/SyncLineWording.swift Crewluv/Views/Status/SyncStatusBarView.swift CrewluvTests/SyncLineWordingTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): the sync line doesn't mention iCloud on Crewlu Cloud" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 17: The screen's model learns Crewlu Cloud

**Files:**
- Modify: `Crewluv/Services/PartnerStatusReceiver.swift`

Spec §7.6 and §7.7, for the views in Tasks 19–22: whether the screen waits for the pilot's first update, whether it's on Crewlu Cloud, the note's pilot, and Disconnect. When there's no status yet, or a read fails with nothing read, the screen stops showing the last pilot's status (decision 12). The harness compiles it; Task 23's build and the user's run (Task 25) check it with the views.

- [x] **Step 1: Add what the views ask**

5 replacements, in order, in `Crewluv/Services/PartnerStatusReceiver.swift`:

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift
    var lastSyncTime: Date? = nil
    var lastSyncError: String? = nil
    private(set) var isInDemoMode = false

    // MARK: - Data Source
```

with:

```swift
    var lastSyncTime: Date? = nil
    var lastSyncError: String? = nil
    private(set) var isInDemoMode = false
    /// Connected to Crewlu Cloud with no status yet: the loading screen waits for the pilot's first
    /// update (partner links piece 4 spec §7.7).
    private(set) var isWaitingForFirstUpdate = false

    /// Whether this device follows its pilot on Crewlu Cloud, for the screens' wording (spec §7.7).
    var isOnCrewluCloud: Bool { statusSource.isOnCrewluCloud }
    /// The pilot whose sharing with this device ended, for the welcome screen's note (spec §7.6).
    var sharingEndedWith: String? { statusSource.sharingEndedWith }

    // MARK: - Data Source
```

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift
    /// Shows how a read went, whoever asked for it.
    private func show(_ update: PilotStatusUpdate) {
        guard !isInDemoMode else { return }
        switch update.outcome {
        case .newStatus, .unchanged:
            showReading()
```

with:

```swift
    /// Shows how a read went, whoever asked for it.
    private func show(_ update: PilotStatusUpdate) {
        guard !isInDemoMode else { return }
        if update.outcome != .superseded {
            isWaitingForFirstUpdate = update.outcome == .noStatusYet
        }
        switch update.outcome {
        case .newStatus, .unchanged:
            showReading()
```

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift
            lastSyncError = nil
            debugLog("[StatusReceiver] Sync complete")
        case .noStatusYet:
            hasAcceptedShare = true
            lastSyncTime = update.readAt
            lastSyncError = nil
            errorMessage = "Waiting for your pilot's first update."
        case .notConnected:
            // Nothing to show: no share, and no Crewlu Cloud connection, or its key is gone.
            debugLog("[StatusReceiver] No stored zone owner - share not yet accepted")
```

with:

```swift
            lastSyncError = nil
            debugLog("[StatusReceiver] Sync complete")
        case .noStatusYet:
            transitionTask?.cancel()
            pilotStatus = nil
            hasAcceptedShare = true
            lastSyncTime = update.readAt
            lastSyncError = nil
            errorMessage = nil
        case .notConnected:
            // Nothing to show: no share, and no Crewlu Cloud connection, or its key is gone.
            debugLog("[StatusReceiver] No stored zone owner - share not yet accepted")
```

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift
    private func showFailure(_ message: String) {
        debugLog("[StatusReceiver] ❌ Error fetching status: \(message)")
        lastSyncError = message
        // Keep hasAcceptedShare true if we have a known data source
        if hasRecordedConnection {
            hasAcceptedShare = true
```

with:

```swift
    private func showFailure(_ message: String) {
        debugLog("[StatusReceiver] ❌ Error fetching status: \(message)")
        lastSyncError = message
        // A status the source no longer holds isn't the pilot's, say after switching pilots.
        if statusSource.reading == nil {
            transitionTask?.cancel()
            pilotStatus = nil
        }
        // Keep hasAcceptedShare true if we have a known data source
        if hasRecordedConnection {
            hasAcceptedShare = true
```

In `Crewluv/Services/PartnerStatusReceiver.swift`, replace:

```swift
            hasAcceptedShare = false
            errorMessage = "Please accept the share invitation from your pilot."
        }
    }

    // MARK: - Demo Mode
```

with:

```swift
            hasAcceptedShare = false
            errorMessage = "Please accept the share invitation from your pilot."
        }
    }

    /// Disconnect (spec §7.5). False when Crewlu Cloud couldn't be reached.
    func disconnect() async -> Bool {
        await statusSource.disconnect()
    }

    // MARK: - Demo Mode
```

- [x] **Step 2: Check it compiles**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 209 tests in 22 suites passed`.

- [x] **Step 3: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Services/PartnerStatusReceiver.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): the screen waits for a pilot's first update, and knows Crewlu Cloud" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 18: What an opened or pasted link is, and what the code boxes keep

**Files:**
- Create: `Crewluv/Models/OpenedLink.swift`
- Modify: `Crewluv/Models/PartnerLink.swift`, `Crewluv/Services/CloudKitShareManager.swift`
- Test: `CrewluvTests/OpenedLinkTests.swift`, `CrewluvTests/PartnerLinkTests.swift`

Spec §7.1 and §7.4: a link the app was given, or text pasted into the paste box, is Crewluve's own, an iCloud share link for today's handling, or neither. The code boxes keep letters and digits in capitals, at most six. `ShareURLResolver` becomes `nonisolated`, so the link check can use it off the main actor.

- [x] **Step 1: Write the failing tests**

File: `CrewluvTests/OpenedLinkTests.swift`

```swift
//
//  OpenedLinkTests.swift
//  CrewluvTests
//
//  Where a link or pasted text goes: the joiner, today's iCloud share handling, or nowhere
//  (partner links piece 4 spec §7.1, §7.4)
//

import Foundation
import Testing
@testable import Crewluv

struct OpenedLinkTests {
    private static let share = "https://www.icloud.com/share/0abcDEF#Pilot_Status"

    @Test func test_crewluvesOwnLink_goesToTheJoiner() throws {
        let url = try #require(URL(string: "https://crewluve.crewlu.net/join#c=K7MQ2X"))

        #expect(OpenedLink(url: url) == .partner(.code("K7MQ2X")))
    }

    @Test(arguments: [Self.share, "crewluv://accept-share?url=https%3A%2F%2Fwww.icloud.com%2Fshare%2F0abc"])
    func test_anICloudShareLink_goesToTodaysHandling(text: String) throws {
        let url = try #require(URL(string: text))

        #expect(OpenedLink(url: url) == .iCloudShare(url))
    }

    @Test func test_anyOtherLink_goesNowhere() throws {
        #expect(OpenedLink(url: try #require(URL(string: "https://example.com/join#t=abc"))) == .neither)
    }

    @Test func test_pastedText_aLinkOrACode() throws {
        #expect(OpenedLink(text: " https://crewluve.crewlu.net/join#t=abc ") == .partner(.invite("abc")))
        #expect(OpenedLink(text: "k7m-q2x") == .partner(.code("K7MQ2X")))
        #expect(OpenedLink(text: "\n\(Self.share)\n") == .iCloudShare(try #require(URL(string: Self.share))))
        #expect(OpenedLink(text: "hello") == .neither)
        #expect(OpenedLink(text: "") == .neither)
    }
}
```

One replacement in `CrewluvTests/PartnerLinkTests.swift`:

In `CrewluvTests/PartnerLinkTests.swift`, replace:

```swift
        #expect(PartnerLink(text: text) == nil)
    }

    // MARK: - Logs

    @Test func test_logs_showOnlyTheHostAndPath_ofAPartnerLink() throws {
```

with:

```swift
        #expect(PartnerLink(text: text) == nil)
    }

    // MARK: - The Code Boxes

    @Test(arguments: [
        ("k7m", "K7M"),
        ("k7m-q2x", "K7MQ2X"),
        ("K7M Q2X", "K7MQ2X"),
        ("K7MQ2X9", "K7MQ2X"),
        ("K7Mé!Q2", "K7MQ2"),
        ("", ""),
    ])
    func test_theCodeBoxes_keepLettersAndDigits_inCapitals_atMostSix(text: String, expected: String) {
        #expect(PartnerLink.codeBoxes(text) == expected)
    }

    // MARK: - Logs

    @Test func test_logs_showOnlyTheHostAndPath_ofAPartnerLink() throws {
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `cannot find 'OpenedLink' in scope` or `type 'PartnerLink' has no member 'codeBoxes'`.

- [x] **Step 3: Let the share link check run anywhere**

One replacement in `Crewluv/Services/CloudKitShareManager.swift`:

In `Crewluv/Services/CloudKitShareManager.swift`, replace:

```swift

/// Extracts a CKShare URL from either a `crewluv://accept-share?url=…` wrapper
/// or a direct `icloud.com/share` URL.
enum ShareURLResolver {
    /// Returns the inner CKShare URL if wrapped in `crewluv://accept-share`, otherwise returns the URL as-is.
    static func resolve(_ url: URL) -> URL {
        if url.scheme == "crewluv",
```

with:

```swift

/// Extracts a CKShare URL from either a `crewluv://accept-share?url=…` wrapper
/// or a direct `icloud.com/share` URL.
nonisolated enum ShareURLResolver {
    /// Returns the inner CKShare URL if wrapped in `crewluv://accept-share`, otherwise returns the URL as-is.
    static func resolve(_ url: URL) -> URL {
        if url.scheme == "crewluv",
```

- [x] **Step 4: Write the opened link, and the code boxes' rule**

File: `Crewluv/Models/OpenedLink.swift`

```swift
//
//  OpenedLink.swift
//  CrewLuve
//
//  What a link the app was given, or pasted text, is
//

import Foundation

/// What a link the app was given, or text pasted into the paste box, is (partner links piece 4
/// spec §7.1, §7.4): one of Crewluve's own links or a code, which the joiner takes; an iCloud share
/// link, which today's share handling takes, since pilots on an older CrewLu still send them; or
/// neither.
nonisolated enum OpenedLink: Equatable, Sendable {
    case partner(PartnerLink)
    case iCloudShare(URL)
    case neither

    init(url: URL) {
        if let link = PartnerLink(url: url) {
            self = .partner(link)
        } else if ShareURLResolver.isShareURL(url) {
            self = .iCloudShare(url)
        } else {
            self = .neither
        }
    }

    init(text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if let link = PartnerLink(text: trimmed) {
            self = .partner(link)
        } else if let url = URL(string: trimmed) {
            self = OpenedLink(url: url)
        } else {
            self = .neither
        }
    }
}
```

One replacement in `Crewluv/Models/PartnerLink.swift`:

In `Crewluv/Models/PartnerLink.swift`, replace:

```swift
        return code
    }

    /// How logs show a link: one of Crewluve's own only by its host and path, since what follows the
    /// `#` is a secret (spec §9). Any other link as it is.
    static func logDescription(of url: URL) -> String {
```

with:

```swift
        return code
    }

    /// What the code boxes keep of their text (spec §7.4): letters and digits in capitals, at most six.
    static func codeBoxes(_ text: String) -> String {
        String(text.filter { $0.isASCII && ($0.isLetter || $0.isNumber) }.uppercased().prefix(6))
    }

    /// How logs show a link: one of Crewluve's own only by its host and path, since what follows the
    /// `#` is a secret (spec §9). Any other link as it is.
    static func logDescription(of url: URL) -> String {
```

- [x] **Step 5: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 214 tests in 23 suites passed`.

- [x] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Models/OpenedLink.swift Crewluv/Models/PartnerLink.swift Crewluv/Services/CloudKitShareManager.swift CrewluvTests/OpenedLinkTests.swift CrewluvTests/PartnerLinkTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): tell what an opened or pasted link is, and what the code boxes keep" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 19: The welcome screen

**Files:**
- Create: `Crewluv/Views/Welcome/WelcomeView.swift`, `Crewluv/Views/Welcome/CodeEntryView.swift`
- Modify: `Crewluv/Views/Welcome/ContentView.swift`

Spec §7.4, §7.6 and §7.7, and the approved mockup `crewluve_welcome_screen_revised`: the note when sharing ended, the heart and the title as today, the three steps reworded for links, the six code boxes, Try Demo, and the paste line with its paste box. `InstructionRow` moves here from `ContentView`. The code boxes are one text field drawn as six boxes: the sixth character joins, and a code that fails clears them. Task 22 puts the screen in place; until then nothing shows it. Views aren't in the harness, so Task 23's build checks them.

- [x] **Step 1: Write the code boxes**

File: `Crewluv/Views/Welcome/CodeEntryView.swift`

```swift
//
//  CodeEntryView.swift
//  CrewLuve
//
//  The six boxes for a code from another device
//

import SwiftUI

/// The code from another device (partner links piece 4 spec §7.4): one text field drawn as six
/// boxes. It takes letters and digits in any case and shows them in capitals. The sixth character
/// sends the code, and a pasted code fills the boxes. A code that fails clears them.
struct CodeEntryView: View {
    /// Joins with the code. False when it didn't connect.
    var onJoin: (PartnerLink) async -> Bool

    @State private var code = ""
    @State private var isJoining = false
    @FocusState private var isFocused: Bool

    var body: some View {
        ZStack {
            field
            boxes
        }
        .contentShape(.rect)
        .onTapGesture { isFocused = true }
    }

    /// The field takes the typing and pasting; the boxes show it.
    private var field: some View {
        TextField("", text: $code)
            .focused($isFocused)
            .textInputAutocapitalization(.characters)
            .autocorrectionDisabled()
            .keyboardType(.asciiCapable)
            .foregroundStyle(.clear)
            .tint(.clear)
            .disabled(isJoining)
            .accessibilityLabel("Code from another device")
            .onChange(of: code) { _, typed in
                let kept = PartnerLink.codeBoxes(typed)
                if kept != typed {
                    code = kept
                } else if kept.count == 6 {
                    join(kept)
                }
            }
    }

    private var boxes: some View {
        HStack(spacing: 8) {
            ForEach(0..<6, id: \.self) { index in
                box(at: index)
            }
        }
        .accessibilityHidden(true)
        .allowsHitTesting(false)
    }

    private func box(at index: Int) -> some View {
        let characters = Array(code)
        let isNext = isFocused && index == min(characters.count, 5)
        return Text(index < characters.count ? String(characters[index]) : " ")
            .font(.title2.monospaced().weight(.semibold))
            .frame(width: 40, height: 50)
            .glassEffect(.regular, in: .rect(cornerRadius: 10))
            .overlay {
                RoundedRectangle(cornerRadius: 10)
                    .strokeBorder(.tint, lineWidth: isNext ? 2 : 0)
            }
    }

    private func join(_ code: String) {
        isJoining = true
        Task {
            if await !onJoin(.code(code)) {
                self.code = ""
            }
            isJoining = false
        }
    }
}
```

- [x] **Step 2: Write the welcome screen**

File: `Crewluv/Views/Welcome/WelcomeView.swift`

```swift
//
//  WelcomeView.swift
//  CrewLuve
//
//  The welcome screen: how to connect, by link or by code
//

import SwiftUI

/// The welcome screen (partner links piece 4 spec §7.4): today's three steps reworded for links,
/// the code from another device, Try Demo, and a small paste line for a link that opened a web page
/// instead. After sharing ends, a note at the top says so (§7.6).
struct WelcomeView: View {
    /// The pilot whose sharing with this device ended, for the note at the top.
    var sharingEndedWith: String?
    var onTryDemo: () -> Void
    /// Joins with a code. False when it didn't connect, so the boxes clear.
    var onJoin: (PartnerLink) async -> Bool
    /// Takes what was pasted into the paste box.
    var onPaste: (String) -> Void

    @State private var showsPasteBox = false

    var body: some View {
        ScrollView {
            GlassEffectContainer(spacing: 20) {
                VStack(spacing: 32) {
                    if let sharingEndedWith {
                        SharingEndedNote(pilot: sharingEndedWith)
                    }
                    header
                    steps
                    code
                    tryDemo
                    pasteLine
                }
                .padding()
            }
        }
        .pasteLinkBox(isPresented: $showsPasteBox, onPaste: onPaste)
    }

    private var header: some View {
        VStack(spacing: 32) {
            Image(systemName: "heart.circle")
                .font(.system(size: 80))
                .foregroundStyle(.red.gradient)

            VStack(spacing: 12) {
                Text("Welcome to CrewLuve")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Stay connected with your pilot")
                    .font(.title3)
                    .foregroundColor(.secondary)
            }
        }
    }

    private var steps: some View {
        VStack(spacing: 16) {
            InstructionRow(number: "1", title: "Pilot Setup", description: "Your pilot needs the CrewLu app")
            InstructionRow(
                number: "2",
                title: "Invite Link",
                description: "Ask them to invite you from Settings → Partner Sharing. iMessage is best."
            )
            InstructionRow(
                number: "3",
                title: "Tap the Link",
                description: "Tap it on this \(UIDevice.current.model), and CrewLuve connects by itself"
            )
        }
        .padding(.horizontal, 32)
    }

    private var code: some View {
        VStack(spacing: 12) {
            Text("or type the code from CrewLuve on another device")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            CodeEntryView(onJoin: onJoin)
        }
        .padding(.horizontal, 32)
    }

    private var tryDemo: some View {
        Button(action: onTryDemo) {
            Label("Try Demo", systemImage: "play.circle")
                .font(.headline)
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.glass)
        .padding(.horizontal, 32)
    }

    private var pasteLine: some View {
        ViewThatFits {
            HStack(spacing: 4) {
                pasteQuestion
                pasteButton
            }
            VStack(spacing: 4) {
                pasteQuestion
                pasteButton
            }
        }
        .font(.footnote)
    }

    private var pasteQuestion: some View {
        Text("Link opened a web page instead?")
            .foregroundColor(.secondary)
    }

    private var pasteButton: some View {
        Button("Paste it here") { showsPasteBox = true }
    }
}

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
        }
        .font(.subheadline)
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .glassEffect(.regular, in: .capsule)
    }
}

// MARK: - Instruction Row

struct InstructionRow: View {
    let number: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            ZStack {
                Circle()
                    .fill(.blue)
                    .frame(width: 32, height: 32)

                Text(number)
                    .font(.headline)
                    .foregroundColor(.white)
            }
            .glassEffect(.regular, in: .circle)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding()
        .glassEffect(.regular, in: .rect(cornerRadius: 16))
    }
}

// MARK: - Paste Box

/// The paste box (spec §7.7), for a link that opened a web page instead of the app. It takes an
/// invite link, a code link or an iCloud share link.
private struct PasteLinkBox: ViewModifier {
    @Binding var isPresented: Bool
    let onPaste: (String) -> Void

    @State private var pasted = ""

    func body(content: Content) -> some View {
        content
            .alert("Paste Invite Link", isPresented: $isPresented) {
                TextField("Invite link", text: $pasted)
                Button("Cancel", role: .cancel) { pasted = "" }
                Button("Connect") {
                    onPaste(pasted)
                    pasted = ""
                }
            } message: {
                Text("Paste the invite link your pilot sent you.")
            }
    }
}

private extension View {
    func pasteLinkBox(isPresented: Binding<Bool>, onPaste: @escaping (String) -> Void) -> some View {
        modifier(PasteLinkBox(isPresented: isPresented, onPaste: onPaste))
    }
}
```

- [x] **Step 3: Move the instruction row**

One replacement in `Crewluv/Views/Welcome/ContentView.swift`:

In `Crewluv/Views/Welcome/ContentView.swift`, replace:

```swift
    }
}

// MARK: - Instruction Row

struct InstructionRow: View {
    let number: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            ZStack {
                Circle()
                    .fill(.blue)
                    .frame(width: 32, height: 32)
                
                Text(number)
                    .font(.headline)
                    .foregroundColor(.white)
            }
            .glassEffect(.regular, in: .circle)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding()
        .glassEffect(.regular, in: .rect(cornerRadius: 16))
    }
}

// MARK: - Share Accepting Overlay

struct ShareAcceptingOverlay: View {
```

with:

```swift
    }
}

// MARK: - Share Accepting Overlay

struct ShareAcceptingOverlay: View {
```

- [x] **Step 4: Check the rest still compiles**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 214 tests in 23 suites passed`.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Views/Welcome/WelcomeView.swift Crewluv/Views/Welcome/CodeEntryView.swift Crewluv/Views/Welcome/ContentView.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): the welcome screen for links and codes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 20: The ••• menu: Use on Another Device and Disconnect

**Files:**
- Create: `Crewluv/Models/DisconnectQuestion.swift`, `Crewluv/Views/Status/ConnectionMenu.swift`, `Crewluv/Views/Status/HandOffSheet.swift`
- Modify: `Crewluv/Views/Status/PilotStatusView.swift`, `Crewluv/Views/Welcome/ContentView.swift`
- Test: `CrewluvTests/DisconnectQuestionTests.swift`

Spec §7.5 and §7.7, and the approved mockup `crewluve_handoff_and_disconnect`: a ••• glass button in Paste Share Link's place, shown only on Crewlu Cloud and outside the demo. Use on Another Device opens the sheet with the code, its QR code and the countdown; at 0:00 they fade and New Code makes another. Disconnect asks first, and says so when it couldn't (decision 14). Paste Share Link leaves the row in every case.

- [x] **Step 1: Write the failing tests**

File: `CrewluvTests/DisconnectQuestionTests.swift`

```swift
//
//  DisconnectQuestionTests.swift
//  CrewluvTests
//
//  What Disconnect asks, and says when it can't (partner links piece 4 spec §7.5)
//

import Foundation
import Testing
@testable import Crewluv

struct DisconnectQuestionTests {

    @Test func test_theQuestion_readsAsTheMockupDoes() {
        let question = DisconnectQuestion(pilot: "Alex", deviceModel: "iPhone")

        #expect(question.title == "Disconnect from Alex?")
        #expect(question.message == "You'll stop seeing Alex's status on this iPhone. To connect again, tap the invite link Alex sent you.")
    }

    @Test func test_whenItCantDisconnect() {
        #expect(DisconnectQuestion.failureTitle == "Couldn't Disconnect")
        #expect(DisconnectQuestion.failureMessage == "Couldn't disconnect. Check your connection and try again.")
    }
}
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `cannot find 'DisconnectQuestion' in scope`.

- [x] **Step 3: Write the question**

File: `Crewluv/Models/DisconnectQuestion.swift`

```swift
//
//  DisconnectQuestion.swift
//  CrewLuve
//
//  What Disconnect asks, and says when it can't
//

import Foundation

/// What Disconnect asks before it leaves, and says when it can't (partner links piece 4 spec §7.5).
nonisolated struct DisconnectQuestion: Equatable, Sendable {
    /// The pilot this device follows, as this partner sees them.
    let pilot: String
    /// "iPhone" or "iPad".
    let deviceModel: String

    var title: String { "Disconnect from \(pilot)?" }
    var message: String {
        "You'll stop seeing \(pilot)'s status on this \(deviceModel). To connect again, tap the invite link \(pilot) sent you."
    }

    static let failureTitle = "Couldn't Disconnect"
    static let failureMessage = "Couldn't disconnect. Check your connection and try again."
}
```

- [x] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 216 tests in 24 suites passed`.

- [x] **Step 5: Write the menu and its alerts**

File: `Crewluv/Views/Status/ConnectionMenu.swift`

```swift
//
//  ConnectionMenu.swift
//  CrewLuve
//
//  The ••• menu: Use on Another Device and Disconnect
//

import SwiftUI

/// The ••• menu in the status screen's bottom row (partner links piece 4 spec §7.5), in Paste Share
/// Link's old place. It shows only on Crewlu Cloud, outside the demo.
struct ConnectionMenu: View {
    var onUseOnAnotherDevice: () -> Void
    var onDisconnect: () -> Void

    var body: some View {
        Menu {
            Button("Use on Another Device", systemImage: "qrcode", action: onUseOnAnotherDevice)
            Button("Disconnect", systemImage: "xmark.circle", role: .destructive, action: onDisconnect)
        } label: {
            Image(systemName: "ellipsis")
                .font(.caption)
        }
        .buttonStyle(.glass)
        .accessibilityLabel("More")
    }
}

// MARK: - Disconnect's Alerts

/// Disconnect's question, and what it says when it can't (spec §7.5).
struct DisconnectAlerts: ViewModifier {
    @Binding var question: DisconnectQuestion?
    /// Leaves Crewlu Cloud. False when it couldn't be reached.
    let onDisconnect: () async -> Bool

    @State private var showsFailure = false

    func body(content: Content) -> some View {
        content
            .alert(question?.title ?? "", isPresented: isAsking, presenting: question) { _ in
                Button("Disconnect", role: .destructive, action: disconnect)
                Button("Cancel", role: .cancel) {}
            } message: { question in
                Text(question.message)
            }
            .alert(DisconnectQuestion.failureTitle, isPresented: $showsFailure) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(DisconnectQuestion.failureMessage)
            }
    }

    private var isAsking: Binding<Bool> {
        Binding(get: { question != nil }, set: { if !$0 { question = nil } })
    }

    private func disconnect() {
        Task {
            if await !onDisconnect() {
                showsFailure = true
            }
        }
    }
}
```

- [x] **Step 6: Write the sheet**

File: `Crewluv/Views/Status/HandOffSheet.swift`

```swift
//
//  HandOffSheet.swift
//  CrewLuve
//
//  Use on Another Device: the code, its QR code and how long it lasts
//

import CoreImage.CIFilterBuiltins
import SwiftUI

/// Use on Another Device (partner links piece 4 spec §7.5): a code for another of this partner's
/// devices, made as the sheet opens. If the pilot has stopped sharing, the sheet closes (§7.6).
struct HandOffSheet: View {
    @State private var session = HandOffSession()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            content
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .navigationTitle("Use on Another Device")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { dismiss() }
                    }
                }
        }
        .task { await session.makeCode() }
        .onChange(of: session.state) { _, state in
            if state == .sharingEnded {
                dismiss()
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch session.state {
        case .making, .sharingEnded:
            ProgressView()
        case .ready(let code):
            HandOffCodeView(code: code, onNewCode: makeCode)
        case .couldntMake:
            couldntMake
        }
    }

    private var couldntMake: some View {
        VStack(spacing: 20) {
            Text("Couldn't make a code. Check your connection and try again.")
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("Try Again", action: makeCode)
                .buttonStyle(.glassProminent)
        }
    }

    private func makeCode() {
        Task { await session.makeCode() }
    }
}

// MARK: - The Code

/// The code in two groups of three, a QR code of its link, and how long it lasts. At 0:00 the code
/// and QR code fade, and New Code asks for another, which replaces it.
private struct HandOffCodeView: View {
    let code: HandOffCode
    let onNewCode: () -> Void

    /// Made once per code: the countdown redraws every second.
    private let qrCode: UIImage?

    init(code: HandOffCode, onNewCode: @escaping () -> Void) {
        self.code = code
        self.onNewCode = onNewCode
        qrCode = Self.qrCode(for: code.link)
    }

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let hasExpired = code.hasExpired(at: context.date)
            VStack(spacing: 20) {
                codeAndQRCode
                    .opacity(hasExpired ? 0.25 : 1)
                    .animation(.easeInOut, value: hasExpired)

                Text(code.countdown(at: context.date))
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(.secondary)

                Text("On your other iPhone or iPad, open CrewLuve and type this code, or scan the QR code with its camera.")
                    .font(.subheadline)
                    .multilineTextAlignment(.center)

                if hasExpired {
                    Button("New Code", action: onNewCode)
                        .buttonStyle(.glassProminent)
                }
            }
        }
    }

    private var codeAndQRCode: some View {
        VStack(spacing: 20) {
            Text(code.grouped)
                .font(.system(size: 40, weight: .semibold, design: .monospaced))
                .textSelection(.enabled)

            if let qrCode {
                Image(uiImage: qrCode)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 180, height: 180)
                    .accessibilityLabel("QR code for this code")
            }
        }
    }

    /// A QR code of `link`, made on the device with Core Image.
    private static func qrCode(for link: String) -> UIImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(link.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage,
              let image = CIContext().createCGImage(output, from: output.extent)
        else { return nil }
        return UIImage(cgImage: image)
    }
}
```

- [x] **Step 7: Put the menu in the bottom row**

3 replacements, in order, in `Crewluv/Views/Status/PilotStatusView.swift`:

In `Crewluv/Views/Status/PilotStatusView.swift`, replace:

```swift
    var isSyncing: Bool = false
    var isCompanionLayout: Bool = false
    var isInDemoMode: Bool = false
    var onExitDemo: (() -> Void)? = nil
    var onPasteShareLink: (() -> Void)? = nil
    var onRefresh: (() -> Void)? = nil

    @State private var showSchedule = false
```

with:

```swift
    var isSyncing: Bool = false
    var isCompanionLayout: Bool = false
    var isInDemoMode: Bool = false
    /// On Crewlu Cloud, the sync line doesn't mention iCloud (partner links piece 4 spec §7.7).
    var isOnCrewluCloud: Bool = false
    var onExitDemo: (() -> Void)? = nil
    /// The ••• menu, on Crewlu Cloud outside the demo (spec §7.5).
    var connectionMenu: ConnectionMenu? = nil
    var onRefresh: (() -> Void)? = nil

    @State private var showSchedule = false
```

In `Crewluv/Views/Status/PilotStatusView.swift`, replace:

```swift

                    // Sync explanation with action buttons
                    HStack {
                        if let onPasteShareLink {
                            Button(action: onPasteShareLink) {
                                Image(systemName: "link.badge.plus")
                                    .font(.caption)
                            }
                            .buttonStyle(.glass)
                        }

                        Spacer()
```

with:

```swift

                    // Sync explanation with action buttons
                    HStack {
                        if let connectionMenu {
                            connectionMenu
                        }

                        Spacer()
```

In `Crewluv/Views/Status/PilotStatusView.swift`, replace:

```swift
                            pilotName: status.pilotFirstName,
                            pilotUpdatedAt: status.lastUpdated,
                            lastSyncTime: lastSyncTime,
                            lastSyncError: lastSyncError
                        )
                        #if DEBUG
                        .onLongPressGesture { showDiagnostics = true }
```

with:

```swift
                            pilotName: status.pilotFirstName,
                            pilotUpdatedAt: status.lastUpdated,
                            lastSyncTime: lastSyncTime,
                            lastSyncError: lastSyncError,
                            isOnCrewluCloud: isOnCrewluCloud
                        )
                        #if DEBUG
                        .onLongPressGesture { showDiagnostics = true }
```

- [x] **Step 8: Give the status screen the menu and the sheet**

5 replacements, in order, in `Crewluv/Views/Welcome/ContentView.swift`:

In `Crewluv/Views/Welcome/ContentView.swift`, replace:

```swift
    @State private var statusReceiver: PartnerStatusReceiver?
    @State private var showShareError = false
    @State private var showPasteShareAlert = false
    @Environment(CloudKitShareManager.self) private var shareManager
    @Environment(\.scenePhase) private var scenePhase
```

with:

```swift
    @State private var statusReceiver: PartnerStatusReceiver?
    @State private var showShareError = false
    @State private var showPasteShareAlert = false
    @State private var showsHandOff = false
    @State private var disconnectQuestion: DisconnectQuestion?
    @Environment(CloudKitShareManager.self) private var shareManager
    @Environment(\.scenePhase) private var scenePhase
```

In `Crewluv/Views/Welcome/ContentView.swift`, replace:

```swift
                                lastSyncError: receiver.lastSyncError,
                                isSyncing: receiver.isSyncing,
                                isInDemoMode: receiver.isInDemoMode,
                                onExitDemo: { receiver.exitDemoMode() },
                                onPasteShareLink: { showPasteShareAlert = true },
                                onRefresh: { Task { await receiver.refresh() } }
                            )
                        }
```

with:

```swift
                                lastSyncError: receiver.lastSyncError,
                                isSyncing: receiver.isSyncing,
                                isInDemoMode: receiver.isInDemoMode,
                                isOnCrewluCloud: receiver.isOnCrewluCloud,
                                onExitDemo: { receiver.exitDemoMode() },
                                connectionMenu: connectionMenu(for: receiver),
                                onRefresh: { Task { await receiver.refresh() } }
                            )
                        }
```

In `Crewluv/Views/Welcome/ContentView.swift`, replace:

```swift
                }
            }
            .pasteShareLinkAlert(isPresented: $showPasteShareAlert)
        } else {
            LoadingView()
        }
```

with:

```swift
                }
            }
            .pasteShareLinkAlert(isPresented: $showPasteShareAlert)
            .sheet(isPresented: $showsHandOff) {
                HandOffSheet()
            }
            .modifier(DisconnectAlerts(question: $disconnectQuestion, onDisconnect: { await receiver.disconnect() }))
        } else {
            LoadingView()
        }
```

In `Crewluv/Views/Welcome/ContentView.swift`, replace:

```swift
                    isSyncing: receiver.isSyncing,
                    isCompanionLayout: true,
                    isInDemoMode: receiver.isInDemoMode,
                    onExitDemo: { receiver.exitDemoMode() },
                    onPasteShareLink: { showPasteShareAlert = true },
                    onRefresh: { Task { await receiver.refresh() } }
                )
                .frame(width: geometry.size.width * 0.4)
```

with:

```swift
                    isSyncing: receiver.isSyncing,
                    isCompanionLayout: true,
                    isInDemoMode: receiver.isInDemoMode,
                    isOnCrewluCloud: receiver.isOnCrewluCloud,
                    onExitDemo: { receiver.exitDemoMode() },
                    connectionMenu: connectionMenu(for: receiver),
                    onRefresh: { Task { await receiver.refresh() } }
                )
                .frame(width: geometry.size.width * 0.4)
```

In `Crewluv/Views/Welcome/ContentView.swift`, replace:

```swift
                    .frame(maxWidth: .infinity)
            }
        }
    }
}
```

with:

```swift
                    .frame(maxWidth: .infinity)
            }
        }
    }

    /// The ••• menu, on Crewlu Cloud outside the demo (partner links piece 4 spec §7.5).
    private func connectionMenu(for receiver: PartnerStatusReceiver) -> ConnectionMenu? {
        guard receiver.isOnCrewluCloud, !receiver.isInDemoMode else { return nil }
        return ConnectionMenu(
            onUseOnAnotherDevice: { showsHandOff = true },
            onDisconnect: {
                disconnectQuestion = DisconnectQuestion(
                    pilot: receiver.pilotStatus?.pilotFirstName ?? "your pilot", deviceModel: UIDevice.current.model
                )
            }
        )
    }
}
```

- [x] **Step 9: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Models/DisconnectQuestion.swift Crewluv/Views/Status/ConnectionMenu.swift Crewluv/Views/Status/HandOffSheet.swift Crewluv/Views/Status/PilotStatusView.swift Crewluv/Views/Welcome/ContentView.swift CrewluvTests/DisconnectQuestionTests.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): the ••• menu with Use on Another Device and Disconnect" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 21: Invite and code links open Crewluve

**Files:**
- Create: `Crewluv/App/LinkRouter.swift`
- Modify: `Crewluv/App/AppDelegate.swift`, `Crewluv/App/CrewluvApp.swift`, `Crewluv/Crewluv.entitlements`

Spec §7.1 and §9: the app claims `crewluve.crewlu.net`, and every way a link arrives (a tap, a universal link, a cold launch) goes through `LinkRouter` (decision 15): Crewluve's own links to the joiner, and iCloud share links to today's handling. Logs show Crewluve's links only by host and path. The entitlement file is plain text, and the app already has Associated Domains for iCloud's share links, so the build signs as before and nothing in Xcode needs clicking.

- [x] **Step 1: Write the router**

File: `Crewluv/App/LinkRouter.swift`

```swift
//
//  LinkRouter.swift
//  CrewLuve
//
//  Sends a link the app was given, or pasted text, where it goes
//

import Foundation

/// Sends a link the app was given, or text pasted into the paste box, where it goes (partner links
/// piece 4 spec §7.1): Crewluve's own links and codes to the joiner, and iCloud share links to
/// today's share handling.
enum LinkRouter {
    /// A link the app was given: a tap, a universal link or a cold launch. False when it's neither
    /// kind, and then nothing happens.
    @discardableResult
    static func open(_ url: URL) -> Bool {
        go(OpenedLink(url: url))
    }

    /// Text pasted into the paste box. Anything else gets "Not an Invite Link".
    static func paste(_ text: String) {
        if !go(OpenedLink(text: text)) {
            PartnerJoiner.shared.message = .notAnInviteLink
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
        }
    }
}
```

- [x] **Step 2: Claim the links**

One replacement in `Crewluv/Crewluv.entitlements`:

In `Crewluv/Crewluv.entitlements`, replace:

```xml
	<key>com.apple.developer.associated-domains</key>
	<array>
		<string>applinks:icloud-sharing.apple.com</string>
	</array>
</dict>
</plist>
```

with:

```xml
	<key>com.apple.developer.associated-domains</key>
	<array>
		<string>applinks:icloud-sharing.apple.com</string>
		<string>applinks:crewluve.crewlu.net</string>
	</array>
</dict>
</plist>
```

- [x] **Step 3: Route the app's links**

One replacement in `Crewluv/App/CrewluvApp.swift`:

In `Crewluv/App/CrewluvApp.swift`, replace:

```swift
            ContentView()
                .environment(shareManager)
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { userActivity in
                    debugLog("[CrewLuve] onContinueUserActivity: \(userActivity.webpageURL?.absoluteString ?? "nil")")
                    if let url = userActivity.webpageURL {
                        handleShareURL(url)
                    }
                }
                .onOpenURL { url in
                    debugLog("[CrewLuve] 🔗 onOpenURL triggered with: \(url)")
                    handleShareURL(url)
                }
        }
    }

    private func handleShareURL(_ url: URL) {
        debugLog("[CrewLuve] handleShareURL: \(url)")
        Task {
            do {
                try await shareManager.acceptShare(from: url)
            } catch {
                debugLog("[CrewLuve] ❌ Share acceptance failed: \(error)")
                // Error is already set in shareManager.shareState
            }
        }
    }
}
```

with:

```swift
            ContentView()
                .environment(shareManager)
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { userActivity in
                    guard let url = userActivity.webpageURL else { return }
                    debugLog("[CrewLuve] onContinueUserActivity: \(PartnerLink.logDescription(of: url))")
                    LinkRouter.open(url)
                }
                .onOpenURL { url in
                    debugLog("[CrewLuve] 🔗 onOpenURL triggered with: \(PartnerLink.logDescription(of: url))")
                    LinkRouter.open(url)
                }
        }
    }
}
```

- [x] **Step 4: Route the cold-launch links**

3 replacements, in order, in `Crewluv/App/AppDelegate.swift`:

In `Crewluv/App/AppDelegate.swift`, replace:

```swift
                await CloudKitShareManager.shared.acceptShare(with: metadata)
            }
        }
        // Path B: Share URL in urlContexts (crewluv:// or icloud.com/share)
        else if let shareCtx = options.urlContexts.first(where: { ShareURLResolver.isShareURL($0.url) }) {
            debugLog("[AppDelegate] Found share URL in urlContexts — accepting share: \(shareCtx.url)")
            Task { @MainActor in
                try? await CloudKitShareManager.shared.acceptShare(from: shareCtx.url)
            }
        }
        // Path C: Share URL in user activities
        else if let shareURL = options.userActivities.compactMap({ $0.webpageURL }).first(where: { ShareURLResolver.isShareURL($0) }) {
            debugLog("[AppDelegate] Found share URL in userActivities — accepting share: \(shareURL)")
            Task { @MainActor in
                try? await CloudKitShareManager.shared.acceptShare(from: shareURL)
            }
        }

        let config = UISceneConfiguration(
```

with:

```swift
                await CloudKitShareManager.shared.acceptShare(with: metadata)
            }
        }
        // Path B: an invite or code link, or a share URL (crewluv:// or icloud.com/share), in urlContexts
        else if let linkCtx = options.urlContexts.first(where: { OpenedLink(url: $0.url) != .neither }) {
            debugLog("[AppDelegate] Found a link in urlContexts: \(PartnerLink.logDescription(of: linkCtx.url))")
            LinkRouter.open(linkCtx.url)
        }
        // Path C: an invite or code link, or a share URL, in user activities
        else if let link = options.userActivities.compactMap({ $0.webpageURL }).first(where: { OpenedLink(url: $0) != .neither }) {
            debugLog("[AppDelegate] Found a link in userActivities: \(PartnerLink.logDescription(of: link))")
            LinkRouter.open(link)
        }

        let config = UISceneConfiguration(
```

In `Crewluv/App/AppDelegate.swift`, replace:

```swift
    @available(iOS, deprecated: 26.0)
    func application(_ app: UIApplication, open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        debugLog("[AppDelegate] application(_:open:) URL: \(url)")
        if ShareURLResolver.isShareURL(url) {
            Task { @MainActor in
                try? await CloudKitShareManager.shared.acceptShare(from: url)
            }
            return true
        }
        return false
    }

    // MARK: - User activity continuation fallback
```

with:

```swift
    @available(iOS, deprecated: 26.0)
    func application(_ app: UIApplication, open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        debugLog("[AppDelegate] application(_:open:) URL: \(PartnerLink.logDescription(of: url))")
        return LinkRouter.open(url)
    }

    // MARK: - User activity continuation fallback
```

In `Crewluv/App/AppDelegate.swift`, replace:

```swift
    func application(_ application: UIApplication, continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([any UIUserActivityRestoring]?) -> Void) -> Bool {
        debugLog("[AppDelegate] continue userActivity: \(userActivity.activityType)")
        if let url = userActivity.webpageURL, ShareURLResolver.isShareURL(url) {
            debugLog("[AppDelegate] Found share URL in userActivity continuation: \(url)")
            Task { @MainActor in
                try? await CloudKitShareManager.shared.acceptShare(from: url)
            }
            return true
        }
        return false
    }

    // MARK: - Warm-launch fallback
```

with:

```swift
    func application(_ application: UIApplication, continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([any UIUserActivityRestoring]?) -> Void) -> Bool {
        debugLog("[AppDelegate] continue userActivity: \(userActivity.activityType)")
        guard let url = userActivity.webpageURL else { return false }
        debugLog("[AppDelegate] Found a link in userActivity continuation: \(PartnerLink.logDescription(of: url))")
        return LinkRouter.open(url)
    }

    // MARK: - Warm-launch fallback
```

- [x] **Step 5: Check the rest still compiles**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 216 tests in 24 suites passed`. The harness takes only the notification names from `CrewluvApp.swift`.

- [x] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/App/LinkRouter.swift Crewluv/App/AppDelegate.swift Crewluv/App/CrewluvApp.swift Crewluv/Crewluv.entitlements && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): invite and code links open Crewluve" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 22: The welcome screen, Connecting and the join's alerts, in place

**Files:**
- Create: `Crewluv/Views/Welcome/JoinAlerts.swift`, `Crewluv/Views/Welcome/LoadingAndErrorViews.swift`
- Modify: `Crewluv/Views/Welcome/ContentView.swift`

Spec §7.2–§7.4, §7.7 and the approved storyboard `crewluve_connecting_states_storyboard`: `WelcomeView` replaces `NoShareView`; the Connecting overlay covers a join; the join's alerts and the switch question show; a link tapped in the demo leaves the demo first; and a connection with no status yet waits, scrollable so pull-to-refresh keeps looking. With no status read on Crewlu Cloud, the error screen says "Unable to Connect". `NoShareView`, `PasteShareLinkModifier` and `ShareAcceptingOverlay` go; the loading, error and progress views move to their own file, so `ContentView` stays under 300 lines.

- [x] **Step 1: Write the join's alerts**

File: `Crewluv/Views/Welcome/JoinAlerts.swift`

```swift
//
//  JoinAlerts.swift
//  CrewLuve
//
//  What joining asks, and says when a link or code didn't connect
//

import SwiftUI

/// What a join asks or says (partner links piece 4 spec §7.2, §7.3): "Switch to Sam?" when the link
/// is from another pilot, and the message when a link or code didn't connect.
struct JoinAlerts: ViewModifier {
    let joiner: PartnerJoiner

    func body(content: Content) -> some View {
        content
            .alert(joiner.switchQuestion?.title ?? "", isPresented: isAskingToSwitch, presenting: joiner.switchQuestion) { _ in
                Button("Switch") { joiner.answerSwitch(true) }
                    .keyboardShortcut(.defaultAction)
                Button("Cancel", role: .cancel) { joiner.answerSwitch(false) }
            } message: { question in
                Text(question.message)
            }
            .alert(joiner.message?.title ?? "", isPresented: isShowingMessage, presenting: joiner.message) { _ in
                Button("OK") { joiner.message = nil }
            } message: { message in
                Text(message.text)
            }
    }

    private var isAskingToSwitch: Binding<Bool> {
        Binding(
            get: { joiner.switchQuestion != nil },
            set: { isShown in
                if !isShown, joiner.switchQuestion != nil {
                    joiner.answerSwitch(false)
                }
            }
        )
    }

    private var isShowingMessage: Binding<Bool> {
        Binding(get: { joiner.message != nil }, set: { if !$0 { joiner.message = nil } })
    }
}
```

- [x] **Step 2: Move the loading, error and progress views**

File: `Crewluv/Views/Welcome/LoadingAndErrorViews.swift`

```swift
//
//  LoadingAndErrorViews.swift
//  CrewLuve
//
//  What shows instead of the status: loading, waiting, an error, or a moment's progress
//

import SwiftUI

// MARK: - Connection Error View

struct ConnectionErrorView: View {
    var receiver: PartnerStatusReceiver

    /// Peek at the receiver's error message to distinguish "share was revoked" from
    /// "iCloud unreachable." Keeps the view single-purpose without a separate component.
    private var isShareEnded: Bool {
        (receiver.errorMessage ?? "").lowercased().contains("sharing has ended")
    }

    /// On Crewlu Cloud the screen doesn't mention iCloud (partner links piece 4 spec §7.7).
    private var title: String {
        if isShareEnded {
            return "Sharing Ended"
        }
        return receiver.isOnCrewluCloud ? "Unable to Connect" : "Unable to Reach iCloud"
    }

    private var message: String {
        let checkConnection = "Check your connection and try again."
        return receiver.isOnCrewluCloud ? checkConnection : receiver.errorMessage ?? checkConnection
    }

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: receiver.isOnCrewluCloud ? "wifi.slash" : "icloud.slash")
                .font(.system(size: 60))
                .foregroundStyle(.orange.gradient)

            VStack(spacing: 8) {
                Text(title)
                    .font(.title2)
                    .fontWeight(.semibold)

                Text(message)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }

            Button(action: {
                Task { await receiver.refresh() }
            }) {
                Label("Try Again", systemImage: "arrow.clockwise")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.glassProminent)
            .disabled(receiver.isSyncing)
            .padding(.horizontal, 48)
        }
        .padding()
    }
}

// MARK: - Loading View

struct LoadingView: View {
    var text = "Loading pilot status..."

    var body: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
            Text(text)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Progress Overlay

/// A dimmed overlay with a spinner while something takes a moment: accepting an iCloud share, or
/// connecting with a link or code (partner links piece 4 spec §7.2).
struct ProgressOverlay: View {
    let title: String

    var body: some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                ProgressView()
                    .scaleEffect(1.5)
                    .tint(.white)

                Text(title)
                    .font(.headline)
                    .foregroundColor(.white)

                Text("This may take a moment")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))
            }
            .padding(40)
            .glassEffect(.regular, in: .rect(cornerRadius: 20))
        }
    }
}
```

- [x] **Step 3: Put it all in place**

6 replacements, in order, in `Crewluv/Views/Welcome/ContentView.swift`:

In `Crewluv/Views/Welcome/ContentView.swift`, replace:

```swift
struct ContentView: View {
    @State private var statusReceiver: PartnerStatusReceiver?
    @State private var showShareError = false
    @State private var showPasteShareAlert = false
    @State private var showsHandOff = false
    @State private var disconnectQuestion: DisconnectQuestion?
    @Environment(CloudKitShareManager.self) private var shareManager
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack {
            mainContent

            if shareManager.isAcceptingShare {
                ShareAcceptingOverlay()
            }
        }
        .onAppear {
```

with:

```swift
struct ContentView: View {
    @State private var statusReceiver: PartnerStatusReceiver?
    @State private var showShareError = false
    @State private var showsHandOff = false
    @State private var disconnectQuestion: DisconnectQuestion?
    @Environment(CloudKitShareManager.self) private var shareManager
    @Environment(\.scenePhase) private var scenePhase
    private let joiner = PartnerJoiner.shared

    var body: some View {
        ZStack {
            mainContent

            if shareManager.isAcceptingShare {
                ProgressOverlay(title: "Accepting Share Invitation...")
            }
            if joiner.isConnecting, joiner.switchQuestion == nil {
                ProgressOverlay(title: "Connecting...")
            }
        }
        .onAppear {
```

In `Crewluv/Views/Welcome/ContentView.swift`, replace:

```swift
        .onChange(of: shareManager.shareState) { _, newValue in
            if case .error = newValue {
                showShareError = true
            }
        }
    }
```

with:

```swift
        .onChange(of: shareManager.shareState) { _, newValue in
            if case .error = newValue {
                showShareError = true
            }
        }
        .modifier(JoinAlerts(joiner: joiner))
        .onChange(of: joiner.isConnecting) { _, isConnecting in
            // A link tapped in the demo leaves the demo first (partner links piece 4 spec §7.2).
            if isConnecting, statusReceiver?.isInDemoMode == true {
                statusReceiver?.exitDemoMode()
            }
        }
    }
```

In `Crewluv/Views/Welcome/ContentView.swift`, replace:

```swift
                                onRefresh: { Task { await receiver.refresh() } }
                            )
                        }
                    } else if receiver.hasAcceptedShare {
                        ConnectionErrorView(receiver: receiver)
                    } else {
                        NoShareView(onTryDemo: { receiver.enterDemoMode() })
                    }
                }
                .navigationBarTitleDisplayMode(.inline)
```

with:

```swift
                                onRefresh: { Task { await receiver.refresh() } }
                            )
                        }
                    } else if receiver.isWaitingForFirstUpdate {
                        // Scrollable, so pull-to-refresh keeps looking (partner links piece 4 spec §7.7).
                        ScrollView {
                            LoadingView(text: "Waiting for your pilot's first update...")
                                .containerRelativeFrame([.horizontal, .vertical])
                        }
                    } else if receiver.hasAcceptedShare {
                        ConnectionErrorView(receiver: receiver)
                    } else {
                        WelcomeView(
                            sharingEndedWith: receiver.sharingEndedWith,
                            onTryDemo: { receiver.enterDemoMode() },
                            onJoin: { await joiner.join($0) },
                            onPaste: { LinkRouter.paste($0) }
                        )
                    }
                }
                .navigationBarTitleDisplayMode(.inline)
```

In `Crewluv/Views/Welcome/ContentView.swift`, replace:

```swift
                    receiver.stopPeriodicCheck()
                }
            }
            .pasteShareLinkAlert(isPresented: $showPasteShareAlert)
            .sheet(isPresented: $showsHandOff) {
                HandOffSheet()
            }
```

with:

```swift
                    receiver.stopPeriodicCheck()
                }
            }
            .sheet(isPresented: $showsHandOff) {
                HandOffSheet()
            }
```

In `Crewluv/Views/Welcome/ContentView.swift`, replace:

```swift
                )
            }
        )
    }
}

// MARK: - Connection Error View

struct ConnectionErrorView: View {
    var receiver: PartnerStatusReceiver

    /// Peek at the receiver's error message to distinguish "share was revoked" from
    /// "iCloud unreachable." Keeps the view single-purpose without a separate component.
    private var isShareEnded: Bool {
        (receiver.errorMessage ?? "").lowercased().contains("sharing has ended")
    }

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "icloud.slash")
                .font(.system(size: 60))
                .foregroundStyle(.orange.gradient)

            VStack(spacing: 8) {
                Text(isShareEnded ? "Sharing Ended" : "Unable to Reach iCloud")
                    .font(.title2)
                    .fontWeight(.semibold)

                Text(receiver.errorMessage ?? "Check your connection and try again.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }

            Button(action: {
                Task { await receiver.refresh() }
            }) {
                Label("Try Again", systemImage: "arrow.clockwise")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.glassProminent)
            .disabled(receiver.isSyncing)
            .padding(.horizontal, 48)
        }
        .padding()
    }
}

// MARK: - Loading View

struct LoadingView: View {
    var body: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
            Text("Loading pilot status...")
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - No Share View

struct NoShareView: View {
    @State private var showPasteAlert = false
    var onTryDemo: (() -> Void)? = nil

    var body: some View {
        ScrollView {
            GlassEffectContainer(spacing: 20) {
                VStack(spacing: 32) {
                    Image(systemName: "heart.circle")
                        .font(.system(size: 80))
                        .foregroundStyle(.red.gradient)

                    VStack(spacing: 12) {
                        Text("Welcome to CrewLuve")
                            .font(.largeTitle)
                            .fontWeight(.bold)

                        Text("Stay connected with your pilot")
                            .font(.title3)
                            .foregroundColor(.secondary)
                    }

                    VStack(spacing: 16) {
                        InstructionRow(
                            number: "1",
                            title: "Pilot Setup",
                            description: "Your pilot needs the Crewlu app to create a status share"
                        )

                        InstructionRow(
                            number: "2",
                            title: "Share Invitation",
                            description: "Ask them to go to Settings → Partner Sharing → Invite Partner. iMessage is best."
                        )

                        InstructionRow(
                            number: "3",
                            title: "Accept & Connect",
                            description: "Accept the invitation and you'll see their status here"
                        )
                    }
                    .padding(.horizontal, 32)

                    VStack(spacing: 16) {
                        Button(action: {
                            showPasteAlert = true
                        }) {
                            Label("Paste Share Link", systemImage: "link")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.glassProminent)
                        .padding(.horizontal, 32)

                        Button(action: {
                            onTryDemo?()
                        }) {
                            Label("Try Demo", systemImage: "play.circle")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.glass)
                        .padding(.horizontal, 32)

                        Divider()

                        Button(action: {
                            CloudKitShareManager.shared.resetShareData()
                        }) {
                            Label("Reset Share Data", systemImage: "trash")
                                .font(.subheadline)
                        }
                        .buttonStyle(.glass)
                        .tint(.red)
                    }
                    .padding(.horizontal, 32)
                }
                .padding()
            }
        }
        .pasteShareLinkAlert(isPresented: $showPasteAlert)
    }
}

// MARK: - Share Accepting Overlay

struct ShareAcceptingOverlay: View {
    var body: some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                ProgressView()
                    .scaleEffect(1.5)
                    .tint(.white)

                Text("Accepting Share Invitation...")
                    .font(.headline)
                    .foregroundColor(.white)

                Text("This may take a moment")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))
            }
            .padding(40)
            .glassEffect(.regular, in: .rect(cornerRadius: 20))
        }
    }
}
```

with:

```swift
                )
            }
        )
    }
}
```

In `Crewluv/Views/Welcome/ContentView.swift`, replace:

```swift
    }
}

// MARK: - Paste Share Link Modifier

struct PasteShareLinkModifier: ViewModifier {
    @Binding var isPresented: Bool
    @State private var pastedURL = ""

    func body(content: Content) -> some View {
        content
            .alert("Paste Share Link", isPresented: $isPresented) {
                TextField("Share URL", text: $pastedURL)
                Button("Cancel", role: .cancel) { }
                Button("Accept") { acceptShareFromURL() }
            } message: {
                Text("Paste the CloudKit share link from your pilot")
            }
    }

    private func acceptShareFromURL() {
        guard let url = URL(string: pastedURL) else {
            debugLog("[CrewLuve] Invalid URL: \(pastedURL)")
            return
        }

        debugLog("[CrewLuve] Manual share URL: \(url)")

        Task {
            do {
                try await CloudKitShareManager.shared.acceptShare(from: url)
                pastedURL = ""
            } catch {
                debugLog("[CrewLuve] ❌ Error accepting manual share: \(error)")
            }
        }
    }
}

extension View {
    func pasteShareLinkAlert(isPresented: Binding<Bool>) -> some View {
        modifier(PasteShareLinkModifier(isPresented: isPresented))
    }
}

#Preview {
    ContentView()
        .environment(CloudKitShareManager.shared)
```

with:

```swift
    }
}

#Preview {
    ContentView()
        .environment(CloudKitShareManager.shared)
```

- [x] **Step 4: Check the rest still compiles**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Test run with 216 tests in 24 suites passed`.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Crewluv add Crewluv/Views/Welcome/ContentView.swift Crewluv/Views/Welcome/JoinAlerts.swift Crewluv/Views/Welcome/LoadingAndErrorViews.swift && git -C ~/Dev/Crewluv commit -q -m "feat(crewluv): the welcome screen, Connecting and the join's alerts in place" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Crewluv status --short` shows only `?? .claude/` and `?? .superpowers/` again.

### Task 23: Compile everything, without a simulator

**Files (outside both repos):** `$BUILD/order_check.py`

A build in a separate clone of the branch, with its own build folder, so it can't disturb the user's open Xcode or touch a simulator. It compiles the app and `CrewluvTests`, including the views, the app's links and the Keychain tests the harness can't build. Then the order check: Xcode compiles a target's files in the order its folder lists them, and a fresh clone can list them differently, so a compiler problem that depends on the order passes here and fails in the user's Xcode. That's what broke plan 4a's first ⌘U. The check takes the test target's compile from this build's log and repeats it with the files in eight orders, both type-checked whole and as the module-making step Xcode runs on its own. Crewluve has no packages to copy.

- [x] **Step 1: Make the clone**

Use a scratch folder outside both repos as `$BUILD`, for example `export BUILD=<your scratchpad>/partner-cloud-connect-build`.

Run:

```bash
rm -rf "${BUILD:?set BUILD first}" && mkdir -p "$BUILD" && git clone -q --shared ~/Dev/Crewluv "$BUILD/crewluv" && git -C "$BUILD/crewluv" switch -q feature/partner-cloud-source && git -C "$BUILD/crewluv" log --oneline -1
```

Expected: the branch's last commit: Task 22's `feat(crewluv): the welcome screen, Connecting and the join's alerts in place`, or a later fix from Task 24.

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

### Task 24: Review

**Files:** whatever the review finds.

- [x] **Step 1: Ask for a review**

Use superpowers:requesting-code-review with a read-only reviewer: it reads `git -C ~/Dev/Crewluv diff ead6bfe..feature/partner-cloud-source`, this plan, the spec (§7, §9, §10.1 and §14) and `~/Dev/Duty/supabase/partner-api.md`, and runs no `xcodebuild` and no simulator. State facts neutrally, and don't tell it what not to flag.

- [x] **Step 2: Act on it**

For each finding, fix it test-first where the harness can test it, re-run `"$HARNESS/run.sh"`, and commit. If any Swift changed, run Task 23 again. Note each fix in this plan's Execution notes.

### Task 25: The user runs Crewluve's tests

**Files:** none.

- [x] **Step 1: Ask the user to run the tests in Xcode**

Send them these steps:

1. In Xcode, open `~/Dev/Crewluv/Crewluv.xcodeproj` if it isn't open. At the top of the window, check that the scheme says **Crewluv** and the destination is an iPhone **simulator** (such as iPhone 17 Pro), not your phone. On a phone, `CloudSummaryTests` skips, because it reads its fixtures from the Mac.
2. Press **⌘U** (Product → Test) and wait for it to finish.
3. Press **⌘6** to open the Test navigator. Red marks show failures.

Expected: no failures, and the console's last Swift Testing line says `Test run with 224 tests in 25 suites passed`, counted before Task 24's fixes. The new and changed suites:

| Suite | Tests |
|---|---|
| `PartnerLinkTests` (new) | 12 |
| `JoinMessageTests` (new) | 3 |
| `HandOffCodeTests` (new) | 4 |
| `CrewluCloudDeviceTests` (new) | 16 |
| `PartnerJoinerTests` (new) | 14 |
| `HandOffSessionTests` (new) | 7 |
| `SharedPilotStatusNamedTests` (new) | 1 |
| `SyncLineWordingTests` (new) | 3 |
| `OpenedLinkTests` (new) | 4 |
| `DisconnectQuestionTests` (new) | 2 |
| `LivePartnerDoorTests` | 17 (was 11) |
| `KeychainDeviceKeyStoreTests` | 8 (was 6) |
| `PilotStatusSourceTests` | 58 (was 42) |
| `PushRegistrarTests` | 10 (was 9) |
| `PushRouteTests` | 6 (changed) |

- [x] **Step 2: If anything fails, stop**

Ask for the test's name and its message. Fix the cause, never the test's expected value, then ask for another run.

### Task 26: The user's look

**Files:** none.

- [x] **Step 1: Offer the look, and say what it shows**

Ask the user one question: do they want to look at 4b's screens themselves? It's their choice. Joining a real pilot waits for spec §10.3's checks before the release, with a test pilot on CrewLu's TestFlight build, because CrewLu's partner screens aren't released. So this look covers two things:
- **In a simulator:** the welcome screen, the code boxes, the paste box and Try Demo, since a simulator follows no pilot.
- **On their test phone, which follows a pilot through iCloud:** that nothing broke. The status shows, pull-to-refresh works, an alert still comes, and the bottom row has no Paste Share Link and no ••• (the menu shows only on Crewlu Cloud).

- [x] **Step 2: If yes, send the steps**

In a simulator:

1. In Xcode, at the top of the window, check the scheme says **Crewluv**, and pick an iPhone simulator as the destination (such as iPhone 17 Pro).
2. Press **⌘R** (Product → Run). Crewluve opens on the welcome screen: the heart, "Welcome to CrewLuve", the three steps, "or type the code from CrewLuve on another device" with six boxes, Try Demo, and "Link opened a web page instead? Paste it here" at the bottom.
3. Tap the boxes and type `abc234`. They show `ABC234`, Connecting shows briefly, then the alert **Code Not Working**, and the boxes clear. (Crewlu Cloud has no such code, so nothing is made.)
4. Tap **Paste it here**, type `hello`, and tap **Connect**. The alert **Not an Invite Link** shows.
5. Tap **Try Demo**. The demo shows, with no ••• in the bottom row. Leave the demo as before.
6. Stop the app with **⌘.** (Product → Stop).

On the test phone:

1. Connect it. In Xcode, pick it as the destination, and press **⌘R**. Crewluve opens and shows the pilot's status as before.
2. The bottom row shows the sync line and Refresh, with no Paste Share Link and no •••.
3. Pull down on the status to refresh. The sync line says "Synced just now".
4. Leave Crewluve (swipe up to the Home Screen). In CrewLu, on the pilot's phone, set a quick status such as **Call Me** for this partner. Within a minute or so, Crewluve's alert arrives, as it did before.

Note anything that looks wrong with a screenshot (in the simulator, **⌘S**; on the phone, press the side button and volume up together).

### Task 27: Record the decisions

**Files (in `~/Dev/Crewluve Website`):**
- Modify: `docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md`, and this plan

- [x] **Step 1: Add the planning decisions to the spec**

At the end of the spec, after §14, add `## 15. Decisions made while planning 4b`, followed by this plan's "Decisions made while planning" list, copied as it stands, and any changes from the review (Task 24). Then update its status line.

In `~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md`, replace:

```markdown
Plan 4a is built (`docs/superpowers/plans/2026-10-18-partner-links-piece4a-source.md`); next: plan 4b.
```

with:

```markdown
Plans 4a and 4b are built (`docs/superpowers/plans/2026-10-18-partner-links-piece4a-source.md`, `docs/superpowers/plans/2026-10-19-partner-links-piece4b-connecting.md`); next: plan 4c.
```

- [x] **Step 2: Tick this plan and commit**

Run:

```bash
cd ~/"Dev/Crewluve Website" && git add docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md docs/superpowers/plans/2026-10-19-partner-links-piece4b-connecting.md && git commit -q -m "Plan 4b built: connecting Crewluve to Crewlu Cloud; spec records the planning decisions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit. Don't push.

### Task 28: Finish

**Files:** none.

- [x] **Step 1: Keep the branch apart**

4b shows partners the new welcome screen and the ••• menu, and its links come from CrewLu's partner screens, which wait for CrewLu 3.0.2 to be on the App Store. So `feature/partner-cloud-source` stays apart from the release line until plan 4c is built and spec §10.3's checks pass. Nothing to merge.

- [x] **Step 2: Push only with a fresh yes**

Ask separately before each push: `feature/partner-cloud-source` in `~/Dev/Crewluv`, and `main` in `~/Dev/Crewluve Website`.

---

## Execution notes

Filled in during the build: any place the code ends up different from the printed blocks, and why.

- **Tasks 0–23 (2026-10-19):** applied to `~/Dev/Crewluv` as printed, every Run step as expected. The branch's 21 commits end at `b2c1a19`, and its files match the scratch copy byte for byte. Task 23: the build had 0 errors and 0 warnings, and the order check passed in all eight orders.
- **Task 24 (2026-10-19):** a read-only reviewer, working on a frozen copy at `b2c1a19`, answered "With fixes": four Important findings and nine Minor ones. It reproduced Important 1–3 and Minor 5 with probe tests in the harness, and those probes became tests. Each fix was made test-first, one commit each:
  - `7fc1e77` (Important 3): a join with this device's key that gets `key_in_use` falls through to the pending keys, the kept one and then a new one, as decision 1 says. Before, a kept pending key that another person's device had blocked every join until Disconnect.
  - `d8d0ee4` (Important 1 and 2b): `switchTo` is synchronous and returns the replaced device (`Replaced`), which `leave(_:)` lets go after `connect` has done everything else. So no read sees half a switch, and the alerts never compare the new pilot with the last one. `adoptLeftoverKey` checks the generation: a leftover key's refusal or answer that a switch overtook forgets and connects nothing. `switchTo` saves the joined key again if a refusal forgot it after the join sent it. A read that a switch overtook during the leftover key is `superseded`.
  - `3c42fc3` (Important 2a): an iCloud read that a switch to Crewlu Cloud overtook is `superseded`, so it doesn't give the alerts the last pilot's status or reset the share.
  - `46ef46f` (Minor 5): while Disconnect's leave is under way (`CrewluCloudDevice.isLeaving`), a read's `sharing_ended` is `superseded` and `endSharing()` does nothing, so Disconnect leaves no note.
  - `446ba11` (Important 4): `PartnerConnection.hasLeftICloud` (`partnerCloud.leftICloud`) is set when a device connects to Crewlu Cloud and on Disconnect, which also forgets any iCloud share quietly. While it's set, the launch doesn't scan for accepted shares or the pilot's own zone. Accepting a share (`acceptShare(from:)`, `acceptShare(with:)`) clears it. Before, a device that came from iCloud found its old share again at the next launch after a Disconnect or after sharing ended.
  - `2ff8e99` (Minor 6 and 7): cancelling a join that used this device's own key ends sharing with the last pilot, since that key joining anew means its old device was gone. When the pilot followed isn't saved yet, as on the first launch after the update, the joiner reads before comparing.
  - `c65a733` (Minor 13): a pasted code reads with any space or line break inside.
  - `2e136b5` (Minor 8, 10 and 12): the loading screen shows only until the first check, so a refresh keeps the welcome screen's typing and its paste box, and the waiting screen. Disconnect shows "Disconnecting..." and the screen waits. The code boxes and the hand-off code grow with the text size; the boxes share the width when six that size don't fit.
  - `611e5ac` (Minor 13): Crewluve's `CLAUDE.md` describes links, joining and this device on Crewlu Cloud.
  - `cb2f05e`: the review also suggested moving the generation on when a leftover key connects. Nothing can observe it, since reads run one at a time and Disconnect and hand-off codes need a connection first, so it was taken out again.
  - Not changed: Minor 9, because the Switch alert's dismissal answers Cancel only while the question is open, so the join can't wait forever if the alert goes some other way.
  - Left for later: Minor 11, an iCloud share link tapped while on Crewlu Cloud (plan 4c); the ••• menu on the waiting screen; the sync row's `icloud.fill` icon on Crewlu Cloud; and `SwitchQuestion` in its own file.
  - After the fixes: the harness passed 231 tests, and Task 23 passed again at `cb2f05e` (0 errors, 0 warnings, all eight orders). The deliberate breaks, extended to the fixes, caught all 122. One of them, which moves the replaced device's leave ahead of the bookkeeping, made a test wait forever, which counts as caught.
- **Task 24's re-check (2026-10-19):** the same reviewer re-checked `b2c1a19..cb2f05e`. It confirmed the fixes with its probes and by undoing eight of them one at a time, each of which a new test caught. It answered "With fixes" for two more, each one line, and three small items:
  - `da7d4a4`: a cancelled join ends sharing only for a device that was on Crewlu Cloud. On iCloud, a leftover key joining anew says nothing about the share.
  - `3c170f6`: once this device has let iCloud go, `refresh()`'s check for its own iCloud zone is skipped too; the check now sits in `checkPrivateDatabase()`. Before, a pilot's own phone would have shown its owner's status after a Disconnect. An accepted iCloud share shows the loading screen until it's read; since `2e136b5`, the welcome screen had flashed.
  - `b47e958`: the device's Disconnect is `disconnect()` (with `isDisconnecting`), apart from `leave(_:)` for a replaced device. The generation's comment and `CLAUDE.md` say it moves on at each switch and each forget.
  - Left for plan 4c: a leftover key that connects keeps a recorded iCloud share, since adoption doesn't let iCloud go; and 4c's move-over switch must set `hasLeftICloud`, as `connect` does.
  - For spec §10.3's checks on real phones, the reviewer suggests adding: a switch between two pilots; a reinstall after the pilot removed the device, then tapping a new invite; and Disconnect, then a relaunch, on a device that came from iCloud.
  - After these: the harness passes 232 tests; Task 23 passed at `b47e958` (0 errors, 0 warnings, all eight orders); and the 28 breaks that touch these commits were all caught.
- **Task 25 (2026-10-19):** the user's ⌘U at `b47e958`, on an iOS 26.5 simulator: `Test run with 240 tests in 25 suites passed` (the harness's 232 and the Keychain's 8), and the three XCTest suites' 28 tests passed.
- **Task 26 (2026-10-19):** the user looked in a simulator and on their test phone, and it looked right. CrewLu's partner page still says "Needs Crewluve update" for the test phone's partner, as expected: that label means the partner follows through iCloud, and moving an iCloud partner without a tap is plan 4c.
- **Task 27 (2026-10-19):** the spec's §15 records the 18 decisions as they stand, what the review added, and what's left for later, and its status line says plans 4a and 4b are built.
- **Task 28 (2026-10-20):** the user chose to keep `feature/partner-cloud-source` apart from the release line. Another session had already pushed it, with one commit of its own on top: `69865b3`, the flag, code and greeting for Hanoi and Ho Chi Minh City (`PilotStatusView` and an XCTest). That commit changes no 4b code. Task 23 passed at `69865b3` too (0 errors, 0 warnings, all eight orders). Website `main` was pushed `0d7f1ef..d66d4aa` with the user's yes, and Pages run 39478100017 succeeded.
