import { useEffect, useState } from 'preact/hooks'
import { directionText, spokenTimeDifference, type TimeDifference } from '../copy/location'

/** The odometer's pause before the first hour, and the time each hour takes (OdometerTimeDiffView). */
export const ODOMETER_DELAY_MS = 200
export const ODOMETER_STEP_MS = 150

/** The time difference under the local time (slice 2B1 §4): "same time as you", or the app's counting odometer. */
export function TimeDifferenceLine({ diff }: { diff: TimeDifference }) {
  if (diff.direction === 'same') return <p class="time-diff">same time as you</p>
  // A new difference, from a new city or a clock change, counts up afresh, as the app's view does when it appears.
  return <Odometer key={`${diff.direction} ${diff.hours}:${diff.minutes}`} diff={diff} direction={diff.direction} />
}

const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The hours count up from 0, one step every 150 ms, then the minutes fade in. People who ask for reduced motion, and
 * differences under an hour, get the final text at once. Screen readers hear it in words instead.
 */
function Odometer({ diff, direction }: { diff: TimeDifference; direction: 'ahead' | 'behind' }) {
  const [still] = useState(() => diff.hours === 0 || prefersReducedMotion())
  const [hours, setHours] = useState(still ? diff.hours : 0)
  const [minutesIn, setMinutesIn] = useState(still)
  useEffect(() => {
    if (still) return
    let step = 0
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      step += 1
      if (step <= diff.hours) {
        setHours(step)
        timer = setTimeout(tick, ODOMETER_STEP_MS)
      } else {
        setMinutesIn(true)
      }
    }
    timer = setTimeout(tick, ODOMETER_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])
  return (
    <p class={`time-diff ${direction}`}>
      <span class="sr-only">{spokenTimeDifference(diff)}</span>
      <span aria-hidden="true">
        {diff.hours > 0 && (
          <>
            {/* A fresh element for each new number, so it rolls in like the app's numeric text. */}
            <span key={hours} class="time-diff-num roll">
              {hours}
            </span>
            h
          </>
        )}
        {diff.minutes > 0 && (
          <span class={minutesIn ? 'time-diff-minutes shown' : 'time-diff-minutes'}>
            {diff.hours > 0 ? ' ' : ''}
            <span class="time-diff-num">{diff.minutes}</span>m
          </span>
        )}
        {` ${directionText(direction)}`}
      </span>
    </p>
  )
}
