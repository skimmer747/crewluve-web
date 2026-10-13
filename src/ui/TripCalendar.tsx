import { useMemo } from 'preact/hooks'
import { dayName, monthTitle, weekdayColumns } from '../copy/calendar'
import type { Leg } from '../engine/legs'
import { addMonths, monthGrid, timeLine, weekBars, type Bar, type GridDay, type Month } from './calendarFacts'
import { Chevron } from './Chevron'

export interface TripCalendarProps {
  /** The month shown. */
  month: Month
  /** The week's first day, 0 = Sunday. */
  firstDay: number
  /** The list's legs, in start order. */
  legs: readonly Leg[]
  /** The page's clock, for the time line. */
  now: number
  timeZone: string
  /** Today and the selected day, as calendar day numbers in the visitor's zone. */
  today: number
  selected: number
  onSelect: (day: number) => void
  onMonth: (month: Month) => void
  onCurrentEvent: () => void
}

/** A place across a week, in days from its start, as a share of its width. */
const percent = (days: number) => `${(days / 7) * 100}%`

/**
 * The month calendar (TripCalendarView, CalendarWeekRowView, CalendarTripBarView; slice 3B §4): the month between its
 * arrows and Current Event, the weekday letters, and a row a week with the days' numbers, the codes over layovers and
 * rests at base, the bars, the time line and the grid lines. It keeps no state: the page says what to show.
 */
export function TripCalendar({ month, firstDay, legs, now, timeZone, today, selected, onSelect, onMonth, onCurrentEvent }: TripCalendarProps) {
  const weeks = useMemo(
    () => monthGrid(month, firstDay).map((days) => ({ days, bars: weekBars(days[0].day, legs, timeZone) })),
    [month.year, month.month, firstDay, legs, timeZone],
  )
  return (
    <div class="calendar">
      <div class="calendar-header">
        <button type="button" class="calendar-arrow" aria-label="Previous month" onClick={() => onMonth(addMonths(month, -1))}>
          <Chevron direction="left" size={17} weight={2.2} />
        </button>
        <span class="calendar-space" />
        <span id="calendar-title" class="calendar-title" aria-live="polite">{monthTitle(month.year, month.month)}</span>
        <span class="calendar-space" />
        <button type="button" class="calendar-now" onClick={onCurrentEvent}>Current Event</button>
        <span class="calendar-space" />
        <button type="button" class="calendar-arrow" aria-label="Next month" onClick={() => onMonth(addMonths(month, 1))}>
          <Chevron size={17} weight={2.2} />
        </button>
      </div>
      <div role="grid" aria-labelledby="calendar-title">
        <div class="calendar-weekdays" role="row">
          {weekdayColumns(firstDay).map((column) => (
            <span key={column.name} role="columnheader" aria-label={column.name}>{column.letter}</span>
          ))}
        </div>
        {weeks.map(({ days, bars }) => {
          const line = timeLine(days[0].day, now, timeZone)
          return (
            <div key={days[0].day} class="calendar-week" role="row">
              {days.map((d) => (
                <span key={d.day} role="gridcell" aria-selected={d.day === selected ? 'true' : 'false'}>
                  <button type="button" class={dayClass(d, today, selected)} data-calendar-day={d.day} aria-label={dayName(d.day)}
                    aria-current={d.day === today ? 'date' : undefined} onClick={() => onSelect(d.day)}>
                    <span class="calendar-num">{d.date}</span>
                  </button>
                </span>
              ))}
              <span class="calendar-art" aria-hidden="true">
                {bars.map((bar) => <WeekBar key={bar.id} bar={bar} />)}
                {bars.map((bar) => bar.code && (
                  <span key={`${bar.id} code`} class="calendar-code" style={{ left: percent((bar.from + bar.to) / 2) }}>{bar.code}</span>
                ))}
                {line != null && <span class="calendar-line" style={{ left: percent(line) }} />}
                {[1, 2, 3, 4, 5, 6].map((column) => <span key={column} class="calendar-vline" style={{ left: percent(column) }} />)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function dayClass(d: GridDay, today: number, selected: number): string {
  const marks = [d.inMonth ? null : 'other', d.day === today ? 'today' : null, d.day === selected ? 'selected' : null]
  return ['calendar-day', ...marks.filter(Boolean)].join(' ')
}

/** One bar, in its kind's color, rounded where its trip starts or ends (CalendarTripBarView). */
function WeekBar({ bar }: { bar: Bar }) {
  const ends = `${bar.roundStart ? ' round-start' : ''}${bar.roundEnd ? ' round-end' : ''}`
  return <span class={`calendar-bar bar-${bar.kind}${ends}`} style={{ left: percent(bar.from), width: percent(bar.to - bar.from) }} />
}
