import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { hasLiveSession, hasSession, hasStoredSession, onSignedOut, signOut } from '../auth/session'
import { localScheduleCache, noScheduleCache } from '../data/cache'
import { DEFAULT_SCENE, demoRawForScene, isDemoScene, type DemoScene } from '../data/demo'
import { fetchSchedule, ScheduleFetchError } from '../data/fetchSchedule'
import type { RawSchedule } from '../data/rows'
import { reportOnce } from '../reportOnce'
import { useAirports } from './hooks/useAirports'
import { useSchedule } from './hooks/useSchedule'
import { ScheduleScreen } from './ScheduleScreen'
import { SignIn } from './SignIn'

/** ?demo=1 shows the sample pilot with no network calls; otherwise sign in to CrewLu Cloud. */
export function Root() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('demo') === '1') {
    const scene = params.get('scene')
    return <DemoApp scene={isDemoScene(scene) ? scene : DEFAULT_SCENE} />
  }
  return <LiveApp />
}

function DemoApp({ scene }: { scene: DemoScene }) {
  const airports = useAirports()
  // Anchor the scene once, at page load, so the countdowns run in real time instead of resetting on refresh.
  const anchor = useMemo(() => Date.now(), [])
  const schedule = useSchedule({
    load: async () => ({ ...demoRawForScene(scene, anchor), fetchedAt: Date.now() }),
    cache: noScheduleCache,
  })
  if (!airports) return null
  return (
    <ScheduleScreen schedule={schedule} airports={airports} demo onSignOut={() => { window.location.href = window.location.pathname }} />
  )
}

function LiveApp() {
  // A stored session shows the cached schedule at once, even offline. If the session turns out to be dead,
  // the fetch's auth error or Supabase's SIGNED_OUT event returns to sign-in.
  const [phase, setPhase] = useState<'signedOut' | 'signedIn'>(() => (hasStoredSession() ? 'signedIn' : 'signedOut'))
  useEffect(
    () =>
      onSignedOut(() => {
        localScheduleCache().clear()
        setPhase('signedOut')
      }),
    [],
  )
  if (phase === 'signedOut') return <SignIn onSignedIn={() => setPhase('signedIn')} />
  return <LiveSchedule onSignedOut={() => setPhase('signedOut')} />
}

/** The signed-in pilot's CrewLu Cloud data. The client loads only here, so demo mode makes no network calls. */
async function loadLive(): Promise<RawSchedule> {
  const { supabase } = await import('../supabase')
  const raw = await fetchSchedule(supabase, Date.now())
  // Row-level security answers a request without a valid session with empty tables, not an error.
  // So an all-empty result counts only while the session is live.
  if (raw.pilotInfos.length === 0 && raw.trips.length === 0 && !(await hasLiveSession())) {
    // The session is still stored but couldn't be refreshed (a CrewLu Cloud outage): keep the cached
    // schedule and the session, and try again at the next refresh, instead of signing out.
    if (await hasSession()) throw new Error('Could not confirm the CrewLu Cloud session')
    throw new ScheduleFetchError('Not signed in', 401, 'PGRST301')
  }
  return raw
}

function LiveSchedule({ onSignedOut: finish }: { onSignedOut: () => void }) {
  const airports = useAirports()
  const cache = useMemo(() => localScheduleCache(), [])
  const ended = useRef(false)
  const endSession = async () => {
    // Forget the schedule first, so closing the tab during a slow sign-out leaves nothing behind. From here on,
    // `ended` keeps any fetch still in flight from writing it back.
    ended.current = true
    cache.clear()
    try {
      await signOut()
    } catch (err) {
      reportOnce('Signing out failed; this device is cleared anyway', err)
    }
    finish()
  }
  const schedule = useSchedule({
    load: async () => {
      const raw = await loadLive()
      // Signed out while this fetch was in flight: never write the pilot's schedule back to the device.
      if (ended.current) throw new Error('Signed out')
      return raw
    },
    cache,
    onAuthError: () => void endSession(),
  })
  if (!airports) return null
  return (
    <ScheduleScreen
      schedule={schedule}
      airports={airports}
      demo={false}
      onSignOut={() => {
        if (window.confirm('Sign out on this device?')) void endSession()
      }}
    />
  )
}
