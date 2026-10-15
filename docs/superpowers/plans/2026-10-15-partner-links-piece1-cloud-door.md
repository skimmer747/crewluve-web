# Partner Links Piece 1: the Cloud Door — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the partner-links tables and RPCs to CrewLu Cloud, so that CrewLu (piece 2), Crewluve (piece 4) and the website (piece 5) can share a pilot's summary by link, without partner accounts.

**Architecture:**
- **Three SQL migrations** in the Duty repo's `supabase/migrations`:
  1. tables and private helpers;
  2. the pilot's RPCs (signed in);
  3. the partner device RPCs (publishable key only).
- **Partners never touch a table.** Every partner action is a `security definer` RPC that takes a device key, invite, code or ticket.
- **Tests** run the migrations in PGlite (Postgres compiled to WebAssembly) under Node's built-in test runner. A small shim stands in for the Supabase parts the migrations rely on.

**Tech stack:** Postgres 17 on Supabase (project `corxvurxpnrzekbxdgye`), PL/pgSQL, PGlite 0.5.8, Node's `node:test`.

**Design:** `docs/superpowers/specs/2026-10-15-partner-links-design.md` in this repo: §4, §5, and piece 1 in §9.

---

## Before you start

- **Two repos.**
  - The code goes in `~/Dev/Duty` (CrewLu).
  - This plan and the umbrella design live in `~/Dev/Crewluve Website`.
  - Paths in the tasks are relative to `~/Dev/Duty` unless they start with `~`.
- **Branch.** Build on a new branch, `feature/partner-cloud-door`, cut from `feature/supabase-account-backend` (CrewLu's release branch). Don't use `main`: it's 423 commits behind.
- **Leave the Xcode scheme files alone.**
  - `~/Dev/Duty` has uncommitted changes to `Duty.xcodeproj/xcshareddata/xcschemes/*` that aren't part of this work.
  - Never run `git add -A` or `git add .` in that repo. Add the exact paths each task lists.
- **CrewLu Cloud stays untouched until Task 13, which starts only after the user says yes.** The Supabase MCP in this setup runs with `--read-only`: it can check the database, but the user applies the SQL in the Supabase SQL editor.
- **Node:** any version from 20 up. Once `npm install` has run, the tests need no network.
- **Running the tests.** Every test command runs from `~/Dev/Duty/supabase/tests` as `npm test`, and it finishes in under 10 seconds.
  - If it ever hangs, something has loaded PGlite's pgcrypto extension.
  - The shim exists so that nothing does (see `tests/README.md`).

## Decisions made while planning

These refine the design. Task 11 writes them into it.

1. **Secrets live in a `private` schema**, which the API doesn't expose:
   - device key hashes and push tokens (`private.partner_device_secrets`);
   - hand-off codes and move tickets (`private.partner_handoffs`);
   - failed code attempts (`private.partner_redeem_failures`).

   `public.partner_devices` keeps only what the pilot's list shows.
2. **Pilots write only through RPCs.**
   - Pilots read `partners`, `partner_devices` and their own `partner_status` through RLS.
   - Every change goes through an RPC: `partner_create`, `partner_rename`, `partner_new_link`, `partner_remove`, `partner_remove_device`, `partner_remove_all` or `partner_move_ticket`.
   - Pilot RPCs raise an error on misuse.
   - Partner RPCs answer `{"error": …}` instead, so a failed code attempt can be recorded.
3. **`set_partner_status` is `security definer`.** It writes only the row of `auth.uid()`, and answers `{"applied": false}` to an older build.
4. **Limits:**
   - 25 partners per pilot;
   - 10 devices per person;
   - 1 MB per summary;
   - one open code and one open move ticket per person.
5. **The guessing throttle pauses only code redemptions.** Move tickets are 256-bit and skip it, so 30 junk codes can't delay a move-over.
6. **`partner_remove_all` also deletes the summary,** so nothing lingers after Stop Sharing with Everyone.
7. **The per-partner summary fields are JSON objects** keyed by the lower-case `partners.id`:
   - `displayNameByPartner`;
   - `quickStatusByPartner`;
   - `quickStatusTargets`, as an array of those ids.

   Piece 2 must encode them this way.
8. **Tests run in PGlite with a shim, not in a Supabase stack,** because this Mac has no Docker or Supabase CLI. PGlite's own pgcrypto build hangs about half the times it loads (versions 0.4.6 to 0.5.8), so the shim provides `extensions.digest` and `extensions.gen_random_bytes`, built on core Postgres.

## Files

In `~/Dev/Duty`:

| File | Responsibility |
|---|---|
| `supabase/migrations/20261015120000_partner_links_tables.sql` | Part 1: the `private` schema, the six tables, RLS, grants, and the private helpers (secrets, hashing, codes, trimming) |
| `supabase/migrations/20261015120100_partner_links_pilot_rpcs.sql` | Part 2: the pilot's RPCs |
| `supabase/migrations/20261015120200_partner_links_partner_rpcs.sql` | Part 3: the partner device RPCs |
| `supabase/partner-api.md` | The as-built API for pieces 2–5, the HTTP checks, and the undo SQL |
| `supabase/tests/package.json`, `package-lock.json`, `.gitignore` | The test project, which has one dependency: PGlite |
| `supabase/tests/README.md` | How the tests work, and what they don't cover |
| `supabase/tests/helpers/supabase_shim.sql` | The Supabase parts the migrations rely on |
| `supabase/tests/helpers/db.js` | A fresh database per test file. Runs SQL as a pilot, as anon, or as the owner. |
| `supabase/tests/helpers/seed.js` | Rows written directly, for tests that bypass the RPCs |
| `supabase/tests/helpers/rpc.js` | One wrapper per RPC, plus `connected()` |
| `supabase/tests/*.test.js` | One file per area: smoke, tables, helpers, status, pilot_rpcs, move_ticket, join_view, handoff, push, privileges |

In `~/Dev/Crewluve Website`: this plan (its checkboxes get ticked) and `docs/superpowers/specs/2026-10-15-partner-links-design.md` (edited in Task 11).

---

### Task 0: Branch

- [x] **Step 1: Check the working tree**

Run: `git -C ~/Dev/Duty status --short`

Expected: only the Xcode scheme lines (` M Duty.xcodeproj/xcshareddata/xcschemes/Duty.xcscheme` and four `??` scheme files). If anything else shows, stop and ask the user.

- [x] **Step 2: Create the branch**

Run: `git -C ~/Dev/Duty switch -c feature/partner-cloud-door feature/supabase-account-backend`

Expected: `Switched to a new branch 'feature/partner-cloud-door'`. The scheme changes carry over untouched.

### Task 1: The test harness

**Files:**
- Create: `supabase/tests/package.json`, `supabase/tests/.gitignore`, `supabase/tests/helpers/supabase_shim.sql`, `supabase/tests/helpers/db.js`
- Test: `supabase/tests/smoke.test.js`

This task builds the harness that every later task stands on, so its test passes as soon as the harness exists.

- [x] **Step 1: Write `supabase/tests/package.json`**

```json
{
  "name": "crewlu-cloud-sql-tests",
  "private": true,
  "type": "module",
  "description": "Tests for CrewLu Cloud SQL migrations, run in PGlite (Postgres in WebAssembly). See README.md.",
  "scripts": {
    "test": "node --test"
  },
  "devDependencies": {
    "@electric-sql/pglite": "0.5.8"
  }
}
```

- [x] **Step 2: Write `supabase/tests/.gitignore`**

```
node_modules/
```

- [x] **Step 3: Write `supabase/tests/helpers/supabase_shim.sql`**

```sql
-- The slice of Supabase's own setup that the partner-links migrations rely on, so the tests can run them
-- in PGlite (Postgres in WebAssembly) instead of a Supabase stack. Mirrors project corxvurxpnrzekbxdgye as
-- checked on 2026-10-15: the API roles, auth.users and auth.uid(), pgcrypto's functions in the "extensions"
-- schema, and the default privileges Supabase gives anon and authenticated on new tables and functions in "public".

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

-- On Supabase, pgcrypto lives in "extensions". PGlite's pgcrypto build hangs about half the times it loads
-- (PGlite 0.4.6 to 0.5.8, checked 2026-10-15), so the shim provides the two pgcrypto functions the
-- migrations call, with the same signatures, built on core Postgres.
create schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;

create function extensions.digest(data text, type text) returns bytea
language plpgsql immutable strict as $$
begin
  if lower(type) <> 'sha256' then
    raise exception 'test shim: digest supports sha256 only, not %', type;
  end if;
  return sha256(convert_to(data, 'UTF8'));
end
$$;

-- Random bytes from gen_random_uuid(), which draws on the same strong random source as pgcrypto. Each UUID
-- gives 16 bytes, 6 bits of which are fixed (version and variant): fine for tests.
create function extensions.gen_random_bytes(n integer) returns bytea
language sql volatile strict as $$
  select substring(string_agg(uuid_send(gen_random_uuid()), ''::bytea) from 1 for n)
    from generate_series(1, (n + 15) / 16)
$$;

create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  created_at timestamptz not null default now()
);

-- Supabase's definition: the "sub" claim of the request's JWT, which PostgREST puts in request.jwt.claims.
create function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
```

- [x] **Step 4: Write `supabase/tests/helpers/db.js`**

```js
// A test database: PGlite (Postgres in WebAssembly) with the Supabase shim and the partner-links migrations.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(here, '..', '..', 'migrations')

/** The partner-links migration files, oldest first. */
export function partnerMigrations() {
  return readdirSync(migrationsDir)
    .filter((file) => file.includes('_partner_links_') && file.endsWith('.sql'))
    .sort()
}

/** A new, empty database with the Supabase shim and every partner-links migration applied. */
export async function freshDb() {
  const db = new PGlite()
  await db.exec(readFileSync(join(here, 'supabase_shim.sql'), 'utf8'))
  for (const file of partnerMigrations()) {
    await db.exec(readFileSync(join(migrationsDir, file), 'utf8'))
  }
  return db
}

/** Adds a CrewLu Cloud account and returns its id. */
export async function addUser(db) {
  const { rows } = await db.query('insert into auth.users (id) values (gen_random_uuid()) returning id')
  return rows[0].id
}

async function asRole(db, role, claims, sql, params) {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)])
    await tx.query(`set local role ${role}`)
    const { rows } = await tx.query(sql, params)
    return rows
  })
}

/** Runs SQL the way PostgREST does for a signed-in CrewLu Cloud user (the pilot's CrewLu). */
export const asUser = (db, uid, sql, params = []) =>
  asRole(db, 'authenticated', { sub: uid, role: 'authenticated' }, sql, params)

/** Runs SQL the way PostgREST does for a caller holding only the publishable key (Crewluve, the website). */
export const asAnon = (db, sql, params = []) => asRole(db, 'anon', { role: 'anon' }, sql, params)

/** Runs SQL as the database owner, to set up and inspect tests. */
export async function asAdmin(db, sql, params = []) {
  const { rows } = await db.query(sql, params)
  return rows
}
```

- [x] **Step 5: Write `supabase/tests/smoke.test.js`**

```js
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { addUser, asAdmin, asAnon, asUser, freshDb } from './helpers/db.js'

describe('the Supabase shim', () => {
  let db
  before(async () => {
    db = await freshDb()
  })
  after(async () => {
    await db.close()
  })

  test('a signed-in user gets their id from auth.uid(); anon gets none', async () => {
    const uid = await addUser(db)
    assert.deepEqual(await asUser(db, uid, 'select auth.uid() as u'), [{ u: uid }])
    assert.deepEqual(await asAnon(db, 'select auth.uid() as u'), [{ u: null }])
  })

  test('callers run as their own role, and the role ends with the call', async () => {
    assert.deepEqual(await asAnon(db, 'select current_user as u'), [{ u: 'anon' }])
    assert.deepEqual(await asAdmin(db, 'select current_user as u'), [{ u: 'postgres' }])
  })

  test("the shim's digest and gen_random_bytes behave like pgcrypto's", async () => {
    const [{ h }] = await asAdmin(db, "select encode(extensions.digest('abc', 'sha256'), 'hex') as h")
    assert.equal(h, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    const [r] = await asAdmin(
      db,
      'select length(extensions.gen_random_bytes(32)) as n, extensions.gen_random_bytes(16) <> extensions.gen_random_bytes(16) as differ',
    )
    assert.deepEqual(r, { n: 32, differ: true })
  })
})
```

- [x] **Step 6: Install and run**

Run: `cd ~/Dev/Duty/supabase/tests && npm install && npm test`

Expected: `npm install` adds one package and writes `package-lock.json`. `npm test` ends with `ℹ tests 3`, `ℹ pass 3`, `ℹ fail 0`.

- [x] **Step 7: Commit**

```bash
cd ~/Dev/Duty
git add supabase/tests/package.json supabase/tests/package-lock.json supabase/tests/.gitignore supabase/tests/helpers/supabase_shim.sql supabase/tests/helpers/db.js supabase/tests/smoke.test.js
git commit -m "test(partner-links): PGlite harness for CrewLu Cloud SQL, with a Supabase shim

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: Tables, RLS and grants

**Files:**
- Create: `supabase/migrations/20261015120000_partner_links_tables.sql`
- Create: `supabase/tests/helpers/seed.js`
- Test: `supabase/tests/tables.test.js`

- [x] **Step 1: Write `supabase/tests/helpers/seed.js`**

```js
// Rows written straight into the tables as the owner, for tests that run before (or around) the RPCs.
import { asAdmin } from './db.js'

/** A partner of `owner`, inserted directly. Returns its id. */
export async function seedPartner(db, owner, name = 'Sarah') {
  const [row] = await asAdmin(
    db,
    "insert into public.partners (owner_id, name, invite_token) values ($1, $2, encode(extensions.gen_random_bytes(16), 'hex')) returning id",
    [owner, name],
  )
  return row.id
}

/** A device of that partner, with a random key hash, inserted directly. Returns its id. */
export async function seedDevice(db, owner, partnerId, kind = 'app') {
  const [row] = await asAdmin(
    db,
    "insert into public.partner_devices (partner_id, owner_id, kind, label) values ($1, $2, $3, 'Test device') returning id",
    [partnerId, owner, kind],
  )
  await asAdmin(
    db,
    "insert into private.partner_device_secrets (device_id, key_hash) values ($1, extensions.digest(gen_random_uuid()::text, 'sha256'))",
    [row.id],
  )
  return row.id
}
```

- [x] **Step 2: Write the failing test, `supabase/tests/tables.test.js`**

```js
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { addUser, asAdmin, asAnon, asUser, freshDb } from './helpers/db.js'
import { seedDevice, seedPartner } from './helpers/seed.js'

describe('partner tables', () => {
  let db
  before(async () => {
    db = await freshDb()
  })
  after(async () => {
    await db.close()
  })

  test('a pilot reads only their own partners, devices and summary', async () => {
    const pilot = await addUser(db)
    const other = await addUser(db)
    const mine = await seedPartner(db, pilot)
    const theirs = await seedPartner(db, other, 'Not mine')
    await seedDevice(db, pilot, mine)
    await seedDevice(db, other, theirs)
    await asAdmin(db, "insert into public.partner_status (user_id, status, writer_build) values ($1, '{}', 1), ($2, '{}', 1)", [pilot, other])

    assert.deepEqual(await asUser(db, pilot, 'select id, name from public.partners'), [{ id: mine, name: 'Sarah' }])
    assert.deepEqual(await asUser(db, pilot, 'select partner_id from public.partner_devices'), [{ partner_id: mine }])
    assert.deepEqual(await asUser(db, pilot, 'select user_id from public.partner_status'), [{ user_id: pilot }])
  })

  test('anon can read none of the partner tables', async () => {
    for (const table of ['public.partner_status', 'public.partners', 'public.partner_devices']) {
      await assert.rejects(asAnon(db, `select * from ${table}`), /permission denied/, table)
    }
  })

  test('nobody writes the partner tables directly; writes go through the RPCs', async () => {
    const pilot = await addUser(db)
    const id = await seedPartner(db, pilot)
    await assert.rejects(
      asUser(db, pilot, "insert into public.partners (owner_id, name, invite_token) values ($1, 'X', 'abc')", [pilot]),
      /permission denied/,
    )
    await assert.rejects(asUser(db, pilot, "update public.partners set name = 'Y' where id = $1", [id]), /permission denied/)
    await assert.rejects(asUser(db, pilot, 'delete from public.partners where id = $1', [id]), /permission denied/)
    await assert.rejects(
      asUser(db, pilot, "insert into public.partner_status (user_id, status, writer_build) values ($1, '{}', 1)", [pilot]),
      /permission denied/,
    )
    await assert.rejects(asUser(db, pilot, 'delete from public.partner_devices'), /permission denied/)
  })

  test('the private schema is out of reach for anon and signed-in users', async () => {
    const pilot = await addUser(db)
    await assert.rejects(asAnon(db, 'select * from private.partner_device_secrets'), /permission denied/)
    await assert.rejects(asUser(db, pilot, 'select * from private.partner_handoffs'), /permission denied/)
    await assert.rejects(asUser(db, pilot, 'select * from private.partner_redeem_failures'), /permission denied/)
  })

  test("deleting a pilot's account deletes their partners, devices, secrets and summary", async () => {
    const pilot = await addUser(db)
    const partner = await seedPartner(db, pilot)
    const device = await seedDevice(db, pilot, partner)
    await asAdmin(db, "insert into public.partner_status (user_id, status, writer_build) values ($1, '{}', 1)", [pilot])

    await asAdmin(db, 'delete from auth.users where id = $1', [pilot])

    const [counts] = await asAdmin(
      db,
      `select (select count(*) from public.partners where owner_id = $1)::int as partners,
              (select count(*) from public.partner_devices where owner_id = $1)::int as devices,
              (select count(*) from private.partner_device_secrets where device_id = $2)::int as secrets,
              (select count(*) from public.partner_status where user_id = $1)::int as status`,
      [pilot, device],
    )
    assert.deepEqual(counts, { partners: 0, devices: 0, secrets: 0, status: 0 })
  })
})
```

- [x] **Step 3: Run it and watch it fail**

Run: `npm test`

Expected: FAIL. The 5 new tests fail with `relation "public.partners" does not exist`, and the 3 smoke tests still pass.

- [x] **Step 4: Write `supabase/migrations/20261015120000_partner_links_tables.sql`**

```sql
-- Partner links, part 1 of 3: tables and helpers. Piece 1 of the partner-links design
-- (crewluve-web docs/superpowers/specs/2026-10-15-partner-links-design.md).
--
-- A pilot shares their partner summary (CrewLu's SharedPilotStatus) by link. Partners have no accounts:
-- each partner device holds a random key, and everything a partner does is a security definer RPC (part 3).
-- Pilots read their own partners and devices through RLS, and every pilot write is an RPC (part 2).
-- Secrets live in the "private" schema, which the API doesn't expose and no client role can use.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- One summary per pilot (design §4.1). push_due and last_push_at belong to the push service (piece 3).
create table public.partner_status (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status jsonb not null,
  writer_build integer not null check (writer_build >= 0),
  updated_at timestamptz not null default now(),
  push_due boolean not null default false,
  last_push_at timestamptz
);

-- One row per person the pilot shares with (design §5.1). invite_token is the permanent link's secret.
-- The pilot can read it, so any of their devices can send the same link again.
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  invite_token text not null unique,
  created_at timestamptz not null default now()
);
create index partners_owner_id_idx on public.partners (owner_id);

-- One row per connected partner device. owner_id repeats the partner's pilot so RLS needs no join.
create table public.partner_devices (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('app', 'web')),
  label text not null check (char_length(label) between 1 and 60),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index partner_devices_partner_id_idx on public.partner_devices (partner_id);
create index partner_devices_owner_id_idx on public.partner_devices (owner_id);

-- Each device's key, stored only as its SHA-256, and its push token. No client can read this table.
create table private.partner_device_secrets (
  device_id uuid primary key references public.partner_devices (id) on delete cascade,
  key_hash bytea not null unique,
  push_token text,
  push_env text check (push_env in ('sandbox', 'production'))
);
create index partner_device_secrets_push_token_idx on private.partner_device_secrets (push_token)
  where push_token is not null;

-- One-time tokens that create a device: 6-character codes (10 minutes) and move tickets (90 days).
create table private.partner_handoffs (
  token_hash bytea primary key,
  partner_id uuid not null references public.partners (id) on delete cascade,
  kind text not null check (kind in ('code', 'move')),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index partner_handoffs_partner_id_idx on private.partner_handoffs (partner_id);

-- Failed code redemptions, for the guessing throttle (design §5.3). Rows older than an hour are deleted.
create table private.partner_redeem_failures (
  at timestamptz not null default now()
);
create index partner_redeem_failures_at_idx on private.partner_redeem_failures (at);

alter table public.partner_status enable row level security;
alter table public.partners enable row level security;
alter table public.partner_devices enable row level security;
alter table private.partner_device_secrets enable row level security;
alter table private.partner_handoffs enable row level security;
alter table private.partner_redeem_failures enable row level security;

create policy partner_status_owner_read on public.partner_status
  for select to authenticated using ((select auth.uid()) = user_id);
create policy partners_owner_read on public.partners
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy partner_devices_owner_read on public.partner_devices
  for select to authenticated using ((select auth.uid()) = owner_id);

-- Supabase grants anon and authenticated everything on new public tables. Take it back, then let signed-in
-- pilots read (RLS limits them to their own rows). Nobody writes these tables except through the RPCs.
revoke all on public.partner_status, public.partners, public.partner_devices from anon, authenticated;
grant select on public.partner_status, public.partners, public.partner_devices to authenticated;
revoke all on private.partner_device_secrets, private.partner_handoffs, private.partner_redeem_failures
  from public, anon, authenticated;
```

- [x] **Step 5: Run it and watch it pass**

Run: `npm test`

Expected: `ℹ pass 8`, `ℹ fail 0`.

- [x] **Step 6: Commit**

```bash
cd ~/Dev/Duty
git add supabase/migrations/20261015120000_partner_links_tables.sql supabase/tests/helpers/seed.js supabase/tests/tables.test.js
git commit -m "feat(partner-links): partner tables, RLS and grants; secrets in a private schema

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: Private helpers

**Files:**
- Modify: `supabase/migrations/20261015120000_partner_links_tables.sql` (append at the end)
- Test: `supabase/tests/helpers.test.js`

- [x] **Step 1: Write the failing test, `supabase/tests/helpers.test.js`**

```js
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { asAdmin, freshDb } from './helpers/db.js'

describe('private helpers', () => {
  let db
  before(async () => {
    db = await freshDb()
  })
  after(async () => {
    await db.close()
  })

  const one = async (sql, params) => (await asAdmin(db, sql, params))[0].r

  test('new_secret gives lower-case hex of the requested size, different every time', async () => {
    const a = await one('select private.new_secret(16) as r')
    const b = await one('select private.new_secret(16) as r')
    assert.match(a, /^[0-9a-f]{32}$/)
    assert.notEqual(a, b)
    assert.match(await one('select private.new_secret(32) as r'), /^[0-9a-f]{64}$/)
  })

  test('hash_secret is SHA-256', async () => {
    assert.equal(
      await one("select encode(private.hash_secret('abc'), 'hex') as r"),
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  test('new_code uses all 31 unambiguous characters and nothing else', async () => {
    const rows = await asAdmin(db, 'select private.new_code() as c from generate_series(1, 2000)')
    const seen = new Set()
    for (const { c } of rows) {
      assert.match(c, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/)
      for (const ch of c) seen.add(ch)
    }
    assert.equal(seen.size, 31)
  })

  const A = '0b6f0a52-6a3e-4d5e-9d36-0f6f2a1c9e01'
  const B = '7c1d2e3f-4a5b-4c6d-8e9f-a0b1c2d3e4f5'
  const summary = {
    pilotFirstName: 'Todd',
    displayNameByPartner: { [A]: 'Dad', [B]: 'Todd' },
    quickStatusByPartner: { [A]: { status: 'Call Me', icon: 'phone.fill' }, [B]: { status: 'Sleeping', icon: 'moon.fill' } },
    quickStatus: 'Free to Talk',
    quickStatusIcon: 'phone',
    quickStatusExpiry: 1760000000,
    quickStatusTargets: [A, B],
    tripLegs: [{ id: 'leg1' }],
  }
  const trim = (status, partner) =>
    one('select private.trim_status_for($1::jsonb, $2::uuid) as r', [JSON.stringify(status), partner])

  test('a partner sees only their own nickname and per-partner quick status', async () => {
    const s = await trim(summary, A)
    assert.deepEqual(s.displayNameByPartner, { [A]: 'Dad' })
    assert.deepEqual(s.quickStatusByPartner, { [A]: { status: 'Call Me', icon: 'phone.fill' } })
    assert.deepEqual(s.tripLegs, [{ id: 'leg1' }])
    assert.equal(s.pilotFirstName, 'Todd')
  })

  test('a targeted quick status shows only to its targets, who see only themselves as targets', async () => {
    assert.deepEqual((await trim(summary, A)).quickStatusTargets, [A])
    const outsider = await trim(summary, '11111111-2222-4333-8444-555555555555')
    for (const key of ['quickStatus', 'quickStatusIcon', 'quickStatusExpiry', 'quickStatusTargets']) {
      assert.equal(key in outsider, false, key)
    }
    assert.deepEqual(outsider.displayNameByPartner, {})
    assert.deepEqual(outsider.quickStatusByPartner, {})
  })

  test('a quick status for everyone (no targets) is kept', async () => {
    const s = await trim({ ...summary, quickStatusTargets: null }, B)
    assert.equal(s.quickStatus, 'Free to Talk')
    assert.equal(s.quickStatusTargets, null)
  })

  test('partner ids match whatever their case', async () => {
    const upper = { displayNameByPartner: { [A.toUpperCase()]: 'Dad' }, quickStatusTargets: [A.toUpperCase()], quickStatus: 'Call Me' }
    const s = await trim(upper, A)
    assert.deepEqual(s.displayNameByPartner, { [A]: 'Dad' })
    assert.deepEqual(s.quickStatusTargets, [A])
    assert.equal(s.quickStatus, 'Call Me')
  })

  test('a summary without per-partner fields passes through unchanged', async () => {
    const plain = { pilotFirstName: 'Todd', tripLegs: [] }
    assert.deepEqual(await trim(plain, A), plain)
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npm test`

Expected: FAIL. The 8 new tests fail with `function private.new_secret(integer) does not exist` (or the matching message for `hash_secret`, `new_code` or `trim_status_for`). The other 8 tests pass.

- [x] **Step 3: Append the helpers to the end of `20261015120000_partner_links_tables.sql`**

Put one blank line after the existing last line (`  from public, anon, authenticated;`), then add:

```sql
-- Helpers for the RPCs in parts 2 and 3. They live in "private", so no client can call them.

-- A random secret: p_bytes random bytes as lower-case hex (16 bytes for invites, 32 for keys and tickets).
create function private.new_secret(p_bytes integer) returns text
language sql volatile set search_path = '' as $$
  select encode(extensions.gen_random_bytes(p_bytes), 'hex')
$$;

-- How secrets are stored: their SHA-256.
create function private.hash_secret(p_secret text) returns bytea
language sql immutable set search_path = '' as $$
  select extensions.digest(p_secret, 'sha256')
$$;

-- A 6-character hand-off code from the 31 characters that can't be misread (no 0, O, 1, I or L).
create function private.new_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  bytes bytea;
  b integer;
  code text := '';
begin
  while char_length(code) < 6 loop
    bytes := extensions.gen_random_bytes(16);
    for i in 0 .. 15 loop
      b := get_byte(bytes, i);
      -- 248 = 8 × 31: skipping 248–255 makes every character equally likely.
      if b < 248 and char_length(code) < 6 then
        code := code || substr(alphabet, b % 31 + 1, 1);
      end if;
    end loop;
  end loop;
  return code;
end
$$;

-- What one partner may see of the summary (design §4.2): only their own nickname and per-partner quick
-- status, and a targeted quick status only if they're one of its targets, without learning the others.
-- Partner ids match whatever their case; the result uses lower case.
create function private.trim_status_for(p_status jsonb, p_partner uuid) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  pid constant text := lower(p_partner::text);
  s jsonb := p_status;
  targets jsonb;
begin
  if s is null then
    return null;
  end if;
  if jsonb_typeof(s -> 'displayNameByPartner') = 'object' then
    s := jsonb_set(s, '{displayNameByPartner}', coalesce(
      (select jsonb_object_agg(lower(e.key), e.value)
         from jsonb_each(s -> 'displayNameByPartner') as e
        where lower(e.key) = pid),
      '{}'::jsonb));
  end if;
  if jsonb_typeof(s -> 'quickStatusByPartner') = 'object' then
    s := jsonb_set(s, '{quickStatusByPartner}', coalesce(
      (select jsonb_object_agg(lower(e.key), e.value)
         from jsonb_each(s -> 'quickStatusByPartner') as e
        where lower(e.key) = pid),
      '{}'::jsonb));
  end if;
  targets := s -> 'quickStatusTargets';
  if jsonb_typeof(targets) = 'array' then
    if exists (select 1 from jsonb_array_elements_text(targets) as t where lower(t.value) = pid) then
      s := jsonb_set(s, '{quickStatusTargets}', jsonb_build_array(pid));
    else
      s := s - 'quickStatus' - 'quickStatusIcon' - 'quickStatusExpiry' - 'quickStatusTargets';
    end if;
  end if;
  return s;
end
$$;

revoke all on all functions in schema private from public, anon, authenticated;
```

- [x] **Step 4: Run it and watch it pass**

Run: `npm test`

Expected: `ℹ pass 16`, `ℹ fail 0`.

- [x] **Step 5: Commit**

```bash
cd ~/Dev/Duty
git add supabase/migrations/20261015120000_partner_links_tables.sql supabase/tests/helpers.test.js
git commit -m "feat(partner-links): helpers for secrets, hashing, hand-off codes and per-partner trimming

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: `set_partner_status`

**Files:**
- Create: `supabase/migrations/20261015120100_partner_links_pilot_rpcs.sql`
- Create: `supabase/tests/helpers/rpc.js`
- Test: `supabase/tests/status.test.js`

- [x] **Step 1: Write `supabase/tests/helpers/rpc.js`**

It holds every RPC wrapper the later tasks use. Wrappers for functions that don't exist yet are harmless, because each is only a SQL string until a test calls it.

```js
// One wrapper per RPC, typed the way PostgREST calls it. Each resolves to the function's jsonb result.
import { addUser, asAnon, asUser } from './db.js'

const result = (rows) => rows[0].r

// The pilot's side (CrewLu, signed in to CrewLu Cloud).
export const setStatus = (db, uid, status, build) =>
  asUser(db, uid, 'select public.set_partner_status($1::jsonb, $2::integer) as r', [JSON.stringify(status), build]).then(result)
export const createPartner = (db, uid, name) =>
  asUser(db, uid, 'select public.partner_create($1::text) as r', [name]).then(result)
export const renamePartner = (db, uid, partnerId, name) =>
  asUser(db, uid, 'select public.partner_rename($1::uuid, $2::text) as r', [partnerId, name]).then(result)
export const newLink = (db, uid, partnerId) =>
  asUser(db, uid, 'select public.partner_new_link($1::uuid) as r', [partnerId]).then(result)
export const removePartner = (db, uid, partnerId) =>
  asUser(db, uid, 'select public.partner_remove($1::uuid) as r', [partnerId]).then(result)
export const removeDevice = (db, uid, deviceId) =>
  asUser(db, uid, 'select public.partner_remove_device($1::uuid) as r', [deviceId]).then(result)
export const removeAll = (db, uid) => asUser(db, uid, 'select public.partner_remove_all() as r').then(result)
export const moveTicket = (db, uid, partnerId) =>
  asUser(db, uid, 'select public.partner_move_ticket($1::uuid) as r', [partnerId]).then(result)

// A partner device's side (Crewluve or the website, publishable key only).
export const join = (db, invite, kind = 'app', label = "Sarah's iPhone") =>
  asAnon(db, 'select public.partner_join($1::text, $2::text, $3::text) as r', [invite, kind, label]).then(result)
export const view = (db, key, since = null) =>
  asAnon(db, 'select public.partner_view($1::text, $2::timestamptz) as r', [key, since]).then(result)
export const leave = (db, key) => asAnon(db, 'select public.partner_leave($1::text) as r', [key]).then(result)
export const createCode = (db, key) =>
  asAnon(db, 'select public.partner_handoff_create($1::text) as r', [key]).then(result)
export const redeem = (db, token, kind = 'web', label = 'Safari on Mac') =>
  asAnon(db, 'select public.partner_handoff_redeem($1::text, $2::text, $3::text) as r', [token, kind, label]).then(result)
export const setPush = (db, key, token, env = 'production') =>
  asAnon(db, 'select public.partner_set_push($1::text, $2::text, $3::text) as r', [key, token, env]).then(result)

/** A pilot with one partner and one connected device: the starting point of most partner-side tests. */
export async function connected(db, { name = 'Sarah', kind = 'app' } = {}) {
  const pilot = await addUser(db)
  const partner = await createPartner(db, pilot, name)
  const device = await join(db, partner.invite_token, kind)
  return { pilot, partnerId: partner.id, invite: partner.invite_token, key: device.device_key, deviceId: device.device_id }
}
```

- [x] **Step 2: Write the failing test, `supabase/tests/status.test.js`**

```js
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { addUser, asAdmin, asAnon, freshDb } from './helpers/db.js'
import { setStatus } from './helpers/rpc.js'

describe('set_partner_status', () => {
  let db
  before(async () => {
    db = await freshDb()
  })
  after(async () => {
    await db.close()
  })

  const stored = async (uid) =>
    (await asAdmin(db, 'select status, writer_build, push_due from public.partner_status where user_id = $1', [uid]))[0]

  test('a signed-in pilot saves their summary', async () => {
    const pilot = await addUser(db)
    assert.deepEqual(await setStatus(db, pilot, { pilotFirstName: 'Todd' }, 198), { applied: true })
    assert.deepEqual(await stored(pilot), { status: { pilotFirstName: 'Todd' }, writer_build: 198, push_due: true })
  })

  test('a newer or equal build replaces the summary; an older build is refused', async () => {
    const pilot = await addUser(db)
    await setStatus(db, pilot, { v: 1 }, 198)
    assert.deepEqual(await setStatus(db, pilot, { v: 2 }, 198), { applied: true })
    assert.deepEqual(await setStatus(db, pilot, { v: 3 }, 199), { applied: true })
    assert.deepEqual(await setStatus(db, pilot, { v: 4 }, 197), { applied: false })
    assert.deepEqual(await stored(pilot), { status: { v: 3 }, writer_build: 199, push_due: true })
  })

  test('each saved summary moves updated_at forward and marks a push as due', async () => {
    const pilot = await addUser(db)
    await setStatus(db, pilot, { v: 1 }, 1)
    await asAdmin(db, "update public.partner_status set updated_at = now() - interval '1 hour', push_due = false where user_id = $1", [pilot])
    await setStatus(db, pilot, { v: 2 }, 1)
    const [row] = await asAdmin(
      db,
      "select push_due, updated_at > now() - interval '1 minute' as fresh from public.partner_status where user_id = $1",
      [pilot],
    )
    assert.deepEqual(row, { push_due: true, fresh: true })
  })

  test('only a JSON object of up to 1 MB from a build number of zero or more is accepted', async () => {
    const pilot = await addUser(db)
    await assert.rejects(setStatus(db, pilot, [1, 2], 1), /must be a JSON object/)
    await assert.rejects(setStatus(db, pilot, { big: 'x'.repeat(1_048_577) }, 1), /larger than 1 MB/)
    await assert.rejects(setStatus(db, pilot, { v: 1 }, -1), /zero or more/)
    assert.equal(await stored(pilot), undefined)
  })

  test('without a signed-in pilot nothing is saved', async () => {
    await assert.rejects(asAnon(db, "select public.set_partner_status('{}'::jsonb, 1)"), /permission denied/)
  })
})
```

- [x] **Step 3: Run it and watch it fail**

Run: `npm test`

Expected: FAIL. The 5 new tests fail with `function public.set_partner_status(jsonb, integer) does not exist`. The other 16 tests pass.

- [x] **Step 4: Write `supabase/migrations/20261015120100_partner_links_pilot_rpcs.sql`**

```sql
-- Partner links, part 2 of 3: what a signed-in pilot's CrewLu calls. Each RPC returns jsonb and raises on
-- misuse (not signed in, not found, bad input), which CrewLu treats as a bug to report or a call to retry.
-- Pilots read partners, devices and their own summary straight from the tables (RLS, part 1).

-- The signed-in pilot's id, or an error naming the RPC that needed it.
create function private.require_pilot(p_caller text) returns uuid
language plpgsql stable set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception '%: not authenticated', p_caller using errcode = '28000';
  end if;
  return v_uid;
end
$$;

-- A partner's name, trimmed, 1 to 60 characters.
create function private.clean_name(p_name text, p_caller text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  v_name text := btrim(coalesce(p_name, ''), E' \t\r\n');
begin
  if char_length(v_name) not between 1 and 60 then
    raise exception '%: name must be 1 to 60 characters', p_caller using errcode = '22023';
  end if;
  return v_name;
end
$$;

revoke all on all functions in schema private from public, anon, authenticated;

-- Saves the pilot's summary (design §4.1). Returns {"applied": false} when a newer CrewLu build already
-- wrote it (the server-side version of writerBuildVersion). Every applied write marks a push as due.
create function public.set_partner_status(p_status jsonb, p_build integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_pilot('set_partner_status');
  v_applied boolean;
begin
  if p_status is null or jsonb_typeof(p_status) <> 'object' then
    raise exception 'set_partner_status: status must be a JSON object' using errcode = '22023';
  end if;
  if p_build is null or p_build < 0 then
    raise exception 'set_partner_status: build must be zero or more' using errcode = '22023';
  end if;
  if octet_length(p_status::text) > 1048576 then
    raise exception 'set_partner_status: status is larger than 1 MB' using errcode = '54000';
  end if;

  insert into public.partner_status as ps (user_id, status, writer_build, updated_at, push_due)
  values (v_uid, p_status, p_build, now(), true)
  on conflict (user_id) do update
    set status = excluded.status, writer_build = excluded.writer_build, updated_at = now(), push_due = true
    where ps.writer_build <= excluded.writer_build
  returning true into v_applied;

  return jsonb_build_object('applied', coalesce(v_applied, false));
end
$$;
revoke all on function public.set_partner_status(jsonb, integer) from public, anon, authenticated;
grant execute on function public.set_partner_status(jsonb, integer) to authenticated;
```

- [x] **Step 5: Run it and watch it pass**

Run: `npm test`

Expected: `ℹ pass 21`, `ℹ fail 0`.

- [x] **Step 6: Commit**

```bash
cd ~/Dev/Duty
git add supabase/migrations/20261015120100_partner_links_pilot_rpcs.sql supabase/tests/helpers/rpc.js supabase/tests/status.test.js
git commit -m "feat(partner-links): set_partner_status, with the server-side build guard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: Managing partners

**Files:**
- Modify: `supabase/migrations/20261015120100_partner_links_pilot_rpcs.sql` (append at the end)
- Test: `supabase/tests/pilot_rpcs.test.js`

- [x] **Step 1: Write the failing test, `supabase/tests/pilot_rpcs.test.js`**

```js
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { addUser, asAdmin, asAnon, asUser, freshDb } from './helpers/db.js'
import { createPartner, newLink, removeAll, removeDevice, removePartner, renamePartner, setStatus } from './helpers/rpc.js'
import { seedDevice } from './helpers/seed.js'

describe('pilot RPCs', () => {
  let db
  before(async () => {
    db = await freshDb()
  })
  after(async () => {
    await db.close()
  })

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

  test('adding a partner returns their id and a 32-character link secret', async () => {
    const pilot = await addUser(db)
    const p = await createPartner(db, pilot, '  Sarah  ')
    assert.match(p.id, UUID)
    assert.match(p.invite_token, /^[0-9a-f]{32}$/)
    assert.deepEqual(await asUser(db, pilot, 'select name, invite_token from public.partners'), [
      { name: 'Sarah', invite_token: p.invite_token },
    ])
  })

  test('names must be 1 to 60 characters', async () => {
    const pilot = await addUser(db)
    for (const name of ['', '   ', null, 'x'.repeat(61)]) {
      await assert.rejects(createPartner(db, pilot, name), /name must be 1 to 60 characters/, String(name))
    }
    assert.equal((await createPartner(db, pilot, 'x'.repeat(60))).invite_token.length, 32)
  })

  test('a pilot can have 25 partners at most', async () => {
    const pilot = await addUser(db)
    for (let i = 1; i <= 25; i++) await createPartner(db, pilot, `Partner ${i}`)
    await assert.rejects(createPartner(db, pilot, 'One too many'), /limit of 25 partners/)
  })

  test('rename changes the name', async () => {
    const pilot = await addUser(db)
    const { id } = await createPartner(db, pilot, 'Sarah')
    assert.deepEqual(await renamePartner(db, pilot, id, 'Mom'), { ok: true })
    assert.deepEqual(await asUser(db, pilot, 'select name from public.partners'), [{ name: 'Mom' }])
  })

  test('New Link replaces the secret', async () => {
    const pilot = await addUser(db)
    const { id, invite_token } = await createPartner(db, pilot, 'Sarah')
    const fresh = await newLink(db, pilot, id)
    assert.match(fresh.invite_token, /^[0-9a-f]{32}$/)
    assert.notEqual(fresh.invite_token, invite_token)
    assert.deepEqual(await asUser(db, pilot, 'select invite_token from public.partners'), [{ invite_token: fresh.invite_token }])
  })

  test('removing a partner removes their devices too', async () => {
    const pilot = await addUser(db)
    const { id } = await createPartner(db, pilot, 'Sarah')
    await seedDevice(db, pilot, id)
    assert.deepEqual(await removePartner(db, pilot, id), { ok: true })
    assert.deepEqual(await asUser(db, pilot, 'select id from public.partners'), [])
    assert.deepEqual(await asUser(db, pilot, 'select id from public.partner_devices'), [])
    await assert.rejects(removePartner(db, pilot, id), /partner not found/)
  })

  test('removing one device leaves the partner and their other devices', async () => {
    const pilot = await addUser(db)
    const { id } = await createPartner(db, pilot, 'Sarah')
    const phone = await seedDevice(db, pilot, id)
    const laptop = await seedDevice(db, pilot, id, 'web')
    assert.deepEqual(await removeDevice(db, pilot, phone), { ok: true })
    assert.deepEqual(await asUser(db, pilot, 'select id from public.partner_devices'), [{ id: laptop }])
    await assert.rejects(removeDevice(db, pilot, phone), /device not found/)
  })

  test('Stop Sharing with Everyone removes every partner and the summary', async () => {
    const pilot = await addUser(db)
    const sarah = await createPartner(db, pilot, 'Sarah')
    await createPartner(db, pilot, 'Mom')
    await seedDevice(db, pilot, sarah.id)
    await setStatus(db, pilot, { pilotFirstName: 'Todd' }, 1)
    assert.deepEqual(await removeAll(db, pilot), { ok: true })
    const [counts] = await asAdmin(
      db,
      `select (select count(*) from public.partners where owner_id = $1)::int as partners,
              (select count(*) from public.partner_devices where owner_id = $1)::int as devices,
              (select count(*) from public.partner_status where user_id = $1)::int as status`,
      [pilot],
    )
    assert.deepEqual(counts, { partners: 0, devices: 0, status: 0 })
    assert.deepEqual(await removeAll(db, pilot), { ok: true })
  })

  test("a pilot can't change another pilot's partners or devices", async () => {
    const pilot = await addUser(db)
    const intruder = await addUser(db)
    const { id } = await createPartner(db, pilot, 'Sarah')
    const device = await seedDevice(db, pilot, id)
    await assert.rejects(renamePartner(db, intruder, id, 'Hacked'), /partner not found/)
    await assert.rejects(newLink(db, intruder, id), /partner not found/)
    await assert.rejects(removePartner(db, intruder, id), /partner not found/)
    await assert.rejects(removeDevice(db, intruder, device), /device not found/)
    await removeAll(db, intruder)
    assert.deepEqual(await asUser(db, pilot, 'select name from public.partners'), [{ name: 'Sarah' }])
  })

  test('without a signed-in pilot every pilot RPC is refused', async () => {
    const id = '00000000-0000-4000-8000-000000000000'
    for (const sql of [
      "select public.partner_create('Sarah')",
      `select public.partner_rename('${id}', 'Mom')`,
      `select public.partner_new_link('${id}')`,
      `select public.partner_remove('${id}')`,
      `select public.partner_remove_device('${id}')`,
      'select public.partner_remove_all()',
    ]) {
      await assert.rejects(asAnon(db, sql), /permission denied/, sql)
    }
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npm test`

Expected: FAIL. The 10 new tests fail with `function public.partner_create(text) does not exist` (or the matching message for the other RPCs). The other 21 tests pass.

- [x] **Step 3: Append to the end of `20261015120100_partner_links_pilot_rpcs.sql`**

Put one blank line after the existing last line, then add:

```sql
-- Adds a person to share with. Returns {"id", "invite_token"}; the link is
-- https://crewluve.crewlu.net/join#t=<invite_token> (design §5.2). At most 25 per pilot.
create function public.partner_create(p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_pilot('partner_create');
  v_name text := private.clean_name(p_name, 'partner_create');
  v_partner public.partners%rowtype;
begin
  if (select count(*) from public.partners where owner_id = v_uid) >= 25 then
    raise exception 'partner_create: limit of 25 partners reached' using errcode = '54000';
  end if;
  insert into public.partners (owner_id, name, invite_token)
  values (v_uid, v_name, private.new_secret(16))
  returning * into v_partner;
  return jsonb_build_object('id', v_partner.id, 'invite_token', v_partner.invite_token);
end
$$;
revoke all on function public.partner_create(text) from public, anon, authenticated;
grant execute on function public.partner_create(text) to authenticated;

create function public.partner_rename(p_partner uuid, p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_pilot('partner_rename');
  v_name text := private.clean_name(p_name, 'partner_rename');
begin
  update public.partners set name = v_name where id = p_partner and owner_id = v_uid;
  if not found then
    raise exception 'partner_rename: partner not found' using errcode = 'P0002';
  end if;
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.partner_rename(uuid, text) from public, anon, authenticated;
grant execute on function public.partner_rename(uuid, text) to authenticated;

-- New Link (design D2): a new invite secret. The old link stops working; connected devices stay connected.
create function public.partner_new_link(p_partner uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_pilot('partner_new_link');
  v_token text;
begin
  update public.partners set invite_token = private.new_secret(16)
   where id = p_partner and owner_id = v_uid
  returning invite_token into v_token;
  if v_token is null then
    raise exception 'partner_new_link: partner not found' using errcode = 'P0002';
  end if;
  return jsonb_build_object('invite_token', v_token);
end
$$;
revoke all on function public.partner_new_link(uuid) from public, anon, authenticated;
grant execute on function public.partner_new_link(uuid) to authenticated;

-- Remove {name}: the person, every device of theirs, and their open codes and tickets.
create function public.partner_remove(p_partner uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_pilot('partner_remove');
begin
  delete from public.partners where id = p_partner and owner_id = v_uid;
  if not found then
    raise exception 'partner_remove: partner not found' using errcode = 'P0002';
  end if;
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.partner_remove(uuid) from public, anon, authenticated;
grant execute on function public.partner_remove(uuid) to authenticated;

create function public.partner_remove_device(p_device uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_pilot('partner_remove_device');
begin
  delete from public.partner_devices where id = p_device and owner_id = v_uid;
  if not found then
    raise exception 'partner_remove_device: device not found' using errcode = 'P0002';
  end if;
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.partner_remove_device(uuid) from public, anon, authenticated;
grant execute on function public.partner_remove_device(uuid) to authenticated;

-- Stop Sharing with Everyone: every partner, every device, and the summary itself.
create function public.partner_remove_all() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_pilot('partner_remove_all');
begin
  delete from public.partners where owner_id = v_uid;
  delete from public.partner_status where user_id = v_uid;
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.partner_remove_all() from public, anon, authenticated;
grant execute on function public.partner_remove_all() to authenticated;
```

- [x] **Step 4: Run it and watch it pass**

Run: `npm test`

Expected: `ℹ pass 31`, `ℹ fail 0`.

- [x] **Step 5: Commit**

```bash
cd ~/Dev/Duty
git add supabase/migrations/20261015120100_partner_links_pilot_rpcs.sql supabase/tests/pilot_rpcs.test.js
git commit -m "feat(partner-links): pilot RPCs to add, rename, re-link and remove partners and devices

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: Move tickets

**Files:**
- Modify: `supabase/migrations/20261015120100_partner_links_pilot_rpcs.sql` (append at the end)
- Test: `supabase/tests/move_ticket.test.js`

- [x] **Step 1: Write the failing test, `supabase/tests/move_ticket.test.js`**

```js
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { addUser, asAdmin, asAnon, freshDb } from './helpers/db.js'
import { createPartner, moveTicket } from './helpers/rpc.js'

describe('partner_move_ticket', () => {
  let db
  before(async () => {
    db = await freshDb()
  })
  after(async () => {
    await db.close()
  })

  const DAY = 24 * 60 * 60 * 1000

  test('a move ticket is 64 hex characters, valid for 90 days, and stored only as its hash', async () => {
    const pilot = await addUser(db)
    const { id } = await createPartner(db, pilot, 'Sarah')
    const t = await moveTicket(db, pilot, id)
    assert.match(t.ticket, /^[0-9a-f]{64}$/)
    const days = (Date.parse(t.expires_at) - Date.now()) / DAY
    assert.ok(days > 89.99 && days <= 90, `expires in ${days} days`)
    const rows = await asAdmin(
      db,
      "select kind, used_at from private.partner_handoffs where token_hash = extensions.digest($1, 'sha256')",
      [t.ticket],
    )
    assert.deepEqual(rows, [{ kind: 'move', used_at: null }])
  })

  test('a new ticket replaces the unused one', async () => {
    const pilot = await addUser(db)
    const { id } = await createPartner(db, pilot, 'Sarah')
    await moveTicket(db, pilot, id)
    const second = await moveTicket(db, pilot, id)
    const rows = await asAdmin(
      db,
      "select token_hash = extensions.digest($2, 'sha256') as is_second from private.partner_handoffs where partner_id = $1",
      [id, second.ticket],
    )
    assert.deepEqual(rows, [{ is_second: true }])
  })

  test("a pilot can't make tickets for another pilot's partner, and anon can't make any", async () => {
    const pilot = await addUser(db)
    const intruder = await addUser(db)
    const { id } = await createPartner(db, pilot, 'Sarah')
    await assert.rejects(moveTicket(db, intruder, id), /partner not found/)
    await assert.rejects(asAnon(db, `select public.partner_move_ticket('${id}')`), /permission denied/)
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npm test`

Expected: FAIL. The 3 new tests fail with `function public.partner_move_ticket(uuid) does not exist`. The other 31 tests pass.

- [x] **Step 3: Append to the end of `20261015120100_partner_links_pilot_rpcs.sql`**

Put one blank line after the existing last line, then add:

```sql
-- A move ticket for one partner (design §8): CrewLu puts it in the iCloud record, and that partner's
-- Crewluve redeems it with partner_handoff_redeem. Valid 90 days, once. A new ticket replaces an unused one.
create function public.partner_move_ticket(p_partner uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_pilot('partner_move_ticket');
  v_ticket text := private.new_secret(32);
  v_expires timestamptz := now() + interval '90 days';
begin
  if not exists (select 1 from public.partners where id = p_partner and owner_id = v_uid) then
    raise exception 'partner_move_ticket: partner not found' using errcode = 'P0002';
  end if;
  delete from private.partner_handoffs where partner_id = p_partner and kind = 'move' and used_at is null;
  insert into private.partner_handoffs (token_hash, partner_id, kind, expires_at)
  values (private.hash_secret(v_ticket), p_partner, 'move', v_expires);
  return jsonb_build_object('ticket', v_ticket, 'expires_at', v_expires);
end
$$;
revoke all on function public.partner_move_ticket(uuid) from public, anon, authenticated;
grant execute on function public.partner_move_ticket(uuid) to authenticated;
```

- [x] **Step 4: Run it and watch it pass**

Run: `npm test`

Expected: `ℹ pass 34`, `ℹ fail 0`.

- [x] **Step 5: Commit**

```bash
cd ~/Dev/Duty
git add supabase/migrations/20261015120100_partner_links_pilot_rpcs.sql supabase/tests/move_ticket.test.js
git commit -m "feat(partner-links): move tickets for carrying iCloud partners over

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7: Joining, viewing and leaving

**Files:**
- Create: `supabase/migrations/20261015120200_partner_links_partner_rpcs.sql`
- Test: `supabase/tests/join_view.test.js`

- [x] **Step 1: Write the failing test, `supabase/tests/join_view.test.js`**

```js
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { addUser, asAdmin, asUser, freshDb } from './helpers/db.js'
import { connected, createPartner, join, leave, newLink, removeDevice, removePartner, setStatus, view } from './helpers/rpc.js'

describe('partner_join, partner_view and partner_leave', () => {
  let db
  before(async () => {
    db = await freshDb()
  })
  after(async () => {
    await db.close()
  })

  const ENDED = { error: 'sharing_ended' }

  test('tapping the link connects a device, which then reads the summary', async () => {
    const pilot = await addUser(db)
    const { id, invite_token } = await createPartner(db, pilot, 'Sarah')
    await setStatus(db, pilot, { pilotFirstName: 'Todd', tripLegs: [] }, 198)

    const joined = await join(db, invite_token, 'app', "Sarah's iPhone")
    assert.match(joined.device_key, /^[0-9a-f]{64}$/)
    assert.equal(joined.partner_id, id)

    const v = await view(db, joined.device_key)
    assert.equal(v.partner_id, id)
    assert.deepEqual(v.status, { pilotFirstName: 'Todd', tripLegs: [] })
    assert.ok(!Number.isNaN(Date.parse(v.updated_at)), v.updated_at)
    assert.deepEqual(await asUser(db, pilot, 'select kind, label from public.partner_devices'), [
      { kind: 'app', label: "Sarah's iPhone" },
    ])
  })

  test('the device key is stored only as its hash', async () => {
    const { key, deviceId } = await connected(db)
    const [hashed] = await asAdmin(
      db,
      "select count(*)::int as n from private.partner_device_secrets where device_id = $1 and key_hash = extensions.digest($2, 'sha256')",
      [deviceId, key],
    )
    assert.equal(hashed.n, 1)
    const [plain] = await asAdmin(
      db,
      `select exists (select 1 from public.partner_devices d where d::text like '%' || $1 || '%')
           or exists (select 1 from private.partner_device_secrets s where s::text like '%' || $1 || '%') as found`,
      [key],
    )
    assert.equal(plain.found, false)
  })

  test('one link works on up to 10 devices per person', async () => {
    const { invite } = await connected(db)
    for (let i = 2; i <= 10; i++) assert.match((await join(db, invite, 'web', `Browser ${i}`)).device_key, /^[0-9a-f]{64}$/)
    assert.deepEqual(await join(db, invite, 'web', 'Browser 11'), { error: 'too_many_devices' })
  })

  test('an unknown, blank or retired link answers sharing_ended', async () => {
    const { pilot, partnerId, invite } = await connected(db)
    assert.deepEqual(await join(db, 'f'.repeat(32)), ENDED)
    assert.deepEqual(await join(db, ''), ENDED)
    assert.deepEqual(await join(db, null), ENDED)
    const fresh = await newLink(db, pilot, partnerId)
    assert.deepEqual(await join(db, invite), ENDED)
    assert.equal((await join(db, fresh.invite_token)).partner_id, partnerId)
  })

  test('a link pasted in upper case or with spaces still works', async () => {
    const { partnerId, invite } = await connected(db)
    assert.equal((await join(db, `  ${invite.toUpperCase()} `)).partner_id, partnerId)
  })

  test('a bad device kind is refused; a blank label gets a default', async () => {
    const { pilot, invite } = await connected(db)
    assert.deepEqual(await join(db, invite, 'tv', 'Living room'), { error: 'invalid_input' })
    assert.deepEqual(await join(db, invite, null, 'Living room'), { error: 'invalid_input' })
    await join(db, invite, 'web', '   ')
    const labels = await asUser(db, pilot, "select label from public.partner_devices where kind = 'web'")
    assert.deepEqual(labels, [{ label: 'Web browser' }])
  })

  test('New Link keeps connected devices connected', async () => {
    const { pilot, partnerId, key } = await connected(db)
    await newLink(db, pilot, partnerId)
    assert.equal((await view(db, key)).partner_id, partnerId)
  })

  test('removing a device or the person ends sharing on that device', async () => {
    const { pilot, partnerId, invite, key, deviceId } = await connected(db)
    const second = await join(db, invite, 'web', 'Safari on iPad')
    await removeDevice(db, pilot, deviceId)
    assert.deepEqual(await view(db, key), ENDED)
    assert.equal((await view(db, second.device_key)).partner_id, partnerId)
    await removePartner(db, pilot, partnerId)
    assert.deepEqual(await view(db, second.device_key), ENDED)
  })

  test('a malformed key answers sharing_ended', async () => {
    for (const key of ['', null, 'x'.repeat(64), 'A'.repeat(64), '0'.repeat(63)]) {
      assert.deepEqual(await view(db, key), ENDED, String(key))
    }
  })

  test("a device reads only its own pilot's summary", async () => {
    const one = await connected(db)
    const two = await connected(db)
    await setStatus(db, one.pilot, { pilotFirstName: 'Todd' }, 1)
    await setStatus(db, two.pilot, { pilotFirstName: 'Alex' }, 1)
    assert.equal((await view(db, one.key)).status.pilotFirstName, 'Todd')
    assert.equal((await view(db, two.key)).status.pilotFirstName, 'Alex')
  })

  test('before the first summary a connected device gets status null', async () => {
    const { partnerId, key } = await connected(db)
    assert.deepEqual(await view(db, key), { partner_id: partnerId, updated_at: null, status: null })
  })

  test('with since, an unchanged summary is not sent again', async () => {
    const { pilot, partnerId, key } = await connected(db)
    await setStatus(db, pilot, { v: 1 }, 1)
    const first = await view(db, key)
    assert.deepEqual(await view(db, key, first.updated_at), { partner_id: partnerId, updated_at: first.updated_at, unchanged: true })
    await asAdmin(db, "update public.partner_status set updated_at = updated_at - interval '1 minute' where user_id = $1", [pilot])
    await setStatus(db, pilot, { v: 2 }, 1)
    assert.deepEqual((await view(db, key, first.updated_at)).status, { v: 2 })
  })

  test('each partner sees only their own nickname', async () => {
    const pilot = await addUser(db)
    const sarah = await createPartner(db, pilot, 'Sarah')
    const kids = await createPartner(db, pilot, 'Kids')
    const sarahKey = (await join(db, sarah.invite_token)).device_key
    const kidsKey = (await join(db, kids.invite_token)).device_key
    await setStatus(db, pilot, { displayNameByPartner: { [sarah.id]: 'Todd', [kids.id]: 'Dad' } }, 1)
    assert.deepEqual((await view(db, sarahKey)).status.displayNameByPartner, { [sarah.id]: 'Todd' })
    assert.deepEqual((await view(db, kidsKey)).status.displayNameByPartner, { [kids.id]: 'Dad' })
  })

  test('last seen moves forward at most every 5 minutes', async () => {
    const { deviceId, key } = await connected(db)
    const lastSeenAgo = async () =>
      (await asAdmin(db, 'select extract(epoch from now() - last_seen_at)::int as s from public.partner_devices where id = $1', [deviceId]))[0].s
    await asAdmin(db, "update public.partner_devices set last_seen_at = now() - interval '10 minutes' where id = $1", [deviceId])
    await view(db, key)
    assert.ok((await lastSeenAgo()) < 5)
    await asAdmin(db, "update public.partner_devices set last_seen_at = now() - interval '2 minutes' where id = $1", [deviceId])
    await view(db, key)
    assert.ok((await lastSeenAgo()) >= 119)
  })

  test('a device can disconnect itself, and doing it twice is fine', async () => {
    const { pilot, key } = await connected(db)
    assert.deepEqual(await leave(db, key), { ok: true })
    assert.deepEqual(await view(db, key), ENDED)
    assert.deepEqual(await asUser(db, pilot, 'select id from public.partner_devices'), [])
    assert.deepEqual(await leave(db, key), { ok: true })
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npm test`

Expected: FAIL. The 15 new tests fail with `function public.partner_join(text, text, text) does not exist`. The other 34 tests pass.

- [x] **Step 3: Write `supabase/migrations/20261015120200_partner_links_partner_rpcs.sql`**

```sql
-- Partner links, part 3 of 3: what a partner device (Crewluve, the website) calls with only the publishable
-- key. Each RPC returns jsonb, and failures are answers rather than errors:
--   {"error": "sharing_ended"}    the key, link, code or ticket isn't valid (any more)
--   {"error": "invalid_input"}    a bad device kind, push token or push environment
--   {"error": "too_many_devices"} the person already has 10 devices
--   {"error": "try_later"}        too many wrong codes in the last minute
-- Answering instead of raising lets a failed code attempt be recorded (an error would roll it back).

-- The device a key belongs to. Keys are 64 lower-case hex characters; anything else matches nothing.
create function private.device_for_key(p_key text)
returns table (device_id uuid, partner_id uuid, owner_id uuid, kind text, last_seen_at timestamptz)
language sql stable set search_path = '' as $$
  select d.id, d.partner_id, d.owner_id, d.kind, d.last_seen_at
    from private.partner_device_secrets s
    join public.partner_devices d on d.id = s.device_id
   where p_key ~ '^[0-9a-f]{64}$'
     and s.key_hash = private.hash_secret(p_key)
$$;

-- A new device for a partner. Its key is returned once and stored only as its hash.
create function private.create_device(p_partner uuid, p_owner uuid, p_kind text, p_label text) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  v_label text := left(btrim(coalesce(p_label, ''), E' \t\r\n'), 60);
  v_key text := private.new_secret(32);
  v_device uuid;
begin
  if p_kind is null or p_kind not in ('app', 'web') then
    return jsonb_build_object('error', 'invalid_input');
  end if;
  if v_label = '' then
    v_label := case p_kind when 'app' then 'Crewluve app' else 'Web browser' end;
  end if;
  if (select count(*) from public.partner_devices where partner_id = p_partner) >= 10 then
    return jsonb_build_object('error', 'too_many_devices');
  end if;
  insert into public.partner_devices (partner_id, owner_id, kind, label)
  values (p_partner, p_owner, p_kind, v_label)
  returning id into v_device;
  insert into private.partner_device_secrets (device_id, key_hash)
  values (v_device, private.hash_secret(v_key));
  return jsonb_build_object('device_key', v_key, 'device_id', v_device, 'partner_id', p_partner);
end
$$;

revoke all on all functions in schema private from public, anon, authenticated;

-- Tapping the invite link (design §5.5). p_kind is 'app' or 'web'; p_label names the device for the pilot's
-- list ("Sarah's iPhone", "Safari on iPad"). Returns {"device_key", "device_id", "partner_id"}.
create function public.partner_join(p_invite text, p_kind text, p_label text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_partner public.partners%rowtype;
begin
  select * into v_partner from public.partners where invite_token = lower(btrim(coalesce(p_invite, '')));
  if not found then
    return jsonb_build_object('error', 'sharing_ended');
  end if;
  return private.create_device(v_partner.id, v_partner.owner_id, p_kind, p_label);
end
$$;
revoke all on function public.partner_join(text, text, text) from public, anon, authenticated;
grant execute on function public.partner_join(text, text, text) to anon, authenticated;

-- The pilot's summary, trimmed for this partner (design §4.2):
--   {"partner_id", "updated_at", "status"}  status is null until CrewLu writes the first summary
--   {"partner_id", "updated_at", "unchanged": true}  when nothing is newer than p_since
-- Pass the last answer's updated_at as p_since to skip downloading an unchanged summary.
create function public.partner_view(p_key text, p_since timestamptz default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_device record;
  v_status public.partner_status%rowtype;
begin
  select * into v_device from private.device_for_key(p_key);
  if not found then
    return jsonb_build_object('error', 'sharing_ended');
  end if;
  -- "Seen today" in the pilot's list, without a write on every refresh.
  if v_device.last_seen_at < now() - interval '5 minutes' then
    update public.partner_devices set last_seen_at = now() where id = v_device.device_id;
  end if;

  select * into v_status from public.partner_status where user_id = v_device.owner_id;
  if not found then
    return jsonb_build_object('partner_id', v_device.partner_id, 'updated_at', null, 'status', null);
  end if;
  if p_since is not null and v_status.updated_at <= p_since then
    return jsonb_build_object('partner_id', v_device.partner_id, 'updated_at', v_status.updated_at, 'unchanged', true);
  end if;
  return jsonb_build_object(
    'partner_id', v_device.partner_id,
    'updated_at', v_status.updated_at,
    'status', private.trim_status_for(v_status.status, v_device.partner_id));
end
$$;
revoke all on function public.partner_view(text, timestamptz) from public, anon, authenticated;
grant execute on function public.partner_view(text, timestamptz) to anon, authenticated;

-- Disconnect (Crewluve settings, design §5.5): the device removes itself. Always {"ok": true}.
create function public.partner_leave(p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.partner_devices d
   using private.device_for_key(p_key) k
   where d.id = k.device_id;
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.partner_leave(text) from public, anon, authenticated;
grant execute on function public.partner_leave(text) to anon, authenticated;
```

- [x] **Step 4: Run it and watch it pass**

Run: `npm test`

Expected: `ℹ pass 49`, `ℹ fail 0`.

- [x] **Step 5: Commit**

```bash
cd ~/Dev/Duty
git add supabase/migrations/20261015120200_partner_links_partner_rpcs.sql supabase/tests/join_view.test.js
git commit -m "feat(partner-links): partner_join, partner_view and partner_leave for partner devices

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8: Hand-off codes and redeeming move tickets

**Files:**
- Modify: `supabase/migrations/20261015120200_partner_links_partner_rpcs.sql` (append at the end)
- Test: `supabase/tests/handoff.test.js`

- [x] **Step 1: Write the failing test, `supabase/tests/handoff.test.js`**

```js
import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, test } from 'node:test'
import { asAdmin, freshDb } from './helpers/db.js'
import { connected, createCode, join, leave, moveTicket, redeem, removeDevice, removePartner, view } from './helpers/rpc.js'

describe('hand-off codes and move tickets', () => {
  let db
  before(async () => {
    db = await freshDb()
  })
  after(async () => {
    await db.close()
  })
  beforeEach(async () => {
    await asAdmin(db, 'delete from private.partner_redeem_failures')
  })

  const ENDED = { error: 'sharing_ended' }
  const CODE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/
  const WRONG = '000000' // 6 characters, so it counts as a code, but 0 is never in one

  test('a connected device makes a code that connects one more device, once', async () => {
    const { partnerId, key } = await connected(db)
    const c = await createCode(db, key)
    assert.match(c.code, CODE)
    const minutes = (Date.parse(c.expires_at) - Date.now()) / 60000
    assert.ok(minutes > 9.9 && minutes <= 10, `expires in ${minutes} minutes`)

    const laptop = await redeem(db, c.code, 'web', 'Safari on Mac')
    assert.equal(laptop.partner_id, partnerId)
    assert.match(laptop.device_key, /^[0-9a-f]{64}$/)
    assert.equal((await view(db, laptop.device_key)).partner_id, partnerId)
    assert.deepEqual(await redeem(db, c.code), ENDED)
  })

  test('a code can be typed in lower case, with spaces or a dash', async () => {
    const { partnerId, key } = await connected(db)
    const first = (await createCode(db, key)).code
    assert.equal((await redeem(db, `${first.slice(0, 3)}-${first.slice(3)}`.toLowerCase())).partner_id, partnerId)
    const second = (await createCode(db, key)).code
    assert.equal((await redeem(db, ` ${second.slice(0, 3)} ${second.slice(3)} `)).partner_id, partnerId)
  })

  test('a code expires after 10 minutes', async () => {
    const { key } = await connected(db)
    const c = await createCode(db, key)
    await asAdmin(db, "update private.partner_handoffs set expires_at = now() - interval '1 second' where kind = 'code'")
    assert.deepEqual(await redeem(db, c.code), ENDED)
  })

  test('a new code replaces the open one', async () => {
    const { partnerId, key } = await connected(db)
    const older = await createCode(db, key)
    const newer = await createCode(db, key)
    assert.deepEqual(await redeem(db, older.code), ENDED)
    assert.equal((await redeem(db, newer.code)).partner_id, partnerId)
  })

  test('30 wrong codes in a minute pause code redemptions, which then work again', async () => {
    const { partnerId, key } = await connected(db)
    const c = await createCode(db, key)
    for (let i = 0; i < 30; i++) assert.deepEqual(await redeem(db, WRONG), ENDED)
    assert.deepEqual(await redeem(db, c.code), { error: 'try_later' })
    await asAdmin(db, "update private.partner_redeem_failures set at = now() - interval '61 seconds'")
    assert.equal((await redeem(db, c.code)).partner_id, partnerId)
  })

  test('a move ticket connects the partner once, even while codes are paused', async () => {
    const { pilot, partnerId } = await connected(db)
    const t = await moveTicket(db, pilot, partnerId)
    for (let i = 0; i < 30; i++) await redeem(db, WRONG)
    const moved = await redeem(db, t.ticket, 'app', "Sarah's iPhone")
    assert.equal(moved.partner_id, partnerId)
    assert.deepEqual(await redeem(db, t.ticket, 'app', "Sarah's iPhone"), ENDED)
  })

  test('a move ticket expires after 90 days', async () => {
    const { pilot, partnerId } = await connected(db)
    const t = await moveTicket(db, pilot, partnerId)
    await asAdmin(db, "update private.partner_handoffs set expires_at = now() - interval '1 second' where kind = 'move'")
    assert.deepEqual(await redeem(db, t.ticket, 'app'), ENDED)
  })

  test("a code isn't used up when the person already has 10 devices", async () => {
    const { pilot, invite, key } = await connected(db)
    const extra = []
    for (let i = 2; i <= 10; i++) extra.push((await join(db, invite, 'web', `Browser ${i}`)).device_id)
    const c = await createCode(db, key)
    assert.deepEqual(await redeem(db, c.code), { error: 'too_many_devices' })
    await removeDevice(db, pilot, extra[0])
    assert.match((await redeem(db, c.code)).device_key, /^[0-9a-f]{64}$/)
  })

  test("removing the person ends their codes and tickets; a removed device can't make codes", async () => {
    const { pilot, partnerId, key } = await connected(db)
    const c = await createCode(db, key)
    const t = await moveTicket(db, pilot, partnerId)
    await removePartner(db, pilot, partnerId)
    assert.deepEqual(await redeem(db, c.code), ENDED)
    assert.deepEqual(await redeem(db, t.ticket, 'app'), ENDED)

    const other = await connected(db)
    await leave(db, other.key)
    assert.deepEqual(await createCode(db, other.key), ENDED)
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npm test`

Expected: FAIL. The 9 new tests fail with `function public.partner_handoff_create(text) does not exist` or `function public.partner_handoff_redeem(text, text, text) does not exist`. The other 49 tests pass.

- [x] **Step 3: Append to the end of `20261015120200_partner_links_partner_rpcs.sql`**

Put one blank line after the existing last line, then add:

```sql
-- Use on another device (design D3): a 6-character code for the same partner, valid 10 minutes, once.
-- Returns {"code", "expires_at"}. A partner has one open code at a time: a new one replaces it.
create function public.partner_handoff_create(p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_device record;
  v_code text;
  v_expires timestamptz := now() + interval '10 minutes';
  v_attempt integer := 0;
begin
  select * into v_device from private.device_for_key(p_key);
  if not found then
    return jsonb_build_object('error', 'sharing_ended');
  end if;
  delete from private.partner_handoffs
   where (partner_id = v_device.partner_id and kind = 'code' and used_at is null)
      or expires_at < now() - interval '1 day';
  loop
    v_code := private.new_code();
    begin
      insert into private.partner_handoffs (token_hash, partner_id, kind, expires_at)
      values (private.hash_secret(v_code), v_device.partner_id, 'code', v_expires);
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt >= 5 then
        raise;
      end if;
    end;
  end loop;
  return jsonb_build_object('code', v_code, 'expires_at', v_expires);
end
$$;
revoke all on function public.partner_handoff_create(text) from public, anon, authenticated;
grant execute on function public.partner_handoff_create(text) to anon, authenticated;

-- Redeems a hand-off code (typed on the welcome screen, any case, spaces and dashes ignored) or a move
-- ticket (from the iCloud record). Returns the new device like partner_join. A code or ticket that would
-- go past 10 devices answers too_many_devices and stays usable.
create function public.partner_handoff_redeem(p_token text, p_kind text, p_label text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_compact text := regexp_replace(coalesce(p_token, ''), '[\s-]', '', 'g');
  v_is_code boolean := char_length(v_compact) = 6;
  v_token text := case when v_is_code then upper(v_compact) else lower(v_compact) end;
  v_handoff private.partner_handoffs%rowtype;
  v_owner uuid;
  v_result jsonb;
begin
  if v_is_code then
    -- Codes are short enough to guess, so 30 failures in a minute pause every code redemption until those
    -- failures are a minute old (design §5.3). Move tickets are too long to guess and skip this.
    delete from private.partner_redeem_failures where at < now() - interval '1 hour';
    if (select count(*) from private.partner_redeem_failures where at > now() - interval '1 minute') >= 30 then
      return jsonb_build_object('error', 'try_later');
    end if;
  end if;

  select * into v_handoff from private.partner_handoffs
   where token_hash = private.hash_secret(v_token)
     and kind = case when v_is_code then 'code' else 'move' end
     and used_at is null
     and expires_at > now()
     for update;
  if not found then
    if v_is_code then
      insert into private.partner_redeem_failures default values;
    end if;
    return jsonb_build_object('error', 'sharing_ended');
  end if;

  select owner_id into v_owner from public.partners where id = v_handoff.partner_id;
  v_result := private.create_device(v_handoff.partner_id, v_owner, p_kind, p_label);
  if v_result ? 'error' then
    return v_result;
  end if;
  update private.partner_handoffs set used_at = now() where token_hash = v_handoff.token_hash;
  return v_result;
end
$$;
revoke all on function public.partner_handoff_redeem(text, text, text) from public, anon, authenticated;
grant execute on function public.partner_handoff_redeem(text, text, text) to anon, authenticated;
```

- [x] **Step 4: Run it and watch it pass**

Run: `npm test`

Expected: `ℹ pass 58`, `ℹ fail 0`.

- [x] **Step 5: Commit**

```bash
cd ~/Dev/Duty
git add supabase/migrations/20261015120200_partner_links_partner_rpcs.sql supabase/tests/handoff.test.js
git commit -m "feat(partner-links): hand-off codes and move-ticket redemption, with a guessing throttle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 9: Push tokens

**Files:**
- Modify: `supabase/migrations/20261015120200_partner_links_partner_rpcs.sql` (append at the end)
- Test: `supabase/tests/push.test.js`

- [x] **Step 1: Write the failing test, `supabase/tests/push.test.js`**

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
    (await asAdmin(db, 'select push_token, push_env from private.partner_device_secrets where device_id = $1', [deviceId]))[0]

  test("the app saves its push token and environment", async () => {
    const { key, deviceId } = await connected(db)
    assert.deepEqual(await setPush(db, key, TOKEN.toUpperCase(), 'sandbox'), { ok: true })
    assert.deepEqual(await pushOf(deviceId), { push_token: TOKEN, push_env: 'sandbox' })
  })

  test('only app devices, real tokens and known environments are accepted', async () => {
    const web = await connected(db, { kind: 'web' })
    assert.deepEqual(await setPush(db, web.key, TOKEN), { error: 'invalid_input' })
    const app = await connected(db)
    for (const [token, env] of [['xyz', 'production'], ['ab'.repeat(20), 'production'], [TOKEN, 'staging'], [TOKEN, null], [null, 'production']]) {
      assert.deepEqual(await setPush(db, app.key, token, env), { error: 'invalid_input' }, `${token} ${env}`)
    }
    assert.deepEqual(await pushOf(app.deviceId), { push_token: null, push_env: null })
  })

  test('a token moves to the newest device that registers it', async () => {
    const { invite, key, deviceId } = await connected(db)
    await setPush(db, key, TOKEN)
    const reinstalled = await join(db, invite, 'app', "Sarah's iPhone")
    await setPush(db, reinstalled.device_key, TOKEN)
    assert.deepEqual(await pushOf(deviceId), { push_token: null, push_env: null })
    assert.deepEqual(await pushOf(reinstalled.device_id), { push_token: TOKEN, push_env: 'production' })
  })

  test('a disconnected device answers sharing_ended', async () => {
    const { key } = await connected(db)
    await leave(db, key)
    assert.deepEqual(await setPush(db, key, TOKEN), { error: 'sharing_ended' })
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npm test`

Expected: FAIL. The 4 new tests fail with `function public.partner_set_push(text, text, text) does not exist`. The other 58 tests pass.

- [x] **Step 3: Append to the end of `20261015120200_partner_links_partner_rpcs.sql`**

Put one blank line after the existing last line, then add:

```sql
-- Saves the Crewluve app's APNs token for the push service (piece 3). p_env is 'sandbox' (debug builds) or
-- 'production'. A token moves to the newest device that registers it, so a reinstalled app isn't woken twice.
create function public.partner_set_push(p_key text, p_token text, p_env text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_device record;
  v_token text := lower(btrim(coalesce(p_token, '')));
begin
  select * into v_device from private.device_for_key(p_key);
  if not found then
    return jsonb_build_object('error', 'sharing_ended');
  end if;
  if v_device.kind <> 'app' or v_token !~ '^[0-9a-f]{64,200}$'
     or p_env is null or p_env not in ('sandbox', 'production') then
    return jsonb_build_object('error', 'invalid_input');
  end if;
  update private.partner_device_secrets set push_token = null, push_env = null
   where push_token = v_token and device_id <> v_device.device_id;
  update private.partner_device_secrets set push_token = v_token, push_env = p_env
   where device_id = v_device.device_id;
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.partner_set_push(text, text, text) from public, anon, authenticated;
grant execute on function public.partner_set_push(text, text, text) to anon, authenticated;
```

- [x] **Step 4: Run it and watch it pass**

Run: `npm test`

Expected: `ℹ pass 62`, `ℹ fail 0`.

- [x] **Step 5: Commit**

```bash
cd ~/Dev/Duty
git add supabase/migrations/20261015120200_partner_links_partner_rpcs.sql supabase/tests/push.test.js
git commit -m "feat(partner-links): partner_set_push saves the Crewluve app's push token

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 10: The privileges guard, and deliberate breaks

**Files:**
- Test: `supabase/tests/privileges.test.js`

This test pins down who can call and read what. A new function or table that isn't listed in it fails the test, so nothing ships with access nobody decided on. It passes as soon as it's written, because the earlier tasks already built correct grants. The deliberate breaks in Steps 4–5 then prove that the suite catches regressions.

- [x] **Step 1: Write `supabase/tests/privileges.test.js`**

```js
// Who can call and read what. If a new function or table appears without being listed here, a test fails,
// so nothing ships with access nobody decided on.
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { asAdmin, freshDb } from './helpers/db.js'

describe('privileges', () => {
  let db
  before(async () => {
    db = await freshDb()
  })
  after(async () => {
    await db.close()
  })

  const PILOT_RPCS = [
    'set_partner_status(jsonb, integer)',
    'partner_create(text)',
    'partner_rename(uuid, text)',
    'partner_new_link(uuid)',
    'partner_remove(uuid)',
    'partner_remove_device(uuid)',
    'partner_remove_all()',
    'partner_move_ticket(uuid)',
  ]
  const PARTNER_RPCS = [
    'partner_join(text, text, text)',
    'partner_view(text, timestamp with time zone)',
    'partner_leave(text)',
    'partner_handoff_create(text)',
    'partner_handoff_redeem(text, text, text)',
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
    for (const sig of PILOT_RPCS) {
      assert.equal(await canExecute('anon', `public.${sig}`), false, `anon: ${sig}`)
      assert.equal(await canExecute('authenticated', `public.${sig}`), true, `authenticated: ${sig}`)
    }
  })

  test('partner RPCs: callable with only the publishable key', async () => {
    for (const sig of PARTNER_RPCS) {
      assert.equal(await canExecute('anon', `public.${sig}`), true, `anon: ${sig}`)
      assert.equal(await canExecute('authenticated', `public.${sig}`), true, `authenticated: ${sig}`)
    }
  })

  test('every RPC is security definer with an empty search_path', async () => {
    const rows = await asAdmin(
      db,
      "select p.proname as name, p.prosecdef as definer, p.proconfig as config from pg_proc p where p.pronamespace = 'public'::regnamespace",
    )
    for (const { name, definer, config } of rows) {
      assert.equal(definer, true, name)
      assert.deepEqual(config, ['search_path=""'], name)
    }
  })

  test('private helpers and tables are out of reach for client roles', async () => {
    for (const role of ['anon', 'authenticated']) {
      const [{ usage }] = await asAdmin(db, "select has_schema_privilege($1, 'private', 'usage') as usage", [role])
      assert.equal(usage, false, `${role} schema usage`)
      const helpers = await asAdmin(db, "select p.oid::regprocedure::text as sig from pg_proc p where p.pronamespace = 'private'::regnamespace")
      assert.ok(helpers.length >= 8, `found ${helpers.length} helpers`)
      for (const { sig } of helpers) assert.equal(await canExecute(role, sig), false, `${role}: ${sig}`)
      for (const table of PRIVATE_TABLES) {
        for (const priv of ['select', 'insert', 'update', 'delete']) {
          const [{ ok }] = await asAdmin(db, 'select has_table_privilege($1, $2, $3) as ok', [role, `private.${table}`, priv])
          assert.equal(ok, false, `${role} ${priv} ${table}`)
        }
      }
    }
  })

  test('public partner tables: signed-in pilots read (RLS decides which rows); nobody writes', async () => {
    for (const table of PUBLIC_TABLES) {
      for (const [role, priv, expected] of [
        ['anon', 'select', false],
        ['anon', 'insert', false],
        ['authenticated', 'select', true],
        ['authenticated', 'insert', false],
        ['authenticated', 'update', false],
        ['authenticated', 'delete', false],
      ]) {
        const [{ ok }] = await asAdmin(db, 'select has_table_privilege($1, $2, $3) as ok', [role, `public.${table}`, priv])
        assert.equal(ok, expected, `${role} ${priv} ${table}`)
      }
      const [{ rls }] = await asAdmin(db, 'select relrowsecurity as rls from pg_class where oid = $1::regclass', [`public.${table}`])
      assert.equal(rls, true, `RLS on ${table}`)
    }
  })
})
```

- [x] **Step 2: Run it**

Run: `npm test`

Expected: `ℹ tests 68`, `ℹ pass 68`, `ℹ fail 0`.

- [x] **Step 3: Commit**

```bash
cd ~/Dev/Duty
git add supabase/tests/privileges.test.js
git commit -m "test(partner-links): privileges guard for every partner function and table

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [x] **Step 4: Break the SQL on purpose, one change at a time**

For each row:
1. Make the change.
2. Run `npm test`, and confirm that the listed test fails.
3. Undo the change with `git -C ~/Dev/Duty checkout -- supabase/migrations/<file>`.

A row whose test still passes is a gap in the suite. Write the missing test before going on. Every row was checked while writing this plan.

| # | File | Change | Must fail |
|---|---|---|---|
| 1 | `…pilot_rpcs.sql` | Delete the line `    where ps.writer_build <= excluded.writer_build` | "a newer or equal build replaces the summary; an older build is refused" |
| 2 | `…tables.sql` | In `trim_status_for`, replace the three lines `if s is null then` / `return null;` / `end if;` with `  return s;` | "a partner sees only their own nickname and per-partner quick status", plus 3 more |
| 3 | `…pilot_rpcs.sql` | Change `grant execute on function public.partner_create(text) to authenticated;` to `… to anon, authenticated;` | "pilot RPCs: signed-in users only" and "without a signed-in pilot every pilot RPC is refused" |
| 4 | `…partner_rpcs.sql` | In `partner_handoff_redeem`, delete the line `     and used_at is null` (just above `     and expires_at > now()`) | "a connected device makes a code that connects one more device, once" and "a move ticket connects the partner once, even while codes are paused" |
| 5 | `…partner_rpcs.sql` | Replace `      insert into private.partner_redeem_failures default values;` with `      null;` | "30 wrong codes in a minute pause code redemptions, which then work again" |
| 6 | `…partner_rpcs.sql` | In `create_device`, change `>= 10 then` to `>= 11 then` | "one link works on up to 10 devices per person" and "a code isn't used up when the person already has 10 devices" |
| 7 | `…tables.sql` | Replace `revoke all on schema private from public, anon, authenticated;` with `grant usage on schema private to anon, authenticated;` | "private helpers and tables are out of reach for client roles" |
| 8 | `…partner_rpcs.sql` | Change `  if v_device.last_seen_at < now() - interval '5 minutes' then` to `  if true then` | "last seen moves forward at most every 5 minutes" |

- [x] **Step 5: Confirm the tree is clean and green**

Run: `git -C ~/Dev/Duty status --short supabase && npm test`

Expected: no output from `git status` for `supabase`, then `ℹ pass 68`, `ℹ fail 0`.

### Task 11: Documentation

**Files:**
- Create: `supabase/tests/README.md`, `supabase/partner-api.md`
- Modify: `~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-15-partner-links-design.md`

- [x] **Step 1: Write `supabase/tests/README.md`**

````markdown
# CrewLu Cloud SQL tests

Tests for the SQL in `../migrations`, starting with the partner-links migrations (`*_partner_links_*.sql`).

They run in [PGlite](https://pglite.dev), which is Postgres compiled to WebAssembly, so they need only Node. There's no Docker, no Supabase CLI and no connection to CrewLu Cloud.

## Run them

```bash
cd supabase/tests
npm install   # once
npm test
```

About 70 tests run in under 10 seconds.

## How they work

- **`helpers/supabase_shim.sql`** recreates the parts of Supabase the migrations rely on:
  - the `anon`, `authenticated` and `service_role` roles;
  - `auth.users` and `auth.uid()`;
  - the default privileges Supabase gives new tables and functions in `public`;
  - the two pgcrypto functions the migrations call, `extensions.digest` and `extensions.gen_random_bytes`.
- **`helpers/db.js`** makes a fresh database for each test file and applies the shim and every partner-links migration in order. It can run SQL three ways, matching what PostgREST does:
  - `asUser`: as a signed-in pilot;
  - `asAnon`: as a caller holding only the publishable key;
  - `asAdmin`: as the owner, to set up and inspect.
- **`helpers/rpc.js`** has one wrapper per RPC.
- **`helpers/seed.js`** writes rows directly, for tests that need them without going through the RPCs.

## What they don't cover

- **Postgres version.** PGlite is Postgres 18, and CrewLu Cloud runs 17. The migrations avoid anything newer than 17.
- **Real pgcrypto.** PGlite's pgcrypto hangs about half the times it loads, so the shim stands in for it. The shim's comments explain how.
- **PostgREST and HTTP.** The tests call SQL directly. After applying a migration to CrewLu Cloud, run the HTTP checks from the plan that shipped it. For partner links, those are in `../partner-api.md`.
````

- [x] **Step 2: Write `supabase/partner-api.md`**

This is the contract that pieces 2–5 build against. It also holds the HTTP checks and the undo SQL for Task 13.

````markdown
# Partner Links API (CrewLu Cloud)

How CrewLu, Crewluve and the Crewluve website use partner links.

- **Where it comes from:** piece 1 of the partner-links design (`crewluve-web` repo, `docs/superpowers/specs/2026-10-15-partner-links-design.md`).
- **The SQL:** `migrations/*_partner_links_*.sql`. Its tests are in `tests/`.
- **How to call it:** every call is a PostgREST RPC.
  - `POST https://corxvurxpnrzekbxdgye.supabase.co/rest/v1/rpc/<name>`
  - The publishable key goes in the `apikey` header.
  - The body is a JSON object of the named parameters.
  - Every RPC answers with a JSON object.

## Links

| Link | Is redeemed with |
|---|---|
| `https://crewluve.crewlu.net/join#t=<invite_token>` | `partner_join` (the invite) |
| `https://crewluve.crewlu.net/join#c=<code>` | `partner_handoff_redeem` (a hand-off QR) |

- **Secrets go after the `#`,** so they never reach a server log.
- **Move tickets aren't links.** CrewLu puts them in the old iCloud record.

## Pilot RPCs (CrewLu, signed in)

Send the pilot's access token as `Authorization: Bearer <token>`. These RPCs raise an error on misuse, and the message starts with the RPC's name (for example `partner_rename: partner not found`).

| RPC | Parameters | Answer |
|---|---|---|
| `set_partner_status` | `p_status` (a JSON object of up to 1 MB), `p_build` (an integer of 0 or more) | `{"applied": true}`, or `{"applied": false}` when a newer build already wrote the summary |
| `partner_create` | `p_name` (1–60 characters after trimming) | `{"id", "invite_token"}`. At most 25 partners per pilot. |
| `partner_rename` | `p_partner`, `p_name` | `{"ok": true}` |
| `partner_new_link` | `p_partner` | `{"invite_token"}`. The old link stops working, and connected devices stay connected. |
| `partner_remove` | `p_partner` | `{"ok": true}`. That person's devices, codes and tickets go too. |
| `partner_remove_device` | `p_device` | `{"ok": true}` |
| `partner_remove_all` | none | `{"ok": true}`. Every partner and the summary go. |
| `partner_move_ticket` | `p_partner` | `{"ticket", "expires_at"}`. Valid 90 days, usable once. It replaces an unused ticket. |

The pilot reads their own rows directly (RLS):

- **`partners`:** `id, name, invite_token, created_at`. `invite_token` is what Send Link Again sends.
- **`partner_devices`:** `id, partner_id, kind, label, created_at, last_seen_at`. A partner has moved off iCloud once they have a device row.
- **`partner_status`:** their own summary, `writer_build` and `updated_at`.

## Partner RPCs (Crewluve and the website, publishable key only)

Failures are answers, with HTTP 200:

```
{"error": "sharing_ended" | "invalid_input" | "too_many_devices" | "try_later"}
```

On `sharing_ended`, forget the device key and show "Sharing has ended".

| RPC | Parameters | Answer |
|---|---|---|
| `partner_join` | `p_invite`, `p_kind` (`app` or `web`), `p_label` | `{"device_key", "device_id", "partner_id"}`. Keep `device_key` secret: in the Keychain, or in local storage on the web. |
| `partner_view` | `p_key`, `p_since` (optional: the last answer's `updated_at`) | `{"partner_id", "updated_at", "status"}`, where `status` is null before the first summary. Or `{"partner_id", "updated_at", "unchanged": true}`. |
| `partner_handoff_create` | `p_key` | `{"code", "expires_at"}`: 6 characters, valid 10 minutes, usable once. It replaces that person's open code. |
| `partner_handoff_redeem` | `p_token`, `p_kind`, `p_label` | Same as `partner_join`. `p_token` is a code (any case, with spaces and dashes ignored) or a move ticket. |
| `partner_set_push` | `p_key`, `p_token` (the APNs token in hex), `p_env` (`sandbox` or `production`) | `{"ok": true}`. App devices only. |
| `partner_leave` | `p_key` | `{"ok": true}` |

Limits:

- **Devices:** 10 per person. Past that, the answer is `too_many_devices`, and the code or ticket stays usable.
- **Wrong codes:** 30 in a minute pause every code redemption for about a minute (`try_later`).

## The summary JSON (`p_status`)

It's CrewLu's `SharedPilotStatus`, encoded with `Codable`: dates as seconds since 1970, plus `schemaVersion: 1`. Piece 2 defines the full schema.

The partner door relies on three fields:

- **`displayNameByPartner`:** an object whose keys are the lower-case `partners.id` and whose values are the pilot's name as that partner sees it.
- **`quickStatusByPartner`:** an object with the same keys, whose values are `{status, icon, expiry}`.
- **`quickStatusTargets`:** an array of `partners.id`, or null for everyone. It goes with `quickStatus`, `quickStatusIcon` and `quickStatusExpiry`.

Each partner gets only their own entries, and sees a targeted quick status only if they're one of its targets.

## Checks after applying to CrewLu Cloud

Run these with the publishable key. The `KEY=` line reads it from the website repo:

```bash
URL=https://corxvurxpnrzekbxdgye.supabase.co
KEY=$(sed -n "s/^export const SUPABASE_PUBLISHABLE_KEY = '\(.*\)'$/\1/p" ~/Dev/"Crewluve Website"/src/cloud.ts)
ZEROS=0000000000000000000000000000000000000000000000000000000000000000
curl -s -X POST "$URL/rest/v1/rpc/partner_view" -H "apikey: $KEY" -H "Content-Type: application/json" -d "{\"p_key\":\"$ZEROS\"}"
curl -s -X POST "$URL/rest/v1/rpc/partner_join" -H "apikey: $KEY" -H "Content-Type: application/json" -d '{"p_invite":"00000000000000000000000000000000","p_kind":"web","p_label":"check"}'
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$URL/rest/v1/rpc/partner_create" -H "apikey: $KEY" -H "Content-Type: application/json" -d '{"p_name":"check"}'
curl -s -o /dev/null -w "%{http_code}\n" "$URL/rest/v1/partners?select=id" -H "apikey: $KEY"
```

The expected answers, in order:

1. `{"error": "sharing_ended"}`
2. `{"error": "sharing_ended"}`
3. `401`
4. `401`

## Undo

This removes everything the three partner-links migrations added. It touches nothing that existed before them.

```sql
begin;
drop function if exists
  public.partner_set_push(text, text, text),
  public.partner_handoff_redeem(text, text, text),
  public.partner_handoff_create(text),
  public.partner_leave(text),
  public.partner_view(text, timestamptz),
  public.partner_join(text, text, text),
  public.partner_move_ticket(uuid),
  public.partner_remove_all(),
  public.partner_remove_device(uuid),
  public.partner_remove(uuid),
  public.partner_new_link(uuid),
  public.partner_rename(uuid, text),
  public.partner_create(text),
  public.set_partner_status(jsonb, integer);
drop table if exists
  private.partner_redeem_failures,
  private.partner_handoffs,
  private.partner_device_secrets,
  public.partner_devices,
  public.partners,
  public.partner_status;
drop function if exists
  private.create_device(uuid, uuid, text, text),
  private.device_for_key(text),
  private.clean_name(text, text),
  private.require_pilot(text),
  private.trim_status_for(jsonb, uuid),
  private.new_code(),
  private.hash_secret(text),
  private.new_secret(integer);
drop schema if exists private;
commit;
```
````

- [x] **Step 3: Commit in Duty**

```bash
cd ~/Dev/Duty
git add supabase/tests/README.md supabase/partner-api.md
git commit -m "docs(partner-links): API reference for pieces 2-5, test README, checks and undo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [x] **Step 4: Bring the umbrella design in line with what was built**

Make five replacements in `~/Dev/Crewluve Website/docs/superpowers/specs/2026-10-15-partner-links-design.md`.

**Replacement (a), in §4.1.** Replace:

```
- **How CrewLu writes it.** CrewLu writes the row through an RPC, `set_partner_status(p_status jsonb, p_build int)`, which runs as the caller (RLS owner).
  - The RPC refuses a write from an older build than the stored `writer_build`. That's the same guard as `writerBuildVersion` (`PilotStatusBeaconManager.swift:333-352`), now enforced by the server.
```

with:

```
- **How CrewLu writes it.** CrewLu writes the row through an RPC, `set_partner_status(p_status jsonb, p_build int)`, which writes only the signed-in pilot's own row.
  - The RPC refuses a write from an older build than the stored `writer_build` and answers `{"applied": false}`. That's the same guard as `writerBuildVersion` (`PilotStatusBeaconManager.swift:333-352`), now enforced by the server.
```

**Replacement (b), in §4.1.** Replace:

```
  - `tripLegs` as a real JSON array, not a blob;
```

with:

```
  - `tripLegs` as a real JSON array, not a blob;
  - `displayNameByPartner` and `quickStatusByPartner` as real JSON objects keyed by the lower-case `partners.id`, and `quickStatusTargets` as an array of those ids (the partner door trims by these names, §4.2);
```

**Replacement (c), in §5.1.** Replace the `partner_devices` and `partner_handoffs` bullets:

```
- **`partner_devices`:** one row per connected device.
  - `id`, `partner_id` (on delete cascade), `owner_id`.
  - `key_hash`: the SHA-256 of the device's 256-bit key. The plaintext key exists only on the device.
  - `kind` (`app` or `web`) and `label` ("Sarah's iPhone", "Safari on iPad").
  - `push_token` and `push_env` (`sandbox` or `production`), app devices only.
  - `created_at` and `last_seen_at`.
- **`partner_handoffs`:** one-time tokens that create a device.
```

with:

```
- **`partner_devices`:** one row per connected device.
  - `id`, `partner_id` (on delete cascade), `owner_id`.
  - `kind` (`app` or `web`) and `label` ("Sarah's iPhone", "Safari on iPad").
  - `created_at` and `last_seen_at`.
- **`private.partner_device_secrets`:** one row per device, which no client can read.
  - `key_hash`: the SHA-256 of the device's 256-bit key. The plaintext key exists only on the device.
  - `push_token` and `push_env` (`sandbox` or `production`), app devices only.
- **`private.partner_redeem_failures`:** failed code attempts, for the throttle in §5.3.
- **`private.partner_handoffs`:** one-time tokens that create a device.
```

**Replacement (d), in §5.1.** Replace:

```
- **RLS:**
  - The owner can read and write their own `partners` rows.
  - The owner can read and delete their own `partner_devices` and `partner_handoffs` rows.
  - Partners have no table access at all. Everything they do goes through §5.3.
```

with:

```
- **Access:**
  - The pilot reads their own `partners`, `partner_devices` and `partner_status` rows through RLS. Every change goes through the pilot's RPCs (§5.3).
  - Partners have no table access at all. Everything they do goes through the partner RPCs (§5.3).
  - The `private` schema isn't exposed by the API, and no client role can use it.
- **Limits:** 25 partners per pilot, 10 devices per person, 1 MB per summary, and one open code and one open move ticket per person.
```

**Replacement (e), in §5.3.** Replace:

```
- **Guessing codes.** Codes are short, so `partner_handoff_redeem` keeps a count of failures. After 30 failures in a minute, every redemption fails for the next minute. That could block hand-offs for a minute but never exposes data. Move tickets and invites are long enough not to need this.
```

with:

```
- **Guessing codes.** Codes are short, so `partner_handoff_redeem` keeps a count of failures. After 30 failures in a minute, every code redemption fails until those failures are a minute old. That could block hand-offs for a minute but never exposes data. Move tickets and invites are long enough to skip this, so a move-over is never delayed.
- **Answers, not errors.** Partner RPCs answer `{"error": "sharing_ended" | "invalid_input" | "too_many_devices" | "try_later"}` instead of raising, so a failed code attempt can be recorded.
- **The pilot's RPCs** (signed in, `authenticated` only) return jsonb and raise an error on misuse:
  - `set_partner_status(p_status, p_build)` → `{applied}`;
  - `partner_create(p_name)` → `{id, invite_token}`;
  - `partner_rename(p_partner, p_name)`;
  - `partner_new_link(p_partner)` → `{invite_token}`;
  - `partner_remove(p_partner)`;
  - `partner_remove_device(p_device)`;
  - `partner_remove_all()`, which also deletes the summary;
  - `partner_move_ticket(p_partner)` → `{ticket, expires_at}`.
- **The full as-built API**, with every answer, the HTTP checks and the undo SQL, is in `~/Dev/Duty/supabase/partner-api.md`.
```

Also change the heading `### 5.1 Tables (names may be refined in piece 1's spec)` to `### 5.1 Tables`.

- [x] **Step 5: Commit in the website repo**

```bash
cd ~/Dev/"Crewluve Website"
git add docs/superpowers/specs/2026-10-15-partner-links-design.md docs/superpowers/plans/2026-10-15-partner-links-piece1-cloud-door.md
git commit -m "Spec: partner links refined by piece 1 (private schema, pilot RPCs, limits, answers not errors)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 12: Review

- [ ] **Step 1: Dispatch one reviewer**

Use the `superpowers:code-reviewer` agent. Give it:
- the diff: `git -C ~/Dev/Duty diff feature/supabase-account-backend...feature/partner-cloud-door -- supabase`;
- the design (§4, §5, §9 piece 1);
- this plan's "Decisions made while planning".

Ask it to check, at least:
- every `security definer` function, for `search_path`, schema-qualified names and input checks;
- that no partner path can read an owner table or another pilot's summary;
- the trimming in `trim_status_for`;
- the code throttle and its rollback behavior;
- token generation and storage, with keys and tickets hashed and invites readable by the owner only;
- Postgres 17 compatibility, given that the tests run on Postgres 18;
- the Supabase default grants, and that every revoke is right.

- [ ] **Step 2: Fix what it finds, test first**

For each finding you accept:
1. Write a failing test that shows it.
2. Fix the SQL.
3. Run `npm test`.
4. Commit.

Then send the reviewer the fixes to re-check.

- [ ] **Step 3: Report to the user**

Report what the review found, what changed, and the final test count.

### Task 13: Apply to CrewLu Cloud (needs the user's yes)

- [ ] **Step 1: Take a "before" snapshot of the policies (read-only MCP)**

Run with `mcp__supabase__execute_sql`:

```sql
select tablename, policyname, cmd, roles::text as roles, qual, with_check
  from pg_policies where schemaname = 'public' order by tablename, policyname;
```

Expected: 21 rows as of 2026-10-15: one owner policy on each of 18 tables, plus 3 on `profiles`. Save the result in the scratchpad as `policies-before.json`.

- [ ] **Step 2: Ask the user (one question)**

Ask whether to apply now. Say what it does:
- adds a `private` schema, 6 tables and 22 functions (14 RPCs and 8 helpers);
- changes nothing that exists today;
- can be undone with the SQL in `supabase/partner-api.md`.

Say what they'll do: paste one script into the Supabase SQL editor and press Run. If the answer isn't yes, stop here.

- [ ] **Step 3: Put the script on the clipboard**

```bash
cd ~/Dev/Duty/supabase/migrations
{ echo 'begin;'; cat 20261015120000_partner_links_tables.sql 20261015120100_partner_links_pilot_rpcs.sql 20261015120200_partner_links_partner_rpcs.sql; echo 'commit;'; } | pbcopy
```

Tell the user:
1. Open https://supabase.com/dashboard/project/corxvurxpnrzekbxdgye/sql/new.
2. Paste.
3. Press Run.
4. Expect "Success. No rows returned".

Wait for them to report back.

- [ ] **Step 4: Check the tables, functions and privileges (read-only MCP)**

Run with `mcp__supabase__execute_sql`, one query at a time:

```sql
-- Tables
select n.nspname as schema, c.relname as tbl, c.relrowsecurity as rls, pg_get_userbyid(c.relowner) as owner
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where c.relkind = 'r' and (n.nspname = 'private' or (n.nspname = 'public' and c.relname in ('partner_status', 'partners', 'partner_devices')))
 order by 1, 2;
-- Functions
select p.proname as fn, has_function_privilege('anon', p.oid, 'execute') as anon,
       has_function_privilege('authenticated', p.oid, 'execute') as signed_in, p.prosecdef as definer
  from pg_proc p
 where p.pronamespace = 'public'::regnamespace and (p.proname like 'partner\_%' or p.proname = 'set_partner_status')
 order by 1;
-- Private schema
select has_schema_privilege('anon', 'private', 'usage') as anon_usage,
       has_schema_privilege('authenticated', 'private', 'usage') as signed_in_usage,
       (select count(*) from pg_proc where pronamespace = 'private'::regnamespace)::int as helpers;
-- Table privileges
select c.relname as tbl, has_table_privilege('anon', c.oid, 'select') as anon_read,
       has_table_privilege('authenticated', c.oid, 'select') as signed_in_read,
       has_table_privilege('authenticated', c.oid, 'insert') or has_table_privilege('authenticated', c.oid, 'update')
         or has_table_privilege('authenticated', c.oid, 'delete') as signed_in_write
  from pg_class c
 where c.oid in ('public.partner_status'::regclass, 'public.partners'::regclass, 'public.partner_devices'::regclass)
 order by 1;
```

Expected:
- **Tables:** six rows (`private.partner_device_secrets`, `private.partner_handoffs`, `private.partner_redeem_failures`, `public.partner_devices`, `public.partner_status`, `public.partners`). Every one has `rls` true, and `owner` is `postgres`.
- **Functions:** 14 rows, all with `definer` true and `signed_in` true. `anon` is true for exactly `partner_handoff_create`, `partner_handoff_redeem`, `partner_join`, `partner_leave`, `partner_set_push` and `partner_view`, and false for the other 8.
- **Private schema:** `anon_usage` false, `signed_in_usage` false, `helpers` 8.
- **Table privileges:** `anon_read` false, `signed_in_read` true and `signed_in_write` false for all three tables.

Then run the Step 1 policies query again. Expected: 24 rows. The 21 from `policies-before.json` are unchanged, and the 3 new ones are `partner_devices_owner_read`, `partner_status_owner_read` and `partners_owner_read`.

- [ ] **Step 5: Check the security advisors**

Run `mcp__supabase__get_advisors` with type `security`. Compare it with the baseline from 2026-10-15:

| Lint | Before | After |
|---|---|---|
| `function_search_path_mutable` | 4 | 4 |
| `anon_security_definer_function_executable` | 1 (`handle_new_user`) | 7: plus the 6 partner RPCs |
| `authenticated_security_definer_function_executable` | 2 (`delete_my_account`, `handle_new_user`) | 16: plus all 14 RPCs |
| `auth_leaked_password_protection` | 1 | 1 |

The new findings are intended: these RPCs are the door, and each one checks a secret or `auth.uid()`. If any other new finding appears, stop and report it to the user.

- [ ] **Step 6: Run the HTTP checks**

Run the four `curl` commands under "Checks after applying to CrewLu Cloud" in `supabase/partner-api.md`.

Expected:
1. `{"error": "sharing_ended"}`
2. `{"error": "sharing_ended"}`
3. `401`
4. `401`

- [ ] **Step 7: If anything is off, undo**

Tell the user what's off. Then copy the undo SQL to the clipboard:

```bash
sed -n '/^## Undo/,$p' ~/Dev/Duty/supabase/partner-api.md | sed -n '/^```sql$/,/^```$/p' | sed '1d;$d' | pbcopy
```

Ask them to paste and run it in the same SQL editor, then re-run Step 4's tables query. Expected: no rows.

- [ ] **Step 8: Record the result**

Tick this task in this plan, noting the date, then commit the plan in the website repo.

### Task 14: Finish

- [ ] **Step 1: Ask about merging (one question)**

Ask whether to merge `feature/partner-cloud-door` into `feature/supabase-account-backend` locally (a fast-forward).

- [ ] **Step 2: On a yes, merge and re-test**

```bash
cd ~/Dev/Duty
git switch feature/supabase-account-backend
git merge --ff-only feature/partner-cloud-door
cd supabase/tests && npm test
```

Expected: a fast-forward, then `ℹ pass 68`, `ℹ fail 0`. The Xcode scheme changes are still uncommitted and untouched.

- [ ] **Step 3: Pushing needs a separate, fresh yes for each repo**

Duty:
```bash
git -C ~/Dev/Duty push origin feature/supabase-account-backend
```

Website (this plan and the spec; the push redeploys the unchanged site):
```bash
git -C ~/Dev/"Crewluve Website" push origin main
```

- [ ] **Step 4: Update the project memory**

Update `project-crewluve-web-status.md` and its `MEMORY.md` line:
- piece 1 is live, with its date and commits;
- next is piece 1b (the app-link file) and piece 2 (CrewLu), against `~/Dev/Duty/supabase/partner-api.md`.
