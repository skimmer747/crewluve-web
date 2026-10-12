import { spokenDuration } from './format'

/**
 * The flight number as the pilot's Duty app writes it for the family (PartnerStatusGenerator.formatFlightNumber):
 * "UPS2962" for a company flight, the airline and digits for another ("DL1235"), and the digits alone without an
 * airline. Null without digits. Company flights reach the site as airline 5X (slice 1 §6.2), so 5X reads "UPS".
 */
export function flightNumberText(airline: string | null, number: string | null): string | null {
  if (!number) return null
  if (airline === '5X') return `UPS${number}`
  return `${airline ?? ''}${number}`
}

/** The scheduled block time under the map: "5:00", or "45m" under an hour (FlightRouteMapView.formatDuration). */
export function flightDurationText(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours}:${String(minutes % 60).padStart(2, '0')}` : `${minutes}m`
}

/** The distance under the map: "2,706 nm", with a thousands separator, as SwiftUI prints a number in text. */
export function distanceText(nm: number): string {
  return `${nm.toLocaleString('en-US')} nm`
}

/**
 * The in-flight delay banner: "DELAYED 1h 30m" for a late departure, "EARLY DEP 20m" for an early one
 * (LocationCardView's banner and formatDelayDuration). The site shows it at 15 minutes or more (slice 2C §5.1).
 */
export function delayBannerText(minutes: number): string {
  const total = Math.abs(minutes)
  const h = Math.floor(total / 60)
  const m = total % 60
  const amount = h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`
  return `${minutes < 0 ? 'EARLY DEP' : 'DELAYED'} ${amount}`
}

const PROGRESS_WORDS: ReadonlyArray<[fraction: number, words: string]> = [
  [0, 'just taking off'],
  [1 / 4, 'about a quarter of the way'],
  [1 / 3, 'about a third of the way'],
  [1 / 2, 'halfway'],
  [2 / 3, 'about two thirds of the way'],
  [3 / 4, 'about three quarters of the way'],
  [1, 'about to land'],
]

/** How far along the flight is, in words: the nearest of 0, ¼, ⅓, ½, ⅔, ¾ and 1 (slice 2C §4.10). */
export function progressWords(progress: number): string {
  let best = PROGRESS_WORDS[0]
  for (const entry of PROGRESS_WORDS) if (Math.abs(entry[0] - progress) < Math.abs(best[0] - progress)) best = entry
  return best[1]
}

export interface FlightMapLabelArgs {
  from: string
  to: string
  /** The distance, or null when an airport is unknown. */
  nm: number | null
  /** The scheduled block time; left out when it isn't over zero. */
  durationMs: number
  /** How far along the flight is, or null when it isn't under way. */
  progress: number | null
}

/**
 * What screen readers hear for the map, which the app doesn't have (slice 2C §4.10): "Flight from Anchorage to
 * Louisville, 2,706 nautical miles, 5 hours, about a third of the way". Parts that don't apply are left out.
 */
export function flightMapLabel({ from, to, nm, durationMs, progress }: FlightMapLabelArgs): string {
  const parts = [`Flight from ${from} to ${to}`]
  if (nm != null) parts.push(`${nm.toLocaleString('en-US')} nautical ${nm === 1 ? 'mile' : 'miles'}`)
  if (durationMs > 0) parts.push(spokenDuration(durationMs))
  if (progress != null) parts.push(progressWords(progress))
  return parts.join(', ')
}
