import { useId, useMemo } from 'preact/hooks'
import { dialTimeText } from '../copy/format'
import { sunDialLabel } from '../copy/location'
import { bigDialLabel } from '../copy/sunDetail'
import { isDaytime, type SunTimes } from '../time/sun'
import { bigDialBase, bigDialLayers, type DialDetail } from './bigDial'
import { BigDialHands, BigDialTop } from './BigDialLayers'
import { dialMoment } from './dialTimeline'
import { useElapsed } from './hooks/useElapsed'
import { Icon } from './Icon'
import { arcPath, cornerFor, dialAngle, DIAL, glowBands, labelAt, markerPath, pointAt, skyBackground, tickAt } from './sunDialGeometry'

interface DialBase {
  sun: SunTimes
  now: number
  /** The pilot's time zone: the dial shows their day. */
  timeZone: string
  h24: boolean
  /** The city, for the screen-reader label. */
  city: string
}

/**
 * SunCircleView's size setting: 160 on the location card, where `onOpen` makes the dial a button that opens the popup
 * and is handed that button, for focus to come back to; 360 in the popup, which draws the big dial's own layers from
 * `detail` (the app's size > 160).
 */
export type SunDialProps = DialBase &
  ({ size?: 160; onOpen?: (dial: HTMLElement) => void; detail?: never } | { size: 360; detail: DialDetail; onOpen?: never })

/**
 * The 24-hour sun dial: SunCircleView with the parts the app draws at each size (slice 2B1 §5, slice 2B2 §5). Screen
 * readers hear it as one image, or as one button on the card.
 */
export function SunDial(props: SunDialProps) {
  const { sun, now, timeZone, h24, city } = props
  const id = useId()
  const detail = props.size === 360 ? props.detail : null
  // Everything that doesn't move, worked out when the card or the popup renders (once a second) rather than on every
  // animation frame of the big dial's loop: the angles, the labels, the description and the big layers' base.
  const fixed = useMemo(() => {
    const rise = dialAngle(sun.sunrise, timeZone)
    const set = dialAngle(sun.sunset, timeZone)
    const hand = pointAt(dialAngle(now, timeZone), DIAL.radius)
    const day = isDaytime(now, sun)
    const icon = day ? DIAL.sunIcon : DIAL.moonIcon
    return {
      rise,
      set,
      risePoint: pointAt(rise, DIAL.radius),
      setPoint: pointAt(set, DIAL.radius),
      hand,
      day,
      icon,
      corner: cornerFor(hand, icon),
      sky: skyBackground(rise, set),
      labels: [
        { at: labelAt(rise), text: dialTimeText(sun.sunrise, timeZone, h24) },
        { at: labelAt(set), text: dialTimeText(sun.sunset, timeZone, h24) },
      ],
      label: detail
        ? bigDialLabel({ sun, now, timeZone, homeTz: detail.homeTz, h24, city, departure: detail.departure })
        : sunDialLabel(sun, now, timeZone, h24, city),
      base: detail ? bigDialBase(sun, now, timeZone, h24, detail) : null,
    }
  }, [sun, now, timeZone, h24, city, detail])
  const { rise, set, risePoint, setPoint, hand, day, icon, corner, labels, base } = fixed
  const r = DIAL.radius
  // The loop runs only on the big dial, when it has a turn to show and motion is welcome.
  const turns = base?.turns
  const elapsed = useElapsed(turns != null && !turns.still && (turns.home || turns.departureDays != null))
  const big = base ? bigDialLayers(base, dialMoment(elapsed, base.turns)) : null
  const drawing = (
    <>
      {/* A span, since the card's button may hold only phrasing content; it's absolutely placed, so it acts as a block. */}
      <span class="sun-sky" style={{ background: fixed.sky }} />
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
        {big?.home?.shared.map((span, i) => <path key={i} class="sun-shared-wedge" d={span.wedge} />)}
        <path class="sun-day" d={arcPath(rise, set, r)} stroke={`url(#${id}-day)`} />
        <path class="sun-night" d={arcPath(set, rise, r)} stroke={`url(#${id}-night)`} />
        {glowBands(rise, set).map((band, i) => (
          <path key={i} class={`sun-band ${band.kind}`} d={arcPath(band.from, band.to, r)} />
        ))}
        {big?.home?.shared.map((span, i) => <path key={i} class="sun-shared" d={span.arc} />)}
        {[rise, set].map((angle, i) => {
          const tick = tickAt(angle)
          return <line key={i} class="sun-tick" x1={tick.from.x} y1={tick.from.y} x2={tick.to.x} y2={tick.to.y} />
        })}
        <path class="sun-marker" d={markerPath(270)} />
        <path class="sun-marker" d={markerPath(90)} />
        <line class="sun-hand" x1={DIAL.cx} y1={DIAL.cy} x2={hand.x} y2={hand.y} />
        {big && <BigDialHands layers={big} />}
        <g
          class={day ? 'sun-now day' : 'sun-now night'}
          transform={`translate(${corner.x} ${corner.y})`}
          filter={day ? `url(#${id}-glow)` : undefined}
        >
          <Icon name={day ? 'Sun' : 'Moon'} size={icon} />
        </g>
        {big && <BigDialTop layers={big} />}
        <text class="sun-noon" x={DIAL.cx} y={DIAL.cy - r - DIAL.noonLabelOffset}>
          Noon
        </text>
        {labels.map((label, i) => (
          <text key={i} class="sun-time" x={label.at.x} y={label.at.y}>
            {label.text}
          </text>
        ))}
      </svg>
    </>
  )
  if (detail) {
    return (
      <div class="sun-dial big" role="img" aria-label={fixed.label}>
        {drawing}
      </div>
    )
  }
  const open = props.onOpen
  if (open) {
    return (
      <button
        type="button"
        class="sun-dial"
        aria-label={`${fixed.label}. Opens sun details.`}
        aria-haspopup="dialog"
        onClick={(e) => open(e.currentTarget)}
      >
        {drawing}
      </button>
    )
  }
  return (
    <div class="sun-dial" role="img" aria-label={fixed.label}>
      {drawing}
    </div>
  )
}
