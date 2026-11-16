import { describe, expect, it } from 'vitest'
import { isLiveWindowOpen, WINDOW_CLOSES_AFTER_MS, WINDOW_ENDS_AFTER_MS, WINDOW_KEEPS_MS, WINDOW_OPENS_BEFORE_MS } from '../../src/map/liveWindow'
import { at, caseFlight, LIVE_CASES } from './liveCases'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

describe('when to ask for the live plane (Stage 3 spec §10.2)', () => {
  it("uses the shared cases' constants", () => {
    const c = LIVE_CASES.constants
    expect(WINDOW_OPENS_BEFORE_MS).toBe(c.windowOpensMinutesBefore * MINUTE)
    expect(WINDOW_CLOSES_AFTER_MS).toBe(c.windowClosesHoursAfter * HOUR)
    expect(WINDOW_KEEPS_MS).toBe(c.windowKeepsMinutes * MINUTE)
    expect(WINDOW_ENDS_AFTER_MS).toBe(c.windowEndsHoursAfter * HOUR)
  })

  it.each(LIVE_CASES.windows)('matches the shared case: $name', (w) => {
    expect(isLiveWindowOpen(at(w.departure), at(w.arrival), caseFlight(w.flight), at(w.at))).toBe(w.isOpen)
  })
})
