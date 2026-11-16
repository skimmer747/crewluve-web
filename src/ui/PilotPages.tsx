import { useMemo } from 'preact/hooks'
import type { AirportIndex } from '../data/airports'
import { loadDemoLandingForecast, loadDemoWeather } from '../data/demoWeather'
import {
  loadLiveLandingForecast, loadLiveWeather, tempUnitFor, type LandingLoader, type TempUnit, type WeatherLoader, type WeatherPlace,
} from '../data/weather'
import { makeTripFacts } from '../facts/tripFacts'
import { factsAtMoment } from '../facts/tripFactsRows'
import { buildLegs, type Leg } from '../engine/legs'
import { estimatedArrival, liveMapFlights, withLiveTimes } from '../engine/liveLegs'
import { safeSnapshot, type Snapshot } from '../engine/snapshot'
import type { Schedule } from '../engine/types'
import type { MapFlight } from '../map/mapFlight'
import { tripMapFor } from '../map/tripMapFor'
import type { QuickStatus } from '../partner/summary'
import { prefers24Hour, viewerTimeZone } from '../time/zoned'
import { EmptyState } from './EmptyState'
import { Footer, type FooterProps } from './Footer'
import { useComparisons, useGeography } from './hooks/useFactsData'
import { useLand } from './hooks/useLand'
import { useLandingWeather } from './hooks/useLandingWeather'
import type { LivePlane } from './hooks/useLivePlane'
import type { ScheduleHandle } from './hooks/useSchedule'
import { useNow } from './hooks/useNow'
import { useSchedulePage } from './hooks/useSchedulePage'
import { useTripMapPage } from './hooks/useTripMapPage'
import { useSideBySide } from './hooks/useSideBySide'
import { useVisibilityCount } from './hooks/useVisibilityCount'
import { useWeather } from './hooks/useWeather'
import { showsLocationCard } from './LocationCard'
import { Notice } from './Notice'
import { scheduleLegs } from './scheduleFacts'
import { SchedulePage } from './SchedulePage'
import { ScheduleView } from './ScheduleView'
import { StatusScreen } from './StatusScreen'
import { TripMapPage } from './TripMapPage'
import { Title } from './Title'

export interface PilotPagesProps {
  schedule: ScheduleHandle
  airports: AirportIndex
  demo: boolean
  /** Disconnect, or Exit demo: the footer's left button. */
  onLeave: () => void
  /** Where the location card's weather comes from: Open-Meteo, or the made-up samples in the demo. Tests pass a fake. */
  loadWeather?: WeatherLoader
  /** Where the full map's landing forecasts come from: the demo's samples, or Open-Meteo (Stage 2 spec §7). Tests pass their own. */
  loadLanding?: LandingLoader
  /** The pilot's quick status at a moment, for the location card (piece 5a §7). The demo has none. */
  quickStatusAt?: (now: number) => QuickStatus | null
  /** One line above the cards: that this browser just connected, or why a link didn't (piece 5a §4.3). */
  notice?: string | null
  /** What Crewlu Cloud has said of the pilot's flights: the live page's source, or the demo's made-up planes. */
  live?: LivePlane | null
}

const NO_FLIGHTS: ReadonlyMap<string, MapFlight> = new Map()

/**
 * Rebuilds the legs when a new schedule arrives, and the snapshot every second. Shows the status page, or the Schedule
 * page when the address ends in #schedule (slice 3A §3.3). On a wide window it shows both side by side, whatever the
 * address (3C §3, §5.1). While there's nothing to show, the same screen as ever, at every width.
 */
export function PilotPages({
  schedule, airports, demo, onLeave, loadWeather = demo ? loadDemoWeather : loadLiveWeather,
  loadLanding = demo ? loadDemoLandingForecast : loadLiveLandingForecast, quickStatusAt, notice = null, live = null,
}: PilotPagesProps) {
  const now = useNow()
  const celebrateKey = useVisibilityCount()
  const viewerTz = useMemo(() => viewerTimeZone(), [])
  const h24 = useMemo(() => prefers24Hour(), [])
  const unit = useMemo(() => tempUnitFor(), [])
  // One landing time (Stage 3 spec §7.1): each flight Crewlu Cloud has seen gets the real plane's times here, once for
  // every card, at each new schedule, each new answer, and each minute while there's one, as an estimate moves by itself.
  const hasLive = live != null && live.flights.size > 0
  const minute = hasLive ? Math.floor(now / 60_000) : 0
  const built = useMemo<{ s: Schedule; legs: Leg[]; flights: ReadonlyMap<string, MapFlight> } | null>(() => {
    const summary = schedule.schedule
    if (!summary) return null
    try {
      const placeOf = (code: string) => {
        const airport = airports.get(code)
        return airport ? { lat: airport.lat, lng: airport.lng } : null
      }
      const flights = hasLive ? liveMapFlights(summary, live.flights, live.clockOffset, placeOf) : NO_FLIGHTS
      const s = withLiveTimes(summary, flights, now)
      return { s, legs: buildLegs(s), flights }
    } catch (err) {
      console.error('Could not read the schedule', err)
      return null
    }
  }, [schedule.schedule, live, airports, minute])

  const footer: FooterProps = {
    now,
    lastSuccessAt: schedule.lastSuccessAt,
    newestUpdatedAt: schedule.schedule?.newestUpdatedAt ?? null,
    problem: schedule.problem,
    refreshing: schedule.refreshing,
    onRefresh: schedule.refresh,
    onLeave,
    leaveLabel: demo ? 'Exit demo' : 'Disconnect',
    viewerTz,
    h24,
  }

  const ready = built && !built.s.empty ? built : null
  const homeTz = (ready && airports.tz(ready.s.pilot.effHome)) ?? viewerTz
  const snap = ready ? safeSnapshot(ready.s, ready.legs, now, airports.tz(ready.s.pilot.base) ?? viewerTz) : null
  // Asked for before the early return below, so the hooks run in the same order on every render.
  const weather = useWeather(weatherPlace(snap, airports, unit), loadWeather)
  // snap is only set with ready, so the legs are always there; the fallback is for the type checker.
  const tripMap = snap ? tripMapFor(snap, ready?.legs ?? [], airports, ready?.flights) : null
  const land = useLand(tripMap != null)
  // The page the address asks for, and the legs the Schedule page lists. A wide window shows both pages side by side
  // (slice 3C §3).
  const sideBySide = useSideBySide()
  const page = useSchedulePage(sideBySide)
  const mapPage = useTripMapPage()
  // The facts' data (Stage 2 spec §7.2, §10): the geography while a flight is in the air or the full map is open, the
  // comparisons and the landing weather only while it's open.
  const mapOpen = mapPage.open && tripMap != null
  const geography = useGeography(tripMap?.mode.kind === 'inFlight' || mapOpen)
  const comparisons = useComparisons(mapOpen)
  const forecasts = useLandingWeather(mapOpen ? tripMap : null, now, unit, loadLanding)
  const facts = tripMap && snap
    ? makeTripFacts(tripMap, { geography, comparisons, forecasts, viewerTz, h24, day: snap.tripProgress?.day ?? null, days: snap.tripProgress?.days ?? null })
    : null
  const listed = useMemo(() => (ready ? scheduleLegs(ready.legs) : []), [ready])

  if (!snap) {
    return (
      <main class="screen">
        <Title text="CrewLuve" />
        {notice && <Notice text={notice} />}
        {built?.s.empty && <EmptyState />}
        <Footer {...footer} />
      </main>
    )
  }

  const quickStatus = quickStatusAt?.(now) ?? null
  // The flight in the air's arrival, while it's the real plane's estimate: the cards say "about" of it (Stage 3 spec §9).
  const estimated = ready ? estimatedArrival(ready.legs, ready.flights, now) : null
  const status = {
    snap, now, viewerTz, homeTz, h24, airports, weather, demo, celebrateKey, footer, notice, quickStatus, tripMap, land, facts,
    onOpenMap: mapPage.show, estimatedArrival: estimated,
  }
  // A #map address with no trip to draw falls through to the status page (moving map spec §6).
  if (mapPage.open && tripMap) {
    return <TripMapPage map={tripMap} now={now} viewerTz={viewerTz} h24={h24} day={snap.tripProgress?.day ?? null}
      days={snap.tripProgress?.days ?? null} land={land} onBack={mapPage.back}
      factsAt={facts ? (t, real) => factsAtMoment(facts, t, real) : undefined} />
  }
  const view = { legs: listed, pilot: snap.pilot, now, timeZone: viewerTz, h24, airports }
  // Side by side, the schedule sits beside the cards, and nothing on the status page opens it (3C §4.3). Each layout
  // has a status page of its own, so crossing the line rebuilds it, and a popup open on it closes (§5.2, §5.3).
  if (sideBySide) {
    return <StatusScreen key="side-by-side" {...status} beside={<ScheduleView {...view} />} />
  }

  if (page.open) {
    return <SchedulePage {...view} onBack={page.back} />
  }

  return <StatusScreen key="one-column" {...status} onOpenSchedule={page.show} />
}

/** The airport whose weather the location card shows, or null when the card is hidden or the airport isn't in the list. */
function weatherPlace(snap: Snapshot | null, airports: AirportIndex, unit: TempUnit): WeatherPlace | null {
  const airport = snap && showsLocationCard(snap) ? airports.get(snap.status.airport) : undefined
  return airport ? { code: airport.iata, lat: airport.lat, lng: airport.lng, tz: airports.tz(airport.iata), unit } : null
}
