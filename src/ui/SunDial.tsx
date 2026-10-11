import { useId } from 'preact/hooks'
import { dialTimeText } from '../copy/format'
import { sunDialLabel } from '../copy/location'
import { bigDialLabel } from '../copy/sunDetail'
import { isDaytime, type SunTimes } from '../time/sun'
import { bigDialLayers, bigDialTurns, type BigDialLayers, type DialDetail } from './bigDial'
import { dialMoment } from './dialTimeline'
import { useElapsed } from './hooks/useElapsed'
import { Icon } from './Icon'
import { arcPath, cornerFor, dialAngle, DETAIL, DIAL, glowBands, labelAt, markerPath, pointAt, skyBackground, tickAt, type PlaneSpot } from './sunDialGeometry'

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
  const turns = detail ? bigDialTurns(now, timeZone, detail) : null
  // The loop runs only on the big dial, when it has a turn to show and motion is welcome.
  const elapsed = useElapsed(turns != null && !turns.still && (turns.home || turns.departureDays != null))
  const big = detail && turns ? bigDialLayers(sun, now, timeZone, h24, detail, dialMoment(elapsed, turns)) : null
  const r = DIAL.radius
  const rise = dialAngle(sun.sunrise, timeZone)
  const set = dialAngle(sun.sunset, timeZone)
  const risePoint = pointAt(rise, r)
  const setPoint = pointAt(set, r)
  const hand = pointAt(dialAngle(now, timeZone), r)
  const day = isDaytime(now, sun)
  const icon = day ? DIAL.sunIcon : DIAL.moonIcon
  const corner = cornerFor(hand, icon)
  const labels = [
    { at: labelAt(rise), text: dialTimeText(sun.sunrise, timeZone, h24) },
    { at: labelAt(set), text: dialTimeText(sun.sunset, timeZone, h24) },
  ]
  const drawing = (
    <>
      {/* A span, since the card's button may hold only phrasing content; it's absolutely placed, so it acts as a block. */}
      <span class="sun-sky" style={{ background: skyBackground(rise, set) }} />
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
    const label = bigDialLabel({ sun, now, timeZone, homeTz: detail.homeTz, h24, city, departure: detail.departure })
    return (
      <div class="sun-dial big" role="img" aria-label={label}>
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
        aria-label={`${sunDialLabel(sun, now, timeZone, h24, city)}. Opens sun details.`}
        aria-haspopup="dialog"
        onClick={(e) => open(e.currentTarget)}
      >
        {drawing}
      </button>
    )
  }
  return (
    <div class="sun-dial" role="img" aria-label={sunDialLabel(sun, now, timeZone, h24, city)}>
      {drawing}
    </div>
  )
}

/** The big dial's hands under the sun: the departure's, the delay's, home's dashed line, and the departure triangle. */
function BigDialHands({ layers: { home, departure } }: { layers: BigDialLayers }) {
  return (
    <>
      {departure && <line class="sun-hand departure" x1={DIAL.cx} y1={DIAL.cy} x2={departure.hand.x} y2={departure.hand.y} />}
      {departure?.delay && <line class="sun-hand delay" x1={DIAL.cx} y1={DIAL.cy} x2={departure.delay.hand.x} y2={departure.delay.hand.y} />}
      {home && <line class="sun-home-line" x1={DIAL.cx} y1={DIAL.cy} x2={home.hand.x} y2={home.hand.y} />}
      {departure && <path class="sun-departure-marker" d={departure.marker} />}
    </>
  )
}

/** The big dial's top layers, over the sun: the house, the departure's planes and labels, and the loop's two turns. */
function BigDialTop({ layers: { home, departure } }: { layers: BigDialLayers }) {
  return (
    <>
      {home && (
        <g class="sun-house" transform={`translate(${home.house.x} ${home.house.y})`}>
          <Icon name="House" size={DETAIL.homeIcon} />
        </g>
      )}
      {departure && (
        <>
          <Plane class="departure" spot={departure.plane} size={DETAIL.plane} />
          <text class="sun-time departure" x={departure.label.at.x} y={departure.label.at.y}>
            {departure.label.text}
          </text>
        </>
      )}
      {departure?.delay && (
        <>
          <Plane class="delay" spot={departure.delay.plane} size={DETAIL.plane} />
          <text class="sun-time delay" x={departure.delay.label.at.x} y={departure.delay.label.at.y}>
            {departure.delay.label.text}
          </text>
        </>
      )}
      {home?.arrow && (
        <g class={`sun-arrow ${home.ahead ? 'ahead' : 'behind'}`} opacity={home.turn.opacity}>
          <path class="sun-arrow-arc" d={home.arrow.arc} />
          <path class="sun-arrow-head" d={home.arrow.head} />
        </g>
      )}
      {home && home.turn.middle > 0 && (
        <Middle tone={home.ahead ? 'ahead' : 'behind'} big={home.amount} small={home.ahead ? 'ahead' : 'behind'} opacity={home.turn.middle} />
      )}
      {departure && departure.turn.progress > 0 && (
        <>
          <g class="sun-sweep" opacity={departure.turn.opacity}>
            {departure.sweep.laps && <path class="sun-sweep-laps" d={departure.sweep.laps} />}
            {departure.sweep.solid && <path class="sun-sweep-solid" d={departure.sweep.solid} />}
            {departure.sweep.delay && <path class="sun-sweep-delay" d={departure.sweep.delay} />}
          </g>
          <Plane class={`rider ${departure.tone}`} spot={departure.rider} size={DETAIL.sweepPlane} opacity={departure.turn.middle} />
          <Middle tone={departure.tone} big={departure.countdown} small="to go" opacity={departure.turn.middle} />
        </>
      )}
    </>
  )
}

/** A plane icon of `size` at its spot, turned to point clockwise along the dial. */
function Plane({ class: tone, spot, size, opacity }: { class: string; spot: PlaneSpot; size: number; opacity?: number }) {
  return (
    <g
      class={`sun-plane ${tone}`}
      transform={`translate(${spot.corner.x} ${spot.corner.y}) rotate(${spot.rotate} ${size / 2} ${size / 2})`}
      opacity={opacity}
    >
      <Icon name="Airplane" size={size} />
    </g>
  )
}

/** The middle of the big dial during a turn: "-4h" over "behind", or "5h20m" over "to go", fading with the turn. */
function Middle({ tone, big, small, opacity }: { tone: string; big: string; small: string; opacity: number }) {
  return (
    <g class={`sun-middle ${tone}`} opacity={opacity}>
      <text class="sun-middle-big" x={DIAL.cx} y={DIAL.cy - 4.2}>
        {big}
      </text>
      <text class="sun-middle-small" x={DIAL.cx} y={DIAL.cy + 6}>
        {small}
      </text>
    </g>
  )
}
