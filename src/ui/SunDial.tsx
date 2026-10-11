import { useId } from 'preact/hooks'
import { dialTimeText } from '../copy/format'
import { sunDialLabel } from '../copy/location'
import { isDaytime, type SunTimes } from '../time/sun'
import { Icon } from './Icon'
import { arcPath, dialAngle, DIAL, glowBands, labelAt, markerPath, pointAt, skyBackground, tickAt } from './sunDialGeometry'

export interface SunDialProps {
  sun: SunTimes
  now: number
  /** The pilot's time zone: the dial shows their day. */
  timeZone: string
  h24: boolean
  /** The city, for the screen-reader label. */
  city: string
}

/**
 * The location card's 24-hour sun dial: SunCircleView at card size, with only the parts the app draws there
 * (slice 2B1 §5). Screen readers hear it as one image.
 */
export function SunDial({ sun, now, timeZone, h24, city }: SunDialProps) {
  const id = useId()
  const r = DIAL.radius
  const rise = dialAngle(sun.sunrise, timeZone)
  const set = dialAngle(sun.sunset, timeZone)
  const risePoint = pointAt(rise, r)
  const setPoint = pointAt(set, r)
  const hand = pointAt(dialAngle(now, timeZone), r)
  const day = isDaytime(now, sun)
  const icon = day ? DIAL.sunIcon : DIAL.moonIcon
  const labels = [
    { at: labelAt(rise), text: dialTimeText(sun.sunrise, timeZone, h24) },
    { at: labelAt(set), text: dialTimeText(sun.sunset, timeZone, h24) },
  ]
  return (
    <div class="sun-dial" role="img" aria-label={sunDialLabel(sun, now, timeZone, h24, city)}>
      <div class="sun-sky" style={{ background: skyBackground(rise, set) }} />
      <svg viewBox={`0 0 ${DIAL.size} ${DIAL.size}`} aria-hidden="true">
        <defs>
          {/* userSpaceOnUse, so each arc's colors run from its own start to its end, as the app's do. */}
          <linearGradient id={`${id}-day`} gradientUnits="userSpaceOnUse" x1={risePoint.x} y1={risePoint.y} x2={setPoint.x} y2={setPoint.y}>
            <stop offset="0" class="sun-day-end" />
            <stop offset="0.5" class="sun-day-middle" />
            <stop offset="1" class="sun-day-end" />
          </linearGradient>
          <linearGradient id={`${id}-night`} gradientUnits="userSpaceOnUse" x1={setPoint.x} y1={setPoint.y} x2={risePoint.x} y2={risePoint.y}>
            <stop offset="0" class="sun-night-end" />
            <stop offset="0.5" class="sun-night-middle" />
            <stop offset="1" class="sun-night-end" />
          </linearGradient>
          {/* The sun's soft orange shadow (radius 4 in the app). */}
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
            <feFlood class="sun-glow" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path class="sun-day" d={arcPath(rise, set, r)} stroke={`url(#${id}-day)`} />
        <path class="sun-night" d={arcPath(set, rise, r)} stroke={`url(#${id}-night)`} />
        {glowBands(rise, set).map((band, i) => (
          <path key={i} class={`sun-band ${band.kind}`} d={arcPath(band.from, band.to, r)} />
        ))}
        {[rise, set].map((angle, i) => {
          const tick = tickAt(angle)
          return <line key={i} class="sun-tick" x1={tick.from.x} y1={tick.from.y} x2={tick.to.x} y2={tick.to.y} />
        })}
        <path class="sun-marker" d={markerPath(270)} />
        <path class="sun-marker" d={markerPath(90)} />
        <line class="sun-hand" x1={DIAL.cx} y1={DIAL.cy} x2={hand.x} y2={hand.y} />
        <g
          class={day ? 'sun-now day' : 'sun-now night'}
          transform={`translate(${hand.x - icon / 2} ${hand.y - icon / 2})`}
          filter={day ? `url(#${id}-glow)` : undefined}
        >
          <Icon name={day ? 'Sun' : 'Moon'} size={icon} />
        </g>
        <text class="sun-noon" x={DIAL.cx} y={DIAL.cy - r - DIAL.noonLabelOffset}>
          Noon
        </text>
        {labels.map((label, i) => (
          <text key={i} class="sun-time" x={label.at.x} y={label.at.y}>
            {label.text}
          </text>
        ))}
      </svg>
    </div>
  )
}
