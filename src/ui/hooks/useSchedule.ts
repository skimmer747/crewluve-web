import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { Schedule } from '../../engine/types'
import type { Problem } from '../problem'

export interface ScheduleState {
  schedule: Schedule | null
  lastSuccessAt: number | null
  problem: Problem
  refreshing: boolean
}

export type ScheduleHandle = ScheduleState & { refresh: () => void }

export interface UseScheduleOptions {
  load: () => Promise<Schedule>
  /** Shown until the first load lands: the schedule this browser kept from its last visit, if any. */
  initial?: Schedule | null
  intervalMs?: number
  /** Hears about every load that fails, once the footer shows the problem. */
  onError?: (err: unknown) => void
  isOnline?: () => boolean
}

/** How often the page asks again while it's showing: the partner door's poll (piece 5a §5). */
export const REFRESH_MS = 30_000
const RETURN_MIN_GAP_MS = 30_000

/** The kept schedule first, then a fresh one: every 30 s while visible, and when the visitor returns (piece 5a §5). */
export function useSchedule({ load, initial = null, intervalMs = REFRESH_MS, onError, isOnline = () => navigator.onLine }: UseScheduleOptions): ScheduleHandle {
  const [state, setState] = useState<ScheduleState>(() => ({
    schedule: initial,
    lastSuccessAt: initial?.fetchedAt ?? null,
    problem: null,
    refreshing: true,
  }))
  const latest = useRef({ load, onError, isOnline })
  latest.current = { load, onError, isOnline }
  const busy = useRef(false)
  const lastAttempt = useRef(0)
  // False once unmounted (after Disconnect, say): a load that finishes later must change nothing.
  const alive = useRef(true)
  useEffect(() => () => {
    alive.current = false
  }, [])

  const refresh = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    lastAttempt.current = Date.now()
    setState((s) => ({ ...s, refreshing: true }))
    try {
      const schedule = await latest.current.load()
      if (!alive.current) return
      setState({ schedule, lastSuccessAt: schedule.fetchedAt, problem: null, refreshing: false })
    } catch (err) {
      if (!alive.current) return
      setState((s) => ({ ...s, refreshing: false, problem: latest.current.isOnline() ? { kind: 'unreachable' } : { kind: 'offline' } }))
      latest.current.onError?.(err)
    } finally {
      busy.current = false
    }
  }, [])

  useEffect(() => {
    void refresh()
    const tick = setInterval(() => {
      if (document.visibilityState !== 'hidden') void refresh()
    }, intervalMs)
    const onReturn = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastAttempt.current >= RETURN_MIN_GAP_MS) void refresh()
    }
    // Back online: try at once, even inside the 30 s gap, so "Offline" clears as soon as it can.
    const onOnline = () => {
      if (document.visibilityState !== 'hidden') void refresh()
    }
    // Gone offline: say so now rather than at the next refresh (spec §8).
    const onOffline = () => setState((s) => ({ ...s, problem: { kind: 'offline' } }))
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [refresh, intervalMs])

  return { ...state, refresh: () => void refresh() }
}
