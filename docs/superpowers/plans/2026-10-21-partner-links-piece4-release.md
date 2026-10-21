# Partner Links Piece 4: The Release — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to run this plan task by task, with the user: they do every step in App Store Connect, Xcode and on their phones. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crewluve 1.2, with all of piece 4, on the App Store.
- The privacy policy and App Store privacy answers say what 1.2 really does.
- The user's TestFlight partner is connected and checked first.
- CrewLu's partner release follows with a plan of its own.

**Architecture:**
- Crewluve's release line (`hotfix/icloud-account-unavailable`) fast-forwards to `feature/partner-cloud-source`, which ends with build 44.
- One upload, distributed through App Store Connect, serves both the external TestFlight group and the App Store. Build 43 can't do either, since it went up as TestFlight Internal Only.
- crewlu.net's Crewluve privacy policy is rewritten first, since the App Store listing links to it.

**Tech stack:** Xcode (Archive, Distribute), App Store Connect (TestFlight, App Privacy, review), GitHub Pages for crewlu.net, and Crewlu Cloud's read-only checks.

**Design:**
- `docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md`:
  - §11, the release;
  - §17, the checks on real phones and what they found.
- Piece 2's spec (`docs/superpowers/specs/2026-10-16-partner-links-piece2-crewlu-design.md`), §9, for what follows.

---

## Before you start

- **Who does what.** The user does everything in App Store Connect, Xcode's Organizer and on the phones, since those take their Apple account. Claude edits and commits files, runs read-only checks on Crewlu Cloud, gives click-by-click steps, and asks before every push.
- **Three repos.**
  - `~/Dev/Crewluv` (Crewluve);
  - `~/Dev/CrewLu-Website`, crewlu.net, for the privacy policy;
  - `~/Dev/Crewluve Website`, for this plan.

  Claude writes in `~/Dev/CrewLu-Website` only at Task 1, with the user's yes. It never runs `git add -A` in any of them.
- **This plan is public.** It names no one, and holds no email address or Apple ID. The partners are "the moved partner", already on Crewlu Cloud, and "the TestFlight partner".
- **Never push without a fresh yes** for that push.

## Decisions made while planning

1. **App Review uses Try Demo** (the user's choice). The notes explain that connecting needs a pilot's invite link, and no live link is given, so the user's real status stays private.
2. **The TestFlight partner connects first, through TestFlight** (the user's choice).
   - Build 1.2 (44) goes to the external group, which needs Apple's beta review for a new version.
   - Once it's installed, they tap their own partner entry's invite link from CrewLu (Send Link Again), so they keep the name and nickname they have.
   - It's the first connection on TestFlight builds with production pushes from start to end. The App Store submission waits for it.
3. **1.2 goes live automatically when approved** (the user's choice).
4. **Build 44 is new.** Build 43 went up as TestFlight Internal Only, which App Store Connect never lets reach external testers or the App Store.
5. **The release line fast-forwards.** `hotfix/icloud-account-unavailable` (`739abd3`, 1.1.6) is an ancestor of `feature/partner-cloud-source`, so it moves forward with no merge commit. Piece 4 and the Hanoi fix (`69865b3`) ship together.
6. **The App Store privacy answers change on submission day,** since Data Types edits go live at once, and 1.1.6 collects nothing:
   - Identifiers → Device ID;
   - Usage Data → Other Usage Data;
   - both for App Functionality, linked to the user, not tracking.
7. **The privacy policy changes before the build goes to anyone outside.** Today it says Crewluve connects to no server.
8. **The moved partner may switch to the App Store build after the release.** Their device key outlives a reinstall, so they reconnect by themselves (§17.2's reinstall check). Until then their Xcode build keeps working.
9. **What's New promises nothing CrewLu doesn't offer yet.** Pilots get invite links only with CrewLu's partner release, which follows Crewluve's (P2-1).
10. **CrewLu's partner release isn't in this plan.** It follows once CrewLu 3.0.2 is on the App Store and Crewluve 1.2 is live, with its own plan (Task 7).

## Tasks

### Task 0: The starting point

**Who:** Claude.

- [x] **Step 1: Check the three repos**

Run:

```bash
git -C ~/Dev/Crewluv status --short && git -C ~/Dev/Crewluv log --oneline -1 feature/partner-cloud-source && git -C ~/Dev/Crewluv log --oneline -1 origin/feature/partner-cloud-source && git -C ~/Dev/Crewluv merge-base --is-ancestor hotfix/icloud-account-unavailable feature/partner-cloud-source && echo "release line is an ancestor" && git -C ~/Dev/CrewLu-Website status --short && git -C ~/Dev/CrewLu-Website branch --show-current
```

Expected:
- only `?? .claude/` and `?? .superpowers/`;
- `eb5fcc2 chore(crewluv): 1.2 (43), for the checks on real phones`, twice, once for the local branch and once for origin's;
- `release line is an ancestor`;
- nothing for CrewLu-Website, then `main`.

### Task 1: The privacy policy on crewlu.net

**Who:** Claude, with the user's yes before writing into `~/Dev/CrewLu-Website` and again before pushing.

**Files:** Modify `~/Dev/CrewLu-Website/crewluve/privacy-policy.html` (the date line, and the three sections from "Crewluve App - No Personal Data Collection" to "No Third-Party Services").

- [x] **Step 1: Ask, then make the change**

Claude asks the user for a yes to write in `~/Dev/CrewLu-Website`. With it, Claude replaces the date line:

```html
                    <p style="font-size: 0.9rem; color: #717981; margin-bottom: 1rem;">Last Updated: April 7, 2026
                    </p>
```

with:

```html
                    <p style="font-size: 0.9rem; color: #717981; margin-bottom: 1rem;">Last Updated: October 21, 2026
                    </p>
```

and replaces everything from `<h2>Crewluve App - No Personal Data Collection</h2>` through the end of the "No Third-Party Services" section, up to `<h2>Children's Privacy</h2>`, with:

```html
                <h2>What the Crewluve App Keeps</h2>
                <p>Crewluve shows a pilot's status, shared from their CrewLu app. It has no accounts and asks you
                    for no personal information. From version 1.2, to bring you the pilot's status and their
                    update alerts, Crewluve keeps a small amount of data on Crewlu Cloud, CrewLu's own server:</p>
                <ul>
                    <li><strong>A device key:</strong> a random code Crewluve makes on your device when it
                        connects. Crewlu Cloud stores only a one-way fingerprint of it, which can't be turned back
                        into the key.</li>
                    <li><strong>A push token:</strong> the address Apple gives your device for notifications, so
                        Crewlu Cloud can tell your device when the pilot's status changes.</li>
                    <li><strong>The kind of device:</strong> iPhone or iPad, shown to the pilot in their list of
                        your devices.</li>
                    <li><strong>When your device last checked in:</strong> shown to the pilot, for example
                        "seen today".</li>
                </ul>
                <p>The pilot chooses the name you appear under in their CrewLu app. This data is used only to show
                    you the pilot's status and to send you their updates. It isn't used for advertising or
                    tracking, and it isn't sold or shared with anyone else.</p>

                <h2>How Long It's Kept</h2>
                <p>Your device's data stays on Crewlu Cloud while your device is connected. It's deleted when you
                    choose Disconnect in Crewluve, when the pilot removes your device or removes you, or when the
                    pilot deletes their Crewlu Cloud account.</p>

                <h2>Where the Pilot's Status Comes From</h2>
                <ul>
                    <li><strong>Crewlu Cloud:</strong> CrewLu's server, hosted by <a
                            href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase</a>.
                        Your device reads the pilot's status from it with its device key.</li>
                    <li><strong>Apple Push Notification service:</strong> Crewlu Cloud asks Apple to wake Crewluve
                        when the pilot's status changes. These notifications carry no status and no personal
                        data.</li>
                    <li><strong>iCloud Sync:</strong> partners who connected before Crewlu Cloud read the pilot's
                        status through iCloud until they move over. That data stays in iCloud containers we don't
                        have access to, and is subject to <a href="https://www.apple.com/legal/privacy/"
                            target="_blank" rel="noopener noreferrer">Apple's Privacy Policy</a>.</li>
                    <li><strong>iOS App Group (Shared Container):</strong> when both CrewLu and Crewluve are
                        installed on the same device, data is shared locally via an iOS App Group shared
                        container. This data never leaves your device.</li>
                </ul>

```

Expected: `git -C ~/Dev/CrewLu-Website diff --stat` shows one file changed. Claude shows the user the new wording in the conversation, and changes nothing else on the page.

- [x] **Step 2: The user reads it in a browser**

Run:

```bash
open ~/Dev/CrewLu-Website/crewluve/privacy-policy.html
```

The user reads the new sections in their browser, says what to change if anything, and Claude makes those changes.

- [x] **Step 3: Commit, and push with a yes**

Run:

```bash
cd ~/Dev/CrewLu-Website && git add crewluve/privacy-policy.html && git commit -q -m "Crewluve privacy policy: what Crewlu Cloud keeps from version 1.2" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit. Then Claude asks for a yes, and with it runs `git -C ~/Dev/CrewLu-Website push origin main`. GitHub Pages publishes crewlu.net from `main`.

- [x] **Step 4: Check it's live**

A minute or two after the push, the user opens <https://crewlu.net/crewluve/privacy-policy.html>.

Expected: "Last Updated: October 21, 2026", and "What the Crewluve App Keeps".

### Task 2: Build 44 on the release line

**Who:** Claude, with a yes before each push.

- [ ] **Step 1: Set build 44, and commit**

Run:

```bash
cd ~/Dev/Crewluv && python3 -c "
import pathlib
p = pathlib.Path('Crewluv.xcodeproj/project.pbxproj'); s = p.read_text()
old, new = 'CURRENT_PROJECT_VERSION = 43;', 'CURRENT_PROJECT_VERSION = 44;'
assert s.count(old) == 2, old
p.write_text(s.replace(old, new))
" && git diff --stat && git add Crewluv.xcodeproj/project.pbxproj && git commit -q -m "chore(crewluv): 1.2 (44), for the App Store" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected:
- `1 file changed, 2 insertions(+), 2 deletions(-)`;
- the new commit.

- [ ] **Step 2: Fast-forward the release line to it**

`~/Dev/Crewluv` stays on `feature/partner-cloud-source`. The release branch moves without being checked out, and only if it can fast-forward.

Run:

```bash
cd ~/Dev/Crewluv && git fetch . feature/partner-cloud-source:hotfix/icloud-account-unavailable && git log --oneline -1 hotfix/icloud-account-unavailable
```

Expected: the release line's tip is the build 44 commit.

- [ ] **Step 3: Push both, with a yes**

Claude asks once for both branches, and with the yes runs:

```bash
git -C ~/Dev/Crewluv push origin feature/partner-cloud-source hotfix/icloud-account-unavailable
```

Expected: both branches updated on GitHub.

### Task 3: Archive and upload 1.2 (44)

**Who:** the user.

- [ ] **Step 1: Archive**

1. In Xcode's Crewluv window, check **Crewluv** target → **General** → **Identity**: Version **1.2**, Build **44**.
2. Set the device at the top to **Any iOS Device (arm64)**.
3. Choose **Product → Archive**, and wait for the Organizer to open with **Crewluve 1.2 (44)** selected.

- [ ] **Step 2: Upload for App Store Connect**

1. Click **Distribute App**, and choose **App Store Connect**. This time, not "TestFlight Internal Only".
2. Click **Distribute**. If it asks, keep **Automatically manage signing**.
3. Wait for **Upload Successful**, then click **Done**.

Expected: in App Store Connect → **Crewluve** → **TestFlight**, 1.2 (44) shows **Processing**, then **Ready to Submit** or **Ready to Test**.

### Task 4: The TestFlight partner connects

**Who:** the user, with Claude's checks.

- [ ] **Step 1: Give the build to the external group**

1. In App Store Connect → **Crewluve** → **TestFlight**, under **External Testing**, open the external group.
2. Check its **Testers**. If anyone besides the TestFlight partner is in it, they get 1.2 too. That's safe:
   - a Crewluve that updates before its pilot's CrewLu stays on iCloud (§8.4);
   - such a partner sees the new welcome screen only if they aren't connected.
3. Open its **Builds** tab, click **+**, and add **1.2 (44)**.
4. Fill in **What to Test**:

   ```text
   Connecting with your pilot's invite link from CrewLu, the alerts, and Use on Another Device (••• menu).
   ```

5. Click **Submit for Review**, and wait. Apple's beta review of a new version usually takes about a day.

Expected: the build shows **Approved** for the group, and TestFlight tells the partner it's ready.

- [ ] **Step 2: The partner installs it, and taps their link**

1. On the partner's phone, open **TestFlight**, and install or update **Crewluve 1.2 (44)**.
2. Open Crewluve. It shows the welcome screen, since there's no iCloud share for it to read (§17.1).
3. On your phone, in **CrewLu → Partner Sharing**, open that partner's own entry, the one marked "Needs Crewluve update". Tap **Send Link Again**, and send the link to them in Messages.
4. On their phone, tap the link.

Expected: Crewluve shows Connecting, then your status, with the •••. In CrewLu, their entry lists one device.

- [ ] **Step 3: Claude checks their device**

Claude runs this read-only query through the Supabase connection, with the partner's name from CrewLu, kept in the conversation only:

```sql
select p.name, d.kind, d.label, d.created_at, s.push_env, (s.push_token is not null) as has_push_token
from public.partners p
join public.partner_devices d on d.partner_id = p.id
left join private.partner_device_secrets s on s.device_id = d.id
where p.name = :partner
order by d.created_at;
```

Expected: one row, `app`, push_env `production`, with a push token.

- [ ] **Step 4: An alert reaches them**

1. With their phone locked, change something in your status, or give them a quick status sent to them only.
2. Wait a few minutes. Remember that iOS holds back a burst of pushes (§17.3).

Expected: Crewluve's alert on their lock screen.

### Task 5: Submit 1.2 to the App Store

**Who:** the user.

- [ ] **Step 1: Make version 1.2**

1. In App Store Connect → **Crewluve** → **Distribution**, click **+** next to **iOS App**, and type `1.2`.
2. In **What's New in This Version**, paste:

   ```text
   Crewluve is ready for CrewLu's new partner links.

   • Connect by tapping your pilot's invite link from CrewLu. No iCloud sharing needed.
   • Add your iPad or another iPhone with a 6-character code or a QR code (••• → Use on Another Device).
   • Already following your pilot through iCloud? Nothing to do: Crewluve moves over by itself once your pilot's CrewLu is updated.
   • Disconnect anytime from the ••• menu.
   ```

3. Under **Build**, click **+**, and choose **1.2 (44)**.

- [ ] **Step 2: The App Review notes**

Under **App Review Information**: **Sign-in required** stays off. In **Notes**, paste:

```text
Crewluve shows the status of a pilot who shares it from our CrewLu app. Connecting needs an invite link or a 6-character code made in the pilot's CrewLu app, so please tap Try Demo on the welcome screen to see the status screens. No account or sign-in is needed.

New in 1.2: Crewluve can connect through Crewlu Cloud, our server. It sends a random device key and its push token there, so the pilot's status and update alerts reach this device. Partners already following a pilot through iCloud keep working, and move to Crewlu Cloud by themselves once the pilot's CrewLu supports it.
```

- [ ] **Step 3: Release automatically**

Under **Version Release**, choose **Automatically release this version**.

- [ ] **Step 4: The privacy answers**

1. In the left column, under **Trust & Safety**, click **App Privacy**, then **Edit** next to **Data Types**.
2. Choose **Yes, we collect data from this app**, and tick:
   - **Identifiers → Device ID**;
   - **Usage Data → Other Usage Data**.
3. For each, answer:
   - purpose **App Functionality** only;
   - **Yes**, it's linked to the user's identity;
   - **No**, it's not used for tracking.
4. Click **Publish**.

Expected: the preview reads **Data Linked to You: Identifiers, Usage Data**. The Privacy Policy URL stays `https://crewlu.net/crewluve/privacy-policy.html`, now updated (Task 1).

- [ ] **Step 5: Submit**

Back on the 1.2 page, click **Add for Review**, then **Submit for Review**.

Expected: the status shows **Waiting for Review**. Apple usually reviews within a day or two, and 1.2 goes live when approved.

### Task 6: After it's live

**Who:** the user, with Claude's checks.

- [ ] **Step 1: Claude checks the App Store**

Claude looks up `com.ToddAnderson.Crewluv` through Apple's public lookup.

Expected: version `1.2`.

- [ ] **Step 2 (optional): The moved partner to the App Store build**

Their Xcode build keeps working, but it isn't updated by the App Store. To switch them:
1. On their phone, delete Crewluve: touch and hold → **Remove App** → **Delete App**.
2. Install Crewluve from the App Store, and open it.

Expected: their status, with the •••, and no tap: the device key outlived the app (§17.2). Claude's Task 4 Step 3 query, with their name, shows push_env `production` once the new build has sent its token.

- [ ] **Step 3: Watch the first day**

The next day, Claude reads partner-push's runs and Crewlu Cloud's device counts:
- partner-push runs end "0 failed", and any "dead" tokens are explained;
- new `app` devices appear only for people the user expects.

The user also opens App Store Connect → **Crewluve** → **TestFlight** → **Crashes**, and checks for crash reports from 1.2.

### Task 7: Record, and what's next

**Who:** Claude.

- [ ] **Step 1: The spec and this plan**

1. In the piece 4 spec's status line, record that Crewluve 1.2 is live, with its date.
2. In this plan's Execution notes, record each task's result, naming no one.
3. Commit both on website main, and ask before pushing.

- [ ] **Step 2: Hand over CrewLu's partner release**

CrewLu's piece 2 (`feature/partner-cloud-screens` in `~/Dev/Duty`) is held until 3.0.2 is on the App Store. After that it ships, with Crewluve 1.2 already live (P2-1). Its iCloud schema step is done (§17.1), and piece 2 spec §9 lists the rest.

Claude proposes a session to plan that release, in `~/Dev/Duty`'s own flow. It names, from §17:
- CrewLu's App Store build writes Production, where the pilot has no share today. So the user's own partners don't move over by ticket: one is on Crewlu Cloud, and the other connected by link in Task 4.
- Other pilots' iCloud partners, who read Production, move over by ticket as designed.

---

## Execution notes

Filled in as the release goes: each task's result, and anything that differed. Names, addresses and Apple IDs stay out.

- **Task 0 (2026-10-21):** as expected. `feature/partner-cloud-source` = origin = `eb5fcc2`, the release line is its ancestor, and CrewLu-Website was clean on `main`.
- **Task 1 (2026-10-21):**
  - The user said "start with task 1", which was their OK to write in `~/Dev/CrewLu-Website`.
  - The page's date and its three Crewluve sections were replaced as printed. The user read it locally, and said to commit and push it.
  - Committed `533e86f` and pushed (`be4aadf..533e86f`). GitHub Pages built it at 15:09 UTC.
  - The live page shows "Last Updated: October 21, 2026", "What the Crewluve App Keeps" and "How Long It's Kept", with no "No Third-Party Services". It was checked in the built-in browser, since scripted requests get a 403.
