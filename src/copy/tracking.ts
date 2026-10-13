// The tracking popup's flight number and links (slice 2C §6), with the app's FlightTrackingHelper's airline codes.

import { airlineIata, airlineIcao } from './airlines'

/**
 * The flight as the tracking sites know it, which the popup's header shows: the airline's ICAO code and the digits,
 * in capitals ("UPS2962", "DAL1235"). Null without an airline or digits, or when the result is more than letters and
 * digits, so nothing in the data can change where a link leads.
 *
 * The app splits its flight number at the first digit to find the airline, which misses codes with a digit in them
 * (B6, F9, 5X). The site has the airline and the digits apart, so it looks the airline up directly (§10 item 9).
 */
export function trackingFlightNumber(airline: string | null, number: string | null): string | null {
  const code = airline?.trim()
  if (!code || !number) return null
  const sign = `${airlineIcao(code) ?? code}${number}`.toUpperCase()
  return /^[A-Z0-9]+$/.test(sign) ? sign : null
}

export interface TrackingLinks {
  flightRadar24: string
  flightAware: string
}

/**
 * The flight's pages on FlightRadar24 and FlightAware (flightRadar24URLs, flightAwareURL), or null without a tracking
 * flight number. The app opens FlightRadar24's live map, which finds the flight only once it's tracked; the site opens
 * the flight number's page, which lists it before takeoff too, and needs the IATA code ("5x5768") (FR24 flight page spec).
 */
export function trackingLinks(airline: string | null, number: string | null): TrackingLinks | null {
  const sign = trackingFlightNumber(airline, number)
  if (!sign || !airline || !number) return null
  // The callsign's airline and digits, with the IATA code from the table: letters and digits only, as the callsign.
  const page = `${airlineIata(airline)}${number}`.toLowerCase()
  return {
    flightRadar24: `https://www.flightradar24.com/data/flights/${page}`,
    flightAware: `https://www.flightaware.com/live/flight/${sign}`,
  }
}
