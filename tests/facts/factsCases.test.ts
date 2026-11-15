import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { comparisonFor } from '../../src/facts/comparisons'
import { CITY_RADIUS_M, cityNear, COAST_SNAP_M, parseGeography, placeAt } from '../../src/facts/geography'
import { WEATHER_HORIZON_MS } from '../../src/facts/landingWeather'
import { HOLD_DISTANCE_M, HOME_RADIUS_M, SAMPLE_SPACING_M } from '../../src/facts/legStory'
import { MILESTONE_HEADLINE_MS } from '../../src/facts/milestone'
import { moonAltitude } from '../../src/facts/moonPosition'
import { COCKPIT_HORIZON, nextGroundSunEvent, sunEvents } from '../../src/facts/sky'
import { factsMilestones, headline, makeTripFacts, SUN_HEADLINE_MS } from '../../src/facts/tripFacts'
import { wholeTotals } from '../../src/facts/tripTotals'
import { METERS_PER_MILE } from '../../src/map/greatCircle'
import type { MapLeg, TripMap } from '../../src/map/tripMap'
import { moonPhase } from '../../src/time/moon'
import { appComparisons, appGeography, flightMap, mark } from './factsTestData'

/** The app's shared cases (Crewluv's CrewluvTests/Fixtures/TripMap/facts-cases.json): change both copies together. */
interface Story {
  name: string
  /** Latitude, longitude. */
  from: number[]
  to: number[]
  departure: string
  arrival: string
  home: number[] | null
  milestones: { kind: string; name?: string; miles?: number; time: string }[]
}

interface Cases {
  constants: {
    cockpitHorizonDegrees: number; milestoneMinutes: number; sunHeadlineMinutes: number; sampleMiles: number
    holdMiles: number; homeRadiusMiles: number; cityRadiusMiles: number; coastSnapMiles: number; weatherHours: number
  }
  comparisons: { miles: number; phrase: string | null }[]
  places: { lat: number; lon: number; place: string; kind: string; country: string | null }[]
  cities: { lat: number; lon: number; city: string | null }[]
  testGeography: unknown
  stories: Story[]
  headlines: { story: string; at: string; text: string }[]
  sunEvents: { name: string; from: number[]; to: number[]; departure: string; arrival: string; events: { kind: string; time: string; peopleBelowMinutes: number | null }[] }[]
  moonPhases: { at: string; phase: string }[]
  moonUp: { lat: number; lon: number; at: string; isUp: boolean }[]
  groundSun: { lat: number; lon: number; after: string; kind: string; time: string }[]
  totals: {
    airports: Record<string, number[]>
    home: string
    legs: { id: string; from: string; to: string; departure: string; arrival: string; fromZone: string; toZone: string }[]
    cities: number; miles: number; timeZones: number; cockpitSunsets: number
  }
}

const cases = JSON.parse(readFileSync(new URL('../fixtures/trip-map/facts-cases.json', import.meta.url), 'utf8')) as Cases
const testGeography = parseGeography(cases.testGeography)
const MINUTE = 60_000
const NY = 'America/New_York'

/** Times match to within a minute (§12.1): Swift and TypeScript round differently. */
const within = (time: number, iso: string) => expect(Math.abs(time - Date.parse(iso))).toBeLessThanOrEqual(MINUTE)
/** A milestone or a case without its time: `toEqual` passes over a property that's undefined. */
const withoutTime = <T extends { time: unknown }>(m: T) => ({ ...m, time: undefined })

function flight(id: string, from: number[], to: number[], departure: string, arrival: string): MapLeg {
  return {
    id, kind: 'flight', origin: mark(`${id}-from`, from[0], from[1]), destination: mark(`${id}-to`, to[0], to[1]),
    start: Date.parse(departure), end: Date.parse(arrival), flightNumber: null,
  }
}

function storyFacts(story: Story) {
  const leg = flight(story.name, story.from, story.to, story.departure, story.arrival)
  const home = story.home ? mark('HOME', story.home[0], story.home[1]) : null
  return makeTripFacts(flightMap(leg, home), { geography: testGeography, comparisons: null, viewerTz: NY, h24: false })
}

describe('the shared facts cases (Stage 2 spec §12.1)', () => {
  it('use the app’s constants', () => {
    const c = cases.constants
    expect(COCKPIT_HORIZON).toBeCloseTo(c.cockpitHorizonDegrees, 4)
    expect(MILESTONE_HEADLINE_MS).toBe(c.milestoneMinutes * MINUTE)
    expect(SUN_HEADLINE_MS).toBe(c.sunHeadlineMinutes * MINUTE)
    expect(SAMPLE_SPACING_M).toBeCloseTo(c.sampleMiles * METERS_PER_MILE, 6)
    expect(HOLD_DISTANCE_M).toBeCloseTo(c.holdMiles * METERS_PER_MILE, 6)
    expect(HOME_RADIUS_M).toBeCloseTo(c.homeRadiusMiles * METERS_PER_MILE, 6)
    expect(CITY_RADIUS_M).toBeCloseTo(c.cityRadiusMiles * METERS_PER_MILE, 6)
    expect(COAST_SNAP_M).toBeCloseTo(c.coastSnapMiles * METERS_PER_MILE, 6)
    expect(WEATHER_HORIZON_MS).toBe(c.weatherHours * 60 * MINUTE)
  })

  it.each(cases.comparisons)('compare $miles mi', ({ miles, phrase }) => {
    expect(comparisonFor(appComparisons(), miles)).toBe(phrase)
  })

  it.each(cases.places)('find $place at $lat, $lon', (c) => {
    expect(placeAt(appGeography(), { lat: c.lat, lng: c.lon })).toEqual({ name: c.place, kind: c.kind, country: c.country })
  })

  it.each(cases.cities)('find $city near $lat, $lon', (c) => {
    expect(cityNear(appGeography(), { lat: c.lat, lng: c.lon })?.name ?? null).toBe(c.city)
  })

  it.each(cases.stories)('list the $name story’s milestones', (story) => {
    const facts = storyFacts(story)
    const found = factsMilestones(facts, facts.map.legs[0])
    expect(found.map(withoutTime)).toEqual(story.milestones.map(withoutTime))
    found.forEach((m, i) => within(m.time, story.milestones[i].time))
  })

  it.each(cases.headlines)('read "$text" on the $story story at $at', (c) => {
    const story = cases.stories.find((s) => s.name === c.story)!
    expect(headline(storyFacts(story), Date.parse(c.at))).toBe(c.text)
  })

  it.each(cases.sunEvents)('see the sun from the cockpit: $name', (c) => {
    const events = sunEvents(flight('sun', c.from, c.to, c.departure, c.arrival))
    expect(events.map((e) => e.kind)).toEqual(c.events.map((e) => e.kind))
    events.forEach((e, i) => {
      within(e.time, c.events[i].time)
      expect(Math.abs((e.peopleBelowGap ?? 0) / MINUTE - (c.events[i].peopleBelowMinutes ?? 0))).toBeLessThanOrEqual(1)
    })
  })

  it.each(cases.moonPhases)('name the moon $phase at $at', (c) => {
    expect(moonPhase(Date.parse(c.at))).toBe(c.phase)
  })

  it.each(cases.moonUp)('know whether the moon is up at $lat, $lon at $at', (c) => {
    expect(moonAltitude(c.lat, c.lon, Date.parse(c.at)) > 0).toBe(c.isUp)
  })

  it.each(cases.groundSun)('find the next $kind on the ground after $after', (c) => {
    const event = nextGroundSunEvent({ lat: c.lat, lng: c.lon }, Date.parse(c.after))!
    expect(event.kind).toBe(c.kind)
    within(event.time, c.time)
  })

  it('total a trip', () => {
    const c = cases.totals
    const airport = (code: string, zone: string | null) => mark(code, c.airports[code][0], c.airports[code][1], code, zone)
    const legs: MapLeg[] = c.legs.map((l) => ({
      id: l.id, kind: 'flight', origin: airport(l.from, l.fromZone), destination: airport(l.to, l.toZone),
      start: Date.parse(l.departure), end: Date.parse(l.arrival), flightNumber: null,
    }))
    const map: TripMap = { mode: { kind: 'onTrip' }, legs, home: airport(c.home, null), span: { start: legs[0].start, end: legs[legs.length - 1].end }, days: null }
    const events = Object.fromEntries(legs.map((leg) => [leg.id, sunEvents(leg)]))
    expect(wholeTotals(map, events)).toEqual({ cities: c.cities, miles: c.miles, timeZones: c.timeZones, cockpitSunsets: c.cockpitSunsets })
  })
})
