# Partner Alert Pushes, Plan 1: Crewlu Cloud — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crewlu Cloud sends a Crewluve that shows alert pushes one alert push per alert, worked out with Crewluve's own rules, and an older Crewluve a silent push only when something its partner sees changed. Alerts can then arrive on time, and one quick status pushes only the person it went to.

**Architecture:**
- **What each partner saw, and sees.** `partner_push_claim` keeps the summary each change was handled with (`pushed_status`). For each partner, it hands partner-push that summary and the new one, both trimmed by the partner door's own `trim_status_for`, whether anything changed for them, and their devices.
- **The rules, copied.** partner-push runs Crewluve's `StatusChangeNotifier` rules, copied into TypeScript, on each partner's two views. `supabase/partner-status/alert-cases.json` holds 36 cases that Crewluve's real Swift was checked against, and partner-push's tests run every one.
- **Two kinds of push.** A device whose Crewluve registered `p_alerts` gets one alert push per alert: priority 10, `mutable-content`, and only the alert's kind. Any other gets piece 3's silent push, now only when something changed.
- **A retry list,** one push per device, replaces piece 3's retrying of a whole pilot.

**Tech stack:** Postgres 17 on Supabase, with piece 3's `pg_cron`, `pg_net` and Vault; partner-push, a Supabase Edge Function in TypeScript on Deno; APNs. Tests: PGlite 0.5.8 and Node 23's test runner. The shared cases were checked against Crewluve's Swift with a scratch SwiftPM harness.

**Design:** `docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md` in this repo, plan 1 of its §13. It builds on piece 3: `docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md` and `docs/superpowers/plans/2026-10-18-partner-links-piece3-push.md`. The API contract is `supabase/partner-api.md` in CrewLu.

---

## Before you start

- **Two repos.**
  - The code goes in CrewLu, on the new branch `feature/partner-alert-pushes`, in a worktree beside `~/Dev/Duty`: `~/Dev/Duty-alert-pushes` (Task 0, decision 14).
  - This plan and the spec live in `~/Dev/Crewluve Website`.
  - Paths are relative to `~/Dev/Duty-alert-pushes` unless they start with `~`.
- **Only `supabase/` changes,** so no CrewLu build is affected. `~/Dev/Duty` stays on `feature/supabase-account-backend`, where the user archives, and Xcode never sees the branch.
- **Leave `~/Dev/Duty`'s Xcode scheme files alone.** It has uncommitted changes to `Duty.xcodeproj/xcshareddata/xcschemes/*` that aren't part of this work. Never run `git add -A` or `git add .`: add the exact paths each step lists.
- **The tests need only Node.** They run in PGlite, Postgres compiled to WebAssembly, from `supabase/tests` with `npm test`, which is `node --no-maglev --test` (without the flag, Node 23.11 can deadlock under the test runner). No Xcode, no simulator, no Docker, no Deno, and no connection to Crewlu Cloud or Apple. Claude runs them.
- **Each edit is exact.** "In `file`, replace:" means the first block appears exactly once in that file, and becomes the second.
- **Crewlu Cloud changes only in Task 8, by the user.** Claude's Supabase connection is read-only.
- **Shell variables don't carry from one command to the next** in Claude's Bash tool, so every command names its folder.
- **If an expected value doesn't match, stop and ask.** Never change a test to make it pass.

## Decisions made while planning

These refine the spec. Task 9 writes them into it.

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

## The four questions

- **Is this wise?**
  - A partner who rarely opens Crewluve gets alerts late, or not at all (piece 4 spec §17.3). This is the server's half of the fix, and Crewluve 1.3 (plan 2) can't show an alert push nobody sends.
  - It also ends the burst pushes at once, for every Crewluve: of the three writes one quick status makes, only the one with the news pushes anyone.
- **Will it break anything?**
  - *CrewLu:* no code changes, and no build is affected.
  - *Crewluve 1.2:* the same silent pushes as now, but only when something it sees changed. Its three-parameter `partner_set_push` still works.
  - *Crewlu Cloud:* two columns, a table, two private functions, and new versions of four functions. The undo puts piece 1's and piece 3's back as they were.
  - *Security:* claim and report keep piece 3's password and service role; the retry list is private, with RLS on; and a push carries no name, status, time or secret.
  - *The setup:* for the minute between pasting the script and deploying partner-push, a change isn't pushed (decision 15).
- **Is this what a brilliant Apple engineer would do?** An alert push at priority 10 with `mutable-content` that carries only an opaque kind, with the words written on the phone by a Notification Service Extension, the way end-to-end encrypted messengers do it. Silent pushes go only to clients that still need them, retries go to the one device inside the push's own expiry, and nobody is woken for nothing.
- **Does it fix the disease or the symptom?** The disease is that alerts waited on iOS letting Crewluve run in the background, and that every write woke every device. This moves the decision to Crewlu Cloud and the showing to iOS itself, so neither depends on Crewluve's background budget.

## Not in this plan

- **Crewluve 1.3** (plan 2) and **the release** (plan 3). Until then no device registers `p_alerts`, so no alert push goes out: Task 8 checks the silent half, and the bursts.
- **Also not in this design** (spec §12): CrewLu's extra writes (A3), time-sensitive alerts, `apns-collapse-id`, alerts for partners still on iCloud, and the website, which polls.

## How this plan was checked

- **Built test-first in a scratch clone** of `7b3aeb2d`, outside `~/Dev/Duty`. Each task's tests failed first, as printed, then passed.
- **The tests:** all 259 pass (228 before). 92 of 93 deliberate breaks were caught, one at a time, in the script and in partner-push. The first run caught 87: the five it missed (a missing status read as Home, trip blocks split at 24 hours, an ended leg home, the trip-length rule's "a trip before", and a late last leg keeping its block) got three shared cases and three home-arrival checks, and are caught now. The one left changes no answer: with nothing to compare with, the rules already alert nothing, because a summary that isn't newer than nothing alerts nothing. Its guard stays, since it says what's meant.
- **The shared cases against Crewluve's Swift:** all 36 give exactly the alerts written in them, with the same kinds, sounds, titles and words.
  - A scratch SwiftPM harness compiled Crewluve's own files (`CloudSummary`, `SharedPilotStatus`, `TripLeg`, `TripStateResolver`, `PilotDisplayStatus`, `StatusChangeNotifier` and `DebugLog`, from 1.2 (44), `4333994`) the way the app builds them: Swift 5 mode, MainActor by default.
  - It made two changes to the copies: a notification is recorded instead of posted, and the delay rule reads the case's moment instead of the clock.
  - Each case went through `StatusNotifying.evaluate`'s steps at its two moments, with `TZ=America/New_York`.
  - Breaking a case's words or its sound made the harness fail.
- **partner-push type-checks** with strict TypeScript (`--strict --noUnusedLocals --noUnusedParameters`).
- **A replay on a fresh clone of `7b3aeb2d`:** every Run step in Tasks 1–6 gave the result printed here, each test-first failure included, and every file matched the scratch build byte for byte.
- **Not checked here:** Apple, Supabase's Deno, `pg_cron` and `pg_net` themselves, and PostgREST filling in `p_alerts`'s default for 1.2's call. Task 8's checks cover those, the last with the contract's new checks 8 and 9. A real alert push to a phone waits for Crewluve 1.3 (plan 3).

## Files

In CrewLu (`~/Dev/Duty-alert-pushes`):

| File | Responsibility |
|---|---|
| `supabase/migrations/20261023120000_partner_links_alert_pushes.sql` | `p_alerts`, what each partner saw and sees, the retry list, the comparison, claim, report and the check, and the undo |
| `supabase/functions/partner-push/index.ts` (changed) | The rules, the alert push, what each device gets, the retries, and the counts |
| `supabase/partner-status/alert-cases.json` | The 36 shared cases |
| `supabase/partner-status/README.md` (changed) | What the cases are, and who checks them |
| `supabase/tests/partner_status.test.js` (changed) | The cases' form, and their fields against the schema |
| `supabase/tests/partner_push.test.js` (changed) | The rules on every case, the pushes, the run, and the run against the real SQL |
| `supabase/tests/push_service.test.js` (changed) | Claim, report and the check as they are now; piece 3's setup on a database up to piece 3 |
| `supabase/tests/push.test.js` (changed) | `partner_set_push`'s `p_alerts` |
| `supabase/tests/alert_pushes.test.js` | The script's second run and its undo |
| `supabase/tests/helpers/db.js`, `helpers/rpc.js` (changed) | `partnerDbUpTo`, and `setPush`'s `alerts` |
| `supabase/tests/privileges.test.js`, `advisors.test.js` (changed) | The new signatures and the new private table |
| `supabase/partner-api.md`, `supabase/tests/README.md` (changed) | The "Pushes" section, `p_alerts`, the undo's order, and the tests' count |

In `~/Dev/Crewluve Website`: this plan, ticked as it goes, and the spec (Task 9).

---

### Task 0: Check CrewLu's checkout and make the worktree

**Files:** none. A worktree for the new branch, beside `~/Dev/Duty` (decision 14).

- [x] **Step 1: Check the working tree**

Run:

```bash
git -C ~/Dev/Duty status --short
```

Expected: only the Xcode scheme lines (` M Duty.xcodeproj/xcshareddata/xcschemes/Duty.xcscheme` and four `??` scheme files). If anything else shows, stop and ask the user.

- [x] **Step 2: Check the release line's tip**

Run:

```bash
git -C ~/Dev/Duty log --oneline -1 feature/supabase-account-backend
```

Expected: `7b3aeb2d release: bump build to 201 (3.0.2)`. If it differs, stop and ask: this plan was checked against `7b3aeb2d`, and Task 10's merge needs the release line unmoved.

- [x] **Step 3: Make the worktree, on a new branch**

This adds a folder, `~/Dev/Duty-alert-pushes`, and the branch `feature/partner-alert-pushes`. It changes nothing in `~/Dev/Duty`: its branch, its files and Xcode stay as they are.

Run:

```bash
git -C ~/Dev/Duty worktree add -q -b feature/partner-alert-pushes ~/Dev/Duty-alert-pushes 7b3aeb2d && git -C ~/Dev/Duty-alert-pushes log --oneline -1
```

Expected: `7b3aeb2d release: bump build to 201 (3.0.2)`.

- [x] **Step 4: Copy the test packages and run the tests**

The packages are ignored by git, so the worktree has none. Copying `~/Dev/Duty`'s means nothing is downloaded.

Run:

```bash
cp -R ~/Dev/Duty/supabase/tests/node_modules ~/Dev/Duty-alert-pushes/supabase/tests/ && cd ~/Dev/Duty-alert-pushes/supabase/tests && npm test
```

Expected: `ℹ tests 228`, `ℹ pass 228`, `ℹ fail 0`, in about 35 seconds. From here on, every path is in `~/Dev/Duty-alert-pushes`.

### Task 1: The shared cases

**Files:**
- Create: `supabase/partner-status/alert-cases.json`
- Modify: `supabase/partner-status/README.md`, `supabase/tests/partner_status.test.js`

The cases are what both copies of the alert rules answer to (spec §9.1): partner-push's in Task 2, and Crewluve's in plan 2. Each is one change a partner sees, cut down to the fields the rules read, with the alerts Crewluve's `StatusChangeNotifier` makes of it. All 36 were checked against Crewluve's own Swift (see "How this plan was checked").

- [x] **Step 1: Write the cases' own tests**

Add to the end of `supabase/tests/partner_status.test.js`, after a blank line:

```js
describe("the alert pushes' shared cases (supabase/partner-status/alert-cases.json)", () => {
  const file = () => JSON.parse(readFileSync(join(contract, 'alert-cases.json'), 'utf8'))

  test('each case has a name of its own, a partner, two moments and its alerts', () => {
    const { cases } = file()
    assert.equal(new Set(cases.map((c) => c.name)).size, cases.length, 'no two cases share a name')
    for (const c of cases) {
      assert.match(c.partner, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, c.name)
      assert.equal(c.before === null, c.beforeAt === null, `${c.name}: no summary before, and no moment for it`)
      assert.ok(c.beforeAt === null || c.afterAt > c.beforeAt, `${c.name}: read after the one before`)
      for (const alert of c.alerts) {
        assert.deepEqual(Object.keys(alert).sort(), ['body', 'kind', 'sound', 'title'], c.name)
        assert.equal(typeof alert.sound, 'boolean', c.name)
      }
    }
  })

  test("every field they set is one of the summary's, and every leg's field one of a leg's", () => {
    const { base, cases } = file()
    const fields = new Set(Object.keys(schema.properties))
    const legFields = new Set(Object.keys(schema.$defs.tripLeg.properties))
    for (const view of [base, ...cases.flatMap((c) => [c.before, c.after])].filter(Boolean)) {
      for (const field of Object.keys(view)) assert.ok(fields.has(field), field)
      for (const leg of view.tripLegs ?? []) for (const field of Object.keys(leg)) assert.ok(legFields.has(field), `a leg's ${field}`)
    }
  })
})
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
cd ~/Dev/Duty-alert-pushes/supabase/tests && node --no-maglev --test partner_status.test.js
```

Expected: `ℹ tests 28`, `ℹ pass 26`, `ℹ fail 2`: both new tests fail with `ENOENT`, since `alert-cases.json` isn't there yet.

- [x] **Step 3: Write the cases**

Create `supabase/partner-status/alert-cases.json`:

```json
{
  "about": "The alert pushes' shared cases (crewluve-web docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md, §9.1). Each case is one change a partner sees: the summary before, read at beforeAt, and after, read at afterAt, each the base with the case's fields over it, or no summary before (null). alerts is what Crewluve's StatusChangeNotifier makes of it, in its order: each alert's kind (§5.3), whether it plays a sound, and the words Crewluve writes for it, with times in timeZone. partner-push's rules and Crewluve's are both checked against every case. Times are seconds since 1970.",
  "timeZone": "America/New_York",
  "base": {
    "schemaVersion": 1,
    "pilotId": "6F1C2D3E-4B5A-4C6D-8E7F-90A1B2C3D4E5",
    "pilotFirstName": "Alex",
    "homeAirportCode": "ATL",
    "displayStatus": "Layover",
    "currentTripId": "Z55120",
    "tripTotalDays": 2,
    "homeArrivalTime": null,
    "nextDepartureTime": null,
    "tripLegs": null,
    "quickStatus": null,
    "quickStatusIcon": null,
    "quickStatusExpiry": null,
    "quickStatusTargets": [],
    "quickStatusByPartner": null,
    "displayNameByPartner": null,
    "flightDelayMinutes": null,
    "localTimeAtPilot": "11:00 AM",
    "lastUpdated": 1792605600,
    "appVersion": "3.0"
  },
  "cases": [
    {
      "name": "Call Me, sent to this partner",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {},
      "after": {
        "lastUpdated": 1792605660,
        "quickStatusByPartner": { "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": { "status": "Call Me", "icon": "phone.fill", "expiry": 1792612800 } }
      },
      "alerts": [{ "kind": "quick-status", "sound": true, "title": "Alex", "body": "is asking you to call" }]
    },
    {
      "name": "Free to Talk, titled with the name the pilot set for this partner",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "displayNameByPartner": { "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": "Dad" } },
      "after": {
        "lastUpdated": 1792605660,
        "displayNameByPartner": { "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": "Dad" },
        "quickStatusByPartner": { "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": { "status": "Free to Talk", "icon": "phone.badge.checkmark", "expiry": null } }
      },
      "alerts": [{ "kind": "quick-status", "sound": true, "title": "Dad", "body": "is free to talk" }]
    },
    {
      "name": "Out for Dinner, with a name set only for another partner",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "displayNameByPartner": { "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb": "Pops" } },
      "after": {
        "lastUpdated": 1792605660,
        "displayNameByPartner": { "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb": "Pops" },
        "quickStatusByPartner": { "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": { "status": "Out for Dinner", "icon": "fork.knife", "expiry": 1792620000 } }
      },
      "alerts": [{ "kind": "quick-status", "sound": true, "title": "Alex", "body": "went out for dinner" }]
    },
    {
      "name": "Sleeping, sent to everyone, has no sound",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {},
      "after": {
        "lastUpdated": 1792605660,
        "isSleeping": true,
        "quickStatus": "Sleeping",
        "quickStatusIcon": "moon.zzz.fill",
        "quickStatusExpiry": null,
        "quickStatusTargets": null
      },
      "alerts": [{ "kind": "quick-status", "sound": false, "title": "Alex", "body": "is sleeping" }]
    },
    {
      "name": "Sleeping, sent to this partner alone, has no sound",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {},
      "after": {
        "lastUpdated": 1792605660,
        "quickStatusByPartner": { "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": { "status": "Sleeping", "icon": "moon.zzz.fill", "expiry": 1792634400 } }
      },
      "alerts": [{ "kind": "quick-status", "sound": false, "title": "Alex", "body": "is sleeping" }]
    },
    {
      "name": "Another quick status shows as itself",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {},
      "after": {
        "lastUpdated": 1792605660,
        "quickStatusByPartner": { "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": { "status": "Flight Delayed", "icon": "clock.badge.exclamationmark", "expiry": null } }
      },
      "alerts": [{ "kind": "quick-status", "sound": true, "title": "Alex", "body": "Flight Delayed" }]
    },
    {
      "name": "A quick status for another partner alerts nothing",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {},
      "after": {
        "lastUpdated": 1792605660,
        "quickStatusByPartner": { "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb": { "status": "Call Me", "icon": "phone.fill", "expiry": 1792612800 } }
      },
      "alerts": []
    },
    {
      "name": "The same quick status, sent again, alerts nothing",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "quickStatusByPartner": { "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": { "status": "Call Me", "icon": "phone.fill", "expiry": 1792612800 } }
      },
      "after": {
        "lastUpdated": 1792605660,
        "quickStatusByPartner": { "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": { "status": "Call Me", "icon": "phone.fill", "expiry": 1792620000 } }
      },
      "alerts": []
    },
    {
      "name": "A cleared quick status alerts nothing",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "quickStatusByPartner": { "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": { "status": "Call Me", "icon": "phone.fill", "expiry": 1792612800 } }
      },
      "after": { "lastUpdated": 1792605660 },
      "alerts": []
    },
    {
      "name": "This partner's own quick status expires between the readings, and the one for everyone shows",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "quickStatus": "Free to Talk",
        "quickStatusIcon": "phone.badge.checkmark",
        "quickStatusExpiry": null,
        "quickStatusTargets": null,
        "quickStatusByPartner": { "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": { "status": "Call Me", "icon": "phone.fill", "expiry": 1792605640 } }
      },
      "after": {
        "lastUpdated": 1792605660,
        "quickStatus": "Free to Talk",
        "quickStatusIcon": "phone.badge.checkmark",
        "quickStatusExpiry": null,
        "quickStatusTargets": null,
        "quickStatusByPartner": { "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": { "status": "Call Me", "icon": "phone.fill", "expiry": 1792605640 } }
      },
      "alerts": [{ "kind": "quick-status", "sound": true, "title": "Alex", "body": "is free to talk" }]
    },
    {
      "name": "Home",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "displayStatus": "Commuting Home", "currentTripId": null, "tripTotalDays": null },
      "after": { "lastUpdated": 1792605660, "displayStatus": "Home", "currentTripId": null, "tripTotalDays": null },
      "alerts": [{ "kind": "home", "sound": true, "title": "Alex", "body": "is home!" }]
    },
    {
      "name": "Took off",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "displayStatus": "Turn" },
      "after": { "lastUpdated": 1792605660, "displayStatus": "In Flight" },
      "alerts": [{ "kind": "took-off", "sound": true, "title": "Alex", "body": "just took off" }]
    },
    {
      "name": "Any other change of status alerts nothing",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "displayStatus": "Layover" },
      "after": { "lastUpdated": 1792605660, "displayStatus": "Turn" },
      "alerts": []
    },
    {
      "name": "A status that's missing reads as Home, so Home after it alerts nothing",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "displayStatus": null, "currentTripId": null, "tripTotalDays": null },
      "after": { "lastUpdated": 1792605660, "displayStatus": "Home", "currentTripId": null, "tripTotalDays": null },
      "alerts": []
    },
    {
      "name": "Delayed",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {},
      "after": { "lastUpdated": 1792605660, "flightDelayMinutes": 45 },
      "alerts": [{ "kind": "delayed", "sound": true, "title": "Alex's Flight", "body": "Delayed 45 minutes" }]
    },
    {
      "name": "Departing early",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {},
      "after": { "lastUpdated": 1792605660, "flightDelayMinutes": -10 },
      "alerts": [{ "kind": "early", "sound": true, "title": "Alex's Flight", "body": "Departing 10 minutes early" }]
    },
    {
      "name": "Delay cleared",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "flightDelayMinutes": 45 },
      "after": { "lastUpdated": 1792605660 },
      "alerts": [{ "kind": "delay-cleared", "sound": true, "title": "Alex's Flight", "body": "Delay cleared" }]
    },
    {
      "name": "Early departure cleared",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "flightDelayMinutes": -10 },
      "after": { "lastUpdated": 1792605660, "flightDelayMinutes": 0 },
      "alerts": [{ "kind": "early-cleared", "sound": true, "title": "Alex's Flight", "body": "Early departure cleared" }]
    },
    {
      "name": "A delay on a flight that hasn't landed counts, titled with the name the pilot set",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "displayNameByPartner": { "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": "Dad" },
        "nextDepartureTime": 1792638000,
        "tripLegs": [
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "displayNameByPartner": { "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": "Dad" },
        "nextDepartureTime": 1792638000,
        "tripLegs": [
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": 30 },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "alerts": [{ "kind": "delayed", "sound": true, "title": "Dad's Flight", "body": "Delayed 30 minutes" }]
    },
    {
      "name": "A delay on a flight that has landed alerts nothing",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "nextDepartureTime": 1792638000,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2962", "delayMinutes": null },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "nextDepartureTime": 1792638000,
        "tripLegs": [
          { "id": "Z55120-leg-2", "tripId": "Z55120", "type": "flight", "startTime": 1792548600, "endTime": 1792563600, "departureAirport": "RFD", "arrivalAirport": "ONT", "flightNumber": "UPS2962", "delayMinutes": 30 },
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "alerts": []
    },
    {
      "name": "A new trip",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "displayStatus": "Home", "currentTripId": null, "tripTotalDays": null },
      "after": { "lastUpdated": 1792605660, "displayStatus": "Home", "currentTripId": "Z55130", "tripTotalDays": 4 },
      "alerts": [{ "kind": "new-trip", "sound": true, "title": "Alex", "body": "Has a new 4-day trip" }]
    },
    {
      "name": "A new trip whose length isn't known",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "displayStatus": "Home", "currentTripId": null, "tripTotalDays": null },
      "after": { "lastUpdated": 1792605660, "displayStatus": "Home", "currentTripId": "Z55130", "tripTotalDays": null },
      "alerts": [{ "kind": "new-trip", "sound": true, "title": "Alex", "body": "Has a new trip" }]
    },
    {
      "name": "A new trip, with the last trip's length still set, isn't also a longer trip",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "displayStatus": "Home", "currentTripId": null, "tripTotalDays": 3 },
      "after": { "lastUpdated": 1792605660, "displayStatus": "Home", "currentTripId": "Z55130", "tripTotalDays": 4 },
      "alerts": [{ "kind": "new-trip", "sound": true, "title": "Alex", "body": "Has a new 4-day trip" }]
    },
    {
      "name": "A cancelled trip",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {},
      "after": { "lastUpdated": 1792605660, "currentTripId": null, "tripTotalDays": null },
      "alerts": [{ "kind": "trip-cancelled", "sound": true, "title": "Alex", "body": "Trip was cancelled" }]
    },
    {
      "name": "A cancelled trip with a length left isn't also a longer one",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {},
      "after": { "lastUpdated": 1792605660, "currentTripId": null, "tripTotalDays": 3 },
      "alerts": [{ "kind": "trip-cancelled", "sound": true, "title": "Alex", "body": "Trip was cancelled" }]
    },
    {
      "name": "Getting home later, from the legs",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "nextDepartureTime": 1792638000,
        "tripLegs": [
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "nextDepartureTime": 1792638000,
        "tripLegs": [
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792676700, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "alerts": [{ "kind": "home-later", "sound": true, "title": "Alex", "body": "Getting home later — now 9:45 AM" }]
    },
    {
      "name": "Getting home earlier, from the summary's home arrival",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "homeArrivalTime": 1792674300 },
      "after": { "lastUpdated": 1792605660, "homeArrivalTime": 1792672500 },
      "alerts": [{ "kind": "home-earlier", "sound": true, "title": "Alex", "body": "Getting home earlier — now 8:35 AM" }]
    },
    {
      "name": "A home arrival 10 minutes later alerts nothing",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "homeArrivalTime": 1792674300 },
      "after": { "lastUpdated": 1792605660, "homeArrivalTime": 1792674900 },
      "alerts": []
    },
    {
      "name": "The departure moved, and so did the legs",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "nextDepartureTime": 1792638000,
        "tripLegs": [
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "nextDepartureTime": 1792639200,
        "tripLegs": [
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792639200, "endTime": 1792653600, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "alerts": [{ "kind": "departure", "sound": true, "title": "Alex", "body": "Departure changed — now 11:20 PM" }]
    },
    {
      "name": "A departure that moved while the legs didn't alerts nothing",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "nextDepartureTime": 1792638000,
        "tripLegs": [
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "nextDepartureTime": 1792639200,
        "tripLegs": [
          { "flightNumber": "UPS2963", "delayMinutes": null, "arrivalAirport": "SDF", "departureAirport": "ONT", "endTime": 1792652400, "startTime": 1792638000, "type": "flight", "tripId": "Z55120", "id": "Z55120-leg-4" }
        ]
      },
      "alerts": []
    },
    {
      "name": "The trip extended",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "tripTotalDays": 3 },
      "after": { "lastUpdated": 1792605660, "tripTotalDays": 4 },
      "alerts": [{ "kind": "trip-extended", "sound": true, "title": "Alex", "body": "Trip extended to 4 days" }]
    },
    {
      "name": "The trip shortened",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": { "tripTotalDays": 4 },
      "after": { "lastUpdated": 1792605660, "tripTotalDays": 3 },
      "alerts": [{ "kind": "trip-shortened", "sound": true, "title": "Alex", "body": "Trip shortened to 3 days" }]
    },
    {
      "name": "One change, two alerts: the departure moved and the flight is delayed",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {
        "nextDepartureTime": 1792638000,
        "tripLegs": [
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": null },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "after": {
        "lastUpdated": 1792605660,
        "nextDepartureTime": 1792640700,
        "tripLegs": [
          { "id": "Z55120-leg-4", "tripId": "Z55120", "type": "flight", "startTime": 1792638000, "endTime": 1792652400, "departureAirport": "ONT", "arrivalAirport": "SDF", "flightNumber": "UPS2963", "delayMinutes": 45 },
          { "id": "jumpseat-1", "tripId": null, "type": "flight", "startTime": 1792670700, "endTime": 1792674300, "departureAirport": "SDF", "arrivalAirport": "ATL", "flightNumber": "DL1234", "delayMinutes": null }
        ]
      },
      "alerts": [
        { "kind": "departure", "sound": true, "title": "Alex", "body": "Departure changed — now 11:45 PM" },
        { "kind": "delayed", "sound": true, "title": "Alex's Flight", "body": "Delayed 45 minutes" }
      ]
    },
    {
      "name": "A write that changes only the time it was made alerts nothing",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {},
      "after": { "lastUpdated": 1792605660, "localTimeAtPilot": "11:01 AM" },
      "alerts": []
    },
    {
      "name": "A summary no newer than the last alerts nothing",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": 1792605615,
      "afterAt": 1792605675,
      "before": {},
      "after": {
        "quickStatusByPartner": { "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": { "status": "Call Me", "icon": "phone.fill", "expiry": 1792612800 } }
      },
      "alerts": []
    },
    {
      "name": "The first summary a partner sees alerts nothing",
      "partner": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "beforeAt": null,
      "afterAt": 1792605675,
      "before": null,
      "after": {
        "lastUpdated": 1792605660,
        "quickStatusByPartner": { "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": { "status": "Call Me", "icon": "phone.fill", "expiry": 1792612800 } }
      },
      "alerts": []
    }
  ]
}
```

In `supabase/partner-status/README.md`, replace:

```markdown
## Who checks it
```

with:

```markdown
## The alert pushes' cases

`alert-cases.json` holds the changes a partner can see, and the alerts each one makes, for the alert pushes
(crewluve-web `docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`, §9.1). Each case has the summary
before and after, as the file's `base` with the case's fields over it, the moments each was read, and the alerts that
Crewluve's `StatusChangeNotifier` makes of it: each one's kind, whether it plays a sound, and its words, with times in
the file's `timeZone`. The summaries are cut down to the fields the alerts read, so they don't follow the schema's
list of required fields; every field they do set is one of the schema's.

- **CrewLu Cloud's tests** (`../tests/partner_push.test.js`) check partner-push's rules against every case.
- **Crewluve's tests** check its own rules and words against every case, from a copy of the file.

## Who checks it
```

- [x] **Step 4: Run them to see them pass**

Run:

```bash
cd ~/Dev/Duty-alert-pushes/supabase/tests && node --no-maglev --test partner_status.test.js
```

Expected: `ℹ tests 28`, `ℹ pass 28`, `ℹ fail 0`.

- [x] **Step 5: Commit**

Run:

```bash
cd ~/Dev/Duty-alert-pushes && git add supabase/partner-status/alert-cases.json supabase/partner-status/README.md supabase/tests/partner_status.test.js && git commit -q -m "test(partner-links): the alert pushes' shared cases, which partner-push's rules and Crewluve's answer to" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit, `test(partner-links): the alert pushes' shared cases, which partner-push's rules and Crewluve's answer to`.

### Task 2: The rules

**Files:**
- Modify: `supabase/functions/partner-push/index.ts`, `supabase/tests/partner_push.test.js`

Crewluve's alert rules, copied into partner-push as plain functions (spec §5.3). Nothing calls them yet: Task 4 does.

- [x] **Step 1: Write the rules' tests**

In `supabase/tests/partner_push.test.js`, replace:

```js
import {
  APNS_HOSTS,
  AT_ONCE,
  PUSH_BODY,
  PUSH_TIMEOUT_MS,
  RPC_TIMEOUT_MS,
  base64url,
  configFromEnv,
  importKey,
  makeHandler,
  outcome,
  pemBytes,
  pushRequest,
  signingToken,
} from '../functions/partner-push/index.ts'
```

with:

```js
import {
  ALERT_KINDS,
  APNS_HOSTS,
  AT_ONCE,
  PUSH_BODY,
  PUSH_TIMEOUT_MS,
  RPC_TIMEOUT_MS,
  alertsFor,
  base64url,
  configFromEnv,
  effectiveDelay,
  homeArrival,
  importKey,
  legsDiffer,
  makeHandler,
  outcome,
  pemBytes,
  pushRequest,
  shownQuickStatus,
  signingToken,
} from '../functions/partner-push/index.ts'
```

In `supabase/tests/partner_push.test.js`, replace:

```js
const SUPABASE_URL = 'https://cloud.test'
```

with:

```js
/** The shared cases (supabase/partner-status/alert-cases.json). Each view is the base with the case's fields over it. */
const cases = JSON.parse(read(new URL('../partner-status/alert-cases.json', import.meta.url)))
const viewOf = (fields) => (fields === null ? null : { ...cases.base, ...fields })

/** Partners A and B of the shared cases and the summary examples. */
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

describe('the alerts (alert pushes spec §5.3)', () => {
  test("every shared case gives the alerts Crewluve's StatusChangeNotifier gives, in its order", () => {
    for (const c of cases.cases.filter((c) => c.before !== null)) {
      assert.deepEqual(
        alertsFor(viewOf(c.before), viewOf(c.after), c.partner, c.beforeAt, c.afterAt),
        c.alerts.map(({ kind, sound }) => ({ kind, sound })),
        c.name,
      )
    }
  })

  test('every kind of alert has a case, and no case names another kind', () => {
    const named = new Set(cases.cases.flatMap((c) => c.alerts.map((alert) => alert.kind)))
    assert.deepEqual([...named].sort(), [...ALERT_KINDS].sort())
  })

  test("the quick status shown: this partner's own while it lasts, then the one for everyone, never another's", () => {
    const own = (status, expiry = null, partner = A) => ({ quickStatusByPartner: { [partner]: { status, icon: 'phone.fill', expiry } } })
    const everyone = { quickStatus: 'Sleeping', quickStatusExpiry: null, quickStatusTargets: null }
    assert.equal(shownQuickStatus(own('Call Me'), A, 100), 'Call Me')
    assert.equal(shownQuickStatus(own('Call Me', 101), A.toUpperCase(), 100), 'Call Me', 'by the id in lower case')
    assert.equal(shownQuickStatus({ ...own('Call Me', 100), ...everyone }, A, 100), 'Sleeping', 'gone at its expiry')
    assert.equal(shownQuickStatus({ ...own(''), ...everyone }, A, 100), 'Sleeping', 'an empty one never shows')
    assert.equal(shownQuickStatus({ ...everyone, quickStatusExpiry: 100 }, A, 100), null)
    assert.equal(shownQuickStatus({ ...everyone, quickStatusTargets: [B] }, A, 100), null)
    assert.equal(shownQuickStatus({ ...everyone, quickStatusTargets: [A.toUpperCase()] }, A, 100), 'Sleeping')
    assert.equal(shownQuickStatus(own('Call Me', null, B), A, 100), null)
    assert.equal(shownQuickStatus({}, A, 100), null)
  })

  test("the delay that counts: the summary's own, else the first delayed flight that hasn't landed", () => {
    const flight = (id, end, delayMinutes, type = 'flight') => ({ id, type, startTime: end - 3600, endTime: end, delayMinutes })
    assert.equal(effectiveDelay({ flightDelayMinutes: 45, tripLegs: [flight('a', 9000, 30)] }, 0), 45)
    assert.equal(effectiveDelay({ flightDelayMinutes: 0, tripLegs: [flight('a', 9000, 30)] }, 0), 30)
    assert.equal(effectiveDelay({ tripLegs: [flight('a', 9000, 30)] }, 9000 + 30 * 60 - 1), 30, 'until its delayed landing')
    assert.equal(effectiveDelay({ tripLegs: [flight('a', 9000, 30)] }, 9000 + 30 * 60), 0)
    assert.equal(effectiveDelay({ tripLegs: [flight('a', 9000, -10)] }, 0), -10)
    const legs = [flight('drive', 9000, 20, 'drive'), flight('on time', 9000, 0), flight('late', 9500, 15), flight('later', 9600, 25)]
    assert.equal(effectiveDelay({ tripLegs: legs }, 0), 15)
    assert.equal(effectiveDelay({ tripLegs: null }, 0), 0)
  })

  test("the home arrival: from the legs of the block covering the moment, or else the next, else the summary's", () => {
    const H = 3600
    const leg = (id, start, end, to, type = 'flight', delayMinutes = null) => ({ id, type, startTime: start, endTime: end, arrivalAirport: to, delayMinutes })
    const summary = (tripLegs) => ({ homeAirportCode: 'ATL', homeArrivalTime: 777, tripLegs })
    // One block: the latest leg home that hasn't ended, its delay included, the airport in any case.
    const block = [leg('out', 0, 2 * H, 'SDF'), leg('home', 3 * H, 4 * H, 'atl', 'drive'), leg('home again', 5 * H, 6 * H, 'ATL', 'event', 30)]
    assert.equal(homeArrival(summary(block), H), 6 * H + 30 * 60)
    assert.equal(homeArrival(summary(block.slice(0, 2)), 4 * H - 1), 4 * H)
    assert.equal(homeArrival(summary(block.slice(0, 2)), 4 * H), 777, 'a leg home that has ended counts no more')
    // Before a block starts, the next block. A leg over 24 hours after the one before starts a block of its own.
    const nextTrip = leg('next trip', 31 * H, 32 * H, 'ATL')
    assert.equal(homeArrival(summary([...block, nextTrip]), -H), 6 * H + 30 * 60)
    assert.equal(homeArrival(summary([...block, nextTrip]), 7 * H), 32 * H)
    // A block runs on while each leg starts within 24 hours of the one before.
    assert.equal(homeArrival(summary([leg('out', 0, 2 * H, 'SDF'), leg('home', 22 * H, 23 * H, 'ATL')]), H), 23 * H)
    // In the block covering the moment, a leg home that has ended counts no more, and a late last leg keeps it covering.
    assert.equal(homeArrival(summary([leg('home', 0, H, 'ATL'), leg('out', 2 * H, 3 * H, 'SDF')]), 1.5 * H), 777)
    assert.equal(homeArrival(summary([leg('late home', 0, 2 * H, 'ATL', 'flight', 30)]), 2 * H + 600), 2.5 * H)
    // A turn doesn't take the pilot home, and without a home airport the legs aren't read.
    assert.equal(homeArrival(summary([leg('turn', 0, H, 'ATL', 'turn')]), 0), 777)
    assert.equal(homeArrival({ ...summary(block), homeAirportCode: '' }, 0), 777)
    assert.equal(homeArrival({ homeAirportCode: 'ATL' }, 0), null)
  })

  test('legs compare as Crewluve reads them: field by field, whatever their key order, an unknown type as unknown', () => {
    const leg = { id: 'a', type: 'flight', startTime: 1, endTime: 2, delayMinutes: null }
    assert.equal(legsDiffer([leg], [{ endTime: 2, startTime: 1, type: 'flight', id: 'a' }]), false, 'key order, and null as missing')
    assert.equal(legsDiffer([leg], [{ ...leg, delayMinutes: 5 }]), true)
    assert.equal(legsDiffer([{ ...leg, type: 'jumpseat' }], [{ ...leg, type: 'tram' }]), false)
    assert.equal(legsDiffer([leg], [leg, leg]), true)
    assert.equal(legsDiffer(null, null), false)
    assert.equal(legsDiffer(null, []), true)
    assert.equal(legsDiffer([], []), false)
  })
})

const SUPABASE_URL = 'https://cloud.test'
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
cd ~/Dev/Duty-alert-pushes/supabase/tests && node --no-maglev --test partner_push.test.js
```

Expected: `ℹ tests 1`, `ℹ fail 1`: `does not provide an export named 'ALERT_KINDS'`, since the rules aren't written yet.

- [x] **Step 3: Write the rules**

They go after `pushRequest`, before `outcome`. Each names the Swift it copies.

In `supabase/functions/partner-push/index.ts`, replace:

```ts
/** What Apple's answer to one push means (spec §7). */
```

with:

```ts
// The alerts (alert pushes spec §5.3): Crewluve's StatusChangeNotifier, copied for one partner's view of the summary.
// A view is what partner_view gives that partner: CrewLu's summary (supabase/partner-status/schema.json), trimmed to
// their own entries. Times are seconds since 1970, as the summary writes them. Both copies are checked against
// supabase/partner-status/alert-cases.json.

/** A summary, as one partner sees it. */
type View = { [field: string]: any }
/** One of the summary's tripLegs. */
type Leg = { [field: string]: any }

/** One alert: its kind, which names Crewluve's words for it, and whether it plays a sound. */
export type Alert = { kind: string; sound: boolean }

/** Every kind of alert, in the order StatusChangeNotifier makes them. */
export const ALERT_KINDS = [
  'new-trip',
  'trip-cancelled',
  'home-later',
  'home-earlier',
  'departure',
  'trip-extended',
  'trip-shortened',
  'quick-status',
  'delayed',
  'early',
  'delay-cleared',
  'early-cleared',
  'home',
  'took-off',
]

/** A quick status shows while it isn't empty and hasn't expired, as on Crewluve's screen (CloudSummary.shows). */
const shows = (status: unknown, expiry: unknown, at: number) =>
  typeof status === 'string' && status !== '' && (expiry == null || (expiry as number) > at)

/** The quick status this partner sees at `at`: their own while it lasts, then the one for everyone (CloudSummary.quickStatus). */
export function shownQuickStatus(view: View, partner: string, at: number): string | null {
  const id = partner.toLowerCase()
  const own = view.quickStatusByPartner?.[id]
  if (own && shows(own.status, own.expiry, at)) return own.status
  const targets = view.quickStatusTargets
  const forThem = targets == null || targets.some((target: unknown) => String(target).toLowerCase() === id)
  return forThem && shows(view.quickStatus, view.quickStatusExpiry, at) ? view.quickStatus : null
}

/** The summary's legs, or none. */
const legsOf = (view: View): Leg[] => (Array.isArray(view.tripLegs) ? view.tripLegs : [])

/** A leg's end, moved by its delay (TripStateResolver.effectiveEnd). */
const effectiveEnd = (leg: Leg) => leg.endTime + (leg.delayMinutes ?? 0) * 60

/** The delay that counts at `at`, in minutes: the summary's own, else the first delayed flight not yet in (SharedPilotStatus.effectiveFlightDelayMinutes). */
export function effectiveDelay(view: View, at: number): number {
  if (view.flightDelayMinutes != null && view.flightDelayMinutes !== 0) return view.flightDelayMinutes
  const leg = legsOf(view).find(
    (leg) => leg.type === 'flight' && leg.delayMinutes != null && leg.delayMinutes !== 0 && at < leg.endTime + leg.delayMinutes * 60,
  )
  return leg ? leg.delayMinutes : 0
}

/**
 * When the pilot gets home, as Crewluve works it out at `at` (TripStateResolver.resolveHomeArrival, else the summary's
 * homeArrivalTime): in the trip block covering `at`, or else the next one, the latest delay-shifted end of a flight,
 * event or drive that arrives home and hasn't ended. A block is a run of legs no more than 24 hours apart. Crewluve
 * first ends a layover, home or base leg where a flight inside it starts (adjustLayoversForOverlappingFlights). That
 * can't change this answer, so it isn't copied: such a leg is never counted, never ends its block, and the leg after
 * it starts before it ends, trimmed or not.
 */
export function homeArrival(view: View, at: number): number | null {
  const home = view.homeAirportCode
  if (typeof home === 'string' && home !== '') {
    const sorted = [...legsOf(view)].sort((a, b) => a.startTime - b.startTime)
    const blocks: Leg[][] = []
    sorted.forEach((leg, i) => {
      if (i > 0 && leg.startTime - sorted[i - 1].endTime <= 24 * 3600) blocks[blocks.length - 1].push(leg)
      else blocks.push([leg])
    })
    const block =
      blocks.find((b) => at >= b[0].startTime && at < effectiveEnd(b[b.length - 1])) ?? blocks.find((b) => b[0].startTime > at)
    const ends = (block ?? [])
      .filter(
        (leg) =>
          ['flight', 'event', 'drive'].includes(leg.type) &&
          effectiveEnd(leg) > at &&
          typeof leg.arrivalAirport === 'string' &&
          leg.arrivalAirport.toLowerCase() === home.toLowerCase(),
      )
      .map(effectiveEnd)
    if (ends.length > 0) return Math.max(...ends)
  }
  return view.homeArrivalTime ?? null
}

/** The fields Crewluve's TripLeg reads, which legs are compared by (StatusChangeNotifier.legsDiffer). */
const LEG_FIELDS = [
  'id', 'tripId', 'type', 'startTime', 'endTime', 'airportCode', 'city', 'timezoneIdentifier', 'arrivalTimezoneIdentifier',
  'flightNumber', 'departureAirport', 'arrivalAirport', 'departureCity', 'arrivalCity', 'tripDayNumber', 'tripTotalDays',
  'delayMinutes', 'airlineCode', 'label',
]
/** The leg types Crewluve knows. It reads any other as unknown. */
const LEG_TYPES = ['flight', 'turn', 'layover', 'home', 'base', 'drive', 'reserve', 'hotStandby', 'event']

/** Whether two summaries' legs differ, compared as Crewluve reads them: field by field, whatever their key order. */
export function legsDiffer(before: Leg[] | null | undefined, after: Leg[] | null | undefined): boolean {
  if (before == null || after == null) return (before == null) !== (after == null)
  const read = (legs: Leg[]) =>
    JSON.stringify(
      legs.map((leg) => LEG_FIELDS.map((field) => (field === 'type' ? (LEG_TYPES.includes(leg.type) ? leg.type : 'unknown') : (leg[field] ?? null)))),
    )
  return read(before) !== read(after)
}

/**
 * The alerts one partner gets for the change from `before`, seen at `beforeAt`, to `after`, seen at `afterAt`: what
 * StatusChangeNotifier posts when Crewluve reads `after` with `before` as its snapshot, in its order. A summary that
 * isn't newer alerts nothing.
 */
export function alertsFor(before: View, after: View, partner: string, beforeAt: number, afterAt: number): Alert[] {
  if (!(after.lastUpdated > before.lastUpdated)) return []
  const alerts: Alert[] = []
  const add = (kind: string, sound = true) => alerts.push({ kind, sound })

  // The schedule (evaluateScheduleChanges).
  const hadTrip = before.currentTripId != null
  const hasTrip = after.currentTripId != null
  if (!hadTrip && hasTrip) add('new-trip')
  if (hadTrip && !hasTrip) add('trip-cancelled')
  const homeBefore = homeArrival(before, beforeAt)
  const homeAfter = homeArrival(after, afterAt)
  if (homeBefore != null && homeAfter != null && Math.abs(homeAfter - homeBefore) > 15 * 60) {
    add(homeAfter > homeBefore ? 'home-later' : 'home-earlier')
  }
  const departureBefore = before.nextDepartureTime
  const departureAfter = after.nextDepartureTime
  if (
    legsDiffer(before.tripLegs, after.tripLegs) &&
    departureBefore != null &&
    departureAfter != null &&
    Math.abs(departureAfter - departureBefore) > 15 * 60
  ) {
    add('departure')
  }
  const daysBefore = before.tripTotalDays
  const daysAfter = after.tripTotalDays
  if (daysBefore != null && daysAfter != null && daysBefore !== daysAfter && hadTrip && hasTrip) {
    add(daysAfter > daysBefore ? 'trip-extended' : 'trip-shortened')
  }

  // The quick status (evaluateQuickStatus). Sleeping has no sound.
  const quickBefore = shownQuickStatus(before, partner, beforeAt)
  const quickAfter = shownQuickStatus(after, partner, afterAt)
  if (quickAfter !== null && quickAfter !== quickBefore) add('quick-status', quickAfter !== 'Sleeping')

  // The flight's delay (evaluateFlightDelay).
  const delayBefore = effectiveDelay(before, beforeAt)
  const delayAfter = effectiveDelay(after, afterAt)
  if (delayBefore !== delayAfter) {
    add(delayAfter > 0 ? 'delayed' : delayAfter < 0 ? 'early' : delayBefore < 0 ? 'early-cleared' : 'delay-cleared')
  }

  // The status (evaluateStatusTransitions). Crewluve reads a missing displayStatus as Home.
  const statusBefore = before.displayStatus ?? 'Home'
  const statusAfter = after.displayStatus ?? 'Home'
  if (statusBefore !== statusAfter && statusAfter === 'Home') add('home')
  if (statusBefore !== statusAfter && statusAfter === 'In Flight') add('took-off')
  return alerts
}

/** What Apple's answer to one push means (spec §7). */
```

- [x] **Step 4: Run them to see them pass**

Run:

```bash
cd ~/Dev/Duty-alert-pushes/supabase/tests && node --no-maglev --test partner_push.test.js
```

Expected: `ℹ tests 40`, `ℹ pass 40`, `ℹ fail 0`.

- [x] **Step 5: Commit**

Run:

```bash
cd ~/Dev/Duty-alert-pushes && git add supabase/functions/partner-push/index.ts supabase/tests/partner_push.test.js && git commit -q -m "feat(partner-links): partner-push's copy of Crewluve's alert rules, checked against every shared case" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit, `feat(partner-links): partner-push's copy of Crewluve's alert rules, checked against every shared case`.

### Task 3: partner_set_push's p_alerts

**Files:**
- Create: `supabase/migrations/20261023120000_partner_links_alert_pushes.sql`
- Modify: `supabase/tests/push.test.js`, `supabase/tests/helpers/rpc.js`, `supabase/tests/helpers/db.js`, `supabase/tests/push_service.test.js`, `supabase/tests/privileges.test.js`, `supabase/tests/advisors.test.js`

The script starts here, with its first change: Crewluve 1.3 can say it shows alert pushes (spec §4.1). Its undo comes in Task 5. From now on piece 3's own undo can't run on a database with this script, since it names the old `partner_set_push`, so its two setup tests get a database built up to piece 3 (decision 3).

- [x] **Step 1: Write the tests**

The helper keeps calling with three parameters, as Crewluve 1.2 does, unless a test passes `alerts`:

In `supabase/tests/helpers/rpc.js`, replace:

```js
export const setPush = (db, key, token, env = 'production') =>
  asAnon(db, 'select public.partner_set_push($1::text, $2::text, $3::text) as r', [key, token, env]).then(result)
```

with:

```js
// Without alerts, the call Crewluve 1.2 makes: three parameters, so p_alerts takes its default.
export const setPush = (db, key, token, env = 'production', alerts) =>
  (alerts === undefined
    ? asAnon(db, 'select public.partner_set_push($1::text, $2::text, $3::text) as r', [key, token, env])
    : asAnon(db, 'select public.partner_set_push($1::text, $2::text, $3::text, $4::boolean) as r', [key, token, env, alerts])
  ).then(result)
```

Replace the whole of `supabase/tests/push.test.js` with:

```js
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { asAdmin, freshDb } from './helpers/db.js'
import { connected, join, leave, setPush } from './helpers/rpc.js'

describe('partner_set_push', () => {
  let db
  before(async () => {
    db = await freshDb()
  })
  after(async () => {
    await db.close()
  })

  const TOKEN = 'ab'.repeat(32) // 64 hex characters, the usual APNs device token
  const pushOf = async (deviceId) =>
    (
      await asAdmin(db, 'select push_token, push_env, push_alerts from private.partner_device_secrets where device_id = $1', [
        deviceId,
      ])
    )[0]

  test("the app saves its push token and environment", async () => {
    const { key, deviceId } = await connected(db)
    assert.deepEqual(await setPush(db, key, TOKEN.toUpperCase(), 'sandbox'), { ok: true })
    assert.deepEqual(await pushOf(deviceId), { push_token: TOKEN, push_env: 'sandbox', push_alerts: false })
  })

  test('only app devices, real tokens and known environments are accepted', async () => {
    const web = await connected(db, { kind: 'web' })
    assert.deepEqual(await setPush(db, web.key, TOKEN), { error: 'invalid_input' })
    const app = await connected(db)
    for (const [token, env] of [['xyz', 'production'], ['ab'.repeat(20), 'production'], [TOKEN, 'staging'], [TOKEN, null], [null, 'production']]) {
      assert.deepEqual(await setPush(db, app.key, token, env), { error: 'invalid_input' }, `${token} ${env}`)
    }
    assert.deepEqual(await pushOf(app.deviceId), { push_token: null, push_env: null, push_alerts: false })
  })

  test('a token moves to the newest device that registers it', async () => {
    const { invite, key, deviceId } = await connected(db)
    await setPush(db, key, TOKEN)
    const reinstalled = await join(db, invite, 'app', "Sarah's iPhone")
    await setPush(db, reinstalled.device_key, TOKEN)
    assert.deepEqual(await pushOf(deviceId), { push_token: null, push_env: null, push_alerts: false })
    assert.deepEqual(await pushOf(reinstalled.device_id), { push_token: TOKEN, push_env: 'production', push_alerts: false })
  })

  test('a disconnected device answers sharing_ended', async () => {
    const { key } = await connected(db)
    await leave(db, key)
    assert.deepEqual(await setPush(db, key, TOKEN), { error: 'sharing_ended' })
  })

  test('Crewluve 1.3 says it shows alert pushes; a call without p_alerts, as 1.2 makes, says it does not', async () => {
    const { key, deviceId } = await connected(db)
    assert.deepEqual(await setPush(db, key, TOKEN, 'production', true), { ok: true })
    assert.deepEqual(await pushOf(deviceId), { push_token: TOKEN, push_env: 'production', push_alerts: true })
    await setPush(db, key, TOKEN)
    assert.deepEqual(await pushOf(deviceId), { push_token: TOKEN, push_env: 'production', push_alerts: false })
    await setPush(db, key, TOKEN, 'production', null)
    assert.equal((await pushOf(deviceId)).push_alerts, false, 'a null p_alerts says no')
  })

  test('the flag goes with the token: a token that moves on leaves no flag behind', async () => {
    const { invite, key, deviceId } = await connected(db)
    await setPush(db, key, TOKEN, 'production', true)
    const reinstalled = await join(db, invite, 'app', "Sarah's iPhone")
    await setPush(db, reinstalled.device_key, TOKEN, 'production', true)
    assert.deepEqual(await pushOf(deviceId), { push_token: null, push_env: null, push_alerts: false })
    assert.deepEqual(await pushOf(reinstalled.device_id), { push_token: TOKEN, push_env: 'production', push_alerts: true })
  })
})
```

The database up to piece 3:

In `supabase/tests/helpers/db.js`, replace:

```js
/**
 * A new database built the way CrewLu Cloud was: the Supabase shim, then `files` from supabase/migrations in the
```

with:

```js
/**
 * A new database with the Supabase shim and the partner-links migrations up to and including `last`, as CrewLu Cloud
 * had them before the later ones: for a migration's second run and its undo, which a later one can change.
 */
export function partnerDbUpTo(last) {
  return build([shim, ...partnerMigrations().filter((file) => file <= last).map(migrationPath)])
}

/**
 * A new database built the way CrewLu Cloud was: the Supabase shim, then `files` from supabase/migrations in the
```

In `supabase/tests/push_service.test.js`, replace:

```js
import { asAdmin, asService, freshDb, migrationPath, read } from './helpers/db.js'
```

with:

```js
import { asAdmin, asService, freshDb, migrationPath, partnerDbUpTo, read } from './helpers/db.js'
```

In `supabase/tests/push_service.test.js`, replace:

```js
/** A fresh database for one test, closed when the test ends. */
async function db(t) {
  const fresh = await freshDb()
  t.after(() => fresh.close())
  return fresh
}
```

with:

```js
/** A fresh database for one test, closed when the test ends. */
async function db(t) {
  const fresh = await freshDb()
  t.after(() => fresh.close())
  return fresh
}

/** A database with the partner-links migrations up to piece 3's and no later, for its second run and its undo. */
async function pieceThreeDb(t) {
  const fresh = await partnerDbUpTo('20261018120000_partner_links_push.sql')
  t.after(() => fresh.close())
  return fresh
}
```

In `supabase/tests/push_service.test.js`, replace:

```js
  test('running the script a second time fails, and changes nothing', async (t) => {
    const d = await db(t)
```

with:

```js
  test('running the script a second time fails, and changes nothing', async (t) => {
    const d = await pieceThreeDb(t)
```

In `supabase/tests/push_service.test.js`, replace:

```js
  test('the undo in its header removes everything it added, and none of piece 1', async (t) => {
    const d = await db(t)
```

with:

```js
  test('the undo in its header removes everything it added, and none of piece 1', async (t) => {
    const d = await pieceThreeDb(t)
```

The lists of every function, which now hold the new signature:

In `supabase/tests/privileges.test.js`, replace:

```js
    'partner_set_push(text, text, text)',
```

with:

```js
    'partner_set_push(text, text, text, boolean)',
```

In `supabase/tests/advisors.test.js`, replace:

```js
// Partner-links piece 1's RPCs, from its migrations (*_partner_links_*_rpcs.sql). The partner RPCs are how a
// partner's device gets in, so anon may call them. The pilot RPCs need a signed-in pilot.
const PARTNER_RPCS = [
  'public.partner_handoff_create(text)',
  'public.partner_handoff_redeem(text, text, text, text)',
  'public.partner_join(text, text, text, text)',
  'public.partner_leave(text)',
  'public.partner_set_push(text, text, text)',
  'public.partner_view(text, timestamp with time zone)',
]
```

with:

```js
// Partner-links piece 1's RPCs, from its migrations (*_partner_links_*_rpcs.sql). The partner RPCs are how a
// partner's device gets in, so anon may call them. The pilot RPCs need a signed-in pilot. partner_set_push gained
// p_alerts with the alert pushes (20261023120000_partner_links_alert_pushes.sql).
const SET_PUSH = 'public.partner_set_push(text, text, text, boolean)'
const PARTNER_RPCS = [
  'public.partner_handoff_create(text)',
  'public.partner_handoff_redeem(text, text, text, text)',
  'public.partner_join(text, text, text, text)',
  'public.partner_leave(text)',
  SET_PUSH,
  'public.partner_view(text, timestamp with time zone)',
]
/** The partner RPCs as CrewLu Cloud had them before the alert pushes. */
const PARTNER_RPCS_BEFORE_ALERTS = PARTNER_RPCS.map((fn) => (fn === SET_PUSH ? 'public.partner_set_push(text, text, text)' : fn))
```

In `supabase/tests/advisors.test.js`, replace:

```js
    assert.deepEqual(await definerExecutableBy(db, 'anon'), [...PARTNER_RPCS, handleNewUser].sort())
    assert.deepEqual(
      await definerExecutableBy(db, 'authenticated'),
      [...PARTNER_RPCS, ...PILOT_RPCS, DELETE_MY_ACCOUNT, handleNewUser].sort(),
    )
```

with:

```js
    assert.deepEqual(await definerExecutableBy(db, 'anon'), [...PARTNER_RPCS_BEFORE_ALERTS, handleNewUser].sort())
    assert.deepEqual(
      await definerExecutableBy(db, 'authenticated'),
      [...PARTNER_RPCS_BEFORE_ALERTS, ...PILOT_RPCS, DELETE_MY_ACCOUNT, handleNewUser].sort(),
    )
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
cd ~/Dev/Duty-alert-pushes/supabase/tests && node --no-maglev --test push.test.js push_service.test.js privileges.test.js advisors.test.js
```

Expected: `ℹ tests 38`, `ℹ pass 29`, `ℹ fail 9`. In `push.test.js`, `column "push_alerts" does not exist` and `function public.partner_set_push(text, text, text, boolean) does not exist`; in `privileges.test.js` and `advisors.test.js`, the lists of functions. Piece 3's second run and undo, now on a database up to piece 3, pass.

- [x] **Step 3: Write the script, with its first change**

Create `supabase/migrations/20261023120000_partner_links_alert_pushes.sql`:

```sql
-- Partner links: alert pushes (crewluve-web docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md, §5).
-- Piece 3 sent every partner device a silent push on every applied write. Now partner_push_claim hands partner-push
-- what each partner saw at the last run and sees now, and partner-push sends a Crewluve that shows alert pushes (1.3
-- and later, which register p_alerts) one alert push per alert, and an older one a silent push only when something it
-- sees changed. A push Apple turns away for a moment waits on a retry list, for that device alone.
--
-- Plan: crewluve-web docs/superpowers/plans/2026-10-23-partner-alert-pushes-1-cloud.md. Tests: supabase/tests/push.test.js,
-- push_service.test.js and alert_pushes.test.js.
-- Run it once, in the SQL editor, after piece 3's script: a second run fails at its first statement and changes nothing.
-- Deploy partner-push's new index.ts right after it, since piece 3's partner-push can't read the new claim.

-- The device's Crewluve shows alert pushes: it said so when it registered its push token (spec §4.1, §6.3). It goes
-- with the token: a token that moves to another device, or that Apple calls dead, takes it along.
alter table private.partner_device_secrets add column push_alerts boolean not null default false;

-- A Crewluve registers its push token with p_alerts true when it shows alert pushes (1.3 and later). A call without
-- it, as 1.2 makes, registers false.
drop function public.partner_set_push(text, text, text);
create function public.partner_set_push(p_key text, p_token text, p_env text, p_alerts boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_device record;
  v_token text := lower(btrim(left(coalesce(p_token, ''), 300)));
begin
  select * into v_device from private.device_for_key(p_key);
  if not found then
    return jsonb_build_object('error', 'sharing_ended');
  end if;
  if v_device.kind <> 'app' or v_token !~ '^[0-9a-f]{64,200}$'
     or p_env is null or p_env not in ('sandbox', 'production') then
    return jsonb_build_object('error', 'invalid_input');
  end if;
  update private.partner_device_secrets set push_token = null, push_env = null, push_alerts = false
   where push_token = v_token and device_id <> v_device.device_id;
  update private.partner_device_secrets
     set push_token = v_token, push_env = p_env, push_alerts = coalesce(p_alerts, false)
   where device_id = v_device.device_id;
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.partner_set_push(text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.partner_set_push(text, text, text, boolean) to anon, authenticated;
```

- [x] **Step 4: Run them to see them pass**

Run:

```bash
cd ~/Dev/Duty-alert-pushes/supabase/tests && node --no-maglev --test push.test.js push_service.test.js privileges.test.js advisors.test.js
```

Expected: `ℹ tests 38`, `ℹ pass 38`, `ℹ fail 0`.

Then the whole suite: partner-push's tests against the real SQL still pass, since nothing it calls has changed yet.

Run:

```bash
cd ~/Dev/Duty-alert-pushes/supabase/tests && npm test
```

Expected: `ℹ tests 238`, `ℹ pass 238`, `ℹ fail 0`.

- [x] **Step 5: Commit**

Run:

```bash
cd ~/Dev/Duty-alert-pushes && git add supabase/migrations/20261023120000_partner_links_alert_pushes.sql supabase/tests/push.test.js supabase/tests/helpers/rpc.js supabase/tests/helpers/db.js supabase/tests/push_service.test.js supabase/tests/privileges.test.js supabase/tests/advisors.test.js && git commit -q -m "feat(partner-links): partner_set_push takes p_alerts, so a Crewluve that shows alert pushes can say so" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit, `feat(partner-links): partner_set_push takes p_alerts, so a Crewluve that shows alert pushes can say so`.

### Task 4: The new run, end to end

**Files:**
- Modify: `supabase/migrations/20261023120000_partner_links_alert_pushes.sql`, `supabase/functions/partner-push/index.ts`
- Modify: `supabase/tests/push_service.test.js`, `supabase/tests/privileges.test.js`, `supabase/tests/partner_push.test.js`

The heart of the plan (spec §5.2–§5.5). Claim hands out what each partner saw and sees; partner-push sends each device its pushes; a push Apple turns away waits on the retry list for its device alone. The SQL and partner-push change together because partner-push's own tests call the real claim: between Steps 4 and 8 those tests fail, as Step 4 says, and the task ends with everything passing.

- [x] **Step 1: Write the SQL's tests**

push_service.test.js's claim, report and check tests change to the new answers. Its setup tests are as Task 3 left them:

Replace the whole of `supabase/tests/push_service.test.js` with:

```js
// Partner-links piece 3, the push service's SQL (supabase/migrations/20261018120000_partner_links_push.sql), as the
// alert pushes left it (20261023120000_partner_links_alert_pushes.sql): the 15-second check, the claim and report
// calls partner-push makes, and the setup's probe. Their specs, which number their sections, are crewluve-web
// docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md and 2026-10-23-partner-alert-pushes-design.md.
// Each test builds its own database, because a claim takes every due pilot in it.
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { asAdmin, asService, freshDb, migrationPath, partnerDbUpTo, read } from './helpers/db.js'
import { connected, createPartner, join, setPush, setStatus } from './helpers/rpc.js'

const migration = migrationPath('20261018120000_partner_links_push.sql')

/** The undo SQL: the indented comment lines under "-- Undo" in the migration's header. */
function undoSql() {
  const lines = read(migration).split('\n')
  const start = lines.findIndex((line) => line.startsWith('-- Undo'))
  assert.ok(start >= 0, 'the migration has an "-- Undo" section')
  const undo = []
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith('--   ')) break
    undo.push(line.slice('--   '.length))
  }
  return undo.join('\n')
}

/** A fresh database for one test, closed when the test ends. */
async function db(t) {
  const fresh = await freshDb()
  t.after(() => fresh.close())
  return fresh
}

/** A database with the partner-links migrations up to piece 3's and no later, for its second run and its undo. */
async function pieceThreeDb(t) {
  const fresh = await partnerDbUpTo('20261018120000_partner_links_push.sql')
  t.after(() => fresh.close())
  return fresh
}

/** A distinct 64-character APNs token for each n. */
const token = (n) => n.toString(16).padStart(2, '0').repeat(32)

/** The password the script keeps in the Vault. */
const password = async (db) =>
  (await asAdmin(db, "select decrypted_secret as s from vault.decrypted_secrets where name = 'partner_push_secret'"))[0]?.s

/** A pilot with one partner whose Crewluve registered `push`, due a push. */
async function duePilot(db, push, env = 'production', alerts) {
  const { pilot, partnerId, invite, key } = await connected(db)
  await setPush(db, key, push, env, alerts)
  await setStatus(db, pilot, { v: 1 }, 1)
  return { pilot, partnerId, invite, key }
}

const isDue = async (db, pilot) =>
  (await asAdmin(db, 'select push_due from public.partner_status where user_id = $1', [pilot]))[0].push_due

/** partner_push_claim, called the way partner-push calls it. */
const claim = (db, secret, probe = false) =>
  asService(db, 'select public.partner_push_claim($1, $2) as r', [secret, probe]).then((rows) => rows[0].r)

/** partner_push_report, called the way partner-push calls it. */
const report = (db, secret, dead = [], retries = [], signing = null) =>
  asService(db, 'select public.partner_push_report($1, $2::text[], $3::jsonb, $4) as r', [
    secret,
    dead,
    JSON.stringify(retries),
    signing,
  ]).then((rows) => rows[0].r)

/** The push tokens of a pilot's partners' devices. */
const tokensOf = async (db, pilot) =>
  (
    await asAdmin(
      db,
      `select s.push_token as t from public.partner_devices d join private.partner_device_secrets s on s.device_id = d.id
        where d.owner_id = $1 and s.push_token is not null order by 1`,
      [pilot],
    )
  ).map((row) => row.t)

/** Each claimed pilot's partners, with their devices' tokens: what partner-push sends to, in claim's order. */
const tokensBy = (pilots) =>
  pilots.map(({ pilot, partners }) => ({ pilot, partners: partners.map((p) => ({ partner: p.partner, tokens: p.devices.map((d) => d.token) })) }))

/** A push on the retry list, as partner-push reports it, until `minutes` from now. */
const retry = (n, minutes, message = { type: 'alert', kind: 'quick-status', sound: true }) => ({
  token: token(n),
  env: 'production',
  message,
  until: new Date(Date.now() + minutes * 60_000).toISOString(),
})

/** The 15-second check, run the way pg_cron runs it. */
const tick = (db) => asAdmin(db, 'select private.partner_push_tick()')

/** What pg_net was asked to send, oldest first. */
const requests = (db) => asAdmin(db, 'select url, headers, body, timeout_milliseconds from net.http_request_queue order by id')

describe('partner_push_claim (piece 3 spec §5.2, alert pushes spec §5.2)', () => {
  test("the script keeps partner-push's password and address in the Vault", async (t) => {
    const d = await db(t)
    assert.match(await password(d), /^[0-9a-f]{64}$/)
    const [{ url }] = await asAdmin(d, "select decrypted_secret as url from vault.decrypted_secrets where name = 'partner_push_url'")
    assert.equal(url, 'https://corxvurxpnrzekbxdgye.supabase.co/functions/v1/partner-push')
  })

  test('it refuses a wrong or missing password, and takes nobody', async (t) => {
    const d = await db(t)
    const { pilot } = await duePilot(d, token(1))
    await assert.rejects(claim(d, 'wrong'), /partner_push_claim: wrong password/)
    await assert.rejects(claim(d, null), /partner_push_claim: wrong password/)
    assert.equal(await isDue(d, pilot), true)
    // With no password in the Vault, a missing one still doesn't match.
    await asAdmin(d, "delete from vault.secrets where name = 'partner_push_secret'")
    await assert.rejects(claim(d, null), /partner_push_claim: wrong password/)
  })

  test("it takes every due pilot once, with each partner's Crewluve tokens", async (t) => {
    const d = await db(t)
    const a = await duePilot(d, token(1), 'sandbox')
    const ipad = await join(d, a.invite, 'app', "Sarah's iPad")
    await setPush(d, ipad.device_key, token(2), 'production', true)
    const b = await duePilot(d, token(3))
    const quiet = await connected(d)
    await setPush(d, quiet.key, token(4))

    const { pilots } = await claim(d, await password(d))
    assert.deepEqual(
      tokensBy(pilots),
      [
        { pilot: a.pilot, partners: [{ partner: a.partnerId, tokens: [token(1), token(2)] }] },
        { pilot: b.pilot, partners: [{ partner: b.partnerId, tokens: [token(3)] }] },
      ].sort((x, y) => x.pilot.localeCompare(y.pilot)),
    )
    const sarah = pilots.find((p) => p.pilot === a.pilot).partners[0]
    assert.deepEqual(sarah.devices, [
      { token: token(1), env: 'sandbox', alerts: false, joined_since: true },
      { token: token(2), env: 'production', alerts: true, joined_since: true },
    ])
    assert.equal(await isDue(d, a.pilot), false)
    assert.equal(await isDue(d, b.pilot), false)
    const [{ stamped }] = await asAdmin(
      d,
      "select count(*)::int as stamped from public.partner_status where last_push_at > now() - interval '1 minute'",
    )
    assert.equal(stamped, 2)
    assert.deepEqual((await claim(d, await password(d))).pilots, [])
  })

  test('the first claim has nothing to compare with; the next compares with what the first handed out', async (t) => {
    const d = await db(t)
    const { pilot, partnerId } = await duePilot(d, token(1))
    const [first] = (await claim(d, await password(d))).pilots
    assert.equal(first.before_at, null)
    assert.match(first.after_at, /^\d{4}-\d\d-\d\dT/)
    assert.deepEqual(first.partners.map(({ partner, before, after, changed }) => ({ partner, before, after, changed })), [
      { partner: partnerId, before: null, after: { v: 1 }, changed: true },
    ])
    const [{ pushed, at }] = await asAdmin(d, 'select pushed_status as pushed, last_push_at as at from public.partner_status')
    assert.deepEqual(pushed, { v: 1 })

    await setStatus(d, pilot, { v: 2 }, 1)
    const [second] = (await claim(d, await password(d))).pilots
    assert.equal(Date.parse(second.before_at), at.getTime(), 'before_at is the last claim')
    assert.deepEqual(
      second.partners.map(({ before, after, changed }) => ({ before, after, changed })),
      [{ before: { v: 1 }, after: { v: 2 }, changed: true }],
    )
  })

  test("a write that changes only lastUpdated and localTimeAtPilot isn't a change", async (t) => {
    const d = await db(t)
    const { pilot, key } = await connected(d)
    await setPush(d, key, token(1))
    await setStatus(d, pilot, { v: 1, lastUpdated: 100, localTimeAtPilot: '9:00 AM' }, 1)
    await claim(d, await password(d))
    await setStatus(d, pilot, { v: 1, lastUpdated: 160, localTimeAtPilot: '9:01 AM' }, 1)
    const [{ partners }] = (await claim(d, await password(d))).pilots
    assert.equal(partners[0].changed, false)
    await setStatus(d, pilot, { v: 2, lastUpdated: 220, localTimeAtPilot: '9:02 AM' }, 1)
    assert.equal((await claim(d, await password(d))).pilots[0].partners[0].changed, true)
  })

  test("each partner gets their own view, trimmed as partner_view trims it: never another partner's entries", async (t) => {
    const d = await db(t)
    const { pilot, partnerId: sarah, key } = await connected(d)
    await setPush(d, key, token(1))
    const max = await createPartner(d, pilot, 'Max')
    await setPush(d, (await join(d, max.invite_token)).device_key, token(2))
    const callMe = { status: 'Call Me', icon: 'phone.fill', expiry: null }
    await setStatus(d, pilot, { v: 1, displayNameByPartner: { [sarah]: 'Dad', [max.id]: 'Pops' }, quickStatusByPartner: { [sarah]: callMe } }, 1)
    const [{ partners }] = (await claim(d, await password(d))).pilots
    const views = Object.fromEntries(partners.map((p) => [p.partner, p.after]))
    assert.deepEqual(views[sarah], { v: 1, displayNameByPartner: { [sarah]: 'Dad' }, quickStatusByPartner: { [sarah]: callMe } })
    assert.deepEqual(views[max.id], { v: 1, displayNameByPartner: { [max.id]: 'Pops' }, quickStatusByPartner: {} })
  })

  test('a quick status or a name for one partner is no change for the others', async (t) => {
    const d = await db(t)
    const { pilot, partnerId: sarah, key } = await connected(d)
    await setPush(d, key, token(1))
    const max = await createPartner(d, pilot, 'Max')
    await setPush(d, (await join(d, max.invite_token)).device_key, token(2))
    await setStatus(d, pilot, { v: 1 }, 1)
    await claim(d, await password(d))
    const callMe = { status: 'Call Me', icon: 'phone.fill', expiry: null }
    await setStatus(d, pilot, { v: 1, displayNameByPartner: { [sarah]: 'Dad' }, quickStatusByPartner: { [sarah]: callMe } }, 1)
    const [{ partners }] = (await claim(d, await password(d))).pilots
    assert.deepEqual(Object.fromEntries(partners.map((p) => [p.partner, p.changed])), { [sarah]: true, [max.id]: false })
  })

  test('only Crewluve app devices with a push token count, and a partner without one is left out', async (t) => {
    const d = await db(t)
    const { pilot, partnerId, invite } = await connected(d)
    const web = await join(d, invite, 'web', 'Safari on Mac')
    // partner_set_push takes app devices only. A web device given a token anyway still doesn't count.
    await asAdmin(d, "update private.partner_device_secrets set push_token = $1, push_env = 'production' where device_id = $2", [
      token(6),
      web.device_id,
    ])
    const ipad = await join(d, invite, 'app', "Sarah's iPad")
    await setPush(d, ipad.device_key, token(5))
    await connected(d) // another pilot's partner, with no token
    const noToken = await createPartner(d, pilot, 'Max')
    await join(d, noToken.invite_token)
    await setStatus(d, pilot, { v: 1 }, 1)
    assert.deepEqual(tokensBy((await claim(d, await password(d))).pilots), [{ pilot, partners: [{ partner: partnerId, tokens: [token(5)] }] }])
  })

  test('a device that joined since the last run says so', async (t) => {
    const d = await db(t)
    const { pilot, invite } = await duePilot(d, token(1))
    await claim(d, await password(d))
    const ipad = await join(d, invite, 'app', "Sarah's iPad")
    await setPush(d, ipad.device_key, token(2), 'production', true)
    await setStatus(d, pilot, { v: 2 }, 1)
    const [{ partners }] = (await claim(d, await password(d))).pilots
    assert.deepEqual(
      partners[0].devices.map(({ token: t, joined_since }) => ({ t, joined_since })),
      [
        { t: token(1), joined_since: false },
        { t: token(2), joined_since: true },
      ],
    )
  })

  test('a change after the claim marks the pilot due again', async (t) => {
    const d = await db(t)
    const { pilot } = await duePilot(d, token(1))
    await claim(d, await password(d))
    await setStatus(d, pilot, { v: 2 }, 1)
    assert.equal(await isDue(d, pilot), true)
    assert.deepEqual(tokensBy((await claim(d, await password(d))).pilots)[0].partners[0].tokens, [token(1)])
  })

  test("the stored signing token comes back while it's under 40 minutes old", async (t) => {
    const d = await db(t)
    const secret = await password(d)
    assert.equal((await claim(d, secret)).signing_token, null)
    await asAdmin(d, "insert into private.partner_push_state (signing_token, made_at) values ('tok', now() - interval '39 minutes')")
    assert.equal((await claim(d, secret)).signing_token, 'tok')
    await asAdmin(d, "update private.partner_push_state set made_at = now() - interval '41 minutes'")
    assert.equal((await claim(d, secret)).signing_token, null)
  })

  test('it takes the pushes waiting to be tried again, leaving out those past their time', async (t) => {
    const d = await db(t)
    const secret = await password(d)
    await report(d, secret, [], [retry(1, 30), retry(2, 50, { type: 'background' })])
    await asAdmin(d, "insert into private.partner_push_retries (token, env, message, until) values ($1, 'sandbox', '{}', now() - interval '1 second')", [token(3)])
    const { pilots, retries } = await claim(d, secret)
    assert.deepEqual(pilots, [])
    assert.deepEqual(
      retries.map(({ token: t, env, message }) => ({ t, env, message })),
      [
        { t: token(1), env: 'production', message: { type: 'alert', kind: 'quick-status', sound: true } },
        { t: token(2), env: 'production', message: { type: 'background' } },
      ],
    )
    assert.equal(Date.parse(retries[0].until) > Date.now() + 29 * 60_000, true)
    assert.deepEqual(await asAdmin(d, 'select token from private.partner_push_retries'), [], 'taken, and the stale one dropped')
    assert.deepEqual((await claim(d, secret)).retries, [])
  })

  test('the probe checks the password and takes nobody', async (t) => {
    const d = await db(t)
    const { pilot } = await duePilot(d, token(1))
    await report(d, await password(d), [], [retry(2, 30)])
    await assert.rejects(claim(d, 'wrong', true), /partner_push_claim: wrong password/)
    assert.deepEqual(await claim(d, await password(d), true), { pilots: [], retries: [], signing_token: null })
    assert.equal(await isDue(d, pilot), true)
    assert.equal((await asAdmin(d, 'select count(*)::int as n from private.partner_push_retries'))[0].n, 1)
  })
})

describe('partner_push_report (piece 3 spec §5.3, alert pushes spec §5.5)', () => {
  test('it refuses a wrong password, and changes nothing', async (t) => {
    const d = await db(t)
    const { pilot } = await duePilot(d, token(1))
    await claim(d, await password(d))
    await assert.rejects(report(d, 'wrong', [token(1)], [retry(1, 30)], 'tok'), /partner_push_report: wrong password/)
    assert.deepEqual(await tokensOf(d, pilot), [token(1)])
    assert.deepEqual(await asAdmin(d, 'select * from private.partner_push_retries'), [])
    assert.deepEqual(await asAdmin(d, 'select * from private.partner_push_state'), [])
  })

  test('it drops dead tokens, wherever they are, with their environment and alert flag', async (t) => {
    const d = await db(t)
    const a = await duePilot(d, token(1), 'production', true)
    const b = await duePilot(d, token(2))
    const c = await duePilot(d, token(3), 'production', true)
    assert.deepEqual(await report(d, await password(d), [token(1), token(2)]), { ok: true })
    assert.deepEqual(await tokensOf(d, a.pilot), [])
    assert.deepEqual(await tokensOf(d, b.pilot), [])
    assert.deepEqual(await tokensOf(d, c.pilot), [token(3)])
    const [{ leftovers }] = await asAdmin(
      d,
      'select count(*)::int as leftovers from private.partner_device_secrets where push_token is null and (push_env is not null or push_alerts)',
    )
    assert.equal(leftovers, 0, 'a dropped token takes its environment and alert flag with it')
  })

  test('it keeps the pushes to try again, and not one already past its time', async (t) => {
    const d = await db(t)
    await duePilot(d, token(1))
    await report(d, await password(d), [], [retry(1, 59), retry(2, -1)])
    assert.deepEqual(
      await asAdmin(d, "select token, env, message, until > now() + interval '58 minutes' as later from private.partner_push_retries"),
      [{ token: token(1), env: 'production', message: { type: 'alert', kind: 'quick-status', sound: true }, later: true }],
    )
  })

  test('it no longer marks pilots due again: the retry list takes that over', async (t) => {
    const d = await db(t)
    const { pilot } = await duePilot(d, token(1))
    await claim(d, await password(d))
    await report(d, await password(d), [], [retry(1, 30)])
    assert.equal(await isDue(d, pilot), false)
  })

  test('it keeps a new signing token, in one row, and claim hands it out', async (t) => {
    const d = await db(t)
    const secret = await password(d)
    await asAdmin(d, "insert into private.partner_push_state (signing_token, made_at) values ('old', now() - interval '2 hours')")
    await report(d, secret, [], [], 'first')
    await report(d, secret, [], [], 'second')
    await report(d, secret, [], [], null)
    assert.deepEqual(
      await asAdmin(d, "select signing_token, made_at > now() - interval '1 minute' as fresh from private.partner_push_state"),
      [{ signing_token: 'second', fresh: true }],
    )
    assert.equal((await claim(d, secret)).signing_token, 'second')
  })
})

describe('the 15-second check (piece 3 spec §5.1)', () => {
  test('it calls partner-push, with the password, when a pilot with a Crewluve token is due', async (t) => {
    const d = await db(t)
    const { pilot } = await duePilot(d, token(1))
    await tick(d)
    assert.deepEqual(await requests(d), [
      {
        url: 'https://corxvurxpnrzekbxdgye.supabase.co/functions/v1/partner-push',
        headers: { 'content-type': 'application/json', 'x-partner-push-secret': await password(d) },
        body: {},
        timeout_milliseconds: 30000,
      },
    ])
    assert.equal(await isDue(d, pilot), true, 'partner-push takes them, not the check')
  })

  test('one call covers every due pilot, and nothing due means no call', async (t) => {
    const d = await db(t)
    await tick(d)
    assert.deepEqual(await requests(d), [])
    await duePilot(d, token(1))
    await duePilot(d, token(2))
    await tick(d)
    assert.equal((await requests(d)).length, 1)
  })

  test('it clears due pilots nobody can be woken for, counting their change as handled, and calls nobody', async (t) => {
    const d = await db(t)
    const webOnly = await connected(d, { kind: 'web' })
    // partner_set_push takes app devices only. A web device given a token anyway still can't be woken.
    await asAdmin(d, "update private.partner_device_secrets set push_token = $1, push_env = 'production' where device_id = $2", [
      token(7),
      webOnly.deviceId,
    ])
    await setStatus(d, webOnly.pilot, { v: 1 }, 1)
    const noToken = await connected(d)
    await setStatus(d, noToken.pilot, { v: 1 }, 1)
    await tick(d)
    assert.equal(await isDue(d, webOnly.pilot), false)
    assert.equal(await isDue(d, noToken.pilot), false)
    assert.deepEqual(await requests(d), [])
    assert.deepEqual(
      await asAdmin(d, "select pushed_status as pushed, last_push_at > now() - interval '1 minute' as handled from public.partner_status"),
      [
        { pushed: { v: 1 }, handled: true },
        { pushed: { v: 1 }, handled: true },
      ],
    )
  })

  test('a Crewluve that registers later is compared with the last change, not an older one', async (t) => {
    const d = await db(t)
    const { pilot, key } = await connected(d)
    await setStatus(d, pilot, { v: 1 }, 1)
    await tick(d)
    await setStatus(d, pilot, { v: 2 }, 1)
    await tick(d)
    await setPush(d, key, token(1), 'production', true)
    await setStatus(d, pilot, { v: 3 }, 1)
    const [{ partners }] = (await claim(d, await password(d))).pilots
    assert.deepEqual(partners.map(({ before, after }) => ({ before, after })), [{ before: { v: 2 }, after: { v: 3 } }])
  })

  test('it calls partner-push while a push waits to be tried again, with nobody due', async (t) => {
    const d = await db(t)
    await report(d, await password(d), [], [retry(1, 30)])
    await tick(d)
    assert.equal((await requests(d)).length, 1)
  })

  test('pg_cron runs it every 15 seconds, and a clean-up once a day', async (t) => {
    const d = await db(t)
    assert.deepEqual(await asAdmin(d, "select jobname, schedule from cron.job where jobname like 'partner-push%' order by jobname"), [
      { jobname: 'partner-push', schedule: '15 seconds' },
      { jobname: 'partner-push-history', schedule: '17 4 * * *' },
    ])
    const [{ command }] = await asAdmin(d, "select command from cron.job where jobname = 'partner-push'")
    assert.equal(command, 'select private.partner_push_tick()')
  })

  test("the clean-up keeps a day of this piece's history, and leaves other jobs' alone", async (t) => {
    const d = await db(t)
    const [{ check }] = await asAdmin(d, "select jobid::int as check from cron.job where jobname = 'partner-push'")
    const [{ history }] = await asAdmin(d, "select jobid::int as history from cron.job where jobname = 'partner-push-history'")
    await asAdmin(
      d,
      `insert into cron.job_run_details (jobid, status, end_time)
       values ($1, 'succeeded', now() - interval '25 hours'), ($1, 'succeeded', now() - interval '23 hours'),
              ($2, 'succeeded', now() - interval '25 hours'), (999, 'succeeded', now() - interval '2 days')`,
      [check, history],
    )
    const [{ command }] = await asAdmin(d, "select command from cron.job where jobname = 'partner-push-history'")
    await d.exec(command)
    assert.deepEqual(
      await asAdmin(d, "select jobid::int as job, end_time > now() - interval '1 day' as recent from cron.job_run_details order by runid"),
      [
        { job: check, recent: true },
        { job: 999, recent: false },
      ],
    )
  })
})

describe("piece 3's setup check, a second run and the undo (piece 3 spec §9)", () => {
  test("the probe asks partner-push to try Apple's test service", async (t) => {
    const d = await db(t)
    const [{ request }] = await asAdmin(d, 'select private.partner_push_probe()::int as request')
    assert.equal(request, 1)
    assert.deepEqual(await requests(d), [
      {
        url: 'https://corxvurxpnrzekbxdgye.supabase.co/functions/v1/partner-push',
        headers: { 'content-type': 'application/json', 'x-partner-push-secret': await password(d) },
        body: { probe: true },
        timeout_milliseconds: 30000,
      },
    ])
  })

  test('running the script a second time fails, and changes nothing', async (t) => {
    const d = await pieceThreeDb(t)
    const state = () =>
      asAdmin(
        d,
        `select (select string_agg(name || '=' || secret, ',' order by name) from vault.secrets) as secrets,
                (select string_agg(jobname || '@' || schedule, ',' order by jobname) from cron.job) as jobs`,
      )
    const before = await state()
    await assert.rejects(d.exec(read(migration)), /already exists/)
    assert.deepEqual(await state(), before)
  })

  test('the undo in its header removes everything it added, and none of piece 1', async (t) => {
    const d = await pieceThreeDb(t)
    await d.exec(undoSql())
    const [left] = await asAdmin(
      d,
      `select (select count(*)::int from pg_proc where proname in ('partner_push_claim', 'partner_push_report',
                'partner_push_tick', 'partner_push_probe', 'call_partner_push', 'require_push_password', 'push_secret')) as functions,
              to_regclass('private.partner_push_state') is not null as state,
              (select count(*)::int from vault.secrets where name like 'partner_push%') as secrets,
              (select count(*)::int from cron.job where jobname like 'partner-push%') as jobs,
              to_regprocedure('public.partner_set_push(text, text, text)') is not null as piece1_rpc,
              to_regclass('private.partner_device_secrets') is not null as piece1_table`,
    )
    assert.deepEqual(left, { functions: 0, state: false, secrets: 0, jobs: 0, piece1_rpc: true, piece1_table: true })
  })
})
```

In `supabase/tests/privileges.test.js`, replace:

```js
  // partner-push's calls (piece 3): the service role only, which partner-push uses.
  const SERVICE_RPCS = ['partner_push_claim(text, boolean)', 'partner_push_report(text, text[], uuid[], text)']
  const PUBLIC_TABLES = ['partner_status', 'partners', 'partner_devices']
  const PRIVATE_TABLES = ['partner_device_secrets', 'partner_handoffs', 'partner_redeem_failures', 'partner_push_state']
```

with:

```js
  // partner-push's calls (piece 3, as the alert pushes left them): the service role only, which partner-push uses.
  const SERVICE_RPCS = ['partner_push_claim(text, boolean)', 'partner_push_report(text, text[], jsonb, text)']
  const PUBLIC_TABLES = ['partner_status', 'partners', 'partner_devices']
  const PRIVATE_TABLES = [
    'partner_device_secrets',
    'partner_handoffs',
    'partner_redeem_failures',
    'partner_push_state',
    'partner_push_retries',
  ]
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
cd ~/Dev/Duty-alert-pushes/supabase/tests && node --no-maglev --test push_service.test.js privileges.test.js
```

Expected: `ℹ tests 35`, `ℹ pass 14`, `ℹ fail 21`. Claim still hands out piece 3's answer, so the new tests find no `pilots`, and the new report and `relation "private.partner_push_retries" does not exist` aren't there yet.

- [x] **Step 3: Write the SQL**

The rest of the script: what claim compares with, the retry list, the comparison, the partners claim hands out, claim, report, and the check.

Add to the end of `supabase/migrations/20261023120000_partner_links_alert_pushes.sql`, after a blank line:

```sql
-- The summary the push service last handled each pilot's change with, at last_push_at (spec §5.1): partner_push_claim
-- compares the next change with it. Null until this script's first claim or clearing of that pilot.
alter table public.partner_status add column pushed_status jsonb;

-- Pushes to try again (spec §5.5), one per device: its token and environment, what it says (partner-push's message),
-- and until when, which is when Apple would have dropped it anyway.
create table private.partner_push_retries (
  id bigint generated always as identity primary key,
  token text not null,
  env text not null check (env in ('sandbox', 'production')),
  message jsonb not null,
  until timestamptz not null
);
alter table private.partner_push_retries enable row level security;

-- What a partner's view is compared by, to tell whether it changed (spec §5.2): all of it but the two fields every
-- write changes, with an empty map of per-partner entries read as none. partner_view trims a map to {} for a partner
-- with no entry in it, so a quick status or a name sent to someone else changes nothing for the others.
create function private.push_compared(p_view jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select (p_view - 'lastUpdated' - 'localTimeAtPilot') || jsonb_build_object(
           'displayNameByPartner', nullif(p_view -> 'displayNameByPartner', '{}'::jsonb),
           'quickStatusByPartner', nullif(p_view -> 'quickStatusByPartner', '{}'::jsonb))
$$;
revoke all on function private.push_compared(jsonb) from public, anon, authenticated;

-- For one claimed pilot (spec §5.2): each of their partners with a Crewluve that has a push token, with what that
-- partner saw at the last run (p_before) and sees now (p_after), each trimmed as partner_view trims it, so partner-push
-- never sees another partner's entries; whether it changed for them; and each device's token, environment, whether
-- it shows alert pushes, and whether it joined since the last run.
create function private.push_partners(p_pilot uuid, p_before jsonb, p_after jsonb, p_before_at timestamptz) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'partner', p.id,
           'before', b.view,
           'after', a.view,
           'changed', private.push_compared(b.view) is distinct from private.push_compared(a.view),
           'devices', devices.list
         ) order by p.id), '[]'::jsonb)
    from public.partners p
    cross join lateral (select private.trim_status_for(p_before, p.id) as view) b
    cross join lateral (select private.trim_status_for(p_after, p.id) as view) a
    cross join lateral (
      select jsonb_agg(jsonb_build_object(
               'token', s.push_token,
               'env', s.push_env,
               'alerts', s.push_alerts,
               'joined_since', p_before_at is null or d.created_at > p_before_at
             ) order by s.push_token) as list
        from public.partner_devices d
        join private.partner_device_secrets s on s.device_id = d.id
       where d.partner_id = p.id and d.kind = 'app' and s.push_token is not null
    ) devices
   where p.owner_id = p_pilot and devices.list is not null
$$;
revoke all on function private.push_partners(uuid, jsonb, jsonb, timestamptz) from public, anon, authenticated;

-- partner-push's first call each run (spec §5.2). In one statement it takes every due pilot: it clears their mark and
-- moves pushed_status and last_push_at on to their summary and now, so each change is handled by one run, and the
-- next is compared with this one. For each, it hands out their partners (private.push_partners), with the summary
-- and the moment they're compared with: the last run's. Postgres 17 has no OLD in RETURNING, so the update reads the
-- row's previous values through a join to itself. Then it takes the pushes waiting to be tried again, leaving out
-- those Apple would have dropped by now. With them comes the stored signing token, while it's under 40 minutes old.
-- With p_probe (the setup's check, piece 3 spec §9) it only checks the password and returns the signing token.
create or replace function public.partner_push_claim(p_secret text, p_probe boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_pilots jsonb := '[]'::jsonb;
  v_retries jsonb := '[]'::jsonb;
begin
  perform private.require_push_password(p_secret, 'partner_push_claim');
  if not coalesce(p_probe, false) then
    with due as (
      update public.partner_status ps
         set push_due = false, last_push_at = now(), pushed_status = ps.status
        from public.partner_status prev
       where ps.push_due and prev.user_id = ps.user_id
      returning ps.user_id, ps.status, prev.pushed_status as before_status, prev.last_push_at as before_at
    )
    select coalesce(jsonb_agg(jsonb_build_object(
             'pilot', due.user_id,
             'before_at', due.before_at,
             'after_at', now(),
             'partners', private.push_partners(due.user_id, due.before_status, due.status, due.before_at)
           ) order by due.user_id), '[]'::jsonb)
      into v_pilots
      from due;
    with taken as (
      delete from private.partner_push_retries returning token, env, message, until
    )
    select coalesce(jsonb_agg(jsonb_build_object('token', token, 'env', env, 'message', message, 'until', until)
                    order by until, token), '[]'::jsonb)
      into v_retries
      from taken
     where until > now();
  end if;
  return jsonb_build_object(
    'pilots', v_pilots,
    'retries', v_retries,
    'signing_token', (select signing_token from private.partner_push_state where made_at > now() - interval '40 minutes')
  );
end
$$;

-- partner-push's last call each run (spec §5.5): drops the tokens Apple called dead, wherever they are, puts the
-- pushes to try again on the retry list, each with its device's token and environment, what it says, and until when,
-- leaving out any already past that, and keeps a new signing token.
drop function public.partner_push_report(text, text[], uuid[], text);
create function public.partner_push_report(p_secret text, p_dead_tokens text[], p_retries jsonb, p_signing_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_push_password(p_secret, 'partner_push_report');
  update private.partner_device_secrets set push_token = null, push_env = null, push_alerts = false
   where push_token = any (coalesce(p_dead_tokens, '{}'));
  insert into private.partner_push_retries (token, env, message, until)
  select r ->> 'token', r ->> 'env', r -> 'message', (r ->> 'until')::timestamptz
    from jsonb_array_elements(coalesce(p_retries, '[]'::jsonb)) as r
   where (r ->> 'until')::timestamptz > now();
  if p_signing_token is not null then
    insert into private.partner_push_state (signing_token, made_at) values (p_signing_token, now())
    on conflict (only_row) do update set signing_token = excluded.signing_token, made_at = excluded.made_at;
  end if;
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.partner_push_report(text, text[], jsonb, text) from public, anon, authenticated;
grant execute on function public.partner_push_report(text, text[], jsonb, text) to service_role;

-- The 15-second check (piece 3 spec §5.1), which pg_cron runs as postgres. A due pilot none of whose partners has a
-- Crewluve with a push token has nobody to wake: their mark is cleared here, and their summary counts as handled, so
-- a Crewluve that registers later is compared with this change, not an older one (spec §5.2). If anyone is still
-- due, or a push is waiting to be tried again, it calls partner-push.
create or replace function private.partner_push_tick() returns void
language plpgsql set search_path = '' as $$
begin
  update public.partner_status ps set push_due = false, last_push_at = now(), pushed_status = ps.status
   where ps.push_due
     and not exists (
       select 1
         from public.partner_devices d
         join private.partner_device_secrets s on s.device_id = d.id
        where d.owner_id = ps.user_id and d.kind = 'app' and s.push_token is not null
     );
  if exists (select 1 from public.partner_status where push_due)
     or exists (select 1 from private.partner_push_retries) then
    perform private.call_partner_push('{}'::jsonb);
  end if;
end
$$;
```

- [x] **Step 4: Run the SQL's tests to see them pass, and partner-push's to see which wait for Steps 5–7**

Run:

```bash
cd ~/Dev/Duty-alert-pushes/supabase/tests && node --no-maglev --test push_service.test.js privileges.test.js push.test.js advisors.test.js
```

Expected: `ℹ tests 46`, `ℹ pass 46`, `ℹ fail 0`.

Run:

```bash
cd ~/Dev/Duty-alert-pushes/supabase/tests && node --no-maglev --test partner_push.test.js
```

Expected: `ℹ tests 40`, `ℹ pass 37`, `ℹ fail 3`: the three tests against the real claim. Piece 3's partner-push looks for the devices piece 3's claim handed out, which are gone (`error: 'TypeError'`), and its probe calls the old report (`report answered 404`).

- [x] **Step 5: Write partner-push's tests**

The parts, what each device gets, the run, and the tests against the real SQL, in the order they appear in the file:

In `supabase/tests/partner_push.test.js`, replace:

```js
// partner-push (supabase/functions/partner-push/index.ts), run under Node. Stand-ins take the place of Apple and of
// the database's claim and report, and the last tests run it against the real ones in PGlite. Spec:
// crewluve-web docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md, §6 and §7.
```

with:

```js
// partner-push (supabase/functions/partner-push/index.ts), run under Node. Stand-ins take the place of Apple and of
// the database's claim and report, and the last tests run it against the real ones in PGlite. Specs:
// crewluve-web docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md, §6 and §7, and
// 2026-10-23-partner-alert-pushes-design.md, §5.
```

In `supabase/tests/partner_push.test.js`, replace:

```js
import {
  ALERT_KINDS,
  APNS_HOSTS,
  AT_ONCE,
  PUSH_BODY,
  PUSH_TIMEOUT_MS,
  RPC_TIMEOUT_MS,
  alertsFor,
  base64url,
  configFromEnv,
  effectiveDelay,
  homeArrival,
  importKey,
  legsDiffer,
  makeHandler,
  outcome,
  pemBytes,
  pushRequest,
  shownQuickStatus,
  signingToken,
} from '../functions/partner-push/index.ts'
```

with:

```js
import {
  ALERT_KINDS,
  ALERT_LINE,
  APNS_HOSTS,
  AT_ONCE,
  PUSH_BODY,
  PUSH_LIFETIME_S,
  PUSH_TIMEOUT_MS,
  RPC_TIMEOUT_MS,
  alertsFor,
  base64url,
  configFromEnv,
  effectiveDelay,
  homeArrival,
  importKey,
  legsDiffer,
  makeHandler,
  messageBody,
  outcome,
  pemBytes,
  pushRequest,
  pushesFor,
  shownQuickStatus,
  signingToken,
} from '../functions/partner-push/index.ts'
```

In `supabase/tests/partner_push.test.js`, replace:

```js
  test('a push goes to the service its device was built for, silently, at low priority, for an hour', () => {
    const sandbox = pushRequest({ pilot: 'p', token: TOKEN, env: 'sandbox' }, 'jwt', TOPIC, 1_700_000_000)
```

with:

```js
  test('a silent push goes to the service its device was built for, at low priority, until it expires', () => {
    const background = { type: 'background' }
    const sandbox = pushRequest({ token: TOKEN, env: 'sandbox', message: background, expires: 1_700_003_600 }, 'jwt', TOPIC)
```

In `supabase/tests/partner_push.test.js`, replace:

```js
    const live = pushRequest({ pilot: 'p', token: TOKEN, env: 'production' }, 'jwt', TOPIC, 1_700_000_000)
    assert.equal(live.url, `https://api.push.apple.com/3/device/${TOKEN}`)
    assert.deepEqual(APNS_HOSTS, { production: 'https://api.push.apple.com', sandbox: 'https://api.sandbox.push.apple.com' })
  })
```

with:

```js
    const live = pushRequest({ token: TOKEN, env: 'production', message: background, expires: 1_700_003_600 }, 'jwt', TOPIC)
    assert.equal(live.url, `https://api.push.apple.com/3/device/${TOKEN}`)
    assert.deepEqual(APNS_HOSTS, { production: 'https://api.push.apple.com', sandbox: 'https://api.sandbox.push.apple.com' })
    assert.equal(PUSH_LIFETIME_S, 3600)
  })

  test('an alert push: top priority, with only its kind, the line for when the helper does not run, and a sound unless it has none', () => {
    const quick = { type: 'alert', kind: 'quick-status', sound: true }
    assert.deepEqual(pushRequest({ token: TOKEN, env: 'production', message: quick, expires: 1_700_003_600 }, 'jwt', TOPIC), {
      url: `https://api.push.apple.com/3/device/${TOKEN}`,
      init: {
        method: 'POST',
        headers: {
          authorization: 'bearer jwt',
          'apns-topic': TOPIC,
          'apns-push-type': 'alert',
          'apns-priority': '10',
          'apns-expiration': '1700003600',
          'content-type': 'application/json',
        },
        body: '{"aps":{"alert":{"body":"New update"},"mutable-content":1,"sound":"default"},"kind":"quick-status"}',
      },
    })
    assert.equal(ALERT_LINE, 'New update')
    assert.equal(messageBody({ ...quick, sound: false }), '{"aps":{"alert":{"body":"New update"},"mutable-content":1},"kind":"quick-status"}')
  })
```

In `supabase/tests/partner_push.test.js`, replace:

```js
const SUPABASE_URL = 'https://cloud.test'
```

with:

```js
/** A Crewluve device n, as partner_push_claim hands it out. */
const claimedDevice = (n, alerts = false, env = 'production', joined_since = false) => ({
  token: n.toString(16).padStart(2, '0').repeat(32),
  env,
  alerts,
  joined_since,
})

/** A claimed pilot with partner A, whose view went from before to after: by default, a 45-minute delay. */
const claimedPilot = (devices, { before = viewOf({}), after = viewOf({ lastUpdated: 1792605660, flightDelayMinutes: 45 }), changed = true } = {}) => ({
  pilot: 'pilot-1',
  before_at: new Date(1792605615 * 1000).toISOString(),
  after_at: new Date(1792605675 * 1000).toISOString(),
  partners: [{ partner: A, before, after, changed, devices }],
})

describe('what each device gets (alert pushes spec §5.2)', () => {
  const EXPIRES = 1_792_609_275
  const background = { type: 'background' }

  test('a Crewluve that shows alerts gets one alert push per alert, in order, and an older one a silent push', () => {
    const after = viewOf({ lastUpdated: 1792605660, flightDelayMinutes: 45, displayStatus: 'In Flight' })
    assert.deepEqual(pushesFor(claimedPilot([claimedDevice(1, true), claimedDevice(2, false, 'sandbox')], { after }), EXPIRES), [
      { token: claimedDevice(1).token, env: 'production', message: { type: 'alert', kind: 'delayed', sound: true }, expires: EXPIRES },
      { token: claimedDevice(1).token, env: 'production', message: { type: 'alert', kind: 'took-off', sound: true }, expires: EXPIRES },
      { token: claimedDevice(2).token, env: 'sandbox', message: background, expires: EXPIRES },
    ])
  })

  test("a change that alerts nothing: only an older Crewluve's silent push; no change: nothing at all", () => {
    const devices = [claimedDevice(1, true), claimedDevice(2)]
    const turn = viewOf({ lastUpdated: 1792605660, displayStatus: 'Turn' })
    assert.deepEqual(pushesFor(claimedPilot(devices, { after: turn }), EXPIRES), [
      { token: claimedDevice(2).token, env: 'production', message: background, expires: EXPIRES },
    ])
    assert.deepEqual(pushesFor(claimedPilot(devices, { after: viewOf({ lastUpdated: 1792605660 }), changed: false }), EXPIRES), [])
  })

  test('a Crewluve that joined since the last run gets no alerts', () => {
    assert.deepEqual(pushesFor(claimedPilot([claimedDevice(1, true, 'production', true)]), EXPIRES), [])
  })

  test("with nothing to compare with, nobody's alerted, and an older Crewluve still gets its silent push", () => {
    const pilot = { ...claimedPilot([claimedDevice(1, true), claimedDevice(2)], { before: null }), before_at: null }
    assert.deepEqual(pushesFor(pilot, EXPIRES), [{ token: claimedDevice(2).token, env: 'production', message: background, expires: EXPIRES }])
  })

  test('every shared case, as the alert pushes a Crewluve that shows them gets', () => {
    for (const c of cases.cases) {
      const pilot = {
        pilot: 'pilot-1',
        before_at: c.beforeAt === null ? null : new Date(c.beforeAt * 1000).toISOString(),
        after_at: new Date(c.afterAt * 1000).toISOString(),
        partners: [{ partner: c.partner, before: viewOf(c.before), after: viewOf(c.after), changed: true, devices: [claimedDevice(1, true)] }],
      }
      assert.deepEqual(
        pushesFor(pilot, EXPIRES).map(({ message }) => message),
        c.alerts.map(({ kind, sound }) => ({ type: 'alert', kind, sound })),
        c.name,
      )
    }
  })
})

const SUPABASE_URL = 'https://cloud.test'
```

In `supabase/tests/partner_push.test.js`, replace:

```js
/** Device n's Crewluve, as claim hands it out. */
const device = (n, env = 'production', pilot = `pilot-${n}`) => ({ pilot, token: n.toString(16).padStart(2, '0').repeat(32), env })
```

with:

```js
/** Device n's Crewluve, with its pilot: an older one, which gets silent pushes, unless it shows alerts. */
const device = (n, env = 'production', pilot = `pilot-${n}`, alerts = false) => ({
  pilot,
  token: n.toString(16).padStart(2, '0').repeat(32),
  env,
  alerts,
})

/**
 * What claim hands out for these devices: each of their pilots, with one partner whose view changed in a way that
 * makes no alert. So each older Crewluve gets a silent push, and each newer one nothing.
 */
const claimedFor = (devices) =>
  [...new Set(devices.map((d) => d.pilot))].map((pilot) => ({
    pilot,
    before_at: '2023-11-14T22:13:05Z',
    after_at: '2023-11-14T22:13:20Z',
    partners: [
      {
        partner: `partner-of-${pilot}`,
        before: { v: 1, lastUpdated: 1 },
        after: { v: 2, lastUpdated: 2 },
        changed: true,
        devices: devices.filter((d) => d.pilot === pilot).map(({ token, env, alerts }) => ({ token, env, alerts, joined_since: false })),
      },
    ],
  }))

/** The silent push a run at NOW_MS sends device d. */
const silent = (d) => ({ token: d.token, env: d.env, message: { type: 'background' }, expires: NOW_MS / 1000 + PUSH_LIFETIME_S })
```

In `supabase/tests/partner_push.test.js`, replace:

```js
/**
 * claim's and report's stand-ins. Like the real ones, they refuse any password but SECRET with SQLSTATE 28000, which
 * PostgREST answers with 403. claim hands out devices and signing; report answers with reportStatus.
 */
const cloud =
  ({ devices = [], signing = null, reportStatus = 200 } = {}) =>
  (name, args) => {
    if (args.p_secret !== SECRET) return { status: 403, body: { code: '28000', message: `${name}: wrong password` } }
    if (name === 'partner_push_claim') return { body: { devices, signing_token: signing } }
```

with:

```js
/**
 * claim's and report's stand-ins. Like the real ones, they refuse any password but SECRET with SQLSTATE 28000, which
 * PostgREST answers with 403. claim hands out the pilots (claimedFor's devices, unless they're given), the pushes to
 * try again and signing; report answers with reportStatus.
 */
const cloud =
  ({ devices = [], pilots = claimedFor(devices), retries = [], signing = null, reportStatus = 200 } = {}) =>
  (name, args) => {
    if (args.p_secret !== SECRET) return { status: 403, body: { code: '28000', message: `${name}: wrong password` } }
    if (name === 'partner_push_claim') return { body: { pilots, retries, signing_token: signing } }
```

In `supabase/tests/partner_push.test.js`, replace:

```js
const nothing = { sent: 0, dead: 0, retried: 0, failed: 0 }
```

with:

```js
const nothing = { sent: 0, alerts: 0, dead: 0, retried: 0, failed: 0 }
```

In `supabase/tests/partner_push.test.js`, replace:

```js
      devices.map((d) => sent(pushRequest(d, stored, TOPIC, NOW_MS / 1000))),
```

with:

```js
      devices.map((d) => sent(pushRequest(silent(d), stored, TOPIC))),
```

In `supabase/tests/partner_push.test.js`, replace:

```js
      claims: { iss: 'TEAM456', iat: NOW_MS / 1000 },
    })
    assert.deepEqual(fake.calls('partner_push_report'), [
      { p_secret: SECRET, p_dead_tokens: [], p_retry_pilots: [], p_signing_token: jwt },
    ])
```

with:

```js
      claims: { iss: 'TEAM456', iat: NOW_MS / 1000 },
    })
    assert.deepEqual(fake.calls('partner_push_report'), [
      { p_secret: SECRET, p_dead_tokens: [], p_retries: [], p_signing_token: jwt },
    ])
```

In `supabase/tests/partner_push.test.js`, replace:

```js
  test("Apple's answers (§7): dead tokens are reported once each, temporary failures' pilots once each, the rest logged", async () => {
```

with:

```js
  test("Apple's answers (§7): dead tokens are reported once each, temporary failures as pushes to try again, the rest logged", async () => {
```

In `supabase/tests/partner_push.test.js`, replace:

```js
      body: { sent: 1, dead: 2, retried: 4, failed: 2 },
```

with:

```js
      body: { ...nothing, sent: 1, dead: 2, retried: 4, failed: 2 },
```

In `supabase/tests/partner_push.test.js`, replace:

```js
    assert.deepEqual(fake.calls('partner_push_report'), [
      {
        p_secret: SECRET,
        p_dead_tokens: [devices[1].token, devices[2].token],
        p_retry_pilots: ['bob', 'dee', 'eve'],
        p_signing_token: null,
      },
    ])
```

with:

```js
    assert.deepEqual(fake.calls('partner_push_report'), [
      {
        p_secret: SECRET,
        p_dead_tokens: [devices[1].token, devices[2].token],
        p_retries: [devices[3], devices[4], devices[7], devices[8]].map((d) => {
          const { token, env, message, expires } = silent(d)
          return { token, env, message, until: new Date(expires * 1000).toISOString() }
        }),
        p_signing_token: null,
      },
    ])
```

In `supabase/tests/partner_push.test.js`, replace:

```js
    assert.match(log, /1 sent, 2 dead, 4 retried, 2 failed/)
```

with:

```js
    assert.match(log, /1 sent \(0 as alerts\), 2 dead, 4 retried, 2 failed/)
```

In `supabase/tests/partner_push.test.js`, replace:

```js
    assert.deepEqual(reported, { p_secret: SECRET, p_dead_tokens: [], p_retry_pilots: [], p_signing_token: reported.p_signing_token })
```

with:

```js
    assert.deepEqual(reported, { p_secret: SECRET, p_dead_tokens: [], p_retries: [], p_signing_token: reported.p_signing_token })
```

In `supabase/tests/partner_push.test.js`, replace:

```js
    assert.deepEqual(fake.calls('partner_push_report'), [
      { p_secret: SECRET, p_dead_tokens: [], p_retry_pilots: ['pilot-1', 'pilot-2'], p_signing_token: null },
    ])
```

with:

```js
    const tryAgain = [device(1), device(2)].map((d) => {
      const { token, env, message, expires } = silent(d)
      return { token, env, message, until: new Date(expires * 1000).toISOString() }
    })
    assert.deepEqual(fake.calls('partner_push_report'), [
      { p_secret: SECRET, p_dead_tokens: [], p_retries: tryAgain, p_signing_token: null },
    ])
```

In `supabase/tests/partner_push.test.js`, replace:

```js
    assert.match(log, /1 sent, 1 dead, 1 retried, 1 failed/)
```

with:

```js
    assert.match(log, /1 sent \(0 as alerts\), 1 dead, 1 retried, 1 failed/)
```

In `supabase/tests/partner_push.test.js`, replace:

```js
      assert.ok(!log.includes(secret), `the log has ${secret}`)
    }
  })
})
```

with:

```js
      assert.ok(!log.includes(secret), `the log has ${secret}`)
    }
  })

  test('a Crewluve that shows alerts gets its alert pushes, and the answer and the log count them', async () => {
    const lines = []
    const fake = standIns({ rpc: cloud({ pilots: [claimedPilot([claimedDevice(1, true), claimedDevice(2)])], signing: stored }) })
    assert.deepEqual(await run(fake.fetch, { log: (line) => lines.push(line) }), { status: 200, body: { ...nothing, sent: 2, alerts: 1 } })
    const expires = NOW_MS / 1000 + PUSH_LIFETIME_S
    const delayed = { type: 'alert', kind: 'delayed', sound: true }
    assert.deepEqual(fake.pushes().map(sent), [
      sent(pushRequest({ token: claimedDevice(1).token, env: 'production', message: delayed, expires }, stored, TOPIC)),
      sent(pushRequest({ token: claimedDevice(2).token, env: 'production', message: { type: 'background' }, expires }, stored, TOPIC)),
    ])
    assert.match(lines.join('\n'), /2 sent \(1 as alerts\), 0 dead, 0 retried, 0 failed/)
  })

  test('nothing new for anyone: it sends nothing, makes no signing token, reports nothing, and its log says so', async () => {
    const lines = []
    const quiet = claimedPilot([claimedDevice(1, true), claimedDevice(2)], { after: viewOf({ lastUpdated: 1792605660 }), changed: false })
    const fake = standIns({ rpc: cloud({ pilots: [quiet] }) })
    assert.deepEqual(await run(fake.fetch, { log: (line) => lines.push(line) }), { status: 200, body: nothing })
    assert.deepEqual(fake.pushes(), [])
    assert.deepEqual(fake.calls('partner_push_report'), [])
    assert.deepEqual(lines, ['partner-push: nothing new to send'])
  })

  test('the pushes waiting to be tried again go out once more, each until its own time', async () => {
    const message = { type: 'alert', kind: 'quick-status', sound: false }
    const until = new Date(NOW_MS + 20 * 60_000).toISOString()
    const fake = standIns({ rpc: cloud({ retries: [{ token: claimedDevice(3).token, env: 'sandbox', message, until }], signing: stored }) })
    assert.deepEqual((await run(fake.fetch)).body, { ...nothing, sent: 1, alerts: 1 })
    assert.deepEqual(fake.pushes().map(sent), [
      sent(pushRequest({ token: claimedDevice(3).token, env: 'sandbox', message, expires: NOW_MS / 1000 + 20 * 60 }, stored, TOPIC)),
    ])
  })

  test('a push Apple turns away for a moment waits on the retry list for its device alone, saying the same, until it expires', async () => {
    const apple = ({ token }) => (token === claimedDevice(2).token ? { status: 503, reason: 'ServiceUnavailable' } : { status: 200 })
    const fake = standIns({ rpc: cloud({ pilots: [claimedPilot([claimedDevice(1, true), claimedDevice(2, true)])], signing: stored }), apple })
    assert.deepEqual((await run(fake.fetch)).body, { ...nothing, sent: 1, alerts: 1, retried: 1 })
    assert.deepEqual(fake.calls('partner_push_report'), [
      {
        p_secret: SECRET,
        p_dead_tokens: [],
        p_retries: [
          {
            token: claimedDevice(2).token,
            env: 'production',
            message: { type: 'alert', kind: 'delayed', sound: true },
            until: new Date(NOW_MS + PUSH_LIFETIME_S * 1000).toISOString(),
          },
        ],
        p_signing_token: null,
      },
    ])
  })
})
```

In `supabase/tests/partner_push.test.js`, replace:

```js
      sent(pushRequest({ pilot: 'probe', token: ZEROS, env: 'sandbox' }, stored, TOPIC, NOW_MS / 1000)),
      sent(pushRequest({ pilot: 'probe', token: ZEROS, env: 'production' }, stored, TOPIC, NOW_MS / 1000)),
```

with:

```js
      sent(pushRequest({ token: ZEROS, env: 'sandbox', message: { type: 'background' }, expires: NOW_MS / 1000 + 3600 }, stored, TOPIC)),
      sent(pushRequest({ token: ZEROS, env: 'production', message: { type: 'background' }, expires: NOW_MS / 1000 + 3600 }, stored, TOPIC)),
```

In `supabase/tests/partner_push.test.js`, replace:

```js
    assert.deepEqual(accepted.calls('partner_push_report'), [
      { p_secret: SECRET, p_dead_tokens: [], p_retry_pilots: [], p_signing_token: jwt },
    ])
```

with:

```js
    assert.deepEqual(accepted.calls('partner_push_report'), [
      { p_secret: SECRET, p_dead_tokens: [], p_retries: [], p_signing_token: jwt },
    ])
```

In `supabase/tests/partner_push.test.js`, replace:

```js
  const casts = { p_dead_tokens: '::text[]', p_retry_pilots: '::uuid[]' }
```

with:

```js
  const casts = { p_dead_tokens: '::text[]', p_retries: '::jsonb' }
```

In `supabase/tests/partner_push.test.js`, replace:

```js
      const [{ r }] = await asService(database, `select public.${name}(${call}) as r`, names.map((arg) => args[arg]))
```

with:

```js
      const values = names.map((arg) => (casts[arg] === '::jsonb' ? JSON.stringify(args[arg]) : args[arg]))
      const [{ r }] = await asService(database, `select public.${name}(${call}) as r`, values)
```

In `supabase/tests/partner_push.test.js`, replace:

```js
/** partner-push, run once on request against the database, with Apple's answers from apple. */
async function runAgainst(database, request, apple) {
  const fake = standIns({ rpc: postgrest(database), apple })
  const response = await makeHandler({ config: settings(), fetch: fake.fetch, now: () => NOW_MS, log: () => {} })(request)
```

with:

```js
/**
 * partner-push, run once on request against the database, with Apple's answers from apple. Its clock is the real one,
 * as the database's is, so a push it puts on the retry list isn't past its time there.
 */
async function runAgainst(database, request, apple) {
  const fake = standIns({ rpc: postgrest(database), apple })
  const response = await makeHandler({ config: settings(), fetch: fake.fetch, now: () => Date.now(), log: () => {} })(request)
```

In `supabase/tests/partner_push.test.js`, replace:

```js
    assert.deepEqual({ status, body }, { status: 200, body: { sent: 2, dead: 1, retried: 0, failed: 0 } })
```

with:

```js
    assert.deepEqual({ status, body }, { status: 200, body: { sent: 2, alerts: 0, dead: 1, retried: 0, failed: 0 } })
```

In `supabase/tests/partner_push.test.js`, replace:

```js
  test("a push that didn't get through: the pilot is due again, and the next check calls partner-push again", async (t) => {
    const database = await db(t)
    const { pilot, key } = await connected(database)
    await setPush(database, key, device(1).token)
    await setStatus(database, pilot, { v: 1 }, 1)
    // With a stored signing token, the push to try again alone calls report.
    await asAdmin(database, 'insert into private.partner_push_state (signing_token, made_at) values ($1, now())', [stored])
    await tick(database)
    const [request] = await queued(database)
    const { body } = await runAgainst(database, request, () => ({ status: 503, reason: 'ServiceUnavailable' }))
    assert.deepEqual(body, { sent: 0, dead: 0, retried: 1, failed: 0 })
    assert.equal(await isDue(database, pilot), true)
    await tick(database)
    assert.equal((await queued(database)).length, 2)
  })
```

with:

```js
  test("a push that didn't get through waits on the retry list, and the next check sends it again, to that device alone", async (t) => {
    const database = await db(t)
    const { pilot, key } = await connected(database)
    await setPush(database, key, device(1).token)
    await setStatus(database, pilot, { v: 1 }, 1)
    // With a stored signing token, the push to try again alone calls report.
    await asAdmin(database, 'insert into private.partner_push_state (signing_token, made_at) values ($1, now())', [stored])
    await tick(database)
    const [request] = await queued(database)
    const { body } = await runAgainst(database, request, () => ({ status: 503, reason: 'ServiceUnavailable' }))
    assert.deepEqual(body, { sent: 0, alerts: 0, dead: 0, retried: 1, failed: 0 })
    assert.equal(await isDue(database, pilot), false, 'the change is handled, and its push waits')
    assert.deepEqual(await asAdmin(database, 'select token, env, message from private.partner_push_retries'), [
      { token: device(1).token, env: 'production', message: { type: 'background' } },
    ])
    await tick(database)
    const [, again] = await queued(database)
    const second = await runAgainst(database, again, () => ({ status: 200 }))
    assert.deepEqual(second.body, { sent: 1, alerts: 0, dead: 0, retried: 0, failed: 0 })
    assert.deepEqual(second.fake.pushes().map(({ url }) => url), [`${APNS_HOSTS.production}/3/device/${device(1).token}`])
    assert.deepEqual(await asAdmin(database, 'select * from private.partner_push_retries'), [])
  })

  test('alert pushes, end to end: the first summary alerts nobody, the same again pushes nobody, and Call Me alerts only its partner', async (t) => {
    const database = await db(t)
    const { pilot, partnerId: sarah, key } = await connected(database)
    await setPush(database, key, device(1).token, 'production', true)
    const max = await createPartner(database, pilot, 'Max')
    await setPush(database, (await join(database, max.invite_token)).device_key, device(2).token)
    /** One write from CrewLu and the run after it: partner-push's answer, and what it sent. */
    const write = async (fields) => {
      await setStatus(database, pilot, { ...cases.base, ...fields }, 1)
      await tick(database)
      const { fake, body } = await runAgainst(database, (await queued(database)).at(-1), () => ({ status: 200 }))
      const pushes = fake.pushes().map(({ url, init }) => ({ to: url.split('/').at(-1), type: init.headers['apns-push-type'], body: init.body }))
      return { body, pushes }
    }
    // Sarah's Crewluve shows alerts, and Max's is older. The first summary has nothing to compare with.
    assert.deepEqual(await write({ lastUpdated: 100 }), {
      body: { ...nothing, sent: 1 },
      pushes: [{ to: device(2).token, type: 'background', body: PUSH_BODY }],
    })
    // The same summary again, as CrewLu sends it on opening Partner Sharing: nothing is new for anyone.
    assert.deepEqual(await write({ lastUpdated: 160, localTimeAtPilot: '11:01 AM' }), { body: nothing, pushes: [] })
    // Call Me, for Sarah alone: one alert push to her Crewluve, and nothing to Max's.
    const callMe = { status: 'Call Me', icon: 'phone.fill', expiry: null }
    assert.deepEqual(await write({ lastUpdated: 220, quickStatusByPartner: { [sarah]: callMe } }), {
      body: { ...nothing, sent: 1, alerts: 1 },
      pushes: [{ to: device(1).token, type: 'alert', body: messageBody({ type: 'alert', kind: 'quick-status', sound: true }) }],
    })
  })
```

- [x] **Step 6: Run them to see them fail**

Run:

```bash
cd ~/Dev/Duty-alert-pushes/supabase/tests && node --no-maglev --test partner_push.test.js
```

Expected: `ℹ tests 1`, `ℹ fail 1`: `does not provide an export named 'ALERT_LINE'`, since partner-push's new parts aren't written yet.

- [x] **Step 7: Write partner-push's pushes and its run**

In the order they appear in the file:

In `supabase/functions/partner-push/index.ts`, replace:

```ts
// partner-push: wakes partners' Crewluve with a silent push through Apple when a pilot's status changes (partner
// links piece 3, crewluve-web docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md §6). The 15-second
// check, private.partner_push_tick(), calls it with the Vault's password. It claims the due pilots' Crewluve tokens
// (partner_push_claim), sends each one a push, and reports back (partner_push_report).
```

with:

```ts
// partner-push: tells partners' Crewluve through Apple when a pilot's status changes (partner links piece 3,
// crewluve-web docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md §6, whose sections a plain
// "spec §" names, and its alert pushes, docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md §5). The
// 15-second check, private.partner_push_tick(), calls it with the Vault's password. It claims the due pilots'
// partners (partner_push_claim): what each saw at the last run and sees now, and their Crewluve's push tokens. A
// Crewluve that shows alert pushes gets one for each alert Crewluve's own rules make of the change, copied here, and
// an older one a silent push when anything it sees changed. Then it reports back (partner_push_report).
```

In `supabase/functions/partner-push/index.ts`, replace:

```ts
/** A silent push: Crewluve wakes, calls partner_view, and decides what to show. */
export const PUSH_BODY = '{"aps":{"content-available":1}}'

/** One Crewluve's push token, as partner_push_claim hands it out. */
export type Device = { pilot: string; token: string; env: keyof typeof APNS_HOSTS }
```

with:

```ts
/** A silent push: an older Crewluve wakes, calls partner_view, and decides what to show. */
export const PUSH_BODY = '{"aps":{"content-available":1}}'

/** The line an alert push shows if Crewluve's helper doesn't run (alert pushes spec §5.4): the helper writes the words. */
export const ALERT_LINE = 'New update'

/** How long Apple keeps a push for a phone that's off, and so how long one is tried again, in seconds. */
export const PUSH_LIFETIME_S = 3600

/** What one push says: a silent wake-up, or one alert, by its kind, with or without a sound (alert pushes spec §5.4). */
export type Message = { type: 'background' } | { type: 'alert'; kind: string; sound: boolean }

/** One push: the device's token and environment, what it says, and when Apple drops it, in seconds since 1970. */
export type Push = { token: string; env: keyof typeof APNS_HOSTS; message: Message; expires: number }
```

In `supabase/functions/partner-push/index.ts`, replace:

```ts
/** The request that sends device a silent push (spec §6.2), signed with jwt. Apple keeps it for an hour if the phone is off. */
export function pushRequest(device: Device, jwt: string, topic: string, nowSeconds: number) {
  return {
    url: `${APNS_HOSTS[device.env]}/3/device/${device.token}`,
    init: {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwt}`,
        'apns-topic': topic,
        'apns-push-type': 'background',
        'apns-priority': '5',
        'apns-expiration': String(nowSeconds + 3600),
        'content-type': 'application/json',
      },
      body: PUSH_BODY,
    },
  }
}
```

with:

```ts
/** A push's body. An alert push carries only its kind: Crewluve's helper reads the status and writes the words. */
export function messageBody(message: Message): string {
  if (message.type === 'background') return PUSH_BODY
  const aps: Record<string, unknown> = { alert: { body: ALERT_LINE }, 'mutable-content': 1 }
  if (message.sound) aps.sound = 'default'
  return JSON.stringify({ aps, kind: message.kind })
}

/**
 * The request that sends a push (spec §6.2, alert pushes spec §5.4), signed with jwt: a silent one at low priority, an
 * alert at top priority. Apple keeps it until it expires if the phone is off.
 */
export function pushRequest(push: Push, jwt: string, topic: string) {
  const alert = push.message.type === 'alert'
  return {
    url: `${APNS_HOSTS[push.env]}/3/device/${push.token}`,
    init: {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwt}`,
        'apns-topic': topic,
        'apns-push-type': alert ? 'alert' : 'background',
        'apns-priority': alert ? '10' : '5',
        'apns-expiration': String(push.expires),
        'content-type': 'application/json',
      },
      body: messageBody(push.message),
    },
  }
}
```

In `supabase/functions/partner-push/index.ts`, replace:

```ts
/** What Apple's answer to one push means (spec §7). */
```

with:

```ts
/** One of a partner's Crewluve devices, as partner_push_claim hands it out. */
type ClaimedDevice = { token: string; env: keyof typeof APNS_HOSTS; alerts: boolean; joined_since: boolean }
/** One partner of a claimed pilot: what they saw at the last run and see now, and their devices. */
type ClaimedPartner = { partner: string; before: View | null; after: View; changed: boolean; devices: ClaimedDevice[] }
/** One claimed pilot: their partners, and when the two views were current. */
export type ClaimedPilot = { pilot: string; before_at: string | null; after_at: string; partners: ClaimedPartner[] }
/** A push waiting to be tried again, as partner_push_claim hands it out and partner_push_report takes it. */
type Retry = { token: string; env: keyof typeof APNS_HOSTS; message: Message; until: string }

/**
 * The pushes one claimed pilot's partners get (alert pushes spec §5.2), each kept by Apple until `expires`: one alert
 * push per alert to a Crewluve that shows them, but none to one that joined since the last run, and a silent push to
 * an older Crewluve when anything its partner sees changed.
 */
export function pushesFor(pilot: ClaimedPilot, expires: number): Push[] {
  const beforeAt = pilot.before_at === null ? 0 : Date.parse(pilot.before_at) / 1000
  const afterAt = Date.parse(pilot.after_at) / 1000
  return pilot.partners.flatMap(({ partner, before, after, changed, devices }) => {
    const alerts = before === null ? [] : alertsFor(before, after, partner, beforeAt, afterAt)
    return devices.flatMap(({ token, env, alerts: showsAlerts, joined_since }): Push[] => {
      if (!showsAlerts) return changed ? [{ token, env, message: { type: 'background' }, expires }] : []
      if (joined_since) return []
      return alerts.map(({ kind, sound }) => ({ token, env, message: { type: 'alert', kind, sound }, expires }))
    })
  })
}

/** What Apple's answer to one push means (spec §7). */
```

In `supabase/functions/partner-push/index.ts`, replace:

```ts
const PROBE_DEVICES: Device[] = [
  { pilot: 'probe', token: '0'.repeat(64), env: 'sandbox' },
  { pilot: 'probe', token: '0'.repeat(64), env: 'production' },
]
```

with:

```ts
const probePushes = (expires: number): Push[] =>
  (['sandbox', 'production'] as const).map((env) => ({ token: '0'.repeat(64), env, message: { type: 'background' }, expires }))
```

In `supabase/functions/partner-push/index.ts`, replace:

```ts
  /** Sends device one silent push, signed with jwt. */
  async function send(device: Device, jwt: string): Promise<Result> {
    const { url, init } = pushRequest(device, jwt, config.topic!, nowSeconds())
```

with:

```ts
  /** Sends one push, signed with jwt. */
  async function send(push: Push, jwt: string): Promise<Result> {
    const { url, init } = pushRequest(push, jwt, config.topic!)
```

In `supabase/functions/partner-push/index.ts`, replace:

```ts
  async function answerProbe(results: Result[], keep: string | null, secret: string | null) {
    const probe: Record<string, object> = {}
    PROBE_DEVICES.forEach(({ env }, index) => {
```

with:

```ts
  async function answerProbe(pushes: Push[], results: Result[], keep: string | null, secret: string | null) {
    const probe: Record<string, object> = {}
    pushes.forEach(({ env }, index) => {
```

In `supabase/functions/partner-push/index.ts`, replace:

```ts
        p_dead_tokens: [],
        p_retry_pilots: [],
        p_signing_token: keep,
```

with:

```ts
        p_dead_tokens: [],
        p_retries: [],
        p_signing_token: keep,
```

In `supabase/functions/partner-push/index.ts`, replace:

```ts
      const devices: Device[] = probe ? PROBE_DEVICES : claimed.body.devices
      if (devices.length === 0) return answer(200, { sent: 0, dead: 0, retried: 0, failed: 0 })
```

with:

```ts
      // The pushes waiting to be tried again keep their time, and new ones get Apple's hour (alert pushes spec §5.5).
      const pilots: ClaimedPilot[] = claimed.body.pilots
      const waiting: Retry[] = claimed.body.retries
      const expires = nowSeconds() + PUSH_LIFETIME_S
      const pushes: Push[] = probe
        ? probePushes(expires)
        : [
            ...waiting.map(({ token, env, message, until }) => ({ token, env, message, expires: Math.floor(Date.parse(until) / 1000) })),
            ...pilots.flatMap((pilot) => pushesFor(pilot, expires)),
          ]
      const counts = { sent: 0, alerts: 0, dead: 0, retried: 0, failed: 0 }
      if (pushes.length === 0) {
        // Nothing new for anyone, as when CrewLu sends the same summary again on opening a screen.
        if (pilots.length > 0) log('partner-push: nothing new to send')
        return answer(200, counts)
      }
```

In `supabase/functions/partner-push/index.ts`, replace:

```ts
      const results = await eachAtMost(devices, AT_ONCE, (device) => send(device, jwt))
      if (probe) return await answerProbe(results, made && accepted(results) ? jwt : null, secret)
      const expired = results.flatMap((result, index) => (result.outcome === 'renew' ? [index] : []))
      if (expired.length > 0 && !made) {
        await sign()
        const again = await eachAtMost(expired, AT_ONCE, (index) => send(devices[index], jwt))
        expired.forEach((index, i) => (results[index] = again[i]))
      }

      const counts = { sent: 0, dead: 0, retried: 0, failed: 0 }
      const dead = new Set<string>()
      const retry = new Set<string>()
      devices.forEach((device, index) => {
        const result = results[index]
        if (result.outcome === 'sent') {
          counts.sent += 1
        } else if (result.outcome === 'dead') {
          counts.dead += 1
          dead.add(device.token)
        } else if (result.outcome === 'retry') {
          counts.retried += 1
          retry.add(device.pilot)
          log(`partner-push: a push will be tried again: ${said(result)}`)
```

with:

```ts
      const results = await eachAtMost(pushes, AT_ONCE, (push) => send(push, jwt))
      if (probe) return await answerProbe(pushes, results, made && accepted(results) ? jwt : null, secret)
      const expired = results.flatMap((result, index) => (result.outcome === 'renew' ? [index] : []))
      if (expired.length > 0 && !made) {
        await sign()
        const again = await eachAtMost(expired, AT_ONCE, (index) => send(pushes[index], jwt))
        expired.forEach((index, i) => (results[index] = again[i]))
      }

      const dead = new Set<string>()
      const retries: Retry[] = []
      pushes.forEach((push, index) => {
        const result = results[index]
        if (result.outcome === 'sent') {
          counts.sent += 1
          if (push.message.type === 'alert') counts.alerts += 1
        } else if (result.outcome === 'dead') {
          counts.dead += 1
          dead.add(push.token)
        } else if (result.outcome === 'retry') {
          // Tried again to this device alone, saying the same, until Apple would drop it (alert pushes spec §5.5).
          counts.retried += 1
          retries.push({ token: push.token, env: push.env, message: push.message, until: new Date(push.expires * 1000).toISOString() })
          log(`partner-push: a push will be tried again: ${said(result)}`)
```

In `supabase/functions/partner-push/index.ts`, replace:

```ts
      if (dead.size > 0 || retry.size > 0 || keep) {
        const reported = await rpc('partner_push_report', {
          p_secret: secret,
          p_dead_tokens: [...dead],
          p_retry_pilots: [...retry],
          p_signing_token: keep,
        })
```

with:

```ts
      if (dead.size > 0 || retries.length > 0 || keep) {
        const reported = await rpc('partner_push_report', {
          p_secret: secret,
          p_dead_tokens: [...dead],
          p_retries: retries,
          p_signing_token: keep,
        })
```

In `supabase/functions/partner-push/index.ts`, replace:

```ts
      log(`partner-push: ${counts.sent} sent, ${counts.dead} dead, ${counts.retried} retried, ${counts.failed} failed`)
```

with:

```ts
      log(
        `partner-push: ${counts.sent} sent (${counts.alerts} as alerts), ${counts.dead} dead, ${counts.retried} retried, ${counts.failed} failed`,
      )
```

- [x] **Step 8: Run everything to see it pass**

Run:

```bash
cd ~/Dev/Duty-alert-pushes/supabase/tests && npm test
```

Expected: `ℹ tests 257`, `ℹ pass 257`, `ℹ fail 0`.

- [x] **Step 9: Commit**

Run:

```bash
cd ~/Dev/Duty-alert-pushes && git add supabase/migrations/20261023120000_partner_links_alert_pushes.sql supabase/functions/partner-push/index.ts supabase/tests/push_service.test.js supabase/tests/privileges.test.js supabase/tests/partner_push.test.js && git commit -q -m "feat(partner-links): alert pushes: each device gets what's new for its partner, alerts to a Crewluve that shows them, and a retry waits for its device alone" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit, `feat(partner-links): alert pushes: each device gets what's new for its partner, alerts to a Crewluve that shows them, and a retry waits for its device alone`.

### Task 5: The script's undo and second run

**Files:**
- Create: `supabase/tests/alert_pushes.test.js`
- Modify: `supabase/migrations/20261023120000_partner_links_alert_pushes.sql`

The undo puts back piece 1's `partner_set_push` and piece 3's claim, report and check, as they were (decision 1). The test compares their definitions and grants with a database built up to piece 3.

- [x] **Step 1: Write the tests**

Create `supabase/tests/alert_pushes.test.js`:

```js
// The alert pushes' script (supabase/migrations/20261023120000_partner_links_alert_pushes.sql), as the SQL editor runs
// it: a second time, and its undo. What it does is tested where its functions are: push.test.js (partner_set_push),
// push_service.test.js (claim, report and the check) and partner_push.test.js. Its spec is crewluve-web
// docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md.
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { asAdmin, freshDb, migrationPath, partnerDbUpTo, read } from './helpers/db.js'

const migration = migrationPath('20261023120000_partner_links_alert_pushes.sql')

/** The undo SQL: the indented comment lines under "-- Undo" in the migration's header. */
function undoSql() {
  const lines = read(migration).split('\n')
  const start = lines.findIndex((line) => line.startsWith('-- Undo'))
  assert.ok(start >= 0, 'the migration has an "-- Undo" section')
  const undo = []
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith('--   ')) break
    undo.push(line.slice('--   '.length))
  }
  return undo.join('\n')
}

/** A database for one test, closed when the test ends. */
async function opened(t, made) {
  const db = await made
  t.after(() => db.close())
  return db
}

/**
 * What the script changes, as the database holds it: the definitions and grants of the functions it replaces or adds,
 * the columns of the two tables it changes, and whether its retry list is there.
 */
const shape = async (db) =>
  (
    await asAdmin(
      db,
      `select (select jsonb_agg(jsonb_build_object('fn', p.oid::regprocedure::text, 'def', pg_get_functiondef(p.oid),
                                  'grants', array(select a::text from unnest(p.proacl) a order by 1))
                                order by p.oid::regprocedure::text)
                 from pg_proc p
                where p.proname in ('partner_set_push', 'partner_push_claim', 'partner_push_report', 'partner_push_tick',
                                    'push_partners', 'push_compared')) as functions,
              (select jsonb_agg(c.table_schema || '.' || c.table_name || '.' || c.column_name
                                order by c.table_schema, c.table_name, c.column_name)
                 from information_schema.columns c
                where (c.table_schema, c.table_name) in (('public', 'partner_status'), ('private', 'partner_device_secrets'))) as columns,
              to_regclass('private.partner_push_retries') is not null as retries`,
    )
  )[0]

describe("the alert pushes' script, run again and undone", () => {
  test('running it a second time fails at its first statement, and changes nothing', async (t) => {
    const db = await opened(t, freshDb())
    const before = await shape(db)
    await assert.rejects(db.exec(read(migration)), /column "push_alerts" of relation "partner_device_secrets" already exists/)
    assert.deepEqual(await shape(db), before)
  })

  test("the undo in its header puts back piece 1's partner_set_push and piece 3's claim, report and check as they were", async (t) => {
    const was = await shape(await opened(t, partnerDbUpTo('20261018120000_partner_links_push.sql')))
    assert.equal(was.functions.length, 4, 'piece 3 has the four functions this script replaces')
    const db = await opened(t, freshDb())
    assert.notDeepEqual(await shape(db), was)
    await db.exec(undoSql())
    assert.deepEqual(await shape(db), was)
  })
})
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
cd ~/Dev/Duty-alert-pushes/supabase/tests && node --no-maglev --test alert_pushes.test.js
```

Expected: `ℹ tests 2`, `ℹ pass 1`, `ℹ fail 1`: `the migration has an "-- Undo" section`. The second run already fails at its first statement, as it should.

- [x] **Step 3: Write the undo**

In the header, after the line about deploying partner-push:

In `supabase/migrations/20261023120000_partner_links_alert_pushes.sql`, replace:

```sql
-- Deploy partner-push's new index.ts right after it, since piece 3's partner-push can't read the new claim.
```

with:

```sql
-- Deploy partner-push's new index.ts right after it, since piece 3's partner-push can't read the new claim.
--
-- Undo, in the SQL editor, then deploy piece 3's partner-push again (git show 7b3aeb2d:supabase/functions/partner-push/index.ts):
--   drop function public.partner_set_push(text, text, text, boolean);
--   create function public.partner_set_push(p_key text, p_token text, p_env text) returns jsonb
--   language plpgsql security definer set search_path = '' as $$
--   declare
--     v_device record;
--     v_token text := lower(btrim(left(coalesce(p_token, ''), 300)));
--   begin
--     select * into v_device from private.device_for_key(p_key);
--     if not found then
--       return jsonb_build_object('error', 'sharing_ended');
--     end if;
--     if v_device.kind <> 'app' or v_token !~ '^[0-9a-f]{64,200}$'
--        or p_env is null or p_env not in ('sandbox', 'production') then
--       return jsonb_build_object('error', 'invalid_input');
--     end if;
--     update private.partner_device_secrets set push_token = null, push_env = null
--      where push_token = v_token and device_id <> v_device.device_id;
--     update private.partner_device_secrets set push_token = v_token, push_env = p_env
--      where device_id = v_device.device_id;
--     return jsonb_build_object('ok', true);
--   end
--   $$;
--   revoke all on function public.partner_set_push(text, text, text) from public, anon, authenticated;
--   grant execute on function public.partner_set_push(text, text, text) to anon, authenticated;
--   create or replace function public.partner_push_claim(p_secret text, p_probe boolean default false) returns jsonb
--   language plpgsql security definer set search_path = '' as $$
--   declare
--     v_devices jsonb := '[]'::jsonb;
--   begin
--     perform private.require_push_password(p_secret, 'partner_push_claim');
--     if not coalesce(p_probe, false) then
--       with due as (
--         update public.partner_status set push_due = false, last_push_at = now()
--          where push_due
--         returning user_id
--       )
--       select coalesce(jsonb_agg(jsonb_build_object('pilot', d.owner_id, 'token', s.push_token, 'env', s.push_env)
--                                   order by d.owner_id, s.push_token), '[]'::jsonb)
--         into v_devices
--         from due
--         join public.partner_devices d on d.owner_id = due.user_id and d.kind = 'app'
--         join private.partner_device_secrets s on s.device_id = d.id
--        where s.push_token is not null;
--     end if;
--     return jsonb_build_object(
--       'devices', v_devices,
--       'signing_token', (select signing_token from private.partner_push_state where made_at > now() - interval '40 minutes')
--     );
--   end
--   $$;
--   drop function public.partner_push_report(text, text[], jsonb, text);
--   create function public.partner_push_report(p_secret text, p_dead_tokens text[], p_retry_pilots uuid[], p_signing_token text)
--   returns jsonb
--   language plpgsql security definer set search_path = '' as $$
--   begin
--     perform private.require_push_password(p_secret, 'partner_push_report');
--     update private.partner_device_secrets set push_token = null, push_env = null
--      where push_token = any (coalesce(p_dead_tokens, '{}'));
--     update public.partner_status set push_due = true
--      where user_id = any (coalesce(p_retry_pilots, '{}'))
--        and updated_at > now() - interval '1 hour';
--     if p_signing_token is not null then
--       insert into private.partner_push_state (signing_token, made_at) values (p_signing_token, now())
--       on conflict (only_row) do update set signing_token = excluded.signing_token, made_at = excluded.made_at;
--     end if;
--     return jsonb_build_object('ok', true);
--   end
--   $$;
--   revoke all on function public.partner_push_report(text, text[], uuid[], text) from public, anon, authenticated;
--   grant execute on function public.partner_push_report(text, text[], uuid[], text) to service_role;
--   create or replace function private.partner_push_tick() returns void
--   language plpgsql set search_path = '' as $$
--   begin
--     update public.partner_status ps set push_due = false
--      where ps.push_due
--        and not exists (
--          select 1
--            from public.partner_devices d
--            join private.partner_device_secrets s on s.device_id = d.id
--           where d.owner_id = ps.user_id and d.kind = 'app' and s.push_token is not null
--        );
--     if exists (select 1 from public.partner_status where push_due) then
--       perform private.call_partner_push('{}'::jsonb);
--     end if;
--   end
--   $$;
--   drop function private.push_partners(uuid, jsonb, jsonb, timestamptz), private.push_compared(jsonb);
--   drop table private.partner_push_retries;
--   alter table public.partner_status drop column pushed_status;
--   alter table private.partner_device_secrets drop column push_alerts;
```

- [x] **Step 4: Run them to see them pass**

Run:

```bash
cd ~/Dev/Duty-alert-pushes/supabase/tests && node --no-maglev --test alert_pushes.test.js
```

Expected: `ℹ tests 2`, `ℹ pass 2`, `ℹ fail 0`.

- [x] **Step 5: Commit**

Run:

```bash
cd ~/Dev/Duty-alert-pushes && git add supabase/migrations/20261023120000_partner_links_alert_pushes.sql supabase/tests/alert_pushes.test.js && git commit -q -m "feat(partner-links): the alert pushes' script runs once, and its undo puts back piece 1's partner_set_push and piece 3's claim, report and check" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit, `feat(partner-links): the alert pushes' script runs once, and its undo puts back piece 1's partner_set_push and piece 3's claim, report and check`.

### Task 6: The docs

**Files:**
- Modify: `supabase/partner-api.md`, `supabase/tests/README.md`

- [x] **Step 1: The contract**

In `supabase/partner-api.md`, replace:

```markdown
- **The pushes' sender:** the Edge Function `partner-push`, `functions/partner-push/index.ts`. Its tests are in `tests/` too.
```

with:

```markdown
- **The pushes' sender:** the Edge Function `partner-push`, `functions/partner-push/index.ts`. Its tests are in `tests/` too. Its alert pushes follow `docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md` in the same repo as the design.
```

In `supabase/partner-api.md`, replace:

```markdown
| `partner_set_push` | `p_key`, `p_token` (the APNs token in hex), `p_env` (`sandbox` or `production`) | `{"ok": true}`. App devices only. |
```

with:

```markdown
| `partner_set_push` | `p_key`, `p_token` (the APNs token in hex), `p_env` (`sandbox` or `production`), `p_alerts` (optional: `true` from a Crewluve that shows alert pushes, 1.3 and later; left out, `false`) | `{"ok": true}`. App devices only. |
```

In `supabase/partner-api.md`, replace:

```markdown
## Pushes (piece 3)

When a pilot's summary changes, CrewLu Cloud wakes their partners' Crewluve with a silent push through Apple:

- **A push means "call `partner_view`".** It's silent (`content-available`, no alert) and carries nothing else. Crewluve reads the summary and decides what to show, as it does after an iCloud push today.
- **Register on every launch,** once iOS has given Crewluve a token: call `partner_set_push` with the token in hex and `p_env` from the build's `aps-environment` entitlement, which its provisioning profile sets: `sandbox` for every build Xcode installs, Debug or Release, and `production` for TestFlight and the App Store. A token sent with the wrong one gets `BadDeviceToken` from Apple and is dropped. A token moves to the newest device that registers it.
- **Tokens Apple rejects are dropped on the server.** Crewluve sends a fresh one at its next launch.
- **At most one push per pilot every 15 seconds,** and the last change in a burst always gets one. A push that doesn't get through is tried again every 15 seconds, for up to an hour after the change. iOS decides when to deliver silent pushes and holds some back, so Crewluve still refreshes when it opens and every 60 seconds while it's open.
```

with:

```markdown
## Pushes (piece 3, and the alert pushes)

When a pilot's summary changes, CrewLu Cloud tells their partners' Crewluve through Apple, but only the partners something changed for:

- **Register on every launch,** once iOS has given Crewluve a token: call `partner_set_push` with the token in hex, `p_env` from the build's `aps-environment` entitlement, and `p_alerts: true` if this Crewluve shows alert pushes.
  - The provisioning profile sets the entitlement: `sandbox` for every build Xcode installs, Debug or Release, and `production` for TestFlight and the App Store. A token sent with the wrong one gets `BadDeviceToken` from Apple and is dropped.
  - A token moves to the newest device that registers it, and takes its `p_alerts` along.
- **A Crewluve that registered `p_alerts`** gets one alert push per alert. CrewLu Cloud works out the alerts with Crewluve's own rules, from what that partner saw at the last change and sees now; `partner-status/alert-cases.json` holds the cases both sides are checked with.
  - The push is `apns-push-type: alert` at priority 10, and its body is `{"aps":{"alert":{"body":"New update"},"mutable-content":1,"sound":"default"},"kind":"<kind>"}`, without `sound` for Sleeping.
  - It carries no name, status or time. `kind` names the alert, and Crewluve's Notification Service Extension reads `partner_view` and writes the words. "New update" shows only if the extension doesn't run.
  - A device that joined since the last change gets no alerts for that change.
  - Crewluve then posts no alerts of its own.
- **A Crewluve that didn't** gets a silent push when anything its partner sees changed, apart from `lastUpdated` and `localTimeAtPilot`. It's silent (`content-available`, no alert) and carries nothing else: it means "call `partner_view`", and Crewluve decides what to show.
- **Tokens Apple rejects are dropped on the server.** Crewluve sends a fresh one at its next launch.
- **At most one round of pushes per pilot every 15 seconds,** and the last change in a burst always gets one. A push that doesn't get through is tried again, to that device alone, every 15 seconds, until Apple would have dropped it: an hour after it was first sent. iOS decides when to deliver silent pushes and holds some back, so Crewluve still refreshes when it opens and every 60 seconds while it's open.
```

In `supabase/partner-api.md`, replace:

```markdown
curl -s -D - -o /dev/null -X POST "$URL/rest/v1/rpc/partner_handoff_redeem" -H "apikey: $KEY" -H "Content-Type: application/json" -H "Prefer: tx=rollback" -d "{\"p_token\":\"000000\",\"p_device_key\":\"$ZEROS\",\"p_kind\":\"web\",\"p_label\":\"check\"}" | grep -ci "preference-applied"
```

with:

```markdown
curl -s -D - -o /dev/null -X POST "$URL/rest/v1/rpc/partner_handoff_redeem" -H "apikey: $KEY" -H "Content-Type: application/json" -H "Prefer: tx=rollback" -d "{\"p_token\":\"000000\",\"p_device_key\":\"$ZEROS\",\"p_kind\":\"web\",\"p_label\":\"check\"}" | grep -ci "preference-applied"
curl -s -X POST "$URL/rest/v1/rpc/partner_set_push" -H "apikey: $KEY" -H "Content-Type: application/json" -d "{\"p_key\":\"$ZEROS\",\"p_token\":\"$ZEROS\",\"p_env\":\"production\"}"
curl -s -X POST "$URL/rest/v1/rpc/partner_set_push" -H "apikey: $KEY" -H "Content-Type: application/json" -d "{\"p_key\":\"$ZEROS\",\"p_token\":\"$ZEROS\",\"p_env\":\"production\",\"p_alerts\":true}"
```

In `supabase/partner-api.md`, replace:

```markdown
7. `0`: PostgREST ignored `tx=rollback`, so a wrong code is always recorded. This records one wrong code, which is deleted after an hour.
```

with:

```markdown
7. `0`: PostgREST ignored `tx=rollback`, so a wrong code is always recorded. This records one wrong code, which is deleted after an hour.
8. `{"error": "sharing_ended"}`: Crewluve 1.2's call, without `p_alerts`, still reaches `partner_set_push`.
9. `{"error": "sharing_ended"}`: so does Crewluve 1.3's, with it.
```

In `supabase/partner-api.md`, replace:

```markdown
**Undo the pushes first** (piece 3), with the undo in the header of `migrations/20261018120000_partner_links_push.sql`, then delete `partner-push` in the dashboard. Their table and five of their functions are in `private`, so while they're there, this undo changes nothing.
```

with:

```markdown
**Undo the pushes first.** First the alert pushes, with the undo in the header of `migrations/20261023120000_partner_links_alert_pushes.sql`, which puts back piece 1's `partner_set_push` and piece 3's claim, report and check. Then piece 3, with the undo in the header of `migrations/20261018120000_partner_links_push.sql`, and delete `partner-push` in the dashboard. Their tables and functions in `private` stop this undo while they're there, so it changes nothing.
```

- [x] **Step 2: The tests' README**

In `supabase/tests/README.md`, replace:

```markdown
- partner-push, the Edge Function that sends partner links' pushes (`../functions/partner-push/index.ts`): run under Node with stand-ins for Apple, then against the real claim and report;
```

with:

```markdown
- partner-push, the Edge Function that sends partner links' pushes (`../functions/partner-push/index.ts`): run under Node with stand-ins for Apple, then against the real claim and report. Its alert rules are checked against every case in `../partner-status/alert-cases.json`;
- the alert pushes' script (`20261023120000_partner_links_alert_pushes.sql`), in `alert_pushes.test.js`: run a second time, and undone back to piece 3's functions, exactly;
```

In `supabase/tests/README.md`, replace:

```markdown
228 tests run in about 27 seconds, each test file in its own process. `npm test` runs `node --no-maglev --test`. Without `--no-maglev`, Node 23.11 sometimes deadlocks under the test runner:
```

with:

```markdown
258 tests run in about 40 seconds, each test file in its own process. `npm test` runs `node --no-maglev --test`. Without `--no-maglev`, Node 23.11 sometimes deadlocks under the test runner:
```

In `supabase/tests/README.md`, replace:

```markdown
- **`helpers/db.js`** makes fresh databases two ways:
  - `freshDb()`: the shim and every partner-links migration. The partner-links tests use it.
```

with:

```markdown
- **`helpers/db.js`** makes fresh databases three ways:
  - `freshDb()`: the shim and every partner-links migration. The partner-links tests use it.
  - `partnerDbUpTo(file)`: the shim and the partner-links migrations up to that one. A migration's second run and its undo use it, since a later migration can change what they act on.
```

In `supabase/tests/README.md`, replace:

```markdown
- **Apple, and Supabase's Deno.** Whether partner-push reaches Apple over HTTP/2 from Supabase is proven by the setup's probe, and real pushes to a phone are tested in piece 4.
```

with:

```markdown
- **Apple, and Supabase's Deno.** Whether partner-push reaches Apple over HTTP/2 from Supabase is proven by the setup's probe. Real silent pushes to a phone were tested in piece 4, and real alert pushes are tested with Crewluve 1.3 on TestFlight.
```

- [x] **Step 3: Run the whole suite, and check partner-push's types**

Run:

```bash
cd ~/Dev/Duty-alert-pushes/supabase/tests && npm test
```

Expected: `ℹ tests 259`, `ℹ pass 259`, `ℹ fail 0`, in under two minutes.

TypeScript isn't installed here, so the check uses the website's (`supabase/tests/README.md`):

Run:

```bash
cd ~/Dev/Duty-alert-pushes/supabase/tests && ~/Dev/"Crewluve Website"/node_modules/.bin/tsc --noEmit --strict --noUnusedLocals --noUnusedParameters --target es2022 --lib es2022,dom --skipLibCheck ../functions/partner-push/index.ts && echo types ok
```

Expected: `types ok`.

- [x] **Step 4: Commit**

Run:

```bash
cd ~/Dev/Duty-alert-pushes && git add supabase/partner-api.md supabase/tests/README.md && git commit -q -m "docs(partner-links): the partner door's Pushes section for alert pushes, partner_set_push's p_alerts, the undo's order, and the tests' count" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit, `docs(partner-links): the partner door's Pushes section for alert pushes, partner_set_push's p_alerts, the undo's order, and the tests' count`.

### Task 7: The whole suite, and a review

**Files:** whatever the review finds.

- [x] **Step 1: Run the whole suite**

Run:

```bash
cd ~/Dev/Duty-alert-pushes/supabase/tests && npm test
```

Expected: `ℹ tests 259`, `ℹ pass 259`, `ℹ fail 0`.

- [x] **Step 2: Ask for a review**

Use superpowers:requesting-code-review with a read-only reviewer. It reads `git -C ~/Dev/Duty-alert-pushes diff 7b3aeb2d..feature/partner-alert-pushes`, this plan and the spec (`~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`), and Crewluve's rules it copies (`~/Dev/Crewluv/Crewluv/Services/StatusChangeNotifier.swift`, `Crewluv/Models/CloudSummary.swift`, `SharedPilotStatus.swift` and `TripStateResolver.swift`). It may run `npm test` in `~/Dev/Duty-alert-pushes/supabase/tests`; nothing else. It changes nothing, contacts nothing and runs no Xcode. State facts neutrally, and don't tell it what not to flag.

- [x] **Step 3: Act on it**

For each finding, fix it test-first, run `npm test` again, and commit with the exact paths. A change to the rules changes `alert-cases.json` first, and the case is checked against Crewluve's Swift again, as "How this plan was checked" says. Note each fix in this plan's Execution notes. Nothing goes onto Crewlu Cloud before this.

### Task 8: The user's setup

**Files:** none. Crewlu Cloud changes here, by the user's hands. Claude's Supabase connection is read-only, so it can only read what the setup made, and only with the user's yes.

- [ ] **Step 1: Ask before going live**

Ask the user one question: set it up now? It's the spec's decision A5 (Crewlu Cloud first), but it changes Crewlu Cloud, so it gets its own yes. Between Steps 2 and 3, a change isn't pushed (decision 15), so nobody changes their status in CrewLu until Step 3 is done. If not now, stop here: Tasks 9 and 10 wait too.

- [ ] **Step 2: The SQL script**

Claude puts the script on the clipboard. Run it with the sandbox off, since from inside it `pbcopy` doesn't reach the user's clipboard, and with `LANG` set, so its `§` signs arrive as they are:

```bash
LANG=en_US.UTF-8 pbcopy < ~/Dev/Duty-alert-pushes/supabase/migrations/20261023120000_partner_links_alert_pushes.sql && echo copied
```

Expected: `copied`.

Then send the user these steps:

1. Open supabase.com/dashboard and the CrewLu Cloud project.
2. In the left sidebar, click **SQL Editor**, and start a new query.
3. Paste (⌘V) and click **Run**.
4. If it warns about a destructive operation, that's the two `drop function` lines: they drop the old `partner_set_push` and report, which the script makes again with their new parameters. Confirm it.
5. Expected: **Success. No rows returned**. If it says something `already exists`, the script ran before: stop and ask.

Go straight on to Step 3.

- [ ] **Step 3: partner-push's new file**

Claude puts the file on the clipboard, again with the sandbox off:

```bash
LANG=en_US.UTF-8 pbcopy < ~/Dev/Duty-alert-pushes/supabase/functions/partner-push/index.ts && echo copied
```

Expected: `copied`.

Then send the user these steps:

1. In the left sidebar, click **Edge Functions**, then **partner-push**.
2. Open its **Code** tab. Click in the editor, select everything (⌘A) and paste (⌘V).
3. Click **Deploy** (it may say **Deploy updates**), and wait for the success message.
4. On its **Details** tab, check that JWT verification is still off. The check sends no sign-in: the password guards partner-push.

- [ ] **Step 4: The probe**

As in piece 3's setup. Send the user these steps:

1. In a new query, run `select private.partner_push_probe();`. It answers with a number.
2. Wait five seconds, then run this, with that number in place of `N`:

```sql
select status_code, content, error_msg, timed_out from net._http_response where id = N;
```

Or, with the user's yes, Claude runs that `select` through its read-only connection.

Expected: `status_code` 200 and `content` `{"probe":{"sandbox":{"status":400,"reason":"BadDeviceToken"},"production":{"status":400,"reason":"BadDeviceToken"}}}`, as in piece 3. If it isn't, piece 3's plan, Task 12 step 6, says what each answer means; `report answered 404` means the script didn't run.

- [ ] **Step 5: The bursts, and the silent half**

Both partners' phones run Crewluve 1.2, so they get silent pushes. With the user's yes, Claude reads partner-push's logs (`function_logs`, read-only) after each of these:

1. The user opens CrewLu, waits half a minute, then opens its Partner Sharing screen, and changes nothing. Expected, for Partner Sharing's write: `partner-push: nothing new to send`, and no `sent` line. The bursts are gone. CrewLu's write on coming to the front can still push, if something a partner sees really changed since its last write.
2. The user sends a quick status to one partner only. Expected: `partner-push: 1 sent (0 as alerts), 0 dead, 0 retried, 0 failed`. That partner's Crewluve gets its silent push, and the other partner's gets nothing.
3. Claude checks that both phones' Crewluve still have their push tokens, registered without `p_alerts`:

```sql
select s.push_env, s.push_token is not null as has_token, s.push_alerts
  from public.partner_devices d join private.partner_device_secrets s on s.device_id = d.id
 where d.kind = 'app';
```

Expected: two rows, `production`, `has_token` true and `push_alerts` false.

The Execution notes record the results, with no names, labels or tokens.

- [ ] **Step 6: Crewluve 1.2's call still reaches partner_set_push**

With the user's yes, Claude runs the contract's checks after applying (`supabase/partner-api.md`, "Checks after applying to CrewLu Cloud"), with the publishable key. Each sends a made-up key, so nothing changes. Expected: checks 1 to 7 as the contract lists them, and 8 and 9 `{"error": "sharing_ended"}`: the call Crewluve 1.2 makes, without `p_alerts`, and 1.3's, with it, both reach `partner_set_push`. Check 7 records one wrong code, as it always has.

- [ ] **Step 7: The check is running**

A minute after the script, the user runs, or Claude with a yes:

```sql
select status, start_time, return_message from cron.job_run_details
 where jobid = (select jobid from cron.job where jobname = 'partner-push')
 order by start_time desc limit 5;
```

Expected: five rows, `succeeded`, about 15 seconds apart.

Then, the same way, check that every pilot's summary is one Crewluve can read (`private.push_readable`). A summary that isn't would keep that pilot's `pushed_status` empty, so every run would count as a change for their partners:

```sql
select count(*) filter (where not private.push_readable(status)) as unreadable from public.partner_status;
```

Expected: `unreadable` 0. If it isn't, stop and ask: CrewLu's encoder writes the four fields and each leg's id, type, start and end, so something else wrote that summary.

- [ ] **Step 8: The security advisor**

In the dashboard, open **Advisors** → **Security Advisor** and refresh it, or Claude reads it with a yes. Expected: one new INFO finding, `rls_enabled_no_policy` on `private.partner_push_retries`, like piece 3's `partner_push_state`; lints 0028 and 0029 unchanged in number, with `partner_set_push(text, text, text, boolean)` in place of the three-parameter one; nothing else about this script's functions.

### Task 9: Record the decisions

**Files (in `~/Dev/Crewluve Website`):**
- Modify: `docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`, and this plan

- [ ] **Step 1: Add the planning decisions to the spec**

At the end of the spec, after §13, add `## 14. Decisions made while planning plan 1`, followed by this plan's "Decisions made while planning" list, copied as it stands, then any changes from the review (Task 7) and the setup's results (Task 8). Then update its status line.

In `~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`, replace:

```markdown
- **Status:** design approved in brainstorming on 2026-10-23, and the user approved this spec the same day. Plan 1, Crewlu Cloud, is written and checked (`docs/superpowers/plans/2026-10-23-partner-alert-pushes-1-cloud.md`); plans 2 and 3 follow (§13).
```

with:

```markdown
- **Status:** design approved in brainstorming on 2026-10-23, and the user approved this spec the same day. Plan 1, Crewlu Cloud, is built and set up (`docs/superpowers/plans/2026-10-23-partner-alert-pushes-1-cloud.md`, §14). Next: plan 2, Crewluve 1.3.
```

- [ ] **Step 2: Point the older specs to this one**

These are spec §11's changes to other docs. In `~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-15-partner-links-design.md`, replace:

```markdown
| D8 | **Alerts:** a cloud push service sends the same kind of silent wake-up iCloud sends today. Crewluve's alert logic is unchanged. |
```

with:

```markdown
| D8 | **Alerts:** a cloud push service sends the same kind of silent wake-up iCloud sends today. Crewluve's alert logic is unchanged. *Changed by the alert pushes* (`docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`): Crewlu Cloud picks the alerts with Crewluve's rules and sends alert pushes, whose words Crewluve 1.3 writes. |
```

In the same file, replace:

```markdown
- **The honest limit is the same as today:** iOS decides when to deliver background wake-ups and may hold some back.
```

with:

```markdown
- **The honest limit is the same as today:** iOS decides when to deliver background wake-ups and may hold some back. The alert pushes (`docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`) take alerts out of that limit.
```

In `~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md`, replace:

```markdown
- **Silent pushes only.** Crewluve decides what to show, as it does today.
```

with:

```markdown
- **Silent pushes only.** Crewluve decides what to show, as it does today. Since the alert pushes (`docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`), a Crewluve that shows them gets alert pushes instead.
```

In the same file, replace:

```markdown
- Pushes with visible alerts, Live Activities or time-sensitive notifications.
```

with:

```markdown
- Pushes with visible alerts, Live Activities or time-sensitive notifications. Visible alerts came later, with the alert pushes (`docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`).
```

In `~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md`, replace:

```markdown
Alert pushes that iOS shows by itself would remove the dependence. That's a design of its own, not piece 4's.
```

with:

```markdown
Alert pushes that iOS shows by itself would remove the dependence. That's a design of its own, not piece 4's: the alert pushes, `docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`.
```

- [ ] **Step 3: Tick this plan and commit**

Run:

```bash
cd ~/"Dev/Crewluve Website" && git add docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md docs/superpowers/specs/2026-10-15-partner-links-design.md docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md docs/superpowers/specs/2026-10-18-partner-links-piece4-crewluve-design.md docs/superpowers/plans/2026-10-23-partner-alert-pushes-1-cloud.md && git commit -q -m "Plan 1 of the alert pushes built: Crewlu Cloud; the spec records the planning decisions, and the older specs point to it" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit. Don't push.

### Task 10: Finish

**Files:** none.

- [ ] **Step 1: Ask how to merge**

Ask the user one question: merge `feature/partner-alert-pushes` into `feature/supabase-account-backend` now? It changes only `supabase/`, so no CrewLu build changes. If yes, and `~/Dev/Duty` is still on `feature/supabase-account-backend` with only the scheme lines changed, run `git -C ~/Dev/Duty merge --ff-only feature/partner-alert-pushes`, which works while the release line is still `7b3aeb2d`. Then `cd ~/Dev/Duty/supabase/tests && npm test` should give Task 7's count. If the release line moved on, ask before making a merge commit instead. `feature/partner-cloud-screens` gets this the next time it takes in the release line.

- [ ] **Step 2: Remove the worktree**

Only once the branch is merged: `rm -rf ~/Dev/Duty-alert-pushes/supabase/tests/node_modules && git -C ~/Dev/Duty worktree remove ~/Dev/Duty-alert-pushes && git -C ~/Dev/Duty branch -d feature/partner-alert-pushes`. If it's kept apart, keep the worktree.

- [ ] **Step 3: Push only with a fresh yes**

Ask separately before each push: `feature/supabase-account-backend` (or `feature/partner-alert-pushes`, if kept apart) in `~/Dev/Duty`, and `main` in `~/Dev/Crewluve Website`.

---

## Execution notes

Filled in during the build: any place the code ends up different from the printed blocks, and why, and the setup's results.

- **Tasks 0–6, 2026-10-23:** applied by a script from the plan's own steps, the same steps the replay checked. Every Run step gave the printed result, test-first failures included, and the branch's committed tree is the replay's (`c8e79191`). The worktree `~/Dev/Duty-alert-pushes` is on `feature/partner-alert-pushes` at `445b521b`, six commits on `7b3aeb2d`. `~/Dev/Duty` stayed on `feature/supabase-account-backend`, with only its scheme lines changed.
- **Task 7, step 1:** `ℹ tests 259`, `ℹ pass 259`, `ℹ fail 0`.
- **Before Task 8, a read-only look at Crewlu Cloud (2026-10-23):** it has exactly the four functions the script replaces, under piece 1's and piece 3's signatures. None of the script's new columns, its table or its two private functions is there, and piece 3's two cron jobs are. The four functions' `pg_get_functiondef` fingerprints (MD5) equal a database built from the migrations up to piece 3, so the undo would restore exactly what's live.
- **Task 7, step 2 (2026-10-23):** a read-only reviewer read `7b3aeb2d..445b521b`, this plan, the spec and Crewluve's rules, ran the suite and two scratch probes. It found the rules faithful to Crewluve's and the code word for word the plan's, and judged it ready with fixes: one critical finding, one important, eight minor, and a question for before plan 2 (the last bullet).
- **Task 7, step 3: where the code now differs from the printed blocks.** Each fix was made test-first and committed with its paths, on `445b521b`, up to `963a7562`. `npm test`: 267 of 267.
  - **`4ebf16ca` (critical):** one pilot's badly shaped summary (legs `[null]`, or `{}`) threw in the rules and ended the whole run with a 502, after the claim had already cleared every pilot. Any signed-in account could keep every pilot's pushes stopped that way. Now `readable()` checks what CloudSummary's decoding needs: the four required fields, and legs that are objects with an id, a type, a start and an end. A summary that fails it alerts nothing, as in Crewluve. Each pilot's pushes are also worked out on their own, so one that still throws loses only its alerts; its partners' 1.2 devices still get their silent pushes.
  - **`53849dec`, `a349bd11` (important; changes decision 7 and spec §5.2):** a device counted as "joined since the last run" got no alerts for the next change, however long after joining it came. 1.3 stops making its own alerts once it's registered, so its first real alert after connecting was lost. Now claim passes the summary's `updated_at`, and only a device that joined after the change was written is left out (`joined_after`), since it read that summary on connecting. A device that joins between two writes in the same 15 seconds can get an alert for the first again.
  - **`497836c8`:** `pushed_status` moved on to every summary. Crewluve keeps its snapshot when a summary isn't newer than it, or when it can't decode one. So a pilot's device sending an older summary late could make the next change alert twice, and a summary Crewluve can't read made the next one alert nothing. Now the claim and the check's clearing keep it through `private.push_baseline`. Its `private.push_readable` says what `readable()` says, and a test runs both over 20 shapes. The undo drops both. Two things are accepted, not fixed:
    - **1.2's silent pushes:** a 1.2 device's `changed` is compared with the same summary. So after an older summary, a later one equal to the one kept sends 1.2 nothing. Its own alerts don't change, and it refreshes on opening.
    - **The time the alerts use:** `before_at` stays the last run's time even when the summary compared with is older.
  - **`1f0e68db`:** the retry list kept a bare token. A retried push could still reach a phone for up to an hour after its partner left, or after its token moved to a device of another pilot's partner, where Crewluve would write the alert from the wrong summary. Now claim hands out each device's id (`device`), every push and retry carries it, and `partner_push_retries` keeps it in `device_id`. The claim hands a retry out only while that device still holds that token. There's no foreign key: the claim deletes every row each run.
  - **`83d6b257`:** only the claim cleared the retry list, so while partner-push kept failing before it claimed, every check called it again. Now the check drops the retries past their time first.
  - **`34800e71`:** the undo's header and `partner-api.md` say that once 1.3 is out, an undo leaves it with no pushes: its registration passes `p_alerts`, which piece 1's `partner_set_push` doesn't take, so it answers 404. For plan 2: the registrar could register again without `p_alerts` on a 404, and keep making its own alerts.
  - **`963a7562`:** the tests' README said 258; it says 267.
  - **Left for later:**
    - **(4)** a retried alert can show twice when Apple delivered it but the answer timed out. An `apns-collapse-id` per alert, kept on the retry list, would fix it.
    - **(6)** the claim sends both views for partners with no alert device.
    - **(10)** a 1.2 device gets no silent push when only the time changed what its rules would say.
  - **For the user, before plan 2:** an ordinary trip's end alerts "Trip was cancelled", because CrewLu clears `currentTripId` when a trip ends. Crewluve's own Swift rules and partner-push's give the same alerts, checked in the harness with scratch cases:
    - **No trip after it:** `trip-cancelled` and `home`.
    - **Another trip scheduled:** also `home-later`, "Getting home later — now 5:23 AM", which is the next trip's arrival four days on.
    - **The next trip starting:** `new-trip`, "Has a new 2-day trip".

    Crewluve 1.2 does this today, often late. 1.3's alert pushes would bring it on time.
- **Task 7, the re-check (2026-10-23):** the same reviewer read `445b521b..963a7562`, reran its probes and added three. Verdict: the setup can go ahead. Every finding is closed with tests, and nothing new is critical or important. Both of fix 5's accepted trade-offs are sound, and 4, 6 and 10 can wait:
  - **(4):** no alert pushes go out until 1.3 registers `p_alerts`, and the fix needs partner-push alone.
  - **(6):** one account's 25 partners at just under 1 MB each make a claim of about 46 MB. partner-push reads it in about 0.5 s of CPU and 45 MB of memory, under Supabase's limits.
  - **(10):** CrewLu's write after a landing also changes `displayStatus`.

  Four new minor findings, and what came of them (268 tests):
  - **`1dd0c60f`:** the undo's test listed only the six older functions. It also lists `push_readable` and `push_baseline` now, and fails when the undo leaves them (checked by leaving them out).
  - **`116b23fb`:** since `push_baseline` keeps the newer summary, one written while a pilot's phone clock ran ahead would make every later summary "not newer" until that date came. Now a summary kept that's dated more than an hour past the run's time stops counting as newer, so the next one replaces it. `push_baseline` takes the run's time. The first summary after the clock is put right still alerts nothing, since the rules' own "is it newer" check skips it, as Crewluve's does; the ones after it alert as usual. The reviewer's version, never keeping a summary dated ahead, would alert the same news on every write while the clock was wrong.
  - **Also in `116b23fb`:** `partner-api.md` now says what's passed over more exactly (a summary missing what Crewluve needs to read it), and the claim's header is rewrapped.
  - **Task 8 Step 7:** it now checks that every live summary passes `private.push_readable`.
