# Partner Alert Pushes, Plan 2c: The Alert Pushes' Helper — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crewluve 1.3 gets its helper, `CrewluveAlerts`, a notification service extension that iOS runs for each alert push. It reads the pilot's status with this device's key, from Crewluve's own Keychain group, and writes the kind's words over "New update", or the kind's plain line (spec §6.1, §6.2). Then the spec records plans 2b's and 2c's decisions.

**Architecture:**
- **`AlertPushWriter`,** in the app's folder and built by both targets: the kind from the push, the plain line titled with the saved name, and the words from `partner_view`'s status, worked out as the app's own alerts are.
- **`PendingAlertPush`,** beside it: delivers the alert once, with its words, or with the plain line when iOS's time runs out.
- **`NotificationService`,** the helper's one file of its own: nonisolated, it runs the writer on the main actor.
- **The target** is made by the user's Xcode steps (Task 3), then a script reads the project file and xcodebuild's settings to check them (Task 4).

**Tech Stack:** Swift (Swift 5 mode, the main actor by default, Approachable Concurrency), UserNotifications' `UNNotificationServiceExtension`, Swift Testing, the Mac harness, and `xcodebuild build-for-testing` to compile only.

---

## Before you start

- **Plans 2a and 2b first:** `feature/alert-pushes` in `~/Dev/Crewluv` holds plan 2b's commits, and the user's ⌘U for plan 2b passed (its Task 9).
- **The spec:** `~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`. Read §5.4 (the alert push), §6.1 (the helper), §6.2 (the key and the name), §6.4 (the plain lines) and §9.3 (Crewluve's tests), with plan 2b's decisions.
- **Crewluve's rule,** as in plan 2b:
  - never run `xcodebuild test`, never boot a simulator, and never build in `~/Dev/Crewluv`, the copy the user has open in Xcode;
  - the test-first steps use plan 2b's harness, and Task 5 compiles everything in a separate clone;
  - Task 4's `xcodebuild -showBuildSettings` reads a copy of the project file and builds nothing;
  - the user makes the target (Task 3) and runs Crewluve's tests (Task 8).
- **Two scratch folders,** outside both repos, both absolute paths, as in plan 2b: **`$HARNESS`**, plan 2b's harness, and **`$BUILD`**. Shell variables don't carry from one command to the next in Claude's Bash tool, so begin each command that uses them with `export HARNESS=<the folder> &&` (or `BUILD`).
- **The Crewluv repo is public:** no names, emails or tokens in it.
- **Pushes:** never push without the user's fresh yes.

## Decisions made while planning

These refine the spec. Task 9 writes them into it, with plan 2b's.

1. **The helper is `CrewluveAlerts`,** embedded in Crewluve, with the bundle id `com.ToddAnderson.Crewluv.CrewluveAlerts`. It has the app's version and build, iOS 26.0, iPhone and iPad, and the app's Swift settings: Swift 5, the main actor by default, Approachable Concurrency and Member Import Visibility. This Mac's Xcode is 27.1, which may start a new target at iOS 27.1, so Task 3 sets 26.0.
2. **It builds 15 of the app's files** through Target Membership: the words and the writer, the door, the key store, the summary and its translation, the trip resolver, and what those need. Planning type-checked them as an app extension, the fewest that compile. The writer lives in the app's folder, so `CrewluvTests` tests it, and the helper has no tests of its own.
3. **Its one Keychain group is Crewluve's own,** `$(AppIdentifierPrefix)com.ToddAnderson.Crewluv` (spec §6.2). As its first group, it's also where a query that names no group looks, so `KeychainDeviceKeyStore` reads the app's items unchanged. The app's entitlements don't change.
4. **`NotificationService` is nonisolated.** iOS calls it on a thread of its own choosing. With the app's settings, Xcode would make the class main-actor, which holds only on the main thread. The writer runs on the main actor, as the door and the key store do.
5. **The alert is delivered once** (`PendingAlertPush`): with its words; or, when iOS's time runs out first, with the plain line, or as the push came if even that isn't ready. Words that come later are dropped.
6. **The words are worked out as the app's own alerts' are:**
   - the status for this partner at the moment (`CloudSummary.pilotStatus`);
   - titled with the name the pilot set for this partner, else the pilot's first name;
   - the effective delay at the moment;
   - the home arrival from the legs at the moment, else the summary's.

   The plain line's title is the name the app saved beside the key (plan 2b), or none.
7. **A script checks the Xcode steps:** `check_nse.py` reads the project file, the helper's Info.plist and entitlements, and the settings xcodebuild works out for a copy of the project file. Planning tried it on the 13 likeliest slips.
8. **The order check takes a module,** so Task 5 checks the helper's files in eight orders, as well as the tests'.
9. **For plan 3:** a version bump changes both targets (1.3 (45)). The first archive's automatic signing makes the helper's App ID. §9.4's first check proves the Keychain group on a real phone.

## How this plan was checked

- **The helper's files** type-check as an app extension with the app's Swift flags: the 15 app files and `NotificationService.swift`, with no errors and no warnings.
- **Built test-first in a scratch clone** of plan 2b's end, with the harness: 355 tests in 32 suites.
- **Deliberate breaks:** 14 one-line breaks of the writer and the delivery, each caught by a test.
- **The target:** a scratch script added it to a copy of the project file the way Task 3 should leave it.
  - **The compile-only build** passed with no errors and no warnings.
  - **The app holds `PlugIns/CrewluveAlerts.appex`:** iOS 26.0, 1.2 (44), and the Keychain group above.
  - **The order check** passed for both targets.
- **The check script** says "all checks ok" on that project, and gives a FIX naming the place in Xcode for each of 13 likely slips.
- **A replay:** Tasks 1–6 from this plan's own text on a fresh clone of plan 2b's end, with the scratch script standing in for Task 3's clicks. Every Run printed its expected result, and the files equal the scratch build's.

## Files

- **Create:** `Crewluv/Services/PartnerCloud/AlertPushWriter.swift` and `CrewluvTests/AlertPushWriterTests.swift`.
- **Xcode makes them (Task 3):** the `CrewluveAlerts` target, and its folder's `NotificationService.swift` (replaced in Task 4), `Info.plist` and `CrewluveAlerts.entitlements`, with the project file's changes.
- **Modify:** `CLAUDE.md`.
- **Outside both repos:** `$BUILD/check_nse.py` and `$BUILD/order_check.py`.

---

### Task 0: The branch

**Files:** none.

- [ ] **Step 1: Check the checkout**

Run:

```bash
git -C ~/Dev/Crewluv status --short && git -C ~/Dev/Crewluv branch --show-current && git -C ~/Dev/Crewluv log --oneline -1
```

Expected: `feature/alert-pushes`, then plan 2b's last commit: Task 6's, or a later fix. Note its id: Task 7's review starts from it. The status lists nothing but the untracked `.claude/` and `.superpowers/`, if they're there. Otherwise, stop and ask.

### Task 1: The harness

**Files:** none.

Plan 2b's harness, unchanged. Its `run.sh` copies every file in `Services/PartnerCloud/`, so the writer joins it by itself. If `$HARNESS` is gone, make it again from plan 2b's Task 1.

- [ ] **Step 1: Run today's tests**

Run:

```bash
export HARNESS=<your harness folder> && "$HARNESS/run.sh"
```

Expected: `Test run with 341 tests in 31 suites passed`.

### Task 2: The writer

**Files:** Create `Crewluv/Services/PartnerCloud/AlertPushWriter.swift` and `CrewluvTests/AlertPushWriterTests.swift`.

Spec §6.1's steps, apart from iOS:
- **The kind:** read from the push; one this app doesn't know keeps the push's own words.
- **The key:** with no key, or one the Keychain can't give yet, the plain line, without asking Crewlu Cloud.
- **The status:** `partner_view` without `since`. A status that fits gives the kind's words, as the app's own alerts would. Any other answer, or a status that no longer fits, gives the plain line.
- **The plain line:** titled with the name the app saved beside the key, or with no title.
- **Delivery:** once, with the words, or the plain line when iOS's time runs out.

- [ ] **Step 1: Write the failing tests**

Create `CrewluvTests/AlertPushWriterTests.swift`:

```swift
//
//  AlertPushWriterTests.swift
//  CrewluvTests
//
//  The alert pushes' helper writes the kind's words from the status it reads, or the plain line (alert pushes
//  spec §6.1, §9.3)
//

import Foundation
import Testing
@testable import Crewluv

@MainActor
struct AlertPushWriterTests {
    private let door = StandInPartnerDoor()
    private let keys = InMemoryDeviceKeyStore()
    /// A time zone few Macs are in, so the times read in the writer's own, not the Mac's.
    private static let kolkata = TimeZone(identifier: "Asia/Kolkata")!
    /// Shortly after `Make.summary`'s default moment.
    private static let now = Date(timeIntervalSince1970: 1_792_606_000)

    init() {
        keys.key = Make.key
        keys.name = "Dad"
    }

    private var writer: AlertPushWriter {
        AlertPushWriter(door: door, keys: keys, timeZone: Self.kolkata)
    }

    private func words(for kind: AlertKind) async -> AlertPushWords {
        await writer.words(for: kind, at: Self.now)
    }

    /// The door answers with a summary for partner A with `fields`.
    private func answers(_ fields: [String: Any]) throws {
        door.viewAnswers = [Make.answer(updatedAt: "2026-10-21T18:00:00.000Z", try Make.summary(fields))]
    }

    @Test func test_theKind_isReadFromThePush_andOneThisAppDoesntKnow_keepsThePushsOwnWords() {
        #expect(AlertPushWriter.kind(of: ["kind": "quick-status", "aps": [:]]) == .quickStatus)
        #expect(AlertPushWriter.kind(of: ["kind": "trips-cancelled"]) == .tripsCancelled)
        #expect(AlertPushWriter.kind(of: ["kind": "something-later"]) == nil)
        #expect(AlertPushWriter.kind(of: [:]) == nil)
    }

    @Test func test_aStatusThatFits_isWrittenInTheKindsWords_underTheNameThePilotSetForThisPartner() async throws {
        try answers([
            "quickStatus": "Call Me", "quickStatusExpiry": 1_792_609_600, "displayNameByPartner": [Make.partnerA: "Captain"],
        ])

        #expect(await words(for: .quickStatus) == AlertPushWords(title: "Captain", body: "is asking you to call"))
        #expect(door.views.map(\.key) == [Make.key])
        #expect(door.views.map(\.since) == [nil], "the whole status, every time")
    }

    @Test func test_withNoNameForThisPartner_theTitleIsThePilotsFirstName() async throws {
        try answers(["quickStatus": "Free to Talk"])

        #expect(await words(for: .quickStatus) == AlertPushWords(title: "Alex", body: "is free to talk"))
    }

    @Test func test_aDelay_isTitledWithTheFlight_withTheDelayAtTheMoment_asOnALeg() async throws {
        try answers(["flightDelayMinutes": 45])
        #expect(await words(for: .delayed) == AlertPushWords(title: "Alex's Flight", body: "Delayed 45 minutes"))

        try answers(["tripLegs": [Self.leg(from: 1_792_605_000, to: 1_792_612_800, delay: 30)]])
        #expect(await words(for: .delayed) == AlertPushWords(title: "Alex's Flight", body: "Delayed 30 minutes"))
    }

    @Test func test_theWayHome_isTheArrivalTheLegsGiveAtTheMoment_readInThePhonesTimeZone() async throws {
        try answers([
            "homeAirportCode": "ATL",
            "homeArrivalTime": 1_792_627_200,
            "tripLegs": [Self.leg(from: 1_792_630_800, to: 1_792_634_400, arriving: "ATL")],
        ])
        #expect(await words(for: .homeLater) == AlertPushWords(title: "Alex", body: "Getting home later — now 7:30 AM"))

        try answers(["homeArrivalTime": 1_792_627_200])
        #expect(await words(for: .homeEarlier) == AlertPushWords(title: "Alex", body: "Getting home earlier — now 5:30 AM"),
                "with no legs, the summary's own")
    }

    /// A flight leg of trip T1, as a summary has it.
    private static func leg(
        from start: TimeInterval, to end: TimeInterval, arriving airport: String = "SDF", delay: Int? = nil
    ) -> [String: Any] {
        var leg: [String: Any] = [
            "id": "leg-\(Int(start))", "tripId": "T1", "type": "flight", "startTime": start, "endTime": end,
            "arrivalAirport": airport,
        ]
        leg["delayMinutes"] = delay
        return leg
    }

    @Test func test_aStatusThatNoLongerFits_givesThePlainLine() async throws {
        try answers([:])

        #expect(await words(for: .quickStatus) == AlertPushWords(title: "Dad", body: "sent a quick status"))
    }

    @Test func test_eachAnswerThatIsntAStatus_givesThePlainLine_andTheKeyIsKept() async {
        door.viewAnswers = [
            .failure(.refused(.sharingEnded)),
            .failure(.unavailable),
            Make.noSummaryYet,
            Make.unchanged(updatedAt: "2026-10-21T18:00:00.000Z"),
        ]

        for _ in 0..<4 {
            #expect(await words(for: .tripCancelled) == AlertPushWords(title: "Dad", body: "Trip was cancelled"))
        }
        #expect(door.views.count == 4)
        #expect(keys.key == Make.key, "a sharing_ended is left for the app")
    }

    @Test func test_aTimeout_givesThePlainLine() async {
        // The door's 20-second limit ends a call as unavailable, and with no answers left the stand-in door is that.
        #expect(await words(for: .newTrip) == AlertPushWords(title: "Dad", body: "Has a new trip"))
    }

    @Test func test_withNoKey_thePlainLine_withoutAsking() async {
        keys.key = nil

        #expect(await words(for: .home) == AlertPushWords(title: "Dad", body: "is home!"))
        #expect(door.views.isEmpty)
    }

    @Test func test_beforeTheFirstUnlock_thePlainLine_withNoTitle() async {
        keys.readFails = true

        #expect(await words(for: .delayed) == AlertPushWords(title: "", body: "Flight delayed"))
        #expect(door.views.isEmpty)
    }

    @Test func test_thePlainLine_isTitledWithTheSavedName_orHasNoTitle() {
        #expect(writer.plainLine(for: .newTrips) == AlertPushWords(title: "Dad", body: "Has new trips"))
        keys.name = nil
        #expect(writer.plainLine(for: .newTrips) == AlertPushWords(title: "", body: "Has new trips"))
    }

    @Test func test_thePendingAlert_isDeliveredOnce_withItsWords() {
        var delivered: [AlertPushWords?] = []
        let pending = PendingAlertPush()
        pending.start { delivered.append($0) }
        pending.hold(AlertPushWords(title: "Dad", body: "sent a quick status"))

        pending.finish(with: AlertPushWords(title: "Dad", body: "is asking you to call"))
        pending.expire()

        #expect(delivered == [AlertPushWords(title: "Dad", body: "is asking you to call")])
    }

    @Test func test_whenTimeRunsOutFirst_thePlainLine_andTheWordsAfterAreDropped() {
        var delivered: [AlertPushWords?] = []
        let pending = PendingAlertPush()
        pending.start { delivered.append($0) }
        pending.hold(AlertPushWords(title: "Dad", body: "sent a quick status"))

        pending.expire()
        pending.finish(with: AlertPushWords(title: "Dad", body: "is asking you to call"))

        #expect(delivered == [AlertPushWords(title: "Dad", body: "sent a quick status")])
    }

    @Test func test_whenTimeRunsOutBeforeThePlainLine_thePushAsItCame() {
        var delivered: [AlertPushWords?] = []
        let pending = PendingAlertPush()
        pending.start { delivered.append($0) }

        pending.expire()

        #expect(delivered == [nil])
    }
}
```

- [ ] **Step 2: Run them to see them fail**

Run:

```bash
export HARNESS=<your harness folder> && "$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `cannot find 'AlertPushWords' in scope` and `cannot find 'PendingAlertPush' in scope`.

- [ ] **Step 3: Write the writer**

Create `Crewluv/Services/PartnerCloud/AlertPushWriter.swift`:

```swift
//
//  AlertPushWriter.swift
//  CrewLuve
//
//  What an alert push says, written by the alert pushes' helper from the pilot's status
//

import Foundation

/// What an alert push says once the helper has written it: a title, empty for none, and a body.
nonisolated struct AlertPushWords: Equatable, Sendable {
    let title: String
    let body: String
}

/// The alert pushes' helper's steps (alert pushes spec §6.1). An alert push carries only its kind, so the helper reads
/// the pilot's status with this device's key and writes the kind's words from it, as the app's own alerts would. Short of
/// a status that fits the kind, it writes the kind's plain line. It only reads: it never forgets a key or changes the
/// connection, and it leaves a sharing_ended for the app to find. Both this app and the helper target build it.
struct AlertPushWriter {
    let door: PartnerDoor
    let keys: DeviceKeyStore
    var timeZone: TimeZone = .current

    /// The kind an alert push names, or nil for one this Crewluve doesn't know, which keeps the push's own words.
    nonisolated static func kind(of userInfo: [AnyHashable: Any]) -> AlertKind? {
        (userInfo["kind"] as? String).flatMap(AlertKind.init(rawValue:))
    }

    /// The kind's plain line (spec §6.4), titled with the name the app keeps beside the key (§6.2), or with no title
    /// when there's none or the Keychain can't be read yet.
    func plainLine(for kind: AlertKind) -> AlertPushWords {
        AlertPushWords(title: (try? keys.pilotName()) ?? "", body: AlertWording.plainLine(for: kind))
    }

    /// The words for `kind` from the status Crewlu Cloud has for this device at `now`, worked out as the app's own
    /// alerts work them out. The plain line instead with no key, or one the Keychain can't give yet, when the door
    /// refuses or is unavailable, before the first summary, and when the status no longer fits the kind.
    func words(for kind: AlertKind, at now: Date = Date()) async -> AlertPushWords {
        guard let key = try? keys.deviceKey() else {
            debugLog("[AlertPush] No key to read with: the plain line")
            return plainLine(for: kind)
        }
        let answer: PartnerViewAnswer
        do {
            answer = try await door.view(key: key, since: nil)
        } catch {
            debugLog("[AlertPush] partner_view gave no status (\(error)): the plain line")
            return plainLine(for: kind)
        }
        guard case .summary(let summary) = answer.content else {
            debugLog("[AlertPush] No summary yet: the plain line")
            return plainLine(for: kind)
        }
        let status = summary.pilotStatus(partnerID: answer.partnerID, at: now)
        let homeArrival = TripStateResolver.resolveHomeArrival(
            legs: status.tripLegs, homeAirportCode: status.homeAirportCode, at: now
        )
        guard let words = AlertWording.words(
            for: kind,
            name: summary.displayName(for: answer.partnerID) ?? status.pilotFirstName,
            status: status,
            effectiveDelay: status.effectiveFlightDelayMinutes(at: now) ?? 0,
            homeArrival: homeArrival?.arrivalTime ?? status.homeArrivalTime,
            timeZone: timeZone
        ) else {
            debugLog("[AlertPush] The status no longer fits \(kind.rawValue): the plain line")
            return plainLine(for: kind)
        }
        return AlertPushWords(title: words.title, body: words.body)
    }
}

/// An alert push being written, delivered once from any thread: with its words when they're ready, or, when iOS's time
/// runs out first, with the plain line, or as the push came if even that isn't ready yet.
nonisolated final class PendingAlertPush: @unchecked Sendable {
    private let lock = NSLock()
    private var deliver: OneTimeCompletion<AlertPushWords?>?
    private var plainLine: AlertPushWords?

    /// Waits to deliver the alert push with `deliver`: given its words or the plain line, or nil for the push as it came.
    func start(_ deliver: @escaping (AlertPushWords?) -> Void) {
        lock.withLock { self.deliver = OneTimeCompletion(deliver) }
    }

    /// Keeps the kind's plain line, for when iOS's time runs out.
    func hold(_ plainLine: AlertPushWords) {
        lock.withLock { self.plainLine = plainLine }
    }

    /// Delivers the words, unless the alert push was delivered already.
    func finish(with words: AlertPushWords) {
        lock.withLock { deliver }?(words)
    }

    /// iOS's time is nearly up: delivers the plain line, or the push as it came, unless it was delivered already.
    func expire() {
        let (deliver, plainLine) = lock.withLock { (deliver, plainLine) }
        deliver?(plainLine)
    }
}
```

- [ ] **Step 4: Run them to see them pass**

Run:

```bash
export HARNESS=<your harness folder> && "$HARNESS/run.sh"
```

Expected: `Test run with 355 tests in 32 suites passed`.

- [ ] **Step 5: Commit**

```bash
cd ~/Dev/Crewluv && git add Crewluv/Services/PartnerCloud/AlertPushWriter.swift CrewluvTests/AlertPushWriterTests.swift && git commit -q -m "feat(crewluv): the alert pushes' helper's steps: the kind's words from the status read now, or the plain line, delivered once (alert pushes spec §6.1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

### Task 3: The helper target, made by the user in Xcode

**Files:** Xcode makes them.

- [ ] **Step 1: Ask the user to make the target**

Send them these steps, as written:

1. **Add the target.**
   1. In Xcode, with `~/Dev/Crewluv/Crewluv.xcodeproj` open, choose **File → New → Target…**.
   2. At the top, choose **iOS**. Under **Application Extension**, choose **Notification Service Extension**, then **Next**.
   3. Fill in:
      - **Product Name:** `CrewluveAlerts`
      - **Team:** the same as Crewluve's
      - **Organization Identifier:** `com.ToddAnderson.Crewluv`, which Xcode usually fills in, so that **Bundle Identifier** reads `com.ToddAnderson.Crewluv.CrewluveAlerts`
      - **Language:** Swift
      - **Project:** Crewluv
      - **Embed in Application:** Crewluv
   4. Click **Finish**. If Xcode asks whether to activate the "CrewluveAlerts" scheme, choose **Don't Activate** (or **Cancel**), so the scheme stays **Crewluv**.
2. **Its General tab.** Click the blue **Crewluv** project at the top of the Project navigator. Under **TARGETS**, select **CrewluveAlerts**, then **General**.
   - **Supported Destinations:** iPhone and iPad only. If **Mac (Designed for iPad)** or **Apple Vision (Designed for iPad)** is listed, select it and click **−**.
   - **Minimum Deployments:** iOS `26.0`.
   - **Identity:** **Version** `1.2` and **Build** `44`, the same as the Crewluv target's General tab shows.
3. **Its Build Settings tab,** with **All** and **Combined** selected. Type each name below in the tab's search field and check the value, changing it if it differs. Each is what the Crewluv target has.
   - **Default Actor Isolation:** MainActor
   - **Approachable Concurrency:** Yes
   - **Swift Language Version:** Swift 5
   - **Member Import Visibility:** Yes
4. **Its Signing & Capabilities tab,** with **All** selected.
   1. Check that **Automatically manage signing** is ticked and **Team** is Crewluve's.
   2. Click **+ Capability** and double-click **Keychain Sharing**.
   3. Under **Keychain Groups**, Xcode adds one group, `com.ToddAnderson.Crewluv.CrewluveAlerts`. Double-click it, change it to `com.ToddAnderson.Crewluv`, and press Return. That's Crewluve's own group, where the app keeps its key.
   4. Don't add Keychain Sharing to the **Crewluv** target.
5. **The shared files.** In the Project navigator, open the `Crewluv` folder. Click the first of these 15 files, then ⌘-click each of the others:
   - `Models/`: `AlertWording.swift`, `CloudSummary.swift`, `HandOffCode.swift`, `PartnerLink.swift`, `PilotDisplayStatus.swift`, `SharedPilotStatus.swift`, `TripLeg.swift`, `TripStateResolver.swift`
   - `Services/PartnerCloud/`: `AlertPushWriter.swift`, `DeviceKeyStore.swift`, `LivePartnerDoor.swift`, `PartnerDoor.swift`
   - `Utils/`: `DebugLog.swift`, `OneTimeCompletion.swift`, `PushEnvironment.swift`

   Open the File inspector (**View → Inspectors → File**, or ⌥⌘1). Under **Target Membership**, add **CrewluveAlerts**, by ticking it or with **+**, and keep **Crewluv**. If Xcode won't take them all at once, do a few at a time.
6. **Tell Claude "done".** No need to build: Claude checks the target next, and Crewluve's tests come at the end.

- [ ] **Step 2: Wait for "done"**

### Task 4: Check the target, and write the helper

**Files:** Replace `CrewluveAlerts/NotificationService.swift`. Outside the repos: `$BUILD/check_nse.py`.

- [ ] **Step 1: Write the check**

It reads the project file, the helper's Info.plist and entitlements, and the settings xcodebuild works out for a copy of the project file, so nothing is built and the user's open project isn't touched.

Create `$BUILD/check_nse.py`:

```python
#!/usr/bin/env python3
"""Checks the alert pushes' helper target after the Xcode steps (plan 2c, Task 3), without building: reads the project
file, the helper's Info.plist and entitlements, and the build settings xcodebuild reports for a copy of the project
file. Usage: check_nse.py <Crewluv checkout>. Prints "ok" or "FIX" for each check, and exits 1 if anything needs fixing.
"""
import json, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(sys.argv[1]).expanduser()
PROJECT = ROOT / 'Crewluv.xcodeproj' / 'project.pbxproj'
HELPER = 'CrewluveAlerts'
SHARED = sorted([
    'Models/AlertWording.swift', 'Models/CloudSummary.swift', 'Models/HandOffCode.swift', 'Models/PartnerLink.swift',
    'Models/PilotDisplayStatus.swift', 'Models/SharedPilotStatus.swift', 'Models/TripLeg.swift',
    'Models/TripStateResolver.swift', 'Services/PartnerCloud/AlertPushWriter.swift',
    'Services/PartnerCloud/DeviceKeyStore.swift', 'Services/PartnerCloud/LivePartnerDoor.swift',
    'Services/PartnerCloud/PartnerDoor.swift', 'Utils/DebugLog.swift', 'Utils/OneTimeCompletion.swift',
    'Utils/PushEnvironment.swift',
])
# Each setting the helper must share with the app, and where it's set in Xcode.
SAME_AS_APP = {
    'IPHONEOS_DEPLOYMENT_TARGET': 'General → Minimum Deployments',
    'MARKETING_VERSION': 'General → Identity → Version',
    'CURRENT_PROJECT_VERSION': 'General → Identity → Build',
    'DEVELOPMENT_TEAM': 'Signing & Capabilities → Team',
    'SWIFT_VERSION': 'Build Settings → Swift Language Version',
    'SWIFT_DEFAULT_ACTOR_ISOLATION': 'Build Settings → Default Actor Isolation',
    'SWIFT_APPROACHABLE_CONCURRENCY': 'Build Settings → Approachable Concurrency',
    'SWIFT_UPCOMING_FEATURE_MEMBER_IMPORT_VISIBILITY': 'Build Settings → Member Import Visibility',
    'SWIFT_STRICT_CONCURRENCY': 'Build Settings → Strict Concurrency Checking',
    'TARGETED_DEVICE_FAMILY': 'General → Supported Destinations (iPhone and iPad)',
    'SUPPORTED_PLATFORMS': 'General → Supported Destinations (iPhone and iPad)',
    'SUPPORTS_MACCATALYST': 'General → Supported Destinations: remove Mac Catalyst',
    'SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD': 'General → Supported Destinations: remove Mac (Designed for iPad)',
    'SUPPORTS_XR_DESIGNED_FOR_IPHONE_IPAD': 'General → Supported Destinations: remove Apple Vision (Designed for iPad)',
}
failures = 0


def report(ok, what, fix=''):
    global failures
    failures += not ok
    print(f'ok   {what}' if ok else f'FIX  {what}: {fix}')


def plist(path):
    return json.loads(subprocess.run(['plutil', '-convert', 'json', '-o', '-', str(path)],
                                     capture_output=True, text=True, check=True).stdout)


def settings(project, target, configuration):
    out = subprocess.run(['xcodebuild', '-showBuildSettings', '-json', '-project', str(project), '-target', target,
                          '-configuration', configuration], capture_output=True, text=True)
    return json.loads(out.stdout)[0]['buildSettings'] if out.returncode == 0 else None


def main():
    objects = plist(PROJECT)['objects']
    targets = {o['name']: (k, o) for k, o in objects.items() if o.get('isa') == 'PBXNativeTarget'}
    if HELPER not in targets:
        report(False, f'a target named {HELPER}', 'File → New → Target… → Notification Service Extension (Task 3 Step 1)')
        sys.exit(1)
    helper_id, helper = targets[HELPER]
    app_id, app = targets['Crewluv']
    report(helper.get('productType') == 'com.apple.product-type.app-extension', f'{HELPER} is an app extension',
           'remove it and add a Notification Service Extension')

    embedded = any(
        objects[p].get('isa') == 'PBXCopyFilesBuildPhase' and objects[p].get('dstSubfolderSpec') == '13'
        and any(objects[objects[f]['fileRef']].get('path') == f'{HELPER}.appex' for f in objects[p].get('files', []))
        for p in app['buildPhases'])
    report(embedded, 'Crewluv embeds the helper', 'add the target again with "Embed in Application: Crewluv"')
    depends = any(objects[d].get('target') == helper_id for d in app.get('dependencies', []))
    report(depends, 'Crewluv depends on the helper', 'add the target again with "Embed in Application: Crewluv"')

    # The shared files: members of both targets.
    app_folder = next(objects[g] for g in app['fileSystemSynchronizedGroups'] if objects[g].get('path') == 'Crewluv')
    shared = sorted(f for e in app_folder.get('exceptions', []) if objects[e].get('target') == helper_id
                    for f in objects[e].get('membershipExceptions', []))
    missing = [f for f in SHARED if f not in shared]
    extra = [f for f in shared if f not in SHARED]
    report(not missing and not extra, f'the {len(SHARED)} shared files are in the helper too',
           (f'tick {HELPER} in Target Membership for {", ".join(missing)}' if missing else '')
           + ('; ' if missing and extra else '') + (f'untick {HELPER} for {", ".join(extra)}' if extra else ''))

    # Its build settings, as xcodebuild works them out, against the app's.
    with tempfile.TemporaryDirectory() as tmp:
        copy = Path(tmp) / 'Crewluv.xcodeproj'
        copy.mkdir()
        shutil.copy(PROJECT, copy / 'project.pbxproj')
        for configuration in ('Debug', 'Release'):
            mine, theirs = settings(copy, HELPER, configuration), settings(copy, 'Crewluv', configuration)
            if mine is None or theirs is None:
                report(False, f'{configuration} settings', 'xcodebuild could not read the project')
                continue
            for name, place in SAME_AS_APP.items():
                report(mine.get(name) == theirs.get(name), f'{configuration} {name} = {theirs.get(name)!r}',
                       f'it is {mine.get(name)!r}; set it in {HELPER}\'s {place}')
            bundle = theirs['PRODUCT_BUNDLE_IDENTIFIER'] + '.' + HELPER
            report(mine.get('PRODUCT_BUNDLE_IDENTIFIER') == bundle, f'{configuration} bundle id {bundle}',
                   f'it is {mine.get("PRODUCT_BUNDLE_IDENTIFIER")!r}; set it in General → Identity → Bundle Identifier')
            report(mine.get('APPLICATION_EXTENSION_API_ONLY') == 'YES', f'{configuration} extension-safe API only',
                   'set Build Settings → Require Only App-Extension-Safe API to Yes')
            report(mine.get('CODE_SIGN_ENTITLEMENTS') == f'{HELPER}/{HELPER}.entitlements',
                   f'{configuration} entitlements file {HELPER}/{HELPER}.entitlements',
                   f'it is {mine.get("CODE_SIGN_ENTITLEMENTS")!r}; add Keychain Sharing in Signing & Capabilities')

    # The Keychain group: Crewluve's own, on the helper only.
    entitlements = ROOT / HELPER / f'{HELPER}.entitlements'
    groups = plist(entitlements).get('keychain-access-groups') if entitlements.exists() else None
    report(groups == ['$(AppIdentifierPrefix)com.ToddAnderson.Crewluv'],
           "the helper's one Keychain group is Crewluve's own",
           f'it has {groups!r}; in Signing & Capabilities → Keychain Sharing, make the one group com.ToddAnderson.Crewluv')
    app_entitlements = plist(ROOT / 'Crewluv' / 'Crewluv.entitlements')
    report('keychain-access-groups' not in app_entitlements, "the app's entitlements have no Keychain group",
           "remove Keychain Sharing from the Crewluv target's Signing & Capabilities")

    info = ROOT / HELPER / 'Info.plist'
    extension = plist(info).get('NSExtension', {}) if info.exists() else {}
    report(extension.get('NSExtensionPointIdentifier') == 'com.apple.usernotifications.service'
           and extension.get('NSExtensionPrincipalClass') == '$(PRODUCT_MODULE_NAME).NotificationService',
           "the helper's Info.plist names a notification service, NotificationService",
           'add the target again from the Notification Service Extension template')
    report((ROOT / HELPER / 'NotificationService.swift').exists(), f'{HELPER}/NotificationService.swift is there',
           'add the target again from the Notification Service Extension template')

    print(f'{failures} to fix' if failures else 'all checks ok')
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Run it**

Run:

```bash
export BUILD=<your build folder> && mkdir -p "$BUILD" && python3 "$BUILD/check_nse.py" ~/Dev/Crewluv
```

Expected: an `ok` line for each check, ending `all checks ok`. Each line starting FIX says what to change and where in Xcode: send those to the user, wait for "done", and run it again.

- [ ] **Step 3: Write the helper**

Xcode's template made this file, with code of its own.

Replace the whole of `CrewluveAlerts/NotificationService.swift` with:

```swift
//
//  NotificationService.swift
//  CrewluveAlerts
//
//  The alert pushes' helper: writes what happened over an alert push's "New update"
//

import UserNotifications

/// iOS runs this for each alert push from Crewlu Cloud, whatever state Crewluve is in (alert pushes spec §6.1). The push
/// carries only its kind, "New update" and its sound. This writes the kind's words from the pilot's status, or the plain
/// line when there's no status to use or iOS's time runs out, and keeps the push's sound. A kind this Crewluve doesn't
/// know keeps the push as it came. Nonisolated, since iOS calls it on a thread of its choosing; the writer runs on the
/// main actor, as the app's door and Keychain code do.
nonisolated final class NotificationService: UNNotificationServiceExtension {
    private let pending = PendingAlertPush()

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        let push = request.content
        guard let kind = AlertPushWriter.kind(of: push.userInfo) else {
            contentHandler(push)
            return
        }
        pending.start { words in
            guard let words, let content = push.mutableCopy() as? UNMutableNotificationContent else {
                contentHandler(push)
                return
            }
            content.title = words.title
            content.body = words.body
            contentHandler(content)
        }
        Task { @MainActor [pending] in
            let writer = AlertPushWriter(door: LivePartnerDoor(), keys: KeychainDeviceKeyStore())
            pending.hold(writer.plainLine(for: kind))
            pending.finish(with: await writer.words(for: kind))
        }
    }

    override func serviceExtensionTimeWillExpire() {
        pending.expire()
    }
}
```

- [ ] **Step 4: See what changed**

Run:

```bash
git -C ~/Dev/Crewluv status --short
```

Expected: ` M Crewluv.xcodeproj/project.pbxproj` and `?? CrewluveAlerts/`. Xcode may also have changed its list of the user's schemes, xcschememanagement.plist, which the repo tracks. Anything else: stop and ask.

- [ ] **Step 5: Commit**

```bash
cd ~/Dev/Crewluv && git add -u Crewluv.xcodeproj && git add CrewluveAlerts && git commit -q -m "feat(crewluv): the alert pushes' helper, CrewluveAlerts: a notification service extension that reads the key from Crewluve's own Keychain group (alert pushes spec §6.1, §6.2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

### Task 5: Compile everything, without a simulator

**Files (outside both repos):** `$BUILD/order_check.py`

As plan 2b's Task 7: a separate clone of the branch, with its own build folder, so nothing touches the user's open Xcode or a simulator. Building the app builds the helper too, since the app embeds it.

- [ ] **Step 1: Make the clone**

Run:

```bash
export BUILD=<your build folder> && rm -rf "${BUILD:?set BUILD first}/crewluv" "$BUILD/derived" && git clone -q --shared ~/Dev/Crewluv "$BUILD/crewluv" && git -C "$BUILD/crewluv" switch -q feature/alert-pushes && git -C "$BUILD/crewluv" log --oneline -1
```

Expected: Task 4's commit, or a later fix from Task 7.

- [ ] **Step 2: Build for testing**

It takes a few minutes, so run it in the background and wait for it to finish.

Run:

```bash
export BUILD=<your build folder> && cd "$BUILD/crewluv" && xcodebuild build-for-testing -project Crewluv.xcodeproj -scheme Crewluv -destination "generic/platform=iOS Simulator" -derivedDataPath "$BUILD/derived" -quiet > "$BUILD/build.log" 2>&1; echo "exit $?"; echo "errors: $(grep -c " error: " "$BUILD/build.log")"; echo "warnings: $(grep -c " warning: " "$BUILD/build.log")"
```

Expected: `exit 0`, `errors: 0` and `warnings: 0`.

- [ ] **Step 3: Look at the helper in the app**

Run:

```bash
export BUILD=<your build folder> && python3 - "$BUILD" <<'EOF'
import json, subprocess, sys
from pathlib import Path
derived = Path(sys.argv[1]) / 'derived'
read = lambda path: json.loads(subprocess.run(['plutil', '-convert', 'json', '-o', '-', str(path)],
                                              capture_output=True, text=True, check=True).stdout)
appex = derived / 'Build/Products/Debug-iphonesimulator/Crewluv.app/PlugIns/CrewluveAlerts.appex'
info = read(appex / 'Info.plist')
xcent = derived / 'Build/Intermediates.noindex/Crewluv.build/Debug-iphonesimulator/CrewluveAlerts.build/CrewluveAlerts.appex-Simulated.xcent'
groups = read(xcent)['keychain-access-groups']
print('helper', info['CFBundleIdentifier'], info['CFBundleShortVersionString'], f"({info['CFBundleVersion']})", 'iOS', info['MinimumOSVersion'])
print('extension', info['NSExtension']['NSExtensionPointIdentifier'], info['NSExtension']['NSExtensionPrincipalClass'])
print('keychain groups:', ', '.join(group.split('.', 1)[1] for group in groups))
EOF
```

Expected: `helper com.ToddAnderson.Crewluv.CrewluveAlerts 1.2 (44) iOS 26.0`, `extension com.apple.usernotifications.service CrewluveAlerts.NotificationService` and `keychain groups: com.ToddAnderson.Crewluv`.

- [ ] **Step 4: Write the order check**

Piece 4b's `order_check.py` (its plan's Task 23 Step 3), which plan 2b ran unchanged, with the module to check as an optional second argument.

Create `$BUILD/order_check.py`:

```python
#!/usr/bin/env python3
"""Type-checks CrewluvTests, or another target, with its files in several orders, against what a build made.

Xcode compiles a target's files in the order its folder lists them, and a fresh clone lists them
differently, so a compiler problem that depends on order can pass in one and fail in the other
(plan 4a's first ⌘U). This takes the test target's swiftc command from the build's log, keeps what
describes the inputs, drops everything that writes outputs, and type-checks each order.

Each order is checked twice: type-checked whole, and as the module-making step Xcode runs on its
own, which skips function bodies. That second one is where plan 4a's first ⌘U failed.

Usage: order_check.py BUILD_DIR [MODULE]   (a build-for-testing's folder: crewluv/ and derived/ inside;
MODULE is the target's module, CrewluvTests unless given, such as CrewluveAlerts for the alert pushes' helper)
"""
import gzip, pathlib, random, re, shlex, subprocess, sys, tempfile

build = pathlib.Path(sys.argv[1]).resolve()
module = sys.argv[2] if len(sys.argv) > 2 else "CrewluvTests"
log = next((build / "derived/Logs/Build").glob("*.xcactivitylog"))
text = gzip.decompress(log.read_bytes()).decode("latin-1")
lines = ["".join(c if c.isprintable() else "\n" for c in line) for line in text.split("\n")]
command = next(
    re.sub(r"^\s*builtin-SwiftDriver -- ", "", part)
    for line in lines for part in line.split("\n")
    if "builtin-SwiftDriver -- " in part and f"-module-name {module} " in part
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
    "module": ["-emit-module", "-experimental-emit-module-separately", "-emit-module-path", str(out / f"{module}.swiftmodule")],
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

- [ ] **Step 5: Check the tests' files in every order**

It takes about five minutes, so run it in the background too.

Run:

```bash
export BUILD=<your build folder> && python3 "$BUILD/order_check.py" "$BUILD"
```

Expected: `38 files, 8 orders, 0 failed`, after sixteen `ok` lines. A line starting FAIL names the file and the error: fix it, then build again.

- [ ] **Step 6: Check the helper's files in every order**

Run:

```bash
export BUILD=<your build folder> && python3 "$BUILD/order_check.py" "$BUILD" CrewluveAlerts
```

Expected: `16 files, 8 orders, 0 failed`, after sixteen `ok` lines. Nothing to commit.

### Task 6: Crewluv's CLAUDE.md

**Files:** Modify `CLAUDE.md`.

Spec §11: the helper target, and that on Crewlu Cloud the alerts come from pushes.

- [ ] **Step 1: The alerts, the helper's folder, and its tests**

In `CLAUDE.md`, replace:

```markdown
- Refreshes on coming to the front, on pull-to-refresh and the refresh button, on silent pushes, in the background refresh, and every 60 seconds while in front on Crewlu Cloud

#### Connecting (`App/LinkRouter.swift`, `Services/PartnerJoiner.swift`)
```

with:

```markdown
- Refreshes on coming to the front, on pull-to-refresh and the refresh button, on silent pushes, in the background refresh, and every 60 seconds while in front on Crewlu Cloud

#### Alerts (`Services/StatusChangeNotifier.swift`, `CrewluveAlerts/`)
- `StatusChangeNotifier` compares each new status with the last one and keeps its snapshot. It names each alert by its kind, in `AlertWording`'s words, with the same rules as Crewlu Cloud's partner-push: the shared cases in `CrewluvTests/Fixtures/PartnerSummary/alert-cases.json` hold both to them
- On iCloud the app posts its own alerts. On Crewlu Cloud they come as alert pushes once Crewlu Cloud has accepted this device's push registration (`AlertPushes`). Until then, and for a read a hidden push asked for, the app posts its own
- An alert push carries only its kind. The helper target, `CrewluveAlerts` (a notification service extension), reads the status with this device's key and writes the kind's words, or a plain line (`AlertPushWriter`). It builds 15 of the app's files through Target Membership, reads the key from Crewluve's own Keychain group, and only reads

#### Connecting (`App/LinkRouter.swift`, `Services/PartnerJoiner.swift`)
```

In `CLAUDE.md`, replace:

````markdown
└── Utils/                    # Utilities
    └── DebugLog.swift       # DEBUG-only logging
```
````

with:

````markdown
└── Utils/                    # Utilities
    └── DebugLog.swift       # DEBUG-only logging
CrewluveAlerts/               # The alert pushes' helper, a notification service extension
└── NotificationService.swift # Writes each alert push's words with the app's AlertPushWriter
```
````

In `CLAUDE.md`, replace:

```markdown
- Unit tests in `CrewluvTests/`
- UI tests in `CrewluvUITests/`
```

with:

```markdown
- Unit tests in `CrewluvTests/`. The helper target has none of its own: its logic is `AlertPushWriter`, in the app's folder, which `CrewluvTests` tests
- UI tests in `CrewluvUITests/`
```

- [ ] **Step 2: Commit**

```bash
cd ~/Dev/Crewluv && git add CLAUDE.md && git commit -q -m "docs(crewluv): the alerts, and the alert pushes' helper target (alert pushes spec §11)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

### Task 7: Review

**Files:** whatever the review finds.

- [ ] **Step 1: Ask for a review**

Use superpowers:requesting-code-review with a read-only reviewer. It reads:
- `git -C ~/Dev/Crewluv diff <plan 2b's last commit, from Task 0>..feature/alert-pushes`;
- this plan, and spec §5.4, §6.1, §6.2, §6.4 and §9.3;
- the alert push partner-push sends: `~/Dev/Duty/supabase/functions/partner-push/index.ts`, its `message` function.

It may run `"$HARNESS/run.sh"` and `"$BUILD/check_nse.py"`; no other `xcodebuild` and no simulator. State facts neutrally, and don't tell it what not to flag.

- [ ] **Step 2: Act on it**

For each finding, fix it test-first where the harness can test it, re-run `"$HARNESS/run.sh"`, and commit. If any Swift or the project changed, run Task 5 again. Note each fix in this plan's Execution notes.

### Task 8: The user runs Crewluve's tests

**Files:** none.

- [ ] **Step 1: Ask the user to run the tests in Xcode**

Send them these steps:

1. In Xcode, check that the scheme at the top of the window says **Crewluv**, not CrewluveAlerts, and the destination is an iPhone **simulator** (such as iPhone 17 Pro), not your phone.
2. Press **⌘U** (Product → Test) and wait for it to finish. The build now includes the helper, CrewluveAlerts.
3. Press **⌘6** to open the Test navigator. Red marks show failures.

Expected: no failures. The console's last Swift Testing line says `Test run with 367 tests in 33 suites passed`: the harness's 355, and the 12 `KeychainDeviceKeyStoreTests`, counted before Task 7's fixes. The new suite is `AlertPushWriterTests`, with 14 tests.

- [ ] **Step 2: If anything fails, stop**

Ask for the test's name and its message. Fix the cause, never the test's expected value, then ask for another run.

### Task 9: The spec

**Files:** Modify `~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`.

- [ ] **Step 1: Record plan 2's decisions**

Add to the end of `docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`, after a blank line:

```markdown
## 16. Decisions made while planning Crewluve 1.3 (2026-10-24)

Plans 2b and 2c made these. Plan 2a's are in §15.3.

### 16.1 Crewluve's own alerts (plan 2b)

1. **`AlertWording` is the one place for the alerts' words:** the kinds, the words and the plain lines, for the app and the helper. `AlertKind`'s raw values are partner-push's `ALERT_KINDS`.
2. **An alert carries its kind,** and a notification's id starts with the kind's name.
3. **The shared cases run through the real notifier,** given its defaults, time zone and poster, with the effective delay worked out at each case's moment.
4. **The snapshot keeps the trips its home arrival belonged to.** One that 1.2 saved has none, so its home arrival isn't compared, once.
5. **§15's rules mirror partner-push's, edges included:** spans that only touch don't overlap, a leg of no trip matches none, and a trip whose span has ended by the moment is neither added nor removed.
6. **§6.3 is decided when a new status goes to the alerts.** On Crewlu Cloud, the app posts when a hidden push asked for a read since the last new status, or until `AlertPushes` says the alert pushes are accepted.
7. **Acceptance is remembered as the key's SHA-256,** never the key, under `partnerCloud.alertPushesAccepted`.
8. **The door always sends `p_alerts: true`,** with no fallback on a 404 from an undone Crewlu Cloud (§14.4). A registration that fails isn't accepted, so the app makes its own alerts; item 11 says what an undo leaves a phone accepted before it.
9. **The name item holds the alerts' title name:** the name the pilot set for this partner, else the pilot's first name.
   - **Saved** whenever the app remembers a reading and the Keychain's differs, so a phone updated from 1.2 saves it at its first new status.
   - **Deleted** when the pilot is forgotten, and on iCloud's reset.
10. **The branch** is `feature/alert-pushes` in Crewluv, from `4333994`: 1.2 (44), the tip of both release branches (§10).
11. **From plan 2b's review:**
    - **The alerts' times follow the phone's time zone** as it changes (`.autoupdatingCurrent`), not the one at launch.
    - **An answer for a key the device has since replaced** records no acceptance.
    - **Two narrow windows can alert twice** at the switch to alert pushes. One is a change the app alerted just before its registration was accepted, which Crewlu Cloud's next run pushes too. The other is a registration whose answer was lost after Crewlu Cloud saved it: the app alerts beside the alert pushes until a later registration gets through.
    - **After an undo of Crewlu Cloud's script** (§14.2.6, which says 1.3 gets no pushes), a phone accepted before it keeps its acceptance and its token. Piece 3's hidden pushes still come, and the reads they start post, while the 60-second check and the background refresh stay silent. A phone that registers after the undo isn't accepted, so it makes its own alerts.

### 16.2 The helper (plan 2c)

1. **`CrewluveAlerts`** is a notification service extension embedded in Crewluve, with the bundle id `com.ToddAnderson.Crewluv.CrewluveAlerts`. It has the app's version and build, iOS 26.0, iPhone and iPad, and the app's Swift settings.
2. **It builds 15 of the app's files** through Target Membership, the fewest that compile. `AlertPushWriter` lives in the app's folder, so the app's tests test it.
3. **Its one Keychain group is Crewluve's own** (§6.2), so the key store reads the app's items unchanged.
4. **`NotificationService` is nonisolated,** since iOS calls it on a thread of its own choosing. The writer runs on the main actor.
5. **The alert is delivered once:** with its words; or, when iOS's time runs out first, with the plain line, or as the push came if even that isn't ready.
6. **The words are worked out as the app's own alerts' are,** at the moment the helper reads. The plain line's title is the saved name, or none.
7. **The Xcode steps are the user's,** checked by a script that reads the project file and xcodebuild's settings.
8. **A version bump changes both targets,** from 1.3 on.
```

If Task 7, plan 2b's review or either user's run changed a decision, change its line here to match, and say so in the Execution notes.

- [ ] **Step 2: Commit**

```bash
cd ~/Dev/Crewluve\ Website && git add docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md && git commit -q -m "Spec: the decisions made while planning Crewluve 1.3 (plans 2b and 2c), as §16" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

### Task 10: Record and go on

**Files:** this plan.

- [ ] **Step 1: Tick this plan, and note what changed from it**

In `~/Dev/Crewluve Website`, tick the steps done and fill in the Execution notes. Commit only this plan's file. Don't push.

- [ ] **Step 2: Plan 3**

The branch stays as it is: plan 3, the release, takes it to TestFlight, through §9.4's checks on real phones, and to the App Store. Nothing is merged or pushed until then.

---

## For plan 3

- **Versions:** the bump to 1.3 (45) changes both targets, Crewluv and CrewluveAlerts.
- **No build without the helper:** plan 2b's registration switches a phone to alert pushes at its first launch, so a TestFlight build must hold plan 2c's helper too, or every alert reads "New update".
- **Signing:** the first archive's automatic signing makes the helper's App ID, `com.ToddAnderson.Crewluv.CrewluveAlerts`, and its profile.
- **§9.4's first check** proves the Keychain group: the helper reads the key that 1.2 saved, on a phone that updated from the App Store.

## Execution notes

Filled in during the build: any place the code ends up different from the printed blocks, and why.
