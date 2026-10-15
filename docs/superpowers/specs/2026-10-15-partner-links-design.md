# Partner Links on CrewLu Cloud (retiring iCloud partner sharing)

- **Status:** Design approved in brainstorming on 2026-10-15. This is the umbrella design. It spans three projects, and each piece (§9) gets its own spec, plan, build and release in the repo it changes.
- **Projects:** CrewLu (`~/Dev/Duty`, which also holds the CrewLu Cloud migrations), Crewluve (`~/Dev/Crewluv`), and this website (`~/Dev/Crewluve Website`).
- **Where this file lives:** in the website repo, because the brainstorm happened here. Each piece's spec links back to it.

---

## 1. Goal

1. **Partners connect with one link from CrewLu.** Nobody uses the pilot's CrewLu Cloud email and password, and partners have no accounts.
2. **Crewluve gets its data from CrewLu Cloud instead of iCloud.** The website does the same.
3. **The Crewluve app and the website show the same thing.** They stay two apps with their own screens, but both are fed by the same data and follow the same logic, and the app's logic is the reference.
4. **The switch is seamless.** People already connected through iCloud move over by themselves, and nobody is disconnected.
5. **iCloud partner sharing is retired.** It is used only to carry people over, then removed in the following release.

## 2. What's there now

### 2.1 CrewLu (the pilot app)

- **The partner summary.** CrewLu builds one record per pilot, `SharedPilotStatus` (`Duty/Models/SharedPilotStatus.swift:33-119`), in `PartnerStatusGenerator`. It holds:
  - the first name, home and base airports, and home time zone;
  - the status (Home, In Flight, Turn, Layover), the current airport and position, and the current and next flight;
  - the home-arrival and next-departure countdowns, the trip day N of M, and the upcoming cities;
  - `tripLegsJSON`, a list of `TripLeg` (`Duty/Models/TripLeg.swift:24-55`) covering the last 60 days and all future trips;
  - quick statuses and display names per partner, and the flight delay.
- **The summary is already private.** It has no crew names, hotels or pay (`SharedPilotStatus.swift:24`). Hidden flights, events, commutes and jumpseats are filtered out (`PartnerStatusGenerator.swift:349, 404, 781, 821, 855, 949`), and so are fully hidden trips (commit `0722757d`).
- **How it travels today.** CrewLu saves the summary as a CloudKit record (`pilot-status` in `PartnerBeaconZone`) and shares it with a `CKShare` whose `publicPermission = .readOnly` (`PilotStatusBeaconManager.swift:285-291`). In other words, anyone holding the link can read it.
- **When it's written.** It's written at most every 30 s (`PartnerBeaconAutoSync.swift:20`), and each of these triggers a write:
  - the app becoming active;
  - a change to hidden events;
  - `.scheduleDidChange`;
  - a 5-minute loop while the app is open.

  It's written in both sync modes.
- **Who can share.** Partner Sharing requires Pro (`PartnerSharingView.swift:232`).
- **CrewLu Cloud** is Supabase project `corxvurxpnrzekbxdgye`:
  - 590 accounts on 2026-10-15, all email + password.
  - 19 tables, each with a single owner-only policy, `(select auth.uid()) = user_id`.
  - No partner, invite or viewer mechanism, and no Edge Functions.
  - Only `duty_periods` is in the realtime publication.

### 2.2 Crewluve (the partner app)

- **How it gets the summary.** Crewluve reads the summary from CloudKit's shared database (`PartnerStatusReceiver.swift:186-216`) and draws every screen from it. Its views take a `SharedPilotStatus` value (for example `PilotStatusView.swift:28-36`).
- **Alerts.** These are local notifications from `StatusChangeNotifier`, which compares each new summary with the last one it saw. A CloudKit silent push wakes the app (`AppDelegate.swift:47-93`), and a background refresh runs about every 15 minutes (`BackgroundRefreshManager.swift`).
- **One pilot only.** Crewluve follows one pilot, and it has no accounts and no paywall.
- **Duplicated fetch code.** The CloudKit fetch is copied three times: `PartnerStatusReceiver.swift:162-216`, `AppDelegate.swift:99-133` and `BackgroundRefreshManager.swift:80-98`.
- **iCloud is the weak spot.** Recent fixes were all about iCloud: CKError 36, failed accepts, and the "iCloud needs attention" hotfix (`316a4c2`).

### 2.3 The website

- **Sign-in.** The site signs in with the pilot's email and password (`src/auth/session.ts`).
- **Data.** It reads nine owner tables, using only safe columns (`src/data/rows.ts:123-137`), and refreshes every 5 minutes.
- **Its own engine.** It builds its own legs and status (`src/engine/`). It went live this week and hasn't had real-world use yet, so the user wants it to follow the proven app rather than the other way round.

## 3. Decisions made in the brainstorm (2026-10-15)

| # | Decision |
|---|---|
| D1 | Partners connect by **link only**. There are no partner accounts or passwords. |
| D2 | **One permanent link per person.**<br>• Send Link Again resends the same link.<br>• New Link replaces it, and that person's connected devices stay connected.<br>• Remove cuts off all of that person's devices.<br>• A single device can be removed on its own. |
| D3 | Crewluve has **Use on another device**: a 6-character code (valid 10 minutes, usable once) and a QR code. |
| D4 | Crewluve and the website **stay two apps with their own screens and share one data recipe.** |
| D5 | **Everything is based on the proven app.**<br>• CrewLu's partner summary is the single data source.<br>• Crewluve's logic is the reference, and the website follows it.<br>• Shared golden test cases keep them identical.<br>• Wherever they disagree, the app wins. |
| D6 | **Partner Sharing requires CrewLu Cloud from this version on.**<br>• Existing iCloud shares keep working, with a "Sign in to keep sharing" prompt.<br>• The following release removes iCloud sharing. |
| D7 | **Existing partners move over automatically.** Nobody gets disconnected. |
| D8 | **Alerts:** a cloud push service sends the same kind of silent wake-up iCloud sends today. Crewluve's alert logic is unchanged. |
| D9 | **Screens:**<br>• CrewLu's partner list shows device counts.<br>• A partner's page shows their devices, Send Link Again, New Link, Nickname and Quick Status, and Remove.<br>• The welcome screen offers an instruction, Paste Invite Link, the 6-character code, and Try Demo. |
| D10 | Bugs the website found in the app get **fixed in the app**, as separate items: sun times off by up to 2 h, and the callsign split for 5X, B6 and F9. |
| D11 | *(technical)* **Each device holds its own random key.** Partners are not Supabase users, so the 19 owner policies don't change. |
| D12 | *(technical)* **No realtime in version 1.**<br>• Crewluve refreshes on the wake-up push and a timer.<br>• The website polls while visible.<br>• Live pings are a later option (§11). |

## 4. The data: CrewLu's summary in CrewLu Cloud

### 4.1 One summary row per pilot

- **New table `partner_status`:**
  - `user_id` (primary key, references `auth.users`, on delete cascade);
  - `status jsonb`, the summary;
  - `writer_build int`;
  - `updated_at`, set by the server;
  - `push_due bool` and `last_push_at`, for the push service (§6.1).
- **How CrewLu writes it.** CrewLu writes the row through an RPC, `set_partner_status(p_status jsonb, p_build int)`, which runs as the caller (RLS owner).
  - The RPC refuses a write from an older build than the stored `writer_build`. That's the same guard as `writerBuildVersion` (`PilotStatusBeaconManager.swift:333-352`), now enforced by the server.
- **The JSON is the existing `SharedPilotStatus`, encoded with `Codable`:**
  - dates as seconds since 1970, matching `tripLegsJSON` today;
  - `tripLegs` as a real JSON array, not a blob;
  - a `schemaVersion: 1` field.

  Piece 2 adds a JSON Schema file and fixtures generated from real summaries, so all three projects check against the same shape.
- **When it's written.** CrewLu writes the cloud row at the same moments and with the same 30 s minimum interval as the iCloud record today (§2.1). During the move-over it writes both.
- **Who can write.** Only a pilot signed in to CrewLu Cloud writes the row (D6).

### 4.2 What partners can see

- **Everything in the summary, and nothing else.** Partners never read the pilot's tables.
- **Never visible:**
  - hotels, room numbers, PNRs, confirmation codes, frequent-flyer numbers and cost;
  - crew names and personal or spouse info;
  - catering and notes;
  - hidden flights, events and trips.
- **New: partners see only their own per-partner fields.** Today every iCloud participant can read every partner's nickname and quick status. The partner door (§5.3) now trims `displayNameByPartner` and `quickStatusByPartner` down to the caller's own entry. It also drops the top-level quick status when `quickStatusTargets` doesn't include the caller.

## 5. Partners, links and devices

### 5.1 Tables (names may be refined in piece 1's spec)

- **`partners`:** one row per person the pilot shares with.
  - `id`, `owner_id` (the pilot), `name` ("Sarah"), `created_at`.
  - `invite_token`: the current link secret, 128 bits or more of randomness. It's readable by the owner only, so any of the pilot's devices can resend it.
  - The pilot's nickname and quick status for this person keep living in the summary, keyed by `partners.id` instead of the CloudKit user record name.
- **`partner_devices`:** one row per connected device.
  - `id`, `partner_id` (on delete cascade), `owner_id`.
  - `key_hash`: the SHA-256 of the device's 256-bit key. The plaintext key exists only on the device.
  - `kind` (`app` or `web`) and `label` ("Sarah's iPhone", "Safari on iPad").
  - `push_token` and `push_env` (`sandbox` or `production`), app devices only.
  - `created_at` and `last_seen_at`.
- **`partner_handoffs`:** one-time tokens that create a device.
  - `kind 'code'`: the 6-character code (from a 31-character alphabet without 0, O, 1, I or L), valid 10 minutes.
  - `kind 'move'`: a 256-bit move ticket (§8), valid 90 days.
  - Both are usable once (`used_at`).
- **RLS:**
  - The owner can read and write their own `partners` rows.
  - The owner can read and delete their own `partner_devices` and `partner_handoffs` rows.
  - Partners have no table access at all. Everything they do goes through §5.3.

### 5.2 Link format

- **Invite:** `https://crewluve.crewlu.net/join#t=<invite_token>`.
- **QR hand-off:** `https://crewluve.crewlu.net/join#c=<code>`.
- **Why a fragment:** the secret sits after `#`, so it never reaches a web server's logs and isn't sent when Messages fetches the link preview.
- **The preview** shows the site's fixed title and description, since GitHub Pages can't make a preview per link.
- **Universal links:**
  - `https://crewluve.crewlu.net/.well-known/apple-app-site-association` lists Crewluve for `/join`. It ships from this repo before Crewluve's release.
  - Crewluve adds `applinks:crewluve.crewlu.net`.
  - If Crewluve isn't installed, the link opens the website, connected.
  - Two things to verify in that piece:
    1. that the Pages artifact includes `.well-known`;
    2. that Apple's CDN accepts the file's content type. If it doesn't, Cloudflare (which already serves the DNS) can set the header.

### 5.3 The partner door (RPCs)

- **The basics.** These are the only things a partner device can call.
  - Each is `security definer` with `set search_path = ''`, granted to `anon`.
  - Each checks its input lengths.
  - Each hashes keys with `extensions.digest`.

| RPC | Does |
|---|---|
| `partner_join(p_invite, p_kind, p_label)` | Checks the invite and creates a device. Returns `{device_key, partner_id}` once. Refuses past 10 devices per person. |
| `partner_handoff_redeem(p_token, p_kind, p_label)` | Same as join, for a hand-off code or a move ticket. Marks it used. |
| `partner_view(p_key, p_since)` | Returns `{status, partner_id, updated_at}`, with `status` trimmed per §4.2. The name the pilot gave this person stays in CrewLu. Returns `{unchanged: true}` when nothing is newer than `p_since`. Updates `last_seen_at` at most every 5 minutes. |
| `partner_handoff_create(p_key)` | Creates a 6-character code for this device's person. |
| `partner_set_push(p_key, p_token, p_env)` | Saves the app's push token. |
| `partner_leave(p_key)` | The device disconnects itself. |

- **Every RPC that takes a key or token answers `sharing_ended` when it isn't valid.** That covers a removed person, a removed device, an unknown key, and a used or expired code. The device then shows "Sharing has ended" and returns to the welcome screen.
- **Guessing codes.** Codes are short, so `partner_handoff_redeem` keeps a count of failures. After 30 failures in a minute, every redemption fails for the next minute. That could block hand-offs for a minute but never exposes data. Move tickets and invites are long enough not to need this.

### 5.4 What the pilot sees (CrewLu)

Copy follows the existing Partner Sharing screen (`PartnerSharingView.swift`).

- **Partner list:** "Shared With", one row per person: "Sarah · 2 devices · seen today", or "Invite sent, not opened yet". Below it: Invite Another Partner, Update Status Now, and Stop Sharing with Everyone.
- **Partner page:**
  - the devices, each with its kind and last seen; swipe to remove one;
  - Send Link Again, New Link, Nickname and Quick Status;
  - Remove {name}.
- **Invite Another Partner** keeps today's flow: enter the name, then share the link through Messages. It also offers the existing App Store link.
- **Stop Sharing with Everyone** deletes every `partners` row, so every device of every partner disconnects. During the move-over it also stops the iCloud share.

### 5.5 What a partner sees (Crewluve and the website)

- **Tapping the link.** The app or site opens, connects and goes straight to "Where's {Name}?". The partner never sees a welcome screen.
- **The welcome screen** is for opening the app or site without the link (a new device, cleared data):
  - "Welcome to Crewluve" and "Stay connected with your pilot";
  - an instruction (not a button): "Open the invite link your pilot sent you, on this device.";
  - **Paste Invite Link**, which replaces today's Paste Share Link. On the web it's a box to paste into;
  - "or type the code from Crewluve on another device", with 6 boxes;
  - Try Demo.
- **Crewluve settings:**
  - **Use on another device:** shows the code and a QR, both valid 10 minutes;
  - **Disconnect:** calls `partner_leave`.
- **Website, after connecting:** one line: "Connected on this browser. Add it to your Home Screen to keep it handy."

  Safari erases a site's storage after 7 days of browser use without a visit, but sites added to the Home Screen are exempt. If storage is erased, the device shows the welcome screen.

## 6. Refresh and alerts

### 6.1 Push service

- **Marking a pilot as due.** A trigger on `partner_status` sets `push_due = true`.
- **Sending.** A `pg_cron` job runs every 15 s and calls an Edge Function, `partner-push`. For each pilot that's due, the function:
  - sends an APNs background push (`content-available: 1`, priority 5) to every app device of that pilot's partners;
  - clears `push_due` and sets `last_push_at`.

  So each pilot gets at most one wake-up per 15 s, and the last change in a burst is never skipped.
- **Push key.** The function uses the APNs token key (`.p8`). The user creates it and stores it as Edge Function secrets (§10). A `BadDeviceToken` or `410` response clears that device's `push_token`.
- **What Crewluve does when it's woken** is what it does after a CloudKit push today:
  1. call `partner_view`;
  2. update the screen;
  3. run `StatusChangeNotifier`.

  Alerts scheduled ahead of time ("lands in 30 minutes") are unchanged.
- **The honest limit is the same as today:** iOS decides when to deliver background wake-ups and may hold some back.

### 6.2 While a screen is open

- **Crewluve** refreshes:
  - when the push arrives (it's delivered while the app is open, too);
  - when the app comes to the front;
  - on pull-to-refresh;
  - every 60 s while open.
- **The website** calls `partner_view` with `p_since`:
  - every 30 s while the page is visible;
  - when the page comes back into view (at most once per 30 s);
  - when the browser comes back online.

  The `unchanged` answer keeps the polling cheap.
- **How fresh it feels.** CrewLu writes at most every 30 s, so a partner usually sees a change within about a minute of the pilot's phone noticing it, often much sooner.

## 7. Changes per project

### 7.1 CrewLu

- **The summary:** a cloud writer next to the CloudKit writer, with the same triggers (`PartnerBeaconAutoSync`), plus encoding per §4.1.
- **Screens:** the partner list and partner page (§5.4), on the new tables. Per-partner nickname and quick status are keyed by `partners.id`. The key-value sync across the pilot's own devices (`PartnerDataKVSync.swift`) follows the new keys.
- **D6:** new invites require CrewLu Cloud. A pilot who isn't signed in sees "Partner Sharing now uses CrewLu Cloud. Sign in to keep sharing." Their existing iCloud share keeps working until the next release.
- **The move-over** (§8).
- **The Pro gate is unchanged.**

### 7.2 Crewluve

- **One data source.** A single `PilotStatusSource` replaces the three copies of the fetch, with two implementations:
  - **CrewLu Cloud:** URLSession calls to the §5.3 RPCs with the publishable key, no outside packages (Crewluv `CLAUDE.md:157`). The device key is kept in the Keychain.
  - **CloudKit:** kept only for the move-over, and removed in the following release.
- **Views, `TripStateResolver`, `resolveAndSchedule()` and `StatusChangeNotifier` don't change.** They still receive a `SharedPilotStatus`, decoded from the cloud JSON.
- **Connecting and pushes:**
  - universal links for `/join`;
  - the welcome screen and settings per §5.5;
  - sending the push token with `partner_set_push`;
  - handling the push in place of `userInfo["ck"]`.
- **Per-partner fields** are looked up by `partner_id` (from `partner_view`) instead of `container.userRecordID()`.
- **Shared golden cases.** Crewluve's tests produce the cases (§7.4): a summary JSON plus a time in, the shown answers out.

### 7.3 Website

- **Connecting:** `/join` handling, the welcome screen (§5.5), and the device key kept in local storage. Password sign-in is removed. A pilot who wants to preview adds themselves as a partner ("Me") and opens that link.
- **Data:** `partner_view` replaces the nine table reads. The network guard (`src/data/readOnlyFetch.ts`) allows only the §5.3 RPCs the site uses, plus weather and `airports.json`.
- **Logic:** what feeds the screens is reworked to follow Crewluve's logic, starting from the summary's legs and fields. The site's own legs builder (`src/engine/normalize.ts`, `legs.ts` and friends) is retired. Every golden case must pass, and the screens keep their current look.
- **Demo mode** uses Crewluve's demo summary, so the demo matches too.
- **App-link file:** the apple-app-site-association file ships early (§9, piece 1b).

### 7.4 The shared golden cases

- **What a case is:** a JSON file with a summary, a time, and the expected answers:
  - status and narrative facts;
  - countdown label and target;
  - trip day N of M;
  - and so on, each piece's spec listing exactly which.
- **Where they come from:** Crewluve's repo is the source of truth. They're generated from Crewluve's real outputs, and Crewluve's tests check them.
- **On the website:** the site keeps a copy (`npm run sync-golden`). Its tests run every case, and a mismatch fails the build.
- **When they disagree,** the app wins (D5). A fix to the app's logic changes the cases first, and the site follows.

## 8. The move-over

1. **Pilot updates CrewLu while on CrewLu Cloud.** CrewLu does three things:
   - it creates a `partners` row for each existing iCloud participant, named with the partner's current display name;
   - it creates a move ticket for each one;
   - it writes `moveTicketByPartnerJSON` into the iCloud record, keyed by CloudKit user record name (the same key `displayNameByPartnerJSON` uses).

   It repeats this whenever a new participant appears, and it keeps writing both the iCloud record and the cloud row.
2. **Partner updates Crewluve.** On an iCloud fetch, Crewluve finds its own ticket and calls `partner_handoff_redeem`. It saves the key and switches its source to CrewLu Cloud.
   - If the redeem or the first cloud fetch fails, it stays on iCloud and tries again on the next fetch. The move never drops a partner onto the welcome screen.
   - Once moved, Crewluve ignores iCloud entirely, so CrewLu stopping the share later doesn't show "Sharing has ended".
3. **Every ticket is used.** CrewLu stops the iCloud share and deletes the record (`stopSharing`, `PilotStatusBeaconManager.swift:560-588`).
4. **Either app may update first.** An updated Crewluve whose pilot hasn't updated simply stays on iCloud.
5. **Pilots not on CrewLu Cloud:** iCloud keeps working, with the prompt from §7.1.
6. **Website visitors using the pilot's password** stay signed in until the website piece ships. Then the pilot sends them their link.
7. **The following release removes iCloud sharing from both apps.** When to ship it is decided at the time, based on how many partners have moved (§11).

Ticket exposure: every iCloud participant can read every ticket, but those are the same people who can already read the whole summary. A ticket works once and expires after 90 days.

## 9. Pieces and build order

Each piece gets its own spec → plan → build → review → release, in its own repo.

| # | Piece | Repo | Depends on | Visible change |
|---|---|---|---|---|
| 1 | **Cloud door:** tables, RLS, the §5.3 RPCs, `set_partner_status`, and SQL tests | Duty (`supabase/`) | — | none |
| 1b | **App-link file** for `/join` | website | — | none |
| 2 | **CrewLu:** cloud summary writer, partner list and page, Cloud required for new invites, move tickets | Duty | 1 | pilots (App Store) |
| 3 | **Push service:** trigger, `pg_cron`, the `partner-push` function, APNs | Duty (`supabase/`) | 1, APNs key | none |
| 4 | **Crewluve:** cloud source, links, welcome screen, hand-off, pushes, move-over, golden cases | Crewluv | 1, 1b, 3 live | partners (App Store) |
| 5 | **Website:** links, `partner_view`, Crewluve's logic, golden cases, password sign-in removed | website | 1, 4's golden cases | partners |
| 6 | **Remove iCloud sharing** | Duty, Crewluv | most partners moved | both |
| — | **App fixes from D10** (sun times, callsign split) | Crewluv | — | partners |

- **Release order:** 1 and 1b first. 3 must be live before 4 ships, otherwise moved partners lose background alerts. 2 and 4 can be reviewed in parallel. 5 follows 4.
- **Branch state to sort out first:**
  - Duty is on `feature/supabase-account-backend`, with someone else's uncommitted scheme files.
  - Crewluv is on `hotfix/icloud-account-unavailable`, 13 commits ahead of `main`.
  - Each piece's plan starts by settling which branch it builds on.

## 10. Only the user can do

- Create the APNs key in the Apple Developer account and add its secrets to the Edge Function (key ID, team ID, `.p8` contents, Crewluve bundle ID). Claude never handles the key itself.
- Approve each production database migration, deploy and push.
- Submit CrewLu and Crewluve to the App Store.

## 11. Later, not now

- Live pings for open screens: a Realtime broadcast to a secret per-pilot topic, so screens refresh in about a second instead of 30–60 s.
- When to ship piece 6, and what Crewluve says to a partner whose pilot never moved ("Ask {Name} to update CrewLu").
- Whether Partner Sharing stays Pro-only once it becomes a paid add-on (unchanged for now).
- Following more than one pilot from one Crewluve.

## 12. Testing (per piece, detailed in each spec)

- **Piece 1:**
  - SQL tests on a local Supabase stack: every RPC's happy path and its `sharing_ended` cases, the per-partner trimming, the device limit, the hand-off failure throttle, and the old-build guard.
  - Proof that partners can't read any owner table.
  - A Supabase advisors check after applying.
  - A check that the existing owner policies are unchanged.
- **Piece 2:** encoding round-trips against the JSON Schema and fixtures, the partner list view model, the move-ticket mapping, and both writers running together.
- **Piece 3:** the function's due and throttle logic, the APNs request format against Apple's docs, and token clean-up. One real push to a TestFlight build.
- **Piece 4:** link parsing, Keychain, the source switch and its fallback, push handling, the move-over state machine, and golden cases generated and checked.
- **Piece 5:** every golden case, the network guard (RPCs only), polling with `unchanged`, the welcome flows, and demo mode.
- **End to end before piece 4 ships:**
  1. a test pilot invites a test partner;
  2. they connect on the iPhone and the web;
  3. the pilot removes a device, uses New Link, and removes the person;
  4. an iCloud partner moves over without a tap.
