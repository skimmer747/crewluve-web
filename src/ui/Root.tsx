import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { DEFAULT_SCENE, demoRawForScene, isDemoScene, type DemoScene } from '../data/demo'
import { buildSchedule } from '../engine/normalize'
import { scheduleFromStored } from '../partner/convert'
import { liveDoor, type PartnerDoor } from '../partner/door'
import { joinWithLink, type JoinOutcome } from '../partner/join'
import { browserLabel } from '../partner/label'
import { linkFromHash, type PartnerLink } from '../partner/link'
import { CONNECTED_NOTE, COULDNT_CONNECT, type JoinMessage } from '../partner/messages'
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
  // The password sign-in's leftovers go when a page loads, the demo's too (piece 5a §4.2): Root mounts once a load.
  useEffect(() => clearOldSignIn(), [])
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
    <PilotPages schedule={schedule} airports={airports} demo onLeave={() => { window.location.href = window.location.pathname }} />
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

/**
 * An automated browser: a mail scanner or a link checker opening the link to check it, never a partner. Its link isn't
 * joined, which would add a device under the partner each time, toward their 10, and use a code up.
 */
const automated = (): boolean => navigator.webdriver === true

/**
 * Runs `then` once the page is shown: at once if it is, else when a visibilitychange or prerenderingchange finds it
 * visible and no longer prerendering. Returns what stops the wait. So a link opened in a background tab, or
 * prerendered, joins when the partner looks, not before.
 */
function whenShown(then: () => void): () => void {
  // document.prerendering is newer than TypeScript's DOM types, so it's read through this narrow type.
  const shown = () => document.visibilityState === 'visible' && !(document as Document & { prerendering?: boolean }).prerendering
  if (shown()) {
    then()
    return () => {}
  }
  const stop = () => {
    document.removeEventListener('visibilitychange', check)
    document.removeEventListener('prerenderingchange', check)
  }
  const check = () => {
    if (!shown()) return
    stop()
    then()
  }
  document.addEventListener('visibilitychange', check)
  document.addEventListener('prerenderingchange', check)
  return stop
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

/** What the live region says in each phase: the words that change, as they change. */
function spokenIn(phase: Phase): string {
  switch (phase.kind) {
    case 'joining':
      return 'Connecting…'
    case 'welcome':
      return phase.ended ? `Sharing with ${phase.ended} has ended.` : ''
    case 'connected':
      return phase.notice ?? ''
  }
}

/** A browser's own connection: the welcome screen, joining, or its pilot's status (piece 5a §4, §5). */
function PartnerRoot({ door, given }: { door: PartnerDoor; given?: PartnerStore }) {
  const [store] = useState(() => given ?? localPartnerStore())
  // The link the address carries at load, read once. It leaves the address either way; an automated browser's isn't
  // joined, so that page shows what it would with no link.
  const [first] = useState(() => {
    const link = takeLinkFromAddress()
    return automated() ? null : link
  })
  const [phase, setPhase] = useState<Phase>(() => {
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
    try {
      const outcome = await joinWithLink(link, {
        door,
        store,
        label: browserLabel(navigator.userAgent, navigator.maxTouchPoints),
        confirmSwitch: askSwitch,
        makeKey: newKey,
      })
      setPhase(after(outcome, store, followedName))
    } catch {
      // joinWithLink promises never to reject. Were it, or browserLabel, ever to throw, the page mustn't sit on
      // "Connecting…" until a reload.
      setPhase(after({ kind: 'failed', message: COULDNT_CONNECT }, store, followedName))
    } finally {
      joining.current = false
    }
  }

  useEffect(() => {
    // A link from the address joins once the page is shown, showing "Connecting…" meanwhile. This stops that wait.
    let stopWaiting = () => {}
    const joinWhenShown = (link: PartnerLink) => {
      stopWaiting()
      stopWaiting = whenShown(() => void join(link))
    }
    if (first) joinWhenShown(first)
    // A link pasted into the address bar while the page is open changes only the fragment.
    const onHashChange = () => {
      const link = takeLinkFromAddress()
      if (!link || automated()) return
      setPhase({ kind: 'joining' })
      joinWhenShown(link)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      stopWaiting()
    }
  }, [])

  const screen =
    phase.kind === 'joining' ? <Connecting />
      : phase.kind === 'welcome' ? <Welcome message={phase.message} ended={phase.ended} onJoin={(link) => void join(link)} />
        : (
          <PartnerLive
            door={door}
            store={store}
            notice={phase.notice}
            onEnded={(name) => setPhase(welcome(null, name))}
            onFollowed={() => setPhase({ kind: 'connected', notice: null })}
            onDisconnected={() => setPhase(welcome())}
          />
        )
  // One live region, here because this outlives every screen. Words a new screen arrives with are often skipped by
  // screen readers; a change to a region already on the page is read. So the screens' own lines aren't live regions,
  // and nothing is read twice. The welcome screen's alert stays its own, since an alert is read as it appears.
  return (
    <>
      <p class="sr-only" role="status">{spokenIn(phase)}</p>
      {screen}
    </>
  )
}

interface PartnerLiveProps {
  door: PartnerDoor
  store: PartnerStore
  notice: string | null
  /**
   * Sharing ended, with the pilot's name as this partner saw them. Or, with null, this browser follows no one by the
   * time this tab looks: another tab disconnected, or another tab's poll found sharing ended. The name went with the
   * summary then, so this tab shows a plain welcome screen.
   */
  onEnded: (pilotName: string | null) => void
  /** A poll followed the door to another partner (refresh.ts), so the line about the last join no longer applies. */
  onFollowed: () => void
  onDisconnected: () => void
}

/** The pilot's status: the kept summary at once, then the door's, every 30 s while the page shows (piece 5a §5). */
function PartnerLive({ door, store, notice, onEnded, onFollowed, onDisconnected }: PartnerLiveProps) {
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
  // The partner whose summary this page shows. Keyed on the partner, not the pilot: the door can move this browser to
  // another partner of the same pilot.
  const partner = useRef(store.device()?.partnerId ?? null)
  // False once this page is gone, after a Disconnect or for a join: a poll that answers later changes no phase.
  const mounted = useRef(true)
  useEffect(() => () => {
    mounted.current = false
  }, [])
  // While Disconnect's leave is out, a poll may find the device gone first: that's this Disconnect, not sharing ending.
  const leaving = useRef(false)
  const schedule = useSchedule({
    initial,
    load: async () => {
      const stored = await refreshSummary(door, store)
      const fresh = show(stored)
      if (stored.partnerId !== partner.current) {
        partner.current = stored.partnerId
        if (mounted.current) onFollowed()
      }
      return fresh
    },
    onError: (err) => {
      if (leaving.current) return
      if (err instanceof SharingEnded) onEnded(err.pilotName ?? 'your pilot')
      else if (err instanceof NotConnected) onEnded(null)
    },
  })

  const disconnect = async () => {
    // One Disconnect at a time: a second click while the leave is out asks nothing and sends nothing.
    if (leaving.current) return
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
      // A join, in this tab or another, may have connected a device while the leave was out: it stays, as in Crewluve.
      const current = store.device()
      if (current && (current.key !== device.key || current.partnerId !== device.partnerId)) {
        leaving.current = false
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
      onLeave={() => void disconnect()}
    />
  )
}
