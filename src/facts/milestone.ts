import { METERS_PER_MILE } from '../map/greatCircle'
import { timeAtFraction, type MapLeg } from '../map/tripMap'
import { MINUTE } from '../time/zoned'
import type { Place } from './geography'
import type { LegStory } from './legStory'

/**
 * A moment worth a line on a flight (Stage 2 spec §4.3), as the app's Milestone: crossing into a new country, state or
 * province, out over a named sea, halfway, and the closest point to home. Each leads the headline for 5 minutes.
 */
export type MilestoneKind =
  /** A new country, or a new state or province in the same country: "Just crossed into Kansas". */
  | { kind: 'crossedInto'; name: string }
  /** From land onto a named water: "Out over the Atlantic". */
  | { kind: 'outOver'; name: string }
  | { kind: 'halfway' }
  /** The closest the route comes to home, to the nearest 5 mi. */
  | { kind: 'closestToHome'; miles: number }

export type Milestone = MilestoneKind & { time: number }

/** How long a milestone leads the headline. */
export const MILESTONE_HEADLINE_MS = 5 * MINUTE

/** To the nearest 5 mi, and never under 5. */
export function roundedMiles(meters: number): number {
  return Math.max(5, Math.round(meters / METERS_PER_MILE / 5) * 5)
}

/** A state or province: land that isn't a whole country. */
const isRegion = (place: Place) => place.kind !== 'water' && place.kind !== 'country'

/** What moving from one place to the next means, if anything. */
function crossingKind(previous: Place, next: Place): MilestoneKind | null {
  // One sea into another changes the "below" row but isn't a milestone.
  if (next.kind === 'water') return previous.kind === 'water' ? null : { kind: 'outOver', name: next.name }
  // An international border, or landfall, names the country.
  if (next.country !== previous.country) return { kind: 'crossedInto', name: next.country ?? next.name }
  // The same country: a new state or province counts. A gap between two, where only the country is known, doesn't.
  return next.kind === 'country' ? null : { kind: 'crossedInto', name: next.name }
}

/** A flight's milestones in time order, from its story and its delay-moved times. */
export function milestones(leg: MapLeg, story: LegStory): Milestone[] {
  const found: { what: MilestoneKind; fraction: number }[] = []
  // The state or province the plane is in, kept across a stretch where only the country is known.
  let region = story.stretches.length > 0 && isRegion(story.stretches[0].place) ? story.stretches[0].place.name : null
  for (let i = 1; i < story.stretches.length; i++) {
    const previous = story.stretches[i - 1].place
    const next = story.stretches[i].place
    const isSameCountry = next.country === previous.country
    const wasRegion = region
    if (isRegion(next)) region = next.name
    else if (!isSameCountry) region = null
    // Back into the state it was already in, after such a gap, is no crossing.
    if (isRegion(next) && isSameCountry && next.name === wasRegion) continue
    const what = crossingKind(previous, next)
    if (what) found.push({ what, fraction: story.stretches[i].start })
  }
  found.push({ what: { kind: 'halfway' }, fraction: 0.5 })
  const closest = story.closestToHome
  if (closest) found.push({ what: { kind: 'closestToHome', miles: roundedMiles(closest.meters) }, fraction: closest.fraction })
  // The sort is stable, so a tie keeps the order found, as the app's does.
  return [...found]
    .sort((a, b) => a.fraction - b.fraction)
    .flatMap(({ what, fraction }) => {
      const time = timeAtFraction(leg, fraction)
      return time == null ? [] : [{ ...what, time }]
    })
}
