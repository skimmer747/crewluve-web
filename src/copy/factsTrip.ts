import { legPathLength } from '../facts/legCourse'
import type { TripTotals } from '../facts/tripTotals'
import { METERS_PER_MILE } from '../map/greatCircle'
import type { MapLeg } from '../map/tripMap'
import { numberText } from './facts'

/**
 * The facts' sentences about the whole trip (Stage 2 spec §4.8, §5, §6.5), as the app's FactsWording+Trip: the totals
 * so far, a trip ahead's forecast, and the recap.
 */

/** One number on the recap card: "2" and "cities". */
export interface RecapTile {
  value: string
  label: string
}

/** "1 city", "2 cities". */
export const countText = (value: number, one: string, many: string) => `${numberText(value)} ${value === 1 ? one : many}`

/** "4,351 mi". */
export const milesText = (miles: number) => `${numberText(miles)} mi`

/** A flight's whole miles, along its real path where it has one (Stage 3 spec §8). */
const legMiles = (leg: MapLeg) => Math.round(legPathLength(leg) / METERS_PER_MILE)

/**
 * "8 time zones · about 2 sunsets from the cockpit" for a trip ahead, or "a sunset from the cockpit" for one, without
 * "about" once flown. Null when both are zero.
 */
export function onTheWayText(totals: TripTotals, isForecast: boolean): string | null {
  const parts: string[] = []
  if (totals.timeZones > 0) parts.push(countText(totals.timeZones, 'time zone', 'time zones'))
  if (totals.cockpitSunsets > 0) {
    const sunsets = countText(totals.cockpitSunsets, 'sunset from the cockpit', 'sunsets from the cockpit')
    // A forecast is "about"; one sunset is just "a sunset", as the app's FactsWording has it.
    parts.push(!isForecast ? sunsets : totals.cockpitSunsets === 1 ? 'a sunset from the cockpit' : `about ${sunsets}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

/** "Day 2 of 4 · 1 city · 4,351 mi · 6 time zones · 1 sunset from the cockpit", with zeros left out. Null when there's nothing to say. */
export function soFarText(totals: TripTotals, day: number | null, days: number | null): string | null {
  const parts: string[] = []
  if (day != null && days != null) parts.push(`Day ${day} of ${days}`)
  if (totals.cities > 0) parts.push(countText(totals.cities, 'city', 'cities'))
  if (totals.miles > 0) parts.push(milesText(totals.miles))
  const onTheWay = onTheWayText(totals, false)
  if (onTheWay) parts.push(onTheWay)
  return parts.length > 0 ? parts.join(' · ') : null
}

/** "Dubai → Louisville, 7,382 mi". */
export const longestText = (leg: MapLeg) => `${leg.origin.city} → ${leg.destination.city}, ${milesText(legMiles(leg))}`

/** "Home from 4 days away", or "Home from a day away". */
export const recapChip = (days: number) => (days === 1 ? 'Home from a day away' : `Home from ${days} days away`)

/** Up to four numbers for the recap card, with zeros left out. "Sunsets aloft" is used only here (§6.5). */
export function totalsTiles(totals: TripTotals): RecapTile[] {
  const tiles: [number, string, string][] = [
    [totals.cities, 'city', 'cities'],
    [totals.miles, 'mile', 'miles'],
    [totals.timeZones, 'time zone', 'time zones'],
    [totals.cockpitSunsets, 'sunset aloft', 'sunsets aloft'],
  ]
  return tiles.filter(([value]) => value > 0).map(([value, one, many]) => ({ value: numberText(value), label: value === 1 ? one : many }))
}

/**
 * The recap card as screen readers hear it: "Trip recap: home from 4 days away. 2 cities, 14,819 miles, 18 time zones,
 * 1 sunset from the cockpit. Longest flight, Dubai to Louisville, 7,382 miles."
 */
export function recapSummary(days: number, totals: TripTotals, longest: MapLeg | null): string {
  const chip = recapChip(days)
  const sentences = [`Trip recap: ${chip.charAt(0).toLowerCase()}${chip.slice(1)}.`]
  const counts = [
    totals.cities > 0 ? countText(totals.cities, 'city', 'cities') : null,
    totals.miles > 0 ? countText(totals.miles, 'mile', 'miles') : null,
    totals.timeZones > 0 ? countText(totals.timeZones, 'time zone', 'time zones') : null,
    totals.cockpitSunsets > 0 ? countText(totals.cockpitSunsets, 'sunset from the cockpit', 'sunsets from the cockpit') : null,
  ].filter((c): c is string => c != null)
  if (counts.length > 0) sentences.push(`${counts.join(', ')}.`)
  if (longest) sentences.push(`Longest flight, ${longest.origin.city} to ${longest.destination.city}, ${numberText(legMiles(longest))} miles.`)
  return sentences.join(' ')
}
