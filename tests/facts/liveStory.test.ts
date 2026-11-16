import { describe, expect, it } from 'vitest'
import { makeGeography } from '../../src/facts/geography'
import { legHalfwayTime, legPath, legPathLength, legTimeAtDistance } from '../../src/facts/legCourse'
import { legStory, placeAtDistance, storyAlong } from '../../src/facts/legStory'
import { milestones, type Milestone, type MilestoneKind } from '../../src/facts/milestone'
import { pointAtDistance } from '../../src/map/flightPath'
import type { AirportMark, MapLeg } from '../../src/map/tripMap'
import { box, EQUATOR, equatorFlight } from './factsTestData'
import { date, dogLeg, equatorLive, equatorLiveLeg, HOME_BY_THE_EQUATOR, liveTime, METERS_A_DEGREE } from './liveFacts'

/**
 * A flight's story and milestones along its real path (Stage 3 spec §8, §16.3; best guesses design §3), as the app's
 * LiveStoryTests: the places under the path it really flew, the real plane's times, and what nobody saw told as a best
 * guess. The made-up real plane is liveFacts': a degree of longitude every 8 minutes from 10:15 UTC.
 */

/** That time on the day of the equator flight, the March equinox. */
const at = (time: string) => date(`2026-03-20T${time}:00Z`)

const home = HOME_BY_THE_EQUATOR

/** The real plane last seen at `seenUntil`, as the leg is handed on then. */
const leg = (seenUntil: string, unseen?: [number, number]): MapLeg => equatorLiveLeg(equatorLive(at(seenUntil), { unseen }), at(seenUntil))

/** The real plane on the path that goes north to 2° N and back, last seen at `seenUntil`. */
const dogLegLeg = (seenUntil: number): MapLeg => equatorLiveLeg(equatorLive(seenUntil, { latitude: dogLeg }), seenUntil)

/** The equator, with Charlie north of Bravo, where the great circle never goes. */
const withCharlie = makeGeography([...EQUATOR.areas, box('Charlie', 'country', 5.5, 10.5, null, 1, 3)], [])

const found = (leg: MapLeg, homeMark: AirportMark | null = null) => milestones(leg, legStory(leg, EQUATOR, homeMark))

/** A milestone's kind, without its time or whether it's a best guess. */
const kindOf = ({ time: _time, isEstimate: _isEstimate, ...kind }: Milestone): MilestoneKind => kind

/** Whether each is a best guess. */
const estimates = (list: Milestone[]) => list.map((m) => m.isEstimate === true)

/** That kind, within 5 seconds of `iso`, as the app's tests allow. */
function expectMilestone(milestone: Milestone | undefined, kind: MilestoneKind, iso: string) {
  expect(milestone && kindOf(milestone)).toEqual(kind)
  expect(Math.abs((milestone?.time ?? NaN) - date(iso))).toBeLessThanOrEqual(5_000)
}

const ALL_FOUR: MilestoneKind[] = [
  { kind: 'crossedInto', name: 'Bravo' },
  { kind: 'halfway' },
  { kind: 'outOver', name: 'the Test Sea' },
  { kind: 'closestToHome', miles: 35 },
]

describe('a flight’s story along its real path (Stage 3 spec §8)', () => {
  it('follows the real path, not the great circle', () => {
    const real = dogLegLeg(liveTime(13))
    const story = legStory(real, withCharlie, null)
    expect(story.stretches.map((s) => s.place.name)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Bravo', 'the Test Sea'])
    expect(story.length).toBe(legPathLength(real))

    // The great circle stays on the equator.
    const scheduled = legStory(equatorFlight(0, 20), withCharlie, null)
    expect(scheduled.stretches.map((s) => s.place.name)).toEqual(['Alpha', 'Bravo', 'the Test Sea'])
  })

  it('reads the path by its meters', () => {
    const story = legStory(leg('11:10'), EQUATOR, null)
    expect(placeAtDistance(story, 3 * METERS_A_DEGREE)?.name).toBe('Alpha')
    expect(placeAtDistance(story, 7 * METERS_A_DEGREE)?.name).toBe('Bravo')
    expect(placeAtDistance(story, 15 * METERS_A_DEGREE)?.name).toBe('the Test Sea')
  })

  it('made for a shorter path, is still right where the plane has flown', () => {
    // The story was made when the path was shorter. A place this far along it is still this far along it.
    const earlier = dogLegLeg(liveTime(8))
    const later = dogLegLeg(liveTime(13))
    expect(legPathLength(earlier)).not.toBe(legPathLength(later))

    const old = legStory(earlier, withCharlie, null)
    const now = legStory(later, withCharlie, null)
    for (let degrees = 0.5; degrees <= 7.5; degrees += 0.5) {
      const far = legPath(later).knots[degrees * 4 - 1].distance
      expect(placeAtDistance(old, far), `${degrees}° E`).toEqual(placeAtDistance(now, far))
    }
  })

  it('measures the closest point to home along the real path', () => {
    // Home is 2.4° N of 8° E: 166 mi from the great circle, and 28 mi from the path that goes north to 2° N.
    const homeUpNorth = { lat: 2.4, lng: 8 }
    const real = dogLegLeg(liveTime(13))

    const closest = storyAlong(legPath(real), null, homeUpNorth).closestToHome
    expect(closest).not.toBeNull()
    expect(Math.abs(closest!.meters - 0.4 * METERS_A_DEGREE)).toBeLessThanOrEqual(500)
    expect(Math.abs(pointAtDistance(legPath(real), closest!.fraction * legPathLength(real)).lng - 8)).toBeLessThanOrEqual(0.05)
    // Too far from the great circle.
    expect(storyAlong(legPath(equatorFlight(0, 20)), null, homeUpNorth).closestToHome).toBeNull()
  })
})

describe('a flight’s milestones along its real path (Stage 3 spec §8, best guesses design §3)', () => {
  it('have the real plane’s times', () => {
    // The real plane is faster than the plan: it crosses into Bravo at 10:55, where the schedule has 11:00.
    const list = found(leg('12:30'), home)
    expect(list.map(kindOf)).toEqual(ALL_FOUR)
    expectMilestone(list[0], ALL_FOUR[0], '2026-03-20T10:55:00Z')
    expectMilestone(list[1], ALL_FOUR[1], '2026-03-20T11:35:00Z')
    // 5 mi offshore, by the coast snap.
    expectMilestone(list[2], ALL_FOUR[2], '2026-03-20T11:51:35Z')
    expectMilestone(list[3], ALL_FOUR[3], '2026-03-20T12:07:00Z')
    // It was seen all the way.
    expect(estimates(list)).toEqual([false, false, false, false])
  })

  it('tell a crossing nobody saw as a best guess', () => {
    // Nobody saw it from 4° E (10:47) to 6.5° E (11:07), where it crossed into Bravo. On the straight join between the
    // two it's at 5° E at 10:55.
    const list = found(leg('12:30', [4, 6.5]), home)
    expect(list.map(kindOf)).toEqual(ALL_FOUR)
    expect(estimates(list)).toEqual([true, false, false, false])
    expectMilestone(list[0], ALL_FOUR[0], '2026-03-20T10:55:00Z')
  })

  it('tell the closest point to home where nobody saw it as a best guess', () => {
    // Nobody saw it from 13° E to 15° E, where it passed home.
    const list = found(leg('12:30', [13, 15]), home)
    expect(list.map(kindOf)).toEqual(ALL_FOUR)
    expect(estimates(list)).toEqual([false, false, false, true])
  })

  it('of a leg that goes nowhere, are halfway in the middle of its time in the air', () => {
    // It has no length, so halfway is timed as it always was: half its time in the air, 10:15 to 13:15.
    const list = found(equatorFlight(0, 0))
    expect(list.map(kindOf)).toEqual([{ kind: 'halfway' }])
    expectMilestone(list[0], { kind: 'halfway' }, '2026-03-20T11:45:00Z')
  })

  it('ahead of where the plane was last seen, are best guesses', () => {
    // Last seen at 3.75° E at 10:45. Everything is still ahead, where the plan has the plane flying on.
    const list = found(leg('10:45'), home)
    expect(list.map(kindOf)).toEqual(ALL_FOUR)
    expect(estimates(list)).toEqual([true, true, true, true])
    expect(list.every((m) => m.time > at('10:45'))).toBe(true)
    // At its own 450 kt it's at 5° E ten minutes after it was last seen.
    expectMilestone(list[0], ALL_FOUR[0], '2026-03-20T10:55:00Z')
  })

  it('have halfway at half the path’s whole length', () => {
    // The path north to 2° N and back is about 22.5° long. Its half, 11.24° along it, is on the way back down, at about
    // 9.45° E: before 10° E, the great circle's halfway, which the real plane passes at 11:35.
    const real = dogLegLeg(liveTime(13))
    const halfway = milestones(real, legStory(real, EQUATOR, null)).find((m) => m.kind === 'halfway')
    expect(halfway).toBeDefined()
    const place = pointAtDistance(legPath(real), legPathLength(real) / 2)
    expect(Math.abs(place.lng - 9.45)).toBeLessThanOrEqual(0.05)
    expect(Math.abs(halfway!.time - liveTime(place.lng))).toBeLessThanOrEqual(5_000)
    expect(halfway!.time).toBeLessThan(at('11:32'))
  })

  it('read with a story made along another path, are where that story has them, by distance', () => {
    // Not in the app's tests. The route's story stands in until a real path's is ready, and it's read by distance: near
    // the departure airport the two agree. The real plane, on the path north to 2° N, was last seen at 9° E.
    const real = dogLegLeg(liveTime(9))
    const routes = legStory(equatorFlight(0, 20), EQUATOR, home)
    expect(routes.length).toBeLessThan(legPathLength(real))
    const list = milestones(real, routes)
    expect(list.map(kindOf)).toEqual(ALL_FOUR)
    // 5° along both, before the path turns north.
    expectMilestone(list[0], ALL_FOUR[0], '2026-03-20T10:55:00Z')
    // Halfway is half the real path's whole length, past where the plane was last seen: a best guess.
    expect(list[1].time).toBe(legHalfwayTime(real))
    expect(estimates(list)).toEqual([false, true, true, true])
    // Home is as far along the real path as the route's story has it along the great circle.
    expect(list[3].time).toBe(legTimeAtDistance(real, routes.closestToHome!.fraction * routes.length))
  })

  it('with no live data, are the schedule’s, as before', () => {
    const scheduled = equatorFlight(0, 20)
    const withNoAnswer = equatorLiveLeg(null, at('11:10'))
    const before = found(scheduled, home)
    const after = found(withNoAnswer, home)
    expect(after.map(kindOf)).toEqual(before.map(kindOf))
    before.forEach((earlier, i) => expect(Math.abs(earlier.time - after[i].time)).toBeLessThanOrEqual(1))
    expect(before.map(kindOf)).toEqual(ALL_FOUR)
    // The schedule is told as it is.
    expect(estimates(after)).toEqual([false, false, false, false])
    expectMilestone(before[0], ALL_FOUR[0], '2026-03-20T11:00:00Z')
  })
})
