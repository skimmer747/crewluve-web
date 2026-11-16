import { describe, expect, it } from 'vitest'
import { shortTimeText } from '../../src/copy/format'
import { planePopupWords } from '../../src/copy/planePopup'
import { landsAt } from '../../src/copy/tripMap'
import { makeMapFlight } from '../../src/map/mapFlight'
import type { MapLeg } from '../../src/map/tripMap'
import { airport, at, caseFlight, LIVE_CASES } from '../map/liveCases'

const NY = 'America/New_York'
const time = (ms: number) => shortTimeText(ms, NY, false)

/** A shared case's flight as the map's leg at one of its moments, with its real times then. */
function caseLeg(name: string, moment = 0): { leg: MapLeg; t: number } {
  const flightCase = LIVE_CASES.flights.find((f) => f.name === name)!
  const m = flightCase.moments[moment]
  const flight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), airport(flightCase.from), airport(flightCase.to), caseFlight(flightCase.flight))!
  const mark = (code: string) => ({ code, city: code, place: airport(code), timeZone: NY })
  return {
    leg: { id: 'f1', kind: 'flight', origin: mark(flightCase.from), destination: mark(flightCase.to), start: at(m.start), end: at(m.end), flightNumber: 'UPS207', flight },
    t: at(m.at),
  }
}

/** The real plane's popup in a shared case's moment, now. */
function realPlane(name: string, moment = 0) {
  const { leg, t } = caseLeg(name, moment)
  return { leg, t, words: planePopupWords(leg, 'realPlane', t, false, NY, false) }
}

describe("a plane's popup (which plane design §3)", () => {
  it('calls the ghost the schedule', () => {
    const { leg, t } = caseLeg('ahead, in the air')
    expect(planePopupWords(leg, 'ghost', t, false, NY, false)).toEqual({ title: 'On schedule', lines: ['Where UPS207 would be if it were on time'] })
  })

  it("names the real plane in the air, with the bar's words and when it lands", () => {
    const { leg, words } = realPlane('ahead, in the air')
    expect(words).toEqual({ title: 'UPS207 · real plane', lines: ['14 min ahead', landsAt(leg, NY, false)] })
    expect(landsAt(leg, NY, false)).toBe(`Lands about ${time(leg.end)}`)
  })

  it('names the real plane still at the gate after its takeoff time', () => {
    const { leg, words } = realPlane('still on the ground twenty minutes after')
    expect(words).toEqual({ title: 'UPS207 · real plane', lines: ['Still on the ground · 20 min behind', landsAt(leg, NY, false)] })
  })

  it('calls a faded plane a best guess, says when it was last seen, and lands it about its estimate', () => {
    const { leg, words } = realPlane('ahead, in the air', 2)
    const seen = leg.flight!.live!.fix!.seenAt
    expect(words).toEqual({
      title: 'UPS207 · best guess',
      lines: [`Not seen since ${time(seen)}, so it's drawn where it should be by now`, `About 14 min ahead · lands about ${time(leg.end)}`],
    })
  })

  it('says when a landed plane reaches the gate', () => {
    const { leg, words } = realPlane('landed, seen all the way')
    expect(words).toEqual({ title: 'UPS207 · real plane', lines: ['Landed 23 min early', `Reaches the gate at ${time(leg.end)}`] })
  })

  it('says only which plane it is when it came down somewhere else, with no label to give', () => {
    expect(realPlane('on the ground somewhere else').words).toEqual({ title: 'UPS207 · real plane', lines: [] })
  })

  it('names a real plane with no live data, and says nothing more', () => {
    const { leg, t } = caseLeg('ahead, in the air')
    const { flight: _, ...scheduleOnly } = leg
    expect(planePopupWords(scheduleOnly, 'realPlane', t, false, NY, false)).toEqual({ title: 'UPS207 · real plane', lines: [] })
  })

  it('says where the real plane was at a moment of the replay', () => {
    const { leg, t } = caseLeg('ahead, in the air')
    expect(planePopupWords(leg, 'realPlane', t, true, NY, false)).toEqual({ title: 'UPS207 · real plane', lines: [`Where it was at ${time(t)}`] })
  })

  it('says "the flight" of a flight with no number, and keeps the viewer\'s clock', () => {
    const { leg, t } = caseLeg('ahead, in the air')
    const unnamed = { ...leg, flightNumber: null }
    expect(planePopupWords(unnamed, 'ghost', t, false, NY, false).lines).toEqual(['Where the flight would be if it were on time'])
    expect(planePopupWords(unnamed, 'realPlane', t, false, NY, false).title).toBe('The flight · real plane')
    expect(planePopupWords(leg, 'realPlane', t, true, NY, true).lines).toEqual([`Where it was at ${shortTimeText(t, NY, true)}`])
    expect(shortTimeText(t, NY, true)).toMatch(/^\d\d:\d\d$/)
  })

  it("says the card's bar's words in every shared case and moment the real plane shows", () => {
    let checked = 0
    for (const flightCase of LIVE_CASES.flights) {
      if (!flightCase.flight) continue
      flightCase.moments.forEach((m, i) => {
        if (!m.label || m.phase === 'notLive') return
        const { words } = realPlane(flightCase.name, i)
        expect(words.lines.join(' · '), `${flightCase.name}, moment ${i}`).toContain(m.label)
        checked += 1
      })
    }
    expect(checked).toBeGreaterThan(20)
  })
})
