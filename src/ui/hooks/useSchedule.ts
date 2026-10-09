import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { ScheduleCache } from '../../data/cache'
import { ScheduleFetchError } from '../../data/fetchSchedule'
import type { RawSchedule } from '../../data/rows'
import type { Problem } from '../problem'

export interface ScheduleState {
  raw: RawSchedule | null
  lastSuccessAt: number | null
  problem: Problem
  refreshing: boolean
}

export type ScheduleHandle = ScheduleState & { refresh: () => void }

export interface UseScheduleOptions {
  load: () => Promise<RawSchedule>
  cache: ScheduleCache
  intervalMs?: number
  onAuthError?: () => void
  isOnline?: () => boolean
}

export const REFRESH_MS = 5 * 60_000
const RETURN_MIN_GAP_MS = 30_000

/** The cached schedule first, then CrewLu Cloud, refreshed every 5 min while visible and when the visitor returns (spec §5). */
export function useSchedule({ load, cache, intervalMs = REFRESH_MS, onAuthError, isOnline = () => navigator.onLine }: UseScheduleOptions): ScheduleHandle {
  const [state, setState] = useState<ScheduleState>(() => {
    const cached = cache.load()
    return { raw: cached, lastSuccessAt: cached?.fetchedAt ?? null, problem: null, refreshing: true }
  })
  const latest = useRef({ load, cache, onAuthError, isOnline })
  latest.current = { load, cache, onAuthError, isOnline }
  const busy = useRef(false)
  const lastAttempt = useRef(0)
  // False once unmounted (for example after sign-out): a fetch that finishes later must never write the cache back.
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
      const raw = await latest.current.load()
      if (!alive.current) return
      latest.current.cache.save(raw)
      setState({ raw, lastSuccessAt: raw.fetchedAt, problem: null, refreshing: false })
    } catch (err) {
      if (!alive.current) return
      setState((s) => ({ ...s, refreshing: false, problem: latest.current.isOnline() ? { kind: 'unreachable' } : { kind: 'offline' } }))
      if (err instanceof ScheduleFetchError && err.isAuth) latest.current.onAuthError?.()
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
