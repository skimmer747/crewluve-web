// The tracking popup's flight number and links (slice 2C §6), with the app's FlightTrackingHelper's airline codes.

/** IATA airline codes the app maps to ICAO ones, which the tracking sites use (iataToICAO). */
const ICAO_BY_IATA: Readonly<Record<string, string>> = {
  '5X': 'UPS', FX: 'FDX', AA: 'AAL', DL: 'DAL', UA: 'UAL', WN: 'SWA', B6: 'JBU', NK: 'NKS',
  F9: 'FFT', AS: 'ASA', HA: 'HAL', OO: 'SKW', YX: 'RPA', MQ: 'ENY', OH: 'PSA',
}

/**
 * The flight as the tracking sites know it, which the popup's header shows: the airline's ICAO code and the digits,
 * in capitals ("UPS2962", "DAL1235"). Null without an airline or digits, or when the result is more than letters and
 * digits, so nothing in the data can change where a link leads.
 *
 * The app splits its flight number at the first digit to find the airline, which misses codes with a digit in them
 * (B6, F9, 5X). The site has the airline and the digits apart, so it looks the airline up directly (§10 item 9).
 */
export function trackingFlightNumber(airline: string | null, number: string | null): string | null {
  if (!airline || !number) return null
  const code = airline.toUpperCase()
  const sign = `${ICAO_BY_IATA[code] ?? code}${number}`.toUpperCase()
  return /^[A-Z0-9]+$/.test(sign) ? sign : null
}

export interface TrackingLinks {
  flightRadar24: string
  flightAware: string
}

/**
 * The flight's pages on FlightRadar24 and FlightAware (flightRadar24URLs, flightAwareURL), or null without a tracking
 * flight number. The app tries FlightRadar24's own app first; the site opens its web page (§10 item 4).
 */
export function trackingLinks(airline: string | null, number: string | null): TrackingLinks | null {
  const sign = trackingFlightNumber(airline, number)
  if (!sign) return null
  return { flightRadar24: `https://fr24.com/${sign}`, flightAware: `https://www.flightaware.com/live/flight/${sign}` }
}
