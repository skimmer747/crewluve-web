# Partner Alert Pushes: Alerts That Arrive on Time

- **Status:** design approved in brainstorming on 2026-10-23, and the user approved this spec the same day. Plan 1, Crewlu Cloud, is built and set up (`docs/superpowers/plans/2026-10-23-partner-alert-pushes-1-cloud.md`, §14). Next: plan 2, Crewluve 1.3.
- **Part of:** the partner-links design, `docs/superpowers/specs/2026-10-15-partner-links-design.md` (§6.1). It follows piece 3's push service (`docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md`) and piece 4's Crewluve (`docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md`, §6 and §17.3).
- **Repos:** CrewLu, `~/Dev/Duty`, in `supabase/` only (plan 1), and Crewluve, `~/Dev/Crewluv` (plans 2 and 3). CrewLu's app doesn't change.
- **Contract:** `~/Dev/Duty/supabase/partner-api.md`, whose "Pushes" section this design changes (§11).

## 1. Goal

1. **A partner's alert shows within seconds of the pilot's change,** even on a phone where Crewluve is rarely opened: swiped away, with Background App Refresh off, or out of iOS's background budget.
2. **The same alerts as today,** for the same changes and in the same words. Nothing alerts twice.
3. **One quick status alerts once,** and only the people it was sent to.
4. **Names, statuses and times never pass through Apple's push service.**
5. **Crewluve 1.2 keeps working as it does, with fewer pushes.** CrewLu doesn't change.

## 2. What's there now (checked 2026-10-23)

### 2.1 The push service

- **Every push is silent.** partner-push sends `{"aps":{"content-available":1}}` with `apns-push-type: background`, priority 5, and an expiry an hour ahead (`~/Dev/Duty/supabase/functions/partner-push/index.ts:16, 47-64`).
- **Every write pushes every device.** Each applied `set_partner_status` sets `push_due` (`supabase/migrations/20261015120100_partner_links_pilot_rpcs.sql`). Every 15 seconds the check calls partner-push while a pilot is due. `partner_push_claim` takes each due pilot and hands out every `app` device of every partner of theirs (`supabase/migrations/20261018120000_partner_links_push.sql`). Nobody compares what a partner saw before with what they see now.
- **A temporary failure marks the whole pilot due again** (`partner_push_report`), so all of that pilot's devices get the push again.
- **`partner_status` keeps only the latest summary.** `last_push_at` is set at each claim.

### 2.2 Crewluve 1.2

- **A push makes the alerts on the phone.** A silent push without `ck` refreshes through `PilotStatusSource` (`Crewluv/Services/PushRoute.swift`), which hands each new reading to `StatusChangeNotifier` once (`PilotStatusSource.adopt`, `StatusNotifying.evaluate`). The notifier compares it with its saved snapshot and posts local notifications at once (`Crewluv/Services/StatusChangeNotifier.swift:68-115, 338-359`).
- **The rules** (`StatusChangeNotifier.swift`):
  - schedule (121-210): a new trip, a cancelled trip, the home arrival moving more than 15 minutes, the next departure moving more than 15 minutes when the legs changed, and the trip's length changing;
  - quick status (230-267): a change to a status that isn't empty. Sleeping has no sound;
  - flight delay (271-298): the effective delay changing;
  - status (302-327): a change to Home or to In Flight.
- **Two values come from the legs** (`Crewluv/Services/StatusNotifying.swift`):
  - the effective delay (`SharedPilotStatus.effectiveFlightDelayMinutes`, 103-127): the summary's own delay, or else the first flight leg with a delay that hasn't landed yet;
  - the home arrival (`TripStateResolver.resolveHomeArrival`, 260-281).
- **In front,** every notification shows as a banner with sound (`Crewluv/App/AppDelegate.swift:89-94`).
- **The device key** is a generic password under the service `com.ToddAnderson.Crewluv.partnerCloud`, readable after the first unlock, this device only. It names no access group, so it lives in Crewluve's own group, its application identifier (`Crewluv/Services/PartnerCloud/DeviceKeyStore.swift:58, 142-156`). `Crewluv.entitlements` has no `keychain-access-groups` and no App Groups.
- **The name the alerts use** is `ResolvedPilotDisplayName` in standard UserDefaults (`Crewluv/Models/PartnerConnection.swift:22`).
- **The targets** are the app, `CrewluvTests` and `CrewluvUITests`. There are no extensions.

### 2.3 What iOS did

Piece 4 spec §17.3 has the details:
- **On the rarely used phone,** three iOS rules held Crewluve back, one after another: the app had been swiped away; its own Background App Refresh switch was off; and then a zero energy budget held the push launch for 13 minutes, until the phone was plugged in.
- **On the heavily used phone,** Crewluve woke within about a second of each push.

### 2.4 The bursts

Crewlu Cloud's request log for 2026-10-23 shows where the extra writes came from. Every write came from one phone, the pilot's CrewLu (build 199):

| Quick status | Writes (UTC) | What made them |
|---|---|---|
| Out for Dinner | 18:41:48, 18:42:02, 18:42:11 | CrewLu coming to the front, Partner Sharing opening, the quick status sheet's Update |
| Sleeping | 18:48:37, 18:48:45 | Partner Sharing opening, Update |
| A later test | 19:02:02, 19:02:07, 19:02:11, 19:02:20 | four writes in 18 seconds, the first as CrewLu came to the front |

- **Only the last write of each carried the quick status.** Yet each applied write pushed every device: partner-push ran at 18:41:54, 18:42:08 and 18:42:23, and sent 2 pushes each time.
- **Why CrewLu writes again** (on `feature/partner-cloud-screens`):
  - coming to the front hands the writer a summary (`syncNowIfSharing()`, `Duty/App/DutyApp.swift:1130`). `PartnerSummaryCloudWriter` skips it only when it equals the last summary applied since CrewLu started (`Duty/Utils/PartnerCloud/PartnerSummaryCloudWriter.swift`);
  - a forced write always goes. Opening Partner Sharing calls `updateStatusNow()`, which forces one (`Duty/Views/Settings/PartnerSharingView.swift:1429-1471`), and so does the sheet's Update (`Duty/Views/Settings/PartnerQuickStatusSheet.swift:548`).

## 3. Decisions (brainstorm, 2026-10-23)

| # | Decision |
|---|---|
| A1 | **Crewlu Cloud decides, the phone writes** (the user's choice). partner-push picks which changes alert each partner, with today's rules copied from Crewluve (§5.3). The push names only the alert's kind. Crewluve's new Notification Service Extension, the helper, reads `partner_view` and writes the words (§6.1).<br>Rejected:<br>• Crewlu Cloud writing the words: names, statuses and times would pass through Apple, and times would need each partner's time zone.<br>• The phone deciding: hiding an alert needs Apple's filtering entitlement, which Apple grants mainly to encrypted messaging apps. Without it, every small change would alert. |
| A2 | **Alerts only** (the user's choice). Crewluve 1.3 gets one alert push per alert and nothing else. It refreshes when it's opened and every 60 seconds while it's in front, as it does now. Crewluve 1.2 keeps its hidden pushes and its own alerts. |
| A3 | **The bursts are fixed in Crewlu Cloud only** (the user's choice). A partner gets a push only when something changed for them, leaving out `lastUpdated` and `localTimeAtPilot`. That covers every CrewLu version and needs no CrewLu release. CrewLu's extra writes stay.<br>Rejected:<br>• also changing CrewLu, which needs its held partner release;<br>• waiting about 10 seconds to merge quick changes, which makes every alert later. |
| A4 | **Sleeping stays as today** (the user's choice): an alert with no sound. |
| A5 | **Crewlu Cloud first, then Crewluve 1.3** (the user's choice). Crewlu Cloud's part goes live once it's built and reviewed. That also ends the burst pushes for 1.2 phones. 1.3 follows through TestFlight and the App Store. Neither waits for CrewLu's partner release. |

Approved mockups (widgets in this brainstorm): `partner_alerts_today_vs_alert_push`, `sleeping_alert_lock_screen_options` and `crewluve_alert_push_three_outcomes`.

## 4. The parts

### 4.1 Crewlu Cloud (plan 1)

| Part | Change |
|---|---|
| `public.partner_status` | A new `pushed_status jsonb`: the summary the next change is compared with (§5.1), null until the first claim. `last_push_at` already says when it was handled. |
| `private.partner_device_secrets` | A new `push_alerts boolean not null default false`: the device can show alert pushes. |
| `public.partner_set_push` | A new optional `p_alerts boolean default false`, saved as `push_alerts` with the token. A call without it, as 1.2 makes, saves false. |
| `public.partner_push_claim` | Also hands out each partner's view before and after (§5.2), and each device's id, `push_alerts`, and whether it joined after the change was written. It sets `pushed_status`. |
| The retry list | Pushes to try again, one per device (§5.5). |
| `private.partner_push_tick()` | Also calls partner-push while a retry is waiting, once it has dropped those past their time. |
| partner-push | The rules (§5.3), the choice for each device (§5.2), the alert push (§5.4) and the retries (§5.5). |
| `supabase/partner-status/alert-cases.json` | The shared test cases (§9.1). |
| `supabase/partner-api.md` | "Pushes" and `partner_set_push` (§11). |

### 4.2 Crewluve 1.3 (plan 2)

| Part | Change |
|---|---|
| A new target, the helper | A Notification Service Extension, bundle id `com.ToddAnderson.Crewluv.NotificationService`. It reads the status and writes the alert (§6.1). |
| Shared code | The helper compiles the app's own files for the door (`PartnerDoor`, `LivePartnerDoor`), the key (`DeviceKeyStore`), the translation (`CloudSummary`, `SharedPilotStatus`, `TripLeg`) and the legs (`TripStateResolver`). |
| `AlertWording` (new) | The words for each kind, and the plain lines (§6.4). `StatusChangeNotifier` and the helper both use it, so the words can't drift apart. |
| The helper's entitlements | Crewluve's own Keychain group (§6.2). |
| `PushRegistrar` | Sends `p_alerts: true`, and remembers when Crewlu Cloud accepted it (§6.3). |
| `StatusChangeNotifier` | Still compares and saves its snapshot on every reading, but posts only when §6.3 allows. |
| `PushRoute`, `AppDelegate` | Tell the notifier when a reading came from a hidden push (§6.3). |
| `PartnerConnection` | Also saves the pilot's name for the helper (§6.2). |

### 4.3 CrewLu

No change.

## 5. Crewlu Cloud (plan 1)

### 5.1 What it keeps

- **For each pilot:** `pushed_status`, the summary the next change is compared with, and `last_push_at`, when the last change was handled. A summary Crewluve wouldn't take as news doesn't replace `pushed_status`: one that isn't newer, or that's missing what Crewluve needs to read it (§14.2).
- **For each device:** `push_alerts`.

### 5.2 Each run

1. **Claim** takes each due pilot, in one statement as today. For each of their partners with an `app` device that has a token, it hands partner-push:
   - **before:** `private.trim_status_for(pushed_status, partner)`, or null when there's no `pushed_status` yet;
   - **after:** `private.trim_status_for(status, partner)`;
   - **when:** the previous `last_push_at` for before, and now for after;
   - **each device:** its id, its token, its environment, `push_alerts`, and whether it joined (`partner_devices.created_at`) after the summary was written (`partner_status.updated_at`), so it read this summary on connecting.

   It then sets `pushed_status` to the summary, unless Crewluve wouldn't take it as news (§5.1), `last_push_at` to now, and `push_due` to false.
2. **partner-push, for each partner,** works out:
   - **changed:** before and after differ as JSON values, whatever their key order, once `lastUpdated` and `localTimeAtPilot` are left out of both. A null before counts as changed;
   - **alerts:** §5.3's rules from before to after. There are none when before is null.
3. **Each device gets:**

   | Device | Gets |
   |---|---|
   | `push_alerts`, joined before the change was written | one alert push per alert (§5.4), and nothing when there's none |
   | `push_alerts`, joined after it | nothing this run: it read this summary on connecting, and Crewluve alerts nothing on its first reading today |
   | not `push_alerts` (Crewluve 1.2) | one hidden push, as today, when changed, and nothing otherwise |

4. **Report,** as today, plus the retry list's changes (§5.5).

A quick status sent to one partner changes only that partner's view, so only their devices get anything.

### 5.3 The rules

These are today's `StatusChangeNotifier` rules, applied to one partner's view. Where they read a value Crewluve works out at a given moment, Crewlu Cloud works it out the same way: before at the previous `last_push_at`, after at now.

- **The quick status shown at a moment** (piece 4 spec §5.4): this partner's entry in `quickStatusByPartner` while it hasn't expired, then the top-level one while it hasn't expired, then none.
- **The effective delay at a moment:** `flightDelayMinutes` when it isn't 0; else the `delayMinutes` of the first flight leg, in the summary's order, whose delay isn't 0 and whose end plus that delay is still ahead; else 0.
- **The home arrival at a moment:** `TripStateResolver.resolveHomeArrival`, or else `homeArrivalTime`. It takes the trip block covering that moment, or else the next block. A block is a run of legs no more than 24 hours apart. Within it, the arrival is the latest delay-shifted end of a flight, event or drive leg that arrives at the home airport and hasn't ended yet.
- **The legs compare as legs:** over the fields Crewluve's `TripLeg` reads, as `StatusChangeNotifier.legsDiffer` does, whatever the key order.

| Kind | When | Words, written on the phone (§6.1) | Sound |
|---|---|---|---|
| `quick-status` | the text of the quick status shown changed, and the new one isn't empty | Call Me "is asking you to call", Free to Talk "is free to talk", Out for Dinner "went out for dinner", Sleeping "is sleeping"; any other, the status itself | yes; none for Sleeping (A4) |
| `home` | `displayStatus` changed to `Home` | "is home!" | yes |
| `took-off` | `displayStatus` changed to `In Flight` | "just took off" | yes |
| `delayed`, `early` | the effective delay changed, to above 0 or below 0 | "Delayed 45 minutes", "Departing 10 minutes early" | yes |
| `delay-cleared`, `early-cleared` | the effective delay changed to 0, from above 0 or below 0 | "Delay cleared", "Early departure cleared" | yes |
| `new-trip` | `currentTripId` appeared | "Has a new 4-day trip", or "Has a new trip" without `tripTotalDays` | yes |
| `trip-cancelled` | `currentTripId` went away | "Trip was cancelled" | yes |
| `home-later`, `home-earlier` | both home arrivals are known, and it moved more than 15 minutes later or earlier | "Getting home later — now 5:45 PM", "Getting home earlier — now 4:10 PM" | yes |
| `departure` | the legs changed, both `nextDepartureTime`s are known, and it moved more than 15 minutes | "Departure changed — now 6:10 AM" | yes |
| `trip-extended`, `trip-shortened` | both `tripTotalDays` are known and differ, with a trip before and after | "Trip extended to 5 days", "Trip shortened to 3 days" | yes |

One change can make several alerts, as today: a delay and a departure change, say.

### 5.4 The alert push

- **Headers:** `apns-push-type: alert`, `apns-priority: 10`, `apns-expiration` an hour ahead, and `apns-topic` as today.
- **Body:** `{"aps":{"alert":{"body":"New update"},"mutable-content":1,"sound":"default"},"kind":"<kind>"}`. A Sleeping quick status has no `sound`.
- **Nothing else:** no name, status, time, legs or key. "New update" shows only if the helper doesn't run (§6.1).
- **One push per alert.** Two alerts from one change send two pushes, as Crewluve posts two notifications today.
- **Hidden pushes keep today's form,** and go only to devices without `push_alerts`.

### 5.5 Failures

| What happens | What partner-push does |
|---|---|
| 200 | Sent |
| 400 `BadDeviceToken`, or 410 | Dead: the token is dropped, as today. Crewluve sends a fresh one, with `p_alerts`, at its next launch |
| 403 `ExpiredProviderToken` | One renewal and one more try, as today |
| A setup error | Logged, not retried, as today |
| 429, 500, 503, a timeout or a network error | That push, to that device, goes on the retry list. Each run sends what's on the list until Apple takes it, an hour has passed since the change, or the device has left or no longer holds that token. The pilot isn't marked due again, so no other device gets the push twice |

- **The retry list replaces today's retry of a whole pilot,** for hidden pushes too. With the comparison in place, a re-claimed pilot would compare the summary with itself and send nothing.
- **partner-push stopping after a claim:** that run's pushes are lost, as today (piece 3 spec §7). The partner sees the status when they open Crewluve.

### 5.6 What doesn't change

The 15-second check, the signing token, the probe, dropping dead tokens, and the website, which polls. Each pilot still gets at most one run every 15 seconds.

## 6. Crewluve 1.3 (plan 2)

### 6.1 The helper

- **iOS runs it for every alert push with `mutable-content`,** whatever state the app is in: swiped away, Background App Refresh off, Low Power Mode. It has about 30 seconds, and iOS calls `serviceExtensionTimeWillExpire` near the end.
- **Its steps:**
  1. Read the push's `kind`. An unknown kind, from a later Crewlu Cloud, keeps the push's own "New update".
  2. Read this device's key from Crewluve's Keychain (§6.2). With no key, or a key that can't be read yet (before the first unlock after a restart), show the plain line.
  3. Call `partner_view(p_key)`, without `p_since`, with the door's 20-second limit.
  4. With a status, translate it as the app does (`CloudSummary` into `SharedPilotStatus`, at now) and write:
     - **the title:** the pilot's name as this partner sees it (`displayNameByPartner`, else `pilotFirstName`). Delays get "{name}'s Flight", as today;
     - **the body:** the kind's words (§5.3), with the numbers and times from this status: the effective delay, `tripTotalDays`, the home arrival, `nextDepartureTime`. Times use "h:mm a" in the phone's own time zone, as today;
     - **the sound:** as the push has it.

     When the status no longer fits the kind, say the quick status was cleared or the delay is gone, show the plain line.
  5. Anything else shows the plain line: `sharing_ended`, a refusal, Crewlu Cloud unavailable, a status that doesn't decode, or iOS's time running out.
- **The plain line** is §6.4's words for the kind, titled with the name the app saved (§6.2), or with no title.
- **It only reads.** It never forgets a key, changes the connection, or touches the alerts' snapshot. A `sharing_ended` is left for the app to find.
- **It logs nothing secret.** Logs are in debug builds only, and never print the key (piece 4 spec §9).
- **Its read counts as the device being seen** (`last_seen_at`), as the app's reads do.

### 6.2 The key and the name

- **The helper reads the key where it already is.** Its entitlements list Crewluve's own Keychain group, `$(AppIdentifierPrefix)com.ToddAnderson.Crewluv`, which holds the app's items today (§2.2). So it reads the key 1.2 saved, and nothing moves. The app's entitlements and Keychain code stay as they are.
- **A real phone proves it first** (§9.4 step 1). If iOS refuses, the fallback: the app and the helper share a new Keychain group, and the app copies the key into it at launch. Until the app has run once, that phone gets plain lines.
- **The name:** whenever the app saves `ResolvedPilotDisplayName`, it also saves the name in a Keychain item next to the key (`pilotName`: this device only, after the first unlock, not synced). It deletes that item when it forgets the pilot.

### 6.3 When the app still makes its own alerts

- **Every reading still goes to `StatusChangeNotifier`,** which compares it and saves its snapshot, as today.
- **It posts notifications only:**
  - for a reading that a hidden push started, since Crewlu Cloud sends those only to devices it treats as 1.2;
  - for any reading before Crewlu Cloud has accepted this device's `p_alerts` registration;
  - on iCloud, always, as today.
- **Otherwise the alert push brings the alert,** so nothing alerts twice.
- **`PushRegistrar` sends `p_alerts: true` with every registration,** and remembers the key that Crewlu Cloud last accepted it for. A new key isn't accepted until its own registration is.

So a phone that updated overnight but wasn't opened loses nothing. It's still registered as 1.2: its hidden pushes still come, and they still make its alerts. Its first registration switches it over.

### 6.4 The plain lines

| Kind | Plain line |
|---|---|
| `quick-status` | "sent a quick status" |
| `home`, `took-off` | "is home!", "just took off" (complete as they are) |
| `delayed`, `early` | "Flight delayed", "Departing early" |
| `delay-cleared`, `early-cleared` | "Delay cleared", "Early departure cleared" |
| `new-trip`, `trip-cancelled` | "Has a new trip", "Trip was cancelled" |
| `home-later`, `home-earlier` | "Getting home later", "Getting home earlier" |
| `departure` | "Departure changed" |
| `trip-extended`, `trip-shortened` | "Trip extended", "Trip shortened" |

### 6.5 What doesn't change

- **iCloud reads, the move-over, and the screens.**
- **In front,** alert pushes show as banners with sound (`willPresent` is unchanged).
- **Tapping an alert** opens Crewluve, which reads on coming to the front.
- **Permission:** Crewluve asks for notifications as today. There's no new prompt.

## 7. What can go wrong

| Case | What happens |
|---|---|
| The phone is off or offline | Apple keeps the alert for up to its hour. After that it's dropped, and the status shows when Crewluve opens. Today a late alert can pop up hours later |
| Changes in a row | At most one run per pilot every 15 seconds, each alerting what changed since the last. The helper writes what's current, or the plain line when the change was undone |
| Notifications off, a Focus, a Scheduled Summary | iOS's settings apply, as for any app |
| The helper can't read the key or the status | The plain line (§6.4) |
| The helper doesn't run or fails | The push's own "New update" |
| An updated phone not opened yet | Still registered as 1.2: hidden pushes, which still make its alerts (§6.3). Alert pushes from its first registration on |
| Apple turns a push away for a moment | Retried to that device only, for up to an hour (§5.5) |
| A partner device joins | Nothing in its first run (§5.2) |
| Partners still on iCloud | Unchanged: iCloud's hidden pushes and Crewluve's own alerts, until they move over to Crewlu Cloud |

## 8. Security and privacy

- **A push carries no secret and no personal text:** only a kind, "New update", and a sound or none. The kind says what sort of change happened, such as a cancelled trip or a quick status, but nothing about it.
- **The device key stays in the Keychain.** The helper reads it and sends it only to Crewlu Cloud, over HTTPS, as the app does.
- **The saved name stays on the phone,** in the Keychain, for this device only.
- **No new data leaves the phone.** `p_alerts` is a yes or no about the build. Crewluve's App Privacy answers don't change.
- **The repos are public.** Tests and cases use made-up partners, as piece 4's do.

## 9. Testing

### 9.1 The shared cases

- **Where:** `~/Dev/Duty/supabase/partner-status/alert-cases.json`, beside the summary examples.
- **What a case is:** an entry in that file, with two summaries as fields over a shared base, the two moments, a partner id, and the alerts expected: their kinds, plus the words at a fixed time zone.
- **What they cover:** every row of §5.3, and:
  - a quick status that expires between the two moments;
  - a quick status for another partner, which alerts nothing;
  - a write where only `lastUpdated` changed;
  - no before;
  - Sleeping without sound;
  - several alerts from one change.
- **How they're made:** plan 1 writes them, and checks each against Crewluve's real `StatusChangeNotifier` and `TripStateResolver` in a scratch harness before committing them.
- **How they're kept:** plan 2 adds a Crewluve test that runs every case through the app's rules and `AlertWording`. A later change to either side fails a test until both agree.

### 9.2 Crewlu Cloud

These run in piece 1's local test setup (PGlite, run with `node --no-maglev --test`), with partner-push under Node, as in piece 3.

- **Claim:** before and after for each partner, `pushed_status` and `last_push_at` set, the join flag, and the retries due.
- **`partner_set_push`:** `p_alerts` is saved, and the three-parameter call that 1.2 makes still works.
- **partner-push:**
  - every row of §5.2's table and every shared case;
  - the alert push's headers and body, which hold no name, status or time;
  - no `sound` for Sleeping;
  - the retry list: only the failed device, and only for an hour;
  - 1.2's hidden push only when changed.
- **Before it goes live:** deliberate breaks, each of which a test must catch, then a separate review.

### 9.3 Crewluve

These are Swift Testing tests in the Mac harness, as in piece 4.

- **The words:** each kind with its numbers and times at a fixed time zone, each plain line, and "New update" for an unknown kind.
- **The helper's steps,** with a stand-in door and key store: each answer of `partner_view`, no key, and a timeout.
- **§6.3's rule:** a hidden push's reading posts; other readings post only until the registration is accepted; iCloud always posts.
- **The registrar** sends `p_alerts` and remembers its acceptance for each key.
- **The shared cases.**

Then come a compile-only build that includes the new target, and the user's ⌘U.

### 9.4 On real phones

These run with TestFlight 1.3, once plan 1 is live, on the two real partners' phones:

1. **The rarely used phone.** Install 1.3 over the App Store's 1.2, so the key 1.2 saved stays, and open it once. Then swipe it away, turn its Background App Refresh off, and leave it unplugged. The pilot sends a quick status to that partner only:
   - the alert shows within seconds, in the right words;
   - Crewlu Cloud's log shows the helper's `partner_view`, which proves the Keychain group (§6.2);
   - the other partner's phone gets nothing.
2. **Sleeping, to the same partner,** shows with no sound.
3. **In CrewLu, opening Partner Sharing and coming back to the front** pushes nobody (partner-push's log: nothing sent).
4. **With Crewluve open,** an alert shows once, as a banner.

## 10. Building and releasing (A5)

1. **Plan 1, Crewlu Cloud:**
   - a new Duty branch off `feature/supabase-account-backend`, as in piece 3, with changes in `supabase/` only;
   - reviewed, then pasted in by the user: the SQL in the SQL editor, the function in Supabase's editor;
   - it goes live before 1.3 reaches TestFlight, because 1.3's `p_alerts` needs the new `partner_set_push`.
2. **Plan 2, Crewluve 1.3:**
   - a Crewluv branch off its release line (`hotfix/icloud-account-unavailable`, 1.2 (44));
   - the new target and its Keychain group take Xcode steps, given click by click.
3. **Plan 3, the release:**
   - 1.3 to TestFlight's external group, then §9.4's checks, then the App Store;
   - Crewluve's App Privacy answers don't change.
- **CrewLu:** nothing. Its partner release, held for 3.0.2, doesn't depend on this. Partners it moves over get alert pushes once they're on 1.3.
- **Every push to GitHub gets its own yes.**

## 11. Changes to other docs

- **`supabase/partner-api.md`:**
  - **"Pushes":** a device that registered `p_alerts` gets alert pushes (§5.4), and one that didn't gets hidden pushes. Either kind comes only when something changed for that partner, and is retried to that device only;
  - **`partner_set_push`'s row:** the new `p_alerts`.
- **The umbrella design:** D8 and §6.1 point to this spec.
- **The piece 3 spec:** §1's "Silent pushes only" and §13's "Pushes with visible alerts" point to this spec.
- **The piece 4 spec:** §17.3's last finding points to this spec.
- **Crewluv's `CLAUDE.md`:** the helper target, and that alerts come from pushes on Crewlu Cloud (plan 2).

## 12. Not in this design

- CrewLu's extra writes (A3).
- Alerts that break through a Focus (time-sensitive), say for "Call Me".
- A newer alert replacing an older one (`apns-collapse-id`).
- Alerts for partners still on iCloud.
- The website, which polls.
- Apple's filtering entitlement (A1).
- The helper saving what it read for the app, which reads on opening anyway.

## 13. The plans

1. **Plan 1, Crewlu Cloud** (CrewLu repo, `supabase/` only): the shared cases, `pushed_status` and `push_alerts`, claim's before and after, the rules, the alert push, the retry list, `partner_set_push`'s `p_alerts`, and `partner-api.md`. It ends with the user's setup and a live check.
2. **Plan 2, Crewluve 1.3** (Crewluv repo): the helper target, its Keychain group, `AlertWording`, the saved name, the registrar's `p_alerts`, §6.3's rule, the tests and the shared cases. It ends with the user's ⌘U.
3. **Plan 3, the release:** 1.3 through TestFlight, §9.4's checks, then the App Store.

## 14. Decisions made while planning and building plan 1

### 14.1 While planning

Plan 1's list, as it stands there. The review changed 7, 8 and 11 (§14.2).

1. **One script, run once after piece 3's,** `20261023120000_partner_links_alert_pushes.sql`. A second run fails at its first statement and changes nothing. Its undo, in its header, makes piece 1's `partner_set_push` and piece 3's claim, report and check again from their own text, and a test checks their definitions and grants against a database built up to piece 3.
2. **`partner_set_push` is dropped and made again with `p_alerts boolean default false`.** Crewluve 1.2's three-parameter call still works, since PostgREST fills in the default, and there are never two to choose between. The flag goes with the token: wherever a token is cleared, because it moved to a newer device or Apple called it dead, its flag is too.
3. **Piece 3's second-run and undo tests run on a database built up to piece 3** (`partnerDbUpTo`), since its undo names the `partner_set_push` and report this script replaces.
4. **Claim reads each row's previous values through a join to itself,** in the one statement that clears the mark and moves `pushed_status` and `last_push_at` on. CrewLu Cloud runs Postgres 17, which has no `OLD` in `RETURNING`.
5. **Claim trims both views with the door's own `private.trim_status_for`,** so partner-push never sees another partner's entries. It works out `changed` in SQL (`private.push_compared`): the views without `lastUpdated` and `localTimeAtPilot`, with an empty map of per-partner entries read as none. The door trims a partner's map from null to `{}` when someone else gets an entry, so without that, a quick status for one partner would wake the others' Crewluve 1.2.
6. **The check's clearing counts a change as handled.** When a due pilot has nobody to wake, the check moves `pushed_status` and `last_push_at` on too, so a Crewluve that registers later is compared with the latest change, not one from days before. This refines spec §5.1, where only claim moves them.
7. **A device joined since the last run** when it was made after the previous `last_push_at`, or when there's none.
8. **The retry list is `private.partner_push_retries`:** a token, an environment, a message and an until.
   - Claim takes the whole list in the same call, and hands out what's still in time.
   - Report puts a push back that failed again, with its own until.
   - The check calls partner-push while anything waits.
   - The until is the push's own expiry, an hour after it was first sent, and a retried push keeps it as its `apns-expiration`.
9. **Report's `p_retry_pilots` becomes `p_retries jsonb`.** A re-claimed pilot would now be compared with itself and get nothing, so whole pilots can't be retried any more.
10. **The rules are plain functions in partner-push** (`alertsFor` and its helpers), each named after the Swift it copies.
    - They read the summary's fields as they are, as Crewluve's translation passes them through (piece 4 spec §5.4).
    - They copy each detail the shared cases showed matters: a summary that isn't newer alerts nothing, a missing `displayStatus` reads as Home, a quick status ends at its expiry, and the home arrival comes from trip blocks.
    - Crewluve's trimming of layovers isn't copied, since it can't change either answer: `homeArrival`'s comment says why.
11. **One push per alert, in StatusChangeNotifier's order.** A device that joined since the last run gets none.
12. **The answer's counts gain `alerts`.** The log line becomes "N sent (N as alerts), …", and a run that finds nothing new for anyone logs "nothing new to send", so Task 8 can see that CrewLu's extra writes push nobody.
13. **The shared cases are one file,** `supabase/partner-status/alert-cases.json`: a base summary, 36 cases as fields over it, and each case's alerts, with their words for `America/New_York`. They're cut down to the fields the rules read, so they don't follow the schema's list of required fields; a test checks that every field they set is one of the schema's.
14. **Built in a worktree, `~/Dev/Duty-alert-pushes`,** on the new branch `feature/partner-alert-pushes` from the release line's tip `7b3aeb2d`, as piece 3 was. The worktree's tests use a copy of `~/Dev/Duty`'s test packages, so nothing is downloaded.
15. **The setup pastes the script, then partner-push, back to back** (Task 8). In between, piece 3's partner-push can't read the new claim, so a change made then isn't pushed. Nobody changes their status in CrewLu meanwhile.

### 14.2 From the review

The review found one critical issue, one important and eight minor; its re-check found four more minor. What changed:

1. **One pilot's summary can't stop every pilot's pushes.** Badly shaped legs made the rules throw, which ended the whole run after the claim had taken everyone. Now a summary missing what Crewluve needs to read it alerts nothing, as in Crewluve. That's its four required fields, and legs that are objects with an id, a type, a start and an end. Each pilot's pushes are also worked out on their own.
2. **Decision 7 (and 11), changed:** a device misses a change's alerts only when it joined after that change was written (`partner_status.updated_at`), since it read that summary on connecting. "Since the last run" lost 1.3's first alert after connecting, and 1.3 stops making its own alerts once registered (§6.3). A device that joins between two writes before a run can get an alert for the first one again.
3. **`pushed_status` keeps the summary Crewluve would keep** (`private.push_baseline`, with `private.push_readable`). A summary that isn't newer, or that's missing what Crewluve needs to read it, doesn't replace it.
   - **A phone's clock running ahead:** a kept summary dated more than an hour ahead of Crewlu Cloud's clock stops counting as newer, so it can't hold back the ones after it. The first summary after the clock is put right alerts nothing, as in Crewluve.
   - **Accepted:** a 1.2 device's `changed` is compared with the same summary, and "before" is still worked out at the last run's time.
4. **Decision 8, changed:** the retry list keeps each push's device (`device_id`). Claim hands a retry out only while that device still holds that token, so a retried push can't reach a phone after its partner left or its token moved.
5. **The check drops the retries past their time** before it decides whether to call partner-push.
6. **The undo, once 1.3 is out, leaves 1.3 with no pushes:** 1.3 registers with `p_alerts`, which piece 1's `partner_set_push` doesn't take. The script's header and `partner-api.md` say so.
7. **Left for later:**
   - **A retried alert can show twice** when Apple delivered it but its answer timed out. An `apns-collapse-id` per alert would fix that, in partner-push alone.
   - **Claim hands out both views** for partners with no alert device.
   - **A 1.2 device gets no hidden push** when only the time changed what its rules would say.

### 14.3 The setup (2026-10-24)

- **Live:** the script, partner-push version 8, the probe, the contract's checks, the 15-second check and the advisor, as the plan's Task 8 lists them.
- **Supabase's API sessions refuse an UPDATE or a DELETE without a WHERE clause** (safeupdate), even inside a function, and the tests' PGlite doesn't.
  - **What happened:** the claim deleted the retry list with no WHERE clause, so for three and a half minutes every run with a pilot due failed and rolled back.
  - **The fix:** the fixed claim (`where true`) went in on its own, the waiting change went out at the next run, and nothing was lost.
  - **Since then:** a test checks every function for such a statement.
- **The bursts:**
  - **On the ground:** a write that changes nothing a partner sees pushes nobody.
  - **In flight, by CrewLu's schedule:** its summary carries the plane's position along the route, worked out from the clock on every write, so each write wakes 1.2 phones. Crewluve doesn't show that position.
  - **The user's call: leave it.** A pilot in the air has no connection, so it only happens when the schedule says "in flight" and the phone is online.
- **Still to check:** a quick status to one partner pushes only that partner's phone. It waits until CrewLu no longer shows a flight under way.

### 14.4 For plan 2

- **An ordinary trip's end alerts "Trip was cancelled",** since CrewLu clears `currentTripId` when a trip ends.
  - **Another trip scheduled:** it also alerts "Getting home later — now 5:23 AM". That's the next trip's arrival, a time with no date.
  - **"Has a new trip"** comes when a trip starts, not when it's added.
  - **Who does this:** Crewluve's rules and partner-push's both do, and so does Crewluve 1.2 today.
  - **To decide before 1.3:** whether to change these rules, on both sides and in the shared cases.
- **The registrar** could register again without `p_alerts` when Crewlu Cloud answers 404, as it would after an undo, and keep making its own alerts.
