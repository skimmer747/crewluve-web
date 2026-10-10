import type { AirportIndex } from '../data/airports'

/** The most pills the Upcoming Cities row shows (Duty's calculateTripOverview keeps three). */
export const CITY_PILLS = 3

export interface CityPill {
  city: string
  /** The state code for a US airport, else its country (AirportData.subtitleSuffix); null for an airport the list doesn't have. */
  subtitle: string | null
}

/** The trip progress card's pills: the first three different cities among the remaining arrivals, matched by name as Duty does. */
export function upcomingCityPills(codes: string[], airports: AirportIndex): CityPill[] {
  const pills: CityPill[] = []
  for (const code of codes) {
    const city = airports.city(code)
    if (!city || pills.some((pill) => pill.city === city)) continue
    const airport = airports.get(code)
    pills.push({ city, subtitle: airport ? airport.state ?? (airport.country || null) : null })
    if (pills.length === CITY_PILLS) break
  }
  return pills
}

/** What a screen reader hears for the route dots: "Route: Louisville, Rockford, Anchorage". */
export function routeLabel(codes: string[], airports: AirportIndex): string {
  return `Route: ${codes.map((code) => airports.city(code) ?? code).join(', ')}`
}
