import type { IconName } from '../icons/iconPaths'

/**
 * One row of the trip map's facts (Stage 2 spec §5), as the app's FactRow: an icon, a title, and a second line made of
 * the row's other parts.
 */
export type FactRowKind =
  // In flight (§5.1)
  | 'below' | 'sky' | 'distance' | 'headed'
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

/** The facts dragged all the way up (§5.2, §5.5): each started flight's milestones, newest flight first, then the totals. */
export interface TripSoFar {
  /** Flights with at least one milestone so far. */
  flights: { id: string; title: string; milestones: string[] }[]
  /** "Trip so far", or "Trip recap" once a recap's trip is over. */
  totalsTitle: string
  totals: string | null
}

/** Everything the full map's panel shows at one moment on the timeline. */
export interface FactsAtMoment {
  headline: string
  rows: FactRow[]
  tripSoFar: TripSoFar
}
