import { mapFlightProgress } from '../map/mapFlight'
import type { MapLeg } from '../map/tripMap'
import { shortTimeText } from './format'
import { about, landsAt, liveLabelText } from './tripMap'

/** Which of a flight's two planes: the real one, or the ghost where an on-schedule plane would be. */
export type PlaneKind = 'realPlane' | 'ghost'

/** What a plane's popup says (which plane design §3): a title, then a line or two. */
export interface PopupWords {
  title: string
  lines: string[]
}

const capitalized = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

/**
 * The popup on one of `leg`'s planes at `t`: now, or a moment of the replay when `isReplay` (which plane design §3). It
 * names the plane, then says what the card's bar says of it, with its landing time, in the viewer's time zone and clock.
 */
export function planePopupWords(leg: MapLeg, plane: PlaneKind, t: number, isReplay: boolean, viewerTz: string, h24: boolean): PopupWords {
  const name = leg.flightNumber ?? 'the flight'
  const time = (ms: number) => shortTimeText(ms, viewerTz, h24)
  if (plane === 'ghost') return { title: 'On schedule', lines: [`Where ${name} was scheduled to be`] }
  const title = `${capitalized(name)} · real plane`
  if (isReplay) return { title, lines: [`Where it was at ${time(t)}`] }
  if (!leg.flight) return { title, lines: [] }
  const progress = mapFlightProgress(leg.flight, t)
  const label = progress.label ? liveLabelText(progress.label) : null
  switch (progress.phase) {
    case 'estimated': {
      const seen = leg.flight.live?.fix?.seenAt
      const lands = `lands ${about(leg)}${time(leg.end)}`
      return {
        title: `${capitalized(name)} · best guess`,
        lines: [
          ...(seen != null ? [`Out of tracking range since ${time(seen)}, so it's shown where it should be by now`] : []),
          label ? `${label} · ${lands}` : capitalized(lands),
        ],
      }
    }
    case 'onGround':
    case 'returned':
    case 'inAir':
      return { title, lines: [...(label ? [label] : []), landsAt(leg, viewerTz, h24)] }
    case 'landed':
      // "at" the gate, as the card's sentence says once the plane is down, or "about" while that's still an estimate.
      return { title, lines: [...(label ? [label] : []), `Reaches the gate ${about(leg) || 'at '}${time(leg.end)}`] }
    default:
      // Down somewhere else: it has no label, and no landing time to give.
      return { title, lines: [] }
  }
}
