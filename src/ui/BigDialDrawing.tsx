import type { BigDialLayers } from './bigDial'
import { Icon } from './Icon'
import { DETAIL, type PlaneSpot } from './bigDialGeometry'
import { DIAL } from './sunDialGeometry'

/*
 * The drawing of the big dial's own layers (slice 2B2 §5.1, §5.2), which SunDial puts in at the popup's size in the
 * app's order: the hands under the sun, and the top layers over it. `bigDial.ts` works out what they show.
 */

/** The big dial's hands under the sun: the departure's, the delay's, home's dashed line, and the departure triangle. */
export function BigDialHands({ layers: { home, departure } }: { layers: BigDialLayers }) {
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
export function BigDialTop({ layers: { home, departure } }: { layers: BigDialLayers }) {
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
      <text class="sun-middle-big" x={DIAL.cx} y={DIAL.cy - DETAIL.middleAbove}>
        {big}
      </text>
      <text class="sun-middle-small" x={DIAL.cx} y={DIAL.cy + DETAIL.middleBelow}>
        {small}
      </text>
    </g>
  )
}
