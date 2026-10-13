import type { RefObject } from 'preact'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import { dayHeading, legTimes } from '../copy/schedule'
import type { AirportIndex } from '../data/airports'
import type { Leg } from '../engine/legs'
import type { Pilot } from '../engine/types'
import { calendarDay, MINUTE } from '../time/zoned'
import { firstWeekday, monthOf, scrollDay, type Month } from './calendarFacts'
import { Icon } from './Icon'
import { prefersReducedMotion } from './motion'
import { gapBefore, legMoment, nextLegId, openingDay, rowLook, scheduleDays } from './scheduleFacts'
import { TimelineRow } from './TimelineRow'
import { TripCalendar } from './TripCalendar'

export interface ScheduleViewProps {
  /** The legs to list, in start order (scheduleLegs). */
  legs: Leg[]
  pilot: Pilot
  now: number
  /** The visitor's zone: the days and times are theirs (slice 3A §4.3, §4.7). */
  timeZone: string
  h24: boolean
  airports: AirportIndex
  /** The week's first day, 0 = Sunday: the visitor's region's, unless a test gives one (slice 3B §5.8). */
  weekStart?: number
  /**
   * What takes focus as the view opens, before the list scrolls: the Schedule page's title, so screen readers announce
   * the page (3A §3.3). Beside the status, nothing does (3C §5.4).
   */
  focusOnOpen?: RefObject<HTMLElement>
}

/** How far below the top of the list's box a heading counts as stuck there: the app's 20 points (EventTimelineView). */
const STUCK_SLACK = 20

/** The windows tall enough to keep the calendar pinned under the bar (slice 3B §3.2). */
const TALL = '(min-height: 500px)'

/** Whether the window is tall enough for the pinned calendar: yes where the browser can't say. */
const tallEnough = () => typeof matchMedia !== 'function' || matchMedia(TALL).matches

const topOf = (el: HTMLElement | null) => el?.getBoundingClientRect().top ?? 0

/** The scroll that puts `section` at the top of the list's `box`, from wherever the box is scrolled now. */
const scrollTopFor = (box: HTMLElement, section: HTMLElement) => box.scrollTop + section.getBoundingClientRect().top - topOf(box)

/** Where the list is when the phone turns: the first day showing in it and how far down, and the calendar's focused control. */
interface Place {
  day: number | null
  offset: number
  /** Which of the calendar's buttons had focus, as the move rebuilds them all; -1 for none. */
  focus: number
}

/**
 * The schedule below the Schedule page's bar (EventTimelineView, slice 3A §4, 3B §3): the month calendar pinned at the
 * top, then every leg by day in a box of its own that scrolls, as the app's scroll view does. The days' headings stick
 * at the top of the box, and the list opens at the next leg's day. Today's heading is green, and the one stuck at the
 * top yellow. Tapping a day or a row, or Current Event, scrolls the list (3B §5). It goes under the Schedule page's
 * bar, or beside the status on a wide window (3C §4.5).
 */
export function ScheduleView({ legs, pilot, now, timeZone, h24, airports, weekStart, focusOnOpen }: ScheduleViewProps) {
  const days = useMemo(() => scheduleDays(legs, timeZone), [legs, timeZone])
  const today = calendarDay(now, timeZone)
  // The calendar opens on this month with today selected (3B §5.1). The page keeps both, so the calendar can move.
  const [selected, setSelected] = useState(today)
  const [month, setMonth] = useState<Month>(() => monthOf(today))
  const firstDay = useMemo(() => weekStart ?? firstWeekday(), [weekStart])
  // Under 500 px tall, the calendar moves into the list and scrolls away with it; a turn of the phone moves it, keeping
  // the list where it was, and the calendar's focus (3B §3.2).
  const [pinned, setPinned] = useState(tallEnough)
  const kept = useRef<Place | null>(null)
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

  // The list appears already at its opening day, with that day's heading stuck, and focus goes to what it was given,
  // the Schedule page's title, so screen readers announce the page (3A §3.3, §4.11). Focus comes first: Safari before
  // 15 ignores preventScroll and scrolls to what takes focus. Only once: later renders leave the scroll where it is.
  useLayoutEffect(() => {
    const box = list.current!
    const day = openingDay(days, now, timeZone)
    const section = day == null ? null : box.querySelector<HTMLElement>(`[data-day="${day}"]`)
    focusOnOpen?.current?.focus({ preventScroll: true })
    box.scrollTo(0, section ? scrollTopFor(box, section) : 0)
    setStuck(stuckDay())
  }, [])

  // While the view shows, on the Schedule page or beside the status, the body gives up its full height: Safari
  // before 15.4 has no dvh, and its 100vh, taller than the window with the toolbar showing, would leave the window
  // something to scroll (3B §3.1, 3C §6.1).
  useLayoutEffect(() => {
    document.documentElement.classList.add('schedule-open')
    return () => document.documentElement.classList.remove('schedule-open')
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

  /** Where the list is: the first day showing in its box, how far below the box's top it starts, and the calendar's focus. */
  const place = (): Place => {
    const box = list.current!
    const { top, bottom } = box.getBoundingClientRect()
    // As a phone turns on its side, the window has shrunk before the calendar moves, and the bar and the pinned calendar
    // can leave the box no height at all: a day starting right at its top still counts, so `<=` at the bottom.
    const showing = [...box.querySelectorAll<HTMLElement>('.schedule-day')].find((section) => {
      const rect = section.getBoundingClientRect()
      return rect.bottom > top && rect.top <= bottom
    })
    const buttons = [...document.querySelectorAll<HTMLElement>('.calendar button')]
    return {
      day: showing ? Number(showing.dataset.day) : null,
      offset: showing ? showing.getBoundingClientRect().top - top : 0,
      focus: buttons.indexOf(document.activeElement as HTMLElement),
    }
  }

  // A turn of the phone across 500 px moves the calendar, noting first where the list is.
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const query = matchMedia(TALL)
    const turn = () => {
      kept.current = place()
      setPinned(query.matches)
    }
    query.addEventListener?.('change', turn)
    return () => query.removeEventListener?.('change', turn)
  }, [])

  // Once the calendar has moved, the day that was showing at the top of the list is back as far down as it was; before
  // any day showed, the list goes back to its top. The calendar's focused control, rebuilt by the move, gets focus back.
  useLayoutEffect(() => {
    const was = kept.current
    kept.current = null
    if (!was) return
    const box = list.current!
    const section = was.day === null ? null : box.querySelector<HTMLElement>(`[data-day="${was.day}"]`)
    box.scrollTo(0, section ? scrollTopFor(box, section) - was.offset : 0)
    if (was.focus >= 0) document.querySelectorAll<HTMLElement>('.calendar button')[was.focus]?.focus()
  }, [pinned])

  /** Scrolls the list so `day`'s heading sits at the top of its box, gliding unless the visitor asks for reduced motion (3B §5.6). */
  const scrollToDay = (day: number | null) => {
    const box = list.current
    const section = day === null ? null : box?.querySelector<HTMLElement>(`[data-day="${day}"]`)
    if (!box || !section) return
    box.scrollTo({ top: scrollTopFor(box, section), behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  // Where a tap takes the list, once the page has redrawn: a month that turns can change the calendar's height, which on
  // a short window moves the list under it (3B §3.2, §5.2). A new object each time, so the same day twice scrolls twice.
  const [jump, setJump] = useState<{ day: number | null } | null>(null)
  useLayoutEffect(() => {
    if (jump) scrollToDay(jump.day)
  }, [jump])

  /** A day picked on the calendar: selected, its month shown, and the list taken to it (3B §5.2). */
  const pick = (day: number) => {
    setSelected(day)
    setMonth(monthOf(day))
    setJump({ day: scrollDay(day, days, now, timeZone) })
  }

  /** A row's day, picked as the calendar's would be, unless it's the selected day already, as in the app (3B §5.3). */
  const pickRow = (leg: Leg) => {
    const day = calendarDay(leg.start, timeZone)
    if (day !== selected) pick(day)
  }

  /** Current Event: this month and today, and the list where it opened (3B §5.4). */
  const currentEvent = () => {
    setSelected(today)
    setMonth(monthOf(today))
    setJump({ day: openingDay(days, now, timeZone) })
  }

  // The calendar's handlers stay the same functions from draw to draw, and call the latest pick and Current Event, so
  // the memoized calendar draws again only when what it shows changes (redraws §4.2).
  const latest = useRef({ pick, currentEvent })
  latest.current = { pick, currentEvent }
  const onPick = useCallback((day: number) => latest.current.pick(day), [])
  const onCurrentEvent = useCallback(() => latest.current.currentEvent(), [])

  const nextId = nextLegId(legs, now)
  // The time line moves once a minute, as the app's (3B §4.7).
  const calendar = (
    <>
      <TripCalendar month={month} firstDay={firstDay} legs={legs} now={Math.floor(now / MINUTE) * MINUTE} timeZone={timeZone} today={today}
        selected={selected} onSelect={onPick} onMonth={setMonth} onCurrentEvent={onCurrentEvent} />
      <div class="calendar-rule" />
    </>
  )
  return (
    <>
      {pinned && calendar}
      {/* The list's own scrolling box, which keyboards reach to scroll it. The list inside keeps the 12 px above and
          below, so the box has no padding at the top and the headings stick at its very top (3B §3.4). */}
      <div class="schedule-days" ref={list} tabIndex={0} role="region" aria-label="Legs">
        {!pinned && calendar}
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
                        now={now} gap={row.gap} onTap={() => pickRow(row.leg)} />
                    ))}
                  </ol>
                </section>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
