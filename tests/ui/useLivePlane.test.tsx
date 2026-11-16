// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Schedule } from '../../src/engine/types'
import type { LiveFlightDoor, Refused } from '../../src/partner/door'
import type { LiveAnswer } from '../../src/partner/liveAnswer'
import { useLivePlane, type LivePlane } from '../../src/ui/hooks/useLivePlane'
import { key } from '../fixtures/partner'
import { FLYING, SCHEDULE } from '../map/liveTrip'
import { MINUTE, START } from '../map/madeUpFlights'

let visibility: DocumentVisibilityState = 'visible'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  // Half an hour into the made-up flight: its window is open.
  vi.setSystemTime(START + 30 * MINUTE)
  visibility = 'visible'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  delete (document as { visibilityState?: unknown }).visibilityState
})

/** The made-up flight, as partner_live answers it: its whole trail, or none of it after the cursor, as nothing new came. */
const flying = (after: number | null): LiveAnswer =>
  ({ now: Date.now(), cursor: 7, flights: [{ ...FLYING, trail: after == null ? FLYING.trail : [], trailCount: FLYING.trail.length }] })

/** A door that answers the made-up flight, or what a test sets, and counts its calls. */
function door(answer: (after: number | null) => LiveAnswer | Refused = flying) {
  const calls: (number | null)[] = []
  const live: LiveFlightDoor['live'] = async (_key, after) => {
    calls.push(after)
    return answer(after)
  }
  return { live, calls }
}

/** The hook on a page of its own, which shows how many flights reached it. */
function Probe(props: { door: LiveFlightDoor; schedule: Schedule | null; onSharingEnded?: () => void; seen: (plane: LivePlane) => void }) {
  const plane = useLivePlane({ door: props.door, device: () => ({ key: key(1), partnerId: 'p' }), schedule: props.schedule, onSharingEnded: props.onSharingEnded ?? (() => {}) })
  props.seen(plane)
  return <p>{plane.flights.size}</p>
}

/** Lets the calls under way answer. */
const settle = () => act(async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
})

const show = (next: DocumentVisibilityState) => act(() => {
  visibility = next
  document.dispatchEvent(new Event('visibilitychange'))
})

describe("the status page's live plane (Stage 3 spec §11, §12)", () => {
  it('asks once as the page shows, and hands the flights to the page', async () => {
    const d = door()
    let plane: LivePlane | null = null
    const { container } = render(<Probe door={d} schedule={SCHEDULE} seen={(p) => (plane = p)} />)
    await settle()
    expect(d.calls).toEqual([null])
    expect(container.textContent).toBe('1')
    expect(plane!.flights.get('f1')?.trail).toEqual(FLYING.trail)
  })

  it("asks every 30 seconds while a flight's window is open, and never while the page is hidden", async () => {
    const d = door()
    render(<Probe door={d} schedule={SCHEDULE} seen={() => {}} />)
    await settle()
    await act(() => {
      vi.advanceTimersByTime(30_000)
    })
    await settle()
    expect(d.calls).toEqual([null, 7])
    await show('hidden')
    await act(() => {
      vi.advanceTimersByTime(90_000)
    })
    await settle()
    expect(d.calls).toHaveLength(2)
    await show('visible')
    await settle()
    expect(d.calls).toHaveLength(3)
  })

  it("doesn't ask every 30 seconds with no flight's window open", async () => {
    const d = door()
    render(<Probe door={d} schedule={null} seen={() => {}} />)
    await settle()
    await act(() => {
      vi.advanceTimersByTime(90_000)
    })
    await settle()
    expect(d.calls).toEqual([null])
  })

  it('stops asking once the page is gone', async () => {
    const d = door()
    const { unmount } = render(<Probe door={d} schedule={SCHEDULE} seen={() => {}} />)
    await settle()
    unmount()
    await act(() => {
      vi.advanceTimersByTime(90_000)
    })
    await settle()
    expect(d.calls).toHaveLength(1)
  })

  it('tells the page when partner_live says sharing has ended', async () => {
    const ended = vi.fn()
    render(<Probe door={door(() => ({ error: 'sharing_ended' }))} schedule={SCHEDULE} onSharingEnded={ended} seen={() => {}} />)
    await settle()
    expect(ended).toHaveBeenCalledTimes(1)
  })
})
