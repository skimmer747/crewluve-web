# Partner Alert Pushes, Plan 3: The Release — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to run this plan task by task, with the user: they do every step in App Store Connect, Xcode and on the phones. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crewluve 1.3, with its alert pushes' helper, on the App Store, after spec §9.4's checks on real phones.
- 1.3 (45) is built from Crewluv's release line, with the app and the helper at the same version.
- The helper's memory is measured once, and the archive is checked, before anything goes up.
- The TestFlight partner's phone shows the alerts arrive on time before the App Store submission.

**Architecture:**
- `feature/alert-pushes` (plans 2b and 2c) takes the version change, and the release line (`hotfix/icloud-account-unavailable`, 1.2 (44)) fast-forwards to it.
- One upload, distributed through App Store Connect, serves the external TestFlight group and the App Store, as for 1.2.
- Crewlu Cloud doesn't change: plans 1 and 2a are live. Claude's checks there are read-only, each with a yes.

**Tech stack:** Xcode (a run on a device, the debugger, Archive, Distribute), App Store Connect (TestFlight, App Review), GitHub Pages for crewlu.net, and Crewlu Cloud's logs and tables, read-only.

**Design:** `docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`:
- §9.4, the checks on real phones;
- §10 item 3, the release;
- §8, privacy;
- §16.2 item 9, and plan 2c's "For plan 3".

---

## Before you start

- **Who does what.** The user does everything in App Store Connect, Xcode and on the phones, since those take their Apple account. Claude edits and commits files, runs read-only checks, gives click-by-click steps, and asks before every push and every read of Crewlu Cloud.
- **Claude never builds in `~/Dev/Crewluv`,** never runs `xcodebuild test` and never boots a simulator. Its two checks only read: `check_nse.py` asks xcodebuild for the settings of a copy of the project file, and `check_archive.py` reads the archive.
- **Four repos.**
  - `~/Dev/Crewluv` (Crewluve), where the user's Xcode has the project open on `feature/alert-pushes`;
  - `~/Dev/CrewLu-Website`, crewlu.net, for the privacy policy, in Task 1 only, with a yes;
  - `~/Dev/Crewluve Website`, for this plan and the spec;
  - `~/Dev/Duty` (CrewLu), read only. Its contract's "Undo" already says what 1.3 changes there (decision 10).

  Claude never runs `git add -A` in any of them.
- **This plan is public.** It names no one, and holds no email address, Apple ID, team id, token or key. The partners are "the moved partner", on Crewlu Cloud with the App Store's 1.2, and "the TestFlight partner", whose phone is the rarely used one (piece 4 spec §17.3). Test 1 is a test partner the user makes and removes in Task 3.
- **Never push without a fresh yes** for that push.
- **`$BUILD`** is a scratch folder of Claude's own, outside the repos, as in plan 2c.

## Decisions made while planning

1. **Both targets go to 1.3 (45).** Crewluv and CrewluveAlerts each set `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` for Debug and Release, so each is in four places. `check_nse.py` runs again after the change, and fails if the helper's differ from the app's.
2. **The release line fast-forwards.** `hotfix/icloud-account-unavailable` (`4333994`, 1.2 (44)) is an ancestor of `feature/alert-pushes`, so it moves with no merge commit. `feature/partner-cloud-source` stays at 1.2's end. `feature/alert-pushes` goes to GitHub for the first time, with the release line.
3. **No build without the helper** (plan 2c): `check_archive.py` stops the upload if the archive holds no `CrewluveAlerts.appex`, or if its version, App ID or Keychain group is wrong.
4. **The helper's memory is measured on the iPad, before the archive.** Xcode's debugger can't attach to a TestFlight build. So the iPad runs 1.3 from Xcode and joins a test partner, Test 1, as in piece 4's checks, and no real partner gets the test's quick statuses. iOS stops a notification service that goes over about 24 MB, so the bar is half that, 12 MB. Above it, the build waits.
5. **§9.4's checks run on the TestFlight partner's phone,** the rarely used one. It installs 1.3 over the 1.2 it has, so its helper reads the key 1.2 saved, which proves the Keychain group (§6.2). The moved partner stays on 1.2 until the App Store release, so theirs is the phone that must get nothing.
6. **The checks that read partner-push's lines wait until CrewLu shows no flight under way.** While one is, every write also moves the plane's position, so every partner's view changes (plan 1's Execution notes).
7. **The privacy policy's push line changes; the App Privacy answers don't.** 1.3's notifications say what kind of update they are, such as a quick status, where 1.2's said nothing. No new data leaves the phone (spec §8), so the App Store answers stay as they are.
8. **What's New promises only what's there:** alerts on time for partners connected by an invite link, and trip alerts that say what happened (§15) for everyone.
9. **1.3 goes live automatically when approved,** as 1.2 did.
10. **Plan 1's undo is for the record only, from Task 3 on.** Once a 1.3 registers, the undo in its script's header would leave 1.3 with no pushes, as `supabase/partner-api.md`'s "Undo" says.
11. **The open checks from plans 1 and 2a close here.** Plan 2a's first real run (`alerts` 0) is read at Task 0, before any 1.3 registers. Plan 1's quick-status and bursts checks run in Task 6, while the moved partner is still on 1.2.

## How this plan was checked

- **The version change** ran on a scratch clone of `feature/alert-pushes` at `1d9511b`. It gave `1 file changed, 8 insertions(+), 8 deletions(-)`, and `check_nse.py` then said `all checks ok`, with 1.3 and 45 in both configurations. Changing only the app's four lines gave four FIX lines, one for each of the helper's.
- **`check_nse.py`** comes out of plan 2c's text with Task 2 Step 2's command: 132 lines, the same bytes as the copy plan 2c ran.
- **`check_archive.py`** ran on a stand-in archive with both bundles signed ad hoc, and said `all checks ok`. Five breaks each gave a FIX:
  - the helper's Keychain group being its own;
  - the helper on another team;
  - a Keychain group on the app;
  - a file added to the helper after signing;
  - no helper.
- **The pre-push scan** ran on the ten commits `feature/alert-pushes` adds, and found nothing.
- **The privacy policy's change** ran on a scratch clone of crewlu.net: `1 file changed, 6 insertions(+), 4 deletions(-)`.
- **The log queries** read the fields earlier checks read from Crewlu Cloud's logs, in `edge_logs` and `function_logs`.
- **A replay:** Tasks 1 and 2's commands, from this plan's own text, on scratch clones of crewlu.net and of `feature/alert-pushes`. Each printed what its Expected says, ending `11 commits` and `scan done`.

## Files

- **Modify:**
  - `~/Dev/CrewLu-Website/crewluve/privacy-policy.html` (Task 1);
  - `~/Dev/Crewluv/Crewluv.xcodeproj/project.pbxproj`, the versions (Task 2);
  - in `~/Dev/Crewluve Website`: the spec, this plan, and the open steps of plans 1 and 2a (Task 9).
- **Outside the repos:** `$BUILD/check_nse.py`, from plan 2c (Task 2), and `$BUILD/check_archive.py` (Task 4).

---

## Tasks

### Task 0: The starting point

**Who:** Claude.

- [ ] **Step 1: Check the repos**

Run:

```bash
git -C ~/Dev/Crewluv status --short && git -C ~/Dev/Crewluv branch --show-current && git -C ~/Dev/Crewluv log --oneline -1 && git -C ~/Dev/Crewluv rev-parse --short hotfix/icloud-account-unavailable && git -C ~/Dev/Crewluv rev-parse --short origin/hotfix/icloud-account-unavailable && git -C ~/Dev/Crewluv merge-base --is-ancestor hotfix/icloud-account-unavailable feature/alert-pushes && echo "release line is an ancestor" && git -C ~/Dev/Crewluv ls-remote --heads origin feature/alert-pushes | wc -l | tr -d ' ' && git -C ~/Dev/CrewLu-Website status --short && git -C ~/Dev/CrewLu-Website branch --show-current
```

Expected:
- only `?? .claude/` and `?? .superpowers/`;
- `feature/alert-pushes`;
- `1d9511b fix(crewluv): the helper review's fixes: …`;
- `4333994`, twice;
- `release line is an ancestor`;
- `0`, since `feature/alert-pushes` isn't on GitHub yet;
- nothing for CrewLu-Website, then `main`.

- [ ] **Step 2: Plan 2a's first real run**

With the user's yes, Claude reads Crewlu Cloud. First partner-push's lines since version 9 went live, through `query_logs`, with the window starting at `2026-10-24T18:03:00Z`:

```sql
select timestamp, event_message from logs
 where source = 'function_logs' and event_message like 'partner-push%'
 order by timestamp desc limit 30
```

Then the last run's answer, through `execute_sql`:

```sql
select id, status_code, content from net._http_response order by id desc limit 1;
```

Expected:
- each line is `N sent (0 as alerts), 0 dead, 0 retried, 0 failed` or `nothing new to send`, and there's no `claim answered` line;
- the answer is 200, with `alerts` 0, since no Crewluve shows alert pushes yet.

If there's no line since 18:03 UTC, the user opens CrewLu, which writes on coming to the front, and Claude reads again a minute later. This closes plan 2a's Task 6 Step 4, and it has to happen before Task 3, where the first 1.3 registers.

### Task 1: The privacy policy's push line

**Who:** Claude, with the user's yes before writing into `~/Dev/CrewLu-Website`, and again before pushing.

**Files:** Modify `~/Dev/CrewLu-Website/crewluve/privacy-policy.html` (the date line, and the "Apple Push Notification service" item).

- [ ] **Step 1: Ask, then make the change**

Claude asks the user for a yes to write in `~/Dev/CrewLu-Website`. With it, Claude runs:

```bash
cd ~/Dev/CrewLu-Website && python3 - <<'EOF'
import datetime, pathlib
p = pathlib.Path('crewluve/privacy-policy.html'); s = p.read_text()
today = datetime.date.today()
pairs = (
    ('Last Updated: October 21, 2026\n', f'Last Updated: {today:%B} {today.day}, {today.year}\n'),
    ("""                    <li><strong>Apple Push Notification service:</strong> Crewlu Cloud asks Apple to wake Crewluve
                        when the pilot's status changes. These notifications carry no status and no personal
                        data.</li>
""", """                    <li><strong>Apple Push Notification service:</strong> Crewlu Cloud asks Apple to send Crewluve
                        a notification when the pilot's status changes. From version 1.3, a notification says what
                        kind of update it is, such as a quick status, and Crewluve writes the alert's words on your
                        device. Notifications carry no names, times or other personal data, and nothing else about
                        the pilot's status.</li>
"""),
)
for old, new in pairs:
    assert s.count(old) == 1, old
    s = s.replace(old, new)
p.write_text(s)
EOF
git diff --stat
```

Expected: `1 file changed, 6 insertions(+), 4 deletions(-)`. Claude shows the user the new item in the conversation, and changes nothing else on the page.

- [ ] **Step 2: The user reads it in a browser**

Run:

```bash
open ~/Dev/CrewLu-Website/crewluve/privacy-policy.html
```

The user reads "Where the Pilot's Status Comes From" in their browser, and says what to change, if anything. Claude makes those changes.

- [ ] **Step 3: Commit, and push with a yes**

Run:

```bash
cd ~/Dev/CrewLu-Website && git add crewluve/privacy-policy.html && git commit -q -m "Crewluve privacy policy: what a notification says from version 1.3" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit. Then Claude asks for a yes, and with it runs `git -C ~/Dev/CrewLu-Website push origin main`. GitHub Pages publishes crewlu.net from `main`.

- [ ] **Step 4: Check it's live**

A minute or two after the push, Claude opens <https://crewlu.net/crewluve/privacy-policy.html> in the built-in browser, since scripted requests get a 403.

Expected: the new "Last Updated" date, and "From version 1.3, a notification says what kind of update it is".

### Task 2: 1.3 (45) on the release line

**Who:** Claude, with a yes before the push.

**Files:** Modify `~/Dev/Crewluv/Crewluv.xcodeproj/project.pbxproj`. Outside the repos: `$BUILD/check_nse.py`.

- [ ] **Step 1: Set 1.3 (45) for both targets**

Xcode has the project open, and reloads the project file when it changes on disk. If Xcode asks whether to keep its version or revert, the user chooses **Revert**, which takes the file on disk.

Run:

```bash
cd ~/Dev/Crewluv && python3 -c "
import pathlib
p = pathlib.Path('Crewluv.xcodeproj/project.pbxproj'); s = p.read_text()
for old, new in (('MARKETING_VERSION = 1.2;', 'MARKETING_VERSION = 1.3;'), ('CURRENT_PROJECT_VERSION = 44;', 'CURRENT_PROJECT_VERSION = 45;')):
    assert s.count(old) == 4, old
    s = s.replace(old, new)
p.write_text(s)
" && git diff --stat
```

Expected: `1 file changed, 8 insertions(+), 8 deletions(-)`. The test targets' `1.0` and `1` stay as they are.

- [ ] **Step 2: Check the helper again**

This writes `$BUILD/check_nse.py` from plan 2c's text (its Task 4 Step 1), then runs it.

Run:

```bash
export BUILD=<your build folder> && mkdir -p "$BUILD" && cd "$HOME/Dev/Crewluve Website" && python3 - <<'EOF'
import os, pathlib
plan = pathlib.Path('docs/superpowers/plans/2026-10-24-partner-alert-pushes-2c-helper.md').read_text()
script = plan.split('Create `$BUILD/check_nse.py`:\n\n```python\n', 1)[1].split('\n```\n', 1)[0]
out = pathlib.Path(os.environ['BUILD']) / 'check_nse.py'
out.write_text(script + '\n')
print(out.name, len(script.splitlines()), 'lines')
EOF
python3 "$BUILD/check_nse.py" ~/Dev/Crewluv
```

Expected:
- `check_nse.py 132 lines`;
- an `ok` line for each check, among them `ok   Debug MARKETING_VERSION = '1.3'` and `ok   Debug CURRENT_PROJECT_VERSION = '45'`, and the same two for Release;
- `all checks ok` at the end.

A FIX line says what differs and where: stop, and ask.

- [ ] **Step 3: Commit**

Run:

```bash
cd ~/Dev/Crewluv && git add Crewluv.xcodeproj/project.pbxproj && git commit -q -m "chore(crewluv): 1.3 (45), with the alert pushes' helper at the same version, for TestFlight and the App Store" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1 && git status --short
```

Expected: the new commit, then only `?? .claude/` and `?? .superpowers/`.

- [ ] **Step 4: Fast-forward the release line to it**

`~/Dev/Crewluv` stays on `feature/alert-pushes`. The release branch moves without being checked out, and only if it can fast-forward.

Run:

```bash
cd ~/Dev/Crewluv && git fetch . feature/alert-pushes:hotfix/icloud-account-unavailable && git log --oneline -1 hotfix/icloud-account-unavailable
```

Expected: `4333994..` and the new commit, `feature/alert-pushes -> hotfix/icloud-account-unavailable`. The release line's tip is the 1.3 (45) commit.

- [ ] **Step 5: Scan, then push both with a yes**

Run:

```bash
cd ~/Dev/Crewluv && range=origin/hotfix/icloud-account-unavailable..feature/alert-pushes && echo "$(git log --oneline $range | wc -l | tr -d ' ') commits" && git log -p $range | grep -E "^\+" | grep -inE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}|\b[0-9a-f]{64}\b|skimmer|anderson" | grep -v "noreply@anthropic.com" | grep -v "com\.ToddAnderson\." | grep -v "xcuserdata/" | head -5; echo "scan done"
```

Expected: `11 commits`, then `scan done` with nothing between. The bundle id and Xcode's own scheme list path are left out of the scan: GitHub has them already.

Claude asks once for both branches, and with the yes runs:

```bash
git -C ~/Dev/Crewluv push -u origin feature/alert-pushes hotfix/icloud-account-unavailable
```

Expected: `feature/alert-pushes` new on GitHub, and `hotfix/icloud-account-unavailable` moved from `4333994` to the 1.3 (45) commit.

### Task 3: The helper on the iPad, and its memory

**Who:** the user, with Claude's checks. Do this when CrewLu shows no flight under way (decision 6). Claude asks once, at the start, for a yes that covers this task's reads of Crewlu Cloud. Each quick status has to differ from the one that partner sees now, or nothing changes for them.

- [ ] **Step 1: Make Test 1, and run 1.3 on the iPad**

1. On your phone, in **CrewLu → Partner Sharing**, tap **Invite Another Partner**, type `Test 1`, and tap **Share Invite Link**. In the share sheet, tap **Copy**, and paste the link into a note in Notes, which syncs to the iPad.
2. Connect the iPad to the Mac. In Xcode, set the scheme at the top to **Crewluv**, not CrewluveAlerts, and the destination to the iPad.
3. Press **⌘R**, and wait for Crewluve to open on the iPad. On the helper's first build for a device, Xcode's automatic signing registers its App ID, `com.ToddAnderson.Crewluv.CrewluveAlerts`. If Xcode shows a signing error for CrewluveAlerts instead, open that target's **Signing & Capabilities** and click **Try Again**.
4. On the iPad, open the note, and tap the link.

Expected: Crewluve shows Connecting, then your status, with the •••. CrewLu lists one device for Test 1.

If your phone has Crewluve too, it may follow the iPad by itself, through piece 4's hand-off copy in your iCloud Keychain, and show as Test 1's second device. That's fine: Step 5 removes both.

- [ ] **Step 2: Claude checks the iPad's device**

Claude runs, read-only:

```sql
select d.created_at::date as joined, s.push_env, s.push_token is not null as has_token, s.push_alerts
  from public.partner_devices d join private.partner_device_secrets s on s.device_id = d.id
 where d.kind = 'app' order by d.created_at;
```

Expected:
- first, the two real partners' devices, as before: `production`, a token, `push_alerts` false;
- last, the iPad's, joined today: `sandbox`, a token, and `push_alerts` true, so Crewlu Cloud took 1.3's `p_alerts`.

A second new `sandbox` row is your phone's own Crewluve following the iPad's.

- [ ] **Step 3: An alert from the helper**

1. On the iPad, swipe up to the Home Screen, and lock it.
2. On your phone, in **CrewLu → Partner Sharing → Test 1 → Nickname and Quick Status → Quick Status**, pick **Call Me**. Under **Send To**, choose Test 1 only.

Expected: within about 20 seconds, the iPad's lock screen shows one alert from Crewluve, titled with your first name, or the nickname you set for Test 1, saying "is asking you to call".

Then Claude reads the logs through `query_logs`, with the window starting a minute before the quick status:

```sql
select timestamp, event_message from logs
 where source = 'function_logs' and event_message like 'partner-push%'
 order by timestamp desc limit 5
```

```sql
select timestamp, log_attributes['response.status_code'] as status, log_attributes['request.headers.user_agent'] as agent
  from logs
 where source = 'edge_logs' and log_attributes['request.path'] = '/rest/v1/rpc/partner_view'
 order by timestamp desc limit 10
```

Expected:
- `partner-push: 1 sent (1 as alerts), 0 dead, 0 retried, 0 failed`: one alert push, to the iPad, and nothing to the real partners;
- a `partner_view` a second or two later, status 200, with an agent starting `CrewluveAlerts/45`: the helper's own read, under its own name.

- [ ] **Step 4: Measure the helper's memory**

1. In Xcode, open `Crewluv/Services/PartnerCloud/AlertPushWriter.swift`. Near the end of `words(for:at:)`, click the line number of `return AlertPushWords(title: words.title, body: words.body)` to set a breakpoint. The status the helper read is still held there, so that's about when it uses the most memory.
2. Choose **Debug → Attach to Process by PID or Name…**, type `CrewluveAlerts`, and click **Attach**. Xcode shows it's waiting for CrewluveAlerts on the iPad.
3. On your phone, send Test 1 the quick status **Free to Talk**, to Test 1 only.
4. Within about 20 seconds, Xcode stops at the breakpoint. Open the **Debug navigator** (⌘7), click **Memory**, and tell Claude the number it shows.
5. Press **Continue** (⌃⌘Y). Then choose **Debug → Detach from CrewluveAlerts**, and drag the breakpoint out of the line numbers to remove it.

Expected: under 12 MB, half of iOS's limit for a notification service (decision 4). Above that, stop and ask: the build waits.

Be quick at the breakpoint: iOS gives the helper about 30 seconds. If that ran out while it was paused, the alert may read "sent a quick status" or "New update". That's the pause, not a fault.

Then Claude reads the size of the summary the helper read, for the record:

```sql
select length(status::text) as summary_bytes from public.partner_status;
```

Expected: one row, the size of your summary.

- [ ] **Step 5: Remove Test 1**

In **CrewLu → Partner Sharing → Test 1**, tap **Remove Partner**, and confirm.

Expected:
- within a minute, or on a pull to refresh, the iPad shows the welcome screen, with "Sharing with [your name] has ended.";
- Claude's query from Step 2 shows only the two real partners' devices.

The iPad's Crewluve can stay on the welcome screen, or be deleted.

### Task 4: Archive, check and upload 1.3 (45)

**Who:** the user, with Claude's check between the archive and the upload.

- [ ] **Step 1: Archive**

1. In Xcode, check the **Crewluv** target → **General** → **Identity**: Version **1.3**, Build **45**. Then the **CrewluveAlerts** target: the same.
2. Set the scheme at the top to **Crewluv**, and the destination to **Any iOS Device (arm64)**.
3. Choose **Product → Archive**, and wait for the Organizer to open with **Crewluve 1.3 (45)** selected.

- [ ] **Step 2: Claude checks the archive**

Create `$BUILD/check_archive.py`:

```python
#!/usr/bin/env python3
"""Checks Crewluve's archive for a version and build (plan 3), without changing it: both bundles' versions, the helper's
Keychain group and App ID as signed, and the helper's extension point. Usage: check_archive.py <version> <build>.
Prints "ok" or "FIX" for each check, and exits 1 if anything needs fixing. It prints no team id."""
import plistlib, subprocess, sys
from pathlib import Path

VERSION, BUILD = sys.argv[1], sys.argv[2]
APP_ID, HELPER = 'com.ToddAnderson.Crewluv', 'CrewluveAlerts'
failures = 0


def report(ok, what, fix=''):
    global failures
    failures += not ok
    print(f'ok   {what}' if ok else f'FIX  {what}: {fix}')


def entitlements(bundle):
    out = subprocess.run(['codesign', '-d', '--entitlements', '-', '--xml', str(bundle)], capture_output=True)
    return plistlib.loads(out.stdout) if out.returncode == 0 and out.stdout else {}


def main():
    archives = [a for a in Path('~/Library/Developer/Xcode/Archives').expanduser().glob('*/*.xcarchive')
                if (a / 'Info.plist').exists()]
    ours = [a for a in archives if plistlib.loads((a / 'Info.plist').read_bytes()).get('ApplicationProperties', {})
            .get('CFBundleIdentifier') == APP_ID]
    if not ours:
        report(False, f'an archive of {APP_ID}', 'archive again with the Crewluv scheme (Task 4 Step 1)')
        sys.exit(1)
    archive = max(ours, key=lambda a: a.stat().st_mtime)
    print(f'archive: {archive.parent.name}/{archive.name}')
    app = next((archive / 'Products' / 'Applications').glob('*.app'))
    helper = app / 'PlugIns' / f'{HELPER}.appex'
    report(helper.exists(), f'the app holds PlugIns/{HELPER}.appex', 'the build has no helper: stop, and ask')
    if not helper.exists():
        sys.exit(1)
    for bundle, bundle_id in ((app, APP_ID), (helper, f'{APP_ID}.{HELPER}')):
        info = plistlib.loads((bundle / 'Info.plist').read_bytes())
        got = (info.get('CFBundleIdentifier'), info.get('CFBundleShortVersionString'), info.get('CFBundleVersion'),
               info.get('MinimumOSVersion'))
        report(got == (bundle_id, VERSION, BUILD, '26.0'), f'{bundle.name}: {bundle_id} {VERSION} ({BUILD}), iOS 26.0',
               f'it is {got!r}')
    point = plistlib.loads((helper / 'Info.plist').read_bytes()).get('NSExtension', {})
    report(point.get('NSExtensionPointIdentifier') == 'com.apple.usernotifications.service'
           and point.get('NSExtensionPrincipalClass') == f'{HELPER}.NotificationService',
           f'the helper is a notification service, {HELPER}.NotificationService', f'it is {point!r}')
    app_signed, helper_signed = entitlements(app), entitlements(helper)
    team = app_signed.get('application-identifier', '').split('.')[0]
    report(bool(team) and helper_signed.get('application-identifier') == f'{team}.{APP_ID}.{HELPER}',
           "the helper is signed with its own App ID, on the app's team", 'stop, and ask')
    report(helper_signed.get('keychain-access-groups') == [f'{team}.{APP_ID}'],
           "the helper's one Keychain group is Crewluve's own, as signed", 'stop, and ask')
    report('keychain-access-groups' not in app_signed, "the app is signed with no Keychain group of its own",
           'stop, and ask')
    verified = subprocess.run(['codesign', '--verify', '--deep', '--strict', str(app)], capture_output=True)
    report(verified.returncode == 0, 'the signatures verify', verified.stderr.decode().strip())
    print(f'{failures} to fix' if failures else 'all checks ok')
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
```

Run:

```bash
python3 "$BUILD/check_archive.py" 1.3 45
```

Expected: the archive's name, from today, then:

```text
ok   the app holds PlugIns/CrewluveAlerts.appex
ok   Crewluv.app: com.ToddAnderson.Crewluv 1.3 (45), iOS 26.0
ok   CrewluveAlerts.appex: com.ToddAnderson.Crewluv.CrewluveAlerts 1.3 (45), iOS 26.0
ok   the helper is a notification service, CrewluveAlerts.NotificationService
ok   the helper is signed with its own App ID, on the app's team
ok   the helper's one Keychain group is Crewluve's own, as signed
ok   the app is signed with no Keychain group of its own
ok   the signatures verify
all checks ok
```

Any FIX: don't upload. Stop, and ask.

- [ ] **Step 3: Upload for App Store Connect**

1. In the Organizer, click **Distribute App**, and choose **App Store Connect**.
2. Click **Distribute**. If it asks, keep **Automatically manage signing**. It makes the helper's App Store profile.
3. Wait for **Upload Successful**, then click **Done**.

Expected: in App Store Connect → **Crewluve** → **TestFlight**, 1.3 (45) shows **Processing**, then **Ready to Submit** or **Ready to Test**. An error from the upload: stop, and ask.

### Task 5: TestFlight

**Who:** the user, with Claude's check.

- [ ] **Step 1: Give the build to the external group**

1. In App Store Connect → **Crewluve** → **TestFlight**, under **External Testing**, open the external group.
2. Check its **Testers**. Anyone besides the TestFlight partner gets 1.3 too. That's safe: a partner still on iCloud keeps working as before, with Crewluve's own alerts (spec §7).
3. Open its **Builds** tab, click **+**, and add **1.3 (45)**.
4. Fill in **What to Test**:

   ```text
   Alerts that arrive on time. Crewluve now writes each alert on your phone as it comes in, even when Crewluve hasn't been opened for a while. Please check that alerts show within seconds of your pilot's update, in the usual words, and only once.
   ```

5. Click **Submit for Review**, and wait. Apple's beta review of a new version usually takes about a day. Task 7's Steps 1 to 4 can be done meanwhile.

Expected: the build shows **Approved** for the group, and TestFlight tells the partner it's ready.

- [ ] **Step 2: The partner installs it**

1. On the TestFlight partner's phone, open **TestFlight**, and update to **Crewluve 1.3 (45)**. Don't delete Crewluve first: the key 1.2 saved has to stay.
2. Open Crewluve once.

Expected: your status, with the •••, with no link and no tap.

- [ ] **Step 3: Claude checks their device**

With the user's yes, Claude runs Task 3 Step 2's query again.

Expected: two rows.
- The older, the moved partner's device: `production`, a token, `push_alerts` false.
- The newer, the TestFlight partner's: `production`, a token, and now `push_alerts` true.

### Task 6: §9.4's checks on real phones

**Who:** the user, with Claude's checks. Do these when CrewLu shows no flight under way (decision 6).
- Claude asks once, at the start, for a yes that covers this task's reads of Crewlu Cloud. After each step, it reads partner-push's lines with Task 3 Step 3's first query.
- Each quick status has to differ from the one that partner sees now, or nothing changes for them. If they already have the one named, pick another, and expect its words.

- [ ] **Step 1: Get the rarely used phone ready**

On the TestFlight partner's phone:
1. In **Settings → General → Background App Refresh**, note whether **Crewluve** is on, and turn it off.
2. Open the App Switcher, and swipe Crewluve up off the screen.
3. Unplug the phone, lock it, and leave it for a minute or two.

- [ ] **Step 2: A quick status to that partner only (§9.4 check 1)**

On your phone, in **CrewLu → Partner Sharing**, open the TestFlight partner's entry → **Nickname and Quick Status** → **Quick Status**, and pick **Call Me**. Under **Send To**, choose them only.

Expected:
- within about 20 seconds, their lock screen shows one alert, titled with the name you go by for them, saying "is asking you to call", with a sound;
- `partner-push: 1 sent (1 as alerts), 0 dead, 0 retried, 0 failed`: one push, so the moved partner's phone got nothing;
- with Task 3 Step 3's second query, a `partner_view` seconds later, status 200, with an agent starting `CrewluveAlerts/45`. The helper read the key that 1.2 saved, through Crewluve's own Keychain group (§6.2).

- [ ] **Step 3: Sleeping, to the same partner (§9.4 check 2)**

The same way, send them **Sleeping**, to them only.

Expected: one alert, "is sleeping", with no sound, and `partner-push: 1 sent (1 as alerts), 0 dead, 0 retried, 0 failed`.

- [ ] **Step 4: A quick status to the moved partner only (plan 1's open check)**

The same way, send the moved partner a quick status you're happy for them to see, such as **Free to Talk**, to them only.

Expected: `partner-push: 1 sent (0 as alerts), 0 dead, 0 retried, 0 failed`: one hidden push, to the moved partner's 1.2, as before. The TestFlight partner's phone shows nothing. This closes plan 1's Task 8 Step 5, part 2.

- [ ] **Step 5: CrewLu coming to the front (§9.4 check 3)**

1. On your phone, go to the Home Screen, then open CrewLu again.
2. Wait half a minute, then open **Partner Sharing**, and change nothing.

Expected: partner-push's lines for these writes read `partner-push: nothing new to send`, with no `sent` line. Nobody is pushed. This closes plan 1's Task 8 Step 5, part 1.

- [ ] **Step 6: With Crewluve open (§9.4 check 4)**

1. On the TestFlight partner's phone, open Crewluve, and keep it in front.
2. On your phone, send them **Out for Dinner**, to them only.

Expected: one banner, "went out for dinner", shown once, and `partner-push: 1 sent (1 as alerts), 0 dead, 0 retried, 0 failed`.

- [ ] **Step 7: Put things back**

1. On the TestFlight partner's phone, set **Background App Refresh** for Crewluve as it was at Step 1.
2. In CrewLu, clear the quick statuses you sent, if you like. Clearing one alerts nothing, since the rule needs a new status that isn't empty (spec §5.3).

### Task 7: Submit 1.3 to the App Store

**Who:** the user. Steps 1 to 4 can be done while Task 5's beta review waits. Step 5 waits for Task 6.

- [ ] **Step 1: Make version 1.3**

1. In App Store Connect → **Crewluve** → **Distribution**, click **+** next to **iOS App**, and type `1.3`.
2. In **What's New in This Version**, paste:

   ```text
   Alerts that arrive on time, and trip alerts that say what happened.

   • Connected with your pilot's invite link? Their updates now reach you within seconds, even when you haven't opened Crewluve in a while.
   • No more "Trip was cancelled" when a trip simply ends, or "Has a new trip" when one starts. Trip alerts come when the schedule really changes.
   ```

3. Under **Build**, click **+**, and choose **1.3 (45)**.

- [ ] **Step 2: The App Review notes**

Under **App Review Information**, **Sign-in required** stays off. In **Notes**, paste:

```text
Crewluve shows the status of a pilot who shares it from our CrewLu app. Connecting needs an invite link or a 6-character code made in the pilot's CrewLu app, so please tap Try Demo on the welcome screen to see the status screens. No account or sign-in is needed.

New in 1.3: update alerts reach the device as notifications from Crewlu Cloud, our server, so they arrive on time even when Crewluve isn't running. Each notification says only what kind of update it is. Crewluve's notification service extension then reads the pilot's status from Crewlu Cloud with the device's key, as the app does, and writes the alert's words on the device. No new data is collected.
```

- [ ] **Step 3: Release automatically**

Under **Version Release**, choose **Automatically release this version**.

- [ ] **Step 4: The privacy answers stay**

1. In the left column, under **Trust & Safety**, click **App Privacy**.
2. Change nothing.

Expected: the preview reads **Data Linked to You: Identifiers, Usage Data**, as for 1.2, and the Privacy Policy URL is still `https://crewlu.net/crewluve/privacy-policy.html`, updated in Task 1.

- [ ] **Step 5: Submit**

Back on the 1.3 page, click **Add for Review**, then **Submit for Review**.

Expected: the status shows **Waiting for Review**. Apple usually reviews within a day or two, and 1.3 goes live when approved.

### Task 8: After it's live

**Who:** the user, with Claude's checks.

- [ ] **Step 1: Claude checks the App Store**

Claude looks up `com.ToddAnderson.Crewluv` through Apple's public lookup.

Expected: version `1.3.0`, as App Store Connect writes 1.3. Just after the release, the lookup can give 1.2.0 for a few minutes.

- [ ] **Step 2: The moved partner moves to alert pushes by themselves**

Their phone updates Crewluve from the App Store by itself, if automatic updates are on. Its next launch registers with `p_alerts`, and a hidden push can make that launch. A day or two after the release, Claude runs Task 3 Step 2's query again, with a yes.

Expected: both devices `push_alerts` true. If the moved partner's is still false after a few days, they open Crewluve once, after updating it in the App Store if needed.

- [ ] **Step 3: Watch the first day**

The next day, with the user's yes, Claude reads the last day of partner-push's lines and the helper's reads, with Task 3 Step 3's two queries, and `limit 200`:
- partner-push's lines end `0 failed`, and any `dead` is explained;
- each of the helper's `partner_view` reads, with an agent starting `CrewluveAlerts/`, answered 200.

The user also checks for crash reports from 1.3, for Crewluve and its helper:
- in App Store Connect → **Crewluve** → **TestFlight** → **Crashes**;
- in Xcode → **Window** → **Organizer** → **Crashes**.

### Task 9: Record

**Who:** Claude.

- [ ] **Step 1: The spec, and the open steps of plans 1 and 2a**

1. In the spec's status line, record that Crewluve 1.3 is live, with its date. Add that from then on, plan 1's undo would leave it with no pushes (decision 10).
2. In plan 2a, tick Task 6 Step 4, and add an Execution notes line with Task 0 Step 2's result.
3. In plan 1, tick Task 8 Step 5, and add an Execution notes line with Task 6 Steps 4 and 5's results.

- [ ] **Step 2: This plan**

1. In this plan's Execution notes, record each task's result, naming no one: the memory measured, and the summary's size, among them.
2. Commit the spec and the three plans on website main, and ask before pushing.

---

## Not in this plan

These stay as they are, noted in plans 2a to 2c:
- the rare race on the flag that marks a reading from a hidden push;
- tests that read times in English only;
- `readable()` not checking the types of `tripId` and `currentTripId`, which needs SQL.

CrewLu's own partner release is held for 3.0.2, and doesn't depend on this one. The TestFlight partner can stay on TestFlight's build, which expires 90 days after its upload.

## Execution notes

Filled in as the release goes: each task's result, and anything that differed. Names, addresses, Apple IDs and team ids stay out.
