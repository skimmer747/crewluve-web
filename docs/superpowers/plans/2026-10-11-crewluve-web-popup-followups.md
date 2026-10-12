# Crewluve Web Popup Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three changes to the two popups:
- a popup closed while it's still opening shrinks and fades back from wherever it is, as the app's does;
- when a popup closes by itself, focus goes to the card now in its place;
- the two popups and the status screen share their closing and open-and-focus code.

**Architecture:** Two small hooks.
- `usePopupClose` closes a popup once. It waits 0.2 s with the closing styles on, or closes at once for reduced motion, and holds each part where its opening animation has it, so the closing transition starts there.
- `usePopupOpener` keeps one popup's open state for the status screen: the button that opened it, closing by itself when what it shows goes away, and handing focus back to that button, or to the heading of the card in the location card's place.

Both popups and the screen switch to them, the closing styles turn the opening animation off, and three headings take focus from code.

**Tech Stack:** Vite 5.4, TypeScript 5.9 (strict), Preact 10, Vitest 3 with happy-dom and @testing-library/preact.

**Spec:** `docs/superpowers/specs/2026-10-11-crewluve-web-popup-followups-design.md`

---

## Execution notes

**Setup and gates**
- **Branch:** work on `popups` in the main project folder. Run `git switch -c popups` from `main`. Don't use git worktrees; auto mode blocked a worktree builder during slice 1.
- **Working directory:** run every command from the project root, `~/Dev/Crewluve Website`. Quote it in shells, since it has a space.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass before every commit that touches code.
  - The suite is 1849 tests in 79 files before this plan, and 1872 tests in 82 files after it.
  - The read-only scan (`tests/data/readOnly.test.ts`) adds one test for each new file in `src/`, so the totals grow a little faster than the task counts below.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**How the printed code was checked**
- **Built and replayed:** every code block below was built and run in a scratch copy of the project before this plan was written, and all three gates passed there. A script then applied this plan's changes, step by step, to a fresh copy of `main`. Each Step 2 failed, each Step 4 passed with its count, and every file came out identical to the scratch copy's.
- **Deliberate breaks:** 20 were tried against the new tests, and they caught all 20. One was missed at first: a hook that moved focus as the page loaded, though no popup had opened. Its test now checks that focus stays on the page itself.
- **In the browser:** the Web Animations API froze each popup's opening partway, closed the popup, then stepped its close. The browser pane runs Chromium.
  - The tracking popup, closed at 140 ms of its 0.42 s opening, ran from 88% opacity at 0.94 size to nothing at half size, over 0.2 s.
  - The sun popup, closed at 150 ms, ran from 65% opacity for the card and 0.83 size for the dial.
  - Run the same way, the live site's old code kept the card growing (0.94, 1.02, 1.01) and still at 38% opacity when it vanished.
- **A screen test was left out:** the page's title as the last fallback for focus. It would need a flight status with no flight, which the narrative sentence can't describe. The fallback is one line in Task 5, and Task 4's Title test covers the heading.

**Network and other repos**
- **No new requests.** Nothing in this plan adds requests, storage or scripts. Tests never use the network; `tests/setup/noNetwork.ts` blocks it.
- **Security:** the hold sets inline styles through the CSSOM, which the CSP allows, as Preact's `style={{…}}` already does.
- **Read-only site:** nothing in this plan talks to CrewLu Cloud.
- **The Crewluve app (`~/Dev/Crewluv`) is reference only.** Read it; never change it.

**Reviews and changes**
- **One batch, Tasks 1–5:** after it, a spec review and a code-quality review, each with its own frozen copy of the branch. The code-quality review also covers the whole branch.
- **Tasks 6–7 are for the controller, working with the user:** the look check, then merge and release.
- **If the code has to differ from a printed block, write it down.** Note it under "Execution notes" at the end of this file, and update the spec's §9 decisions log if a decision changed.

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/ui/hooks/usePopupClose.ts` | create | Closing a popup once, after 0.2 s or at once, with a close during the opening held where the opening has it |
| `src/ui/SunPopup.tsx`, `src/ui/TrackingPopup.tsx` | modify | Closing through `usePopupClose`, naming the parts their openings animate |
| `src/styles/sunPopup.css`, `src/styles/inFlight.css` | modify | The closing styles keep the opening animation off |
| `src/ui/hooks/usePopupOpener.ts` | create | One popup's open state for the screen: its button, closing by itself, and where focus goes after |
| `src/ui/Title.tsx`, `src/ui/LocationCard.tsx`, `src/ui/InFlightCard.tsx` | modify | Their headings take focus from code, through a ref |
| `src/ui/StatusScreen.tsx` | modify | Both popups through `usePopupOpener`, with focus to the card in the location card's place |
| Tests | create and modify | Three new test files, plus additions to six existing ones |

---

### Task 1: The closing both popups share

**Files:**
- Create: `src/ui/hooks/usePopupClose.ts`
- Test: `tests/ui/usePopupClose.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/ui/usePopupClose.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render } from '@testing-library/preact'
import { useRef } from 'preact/hooks'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { POPUP_CLOSE_MS, usePopupClose } from '../../src/ui/hooks/usePopupClose'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

let closeNow: () => void = () => {}

/**
 * A popup reduced to its parts: a backdrop whose opening fades it in, a card whose opening fades it in and springs it
 * from half size, and a part that isn't drawn, which the close passes over.
 */
function Popup({ onClose }: { onClose: () => void }) {
  const backdrop = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const { closing, close } = usePopupClose(onClose, [
    { find: () => backdrop.current, properties: ['opacity'] },
    { find: () => card.current, properties: ['opacity', 'transform'] },
    { find: () => null, properties: ['transform'] },
  ])
  closeNow = close
  return (
    <div class={closing ? 'popup closing' : 'popup'}>
      <div ref={backdrop} class="backdrop" />
      <div ref={card} class="card">
        <button type="button" onClick={close}>
          Close
        </button>
      </div>
    </div>
  )
}

const reduceMotion = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
/** Where the opening has every part when the close comes: partway faded in, and springing up from half size. */
const midOpening = () =>
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    () => ({ getPropertyValue: (name: string) => (name === 'transform' ? 'matrix(0.8, 0, 0, 0.8, 0, 0)' : '0.42') }) as unknown as CSSStyleDeclaration,
  )
const held = (el: HTMLElement) => ['opacity', 'transform', 'animation'].map((name) => el.style.getPropertyValue(name))

describe('usePopupClose', () => {
  it('puts the closing styles on, and tells the screen 0.2 s after the first close, once', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const { container } = render(<Popup onClose={onClose} />)
    fireEvent.click(container.querySelector('button')!)
    fireEvent.click(container.querySelector('button')!)
    expect(container.querySelector('.popup')!.classList.contains('closing')).toBe(true)
    act(() => {
      vi.advanceTimersByTime(POPUP_CLOSE_MS - 1)
    })
    expect(onClose).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes at once, with no closing styles, for visitors who ask for reduced motion', () => {
    reduceMotion()
    const onClose = vi.fn()
    const { container } = render(<Popup onClose={onClose} />)
    fireEvent.click(container.querySelector('button')!)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.popup')!.classList.contains('closing')).toBe(false)
  })

  it('forgets the close when the popup goes first', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const { container, unmount } = render(<Popup onClose={onClose} />)
    fireEvent.click(container.querySelector('button')!)
    unmount()
    vi.advanceTimersByTime(POPUP_CLOSE_MS)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('holds each part where the opening has it, then lets go once the closing styles are on', async () => {
    const { container } = render(<Popup onClose={() => {}} />)
    const backdrop = container.querySelector<HTMLElement>('.backdrop')!
    const card = container.querySelector<HTMLElement>('.card')!
    midOpening()
    closeNow()
    // Held: what each part's opening animates, inline, with the animation off. Nothing else is touched.
    expect(held(backdrop)).toEqual(['0.42', '', 'none'])
    expect(held(card)).toEqual(['0.42', 'matrix(0.8, 0, 0, 0.8, 0, 0)', 'none'])
    expect(container.querySelector('.popup')!.classList.contains('closing')).toBe(false)
    await act(() => {})
    // The closing styles are on and the held values are gone, so the 0.2 s transition runs from them.
    expect(container.querySelector('.popup')!.classList.contains('closing')).toBe(true)
    expect(held(backdrop)).toEqual(['', '', ''])
    expect(held(card)).toEqual(['', '', ''])
  })

  it('leaves the parts’ other inline styles alone, such as a drag’s offset', async () => {
    const { container } = render(<Popup onClose={() => {}} />)
    const backdrop = container.querySelector<HTMLElement>('.backdrop')!
    backdrop.style.transform = 'translateY(40px)'
    midOpening()
    closeNow()
    await act(() => {})
    expect(backdrop.style.transform).toBe('translateY(40px)')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/usePopupClose.test.tsx`
Expected: FAIL with `Error: Failed to resolve import "../../src/ui/hooks/usePopupClose" from "tests/ui/usePopupClose.test.tsx". Does the file exist?`

- [ ] **Step 3: Implement**

Create `src/ui/hooks/usePopupClose.ts`:

```ts
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { prefersReducedMotion } from '../motion'

/** Closing fades a popup out over 0.2 s, as the app's dismissView does, before it goes (slice 2B2 §3, 2C §6). */
export const POPUP_CLOSE_MS = 200

/** A part of a popup that its opening animates: how to find it, and the properties the opening drives. */
export interface OpeningPart {
  find: () => HTMLElement | null | undefined
  properties: ReadonlyArray<'opacity' | 'transform'>
}

/**
 * Closing a popup (popup follow-ups §3, §5): once only, at once for visitors who ask for reduced motion, and otherwise
 * with the closing styles on for 0.2 s before `onClose`. A close during the opening holds each part where the opening
 * has it, so the close runs from there, as SwiftUI's animations pick up where the last left off.
 */
export function usePopupClose(onClose: () => void, parts: ReadonlyArray<OpeningPart>) {
  const [still] = useState(prefersReducedMotion)
  const [closing, setClosing] = useState(false)
  const closed = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const letGo = useRef<Array<() => void>>([])
  useEffect(() => () => clearTimeout(timer.current), [])
  // The closing styles are on now: the held values come off, so the 0.2 s transition starts from them.
  useLayoutEffect(() => {
    if (!closing) return
    for (const release of letGo.current) release()
    letGo.current = []
  }, [closing])

  const close = () => {
    if (closed.current) return
    closed.current = true
    if (still) return onClose()
    letGo.current = parts.flatMap((part) => {
      const el = part.find()
      return el ? [hold(el, part.properties)] : []
    })
    setClosing(true)
    timer.current = setTimeout(onClose, POPUP_CLOSE_MS)
  }
  return { still, closing, close }
}

/**
 * Holds an element where its opening has it (§3.3): the animated values inline, the animation off, then a style
 * recalculation, so the browser starts the close from those values rather than from where the opening would end.
 * Returns what lets go of them. The element's other inline styles, such as a drag's offset, are left alone.
 */
function hold(el: HTMLElement, properties: ReadonlyArray<string>): () => void {
  const now = getComputedStyle(el)
  const values = properties.map((name) => [name, now.getPropertyValue(name)] as const)
  for (const [name, value] of values) el.style.setProperty(name, value)
  el.style.setProperty('animation', 'none')
  getComputedStyle(el).getPropertyValue('opacity')
  return () => {
    for (const [name] of values) el.style.removeProperty(name)
    el.style.removeProperty('animation')
  }
}
```

Why the hold: browsers haven't all started a transition from an animation's current value. So the hook writes those values inline first, with the animation off, and drops them once the closing styles are on. The transition then starts from the held values in every browser.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/usePopupClose.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1855 tests in 80 files after this task.

```bash
git add tests/ui/usePopupClose.test.tsx src/ui/hooks/usePopupClose.ts
git commit -m "usePopupClose: the closing both popups share, holding a mid-opening close where the opening has it (popup follow-ups §3, §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Both popups close through it

**Files:**
- Modify: `src/ui/SunPopup.tsx`, `src/ui/TrackingPopup.tsx`, `src/styles/sunPopup.css`, `src/styles/inFlight.css`
- Test: `tests/ui/SunPopup.test.tsx`, `tests/ui/TrackingPopup.test.tsx`, `tests/styles/styles.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/ui/SunPopup.test.tsx`, import the shared timing after the drag's import:

```tsx
import { POPUP_CLOSE_MS } from '../../src/ui/hooks/usePopupClose'
```

change the import from `src/ui/SunPopup` to:

```tsx
import { SunPopup, type SunPopupProps } from '../../src/ui/SunPopup'
```

Then replace every `advanceTimersByTime(CLOSE_MS` with `advanceTimersByTime(POPUP_CLOSE_MS` (5 places), and add these tests just before "closes when the card is dragged down more than 100 px":

```tsx
  it('starts a close from wherever the opening has the backdrop, the card and the big dial', () => {
    const { container } = render(popup())
    const close = screen.getByRole('button', { name: 'Close' })
    const read = vi.spyOn(window, 'getComputedStyle')
    fireEvent.click(close)
    const parts = ['.sun-popup-backdrop', '.sun-popup-card', '.sun-dial.big'].map((selector) => container.querySelector(selector))
    expect(parts.map((part) => read.mock.calls.some(([el]) => el === part))).toEqual([true, true, true])
  })

  it('closes from where the drag left the card, without moving it', async () => {
    const { container } = render(popup())
    const grab = container.querySelector('.sun-popup-grab')!
    const card = container.querySelector('.sun-popup-card') as HTMLElement
    fireEvent.pointerDown(grab, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(grab, { clientY: 260, pointerId: 1 })
    fireEvent.pointerUp(grab, { clientY: 260, pointerId: 1 })
    await act(() => {})
    expect(container.querySelector('.sun-popup')!.classList.contains('closing')).toBe(true)
    expect(card.style.transform).toBe('translateY(160px)')
  })
```

In `tests/ui/TrackingPopup.test.tsx`, change the import from `src/ui/TrackingPopup` to:

```tsx
import { POPUP_CLOSE_MS } from '../../src/ui/hooks/usePopupClose'
import { TrackingPopup } from '../../src/ui/TrackingPopup'
```

Then replace every `TRACKING_CLOSE_MS` with `POPUP_CLOSE_MS` (2 places), and add this test just before "closes at once for visitors who ask for reduced motion":

```tsx
  it('starts a close from wherever the opening has the backdrop and the card', () => {
    const { container } = render(popup())
    const close = screen.getByRole('button', { name: 'Close' })
    const read = vi.spyOn(window, 'getComputedStyle')
    fireEvent.click(close)
    const parts = ['.tracking-backdrop', '.tracking-card'].map((selector) => container.querySelector(selector))
    expect(parts.map((part) => read.mock.calls.some(([el]) => el === part))).toEqual([true, true])
  })
```

In `tests/styles/styles.test.ts`, add this test after the sun popup's "closes in 0.2 s, ease-out":

```ts
  it('keeps the opening off once closing starts, so a close mid-opening runs from where it was', () => {
    expect(rule('.sun-popup.closing .sun-popup-backdrop, .sun-popup.closing .sun-popup-card')).toContainEqual(['animation', 'none'])
    expect(rule('.sun-popup.closing .sun-dial.big')).toContainEqual(['animation', 'none'])
  })
```

and this one just before the tracking popup's "springs the tracking popup open on the sun popup’s keyframes":

```ts
  it('keeps the tracking popup’s opening off once closing starts, so a close mid-opening runs from where it was', () => {
    expect(rule('.tracking-popup.closing .tracking-backdrop')).toContainEqual(['animation', 'none'])
    expect(rule('.tracking-popup.closing .tracking-card')).toContainEqual(['animation', 'none'])
  })
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/SunPopup.test.tsx tests/ui/TrackingPopup.test.tsx tests/styles/styles.test.ts`
Expected: FAIL in 4 tests (`4 failed | 168 passed (172)`). The two popups' "starts a close from wherever the opening has…" tests find no part read (`expected [ false, false, false ] to deeply equal [ true, true, true ]`). The two style tests find no `animation: none` in the closing rules.

- [ ] **Step 3: Implement**

In `src/ui/SunPopup.tsx`, change the hooks import to:

```tsx
import { useId, useMemo, useRef } from 'preact/hooks'
```

import the hook after `useModalDialog`:

```tsx
import { usePopupClose } from './hooks/usePopupClose'
```

delete the motion import, which the hook now reads:

```tsx
import { prefersReducedMotion } from './motion'
```

delete `CLOSE_MS`, which the hook's `POPUP_CLOSE_MS` replaces:

```tsx
/** Closing fades everything out over 0.2 s, as the app's dismissView does, before the popup goes. */
export const CLOSE_MS = 200
```

hand the closing to the hook, naming the parts the opening animates:

Replace this:

```tsx
  const [still] = useState(prefersReducedMotion)
  const [closing, setClosing] = useState(false)
  const closed = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const close = () => {
    if (closed.current) return
    closed.current = true
    if (still) return p.onClose()
    setClosing(true)
    timer.current = setTimeout(p.onClose, CLOSE_MS)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
```

with this:

```tsx
  const backdrop = useRef<HTMLDivElement>(null)
  // The opening fades the backdrop and the card in, and springs the big dial from half size. A close during it runs
  // from wherever they are (popup follow-ups §3).
  const { still, closing, close } = usePopupClose(p.onClose, [
    { find: () => backdrop.current, properties: ['opacity'] },
    { find: () => card.current, properties: ['opacity'] },
    { find: () => card.current?.querySelector<HTMLElement>('.sun-dial.big'), properties: ['transform'] },
  ])
```

and give the backdrop its ref:

```tsx
      <div ref={backdrop} class="sun-popup-backdrop" onClick={close} />
```

The card holds only its opacity: its transform is the drag's offset, which must stay put as it closes.

In `src/ui/TrackingPopup.tsx`, change the hooks import to:

```tsx
import { useId, useRef } from 'preact/hooks'
```

import the hook after `useModalDialog`:

```tsx
import { usePopupClose } from './hooks/usePopupClose'
```

delete the motion import:

```tsx
import { prefersReducedMotion } from './motion'
```

delete `TRACKING_CLOSE_MS`:

```tsx
/** Closing fades and shrinks the card over 0.2 s, as the app's dismissView does, before the popup goes. */
export const TRACKING_CLOSE_MS = 200
```

hand the closing to the hook:

Replace this:

```tsx
  const [still] = useState(prefersReducedMotion)
  const [closing, setClosing] = useState(false)
  const closed = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const close = () => {
    if (closed.current) return
    closed.current = true
    if (still) return onClose()
    setClosing(true)
    timer.current = setTimeout(onClose, TRACKING_CLOSE_MS)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
```

with this:

```tsx
  const backdrop = useRef<HTMLDivElement>(null)
  // The opening fades the backdrop in, and fades the card in as it springs from half size. A close during it runs from
  // wherever they are (popup follow-ups §3).
  const { closing, close } = usePopupClose(onClose, [
    { find: () => backdrop.current, properties: ['opacity'] },
    { find: () => card.current, properties: ['opacity', 'transform'] },
  ])
```

and give the backdrop its ref:

```tsx
      <div ref={backdrop} class="tracking-backdrop" onClick={close} />
```

In `src/styles/sunPopup.css`, replace the "Closing" comment and its two rules with:

```css
/* Closing: 0.2 s, ease-out, back to nothing, the dial shrinking to half size as it goes. A close during the opening
   runs from wherever the opening had them, and the opening stays off (popup follow-ups §3). */
.sun-popup.closing .sun-popup-backdrop,
.sun-popup.closing .sun-popup-card {
  animation: none;
  opacity: 0;
  transition: opacity 0.2s ease-out;
}

.sun-popup.closing .sun-dial.big {
  animation: none;
  transform: scale(0.5);
  transition: transform 0.2s ease-out;
}
```

In `src/styles/inFlight.css`, replace the tracking popup's "Closing" comment and its two rules with:

```css
/* Closing: 0.2 s, ease-out, fading and shrinking back to half size. A close during the opening runs from wherever the
   opening had them, and the opening stays off (popup follow-ups §3). */
.tracking-popup.closing .tracking-backdrop {
  animation: none;
  opacity: 0;
  transition: opacity 0.2s ease-out;
}

.tracking-popup.closing .tracking-card {
  animation: none;
  opacity: 0;
  transform: scale(0.5);
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/SunPopup.test.tsx tests/ui/TrackingPopup.test.tsx tests/styles/styles.test.ts`
Expected: PASS, 172 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1860 tests in 80 files after this task.

```bash
git add tests/ui/SunPopup.test.tsx tests/ui/TrackingPopup.test.tsx tests/styles/styles.test.ts src/ui/SunPopup.tsx src/ui/TrackingPopup.tsx src/styles/sunPopup.css src/styles/inFlight.css
git commit -m "Popups: both close through usePopupClose, so a close mid-opening runs from where it was, and their closing styles keep the opening off (popup follow-ups §3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The screen's open-and-focus helper

**Files:**
- Create: `src/ui/hooks/usePopupOpener.ts`
- Test: `tests/ui/usePopupOpener.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/ui/usePopupOpener.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { useRef } from 'preact/hooks'
import { afterEach, describe, expect, it } from 'vitest'
import { usePopupOpener } from '../../src/ui/hooks/usePopupOpener'

afterEach(cleanup)

/**
 * A screen reduced to one popup: the button that opens it while its subject is there, a heading for focus to fall back
 * to, and the popup itself, which closes when told.
 */
function Screen({ subject }: { subject: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null)
  const popup = usePopupOpener(subject, () => heading.current)
  return (
    <>
      <h2 ref={heading} tabIndex={-1}>
        In its place
      </h2>
      {subject && (
        <button type="button" onClick={(e) => popup.show(e.currentTarget)}>
          Open
        </button>
      )}
      {popup.open && (
        <div role="dialog" aria-label="Popup">
          <button type="button" onClick={popup.hide}>
            Close
          </button>
        </div>
      )}
    </>
  )
}
const openIt = () => fireEvent.click(screen.getByRole('button', { name: 'Open' }))

describe('usePopupOpener', () => {
  it('opens from its button, and closes when told', () => {
    render(<Screen subject />)
    expect(screen.queryByRole('dialog')).toBeNull()
    openIt()
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('hands focus back to its button once it has closed', async () => {
    render(<Screen subject />)
    openIt()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await act(() => {})
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open' }))
  })

  it('closes by itself when its subject goes, and stays closed when it comes back', () => {
    const { rerender } = render(<Screen subject />)
    openIt()
    rerender(<Screen subject={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    rerender(<Screen subject />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('sends focus to what took the place of its button, when the button went with the subject', async () => {
    const { rerender } = render(<Screen subject />)
    openIt()
    rerender(<Screen subject={false} />)
    await act(() => {})
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'In its place' }))
  })

  it('moves no focus when it never opened', async () => {
    const { rerender } = render(<Screen subject />)
    await act(() => {})
    expect(document.activeElement).toBe(document.body)
    rerender(<Screen subject={false} />)
    await act(() => {})
    expect(document.activeElement).toBe(document.body)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/usePopupOpener.test.tsx`
Expected: FAIL with `Error: Failed to resolve import "../../src/ui/hooks/usePopupOpener" from "tests/ui/usePopupOpener.test.tsx". Does the file exist?`

- [ ] **Step 3: Implement**

Create `src/ui/hooks/usePopupOpener.ts`:

```ts
import { useEffect, useRef, useState } from 'preact/hooks'

/**
 * What the status screen keeps for one popup (popup follow-ups §4, §5). `available` says whether what the popup shows
 * is there: when it goes, the popup closes by itself, and stays closed when it comes back. Once the popup has closed,
 * focus goes back to the button that opened it, or, when that has gone with what it showed, to `fallback()`.
 */
export function usePopupOpener(available: boolean, fallback: () => HTMLElement | null) {
  const [wanted, setWanted] = useState(false)
  const opener = useRef<HTMLElement | null>(null)
  const wasOpen = useRef(false)
  const open = wanted && available
  useEffect(() => {
    if (wanted && !available) setWanted(false)
  }, [wanted, available])
  // This runs after the render that lifts `inert` from <main>, since nothing in an inert page can take focus.
  useEffect(() => {
    if (wasOpen.current && !open) (opener.current?.isConnected ? opener.current : fallback())?.focus()
    wasOpen.current = open
  }, [open])
  return {
    open,
    /** Opens the popup from `button`, which takes focus back once it has closed. */
    show: (button: HTMLElement) => {
      opener.current = button
      setWanted(true)
    },
    /** The popup has finished closing. */
    hide: () => setWanted(false),
  }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/usePopupOpener.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1866 tests in 81 files after this task.

```bash
git add tests/ui/usePopupOpener.test.tsx src/ui/hooks/usePopupOpener.ts
git commit -m "usePopupOpener: what the screen keeps for each popup, with focus going to what took the button's place when a popup closes by itself (popup follow-ups §4, §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Headings that take focus from code

**Files:**
- Modify: `src/ui/Title.tsx`, `src/ui/LocationCard.tsx`, `src/ui/InFlightCard.tsx`
- Test: `tests/ui/Title.test.tsx`, `tests/ui/LocationCard.test.tsx`, `tests/ui/InFlightCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/ui/Title.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { createRef } from 'preact'
import { afterEach, describe, expect, it } from 'vitest'
import { Title } from '../../src/ui/Title'

afterEach(cleanup)

describe('Title', () => {
  it('is the page’s heading, and takes focus from code only, for when a popup closes by itself', () => {
    const heading = createRef<HTMLHeadingElement>()
    render(<Title text="Where's Alex?" headingRef={heading} />)
    expect(heading.current).toBe(screen.getByRole('heading', { level: 1, name: "Where's Alex?" }))
    expect(heading.current!.getAttribute('tabindex')).toBe('-1')
  })
})
```

In `tests/ui/LocationCard.test.tsx`, import `createRef` after the testing library's import:

```tsx
import { createRef } from 'preact'
```

and add this test just before "shows the flag of a country the app has one for":

```tsx
  it('lets the city’s heading take focus from code only, for when a popup closes by itself', () => {
    const heading = createRef<HTMLHeadingElement>()
    render(
      <LocationCard airport="ANC" facts={locationFacts('ANC', NOW, testAirports, cloudy)} now={NOW} homeTz={NY} h24={false} weather={cloudy}
        headingRef={heading} />,
    )
    expect(heading.current).toBe(screen.getByRole('heading', { level: 2, name: 'Anchorage' }))
    expect(heading.current!.getAttribute('tabindex')).toBe('-1')
  })
```

In `tests/ui/InFlightCard.test.tsx`, import `createRef` the same way:

```tsx
import { createRef } from 'preact'
```

and add this test just before "shows DELAYED with a warning for a late departure":

```tsx
  it('lets its heading take focus from code only, for when a popup closes by itself', () => {
    const heading = createRef<HTMLHeadingElement>()
    render(<InFlightCard facts={facts()} now={NOW} h24={false} onOpenTracking={() => {}} headingRef={heading} />)
    expect(heading.current).toBe(screen.getByRole('heading', { level: 2, name: 'In flight' }))
    expect(heading.current!.getAttribute('tabindex')).toBe('-1')
  })
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/Title.test.tsx tests/ui/LocationCard.test.tsx tests/ui/InFlightCard.test.tsx`
Expected: FAIL in 3 tests (`3 failed | 39 passed (42)`), each with `expected null to be <h…>`: no heading takes the ref yet.

- [ ] **Step 3: Implement**

In `src/ui/Title.tsx`, add the type import at the top:

```tsx
import type { Ref } from 'preact'
```

and replace `Title` with:

```tsx
/**
 * The page's title. It takes focus from code only, as where focus goes when a popup closes by itself and neither card
 * is in the location card's place (popup follow-ups §4.2).
 */
export function Title({ text, headingRef }: { text: string; headingRef?: Ref<HTMLHeadingElement> }) {
  return <h1 ref={headingRef} class="title" tabIndex={-1}>{text}</h1>
}
```

In `src/ui/LocationCard.tsx`, add the type import at the top:

```tsx
import type { Ref } from 'preact'
```

add the prop after `onOpenSun`:

```tsx
  /** The city's heading, which takes focus from code when a popup closes by itself (popup follow-ups §4.2). */
  headingRef?: Ref<HTMLHeadingElement>
```

take it in the function's first line:

```tsx
export function LocationCard({ airport, facts, now, homeTz, h24, weather, onOpenSun, headingRef }: LocationCardProps) {
```

and hand it to the city's heading:

```tsx
          <h2 ref={headingRef} class="location-city" tabIndex={-1}>{city}</h2>
```

In `src/ui/InFlightCard.tsx`, add the type import at the top:

```tsx
import type { Ref } from 'preact'
```

add the prop after `onOpenTracking`:

```tsx
  /** The card's heading, which takes focus from code when a popup closes by itself (popup follow-ups §4.2). */
  headingRef?: Ref<HTMLHeadingElement>
```

take it in the function's first line:

```tsx
export function InFlightCard({ facts, now, h24, onOpenTracking, headingRef }: InFlightCardProps) {
```

and hand it to the card's heading:

```tsx
      <h2 ref={headingRef} class="sr-only" tabIndex={-1}>In flight</h2>
```

`tabIndex={-1}` lets code focus a heading without adding it to the Tab order. Screen readers read it out when focus lands on it.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/Title.test.tsx tests/ui/LocationCard.test.tsx tests/ui/InFlightCard.test.tsx`
Expected: PASS, 42 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1869 tests in 82 files after this task.

```bash
git add tests/ui/Title.test.tsx tests/ui/LocationCard.test.tsx tests/ui/InFlightCard.test.tsx src/ui/Title.tsx src/ui/LocationCard.tsx src/ui/InFlightCard.tsx
git commit -m "Headings: the title and the two location-slot cards' headings take focus from code, for when a popup closes by itself (popup follow-ups §4.2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The status screen

**Files:**
- Modify: `src/ui/StatusScreen.tsx`
- Test: `tests/ui/StatusScreen.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `tests/ui/StatusScreen.test.tsx`, add these tests in the sun popup block, just before "closes by itself when the dial goes away at takeoff":

```tsx
  it('sends focus to the in-flight card’s heading when the dial goes away at takeoff', async () => {
    const { rerender } = render(turnAt())
    openDial()
    rerender(turnAt(100))
    await act(() => {})
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'In flight' }))
  })

  it('sends focus to the location card’s city when the dial goes away in the polar night', async () => {
    const { rerender } = render(turnAt())
    openDial()
    const now = Date.UTC(2026, 11, 21, 20)
    const snap = makeSnapshot(e.schedule, e.legs, at(180), NY)
    rerender(
      <StatusScreen snap={{ ...snap, status: { ...snap.status, airport: 'BRW' } }} now={now} viewerTz={NY} homeTz={NY} h24={false}
        airports={testAirports} weather={rockford} demo={false} celebrateKey={0} footer={footer(now)} />,
    )
    await act(() => {})
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'Utqiaġvik' }))
  })
```

and this one in the in-flight block, just before "opens the popup with only its header for a flight without an airline":

```tsx
  it('sends focus to the location card’s city when the popup closes by itself at landing', async () => {
    const { rerender } = render(screenFor(e, 100))
    fireEvent.click(screen.getByRole('button', { name: 'UPS2961. Opens flight tracking.' }))
    rerender(screenFor(e, 180))
    await act(() => {})
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'Rockford' }))
  })
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/StatusScreen.test.tsx`
Expected: FAIL in 3 tests (`3 failed | 65 passed (68)`). Focus is still on the page's body: `expected <body>…</body> to be <h2 …>`.

- [ ] **Step 3: Implement**

In `src/ui/StatusScreen.tsx`, change the hooks import to:

```tsx
import { useRef } from 'preact/hooks'
```

import the helper after the `Footer` import:

```tsx
import { usePopupOpener } from './hooks/usePopupOpener'
```

keep both popups with it:

Replace this:

```tsx
  const [sunOpen, setSunOpen] = useState(false)
  const [trackingOpen, setTrackingOpen] = useState(false)
  /** The card's dial, which opened the popup: focus goes back to it afterwards. */
  const dial = useRef<HTMLElement | null>(null)
  /** The in-flight card's flight number, which opened the tracking popup: focus goes back to it afterwards. */
  const flightNumberButton = useRef<HTMLElement | null>(null)
  const wasOpen = useRef(false)
  const wasTracking = useRef(false)
  const spans = safeNarrative(snap, { now: p.now, viewerTz: p.viewerTz, h24: p.h24, airports: p.airports })
  const airport = snap.status.airport
  // The place, worked out once for the card, the popup and when the popup may be open: the card's rule for its dial.
  const facts = showsLocationCard(snap) ? locationFacts(airport, p.now, p.airports, p.weather) : null
  const dialFacts = facts && showsDial(facts) ? facts : null
  const dialShown = dialFacts != null
  // The popup closes by itself when the dial goes away: at takeoff, or when the sun neither rises nor sets.
  useEffect(() => {
    if (sunOpen && !dialShown) setSunOpen(false)
  }, [sunOpen, dialShown])
  const open = sunOpen && dialShown
  // Focus goes back to the dial once the popup has closed. This runs after the render that lifts `inert` from <main>,
  // since nothing in an inert page can take focus. A dial that went away (at takeoff) is skipped.
  useEffect(() => {
    if (wasOpen.current && !open && dial.current?.isConnected) dial.current.focus()
    wasOpen.current = open
  }, [open])
  // The in-flight card while the pilot is in the air; the tracking popup closes by itself when its flight number goes,
  // at landing, and focus goes back to the flight number once it has closed, as for the dial.
  const flying = inFlightFacts(snap, p.airports)
  const tracking = trackingOpen && flying?.trackingNumber != null
  useEffect(() => {
    if (trackingOpen && !tracking) setTrackingOpen(false)
  }, [trackingOpen, tracking])
  useEffect(() => {
    if (wasTracking.current && !tracking && flightNumberButton.current?.isConnected) flightNumberButton.current.focus()
    wasTracking.current = tracking
  }, [tracking])
  const hidden = open || tracking
```

with this:

```tsx
  // Where focus goes when a popup closes by itself and its button went with what it showed (popup follow-ups §4.2):
  // the heading of the card now in the location card's place, or else the page's title.
  const titleHeading = useRef<HTMLHeadingElement>(null)
  const locationHeading = useRef<HTMLHeadingElement>(null)
  const inFlightHeading = useRef<HTMLHeadingElement>(null)
  const inTheirPlace = () => [inFlightHeading.current, locationHeading.current, titleHeading.current].find((el) => el?.isConnected) ?? null
  const spans = safeNarrative(snap, { now: p.now, viewerTz: p.viewerTz, h24: p.h24, airports: p.airports })
  const airport = snap.status.airport
  // The place, worked out once for the card, the popup and when the popup may be open: the card's rule for its dial.
  const facts = showsLocationCard(snap) ? locationFacts(airport, p.now, p.airports, p.weather) : null
  const dialFacts = facts && showsDial(facts) ? facts : null
  // The sun popup closes by itself when the dial goes away: at takeoff, or when the sun neither rises nor sets.
  const sun = usePopupOpener(dialFacts != null, inTheirPlace)
  // The in-flight card while the pilot is in the air; the tracking popup closes by itself when its flight number goes,
  // at landing.
  const flying = inFlightFacts(snap, p.airports)
  const tracking = usePopupOpener(flying?.trackingNumber != null, inTheirPlace)
  const hidden = sun.open || tracking.open
```

hand the title its ref:

```tsx
        <Title text={titleFor(snap.hasName ? snap.name : null)} headingRef={titleHeading} />
```

hand the location card its ref and the sun popup's `show`:

Replace this:

```tsx
            weather={p.weather}
            onOpenSun={(button) => {
              dial.current = button
              setSunOpen(true)
            }}
          />
```

with this:

```tsx
            weather={p.weather}
            headingRef={locationHeading}
            onOpenSun={sun.show}
          />
```

and the in-flight card the same:

Replace this:

```tsx
          <InFlightCard
            facts={flying}
            now={p.now}
            h24={p.h24}
            onOpenTracking={(button) => {
              flightNumberButton.current = button
              setTrackingOpen(true)
            }}
          />
```

with this:

```tsx
          <InFlightCard facts={flying} now={p.now} h24={p.h24} headingRef={inFlightHeading} onOpenTracking={tracking.show} />
```

then open the sun popup on the helper's `open`:

Replace this:

```tsx
      {open && dialFacts && (
```

with this:

```tsx
      {sun.open && dialFacts && (
```

and close both popups through it:

Replace this:

```tsx
          onClose={() => setSunOpen(false)}
        />
      )}
      {tracking && flying?.trackingNumber && (
        <TrackingPopup trackingNumber={flying.trackingNumber} links={flying.links} onClose={() => setTrackingOpen(false)} />
      )}
```

with this:

```tsx
          onClose={sun.hide}
        />
      )}
      {tracking.open && flying?.trackingNumber && (
        <TrackingPopup trackingNumber={flying.trackingNumber} links={flying.links} onClose={tracking.hide} />
      )}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/StatusScreen.test.tsx`
Expected: PASS, 68 tests.

- [ ] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass. The suite is 1872 tests in 82 files after this task.

```bash
git add tests/ui/StatusScreen.test.tsx src/ui/StatusScreen.tsx
git commit -m "Status screen: both popups kept by usePopupOpener, and focus goes to the card now in the location card's place when one closes by itself (popup follow-ups §4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Look check with the user (controller)

**Files:**
- Modify (only if nudges are needed): `src/styles/sunPopup.css`, `src/styles/inFlight.css`

- [ ] **Step 1: Build and open the preview**

Run `npm run build`, then start or reuse the `crewluve-preview` server from `.claude/launch.json` (port 5181) in the browser pane, at the mobile preset (375 × 812).

- [ ] **Step 2: Check a close during the opening, on both popups, in light and in dark**

An opening lasts under half a second, so step it with the Web Animations API rather than by eye. On `/?demo=1&scene=last-leg`, run this with `javascript_tool`. It opens the tracking popup, freezes the opening at 140 ms, closes the popup, then steps the close:

```js
await new Promise((r) => setTimeout(r, 900))
const read = (el) => {
  const style = getComputedStyle(el)
  const matrix = style.transform.match(/matrix\(([^,]+)/)
  return `${Number(style.opacity).toFixed(2)} / ${matrix ? Number(matrix[1]).toFixed(3) : style.transform}`
}
document.querySelector('.inflight-number').click()
await new Promise((r) => setTimeout(r, 40))
const card = document.querySelector('.tracking-card')
const opening = document.getAnimations().filter((a) => !(a instanceof CSSTransition) && a.effect?.target?.closest?.('.tracking-popup'))
for (const a of opening) { a.pause(); a.currentTime = 140 }
const atClose = read(card)
document.querySelector('.tracking-backdrop').click()
await new Promise((r) => setTimeout(r, 20))
const closing = document.getAnimations().filter((a) => a instanceof CSSTransition)
for (const a of closing) a.pause()
const steps = [0, 50, 100, 150, 200].map((t) => { for (const a of closing) a.currentTime = t; return `${t} ms: ${read(card)}` })
;({ atClose, steps })
```

Expected:
- `atClose` is partway: about 0.88 opacity and 0.94 size.
- The steps start there, and end at 0 opacity and 0.5 size at 200 ms.
- No step goes above `atClose`.

For the sun popup, do the same on `/?demo=1&scene=turn`, with these changes:
- open it with `document.querySelector('.location .sun-dial').click()`;
- filter the opening for `.sun-popup`;
- read `.sun-popup-card` for the opacity and `.sun-popup .sun-dial.big` for the size;
- close it with `.sun-popup-backdrop`.

Then take paused screenshots for the user: one at the moment of closing, and one 100 ms into the close. The browser pane can hand back the previous frame right after a script changes the page, so take a small throwaway screenshot first, then the real one.

- [ ] **Step 3: Check that a normal close looks as it did**

Open each popup, wait a second, and close it by ✕, the backdrop and Escape. Each fades out as before, and focus goes back to the dial or the flight number.

- [ ] **Step 4: Ask the user to sign off**

Show the user the screenshots and ask one question: "Looks right (Recommended)" or "Change something". Apply their notes, then show them again.

- [ ] **Step 5: Run the gates and commit any nudges**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/styles/sunPopup.css src/styles/inFlight.css
git commit -m "Popups: visual nudges from the look check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Merge and release (controller, asks first)

- [ ] **Step 1: Merge**

Use superpowers:finishing-a-development-branch. Ask the user one question about how to merge `popups` into `main`.

- [ ] **Step 2: Release, only with a fresh yes**

Ask before pushing `main`; the push redeploys crewluve.crewlu.net. After the "Deploy to GitHub Pages" run succeeds, check the live site:
- the live page's files match the local build;
- Task 6's script on https://crewluve.crewlu.net/?demo=1&scene=last-leg shows the close starting from where the opening was;
- `read_console_messages` with `onlyErrors: true` shows nothing, and the demo makes no requests beyond the page's own files.

- [ ] **Step 3: Update the memory**

Update the project memory with the new tip and what's next.

---

## Done when

- `npx vitest run`, `npx tsc --noEmit` and `npm run build` are all green, with 1872 tests in 82 files.
- A popup closed during its opening shrinks and fades back from where it was. When a popup closes by itself, focus goes to the card now in the location card's place. Both popups and the screen use the two shared hooks (Tasks 1–5).
- The user has signed off on the look (Task 6), and it's live on crewluve.crewlu.net, released with the user's yes (Task 7).

## Spec coverage

| Spec section | Tasks |
|---|---|
| §3.1–3.2 Closing while it opens | 1 (the hold), 2 (each popup's parts), 6 (in the browser) |
| §3.3 How | 1 (hold, recalculate, let go once the closing styles are on), 2 (`animation: none` in the closing rules) |
| §4.1 When popups close by themselves | 3 (closing by itself when the subject goes), 5 (takeoff, landing, the polar night) |
| §4.2 Where focus goes | 3 (the button, else the fallback), 4 (the headings), 5 (the card in the location card's place, then the title) |
| §4.3 Timing | 3 (focus after the render that lifts `inert`) |
| §5 How it's built | 1–5 |
| §6 Security and privacy | no new requests; inline styles through the CSSOM only (1) |
| §7 Deliberate differences | 3 and 5 (focus) |
| §8 Testing | every task, then 6 |

## Execution notes

**Build, 2026-10-12**
- The controller applied the printed blocks task by task with the replay tools, on branch `popups` from `301db22`.
- Every Step 2 failed as printed, every Step 4 passed with its count, and the gates passed after every task. The suite ended at 1872 tests in 82 files (`ec945a9`).
- The 19 files matched the scratch build byte for byte.

**Look check (Task 6), 2026-10-12:** the user approved the look ("Looks right").
- They saw a sheet of each popup closed about 0.15 s into its opening: the moment of the close, then 0.1 s later. On the live site the popup was still opening at full strength; with the new code it was shrinking away.
- A normal close fades as before, and focus comes back to the dial or the flight number.

**Spec review: one important finding and three minor, fixed; the re-check passed**
- **Tasks 1 and 2, tests** (`40eed85`):
  - The hold test's stand-in for the browser now reports the opening's values only while the animation is on. The test pins that each part is read while the opening runs, then again with it off.
  - The popups' tests pin exactly which property each part holds.
  - Each of these now fails a test: turning the animation off before reading, skipping the recalculation Safari 14 relies on, or holding the wrong property.
- **Task 4, focus rings** (`2c8e399`): Safari before 15.4 has no `:focus-visible`, so a heading focused from code, or clicked, would show a ring. `base.css` now takes the ring off headings with `tabindex="-1"`, with a style test.
- **The spec:**
  - §4.2 now says the headings show no ring;
  - §5 says each heading has its own ref, rather than one shared ref;
  - §8 lists the new style test.
- **Suite:** 1873 tests in 82 files.
