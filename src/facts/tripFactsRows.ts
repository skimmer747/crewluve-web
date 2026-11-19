import { yours } from '../copy/clockLabel'
import {
  aircraftText, allFlownText, averageSpeedText, chaseText, closestToHomeText, cockpitEventText, cockpitGapText, flownText, flyingInto,
  groundSunText, halfwayText, heightAndSpeedText, landsText, midLine, moonText, timeDifferenceText, toGoText,
} from '../copy/facts'
import { longestText, milesText, onTheWayText, soFarText } from '../copy/factsTrip'
import { daysText } from '../copy/format'
import { dayPhrase, gateLine, landedText, landingLine, nextDepartureChip, takeoffLine } from '../copy/tripMap'
import { landingWeatherText, takeoffWeatherText } from '../copy/weather'
import { airborneWindow } from '../map/flightProgress'
import { METERS_PER_MILE } from '../map/greatCircle'
import { dayCount, destinationsOf, legDistanceMeters, legInMotion, nextFlight, pilotLocation, type MapLeg } from '../map/tripMap'
import { HOUR } from '../time/zoned'
import { comparisonFor } from './comparisons'
import { factRow, type FactRow, type FactRowKind, type FactsAtMoment } from './factRow'
import { hasLiveData, isSeenAt, legHalfwayTime, legPathLength, legTimeAtDistance } from './legCourse'
import { roundedMiles } from './milestone'
import { legPlane, type PlanePosition } from './planePosition'
import { chase, cockpitHorizonOnLeg, moonSight, nextGroundSunEvent, sunAltitudeOnLeg } from './sky'
import { takeoffOf } from './takeoff'
import {
  atDepartureText, belowText, forecastFor, isLandedBeforeGate, isRecapOver, isStillOnGround, lastSeenText, latestEvent, sheetHeadline, showsLiveData,
  tripSoFar,
  type TripFacts,
} from './tripFacts'
import { longestFlight, totalsSoFar, wholeTotals, type TripTotals } from './tripTotals'

/**
 * The panel's rows (Stage 2 spec §5), as the app's TripFacts+Rows: in flight, "now, then where to"; on a layover, where
 * they are, the next flight and the trip so far; at home, the trip ahead and its forecast; after a recap's trip, the
 * trip. A row with nothing to say is left out. A flight with live data has the plane's row second (Stage 3 spec §8).
 */

const notNull = <T>(value: T | null): value is T => value != null
const miles = (leg: MapLeg) => legDistanceMeters(leg) / METERS_PER_MILE
const compared = (facts: TripFacts, distance: number) => {
  const phrase = comparisonFor(facts.comparisons, distance)
  return phrase ? midLine(phrase) : null
}

// In flight (§5.1)

function flightRows(facts: TripFacts, leg: MapLeg, t: number, now: number): FactRow[] {
  const plane = legPlane(leg, t, facts.isReplay)
  return [
    belowRow(facts, leg, t), planeRow(leg, plane), skyRow(facts, leg, t), distanceRow(facts, leg, plane, t), takeoffRow(facts, leg, t),
    headedRow(facts, leg, t, now),
  ].filter(notNull)
}

/**
 * What's below, then where a plane that's out of sight was last seen, then the closest point to home. The first of them
 * that there is leads the row. A real plane still at its departure airport says so in place of what's below (the
 * website's own, Todd, 16 Nov 2026), or that it has returned there after an air return (air return design §3). One down, not yet at the gate, says "Landed in Anchorage", alone: the rest goes
 * with what's below (the landed, not yet at the gate design §3, Todd, 17 Nov 2026).
 */
function belowRow(facts: TripFacts, leg: MapLeg, t: number): FactRow | null {
  if (isLandedBeforeGate(facts, leg, t)) return factRow('below', 'MapPin', landedText(leg.destination.city))
  const where = isStillOnGround(facts, leg, t) ? atDepartureText(leg, t) : belowText(facts, leg, t)
  const lines = [where, lastSeenText(facts, leg, t), closestToHomeLine(facts, leg, t)].filter(notNull)
  return lines.length > 0 ? factRow('below', 'MapPin', lines[0], lines.slice(1)) : null
}

/**
 * "Passes 40 mi from home at 1:05 PM", or "Closest to home was 40 mi at 1:05 PM" once it's passed. Where nobody saw the
 * real plane it's a best guess, and its time reads "about" (best guesses design §2).
 *
 * The website's own (Todd, 16 Nov 2026): a real plane still on the ground at its departure airport has passed nothing,
 * and its time is a guess from a takeoff that hasn't happened: "about", and left out once that guess has gone by, as
 * halfway's is.
 */
function closestToHomeLine(facts: TripFacts, leg: MapLeg, t: number): string | null {
  const story = facts.stories[leg.id]
  const closest = story?.closestToHome
  if (!story || !closest) return null
  const distance = closest.fraction * story.length
  const time = legTimeAtDistance(leg, distance)
  if (time == null) return null
  const onGround = isStillOnGround(facts, leg, t)
  if (onGround && time <= t) return null
  return closestToHomeText(roundedMiles(closest.meters), time, t, facts.viewerTz, facts.h24, onGround || !isSeenAt(leg, distance))
}

/**
 * The plane's row, for a flight Crewlu Cloud has seen (Stage 3 spec §8): "Boeing 767-300 · N370UP", then "35,000 ft · 540
 * mph" while the plane is seen in the air. Its height and speed are for now only, so a replay and an estimated plane have
 * the first line alone.
 */
function planeRow(leg: MapLeg, plane: PlanePosition): FactRow | null {
  const fix = leg.flight?.live?.fix
  if (!fix) return null
  const flying = plane.isSeenInAir ? heightAndSpeedText(fix.altitudeFt, fix.groundSpeedKt) : null
  const parts = [aircraftText(fix.typeCode, fix.registration), flying].filter(notNull)
  return parts.length > 0 ? factRow('plane', 'Airplane', parts[0], parts.slice(1)) : null
}

/**
 * The sky from the cockpit: the next sunrise or sunset, how much sooner or later the pilot sees it than the ground ("The
 * pilot sees it 31 min before the ground does", time labels design §3.6), chasing the sun, the moon. Left out while the real plane is still
 * at its departure airport after the plan's takeoff time, as nothing says "flying" then (the website's own, Todd, 16
 * Nov 2026): its times would be the schedule's, for a plane that hasn't left. And once it's down, until the gate, as at
 * the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026).
 */
function skyRow(facts: TripFacts, leg: MapLeg, t: number): FactRow | null {
  if (isStillOnGround(facts, leg, t) || isLandedBeforeGate(facts, leg, t)) return null
  const next = (facts.sunEvents[leg.id] ?? []).find((e) => e.time > t) ?? null
  const chasing = chase(leg, t)
  const moon = moonSight(leg, t)
  const parts = [
    next ? flyingInto(next.kind) : null,
    next ? cockpitEventText(next, t, facts.viewerTz, facts.h24) : null,
    next ? cockpitGapText(next) : null,
    chasing ? chaseText(chasing) : null,
    moon ? moonText(moon) : null,
  ].filter(notNull)
  if (parts.length === 0) return null
  const icon = next ? 'SunHorizon' : sunAltitudeOnLeg(leg, t) > cockpitHorizonOnLeg(leg) ? 'Sun' : 'Moon'
  return factRow('sky', icon, parts[0], parts.slice(1))
}

/**
 * "1,140 mi flown · 3,010 to go": flown along the path so far, and to go along the rest of it, which for a real plane is
 * the great circle from where it is to the arrival airport (Stage 3 spec §8). A real plane still at its departure airport
 * has flown nothing yet: "2,788 mi to go", and its halfway time is a guess from a takeoff that hasn't happened, "about"
 * (the website's own, Todd, 16 Nov 2026). One down, not yet at the gate, has nothing to go: "2,788 mi flown" (the landed,
 * not yet at the gate design §3, Todd, 17 Nov 2026).
 */
function distanceRow(facts: TripFacts, leg: MapLeg, plane: PlanePosition, t: number): FactRow {
  const length = legPathLength(leg)
  const total = length / METERS_PER_MILE
  const flown = Math.round(plane.distance / METERS_PER_MILE)
  const halfwayAt = legHalfwayTime(leg)
  // The schedule's speed is told only of a flight with no live data: a real plane's row has its own.
  const window = hasLiveData(leg) ? null : airborneWindow(leg.start, leg.end)
  const onGround = isStillOnGround(facts, leg, t)
  const title = onGround ? toGoText(Math.round(total))
    : isLandedBeforeGate(facts, leg, t) ? allFlownText(flown)
    : flownText(flown, Math.round(total) - flown)
  return factRow('distance', 'Path', title, [
    halfwayAt != null && halfwayAt > t ? halfwayText(halfwayAt, facts.viewerTz, facts.h24, onGround || !isSeenAt(leg, length / 2)) : null,
    window ? averageSpeedText(total / ((window.end - window.start) / HOUR)) : null,
    compared(facts, total),
  ])
}

/**
 * "Took off Taipei 7:42 PM · 6:42 AM L" once the plane is off the ground (time labels design §3.3), then the weather it
 * took off in, "84°F and clear at takeoff". The real plane's takeoff where it was seen, else the schedule's, "about".
 * Left out before it, while a real plane is still at its departure airport or back there after an air return, and where
 * the leg has no takeoff to tell (`takeoffOf`): a real plane first seen too far out.
 */
function takeoffRow(facts: TripFacts, leg: MapLeg, t: number): FactRow | null {
  const takeoff = takeoffOf(leg)
  if (isStillOnGround(facts, leg, t) || !takeoff || takeoff.time > t) return null
  const weather = facts.takeoffForecasts[leg.id] ?? null
  const title = takeoffLine(leg, takeoff.time, !takeoff.isSeen, facts.viewerTz, facts.h24)
  return factRow('takeoff', 'AirplaneTakeoff', title, [weather ? takeoffWeatherText(weather) : null], weather != null)
}

/**
 * When it lands, then the weather there and its time. Down, not yet at the gate, when it reaches the gate: "Reaches the
 * gate in Anchorage at 3:52 PM · 7:52 PM L" (the landed, not yet at the gate design §3, Todd, 17 Nov 2026).
 */
function headedRow(facts: TripFacts, leg: MapLeg, t: number, now: number): FactRow {
  const forecast = forecastFor(facts, leg, now)
  const zone = leg.destination.timeZone
  const title = isLandedBeforeGate(facts, leg, t) ? gateLine(leg, facts.viewerTz, facts.h24) : landingLine(leg, facts.viewerTz, facts.h24)
  return factRow('headed', 'AirplaneLanding', title, [
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
    zone && sun ? groundSunText(sun.kind, sun.time, zone, place.city, facts.h24) : null,
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
  const line = soFarText(totalsSoFar(facts.map, t, facts.sunEvents, facts.isReplay), facts.day, facts.days)
  return line ? factRow('tripSoFar', 'ChartBar', 'Trip so far', [line]) : null
}

// At home before a trip (§5.4)

function leavesRow(facts: TripFacts, t: number, now: number): FactRow | null {
  const first = nextFlight(facts.map, t)
  if (!first) return null
  const when = `${dayPhrase(first.start, t, facts.viewerTz)} ${yours(first.start, facts.viewerTz, facts.h24)}`
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
    return flightRows(facts, leg, t, now)
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

/**
 * Everything the full map's panel shows at `t`: the headline, the rows and the trip so far, and whether the footer
 * credits adsb.lol, as it does whenever a flight of the trip has live data (Stage 3 spec §8). And the latest event, which
 * the full map shows large over the map (latest event design §1).
 */
export function factsAtMoment(facts: TripFacts, t: number, now: number): FactsAtMoment {
  return {
    headline: sheetHeadline(facts, t), rows: factRows(facts, t, now), tripSoFar: tripSoFar(facts, t), showsLiveCredit: showsLiveData(facts),
    latestEvent: latestEvent(facts, t),
  }
}
