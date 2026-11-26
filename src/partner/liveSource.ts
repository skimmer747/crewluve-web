import type { LiveFlight } from '../map/liveFlight'
import { isLiveWindowOpen } from '../map/liveWindow'
import { reportOnce } from '../reportOnce'
import { isRefused, type LiveFlightDoor, type Refused } from './door'
import type { LiveAnswer } from './liveAnswer'
import type { Device } from './store'

/**
 * The pilot's flights with live data, for one page (Stage 3 spec §11, §12), as the app's LiveFlightSource. It asks
 * partner_live once each time the page is shown, and every 30 seconds while a flight's window is open. The 30-second
 * check runs only between `pageShown()` and `pageHidden()`: the page keeps it out of the background by saying when it's
 * hidden, and it calls `pageHidden()` when it goes too, or the check runs on. A call already under way when the page is
 * hidden still brings its answer. One call is made at a time.
 */

/** A flight leg of the summary to ask about: its id, and its gate times moved by any reported delay. */
export interface LiveLeg {
  id: string
  departure: number
  arrival: number
}

/** How often it asks while a flight's window is open. */
export const LIVE_INTERVAL_MS = 30_000

export interface LiveSourceOptions {
  door: LiveFlightDoor
  /** This browser's device, read at every call: the store's `device()`. */
  device: () => Device | null
  /** partner_live said this browser's device is gone. */
  onSharingEnded: () => void
  /** This browser's clock. */
  now?: () => number
}

export interface LiveSource {
  /** Each flight Crewlu Cloud answered, by its leg's id. A leg with none has no live data. */
  readonly flights: ReadonlyMap<string, LiveFlight>
  /** Crewlu Cloud's clock minus this browser's, as of the last answer, so a wrong clock here doesn't age a fix. */
  readonly clockOffset: number
  /**
   * Crewlu Cloud has answered since the source was made, or a call to it failed (live or scheduled design §2). Until
   * then a flight with no live data may yet have some, and the page says nothing of where it comes from. Once true it
   * stays true for the source's life, a new connection's included: its flights read as not tracked until its own
   * answer comes.
   */
  readonly hasAnswered: boolean
  /** Crewlu Cloud's time when this browser's clock says `t`. Fix ages and windows are measured against it. */
  serverTime(t: number): number
  /** The summary's flight legs, whenever they change: the 30-second check asks while one's window is open. */
  watch(legs: LiveLeg[]): void
  /** The page was shown: asks once, then every 30 seconds while a flight's window is open. */
  pageShown(): Promise<void>
  /** The page was hidden, or is going: nothing is asked until it's shown again. */
  pageHidden(): void
  /**
   * Asks Crewlu Cloud once, takes its answer, and settles when it has. While a call is under way, another asks nothing
   * more and settles with that one's answer: so a refresh by hand ends when the live plane is up to date.
   */
  ask(): Promise<void>
  /**
   * Hears each change of `flights`, and the first answer whatever it holds. Returns what stops it. An answer that
   * moves only Crewlu Cloud's clock tells no one:
   * the page's own clock ages a fix.
   */
  subscribe(listener: () => void): () => void
}

/** Whose flights an answer holds: another device's, or another partner's, are another connection's. */
const connection = (device: Device | null) => (device ? `${device.partnerId} ${device.key}` : null)

const sameFlights = (a: ReadonlyMap<string, LiveFlight>, b: ReadonlyMap<string, LiveFlight>) =>
  a.size === b.size && [...a].every(([id, flight]) => JSON.stringify(flight) === JSON.stringify(b.get(id)))

export function makeLiveSource({ door, device, onSharingEnded, now = Date.now }: LiveSourceOptions): LiveSource {
  let flights: ReadonlyMap<string, LiveFlight> = new Map()
  let clockOffset = 0
  let hasAnswered = false
  let legs: LiveLeg[] = []
  /** The last answer's cursor, sent back so only the trail points since then come. */
  let cursor: number | null = null
  /** The connection the flights were answered for. */
  let answeredFor: string | null = null
  /** The call under way, when there is one, and the connection it asks for. */
  let asking: { connection: string | null; call: Promise<void> } | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  const listeners = new Set<() => void>()

  const serverTime = (t: number) => t + clockOffset

  /** Calls the page back. A page that throws is reported, and the source goes on as if it hadn't. */
  function callBack(back: () => void) {
    try {
      back()
    } catch (error) {
      reportOnce('The live plane could not tell the page', error)
    }
  }

  /** Tells every listener. */
  function tell() {
    for (const listener of [...listeners]) callBack(listener)
  }

  function setFlights(next: ReadonlyMap<string, LiveFlight>) {
    if (sameFlights(flights, next)) return
    flights = next
    // The listener reads `hasAnswered`: a change of flights is an answer, told once with it.
    hasAnswered = true
    tell()
  }

  /** Forgets the flights and the cursor: they were another connection's, or sharing has ended. */
  function forget() {
    cursor = null
    answeredFor = null
    setFlights(new Map())
  }

  /**
   * Makes `answer` the flights. One that isn't whole brings each flight's points since the cursor, which go after the
   * points already here. False, changing nothing, when a trail then holds another number of points than Crewlu Cloud
   * says the flight has. A whole answer is taken as it comes. `askedAt` is when its call went out, by this browser's
   * clock.
   */
  function take(answer: LiveAnswer, isWhole: boolean, askedAt: number): boolean {
    const answered = new Map<string, LiveFlight>()
    for (const { trailCount, ...flight } of answer.flights) {
      const trail = isWhole ? flight.trail : [...(flights.get(flight.legId)?.trail ?? []), ...flight.trail]
      if (!isWhole && trail.length !== trailCount) return false
      answered.set(flight.legId, { ...flight, trail })
    }
    cursor = answer.cursor
    // Crewlu Cloud read its clock somewhere inside the call: the call's middle is the best guess of when.
    clockOffset = answer.now - (askedAt + (now() - askedAt) / 2)
    setFlights(answered)
    return true
  }

  /** Whether `answer` is a refusal. sharing_ended forgets the flights and tells the page; any other keeps what's here. */
  function refused(answer: LiveAnswer | Refused): answer is Refused {
    if (!isRefused(answer)) return false
    if (answer.error === 'sharing_ended') {
      forget()
      callBack(onSharingEnded)
    }
    return true
  }

  /** One call to Crewlu Cloud, and what's kept of its answer. */
  async function askCrewluCloud(): Promise<void> {
    const asked = device()
    const asker = connection(asked)
    if (!asked || !asker) {
      // This browser follows no one now.
      forget()
      return
    }
    if (asker !== answeredFor) forget()
    const sent = cursor
    try {
      let askedAt = now()
      const answer = await door.live(asked.key, sent)
      if (hasLeft(asker) || refused(answer)) return
      if (!take(answer, sent == null, askedAt)) {
        // A trail doesn't add up: a point reached Crewlu Cloud after one with a later id, or the flight is new here and
        // has points from before the cursor. Every point, then.
        askedAt = now()
        const whole = await door.live(asked.key, null)
        if (hasLeft(asker) || refused(whole)) return
        take(whole, true, askedAt)
      }
      answeredFor = asker
    } catch {
      // Crewlu Cloud couldn't be reached, or its answer couldn't be read: what's here stays.
    }
  }

  /**
   * Whether this browser has left the connection `asker` asked for, by Disconnect or a join, while the call was out.
   * Its answer is that connection's then, and so is everything kept here, which goes.
   */
  function hasLeft(asker: string): boolean {
    if (connection(device()) === asker) return false
    forget()
    return true
  }

  function ask(): Promise<void> {
    const current = connection(device())
    // A call for another connection is let finish first, then this one is asked for.
    if (asking) return asking.connection === current ? asking.call : asking.call.then(ask)
    let settle!: () => void
    const call = new Promise<void>((resolve) => {
      settle = resolve
    })
    // Kept before the call starts, so a listener that asks while the flights are forgotten finds this one.
    asking = { connection: current, call }
    void askCrewluCloud().finally(() => {
      asking = null
      // The first answer is told even when it brings no flights: the page waits for it (live or scheduled design §2).
      if (!hasAnswered) {
        hasAnswered = true
        tell()
      }
      settle()
    })
    return call
  }

  /** The 30-second check: asks while any flight's window is open, by Crewlu Cloud's clock. */
  function check() {
    const at = serverTime(now())
    if (legs.some((leg) => isLiveWindowOpen(leg.departure, leg.arrival, flights.get(leg.id) ?? null, at))) void ask()
  }

  function pageHidden() {
    if (timer != null) clearInterval(timer)
    timer = null
  }

  return {
    get flights() {
      return flights
    },
    get clockOffset() {
      return clockOffset
    },
    get hasAnswered() {
      return hasAnswered
    },
    serverTime,
    watch(next) {
      legs = next
    },
    pageShown() {
      pageHidden()
      timer = setInterval(check, LIVE_INTERVAL_MS)
      return ask()
    },
    pageHidden,
    ask,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
