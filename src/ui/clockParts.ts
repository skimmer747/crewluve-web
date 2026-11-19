import { MARK } from '../copy/clockLabel'
import type { TripMap } from '../map/tripMap'

/**
 * A time in a line, and whose it is (time labels design §3.5): the family's, marked "L", or a city's, named after it,
 * before "in" and its name, after its name and a dot, or first in a pair after the city the line has named. The page
 * wraps each in <time> with its zone's full name as a hover tip.
 */
export interface ClockPart {
  /** The time as the line shows it: "4:35 PM", "16:35". */
  shown: string
  /** What names it, straight after it: " L", " Cologne", or nothing where it's named another way. */
  label: string
  zone: string
  isYours: boolean
  /** As a 24-hour time, for <time datetime>: "16:35". */
  datetime: string
}

/** A time as the site's clockLabel writes it: "4:35 PM", with a narrow or plain space, or "16:35". */
const TIME = /\b(\d{1,2}):(\d\d)(?:[  ]([AP]M))?/g
const LETTER = /[\p{L}'’]/u

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** "16:35" from "4:35 PM". */
function datetimeOf(hour: number, minute: string, half: string | undefined): string {
  const h = half == null ? hour : (hour % 12) + (half === 'PM' ? 12 : 0)
  return `${String(h).padStart(2, '0')}:${minute}`
}

/**
 * `text` cut into its words and its times, each time with whose it is. `cities` gives the zone of each city the line may
 * name. A time no one names is left in the words.
 */
export function clockParts(text: string, viewerTz: string, cities: Record<string, string>): (string | ClockPart)[] {
  const names = Object.keys(cities).sort((a, b) => b.length - a.length)
  const cityAt = (at: number) => names.find((name) => text.startsWith(name, at) && !LETTER.test(text.charAt(at + name.length)))
  /** The city named last before `end`, for a pair's first time. */
  const cityBefore = (end: number) => {
    let best: { name: string; at: number } | null = null
    for (const name of names) {
      const at = text.lastIndexOf(name, end)
      if (at >= 0 && at + name.length <= end && (best == null || at > best.at)) best = { name, at }
    }
    return best?.name ?? null
  }
  const pairAfter = new RegExp(`^ · ${TIME.source} ${escaped(MARK)}(?![\\p{L}'’])`, 'u')

  const out: (string | ClockPart)[] = []
  let done = 0
  for (const match of text.matchAll(TIME)) {
    const start = match.index ?? 0
    const shown = match[0]
    const end = start + shown.length
    if (start < done) continue
    const after = text.slice(end)
    const datetime = datetimeOf(Number(match[1]), match[2], match[3])
    let part: ClockPart | null = null
    if (after.startsWith(` ${MARK}`) && !LETTER.test(after.charAt(MARK.length + 1))) {
      part = { shown, label: ` ${MARK}`, zone: viewerTz, isYours: true, datetime }
    } else if (after.startsWith(' ') && cityAt(end + 1)) {
      const city = cityAt(end + 1) as string
      part = { shown, label: ` ${city}`, zone: cities[city], isYours: false, datetime }
    } else if (after.startsWith(' in ') && cityAt(end + 4)) {
      part = { shown, label: '', zone: cities[cityAt(end + 4) as string], isYours: false, datetime }
    } else {
      const before = text.slice(0, start)
      const dotted = names.find((name) => before.endsWith(`${name} · `))
      const paired = pairAfter.test(after) ? cityBefore(start) : null
      const city = dotted ?? paired
      if (city) part = { shown, label: '', zone: cities[city], isYours: false, datetime }
    }
    if (!part) continue
    if (start > done) out.push(text.slice(done, start))
    out.push(part)
    done = end + part.label.length
  }
  if (done < text.length) out.push(text.slice(done))
  return out.length > 0 ? out : [text]
}

/** The zone of each city the trip's legs reach or leave, for the hover tips; none without a trip map. */
export function cityZones(map: TripMap | null): Record<string, string> {
  const zones: Record<string, string> = {}
  for (const leg of map?.legs ?? []) {
    for (const airport of [leg.origin, leg.destination]) if (airport.timeZone) zones[airport.city] = airport.timeZone
  }
  return zones
}
