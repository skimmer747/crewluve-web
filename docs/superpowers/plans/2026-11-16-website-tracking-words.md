# The Website's Tracking Words Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A plane out of reach of the receivers reads "Out of tracking range" and "Last tracked" on the website, never "seen", as in the app, so no family fears it's missing. Where what's below is the place the plane was last tracked over, the card's sentence for screen readers says it once. Then this plan goes live, on Todd's yes.

**Architecture:**
- **The words** stay where they are: the faded plane's popup in `planePopupWords` (`src/copy/planePopup.ts`), the facts' line under what's below in `lastSeenLine` (`src/copy/facts.ts`), and the card's sentence in `liveSummary` (`src/copy/tripMap.ts`). The code's names keep "seen", as they say what the receivers saw, as the app's do.
- **The place said once:** `cardSummary` (`src/facts/tripFacts.ts`) leaves out what's below where it's the same place (`samePlace`) the plane was last tracked over, with no city by its last fix.
- **The design that quotes the words,** the which plane design's table of the popup's words, follows.

**Tech Stack:** Preact 10, TypeScript 5.9 (strict), Vite 5, Vitest 3. No new package.

**Sources (read only):**
- **The app's plan,** in the Crewluv repo (`~/Dev/Crewluv`): `docs/superpowers/plans/2026-11-16-tracking-words-and-the-schedule.md`, its header and its Task 2 ("Out of tracking range" and "Last tracked"), as the file stood on the evening of 16 Nov 2026. It isn't committed there yet: read it from the file. Its Tasks 3 and 4 the website has already: "about" on the Schedule page (plan 3C-3), a real path's story made again for a new home, and the banner centred beside a side panel (plan 3C-4).
- **Todd's choice (16 Nov 2026),** as the app's plan has it:

  > "Tracking": the popup's "Out of tracking range since 7:41 PM, so it's shown where it should be by now", and the facts' "Last tracked over the Bering Sea · 3 h 41 min ago". "Not seen since" and "Last seen" could make a family fear the plane was missing. It's the receivers that lose it, not air traffic control.

  He said the website gets the same words.

**How this plan was checked.** Every code block here comes from a file that was run before the plan was put together. None was typed into the plan by hand: a script made each replacement from the tested files and built the plan.
- **A scratch copy of this branch** at `b3e3c15` (what's live on `main`), with this plan's files laid over it.
  - Before: 177 test files and 3,702 tests, all passing, and `tsc --noEmit` clean.
  - With this plan: 177 test files and 3,704 tests, all passing. `tsc --noEmit` finds nothing, and `npm run build` builds.
  - The shared cases (`live-cases.json`, `facts-cases.json`) are unchanged, and pass: neither has the words.
- **Tests first:** Task 2's tests were run before its code, and failed as its Step 2 says: 9 of 119.
- **15 deliberate breaks** were made in the new code, one at a time, and every one fails at least one test: each of the old words put back ("Not seen since", "drawn", "Last seen" near a city, over a place and alone, and ", last seen"); the popup's line, or the facts line's place, dropped; where it was last tracked left out of the card's sentence; the place said twice; what's below dropped whenever the plane is out of range, or by a city too; the names, or the spoken words, compared in place of the places; and the place said once while the plane is tracked.
- **The plan itself** is checked by a script: Task 2's steps, followed in order on the branch's files at `b3e3c15`, give every file as tested. Followed again on a fresh copy of those files, tests first, every file came out the same as tested, the tests failed and passed as Steps 2 and 4 say, and the copy's tests (177 files, 3,704 tests), `tsc --noEmit` and the build passed.
- **Not checked:** nothing was seen in a browser: the popup, "More facts" and the card's sentence are Todd's look, Task 3. No review yet: Task 4's is the first. Nothing called Crewlu Cloud or adsb.lol.

**Where this plan settles details.**
- **"Shown",** not "drawn", in the popup: the words a family reads, as Todd's answer had it and the app has them.
- **The card's sentence says a place once.** Where what's below is where the plane was last tracked, with no city by its last fix, it's "UPS207 to Cologne, about 12 minutes ahead of schedule, last tracked over Québec. Lands about …", in place of "…, over Québec, last tracked over Québec." It still says the plane is out of range. With a city by its last fix both are said: "…, over Québec, last tracked near Montréal."
- **It compares the places, not their names** (`samePlace`: the name, the kind and the country), as the app's plan says its review asked: a state and a country that share a name, as Georgia does, are both said. The app compares the places too (its plan's Task 2, settled with the app's session on 16 Nov 2026), so the two read the same.
- **The facts' row keeps both,** "Over Québec" and under it "Last tracked over Québec · 12 min ago", as the app's does: the row's title is where the plane is by now, and the line where it was last tracked.
- **The code keeps its names** (`lastSeenLine`, `spokenLastSeen`, `lastSeenText`, `seenAt`), and comments keep "seen" where they say what the receivers saw, as the app's code does. Comments that quote the words follow them.
- **Old plans keep the old words:** they're history.

**Questions for Todd:** none; the words are his.

---

## Ground rules for whoever runs this plan

These come from Todd's standing instructions. They override the skill's defaults.

1. **Work only in this worktree:** `/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046`, on its branch `claude/trip-map-live-598046`, at `b3e3c15` or later.
   - Never edit the main checkout, `/Users/toddanderson/Dev/Crewluve Website`: its untracked plan file isn't this work's.
   - `~/Dev/Crewluv` is shared with other sessions. Only read it: change, stash, reset or switch nothing there.
2. **Never commit without Todd's yes in the conversation,** and then only the task's own files, by path. **Never push, and never merge into `main`,** but in Task 5, on Todd's yes then.
3. **The tests:** the session runs them as it works (`npx vitest run <files>`, `npm test`, `npm run build`). At the checkpoint (Task 2 Step 5), Todd runs the command himself. Don't change files while he's running them, and don't ask for a run until the files are final.
4. **The shared cases are the judge.** `tests/fixtures/trip-map/live-cases.json` and `facts-cases.json` are the app's, never edited. If a case fails, the code is wrong. If you believe a case is wrong, STOP and tell Todd.
5. **Copy the code as written.** It was run as it stands. A replacement is exact: its text is in the file once. If it isn't, stop: the file has changed since this plan was written.
6. **Nothing here calls Crewlu Cloud or adsb.lol.** Every test uses a stand-in, and the tests can't reach the network. Change nothing in Crewlu Cloud's live Supabase project, and don't read it.
7. **Unchanged:** every request to Crewlu Cloud still goes through the door and its guard (`tests/data/doorRules.test.ts` and `doorRulesScan.test.ts` must pass), no `innerHTML`, no download, no `npm install`.
8. **Reviewers:** dispatch `superpowers:code-reviewer` with `model: "sonnet"`.
9. **No release note.** The website has none; Task 5 says what went live in this plan's record.

## File map

| File | Task | Responsibility |
|---|---|---|
| `src/copy/planePopup.ts` | modify (2) | the faded plane's popup: "Out of tracking range since …, so it's shown where it should be by now" |
| `src/copy/facts.ts` | modify (2) | the facts' line under what's below: "Last tracked near Montréal · 12 min ago", "Last tracked over Québec · …", "Last tracked 12 min ago" |
| `src/copy/tripMap.ts` | modify (2) | the card's sentence: ", last tracked near Montréal" |
| `src/facts/tripFacts.ts` | modify (2) | the card's sentence says a place once |
| `docs/superpowers/specs/2026-11-16-trip-map-which-plane-design.md` | modify (2) | the popup's words in its table, and "last tracked near …" |
| `tests/copy/facts.test.ts`, `tests/copy/liveWords.test.ts`, `tests/copy/planePopup.test.ts`, `tests/facts/liveTripFacts.test.ts` | modify (2) | the words, and the place said once |

One code task, then Task 3, Todd's look at the demo scenes; Task 4, the review and this plan's record; and Task 5, going live, on Todd's yes.

---

### Task 1: Before starting

- [x] **Step 1: Check the worktree and the branch.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git status --short && git branch --show-current && git log --oneline -1
```

Expected: nothing changed but this plan's file, `claude/trip-map-live-598046`, and `b3e3c15` or a later commit of this plan's.

- [x] **Step 2: Read the app's plan's header and its Task 2** (in `~/Dev/Crewluv`, read only).

---

### Task 2: "Out of tracking range" and "Last tracked", and a place said once

A plane out of reach of the receivers reads as Todd chose (16 Nov 2026), never "seen". The faded plane's popup on the full map says "Out of tracking range since 7:41 PM, so it's shown where it should be by now" (`planePopupWords`); its title, "UPS2963 · best guess", and its second line are as they were. The facts' line under what's below says "Last tracked near Montréal · 12 min ago", else "Last tracked over Québec · 12 min ago", else "Last tracked 12 min ago" (`lastSeenLine`). The card's sentence for screen readers says ", last tracked near Montréal" (`liveSummary`). Where what's below is the very place the plane was last tracked over, with no city by its last fix, the card's sentence says it once (`cardSummary`, by `samePlace`): "UPS207 to Cologne, about 12 minutes ahead of schedule, last tracked over Québec. Lands about …". The which plane design's table of the popup's words follows. The app's plan's Task 2.

**Files:**
- Modify: `src/copy/facts.ts`, `src/copy/planePopup.ts`, `src/copy/tripMap.ts`, `src/facts/tripFacts.ts`, `docs/superpowers/specs/2026-11-16-trip-map-which-plane-design.md`
- Test: `tests/copy/facts.test.ts`, `tests/copy/liveWords.test.ts`, `tests/copy/planePopup.test.ts`, `tests/facts/liveTripFacts.test.ts`

- [x] **Step 1: Write the tests.**

**In `tests/copy/facts.test.ts`, replace (1 of 3):**

```ts

  it('says where it was last seen, by the city near it, else the place under it, and how long ago', () => {
    expect(lastSeenLine(quebec, montreal, 10 * MIN)).toBe('Last seen near Montréal · 10 min ago')
    expect(lastSeenLine(quebec, null, 130 * MIN)).toBe('Last seen over Québec · 2 h 10 min ago')
    expect(lastSeenLine(null, null, 120 * MIN)).toBe('Last seen 2 h ago')
  })
```

**with:**

```ts

  it('says where it was last tracked, by the city near it, else the place under it, and how long ago', () => {
    expect(lastSeenLine(quebec, montreal, 10 * MIN)).toBe('Last tracked near Montréal · 10 min ago')
    expect(lastSeenLine(quebec, null, 130 * MIN)).toBe('Last tracked over Québec · 2 h 10 min ago')
    expect(lastSeenLine(null, null, 120 * MIN)).toBe('Last tracked 2 h ago')
  })
```

**In `tests/copy/facts.test.ts`, replace (2 of 3):**

```ts
  it('holds a time that can’t be right from a minute to a year', () => {
    expect(lastSeenLine(null, null, 20_000)).toBe('Last seen 1 min ago')
    expect(lastSeenLine(null, null, -500_000)).toBe('Last seen 1 min ago')
    expect(lastSeenLine(null, null, Infinity)).toBe('Last seen 8760 h ago')
    expect(lastSeenLine(null, null, NaN)).toBe('Last seen 1 min ago')
    expect(spokenLastSeen(null, null, NaN)).toBe('1 minute ago')
```

**with:**

```ts
  it('holds a time that can’t be right from a minute to a year', () => {
    expect(lastSeenLine(null, null, 20_000)).toBe('Last tracked 1 min ago')
    expect(lastSeenLine(null, null, -500_000)).toBe('Last tracked 1 min ago')
    expect(lastSeenLine(null, null, Infinity)).toBe('Last tracked 8760 h ago')
    expect(lastSeenLine(null, null, NaN)).toBe('Last tracked 1 min ago')
    expect(spokenLastSeen(null, null, NaN)).toBe('1 minute ago')
```

**In `tests/copy/facts.test.ts`, replace (3 of 3):**

```ts
  it('says how long ago to the nearest minute', () => {
    expect(lastSeenLine(null, null, 10 * MIN + 29_000)).toBe('Last seen 10 min ago')
    expect(lastSeenLine(null, null, 10 * MIN + 31_000)).toBe('Last seen 11 min ago')
    expect(spokenLastSeen(null, null, 10 * MIN + 31_000)).toBe('11 minutes ago')
```

**with:**

```ts
  it('says how long ago to the nearest minute', () => {
    expect(lastSeenLine(null, null, 10 * MIN + 29_000)).toBe('Last tracked 10 min ago')
    expect(lastSeenLine(null, null, 10 * MIN + 31_000)).toBe('Last tracked 11 min ago')
    expect(spokenLastSeen(null, null, 10 * MIN + 31_000)).toBe('11 minutes ago')
```

**In `tests/copy/liveWords.test.ts`, replace (1 of 2):**

```ts

  it("while it's out of sight, says what's below by the plan, and where it was last seen (Stage 3 spec §15, best guesses design §2)", () => {
    const { leg, t } = caseLeg('ahead, in the air', 3)
    expect(liveSummary(leg, t, NY, false, 'Ohio', 'near Columbus'))
      .toBe('UPS207 to Philadelphia, about 14 minutes ahead of schedule, over Ohio, last seen near Columbus. Lands about 8:30 AM your time.')
    expect(liveSummary(leg, t, NY, false, null, '12 minutes ago'))
      .toBe('UPS207 to Philadelphia, about 14 minutes ahead of schedule, last seen 12 minutes ago. Lands about 8:30 AM your time.')
  })
```

**with:**

```ts

  it("while it's out of sight, says what's below by the plan, and where it was last tracked (Stage 3 spec §15, best guesses design §2)", () => {
    const { leg, t } = caseLeg('ahead, in the air', 3)
    expect(liveSummary(leg, t, NY, false, 'Ohio', 'near Columbus'))
      .toBe('UPS207 to Philadelphia, about 14 minutes ahead of schedule, over Ohio, last tracked near Columbus. Lands about 8:30 AM your time.')
    expect(liveSummary(leg, t, NY, false, null, '12 minutes ago'))
      .toBe('UPS207 to Philadelphia, about 14 minutes ahead of schedule, last tracked 12 minutes ago. Lands about 8:30 AM your time.')
    // Over where it was last tracked, the card's sentence leaves out what's below, so the place is said once.
    expect(liveSummary(leg, t, NY, false, null, 'over Ohio'))
      .toBe('UPS207 to Philadelphia, about 14 minutes ahead of schedule, last tracked over Ohio. Lands about 8:30 AM your time.')
  })
```

**In `tests/copy/liveWords.test.ts`, replace (2 of 2):**

```ts
    expect(liveSummary(leg, t, NY, false, 'Indiana')).toMatch(/^UPS207 to Philadelphia, still on the ground, 20 minutes behind schedule\. Lands about /)
    // Nor where it was last seen: a plane on the ground or landed is over nothing, and out of sight of nothing.
    expect(liveSummary(leg, t, NY, false, 'Indiana', 'near Indianapolis')).toMatch(/^UPS207 to Philadelphia, still on the ground, 20 minutes behind schedule\. Lands about /)
```

**with:**

```ts
    expect(liveSummary(leg, t, NY, false, 'Indiana')).toMatch(/^UPS207 to Philadelphia, still on the ground, 20 minutes behind schedule\. Lands about /)
    // Nor where it was last tracked: a plane on the ground or landed is over nothing, and out of sight of nothing.
    expect(liveSummary(leg, t, NY, false, 'Indiana', 'near Indianapolis')).toMatch(/^UPS207 to Philadelphia, still on the ground, 20 minutes behind schedule\. Lands about /)
```

**In `tests/copy/planePopup.test.ts`, replace (1 of 2):**

```ts

  it('calls a faded plane a best guess, says when it was last seen, and lands it about its estimate', () => {
    const { leg, words } = realPlane('ahead, in the air', 2)
```

**with:**

```ts

  it('calls a faded plane a best guess, says when it went out of tracking range, and lands it about its estimate', () => {
    const { leg, words } = realPlane('ahead, in the air', 2)
```

**In `tests/copy/planePopup.test.ts`, replace (2 of 2):**

```ts
      title: 'UPS207 · best guess',
      lines: [`Not seen since ${time(seen)}, so it's drawn where it should be by now`, `About 14 min ahead · lands about ${time(leg.end)}`],
    })
```

**with:**

```ts
      title: 'UPS207 · best guess',
      lines: [`Out of tracking range since ${time(seen)}, so it's shown where it should be by now`, `About 14 min ahead · lands about ${time(leg.end)}`],
    })
```

**In `tests/facts/liveTripFacts.test.ts`, replace (1 of 7):**

```ts
  registration?: string | null
}
```

**with:**

```ts
  registration?: string | null
  /** The places along the equator: EQUATOR's, unless they're given. */
  geography?: Geography
}
```

**In `tests/facts/liveTripFacts.test.ts`, replace (2 of 7):**

```ts
/** The facts of a map of `leg` alone, with home by the equator. */
function factsOf(leg: MapLeg, { hasStory = true, isReplay = false }: { hasStory?: boolean; isReplay?: boolean } = {}): TripFacts {
  return makeTripFacts(flightMap(leg, HOME_BY_THE_EQUATOR), {
    geography: hasStory ? EQUATOR : null, comparisons: appComparisons(), viewerTz: NY, h24: false, day: 1, days: 1, isReplay,
  })
```

**with:**

```ts
/** The facts of a map of `leg` alone, with home by the equator. */
function factsOf(
  leg: MapLeg, { hasStory = true, isReplay = false, geography = EQUATOR }: { hasStory?: boolean; isReplay?: boolean; geography?: Geography } = {},
): TripFacts {
  return makeTripFacts(flightMap(leg, HOME_BY_THE_EQUATOR), {
    geography: hasStory ? geography : null, comparisons: appComparisons(), viewerTz: NY, h24: false, day: 1, days: 1, isReplay,
  })
```

**In `tests/facts/liveTripFacts.test.ts`, replace (3 of 7):**

```ts
/** The facts of a map of the one flight, with the real plane last seen at `seenUntil` and the map made at `now`. */
function facts(seenUntil: string, { now, unseen, landed = false, hasStory = true, isReplay = false, typeCode = 'B763', registration = 'N370UP' }: FactsOptions = {}): TripFacts {
  const live = equatorLive(at(seenUntil), { unseen, landedAt: landed ? liveTime(20) : undefined, typeCode, registration })
  return factsOf(equatorLiveLeg(live, at(now ?? seenUntil)), { hasStory, isReplay })
}
```

**with:**

```ts
/** The facts of a map of the one flight, with the real plane last seen at `seenUntil` and the map made at `now`. */
function facts(
  seenUntil: string,
  { now, unseen, landed = false, hasStory = true, isReplay = false, typeCode = 'B763', registration = 'N370UP', geography }: FactsOptions = {},
): TripFacts {
  const live = equatorLive(at(seenUntil), { unseen, landedAt: landed ? liveTime(20) : undefined, typeCode, registration })
  return factsOf(equatorLiveLeg(live, at(now ?? seenUntil)), { hasStory, isReplay, geography })
}
```

**In `tests/facts/liveTripFacts.test.ts`, replace (4 of 7):**

```ts

  it('while it’s out of sight, say where it was last seen under what’s below, and leave out its height and speed', () => {
    const rows = rowsAt(facts('11:10', { now: '11:20' }), '11:20')
    expect(row('below', rows)).toMatchObject({
      title: 'Over Bravo', detail: `Last seen over Bravo · 10 min ago · Passes 35 mi from home at about 8:07${AM}`,
    })
```

**with:**

```ts

  it('while it’s out of sight, say where it was last tracked under what’s below, and leave out its height and speed', () => {
    const rows = rowsAt(facts('11:10', { now: '11:20' }), '11:20')
    expect(row('below', rows)).toMatchObject({
      title: 'Over Bravo', detail: `Last tracked over Bravo · 10 min ago · Passes 35 mi from home at about 8:07${AM}`,
    })
```

**In `tests/facts/liveTripFacts.test.ts`, replace (5 of 7):**

```ts
    const byACity = rowsAt(facts('11:03', { now: '11:13' }), '11:13')
    expect(row('below', byACity).detail).toBe(`Last seen near Testville · 10 min ago · Passes 35 mi from home at about 8:07${AM}`)

    // With no place known, when it was last seen leads the row.
    const noPlace = rowsAt(facts('11:10', { now: '11:20', hasStory: false }), '11:20')
    expect(row('below', noPlace)).toMatchObject({ title: 'Last seen 10 min ago', detail: null })

```

**with:**

```ts
    const byACity = rowsAt(facts('11:03', { now: '11:13' }), '11:13')
    expect(row('below', byACity).detail).toBe(`Last tracked near Testville · 10 min ago · Passes 35 mi from home at about 8:07${AM}`)

    // With no place known, when it was last tracked leads the row.
    const noPlace = rowsAt(facts('11:10', { now: '11:20', hasStory: false }), '11:20')
    expect(row('below', noPlace)).toMatchObject({ title: 'Last tracked 10 min ago', detail: null })

```

**In `tests/facts/liveTripFacts.test.ts`, replace (6 of 7):**

```ts

  it('while it’s out of sight, says "about", what’s below by the plan, and where it was last seen', () => {
    expect(cardSummary(facts('10:50', { now: '11:01' }), at('11:01'), 'Alex')).toBe(
      `TST1 to E20, about 10 minutes ahead of schedule, over Bravo, last seen over Alpha. Lands about 9:11${AM} your time. ` +
        'Latest: crossed into Bravo, about 6 minutes ago. Opens the full map.',
    )
    expect(cardSummary(facts('11:03', { now: '11:13' }), at('11:13'), 'Alex')).toBe(
      `TST1 to E20, about 10 minutes ahead of schedule, over Bravo, last seen near Testville. Lands about 9:11${AM} your time. ` +
        'Latest: crossed into Bravo, 18 minutes ago. Opens the full map.',
```

**with:**

```ts

  it('while it’s out of sight, says "about", what’s below by the plan, and where it was last tracked', () => {
    expect(cardSummary(facts('10:50', { now: '11:01' }), at('11:01'), 'Alex')).toBe(
      `TST1 to E20, about 10 minutes ahead of schedule, over Bravo, last tracked over Alpha. Lands about 9:11${AM} your time. ` +
        'Latest: crossed into Bravo, about 6 minutes ago. Opens the full map.',
    )
    // Last tracked at 6° E, by Testville, and still over Bravo: by a city, both are said.
    expect(cardSummary(facts('11:03', { now: '11:13' }), at('11:13'), 'Alex')).toBe(
      `TST1 to E20, about 10 minutes ahead of schedule, over Bravo, last tracked near Testville. Lands about 9:11${AM} your time. ` +
        'Latest: crossed into Bravo, 18 minutes ago. Opens the full map.',
```

**In `tests/facts/liveTripFacts.test.ts`, replace (7 of 7):**

```ts
    expect(cardSummary(facts('11:10', { now: '11:20', hasStory: false }), at('11:20'), 'Alex')).toBe(
      `TST1 to E20, about 10 minutes ahead of schedule, last seen 10 minutes ago. Lands about 9:11${AM} your time. Opens the full map.`,
    )
```

**with:**

```ts
    expect(cardSummary(facts('11:10', { now: '11:20', hasStory: false }), at('11:20'), 'Alex')).toBe(
      `TST1 to E20, about 10 minutes ahead of schedule, last tracked 10 minutes ago. Lands about 9:11${AM} your time. Opens the full map.`,
    )
  })

  it('while it’s out of sight over where it was last tracked, says the place once', () => {
    // Last tracked over Bravo at 6.875° E at 11:10, and by the plan still over Bravo at 8.125° E at 11:20, with no city
    // near either: "over Bravo, last tracked over Bravo" would say it twice.
    expect(cardSummary(facts('11:10', { now: '11:20' }), at('11:20'), 'Alex')).toBe(
      `TST1 to E20, about 10 minutes ahead of schedule, last tracked over Bravo. Lands about 9:11${AM} your time. ` +
        'Latest: crossed into Bravo, 25 minutes ago. Opens the full map.',
    )
  })

  it('while it’s out of sight, says both of two places that share a name, as Georgia the state and Georgia the country', () => {
    // A state named Bravo, in Alpha, from 5° E to 7.5° E, before the country Bravo: last tracked over the state at
    // 6.875° E at 11:10, and by the plan over the country at 8.125° E at 11:20.
    const twoBravos = makeGeography([box('Bravo', 'state', 5, 7.5, 'Alpha'), ...EQUATOR.areas], EQUATOR.cities)
    expect(cardSummary(facts('11:10', { now: '11:20', geography: twoBravos }), at('11:20'), 'Alex')).toBe(
      `TST1 to E20, about 10 minutes ahead of schedule, over Bravo, last tracked over Bravo. Lands about 9:11${AM} your time. ` +
        'Latest: crossed into Bravo, about 5 minutes ago. Opens the full map.',
    )
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/copy/facts.test.ts tests/copy/liveWords.test.ts tests/copy/planePopup.test.ts tests/facts/liveTripFacts.test.ts
```

Expected: 9 of the 119 tests fail, all for the old words: the popup's "Not seen since … so it's drawn where …", the facts' line's "Last seen …" and the card's sentence's ", last seen …". Over where it was last tracked, the card's sentence also still says the place twice ("over Bravo, last seen over Bravo"). The test of two places that share a name fails only for its words: both are said, before the change and after it.

- [x] **Step 3: Write the code, and the design's words.**

**In `src/copy/facts.ts`, replace (1 of 2):**

```ts
/**
 * Under what's below, while the real plane is out of sight, `ago` ms after it was last seen: "Last seen near Montréal ·
 * 12 min ago" by a city of a million or more, else "Last seen over Québec · 12 min ago", else "Last seen 12 min ago".
 * It's the one line that says the place above it is worked out, not seen (best guesses design §2).
 */
```

**with:**

```ts
/**
 * Under what's below, while the real plane is out of tracking range, `ago` ms after it was last seen: "Last tracked near
 * Montréal · 12 min ago" by a city of a million or more, else "Last tracked over Québec · 12 min ago", else "Last tracked
 * 12 min ago". It's the one line that says the place above it is worked out (best guesses design §2). "Tracked", never
 * "seen" (Todd, 16 Nov 2026): it's the receivers that lose the plane, not air traffic control, and a family shouldn't
 * fear it's missing.
 */
```

**In `src/copy/facts.ts`, replace (2 of 2):**

```ts
  const time = `${minutesText(minutesAgo(ago))} ago`
  if (city) return `Last seen near ${city.name} · ${time}`
  if (place) return `Last seen over ${place.name} · ${time}`
  return `Last seen ${time}`
}
```

**with:**

```ts
  const time = `${minutesText(minutesAgo(ago))} ago`
  if (city) return `Last tracked near ${city.name} · ${time}`
  if (place) return `Last tracked over ${place.name} · ${time}`
  return `Last tracked ${time}`
}
```

**In `src/copy/planePopup.ts`, replace:**

```ts
        lines: [
          ...(seen != null ? [`Not seen since ${time(seen)}, so it's drawn where it should be by now`] : []),
          label ? `${label} · ${lands}` : capitalized(lands),
```

**with:**

```ts
        lines: [
          ...(seen != null ? [`Out of tracking range since ${time(seen)}, so it's shown where it should be by now`] : []),
          label ? `${label} · ${lands}` : capitalized(lands),
```

**In `src/copy/tripMap.ts`, replace (1 of 2):**

```ts
 * - `over` is what's below.
 * - `lastSeen` is where a plane that's out of sight was last seen, as `spokenLastSeen` words it: "near Montréal", "over
 *   Québec" or "2 hours ago". It follows what's below, which is then a best guess: "…, about 14 minutes ahead of
 *   schedule, over Ohio, last seen near Columbus." (Stage 3 spec §15, best guesses design §2).
 * Both are said only of a plane in the air: one on the ground or landed is over nothing, and out of sight of nothing.
```

**with:**

```ts
 * - `over` is what's below.
 * - `lastSeen` is where a plane that's out of tracking range was last seen, as `spokenLastSeen` words it: "near
 *   Montréal", "over Québec" or "2 hours ago". It follows what's below, which is then a best guess: "…, about 14 minutes
 *   ahead of schedule, over Ohio, last tracked near Columbus." (Stage 3 spec §15, best guesses design §2).
 * Both are said only of a plane in the air: one on the ground or landed is over nothing, and out of sight of nothing.
```

**In `src/copy/tripMap.ts`, replace (2 of 2):**

```ts
  const arrival = isDown ? `Reaches the gate at ${time} your time.` : `Lands ${isArrivalEstimated(leg) ? 'about' : 'at'} ${time} your time.`
  const where = isFlying ? `${over ? `, over ${over}` : ''}${lastSeen ? `, last seen ${lastSeen}` : ''}` : ''
  return `${lead} ${leg.destination.city}, ${spokenLiveLabel(label)}${where}. ${arrival}`
```

**with:**

```ts
  const arrival = isDown ? `Reaches the gate at ${time} your time.` : `Lands ${isArrivalEstimated(leg) ? 'about' : 'at'} ${time} your time.`
  const where = isFlying ? `${over ? `, over ${over}` : ''}${lastSeen ? `, last tracked ${lastSeen}` : ''}` : ''
  return `${lead} ${leg.destination.city}, ${spokenLiveLabel(label)}${where}. ${arrival}`
```

**In `src/facts/tripFacts.ts`, replace (1 of 3):**

```ts
import { forgetOldPaths, realPathFacts, type FactsStore } from './factsStore'
import { cityNear, type City, type Geography, type Place } from './geography'
import { landsWithinHorizon } from './landingWeather'
```

**with:**

```ts
import { forgetOldPaths, realPathFacts, type FactsStore } from './factsStore'
import { cityNear, samePlace, type City, type Geography, type Place } from './geography'
import { landsWithinHorizon } from './landingWeather'
```

**In `src/facts/tripFacts.ts`, replace (2 of 3):**

```ts

/** "Last seen near Montréal · 12 min ago", while the real plane is out of sight, or null while it's seen (best guesses design §2). */
export function lastSeenText(facts: TripFacts, leg: MapLeg, t: number): string | null {
```

**with:**

```ts

/**
 * "Last tracked near Montréal · 12 min ago", while the real plane is out of tracking range, or null while it's seen (best
 * guesses design §2).
 */
export function lastSeenText(facts: TripFacts, leg: MapLeg, t: number): string | null {
```

**In `src/facts/tripFacts.ts`, replace (3 of 3):**

```ts
    const ago = plane.unseenFor
    const lastSeen = ago == null ? null : spokenLastSeen(...lastSeenPlace(facts, leg), ago)
    const live = liveSummary(leg, now, viewerTz, h24, place?.name ?? null, lastSeen)
    if (live) return `${live} ${ending}`
```

**with:**

```ts
    const ago = plane.unseenFor
    const [seenPlace, seenCity] = ago == null ? [null, null] : lastSeenPlace(facts, leg)
    const lastSeen = ago == null ? null : spokenLastSeen(seenPlace, seenCity, ago)
    // "Over Québec, last tracked over Québec" says one place twice: the second says it all. It compares the places, not
    // their names, so a state and a country that share a name are both said.
    const isOverWhereLastTracked = seenCity == null && samePlace(seenPlace, place)
    const live = liveSummary(leg, now, viewerTz, h24, isOverWhereLastTracked ? null : (place?.name ?? null), lastSeen)
    if (live) return `${live} ${ending}`
```

**In `docs/superpowers/specs/2026-11-16-trip-map-which-plane-design.md`, replace (1 of 3):**

```markdown
| The real plane, in the air | {flight} · real plane | {label} / Lands {about}{landing} |
| The real plane, estimated (faded) | {flight} · best guess | Not seen since {seen}, so it's drawn where it should be by now / {label} · lands {about}{landing} |
| The real plane, landed | {flight} · real plane | {label} / Reaches the gate {at}{landing} |
```

**with:**

```markdown
| The real plane, in the air | {flight} · real plane | {label} / Lands {about}{landing} |
| The real plane, estimated (faded) | {flight} · best guess | Out of tracking range since {seen}, so it's shown where it should be by now / {label} · lands {about}{landing} |
| The real plane, landed | {flight} · real plane | {label} / Reaches the gate {at}{landing} |
```

**In `docs/superpowers/specs/2026-11-16-trip-map-which-plane-design.md`, replace (2 of 3):**

```markdown
  - `{landing}` is the leg's real end (`MapLeg.end`).
  - `{seen}` is the time of the real plane's last fix.
  - `{moment}` is the replay's moment.
```

**with:**

```markdown
  - `{landing}` is the leg's real end (`MapLeg.end`).
  - `{seen}` is the time of the real plane's last fix. ("Out of tracking range since …, so it's shown where …" since 16 Nov 2026, in place of "Not seen since …, so it's drawn where …", which Todd found could make a family fear the plane was missing. It's the receivers that lose it, not air traffic control.)
  - `{moment}` is the replay's moment.
```

**In `docs/superpowers/specs/2026-11-16-trip-map-which-plane-design.md`, replace (3 of 3):**

```markdown

- The plane's height and speed, and "last seen near …": plan 3C-3's row about the plane.
- A popup on an airport, the pilot's marker, or the schedule's own plane.
```

**with:**

```markdown

- The plane's height and speed, and "last tracked near …": plan 3C-3's row about the plane.
- A popup on an airport, the pilot's marker, or the schedule's own plane.
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 119 tests pass. Then `npx tsc --noEmit`: nothing; `npm test`: 177 test files and 3,704 tests pass; and `npm run build` ends `✓ built`. Last, the old words:

```bash
grep -rn -E "Not seen since|drawn where|Last seen|last seen (near|over)|, last seen" src docs/superpowers/specs
```

Expected: one line, the which plane design's note of the words it had (`{seen}`, line 49).

- [x] **Step 5: The checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && npm run build
```

Expected: 177 test files and 3,704 tests pass, and the build ends `✓ built`.

- [x] **Step 6: Commit, on Todd's yes.** Only these files, by path:

```bash
git add docs/superpowers/specs/2026-11-16-trip-map-which-plane-design.md src/copy/facts.ts src/copy/planePopup.ts src/copy/tripMap.ts src/facts/tripFacts.ts tests/copy/facts.test.ts tests/copy/liveWords.test.ts tests/copy/planePopup.test.ts tests/facts/liveTripFacts.test.ts
git commit -m "A plane out of range of the receivers reads \"Out of tracking range\" and \"Last tracked\", never \"seen\", and the card's sentence says a place once (Todd, 16 Nov 2026)"
```

---

### Task 3: Todd looks at the words

The tests check the words. This is the look at them.

- [x] **Step 1: Start the site with Apple's map.** The worktree has the MapKit token in `.env.local` from plan 3C-2 (git-ignored; it lasts to 22 Nov 2026: if the site's own map shows instead of Apple's, it has run out, and Todd makes another as the README says). The session starts the `crewluve-mapkit` server (`.claude/launch.json`, port 5182) with its preview tool, reads the card's sentence in `live-ocean-gap` itself (the card's button's `aria-label`, `[data-trip-map-open]`), and gives Todd that and the addresses:
  - `http://localhost:5182/?demo=1&scene=live-ocean-gap`, and the same with `#map` at the end
  - `http://localhost:5182/?demo=1&scene=flying`, and with `#map`, a flight with no live data.
- [x] **Step 2: Todd looks, on a phone and a computer:**
  - on the full map in `live-ocean-gap`, the faded plane's popup (the pointer over it, or a tap): "UPS2963 · best guess", then "Out of tracking range since …, so it's shown where it should be by now", then the bar's words and "lands about …";
  - "More facts": under what's below, "Last tracked near … · … ago", "Last tracked over … · … ago" or "Last tracked … ago";
  - the card's sentence, by VoiceOver or as the session read it: "…, last tracked …", with the place said once where what's below is where the plane was last tracked;
  - in `flying`, a flight with no live data: unchanged, with no best guess and no "Last tracked".
- [x] **Step 3: Write down what was wrong.** Anything that needs a change goes in "Changes made during execution", is fixed in Task 2's files with a test where a test can see it, and has Todd run the tests again.

---

### Task 4: The review, and the record

- [x] **Step 1: The review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Task 2's commit (from `b3e3c15`), against the app's plan's Task 2 and this plan's list of where it settles details. Make its fixes, tests first, run `npm test` and `npm run build`, and record what it found.
- [x] **Step 2: Todd runs everything once more** (Task 2 Step 5's command), if the review changed anything, and the fix is committed on his yes, its own files by path.
- [x] **Step 3: This plan's record.** Under "Changes made during execution": the review, each of Todd's runs (the count and the time), what Task 3 turned up, and each commit's hash.
- [x] **Step 4: Commit, on Todd's yes.**

```bash
git add docs/superpowers/plans/2026-11-16-website-tracking-words.md
git commit -m "The website's tracking words plan, with its record"
```

---

### Task 5: Going live, on Todd's yes

This plan goes live. Pushing to `main` publishes the site: `.github/workflows` tests and builds every push to `main`, then publishes it to Pages. **Nothing here runs without Todd's yes in the conversation, asked when this task is reached.**

- [x] **Step 1: Ask Todd** whether to go live now. If not, stop: the branch stays as it is, and this task waits.
- [x] **Step 2: Bring the branch up to `main`.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git fetch origin && git merge-base --is-ancestor origin/main HEAD && echo "fast-forward"
```

Expected: `fast-forward`. If it isn't (`main` has moved on since `b3e3c15`), merge it in here: `git merge origin/main`. If any file conflicts, STOP and tell Todd. Then run `npm test && npm run build`.

- [ ] **Step 3: Todd runs everything** (Task 2 Step 5's command) on the branch as it will go live.
- [ ] **Step 4: Push the branch to `main`, on Todd's yes.** A fast-forward only; never force.

```bash
git push origin claude/trip-map-live-598046:main
```

- [ ] **Step 5: Watch the deploy** (`gh run watch` on the run the push started) until it succeeds. If it fails, tell Todd at once with its log: the site stays as it was until a deploy succeeds.
- [ ] **Step 6: Look at the live site** with Todd, at `https://crewluve.crewlu.net/?demo=1&scene=live-ocean-gap#map`: the faded plane's popup, "More facts" and the card's sentence; and `…scene=flying#map`, unchanged.
- [ ] **Step 7: The record.** Under "Changes made during execution": the push's commit, the deploy's run and time, and what Todd saw. Commit the plan on his yes and push it (a fast-forward only), as Step 4.

---

## What the app takes from this one

- **Nothing.** The words are the app's, and the place said once compares the places on both sides: the app's plan (`docs/superpowers/plans/2026-11-16-tracking-words-and-the-schedule.md`, Task 2) was brought to the website's rule on 16 Nov 2026, with its own test of a country and a province of another country both called "Bravo".

## Changes made during execution

**Run in session `68f03a67` (16 Nov 2026, from about 11:15 PM), from the plan's own text** by the scratch folder's `run_steps.py` (tests first, then the code). Every file Task 2 touched was the same as tested.

- **Task 1:** the worktree as expected (`b3e3c15`, only this plan untracked).
- **Task 2:** 9 of 119 failing first, all for the old words; then 119 passing; `tsc --noEmit` clean; `npm test` 177 / 3,704; `npm run build` built.
- **Task 2's checkpoint:** Todd chose "Run it in my Terminal, then commit": `npm test && npm run build` at 11:21 PM, 177 test files and 3,704 tests passed, `✓ built`. **Commit:** `bbb0061`, its nine files the same as tested.
- **Task 3, Todd's look:** the session read the worktree's site first (`live-ocean-gap`): the facts' "Last tracked over Alberta · 45 min ago"; the card's sentence "…, over Northwest Territories, last tracked over Alberta." (two places, both said); no "seen" on the page. **Todd: "Looks good."**
- **Task 4, the review** (`superpowers:code-reviewer`, sonnet, on `bbb0061`): nothing critical, important or minor. It found no user-facing "seen" left in `src/` (the popup, the facts, the card's and the status sentences, the full map's screen-reader text, the design); the words exact; the place said once only for the same place with no city near the last fix, never while the plane is tracked, and both said for a state and a country that share a name; the shared cases untouched. **No change made,** so Step 2's run wasn't needed.
- **Task 5, going live:** Todd chose "Go live: run it, then push if it passes" (about 11:30 PM). `origin/main` was still `b3e3c15`, a fast-forward (no merge needed).

## Self-review

- **The app's plan's Task 2 covered:** the popup's words (Task 2, `planePopupWords`); the facts' line in its three forms (`lastSeenLine`); the card's sentence (`liveSummary`); the place said once (`cardSummary`); and the design that quotes the words (the which plane design's table, its note on `{seen}`, and its §7's "last tracked near …"). The popup's title, "… · best guess", and its second line are as they were.
- **Not covered here, on purpose:** the app's Tasks 3 and 4, which the website has already; the code's names, which keep "seen"; the website's old plans, which are history; `CLAUDE.md` and the README, which don't quote the words.
- **Placeholders:** none. Every step's code is the tested file or a replacement made from it.
- **What could it break?**
  - The words change for every family whose pilot's plane goes out of range of the receivers. The shared `facts-cases.json` and `live-cases.json` pass unchanged: neither has the words.
  - The card's sentence for screen readers is shorter there, by ", over Québec", where it's the place the plane was last tracked over. While the plane is tracked, or with no place known, it's as before.

## Left for later

- **The facts' row says the place in both its lines** where the plane is still over the place it was last tracked over: "Over Québec", then "Last tracked over Québec · 12 min ago". The app's row does too; only the card's sentence says it once.
- **Plan 3C-4's "Left for later"** holds, with plans 3C-1 to 3C-3's.
