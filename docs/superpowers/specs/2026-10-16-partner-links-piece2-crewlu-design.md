# Partner Links Piece 2: CrewLu on Crewlu Cloud

- **Status:** design approved in brainstorming on 2026-10-16, and the user approved this spec the same day. Plans 2a, 2b and 2c are built (`docs/superpowers/plans/2026-10-16-partner-links-piece2a-summary.md`, `docs/superpowers/plans/2026-10-17-partner-links-piece2b-screens.md`, `docs/superpowers/plans/2026-10-17-partner-links-piece2c-move-over.md`).
- **Part of:** the partner-links design, `docs/superpowers/specs/2026-10-15-partner-links-design.md`, §7.1, §8 and §9 (piece 2).
- **Repo:** CrewLu, `~/Dev/Duty`, on a new branch off `feature/supabase-account-backend` (§9).
- **Contract:** `~/Dev/Duty/supabase/partner-api.md`, the partner door from piece 1, live since 2026-10-15.

## 1. Goal

1. **CrewLu writes the partner summary to Crewlu Cloud**, in the cloud's format, next to the iCloud record.
2. **Partner Sharing runs on Crewlu Cloud when the pilot is signed in:** one invite link per person, a partner list with devices, and a partner page.
3. **Everyone already connected through iCloud moves over by themselves,** through move tickets in the iCloud record. Once all of them are on the new Crewluve, the iCloud share ends.
4. **New invites need Crewlu Cloud.** A pilot who isn't signed in keeps their iCloud partners and is asked to sign in.

## 2. What's there now (checked 2026-10-16)

All paths are in `~/Dev/Duty` unless they say Crewluv.

### 2.1 Partner Sharing on iCloud

- **The share.** `PilotStatusBeaconManager` (`Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift`, `@MainActor @Observable`, `.shared`) keeps one `CKShare` with `publicPermission = .readOnly` for everyone.
  - Partners are the share's participants. Each one's id is their iCloud user record name (`stableID`, 453-468).
  - Their name is the pilot's nickname (`partnerNickname.<id>`), else their iCloud name (365-389).
- **Removing and stopping.**
  - `removePartner` (513) calls `stopSharing()` when the last participant goes.
  - `stopSharing` (560-588) deletes the share and the record, and wipes every per-partner setting (`clearAllLocalPartnerState`, 653).
- **The build guard.** A device refuses to write when the record carries a newer `writerBuildVersion` than its own `CFBundleVersion` (330-352). The message is `SyncGuidanceCopy.staleLocalBuildMessage`.

### 2.2 When the summary is written

`PartnerBeaconAutoSync` (`Duty/Utils/PartnerBeacon/PartnerBeaconAutoSync.swift`) writes while `partnerBeacon.isSharing` is set. Its triggers:
- a change to hidden events, and `.scheduleDidChange`;
- coming back to the app (`syncNowIfSharing()`, `Duty/App/DutyApp.swift:1121`, which runs beside the Crewlu Cloud sync, not after it), and the trip list (`Duty/Views/Trip/TripListView.swift:837`);
- `forceUpdate`, from the quick status sheet;
- a 5-minute loop while the app is open.

How the writes behave:
- **Becoming active** only resumes the loop.
- **The 30 s minimum** (line 20) holds back only the 5-minute loop, because every other trigger resets it.
- **A write is skipped** when the status `isEquivalent` to the last one sent, ignoring `lastUpdated` and `localTimeAtPilot`. `lastSentStatus` is set even when the write failed.
- **Pro isn't checked here.** Only the screen checks it (`Duty/Views/Settings/PartnerSharingView.swift:232`).
- **Update Status Now and the screen's `onAppear`** call `beaconManager.updateStatus` directly (`PartnerSharingView.swift:506-535`), not through `PartnerBeaconAutoSync`.

### 2.3 The summary and per-partner settings

- **Who builds it.** `PartnerStatusGenerator` builds `SharedPilotStatus` (`Duty/Models/SharedPilotStatus.swift:25-119`). Three of its fields are `Data` blobs: `tripLegsJSON`, `quickStatusByPartnerJSON` and `displayNameByPartnerJSON`.
- **Per-partner settings** live in UserDefaults and are mirrored across the pilot's devices by `PartnerDataKVSync.swift`:
  - `crewluve.quickStatusByPartner`: `[id: PartnerQuickStatusEntry]` (`SharedPilotStatus.swift:12`), written with the default `JSONEncoder`, so `expiry` counts seconds from 2001. The key `__everyone__` means everyone;
  - `crewluve.displayNameByPartner`: `[id: String]`;
  - the nicknames.
- **The top-level quick status** is taken from the first entry sorted by key (`PartnerStatusGenerator.swift:183-259`):
  - `quickStatusTargets` is nil when `__everyone__` exists, else that first key;
  - `isSleeping` is true when any entry is "Sleeping".
- **The quick status sheet** (`Duty/Views/Settings/PartnerQuickStatusSheet.swift:479-570`):
  - Send To with every partner picked (when there's more than one) writes `__everyone__` plus each id;
  - otherwise it writes only the picked ids.
- **What Crewluve shows.** Crewluve shows the top-level quick status to every partner. It never reads `quickStatusByPartnerJSON` or `quickStatusTargets` (checked on Crewluv `hotfix/icloud-account-unavailable`: `PilotStatusView.swift:625-639`). So today a quick status sent to one person shows for everyone. Display names are already per person (`PartnerStatusReceiver.swift:223-240`).

### 2.4 Invites today

- **One link for everyone.** Every invite is the same share link, wrapped as `crewluv://accept-share?url=…` (`ShareLinkView`, `PartnerSharingView.swift:1540-1704`).
- **Pending invites** are labels kept on one device only for 14 days (`PendingPartnerInvites.swift`). A newly accepted participant takes a pending label:
  - by itself when there's one (`PartnerSharingView.swift:1325-1352`);
  - through the Match Invite sheet when there are more (1464-1537).

### 2.5 Crewlu Cloud in CrewLu

- **The client.**
  - `SupabaseClientProvider.shared` (supabase-swift 2.46.0). RPCs are called as in `Duty/Utils/Sync/SyncTransport.swift:125-141`.
  - The SDK encodes dates as ISO-8601, so the summary must be encoded before it's handed over.
- **The account.**
  - `AccountController.shared` has `isSignedIn` and `currentUserID`. A pilot can be signed in while their schedule syncs through iCloud.
  - Signing out posts no notification (160-170), and Sign Out asks for no confirmation (`Duty/Views/Account/CrewluCloudDetailView.swift:110-113`).
  - An expired session shows as `SupabaseSyncEngine.shared.sessionExpired`.
- **The owner rule.** `SyncOwnerGuard.allowsSync(uid:)` (`Duty/Utils/Sync/SyncOwnerGuard.swift:19-22`) is true with no owner stamp, or when the stamp is that account. The app's wording when it fails: "This phone's schedule belongs to a different Crewlu Cloud account." (`Duty/Views/Account/CrewluCloudHeroCard.swift:108-113`).
- **The spelling.** The app writes "Crewlu Cloud" (98 strings, and never "CrewLu Cloud").
- **The server.** `partner_create` with a reference it already knows returns that partner unchanged, without renaming (`supabase/migrations/20261015120100_partner_links_pilot_rpcs.sql:98-128`).

### 2.6 Tests and build

- **Existing tests.** `DutyTests/PartnerBeaconModeIndependenceTests.swift` (64 lines) keeps the iCloud side independent of `SyncBackendMode`. Nothing tests the manager, auto-update, key-value sync, invites or encoding.
- **Stand-ins.** `DutyTests/Helpers/AccountStubs.swift` and `StubSyncTransport.swift`.
- **The build.** iOS 18, Swift 5 mode. New files in `Duty/` and `DutyTests/` need no project-file edit.
- **The user runs CrewLu's tests** (⌘U). Claude runs the SQL tests in `supabase/tests`.
- **Branches.** `feature/supabase-account-backend` holds the live Crewlu Cloud code, 477 commits ahead of `main` (2.6.5, July). This spec was checked at `5d05f342`. Plan 2a starts from `282a6cc0`. The commits between the two add the Appendix B history migration, comment warnings in old migration files, their SQL tests and docs. No Swift file changed.

## 3. Decisions (brainstorm, 2026-10-16)

| # | Decision |
|---|---|
| P2-1 | **CrewLu ships after Crewluve.** Its release follows Crewluve's piece 4, because invite links need the new Crewluve. The order is a release-day checklist item, with no feature switch. |
| P2-2 | **Partners still on iCloud are marked.** Their row says "Connected through iCloud" with a "Needs Crewluve update" tag. Their page says they move over automatically after updating Crewluve. |
| P2-3 | **A quick status reaches only the people picked** in Send To, or everyone. The cloud summary carries per-person entries plus an everyone-status. Crewluve (piece 4) and the website (piece 5) show the partner's own entry first. This fixes §2.3. |
| P2-4 | **New parts beside the iCloud code,** in `Duty/Utils/PartnerCloud/`. The iCloud code changes only for the tickets, the settings lookup and ending the share, so piece 6 removes it cleanly. |
| P2-5 | **Signed in, the screen runs on Crewlu Cloud.** Not signed in, it shows a prompt, plus today's screen minus inviting while an iCloud share exists. |
| P2-6 | **Signing out asks first when there are cloud partners.** Partners keep the last status. |
| P2-7 | **The example summaries are built from test schedules,** not from anyone's real schedule. |

## 4. The parts

### 4.1 New

| File | Does |
|---|---|
| `Duty/Utils/PartnerCloud/PartnerCloudAPI.swift` | A protocol for the pilot RPCs and the `partners` and `partner_devices` reads, its live version over `SupabaseClientProvider.shared`, and one error type: `notSignedIn` (401), `refused(code)` (400, 404, 409, 413) and `unavailable` (network, 5xx). Tests use a stand-in. |
| `Duty/Utils/PartnerCloud/PartnerSummaryEncoder.swift` | Pure. Turns a `SharedPilotStatus`, the per-person settings and the cloud partner ids into the cloud JSON (§5.1). |
| `Duty/Utils/PartnerCloud/PartnerSummaryCloudWriter.swift` | Sends the summary (§5.2). |
| `Duty/Utils/PartnerCloud/PartnerCloudStore.swift` | `@MainActor @Observable`, `.shared`. The account's partners and devices, cached per account, and the actions (§6). |
| `Duty/Utils/PartnerCloud/PartnerSettings.swift` | Reads and writes the per-person settings: by cloud id first, then iCloud id, and the reverse lookup for the iCloud record (§6.6). |
| `Duty/Utils/PartnerCloud/PartnerMoveOver.swift` | The move-over: a pure decision function and the runner that makes the calls (§7). |
| `Duty/Utils/PartnerCloud/PartnerMoveOverNotes.swift` | The move-over's notes, synced across the pilot's devices (§7.1). |
| `Duty/Views/Settings/PartnerDetailView.swift` | The partner page (§6.3). |
| `Duty/Views/Settings/PartnerCloudPrompt.swift` | The sign-in prompt section (§6.1). |
| `Duty/Views/Settings/ActivityShareSheet.swift` | A small share sheet that can open after the invite is created. SwiftUI's `ShareLink` needs the link before the tap. |

### 4.2 Changed

| File | Change |
|---|---|
| `PartnerBeaconAutoSync.swift` | It writes, and resumes its loop, while iCloud sharing **or** Crewlu Cloud sharing is on, so `resumeMonitoringIfNeeded` and `syncNowIfSharing` check both. It also calls the cloud writer next to the iCloud write in `performUpdate` and `forceUpdate`. Without this, cloud-only sharing would never restart the loop, because today both checks read only `partnerBeacon.isSharing`. |
| `PilotStatusBeaconManager.swift` | It writes `moveTicketByPartnerJSON` into the record (§7.4), and gains `endICloudShare()`, which keeps cloud partners' settings. `removePartner` no longer calls `stopSharing()` while Crewlu Cloud sharing is on. |
| `PartnerStatusGenerator.swift` | It builds the iCloud record's per-person maps through `PartnerSettings`, so a moved-over person's old Crewluve sees the settings stored under their cloud id. |
| `PartnerSharingView.swift` | The Crewlu Cloud version when signed in (§6.2), and today's version with the prompt when not (§6.1). Update Status Now and `onAppear` go through `PartnerBeaconAutoSync.forceUpdate`. |
| `ShareLinkView` (in `PartnerSharingView.swift`) | The invite link and its copy (§6.4). |
| `PartnerQuickStatusSheet.swift` | When signed in, it lists the cloud partners, and the nickname renames the cloud partner (§6.5). |
| `PartnerDataKVSync.swift` | It also syncs the move-over notes. |
| `CrewluCloudDetailView.swift` | Sign Out asks first when there are cloud partners (§6.7). |
| `SyncGuidanceCopy.swift` | Adds the cloud version of the newer-build message (§5.2). |

**How it fits together.** Every trigger goes through `PartnerBeaconAutoSync`. It generates the summary once, then hands it to the iCloud writer (while an iCloud share exists) and to the cloud writer. The screens talk to `PartnerCloudStore`, which talks to `PartnerCloudAPI`. The move-over reads the iCloud participants and the cloud store, then hands tickets to the iCloud writer.

## 5. The cloud summary (part 2a)

### 5.1 Its shape

The JSON object passed as `p_status`:
- **Every stored field of `SharedPilotStatus`, under its Swift name,** except the three `Data` blobs. Every date counts seconds from 1970, as a number. That includes the dates inside trip legs and quick statuses, so the encoder converts the saved quick statuses, which count from 2001.
- **`tripLegs`:** the `TripLeg` list from `tripLegsJSON`, or null when the iCloud record would carry none.
- **`displayNameByPartner`:** `{cloud id: name}` for current cloud partners whose name isn't empty, or null when there are none.
- **`quickStatusByPartner`:** `{cloud id: {status, icon, expiry}}` for current cloud partners, without expired entries, or null when there are none. `expiry` is null for no limit.
- **The everyone-status.** `quickStatus`, `quickStatusIcon` and `quickStatusExpiry` hold the `__everyone__` entry while it hasn't expired, with `quickStatusTargets: null`. Without one, those three are null and `quickStatusTargets` is `[]`.
- **`isSleeping`:** true only when the everyone-status is "Sleeping".
- **`schemaVersion: 1`.**
- **Never in it:** the three blobs, `__everyone__`, iCloud ids, or move tickets.
- **Cloud ids** are lower-case, as the server returns them. Swift's `UUID().uuidString` is upper-case, so ids always come from the server's answers.

**What partners see** (piece 1's door). Each partner gets their own entries and the everyone-status, and nothing else that's per person.

### 5.2 Sending it

- **When.** `performUpdate` and `forceUpdate` call it, so it runs on every trigger in §2.2, including Update Status Now and the quick status sheet.
- **Only when all three hold:**
  - the pilot is signed in;
  - `SyncOwnerGuard.allowsSync(uid:)` is true for that account;
  - that account's cached partner list isn't empty. `PartnerCloudStore` refreshes it at launch and on coming back to the app (§6.2), so a newly signed-in device starts writing without anyone opening the screen.
- **Skipped** when the encoded summary, ignoring `lastUpdated` and `localTimeAtPilot`, equals the last one the server applied for that account. This record is kept apart from the iCloud writer's.
- **One write at a time.** A summary that arrives during a write waits, and replaces any older waiting one. It's sent when the write in flight finishes.
- **`p_build`** is `CFBundleVersion` as an integer, the same number the iCloud guard uses.
- **The answers:**
  - `{"applied": true}` records this summary as the last applied one;
  - `{"applied": false}` means a newer CrewLu on another device wrote first. The screen shows: "Another of your devices has a newer version of CrewLu. Update CrewLu on this device to share your status from here." Nothing is resent until the next trigger.
- **Errors:**
  - `notSignedIn` writes nothing, and the screen shows the expired sign-in prompt (§6.1);
  - `unavailable` keeps the summary waiting, and the next trigger retries it;
  - `refused` is a bug. It's logged with `debugLog`, and that summary isn't retried.

### 5.3 One contract for three apps

The contract lives in `supabase/partner-status/` in Duty:
- **`schema.json`:** a JSON Schema (2020-12) of the object in §5.1, with every field, its type and whether it can be null. Unknown fields are refused at the top level, in quick status entries and in trip legs, so a new field has to be added on purpose.
- **`examples/*.json`:** home, in flight with legs, layover, turn, commuting, a hidden trip left out, an everyone-status, a status for one partner, and display names. Each is built from a test schedule.

Who checks it:
- **CrewLu's tests** build each example's status and settings in code, and check that the encoder's JSON equals the file. They read it through `#filePath`.
- **The SQL tests** check that each example matches the schema (with `ajv` as a test-only dependency), and that `set_partner_status` accepts it. Then `partner_view` shows partner A only A's entries plus the everyone-status, and a status sent only to A stays hidden from partner B.
- **Crewluve (piece 4) and the website (piece 5)** copy these files.

`partner-api.md` points to them from its summary section.

## 6. The partner screens (part 2b)

### 6.1 Which screen

The whole screen still needs Pro first, as today. After that:

| State | At the top | Below |
|---|---|---|
| Signed in, and the schedule on this phone is that account's | — | The Crewlu Cloud screen (§6.2) |
| Signed in, schedule belongs to another account | "This phone's schedule belongs to a different Crewlu Cloud account." with See Your Options, which opens the Crewlu Cloud screen | Today's screen minus inviting, while an iCloud share exists |
| Session expired | "Your Crewlu Cloud sign-in expired. Sign in again to keep sharing." with Sign In | The same |
| Not signed in, iCloud share running | "Partner Sharing now uses Crewlu Cloud." / "Sign in to keep sharing." with Sign In | Today's screen without Invite Another Partner, and without Re-share on pending invites. Its partners keep getting updates. |
| Not signed in, never shared | "Partner Sharing uses Crewlu Cloud." / "Sign in to start sharing." with Sign In | — |

Sign In opens the Crewlu Cloud screen (`CrewluCloudDetailView`).

### 6.2 The Crewlu Cloud screen

- **The hero** is as today:
  - "Sharing Active" while there's a cloud partner or an iCloud share is running;
  - "Updated … ago" counts from the later of the last applied cloud write and the last iCloud write;
  - the newer-build message (§5.2) appears in the error section.
- **Shared With**, one row per person. A row's kind is decided in this order: still on iCloud, then connected, then not opened yet.
  - **connected:** blue initial, the name, "2 devices · seen today", and today's quick-status bubble.
    - "Seen" is the newest `last_seen_at` among their devices: "seen today", "seen yesterday" or "seen 3 days ago", by calendar day in local time.
    - The count reads "1 device" or "N devices".
  - **still on iCloud** (an accepted iCloud participant with no `app` device): the name with the orange "Needs Crewluve update" tag, then "Connected through iCloud" (P2-2);
  - **not opened yet** (no devices): today's orange row, "Pending invite" and "Sent … ago", from `created_at`;
  - **sent before the update:** a pending label that's still open. It keeps today's row until it's accepted or 14 days old.
- **Tapping a row** opens the partner page. Pending labels from before the update stay untappable, as today.
- **Swipes:**
  - connected and iCloud rows: Remove, with today's alert;
  - not opened yet: Delete, with no alert as today, and Re-share, which is Send Link Again;
  - sent before the update: Delete drops the label, and Re-share creates a cloud partner with that name, opens the share sheet and drops the label.
- **Actions:**
  - Invite Another Partner;
  - Update Status Now (through `forceUpdate`);
  - Stop Sharing with Everyone, with today's alert. It calls `partner_remove_all`, ends any iCloud share, and clears every per-person setting and the move-over notes;
  - Start Sharing, shown with no partners, opens the invite sheet.
- **The list refreshes** at launch and on coming back to the app while signed in, on opening the screen, on pull to refresh, and after each action.
- **About Partner Sharing:** "Secure via iCloud" becomes "Secure via Crewlu Cloud": "Your status is stored in your Crewlu Cloud account. Each partner gets a private link and sees only your status."

### 6.3 The partner page (`PartnerDetailView`)

- **The header:** the initial, the name, and "Sees you as {display name}". The display name defaults to the pilot's first name.
- **Devices.** The icon follows the kind: an iPhone for `app`, "{label}", "Crewluve · seen …"; a globe for `web`, "Website · seen …". The footer says "Swipe a device to remove it."
  - **Removing one** asks "Remove This Device?" / "{label} stops seeing your status. {name}'s other devices stay connected.", then calls `partner_remove_device`.
  - **With no devices:** "Not opened yet", with the footer "{name} connects by tapping the invite link."
  - **Still on iCloud:** "iCloud · older Crewluve", "Still connected", with the footer "{name} moves over automatically after updating Crewluve."
- **Send Link Again** opens the share sheet with their link (§6.4).
- **New Link** asks "Make a New Link?" / "The current link stops working. Devices already connected stay connected." Then it calls `partner_new_link` and opens the share sheet with the new link.
- **Nickname and Quick Status** opens `PartnerQuickStatusSheet` for this person (§6.5).
- **Remove {name}** uses today's alert: "Remove Partner?" / "Remove {name}? They will no longer see your status." It then removes them as in §7.5 and returns to the list.
- **Errors:**
  - `unavailable` says "Couldn't reach Crewlu Cloud. Check your connection and try again.";
  - `PT404`, someone already removed from another device, refreshes and returns to the list.

### 6.4 Invites (`ShareLinkView`)

- **Today's three steps stay.** Step 2's detail becomes: "Type who you're sharing with. This becomes their name in your list." Step 3 becomes "Share their invite link": "Tap "Share Invite Link" and send it however you like. When they tap it on their iPhone or iPad, Crewluve connects by itself."
- **The buttons:** Share Invite Link, Copy Invite Link, and Get Crewluve App Store Link, which is unchanged.
- **The message:** "Tap this link to see my status in Crewluve.", with the subject "Pilot Status" as today.
- **The link:** `https://crewluve.crewlu.net/join#t=<invite_token>`.
- **The first tap** calls `partner_create(name, ref)`, with a UUID made when the sheet opens. A spinner shows on the button, then it opens `ActivityShareSheet`, or copies the link.
  - A repeat tap sends the same reference, so it gets the same partner. If the name has changed, it calls `partner_rename`.
  - Closing without sending leaves a "Pending invite" row, as today.
- **Errors:**
  - `unavailable` says "Couldn't create the invite. Check your connection and try again.";
  - `PT409` says "You can share with up to 25 people. Remove someone to invite another."
- **Send Link Again and Re-share** open the share sheet straight away, with the same message and the partner's current `invite_token`.

### 6.5 The quick status sheet

When signed in:
- **Its partners and ids** are the cloud partners.
- **The nickname** calls `partner_rename`, so every device of the pilot sees it. An empty nickname keeps the current name, because a cloud partner's name can't be empty.
- **Display Name and the quick status** are saved under the cloud id. Send To with everyone picked still writes `__everyone__` plus each id.

### 6.6 Per-person settings

- **The same keys as today.** Settings stay in `crewluve.displayNameByPartner` and `crewluve.quickStatusByPartner`, synced as today, but keyed by cloud id for cloud partners.
- **The lookup** for a moved-over person tries the cloud id first, then the iCloud id. The iCloud record maps them back to iCloud ids, through the notes (§7.1).
- **Nicknames** of cloud partners live on Crewlu Cloud (`partners.name`), not in the nickname keys.
- **Clean-up is unchanged.** Pruning expired statuses and the on-duty clearing in `PartnerBeaconAutoSync` work as before, because they don't look at the keys.

### 6.7 Signing out and switching accounts

- **Sign Out asks first,** but only with cloud partners: "Sign Out?" / "Your partners stop getting updates until you sign back in.", with the buttons Sign Out and Cancel.
- **After signing out:**
  - this device forgets that account's cached partner list, and stops cloud writes;
  - partners keep the last status;
  - the screen shows the prompt (§6.1).

  `PartnerCloudStore` watches `AccountController.isSignedIn`, since no notification is posted.
- **Signing in to another account** loads that account's partners. The writer still follows the owner rule (§5.2).

## 7. The move-over (part 2c)

### 7.1 The notes

The notes are kept in UserDefaults and synced by `PartnerDataKVSync`:
- `crewluve.cloudPartnerByICloudID`: `{iCloud id: cloud id}`;
- `crewluve.moveTicketByICloudID`: `{iCloud id: ticket}`;
- `crewluve.removedICloudPartners`: the iCloud ids the pilot removed.

Any device on this version writes the same tickets and the same looked-up settings into the iCloud record, even one that isn't signed in.

### 7.2 When it runs

It runs when three things hold:
- the pilot is signed in;
- `SyncOwnerGuard.allowsSync(uid:)` is true;
- an iCloud share exists.

Then it runs:
- after the share is fetched at launch, and on coming back to the app;
- when Partner Sharing opens;
- when the iCloud participants change.

### 7.3 Each run

Its inputs are the accepted iCloud participants with their names, the cloud partners and devices, the notes, and this device's open pending labels. The decision function returns the steps, and the runner does them in this order.

1. **Create.** Each accepted participant gets a cloud partner. Anyone in the removed list is skipped, and so is anyone without an iCloud id.
   - The call is `partner_create(name, ref: iCloud id)`. The name is their current name in the list, nickname or iCloud name, cut to 60 characters.
   - The answer goes into `cloudPartnerByICloudID`.
   - The name is set only here, at creation. After that, the cloud name is the one that counts.
2. **Copy settings.** Display name and quick status move from the iCloud id to the cloud id, but only where the cloud id has no entry yet.
3. **Tickets.** Each mapped person without an `app` device gets `partner_move_ticket(cloud id)`, saved in `moveTicketByICloudID`. A ticket is dropped once its person has an `app` device or is removed.
4. **Hand over.** When the tickets change, the iCloud record is written again, even if the status didn't change.
5. **End the iCloud share,** when all of these hold:
   - every accepted participant is mapped and has an `app` device;
   - no participant lacks an iCloud id;
   - no pending label is open on this device.

   Then `endICloudShare()`:
   - deletes the share and the record, and clears `partnerBeacon.isSharing`;
   - keeps the cloud partners and their cloud-id settings;
   - clears the iCloud-id settings, the iCloud nicknames, the notes and the pending labels.

Every step is safe to repeat. A run that stops partway, offline or on a server error, is finished by the next one.

### 7.4 The ticket field in the iCloud record

- **The field:** `moveTicketByPartnerJSON`, a JSON object `{iCloud user record name: ticket}` stored as `Data`, like `displayNameByPartnerJSON`.
- **How Crewluve uses it (piece 4):**
  1. it finds its own ticket by `container.userRecordID().recordName`;
  2. it redeems it with `partner_handoff_redeem(p_token, p_device_key, p_kind: 'app', p_label)`.
- **Tickets are never written to Crewlu Cloud.**

### 7.5 Removing someone

- **Someone mapped to an iCloud participant:**
  1. CrewLu removes them from the iCloud share (`removePartner`);
  2. it adds their iCloud id to the removed list;
  3. then it calls `partner_remove`.

  If the iCloud step fails, the error shows and nothing is removed from Crewlu Cloud.
- **A cloud-only partner:** `partner_remove`.
- **The last iCloud participant.** While Crewlu Cloud sharing is on, removing the last one ends the iCloud share through `endICloudShare()`, not `stopSharing()`.

### 7.6 Special cases

- **Late joiners.** Someone who accepts an old iCloud link after the update is moved over like everyone else. A pending label from before the update names them through today's matching, and their cloud partner is renamed to match.
- **The share ended on another device.** A device that finds the iCloud share gone drops its own pending labels, because their link no longer works.
- **A person iCloud can't identify** gets no ticket. They stay on iCloud with the "Needs Crewluve update" tag, and the share stays up for them. Piece 6 deals with anyone left.
- **An older CrewLu** on another of the pilot's devices can't write the iCloud record once this build has, because of the build guard (§2.1).

## 8. Testing

### 8.1 CrewLu's tests

The user runs these with ⌘U. They use a stand-in for `PartnerCloudAPI`, like `AccountStubs`.
- **The encoder:**
  - each example in `supabase/partner-status/examples/` comes out exactly;
  - dates count from 1970, and saved quick statuses are converted from 2001;
  - expired statuses and partners who aren't on Crewlu Cloud are left out;
  - the everyone-status and Sleeping rules hold;
  - no blobs, no `__everyone__`, no iCloud ids and no tickets.
- **The cloud writer:**
  - it writes only when all three conditions hold;
  - one write at a time, and the newest wins;
  - it skips an unchanged summary;
  - it keeps and retries after `unavailable`, and drops after `refused`;
  - `applied: false` sets the newer-build message;
  - its last-applied record changes only on success.
- **The partner list:** every row kind and its tag, device counts, the "seen" wording, and the hero's "Sharing Active".
- **The move-over's decision function:**
  - creating, skipping removed people and people without an iCloud id;
  - copying settings without overwriting;
  - asking for tickets and stopping once someone has an `app` device;
  - ending the share, or holding it for a pending label or an unidentified person.
- **Settings:**
  - the lookup order;
  - the iCloud record's reverse lookup;
  - `endICloudShare()` keeps the cloud ids' settings;
  - Stop Sharing with Everyone clears everything.
- **The invite sheet's logic:** the same reference on repeat taps, a rename when the name changed, and the error messages.
- **Signing out** clears that account's cache.
- **`PartnerBeaconModeIndependenceTests`** keeps its iCloud checks, which stay true until piece 6. It gains one: Crewlu Cloud sharing depends on being signed in, not on `SyncBackendMode`.

### 8.2 The SQL tests (`supabase/tests`, run by Claude)

- **Every example** matches the schema and is accepted by `set_partner_status`.
- **Each partner** gets only their own entries plus the everyone-status from `partner_view`.
- **A status sent to one partner** stays hidden from the others.

### 8.3 On real phones before release

This needs the user, a test partner, and Crewluve piece 4 on TestFlight.

1. Invite the test partner, then connect in Crewluve.
2. Remove a device, use New Link, then remove the person.
3. An iCloud partner moves over without a tap after updating Crewluve, and the iCloud share ends by itself.
4. Sign out: the partner keeps the last status. Sign back in: updates resume.
5. A quick status sent to one person reaches only them.

## 9. Building and releasing

- **Three plans,** in this order:
  - **2a, the summary:** `PartnerCloudAPI`, the cached partner list the writer needs, the encoder, the writer, the auto-update hook and the contract files;
  - **2b, the screens:** the rest of `PartnerCloudStore`, the screens, invites, settings, and sign-out;
  - **2c, the move-over.**

  All three ship in one CrewLu release.
- **The branch:** a new branch off `feature/supabase-account-backend`, merged back into it. Each plan starts by checking that the tree is clean apart from the Xcode scheme files, which are left alone.
- **No database change.** Piece 1 is live.
- **The release:**
  - before any TestFlight build, the ticket field goes into iCloud's Production schema (§14.4);
  - the user sets the version and submits;
  - it goes live after Crewluve piece 4 (P2-1), which itself needs the push service (piece 3) live;
  - §8.3 passes first.

## 10. Changes to other docs

- **The umbrella design:**
  - §2.1's write triggers corrected (as in §2.2 here);
  - §4.1 and §6.2 no longer promise a 30 s minimum;
  - §4.1 gets the everyone-status rule (P2-3);
  - §7.2 and §7.3: show the partner's own quick status first;
  - §9: CrewLu ships after Crewluve (P2-1).
- **`partner-api.md`:** the summary section points to `supabase/partner-status/`.

## 11. Not in piece 2

- **Other pieces:** the push service (3), Crewluve (4), the website (5) and removing iCloud sharing (6).
- **Live updates of the partner list.** No realtime, as in D12.
- **Changing what Delete Account says.** Crewlu Cloud already deletes the partners and the summary along with the account.

## 12. Decisions made while planning 2a

Plan 2a (`docs/superpowers/plans/2026-10-16-partner-links-piece2a-summary.md`) is built on CrewLu's `feature/partner-cloud-summary` branch. What follows refines the sections above, and holds where they differ.

### 12.1 The plan's decisions

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

### 12.2 Changes from the review

The review of the built branch (plan Task 10) led to these changes, each with its own tests:
- **"Nothing new" is decided just before sending,** not when a summary is handed over (§5.2's skip). Before, a status that went back to the last applied one while another write was in flight was dropped.
- **A waiting summary goes out only for the account it was made for,** and only while that account still shares from this phone. Before, one could go out after a sign-out, or under another account's sign-in.
- **A changed partner list sends the summary again,** even an unchanged one. The last applied record holds the partner ids too, because Stop Sharing with Everyone deletes the server's copy.
- **A forced summary stays forced** when a newer one replaces it while it waits.
- **`problem` and `lastAppliedAt` are kept per account,** and the screen gets the signed-in account's. One account's answers never show for another account, or after a sign-out.
- **A new account's refresh doesn't wait** for the last account's to finish.
- **HTTP 408 and 429 are `unavailable`,** because they mean "try again later". In decision 3's table, they move from "another 4xx" to "anything else".
- **The schema holds the quick status rules across fields** (§5.1, P2-3): a status for everyone comes with null `quickStatusTargets`; without one, its three fields are null and the targets are empty; and `isSleeping` is true only when that status is Sleeping. Both maps are null rather than empty.

### 12.3 Where the build differs from §5.2 and §8.1

**After `unavailable`, the summary is dropped.** §5.2 says the writer "keeps the summary waiting", and §8.1 that it "keeps and retries". The next trigger sends a fresh summary instead, because the last applied one didn't change.

This changes one case: a forced summary that fails this way doesn't pass its force on. If nothing changes by the next trigger, that summary matches the last applied one and is skipped, so the server keeps that one, with its older `lastUpdated`.

### 12.4 Left for plan 2b

- **`PilotStatusBeaconManager.selfHealOrphanedPartnerState()`** deletes both per-person settings keys, on every device, whenever the iCloud manager finds no share. 2b must keep it from deleting cloud partners' settings.
- **Update Status Now and the screen's `onAppear`** call the iCloud manager directly, so they skip the cloud writer until 2b routes them through `forceUpdate` (§4.2). 2b also decides whether a forced summary that fails with `unavailable` stays forced (§12.3).
- **How the screen reads per-account state.** `problem` and `lastAppliedAt` follow the signed-in account (decision 12), partly through values that Observation doesn't track: the sign-in and UserDefaults. 2b checks that the screen redraws after a sign-out and after an account switch.

## 13. Decisions made while planning 2b

Plan 2b (`docs/superpowers/plans/2026-10-17-partner-links-piece2b-screens.md`) is built on CrewLu's `feature/partner-cloud-screens` branch. What follows refines the sections above, and holds where they differ.

### 13.1 The plan's decisions

1. **`PartnerCloudAPI` gains six partner actions:** `partner_create(name, ref)`, `partner_rename`, `partner_new_link`, `partner_remove`, `partner_remove_device` and `partner_remove_all`. `partner_move_ticket` waits for 2c.
2. **The store acts only for the account its list follows,** and reads the list again after each action, unless Crewlu Cloud couldn't be reached or wants a sign-in, when nothing changed there. A read asked for while one is out runs once more after it, because the one that's out may predate the action.
3. **One "sign in again" flag, on the store.** Every `notSignedIn` answer sets it, from the list, an action or the summary; any answer that works clears it, and so does any change of account. The screen shows the expired prompt for it or for the sync engine's `sessionExpired`. The writer no longer keeps its own `.signInExpired` problem, which would have stayed up after signing in again until the next applied write.
4. **The screen redraws on every account change** (§12.4). `sharingAccount()` reads the list's account first, even signed out, so `problem` and `lastAppliedAt` follow every sign-in, sign-out and switch. Whose schedule the phone holds lives in UserDefaults, so the screen reads it again each time it appears, for instance on coming back from the Crewlu Cloud screen.
5. **A forced summary that doesn't reach Crewlu Cloud stays owed** (§12.4): after `unavailable` or `notSignedIn`, that account's next summary is forced too, so Update Status Now isn't lost to a dropped connection. Any answer from Crewlu Cloud settles it.
6. **Names are cleaned as Crewlu Cloud keeps them:** trimmed, and at most 60 code points, the way Postgres counts, without cutting a character in half. A cloud partner's name can't be empty, so an empty rename keeps the current name (§6.5).
7. **The invite sheet makes one reference when it opens** (§6.4). Every tap sends it, so Share then Copy, or a tap after a failed one, gets one partner. A repeat tap renames them when the name differs from the one Crewlu Cloud is known to have; after a failed tap that isn't known, so the next tap renames.
8. **The rows come in the approved mockup's order:** connected, still on iCloud, not opened yet, then pending invites from before the update, oldest first within each. Only accepted iCloud participants are listed. Until 2c's move-over links them, every accepted iCloud participant is "still on iCloud".
9. **Which screen** (§6.1): signed out, the prompt to keep sharing or to start; signed in, an expired sign-in comes first, then a schedule that's another account's, and otherwise the Crewlu Cloud screen.
10. **The iCloud clean-ups keep the per-person settings** (§12.4). `selfHealOrphanedPartnerState()` clears only the nicknames and the pending invites. The new `endICloudShare()` deletes the share and the record and clears the same. `removePartner` uses it when the last iCloud partner goes while Crewlu Cloud sharing is on, and `stopSharing()` otherwise, as today. 2c adds the move-over notes to it.
11. **Removing a Crewlu Cloud partner forgets their settings** and syncs that to the pilot's devices. Their id is never used again.
12. **Update Status Now and the screen's first appearance go through `forceUpdate`** (§12.4). They wait for the Crewlu Cloud write, so the spinner covers it, then read both lists. Since `forceUpdate` writes iCloud only while an iCloud share exists, opening the screen no longer writes an iCloud record for a pilot who never shared. Coming back from a partner page only reads the lists again.
13. **The quick status sheet** takes its Send To people and a rename action from the partner page; the signed-out screen still calls it as today. On Crewlu Cloud the rename comes first, so if it fails nothing has changed.
14. **Re-share on a pending invite from before the update** uses the label's id as the reference, so a second try makes no second partner.
15. **Stop Sharing with Everyone** goes to Crewlu Cloud first (`partner_remove_all`). If that fails, nothing changes. Then comes today's `stopSharing()`: any iCloud share, every per-person setting and the pending invites.
16. **Copy and looks the spec didn't give**, approved with the plan:
    - the help sheet's "How to Set It Up" and "Privacy & Security" describe invite links and Crewlu Cloud;
    - Copy Invite Link shows "Copied" for 2 seconds;
    - a row with a spinner while the list loads, or "Couldn't reach Crewlu Cloud." with Retry;
    - the partner page: no title in its bar (the header has the name), an orange initial while not opened yet, an envelope for "Not opened yet", an iPhone or a globe for each device;
    - error alerts are titled "Error", as Partner Sharing's are today;
    - a person's quick-status bubble shows on every row that has one, not only connected rows.

### 13.2 Changes from the review

The review of the built branch (plan Task 15) led to these changes, each with its own tests where the Mac harness can run them:
- **The iCloud clean-ups can't reach Crewlu Cloud partners' settings any more.** A device that didn't know about Crewlu Cloud sharing (signed out, holding another account's schedule, or before its first read of the list) could still clear those settings on every device through key-value sync. Now removing the last iCloud partner always ends the share with `endICloudShare()`, which forgets only its own partners' settings, by their iCloud ids, plus the nicknames and the pending invites. Below the sign-in prompt, Stop Sharing with Everyone ends only the iCloud share. This replaces decision 10's "and `stopSharing()` otherwise".
- **An expired sign-in says what to do** (the user's choice): "Your Crewlu Cloud sign-in expired." / "Sign out, then sign back in, to keep sharing.", with Open Crewlu Cloud. Before, Sign In took a pilot whose schedule syncs through iCloud to a Crewlu Cloud screen that showed them signed in, with no hint. The expired alerts use the same words.
- **The clean-ups' settings work lives in `PartnerSettings`** (`clearQuickStatus`, `forgetICloudSharing`, `forgetEverything`), so §8.1's two settings tests exist: ending the iCloud share keeps Crewlu Cloud partners' settings, and Stop Sharing with Everyone clears everything.
- **Clearing one person's quick status also ends a status sent to everyone,** found while fixing. Before, that person kept seeing it. The others keep the copy Send To saved for each of them (P2-3).
- **A summary already waiting when a forced write fails is sent too,** not skipped as unchanged. The owed rule's other branches got tests: `notSignedIn` keeps it owed, and a refusal settles it.
- **Update Status Now and the quick status sheet say when Crewlu Cloud missed the update:** "Couldn't reach Crewlu Cloud. Check your connection and try again.", as they do for iCloud failures. The update stays owed, and the next one sends it. Opening the screen stays quiet.
- **The store's `remove`** forgets the person's settings and syncs that itself (decision 11), so the screens don't repeat it.
- **New Link keeps the new link in the list** if the read after it fails.
- **A name cut at 60 characters is trimmed again** (decision 6), so it never ends in a space.
- **The screen:** a failed first read shows Retry even with no saved partners; the screen watches only the sync engine's expiry, not its every change; invite taps show they're busy at once; coming back from a partner page reads both lists.
- **Declined:** returning from invite and New Link before the list is read again. It saves about two small reads, and a current list after every action matters more.

### 13.3 Changes from the look

The user's look on their phone (plan Task 17), with their two iCloud partners, found one thing: at a large text size, a long name wrapped the orange tag onto two lines. **The user chose** to keep the tag beside the name when both fit, and to put it below the name when they don't, for "Needs Crewluve update" and "Pending invite", on the Crewlu Cloud screen and below the prompt.

### 13.4 Where the build differs from §6, §7.5 and §12.3

- **§6.1's expired prompt** says "Sign out, then sign back in, to keep sharing." with Open Crewlu Cloud (§13.2), not "Sign in again to keep sharing." with Sign In.
- **§6.2's Stop Sharing with Everyone** clears everything only on the Crewlu Cloud screen. Below the prompt, it ends just the iCloud share.
- **§7.5's last iCloud participant:** removing them always ends the iCloud share through `endICloudShare()`, whether or not Crewlu Cloud sharing is on.
- **§12.3's case no longer happens:** a forced summary that fails passes its force on (decision 5). Decisions 4, 5, 10 and 12 finish §12.4.

### 13.5 Left for later

- **Until 2c, the iCloud record carries every per-person setting,** Crewlu Cloud partners' included, so a quick status sent only to a Crewlu Cloud partner would also show to iCloud partners on an older Crewluve. No TestFlight build should come from a branch with 2b but not 2c.
- **`ensureShare()`, `shareURL` and `CloudSharingSheet` have no callers.** They go with the rest of iCloud sharing in piece 6.
- **Testing with the pilot's own iCloud reaches their real partners.** Stop Sharing with Everyone and Remove act on them, and key-value sync carries per-person settings to every device on that account.

## 14. Decisions made while planning 2c

Plan 2c (`docs/superpowers/plans/2026-10-17-partner-links-piece2c-move-over.md`) is built on CrewLu's `feature/partner-cloud-screens` branch, after 2b. What follows refines the sections above, and holds where they differ.

### 14.1 The plan's decisions

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

### 14.2 Changes from the review

The review of the built branch (plan Task 13) found one Critical, two Important and eleven Minor issues, and the same reviewer's re-check found two more. These changes followed, each with its own tests where the Mac harness can run them:
- **A removal that can't reach Crewlu Cloud waits for it** (I1). Before, removing a linked person below the sign-in prompt, or while Crewlu Cloud couldn't be reached, never reached Crewlu Cloud, so after signing back in they got updates again. Now a synced list, `crewluve.cloudPartnersToRemove`, holds the Crewlu Cloud partners to remove. It's kept apart from the notes (§7.1), so ending the iCloud share doesn't forget it:
  - removing a linked person adds their partner (`noteRemoved`);
  - Stop Sharing with Everyone below the prompt adds everyone linked, except people removed earlier, whose partners were dealt with then (R2, from the re-check);
  - `PartnerCloudStore.remove` and Stop Sharing with Everyone on Crewlu Cloud take off what they removed;
  - each run does the waiting removals first, with or without an iCloud share. One not in this account's list waits, a refusal drops it, and being offline stops the run.
- **Removing the last iCloud partner notes their removal before the share can end** (R1, from the re-check). Ending the share forgets the links, so `noteRemoved` now runs straight after the share is saved.
- **Runs wait for removals** (M5, M11). `holdingRuns(_:)` puts off runs while a removal or Stop Sharing with Everyone goes on. `remove(cloudID:iCloudID:)` keeps §7.5's order in one tested place, and both screens remove through it.
- **A sign-out or an account switch during a run decides nothing** (M1): the run checks the account again before it moves settings or decides about the share.
- **Crewlu Cloud's PT409 (25 partners already) stops the run's creates** (M8): nobody else can be made. This refines decision 7.
- **The partner page opens by value** (M6), so linking someone doesn't close it, and it stays until its removal is done (M7).
- **A late joiner's rename runs in a `Task`** (M4), and the unused `PartnerSharingView.clearStatusForPartner(_:)` is gone (M10).
- **Tests for the reviewer's cases:** a refused ticket; a share nobody accepted, which ends unless a pending invite is open on this device (M2); and someone removed who still has the app, who reads through Crewlu Cloud and so counts as moved over.
- **Declined:**
  - **M3,** checking the record's tickets against this device's last write: the device that wrote without them writes again on its own next run, and an exact check costs one more iCloud read per run.
  - **M9,** list waiters shared across accounts: one woken early finds the list unloaded and decides nothing.
  - **R3,** a waiting removal lost when two devices sync the whole key at once (last writer wins): every partner setting synced today has the same limit (§14.7).
  - **The optional items:** Remove showing no progress while a run finishes, and today's invite matching being able to push a wrong label to Crewlu Cloud.

### 14.3 Accepted: anyone in the iCloud share can read every ticket

**The user chose** to accept this (I2). Every participant of the public iCloud share can read every ticket in the record, so one could redeem someone else's: they'd get a device on that person's partner, and that person would look moved over. They already see the status through iCloud. The partner page lists each device, so a stray one can be removed, and the move-over then hands that person a fresh ticket.

### 14.4 A release step: the ticket field in iCloud's Production schema

The review's Critical finding (C1), with no code change. CloudKit's Production schema doesn't learn new fields from saves, so before any TestFlight or App Store build with 2c:
1. In the CloudKit Console, container `iCloud.com.toddanderson.duty`, check that the Development schema's `SharedPilotStatus` record type has `moveTicketByPartnerJSON`, of type Bytes. A save in Development adds it; if it isn't there, add it by hand.
2. Deploy Schema Changes to Production. This deploys every change waiting in Development, and the Console lists them before it does.

Without it, every write that carries a ticket fails, and so may every other write from this version, because each one clears the field when there's no ticket. Partners on an older Crewluve would stop getting updates. `Duty/Documentation/CLOUDKIT_DEPLOYMENT_GUIDE.md` has the Console's steps.

### 14.5 The look waits for TestFlight

**The user chose** to wait for a TestFlight build rather than run 2c from Xcode on their phone (plan Task 15). Which iCloud environment an Xcode build uses isn't settled:
- CrewLu's Debug build doesn't choose one (it has no `com.apple.developer.icloud-container-environment` entitlement), so by Apple's rule it uses Development;
- yet in 2b's look, such a build on the pilot's phone found their two iCloud partners.

If it reached Production, this build's writes would fail until §14.4 is done. A TestFlight build always uses Production, can't come before §14.4, and is where §8.3's checks happen. So the move-over first runs for real there.

### 14.6 Where the build differs from §6.7 and §7

- **§6.7's Sign Out asks first only when it stops someone's updates** (decision 13): someone reads through Crewlu Cloud, or has an invite out. People still on iCloud keep getting updates through the iCloud record.
- **§7.2's runs** come on every activation, whenever Partner Sharing appears, and when the share's participants change there (decision 6). A run also comes with no iCloud share while removals wait (§14.2).
- **§7.3's step 2 moves settings rather than copying them** (decision 3): an entry already under the Crewlu Cloud id stays, and the iCloud id's entry goes either way, so a status cleared later can't come back from it.
- **§7.3's step 4** writes the record again whenever it doesn't carry the notes' tickets, not only when they change (decision 5), so the next run makes a write that failed again.
- **§7.3's step 5** (decision 11): participants who never accepted don't count, so a share nobody accepted ends unless a pending invite is open on this device; someone removed who joins again holds it up until removed again; and someone removed who still has the app counts as moved over.
- **§7.5's removals** go through `remove(cloudID:iCloudID:)`, which waits for a run that's out. A Crewlu Cloud removal that can't be made waits in the removal list (§14.2).
- **Stop Sharing with Everyone below the prompt** (§13.4) ends the iCloud share, and linked people's Crewlu Cloud partners wait in the removal list for the next signed-in run. Crewlu Cloud partners who were never in the iCloud share stay, with their settings.

### 14.7 Left for later

- **A partner's second device on an older Crewluve stops getting updates when the share ends.** Step 5 needs one `app` device per person, not all of their devices. Their ticket goes once they have an `app` device, so that second device can't redeem one either: piece 4 needs another way for it to join.
- **Stale entries in the removal list.** One whose partner went some other way than through CrewLu's store, or one for another account's partner, waits for good. It acts on nothing, since ids are never used again, but while it's there each activation reads the Crewlu Cloud list once, even with no iCloud share. Stop Sharing with Everyone on Crewlu Cloud clears the list. Two devices syncing the whole key at once can also lose an entry (R3).
