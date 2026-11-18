# The Website's Speed Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The replay's speeds under the full map's timeline become the app's segmented control: four segments, one tap each, in place of the dropdown. Then it goes live, on Todd's yes.

**Architecture:**
- **The markup:** one group of four radio buttons, named "Replay speed", in `src/ui/TripTimeline.tsx`.
- **The look:** drawn as iOS's segmented control in `src/styles/tripMap.css`, with one new colour token, `--segment-fill`, in `src/styles/tokens.css`.
- **Unchanged:** the replay clock.

**Tech Stack:** Preact 10, TypeScript 5.9 (strict), Vitest 3. No new package.

**Sources:**
- **Todd (17 Nov 2026):** "Can we make the website the same speed pickers as the app. so its just one tap".
- **The app's control,** `Crewluv/Views/TripMap/TripReplayPaceControls.swift` (read only, in `~/Dev/Crewluv` at `0781744`):
  - a segmented `Picker` named "Replay speed";
  - beside Quick layovers, or under it when the two don't fit on one line (`ViewThatFits`);
  - a menu at the largest text sizes.

**How this plan was checked.** Every code block here comes from a file that was run before the plan was put together. None was typed into the plan by hand.
- **A scratch copy of this branch** at `5d1a53e`, with this plan's files laid over it. Every count below is the same in this Mac's time zone and in UTC.
  - Before: 183 test files and 3,905 tests.
  - After Task 2: 183 test files and 3,911 tests, all passing; `tsc --noEmit` finds nothing, and `npm run build` builds.
- **Tests first:** the task's tests were run before its code, and failed as its Step 2 says: 8 of 212 in Task 2.
- **7 deliberate breaks** were made in the new code, one at a time, and every one fails at least one test.
  - Task 2's 7: a tap picks nothing; the picked one not shown; four groups, not one; no group name for screen readers; the radios taken from the keyboard; no segment fill; no wrap on a narrow phone.
- **Seen in a browser,** the scratch copy:
  - In dark mode at a phone's width, the four segments sit beside Quick layovers, 1× raised in iOS's gray.
  - In light mode at 320 px, they sit under it, 1× raised in white.
- **The plan itself** is checked by a script, and dry-run on a fresh copy, tests first.
- **Not checked:** a real phone; that's Todd's look, Task 3.

**Where this plan settles details.**
- **Radio buttons, not buttons:**
  - one group, so the arrow keys move between the speeds and Tab passes the group once;
  - `role="radiogroup"` with the app's name, "Replay speed";
  - each speed's own name its label, "1×" to "10×".
  - The radio buttons are hidden by `opacity: 0` over their segment, so a tap anywhere on it picks it and the keyboard can still reach them. A focus ring shows on the segment.
- **The look is iOS's segmented control:**
  - the track is `--button-fill`;
  - the picked segment is raised in `--segment-fill` with iOS's soft shadow;
  - each segment is at least 44 px wide and 40 px tall, so a finger finds it.
  - `--segment-fill` is white in light mode and iOS's `#636366` in dark, set in all three places the tokens are (light, the dark block, and `.force-dark`, which a test keeps the same as the dark block).
  - In forced colours, the picked segment takes `Highlight`.
- **Beside or under:** the settings row wraps (`flex-wrap`), so on a narrow phone the speeds go under Quick layovers, as the app's `ViewThatFits` does.
- **The app's menu at the largest text sizes** isn't copied: the segments wrap under Quick layovers, and each grows with the text.

---

## Ground rules for whoever runs this plan

1. **Work only in this worktree:** `/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046`, on its branch `claude/trip-map-live-598046`, at `5d1a53e` or later. `~/Dev/Crewluv` is shared with other sessions: only read it.
2. **Never commit without Todd's yes in the conversation,** and then only the task's own files, by path. **Never push,** but in Task 5, on Todd's yes then.
3. **The tests:** the session runs them as it works. At the checkpoint (Task 2, Step 5), Todd runs the command himself.
4. **Copy the code as written.** A replacement is exact: its text is in the file once. If it isn't, stop.
5. **Unchanged:** the door and its guard, no `innerHTML`, no download, no `npm install`; nothing calls Crewlu Cloud or adsb.lol.
6. **Reviewers:** `superpowers:code-reviewer` with `model: "sonnet"`.

## File map

| File | Task | Responsibility |
|---|---|---|
| `src/ui/TripTimeline.tsx` | modify (2) | the speeds as one radio group |
| `src/styles/tripMap.css`, `src/styles/tokens.css` | modify (2) | the segmented control's look, and `--segment-fill` |
| `tests/ui/TripMapPage.test.tsx`, `tests/styles/styles.test.ts` | modify (2) | the control, its look and its token |

---

### Task 1: Before starting

- [x] **Step 1: Check the worktree and the branch.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && git status --short && git branch --show-current && git log --oneline -1
```

Expected:
- Nothing changed but this plan's file.
- The branch `claude/trip-map-live-598046`.
- `5d1a53e`, or a later commit of this plan's.

---

### Task 2: The speeds as the app's segmented control, one tap each

Under the full map's timeline, the replay's speeds become a row of four segments, 1×, 2×, 5× and 10×, in place of the dropdown, as the app's segmented control (`TripReplayPaceControls.swift`): one tap picks a speed. They are radio buttons in one group named "Replay speed" (`src/ui/TripTimeline.tsx`), so the arrow keys move between them, Tab passes the group once and screen readers hear their name. They're drawn as iOS's control (`src/styles/tripMap.css`): the picked one raised in `--segment-fill`, a new token, white by day and iOS's gray by night (`src/styles/tokens.css`), on the button fill's track, each segment 44 px wide at least. The radio buttons are hidden by opacity, not taken from the keyboard. As the app's, the speeds sit beside Quick layovers, and under it when the two don't fit on one line.

**Files:**
- Modify: `src/styles/tokens.css`, `src/styles/tripMap.css`, `src/ui/TripTimeline.tsx`
- Test: `tests/styles/styles.test.ts`, `tests/ui/TripMapPage.test.tsx`

- [x] **Step 1: Write the tests.**

**In `tests/styles/styles.test.ts`, replace (1 of 2):**

```ts
  ['--rest', '#99BFEB', '#8CA6CC'],
  ['--rest-text', '#99BFEB', '#8CA6CC'],
  ['--grid-line', 'rgba(0,0,0,.15)', 'rgba(255,255,255,.4)'],
  ['--button-fill', 'rgba(118,118,128,.12)', 'rgba(118,118,128,.24)'],
  ['--separator', 'rgba(60,60,67,.29)', 'rgba(84,84,88,.6)'],
]

describe('tokens.css', () => {
  const top = blocks(css('tokens'))
  const lightRoot = find(top, ':root')
```

**with:**

```ts
  ['--rest', '#99BFEB', '#8CA6CC'],
  ['--rest-text', '#99BFEB', '#8CA6CC'],
  ['--grid-line', 'rgba(0,0,0,.15)', 'rgba(255,255,255,.4)'],
  ['--button-fill', 'rgba(118,118,128,.12)', 'rgba(118,118,128,.24)'],
  ['--separator', 'rgba(60,60,67,.29)', 'rgba(84,84,88,.6)'],
  // The replay's speeds as iOS's segmented control (Todd, 17 Nov 2026): its picked segment.
  ['--segment-fill', '#FFFFFF', '#636366'],
]

describe('tokens.css', () => {
  const top = blocks(css('tokens'))
  const lightRoot = find(top, ':root')
```

**In `tests/styles/styles.test.ts`, replace (2 of 2):**

```ts
      ['min-width', '0'], ['min-height', '0'], ['padding', '0 16px'], ['border-left', '0.5px solid var(--separator)'],
      ['display', 'flex'], ['flex-direction', 'column'],
    ])
  })
})
```

**with:**

```ts
      ['min-width', '0'], ['min-height', '0'], ['padding', '0 16px'], ['border-left', '0.5px solid var(--separator)'],
      ['display', 'flex'], ['flex-direction', 'column'],
    ])
  })
})

describe('the replay’s speeds, as the app’s segmented control (Todd, 17 Nov 2026)', () => {
  const rules = rulesIn(css('tripMap'))
  const rule = (head: string) => new Map(declarations(find(rules, head)?.body ?? ''))

  it('raises the picked speed on the gray track, in the segment fill', () => {
    expect(rule('.trip-timeline-speeds').get('background')).toBe('var(--button-fill)')
    expect(rule('.trip-timeline-speed input:checked + span').get('background')).toBe('var(--segment-fill)')
  })

  it('hides the radio buttons without taking them from the keyboard or screen readers, and gives each a finger’s room', () => {
    const input = rule('.trip-timeline-speed input')
    expect(input.get('opacity')).toBe('0')
    expect(input.get('display')).toBeUndefined()
    expect(rule('.trip-timeline-speed input:focus-visible + span').get('outline')).toBe('2px solid var(--blue)')
    expect(rule('.trip-timeline-speed span').get('min-width')).toBe('44px')
  })

  it('puts the speeds under Quick layovers when the two don’t fit on one line, as the app does', () => {
    expect(rule('.trip-timeline-settings').get('flex-wrap')).toBe('wrap')
  })
})
```

**In `tests/ui/TripMapPage.test.tsx`, replace (1 of 5):**

```tsx
// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
```

**with:**

```tsx
// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
```

**In `tests/ui/TripMapPage.test.tsx`, replace (2 of 5):**

```tsx
    expect(slider.getAttribute('aria-valuetext')).toMatch(/^Friday 7:00\sPM, layover in Cologne$/)
    expect(screen.getByRole('combobox', { name: 'Replay speed' })).toBeTruthy()
    expect((screen.getByRole('switch', { name: 'Quick layovers' }) as HTMLInputElement).checked).toBe(true)
```

**with:**

```tsx
    expect(slider.getAttribute('aria-valuetext')).toMatch(/^Friday 7:00\sPM, layover in Cologne$/)
    expect(screen.getByRole('radiogroup', { name: 'Replay speed' })).toBeTruthy()
    expect((screen.getByRole('switch', { name: 'Quick layovers' }) as HTMLInputElement).checked).toBe(true)
```

**In `tests/ui/TripMapPage.test.tsx`, replace (3 of 5):**

```tsx

  it('takes a new speed while a replay plays, and keeps it as the frames go on (the app lost such taps, 17 Nov 2026)', () => {
```

**with:**

```tsx

  it('shows the speeds as the app’s segmented control, one tap each, 1× picked at first (Todd, 17 Nov 2026)', () => {
    page()
    const group = screen.getByRole('radiogroup', { name: 'Replay speed' })
    const speeds = within(group).getAllByRole('radio') as HTMLInputElement[]
    expect(speeds.map((r) => r.closest('label')!.textContent)).toEqual(['1×', '2×', '5×', '10×'])
    expect(speeds.map((r) => r.checked)).toEqual([true, false, false, false])
    fireEvent.click(screen.getByRole('radio', { name: '10×' }))
    expect(speeds.map((r) => r.checked)).toEqual([false, false, false, true])
    // One group: the arrow keys move between them, and Tab passes the group once.
    expect(new Set(speeds.map((r) => r.name)).size).toBe(1)
  })

  it('takes a new speed while a replay plays, and keeps it as the frames go on (the app lost such taps, 17 Nov 2026)', () => {
```

**In `tests/ui/TripMapPage.test.tsx`, replace (4 of 5):**

```tsx
      })
      const speed = screen.getByRole('combobox', { name: 'Replay speed' }) as HTMLSelectElement
      fireEvent.change(speed, { target: { value: '5' } })
      const line = () => document.querySelector('.trip-timeline-time')!.textContent
```

**with:**

```tsx
      })
      const speed = screen.getByRole('radio', { name: '5×' }) as HTMLInputElement
      fireEvent.click(speed)
      const line = () => document.querySelector('.trip-timeline-time')!.textContent
```

**In `tests/ui/TripMapPage.test.tsx`, replace (5 of 5):**

```tsx
      })
      expect(speed.value).toBe('5')
      expect(line()).not.toBe(before)
```

**with:**

```tsx
      })
      expect(speed.checked).toBe(true)
      expect(line()).not.toBe(before)
```

- [x] **Step 2: Run them, and see them fail.**

```bash
npx vitest run tests/styles/styles.test.ts tests/ui/TripMapPage.test.tsx
```

Expected: 8 of the 212 tests fail, in both files, because the speeds are still a dropdown. The full map's three: its group named "Replay speed", the four segments with 1× picked, and 5× tapped during a replay. The style tests' five: `--segment-fill` light and dark, the raised segment on its track, the hidden radio buttons, and the row that wraps. The rest pass already, as they should.

- [x] **Step 3: Write the code.**

**In `src/styles/tokens.css`, replace (1 of 3):**

```css
  --separator: rgba(60, 60, 67, 0.29);
  --font: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

**with:**

```css
  --separator: rgba(60, 60, 67, 0.29);
  /* The picked segment of a segmented control, on the button fill: iOS's. */
  --segment-fill: #ffffff;
  --font: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

**In `src/styles/tokens.css`, replace (2 of 3):**

```css
    --separator: rgba(84, 84, 88, 0.6);
  }
```

**with:**

```css
    --separator: rgba(84, 84, 88, 0.6);
    --segment-fill: #636366;
  }
```

**In `src/styles/tokens.css`, replace (3 of 3):**

```css
  --separator: rgba(84, 84, 88, 0.6);
}
```

**with:**

```css
  --separator: rgba(84, 84, 88, 0.6);
  --segment-fill: #636366;
}
```

**In `src/styles/tripMap.css`, replace (1 of 2):**

```css
.trip-timeline-row { display: flex; align-items: center; gap: 12px; }
.trip-timeline-settings { justify-content: space-between; }
.trip-timeline-time { margin: 2px 0 6px; color: var(--text-2); font-size: 0.85rem; font-variant-numeric: tabular-nums; }
```

**with:**

```css
.trip-timeline-row { display: flex; align-items: center; gap: 12px; }
/* Quick layovers beside the speeds, or above them when the two don't fit on one line, as the app's. */
.trip-timeline-settings { justify-content: space-between; flex-wrap: wrap; row-gap: 4px; }
.trip-timeline-time { margin: 2px 0 6px; color: var(--text-2); font-size: 0.85rem; font-variant-numeric: tabular-nums; }
```

**In `src/styles/tripMap.css`, replace (2 of 2):**

```css
.trip-timeline-live { min-height: 44px; padding: 0 14px; border-radius: 999px; }
.trip-timeline-speed { min-height: 44px; }

```

**with:**

```css
.trip-timeline-live { min-height: 44px; padding: 0 14px; border-radius: 999px; }
/* The speeds, as iOS's segmented control: the picked one raised on a gray track. Its radio buttons are hidden but kept
   for the keyboard and screen readers. */
.trip-timeline-speeds { display: inline-flex; flex: none; padding: 2px; border-radius: 9px; background: var(--button-fill); }
.trip-timeline-speed { position: relative; display: flex; cursor: pointer; }
.trip-timeline-speed input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
.trip-timeline-speed span {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 40px;
  padding: 0 10px;
  border-radius: 7px;
  font-size: 0.9rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.trip-timeline-speed input:checked + span { background: var(--segment-fill); box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12), 0 3px 1px rgba(0, 0, 0, 0.04); }
.trip-timeline-speed input:focus-visible + span { outline: 2px solid var(--blue); outline-offset: 1px; }
@media (forced-colors: active) {
  .trip-timeline-speeds { outline: 1px solid CanvasText; }
  .trip-timeline-speed input:checked + span { background: Highlight; color: HighlightText; }
}

```

**In `src/ui/TripTimeline.tsx`, replace (1 of 2):**

```tsx
  clockTime, goLive, hasFinished, isLive, isPlaying, pause, play, progressAt, REPLAY_SPEEDS, replayDuration, replayOffset, scrub,
  setSpeed, tripTimeAtOffset, type ReplayClock, type ReplaySpeed,
} from '../map/replayClock'
```

**with:**

```tsx
  clockTime, goLive, hasFinished, isLive, isPlaying, pause, play, progressAt, REPLAY_SPEEDS, replayDuration, replayOffset, scrub,
  setSpeed, tripTimeAtOffset, type ReplayClock,
} from '../map/replayClock'
```

**In `src/ui/TripTimeline.tsx`, replace (2 of 2):**

```tsx
        </label>
        <select class="trip-timeline-speed" aria-label="Replay speed" value={String(clock.speed)}
          onChange={(e) => onChange(setSpeed(clock, Number(e.currentTarget.value) as ReplaySpeed, Date.now()))}>
          {REPLAY_SPEEDS.map((s) => <option key={s} value={String(s)}>{`${s}×`}</option>)}
        </select>
      </div>
```

**with:**

```tsx
        </label>
        {/* The speeds as the app's segmented control: one tap each (Todd, 17 Nov 2026). Radio buttons, so the arrow keys
            move between them and screen readers hear "Replay speed". */}
        <div class="trip-timeline-speeds" role="radiogroup" aria-label="Replay speed">
          {REPLAY_SPEEDS.map((s) => (
            <label key={s} class="trip-timeline-speed">
              <input type="radio" name="trip-timeline-speed" value={String(s)} checked={clock.speed === s}
                onChange={() => onChange(setSpeed(clock, s, Date.now()))} />
              <span>{`${s}×`}</span>
            </label>
          ))}
        </div>
      </div>
```

- [x] **Step 4: Run them again.** The command of Step 2. Expected: 212 tests pass. Then `npx tsc --noEmit`: nothing; `npm test`: 183 test files and 3,911 tests pass, and the same with `TZ=UTC npm test`, as GitHub's build runs; and `npm run build` ends `✓ built`. Last, the shared cases:

```bash
git diff --name-only 5d1a53e -- tests/fixtures/trip-map
```

Expected: nothing. No step changes the shared cases.

- [x] **Step 5: The checkpoint: Todd runs it.**

```bash
cd "/Users/toddanderson/Dev/Crewluve Website/.claude/worktrees/trip-map-live-598046" && npm test && TZ=UTC npm test && npm run build
```

Expected: 183 test files and 3,911 tests pass, twice (in this Mac's time zone, then in UTC as GitHub's build runs), and the build ends `✓ built`.

- [x] **Step 6: Commit, on Todd's yes.** Only these files, by path:

```bash
git add src/styles/tokens.css src/styles/tripMap.css src/ui/TripTimeline.tsx tests/styles/styles.test.ts tests/ui/TripMapPage.test.tsx
git commit -m "The replay's speeds as the app's segmented control, one tap each, beside Quick layovers or under it on a narrow phone (Todd, 17 Nov 2026)"
```

---

### Task 3: Todd looks at it

- [x] **Step 1:** The session starts the `crewluve-mapkit` server (port 5182) and gives Todd `http://localhost:5182/?demo=1&scene=live-ahead#map`.
- [x] **Step 2: Todd taps the speeds,** on a phone and a computer, during a replay too: one tap each, the picked one raised, and on a narrow phone under Quick layovers.
- [x] **Step 3:** Anything wrong goes in "Changes made during execution", and is fixed with a test.

---

### Task 4: The review, and the record

- [x] **Step 1: The review.** Dispatch `superpowers:code-reviewer` (`model: "sonnet"`) on Task 2's commit, against the app's control. Make its fixes, tests first.
- [x] **Step 2: Todd runs everything once more,** if the review changed anything. The fix is committed on his yes, by path.
- [x] **Step 3: This plan's record,** under "Changes made during execution".
- [x] **Step 4: Commit, on Todd's yes.**

```bash
git add docs/superpowers/plans/2026-11-17-website-speed-picker.md
git commit -m "The website's speed picker plan, with its record"
```

---

### Task 5: Going live, on Todd's yes

- [x] **Step 1: Ask Todd** whether to go live now.
- [x] **Step 2:** `git fetch origin && git merge-base --is-ancestor origin/main HEAD && echo "fast-forward"`. If it isn't a fast-forward, STOP and tell Todd.
- [x] **Step 3:** `TZ=UTC npx vitest run`: everything passes.
- [x] **Step 4: Todd runs everything** (Task 2 Step 5's command).
- [x] **Step 5: Push on Todd's yes,** a fast-forward only: `git push origin claude/trip-map-live-598046:main`. This also takes the replay pace plan's record, `5d1a53e`, live.
- [x] **Step 6: Watch the deploy** until it succeeds; if it fails, tell Todd at once with its log.
- [x] **Step 7: The record,** committed and pushed the same way.

---

## Changes made during execution

- **Task 2** was run in session `68f03a67` on 17 Nov 2026, from this plan's own text: tests first (8 of 212 failed, as written), every file the same as tested.
  - Todd's run passed 3,911 tests at 10:19 PM EST and again in UTC, and built.
  - Commit `a6d63ef`, on his "Run it, commit, go live".
- **Task 3, Todd's look:** "Good: go live".
- **Task 4, the review** (`superpowers:code-reviewer`, sonnet) of `a6d63ef`: nothing Critical or Important.
  - **Confirmed:**
    - the radio group's meaning, its names, the focus ring and the hit targets;
    - no leftover of the dropdown;
    - the token, the same in all three places;
    - white on `#636366` at about 5.9:1;
    - forced colours.
  - **Minor, left:**
    - The group's `name` is fixed. Only one timeline is ever drawn on a page (`TripMapPage`), so it can't clash today.
    - The focus ring may touch the track's edge. That's for a look.
    - The arrow keys and Tab are the browser's own for one radio group, and no test drives them.
- **Task 5, gone live** on Todd's "Run it, commit, go live" and "Good: go live":
  - The branch was a fast-forward of `main`, and `TZ=UTC npx vitest run` passed 3,911 tests.
  - Todd's run passed 3,911 tests at 10:22 PM EST and again in UTC, and built.
  - Pushed `4d9458c..3410194`, with the replay pace plan's record.
  - **Deployed:** run `44230078451`, succeeded, 10:24 PM EST.
  - The live site serves Todd's build (`index-BUpw9abJ.js`): the "Replay speed" group, 1× picked, and no dropdown.

## Self-review

- **Covered:** the segments, one tap each; the group's name; the keyboard; the look in light, dark and forced colours; beside or under Quick layovers.
- **Placeholders:** none.
- **What could it break?** Only the speed control's look and how it's picked. The replay clock is unchanged, and the speeds are the same four.
