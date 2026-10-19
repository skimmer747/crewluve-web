# Partner Links Piece 4: Crewluve on Crewlu Cloud

- **Status:** design approved in brainstorming on 2026-10-18, and the user approved this spec the same day. Plan 4a is built (`docs/superpowers/plans/2026-10-18-partner-links-piece4a-source.md`); next: plan 4b.
- **Part of:** the partner-links design, `docs/superpowers/specs/2026-10-15-partner-links-design.md`, §5.5, §6, §7.2, §8 and §9 (piece 4).
- **Repo:** Crewluve, `~/Dev/Crewluv`, on a new branch off its release line (§11).
- **Contract:** `~/Dev/Duty/supabase/partner-api.md`, the partner door from piece 1 (live since 2026-10-15), including its "Pushes" section from piece 3 (live since 2026-10-18).

## 1. Goal

1. **Crewluve reads the pilot's status from Crewlu Cloud** instead of iCloud, through the partner door.
2. **Partners connect by tapping the pilot's invite link**, or with a code from another of their devices. There are no accounts and nothing to type.
3. **Crewlu Cloud's silent pushes wake Crewluve** the way iCloud's do today, so alerts keep working.
4. **Partners already connected through iCloud move over by themselves,** their second devices included, and nobody is disconnected.
5. **The screens, the trip logic and the alerts don't change.** Only connecting, the welcome screen and a small menu are new.

## 2. What's there now (checked 2026-10-18)

All paths are in `~/Dev/Crewluv` on `hotfix/icloud-account-unavailable` (`739abd3`) unless they say otherwise.

### 2.1 Fetching and the screen

- **The iCloud fetch is written three times:** the screen's `PartnerStatusReceiver.checkForSharedData()` (`Crewluv/Services/PartnerStatusReceiver.swift:142-306`), the push handler (`Crewluv/App/AppDelegate.swift:99-133`) and the background refresh (`Crewluv/Services/BackgroundRefreshManager.swift:80-124`). Each picks the shared or private database from `PilotDataSource` and `SharedZoneOwner` in UserDefaults, and reads the `pilot-status` record.
- **The screen's model,** `PartnerStatusReceiver` (`@MainActor @Observable`, made in `ContentView.onAppear`), holds the status, the loading and sync state, and demo mode.
  - It looks up the pilot's display name by the partner's iCloud user record name (223-246).
  - It runs `StatusChangeNotifier` when `lastUpdated` changed (248-268).
  - It treats `unknownItem` and `zoneNotFound` as the share ending (278-293): it resets and shows the welcome screen, without saying why.
  - `resolveAndSchedule()` (391-555) rebuilds the shown status from the legs, and wakes again at the next leg change.
- **It refreshes** on an iCloud push, on coming to the front (`Crewluv/Views/Welcome/ContentView.swift:85-93`), on pull-to-refresh and on the refresh button. It has no timer while open: the "every 2 minutes" in Crewluv's `CLAUDE.md` is out of date.
- **The model,** `SharedPilotStatus` (`Crewluv/Models/SharedPilotStatus.swift`), has no `quickStatusByPartner` or `quickStatusTargets`. It keeps the legs and the display names as JSON blobs (`tripLegsJSON`, `displayNameByPartnerJSON`). The screen shows the top-level quick status to everyone (`Crewluv/Views/Status/PilotStatusView.swift:625-639`).

### 2.2 Pushes, background refresh and alerts

- **Registering:** `registerForRemoteNotifications()` runs at every launch (`AppDelegate.swift:22`). The token is only noted for the diagnostics (31-37).
  - The entitlement is `aps-environment` `development` (`Crewluv/Crewluv.entitlements`), which Xcode signs as `production` for TestFlight and the App Store.
  - The background modes are `fetch` and `remote-notification` (`Crewluv/Info.plist`).
- **iCloud's silent push** comes from a `CKDatabaseSubscription` on the shared database (`Crewluv/Services/CloudKitSubscriptionManager.swift:88-114`), deleted and made again at every launch (25-35).
- **The push handler drops any push without iCloud's `ck` key** (`AppDelegate.swift:54`), so a Crewlu Cloud push would be ignored today.
- **Background refresh** asks for a run about every 15 minutes (`BackgroundRefreshManager.swift:37`).
- **Alerts** (`Crewluv/Services/StatusChangeNotifier.swift`):
  - they compare each new status with a saved snapshot, and fire at once (`trigger: nil`, 331). None are scheduled ahead;
  - they skip a status whose `lastUpdated` isn't newer than the last one evaluated (69-76), so a status that reaches both the screen and the push handler alerts once.

### 2.3 Links and screens

- **Share links** (`icloud.com/share…`, or CrewLu's `crewluv://accept-share?url=…`) arrive through `onOpenURL` and `onContinueUserActivity` (`Crewluv/App/CrewluvApp.swift:30-40`), and through the cold-launch paths in `AppDelegate` (147-213). The only associated domain is `applinks:icloud-sharing.apple.com`.
- **The welcome screen** (`NoShareView`, `ContentView.swift:183-265`) has the heart, "Welcome to CrewLuve", three `InstructionRow`s, Paste Share Link, Try Demo and Reset Share Data.
- **The status screen's bottom row** (`PilotStatusView.swift:214-249`) has Paste Share Link (`link.badge.plus`), the sync line (a long press opens the diagnostics in debug builds) and Refresh. There is no settings screen and no way to disconnect.
- **The sync line** labels its first row "iCloud sync", and suggests "sign into iCloud" for some errors (`Crewluv/Views/Status/SyncStatusBarView.swift:63-68, 136-148`).
- **Logs** (`debugLog`) are compiled out of release builds. In debug builds, several of them print whole share links (`CrewluvApp.swift:31, 37, 44`; `AppDelegate.swift:163, 170, 190, 206`).

### 2.4 The build and the tests

- iOS 26.0, Swift 5 mode, MainActor by default, approachable concurrency, and no packages (Crewluv `CLAUDE.md`).
- Version 1.1.6 (42), team `UV96Z83C7B`, bundle `com.ToddAnderson.Crewluv`.
- `Crewluv/` and `CrewluvTests/` are synchronized folders, so new files need no project-file edit.
- `CrewluvTests/` has eight files: five use Swift Testing and three XCTest. ⌘U runs `CrewluvTests` only, and the user runs it.
- **Branches:** `hotfix/icloud-account-unavailable` (= origin, `739abd3`, 1.1.6) is the release line. `main` (`c73b957`) lacks its 13 commits. `claude/gallant-jennings-0d760e` holds an unmerged route-map sun fix (umbrella D10).

### 2.5 What the other pieces give it

- **The partner door** (piece 1), as `partner-api.md` describes it. The SQL adds three details:
  - `partner_view` answers `{partner_id, updated_at: null, status: null}` before the pilot's first summary, and updates `last_seen_at` at most every 5 minutes (`~/Dev/Duty/supabase/migrations/20261015120200_partner_links_partner_rpcs.sql:97-124`);
  - a device's label is cut to 60 characters, and an empty one becomes "Crewluve app" (27-68);
  - for a quick status sent to other people, the door removes `quickStatus`, `quickStatusIcon`, `quickStatusExpiry` and `quickStatusTargets` rather than nulling them, and it trims both per-partner maps to this partner's entry (`20261015120000_partner_links_tables.sql:143-180`).
- **The summary's shape:** `~/Dev/Duty/supabase/partner-status/`, a JSON Schema and nine untrimmed examples with partners A (`aaaaaaaa-…`) and B (`bbbbbbbb-…`).
- **CrewLu's move-over** (piece 2c, on Duty `feature/partner-cloud-screens` at `834f5cd6`, not released):
  - it writes `moveTicketByPartnerJSON` into the iCloud record: `{iCloud user record name: ticket}` as JSON with sorted keys, stored as Bytes (`Duty/Utils/PartnerBeacon/PilotStatusBeaconManager.swift:189, 356`; `Duty/Utils/PartnerCloud/PartnerMoveOverNotes.swift:64-69`);
  - it drops a person's ticket once they have an `app` device, and ends the iCloud share once every accepted participant has one (piece 2 spec §7.3, §14.1).
- **The push service** (piece 3) sends `{"aps":{"content-available":1}}` at priority 5 to the tokens registered with `partner_set_push`.
- **The app-link file** (piece 1b) claims `/join` for `UV96Z83C7B.com.ToddAnderson.Crewluv`. On 2026-10-18, Apple's CDN served it (200, the same JSON as the site), so piece 1b's last release check passes.

## 3. Decisions (brainstorm, 2026-10-18)

| # | Decision |
|---|---|
| P4-1 | **Piece 4 is the move to Crewlu Cloud** (the user's choice), in three plans: 4a the source and pushes, 4b connecting, 4c the move-over. They ship as one release. The golden cases (umbrella §7.4) get their own spec before piece 5, because they first need the status screen's wording moved out of the views (`NarrativeCardView` builds its sentences inside the view). So CrewLu's release waits only on 4a–4c. |
| P4-2 | **A partner's second device moves by itself** (the user's choice), through a copy of a moved device's key in the partner's iCloud Keychain (§8.3). Without iCloud Keychain, it takes a code from the other device. |
| P4-3 | **The welcome screen keeps today's three steps,** reworded for links, then the code boxes, Try Demo, and a small paste line at the bottom (the user's choice). Reset Share Data goes. Paste is only for a link that opens a web page instead of the app, such as one opened in Gmail's or Facebook's own browser. |
| P4-4 | **Use on Another Device and Disconnect sit in a ••• menu** in the status screen's bottom row, where Paste Share Link is today (the user's choice). |
| P4-5 | **The summary is translated at the door** (the user's choice). Crewlu Cloud's summary becomes today's `SharedPilotStatus`, so the views, `TripStateResolver` and `StatusChangeNotifier` don't change. One `PilotStatusSource` replaces the three iCloud fetches. |
| P4-6 | **The release order stays the umbrella's:** Crewluve, then CrewLu, then the website. Until piece 5, a link opened without Crewluve shows the website's "Get CrewLuve" page, and the website keeps its password sign-in (umbrella §8 step 6). Bringing piece 5 forward is the user's call. |

Approved mockups (widgets in this brainstorm): `crewluve_welcome_screen_revised`, `crewluve_handoff_and_disconnect`, `crewluve_connecting_states_storyboard` and `crewluve_move_over_flow`.

## 4. The parts

### 4.1 New

| File | Does |
|---|---|
| `Crewluv/Services/PilotStatusSource.swift` | `@MainActor @Observable`, `.shared`. The only code that fetches the status (§5.1). |
| `Crewluv/Models/PartnerConnection.swift` | The saved connection: none, iCloud, or Crewlu Cloud with its `partner_id`; a move under way; and the last pilot's `pilotId` and first name (§5.1). |
| `Crewluv/Services/ICloudStatusFetcher.swift` | Today's CloudKit read, moved out of its three copies, plus the record's move ticket (§8.1). |
| `Crewluv/Services/PartnerCloud/PartnerDoor.swift` | A protocol for the six partner calls, their answers and their one error type. Tests use a stand-in (§5.2). |
| `Crewluv/Services/PartnerCloud/LivePartnerDoor.swift` | The calls over `URLSession`, with the publishable key (§5.2). |
| `Crewluv/Services/PartnerCloud/DeviceKeyStore.swift` | The Keychain: this device's key, a pending key, and the hand-off copy (§5.3, §8.3). |
| `Crewluv/Models/CloudSummary.swift` | `partner_view`'s summary, and its translation into `SharedPilotStatus` at a given time (§5.4). |
| `Crewluv/Models/PartnerLink.swift` | Reads an invite link, a code link, pasted text or a typed code (§7.1). |
| `Crewluv/Services/PartnerJoiner.swift` | Joining by link or code, and the already-connected rules (§7.2). |
| `Crewluv/Services/MoveOver.swift` | The move-over: a pure decision function, and the runner that makes the calls (§8). |
| `Crewluv/Services/PushRegistrar.swift` | Keeps the push token and registers it with Crewlu Cloud (§6.1). |
| `Crewluv/Utils/PushEnvironment.swift` | Reads the build's push environment from its provisioning profile (§6.1). |
| `Crewluv/Views/Welcome/WelcomeView.swift` | The welcome screen, replacing `NoShareView` (§7.4). |
| `Crewluv/Views/Welcome/CodeEntryView.swift` | The six code boxes (§7.4). |
| `Crewluv/Views/Status/HandOffSheet.swift` | Use on Another Device (§7.5). |

### 4.2 Changed

| File | Change |
|---|---|
| `AppDelegate.swift` | The token goes to `PushRegistrar`. Pushes and the iCloud read go through the source (§6.2). The cold-launch link paths also pass `/join` links to `PartnerJoiner`. |
| `CrewluvApp.swift` | `onOpenURL` and `onContinueUserActivity` pass `/join` links to `PartnerJoiner`. |
| `PartnerStatusReceiver.swift` | Gets its status from the source instead of CloudKit, and no longer runs the notifier itself. It keeps `resolveAndSchedule()`, which also wakes when the shown quick status expires (§5.4). It adds the 60-second check (§5.5). |
| `BackgroundRefreshManager.swift` | Refreshes through the source. |
| `CloudKitSubscriptionManager.swift` | Its launch check skips on Crewlu Cloud. The move deletes the subscription (§8.2). |
| `ContentView.swift` | The welcome screen, the Connecting overlay, the sharing-ended note, and Crewlu Cloud's wording for the error screen (§7). |
| `PilotStatusView.swift` | The ••• menu replaces Paste Share Link (§7.5). |
| `SyncStatusBarView.swift` | Crewlu Cloud's wording (§7.7). |
| `NotificationDiagnostics.swift`, `NotificationDiagnosticsView.swift` | Crewlu Cloud pushes, and the last push registration (§6.2). |
| `Crewluv.entitlements` | Adds `applinks:crewluve.crewlu.net` (§7.1). |
| Logging in `CrewluvApp.swift` and `AppDelegate.swift` | Prints only the host and path of `/join` links, never their secret (§9). |

**How it fits together.** Every read goes through `PilotStatusSource`, whoever asks: the screen, a push, or the background refresh. The source reads iCloud through `ICloudStatusFetcher` or Crewlu Cloud through `PartnerDoor`. It hands each new status to the screen and to the notifier, once. Links and codes go to `PartnerJoiner`. Every iCloud read gives `MoveOver` its turn. Both of those end in the same switch to Crewlu Cloud.

## 5. Where the status comes from (plan 4a)

### 5.1 The status source

- **One place reads the status.** `PilotStatusSource.refresh()` reads from the saved connection and ends in one of four ways: a new status, unchanged, sharing ended, or failed. A refresh asked for while one is running joins it.
- **Each new status reaches the notifier once,** from the source, whoever asked for it, as `evaluateChanges(old: nil, …)`. The notifier compares it with its saved snapshot, as today.
- **The connection** (`PartnerConnection`, in UserDefaults):
  - its kind: none, iCloud, or Crewlu Cloud with the `partner_id`;
  - a move under way (§8.1);
  - the `pilotId` and the pilot's name as this partner sees it (§5.4), from the last status seen, for the sharing-ended note (§7.6) and the second device's check (§8.3).
- **iCloud reads** go through `ICloudStatusFetcher`. It does what the three copies do today: the database and owner, the record, and the display name by iCloud id. It also reads the record's move ticket.
- **The screen** (`PartnerStatusReceiver`) asks the source to refresh and shows what it publishes. Its own state stays the same: loading, syncing, errors and demo mode.

### 5.2 Calling Crewlu Cloud

- **Each call** is `POST https://corxvurxpnrzekbxdgye.supabase.co/rest/v1/rpc/<name>`, with the publishable key in the `apikey` header and no `Authorization`. The body is a JSON object of the named parameters. The key is the one the website uses (`src/cloud.ts`), compiled in. It's public by design (§9).
- **Each call ends in one of three ways:**
  - the answer;
  - a refusal: `sharing_ended`, `invalid_input`, `key_in_use`, `too_many_devices` or `try_later`;
  - unavailable: no network, a 20-second timeout, an HTTP status other than 200, or an answer that doesn't decode.
- **Forgetting the key:** only when `partner_view`, `partner_handoff_create` or `partner_set_push` answers `sharing_ended` (§7.6). From `partner_join` or `partner_handoff_redeem`, `sharing_ended` means the link, code or ticket is dead, so the key is kept.
- **`p_since`:** the source sends back the last answer's `updated_at` exactly as it came, as a string, and only within the same run of the app. The first read after a launch sends none, because the app doesn't save the summary. An HTTP 400 from `partner_view`, the contract's one exception to answers, drops `p_since`.

### 5.3 The device key

- **Made on the device:** 32 bytes from `SecRandomCopyBytes`, as 64 lower-case hex characters.
- **Saved in the Keychain before the first call that sends it,** as a generic password for this device only, with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`. That keeps it readable in the background while the phone is locked, once it has been unlocked after starting up. If the save fails, nothing is sent and the join says "Couldn't connect" (§7.3).
- **Kept** after a failed join, so the next try gets the same device. **Forgotten** on Disconnect and when sharing ends.
- **A pending key** is used while switching to another person's invite (§7.2). It's saved the same way, in its own Keychain item, and it either becomes this device's key or is forgotten.
- **A reinstall:** iOS keeps an app's Keychain items when it's deleted, but not its settings. At a launch with a key but no saved connection, the source reads with the key:
  - a status: connected to Crewlu Cloud;
  - `sharing_ended`: the key is forgotten, and the welcome screen shows;
  - unavailable: the welcome screen, and the check runs again the next time the app comes to the front.

### 5.4 Translating the summary

`partner_view`'s `status` is decoded in the contract's shape (`supabase/partner-status/schema.json`). Fields the door leaves out read as null (§2.5), and fields Crewluve doesn't know are ignored. Then it becomes today's `SharedPilotStatus`:

- **Every field of the same name,** dates as seconds since 1970.
- **`tripLegs`** becomes `tripLegsJSON`, encoded as today's blob (seconds since 1970) with sorted keys, so the same legs always give the same bytes. The notifier compares those bytes.
- **The display name** is `displayNameByPartner[partner_id]` when it isn't empty, otherwise `pilotFirstName`. It's saved as `ResolvedPilotDisplayName`, as today. `displayNameByPartnerJSON` stays nil.
- **The quick status,** first one that applies:
  1. this partner's own entry in `quickStatusByPartner`, while it hasn't expired;
  2. the top-level status for everyone, while it hasn't expired. The door sends it only when it's for everyone or names this partner;
  3. none.

  The chosen one fills `quickStatus`, `quickStatusIcon` and `quickStatusExpiry`, so the screen and the alerts work as today. `isSleeping` is passed through as it comes.
- **It's chosen again** each time the screen is resolved, and `resolveAndSchedule()` also wakes when the chosen one expires. That way an expired personal status gives way to the one for everyone without waiting for a new summary.
- **A `status` that doesn't decode** counts as failed and is logged, and the screen keeps the last status. A `status` of null means connected with nothing to show yet (§7.7).

### 5.5 Staying fresh

- **Every 60 seconds,** while the app is in front and on Crewlu Cloud (not in demo mode), the screen asks the source to refresh. When nothing changed, the answer is a small "unchanged". The check stops in the background. A device still on iCloud keeps today's refreshes, since it's on its way over and each CloudKit read costs more.
- **As today,** it also refreshes on coming to the front, on pull-to-refresh and on the refresh button, all through the source.

## 6. Pushes and background refresh (plan 4a)

### 6.1 Registering

- **`PushRegistrar` keeps the token** iOS gives at every launch (`didRegisterForRemoteNotificationsWithDeviceToken`).
- **On Crewlu Cloud, it calls `partner_set_push(key, token, env)`,** with the token as lower-case hex:
  - at launch, when the token arrives;
  - right after connecting, switching or moving over;
  - the next time the app comes to the front, if the last try couldn't reach Crewlu Cloud.

  `sharing_ended` is handled as in §7.6. `invalid_input` is logged and not tried again until the next launch.
- **The environment** (`PushEnvironment`) follows the build's provisioning profile, as `partner-api.md` asks, not Debug or Release:
  - an `embedded.mobileprovision` whose `Entitlements` has `aps-environment` `production` (ad hoc builds) gives `production`; any other profile (every build Xcode installs) gives `sandbox`;
  - no profile (TestFlight and the App Store) gives `production`;
  - the simulator gives `sandbox`.

### 6.2 Handling

- **The push handler** (`AppDelegate.application(_:didReceiveRemoteNotification:fetchCompletionHandler:)`):
  - **on Crewlu Cloud:** a push without `ck` refreshes through the source and tells iOS `.newData` (a new status), `.noData` (unchanged) or `.failed`. A push with `ck` is ignored (`.noData`);
  - **on iCloud:** a `ck` push reads iCloud through the source, as today, which also gives the move-over its turn (§8). Any other push is ignored;
  - **either way,** the push is counted in the diagnostics.
- **The screen** watches the source, so the `.cloudKitPushReceived` notification goes.
- **Background refresh** (`BackgroundRefreshManager`) refreshes through the source. Its 15-minute request is unchanged.
- **iOS decides when to deliver silent pushes,** and holds some back. That's why the 60-second check (§5.5) and the refresh on coming to the front stay.
- **Diagnostics** (debug builds only): Crewlu Cloud pushes count with iCloud's, and the sheet shows the last registration's time, environment and result.

## 7. Connecting (plan 4b)

### 7.1 Links

- **The entitlement** adds `applinks:crewluve.crewlu.net`. `applinks:icloud-sharing.apple.com` stays until piece 6.
- **`PartnerLink` reads:**
  - `https://crewluve.crewlu.net/join#t=<invite>` and `https://crewluve.crewlu.net/join#c=<code>`, with no trailing slash (piece 1b). The secret is only in the part after `#`;
  - a pasted or typed code: 6 characters after removing spaces and dashes, in any case.

  Anything else goes to today's share-link handling (`ShareURLResolver`). That keeps working until piece 6, because pilots on an older CrewLu still send iCloud links.
- **Links come in everywhere a share link does today:** `onOpenURL` and `onContinueUserActivity`, the cold-launch paths in `AppDelegate.configurationForConnecting`, and `application(_:open:)` and `application(_:continue:)`. So a link works whether the app is running or not.

### 7.2 Joining

One flow handles every link and code (`PartnerJoiner`):

1. **The key:** this device's key if it has one, otherwise a new one, saved first (§5.3).
2. **The call:** `partner_join(invite, key, 'app', label)` or `partner_handoff_redeem(code, key, 'app', label)`. The label is "iPhone" or "iPad" (`UIDevice.current.model`), because iOS doesn't give apps the device's own name.
   - `key_in_use` means the key belongs to another person's entry. The flow makes a pending key, saves it first, and calls again with it.
3. **The read:** `partner_view` with the key that joined.
4. **Then:**

   | Before | What the link reached | What happens |
   |---|---|---|
   | Not connected | anything | Connected, and the status screen opens |
   | On Crewlu Cloud | the same device | Nothing changes |
   | On Crewlu Cloud or iCloud | the same pilot: the new status's `pilotId` matches the saved one (§5.1) | It switches quietly |
   | On Crewlu Cloud or iCloud | another pilot: the `pilotId`s differ | It asks "Switch to Sam?" / "You'll stop seeing Alex's status on this iPhone." Switch switches. Cancel calls `partner_leave` with the new key and forgets it |

   **Switching** works the same way from any of these rows:
   - the new key becomes this device's key;
   - the old Crewlu Cloud device leaves with `partner_leave`, tried once (a failure leaves a stray device, which the pilot can remove);
   - an iCloud connection is forgotten without showing the welcome screen;
   - the push token is registered.

   **With no status yet** (`status: null`), the pilots can't be compared, so it switches.
5. **Failures:** a refusal shows §7.3's message and changes nothing. Unavailable shows "Couldn't connect" and keeps the keys, so the next try gets the same device.

The Connecting overlay (storyboard 1) covers steps 1–4. iCloud links keep today's "Accepting Share Invitation...". A link tapped in demo mode leaves the demo first.

### 7.3 Messages

Each one is an alert with an OK button.

| Answer | Title | Message |
|---|---|---|
| `sharing_ended` for an invite | Invite Link Not Working | "This invite link doesn't work anymore. Ask your pilot to send it again." When connected: "This invite link doesn't work anymore. You're still connected to Alex." |
| `sharing_ended` for a code | Code Not Working | "That code didn't work. Codes last 10 minutes and work once. Make a new one on your other device." |
| `too_many_devices` | Too Many Devices | "This invite already has 10 devices. Ask your pilot to remove one in CrewLu, then try again." |
| `try_later` | Too Many Tries | "Too many tries. Wait a minute, then try again." |
| unavailable, or the key couldn't be saved | Couldn't Connect | "Couldn't connect. Check your connection and try again." |
| `invalid_input`, or pasted text that isn't a link | Not an Invite Link | "That doesn't look like an invite link." |

"Alex" stands for the pilot's name as this partner sees it.

### 7.4 The welcome screen (P4-3)

`WelcomeView` replaces `NoShareView`, keeping its look:

- **The top:** the heart, "Welcome to CrewLuve" and "Stay connected with your pilot", as today.
- **Three `InstructionRow`s:**
  1. "Pilot Setup": "Your pilot needs the CrewLu app";
  2. "Invite Link": "Ask them to invite you from Settings → Partner Sharing. iMessage is best.";
  3. "Tap the Link": "Tap it on this iPhone, and CrewLuve connects by itself" ("iPad" on an iPad).
- **"or type the code from CrewLuve on another device",** then six boxes. They're one text field drawn as six boxes:
  - it takes letters and digits, shows them in capitals, and accepts any case;
  - the sixth character sends the code, and a pasted code fills the boxes;
  - a code that fails clears them.
- **Try Demo,** as today.
- **At the bottom, in small type:** "Link opened a web page instead? Paste it here". "Paste it here" opens today's paste box, reworded (§7.7). It accepts an invite link, a code link or an iCloud share link.
- **Gone:** the Paste Share Link button and Reset Share Data.

### 7.5 Use on Another Device and Disconnect (P4-4)

- **The menu:** a ••• glass button (`ellipsis`) in the status screen's bottom row, in Paste Share Link's place (`PilotStatusView.swift:216-222`). It opens a menu with Use on Another Device, and Disconnect (destructive).
  - It shows only on Crewlu Cloud. On iCloud the row has no •••, because the move-over brings the partner over.
  - It doesn't show in demo mode.
  - Paste Share Link goes from this row in every case.
- **Use on Another Device** (`HandOffSheet`) calls `partner_handoff_create(key)` as it opens, with a spinner while it waits. Then it shows:
  - the code in large monospaced capitals, in two groups of three ("K7M Q2X");
  - a QR code of `https://crewluve.crewlu.net/join#c=<code>`, made on the device with Core Image;
  - "9:41 left · works once", counting down to `expires_at`;
  - "On your other iPhone or iPad, open CrewLuve and type this code, or scan the QR code with its camera.";
  - Done.

  At 0:00 the code and QR fade, and New Code asks for another. A new code replaces the last one, because the server keeps one open code per person.
  - Unavailable: "Couldn't make a code. Check your connection and try again.", with Try Again.
  - `sharing_ended`: the sheet closes, and §7.6 follows.
- **Disconnect** asks first: "Disconnect from Alex?" / "You'll stop seeing Alex's status on this iPhone. To connect again, tap the invite link Alex sent you.", with Disconnect (destructive) and Cancel. Then it calls `partner_leave(key)`:
  - `{"ok": true}`: it forgets the key, the hand-off copy if it holds this device's key (§8.3), the saved connection, `ResolvedPilotDisplayName` and the alerts' snapshot, as today's `resetShareData()` does. Then the welcome screen shows, with no note;
  - unavailable: "Couldn't disconnect. Check your connection and try again.", and the device stays connected.

### 7.6 When sharing ends

- **On Crewlu Cloud,** `partner_view`, `partner_handoff_create` or `partner_set_push` answers `sharing_ended`. That happens when the pilot removed this device or this person, or stopped sharing with everyone. Crewluve then:
  - forgets the key, the hand-off copy if it holds this device's key, and the connection;
  - shows the welcome screen with "Sharing with Alex has ended." at the top (storyboard 4), using the saved pilot name.
- **On iCloud,** today's reset on `unknownItem` or `zoneNotFound` shows the same note, except during the move-over (§8.4).
- **The note** stays until the next connection. It doesn't show after a Disconnect, or when no pilot name was saved (a leftover key after a reinstall, §5.3).

### 7.7 Details the mockups didn't show

For review with this spec:

- **The alert titles** in §7.3, other than "Invite Link Not Working".
- **The ••• menu shows only on Crewlu Cloud** (§7.5). A device still on iCloud has nothing in that spot until it moves over.
- **The paste box:** "Paste Invite Link" / "Paste the invite link your pilot sent you.", a field labeled "Invite link", and Cancel and Connect.
- **Connected, with no status yet:** the loading screen's spinner with "Waiting for your pilot's first update...". Pull-to-refresh and the 60-second check keep looking.
- **On Crewlu Cloud, when no status has loaded and the read fails** (`ConnectionErrorView`): `wifi.slash`, "Unable to Connect", "Check your connection and try again.", and Try Again. On iCloud it keeps "Unable to Reach iCloud".
- **The sync line on Crewlu Cloud:** its rows read as today. Its VoiceOver label is "Last sync" instead of "iCloud sync". Its errors are "Sync failed — check your connection" or "Sync failed — will retry", never "sign into iCloud".
- **A second device left behind when the iCloud share ends** (§8.3): the welcome screen's note reads "To keep seeing Alex's status here, type the code from CrewLuve on your other device."
- **VoiceOver:** the ••• button reads "More", the code boxes are one field, "Code from another device", and the QR code reads "QR code for this code".

## 8. The move-over (plan 4c)

### 8.1 Each iCloud read

- **`ICloudStatusFetcher` also reads `moveTicketByPartnerJSON`.** It picks this device's ticket by `container.userRecordID().recordName`, the same id it already uses for the display name (`PartnerStatusReceiver.swift:228-238`).
- **After each read that brings the record** (from the screen, a push or the background refresh), `MoveOver` decides, and the source acts:
  1. **A move under way** (a device saved from an earlier redeem): `partner_view` with the key. A status means the switch (§8.2).
  2. **Otherwise, a ticket:** the key (the saved one, or a new one saved first), then `partner_handoff_redeem(ticket, key, 'app', label)`:
     - **the device** is saved as a move under way, then `partner_view`. A status means the switch;
     - **`key_in_use`:** a new key, saved first, and one more try;
     - **`sharing_ended`:** the ticket is used or expired, so §8.3 follows;
     - **`too_many_devices`, `try_later`, `invalid_input` or unavailable:** it stays on iCloud, and the next read tries again.
  3. **Otherwise, no ticket:** §8.3 runs if a hand-off copy exists. If not, nothing happens, because the pilot's CrewLu hasn't moved this person yet.
- **The partner sees nothing.** A redeem or read that fails leaves the device on iCloud, and the next read tries again with the same key (umbrella §8 step 2).

### 8.2 The switch

- The connection becomes Crewlu Cloud, with the `partner_id`.
- The iCloud connection is forgotten without showing the welcome screen: `SharedZoneOwner` and `PilotDataSource` are cleared without posting `.shareDataReset`.
- The push token is registered (§6.1).
- The iCloud subscription is deleted (`removeAllSubscriptions()`).
- This device's key goes into the hand-off copy (§8.3).
- The alerts' snapshot and `ResolvedPilotDisplayName` stay, so the switch fires no alerts.
- From then on, iCloud is never read, so CrewLu ending the share later shows nothing.

### 8.3 A partner's second device (P4-2)

- **The hand-off copy** is an iCloud Keychain item (`kSecAttrSynchronizable`, readable after the first unlock, so a push in the background can use it) holding the key of the partner's device that moved most recently.
  - Only Crewluve can read it, on the partner's own devices: same team, same bundle id.
  - iCloud Keychain is end-to-end encrypted.
- **A device on iCloud uses it** when its ticket is used, or no longer in the record (CrewLu drops a person's ticket once they have an `app` device):
  1. `partner_view` with the copy must bring a status whose `pilotId` is the pilot this device follows on iCloud (the saved one, §5.1);
  2. `partner_handoff_create` with the copy gives a code;
  3. `partner_handoff_redeem(code, own key, 'app', label)` joins with this device's own key, saved first;
  4. `partner_view` with its own key leads to the switch (§8.2).
- **So the second device is its own device** in the pilot's list, with its own pushes. The copy is never used to read the status for the screen.
- **When it can't finish:**
  - without a copy (iCloud Keychain is off, or the copy hasn't synced yet), or when a step fails, it stays on iCloud, and the next read tries again;
  - a copy that answers `sharing_ended` is deleted;
  - if the iCloud share ends first, the welcome screen shows with §7.7's note, and a code from the other device works there.
- **Housekeeping:** the copy is deleted on Disconnect and when sharing ends, if it holds this device's key. Piece 6 removes it.
- **Side effect:** `partner_handoff_create` replaces any code the partner has open on another device. That happens only while a second device is moving over.

### 8.4 Special cases

- **The share ends during a move.** While a move is under way, the iCloud share ending (`unknownItem`, `zoneNotFound`) doesn't send the partner to the welcome screen unless Crewlu Cloud also answers `sharing_ended` for the key. Otherwise the switch happens at once, since the device is already on Crewlu Cloud, and the status shows when a read brings it, with §7.7's states meanwhile. With a hand-off copy, §8.3 runs before the welcome screen does.
- **The pilot's own Crewluve.** On the pilot's own Apple ID, Crewluve reads the pilot's private zone (`PilotDataSource` `privateDB`), not a share, so CrewLu never gives it a ticket. When CrewLu ends the share, the record goes and the welcome screen shows. The pilot adds themselves as a partner ("Me") and taps that link (umbrella §7.3).
- **Crewluve updates first.** A Crewluve that updates before its pilot's CrewLu stays on iCloud (umbrella §8 step 4).
- **Partners on an older Crewluve** keep iCloud, and CrewLu waits for them before ending the share (piece 2 spec §7.3 step 5).

## 9. Security

- **The device key and the hand-off copy are secrets.** They live in the Keychain only, and travel only to Crewlu Cloud over HTTPS.
- **Logs** (`debugLog`, debug builds only) never print a key, a link's secret, a code, a ticket or a push token. Today's link logs print whole links (§2.3), so for `/join` links they print only the host and path.
- **The publishable key is compiled in,** as on the website. It's public by design: the partner door's checks protect the data.
- **No new access.** The hand-off copy gives the partner's own devices what their Apple ID already reads through iCloud.

## 10. Testing

### 10.1 Crewluve's tests

These are in `CrewluvTests/`, in Swift Testing like the newer files. The user runs them with ⌘U.

- **The client,** with a stand-in `URLProtocol`:
  - each call's address, `apikey` header (no `Authorization`) and body;
  - each answer: the success shapes, each refusal, HTTP 400 and 500, a timeout, and a body that doesn't decode.
- **The key:**
  - it's 64 lower-case hex characters, saved before the first call;
  - it's kept after a failed join and after a join's refusal;
  - it's forgotten on `sharing_ended` from the read, a new code or the push registration, and on Disconnect.
- **Links:** both link kinds, pasted text with spaces, codes in any case with spaces or dashes, a trailing slash, other hosts, and iCloud share links left to `ShareURLResolver`.
- **The translation:**
  - the inputs are the nine examples from `~/Dev/Duty/supabase/partner-status/examples/`, each trimmed for partner A and for partner B by the door's own `private.trim_status_for`. That's run once in piece 1's local test setup, and the results are saved as fixtures next to the copies;
  - each becomes the right `SharedPilotStatus`, field by field, with the legs' bytes stable;
  - display names: partner A sees "Dad" in `display-names.json`, and partner B sees the first name;
  - quick statuses: in `quick-status-one-partner.json`, A sees Call Me and B sees none. In `quick-status-everyone.json`, both see Sleeping;
  - with a fixed clock: an expired personal status gives way to the one for everyone, and two expired ones show none.
- **The source:**
  - which fetcher each connection uses;
  - the notifier runs once for each new status, and never for unchanged;
  - `p_since` goes back exactly as it came, and is dropped after a 400;
  - two refreshes at once share one read;
  - the 60-second check runs only in front and on Crewlu Cloud;
  - a leftover key after a reinstall, with each of the three answers.
- **Pushes:**
  - the environment from sample profiles (development, production, none, unreadable) and the simulator;
  - registering at launch and after connecting, and trying again on coming to the front;
  - the push handler's answer for each connection and each kind of push.
- **Joining:** every row of §7.2's table, each message in §7.3, and the pending key.
- **The move-over's decision function** (`MoveOver`, pure), with every case in §8.1, §8.3 and §8.4:
  - a ticket, and a move under way;
  - each answer to the redeem;
  - used and missing tickets, with and without a hand-off copy;
  - the pilot check;
  - the share ending during a move;
  - the pilot's own Crewluve.
- **Use on Another Device:** the code's grouping, the countdown, New Code when it runs out, and the QR code's link.

### 10.2 Before ⌘U

This is how pieces 2 and 3 were checked:

- written test-first in a scratch clone;
- a Mac harness that runs the new files and their tests, with stand-ins for UIKit;
- deliberate breaks of the new logic, each of which a test must catch;
- a compile-only build-for-testing in an isolated clone, with its own derived data.

Never `xcodebuild test`, never a simulator, and never a build against the project open in Xcode. A separate reviewer reads each plan's branch before it merges.

### 10.3 On real phones before release

This needs TestFlight builds of CrewLu (2b and 2c, after piece 2's iCloud schema step, piece 2 spec §14.4) and of Crewluve, with a test pilot and a test partner rather than the user's real partners.

1. Tapping an invite link connects.
2. A second device connects by code, and by QR code.
3. Removing one device, then New Link, then removing the person: each device reacts as designed.
4. A quick status sent to one partner reaches only them.
5. An iCloud partner updates Crewluve and moves over without a tap, and their second device follows by itself.
6. A real push wakes a TestFlight build (`production`) and an Xcode build (`sandbox`). An alert fires, and partner-push's logs count the sends.

## 11. Building and releasing

- **Three plans,** in this order. Each ends with the user's ⌘U, and all three ship in one Crewluve release:
  - **4a:** the source, the client, the key, the translation, pushes and the 60-second check;
  - **4b:** links, joining, the welcome screen, Use on Another Device, Disconnect, and sharing ended;
  - **4c:** the move-over.
- **The branch:** a new branch off `hotfix/icloud-account-unavailable` (1.1.6, build 42, `739abd3`), the release line. Each plan checks the tree first. Every push gets its own yes.
- **Xcode:** the entitlement is a text change in `Crewluv.entitlements`, and automatic signing updates the profile. New files need no project edits. If Xcode asks anything, the plan gives click-by-click steps.
- **No server change.** Pieces 1 and 3 are live, and Apple's servers have the app-link file (§2.5).
- **The release:**
  1. §10.3's checks pass;
  2. in App Store Connect, the user checks Crewluve's privacy answers, since it now sends a push token and its own random key to Crewlu Cloud;
  3. the user sets the version and submits;
  4. once Crewluve is live, CrewLu's piece 2 can go out (P2-1), after its iCloud schema step;
  5. then come the golden cases' spec (P4-1) and piece 5.

## 12. Changes to other docs

- **The umbrella design:**
  - §9's piece 4 row: the golden cases move to their own spec (P4-1), piece 5 depends on that spec, and a line points to this one;
  - §8 step 2: a partner's second device moves through the hand-off copy (P4-2);
  - §6.2: Crewluve's 60-second check is new, since today it has none.
- **The piece 2 spec,** §14.7's first item: a pointer to §8.3 here.
- **Crewluv's `CLAUDE.md`:** the refresh is the 60-second check, and the source is Crewlu Cloud (plan 4a).
- **`partner-api.md`:** no change.

## 13. Not in piece 4

- The golden cases, which get their own spec (P4-1).
- The website (piece 5).
- Removing iCloud (piece 6), which takes out the iCloud read, the share handling, `crewluv://accept-share` and the hand-off copy.
- The app fixes from D10 (sun times, the callsign split), which are separate items.
- Use on Another Device and Disconnect for devices still on iCloud.
- Following more than one pilot, and live pings (umbrella §11).

## 14. Decisions made while planning 4a

Plan 4a (`docs/superpowers/plans/2026-10-18-partner-links-piece4a-source.md`) made these decisions, and its review changed some of them, as each says. They refine the sections above, and where they differ, these hold: a refresh asked for during a read no longer simply joins it (§5.1), and the source runs the 60-second check while a screen is in front (§5.5).

1. **The door starts with the two calls 4a uses,** `partner_view` and `partner_set_push`. Joining, codes and leaving come with plan 4b's screens, as piece 2's `PartnerCloudAPI` grew with its plans.
2. **The door's network is a closure** (`LivePartnerDoor.Transport`, URLSession by default), so the tests answer for Crewlu Cloud and no request leaves the Mac.
3. **The summary decodes as sent,** with every field but four optional. The translation fills in what `SharedPilotStatus.from(record:)` fills in for iCloud: "Home", false, no cities. Only `pilotId`, `pilotFirstName`, `lastUpdated` and `appVersion` are required.
4. **The legs become `tripLegsJSON` with sorted keys,** so the same legs always give the same bytes. The alerts compare those bytes.
5. **The quick status is chosen each time the screen resolves** (`PilotReading.status(at:)`), and the screen also wakes when the shown one expires (`PilotReading.change(after:)`), so an expired personal status gives way to the one for everyone.
6. **The test summaries come from Crewlu Cloud's own trimming.** `trim-examples.mjs` runs `private.trim_status_for` in piece 1's local test database and writes 18 files. Only the trimmed ones are kept in Crewluve. The untrimmed examples stay in CrewLu (this refines spec §10.1).
7. **The source says how each refresh ended** (`RefreshOutcome`). The screen keeps its messages and its iCloud account check, which now runs only off Crewlu Cloud. A share that's gone from iCloud resets the share data for every caller (a push, the background refresh), not only the screen.
8. **The display name saved for the alerts follows every reading:** saved when there is one, removed when there's none. Before, an iCloud record without any names left the last saved one. *Changed by the review:* when an iCloud read can't look up this partner's user record, the saved name stays, and it titles the alerts and the screen.
9. **`p_since` is dropped after any failed read,** not only an HTTP 400 (spec §5.2), because the door reports both as unavailable. The next read gets the whole summary, and counts as unchanged if `updated_at` is the same.
10. **A refresh asked for during a read gets one more read once that read ends** (`ReadQueue`), shared by every refresh asked for meanwhile. So a push that lands mid-read isn't answered by a read that began before its change. *Changed by the review:* the plan had it join the read under way.
11. **The screen hears how every read went** (`.pilotStatusDidUpdate`, with the outcome and when the read began), whoever asked for it, in place of `.cloudKitPushReceived`. A push or the background refresh no longer makes the screen read again, but still moves "Synced". *Changed by the review:* the plan had the screen hear only of new readings (`.pilotReadingDidChange`).
12. **The 60-second check is `RepeatingRefresh`, kept by the source.** Each screen registers when it appears or comes to the front, and leaves when it goes from the front (iPad can show several). The timer runs while any screen is in front. A tick reads only on Crewlu Cloud, and only while a screen in front isn't showing the demo, so in 4a it never reads. *Changed by the review:* the plan started it from the screen only on Crewlu Cloud, so a device that connected or left mid-session kept the wrong state until it left the front.
13. **What a push means is `PushRoute`:** on Crewlu Cloud, a silent push without `ck` refreshes and iCloud's are ignored; on iCloud, iCloud's refresh, as before. iOS is told "new data" for a new status or sharing ended, "no data" for unchanged, no status yet or not connected, and "failed" for a failed read. The background refresh is rescheduled after every push but a failed one, as before. *Added by the review:* a read still going after 25 seconds is reported as failed and carries on, since iOS allows about 30.
14. **The registrar notes each try for the diagnostics** ("Sent (sandbox)", "Couldn't reach Crewlu Cloud", "Couldn't read this device's key", "Refused: …", "Sharing ended"). The debug diagnostics sheet shows it, with the build's environment.
15. **A key with no saved connection is read on every refresh until it answers** (spec §5.3). If its partner has no summary yet and iCloud has a share, the device stays on iCloud, so plan 4c's move-over can use the same key.
16. **Reset Share Data also forgets the source's iCloud reading** (`forgetICloudReading()`), as it forgot the screen's status before.
17. **The screen uses `PilotStatusSource.shared` directly.** The harness compiles it but doesn't test it, so it has nothing to inject: Task 13's build and the user's run check it. *Since the review,* the 60-second check's gating lives in the source, where the harness tests it.

### What 4a's review added

Decisions 8, 10–13 and 17 above say what the review changed in them. The review also added:

- **A read that ends after sharing ended brings nothing back.** Forgetting the connection moves a generation on, and a Crewlu Cloud answer or failure from before then reports sharing ended. A lost key clears the reading and the screen. A summary for another partner of the same pilot is new even at the same `updated_at`.
- **Adopting a key left by a reinstall sends the push token,** as §6.1 asks of connecting.
- **Only "no such item" means no key,** and so does a key that isn't text, which the next save replaces. Any other Keychain failure is a failed read that keeps the connection, and the push registration is tried again on coming to the front.
- **Crewlu Cloud failures are logged** (§5.4): the call, and the network error, the HTTP status, an unknown refusal or where the answer failed to decode. Never the request, which holds the key and the token.
- **The background refresh ends its task when iOS asks,** or when the read ends, whichever comes first, since the read can't be cut short while others may share it.
- **Left for later:**
  - the first Crewlu Cloud summary's legs are compared with iCloud's bytes, whose key order can differ (plan 4c, at the switch);
  - the pilot's id and name kept with the connection (plan 4b);
  - once a device's key can change mid-read (plan 4b), the generation moves on at every connection change and also guards `sharing_ended`, so a late one for an old key can't delete the new key;
  - a leftover key's `partner_view` ahead of an iCloud read can wait up to 20 seconds (plan 4c);
  - with no legs, the title shows the first name, not the nickname (older than piece 4; a follow-up).
