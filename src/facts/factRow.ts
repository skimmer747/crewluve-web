import type { IconName } from '../icons/iconPaths'

/**
 * One row of the trip map's facts (Stage 2 spec §5), as the app's FactRow: an icon, a title, and a second line made of
 * the row's other parts.
 */
export type FactRowKind =
  // In flight (§5.1), with the plane's row for a flight with live data (Stage 3 spec §8): "Boeing 767-300 · N370UP"
  | 'below' | 'plane' | 'sky' | 'distance' | 'headed'
  // On a layover (§5.3), at home before a trip (§5.4) and in the recap (§5.5)
  | 'whereTheyAre' | 'nextFlight' | 'leaves' | 'tripAhead' | 'theTrip' | 'onTheWay' | 'tripSoFar' | 'longestFlight'

export interface FactRow {
  kind: FactRowKind
  icon: IconName
  title: string
  /** The other parts, joined by " · ", or null when there are none. */
  detail: string | null
  /** True when the row shows a forecast, which needs Open-Meteo's credit under the rows (§7.2). */
  hasWeather: boolean
}

/** A row whose second line is `details` without the nulls. */
export function factRow(kind: FactRowKind, icon: IconName, title: string, details: (string | null)[] = [], hasWeather = false): FactRow {
  const parts = details.filter((d): d is string => d != null)
  return { kind, icon, title, detail: parts.length > 0 ? parts.join(' · ') : null, hasWeather }
}

/** The row as screen readers hear it: one sentence, with commas where the screen shows " · " (§13). */
export const rowSentence = (row: FactRow) => (row.detail ? `${row.title}. ${row.detail.split(' · ').join(', ')}` : row.title)

/** One line of a flight's list: "Crossed into Canada · 1:12 PM". */
export interface TripSoFarEvent {
  text: string
  /** A best guess, where nobody saw the plane. Its time reads "about", and it's drawn lighter (best guesses design §3). */
  isEstimate: boolean
}

/** A flight in the trip so far. */
export interface TripSoFarFlight {
  id: string
  /** "UPS207 · Louisville → Cologne". */
  title: string
  /** "In the air now" for the flight between its gates, which the list sets apart. Null for any other. */
  tag: string | null
  /** What has happened so far, newest first. */
  events: TripSoFarEvent[]
}

/**
 * The facts dragged all the way up (§5.2, §5.5; best guesses design §4): the flight between its gates, set apart, and
 * each earlier flight, newest first. Under each, what has happened, newest first. Then the totals.
 */
export interface TripSoFar {
  /** The flight between its gates, and each earlier flight with at least one event so far. */
  flights: TripSoFarFlight[]
  /** "Trip so far", or "Trip recap" once a recap's trip is over. */
  totalsTitle: string
  /** Null with nothing to say, and where the rows above already have a "Trip so far" row. */
  totals: string | null
}

/** Everything the full map's panel shows at one moment on the timeline. */
export interface FactsAtMoment {
  headline: string
  rows: FactRow[]
  tripSoFar: TripSoFar
  /** A flight of the trip on screen has live data, which the footer credits adsb.lol for (Stage 3 spec §8). False unless it's said. */
  showsLiveCredit?: boolean
}
