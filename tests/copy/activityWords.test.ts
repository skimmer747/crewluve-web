import { describe, expect, it } from 'vitest'
import { activityWords, timelineLine, timelineSpokenValue } from '../../src/copy/tripMap'
import { buildAirportIndex } from '../../src/data/airports'
import type { ActivityKind } from '../../src/map/tripActivity'
import { airportMark } from '../../src/map/tripMap'
import { AIRPORTS, at } from '../map/tripMapLegs'

const cologne = airportMark('CGN', AIRPORTS)!

describe('the words for what the pilot is doing (activity markers design §4.2, §4.3)', () => {
  it.each<[ActivityKind, string]>([
    ['flying', 'Flying to Cologne'], ['driving', 'Driving to Cologne'], ['layover', 'Layover in Cologne'],
    ['turn', 'Turn in Cologne'], ['base', 'At base in Cologne'], ['home', 'Home'],
  ])('%s reads "%s"', (kind, words) => {
    expect(activityWords({ kind, place: cologne })).toBe(words)
  })

  it('names a place with no city by its code', () => {
    const springs = airportMark('COS', buildAirportIndex([['COS', '', 'US', 38.8058, -104.7008, 'America/Denver']]))!
    expect(activityWords({ kind: 'turn', place: springs })).toBe('Turn in COS')
  })

  it('writes the line under the timeline, and its value for screen readers, from the time and the activity', () => {
    // at(12) is Friday 7:00 PM in Louisville.
    const layover = { kind: 'layover', place: cologne } as const
    expect(timelineLine(at(12), layover, 'America/New_York', false)).toMatch(/^Fri 7:00\sPM · Layover in Cologne$/)
    expect(timelineSpokenValue(at(12), layover, 'America/New_York', false)).toMatch(/^Friday 7:00\sPM, layover in Cologne$/)
    expect(timelineLine(at(12), null, 'America/New_York', false)).toMatch(/^Fri 7:00\sPM$/)
    expect(timelineSpokenValue(at(12), { kind: 'home', place: cologne }, 'America/New_York', false)).toMatch(/^Friday 7:00\sPM, home$/)
  })
})
