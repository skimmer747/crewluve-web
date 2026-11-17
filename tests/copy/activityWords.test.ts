import { describe, expect, it } from 'vitest'
import { activityWords, cardChips, nextTripChip, panelHeadline, timelineLine, timelineSpokenValue } from '../../src/copy/tripMap'
import { buildAirportIndex } from '../../src/data/airports'
import type { ActivityKind } from '../../src/map/tripActivity'
import { airportMark, makeTripMap } from '../../src/map/tripMap'
import { AIRPORTS, at, flight } from '../map/tripMapLegs'

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

  it('says where a flight’s real plane is still on the ground, in place of flying (the website’s own, Todd, 16 Nov 2026)', () => {
    const flying = { kind: 'flying', place: cologne } as const
    const rockford = { ...cologne, code: 'RFD', city: 'Rockford' }
    const stillIn = { kind: 'stillIn', airport: rockford } as const
    expect(timelineLine(at(12), flying, 'America/New_York', false, stillIn)).toMatch(/^Fri 7:00\sPM · On the ground in Rockford$/)
    expect(timelineSpokenValue(at(12), flying, 'America/New_York', false, stillIn)).toMatch(/^Friday 7:00\sPM, on the ground in Rockford$/)
    // Without it, flying, as before.
    expect(timelineLine(at(12), flying, 'America/New_York', false, null)).toMatch(/^Fri 7:00\sPM · Flying to Cologne$/)
    expect(timelineSpokenValue(at(12), flying, 'America/New_York', false, null)).toMatch(/^Friday 7:00\sPM, flying to Cologne$/)
  })

  it('says where a flight’s real plane is down, not yet at the gate, in place of flying (the landed, not yet at the gate design §3, Todd, 17 Nov 2026)', () => {
    const flying = { kind: 'flying', place: cologne } as const
    const landedIn = { kind: 'landedIn', airport: cologne } as const
    expect(timelineLine(at(12), flying, 'America/New_York', false, landedIn)).toMatch(/^Fri 7:00\sPM · Landed in Cologne$/)
    expect(timelineSpokenValue(at(12), flying, 'America/New_York', false, landedIn)).toMatch(/^Friday 7:00\sPM, landed in Cologne$/)
    // Without it, flying, as before.
    expect(timelineLine(at(12), flying, 'America/New_York', false, null)).toMatch(/^Fri 7:00\sPM · Flying to Cologne$/)
  })

  it('says where a flight’s real plane is back on the ground after an air return, in place of flying (air return design §3)', () => {
    const flying = { kind: 'flying', place: cologne } as const
    const returnedTo = { kind: 'returnedTo', airport: { ...cologne, code: 'RFD', city: 'Rockford' } } as const
    expect(timelineLine(at(12), flying, 'America/New_York', false, returnedTo)).toMatch(/^Fri 7:00\sPM · Returned to Rockford$/)
    expect(timelineSpokenValue(at(12), flying, 'America/New_York', false, returnedTo)).toMatch(/^Friday 7:00\sPM, returned to Rockford$/)
  })
})

describe('the next trip’s chip (the app’s base waits design §3)', () => {
  it('says home, or at base while the pilot waits there', () => {
    expect(nextTripChip(at(48), at(0), 'America/New_York')).toMatch(/^Home · next trip /)
    expect(nextTripChip(at(48), at(0), 'America/New_York', true)).toMatch(/^At base · next trip /)
  })

  it('is the card’s chip and the full map’s headline for a next trip waited for at base', () => {
    const map = makeTripMap([flight('f1', 'SDF', 'CGN', 48, 8)], {
      isNextTrip: true, home: 'LEX', base: 'SDF', isWaitingAtBase: true, now: at(0), airports: AIRPORTS,
    })!
    expect(cardChips(map, at(0), 'America/New_York', false).top).toMatch(/^At base · next trip /)
    expect(panelHeadline(map, at(0), 'America/New_York', false)).toMatch(/^At base · next trip /)
  })
})

describe('the next trip’s chip agrees with the marker (base waits design §3)', () => {
  it('says home for a pilot based at home, though the status says base', () => {
    const map = makeTripMap([flight('f1', 'SDF', 'CGN', 48, 8)], {
      isNextTrip: true, home: 'SDF', base: 'SDF', isWaitingAtBase: true, now: at(0), airports: AIRPORTS,
    })!
    expect(cardChips(map, at(0), 'America/New_York', false).top).toMatch(/^Home · next trip /)
    expect(panelHeadline(map, at(0), 'America/New_York', false)).toMatch(/^Home · next trip /)
  })
})
