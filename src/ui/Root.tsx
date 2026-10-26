import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { DEFAULT_SCENE, demoRawForScene, isDemoScene, type DemoScene } from '../data/demo'
import { buildSchedule } from '../engine/normalize'
import { scheduleFromStored } from '../partner/convert'
import { liveDoor, type PartnerDoor } from '../partner/door'
import { joinWithLink, type JoinOutcome } from '../partner/join'
import { browserLabel } from '../partner/label'
import { linkFromHash, type PartnerLink } from '../partner/link'
import { CONNECTED_NOTE, type JoinMessage } from '../partner/messages'
import { NotConnected, refreshSummary, SharingEnded } from '../partner/refresh'
import { clearOldSignIn, localPartnerStore, newKey, type PartnerStore, type StoredSummary } from '../partner/store'
import { currentQuickStatus, nameIn, type PartnerSummary } from '../partner/summary'
import { useAirports } from './hooks/useAirports'
import { useSchedule } from './hooks/useSchedule'
import { PilotPages } from './PilotPages'
import { Connecting, Welcome } from './Welcome'

export interface RootProps {
  /** Crewlu Cloud's partner door, and where this browser keeps its connection. Tests pass fakes. */
  door?: PartnerDoor
  store?: PartnerStore
}

/** ?demo=1 shows the sample pilot with no network calls; otherwise this browser's own connection to its pilot. */
export function Root({ door = liveDoor, store }: RootProps) {
  const params = new URLSearchParams(window.location.search)
  if (params.get('demo') === '1') {
    const scene = params.get('scene')
    return <DemoApp scene={isDemoScene(scene) ? scene : DEFAULT_SCENE} />
  }
  return <PartnerRoot door={door} given={store} />
}

function DemoApp({ scene }: { scene: DemoScene }) {
  const airports = useAirports()
  // Anchor the scene once, at page load, so the countdowns run in real time instead of resetting on refresh.
  const anchor = useMemo(() => Date.now(), [])
  const schedule = useSchedule({ load: async () => buildSchedule({ ...demoRawForScene(scene, anchor), fetchedAt: Date.now() }, Date.now()) })
  if (!airports) return null
  return (
    <PilotPages schedule={schedule} airports={airports} demo onSignOut={() => { window.location.href = window.location.pathname }} />
  )
}

type Phase =
  | { kind: 'joining' }
  | { kind: 'welcome'; message: JoinMessage | null; ended: string | null }
  | { kind: 'connected'; notice: string | null }

const welcome = (message: JoinMessage | null = null, ended: string | null = null): Phase => ({ kind: 'welcome', message, ended })

/**
 * The invite or code in the address, if any (piece 5a §4.1). It then leaves the address, so the secret isn't left
 * showing and a reload doesn't join again; so does a /join address with no link. Any other fragment, such as the
 * Schedule page's #schedule, stays.
 */
function takeLinkFromAddress(): PartnerLink | null {
  const link = linkFromHash(window.location.hash)
  if (link || /^\/join(\.html)?\/?$/.test(window.location.pathname)) window.history.replaceState(null, '', '/')
  return link
}

/** "Switch to Sam?", as Crewluve asks it (SwitchQuestion), in this browser's words. */
const askSwitch = (newPilot: string, currentPilot: string) =>
  window.confirm(`Switch to ${newPilot}?\n\nYou'll stop seeing ${currentPilot}'s status in this browser.`)

/**
 * Where a join leaves the page: the status, with a line about what happened, or the welcome screen with it. A browser
 * that followed a pilot before the join and follows no one after it found that sharing over: the pilot had removed it.
 */
function after(outcome: JoinOutcome, store: PartnerStore, followedName: string | null): Phase {
  const connected = store.device() != null
  const ended = connected ? null : followedName
  switch (outcome.kind) {
    case 'connected':
      return { kind: 'connected', notice: outcome.newDevice ? CONNECTED_NOTE : null }
    case 'cancelled':
      return connected ? { kind: 'connected', notice: null } : welcome(null, ended)
    case 'failed':
      return connected ? { kind: 'connected', notice: outcome.message.text } : welcome(outcome.message, ended)
  }
}

/** A browser's own connection: the welcome screen, joining, or its pilot's status (piece 5a §4, §5). */
function PartnerRoot({ door, given }: { door: PartnerDoor; given?: PartnerStore }) {
  const [store] = useState(() => given ?? localPartnerStore())
  // The link the address carries at load, read once.
  const [first] = useState(() => takeLinkFromAddress())
  const [phase, setPhase] = useState<Phase>(() => {
    clearOldSignIn()
    if (first) return { kind: 'joining' }
    return store.device() ? { kind: 'connected', notice: null } : welcome()
  })
  const joining = useRef(false)

  const join = async (link: PartnerLink) => {
    if (joining.current) return
    joining.current = true
    setPhase({ kind: 'joining' })
    // Whom this browser followed, in case the join finds that sharing already over: the pilot had removed it.
    const wasConnected = store.device() != null
    const stored = store.summary()
    const followedName = wasConnected ? ((stored && nameIn(stored.status, stored.partnerId)) ?? 'your pilot') : null
    const outcome = await joinWithLink(link, {
      door,
      store,
      label: browserLabel(navigator.userAgent, navigator.maxTouchPoints),
      confirmSwitch: askSwitch,
      makeKey: newKey,
    })
    joining.current = false
    setPhase(after(outcome, store, followedName))
  }

  useEffect(() => {
    if (first) void join(first)
    // A link pasted into the address bar while the page is open changes only the fragment.
    const onHashChange = () => {
      const link = takeLinkFromAddress()
      if (link) void join(link)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (phase.kind === 'joining') return <Connecting />
  if (phase.kind === 'welcome') return <Welcome message={phase.message} ended={phase.ended} onJoin={(link) => void join(link)} />
  return (
    <PartnerLive
      door={door}
      store={store}
      notice={phase.notice}
      onEnded={(name) => setPhase(welcome(null, name))}
      onDisconnected={() => setPhase(welcome())}
    />
  )
}

interface PartnerLiveProps {
  door: PartnerDoor
  store: PartnerStore
  notice: string | null
  /** Sharing ended (with the pilot's name as this partner saw them), or, with null, another tab disconnected. */
  onEnded: (pilotName: string | null) => void
  onDisconnected: () => void
}

/** The pilot's status: the kept summary at once, then the door's, every 30 s while the page shows (piece 5a §5). */
function PartnerLive({ door, store, notice, onEnded, onDisconnected }: PartnerLiveProps) {
  const airports = useAirports()
  // The summary on screen, beside the schedule made from it: the quick status comes from it (piece 5a §7).
  const shown = useRef<PartnerSummary | null>(null)
  const show = (stored: StoredSummary) => {
    const { schedule, summary } = scheduleFromStored(stored)
    shown.current = summary
    return schedule
  }
  const initial = useMemo(() => {
    const stored = store.summary()
    // Only a summary for the device this browser holds: one left from another partner would show the wrong pilot.
    if (!stored || stored.partnerId !== store.device()?.partnerId) return null
    try {
      return show(stored)
    } catch {
      return null
    }
  }, [])
  // While Disconnect's leave is out, a poll may find the device gone first: that's this Disconnect, not sharing ending.
  const leaving = useRef(false)
  const schedule = useSchedule({
    initial,
    load: async () => show(await refreshSummary(door, store)),
    onError: (err) => {
      if (leaving.current) return
      if (err instanceof SharingEnded) onEnded(err.pilotName ?? 'your pilot')
      else if (err instanceof NotConnected) onEnded(null)
    },
  })

  const disconnect = async () => {
    const name = shown.current?.name ?? 'your pilot'
    const asked = `Disconnect from ${name}?\n\nYou'll stop seeing ${name}'s status in this browser. To connect again, open the invite link ${name} sent you.`
    if (!window.confirm(asked)) return
    const device = store.device()
    if (device) {
      leaving.current = true
      try {
        await door.leave(device.key)
      } catch {
        leaving.current = false
        // As in Crewluve: a device that couldn't leave would stay in the pilot's list with no key left to remove it.
        window.alert("Couldn't disconnect. Check your connection and try again.")
        return
      }
    }
    store.forget()
    onDisconnected()
  }

  if (!airports) return null
  return (
    <PilotPages
      schedule={schedule}
      airports={airports}
      demo={false}
      notice={notice}
      quickStatusAt={(now) => (shown.current ? currentQuickStatus(shown.current, now) : null)}
      onSignOut={() => void disconnect()}
    />
  )
}
