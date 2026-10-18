# Partner Links Piece 3: the Push Service — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a pilot's status changes, Crewlu Cloud wakes their partners' Crewluve with a silent push through Apple, at most once every 15 seconds per pilot, so partners who move to Crewlu Cloud (piece 4) keep their background alerts.

**Architecture:**
- **A small check, every 15 seconds.** `pg_cron` runs `private.partner_push_tick()`. It clears due pilots nobody can be woken for, and if anyone is still due, calls the Edge Function partner-push through `pg_net`, with a password from the Vault. The call carries no tokens.
- **Two RPCs only partner-push can use.** `partner_push_claim` hands partner-push the due pilots' Crewluve tokens and clears their marks in one statement. `partner_push_report` drops dead tokens, marks pilots due again, and keeps the signing token. Both need the password and the secret key.
- **partner-push is one file with no imports,** pasted into Supabase's editor. It signs an APNs token with the `.p8` key (reused for 40 minutes), sends up to 10 silent pushes at a time, sorts Apple's answers, and reports back. Its tests import the same file under Node, with stand-ins for Apple, and then against the real SQL in PGlite.
- **Set up by the user:** the Apple key, the function and its secrets, the SQL script, and a probe that proves the key, the Team ID and HTTP/2 against Apple's test service.

**Tech stack:** Postgres 17 on Supabase with `pg_cron`, `pg_net` and the Vault; a Supabase Edge Function in TypeScript on Deno, using `fetch` and Web Crypto; APNs token authentication over HTTP/2. Tests: PGlite 0.5.8 and Node 23's test runner.

**Design:** `docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md` in this repo, part of the partner-links design (`docs/superpowers/specs/2026-10-15-partner-links-design.md`, §6.1 and §9). The API contract is `supabase/partner-api.md` in CrewLu.

---

## Before you start

- **Two repos.**
  - The code goes in CrewLu, on the new branch `feature/partner-push`, in a worktree beside `~/Dev/Duty`: `~/Dev/Duty-partner-push` (Task 0, decision 13).
  - This plan and the spec live in `~/Dev/Crewluve Website`.
  - Paths are relative to `~/Dev/Duty-partner-push` unless they start with `~`.
- **Only `supabase/` changes,** so no CrewLu build is affected. `~/Dev/Duty` stays on `feature/supabase-account-backend`, where the user archives, and Xcode never sees the branch.
- **Leave `~/Dev/Duty`'s Xcode scheme files alone.** It has uncommitted changes to `Duty.xcodeproj/xcshareddata/xcschemes/*` that aren't part of this work. Never run `git add -A` or `git add .`: add the exact paths each step lists.
- **The tests need only Node.** They run in PGlite, Postgres compiled to WebAssembly, from `supabase/tests` with `npm test`, which is `node --no-maglev --test` (without the flag, Node 23.11 can deadlock under the test runner). No Xcode, no simulator, no Docker, no Deno, and no connection to Crewlu Cloud or Apple. Claude runs them.
- **Crewlu Cloud changes only in Task 12, by the user.** Claude's Supabase connection is read-only. The user creates the Apple key and sets partner-push's secrets: Claude never handles the key (spec §8).
- **Shell variables don't carry from one command to the next** in Claude's Bash tool, so every command here names its folder.
- **If an expected value doesn't match, stop and ask.** Never change a test to make it pass.

## Decisions made while planning

These refine the spec. Task 13 writes them into it.

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

## The four questions

- **Is this wise?**
  - Without it, partners who move to Crewlu Cloud lose iCloud's pushes, and with them their background alerts. Piece 4 can't ship before it.
  - Checking first keeps it cheap: partner-push runs only when someone can be woken, not 173,000 times a month (spec decision 3).
  - Nothing visible changes now, and nothing is sent until piece 4's Crewluve registers.
- **Will it break anything?**
  - *CrewLu:* no code changes, and no build is affected. `set_partner_status` already marks pilots due (piece 1).
  - *Crewlu Cloud:* a table, two RPCs, five private functions, two Vault secrets and two cron jobs, all new. The check is one small query every 15 seconds, and its history is kept to a day. Piece 1 changes in nothing, and the undo removes it all.
  - *Security:* claim and report need the service role and the password; the check's call carries no tokens; the logs never hold one; the Apple key lives only in partner-push's secrets. Anyone who finds partner-push's address can cost an invocation, as with any public function, but nothing more (spec §8).
  - *Costs:* an Edge Function invocation only when a pilot whose partner has a new Crewluve is due, at most one every 15 seconds.
  - *A broken setup* claims nobody (decision 7), and Apple-side setup errors aren't retried, so they don't repeat every 15 seconds.
- **Is this what a brilliant Apple engineer would do?** Token-based APNs auth with one signing token reused inside Apple's limits, silent background pushes at priority 5 as Apple requires for `content-available`, an hour's expiry, and dead tokens dropped on Apple's word. The setup's probe proves the key against Apple before any partner depends on it.
- **Does it fix the disease or the symptom?** The disease is that background alerts depend on iCloud's share. This gives Crewlu Cloud its own push path, so moving partners off iCloud loses nothing.

## Not in this plan

- Crewluve registering its token and handling the push (piece 4). Real pushes to a phone are first seen there.
- Moving partner-push to Deno's `node:http2`: only if the probe shows Supabase's `fetch` can't reach Apple over HTTP/2 (spec §9).
- Visible alerts, Live Activities and time-sensitive notifications; per-partner push settings; the website, which polls; realtime pings for open screens (spec §13).

## How this plan was checked

- **Built test-first in a scratch clone** of `71c1b29a`, outside `~/Dev/Duty`. Each task's tests failed first, as printed, then passed.
- **The tests:** all 222 pass, and 137 of 139 deliberate breaks were caught, one at a time, in the migration and in partner-push. The two it missed take out claim's and report's explicit grants to `service_role`. Supabase's default privileges already give `service_role` every new function in `public`, as the shim does, so nothing can tell them apart: the grants are there to say so, as piece 1's are.
- **A replay on a fresh clone of `71c1b29a`:** every Run step gave the result printed here, including each test-first failure, and every file matched the scratch copy byte for byte.
- **Not checked here:** Apple, Supabase's Deno, `pg_cron` and `pg_net` themselves. The setup's probe and check (Task 12) are where they're proven.

## Files

In CrewLu (`~/Dev/Duty-partner-push`):

| File | Responsibility |
|---|---|
| `supabase/migrations/20261018120000_partner_links_push.sql` | The check, claim, report, the password and the address, the signing token's table, the probe, the two jobs, and the undo |
| `supabase/functions/partner-push/index.ts` | partner-push: signing, the pushes, Apple's answers, the probe, and its settings |
| `supabase/tests/helpers/supabase_shim.sql` (changed) | Stand-ins for `pg_cron`, `pg_net` and the Vault |
| `supabase/tests/helpers/db.js` (changed) | `asService` |
| `supabase/tests/smoke.test.js` (changed) | The stand-ins' own test |
| `supabase/tests/privileges.test.js` (changed) | The service RPCs, the new private table, and RLS on private tables |
| `supabase/tests/push_service.test.js` | The SQL's tests |
| `supabase/tests/partner_push.test.js` | partner-push's tests, with stand-ins and against the real SQL |
| `supabase/partner-api.md` (changed) | The "Pushes" section, and the undo's order |
| `supabase/tests/README.md` (changed) | What the tests stand in for, and the count |

In `~/Dev/Crewluve Website`: this plan, ticked as it goes, and the piece 3 spec (Task 13).

---

### Task 0: Check CrewLu's checkout and make the worktree

**Files:** none. A worktree for the new branch, beside `~/Dev/Duty` (decision 13).

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

Expected: `71c1b29a docs(plan): a re-import can put back crew another device took off…`, 3.0.2's build 199. If it differs, stop and ask: this plan was checked against `71c1b29a`.

- [x] **Step 3: Make the worktree, on a new branch**

This adds a folder, `~/Dev/Duty-partner-push`, and the branch `feature/partner-push`. It changes nothing in `~/Dev/Duty`: its branch, its files and Xcode stay as they are.

Run:

```bash
git -C ~/Dev/Duty worktree add -q -b feature/partner-push ~/Dev/Duty-partner-push 71c1b29a && git -C ~/Dev/Duty-partner-push log --oneline -1
```

Expected: `71c1b29a docs(plan): a re-import can put back crew…`.

- [x] **Step 4: Copy the test packages and run the tests**

The packages are ignored by git, so the worktree has none. Copying `~/Dev/Duty`'s means nothing is downloaded.

Run:

```bash
cp -R ~/Dev/Duty/supabase/tests/node_modules ~/Dev/Duty-partner-push/supabase/tests/ && cd ~/Dev/Duty-partner-push/supabase/tests && npm test
```

Expected: `ℹ tests 172`, `ℹ pass 172`, `ℹ fail 0`. From here on, every path is in `~/Dev/Duty-partner-push`.

### Task 1: Stand-ins for pg_cron, pg_net and the Vault

**Files:**
- Modify: `supabase/tests/helpers/supabase_shim.sql`, `supabase/tests/helpers/db.js`
- Test: `supabase/tests/smoke.test.js`

PGlite has none of the three, so the shim gives each the schema and the signatures the migration calls, and keeps what they're given (decision 1). `asService` runs SQL as partner-push's secret key does.

- [x] **Step 1: Write the failing tests**

3 replacements, in order, in `supabase/tests/smoke.test.js`:

In `supabase/tests/smoke.test.js`, replace:

```javascript
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { addUser, asAdmin, asAnon, asUser, freshDb } from './helpers/db.js'

describe('the Supabase shim', () => {
  let db
```

with:

```javascript
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { addUser, asAdmin, asAnon, asService, asUser, freshDb } from './helpers/db.js'

describe('the Supabase shim', () => {
  let db
```

In `supabase/tests/smoke.test.js`, replace:

```javascript

  test('callers run as their own role, and the role ends with the call', async () => {
    assert.deepEqual(await asAnon(db, 'select current_user as u'), [{ u: 'anon' }])
    assert.deepEqual(await asAdmin(db, 'select current_user as u'), [{ u: 'postgres' }])
  })
```

with:

```javascript

  test('callers run as their own role, and the role ends with the call', async () => {
    assert.deepEqual(await asAnon(db, 'select current_user as u'), [{ u: 'anon' }])
    assert.deepEqual(await asService(db, 'select current_user as u'), [{ u: 'service_role' }])
    assert.deepEqual(await asAdmin(db, 'select current_user as u'), [{ u: 'postgres' }])
  })
```

In `supabase/tests/smoke.test.js`, replace:

```javascript
    )
    assert.deepEqual(r, { n: 32, differ: true })
  })
})
```

with:

```javascript
    )
    assert.deepEqual(r, { n: 32, differ: true })
  })

  test("the shim's pg_cron, pg_net and Vault keep what they're given", async () => {
    const [{ id }] = await asAdmin(db, "select vault.create_secret('s3cret', 'smoke_secret', 'A test') as id")
    assert.deepEqual(await asAdmin(db, 'select name, decrypted_secret from vault.decrypted_secrets where id = $1', [id]), [
      { name: 'smoke_secret', decrypted_secret: 's3cret' },
    ])

    const [{ job }] = await asAdmin(db, "select cron.schedule('smoke-job', '15 seconds', 'select 1')::int as job")
    const [{ again }] = await asAdmin(db, "select cron.schedule('smoke-job', '30 seconds', 'select 2')::int as again")
    assert.equal(again, job, 'scheduling a name again replaces that job')
    assert.deepEqual(await asAdmin(db, "select schedule, command from cron.job where jobname = 'smoke-job'"), [
      { schedule: '30 seconds', command: 'select 2' },
    ])
    assert.deepEqual(await asAdmin(db, "select cron.unschedule('smoke-job') as gone"), [{ gone: true }])

    const [{ request }] = await asAdmin(
      db,
      `select net.http_post(url := 'https://example.com/x', body := '{"a": 1}'::jsonb,
                            headers := '{"h": "v"}'::jsonb, timeout_milliseconds := 1234)::int as request`,
    )
    assert.deepEqual(
      await asAdmin(db, 'select method, url, headers, body, timeout_milliseconds from net.http_request_queue where id = $1', [request]),
      [{ method: 'POST', url: 'https://example.com/x', headers: { h: 'v' }, body: { a: 1 }, timeout_milliseconds: 1234 }],
    )
  })
})
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && node --no-maglev --test smoke.test.js
```

Expected: the file fails to load, with `does not provide an export named 'asService'` (`ℹ fail 1`).

- [x] **Step 3: Add asService**

One replacement in `supabase/tests/helpers/db.js`:

In `supabase/tests/helpers/db.js`, replace:

```javascript
/** Runs SQL the way PostgREST does for a caller holding only the publishable key (Crewluve, the website). */
export const asAnon = (db, sql, params = []) => asRole(db, 'anon', { role: 'anon' }, sql, params)

/** Runs SQL as Supabase Auth's role, supabase_auth_admin, which has no JWT. */
export const asAuthAdmin = (db, sql, params = []) => asRole(db, 'supabase_auth_admin', null, sql, params)
```

with:

```javascript
/** Runs SQL the way PostgREST does for a caller holding only the publishable key (Crewluve, the website). */
export const asAnon = (db, sql, params = []) => asRole(db, 'anon', { role: 'anon' }, sql, params)

/** Runs SQL the way PostgREST does for a caller holding a secret key (the partner-push function). */
export const asService = (db, sql, params = []) => asRole(db, 'service_role', { role: 'service_role' }, sql, params)

/** Runs SQL as Supabase Auth's role, supabase_auth_admin, which has no JWT. */
export const asAuthAdmin = (db, sql, params = []) => asRole(db, 'supabase_auth_admin', null, sql, params)
```

- [x] **Step 4: Add the stand-ins to the shim**

2 replacements, in order, in `supabase/tests/helpers/supabase_shim.sql`:

In `supabase/tests/helpers/supabase_shim.sql`, replace:

```sql
-- (Postgres in WebAssembly) instead of a Supabase stack. Mirrors project corxvurxpnrzekbxdgye as checked on
-- 2026-10-15: the API roles, Supabase Auth's role and auth.users, auth.uid(), pgcrypto's functions in the
-- "extensions" schema, the part of "storage" the app's migrations use, and the default privileges Supabase gives
-- anon and authenticated on new tables and functions in "public".

create role anon nologin noinherit;
create role authenticated nologin noinherit;
```

with:

```sql
-- (Postgres in WebAssembly) instead of a Supabase stack. Mirrors project corxvurxpnrzekbxdgye as checked on
-- 2026-10-15: the API roles, Supabase Auth's role and auth.users, auth.uid(), pgcrypto's functions in the
-- "extensions" schema, the part of "storage" the app's migrations use, and the default privileges Supabase gives
-- anon and authenticated on new tables and functions in "public". Since 2026-10-18 it also stands in for pg_cron,
-- pg_net and the Vault, which partner-links piece 3 uses.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
```

In `supabase/tests/helpers/supabase_shim.sql`, replace:

```sql
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
```

with:

```sql
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- pg_cron, pg_net and the Vault, for partner-links piece 3 (checked on CrewLu Cloud 2026-10-18: pg_cron 1.6.4 and
-- pg_net 0.20.3 available, supabase_vault 0.3.1 installed). PGlite has none of them, so the shim gives each the
-- same schema and the signatures the migrations call, and records what it's given: nothing runs on a schedule,
-- no request leaves, and secrets are stored as given, not encrypted.
create schema cron;
create table cron.job (
  jobid bigserial primary key,
  jobname text unique,
  schedule text not null,
  command text not null,
  username text not null default current_user,
  active boolean not null default true
);
create table cron.job_run_details (
  runid bigserial primary key,
  jobid bigint,
  command text,
  status text,
  return_message text,
  start_time timestamptz,
  end_time timestamptz
);
-- pg_cron's: schedules a job by name, replacing one of the same name, and returns its id.
create function cron.schedule(job_name text, schedule text, command text) returns bigint
language sql as $$
  insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command
  returning jobid
$$;
create function cron.unschedule(job_name text) returns boolean
language sql as $$
  with gone as (delete from cron.job where jobname = job_name returning 1) select exists (select 1 from gone)
$$;

create schema net;
-- The requests net.http_post was asked to send. pg_net keeps the same table, with the body as bytea.
create table net.http_request_queue (
  id bigserial primary key,
  method text not null,
  url text not null,
  headers jsonb,
  body jsonb,
  timeout_milliseconds integer
);
-- pg_net's: queues a POST and returns its id. The answer would land in net._http_response.
create function net.http_post(
  url text,
  body jsonb default '{}'::jsonb,
  params jsonb default '{}'::jsonb,
  headers jsonb default '{"Content-Type": "application/json"}'::jsonb,
  timeout_milliseconds integer default 5000
) returns bigint
language sql as $$
  insert into net.http_request_queue (method, url, headers, body, timeout_milliseconds)
  values ('POST', url, headers, body, timeout_milliseconds)
  returning id
$$;

create schema vault;
create table vault.secrets (
  id uuid primary key default gen_random_uuid(),
  name text unique,
  description text not null default '',
  secret text not null,
  created_at timestamptz not null default now()
);
-- The Vault's view of its secrets, decrypted.
create view vault.decrypted_secrets as
  select id, name, description, secret, secret as decrypted_secret, created_at from vault.secrets;
create function vault.create_secret(
  new_secret text,
  new_name text default null,
  new_description text default '',
  new_key_id uuid default null
) returns uuid
language sql as $$
  insert into vault.secrets (name, description, secret) values (new_name, new_description, new_secret) returning id
$$;
```

- [x] **Step 5: Run the whole suite**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && npm test
```

Expected: `ℹ tests 173`, `ℹ pass 173`, `ℹ fail 0`, in about 25 seconds.

- [x] **Step 6: Commit**

Run:

```bash
git -C ~/Dev/Duty-partner-push add supabase/tests/helpers/supabase_shim.sql supabase/tests/helpers/db.js supabase/tests/smoke.test.js && git -C ~/Dev/Duty-partner-push commit -q -m "test(partner-links): the tests' Supabase shim stands in for pg_cron, pg_net and the Vault, and tests can call as the service role" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty-partner-push log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty-partner-push status --short` shows nothing.

### Task 2: Claim

**Files:**
- Create: `supabase/migrations/20261018120000_partner_links_push.sql`
- Test: `supabase/tests/push_service.test.js`, and modify `supabase/tests/privileges.test.js`

Spec §5.2 and §5.5, decisions 2 and 3: the migration starts with the extensions, the state table, the password and the address, and `partner_push_claim`. The privileges guard learns the service RPCs, and checks RLS on every private table.

- [x] **Step 1: Write the failing tests**

File: `supabase/tests/push_service.test.js`

```javascript
// Partner-links piece 3, the push service's SQL (supabase/migrations/20261018120000_partner_links_push.sql): the
// 15-second check, the claim and report calls partner-push makes, and the setup's probe. Its spec, which numbers its
// sections, is crewluve-web docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md. Each test builds its
// own database, because a claim takes every due pilot in it.
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { asAdmin, asService, freshDb } from './helpers/db.js'
import { connected, join, setPush, setStatus } from './helpers/rpc.js'

/** A fresh database for one test, closed when the test ends. */
async function db(t) {
  const fresh = await freshDb()
  t.after(() => fresh.close())
  return fresh
}

/** A distinct 64-character APNs token for each n. */
const token = (n) => n.toString(16).padStart(2, '0').repeat(32)

/** The password the script keeps in the Vault. */
const password = async (db) =>
  (await asAdmin(db, "select decrypted_secret as s from vault.decrypted_secrets where name = 'partner_push_secret'"))[0]?.s

/** A pilot with one partner whose Crewluve registered `push`, due a push. */
async function duePilot(db, push, env = 'production') {
  const { pilot, invite, key } = await connected(db)
  await setPush(db, key, push, env)
  await setStatus(db, pilot, { v: 1 }, 1)
  return { pilot, invite }
}

const isDue = async (db, pilot) =>
  (await asAdmin(db, 'select push_due from public.partner_status where user_id = $1', [pilot]))[0].push_due

/** partner_push_claim, called the way partner-push calls it. */
const claim = (db, secret, probe = false) =>
  asService(db, 'select public.partner_push_claim($1, $2) as r', [secret, probe]).then((rows) => rows[0].r)

const byPilotThenToken = (a, b) => a.pilot.localeCompare(b.pilot) || a.token.localeCompare(b.token)

describe('partner_push_claim (spec §5.2)', () => {
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

  test("it takes every due pilot once, with their partners' Crewluve tokens", async (t) => {
    const d = await db(t)
    const a = await duePilot(d, token(1), 'sandbox')
    const ipad = await join(d, a.invite, 'app', "Sarah's iPad")
    await setPush(d, ipad.device_key, token(2))
    const b = await duePilot(d, token(3))
    const quiet = await connected(d)
    await setPush(d, quiet.key, token(4))

    const { devices } = await claim(d, await password(d))
    assert.deepEqual(
      devices,
      [
        { pilot: a.pilot, token: token(1), env: 'sandbox' },
        { pilot: a.pilot, token: token(2), env: 'production' },
        { pilot: b.pilot, token: token(3), env: 'production' },
      ].sort(byPilotThenToken),
    )
    assert.equal(await isDue(d, a.pilot), false)
    assert.equal(await isDue(d, b.pilot), false)
    const [{ stamped }] = await asAdmin(
      d,
      "select count(*)::int as stamped from public.partner_status where last_push_at > now() - interval '1 minute'",
    )
    assert.equal(stamped, 2)
    assert.deepEqual((await claim(d, await password(d))).devices, [])
  })

  test('only Crewluve app devices with a push token count', async (t) => {
    const d = await db(t)
    const { pilot, invite } = await connected(d)
    const web = await join(d, invite, 'web', 'Safari on Mac')
    // partner_set_push takes app devices only. A web device given a token anyway still doesn't count.
    await asAdmin(d, "update private.partner_device_secrets set push_token = $1, push_env = 'production' where device_id = $2", [
      token(6),
      web.device_id,
    ])
    const ipad = await join(d, invite, 'app', "Sarah's iPad")
    await setPush(d, ipad.device_key, token(5))
    await setStatus(d, pilot, { v: 1 }, 1)
    assert.deepEqual((await claim(d, await password(d))).devices, [{ pilot, token: token(5), env: 'production' }])
  })

  test('a change after the claim marks the pilot due again', async (t) => {
    const d = await db(t)
    const { pilot } = await duePilot(d, token(1))
    await claim(d, await password(d))
    await setStatus(d, pilot, { v: 2 }, 1)
    assert.equal(await isDue(d, pilot), true)
    assert.deepEqual((await claim(d, await password(d))).devices, [{ pilot, token: token(1), env: 'production' }])
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

  test('the probe checks the password and takes nobody', async (t) => {
    const d = await db(t)
    const { pilot } = await duePilot(d, token(1))
    await assert.rejects(claim(d, 'wrong', true), /partner_push_claim: wrong password/)
    assert.deepEqual(await claim(d, await password(d), true), { devices: [], signing_token: null })
    assert.equal(await isDue(d, pilot), true)
  })
})
```

3 replacements, in order, in `supabase/tests/privileges.test.js`:

In `supabase/tests/privileges.test.js`, replace:

```javascript
    'partner_handoff_redeem(text, text, text, text)',
    'partner_set_push(text, text, text)',
  ]
  const PUBLIC_TABLES = ['partner_status', 'partners', 'partner_devices']
  const PRIVATE_TABLES = ['partner_device_secrets', 'partner_handoffs', 'partner_redeem_failures']

  const canExecute = async (role, signature) =>
    (await asAdmin(db, "select has_function_privilege($1, $2, 'execute') as ok", [role, signature]))[0].ok

  test('the public functions are exactly the pilot and partner RPCs', async () => {
    const rows = await asAdmin(
      db,
      "select p.proname || '(' || oidvectortypes(p.proargtypes) || ')' as sig from pg_proc p where p.pronamespace = 'public'::regnamespace",
    )
    assert.deepEqual(rows.map((r) => r.sig).sort(), [...PILOT_RPCS, ...PARTNER_RPCS].sort())
  })

  test('pilot RPCs: signed-in users only', async () => {
```

with:

```javascript
    'partner_handoff_redeem(text, text, text, text)',
    'partner_set_push(text, text, text)',
  ]
  // partner-push's calls (piece 3): the service role only, which partner-push uses.
  const SERVICE_RPCS = ['partner_push_claim(text, boolean)']
  const PUBLIC_TABLES = ['partner_status', 'partners', 'partner_devices']
  const PRIVATE_TABLES = ['partner_device_secrets', 'partner_handoffs', 'partner_redeem_failures', 'partner_push_state']

  const canExecute = async (role, signature) =>
    (await asAdmin(db, "select has_function_privilege($1, $2, 'execute') as ok", [role, signature]))[0].ok

  test('the public functions are exactly the pilot, partner and service RPCs', async () => {
    const rows = await asAdmin(
      db,
      "select p.proname || '(' || oidvectortypes(p.proargtypes) || ')' as sig from pg_proc p where p.pronamespace = 'public'::regnamespace",
    )
    assert.deepEqual(rows.map((r) => r.sig).sort(), [...PILOT_RPCS, ...PARTNER_RPCS, ...SERVICE_RPCS].sort())
  })

  test('pilot RPCs: signed-in users only', async () => {
```

In `supabase/tests/privileges.test.js`, replace:

```javascript
    for (const sig of PARTNER_RPCS) {
      assert.equal(await canExecute('anon', `public.${sig}`), true, `anon: ${sig}`)
      assert.equal(await canExecute('authenticated', `public.${sig}`), true, `authenticated: ${sig}`)
    }
  })
```

with:

```javascript
    for (const sig of PARTNER_RPCS) {
      assert.equal(await canExecute('anon', `public.${sig}`), true, `anon: ${sig}`)
      assert.equal(await canExecute('authenticated', `public.${sig}`), true, `authenticated: ${sig}`)
    }
  })

  test("service RPCs: partner-push's service role only", async () => {
    for (const sig of SERVICE_RPCS) {
      assert.equal(await canExecute('anon', `public.${sig}`), false, `anon: ${sig}`)
      assert.equal(await canExecute('authenticated', `public.${sig}`), false, `authenticated: ${sig}`)
      assert.equal(await canExecute('service_role', `public.${sig}`), true, `service_role: ${sig}`)
    }
  })
```

In `supabase/tests/privileges.test.js`, replace:

```javascript
          const [{ ok }] = await asAdmin(db, 'select has_table_privilege($1, $2, $3) as ok', [role, `private.${table}`, priv])
          assert.equal(ok, false, `${role} ${priv} ${table}`)
        }
      }
    }
  })
```

with:

```javascript
          const [{ ok }] = await asAdmin(db, 'select has_table_privilege($1, $2, $3) as ok', [role, `private.${table}`, priv])
          assert.equal(ok, false, `${role} ${priv} ${table}`)
        }
        const [{ rls }] = await asAdmin(db, 'select relrowsecurity as rls from pg_class where oid = $1::regclass', [`private.${table}`])
        assert.equal(rls, true, `RLS on ${table}, a second lock`)
      }
    }
  })
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && node --no-maglev --test push_service.test.js privileges.test.js
```

Expected: `ℹ tests 14`, `ℹ pass 4`, `ℹ fail 10`. The migration doesn't exist yet, so the push service's tests and the guard's checks of the new functions and table fail.

- [x] **Step 3: Write the migration**

File: `supabase/migrations/20261018120000_partner_links_push.sql`

```sql
-- Partner links, piece 3: the push service (crewluve-web docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md).
-- set_partner_status (piece 1) marks a pilot due a push on every applied write. Every 15 seconds pg_cron runs
-- private.partner_push_tick(): when a due pilot has a partner whose Crewluve registered a push token, it calls the
-- partner-push Edge Function through pg_net. partner-push claims the due pilots' tokens (partner_push_claim), sends
-- each one a silent push through Apple, and reports back (partner_push_report). A password this script makes and
-- keeps in the Vault gates both calls, so only the check can set partner-push off.
--
-- Plan: crewluve-web docs/superpowers/plans/2026-10-18-partner-links-piece3-push.md. Tests: supabase/tests/push_service.test.js.
-- Run it once, in the SQL editor: a second run fails at its create table and changes nothing.

-- pg_cron and pg_net come with Supabase. The tests' shim stands in for both, so each is created only where Postgres
-- has it.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net with schema extensions;
  end if;
end
$$;

-- The APNs signing token partner-push made last, and when (spec §6.2). Apple rejects tokens over an hour old and turns
-- away senders who renew more often than every 20 minutes, so partner-push reuses one for 40 minutes, even across its
-- restarts. One row at most.
create table private.partner_push_state (
  only_row boolean primary key default true check (only_row),
  signing_token text not null,
  made_at timestamptz not null
);
alter table private.partner_push_state enable row level security;

-- The password the check sends, and claim and report require: 32 random bytes, made here, so nobody sees or types
-- it. And partner-push's address, for the check.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'partner_push_secret',
  'Partner links piece 3: the check sends it to partner-push, and partner_push_claim and partner_push_report require it.');
select vault.create_secret('https://corxvurxpnrzekbxdgye.supabase.co/functions/v1/partner-push', 'partner_push_url',
  'Partner links piece 3: where the check calls partner-push.');

-- A Vault secret, by name.
create function private.push_secret(p_name text) returns text
language sql stable set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name
$$;

-- Raises unless p_secret is the Vault's partner_push_secret.
create function private.require_push_password(p_secret text, p_caller text) returns void
language plpgsql stable set search_path = '' as $$
begin
  if p_secret is null or p_secret is distinct from private.push_secret('partner_push_secret') then
    raise exception '%: wrong password', p_caller using errcode = '28000';
  end if;
end
$$;

revoke all on all functions in schema private from public, anon, authenticated;

-- partner-push's first call each run (spec §5.2). In one statement it clears every due pilot's mark and returns their
-- partners' Crewluve push tokens, so each change is pushed by one run, and a change after it marks the pilot due
-- again. With them comes the stored signing token, while it's under 40 minutes old. With p_probe (the setup's check,
-- spec §9) it only checks the password and returns the signing token.
create function public.partner_push_claim(p_secret text, p_probe boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_devices jsonb := '[]'::jsonb;
begin
  perform private.require_push_password(p_secret, 'partner_push_claim');
  if not coalesce(p_probe, false) then
    with due as (
      update public.partner_status set push_due = false, last_push_at = now()
       where push_due
      returning user_id
    )
    select coalesce(jsonb_agg(jsonb_build_object('pilot', d.owner_id, 'token', s.push_token, 'env', s.push_env)
                                order by d.owner_id, s.push_token), '[]'::jsonb)
      into v_devices
      from due
      join public.partner_devices d on d.owner_id = due.user_id and d.kind = 'app'
      join private.partner_device_secrets s on s.device_id = d.id
     where s.push_token is not null;
  end if;
  return jsonb_build_object(
    'devices', v_devices,
    'signing_token', (select signing_token from private.partner_push_state where made_at > now() - interval '40 minutes')
  );
end
$$;
revoke all on function public.partner_push_claim(text, boolean) from public, anon, authenticated;
grant execute on function public.partner_push_claim(text, boolean) to service_role;
```

- [x] **Step 4: Run the whole suite**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && npm test
```

Expected: `ℹ tests 181`, `ℹ pass 181`, `ℹ fail 0`, in about 25 seconds.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty-partner-push add supabase/migrations/20261018120000_partner_links_push.sql supabase/tests/privileges.test.js supabase/tests/push_service.test.js && git -C ~/Dev/Duty-partner-push commit -q -m "feat(partner-links): the push service's claim: partner-push takes the due pilots' Crewluve tokens, behind a password in the Vault" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty-partner-push log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty-partner-push status --short` shows nothing.

### Task 3: Report

**Files:**
- Modify: `supabase/migrations/20261018120000_partner_links_push.sql`, `supabase/tests/privileges.test.js`
- Test: `supabase/tests/push_service.test.js`

Spec §5.3: dropping dead tokens, marking pilots due again, and keeping a new signing token.

- [x] **Step 1: Write the failing tests**

2 replacements, in order, in `supabase/tests/push_service.test.js`:

In `supabase/tests/push_service.test.js`, replace:

```javascript
/** partner_push_claim, called the way partner-push calls it. */
const claim = (db, secret, probe = false) =>
  asService(db, 'select public.partner_push_claim($1, $2) as r', [secret, probe]).then((rows) => rows[0].r)

const byPilotThenToken = (a, b) => a.pilot.localeCompare(b.pilot) || a.token.localeCompare(b.token)
```

with:

```javascript
/** partner_push_claim, called the way partner-push calls it. */
const claim = (db, secret, probe = false) =>
  asService(db, 'select public.partner_push_claim($1, $2) as r', [secret, probe]).then((rows) => rows[0].r)

/** partner_push_report, called the way partner-push calls it. */
const report = (db, secret, dead = [], retry = [], signing = null) =>
  asService(db, 'select public.partner_push_report($1, $2::text[], $3::uuid[], $4) as r', [secret, dead, retry, signing]).then(
    (rows) => rows[0].r,
  )

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

const byPilotThenToken = (a, b) => a.pilot.localeCompare(b.pilot) || a.token.localeCompare(b.token)
```

In `supabase/tests/push_service.test.js`, replace:

```javascript
    assert.equal(await isDue(d, pilot), true)
  })
})
```

with:

```javascript
    assert.equal(await isDue(d, pilot), true)
  })
})

describe('partner_push_report (spec §5.3)', () => {
  test('it refuses a wrong password, and changes nothing', async (t) => {
    const d = await db(t)
    const { pilot } = await duePilot(d, token(1))
    await claim(d, await password(d))
    await assert.rejects(report(d, 'wrong', [token(1)], [pilot], 'tok'), /partner_push_report: wrong password/)
    assert.deepEqual(await tokensOf(d, pilot), [token(1)])
    assert.equal(await isDue(d, pilot), false)
    assert.deepEqual(await asAdmin(d, 'select * from private.partner_push_state'), [])
  })

  test('it drops dead tokens, wherever they are', async (t) => {
    const d = await db(t)
    const a = await duePilot(d, token(1))
    const b = await duePilot(d, token(2))
    const c = await duePilot(d, token(3))
    assert.deepEqual(await report(d, await password(d), [token(1), token(2)]), { ok: true })
    assert.deepEqual(await tokensOf(d, a.pilot), [])
    assert.deepEqual(await tokensOf(d, b.pilot), [])
    assert.deepEqual(await tokensOf(d, c.pilot), [token(3)])
    const [{ envs }] = await asAdmin(
      d,
      'select count(*)::int as envs from private.partner_device_secrets where push_token is null and push_env is not null',
    )
    assert.equal(envs, 0, 'a dropped token takes its environment with it')
  })

  test('it marks pilots due again', async (t) => {
    const d = await db(t)
    const a = await duePilot(d, token(1))
    const b = await duePilot(d, token(2))
    await claim(d, await password(d))
    await report(d, await password(d), [], [a.pilot])
    assert.equal(await isDue(d, a.pilot), true)
    assert.equal(await isDue(d, b.pilot), false)
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
```

One replacement in `supabase/tests/privileges.test.js`:

In `supabase/tests/privileges.test.js`, replace:

```javascript
    'partner_set_push(text, text, text)',
  ]
  // partner-push's calls (piece 3): the service role only, which partner-push uses.
  const SERVICE_RPCS = ['partner_push_claim(text, boolean)']
  const PUBLIC_TABLES = ['partner_status', 'partners', 'partner_devices']
  const PRIVATE_TABLES = ['partner_device_secrets', 'partner_handoffs', 'partner_redeem_failures', 'partner_push_state']
```

with:

```javascript
    'partner_set_push(text, text, text)',
  ]
  // partner-push's calls (piece 3): the service role only, which partner-push uses.
  const SERVICE_RPCS = ['partner_push_claim(text, boolean)', 'partner_push_report(text, text[], uuid[], text)']
  const PUBLIC_TABLES = ['partner_status', 'partners', 'partner_devices']
  const PRIVATE_TABLES = ['partner_device_secrets', 'partner_handoffs', 'partner_redeem_failures', 'partner_push_state']
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && node --no-maglev --test push_service.test.js privileges.test.js
```

Expected: `ℹ tests 18`, `ℹ pass 12`, `ℹ fail 6`. Report doesn't exist yet.

- [x] **Step 3: Add report to the migration**

One replacement in `supabase/migrations/20261018120000_partner_links_push.sql`:

In `supabase/migrations/20261018120000_partner_links_push.sql`, replace:

```sql
$$;
revoke all on function public.partner_push_claim(text, boolean) from public, anon, authenticated;
grant execute on function public.partner_push_claim(text, boolean) to service_role;
```

with:

```sql
$$;
revoke all on function public.partner_push_claim(text, boolean) from public, anon, authenticated;
grant execute on function public.partner_push_claim(text, boolean) to service_role;

-- partner-push's last call each run (spec §5.3): drops the tokens Apple called dead, wherever they are, marks the
-- pilots whose push didn't get through due again, so the next check tries again, and keeps a new signing token.
create function public.partner_push_report(p_secret text, p_dead_tokens text[], p_retry_pilots uuid[], p_signing_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_push_password(p_secret, 'partner_push_report');
  update private.partner_device_secrets set push_token = null, push_env = null
   where push_token = any (coalesce(p_dead_tokens, '{}'));
  update public.partner_status set push_due = true
   where user_id = any (coalesce(p_retry_pilots, '{}'));
  if p_signing_token is not null then
    insert into private.partner_push_state (signing_token, made_at) values (p_signing_token, now())
    on conflict (only_row) do update set signing_token = excluded.signing_token, made_at = excluded.made_at;
  end if;
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.partner_push_report(text, text[], uuid[], text) from public, anon, authenticated;
grant execute on function public.partner_push_report(text, text[], uuid[], text) to service_role;
```

- [x] **Step 4: Run the whole suite**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && npm test
```

Expected: `ℹ tests 185`, `ℹ pass 185`, `ℹ fail 0`, in about 25 seconds.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty-partner-push add supabase/migrations/20261018120000_partner_links_push.sql supabase/tests/privileges.test.js supabase/tests/push_service.test.js && git -C ~/Dev/Duty-partner-push commit -q -m "feat(partner-links): the push service's report: dead tokens are dropped, pilots whose push didn't get through are due again, and a new signing token is kept" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty-partner-push log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty-partner-push status --short` shows nothing.

### Task 4: The 15-second check

**Files:**
- Modify: `supabase/migrations/20261018120000_partner_links_push.sql`
- Test: `supabase/tests/push_service.test.js`

Spec §5.1 and §5.4, decision 5: the check, its job every 15 seconds, and the daily clean-up of its history.

- [x] **Step 1: Write the failing tests**

2 replacements, in order, in `supabase/tests/push_service.test.js`:

In `supabase/tests/push_service.test.js`, replace:

```javascript
  ).map((row) => row.t)

const byPilotThenToken = (a, b) => a.pilot.localeCompare(b.pilot) || a.token.localeCompare(b.token)

describe('partner_push_claim (spec §5.2)', () => {
  test("the script keeps partner-push's password and address in the Vault", async (t) => {
```

with:

```javascript
  ).map((row) => row.t)

const byPilotThenToken = (a, b) => a.pilot.localeCompare(b.pilot) || a.token.localeCompare(b.token)

/** The 15-second check, run the way pg_cron runs it. */
const tick = (db) => asAdmin(db, 'select private.partner_push_tick()')

/** What pg_net was asked to send, oldest first. */
const requests = (db) => asAdmin(db, 'select url, headers, body, timeout_milliseconds from net.http_request_queue order by id')

describe('partner_push_claim (spec §5.2)', () => {
  test("the script keeps partner-push's password and address in the Vault", async (t) => {
```

In `supabase/tests/push_service.test.js`, replace:

```javascript
    assert.equal((await claim(d, secret)).signing_token, 'second')
  })
})
```

with:

```javascript
    assert.equal((await claim(d, secret)).signing_token, 'second')
  })
})

describe('the 15-second check (spec §5.1)', () => {
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

  test('it clears due pilots nobody can be woken for, and calls nobody', async (t) => {
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
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && node --no-maglev --test push_service.test.js
```

Expected: `ℹ tests 16`, `ℹ pass 11`, `ℹ fail 5`. The check and its jobs don't exist yet.

- [x] **Step 3: Add the check and the jobs**

One replacement in `supabase/migrations/20261018120000_partner_links_push.sql`:

In `supabase/migrations/20261018120000_partner_links_push.sql`, replace:

```sql
$$;
revoke all on function public.partner_push_report(text, text[], uuid[], text) from public, anon, authenticated;
grant execute on function public.partner_push_report(text, text[], uuid[], text) to service_role;
```

with:

```sql
$$;
revoke all on function public.partner_push_report(text, text[], uuid[], text) from public, anon, authenticated;
grant execute on function public.partner_push_report(text, text[], uuid[], text) to service_role;

-- The 15-second check (spec §5.1), which pg_cron runs as postgres. A due pilot none of whose partners has a Crewluve
-- with a push token has nobody to wake, so their mark is cleared here. If anyone is still due, it calls partner-push
-- with the password and no tokens, since pg_net keeps its requests and answers in the database for a few hours.
create function private.partner_push_tick() returns void
language plpgsql set search_path = '' as $$
begin
  update public.partner_status ps set push_due = false
   where ps.push_due
     and not exists (
       select 1
         from public.partner_devices d
         join private.partner_device_secrets s on s.device_id = d.id
        where d.owner_id = ps.user_id and d.kind = 'app' and s.push_token is not null
     );
  if exists (select 1 from public.partner_status where push_due) then
    perform net.http_post(
      url := private.push_secret('partner_push_url'),
      body := '{}'::jsonb,
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-partner-push-secret', private.push_secret('partner_push_secret')
      ),
      timeout_milliseconds := 30000
    );
  end if;
end
$$;
revoke all on function private.partner_push_tick() from public, anon, authenticated;

select cron.schedule('partner-push', '15 seconds', 'select private.partner_push_tick()');
-- pg_cron logs every run, about 5,800 a day for the check. This keeps a day of this piece's, deleted at 04:17 UTC.
select cron.schedule('partner-push-history', '17 4 * * *', $$
  delete from cron.job_run_details
   where end_time < now() - interval '1 day'
     and jobid in (select jobid from cron.job where jobname in ('partner-push', 'partner-push-history'))
$$);
```

- [x] **Step 4: Run the whole suite**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && npm test
```

Expected: `ℹ tests 190`, `ℹ pass 190`, `ℹ fail 0`, in about 25 seconds.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty-partner-push add supabase/migrations/20261018120000_partner_links_push.sql supabase/tests/push_service.test.js && git -C ~/Dev/Duty-partner-push commit -q -m "feat(partner-links): the push service's 15-second check calls partner-push only when someone can be woken, and its history is cleared daily" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty-partner-push log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty-partner-push status --short` shows nothing.

### Task 5: The setup's probe, a second run and the undo

**Files:**
- Modify: `supabase/migrations/20261018120000_partner_links_push.sql`
- Test: `supabase/tests/push_service.test.js`

Spec §9 step 5, decisions 2 and 4: the probe, the caller the check and the probe share, and the undo in the migration's header, which the tests run.

- [x] **Step 1: Write the failing tests**

2 replacements, in order, in `supabase/tests/push_service.test.js`:

In `supabase/tests/push_service.test.js`, replace:

```javascript
// own database, because a claim takes every due pilot in it.
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { asAdmin, asService, freshDb } from './helpers/db.js'
import { connected, join, setPush, setStatus } from './helpers/rpc.js'

/** A fresh database for one test, closed when the test ends. */
async function db(t) {
```

with:

```javascript
// own database, because a claim takes every due pilot in it.
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { asAdmin, asService, freshDb, migrationPath, read } from './helpers/db.js'
import { connected, join, setPush, setStatus } from './helpers/rpc.js'

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
```

In `supabase/tests/push_service.test.js`, replace:

```javascript
    )
  })
})
```

with:

```javascript
    )
  })
})

describe("the setup's check, a second run and the undo (spec §9)", () => {
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
    const d = await db(t)
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
    const d = await db(t)
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

- [x] **Step 2: Run them to see them fail**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && node --no-maglev --test push_service.test.js
```

Expected: `ℹ tests 19`, `ℹ pass 17`, `ℹ fail 2`. The probe and the undo fail. The second-run test already passes: the script's first `create table` stops a second run.

- [x] **Step 3: Add the probe, the shared caller and the undo**

4 replacements, in order, in `supabase/migrations/20261018120000_partner_links_push.sql`:

In `supabase/migrations/20261018120000_partner_links_push.sql`, replace:

```sql
--
-- Plan: crewluve-web docs/superpowers/plans/2026-10-18-partner-links-piece3-push.md. Tests: supabase/tests/push_service.test.js.
-- Run it once, in the SQL editor: a second run fails at its create table and changes nothing.

-- pg_cron and pg_net come with Supabase. The tests' shim stands in for both, so each is created only where Postgres
-- has it.
```

with:

```sql
--
-- Plan: crewluve-web docs/superpowers/plans/2026-10-18-partner-links-piece3-push.md. Tests: supabase/tests/push_service.test.js.
-- Run it once, in the SQL editor: a second run fails at its create table and changes nothing.
--
-- Undo, in the SQL editor, then delete partner-push in the dashboard (pg_cron and pg_net can stay):
--   select cron.unschedule('partner-push');
--   select cron.unschedule('partner-push-history');
--   drop function public.partner_push_report(text, text[], uuid[], text), public.partner_push_claim(text, boolean),
--     private.partner_push_probe(), private.partner_push_tick(), private.call_partner_push(jsonb),
--     private.require_push_password(text, text), private.push_secret(text);
--   drop table private.partner_push_state;
--   delete from vault.secrets where name in ('partner_push_secret', 'partner_push_url');

-- pg_cron and pg_net come with Supabase. The tests' shim stands in for both, so each is created only where Postgres
-- has it.
```

In `supabase/migrations/20261018120000_partner_links_push.sql`, replace:

```sql
revoke all on function public.partner_push_report(text, text[], uuid[], text) from public, anon, authenticated;
grant execute on function public.partner_push_report(text, text[], uuid[], text) to service_role;

-- The 15-second check (spec §5.1), which pg_cron runs as postgres. A due pilot none of whose partners has a Crewluve
-- with a push token has nobody to wake, so their mark is cleared here. If anyone is still due, it calls partner-push
-- with the password and no tokens, since pg_net keeps its requests and answers in the database for a few hours.
create function private.partner_push_tick() returns void
language plpgsql set search_path = '' as $$
begin
```

with:

```sql
revoke all on function public.partner_push_report(text, text[], uuid[], text) from public, anon, authenticated;
grant execute on function public.partner_push_report(text, text[], uuid[], text) to service_role;

-- Calls partner-push with the password and p_body, and returns pg_net's request id. It sends no tokens: pg_net keeps
-- its requests and answers in the database for a few hours.
create function private.call_partner_push(p_body jsonb) returns bigint
language sql set search_path = '' as $$
  select net.http_post(
    url := private.push_secret('partner_push_url'),
    body := p_body,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-partner-push-secret', private.push_secret('partner_push_secret')
    ),
    timeout_milliseconds := 30000
  )
$$;
revoke all on function private.call_partner_push(jsonb) from public, anon, authenticated;

-- The 15-second check (spec §5.1), which pg_cron runs as postgres. A due pilot none of whose partners has a Crewluve
-- with a push token has nobody to wake, so their mark is cleared here. If anyone is still due, it calls partner-push.
create function private.partner_push_tick() returns void
language plpgsql set search_path = '' as $$
begin
```

In `supabase/migrations/20261018120000_partner_links_push.sql`, replace:

```sql
        where d.owner_id = ps.user_id and d.kind = 'app' and s.push_token is not null
     );
  if exists (select 1 from public.partner_status where push_due) then
    perform net.http_post(
      url := private.push_secret('partner_push_url'),
      body := '{}'::jsonb,
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-partner-push-secret', private.push_secret('partner_push_secret')
      ),
      timeout_milliseconds := 30000
    );
  end if;
end
$$;
```

with:

```sql
        where d.owner_id = ps.user_id and d.kind = 'app' and s.push_token is not null
     );
  if exists (select 1 from public.partner_status where push_due) then
    perform private.call_partner_push('{}'::jsonb);
  end if;
end
$$;
```

In `supabase/migrations/20261018120000_partner_links_push.sql`, replace:

```sql
   where end_time < now() - interval '1 day'
     and jobid in (select jobid from cron.job where jobname in ('partner-push', 'partner-push-history'))
$$);
```

with:

```sql
   where end_time < now() - interval '1 day'
     and jobid in (select jobid from cron.job where jobname in ('partner-push', 'partner-push-history'))
$$);

-- The setup's check (spec §9): asks partner-push to send one push to a made-up token on Apple's test service, and
-- returns pg_net's request id. Apple's answer shows in net._http_response a few seconds later.
create function private.partner_push_probe() returns bigint
language sql set search_path = '' as $$
  select private.call_partner_push('{"probe": true}'::jsonb)
$$;
revoke all on function private.partner_push_probe() from public, anon, authenticated;
```

- [x] **Step 4: Run the whole suite**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && npm test
```

Expected: `ℹ tests 193`, `ℹ pass 193`, `ℹ fail 0`, in about 25 seconds.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty-partner-push add supabase/migrations/20261018120000_partner_links_push.sql supabase/tests/push_service.test.js && git -C ~/Dev/Duty-partner-push commit -q -m "feat(partner-links): the push service's setup check, and an undo the tests run" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty-partner-push log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty-partner-push status --short` shows nothing.

### Task 6: partner-push's parts

**Files:**
- Create: `supabase/functions/partner-push/index.ts`
- Test: `supabase/tests/partner_push.test.js`

Spec §6.2 and §7: the signing token, each push's request, and what Apple's answers mean. The tests import the function's own file: Node 23.6 and later run TypeScript by stripping its types, with an `ExperimentalWarning`.

- [x] **Step 1: Write the failing tests**

File: `supabase/tests/partner_push.test.js`

```javascript
// partner-push (supabase/functions/partner-push/index.ts), run under Node. Stand-ins take the place of Apple and of
// the database's claim and report. Spec: crewluve-web docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md,
// §6 and §7.
import assert from 'node:assert/strict'
import { before, describe, test } from 'node:test'
import { APNS_HOSTS, PUSH_BODY, base64url, importKey, outcome, pemBytes, pushRequest, signingToken } from '../functions/partner-push/index.ts'

/** A throwaway P-256 key pair, with the private key written as a .p8 file is. */
async function testKey() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
  const lines = Buffer.from(der).toString('base64').match(/.{1,64}/g)
  return { der, publicKey: pair.publicKey, pem: `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n` }
}

/** Whether `jwt` is an ES256 token that `publicKey` verifies, and its header and claims. */
async function readToken(jwt, publicKey) {
  const [header, claims, signature] = jwt.split('.')
  const valid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    Buffer.from(signature, 'base64url'),
    new TextEncoder().encode(`${header}.${claims}`),
  )
  return {
    valid,
    header: JSON.parse(Buffer.from(header, 'base64url').toString()),
    claims: JSON.parse(Buffer.from(claims, 'base64url').toString()),
  }
}

const TOKEN = 'ab'.repeat(32)
const TOPIC = 'com.ToddAnderson.Crewluv'

let key
before(async () => {
  key = await testKey()
})

describe("partner-push's parts (spec §6.2)", () => {
  test('base64url has no padding and uses the URL-safe letters', () => {
    assert.equal(base64url(new Uint8Array([251, 255, 191])), '-_-_')
    assert.equal(base64url(new Uint8Array([1])), 'AQ')
  })

  test('pemBytes reads a .p8 file, whatever its line breaks', () => {
    assert.deepEqual(pemBytes(key.pem), key.der)
    assert.deepEqual(pemBytes(`  ${key.pem.replace(/\n/g, '\r\n')}  `), key.der)
  })

  test("the signing token is an ES256 JWT with the key id and team id, which the key's public half verifies", async () => {
    const jwt = await signingToken(await importKey(key.pem), 'KEY123', 'TEAM456', 1_700_000_000)
    assert.deepEqual(await readToken(jwt, key.publicKey), {
      valid: true,
      header: { alg: 'ES256', kid: 'KEY123' },
      claims: { iss: 'TEAM456', iat: 1_700_000_000 },
    })
  })

  test("importKey refuses text that isn't a P-256 private key", async () => {
    await assert.rejects(importKey('-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----'))
  })

  test('a push goes to the service its device was built for, silently, at low priority, for an hour', () => {
    const sandbox = pushRequest({ pilot: 'p', token: TOKEN, env: 'sandbox' }, 'jwt', TOPIC, 1_700_000_000)
    assert.deepEqual(sandbox, {
      url: `https://api.sandbox.push.apple.com/3/device/${TOKEN}`,
      init: {
        method: 'POST',
        headers: {
          authorization: 'bearer jwt',
          'apns-topic': TOPIC,
          'apns-push-type': 'background',
          'apns-priority': '5',
          'apns-expiration': '1700003600',
          'content-type': 'application/json',
        },
        body: '{"aps":{"content-available":1}}',
      },
    })
    assert.equal(PUSH_BODY, '{"aps":{"content-available":1}}')
    const live = pushRequest({ pilot: 'p', token: TOKEN, env: 'production' }, 'jwt', TOPIC, 1_700_000_000)
    assert.equal(live.url, `https://api.push.apple.com/3/device/${TOKEN}`)
    assert.deepEqual(APNS_HOSTS, { production: 'https://api.push.apple.com', sandbox: 'https://api.sandbox.push.apple.com' })
  })

  test("Apple's answers, sorted as §7 says", () => {
    const table = [
      [200, undefined, 'sent'],
      [400, 'BadDeviceToken', 'dead'],
      [410, 'Unregistered', 'dead'],
      [410, 'ExpiredToken', 'dead'],
      [403, 'ExpiredProviderToken', 'renew'],
      [403, 'InvalidProviderToken', 'setup'],
      [400, 'BadTopic', 'setup'],
      [400, 'TopicDisallowed', 'setup'],
      [400, 'MissingTopic', 'setup'],
      [400, 'DeviceTokenNotForTopic', 'setup'],
      [429, 'TooManyRequests', 'retry'],
      [429, 'TooManyProviderTokenUpdates', 'retry'],
      [500, 'InternalServerError', 'retry'],
      [503, 'ServiceUnavailable', 'retry'],
      [400, 'PayloadEmpty', 'failed'],
      [403, 'MissingProviderToken', 'failed'],
      [413, 'PayloadTooLarge', 'failed'],
    ]
    for (const [status, reason, expected] of table) {
      assert.equal(outcome(status, reason), expected, `${status} ${reason}`)
    }
  })
})
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && node --no-maglev --test partner_push.test.js
```

Expected: the file fails to load, with `Cannot find module` (`ℹ fail 1`).

- [x] **Step 3: Write the parts**

File: `supabase/functions/partner-push/index.ts`

```typescript
// partner-push: wakes partners' Crewluve with a silent push through Apple when a pilot's status changes (partner
// links piece 3, crewluve-web docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md §6). The 15-second
// check, private.partner_push_tick(), calls it with the Vault's password. It claims the due pilots' Crewluve tokens
// (partner_push_claim), sends each one a push, and reports back (partner_push_report).
//
// One file with no imports, so it can be pasted whole into Supabase's function editor. Its tests run it under Node
// (supabase/tests/partner_push.test.js), so it serves only where Deno is.

/** Apple's push service, by the environment a Crewluve build registered its token for. */
export const APNS_HOSTS = {
  production: 'https://api.push.apple.com',
  sandbox: 'https://api.sandbox.push.apple.com',
} as const

/** A silent push: Crewluve wakes, calls partner_view, and decides what to show. */
export const PUSH_BODY = '{"aps":{"content-available":1}}'

/** One Crewluve's push token, as partner_push_claim hands it out. */
export type Device = { pilot: string; token: string; env: keyof typeof APNS_HOSTS }

/** Bytes as base64url without padding, as JWTs write them. */
export function base64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** The key inside a .p8 file's text: its base64 between the BEGIN and END lines, decoded. atob skips line breaks and spaces. */
export function pemBytes(pem: string): Uint8Array {
  const base64 = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

/** The .p8 key, ready to sign with. It rejects text that isn't a P-256 private key. */
export async function importKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('pkcs8', pemBytes(pem), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

/** A signing token for Apple (spec §6.2): an ES256 JWT naming the key and the team, made at nowSeconds. */
export async function signingToken(key: CryptoKey, keyId: string, teamId: string, nowSeconds: number): Promise<string> {
  const part = (value: object) => base64url(new TextEncoder().encode(JSON.stringify(value)))
  const unsigned = `${part({ alg: 'ES256', kid: keyId })}.${part({ iss: teamId, iat: nowSeconds })}`
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned))
  return `${unsigned}.${base64url(new Uint8Array(signature))}`
}

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

/** What Apple's answer to one push means (spec §7). */
export type Outcome = 'sent' | 'dead' | 'renew' | 'setup' | 'retry' | 'failed'

/** Answers that mean the setup is wrong. They come from every device alike, so no token is dropped for them. */
const SETUP_REASONS = ['InvalidProviderToken', 'BadTopic', 'TopicDisallowed', 'MissingTopic', 'DeviceTokenNotForTopic']

export function outcome(status: number, reason?: string): Outcome {
  if (status === 200) return 'sent'
  if (status === 410 || reason === 'BadDeviceToken') return 'dead'
  if (reason === 'ExpiredProviderToken') return 'renew'
  if (SETUP_REASONS.includes(reason ?? '')) return 'setup'
  if (status === 429 || status === 500 || status === 503) return 'retry'
  return 'failed'
}
```

- [x] **Step 4: Run the whole suite**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && npm test
```

Expected: `ℹ tests 199`, `ℹ pass 199`, `ℹ fail 0`, in about 25 seconds.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty-partner-push add supabase/functions/partner-push/index.ts supabase/tests/partner_push.test.js && git -C ~/Dev/Duty-partner-push commit -q -m "feat(partner-links): partner-push's parts: the Apple signing token, each push's request, and what Apple's answers mean" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty-partner-push log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty-partner-push status --short` shows nothing.

### Task 7: partner-push's run

**Files:**
- Modify: `supabase/functions/partner-push/index.ts`
- Test: `supabase/tests/partner_push.test.js`

Spec §6.2 and §7, decisions 6 to 12: claim, the pushes, the one renewal, report, and the logs. Stand-ins for fetch play Apple and PostgREST. The last three tests run it against the real claim and report, in PGlite, through a stand-in that calls them as PostgREST does.

- [x] **Step 1: Write the failing tests**

2 replacements, in order, in `supabase/tests/partner_push.test.js`:

In `supabase/tests/partner_push.test.js`, replace:

```javascript
// partner-push (supabase/functions/partner-push/index.ts), run under Node. Stand-ins take the place of Apple and of
// the database's claim and report. Spec: crewluve-web docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md,
// §6 and §7.
import assert from 'node:assert/strict'
import { before, describe, test } from 'node:test'
import { APNS_HOSTS, PUSH_BODY, base64url, importKey, outcome, pemBytes, pushRequest, signingToken } from '../functions/partner-push/index.ts'

/** A throwaway P-256 key pair, with the private key written as a .p8 file is. */
async function testKey() {
```

with:

```javascript
// partner-push (supabase/functions/partner-push/index.ts), run under Node. Stand-ins take the place of Apple and of
// the database's claim and report, and the last tests run it against the real ones in PGlite. Spec:
// crewluve-web docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md, §6 and §7.
import assert from 'node:assert/strict'
import { before, describe, test } from 'node:test'
import {
  APNS_HOSTS,
  AT_ONCE,
  PUSH_BODY,
  PUSH_TIMEOUT_MS,
  base64url,
  importKey,
  makeHandler,
  outcome,
  pemBytes,
  pushRequest,
  signingToken,
} from '../functions/partner-push/index.ts'
import { asAdmin, asService, freshDb } from './helpers/db.js'
import { connected, createPartner, join, setPush, setStatus } from './helpers/rpc.js'

/** A throwaway P-256 key pair, with the private key written as a .p8 file is. */
async function testKey() {
```

In `supabase/tests/partner_push.test.js`, replace:

```javascript
    }
  })
})
```

with:

```javascript
    }
  })
})

const SUPABASE_URL = 'https://cloud.test'
const SERVICE_KEY = 'sb_secret_for_tests'
const SECRET = 'password-for-tests'
/** The time partner-push runs at, in milliseconds. */
const NOW_MS = 1_700_000_000_000

/** partner-push's settings, as configFromEnv reads them, with the test key. */
const settings = (changes = {}) => ({
  supabaseUrl: SUPABASE_URL,
  serviceKey: SERVICE_KEY,
  keyId: 'KEY123',
  teamId: 'TEAM456',
  privateKey: key.pem,
  topic: TOPIC,
  ...changes,
})

/** Device n's Crewluve, as claim hands it out. */
const device = (n, env = 'production', pilot = `pilot-${n}`) => ({ pilot, token: n.toString(16).padStart(2, '0').repeat(32), env })

/**
 * A stand-in for fetch that records every request. Crewlu Cloud's functions answer through rpc(name, args), and Apple
 * through apple(push), where push has the device's env and token, and the request's headers and signal. Either can
 * throw, as fetch does when a connection fails.
 */
function standIns({ rpc, apple = () => ({ status: 200 }) }) {
  const requests = []
  const rpcPath = `${SUPABASE_URL}/rest/v1/rpc/`
  async function fetch(url, init) {
    requests.push({ url, init })
    if (url.startsWith(rpcPath)) {
      const { status = 200, body } = await rpc(url.slice(rpcPath.length), JSON.parse(init.body))
      return Response.json(body, { status })
    }
    const [, host, token] = url.match(/^(https:\/\/[a-z.]+)\/3\/device\/(.+)$/)
    const env = Object.keys(APNS_HOSTS).find((name) => APNS_HOSTS[name] === host)
    const { status, reason } = await apple({ env, token, headers: init.headers, signal: init.signal })
    return new Response(reason ? JSON.stringify({ reason }) : null, { status })
  }
  return {
    fetch,
    requests,
    pushes: () => requests.filter(({ url }) => !url.startsWith(SUPABASE_URL)),
    calls: (name) => requests.filter(({ url }) => url === rpcPath + name).map(({ init }) => JSON.parse(init.body)),
  }
}

/**
 * claim's and report's stand-ins. Like the real ones, they refuse any password but SECRET with SQLSTATE 28000, which
 * PostgREST answers with 403. claim hands out devices and signing; report answers with reportStatus.
 */
const cloud =
  ({ devices = [], signing = null, reportStatus = 200 } = {}) =>
  (name, args) => {
    if (args.p_secret !== SECRET) return { status: 403, body: { code: '28000', message: `${name}: wrong password` } }
    if (name === 'partner_push_claim') return { body: { devices, signing_token: signing } }
    return { status: reportStatus, body: reportStatus === 200 ? { ok: true } : { message: 'unavailable' } }
  }

/** One run of partner-push, called the way the check calls it: the password in its header, and the body {}. */
async function run(fetch, { secret = SECRET, body = {}, config = settings(), log = () => {} } = {}) {
  const handle = makeHandler({ config, fetch, now: () => NOW_MS, log })
  const headers = { 'content-type': 'application/json' }
  if (secret !== null) headers['x-partner-push-secret'] = secret
  const response = await handle(
    new Request('https://cloud.test/functions/v1/partner-push', { method: 'POST', headers, body: JSON.stringify(body) }),
  )
  return { status: response.status, body: await response.json() }
}

/** What a push carried: its address, method, headers and body. */
const sent = ({ url, init }) => ({ url, method: init.method, headers: init.headers, body: init.body })

const nothing = { sent: 0, dead: 0, retried: 0, failed: 0 }

describe("partner-push's run (spec §6.2, §7)", () => {
  test('it sends each claimed device a silent push with the stored signing token, and has nothing to report', async () => {
    const devices = [device(1), device(2, 'sandbox')]
    const fake = standIns({ rpc: cloud({ devices, signing: 'stored.jwt' }) })
    assert.deepEqual(await run(fake.fetch), { status: 200, body: { ...nothing, sent: 2 } })
    assert.deepEqual(fake.calls('partner_push_claim'), [{ p_secret: SECRET, p_probe: false }])
    assert.deepEqual(
      fake.pushes().map(sent),
      devices.map((d) => sent(pushRequest(d, 'stored.jwt', TOPIC, NOW_MS / 1000))),
    )
    assert.deepEqual(fake.calls('partner_push_report'), [])
    // The secret key goes in the apikey header only: Supabase refuses a new secret key in Authorization.
    for (const { url, init } of fake.requests.filter(({ url }) => url.startsWith(SUPABASE_URL))) {
      assert.equal(init.method, 'POST', url)
      assert.deepEqual(init.headers, { apikey: SERVICE_KEY, 'content-type': 'application/json' })
    }
  })

  test('with no stored signing token, it makes one at the time of the run and reports it', async () => {
    const fake = standIns({ rpc: cloud({ devices: [device(1)] }) })
    assert.deepEqual(await run(fake.fetch), { status: 200, body: { ...nothing, sent: 1 } })
    const jwt = fake.pushes()[0].init.headers.authorization.slice('bearer '.length)
    assert.deepEqual(await readToken(jwt, key.publicKey), {
      valid: true,
      header: { alg: 'ES256', kid: 'KEY123' },
      claims: { iss: 'TEAM456', iat: NOW_MS / 1000 },
    })
    assert.deepEqual(fake.calls('partner_push_report'), [
      { p_secret: SECRET, p_dead_tokens: [], p_retry_pilots: [], p_signing_token: jwt },
    ])
  })

  test('with nothing claimed, it sends nothing, makes no signing token and reports nothing', async () => {
    const fake = standIns({ rpc: cloud() })
    assert.deepEqual(await run(fake.fetch), { status: 200, body: nothing })
    assert.deepEqual(fake.pushes(), [])
    assert.deepEqual(fake.calls('partner_push_report'), [])
  })

  test('a wrong or missing password: claim refuses it, so it answers 401 and sends nothing', async () => {
    for (const secret of ['wrong', null]) {
      const fake = standIns({ rpc: cloud({ devices: [device(1)] }) })
      const result = await run(fake.fetch, { secret })
      assert.equal(result.status, 401, String(secret))
      assert.deepEqual(fake.calls('partner_push_claim'), [{ p_secret: secret, p_probe: false }])
      assert.deepEqual(fake.pushes(), [])
      assert.deepEqual(fake.calls('partner_push_report'), [])
    }
  })

  test('a claim that fails any other way, or can\'t be reached, answers 502 and sends nothing', async () => {
    const down = standIns({ rpc: () => ({ status: 503, body: { message: 'unavailable' } }) })
    assert.equal((await run(down.fetch)).status, 502)
    assert.deepEqual(down.pushes(), [])
    const unreachable = standIns({
      rpc: () => {
        throw new TypeError('fetch failed')
      },
    })
    assert.equal((await run(unreachable.fetch)).status, 502)
    assert.deepEqual(unreachable.pushes(), [])
  })

  test('missing settings, or a key that isn\'t one, answer 500 by name before anything is claimed', async () => {
    const fake = standIns({ rpc: cloud({ devices: [device(1)] }) })
    const missing = await run(fake.fetch, { config: settings({ keyId: undefined, topic: '' }) })
    assert.equal(missing.status, 500)
    assert.match(missing.body.error, /APNS_KEY_ID, APNS_TOPIC/)
    const notAKey = await run(fake.fetch, { config: settings({ privateKey: 'not a key' }) })
    assert.equal(notAKey.status, 500)
    assert.match(notAKey.body.error, /APNS_PRIVATE_KEY/)
    assert.deepEqual(fake.requests, [])
  })

  test("Apple's answers (§7): dead tokens are reported once each, temporary failures' pilots once each, the rest logged", async () => {
    const answers = {
      1: { status: 200 },
      2: { status: 410, reason: 'Unregistered' },
      3: { status: 400, reason: 'BadDeviceToken' },
      4: { status: 503, reason: 'ServiceUnavailable' },
      5: { status: 429, reason: 'TooManyRequests' },
      6: { status: 403, reason: 'InvalidProviderToken' },
      7: { status: 413, reason: 'PayloadTooLarge' },
    }
    const devices = [
      device(1, 'production', 'ann'),
      device(2, 'production', 'ann'),
      device(3, 'sandbox', 'bob'),
      device(4, 'production', 'bob'),
      device(5, 'production', 'bob'),
      device(6, 'production', 'cy'),
      device(7, 'production', 'cy'),
      device(8, 'production', 'dee'),
      device(9, 'production', 'eve'),
    ]
    const apple = ({ token }) => {
      const n = devices.findIndex((d) => d.token === token) + 1
      if (n === 8) throw new TypeError('fetch failed')
      if (n === 9) throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
      return answers[n]
    }
    const lines = []
    const fake = standIns({ rpc: cloud({ devices, signing: 'stored.jwt' }), apple })
    assert.deepEqual(await run(fake.fetch, { log: (line) => lines.push(line) }), {
      status: 200,
      body: { sent: 1, dead: 2, retried: 4, failed: 2 },
    })
    assert.deepEqual(fake.calls('partner_push_report'), [
      {
        p_secret: SECRET,
        p_dead_tokens: [devices[1].token, devices[2].token],
        p_retry_pilots: ['bob', 'dee', 'eve'],
        p_signing_token: null,
      },
    ])
    const log = lines.join('\n')
    for (const answer of ['503 ServiceUnavailable', '429 TooManyRequests', '403 InvalidProviderToken', '413 PayloadTooLarge', 'TypeError', 'TimeoutError']) {
      assert.match(log, new RegExp(answer), answer)
    }
    assert.match(log, /1 sent, 2 dead, 4 retried, 2 failed/)
  })

  test('ExpiredProviderToken: one new signing token for the run, each expired push sent once more with it, and kept', async () => {
    const devices = [device(1), device(2), device(3)]
    const seen = []
    const apple = ({ token, headers }) => {
      seen.push({ token, authorization: headers.authorization })
      const expired = headers.authorization === 'bearer stored.jwt' && token !== devices[2].token
      return expired ? { status: 403, reason: 'ExpiredProviderToken' } : { status: 200 }
    }
    const fake = standIns({ rpc: cloud({ devices, signing: 'stored.jwt' }), apple })
    assert.deepEqual(await run(fake.fetch), { status: 200, body: { ...nothing, sent: 3 } })
    const [reported] = fake.calls('partner_push_report')
    assert.equal((await readToken(reported.p_signing_token, key.publicKey)).valid, true)
    assert.deepEqual(reported, { p_secret: SECRET, p_dead_tokens: [], p_retry_pilots: [], p_signing_token: reported.p_signing_token })
    assert.deepEqual(seen.slice(3), [
      { token: devices[0].token, authorization: `bearer ${reported.p_signing_token}` },
      { token: devices[1].token, authorization: `bearer ${reported.p_signing_token}` },
    ])
    assert.equal(seen.length, 5)
  })

  test('a signing token Apple turns down is never kept, and a run renews at most once', async () => {
    const madeAndExpired = standIns({
      rpc: cloud({ devices: [device(1)] }),
      apple: () => ({ status: 403, reason: 'ExpiredProviderToken' }),
    })
    assert.deepEqual((await run(madeAndExpired.fetch)).body, { ...nothing, failed: 1 })
    assert.equal(madeAndExpired.pushes().length, 1)
    assert.deepEqual(madeAndExpired.calls('partner_push_report'), [])

    const storedAndRenewed = standIns({
      rpc: cloud({ devices: [device(1)], signing: 'stored.jwt' }),
      apple: () => ({ status: 403, reason: 'ExpiredProviderToken' }),
    })
    assert.deepEqual((await run(storedAndRenewed.fetch)).body, { ...nothing, failed: 1 })
    assert.equal(storedAndRenewed.pushes().length, 2)
    assert.deepEqual(storedAndRenewed.calls('partner_push_report'), [])

    // A wrong key or team id: keeping the token would hide the fix from the runs of the next 40 minutes.
    const invalid = standIns({
      rpc: cloud({ devices: [device(1)] }),
      apple: () => ({ status: 403, reason: 'InvalidProviderToken' }),
    })
    assert.deepEqual((await run(invalid.fetch)).body, { ...nothing, failed: 1 })
    assert.deepEqual(invalid.calls('partner_push_report'), [])
  })

  test('it sends at most 10 pushes at a time, each with its own timeout', async () => {
    const devices = Array.from({ length: 25 }, (_, i) => device(i + 1))
    let open = 0
    let most = 0
    const signals = []
    const apple = async ({ signal }) => {
      signals.push(signal)
      open += 1
      most = Math.max(most, open)
      await new Promise((resolve) => setTimeout(resolve, 2))
      open -= 1
      return { status: 200 }
    }
    const fake = standIns({ rpc: cloud({ devices, signing: 'stored.jwt' }), apple })
    assert.deepEqual((await run(fake.fetch)).body, { ...nothing, sent: 25 })
    assert.equal(most, 10)
    assert.equal(AT_ONCE, 10)
    assert.equal(new Set(signals).size, 25)
    assert.ok(signals.every((signal) => signal instanceof AbortSignal && !signal.aborted))
    assert.equal(PUSH_TIMEOUT_MS, 10_000)
  })

  test('a report that fails answers 502', async () => {
    // With the stored signing token, the dead token alone calls report.
    const fake = standIns({
      rpc: cloud({ devices: [device(1)], signing: 'stored.jwt', reportStatus: 500 }),
      apple: () => ({ status: 410, reason: 'Unregistered' }),
    })
    assert.equal((await run(fake.fetch)).status, 502)
    assert.equal(fake.calls('partner_push_report').length, 1)
  })

  test('its log names what Apple said, but never a token, the password or a key', async () => {
    const devices = [device(1), device(2), device(3), device(4)]
    const apple = ({ token }) => {
      const n = devices.findIndex((d) => d.token === token) + 1
      // Deno's fetch errors name the address, and so the device's token.
      if (n === 4) throw new TypeError(`error sending request for url (https://api.push.apple.com/3/device/${token})`)
      return [{ status: 200 }, { status: 410, reason: 'Unregistered' }, { status: 413, reason: 'PayloadTooLarge' }][n - 1]
    }
    const lines = []
    const fake = standIns({ rpc: cloud({ devices }), apple })
    await run(fake.fetch, { log: (line) => lines.push(line) })
    const log = lines.join('\n')
    assert.match(log, /1 sent, 1 dead, 1 retried, 1 failed/)
    const jwt = fake.pushes()[0].init.headers.authorization.slice('bearer '.length)
    for (const secret of [...devices.map((d) => d.token), jwt, SECRET, SERVICE_KEY, key.pem.split('\n')[1]]) {
      assert.ok(!log.includes(secret), `the log has ${secret}`)
    }
  })
})

/**
 * Crewlu Cloud's RPC door, as PostgREST runs it for the secret key: the body's keys are the function's named
 * arguments, and an error comes back as JSON, with PostgREST's status for its SQLSTATE (28000 is 403, and a function
 * that doesn't take those arguments 404).
 */
function postgrest(database) {
  const casts = { p_dead_tokens: '::text[]', p_retry_pilots: '::uuid[]' }
  return async (name, args) => {
    const names = Object.keys(args)
    const call = names.map((arg, i) => `${arg} => $${i + 1}${casts[arg] ?? ''}`).join(', ')
    try {
      const [{ r }] = await asService(database, `select public.${name}(${call}) as r`, names.map((arg) => args[arg]))
      return { body: r }
    } catch (error) {
      return { status: { 28000: 403, 42883: 404 }[error.code] ?? 400, body: { code: error.code, message: error.message } }
    }
  }
}

/** The calls the check and the probe asked pg_net to make, as partner-push receives them. */
async function queued(database) {
  const rows = await asAdmin(database, 'select url, headers, body from net.http_request_queue order by id')
  return rows.map(({ url, headers, body }) => new Request(url, { method: 'POST', headers, body: JSON.stringify(body) }))
}

/** A fresh database for one test, closed when the test ends. */
async function db(t) {
  const fresh = await freshDb()
  t.after(() => fresh.close())
  return fresh
}

/** partner-push, run once on request against the database, with Apple's answers from apple. */
async function runAgainst(database, request, apple) {
  const fake = standIns({ rpc: postgrest(database), apple })
  const response = await makeHandler({ config: settings(), fetch: fake.fetch, now: () => NOW_MS, log: () => {} })(request)
  return { fake, status: response.status, body: await response.json() }
}

const isDue = async (database, pilot) =>
  (await asAdmin(database, 'select push_due from public.partner_status where user_id = $1', [pilot]))[0].push_due

const tick = (database) => asAdmin(database, 'select private.partner_push_tick()')

describe('partner-push against the real claim and report (spec §5, §6)', () => {
  test("the check's call: every partner pushed on their own service, a dead token dropped, the signing token kept", async (t) => {
    const database = await db(t)
    const { pilot, key: sarah } = await connected(database)
    await setPush(database, sarah, device(1).token, 'production')
    const max = await createPartner(database, pilot, 'Max')
    await setPush(database, (await join(database, max.invite_token)).device_key, device(2).token, 'sandbox')
    const other = await connected(database)
    await setPush(database, other.key, device(3).token)
    await setStatus(database, pilot, { v: 1 }, 1)
    await setStatus(database, other.pilot, { v: 1 }, 1)
    await tick(database)
    const [request] = await queued(database)

    const gone = device(3).token
    const { fake, status, body } = await runAgainst(database, request, ({ token }) =>
      token === gone ? { status: 410, reason: 'Unregistered' } : { status: 200 },
    )
    assert.deepEqual({ status, body }, { status: 200, body: { sent: 2, dead: 1, retried: 0, failed: 0 } })
    assert.deepEqual(fake.pushes().map(({ url }) => url).sort(), [
      `${APNS_HOSTS.production}/3/device/${device(1).token}`,
      `${APNS_HOSTS.production}/3/device/${gone}`,
      `${APNS_HOSTS.sandbox}/3/device/${device(2).token}`,
    ])
    const tokens = await asAdmin(
      database,
      'select push_token, push_env from private.partner_device_secrets where push_token is not null order by push_token',
    )
    assert.deepEqual(tokens, [
      { push_token: device(1).token, push_env: 'production' },
      { push_token: device(2).token, push_env: 'sandbox' },
    ])
    const jwt = fake.pushes()[0].init.headers.authorization.slice('bearer '.length)
    assert.deepEqual(await asAdmin(database, 'select signing_token from private.partner_push_state'), [{ signing_token: jwt }])
    assert.equal(await isDue(database, pilot), false)
    await tick(database)
    assert.equal((await queued(database)).length, 1, 'nobody is due, so the next check calls nobody')
  })

  test("a push that didn't get through: the pilot is due again, and the next check calls partner-push again", async (t) => {
    const database = await db(t)
    const { pilot, key } = await connected(database)
    await setPush(database, key, device(1).token)
    await setStatus(database, pilot, { v: 1 }, 1)
    // With a stored signing token, the push to try again alone calls report.
    await asAdmin(database, "insert into private.partner_push_state (signing_token, made_at) values ('stored.jwt', now())")
    await tick(database)
    const [request] = await queued(database)
    const { body } = await runAgainst(database, request, () => ({ status: 503, reason: 'ServiceUnavailable' }))
    assert.deepEqual(body, { sent: 0, dead: 0, retried: 1, failed: 0 })
    assert.equal(await isDue(database, pilot), true)
    await tick(database)
    assert.equal((await queued(database)).length, 2)
  })

  test('a wrong password: 401, and nobody is taken', async (t) => {
    const database = await db(t)
    const { pilot, key } = await connected(database)
    await setPush(database, key, device(1).token)
    await setStatus(database, pilot, { v: 1 }, 1)
    const request = new Request('https://cloud.test/functions/v1/partner-push', {
      method: 'POST',
      headers: { 'x-partner-push-secret': 'wrong' },
      body: '{}',
    })
    const { fake, status } = await runAgainst(database, request, () => ({ status: 200 }))
    assert.equal(status, 401)
    assert.deepEqual(fake.pushes(), [])
    assert.equal(await isDue(database, pilot), true)
  })
})
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && node --no-maglev --test partner_push.test.js
```

Expected: the file fails to load, with `does not provide an export named 'AT_ONCE'` (`ℹ fail 1`).

- [x] **Step 3: Write the run**

One replacement in `supabase/functions/partner-push/index.ts`:

In `supabase/functions/partner-push/index.ts`, replace:

```typescript
  if (status === 429 || status === 500 || status === 503) return 'retry'
  return 'failed'
}
```

with:

```typescript
  if (status === 429 || status === 500 || status === 503) return 'retry'
  return 'failed'
}

/** Pushes in flight at once, and how long each may take (spec §6.2). */
export const AT_ONCE = 10
export const PUSH_TIMEOUT_MS = 10_000

/** partner-push's settings (spec §6.1), and the names they're set under. */
const SETTING_NAMES = {
  supabaseUrl: 'SUPABASE_URL',
  serviceKey: 'SUPABASE_SECRET_KEYS',
  keyId: 'APNS_KEY_ID',
  teamId: 'APNS_TEAM_ID',
  privateKey: 'APNS_PRIVATE_KEY',
  topic: 'APNS_TOPIC',
} as const

export type Config = { [setting in keyof typeof SETTING_NAMES]?: string }

/** What a run needs: its settings, and fetch, the clock and the log, which the tests stand in for. */
export type Deps = {
  config: Config
  fetch: (url: string, init: RequestInit) => Promise<Response>
  now: () => number
  log: (line: string) => void
}

/** How one push went: Apple's answer, or the error that stopped it. */
type Result = { outcome: Outcome; status?: number; reason?: string; error?: Error }

/** The reason in Apple's answer, if it gave one. */
async function reasonOf(response: Response): Promise<string | undefined> {
  const text = await response.text()
  try {
    return JSON.parse(text).reason
  } catch {
    return undefined
  }
}

/** A result, for the log. An error's message can hold the push's address, and so the token, so only its name is used. */
const said = (result: Result) => (result.error ? result.error.name : `${result.status} ${result.reason ?? ''}`.trim())

/** Calls work on each item, at most limit at a time, and returns the results in the items' order. */
async function eachAtMost<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await work(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/** partner-push itself: one run per call from the check (spec §6.2). */
export function makeHandler({ config, fetch, now, log }: Deps) {
  const answer = (status: number, body: object) => Response.json(body, { status })
  const nowSeconds = () => Math.floor(now() / 1000)

  /** Calls one of Crewlu Cloud's functions through PostgREST, as the service role. */
  async function rpc(name: string, args: object) {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${name}`, {
      method: 'POST',
      // A new secret key goes in the apikey header only: Supabase refuses one in Authorization.
      headers: { apikey: config.serviceKey!, 'content-type': 'application/json' },
      body: JSON.stringify(args),
    })
    const text = await response.text()
    return { ok: response.ok, status: response.status, body: text ? JSON.parse(text) : null }
  }

  /** Sends device one silent push, signed with jwt. */
  async function send(device: Device, jwt: string): Promise<Result> {
    const { url, init } = pushRequest(device, jwt, config.topic!, nowSeconds())
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(PUSH_TIMEOUT_MS) })
      const reason = await reasonOf(response)
      return { outcome: outcome(response.status, reason), status: response.status, reason }
    } catch (error) {
      return { outcome: 'retry', error: error as Error } // a timeout or a network error
    }
  }

  return async function handle(request: Request): Promise<Response> {
    try {
      const missing = Object.entries(SETTING_NAMES)
        .filter(([setting]) => !config[setting as keyof Config])
        .map(([, name]) => name)
      if (missing.length > 0) return answer(500, { error: `partner-push is missing ${missing.join(', ')}` })
      let key: CryptoKey
      try {
        key = await importKey(config.privateKey!)
      } catch {
        return answer(500, { error: "APNS_PRIVATE_KEY isn't the text of a .p8 key" })
      }

      const secret = request.headers.get('x-partner-push-secret')
      const claimed = await rpc('partner_push_claim', { p_secret: secret, p_probe: false })
      if (!claimed.ok) {
        log(`partner-push: claim answered ${claimed.status}`)
        return answer(claimed.status === 403 ? 401 : 502, { error: `claim answered ${claimed.status}` })
      }
      const devices: Device[] = claimed.body.devices
      if (devices.length === 0) return answer(200, { sent: 0, dead: 0, retried: 0, failed: 0 })

      // The stored signing token, or a new one. A run makes at most one more, when Apple calls the stored one expired.
      let jwt: string = claimed.body.signing_token
      let made = false
      const sign = async () => {
        jwt = await signingToken(key, config.keyId!, config.teamId!, nowSeconds())
        made = true
      }
      if (!jwt) await sign()
      const results = await eachAtMost(devices, AT_ONCE, (device) => send(device, jwt))
      const expired = devices.flatMap((device, index) => (results[index].outcome === 'renew' ? [index] : []))
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
        } else {
          counts.failed += 1
          log(`partner-push: a push failed: Apple answered ${said(result)}`)
        }
      })

      // A new token is kept for the next runs, unless Apple turned it down: keeping a token made with a wrong key
      // would hide the fix for 40 minutes.
      const turnedDown = results.some((r) => r.reason === 'InvalidProviderToken' || r.reason === 'ExpiredProviderToken')
      const keep = made && !turnedDown ? jwt : null
      if (dead.size > 0 || retry.size > 0 || keep) {
        const reported = await rpc('partner_push_report', {
          p_secret: secret,
          p_dead_tokens: [...dead],
          p_retry_pilots: [...retry],
          p_signing_token: keep,
        })
        if (!reported.ok) {
          log(`partner-push: report answered ${reported.status}`)
          return answer(502, { error: `report answered ${reported.status}`, ...counts })
        }
      }
      log(`partner-push: ${counts.sent} sent, ${counts.dead} dead, ${counts.retried} retried, ${counts.failed} failed`)
      return answer(200, counts)
    } catch (error) {
      log(`partner-push: ${(error as Error).name}: ${(error as Error).message}`)
      return answer(502, { error: (error as Error).name })
    }
  }
}
```

- [x] **Step 4: Run the whole suite**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && npm test
```

Expected: `ℹ tests 214`, `ℹ pass 214`, `ℹ fail 0`, in about 25 seconds.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty-partner-push add supabase/functions/partner-push/index.ts supabase/tests/partner_push.test.js && git -C ~/Dev/Duty-partner-push commit -q -m "feat(partner-links): partner-push's run: claim, up to 10 pushes at a time, one renewal of an expired signing token, and the report" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty-partner-push log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty-partner-push status --short` shows nothing.

### Task 8: partner-push's probe

**Files:**
- Modify: `supabase/functions/partner-push/index.ts`
- Test: `supabase/tests/partner_push.test.js`

Spec §6.3 and §9, decisions 8 and 11: one push to a made-up token on Apple's test service, and Apple's answer.

- [x] **Step 1: Write the failing tests**

2 replacements, in order, in `supabase/tests/partner_push.test.js`:

In `supabase/tests/partner_push.test.js`, replace:

```javascript
  })
})

/**
 * Crewlu Cloud's RPC door, as PostgREST runs it for the secret key: the body's keys are the function's named
 * arguments, and an error comes back as JSON, with PostgREST's status for its SQLSTATE (28000 is 403, and a function
```

with:

```javascript
  })
})

/** The probe's made-up token (spec §6.3). */
const ZEROS = '0'.repeat(64)

describe("the setup's probe (spec §6.3, §9)", () => {
  test('it checks the password with claim, takes nobody, and sends one push to a made-up token on the sandbox', async () => {
    const fake = standIns({ rpc: cloud({ signing: 'stored.jwt' }), apple: () => ({ status: 400, reason: 'BadDeviceToken' }) })
    assert.deepEqual(await run(fake.fetch, { body: { probe: true } }), {
      status: 200,
      body: { probe: { status: 400, reason: 'BadDeviceToken' } },
    })
    assert.deepEqual(fake.calls('partner_push_claim'), [{ p_secret: SECRET, p_probe: true }])
    assert.deepEqual(fake.pushes().map(sent), [
      sent(pushRequest({ pilot: 'probe', token: ZEROS, env: 'sandbox' }, 'stored.jwt', TOPIC, NOW_MS / 1000)),
    ])
    assert.deepEqual(fake.calls('partner_push_report'), [])
  })

  test('it keeps a new signing token Apple accepted, and not one Apple turned down', async () => {
    const accepted = standIns({ rpc: cloud(), apple: () => ({ status: 400, reason: 'BadDeviceToken' }) })
    await run(accepted.fetch, { body: { probe: true } })
    const jwt = accepted.pushes()[0].init.headers.authorization.slice('bearer '.length)
    assert.deepEqual(accepted.calls('partner_push_report'), [
      { p_secret: SECRET, p_dead_tokens: [], p_retry_pilots: [], p_signing_token: jwt },
    ])
    const notKept = standIns({ rpc: cloud({ reportStatus: 500 }), apple: () => ({ status: 400, reason: 'BadDeviceToken' }) })
    assert.deepEqual(await run(notKept.fetch, { body: { probe: true } }), {
      status: 502,
      body: { probe: { status: 400, reason: 'BadDeviceToken' }, error: 'report answered 500' },
    })
    for (const reason of ['InvalidProviderToken', 'ExpiredProviderToken']) {
      const turnedDown = standIns({ rpc: cloud(), apple: () => ({ status: 403, reason }) })
      assert.deepEqual(await run(turnedDown.fetch, { body: { probe: true } }), {
        status: 200,
        body: { probe: { status: 403, reason } },
      })
      assert.deepEqual(turnedDown.calls('partner_push_report'), [], reason)
    }
  })

  test("it shows why Apple couldn't be reached, and a wrong password gets 401", async () => {
    const unreachable = standIns({
      rpc: cloud(),
      apple: () => {
        throw new TypeError('error sending request: http2 error: protocol error')
      },
    })
    assert.deepEqual(await run(unreachable.fetch, { body: { probe: true } }), {
      status: 502,
      body: { probe: { error: 'TypeError: error sending request: http2 error: protocol error' } },
    })
    assert.deepEqual(unreachable.calls('partner_push_report'), [])
    const withCause = standIns({
      rpc: cloud(),
      apple: () => {
        throw new TypeError('fetch failed', { cause: new Error('stream error received: refused stream') })
      },
    })
    assert.deepEqual((await run(withCause.fetch, { body: { probe: true } })).body, {
      probe: { error: 'TypeError: fetch failed (Error: stream error received: refused stream)' },
    })
    const wrong = standIns({ rpc: cloud() })
    assert.equal((await run(wrong.fetch, { secret: 'wrong', body: { probe: true } })).status, 401)
    assert.deepEqual(wrong.pushes(), [])
  })
})

/**
 * Crewlu Cloud's RPC door, as PostgREST runs it for the secret key: the body's keys are the function's named
 * arguments, and an error comes back as JSON, with PostgREST's status for its SQLSTATE (28000 is 403, and a function
```

In `supabase/tests/partner_push.test.js`, replace:

```javascript
    assert.deepEqual(fake.pushes(), [])
    assert.equal(await isDue(database, pilot), true)
  })
})
```

with:

```javascript
    assert.deepEqual(fake.pushes(), [])
    assert.equal(await isDue(database, pilot), true)
  })

  test('the probe: nobody is taken, one push goes to the made-up token, and the new signing token is kept', async (t) => {
    const database = await db(t)
    const { pilot, key } = await connected(database)
    await setPush(database, key, device(1).token)
    await setStatus(database, pilot, { v: 1 }, 1)
    await asAdmin(database, 'select private.partner_push_probe()')
    const [request] = await queued(database)
    const { fake, status, body } = await runAgainst(database, request, () => ({ status: 400, reason: 'BadDeviceToken' }))
    assert.deepEqual({ status, body }, { status: 200, body: { probe: { status: 400, reason: 'BadDeviceToken' } } })
    assert.deepEqual(fake.pushes().map(({ url }) => url), [`${APNS_HOSTS.sandbox}/3/device/${ZEROS}`])
    assert.equal(await isDue(database, pilot), true)
    const jwt = fake.pushes()[0].init.headers.authorization.slice('bearer '.length)
    assert.deepEqual(await asAdmin(database, 'select signing_token from private.partner_push_state'), [{ signing_token: jwt }])
  })
})
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && node --no-maglev --test partner_push.test.js
```

Expected: `ℹ tests 25`, `ℹ pass 21`, `ℹ fail 4`. The probe's four tests fail; Task 7's pass.

- [x] **Step 3: Add the probe**

5 replacements, in order, in `supabase/functions/partner-push/index.ts`:

In `supabase/functions/partner-push/index.ts`, replace:

```typescript
/** How one push went: Apple's answer, or the error that stopped it. */
type Result = { outcome: Outcome; status?: number; reason?: string; error?: Error }

/** The reason in Apple's answer, if it gave one. */
async function reasonOf(response: Response): Promise<string | undefined> {
  const text = await response.text()
```

with:

```typescript
/** How one push went: Apple's answer, or the error that stopped it. */
type Result = { outcome: Outcome; status?: number; reason?: string; error?: Error }

/** Whether Apple turned down the signing token any of these pushes carried. */
const turnedDown = (results: Result[]) =>
  results.some((result) => result.reason === 'InvalidProviderToken' || result.reason === 'ExpiredProviderToken')

/** The probe's push (spec §6.3): a made-up token, on Apple's test service. */
const PROBE_DEVICE: Device = { pilot: 'probe', token: '0'.repeat(64), env: 'sandbox' }

/** The reason in Apple's answer, if it gave one. */
async function reasonOf(response: Response): Promise<string | undefined> {
  const text = await response.text()
```

In `supabase/functions/partner-push/index.ts`, replace:

```typescript
    }
  }

  return async function handle(request: Request): Promise<Response> {
    try {
      const missing = Object.entries(SETTING_NAMES)
```

with:

```typescript
    }
  }

  /**
   * The probe's answer (spec §9): Apple's status and reason, or why Apple couldn't be reached. Its token is made up, so
   * the error's whole message can be shown. A new signing token Apple accepted is kept; if keeping it fails, Apple's
   * answer still shows.
   */
  async function answerProbe(result: Result, keep: string | null, secret: string | null) {
    if (result.error) {
      const error = `${result.error}${result.error.cause ? ` (${result.error.cause})` : ''}`
      log(`partner-push: the probe couldn't reach Apple: ${error}`)
      return answer(502, { probe: { error } })
    }
    const probe = { status: result.status, reason: result.reason }
    if (keep) {
      const reported = await rpc('partner_push_report', {
        p_secret: secret,
        p_dead_tokens: [],
        p_retry_pilots: [],
        p_signing_token: keep,
      })
      if (!reported.ok) return answer(502, { probe, error: `report answered ${reported.status}` })
    }
    log(`partner-push: the probe: Apple answered ${said(result)}`)
    return answer(200, { probe })
  }

  return async function handle(request: Request): Promise<Response> {
    try {
      const missing = Object.entries(SETTING_NAMES)
```

In `supabase/functions/partner-push/index.ts`, replace:

```typescript
      }

      const secret = request.headers.get('x-partner-push-secret')
      const claimed = await rpc('partner_push_claim', { p_secret: secret, p_probe: false })
      if (!claimed.ok) {
        log(`partner-push: claim answered ${claimed.status}`)
        return answer(claimed.status === 403 ? 401 : 502, { error: `claim answered ${claimed.status}` })
      }
      const devices: Device[] = claimed.body.devices
      if (devices.length === 0) return answer(200, { sent: 0, dead: 0, retried: 0, failed: 0 })

      // The stored signing token, or a new one. A run makes at most one more, when Apple calls the stored one expired.
```

with:

```typescript
      }

      const secret = request.headers.get('x-partner-push-secret')
      const probe = ((await request.json().catch(() => null)) ?? {}).probe === true
      const claimed = await rpc('partner_push_claim', { p_secret: secret, p_probe: probe })
      if (!claimed.ok) {
        log(`partner-push: claim answered ${claimed.status}`)
        return answer(claimed.status === 403 ? 401 : 502, { error: `claim answered ${claimed.status}` })
      }
      const devices: Device[] = probe ? [PROBE_DEVICE] : claimed.body.devices
      if (devices.length === 0) return answer(200, { sent: 0, dead: 0, retried: 0, failed: 0 })

      // The stored signing token, or a new one. A run makes at most one more, when Apple calls the stored one expired.
```

In `supabase/functions/partner-push/index.ts`, replace:

```typescript
      }
      if (!jwt) await sign()
      const results = await eachAtMost(devices, AT_ONCE, (device) => send(device, jwt))
      const expired = devices.flatMap((device, index) => (results[index].outcome === 'renew' ? [index] : []))
      if (expired.length > 0 && !made) {
        await sign()
```

with:

```typescript
      }
      if (!jwt) await sign()
      const results = await eachAtMost(devices, AT_ONCE, (device) => send(device, jwt))
      if (probe) return await answerProbe(results[0], made && !turnedDown(results) ? jwt : null, secret)
      const expired = devices.flatMap((device, index) => (results[index].outcome === 'renew' ? [index] : []))
      if (expired.length > 0 && !made) {
        await sign()
```

In `supabase/functions/partner-push/index.ts`, replace:

```typescript

      // A new token is kept for the next runs, unless Apple turned it down: keeping a token made with a wrong key
      // would hide the fix for 40 minutes.
      const turnedDown = results.some((r) => r.reason === 'InvalidProviderToken' || r.reason === 'ExpiredProviderToken')
      const keep = made && !turnedDown ? jwt : null
      if (dead.size > 0 || retry.size > 0 || keep) {
        const reported = await rpc('partner_push_report', {
          p_secret: secret,
```

with:

```typescript

      // A new token is kept for the next runs, unless Apple turned it down: keeping a token made with a wrong key
      // would hide the fix for 40 minutes.
      const keep = made && !turnedDown(results) ? jwt : null
      if (dead.size > 0 || retry.size > 0 || keep) {
        const reported = await rpc('partner_push_report', {
          p_secret: secret,
```

- [x] **Step 4: Run the whole suite**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && npm test
```

Expected: `ℹ tests 218`, `ℹ pass 218`, `ℹ fail 0`, in about 25 seconds.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty-partner-push add supabase/functions/partner-push/index.ts supabase/tests/partner_push.test.js && git -C ~/Dev/Duty-partner-push commit -q -m "feat(partner-links): partner-push's probe for the setup: one push to a made-up token on Apple's test service, and Apple's answer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty-partner-push log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty-partner-push status --short` shows nothing.

### Task 9: partner-push in Supabase

**Files:**
- Modify: `supabase/functions/partner-push/index.ts`
- Test: `supabase/tests/partner_push.test.js`

Spec §6 and §6.1, decisions 6 and 12: its settings from Supabase's environment, and serving only where Deno is. A test checks the file has no imports, so it can be pasted whole.

- [x] **Step 1: Write the failing tests**

3 replacements, in order, in `supabase/tests/partner_push.test.js`:

In `supabase/tests/partner_push.test.js`, replace:

```javascript
  PUSH_BODY,
  PUSH_TIMEOUT_MS,
  base64url,
  importKey,
  makeHandler,
  outcome,
```

with:

```javascript
  PUSH_BODY,
  PUSH_TIMEOUT_MS,
  base64url,
  configFromEnv,
  importKey,
  makeHandler,
  outcome,
```

In `supabase/tests/partner_push.test.js`, replace:

```javascript
  pushRequest,
  signingToken,
} from '../functions/partner-push/index.ts'
import { asAdmin, asService, freshDb } from './helpers/db.js'
import { connected, createPartner, join, setPush, setStatus } from './helpers/rpc.js'

/** A throwaway P-256 key pair, with the private key written as a .p8 file is. */
```

with:

```javascript
  pushRequest,
  signingToken,
} from '../functions/partner-push/index.ts'
import { asAdmin, asService, freshDb, read } from './helpers/db.js'
import { connected, createPartner, join, setPush, setStatus } from './helpers/rpc.js'

/** A throwaway P-256 key pair, with the private key written as a .p8 file is. */
```

In `supabase/tests/partner_push.test.js`, replace:

```javascript
    assert.deepEqual(await asAdmin(database, 'select signing_token from private.partner_push_state'), [{ signing_token: jwt }])
  })
})
```

with:

```javascript
    assert.deepEqual(await asAdmin(database, 'select signing_token from private.partner_push_state'), [{ signing_token: jwt }])
  })
})

/** The environment Supabase gives partner-push, with the four settings the user sets. */
const environment = () => ({
  SUPABASE_URL,
  SUPABASE_SECRET_KEYS: JSON.stringify({ default: SERVICE_KEY, reports: 'sb_secret_another' }),
  SUPABASE_SERVICE_ROLE_KEY: 'legacy.service.role.jwt',
  SUPABASE_DB_URL: 'postgresql://postgres@db.cloud.test:5432/postgres',
  APNS_KEY_ID: 'KEY123',
  APNS_TEAM_ID: 'TEAM456',
  APNS_PRIVATE_KEY: key.pem,
  APNS_TOPIC: TOPIC,
})

describe('partner-push in Supabase (spec §6, §6.1)', () => {
  test("its settings: Supabase's address and default secret key, and the four the user sets", () => {
    const env = environment()
    assert.deepEqual(
      configFromEnv((name) => env[name]),
      settings(),
    )
  })

  test("without SUPABASE_SECRET_KEYS's default key it has no key, and says so: the legacy key isn't used", async () => {
    for (const keys of [undefined, 'not json', '{"reports":"sb_secret_another"}']) {
      const env = { ...environment(), SUPABASE_SECRET_KEYS: keys }
      const config = configFromEnv((name) => env[name])
      assert.equal(config.serviceKey, undefined, String(keys))
      const fake = standIns({ rpc: cloud() })
      const result = await run(fake.fetch, { config })
      assert.equal(result.status, 500)
      assert.match(result.body.error, /SUPABASE_SECRET_KEYS/)
      assert.deepEqual(fake.requests, [])
    }
  })

  test('it has no imports, so it can be pasted whole into the function editor', () => {
    const source = read(new URL('../functions/partner-push/index.ts', import.meta.url))
    assert.doesNotMatch(source, /^\s*import\b/m)
    assert.doesNotMatch(source, /\b(import|require)\s*\(/)
  })

  test('where Deno is, it serves every call, reading its settings from the environment', async () => {
    const served = []
    const env = environment()
    globalThis.Deno = { serve: (handler) => served.push(handler), env: { get: (name) => env[name] } }
    try {
      await import('../functions/partner-push/index.ts?deno')
    } finally {
      delete globalThis.Deno
    }
    assert.equal(served.length, 1)
    const realFetch = globalThis.fetch
    const fake = standIns({ rpc: cloud() })
    globalThis.fetch = fake.fetch
    try {
      const response = await served[0](
        new Request('https://cloud.test/functions/v1/partner-push', {
          method: 'POST',
          headers: { 'x-partner-push-secret': SECRET },
          body: '{}',
        }),
      )
      assert.deepEqual(await response.json(), nothing)
    } finally {
      globalThis.fetch = realFetch
    }
    assert.deepEqual(fake.calls('partner_push_claim'), [{ p_secret: SECRET, p_probe: false }])
    assert.equal(fake.requests[0].init.headers.apikey, SERVICE_KEY)
  })
})
```

- [x] **Step 2: Run them to see them fail**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && node --no-maglev --test partner_push.test.js
```

Expected: the file fails to load, with `does not provide an export named 'configFromEnv'` (`ℹ fail 1`).

- [x] **Step 3: Add the settings and the entry point**

One replacement in `supabase/functions/partner-push/index.ts`:

In `supabase/functions/partner-push/index.ts`, replace:

```typescript
    }
  }
}
```

with:

```typescript
    }
  }
}

/** partner-push's settings, from its environment (spec §6.1). */
export function configFromEnv(get: (name: string) => string | undefined): Config {
  return {
    supabaseUrl: get('SUPABASE_URL'),
    serviceKey: defaultSecretKey(get('SUPABASE_SECRET_KEYS')),
    keyId: get('APNS_KEY_ID'),
    teamId: get('APNS_TEAM_ID'),
    privateKey: get('APNS_PRIVATE_KEY'),
    topic: get('APNS_TOPIC'),
  }
}

/**
 * The default key in SUPABASE_SECRET_KEYS, the project's secret keys by name, which Supabase supplies. The legacy
 * SUPABASE_SERVICE_ROLE_KEY isn't used: Supabase stops the legacy keys at the end of 2026.
 */
function defaultSecretKey(keys: string | undefined): string | undefined {
  try {
    return JSON.parse(keys ?? '{}').default
  } catch {
    return undefined
  }
}

// In Supabase, Deno runs this file, and it serves every call, reading its settings each time. Under Node, in the
// tests, there's no Deno, so nothing is served.
const deno = (globalThis as any).Deno
if (deno) {
  deno.serve((request: Request) =>
    makeHandler({
      config: configFromEnv((name) => deno.env.get(name)),
      fetch: (url, init) => fetch(url, init),
      now: () => Date.now(),
      log: (line) => console.log(line),
    })(request),
  )
}
```

- [x] **Step 4: Run the whole suite**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && npm test
```

Expected: `ℹ tests 222`, `ℹ pass 222`, `ℹ fail 0`, in about 25 seconds.

- [x] **Step 5: Commit**

Run:

```bash
git -C ~/Dev/Duty-partner-push add supabase/functions/partner-push/index.ts supabase/tests/partner_push.test.js && git -C ~/Dev/Duty-partner-push commit -q -m "feat(partner-links): partner-push reads its settings from Supabase, with the default secret key, and serves only where Deno is" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty-partner-push log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty-partner-push status --short` shows nothing.

### Task 10: The docs

**Files:**
- Modify: `supabase/partner-api.md`, `supabase/tests/README.md`

Spec §12: the partner door's "Pushes" section for piece 4, the undo's order, and what the tests now stand in for.

- [x] **Step 1: Add the Pushes section and the undo's order**

3 replacements, in order, in `supabase/partner-api.md`:

In `supabase/partner-api.md`, replace:

```markdown

How CrewLu, Crewluve and the Crewluve website use partner links.

- **Where it comes from:** piece 1 of the partner-links design (`crewluve-web` repo, `docs/superpowers/specs/2026-10-15-partner-links-design.md`).
- **The SQL:** `migrations/*_partner_links_*.sql`. Its tests are in `tests/`.
- **How to call it:** every call is a PostgREST RPC.
  - `POST https://corxvurxpnrzekbxdgye.supabase.co/rest/v1/rpc/<name>`
  - The publishable key goes in the `apikey` header.
```

with:

```markdown

How CrewLu, Crewluve and the Crewluve website use partner links.

- **Where it comes from:** piece 1 of the partner-links design (`crewluve-web` repo, `docs/superpowers/specs/2026-10-15-partner-links-design.md`). The pushes are piece 3 (`docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md`).
- **The SQL:** `migrations/*_partner_links_*.sql`. Its tests are in `tests/`.
- **The pushes' sender:** the Edge Function `partner-push`, `functions/partner-push/index.ts`. Its tests are in `tests/` too.
- **How to call it:** every call is a PostgREST RPC.
  - `POST https://corxvurxpnrzekbxdgye.supabase.co/rest/v1/rpc/<name>`
  - The publishable key goes in the `apikey` header.
```

In `supabase/partner-api.md`, replace:

```markdown
- **Links, codes and tickets:** longer than 200 characters answers `sharing_ended`.
- **Wrong codes:** 30 in a minute pause every code redemption for about a minute (`try_later`). Someone sending junk codes can keep hand-off codes paused for as long as they keep at it. Invites and move tickets aren't affected.

## The summary JSON (`p_status`)

It's CrewLu's `SharedPilotStatus`: every field under its Swift name, null for nothing, dates as seconds since 1970, plus `schemaVersion: 1`. The full shape is [`partner-status/schema.json`](partner-status/schema.json), with nine examples beside it; [`partner-status/README.md`](partner-status/README.md) says what each one is.
```

with:

```markdown
- **Links, codes and tickets:** longer than 200 characters answers `sharing_ended`.
- **Wrong codes:** 30 in a minute pause every code redemption for about a minute (`try_later`). Someone sending junk codes can keep hand-off codes paused for as long as they keep at it. Invites and move tickets aren't affected.

## Pushes (piece 3)

When a pilot's summary changes, CrewLu Cloud wakes their partners' Crewluve with a silent push through Apple:

- **A push means "call `partner_view`".** It's silent (`content-available`, no alert) and carries nothing else. Crewluve reads the summary and decides what to show, as it does after an iCloud push today.
- **Register on every launch,** once iOS has given Crewluve a token: call `partner_set_push` with the token in hex and `p_env` `sandbox` for Debug builds, or `production` for TestFlight and the App Store. A token moves to the newest device that registers it.
- **Tokens Apple rejects are dropped on the server.** Crewluve sends a fresh one at its next launch.
- **At most one push per pilot every 15 seconds,** and the last change in a burst always gets one. iOS decides when to deliver silent pushes and holds some back, so Crewluve still refreshes when it opens and every 60 seconds while it's open.
- **Only `app` devices get pushes.** The website polls.

## The summary JSON (`p_status`)

It's CrewLu's `SharedPilotStatus`: every field under its Swift name, null for nothing, dates as seconds since 1970, plus `schemaVersion: 1`. The full shape is [`partner-status/schema.json`](partner-status/schema.json), with nine examples beside it; [`partner-status/README.md`](partner-status/README.md) says what each one is.
```

In `supabase/partner-api.md`, replace:

````markdown

## Undo

This removes everything the three partner-links migrations added. It touches nothing that existed before them. If anything is left in `private`, the last `drop schema` fails and the whole undo rolls back.

```sql
begin;
````

with:

````markdown

## Undo

This removes everything piece 1's three partner-links migrations added. It touches nothing that existed before them. If anything is left in `private`, the last `drop schema` fails and the whole undo rolls back.

**Undo the pushes first** (piece 3), with the undo in the header of `migrations/20261018120000_partner_links_push.sql`, then delete `partner-push` in the dashboard. Their table and functions are in `private`, so while they're there, this undo changes nothing.

```sql
begin;
````

- [x] **Step 2: Update the tests' README**

4 replacements, in order, in `supabase/tests/README.md`:

In `supabase/tests/README.md`, replace:

```markdown
Tests for the SQL in `../migrations`:
- Phase 1's history file (`20260607230000_phase1_profiles_and_signup.sql`), which holds Appendix B of the Phase 1 plan: the file stays Appendix B byte for byte, a build of the folder alone has CrewLu Cloud's `profiles` table and sign-up trigger, and running the file again in the SQL editor changes nothing;
- the partner-links migrations (`*_partner_links_*.sql`);
- the 2026-10-15 search_path fix (`20261015230000_function_search_path_and_signup_trigger_grant.sql`): each suite runs without the fix and with it, plus a check that the migration can run twice and be undone;
- guards that mirror three of the Supabase security advisor's lints (0011, 0028 and 0029) on a build of every migration, so a new migration that undoes the fix fails here first;
- `replace_trip` deleting the trip's crew rows that leaked onto the per-row channel (`20261017210000_replace_trip_clears_leaked_crew.sql`): a leaked row no longer swallows the person an upload puts back, and rows of other trips, other accounts, manual events and crew with no parent are left alone;
- the partner summary's contract (`../partner-status`): each example matches `schema.json` (checked with [Ajv](https://ajv.js.org), the only other dependency), `set_partner_status` accepts it, and `partner_view` shows each partner only their own entries.

They run in [PGlite](https://pglite.dev), which is Postgres compiled to WebAssembly, so they need only Node. There's no Docker, no Supabase CLI and no connection to CrewLu Cloud.

## Run them
```

with:

```markdown
Tests for the SQL in `../migrations`:
- Phase 1's history file (`20260607230000_phase1_profiles_and_signup.sql`), which holds Appendix B of the Phase 1 plan: the file stays Appendix B byte for byte, a build of the folder alone has CrewLu Cloud's `profiles` table and sign-up trigger, and running the file again in the SQL editor changes nothing;
- the partner-links migrations (`*_partner_links_*.sql`);
- partner-push, the Edge Function that sends partner links' pushes (`../functions/partner-push/index.ts`): run under Node with stand-ins for Apple, then against the real claim and report;
- the 2026-10-15 search_path fix (`20261015230000_function_search_path_and_signup_trigger_grant.sql`): each suite runs without the fix and with it, plus a check that the migration can run twice and be undone;
- guards that mirror three of the Supabase security advisor's lints (0011, 0028 and 0029) on a build of every migration, so a new migration that undoes the fix fails here first;
- `replace_trip` deleting the trip's crew rows that leaked onto the per-row channel (`20261017210000_replace_trip_clears_leaked_crew.sql`): a leaked row no longer swallows the person an upload puts back, and rows of other trips, other accounts, manual events and crew with no parent are left alone;
- the partner summary's contract (`../partner-status`): each example matches `schema.json` (checked with [Ajv](https://ajv.js.org), the only other dependency), `set_partner_status` accepts it, and `partner_view` shows each partner only their own entries.

They run in [PGlite](https://pglite.dev), which is Postgres compiled to WebAssembly, so they need only Node. There's no Docker, no Supabase CLI, no Deno and no connection to CrewLu Cloud or Apple.

## Run them
```

In `supabase/tests/README.md`, replace:

````markdown
npm test
```

172 tests run in about 20 seconds, each test file in its own process. `npm test` runs `node --no-maglev --test`. Without `--no-maglev`, Node 23.11 sometimes deadlocks under the test runner:
- a background Maglev compile waits for a garbage collection, while the main thread waits for that compile;
- see https://github.com/nodejs/node/issues/54918;
- a hung run sits at almost no CPU.
````

with:

````markdown
npm test
```

222 tests run in about 25 seconds, each test file in its own process. `npm test` runs `node --no-maglev --test`. Without `--no-maglev`, Node 23.11 sometimes deadlocks under the test runner:
- a background Maglev compile waits for a garbage collection, while the main thread waits for that compile;
- see https://github.com/nodejs/node/issues/54918;
- a hung run sits at almost no CPU.
````

In `supabase/tests/README.md`, replace:

```markdown
  - `auth.users`, owned by `supabase_auth_admin` as in production, and `auth.uid()`;
  - the part of `storage` the phase 2 migration uses: `storage.buckets`, `storage.objects` and `storage.foldername`;
  - the default privileges Supabase gives new tables and functions in `public`;
  - the two pgcrypto functions the migrations call, `extensions.digest` and `extensions.gen_random_bytes`.
- **`helpers/db.js`** makes fresh databases two ways:
  - `freshDb()`: the shim and every partner-links migration. The partner-links tests use it.
  - `cloudDb(files)`: the shim, then the given migrations in order. With no list it loads every migration in the folder, so a new one is included without being listed. The advisor guards and the history file's tests use that, so a new migration that needs a part of Supabase the shim lacks (a realtime publication, pg_cron, another extension) breaks their build until the shim gains it.

  It runs SQL the way CrewLu Cloud's callers do:
  - `asUser`: as a signed-in pilot, the way PostgREST does;
  - `asAnon`: as a caller holding only the publishable key;
  - `asAuthAdmin`: as Supabase Auth. `signUp` makes accounts this way, so the sign-up trigger fires as it does in production;
  - `asAdmin`: as the owner, to set up and inspect.
- **`helpers/search_path_fix.js`** has what's specific to the search_path fix's tests:
```

with:

```markdown
  - `auth.users`, owned by `supabase_auth_admin` as in production, and `auth.uid()`;
  - the part of `storage` the phase 2 migration uses: `storage.buckets`, `storage.objects` and `storage.foldername`;
  - the default privileges Supabase gives new tables and functions in `public`;
  - the two pgcrypto functions the migrations call, `extensions.digest` and `extensions.gen_random_bytes`;
  - pg_cron, pg_net and the Vault, which the push service's migration uses. They keep what they're given: nothing runs on a schedule, no request leaves, and secrets aren't encrypted.
- **`helpers/db.js`** makes fresh databases two ways:
  - `freshDb()`: the shim and every partner-links migration. The partner-links tests use it.
  - `cloudDb(files)`: the shim, then the given migrations in order. With no list it loads every migration in the folder, so a new one is included without being listed. The advisor guards and the history file's tests use that, so a new migration that needs a part of Supabase the shim lacks (a realtime publication, another extension) breaks their build until the shim gains it.

  It runs SQL the way CrewLu Cloud's callers do:
  - `asUser`: as a signed-in pilot, the way PostgREST does;
  - `asAnon`: as a caller holding only the publishable key;
  - `asService`: as a caller holding the secret key, which partner-push is;
  - `asAuthAdmin`: as Supabase Auth. `signUp` makes accounts this way, so the sign-up trigger fires as it does in production;
  - `asAdmin`: as the owner, to set up and inspect.
- **`helpers/search_path_fix.js`** has what's specific to the search_path fix's tests:
```

In `supabase/tests/README.md`, replace:

```markdown
  - the four functions it changes.
- **`helpers/rpc.js`** has one wrapper per partner-links RPC.
- **`helpers/seed.js`** writes partner-links rows directly, for tests that need them without going through the RPCs.

## What they don't cover

- **Postgres version.** PGlite is Postgres 18, and CrewLu Cloud runs 17. The migrations avoid anything newer than 17.
- **Real pgcrypto.** PGlite's pgcrypto hangs about half the times it loads, so the shim stands in for it. The shim's comments explain how.
- **PostgREST and HTTP.** The tests call SQL directly. After applying a migration to CrewLu Cloud, run the HTTP checks from the plan that shipped it. For partner links, those are in `../partner-api.md`.
- **The rest of the advisor.** The guards copy three of its lints. After applying a migration, check CrewLu Cloud's advisor too.
```

with:

```markdown
  - the four functions it changes.
- **`helpers/rpc.js`** has one wrapper per partner-links RPC.
- **`helpers/seed.js`** writes partner-links rows directly, for tests that need them without going through the RPCs.
- **`partner_push.test.js`** imports partner-push's own file: Node 23.6 and later run TypeScript by stripping its types, with a warning. Its stand-ins take the place of fetch, so Apple's answers, PostgREST's and the clock are the test's to choose.

## What they don't cover

- **Postgres version.** PGlite is Postgres 18, and CrewLu Cloud runs 17. The migrations avoid anything newer than 17.
- **Real pgcrypto.** PGlite's pgcrypto hangs about half the times it loads, so the shim stands in for it. The shim's comments explain how.
- **PostgREST and HTTP.** The tests call SQL directly. partner-push's stand-in for PostgREST copies only its named arguments and the statuses it gives errors. After applying a migration to CrewLu Cloud, run the HTTP checks from the plan that shipped it. For partner links, those are in `../partner-api.md`.
- **Apple, and Supabase's Deno.** Whether partner-push reaches Apple over HTTP/2 from Supabase is proven by the setup's probe, and real pushes to a phone are tested in piece 4.
- **pg_cron and pg_net.** The shim only records what they're given. After the setup, the last runs of the `partner-push` job show the check running.
- **The rest of the advisor.** The guards copy three of its lints. After applying a migration, check CrewLu Cloud's advisor too.
```

- [x] **Step 3: Commit**

Run:

```bash
git -C ~/Dev/Duty-partner-push add supabase/partner-api.md supabase/tests/README.md && git -C ~/Dev/Duty-partner-push commit -q -m "docs(partner-links): the partner door's Pushes section and undo order, and what the tests now stand in for" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git -C ~/Dev/Duty-partner-push log --oneline -1
```

Expected: the new commit's line. `git -C ~/Dev/Duty-partner-push status --short` shows nothing.

### Task 11: The whole suite, and a review

**Files:** whatever the review finds.

- [x] **Step 1: Run the whole suite**

Run:

```bash
cd ~/Dev/Duty-partner-push/supabase/tests && npm test
```

Expected: `ℹ tests 222`, `ℹ pass 222`, `ℹ fail 0`, in about 25 seconds.

- [x] **Step 2: Ask for a review**

Use superpowers:requesting-code-review with a read-only reviewer. It reads `git -C ~/Dev/Duty-partner-push diff 71c1b29a..feature/partner-push`, this plan and the spec (`~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md`), and it may run `npm test` in `~/Dev/Duty-partner-push/supabase/tests`; nothing else. It changes nothing, contacts nothing and runs no Xcode. State facts neutrally, and don't tell it what not to flag.

- [x] **Step 3: Act on it**

For each finding, fix it test-first, run `npm test` again, and commit with the exact paths. Note each fix in this plan's Execution notes. Nothing goes onto Crewlu Cloud before this (spec §10).

### Task 12: The user's setup

**Files:** none. The Apple Developer account and Crewlu Cloud change here, by the user's hands (spec §9). Claude never sees the Apple key (spec §8). Claude's Supabase connection is read-only, so it can only read what the setup made, and only with the user's yes.

- [x] **Step 1: Ask before going live**

Ask the user one question: set it up now? It's the spec's decision 2 (on as soon as it's built and reviewed), but it changes Crewlu Cloud, so it gets its own yes. From the SQL script on, the check runs every 15 seconds, but it calls partner-push only when a pilot whose partner has a new Crewluve is due, so nothing is sent until piece 4. If not now, stop here: Tasks 13 and 14 wait too.

- [x] **Step 2: The Apple push key**

Send the user these steps:

1. In Safari, go to developer.apple.com/account and sign in.
2. Under **Certificates, Identifiers & Profiles**, click **Keys** in the sidebar, then the **+** button at the top left.
3. **Key Name:** `Crewluve partner pushes`.
4. Tick **Apple Push Notifications service (APNs)**, then click **Configure** beside it.
5. Choose both environments (**Sandbox & Production**) and **Topic Specific**, with Crewluve (`com.ToddAnderson.Crewluv`) as its topic (decision 14). Save.
6. Click **Continue**, check the summary, then click **Register** (Apple's help calls it **Confirm**).
7. Click **Download**. Apple lets you download it only once: keep the file (`AuthKey_` and ten characters, then `.p8`) somewhere safe, outside both repos. Those ten characters are the **Key ID**.
8. On the account page, open **Membership details** and note the **Team ID** (ten characters).

If you already have an APNs key that covers both environments and Crewluve, you can use it instead.

- [x] **Step 3: partner-push in Supabase**

Claude puts the function's file on the clipboard. Run it with the sandbox off: from inside it, `pbcopy` doesn't reach the user's clipboard.

Run:

```bash
pbcopy < ~/Dev/Duty-partner-push/supabase/functions/partner-push/index.ts && echo copied
```

Expected: `copied`.

Then send the user these steps:

1. Open supabase.com/dashboard and the CrewLu Cloud project.
2. In the left sidebar, click **Edge Functions**.
3. Click **Deploy a new function**, then **Via Editor**.
4. Click in the editor, select all the example code (⌘A) and paste (⌘V).
5. Name the function `partner-push`, exactly: the address the SQL script stores ends with that name.
6. Click **Deploy function**, and wait for the success message.
7. On partner-push's page, open its settings (the **Details** tab), turn off the switch for JWT verification (labeled like **Verify JWT**), and save. The check sends no sign-in: the password guards partner-push instead (spec §6.1).

- [x] **Step 4: Its four secrets**

Send the user these steps:

1. Under **Edge Functions**, open **Secrets**.
2. Add these four, with **Add another** between them, then click **Save**:
   - `APNS_KEY_ID`: the Key ID.
   - `APNS_TEAM_ID`: the Team ID.
   - `APNS_PRIVATE_KEY`: the whole text of the `.p8` file, from `-----BEGIN PRIVATE KEY-----` to `-----END PRIVATE KEY-----`. To copy it, right-click the file, choose **Open With** → **TextEdit**, then press ⌘A and ⌘C.
   - `APNS_TOPIC`: `com.ToddAnderson.Crewluv`
3. Check that `SUPABASE_SECRET_KEYS` is in the list of secrets Supabase supplies (decision 6).

- [x] **Step 5: The SQL script**

Claude puts the script on the clipboard, again with the sandbox off:

Run:

```bash
pbcopy < ~/Dev/Duty-partner-push/supabase/migrations/20261018120000_partner_links_push.sql && echo copied
```

Expected: `copied`.

Then send the user these steps:

1. In the left sidebar, click **SQL Editor**, and start a new query.
2. Paste (⌘V) and click **Run**.
3. If it warns about a destructive operation, that's the clean-up job's `delete`, which runs once a day: confirm it.
4. Expected: the result of the script's last `select`, a `schedule` column holding `2` (the clean-up job's number; the check's is `1`). If it says something `already exists`, the script ran before: stop and ask.

The check starts at once.

- [x] **Step 6: The probe**

Send the user these steps:

1. In a new query, run `select private.partner_push_probe();`. It answers with a number.
2. Wait five seconds, then run this, with that number in place of `N`:

```sql
select status_code, content, error_msg, timed_out from net._http_response where id = N;
```

Or, with the user's yes, Claude runs that `select` through its read-only connection.

Expected: `status_code` 200 and `content` `{"probe":{"sandbox":{"status":400,"reason":"BadDeviceToken"},"production":{"status":400,"reason":"BadDeviceToken"}}}`. Both of Apple's services accepted the key and the Team ID, over HTTP/2, and turned down the made-up token (spec §9). Otherwise:

| What it says | What's wrong |
|---|---|
| no row yet | wait a few more seconds and run the `select` again |
| `timed_out` true | partner-push took over 30 seconds: look at its logs (**Edge Functions** → **partner-push** → **Logs**), where the probe also logs its answer |
| `error_msg` set | pg_net couldn't connect to partner-push: read the message, and partner-push's logs |
| `"reason":"InvalidProviderToken"` for both services | `APNS_KEY_ID`, `APNS_TEAM_ID` or `APNS_PRIVATE_KEY` |
| a 403 for one service only | most likely a key made for the other environment only: make one for **Sandbox & Production**. Its new Key ID means the old signing token isn't used |
| `"reason":"TopicDisallowed"` or `"BadTopic"` | `APNS_TOPIC`, or a key whose topic isn't Crewluve |
| `"reason":"TooManyProviderTokenUpdates"` | probes too close together: wait 20 minutes |
| `partner-push is missing …` | the secret it names |
| `APNS_PRIVATE_KEY isn't the text of a .p8 key` | the key's text: paste the whole file again |
| `Missing authorization header` or `Invalid JWT` | JWT verification is still on |
| `Requested function was not found` | the function's name isn't `partner-push` |
| `claim answered 401` | the secret key: check `SUPABASE_SECRET_KEYS` |
| `"error":…` for a service | Supabase's fetch couldn't reach Apple over HTTP/2. Stop: partner-push moves to Deno's `node:http2` (spec §9), a change of its own, test-first |

After fixing a secret, run the probe again: partner-push reads its secrets on every call (decision 12), and the script needn't run again. A stored signing token made with another key or team isn't used, and one Apple turned down isn't kept (decision 8, and the review's fix).

- [x] **Step 7: The check is running**

A minute after the script, the user runs, or Claude with a yes:

```sql
select status, start_time, return_message from cron.job_run_details
 where jobid = (select jobid from cron.job where jobname = 'partner-push')
 order by start_time desc limit 5;
```

Expected: five rows, `succeeded`, about 15 seconds apart (spec §9 step 6).

- [x] **Step 8: The security advisor**

In the dashboard, open **Advisors** → **Security Advisor** and refresh it, or Claude reads it with a yes. Expected: one new INFO finding, `rls_enabled_no_policy` on `private.partner_push_state`, as piece 1's three private tables already have (its RLS is on with no policies, on purpose: no client reaches it). Nothing else about piece 3's functions or table (`partner_push_claim`, `partner_push_report`, `partner_push_state`, `call_partner_push`, `partner_push_tick`, `partner_push_probe`, `push_secret`, `require_push_password`). Note the probe's and the check's results in this plan's Execution notes.

### Task 13: Record the decisions

**Files (in `~/Dev/Crewluve Website`):**
- Modify: `docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md`, and this plan

- [x] **Step 1: Add the planning decisions to the spec**

At the end of the spec, after §13, add `## 14. Decisions made while planning`, followed by this plan's "Decisions made while planning" list, copied as it stands, then any changes from the review (Task 11) and the setup's results (Task 12). Then update its status line.

In `~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md`, replace:

```markdown
- **Status:** approved by the user on 2026-10-18. Plan: `docs/superpowers/plans/2026-10-18-partner-links-piece3-push.md`.
```

with:

```markdown
- **Status:** approved by the user on 2026-10-18, built and set up on Crewlu Cloud (`docs/superpowers/plans/2026-10-18-partner-links-piece3-push.md`).
```

- [x] **Step 2: Tick this plan and commit**

Run:

```bash
cd ~/"Dev/Crewluve Website" && git add docs/superpowers/specs/2026-10-18-partner-links-piece3-push-design.md docs/superpowers/plans/2026-10-18-partner-links-piece3-push.md && git commit -q -m "Plan 3 built: the push service; spec records the planning decisions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git log --oneline -1
```

Expected: the new commit. Don't push.

### Task 14: Finish

**Files:** none.

- [ ] **Step 1: Ask how to merge**

Ask the user one question: merge `feature/partner-push` into `feature/supabase-account-backend` now? Spec §11 merges it after the setup's checks pass. It changes only `supabase/`, so no CrewLu build changes. If yes, and `~/Dev/Duty` is still on `feature/supabase-account-backend` with only the scheme lines changed, run `git -C ~/Dev/Duty merge --ff-only feature/partner-push`, which works while the release line is still `71c1b29a`. If the release line moved on, ask before making a merge commit instead.

- [ ] **Step 2: Remove the worktree**

Only once the branch is merged: `rm -rf ~/Dev/Duty-partner-push/supabase/tests/node_modules && git -C ~/Dev/Duty worktree remove ~/Dev/Duty-partner-push && git -C ~/Dev/Duty branch -d feature/partner-push`. If it's kept apart, keep the worktree.

- [ ] **Step 3: Push only with a fresh yes**

Ask separately before each push: `feature/supabase-account-backend` (or `feature/partner-push`, if kept apart) in `~/Dev/Duty`, and `main` in `~/Dev/Crewluve Website`.

---

## Execution notes

Filled in during the build: any place the code ends up different from the printed blocks, and why, and the setup's results.

- **Tasks 0–10, 2026-10-18:** applied by a script from the plan's own steps (the same steps the replay checked). Every Run step gave the printed result, test-first failures included, and the branch's tree is identical to the scratch branch's (`b36b1a1f`). The worktree `~/Dev/Duty-partner-push` is on `feature/partner-push` at `884ac136`; `~/Dev/Duty` stayed on `feature/supabase-account-backend`, with only its scheme lines changed.
- **Task 11, step 1:** `ℹ tests 222`, `ℹ pass 222`, `ℹ fail 0`.
- **Task 11, the review (2026-10-18):** a read-only reviewer read `71c1b29a..884ac136`, this plan and the spec, and ran the tests. Verdict: "Ready to merge: with fixes", nothing Critical. Taken, each test-first in its own commit:
  - **Important:** a stored signing token outlived a change of Apple key, so a fixed Key ID didn't take effect for up to 40 minutes (the probe kept answering with the old key), and a new token no push got an answer for was kept. `3066a521`: a stored token naming another key or team isn't used, and a new one is kept only once Apple has answered a push and turned it down for none.
  - **The probe tried only Apple's test service,** so a key made for Sandbox only passed it. `0d7e211d`: it sends the made-up token a push on each service and answers for each, `{"probe":{"sandbox":…,"production":…}}`. This refines spec §6.3.
  - **Small fixes,** `901f9e1f`: strict TypeScript 5.9 (`pemBytes`'s declared `Uint8Array` is a `Uint8Array<ArrayBufferLike>`, which `importKey` refuses; an unused parameter); a 20-second timeout on each call to Crewlu Cloud; the setup's two 500s are logged too (decision 7); the last catch-all logs only an error's name (decision 11).
  - **Retries never stopped.** `f8c4bedb`: report marks a pilot due again only within an hour of their status changing, since Apple drops a push after an hour. This refines spec §7.
  - **A test gap,** `0aa6449f`: the renewal, too, sends at most 10 at a time.
  - **Docs:** `f24599fa` (a token's environment follows the build's provisioning profile, not Debug or Release; what the undo's order rests on) and `79af8aae` (the tests' count, and how to check partner-push's types with the website's TypeScript).
  - **This plan:** Task 12's probe step (read by the probe's own id, both services, `timed_out`, `TooManyProviderTokenUpdates`) and the advisor's expected INFO finding.
  - **Not taken, for later:** tests that the push and call timeouts in use are 10 and 20 seconds, not only the constants; a partial index on `push_due` (the table has one row per pilot); keeping the last run's result in SQL; dropping a `DeviceTokenNotForTopic` token when the same run proved the topic.
  - 228 tests pass after the fixes, and partner-push type-checks with `--strict --noUnusedLocals --noUnusedParameters`.
- **Task 11, the re-check of `884ac136..79af8aae`:** "Ready to merge: yes". Every fix does what it says; nothing regressed; 228 of 228 pass and the type check is clean; 14 of its 17 spot-check breaks were caught, 1 changed nothing, and the 2 left are the accepted timeout literals. Taken from its minor points: `0f6313a7` (a pilot at 59 minutes is still tried again, so the hour is pinned from both sides), `57322833` (why retries stop after an hour, and the contract says they do), and two clearer rows in Task 12 step 6 (`timed_out` and `error_msg`; a 403 for one service only). Left as is: after a renewal, "Apple answered" can count a first-round answer to the old token, which the 40-minute limit rules out; and a claim that commits after the 20-second timeout loses that run's pushes, as spec §7's "partner-push stops after claiming" already allows.
- **Task 12, the setup (2026-10-18, by the user):**
  - **The Apple key:** `AuthKey_GBMNP339CQ.p8`, Sandbox & Production, **Team Scoped (All Topics)**. Apple offers Topic Specific only for a key with one environment, so decision 14 is built as a team-scoped key; Crewluve-only keys would take two, one per environment, and partner-push holding both. The older `AuthKey_P2NGCHJ9SF.p8` (November 2025) is untouched.
  - **partner-push:** first deployed under Supabase's made-up name, `smart-responder`; the name has to go in the editor's **Function Name** box before deploying, since renaming keeps the address. It was deleted and deployed again as `partner-push`; only `partner-push` is deployed, with `verify_jwt` false.
  - **The secrets:** `APNS_KEY_ID`, `APNS_TEAM_ID` and `APNS_TOPIC` checked against the dashboard's SHA-256 digests. `APNS_PRIVATE_KEY` first held the file's name (its digest matched the name's), and the first probe (request 1) answered `500 {"error":"APNS_PRIVATE_KEY isn't the text of a .p8 key"}`, as decision 7 meant; it was replaced with the file's text.
  - **The SQL script** ran at about 21:49 UTC. The editor showed its last `select`'s result, `schedule` `2`, not "No rows returned"; Step 5 now says so.
  - **The probe** (request 2, 21:55:40 UTC): `200 {"probe":{"sandbox":{"status":400,"reason":"BadDeviceToken"},"production":{"status":400,"reason":"BadDeviceToken"}}}`. Both services accept the key and the Team ID, over HTTP/2 from Supabase's `fetch`, so `node:http2` isn't needed. The new signing token was kept at 21:55:40.
  - **The check:** `partner-push` succeeded every 15 seconds (five runs, 21:55:17 to 21:56:17 UTC). `partner-push-history` first runs at 04:17 UTC.
  - **The security advisor:** `rls_enabled_no_policy` INFO × 5 (piece 1's three private tables, `partner_push_state`, and `repair.crew_member_strays_20261017` from the 2026-10-17 crew fix); 0028 × 6 and 0029 × 15 unchanged (piece 1's RPCs and `delete_my_account`); leaked-password protection, 1. Nothing about piece 3's functions.
  - **The clipboard:** the first copies weren't UTF-8 (with the sandbox off, the shell had no `LANG`), so the comments' `§` arrived as `¬ß`, harmless in comments; later copies used `LANG=en_US.UTF-8` and matched the files byte for byte.
  - **After the setup,** `ed8a6045` corrected the probe's comment in the migration. It's a comment outside any function, which Crewlu Cloud doesn't keep, so what was applied is unchanged.

