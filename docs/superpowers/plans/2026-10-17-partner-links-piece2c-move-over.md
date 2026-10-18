# Partner Links Piece 2c: the Move-Over from iCloud to Crewlu Cloud — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everyone a pilot shares with through iCloud moves over to Crewlu Cloud by themselves. CrewLu makes each one's Crewlu Cloud partner, moves their settings to it, and hands them a ticket through the iCloud record for their new Crewluve to redeem; once nobody reads through the iCloud share, it ends. Meanwhile the iCloud record carries only its own people's per-person settings.

**Architecture:**
- **The decision is pure and tested.** `PartnerMoveOver.plan` takes what a run knows (the share's participants, the Crewlu Cloud list, the notes, the settings) and says whom to make, whose settings move, who gets a ticket, and whether the share ends. It lives in `Duty/Utils/PartnerCloud/`, beside 2a's and 2b's code, and runs in the Mac harness.
- **A small runner makes the calls.** `PartnerMoveOverRunner` runs on every activation and whenever Partner Sharing appears, one run at a time. It acts through `PartnerCloudStore`, for the account the list follows, and through a small seam for the iCloud share, so the harness tests it too.
- **The notes remember what it learned** (`PartnerMoveOverNotes`): each iCloud participant's Crewlu Cloud partner, their tickets, and whom the pilot removed. Key-value sync carries them to the pilot's other devices, so every device writes the same iCloud record, signed in or not.
- **Settings follow the person.** Someone who moved over keeps their settings under their Crewlu Cloud id. `PartnerSettings` reads and writes them by either id, and builds the iCloud record's per-person fields for the share's participants only.
- **The screens show one row per person**, still on iCloud until they have the new Crewluve. Removing someone takes them out of both.

**Tech stack:** Swift 5 mode on iOS 18, SwiftUI, Observation, CloudKit, supabase-swift 2.46.0, XCTest.

**Design:** `docs/superpowers/specs/2026-10-16-partner-links-piece2-crewlu-design.md` in this repo: §7 (the move-over), §6.6 (per-person settings), §6.7 (signing out), §8.1, and §13 (2b's decisions, and what §13.5 leaves for 2c). The API contract is `~/Dev/Duty/supabase/partner-api.md`.

---

## Before you start

- **Two repos.**
  - The code goes in `~/Dev/Duty` (CrewLu).
  - This plan and the spec live in `~/Dev/Crewluve Website`.
  - Paths are relative to `~/Dev/Duty` unless they start with `~`, `$HARNESS` or `$BUILD`.
- **Branch.** Build on `feature/partner-cloud-screens` itself, at `8f162e61`, where plan 2b is built (Task 0). The user kept it apart from `feature/supabase-account-backend` so that 2b and 2c merge together, after 2c (Task 17). No TestFlight build comes from this branch before then.
- **Leave the Xcode scheme files alone.**
  - `~/Dev/Duty` has uncommitted changes to `Duty.xcodeproj/xcshareddata/xcschemes/*` that aren't part of this work.
  - Never run `git add -A` or `git add .` there. Add the exact paths each step lists.
- **Who runs which tests.**
  - **CrewLu's rule:** never run `xcodebuild test`, never boot a simulator, and never build against the copy the user has open in Xcode. The user runs CrewLu's tests (Task 14).
  - **The Mac harness (Task 2)** runs the partner-cloud tests in a small Swift package outside both repos, with stand-ins for the few app types they touch. The test-first steps use it. It boots no simulator and shares no build folder with Xcode. 2b's harness was temporary, so Task 2 makes it again.
  - **The iCloud manager, the status generator, AutoSync, key-value sync and the views are checked only by building:** the harness can't build CloudKit's manager, SwiftData or SwiftUI's iOS views, so Task 12's compile, the review (Task 13) and the user's run (Task 14) check them. The rules they call are pure and tested in the harness.
  - **The SQL tests** don't change: 2c makes no database change.
  - **One compile-only build (Task 12)** checks the whole app and its tests, in a separate clone with its own build folder.
- **No Crewlu Cloud.** Nothing in this plan calls Crewlu Cloud: the tests use a stand-in. Only the user's own look (Task 15, their choice) does, and there the move-over acts on their real iCloud partners.
- **New files need no project edit.** `Duty/` and `DutyTests/` are synchronized folders, so a new file joins its target by itself. Editor errors such as "Cannot find type" on a new file are a stale index: trust the harness and Task 12.
- **Pick two scratch folders,** outside both repos: one for the harness (`$HARNESS`, Task 2) and one for the compile-only clone (`$BUILD`, Task 12). Shell variables don't carry from one command to the next in Claude's Bash tool, so begin each command that uses them with `export HARNESS=<the folder> &&` (or `BUILD`).
- **If an expected value doesn't match, stop and ask.** Never change a test to make it pass.

## Decisions made while planning

These refine the spec. Task 16 writes them into it.

1. **`PartnerCloudAPI` gains `partner_move_ticket`** (`moveTicket(for:)`). Its `expires_at` isn't kept: the move-over asks again on every run until someone has moved over, and an open ticket comes back the same while an expired or used one is replaced.
2. **The move-over's calls go through `PartnerCloudStore`,** for the account its list follows. Making someone's partner (with their iCloud id as the reference) and asking for a ticket don't read the list after each call: the runner notes each new partner first, then reads the list once, so the list never shows anyone twice. `readListNow()` waits for a read that starts after it asks, even when one is already out, because the move-over decides from it.
3. **A moved-over person's settings live under their Crewlu Cloud id** (spec §6.6). Step 2 moves them there from the iCloud id: an entry already under the Crewlu Cloud id stays, and the iCloud id's entry goes either way, so a status cleared later can't come back from it. By either id, reads try the Crewlu Cloud id first, then the iCloud id, and writes and clears go to the Crewlu Cloud id and drop the iCloud id's copy. So the screen below the sign-in prompt and its quick status sheet, which still use iCloud ids, reach the same settings.
4. **The iCloud record's per-person fields are for the share's participants only** (spec §13.5): each by their iCloud id, looked up Crewlu Cloud id first, plus a status for everyone. The record's top-level quick status and `isSleeping`, which an older Crewluve shows every partner, come from those entries alone, so nothing meant for someone on Crewlu Cloud alone reaches an older Crewluve. The iCloud manager saves the participants iCloud identifies each time it reads the share, on that device only. Before a device has read the share on this version, its record keeps every setting, as before, plus each linked person's under their iCloud id. The JSON fields have sorted keys, so an unchanged record encodes the same.
5. **The tickets go into the record from the notes** (`moveTicketByPartnerJSON`, spec §7.4), for the share's participants, on every write by any device on this version, signed in or not. `SharedPilotStatus` doesn't change. The runner writes the record again whenever it doesn't carry the notes' tickets, not only when they change, so a write that failed is made again by the next run.
6. **When it runs** (spec §7.2): on every activation (at launch, once the share is read, and on coming back), whenever Partner Sharing appears (so also on coming back to it after signing in from its prompt), and when the share's participants change on that screen. Each run reads the share's participants and the Crewlu Cloud list first, and decides nothing if either can't be read. One run at a time: a run asked for meanwhile runs once more after it. Remove and Stop Sharing with Everyone wait for a run that's out, so it can't make someone again.
7. **A refusal skips that person; anything else stops the run.** Crewlu Cloud refusing a partner (PT409: 25 already) leaves that person on iCloud. Being offline or needing a sign-in stops the run, keeping what it noted, and the next run picks up.
8. **One row per person** (spec §6.2): someone the notes link to a partner in the list is that partner's row, with its name, still on iCloud until they have an `app` device and connected after. Rows still on iCloud keep the share's order, linked or not. Their partner page is found by either id, so it stays open when the move-over links them. Until they move over, it shows the iCloud device row and no link buttons, and the nickname renames them on Crewlu Cloud.
9. **Removing someone in the iCloud share** (spec §7.5): they leave the share first, and if that fails nothing else changes. If the move-over linked them, their iCloud id goes on the removed list and their ticket goes. The iCloud manager does this, so it happens from either screen, signed in or not. Then their Crewlu Cloud partner goes, if they have one.
10. **Late joiners** (spec §7.6): when today's matching names someone from a pending invite, their Crewlu Cloud partner takes that name, at once if it's made, or once the run that's out has made it; someone not linked yet is made with it. The name they see the pilot as is cleared under both ids, as the matching already does for the iCloud id.
11. **The share ends only when nobody reads through it** (spec §7.3, step 5): every accepted participant is linked and has an `app` device, iCloud can identify them all, and no pending invite is open on this device. Someone the pilot removed who joins again through the old iCloud link holds it up too, until removed again: nobody is cut off. Participants who never accepted don't count, as in 2b's list. Settings still under an iCloud id move over before it ends.
12. **The notes** (spec §7.1) are three UserDefaults keys, synced by key-value storage as plain dictionaries and a list. Ending the iCloud share (`endICloudShare()`, and the clean-up on finding it gone) and Stop Sharing with Everyone forget them, through `PartnerSettings`.
13. **Sign Out asks first only when it stops someone's updates** (the user's choice; spec §6.7): someone reads through Crewlu Cloud, or has an invite out. Someone still on iCloud, linked or not, keeps getting updates through the iCloud record, signed in or not. Before this launch has read the list, any Crewlu Cloud partner counts, as in 2b.
14. **`PartnerQuickStatusEntry` and `PartnerCloudSettings` are `Equatable`,** so the move-over knows when settings changed, and the tests compare them. `PartnerCloudStore.cleanName` is `nonisolated`, so the pure decision uses it.

## The four questions

- **Is this wise?**
  - It's what makes the umbrella design's "auto move-over, nobody disconnected" true. Each iCloud partner gets a Crewlu Cloud partner and a ticket without anyone tapping anything, and the iCloud share ends only once nobody reads through it.
  - It closes the gap 2b left (spec §13.5): the iCloud record no longer carries Crewlu Cloud partners' per-person settings, so 2b and 2c can ship together.
  - The tickets do nothing until Crewluve piece 4 redeems them, and all three plans ship in one CrewLu release after it (P2-1).
- **Will it break anything?**
  - *Partners on an older Crewluve:* what they see doesn't change, except that a quick status meant for someone on Crewlu Cloud alone no longer reaches them (the fix). Once linked, their settings are looked up under their Crewlu Cloud id. They ignore the new ticket field.
  - *Signed out, or holding another account's schedule:* no move-over runs. The record any device writes is the same, from the synced notes.
  - *Settings:* a linked person's settings move to their Crewlu Cloud id. Both screens, the quick status sheet and the record read and write them by either id.
  - *Sign Out* asks less often: not for people still on iCloud (decision 13).
  - *Stop Sharing with Everyone below the sign-in prompt* ends the iCloud share, but can't reach Crewlu Cloud, so linked people's Crewlu Cloud partners stay. Signed in again, the pilot sees them as pending invites they can delete. Their tickets went with the record, and their invite links were never sent, so nobody can connect through them.
  - *Network:* while an iCloud share exists and the pilot is signed in, each run makes one iCloud read of the share, one or two small Crewlu Cloud reads, and one ticket request per person who hasn't moved over. Pilots without an iCloud share make no call, and their iCloud manager still never starts.
  - *Real partners:* on the pilot's own devices the move-over acts for real: it makes Crewlu Cloud partners for their iCloud partners and writes tickets into their iCloud record. That's its job, and what the release will do.
  - *A crash:* nothing new traps.
- **Is this what a brilliant Apple engineer would do?** One pure decision, tested, and a small runner whose CloudKit side sits behind closures, as the store's account does. It uses the app's own pieces (`PartnerCloudStore`, `PartnerSettings`, `PartnerDataKVSync`, the build guard), and CloudKit's user record name as the reference, so every device makes the same partner.
- **Does it fix the disease or the symptom?** The disease is that partners depend on one iCloud share, and one record carrying everyone's settings. 2c moves each person to their own Crewlu Cloud partner and then ends the share, rather than filtering what the shared record shows.

## Not in this plan

- Crewluve redeeming its ticket (piece 4), the push service (3), the website (5), and removing iCloud sharing (6), which deals with anyone left on iCloud.
- Telling the pilot about the move-over: it's silent (spec §1, §7).
- Someone who never updates Crewluve: they stay on iCloud, and the share stays up for them.
- Removing, at a later sign-in, the Crewlu Cloud partners of people stopped below the sign-in prompt.

## How this plan was checked

- **Built test-first in a scratch clone** of `8f162e61`, outside `~/Dev/Duty`.
- **The Swift tests:** the Mac harness ran all 158 and caught 92 of 92 deliberate breaks, one at a time, in the notes, the settings, the store, the decision, the runner and the list. The first run missed one, `readListNow()` answering for an account the list doesn't follow yet, which led to one more test.
- **The compile-only build** of the whole app and its tests passed in the scratch clone, with only the existing StoreKit warning.
- **A replay on a fresh clone of `8f162e61`:** every Run step gave the result printed here, including each test-first failure, and every file matched the scratch copy byte for byte. Task 12's build passed on the replayed branch.

## Files

In `~/Dev/Duty`:

| File | Responsibility |
|---|---|
| `Duty/Utils/PartnerCloud/PartnerCloudAPI.swift`, `LivePartnerCloudAPI.swift` (changed) | `partner_move_ticket` |
| `Duty/Utils/PartnerCloud/PartnerMoveOverNotes.swift` | The notes, the record's tickets, and noting a removal |
| `Duty/Utils/PartnerCloud/PartnerSettings.swift` (changed) | Settings by either id, moving them over, and the iCloud record's per-person fields |
| `Duty/Utils/PartnerCloud/PartnerCloudStore.swift` (changed) | The move-over's calls, and reading the list for it |
| `Duty/Utils/PartnerCloud/PartnerMoveOver.swift` | Pure: the decision. The runner |
| `Duty/Utils/PartnerCloud/PartnerList.swift` (changed) | One row per person; when Sign Out asks |
| `Duty/Models/SharedPilotStatus.swift` (changed) | `PartnerQuickStatusEntry` is `Equatable` |
| `Duty/Utils/PartnerBeacon/PartnerStatusGenerator.swift` (changed) | The record's per-person fields, through `PartnerSettings` |
| `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift` (changed) | The participants iCloud identifies, the tickets in the record, the share as the move-over and the list see it, and noting removals |
| `Duty/Utils/PartnerBeacon/PartnerBeaconAutoSync.swift` (changed) | Writing the record again |
| `Duty/Utils/PartnerBeacon/PartnerDataKVSync.swift` (changed) | Syncing the notes |
| `Duty/App/DutyApp.swift` (changed) | Starting the runner |
| `Duty/Views/Settings/PartnerSharingView.swift` (changed) | Rows, Remove, the runs, late joiners, and settings by either id |
| `Duty/Views/Settings/PartnerDetailView.swift` (changed) | Found by either id; Remove |
| `Duty/Views/Settings/PartnerQuickStatusSheet.swift` (changed) | Settings through `PartnerSettings` |
| `Duty/Views/Account/CrewluCloudDetailView.swift` (changed) | When Sign Out asks |
| `DutyTests/Helpers/StubPartnerCloudAPI.swift` (changed) | The stand-in's ticket |
| `DutyTests/PartnerMoveOverNotesTests.swift`, `PartnerMoveOverTests.swift` | The new tests |
| `DutyTests/PartnerSettingsTests.swift`, `PartnerCloudStoreTests.swift`, `PartnerListTests.swift` (changed) | Their new tests |

In `~/Dev/Crewluve Website`: this plan, ticked as it goes, and the piece 2 spec (Task 16).

Outside both repos: the Mac harness (`$HARNESS`, Task 2) and the compile-only clone (`$BUILD`, Task 12).

---

### Task 0: Check the branch

- [x] **Step 1: Check the working tree**

Run:

```bash
git -C ~/Dev/Duty status --short
```

Expected: only the Xcode scheme lines (` M Duty.xcodeproj/xcshareddata/xcschemes/Duty.xcscheme` and four `??` scheme files). On 2026-10-17 the checkout also had an untracked `docs/superpowers/plans/2026-10-17-detach-dead-trip-children.md` from other work: leave it alone too. If anything else shows, stop and ask the user.

- [x] **Step 2: Check the branch and its tip**

Run:

```bash
git -C ~/Dev/Duty branch --show-current && git -C ~/Dev/Duty log --oneline -1
```

Expected: `feature/partner-cloud-screens`, then `8f162e61 fix(partners): after the look, a tag that doesn't fit beside a long name goes below it…`. If either differs, stop and ask: this plan was checked against `8f162e61`. 2c builds on this branch; it creates none.

### Task 1: The move ticket

**Files:**
- Modify: `Duty/Utils/PartnerCloud/PartnerCloudAPI.swift`, `Duty/Utils/PartnerCloud/LivePartnerCloudAPI.swift`, `DutyTests/Helpers/StubPartnerCloudAPI.swift`

The seam gains `partner_move_ticket` (decision 1), and the tests' stand-in answers it. Nothing uses it yet: Task 2's harness builds the stand-in, and Task 12 builds the live version.

- [x] **Step 1: Add the call to the seam**

One replacement in `Duty/Utils/PartnerCloud/PartnerCloudAPI.swift`:

In `Duty/Utils/PartnerCloud/PartnerCloudAPI.swift`, replace:

```swift
    func removeDevice(_ id: String) async throws
    /// `partner_remove_all`: every partner, every device, and the summary.
    func removeAllPartners() async throws
}
```

with:

```swift
    func removeDevice(_ id: String) async throws
    /// `partner_remove_all`: every partner, every device, and the summary.
    func removeAllPartners() async throws
    /// `partner_move_ticket`: the ticket that moves someone over from iCloud (spec §7.3). While
    /// one is open, asking again answers the same ticket; an expired or used one is replaced.
    func moveTicket(for id: String) async throws -> String
}
```

- [x] **Step 2: Add it to the live version**

It goes through the same `call` as the other actions, so it asks for the session first and its errors map the same way.

One replacement in `Duty/Utils/PartnerCloud/LivePartnerCloudAPI.swift`:

In `Duty/Utils/PartnerCloud/LivePartnerCloudAPI.swift`, replace:

```swift
        }
    }

    /// Asks for the session first, which renews an expired one. Without this, a sign-in
    /// that can't be renewed would go unnoticed: the SDK sends the call without it.
    private func call<T>(_ body: () async throws -> T) async throws -> T {
```

with:

```swift
        }
    }

    // The answer also has `expires_at`, which the move-over doesn't need: it asks again on every
    // run until the person has moved over.
    private struct MoveTicketAnswer: Decodable {
        let ticket: String
    }

    func moveTicket(for id: String) async throws -> String {
        try await call {
            let answer: MoveTicketAnswer = try await client
                .rpc("partner_move_ticket", params: PartnerParams(p_partner: id))
                .execute()
                .value
            return answer.ticket
        }
    }

    /// Asks for the session first, which renews an expired one. Without this, a sign-in
    /// that can't be renewed would go unnoticed: the SDK sends the call without it.
    private func call<T>(_ body: () async throws -> T) async throws -> T {
```

- [x] **Step 3: Add it to the tests' stand-in**

It's recorded like the other actions and can be made to fail. It answers `ticket-<id>`, unless a test gives another ticket, as the server does when one has expired or been used.

2 replacements, in order, in `DutyTests/Helpers/StubPartnerCloudAPI.swift`:

In `DutyTests/Helpers/StubPartnerCloudAPI.swift`, replace:

```swift

    /// Every partner action, oldest first, such as `create Sam ref-1` or `remove <id>`.
    private(set) var actions: [String] = []
    /// By action (`create`, `rename`, `newLink`, `remove`, `removeDevice`, `removeAll`): the
    /// next calls of it fail with these, oldest first.
    private var failures: [String: [PartnerCloudError]] = [:]

    func failNext(_ action: String, with errors: PartnerCloudError...) {
```

with:

```swift

    /// Every partner action, oldest first, such as `create Sam ref-1` or `remove <id>`.
    private(set) var actions: [String] = []
    /// By action (`create`, `rename`, `newLink`, `remove`, `removeDevice`, `removeAll`,
    /// `moveTicket`): the next calls of it fail with these, oldest first.
    private var failures: [String: [PartnerCloudError]] = [:]

    func failNext(_ action: String, with errors: PartnerCloudError...) {
```

In `DutyTests/Helpers/StubPartnerCloudAPI.swift`, replace:

```swift
    func removeAllPartners() async throws {
        try act("removeAll")
    }
}
```

with:

```swift
    func removeAllPartners() async throws {
        try act("removeAll")
    }

    /// By partner id: the ticket `partner_move_ticket` answers, instead of `ticket-<id>`.
    private var moveTickets: [String: String] = [:]

    func answerMoveTicket(_ ticket: String, for id: String) {
        moveTickets[id] = ticket
    }

    func moveTicket(for id: String) async throws -> String {
        try act("moveTicket", id)
        return moveTickets[id] ?? "ticket-\(id)"
    }
}
```

- [x] **Step 4: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerCloudAPI.swift Duty/Utils/PartnerCloud/LivePartnerCloudAPI.swift DutyTests/Helpers/StubPartnerCloudAPI.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): partner_move_ticket in PartnerCloudAPI, for the move-over" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 2: The Mac harness

**Files (outside both repos):** `$HARNESS/Package.swift`, `$HARNESS/Sources/UIKit/UIKitStandIn.swift`, `$HARNESS/Sources/Duty/AppStandIns.swift`, `$HARNESS/run.sh`

The harness from plans 2a and 2b, made again: it was temporary. A Swift package that compiles CrewLu's partner-cloud files and their tests unchanged, on the Mac, with stand-ins for the few app types they touch. `run.sh` copies whatever partner-cloud files exist so far from `~/Dev/Duty` (or `$DUTY`), then runs `swift test`. It needs no Xcode project, no simulator and no network, and it builds into its own `.build` folder. The test target uses the same concurrency settings as `DutyTests` (Swift 5 mode, Approachable Concurrency, member import visibility).

What changed since 2b: the stand-in for the live API has the move ticket, and `run.sh` also copies 2c's two new test files. Task 9 adds the iCloud manager's stand-in, which needs a type Task 6 makes.

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
    func createPartner(name: String, ref: String) async throws -> PartnerCloudInvite { throw PartnerCloudError.unavailable }
    func renamePartner(_ id: String, to name: String) async throws { throw PartnerCloudError.unavailable }
    func newLink(for id: String) async throws -> String { throw PartnerCloudError.unavailable }
    func removePartner(_ id: String) async throws { throw PartnerCloudError.unavailable }
    func removeDevice(_ id: String) async throws { throw PartnerCloudError.unavailable }
    func removeAllPartners() async throws { throw PartnerCloudError.unavailable }
    func moveTicket(for id: String) async throws -> String { throw PartnerCloudError.unavailable }
}

final class PartnerDataKVSync {
    static let shared = PartnerDataKVSync()
    func pushToKVS() {}
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
         Utils/BuildVersionGuard.swift Utils/Sync/SyncOwnerGuard.swift \
         Utils/PartnerBeacon/PendingPartnerInvites.swift; do
  cp "$DUTY/Duty/$f" "$HARNESS/Sources/Duty/"
done
for f in "$DUTY"/Duty/Utils/PartnerCloud/*.swift; do
  # The live API needs the Supabase SDK; AppStandIns.swift stands in for it.
  [ -f "$f" ] && [ "$(basename "$f")" != LivePartnerCloudAPI.swift ] && cp "$f" "$HARNESS/Sources/Duty/"
done
for f in Helpers/StubPartnerCloudAPI.swift Helpers/PartnerSummaryExamples.swift PartnerSettingsTests.swift \
         PartnerSummaryEncoderTests.swift PartnerCloudStoreTests.swift PartnerSummaryCloudWriterTests.swift \
         PartnerListTests.swift PartnerSharingScreenTests.swift PartnerInviteLinkTests.swift \
         PartnerMoveOverNotesTests.swift PartnerMoveOverTests.swift; do
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

Expected: `Executed 101 tests, with 0 failures`: 2b's tests, with Task 1's stand-in. The first build takes about a minute; later runs take seconds. Nothing to commit: the harness isn't part of CrewLu.

### Task 3: The move-over's notes

**Files:**
- Create: `Duty/Utils/PartnerCloud/PartnerMoveOverNotes.swift`
- Test: `DutyTests/PartnerMoveOverNotesTests.swift`

What the move-over remembers (spec §7.1, decision 12), the tickets the iCloud record carries (§7.4, decision 5), and noting someone the pilot removed (§7.5, decision 9).

- [x] **Step 1: Write the failing tests**

File: `DutyTests/PartnerMoveOverNotesTests.swift`

```swift
//
//  PartnerMoveOverNotesTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §7.1, §7.4, §7.5): what the move-over remembers,
//  the tickets the iCloud record carries, and removing someone it linked.
//

import XCTest
@testable import Duty

final class PartnerMoveOverNotesTests: XCTestCase {
    private let suite = "PartnerMoveOverNotesTests"
    private let a = PartnerSummaryExamples.partnerA
    private let b = PartnerSummaryExamples.partnerB
    private var defaults: UserDefaults!

    override func setUp() {
        super.setUp()
        defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
    }

    func test_theNotes_comeBackAsSaved() {
        let notes = PartnerMoveOverNotes(cloudPartnerByICloudID: ["_mom": a, "_dad": b],
                                         moveTicketByICloudID: ["_mom": "ticket-mom"],
                                         removedICloudPartners: ["_jo"])
        notes.save(to: defaults)
        XCTAssertEqual(PartnerMoveOverNotes.load(from: defaults), notes)
    }

    /// Empty notes leave nothing behind, so key-value sync carries no empty values.
    func test_emptyNotes_leaveNothingSaved() {
        PartnerMoveOverNotes(cloudPartnerByICloudID: ["_mom": a], moveTicketByICloudID: ["_mom": "ticket-mom"],
                             removedICloudPartners: ["_jo"]).save(to: defaults)
        PartnerMoveOverNotes().save(to: defaults)
        XCTAssertNil(defaults.object(forKey: PartnerMoveOverNotes.cloudPartnerKey))
        XCTAssertNil(defaults.object(forKey: PartnerMoveOverNotes.moveTicketKey))
        XCTAssertNil(defaults.object(forKey: PartnerMoveOverNotes.removedKey))
    }

    func test_forget_clearsAllThree() {
        PartnerMoveOverNotes(cloudPartnerByICloudID: ["_mom": a], moveTicketByICloudID: ["_mom": "ticket-mom"],
                             removedICloudPartners: ["_jo"]).save(to: defaults)
        PartnerMoveOverNotes.forget(in: defaults)
        XCTAssertEqual(PartnerMoveOverNotes.load(from: defaults), PartnerMoveOverNotes())
        XCTAssertNil(defaults.object(forKey: PartnerMoveOverNotes.removedKey))
    }

    func test_theICloudParticipant_aCrewluCloudPartnerWasMadeFor() {
        let notes = PartnerMoveOverNotes(cloudPartnerByICloudID: ["_mom": a])
        XCTAssertEqual(notes.iCloudID(for: a), "_mom")
        XCTAssertNil(notes.iCloudID(for: b))
    }

    /// The record carries the tickets of the share's participants (spec §7.4): before this device
    /// has read the share, every ticket in the notes.
    func test_theRecordsTickets() throws {
        let notes = PartnerMoveOverNotes(moveTicketByICloudID: ["_mom": "t1", "_dad": "t2", "_ann": "t3",
                                                                "_bo": "t4", "_cy": "t5", "_ed": "t6"])
        XCTAssertEqual(notes.tickets(for: ["_mom", "_jo"]), ["_mom": "t1"])
        XCTAssertEqual(notes.tickets(for: nil), notes.moveTicketByICloudID)
        let json = try XCTUnwrap(notes.ticketsJSON(for: nil))
        XCTAssertEqual(String(decoding: json, as: UTF8.self),
                       #"{"_ann":"t3","_bo":"t4","_cy":"t5","_dad":"t2","_ed":"t6","_mom":"t1"}"#, "sorted by key")
        XCTAssertNil(notes.ticketsJSON(for: ["_jo"]), "no tickets, no field")
    }

    /// Removing someone the move-over linked puts them on the removed list and drops their
    /// ticket (spec §7.5). Their Crewlu Cloud partner is removed apart from this.
    func test_removingSomeoneLinked_remembersIt() {
        PartnerMoveOverNotes(cloudPartnerByICloudID: ["_mom": a, "_dad": b],
                             moveTicketByICloudID: ["_mom": "t1", "_dad": "t2"]).save(to: defaults)
        XCTAssertTrue(PartnerMoveOverNotes.noteRemoved("_mom", in: defaults))
        let notes = PartnerMoveOverNotes.load(from: defaults)
        XCTAssertEqual(notes.removedICloudPartners, ["_mom"])
        XCTAssertEqual(notes.moveTicketByICloudID, ["_dad": "t2"])
        XCTAssertEqual(notes.cloudPartnerByICloudID, ["_mom": a, "_dad": b])
    }

    /// Someone the move-over never linked: it never made a partner for them, so there's nothing to remember.
    func test_removingSomeoneNotLinked_changesNothing() {
        PartnerMoveOverNotes(cloudPartnerByICloudID: ["_dad": b]).save(to: defaults)
        XCTAssertFalse(PartnerMoveOverNotes.noteRemoved("_mom", in: defaults))
        XCTAssertEqual(PartnerMoveOverNotes.load(from: defaults), PartnerMoveOverNotes(cloudPartnerByICloudID: ["_dad": b]))
    }
}
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `cannot find 'PartnerMoveOverNotes' in scope`.

- [x] **Step 3: Write the notes**

File: `Duty/Utils/PartnerCloud/PartnerMoveOverNotes.swift`

```swift
//
//  PartnerMoveOverNotes.swift
//  Duty
//
//  What the move-over remembers (spec §7.1): the Crewlu Cloud partner each iCloud
//  participant became, the tickets handed to them through the iCloud record, and
//  the iCloud participants the pilot removed. Kept in UserDefaults and synced to
//  the pilot's other devices by PartnerDataKVSync, so every device on this version
//  writes the same tickets and looks up the same settings, signed in or not.
//

import Foundation

struct PartnerMoveOverNotes: Equatable, Sendable {
    /// `{iCloud id: Crewlu Cloud id}`: the partner each iCloud participant became.
    var cloudPartnerByICloudID: [String: String] = [:]
    /// `{iCloud id: ticket}`: for everyone linked who hasn't moved over yet.
    var moveTicketByICloudID: [String: String] = [:]
    /// The iCloud participants the pilot removed: the move-over doesn't make them again.
    var removedICloudPartners: Set<String> = []

    static let cloudPartnerKey = "crewluve.cloudPartnerByICloudID"
    static let moveTicketKey = "crewluve.moveTicketByICloudID"
    static let removedKey = "crewluve.removedICloudPartners"

    static func load(from defaults: UserDefaults = .standard) -> PartnerMoveOverNotes {
        PartnerMoveOverNotes(
            cloudPartnerByICloudID: defaults.dictionary(forKey: cloudPartnerKey) as? [String: String] ?? [:],
            moveTicketByICloudID: defaults.dictionary(forKey: moveTicketKey) as? [String: String] ?? [:],
            removedICloudPartners: Set(defaults.stringArray(forKey: removedKey) ?? [])
        )
    }

    /// Saves them as plain dictionaries and a list, which key-value sync carries as they are.
    /// An empty one isn't kept.
    func save(to defaults: UserDefaults = .standard) {
        Self.set(cloudPartnerByICloudID.isEmpty ? nil : cloudPartnerByICloudID, forKey: Self.cloudPartnerKey, in: defaults)
        Self.set(moveTicketByICloudID.isEmpty ? nil : moveTicketByICloudID, forKey: Self.moveTicketKey, in: defaults)
        Self.set(removedICloudPartners.isEmpty ? nil : removedICloudPartners.sorted(), forKey: Self.removedKey, in: defaults)
    }

    /// Ending the iCloud share, or Stop Sharing with Everyone: the notes aren't needed any more.
    static func forget(in defaults: UserDefaults = .standard) {
        for key in [cloudPartnerKey, moveTicketKey, removedKey] {
            defaults.removeObject(forKey: key)
        }
    }

    /// The iCloud participant a Crewlu Cloud partner was made for, if any.
    func iCloudID(for cloudID: String) -> String? {
        cloudPartnerByICloudID.first { $0.value == cloudID }?.key
    }

    /// The tickets the iCloud record carries: those of the share's participants, or every one
    /// before this device has read the share (nil).
    func tickets(for participantIDs: [String]?) -> [String: String] {
        guard let participantIDs else { return moveTicketByICloudID }
        let ids = Set(participantIDs)
        return moveTicketByICloudID.filter { ids.contains($0.key) }
    }

    /// The record's `moveTicketByPartnerJSON` (spec §7.4): `{iCloud user record name: ticket}`,
    /// or nil when there are none, so the field is cleared.
    func ticketsJSON(for participantIDs: [String]?) -> Data? {
        let tickets = tickets(for: participantIDs)
        guard !tickets.isEmpty else { return nil }
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        return try? encoder.encode(tickets)
    }

    /// The pilot removed someone from the iCloud share (spec §7.5). If the move-over linked them,
    /// they go on the removed list and their ticket goes. True when the notes changed; the
    /// caller syncs them.
    @discardableResult
    static func noteRemoved(_ iCloudID: String, in defaults: UserDefaults = .standard) -> Bool {
        var notes = load(from: defaults)
        guard notes.cloudPartnerByICloudID[iCloudID] != nil else { return false }
        notes.removedICloudPartners.insert(iCloudID)
        notes.moveTicketByICloudID.removeValue(forKey: iCloudID)
        notes.save(to: defaults)
        return true
    }

    private static func set(_ value: Any?, forKey key: String, in defaults: UserDefaults) {
        if let value {
            defaults.set(value, forKey: key)
        } else {
            defaults.removeObject(forKey: key)
        }
    }
}
```

- [x] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 108 tests, with 0 failures`.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerMoveOverNotes.swift DutyTests/PartnerMoveOverNotesTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): PartnerMoveOverNotes, what the move-over remembers, and the tickets the iCloud record carries" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 4: Settings that follow someone who moved over

**Files:**
- Modify: `Duty/Utils/PartnerCloud/PartnerSettings.swift`, `Duty/Models/SharedPilotStatus.swift`
- Test: `DutyTests/PartnerSettingsTests.swift`

Spec §6.6 and decisions 3, 4 and 12: settings by either id, moving them over, the iCloud record's per-person fields for the share's participants only, and the clean-ups forgetting the notes.

- [x] **Step 1: Write the failing tests**

The header, two of 2b's tests extended to the notes, and twelve new tests at the end.

4 replacements, in order, in `DutyTests/PartnerSettingsTests.swift`:

In `DutyTests/PartnerSettingsTests.swift`, replace:

```swift
//  PartnerSettingsTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §6.6): reading the per-person settings.
//

import XCTest
```

with:

```swift
//  PartnerSettingsTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §6.6): the per-person settings, and how they follow
//  someone who moved over from iCloud.
//

import XCTest
```

In `DutyTests/PartnerSettingsTests.swift`, replace:

```swift
                 names: ["_icloud1": "Todd", a: "Dad"])
        defaults.set(["_icloud1": "Mom"], forKey: PartnerSettings.nicknamesKey)
        defaults.set("Mom", forKey: PartnerSettings.nicknameKeyPrefix + "_icloud1")

        PartnerSettings.forgetICloudSharing(ids: ["_icloud1"], in: defaults)
        let settings = PartnerSettings.load(from: defaults)
        XCTAssertEqual(Set(settings.quickStatusByPartner.keys), [a, PartnerSettings.everyoneKey])
        XCTAssertEqual(settings.displayNameByPartner, [a: "Dad"])
        XCTAssertEqual(PartnerSettings.iCloudNicknameKeys(in: defaults), [])
    }

    /// Stop Sharing with Everyone, on Crewlu Cloud: every per-person setting and nickname goes.
```

with:

```swift
                 names: ["_icloud1": "Todd", a: "Dad"])
        defaults.set(["_icloud1": "Mom"], forKey: PartnerSettings.nicknamesKey)
        defaults.set("Mom", forKey: PartnerSettings.nicknameKeyPrefix + "_icloud1")
        PartnerMoveOverNotes(cloudPartnerByICloudID: ["_icloud2": b], removedICloudPartners: ["_icloud3"]).save(to: defaults)

        PartnerSettings.forgetICloudSharing(ids: ["_icloud1"], in: defaults)
        let settings = PartnerSettings.load(from: defaults)
        XCTAssertEqual(Set(settings.quickStatusByPartner.keys), [a, PartnerSettings.everyoneKey])
        XCTAssertEqual(settings.displayNameByPartner, [a: "Dad"])
        XCTAssertEqual(PartnerSettings.iCloudNicknameKeys(in: defaults), [])
        XCTAssertEqual(PartnerMoveOverNotes.load(from: defaults), PartnerMoveOverNotes(), "the move-over's notes go too")
    }

    /// Stop Sharing with Everyone, on Crewlu Cloud: every per-person setting and nickname goes.
```

In `DutyTests/PartnerSettingsTests.swift`, replace:

```swift
        defaults.set(true, forKey: PartnerSettings.isSleepingKey)
        defaults.set(["_icloud1": "Mom"], forKey: PartnerSettings.nicknamesKey)
        defaults.set([a], forKey: PartnerCloudStore.savedIDsKeyPrefix + "PILOT-1")

        PartnerSettings.forgetEverything(in: defaults)
        XCTAssertNil(defaults.data(forKey: PartnerSettings.quickStatusKey))
        XCTAssertNil(defaults.data(forKey: PartnerSettings.displayNameKey))
        XCTAssertNil(defaults.object(forKey: PartnerSettings.isSleepingKey))
        XCTAssertEqual(PartnerSettings.iCloudNicknameKeys(in: defaults), [])
        XCTAssertEqual(defaults.stringArray(forKey: PartnerCloudStore.savedIDsKeyPrefix + "PILOT-1"), [a],
                       "the partner list is the store's")
    }
```

with:

```swift
        defaults.set(true, forKey: PartnerSettings.isSleepingKey)
        defaults.set(["_icloud1": "Mom"], forKey: PartnerSettings.nicknamesKey)
        defaults.set([a], forKey: PartnerCloudStore.savedIDsKeyPrefix + "PILOT-1")
        PartnerMoveOverNotes(cloudPartnerByICloudID: ["_icloud1": a], moveTicketByICloudID: ["_icloud1": "t1"]).save(to: defaults)

        PartnerSettings.forgetEverything(in: defaults)
        XCTAssertNil(defaults.data(forKey: PartnerSettings.quickStatusKey))
        XCTAssertNil(defaults.data(forKey: PartnerSettings.displayNameKey))
        XCTAssertNil(defaults.object(forKey: PartnerSettings.isSleepingKey))
        XCTAssertEqual(PartnerSettings.iCloudNicknameKeys(in: defaults), [])
        XCTAssertEqual(PartnerMoveOverNotes.load(from: defaults), PartnerMoveOverNotes(), "and the move-over's notes")
        XCTAssertEqual(defaults.stringArray(forKey: PartnerCloudStore.savedIDsKeyPrefix + "PILOT-1"), [a],
                       "the partner list is the store's")
    }
```

In `DutyTests/PartnerSettingsTests.swift`, replace:

```swift
        XCTAssertEqual(PartnerSettings.iCloudNicknameKeys(in: defaults),
                       [PartnerSettings.nicknameKeyPrefix + "_icloud1", PartnerSettings.nicknamesKey])
    }
}
```

with:

```swift
        XCTAssertEqual(PartnerSettings.iCloudNicknameKeys(in: defaults),
                       [PartnerSettings.nicknameKeyPrefix + "_icloud1", PartnerSettings.nicknamesKey])
    }

    // MARK: - Someone who moved over from iCloud (plan 2c)

    private let callMe = PartnerQuickStatusEntry(status: "Call Me", icon: "phone.fill", expiry: nil)
    private let sleeping = PartnerQuickStatusEntry(status: "Sleeping", icon: "moon.zzz.fill", expiry: nil)

    /// Spec §6.6: by either of their ids, a moved-over person's settings are read under their
    /// Crewlu Cloud id first, then under their iCloud id.
    func test_theLookup_triesTheCrewluCloudIdFirst_thenTheICloudId() {
        let notes = PartnerMoveOverNotes(cloudPartnerByICloudID: ["_mom": a])
        var settings = PartnerCloudSettings(quickStatusByPartner: ["_mom": sleeping],
                                            displayNameByPartner: ["_mom": "Todd"])
        XCTAssertEqual(PartnerSettings.quickStatus(for: a, in: settings, notes: notes), sleeping, "not moved yet")
        XCTAssertEqual(PartnerSettings.quickStatus(for: "_mom", in: settings, notes: notes), sleeping)
        XCTAssertEqual(PartnerSettings.displayName(for: a, in: settings, notes: notes), "Todd")

        settings.quickStatusByPartner[a] = callMe
        settings.displayNameByPartner[a] = ""
        XCTAssertEqual(PartnerSettings.quickStatus(for: a, in: settings, notes: notes), callMe)
        XCTAssertEqual(PartnerSettings.quickStatus(for: "_mom", in: settings, notes: notes), callMe)
        XCTAssertEqual(PartnerSettings.displayName(for: "_mom", in: settings, notes: notes), "Todd",
                       "an empty name counts as none")
        XCTAssertNil(PartnerSettings.quickStatus(for: b, in: settings, notes: notes))
        XCTAssertNil(PartnerSettings.displayName(for: b, in: settings, notes: notes))
    }

    /// Writes by either id go under the Crewlu Cloud id once the move-over linked them, and the
    /// iCloud id's copy goes, so it can't come back later.
    func test_writes_goUnderTheCrewluCloudId_onceLinked() throws {
        PartnerMoveOverNotes(cloudPartnerByICloudID: ["_mom": a]).save(to: defaults)
        try save(statuses: ["_mom": sleeping], names: ["_mom": "Todd"])

        PartnerSettings.setQuickStatus(callMe, for: ["_mom", "_dad"], everyone: false, in: defaults)
        PartnerSettings.setDisplayName("T", for: "_mom", in: defaults)
        let settings = PartnerSettings.load(from: defaults)
        XCTAssertEqual(settings.quickStatusByPartner, [a: callMe, "_dad": callMe])
        XCTAssertEqual(settings.displayNameByPartner, [a: "T"])
        XCTAssertFalse(defaults.bool(forKey: PartnerSettings.isSleepingKey))
    }

    /// Send To with everyone picked also saves the status for everyone, as the sheet does today.
    func test_aStatusForEveryone_isSavedForEachOfThemToo() {
        PartnerSettings.setQuickStatus(sleeping, for: [a, b], everyone: true, in: defaults)
        XCTAssertEqual(PartnerSettings.load(from: defaults).quickStatusByPartner,
                       [a: sleeping, b: sleeping, PartnerSettings.everyoneKey: sleeping])
        XCTAssertTrue(defaults.bool(forKey: PartnerSettings.isSleepingKey))
    }

    func test_anEmptyDisplayName_removesIt_underBothIds() throws {
        PartnerMoveOverNotes(cloudPartnerByICloudID: ["_mom": a]).save(to: defaults)
        try save(statuses: [:], names: ["_mom": "Todd", a: "T", b: "Alex"])
        PartnerSettings.setDisplayName("  ", for: a, in: defaults)
        XCTAssertEqual(PartnerSettings.load(from: defaults).displayNameByPartner, [b: "Alex"])
    }

    /// Clearing someone's status clears it under both their ids, so the older copy doesn't take its place.
    func test_clearingAQuickStatus_clearsItUnderBothIds() throws {
        PartnerMoveOverNotes(cloudPartnerByICloudID: ["_mom": a]).save(to: defaults)
        try save(statuses: [a: callMe, "_mom": sleeping, b: callMe], names: [:])
        PartnerSettings.clearQuickStatus(for: "_mom", in: defaults)
        XCTAssertEqual(PartnerSettings.load(from: defaults).quickStatusByPartner, [b: callMe])
    }

    /// The move-over's step 2 (spec §7.3): each linked person's settings move to their Crewlu Cloud
    /// id. One already kept there stays, and the iCloud id's goes either way.
    func test_movingOver_movesTheSettings_withoutOverwriting() throws {
        let settings = PartnerCloudSettings(
            quickStatusByPartner: ["_mom": sleeping, "_dad": sleeping, b: callMe, PartnerSettings.everyoneKey: callMe],
            displayNameByPartner: ["_mom": "Todd", "_dad": "T", "_jo": "Captain"])
        let moved = try XCTUnwrap(PartnerSettings.movingOver(["_mom": a, "_dad": b], in: settings))
        XCTAssertEqual(moved.quickStatusByPartner, [a: sleeping, b: callMe, PartnerSettings.everyoneKey: callMe])
        XCTAssertEqual(moved.displayNameByPartner, [a: "Todd", b: "T", "_jo": "Captain"])
        XCTAssertNil(PartnerSettings.movingOver(["_mom": a, "_dad": b], in: moved), "nothing left to move")
    }

    func test_savingSettings_keepsTheSleepingFlag_andNoEmptyMaps() {
        PartnerSettings.save(PartnerCloudSettings(quickStatusByPartner: [a: sleeping], displayNameByPartner: [:]),
                             in: defaults)
        XCTAssertTrue(defaults.bool(forKey: PartnerSettings.isSleepingKey))
        XCTAssertNil(defaults.data(forKey: PartnerSettings.displayNameKey))
        PartnerSettings.save(PartnerCloudSettings(), in: defaults)
        XCTAssertNil(defaults.data(forKey: PartnerSettings.quickStatusKey))
        XCTAssertFalse(defaults.bool(forKey: PartnerSettings.isSleepingKey))
    }

    /// The iCloud record carries only the share's participants' settings, keyed by their iCloud
    /// ids and looked up Crewlu Cloud id first, so a quick status for someone on Crewlu Cloud
    /// alone never reaches an older Crewluve (spec §6.6, §13.5).
    func test_theICloudRecord_isForTheSharesParticipantsOnly() {
        let notes = PartnerMoveOverNotes(cloudPartnerByICloudID: ["_mom": a])
        let settings = PartnerCloudSettings(quickStatusByPartner: [a: callMe, b: sleeping, "_gone": sleeping],
                                            displayNameByPartner: [a: "Todd", b: "Captain", "_dad": "T"])
        let record = PartnerSettings.iCloudRecord(for: ["_mom", "_dad"], settings: settings, notes: notes)
        XCTAssertEqual(record.quickStatusByPartner, ["_mom": callMe])
        XCTAssertEqual(record.displayNameByPartner, ["_mom": "Todd", "_dad": "T"])
        XCTAssertEqual(record.quickStatus, callMe)
        XCTAssertEqual(record.quickStatusTargets, ["_mom"])
        XCTAssertFalse(record.isSleeping, "only someone outside the share was told Sleeping")
    }

    /// A Crewlu Cloud id that starts with a digit sorts before the status for everyone, so it used
    /// to become the top-level status an older Crewluve shows everyone. Now it stays out.
    func test_theRecordsTopLevelStatus_comesFromTheSharesParticipants() {
        let digitID = "0aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        let settings = PartnerCloudSettings(
            quickStatusByPartner: [digitID: sleeping, PartnerSettings.everyoneKey: callMe, "_mom": callMe],
            displayNameByPartner: [:])
        let record = PartnerSettings.iCloudRecord(for: ["_mom"], settings: settings, notes: PartnerMoveOverNotes())
        XCTAssertEqual(record.quickStatusByPartner, [PartnerSettings.everyoneKey: callMe, "_mom": callMe])
        XCTAssertEqual(record.quickStatus, callMe)
        XCTAssertNil(record.quickStatusTargets, "for everyone")
        XCTAssertFalse(record.isSleeping)
    }

    /// Before this device has read the share once on this version, the record keeps every setting,
    /// as before, and adds each linked person's under their iCloud id, where their Crewluve looks.
    func test_beforeTheShareIsRead_theRecordKeepsEverySetting() {
        let settings = PartnerCloudSettings(quickStatusByPartner: [a: sleeping, b: callMe],
                                            displayNameByPartner: [a: "Todd"])
        let record = PartnerSettings.iCloudRecord(for: nil, settings: settings,
                                                  notes: PartnerMoveOverNotes(cloudPartnerByICloudID: ["_mom": a]))
        XCTAssertEqual(record.quickStatusByPartner, [a: sleeping, b: callMe, "_mom": sleeping])
        XCTAssertEqual(record.displayNameByPartner, [a: "Todd", "_mom": "Todd"])
        XCTAssertEqual(record.quickStatus, sleeping, "the first by key, as before")
        XCTAssertEqual(record.quickStatusTargets, ["_mom"])
        XCTAssertTrue(record.isSleeping)
    }

    /// The record's JSON fields, with sorted keys so the same settings always encode the same.
    func test_theRecordsJSON() throws {
        let settings = PartnerCloudSettings(quickStatusByPartner: ["_mom": callMe, "_dad": callMe],
                                            displayNameByPartner: ["_mom": "Todd", "_dad": "T", "_ann": "Captain",
                                                                   "_bo": "Al", "_cy": "Cap", "_ed": "Dad"])
        let record = PartnerSettings.iCloudRecord(for: ["_mom", "_dad", "_ann", "_bo", "_cy", "_ed"],
                                                  settings: settings, notes: PartnerMoveOverNotes())
        let statuses = try XCTUnwrap(record.quickStatusByPartnerJSON)
        XCTAssertEqual(String(decoding: statuses, as: UTF8.self),
                       #"{"_dad":{"icon":"phone.fill","status":"Call Me"},"_mom":{"icon":"phone.fill","status":"Call Me"}}"#)
        let names = try XCTUnwrap(record.displayNameByPartnerJSON)
        XCTAssertEqual(String(decoding: names, as: UTF8.self),
                       #"{"_ann":"Captain","_bo":"Al","_cy":"Cap","_dad":"T","_ed":"Dad","_mom":"Todd"}"#)
        XCTAssertNil(PartnerSettings.ICloudRecord().quickStatusByPartnerJSON)
        XCTAssertNil(PartnerSettings.ICloudRecord().displayNameByPartnerJSON)
    }

    /// No settings: no quick status at all, as before.
    func test_aRecordWithNoQuickStatus() {
        let record = PartnerSettings.iCloudRecord(for: ["_mom"], settings: PartnerCloudSettings(),
                                                  notes: PartnerMoveOverNotes())
        XCTAssertTrue(record.quickStatusByPartner.isEmpty)
        XCTAssertNil(record.quickStatus)
        XCTAssertNil(record.quickStatusTargets)
        XCTAssertFalse(record.isSleeping)
    }
}
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `type 'PartnerSettings' has no member 'quickStatus'` and `requires that 'PartnerQuickStatusEntry' conform to 'Equatable'`.

- [x] **Step 3: Make the quick status comparable**

One replacement in `Duty/Models/SharedPilotStatus.swift`:

In `Duty/Models/SharedPilotStatus.swift`, replace:

```swift
import CloudKit

/// Per-partner quick status entry (e.g. "Call Me" targeted at a specific partner)
struct PartnerQuickStatusEntry: Codable, Sendable {
    let status: String    // "Call Me", "Free to Talk", "Out for Dinner", "Sleeping"
    let icon: String      // SF Symbol name
    let expiry: Date?     // nil = no limit
```

with:

```swift
import CloudKit

/// Per-partner quick status entry (e.g. "Call Me" targeted at a specific partner)
struct PartnerQuickStatusEntry: Codable, Equatable, Sendable {
    let status: String    // "Call Me", "Free to Talk", "Out for Dinner", "Sleeping"
    let icon: String      // SF Symbol name
    let expiry: Date?     // nil = no limit
```

- [x] **Step 4: Write the settings**

The header; `PartnerCloudSettings` is `Equatable`; the participants' key; Clear by both ids; the clean-ups forget the notes; and the new section: the lookup, the writes, the move, saving, and the iCloud record.

6 replacements, in order, in `Duty/Utils/PartnerCloud/PartnerSettings.swift`:

In `Duty/Utils/PartnerCloud/PartnerSettings.swift`, replace:

```swift
//  The per-person partner settings (spec §6.6): a quick status, and the name the
//  partner sees the pilot as. They stay in today's keys, synced across the pilot's
//  devices by PartnerDataKVSync, and are keyed by cloud id for Crewlu Cloud
//  partners. The quick status sheet writes them; removing a partner forgets
//  theirs. The move-over adds the lookup by iCloud id for people who moved over.
//

import Foundation

/// A snapshot of the per-person settings.
struct PartnerCloudSettings: Sendable {
    /// Keyed by partner id. `PartnerSettings.everyoneKey` holds a status sent to everyone.
    var quickStatusByPartner: [String: PartnerQuickStatusEntry] = [:]
    /// The name each partner sees the pilot as, keyed by partner id.
```

with:

```swift
//  The per-person partner settings (spec §6.6): a quick status, and the name the
//  partner sees the pilot as. They stay in today's keys, synced across the pilot's
//  devices by PartnerDataKVSync, and are keyed by cloud id for Crewlu Cloud
//  partners. Someone who moved over from iCloud keeps theirs under their cloud id:
//  they're read by either id, and the iCloud record maps them back to iCloud ids.
//

import Foundation

/// A snapshot of the per-person settings.
struct PartnerCloudSettings: Equatable, Sendable {
    /// Keyed by partner id. `PartnerSettings.everyoneKey` holds a status sent to everyone.
    var quickStatusByPartner: [String: PartnerQuickStatusEntry] = [:]
    /// The name each partner sees the pilot as, keyed by partner id.
```

In `Duty/Utils/PartnerCloud/PartnerSettings.swift`, replace:

```swift
    /// Crewlu Cloud partners' names live on Crewlu Cloud (`partners.name`) instead.
    static let nicknamesKey = "partnerNicknames"
    static let nicknameKeyPrefix = "partnerNickname."

    /// The saved settings. One that can't be read counts as none.
    static func load(from defaults: UserDefaults = .standard) -> PartnerCloudSettings {
```

with:

```swift
    /// Crewlu Cloud partners' names live on Crewlu Cloud (`partners.name`) instead.
    static let nicknamesKey = "partnerNicknames"
    static let nicknameKeyPrefix = "partnerNickname."
    /// The iCloud share's participants that iCloud identifies, as this device last read them. The
    /// iCloud manager keeps it; the iCloud record's per-person settings are for them.
    static let iCloudParticipantsKey = "partnerBeacon.participantIDs"

    /// The saved settings. One that can't be read counts as none.
    static func load(from defaults: UserDefaults = .standard) -> PartnerCloudSettings {
```

In `Duty/Utils/PartnerCloud/PartnerSettings.swift`, replace:

```swift
        }
    }

    /// Clears one person's quick status (the quick status sheet's Clear). A status for everyone
    /// ends too: Send To with everyone picked also saved it under each of them, so the others
    /// keep theirs and the one cleared stops seeing it (P2-3).
    static func clearQuickStatus(for id: String, in defaults: UserDefaults = .standard) {
        var statuses = load(from: defaults).quickStatusByPartner
        statuses.removeValue(forKey: id)
        statuses.removeValue(forKey: everyoneKey)
        save(statuses, forKey: quickStatusKey, in: defaults)
        defaults.set(statuses.values.contains { $0.status == "Sleeping" }, forKey: isSleepingKey)
```

with:

```swift
        }
    }

    /// Clears one person's quick status (the quick status sheet's Clear), under both their ids.
    /// A status for everyone ends too: Send To with everyone picked also saved it under each of
    /// them, so the others keep theirs and the one cleared stops seeing it (P2-3).
    static func clearQuickStatus(for id: String, in defaults: UserDefaults = .standard) {
        var statuses = load(from: defaults).quickStatusByPartner
        for id in ids(for: id, notes: .load(from: defaults)) {
            statuses.removeValue(forKey: id)
        }
        statuses.removeValue(forKey: everyoneKey)
        save(statuses, forKey: quickStatusKey, in: defaults)
        defaults.set(statuses.values.contains { $0.status == "Sleeping" }, forKey: isSleepingKey)
```

In `Duty/Utils/PartnerCloud/PartnerSettings.swift`, replace:

```swift
    }

    /// Ending the iCloud share (spec §7.3): forgets its people's settings, by their iCloud ids,
    /// and every nickname. Crewlu Cloud partners' settings and a status for everyone stay, on this
    /// device and, through key-value sync, on the pilot's others. The caller syncs it.
    static func forgetICloudSharing(ids: [String], in defaults: UserDefaults = .standard) {
        for id in ids {
            forget(id, in: defaults)
```

with:

```swift
    }

    /// Ending the iCloud share (spec §7.3): forgets its people's settings, by their iCloud ids,
    /// every nickname and the move-over's notes. Crewlu Cloud partners' settings, those of
    /// everyone who moved over included, and a status for everyone stay, on this device and,
    /// through key-value sync, on the pilot's others. The caller syncs it.
    static func forgetICloudSharing(ids: [String], in defaults: UserDefaults = .standard) {
        for id in ids {
            forget(id, in: defaults)
```

In `Duty/Utils/PartnerCloud/PartnerSettings.swift`, replace:

```swift
        for key in iCloudNicknameKeys(in: defaults) {
            defaults.removeObject(forKey: key)
        }
    }

    /// Stop Sharing with Everyone on Crewlu Cloud (spec §6.2): every per-person setting and every
    /// nickname. The caller syncs it.
    static func forgetEverything(in defaults: UserDefaults = .standard) {
        defaults.removeObject(forKey: quickStatusKey)
        defaults.removeObject(forKey: displayNameKey)
```

with:

```swift
        for key in iCloudNicknameKeys(in: defaults) {
            defaults.removeObject(forKey: key)
        }
        PartnerMoveOverNotes.forget(in: defaults)
    }

    /// Stop Sharing with Everyone on Crewlu Cloud (spec §6.2): every per-person setting, every
    /// nickname and the move-over's notes. The caller syncs it.
    static func forgetEverything(in defaults: UserDefaults = .standard) {
        defaults.removeObject(forKey: quickStatusKey)
        defaults.removeObject(forKey: displayNameKey)
```

In `Duty/Utils/PartnerCloud/PartnerSettings.swift`, replace:

```swift
        for key in iCloudNicknameKeys(in: defaults) {
            defaults.removeObject(forKey: key)
        }
    }

    /// Saved as PartnerQuickStatusSheet saves them; an empty map isn't kept.
```

with:

```swift
        for key in iCloudNicknameKeys(in: defaults) {
            defaults.removeObject(forKey: key)
        }
        PartnerMoveOverNotes.forget(in: defaults)
    }

    // MARK: - Someone who moved over from iCloud (spec §6.6)

    /// Their ids, the one their settings live under first: the Crewlu Cloud partner's once the
    /// move-over linked them, then the iCloud participant's.
    private static func ids(for id: String, notes: PartnerMoveOverNotes) -> [String] {
        if let cloudID = notes.cloudPartnerByICloudID[id] { return [cloudID, id] }
        if let iCloudID = notes.iCloudID(for: id) { return [id, iCloudID] }
        return [id]
    }

    /// A person's quick status, by either of their ids.
    static func quickStatus(for id: String, in settings: PartnerCloudSettings,
                            notes: PartnerMoveOverNotes) -> PartnerQuickStatusEntry? {
        ids(for: id, notes: notes).lazy.compactMap { settings.quickStatusByPartner[$0] }.first
    }

    /// The name a person sees the pilot as, by either of their ids. An empty one counts as none.
    static func displayName(for id: String, in settings: PartnerCloudSettings, notes: PartnerMoveOverNotes) -> String? {
        ids(for: id, notes: notes).lazy.compactMap { settings.displayNameByPartner[$0] }.first { !$0.isEmpty }
    }

    /// The quick status sheet's Send: the status for each person picked, under the id their
    /// settings live under, and for everyone too when `everyone` (Send To with everyone picked).
    /// An older copy under their other id goes, so it can't come back.
    static func setQuickStatus(_ entry: PartnerQuickStatusEntry, for people: [String], everyone: Bool,
                               in defaults: UserDefaults = .standard) {
        let notes = PartnerMoveOverNotes.load(from: defaults)
        var settings = load(from: defaults)
        for person in people {
            let ids = ids(for: person, notes: notes)
            ids.forEach { settings.quickStatusByPartner.removeValue(forKey: $0) }
            settings.quickStatusByPartner[ids[0]] = entry
        }
        if everyone {
            settings.quickStatusByPartner[everyoneKey] = entry
        }
        save(settings, in: defaults)
    }

    /// The name a person sees the pilot as, under the id their settings live under. Empty
    /// removes it, under both ids.
    static func setDisplayName(_ name: String, for person: String, in defaults: UserDefaults = .standard) {
        let ids = ids(for: person, notes: .load(from: defaults))
        var settings = load(from: defaults)
        ids.forEach { settings.displayNameByPartner.removeValue(forKey: $0) }
        let name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if !name.isEmpty {
            settings.displayNameByPartner[ids[0]] = name
        }
        save(settings, in: defaults)
    }

    /// The move-over's second step (spec §7.3): each linked person's settings move from their
    /// iCloud id to their Crewlu Cloud id (`links` is `{iCloud id: Crewlu Cloud id}`). One already
    /// kept under the Crewlu Cloud id stays, and the iCloud id's goes either way, so a status
    /// cleared later can't come back from it. Nil when there's nothing to move.
    static func movingOver(_ links: [String: String], in settings: PartnerCloudSettings) -> PartnerCloudSettings? {
        var moved = settings
        for (iCloudID, cloudID) in links {
            if let entry = moved.quickStatusByPartner.removeValue(forKey: iCloudID),
               moved.quickStatusByPartner[cloudID] == nil {
                moved.quickStatusByPartner[cloudID] = entry
            }
            if let name = moved.displayNameByPartner.removeValue(forKey: iCloudID),
               moved.displayNameByPartner[cloudID] == nil {
                moved.displayNameByPartner[cloudID] = name
            }
        }
        return moved == settings ? nil : moved
    }

    /// Saves both maps as the quick status sheet does, and the Sleeping flag beside them. The
    /// caller syncs them.
    static func save(_ settings: PartnerCloudSettings, in defaults: UserDefaults = .standard) {
        save(settings.quickStatusByPartner, forKey: quickStatusKey, in: defaults)
        save(settings.displayNameByPartner, forKey: displayNameKey, in: defaults)
        defaults.set(settings.quickStatusByPartner.values.contains { $0.status == "Sleeping" }, forKey: isSleepingKey)
    }

    /// The iCloud record's per-person fields: what an older Crewluve reads.
    struct ICloudRecord: Equatable {
        /// By iCloud id, and a status for everyone under its key.
        var quickStatusByPartner: [String: PartnerQuickStatusEntry] = [:]
        var displayNameByPartner: [String: String] = [:]
        /// The record's top-level status, which an older Crewluve shows every partner: the first
        /// entry by key, aimed at that entry's partner, or at everyone with a status for everyone.
        var quickStatus: PartnerQuickStatusEntry?
        var quickStatusTargets: [String]?
        /// Someone in the record is told "Sleeping".
        var isSleeping = false

        /// The record's `quickStatusByPartnerJSON` and `displayNameByPartnerJSON`: nil when empty,
        /// and with sorted keys, so the same settings always encode the same.
        var quickStatusByPartnerJSON: Data? { Self.json(quickStatusByPartner) }
        var displayNameByPartnerJSON: Data? { Self.json(displayNameByPartner) }

        private static func json<Value: Encodable>(_ map: [String: Value]) -> Data? {
            guard !map.isEmpty else { return nil }
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.sortedKeys]
            return try? encoder.encode(map)
        }
    }

    /// The iCloud record's per-person fields, for the share's participants only (spec §6.6, §13.5):
    /// each by their iCloud id, looked up under their Crewlu Cloud id first, so a moved-over
    /// person's older Crewluve still sees what the pilot sets for them, and nothing meant for
    /// someone on Crewlu Cloud alone reaches it. A status for everyone stays. Before this device
    /// has read the share (nil), every setting goes in as before, plus each linked person's under
    /// their iCloud id.
    static func iCloudRecord(for participantIDs: [String]?, settings: PartnerCloudSettings,
                             notes: PartnerMoveOverNotes) -> ICloudRecord {
        let ids = participantIDs ?? Array(Set(settings.quickStatusByPartner.keys)
            .union(settings.displayNameByPartner.keys)
            .union(notes.cloudPartnerByICloudID.keys)
            .subtracting([everyoneKey]))
        var record = ICloudRecord()
        for id in ids {
            record.quickStatusByPartner[id] = quickStatus(for: id, in: settings, notes: notes)
            record.displayNameByPartner[id] = displayName(for: id, in: settings, notes: notes)
        }
        record.quickStatusByPartner[everyoneKey] = settings.quickStatusByPartner[everyoneKey]
        // As the record has always derived them: deterministic, by key.
        let first = record.quickStatusByPartner.min { $0.key < $1.key }
        record.quickStatus = first?.value
        record.quickStatusTargets = record.quickStatusByPartner[everyoneKey] != nil ? nil : first.map { [$0.key] }
        record.isSleeping = record.quickStatusByPartner.values.contains { $0.status == "Sleeping" }
        return record
    }

    /// Saved as PartnerQuickStatusSheet saves them; an empty map isn't kept.
```

- [x] **Step 5: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 120 tests, with 0 failures`.

- [x] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerSettings.swift Duty/Models/SharedPilotStatus.swift DutyTests/PartnerSettingsTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): PartnerSettings follows someone who moved over, by either id, and builds the iCloud record's per-person fields for the share's participants only" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 5: The store's move-over calls

**Files:**
- Modify: `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`
- Test: `DutyTests/PartnerCloudStoreTests.swift`

Decision 2: making someone's partner and asking for their ticket, for the account the list follows, without reading the list after each; and reading the list for the move-over, after any read that's out.

- [x] **Step 1: Write the failing tests**

One replacement in `DutyTests/PartnerCloudStoreTests.swift`:

In `DutyTests/PartnerCloudStoreTests.swift`, replace:

```swift
        store.accountChanged()
        XCTAssertEqual(redraws.count, 3, "signing out")
    }
}

/// Counts Observation's change calls, which may come from any thread.
```

with:

```swift
        store.accountChanged()
        XCTAssertEqual(redraws.count, 3, "signing out")
    }

    // MARK: - The move-over (plan 2c)

    /// The move-over makes the partner for an iCloud participant by their iCloud id, and asks for
    /// their ticket. Neither reads the list again: the move-over notes the answers first, then
    /// reads the list once, so it never shows the person twice (spec §7.3).
    func test_theMoveOversCalls_dontReadTheListAgain() async throws {
        let store = await loadedStore()
        let id = try await store.moveOver(name: " Mom ", iCloudID: "_mom")
        let ticket = try await store.moveTicket(for: id)
        XCTAssertEqual(id, "partner-_mom")
        XCTAssertEqual(ticket, "ticket-partner-_mom")
        let actions = await api.actions
        let reads = await api.partnersCalls
        XCTAssertEqual(actions, ["create Mom _mom", "moveTicket partner-_mom"])
        XCTAssertEqual(reads, 1, "only the first read")
    }

    func test_theMoveOversCalls_needTheSignedInAccountsList() async {
        let store = await loadedStore()
        signedInAs = "PILOT-2"
        do {
            _ = try await store.moveTicket(for: a)
            XCTFail("asked for an account the list isn't")
        } catch {
            XCTAssertEqual(error as? PartnerCloudError, .notSignedIn)
        }
        let actions = await api.actions
        XCTAssertEqual(actions, [])
    }

    /// The move-over decides from a list read after it asks, even when a read was already out.
    func test_readingTheListNow_waitsForAReadThatStartsAfterIt() async {
        let store = await loadedStore()
        await api.holdReads()
        let read = Task { await store.refresh() }
        await api.waitForReads(2)                     // out, with Sam and Jo
        await api.answerPartners(.success([partner(a, "Sam")]))
        let readNow = Task { await store.readListNow() }
        await api.releaseReads()
        let worked = await readNow.value
        await read.value
        let reads = await api.partnersCalls
        XCTAssertTrue(worked)
        XCTAssertEqual(reads, 3, "the read that was out, and one more")
        XCTAssertEqual(store.partners.map(\.name), ["Sam"])
    }

    func test_readingTheListNow_saysWhenItCouldnt() async {
        let store = await loadedStore()
        await api.answerPartners(.failure(.unavailable))
        let worked = await store.readListNow()
        XCTAssertFalse(worked)
    }

    /// Only for the account the list follows: until it catches up with a switch, nothing is read.
    func test_readingTheListNow_needsTheAccountTheListFollows() async {
        let store = await loadedStore()
        signedInAs = "PILOT-2"
        let worked = await store.readListNow()
        let reads = await api.partnersCalls
        XCTAssertFalse(worked)
        XCTAssertEqual(reads, 1, "nothing read for PILOT-2 under PILOT-1's list")
    }

    /// A refusal, such as PT404 for someone removed meanwhile, still reads the list again.
    func test_aRefusedMoveOverCall_readsTheListAgain() async {
        let store = await loadedStore()
        await api.failNext("moveTicket", with: .refused(code: "PT404"))
        _ = try? await store.moveTicket(for: a)
        let reads = await api.partnersCalls
        XCTAssertEqual(reads, 2)
    }
}

/// Counts Observation's change calls, which may come from any thread.
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `value of type 'PartnerCloudStore' has no member 'moveTicket'`.

- [x] **Step 3: Write the calls**

The header; the waiters `readListNow()` leaves; `refresh()` letting them go when its reads are done; the two calls; `readListNow()`; and `act` reading the list again only when asked.

4 replacements, in order, in `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`:

In `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`, replace:

```swift
//  signing in; forgotten on signing out. Only the partner ids are saved, per
//  account, so a relaunch keeps writing before the first refresh. The partner
//  screens act through it: each action is followed by a fresh read of the list.
//

import Foundation
```

with:

```swift
//  signing in; forgotten on signing out. Only the partner ids are saved, per
//  account, so a relaunch keeps writing before the first refresh. The partner
//  screens act through it: each action is followed by a fresh read of the list.
//  The move-over makes its partners and asks for its tickets through it too.
//

import Foundation
```

In `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`, replace:

```swift
    @ObservationIgnored private var refreshingAccount: String?
    /// A refresh was asked for while one was out: read once more when it's done.
    @ObservationIgnored private var readAgain = false
    @ObservationIgnored private var signInObserver: AnyCancellable?
    private static var activeObserver: NSObjectProtocol?
```

with:

```swift
    @ObservationIgnored private var refreshingAccount: String?
    /// A refresh was asked for while one was out: read once more when it's done.
    @ObservationIgnored private var readAgain = false
    /// Waiting in `readListNow()` for the reads that are out to finish.
    @ObservationIgnored private var listWaiters: [CheckedContinuation<Void, Never>] = []
    @ObservationIgnored private var signInObserver: AnyCancellable?
    private static var activeObserver: NSObjectProtocol?
```

In `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`, replace:

```swift
            if refreshingAccount == uid {
                refreshingAccount = nil
            }
        }
        repeat {
            readAgain = false
```

with:

```swift
            if refreshingAccount == uid {
                refreshingAccount = nil
            }
            let waiters = listWaiters
            listWaiters = []
            waiters.forEach { $0.resume() }
        }
        repeat {
            readAgain = false
```

In `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`, replace:

```swift
        try await act { try await $0.removeAllPartners() }
    }

    /// Runs an action for the account this list belongs to, then reads the list again, unless
    /// Crewlu Cloud couldn't be reached or wants a sign-in: then nothing changed there.
    private func act<T>(_ action: (any PartnerCloudAPI) async throws -> T) async throws -> T {
        guard let uid = accountID, uid == currentUserID() else { throw PartnerCloudError.notSignedIn }
        do {
            let result = try await action(api)
            noteSignIn(expired: false, for: uid)
            await refresh()
            return result
        } catch {
            let error = error as? PartnerCloudError ?? .unavailable
```

with:

```swift
        try await act { try await $0.removeAllPartners() }
    }

    // MARK: - The move-over (spec §7.3)

    /// Makes the Crewlu Cloud partner for an iCloud participant, by their iCloud id: the same
    /// person gets the same partner from any of the pilot's devices, and an existing one isn't
    /// renamed. The list isn't read again: the move-over notes the answer first, then reads it
    /// once, so the list never shows the person twice.
    func moveOver(name: String, iCloudID: String) async throws -> String {
        let name = Self.cleanName(name)
        return try await act(readingAgain: false) { try await $0.createPartner(name: name, ref: iCloudID) }.id
    }

    /// The ticket that moves a partner over from iCloud. Tickets aren't in the list, so it isn't read again.
    func moveTicket(for id: String) async throws -> String {
        try await act(readingAgain: false) { try await $0.moveTicket(for: id) }
    }

    /// Reads the list, and returns once a read that started after this call has finished, even
    /// when one was already out: the move-over decides from it. True when that read worked.
    func readListNow() async -> Bool {
        guard let uid = accountID, uid == currentUserID() else { return false }
        if refreshingAccount == uid {
            readAgain = true
            await withCheckedContinuation { listWaiters.append($0) }
        } else {
            await refresh()
        }
        return accountID == uid && hasLoadedList && !lastRefreshFailed
    }

    /// Runs an action for the account this list belongs to, then reads the list again, unless
    /// Crewlu Cloud couldn't be reached or wants a sign-in: then nothing changed there.
    private func act<T>(readingAgain: Bool = true,
                        _ action: (any PartnerCloudAPI) async throws -> T) async throws -> T {
        guard let uid = accountID, uid == currentUserID() else { throw PartnerCloudError.notSignedIn }
        do {
            let result = try await action(api)
            noteSignIn(expired: false, for: uid)
            if readingAgain {
                await refresh()
            }
            return result
        } catch {
            let error = error as? PartnerCloudError ?? .unavailable
```

- [x] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 126 tests, with 0 failures`.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerCloudStore.swift DutyTests/PartnerCloudStoreTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): PartnerCloudStore makes the move-over's partners and asks for its tickets without reading the list after each, and reads the list for it" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 6: The move-over's decision

**Files:**
- Create: `Duty/Utils/PartnerCloud/PartnerMoveOver.swift`
- Modify: `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`
- Test: `DutyTests/PartnerMoveOverTests.swift`

Spec §7.3 and §8.1 as a pure function (decisions 7, 11): whom to make, whose settings move, who gets a ticket, and whether the share ends. Task 9 adds the runner to the same file.

- [x] **Step 1: Write the failing tests**

File: `DutyTests/PartnerMoveOverTests.swift`

```swift
//
//  PartnerMoveOverTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §7, §8.1): the move-over's decision.
//

import XCTest
@testable import Duty

final class PartnerMoveOverTests: XCTestCase {
    private let a = PartnerSummaryExamples.partnerA
    private let b = PartnerSummaryExamples.partnerB
    private let mom = PartnerMoveOver.Participant(iCloudID: "_mom", name: "Mom")
    private let dad = PartnerMoveOver.Participant(iCloudID: "_dad", name: "Dad")
    private let callMe = PartnerQuickStatusEntry(status: "Call Me", icon: "phone.fill", expiry: nil)

    private func partner(_ id: String, _ name: String) -> PartnerCloudPartner {
        PartnerCloudPartner(id: id, name: name, inviteToken: "invite-\(name)", createdAt: nil)
    }

    private func device(of partner: String, kind: String = "app") -> PartnerCloudDevice {
        PartnerCloudDevice(id: "\(kind)-\(partner)", partnerID: partner, kind: kind, label: "Their \(kind)",
                           createdAt: nil, lastSeenAt: nil)
    }

    private func plan(_ participants: [PartnerMoveOver.Participant],
                      partners: [PartnerCloudPartner] = [],
                      devices: [PartnerCloudDevice] = [],
                      notes: PartnerMoveOverNotes = PartnerMoveOverNotes(),
                      settings: PartnerCloudSettings = PartnerCloudSettings(),
                      openPendingLabels: Bool = false) -> PartnerMoveOver.Plan {
        PartnerMoveOver.plan(PartnerMoveOver.Input(participants: participants, partners: partners, devices: devices,
                                                   notes: notes, settings: settings,
                                                   hasOpenPendingLabels: openPendingLabels))
    }

    /// Mom and Dad, both linked to their Crewlu Cloud partners.
    private let linked = PartnerMoveOverNotes(cloudPartnerByICloudID: ["_mom": PartnerSummaryExamples.partnerA,
                                                                      "_dad": PartnerSummaryExamples.partnerB])

    // MARK: - Step 1: a Crewlu Cloud partner for each participant

    func test_eachParticipant_getsAPartner_byTheirICloudId() {
        let plan = plan([mom, dad])
        XCTAssertEqual(plan.creates, [PartnerMoveOver.Create(iCloudID: "_mom", name: "Mom"),
                                      PartnerMoveOver.Create(iCloudID: "_dad", name: "Dad")])
        XCTAssertEqual(plan.tickets, [], "tickets come once they're linked")
        XCTAssertFalse(plan.endsICloudShare)
    }

    /// Not anyone the pilot removed, nor anyone iCloud can't identify (spec §7.3, §7.6).
    func test_theRemoved_andTheUnidentified_getNoPartner() {
        let stranger = PartnerMoveOver.Participant(iCloudID: nil, name: "Partner")
        let plan = plan([mom, dad, stranger], notes: PartnerMoveOverNotes(removedICloudPartners: ["_dad"]))
        XCTAssertEqual(plan.creates, [PartnerMoveOver.Create(iCloudID: "_mom", name: "Mom")])
    }

    /// The name as Crewlu Cloud keeps it, and "Partner" when nothing's left of it.
    func test_theName_isCleaned() {
        let long = PartnerMoveOver.Participant(iCloudID: "_jo", name: String(repeating: "J", count: 70))
        let blank = PartnerMoveOver.Participant(iCloudID: "_sam", name: "   ")
        XCTAssertEqual(plan([long, blank]).creates, [
            PartnerMoveOver.Create(iCloudID: "_jo", name: String(repeating: "J", count: 60)),
            PartnerMoveOver.Create(iCloudID: "_sam", name: "Partner"),
        ])
    }

    /// Linked to a partner who isn't in the list (removed on Crewlu Cloud, or another account's):
    /// made again, which gives the same partner for the same account.
    func test_someoneLinkedToAPartnerNotInTheList_isMadeAgain() {
        let plan = plan([mom, dad], partners: [partner(b, "Dad")], notes: linked)
        XCTAssertEqual(plan.creates, [PartnerMoveOver.Create(iCloudID: "_mom", name: "Mom")])
        XCTAssertEqual(plan.tickets, [PartnerMoveOver.Link(iCloudID: "_dad", cloudID: b)])
    }

    // MARK: - Step 2: their settings follow them

    func test_theSettings_moveToTheCrewluCloudIdOfEveryoneLinked() {
        let settings = PartnerCloudSettings(quickStatusByPartner: ["_mom": callMe, "_dad": callMe],
                                            displayNameByPartner: ["_mom": "Todd"])
        let plan = plan([mom, dad], partners: [partner(a, "Mom")], notes: linked, settings: settings)
        XCTAssertEqual(plan.settings, PartnerCloudSettings(quickStatusByPartner: [a: callMe, "_dad": callMe],
                                                           displayNameByPartner: [a: "Todd"]),
                       "Dad isn't linked yet: his partner isn't in the list")
        XCTAssertNil(self.plan([mom], partners: [partner(a, "Mom")], notes: linked).settings, "nothing to move")
    }

    // MARK: - Step 3: tickets

    /// A ticket for everyone linked without an `app` device: a website doesn't count, because
    /// their Crewluve may still be the older one (supabase/partner-api.md).
    func test_aTicket_forEveryoneLinked_untilTheyHaveTheApp() {
        let partners = [partner(a, "Mom"), partner(b, "Dad")]
        XCTAssertEqual(plan([mom, dad], partners: partners, devices: [device(of: a, kind: "web")], notes: linked).tickets,
                       [PartnerMoveOver.Link(iCloudID: "_mom", cloudID: a), PartnerMoveOver.Link(iCloudID: "_dad", cloudID: b)])
        XCTAssertEqual(plan([mom, dad], partners: partners, devices: [device(of: a)], notes: linked).tickets,
                       [PartnerMoveOver.Link(iCloudID: "_dad", cloudID: b)])
    }

    /// Someone the pilot removed gets no ticket, even while still linked.
    func test_noTicket_forSomeoneRemoved() {
        var notes = linked
        notes.removedICloudPartners = ["_mom"]
        XCTAssertEqual(plan([mom], partners: [partner(a, "Mom")], notes: notes).tickets, [])
    }

    // MARK: - Step 5: the end of the iCloud share

    func test_theShareEnds_onceEveryoneHasMovedOver() {
        let plan = plan([mom, dad], partners: [partner(a, "Mom"), partner(b, "Dad")],
                        devices: [device(of: a), device(of: b), device(of: b, kind: "web")], notes: linked)
        XCTAssertTrue(plan.endsICloudShare)
        XCTAssertEqual(plan.tickets, [])
        XCTAssertEqual(plan.creates, [])
    }

    /// It holds for anyone not moved over yet, or not linked yet, for anyone iCloud can't
    /// identify, and for a pending invite still open on this device (spec §7.3, §7.6).
    func test_theShareHolds_untilNobodyStillReadsThroughIt() {
        let both = [partner(a, "Mom"), partner(b, "Dad")]
        let apps = [device(of: a), device(of: b)]
        let stranger = PartnerMoveOver.Participant(iCloudID: nil, name: "Partner")
        XCTAssertFalse(plan([mom, dad], partners: both, devices: [device(of: a)], notes: linked).endsICloudShare,
                       "Dad hasn't moved over")
        XCTAssertFalse(plan([mom, dad], partners: [partner(a, "Mom")], devices: apps, notes: linked).endsICloudShare,
                       "Dad isn't linked")
        XCTAssertFalse(plan([mom, dad, stranger], partners: both, devices: apps, notes: linked).endsICloudShare,
                       "someone iCloud can't identify")
        XCTAssertFalse(plan([mom, dad], partners: both, devices: apps, notes: linked, openPendingLabels: true).endsICloudShare,
                       "a pending invite from before the update")
    }

    /// Someone the pilot removed who joined again through the old iCloud link still reads through
    /// it: nobody is cut off.
    func test_someoneRemovedWhoJoinedAgain_holdsTheShare() {
        let notes = PartnerMoveOverNotes(cloudPartnerByICloudID: ["_mom": a], removedICloudPartners: ["_dad"])
        let plan = plan([mom, dad], partners: [partner(a, "Mom")], devices: [device(of: a)], notes: notes)
        XCTAssertEqual(plan.creates, [])
        XCTAssertFalse(plan.endsICloudShare)
    }
}
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `cannot find 'PartnerMoveOver' in scope`.

- [x] **Step 3: Write the decision**

File: `Duty/Utils/PartnerCloud/PartnerMoveOver.swift`

```swift
//
//  PartnerMoveOver.swift
//  Duty
//
//  The move-over (spec §7): everyone connected through iCloud moves over to Crewlu
//  Cloud by themselves. Each run, the decision below says what to do: make each
//  iCloud participant's Crewlu Cloud partner, move their settings to it, hand them
//  a ticket through the iCloud record until their new Crewluve has used it, and
//  end the iCloud share once nobody reads through it any more.
//

import Foundation

enum PartnerMoveOver {
    /// An accepted participant of the iCloud share.
    struct Participant: Equatable, Sendable {
        /// Their iCloud user record name; nil when iCloud can't identify them.
        let iCloudID: String?
        /// Their name in the list: the pilot's nickname for them, or their iCloud name.
        let name: String
    }

    /// A Crewlu Cloud partner to make for an iCloud participant.
    struct Create: Equatable, Sendable {
        let iCloudID: String
        let name: String
    }

    /// An iCloud participant and the Crewlu Cloud partner they became.
    struct Link: Equatable, Sendable {
        let iCloudID: String
        let cloudID: String
    }

    /// What a run knows, read just before it decides.
    struct Input {
        var participants: [Participant]
        /// The account's Crewlu Cloud partners and their devices.
        var partners: [PartnerCloudPartner]
        var devices: [PartnerCloudDevice]
        var notes: PartnerMoveOverNotes
        var settings: PartnerCloudSettings
        /// A pending invite sent through iCloud before the update is still open on this device:
        /// its link still works, and someone may yet accept it.
        var hasOpenPendingLabels: Bool
    }

    /// The steps of a run (spec §7.3), in the order the runner takes them.
    struct Plan: Equatable {
        /// 1. Partners to make, in the share's order.
        var creates: [Create] = []
        /// 2. The settings once everyone linked has theirs under their Crewlu Cloud id, or nil
        ///    when there's nothing to move.
        var settings: PartnerCloudSettings?
        /// 3. Whose tickets to ask for. Every other ticket goes from the notes.
        var tickets: [Link] = []
        /// 5. Nobody reads through the iCloud share any more: end it.
        var endsICloudShare = false
    }

    /// Someone is linked once the notes name their Crewlu Cloud partner and it's in the list.
    /// Someone the pilot removed isn't made again, and gets no ticket. The share ends only when
    /// every participant is linked and has an `app` device (a website doesn't count: their
    /// Crewluve may still be the older one), iCloud can identify them all, and no pending
    /// invite is open here.
    static func plan(_ input: Input) -> Plan {
        let partnerIDs = Set(input.partners.map(\.id))
        let appUsers = Set(input.devices.filter { $0.kind == "app" }.map(\.partnerID))
        var plan = Plan()
        var links: [String: String] = [:]
        var everyoneMovedOver = !input.hasOpenPendingLabels
        for participant in input.participants {
            guard let iCloudID = participant.iCloudID else {
                everyoneMovedOver = false
                continue
            }
            let isRemoved = input.notes.removedICloudPartners.contains(iCloudID)
            guard let cloudID = input.notes.cloudPartnerByICloudID[iCloudID], partnerIDs.contains(cloudID) else {
                everyoneMovedOver = false
                if !isRemoved {
                    let name = PartnerCloudStore.cleanName(participant.name)
                    plan.creates.append(Create(iCloudID: iCloudID, name: name.isEmpty ? "Partner" : name))
                }
                continue
            }
            links[iCloudID] = cloudID
            if !appUsers.contains(cloudID) {
                everyoneMovedOver = false
                if !isRemoved {
                    plan.tickets.append(Link(iCloudID: iCloudID, cloudID: cloudID))
                }
            }
        }
        plan.settings = PartnerSettings.movingOver(links, in: input.settings)
        plan.endsICloudShare = everyoneMovedOver
        return plan
    }
}
```

- [x] **Step 4: Let the decision clean names**

Names are cleaned as Crewlu Cloud keeps them, by the store's own `cleanName`, which is pure. On the main actor it couldn't be called from the decision.

One replacement in `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`:

In `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`, replace:

```swift
    }

    /// A name as Crewlu Cloud keeps it: trimmed, and at most 60 characters, which it counts
    /// in code points. A character that would go past 60 is left out whole.
    static func cleanName(_ name: String) -> String {
        var kept = ""
        var codePoints = 0
        for character in name.trimmingCharacters(in: .whitespacesAndNewlines) {
```

with:

```swift
    }

    /// A name as Crewlu Cloud keeps it: trimmed, and at most 60 characters, which it counts
    /// in code points. A character that would go past 60 is left out whole. Pure, so the
    /// move-over's decision uses it too.
    nonisolated static func cleanName(_ name: String) -> String {
        var kept = ""
        var codePoints = 0
        for character in name.trimmingCharacters(in: .whitespacesAndNewlines) {
```

- [x] **Step 5: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 136 tests, with 0 failures`.

- [x] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerMoveOver.swift Duty/Utils/PartnerCloud/PartnerCloudStore.swift DutyTests/PartnerMoveOverTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): PartnerMoveOver, the move-over's decision: whom to make, whose settings move, who gets a ticket, and when the iCloud share ends" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 7: The iCloud record, per participant

**Files:**
- Modify: `Duty/Utils/PartnerBeacon/PartnerStatusGenerator.swift`, `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`

Spec §13.5's gap, closed (decisions 4 and 5): the generator builds the record's per-person fields through Task 4's `PartnerSettings.iCloudRecord`, for the participants the iCloud manager saves each time it reads the share, and the manager writes the notes' tickets into the record. This is SwiftData and CloudKit code the harness can't build, so Task 12's compile, the review and the user's run check it; Task 4's tests pin the fields, and Task 3's the tickets.

- [x] **Step 1: Build the record's per-person fields per participant**

The quick statuses are pruned as before, and the Sleeping flag beside them still covers everyone; the record's fields come from `PartnerSettings.iCloudRecord`.

One replacement in `Duty/Utils/PartnerBeacon/PartnerStatusGenerator.swift`:

In `Duty/Utils/PartnerBeacon/PartnerStatusGenerator.swift`, replace:

```swift
            }
        }

        // Encode per-partner dict for CloudKit
        let quickStatusByPartnerJSON: Data? = quickStatusByPartner.isEmpty
            ? nil
            : (try? JSONEncoder().encode(quickStatusByPartner))

        // Backward compat: isSleeping if any partner has "Sleeping" status
        isSleeping = quickStatusByPartner.values.contains(where: { $0.status == "Sleeping" })
        UserDefaults.standard.set(isSleeping, forKey: "partnerBeacon.isSleeping")

        // Backward compat: derive legacy fields from first active entry
        // Dictionary iteration is unordered — sort by key for a deterministic representative
        let sortedEntries = quickStatusByPartner.sorted(by: { $0.key < $1.key })
        let firstActive = sortedEntries.first
        let quickStatus: String? = firstActive?.value.status
        let quickStatusIcon: String? = firstActive?.value.icon
        let quickStatusExpiry: Date? = firstActive?.value.expiry
        // Legacy field: must target only the first entry's partner to stay consistent
        // with quickStatus/quickStatusIcon/quickStatusExpiry (all derived from firstActive).
        // Sending all IDs would cause old app versions to show the wrong status to non-first partners.
        let quickStatusTargets: [String]? = quickStatusByPartner.keys.contains("__everyone__")
            ? nil
            : sortedEntries.first.map { [$0.key] }

        // Per-partner display names
        let displayNameByPartner: [String: String] = {
            guard let data = defaults.data(forKey: "crewluve.displayNameByPartner") else { return [:] }
            return (try? JSONDecoder().decode([String: String].self, from: data)) ?? [:]
        }()
        let displayNameByPartnerJSON: Data? = displayNameByPartner.isEmpty
            ? nil
            : (try? JSONEncoder().encode(displayNameByPartner))

        // Stable fallback: always use pilot's actual first name
        // Per-partner custom names are resolved on the receiving side via displayNameByPartnerJSON
```

with:

```swift
            }
        }

        // Kept beside the quick statuses for older readers: anyone is told "Sleeping"
        UserDefaults.standard.set(quickStatusByPartner.values.contains(where: { $0.status == "Sleeping" }),
                                  forKey: "partnerBeacon.isSleeping")

        // Per-partner display names
        let displayNameByPartner: [String: String] = {
            guard let data = defaults.data(forKey: "crewluve.displayNameByPartner") else { return [:] }
            return (try? JSONDecoder().decode([String: String].self, from: data)) ?? [:]
        }()

        // The iCloud record's per-person fields (partner links, spec §6.6): for the share's
        // participants only, each looked up under their Crewlu Cloud id first once they've moved
        // over, so nothing meant for someone on Crewlu Cloud alone reaches an older Crewluve.
        // Crewlu Cloud's summary takes its own from the settings (PartnerSummaryEncoder).
        let record = PartnerSettings.iCloudRecord(
            for: defaults.stringArray(forKey: PartnerSettings.iCloudParticipantsKey),
            settings: PartnerCloudSettings(quickStatusByPartner: quickStatusByPartner,
                                           displayNameByPartner: displayNameByPartner),
            notes: .load(from: defaults)
        )
        isSleeping = record.isSleeping
        let quickStatusByPartnerJSON = record.quickStatusByPartnerJSON
        let displayNameByPartnerJSON = record.displayNameByPartnerJSON
        // Backward compat: the legacy fields come from the record's first entry by key, aimed at
        // that entry's partner only, so old app versions don't show it to the others.
        let quickStatus: String? = record.quickStatus?.status
        let quickStatusIcon: String? = record.quickStatus?.icon
        let quickStatusExpiry: Date? = record.quickStatus?.expiry
        let quickStatusTargets: [String]? = record.quickStatusTargets

        // Stable fallback: always use pilot's actual first name
        // Per-partner custom names are resolved on the receiving side via displayNameByPartnerJSON
```

- [x] **Step 2: Save the participants, and write the tickets**

`PartnerInfo` gains the iCloud id iCloud gives (nil when it can't identify someone); the participants it identifies are saved each time the share is read, and forgotten with it; every write puts the notes' tickets in the record, and clears the field when there are none.

8 replacements, in order, in `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`:

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift

struct PartnerInfo: Identifiable {
    let id: String
    let displayName: String
    let acceptanceStatus: CKShare.ParticipantAcceptanceStatus
    let hasResolvedName: Bool
```

with:

```swift

struct PartnerInfo: Identifiable {
    let id: String
    /// Their iCloud user record name; nil when iCloud can't identify them (partner links, spec §7.6).
    let iCloudID: String?
    let displayName: String
    let acceptanceStatus: CKShare.ParticipantAcceptanceStatus
    let hasResolvedName: Bool
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
        shareURL = nil
        partners = []
        participantIDCache = [:]
        // Keeps the updates going for Crewlu Cloud partners, if there are any
        PartnerBeaconAutoSync.shared.iCloudSharingEnded()
    }
```

with:

```swift
        shareURL = nil
        partners = []
        participantIDCache = [:]
        UserDefaults.standard.removeObject(forKey: PartnerSettings.iCloudParticipantsKey)
        // Keeps the updates going for Crewlu Cloud partners, if there are any
        PartnerBeaconAutoSync.shared.iCloudSharingEnded()
    }
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
        debugLog("[PartnerBeacon] Status details - isHome: \(status.isHome), nextDeparture: \(status.nextDepartureTime?.formatted(date: .abbreviated, time: .standard) ?? "nil")")

        // Always use the fixed "pilot-status" record name
        let record = status.toCKRecord(in: zoneID)
        debugLog("[PartnerBeacon] Created CKRecord with \(record.allKeys().count) fields, recordName: \(record.recordID.recordName)")

        do {
```

with:

```swift
        debugLog("[PartnerBeacon] Status details - isHome: \(status.isHome), nextDeparture: \(status.nextDepartureTime?.formatted(date: .abbreviated, time: .standard) ?? "nil")")

        // Always use the fixed "pilot-status" record name
        let record = recordToWrite(for: status)
        debugLog("[PartnerBeacon] Created CKRecord with \(record.allKeys().count) fields, recordName: \(record.recordID.recordName)")

        do {
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
        }
    }

    /// Fetches latest record, applies status, and saves. Sets errorMessage on failure so callers (e.g. conflict-retry path) surface errors to the UI.
    private func fetchAndUpdateStatus(_ status: SharedPilotStatus) async {
        let recordID = CKRecord.ID(recordName: "pilot-status", zoneID: zoneID)
```

with:

```swift
        }
    }

    /// The record to write: the status, and the move-over's tickets for the share's participants
    /// (partner links, spec §7.4). Every device on this version writes the same tickets, from the
    /// synced notes, signed in or not.
    private func recordToWrite(for status: SharedPilotStatus) -> CKRecord {
        let record = status.toCKRecord(in: zoneID)
        let participantIDs = UserDefaults.standard.stringArray(forKey: PartnerSettings.iCloudParticipantsKey)
        record[Self.moveTicketsKey] = PartnerMoveOverNotes.load().ticketsJSON(for: participantIDs) as CKRecordValue?
        return record
    }

    /// Fetches latest record, applies status, and saves. Sets errorMessage on failure so callers (e.g. conflict-retry path) surface errors to the UI.
    private func fetchAndUpdateStatus(_ status: SharedPilotStatus) async {
        let recordID = CKRecord.ID(recordName: "pilot-status", zoneID: zoneID)
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
            }

            // Update fields on existing record
            let updatedRecord = status.toCKRecord(in: zoneID)
            for key in updatedRecord.allKeys() {
                existingRecord[key] = updatedRecord[key]
            }
```

with:

```swift
            }

            // Update fields on existing record
            let updatedRecord = recordToWrite(for: status)
            for key in updatedRecord.allKeys() {
                existingRecord[key] = updatedRecord[key]
            }
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
    /// rejection branches in `updateStatus`/`fetchAndUpdateStatus`.
    private static let writerBuildVersionKey = "writerBuildVersion"

    /// This device's CFBundleVersion as an Int (0 if missing/non-numeric — never blocks writes).
    private static let localBuildVersion: Int =
        Int(Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "0") ?? 0
```

with:

```swift
    /// rejection branches in `updateStatus`/`fetchAndUpdateStatus`.
    private static let writerBuildVersionKey = "writerBuildVersion"

    /// The move-over's tickets in the record: `{iCloud user record name: ticket}` as JSON (spec §7.4).
    /// Crewluve finds its own by `container.userRecordID().recordName` and redeems it.
    private static let moveTicketsKey = "moveTicketByPartnerJSON"

    /// This device's CFBundleVersion as an Int (0 if missing/non-numeric — never blocks writes).
    private static let localBuildVersion: Int =
        Int(Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "0") ?? 0
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
    /// CKRecord keys that should be explicitly nil'd when their corresponding model value is cleared.
    private static let clearableKeys: Set<String> = [
        "quickStatus", "quickStatusIcon", "quickStatusExpiry",
        "quickStatusByPartnerJSON", "displayNameByPartnerJSON",
        "flightDelayMinutes",
        "nextDepartureLabel",
        "homeArrivalTime", "homeArrivalLabel", "homeArrivalCity"
```

with:

```swift
    /// CKRecord keys that should be explicitly nil'd when their corresponding model value is cleared.
    private static let clearableKeys: Set<String> = [
        "quickStatus", "quickStatusIcon", "quickStatusExpiry",
        "quickStatusByPartnerJSON", "displayNameByPartnerJSON", moveTicketsKey,
        "flightDelayMinutes",
        "nextDepartureLabel",
        "homeArrivalTime", "homeArrivalLabel", "homeArrivalCity"
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
                let (name, resolved) = displayNameAndResolved(for: participant)
                return PartnerInfo(
                    id: stableID(for: participant),
                    displayName: name,
                    acceptanceStatus: participant.acceptanceStatus,
                    hasResolvedName: resolved
                )
            }
    }

    /// Re-fetch the CKShare from CloudKit and refresh the partner list.
```

with:

```swift
                let (name, resolved) = displayNameAndResolved(for: participant)
                return PartnerInfo(
                    id: stableID(for: participant),
                    iCloudID: participant.userIdentity.userRecordID?.recordName,
                    displayName: name,
                    acceptanceStatus: participant.acceptanceStatus,
                    hasResolvedName: resolved
                )
            }
        // The iCloud record's per-person settings are for these people (PartnerStatusGenerator),
        // as is the move-over's work.
        UserDefaults.standard.set(partners.compactMap(\.iCloudID), forKey: PartnerSettings.iCloudParticipantsKey)
    }

    /// Re-fetch the CKShare from CloudKit and refresh the partner list.
```

- [x] **Step 3: Run the harness: nothing it tests changes**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 136 tests, with 0 failures`.

- [x] **Step 4: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerBeacon/PartnerStatusGenerator.swift Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): the iCloud record carries only the share's participants' per-person settings, and the move-over's tickets" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 8: The iCloud side of the move-over

**Files:**
- Modify: `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, `Duty/Utils/PartnerBeacon/PartnerBeaconAutoSync.swift`, `Duty/Utils/PartnerBeacon/PartnerDataKVSync.swift`

What the runner (Task 9) needs from the app's iCloud side: the participants as it sees them, a read of the share that says whether it worked, the tickets the record carries, and writing the record again (decisions 5, 6). Removing someone notes it (decision 9), the late joiners' matching clears their display name under both ids (decision 10), and the notes sync to the pilot's devices (decision 12). Compile-only, as in Task 7.

- [x] **Step 1: Give the move-over its view of the share**

`fetchExistingShare()` and `refreshParticipants()` say whether they read the share; the move-over's participants and the record's tickets; a removal notes it; `clearDisplayName` clears both ids; the clean-up on finding the share gone forgets the notes too.

9 replacements, in order, in `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`:

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
    
    // MARK: - Sharing Management
    
    /// Check if sharing is already set up by fetching the known status record and its share reference
    private func fetchExistingShare() async {
        let recordID = CKRecord.ID(recordName: "pilot-status", zoneID: zoneID)
        debugLog("[PartnerBeacon] 🔍 Fetching existing share state...")
        debugLog("[PartnerBeacon]   UserDefaults isSharing: \(UserDefaults.standard.bool(forKey: "partnerBeacon.isSharing"))")
```

with:

```swift
    
    // MARK: - Sharing Management
    
    /// Check if sharing is already set up by fetching the known status record and its share reference.
    /// True when it found out, share or not; false when it couldn't read them.
    @discardableResult
    private func fetchExistingShare() async -> Bool {
        let recordID = CKRecord.ID(recordName: "pilot-status", zoneID: zoneID)
        debugLog("[PartnerBeacon] 🔍 Fetching existing share state...")
        debugLog("[PartnerBeacon]   UserDefaults isSharing: \(UserDefaults.standard.bool(forKey: "partnerBeacon.isSharing"))")
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
                    debugLog("[PartnerBeacon]     URL: \(share.url?.absoluteString ?? "nil")")
                    debugLog("[PartnerBeacon]     Participants: \(share.participants.count) total, \(partners.count) partners")
                    debugLog("[PartnerBeacon]     Partners: \(partners.map { $0.displayName })")
                    return
                } else {
                    debugLog("[PartnerBeacon]   ⚠️ Share reference record is not a CKShare (type: \(type(of: shareRecord)))")
                    setIsSharing(false)
                    await selfHealOrphanedPartnerState()
                    return
                }
            } else {
                debugLog("[PartnerBeacon]   ℹ️ Record has no share reference")
```

with:

```swift
                    debugLog("[PartnerBeacon]     URL: \(share.url?.absoluteString ?? "nil")")
                    debugLog("[PartnerBeacon]     Participants: \(share.participants.count) total, \(partners.count) partners")
                    debugLog("[PartnerBeacon]     Partners: \(partners.map { $0.displayName })")
                    return true
                } else {
                    debugLog("[PartnerBeacon]   ⚠️ Share reference record is not a CKShare (type: \(type(of: shareRecord)))")
                    setIsSharing(false)
                    await selfHealOrphanedPartnerState()
                    return true
                }
            } else {
                debugLog("[PartnerBeacon]   ℹ️ Record has no share reference")
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
            setIsSharing(false)
            await selfHealOrphanedPartnerState()
            debugLog("[PartnerBeacon]   → Status record exists but no active share. Set isSharing=false")
        } catch let error as CKError where error.code == .unknownItem {
            // No status record exists yet — not sharing
            setIsSharing(false)
            await selfHealOrphanedPartnerState()
            debugLog("[PartnerBeacon]   ℹ️ No status record found (unknownItem) — set isSharing=false")
        } catch {
            debugLog("[PartnerBeacon]   ❌ Error fetching existing share: \(error)")
            debugLog("[PartnerBeacon]   → Keeping UserDefaults isSharing=\(isSharing) as fallback")
            errorMessage = SyncGuidanceCopy.friendlyMessage("Couldn't load partner list", for: error)
        }
    }
    
```

with:

```swift
            setIsSharing(false)
            await selfHealOrphanedPartnerState()
            debugLog("[PartnerBeacon]   → Status record exists but no active share. Set isSharing=false")
            return true
        } catch let error as CKError where error.code == .unknownItem {
            // No status record exists yet — not sharing
            setIsSharing(false)
            await selfHealOrphanedPartnerState()
            debugLog("[PartnerBeacon]   ℹ️ No status record found (unknownItem) — set isSharing=false")
            return true
        } catch {
            debugLog("[PartnerBeacon]   ❌ Error fetching existing share: \(error)")
            debugLog("[PartnerBeacon]   → Keeping UserDefaults isSharing=\(isSharing) as fallback")
            errorMessage = SyncGuidanceCopy.friendlyMessage("Couldn't load partner list", for: error)
            return false
        }
    }
    
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
    /// same iCloud account starts with a clean label. Used by the auto-bind path:
    /// when the user labels a fresh pending invite (e.g., "Mary Anderson"), any prior
    /// Display Name they had set for that participant (e.g., "Magic man" from a
    /// previous session) is wiped so the new label fully replaces the old one.
    func clearDisplayName(forID partnerID: String) {
        let ud = UserDefaults.standard
        guard let data = ud.data(forKey: "crewluve.displayNameByPartner"),
              var dict = try? JSONDecoder().decode([String: String].self, from: data),
              dict.removeValue(forKey: partnerID) != nil else { return }
        if dict.isEmpty {
            ud.removeObject(forKey: "crewluve.displayNameByPartner")
        } else if let encoded = try? JSONEncoder().encode(dict) {
            ud.set(encoded, forKey: "crewluve.displayNameByPartner")
        }
        PartnerDataKVSync.shared.pushToKVS()
    }
```

with:

```swift
    /// same iCloud account starts with a clean label. Used by the auto-bind path:
    /// when the user labels a fresh pending invite (e.g., "Mary Anderson"), any prior
    /// Display Name they had set for that participant (e.g., "Magic man" from a
    /// previous session) is wiped so the new label fully replaces the old one. Once the
    /// move-over linked them, it goes under their Crewlu Cloud id too.
    func clearDisplayName(forID partnerID: String) {
        guard PartnerSettings.displayName(for: partnerID, in: PartnerSettings.load(), notes: .load()) != nil else { return }
        PartnerSettings.setDisplayName("", for: partnerID)
        PartnerDataKVSync.shared.pushToKVS()
    }
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift

    /// Re-fetch the CKShare from CloudKit and refresh the partner list.
    /// If currentShare is nil but isSharing is true, reconcile by re-running fetchExistingShare.
    func refreshParticipants() async {
        if currentShare == nil && isSharing {
            debugLog("[PartnerBeacon] refreshParticipants: orphaned state (isSharing=true, currentShare=nil) — reconciling")
            await fetchExistingShare()
            return
        }
        guard let share = currentShare else { return }
        do {
            let record = try await privateDatabase.record(for: share.recordID)
            if let refreshedShare = record as? CKShare {
                currentShare = refreshedShare
                refreshPartners(from: refreshedShare)
                errorMessage = nil
                debugLog("[PartnerBeacon] Refreshed participants: \(partners.map { $0.displayName })")
            }
        } catch let error as CKError where error.code == .unknownItem {
            debugLog("[PartnerBeacon] Share no longer exists (unknownItem) — clearing local state")
            clearLocalSharingState()
        } catch {
            debugLog("[PartnerBeacon] Failed to refresh participants: \(error)")
            errorMessage = SyncGuidanceCopy.friendlyMessage("Couldn't load partner list", for: error)
        }
    }

    /// Removes a partner from the current CKShare by their stable participant ID.
```

with:

```swift

    /// Re-fetch the CKShare from CloudKit and refresh the partner list.
    /// If currentShare is nil but isSharing is true, reconcile by re-running fetchExistingShare.
    /// True when the share was read, or found gone; false when it couldn't be read.
    @discardableResult
    func refreshParticipants() async -> Bool {
        if currentShare == nil && isSharing {
            debugLog("[PartnerBeacon] refreshParticipants: orphaned state (isSharing=true, currentShare=nil) — reconciling")
            return await fetchExistingShare()
        }
        guard let share = currentShare else { return true }
        do {
            let record = try await privateDatabase.record(for: share.recordID)
            guard let refreshedShare = record as? CKShare else { return false }
            currentShare = refreshedShare
            refreshPartners(from: refreshedShare)
            errorMessage = nil
            debugLog("[PartnerBeacon] Refreshed participants: \(partners.map { $0.displayName })")
            return true
        } catch let error as CKError where error.code == .unknownItem {
            debugLog("[PartnerBeacon] Share no longer exists (unknownItem) — clearing local state")
            clearLocalSharingState()
            return true
        } catch {
            debugLog("[PartnerBeacon] Failed to refresh participants: \(error)")
            errorMessage = SyncGuidanceCopy.friendlyMessage("Couldn't load partner list", for: error)
            return false
        }
    }

    // MARK: - The move-over (partner links, spec §7)

    /// The share's accepted participants, as the move-over sees them.
    var moveOverParticipants: [PartnerMoveOver.Participant] {
        partners.filter { !$0.isPending }.map {
            PartnerMoveOver.Participant(iCloudID: $0.iCloudID, name: $0.displayName)
        }
    }

    /// The tickets the record carries, as this device last wrote or read it.
    var recordMoveTickets: [String: String] {
        guard let data = statusRecord?[Self.moveTicketsKey] as? Data else { return [:] }
        return (try? JSONDecoder().decode([String: String].self, from: data)) ?? [:]
    }

    /// Removes a partner from the current CKShare by their stable participant ID.
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
                    await endICloudShare()
                }
            }
            // Clear all per-partner local state. Otherwise a same-iCloud-account re-invite
            // resurrects the stale nickname/displayName because their stableID matches the
            // previous one, and the CKRecord still carries an entry under that ID.
```

with:

```swift
                    await endICloudShare()
                }
            }
            // The move-over doesn't make them again (spec §7.5): a no-op unless it linked them,
            // and after the share has ended.
            PartnerMoveOverNotes.noteRemoved(id)
            // Clear all per-partner local state. Otherwise a same-iCloud-account re-invite
            // resurrects the stale nickname/displayName because their stableID matches the
            // previous one, and the CKRecord still carries an entry under that ID.
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift

    /// Runs after `fetchExistingShare()` confirms sharing is not active server-side.
    /// Wipes orphaned iCloud partner state left over from a previous session: the
    /// nicknames and the pending invites, whose links no longer work. Skips the wipe
    /// when there's none, so the common case of "first ever launch with no share
    /// yet" is a true no-op. The per-person settings stay (spec §12.4): Crewlu Cloud
    /// partners' are in the same keys, and this runs on each of the pilot's devices,
```

with:

```swift

    /// Runs after `fetchExistingShare()` confirms sharing is not active server-side.
    /// Wipes orphaned iCloud partner state left over from a previous session: the
    /// nicknames, the move-over's notes and the pending invites, whose links no
    /// longer work (spec §7.6). Skips the wipe
    /// when there's none, so the common case of "first ever launch with no share
    /// yet" is a true no-op. The per-person settings stay (spec §12.4): Crewlu Cloud
    /// partners' are in the same keys, and this runs on each of the pilot's devices,
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
    private func selfHealOrphanedPartnerState() async {
        let hasPendingInvites = !(await PendingPartnerInvites.load()).isEmpty
        let hasOrphans = !PartnerSettings.iCloudNicknameKeys().isEmpty || hasPendingInvites
        guard hasOrphans else { return }
        debugLog("[PartnerBeacon] 🧹 Self-heal: clearing orphaned iCloud partner state (no active share)")
        await clearICloudOnlyPartnerState()
```

with:

```swift
    private func selfHealOrphanedPartnerState() async {
        let hasPendingInvites = !(await PendingPartnerInvites.load()).isEmpty
        let hasOrphans = !PartnerSettings.iCloudNicknameKeys().isEmpty || hasPendingInvites
            || PartnerMoveOverNotes.load() != PartnerMoveOverNotes()
        guard hasOrphans else { return }
        debugLog("[PartnerBeacon] 🧹 Self-heal: clearing orphaned iCloud partner state (no active share)")
        await clearICloudOnlyPartnerState()
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
    }

    /// Wipes what iCloud sharing alone uses: the settings of the iCloud partners given, the
    /// nicknames (Crewlu Cloud partners' names live on Crewlu Cloud) and the pending invites.
    /// Syncs the change to the pilot's other devices.
    private func clearICloudOnlyPartnerState(forgetting iCloudPartnerIDs: [String] = []) async {
        PartnerSettings.forgetICloudSharing(ids: iCloudPartnerIDs)
```

with:

```swift
    }

    /// Wipes what iCloud sharing alone uses: the settings of the iCloud partners given, the
    /// nicknames (Crewlu Cloud partners' names live on Crewlu Cloud), the move-over's notes and
    /// the pending invites. Syncs the change to the pilot's other devices.
    private func clearICloudOnlyPartnerState(forgetting iCloudPartnerIDs: [String] = []) async {
        PartnerSettings.forgetICloudSharing(ids: iCloudPartnerIDs)
```

- [x] **Step 2: Write the record again on request**

One replacement in `Duty/Utils/PartnerBeacon/PartnerBeaconAutoSync.swift`:

In `Duty/Utils/PartnerBeacon/PartnerBeaconAutoSync.swift`, replace:

```swift
        PartnerDataKVSync.shared.pushToKVS()
    }

    /// Immediately push the pilot's current status **if partner sharing is active**.
    /// Safe to call from app-foreground and UI taps (e.g. the global countdown timer):
    /// it self-gates on sharing, starts monitoring if it wasn't running yet, and bypasses
```

with:

```swift
        PartnerDataKVSync.shared.pushToKVS()
    }

    /// Writes the iCloud record even if the status didn't change: the move-over's tickets did,
    /// or the record doesn't carry them yet (partner links, spec §7.3). The record takes them
    /// from the notes.
    func rewriteICloudRecord() async {
        lastSentStatus = nil
        await syncNowIfSharing()
    }

    /// Immediately push the pilot's current status **if partner sharing is active**.
    /// Safe to call from app-foreground and UI taps (e.g. the global countdown timer):
    /// it self-gates on sharing, starts monitoring if it wasn't running yet, and bypasses
```

- [x] **Step 3: Sync the notes**

Plain dictionaries and a list, as key-value sync carries them; the external change handler already copies any synced key.

4 replacements, in order, in `Duty/Utils/PartnerBeacon/PartnerDataKVSync.swift`:

In `Duty/Utils/PartnerBeacon/PartnerDataKVSync.swift`, replace:

```swift
///
/// **What we sync** — user preferences that should be consistent across devices:
/// - Display names per partner, quick statuses per partner, flight delay info, partner nicknames
///
/// **What we don't sync** — derived state each device computes independently:
/// - `partnerBeacon.isSharing` (derived from CKShare state)
```

with:

```swift
///
/// **What we sync** — user preferences that should be consistent across devices:
/// - Display names per partner, quick statuses per partner, flight delay info, partner nicknames
/// - The move-over's notes (partner links, spec §7.1), so every device writes the same tickets
///
/// **What we don't sync** — derived state each device computes independently:
/// - `partnerBeacon.isSharing` (derived from CKShare state)
```

In `Duty/Utils/PartnerBeacon/PartnerDataKVSync.swift`, replace:

```swift
        "crewluve.delayedFlightDeparture",
        "crewluve.delayedFlightArrival",
        "crewluve.delayedFlightDepartureTime",
        "partnerNicknames"
    ]

    /// Prefix for individual nickname keys (backward compat reads)
```

with:

```swift
        "crewluve.delayedFlightDeparture",
        "crewluve.delayedFlightArrival",
        "crewluve.delayedFlightDepartureTime",
        "partnerNicknames",
        PartnerMoveOverNotes.cloudPartnerKey,
        PartnerMoveOverNotes.moveTicketKey,
        PartnerMoveOverNotes.removedKey
    ]

    /// Prefix for individual nickname keys (backward compat reads)
```

In `Duty/Utils/PartnerBeacon/PartnerDataKVSync.swift`, replace:

```swift

        // Nicknames dictionary
        setKVSDict(ud.dictionary(forKey: "partnerNicknames") as? [String: String], forKey: "partnerNicknames")
    }

    /// Called when a nickname is set or removed. Updates the consolidated dictionary
```

with:

```swift

        // Nicknames dictionary
        setKVSDict(ud.dictionary(forKey: "partnerNicknames") as? [String: String], forKey: "partnerNicknames")

        // The move-over's notes
        for key in [PartnerMoveOverNotes.cloudPartnerKey, PartnerMoveOverNotes.moveTicketKey] {
            setKVSDict(ud.dictionary(forKey: key) as? [String: String], forKey: key)
        }
        setKVSList(ud.stringArray(forKey: PartnerMoveOverNotes.removedKey), forKey: PartnerMoveOverNotes.removedKey)
    }

    /// Called when a nickname is set or removed. Updates the consolidated dictionary
```

In `Duty/Utils/PartnerBeacon/PartnerDataKVSync.swift`, replace:

```swift
            kvStore.removeObject(forKey: key)
        }
    }
}

// MARK: - Notification Name
```

with:

```swift
            kvStore.removeObject(forKey: key)
        }
    }

    private func setKVSList(_ list: [String]?, forKey key: String) {
        if let list, !list.isEmpty {
            kvStore.set(list, forKey: key)
        } else {
            kvStore.removeObject(forKey: key)
        }
    }
}

// MARK: - Notification Name
```

- [x] **Step 4: Run the harness: nothing it tests changes**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 136 tests, with 0 failures`.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift Duty/Utils/PartnerBeacon/PartnerBeaconAutoSync.swift Duty/Utils/PartnerBeacon/PartnerDataKVSync.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): the iCloud side of the move-over: participants as it sees them, the record's tickets, rewriting the record, noting removals, and syncing its notes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 9: The runner

**Files:**
- Modify: `Duty/Utils/PartnerCloud/PartnerMoveOver.swift`, `Duty/App/DutyApp.swift`, `$HARNESS/Sources/Duty/AppStandIns.swift`
- Test: `DutyTests/PartnerMoveOverTests.swift`

Spec §7.2 and §7.3, and decisions 2, 5, 6, 7 and 10: one run at a time, both lists read first, each step in order, and late joiners renamed. The runner's iCloud side is a struct of closures, so the harness tests it with a stand-in, and the app's wiring sits in its `shared` value.

- [x] **Step 1: Write the failing tests**

The file's header, and a second test class at its end.

2 replacements, in order, in `DutyTests/PartnerMoveOverTests.swift`:

In `DutyTests/PartnerMoveOverTests.swift`, replace:

```swift
//  PartnerMoveOverTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §7, §8.1): the move-over's decision.
//

import XCTest
```

with:

```swift
//  PartnerMoveOverTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §7, §8.1): the move-over's decision, and the runner
//  that makes its calls.
//

import XCTest
```

In `DutyTests/PartnerMoveOverTests.swift`, replace:

```swift
        XCTAssertFalse(plan.endsICloudShare)
    }
}
```

with:

```swift
        XCTAssertFalse(plan.endsICloudShare)
    }
}

// MARK: - The runner

@MainActor
final class PartnerMoveOverRunnerTests: XCTestCase {
    private let suite = "PartnerMoveOverRunnerTests"
    private let mom = PartnerMoveOver.Participant(iCloudID: "_mom", name: "Mom")
    private let dad = PartnerMoveOver.Participant(iCloudID: "_dad", name: "Dad")
    /// The partners Crewlu Cloud makes for them: the stand-in's ids follow from the reference.
    private let momsID = "partner-_mom"
    private let dadsID = "partner-_dad"
    private let callMe = PartnerQuickStatusEntry(status: "Call Me", icon: "phone.fill", expiry: nil)
    private var defaults: UserDefaults!
    private var api: StubPartnerCloudAPI!
    private var signedInAs: String?
    private var scheduleIsTheAccounts = true
    private var iCloudSharing = true
    private var iCloudReadWorks = true
    private var shareIsGoneWhenRead = false
    private var participants: [PartnerMoveOver.Participant] = []
    private var recordTickets: [String: String] = [:]
    private var openPendingLabels = false
    /// What the runner did beside its Crewlu Cloud calls, in order.
    private var events: [String] = []

    override func setUp() {
        super.setUp()
        defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        api = StubPartnerCloudAPI()
        signedInAs = "PILOT-1"
        scheduleIsTheAccounts = true
        iCloudSharing = true
        iCloudReadWorks = true
        shareIsGoneWhenRead = false
        participants = [mom, dad]
        recordTickets = [:]
        openPendingLabels = false
        events = []
    }

    private func makeRunner() -> PartnerMoveOverRunner {
        let store = PartnerCloudStore(api: api,
                                      currentUserID: { [unowned self] in self.signedInAs },
                                      ownerAllows: { [unowned self] _ in self.scheduleIsTheAccounts },
                                      defaults: defaults,
                                      partnersChanged: {})
        let iCloud = PartnerMoveOverRunner.ICloudShare(
            isSharing: { [unowned self] in self.iCloudSharing },
            refresh: { [unowned self] in
                self.events.append("read the share")
                if self.shareIsGoneWhenRead { self.iCloudSharing = false }
                return self.iCloudReadWorks
            },
            participants: { [unowned self] in self.participants },
            recordTickets: { [unowned self] in self.recordTickets },
            rewriteRecord: { [unowned self] in
                self.events.append("wrote the record")
                self.recordTickets = PartnerMoveOverNotes.load(from: self.defaults).moveTicketByICloudID
            },
            end: { [unowned self] in
                self.events.append("ended the share")
                self.iCloudSharing = false
            })
        return PartnerMoveOverRunner(store: store, iCloud: iCloud,
                                     hasOpenPendingLabels: { [unowned self] in self.openPendingLabels },
                                     defaults: defaults,
                                     notesChanged: { [unowned self] in self.events.append("synced") },
                                     summaryChanged: { [unowned self] in self.events.append("sent the summary") })
    }

    private func run(_ runner: PartnerMoveOverRunner) async {
        runner.requestRun()
        await runner.waitUntilIdle()
    }

    private func partner(_ id: String, _ name: String) -> PartnerCloudPartner {
        PartnerCloudPartner(id: id, name: name, inviteToken: "invite-\(name)", createdAt: nil)
    }

    private func app(of partner: String) -> PartnerCloudDevice {
        PartnerCloudDevice(id: "app-\(partner)", partnerID: partner, kind: "app", label: "iPhone",
                           createdAt: nil, lastSeenAt: nil)
    }

    private var notes: PartnerMoveOverNotes { PartnerMoveOverNotes.load(from: defaults) }
    private var bothLinked: [String: String] { ["_mom": momsID, "_dad": dadsID] }
    private var bothTickets: [String: String] { ["_mom": "ticket-\(momsID)", "_dad": "ticket-\(dadsID)"] }

    /// Crewlu Cloud lists the partners the move-over makes for Mom and Dad.
    private func listBoth() async {
        await api.answerPartners(.success([partner(momsID, "Mom"), partner(dadsID, "Dad")]))
    }

    /// The first run (spec §7.3): a partner for each, noted before the list is read again, their
    /// settings moved over, a ticket each, and the iCloud record written with the tickets.
    func test_theFirstRun() async {
        await listBoth()
        PartnerSettings.save(PartnerCloudSettings(quickStatusByPartner: ["_mom": callMe],
                                                  displayNameByPartner: ["_dad": "Todd"]), in: defaults)
        await run(makeRunner())
        let actions = await api.actions
        let reads = await api.partnersCalls
        XCTAssertEqual(actions, ["create Mom _mom", "create Dad _dad", "moveTicket \(momsID)", "moveTicket \(dadsID)"])
        XCTAssertEqual(reads, 2, "once before making them, once after")
        XCTAssertEqual(notes, PartnerMoveOverNotes(cloudPartnerByICloudID: bothLinked, moveTicketByICloudID: bothTickets))
        XCTAssertEqual(PartnerSettings.load(from: defaults),
                       PartnerCloudSettings(quickStatusByPartner: [momsID: callMe], displayNameByPartner: [dadsID: "Todd"]))
        XCTAssertEqual(events, ["read the share", "wrote the record", "synced"])
    }

    /// Once they're linked, each run asks for the tickets again, which come back the same while
    /// they're open, and writes nothing when nothing changed.
    func test_aRunWithNothingNew_writesNothing() async {
        await listBoth()
        PartnerMoveOverNotes(cloudPartnerByICloudID: bothLinked, moveTicketByICloudID: bothTickets).save(to: defaults)
        recordTickets = bothTickets
        await run(makeRunner())
        let actions = await api.actions
        XCTAssertEqual(actions, ["moveTicket \(momsID)", "moveTicket \(dadsID)"])
        XCTAssertEqual(events, ["read the share"])
    }

    /// The record is written until it carries the tickets: a write that failed is made again.
    func test_theRecord_isWrittenAgain_untilItCarriesTheTickets() async {
        await listBoth()
        PartnerMoveOverNotes(cloudPartnerByICloudID: bothLinked, moveTicketByICloudID: bothTickets).save(to: defaults)
        await run(makeRunner())
        XCTAssertEqual(events, ["read the share", "wrote the record"])
    }

    /// An expired or used ticket comes back replaced, and the record gets the new one.
    func test_aReplacedTicket_isHandedOver() async {
        await listBoth()
        PartnerMoveOverNotes(cloudPartnerByICloudID: bothLinked, moveTicketByICloudID: bothTickets).save(to: defaults)
        recordTickets = bothTickets
        await api.answerMoveTicket("fresh", for: momsID)
        await run(makeRunner())
        XCTAssertEqual(notes.moveTicketByICloudID, ["_mom": "fresh", "_dad": "ticket-\(dadsID)"])
        XCTAssertEqual(events, ["read the share", "wrote the record", "synced"])
    }

    /// Mom has the new Crewluve: her ticket goes, and the record is written without it.
    func test_someoneWhoMovedOver_getsNoMoreTickets() async {
        await listBoth()
        await api.answerDevices(.success([app(of: momsID)]))
        PartnerMoveOverNotes(cloudPartnerByICloudID: bothLinked, moveTicketByICloudID: bothTickets).save(to: defaults)
        recordTickets = bothTickets
        await run(makeRunner())
        let actions = await api.actions
        XCTAssertEqual(actions, ["moveTicket \(dadsID)"])
        XCTAssertEqual(notes.moveTicketByICloudID, ["_dad": "ticket-\(dadsID)"])
        XCTAssertEqual(recordTickets, ["_dad": "ticket-\(dadsID)"])
    }

    /// Everyone has the new Crewluve: the iCloud share ends, and no tickets are asked for.
    func test_onceEveryoneHasMovedOver_theShareEnds() async {
        await listBoth()
        await api.answerDevices(.success([app(of: momsID), app(of: dadsID)]))
        PartnerMoveOverNotes(cloudPartnerByICloudID: bothLinked).save(to: defaults)
        await run(makeRunner())
        let actions = await api.actions
        XCTAssertEqual(actions, [])
        XCTAssertEqual(events, ["read the share", "ended the share"])
    }

    /// Settings still under someone's iCloud id when the share ends move over first, and the
    /// summary goes out with them.
    func test_settingsMoveOver_beforeTheShareEnds() async {
        await listBoth()
        await api.answerDevices(.success([app(of: momsID), app(of: dadsID)]))
        PartnerMoveOverNotes(cloudPartnerByICloudID: bothLinked).save(to: defaults)
        PartnerSettings.save(PartnerCloudSettings(quickStatusByPartner: ["_mom": callMe]), in: defaults)
        await run(makeRunner())
        XCTAssertEqual(PartnerSettings.load(from: defaults).quickStatusByPartner, [momsID: callMe])
        XCTAssertEqual(events, ["read the share", "ended the share", "sent the summary", "synced"])
    }

    /// A pending invite from before the update, still open here, holds the share up.
    func test_aPendingInvite_holdsTheShareUp() async {
        await listBoth()
        await api.answerDevices(.success([app(of: momsID), app(of: dadsID)]))
        PartnerMoveOverNotes(cloudPartnerByICloudID: bothLinked).save(to: defaults)
        openPendingLabels = true
        await run(makeRunner())
        XCTAssertEqual(events, ["read the share"])
    }

    /// Signed out, holding another account's schedule, or with no iCloud share, nothing happens:
    /// not even a read (spec §7.2).
    func test_itRunsOnlySignedIn_forTheAccountsSchedule_withAnICloudShare() async {
        await listBoth()
        signedInAs = nil
        await run(makeRunner())
        signedInAs = "PILOT-1"
        scheduleIsTheAccounts = false
        await run(makeRunner())
        scheduleIsTheAccounts = true
        iCloudSharing = false
        await run(makeRunner())
        let actions = await api.actions
        let reads = await api.partnersCalls
        XCTAssertEqual(events, [])
        XCTAssertEqual(actions, [])
        XCTAssertEqual(reads, 0)
    }

    /// Without both lists it decides nothing, and the next run picks up (spec §7.3).
    func test_withoutBothLists_itDecidesNothing() async {
        iCloudReadWorks = false
        await run(makeRunner())
        var reads = await api.partnersCalls
        XCTAssertEqual(reads, 0, "the share couldn't be read")

        iCloudReadWorks = true
        shareIsGoneWhenRead = true
        await run(makeRunner())
        reads = await api.partnersCalls
        XCTAssertEqual(reads, 0, "the share was gone")

        iCloudSharing = true
        shareIsGoneWhenRead = false
        await api.answerPartners(.failure(.unavailable))
        await run(makeRunner())
        let actions = await api.actions
        XCTAssertEqual(actions, [], "Crewlu Cloud's list couldn't be read")
        XCTAssertEqual(notes, PartnerMoveOverNotes())
    }

    /// Crewlu Cloud refusing someone (PT409: 25 partners already) skips them, who stay on iCloud.
    func test_aRefusal_skipsThatPerson() async {
        await api.answerPartners(.success([partner(momsID, "Mom")]))
        participants = [dad, mom]
        await api.failNext("create", with: .refused(code: "PT409"))
        await run(makeRunner())
        let actions = await api.actions
        XCTAssertEqual(actions, ["create Dad _dad", "create Mom _mom", "moveTicket \(momsID)"])
        XCTAssertEqual(notes.cloudPartnerByICloudID, ["_mom": momsID])
    }

    /// Anything else stops the run, keeping what it learned: the next run picks up.
    func test_aFailedCall_stopsTheRun() async {
        await listBoth()
        await api.failNext("create", with: .unavailable)
        await run(makeRunner())
        var actions = await api.actions
        XCTAssertEqual(actions, ["create Mom _mom"])
        XCTAssertEqual(notes, PartnerMoveOverNotes())

        await api.failNext("moveTicket", with: .notSignedIn)
        await run(makeRunner())
        actions = await api.actions
        XCTAssertEqual(actions.suffix(3), ["create Mom _mom", "create Dad _dad", "moveTicket \(momsID)"])
        XCTAssertEqual(notes, PartnerMoveOverNotes(cloudPartnerByICloudID: bothLinked), "no tickets yet")
        XCTAssertEqual(events.last, "synced", "what it noted reaches the pilot's other devices")
    }

    /// A run asked for during a run runs once more after it, not alongside it.
    func test_aRunAskedForDuringARun_runsOnceMoreAfterIt() async {
        await listBoth()
        PartnerMoveOverNotes(cloudPartnerByICloudID: bothLinked).save(to: defaults)
        let runner = makeRunner()
        await api.holdReads()
        runner.requestRun()
        await api.waitForReads(1)                       // the first run is reading the list
        runner.requestRun()
        runner.requestRun()
        await api.releaseReads()
        await runner.waitUntilIdle()
        let reads = await api.partnersCalls
        XCTAssertEqual(events.filter { $0 == "read the share" }.count, 2)
        XCTAssertEqual(reads, 2)
    }

    /// Someone who accepted an old iCloud link and was named from a pending invite (spec §7.6):
    /// their partner takes the name, once the run that's out has made it.
    func test_aLateJoinerNamedDuringARun_isRenamedOnceTheirPartnerIsMade() async {
        await api.answerPartners(.success([partner(momsID, "Mary Smith")]))
        participants = [PartnerMoveOver.Participant(iCloudID: "_mom", name: "Mary Smith")]
        let runner = makeRunner()
        await api.holdReads()
        runner.requestRun()
        await api.waitForReads(1)
        await runner.lateJoinerNamed("_mom", "Mom")      // her partner isn't made yet
        await api.releaseReads()
        await runner.waitUntilIdle()
        let actions = await api.actions
        XCTAssertEqual(actions, ["create Mary Smith _mom", "rename \(momsID) Mom", "moveTicket \(momsID)"])
    }

    func test_aLateJoinerNamedLater_isRenamedStraightAway() async {
        await api.answerPartners(.success([partner(momsID, "Mary Smith")]))
        participants = [PartnerMoveOver.Participant(iCloudID: "_mom", name: "Mary Smith")]
        let runner = makeRunner()
        await run(runner)
        await runner.lateJoinerNamed("_mom", "Mom")
        await runner.lateJoinerNamed("_dad", "Dad")      // not linked: nothing to rename
        await run(runner)                                // done with: not renamed again
        let actions = await api.actions
        XCTAssertEqual(actions.filter { $0.hasPrefix("rename") }, ["rename \(momsID) Mom"])
    }

    /// Made with the name already, they aren't renamed.
    func test_aLateJoinerWithTheirNameAlready_isntRenamed() async {
        await api.answerPartners(.success([partner(momsID, "Mom")]))
        participants = [mom]
        let runner = makeRunner()
        await run(runner)
        await runner.lateJoinerNamed("_mom", " Mom ")
        let actions = await api.actions
        XCTAssertEqual(actions.filter { $0.hasPrefix("rename") }, [])
    }
}
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `cannot find type 'PartnerMoveOverRunner' in scope` (or `cannot find 'PartnerMoveOverRunner' in scope`).

- [x] **Step 3: Write the runner**

2 replacements, in order, in `Duty/Utils/PartnerCloud/PartnerMoveOver.swift`:

In `Duty/Utils/PartnerCloud/PartnerMoveOver.swift`, replace:

```swift
//  Cloud by themselves. Each run, the decision below says what to do: make each
//  iCloud participant's Crewlu Cloud partner, move their settings to it, hand them
//  a ticket through the iCloud record until their new Crewluve has used it, and
//  end the iCloud share once nobody reads through it any more.
//

import Foundation

enum PartnerMoveOver {
    /// An accepted participant of the iCloud share.
```

with:

```swift
//  Cloud by themselves. Each run, the decision below says what to do: make each
//  iCloud participant's Crewlu Cloud partner, move their settings to it, hand them
//  a ticket through the iCloud record until their new Crewluve has used it, and
//  end the iCloud share once nobody reads through it any more. The runner makes
//  the calls, for the account the partner list follows.
//

import Foundation
import UIKit

enum PartnerMoveOver {
    /// An accepted participant of the iCloud share.
```

In `Duty/Utils/PartnerCloud/PartnerMoveOver.swift`, replace:

```swift
        return plan
    }
}
```

with:

```swift
        return plan
    }
}

/// Runs the move-over (spec §7.2, §7.3): signed in, the schedule on this phone is that account's,
/// and an iCloud share exists. One run at a time: a run asked for meanwhile runs once more after it.
@MainActor
final class PartnerMoveOverRunner {
    static let shared = PartnerMoveOverRunner(
        store: .shared,
        iCloud: ICloudShare(
            isSharing: { UserDefaults.standard.bool(forKey: "partnerBeacon.isSharing") },
            refresh: {
                let manager = PilotStatusBeaconManager.shared
                await manager.awaitInitialization()
                return await manager.refreshParticipants()
            },
            participants: { PilotStatusBeaconManager.shared.moveOverParticipants },
            recordTickets: { PilotStatusBeaconManager.shared.recordMoveTickets },
            rewriteRecord: { await PartnerBeaconAutoSync.shared.rewriteICloudRecord() },
            end: { await PilotStatusBeaconManager.shared.endICloudShare() }
        ),
        hasOpenPendingLabels: { !(await PendingPartnerInvites.load()).isEmpty },
        defaults: .standard,
        notesChanged: { PartnerDataKVSync.shared.pushToKVS() },
        summaryChanged: { await PartnerBeaconAutoSync.shared.syncNowIfSharing() }
    )

    /// What the move-over needs from the iCloud share: PilotStatusBeaconManager, in the app.
    struct ICloudShare {
        /// A share exists. Read from UserDefaults, so a pilot who shares only through Crewlu Cloud
        /// never starts the iCloud manager.
        var isSharing: () -> Bool
        /// Reads its participants again. False when they couldn't be read.
        var refresh: () async -> Bool
        var participants: () -> [PartnerMoveOver.Participant]
        /// The tickets the record carries now.
        var recordTickets: () -> [String: String]
        /// Writes the record again, with the notes' tickets.
        var rewriteRecord: () async -> Void
        /// Ends the share, keeping Crewlu Cloud partners' settings (`endICloudShare()`).
        var end: () async -> Void
    }

    private let store: PartnerCloudStore
    private let iCloud: ICloudShare
    private let hasOpenPendingLabels: () async -> Bool
    private let defaults: UserDefaults
    /// The notes or the settings changed here: sync them to the pilot's other devices.
    private let notesChanged: () -> Void
    /// A partner was made, or settings moved: send the summary to Crewlu Cloud.
    private let summaryChanged: () async -> Void
    private var runTask: Task<Void, Never>?
    private var runAgain = false
    /// Late joiners' names from pending invites (spec §7.6), by iCloud id, until their partner has them.
    private var lateJoinerNames: [String: String] = [:]
    private static var activeObserver: NSObjectProtocol?

    init(store: PartnerCloudStore,
         iCloud: ICloudShare,
         hasOpenPendingLabels: @escaping () async -> Bool,
         defaults: UserDefaults,
         notesChanged: @escaping () -> Void,
         summaryChanged: @escaping () async -> Void) {
        self.store = store
        self.iCloud = iCloud
        self.hasOpenPendingLabels = hasOpenPendingLabels
        self.defaults = defaults
        self.notesChanged = notesChanged
        self.summaryChanged = summaryChanged
    }

    /// Asks for a run: now, or once more after the one that's out.
    func requestRun() {
        if runTask == nil {
            runTask = Task { await drain() }
        } else {
            runAgain = true
        }
    }

    /// Returns once no run is out.
    func waitUntilIdle() async {
        while let task = runTask {
            await task.value
        }
    }

    /// Someone who accepted an old iCloud link was named from a pending invite (spec §7.6): their
    /// Crewlu Cloud partner takes that name, now if it's made, or once a run that's out has made it.
    /// Someone not linked yet is made with it by the next run.
    func lateJoinerNamed(_ iCloudID: String, _ name: String) async {
        lateJoinerNames[iCloudID] = name
        await renameLateJoiners()
    }

    private func drain() async {
        repeat {
            runAgain = false
            await runOnce()
        } while runAgain
        runTask = nil
    }

    /// One run: both lists are read first, and when either can't be, nothing is decided. Each
    /// step is safe to repeat, and a run that stops partway is finished by the next one.
    private func runOnce() async {
        guard store.sharingAccount() != nil, iCloud.isSharing() else { return }
        store.accountChanged()
        guard await iCloud.refresh(), iCloud.isSharing(), await store.readListNow() else { return }
        var noted = false
        defer {
            if noted { notesChanged() }
        }

        // 1. A Crewlu Cloud partner for each participant, each noted before the list is read
        //    again, so the list never shows anyone twice.
        var made = false
        for create in plan(openPendingLabels: false).creates {
            switch await call({ try await self.store.moveOver(name: create.name, iCloudID: create.iCloudID) }) {
            case .answered(let cloudID):
                var notes = PartnerMoveOverNotes.load(from: defaults)
                notes.cloudPartnerByICloudID[create.iCloudID] = cloudID
                notes.save(to: defaults)
                noted = true
                made = true
            case .skipped:
                continue
            case .stopped:
                return
            }
        }
        if made {
            guard await store.readListNow() else { return }
        }
        await renameLateJoiners()

        // 2. Settings move over, read and saved with nothing in between.
        let openPendingLabels = await hasOpenPendingLabels()
        let plan = plan(openPendingLabels: openPendingLabels)
        if let settings = plan.settings {
            PartnerSettings.save(settings, in: defaults)
            noted = true
        }

        if plan.endsICloudShare {
            // 5. Nobody reads through the iCloud share any more.
            await iCloud.end()
        } else {
            // 3. Tickets: asked for again every run, so an expired or used one is replaced.
            //    Every other ticket goes.
            var tickets: [String: String] = [:]
            for link in plan.tickets {
                switch await call({ try await self.store.moveTicket(for: link.cloudID) }) {
                case .answered(let ticket):
                    tickets[link.iCloudID] = ticket
                case .skipped:
                    continue
                case .stopped:
                    return
                }
            }
            var notes = PartnerMoveOverNotes.load(from: defaults)
            if notes.moveTicketByICloudID != tickets {
                notes.moveTicketByICloudID = tickets
                notes.save(to: defaults)
                noted = true
            }
            // 4. Hand over: the record is written until it carries them. That sends the summary too.
            if iCloud.recordTickets() != tickets {
                await iCloud.rewriteRecord()
                return
            }
        }
        if made || plan.settings != nil {
            await summaryChanged()
        }
    }

    /// Decided from what's known now: the lists the run read, and the notes and settings as they are.
    private func plan(openPendingLabels: Bool) -> PartnerMoveOver.Plan {
        PartnerMoveOver.plan(PartnerMoveOver.Input(
            participants: iCloud.participants(),
            partners: store.partners,
            devices: store.devices,
            notes: .load(from: defaults),
            settings: PartnerSettings.load(from: defaults),
            hasOpenPendingLabels: openPendingLabels
        ))
    }

    private enum Answer<T> {
        case answered(T)
        /// Crewlu Cloud refused it: skip that person.
        case skipped
        /// Offline, or a sign-in is needed: the next run picks up.
        case stopped
    }

    private func call<T>(_ body: () async throws -> T) async -> Answer<T> {
        do {
            return .answered(try await body())
        } catch PartnerCloudError.refused(let code) {
            debugLog("[MoveOver] Crewlu Cloud refused a move-over call (\(code)); skipping that person")
            return .skipped
        } catch {
            debugLog("[MoveOver] Stopping until the next run: \(error)")
            return .stopped
        }
    }

    /// Late joiners whose partner is made take their name.
    private func renameLateJoiners() async {
        for (iCloudID, name) in lateJoinerNames {
            guard let cloudID = PartnerMoveOverNotes.load(from: defaults).cloudPartnerByICloudID[iCloudID],
                  let partner = store.partners.first(where: { $0.id == cloudID }) else { continue }
            if partner.name != PartnerCloudStore.cleanName(name) {
                do {
                    try await store.rename(cloudID, to: name)
                } catch {
                    debugLog("[MoveOver] Couldn't rename a late joiner: \(error)")
                    continue
                }
            }
            lateJoinerNames.removeValue(forKey: iCloudID)
        }
    }

    // MARK: - Following the app

    /// Runs on every activation: at launch, after the share is read, and on coming back to the
    /// app (spec §7.2). Called once, at launch.
    static func startObservingApp() {
        guard activeObserver == nil else { return }
        activeObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { _ in
            Task { @MainActor in PartnerMoveOverRunner.shared.requestRun() }
        }
    }
}
```

- [x] **Step 4: Start it at launch**

Next to the store's: it registers for activation, so launch makes nothing earlier than today.

One replacement in `Duty/App/DutyApp.swift`:

In `Duty/App/DutyApp.swift`, replace:

```swift
        // Partner links: keep the Crewlu Cloud partner list current (coming back to the app,
        // signing in and out), so the summary reaches partners without opening a screen
        PartnerCloudStore.startObservingApp()
        // Register iCloud KVS observer for cross-device partner data sync
        _ = PartnerDataKVSync.shared
        // Register iCloud KVS publisher for cross-device iOS-version mismatch detection
```

with:

```swift
        // Partner links: keep the Crewlu Cloud partner list current (coming back to the app,
        // signing in and out), so the summary reaches partners without opening a screen
        PartnerCloudStore.startObservingApp()
        // ...and move iCloud partners over to Crewlu Cloud, on each activation
        PartnerMoveOverRunner.startObservingApp()
        // Register iCloud KVS observer for cross-device partner data sync
        _ = PartnerDataKVSync.shared
        // Register iCloud KVS publisher for cross-device iOS-version mismatch detection
```

- [x] **Step 5: Give the harness the iCloud manager's stand-in**

The runner's `shared` value reaches for the iCloud manager and AutoSync. The file is Task 2's with those two stand-ins added, so write it whole.

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
    func rewriteICloudRecord() async {}
}

@MainActor
final class PilotStatusBeaconManager {
    static let shared = PilotStatusBeaconManager()
    var moveOverParticipants: [PartnerMoveOver.Participant] { [] }
    var recordMoveTickets: [String: String] { [:] }
    func awaitInitialization() async {}
    func refreshParticipants() async -> Bool { false }
    func endICloudShare() async {}
}

struct LivePartnerCloudAPI: PartnerCloudAPI {
    func setStatus(_ summary: Data, build: Int) async throws -> Bool { throw PartnerCloudError.unavailable }
    func partners() async throws -> [PartnerCloudPartner] { throw PartnerCloudError.unavailable }
    func devices() async throws -> [PartnerCloudDevice] { throw PartnerCloudError.unavailable }
    func createPartner(name: String, ref: String) async throws -> PartnerCloudInvite { throw PartnerCloudError.unavailable }
    func renamePartner(_ id: String, to name: String) async throws { throw PartnerCloudError.unavailable }
    func newLink(for id: String) async throws -> String { throw PartnerCloudError.unavailable }
    func removePartner(_ id: String) async throws { throw PartnerCloudError.unavailable }
    func removeDevice(_ id: String) async throws { throw PartnerCloudError.unavailable }
    func removeAllPartners() async throws { throw PartnerCloudError.unavailable }
    func moveTicket(for id: String) async throws -> String { throw PartnerCloudError.unavailable }
}

final class PartnerDataKVSync {
    static let shared = PartnerDataKVSync()
    func pushToKVS() {}
}
```

- [x] **Step 6: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 152 tests, with 0 failures`.

- [x] **Step 7: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerMoveOver.swift Duty/App/DutyApp.swift DutyTests/PartnerMoveOverTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): PartnerMoveOverRunner makes the move-over's calls on each activation, one run at a time, and renames late joiners" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 10: One row per person

**Files:**
- Modify: `Duty/Utils/PartnerCloud/PartnerList.swift`
- Test: `DutyTests/PartnerListTests.swift`

Spec §6.2 with the move-over (decision 8): someone linked to their Crewlu Cloud partner is one row, still on iCloud until they have the app; each row says who it is on Crewlu Cloud and in the iCloud share. And when Sign Out asks first (decision 13, the user's choice).

- [x] **Step 1: Write the failing tests**

2 replacements, in order, in `DutyTests/PartnerListTests.swift`:

In `DutyTests/PartnerListTests.swift`, replace:

```swift
//  PartnerListTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §6.2, §8.1): the rows of Partner Sharing's list
//  on Crewlu Cloud, their tags and wording, and the hero's "Sharing Active".
//

import XCTest
```

with:

```swift
//  PartnerListTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §6.2, §7, §8.1): the rows of Partner Sharing's list
//  on Crewlu Cloud, their tags and wording, the hero's "Sharing Active", and
//  someone moving over from iCloud.
//

import XCTest
```

In `DutyTests/PartnerListTests.swift`, replace:

```swift
        XCTAssertEqual(PartnerList.lastUpdated(cloud: nil, iCloud: earlier), earlier)
        XCTAssertNil(PartnerList.lastUpdated(cloud: nil, iCloud: nil))
    }
}
```

with:

```swift
        XCTAssertEqual(PartnerList.lastUpdated(cloud: nil, iCloud: earlier), earlier)
        XCTAssertNil(PartnerList.lastUpdated(cloud: nil, iCloud: nil))
    }

    // MARK: - Moving over from iCloud (plan 2c)

    /// Someone the move-over linked is one row, with their Crewlu Cloud name: still on iCloud until
    /// they have the app (a website doesn't count), connected after (spec §6.2).
    func test_someoneLinked_isOneRow_stillOnICloud_untilTheyHaveTheApp() {
        let mom = PartnerList.ICloudPerson(id: "_mom", name: "Mother")
        let rows = { (devices: [PartnerCloudDevice]) in
            PartnerList.rows(partners: [self.partner(self.a, "Mom")], devices: devices, iCloudPeople: [mom],
                             cloudPartnerByICloudID: ["_mom": self.a], pendingLabels: [])
        }
        XCTAssertEqual(rows([]), [PartnerListRow(id: a, name: "Mom", kind: .stillOnICloud, cloudID: a, iCloudID: "_mom")])
        XCTAssertEqual(rows([device("d1", of: a, kind: "web", seen: now)]).map(\.kind), [.stillOnICloud])
        XCTAssertEqual(rows([device("d1", of: a, kind: "web", seen: now), device("d2", of: a, seen: nil)]),
                       [PartnerListRow(id: a, name: "Mom", kind: .connected(devices: 2, lastSeen: now),
                                       cloudID: a, iCloudID: "_mom")])
    }

    /// Linked to a partner who isn't in the list: today's iCloud row, until the move-over makes them again.
    func test_aLinkWhosePartnerIsntInTheList_keepsTheICloudRow() {
        let rows = PartnerList.rows(partners: [], devices: [],
                                    iCloudPeople: [PartnerList.ICloudPerson(id: "_mom", name: "Mom")],
                                    cloudPartnerByICloudID: ["_mom": c], pendingLabels: [])
        XCTAssertEqual(rows, [PartnerListRow(id: "_mom", name: "Mom", kind: .stillOnICloud, iCloudID: "_mom")])
    }

    /// A partner made for someone no longer in the share is a Crewlu Cloud row like any other.
    func test_aPartnerMadeForSomeoneWhoLeftTheShare_isAPlainRow() {
        let rows = PartnerList.rows(partners: [partner(a, "Mom")], devices: [], iCloudPeople: [],
                                    cloudPartnerByICloudID: ["_mom": a], pendingLabels: [])
        XCTAssertEqual(rows, [PartnerListRow(id: a, name: "Mom", kind: .notOpenedYet(sentAt: partner(a, "Mom").createdAt),
                                             cloudID: a)])
    }

    /// The rows say who they are on Crewlu Cloud and in the iCloud share, for the partner page and Remove.
    func test_eachRow_carriesItsIds() {
        let label = PendingPartnerInvite(name: "Grandpa", sentAt: now)
        let rows = PartnerList.rows(partners: [partner(b, "Jake")], devices: [],
                                    iCloudPeople: [PartnerList.ICloudPerson(id: "_mom", name: "Mom")],
                                    pendingLabels: [label])
        XCTAssertEqual(rows.map(\.cloudID), [nil, b, nil])
        XCTAssertEqual(rows.map(\.iCloudID), ["_mom", nil, nil])
    }

    /// The rows still on iCloud keep the share's order, linked or not, so nobody jumps when linked.
    func test_rowsStillOnICloud_keepTheSharesOrder() {
        let rows = PartnerList.rows(
            partners: [partner(b, "Dad", created: 1), partner(a, "Mom", created: 2)],
            devices: [],
            iCloudPeople: [PartnerList.ICloudPerson(id: "_mom", name: "Mom"), PartnerList.ICloudPerson(id: "_jo", name: "Jo"),
                           PartnerList.ICloudPerson(id: "_dad", name: "Dad")],
            cloudPartnerByICloudID: ["_mom": a, "_dad": b],
            pendingLabels: [])
        XCTAssertEqual(rows.map(\.id), [a, "_jo", b])
        XCTAssertEqual(rows.map(\.kind), [.stillOnICloud, .stillOnICloud, .stillOnICloud])
    }

    /// Sign Out asks first only when it stops someone's updates (the user's choice, plan 2c): someone
    /// reading through Crewlu Cloud, or with an invite out. Someone still on iCloud keeps getting
    /// updates through the iCloud record, signed in or not.
    func test_signingOut_asksOnlyWhenItStopsSomeonesUpdates() {
        let mom = PartnerList.ICloudPerson(id: "_mom", name: "Mom")
        func asks(_ partners: [PartnerCloudPartner], _ devices: [PartnerCloudDevice] = [],
                  labels: [PendingPartnerInvite] = [], loaded: Bool = true, cloudSharing: Bool = true) -> Bool {
            let rows = PartnerList.rows(partners: partners, devices: devices, iCloudPeople: [mom],
                                        cloudPartnerByICloudID: ["_mom": a], pendingLabels: labels)
            return PartnerList.signingOutStopsUpdates(rows: rows, hasLoadedList: loaded, isCloudSharing: cloudSharing)
        }
        XCTAssertFalse(asks([partner(a, "Mom")]), "Mom still reads through iCloud")
        XCTAssertFalse(asks([partner(a, "Mom")], labels: [PendingPartnerInvite(name: "Grandpa", sentAt: now)]),
                       "an iCloud invite from before the update")
        XCTAssertTrue(asks([partner(a, "Mom")], [device("d1", of: a, seen: now)]), "Mom moved over")
        XCTAssertTrue(asks([partner(a, "Mom"), partner(b, "Test")]), "an invite is out")
        XCTAssertTrue(asks([partner(a, "Mom")], loaded: false), "before the list is read, as before")
        XCTAssertFalse(asks([partner(a, "Mom"), partner(b, "Test")], cloudSharing: false), "no Crewlu Cloud sharing")
    }
}
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `extra argument 'cloudPartnerByICloudID' in call` and `extra argument 'cloudID' in call`.

- [x] **Step 3: Link the rows**

4 replacements, in order, in `Duty/Utils/PartnerCloud/PartnerList.swift`:

In `Duty/Utils/PartnerCloud/PartnerList.swift`, replace:

```swift
//
//  The rows of Partner Sharing's list on Crewlu Cloud (spec §6.2), and their
//  wording. Pure: the screen passes in what it has, so the rules are tested
//  without a screen.
//

import Foundation
```

with:

```swift
//
//  The rows of Partner Sharing's list on Crewlu Cloud (spec §6.2), and their
//  wording. Pure: the screen passes in what it has, so the rules are tested
//  without a screen. Someone the move-over linked to their Crewlu Cloud partner
//  is one row (spec §7).
//

import Foundation
```

In `Duty/Utils/PartnerCloud/PartnerList.swift`, replace:

```swift
    let id: String
    let name: String
    let kind: Kind
}

enum PartnerList {
```

with:

```swift
    let id: String
    let name: String
    let kind: Kind
    /// Their Crewlu Cloud partner, if they have one.
    var cloudID: String? = nil
    /// Their place in the iCloud share, while they're in it: still on iCloud, or moved over while
    /// the share is up for others.
    var iCloudID: String? = nil
}

enum PartnerList {
```

In `Duty/Utils/PartnerCloud/PartnerList.swift`, replace:

```swift

    /// The rows, grouped as in the approved design: connected, still on iCloud, not opened
    /// yet, then pending invites from before the update. Crewlu Cloud lists partners oldest
    /// first, and each group keeps that order.
    static func rows(partners: [PartnerCloudPartner],
                     devices: [PartnerCloudDevice],
                     iCloudPeople: [ICloudPerson],
                     pendingLabels: [PendingPartnerInvite]) -> [PartnerListRow] {
        let devicesByPartner = Dictionary(grouping: devices, by: \.partnerID)
        var connected: [PartnerListRow] = []
        var notOpened: [PartnerListRow] = []
        for partner in partners {
            if let theirs = devicesByPartner[partner.id], !theirs.isEmpty {
                let lastSeen = theirs.compactMap(\.lastSeenAt).max()
                connected.append(PartnerListRow(id: partner.id, name: partner.name,
                                                kind: .connected(devices: theirs.count, lastSeen: lastSeen)))
            } else {
                notOpened.append(PartnerListRow(id: partner.id, name: partner.name,
                                                kind: .notOpenedYet(sentAt: partner.createdAt)))
            }
        }
        let onICloud = iCloudPeople.map { PartnerListRow(id: $0.id, name: $0.name, kind: .stillOnICloud) }
        let labels = pendingLabels
            .sorted { $0.sentAt < $1.sentAt }
            .map { PartnerListRow(id: $0.id.uuidString, name: $0.name, kind: .sentBeforeUpdate(sentAt: $0.sentAt)) }
```

with:

```swift

    /// The rows, grouped as in the approved design: connected, still on iCloud, not opened
    /// yet, then pending invites from before the update. Crewlu Cloud lists partners oldest
    /// first, and each group keeps that order; those still on iCloud keep the share's.
    /// Someone `cloudPartnerByICloudID` links to a partner in the list is that partner's row,
    /// with its name: still on iCloud until they have an `app` device (a website doesn't count,
    /// their Crewluve may be the older one), connected after.
    static func rows(partners: [PartnerCloudPartner],
                     devices: [PartnerCloudDevice],
                     iCloudPeople: [ICloudPerson],
                     cloudPartnerByICloudID: [String: String] = [:],
                     pendingLabels: [PendingPartnerInvite]) -> [PartnerListRow] {
        let devicesByPartner = Dictionary(grouping: devices, by: \.partnerID)
        let partnersByID = Dictionary(partners.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
        var linkedICloudID: [String: String] = [:]
        for person in iCloudPeople {
            if let cloudID = cloudPartnerByICloudID[person.id] {
                linkedICloudID[cloudID] = person.id
            }
        }
        func hasTheApp(_ cloudID: String) -> Bool {
            devicesByPartner[cloudID]?.contains { $0.kind == "app" } ?? false
        }
        var connected: [PartnerListRow] = []
        var notOpened: [PartnerListRow] = []
        for partner in partners {
            let iCloudID = linkedICloudID[partner.id]
            if iCloudID != nil && !hasTheApp(partner.id) {
                continue                                    // still on iCloud: below, in the share's order
            }
            if let theirs = devicesByPartner[partner.id], !theirs.isEmpty {
                let lastSeen = theirs.compactMap(\.lastSeenAt).max()
                connected.append(PartnerListRow(id: partner.id, name: partner.name,
                                                kind: .connected(devices: theirs.count, lastSeen: lastSeen),
                                                cloudID: partner.id, iCloudID: iCloudID))
            } else {
                notOpened.append(PartnerListRow(id: partner.id, name: partner.name,
                                                kind: .notOpenedYet(sentAt: partner.createdAt), cloudID: partner.id))
            }
        }
        let onICloud = iCloudPeople.compactMap { person -> PartnerListRow? in
            guard let cloudID = cloudPartnerByICloudID[person.id], let partner = partnersByID[cloudID] else {
                return PartnerListRow(id: person.id, name: person.name, kind: .stillOnICloud, iCloudID: person.id)
            }
            guard !hasTheApp(cloudID) else { return nil }   // connected, above
            return PartnerListRow(id: cloudID, name: partner.name, kind: .stillOnICloud,
                                  cloudID: cloudID, iCloudID: person.id)
        }
        let labels = pendingLabels
            .sorted { $0.sentAt < $1.sentAt }
            .map { PartnerListRow(id: $0.id.uuidString, name: $0.name, kind: .sentBeforeUpdate(sentAt: $0.sentAt)) }
```

In `Duty/Utils/PartnerCloud/PartnerList.swift`, replace:

```swift
        }
    }

    /// The hero says "Sharing Active" while there's a Crewlu Cloud partner or an iCloud share.
    static func isSharingActive(cloudPartners: Int, iCloudSharing: Bool) -> Bool {
        cloudPartners > 0 || iCloudSharing
```

with:

```swift
        }
    }

    /// Sign Out asks first only when it stops someone's updates (spec §6.7; plan 2c, the user's
    /// choice): a Crewlu Cloud partner who reads through Crewlu Cloud, or has an invite out.
    /// Someone still on iCloud keeps getting updates through the iCloud record, signed in or not.
    /// Before this launch has read the list, any Crewlu Cloud partner counts, as before.
    static func signingOutStopsUpdates(rows: [PartnerListRow], hasLoadedList: Bool, isCloudSharing: Bool) -> Bool {
        guard isCloudSharing else { return false }
        guard hasLoadedList else { return true }
        return rows.contains { $0.cloudID != nil && $0.kind != .stillOnICloud }
    }

    /// The hero says "Sharing Active" while there's a Crewlu Cloud partner or an iCloud share.
    static func isSharingActive(cloudPartners: Int, iCloudSharing: Bool) -> Bool {
        cloudPartners > 0 || iCloudSharing
```

- [x] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 158 tests, with 0 failures`.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerList.swift DutyTests/PartnerListTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): PartnerList shows someone who moved over as one row, still on iCloud until they have the app, and says when Sign Out asks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 11: The screens

**Files:**
- Modify: `Duty/Views/Settings/PartnerSharingView.swift`, `Duty/Views/Settings/PartnerDetailView.swift`, `Duty/Views/Settings/PartnerQuickStatusSheet.swift`, `Duty/Views/Account/CrewluCloudDetailView.swift`, `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`

The screens use Tasks 4, 9 and 10 (decisions 3, 6, 8, 9, 10 and 13). They look as approved in 2b: no new looks or words. Views are checked by Task 12's compile, the review and the user (Tasks 14 and 15).

- [x] **Step 1: Partner Sharing**

The rows linked by the notes; the partner page opened by either id; Remove from both for anyone in the iCloud share; runs on every appearance and when the participants change; late joiners' names; and settings read by either id.

14 replacements, in order, in `Duty/Views/Settings/PartnerSharingView.swift`:

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
//  Duty
//
//  Settings view for managing partner sharing (Crewluve app). Signed in to Crewlu
//  Cloud, it runs there (partner links, spec §6.2); otherwise it shows a sign-in
//  prompt above today's iCloud screen, minus inviting (§6.1).
//

import SwiftUI
```

with:

```swift
//  Duty
//
//  Settings view for managing partner sharing (Crewluve app). Signed in to Crewlu
//  Cloud, it runs there (partner links, spec §6.2), and moves iCloud partners over
//  (§7); otherwise it shows a sign-in prompt above today's iCloud screen, minus
//  inviting (§6.1).
//

import SwiftUI
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
            set: { if !$0 { cloudPartnerToRemove = nil } }
        ), presenting: cloudPartnerToRemove) { row in
            Button("Remove", role: .destructive) {
                Task { await removeCloudPartner(row.id) }
            }
        } message: { row in
            Text("Remove \(row.name)? They will no longer see your status.")
```

with:

```swift
            set: { if !$0 { cloudPartnerToRemove = nil } }
        ), presenting: cloudPartnerToRemove) { row in
            Button("Remove", role: .destructive) {
                Task { await remove(row) }
            }
        } message: { row in
            Text("Remove \(row.name)? They will no longer see your status.")
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
        }
        .onChange(of: beaconManager.partners.map(\.id).joined(separator: "|")) { _, _ in
            handlePartnerListChanged()
        }
        .onAppear { handleOnAppear() }
        .onChange(of: delayFlightCandidates) { _, newCandidates in
```

with:

```swift
        }
        .onChange(of: beaconManager.partners.map(\.id).joined(separator: "|")) { _, _ in
            handlePartnerListChanged()
            // New participants move over too (spec §7.2).
            PartnerMoveOverRunner.shared.requestRun()
        }
        .onAppear { handleOnAppear() }
        .onChange(of: delayFlightCandidates) { _, newCandidates in
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
    }

    private var cloudRows: [PartnerListRow] {
        let iCloudPeople = beaconManager.isSharing
            ? beaconManager.partners.filter { !$0.isPending }.map {
                PartnerList.ICloudPerson(id: $0.id, name: $0.displayName)
            }
            : []
        return PartnerList.rows(partners: store.partners, devices: store.devices,
                                iCloudPeople: iCloudPeople, pendingLabels: pendingInvites)
    }

    /// Everyone a quick status can go to: each row with a partner page.
```

with:

```swift
    }

    private var cloudRows: [PartnerListRow] {
        // The move-over's notes link people; they change with the list, or by key-value sync.
        _ = statusRefreshTick
        return PartnerList.rows(partners: store.partners, devices: store.devices,
                                iCloudPeople: beaconManager.listedPeople,
                                cloudPartnerByICloudID: PartnerMoveOverNotes.load().cloudPartnerByICloudID,
                                pendingLabels: pendingInvites)
    }

    /// Everyone a quick status can go to: each row with a partner page.
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
    private func cloudRow(_ row: PartnerListRow) -> some View {
        if row.kind.opensPartnerPage {
            NavigationLink {
                PartnerDetailView(person: row.kind == .stillOnICloud ? .iCloud(id: row.id) : .crewluCloud(id: row.id),
                                  everyone: everyone)
            } label: {
                cloudRowContent(row)
```

with:

```swift
    private func cloudRow(_ row: PartnerListRow) -> some View {
        if row.kind.opensPartnerPage {
            NavigationLink {
                PartnerDetailView(person: row.cloudID.map { .crewluCloud(id: $0) } ?? .iCloud(id: row.id),
                                  everyone: everyone)
            } label: {
                cloudRowContent(row)
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
    @ViewBuilder
    private func cloudRowSwipeActions(_ row: PartnerListRow) -> some View {
        switch row.kind {
        case .connected:
            Button(role: .destructive) {
                cloudPartnerToRemove = row
            } label: {
                Label("Remove", systemImage: "person.badge.minus")
            }
        case .stillOnICloud:
            Button(role: .destructive) {
                partnerToRemove = beaconManager.partners.first { $0.id == row.id }
            } label: {
                Label("Remove", systemImage: "person.badge.minus")
            }
```

with:

```swift
    @ViewBuilder
    private func cloudRowSwipeActions(_ row: PartnerListRow) -> some View {
        switch row.kind {
        case .connected, .stillOnICloud:
            Button(role: .destructive) {
                cloudPartnerToRemove = row
            } label: {
                Label("Remove", systemImage: "person.badge.minus")
            }
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
                Label("Re-share", systemImage: "square.and.arrow.up")
            }
            .tint(.blue)
        }
    }
```

with:

```swift
                Label("Re-share", systemImage: "square.and.arrow.up")
            }
            .tint(.blue)
        }
    }

    /// Spec §7.5: someone in the iCloud share leaves it first, and if that fails nothing else
    /// changes; their iCloud id goes on the move-over's removed list. Then their Crewlu Cloud
    /// partner goes, if they have one.
    private func remove(_ row: PartnerListRow) async {
        // A move-over run that's out would make them again.
        await PartnerMoveOverRunner.shared.waitUntilIdle()
        if let iCloudID = row.iCloudID {
            do {
                try await beaconManager.removePartner(id: iCloudID)
            } catch {
                errorAlertMessage = "Failed to remove partner: \(error.localizedDescription)"
                showingErrorAlert = true
                return
            }
        }
        if let cloudID = row.cloudID {
            await removeCloudPartner(cloudID)
        } else if beaconManager.isSharing {
            // Writes the iCloud record without them.
            await updateStatusNow()
        }
    }
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
    /// changes, so the pilot can try again. Below the sign-in prompt only the iCloud share ends:
    /// Crewlu Cloud partners this device can't see keep their settings.
    private func stopSharingWithEveryone() async {
        guard screen == .crewluCloud else {
            await beaconManager.endICloudShare()
            statusRefreshTick = UUID()
```

with:

```swift
    /// changes, so the pilot can try again. Below the sign-in prompt only the iCloud share ends:
    /// Crewlu Cloud partners this device can't see keep their settings.
    private func stopSharingWithEveryone() async {
        // A move-over run that's out would make partners again.
        await PartnerMoveOverRunner.shared.waitUntilIdle()
        guard screen == .crewluCloud else {
            await beaconManager.endICloudShare()
            statusRefreshTick = UUID()
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
        store.accountChanged()
        guard !hasAppeared else {
            Task { await refreshPartnerLists() }
            return
        }
        hasAppeared = true
```

with:

```swift
        store.accountChanged()
        guard !hasAppeared else {
            Task { await refreshPartnerLists() }
            // Back from signing in, too: iCloud partners move over (spec §7.2).
            PartnerMoveOverRunner.shared.requestRun()
            return
        }
        hasAppeared = true
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
        Task {
            await beaconManager.awaitInitialization()
            await updateStatusNow()

            // Re-snapshot now that the share manager has finished loading. From here on,
            // newly-appearing participants are treated as fresh acceptances and may
```

with:

```swift
        Task {
            await beaconManager.awaitInitialization()
            await updateStatusNow()
            // Opening the screen moves iCloud partners over too (spec §7.2).
            PartnerMoveOverRunner.shared.requestRun()

            // Re-snapshot now that the share manager has finished loading. From here on,
            // newly-appearing participants are treated as fresh acceptances and may
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
            if invites.count == 1 {
                let invite = invites[0]
                beaconManager.setPartnerNickname(invite.name, forID: participantID)
                // The pending-invite name is the user's fresh label for this person.
                // Wipe any stale Display Name they previously assigned to the same
                // iCloud user (e.g., "Magic man" from before a stop/restart) so the
```

with:

```swift
            if invites.count == 1 {
                let invite = invites[0]
                beaconManager.setPartnerNickname(invite.name, forID: participantID)
                // Their Crewlu Cloud partner takes the name too (spec §7.6).
                await PartnerMoveOverRunner.shared.lateJoinerNamed(participantID, invite.name)
                // The pending-invite name is the user's fresh label for this person.
                // Wipe any stale Display Name they previously assigned to the same
                // iCloud user (e.g., "Magic man" from before a stop/restart) so the
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
        if let inviteID = chosenInviteID,
           let invite = await PendingPartnerInvites.load().first(where: { $0.id == inviteID }) {
            beaconManager.setPartnerNickname(invite.name, forID: participantID)
            // Same fresh-label logic as the single-pending auto-bind path.
            beaconManager.clearDisplayName(forID: participantID)
            await PendingPartnerInvites.remove(id: invite.id)
```

with:

```swift
        if let inviteID = chosenInviteID,
           let invite = await PendingPartnerInvites.load().first(where: { $0.id == inviteID }) {
            beaconManager.setPartnerNickname(invite.name, forID: participantID)
            await PartnerMoveOverRunner.shared.lateJoinerNamed(participantID, invite.name)
            // Same fresh-label logic as the single-pending auto-bind path.
            beaconManager.clearDisplayName(forID: participantID)
            await PendingPartnerInvites.remove(id: invite.id)
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
        await processNextUnboundParticipant()
    }

    private func displayNameForPartner(_ id: String) -> String {
        _ = statusRefreshTick
        if let data = UserDefaults.standard.data(forKey: "crewluve.displayNameByPartner"),
           let dict = try? JSONDecoder().decode([String: String].self, from: data),
           let name = dict[id], !name.isEmpty {
            return name
        }
        return activePilot?.firstName ?? ""
    }

    private var isDelayReady: Bool {
```

with:

```swift
        await processNextUnboundParticipant()
    }

    /// Read by either of their ids once the move-over linked them (spec §6.6).
    private func displayNameForPartner(_ id: String) -> String {
        _ = statusRefreshTick
        return PartnerSettings.displayName(for: id, in: PartnerSettings.load(), notes: .load())
            ?? activePilot?.firstName ?? ""
    }

    private var isDelayReady: Bool {
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
        return "\(m)m"
    }

    private func activeStatusForPartner(_ id: String) -> PartnerQuickStatusEntry? {
        // statusRefreshTick forces SwiftUI to re-evaluate when the sheet dismisses
        _ = statusRefreshTick
        guard let data = UserDefaults.standard.data(forKey: "crewluve.quickStatusByPartner"),
              let dict = try? JSONDecoder().decode([String: PartnerQuickStatusEntry].self, from: data),
              let entry = dict[id] else { return nil }
        if let expiry = entry.expiry, expiry < Date() { return nil }
        return entry
    }
```

with:

```swift
        return "\(m)m"
    }

    /// Read by either of their ids once the move-over linked them (spec §6.6).
    private func activeStatusForPartner(_ id: String) -> PartnerQuickStatusEntry? {
        // statusRefreshTick forces SwiftUI to re-evaluate when the sheet dismisses
        _ = statusRefreshTick
        guard let entry = PartnerSettings.quickStatus(for: id, in: PartnerSettings.load(), notes: .load()) else {
            return nil
        }
        if let expiry = entry.expiry, expiry < Date() { return nil }
        return entry
    }
```

- [x] **Step 2: The partner page**

It finds its row the way the list does, by the id it was opened with, so it stays open when the move-over links someone; the iCloud device row and no link buttons until they move over; and Remove from both.

5 replacements, in order, in `Duty/Views/Settings/PartnerDetailView.swift`:

In `Duty/Views/Settings/PartnerDetailView.swift`, replace:

```swift
//  The partner page (partner links, spec §6.3): who they are, the devices they
//  see your status on, their invite link, their nickname and quick status, and
//  removing them. Someone still connected through iCloud gets the same page,
//  with an iCloud row for their devices.
//

import SwiftUI
```

with:

```swift
//  The partner page (partner links, spec §6.3): who they are, the devices they
//  see your status on, their invite link, their nickname and quick status, and
//  removing them. Someone still connected through iCloud gets the same page,
//  with an iCloud row for their devices, before and after the move-over links
//  them to their Crewlu Cloud partner (§7).
//

import SwiftUI
```

In `Duty/Views/Settings/PartnerDetailView.swift`, replace:

```swift
    @State private var settingsTick = UUID()
    @State private var hasLeft = false

    private var id: String {
        switch person {
        case .crewluCloud(let id), .iCloud(let id): return id
        }
    }

    private var cloudPartner: PartnerCloudPartner? {
        guard case .crewluCloud = person else { return nil }
        return store.partners.first { $0.id == id }
    }

    private var iCloudPartner: PartnerInfo? {
        guard case .iCloud = person else { return nil }
        return beaconManager.partners.first { $0.id == id }
    }

    private var name: String { cloudPartner?.name ?? iCloudPartner?.displayName ?? "" }

    private var devices: [PartnerCloudDevice] { store.devices.filter { $0.partnerID == id } }

    /// Not opened yet: a Crewlu Cloud partner with no device.
    private var isWaitingForThem: Bool { cloudPartner != nil && devices.isEmpty }

    /// Removed, here or on another device, or signed out: the page goes back to the list.
    private var isGone: Bool { cloudPartner == nil && iCloudPartner == nil }

    /// "Sees you as …": the name this partner sees the pilot as, or the pilot's first name.
    private var seesYouAs: String {
        _ = settingsTick
        let saved = PartnerSettings.load().displayNameByPartner[id] ?? ""
        return saved.isEmpty ? pilots.first?.firstName ?? "" : saved
    }

    var body: some View {
```

with:

```swift
    @State private var settingsTick = UUID()
    @State private var hasLeft = false

    /// Their row in the list, by the id the page was opened with, so the page stays put when the
    /// move-over links someone from iCloud to their Crewlu Cloud partner.
    private var row: PartnerListRow? {
        _ = settingsTick
        let rows = PartnerList.rows(partners: store.partners, devices: store.devices,
                                    iCloudPeople: beaconManager.listedPeople,
                                    cloudPartnerByICloudID: PartnerMoveOverNotes.load().cloudPartnerByICloudID,
                                    pendingLabels: [])
        switch person {
        case .crewluCloud(let id): return rows.first { $0.cloudID == id }
        case .iCloud(let id): return rows.first { $0.iCloudID == id }
        }
    }

    /// Where their settings are kept: their Crewlu Cloud id once they have one.
    private var id: String {
        switch person {
        case .crewluCloud(let id), .iCloud(let id): return row?.id ?? id
        }
    }

    private var cloudPartner: PartnerCloudPartner? {
        guard let cloudID = row?.cloudID else { return nil }
        return store.partners.first { $0.id == cloudID }
    }

    private var name: String { row?.name ?? "" }

    private var devices: [PartnerCloudDevice] {
        guard let cloudID = row?.cloudID else { return [] }
        return store.devices.filter { $0.partnerID == cloudID }
    }

    /// Still reading through iCloud, on an older Crewluve: linked or not yet (P2-2).
    private var isOnICloud: Bool { row?.kind == .stillOnICloud }

    /// Not opened yet: a Crewlu Cloud partner with no device.
    private var isWaitingForThem: Bool {
        if case .notOpenedYet = row?.kind { return true }
        return false
    }

    /// Removed, here or on another device, or signed out: the page goes back to the list.
    private var isGone: Bool { row == nil }

    /// "Sees you as …": the name this partner sees the pilot as, or the pilot's first name.
    private var seesYouAs: String {
        _ = settingsTick
        return PartnerSettings.displayName(for: id, in: PartnerSettings.load(), notes: .load())
            ?? pilots.first?.firstName ?? ""
    }

    var body: some View {
```

In `Duty/Views/Settings/PartnerDetailView.swift`, replace:

```swift

    @ViewBuilder
    private var devicesSection: some View {
        if iCloudPartner != nil {
            Section {
                deviceRow(icon: "icloud", title: "iCloud · older Crewluve", detail: "Still connected")
            } header: {
```

with:

```swift

    @ViewBuilder
    private var devicesSection: some View {
        if isOnICloud {
            Section {
                deviceRow(icon: "icloud", title: "iCloud · older Crewluve", detail: "Still connected")
            } header: {
```

In `Duty/Views/Settings/PartnerDetailView.swift`, replace:

```swift

    private var actionsSection: some View {
        Section {
            if let partner = cloudPartner {
                Button {
                    shareItem = PartnerShareItem(link: PartnerCloudInvite.link(forToken: partner.inviteToken))
                } label: {
```

with:

```swift

    private var actionsSection: some View {
        Section {
            // They move over by themselves: no link to send meanwhile.
            if let partner = cloudPartner, !isOnICloud {
                Button {
                    shareItem = PartnerShareItem(link: PartnerCloudInvite.link(forToken: partner.inviteToken))
                } label: {
```

In `Duty/Views/Settings/PartnerDetailView.swift`, replace:

```swift
        }
    }

    /// Spec §6.3 and §7.5: a Crewlu Cloud partner goes with their devices and settings; someone
    /// on iCloud leaves the iCloud share, as today.
    private func remove() {
        switch person {
        case .crewluCloud(let id):
            run {
                try await store.remove(id)
                leave()
            }
        case .iCloud(let id):
            isWorking = true
            Task {
                defer { isWorking = false }
                do {
                    try await beaconManager.removePartner(id: id)
                    // Clears their display name from the iCloud record, as the list does.
                    if beaconManager.isSharing, let pilot = pilots.first {
                        await PartnerBeaconAutoSync.shared.forceUpdate(modelContext: modelContext, pilotInfo: pilot)
                    }
                    leave()
                } catch {
                    errorMessage = "Failed to remove partner: \(error.localizedDescription)"
                }
            }
        }
    }
```

with:

```swift
        }
    }

    /// Spec §6.3 and §7.5: someone in the iCloud share leaves it first, as today, and if that fails
    /// nothing else changes. Then their Crewlu Cloud partner goes, with their devices and settings.
    private func remove() {
        guard let row else { return leave() }
        isWorking = true
        Task {
            defer { isWorking = false }
            // A move-over run that's out would make them again.
            await PartnerMoveOverRunner.shared.waitUntilIdle()
            if let iCloudID = row.iCloudID {
                do {
                    try await beaconManager.removePartner(id: iCloudID)
                } catch {
                    errorMessage = "Failed to remove partner: \(error.localizedDescription)"
                    return
                }
            }
            if let cloudID = row.cloudID {
                do {
                    try await store.remove(cloudID)
                } catch {
                    // PT404: another device removed them first; the list has caught up.
                    if let message = (error as? PartnerCloudError ?? .unavailable).actionMessage {
                        errorMessage = message
                        return
                    }
                }
            } else if beaconManager.isSharing, let pilot = pilots.first {
                // Clears their display name from the iCloud record, as the list does.
                await PartnerBeaconAutoSync.shared.forceUpdate(modelContext: modelContext, pilotInfo: pilot)
            }
            leave()
        }
    }
```

- [x] **Step 3: The quick status sheet**

Its reads and writes go through `PartnerSettings`, so a linked person's settings follow their Crewlu Cloud id whichever id the sheet was opened with. The Sleeping flag now says whether anyone is told Sleeping, as everything else that saves the settings does.

5 replacements, in order, in `Duty/Views/Settings/PartnerQuickStatusSheet.swift`:

In `Duty/Views/Settings/PartnerQuickStatusSheet.swift`, replace:

```swift
//  Per-partner quick status picker sheet. On Crewlu Cloud (partner links, spec
//  §6.5), the caller passes the people to send to, and the nickname renames the
//  partner on Crewlu Cloud; without them it works with the iCloud share's partners.
//

import SwiftUI
```

with:

```swift
//  Per-partner quick status picker sheet. On Crewlu Cloud (partner links, spec
//  §6.5), the caller passes the people to send to, and the nickname renames the
//  partner on Crewlu Cloud; without them it works with the iCloud share's partners.
//  Settings go through PartnerSettings, so someone who moved over from iCloud keeps
//  theirs under their Crewlu Cloud id, whichever id the sheet was opened with (§6.6).
//

import SwiftUI
```

In `Duty/Views/Settings/PartnerQuickStatusSheet.swift`, replace:

```swift
    // MARK: - Active Status for This Partner

    private var activeEntryForPartner: PartnerQuickStatusEntry? {
        guard let data = UserDefaults.standard.data(forKey: "crewluve.quickStatusByPartner"),
              let dict = try? JSONDecoder().decode([String: PartnerQuickStatusEntry].self, from: data),
              let entry = dict[preselectedPartnerID] else { return nil }
        if let expiry = entry.expiry, expiry < Date() { return nil }
        return entry
    }
```

with:

```swift
    // MARK: - Active Status for This Partner

    private var activeEntryForPartner: PartnerQuickStatusEntry? {
        guard let entry = PartnerSettings.quickStatus(for: preselectedPartnerID, in: PartnerSettings.load(),
                                                      notes: .load()) else { return nil }
        if let expiry = entry.expiry, expiry < Date() { return nil }
        return entry
    }
```

In `Duty/Views/Settings/PartnerQuickStatusSheet.swift`, replace:

```swift
            }

            // Load existing per-partner display name
            if let data = UserDefaults.standard.data(forKey: "crewluve.displayNameByPartner"),
               let dict = try? JSONDecoder().decode([String: String].self, from: data) {
                displayName = dict[preselectedPartnerID] ?? ""
            }
            initialDisplayName = displayName

            // Load existing partner nickname: a Crewlu Cloud partner's is their name there
```

with:

```swift
            }

            // Load existing per-partner display name
            displayName = PartnerSettings.displayName(for: preselectedPartnerID, in: PartnerSettings.load(),
                                                      notes: .load()) ?? ""
            initialDisplayName = displayName

            // Load existing partner nickname: a Crewlu Cloud partner's is their name there
```

In `Duty/Views/Settings/PartnerQuickStatusSheet.swift`, replace:

```swift

            let entry = PartnerQuickStatusEntry(status: status, icon: icon, expiry: expiry)

            // Read current dict
            var dict: [String: PartnerQuickStatusEntry] = {
                guard let data = UserDefaults.standard.data(forKey: "crewluve.quickStatusByPartner") else { return [:] }
                return (try? JSONDecoder().decode([String: PartnerQuickStatusEntry].self, from: data)) ?? [:]
            }()

            // Set entry for each selected partner
            let allSelected = selectedPartnerIDs.count == sendToPeople.count && sendToPeople.count > 1
            if allSelected {
                dict["__everyone__"] = entry
                for id in selectedPartnerIDs {
                    dict[id] = entry
                }
            } else {
                for id in selectedPartnerIDs {
                    dict[id] = entry
                }
            }

            // Write back
            do {
                let encoded = try JSONEncoder().encode(dict)
                UserDefaults.standard.set(encoded, forKey: "crewluve.quickStatusByPartner")
            } catch {
                isUpdating = false
                syncErrorMessage = "Failed to save status: \(error.localizedDescription)"
                return
            }

            // Backward compat: sleeping toggle
            UserDefaults.standard.set(status == "Sleeping", forKey: "partnerBeacon.isSleeping")
        }

        // Save partner nickname (empty string clears it)
```

with:

```swift

            let entry = PartnerQuickStatusEntry(status: status, icon: icon, expiry: expiry)

            // Set entry for each selected partner, and for everyone when every partner is picked;
            // the Sleeping flag beside them follows
            let allSelected = selectedPartnerIDs.count == sendToPeople.count && sendToPeople.count > 1
            PartnerSettings.setQuickStatus(entry, for: Array(selectedPartnerIDs), everyone: allSelected)
        }

        // Save partner nickname (empty string clears it)
```

In `Duty/Views/Settings/PartnerQuickStatusSheet.swift`, replace:

```swift
            beaconManager.setPartnerNickname(trimmedNick, forID: preselectedPartnerID)
        }

        // Save per-partner display name
        var nameDict: [String: String] = {
            guard let data = UserDefaults.standard.data(forKey: "crewluve.displayNameByPartner") else { return [:] }
            return (try? JSONDecoder().decode([String: String].self, from: data)) ?? [:]
        }()
        let trimmedName = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedName.isEmpty {
            nameDict.removeValue(forKey: preselectedPartnerID)
        } else {
            nameDict[preselectedPartnerID] = trimmedName
        }
        if nameDict.isEmpty {
            UserDefaults.standard.removeObject(forKey: "crewluve.displayNameByPartner")
        } else if let encoded = try? JSONEncoder().encode(nameDict) {
            UserDefaults.standard.set(encoded, forKey: "crewluve.displayNameByPartner")
        }

        // Clear stale error
        beaconManager.errorMessage = nil
```

with:

```swift
            beaconManager.setPartnerNickname(trimmedNick, forID: preselectedPartnerID)
        }

        // Save per-partner display name (empty removes it)
        PartnerSettings.setDisplayName(displayName, for: preselectedPartnerID)

        // Clear stale error
        beaconManager.errorMessage = nil
```

- [x] **Step 4: Sign Out asks only when it stops someone's updates**

2 replacements, in order, in `Duty/Views/Account/CrewluCloudDetailView.swift`:

In `Duty/Views/Account/CrewluCloudDetailView.swift`, replace:

```swift
            accountWasDeleted: AccountMigration.wasAccountDeleted())
    }

    var body: some View {
        Form {
            statusSection
```

with:

```swift
            accountWasDeleted: AccountMigration.wasAccountDeleted())
    }

    /// Signing out stops someone's updates (partner links, spec §6.7): someone reads through Crewlu
    /// Cloud, or has an invite out. Someone still on iCloud keeps getting them, signed in or not.
    private var signingOutStopsUpdates: Bool {
        let store = PartnerCloudStore.shared
        // A pilot who never shared through iCloud doesn't start the iCloud manager.
        let iCloudPeople = UserDefaults.standard.bool(forKey: "partnerBeacon.isSharing")
            ? PilotStatusBeaconManager.shared.listedPeople : []
        let rows = PartnerList.rows(partners: store.partners, devices: store.devices, iCloudPeople: iCloudPeople,
                                    cloudPartnerByICloudID: PartnerMoveOverNotes.load().cloudPartnerByICloudID,
                                    pendingLabels: [])
        return PartnerList.signingOutStopsUpdates(rows: rows, hasLoadedList: store.hasLoadedList,
                                                  isCloudSharing: store.isCloudSharing)
    }

    var body: some View {
        Form {
            statusSection
```

In `Duty/Views/Account/CrewluCloudDetailView.swift`, replace:

```swift

                Section {
                    Button(role: .destructive) {
                        // Partner links (spec §6.7): ask first when Crewlu Cloud partners get updates from here.
                        if PartnerCloudStore.shared.isCloudSharing {
                            showingSignOutConfirmation = true
                        } else {
                            run { try await account.signOut() }
```

with:

```swift

                Section {
                    Button(role: .destructive) {
                        // Partner links (spec §6.7): ask first when signing out stops someone's updates.
                        if signingOutStopsUpdates {
                            showingSignOutConfirmation = true
                        } else {
                            run { try await account.signOut() }
```

- [x] **Step 5: The share's people, as the list shows them**

Both screens' rows take the accepted participants from here.

One replacement in `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`:

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
        }
    }

    /// The tickets the record carries, as this device last wrote or read it.
    var recordMoveTickets: [String: String] {
        guard let data = statusRecord?[Self.moveTicketsKey] as? Data else { return [:] }
```

with:

```swift
        }
    }

    /// The share's accepted participants, as Partner Sharing's list shows them (spec §6.2).
    var listedPeople: [PartnerList.ICloudPerson] {
        guard isSharing else { return [] }
        return partners.filter { !$0.isPending }.map { PartnerList.ICloudPerson(id: $0.id, name: $0.displayName) }
    }

    /// The tickets the record carries, as this device last wrote or read it.
    var recordMoveTickets: [String: String] {
        guard let data = statusRecord?[Self.moveTicketsKey] as? Data else { return [:] }
```

- [x] **Step 6: Run the harness: nothing it tests changes**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 158 tests, with 0 failures`.

- [x] **Step 7: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Views/Settings/PartnerSharingView.swift Duty/Views/Settings/PartnerDetailView.swift Duty/Views/Settings/PartnerQuickStatusSheet.swift Duty/Views/Account/CrewluCloudDetailView.swift Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): Partner Sharing moves iCloud partners over: one row each, removing someone from both, late joiners renamed, settings by either id; Sign Out asks only when it stops updates" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 12: Compile everything, without a simulator

**Files:** none. A build in a separate clone of the branch, with its own build folder and its own copy of the Swift packages, so it can't disturb the user's open Xcode or touch a simulator. It compiles the app and `DutyTests`, including the views and the iCloud code the harness can't build.

- [x] **Step 1: Make the clone**

Use a scratch folder outside both repos as `$BUILD`, for example `export BUILD=<your scratchpad>/partner-moveover-build`. `Config.xcconfig` is ignored by git, so it's copied; never print it.

Run:

```bash
rm -rf "${BUILD:?set BUILD first}" && mkdir -p "$BUILD" && git clone -q --shared ~/Dev/Duty "$BUILD/duty" && git -C "$BUILD/duty" switch -q feature/partner-cloud-screens && cp ~/Dev/Duty/Config.xcconfig "$BUILD/duty/" && cp -R "$(ls -dt ~/Library/Developer/Xcode/DerivedData/Duty-*/SourcePackages | head -1)" "$BUILD/packages" && git -C "$BUILD/duty" log --oneline -1
```

Expected: the branch's last commit: Task 11's `feat(partners): Partner Sharing moves iCloud partners over…`, or a later fix from Task 13.

- [x] **Step 2: Build for testing**

It takes several minutes, so run it in the background and wait for it to finish.

Run:

```bash
cd "$BUILD/duty" && xcodebuild build-for-testing -project Duty.xcodeproj -scheme Duty -destination "generic/platform=iOS Simulator" -derivedDataPath "$BUILD/derived" -clonedSourcePackagesDirPath "$BUILD/packages" -disableAutomaticPackageResolution -quiet > "$BUILD/build.log" 2>&1; echo "exit $?"; echo "errors: $(grep -c error: "$BUILD/build.log")"
```

Expected: `exit 0` and `errors: 0`. `grep warning "$BUILD/build.log"` shows only the existing StoreKit deprecation warning. Nothing to commit.

If the log says the packages don't match `Package.resolved`, delete `$BUILD/packages` and run the build again without `-clonedSourcePackagesDirPath` and `-disableAutomaticPackageResolution`. It then downloads them into `$BUILD/derived`, which takes a few minutes more.

### Task 13: Review

**Files:** whatever the review finds.

- [x] **Step 1: Ask for a review**

Use superpowers:requesting-code-review with a read-only reviewer: it reads `git -C ~/Dev/Duty diff 8f162e61..feature/partner-cloud-screens`, this plan, and the spec (§6.2, §6.6, §6.7, §7, §8.1, §13), and runs no `xcodebuild` and no simulator. State facts neutrally, and don't tell it what not to flag.

- [x] **Step 2: Act on it**

For each finding, fix it test-first where the harness can test it, re-run `"$HARNESS/run.sh"`, and commit. If any Swift changed, run Task 12 again. Note each fix in this plan's Execution notes.

### Task 14: The user runs CrewLu's tests

**Files:** none.

- [x] **Step 1: Ask the user to run the tests in Xcode**

Send them these steps:

1. In Xcode, at the top of the window, check that the scheme says **Duty** and the destination is an iPhone **simulator** (such as iPhone 17 Pro), not your phone. On a phone, tests that read files on the Mac can't: the examples test and `CaptureOCRFixturesTests` skip, and `MatrixAuditTests` fails.
2. Press **⌘U** (Product → Test) and wait for it to finish.
3. Press **⌘6** to open the Test navigator. Red marks show failures.

Expected: no failures, and 1,545 XCTest tests (2b's run had 1,488). The partner classes, counted before Task 13's fixes:

| Class | Tests |
|---|---|
| `PartnerCloudErrorTests` | 5 |
| `PartnerSettingsTests` | 21 (twelve new) |
| `PartnerSummaryEncoderTests` | 17 |
| `PartnerCloudStoreTests` | 33 (six new) |
| `PartnerSummaryCloudWriterTests` | 25 |
| `PartnerListTests` | 15 (six new) |
| `PartnerSharingScreenTests` | 6 |
| `PartnerInviteLinkTests` | 8 |
| `PartnerBeaconModeIndependenceTests` | 4 |
| `PartnerMoveOverNotesTests` | 7 (new) |
| `PartnerMoveOverTests` | 10 (new) |
| `PartnerMoveOverRunnerTests` | 16 (new) |

- [x] **Step 2: If anything fails, stop**

Ask for the test's name and its message. Fix the cause, never the test's expected value, then ask for another run.

### Task 15: The user's look, on their phone

**Files:** none.

- [x] **Step 1: Offer the look, and say what it does**

Ask the user one question: do they want to see the move-over on their phone now? It's their choice, and it's for real:
- The simulator can't show it: it can't reach iCloud. Their phone runs Xcode builds and sees their real iCloud share.
- Signed in, the build makes Crewlu Cloud partners for their iCloud partners (named as in their list), asks for their tickets, and writes the tickets into the iCloud record. Their partners' Crewluve ignores the tickets until piece 4. This is what the release will do, but the app can't undo it without also removing those people from the iCloud share.
- Key-value sync carries the notes to their other devices, and the record gets this build's number, as in 2b's look.

- [x] **Step 2: If yes, send the steps**

1. Connect your iPhone. In Xcode, at the top of the window, check the scheme says **Duty**, and pick your iPhone as the destination.
2. Press **⌘R** (Product → Run). CrewLu opens on your phone.
3. Open **Partner Sharing** (on the schedule, the gear at the bottom right, then **Partner Sharing**). Signed in, each iCloud partner is one row, still "Needs Crewluve update" and "Connected through iCloud".
4. Tap one of them: their page is as in 2b: "iCloud · older Crewluve", "Still connected", the footer about moving over, and no **Send Link Again** or **New Link**.
5. Optional: on the Crewlu Cloud screen, tap **Sign Out**. It signs out straight away, without asking, because your partners still read through iCloud. Sign back in yourself.

Note anything that looks wrong with a screenshot (press the side button and volume up together).

### Task 16: Record the decisions

**Files (in `~/Dev/Crewluve Website`):**
- Modify: `docs/superpowers/specs/2026-10-16-partner-links-piece2-crewlu-design.md`, and this plan

- [x] **Step 1: Add the planning decisions to the spec**

At the end of the spec, after §13, add `## 14. Decisions made while planning 2c`, followed by this plan's "Decisions made while planning" list, copied as it stands, and any changes from the review (Task 13), and where the build differs from §6.7 and §7. Then update its status line.

In `~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-16-partner-links-piece2-crewlu-design.md`, replace:

```markdown
Plans 2a and 2b are built (`docs/superpowers/plans/2026-10-16-partner-links-piece2a-summary.md`, `docs/superpowers/plans/2026-10-17-partner-links-piece2b-screens.md`); next: plan 2c.
```

with:

```markdown
Plans 2a, 2b and 2c are built (`docs/superpowers/plans/2026-10-16-partner-links-piece2a-summary.md`, `docs/superpowers/plans/2026-10-17-partner-links-piece2b-screens.md`, `docs/superpowers/plans/2026-10-17-partner-links-piece2c-move-over.md`).
```

- [x] **Step 2: Tick this plan and commit**

Run:

```bash
cd ~/"Dev/Crewluve Website" && git add docs/superpowers/specs/2026-10-16-partner-links-piece2-crewlu-design.md docs/superpowers/plans/2026-10-17-partner-links-piece2c-move-over.md && git commit -q -m "Plan 2c built: the move-over; spec records the planning decisions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit. Don't push.

### Task 17: Finish

**Files:** none.

- [ ] **Step 1: Ask how to merge**

2b and 2c are meant to merge together (Task 0). Ask the user one question: merge `feature/partner-cloud-screens` into `feature/supabase-account-backend` now, or keep it apart a while longer. To merge without changing any file on disk while Xcode is open: `git -C ~/Dev/Duty fetch . feature/partner-cloud-screens:feature/supabase-account-backend`, a fast-forward that works only while `feature/supabase-account-backend` is still `4ff32814`. Then switch to it (`git -C ~/Dev/Duty switch feature/supabase-account-backend`: the same commit, so no files change) and delete the 2c branch with `git -C ~/Dev/Duty branch -d feature/partner-cloud-screens`.

- [ ] **Step 2: Push only with a fresh yes**

Ask separately before each push: `feature/supabase-account-backend` (or the branch, if kept apart) in `~/Dev/Duty`, and `main` in `~/Dev/Crewluve Website`. The release still waits for Crewluve piece 4 (P2-1), and spec §8.3's checks on real phones need it on TestFlight.

---

## Execution notes

Filled in during the build: any place the code ends up different from the printed blocks, and why.

- **Tasks 0–11 (2026-10-17).** A script applied the plan's own steps to `~/Dev/Duty`. Every Run step gave the printed result, including each test-first failure, and the 23 files matched the scratch copy byte for byte. Commits `4ac90d1b`…`01cf1559`; the harness ran 158 tests with 0 failures.
- **Task 12** passed on `01cf1559`: 0 errors, only the StoreKit warning.
- **Another session's merge (2026-10-17, 4:12 PM).** While this branch was checked out in `~/Dev/Duty`, another session merged `fix/detach-dead-trip-children` into it (`cbbe3aa8`: sync fixes for dead trip rows, 12 files, none of them partner files; its only shared file, `DutyApp.swift`, merged cleanly). **The user chose to keep it:** it merges with 2b and 2c. It brings 19 tests of its own to Task 14's run. At 4:52 PM a build bump also landed here (`6760e08d`, "release: bump build to 199 (3.0.2)", `project.pbxproj` only). **The user chose** to hold any release from this branch, and the sessions involved were told.
- **Task 13, the review (2026-10-17).** The verdict was "with fixes": one Critical, two Important and eleven Minor findings.
  - **C1, a release step, with no code:** CloudKit's Production schema doesn't learn new fields from saves. Before any TestFlight or App Store build, `moveTicketByPartnerJSON` (Bytes, on `SharedPilotStatus`, container `iCloud.com.toddanderson.duty`) must be deployed to Production in the CloudKit Console (Deploy Schema Changes; `Duty/Documentation/CLOUDKIT_DEPLOYMENT_GUIDE.md`). Without it, every iCloud write from this version fails, and partners on an older Crewluve stop getting updates. Xcode builds use the Development environment (no `icloud-container-environment` entitlement, Run uses Debug), which adds the field by itself on the first write.
  - **I1, `51841254`:** removing a moved-over person below the sign-in prompt, or when Crewlu Cloud couldn't be reached, didn't reach Crewlu Cloud, so after signing back in they got updates again. Now a synced list (`crewluve.cloudPartnersToRemove`), kept apart from the notes so that ending the iCloud share doesn't forget it, holds Crewlu Cloud partners to remove:
    - `noteRemoved` adds a linked person's partner;
    - Stop Sharing with Everyone below the prompt adds everyone linked;
    - `store.remove` and Stop Sharing on Crewlu Cloud clear what they removed;
    - each run does the waiting removals first, with or without an iCloud share. One not in this account's list waits, a refusal drops it, and being offline stops the run.
  - **I2, accepted (the user's choice):** every participant of the public iCloud share can read every ticket in the record, so one could redeem someone else's: they'd get a device on that person's partner, and that person would look moved over. They already see the status through iCloud. The partner page lists each device, so a stray one can be removed, and the move-over then hands that person a fresh ticket.
  - **`1ed3e4b5`, the runner:**
    - M5 and M11: `holdingRuns(_:)` defers runs while a removal or Stop Sharing goes on; `remove(cloudID:iCloudID:)` is spec §7.5's order in one tested place;
    - M1: a sign-out or account switch mid-run decides nothing;
    - M8: PT409 stops a run's creates;
    - tests of the reviewer's cases: a refused ticket, a share nobody accepted (M2), and someone removed who has the app.
  - **`73a81da6`, the screens:**
    - M6: the partner page opens by value, so linking someone doesn't close it;
    - M7: the page stays until its removal is done;
    - M4: a late joiner's rename runs in a `Task`;
    - M10: the dead `PartnerSharingView.clearStatusForPartner(_:)` is deleted;
    - both screens remove through the runner, and Stop Sharing with Everyone holds runs.
  - **`54a815d0`:** two tests tightened. The first run of the fixes' 19 deliberate breaks missed three.
  - **The re-check (same reviewer) found R1, fixed in `19d6e633`:** removing the last iCloud partner ended the share, which forgets the links, before `noteRemoved` ran, so their Crewlu Cloud removal was never queued. Now `noteRemoved` runs straight after the save. Also R2: Stop Sharing below the prompt skips people removed earlier, whose partners were dealt with then. And R4: the comments say a removal that can't reach Crewlu Cloud is retried only for someone the move-over linked.
  - **Declined:**
    - **M3**, the record's tickets checked against this device's last write: the device that wrote without them rewrites on its own next run, and an exact check costs one more iCloud read per run.
    - **M9**, list waiters shared across accounts: one woken early finds the list unloaded and decides nothing.
    - **R3**, a waiting removal can be lost when two devices sync the whole key (last writer wins): the same limit applies to every partner setting synced today.
    - **The optional items:** Remove showing no progress while a run finishes, and today's invite matching able to push a wrong label to Crewlu Cloud.
  - **Results:** the harness runs 173 tests with 0 failures; all 19 of the fixes' deliberate breaks are caught; Task 12 passed again on `73a81da6` and on `19d6e633`, with 0 errors and only the StoreKit warning.
  - **The re-check's confirmation (2026-10-17):** R1 and R2 fixed, nothing else changed behaviour. The verdict was ready to merge, once the spec records C1 as a release step, the I2 acceptance and R3 (Task 16).
- **Task 14, the user's run (2026-10-17).** ⌘U on the iPhone simulator, on `19d6e633`: 1,579 XCTest tests ran with 0 failures, and all 9 Swift Testing tests passed. That's the table's 1,545, plus Task 13's 15 (one more in `PartnerCloudStoreTests`, two in `PartnerMoveOverNotesTests`, two in `PartnerMoveOverTests` and ten in `PartnerMoveOverRunnerTests`), plus the merged sync fix's 19 (`DeadChildDetacherTests`' 9, and 8, 1 and 1 more in `TripDocumentTests`, `LocalPurgeServiceTests` and `SupabaseSyncEngineTests`). Every class ran the count expected. 3 tests skipped, where 2a's and 2b's runs skipped 1: the simulator is now signed in to Crewlu Cloud, so `StoreKitEntitlementLifecycleTests`, which this branch doesn't touch, skips all three of its tests in `setUpWithError`, its guard against writing to a live profiles row.
- **Task 15, the look (2026-10-17).** **The user chose** to wait for a TestFlight build. Step 1's first point no longer held: which iCloud environment an Xcode build uses isn't settled (spec §14.5). If the phone build reached Production, this build's writes would fail until the ticket field is deployed (spec §14.4), and once a build-199 write landed, the build guard would stop the App Store's 3.0.1 from writing over it. The move-over first runs for real on TestFlight.
- **Task 16 (2026-10-17).** The spec's §14 has the plan's decisions, the review's changes, I2's acceptance, C1's release step, why the look waits for TestFlight, where the build differs from §6.7 and §7, and what's left. Beyond the printed step, §9's release list gained C1's step, as the review's verdict asked.
