import { useMemo } from 'preact/hooks'
import type { AirportIndex } from '../data/airports'
import { buildLegs, type Leg } from '../engine/legs'
import { buildSchedule } from '../engine/normalize'
import { safeSnapshot } from '../engine/snapshot'
import type { Schedule } from '../engine/types'
import { prefers24Hour, viewerTimeZone } from '../time/zoned'
import { EmptyState } from './EmptyState'
import { Footer, type FooterProps } from './Footer'
import type { ScheduleHandle } from './hooks/useSchedule'
import { useNow } from './hooks/useNow'
import { useVisibilityCount } from './hooks/useVisibilityCount'
import { StatusScreen } from './StatusScreen'
import { Title } from './Title'

export interface ScheduleScreenProps {
  schedule: ScheduleHandle
  airports: AirportIndex
  demo: boolean
  onSignOut: () => void
}

/** Rebuilds the schedule when new rows arrive, and the snapshot every second. */
export function ScheduleScreen({ schedule, airports, demo, onSignOut }: ScheduleScreenProps) {
  const now = useNow()
  const celebrateKey = useVisibilityCount()
  const viewerTz = useMemo(() => viewerTimeZone(), [])
  const h24 = useMemo(() => prefers24Hour(), [])
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

  if (!built || built.s.empty) {
    return (
      <main class="screen">
        <Title text="CrewLuve" />
        {built?.s.empty && <EmptyState />}
        <Footer {...footer} />
      </main>
    )
  }

  const baseTz = airports.tz(built.s.pilot.base) ?? viewerTz
  const homeTz = airports.tz(built.s.pilot.effHome) ?? viewerTz
  const snap = safeSnapshot(built.s, built.legs, now, baseTz)
  return (
    <StatusScreen snap={snap} now={now} viewerTz={viewerTz} homeTz={homeTz} h24={h24} airports={airports} demo={demo}
      celebrateKey={celebrateKey} footer={footer} />
  )
}
