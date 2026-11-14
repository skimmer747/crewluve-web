import {
  averageSpeedText, chaseText, closestToHomeText, cockpitEventText, flownText, flyingInto, groundSunText, halfwayText, landsText, midLine,
  moonText, timeDifferenceText,
} from '../copy/facts'
import { longestText, milesText, onTheWayText, soFarText } from '../copy/factsTrip'
import { daysText, shortTimeText } from '../copy/format'
import { dayPhrase, landingLine, nextDepartureChip } from '../copy/tripMap'
import { landingWeatherText } from '../copy/weather'
import { airborneWindow } from '../map/flightProgress'
import { METERS_PER_MILE } from '../map/greatCircle'
import { dayCount, destinationsOf, legDistanceMeters, legInMotion, legProgress, nextFlight, pilotLocation, timeAtFraction, type MapLeg } from '../map/tripMap'
import { HOUR } from '../time/zoned'
import { comparisonFor } from './comparisons'
import { factRow, type FactRow, type FactRowKind, type FactsAtMoment } from './factRow'
import { roundedMiles } from './milestone'
import { chase, COCKPIT_HORIZON, moonSight, nextGroundSunEvent, sunAltitudeOnLeg } from './sky'
import { belowText, forecastFor, isRecapOver, sheetHeadline, tripSoFar, type TripFacts } from './tripFacts'
import { longestFlight, totalsSoFar, wholeTotals, type TripTotals } from './tripTotals'

/**
 * The panel's rows (Stage 2 spec §5), as the app's TripFacts+Rows: in flight, "now, then where to"; on a layover, where
 * they are, the next flight and the trip so far; at home, the trip ahead and its forecast; after a recap's trip, the
 * trip. A row with nothing to say is left out.
 */

const notNull = <T>(value: T | null): value is T => value != null
const miles = (leg: MapLeg) => legDistanceMeters(leg) / METERS_PER_MILE
const compared = (facts: TripFacts, distance: number) => {
  const phrase = comparisonFor(facts.comparisons, distance)
  return phrase ? midLine(phrase) : null
}

// In flight (§5.1)

function belowRow(facts: TripFacts, leg: MapLeg, t: number): FactRow | null {
  const closest = facts.stories[leg.id]?.closestToHome ?? null
  const closestAt = closest ? timeAtFraction(leg, closest.fraction) : null
  const closestLine = closest && closestAt != null ? closestToHomeText(roundedMiles(closest.meters), closestAt, t, facts.viewerTz, facts.h24) : null
  const place = belowText(facts, leg, t)
  if (place) return factRow('below', 'MapPin', place, [closestLine])
  return closestLine ? factRow('below', 'MapPin', closestLine) : null
}

function skyRow(facts: TripFacts, leg: MapLeg, t: number): FactRow | null {
  const next = (facts.sunEvents[leg.id] ?? []).find((e) => e.time > t) ?? null
  const chasing = chase(leg, t)
  const moon = moonSight(leg, t)
  const parts = [
    next ? flyingInto(next.kind) : null,
    next ? cockpitEventText(next, t, facts.viewerTz, facts.h24) : null,
    chasing ? chaseText(chasing) : null,
    moon ? moonText(moon) : null,
  ].filter(notNull)
  if (parts.length === 0) return null
  const icon = next ? 'SunHorizon' : sunAltitudeOnLeg(leg, t) > COCKPIT_HORIZON ? 'Sun' : 'Moon'
  return factRow('sky', icon, parts[0], parts.slice(1))
}

function distanceRow(facts: TripFacts, leg: MapLeg, t: number): FactRow {
  const total = miles(leg)
  const flown = Math.round(total * legProgress(leg, t))
  const halfwayAt = timeAtFraction(leg, 0.5)
  const window = airborneWindow(leg.start, leg.end)
  return factRow('distance', 'Path', flownText(flown, Math.round(total) - flown), [
    halfwayAt != null && halfwayAt > t ? halfwayText(halfwayAt, facts.viewerTz, facts.h24) : null,
    window ? averageSpeedText(total / ((window.end - window.start) / HOUR)) : null,
    compared(facts, total),
  ])
}

function headedRow(facts: TripFacts, leg: MapLeg, now: number): FactRow {
  const forecast = forecastFor(facts, leg, now)
  const zone = leg.destination.timeZone
  return factRow('headed', 'AirplaneLanding', landingLine(leg, facts.viewerTz, facts.h24), [
    forecast ? landingWeatherText(forecast) : null,
    zone ? timeDifferenceText(zone, facts.viewerTz, leg.end) : null,
  ], forecast != null)
}

// On a layover (§5.3)

function whereTheyAreRow(facts: TripFacts, t: number): FactRow | null {
  const place = pilotLocation(facts.map, t)
  if (!place) return null
  const zone = place.timeZone
  const sun = zone ? nextGroundSunEvent(place.place, t) : null
  return factRow('whereTheyAre', 'MapPin', `In ${place.city}`, [
    zone ? timeDifferenceText(zone, facts.viewerTz, t) : null,
    zone && sun ? groundSunText(sun.kind, sun.time, zone, facts.h24) : null,
  ])
}

function nextFlightRow(facts: TripFacts, t: number, now: number): FactRow | null {
  const next = nextFlight(facts.map, t)
  if (!next) return null
  const distance = [milesText(Math.round(miles(next))), compared(facts, miles(next))].filter(notNull).join(', ')
  const forecast = forecastFor(facts, next, now)
  return factRow('nextFlight', 'AirplaneTakeoff', nextDepartureChip(next, t, facts.viewerTz, facts.h24), [
    distance,
    landsText(next, facts.viewerTz, facts.h24),
    forecast ? landingWeatherText(forecast) : null,
  ], forecast != null)
}

function tripSoFarRow(facts: TripFacts, t: number): FactRow | null {
  const line = soFarText(totalsSoFar(facts.map, t, facts.sunEvents), facts.day, facts.days)
  return line ? factRow('tripSoFar', 'ChartBar', 'Trip so far', [line]) : null
}

// At home before a trip (§5.4)

function leavesRow(facts: TripFacts, t: number, now: number): FactRow | null {
  const first = nextFlight(facts.map, t)
  if (!first) return null
  const when = `${dayPhrase(first.start, t, facts.viewerTz)} ${shortTimeText(first.start, facts.viewerTz, facts.h24)}`
  const flight = first.flightNumber ? `${first.flightNumber} to ${first.destination.city}` : `Flying to ${first.destination.city}`
  const forecast = forecastFor(facts, first, now)
  return factRow('leaves', 'AirplaneTakeoff', `Leaves ${when}`, [flight, forecast ? landingWeatherText(forecast) : null], forecast != null)
}

// Shared by the trip ahead and the recap

/** "4 days · Cologne, Dubai · 9,800 mi · like driving the Alaska Highway 7 times". */
function tripRow(facts: TripFacts, kind: FactRowKind, title: string, totals: TripTotals): FactRow {
  const cities = destinationsOf(facts.map.legs, facts.map.home).map((a) => a.city)
  return factRow(kind, 'GlobeHemisphereWest', title, [
    daysText(dayCount(facts.map, facts.viewerTz)),
    cities.length > 0 ? cities.join(', ') : null,
    totals.miles > 0 ? milesText(totals.miles) : null,
    compared(facts, totals.miles),
  ])
}

function onTheWayRow(totals: TripTotals, isForecast: boolean): FactRow | null {
  const line = onTheWayText(totals, isForecast)
  return line ? factRow('onTheWay', 'ChartBar', 'On the way', [line]) : null
}

/** The rows at `t` on the timeline, with `now` the real time, for weather. */
export function factRows(facts: TripFacts, t: number, now: number): FactRow[] {
  const leg = legInMotion(facts.map, t)
  if (leg) {
    if (leg.kind !== 'flight') return [tripSoFarRow(facts, t)].filter(notNull)
    return [belowRow(facts, leg, t), skyRow(facts, leg, t), distanceRow(facts, leg, t), headedRow(facts, leg, now)].filter(notNull)
  }
  if (isRecapOver(facts, t)) {
    const whole = wholeTotals(facts.map, facts.sunEvents)
    const longest = longestFlight(facts.map.legs)
    return [
      tripRow(facts, 'theTrip', 'The trip', whole),
      onTheWayRow(whole, false),
      longest ? factRow('longestFlight', 'ArrowsHorizontal', 'Longest flight', [longestText(longest)]) : null,
    ].filter(notNull)
  }
  if (facts.map.mode.kind === 'nextTrip' && t < facts.map.span.start) {
    const whole = wholeTotals(facts.map, facts.sunEvents)
    return [leavesRow(facts, t, now), tripRow(facts, 'tripAhead', 'The trip ahead', whole), onTheWayRow(whole, true)].filter(notNull)
  }
  return [whereTheyAreRow(facts, t), nextFlightRow(facts, t, now), tripSoFarRow(facts, t)].filter(notNull)
}

/** Everything the full map's panel shows at `t`: the headline, the rows and the trip so far. */
export function factsAtMoment(facts: TripFacts, t: number, now: number): FactsAtMoment {
  return { headline: sheetHeadline(facts, t), rows: factRows(facts, t, now), tripSoFar: tripSoFar(facts, t) }
}
