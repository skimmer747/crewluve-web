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

/** How far below the top of the list's box a heading counts as stuck there: the app's 20 points (EventTimelineView). */
const STUCK_SLACK = 20

const topOf = (el: HTMLElement | null) => el?.getBoundingClientRect().top ?? 0

/**
 * The Schedule page (EventTimelineView, slice 3A §4, 3B §3): the window's height exactly, with a bar holding the back
 * button and the title, then every leg by day in a box of its own that scrolls, as the app's scroll view does. The days'
 * headings stick at the top of the box, and the list opens at the next leg's day. Today's heading is green, and the one
 * stuck at the top yellow.
 */
export function SchedulePage({ legs, pilot, now, timeZone, h24, airports, onBack }: SchedulePageProps) {
  const days = useMemo(() => scheduleDays(legs, timeZone), [legs, timeZone])
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

  /** The day whose heading is stuck at the top of the list: the last heading within 20 px of it (3A §4.3, 3B §3.4). */
  const stuckDay = () => {
    const limit = topOf(list.current) + STUCK_SLACK
    let found: number | null = null
    for (const heading of list.current?.querySelectorAll<HTMLElement>('.day-heading') ?? []) {
      if (heading.getBoundingClientRect().top <= limit) found = Number(heading.parentElement!.dataset.day)
    }
    return found
  }

  // The list appears already at its opening day, with that day's heading stuck, and focus goes to the title so screen
  // readers announce the page (3A §3.3, §4.11). Focus comes first: Safari before 15 ignores preventScroll and scrolls to
  // what takes focus. Only once: later renders leave the scroll where it is.
  useLayoutEffect(() => {
    const box = list.current!
    const day = openingDay(days, now, timeZone)
    const section = day == null ? null : box.querySelector<HTMLElement>(`[data-day="${day}"]`)
    title.current?.focus({ preventScroll: true })
    box.scrollTo(0, section ? box.scrollTop + section.getBoundingClientRect().top - topOf(box) : 0)
    setStuck(stuckDay())
  }, [])

  // The stuck heading again whenever the list scrolls or the window resizes, once a frame, and when the days change.
  useEffect(() => {
    const box = list.current!
    let frame = 0
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0
        setStuck(stuckDay())
      })
    }
    setStuck(stuckDay())
    box.addEventListener('scroll', soon, { passive: true })
    window.addEventListener('resize', soon)
    return () => {
      cancelAnimationFrame(frame)
      box.removeEventListener('scroll', soon)
      window.removeEventListener('resize', soon)
    }
  }, [days])

  const today = calendarDay(now, timeZone)
  const nextId = nextLegId(legs, now)
  return (
    <main class="schedule">
      <header class="schedule-bar">
        <button type="button" class="glass round schedule-back" aria-label="Back" onClick={onBack}>
          <Chevron direction="left" size={17} weight={2.2} />
        </button>
        <h1 class="schedule-title" ref={title} tabIndex={-1}>Schedule</h1>
      </header>
      {/* The list's own scrolling box, which keyboards reach to scroll it. The list inside keeps the 12 px above and
          below, so the box has no padding at the top and the headings stick at its very top (3B §3.4). */}
      <div class="schedule-days" ref={list} tabIndex={0} role="region" aria-label="Legs">
        <div class="schedule-list">
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
                      <TimelineRow key={row.leg.id} leg={row.leg} look={row.look} times={row.times} moment={legMoment(row.leg, now, nextId)}
                        now={now} gap={row.gap} />
                    ))}
                  </ol>
                </section>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}
