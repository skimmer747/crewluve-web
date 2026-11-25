import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LiveState, TrailPoint } from '../../src/map/liveFlight'
import type { LiveFlightDoor, Refused } from '../../src/partner/door'
import type { AnsweredFlight, LiveAnswer } from '../../src/partner/liveAnswer'
import { LIVE_INTERVAL_MS, makeLiveSource, type LiveLeg } from '../../src/partner/liveSource'
import type { Device } from '../../src/partner/store'
import { key, PARTNER_A, PARTNER_B } from '../fixtures/partner'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const NOW = Date.UTC(2027, 0, 15, 12)

type Answer = LiveAnswer | Refused | Error

/** A call that answers when the test says so. */
function later() {
  let settle!: (answer: Answer) => void
  const answer = new Promise<Answer>((resolve) => {
    settle = resolve
  })
  return { answer, settle }
}

/** A stand-in partner_live: it keeps each call, and gives the answers queued, in order. */
function standIn() {
  const calls: { key: string; after: number | null }[] = []
  const queue: (Answer | Promise<Answer>)[] = []
  const door: LiveFlightDoor = {
    async live(key, after) {
      calls.push({ key, after })
      const answer = await (queue.shift() ?? new Error('Nothing more to answer'))
      if (answer instanceof Error) throw answer
      return answer
    },
  }
  return { door, calls, answer: (...answers: (Answer | Promise<Answer>)[]) => queue.push(...answers) }
}

const point = (minutes: number): TrailPoint => ({ time: NOW + minutes * MINUTE, place: { lat: 40, lng: -80 + minutes / 10 }, altitudeFt: 35_000 })

function flight(legId: string, minutes: number[], trailCount = minutes.length, state: LiveState = 'airborne'): AnsweredFlight {
  const last = minutes[minutes.length - 1] ?? 0
  return {
    legId,
    callsign: 'UPS1234',
    state,
    fix: { place: { lat: 40, lng: -80 }, altitudeFt: 35_000, groundSpeedKt: 450, trackDeg: 80, onGround: false, registration: null, typeCode: null, seenAt: NOW + last * MINUTE },
    landedAt: null,
    trail: minutes.map(point),
    trailCount,
  }
}

const answer = (flights: AnsweredFlight[], cursor = 1, now = NOW): LiveAnswer => ({ now, cursor, flights })
const times = (trail: TrailPoint[] | undefined) => trail?.map((p) => (p.time - NOW) / MINUTE)

/** A source over a stand-in door, a device that can change, and a clock that can move. */
function made() {
  const stand = standIn()
  const state = { device: { key: key(1), partnerId: PARTNER_A } as Device | null, clock: NOW }
  const onSharingEnded = vi.fn()
  const source = makeLiveSource({ door: stand.door, device: () => state.device, onSharingEnded, now: () => state.clock })
  return { ...stand, state, onSharingEnded, source }
}

describe('asking for the live plane (Stage 3 spec §11)', () => {
  it("asks once when the page is shown, with this browser's key and no cursor", async () => {
    const { source, calls, answer: give } = made()
    give(answer([]))
    await source.pageShown()
    source.pageHidden()
    expect(calls).toEqual([{ key: key(1), after: null }])
  })

  it("keeps each flight by its leg's id, without the answer's count", async () => {
    const { source, answer: give } = made()
    give(answer([flight('leg-1', [0, 2]), flight('leg-2', [], 0, 'waiting')]))
    await source.ask()
    expect([...source.flights.keys()]).toEqual(['leg-1', 'leg-2'])
    const { trailCount: _count, ...kept } = flight('leg-1', [0, 2])
    expect(source.flights.get('leg-1')).toEqual(kept)
  })

  it('sends the last cursor back, and adds the new points to those it has', async () => {
    const { source, calls, answer: give } = made()
    give(answer([flight('leg-1', [0, 2])], 7), answer([flight('leg-1', [4], 3)], 8))
    await source.ask()
    await source.ask()
    expect(calls.map((c) => c.after)).toEqual([null, 7])
    expect(times(source.flights.get('leg-1')?.trail)).toEqual([0, 2, 4])
  })

  it("asks again for every point when a trail doesn't add up", async () => {
    const { source, calls, answer: give } = made()
    give(answer([flight('leg-1', [0, 2])], 7), answer([flight('leg-1', [4], 4)], 9), answer([flight('leg-1', [0, 2, 3, 4])], 9))
    await source.ask()
    await source.ask()
    expect(calls.map((c) => c.after)).toEqual([null, 7, null])
    expect(times(source.flights.get('leg-1')?.trail)).toEqual([0, 2, 3, 4])
  })

  it('asks again for every point when a flight new here has points from before the cursor', async () => {
    const { source, calls, answer: give } = made()
    give(answer([flight('leg-1', [0])], 7), answer([flight('leg-1', [], 1), flight('leg-2', [5], 3)], 9), answer([flight('leg-1', [0]), flight('leg-2', [1, 3, 5])], 9))
    await source.ask()
    await source.ask()
    expect(calls.map((c) => c.after)).toEqual([null, 7, null])
    expect(times(source.flights.get('leg-2')?.trail)).toEqual([1, 3, 5])
  })

  it('takes an answer with every point as it comes', async () => {
    const { source, calls, answer: give } = made()
    give(answer([flight('leg-1', [0, 2], 5)]))
    await source.ask()
    expect(calls).toHaveLength(1)
    expect(times(source.flights.get('leg-1')?.trail)).toEqual([0, 2])
  })

  it('forgets a flight no longer answered', async () => {
    const { source, answer: give } = made()
    give(answer([flight('leg-1', [0])], 7), answer([], 7))
    await source.ask()
    await source.ask()
    expect(source.flights.size).toBe(0)
  })

  it("keeps what it has, and its cursor, when Crewlu Cloud can't be reached or refuses for another reason", async () => {
    const { source, calls, answer: give } = made()
    give(answer([flight('leg-1', [0])], 7), new TypeError('Failed to fetch'), { error: 'invalid_key' }, answer([], 8))
    await source.ask()
    await source.ask()
    await source.ask()
    expect(times(source.flights.get('leg-1')?.trail)).toEqual([0])
    await source.ask()
    expect(calls.map((c) => c.after)).toEqual([null, 7, 7, 7])
  })

  it('keeps what it has, and its cursor, when the call for every point fails', async () => {
    const { source, calls, answer: give } = made()
    give(answer([flight('leg-1', [0, 2])], 7), answer([flight('leg-1', [4], 9)], 9), new TypeError('Failed to fetch'), answer([], 9))
    await source.ask()
    await source.ask()
    expect(times(source.flights.get('leg-1')?.trail)).toEqual([0, 2])
    await source.ask()
    expect(calls.map((c) => c.after)).toEqual([null, 7, null, 7])
  })

  it('makes no second call while one is under way, and settles both with its answer', async () => {
    const { source, calls, answer: give } = made()
    const call = later()
    give(call.answer)
    const first = source.ask()
    const second = source.ask()
    expect(calls).toHaveLength(1)
    call.settle(answer([flight('leg-1', [0])]))
    await Promise.all([first, second])
    expect(source.flights.has('leg-1')).toBe(true)
    give(answer([]))
    await source.ask()
    expect(calls).toHaveLength(2)
  })

  it('still takes the answer of a call under way when the page is hidden', async () => {
    const { source, answer: give } = made()
    const call = later()
    give(call.answer)
    const shown = source.pageShown()
    source.pageHidden()
    call.settle(answer([flight('leg-1', [0])]))
    await shown
    expect(source.flights.has('leg-1')).toBe(true)
  })
})

describe('sharing ended, and another connection (Stage 3 spec §11)', () => {
  it('forgets the flights and tells the page when sharing has ended', async () => {
    const { source, onSharingEnded, answer: give } = made()
    give(answer([flight('leg-1', [0])], 7), { error: 'sharing_ended' })
    await source.ask()
    await source.ask()
    expect(source.flights.size).toBe(0)
    expect(onSharingEnded).toHaveBeenCalledTimes(1)
  })

  it('ends sharing on the call for every point too', async () => {
    const { source, onSharingEnded, answer: give } = made()
    give(answer([flight('leg-1', [0])], 7), answer([flight('leg-1', [2], 5)], 8), { error: 'sharing_ended' })
    await source.ask()
    await source.ask()
    expect(source.flights.size).toBe(0)
    expect(onSharingEnded).toHaveBeenCalledTimes(1)
  })

  it('ends nothing for a device this browser has since let go', async () => {
    const { source, state, onSharingEnded, answer: give } = made()
    const call = later()
    give(call.answer)
    const asked = source.ask()
    state.device = { key: key(2), partnerId: PARTNER_A }
    call.settle({ error: 'sharing_ended' })
    await asked
    expect(onSharingEnded).not.toHaveBeenCalled()
  })

  it("leaves out an answer for a device or a partner since replaced, and forgets the last one's flights", async () => {
    for (const replaced of [{ key: key(2), partnerId: PARTNER_A }, { key: key(1), partnerId: PARTNER_B }, null]) {
      const { source, state, answer: give } = made()
      const call = later()
      give(answer([flight('leg-1', [0])], 7), call.answer)
      await source.ask()
      const asked = source.ask()
      state.device = replaced
      call.settle(answer([flight('leg-1', [0, 2])], 8))
      await asked
      expect(source.flights.size, JSON.stringify(replaced)).toBe(0)
    }
  })

  it("lets the last device's call finish, then asks for the new one", async () => {
    const { source, state, calls, answer: give } = made()
    const call = later()
    give(call.answer, answer([flight('leg-2', [0])]))
    const first = source.ask()
    state.device = { key: key(2), partnerId: PARTNER_A }
    const second = source.ask()
    expect(calls).toHaveLength(1)
    call.settle(answer([flight('leg-1', [0])]))
    await Promise.all([first, second])
    expect(calls).toEqual([{ key: key(1), after: null }, { key: key(2), after: null }])
    expect([...source.flights.keys()]).toEqual(['leg-2'])
  })

  it('makes no second call when a listener asks as the flights are forgotten', async () => {
    const { source, state, calls, answer: give } = made()
    give(answer([flight('leg-1', [0])], 7), answer([]))
    await source.ask()
    state.device = { key: key(2), partnerId: PARTNER_A }
    source.subscribe(() => void source.ask())
    await source.ask()
    expect(calls).toHaveLength(2)
  })

  it('reports a page that throws when it hears, and goes on: the others hear, and what was taken stays', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { source, calls, onSharingEnded, answer: give } = made()
      const heard = vi.fn()
      source.subscribe(() => {
        throw new Error('A page that throws')
      })
      source.subscribe(heard)
      onSharingEnded.mockImplementation(() => {
        throw new Error('A page that throws when sharing ends')
      })
      give(answer([flight('leg-1', [0])], 7), answer([flight('leg-1', [2], 2)], 8), { error: 'sharing_ended' })
      await source.ask()
      await source.ask()
      expect(heard).toHaveBeenCalledTimes(2)
      expect(calls.map((c) => c.after)).toEqual([null, 7])
      await source.ask()
      expect(source.flights.size).toBe(0)
      expect(onSharingEnded).toHaveBeenCalledTimes(1)
      expect(logged).toHaveBeenCalled()
    } finally {
      logged.mockRestore()
    }
  })

  it("starts from nothing with another device: the last one's flights go at once, and no cursor is sent", async () => {
    const { source, state, calls, answer: give } = made()
    give(answer([flight('leg-1', [0])], 7), new TypeError('Failed to fetch'), answer([], 2))
    await source.ask()
    state.device = { key: key(2), partnerId: PARTNER_A }
    await source.ask()
    expect(source.flights.size).toBe(0)
    await source.ask()
    expect(calls).toEqual([{ key: key(1), after: null }, { key: key(2), after: null }, { key: key(2), after: null }])
  })

  it('asks nothing, and forgets the flights, when this browser follows no one', async () => {
    const { source, state, calls, answer: give } = made()
    give(answer([flight('leg-1', [0])], 7))
    await source.ask()
    state.device = null
    await source.ask()
    expect(calls).toHaveLength(1)
    expect(source.flights.size).toBe(0)
  })
})

describe("Crewlu Cloud's clock (Stage 3 spec §11)", () => {
  it('follows the clock of the last answer', async () => {
    const { source, answer: give } = made()
    give(answer([], 1, NOW + HOUR))
    await source.ask()
    expect(source.clockOffset).toBe(HOUR)
    expect(source.serverTime(NOW + MINUTE)).toBe(NOW + HOUR + MINUTE)
  })

  it('measures it from the middle of a slow call', async () => {
    const { source, state, answer: give } = made()
    const call = later()
    give(call.answer)
    const asked = source.ask()
    state.clock = NOW + 10_000
    call.settle(answer([], 1, NOW + HOUR))
    await asked
    expect(source.clockOffset).toBe(HOUR - 5_000)
  })
})

describe('the 30-second check (Stage 3 spec §10.2, §11)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  /** A leg leaving in 10 minutes and landing in 2 hours. */
  const soon: LiveLeg = { id: 'leg-1', departure: NOW + 10 * MINUTE, arrival: NOW + 2 * HOUR }

  it('asks every 30 seconds while a window is open', async () => {
    const { source, calls, answer: give } = made()
    give(answer([]), answer([]), answer([]))
    source.watch([soon])
    await source.pageShown()
    await vi.advanceTimersByTimeAsync(LIVE_INTERVAL_MS)
    await vi.advanceTimersByTimeAsync(LIVE_INTERVAL_MS)
    source.pageHidden()
    expect(calls).toHaveLength(3)
  })

  it('asks nothing with no window open', async () => {
    const { source, calls, answer: give } = made()
    give(answer([]))
    source.watch([{ id: 'leg-1', departure: NOW + 5 * HOUR, arrival: NOW + 7 * HOUR }])
    await source.pageShown()
    await vi.advanceTimersByTimeAsync(3 * LIVE_INTERVAL_MS)
    source.pageHidden()
    expect(calls).toHaveLength(1)
  })

  it('keeps asking past the window while the flight is still seen in the air', async () => {
    const { source, calls, answer: give } = made()
    const landedLate: LiveLeg = { id: 'leg-1', departure: NOW - 6 * HOUR, arrival: NOW - 3 * HOUR }
    // Seen a minute ago, three hours after its arrival; the next answer brings no new point.
    give(answer([flight('leg-1', [-1])]), answer([flight('leg-1', [], 1)]))
    source.watch([landedLate])
    await source.pageShown()
    await vi.advanceTimersByTimeAsync(LIVE_INTERVAL_MS)
    source.pageHidden()
    expect(calls).toHaveLength(2)
  })

  it("measures the window by Crewlu Cloud's clock", async () => {
    const { source, calls, answer: give } = made()
    // By this browser's clock the leg leaves in 3 h 10 min, so its window is shut. Crewlu Cloud's clock is 3 h on.
    give(answer([], 1, NOW + 3 * HOUR), answer([], 1, NOW + 3 * HOUR))
    source.watch([{ id: 'leg-1', departure: NOW + 3 * HOUR + 10 * MINUTE, arrival: NOW + 5 * HOUR }])
    await source.pageShown()
    await vi.advanceTimersByTimeAsync(LIVE_INTERVAL_MS)
    source.pageHidden()
    expect(calls).toHaveLength(2)
  })

  it('asks by the windows of the legs it was last given, and keeps the flights until the next answer', async () => {
    const { source, calls, answer: give } = made()
    give(answer([flight('leg-1', [0])]), answer([]))
    source.watch([soon])
    await source.pageShown()
    source.watch([{ id: 'leg-2', departure: NOW + 5 * HOUR, arrival: NOW + 7 * HOUR }])
    await vi.advanceTimersByTimeAsync(LIVE_INTERVAL_MS)
    expect(calls).toHaveLength(1)
    expect(source.flights.has('leg-1')).toBe(true)
    source.watch([soon])
    await vi.advanceTimersByTimeAsync(LIVE_INTERVAL_MS)
    source.pageHidden()
    expect(calls).toHaveLength(2)
    expect(source.flights.size).toBe(0)
  })

  it('leaves one check running when the page is shown twice', async () => {
    const { source, calls, answer: give } = made()
    give(answer([]), answer([]), answer([]))
    source.watch([soon])
    await source.pageShown()
    await source.pageShown()
    await vi.advanceTimersByTimeAsync(LIVE_INTERVAL_MS)
    source.pageHidden()
    expect(calls).toHaveLength(3)
  })

  it('stops when the page is hidden', async () => {
    const { source, calls, answer: give } = made()
    give(answer([]))
    source.watch([soon])
    await source.pageShown()
    source.pageHidden()
    await vi.advanceTimersByTimeAsync(3 * LIVE_INTERVAL_MS)
    expect(calls).toHaveLength(1)
  })
})

describe("hearing the flights change", () => {
  it('tells its listeners when the flights change, and not when an answer changes nothing', async () => {
    const { source, answer: give } = made()
    const heard = vi.fn()
    const stop = source.subscribe(heard)
    give(answer([flight('leg-1', [0])], 7), answer([flight('leg-1', [], 1)], 7), answer([flight('leg-1', [2], 2)], 8), answer([], 8))
    await source.ask()
    await source.ask()
    expect(heard).toHaveBeenCalledTimes(1)
    await source.ask()
    expect(heard).toHaveBeenCalledTimes(2)
    stop()
    await source.ask()
    expect(heard).toHaveBeenCalledTimes(2)
  })

  it("has the new clock before its listeners hear", async () => {
    const { source, answer: give } = made()
    let offset: number | null = null
    source.subscribe(() => {
      offset = source.clockOffset
    })
    give(answer([flight('leg-1', [0])], 1, NOW + HOUR))
    await source.ask()
    expect(offset).toBe(HOUR)
  })
})

describe('the first answer (live or scheduled design §2)', () => {
  it('hasn’t come until the first call settles, and is told once even when it brings no flights', async () => {
    const { source, answer: give } = made()
    const told = vi.fn()
    source.subscribe(told)
    expect(source.hasAnswered).toBe(false)
    give(answer([]), answer([]))
    await source.ask()
    expect(source.hasAnswered).toBe(true)
    expect(told).toHaveBeenCalledTimes(1)
    await source.ask()
    expect(told).toHaveBeenCalledTimes(1)
  })

  it('has come when the call fails: the flights are then not tracked', async () => {
    const { source, answer: give } = made()
    give(new Error('offline'))
    await source.ask()
    expect(source.hasAnswered).toBe(true)
    expect(source.flights.size).toBe(0)
  })
})
