import { calendarDay, MONTHS, WEEKDAYS, zoneAbbr, zonedParts } from '../time/zoned'
import { clockText, spokenDuration } from './format'

const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * A leg's length or countdown as the app's schedule writes it (TimelineRowView and TimeGapView, formattedDuration):
 * "1d 4h" or "1d" from a day up; under a day "4h 30m", "4h" or "35m", or with seconds "3:12:45" and "12:09".
 */
export function legDuration(ms: number, withSeconds: boolean): string {
  const total = Math.floor(Math.max(ms, 0) / 1000)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  if (hours > 0) {
    if (withSeconds) return `${hours}:${pad2(minutes)}:${pad2(seconds)}`
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  return withSeconds ? `${minutes}:${pad2(seconds)}` : `${minutes}m`
}

/** A day's heading (EventTimelineView.sectionHeaderText): "Today", "Yesterday", "Tomorrow", or "Thursday, Oct 16". */
export function dayHeading(ms: number, now: number, timeZone: string): string {
  const offset = calendarDay(ms, timeZone) - calendarDay(now, timeZone)
  if (offset === 0) return 'Today'
  if (offset === -1) return 'Yesterday'
  if (offset === 1) return 'Tomorrow'
  const p = zonedParts(ms, timeZone)
  return `${WEEKDAYS[p.weekday]}, ${MONTHS[p.month - 1].slice(0, 3)} ${p.day}`
}

/**
 * A row's second line (TimelineRowView.subtitle): "6:05am edt – 7:40am edt", or "06:05 edt – 07:40 edt" on 24-hour
 * devices. Each time carries the abbreviation in force then; the app puts today's on both (slice 3A §4.7).
 */
export function legTimes(start: number, end: number, timeZone: string, h24: boolean): string {
  const at = (ms: number) => `${clockText(ms, timeZone, h24)} ${zoneAbbr(ms, timeZone).toLowerCase()}`
  return `${at(start)} – ${at(end)}`
}

/** What names a gap between two legs: the leg after it (TimeGapView.gapType). */
export type GapKind = 'home' | 'turn' | 'layover' | 'gap'

const GAP_LABELS: Record<GapKind, string> = { home: 'Home', turn: 'Turn', layover: 'Layover', gap: 'Gap' }

/** A gap's label (TimeGapView.gapLabel): "Layover 3h 10m", "Gap 1h 25m". */
export function gapText(kind: GapKind, ms: number): string {
  return `${GAP_LABELS[kind]} ${legDuration(ms, false)}`
}

/** Where a leg stands: happening now, the next to start, or neither (TimelineRowView's isActive and showUpNext). */
export type LegMoment = 'happening' | 'next' | 'other'

export interface LegClock {
  label: 'Ends in' | 'Starts in' | 'Duration'
  value: string
  /** The label and value in words, for screen readers: "Starts in 3 hours, 12 minutes". */
  spoken: string
}

/** A row's right-hand column (CountdownText): the time left, the time until it starts, or its length. */
export function legClock(start: number, end: number, now: number, moment: LegMoment): LegClock {
  const ms = moment === 'happening' ? end - now : moment === 'next' ? start - now : end - start
  const label = moment === 'happening' ? 'Ends in' : moment === 'next' ? 'Starts in' : 'Duration'
  return { label, value: legDuration(ms, moment !== 'other'), spoken: `${label} ${spokenDuration(ms)}` }
}
