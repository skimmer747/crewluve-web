# Partner Links Piece 4: Checks on Real Phones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to run this plan task by task, with the user: they do every tap on a device and in Apple's consoles. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Before piece 4's one release, run spec §10.3's checks on real phones, with the checks from piece 2's §8.3 that need the same setup, and the real-phone items §15 and §16 left. A test partner moves from iCloud to Crewlu Cloud by itself, their second device follows, and every link, code, removal and push behaves as designed.

**Architecture:**
- **The pilot is the user's phone,** signed in to their own CrewLu account, running CrewLu's partner build (`feature/partner-cloud-screens` in `~/Dev/Duty`) from Xcode.
  - That Xcode build is what writes the Production iCloud share the user's real partners read. No other device writes it.
  - One real partner reads it through a TestFlight Crewluve, as an external tester. Another reads it through a Crewluve run from the user's Mac.
- **The test partner** is one test Apple ID on two spare devices on iOS 26.
  - It joins the pilot's iCloud share with an old CrewLu invite, since every iCloud invite is the same link to one public share (piece 2 spec §2.4).
  - It moves over by installing Crewluve 1.2 (43), the piece 4 build, from TestFlight. That build is internal only.
  - TestFlight uses the user's own Apple ID on those devices, while iCloud uses the test Apple ID.
- **Claude** bumps Crewluve's version and commits it, and checks Crewlu Cloud read-only through the Supabase connection. Claude records the results and makes no other change.

**Tech stack:**
- Xcode (Archive, TestFlight Internal Only) and App Store Connect;
- the CloudKit Console;
- TestFlight, iOS 26, and iCloud Keychain;
- Crewlu Cloud (Supabase), read-only.

**Design:**
- `docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md`: §10.3, §8, and the real-phone items in §15 and §16.
- `docs/superpowers/specs/2026-10-16-partner-links-piece2-crewlu-design.md`: §8.3, and §14.4's schema step.

---

## Before you start

- **Who does what.**
  - **The user** does every tap on the phones and spare devices, and everything in the CloudKit Console and App Store Connect, since those take their Apple credentials. Claude never types a credential.
  - **Claude** gives click-by-click steps, edits and commits Crewluve's version (Task 3), runs read-only queries on Crewlu Cloud, and records the results.
- **A finding isn't worked around.** When a result differs from what a step expects, stop. Note what happened, with a screenshot if it helps, and decide with the user what's next. Never "fix" an expected value.
- **This plan is public.** `skimmer747/crewluve-web` is a public repo, so neither this plan nor its notes name anyone, or hold an email address, an Apple ID or a password. That includes the test partner's name, which Claude keeps only in the conversation.
- **The real partners stay safe.**
  - **What the partner build does to them:** CrewLu's partner build makes them Crewlu Cloud partners, each with a ticket in the iCloud record. Their Crewluve 1.1.6 ignores tickets, so they keep reading iCloud, and CrewLu shows them as "Needs Crewluve update".
  - **The new build can't reach them.**
    - Crewluve 1.2 is uploaded as TestFlight Internal Only, which can never go to external testers. The real partner on TestFlight is an external tester, and there are no internal testers but the user.
    - The real partner whose Crewluve comes from the user's Mac gets only what's run onto their phone. So never run `feature/partner-cloud-source` from Xcode onto a real partner's phone before the release: it would move them to Crewlu Cloud for real.
  - **The checks never touch them.**
    - Every quick status here goes to a test person, never to Everyone.
    - Every removal is of a test person or a test device.
    - Signing out (Task 11) keeps their updates, since they read iCloud.
- **Claude's checks are read-only.** They use the Supabase connection (`execute_sql`, `get_logs`), which can't change Crewlu Cloud. Each query reads the test partner's rows only, found by the name CrewLu shows for them (`:test_partner` in the queries below). Claude fills that name in when it runs them.
- **Crewlu Cloud's address** is in the Supabase connection's settings. No step needs it.

## Decisions made while planning

1. **The pilot is the user's phone, with their real account** (the user's choice). They have two spare devices, not three.
   - It can't show what needs every iCloud partner moved, since the real partners keep the share open until the release:
     - the iCloud share ending by itself (piece 2 §8.3 step 3);
     - a share that ends during a move (§8.4);
     - the note for a device left behind (§7.7).
   - With one pilot, it also can't show a switch between two pilots, or a reinstall while the iCloud account holds another pilot's share.
2. **The pilot stays an Xcode build.**
   - The user confirmed that their Xcode CrewLu is the only writer of the share their real partners read. One of those partners reads it through a TestFlight Crewluve, which always uses Production, so the Xcode CrewLu writes iCloud's Production environment. An Xcode CrewLu build on this phone also listed both partners in October (piece 2 spec §14.5).
   - Task 0 confirms that the real partners see the current status before anything changes.
   - Both apps leave the environment unnamed in their entitlements, so this is what their builds do, whatever Apple's default for Xcode builds suggests.
   - So the test partner's Crewluve is a TestFlight build too, and no CrewLu TestFlight build is needed.
3. **The ticket field is checked in Production first** (piece 2 §14.4). The pilot's partner build writes `moveTicketByPartnerJSON` into Production, and Production's schema doesn't learn new fields from saves.
4. **The test partner joins with an old invite.** CrewLu's partner build makes no iCloud invites, and every iCloud invite was the same link to one public share. So any old CrewLu invite in the user's Messages works, and CrewLu moves the test partner over as a late joiner (piece 2 §7.6).
5. **Crewluve 1.2, build 43** (the user's choice), uploaded with Xcode's TestFlight Internal Only, added only to an internal group with the user.
   - The spare devices install it through TestFlight with the user's own Apple ID, as the App Store account. iCloud stays on the test Apple ID.
   - The version bump is committed on `feature/partner-cloud-source`, so the build comes from a commit.
6. **The production and sandbox pushes are checked side by side** (§10.3 step 6):
   - the spare devices' TestFlight builds get production pushes;
   - Crewluve run from Xcode on the user's phone gets sandbox pushes, once it joins the test partner by scanning a QR code.
7. **A second test person, Test 2, joins on your phone's Crewluve** for the quick status check (§10.3 step 4), so "only them" is seen on a test device rather than a real partner's.
   - It isn't on a spare device. The spares share one Apple ID, and so one hand-off copy, which would then point at Test 2's device. A spare device that later followed the copy would become one of Test 2's devices.
   - Your phone's copy stays in your own iCloud Keychain.
8. **The order keeps the test partner until the end.** Their removal comes last, after the checks that need them (Tasks 8–11), and Task 13 cleans up.

## What this plan covers

| Check | Task |
|---|---|
| §10.3.5: an iCloud partner updates Crewluve and moves over without a tap | 6 |
| §10.3.5: their second device follows by itself | 7 |
| §10.3.6: a real push wakes a TestFlight build (production) and an Xcode build (sandbox); an alert fires; partner-push's logs count the sends | 8 |
| §10.3.2: a second device connects by QR code | 8 |
| §10.3.2: … and by code | 9 |
| §15: Disconnect, then a relaunch, on a device that came from iCloud | 9 |
| §16 decision 9: an iCloud share link on a device on Crewlu Cloud shows Already Connected | 9 |
| §16 decision 4: a reinstall reconnects with the key it left | 9 |
| §10.3.1: tapping an invite link connects | 10 |
| §10.3.4, piece 2 §8.3.5: a quick status sent to one partner reaches only them (Test 2 on your phone) | 10 |
| Piece 2 §8.3.4: sign out, and the partner keeps the last status; sign back in, and updates resume | 11 |
| §10.3.3, piece 2 §8.3.2: removing a device, then New Link, then removing the person | 12 |
| §15: a reinstall after the pilot removed the device, then a new invite | 12 |
| Not covered (decision 1): the share ending by itself, a share ending during a move, the note for a device left behind, a switch between two pilots, a reinstall with another pilot's share | the release, or a third device |

## Tasks

### Task 0: The starting point

**Who:** Claude.

- [x] **Step 1: Check both repos**

Run:

```bash
git -C ~/Dev/Crewluv status --short && git -C ~/Dev/Crewluv branch --show-current && git -C ~/Dev/Crewluv log --oneline -1 && git -C ~/Dev/Duty log --oneline -1 feature/partner-cloud-screens
```

Expected:
- only `?? .claude/` and `?? .superpowers/`;
- `feature/partner-cloud-source`, at `c2b1a6a feat(crewluv): the move-over logs each step, naming no ticket, code or key, for the checks on real phones`;
- then CrewLu's partner branch tip, `293c07e1 Merge feature/supabase-account-backend: build 201 (3.0.2)`, or a later commit on it.

If anything else shows, stop and ask.

- [ ] **Step 2: The real partners see your current status**

The user checks with their real partners, or on a real partner's phone with their OK: does Crewluve show your current status, synced recently? Then tell Claude.

Expected: yes. The plan rests on your Xcode CrewLu writing the share they read (decision 2). If they see an old status, stop: the environment isn't what the plan expects.

### Task 1: The ticket field in iCloud's Production schema

**Who:** the user, in the CloudKit Console. Claude sends these steps and waits for the answer.

Piece 2 §14.4: CloudKit's Production schema doesn't learn new fields from saves. If the field isn't there, every write from CrewLu's partner build that carries a ticket fails, and so may its other writes. That would stop the real partners' updates.

- [x] **Step 1: Look in Production**

1. On the Mac, open <https://icloud.developer.apple.com> and sign in with your Apple Developer account.
2. Click **CloudKit Database**, and pick the container **iCloud.com.toddanderson.duty**.
3. At the top, set the environment to **Production**.
4. In the left column, under **Schema**, click **Record Types**, then **SharedPilotStatus**.
5. Look down its fields for **moveTicketByPartnerJSON**, of type **Bytes**.

If it's there, tell Claude "it's there". Task 1 is done; skip Steps 2 and 3.

- [x] **Step 2: If it isn't, add it in Development**

1. At the top, set the environment to **Development**.
2. Open **Record Types** → **SharedPilotStatus** again.
3. If **moveTicketByPartnerJSON** isn't listed, click **+** (Add Field) and name it exactly `moveTicketByPartnerJSON`. Set the type to **Bytes**, and click **Save**.

- [x] **Step 3: Deploy it to Production**

1. In the left column, click **Deploy Schema Changes...**.
2. Read the list of changes the Console shows. It deploys every change waiting in Development, and Production's schema can't take one back.
3. If it lists only `moveTicketByPartnerJSON` on SharedPilotStatus, or other changes you know come from CrewLu's current work, click **Deploy**.
4. If anything is unfamiliar, click **Cancel**, and send Claude a screenshot of the list (on the Mac, **⇧⌘4**, then drag over it).
5. Set the environment back to **Production**, and check that **SharedPilotStatus** now has **moveTicketByPartnerJSON**.

Expected: the field is in Production. Tell Claude which way it went: it was there, or you deployed it.

### Task 2: The pilot runs CrewLu's partner build

**Who:** the user, with Claude.

- [ ] **Step 1: Check which CrewLu is on the phone**

On your phone, open CrewLu, then **Partner Sharing**.

Expected: the partner build's screen, with **Invite Another Partner**, and your partners each marked "Needs Crewluve update".

- If it shows that, Task 2 is done.
- If it shows the older screen, which has no Invite Another Partner, go to Step 2.

- [ ] **Step 2: If it's the older screen, run the partner build from Xcode**

`~/Dev/Duty` stays on CrewLu's release line, and another session may be working in it. So the partner build comes from a folder of its own:
1. Claude asks first, since this writes into `~/Dev/Duty`'s git folder.
2. With a yes, Claude makes a worktree of `feature/partner-cloud-screens` at `~/Dev/Duty-partner-checks`.
3. Claude copies `Config.xcconfig` into it from `~/Dev/Duty`, without showing its contents.

Then:
1. In Xcode, choose **File → Open**, and open `~/Dev/Duty-partner-checks/Duty.xcodeproj`.
2. At the top of the window, set the scheme to **Duty** and the destination to your iPhone.
3. Press **⌘R** (Product → Run). CrewLu opens on your phone, with your data, since it's the same app.
4. Open **Partner Sharing**, and check for Step 1's screen.

Expected: the partner build's screen, signed in, with your partners marked "Needs Crewluve update".

### Revised after Task 1 (2026-10-20)

Task 1 found that the pilot's phone writes iCloud's **Development** environment, not Production: Production's private database holds no `PartnerBeaconZone` for the user's account. Decision 2 was wrong. The user also has no test Apple ID, and their one spare device, an iPad, is signed in to their own Apple ID. So Tasks 3–14 above are replaced by these:

- **R-decision 1: the move-over runs on a real partner.** The user chose this, with the partner's phone at hand. That partner's Crewluve is an Xcode build, so it reads the same Development share as the pilot, and is the only one besides the pilot that can. Running Crewluve's piece 4 build onto it from Xcode moves them for real, as the release would.
- **R-decision 2: the second device following uses the user's phone and iPad,** both running Crewluve from Xcode (Development). Both are on the user's Apple ID, so they read the pilot's own private zone and share one iCloud Keychain. The iPad should follow the phone's Crewluve by itself.
- **R-decision 3: the Crewlu Cloud checks use one test partner, Test 1,** with the iPad and the user's phone as its devices. For "reaches only them", the moved real partner's phone is the one that must show nothing.
- **R-decision 4: the production push comes last, and is optional tonight.** Crewluve 1.2 (43) goes up as TestFlight Internal Only, and the iPad installs it to join a test partner. The TestFlight build reads Production iCloud, where the pilot has no zone. That doesn't matter on Crewlu Cloud.
- **R-decision 5: the other real partner** reads Production through TestFlight, where no share exists, so they likely aren't getting updates now. That's separate from piece 4, and the user checks when they're back. Once piece 4 ships, they connect with an invite link, which doesn't depend on iCloud's environment.

**Claude's two queries** (read-only, through the Supabase connection's `execute_sql`, with `:test_partner` filled in by Claude):

Query A, the partner and how many devices they have:

```sql
select p.name, p.created_at, count(d.id) as devices
from public.partners p
left join public.partner_devices d on d.partner_id = p.id
where p.name = :test_partner
group by p.id
order by p.created_at desc;
```

Query B, each device's kind, label, push environment, and whether it has a token:

```sql
select p.name, d.kind, d.label, d.created_at, s.push_env, (s.push_token is not null) as has_push_token
from public.partners p
join public.partner_devices d on d.partner_id = p.id
left join private.partner_device_secrets s on s.device_id = d.id
where p.name = :test_partner
order by d.created_at;
```

### Task 3: The real partner moves over

**Who:** the user, with Claude's checks.

- [ ] **Step 1: Before the move**

1. On the partner's phone, open Crewluve. It should show your current status.
2. On your phone, open CrewLu → **Partner Sharing** → **Refresh**. They're marked "Needs Crewluve update". Tell Claude the name CrewLu shows for them. Claude keeps it in the conversation only.

Claude runs query A, with that name.

Expected: one row, with 0 devices. CrewLu's move-over made them a partner, with a ticket in the record.

- [ ] **Step 2: Run Crewluve's piece 4 build onto their phone**

1. Connect their phone to the Mac with a cable, and unlock it. If it asks **Trust This Computer?**, tap **Trust**.
2. In Xcode, with `~/Dev/Crewluv/Crewluv.xcodeproj` open (branch `feature/partner-cloud-source`), set the scheme to **Crewluv** and the destination to their phone.
3. Press **⌘R**, and wait for Crewluve to open on their phone.

Expected:
- **iCloud's status shows first,** as before.
- **Then the move, with no tap:** within about a minute, the bottom row gets the •••. If it hasn't shown after a minute, pull down to refresh once.
- **No alert fires** for the move.

- [ ] **Step 3: CrewLu and Crewlu Cloud see the move**

On your phone: **Partner Sharing** → **Refresh** → their page. They're no longer marked "Needs Crewluve update", and **Devices** lists one iPhone.

Claude runs query B, with their name.

Expected: one row: kind `app`, push_env `sandbox` (an Xcode build), and a push token.

### Task 4: The second device follows by itself

**Who:** the user, with Claude's checks.

- [ ] **Step 1: Crewluve's piece 4 build on your phone and iPad**

With Xcode's destination set to your phone, press **⌘R**. Then set it to your iPad, and press **⌘R** again.

Expected: on both, Crewluve shows your own status, read from your own iCloud (Development), with no •••.

- [ ] **Step 2: Your phone's Crewluve joins Test 1**

1. In CrewLu → **Partner Sharing**, tap **Invite Another Partner**, type `Test 1`, and tap **Share Invite Link**. In the share sheet, tap **Copy**.
2. Open **Notes**, paste the link into a new note, and tap it.

Expected:
- Crewluve opens, shows Connecting, then your status, with the ••• and no question, since it's the same pilot;
- CrewLu lists **Test 1**, with one device;
- §10.3 step 1: tapping an invite link connects.

- [ ] **Step 3: The iPad follows by itself**

On the iPad, pull down on Crewluve's status to refresh, every minute or so. The phone's switch left a copy of its key in your iCloud Keychain, which can take a few minutes to sync.

Expected:
- within a few minutes, the ••• shows on the iPad, with no tap;
- CrewLu lists two devices for **Test 1**.

Claude runs query B for Test 1. Expected: two `app` devices, both `sandbox`.

### Task 5: Codes, QR, Disconnect, Already Connected, a reinstall

**Who:** the user.

- [ ] **Step 1: Disconnect, and a relaunch stays disconnected**

1. On the iPad, tap **•••** → **Disconnect** → **Disconnect**.
2. Close Crewluve (swipe its card away), and open it again.

Expected: the welcome screen, with no note, both times. It doesn't go back to your own iCloud status (§15).

- [ ] **Step 2: Connect with a code**

1. On your phone, tap **•••** → **Use on Another Device**.
2. On the iPad, type the six characters into the code boxes.

Expected: Connecting, then your status, with the •••. Close the code sheet with **Done**.

- [ ] **Step 3: Connect with a QR code**

1. On the iPad, Disconnect again.
2. On your phone, show **Use on Another Device** again. On the iPad, open the **Camera**, point it at the QR code, and tap the **crewluve.crewlu.net** banner.

Expected: Crewluve opens, and connects, with the •••. §10.3 step 2: by code and by QR.

- [ ] **Step 4: Already Connected**

On the iPad, tap the old iCloud invite link, from an earlier CrewLu invite in Messages or Notes.

Expected: **Already Connected**, "You're already connected to [your name]. To follow another pilot, ask them for an invite link from CrewLu.", with **OK**. Nothing changes.

- [ ] **Step 5: A reinstall reconnects by itself**

1. On the iPad, touch and hold Crewluve's icon → **Remove App** → **Delete App**.
2. In Xcode, with the iPad as the destination, press **⌘R**.

Expected:
- your status, with the •••, and no tap: the key outlived the app (§16 decision 4);
- no "Sharing has ended" note;
- CrewLu's device count for Test 1 is unchanged.

### Task 6: A quick status reaches only the person picked

**Who:** the user, with Claude's check of partner-push.

- [ ] **Step 1: Send Test 1 a quick status**

1. Leave Crewluve on your phone, the iPad and the moved partner's phone: swipe up to the Home Screen.
2. In CrewLu → **Partner Sharing** → **Test 1** → **Nickname and Quick Status** → **Quick Status**, pick **Call Me**. Under **Send To**, choose Test 1 only.

Expected:
- your phone and the iPad, Test 1's devices, get Crewluve's alert within about a minute;
- the moved partner's phone gets no alert, and shows no quick status when opened.

- [ ] **Step 2: Claude reads partner-push's logs**

Claude reads the last 15 minutes of Edge Function logs (`get_logs`, service `edge-function`).

Expected: partner-push ran after the quick status, and counts two sandbox sends.

- [ ] **Step 3: Clear it**

In CrewLu, clear Test 1's quick status.

### Task 7: Signing out keeps the last status; signing in resumes

**Who:** the user. The sign-in uses your own password, which you type.

- [ ] **Step 1: Sign out**

In CrewLu, open the Crewlu Cloud screen, tap **Sign Out**, and confirm.

Expected: Test 1's devices and the moved partner keep the last status they had, with no error and no "Sharing has ended". Their updates pause until you sign in.

- [ ] **Step 2: Sign back in**

Sign in again. Tap **Update Status Now**, then pull to refresh on the iPad.

Expected: the sync line says it synced just now, with your current status.

### Task 8: Remove a device, reinstall, New Link, remove the person

**Who:** the user, with Claude's check.

- [ ] **Step 1: Remove the iPad's device**

In CrewLu → **Test 1** → **Devices**, swipe the iPad left, tap **Remove**, and confirm **Remove This Device?**.

Expected:
- within a minute, or after a pull to refresh, the iPad shows the welcome screen with "Sharing with [your name] has ended.";
- your phone keeps the status.

- [ ] **Step 2: A reinstall after the removal, then a new invite**

1. Delete Crewluve from the iPad, and run it again from Xcode (⌘R).

   Expected:
   - **Your own status, from your own iCloud, without the •••.** The removed key is refused and forgotten, with the hand-off copy that held it.
   - No ticket exists for your own account, so nothing else carries the iPad to Crewlu Cloud.

2. In CrewLu, on Test 1's page, tap **Send Link Again**. Copy the link, paste it into a note on the iPad, and tap it.

   Expected: Connecting, then the •••. CrewLu lists two devices for Test 1.

- [ ] **Step 3: New Link keeps the devices**

1. On Test 1's page, tap **New Link**, and confirm **Make a New Link?**.
2. On the iPad, tap the link from Step 2 again. It's now the old one.

Expected:
- **Invite Link Not Working**, "This invite link doesn't work anymore. You're still connected to [your name]." Tap **OK**;
- both devices keep your status.

- [ ] **Step 4: Remove the person**

In CrewLu → **Test 1** → **Remove Partner**, and confirm.

Expected:
- your phone and the iPad show the welcome screen with "Sharing with [your name] has ended.";
- CrewLu no longer lists Test 1;
- the moved partner keeps your status.

Claude runs query A for Test 1. Expected: no rows.

### Task 9 (optional tonight): The production push, on a TestFlight build

**Who:** Claude for Step 1, then the user.

- [ ] **Step 1: Version 1.2 (43), committed**

Claude replaces `MARKETING_VERSION = 1.1.6;` with `MARKETING_VERSION = 1.2;` and `CURRENT_PROJECT_VERSION = 42;` with `CURRENT_PROJECT_VERSION = 43;` in `~/Dev/Crewluv/Crewluv.xcodeproj/project.pbxproj`, each found exactly twice, then commits it as `chore(crewluv): 1.2 (43), for the checks on real phones`. The command is in this plan's history at commit `483c417`, Task 3 Step 1.

Expected:
- `1 file changed, 4 insertions(+), 4 deletions(-)`;
- the new commit.

- [ ] **Step 2: Archive, upload, and give it to yourself**

1. Xcode: scheme **Crewluv**, destination **Any iOS Device (arm64)**, then **Product → Archive** → **Distribute App** → **TestFlight Internal Only** → **Distribute**.
2. App Store Connect → **Crewluve** → **TestFlight**: wait for **Ready to Test**.
3. Next to **Internal Testing**, click **+**, make the group **Partner Checks** with only you, and add the build to it.

- [ ] **Step 3: The iPad joins a test partner on the TestFlight build**

1. On the iPad, install **TestFlight** from the App Store, then Crewluve 1.2 (43) in TestFlight.
2. In CrewLu, invite `Test 3`, and tap the link on the iPad.
3. Leave Crewluve, then send Test 3 a quick status.

Expected:
- the iPad alerts;
- Claude's query B for Test 3 shows push_env `production`;
- partner-push's logs count one production send.

Then remove Test 3 in CrewLu.

### Task 10: Clean up and record

**Who:** the user, then Claude.

- [ ] **Step 1: What stays**

The moved partner stays on Crewlu Cloud, with Crewluve's piece 4 build. Any test partners left in CrewLu are removed. Your phone's and iPad's Crewluve can stay on the welcome screen, or be deleted.

- [ ] **Step 2: Record and commit**

Claude:
1. Writes each task's result in the Execution notes, naming no one.
2. Adds `## 17. The checks on real phones` to the piece 4 spec: what passed, and what waits for the release or a test Apple ID. That includes the share ending by itself, the note for a device left behind, a switch between two pilots, and a TestFlight partner moving over.
3. Commits both on website main, and asks before any push.

---

## Execution notes

Filled in during the checks: each task's result, and anything that differed. Names, addresses and Apple IDs stay out.

- **Task 0, Step 1 (2026-10-20):** both repos as expected: `feature/partner-cloud-source` clean at `c2b1a6a`, and CrewLu's partner branch at `293c07e1`.
- **Task 1 (2026-10-20):** `moveTicketByPartnerJSON` wasn't in Production's SharedPilotStatus (52 fields). It was already in Development, so some build had saved a ticket there. Deploy Schema Changes listed only that field (bytes) and its two indexes (queryable, sortable). The user deployed them, and Production's SharedPilotStatus now has 53 fields, with the field as BYTES.
