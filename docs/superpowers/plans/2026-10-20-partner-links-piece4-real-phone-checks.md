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

- [ ] **Step 1: Check both repos**

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

- [ ] **Step 1: Look in Production**

1. On the Mac, open <https://icloud.developer.apple.com> and sign in with your Apple Developer account.
2. Click **CloudKit Database**, and pick the container **iCloud.com.toddanderson.duty**.
3. At the top, set the environment to **Production**.
4. In the left column, under **Schema**, click **Record Types**, then **SharedPilotStatus**.
5. Look down its fields for **moveTicketByPartnerJSON**, of type **Bytes**.

If it's there, tell Claude "it's there". Task 1 is done; skip Steps 2 and 3.

- [ ] **Step 2: If it isn't, add it in Development**

1. At the top, set the environment to **Development**.
2. Open **Record Types** → **SharedPilotStatus** again.
3. If **moveTicketByPartnerJSON** isn't listed, click **+** (Add Field) and name it exactly `moveTicketByPartnerJSON`. Set the type to **Bytes**, and click **Save**.

- [ ] **Step 3: Deploy it to Production**

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

### Task 3: Crewluve 1.2 (43) on TestFlight, internal only

**Who:** Claude for Step 1, then the user.

- [ ] **Step 1: Set the version and commit it**

Claude replaces `MARKETING_VERSION = 1.1.6;` with `MARKETING_VERSION = 1.2;`, and `CURRENT_PROJECT_VERSION = 42;` with `CURRENT_PROJECT_VERSION = 43;`. Each appears twice in `Crewluv.xcodeproj/project.pbxproj`, once for Debug and once for Release of the Crewluv target, and nothing else changes.

Run:

```bash
cd ~/Dev/Crewluv && python3 -c "
import pathlib
p = pathlib.Path('Crewluv.xcodeproj/project.pbxproj'); s = p.read_text()
for old, new in (('MARKETING_VERSION = 1.1.6;', 'MARKETING_VERSION = 1.2;'), ('CURRENT_PROJECT_VERSION = 42;', 'CURRENT_PROJECT_VERSION = 43;')):
    assert s.count(old) == 2, old
    s = s.replace(old, new)
p.write_text(s)
" && git diff --stat && git add Crewluv.xcodeproj/project.pbxproj && git commit -q -m "chore(crewluv): 1.2 (43), for the checks on real phones" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected:
- `1 file changed, 4 insertions(+), 4 deletions(-)`;
- the new commit's line.

If Xcode has the project open, it picks up the change by itself. Then, in Xcode, select the **Crewluv** target's **General** tab: **Identity** shows Version **1.2** and Build **43**.

- [ ] **Step 2: Archive and upload**

1. In Xcode, with `~/Dev/Crewluv/Crewluv.xcodeproj` open, set the scheme to **Crewluv** and the destination to **Any iOS Device (arm64)**.
2. Choose **Product → Archive**, and wait. The Organizer window opens with the new archive selected: Crewluve 1.2 (43).
3. Click **Distribute App**, choose **TestFlight Internal Only**, and click **Distribute**. If Xcode asks about signing, leave **Automatically manage signing** on.
4. Wait for **Upload Successful**, then click **Done**.

- [ ] **Step 3: Give it to an internal group with only you**

1. In App Store Connect (<https://appstoreconnect.apple.com>), open **Apps → Crewluve → TestFlight**. The build shows **Processing** for 10–30 minutes, then **Ready to Test**.
2. In the left column, next to **Internal Testing**, click **+**. Name the group **Partner Checks**, and add yourself as its tester. There are no other internal testers, so it's the only one with the build.
3. In that group's **Builds**, click **+**, and add **1.2 (43)**.
4. Under **External Testing**, open the external group. Check that 1.2 (43) isn't among its builds. A TestFlight Internal Only build can't be added there, so it shouldn't be.

Expected: 1.2 (43) is Ready to Test in your group only. Tell Claude when it is.

### Task 4: The test partner's two devices

**Who:** the user.

Do these steps on each spare device.

- [ ] **Step 1: The test Apple ID in iCloud, with iCloud Keychain**

1. In **Settings**, the name at the top must be the test Apple ID. If it's another, sign that one out, then sign in with the test Apple ID.
2. In **Settings → [the name] → iCloud**, open **Passwords** (or **Passwords & Keychain**), and turn on **Sync this iPhone** (or iPad). The hand-off copy that lets the second device follow syncs through it.
3. The device needs a passcode, which iCloud Keychain requires. Check under **Settings → Face ID (or Touch ID) & Passcode**.

- [ ] **Step 2: Your own Apple ID for the App Store and TestFlight**

1. Open the **App Store** app, and tap the account picture at the top right.
2. If it shows the test Apple ID, scroll down, tap **Sign Out**, then sign in with your own Apple ID. iCloud stays on the test Apple ID.
3. Install **TestFlight** from the App Store.
4. Install **Crewluve** from the App Store. That's 1.1.6, today's version.
5. Open Crewluve once. Allow notifications when it asks.

Expected: on both devices, Crewluve 1.1.6 shows its screen for no shared status yet, and Settings shows the test Apple ID at the top.

### Task 5: The test partner joins your iCloud share

**Who:** the user. Claude checks Crewlu Cloud at the end.

- [ ] **Step 1: Find an old invite**

1. On your phone, in **Messages**, open a thread where you sent a real partner CrewLu's invite. The link starts with `crewluv://accept-share` or `https://www.icloud.com/share`.
2. Touch and hold the message, and tap **Copy**. It's the same link for everyone, so it's fine to reuse.
3. Send it to the first spare device. For example, paste it into a new note in **Notes** and share that note with **AirDrop**, or send it in a message to the test Apple ID.

- [ ] **Step 2: Join on the first device**

On the first spare device, tap the link.

Expected: Crewluve 1.1.6 opens, accepts the share, and shows your status, with your name as the pilot.

- [ ] **Step 3: The second device finds it too**

On the second spare device, open Crewluve. If it still shows the screen for no shared status, send it the same link and tap it there.

Expected: it shows your status as well.

- [ ] **Step 4: CrewLu sees a new partner**

On your phone, open CrewLu → **Partner Sharing**, and tap **Refresh**.

Expected: the test partner is in the list, marked "Needs Crewluve update", and their page says "Connected through iCloud". Tell Claude the name CrewLu shows for them. Claude keeps it in this conversation only.

- [ ] **Step 5: Claude checks Crewlu Cloud**

Claude runs this query through the Supabase connection (`execute_sql`, read-only), with `:test_partner` filled in:

```sql
select p.name, p.created_at, count(d.id) as devices
from public.partners p
left join public.partner_devices d on d.partner_id = p.id
where p.name = :test_partner
group by p.id
order by p.created_at desc;
```

Expected: one row, created minutes ago, with 0 devices. CrewLu's move-over made them a Crewlu Cloud partner, with a ticket in the iCloud record.

### Task 6: The first device moves over by itself

**Who:** the user. Claude checks Crewlu Cloud.

- [ ] **Step 1: Install Crewluve 1.2**

1. On the first spare device, open **TestFlight**, tap **Crewluve**, and tap **Install** (or **Update**) for 1.2 (43).
2. Open Crewluve.

Expected:
- **iCloud's read shows first:** your status, as before.
- **Then the move, with no tap:** within about a minute, the bottom row gets a **•••** button. That button shows only on Crewlu Cloud. If it hasn't shown after a minute, pull down on the status to refresh, once.
- **No alert fires** for the move.

- [ ] **Step 2: CrewLu sees an app device**

On your phone: **Partner Sharing** → **Refresh** → the test partner.

Expected: they're no longer marked "Needs Crewluve update", and **Devices** lists one device, named iPhone or iPad.

- [ ] **Step 3: Claude checks the device**

Claude runs:

```sql
select p.name, d.kind, d.label, d.created_at, s.push_env, (s.push_token is not null) as has_push_token
from public.partners p
join public.partner_devices d on d.partner_id = p.id
left join private.partner_device_secrets s on s.device_id = d.id
where p.name = :test_partner
order by d.created_at;
```

Expected: one row: kind `app`, label iPhone or iPad, push_env `production`, has_push_token `true`.

### Task 7: The second device follows by itself

**Who:** the user. Claude checks Crewlu Cloud.

- [ ] **Step 1: Install Crewluve 1.2 on the second device**

1. On the second spare device, check that Crewluve 1.1.6 still shows your status. It still reads iCloud.
2. Install 1.2 (43) from TestFlight, and open it.

Expected:
- **Your status shows first,** through iCloud.
- **Then the •••, with no tap.**
  - The device either finds the first device's copy of its key, synced through iCloud Keychain, or has its ticket refused, since it was used. Either way it then joins with a code made from that copy.
  - The sync can take a few minutes. Pull down to refresh every minute or two.
  - If there's no ••• after 10 minutes, check that **Sync this iPhone** is on under Passwords on both devices (Task 4, Step 1), then tell Claude.

- [ ] **Step 2: CrewLu sees two devices**

On your phone: **Partner Sharing** → **Refresh** → the test partner → **Devices**.

Expected: two devices.

- [ ] **Step 3: Claude checks**

Claude runs Task 6's Step 3 query again.

Expected: two rows, both `app`, both `production`, both with push tokens. The iCloud share stays, since your real partners still read it (decision 1).

### Task 8: Pushes, production and sandbox, and a QR code

**Who:** the user. Claude checks Crewlu Cloud and partner-push's logs.

- [ ] **Step 1: Your phone's Crewluve joins by QR code (the Xcode build)**

1. In Xcode, with `~/Dev/Crewluv/Crewluv.xcodeproj` open, set the scheme to **Crewluv** and the destination to your iPhone.
2. Press **⌘R**. Crewluve opens on your phone. Allow notifications if it asks. It may show your own status, read from your iCloud, since this phone is the pilot's.
3. On the first spare device, tap **•••** → **Use on Another Device**. A six-character code and a QR code show.
4. On your phone, open the **Camera**, point it at that QR code, and tap the **crewluve.crewlu.net** banner.

Expected:
- Crewluve opens, shows Connecting, and then your status.
- It asks no "Switch to …?" question, since it's the same pilot.
- The ••• shows in the bottom row.
- On the first spare device, the code sheet can be closed with **Done**.

- [ ] **Step 2: Claude checks the environments**

Claude runs Task 6's Step 3 query.

Expected: three rows. The two spare devices are `production`, and your phone is `sandbox`, since it was run from Xcode.

- [ ] **Step 3: A quick status wakes all three**

1. On all three devices, leave Crewluve: swipe up to the Home Screen, so it's in the background.
2. On your phone, open CrewLu → **Partner Sharing** → the test partner → **Nickname and Quick Status** → **Quick Status**.
3. Pick **Call Me**, or any status you're happy for the test partner to see. Under **Send To**, choose the test partner only, not Everyone.

Expected: within about a minute, all three devices show Crewluve's alert for that status:
- the two TestFlight builds through production pushes;
- your phone's Xcode build through a sandbox push.

- [ ] **Step 4: Claude reads partner-push's logs**

Claude reads the Edge Function logs for the last 15 minutes through the Supabase connection (`get_logs`, service `edge-function`).

Expected: partner-push ran after the quick status, and its log counts the sends: two production and one sandbox.

- [ ] **Step 5: Clear the quick status**

In CrewLu, clear the test partner's quick status (**Quick Status** → **Clear**).

### Task 9: A code, Disconnect and a relaunch, Already Connected, and a reinstall

**Who:** the user.

- [ ] **Step 1: Disconnect a device that came from iCloud**

1. On the second spare device, tap **•••** → **Disconnect**.
2. The question reads "Disconnect from [your name]?". Tap **Disconnect**.

Expected: the welcome screen, with no note at the top. CrewLu lists one device fewer once refreshed.

- [ ] **Step 2: A relaunch stays disconnected**

1. Close Crewluve on that device: swipe up from the bottom and hold, then swipe Crewluve's card away.
2. Open it again.

Expected: still the welcome screen. It doesn't find your iCloud share again (§15).

- [ ] **Step 3: Connect with a code**

1. On the first spare device, tap **•••** → **Use on Another Device**.
2. On the second device, tap the code boxes and type the six characters.

Expected: Connecting, then your status, with the •••, and no question. Close the code sheet with **Done**.

- [ ] **Step 4: An iCloud link on Crewlu Cloud says Already Connected**

On the first spare device, tap the old iCloud invite link from Task 5 again.

Expected: the alert **Already Connected**, "You're already connected to [your name]. To follow another pilot, ask them for an invite link from CrewLu.", with **OK**. Nothing else changes, and the status stays.

- [ ] **Step 5: A reinstall reconnects by itself**

1. On the first spare device, touch and hold Crewluve's icon → **Remove App** → **Delete App**.
2. Install 1.2 (43) again from TestFlight, and open it.

Expected:
- **Your status, with the •••, and no tap.** The device's key outlived the app, and Crewlu Cloud's answer for it switches the device back (§16 decision 4). iCloud's status may show for a moment first, since the test Apple ID still holds your share.
- **No "Sharing has ended" note** at any point.
- **CrewLu's device count is unchanged:** the same device came back.

### Task 10: An invite link, and a quick status to one person

**Who:** the user.

- [ ] **Step 1: Your phone's Crewluve becomes Test 2's device**

1. On your phone, in Crewluve, tap **•••** → **Disconnect** → **Disconnect**. The welcome screen shows.
2. In CrewLu → **Partner Sharing**, tap **Invite Another Partner**, type the name `Test 2`, and tap **Share Invite Link**. In the share sheet, tap **Copy**.
3. Open **Notes**, paste the link into a new note, and tap the link there.

Expected:
- Crewluve opens, shows Connecting, then your status, with the •••.
- CrewLu lists **Test 2**, with one device.
- §10.3 step 1: tapping an invite link connects.

- [ ] **Step 2: A quick status for the first test partner reaches only them**

1. On all three devices, leave Crewluve: swipe up to the Home Screen.
2. In CrewLu, give the first test partner a quick status, with **Send To** set to them only, as in Task 8 Step 3.

Expected:
- both spare devices alert and show it;
- your phone (Test 2) gets no alert, and shows no quick status when Crewluve is opened.

- [ ] **Step 3: And one for Test 2**

Clear it. Then give **Test 2** a quick status, sent to Test 2 only.

Expected:
- your phone alerts and shows it;
- the spare devices get no alert, and show nothing new.

Then clear it.

### Task 11: Signing out keeps the last status; signing in resumes

**Who:** the user. The sign-in uses your own password, which you type.

- [ ] **Step 1: Sign out**

In CrewLu, open the Crewlu Cloud screen, tap **Sign Out**, and confirm.

Expected:
- **The test devices keep the last status they had.** They show no error screen and no "Sharing has ended" note.
- **Your real partners keep getting updates,** since they read iCloud. CrewLu's partner build signs out only of Crewlu Cloud.

- [ ] **Step 2: Sign back in, and an update comes through**

1. Sign in again on the same screen.
2. Tap **Update Status Now**, or change something that shows in your status.
3. On the first spare device, pull down to refresh.

Expected: the sync line says it synced just now, with your current status.

### Task 12: Remove a device, reinstall, New Link, remove the person

**Who:** the user.

- [ ] **Step 1: Remove one device**

1. In CrewLu, open the first test partner → **Devices**. It lists the two spare devices.
2. Swipe the first spare device's entry left, tap **Remove**, and confirm **Remove This Device?**. CrewLu lists devices as iPhone or iPad. If both spares are the same kind, remove the one added first; Task 9 Step 3 re-added the second.

Expected:
- within a minute, or after a pull to refresh, the first spare device shows the welcome screen with "Sharing with [your name] has ended.";
- the second spare device keeps your status.

- [ ] **Step 2: A reinstall after the removal, then a new invite**

1. On the first spare device, touch and hold Crewluve's icon → **Remove App** → **Delete App**.
2. Install 1.2 (43) again from TestFlight, and open it.

Expected:
- **Your status, through iCloud,** since the test person is still in your iCloud share.
- **No •••.**
  - The removed device's key is refused and forgotten, with the hand-off copy, which held that key since Task 9's reinstall.
  - No ticket is open either, since the person still has a device.

Then:
1. In CrewLu, on the first test partner's page, tap **Send Link Again**, and send the link to that device.
2. Tap it there.

Expected: Connecting, then your status, with the •••. CrewLu lists two devices for them again.

- [ ] **Step 3: New Link keeps the devices**

1. On the first test partner's page, tap **New Link**, and confirm **Make a New Link?**.
2. On the first spare device, tap the link from Step 2 again. It's now the old one.

Expected:
- the alert **Invite Link Not Working**, "This invite link doesn't work anymore. You're still connected to [your name]." Tap **OK**;
- both spare devices keep your status.

- [ ] **Step 4: Remove the person**

1. In CrewLu, open the first test partner → **Remove Partner**, and confirm.
2. Wait a minute, or pull to refresh on each spare device.

Expected:
- both spare devices show the welcome screen with "Sharing with [your name] has ended.";
- CrewLu no longer lists the person;
- the test Apple ID is out of your iCloud share too, so a relaunch doesn't bring your status back through iCloud.

- [ ] **Step 5: Claude checks**

Claude runs Task 5's Step 5 query.

Expected: no rows for the first test partner.

### Task 13: Clean up

**Who:** the user, then Claude.

- [ ] **Step 1: Remove Test 2**

In CrewLu, open **Test 2** → **Remove Partner**, and confirm.

Expected: your phone's Crewluve shows "Sharing with [your name] has ended."

- [ ] **Step 2: Your real partners are as they were**

In CrewLu → **Partner Sharing**, only your real partners remain, still marked "Needs Crewluve update" and connected through iCloud.

- [ ] **Step 3: The spare devices and your phone**

Each of these is optional:
- On the spare devices, remove Crewluve, and sign the App Store back in to whichever Apple ID it had.
- On your phone, Crewluve is left on the welcome screen, since Step 1 removed its device.

- [ ] **Step 4: Claude checks nothing of the test is left**

Claude runs Task 5's Step 5 query for the first test partner's name, and again for `Test 2`.

Expected: no rows.

### Task 14: Record the results

**Who:** Claude.

**Files (in `~/Dev/Crewluve Website`):**
- Modify: `docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md`, and this plan

- [ ] **Step 1: Write down what happened**

1. In this plan's Execution notes, list each task's result. Name no one, and keep no address, Apple ID or screenshot of personal data.
2. At the end of the spec, add `## 17. The checks on real phones`. Say what passed, what differed and what was done about it, and what waits for the release or a third device (decision 1).

- [ ] **Step 2: Commit**

Run:

```bash
cd ~/"Dev/Crewluve Website" && git add docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md docs/superpowers/plans/2026-10-20-partner-links-piece4-real-phone-checks.md && git commit -q -m "Piece 4's checks on real phones: results" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit. Ask separately before pushing it, and before pushing Task 3's commit on `feature/partner-cloud-source`.

---

## Execution notes

Filled in during the checks: each task's result, and anything that differed. Names, addresses and Apple IDs stay out.
