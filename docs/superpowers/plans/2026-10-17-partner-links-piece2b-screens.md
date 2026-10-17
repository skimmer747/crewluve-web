# Partner Links Piece 2b: the Partner Screens on Crewlu Cloud — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Signed in to Crewlu Cloud, a pilot's Partner Sharing runs there: one invite link per person, a list of who sees their status and on which devices, a page for each person, and a question before signing out. Not signed in, the screen asks them to sign in, and keeps today's iCloud partners going without new invites.

**Architecture:**
- **The rules are pure and tested.** Which screen shows, the list's rows and wording, the invite sheet's link and the error messages live in `Duty/Utils/PartnerCloud/`, beside 2a's code, and run in the Mac harness.
- **The screens talk to `PartnerCloudStore`.** It gains the partner actions (invite, rename, new link, remove a device or a person, remove everyone), each followed by a fresh read of the list, and one "sign in again" flag that every Crewlu Cloud answer feeds.
- **The views copy the approved mockups** and today's Partner Sharing look: the Crewlu Cloud list, the partner page, the invite sheet, the sign-in prompt and a share sheet that opens after the invite is made.
- **The iCloud side stops deleting Crewlu Cloud partners' settings.** Its clean-ups clear only what iCloud sharing alone uses, and removing the last iCloud partner while Crewlu Cloud sharing is on ends the iCloud share without wiping anyone's settings.

**Tech stack:** Swift 5 mode on iOS 18, SwiftUI, Observation, supabase-swift 2.46.0, XCTest.

**Design:** `docs/superpowers/specs/2026-10-16-partner-links-piece2-crewlu-design.md` in this repo: §6 (the screens), §7.5 (removing someone), §8.1 and §12 (2a's decisions, and the three items §12.4 leaves for 2b). The API contract is `~/Dev/Duty/supabase/partner-api.md`.

---

## Before you start

- **Two repos.**
  - The code goes in `~/Dev/Duty` (CrewLu).
  - This plan and the spec live in `~/Dev/Crewluve Website`.
  - Paths are relative to `~/Dev/Duty` unless they start with `~`, `$HARNESS` or `$BUILD`.
- **Branch.** Build on `feature/partner-cloud-screens`, cut from `feature/supabase-account-backend` at `4ff32814`, where 2a is merged (Task 0).
- **Leave the Xcode scheme files alone.**
  - `~/Dev/Duty` has uncommitted changes to `Duty.xcodeproj/xcshareddata/xcschemes/*` that aren't part of this work.
  - Never run `git add -A` or `git add .` there. Add the exact paths each step lists.
- **Who runs which tests.**
  - **CrewLu's rule:** never run `xcodebuild test`, never boot a simulator, and never build against the copy the user has open in Xcode. The user runs CrewLu's tests (Task 16).
  - **The Mac harness (Task 2)** runs the partner-cloud tests in a small Swift package outside both repos, with stand-ins for the few app types they touch. The test-first steps use it. It boots no simulator and shares no build folder with Xcode. 2a's harness was temporary, so Task 2 makes it again, now with 2b's files.
  - **The views and the iCloud manager are checked only by building:** the harness can't build SwiftUI's iOS views or CloudKit's manager, so Task 14's compile, the review (Task 15) and the user's run (Task 16) check them. The user's look (Task 17) shows them.
  - **The SQL tests** don't change: 2b makes no database change.
  - **One compile-only build (Task 14)** checks the whole app and its tests, in a separate clone with its own build folder.
- **No Crewlu Cloud.** Nothing in this plan calls Crewlu Cloud: the tests use a stand-in, and only the user's own look at the screens (Task 17, their choice) uses the live service.
- **New files need no project edit.** `Duty/` and `DutyTests/` are synchronized folders, so a new file joins its target by itself. Editor errors such as "Cannot find type" on a new file are a stale index: trust the harness and Task 14.
- **Pick two scratch folders,** outside both repos: one for the harness (`$HARNESS`, Task 2) and one for the compile-only clone (`$BUILD`, Task 14). Shell variables don't carry from one command to the next in Claude's Bash tool, so begin each command that uses them with `export HARNESS=<the folder> &&` (or `BUILD`).
- **If an expected value doesn't match, stop and ask.** Never change a test to make it pass.

## Decisions made while planning

These refine the spec. Task 18 writes them into it.

1. **`PartnerCloudAPI` gains six partner actions:** `partner_create(name, ref)`, `partner_rename`, `partner_new_link`, `partner_remove`, `partner_remove_device` and `partner_remove_all`. `partner_move_ticket` waits for 2c.
2. **The store acts only for the account its list follows,** and reads the list again after each action, unless Crewlu Cloud couldn't be reached or wants a sign-in, when nothing changed there. A read asked for while one is out runs once more after it, because the one that's out may predate the action.
3. **One "sign in again" flag, on the store.** Every `notSignedIn` answer sets it, from the list, an action or the summary; any answer that works clears it, and so does any change of account. The screen shows the expired prompt for it or for the sync engine's `sessionExpired`. The writer no longer keeps its own `.signInExpired` problem, which would have stayed up after signing in again until the next applied write.
4. **The screen redraws on every account change** (spec §12.4). `sharingAccount()` reads the list's account first, even signed out, so `problem` and `lastAppliedAt` follow every sign-in, sign-out and switch. Whose schedule the phone holds lives in UserDefaults, so the screen reads it again each time it appears, for instance on coming back from the Crewlu Cloud screen.
5. **A forced summary that doesn't reach Crewlu Cloud stays owed** (spec §12.4): after `unavailable` or `notSignedIn`, that account's next summary is forced too, so Update Status Now isn't lost to a dropped connection. Any answer from Crewlu Cloud settles it.
6. **Names are cleaned as Crewlu Cloud keeps them:** trimmed, and at most 60 code points, the way Postgres counts, without cutting a character in half. A cloud partner's name can't be empty, so an empty rename keeps the current name (spec §6.5).
7. **The invite sheet makes one reference when it opens** (spec §6.4). Every tap sends it, so Share then Copy, or a tap after a failed one, gets one partner. A repeat tap renames them when the name differs from the one Crewlu Cloud is known to have; after a failed tap that isn't known, so the next tap renames.
8. **The rows come in the approved mockup's order:** connected, still on iCloud, not opened yet, then pending invites from before the update, oldest first within each. Only accepted iCloud participants are listed. Until 2c's move-over links them, every accepted iCloud participant is "still on iCloud".
9. **Which screen** (spec §6.1): signed out, the prompt to keep sharing or to start; signed in, an expired sign-in comes first, then a schedule that's another account's, and otherwise the Crewlu Cloud screen.
10. **The iCloud clean-ups keep the per-person settings** (spec §12.4). `selfHealOrphanedPartnerState()` clears only the nicknames and the pending invites. The new `endICloudShare()` deletes the share and the record and clears the same. `removePartner` uses it when the last iCloud partner goes while Crewlu Cloud sharing is on, and `stopSharing()` otherwise, as today. 2c adds the move-over notes to it.
11. **Removing a Crewlu Cloud partner forgets their settings** and syncs that to the pilot's devices. Their id is never used again.
12. **Update Status Now and the screen's first appearance go through `forceUpdate`** (spec §12.4). They wait for the Crewlu Cloud write, so the spinner covers it, then read both lists. Since `forceUpdate` writes iCloud only while an iCloud share exists, opening the screen no longer writes an iCloud record for a pilot who never shared. Coming back from a partner page only reads the lists again.
13. **The quick status sheet** takes its Send To people and a rename action from the partner page; the signed-out screen still calls it as today. On Crewlu Cloud the rename comes first, so if it fails nothing has changed.
14. **Re-share on a pending invite from before the update** uses the label's id as the reference, so a second try makes no second partner.
15. **Stop Sharing with Everyone** goes to Crewlu Cloud first (`partner_remove_all`). If that fails, nothing changes. Then comes today's `stopSharing()`: any iCloud share, every per-person setting and the pending invites.
16. **Copy and looks the spec didn't give**, to approve with this plan:
    - the help sheet's "How to Set It Up" and "Privacy & Security" describe invite links and Crewlu Cloud;
    - Copy Invite Link shows "Copied" for 2 seconds;
    - a row with a spinner while the list loads, or "Couldn't reach Crewlu Cloud." with Retry;
    - the partner page: no title in its bar (the header has the name), an orange initial while not opened yet, an envelope for "Not opened yet", an iPhone or a globe for each device;
    - error alerts are titled "Error", as Partner Sharing's are today;
    - a person's quick-status bubble shows on every row that has one, not only connected rows.

## The four questions

- **Is this wise?**
  - 2b is where pilots meet partner links: the screens make Crewlu Cloud partners, which 2a's writer then keeps up to date.
  - Invite links only work with the new Crewluve (piece 4), and all three plans ship in one CrewLu release after it (P2-1), so nobody gets a link that goes nowhere.
  - The screens copy the approved mockups and today's Partner Sharing, and the rules behind them are pure and tested.
- **Will it break anything?**
  - *iCloud sharing:* signed out, today's screen stays below the prompt, minus inviting; its partners keep getting updates. Signed in, iCloud partners show in the list, and Remove still uses the iCloud share. The pending-invite matching for late joiners stays.
  - *Per-person settings:* the iCloud clean-ups no longer clear them (spec §12.4). Orphaned iCloud-id entries now stay until Stop Sharing with Everyone or 2c's end of the share; they're inert, because the cloud summary carries only cloud partners' entries.
  - *The iCloud record:* until 2c builds it per participant, it still carries every per-person setting, cloud partners' included. So a quick status sent only to a Crewlu Cloud partner would also show to iCloud partners on an older Crewluve. 2b and 2c ship together, so no release has this.
  - *Accounts:* actions run only for the account the list follows; Sign Out asks first while partners get updates; an expired sign-in shows the prompt.
  - *Network:* one small read when the screen opens, after each action and on pull to refresh, plus the actions themselves.
  - *Privacy:* invite tokens stay in memory, and a link carries its token after the `#`.
  - *A crash:* one force unwrap, the invite link's `URLComponents.url`, which can't be nil with those parts; nothing else new traps.
- **Is this what a brilliant Apple engineer would do?** It uses SwiftUI and Observation as the app does, `UIActivityViewController` where a link is made by the tap, today's rows, alerts and buttons, and the app's own pieces (`SyncOwnerGuard`, `PartnerSettings`, `PartnerDataKVSync`, `debugLog`). The rules are pure and tested; the store has one stand-in API.
- **Does it fix the disease or the symptom?** The disease is iCloud sharing's single share link and its clean-ups that knew nothing of other partners. 2b gives each person their own link, and makes the clean-ups clear only what iCloud alone uses, rather than patching settings back afterwards.

## Not in this plan

- **The move-over (2c):** the notes, tickets, linking iCloud participants to cloud partners, the iCloud record's maps built per participant, renaming late joiners, and ending the iCloud share once everyone has moved.
- The push service (piece 3), Crewluve (4), the website (5), and removing iCloud sharing (6).
- Live updates of the partner list (no realtime, D12): it's read on opening, on pull to refresh and after each action.
- Saving names, devices or invite tokens across launches: only 2a's ids are saved.

## How this plan was checked

- **Built test-first in a scratch clone** of `4ff32814`, outside `~/Dev/Duty`.
- **The Swift tests:** the Mac harness ran all 90 and caught 51 of 51 deliberate breaks, one at a time, in the store, the writer, the settings, the list, the screen's rules and the invite link. The first run missed two, which led to two more tests: pending invites given newest first, and going back to the first name after a failed rename.
- **The compile-only build** of the whole app and its tests passed in the scratch clone, with only the existing StoreKit warning.
- **A replay on a fresh clone of `4ff32814`:** every Run step gave the result printed here, including each test-first failure, and every file matched the scratch copy byte for byte. Task 14's build passed on the replayed branch.

## Files

In `~/Dev/Duty`:

| File | Responsibility |
|---|---|
| `Duty/Utils/PartnerCloud/PartnerCloudAPI.swift` (changed) | The six partner actions; `PartnerCloudInvite` and its link |
| `Duty/Utils/PartnerCloud/LivePartnerCloudAPI.swift` (changed) | The actions over the Supabase client |
| `Duty/Utils/PartnerCloud/PartnerCloudStore.swift` (changed) | The actions, names, the list's first read, the sign-in flag, reading again, redraws on account changes |
| `Duty/Utils/PartnerCloud/PartnerSummaryCloudWriter.swift` (changed) | An owed forced summary; the sign-in goes to the store |
| `Duty/Utils/PartnerCloud/PartnerSettings.swift` (changed) | Forgetting someone; the iCloud clean-up's keys |
| `Duty/Utils/PartnerCloud/PartnerList.swift` | Pure: the list's rows and wording |
| `Duty/Utils/PartnerCloud/PartnerSharingScreen.swift` | Pure: which screen, the prompt's words, the error messages |
| `Duty/Utils/PartnerCloud/PartnerInviteLink.swift` | The invite sheet's link |
| `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift` (changed) | Clean-ups that keep the settings; `endICloudShare()` |
| `Duty/Utils/SyncGuidanceCopy.swift` (changed) | The Crewlu Cloud newer-build message |
| `Duty/Views/Settings/ActivityShareSheet.swift` | The share sheet for a link made by the tap |
| `Duty/Views/Settings/PartnerCloudPrompt.swift` | The sign-in prompt |
| `Duty/Views/Settings/PartnerDetailView.swift` | The partner page |
| `Duty/Views/Settings/PartnerQuickStatusSheet.swift` (changed) | Send To's people and the rename, for Crewlu Cloud partners |
| `Duty/Views/Settings/PartnerSharingView.swift` (changed) | The screen, the Crewlu Cloud list, and the invite sheet (`ShareLinkView`) |
| `Duty/Views/Account/CrewluCloudDetailView.swift` (changed) | Sign Out asks first |
| `DutyTests/Helpers/StubPartnerCloudAPI.swift` (changed) | The stand-in's actions |
| `DutyTests/PartnerCloudStoreTests.swift`, `PartnerSummaryCloudWriterTests.swift`, `PartnerSettingsTests.swift` (changed) | Their new tests |
| `DutyTests/PartnerListTests.swift`, `PartnerSharingScreenTests.swift`, `PartnerInviteLinkTests.swift` | The new tests |

In `~/Dev/Crewluve Website`: this plan, ticked as it goes, and the piece 2 spec (Task 18).

Outside both repos: the Mac harness (`$HARNESS`, Task 2) and the compile-only clone (`$BUILD`, Task 14).

---

### Task 0: Branch

- [ ] **Step 1: Check the working tree**

Run:

```bash
git -C ~/Dev/Duty status --short
```

Expected: only the Xcode scheme lines (` M Duty.xcodeproj/xcshareddata/xcschemes/Duty.xcscheme` and four `??` scheme files). If anything else shows, stop and ask the user.

- [ ] **Step 2: Create the branch**

Run:

```bash
git -C ~/Dev/Duty switch -c feature/partner-cloud-screens feature/supabase-account-backend && git -C ~/Dev/Duty log --oneline -1
```

Expected: `Switched to a new branch 'feature/partner-cloud-screens'`, then `4ff32814 fix(partners): after the review's re-check…`. The scheme changes carry over untouched. If the tip isn't `4ff32814`, stop and ask: this plan was checked against it.

### Task 1: The partner actions

**Files:**
- Modify: `Duty/Utils/PartnerCloud/PartnerCloudAPI.swift`, `Duty/Utils/PartnerCloud/LivePartnerCloudAPI.swift`, `DutyTests/Helpers/StubPartnerCloudAPI.swift`

The seam gains the six calls the screens make (decision 1), the invite link's shape, and the stand-in's versions of them. Nothing uses them yet: Task 2's harness builds the stand-in, and Task 14 builds the live version.

- [ ] **Step 1: Add the actions to the seam**

The header no longer says the actions come later; `PartnerCloudInvite` is `partner_create`'s answer and builds the link (`supabase/partner-api.md`, "Links"); the protocol gains the actions.

3 replacements, in order, in `Duty/Utils/PartnerCloud/PartnerCloudAPI.swift`:

In `Duty/Utils/PartnerCloud/PartnerCloudAPI.swift`, replace:

```swift
//
//  Partner links, piece 2: the pilot's side of Crewlu Cloud's partner door
//  (supabase/partner-api.md). LivePartnerCloudAPI is the real one; tests use a
//  stand-in, so they never touch the network. The partner actions (invite,
//  rename, remove…) join this protocol with the partner screens.
//

import Foundation
```

with:

```swift
//
//  Partner links, piece 2: the pilot's side of Crewlu Cloud's partner door
//  (supabase/partner-api.md). LivePartnerCloudAPI is the real one; tests use a
//  stand-in, so they never touch the network.
//

import Foundation
```

In `Duty/Utils/PartnerCloud/PartnerCloudAPI.swift`, replace:

```swift
    let lastSeenAt: Date?
}

/// The calls CrewLu makes, signed in as the pilot. They throw `PartnerCloudError`.
protocol PartnerCloudAPI: Sendable {
    /// `set_partner_status`. `summary` is PartnerSummaryEncoder's JSON object. False
```

with:

```swift
    let lastSeenAt: Date?
}

/// `partner_create`'s answer: the partner, and the token their invite link carries.
struct PartnerCloudInvite: Equatable, Sendable {
    let id: String
    let inviteToken: String

    /// The link a partner taps (supabase/partner-api.md, "Links"). The token sits after
    /// the `#`, so it never reaches a server log.
    static func link(forToken token: String) -> URL {
        var components = URLComponents()
        components.scheme = "https"
        components.host = "crewluve.crewlu.net"
        components.path = "/join"
        components.fragment = "t=\(token)"
        // URLComponents percent-encodes the fragment, so these parts always make a URL.
        return components.url!
    }

    var link: URL { Self.link(forToken: inviteToken) }
}

/// The calls CrewLu makes, signed in as the pilot. They throw `PartnerCloudError`.
protocol PartnerCloudAPI: Sendable {
    /// `set_partner_status`. `summary` is PartnerSummaryEncoder's JSON object. False
```

In `Duty/Utils/PartnerCloud/PartnerCloudAPI.swift`, replace:

```swift
    func partners() async throws -> [PartnerCloudPartner]
    /// Every partner's devices, oldest first.
    func devices() async throws -> [PartnerCloudDevice]
}
```

with:

```swift
    func partners() async throws -> [PartnerCloudPartner]
    /// Every partner's devices, oldest first.
    func devices() async throws -> [PartnerCloudDevice]
    /// `partner_create`. The same `ref` always answers with the same partner, without
    /// renaming them, so a repeated call is safe.
    func createPartner(name: String, ref: String) async throws -> PartnerCloudInvite
    /// `partner_rename`.
    func renamePartner(_ id: String, to name: String) async throws
    /// `partner_new_link`: a new invite token. The old link stops working; devices
    /// already connected stay connected.
    func newLink(for id: String) async throws -> String
    /// `partner_remove`: the person and their devices. Fine when they're already gone.
    func removePartner(_ id: String) async throws
    /// `partner_remove_device`. Fine when it's already gone.
    func removeDevice(_ id: String) async throws
    /// `partner_remove_all`: every partner, every device, and the summary.
    func removeAllPartners() async throws
}
```

- [ ] **Step 2: Add them to the live version**

Each call goes through the same `call` as 2a's, so it asks for the session first and its errors map the same way.

2 replacements, in order, in `Duty/Utils/PartnerCloud/LivePartnerCloudAPI.swift`:

In `Duty/Utils/PartnerCloud/LivePartnerCloudAPI.swift`, replace:

```swift
//
//  PartnerCloudAPI over the shared Supabase client: PostgREST RPCs, and the
//  pilot's own rows through RLS. Every failure comes out as a PartnerCloudError.
//

import Foundation
```

with:

```swift
//
//  PartnerCloudAPI over the shared Supabase client: PostgREST RPCs, and the
//  pilot's own rows through RLS. Every failure comes out as a PartnerCloudError.
//  Ids go out as they came in, lower-case; the RPCs read them as uuids.
//

import Foundation
```

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

    private struct CreateParams: Encodable {
        let p_name: String
        let p_ref: String
    }

    private struct CreateAnswer: Decodable {
        let id: String
        let invite_token: String
    }

    func createPartner(name: String, ref: String) async throws -> PartnerCloudInvite {
        try await call {
            let answer: CreateAnswer = try await client
                .rpc("partner_create", params: CreateParams(p_name: name, p_ref: ref))
                .execute()
                .value
            return PartnerCloudInvite(id: answer.id, inviteToken: answer.invite_token)
        }
    }

    private struct RenameParams: Encodable {
        let p_partner: String
        let p_name: String
    }

    func renamePartner(_ id: String, to name: String) async throws {
        try await call {
            _ = try await client.rpc("partner_rename", params: RenameParams(p_partner: id, p_name: name)).execute()
        }
    }

    private struct PartnerParams: Encodable {
        let p_partner: String
    }

    private struct NewLinkAnswer: Decodable {
        let invite_token: String
    }

    func newLink(for id: String) async throws -> String {
        try await call {
            let answer: NewLinkAnswer = try await client
                .rpc("partner_new_link", params: PartnerParams(p_partner: id))
                .execute()
                .value
            return answer.invite_token
        }
    }

    func removePartner(_ id: String) async throws {
        try await call {
            _ = try await client.rpc("partner_remove", params: PartnerParams(p_partner: id)).execute()
        }
    }

    private struct DeviceParams: Encodable {
        let p_device: String
    }

    func removeDevice(_ id: String) async throws {
        try await call {
            _ = try await client.rpc("partner_remove_device", params: DeviceParams(p_device: id)).execute()
        }
    }

    func removeAllPartners() async throws {
        try await call {
            _ = try await client.rpc("partner_remove_all").execute()
        }
    }

    /// Asks for the session first, which renews an expired one. Without this, a sign-in
    /// that can't be renewed would go unnoticed: the SDK sends the call without it.
    private func call<T>(_ body: () async throws -> T) async throws -> T {
```

- [ ] **Step 3: Add them to the tests' stand-in**

Each action is recorded and can be made to fail; `partner_create` answers, as the server does, with an id that follows from the reference. A held read now answers with the list as it was when the read arrived, as the server would, so a test can change the list while a read is out.

2 replacements, in order, in `DutyTests/Helpers/StubPartnerCloudAPI.swift`:

In `DutyTests/Helpers/StubPartnerCloudAPI.swift`, replace:

```swift
//  DutyTests
//
//  A PartnerCloudAPI with no network. Answers are queued; writes can be held
//  open to test what happens while one is in flight.
//

import Foundation
```

with:

```swift
//  DutyTests
//
//  A PartnerCloudAPI with no network. Answers are queued; writes can be held
//  open to test what happens while one is in flight. Partner actions are
//  recorded, and can be made to fail.
//

import Foundation
```

In `DutyTests/Helpers/StubPartnerCloudAPI.swift`, replace:

```swift

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

with:

```swift

    func partners() async throws -> [PartnerCloudPartner] {
        partnersCalls += 1
        // The list as it is when the read arrives, as on the server: a later answer doesn't change a held read.
        let answer = partnersAnswer
        let watchers = readWatchers
        readWatchers = []
        watchers.forEach { $0.resume() }
        if holdsReads {
            await withCheckedContinuation { heldReads.append($0) }
        }
        return try answer.get()
    }

    func devices() async throws -> [PartnerCloudDevice] {
        devicesCalls += 1
        return try devicesAnswer.get()
    }

    // MARK: - The partner actions

    /// Every partner action, oldest first, such as `create Sam ref-1` or `remove <id>`.
    private(set) var actions: [String] = []
    /// By action (`create`, `rename`, `newLink`, `remove`, `removeDevice`, `removeAll`): the
    /// next calls of it fail with these, oldest first.
    private var failures: [String: [PartnerCloudError]] = [:]

    func failNext(_ action: String, with errors: PartnerCloudError...) {
        failures[action, default: []] += errors
    }

    private func act(_ action: String, _ details: String...) throws {
        actions.append(([action] + details).joined(separator: " "))
        if let error = failures[action]?.first {
            failures[action]?.removeFirst()
            throw error
        }
    }

    func createPartner(name: String, ref: String) async throws -> PartnerCloudInvite {
        try act("create", name, ref)
        // As on the server, the id follows from the reference.
        return PartnerCloudInvite(id: "partner-\(ref)", inviteToken: "token-\(ref)")
    }

    func renamePartner(_ id: String, to name: String) async throws {
        try act("rename", id, name)
    }

    func newLink(for id: String) async throws -> String {
        try act("newLink", id)
        return "new-token-\(id)"
    }

    func removePartner(_ id: String) async throws {
        try act("remove", id)
    }

    func removeDevice(_ id: String) async throws {
        try act("removeDevice", id)
    }

    func removeAllPartners() async throws {
        try act("removeAll")
    }
}
```

- [ ] **Step 4: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerCloudAPI.swift Duty/Utils/PartnerCloud/LivePartnerCloudAPI.swift DutyTests/Helpers/StubPartnerCloudAPI.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): the partner actions in PartnerCloudAPI: invite, rename, new link, and removing a device, a person or everyone" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 2: The Mac harness

**Files (outside both repos):** `$HARNESS/Package.swift`, `$HARNESS/Sources/UIKit/UIKitStandIn.swift`, `$HARNESS/Sources/Duty/AppStandIns.swift`, `$HARNESS/run.sh`

The harness from plan 2a, made again: it was temporary. A Swift package that compiles CrewLu's partner-cloud files and their tests unchanged, on the Mac, with stand-ins for the few app types they touch. `run.sh` copies whatever partner-cloud files exist so far from `~/Dev/Duty` (or `$DUTY`), then runs `swift test`. It needs no Xcode project, no simulator and no network, and it builds into its own `.build` folder. The test target uses the same concurrency settings as `DutyTests` (Swift 5 mode, Approachable Concurrency, member import visibility).

What changed since 2a: the stand-in for the live API has the six actions, and `run.sh` also copies `PendingPartnerInvites.swift` and 2b's three new test files.

- [ ] **Step 1: Write the package**

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

- [ ] **Step 2: Write the stand-ins**

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
}
```

- [ ] **Step 3: Write the runner**

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
         PartnerListTests.swift PartnerSharingScreenTests.swift PartnerInviteLinkTests.swift; do
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

Expected: `Executed 47 tests, with 0 failures`: 2a's tests, with Task 1's stand-in. The first build takes about a minute; later runs take seconds. Nothing to commit: the harness isn't part of CrewLu.

### Task 3: The store's actions

**Files:**
- Modify: `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`
- Test: `DutyTests/PartnerCloudStoreTests.swift`

The screens act through the store (spec §4.2, "How it fits together"). This task adds the actions and their rules (decisions 2, 3 and 6), the list's first-read flag the screen uses while names load, and the change that makes screens redraw on every account change (decision 4).

- [ ] **Step 1: Write the failing tests**

The header, `import Observation` for `withObservationTracking`, and thirteen tests at the end.

2 replacements, in order, in `DutyTests/PartnerCloudStoreTests.swift`:

In `DutyTests/PartnerCloudStoreTests.swift`, replace:

```swift
//  PartnerCloudStoreTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §5.2, §6.7, §8.1): the account's partner list
//  the summary writer goes by.
//

import XCTest
@testable import Duty

@MainActor
```

with:

```swift
//  PartnerCloudStoreTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §5.2, §6, §8.1): the account's partner list the
//  summary writer goes by, and the partner screens' actions.
//

import XCTest
import Observation
@testable import Duty

@MainActor
```

In `DutyTests/PartnerCloudStoreTests.swift`, replace:

```swift
        XCTAssertEqual(store.accountID, "PILOT-2")
        XCTAssertEqual(store.partnerIDs, [b])
    }
}
```

with:

```swift
        XCTAssertEqual(store.accountID, "PILOT-2")
        XCTAssertEqual(store.partnerIDs, [b])
    }

    // MARK: - The partner actions (spec §6.2–§6.4)

    /// A store that has read PILOT-1's list: Sam (A) and Jo (B).
    private func loadedStore() async -> PartnerCloudStore {
        await api.answerPartners(.success([partner(a, "Sam"), partner(b, "Jo")]))
        let store = makeStore()
        store.accountChanged()
        await store.refresh()
        return store
    }

    func test_invite_makesThePartner_andReadsTheListAgain() async throws {
        let store = await loadedStore()
        let invite = try await store.invite(name: "Dad", ref: "ref-1")
        XCTAssertEqual(invite, PartnerCloudInvite(id: "partner-ref-1", inviteToken: "token-ref-1"))
        XCTAssertEqual(invite.link.absoluteString, "https://crewluve.crewlu.net/join#t=token-ref-1")
        let actions = await api.actions
        let reads = await api.partnersCalls
        XCTAssertEqual(actions, ["create Dad ref-1"])
        XCTAssertEqual(reads, 2, "the list is read again after the action")
    }

    func test_eachAction_callsTheDoor_andReadsTheListAgain() async throws {
        let store = await loadedStore()
        try await store.rename(a, to: "Samantha")
        let token = try await store.newLink(for: a)
        try await store.removeDevice("d1")
        try await store.remove(b)
        try await store.removeAll()
        XCTAssertEqual(token, "new-token-\(a)")
        let actions = await api.actions
        let reads = await api.partnersCalls
        XCTAssertEqual(actions, ["rename \(a) Samantha", "newLink \(a)", "removeDevice d1", "remove \(b)", "removeAll"])
        XCTAssertEqual(reads, 6)
    }

    func test_actions_needTheSignedInAccountsList() async {
        let store = await loadedStore()
        signedInAs = "PILOT-2"                       // this store hasn't followed the switch yet
        do {
            try await store.remove(a)
            XCTFail("acted for an account the list isn't")
        } catch {
            XCTAssertEqual(error as? PartnerCloudError, .notSignedIn)
        }
        let actions = await api.actions
        XCTAssertEqual(actions, [])
    }

    /// Offline, nothing changed, so there's nothing to read again.
    func test_whenCrewluCloudCantBeReached_theActionFails_andTheListIsntReadAgain() async {
        let store = await loadedStore()
        await api.failNext("remove", with: .unavailable)
        do {
            try await store.remove(a)
            XCTFail("the remove failed")
        } catch {
            XCTAssertEqual(error as? PartnerCloudError, .unavailable)
        }
        let reads = await api.partnersCalls
        XCTAssertEqual(reads, 1)
        XCTAssertEqual(store.partnerIDs, [a, b])
    }

    /// PT404: someone another device already removed. The list catches up (spec §6.3).
    func test_aRefusal_readsTheListAgain() async {
        let store = await loadedStore()
        await api.failNext("rename", with: .refused(code: "PT404"))
        await api.answerPartners(.success([partner(a, "Sam")]))
        do {
            try await store.rename(b, to: "Joanna")
            XCTFail("Jo is gone")
        } catch {
            XCTAssertEqual(error as? PartnerCloudError, .refused(code: "PT404"))
        }
        XCTAssertEqual(store.partnerIDs, [a])
    }

    func test_anExpiredSignIn_isKept_untilAnAnswerWorks_orTheAccountChanges() async {
        let store = await loadedStore()
        XCTAssertFalse(store.signInExpired)
        await api.failNext("rename", with: .notSignedIn)
        try? await store.rename(a, to: "Samantha")
        XCTAssertTrue(store.signInExpired)
        await store.refresh()
        XCTAssertFalse(store.signInExpired, "the list answered")

        await api.answerPartners(.failure(.notSignedIn))
        await store.refresh()
        XCTAssertTrue(store.signInExpired, "the list asked for a sign-in too")
        signedInAs = nil
        store.accountChanged()
        XCTAssertFalse(store.signInExpired, "signed out on purpose")
    }

    /// The summary's writer reports what Crewlu Cloud said about the sign-in, for its account only.
    func test_theWritersAnswers_markTheSignIn() async {
        let store = await loadedStore()
        store.noteSignIn(expired: true, for: "PILOT-2")
        XCTAssertFalse(store.signInExpired, "another account's answer")
        store.noteSignIn(expired: true, for: "PILOT-1")
        XCTAssertTrue(store.signInExpired)
        store.noteSignIn(expired: false, for: "PILOT-1")
        XCTAssertFalse(store.signInExpired)
    }

    /// Crewlu Cloud keeps names trimmed, 1 to 60 characters; a character is never cut in half.
    func test_names_areTrimmed_andCutTo60Characters() {
        XCTAssertEqual(PartnerCloudStore.cleanName("  Dad \n"), "Dad")
        XCTAssertEqual(PartnerCloudStore.cleanName(String(repeating: "a", count: 70)),
                       String(repeating: "a", count: 60))
        let family = "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}"   // one character, five code points
        XCTAssertEqual(PartnerCloudStore.cleanName(String(repeating: "a", count: 55) + family),
                       String(repeating: "a", count: 55) + family, "exactly 60 code points")
        XCTAssertEqual(PartnerCloudStore.cleanName(String(repeating: "a", count: 56) + family),
                       String(repeating: "a", count: 56), "61 would be too many")
    }

    /// A cloud partner's name can't be empty, so an empty nickname keeps the current one (spec §6.5).
    func test_rename_trimsTheName_andAnEmptyOneKeepsTheCurrentName() async throws {
        let store = await loadedStore()
        try await store.rename(a, to: "  Samantha ")
        try await store.rename(a, to: " \n ")
        let actions = await api.actions
        let reads = await api.partnersCalls
        XCTAssertEqual(actions, ["rename \(a) Samantha"])
        XCTAssertEqual(reads, 2, "nothing to read again after no rename")
    }

    func test_invite_trimsTheName() async throws {
        let store = await loadedStore()
        _ = try await store.invite(name: " Dad ", ref: "ref-1")
        let actions = await api.actions
        XCTAssertEqual(actions, ["create Dad ref-1"])
    }

    /// A read that's out may predate the change an action just made: the list is read once more.
    func test_anActionDuringARead_readsTheListOnceMoreAfterIt() async throws {
        let store = await loadedStore()
        await api.holdReads()
        let read = Task { await store.refresh() }
        await api.waitForReads(2)                     // out, with Sam and Jo
        await api.answerPartners(.success([partner(a, "Sam")]))
        try await store.remove(b)                    // its read waits for the one that's out
        await api.releaseReads()
        await read.value
        let reads = await api.partnersCalls
        XCTAssertEqual(reads, 3)
        XCTAssertEqual(store.partnerIDs, [a])
        XCTAssertEqual(store.partners.map(\.name), ["Sam"])
    }

    func test_hasLoadedList_onlyAfterThisAccountsListIsRead() async {
        let store = makeStore()
        store.accountChanged()
        XCTAssertFalse(store.hasLoadedList)
        await api.answerPartners(.failure(.unavailable))
        await store.refresh()
        XCTAssertFalse(store.hasLoadedList)
        await api.answerPartners(.success([]))
        await store.refresh()
        XCTAssertTrue(store.hasLoadedList, "an empty list is a list")
        signedInAs = "PILOT-2"
        store.accountChanged()
        XCTAssertFalse(store.hasLoadedList)
    }

    /// Screens read the sharing account (the writer's problem and "Updated … ago" do), so it
    /// must redraw them on every sign-in, sign-out and switch, signed out included (spec §12.4).
    func test_readingTheSharingAccount_redrawsOnEveryAccountChange() {
        signedInAs = nil
        let store = makeStore()
        store.accountChanged()
        let redraws = RedrawCounter()
        func watch() {
            withObservationTracking { _ = store.sharingAccount() } onChange: { redraws.count += 1 }
        }
        watch()
        signedInAs = "PILOT-1"
        store.accountChanged()
        XCTAssertEqual(redraws.count, 1, "signing in")
        watch()
        signedInAs = "PILOT-2"
        store.accountChanged()
        XCTAssertEqual(redraws.count, 2, "switching accounts")
        watch()
        signedInAs = nil
        store.accountChanged()
        XCTAssertEqual(redraws.count, 3, "signing out")
    }
}

/// Counts Observation's change calls, which may come from any thread.
private final class RedrawCounter: @unchecked Sendable {
    var count = 0
}
```

- [ ] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `value of type 'PartnerCloudStore' has no member 'invite'`.

- [ ] **Step 3: Write the actions**

The header; `hasLoadedList` and `signInExpired`; the read-again flag; `sharingAccount()` reading the list's account first; `accountChanged()` resetting the new flags; `refresh()` reading once more when asked during a read; and the actions with their helpers.

8 replacements, in order, in `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`:

In `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`, replace:

```swift
//  summary writer needs: refreshed at launch, on coming back to the app and on
//  signing in; forgotten on signing out. Only the partner ids are saved, per
//  account, so a relaunch keeps writing before the first refresh. The partner
//  screens add the actions.
//

import Foundation
```

with:

```swift
//  summary writer needs: refreshed at launch, on coming back to the app and on
//  signing in; forgotten on signing out. Only the partner ids are saved, per
//  account, so a relaunch keeps writing before the first refresh. The partner
//  screens act through it: each action is followed by a fresh read of the list.
//

import Foundation
```

In `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`, replace:

```swift
    /// The account's partners and their devices, as of the last refresh on this launch.
    private(set) var partners: [PartnerCloudPartner] = []
    private(set) var devices: [PartnerCloudDevice] = []
    /// The last refresh failed. The list keeps what it had.
    private(set) var lastRefreshFailed = false

    private let api: any PartnerCloudAPI
    private let currentUserID: () -> String?
```

with:

```swift
    /// The account's partners and their devices, as of the last refresh on this launch.
    private(set) var partners: [PartnerCloudPartner] = []
    private(set) var devices: [PartnerCloudDevice] = []
    /// The list has been read for this account on this launch, so `partners` is the whole list.
    private(set) var hasLoadedList = false
    /// The last refresh failed. The list keeps what it had.
    private(set) var lastRefreshFailed = false
    /// Crewlu Cloud asked this account to sign in again: a refresh, an action or the summary
    /// was answered `notSignedIn`. The next answer that works clears it, and so does any
    /// change of account.
    private(set) var signInExpired = false

    private let api: any PartnerCloudAPI
    private let currentUserID: () -> String?
```

In `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`, replace:

```swift
    @ObservationIgnored private var hasLoadedAccount = false
    /// The account whose refresh is out. Another account's refresh doesn't wait for it.
    @ObservationIgnored private var refreshingAccount: String?
    @ObservationIgnored private var signInObserver: AnyCancellable?
    private static var activeObserver: NSObjectProtocol?
```

with:

```swift
    @ObservationIgnored private var hasLoadedAccount = false
    /// The account whose refresh is out. Another account's refresh doesn't wait for it.
    @ObservationIgnored private var refreshingAccount: String?
    /// A refresh was asked for while one was out: read once more when it's done.
    @ObservationIgnored private var readAgain = false
    @ObservationIgnored private var signInObserver: AnyCancellable?
    private static var activeObserver: NSObjectProtocol?
```

In `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`, replace:

```swift
    /// The account whose summary this device writes, with its partner ids: signed in, and
    /// the schedule on this phone is that account's (`SyncOwnerGuard`). Nil otherwise.
    func sharingAccount() -> (id: String, partnerIDs: Set<String>)? {
        guard let uid = currentUserID(), ownerAllows(uid) else { return nil }
        // Before this launch has followed the sign-in, use the ids saved last time.
        return (uid, uid == accountID ? partnerIDs : savedIDs(for: uid))
    }

    /// Crewlu Cloud sharing is on: this device writes the summary of an account with partners.
```

with:

```swift
    /// The account whose summary this device writes, with its partner ids: signed in, and
    /// the schedule on this phone is that account's (`SyncOwnerGuard`). Nil otherwise.
    func sharingAccount() -> (id: String, partnerIDs: Set<String>)? {
        // Read first, signed out too, so a screen showing anything derived from this redraws on
        // every sign-in, sign-out and switch: they all pass through accountChanged().
        let followed = accountID
        guard let uid = currentUserID(), ownerAllows(uid) else { return nil }
        // Before this launch has followed the sign-in, use the ids saved last time.
        return (uid, uid == followed ? partnerIDs : savedIDs(for: uid))
    }

    /// Crewlu Cloud sharing is on: this device writes the summary of an account with partners.
```

In `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`, replace:

```swift
        accountID = uid
        partners = []
        devices = []
        lastRefreshFailed = false
        if let uid {
            partnerIDs = savedIDs(for: uid)
        } else {
```

with:

```swift
        accountID = uid
        partners = []
        devices = []
        hasLoadedList = false
        lastRefreshFailed = false
        signInExpired = false
        if let uid {
            partnerIDs = savedIDs(for: uid)
        } else {
```

In `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`, replace:

```swift

    /// Reads the account's partners and devices from Crewlu Cloud.
    func refresh() async {
        guard let uid = accountID, uid == currentUserID(), refreshingAccount != uid else { return }
        refreshingAccount = uid
        defer {
            if refreshingAccount == uid {
                refreshingAccount = nil
            }
        }
        do {
            let newPartners = try await api.partners()
            // Most pilots share with no one: one read is enough then.
```

with:

```swift

    /// Reads the account's partners and devices from Crewlu Cloud.
    func refresh() async {
        guard let uid = accountID, uid == currentUserID() else { return }
        guard refreshingAccount != uid else {
            // The read that's out may predate a change just made.
            readAgain = true
            return
        }
        refreshingAccount = uid
        defer {
            if refreshingAccount == uid {
                refreshingAccount = nil
            }
        }
        repeat {
            readAgain = false
            await read(for: uid)
        } while readAgain && accountID == uid
    }

    private func read(for uid: String) async {
        do {
            let newPartners = try await api.partners()
            // Most pilots share with no one: one read is enough then.
```

In `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`, replace:

```swift
            guard accountID == uid else { return }    // signed out or switched meanwhile
            partners = newPartners
            devices = newDevices
            lastRefreshFailed = false
            let ids = Set(newPartners.map(\.id))
            guard ids != partnerIDs else { return }
            partnerIDs = ids
```

with:

```swift
            guard accountID == uid else { return }    // signed out or switched meanwhile
            partners = newPartners
            devices = newDevices
            hasLoadedList = true
            lastRefreshFailed = false
            signInExpired = false
            let ids = Set(newPartners.map(\.id))
            guard ids != partnerIDs else { return }
            partnerIDs = ids
```

In `Duty/Utils/PartnerCloud/PartnerCloudStore.swift`, replace:

```swift
        } catch {
            guard accountID == uid else { return }
            lastRefreshFailed = true
            debugLog("[PartnerCloud] Couldn't refresh the partner list: \(error)")
        }
    }

    /// Starts following the app: coming back to it, and signing in or out. Called once, at
    /// launch. The store, and the Supabase client it uses, are made on the first activation.
```

with:

```swift
        } catch {
            guard accountID == uid else { return }
            lastRefreshFailed = true
            if error as? PartnerCloudError == .notSignedIn {
                signInExpired = true
            }
            debugLog("[PartnerCloud] Couldn't refresh the partner list: \(error)")
        }
    }

    // MARK: - Actions (spec §6.2–§6.4)

    /// Invites someone: makes their partner. An earlier call with the same `ref` made the
    /// same partner, so a repeated tap is safe; it doesn't rename them (see `rename`).
    func invite(name: String, ref: String) async throws -> PartnerCloudInvite {
        let name = Self.cleanName(name)
        return try await act { try await $0.createPartner(name: name, ref: ref) }
    }

    /// A cloud partner's name can't be empty, so an empty one keeps the current name (spec §6.5).
    func rename(_ id: String, to name: String) async throws {
        let name = Self.cleanName(name)
        guard !name.isEmpty else { return }
        try await act { try await $0.renamePartner(id, to: name) }
    }

    /// A new invite token for the partner. Their old link stops working.
    func newLink(for id: String) async throws -> String {
        try await act { try await $0.newLink(for: id) }
    }

    func remove(_ id: String) async throws {
        try await act { try await $0.removePartner(id) }
    }

    func removeDevice(_ id: String) async throws {
        try await act { try await $0.removeDevice(id) }
    }

    /// Stop Sharing with Everyone, on Crewlu Cloud: every partner, device and the summary.
    func removeAll() async throws {
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
            switch error {
            case .notSignedIn:
                noteSignIn(expired: true, for: uid)
            case .refused:
                // Such as PT404: another device removed them. The list catches up.
                noteSignIn(expired: false, for: uid)
                await refresh()
            case .unavailable:
                break
            }
            throw error
        }
    }

    /// A name as Crewlu Cloud keeps it: trimmed, and at most 60 characters, which it counts
    /// in code points. A character that would go past 60 is left out whole.
    static func cleanName(_ name: String) -> String {
        var kept = ""
        var codePoints = 0
        for character in name.trimmingCharacters(in: .whitespacesAndNewlines) {
            codePoints += character.unicodeScalars.count
            guard codePoints <= 60 else { break }
            kept.append(character)
        }
        return kept
    }

    /// What Crewlu Cloud said about an account's sign-in, from any call: the list's, an
    /// action's, or the summary writer's. Kept only for the account this list belongs to.
    func noteSignIn(expired: Bool, for account: String) {
        guard account == accountID else { return }
        signInExpired = expired
    }

    // MARK: - Following the app

    /// Starts following the app: coming back to it, and signing in or out. Called once, at
    /// launch. The store, and the Supabase client it uses, are made on the first activation.
```

- [ ] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 60 tests, with 0 failures`.

- [ ] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerCloudStore.swift DutyTests/PartnerCloudStoreTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): PartnerCloudStore acts for the partner screens, reads the list again after each action, and keeps the sign-in's state" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 4: The writer

**Files:**
- Modify: `Duty/Utils/PartnerCloud/PartnerSummaryCloudWriter.swift`
- Test: `DutyTests/PartnerSummaryCloudWriterTests.swift`

Spec §12.4 asks whether a forced summary that fails with `unavailable` stays forced: it does (decision 5). The writer's answers about the sign-in go to the store's one flag (decision 3), and a test pins the redraws (decision 4).

- [ ] **Step 1: Write the failing tests**

`import Observation`, and 2a's last test, `test_anExpiredSignIn_isReported`, replaced by four. The writer's `.signInExpired` problem goes, so that test changes on purpose: the expired sign-in is now the store's to show.

2 replacements, in order, in `DutyTests/PartnerSummaryCloudWriterTests.swift`:

In `DutyTests/PartnerSummaryCloudWriterTests.swift`, replace:

```swift
//

import XCTest
@testable import Duty

@MainActor
```

with:

```swift
//

import XCTest
import Observation
@testable import Duty

@MainActor
```

In `DutyTests/PartnerSummaryCloudWriterTests.swift`, replace:

```swift
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

with:

```swift
        XCTAssertNil(writer.problem, "the next applied write clears it")
    }

    /// The partner list keeps the sign-in's state, so every call's answer counts (spec §6.1).
    func test_anExpiredSignIn_isReportedToThePartnerList_andAWorkingAnswerClearsIt() async {
        let writer = makeWriter()
        await api.queueStatusAnswers(.failure(.notSignedIn))
        writer.submit(Examples.layover.status)
        await writer.waitUntilIdle()
        XCTAssertTrue(store.signInExpired)
        XCTAssertNil(writer.problem)
        XCTAssertNil(writer.lastAppliedAt)

        writer.submit(layoverLater)
        await writer.waitUntilIdle()
        XCTAssertFalse(store.signInExpired)
        XCTAssertNotNil(writer.lastAppliedAt)
    }

    /// Update Status Now while offline: the next update sends the summary even though it hasn't
    /// changed, so partners still get the fresh time the pilot asked for (spec §12.4).
    func test_aForcedSummaryThatCantReachCrewluCloud_staysOwed() async {
        let writer = makeWriter()
        writer.submit(Examples.layover.status)
        await writer.waitUntilIdle()
        await api.queueStatusAnswers(.failure(.unavailable))
        writer.submit(layoverLater, force: true)    // offline
        await writer.waitUntilIdle()
        writer.submit(layoverLater)                 // unchanged, but still owed
        await writer.waitUntilIdle()
        writer.submit(layoverLater)                 // it was applied: nothing is owed now
        await writer.waitUntilIdle()
        let sent = await api.sentSummaries
        XCTAssertEqual(sent.count, 3)
    }

    /// What's owed is the account's own: another account's next summary isn't forced.
    func test_aForcedSummaryOwed_belongsToItsAccount() async {
        scheduleOwner = nil
        let writer = makeWriter()
        switchToSecondAccount()
        writer.submit(Examples.layover.status)      // PILOT-2's, applied
        await writer.waitUntilIdle()
        signedInAs = account
        store.accountChanged()
        await api.queueStatusAnswers(.failure(.unavailable))
        writer.submit(Examples.layover.status, force: true)    // PILOT-1's, owed
        await writer.waitUntilIdle()
        switchToSecondAccount()
        writer.submit(layoverLater)                 // PILOT-2's, unchanged: skipped
        await writer.waitUntilIdle()
        let sent = await api.sentSummaries
        XCTAssertEqual(sent.count, 2)
    }

    /// The screen reads problem and lastAppliedAt; both redraw it on a sign-out and on a
    /// switch of accounts, though the sign-in itself isn't something Observation sees (spec §12.4).
    func test_problemAndLastAppliedAt_redrawTheScreen_onASignOutAndASwitch() async {
        scheduleOwner = nil
        let writer = makeWriter()
        writer.submit(Examples.layover.status)
        await writer.waitUntilIdle()
        let redraws = Redraws()
        func watch() {
            withObservationTracking {
                _ = writer.problem
                _ = writer.lastAppliedAt
            } onChange: { redraws.count += 1 }
        }
        watch()
        signedInAs = nil
        store.accountChanged()
        XCTAssertEqual(redraws.count, 1, "signing out")
        XCTAssertNil(writer.lastAppliedAt)
        watch()
        signedInAs = account
        store.accountChanged()
        XCTAssertEqual(redraws.count, 2, "signing back in")
        XCTAssertNotNil(writer.lastAppliedAt)
        watch()
        switchToSecondAccount()
        XCTAssertEqual(redraws.count, 3, "switching")
        XCTAssertNil(writer.lastAppliedAt, "PILOT-2 hasn't written")
    }
}

/// Counts Observation's change calls, which may come from any thread.
private final class Redraws: @unchecked Sendable {
    var count = 0
}
```

- [ ] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 63 tests, with 3 failures`: `test_aForcedSummaryThatCantReachCrewluCloud_staysOwed` (`("2") is not equal to ("3")`) and two in `test_anExpiredSignIn_isReportedToThePartnerList_andAWorkingAnswerClearsIt`. The other two new tests pass already: one checks that nothing leaks between accounts, and Task 3 made the redraws work.

- [ ] **Step 3: Change the writer**

The header, the `Problem` enum without `.signInExpired`, the owed accounts, `submit` forcing an owed summary, and `send`.

6 replacements, in order, in `Duty/Utils/PartnerCloud/PartnerSummaryCloudWriter.swift`:

In `Duty/Utils/PartnerCloud/PartnerSummaryCloudWriter.swift`, replace:

```swift
//  Sends the partner summary to Crewlu Cloud (spec §5.2), next to the iCloud
//  record. PartnerBeaconAutoSync hands over every summary it makes; this writer
//  decides whether to send it. One write at a time: a summary that arrives
//  meanwhile waits, and a newer one replaces it.
//

import Foundation
```

with:

```swift
//  Sends the partner summary to Crewlu Cloud (spec §5.2), next to the iCloud
//  record. PartnerBeaconAutoSync hands over every summary it makes; this writer
//  decides whether to send it. One write at a time: a summary that arrives
//  meanwhile waits, and a newer one replaces it. What Crewlu Cloud says about
//  the sign-in goes to PartnerCloudStore, which the screens read.
//

import Foundation
```

In `Duty/Utils/PartnerCloud/PartnerSummaryCloudWriter.swift`, replace:

```swift
    enum Problem: Equatable {
        /// A newer CrewLu on another of the pilot's devices wrote the summary (`applied: false`).
        case newerBuild
        /// Crewlu Cloud needs the pilot to sign in again.
        case signInExpired
    }

    /// What the Partner Sharing screen should mention, for the account signed in now.
```

with:

```swift
    enum Problem: Equatable {
        /// A newer CrewLu on another of the pilot's devices wrote the summary (`applied: false`).
        case newerBuild
    }

    /// What the Partner Sharing screen should mention, for the account signed in now.
```

In `Duty/Utils/PartnerCloud/PartnerSummaryCloudWriter.swift`, replace:

```swift
    /// last one it refused. Kept apart from the iCloud writer's.
    @ObservationIgnored private var lastApplied: [String: Applied] = [:]
    @ObservationIgnored private var lastRefused: [String: Data] = [:]

    init(api: any PartnerCloudAPI,
         store: PartnerCloudStore,
```

with:

```swift
    /// last one it refused. Kept apart from the iCloud writer's.
    @ObservationIgnored private var lastApplied: [String: Applied] = [:]
    @ObservationIgnored private var lastRefused: [String: Data] = [:]
    /// Accounts whose forced summary didn't reach Crewlu Cloud: their next summary is forced
    /// too, so Update Status Now isn't lost to a dropped connection (spec §12.4).
    @ObservationIgnored private var owesForcedWrite: Set<String> = []

    init(api: any PartnerCloudAPI,
         store: PartnerCloudStore,
```

In `Duty/Utils/PartnerCloud/PartnerSummaryCloudWriter.swift`, replace:

```swift
        }
        // A newer summary replaces one still waiting, and stays forced if that one was.
        waiting = Pending(account: account.id, partnerIDs: account.partnerIDs, output: output,
                          force: force || waiting?.force == true)
        if drainTask == nil {
            drainTask = Task { await drain() }
        }
```

with:

```swift
        }
        // A newer summary replaces one still waiting, and stays forced if that one was.
        waiting = Pending(account: account.id, partnerIDs: account.partnerIDs, output: output,
                          force: force || waiting?.force == true || owesForcedWrite.contains(account.id))
        if drainTask == nil {
            drainTask = Task { await drain() }
        }
```

In `Duty/Utils/PartnerCloud/PartnerSummaryCloudWriter.swift`, replace:

```swift

    private func send(_ pending: Pending) async {
        do {
            if try await api.setStatus(pending.output.json, build: build) {
                lastApplied[pending.account] = Applied(comparisonKey: pending.output.comparisonKey,
                                                       partnerIDs: pending.partnerIDs)
                record(nil, applied: true, for: pending.account)
```

with:

```swift

    private func send(_ pending: Pending) async {
        do {
            let applied = try await api.setStatus(pending.output.json, build: build)
            owesForcedWrite.remove(pending.account)
            store.noteSignIn(expired: false, for: pending.account)
            if applied {
                lastApplied[pending.account] = Applied(comparisonKey: pending.output.comparisonKey,
                                                       partnerIDs: pending.partnerIDs)
                record(nil, applied: true, for: pending.account)
```

In `Duty/Utils/PartnerCloud/PartnerSummaryCloudWriter.swift`, replace:

```swift
                record(.newerBuild, applied: false, for: pending.account)
            }
        } catch {
            switch error as? PartnerCloudError ?? .unavailable {
            case .notSignedIn:
                record(.signInExpired, applied: false, for: pending.account)
            case .refused(let code):
                lastRefused[pending.account] = pending.output.comparisonKey
                debugLog("[PartnerCloud] Crewlu Cloud refused the summary (\(code)); it won't be sent again")
            case .unavailable:
```

with:

```swift
                record(.newerBuild, applied: false, for: pending.account)
            }
        } catch {
            let error = error as? PartnerCloudError ?? .unavailable
            if pending.force, error == .unavailable || error == .notSignedIn {
                owesForcedWrite.insert(pending.account)
            }
            switch error {
            case .notSignedIn:
                store.noteSignIn(expired: true, for: pending.account)
            case .refused(let code):
                owesForcedWrite.remove(pending.account)
                store.noteSignIn(expired: false, for: pending.account)
                lastRefused[pending.account] = pending.output.comparisonKey
                debugLog("[PartnerCloud] Crewlu Cloud refused the summary (\(code)); it won't be sent again")
            case .unavailable:
```

- [ ] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 63 tests, with 0 failures`.

- [ ] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerSummaryCloudWriter.swift DutyTests/PartnerSummaryCloudWriterTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): a forced summary that can't reach Crewlu Cloud stays owed; the writer reports the sign-in to the partner list" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 5: The per-person settings

**Files:**
- Modify: `Duty/Utils/PartnerCloud/PartnerSettings.swift`
- Test: `DutyTests/PartnerSettingsTests.swift`

Removing a Crewlu Cloud partner forgets their settings (decision 11), and the iCloud clean-ups get one place that says which keys are theirs to clear: only the nicknames (decision 10, used by Task 9).

- [ ] **Step 1: Write the failing tests**

One replacement in `DutyTests/PartnerSettingsTests.swift`:

In `DutyTests/PartnerSettingsTests.swift`, replace:

```swift
        XCTAssertTrue(settings.quickStatusByPartner.isEmpty)
        XCTAssertTrue(settings.displayNameByPartner.isEmpty)
    }
}
```

with:

```swift
        XCTAssertTrue(settings.quickStatusByPartner.isEmpty)
        XCTAssertTrue(settings.displayNameByPartner.isEmpty)
    }

    // MARK: - Removing someone, and the end of the iCloud share (plan 2b)

    private let a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    private let b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

    private func save(statuses: [String: PartnerQuickStatusEntry], names: [String: String]) throws {
        defaults.set(try JSONEncoder().encode(statuses), forKey: PartnerSettings.quickStatusKey)
        defaults.set(try JSONEncoder().encode(names), forKey: PartnerSettings.displayNameKey)
    }

    /// Removing someone forgets what was kept for them, and nobody else's.
    func test_forget_dropsOnePersonsSettings() throws {
        let sleeping = PartnerQuickStatusEntry(status: "Sleeping", icon: "moon.zzz.fill", expiry: nil)
        let callMe = PartnerQuickStatusEntry(status: "Call Me", icon: "phone.fill", expiry: nil)
        try save(statuses: [a: sleeping, b: callMe, PartnerSettings.everyoneKey: callMe],
                 names: [a: "Dad", b: "Alex"])
        defaults.set(true, forKey: PartnerSettings.isSleepingKey)

        PartnerSettings.forget(a, in: defaults)
        let settings = PartnerSettings.load(from: defaults)
        XCTAssertEqual(Set(settings.quickStatusByPartner.keys), [b, PartnerSettings.everyoneKey])
        XCTAssertEqual(settings.displayNameByPartner, [b: "Alex"])
        XCTAssertFalse(defaults.bool(forKey: PartnerSettings.isSleepingKey), "no one is told Sleeping now")
    }

    func test_forgettingTheLastOne_leavesNoEmptyMaps() throws {
        let callMe = PartnerQuickStatusEntry(status: "Call Me", icon: "phone.fill", expiry: nil)
        try save(statuses: [a: callMe], names: [a: "Dad"])
        PartnerSettings.forget(a, in: defaults)
        XCTAssertNil(defaults.data(forKey: PartnerSettings.quickStatusKey))
        XCTAssertNil(defaults.data(forKey: PartnerSettings.displayNameKey))
    }

    /// Settings that can't be read aren't overwritten by forgetting someone who isn't in them.
    func test_forget_leavesUnreadableSettingsAlone() {
        let unreadable = Data("not json".utf8)
        defaults.set(unreadable, forKey: PartnerSettings.quickStatusKey)
        PartnerSettings.forget(a, in: defaults)
        XCTAssertEqual(defaults.data(forKey: PartnerSettings.quickStatusKey), unreadable)
    }

    /// When the iCloud share ends, or a device finds it gone, only what iCloud sharing alone used
    /// is cleared: the nicknames. The per-person settings stay, because Crewlu Cloud partners'
    /// settings live in the same keys, and the clean-up reaches every device (spec §12.4).
    @MainActor func test_theICloudCleanUp_clearsTheNicknames_neverThePerPersonSettings() throws {
        let callMe = PartnerQuickStatusEntry(status: "Call Me", icon: "phone.fill", expiry: nil)
        try save(statuses: [a: callMe], names: [a: "Dad"])
        defaults.set(["_icloud1": "Mom"], forKey: PartnerSettings.nicknamesKey)
        defaults.set("Mom", forKey: PartnerSettings.nicknameKeyPrefix + "_icloud1")
        defaults.set([a], forKey: PartnerCloudStore.savedIDsKeyPrefix + "PILOT-1")

        XCTAssertEqual(PartnerSettings.iCloudNicknameKeys(in: defaults),
                       [PartnerSettings.nicknameKeyPrefix + "_icloud1", PartnerSettings.nicknamesKey])
    }
}
```

- [ ] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails, with errors such as `type 'PartnerSettings' has no member 'isSleepingKey'`.

- [ ] **Step 3: Write forgetting, and the iCloud clean-up's keys**

3 replacements, in order, in `Duty/Utils/PartnerCloud/PartnerSettings.swift`:

In `Duty/Utils/PartnerCloud/PartnerSettings.swift`, replace:

```swift
//  The per-person partner settings (spec §6.6): a quick status, and the name the
//  partner sees the pilot as. They stay in today's keys, synced across the pilot's
//  devices by PartnerDataKVSync, and are keyed by cloud id for Crewlu Cloud
//  partners. The partner screens add writing; the move-over adds the lookup by
//  iCloud id for people who moved over.
//

import Foundation
```

with:

```swift
//  The per-person partner settings (spec §6.6): a quick status, and the name the
//  partner sees the pilot as. They stay in today's keys, synced across the pilot's
//  devices by PartnerDataKVSync, and are keyed by cloud id for Crewlu Cloud
//  partners. The quick status sheet writes them; removing a partner forgets
//  theirs. The move-over adds the lookup by iCloud id for people who moved over.
//

import Foundation
```

In `Duty/Utils/PartnerCloud/PartnerSettings.swift`, replace:

```swift
    /// The quick status sheet's key for a status sent to everyone (Send To with every partner picked).
    static let everyoneKey = "__everyone__"

    /// The saved settings. One that can't be read counts as none.
    static func load(from defaults: UserDefaults = .standard) -> PartnerCloudSettings {
        // Saved with the default JSONEncoder (PartnerQuickStatusSheet), so the default
```

with:

```swift
    /// The quick status sheet's key for a status sent to everyone (Send To with every partner picked).
    static let everyoneKey = "__everyone__"

    /// Kept beside the quick statuses for older readers: someone is told "Sleeping".
    static let isSleepingKey = "partnerBeacon.isSleeping"
    /// iCloud partners' nicknames: one map, and one key per partner for older readers.
    /// Crewlu Cloud partners' names live on Crewlu Cloud (`partners.name`) instead.
    static let nicknamesKey = "partnerNicknames"
    static let nicknameKeyPrefix = "partnerNickname."

    /// The saved settings. One that can't be read counts as none.
    static func load(from defaults: UserDefaults = .standard) -> PartnerCloudSettings {
        // Saved with the default JSONEncoder (PartnerQuickStatusSheet), so the default
```

In `Duty/Utils/PartnerCloud/PartnerSettings.swift`, replace:

```swift
                .flatMap { try? decoder.decode([String: String].self, from: $0) } ?? [:]
        )
    }
}
```

with:

```swift
                .flatMap { try? decoder.decode([String: String].self, from: $0) } ?? [:]
        )
    }

    /// Forgets what was kept for one person: their quick status and the name they see the pilot
    /// as. Removing a Crewlu Cloud partner calls it; the caller syncs it to the pilot's devices.
    static func forget(_ id: String, in defaults: UserDefaults = .standard) {
        var settings = load(from: defaults)
        if settings.quickStatusByPartner.removeValue(forKey: id) != nil {
            save(settings.quickStatusByPartner, forKey: quickStatusKey, in: defaults)
            defaults.set(settings.quickStatusByPartner.values.contains { $0.status == "Sleeping" },
                         forKey: isSleepingKey)
        }
        if settings.displayNameByPartner.removeValue(forKey: id) != nil {
            save(settings.displayNameByPartner, forKey: displayNameKey, in: defaults)
        }
    }

    /// The keys iCloud sharing alone uses: the nicknames. Ending the iCloud share, or finding it
    /// gone, clears these and never the per-person settings, which Crewlu Cloud partners share.
    static func iCloudNicknameKeys(in defaults: UserDefaults = .standard) -> [String] {
        defaults.dictionaryRepresentation().keys
            .filter { $0 == nicknamesKey || $0.hasPrefix(nicknameKeyPrefix) }
            .sorted()
    }

    /// Saved as PartnerQuickStatusSheet saves them; an empty map isn't kept.
    private static func save<Value: Encodable>(_ map: [String: Value], forKey key: String, in defaults: UserDefaults) {
        if map.isEmpty {
            defaults.removeObject(forKey: key)
        } else if let data = try? JSONEncoder().encode(map) {
            defaults.set(data, forKey: key)
        }
    }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 67 tests, with 0 failures`.

- [ ] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerSettings.swift DutyTests/PartnerSettingsTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): forget a removed partner's settings; the iCloud clean-ups clear only the nicknames" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 6: The list's rows

**Files:**
- Create: `Duty/Utils/PartnerCloud/PartnerList.swift`
- Test: `DutyTests/PartnerListTests.swift`

The Crewlu Cloud list's rules, pure (spec §6.2, decision 8): the rows and their kinds, the tags, which rows open a page, the device and "seen" lines, and the hero's "Sharing Active" and "Updated … ago".

- [ ] **Step 1: Write the failing tests**

File: `DutyTests/PartnerListTests.swift`

```swift
//
//  PartnerListTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §6.2, §8.1): the rows of Partner Sharing's list
//  on Crewlu Cloud, their tags and wording, and the hero's "Sharing Active".
//

import XCTest
@testable import Duty

final class PartnerListTests: XCTestCase {
    private let a = PartnerSummaryExamples.partnerA
    private let b = PartnerSummaryExamples.partnerB
    private let c = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
    /// 2026-10-21 14:00 in New York.
    private let now = Date(timeIntervalSince1970: 1_792_605_600)
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/New_York")!
        return calendar
    }

    private func partner(_ id: String, _ name: String, created: TimeInterval = 0) -> PartnerCloudPartner {
        PartnerCloudPartner(id: id, name: name, inviteToken: "invite-\(name)",
                            createdAt: Date(timeIntervalSince1970: 1_792_000_000 + created))
    }

    private func device(_ id: String, of partner: String, kind: String = "app", seen: Date?) -> PartnerCloudDevice {
        PartnerCloudDevice(id: id, partnerID: partner, kind: kind, label: "\(id)'s phone",
                           createdAt: nil, lastSeenAt: seen)
    }

    func test_rows_comeInTheDesignsOrder_oldestFirstInEachGroup() {
        let label = PendingPartnerInvite(name: "Grandpa", sentAt: now.addingTimeInterval(-3600))
        let rows = PartnerList.rows(
            partners: [partner(c, "Dad", created: 1), partner(a, "Sarah", created: 2), partner(b, "Jake", created: 3)],
            devices: [device("d1", of: a, seen: now), device("d2", of: b, kind: "web", seen: now)],
            iCloudPeople: [PartnerList.ICloudPerson(id: "_mom", name: "Mom")],
            pendingLabels: [label])
        XCTAssertEqual(rows.map(\.name), ["Sarah", "Jake", "Mom", "Dad", "Grandpa"])
        XCTAssertEqual(rows.map(\.id), [a, b, "_mom", c, label.id.uuidString])
    }

    /// Pending invites from before the update come oldest first, however they're handed over.
    func test_pendingInvitesFromBeforeTheUpdate_oldestFirst() {
        let older = PendingPartnerInvite(name: "Grandpa", sentAt: now.addingTimeInterval(-7200))
        let newer = PendingPartnerInvite(name: "Aunt Jo", sentAt: now.addingTimeInterval(-3600))
        let rows = PartnerList.rows(partners: [], devices: [], iCloudPeople: [], pendingLabels: [newer, older])
        XCTAssertEqual(rows.map(\.name), ["Grandpa", "Aunt Jo"])
    }

    func test_eachRowsKind() {
        let sent = now.addingTimeInterval(-7200)
        let label = PendingPartnerInvite(name: "Grandpa", sentAt: sent)
        let rows = PartnerList.rows(
            partners: [partner(a, "Sarah"), partner(c, "Dad")],
            devices: [device("d1", of: a, seen: now.addingTimeInterval(-86_400 * 3)),
                      device("d2", of: a, kind: "web", seen: now.addingTimeInterval(-60))],
            iCloudPeople: [PartnerList.ICloudPerson(id: "_mom", name: "Mom")],
            pendingLabels: [label])
        XCTAssertEqual(rows.map(\.kind), [
            .connected(devices: 2, lastSeen: now.addingTimeInterval(-60)),
            .stillOnICloud,
            .notOpenedYet(sentAt: partner(c, "Dad").createdAt),
            .sentBeforeUpdate(sentAt: sent),
        ])
    }

    /// Only the "Needs Crewluve update" row and the two pending kinds carry a tag (spec §6.2, P2-2).
    func test_tags() {
        XCTAssertNil(PartnerListRow.Kind.connected(devices: 1, lastSeen: nil).tag)
        XCTAssertEqual(PartnerListRow.Kind.stillOnICloud.tag, "Needs Crewluve update")
        XCTAssertEqual(PartnerListRow.Kind.notOpenedYet(sentAt: nil).tag, "Pending invite")
        XCTAssertEqual(PartnerListRow.Kind.sentBeforeUpdate(sentAt: now).tag, "Pending invite")
    }

    /// Rows that open the partner page, and the pending invites sent before the update, which don't.
    func test_onlyPendingInvitesFromBeforeTheUpdate_dontOpenThePartnerPage() {
        XCTAssertTrue(PartnerListRow.Kind.connected(devices: 1, lastSeen: nil).opensPartnerPage)
        XCTAssertTrue(PartnerListRow.Kind.stillOnICloud.opensPartnerPage)
        XCTAssertTrue(PartnerListRow.Kind.notOpenedYet(sentAt: nil).opensPartnerPage)
        XCTAssertFalse(PartnerListRow.Kind.sentBeforeUpdate(sentAt: now).opensPartnerPage)
    }

    func test_devicesLine() {
        XCTAssertEqual(PartnerList.devicesLine(count: 1, lastSeen: now, now: now, calendar: calendar),
                       "1 device · seen today")
        XCTAssertEqual(PartnerList.devicesLine(count: 2, lastSeen: now.addingTimeInterval(-86_400), now: now,
                                               calendar: calendar),
                       "2 devices · seen yesterday")
        XCTAssertEqual(PartnerList.devicesLine(count: 3, lastSeen: nil, now: now, calendar: calendar),
                       "3 devices")
    }

    /// "Seen" goes by calendar day in local time, not by 24-hour periods.
    func test_seen_goesByCalendarDay() {
        let todayAt1AM = now.addingTimeInterval(-13 * 3600)          // 01:00
        let yesterdayAt11PM = now.addingTimeInterval(-15 * 3600)     // 23:00 the day before
        let threeDaysAgo = now.addingTimeInterval(-3 * 86_400)
        XCTAssertEqual(PartnerList.seen(todayAt1AM, now: now, calendar: calendar), "seen today")
        XCTAssertEqual(PartnerList.seen(yesterdayAt11PM, now: now, calendar: calendar), "seen yesterday")
        XCTAssertEqual(PartnerList.seen(threeDaysAgo, now: now, calendar: calendar), "seen 3 days ago")
        XCTAssertEqual(PartnerList.seen(now.addingTimeInterval(600), now: now, calendar: calendar), "seen today",
                       "a clock a little ahead")
    }

    func test_aDevicesKind() {
        XCTAssertEqual(PartnerList.deviceKindLine(kind: "app", lastSeen: now, now: now, calendar: calendar),
                       "Crewluve · seen today")
        XCTAssertEqual(PartnerList.deviceKindLine(kind: "web", lastSeen: now.addingTimeInterval(-2 * 86_400),
                                                  now: now, calendar: calendar),
                       "Website · seen 2 days ago")
        XCTAssertEqual(PartnerList.deviceKindLine(kind: "web", lastSeen: nil, now: now, calendar: calendar),
                       "Website")
    }

    /// The hero: "Sharing Active" with a Crewlu Cloud partner or an iCloud share, and "Updated … ago"
    /// from the later of the two writes.
    func test_theHero() {
        XCTAssertFalse(PartnerList.isSharingActive(cloudPartners: 0, iCloudSharing: false))
        XCTAssertTrue(PartnerList.isSharingActive(cloudPartners: 1, iCloudSharing: false))
        XCTAssertTrue(PartnerList.isSharingActive(cloudPartners: 0, iCloudSharing: true))
        let earlier = now.addingTimeInterval(-60)
        XCTAssertEqual(PartnerList.lastUpdated(cloud: now, iCloud: earlier), now)
        XCTAssertEqual(PartnerList.lastUpdated(cloud: earlier, iCloud: now), now)
        XCTAssertEqual(PartnerList.lastUpdated(cloud: nil, iCloud: earlier), earlier)
        XCTAssertNil(PartnerList.lastUpdated(cloud: nil, iCloud: nil))
    }
}
```

- [ ] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `cannot find 'PartnerList' in scope` (or `cannot find type 'PartnerListRow' in scope`, depending on which use the compiler reaches first).

- [ ] **Step 3: Write the rows**

File: `Duty/Utils/PartnerCloud/PartnerList.swift`

```swift
//
//  PartnerList.swift
//  Duty
//
//  The rows of Partner Sharing's list on Crewlu Cloud (spec §6.2), and their
//  wording. Pure: the screen passes in what it has, so the rules are tested
//  without a screen.
//

import Foundation

/// One row of the Shared With list.
struct PartnerListRow: Identifiable, Equatable {
    enum Kind: Equatable {
        /// A Crewlu Cloud partner with at least one device.
        case connected(devices: Int, lastSeen: Date?)
        /// Someone connected through iCloud, on an older Crewluve (P2-2).
        case stillOnICloud
        /// A Crewlu Cloud partner who hasn't opened their link yet. `sentAt` is when the invite was made.
        case notOpenedYet(sentAt: Date?)
        /// A pending invite sent through iCloud before the update, kept on this device for 14 days.
        case sentBeforeUpdate(sentAt: Date)

        /// The orange tag beside the name.
        var tag: String? {
            switch self {
            case .connected: return nil
            case .stillOnICloud: return "Needs Crewluve update"
            case .notOpenedYet, .sentBeforeUpdate: return "Pending invite"
            }
        }

        /// Tapping the row opens the partner page; a pending invite from before the update
        /// has no page, as today.
        var opensPartnerPage: Bool {
            if case .sentBeforeUpdate = self { return false }
            return true
        }
    }

    /// A Crewlu Cloud id, an iCloud id, or a pending invite's id.
    let id: String
    let name: String
    let kind: Kind
}

enum PartnerList {
    /// Someone sharing through iCloud: an accepted participant of the iCloud share.
    struct ICloudPerson: Equatable {
        let id: String
        let name: String
    }

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
        return connected + onICloud + notOpened + labels
    }

    /// A connected row's second line: "1 device · seen today", "2 devices · seen 3 days ago".
    static func devicesLine(count: Int, lastSeen: Date?, now: Date, calendar: Calendar) -> String {
        let devices = count == 1 ? "1 device" : "\(count) devices"
        guard let lastSeen else { return devices }
        return "\(devices) · \(seen(lastSeen, now: now, calendar: calendar))"
    }

    /// A device's line on the partner page: "Crewluve · seen today", "Website · seen 2 days ago".
    static func deviceKindLine(kind: String, lastSeen: Date?, now: Date, calendar: Calendar) -> String {
        let app = kind == "app" ? "Crewluve" : "Website"
        guard let lastSeen else { return app }
        return "\(app) · \(seen(lastSeen, now: now, calendar: calendar))"
    }

    /// "seen today", "seen yesterday", "seen 3 days ago": by calendar day in `calendar`'s time
    /// zone, so 11 PM yesterday is yesterday. A time ahead of `now` counts as today.
    static func seen(_ date: Date, now: Date, calendar: Calendar) -> String {
        let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: date),
                                           to: calendar.startOfDay(for: now)).day ?? 0
        switch days {
        case ...0: return "seen today"
        case 1: return "seen yesterday"
        default: return "seen \(days) days ago"
        }
    }

    /// The hero says "Sharing Active" while there's a Crewlu Cloud partner or an iCloud share.
    static func isSharingActive(cloudPartners: Int, iCloudSharing: Bool) -> Bool {
        cloudPartners > 0 || iCloudSharing
    }

    /// "Updated … ago" counts from the later of the last applied Crewlu Cloud write and the
    /// last iCloud write.
    static func lastUpdated(cloud: Date?, iCloud: Date?) -> Date? {
        [cloud, iCloud].compactMap { $0 }.max()
    }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 76 tests, with 0 failures`.

- [ ] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerList.swift DutyTests/PartnerListTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): PartnerList, the Crewlu Cloud list's rows and their wording" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 7: Which screen, and what it says

**Files:**
- Create: `Duty/Utils/PartnerCloud/PartnerSharingScreen.swift`
- Test: `DutyTests/PartnerSharingScreenTests.swift`

Spec §6.1's table as a function (decision 9), the prompt's words, and what a failed invite or action says (§6.3, §6.4).

- [ ] **Step 1: Write the failing tests**

File: `DutyTests/PartnerSharingScreenTests.swift`

```swift
//
//  PartnerSharingScreenTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §6.1, §6.3, §6.4): which Partner Sharing screen
//  shows, the sign-in prompt's words, and what a failed call says.
//

import XCTest
@testable import Duty

final class PartnerSharingScreenTests: XCTestCase {
    private func screen(signedIn: Bool = true, expired: Bool = false, ours: Bool = true,
                        iCloud: Bool = false) -> PartnerSharingScreen {
        PartnerSharingScreen.make(isSignedIn: signedIn, signInExpired: expired,
                                  scheduleIsTheAccounts: ours, iCloudSharing: iCloud)
    }

    func test_signedIn_withThisPhonesSchedule_isTheCrewluCloudScreen() {
        XCTAssertEqual(screen(), .crewluCloud)
        XCTAssertEqual(screen(iCloud: true), .crewluCloud, "an iCloud share shows inside it")
    }

    func test_everyOtherState_isAPrompt() {
        XCTAssertEqual(screen(ours: false), .prompt(.otherAccountsSchedule))
        XCTAssertEqual(screen(expired: true), .prompt(.signInExpired))
        XCTAssertEqual(screen(expired: true, ours: false), .prompt(.signInExpired), "signing in again comes first")
        XCTAssertEqual(screen(signedIn: false, iCloud: true), .prompt(.signInToKeepSharing))
        XCTAssertEqual(screen(signedIn: false), .prompt(.signInToStart))
        XCTAssertEqual(screen(signedIn: false, expired: true), .prompt(.signInToStart), "signed out on purpose")
    }

    func test_thePromptsWords() {
        let other = PartnerSharingPrompt.otherAccountsSchedule
        XCTAssertEqual(other.title, "This phone's schedule belongs to a different Crewlu Cloud account.")
        XCTAssertNil(other.detail)
        XCTAssertEqual(other.button, "See Your Options")

        let expired = PartnerSharingPrompt.signInExpired
        XCTAssertEqual(expired.title, "Your Crewlu Cloud sign-in expired.")
        XCTAssertEqual(expired.detail, "Sign in again to keep sharing.")
        XCTAssertEqual(expired.button, "Sign In")

        let keep = PartnerSharingPrompt.signInToKeepSharing
        XCTAssertEqual(keep.title, "Partner Sharing now uses Crewlu Cloud.")
        XCTAssertEqual(keep.detail, "Sign in to keep sharing.")
        XCTAssertEqual(keep.button, "Sign In")

        let start = PartnerSharingPrompt.signInToStart
        XCTAssertEqual(start.title, "Partner Sharing uses Crewlu Cloud.")
        XCTAssertEqual(start.detail, "Sign in to start sharing.")
        XCTAssertEqual(start.button, "Sign In")
    }

    /// Below a prompt, today's screen shows while an iCloud share exists, without inviting.
    func test_belowAPrompt_todaysScreenShows_onlyWithAnICloudShare() {
        XCTAssertTrue(PartnerSharingScreen.prompt(.signInToKeepSharing).showsICloudSharing(iCloudSharing: true))
        XCTAssertFalse(PartnerSharingScreen.prompt(.signInToStart).showsICloudSharing(iCloudSharing: false))
        XCTAssertTrue(PartnerSharingScreen.prompt(.otherAccountsSchedule).showsICloudSharing(iCloudSharing: true))
        XCTAssertFalse(PartnerSharingScreen.crewluCloud.showsICloudSharing(iCloudSharing: true),
                       "the Crewlu Cloud screen lists iCloud partners in its own list")
    }

    func test_whatAFailedInviteSays() {
        XCTAssertEqual(PartnerCloudError.unavailable.inviteMessage,
                       "Couldn't create the invite. Check your connection and try again.")
        XCTAssertEqual(PartnerCloudError.refused(code: "PT409").inviteMessage,
                       "You can share with up to 25 people. Remove someone to invite another.")
        XCTAssertEqual(PartnerCloudError.notSignedIn.inviteMessage,
                       "Your Crewlu Cloud sign-in expired. Sign in again to keep sharing.")
        XCTAssertEqual(PartnerCloudError.refused(code: "22023").inviteMessage,
                       "Couldn't create the invite. Try again later.")
    }

    /// PT404: someone another device removed. The page goes back to the list instead of saying anything.
    func test_whatAFailedActionSays() {
        XCTAssertEqual(PartnerCloudError.unavailable.actionMessage,
                       "Couldn't reach Crewlu Cloud. Check your connection and try again.")
        XCTAssertNil(PartnerCloudError.refused(code: "PT404").actionMessage)
        XCTAssertEqual(PartnerCloudError.notSignedIn.actionMessage,
                       "Your Crewlu Cloud sign-in expired. Sign in again to keep sharing.")
        XCTAssertEqual(PartnerCloudError.refused(code: "22023").actionMessage,
                       "Crewlu Cloud couldn't do that. Try again later.")
    }
}
```

- [ ] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `cannot find 'PartnerSharingScreen' in scope`, `cannot find type 'PartnerSharingScreen' in scope`, or the same for `PartnerSharingPrompt`, and `type 'PartnerCloudError' has no member 'inviteMessage'`.

- [ ] **Step 3: Write it**

File: `Duty/Utils/PartnerCloud/PartnerSharingScreen.swift`

```swift
//
//  PartnerSharingScreen.swift
//  Duty
//
//  What Partner Sharing shows and says (spec §6.1, §6.3, §6.4): which screen,
//  the sign-in prompt's words, and what a failed Crewlu Cloud call says. Pure,
//  so it's tested without a screen. The whole screen still needs Pro first.
//

import Foundation

/// Which Partner Sharing screen shows, after the Pro check.
enum PartnerSharingScreen: Equatable {
    /// Signed in, and the schedule on this phone is the account's.
    case crewluCloud
    /// A prompt, with today's screen minus inviting below it while an iCloud share exists.
    case prompt(PartnerSharingPrompt)

    static func make(isSignedIn: Bool, signInExpired: Bool, scheduleIsTheAccounts: Bool,
                     iCloudSharing: Bool) -> PartnerSharingScreen {
        guard isSignedIn else { return .prompt(iCloudSharing ? .signInToKeepSharing : .signInToStart) }
        if signInExpired { return .prompt(.signInExpired) }
        if !scheduleIsTheAccounts { return .prompt(.otherAccountsSchedule) }
        return .crewluCloud
    }

    /// Today's iCloud screen shows below a prompt while an iCloud share exists. The Crewlu Cloud
    /// screen lists iCloud partners itself.
    func showsICloudSharing(iCloudSharing: Bool) -> Bool {
        guard case .prompt = self else { return false }
        return iCloudSharing
    }
}

/// The prompt at the top of Partner Sharing when it can't run on Crewlu Cloud. Its button
/// opens the Crewlu Cloud screen.
enum PartnerSharingPrompt: Equatable {
    case otherAccountsSchedule
    case signInExpired
    case signInToKeepSharing
    case signInToStart

    var title: String {
        switch self {
        case .otherAccountsSchedule: return "This phone's schedule belongs to a different Crewlu Cloud account."
        case .signInExpired: return "Your Crewlu Cloud sign-in expired."
        case .signInToKeepSharing: return "Partner Sharing now uses Crewlu Cloud."
        case .signInToStart: return "Partner Sharing uses Crewlu Cloud."
        }
    }

    var detail: String? {
        switch self {
        case .otherAccountsSchedule: return nil
        case .signInExpired: return "Sign in again to keep sharing."
        case .signInToKeepSharing: return "Sign in to keep sharing."
        case .signInToStart: return "Sign in to start sharing."
        }
    }

    var button: String {
        self == .otherAccountsSchedule ? "See Your Options" : "Sign In"
    }
}

extension PartnerCloudError {
    private static let signInExpiredMessage = "Your Crewlu Cloud sign-in expired. Sign in again to keep sharing."

    /// What the invite sheet says when it can't make the link (spec §6.4).
    var inviteMessage: String {
        switch self {
        case .unavailable: return "Couldn't create the invite. Check your connection and try again."
        case .refused(code: "PT409"): return "You can share with up to 25 people. Remove someone to invite another."
        case .notSignedIn: return Self.signInExpiredMessage
        case .refused: return "Couldn't create the invite. Try again later."
        }
    }

    /// What the partner page says when an action fails (spec §6.3). Nil for PT404, someone
    /// already removed from another device: the page goes back to the list instead.
    var actionMessage: String? {
        switch self {
        case .unavailable: return "Couldn't reach Crewlu Cloud. Check your connection and try again."
        case .refused(code: "PT404"): return nil
        case .notSignedIn: return Self.signInExpiredMessage
        case .refused: return "Crewlu Cloud couldn't do that. Try again later."
        }
    }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 82 tests, with 0 failures`.

- [ ] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerSharingScreen.swift DutyTests/PartnerSharingScreenTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): PartnerSharingScreen: which screen shows, the sign-in prompt's words, and what a failed call says" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 8: The invite link

**Files:**
- Create: `Duty/Utils/PartnerCloud/PartnerInviteLink.swift`
- Test: `DutyTests/PartnerInviteLinkTests.swift`

The invite sheet's logic (spec §6.4, decision 7): one reference per sheet, the same partner for every tap, a rename when the name changes.

- [ ] **Step 1: Write the failing tests**

File: `DutyTests/PartnerInviteLinkTests.swift`

```swift
//
//  PartnerInviteLinkTests.swift
//  DutyTests
//
//  Partner links, piece 2 (spec §6.4, §8.1): the invite sheet's link. One
//  partner per sheet, however many taps, renamed when the name changes.
//

import XCTest
@testable import Duty

@MainActor
final class PartnerInviteLinkTests: XCTestCase {
    private let suite = "PartnerInviteLinkTests"
    private var defaults: UserDefaults!
    private var api: StubPartnerCloudAPI!
    private var store: PartnerCloudStore!

    override func setUp() {
        super.setUp()
        defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        api = StubPartnerCloudAPI()
        store = PartnerCloudStore(api: api, currentUserID: { "PILOT-1" }, ownerAllows: { _ in true },
                                  defaults: defaults, partnersChanged: {})
        store.accountChanged()
    }

    private func actions() async -> [String] {
        await api.actions
    }

    func test_theFirstTap_makesThePartner_withTheSheetsReference() async throws {
        let invite = PartnerInviteLink(store: store, ref: "ref-1")
        let link = try await invite.link(for: "Dad")
        XCTAssertEqual(link.absoluteString, "https://crewluve.crewlu.net/join#t=token-ref-1")
        let sent = await actions()
        XCTAssertEqual(sent, ["create Dad ref-1"])
    }

    func test_eachSheet_hasItsOwnReference() {
        XCTAssertNotEqual(PartnerInviteLink(store: store).ref, PartnerInviteLink(store: store).ref)
    }

    /// The same reference gets the same partner, so Share then Copy makes one person, not two.
    func test_aRepeatTap_sendsTheSameReference_andRenamesOnlyWhenTheNameChanged() async throws {
        let invite = PartnerInviteLink(store: store, ref: "ref-1")
        _ = try await invite.link(for: "Dad")
        _ = try await invite.link(for: "Dad")
        let link = try await invite.link(for: "Pops")
        _ = try await invite.link(for: "Pops")
        XCTAssertEqual(link.absoluteString, "https://crewluve.crewlu.net/join#t=token-ref-1")
        let sent = await actions()
        XCTAssertEqual(sent, ["create Dad ref-1", "create Dad ref-1",
                              "create Pops ref-1", "rename partner-ref-1 Pops",
                              "create Pops ref-1"])
    }

    /// A tap that failed may still have made the partner, under its name: the next tap
    /// renames, so the partner ends up with the name on screen.
    func test_afterAFailedTap_theNextOneRenamesToo() async throws {
        let invite = PartnerInviteLink(store: store, ref: "ref-1")
        await api.failNext("create", with: .unavailable)
        do {
            _ = try await invite.link(for: "Dad")
            XCTFail("offline")
        } catch {
            XCTAssertEqual(error as? PartnerCloudError, .unavailable)
        }
        _ = try await invite.link(for: "Pops")
        let sent = await actions()
        XCTAssertEqual(sent, ["create Dad ref-1", "create Pops ref-1", "rename partner-ref-1 Pops"])
    }

    func test_aFailedRename_isTriedAgainOnTheNextTap() async throws {
        let invite = PartnerInviteLink(store: store, ref: "ref-1")
        _ = try await invite.link(for: "Dad")
        await api.failNext("rename", with: .unavailable)
        _ = try? await invite.link(for: "Pops")
        _ = try await invite.link(for: "Pops")
        let sent = await actions()
        XCTAssertEqual(sent, ["create Dad ref-1",
                              "create Pops ref-1", "rename partner-ref-1 Pops",
                              "create Pops ref-1", "rename partner-ref-1 Pops"])
    }

    /// A rename that failed may still have reached Crewlu Cloud, so going back to the first
    /// name renames too.
    func test_afterAFailedRename_goingBackToTheFirstNameRenamesToo() async throws {
        let invite = PartnerInviteLink(store: store, ref: "ref-1")
        _ = try await invite.link(for: "Dad")
        await api.failNext("rename", with: .unavailable)
        _ = try? await invite.link(for: "Pops")
        _ = try await invite.link(for: "Dad")
        let sent = await actions()
        XCTAssertEqual(sent, ["create Dad ref-1",
                              "create Pops ref-1", "rename partner-ref-1 Pops",
                              "create Dad ref-1", "rename partner-ref-1 Dad"])
    }

    /// The 25-person limit comes back as PT409, which the sheet words for the pilot.
    func test_theLimit_isPassedOn() async {
        let invite = PartnerInviteLink(store: store, ref: "ref-1")
        await api.failNext("create", with: .refused(code: "PT409"))
        do {
            _ = try await invite.link(for: "Dad")
            XCTFail("26th person")
        } catch {
            XCTAssertEqual((error as? PartnerCloudError)?.inviteMessage,
                           "You can share with up to 25 people. Remove someone to invite another.")
        }
    }

    /// Names are compared as Crewlu Cloud keeps them, trimmed: a stray space isn't a new name.
    func test_aNameThatOnlyDiffersInSpaces_isTheSameName() async throws {
        let invite = PartnerInviteLink(store: store, ref: "ref-1")
        _ = try await invite.link(for: "Dad")
        _ = try await invite.link(for: " Dad ")
        let sent = await actions()
        XCTAssertEqual(sent, ["create Dad ref-1", "create Dad ref-1"])
    }
}
```

- [ ] **Step 2: Run them to see them fail**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: the build fails: `cannot find 'PartnerInviteLink' in scope`.

- [ ] **Step 3: Write it**

File: `Duty/Utils/PartnerCloud/PartnerInviteLink.swift`

```swift
//
//  PartnerInviteLink.swift
//  Duty
//
//  The invite sheet's link (spec §6.4). The sheet makes one of these when it
//  opens, with a new reference: every tap sends that reference, so Share and
//  Copy, or a tap after a failed one, all get the same partner. A tap with a
//  changed name renames them.
//

import Foundation

@MainActor
final class PartnerInviteLink {
    /// Sent with every tap. Crewlu Cloud derives the partner's id from it.
    let ref: String
    private let store: PartnerCloudStore
    private var hasTapped = false
    /// The name Crewlu Cloud has for the partner, when that's certain: after a failed tap it
    /// isn't, because the call may have made the partner under that tap's name.
    private var nameOnCrewluCloud: String?

    init(store: PartnerCloudStore, ref: String = UUID().uuidString) {
        self.store = store
        self.ref = ref
    }

    /// The partner's invite link. The first tap makes the partner; a later one finds the same
    /// partner and renames them if the name changed. Throws `PartnerCloudError`.
    func link(for name: String) async throws -> URL {
        let name = PartnerCloudStore.cleanName(name)
        let isRepeat = hasTapped
        hasTapped = true
        do {
            let invite = try await store.invite(name: name, ref: ref)
            if isRepeat && nameOnCrewluCloud != name {
                try await store.rename(invite.id, to: name)
            }
            nameOnCrewluCloud = name
            return invite.link
        } catch {
            nameOnCrewluCloud = nil
            throw error
        }
    }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 90 tests, with 0 failures`.

- [ ] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerCloud/PartnerInviteLink.swift DutyTests/PartnerInviteLinkTests.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): PartnerInviteLink: one partner per invite sheet, renamed when the name changes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 9: The iCloud side keeps Crewlu Cloud partners' settings

**Files:**
- Modify: `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`

Spec §12.4's first item, and §7.5's last iCloud partner (decision 10). This is CloudKit code the harness can't build, so Task 14's compile, the review and the user's run check it; Task 5's test pins the keys it clears.

- [ ] **Step 1: Change the clean-ups, and add endICloudShare**

`removePartner` ends the share without wiping settings while Crewlu Cloud sharing is on; `stopSharing` shares its record deletion with the new `endICloudShare()`; and the self-heal and the clean-ups clear only what iCloud sharing alone uses.

5 replacements, in order, in `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`:

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
                currentShare = updatedShare
                refreshPartners(from: updatedShare)
                if partners.isEmpty {
                    await stopSharing()
                }
            }
            // Clear all per-partner local state. Otherwise a same-iCloud-account re-invite
```

with:

```swift
                currentShare = updatedShare
                refreshPartners(from: updatedShare)
                if partners.isEmpty {
                    // Crewlu Cloud partners keep their settings when the last iCloud one goes (spec §7.5).
                    if PartnerCloudStore.shared.isCloudSharing {
                        await endICloudShare()
                    } else {
                        await stopSharing()
                    }
                }
            }
            // Clear all per-partner local state. Otherwise a same-iCloud-account re-invite
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
    /// and prevents the stale share-reference from resurrecting sharing on next launch.
    func stopSharing() async {
        debugLog("[PartnerBeacon] 🛑 Stopping sharing...")

        // Collect record IDs to delete
        var recordIDsToDelete: [CKRecord.ID] = []
        if let share = currentShare {
            debugLog("[PartnerBeacon]   Will delete CKShare: \(share.recordID.recordName)")
            recordIDsToDelete.append(share.recordID)
        }
        let statusRecordID = CKRecord.ID(recordName: "pilot-status", zoneID: zoneID)
        recordIDsToDelete.append(statusRecordID)
        debugLog("[PartnerBeacon]   Will delete status record: \(statusRecordID.recordName)")

        // Clear local state immediately so the user is unblocked
        clearLocalSharingState()
```

with:

```swift
    /// and prevents the stale share-reference from resurrecting sharing on next launch.
    func stopSharing() async {
        debugLog("[PartnerBeacon] 🛑 Stopping sharing...")
        let recordIDsToDelete = shareAndStatusRecordIDs()

        // Clear local state immediately so the user is unblocked
        clearLocalSharingState()
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
        // the old custom name.
        await clearAllLocalPartnerState()

        do {
            _ = try await privateDatabase.modifyRecords(saving: [], deleting: recordIDsToDelete)
            debugLog("[PartnerBeacon] ✅ Sharing stopped — both records deleted")
        } catch {
            // Local state is already cleared. Server will be reconciled on next fetchExistingShare().
```

with:

```swift
        // the old custom name.
        await clearAllLocalPartnerState()

        await deleteRecords(recordIDsToDelete)
    }

    /// Ends the iCloud share while Crewlu Cloud sharing goes on (spec §7.3, §7.5): deletes the
    /// share and the status record, like stopSharing, but clears only what iCloud sharing alone
    /// used. The per-person settings stay: Crewlu Cloud partners' are in the same keys.
    func endICloudShare() async {
        debugLog("[PartnerBeacon] Ending the iCloud share; Crewlu Cloud sharing goes on")
        let recordIDsToDelete = shareAndStatusRecordIDs()
        clearLocalSharingState()
        await clearICloudOnlyPartnerState()
        await deleteRecords(recordIDsToDelete)
    }

    /// The CKShare, if there is one, and the pilot-status record.
    private func shareAndStatusRecordIDs() -> [CKRecord.ID] {
        var recordIDs: [CKRecord.ID] = []
        if let share = currentShare {
            debugLog("[PartnerBeacon]   Will delete CKShare: \(share.recordID.recordName)")
            recordIDs.append(share.recordID)
        }
        let statusRecordID = CKRecord.ID(recordName: "pilot-status", zoneID: zoneID)
        recordIDs.append(statusRecordID)
        debugLog("[PartnerBeacon]   Will delete status record: \(statusRecordID.recordName)")
        return recordIDs
    }

    private func deleteRecords(_ recordIDs: [CKRecord.ID]) async {
        do {
            _ = try await privateDatabase.modifyRecords(saving: [], deleting: recordIDs)
            debugLog("[PartnerBeacon] ✅ Sharing stopped — both records deleted")
        } catch {
            // Local state is already cleared. Server will be reconciled on next fetchExistingShare().
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
    }

    /// Runs after `fetchExistingShare()` confirms sharing is not active server-side.
    /// Wipes orphaned per-partner UserDefaults entries left over from a previous
    /// session — important because Xcode rebuilds preserve the app sandbox, so a
    /// pilot who stopped sharing on the *old* build (which left those entries behind)
    /// would otherwise carry "Magic man"-style labels into the next share. Skips
    /// the wipe when partner-keyed state is already empty, so the common case of
    /// "first ever launch with no share yet" is a true no-op.
    private func selfHealOrphanedPartnerState() async {
        let ud = UserDefaults.standard
        let hasPendingInvites = !(await PendingPartnerInvites.load()).isEmpty
        let hasOrphans =
            ud.dictionary(forKey: "partnerNicknames") != nil
            || ud.data(forKey: "crewluve.displayNameByPartner") != nil
            || ud.data(forKey: "crewluve.quickStatusByPartner") != nil
            || ud.dictionaryRepresentation().keys.contains { $0.hasPrefix(Self.nicknameKeyPrefix) }
            || hasPendingInvites
        guard hasOrphans else { return }
        debugLog("[PartnerBeacon] 🧹 Self-heal: clearing orphaned per-partner state (no active share)")
        await clearAllLocalPartnerState()
    }

    /// Wipes every per-partner UserDefaults entry. Called from `stopSharing` because
```

with:

```swift
    }

    /// Runs after `fetchExistingShare()` confirms sharing is not active server-side.
    /// Wipes orphaned iCloud partner state left over from a previous session: the
    /// nicknames and the pending invites, whose links no longer work. Skips the wipe
    /// when there's none, so the common case of "first ever launch with no share
    /// yet" is a true no-op. The per-person settings stay (spec §12.4): Crewlu Cloud
    /// partners' are in the same keys, and this runs on each of the pilot's devices,
    /// which the wipe reaches through iCloud key-value sync.
    private func selfHealOrphanedPartnerState() async {
        let hasPendingInvites = !(await PendingPartnerInvites.load()).isEmpty
        let hasOrphans = !PartnerSettings.iCloudNicknameKeys().isEmpty || hasPendingInvites
        guard hasOrphans else { return }
        debugLog("[PartnerBeacon] 🧹 Self-heal: clearing orphaned iCloud partner state (no active share)")
        await clearICloudOnlyPartnerState()
    }

    /// Wipes every per-partner UserDefaults entry. Called from `stopSharing` because
```

In `Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, replace:

```swift
    /// behind when the user starts a fresh share later.
    private func clearAllLocalPartnerState() async {
        let ud = UserDefaults.standard

        // Consolidated dicts
        ud.removeObject(forKey: "partnerNicknames")
        ud.removeObject(forKey: "crewluve.displayNameByPartner")
        ud.removeObject(forKey: "crewluve.quickStatusByPartner")
        ud.removeObject(forKey: "partnerBeacon.isSleeping")

        // Individual nickname keys (pre-migration backward compat). Snapshot then delete
        // to avoid mutating the dictionary while iterating.
        let nicknameKeys = ud.dictionaryRepresentation().keys.filter {
            $0.hasPrefix(Self.nicknameKeyPrefix)
        }
        for key in nicknameKeys {
            ud.removeObject(forKey: key)
        }

        // Drop any local pre-share labels too — otherwise the hybrid auto-bind would
```

with:

```swift
    /// behind when the user starts a fresh share later.
    private func clearAllLocalPartnerState() async {
        let ud = UserDefaults.standard
        ud.removeObject(forKey: "crewluve.displayNameByPartner")
        ud.removeObject(forKey: "crewluve.quickStatusByPartner")
        ud.removeObject(forKey: "partnerBeacon.isSleeping")
        await clearICloudOnlyPartnerState()
    }

    /// Wipes what iCloud sharing alone uses: the nicknames (Crewlu Cloud partners' names live
    /// on Crewlu Cloud) and the pending invites. Syncs the change to the pilot's other devices.
    private func clearICloudOnlyPartnerState() async {
        // Snapshot then delete, to avoid mutating the dictionary while iterating.
        for key in PartnerSettings.iCloudNicknameKeys() {
            UserDefaults.standard.removeObject(forKey: key)
        }

        // Drop any local pre-share labels too — otherwise the hybrid auto-bind would
```

- [ ] **Step 2: Run the harness: nothing it tests changes**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 90 tests, with 0 failures`.

- [ ] **Step 3: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift && git -C ~/Dev/Duty commit -q -m "fix(partners): the iCloud clean-ups keep the per-person settings Crewlu Cloud partners share; endICloudShare ends the share without them" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 10: The share sheet, the prompt, and the newer-build message

**Files:**
- Create: `Duty/Views/Settings/ActivityShareSheet.swift`, `Duty/Views/Settings/PartnerCloudPrompt.swift`
- Modify: `Duty/Utils/SyncGuidanceCopy.swift`

Three small pieces the screens use (spec §4.1, §5.2, §6.1). Views are checked by Task 14's compile and by the user (Tasks 16 and 17).

- [ ] **Step 1: Write the share sheet**

SwiftUI's `ShareLink` needs its link before the tap, but an invite link is made by the tap (spec §4.1). The message and Mail's subject are spec §6.4's.

File: `Duty/Views/Settings/ActivityShareSheet.swift`

```swift
//
//  ActivityShareSheet.swift
//  Duty
//
//  The system share sheet for an invite link (partner links, spec §4.1, §6.4).
//  SwiftUI's ShareLink needs its link before the tap, but an invite link is
//  made by the tap, so this opens once the link exists.
//

import SwiftUI
import UIKit

/// An invite link waiting to be shared: `.sheet(item:)` opens ActivityShareSheet with it.
struct PartnerShareItem: Identifiable, Equatable {
    let link: URL
    var id: URL { link }
}

struct ActivityShareSheet: UIViewControllerRepresentable {
    let link: URL
    /// Called when the share sheet closes, whether or not anything was sent.
    var onDone: () -> Void = {}

    /// Sent with the link, and Mail's subject (spec §6.4).
    static let message = "Tap this link to see my status in Crewluve."
    static let subject = "Pilot Status"

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(
            activityItems: [MessageItem(message: Self.message, subject: Self.subject), link],
            applicationActivities: nil)
        controller.completionWithItemsHandler = { _, _, _, _ in onDone() }
        return controller
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}

    /// The message, with a subject for Mail.
    private final class MessageItem: NSObject, UIActivityItemSource {
        let message: String
        let subject: String

        init(message: String, subject: String) {
            self.message = message
            self.subject = subject
        }

        func activityViewControllerPlaceholderItem(_ activityViewController: UIActivityViewController) -> Any {
            message
        }

        func activityViewController(_ activityViewController: UIActivityViewController,
                                    itemForActivityType activityType: UIActivity.ActivityType?) -> Any? {
            message
        }

        func activityViewController(_ activityViewController: UIActivityViewController,
                                    subjectForActivityType activityType: UIActivity.ActivityType?) -> String {
            subject
        }
    }
}
```

- [ ] **Step 2: Write the prompt**

It copies the approved mockup: a cloud, the words, and a filled blue button like the screen's Subscribe to Pro.

File: `Duty/Views/Settings/PartnerCloudPrompt.swift`

```swift
//
//  PartnerCloudPrompt.swift
//  Duty
//
//  The prompt at the top of Partner Sharing when it can't run on Crewlu Cloud
//  (partner links, spec §6.1): not signed in, an expired sign-in, or this
//  phone's schedule belonging to another account. Its button opens the Crewlu
//  Cloud screen.
//

import SwiftUI

struct PartnerCloudPrompt: View {
    let prompt: PartnerSharingPrompt
    let onOpenCrewluCloud: () -> Void

    var body: some View {
        Section {
            VStack(spacing: 12) {
                Image(systemName: "cloud")
                    .font(.title2)
                    .foregroundStyle(.blue)
                    .accessibilityHidden(true)

                VStack(spacing: 4) {
                    Text(prompt.title)
                        .font(.headline)
                    if let detail = prompt.detail {
                        Text(detail)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .multilineTextAlignment(.center)

                Button(action: onOpenCrewluCloud) {
                    Text(prompt.button)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
                .buttonStyle(.plain)
            }
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity)
        }
    }
}
```

- [ ] **Step 3: Add the Crewlu Cloud newer-build message**

One replacement in `Duty/Utils/SyncGuidanceCopy.swift`:

In `Duty/Utils/SyncGuidanceCopy.swift`, replace:

```swift
    /// (or deleting) Duty on the stale device is the legitimate fix.
    static let staleLocalBuildMessage =
        "Another device on your iCloud is running a newer Duty build. Update or rebuild Duty on this device to share partner status from here."

    /// Short label for the "CloudKit" row value. Distinguishes the `CKAccountStatus`
    /// cases the old `Bool` collapsed into a single "Unavailable".
```

with:

```swift
    /// (or deleting) Duty on the stale device is the legitimate fix.
    static let staleLocalBuildMessage =
        "Another device on your iCloud is running a newer Duty build. Update or rebuild Duty on this device to share partner status from here."

    /// The Crewlu Cloud version (partner links, spec §5.2): `set_partner_status` answered
    /// `applied: false` because a newer CrewLu on another of the pilot's devices wrote first.
    static let crewluCloudNewerBuildMessage =
        "Another of your devices has a newer version of CrewLu. Update CrewLu on this device to share your status from here."

    /// Short label for the "CloudKit" row value. Distinguishes the `CKAccountStatus`
    /// cases the old `Bool` collapsed into a single "Unavailable".
```

- [ ] **Step 4: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Views/Settings/ActivityShareSheet.swift Duty/Views/Settings/PartnerCloudPrompt.swift Duty/Utils/SyncGuidanceCopy.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): the share sheet for invite links, the sign-in prompt, and the Crewlu Cloud newer-build message" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 11: The partner page

**Files:**
- Create: `Duty/Views/Settings/PartnerDetailView.swift`
- Modify: `Duty/Views/Settings/PartnerQuickStatusSheet.swift`

Spec §6.3 and §6.5, as in the approved mockup. The quick status sheet gains two optional inputs (decision 13), so its call from today's screen stays as it is.

- [ ] **Step 1: Teach the quick status sheet about Crewlu Cloud partners**

The header; `Person`, `people` and `renameOnCrewluCloud`; Send To's people; the nickname's starting value; Send To's rows; and `sendUpdate`, which renames on Crewlu Cloud first and leaves the iCloud nickname to iCloud partners.

11 replacements, in order, in `Duty/Views/Settings/PartnerQuickStatusSheet.swift`:

In `Duty/Views/Settings/PartnerQuickStatusSheet.swift`, replace:

```swift
//  PartnerQuickStatusSheet.swift
//  Duty
//
//  Per-partner quick status picker sheet
//

import SwiftUI
import SwiftData

struct PartnerQuickStatusSheet: View {
    let preselectedPartnerID: String
    let preselectedPartnerName: String
    var onRemovePartner: (() -> Void)? = nil

    @Environment(\.dismiss) private var dismiss
```

with:

```swift
//  PartnerQuickStatusSheet.swift
//  Duty
//
//  Per-partner quick status picker sheet. On Crewlu Cloud (partner links, spec
//  §6.5), the caller passes the people to send to, and the nickname renames the
//  partner on Crewlu Cloud; without them it works with the iCloud share's partners.
//

import SwiftUI
import SwiftData

struct PartnerQuickStatusSheet: View {
    /// Someone the sheet can send a quick status to.
    struct Person: Identifiable, Equatable {
        let id: String
        let name: String
    }

    let preselectedPartnerID: String
    let preselectedPartnerName: String
    /// Send To's people. Nil: the iCloud share's partners.
    var people: [Person]? = nil
    /// Saves the nickname as the partner's name on Crewlu Cloud. Nil: the nickname is the
    /// iCloud partner's, kept on the pilot's devices.
    var renameOnCrewluCloud: ((String) async throws -> Void)? = nil
    var onRemovePartner: (() -> Void)? = nil

    @Environment(\.dismiss) private var dismiss
```

In `Duty/Views/Settings/PartnerQuickStatusSheet.swift`, replace:

```swift
    @State private var showRemoveConfirmation = false

    private var activePilot: PilotInfo? { pilots.first }

    private var displayNameChanged: Bool {
        displayName.trimmingCharacters(in: .whitespacesAndNewlines) != initialDisplayName
```

with:

```swift
    @State private var showRemoveConfirmation = false

    private var activePilot: PilotInfo? { pilots.first }

    private var sendToPeople: [Person] {
        people ?? beaconManager.partners.map { Person(id: $0.id, name: $0.displayName) }
    }

    private var displayNameChanged: Bool {
        displayName.trimmingCharacters(in: .whitespacesAndNewlines) != initialDisplayName
```

In `Duty/Views/Settings/PartnerQuickStatusSheet.swift`, replace:

```swift
            }
            initialDisplayName = displayName

            // Load existing partner nickname
            nickname = UserDefaults.standard.string(forKey: "partnerNickname.\(preselectedPartnerID)") ?? ""
            initialNickname = nickname
        }
        .alert("Update failed", isPresented: Binding(
```

with:

```swift
            }
            initialDisplayName = displayName

            // Load existing partner nickname: a Crewlu Cloud partner's is their name there
            nickname = renameOnCrewluCloud != nil
                ? preselectedPartnerName
                : UserDefaults.standard.string(forKey: "partnerNickname.\(preselectedPartnerID)") ?? ""
            initialNickname = nickname
        }
        .alert("Update failed", isPresented: Binding(
```

In `Duty/Views/Settings/PartnerQuickStatusSheet.swift`, replace:

```swift
                }

                // Partner picker (multi-select if 2+ partners)
                if selectedStatus != nil && beaconManager.partners.count >= 2 {
                    partnerPicker
                }
```

with:

```swift
                }

                // Partner picker (multi-select if 2+ partners)
                if selectedStatus != nil && sendToPeople.count >= 2 {
                    partnerPicker
                }
```

In `Duty/Views/Settings/PartnerQuickStatusSheet.swift`, replace:

```swift
            VStack(spacing: 0) {
                // "Everyone" row
                Button {
                    selectedPartnerIDs = Set(beaconManager.partners.map(\.id))
                } label: {
                    HStack {
                        Text("Everyone")
                        Spacer()
                        if selectedPartnerIDs.count == beaconManager.partners.count {
                            Image(systemName: "checkmark")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(.blue)
```

with:

```swift
            VStack(spacing: 0) {
                // "Everyone" row
                Button {
                    selectedPartnerIDs = Set(sendToPeople.map(\.id))
                } label: {
                    HStack {
                        Text("Everyone")
                        Spacer()
                        if selectedPartnerIDs.count == sendToPeople.count {
                            Image(systemName: "checkmark")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(.blue)
```

In `Duty/Views/Settings/PartnerQuickStatusSheet.swift`, replace:

```swift
                Divider().padding(.leading, 14)

                // Individual partner rows
                ForEach(beaconManager.partners) { partner in
                    Button {
                        if selectedPartnerIDs.contains(partner.id) {
                            selectedPartnerIDs.remove(partner.id)
```

with:

```swift
                Divider().padding(.leading, 14)

                // Individual partner rows
                ForEach(sendToPeople) { partner in
                    Button {
                        if selectedPartnerIDs.contains(partner.id) {
                            selectedPartnerIDs.remove(partner.id)
```

In `Duty/Views/Settings/PartnerQuickStatusSheet.swift`, replace:

```swift
                        }
                    } label: {
                        HStack {
                            Text(partner.displayName)
                            Spacer()
                            if selectedPartnerIDs.contains(partner.id) {
                                Image(systemName: "checkmark")
```

with:

```swift
                        }
                    } label: {
                        HStack {
                            Text(partner.name)
                            Spacer()
                            if selectedPartnerIDs.contains(partner.id) {
                                Image(systemName: "checkmark")
```

In `Duty/Views/Settings/PartnerQuickStatusSheet.swift`, replace:

```swift
                    }
                    .buttonStyle(.plain)

                    if partner.id != beaconManager.partners.last?.id {
                        Divider().padding(.leading, 14)
                    }
                }
```

with:

```swift
                    }
                    .buttonStyle(.plain)

                    if partner.id != sendToPeople.last?.id {
                        Divider().padding(.leading, 14)
                    }
                }
```

In `Duty/Views/Settings/PartnerQuickStatusSheet.swift`, replace:

```swift

        isUpdating = true

        // Save quick status if one is selected
        if let status = selectedStatus {
            let icon = statusOptions.first(where: { $0.label == status })?.icon ?? ""
```

with:

```swift

        isUpdating = true

        // On Crewlu Cloud the nickname is the partner's name there, and an empty one keeps it.
        // Renamed first: if that fails, nothing has changed and the pilot can try again.
        let trimmedNick = nickname.trimmingCharacters(in: .whitespacesAndNewlines)
        if let renameOnCrewluCloud, trimmedNick != initialNickname {
            do {
                try await renameOnCrewluCloud(trimmedNick)
            } catch {
                isUpdating = false
                guard let message = (error as? PartnerCloudError ?? .unavailable).actionMessage else {
                    dismiss()       // PT404: removed on another device; the list has caught up
                    return
                }
                syncErrorMessage = message
                return
            }
        }

        // Save quick status if one is selected
        if let status = selectedStatus {
            let icon = statusOptions.first(where: { $0.label == status })?.icon ?? ""
```

In `Duty/Views/Settings/PartnerQuickStatusSheet.swift`, replace:

```swift
            }()

            // Set entry for each selected partner
            let allSelected = selectedPartnerIDs.count == beaconManager.partners.count && beaconManager.partners.count > 1
            if allSelected {
                dict["__everyone__"] = entry
                for id in selectedPartnerIDs {
```

with:

```swift
            }()

            // Set entry for each selected partner
            let allSelected = selectedPartnerIDs.count == sendToPeople.count && sendToPeople.count > 1
            if allSelected {
                dict["__everyone__"] = entry
                for id in selectedPartnerIDs {
```

In `Duty/Views/Settings/PartnerQuickStatusSheet.swift`, replace:

```swift
        }

        // Save partner nickname (empty string clears it)
        let trimmedNick = nickname.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedNick != initialNickname {
            beaconManager.setPartnerNickname(trimmedNick, forID: preselectedPartnerID)
        }
```

with:

```swift
        }

        // Save partner nickname (empty string clears it)
        if renameOnCrewluCloud == nil, trimmedNick != initialNickname {
            beaconManager.setPartnerNickname(trimmedNick, forID: preselectedPartnerID)
        }
```

- [ ] **Step 2: Write the partner page**

File: `Duty/Views/Settings/PartnerDetailView.swift`

```swift
//
//  PartnerDetailView.swift
//  Duty
//
//  The partner page (partner links, spec §6.3): who they are, the devices they
//  see your status on, their invite link, their nickname and quick status, and
//  removing them. Someone still connected through iCloud gets the same page,
//  with an iCloud row for their devices.
//

import SwiftUI
import SwiftData

struct PartnerDetailView: View {
    /// Whose page this is.
    enum Person: Hashable {
        /// A Crewlu Cloud partner.
        case crewluCloud(id: String)
        /// Someone connected through the iCloud share, on an older Crewluve (P2-2).
        case iCloud(id: String)
    }

    let person: Person
    /// Everyone the pilot shares with, for the quick status sheet's Send To.
    let everyone: [PartnerQuickStatusSheet.Person]

    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Query(filter: #Predicate<PilotInfo> { $0.isActive == true && $0.deletedAt == nil }) private var pilots: [PilotInfo]
    @State private var store = PartnerCloudStore.shared
    @State private var beaconManager = PilotStatusBeaconManager.shared

    @State private var isWorking = false
    @State private var errorMessage: String?
    @State private var deviceToRemove: PartnerCloudDevice?
    @State private var showingNewLinkConfirmation = false
    @State private var showingRemoveConfirmation = false
    @State private var showingQuickStatus = false
    @State private var shareItem: PartnerShareItem?
    /// Bumped when the quick status sheet closes: the display name is read from UserDefaults.
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
        List {
            headerSection
            devicesSection
            actionsSection
            Section {
                Button(role: .destructive) {
                    showingRemoveConfirmation = true
                } label: {
                    HStack {
                        Text("Remove \(name)")
                        if isWorking {
                            Spacer()
                            ProgressView()
                        }
                    }
                }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .disabled(isWorking)
        .onAppear {
            if isGone { leave() }
        }
        .onChange(of: isGone) { _, gone in
            if gone { leave() }
        }
        .alert("Remove This Device?", isPresented: Binding(
            get: { deviceToRemove != nil },
            set: { if !$0 { deviceToRemove = nil } }
        ), presenting: deviceToRemove) { device in
            Button("Remove", role: .destructive) {
                run { try await store.removeDevice(device.id) }
            }
            Button("Cancel", role: .cancel) { }
        } message: { device in
            Text("\(device.label) stops seeing your status. \(name)'s other devices stay connected.")
        }
        .alert("Make a New Link?", isPresented: $showingNewLinkConfirmation) {
            Button("New Link") {
                run {
                    let token = try await store.newLink(for: id)
                    shareItem = PartnerShareItem(link: PartnerCloudInvite.link(forToken: token))
                }
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("The current link stops working. Devices already connected stay connected.")
        }
        .alert("Remove Partner?", isPresented: $showingRemoveConfirmation) {
            Button("Remove", role: .destructive) { remove() }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Remove \(name)? They will no longer see your status.")
        }
        .alert("Error", isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
        .sheet(item: $shareItem) { item in
            ActivityShareSheet(link: item.link) { shareItem = nil }
        }
        .sheet(isPresented: $showingQuickStatus, onDismiss: { settingsTick = UUID() }) {
            PartnerQuickStatusSheet(
                preselectedPartnerID: id,
                preselectedPartnerName: name,
                people: everyone,
                renameOnCrewluCloud: cloudPartner == nil ? nil : { [store, id] newName in
                    try await store.rename(id, to: newName)
                }
            )
            .environment(\.modelContext, modelContext)
        }
    }

    // MARK: - Sections

    private var headerSection: some View {
        Section {
            VStack(spacing: 6) {
                ZStack {
                    Circle()
                        .fill(isWaitingForThem ? Color.orange.opacity(0.15) : Color.blue.opacity(0.15))
                        .frame(width: 64, height: 64)
                    Text(name.prefix(1).uppercased())
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(isWaitingForThem ? .orange : .blue)
                }
                Text(name)
                    .font(.title3.weight(.semibold))
                Text("Sees you as \(seesYouAs)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 4)
            .accessibilityElement(children: .combine)
        }
        .listRowBackground(Color.clear)
    }

    @ViewBuilder
    private var devicesSection: some View {
        if iCloudPartner != nil {
            Section {
                deviceRow(icon: "icloud", title: "iCloud · older Crewluve", detail: "Still connected")
            } header: {
                Text("Devices")
            } footer: {
                Text("\(name) moves over automatically after updating Crewluve.")
            }
        } else if devices.isEmpty {
            Section {
                deviceRow(icon: "envelope", title: "Not opened yet", detail: nil)
            } header: {
                Text("Devices")
            } footer: {
                Text("\(name) connects by tapping the invite link.")
            }
        } else {
            Section {
                ForEach(devices) { device in
                    deviceRow(icon: device.kind == "app" ? "iphone" : "globe",
                              title: device.label,
                              detail: PartnerList.deviceKindLine(kind: device.kind, lastSeen: device.lastSeenAt,
                                                                 now: Date(), calendar: .current))
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(role: .destructive) {
                                deviceToRemove = device
                            } label: {
                                Label("Remove", systemImage: "trash")
                            }
                        }
                }
            } header: {
                Text("Devices")
            } footer: {
                Text("Swipe a device to remove it.")
            }
        }
    }

    private func deviceRow(icon: String, title: String, detail: String?) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(.secondary)
                .frame(width: 28)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                if let detail {
                    Text(detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .accessibilityElement(children: .combine)
    }

    private var actionsSection: some View {
        Section {
            if let partner = cloudPartner {
                Button {
                    shareItem = PartnerShareItem(link: PartnerCloudInvite.link(forToken: partner.inviteToken))
                } label: {
                    Label("Send Link Again", systemImage: "square.and.arrow.up")
                }
                Button {
                    showingNewLinkConfirmation = true
                } label: {
                    Label("New Link", systemImage: "link")
                }
            }
            Button {
                showingQuickStatus = true
            } label: {
                Label("Nickname and Quick Status", systemImage: "bubble.left")
            }
        }
    }

    // MARK: - Actions

    /// Runs a Crewlu Cloud action with the page disabled. PT404 means another device removed
    /// them: the list has caught up, so the page goes back to it (spec §6.3).
    private func run(_ action: @escaping () async throws -> Void) {
        isWorking = true
        Task {
            defer { isWorking = false }
            do {
                try await action()
            } catch {
                if let message = (error as? PartnerCloudError ?? .unavailable).actionMessage {
                    errorMessage = message
                } else {
                    leave()
                }
            }
        }
    }

    /// Spec §6.3 and §7.5: a Crewlu Cloud partner goes with their devices and settings; someone
    /// on iCloud leaves the iCloud share, as today.
    private func remove() {
        switch person {
        case .crewluCloud(let id):
            run {
                try await store.remove(id)
                PartnerSettings.forget(id)
                PartnerDataKVSync.shared.pushToKVS()
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

    /// Back to the list, once, however many things ask for it.
    private func leave() {
        guard !hasLeft else { return }
        hasLeft = true
        dismiss()
    }
}
```

- [ ] **Step 3: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Views/Settings/PartnerDetailView.swift Duty/Views/Settings/PartnerQuickStatusSheet.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): the partner page, and the quick status sheet for Crewlu Cloud partners" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 12: Partner Sharing on Crewlu Cloud

**Files:**
- Modify: `Duty/Views/Settings/PartnerSharingView.swift`

The screen itself (spec §6.1, §6.2, §6.4): which screen shows, the Crewlu Cloud list and its swipes, the invite sheet, Update Status Now and the first appearance through `forceUpdate`, Stop Sharing with Everyone on Crewlu Cloud, pull to refresh, the About and help copy, and the prompt above today's screen without inviting.

- [ ] **Step 1: Change the screen**

The big ones: the body switches between the Crewlu Cloud screen and the prompt; `startSharing()` (iCloud invites) and the iCloud share sheets go; the Crewlu Cloud list and its actions are new; `ShareLinkView` becomes the Crewlu Cloud invite sheet.

29 replacements, in order, in `Duty/Views/Settings/PartnerSharingView.swift`:

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
//  PartnerSharingView.swift
//  Duty
//
//  Settings view for managing partner sharing (Crewluve app)
//

import SwiftUI
```

with:

```swift
//  PartnerSharingView.swift
//  Duty
//
//  Settings view for managing partner sharing (Crewluve app). Signed in to Crewlu
//  Cloud, it runs there (partner links, spec §6.2); otherwise it shows a sign-in
//  prompt above today's iCloud screen, minus inviting (§6.1).
//

import SwiftUI
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
struct PartnerSharingView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var beaconManager = PilotStatusBeaconManager.shared
    @ObservedObject private var subscriptionManager = SubscriptionManager.shared
    @Query(filter: #Predicate<PilotInfo> { $0.isActive == true && $0.deletedAt == nil }) private var pilots: [PilotInfo]

    @State private var showingShareSheet = false
```

with:

```swift
struct PartnerSharingView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var beaconManager = PilotStatusBeaconManager.shared
    @State private var store = PartnerCloudStore.shared
    @State private var writer = PartnerSummaryCloudWriter.shared
    @ObservedObject private var subscriptionManager = SubscriptionManager.shared
    @ObservedObject private var account = AccountController.shared
    @ObservedObject private var syncEngine = SupabaseSyncEngine.shared
    @Query(filter: #Predicate<PilotInfo> { $0.isActive == true && $0.deletedAt == nil }) private var pilots: [PilotInfo]

    @State private var showingShareSheet = false
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
    @State private var isRefreshingPartners = false
    @State private var showingErrorAlert = false
    @State private var errorAlertMessage = ""
    @State private var shareCreationError: String? = nil
    @State private var partnerToRemove: PartnerInfo? = nil
    @State private var quickStatusPartner: PartnerInfo? = nil
    /// Trigger to force re-read of per-partner status dict from UserDefaults
    @State private var statusRefreshTick = UUID()
```

with:

```swift
    @State private var isRefreshingPartners = false
    @State private var showingErrorAlert = false
    @State private var errorAlertMessage = ""
    @State private var partnerToRemove: PartnerInfo? = nil
    /// A Crewlu Cloud partner whose Remove was swiped, waiting for the alert.
    @State private var cloudPartnerToRemove: PartnerListRow? = nil
    /// An invite link waiting for the share sheet: Re-share and Send Link Again.
    @State private var shareItem: PartnerShareItem? = nil
    @State private var showingCrewluCloud = false
    /// Bumped on every appearance: whose schedule this phone holds is kept in UserDefaults,
    /// which doesn't redraw the screen, and it can change on the Crewlu Cloud screen.
    @State private var ownerCheckTick = UUID()
    @State private var hasAppeared = false
    @State private var quickStatusPartner: PartnerInfo? = nil
    /// Trigger to force re-read of per-partner status dict from UserDefaults
    @State private var statusRefreshTick = UUID()
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift

    /// Local-only invites the user has labelled-and-sent but no one has accepted yet.
    @State private var pendingInvites: [PendingPartnerInvite] = []
    /// When non-nil, ShareLinkView is reopened with this invite's name pre-filled (Re-share swipe action).
    @State private var reshareInvite: PendingPartnerInvite? = nil
    /// Snapshot of beaconManager.partners IDs used to detect newly-appeared participants for binding.
    @State private var previousKnownPartnerIDs: Set<String> = []
    /// FIFO of new participant IDs awaiting binding to a pending invite.
```

with:

```swift

    /// Local-only invites the user has labelled-and-sent but no one has accepted yet.
    @State private var pendingInvites: [PendingPartnerInvite] = []
    /// Snapshot of beaconManager.partners IDs used to detect newly-appeared participants for binding.
    @State private var previousKnownPartnerIDs: Set<String> = []
    /// FIFO of new participant IDs awaiting binding to a pending invite.
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
    var body: some View {
        List {
            if subscriptionManager.isSubscribed {
                heroStatusSection
                partnersSection
                commutesSection
                if beaconManager.isSharing { flightDelaySection }
                actionsSection
                errorSection
            } else {
                upgradeToProSection
            }
            aboutSection
        }
        .dynamicTypeSize(Self.textSizeCap)
        .navigationTitle("Partner Sharing")
```

with:

```swift
    var body: some View {
        List {
            if subscriptionManager.isSubscribed {
                switch screen {
                case .crewluCloud:
                    heroStatusSection
                    cloudPartnersSection
                    commutesSection
                    if isSharingActive { flightDelaySection }
                    cloudActionsSection
                    errorSection
                case .prompt(let prompt):
                    PartnerCloudPrompt(prompt: prompt) { showingCrewluCloud = true }
                    if screen.showsICloudSharing(iCloudSharing: beaconManager.isSharing) {
                        heroStatusSection
                        partnersSection
                        commutesSection
                        flightDelaySection
                        actionsSection
                        errorSection
                    }
                }
            } else {
                upgradeToProSection
            }
            aboutSection
        }
        .refreshable { await refreshPartnerLists() }
        .navigationDestination(isPresented: $showingCrewluCloud) {
            CrewluCloudDetailView()
        }
        .dynamicTypeSize(Self.textSizeCap)
        .navigationTitle("Partner Sharing")
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
            }
        }
        .sheet(isPresented: $showingShareSheet) {
            if let shareURL = beaconManager.shareURL {
                ShareLinkView(
                    shareURL: shareURL,
                    isPresented: $showingShareSheet,
                    onSent: { name in
                        Task { @MainActor in
                            _ = await PendingPartnerInvites.append(name: name)
                            pendingInvites = await PendingPartnerInvites.load()
                        }
                    }
                )
            } else {
                VStack(spacing: 16) {
                    if let error = shareCreationError {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.orange)
                        Text("Failed to Create Share")
                            .font(.headline)
                        Text(error)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                        HStack(spacing: 16) {
                            Button("Close") {
                                shareCreationError = nil
                                showingShareSheet = false
                            }
                            Button("Retry") {
                                shareCreationError = nil
                                Task {
                                    if await beaconManager.ensureShare() == nil {
                                        shareCreationError = beaconManager.errorMessage ?? "Could not create share. Please try again."
                                    }
                                }
                            }
                            .buttonStyle(.borderedProminent)
                        }
                    } else {
                        ProgressView()
                        Text("Creating share...")
                            .padding()
                    }
                }
                .onAppear {
                    shareCreationError = nil
                }
                .padding()
                .task {
                    debugLog("[PartnerSharing] Share sheet opened with nil shareURL — calling ensureShare()")
                    if await beaconManager.ensureShare() == nil {
                        debugLog("[PartnerSharing] ❌ ensureShare() returned nil — showing error in sheet")
                        shareCreationError = beaconManager.errorMessage ?? "Could not create share. Please try again."
                    }
                }
            }
        }
        .sheet(item: $quickStatusPartner) { partner in
            PartnerQuickStatusSheet(
```

with:

```swift
            }
        }
        .sheet(isPresented: $showingShareSheet) {
            ShareLinkView(isPresented: $showingShareSheet)
        }
        .sheet(item: $shareItem) { item in
            ActivityShareSheet(link: item.link) { shareItem = nil }
        }
        .sheet(item: $quickStatusPartner) { partner in
            PartnerQuickStatusSheet(
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
        .alert("Stop Sharing with Everyone?", isPresented: $showingStopSharingConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Stop Sharing", role: .destructive) {
                Task { await beaconManager.stopSharing() }
            }
        } message: {
            Text("This will remove all partners and stop sharing your status with everyone.")
```

with:

```swift
        .alert("Stop Sharing with Everyone?", isPresented: $showingStopSharingConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Stop Sharing", role: .destructive) {
                Task { await stopSharingWithEveryone() }
            }
        } message: {
            Text("This will remove all partners and stop sharing your status with everyone.")
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
                Text("Remove \(partner.displayName)? They will no longer see your status.")
            }
        }
        .alert("Error", isPresented: $showingErrorAlert) {
            Button("OK", role: .cancel) { }
        } message: {
```

with:

```swift
                Text("Remove \(partner.displayName)? They will no longer see your status.")
            }
        }
        .alert("Remove Partner?", isPresented: Binding(
            get: { cloudPartnerToRemove != nil },
            set: { if !$0 { cloudPartnerToRemove = nil } }
        ), presenting: cloudPartnerToRemove) { row in
            Button("Remove", role: .destructive) {
                Task { await removeCloudPartner(row.id) }
            }
        } message: { row in
            Text("Remove \(row.name)? They will no longer see your status.")
        }
        .alert("Error", isPresented: $showingErrorAlert) {
            Button("OK", role: .cancel) { }
        } message: {
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
        }
        .sheet(isPresented: $showingHelpSheet) {
            PartnerSharingHelpSheet()
        }
        .sheet(item: $reshareInvite) { invite in
            if let shareURL = beaconManager.shareURL {
                ShareLinkView(
                    shareURL: shareURL,
                    isPresented: Binding(
                        get: { reshareInvite != nil },
                        set: { if !$0 { reshareInvite = nil } }
                    ),
                    prefilledName: invite.name,
                    onSent: { _ in
                        // Re-share reuses the existing pending row; no new entry created.
                    }
                )
            }
        }
        .sheet(item: $commuteSheet) { mode in
            if let pilot = activePilot {
```

with:

```swift
        }
        .sheet(isPresented: $showingHelpSheet) {
            PartnerSharingHelpSheet()
        }
        .sheet(item: $commuteSheet) { mode in
            if let pilot = activePilot {
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
        }
    }

    private func startSharing() async {
        guard let pilot = activePilot else {
            debugLog("[PartnerSharing] No active pilot found")
            return
        }
        
        debugLog("[PartnerSharing] Starting sharing process...")
        isUpdatingStatus = true
        defer { isUpdatingStatus = false }
        
        // Generate initial status
        let generator = PartnerStatusGenerator(modelContext: modelContext)
        let status = generator.generateStatus(for: pilot)
        debugLog("[PartnerSharing] Status generated for pilot: \(pilot.firstName)")
        
        // Update CloudKit - clear any previous errors first
        beaconManager.errorMessage = nil
        await beaconManager.updateStatus(status)
        
        // Check if update succeeded
        if let error = beaconManager.errorMessage {
            debugLog("[PartnerSharing] Status update failed: \(error)")
            errorAlertMessage = error
            showingErrorAlert = true
            return
        }
        
        debugLog("[PartnerSharing] Status updated in CloudKit")

        // Reuse existing share or create a new one
        let hadShareURL = beaconManager.shareURL != nil
        if await beaconManager.ensureShare() != nil {
            debugLog("[PartnerSharing] Share ready, hadShareURL=\(hadShareURL)")

            // Only show the share sheet for first-time setup (partner doesn't have the link yet)
            if !hadShareURL {
                showingShareSheet = true
            }

            // Start automatic sync
            PartnerBeaconAutoSync.shared.startMonitoring(modelContext: modelContext, pilotInfo: pilot)
        } else {
            debugLog("[PartnerSharing] Failed to create share - check beaconManager.errorMessage: \(beaconManager.errorMessage ?? "no error")")
            errorAlertMessage = beaconManager.errorMessage ?? "Failed to create share. Please try again."
            showingErrorAlert = true
        }
    }
    
    private func updateStatusNow() async {
        debugLog("[PartnerSharing] 🔴🔴🔴 Update Status Now function called!")
        debugLog("[PartnerSharing] pilots.count = \(pilots.count)")
        debugLog("[PartnerSharing] pilots = \(pilots.map { $0.firstName })")

        guard let pilot = activePilot else {
            debugLog("[PartnerSharing] ❌ No active pilot found (pilots.count = \(pilots.count))")
            return
        }

        debugLog("[PartnerSharing] 🔄 Update Status Now tapped for pilot: \(pilot.firstName)")
        isUpdatingStatus = true
        defer { isUpdatingStatus = false }

        debugLog("[PartnerSharing] Creating generator...")
        let generator = PartnerStatusGenerator(modelContext: modelContext)
        debugLog("[PartnerSharing] Generating status...")
        let status = generator.generateStatus(for: pilot)

        debugLog("[PartnerSharing] Generated status - isHome: \(status.isHome), nextDeparture: \(status.nextDepartureTime?.formatted(date: .abbreviated, time: .standard) ?? "nil")")

        debugLog("[PartnerSharing] Calling beaconManager.updateStatus...")
        await beaconManager.updateStatus(status)
        debugLog("[PartnerSharing] beaconManager.updateStatus returned")

        await beaconManager.refreshParticipants()

        debugLog("[PartnerSharing] ✅ Update Status Now completed")
    }
```

with:

```swift
        }
    }

    /// Update Status Now, and opening the screen: through PartnerBeaconAutoSync, so the summary goes
    /// to Crewlu Cloud as well as to an iCloud share (spec §4.2, §12.4). Waits for the Crewlu Cloud
    /// write, so the button's spinner covers it.
    private func updateStatusNow() async {
        guard let pilot = activePilot else {
            debugLog("[PartnerSharing] ❌ No active pilot found (pilots.count = \(pilots.count))")
            return
        }

        debugLog("[PartnerSharing] 🔄 Update Status Now for pilot: \(pilot.firstName)")
        isUpdatingStatus = true
        defer { isUpdatingStatus = false }

        beaconManager.errorMessage = nil
        await PartnerBeaconAutoSync.shared.forceUpdate(modelContext: modelContext, pilotInfo: pilot)
        await writer.waitUntilIdle()
        await refreshPartnerLists()

        debugLog("[PartnerSharing] ✅ Update Status Now completed")
    }
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(beaconManager.isSharing ? Color.green.opacity(0.15) : Color(.systemGray5))
                        .frame(width: 48, height: 48)
                    Image(systemName: beaconManager.isSharing
                          ? "antenna.radiowaves.left.and.right"
                          : "antenna.radiowaves.left.and.right.slash")
                        .font(.title3)
                        .foregroundStyle(beaconManager.isSharing ? .green : .secondary)
                        .symbolEffect(.pulse, isActive: beaconManager.isSharing)
                }

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(beaconManager.isSharing ? "Sharing Active" : "Not Sharing")
                            .font(.headline)
                        Text("BETA")
                            .font(.caption2.weight(.bold))
```

with:

```swift
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(isSharingActive ? Color.green.opacity(0.15) : Color(.systemGray5))
                        .frame(width: 48, height: 48)
                    Image(systemName: isSharingActive
                          ? "antenna.radiowaves.left.and.right"
                          : "antenna.radiowaves.left.and.right.slash")
                        .font(.title3)
                        .foregroundStyle(isSharingActive ? .green : .secondary)
                        .symbolEffect(.pulse, isActive: isSharingActive)
                }

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(isSharingActive ? "Sharing Active" : "Not Sharing")
                            .font(.headline)
                        Text("BETA")
                            .font(.caption2.weight(.bold))
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
                            .padding(.vertical, 2)
                            .background(Capsule().fill(Color.orange.opacity(0.12)))
                    }
                    if let lastUpdate = beaconManager.lastUpdateTime {
                        Text("Updated \(lastUpdate, style: .relative) ago")
                            .font(.caption)
                            .foregroundStyle(.secondary)
```

with:

```swift
                            .padding(.vertical, 2)
                            .background(Capsule().fill(Color.orange.opacity(0.12)))
                    }
                    if let lastUpdate = PartnerList.lastUpdated(
                        cloud: screen == .crewluCloud ? writer.lastAppliedAt : nil,
                        iCloud: beaconManager.lastUpdateTime) {
                        Text("Updated \(lastUpdate, style: .relative) ago")
                            .font(.caption)
                            .foregroundStyle(.secondary)
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
        }
    }

    // MARK: - Commutes

    @ViewBuilder
    private var commutesSection: some View {
        if let pilot = activePilot, beaconManager.isSharing, isCommuter {
            Section {
                ForEach(commuteSuggestions) { suggestion in
                    commuteSuggestionRow(suggestion, pilot: pilot)
```

with:

```swift
        }
    }

    // MARK: - Crewlu Cloud (spec §6.1, §6.2)

    /// Which screen shows (spec §6.1).
    private var screen: PartnerSharingScreen {
        _ = ownerCheckTick
        let uid = account.isSignedIn ? account.currentUserID : nil
        return .make(isSignedIn: uid != nil,
                     signInExpired: syncEngine.sessionExpired || store.signInExpired,
                     scheduleIsTheAccounts: uid.map { SyncOwnerGuard.allowsSync(uid: $0) } ?? false,
                     iCloudSharing: beaconManager.isSharing)
    }

    /// Partners get updates: a Crewlu Cloud partner, on the Crewlu Cloud screen, or the iCloud share.
    private var isSharingActive: Bool {
        PartnerList.isSharingActive(cloudPartners: screen == .crewluCloud ? store.partnerIDs.count : 0,
                                    iCloudSharing: beaconManager.isSharing)
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
    private var everyone: [PartnerQuickStatusSheet.Person] {
        cloudRows.filter(\.kind.opensPartnerPage).map { PartnerQuickStatusSheet.Person(id: $0.id, name: $0.name) }
    }

    @ViewBuilder
    private var cloudPartnersSection: some View {
        let rows = cloudRows
        // The names come with the first read on this launch; the saved ids say there are some.
        let isWaitingForList = !store.hasLoadedList && !store.partnerIDs.isEmpty
        if !rows.isEmpty || isWaitingForList {
            Section("Shared With") {
                ForEach(rows) { row in
                    cloudRow(row)
                }
                if isWaitingForList {
                    HStack {
                        if store.lastRefreshFailed {
                            Text("Couldn\u{2019}t reach Crewlu Cloud.")
                                .foregroundColor(.secondary)
                            Spacer()
                            Button("Retry") {
                                Task { await store.refresh() }
                            }
                            .font(.subheadline)
                        } else {
                            Spacer()
                            ProgressView()
                            Spacer()
                        }
                    }
                }
            }
        }
    }

    /// A row of the Crewlu Cloud list. Every kind but a pending invite from before the update
    /// opens the partner page (spec §6.2).
    @ViewBuilder
    private func cloudRow(_ row: PartnerListRow) -> some View {
        if row.kind.opensPartnerPage {
            NavigationLink {
                PartnerDetailView(person: row.kind == .stillOnICloud ? .iCloud(id: row.id) : .crewluCloud(id: row.id),
                                  everyone: everyone)
            } label: {
                cloudRowContent(row)
            }
            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                cloudRowSwipeActions(row)
            }
        } else {
            cloudRowContent(row)
                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                    cloudRowSwipeActions(row)
                }
        }
    }

    private func cloudRowContent(_ row: PartnerListRow) -> some View {
        let isPendingInvite: Bool = {
            switch row.kind {
            case .notOpenedYet, .sentBeforeUpdate: return true
            case .connected, .stillOnICloud: return false
            }
        }()
        return HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(isPendingInvite ? Color.orange.opacity(0.15) : Color.blue.opacity(0.15))
                    .frame(width: 40, height: 40)
                Text(row.name.prefix(1).uppercased())
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(isPendingInvite ? .orange : .blue)
            }

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(row.name)
                        .font(.subheadline.weight(.medium))
                    if let tag = row.kind.tag {
                        Text(tag)
                            .font(.caption2.weight(.medium))
                            .foregroundStyle(.orange)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 1)
                            .background(Capsule().fill(Color.orange.opacity(0.12)))
                    }
                }
                cloudRowDetail(row)
                if let entry = activeStatusForPartner(row.id) {
                    HStack(spacing: 4) {
                        if !entry.icon.isEmpty {
                            Image(systemName: entry.icon).font(.caption2)
                        }
                        Text(entry.status).font(.caption.weight(.medium))
                        if let expiry = entry.expiry {
                            Text("(\(expiry, style: .timer))").font(.caption)
                        }
                    }
                    .foregroundStyle(.blue)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Capsule().fill(Color.blue.opacity(0.08)))
                }
            }
            Spacer()
        }
        .contentShape(Rectangle())
    }

    @ViewBuilder
    private func cloudRowDetail(_ row: PartnerListRow) -> some View {
        switch row.kind {
        case .connected(let devices, let lastSeen):
            Text(PartnerList.devicesLine(count: devices, lastSeen: lastSeen, now: Date(), calendar: .current))
                .font(.caption)
                .foregroundStyle(.secondary)
        case .stillOnICloud:
            Text("Connected through iCloud")
                .font(.caption)
                .foregroundStyle(.secondary)
        case .notOpenedYet(let sentAt):
            if let sentAt {
                Text("Sent \(sentAt, style: .relative) ago")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        case .sentBeforeUpdate(let sentAt):
            Text("Sent \(sentAt, style: .relative) ago")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    /// Spec §6.2: Remove, with today's alert, for anyone connected; Delete, with no alert as
    /// today, and Re-share for pending invites.
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
        case .notOpenedYet:
            Button(role: .destructive) {
                Task { await removeCloudPartner(row.id) }
            } label: {
                Label("Delete", systemImage: "trash")
            }
            Button {
                sendLinkAgain(to: row.id)
            } label: {
                Label("Re-share", systemImage: "square.and.arrow.up")
            }
            .tint(.blue)
        case .sentBeforeUpdate:
            Button(role: .destructive) {
                Task { await deletePendingInvite(row.id) }
            } label: {
                Label("Delete", systemImage: "trash")
            }
            Button {
                Task { await reshare(pendingInvite: row.id) }
            } label: {
                Label("Re-share", systemImage: "square.and.arrow.up")
            }
            .tint(.blue)
        }
    }

    /// Spec §7.5: a Crewlu Cloud partner goes with their devices, and their settings with them.
    private func removeCloudPartner(_ id: String) async {
        do {
            try await store.remove(id)
            PartnerSettings.forget(id)
            PartnerDataKVSync.shared.pushToKVS()
            statusRefreshTick = UUID()
        } catch {
            // PT404: another device removed them first, and the list has caught up.
            if let message = (error as? PartnerCloudError ?? .unavailable).actionMessage {
                errorAlertMessage = message
                showingErrorAlert = true
            }
        }
    }

    /// Send Link Again: their current link, straight to the share sheet (spec §6.4).
    private func sendLinkAgain(to id: String) {
        guard let partner = store.partners.first(where: { $0.id == id }) else { return }
        shareItem = PartnerShareItem(link: PartnerCloudInvite.link(forToken: partner.inviteToken))
    }

    private func deletePendingInvite(_ id: String) async {
        guard let invite = pendingInvites.first(where: { $0.id.uuidString == id }) else { return }
        await PendingPartnerInvites.remove(id: invite.id)
        pendingInvites = await PendingPartnerInvites.load()
    }

    /// Re-share on a pending invite from before the update (spec §6.2): makes a Crewlu Cloud
    /// partner with its name, drops the label and opens the share sheet. The label's id is the
    /// reference, so a second try gets the same partner.
    private func reshare(pendingInvite id: String) async {
        guard let invite = pendingInvites.first(where: { $0.id.uuidString == id }) else { return }
        do {
            let link = try await PartnerInviteLink(store: store, ref: invite.id.uuidString).link(for: invite.name)
            await PendingPartnerInvites.remove(id: invite.id)
            pendingInvites = await PendingPartnerInvites.load()
            shareItem = PartnerShareItem(link: link)
        } catch {
            errorAlertMessage = (error as? PartnerCloudError ?? .unavailable).inviteMessage
            showingErrorAlert = true
        }
    }

    /// Stop Sharing with Everyone (spec §6.2): every Crewlu Cloud partner and the summary, then
    /// any iCloud share and every per-person setting. When Crewlu Cloud can't be reached, nothing
    /// changes, so the pilot can try again.
    private func stopSharingWithEveryone() async {
        if screen == .crewluCloud {
            do {
                try await store.removeAll()
            } catch {
                if let message = (error as? PartnerCloudError ?? .unavailable).actionMessage {
                    errorAlertMessage = message
                    showingErrorAlert = true
                }
                return
            }
        }
        await beaconManager.stopSharing()
        statusRefreshTick = UUID()
    }

    /// Reads both lists again: Crewlu Cloud's and the iCloud share's.
    private func refreshPartnerLists() async {
        await store.refresh()
        await beaconManager.refreshParticipants()
    }

    // MARK: - Commutes

    @ViewBuilder
    private var commutesSection: some View {
        if let pilot = activePilot, isSharingActive, isCommuter {
            Section {
                ForEach(commuteSuggestions) { suggestion in
                    commuteSuggestionRow(suggestion, pilot: pilot)
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
            } label: {
                Label("Delete", systemImage: "trash")
            }
            Button {
                reshareInvite = invite
            } label: {
                Label("Re-share", systemImage: "square.and.arrow.up")
            }
            .tint(.blue)
        }
    }
```

with:

```swift
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
        statusRefreshTick = UUID()
    }

    private var actionsSection: some View {
        Section {
            if beaconManager.isSharing {
                Button(action: { showingShareSheet = true }) {
                    Label("Invite Another Partner", systemImage: "person.badge.plus")
                }

                Button(action: {
                    Task { await updateStatusNow() }
                }) {
                    HStack {
                        Label("Update Status Now", systemImage: "arrow.clockwise")
                        Spacer()
                        if isUpdatingStatus {
                            ProgressView()
                        }
                    }
                }
                .disabled(isUpdatingStatus)

                Button(role: .destructive, action: { showingStopSharingConfirmation = true }) {
                    Label("Stop Sharing with Everyone", systemImage: "xmark.circle")
                }
            } else {
                Button(action: { Task { await startSharing() } }) {
                    Label("Start Sharing", systemImage: "square.and.arrow.up")
                }
                .disabled(activePilot == nil)
```

with:

```swift
        statusRefreshTick = UUID()
    }

    /// Below the sign-in prompt, today's actions without inviting (spec §6.1): inviting needs Crewlu Cloud.
    private var actionsSection: some View {
        Section {
            updateStatusNowButton
            stopSharingButton
        }
    }

    /// The Crewlu Cloud screen's actions (spec §6.2). Start Sharing opens the invite sheet.
    private var cloudActionsSection: some View {
        Section {
            if isSharingActive {
                Button(action: { showingShareSheet = true }) {
                    Label("Invite Another Partner", systemImage: "person.badge.plus")
                }
                updateStatusNowButton
                stopSharingButton
            } else {
                Button(action: { showingShareSheet = true }) {
                    Label("Start Sharing", systemImage: "square.and.arrow.up")
                }
                .disabled(activePilot == nil)
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
        }
    }


    @ViewBuilder
    private var errorSection: some View {
        if let error = beaconManager.errorMessage {
            Section {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .listRowBackground(Color.orange.opacity(0.06))
            }
        }
    }

    private var aboutSection: some View {
```

with:

```swift
        }
    }

    private var updateStatusNowButton: some View {
        Button(action: {
            Task { await updateStatusNow() }
        }) {
            HStack {
                Label("Update Status Now", systemImage: "arrow.clockwise")
                Spacer()
                if isUpdatingStatus {
                    ProgressView()
                }
            }
        }
        .disabled(isUpdatingStatus)
    }

    private var stopSharingButton: some View {
        Button(role: .destructive, action: { showingStopSharingConfirmation = true }) {
            Label("Stop Sharing with Everyone", systemImage: "xmark.circle")
        }
    }


    @ViewBuilder
    private var errorSection: some View {
        let errors = [beaconManager.errorMessage, crewluCloudProblem].compactMap { $0 }
        if !errors.isEmpty {
            Section {
                ForEach(errors, id: \.self) { error in
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.orange)
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .listRowBackground(Color.orange.opacity(0.06))
                }
            }
        }
    }

    /// A newer CrewLu on another of the pilot's devices wrote the Crewlu Cloud summary (spec §5.2).
    private var crewluCloudProblem: String? {
        guard screen == .crewluCloud, writer.problem == .newerBuild else { return nil }
        return SyncGuidanceCopy.crewluCloudNewerBuildMessage
    }

    private var aboutSection: some View {
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift

                    PartnerInfoRow(icon: "lock.shield", title: "Privacy Protected", description: "Only your location and schedule status are shared. No crew names, hotel details, or pay information.")

                    PartnerInfoRow(icon: "icloud", title: "Secure via iCloud", description: "Data is encrypted and shared through Apple's secure iCloud infrastructure.")

                    PartnerInfoRow(icon: "arrow.triangle.2.circlepath", title: "Auto Updates", description: "Your status updates automatically when your schedule changes, and at least every 5 minutes while the app is open. Open this page any time to push an update.")
```

with:

```swift

                    PartnerInfoRow(icon: "lock.shield", title: "Privacy Protected", description: "Only your location and schedule status are shared. No crew names, hotel details, or pay information.")

                    PartnerInfoRow(icon: "cloud", title: "Secure via Crewlu Cloud", description: "Your status is stored in your Crewlu Cloud account. Each partner gets a private link and sees only your status.")

                    PartnerInfoRow(icon: "arrow.triangle.2.circlepath", title: "Auto Updates", description: "Your status updates automatically when your schedule changes, and at least every 5 minutes while the app is open. Open this page any time to push an update.")
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift

    /// Extracted from the body so the SwiftUI type-checker doesn't choke on the modifier chain.
    private func handleOnAppear() {
        // Hydrate pending-invite state and snapshot whatever the share manager has so we
        // don't auto-bind already-known partners as if they just appeared.
        Task { @MainActor in
```

with:

```swift

    /// Extracted from the body so the SwiftUI type-checker doesn't choke on the modifier chain.
    private func handleOnAppear() {
        // Every appearance, coming back from a partner page or the Crewlu Cloud screen too:
        // whose schedule this phone holds may have changed, and the list is read again (spec §6.2).
        ownerCheckTick = UUID()
        statusRefreshTick = UUID()
        store.accountChanged()
        Task { await store.refresh() }
        guard !hasAppeared else { return }
        hasAppeared = true

        // Hydrate pending-invite state and snapshot whatever the share manager has so we
        // don't auto-bind already-known partners as if they just appeared.
        Task { @MainActor in
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift

        // First-time visitors who aren't already sharing see an SKOverlay introducing
        // Crewluve. Delayed slightly so it doesn't collide with view-appear animations.
        if !crewluveOverlayShown && !beaconManager.isSharing {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                guard !crewluveOverlayShown else { return }
                SKOverlayPresenter.presentCrewluve(campaignToken: "duty-partnersharing")
```

with:

```swift

        // First-time visitors who aren't already sharing see an SKOverlay introducing
        // Crewluve. Delayed slightly so it doesn't collide with view-appear animations.
        if !crewluveOverlayShown && !isSharingActive {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                guard !crewluveOverlayShown else { return }
                SKOverlayPresenter.presentCrewluve(campaignToken: "duty-partnersharing")
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
        Task {
            await beaconManager.awaitInitialization()
            await updateStatusNow()
            await beaconManager.refreshParticipants()

            // Re-snapshot now that the share manager has finished loading. From here on,
            // newly-appearing participants are treated as fresh acceptances and may
```

with:

```swift
        Task {
            await beaconManager.awaitInitialization()
            await updateStatusNow()

            // Re-snapshot now that the share manager has finished loading. From here on,
            // newly-appearing participants are treated as fresh acceptances and may
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
            partnerListInitialized = true
            Task { @MainActor in await processNextUnboundParticipant() }

            if beaconManager.isSharing, let pilot = activePilot {
                PartnerBeaconAutoSync.shared.startMonitoring(modelContext: modelContext, pilotInfo: pilot)
            }
        }
```

with:

```swift
            partnerListInitialized = true
            Task { @MainActor in await processNextUnboundParticipant() }

            if isSharingActive, let pilot = activePilot {
                PartnerBeaconAutoSync.shared.startMonitoring(modelContext: modelContext, pilotInfo: pilot)
            }
        }
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
    }
}

/// Simple share link view using ShareLink (iOS 16+)
struct ShareLinkView: View {
    let shareURL: URL
    @Binding var isPresented: Bool
    /// Optional name to pre-fill the partner name field — used by Re-share on a pending row.
    var prefilledName: String = ""
    /// Called with the trimmed partner name when the user actually fires a share or copy.
    /// Callers use this to record a pending invite (or no-op on re-share).
    var onSent: ((String) -> Void)? = nil

    @State private var partnerName: String = ""
    @FocusState private var nameFieldFocused: Bool
    @Environment(\.dismiss) private var dismiss

    private var trimmedName: String {
        partnerName.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var isNameReady: Bool { !trimmedName.isEmpty }

    /// Wraps the raw CKShare URL in a `crewluv://accept-share?url=…` custom scheme
    /// so tapping the link opens the Crewluve app directly.
    private var crewluvURL: URL {
        var components = URLComponents()
        components.scheme = "crewluv"
        components.host = "accept-share"
        components.queryItems = [URLQueryItem(name: "url", value: shareURL.absoluteString)]
        return components.url ?? shareURL
    }

    var body: some View {
        NavigationStack {
```

with:

```swift
    }
}

/// The invite sheet (partner links, spec §6.4): name the person, then share or copy their
/// invite link. The first tap makes their partner on Crewlu Cloud; later taps, Share or
/// Copy, get the same partner, renamed if the name changed.
struct ShareLinkView: View {
    @Binding var isPresented: Bool

    /// Made when the sheet opens, with a new reference for this person.
    @State private var invite = PartnerInviteLink(store: .shared)
    @State private var partnerName: String = ""
    @State private var making: Making?
    @State private var shareItem: PartnerShareItem?
    @State private var copied = false
    @State private var errorMessage: String?
    @FocusState private var nameFieldFocused: Bool

    private enum Making { case share, copy }

    private var trimmedName: String {
        partnerName.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var isNameReady: Bool { !trimmedName.isEmpty }

    var body: some View {
        NavigationStack {
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
                        ShareLinkStepRow(
                            number: 2,
                            title: "Name this partner",
                            detail: "Type who you\u{2019}re sharing with so you can tell pending invites apart \u{2014} this becomes their label once they accept."
                        )
                        ShareLinkStepRow(
                            number: 3,
                            title: "Share your pairing link",
                            detail: "Tap \u{201C}Share Pairing Link\u{201D} and send it however you like \u{2014} Messages, Mail, anything. They open the link in Crewluve and your status starts updating automatically."
                        )
                    }
                    .padding(.horizontal, 24)
```

with:

```swift
                        ShareLinkStepRow(
                            number: 2,
                            title: "Name this partner",
                            detail: "Type who you\u{2019}re sharing with. This becomes their name in your list."
                        )
                        ShareLinkStepRow(
                            number: 3,
                            title: "Share their invite link",
                            detail: "Tap \u{201C}Share Invite Link\u{201D} and send it however you like. When they tap it on their iPhone or iPad, Crewluve connects by itself."
                        )
                    }
                    .padding(.horizontal, 24)
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
                    .padding(.horizontal, 32)

                    VStack(spacing: 12) {
                        ShareLink(
                            item: crewluvURL,
                            subject: Text("Pilot Status"),
                            message: Text("Open this link in the Crewluve app to see my status")
                        ) {
                            HStack {
                                Image(systemName: "square.and.arrow.up")
                                Text("Share Pairing Link")
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
```

with:

```swift
                    .padding(.horizontal, 32)

                    VStack(spacing: 12) {
                        Button {
                            Task { await make(.share) }
                        } label: {
                            HStack {
                                if making == .share {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Image(systemName: "square.and.arrow.up")
                                }
                                Text("Share Invite Link")
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
                            .cornerRadius(12)
                        }
                        .buttonStyle(PlainButtonStyle())
                        .disabled(!isNameReady)
                        .simultaneousGesture(TapGesture().onEnded {
                            if isNameReady { onSent?(trimmedName) }
                        })

                        Button {
                            guard isNameReady else { return }
                            UIPasteboard.general.url = crewluvURL
                            onSent?(trimmedName)
                        } label: {
                            HStack {
                                Image(systemName: "doc.on.doc")
                                Text("Copy Pairing Link")
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
```

with:

```swift
                            .cornerRadius(12)
                        }
                        .buttonStyle(PlainButtonStyle())
                        .disabled(!isNameReady || making != nil)

                        Button {
                            Task { await make(.copy) }
                        } label: {
                            HStack {
                                if making == .copy {
                                    ProgressView()
                                } else {
                                    Image(systemName: copied ? "checkmark" : "doc.on.doc")
                                }
                                Text(copied ? "Copied" : "Copy Invite Link")
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
                            .foregroundColor(isNameReady ? .primary : .secondary)
                            .cornerRadius(12)
                        }
                        .disabled(!isNameReady)

                        if !isNameReady {
                            Text("Enter a name above to enable sharing.")
```

with:

```swift
                            .foregroundColor(isNameReady ? .primary : .secondary)
                            .cornerRadius(12)
                        }
                        .disabled(!isNameReady || making != nil)

                        if !isNameReady {
                            Text("Enter a name above to enable sharing.")
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
                }
            }
            .onAppear {
                if partnerName.isEmpty { partnerName = prefilledName }
                // Auto-focus only when nothing is pre-filled, so first-time invites get
                // straight to typing without stealing focus during a re-share.
                if prefilledName.isEmpty {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                        nameFieldFocused = true
                    }
                }
            }
        }
    }
}
```

with:

```swift
                }
            }
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                    nameFieldFocused = true
                }
            }
            .sheet(item: $shareItem) { item in
                ActivityShareSheet(link: item.link) { shareItem = nil }
            }
            .alert("Error", isPresented: Binding(
                get: { errorMessage != nil },
                set: { if !$0 { errorMessage = nil } }
            )) {
                Button("OK", role: .cancel) { errorMessage = nil }
            } message: {
                Text(errorMessage ?? "")
            }
        }
    }

    /// Makes the partner (or finds the one an earlier tap made), then shares or copies the link.
    private func make(_ action: Making) async {
        making = action
        let link: URL
        do {
            link = try await invite.link(for: partnerName)
        } catch {
            making = nil
            errorMessage = (error as? PartnerCloudError ?? .unavailable).inviteMessage
            return
        }
        making = nil
        switch action {
        case .share:
            shareItem = PartnerShareItem(link: link)
        case .copy:
            UIPasteboard.general.url = link
            copied = true
            try? await Task.sleep(for: .seconds(2))
            copied = false
        }
    }
}
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
                        icon: "link.badge.plus",
                        iconColor: .green,
                        title: "How to Set It Up",
                        text: "Tap \"Invite Another Partner\", then send the link to your partner. They open it in the Crewluve app and they'll start seeing your status."
                    )

                    helpSection(
```

with:

```swift
                        icon: "link.badge.plus",
                        iconColor: .green,
                        title: "How to Set It Up",
                        text: "Tap \"Invite Another Partner\", type your partner's name, then send them the invite link. When they tap it on their iPhone or iPad, Crewluve connects by itself and they start seeing your status."
                    )

                    helpSection(
```

In `Duty/Views/Settings/PartnerSharingView.swift`, replace:

```swift
                        icon: "lock.shield",
                        iconColor: .gray,
                        title: "Privacy & Security",
                        text: "All data is encrypted and synced via iCloud. Only partners you've explicitly invited can see your status."
                    )

                    helpSection(
```

with:

```swift
                        icon: "lock.shield",
                        iconColor: .gray,
                        title: "Privacy & Security",
                        text: "Your status is stored in your Crewlu Cloud account. Only partners you've invited can see it, each through their own private link."
                    )

                    helpSection(
```

- [ ] **Step 2: Run the harness: nothing it tests changes**

Run:

```bash
"$HARNESS/run.sh"
```

Expected: `Executed 90 tests, with 0 failures`.

- [ ] **Step 3: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Views/Settings/PartnerSharingView.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): Partner Sharing runs on Crewlu Cloud when signed in, with the new invite sheet; otherwise a sign-in prompt above today's screen" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 13: Signing out asks first

**Files:**
- Modify: `Duty/Views/Account/CrewluCloudDetailView.swift`

Spec §6.7: only while Crewlu Cloud partners get updates from this phone.

- [ ] **Step 1: Ask before signing out**

3 replacements, in order, in `Duty/Views/Account/CrewluCloudDetailView.swift`:

In `Duty/Views/Account/CrewluCloudDetailView.swift`, replace:

```swift
    @State private var showingAdoptConfirm = false
    @State private var showDeleteAccount = false
    @State private var showForgotPassword = false
    @State private var pendingReport: SyncReportPayload?
    #if DEBUG
    @State private var debugSyncMode: SyncBackendMode = SyncBackendMode.current
```

with:

```swift
    @State private var showingAdoptConfirm = false
    @State private var showDeleteAccount = false
    @State private var showForgotPassword = false
    @State private var showingSignOutConfirmation = false
    @State private var pendingReport: SyncReportPayload?
    #if DEBUG
    @State private var debugSyncMode: SyncBackendMode = SyncBackendMode.current
```

In `Duty/Views/Account/CrewluCloudDetailView.swift`, replace:

```swift

                Section {
                    Button(role: .destructive) {
                        run { try await account.signOut() }
                    } label: { Text("Sign Out") }

                    Button(role: .destructive) {
```

with:

```swift

                Section {
                    Button(role: .destructive) {
                        // Partner links (spec §6.7): ask first when Crewlu Cloud partners get updates from here.
                        if PartnerCloudStore.shared.isCloudSharing {
                            showingSignOutConfirmation = true
                        } else {
                            run { try await account.signOut() }
                        }
                    } label: { Text("Sign Out") }

                    Button(role: .destructive) {
```

In `Duty/Views/Account/CrewluCloudDetailView.swift`, replace:

```swift
            }
        } message: {
            Text("This device's schedule belongs to a different Crewlu Cloud account, so sync is paused. You can move everything on this device onto the account you just signed in as — nothing is deleted — or erase this device and download the other account's schedule instead.")
        }
        .alert("Crewlu Cloud", isPresented: Binding(
            get: { errorMessage != nil },
```

with:

```swift
            }
        } message: {
            Text("This device's schedule belongs to a different Crewlu Cloud account, so sync is paused. You can move everything on this device onto the account you just signed in as — nothing is deleted — or erase this device and download the other account's schedule instead.")
        }
        .alert("Sign Out?", isPresented: $showingSignOutConfirmation) {
            Button("Sign Out", role: .destructive) {
                run { try await account.signOut() }
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Your partners stop getting updates until you sign back in.")
        }
        .alert("Crewlu Cloud", isPresented: Binding(
            get: { errorMessage != nil },
```

- [ ] **Step 2: Commit**

Run:

```bash
git -C ~/Dev/Duty add Duty/Views/Account/CrewluCloudDetailView.swift && git -C ~/Dev/Duty commit -q -m "feat(partners): Sign Out asks first while partners get updates from this phone" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty status --short` shows only the Xcode scheme lines again.

### Task 14: Compile everything, without a simulator

**Files:** none. A build in a separate clone of the branch, with its own build folder and its own copy of the Swift packages, so it can't disturb the user's open Xcode or touch a simulator. It compiles the app and `DutyTests`, including the views and the iCloud manager the harness can't build.

- [ ] **Step 1: Make the clone**

Use a scratch folder outside both repos as `$BUILD`, for example `export BUILD=<your scratchpad>/partner-screens-build`. `Config.xcconfig` is ignored by git, so it's copied; never print it.

Run:

```bash
rm -rf "${BUILD:?set BUILD first}" && mkdir -p "$BUILD" && git clone -q --shared ~/Dev/Duty "$BUILD/duty" && git -C "$BUILD/duty" switch -q feature/partner-cloud-screens && cp ~/Dev/Duty/Config.xcconfig "$BUILD/duty/" && cp -R "$(ls -dt ~/Library/Developer/Xcode/DerivedData/Duty-*/SourcePackages | head -1)" "$BUILD/packages" && git -C "$BUILD/duty" log --oneline -1
```

Expected: the branch's last commit: Task 13's `feat(partners): Sign Out asks first…`, or a later fix from Task 15.

- [ ] **Step 2: Build for testing**

It takes several minutes, so run it in the background and wait for it to finish.

Run:

```bash
cd "$BUILD/duty" && xcodebuild build-for-testing -project Duty.xcodeproj -scheme Duty -destination "generic/platform=iOS Simulator" -derivedDataPath "$BUILD/derived" -clonedSourcePackagesDirPath "$BUILD/packages" -disableAutomaticPackageResolution -quiet > "$BUILD/build.log" 2>&1; echo "exit $?"; echo "errors: $(grep -c error: "$BUILD/build.log")"
```

Expected: `exit 0` and `errors: 0`. `grep warning "$BUILD/build.log"` shows only the existing StoreKit deprecation warning. Nothing to commit.

If the log says the packages don't match `Package.resolved`, delete `$BUILD/packages` and run the build again without `-clonedSourcePackagesDirPath` and `-disableAutomaticPackageResolution`. It then downloads them into `$BUILD/derived`, which takes a few minutes more.

### Task 15: Review

**Files:** whatever the review finds.

- [ ] **Step 1: Ask for a review**

Use superpowers:requesting-code-review with a read-only reviewer: it reads `git -C ~/Dev/Duty diff 4ff32814..feature/partner-cloud-screens`, this plan, the approved mockups described in it, and the spec (§6, §7.5, §8.1, §12), and runs no `xcodebuild` and no simulator. State facts neutrally, and don't tell it what not to flag.

- [ ] **Step 2: Act on it**

For each finding, fix it test-first where the harness can test it, re-run `"$HARNESS/run.sh"`, and commit. If any Swift changed, run Task 14 again. Note each fix in this plan's Execution notes.

### Task 16: The user runs CrewLu's tests

**Files:** none.

- [ ] **Step 1: Ask the user to run the tests in Xcode**

Send them these steps:

1. In Xcode, at the top of the window, check that the scheme says **Duty** and the destination is an iPhone **simulator** (such as iPhone 17 Pro), not your phone. On a phone, tests that read files on the Mac can't: the examples test and `CaptureOCRFixturesTests` skip, and `MatrixAuditTests` fails.
2. Press **⌘U** (Product → Test) and wait for it to finish.
3. Press **⌘6** to open the Test navigator. Red marks show failures.

Expected: no failures. The partner classes, counted before Task 15's fixes:

| Class | Tests |
|---|---|
| `PartnerCloudErrorTests` | 5 |
| `PartnerSettingsTests` | 6 (four new) |
| `PartnerSummaryEncoderTests` | 17 |
| `PartnerCloudStoreTests` | 23 (thirteen new) |
| `PartnerSummaryCloudWriterTests` | 21 (one replaced by four) |
| `PartnerListTests` | 9 (new) |
| `PartnerSharingScreenTests` | 6 (new) |
| `PartnerInviteLinkTests` | 8 (new) |
| `PartnerBeaconModeIndependenceTests` | 4 |

- [ ] **Step 2: If anything fails, stop**

Ask for the test's name and its message. Fix the cause, never the test's expected value, then ask for another run.

### Task 17: The user looks at the screens

**Files:** none.

- [ ] **Step 1: Offer the look, and say what it touches**

Ask the user one question: do they want to see the screens in the simulator now? It's their choice, because it uses their real Crewlu Cloud account: inviting a test partner makes a real (unconnected) partner there until they remove it, and the simulator becomes the newest CrewLu to write their summary, which is fine because the release build will be newer. Nobody can see that summary yet: Crewluve piece 4 isn't out.

- [ ] **Step 2: If yes, send the steps**

1. In Xcode, check the scheme says **Duty** and the destination is an iPhone **simulator**.
2. Press **⌘R** (Product → Run). The app opens in the simulator.
3. Open **Partner Sharing**: on the schedule, tap the gear at the bottom right, then **Partner Sharing**. (The share button at the bottom, then **Share Now to Partner**, opens it too.) If it says "Pro Subscription Required", the debug Pro bypass is off: on the Crewlu Cloud screen's Developer section, turn on **DEBUG: Pro bypass**, then quit and rerun.
4. **Not signed in:** the top shows "Partner Sharing uses Crewlu Cloud." (or "now uses", if you share through iCloud) with **Sign In**. Tap it: the Crewlu Cloud screen opens. Sign in there yourself, then tap **‹ Back**.
5. **Signed in:** tap **Start Sharing** (or **Invite Another Partner** if you share through iCloud, whose partners show as "Needs Crewluve update"). Type a test name such as "Test", and tap **Share Invite Link**: a spinner, then the share sheet. Close it without sending.
6. Back on the list, "Test" shows as "Pending invite", "Sent … ago". Tap it: its page says "Not opened yet". Try **Send Link Again** and **New Link**, then **Remove Test** and confirm.
7. On the Crewlu Cloud screen, **Sign Out** asks first only while you have partners; with "Test" removed it signs out straight away.

Note anything that looks wrong with a screenshot (⌘S in the simulator saves one to the Desktop).

### Task 18: Record the decisions

**Files (in `~/Dev/Crewluve Website`):**
- Modify: `docs/superpowers/specs/2026-10-16-partner-links-piece2-crewlu-design.md`, and this plan

- [ ] **Step 1: Add the planning decisions to the spec**

At the end of the spec, after §12, add `## 13. Decisions made while planning 2b`, followed by this plan's "Decisions made while planning" list, copied as it stands, and any changes from the review (Task 15). Then update its status line.

In `~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-16-partner-links-piece2-crewlu-design.md`, replace:

```markdown
Plan 2a is built (`docs/superpowers/plans/2026-10-16-partner-links-piece2a-summary.md`); next: plan 2b.
```

with:

```markdown
Plans 2a and 2b are built (`docs/superpowers/plans/2026-10-16-partner-links-piece2a-summary.md`, `docs/superpowers/plans/2026-10-17-partner-links-piece2b-screens.md`); next: plan 2c.
```

- [ ] **Step 2: Tick this plan and commit**

Run:

```bash
cd ~/"Dev/Crewluve Website" && git add docs/superpowers/specs/2026-10-16-partner-links-piece2-crewlu-design.md docs/superpowers/plans/2026-10-17-partner-links-piece2b-screens.md && git commit -q -m "Plan 2b built: the partner screens on Crewlu Cloud; spec records the planning decisions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit. Don't push.

### Task 19: Finish

**Files:** none.

- [ ] **Step 1: Ask how to merge**

2b shows pilots Crewlu Cloud screens and makes invite links, which only the new Crewluve (piece 4) can take; the release waits for 2c and Crewluve anyway (P2-1). Ask the user one question: merge into `feature/supabase-account-backend` now (a fast-forward with `git fetch . feature/partner-cloud-screens:feature/supabase-account-backend`, so no file changes on disk while Xcode is open, then delete the branch), or keep the branch until 2c.

- [ ] **Step 2: Push only with a fresh yes**

Ask separately before pushing `feature/supabase-account-backend` in `~/Dev/Duty`, and separately again before pushing `main` in `~/Dev/Crewluve Website`.

---

## Execution notes

Filled in during the build: any place the code ends up different from the printed blocks, and why.
