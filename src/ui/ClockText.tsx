import { createContext } from 'preact'
import { useContext, useMemo } from 'preact/hooks'
import { key, MARK, zoneName } from '../copy/clockLabel'
import { shortTimeText } from '../copy/format'
import { viewerTimeZone, zonedParts } from '../time/zoned'
import { clockParts } from './clockParts'

/**
 * What the page knows of whose time is whose (time labels design §3.5): the viewer's zone, the moment shown, whose zone
 * names the hover tips, and the zone of each city a line may name, the trip's airports'.
 */
export interface ClockZones {
  viewerTz: string
  at: number
  cities: Record<string, string>
}

/** Given by the pilot's pages. Without it, as a card on its own in a test, the browser's zone and the time now. */
export const ClockZonesContext = createContext<ClockZones | null>(null)

function useClockZones(): ClockZones {
  return useContext(ClockZonesContext) ?? { viewerTz: viewerTimeZone(), at: Date.now(), cities: {} }
}

/**
 * Words with their times wrapped in <time>, each with its 24-hour time and, as its hover tip, the time and its zone's
 * full name: "4:35 PM Eastern Standard Time" (time labels design §3.5). Screen readers hear the family's "L" as "your
 * time".
 */
export function ClockText({ text }: { text: string }) {
  const { viewerTz, at, cities } = useClockZones()
  const parts = clockParts(text, viewerTz, cities)
  if (parts.length === 1 && typeof parts[0] === 'string') return <>{text}</>
  return (
    <>
      {parts.map((part, i) =>
        typeof part === 'string' ? part : (
          <time key={i} dateTime={part.datetime} title={`${part.shown} ${zoneName(part.zone, at)}`}>
            {part.shown}
            {part.isYours ? (
              <>
                <span aria-hidden="true"> {MARK}</span>
                <span class="sr-only"> your time</span>
              </>
            ) : part.label}
          </time>
        ),
      )}
    </>
  )
}

/** "L = your time (Eastern Standard Time)": the key to the family's times, under the facts and the status (§3.5). */
export function ClockKey() {
  const { viewerTz, at } = useClockZones()
  return <p class="clock-key">{key(viewerTz, at)}</p>
}

/**
 * A clock that names whose time it is around it, as the location card's "Current time in Taipei: 3:45 PM": `ms` in
 * `zone`, then `label`, wrapped in <time> with the zone's full name as its hover tip (time labels design §3.5, §3.8).
 */
export function ZonedTime({ ms, zone, h24, label = '' }: { ms: number; zone: string; h24: boolean; label?: string }) {
  // Worked out once a second, not on each redraw between: the sun popup redraws on every move of a drag. The zone's
  // name is the one in force at `ms`.
  const { shown, datetime, title } = useMemo(() => {
    const time = shortTimeText(ms, zone, h24)
    const { hour, minute } = zonedParts(ms, zone)
    return { shown: time, datetime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, title: `${time} ${zoneName(zone, ms)}` }
  }, [ms, zone, h24])
  return <time dateTime={datetime} title={title}>{shown}{label}</time>
}
