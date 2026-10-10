import type { AirportIndex } from '../data/airports'

/** The most pills the Upcoming Cities row shows (Duty's calculateTripOverview keeps three). */
export const CITY_PILLS = 3

export interface CityPill {
  /** The city's name, or the airport's code when the list doesn't have the airport or its city name is empty. */
  city: string
  /** The state code for a US airport, else its country (AirportData.subtitleSuffix); null when there is neither, or the airport is unknown. */
  subtitle: string | null
}

/**
 * The trip progress card's pills: the first three different cities among the remaining arrivals.
 * Two airports in one city make one pill, but same-named cities in different states or countries stay apart
 * (Duty matches by name alone). An airport the list doesn't have shows as its code (Duty leaves it out).
 */
export function upcomingCityPills(codes: string[], airports: AirportIndex): CityPill[] {
  const pills: CityPill[] = []
  for (const code of codes) {
    const airport = airports.get(code)
    const subtitle = airport?.state || airport?.country || null
    const city = airports.city(code)
    if (!city || pills.some((pill) => pill.city === city && pill.subtitle === subtitle)) continue
    pills.push({ city, subtitle })
    if (pills.length === CITY_PILLS) break
  }
  return pills
}

/** What a screen reader hears for the route dots: "Route: Louisville, Rockford, Anchorage". Expects the engine's route: a list of non-blank codes. */
export function routeLabel(codes: string[], airports: AirportIndex): string {
  return `Route: ${codes.map((code) => airports.city(code) ?? code).join(', ')}`
}
