import { delayText } from './format'

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

/**
 * The banner in words for screen readers, as the sun dial says a delay: "Delayed 1 hour 30 minutes" or "Departed 20
 * minutes early", not "1h 30m", whose "m" can be read as meters.
 */
export function spokenDelayBanner(minutes: number): string {
  return minutes < 0 ? `Departed ${delayText(minutes)} early` : `Delayed ${delayText(minutes)}`
}
