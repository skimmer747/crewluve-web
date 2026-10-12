import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import { dayHeading, legTimes } from '../copy/schedule'
import type { AirportIndex } from '../data/airports'
import type { Leg } from '../engine/legs'
import type { Pilot } from '../engine/types'
import { calendarDay } from '../time/zoned'
import { Chevron } from './Chevron'
import { Icon } from './Icon'
import { gapBefore, legMoment, nextLegId, openingDay, rowLook, scheduleDays } from './scheduleFacts'
import { TimelineRow } from './TimelineRow'

export interface SchedulePageProps {
  /** The legs to list, in start order (scheduleLegs). */
  legs: Leg[]
  pilot: Pilot
  now: number
  /** The visitor's zone: the days and times are theirs (slice 3A §4.3, §4.7). */
  timeZone: string
  h24: boolean
  airports: AirportIndex
  onBack: () => void
}

/** How far below the bar a heading counts as stuck there: the app's 20 points (EventTimelineView). */
const STUCK_SLACK = 20

const bottomOf = (el: HTMLElement | null) => el?.getBoundingClientRect().bottom ?? 0

/**
 * The Schedule page (EventTimelineView, slice 3A §4): a bar with the back button and the title, then every leg by day
 * under headings that stick, opening at the next leg's day. Today's heading is green, and the one stuck under the bar
 * yellow.
 */
export function SchedulePage({ legs, pilot, now, timeZone, h24, airports, onBack }: SchedulePageProps) {
  const days = useMemo(() => scheduleDays(legs, timeZone), [legs, timeZone])
  const bar = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState<number | null>(null)
  // Each row's look, times and gap, worked out once per leg: only the clock's parts change from second to second.
  const rows = useMemo(
    () =>
      days.map((d) => ({
        day: d.day,
        legs: d.legs.map((leg, i) => ({
          leg,
          look: rowLook(leg, pilot, airports),
          times: legTimes(leg.start, leg.end, timeZone, h24),
          gap: i > 0 ? gapBefore(d.legs[i - 1], leg) : null,
        })),
      })),
    [days, pilot, airports, timeZone, h24],
  )

  /** The day whose heading is stuck under the bar: the last heading within 20 px of it (§4.3). */
  const stuckDay = () => {
    const limit = bottomOf(bar.current) + STUCK_SLACK
    let found: number | null = null
    for (const heading of list.current?.querySelectorAll<HTMLElement>('.day-heading') ?? []) {
      if (heading.getBoundingClientRect().top <= limit) found = Number(heading.parentElement!.dataset.day)
    }
    return found
  }

  // The page appears already at its opening day, with that day's heading stuck, and focus goes to the title so screen
  // readers announce the page (§3.3, §4.11). Focus comes first: Safari before 15 ignores preventScroll and scrolls to
  // the title, and the scroll after it puts the page right. Only once: later renders leave the scroll where it is.
  useLayoutEffect(() => {
    const day = openingDay(days, now, timeZone)
    const section = day == null ? null : list.current?.querySelector<HTMLElement>(`[data-day="${day}"]`)
    title.current?.focus({ preventScroll: true })
    window.scrollTo(0, section ? window.scrollY + section.getBoundingClientRect().top - bottomOf(bar.current) : 0)
    setStuck(stuckDay())
  }, [])

  // The stuck heading again whenever the page scrolls or resizes, once a frame, and when the days change.
  useEffect(() => {
    let frame = 0
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0
        setStuck(stuckDay())
      })
    }
    setStuck(stuckDay())
    window.addEventListener('scroll', soon, { passive: true })
    window.addEventListener('resize', soon)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', soon)
      window.removeEventListener('resize', soon)
    }
  }, [days])

  const today = calendarDay(now, timeZone)
  const nextId = nextLegId(legs, now)
  return (
    <main class="schedule">
      <header class="schedule-bar" ref={bar}>
        <button type="button" class="glass round schedule-back" aria-label="Back" onClick={onBack}>
          <Chevron direction="left" size={17} weight={2.2} />
        </button>
        <h1 class="schedule-title" ref={title} tabIndex={-1}>Schedule</h1>
      </header>
      <div class="schedule-days" ref={list}>
        {rows.length === 0 ? (
          <div class="schedule-empty">
            <Icon name="CalendarBlank" size={40} />
            <p class="schedule-empty-title">No schedule data</p>
            <p class="schedule-empty-text">Schedule will appear when your pilot's Duty app sends trip details.</p>
          </div>
        ) : (
          rows.map((d) => {
            const heading = dayHeading(d.day, today)
            return (
              <section key={d.day} class="schedule-day" data-day={d.day}>
                {/* Shown in capitals; the label keeps the words as written, so screen readers don't spell them out. */}
                <h2 class="day-heading" aria-label={heading}>
                  <span class={d.day === today ? 'day-pill today' : d.day === stuck ? 'day-pill stuck' : 'day-pill'}>{heading}</span>
                </h2>
                {/* Safari drops the list role from a list shown without bullets; the role puts it back. */}
                <ol class="day-legs" role="list">
                  {d.legs.map((row) => (
                    <TimelineRow key={row.leg.id} leg={row.leg} look={row.look} times={row.times} moment={legMoment(row.leg, now, nextId)} now={now}
                      gap={row.gap} />
                  ))}
                </ol>
              </section>
            )
          })
        )}
      </div>
    </main>
  )
}
