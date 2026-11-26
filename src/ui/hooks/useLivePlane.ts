import { useEffect, useRef, useState } from 'preact/hooks'
import { watchedFlights } from '../../engine/liveLegs'
import type { Schedule } from '../../engine/types'
import type { LiveFlight } from '../../map/liveFlight'
import type { LiveFlightDoor } from '../../partner/door'
import { makeLiveSource } from '../../partner/liveSource'
import type { Device } from '../../partner/store'

/** What Crewlu Cloud last said of the pilot's flights: each by its leg's id, and its clock less this browser's. */
export interface LivePlane {
  flights: ReadonlyMap<string, LiveFlight>
  clockOffset: number
  /**
   * Crewlu Cloud hasn't answered since the page opened: a flight with no live data may yet have some (live or scheduled
   * design §2). False unless it's said.
   */
  isAwaiting?: boolean
}

export const NO_LIVE_PLANE: LivePlane = { flights: new Map(), clockOffset: 0 }

export interface UseLivePlaneOptions {
  door: LiveFlightDoor
  /** This browser's connection, read before every call. */
  device: () => Device | null
  /** The summary's schedule, before any real time replaces its own: its flights are the ones to watch. */
  schedule: Schedule | null
  /** partner_live said sharing has ended. */
  onSharingEnded: () => void
}

/**
 * The status page's live plane (Stage 3 spec §11, §12): one source, made with the page and gone with it, as the app's
 * status screen owns its LiveFlightSource. It's told which flights to watch whenever the schedule changes, asks when
 * the page is shown and every 30 seconds while a flight's window is open, and stops while the page is hidden, so it
 * never asks in the background.
 */
export function useLivePlane({ door, device, schedule, onSharingEnded }: UseLivePlaneOptions): LivePlane {
  const latest = useRef({ device, onSharingEnded })
  latest.current = { device, onSharingEnded }
  const [source] = useState(() => makeLiveSource({
    door,
    device: () => latest.current.device(),
    onSharingEnded: () => latest.current.onSharingEnded(),
  }))
  const [plane, setPlane] = useState<LivePlane>({ ...NO_LIVE_PLANE, isAwaiting: true })

  // The flights to watch, told before the first ask. Keyed by their ids and times: the schedule is a new object at every refresh.
  const watched = schedule ? watchedFlights(schedule) : []
  const watchedKey = watched.map((l) => `${l.id}:${l.departure}:${l.arrival}`).join(',')
  useEffect(() => {
    source.watch(watched)
  }, [source, watchedKey])

  useEffect(() => {
    const stop = source.subscribe(() =>
      setPlane({ flights: source.flights, clockOffset: source.clockOffset, isAwaiting: !source.hasAnswered }),
    )
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') source.pageHidden()
      else void source.pageShown()
    }
    document.addEventListener('visibilitychange', onVisibility)
    if (document.visibilityState !== 'hidden') void source.pageShown()
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
      source.pageHidden()
    }
  }, [source])

  return plane
}
