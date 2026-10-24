# Partner Links Piece 3: the Push Service

- **Status:** approved by the user on 2026-10-18, built and set up on Crewlu Cloud (`docs/superpowers/plans/2026-10-18-partner-links-piece3-push.md`).
- **Part of:** the partner-links design, `docs/superpowers/specs/2026-10-15-partner-links-design.md`, §6.1 and §9 (piece 3).
- **Repo:** CrewLu, `~/Dev/Duty`, in `supabase/` only, on a new branch off `feature/supabase-account-backend` (§11).
- **Contract:** `~/Dev/Duty/supabase/partner-api.md`, the partner door from piece 1. This piece adds its "Pushes" section (§12).

---

## 1. Goal

When a pilot's status changes, wake their partners' Crewluve so it can read the new status and alert, as iCloud's pushes do today. Partners who move to Crewlu Cloud (piece 4) otherwise lose background alerts, so this piece must be live before piece 4 ships.

- **At most one push per pilot every 15 seconds,** and the last change in a burst always gets one.
- **Silent pushes only.** Crewluve decides what to show, as it does today. Since the alert pushes (`docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`), a Crewluve that shows them gets alert pushes instead.
- **Nothing visible changes** in CrewLu or Crewluve with this piece alone.

## 2. What's there now (checked 2026-10-18)

- **Piece 1 marks the pilot as due.** Every applied write of `set_partner_status` sets `partner_status.push_due = true`; a write refused by the build guard doesn't. `last_push_at` is unused so far.
- **Piece 1 stores each Crewluve app's push token.** `partner_set_push` saves it in `private.partner_device_secrets` (`push_token` in hex, `push_env` `sandbox` or `production`), for `app` devices only. A token moves to the newest device that registers it.
- **Crewlu Cloud** (project `corxvurxpnrzekbxdgye`):
  - `pg_cron` 1.6.4 and `pg_net` 0.20.3 are available, not installed;
  - `supabase_vault` 0.3.1 and `pgcrypto` are installed;
  - there are no Edge Functions;
  - the Supabase connection Claude has is read-only, so the user applies SQL in the SQL editor, as in piece 1.
- **This Mac** has no Supabase CLI and no Deno. Node is 23.11, which runs TypeScript by stripping its types.
- **Crewluve** (`~/Dev/Crewluv`): its bundle id is `com.ToddAnderson.Crewluv`; its background modes include `remote-notification`; today it gets iCloud's silent pushes (`CloudKitSubscriptionManager`).
- **HTTP/2.** Apple's push service (APNs) accepts only HTTP/2. Deno's `fetch` uses HTTP/2 whenever the server offers it, but no report was found of it being used against APNs from Supabase's runtime. §9's check settles this at setup.

## 3. Decisions (brainstorm, 2026-10-18)

1. **Deployed by pasting** (the user's choice): partner-push is one self-contained file the user pastes into Supabase's function editor, and the SQL is one script for the SQL editor. Nothing gets installed.
2. **On as soon as it's built and reviewed** (the user's choice), before piece 4. It sends nothing until a new Crewluve registers, and piece 4's test builds get real pushes from the start.
3. **Check first, call when needed** (the user's choice). Every 15 seconds a small database check looks for due pilots and calls partner-push only when there's one. This refines the umbrella's §6.1, where the job calls the function every 15 seconds: that would be about 173,000 calls a month with nothing to do.

## 4. The parts

| Part | Where | What it does |
|---|---|---|
| The 15-second check, `private.partner_push_tick()` | SQL script | Clears due pilots nobody can be woken for, and calls partner-push if anyone is still due |
| `public.partner_push_claim(p_secret, p_probe)` | SQL script | Hands partner-push the due pilots' Crewluve tokens, clearing their marks in the same step |
| `public.partner_push_report(...)` | SQL script | Drops dead tokens, marks pilots due again, and keeps the signing token |
| The password, Vault secret `partner_push_secret` | SQL script | 32 random bytes the script makes. Claim and report refuse calls without it |
| The address, Vault secret `partner_push_url` | SQL script | partner-push's address, for the check |
| `private.partner_push_state` | SQL script | One row: the APNs signing token and when it was made |
| `private.partner_push_probe()` | SQL script | The setup check (§9) |
| Two `pg_cron` jobs | SQL script | `partner-push` every 15 seconds; `partner-push-history` once a day |
| partner-push | `supabase/functions/partner-push/index.ts` | Signs, sends the silent pushes, and reports |

The SQL lives in one new migration in `supabase/migrations/`, which also turns on `pg_cron` and `pg_net`.

## 5. The database

### 5.1 The check

`pg_cron` runs `select private.partner_push_tick()` every 15 seconds. The function:
1. clears `push_due` for due pilots with no `app` device holding a push token, so they don't call partner-push for nothing;
2. if any pilot is still due, calls partner-push with `net.http_post`: the address from the Vault, the password in an `x-partner-push-secret` header, the body `{}`, and a 30-second timeout.

The call carries no tokens: `pg_net` keeps its requests and answers in the database for a few hours, so partner-push fetches the tokens itself. A second call while one is still running is harmless (§7).

### 5.2 Claim

`partner_push_claim(p_secret text, p_probe boolean default false)` returns `jsonb`.
- **The password:** if `p_secret` doesn't match `partner_push_secret`, it raises an error and changes nothing.
- **Taking the due pilots:** in one statement, it sets `push_due = false` and `last_push_at = now()` on every due pilot, and returns, for each of their partners' `app` devices with a token, the pilot's id, the token and its `push_env`. Each due pilot is taken by exactly one claim.
- **The signing token:** it also returns the stored one, if it's under 40 minutes old.
- **With `p_probe`:** it checks the password and returns the signing token, but takes nobody.

### 5.3 Report

`partner_push_report(p_secret text, p_dead_tokens text[], p_retry_pilots uuid[], p_signing_token text)`, after the same password check:
- clears `push_token` and `push_env` wherever the token is one of `p_dead_tokens`;
- sets `push_due = true` for `p_retry_pilots`, so the next check sends to them again;
- when `p_signing_token` isn't null, stores it with the current time.

### 5.4 The cron history

`pg_cron` logs every run in `cron.job_run_details`, about 5,800 rows a day for the check. The `partner-push-history` job deletes this piece's rows older than a day, once a day.

### 5.5 Who can call what

- Claim and report: `service_role` only, which partner-push uses. The password limits them further to calls the check set off.
- The check and the probe: no client role. `pg_cron` runs them as `postgres`.
- Every function is `security definer` with `set search_path = ''`, as in piece 1.

## 6. partner-push

One file, `supabase/functions/partner-push/index.ts`, with no imports, so it can be pasted whole. It uses `fetch` and Web Crypto. Its tests import the same file under Node, so it calls `Deno.serve` only when `Deno` exists.

### 6.1 Its settings

- Set by the user as the function's secrets: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` (the `.p8` file's text) and `APNS_TOPIC` (`com.ToddAnderson.Crewluv`).
- Supplied by Supabase: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, for calling claim and report.
- "Verify JWT" is off: the check has no sign-in to send, and the password guards the function instead.

### 6.2 Each run

1. Read `x-partner-push-secret` and call claim with it. If claim refuses, answer 401 and stop.
2. If nothing was claimed, answer and stop.
3. **The signing token:** use claim's, or make a new one if it gave none. A new token is an ES256 JWT with `kid` = `APNS_KEY_ID`, `iss` = `APNS_TEAM_ID` and `iat` = now, signed with the `.p8` key. Apple rejects tokens over an hour old and turns away senders who renew more often than every 20 minutes. Keeping the token in the database for 40 minutes stays inside both limits, even when the function restarts.
4. **Send** one push per device, up to 10 at a time, each with a 10-second timeout:
   - `POST https://api.push.apple.com/3/device/<token>` for `production`, or `https://api.sandbox.push.apple.com/3/device/<token>` for `sandbox`;
   - headers `authorization: bearer <token>`, `apns-topic`, `apns-push-type: background`, `apns-priority: 5`, and `apns-expiration` an hour ahead;
   - body `{"aps":{"content-available":1}}`.
5. **Sort Apple's answers** (§7).
6. **Report** the dead tokens, the pilots to retry, and the signing token if it's new.
7. **Answer with counts:** sent, dead, retried and failed. Logs never include tokens.

### 6.3 The probe

Called with the body `{"probe": true}` and the password, partner-push calls claim with `p_probe`, sends one push to a made-up token (64 zeros) on the sandbox host, and answers with Apple's status and reason. It reports a new signing token, and nothing else.

## 7. Failures

| What happens | What partner-push does |
|---|---|
| 200 | Sent |
| 400 `BadDeviceToken`, or 410 | Dead: the token is dropped. Crewluve sends a fresh one the next time it opens |
| 403 `ExpiredProviderToken` | Makes a new signing token and tries that push once more |
| 403 `InvalidProviderToken`, or 400 `BadTopic`, `TopicDisallowed`, `MissingTopic` or `DeviceTokenNotForTopic` | The setup is wrong: logged, not retried, so it doesn't repeat every 15 seconds. No token is dropped: a wrong bundle id gets `DeviceTokenNotForTopic` from every device, and dropping on it would wipe every partner's token |
| 429, 500, 503, a timeout or a network error | Temporary: the pilot is marked due again, so the next check, 15 seconds later, tries again. Their other devices get that push too, which is harmless |
| Any other answer | Logged, not retried |

- **partner-push can't be reached:** the pilot stays due, and the next check calls again. Nothing is lost.
- **partner-push stops after claiming:** those pilots miss that one push, and their next change sends another. Crewluve also refreshes when it opens, and every 60 seconds while it's open (umbrella §6.2).
- **Two runs at once:** each claim takes different pilots, so nobody gets the same push twice.
- **iOS's limit:** it decides when to deliver silent pushes and holds some back, as with iCloud's pushes today (umbrella §6.1).

## 8. Security

- **Tokens stay inside Crewlu Cloud.** Only claim hands them out, and only to partner-push. They aren't logged, and they don't travel in the check's request.
- **The password** is made in the database by the SQL script and stored in the Vault. Nobody sees it or types it.
- **The Apple key** is only in partner-push's secrets, which the user sets. Claude never sees it.
- **Calling partner-push without the password** does nothing, and claim and report can't be called by any app. Anyone who finds its address can still cost an invocation per call, as with any public function.

## 9. Setup, by the user

The plan gives each step click by click.

1. **An Apple push key.** In the Apple Developer account, under Keys, create one with Apple Push Notifications service, or reuse an existing one, since a key works for every app in the team. Download its `.p8` file (Apple allows one download) and note its Key ID and the Team ID.
2. **partner-push.** In Supabase, create the function in the editor, paste the file, turn "Verify JWT" off, and deploy.
3. **Its secrets:** `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` and `APNS_TOPIC`.
4. **The SQL script,** pasted into the SQL editor and run. The 15-second check starts at once.
5. **The probe**, in the SQL editor: run `select private.partner_push_probe();`, then read the answer from `net._http_response` a few seconds later.
   - `400 BadDeviceToken` proves the key, the Team ID and the HTTP/2 connection.
   - `TopicDisallowed` or `BadTopic` means a wrong bundle id; `InvalidProviderToken` means a wrong key or Team ID.
   - A connection or protocol error means Supabase's `fetch` couldn't reach Apple over HTTP/2. partner-push then moves to Deno's `node:http2` module, and the probe runs again.

   The bundle id is fully proven by piece 4's first real push.
6. **The check is running:** the last few `cron.job_run_details` rows for `partner-push` show it succeeding every 15 seconds.

## 10. Testing

- **The database**, with piece 1's local test setup (PGlite, run with `node --no-maglev --test`). Stand-ins replace the Vault, `net.http_post` and `pg_cron`, which PGlite doesn't have, and record what they're given.
  - The check: it calls only when a pilot with a token is due, clears due pilots without one, and sends the address and the password.
  - Claim: it refuses a wrong or missing password; it takes each due pilot once and sets `last_push_at`; it returns only `app` devices' tokens, with their `push_env`; it returns the signing token only while it's under 40 minutes old; with `p_probe`, it takes nobody.
  - Report: it drops dead tokens wherever they are, marks pilots due again, and keeps a new signing token.
  - The script schedules both jobs, and no client role can call the check, the probe, claim or report.
- **partner-push**, under Node against the same file, with stand-ins for Apple, claim and report:
  - the signing token, made with a throwaway test key and verified;
  - each push's address, headers and body, for both hosts;
  - each of §7's answers;
  - a refused password (401, no pushes), a reused and a renewed signing token, `ExpiredProviderToken` (one renewal, one retry), and the probe.
- **Deliberate breaks:** each part broken on purpose, one change at a time, and a test must catch every one, as in pieces 1 and 2.
- **A separate review** before anything goes onto Crewlu Cloud.
- **After setup:** §9's steps 5 and 6. Real pushes to a phone are tested in piece 4.

## 11. Building and releasing

- **The branch:** a new branch off `feature/supabase-account-backend`, with changes only in `supabase/`, so no CrewLu build is affected. It merges back after the setup's checks pass. Each push gets its own yes.
- **Going live** is the user's setup (§9), right after the review (decision 2).
- **No app release.** Piece 4 makes Crewluve register its token and handle the push.

## 12. Changes to other docs

- **`supabase/partner-api.md`** gets a "Pushes" section for piece 4:
  - a push is silent (`content-available`, no alert), and means "call `partner_view`";
  - Crewluve calls `partner_set_push` on every launch, once it has a token: `sandbox` for Debug builds, `production` for TestFlight and the App Store;
  - tokens Apple rejects are dropped on the server;
  - pushes come at most every 15 seconds per pilot, and iOS may hold some back.
- **The umbrella's §9** gets a line pointing to this spec.

## 13. Not in piece 3

- Crewluve registering its token and handling the push (piece 4).
- Pushes with visible alerts, Live Activities or time-sensitive notifications. Visible alerts came later, with the alert pushes (`docs/superpowers/specs/2026-10-23-partner-alert-pushes-design.md`).
- The website, which polls (umbrella §6.2).
- Per-partner push settings.
- Realtime pings for open screens (umbrella §11).

## 14. Decisions made while planning

The plan is `docs/superpowers/plans/2026-10-18-partner-links-piece3-push.md`. Its Execution notes give each change below by commit.

### 14.1 The plan's decisions

These refine §3–§12. They're copied as the plan has them.

1. **The tests' shim stands in for `pg_cron`, `pg_net` and the Vault,** which PGlite doesn't have (spec §10): the same schemas, and the signatures the migration calls, keeping what they're given. Nothing runs on a schedule, no request leaves, and secrets aren't encrypted. The migration creates the two extensions only where Postgres has them.
2. **One script, run once.** A second run fails at its `create table` and changes nothing, because the SQL editor runs a script as one transaction. Its undo is in its header, as in piece 1, and the tests run that undo.
3. **The password and the address are Vault secrets the script makes:** `partner_push_secret`, 32 random bytes, and `partner_push_url`. Claim and report raise SQLSTATE `28000` on a wrong or missing password, which PostgREST answers with 403; partner-push then answers 401. A missing password never matches, even if the Vault loses its secret.
4. **The check and the probe share one caller,** `private.call_partner_push(body)`: the address and the password from the Vault, a 30-second timeout, and the body `{}` or `{"probe": true}`. Neither sends a token.
5. **The cron history:** at 04:17 UTC, the `partner-push-history` job deletes the runs of this piece's two jobs that ended over a day ago, and no other job's.
6. **partner-push uses the default secret key from `SUPABASE_SECRET_KEYS`, in the `apikey` header only.** This refines spec §6.1, which names `SUPABASE_SERVICE_ROLE_KEY`. Supabase stops the legacy keys at the end of 2026, Crewlu Cloud already has the new keys (CrewLu uses its publishable key), and Supabase refuses a new secret key in `Authorization`.
7. **The settings are checked before claiming.** A missing setting, or an `APNS_PRIVATE_KEY` that isn't a key, answers 500 by name and claims nobody, so no push is lost and the probe shows the problem at setup. While it's broken, a due pilot makes the check call every 15 seconds, which the function's logs show.
8. **A new signing token is kept only if Apple accepted it.** If Apple answers `InvalidProviderToken` or `ExpiredProviderToken` to it, it isn't reported, so a fixed key or Team ID takes effect at the next run, not up to 40 minutes later. This refines spec §6.2 step 6 and §6.3.
9. **At most one renewal per run** (spec §7). `ExpiredProviderToken` on the stored token makes one new token for the whole run, and each push it turned down is sent once more with it. A token made in the same run that Apple calls expired isn't renewed again: that push counts as failed.
10. **Report is called only when there's something to report:** dead tokens, pilots to try again, or a new signing token.
11. **The logs:** one line per run with the counts, and one per push that failed or will be tried again, with Apple's status and reason. An error's message isn't logged, because Deno's fetch errors name the address, and so the token. The probe's answer shows the whole message and its cause, since its token is made up.
12. **partner-push reads its settings on every call,** so a changed secret is used at once, with no redeploy.
13. **Built in a worktree, `~/Dev/Duty-partner-push`,** on the new branch `feature/partner-push` (spec §11). `~/Dev/Duty` stays on the release line for archiving, and Xcode never sees the branch. The worktree's tests use a copy of `~/Dev/Duty`'s test packages, so nothing is downloaded.
14. **The Apple key is for Crewluve only, in both environments** (`Sandbox & Production`, `Topic Specific`, `com.ToddAnderson.Crewluv`), so a leaked key can't send to other apps. Debug builds register `sandbox` tokens and TestFlight and the App Store `production` ones, so it needs both. An existing key that covers both and Crewluve works too (spec §9 step 1).
15. **The privileges guard checks RLS on every private partner-links table,** as a second lock. `partner_push_state` has it on, as piece 1's private tables do.

### 14.2 Changes from the review

A read-only review of the built branch found nothing Critical and one Important issue; its re-check found the fixes right. Taken:

- **A stored signing token must name the current key and team** (the Important issue). Otherwise a key changed during setup kept signing with the old one for up to 40 minutes, and the probe kept giving the old key's answer. A token made in a run that no push got an answer for isn't kept either. This refines decision 8: a new token is kept only once Apple has answered a push and turned it down for none.
- **The probe tries both of Apple's services** (refines §6.3): a push to the made-up token on `api.sandbox.push.apple.com` and on `api.push.apple.com`, answered as `{"probe":{"sandbox":{…},"production":{…}}}`, so a key made for one environment only shows at setup.
- **Retries stop an hour after the status changed** (refines §7): report marks a pilot due again only while `partner_status.updated_at` is under an hour old. A change that old isn't worth a wake-up, and a push Apple held for a phone that's off would have expired.
- **Smaller fixes:** strict TypeScript 5.9; a 20-second timeout on each call to Crewlu Cloud; the setup's two 500s are logged (decision 7); the last catch-all logs only an error's name (decision 11); a test that the renewal sends at most 10 at a time; the contract's note that a push token's environment follows the build's provisioning profile (`aps-environment`), not Debug or Release.
- **Left for later:** tests that the timeouts in use are the constants; a partial index on `push_due`; keeping the last run's result in SQL; dropping a `DeviceTokenNotForTopic` token when the same run proved the topic.

### 14.3 The setup, 2026-10-18

- **The Apple key is Team Scoped** (decision 14, as built): Apple offers Topic Specific only for a key with one environment, and partner-push needs one key for both. Key ID `GBMNP339CQ`, Sandbox & Production.
- **The probe** answered `400 BadDeviceToken` on both services: the key, the Team ID and HTTP/2 from Supabase's `fetch` all work, so partner-push stays on `fetch` (§9 step 5).
- **The check** runs every 15 seconds and succeeds. The security advisor shows only the expected `rls_enabled_no_policy` INFO for `private.partner_push_state`.
- **Two setup slips the steps now warn about:** the dashboard names a new function itself unless **Function Name** is set before deploying, and a secret's value is the file's text, not its name.
