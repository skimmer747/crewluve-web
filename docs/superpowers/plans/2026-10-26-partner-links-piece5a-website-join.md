# Partner Links Piece 5a: the Website Joins with the Invite Link — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A partner opens their invite link in any browser (Android, a computer, an iPhone without Crewluve). The Crewluve website then connects through the partner door, with no password, and shows "Where's {Name}?" from the pilot's summary. The password sign-in goes.

**Architecture:**
- A new `src/partner/` folder holds the partner side, as small pure modules:
  - the summary reader;
  - a converter to the engine's `Schedule`;
  - links, the browser's label and the messages;
  - the door guard and the door;
  - the store;
  - joining and refreshing.
- `buildLegs`, the snapshot and every card stay as they are. The live page feeds them a `Schedule` converted from the summary, as the demo feeds them one built from its rows.
- `Root` becomes:
  - the demo;
  - a welcome screen;
  - a joining screen;
  - the connected pages, polling `partner_view` every 30 s.

**Tech Stack:** Vite 5.4, Preact 10.29, TypeScript 5.9 (strict, `noUnusedLocals`), Vitest 3.2 with happy-dom and @testing-library/preact. It deploys to GitHub Pages on a push to `main`.

**Spec:** `docs/superpowers/specs/2026-10-26-partner-links-piece5a-website-join-design.md`. It was amended on 2026-10-26 with this plan's decisions; read it first.

**The contract:**
- the door: `~/Dev/Duty/supabase/partner-api.md`;
- the summary: `~/Dev/Duty/supabase/partner-status/schema.json`;
- Crewluve's own join, for the same behaviour:
  - `~/Dev/Crewluv/Crewluv/Services/PartnerJoiner.swift`;
  - `~/Dev/Crewluv/Crewluv/Services/PartnerCloud/CrewluCloudDevice.swift`;
  - `~/Dev/Crewluv/Crewluv/Models/JoinMessage.swift`;
  - `~/Dev/Crewluv/Crewluv/Models/CloudSummary.swift`.

---

## Before you start

- **The repository:** `~/Dev/Crewluve Website`. The path has a space, so quote it in every shell command. Work on `main`. **Never push without the user's fresh yes**: a push to `main` deploys the live site (`.github/workflows/deploy-pages.yml`), and from that moment the password sign-in stops working.
- **Leave alone:**
  - `docs/superpowers/plans/2026-10-26-partner-links-piece2-release.md` is untracked on purpose. Never stage it.
  - Stage files by name. Never use `git add -A` or `git add .`.
- **The repository is public.** No names, emails, Apple IDs or invite links go in any file or commit message.
- **The commands:**
  - `npx vitest run <path>` runs one test file;
  - `npm test` runs them all;
  - `npx tsc --noEmit` type-checks `src`, `tests` and the configs;
  - `npm run build` type-checks, then builds `dist/`.
- **Tests can't reach the network** (`tests/setup/noNetwork.ts`). Every Crewlu Cloud call in a test goes to the fake door in `tests/fixtures/partner.ts` (Task 6).
- **The source rules** (`tests/data/readOnly.test.ts`, `tests/fixtures/sourceScan.ts`) scan every file in `src/`:
  - Never use the member names `rpc`, `storage`, `functions`, `admin`, `invoke`, `updateUser` or `signUp` anywhere in `src/`. `storage` as a plain variable or parameter is fine; `x.storage` or `{ storage }` is not.
  - Never call `.from(` on anything but `Array` or a typed array.
  - Make no `fetch` with a method or body outside `src/partner/door.ts`.
  - Use no `innerHTML`.
- **Commit messages** follow this repository's style: a plain sentence, ending with the piece, for example "… (partner links piece 5a)". End each with:

  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```

## The files

**New, in `src/partner/`:**

| File | Does one thing |
|---|---|
| `summary.ts` | Reads `partner_view`'s summary, defensively: the pilot, the name this partner sees, the legs, and the quick statuses in Crewluve's order. |
| `convert.ts` | Turns a summary into the engine's `Schedule`; the waiting schedule before the first summary; a stored answer into what the page shows. |
| `link.ts` | `#t=` and `#c=` links from an address or pasted text; the code's alphabet. |
| `label.ts` | "Chrome on Android": this browser's name in the pilot's list. |
| `messages.ts` | Crewluve's join messages, word for word; "Connected on this browser…". |
| `doorGuard.ts` | Lets only POSTs to the four partner RPCs leave the page. It replaces `src/data/readOnlyFetch.ts`. |
| `door.ts` | The four RPCs over the guard, with the publishable key. It's the only module that talks to Crewlu Cloud. |
| `store.ts` | localStorage: the device, the pending key, the last summary; clears the old sign-in's leftovers; makes keys. |
| `join.ts` | Joining with a link or a code: keys, `key_in_use`, Switch, Cancel, Connect (spec §4.3). |
| `refresh.ts` | One poll of `partner_view` with `since`; `SharingEnded` and `NotConnected`. |

**New UI:**
- `src/ui/Welcome.tsx`: the welcome screen and the "Connecting…" screen;
- `src/ui/Notice.tsx`: one line above the cards.

**Changed:**
- `src/ui/Root.tsx`: rewritten: the demo, the welcome, joining, and the connected pages.
- `src/ui/hooks/useSchedule.ts`: holds a `Schedule` (not rows), with `initial` and `onError`, every 30 s.
- `src/ui/PilotPages.tsx`: builds the legs from the `Schedule` it's given; Disconnect; the notice; the quick status.
- `src/ui/StatusScreen.tsx` and `src/ui/LocationCard.tsx`: the notice, and the quick status row.
- `src/ui/EmptyState.tsx`: "Waiting for your pilot's first update…".
- `scripts/build-icons.mjs` and `src/icons/iconPaths.ts` (generated): Phone, ChatCircle, ForkKnife.
- `src/styles/cards.css` and `src/styles/location.css`.
- `src/cloud.ts`: the sign-in's storage key goes.
- `vite.config.ts`: writes `dist/join.html` as a copy of `dist/index.html`.
- `index.html`: the referrer, preview card and app banner tags.
- `package.json` and `package-lock.json`: `@supabase/supabase-js` goes.

**Deleted:**
- `src/auth/session.ts` and `src/auth/signInErrors.ts`;
- `src/ui/SignIn.tsx`;
- `src/data/fetchSchedule.ts`, `src/data/cache.ts` and `src/data/readOnlyFetch.ts`;
- `src/supabase.ts`;
- `public/join.html`;
- the tests of all of these.

**Kept:** `src/data/rows.ts` and `src/data/rowBuilder.ts`. The demo and `buildSchedule` use them.

**Tests:**
- new: `tests/partner/*.test.ts`, `tests/ui/Welcome.test.tsx` and `tests/fixtures/partner.ts`;
- copied: `tests/fixtures/partner-status/` (18 summaries and a README);
- rewritten:
  - `tests/ui/Root.test.tsx`;
  - `tests/data/readOnly.test.ts` and `tests/data/readOnlyScan.test.ts`;
  - `tests/fixtures/sourceScan.ts`;
  - `tests/joinPage.test.ts`;
- edited:
  - `tests/ui/hooks.test.tsx` and `tests/ui/PilotPages.test.tsx`;
  - `tests/ui/StatusScreen.test.tsx` and `tests/ui/LocationCard.test.tsx`;
  - `tests/viteConfig.test.ts` and `tests/icons/iconPaths.test.ts`.

## Task order

- **Tasks 1–7** add `src/partner/`. Nothing uses it yet, so the site is unchanged.
- **Tasks 8–9** add UI pieces that nothing shows yet.
- **Task 10** switches the live page over.
- **Task 11** removes the sign-in.
- **Task 12** makes `/join` the app.
- **Task 13** checks everything locally.
- **Task 14** is the user's check with a real invite, then the push.
- **Task 15** hands the wording back to CrewLu 3.1.0.

Every task ends with the full suite green, so any commit can ship.

---

### Task 1: The example summaries and the summary reader

**Files:**
- Create:
  - `tests/fixtures/partner-status/` (18 JSON files and a `README.md`);
  - `tests/fixtures/partner.ts`;
  - `src/partner/summary.ts`;
  - `tests/partner/summary.test.ts`.

- [ ] **Step 1: Copy the 18 trimmed summaries**

These are what `partner_view` really gives partner A and partner B, made by Crewlu Cloud's own trimming. The nine untrimmed examples aren't needed: a partner never sees one.

```bash
cd ~/Dev/"Crewluve Website"
mkdir -p tests/fixtures/partner-status
cp ~/Dev/Crewluv/CrewluvTests/Fixtures/PartnerSummary/*.[AB].json tests/fixtures/partner-status/
ls tests/fixtures/partner-status | wc -l
```

Expected: `18`.

- [ ] **Step 2: Write `tests/fixtures/partner-status/README.md`**

```markdown
# Partner summaries, as Crewlu Cloud gives them to each partner

What `partner_view` answers as `status` for CrewLu's nine example summaries: `<example>.A.json` for partner A
(`aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`) and `<example>.B.json` for partner B (`bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`).

- **Copied from** Crewluve's `CrewluvTests/Fixtures/PartnerSummary/`, which makes them with Crewlu Cloud's own
  trimming (`private.trim_status_for`) from CrewLu's examples in `supabase/partner-status/examples/`.
- **When they change** there, copy them again.
- **The schedule:** one made-up pilot, Alex, at home in Atlanta (ATL) with base Louisville (SDF). Each file is one
  moment of the same week:
  - a jumpseat to Louisville;
  - trip Z55120: Louisville to Rockford, a turn, Rockford to Ontario, a night in Ontario, Ontario to Louisville;
  - a jumpseat home.
- **Partner A** sees the pilot as "Dad" in `display-names.A.json` and has their own "Call Me" in
  `quick-status-one-partner.A.json`.

`tests/partner/summary.test.ts` and `tests/partner/convert.test.ts` read them through `tests/fixtures/partner.ts`.
```

- [ ] **Step 3: Write `tests/fixtures/partner.ts`**

Tasks 2 and 6 add to it.

```ts
import { readFileSync } from 'node:fs'

export const PARTNER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
export const PARTNER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

/** CrewLu's nine example moments (tests/fixtures/partner-status/README.md). */
export const EXAMPLES = [
  'commuting-home', 'display-names', 'hidden-trip-left-out', 'home', 'in-flight', 'layover', 'quick-status-everyone',
  'quick-status-one-partner', 'turn',
] as const

/** One example summary, as partner_view gives it to partner A or B. A fresh copy each call, so a test can change it. */
export function example(name: string, partner: 'A' | 'B' = 'A'): Record<string, unknown> {
  return JSON.parse(readFileSync(new URL(`./partner-status/${name}.${partner}.json`, import.meta.url), 'utf8'))
}
```

- [ ] **Step 4: Write the failing test, `tests/partner/summary.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { currentQuickStatus, nameIn, readSummary } from '../../src/partner/summary'
import { example, EXAMPLES, PARTNER_A, PARTNER_B } from '../fixtures/partner'

describe('readSummary', () => {
  it.each([...EXAMPLES])('reads %s for both partners', (name) => {
    for (const [who, id] of [['A', PARTNER_A], ['B', PARTNER_B]] as const) {
      const summary = readSummary(example(name, who), id)
      expect(summary?.pilotId).toBe('6F1C2D3E-4B5A-4C6D-8E7F-90A1B2C3D4E5')
      expect(summary?.legs).toHaveLength(7)
    }
  })

  it('reads the times as epoch ms and keeps the fields the website uses', () => {
    const summary = readSummary(example('layover'), PARTNER_A)!
    expect(summary).toMatchObject({ name: 'Alex', home: 'ATL', base: 'SDF', lastUpdated: 1792605600000 })
    expect(summary.legs[0]).toEqual({
      id: 'Z55120-leg-0', tripId: 'Z55120', type: 'flight', start: 1792537200000, end: 1792542000000, airportCode: 'SDF',
      flightNumber: 'UPS2961', departureAirport: 'SDF', arrivalAirport: 'RFD', tripTotalDays: 2, delayMinutes: null,
      airlineCode: null, label: null,
    })
  })

  it('names the pilot as this partner sees them: their own name for the pilot, else the first name', () => {
    expect(readSummary(example('display-names', 'A'), PARTNER_A)?.name).toBe('Dad')
    expect(readSummary(example('display-names', 'B'), PARTNER_B)?.name).toBe('Alex')
    // Crewlu Cloud's ids are in lower case; a partner id in capitals still finds its name.
    expect(readSummary(example('display-names', 'A'), PARTNER_A.toUpperCase())?.name).toBe('Dad')
    expect(nameIn(example('display-names', 'A'), PARTNER_A)).toBe('Dad')
  })

  it('refuses a summary it cannot read', () => {
    expect(readSummary(null, PARTNER_A)).toBeNull()
    expect(readSummary('summary', PARTNER_A)).toBeNull()
    expect(readSummary({ ...example('home'), schemaVersion: 2 }, PARTNER_A)).toBeNull()
    expect(readSummary({ ...example('home'), pilotId: '' }, PARTNER_A)).toBeNull()
    expect(readSummary({ ...example('home'), lastUpdated: 'today' }, PARTNER_A)).toBeNull()
    expect(nameIn(null, PARTNER_A)).toBeNull()
  })

  it('skips a malformed leg and keeps the rest', () => {
    const status = example('home')
    const legs = status.tripLegs as Array<Record<string, unknown>>
    const broken = [{ ...legs[0], type: 'teleport' }, { ...legs[1], startTime: null }, 'leg', ...legs.slice(2)]
    expect(readSummary({ ...status, tripLegs: broken }, PARTNER_A)?.legs).toHaveLength(5)
    expect(readSummary({ ...status, tripLegs: null }, PARTNER_A)?.legs).toEqual([])
  })
})

describe('quick status (piece 5a §7)', () => {
  const shownTo = (name: string, who: 'A' | 'B') => {
    const summary = readSummary(example(name, who), who === 'A' ? PARTNER_A : PARTNER_B)!
    return (now: number) => currentQuickStatus(summary, now)
  }

  it("shows the partner's own status", () => {
    expect(shownTo('quick-status-one-partner', 'A')(1792605600000)).toEqual({ text: 'Call Me', icon: 'phone.fill', expiresAt: 1792612800000 })
  })

  it('shows nothing to a partner it was not sent to', () => {
    expect(shownTo('quick-status-one-partner', 'B')(1792605600000)).toBeNull()
  })

  it('stops at its expiry', () => {
    const shown = shownTo('quick-status-one-partner', 'A')
    expect(shown(1792612800000 - 1)).not.toBeNull()
    expect(shown(1792612800000)).toBeNull()
  })

  it('shows the status sent to everyone, which has no limit', () => {
    expect(shownTo('quick-status-everyone', 'B')(1792605600000 + 86_400_000)).toEqual({ text: 'Sleeping', icon: 'moon.zzz.fill', expiresAt: null })
  })

  it("puts the partner's own status first, then the one for everyone once their own expires", () => {
    const status = {
      ...example('home'),
      quickStatusByPartner: { [PARTNER_A]: { status: 'Call Me', icon: 'phone.fill', expiry: 1792429200 } },
      quickStatus: 'Free to Talk', quickStatusIcon: 'bubble.left.fill', quickStatusExpiry: null, quickStatusTargets: null,
    }
    const summary = readSummary(status, PARTNER_A)!
    expect(currentQuickStatus(summary, 1792425600000)?.text).toBe('Call Me')
    expect(currentQuickStatus(summary, 1792429200000)?.text).toBe('Free to Talk')
  })

  it('leaves out a status for everyone whose targets say nobody', () => {
    const status = { ...example('home'), quickStatus: 'Free to Talk', quickStatusIcon: 'bubble.left.fill', quickStatusExpiry: null, quickStatusTargets: [] }
    expect(readSummary(status, PARTNER_A)?.quickStatuses).toEqual([])
  })
})
```

- [ ] **Step 5: Run it to see it fail**

Run: `npx vitest run tests/partner/summary.test.ts`

Expected: FAIL, because `../../src/partner/summary` can't be found.

- [ ] **Step 6: Write `src/partner/summary.ts`**

```ts
/**
 * The partner summary, as partner_view gives it to one partner: CrewLu's SharedPilotStatus, schema version 1
 * (~/Dev/Duty/supabase/partner-status/schema.json), trimmed by Crewlu Cloud to that partner's own entries. Only what
 * the website reads is kept, and nothing is trusted: a malformed leg is skipped, and a summary without a pilot id or
 * a lastUpdated can't be read at all.
 */

export type SummaryLegType = 'flight' | 'turn' | 'layover' | 'home' | 'base' | 'drive' | 'reserve' | 'hotStandby' | 'event' | 'unknown'

export interface SummaryLeg {
  id: string
  tripId: string | null
  type: SummaryLegType
  /** Epoch ms, as CrewLu wrote them: before `delayMinutes`. */
  start: number
  end: number
  airportCode: string | null
  flightNumber: string | null
  departureAirport: string | null
  arrivalAirport: string | null
  tripTotalDays: number | null
  /** How late this flight runs, in minutes (negative: early). Only the delayed flight has one. */
  delayMinutes: number | null
  /** Set on jumpseats and commercial deadheads; null on the pilot's company flights. */
  airlineCode: string | null
  label: string | null
}

export interface QuickStatus {
  text: string
  /** An SF Symbol name, as CrewLu sends it. */
  icon: string | null
  /** Epoch ms, or null for no limit. */
  expiresAt: number | null
}

export interface PartnerSummary {
  pilotId: string
  /** The name this partner sees: the one the pilot gave them ("Dad"), else the pilot's first name. */
  name: string | null
  home: string | null
  base: string | null
  /** When CrewLu wrote it, epoch ms. */
  lastUpdated: number
  legs: SummaryLeg[]
  /** This partner's own quick status first, then the one for everyone (Crewluve's CloudSummary.quickStatus(for:at:)). */
  quickStatuses: QuickStatus[]
}

const LEG_TYPES: ReadonlySet<string> = new Set(['flight', 'turn', 'layover', 'home', 'base', 'drive', 'reserve', 'hotStandby', 'event', 'unknown'])

type Fields = Record<string, unknown>
const isFields = (v: unknown): v is Fields => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null)
const count = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
/** Seconds since 1970 → epoch ms. */
const instant = (v: unknown): number | null => {
  const seconds = count(v)
  return seconds == null ? null : Math.round(seconds * 1000)
}

/** The summary partner_view gave `partnerId`, or null when it isn't one this site can read. */
export function readSummary(status: unknown, partnerId: string): PartnerSummary | null {
  if (!isFields(status) || status.schemaVersion !== 1) return null
  const pilotId = text(status.pilotId)
  const lastUpdated = instant(status.lastUpdated)
  if (!pilotId || lastUpdated == null) return null
  const id = partnerId.toLowerCase()
  const names = isFields(status.displayNameByPartner) ? status.displayNameByPartner : {}
  return {
    pilotId,
    name: text(names[id]) ?? text(status.pilotFirstName),
    home: text(status.homeAirportCode),
    base: text(status.baseAirportCode),
    lastUpdated,
    legs: Array.isArray(status.tripLegs) ? status.tripLegs.map(readLeg).filter((l): l is SummaryLeg => l != null) : [],
    quickStatuses: readQuickStatuses(status, id),
  }
}

/** The pilot's name in a stored summary, as this partner sees them, or null when there's none to read. */
export function nameIn(status: unknown, partnerId: string): string | null {
  return readSummary(status, partnerId)?.name ?? null
}

/** The quick status to show at `now`: the first that hasn't expired (CloudSummary.shows(_:until:at:)). */
export function currentQuickStatus(summary: PartnerSummary, now: number): QuickStatus | null {
  return summary.quickStatuses.find((q) => q.expiresAt == null || q.expiresAt > now) ?? null
}

function readLeg(v: unknown): SummaryLeg | null {
  if (!isFields(v)) return null
  const id = text(v.id)
  const type = typeof v.type === 'string' && LEG_TYPES.has(v.type) ? (v.type as SummaryLegType) : null
  const start = instant(v.startTime)
  const end = instant(v.endTime)
  if (!id || !type || start == null || end == null) return null
  return {
    id,
    tripId: text(v.tripId),
    type,
    start,
    end,
    airportCode: text(v.airportCode),
    flightNumber: text(v.flightNumber),
    departureAirport: text(v.departureAirport),
    arrivalAirport: text(v.arrivalAirport),
    tripTotalDays: count(v.tripTotalDays),
    delayMinutes: count(v.delayMinutes),
    airlineCode: text(v.airlineCode),
    label: text(v.label),
  }
}

function readQuickStatuses(status: Fields, id: string): QuickStatus[] {
  const found: QuickStatus[] = []
  const own = isFields(status.quickStatusByPartner) ? status.quickStatusByPartner[id] : null
  if (isFields(own)) {
    const ownText = text(own.status)
    if (ownText) found.push({ text: ownText, icon: text(own.icon), expiresAt: instant(own.expiry) })
  }
  // The status for everyone: Crewlu Cloud leaves it out for a partner it wasn't sent to. Null targets means everyone,
  // [] nobody (partner-api.md, "The summary JSON"), so this is the same rule again, as Crewluve keeps it.
  const targets = status.quickStatusTargets
  const forThisPartner = targets == null || (Array.isArray(targets) && targets.some((t) => typeof t === 'string' && t.toLowerCase() === id))
  const everyone = text(status.quickStatus)
  if (everyone && forThisPartner) {
    found.push({ text: everyone, icon: text(status.quickStatusIcon), expiresAt: instant(status.quickStatusExpiry) })
  }
  return found
}
```

- [ ] **Step 7: Run the test, then the type check**

Run: `npx vitest run tests/partner/summary.test.ts`. Expected: PASS (19 tests).

Run: `npx tsc --noEmit`. Expected: no output.

- [ ] **Step 8: Commit**

```bash
cd ~/Dev/"Crewluve Website"
git add tests/fixtures/partner-status tests/fixtures/partner.ts src/partner/summary.ts tests/partner/summary.test.ts
git commit -m "Partner summary reader, with Crewluve's 18 trimmed example summaries as fixtures (partner links piece 5a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The store

**Files:**
- Create: `src/partner/store.ts`, `tests/partner/store.test.ts`.
- Modify: `tests/fixtures/partner.ts` (add `key` and `memoryStorage`).

- [ ] **Step 1: Add the key and storage fixtures to `tests/fixtures/partner.ts`**

Add this import at the top, after the `node:fs` import:

```ts
import type { KeyValueStore } from '../../src/partner/store'
```

Then add at the end of the file:

```ts
/** A device key that passes the door's rule, from a number: key(1) is 63 zeros and a 1. */
export const key = (n: number) => n.toString(16).padStart(64, '0')

/** The part of localStorage the store uses, in memory, with what it holds in `data`. */
export function memoryStorage(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (name) => data.get(name) ?? null,
    setItem: (name, value) => {
      data.set(name, value)
    },
    removeItem: (name) => {
      data.delete(name)
    },
  }
}
```

- [ ] **Step 2: Write the failing test, `tests/partner/store.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import {
  clearOldSignIn, DEVICE_KEY, localPartnerStore, newKey, OLD_SIGN_IN_KEYS, PENDING_KEY, SUMMARY_KEY, type KeyValueStore,
} from '../../src/partner/store'
import { key, memoryStorage, PARTNER_A } from '../fixtures/partner'

const SUMMARY = { partnerId: PARTNER_A, updatedAt: '2026-10-26T17:36:00.123+00:00', status: { schemaVersion: 1 }, checkedAt: 5 }

describe('localPartnerStore (piece 5a §4.2)', () => {
  it('keeps the device, the pending key and the summary for the next visit', () => {
    const storage = memoryStorage()
    const store = localPartnerStore(storage)
    expect(store.saveDevice({ key: key(1), partnerId: PARTNER_A })).toBe(true)
    expect(store.savePendingKey(key(2))).toBe(true)
    store.saveSummary(SUMMARY)
    const nextVisit = localPartnerStore(storage)
    expect(nextVisit.device()).toEqual({ key: key(1), partnerId: PARTNER_A })
    expect(nextVisit.pendingKey()).toBe(key(2))
    expect(nextVisit.summary()).toEqual(SUMMARY)
    expect([...storage.data.keys()].sort()).toEqual([DEVICE_KEY, PENDING_KEY, SUMMARY_KEY].sort())
  })

  it("keeps an answer from before the pilot's first summary, with no updated_at", () => {
    const store = localPartnerStore(memoryStorage())
    store.saveSummary({ partnerId: PARTNER_A, updatedAt: null, status: null, checkedAt: 5 })
    expect(store.summary()).toEqual({ partnerId: PARTNER_A, updatedAt: null, status: null, checkedAt: 5 })
  })

  it('forgets the pending key alone, and everything on forget', () => {
    const storage = memoryStorage()
    const store = localPartnerStore(storage)
    store.saveDevice({ key: key(1), partnerId: PARTNER_A })
    store.savePendingKey(key(2))
    store.saveSummary(SUMMARY)
    store.forgetPendingKey()
    expect(store.pendingKey()).toBeNull()
    expect(store.device()).not.toBeNull()
    store.forget()
    expect([store.device(), store.pendingKey(), store.summary()]).toEqual([null, null, null])
    expect(storage.data.size).toBe(0)
  })

  it('ignores what does not look right', () => {
    const storage = memoryStorage()
    storage.setItem(DEVICE_KEY, JSON.stringify({ key: 'ABC', partnerId: PARTNER_A }))
    storage.setItem(PENDING_KEY, '{not json')
    storage.setItem(SUMMARY_KEY, JSON.stringify({ partnerId: PARTNER_A, updatedAt: 5, checkedAt: 1 }))
    const store = localPartnerStore(storage)
    expect([store.device(), store.pendingKey(), store.summary()]).toEqual([null, null, null])
  })

  it('says so when it cannot save, and reads nothing, when the browser blocks storage', () => {
    const refuse = () => {
      throw new Error('SecurityError')
    }
    const blocked: KeyValueStore = { getItem: refuse, setItem: refuse, removeItem: refuse }
    const store = localPartnerStore(blocked)
    expect(store.saveDevice({ key: key(1), partnerId: PARTNER_A })).toBe(false)
    expect(store.savePendingKey(key(2))).toBe(false)
    expect([store.device(), store.pendingKey(), store.summary()]).toEqual([null, null, null])
    expect(() => store.forget()).not.toThrow()
    expect(localPartnerStore(null).savePendingKey(key(2))).toBe(false)
  })
})

describe('clearOldSignIn', () => {
  it("deletes the password sign-in's session and schedule cache, and nothing else", () => {
    const storage = memoryStorage()
    for (const name of [...OLD_SIGN_IN_KEYS, DEVICE_KEY, 'other']) storage.setItem(name, '1')
    clearOldSignIn(storage)
    expect([...storage.data.keys()].sort()).toEqual([DEVICE_KEY, 'other'].sort())
  })
})

describe('newKey', () => {
  it('makes 32 random bytes as 64 lower-case hex characters, new each time', () => {
    const first = newKey()
    expect(first).toMatch(/^[0-9a-f]{64}$/)
    expect(newKey()).not.toBe(first)
  })
})
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run tests/partner/store.test.ts`

Expected: FAIL, because `../../src/partner/store` can't be found.

- [ ] **Step 4: Write `src/partner/store.ts`**

```ts
/**
 * What this browser keeps in localStorage (piece 5a §4.2): the device it's connected with, the key a join is trying,
 * and the last summary, so a return visit shows it at once. Only the device key ever reaches Crewlu Cloud.
 */
export const DEVICE_KEY = 'crewluve.device.v1'
export const PENDING_KEY = 'crewluve.pendingKey.v1'
export const SUMMARY_KEY = 'crewluve.summary.v1'
/** The password sign-in's session and schedule cache, from before piece 5a: deleted on load. */
export const OLD_SIGN_IN_KEYS: readonly string[] = ['crewluve-auth', 'crewluve.schedule.v1']

/** The door's rule for a device key (partner-api.md, "The device key"). */
const KEY_SHAPE = /^[0-9a-f]{64}$/

export interface Device {
  key: string
  partnerId: string
}

/** partner_view's last answer for this browser's device, and when the door last answered at all. */
export interface StoredSummary {
  partnerId: string
  /** updated_at exactly as received, for the next call's p_since; null before the pilot's first summary. */
  updatedAt: string | null
  /** The summary as received; null before the pilot's first. */
  status: unknown
  /** When the door last answered, epoch ms: the footer's "Checked". */
  checkedAt: number
}

export interface PartnerStore {
  device(): Device | null
  /** False when it couldn't be saved, and then the browser isn't connected with it. */
  saveDevice(device: Device): boolean
  pendingKey(): string | null
  /** False when it couldn't be saved, and then it must not be sent. */
  savePendingKey(key: string): boolean
  forgetPendingKey(): void
  summary(): StoredSummary | null
  saveSummary(summary: StoredSummary): void
  /** Disconnected, or sharing ended: the device, the pending key and the summary all go. */
  forget(): void
}

/** The part of localStorage the store uses. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** localStorage, or null where the browser refuses it (blocked site data). */
function pageStorage(): KeyValueStore | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function localPartnerStore(storage: KeyValueStore | null = pageStorage()): PartnerStore {
  const read = (name: string): unknown => {
    try {
      const saved = storage?.getItem(name)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  }
  const write = (name: string, value: unknown): boolean => {
    try {
      if (!storage) return false
      storage.setItem(name, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  }
  const remove = (name: string) => {
    try {
      storage?.removeItem(name)
    } catch {
      // Nothing more can be done; a key left behind only means the next join tries it first.
    }
  }
  return {
    device() {
      const d = read(DEVICE_KEY) as Partial<Device> | null
      return d && typeof d.key === 'string' && KEY_SHAPE.test(d.key) && typeof d.partnerId === 'string' ? { key: d.key, partnerId: d.partnerId } : null
    },
    saveDevice: (device) => write(DEVICE_KEY, device),
    pendingKey() {
      const key = read(PENDING_KEY)
      return typeof key === 'string' && KEY_SHAPE.test(key) ? key : null
    },
    savePendingKey: (key) => write(PENDING_KEY, key),
    forgetPendingKey: () => remove(PENDING_KEY),
    summary() {
      const s = read(SUMMARY_KEY) as Partial<StoredSummary> | null
      if (!s || typeof s.partnerId !== 'string' || typeof s.checkedAt !== 'number') return null
      if (s.updatedAt !== null && typeof s.updatedAt !== 'string') return null
      return { partnerId: s.partnerId, updatedAt: s.updatedAt, status: s.status ?? null, checkedAt: s.checkedAt }
    },
    saveSummary: (summary) => {
      write(SUMMARY_KEY, summary)
    },
    forget() {
      remove(DEVICE_KEY)
      remove(PENDING_KEY)
      remove(SUMMARY_KEY)
    },
  }
}

/** Deletes the password sign-in's leftovers (piece 5a §4.2): its stored session and its schedule cache. */
export function clearOldSignIn(storage: KeyValueStore | null = pageStorage()): void {
  for (const name of OLD_SIGN_IN_KEYS) {
    try {
      storage?.removeItem(name)
    } catch {
      // Blocked storage holds nothing to clear.
    }
  }
}

/** A new device key: 32 random bytes as 64 lower-case hex characters, from the browser's own random source. */
export function newKey(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('')
}
```

- [ ] **Step 5: Run the test, then the type check**

Run: `npx vitest run tests/partner/store.test.ts`. Expected: PASS (7 tests).

Run: `npx tsc --noEmit`. Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd ~/Dev/"Crewluve Website"
git add src/partner/store.ts tests/partner/store.test.ts tests/fixtures/partner.ts
git commit -m "Partner store: this browser's device, pending key and last summary in localStorage (partner links piece 5a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The converter

**Files:**
- Create: `src/partner/convert.ts`, `tests/partner/convert.test.ts`.

The converter turns a summary into the engine's `Schedule`, and `buildLegs` makes the legs from it, as it does for the demo.
- **Turns and nights between duty periods:** `buildLegs` makes them again from the flights. CrewLu wrote them by the same rule (`PartnerStatusGenerator.swift`, `buildTripLegs`).
- **Checked before this plan was written:** all 18 examples come out with CrewLu's own legs, at the same times.
- **Delays:** `startTime` and `endTime` are CrewLu's schedule, and `delayMinutes` moves both ends of that flight, as Crewluve's `TripStateResolver.effectiveStart` and `effectiveEnd` do.

- [ ] **Step 1: Write the failing test, `tests/partner/convert.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { buildLegs } from '../../src/engine/legs'
import { makeSnapshot } from '../../src/engine/snapshot'
import type { StatusKind } from '../../src/engine/status'
import { scheduleFromStored, toSchedule, waitingSchedule } from '../../src/partner/convert'
import { readSummary, type PartnerSummary, type SummaryLeg } from '../../src/partner/summary'
import { example, EXAMPLES, PARTNER_A, PARTNER_B } from '../fixtures/partner'

const BASE_TZ = 'America/Kentucky/Louisville'

/** An example's summary for partner A or B, its schedule and legs, and the snapshot at the example's own moment. */
function engineAt(name: string, who: 'A' | 'B' = 'A') {
  const summary = readSummary(example(name, who), who === 'A' ? PARTNER_A : PARTNER_B)!
  const schedule = toSchedule(summary, summary.lastUpdated)
  const legs = buildLegs(schedule)
  // makeSnapshot, not safeSnapshot: an engine error must fail the test, not fall back to "On duty".
  return { summary, schedule, legs, snap: makeSnapshot(schedule, legs, summary.lastUpdated, BASE_TZ) }
}

describe('toSchedule: the examples through the website engine (piece 5a §11)', () => {
  const KINDS: Array<[string, StatusKind, string]> = [
    ['home', 'home', 'ATL'],
    ['hidden-trip-left-out', 'home', 'ATL'],
    ['display-names', 'home', 'ATL'],
    ['turn', 'turn', 'RFD'],
    ['in-flight', 'inFlight', 'RFD'],
    ['layover', 'layover', 'ONT'],
    ['quick-status-everyone', 'layover', 'ONT'],
    ['quick-status-one-partner', 'layover', 'ONT'],
    ['commuting-home', 'commutingHome', 'SDF'],
  ]

  it('covers every example', () => {
    expect(KINDS.map(([name]) => name).sort()).toEqual([...EXAMPLES].sort())
  })

  it.each(KINDS)('reads %s as %s at %s, for both partners', (name, kind, airport) => {
    for (const who of ['A', 'B'] as const) {
      const { snap } = engineAt(name, who)
      expect(snap.status.kind).toBe(kind)
      expect(snap.status.airport).toBe(airport)
    }
  })

  it("makes CrewLu's own legs again: the same kinds at the same times", () => {
    const { summary, legs } = engineAt('layover')
    const crewlu = summary.legs
      .map((l) => ({ kind: l.tripId ? l.type : 'jumpseat', start: l.start, end: l.end }))
      .sort((a, b) => a.start - b.start)
    expect(legs.map((l) => ({ kind: l.kind, start: l.start, end: l.end }))).toEqual(crewlu)
  })

  it('splits the trip into duty periods at the layover, and takes its length from CrewLu', () => {
    const [trip] = engineAt('layover').schedule.trips
    expect(trip.dutyPeriods.map((dp) => dp.flights.map((f) => `${f.dep}-${f.arr}`))).toEqual([['SDF-RFD', 'RFD-ONT'], ['ONT-SDF']])
    expect(trip).toMatchObject({ id: 'Z55120', start: 1792537200000, end: 1792652700000, days: 2 })
  })

  it('reads the company flights and the jumpseats as the rows did', () => {
    const { schedule } = engineAt('layover')
    expect(schedule.trips[0].dutyPeriods[0].flights[0]).toMatchObject({ airline: '5X', enteredAirline: null, number: '2961', deadhead: false, ground: false })
    expect(schedule.jumpseats.map((j) => [j.dep, j.arr, j.airline, j.enteredAirline, j.number, j.deadhead])).toEqual([
      ['ATL', 'SDF', 'DL', 'DL', '1180', true],
      ['SDF', 'ATL', 'DL', 'DL', '2215', true],
    ])
  })

  it('names the pilot as the partner sees them, and dates the schedule by the summary', () => {
    expect(engineAt('display-names', 'A').snap.name).toBe('Dad')
    expect(engineAt('display-names', 'B').snap.name).toBe('Alex')
    expect(engineAt('home').schedule).toMatchObject({
      pilot: { firstName: 'Alex', base: 'SDF', home: 'ATL', effHome: 'ATL' },
      newestUpdatedAt: 1792425600000,
      empty: false,
    })
  })
})

const SUMMARY: PartnerSummary = { pilotId: 'P', name: 'Alex', home: 'ATL', base: 'SDF', lastUpdated: 0, legs: [], quickStatuses: [] }
const leg = (fields: Partial<SummaryLeg>): SummaryLeg => ({
  id: 'leg', tripId: null, type: 'flight', start: 0, end: 3_600_000, airportCode: null, flightNumber: null, departureAirport: null,
  arrivalAirport: null, tripTotalDays: null, delayMinutes: null, airlineCode: null, label: null, ...fields,
})
const scheduleOf = (...legs: SummaryLeg[]) => toSchedule({ ...SUMMARY, legs }, 0)
const tripFlight = (fields: Partial<SummaryLeg>) =>
  scheduleOf(leg({ tripId: 'T1', departureAirport: 'SDF', arrivalAirport: 'RFD', ...fields })).trips[0].dutyPeriods[0].flights[0]

describe('toSchedule: one leg at a time (piece 5a §6)', () => {
  it("moves both ends of a delayed flight, and keeps CrewLu's times as the schedule", () => {
    expect(tripFlight({ flightNumber: 'UPS2961', delayMinutes: 45 })).toMatchObject({ schedStart: 0, schedEnd: 3_600_000, start: 2_700_000, end: 6_300_000 })
  })

  it('moves an early flight the other way', () => {
    expect(tripFlight({ flightNumber: 'UPS2961', delayMinutes: -20 })).toMatchObject({ schedStart: 0, start: -1_200_000 })
  })

  it.each<[string, string | null, Record<string, unknown>]>([
    ['UPS2961', null, { airline: '5X', enteredAirline: null, number: '2961', deadhead: false, ground: false }],
    ['UPS0081', null, { airline: '5X', number: '81' }],
    ['DL1180', 'DL', { airline: 'DL', enteredAirline: 'DL', number: '1180', deadhead: true }],
    ['5X2961', null, { airline: '5X', number: '2961', deadhead: false }],
    ['UPSCML', null, { airline: null, number: null, deadhead: true }],
    ['GND', null, { airline: null, number: null, ground: true }],
    ['UPSXXXX', null, { airline: null, number: null, deadhead: false }],
  ])('reads the trip flight %s, airline code %s', (flightNumber, airlineCode, expected) => {
    expect(tripFlight({ flightNumber, airlineCode })).toMatchObject(expected)
  })

  it('reads a jumpseat with no airline code as a company flight, as the rows did', () => {
    expect(scheduleOf(leg({ departureAirport: 'ATL', arrivalAirport: 'SDF', flightNumber: '1180' })).jumpseats[0]).toMatchObject({ airline: '5X', number: '1180', deadhead: true })
  })

  it('drops a flight whose airports are not airport codes', () => {
    expect(scheduleOf(leg({ departureAirport: 'Somewhere', arrivalAirport: 'SDF' })).jumpseats).toEqual([])
  })

  it('takes a drive home from where it ends, or from its label', () => {
    const s = scheduleOf(
      leg({ id: 'commute-1', type: 'drive', departureAirport: 'SDF', arrivalAirport: 'LEX', label: 'Driving home' }),
      leg({ id: 'commute-2', type: 'drive', departureAirport: 'SDF', arrivalAirport: 'ATL', label: 'Driving to work' }),
      leg({ id: 'commute-3', type: 'drive', departureAirport: 'ATL', arrivalAirport: 'SDF', label: 'Driving to work' }),
    )
    expect(s.commutes.map((c) => [c.id, c.from, c.to, c.toHome])).toEqual([
      ['commute-1', 'SDF', 'LEX', true],
      ['commute-2', 'SDF', 'ATL', true],
      ['commute-3', 'ATL', 'SDF', false],
    ])
  })

  it('reads reserve, hot standby, training and other events, keeping a free-text place as the location', () => {
    const s = scheduleOf(
      leg({ id: 'me-1', type: 'reserve', label: 'RSV-A', airportCode: 'SDF' }),
      leg({ id: 'me-2', type: 'hotStandby', label: 'Hot Standby', airportCode: 'SDF' }),
      leg({ id: 'te-3', type: 'event', label: 'PC Training', airportCode: 'SDF' }),
      leg({ id: 'me-4', type: 'event', label: 'Driving the truck home', airportCode: 'Training Center' }),
    )
    expect(s.events.map((e) => [e.id, e.kind, e.title, e.airport, e.location])).toEqual([
      ['me-1', 'reserve', 'RSV-A', 'SDF', 'SDF'],
      ['me-2', 'hotStandby', 'Hot Standby', 'SDF', 'SDF'],
      ['te-3', 'training', 'PC Training', 'SDF', 'SDF'],
      ['me-4', 'event', 'Driving the truck home', null, 'Training Center'],
    ])
    // The website's own rule makes an event titled like a drive count as one (legs.ts, DRIVE_TITLE).
    expect(buildLegs(s).find((l) => l.id === 'me-4')).toMatchObject({ kind: 'event', driveLike: true })
  })

  it('drops unknown legs, legs that end as they start, and trip places with no trip', () => {
    const s = scheduleOf(
      leg({ type: 'unknown' }),
      leg({ departureAirport: 'ATL', arrivalAirport: 'SDF', start: 10, end: 10 }),
      leg({ type: 'layover', airportCode: 'ONT' }),
    )
    expect([s.trips, s.jumpseats, s.commutes, s.events]).toEqual([[], [], [], []])
  })

  it('leaves a trip under a day at 0 days, which tripDays counts from the dates', () => {
    expect(scheduleOf(leg({ tripId: 'T1', departureAirport: 'SDF', arrivalAirport: 'RFD', tripTotalDays: 0 })).trips[0].days).toBe(0)
  })
})

describe('waiting, and stored answers (piece 5a §5)', () => {
  it("waits before the pilot's first summary", () => {
    expect(waitingSchedule(5)).toMatchObject({ trips: [], empty: true, fetchedAt: 5, newestUpdatedAt: null })
  })

  it('shows a stored summary, dated when the door last answered', () => {
    const { schedule, summary } = scheduleFromStored({ partnerId: PARTNER_A, updatedAt: 'u1', status: example('layover'), checkedAt: 7 })
    expect(summary?.name).toBe('Alex')
    expect(schedule.fetchedAt).toBe(7)
    expect(schedule.trips).toHaveLength(1)
  })

  it('waits when the stored answer has no summary yet', () => {
    expect(scheduleFromStored({ partnerId: PARTNER_A, updatedAt: null, status: null, checkedAt: 7 })).toEqual({ schedule: waitingSchedule(7), summary: null })
  })

  it('throws for a summary it cannot read', () => {
    expect(() => scheduleFromStored({ partnerId: PARTNER_A, updatedAt: 'u1', status: { schemaVersion: 2 }, checkedAt: 7 })).toThrow()
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/partner/convert.test.ts`

Expected: FAIL, because `../../src/partner/convert` can't be found.

- [ ] **Step 3: Write `src/partner/convert.ts`**

```ts
import { enteredAirline, normalizeFlightNumber, toIata } from '../engine/normalize'
import type { Commute, DutyEvent, DutyEventKind, DutyPeriod, Move, Schedule, Trip } from '../engine/types'
import type { StoredSummary } from './store'
import { readSummary, type PartnerSummary, type SummaryLeg } from './summary'

const MINUTE = 60_000
/** "UPS2961", "DL1180", "5X2961" or "2961": an airline's code, if any, then the number. */
const FLIGHT_NUMBER = /^([A-Z]{3}|[A-Z][A-Z0-9]|[0-9][A-Z])?(\d+)$/
/** Where CrewLu puts the time between two of a trip's duty periods; a turn is the time inside one. */
const BETWEEN_DUTY_PERIODS: ReadonlySet<string> = new Set(['layover', 'home', 'base'])
const EVENT_TITLES: Record<DutyEventKind, string> = { reserve: 'Reserve', hotStandby: 'Hot Standby', training: 'Training', event: 'Manual Event' }

/**
 * One summary as the Schedule the website's engine reads (piece 5a §6), so the live page and the demo share one
 * engine: buildLegs makes the turns and the nights between duty periods again from the flights, by the rules CrewLu
 * used to write them (PartnerStatusGenerator.swift, buildTripLegs).
 */
export function toSchedule(summary: PartnerSummary, fetchedAt: number): Schedule {
  const base = toIata(summary.base)
  const home = toIata(summary.home)
  const effHome = home ?? base
  const byTrip = new Map<string, SummaryLeg[]>()
  const jumpseats: Move[] = []
  const commutes: Commute[] = []
  const events: DutyEvent[] = []
  for (const leg of summary.legs) {
    if (leg.end <= leg.start) continue
    if (leg.tripId && (leg.type === 'flight' || leg.type === 'turn' || BETWEEN_DUTY_PERIODS.has(leg.type))) {
      byTrip.set(leg.tripId, [...(byTrip.get(leg.tripId) ?? []), leg])
    } else if (leg.type === 'flight') {
      const move = toMove(leg, null)
      if (move) jumpseats.push(move)
    } else if (leg.type === 'drive') {
      const commute = toCommute(leg, effHome)
      if (commute) commutes.push(commute)
    } else if (leg.type === 'reserve' || leg.type === 'hotStandby' || leg.type === 'event') {
      events.push(toEvent(leg, leg.type))
    }
  }
  const trips = [...byTrip].map(([id, legs]) => toTrip(id, legs)).filter((t): t is Trip => t != null).sort((a, b) => a.start - b.start)
  return {
    pilot: { firstName: summary.name, base, home, effHome },
    trips,
    jumpseats,
    commutes,
    events,
    fetchedAt,
    newestUpdatedAt: summary.lastUpdated,
    empty: false,
  }
}

/** Before the pilot's first summary: nothing to show, which the page tells as waiting (piece 5a §5). */
export function waitingSchedule(fetchedAt: number): Schedule {
  return {
    pilot: { firstName: null, base: null, home: null, effHome: null },
    trips: [],
    jumpseats: [],
    commutes: [],
    events: [],
    fetchedAt,
    newestUpdatedAt: null,
    empty: true,
  }
}

/** What a stored answer shows: the pilot's summary, or waiting before their first. Throws for one this site can't read. */
export function scheduleFromStored(stored: StoredSummary): { schedule: Schedule; summary: PartnerSummary | null } {
  if (stored.status == null) return { schedule: waitingSchedule(stored.checkedAt), summary: null }
  const summary = readSummary(stored.status, stored.partnerId)
  if (!summary) throw new Error('This summary could not be read')
  return { schedule: toSchedule(summary, stored.checkedAt), summary }
}

/**
 * A trip's flights, in duty periods split wherever CrewLu put a layover, home or base between two of them. Each duty
 * period starts with its first flight, so no report leg is made (as in Crewluve). The trip runs from its first leg's
 * start to its last leg's end; its length is CrewLu's, and tripDays counts one under a day (0) from the dates.
 */
function toTrip(id: string, legs: SummaryLeg[]): Trip | null {
  const flights = legs.filter((l) => l.type === 'flight').sort((a, b) => a.start - b.start)
  const nights = legs.filter((l) => BETWEEN_DUTY_PERIODS.has(l.type))
  const groups: SummaryLeg[][] = []
  flights.forEach((flight, i) => {
    const prev = flights[i - 1]
    const night = prev != null && nights.some((n) => n.start < flight.start && n.end > prev.end)
    if (!prev || night) groups.push([flight])
    else groups[groups.length - 1].push(flight)
  })
  const dutyPeriods: DutyPeriod[] = []
  for (const group of groups) {
    const moves = group.map((l) => toMove(l, id)).filter((m): m is Move => m != null)
    if (moves.length === 0) continue
    dutyPeriods.push({ id: `${id}|dp|${dutyPeriods.length}`, tripId: id, start: moves[0].start, end: moves[moves.length - 1].end, flights: moves })
  }
  if (dutyPeriods.length === 0) return null
  const moves = dutyPeriods.flatMap((dp) => dp.flights)
  return {
    id,
    start: Math.min(...legs.map((l) => l.start), ...moves.map((m) => m.start)),
    end: Math.max(...legs.map((l) => l.end), ...moves.map((m) => m.end)),
    days: Math.max(0, ...legs.map((l) => l.tripTotalDays ?? 0)),
    dutyPeriods,
  }
}

/**
 * A flight leg as a Move. Its delay moves both ends, as Crewluve moves them (TripStateResolver.effectiveStart and
 * effectiveEnd), and the times CrewLu wrote are the schedule. CrewLu writes a company flight's number as "UPS" and the
 * digits, and an airline's as its code and the digits (formatFlightNumber, displayFlightNumber).
 */
function toMove(leg: SummaryLeg, tripId: string | null): Move | null {
  const dep = toIata(leg.departureAirport)
  const arr = toIata(leg.arrivalAirport)
  if (!dep || !arr) return null
  const shift = (leg.delayMinutes ?? 0) * MINUTE
  const raw = (leg.flightNumber ?? '').toUpperCase()
  const entered = enteredAirline(leg.airlineCode)
  const match = FLIGHT_NUMBER.exec(entered && raw.startsWith(entered) ? raw.slice(entered.length) : raw)
  const prefix = match?.[1] ?? null
  return {
    id: leg.id,
    tripId,
    dep,
    arr,
    start: leg.start + shift,
    end: leg.end + shift,
    schedStart: leg.start,
    schedEnd: leg.end,
    // An all-digit number with no airline is a company flight, as the rows' rule has it (resolveAirline).
    airline: entered ?? (match ? (prefix == null || prefix === 'UPS' ? '5X' : prefix) : null),
    enteredAirline: entered,
    number: match ? normalizeFlightNumber(match[2]) : null,
    // A jumpseat always rides; in a trip, a commercial deadhead has an airline code, and a company one may say CML.
    deadhead: tripId == null || entered != null || raw.endsWith('CML'),
    ground: raw === 'GND',
  }
}

/** A drive, home when it ends at home or CrewLu called it the drive home: the rows' rule (normalize.ts). */
function toCommute(leg: SummaryLeg, effHome: string | null): Commute | null {
  const from = toIata(leg.departureAirport)
  const to = toIata(leg.arrivalAirport)
  if (!from || !to) return null
  const toHome = to === effHome || leg.label === 'Driving home'
  return { id: leg.id, from, to, toHome, start: leg.start, end: leg.end, schedEnd: leg.end, sourceTripId: null }
}

/** A reserve, hot standby or event. CrewLu sends training as an event whose id starts te-. */
function toEvent(leg: SummaryLeg, type: 'reserve' | 'hotStandby' | 'event'): DutyEvent {
  const kind: DutyEventKind = type === 'event' && leg.id.startsWith('te-') ? 'training' : type
  return {
    id: leg.id,
    kind,
    title: leg.label ?? EVENT_TITLES[kind],
    airport: toIata(leg.airportCode),
    location: leg.airportCode,
    start: leg.start,
    end: leg.end,
  }
}
```

- [ ] **Step 4: Run the test, then the type check**

Run: `npx vitest run tests/partner/convert.test.ts`. Expected: PASS (33 tests).

Run: `npx tsc --noEmit`. Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd ~/Dev/"Crewluve Website"
git add src/partner/convert.ts tests/partner/convert.test.ts
git commit -m "Partner summary to the engine's Schedule: CrewLu's legs again, delays as Crewluve applies them (partner links piece 5a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Links, this browser's label, and the messages

**Files:**
- Create:
  - `src/partner/link.ts`, `src/partner/label.ts`, `src/partner/messages.ts`;
  - `tests/partner/link.test.ts`, `tests/partner/label.test.ts`, `tests/partner/messages.test.ts`.

- [ ] **Step 1: Write the failing tests**

`tests/partner/link.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CODE_ALPHABET, codeFrom, linkFromHash, linkFromText } from '../../src/partner/link'

describe('linkFromHash (piece 5a §4.1)', () => {
  it('reads an invite and a code', () => {
    expect(linkFromHash('#t=0123456789abcdef0123456789abcdef')).toEqual({ kind: 'invite', invite: '0123456789abcdef0123456789abcdef' })
    expect(linkFromHash('#c=AB2C3D')).toEqual({ kind: 'code', code: 'AB2C3D' })
  })

  it('reads nothing else, such as the schedule page\'s #schedule', () => {
    for (const hash of ['', '#', '#schedule', '#t=', '#c=', '#x=1', 't=abc']) expect(linkFromHash(hash)).toBeNull()
  })
})

describe('linkFromText', () => {
  it("finds the link in CrewLu's whole message", () => {
    const message = 'Tap this link to see my status in Crewluve.\nhttps://crewluve.crewlu.net/join#t=0123456789abcdef0123456789abcdef'
    expect(linkFromText(message)).toEqual({ kind: 'invite', invite: '0123456789abcdef0123456789abcdef' })
  })

  it('takes the link alone, a code link, and a link without https', () => {
    expect(linkFromText('  https://crewluve.crewlu.net/join#t=abc  ')).toEqual({ kind: 'invite', invite: 'abc' })
    expect(linkFromText('https://crewluve.crewlu.net/join#c=AB2C3D')).toEqual({ kind: 'code', code: 'AB2C3D' })
    expect(linkFromText('crewluve.crewlu.net/join#t=abc')).toEqual({ kind: 'invite', invite: 'abc' })
  })

  it('finds nothing in text that is not an invite link', () => {
    for (const text of ['', 'hello', 'https://crewluve.crewlu.net/', 'https://crewluve.crewlu.net/join', 'https://example.com/join#t=abc']) {
      expect(linkFromText(text)).toBeNull()
    }
  })
})

describe('codeFrom', () => {
  it("keeps the code's own letters, in upper case, six at most", () => {
    expect(codeFrom('ab2c')).toBe('AB2C')
    expect(codeFrom('ab-2c 3d')).toBe('AB2C3D')
    expect(codeFrom('AB2C3D9X')).toBe('AB2C3D')
    expect(codeFrom('O0I1L')).toBe('')
  })

  it("uses the door's alphabet, which leaves out 0, 1, I, L and O", () => {
    expect(CODE_ALPHABET).toBe('23456789ABCDEFGHJKMNPQRSTUVWXYZ')
  })
})
```

`tests/partner/label.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { browserLabel } from '../../src/partner/label'

// Real user agents, as each browser sends them.
const UA: Record<string, string> = {
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.81 Mobile Safari/537.36',
  samsungAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
  safariIPhone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  chromeIPhone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1',
  safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  chromeMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  edgeWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
  firefoxWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
  chromeOS: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
}

describe('browserLabel (piece 5a P5-6)', () => {
  it.each([
    ['chromeAndroid', 0, 'Chrome on Android'],
    ['samsungAndroid', 0, 'Samsung Internet on Android'],
    ['firefoxAndroid', 0, 'Firefox on Android'],
    ['safariIPhone', 5, 'Safari on iPhone'],
    ['chromeIPhone', 5, 'Chrome on iPhone'],
    // An iPad asks for the desktop site as a Mac, but has a touch screen.
    ['safariMac', 5, 'Safari on iPad'],
    ['safariMac', 0, 'Safari on Mac'],
    ['chromeMac', 0, 'Chrome on Mac'],
    ['edgeWindows', 0, 'Edge on Windows'],
    ['firefoxWindows', 0, 'Firefox on Windows'],
    ['firefoxLinux', 0, 'Firefox on Linux'],
    ['chromeOS', 0, 'Chrome on ChromeOS'],
  ])('names %s, with %i touch points, "%s"', (name, touchPoints, label) => {
    expect(browserLabel(UA[name], touchPoints)).toBe(label)
  })

  it('names one part alone, or nothing, when the rest is unknown', () => {
    expect(browserLabel('Mozilla/5.0 (Nintendo Switch) Safari/605.1.15')).toBe('Safari')
    expect(browserLabel('Mozilla/5.0 (Windows NT 10.0)')).toBe('Windows')
    expect(browserLabel('curl/8.4.0')).toBe('')
  })
})
```

`tests/partner/messages.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { PartnerLink } from '../../src/partner/link'
import { CONNECTED_NOTE, COULDNT_CONNECT, joinMessage, NOT_AN_INVITE_LINK, type JoinMessage } from '../../src/partner/messages'

const INVITE: PartnerLink = { kind: 'invite', invite: 'abc' }
const CODE: PartnerLink = { kind: 'code', code: 'AB2C3D' }

describe("joinMessage: Crewluve's words (piece 5a §4.4)", () => {
  it('says a dead invite link is dead, and names the pilot the browser still follows', () => {
    expect(joinMessage('sharing_ended', INVITE, null)).toEqual({
      title: 'Invite Link Not Working', text: "This invite link doesn't work anymore. Ask your pilot to send it again.",
    })
    expect(joinMessage('sharing_ended', INVITE, 'Dad')).toEqual({
      title: 'Invite Link Not Working', text: "This invite link doesn't work anymore. You're still connected to Dad.",
    })
  })

  it('says a dead code is dead', () => {
    expect(joinMessage('sharing_ended', CODE, 'Dad')).toEqual({
      title: 'Code Not Working', text: "That code didn't work. Codes last 10 minutes and work once. Make a new one on your other device.",
    })
  })

  it.each<[string | null, JoinMessage]>([
    ['too_many_devices', { title: 'Too Many Devices', text: 'This invite already has 10 devices. Ask your pilot to remove one in CrewLu, then try again.' }],
    ['try_later', { title: 'Too Many Tries', text: 'Too many tries. Wait a minute, then try again.' }],
    ['invalid_input', NOT_AN_INVITE_LINK],
    ['key_in_use', COULDNT_CONNECT],
    ['something_new', COULDNT_CONNECT],
    [null, COULDNT_CONNECT],
  ])('answers %s the same for a link and a code', (refusal, message) => {
    expect(joinMessage(refusal, INVITE, null)).toEqual(message)
    expect(joinMessage(refusal, CODE, null)).toEqual(message)
  })

  it('has the words for text with no link, for no answer, and for a new connection', () => {
    expect(NOT_AN_INVITE_LINK).toEqual({ title: 'Not an Invite Link', text: "That doesn't look like an invite link." })
    expect(COULDNT_CONNECT).toEqual({ title: "Couldn't Connect", text: "Couldn't connect. Check your connection and try again." })
    expect(CONNECTED_NOTE).toBe('Connected on this browser. Add it to your Home Screen to keep it handy.')
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/partner/link.test.ts tests/partner/label.test.ts tests/partner/messages.test.ts`

Expected: FAIL, because the three modules can't be found.

- [ ] **Step 3: Write `src/partner/link.ts`**

```ts
/** What an invite link or a hand-off code asks for (partner-api.md, "Links"). */
export type PartnerLink = { kind: 'invite'; invite: string } | { kind: 'code'; code: string }

/** The letters a hand-off code is made of: no 0, 1, I, L or O (private.new_code). */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const CODE_LENGTH = 6

/** The link in an address's fragment: #t=<invite> joins, #c=<code> redeems. Null for any other fragment. */
export function linkFromHash(hash: string): PartnerLink | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const invite = params.get('t')?.trim()
  if (invite) return { kind: 'invite', invite }
  const code = params.get('c')?.trim()
  if (code) return { kind: 'code', code }
  return null
}

/** The invite link in pasted text, which may be CrewLu's whole message ("Tap this link to see my status…"). */
export function linkFromText(text: string): PartnerLink | null {
  const found = /(?:https?:\/\/)?crewluve\.crewlu\.net\/join\/?(#\S+)/i.exec(text)
  return found ? linkFromHash(found[1]) : null
}

/** What the code boxes keep of what was typed or pasted: the code's own letters, in upper case, six at most. */
export function codeFrom(typed: string): string {
  return [...typed.toUpperCase()].filter((c) => CODE_ALPHABET.includes(c)).join('').slice(0, CODE_LENGTH)
}
```

- [ ] **Step 4: Write `src/partner/label.ts`**

```ts
/**
 * This browser's name in the pilot's list (piece 5a P5-6): "Chrome on Android", "Safari on iPhone". One part alone
 * when only one is known, and empty when neither is: the door then writes "Web browser". The order matters: Edge and
 * Samsung Internet also say Chrome, Chrome also says Safari, and an iPad asking for the desktop site says Macintosh.
 */
export function browserLabel(userAgent: string, maxTouchPoints = 0): string {
  const browser = /\bEdg(e|A|iOS)?\//.test(userAgent) ? 'Edge'
    : /\bSamsungBrowser\//.test(userAgent) ? 'Samsung Internet'
      : /\b(Firefox|FxiOS)\//.test(userAgent) ? 'Firefox'
        : /\b(Chrome|CriOS)\//.test(userAgent) ? 'Chrome'
          : /\bSafari\//.test(userAgent) ? 'Safari'
            : null
  const platform = /\biPhone\b/.test(userAgent) ? 'iPhone'
    : /\biPad\b/.test(userAgent) || (/\bMacintosh\b/.test(userAgent) && maxTouchPoints > 1) ? 'iPad'
      : /\bAndroid\b/.test(userAgent) ? 'Android'
        : /\bCrOS\b/.test(userAgent) ? 'ChromeOS'
          : /\bMacintosh\b/.test(userAgent) ? 'Mac'
            : /\bWindows\b/.test(userAgent) ? 'Windows'
              : /\bLinux\b/.test(userAgent) ? 'Linux'
                : null
  if (browser && platform) return `${browser} on ${platform}`
  return browser ?? platform ?? ''
}
```

- [ ] **Step 5: Write `src/partner/messages.ts`**

```ts
import type { PartnerLink } from './link'

/** What a partner is told when a link or code didn't connect: Crewluve's words (Models/JoinMessage.swift). */
export interface JoinMessage {
  title: string
  text: string
}

export const COULDNT_CONNECT: JoinMessage = { title: "Couldn't Connect", text: "Couldn't connect. Check your connection and try again." }
export const NOT_AN_INVITE_LINK: JoinMessage = { title: 'Not an Invite Link', text: "That doesn't look like an invite link." }

/** The line above the status once this browser has connected (piece 5a §4.3, step 7). */
export const CONNECTED_NOTE = 'Connected on this browser. Add it to your Home Screen to keep it handy.'

/**
 * The message for the door's refusal of `link` (piece 5a §4.4), or for no usable answer (null). `stillConnectedTo`
 * is the pilot this browser still follows, as this partner sees them, if it follows one.
 */
export function joinMessage(refusal: string | null, link: PartnerLink, stillConnectedTo: string | null): JoinMessage {
  switch (refusal) {
    case 'sharing_ended':
      if (link.kind === 'code') {
        return { title: 'Code Not Working', text: "That code didn't work. Codes last 10 minutes and work once. Make a new one on your other device." }
      }
      return {
        title: 'Invite Link Not Working',
        text: stillConnectedTo
          ? `This invite link doesn't work anymore. You're still connected to ${stillConnectedTo}.`
          : "This invite link doesn't work anymore. Ask your pilot to send it again.",
      }
    case 'too_many_devices':
      return { title: 'Too Many Devices', text: 'This invite already has 10 devices. Ask your pilot to remove one in CrewLu, then try again.' }
    case 'try_later':
      return { title: 'Too Many Tries', text: 'Too many tries. Wait a minute, then try again.' }
    case 'invalid_input':
      return NOT_AN_INVITE_LINK
    default:
      return COULDNT_CONNECT
  }
}
```

- [ ] **Step 6: Run the tests, then the type check**

Run: `npx vitest run tests/partner/link.test.ts tests/partner/label.test.ts tests/partner/messages.test.ts`

Expected: PASS (7, 13 and 9 tests).

Run: `npx tsc --noEmit`. Expected: no output.

- [ ] **Step 7: Commit**

```bash
cd ~/Dev/"Crewluve Website"
git add src/partner/link.ts src/partner/label.ts src/partner/messages.ts tests/partner/link.test.ts tests/partner/label.test.ts tests/partner/messages.test.ts
git commit -m "Invite links and codes, this browser's name for the pilot's list, and Crewluve's join messages (partner links piece 5a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The door guard and the door

**Files:**
- Create:
  - `src/partner/doorGuard.ts`, `src/partner/door.ts`;
  - `tests/partner/doorGuard.test.ts`, `tests/partner/door.test.ts`.
- Modify:
  - `tests/fixtures/sourceScan.ts`: `src/partner/door.ts` may POST;
  - `tests/data/readOnlyScan.test.ts`: one case for it.

**Why the source rules change:**
- The door module POSTs to Crewlu Cloud with a body, which the source rules refuse everywhere but `src/supabase.ts`.
- From this task, `src/partner/door.ts` may POST too, because every call it makes goes through the door guard.
- Task 11 removes `src/supabase.ts` and its exception.

- [ ] **Step 1: Write the failing guard test, `tests/partner/doorGuard.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest'
import { SUPABASE_URL } from '../../src/cloud'
import { DOOR_RPCS, DoorGuardError, doorFetch } from '../../src/partner/doorGuard'

const HOST = SUPABASE_URL

function guard() {
  const response = new Response('{}', { status: 200 })
  const base = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response)
  return { base, response, guarded: doorFetch(base as unknown as typeof fetch) }
}

/** Everything but a POST to one of the four, by the way it would reach past the partner door. */
const BLOCKED: Array<[string, string]> = [
  // one of the four, but not as a POST
  ['GET', '/rest/v1/rpc/partner_view'],
  ['PATCH', '/rest/v1/rpc/partner_join'],
  // every other RPC, the pilot's own included
  ['POST', '/rest/v1/rpc/partner_create'],
  ['POST', '/rest/v1/rpc/partner_handoff_create'],
  ['POST', '/rest/v1/rpc/partner_set_push'],
  ['POST', '/rest/v1/rpc/set_partner_status'],
  ['POST', '/rest/v1/rpc/delete_everything'],
  // tables, sign-in and the other services
  ['GET', '/rest/v1/trips?select=id'],
  ['POST', '/rest/v1/partner_devices'],
  ['GET', '/auth/v1/user'],
  ['POST', '/auth/v1/token?grant_type=password'],
  ['POST', '/functions/v1/partner-push'],
  ['GET', '/storage/v1/object/public/bucket/file.png'],
  // close to one of the four
  ['POST', '/rest/v1/rpc/partner_view/'],
  ['POST', '/rest/v1/rpc/partner_views'],
  ['POST', '/rest/v1/rpc/PARTNER_VIEW'],
  ['POST', '/rest/v1/rpc/partner_view?select=status'],
  ['POST', '/rest/v1/rpc/../rpc/partner_create'], // dot segments are resolved before the path is checked
  ['POST', '/rest/v1/rpc/%2e%2e/partner_devices'],
  ['POST', '/'],
]

describe('doorFetch (piece 5a §9)', () => {
  it('has exactly the four partner RPCs', () => {
    expect([...DOOR_RPCS].sort()).toEqual(['partner_handoff_redeem', 'partner_join', 'partner_leave', 'partner_view'])
  })

  it.each([...DOOR_RPCS])('lets a POST to %s through, untouched', async (name) => {
    const { base, response, guarded } = guard()
    const init = { method: 'POST', body: '{}' }
    expect(await guarded(`${HOST}/rest/v1/rpc/${name}`, init)).toBe(response)
    expect(base).toHaveBeenCalledWith(`${HOST}/rest/v1/rpc/${name}`, init)
  })

  it('takes post in lower case, as fetch does', async () => {
    const { base, guarded } = guard()
    await guarded(`${HOST}/rest/v1/rpc/partner_view`, { method: 'post' })
    expect(base).toHaveBeenCalledTimes(1)
  })

  it.each(BLOCKED)('refuses %s %s without sending it', async (method, path) => {
    const { base, guarded } = guard()
    const err = await guarded(`${HOST}${path}`, { method }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(DoorGuardError)
    expect(base).not.toHaveBeenCalled()
  })

  it('refuses a request with no method, which is a GET', async () => {
    const { base, guarded } = guard()
    await expect(guarded(`${HOST}/rest/v1/rpc/partner_view`)).rejects.toThrow(DoorGuardError)
    expect(base).not.toHaveBeenCalled()
  })

  it('reads a URL object and a Request, and lets the init method win, as fetch does', async () => {
    const { base, guarded } = guard()
    await guarded(new URL(`${HOST}/rest/v1/rpc/partner_view`), { method: 'POST' })
    await guarded(new Request(`${HOST}/rest/v1/rpc/partner_view`, { method: 'POST', body: '{}' }))
    await expect(guarded(new Request(`${HOST}/rest/v1/rpc/partner_view`, { method: 'POST', body: '{}' }), { method: 'GET' })).rejects.toThrow(DoorGuardError)
    expect(base).toHaveBeenCalledTimes(2)
  })

  it('refuses every other host, and a URL it cannot read', async () => {
    const { base, guarded } = guard()
    await expect(guarded('https://elsewhere.example.com/rest/v1/rpc/partner_view', { method: 'POST' })).rejects.toThrow(
      'Only the partner door: blocked POST https://elsewhere.example.com/rest/v1/rpc/partner_view',
    )
    await expect(guarded(`${HOST.replace('https:', 'http:')}/rest/v1/rpc/partner_view`, { method: 'POST' })).rejects.toThrow(DoorGuardError)
    await expect(guarded('http://[bad', { method: 'POST' })).rejects.toThrow(DoorGuardError)
    expect(base).not.toHaveBeenCalled()
  })

  it('names what it blocked without the query string, where a key could be', async () => {
    const { guarded } = guard()
    const err = (await guarded(`${HOST}/rest/v1/rpc/partner_view?p_key=secret`, { method: 'POST' }).catch((e: unknown) => e)) as Error
    expect(err.message).toBe('Only the partner door: blocked POST /rest/v1/rpc/partner_view (with a query string)')
  })

  it('refuses with a rejected promise, never a throw', async () => {
    const { guarded } = guard()
    let promise: Promise<Response> | undefined
    expect(() => {
      promise = guarded(`${HOST}/rest/v1/trips`, { method: 'GET' })
    }).not.toThrow()
    await expect(promise).rejects.toBeInstanceOf(DoorGuardError)
  })

  it('passes a failure of the real fetch through untouched', async () => {
    const down = new TypeError('Failed to fetch')
    const guarded = doorFetch((async () => {
      throw down
    }) as unknown as typeof fetch)
    await expect(guarded(`${HOST}/rest/v1/rpc/partner_view`, { method: 'POST' })).rejects.toBe(down)
  })
})
```

- [ ] **Step 2: Write the failing door test, `tests/partner/door.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../../src/cloud'
import { DoorUnavailable, isRefused, makeDoor } from '../../src/partner/door'
import { key, PARTNER_A } from '../fixtures/partner'

const AT = '2026-10-26T17:36:00.123+00:00'

/** A door over a fake fetch that answers `body` with `status`, and keeps what was sent. */
function doorAnswering(body: unknown, status = 200) {
  const send = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify(body), { status }))
  return { send, door: makeDoor(send as unknown as typeof fetch) }
}

/** The first request a door sent: where, how, and its body as an object. */
function sent(send: ReturnType<typeof doorAnswering>['send']) {
  const [url, init] = send.mock.calls[0]
  return { url, method: init?.method, headers: init?.headers, body: JSON.parse(String(init?.body)) }
}

describe('the partner door (piece 5a §9)', () => {
  it('joins as a web device, with the publishable key', async () => {
    const { send, door } = doorAnswering({ device_id: 'd1', partner_id: PARTNER_A })
    expect(await door.join('invite-a', key(1), 'Chrome on Mac')).toEqual({ deviceId: 'd1', partnerId: PARTNER_A })
    expect(sent(send)).toEqual({
      url: `${SUPABASE_URL}/rest/v1/rpc/partner_join`,
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: { p_invite: 'invite-a', p_device_key: key(1), p_kind: 'web', p_label: 'Chrome on Mac' },
    })
  })

  it('redeems a code the same way', async () => {
    const { send, door } = doorAnswering({ device_id: 'd1', partner_id: PARTNER_A })
    await door.redeem('AB2C3D', key(1), '')
    expect(sent(send)).toMatchObject({
      url: `${SUPABASE_URL}/rest/v1/rpc/partner_handoff_redeem`,
      body: { p_token: 'AB2C3D', p_device_key: key(1), p_kind: 'web', p_label: '' },
    })
  })

  it("hands the door's refusals back as answers", async () => {
    const answer = await doorAnswering({ error: 'key_in_use' }).door.join('invite-a', key(1), '')
    expect(answer).toEqual({ error: 'key_in_use' })
    expect(isRefused(answer)).toBe(true)
  })

  it('asks for everything with no since, and only for a change with one', async () => {
    const first = doorAnswering({ partner_id: PARTNER_A, updated_at: AT, status: { schemaVersion: 1 } })
    expect(await first.door.view(key(1), null)).toEqual({ partnerId: PARTNER_A, updatedAt: AT, unchanged: false, status: { schemaVersion: 1 } })
    expect(sent(first.send).body).toEqual({ p_key: key(1) })
    const again = doorAnswering({ partner_id: PARTNER_A, updated_at: AT, unchanged: true })
    expect(await again.door.view(key(1), AT)).toEqual({ partnerId: PARTNER_A, updatedAt: AT, unchanged: true })
    expect(sent(again.send).body).toEqual({ p_key: key(1), p_since: AT })
  })

  it("reads the answer from before the pilot's first summary", async () => {
    const { door } = doorAnswering({ partner_id: PARTNER_A, updated_at: null, status: null })
    expect(await door.view(key(1), null)).toEqual({ partnerId: PARTNER_A, updatedAt: null, unchanged: false, status: null })
  })

  it('leaves', async () => {
    const { send, door } = doorAnswering({ ok: true })
    await door.leave(key(1))
    expect(sent(send)).toMatchObject({ url: `${SUPABASE_URL}/rest/v1/rpc/partner_leave`, body: { p_key: key(1) } })
  })

  it('throws DoorUnavailable for an HTTP error, or an answer it cannot read', async () => {
    await expect(doorAnswering({ message: 'boom' }, 500).door.view(key(1), null)).rejects.toThrow(DoorUnavailable)
    await expect(doorAnswering([1, 2]).door.view(key(1), null)).rejects.toThrow(DoorUnavailable)
    await expect(doorAnswering({ updated_at: null }).door.view(key(1), null)).rejects.toThrow(DoorUnavailable)
    await expect(doorAnswering({ ok: true }).door.join('invite-a', key(1), '')).rejects.toThrow(DoorUnavailable)
  })

  it('passes no answer at all through, as fetch failed', async () => {
    const door = makeDoor((async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch)
    await expect(door.view(key(1), null)).rejects.toThrow('Failed to fetch')
  })
})
```

- [ ] **Step 3: Run them to see them fail**

Run: `npx vitest run tests/partner/doorGuard.test.ts tests/partner/door.test.ts`

Expected: FAIL, because the two modules can't be found.

- [ ] **Step 4: Write `src/partner/doorGuard.ts`**

```ts
import { SUPABASE_URL } from '../cloud'

/**
 * The partner door guard (piece 5a §9), enforced where no calling code can get around it: src/partner/door.ts sends
 * every Crewlu Cloud request through it. Only POSTs to the four partner RPCs get through, on the Crewlu Cloud
 * project's own host and with no query string. Everything else is refused before it leaves the page: any other RPC,
 * table reads, /auth/v1/, /functions/, /storage/, other methods and other hosts. The weather and the airport list don't
 * come through here.
 */
const ORIGIN = new URL(SUPABASE_URL).origin
const RPC_PATH = '/rest/v1/rpc/'
export const DOOR_RPCS: ReadonlySet<string> = new Set(['partner_join', 'partner_handoff_redeem', 'partner_view', 'partner_leave'])

export class DoorGuardError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DoorGuardError'
  }
}

interface Requested {
  method: string
  /** null when the address can't be read at all. */
  url: URL | null
}

/** What a fetch() call would send, however it was given: a string, a URL, or a Request, with an init that can override its method. */
function requested(input: RequestInfo | URL, init: RequestInit | undefined): Requested {
  const shape = typeof input === 'object' && input !== null ? (input as { href?: unknown; url?: unknown; method?: unknown }) : {}
  const address = typeof input === 'string' ? input : typeof shape.href === 'string' ? shape.href : typeof shape.url === 'string' ? shape.url : String(input)
  const method = init?.method ?? (typeof shape.method === 'string' ? shape.method : 'GET')
  let url: URL | null = null
  try {
    // The URL parser resolves dot segments and %2e, so /rest/v1/rpc/../../auth/v1/token is judged as /auth/v1/token.
    url = new URL(address, 'https://unresolved.invalid')
  } catch {
    // Refused below: a request that can't be read can't be shown to be one of the four.
  }
  return { method: String(method).toUpperCase(), url }
}

function allowed(method: string, url: URL): boolean {
  if (url.origin !== ORIGIN || method !== 'POST' || url.search !== '') return false
  return url.pathname.startsWith(RPC_PATH) && DOOR_RPCS.has(url.pathname.slice(RPC_PATH.length))
}

/** The reason, without the query string: keys don't belong in a log. */
function refusal(method: string, url: URL | null): string {
  if (!url) return `Only the partner door: blocked ${method} (unreadable URL)`
  const where = url.origin === ORIGIN ? url.pathname : `${url.origin}${url.pathname}`
  return `Only the partner door: blocked ${method} ${where}${url.search ? ' (with a query string)' : ''}`
}

/** Wraps a fetch so that only the four partner RPCs get through; anything else rejects with a DoorGuardError and is never sent. */
export function doorFetch(base: typeof fetch): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const { method, url } = requested(input, init)
    if (!url || !allowed(method, url)) throw new DoorGuardError(refusal(method, url))
    return base(input, init)
  }
}
```

- [ ] **Step 5: Write `src/partner/door.ts`**

```ts
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../cloud'
import { doorFetch } from './doorGuard'

/** The door's own failures, which it answers with HTTP 200 (partner-api.md, "Answers"). */
export interface Refused {
  error: string
}

export interface Joined {
  deviceId: string
  partnerId: string
}

/** partner_view's answer: the summary (null before the pilot's first), or that it's unchanged since `p_since`. */
export type Viewed =
  | { partnerId: string; updatedAt: string | null; unchanged: false; status: unknown }
  | { partnerId: string; updatedAt: string | null; unchanged: true }

/** The four partner RPCs the website calls (piece 5a §9). It redeems hand-off codes but never makes them (P5-4). */
export interface PartnerDoor {
  join(invite: string, key: string, label: string): Promise<Joined | Refused>
  redeem(code: string, key: string, label: string): Promise<Joined | Refused>
  view(key: string, since: string | null): Promise<Viewed | Refused>
  /** The door always answers {"ok": true}; this rejects only when there's no answer. */
  leave(key: string): Promise<void>
}

/** An answer that never came, or that this site can't read. */
export class DoorUnavailable extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DoorUnavailable'
  }
}

export const isRefused = (answer: object): answer is Refused => typeof (answer as { error?: unknown }).error === 'string'

/** How long a call may take before it counts as no answer, so "Connecting…" never waits for good. */
const TIMEOUT_MS = 20_000

/**
 * The partner door over `send` (~/Dev/Duty/supabase/partner-api.md, "Partner RPCs"), with the publishable key alone.
 * This is the only module that talks to Crewlu Cloud, and every call goes through the door guard.
 */
export function makeDoor(send: typeof fetch): PartnerDoor {
  const guarded = doorFetch(send)

  async function call(name: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await guarded(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Safari before 16 has no AbortSignal.timeout: those calls just wait as long as the browser lets them.
      signal: AbortSignal.timeout?.(TIMEOUT_MS),
    })
    if (!response.ok) throw new DoorUnavailable(`${name} answered HTTP ${response.status}`)
    const answer: unknown = await response.json().catch(() => null)
    if (typeof answer !== 'object' || answer === null || Array.isArray(answer)) throw new DoorUnavailable(`${name} answered with no object`)
    return answer as Record<string, unknown>
  }

  async function joined(name: string, body: Record<string, unknown>): Promise<Joined | Refused> {
    const answer = await call(name, body)
    if (isRefused(answer)) return { error: answer.error }
    if (typeof answer.device_id !== 'string' || typeof answer.partner_id !== 'string') throw new DoorUnavailable(`${name} answered with no device`)
    return { deviceId: answer.device_id, partnerId: answer.partner_id }
  }

  return {
    join: (invite, key, label) => joined('partner_join', { p_invite: invite, p_device_key: key, p_kind: 'web', p_label: label }),
    redeem: (code, key, label) => joined('partner_handoff_redeem', { p_token: code, p_device_key: key, p_kind: 'web', p_label: label }),
    async view(key, since) {
      const answer = await call('partner_view', since == null ? { p_key: key } : { p_key: key, p_since: since })
      if (isRefused(answer)) return { error: answer.error }
      const partnerId = answer.partner_id
      const updatedAt = answer.updated_at ?? null
      if (typeof partnerId !== 'string' || (updatedAt !== null && typeof updatedAt !== 'string')) {
        throw new DoorUnavailable('partner_view answered with no partner')
      }
      if (answer.unchanged === true) return { partnerId, updatedAt, unchanged: true }
      return { partnerId, updatedAt, unchanged: false, status: answer.status ?? null }
    },
    async leave(key) {
      await call('partner_leave', { p_key: key })
    },
  }
}

/** The door over the page's fetch, looked up per call rather than captured now. */
export const liveDoor: PartnerDoor = makeDoor((input, init) => fetch(input, init))
```

- [ ] **Step 6: Let the door module POST, in `tests/fixtures/sourceScan.ts`**

After the `SUPABASE_MODULE` line (line 15), add:

```ts
/** The one module that sends the partner door's POSTs, each through the door guard (piece 5a §9). */
export const DOOR_MODULE = 'src/partner/door.ts'
```

In `networkProblems`, replace:

```ts
    } else if (ts.isCallExpression(n) && isFetchCallee(n.expression) && path !== SUPABASE_MODULE) {
      const problem = fetchProblem(n)
      // src/supabase.ts passes the page's fetch to the client, which wraps it in readOnlyFetch.
```

with:

```ts
    } else if (ts.isCallExpression(n) && isFetchCallee(n.expression) && path !== SUPABASE_MODULE && path !== DOOR_MODULE) {
      const problem = fetchProblem(n)
      // src/supabase.ts passes the page's fetch to the client, which wraps it in readOnlyFetch; src/partner/door.ts
      // passes it to the door guard.
```

- [ ] **Step 7: Add the door module's case to `tests/data/readOnlyScan.test.ts`**

In the `it.each([...])` list of `'the source rules leave ordinary code alone'`, after the `'the sign-in calls the site makes'` row, add:

```ts
    ['the partner door module, which sends its POSTs through the door guard', 'src/partner/door.ts', `export const go = (url: string, init: RequestInit) => fetch(url, init)`],
```

Then, in the `BYPASSES` list, after the `'a raw PATCH fetch'` row, add:

```ts
  ['a POST to the partner door from any other file', 'src/partner/join.ts', `export const go = (url: string) => fetch(url, { method: 'POST', body: '{}' })`, /fetch with method POST and with a body/],
```

- [ ] **Step 8: Run the tests, then the type check**

Run: `npx vitest run tests/partner/doorGuard.test.ts tests/partner/door.test.ts tests/data/readOnlyScan.test.ts tests/data/readOnly.test.ts`

Expected: PASS. `readOnly.test.ts` now checks `src/partner/door.ts` too, and passes.

Run: `npx tsc --noEmit`. Expected: no output.

- [ ] **Step 9: Commit**

```bash
cd ~/Dev/"Crewluve Website"
git add src/partner/doorGuard.ts src/partner/door.ts tests/partner/doorGuard.test.ts tests/partner/door.test.ts tests/fixtures/sourceScan.ts tests/data/readOnlyScan.test.ts
git commit -m "Partner door: the four RPCs with the publishable key, through a guard that lets nothing else leave the page (partner links piece 5a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Joining

**Files:**
- Create: `src/partner/join.ts`, `tests/partner/join.test.ts`.
- Modify: `tests/fixtures/partner.ts` (add `fakeDoor`).

The steps follow Crewluve's `PartnerJoiner.outcome(of:)` and `CrewluCloudDevice.join(_:label:)` (spec §4.3):

1. **The key:** this browser's connected key first. If another person's device has it (`key_in_use`), the pending key a join that didn't finish kept. If that's another person's too, a new pending key, saved before it's sent.
2. **Its own device again** (its own link tapped twice) changes nothing.
3. **Otherwise,** `partner_view` with no `since`. If the summary is another pilot's, ask "Switch to {Name}?":
   - **No:** the new device leaves. If the new device was made with the connected key, its old device was already gone, so everything is forgotten.
   - **Yes:** go on to Connect.
4. **Connect:**
   - the new key becomes this browser's;
   - the summary is stored;
   - the device it replaces leaves, tried once.

- [ ] **Step 1: Add the fake door to `tests/fixtures/partner.ts`**

Add this import after the `node:fs` import:

```ts
import type { Joined, PartnerDoor, Refused, Viewed } from '../../src/partner/door'
```

Then add at the end of the file:

```ts
/**
 * An in-memory partner door with Crewlu Cloud's rules (partner-api.md and private.create_device): an invite or a code
 * names a partner; a key is one partner's device, and the same key with the same partner answers with the same
 * device; each partner's summary has an updated_at. Tests fill `invites`, `codes` and `summaries`, read `devices`
 * (key → partner) and `calls`, and set `network.down`, or `network.loseNext` to lose the next answer after its work is done.
 */
export function fakeDoor() {
  const invites = new Map<string, string>()
  const codes = new Map<string, string>()
  const summaries = new Map<string, { updatedAt: string; status: unknown }>()
  const devices = new Map<string, string>()
  const calls: string[] = []
  const network = { down: false, loseNext: false }
  const reach = () => {
    if (network.down) throw new TypeError('Failed to fetch')
  }
  const lose = () => {
    if (network.loseNext) {
      network.loseNext = false
      throw new TypeError('Failed to fetch')
    }
  }
  const device = (partner: string | undefined, key: string): Joined | Refused => {
    if (!partner) return { error: 'sharing_ended' }
    const has = devices.get(key)
    if (has && has !== partner) return { error: 'key_in_use' }
    devices.set(key, partner)
    return { deviceId: `device-${key.slice(-4)}`, partnerId: partner }
  }
  const viewed = (key: string, since: string | null): Viewed | Refused => {
    const partner = devices.get(key)
    if (!partner) return { error: 'sharing_ended' }
    const summary = summaries.get(partner)
    if (!summary) return { partnerId: partner, updatedAt: null, unchanged: false, status: null }
    if (since === summary.updatedAt) return { partnerId: partner, updatedAt: summary.updatedAt, unchanged: true }
    return { partnerId: partner, updatedAt: summary.updatedAt, unchanged: false, status: summary.status }
  }
  const door: PartnerDoor = {
    async join(invite, key, label) {
      calls.push(`join ${invite} ${key} ${label}`)
      reach()
      const answer = device(invites.get(invite), key)
      lose()
      return answer
    },
    async redeem(code, key, label) {
      calls.push(`redeem ${code} ${key} ${label}`)
      reach()
      const answer = device(codes.get(code), key)
      lose()
      return answer
    },
    async view(key, since) {
      calls.push(`view ${key} ${since}`)
      reach()
      const answer = viewed(key, since)
      lose()
      return answer
    },
    async leave(key) {
      calls.push(`leave ${key}`)
      reach()
      devices.delete(key)
      lose()
    },
  }
  return { door, invites, codes, summaries, devices, calls, network }
}
```

- [ ] **Step 2: Write the failing test, `tests/partner/join.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest'
import { joinWithLink, type JoinOptions } from '../../src/partner/join'
import type { PartnerLink } from '../../src/partner/link'
import { COULDNT_CONNECT } from '../../src/partner/messages'
import { localPartnerStore } from '../../src/partner/store'
import { example, fakeDoor, key, memoryStorage, PARTNER_A, PARTNER_B } from '../fixtures/partner'

const SAM = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const INVITE_A: PartnerLink = { kind: 'invite', invite: 'invite-a' }
const INVITE_B: PartnerLink = { kind: 'invite', invite: 'invite-b' }
const INVITE_SAM: PartnerLink = { kind: 'invite', invite: 'invite-sam' }
const CODE_A: PartnerLink = { kind: 'code', code: 'AB2C3D' }

/** Crewlu Cloud and a new browser: partners A and B follow Alex, who is "Dad" to A; a third partner follows Sam. */
function setUp() {
  const f = fakeDoor()
  f.invites.set('invite-a', PARTNER_A).set('invite-b', PARTNER_B).set('invite-sam', SAM)
  f.codes.set('AB2C3D', PARTNER_A)
  f.summaries.set(PARTNER_A, { updatedAt: 'a1', status: example('display-names', 'A') })
  f.summaries.set(PARTNER_B, { updatedAt: 'b1', status: example('home', 'B') })
  f.summaries.set(SAM, { updatedAt: 's1', status: { ...example('home'), pilotId: 'SAM-PILOT', pilotFirstName: 'Sam' } })
  const store = localPartnerStore(memoryStorage())
  const confirmSwitch = vi.fn((_newPilot: string, _currentPilot: string) => true)
  let made = 0
  const options: JoinOptions = { door: f.door, store, label: 'Chrome on Mac', confirmSwitch, makeKey: () => key(++made), now: () => 9 }
  return { f, store, confirmSwitch, options }
}

/** The same, with this browser already connected by partner A's link. */
async function connectedToA() {
  const s = setUp()
  await joinWithLink(INVITE_A, s.options)
  s.f.calls.length = 0
  return s
}

const last = (calls: string[]) => calls[calls.length - 1]

describe('joining, in a browser that follows no one (piece 5a §4.3)', () => {
  it('saves a new key as pending before sending it, then connects with it', async () => {
    const { f, store, options } = setUp()
    const join = f.door.join
    f.door.join = async (invite, k, label) => {
      expect(store.pendingKey()).toBe(k)
      return join(invite, k, label)
    }
    expect(await joinWithLink(INVITE_A, options)).toEqual({ kind: 'connected', newDevice: true })
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_A })
    expect(store.pendingKey()).toBeNull()
    expect(store.summary()).toEqual({ partnerId: PARTNER_A, updatedAt: 'a1', status: example('display-names', 'A'), checkedAt: 9 })
    expect(f.calls).toEqual([`join invite-a ${key(1)} Chrome on Mac`, `view ${key(1)} null`])
  })

  it('redeems a code the same way', async () => {
    const { f, store, options } = setUp()
    expect(await joinWithLink(CODE_A, options)).toEqual({ kind: 'connected', newDevice: true })
    expect(store.device()?.partnerId).toBe(PARTNER_A)
    expect(f.calls[0]).toBe(`redeem AB2C3D ${key(1)} Chrome on Mac`)
  })

  it('keeps the key when the answer is lost, so trying again gets the same device', async () => {
    const { f, store, options } = setUp()
    f.network.loseNext = true
    expect(await joinWithLink(INVITE_A, options)).toEqual({ kind: 'failed', message: COULDNT_CONNECT })
    expect(store.pendingKey()).toBe(key(1))
    expect(store.device()).toBeNull()
    expect(await joinWithLink(INVITE_A, options)).toEqual({ kind: 'connected', newDevice: true })
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_A })
    expect(f.devices.size).toBe(1)
  })

  it("connects before the pilot's first summary, with no one to compare", async () => {
    const { f, store, options } = setUp()
    f.summaries.delete(PARTNER_A)
    expect(await joinWithLink(INVITE_A, options)).toEqual({ kind: 'connected', newDevice: true })
    expect(store.summary()).toEqual({ partnerId: PARTNER_A, updatedAt: null, status: null, checkedAt: 9 })
  })

  it('fails without calling the door when the new key cannot be saved', async () => {
    const { f, options } = setUp()
    expect(await joinWithLink(INVITE_A, { ...options, store: localPartnerStore(null) })).toEqual({ kind: 'failed', message: COULDNT_CONNECT })
    expect(f.calls).toEqual([])
  })
})

describe('joining, in a browser that follows a pilot', () => {
  it('changes nothing for its own link again', async () => {
    const { f, store, options } = await connectedToA()
    expect(await joinWithLink(INVITE_A, options)).toEqual({ kind: 'connected', newDevice: false })
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_A })
    expect(f.calls).toEqual([`join invite-a ${key(1)} Chrome on Mac`])
  })

  it("moves to the same pilot's other partner without asking, and the old device leaves", async () => {
    const { f, store, options, confirmSwitch } = await connectedToA()
    expect(await joinWithLink(INVITE_B, options)).toEqual({ kind: 'connected', newDevice: true })
    expect(confirmSwitch).not.toHaveBeenCalled()
    expect(store.device()).toEqual({ key: key(2), partnerId: PARTNER_B })
    expect(f.calls).toEqual([
      `join invite-b ${key(1)} Chrome on Mac`, // A's device has this key: key_in_use
      `join invite-b ${key(2)} Chrome on Mac`,
      `view ${key(2)} null`,
      `leave ${key(1)}`,
    ])
  })

  it('asks before switching to another pilot, and switches on a yes', async () => {
    const { f, store, options, confirmSwitch } = await connectedToA()
    expect(await joinWithLink(INVITE_SAM, options)).toEqual({ kind: 'connected', newDevice: true })
    expect(confirmSwitch).toHaveBeenCalledWith('Sam', 'Dad')
    expect(store.device()).toEqual({ key: key(2), partnerId: SAM })
    expect(last(f.calls)).toBe(`leave ${key(1)}`)
  })

  it('stays with its pilot on a no: the new device leaves, and the pending key is forgotten', async () => {
    const { f, store, options, confirmSwitch } = await connectedToA()
    confirmSwitch.mockReturnValue(false)
    expect(await joinWithLink(INVITE_SAM, options)).toEqual({ kind: 'cancelled' })
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_A })
    expect(store.pendingKey()).toBeNull()
    expect(f.devices.has(key(2))).toBe(false)
    expect(last(f.calls)).toBe(`leave ${key(2)}`)
  })

  it('forgets everything on a no when its own key made the new device, since the old one was already gone', async () => {
    const { f, store, options, confirmSwitch } = await connectedToA()
    f.devices.delete(key(1)) // the pilot removed this browser in CrewLu
    confirmSwitch.mockReturnValue(false)
    expect(await joinWithLink(INVITE_SAM, options)).toEqual({ kind: 'cancelled' })
    expect([store.device(), store.summary()]).toEqual([null, null])
    expect(f.calls).toEqual([`join invite-sam ${key(1)} Chrome on Mac`, `view ${key(1)} null`, `leave ${key(1)}`])
  })

  it("makes a new key when the kept pending key is another person's too", async () => {
    const { f, store, options } = await connectedToA()
    store.savePendingKey(key(7))
    f.devices.set(key(7), PARTNER_B)
    expect(await joinWithLink(INVITE_SAM, options)).toEqual({ kind: 'connected', newDevice: true })
    expect(store.device()).toEqual({ key: key(2), partnerId: SAM })
    expect(f.calls.slice(0, 3)).toEqual([
      `join invite-sam ${key(1)} Chrome on Mac`,
      `join invite-sam ${key(7)} Chrome on Mac`,
      `join invite-sam ${key(2)} Chrome on Mac`,
    ])
  })
})

describe('what a partner is told (piece 5a §4.4)', () => {
  it('says a dead invite link is dead', async () => {
    const { options } = setUp()
    expect(await joinWithLink({ kind: 'invite', invite: 'gone' }, options)).toEqual({
      kind: 'failed',
      message: { title: 'Invite Link Not Working', text: "This invite link doesn't work anymore. Ask your pilot to send it again." },
    })
  })

  it('tells a connected browser it is still connected, and keeps its key', async () => {
    const { store, options } = await connectedToA()
    expect(await joinWithLink({ kind: 'invite', invite: 'gone' }, options)).toMatchObject({
      message: { text: "This invite link doesn't work anymore. You're still connected to Dad." },
    })
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_A })
  })

  it.each([
    ['sharing_ended', 'Code Not Working'],
    ['too_many_devices', 'Too Many Devices'],
    ['try_later', 'Too Many Tries'],
    ['invalid_input', 'Not an Invite Link'],
    ['key_in_use', "Couldn't Connect"], // on the pending key and on a new one
    ['something_new', "Couldn't Connect"],
  ])('tells %s from a code as %s', async (error, title) => {
    const { f, options } = setUp()
    f.door.redeem = async () => ({ error })
    expect(await joinWithLink(CODE_A, options)).toMatchObject({ kind: 'failed', message: { title } })
  })

  it("can't connect with no network, and keeps the pending key for the next try", async () => {
    const { f, store, options } = setUp()
    f.network.down = true
    expect(await joinWithLink(INVITE_A, options)).toEqual({ kind: 'failed', message: COULDNT_CONNECT })
    expect(store.pendingKey()).toBe(key(1))
  })

  it("can't connect when the read after joining is refused", async () => {
    const { f, store, options } = setUp()
    f.door.view = async () => ({ error: 'sharing_ended' })
    expect(await joinWithLink(INVITE_A, options)).toEqual({ kind: 'failed', message: COULDNT_CONNECT })
    expect(store.device()).toBeNull()
  })
})
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run tests/partner/join.test.ts`

Expected: FAIL, because `../../src/partner/join` can't be found.

- [ ] **Step 4: Write `src/partner/join.ts`**

```ts
import { isRefused, type Joined, type PartnerDoor } from './door'
import type { PartnerLink } from './link'
import { COULDNT_CONNECT, joinMessage, type JoinMessage } from './messages'
import type { Device, PartnerStore } from './store'
import { readSummary } from './summary'

export type JoinOutcome =
  /** Following the link's pilot now. `newDevice` is false when the link was this browser's own device again. */
  | { kind: 'connected'; newDevice: boolean }
  /** The partner chose not to switch pilots. */
  | { kind: 'cancelled' }
  | { kind: 'failed'; message: JoinMessage }

export interface JoinOptions {
  door: PartnerDoor
  store: PartnerStore
  /** This browser's name in the pilot's list (label.ts). */
  label: string
  /** "Switch to {newPilot}?": true to follow the link's pilot instead of {currentPilot}. */
  confirmSwitch: (newPilot: string, currentPilot: string) => boolean
  makeKey: () => string
  now?: () => number
}

/** The door refused the link or the code. */
class Refusal extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'Refusal'
  }
}

/** The key a join sent, and the door's answer. */
interface Attempt {
  key: string
  /** The key this browser is connected with, rather than the pending one. */
  isDeviceKey: boolean
  joined: Joined
}

/**
 * Joins with an invite link or a hand-off code (piece 5a §4.3), as Crewluve does (PartnerJoiner.swift and
 * CrewluCloudDevice.swift): with this browser's key, else the pending key, saved before it's sent, so trying again
 * after a lost answer gets the same device. The connected key changes only when the browser switches to the new device.
 */
export async function joinWithLink(link: PartnerLink, options: JoinOptions): Promise<JoinOutcome> {
  const { door, store, now = Date.now } = options
  const connected = store.device()
  const followed = connected ? store.summary() : null
  const followedSummary = followed?.status != null ? readSummary(followed.status, followed.partnerId) : null

  let attempt: Attempt
  try {
    attempt = await tryKeys(link, options, connected)
  } catch (err) {
    const refusal = err instanceof Refusal ? err.code : null
    return { kind: 'failed', message: joinMessage(refusal, link, followedSummary?.name ?? null) }
  }
  // This browser's own device again, from tapping its own link twice: nothing changes.
  if (attempt.isDeviceKey && attempt.joined.partnerId === connected?.partnerId) return { kind: 'connected', newDevice: false }

  let status: unknown
  let updatedAt: string | null
  try {
    const answer = await door.view(attempt.key, null)
    if (isRefused(answer)) return { kind: 'failed', message: COULDNT_CONNECT }
    status = answer.unchanged ? null : answer.status
    updatedAt = answer.updatedAt
  } catch {
    return { kind: 'failed', message: COULDNT_CONNECT }
  }

  // Another pilot's link: ask first. Before the pilot's first summary there's no one to compare, so no question.
  const newSummary = status != null ? readSummary(status, attempt.joined.partnerId) : null
  if (newSummary && followedSummary && newSummary.pilotId.toLowerCase() !== followedSummary.pilotId.toLowerCase()) {
    if (!options.confirmSwitch(newSummary.name ?? 'your pilot', followedSummary.name ?? 'your pilot')) {
      await door.leave(attempt.key).catch(() => {})
      // This browser's own key made a new device, so its old one was already gone: that sharing had ended.
      if (attempt.isDeviceKey) store.forget()
      else store.forgetPendingKey()
      return { kind: 'cancelled' }
    }
  }

  // Connect: the new key becomes this browser's, and the device it replaces leaves, tried once.
  if (!store.saveDevice({ key: attempt.key, partnerId: attempt.joined.partnerId })) return { kind: 'failed', message: COULDNT_CONNECT }
  if (!attempt.isDeviceKey) store.forgetPendingKey()
  store.saveSummary({ partnerId: attempt.joined.partnerId, updatedAt, status, checkedAt: now() })
  if (connected && connected.key !== attempt.key) void door.leave(connected.key).catch(() => {})
  return { kind: 'connected', newDevice: true }
}

/**
 * The join itself, as CrewluCloudDevice.join(_:label:) tries keys: this browser's key; if another person's device has
 * it, the pending key a join that didn't finish kept; if that's another person's too, a new pending key.
 */
async function tryKeys(link: PartnerLink, options: JoinOptions, connected: Device | null): Promise<Attempt> {
  if (connected) {
    try {
      return { key: connected.key, isDeviceKey: true, joined: await send(link, connected.key, options) }
    } catch (err) {
      if (!(err instanceof Refusal && err.code === 'key_in_use')) throw err
    }
  }
  try {
    const key = pendingKey(options, true)
    return { key, isDeviceKey: false, joined: await send(link, key, options) }
  } catch (err) {
    if (!(err instanceof Refusal && err.code === 'key_in_use')) throw err
    const key = pendingKey(options, false)
    return { key, isDeviceKey: false, joined: await send(link, key, options) }
  }
}

/** The pending key: the one kept from a join that didn't finish, when `reuse`, else a new one, saved before it's sent. */
function pendingKey({ store, makeKey }: JoinOptions, reuse: boolean): string {
  const kept = reuse ? store.pendingKey() : null
  if (kept) return kept
  const key = makeKey()
  if (!store.savePendingKey(key)) throw new Error('The new key could not be saved')
  return key
}

async function send(link: PartnerLink, key: string, { door, label }: JoinOptions): Promise<Joined> {
  const answer = link.kind === 'invite' ? await door.join(link.invite, key, label) : await door.redeem(link.code, key, label)
  if (isRefused(answer)) throw new Refusal(answer.error)
  return answer
}
```

- [ ] **Step 5: Run the test, then the type check**

Run: `npx vitest run tests/partner/join.test.ts`. Expected: PASS (21 tests).

Run: `npx tsc --noEmit`. Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd ~/Dev/"Crewluve Website"
git add src/partner/join.ts tests/partner/join.test.ts tests/fixtures/partner.ts
git commit -m "Joining with an invite link or a code, as Crewluve joins: keys, key_in_use, Switch and Cancel (partner links piece 5a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Refreshing

**Files:**
- Create: `src/partner/refresh.ts`, `tests/partner/refresh.test.ts`.

- [ ] **Step 1: Write the failing test, `tests/partner/refresh.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { NotConnected, refreshSummary, SharingEnded } from '../../src/partner/refresh'
import { localPartnerStore } from '../../src/partner/store'
import { example, fakeDoor, key, memoryStorage, PARTNER_A, PARTNER_B } from '../fixtures/partner'

/** A browser connected as partner A's device key(1), which already has the summary of a1. */
function connected() {
  const f = fakeDoor()
  f.devices.set(key(1), PARTNER_A)
  f.summaries.set(PARTNER_A, { updatedAt: 'a1', status: example('layover') })
  const store = localPartnerStore(memoryStorage())
  store.saveDevice({ key: key(1), partnerId: PARTNER_A })
  store.saveSummary({ partnerId: PARTNER_A, updatedAt: 'a1', status: example('layover'), checkedAt: 1 })
  return { f, store }
}

describe('refreshSummary (piece 5a §5)', () => {
  it('sends the stored updated_at, and on unchanged keeps the summary and moves Checked', async () => {
    const { f, store } = connected()
    const after = await refreshSummary(f.door, store, () => 5)
    expect(f.calls).toEqual([`view ${key(1)} a1`])
    expect(after).toEqual({ partnerId: PARTNER_A, updatedAt: 'a1', status: example('layover'), checkedAt: 5 })
    expect(store.summary()).toEqual(after)
  })

  it('stores a new summary', async () => {
    const { f, store } = connected()
    f.summaries.set(PARTNER_A, { updatedAt: 'a2', status: example('commuting-home') })
    const after = await refreshSummary(f.door, store, () => 5)
    expect(after).toEqual({ partnerId: PARTNER_A, updatedAt: 'a2', status: example('commuting-home'), checkedAt: 5 })
    expect(store.summary()).toEqual(after)
  })

  it("stores the answer from before the pilot's first summary", async () => {
    const { f, store } = connected()
    f.summaries.delete(PARTNER_A)
    expect(await refreshSummary(f.door, store, () => 5)).toEqual({ partnerId: PARTNER_A, updatedAt: null, status: null, checkedAt: 5 })
  })

  it('asks for everything when the stored summary is for another partner', async () => {
    const { f, store } = connected()
    store.saveSummary({ partnerId: PARTNER_B, updatedAt: 'a1', status: null, checkedAt: 1 })
    await refreshSummary(f.door, store, () => 5)
    expect(f.calls).toEqual([`view ${key(1)} null`])
  })

  it('forgets the key and the summary when sharing ends, and names the pilot as this partner saw them', async () => {
    const { f, store } = connected()
    f.devices.clear() // the pilot removed this browser in CrewLu
    const err = await refreshSummary(f.door, store).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(SharingEnded)
    expect((err as SharingEnded).pilotName).toBe('Alex')
    expect([store.device(), store.pendingKey(), store.summary()]).toEqual([null, null, null])
  })

  it('has no name for an ending before the first summary', async () => {
    const { f, store } = connected()
    store.saveSummary({ partnerId: PARTNER_A, updatedAt: null, status: null, checkedAt: 1 })
    f.devices.clear()
    const err = await refreshSummary(f.door, store).catch((e: unknown) => e)
    expect((err as SharingEnded).pilotName).toBeNull()
  })

  it('changes nothing when the door refuses for another reason', async () => {
    const { f, store } = connected()
    f.door.view = async () => ({ error: 'try_later' })
    await expect(refreshSummary(f.door, store)).rejects.toThrow('partner_view refused: try_later')
    expect(store.device()).not.toBeNull()
    expect(store.summary()?.checkedAt).toBe(1)
  })

  it('changes nothing when there is no answer', async () => {
    const { f, store } = connected()
    f.network.down = true
    await expect(refreshSummary(f.door, store)).rejects.toThrow('Failed to fetch')
    expect(store.summary()?.checkedAt).toBe(1)
  })

  it('says so when this browser follows no one', async () => {
    const { f } = connected()
    await expect(refreshSummary(f.door, localPartnerStore(memoryStorage()))).rejects.toBeInstanceOf(NotConnected)
  })

  it('writes nothing when the browser disconnects while the call is out', async () => {
    const { f, store } = connected()
    const view = f.door.view
    f.door.view = async (k, since) => {
      store.forget() // Disconnect, in this tab or another
      return view(k, since)
    }
    await expect(refreshSummary(f.door, store)).rejects.toBeInstanceOf(NotConnected)
    expect(store.summary()).toBeNull()
  })

  it("shows another tab's new device instead of writing over it", async () => {
    const { f, store } = connected()
    const view = f.door.view
    const theirs = { partnerId: PARTNER_B, updatedAt: 'b1', status: example('home', 'B'), checkedAt: 3 }
    f.door.view = async (k, since) => {
      store.saveDevice({ key: key(2), partnerId: PARTNER_B })
      store.saveSummary(theirs)
      return view(k, since)
    }
    expect(await refreshSummary(f.door, store)).toEqual(theirs)
    expect(store.summary()).toEqual(theirs)
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/partner/refresh.test.ts`

Expected: FAIL, because `../../src/partner/refresh` can't be found.

- [ ] **Step 3: Write `src/partner/refresh.ts`**

```ts
import { isRefused, type PartnerDoor } from './door'
import type { PartnerStore, StoredSummary } from './store'
import { nameIn } from './summary'

/** partner_view said this browser's device is gone: the pilot removed it, or the person (piece 5a §5). */
export class SharingEnded extends Error {
  /** The pilot whose sharing ended, as this partner saw them, when the stored summary says. */
  constructor(readonly pilotName: string | null) {
    super('Sharing has ended')
    this.name = 'SharingEnded'
  }
}

/** This browser follows no one now: Disconnect, in this tab or another. */
export class NotConnected extends Error {
  constructor() {
    super('Not connected')
    this.name = 'NotConnected'
  }
}

/**
 * One poll (piece 5a §5): partner_view with the stored summary's updated_at, so an unchanged summary comes back as
 * just that. A new summary is stored, and "Checked" moves either way. On sharing_ended the key and the summary are
 * forgotten (the only answer that forgets them), then SharingEnded is thrown. Any other failure changes nothing.
 */
export async function refreshSummary(door: PartnerDoor, store: PartnerStore, now: () => number = Date.now): Promise<StoredSummary> {
  const device = store.device()
  if (!device) throw new NotConnected()
  const stored = store.summary()
  const kept = stored?.partnerId === device.partnerId ? stored : null
  const answer = await door.view(device.key, kept?.updatedAt ?? null)

  // The browser let go of this device while the call was out: write nothing for it.
  const current = store.device()
  if (!current) throw new NotConnected()
  if (current.key !== device.key) {
    // Another tab connected a new device meanwhile, and stored its summary.
    const theirs = store.summary()
    if (theirs) return theirs
    throw new Error('The device changed during the refresh')
  }

  if (isRefused(answer)) {
    if (answer.error !== 'sharing_ended') throw new Error(`partner_view refused: ${answer.error}`)
    store.forget()
    throw new SharingEnded(kept ? nameIn(kept.status, kept.partnerId) : null)
  }
  if (answer.unchanged) {
    if (!kept) throw new Error('partner_view answered unchanged to a call that asked for everything')
    const checked = { ...kept, checkedAt: now() }
    store.saveSummary(checked)
    return checked
  }
  const fresh: StoredSummary = { partnerId: answer.partnerId, updatedAt: answer.updatedAt, status: answer.status, checkedAt: now() }
  store.saveSummary(fresh)
  return fresh
}
```

- [ ] **Step 4: Run the test, the partner tests, and the type check**

Run: `npx vitest run tests/partner`. Expected: PASS, every test in the eight partner files.

Run: `npx tsc --noEmit`. Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd ~/Dev/"Crewluve Website"
git add src/partner/refresh.ts tests/partner/refresh.test.ts
git commit -m "Polling partner_view with since: unchanged, a new summary, and sharing ended (partner links piece 5a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 8: The quick status, the notice, and the waiting text

**Files:**
- Modify:
  - `scripts/build-icons.mjs` and `src/icons/iconPaths.ts` (generated);
  - `src/ui/LocationCard.tsx`, `src/ui/StatusScreen.tsx`, `src/ui/EmptyState.tsx`;
  - `src/styles/cards.css`, `src/styles/location.css`;
  - `tests/icons/iconPaths.test.ts`, `tests/ui/LocationCard.test.tsx`, `tests/ui/StatusScreen.test.tsx`.
- Create: `src/ui/Notice.tsx`.

All of this is optional props and new pieces. Nothing shows them until Task 10.

- [ ] **Step 1: Add the quick status's icons to `scripts/build-icons.mjs`**

In the comment above `const ICONS`, replace `the sixth, the slice 3A schedule list's.` with:

```
the sixth, the slice 3A schedule list's; the seventh, the quick status's (partner links piece 5a §7).
```

In `ICONS`, replace the last line, `  Seat: 'seat', ClockCounterClockwise: 'clock-counter-clockwise',`, with:

```js
  Seat: 'seat', ClockCounterClockwise: 'clock-counter-clockwise',

  Phone: 'phone', ChatCircle: 'chat-circle', ForkKnife: 'fork-knife',
```

- [ ] **Step 2: Make the icons again**

```bash
cd ~/Dev/"Crewluve Website"
npm run icons
git diff --stat src/icons/iconPaths.ts
```

Expected: `1 file changed, 3 insertions(+)`, the three new icons at the end of `ICON_PATHS`. If any other line changed, stop and say so: Phosphor's version or the script changed.

- [ ] **Step 3: Write the failing tests**

In `tests/icons/iconPaths.test.ts`, add inside `describe('ICON_PATHS', …)`:

```ts
  it('has the quick status icons (partner links piece 5a §7)', () => {
    for (const name of ['Phone', 'ChatCircle', 'ForkKnife', 'Moon']) expect(ICON_PATHS).toHaveProperty(name)
  })
```

In `tests/ui/LocationCard.test.tsx`:
- change the `LocationCard` import to `import { LocationCard, quickStatusIcon, showsLocationCard } from '../../src/ui/LocationCard'`;
- add at the end of the file:

```tsx
describe('LocationCard: the quick status (piece 5a §7)', () => {
  it("shows the pilot's quick status under the city, with its icon", () => {
    const { container } = render(
      <LocationCard airport="ANC" facts={locationFacts('ANC', NOW, testAirports, null)} now={NOW} homeTz={NY} h24={false} weather={null}
        quickStatus={{ text: 'Call Me', icon: 'phone.fill', expiresAt: null }} />,
    )
    expect(container.querySelector('.quick-status')?.textContent).toBe('Call Me')
    expect(iconNameOf(container.querySelector('.quick-status svg'))).toBe('Phone')
    expect(container.querySelector('.location-head')!.compareDocumentPosition(container.querySelector('.quick-status')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it.each<[string | null, string]>([
    ['phone.fill', 'Phone'],
    ['bubble.left.fill', 'ChatCircle'],
    ['fork.knife', 'ForkKnife'],
    ['moon.zzz.fill', 'Moon'],
    ['sparkles', 'ChatCircle'],
    ['constructor', 'ChatCircle'],
    [null, 'ChatCircle'],
  ])("draws CrewLu's %s as %s", (symbol, icon) => {
    expect(quickStatusIcon(symbol)).toBe(icon)
  })

  it('has no quick status row without one', () => {
    const { container } = render(card('ANC'))
    expect(container.querySelector('.quick-status')).toBeNull()
  })
})
```

In `tests/ui/StatusScreen.test.tsx`:
- add `import type { QuickStatus } from '../../src/partner/summary'` after the `../../src/engine/snapshot` import;
- replace the `describe('EmptyState', …)` block with:

```tsx
describe('EmptyState', () => {
  it("waits for the pilot's first update (piece 5a §5)", () => {
    render(<EmptyState />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe("Waiting for your pilot's first update…")
    expect(screen.getByText('It shows here as soon as CrewLu sends it.')).toBeTruthy()
  })
})

describe('StatusScreen: the notice and the quick status (piece 5a)', () => {
  const withExtras = (minutes: number, extras: { notice?: string | null; quickStatus?: QuickStatus | null }) => {
    const now = at(minutes)
    return (
      <StatusScreen snap={makeSnapshot(e.schedule, e.legs, now, NY)} now={now} viewerTz={NY} homeTz={NY} h24={false} airports={testAirports}
        weather={null} demo={false} celebrateKey={0} footer={footer(now)} {...extras} />
    )
  }

  it('shows the notice above the sentence', () => {
    const { container } = render(withExtras(-1440, { notice: 'Connected on this browser. Add it to your Home Screen to keep it handy.' }))
    const notice = screen.getByRole('status')
    expect(notice.textContent).toBe('Connected on this browser. Add it to your Home Screen to keep it handy.')
    expect(notice.compareDocumentPosition(container.querySelector('.narrative')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('has no notice without one', () => {
    render(withExtras(-1440, {}))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('puts the quick status on the location card', () => {
    const { container } = render(withExtras(-1440, { quickStatus: { text: 'Out for Dinner', icon: 'fork.knife', expiresAt: null } }))
    expect(container.querySelector('.location .quick-status')?.textContent).toBe('Out for Dinner')
  })
})
```

- [ ] **Step 4: Run them to see them fail**

Run: `npx vitest run tests/icons/iconPaths.test.ts tests/ui/LocationCard.test.tsx tests/ui/StatusScreen.test.tsx`

Expected:
- `iconPaths` passes, since Step 2 already made the icons.
- The rest FAIL: `quickStatusIcon` isn't exported, the EmptyState text is the old one, and there's no notice.

- [ ] **Step 5: Write `src/ui/Notice.tsx`**

```tsx
/** One line above the cards (piece 5a §4.3): that this browser just connected, or why a link didn't. */
export function Notice({ text }: { text: string }) {
  return (
    <p class="glass notice" role="status">
      {text}
    </p>
  )
}
```

- [ ] **Step 6: Replace `src/ui/EmptyState.tsx`**

```tsx
/** Connected, before the pilot's first summary (piece 5a §5): there's nothing to show yet. */
export function EmptyState() {
  return (
    <section class="card glass empty">
      <h2>Waiting for your pilot's first update…</h2>
      <p>It shows here as soon as CrewLu sends it.</p>
    </section>
  )
}
```

- [ ] **Step 7: Add the quick status to `src/ui/LocationCard.tsx`**

Add these imports, after `import type { Weather } from '../data/weather'`:

```tsx
import type { IconName } from '../icons/iconPaths'
import type { QuickStatus } from '../partner/summary'
```

After `showsLocationCard`, add:

```tsx
/** CrewLu's quick status symbols (PartnerQuickStatusSheet.swift) as the site's icons; any other is a speech bubble. */
const QUICK_STATUS_ICONS: ReadonlyMap<string, IconName> = new Map<string, IconName>([
  ['phone.fill', 'Phone'],
  ['bubble.left.fill', 'ChatCircle'],
  ['fork.knife', 'ForkKnife'],
  ['moon.zzz.fill', 'Moon'],
])

export function quickStatusIcon(symbol: string | null): IconName {
  return (symbol && QUICK_STATUS_ICONS.get(symbol)) || 'ChatCircle'
}
```

In `LocationCardProps`, after `headingRef`, add:

```tsx
  /** The pilot's quick status, under the city (piece 5a §7), or null. */
  quickStatus?: QuickStatus | null
```

Change the function's first line to:

```tsx
export function LocationCard({ airport, facts, now, homeTz, h24, weather, onOpenSun, headingRef, quickStatus = null }: LocationCardProps) {
```

Right after the closing `</div>` of `location-head`, add:

```tsx
        {quickStatus && (
          <p class="quick-status">
            <Icon name={quickStatusIcon(quickStatus.icon)} size={17} color="var(--blue)" />
            <span>{quickStatus.text}</span>
          </p>
        )}
```

- [ ] **Step 8: Add the notice and the quick status to `src/ui/StatusScreen.tsx`**

Add these imports, in alphabetical order with the others:

```tsx
import type { QuickStatus } from '../partner/summary'
import { Notice } from './Notice'
```

In `StatusScreenProps`, after `beside`, add:

```tsx
  /** One line above the cards: that this browser just connected, or why a link didn't (piece 5a §4.3). */
  notice?: string | null
  /** The pilot's quick status now, for the location card (piece 5a §7). */
  quickStatus?: QuickStatus | null
```

In `cards`, after `{p.demo && <DemoBanner />}`, add:

```tsx
      {p.notice && <Notice text={p.notice} />}
```

In the `<LocationCard … />` element, after `onOpenSun={sun.show}`, add:

```tsx
          quickStatus={p.quickStatus ?? null}
```

- [ ] **Step 9: Style the notice, in `src/styles/cards.css`**

After the `.demo-banner { … }` rule, add:

```css
/* A line above the cards (piece 5a §4.3), on the glass like the demo banner. */
.notice {
  margin: 0;
  padding: 10px 16px;
  border-radius: 16px;
  font-size: 15px;
  line-height: 20px;
  text-align: center;
  color: var(--text-2);
}
```

- [ ] **Step 10: Style the quick status, in `src/styles/location.css`**

After the `.location-flag { … }` rule, add:

```css
/* The pilot's quick status (piece 5a §7): its icon in blue, and its words at 15 px semibold, under the city. */
.quick-status {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  line-height: 20px;
  font-weight: 600;
}
```

- [ ] **Step 11: Run the tests, then everything**

Run: `npx vitest run tests/icons/iconPaths.test.ts tests/ui/LocationCard.test.tsx tests/ui/StatusScreen.test.tsx`. Expected: PASS.

Run: `npx tsc --noEmit && npm test`.

Expected: no type errors, and everything passes except the tests that still look for the old empty-state text:
- `tests/ui/PilotPages.test.tsx`: its checks of 'No schedule in CrewLu Cloud yet';
- `tests/ui/Root.test.tsx`: 'shows the empty state for a signed-in account with nothing in CrewLu Cloud'.

Task 10 rewrites both files. Change these two now so the suite stays green:
- In `tests/ui/PilotPages.test.tsx`, replace every `'No schedule in CrewLu Cloud yet'` with `"Waiting for your pilot's first update…"`.
- In `tests/ui/Root.test.tsx`, replace `expect(await screen.findByText('No schedule in CrewLu Cloud yet')).toBeTruthy()` with `expect(await screen.findByText("Waiting for your pilot's first update…")).toBeTruthy()`.

Run `npm test` again. Expected: PASS.

- [ ] **Step 12: Commit**

```bash
cd ~/Dev/"Crewluve Website"
git add scripts/build-icons.mjs src/icons/iconPaths.ts src/ui/Notice.tsx src/ui/EmptyState.tsx src/ui/LocationCard.tsx src/ui/StatusScreen.tsx src/styles/cards.css src/styles/location.css tests/icons/iconPaths.test.ts tests/ui/LocationCard.test.tsx tests/ui/StatusScreen.test.tsx tests/ui/PilotPages.test.tsx tests/ui/Root.test.tsx
git commit -m "Quick status on the location card, a notice line above the cards, and waiting for the pilot's first update (partner links piece 5a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The welcome and connecting screens

**Files:**
- Create: `src/ui/Welcome.tsx`, `tests/ui/Welcome.test.tsx`.
- Modify: `src/styles/cards.css`.

The screens reuse the sign-in screen's layout and classes (`signin`, `signin-mark`, `signin-sub`, `signin-form`, `field`, `primary`, `signin-error`, `signin-note`, `signin-demo`). Task 11 deletes the sign-in screen itself.

- [ ] **Step 1: Write the failing test, `tests/ui/Welcome.test.tsx`**

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Connecting, Welcome } from '../../src/ui/Welcome'

afterEach(cleanup)

const submit = () => fireEvent.submit(screen.getByRole('button', { name: 'Connect' }).closest('form')!)

describe('Welcome (piece 5a §8)', () => {
  it('greets like the app and says how to connect', () => {
    render(<Welcome message={null} ended={null} onJoin={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Welcome to CrewLuve')
    expect(screen.getByText('Stay connected with your pilot')).toBeTruthy()
    expect(screen.getByText('Open the invite link your pilot sent you, on this device.')).toBeTruthy()
    expect(screen.getByText('or type the code from CrewLuve on another device')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Try Demo' }).getAttribute('href')).toBe('?demo=1')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it("connects with a pasted invite link, even inside CrewLu's whole message", () => {
    const onJoin = vi.fn()
    render(<Welcome message={null} ended={null} onJoin={onJoin} />)
    fireEvent.input(screen.getByLabelText('Paste Invite Link'), {
      target: { value: 'Tap this link to see my status in Crewluve. https://crewluve.crewlu.net/join#t=abc123' },
    })
    submit()
    expect(onJoin).toHaveBeenCalledWith({ kind: 'invite', invite: 'abc123' })
  })

  it('says Not an Invite Link for pasted text with no link, and joins nothing', () => {
    const onJoin = vi.fn()
    render(<Welcome message={null} ended={null} onJoin={onJoin} />)
    fireEvent.input(screen.getByLabelText('Paste Invite Link'), { target: { value: 'hello' } })
    submit()
    expect(onJoin).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe("Not an Invite Link That doesn't look like an invite link.")
  })

  it('keeps Connect off until something is pasted', () => {
    render(<Welcome message={null} ended={null} onJoin={() => {}} />)
    expect((screen.getByRole('button', { name: 'Connect' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("redeems a code on its sixth letter, keeping only the code's letters, in upper case", () => {
    const onJoin = vi.fn()
    const { container } = render(<Welcome message={null} ended={null} onJoin={onJoin} />)
    const code = screen.getByLabelText('Code')
    fireEvent.input(code, { target: { value: 'ab-2c3' } })
    expect(onJoin).not.toHaveBeenCalled()
    expect([...container.querySelectorAll('.code-box')].map((box) => box.textContent)).toEqual(['A', 'B', '2', 'C', '3', ''])
    fireEvent.input(code, { target: { value: 'ab-2c3d' } })
    expect(onJoin).toHaveBeenCalledWith({ kind: 'code', code: 'AB2C3D' })
  })

  it("shows why the last link or code didn't connect", () => {
    render(<Welcome message={{ title: 'Too Many Tries', text: 'Too many tries. Wait a minute, then try again.' }} ended={null} onJoin={() => {}} />)
    expect(screen.getByRole('alert').textContent).toBe('Too Many Tries Too many tries. Wait a minute, then try again.')
  })

  it('says whose sharing ended, when that is why it shows', () => {
    render(<Welcome message={null} ended="Dad" onJoin={() => {}} />)
    expect(screen.getByText('Sharing with Dad has ended.')).toBeTruthy()
  })
})

describe('Connecting', () => {
  it('says it is connecting', () => {
    render(<Connecting />)
    expect(screen.getByRole('status').textContent).toBe('Connecting…')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CrewLuve')
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/ui/Welcome.test.tsx`

Expected: FAIL, because `../../src/ui/Welcome` can't be found.

- [ ] **Step 3: Write `src/ui/Welcome.tsx`**

```tsx
import { useState } from 'preact/hooks'
import { CODE_LENGTH, codeFrom, linkFromText, type PartnerLink } from '../partner/link'
import { NOT_AN_INVITE_LINK, type JoinMessage } from '../partner/messages'

export interface WelcomeProps {
  /** Why the last link or code didn't connect, when that's what brought this screen back. */
  message: JoinMessage | null
  /** The pilot whose sharing just ended, as this partner saw them, when that's why this shows (piece 5a §5). */
  ended: string | null
  onJoin: (link: PartnerLink) => void
}

/** The heart over a title: the welcome and "Connecting…" keep the old sign-in screen's layout. */
function Heading({ title }: { title: string }) {
  return (
    <>
      <div class="signin-mark">
        <img src="/icons/heart-256.png" alt="" width={88} height={88} />
      </div>
      <h1 class="title">{title}</h1>
    </>
  )
}

/**
 * The screen of a browser that follows no one (piece 5a §8). The invite link, opened on this device, connects by
 * itself; here the partner can paste it instead, or type the code Crewluve's Use on Another Device shows.
 */
export function Welcome({ message, ended, onJoin }: WelcomeProps) {
  const [pasted, setPasted] = useState('')
  const [problem, setProblem] = useState<JoinMessage | null>(message)
  const [code, setCode] = useState('')

  const connect = (event: Event) => {
    event.preventDefault()
    const link = linkFromText(pasted)
    if (link) onJoin(link)
    else setProblem(NOT_AN_INVITE_LINK)
  }
  const typeCode = (typed: string) => {
    const next = codeFrom(typed)
    setCode(next)
    if (next.length === CODE_LENGTH) onJoin({ kind: 'code', code: next })
  }

  return (
    <main class="screen signin">
      <Heading title="Welcome to CrewLuve" />
      <p class="signin-sub">Stay connected with your pilot</p>
      {ended && <p class="signin-note">Sharing with {ended} has ended.</p>}
      <p class="welcome-step">Open the invite link your pilot sent you, on this device.</p>
      {problem && (
        <p class="signin-error" role="alert">
          <strong>{problem.title}</strong> {problem.text}
        </p>
      )}
      <form class="signin-form" onSubmit={connect}>
        <label class="welcome-label" for="invite">Paste Invite Link</label>
        <input
          id="invite"
          class="field"
          type="text"
          inputMode="url"
          autocomplete="off"
          autocapitalize="off"
          spellcheck={false}
          placeholder="Paste the invite link your pilot sent you."
          value={pasted}
          onInput={(e) => setPasted(e.currentTarget.value)}
        />
        <button class="primary" type="submit" disabled={pasted.trim() === ''}>Connect</button>
      </form>
      <p class="welcome-label">or type the code from CrewLuve on another device</p>
      {/* One field drawn as six boxes, so typing, pasting and the keyboard's suggestions all work. */}
      <div class="code">
        <input
          class="code-input"
          type="text"
          aria-label="Code"
          autocomplete="one-time-code"
          autocapitalize="characters"
          spellcheck={false}
          value={code}
          onInput={(e) => typeCode(e.currentTarget.value)}
        />
        <div class="code-boxes" aria-hidden="true">
          {Array.from({ length: CODE_LENGTH }, (_, i) => (
            <span key={i} class="field code-box">{code[i] ?? ''}</span>
          ))}
        </div>
      </div>
      <a class="signin-demo" href="?demo=1">Try Demo</a>
    </main>
  )
}

/** While a link or a code connects (piece 5a §4.3, step 1). */
export function Connecting() {
  return (
    <main class="screen signin" aria-busy="true">
      <Heading title="CrewLuve" />
      <p class="signin-sub" role="status">Connecting…</p>
    </main>
  )
}
```

- [ ] **Step 4: Style it, in `src/styles/cards.css`**

Replace the comment `/* Sign-in (web only). */` with:

```css
/* The welcome screen and "Connecting…" (piece 5a §8), in the layout of the sign-in screen they replaced. */
```

After the `.signin-demo { … }` rule, add:

```css
.welcome-step {
  margin: 0;
  font-size: 17px;
  line-height: 22px;
}

.welcome-label {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

/* The code: one field over six boxes. It takes the typing, the pasting and the keyboard's suggestions, unseen; the
   boxes show what it holds. 16 px, so iOS doesn't zoom in when it takes focus. */
.code {
  position: relative;
}

.code-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  font-size: 16px;
}

.code-boxes {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.code-box {
  width: 44px;
  height: 52px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 600;
}

.code-input:focus + .code-boxes .code-box {
  border-color: var(--blue);
}
```

- [ ] **Step 5: Run the test, then everything**

Run: `npx vitest run tests/ui/Welcome.test.tsx`. Expected: PASS (8 tests).

Run: `npx tsc --noEmit && npm test`. Expected: PASS. `tests/styles/styles.test.ts` still passes: the Increase Contrast rule comes after `.field`, and `.code-box` doesn't set a border width.

- [ ] **Step 6: Commit**

```bash
cd ~/Dev/"Crewluve Website"
git add src/ui/Welcome.tsx tests/ui/Welcome.test.tsx src/styles/cards.css
git commit -m "Welcome screen: paste the invite link or type the code; and Connecting (partner links piece 5a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The live page follows the pilot through the partner door

**Files:**
- Modify:
  - `src/ui/hooks/useSchedule.ts`, `src/ui/PilotPages.tsx`;
  - `src/ui/Root.tsx` (rewritten);
  - `tests/ui/hooks.test.tsx`, `tests/ui/PilotPages.test.tsx`;
  - `tests/ui/Root.test.tsx` (rewritten).

This is the switch-over. From this commit:
- the site has no sign-in;
- a browser follows its pilot through the partner door.

The old sign-in modules are still in `src/`, unused, until Task 11 removes them.

- [ ] **Step 1: Replace `src/ui/hooks/useSchedule.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { Schedule } from '../../engine/types'
import type { Problem } from '../problem'

export interface ScheduleState {
  schedule: Schedule | null
  lastSuccessAt: number | null
  problem: Problem
  refreshing: boolean
}

export type ScheduleHandle = ScheduleState & { refresh: () => void }

export interface UseScheduleOptions {
  load: () => Promise<Schedule>
  /** Shown until the first load lands: the schedule this browser kept from its last visit, if any. */
  initial?: Schedule | null
  intervalMs?: number
  /** Hears about every load that fails, once the footer shows the problem. */
  onError?: (err: unknown) => void
  isOnline?: () => boolean
}

/** How often the page asks again while it's showing: the partner door's poll (piece 5a §5). */
export const REFRESH_MS = 30_000
const RETURN_MIN_GAP_MS = 30_000

/** The kept schedule first, then a fresh one: every 30 s while visible, and when the visitor returns (piece 5a §5). */
export function useSchedule({ load, initial = null, intervalMs = REFRESH_MS, onError, isOnline = () => navigator.onLine }: UseScheduleOptions): ScheduleHandle {
  const [state, setState] = useState<ScheduleState>(() => ({
    schedule: initial,
    lastSuccessAt: initial?.fetchedAt ?? null,
    problem: null,
    refreshing: true,
  }))
  const latest = useRef({ load, onError, isOnline })
  latest.current = { load, onError, isOnline }
  const busy = useRef(false)
  const lastAttempt = useRef(0)
  // False once unmounted (after Disconnect, say): a load that finishes later must change nothing.
  const alive = useRef(true)
  useEffect(() => () => {
    alive.current = false
  }, [])

  const refresh = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    lastAttempt.current = Date.now()
    setState((s) => ({ ...s, refreshing: true }))
    try {
      const schedule = await latest.current.load()
      if (!alive.current) return
      setState({ schedule, lastSuccessAt: schedule.fetchedAt, problem: null, refreshing: false })
    } catch (err) {
      if (!alive.current) return
      setState((s) => ({ ...s, refreshing: false, problem: latest.current.isOnline() ? { kind: 'unreachable' } : { kind: 'offline' } }))
      latest.current.onError?.(err)
    } finally {
      busy.current = false
    }
  }, [])

  useEffect(() => {
    void refresh()
    const tick = setInterval(() => {
      if (document.visibilityState !== 'hidden') void refresh()
    }, intervalMs)
    const onReturn = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastAttempt.current >= RETURN_MIN_GAP_MS) void refresh()
    }
    // Back online: try at once, even inside the 30 s gap, so "Offline" clears as soon as it can.
    const onOnline = () => {
      if (document.visibilityState !== 'hidden') void refresh()
    }
    // Gone offline: say so now rather than at the next refresh (spec §8).
    const onOffline = () => setState((s) => ({ ...s, problem: { kind: 'offline' } }))
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [refresh, intervalMs])

  return { ...state, refresh: () => void refresh() }
}
```

- [ ] **Step 2: Replace `src/ui/PilotPages.tsx`**

```tsx
import { useMemo } from 'preact/hooks'
import type { AirportIndex } from '../data/airports'
import { loadDemoWeather } from '../data/demoWeather'
import { loadLiveWeather, tempUnitFor, type TempUnit, type WeatherLoader, type WeatherPlace } from '../data/weather'
import { buildLegs, type Leg } from '../engine/legs'
import { safeSnapshot, type Snapshot } from '../engine/snapshot'
import type { Schedule } from '../engine/types'
import type { QuickStatus } from '../partner/summary'
import { prefers24Hour, viewerTimeZone } from '../time/zoned'
import { EmptyState } from './EmptyState'
import { Footer, type FooterProps } from './Footer'
import type { ScheduleHandle } from './hooks/useSchedule'
import { useNow } from './hooks/useNow'
import { useSchedulePage } from './hooks/useSchedulePage'
import { useSideBySide } from './hooks/useSideBySide'
import { useVisibilityCount } from './hooks/useVisibilityCount'
import { useWeather } from './hooks/useWeather'
import { showsLocationCard } from './LocationCard'
import { Notice } from './Notice'
import { scheduleLegs } from './scheduleFacts'
import { SchedulePage } from './SchedulePage'
import { ScheduleView } from './ScheduleView'
import { StatusScreen } from './StatusScreen'
import { Title } from './Title'

export interface PilotPagesProps {
  schedule: ScheduleHandle
  airports: AirportIndex
  demo: boolean
  /** Disconnect, or Exit demo: the footer's left button. */
  onSignOut: () => void
  /** Where the location card's weather comes from: Open-Meteo, or the made-up samples in the demo. Tests pass a fake. */
  loadWeather?: WeatherLoader
  /** The pilot's quick status at a moment, for the location card (piece 5a §7). The demo has none. */
  quickStatusAt?: (now: number) => QuickStatus | null
  /** One line above the cards: that this browser just connected, or why a link didn't (piece 5a §4.3). */
  notice?: string | null
}

/**
 * Rebuilds the legs when a new schedule arrives, and the snapshot every second. Shows the status page, or the Schedule
 * page when the address ends in #schedule (slice 3A §3.3). On a wide window it shows both side by side, whatever the
 * address (3C §3, §5.1). While there's nothing to show, the same screen as ever, at every width.
 */
export function PilotPages({
  schedule, airports, demo, onSignOut, loadWeather = demo ? loadDemoWeather : loadLiveWeather, quickStatusAt, notice = null,
}: PilotPagesProps) {
  const now = useNow()
  const celebrateKey = useVisibilityCount()
  const viewerTz = useMemo(() => viewerTimeZone(), [])
  const h24 = useMemo(() => prefers24Hour(), [])
  const unit = useMemo(() => tempUnitFor(), [])
  const built = useMemo<{ s: Schedule; legs: Leg[] } | null>(() => {
    const s = schedule.schedule
    if (!s) return null
    try {
      return { s, legs: buildLegs(s) }
    } catch (err) {
      console.error('Could not read the schedule', err)
      return null
    }
  }, [schedule.schedule])

  const footer: FooterProps = {
    now,
    lastSuccessAt: schedule.lastSuccessAt,
    newestUpdatedAt: schedule.schedule?.newestUpdatedAt ?? null,
    problem: schedule.problem,
    refreshing: schedule.refreshing,
    onRefresh: schedule.refresh,
    onSignOut,
    signOutLabel: demo ? 'Exit demo' : 'Disconnect',
    viewerTz,
    h24,
  }

  const ready = built && !built.s.empty ? built : null
  const homeTz = (ready && airports.tz(ready.s.pilot.effHome)) ?? viewerTz
  const snap = ready ? safeSnapshot(ready.s, ready.legs, now, airports.tz(ready.s.pilot.base) ?? viewerTz) : null
  // Asked for before the early return below, so the hooks run in the same order on every render.
  const weather = useWeather(weatherPlace(snap, airports, unit), loadWeather)
  // The page the address asks for, and the legs the Schedule page lists. A wide window shows both pages side by side
  // (slice 3C §3).
  const sideBySide = useSideBySide()
  const page = useSchedulePage(sideBySide)
  const listed = useMemo(() => (ready ? scheduleLegs(ready.legs) : []), [ready])

  if (!snap) {
    return (
      <main class="screen">
        <Title text="CrewLuve" />
        {notice && <Notice text={notice} />}
        {built?.s.empty && <EmptyState />}
        <Footer {...footer} />
      </main>
    )
  }

  const quickStatus = quickStatusAt?.(now) ?? null
  const status = { snap, now, viewerTz, homeTz, h24, airports, weather, demo, celebrateKey, footer, notice, quickStatus }
  const view = { legs: listed, pilot: snap.pilot, now, timeZone: viewerTz, h24, airports }
  // Side by side, the schedule sits beside the cards, and nothing on the status page opens it (3C §4.3). Each layout
  // has a status page of its own, so crossing the line rebuilds it, and a popup open on it closes (§5.2, §5.3).
  if (sideBySide) {
    return <StatusScreen key="side-by-side" {...status} beside={<ScheduleView {...view} />} />
  }

  if (page.open) {
    return <SchedulePage {...view} onBack={page.back} />
  }

  return <StatusScreen key="one-column" {...status} onOpenSchedule={page.show} />
}

/** The airport whose weather the location card shows, or null when the card is hidden or the airport isn't in the list. */
function weatherPlace(snap: Snapshot | null, airports: AirportIndex, unit: TempUnit): WeatherPlace | null {
  const airport = snap && showsLocationCard(snap) ? airports.get(snap.status.airport) : undefined
  return airport ? { code: airport.iata, lat: airport.lat, lng: airport.lng, tz: airports.tz(airport.iata), unit } : null
}
```

- [ ] **Step 3: Replace `src/ui/Root.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { DEFAULT_SCENE, demoRawForScene, isDemoScene, type DemoScene } from '../data/demo'
import { buildSchedule } from '../engine/normalize'
import { scheduleFromStored } from '../partner/convert'
import { liveDoor, type PartnerDoor } from '../partner/door'
import { joinWithLink, type JoinOutcome } from '../partner/join'
import { browserLabel } from '../partner/label'
import { linkFromHash, type PartnerLink } from '../partner/link'
import { CONNECTED_NOTE, type JoinMessage } from '../partner/messages'
import { NotConnected, refreshSummary, SharingEnded } from '../partner/refresh'
import { clearOldSignIn, localPartnerStore, newKey, type PartnerStore, type StoredSummary } from '../partner/store'
import { currentQuickStatus, type PartnerSummary } from '../partner/summary'
import { useAirports } from './hooks/useAirports'
import { useSchedule } from './hooks/useSchedule'
import { PilotPages } from './PilotPages'
import { Connecting, Welcome } from './Welcome'

export interface RootProps {
  /** Crewlu Cloud's partner door, and where this browser keeps its connection. Tests pass fakes. */
  door?: PartnerDoor
  store?: PartnerStore
}

/** ?demo=1 shows the sample pilot with no network calls; otherwise this browser's own connection to its pilot. */
export function Root({ door = liveDoor, store }: RootProps) {
  const params = new URLSearchParams(window.location.search)
  if (params.get('demo') === '1') {
    const scene = params.get('scene')
    return <DemoApp scene={isDemoScene(scene) ? scene : DEFAULT_SCENE} />
  }
  return <PartnerRoot door={door} given={store} />
}

function DemoApp({ scene }: { scene: DemoScene }) {
  const airports = useAirports()
  // Anchor the scene once, at page load, so the countdowns run in real time instead of resetting on refresh.
  const anchor = useMemo(() => Date.now(), [])
  const schedule = useSchedule({ load: async () => buildSchedule({ ...demoRawForScene(scene, anchor), fetchedAt: Date.now() }, Date.now()) })
  if (!airports) return null
  return (
    <PilotPages schedule={schedule} airports={airports} demo onSignOut={() => { window.location.href = window.location.pathname }} />
  )
}

type Phase =
  | { kind: 'joining' }
  | { kind: 'welcome'; message: JoinMessage | null; ended: string | null }
  | { kind: 'connected'; notice: string | null }

const welcome = (message: JoinMessage | null = null, ended: string | null = null): Phase => ({ kind: 'welcome', message, ended })

/**
 * The invite or code in the address, if any (piece 5a §4.1). It then leaves the address, so the secret isn't left
 * showing and a reload doesn't join again; so does a /join address with no link. Any other fragment, such as the
 * Schedule page's #schedule, stays.
 */
function takeLinkFromAddress(): PartnerLink | null {
  const link = linkFromHash(window.location.hash)
  if (link || /^\/join(\.html)?\/?$/.test(window.location.pathname)) window.history.replaceState(null, '', '/')
  return link
}

/** "Switch to Sam?", as Crewluve asks it (SwitchQuestion), in this browser's words. */
const askSwitch = (newPilot: string, currentPilot: string) =>
  window.confirm(`Switch to ${newPilot}?\n\nYou'll stop seeing ${currentPilot}'s status in this browser.`)

/** Where a join leaves the page: the status, with a line about what happened, or the welcome screen with it. */
function after(outcome: JoinOutcome, store: PartnerStore): Phase {
  const connected = store.device() != null
  switch (outcome.kind) {
    case 'connected':
      return { kind: 'connected', notice: outcome.newDevice ? CONNECTED_NOTE : null }
    case 'cancelled':
      return connected ? { kind: 'connected', notice: null } : welcome()
    case 'failed':
      return connected ? { kind: 'connected', notice: outcome.message.text } : welcome(outcome.message)
  }
}

/** A browser's own connection: the welcome screen, joining, or its pilot's status (piece 5a §4, §5). */
function PartnerRoot({ door, given }: { door: PartnerDoor; given?: PartnerStore }) {
  const [store] = useState(() => given ?? localPartnerStore())
  // The link the address carries at load, read once.
  const [first] = useState(() => takeLinkFromAddress())
  const [phase, setPhase] = useState<Phase>(() => {
    clearOldSignIn()
    if (first) return { kind: 'joining' }
    return store.device() ? { kind: 'connected', notice: null } : welcome()
  })
  const joining = useRef(false)

  const join = async (link: PartnerLink) => {
    if (joining.current) return
    joining.current = true
    setPhase({ kind: 'joining' })
    const outcome = await joinWithLink(link, {
      door,
      store,
      label: browserLabel(navigator.userAgent, navigator.maxTouchPoints),
      confirmSwitch: askSwitch,
      makeKey: newKey,
    })
    joining.current = false
    setPhase(after(outcome, store))
  }

  useEffect(() => {
    if (first) void join(first)
    // A link pasted into the address bar while the page is open changes only the fragment.
    const onHashChange = () => {
      const link = takeLinkFromAddress()
      if (link) void join(link)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (phase.kind === 'joining') return <Connecting />
  if (phase.kind === 'welcome') return <Welcome message={phase.message} ended={phase.ended} onJoin={(link) => void join(link)} />
  return (
    <PartnerLive
      door={door}
      store={store}
      notice={phase.notice}
      onEnded={(name) => setPhase(welcome(null, name))}
      onDisconnected={() => setPhase(welcome())}
    />
  )
}

interface PartnerLiveProps {
  door: PartnerDoor
  store: PartnerStore
  notice: string | null
  /** Sharing ended (with the pilot's name as this partner saw them), or, with null, another tab disconnected. */
  onEnded: (pilotName: string | null) => void
  onDisconnected: () => void
}

/** The pilot's status: the kept summary at once, then the door's, every 30 s while the page shows (piece 5a §5). */
function PartnerLive({ door, store, notice, onEnded, onDisconnected }: PartnerLiveProps) {
  const airports = useAirports()
  // The summary on screen, beside the schedule made from it: the quick status comes from it (piece 5a §7).
  const shown = useRef<PartnerSummary | null>(null)
  const show = (stored: StoredSummary) => {
    const { schedule, summary } = scheduleFromStored(stored)
    shown.current = summary
    return schedule
  }
  const initial = useMemo(() => {
    const stored = store.summary()
    try {
      return stored ? show(stored) : null
    } catch {
      return null
    }
  }, [])
  const schedule = useSchedule({
    initial,
    load: async () => show(await refreshSummary(door, store)),
    onError: (err) => {
      if (err instanceof SharingEnded) onEnded(err.pilotName ?? 'your pilot')
      else if (err instanceof NotConnected) onEnded(null)
    },
  })

  const disconnect = async () => {
    const name = shown.current?.name ?? 'your pilot'
    const asked = `Disconnect from ${name}?\n\nYou'll stop seeing ${name}'s status in this browser. To connect again, open the invite link ${name} sent you.`
    if (!window.confirm(asked)) return
    const device = store.device()
    if (device) {
      try {
        await door.leave(device.key)
      } catch {
        // As in Crewluve: a device that couldn't leave would stay in the pilot's list with no key left to remove it.
        window.alert("Couldn't disconnect. Check your connection and try again.")
        return
      }
    }
    store.forget()
    onDisconnected()
  }

  if (!airports) return null
  return (
    <PilotPages
      schedule={schedule}
      airports={airports}
      demo={false}
      notice={notice}
      quickStatusAt={(now) => (shown.current ? currentQuickStatus(shown.current, now) : null)}
      onSignOut={() => void disconnect()}
    />
  )
}
```

- [ ] **Step 4: Update `tests/ui/hooks.test.tsx`**

Replace the four imports of `ScheduleCache`, `ScheduleFetchError`, `RawBuilder` and `RawSchedule` (lines 4–7) with:

```tsx
import { RawBuilder } from '../../src/data/rowBuilder'
import { buildSchedule } from '../../src/engine/normalize'
import type { Schedule } from '../../src/engine/types'
```

Change the `useSchedule` import to:

```tsx
import { REFRESH_MS, useSchedule, type ScheduleHandle, type UseScheduleOptions } from '../../src/ui/hooks/useSchedule'
```

Replace the `raw` and `memoryCache` helpers (lines 19–35) with:

```tsx
const sched = (fetchedAt: number): Schedule => buildSchedule({ ...new RawBuilder(0).build(), fetchedAt }, 0)
```

In `Probe`, change `s.raw?.fetchedAt` to `s.schedule?.fetchedAt`.

Replace the whole `describe('useSchedule', …)` block (lines 44–86) with:

```tsx
describe('useSchedule', () => {
  it('shows the schedule it starts with at once, then the fresh one', async () => {
    let resolve!: (s: Schedule) => void
    render(<Probe load={() => new Promise<Schedule>((r) => { resolve = r })} initial={sched(1)} />)
    expect(state()).toMatchObject({ fetchedAt: 1, lastSuccessAt: 1, refreshing: true })
    resolve(sched(2))
    await waitFor(() => expect(state()).toMatchObject({ fetchedAt: 2, lastSuccessAt: 2, problem: null, refreshing: false }))
  })

  it('starts with nothing when it is given nothing', () => {
    render(<Probe load={() => new Promise<Schedule>(() => {})} />)
    expect(state()).toMatchObject({ fetchedAt: null, lastSuccessAt: null, refreshing: true })
  })

  it('keeps the old schedule and reports trouble when a load fails', async () => {
    render(<Probe load={() => Promise.reject(new Error('down'))} initial={sched(1)} isOnline={() => true} />)
    await waitFor(() => expect(state()).toMatchObject({ fetchedAt: 1, problem: { kind: 'unreachable' }, refreshing: false }))
  })

  it('says offline when the browser is offline', async () => {
    render(<Probe load={() => Promise.reject(new Error('down'))} initial={sched(1)} isOnline={() => false} />)
    await waitFor(() => expect(state()).toMatchObject({ problem: { kind: 'offline' } }))
  })

  it('tells onError about a load that fails', async () => {
    const onError = vi.fn()
    const err = new Error('Sharing has ended')
    render(<Probe load={() => Promise.reject(err)} onError={onError} />)
    await waitFor(() => expect(onError).toHaveBeenCalledWith(err))
  })

  it('refreshes on its interval', async () => {
    let n = 0
    render(<Probe load={async () => sched(++n)} intervalMs={30} />)
    await waitFor(() => expect(state().fetchedAt).toBeGreaterThanOrEqual(2), { timeout: 1000 })
  })

  it("asks every 30 seconds by default: the partner door's poll", () => {
    expect(REFRESH_MS).toBe(30_000)
  })
})
```

In `describe('useSchedule, timing and cleanup', …)`, make these mechanical changes:
- `s.raw?.fetchedAt` → `s.schedule?.fetchedAt` (in `Grab`);
- every `raw(1)` → `sched(1)`;
- every `RawSchedule` → `Schedule`;
- delete every ` cache={memoryCache()}`;
- rename `'runs one fetch at a time'` to `'runs one load at a time'`;
- delete the test `'leaves the session alone for errors that are not about sign-in'`;
- replace the test `'ignores a fetch that fails after it unmounts'` with:

```tsx
  it('ignores a load that fails after it unmounts', async () => {
    let fail!: (err: unknown) => void
    const onError = vi.fn()
    const { unmount } = render(<Grab load={() => new Promise<Schedule>((_, reject) => (fail = reject))} onError={onError} />)
    unmount()
    fail(new Error('down'))
    await new Promise((r) => setTimeout(r, 0))
    expect(onError).not.toHaveBeenCalled()
  })
```

Check that nothing old is left:

```bash
grep -n "memoryCache\|RawSchedule\|ScheduleFetchError\|onAuthError\|s\.raw\|cache=" tests/ui/hooks.test.tsx
```

Expected: no output.

- [ ] **Step 5: Update `tests/ui/PilotPages.test.tsx`**

Add, after the `buildSchedule` import:

```tsx
import type { Schedule } from '../../src/engine/types'
```

Replace the `handle` helper (line 32) with:

```tsx
/** What useSchedule hands the pages: the schedule built from these rows, as the demo builds it. */
const handle = (raw: RawSchedule | null): ScheduleHandle => ({
  schedule: raw && buildSchedule(raw, NOW), lastSuccessAt: NOW, problem: null, refreshing: false, refresh: () => {},
})
```

Then:
- Rename the test `'shows the empty state for an account with nothing in CrewLu Cloud'` to `"shows the waiting state before the pilot's first update"`.
- In the test `'labels the footer button "Exit demo" in the demo and "Sign out" when live'`:
  - rename it to `'labels the footer button "Exit demo" in the demo and "Disconnect" when live'`;
  - change `{ name: 'Sign out' }` to `{ name: 'Disconnect' }`.
- Replace the test `'falls back to the title and footer when the rows cannot be read'` with:

```tsx
  it('falls back to the title and footer when the schedule cannot be read', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const unreadable = { ...buildSchedule(new RawBuilder(NOW).build(), NOW), trips: null } as unknown as Schedule
    render(<PilotPages schedule={{ ...handle(null), schedule: unreadable }} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CrewLuve')
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeTruthy()
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
```

Then add at the end of the file:

```tsx
describe('PilotPages: the notice and the quick status (piece 5a)', () => {
  it('shows the notice with the status, and before the first update', () => {
    const { unmount } = render(<PilotPages schedule={handle(demoRawForScene('home', NOW))} airports={testAirports} demo={false} onSignOut={() => {}}
      notice="Connected on this browser. Add it to your Home Screen to keep it handy." />)
    expect(screen.getByRole('status').textContent).toBe('Connected on this browser. Add it to your Home Screen to keep it handy.')
    unmount()
    render(<PilotPages schedule={handle(new RawBuilder(NOW).build())} airports={testAirports} demo={false} onSignOut={() => {}} notice="Couldn't connect. Check your connection and try again." />)
    expect(screen.getByRole('status').textContent).toBe("Couldn't connect. Check your connection and try again.")
    expect(screen.getByText("Waiting for your pilot's first update…")).toBeTruthy()
  })

  it('asks for the quick status at the moment shown, and puts it on the location card', () => {
    const quickStatusAt = vi.fn((now: number) => (now === NOW ? { text: 'Free to Talk', icon: 'bubble.left.fill', expiresAt: null } : null))
    const { container } = render(<PilotPages schedule={handle(demoRawForScene('home', NOW))} airports={testAirports} demo={false} onSignOut={() => {}}
      quickStatusAt={quickStatusAt} />)
    expect(quickStatusAt).toHaveBeenCalledWith(NOW)
    expect(container.querySelector('.location .quick-status')?.textContent).toBe('Free to Talk')
  })
})
```

- [ ] **Step 6: Replace `tests/ui/Root.test.tsx`**

```tsx
// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { localPartnerStore } from '../../src/partner/store'
import { Root } from '../../src/ui/Root'
import { example, fakeDoor, key, memoryStorage, PARTNER_A, PARTNER_B } from '../fixtures/partner'

// The airport list is a fixture, so these tests fetch nothing; every Crewlu Cloud call goes to the fake door.
vi.mock('../../src/ui/hooks/useAirports', async () => {
  const { testAirports } = await import('../fixtures/airports')
  return { useAirports: () => testAirports }
})

const CONNECTED_NOTE = 'Connected on this browser. Add it to your Home Screen to keep it handy.'
const SAM = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

/** Crewlu Cloud with Alex's two partners, A (who calls Alex "Dad") and B, and this browser's own storage. */
function setUp() {
  const f = fakeDoor()
  f.invites.set('invite-a', PARTNER_A).set('invite-b', PARTNER_B)
  f.codes.set('AB2C3D', PARTNER_A)
  f.summaries.set(PARTNER_A, { updatedAt: 'a1', status: example('display-names', 'A') })
  f.summaries.set(PARTNER_B, { updatedAt: 'b1', status: example('home', 'B') })
  const storage = memoryStorage()
  return { f, storage, store: localPartnerStore(storage) }
}

/** The same, with this browser already connected as partner B, which sees Alex. */
function connectedAsB() {
  const s = setUp()
  s.f.devices.set(key(1), PARTNER_B)
  s.store.saveDevice({ key: key(1), partnerId: PARTNER_B })
  s.store.saveSummary({ partnerId: PARTNER_B, updatedAt: 'b1', status: example('home', 'B'), checkedAt: Date.now() })
  return s
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Root: a browser that follows no one', () => {
  it('shows the welcome screen, and calls nothing', () => {
    const { f, store } = setUp()
    render(<Root door={f.door} store={store} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Welcome to CrewLuve')
    expect(f.calls).toEqual([])
  })

  it("deletes the password sign-in's leftovers", () => {
    localStorage.setItem('crewluve-auth', '{"access_token":"old"}')
    localStorage.setItem('crewluve.schedule.v1', '{}')
    const { f, store } = setUp()
    render(<Root door={f.door} store={store} />)
    expect([localStorage.getItem('crewluve-auth'), localStorage.getItem('crewluve.schedule.v1')]).toEqual([null, null])
  })

  it('joins with the invite link in the address, and takes the link out of the address', async () => {
    const { f, store } = setUp()
    window.history.replaceState(null, '', '/join#t=invite-a')
    render(<Root door={f.door} store={store} />)
    expect(screen.getByText('Connecting…')).toBeTruthy()
    expect(`${window.location.pathname}${window.location.hash}`).toBe('/')
    expect(await screen.findByText("Where's Dad?")).toBeTruthy()
    expect(screen.getByText(CONNECTED_NOTE)).toBeTruthy()
    expect(store.device()?.partnerId).toBe(PARTNER_A)
    expect(f.calls[0]).toMatch(/^join invite-a [0-9a-f]{64} /)
  })

  it('redeems the code typed into the boxes', async () => {
    const { f, store } = setUp()
    render(<Root door={f.door} store={store} />)
    fireEvent.input(screen.getByLabelText('Code'), { target: { value: 'ab2c3d' } })
    expect(await screen.findByText("Where's Dad?")).toBeTruthy()
    expect(f.calls[0]).toMatch(/^redeem AB2C3D /)
  })

  it("comes back to the welcome screen with the reason when a link doesn't connect", async () => {
    const { f, store } = setUp()
    window.history.replaceState(null, '', '/join#t=gone')
    render(<Root door={f.door} store={store} />)
    expect((await screen.findByRole('alert')).textContent).toBe("Invite Link Not Working This invite link doesn't work anymore. Ask your pilot to send it again.")
    expect(store.device()).toBeNull()
  })

  it('joins with a link that arrives in the address while the page is open', async () => {
    const { f, store } = setUp()
    render(<Root door={f.door} store={store} />)
    await act(async () => {
      window.history.replaceState(null, '', '/#t=invite-a')
      window.dispatchEvent(new Event('hashchange'))
    })
    expect(await screen.findByText("Where's Dad?")).toBeTruthy()
  })
})

describe('Root: a connected browser', () => {
  it('shows the kept summary at once, then asks only for a change', async () => {
    const { f, store } = connectedAsB()
    render(<Root door={f.door} store={store} />)
    expect(screen.getByText("Where's Alex?")).toBeTruthy()
    await waitFor(() => expect(f.calls).toEqual([`view ${key(1)} b1`]))
  })

  it("waits for the pilot's first summary", () => {
    const { f, store } = connectedAsB()
    f.summaries.delete(PARTNER_B)
    store.saveSummary({ partnerId: PARTNER_B, updatedAt: null, status: null, checkedAt: Date.now() })
    render(<Root door={f.door} store={store} />)
    expect(screen.getByText("Waiting for your pilot's first update…")).toBeTruthy()
  })

  it('goes back to the welcome screen, naming the pilot, when sharing ends', async () => {
    const { f, store } = connectedAsB()
    f.devices.clear() // the pilot removed this browser in CrewLu
    render(<Root door={f.door} store={store} />)
    expect(await screen.findByText('Sharing with Alex has ended.')).toBeTruthy()
    expect(store.device()).toBeNull()
  })

  it("keeps the status, and says why, when a link doesn't connect", async () => {
    const { f, store } = connectedAsB()
    window.history.replaceState(null, '', '/join#t=gone')
    render(<Root door={f.door} store={store} />)
    expect(await screen.findByText("This invite link doesn't work anymore. You're still connected to Alex.")).toBeTruthy()
    expect(screen.getByText("Where's Alex?")).toBeTruthy()
  })

  it("asks before following another pilot's link, and stays on a no", async () => {
    const { f, store } = connectedAsB()
    f.invites.set('invite-sam', SAM)
    f.summaries.set(SAM, { updatedAt: 's1', status: { ...example('home'), pilotId: 'SAM-PILOT', pilotFirstName: 'Sam' } })
    const confirm = vi.fn(() => false)
    vi.stubGlobal('confirm', confirm)
    window.history.replaceState(null, '', '/join#t=invite-sam')
    render(<Root door={f.door} store={store} />)
    expect(await screen.findByText("Where's Alex?")).toBeTruthy()
    expect(confirm).toHaveBeenCalledWith("Switch to Sam?\n\nYou'll stop seeing Alex's status in this browser.")
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_B })
  })
})

describe('Root: Disconnect', () => {
  it('asks first, and stays on a no', () => {
    const { f, store } = connectedAsB()
    const confirm = vi.fn(() => false)
    vi.stubGlobal('confirm', confirm)
    render(<Root door={f.door} store={store} />)
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(confirm).toHaveBeenCalledWith(
      "Disconnect from Alex?\n\nYou'll stop seeing Alex's status in this browser. To connect again, open the invite link Alex sent you.",
    )
    expect(screen.getByText("Where's Alex?")).toBeTruthy()
    expect(f.calls.some((call) => call.startsWith('leave'))).toBe(false)
  })

  it('leaves, forgets this browser, and shows the welcome screen', async () => {
    const { f, store } = connectedAsB()
    vi.stubGlobal('confirm', vi.fn(() => true))
    render(<Root door={f.door} store={store} />)
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(await screen.findByText('Welcome to CrewLuve')).toBeTruthy()
    expect(f.calls).toContain(`leave ${key(1)}`)
    expect([store.device(), store.summary()]).toEqual([null, null])
  })

  it('stays connected, and says so, when the leave gets no answer', async () => {
    const { f, store } = connectedAsB()
    vi.stubGlobal('confirm', vi.fn(() => true))
    const alert = vi.fn()
    vi.stubGlobal('alert', alert)
    render(<Root door={f.door} store={store} />)
    await waitFor(() => expect(f.calls.length).toBe(1)) // the first poll has answered
    f.network.down = true
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    await waitFor(() => expect(alert).toHaveBeenCalledWith("Couldn't disconnect. Check your connection and try again."))
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_B })
    expect(screen.getByText("Where's Alex?")).toBeTruthy()
  })
})

describe('Root: the demo', () => {
  beforeEach(() => window.history.replaceState(null, '', '/?demo=1&scene=flying'))

  it('shows the sample pilot, calls nothing, and keeps nothing on this browser', async () => {
    const { f, store, storage } = setUp()
    render(<Root door={f.door} store={store} />)
    expect(await screen.findByText("Where's Alex?")).toBeTruthy()
    expect(f.calls).toEqual([])
    expect(storage.data.size).toBe(0)
  })

  it('leaves the demo for the plain address', async () => {
    const { f, store } = setUp()
    render(<Root door={f.door} store={store} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Exit demo' }))
    await waitFor(() => expect(window.location.search).toBe(''))
  })
})
```

- [ ] **Step 7: Run the three files, then everything**

Run: `npx vitest run tests/ui/hooks.test.tsx tests/ui/PilotPages.test.tsx tests/ui/Root.test.tsx`. Expected: PASS.

If a Root test fails on timing (a `findBy…` that times out), don't loosen it. Find what the page shows instead with `screen.debug()`.

Run: `npx tsc --noEmit && npm test`.

Expected: PASS. The old sign-in's own tests still pass: they test modules nothing imports now. Task 11 removes them.

- [ ] **Step 8: Commit**

```bash
cd ~/Dev/"Crewluve Website"
git add src/ui/hooks/useSchedule.ts src/ui/PilotPages.tsx src/ui/Root.tsx tests/ui/hooks.test.tsx tests/ui/PilotPages.test.tsx tests/ui/Root.test.tsx
git commit -m "The live page follows the pilot through the partner door: the invite link, the welcome screen, a poll every 30 s, Disconnect (partner links piece 5a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 11: Remove the password sign-in and supabase-js

**Files:**
- Delete:
  - `src/auth/session.ts`, `src/auth/signInErrors.ts`;
  - `src/ui/SignIn.tsx`;
  - `src/data/fetchSchedule.ts`, `src/data/cache.ts`, `src/data/readOnlyFetch.ts`;
  - `src/supabase.ts`;
  - `tests/auth/` (4 files), `tests/ui/SignIn.test.tsx`;
  - `tests/data/fetchSchedule.test.ts`, `tests/data/cache.test.ts`, `tests/data/cacheBrowser.test.ts`;
  - `tests/data/readOnlyClient.test.ts`, `tests/data/readOnlyFetch.test.ts`;
  - `tests/supabase.test.ts`.
- Modify:
  - `src/cloud.ts`;
  - `package.json` and `package-lock.json`;
  - `tests/fixtures/sourceScan.ts`, `tests/data/readOnlyScan.test.ts`;
  - `tests/data/readOnly.test.ts` (rewritten).

- [ ] **Step 1: Check that nothing uses what goes**

```bash
cd ~/Dev/"Crewluve Website"
grep -rln "auth/session\|auth/signInErrors\|ui/SignIn\|data/fetchSchedule\|data/cache\|data/readOnlyFetch\|from '\.\./supabase'\|from '\./supabase'\|AUTH_STORAGE_KEY" src tests
```

Expected, and nothing else:
- the files this task deletes;
- `src/cloud.ts`;
- `tests/data/readOnlyScan.test.ts`, whose code samples mention `'../supabase'` inside strings;
- `tests/fixtures/sourceScan.ts` and `tests/data/readOnly.test.ts`, whose comments name the old guard; this task rewrites both.

If any other file appears, stop: it still needs the sign-in.

- [ ] **Step 2: Delete the sign-in, the old schedule fetch, the cache, the client and the old guard, with their tests**

```bash
cd ~/Dev/"Crewluve Website"
git rm -q src/auth/session.ts src/auth/signInErrors.ts src/ui/SignIn.tsx src/data/fetchSchedule.ts src/data/cache.ts src/data/readOnlyFetch.ts src/supabase.ts
git rm -q tests/auth/session.test.ts tests/auth/sessionFlow.test.ts tests/auth/sessionLoadFailure.test.ts tests/auth/signInErrors.test.ts tests/ui/SignIn.test.tsx
git rm -q tests/data/fetchSchedule.test.ts tests/data/cache.test.ts tests/data/cacheBrowser.test.ts tests/data/readOnlyClient.test.ts tests/data/readOnlyFetch.test.ts tests/supabase.test.ts
npm uninstall @supabase/supabase-js
git diff --stat package.json
```

Expected:
- `package.json`: 1 line removed, the dependency;
- `package-lock.json`: shrinks.

- [ ] **Step 3: Update `src/cloud.ts`**

Replace the first three comment lines with:

```ts
// The CrewLu Cloud project: the same URL and publishable key as the Flight Globe (crewlu-globe/src/supabase.ts).
// The publishable key is safe in a browser: the site calls only the four partner RPCs (src/partner/door.ts), and they
// answer only to a device's own key. vite.config.ts reads SUPABASE_URL for the CSP's connect-src, so the door and the
// CSP can't drift apart.
```

Then delete the blank line and the four lines of `AUTH_STORAGE_KEY` that follow `SUPABASE_PUBLISHABLE_KEY` (its comment and the `export`). Leave the two `export const` lines untouched.

- [ ] **Step 4: The final source rules, in `tests/fixtures/sourceScan.ts`**

Make these changes:

1. Replace the header comment (lines 1–6) with:

```ts
// Static checks over src/ for the partner door guarantee (piece 5a §9): the site reaches Crewlu Cloud only through the
// four partner RPCs.
//
// The guarantee itself is src/partner/doorGuard.ts: every request src/partner/door.ts sends passes through it. These
// checks keep it from being bypassed (a Supabase client, a raw POST from another file) and catch a write call before it
// ships. They parse with the TypeScript compiler instead of matching text, so comments, strings, line breaks, bracket
// access (`client['from']`) and spacing (`client.from (`) can neither hide a call nor fake one.
```

2. Delete the two lines that declare `SUPABASE_MODULE`, with their comment. Keep `DOOR_MODULE`.

3. In `interface Facts`, replace the comment on `touchesClient` with:

```ts
  /** The file imports a Supabase package or calls `.from(`: it would work with a Crewlu Cloud client. */
```

4. In `factsOf`, replace the `importsClient` line with:

```ts
  const importsClient = imports.some((i) => i.specifier?.startsWith('@supabase/') === true)
```

5. In `violations`, replace the `@supabase/` branch with:

```ts
    } else if (ref.specifier.startsWith('@supabase/')) {
      found.push(`${path} imports ${ref.specifier}; the site has no Supabase client: it reaches Crewlu Cloud only through ${DOOR_MODULE}`)
    }
```

6. In `violations`, replace the two messages in the member loop with:

```ts
      found.push(`${path}:${r.line} uses .${r.name}, which only a Supabase client has; the site reaches Crewlu Cloud only through the partner door`)
```

and:

```ts
      found.push(`${path}:${r.line} calls .${r.name} in a file that queries tables; the site never writes`)
```

7. In `networkProblems`, replace the fetch branch with:

```ts
    } else if (ts.isCallExpression(n) && isFetchCallee(n.expression) && path !== DOOR_MODULE) {
      const problem = fetchProblem(n)
      // src/partner/door.ts passes the page's fetch to the door guard, which lets only the four partner RPCs through.
      if (problem) found.push(`${path}:${lineOf(sf, n)} calls fetch ${problem}; only ${DOOR_MODULE} may send more than a plain GET`)
    }
```

8. Also in `networkProblems`, replace `the site makes plain GET fetches only` in the Request message with `the site's fetches are plain calls it can check`.

Then check that nothing old is left:

```bash
grep -n "SUPABASE_MODULE\|readOnlyFetch\|supabase\.ts" tests/fixtures/sourceScan.ts
```

Expected: no output.

- [ ] **Step 5: Update `tests/data/readOnlyScan.test.ts`**

1. Replace the comment above `BYPASSES` with:

```ts
// The ways around a network guard that a code review found. Each must be flagged by the source rules; the partner door
// guard refuses anything else at the network (tests/partner/doorGuard.test.ts).
```

2. In `'the source rules leave ordinary code alone'`, delete these two rows: they describe the client, which is gone.
   - `'type-only imports of the client module'`;
   - `'the sign-in calls the site makes'`.

3. Replace the test `'treats a Set.delete in a file that imports the client as a write, so keep them apart'` with:

```ts
  it('treats a Set.delete in a file that queries a table as a write, so keep them apart', () => {
    const code = `export const f = (c: any, s: Set<number>) => { s.delete(1); return c.from('trips') }`
    expect(violations('src/ui/Mixed.ts', code).join('\n')).toMatch(/\.delete/)
  })
```

4. In `describe('touchesClient', …)`, replace the first test with:

```ts
  it('is true for a file that imports a Supabase package or queries with .from(', () => {
    expect(touchesClient('src/data/x.ts', `import { createClient } from '@supabase/supabase-js'`)).toBe(true)
    expect(touchesClient('src/data/x.ts', `export const f = () => import('@supabase/supabase-js')`)).toBe(true)
    expect(touchesClient('src/data/x.ts', `export const q = (c: any) => c.from('trips')`)).toBe(true)
    expect(touchesClient('src/data/x.ts', `export const q = (c: any) => c['from']('trips')`)).toBe(true)
  })
```

5. Leave `describe('the import graph', …)` as it is. Its `src/supabase.ts` is a made-up file name in its own sources.

- [ ] **Step 6: Replace `tests/data/readOnly.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DOOR_MODULE, fromCallers, importersOf, importsOf, parse, rel, sourceFiles, violations } from '../fixtures/sourceScan'

// The guarantee itself is src/partner/doorGuard.ts: src/partner/door.ts sends every Crewlu Cloud request through it, and
// tests/partner/doorGuard.test.ts shows it refusing everything but the four partner RPCs. The rules below stop code
// from going around the door (a Supabase client, a raw POST) or calling writes in the first place. They scan src/ from
// this file's location, so they work whatever directory the tests run from.
const sources: Record<string, string> = Object.fromEntries(sourceFiles().map((file) => [rel(file), readFileSync(file, 'utf8')]))

describe('the partner door is the only way to Crewlu Cloud (piece 5a §9)', () => {
  it.each(Object.keys(sources))('%s has no client, no raw POST and no injected HTML', (path) => {
    expect(violations(path, sources[path])).toEqual([])
  })

  it('queries no table', () => {
    expect(fromCallers(sources)).toEqual([])
  })

  it('imports no Supabase package', () => {
    const importers = Object.keys(sources).filter((path) => importsOf(parse(sources[path], path)).some((i) => i.specifier?.startsWith('@supabase/')))
    expect(importers).toEqual([])
  })

  it("sends the door module's calls through the door guard", () => {
    expect(importsOf(parse(sources[DOOR_MODULE], DOOR_MODULE)).map((i) => i.specifier)).toContain('./doorGuard')
    expect(sources[DOOR_MODULE]).toMatch(/doorFetch\(send\)/)
  })

  it('lets only the door module use the door guard', () => {
    expect(importersOf('src/partner/doorGuard.ts', sources).map((i) => i.path)).toEqual([DOOR_MODULE])
  })
})
```

- [ ] **Step 7: Run everything, the type check, and the build**

Run: `npx tsc --noEmit && npm test`. Expected: PASS.

Run: `npm run build`. Expected: it builds.

Run: `grep -l "auth/v1\|signInWithPassword" dist/assets/*.js`. Expected: no output: the bundle has no Supabase client.

- [ ] **Step 8: Commit**

```bash
cd ~/Dev/"Crewluve Website"
git add src/cloud.ts package.json package-lock.json tests/fixtures/sourceScan.ts tests/data/readOnlyScan.test.ts tests/data/readOnly.test.ts
git commit -m "The password sign-in goes, with the table reads, the schedule cache, supabase-js and the old guard; the source rules guard the partner door (partner links piece 5a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

The `git rm` in Step 2 already staged the deletions; this commit takes them too.

---

### Task 12: `/join` is the app; the page's tags

**Files:**
- Modify:
  - `vite.config.ts`, `index.html`;
  - `tests/viteConfig.test.ts`;
  - `tests/joinPage.test.ts` (rewritten).
- Delete: `public/join.html`.

- [ ] **Step 1: Write the failing tests**

In `tests/viteConfig.test.ts`:
- add, at the top:

```ts
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
```

- rename the test `'lets the app reach the CrewLu Cloud project the client uses, and Open-Meteo for the weather, and nothing else'` to `'lets the app reach the CrewLu Cloud project the partner door calls, and Open-Meteo for the weather, and nothing else'`;
- add at the end:

```ts
describe('the /join page (piece 5a §4.1)', () => {
  const joinPage = findPlugin(config.plugins ?? [], 'crewluve-join-page')!
  const writeBundle = joinPage.writeBundle as unknown as (options: { dir?: string }) => void

  it('is made only by the build', () => {
    expect(joinPage.apply).toBe('build')
  })

  it('is an exact copy of the built index.html, so it runs the same bundle under the same CSP', () => {
    const dir = mkdtempSync(join(tmpdir(), 'crewluve-join-'))
    const built = '<!doctype html><meta http-equiv="Content-Security-Policy" content="x" /><script type="module" src="/assets/index-abc.js"></script>'
    writeFileSync(join(dir, 'index.html'), built)
    writeBundle({ dir })
    expect(readFileSync(join(dir, 'join.html'), 'utf8')).toBe(built)
  })
})
```

Replace `tests/joinPage.test.ts` with:

```ts
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Partner links piece 5a §4.1: /join is the app itself, a copy of the built index.html (vite.config.ts,
// crewluve-join-page). So index.html carries what the static page had: no search results, no referrer, and the preview
// card Messages shows for an invite link. And Safari's banner for Crewluve, the only place alerts come (P5-7).
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

describe('the /join page', () => {
  it('is no longer a page of its own', () => {
    expect(existsSync(new URL('../public/join.html', import.meta.url))).toBe(false)
  })

  it('stays out of search results and sends no referrer', () => {
    expect(html).toContain('<meta name="robots" content="noindex" />')
    expect(html).toContain('<meta name="referrer" content="no-referrer" />')
  })

  it('gives Messages a preview card for invite links: title, line and the heart', () => {
    expect(html).toContain('<meta property="og:title" content="CrewLuve" />')
    expect(html).toContain('<meta property="og:description" content="Stay connected with your pilot" />')
    // Link previews need an absolute address for the image.
    expect(html).toContain('<meta property="og:image" content="https://crewluve.crewlu.net/icons/heart-256.png" />')
  })

  it("offers Crewluve in Safari's banner, since only the app gets alerts (P5-7)", () => {
    expect(html).toContain('<meta name="apple-itunes-app" content="app-id=6759344060" />')
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/viteConfig.test.ts tests/joinPage.test.ts`

Expected: FAIL:
- there's no `crewluve-join-page` plugin;
- `public/join.html` still exists;
- the four tags are missing from `index.html`.

- [ ] **Step 3: Add the plugin to `vite.config.ts`**

At the top, before `import { defineConfig } from 'vite'`, add:

```ts
import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
```

In `plugins`, after the `crewluve-csp` plugin's closing `},`, add:

```ts
    {
      // /join is the app itself (partner links piece 5a §4.1): an invite link opened anywhere but in Crewluve joins in
      // the browser. GitHub Pages serves join.html for /join, and an exact copy runs the same bundle under the same CSP.
      name: 'crewluve-join-page',
      apply: 'build',
      writeBundle(options) {
        const dir = options.dir ?? 'dist'
        copyFileSync(join(dir, 'index.html'), join(dir, 'join.html'))
      },
    },
```

- [ ] **Step 4: Add the tags to `index.html`**

After `<meta name="robots" content="noindex" />`, add:

```html
    <!-- An invite link's secret is in the fragment, which is never sent; this keeps the rest of the address home too. -->
    <meta name="referrer" content="no-referrer" />
    <!-- Safari's banner for Crewluve, the only place alerts come (partner links piece 5a P5-7). -->
    <meta name="apple-itunes-app" content="app-id=6759344060" />
    <!-- The preview card Messages builds when the pilot texts an invite link: /join is this page (piece 5a §4.1). -->
    <meta property="og:title" content="CrewLuve" />
    <meta property="og:description" content="Stay connected with your pilot" />
    <meta property="og:image" content="https://crewluve.crewlu.net/icons/heart-256.png" />
```

- [ ] **Step 5: Delete the static page**

```bash
cd ~/Dev/"Crewluve Website"
git rm -q public/join.html
```

- [ ] **Step 6: Run the tests, then the build, and compare the two pages**

Run: `npx vitest run tests/viteConfig.test.ts tests/joinPage.test.ts tests/indexHtml.test.ts tests/appLinkFile.test.ts`. Expected: PASS.

```bash
cd ~/Dev/"Crewluve Website"
npm run build
cmp dist/index.html dist/join.html && echo "join.html is index.html"
grep -c 'http-equiv="Content-Security-Policy"' dist/join.html
test -f dist/.well-known/apple-app-site-association && echo "app-link file kept"
```

Expected:

```
join.html is index.html
1
app-link file kept
```

- [ ] **Step 7: Run everything, then commit**

Run: `npx tsc --noEmit && npm test`. Expected: PASS.

```bash
cd ~/Dev/"Crewluve Website"
git add vite.config.ts index.html tests/viteConfig.test.ts tests/joinPage.test.ts
git commit -m "/join is the app: the build copies index.html to join.html; the page carries the preview card, no referrer, and Safari's banner for Crewluve (partner links piece 5a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Check it all locally

**Files:** none changed.

- [ ] **Step 1: The full suite, the type check and the build, from clean**

```bash
cd ~/Dev/"Crewluve Website"
rm -rf dist
npm test 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

Expected:
- every test passes; note the counts;
- the build finishes with no type errors.

- [ ] **Step 2: Look at the built site in the browser pane**

Start the built site with `preview_start` and the name `crewluve-preview`. It's in `.claude/launch.json`: `npm run preview`, port 5181. Then:

1. Open `http://localhost:5181/`. Expected: the welcome screen: "Welcome to CrewLuve", the paste box, the six code boxes, and Try Demo.
2. Type `hello` into the paste box, then click Connect. Expected: "Not an Invite Link That doesn't look like an invite link."
3. Open `http://localhost:5181/join`. Expected: the address becomes `http://localhost:5181/`, with the welcome screen.
4. Open `http://localhost:5181/?demo=1`. Expected: "Where's Alex?", the demo banner, and an "Exit demo" button in the footer.
5. Read the console's errors (`read_console_messages`, errors only). Expected: none, and in particular no Content-Security-Policy violation.
6. Take a screenshot of the welcome screen for the user.

**Don't** type a code, or open an address with `#t=` or `#c=`: those reach the real Crewlu Cloud. The user's checks in Task 14 do that, with a real invite.

Stop the server with `preview_stop`.

- [ ] **Step 3: Show the user**

Tell the user, in a few lines:
- what passed: the test counts, the build, and that `join.html` is the same page;
- the screenshot.

Then go to Task 14.

---

### Task 14: The user's checks with a real invite, then the push

**Who:**
- **The user:** Steps 1–7 and 10, on their own devices. They use the iPhone's CrewLu build from Xcode, signed in to Crewlu Cloud. Their account and partners are test data.
- **The agent:** Steps 8 and 9, with the user's yes.

Give the user each step click by click, and wait for their result before the next.

- [ ] **Step 1 (the user): Run the built site where the phone can reach it too**

In Terminal, from the website folder:

```bash
cd ~/Dev/"Crewluve Website" && npm run build && npm run preview -- --host
```

It prints a "Network" address, such as `http://192.168.1.20:5181/`. Keep it running.

- [ ] **Step 2 (the user): Make a test invite**

1. In CrewLu on the iPhone, open the gear, then **Partner Sharing**.
2. Add a person named **Web test**.
3. Tap **Share Invite Link**, then **Copy**.
4. Get the link to the Mac, for example by pasting it into a note.
5. Also send it to yourself in Messages, and wait for its preview card. Expected: in CrewLu, **Web test** still lists no device. A preview mustn't join.

- [ ] **Step 3 (the user): Join in Chrome and in Safari on the Mac**

1. In Chrome, paste the link into the address bar.
2. Change `https://crewluve.crewlu.net` to `http://localhost:5181`, keeping everything from `/join#t=` on, and press Return.
3. Expected:
   - "Connecting…" for a moment;
   - then "Where's {your name}?", with "Connected on this browser. Add it to your Home Screen to keep it handy.";
   - in CrewLu, **Web test** lists the device **Chrome on Mac**.
4. Do the same in Safari. Expected: **Safari on Mac** in the list.

- [ ] **Step 4 (the user): Join on the iPhone, in Safari**

1. Open the Network address from Step 1, with the link's `/join#t=…` on the end.
2. Expected: your status.
3. Safari's "Get the app" banner for Crewluve may show only on the real site. Step 10 checks it there.
4. Tap Share, then **Add to Home Screen**, then open CrewLuve from the Home Screen. Note whether it shows your status or the welcome screen. iPhones may keep a Home Screen site's storage apart from Safari's. If it shows the welcome screen, the note "Add it to your Home Screen to keep it handy." needs new wording before the push.

- [ ] **Step 5 (the user): A code from Crewluve**

1. On a device with Crewluve connected, open **Use on Another Device** to show its 6-letter code.
2. In Safari on the Mac, click the footer's left button, **Disconnect**, then **OK**. Expected: the welcome screen.
3. Type the code into the six boxes. Expected: it connects on the sixth letter, as that partner.

- [ ] **Step 6 (the user): The code boxes on a phone**

The Mac can't show these: phones handle the hidden code field their own way. A code connects once, so make a new one for each part.

On the iPhone, in Safari, at the Network address:
1. Tap the footer's **Disconnect**, then **OK**. Expected: the welcome screen.
2. Tap the boxes. Expected:
   - the keyboard opens, and the page doesn't zoom in;
   - on a small phone, the page scrolls so the boxes stay in view above the keyboard.
3. Turn on VoiceOver and touch the boxes. Expected: it says "Code". Turn VoiceOver off.
4. In Crewluve, open **Use on Another Device**, and copy its code.
5. Back in Safari, touch and hold the boxes, then tap **Paste**. Expected: **Paste** shows, and it connects as that partner.
6. Disconnect again, make a new code, and type it, tapping the first box after the third letter. Expected: every letter goes on the end, and Backspace takes off the last one.

If you can, also tap the invite link where an app opens it in its own browser:
- from Gmail;
- from a Meta app (Messenger, Instagram or Facebook).

Try it on an iPhone with Crewluve, and on one without. Note:
- whether Crewluve, Safari or the app's own browser opens it;
- whether a device appears under **Web test**.

A partner who joins inside an app's browser is connected only there.

If there's an Android phone, in Chrome at the Network address:
1. Disconnect, then type a new code in lower case, with a space after the third letter. Expected: capitals in the boxes, no space, and it connects on the sixth letter.
2. Partway through another code, tap the first box, then type the rest. Expected: every letter goes on the end.
3. With TalkBack on, touch the boxes. Expected: it says "Code".

- [ ] **Step 7 (the user): Sharing ends**

1. In CrewLu, open **Web test**, then remove the device **Chrome on Mac**.
2. Expected: within 30 seconds, Chrome shows the welcome screen with "Sharing with {your name} has ended."

If any step goes wrong, stop. Fix it under `superpowers:systematic-debugging`, then do the step again.

Before the push, settle these with the user, from the reviews:
- **Joining by itself, or a Connect button:**
  - Today a link joins as soon as the page shows. An automated browser, such as a mail scanner, is skipped, and a page in the background waits until it's shown.
  - A Connect button on every link would also stop scanners that pass as a person. It's one more tap for every partner.
- **The Home Screen note's wording,** from Step 4.4, and its sense on a computer.

Settled with the user on 2026-10-27:
- **Joining:** a link still joins by itself.
- **The note:** it depends on the device (a20ff76, spec §4.3). An iPhone or iPad is sent to the CrewLuve app, because Step 4.4 showed that a site on its Home Screen starts unconnected. Android keeps the Home Screen line, and a computer gets a bookmark.
- **The wording:** the two lines that send people to their pilot say to update CrewLu (b5226da, spec §8). "Can't Stay Connected" stays as it is.
- **When to push:** after 3.1.0 is approved, right before it's released (spec §12). Crewlu Cloud's logs showed someone on an Android phone still using the password sign-in.

- [ ] **Step 8: Push, with the user's fresh yes**

This waits until 3.1.0 is approved, and goes right before 3.1.0 is released (spec §12). By then `main` may have moved: the Crewluve releases commit their notes there. If it has, bring it into this branch first, run the checks again, and rebuild.

Show the user what will go:

```bash
cd ~/Dev/"Crewluve Website"
git fetch -q origin && git log --oneline origin/main..main
```

Tell them:
- the push deploys the site;
- from that moment the password sign-in stops working;
- partners connect with their invite links instead.

Wait for a clear yes, then:

```bash
cd ~/Dev/"Crewluve Website"
git push origin main
```

`docs/superpowers/plans/2026-10-26-partner-links-piece2-release.md` stays untracked; don't add it.

- [ ] **Step 9: Check the deploy and the live site**

Browsers may show the old `/join` page for up to 10 minutes after the deploy, since Pages caches pages that long. Add `?cb=1` before the `#` to get past it.

1. About three minutes after the push, check once:

```bash
gh run list --repo skimmer747/crewluve-web --workflow deploy-pages.yml --limit 1
```

   Expected: `completed  success`. If it failed, read it with `gh run view --repo skimmer747/crewluve-web --log-failed`, and tell the user.

2. In the browser pane:
   - Open `https://crewluve.crewlu.net/`. Expected: the welcome screen, with no sign-in form.
   - Open `https://crewluve.crewlu.net/join`. Expected: the address becomes `/`, with the welcome screen.
   - Open `https://crewluve.crewlu.net/.well-known/apple-app-site-association`. Expected: the JSON for `/join`.

- [ ] **Step 10 (the user): The real link, live**

1. On the Mac, open the **Web test** invite link as it is, on `https://crewluve.crewlu.net`. Expected: it connects.
2. On an iPhone without Crewluve, open the link in Safari. Expected: it connects, with Safari's banner for Crewluve at the top.
3. On the iPhone with Crewluve, tap the link in Messages or Notes. Expected: it still opens Crewluve, not Safari.
4. Then, in CrewLu, remove **Web test**, or keep it for later checks.

---

### Task 15: Hand back to CrewLu 3.1.0

**Files:**
- Modify (the agent):
  - `docs/superpowers/plans/2026-10-26-partner-links-piece2-release.md` (untracked; don't commit it);
  - the memory file for piece 5a.
- Modify (later, in `~/Dev/Duty`, by the release plan, with the user's yes on each wording):
  - the What's New card;
  - the App Store notes;
  - the Partner Sharing help.

- [ ] **Step 1: Record it in the release plan**

Under "Changes after Task 5", add a line:
- website piece 5a went live on {date}, at commit {short sha};
- partners on Android or a computer now connect with their invite link;
- 3.1.0 is no longer on hold for it.

- [ ] **Step 2: Offer the user the CrewLu wording, for their yes, one at a time**

1. **What's New card, row 1** (`WhatsNewContent.swift`, "A link for each person"):

   > Open the gear, then Partner Sharing, and invite each person with their own link. It opens Crewluve on an iPhone or iPad, and the Crewluve website on any other phone or computer. Needs a Crewlu Cloud account.

2. **App Store notes, 3.1.0:**

   > Partner Sharing moves to Crewlu Cloud. Invite each person with their own link: they see your status in Crewluve on an iPhone or iPad, or on the Crewluve website on Android or a computer. See who's connected, remove a device anytime, and send a quick status to one person or to everyone.

3. **Partner Sharing help** (`PartnerSharingView.swift`):
   - **Around line 1335:** "Crewluve App Required" becomes **"Crewluve or Any Browser"**. Its description becomes "Your partner sees your status in the free Crewluve app on an iPhone or iPad, or in a web browser on any other phone or computer."
   - **Around 1818–1819:** "Install Crewluve" becomes **"Get Crewluve"**. Its text becomes "On an iPhone or iPad, your partner gets the free Crewluve app from the App Store. On Android or a computer, the invite link opens in the browser, with nothing to install."
   - **Around 1829 and 2103:** after "When they tap it on their iPhone or iPad, Crewluve connects by itself", add " On any other phone or computer, it connects in the browser."
   - **Around 2096:** "They just need to install the free Crewluve app." becomes "They just need the free Crewluve app, or a web browser."
   - **Around 2138:** "Partner Sharing is free during the beta for Pro subscribers…" still says beta. Ask the user whether it should change.

- [ ] **Step 3: Update the memory file for piece 5a**

Record:
- that it's live;
- the commit;
- the device checks' results;
- that the CrewLu wording above waits for the user in the release plan.

---

## Execution notes (2026-10-26)

**How it was built:**
- **Method:** subagent-driven, on `partner-links-piece5a`, cut from `main` at 1dc7184.
- **Reviews:** each task had a spec review and a quality review. Their fixes are the "after review" commits, and fixes were re-reviewed until approved.
- **Tests:** mutation checks confirmed the new tests fail when the behaviour they pin is removed.
- **A whole-branch review** came last.

**Commits, by task**

| Task | Built | After review |
|---|---|---|
| 1, the summary reader | 4abbee3 | d5c14cd, ed2ae58 |
| 2, the store | a877842 | c20054c |
| 3, the converter | b0fb04a | 8948d49 |
| 4, links, labels and messages | df2f33d | 9868954, 4cba69c |
| 5, the door guard and the door | 21f48c2 | ec08b14, ad6e455, 0cf7139 |
| 6, joining | 09ef8bc | ecbda44, 343adbb |
| 7, refreshing | 8458b0e | f8833a6, cfa9332 |
| 8, quick status, notice, waiting text | 5e1b261 | 9bff806, eb09d57 |
| 9, welcome and connecting | 041614b | 0e7ab3e, 30a580b; Root test 91d40ee |
| 10, the switch-over | 9ce6ae5 | 296c2b1, 8222847, 24b0e88 |
| 11, the sign-in removed | e428d65 | e7fa4c6, c769cd7, 470b957, cd417b6, 3675e5f, b2d4e71, 1530be1 |
| 12, `/join` is the app | 177f337 | 970c33d |
| Docs | 689010a, beabc9b, 8d2cfca, a0d00ca, 9f3b3be, and the commit that added the Task 14 notes | |
| The whole-branch review | | 44901e3, 509b66c, ef90100, 0de163e, 9b6342b, 65f9376 |
| Task 14, from the user's device checks | | e3fd4c2: a bare invite token joins; a1de0b4: a pasted link is read for exactly the door's lengths; a20ff76: the connected note depends on the device; b5226da: the two lines name the CrewLu update |

**What changed from the plan.** Each change is also in the spec's "Amended again" list.
- **Joining (6):** a connected key that the pilot freed is demoted at once. An `unchanged` or unreadable first read is Couldn't Connect. Cancel doesn't wait.
- **Refreshing (7):** the race check compares the partner too. An answer for another partner is followed, at most once per poll.
- **The code field (9):**
  - It's opaque, with transparent parts, so iOS keeps Paste.
  - It's uncontrolled, so Android keyboards don't double letters.
  - The caret stays at the end, while a selection the person made is kept.
  - Pieces of a link are refused.
  - A repeated problem is a new alert.
  - The small labels and the error use the primary text color.
- **Root (10):**
  - Disconnect runs once at a time, and keeps a device a join connected while its leave was out.
  - A followed door clears a stale line.
  - One live region reads what changes.
  - The demo clears the old sign-in.
  - The join has a safety net.
  - A link in the address joins only for a person: an automated browser skips it, and a hidden or prerendered page waits until it's shown.
- **The source rules (11):**
  - Only `src/cloud.ts`, the door and its guard know Crewlu Cloud's address.
  - The client-era rules went.
  - HTML sinks are found by parsing.
  - Workers are refused.
  - The CSP's `connect-src` lists the four RPC addresses.
  - `rows.ts`'s `COLUMNS` and the footer's sign-out names went.
  - The test files were renamed: `tests/data/readOnly.test.ts` is now `doorRules.test.ts`, and `readOnlyScan.test.ts` is now `doorRulesScan.test.ts`. The tasks above still use the old names.
- **`/join` (12):**
  - The build also writes `404.html`.
  - It fails loudly without an output folder.
  - The deploy compares the copies and checks the tags.
  - The page has a `<noscript>` line.
- **The whole-branch review:**
  - The welcome screen says "No link yet? Ask your pilot to invite you from Settings → Partner Sharing in CrewLu."
  - A browser that used the password sign-in is told once that it has ended.
  - A bare code works in the paste box.
  - Blocked site data says "Can't Stay Connected".
  - The subtitle and "Connecting…" use the primary text color.
  - The test fixtures' fake door uses codes up as the server does.
- **The device checks (14):**
  - A bare invite token joins.
  - A pasted link is read for exactly 32 hex characters or a code's six. iOS had pasted CrewLu's message and link glued together, and the old pattern took "Tap" into the token.
  - The connected note depends on the device.
  - "No link yet?" and the password note say to update CrewLu.
- **Tests:**
  - Fixtures read their files by path: under happy-dom, Vite rewrites `new URL('./x', import.meta.url)` as a web asset's address.
  - happy-dom reports `navigator.webdriver` as true, so the Root tests stub it false.

**Test count:** 2,467 before Task 10; 2,353 after the whole-branch review; 2,380 after Task 14's fixes. Task 11 took out the sign-in's 243 tests.

**Task 13:** passed at b2d4e71 and again at 9b6342b. 2,346 tests passed, the build was clean, and `join.html` and `404.html` were the same as `index.html`. In the browser pane: the welcome screen, "Not an Invite Link", `/join` and `/join/` going to `/`, and the demo. There were no console errors, and the CSP blocked a table read.

**Task 14:** the user's device checks on 2026-10-26 and 2026-10-27, with a "Web Test" invite made in CrewLu:
- **Steps 2 and 3 passed.** Messages' link preview added no device. Chrome and Safari on the Mac joined, and CrewLu listed both.
- **Step 4: the iPhone's first paste failed.** CrewLu's share-sheet Copy put its message and the link on the clipboard as two items, and Safari pasted them glued together. Two fixes followed:
  - the website reads a link for exactly the door's lengths (a1de0b4);
  - CrewLu's Copy takes the link alone (CrewLu 1894a9dd, on its release line).

  The retry joined. The request reached Crewlu Cloud, so the CSP works in WebKit.
- **Step 4.4:** the copy of the site on the iPhone's Home Screen showed the welcome screen, because it keeps storage of its own. Hence the note per device (a20ff76).
- **Step 5 passed:** a CrewLuve code connected Safari on the Mac. An open tab keeps running the page it loaded, so after a rebuild it needs a reload.
- **Step 6 passed:** the iPhone's code boxes, with Paste and typing, and the app line after connecting.
- **Step 7 passed:** removing Chrome on Mac in CrewLu brought up "Sharing with … has ended" in Chrome.
- **Not done:** the optional checks in apps' own browsers and on Android.
- **Found in CrewLuve, not here:** its ••• → Use on Another Device opened only after many taps on iOS 27.2. That's tracked separately.
