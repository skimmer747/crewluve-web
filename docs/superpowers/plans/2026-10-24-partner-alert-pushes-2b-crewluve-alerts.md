# Partner Alert Pushes, Plan 2b: Crewluve 1.3's Own Alerts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crewluve makes its alerts by kind, in the same words as Crewlu Cloud and with spec §15's trip rules. It leaves them to the alert pushes once Crewlu Cloud accepts its registration (§6.3), and keeps the pilot's name beside its key for the helper (§6.2). Plan 2c adds the helper itself.

**Architecture:**
- **`AlertWording`** holds the kinds, the words and the plain lines, for the app and, in plan 2c, the helper.
- **`StatusChangeNotifier`** works out the alerts by kind with §15's rules, saves its snapshot, and posts only when told to.
- **`PilotStatusSource`** decides when to post: on iCloud, for a read a hidden push asked for, and until `AlertPushes` says Crewlu Cloud accepted this device's alert pushes.
- **`PushRegistrar`** says `p_alerts` and records the acceptance as a fingerprint of the key.
- **`DeviceKeyStore`** gains a slot for the pilot's name.

**Tech Stack:** Swift (Swift 5 mode, the main actor by default, Approachable Concurrency), Swift Testing, the Mac harness (a Swift package outside both repos), and `xcodebuild build-for-testing` to compile only.

---

## Before you start

- **The spec:** `~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`. Read §5.3 (the rules), §6.2 (the key and the name), §6.3 (when the app makes its own alerts), §6.4 (the plain lines), §9.3 (Crewluve's tests) and §15 (the trip alerts), with plan 2a's decisions.
- **Plan 2a first:** Task 3 copies its shared cases, `~/Dev/Duty/supabase/partner-status/alert-cases.json`, which must hold 49 cases.
- **Crewluve's rule,** as in piece 4:
  - never run `xcodebuild test`, never boot a simulator, and never build in `~/Dev/Crewluv`, the copy the user has open in Xcode;
  - the test-first steps use the Mac harness (Task 1), and Task 7 compiles everything in a separate clone;
  - the user runs Crewluve's tests (Task 9).
- **New files need no project edit.** `Crewluv/` and `CrewluvTests/` are synchronized folders, so a new file joins its target by itself.
- **Two scratch folders,** outside both repos, both absolute paths:
  - **`$HARNESS`** for the harness;
  - **`$BUILD`** for the compile-only clone.

  Shell variables don't carry from one command to the next in Claude's Bash tool, so begin each command that uses them with `export HARNESS=<the folder> &&` (or `BUILD`).
- **The Crewluv repo is public:** no names, emails or tokens in it.
- **Pushes:** never push without the user's fresh yes.

## Decisions made while planning

These refine the spec. Plan 2c's last task writes them into it, with 2c's own.

1. **`AlertWording` is the one place for the alerts' words.** It holds the kinds, the words and the plain lines. `AlertKind`'s raw values are partner-push's `ALERT_KINDS`.
2. **An alert carries its kind:** `NotificationSpec` is `{kind, title, body, playsSound}`, and a notification's id starts with the kind's name.
3. **The shared cases run through the real code.** The notifier takes its defaults, time zone and poster, and the effective delay can be worked out at a given moment (`effectiveFlightDelayMinutes(at:)`). Plan 1's harness had patched both.
4. **The snapshot keeps the trips its home arrival belonged to** (`homeArrivalTrips`). One that 1.2 saved has none, so its home arrival isn't compared, once.
5. **§15's rules mirror partner-push's (plan 2a):**
   - a trip is its legs, by `tripId`, matched by overlapping spans: spans that only touch don't overlap, and a leg of no trip matches none;
   - added and removed are judged at the new status's `lastUpdated`;
   - a summary with no legs adds and removes nothing;
   - a departure belongs to the trip whose span holds it.
6. **§6.3 is decided when a new status goes to the alerts.**
   - **On iCloud:** the app always posts.
   - **On Crewlu Cloud:** it posts when a hidden push has asked for a read since the last new status, or until `AlertPushes` says the alert pushes are accepted.
   - A hidden push only reaches a device Crewlu Cloud treats as 1.2.
7. **Acceptance is remembered as the key's SHA-256,** never the key, under `partnerCloud.alertPushesAccepted`. A new key isn't accepted until its own registration is.
8. **The door always sends `p_alerts: true`,** since Crewluve shows alert pushes from 1.3, so no signature changes. There's no fallback on a 404 from an undone Crewlu Cloud: the registration isn't accepted then, so the app keeps its own alerts.
9. **The name item holds the alerts' title name:** the nickname, else the pilot's first name (`PartnerConnection.pilotName`).
   - **When it's saved:** whenever the app remembers a reading and the Keychain's differs.
   - **When it's deleted:** when the pilot is forgotten, and on iCloud's reset.
   - **Why the Keychain is compared, not the defaults:** a phone updated from 1.2 then saves it at its first new status.
10. **`LegsComparisonTests`' departure test gets a `tripId`,** as CrewLu's trip legs have. §15 compares departures only within a trip.
11. **Built on a new branch, `feature/alert-pushes`,** in `~/Dev/Crewluv`, from `4333994` (1.2 (44), the tip of both release branches). Plan 2c continues on it.

## How this plan was checked

- **Built test-first in a scratch clone** with the Mac harness: 339 tests in 31 suites.
- **The shared cases:** all 49 pass through Crewluve's real notifier, with the same kinds, sounds and words as partner-push.
- **The compile-only build** of the app and its tests: no errors and no warnings. The order check passed: the test target's 37 files in eight orders, each type-checked and built as a module.
- **Deliberate breaks:** 32 one-line breaks of the new Swift, each caught by a test. The first run missed five, all at the edges of the trip spans, so `StatusChangeNotifierTests` gained partner-push's own tests of those edges.
- **A replay:** Tasks 1–6, applied from this plan's own text to a fresh clone with the harness, gave every Run's printed result, and the files equal the scratch build's.

## Files

- **Create:** `Crewluv/Models/AlertWording.swift`, `Crewluv/Services/PartnerCloud/AlertPushes.swift`, `CrewluvTests/AlertWordingTests.swift`, `CrewluvTests/AlertCasesTests.swift`, `CrewluvTests/StatusChangeNotifierTests.swift` and `CrewluvTests/Fixtures/PartnerSummary/alert-cases.json` (a copy).
- **Replace:** `Crewluv/Services/StatusChangeNotifier.swift` and `Crewluv/Services/StatusNotifying.swift`.
- **Modify:**
  - **The app:** `TripStateResolver.swift`, `SharedPilotStatus.swift`, `PartnerConnection.swift`, `PilotStatusSource.swift`, `PushRegistrar.swift`, `CloudKitShareManager.swift`, `PartnerCloud/LivePartnerDoor.swift`, `PartnerCloud/PartnerDoor.swift`, `PartnerCloud/DeviceKeyStore.swift` and `App/AppDelegate.swift`;
  - **The tests:** the helpers' `PartnerCloudStandIns.swift`, `LegsComparisonTests.swift`, `LivePartnerDoorTests.swift`, `PushRegistrarTests.swift`, `PilotStatusSourceTests.swift`, `KeychainDeviceKeyStoreTests.swift`, and the fixtures' `README.md`.

---

### Task 0: The branch

**Files:** none.

- [ ] **Step 1: Check the checkout and plan 2a's cases**

Run:

```bash
git -C ~/Dev/Crewluv status --short && git -C ~/Dev/Crewluv rev-parse --short HEAD && python3 -c "import json; print(len(json.load(open('$HOME/Dev/Duty/supabase/partner-status/alert-cases.json'))['cases']), 'cases')"
```

Expected: `4333994`, then `49 cases`. The status lists nothing but the untracked `.claude/` and `.superpowers/`, if they're there. If the head moved on, or plan 2a isn't done, stop and ask.

- [ ] **Step 2: Make the branch**

Run:

```bash
git -C ~/Dev/Crewluv switch -c feature/alert-pushes 4333994
```

Expected: `Switched to a new branch 'feature/alert-pushes'`.

### Task 1: The Mac harness

**Files (outside both repos):** `$HARNESS/Package.swift`, `$HARNESS/run.sh`

Plan 4c's harness, with `Models/AlertWording.swift` added to its list. It's a Swift package that compiles Crewluve's model and service files and their tests unchanged, on the Mac, and runs the Swift Testing tests. If plan 4c's harness folder is still there, these two files replace its own.

- [ ] **Step 1: Write the package**

Create `$HARNESS/Package.swift`:

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

Create `$HARNESS/run.sh`:

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
         Models/SharingEndedNote.swift Models/AlertWording.swift \
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

- [ ] **Step 3: Run today's tests**

Run:

```bash
export HARNESS=<your harness folder> && chmod +x "$HARNESS/run.sh" && "$HARNESS/run.sh"
```

Expected: `Test run with 316 tests in 28 suites passed`. The first build takes about a minute. Nothing to commit: the harness isn't part of Crewluve.

### Task 2: The alerts' words

**Files:** Create `Crewluv/Models/AlertWording.swift` and `CrewluvTests/AlertWordingTests.swift`.

Spec §5.3, §6.4 and §15.4: each kind's words, with the numbers and times from the status. The words are `nil` when the status no longer fits the kind. Each kind has a plain line, and a Sleeping quick status plays no sound.

- [ ] **Step 1: Write the failing tests**

Create `CrewluvTests/AlertWordingTests.swift`:

```swift
//
//  AlertWordingTests.swift
//  CrewluvTests
//
//  The alerts' kinds and words, for the app's own alerts and the helper's (alert pushes spec §5.3, §6.4, §15.4)
//

import Foundation
import Testing
@testable import Crewluv

@MainActor
struct AlertWordingTests {

    private static let newYork = TimeZone(identifier: "America/New_York")!

    /// A status for partner A with `fields`, and its words for `kind`.
    private static func words(
        _ kind: AlertKind, _ fields: [String: Any] = [:], effectiveDelay: Int = 0, homeArrival: Date? = nil
    ) throws -> (title: String, body: String)? {
        let status = try Make.summary(fields).pilotStatus(partnerID: Make.partnerA, at: Date(timeIntervalSince1970: 1_792_605_600))
        return AlertWording.words(
            for: kind, name: "Dad", status: status, effectiveDelay: effectiveDelay, homeArrival: homeArrival, timeZone: newYork
        )
    }

    @Test func test_theKinds_areCrewluCloudsNames() {
        #expect(AlertKind.allCases.map(\.rawValue) == [
            "new-trip", "new-trips", "trip-cancelled", "trips-cancelled", "home-later", "home-earlier", "departure",
            "trip-extended", "trip-shortened", "quick-status", "delayed", "early", "delay-cleared", "early-cleared",
            "home", "took-off",
        ])
        #expect(AlertKind(rawValue: "a-kind-from-later") == nil)
        #expect(AlertWording.unknownKind == "New update")
    }

    @Test(arguments: [
        ("Call Me", "is asking you to call"),
        ("Free to Talk", "is free to talk"),
        ("Out for Dinner", "went out for dinner"),
        ("Sleeping", "is sleeping"),
        ("At the gym", "At the gym"),
    ])
    func test_aQuickStatus_inItsWords(status: String, body: String) throws {
        let quick = ["quickStatus": status, "quickStatusTargets": NSNull()] as [String: Any]
        #expect(try Self.words(.quickStatus, quick)?.title == "Dad")
        #expect(try Self.words(.quickStatus, quick)?.body == body)
    }

    @Test func test_theFlight_withItsDelay() throws {
        #expect(try Self.words(.delayed, effectiveDelay: 45).map { [$0.title, $0.body] } == ["Dad's Flight", "Delayed 45 minutes"])
        #expect(try Self.words(.early, effectiveDelay: -10)?.body == "Departing 10 minutes early")
        #expect(try Self.words(.delayCleared)?.body == "Delay cleared")
        #expect(try Self.words(.earlyCleared)?.body == "Early departure cleared")
        #expect(try Self.words(.earlyCleared)?.title == "Dad's Flight")
    }

    @Test func test_theTrips_withoutNumbers() throws {
        #expect(try Self.words(.newTrip, ["tripTotalDays": 4])?.body == "Has a new trip")
        #expect(try Self.words(.newTrips)?.body == "Has new trips")
        #expect(try Self.words(.tripCancelled)?.body == "Trip was cancelled")
        #expect(try Self.words(.tripsCancelled)?.body == "Trips were cancelled")
        #expect(try Self.words(.tripsCancelled)?.title == "Dad")
        #expect(try Self.words(.tripExtended, ["tripTotalDays": 5])?.body == "Trip extended to 5 days")
        #expect(try Self.words(.tripShortened, ["tripTotalDays": 3])?.body == "Trip shortened to 3 days")
    }

    @Test func test_theStatus_andTheTimes_inThePhonesTimeZone() throws {
        #expect(try Self.words(.home)?.body == "is home!")
        #expect(try Self.words(.tookOff)?.body == "just took off")
        let arrival = Date(timeIntervalSince1970: 1_792_676_700)
        #expect(try Self.words(.homeLater, homeArrival: arrival)?.body == "Getting home later — now 9:45 AM")
        #expect(try Self.words(.homeEarlier, homeArrival: arrival)?.body == "Getting home earlier — now 9:45 AM")
        #expect(try Self.words(.departure, ["nextDepartureTime": 1_792_639_200])?.body == "Departure changed — now 11:20 PM")
    }

    @Test func test_aStatusThatNoLongerFitsItsKind_hasNoWords() throws {
        #expect(try Self.words(.quickStatus) == nil, "the quick status was cleared")
        #expect(try Self.words(.delayed) == nil, "the delay is gone")
        #expect(try Self.words(.early, effectiveDelay: 30) == nil)
        #expect(try Self.words(.delayCleared, effectiveDelay: 30) == nil, "the delay came back")
        #expect(try Self.words(.homeLater) == nil, "no home arrival")
        #expect(try Self.words(.departure) == nil, "no next departure")
        #expect(try Self.words(.tripExtended) == nil, "no trip length")
    }

    @Test func test_eachKind_hasItsPlainLine() {
        #expect(AlertKind.allCases.map(AlertWording.plainLine(for:)) == [
            "Has a new trip", "Has new trips", "Trip was cancelled", "Trips were cancelled", "Getting home later",
            "Getting home earlier", "Departure changed", "Trip extended", "Trip shortened", "sent a quick status",
            "Flight delayed", "Departing early", "Delay cleared", "Early departure cleared", "is home!", "just took off",
        ])
    }

    @Test func test_everyAlertPlaysASound_butASleepingQuickStatus() {
        #expect(!AlertWording.playsSound(.quickStatus, quickStatus: "Sleeping"))
        #expect(AlertWording.playsSound(.quickStatus, quickStatus: "Call Me"))
        #expect(AlertWording.playsSound(.home, quickStatus: "Sleeping"))
    }
}
```

- [ ] **Step 2: Run them to see them fail**

Run:

```bash
export HARNESS=<your harness folder> && "$HARNESS/run.sh"
```

Expected: the build fails with `cannot find type 'AlertKind' in scope`.

- [ ] **Step 3: Write the words**

Create `Crewluv/Models/AlertWording.swift`:

```swift
//
//  AlertWording.swift
//  CrewLuve
//
//  The alerts' kinds and words, for the app's own alerts and the alert pushes' helper
//

import Foundation

/// An alert's kind, as Crewlu Cloud's partner-push names it in an alert push (alert pushes spec §5.3, §15).
nonisolated enum AlertKind: String, CaseIterable, Sendable {
    case newTrip = "new-trip"
    case newTrips = "new-trips"
    case tripCancelled = "trip-cancelled"
    case tripsCancelled = "trips-cancelled"
    case homeLater = "home-later"
    case homeEarlier = "home-earlier"
    case departure
    case tripExtended = "trip-extended"
    case tripShortened = "trip-shortened"
    case quickStatus = "quick-status"
    case delayed
    case early
    case delayCleared = "delay-cleared"
    case earlyCleared = "early-cleared"
    case home
    case tookOff = "took-off"
}

/// The words an alert shows (alert pushes spec §5.3, §6.1, §6.4, §15.4): the pilot's name as this partner sees it, or
/// their flight, and what happened, with the numbers and times from the status the alert is about. The app's own
/// alerts and the helper's use the same words.
nonisolated enum AlertWording {
    /// What an alert push of a kind this app doesn't know shows: the push's own line.
    static let unknownKind = "New update"

    /// The title and body for `kind`, titled with `name`, from `status` and what's worked out of it at the moment:
    /// the effective delay and the home arrival. Times read "h:mm a" in `timeZone`. Nil when the status no longer
    /// fits the kind, as when the quick status was cleared or the delay is gone: the helper shows the plain line.
    static func words(
        for kind: AlertKind,
        name: String,
        status: SharedPilotStatus,
        effectiveDelay: Int,
        homeArrival: Date?,
        timeZone: TimeZone = .current
    ) -> (title: String, body: String)? {
        let flight = "\(name)'s Flight"
        switch kind {
        case .quickStatus:
            guard let quickStatus = status.quickStatus, !quickStatus.isEmpty else { return nil }
            return (name, quickStatusWords[quickStatus] ?? quickStatus)
        case .delayed:
            return effectiveDelay > 0 ? (flight, "Delayed \(effectiveDelay) minutes") : nil
        case .early:
            return effectiveDelay < 0 ? (flight, "Departing \(-effectiveDelay) minutes early") : nil
        case .delayCleared:
            return effectiveDelay == 0 ? (flight, "Delay cleared") : nil
        case .earlyCleared:
            return effectiveDelay == 0 ? (flight, "Early departure cleared") : nil
        case .home:
            return (name, "is home!")
        case .tookOff:
            return (name, "just took off")
        case .newTrip:
            return (name, "Has a new trip")
        case .newTrips:
            return (name, "Has new trips")
        case .tripCancelled:
            return (name, "Trip was cancelled")
        case .tripsCancelled:
            return (name, "Trips were cancelled")
        case .homeLater, .homeEarlier:
            guard let homeArrival else { return nil }
            let way = kind == .homeLater ? "later" : "earlier"
            return (name, "Getting home \(way) — now \(time(homeArrival, in: timeZone))")
        case .departure:
            guard let departure = status.nextDepartureTime else { return nil }
            return (name, "Departure changed — now \(time(departure, in: timeZone))")
        case .tripExtended, .tripShortened:
            guard let days = status.tripTotalDays else { return nil }
            let way = kind == .tripExtended ? "extended" : "shortened"
            return (name, "Trip \(way) to \(days) days")
        }
    }

    /// The line for `kind` when the helper can't read the status, or the status no longer fits (spec §6.4).
    static func plainLine(for kind: AlertKind) -> String {
        switch kind {
        case .quickStatus: "sent a quick status"
        case .home: "is home!"
        case .tookOff: "just took off"
        case .delayed: "Flight delayed"
        case .early: "Departing early"
        case .delayCleared: "Delay cleared"
        case .earlyCleared: "Early departure cleared"
        case .newTrip: "Has a new trip"
        case .newTrips: "Has new trips"
        case .tripCancelled: "Trip was cancelled"
        case .tripsCancelled: "Trips were cancelled"
        case .homeLater: "Getting home later"
        case .homeEarlier: "Getting home earlier"
        case .departure: "Departure changed"
        case .tripExtended: "Trip extended"
        case .tripShortened: "Trip shortened"
        }
    }

    /// Whether an alert plays a sound: every one but a Sleeping quick status (decision A4).
    static func playsSound(_ kind: AlertKind, quickStatus: String?) -> Bool {
        !(kind == .quickStatus && quickStatus == "Sleeping")
    }

    /// The words for the quick statuses CrewLu offers. Any other shows as itself.
    private static let quickStatusWords = [
        "Call Me": "is asking you to call",
        "Free to Talk": "is free to talk",
        "Out for Dinner": "went out for dinner",
        "Sleeping": "is sleeping",
    ]

    private static func time(_ date: Date, in timeZone: TimeZone) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        formatter.timeZone = timeZone
        return formatter.string(from: date)
    }
}
```

- [ ] **Step 4: Run them to see them pass**

Run:

```bash
export HARNESS=<your harness folder> && "$HARNESS/run.sh"
```

Expected: `Test run with 324 tests in 29 suites passed`.

- [ ] **Step 5: Commit**

```bash
cd ~/Dev/Crewluv && git add CrewluvTests/AlertWordingTests.swift Crewluv/Models/AlertWording.swift && git commit -q -m "feat(crewluv): the alerts' kinds and words, for the app and the alert pushes' helper (alert pushes spec §5.3, §6.4, §15.4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

### Task 3: Crewluve's alerts, as Crewlu Cloud makes them

**Files:** Replace `Crewluv/Services/StatusChangeNotifier.swift` and `Crewluv/Services/StatusNotifying.swift`. Modify `TripStateResolver.swift` and `SharedPilotStatus.swift`, the stand-ins, `LegsComparisonTests.swift` and the fixtures' README. Create `AlertCasesTests.swift`, `StatusChangeNotifierTests.swift` and the fixture copy.

- **The alerts by kind:** the notifier names each alert by its kind, in `AlertWording`'s words.
- **§15's trip rules:** a trip added or taken off, by its legs, and the way home or the departure moving only within a trip.
- **The snapshot** keeps the trips its home arrival belonged to.
- **Posting:** the notifier posts only when told to.
- **The shared cases:** all 49 run through it, kind for kind and word for word.

- [ ] **Step 1: Copy plan 2a's shared cases**

Run:

```bash
cp ~/Dev/Duty/supabase/partner-status/alert-cases.json ~/Dev/Crewluv/CrewluvTests/Fixtures/PartnerSummary/ && python3 -c "import json; print(len(json.load(open('$HOME/Dev/Crewluv/CrewluvTests/Fixtures/PartnerSummary/alert-cases.json'))['cases']), 'cases')"
```

Expected: `49 cases`.

- [ ] **Step 2: Write the failing tests**

Add to the end of `CrewluvTests/Fixtures/PartnerSummary/README.md`, after a blank line:

```markdown
`alert-cases.json` is a copy of CrewLu's `~/Dev/Duty/supabase/partner-status/alert-cases.json`: the alert
pushes' shared cases (crewluve-web `docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`, §9.1
and §15). `AlertCasesTests` runs each through this app's alerts, which must make the same kinds, sounds and
words as Crewlu Cloud's partner-push. When CrewLu's cases change, copy the file again.
```

Create `CrewluvTests/AlertCasesTests.swift`:

```swift
//
//  AlertCasesTests.swift
//  CrewluvTests
//
//  The alert pushes' shared cases: this app's alerts for each change, which Crewlu Cloud's partner-push must
//  match kind for kind (alert pushes spec §9.1, §15)
//

import Foundation
import Testing
@testable import Crewluv

/// The alerts a test's notifier posts, kept in order.
final class PostedAlerts: @unchecked Sendable {
    private let lock = NSLock()
    private var specs: [StatusChangeNotifier.NotificationSpec] = []

    func add(_ spec: StatusChangeNotifier.NotificationSpec) {
        lock.withLock { specs.append(spec) }
    }

    var all: [StatusChangeNotifier.NotificationSpec] {
        lock.withLock { specs }
    }
}

@MainActor
@Suite(.enabled(if: PartnerSummaryFixtures.areReachable, "reads its cases from the Mac's disk"))
struct AlertCasesTests {

    /// The cases file, a copy of CrewLu's `supabase/partner-status/alert-cases.json`.
    private static func file() throws -> [String: Any] {
        let data = try Data(contentsOf: PartnerSummaryFixtures.folder.appending(path: "alert-cases.json"))
        return try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    /// The case's summary: the file's base with the case's fields over it, as Crewlu Cloud gives it to the partner.
    private static func summary(_ fields: [String: Any], base: [String: Any]) throws -> CloudSummary {
        let json = base.merging(fields) { $1 }
        return try CloudSummary.decoder().decode(CloudSummary.self, from: JSONSerialization.data(withJSONObject: json))
    }

    /// What the app does with one reading of `summary` at `moment`: the reading the source makes, titled with the
    /// name the pilot set for this partner, as the source titles it.
    private static func read(_ summary: CloudSummary, partner: String, at moment: TimeInterval, by notifier: StatusChangeNotifier) async {
        let reading = PilotReading.crewluCloud(summary, partnerID: partner, updatedAt: nil)
        await notifier.evaluate(reading, titledWith: summary.displayName(for: partner), at: Date(timeIntervalSince1970: moment))
    }

    @Test func test_everySharedCase_givesItsAlerts_inTheirWords() async throws {
        let file = try Self.file()
        let base = try #require(file["base"] as? [String: Any])
        let zone = try #require(file["timeZone"] as? String)
        let timeZone = try #require(TimeZone(identifier: zone))
        let cases = try #require(file["cases"] as? [[String: Any]])
        #expect(cases.count == 49)

        for item in cases {
            let name = try #require(item["name"] as? String)
            let partner = try #require(item["partner"] as? String)
            let suite = "AlertCasesTests.\(UUID().uuidString)"
            let defaults = try #require(UserDefaults(suiteName: suite))
            defer { defaults.removePersistentDomain(forName: suite) }
            let posted = PostedAlerts()
            let notifier = StatusChangeNotifier(defaults: defaults, timeZone: timeZone, post: { posted.add($0) })

            if let before = item["before"] as? [String: Any] {
                let beforeAt = try #require(item["beforeAt"] as? TimeInterval)
                await Self.read(try Self.summary(before, base: base), partner: partner, at: beforeAt, by: notifier)
            }
            let after = try #require(item["after"] as? [String: Any])
            let afterAt = try #require(item["afterAt"] as? TimeInterval)
            await Self.read(try Self.summary(after, base: base), partner: partner, at: afterAt, by: notifier)

            let expected = try #require(item["alerts"] as? [[String: Any]]).map { alert in
                "\(alert["kind"] ?? "") \(alert["sound"] as? Bool == true ? "sound" : "silent") \(alert["title"] ?? "") | \(alert["body"] ?? "")"
            }
            let got = posted.all.map { "\($0.kind.rawValue) \($0.playsSound ? "sound" : "silent") \($0.title) | \($0.body)" }
            #expect(got == expected, "\(name)")
        }
    }

    @Test func test_everyKind_hasACase() throws {
        let cases = try #require(try Self.file()["cases"] as? [[String: Any]])
        let kinds = Set(cases.flatMap { ($0["alerts"] as? [[String: Any]] ?? []).compactMap { $0["kind"] as? String } })
        #expect(kinds == Set(AlertKind.allCases.map(\.rawValue)))
    }
}
```

Create `CrewluvTests/StatusChangeNotifierTests.swift`:

```swift
//
//  StatusChangeNotifierTests.swift
//  CrewluvTests
//
//  A reading whose alerts the alert pushes bring is compared and remembered, but posts nothing (alert pushes
//  spec §6.3); trips are matched by span (§15.3), as in Crewlu Cloud's partner-push tests
//

import Foundation
import Testing
@testable import Crewluv

@MainActor
final class StatusChangeNotifierTests {
    private let defaultsName = "StatusChangeNotifierTests.\(UUID().uuidString)"
    private let defaults: UserDefaults
    private let posted = PostedAlerts()
    private let notifier: StatusChangeNotifier

    init() throws {
        defaults = try #require(UserDefaults(suiteName: defaultsName))
        notifier = StatusChangeNotifier(defaults: defaults, post: { [posted] in posted.add($0) })
    }

    deinit {
        defaults.removePersistentDomain(forName: defaultsName)
    }

    /// Hands the notifier a reading of a summary made at `lastUpdated` with `fields`.
    private func read(_ lastUpdated: TimeInterval, _ fields: [String: Any] = [:], posting: Bool = true) async throws {
        let reading = PilotReading.crewluCloud(try Make.summary(lastUpdated: lastUpdated, fields), partnerID: Make.partnerA, updatedAt: nil)
        await notifier.evaluate(reading, titledWith: nil, posting: posting)
    }

    private let callMe = ["quickStatus": "Call Me", "quickStatusTargets": NSNull()] as [String: Any]

    @Test func test_aReadingTheAlertPushesBring_postsNothing_butIsWhatTheNextIsComparedWith() async throws {
        try await read(1)
        try await read(2, callMe, posting: false)
        #expect(posted.all.isEmpty)

        try await read(3, callMe)
        #expect(posted.all.isEmpty, "Call Me was already seen")
        try await read(4, ["quickStatus": "Free to Talk", "quickStatusTargets": NSNull()])
        #expect(posted.all.map(\.kind) == [.quickStatus])
    }

    @Test func test_aReadingTheAppAlertsItself_postsItsAlerts() async throws {
        try await read(1)
        try await read(2, callMe)

        #expect(posted.all.map(\.body) == ["is asking you to call"])
    }

    /// A leg of `tripId` from `start` to `end`, in seconds since 1970.
    private static func leg(_ tripId: String?, _ start: TimeInterval, _ end: TimeInterval) -> TripLeg {
        TripLeg(
            id: "\(tripId ?? "none")-\(Int(start))",
            tripId: tripId,
            type: .flight,
            startTime: Date(timeIntervalSince1970: start),
            endTime: Date(timeIntervalSince1970: end),
            airportCode: nil,
            city: nil,
            timezoneIdentifier: nil,
            arrivalTimezoneIdentifier: nil,
            flightNumber: nil,
            departureAirport: nil,
            arrivalAirport: nil,
            departureCity: nil,
            arrivalCity: nil,
            tripDayNumber: nil,
            tripTotalDays: nil,
            delayMinutes: nil,
            airlineCode: nil,
            label: nil
        )
    }

    private static func missing(_ from: [TripLeg], _ to: [TripLeg], at moment: TimeInterval = 0) -> Int {
        StatusChangeNotifier.tripsMissing(from: from, to: to, at: Date(timeIntervalSince1970: moment))
    }

    private static let t1 = [leg("T1", 100, 200), leg("T1", 300, 400)]

    @Test func test_tripsAddedOrTakenOff_matchBySpan_onlyThoseNotOver_andNeverFromNoLegs() {
        let backwards = [Self.leg("T1", 300, 400), Self.leg("T1", 100, 200)]

        #expect(Self.missing(Self.t1, [Self.leg("T2", 500, 600)]) == 1, "T1 has no part in the other")
        #expect(Self.missing(Self.t1, [Self.leg("T9", 150, 160)]) == 0, "a leg of any trip in its span keeps it")
        #expect(Self.missing(Self.t1, [Self.leg("T9", 400, 500)]) == 1, "spans that only touch do not overlap")
        #expect(Self.missing(Self.t1, [Self.leg(nil, 150, 160)]) == 1, "a leg of no trip keeps nothing")
        #expect(Self.missing(Self.t1, [Self.leg("T2", 500, 600)], at: 400) == 0, "a trip over by then is not missing")
        #expect(Self.missing(Self.t1 + [Self.leg("T3", 700, 800)], [Self.leg("T2", 500, 600)]) == 2)
        #expect(Self.missing(backwards, [Self.leg("T9", 150, 160)]) == 0, "legs in any order")
        #expect(Self.missing(backwards, [Self.leg("T9", 350, 360)]) == 0)
        #expect(Self.missing(Self.t1, []) == 0, "no legs after: nothing is taken off")
        #expect(Self.missing([], Self.t1) == 0, "no legs before: nothing is added")
    }

    @Test func test_aDeparturesTrip_isTheOneWhoseSpanHoldsIt() {
        let at = { (time: TimeInterval) in StatusChangeNotifier.trip(at: Date(timeIntervalSince1970: time), in: Self.t1) }

        #expect(at(100) == "T1")
        #expect(at(250) == "T1", "between its legs, within its span")
        #expect(at(400) == "T1")
        #expect(at(401) == nil)
        #expect(StatusChangeNotifier.trip(at: Date(timeIntervalSince1970: 150), in: [Self.leg(nil, 100, 200)]) == nil)
    }
}
```

In `CrewluvTests/LegsComparisonTests.swift`, replace:

```swift
    @Test func test_aLegThatChanged_stillAlertsTheNewDeparture() throws {
        let later = Self.legs(#"[{"endTime":1792616400,"flightNumber":"5X123","id":"1","startTime":1792609200,"type":"flight"}]"#)
        let old = try Self.status(legs: Self.crewluCloud, departure: 1_792_605_600)
        let new = try Self.status(legs: later, departure: 1_792_609_200)

        #expect(StatusChangeNotifier.evaluateScheduleChanges(old: old, new: new, name: "Dad").map(\.id) == ["schedule-departure"])
    }
```

with:

```swift
    @Test func test_aLegThatChanged_stillAlertsTheNewDeparture_withinItsTrip() throws {
        let legs = Self.legs(#"[{"endTime":1792612800,"flightNumber":"5X123","id":"1","startTime":1792605600,"tripId":"trip","type":"flight"}]"#)
        let later = Self.legs(#"[{"endTime":1792616400,"flightNumber":"5X123","id":"1","startTime":1792609200,"tripId":"trip","type":"flight"}]"#)
        let old = try Self.status(legs: legs, departure: 1_792_605_600)
        let new = try Self.status(legs: later, departure: 1_792_609_200)

        #expect(StatusChangeNotifier.evaluateScheduleChanges(old: old, new: new, name: "Dad").map(\.kind) == [.departure])
    }
```

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift
/// The alerts, recording what they're handed.
actor RecordingNotifier {
    private(set) var evaluations: [(status: SharedPilotStatus, pilotName: String)] = []
```

with:

```swift
/// The alerts, recording what they're handed, and whether they'd post it.
actor RecordingNotifier {
    private(set) var evaluations: [(status: SharedPilotStatus, pilotName: String, posting: Bool)] = []
```

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift
        newEffectiveDelay: Int?,
        resolvedHomeArrivalTime: Date?
    ) async {
        evaluations.append((new, pilotName))
```

with:

```swift
        newEffectiveDelay: Int?,
        resolvedHomeArrivalTime: Date?,
        resolvedHomeArrivalTrips: [String]?,
        posting: Bool
    ) async {
        evaluations.append((new, pilotName, posting))
```

- [ ] **Step 3: Run them to see them fail**

Run:

```bash
export HARNESS=<your harness folder> && "$HARNESS/run.sh"
```

Expected: the build fails with `type 'RecordingNotifier' does not conform to protocol 'StatusNotifying'`.

- [ ] **Step 4: The notifier, the trips its home arrival belongs to, and the delay at a moment**

Replace the whole of `Crewluv/Services/StatusChangeNotifier.swift` with:

```swift
//
//  StatusChangeNotifier.swift
//  CrewLuve
//
//  Diffs old vs new SharedPilotStatus and fires local notifications
//  for meaningful changes (schedule, quickStatus, delays, status transitions).
//

import Foundation
import UserNotifications

actor StatusChangeNotifier {
    static let shared = StatusChangeNotifier()

    /// Where the snapshot is kept, the time zone the alerts' times read in, and what posts an alert. Tests give
    /// their own.
    private let defaults: UserDefaults
    private let timeZone: TimeZone
    private let post: @Sendable (NotificationSpec) -> Void

    init(
        defaults: UserDefaults = .standard,
        timeZone: TimeZone = .current,
        post: @escaping @Sendable (NotificationSpec) -> Void = StatusChangeNotifier.schedule
    ) {
        self.defaults = defaults
        self.timeZone = timeZone
        self.post = post
    }

    // MARK: - Snapshot Persistence

    private struct PilotSnapshot: Codable {
        let quickStatus: String?
        let flightDelayMinutes: Int?
        /// Encodes/decodes as the same single-value String the previous
        /// stringly-typed snapshot used, so persisted JSON stays byte-compatible.
        let displayStatus: PilotDisplayStatus
        let currentTripId: String?
        let tripTotalDays: Int?
        let homeArrivalTime: Date?
        /// The trips the home arrival belongs to (alert pushes spec §15.3). Nil in a snapshot an older Crewluve saved,
        /// whose home arrival is then compared with no other.
        let homeArrivalTrips: [String]?
        let nextDepartureTime: Date?
        let pilotFirstName: String
        let tripLegsJSON: Data?
    }

    private let snapshotKey = "LastSeenPilotSnapshot"
    private let lastEvaluatedKey = "LastEvaluatedPilotStatusTimestamp"
    private var hasSnapshot: Bool {
        defaults.data(forKey: snapshotKey) != nil
    }

    // MARK: - Authorization

    private var hasRequestedAuth = false

    func requestAuthorizationIfNeeded() async {
        guard !hasRequestedAuth else { return }
        hasRequestedAuth = true

        let center = UNUserNotificationCenter.current()
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            debugLog("[Notifier] Authorization \(granted ? "granted" : "denied")")
        } catch {
            debugLog("[Notifier] Authorization error: \(error)")
        }
    }

    // MARK: - Evaluate Changes

    /// Compares `new` with the snapshot, saves it as the next snapshot, and posts its alerts when `posting`. A
    /// reading the alert pushes have already alerted is compared and saved, but posts nothing (alert pushes spec §6.3).
    ///
    /// - Parameter newEffectiveDelay: Pre-computed effective delay for `new`, computed
    ///   on the MainActor side since `tripLegs` requires MainActor access.
    func evaluateChanges(
        old: SharedPilotStatus?,
        new: SharedPilotStatus,
        pilotName: String,
        newEffectiveDelay: Int? = nil,
        resolvedHomeArrivalTime: Date? = nil,
        resolvedHomeArrivalTrips: [String]? = nil,
        posting: Bool = true
    ) {
        // Skip evaluation entirely if Duty hasn't published anything new since
        // the last time we evaluated. Prevents spurious notifications from
        // silent-push replays and BG refreshes against an unchanged record.
        let lastEvaluated = defaults.object(forKey: lastEvaluatedKey) as? Date
        if let lastEvaluated, new.lastUpdated <= lastEvaluated {
            debugLog("[Notifier] Skipping eval — lastUpdated unchanged (\(new.lastUpdated))")
            return
        }

        let snapshot = loadSnapshot()
        let resolvedNewDelay = newEffectiveDelay ?? new.flightDelayMinutes ?? 0

        // First-ever load — save snapshot, no notifications
        guard let baseline = snapshotToComparable(snapshot) ?? old else {
            saveSnapshot(from: new, effectiveDelay: newEffectiveDelay, resolvedHomeArrivalTime: resolvedHomeArrivalTime,
                         resolvedHomeArrivalTrips: resolvedHomeArrivalTrips)
            debugLog("[Notifier] First load — saving baseline, no notifications")
            return
        }

        debugLog("[Notifier] Baseline delay: \(baseline.flightDelayMinutes ?? 0), new delay: \(resolvedNewDelay)")

        var notifications: [NotificationSpec] = []

        // Schedule changes
        notifications += Self.evaluateScheduleChanges(
            old: baseline, new: new, name: pilotName,
            oldHomeArrivalTrips: snapshot?.homeArrivalTrips,
            resolvedHomeArrivalTime: resolvedHomeArrivalTime,
            resolvedHomeArrivalTrips: resolvedHomeArrivalTrips,
            newEffectiveDelay: newEffectiveDelay,
            timeZone: timeZone
        )

        // Quick status
        notifications += Self.evaluateQuickStatus(old: baseline, new: new, name: pilotName, timeZone: timeZone)

        // Flight delay
        notifications += Self.evaluateFlightDelay(old: baseline, new: new, name: pilotName, newEffectiveDelay: newEffectiveDelay,
                                                  timeZone: timeZone)

        // Display status transitions
        notifications += Self.evaluateStatusTransitions(old: baseline, new: new, name: pilotName, timeZone: timeZone)

        // Save updated snapshot
        saveSnapshot(from: new, effectiveDelay: newEffectiveDelay, resolvedHomeArrivalTime: resolvedHomeArrivalTime,
                     resolvedHomeArrivalTrips: resolvedHomeArrivalTrips)

        guard posting else {
            if !notifications.isEmpty {
                debugLog("[Notifier] \(notifications.count) alert(s) left to the alert pushes")
            }
            return
        }

        // Fire notifications
        for spec in notifications {
            post(spec)
        }

        if !notifications.isEmpty {
            debugLog("[Notifier] Fired \(notifications.count) notification(s)")
        }
    }

    // MARK: - Schedule Changes

    /// The schedule's alerts between two statuses (alert pushes spec §5.3, as §15 changed it): a trip added or taken
    /// off, by its legs, and the way home or the departure moving within the same trip. It reads only what it's given,
    /// so it's static, and a test checks that the switch to Crewlu Cloud alerts nothing (partner links piece 4 spec §14).
    nonisolated static func evaluateScheduleChanges(
        old: SharedPilotStatus,
        new: SharedPilotStatus,
        name: String,
        oldHomeArrivalTrips: [String]? = nil,
        resolvedHomeArrivalTime: Date? = nil,
        resolvedHomeArrivalTrips: [String]? = nil,
        newEffectiveDelay: Int? = nil,
        timeZone: TimeZone = .current
    ) -> [NotificationSpec] {
        var specs: [NotificationSpec] = []
        let effectiveNewHome = resolvedHomeArrivalTime ?? new.homeArrivalTime
        let alert = { (kind: AlertKind) in
            spec(kind, name: name, status: new, effectiveDelay: newEffectiveDelay ?? new.flightDelayMinutes ?? 0,
                 homeArrival: effectiveNewHome, timeZone: timeZone)
        }

        // A trip added to the schedule, or taken off it, judged at the new status's moment (alert pushes spec §15).
        let oldLegs = old.tripLegsJSON.flatMap(legs(in:)) ?? []
        let newLegs = new.tripLegsJSON.flatMap(legs(in:)) ?? []
        let added = tripsMissing(from: newLegs, to: oldLegs, at: new.lastUpdated)
        let removed = tripsMissing(from: oldLegs, to: newLegs, at: new.lastUpdated)
        if added > 0 {
            specs.append(alert(added > 1 ? .newTrips : .newTrip))
        }
        if removed > 0 {
            specs.append(alert(removed > 1 ? .tripsCancelled : .tripCancelled))
        }

        // Home arrival time shifted (>15 min), within the same trip.
        // Only evaluate when Duty's underlying data actually changed — either the
        // published homeArrivalTime field or the trip-leg bytes. Otherwise any
        // diff is wall-clock drift from the resolver picking a different leg.
        let publishedHomeChanged = old.homeArrivalTime != effectiveNewHome
        let legsChanged = Self.legsDiffer(old.tripLegsJSON, new.tripLegsJSON)
        let sameTrip = (oldHomeArrivalTrips ?? []).contains { (resolvedHomeArrivalTrips ?? []).contains($0) }

        if (publishedHomeChanged || legsChanged), sameTrip,
           let oldHome = old.homeArrivalTime, let newHome = effectiveNewHome {
            let shift = newHome.timeIntervalSince(oldHome)
            if abs(shift) > 15 * 60 {
                specs.append(alert(shift > 0 ? .homeLater : .homeEarlier))
            }
        }

        // Departure time shifted (>15 min), within the same trip.
        // Only evaluate when the underlying trip-leg bytes changed. Otherwise
        // any diff is the writer's findNextDeparture picking a later leg as
        // the previous one becomes past-tense on each 5-min republish.
        if legsChanged,
           let oldDep = old.nextDepartureTime, let newDep = new.nextDepartureTime,
           let oldTrip = trip(at: oldDep, in: oldLegs), oldTrip == trip(at: newDep, in: newLegs) {
            if abs(newDep.timeIntervalSince(oldDep)) > 15 * 60 {
                specs.append(alert(.departure))
            }
        }

        // Trip extended/shortened
        let hadTrip = old.currentTripId != nil
        let hasTrip = new.currentTripId != nil
        if let oldDays = old.tripTotalDays, let newDays = new.tripTotalDays,
           oldDays != newDays, hadTrip, hasTrip {
            specs.append(alert(newDays > oldDays ? .tripExtended : .tripShortened))
        }

        return specs
    }

    // MARK: - Trips

    /// A stretch of time, as a trip's or a leg's.
    nonisolated struct Span: Equatable, Sendable {
        let start: Date
        let end: Date

        /// Whether the two overlap: each starts before the other ends.
        func overlaps(_ other: Span) -> Bool {
            start < other.end && other.start < end
        }
    }

    /// The legs' trips, by id, each with its span: from its first leg's start to its last leg's end. Legs with no trip
    /// id belong to none: jumpseats, events and commutes.
    nonisolated static func trips(in legs: [TripLeg]) -> [String: Span] {
        var trips: [String: Span] = [:]
        for leg in legs {
            guard let id = leg.tripId else { continue }
            let span = trips[id]
            trips[id] = Span(start: min(span?.start ?? leg.startTime, leg.startTime),
                             end: max(span?.end ?? leg.endTime, leg.endTime))
        }
        return trips
    }

    /// How many of `from`'s trips `to` has no part of (alert pushes spec §15.3): trips that haven't ended at `moment`,
    /// where no leg of a trip in `to` overlaps their span. Matching by span, a trip merged on import, imported again,
    /// or with its flights moved is still there. When `to` has no legs, none: a missing list never reads as every
    /// trip gone.
    nonisolated static func tripsMissing(from: [TripLeg], to: [TripLeg], at moment: Date) -> Int {
        guard !to.isEmpty else { return 0 }
        let legs = to.filter { $0.tripId != nil }.map { Span(start: $0.startTime, end: $0.endTime) }
        return trips(in: from).values.filter { trip in trip.end > moment && !legs.contains { trip.overlaps($0) } }.count
    }

    /// The trip a departure belongs to (alert pushes spec §15.3): the one whose span holds it, or none.
    nonisolated static func trip(at time: Date, in legs: [TripLeg]) -> String? {
        trips(in: legs).sorted { $0.key < $1.key }.first { $0.value.start <= time && time <= $0.value.end }?.key
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

    private nonisolated static func evaluateQuickStatus(
        old: SharedPilotStatus,
        new: SharedPilotStatus,
        name: String,
        timeZone: TimeZone
    ) -> [NotificationSpec] {
        guard old.quickStatus != new.quickStatus else { return [] }

        // Cleared — no notification
        guard let status = new.quickStatus, !status.isEmpty else { return [] }

        return [spec(.quickStatus, name: name, status: new, effectiveDelay: 0, homeArrival: nil, timeZone: timeZone)]
    }

    // MARK: - Flight Delay

    private nonisolated static func evaluateFlightDelay(
        old: SharedPilotStatus,
        new: SharedPilotStatus,
        name: String,
        newEffectiveDelay: Int? = nil,
        timeZone: TimeZone
    ) -> [NotificationSpec] {
        // Baseline's flightDelayMinutes already holds the effective value from the previous snapshot.
        let oldDelay = old.flightDelayMinutes ?? 0
        let newDelay = newEffectiveDelay ?? new.flightDelayMinutes ?? 0

        guard oldDelay != newDelay else { return [] }

        let kind: AlertKind
        if newDelay > 0 {
            kind = .delayed
        } else if newDelay < 0 {
            kind = .early
        } else {
            kind = oldDelay < 0 ? .earlyCleared : .delayCleared
        }

        return [spec(kind, name: name, status: new, effectiveDelay: newDelay, homeArrival: nil, timeZone: timeZone)]
    }

    // MARK: - Status Transitions

    private nonisolated static func evaluateStatusTransitions(
        old: SharedPilotStatus,
        new: SharedPilotStatus,
        name: String,
        timeZone: TimeZone
    ) -> [NotificationSpec] {
        guard old.displayStatus != new.displayStatus else { return [] }

        switch new.displayStatus {
        case .home:
            return [spec(.home, name: name, status: new, effectiveDelay: 0, homeArrival: nil, timeZone: timeZone)]
        case .inFlight:
            return [spec(.tookOff, name: name, status: new, effectiveDelay: 0, homeArrival: nil, timeZone: timeZone)]
        case .base, .commutingHome, .drivingHome, .drivingToWork, .turn, .layover, .reserve, .hotStandby, .training, .elsewhere, .unknown:
            return []
        }
    }

    // MARK: - Notification Delivery

    /// One alert: its kind, its words, and whether it plays a sound.
    nonisolated struct NotificationSpec: Equatable, Sendable {
        let kind: AlertKind
        let title: String
        let body: String
        let playsSound: Bool
    }

    /// An alert of `kind` about `status`, in its words (`AlertWording`), or in its plain line should the status not
    /// fit the kind.
    private nonisolated static func spec(
        _ kind: AlertKind,
        name: String,
        status: SharedPilotStatus,
        effectiveDelay: Int,
        homeArrival: Date?,
        timeZone: TimeZone
    ) -> NotificationSpec {
        let words = AlertWording.words(
            for: kind, name: name, status: status, effectiveDelay: effectiveDelay, homeArrival: homeArrival, timeZone: timeZone
        )
        return NotificationSpec(
            kind: kind,
            title: words?.title ?? name,
            body: words?.body ?? AlertWording.plainLine(for: kind),
            playsSound: AlertWording.playsSound(kind, quickStatus: status.quickStatus)
        )
    }

    /// Posts an alert now.
    nonisolated static func schedule(_ spec: NotificationSpec) {
        let content = UNMutableNotificationContent()
        content.title = spec.title
        content.body = spec.body
        if spec.playsSound {
            content.sound = .default
        }

        let request = UNNotificationRequest(
            identifier: "\(spec.kind.rawValue)-\(UUID().uuidString)",
            content: content,
            trigger: nil // Fire immediately
        )

        NotificationDiagnostics.shared.record(.localNotificationFired)

        UNUserNotificationCenter.current().add(request) { error in
            if let error {
                debugLog("[Notifier] Failed to schedule \(spec.kind.rawValue): \(error)")
            }
        }
    }

    // MARK: - Snapshot Persistence

    private func saveSnapshot(
        from status: SharedPilotStatus,
        effectiveDelay: Int? = nil,
        resolvedHomeArrivalTime: Date? = nil,
        resolvedHomeArrivalTrips: [String]? = nil
    ) {
        let snapshot = PilotSnapshot(
            quickStatus: status.quickStatus,
            flightDelayMinutes: effectiveDelay ?? status.flightDelayMinutes,
            displayStatus: status.displayStatus,
            currentTripId: status.currentTripId,
            tripTotalDays: status.tripTotalDays,
            homeArrivalTime: resolvedHomeArrivalTime ?? status.homeArrivalTime,
            homeArrivalTrips: resolvedHomeArrivalTrips,
            nextDepartureTime: status.nextDepartureTime,
            pilotFirstName: status.pilotFirstName,
            tripLegsJSON: status.tripLegsJSON
        )

        if let data = try? JSONEncoder().encode(snapshot) {
            defaults.set(data, forKey: snapshotKey)
        }
        defaults.set(status.lastUpdated, forKey: lastEvaluatedKey)
    }

    private func loadSnapshot() -> PilotSnapshot? {
        guard let data = defaults.data(forKey: snapshotKey) else { return nil }
        return try? JSONDecoder().decode(PilotSnapshot.self, from: data)
    }

    private func snapshotToComparable(_ snapshot: PilotSnapshot?) -> SharedPilotStatus? {
        guard let s = snapshot else { return nil }

        return SharedPilotStatus(
            pilotId: "",
            pilotFirstName: s.pilotFirstName,
            homeAirportCode: nil,
            baseAirportCode: nil,
            homeTimezone: nil,
            displayStatus: s.displayStatus,
            isSleeping: false,
            isHome: false,
            isInFlight: false,
            isOnDuty: false,
            currentAirport: nil,
            currentCity: nil,
            currentTimezone: nil,
            localTimeAtPilot: nil,
            currentLatitude: nil,
            currentLongitude: nil,
            currentFlightNumber: nil,
            currentFlightDeparture: nil,
            currentFlightArrival: nil,
            currentFlightDepartureTime: nil,
            currentFlightArrivalTime: nil,
            currentFlightArrivalTimezone: nil,
            homeArrivalTime: s.homeArrivalTime,
            homeArrivalLabel: nil,
            homeArrivalCity: nil,
            nextDepartureTime: s.nextDepartureTime,
            nextFlightNumber: nil,
            nextFlightDestination: nil,
            nextDepartureLabel: nil,
            lastTripEndDate: nil,
            lastTripDurationDays: nil,
            currentTripId: s.currentTripId,
            tripDayNumber: nil,
            tripTotalDays: s.tripTotalDays,
            upcomingCities: [],
            tripLegsJSON: s.tripLegsJSON,
            quickStatus: s.quickStatus,
            quickStatusIcon: nil,
            quickStatusExpiry: nil,
            flightDelayMinutes: s.flightDelayMinutes,
            displayNameByPartnerJSON: nil,
            lastUpdated: .distantPast,
            appVersion: ""
        )
    }
}
```

Replace the whole of `Crewluv/Services/StatusNotifying.swift` with:

```swift
//
//  StatusNotifying.swift
//  CrewLuve
//
//  What hears of each new status: the alerts
//

import Foundation

/// What hears of each new status: the alerts.
nonisolated protocol StatusNotifying: Sendable {
    func evaluateChanges(
        old: SharedPilotStatus?,
        new: SharedPilotStatus,
        pilotName: String,
        newEffectiveDelay: Int?,
        resolvedHomeArrivalTime: Date?,
        resolvedHomeArrivalTrips: [String]?,
        posting: Bool
    ) async
}

extension StatusChangeNotifier: StatusNotifying {}

extension StatusNotifying {
    /// Hands a new reading to the alerts, titled with `name` or else the pilot's first name, with
    /// what they compare: the effective delay and the resolved home arrival, worked out at `now` as the
    /// screen used to, with the trips that arrival belongs to. With `posting` false, the alerts compare
    /// and remember it but post nothing (alert pushes spec §6.3).
    func evaluate(_ reading: PilotReading, titledWith name: String?, at now: Date = Date(), posting: Bool = true) async {
        let status = reading.status(at: now)
        let homeArrival = TripStateResolver.resolveHomeArrival(
            legs: status.tripLegs, homeAirportCode: status.homeAirportCode, at: now
        )
        await evaluateChanges(
            old: nil,
            new: status,
            pilotName: name ?? status.pilotFirstName,
            newEffectiveDelay: status.effectiveFlightDelayMinutes(at: now),
            resolvedHomeArrivalTime: homeArrival?.arrivalTime ?? status.homeArrivalTime,
            resolvedHomeArrivalTrips: homeArrival?.trips ?? status.currentTripId.map { [$0] } ?? [],
            posting: posting
        )
    }
}
```

In `Crewluv/Models/TripStateResolver.swift`, replace:

```swift
struct TripEndInfo: Sendable {
    let arrivalTime: Date
    let arrivalLabel: String
    let arrivalCity: String?
}
```

with:

```swift
struct TripEndInfo: Sendable {
    let arrivalTime: Date
    let arrivalLabel: String
    let arrivalCity: String?
    /// The trips the home arrival belongs to: the trip ids among its block's legs (alert pushes spec §15.3).
    var trips: [String] = []
}
```

In `Crewluv/Models/TripStateResolver.swift`, replace:

```swift
        let arrivalTime = effectiveEnd(of: homeLeg)
        let city = homeLeg.arrivalCity ?? home

        return TripEndInfo(
            arrivalTime: arrivalTime,
            arrivalLabel: "Back Home In",
            arrivalCity: city
        )
```

with:

```swift
        let arrivalTime = effectiveEnd(of: homeLeg)
        let city = homeLeg.arrivalCity ?? home

        return TripEndInfo(
            arrivalTime: arrivalTime,
            arrivalLabel: "Back Home In",
            arrivalCity: city,
            trips: Set(segment.compactMap(\.tripId)).sorted()
        )
```

In `Crewluv/Models/SharedPilotStatus.swift`, replace:

```swift
    var effectiveFlightDelayMinutes: Int? {
        if let delay = flightDelayMinutes, delay != 0 { return delay }
        return currentlyRelevantDelayedLeg()?.delayMinutes
    }
```

with:

```swift
    var effectiveFlightDelayMinutes: Int? {
        effectiveFlightDelayMinutes(at: Date())
    }

    /// The same, at `now`: a leg's offset counts until its delayed landing.
    func effectiveFlightDelayMinutes(at now: Date) -> Int? {
        if let delay = flightDelayMinutes, delay != 0 { return delay }
        return currentlyRelevantDelayedLeg(at: now)?.delayMinutes
    }
```

- [ ] **Step 5: Run them to see them pass**

Run:

```bash
export HARNESS=<your harness folder> && "$HARNESS/run.sh"
```

Expected: `Test run with 330 tests in 31 suites passed`.

- [ ] **Step 6: Commit**

```bash
cd ~/Dev/Crewluv && git add CrewluvTests/Fixtures/PartnerSummary/README.md CrewluvTests/AlertCasesTests.swift CrewluvTests/StatusChangeNotifierTests.swift CrewluvTests/LegsComparisonTests.swift CrewluvTests/Helpers/PartnerCloudStandIns.swift Crewluv/Services/StatusChangeNotifier.swift Crewluv/Services/StatusNotifying.swift Crewluv/Models/TripStateResolver.swift Crewluv/Models/SharedPilotStatus.swift CrewluvTests/Fixtures/PartnerSummary/alert-cases.json && git commit -q -m "feat(crewluv): the alerts by kind, as Crewlu Cloud makes them: the trip rules of alert pushes spec §15, and the shared cases" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

### Task 4: Who posts the alerts

**Files:** Create `Crewluv/Services/PartnerCloud/AlertPushes.swift`. Modify `PilotStatusSource.swift` and `AppDelegate.swift`. Test: `PilotStatusSourceTests.swift`.

Spec §6.3: on iCloud the app always posts. On Crewlu Cloud it posts for a read a hidden push asked for, and until Crewlu Cloud has accepted this device's alert pushes for the key it holds now.

- [ ] **Step 1: Write the failing tests**

In `CrewluvTests/PilotStatusSourceTests.swift`, replace:

```swift
    // MARK: - iCloud
```

with:

```swift
    // MARK: - Who Posts the Alerts (alert pushes spec §6.3)

    @Test func test_onICloud_theAppPostsTheAlerts() async throws {
        iCloud.results = [.success(try Make.iCloud(lastUpdated: 1))]
        let source = makeSource()

        _ = await source.refresh()

        #expect(await notifier.evaluations.map(\.posting) == [true])
    }

    @Test func test_onCrewluCloud_theAppPostsTheAlerts_untilAlertPushesAreAccepted() async throws {
        door.viewAnswers = [
            Make.answer(updatedAt: "1", try Make.summary(lastUpdated: 1)),
            Make.answer(updatedAt: "2", try Make.summary(lastUpdated: 2)),
        ]
        let source = connectedSource()

        _ = await source.refresh()
        AlertPushes(defaults: defaults, keys: keys).accepted(forKey: Make.key)
        _ = await source.refresh()

        #expect(await notifier.evaluations.map(\.posting) == [true, false])
    }

    @Test func test_onCrewluCloud_aReadAHiddenPushAskedFor_postsItsAlerts_evenOnceAccepted() async throws {
        door.viewAnswers = [
            Make.answer(updatedAt: "1", try Make.summary(lastUpdated: 1)),
            Make.answer(updatedAt: "2", try Make.summary(lastUpdated: 2)),
        ]
        let source = connectedSource()
        AlertPushes(defaults: defaults, keys: keys).accepted(forKey: Make.key)

        _ = await source.refresh(startedByPush: true)
        _ = await source.refresh()

        #expect(await notifier.evaluations.map(\.posting) == [true, false])
    }

    @Test func test_acceptedForAnotherKey_theAppStillPostsTheAlerts() async throws {
        door.viewAnswers = [Make.answer(updatedAt: "1", try Make.summary(lastUpdated: 1))]
        let source = connectedSource()
        AlertPushes(defaults: defaults, keys: keys).accepted(forKey: String(repeating: "7c", count: 32))

        _ = await source.refresh()

        #expect(await notifier.evaluations.map(\.posting) == [true])
    }

    // MARK: - iCloud
```

- [ ] **Step 2: Run them to see them fail**

Run:

```bash
export HARNESS=<your harness folder> && "$HARNESS/run.sh"
```

Expected: the build fails with `cannot find 'AlertPushes' in scope`.

- [ ] **Step 3: AlertPushes, and the source's rule**

Create `Crewluv/Services/PartnerCloud/AlertPushes.swift`:

```swift
//
//  AlertPushes.swift
//  CrewLuve
//
//  Whether Crewlu Cloud sends this device alert pushes, so the app leaves the alerts to them
//

import CryptoKit
import Foundation

/// Whether Crewlu Cloud sends this device alert pushes (alert pushes spec §6.3): it accepted this device's push
/// registration, which always says it shows them, for the key the device holds now. A new key isn't accepted until
/// its own registration is, and until then the app makes its own alerts.
struct AlertPushes {
    let defaults: UserDefaults
    let keys: DeviceKeyStore

    /// Where the accepted key's fingerprint is kept. The key itself never goes in the defaults.
    static let acceptedKey = "partnerCloud.alertPushesAccepted"

    /// Crewlu Cloud accepted this device's registration for `deviceKey`.
    func accepted(forKey deviceKey: String) {
        defaults.set(Self.fingerprint(deviceKey), forKey: Self.acceptedKey)
    }

    /// Whether they're accepted for the key this device holds now. A key that can't be read counts as not accepted,
    /// so the app goes on making its own alerts.
    var areAccepted: Bool {
        guard let key = try? keys.deviceKey(), let accepted = defaults.string(forKey: Self.acceptedKey) else { return false }
        return accepted == Self.fingerprint(key)
    }

    /// The key's SHA-256, as hex.
    static func fingerprint(_ key: String) -> String {
        SHA256.hash(data: Data(key.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    /// Moves this device from iCloud to Crewlu Cloud by itself (spec §8).
    @ObservationIgnored private let moveOver: MoveOver
```

with:

```swift
    /// Moves this device from iCloud to Crewlu Cloud by itself (spec §8).
    @ObservationIgnored private let moveOver: MoveOver
    /// Whether Crewlu Cloud sends this device alert pushes, which bring the alerts (alert pushes spec §6.3).
    @ObservationIgnored private let alertPushes: AlertPushes
    /// Whether a hidden push has asked for a read since the alerts were last handed a new status.
    @ObservationIgnored private var pushAskedForRead = false
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        moveOver = MoveOver(door: door, keys: keys, connection: connection, device: device, label: deviceLabel)
        sharingEndedWith = connection.sharingEndedWith
    }
```

with:

```swift
        moveOver = MoveOver(door: door, keys: keys, connection: connection, device: device, label: deviceLabel)
        alertPushes = AlertPushes(defaults: defaults, keys: keys)
        sharingEndedWith = connection.sharingEndedWith
    }
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
    /// iCloud's read is shown, the move-over takes its turn (spec §8.1).
    func refresh() async -> RefreshOutcome {
        await reads.run { [self] in
```

with:

```swift
    /// iCloud's read is shown, the move-over takes its turn (spec §8.1). A hidden push's refresh is
    /// `startedByPush`, so the alerts of the status it brings are posted (alert pushes spec §6.3).
    func refresh(startedByPush: Bool = false) async -> RefreshOutcome {
        if startedByPush {
            pushAskedForRead = true
        }
        return await reads.run { [self] in
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        PilotReading.logLegChanges(from: previous, to: newReading)
        reading = newReading
        await notifier.evaluate(newReading, titledWith: name)
        return .newStatus
    }
```

with:

```swift
        PilotReading.logLegChanges(from: previous, to: newReading)
        reading = newReading
        let posting = postsOwnAlerts(for: newReading)
        pushAskedForRead = false
        await notifier.evaluate(newReading, titledWith: name, posting: posting)
        return .newStatus
    }

    /// Whether this app posts a new reading's alerts itself (alert pushes spec §6.3): on iCloud, always. On Crewlu
    /// Cloud, when a hidden push asked for the read, since Crewlu Cloud sends those only to a device it doesn't send
    /// alert pushes, and until it has accepted this device's alert pushes. Otherwise the alert pushes bring them.
    func postsOwnAlerts(for reading: PilotReading) -> Bool {
        guard case .crewluCloud = reading else { return true }
        return pushAskedForRead || !alertPushes.areAccepted
    }
```

In `Crewluv/App/AppDelegate.swift`, replace:

```swift
            let outcome = await source.refresh().backgroundFetchOutcome
```

with:

```swift
            let outcome = await source.refresh(startedByPush: true).backgroundFetchOutcome
```

- [ ] **Step 4: Run them to see them pass**

Run:

```bash
export HARNESS=<your harness folder> && "$HARNESS/run.sh"
```

Expected: `Test run with 334 tests in 31 suites passed`.

- [ ] **Step 5: Commit**

```bash
cd ~/Dev/Crewluv && git add CrewluvTests/PilotStatusSourceTests.swift Crewluv/Services/PartnerCloud/AlertPushes.swift Crewluv/Services/PilotStatusSource.swift Crewluv/App/AppDelegate.swift && git commit -q -m "feat(crewluv): the app posts its own alerts on iCloud, for a hidden push's read, and until Crewlu Cloud accepts its alert pushes (alert pushes spec §6.3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

### Task 5: The registration says Crewluve shows alert pushes

**Files:** Modify `PushRegistrar.swift`, `PartnerCloud/LivePartnerDoor.swift` and `PartnerCloud/PartnerDoor.swift`. Test: `PushRegistrarTests.swift` and `LivePartnerDoorTests.swift`.

Spec §6.3: every registration sends `p_alerts: true`. A registration that gets through is remembered for this device's key, as a fingerprint, never the key itself.

- [ ] **Step 1: Write the failing tests**

In `CrewluvTests/LivePartnerDoorTests.swift`, replace:

```swift
    @Test func test_setPush_postsTheTokenAndItsEnvironment() async throws {
        let network = StandInNetwork(body: #"{"ok": true}"#)
        try await network.door.setPush(key: Self.key, token: "0a1b2c", environment: .sandbox)

        let request = try #require(network.requests.first)
        #expect(request.url?.absoluteString == "https://corxvurxpnrzekbxdgye.supabase.co/rest/v1/rpc/partner_set_push")
        #expect(request.value(forHTTPHeaderField: "apikey") == LivePartnerDoor.publishableKey)
        #expect(try network.parameters(request) == ["p_key": Self.key, "p_token": "0a1b2c", "p_env": "sandbox"])
    }
```

with:

```swift
    @Test func test_setPush_postsTheTokenAndItsEnvironment_andThatItShowsAlertPushes() async throws {
        let network = StandInNetwork(body: #"{"ok": true}"#)
        try await network.door.setPush(key: Self.key, token: "0a1b2c", environment: .sandbox)

        let request = try #require(network.requests.first)
        #expect(request.url?.absoluteString == "https://corxvurxpnrzekbxdgye.supabase.co/rest/v1/rpc/partner_set_push")
        #expect(request.value(forHTTPHeaderField: "apikey") == LivePartnerDoor.publishableKey)
        let body = try #require(request.httpBody)
        let parameters = try #require(try JSONSerialization.jsonObject(with: body) as? [String: Any])
        #expect(parameters["p_key"] as? String == Self.key)
        #expect(parameters["p_token"] as? String == "0a1b2c")
        #expect(parameters["p_env"] as? String == "sandbox")
        #expect(parameters["p_alerts"] as? Bool == true)
        #expect(parameters.count == 4)
    }
```

In `CrewluvTests/PushRegistrarTests.swift`, replace:

```swift
        let registrar = PushRegistrar(
            statusSource: source, door: door, keys: keys,
            environment: { .sandbox }, record: { [log] in log.entries.append($0) }
        )
        return (registrar, source)
    }
```

with:

```swift
        let registrar = PushRegistrar(
            statusSource: source, door: door, keys: keys, defaults: defaults,
            environment: { .sandbox }, record: { [log] in log.entries.append($0) }
        )
        return (registrar, source)
    }

    /// Whether Crewlu Cloud sends this device alert pushes, as the registrar left it.
    private var alertPushesAccepted: Bool {
        AlertPushes(defaults: defaults, keys: keys).areAccepted
    }

    // MARK: - Alert Pushes (alert pushes spec §6.3)

    @Test func test_aRegistrationThatGetsThrough_hasCrewluCloudSendAlertPushes() async {
        let (registrar, _) = makeRegistrar()
        #expect(!alertPushesAccepted)

        await registrar.didReceive(deviceToken: Data([0x0A]))

        #expect(alertPushesAccepted)
    }

    @Test(arguments: [PartnerDoorError.unavailable, .refused(.invalidInput)])
    func test_aRegistrationThatDoesntGetThrough_leavesTheAlertsToTheApp(error: PartnerDoorError) async {
        door.setPushAnswers = [.failure(error)]
        let (registrar, _) = makeRegistrar()

        await registrar.didReceive(deviceToken: Data([0x0A]))

        #expect(!alertPushesAccepted)
    }

    @Test func test_aNewKey_isntAcceptedUntilItsOwnRegistrationIs() async {
        let (registrar, _) = makeRegistrar()
        await registrar.didReceive(deviceToken: Data([0x0A]))

        keys.key = String(repeating: "7c", count: 32)
        #expect(!alertPushesAccepted)
        await registrar.register()
        #expect(alertPushesAccepted)
    }

    @Test func test_theDefaults_neverHoldTheKey() async throws {
        let (registrar, _) = makeRegistrar()
        await registrar.didReceive(deviceToken: Data([0x0A]))

        let accepted = try #require(defaults.string(forKey: AlertPushes.acceptedKey))
        #expect(accepted == AlertPushes.fingerprint(Make.key))
        #expect(!accepted.contains(Make.key))
        #expect(accepted.count == 64)
    }
```

- [ ] **Step 2: Run them to see them fail**

Run:

```bash
export HARNESS=<your harness folder> && "$HARNESS/run.sh"
```

Expected: the build fails with `extra argument 'defaults' in call`.

- [ ] **Step 3: The door says p_alerts, and the registrar remembers an accepted one**

In `Crewluv/Services/PushRegistrar.swift`, replace:

```swift
/// Sends this device's push token to Crewlu Cloud, so a change in the pilot's status wakes it
/// (partner links piece 4 spec §6.1): when iOS gives the token at launch, right after
/// connecting, and on coming to the front when the last try couldn't finish.
```

with:

```swift
/// Sends this device's push token to Crewlu Cloud, so a change in the pilot's status wakes it
/// (partner links piece 4 spec §6.1): when iOS gives the token at launch, right after
/// connecting, and on coming to the front when the last try couldn't finish. Each registration
/// says this Crewluve shows alert pushes, and once Crewlu Cloud accepts it for this device's key,
/// the alert pushes bring the alerts (alert pushes spec §6.3).
```

In `Crewluv/Services/PushRegistrar.swift`, replace:

```swift
    private let keys: DeviceKeyStore
    private let environment: () -> PushEnvironment
```

with:

```swift
    private let keys: DeviceKeyStore
    private let alertPushes: AlertPushes
    private let environment: () -> PushEnvironment
```

In `Crewluv/Services/PushRegistrar.swift`, replace:

```swift
        keys: DeviceKeyStore = KeychainDeviceKeyStore(),
        environment: @escaping () -> PushEnvironment = { .current },
```

with:

```swift
        keys: DeviceKeyStore = KeychainDeviceKeyStore(),
        defaults: UserDefaults = .standard,
        environment: @escaping () -> PushEnvironment = { .current },
```

In `Crewluv/Services/PushRegistrar.swift`, replace:

```swift
        self.keys = keys
        self.environment = environment
```

with:

```swift
        self.keys = keys
        alertPushes = AlertPushes(defaults: defaults, keys: keys)
        self.environment = environment
```

In `Crewluv/Services/PushRegistrar.swift`, replace:

```swift
            try await door.setPush(key: key, token: token, environment: environment)
            isOwed = false
            record("Sent (\(environment.rawValue))")
```

with:

```swift
            try await door.setPush(key: key, token: token, environment: environment)
            isOwed = false
            alertPushes.accepted(forKey: key)
            record("Sent (\(environment.rawValue))")
```

In `Crewluv/Services/PartnerCloud/LivePartnerDoor.swift`, replace:

```swift
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
```

with:

```swift
private struct PushParameters: Encodable {
    let key: String
    let token: String
    let environment: String
    /// Crewluve shows alert pushes from 1.3, so every registration says so (alert pushes spec §6.3).
    let alerts = true

    enum CodingKeys: String, CodingKey {
        case key = "p_key"
        case token = "p_token"
        case environment = "p_env"
        case alerts = "p_alerts"
    }
}
```

In `Crewluv/Services/PartnerCloud/PartnerDoor.swift`, replace:

```swift
    /// partner_set_push: this device's push token, as lower-case hex, and the Apple service it
    /// belongs to.
```

with:

```swift
    /// partner_set_push: this device's push token, as lower-case hex, and the Apple service it
    /// belongs to, saying this Crewluve shows alert pushes.
```

- [ ] **Step 4: Run them to see them pass**

Run:

```bash
export HARNESS=<your harness folder> && "$HARNESS/run.sh"
```

Expected: `Test run with 338 tests in 31 suites passed`.

- [ ] **Step 5: Commit**

```bash
cd ~/Dev/Crewluv && git add CrewluvTests/LivePartnerDoorTests.swift CrewluvTests/PushRegistrarTests.swift Crewluv/Services/PushRegistrar.swift Crewluv/Services/PartnerCloud/LivePartnerDoor.swift Crewluv/Services/PartnerCloud/PartnerDoor.swift && git commit -q -m "feat(crewluv): every push registration says Crewluve shows alert pushes, and an accepted one is remembered for its key (alert pushes spec §6.3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

### Task 6: The pilot's name, beside the key

**Files:**
- **Modify:** `PartnerCloud/DeviceKeyStore.swift`, `PartnerConnection.swift`, `PilotStatusSource.swift` and `CloudKitShareManager.swift`.
- **Test:** `PilotStatusSourceTests.swift`, `KeychainDeviceKeyStoreTests.swift` (which runs only in Xcode), and the stand-in key store.

Spec §6.2: the helper titles its plain lines with the name the alerts use. The app keeps it in a Keychain item next to the key, this device only, after the first unlock, never synced, and deletes it when it forgets the pilot.

- [ ] **Step 1: Write the failing tests**

In `CrewluvTests/PilotStatusSourceTests.swift`, replace:

```swift
    @Test func test_iCloud_nameNotLookedUp_titlesTheAlertWithTheSavedName_andKeepsIt() async throws {
```

with:

```swift
    @Test func test_theAlertsTitleName_isKeptBesideTheKey_forTheHelper_untilThePilotIsForgotten() async throws {
        iCloud.results = [
            .success(try Make.iCloud(lastUpdated: 1, displayName: "Dad")),
            .success(try Make.iCloud(lastUpdated: 2)),
        ]
        let source = makeSource()

        _ = await source.refresh()
        #expect(keys.name == "Dad")
        _ = await source.refresh()
        #expect(keys.name == "Alex", "the pilot's first name, once there's no nickname")
        source.forgetPilot()
        #expect(keys.name == nil)
    }

    @Test func test_iCloud_nameNotLookedUp_titlesTheAlertWithTheSavedName_andKeepsIt() async throws {
```

In `CrewluvTests/KeychainDeviceKeyStoreTests.swift`, replace:

```swift
//  The device key, the pending key and the hand-off copy in the Keychain (partner links piece 4
//  spec §5.3, §8.3). These run only in Xcode: the Mac harness can't reach the iOS Keychain.
```

with:

```swift
//  The device key, the pending key and the hand-off copy in the Keychain (partner links piece 4
//  spec §5.3, §8.3), and the alerts' title name (alert pushes spec §6.2). These run only in Xcode:
//  the Mac harness can't reach the iOS Keychain.
```

In `CrewluvTests/KeychainDeviceKeyStoreTests.swift`, replace:

```swift
        store.forgetHandOffCopy()
    }
```

with:

```swift
        store.forgetHandOffCopy()
        store.forgetPilotName()
    }
```

In `CrewluvTests/KeychainDeviceKeyStoreTests.swift`, replace:

```swift
    // MARK: - The Hand-Off Copy
```

with:

```swift
    // MARK: - The Pilot's Name

    @Test func test_pilotName_isKeptApartFromTheKey_onThisDeviceOnly_andCanBeForgotten() throws {
        store.save(deviceKey: "device")
        #expect(store.save(pilotName: "Dad"))
        #expect(try store.pilotName() == "Dad")
        #expect(try store.deviceKey() == "device")
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "com.ToddAnderson.Crewluv.partnerCloud.tests",
            kSecAttrAccount as String: "pilotName",
            kSecReturnAttributes as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: CFTypeRef?
        #expect(SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess)
        let attributes = try #require(result as? [String: Any])
        #expect(attributes[kSecAttrAccessible as String] as? String == kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly as String)
        #expect(attributes[kSecAttrSynchronizable as String] as? Bool != true)

        store.forgetPilotName()
        #expect(try store.pilotName() == nil)
        #expect(try store.deviceKey() == "device")
    }

    // MARK: - The Hand-Off Copy
```

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift
    /// The hand-off copy, as iCloud Keychain would carry it from another of this partner's devices.
    var copy: String?
```

with:

```swift
    /// The hand-off copy, as iCloud Keychain would carry it from another of this partner's devices.
    var copy: String?
    /// The alerts' title name, kept for the alert pushes' helper.
    var name: String?
```

In `CrewluvTests/Helpers/PartnerCloudStandIns.swift`, replace:

```swift
    func forgetHandOffCopy() {
        copy = nil
    }
}
```

with:

```swift
    func forgetHandOffCopy() {
        copy = nil
    }

    func pilotName() throws(DeviceKeyUnreadable) -> String? {
        if readFails {
            throw DeviceKeyUnreadable(status: errSecInteractionNotAllowed)
        }
        return name
    }

    func save(pilotName: String) -> Bool {
        guard !savesFail else { return false }
        name = pilotName
        return true
    }

    func forgetPilotName() {
        name = nil
    }
}
```

- [ ] **Step 2: Run them to see them fail**

Run:

```bash
export HARNESS=<your harness folder> && "$HARNESS/run.sh"
```

Expected: `Test run with 339 tests in 31 suites failed`, with 2 issues in the name test: `keys.name == "Dad"` and `keys.name == "Alex"`.

- [ ] **Step 3: The name's slot, saved and forgotten with the pilot**

In `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift`, replace:

```swift
    /// Saves the hand-off copy in place of any other. False if it couldn't be saved.
    @discardableResult func save(handOffCopy: String) -> Bool
    func forgetHandOffCopy()
}
```

with:

```swift
    /// Saves the hand-off copy in place of any other. False if it couldn't be saved.
    @discardableResult func save(handOffCopy: String) -> Bool
    func forgetHandOffCopy()

    /// The name the alerts are titled with, kept beside the key for the alert pushes' helper, which titles its plain
    /// lines with it (alert pushes spec §6.2). Nil when there's none.
    func pilotName() throws(DeviceKeyUnreadable) -> String?
    /// Saves the name in place of any other. False if it couldn't be saved.
    @discardableResult func save(pilotName: String) -> Bool
    func forgetPilotName()
}
```

In `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift`, replace:

```swift
/// The keys in the Keychain, each as a generic password that iOS can read in the background once the
/// phone has been unlocked since it started, so a push at night still finds them. This device's key
/// and the pending key are for this device only: they never sync, and never move to another device
/// in a backup. The hand-off copy syncs through iCloud Keychain, which only Crewluve on this partner's
```

with:

```swift
/// The keys in the Keychain, each as a generic password that iOS can read in the background once the
/// phone has been unlocked since it started, so a push at night still finds them. This device's key,
/// the pending key and the pilot's name are for this device only: they never sync, and never move to
/// another device in a backup. The hand-off copy syncs through iCloud Keychain, which only Crewluve on this partner's
```

In `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift`, replace:

```swift
        case handOffCopy

        var syncs: Bool { self == .handOffCopy }
```

with:

```swift
        case handOffCopy
        case pilotName

        var syncs: Bool { self == .handOffCopy }
```

In `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift`, replace:

```swift
    func forgetHandOffCopy() {
        SecItemDelete(item(.handOffCopy) as CFDictionary)
    }
```

with:

```swift
    func forgetHandOffCopy() {
        SecItemDelete(item(.handOffCopy) as CFDictionary)
    }

    func pilotName() throws(DeviceKeyUnreadable) -> String? {
        try key(in: .pilotName)
    }

    @discardableResult
    func save(pilotName: String) -> Bool {
        save(pilotName, in: .pilotName)
    }

    func forgetPilotName() {
        SecItemDelete(item(.pilotName) as CFDictionary)
    }
```

In `Crewluv/Models/PartnerConnection.swift`, replace:

```swift
    let defaults: UserDefaults

    /// This device's partner id on Crewlu Cloud, or nil while it follows its pilot through iCloud.
```

with:

```swift
    let defaults: UserDefaults
    /// Where the alerts' title name is kept too, beside this device's key, for the alert pushes' helper (alert
    /// pushes spec §6.2). The status source gives it.
    var keyStore: DeviceKeyStore? = nil

    /// This device's partner id on Crewlu Cloud, or nil while it follows its pilot through iCloud.
```

In `Crewluv/Models/PartnerConnection.swift`, replace:

```swift
        let name = savedDisplayName
        let status = reading.status(at: Date())
        pilotID = status.pilotId
        pilotName = name ?? status.pilotFirstName
        sharingEndedWith = nil
        return name
    }
```

with:

```swift
        let name = savedDisplayName
        let status = reading.status(at: Date())
        pilotID = status.pilotId
        pilotName = name ?? status.pilotFirstName
        if let keyStore, let title = pilotName, (try? keyStore.pilotName()) != title {
            keyStore.save(pilotName: title)
        }
        sharingEndedWith = nil
        return name
    }
```

In `Crewluv/Models/PartnerConnection.swift`, replace:

```swift
        for key in keys {
            defaults.removeObject(forKey: key)
        }
    }
```

with:

```swift
        for key in keys {
            defaults.removeObject(forKey: key)
        }
        keyStore?.forgetPilotName()
    }
```

In `Crewluv/Services/PilotStatusSource.swift`, replace:

```swift
        connection = PartnerConnection(defaults: defaults)
```

with:

```swift
        connection = PartnerConnection(defaults: defaults, keyStore: keys)
```

In `Crewluv/Services/CloudKitShareManager.swift`, replace:

```swift
        UserDefaults.standard.removeObject(forKey: "ResolvedPilotDisplayName")
        UserDefaults.standard.removeObject(forKey: "LastSeenPilotSnapshot")
```

with:

```swift
        UserDefaults.standard.removeObject(forKey: "ResolvedPilotDisplayName")
        KeychainDeviceKeyStore().forgetPilotName()
        UserDefaults.standard.removeObject(forKey: "LastSeenPilotSnapshot")
```

- [ ] **Step 4: Run them to see them pass**

Run:

```bash
export HARNESS=<your harness folder> && "$HARNESS/run.sh"
```

Expected: `Test run with 339 tests in 31 suites passed`.

- [ ] **Step 5: Commit**

```bash
cd ~/Dev/Crewluv && git add CrewluvTests/PilotStatusSourceTests.swift CrewluvTests/KeychainDeviceKeyStoreTests.swift CrewluvTests/Helpers/PartnerCloudStandIns.swift Crewluv/Services/PartnerCloud/DeviceKeyStore.swift Crewluv/Models/PartnerConnection.swift Crewluv/Services/PilotStatusSource.swift Crewluv/Services/CloudKitShareManager.swift && git commit -q -m "feat(crewluv): the alerts' title name kept beside the key, for the alert pushes' helper (alert pushes spec §6.2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

### Task 7: Compile everything, without a simulator

**Files (outside both repos):** `$BUILD/order_check.py`

This is piece 4b's Task 23, unchanged. The build runs in a separate clone of the branch, with its own build folder, so it can't disturb the user's open Xcode or touch a simulator. It compiles the app and `CrewluvTests`, including the views, `AppDelegate` and the Keychain tests the harness can't build. Then the order check repeats the test target's compile with its files in eight orders.

- [ ] **Step 1: Make the clone**

Run:

```bash
export BUILD=<your build folder> && rm -rf "${{BUILD:?set BUILD first}}" && mkdir -p "$BUILD" && git clone -q --shared ~/Dev/Crewluv "$BUILD/crewluv" && git -C "$BUILD/crewluv" switch -q feature/alert-pushes && git -C "$BUILD/crewluv" log --oneline -1
```

Expected: the branch's last commit: Task 6's, or a later fix from Task 8.

- [ ] **Step 2: Build for testing**

It takes a few minutes, so run it in the background and wait for it to finish.

Run:

```bash
export BUILD=<your build folder> && cd "$BUILD/crewluv" && xcodebuild build-for-testing -project Crewluv.xcodeproj -scheme Crewluv -destination "generic/platform=iOS Simulator" -derivedDataPath "$BUILD/derived" -quiet > "$BUILD/build.log" 2>&1; echo "exit $?"; echo "errors: $(grep -c " error: " "$BUILD/build.log")"; echo "warnings: $(grep -c " warning: " "$BUILD/build.log")"
```

Expected: `exit 0`, `errors: 0` and `warnings: 0`.

- [ ] **Step 3: Write the order check**

Copy `order_check.py` from piece 4b's plan, Task 23 Step 3 (`docs/superpowers/plans/2026-10-19-partner-links-piece4b-connecting.md`), unchanged, to `$BUILD/order_check.py`.

- [ ] **Step 4: Check the test target in every order**

It takes about five minutes, so run it in the background too.

Run:

```bash
export BUILD=<your build folder> && python3 "$BUILD/order_check.py" "$BUILD"
```

Expected: `8 orders, 0 failed`, after sixteen `ok` lines. A `FAIL` line names the file and the error: fix it, then build again. Nothing to commit.

### Task 8: Review

**Files:** whatever the review finds.

- [ ] **Step 1: Ask for a review**

Use superpowers:requesting-code-review with a read-only reviewer. It reads:
- `git -C ~/Dev/Crewluv diff 4333994..feature/alert-pushes`;
- this plan, spec §6.2, §6.3, §9.3 and §15, and plan 2a's decisions;
- partner-push's rules, which these must match: `~/Dev/Duty/supabase/functions/partner-push/index.ts`.

It may run `"$HARNESS/run.sh"`; no `xcodebuild` and no simulator. State facts neutrally, and don't tell it what not to flag.

- [ ] **Step 2: Act on it**

For each finding, fix it test-first where the harness can test it, re-run `"$HARNESS/run.sh"`, and commit. A change to the rules changes the shared cases in CrewLu first (plan 2a's file), then their copy here. If any Swift changed, run Task 7 again. Note each fix in this plan's Execution notes.

### Task 9: The user runs Crewluve's tests

**Files:** none.

- [ ] **Step 1: Ask the user to run the tests in Xcode**

Send them these steps:

1. In Xcode, open `~/Dev/Crewluv/Crewluv.xcodeproj` if it isn't open. At the top of the window, check that the scheme says **Crewluv** and the destination is an iPhone **simulator** (such as iPhone 17 Pro), not your phone. On a phone, the tests that read their fixtures from the Mac skip.
2. Press **⌘U** (Product → Test) and wait for it to finish.
3. Press **⌘6** to open the Test navigator. Red marks show failures.

Expected: no failures. The console's last Swift Testing line says `Test run with 351 tests in 32 suites passed`: the harness's 339, and the 12 `KeychainDeviceKeyStoreTests`, counted before Task 8's fixes. The new and changed suites:

| Suite | Tests |
|---|---|
| `AlertWordingTests` (new) | 8 |
| `AlertCasesTests` (new) | 2 |
| `StatusChangeNotifierTests` (new) | 4 |
| `PilotStatusSourceTests` | 4 new, and the name's |
| `PushRegistrarTests` | 4 new |
| `KeychainDeviceKeyStoreTests` | 12 (was 11) |
| `LivePartnerDoorTests` | `setPush`'s, changed |
| `LegsComparisonTests` | the departure's, changed |

- [ ] **Step 2: If anything fails, stop**

Ask for the test's name and its message. Fix the cause, never the test's expected value, then ask for another run.

### Task 10: Record and go on

**Files:** this plan.

- [ ] **Step 1: Tick this plan, and note what changed from it**

In `~/Dev/Crewluve Website`, tick the steps done and fill in the Execution notes. Commit only this plan's file. Don't push.

- [ ] **Step 2: Plan 2c**

The branch stays as it is: plan 2c adds the helper on it. Nothing is merged or pushed until plan 3, the release.

---

## Execution notes

Filled in during the build: any place the code ends up different from the printed blocks, and why.
