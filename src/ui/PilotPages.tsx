import { useMemo } from 'preact/hooks'
import type { AirportIndex } from '../data/airports'
import { loadDemoWeather } from '../data/demoWeather'
import { loadLiveWeather, tempUnitFor, type TempUnit, type WeatherLoader, type WeatherPlace } from '../data/weather'
import { buildLegs, type Leg } from '../engine/legs'
import { buildSchedule } from '../engine/normalize'
import { safeSnapshot, type Snapshot } from '../engine/snapshot'
import type { Schedule } from '../engine/types'
import { prefers24Hour, viewerTimeZone } from '../time/zoned'
import { EmptyState } from './EmptyState'
import { Footer, type FooterProps } from './Footer'
import type { ScheduleHandle } from './hooks/useSchedule'
import { useNow } from './hooks/useNow'
import { useSchedulePage } from './hooks/useSchedulePage'
import { useVisibilityCount } from './hooks/useVisibilityCount'
import { useWeather } from './hooks/useWeather'
import { showsLocationCard } from './LocationCard'
import { scheduleLegs } from './scheduleFacts'
import { SchedulePage } from './SchedulePage'
import { StatusScreen } from './StatusScreen'
import { Title } from './Title'

export interface PilotPagesProps {
  schedule: ScheduleHandle
  airports: AirportIndex
  demo: boolean
  onSignOut: () => void
  /** Where the location card's weather comes from: Open-Meteo, or the made-up samples in the demo. Tests pass a fake. */
  loadWeather?: WeatherLoader
}

/**
 * Rebuilds the schedule when new rows arrive, and the snapshot every second. Shows the status page, or the Schedule
 * page when the address ends in #schedule (slice 3A §3.3); while there's nothing to show, the same screen as ever.
 */
export function PilotPages({ schedule, airports, demo, onSignOut, loadWeather = demo ? loadDemoWeather : loadLiveWeather }: PilotPagesProps) {
  const now = useNow()
  const celebrateKey = useVisibilityCount()
  const viewerTz = useMemo(() => viewerTimeZone(), [])
  const h24 = useMemo(() => prefers24Hour(), [])
  const unit = useMemo(() => tempUnitFor(), [])
  const built = useMemo<{ s: Schedule; legs: Leg[] } | null>(() => {
    if (!schedule.raw) return null
    try {
      const s = buildSchedule(schedule.raw, Date.now())
      return { s, legs: buildLegs(s) }
    } catch (err) {
      console.error('Could not read the schedule', err)
      return null
    }
  }, [schedule.raw])

  const footer: FooterProps = {
    now,
    lastSuccessAt: schedule.lastSuccessAt,
    newestUpdatedAt: schedule.raw?.newestUpdatedAt ?? null,
    problem: schedule.problem,
    refreshing: schedule.refreshing,
    onRefresh: schedule.refresh,
    onSignOut,
    signOutLabel: demo ? 'Exit demo' : 'Sign out',
    viewerTz,
    h24,
  }

  const ready = built && !built.s.empty ? built : null
  const homeTz = (ready && airports.tz(ready.s.pilot.effHome)) ?? viewerTz
  const snap = ready ? safeSnapshot(ready.s, ready.legs, now, airports.tz(ready.s.pilot.base) ?? viewerTz) : null
  // Asked for before the early return below, so the hooks run in the same order on every render.
  const weather = useWeather(weatherPlace(snap, airports, unit), loadWeather)
  // The page the address asks for, and the legs the Schedule page lists.
  const page = useSchedulePage(false)
  const listed = useMemo(() => (ready ? scheduleLegs(ready.legs) : []), [ready])

  if (!snap) {
    return (
      <main class="screen">
        <Title text="CrewLuve" />
        {built?.s.empty && <EmptyState />}
        <Footer {...footer} />
      </main>
    )
  }

  if (page.open) {
    return <SchedulePage legs={listed} pilot={snap.pilot} now={now} timeZone={viewerTz} h24={h24} airports={airports} onBack={page.back} />
  }

  return (
    <StatusScreen snap={snap} now={now} viewerTz={viewerTz} homeTz={homeTz} h24={h24} airports={airports} weather={weather} demo={demo}
      celebrateKey={celebrateKey} footer={footer} onOpenSchedule={page.show} />
  )
}

/** The airport whose weather the location card shows, or null when the card is hidden or the airport isn't in the list. */
function weatherPlace(snap: Snapshot | null, airports: AirportIndex, unit: TempUnit): WeatherPlace | null {
  const airport = snap && showsLocationCard(snap) ? airports.get(snap.status.airport) : undefined
  return airport ? { code: airport.iata, lat: airport.lat, lng: airport.lng, tz: airports.tz(airport.iata), unit } : null
}
