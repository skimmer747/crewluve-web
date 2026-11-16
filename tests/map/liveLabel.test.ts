import { describe, expect, it } from 'vitest'
import { liveLabelText, minutesText } from '../../src/copy/tripMap'
import { liveLabel, ON_SCHEDULE_WITHIN } from '../../src/map/liveLabel'
import type { LivePhase } from '../../src/map/liveProgress'
import { LIVE_CASES } from './liveCases'

describe('ahead of the schedule or behind it (Stage 3 spec §5.3)', () => {
  it("uses the shared cases' constant", () => {
    expect(ON_SCHEDULE_WITHIN).toBe(LIVE_CASES.constants.onScheduleMinutes)
  })

  it.each(LIVE_CASES.labels)('reads $phase, $gapMinutes min as "$label"', ({ phase, gapMinutes, label }) => {
    const made = liveLabel(phase as LivePhase, gapMinutes)
    expect(made && liveLabelText(made)).toBe(label)
  })

  it('is ahead or behind at six minutes either way, and estimated while the plane is', () => {
    expect(liveLabel('inAir', 6)).toEqual({ kind: 'ahead', minutes: 6, isEstimated: false })
    expect(liveLabel('inAir', -6)).toEqual({ kind: 'behind', minutes: 6, isEstimated: false })
    expect(liveLabel('estimated', -6)).toEqual({ kind: 'behind', minutes: 6, isEstimated: true })
  })

  it('is on schedule within five minutes', () => {
    expect(liveLabel('inAir', 5)).toEqual({ kind: 'onSchedule' })
    expect(liveLabel('estimated', -5)).toEqual({ kind: 'onSchedule' })
    expect(liveLabel('landed', -5)).toEqual({ kind: 'landedOnTime' })
    expect(liveLabel('onGround', -5)).toEqual({ kind: 'stillOnGround', minutesBehind: null })
  })

  it('is null with no gap, and for a flight that isn\'t live or is somewhere else', () => {
    expect(liveLabel('inAir', null)).toBeNull()
    expect(liveLabel('onGround', null)).toBeNull()
    expect(liveLabel('notLive', 12)).toBeNull()
    expect(liveLabel('elsewhere', 12)).toBeNull()
  })

  it('writes hours as the landing countdown does', () => {
    expect([minutesText(45), minutesText(120), minutesText(130)]).toEqual(['45 min', '2 h', '2 h 10 min'])
    expect(liveLabelText({ kind: 'behind', minutes: 75, isEstimated: true })).toBe('About 1 h 15 min behind')
  })
})
