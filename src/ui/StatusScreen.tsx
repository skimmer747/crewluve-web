import { useEffect, useRef, useState } from 'preact/hooks'
import { arrivalWhenText, leaveWhenText, tripDepartsText } from '../copy/format'
import { safeNarrative } from '../copy/narrative'
import { arrivalCard, leaveCard, statusVisual } from '../copy/visuals'
import type { AirportIndex } from '../data/airports'
import type { Weather } from '../data/weather'
import type { Snapshot } from '../engine/snapshot'
import { CountdownCard } from './CountdownCard'
import { DaysHomePill } from './DaysHomePill'
import { DemoBanner } from './DemoBanner'
import { FallbackCard } from './FallbackCard'
import { Footer, type FooterProps } from './Footer'
import { InFlightCard } from './InFlightCard'
import { inFlightFacts } from './inFlightFacts'
import { LocationCard, showsLocationCard } from './LocationCard'
import { locationFacts, showsDial } from './locationFacts'
import { NarrativeCard } from './NarrativeCard'
import { SunPopup } from './SunPopup'
import { Title, titleFor } from './Title'
import { TrackingPopup } from './TrackingPopup'
import { TripProgressCard } from './TripProgressCard'
import { UpcomingTripCard } from './UpcomingTripCard'

export interface StatusScreenProps {
  snap: Snapshot
  now: number
  viewerTz: string
  /** The family's home time zone: for the card subtitles, the location card's time difference and the popup's home clock. */
  homeTz: string
  h24: boolean
  airports: AirportIndex
  /** The location card's weather (slice 2B1 §6), or null while it loads or when there's none. */
  weather: Weather | null
  demo: boolean
  celebrateKey: number
  footer: FooterProps
}

/**
 * The top of Crewluve's main screen, in its card order (spec §4.4; the location card, slice 2B1 §3; the trip cards, slice
 * 2A §3; the in-flight card in the location card's place, slice 2C §3). Then the sun popup the location card's dial opens
 * (slice 2B2 §9) and the tracking popup the in-flight card's flight number opens (slice 2C §6). The popups go after
 * <main>, since a card's frosted glass would trap a full-screen overlay inside the card; while one is open, the page is
 * hidden from screen readers.
 */
export function StatusScreen(p: StatusScreenProps) {
  const { snap } = p
  const [sunOpen, setSunOpen] = useState(false)
  const [trackingOpen, setTrackingOpen] = useState(false)
  /** The card's dial, which opened the popup: focus goes back to it afterwards. */
  const dial = useRef<HTMLElement | null>(null)
  /** The in-flight card's flight number, which opened the tracking popup: focus goes back to it afterwards. */
  const flightNumberButton = useRef<HTMLElement | null>(null)
  const wasOpen = useRef(false)
  const wasTracking = useRef(false)
  const spans = safeNarrative(snap, { now: p.now, viewerTz: p.viewerTz, h24: p.h24, airports: p.airports })
  const airport = snap.status.airport
  // The place, worked out once for the card, the popup and when the popup may be open: the card's rule for its dial.
  const facts = showsLocationCard(snap) ? locationFacts(airport, p.now, p.airports, p.weather) : null
  const dialFacts = facts && showsDial(facts) ? facts : null
  const dialShown = dialFacts != null
  // The popup closes by itself when the dial goes away: at takeoff, or when the sun neither rises nor sets.
  useEffect(() => {
    if (sunOpen && !dialShown) setSunOpen(false)
  }, [sunOpen, dialShown])
  const open = sunOpen && dialShown
  // Focus goes back to the dial once the popup has closed. This runs after the render that lifts `inert` from <main>,
  // since nothing in an inert page can take focus. A dial that went away (at takeoff) is skipped.
  useEffect(() => {
    if (wasOpen.current && !open && dial.current?.isConnected) dial.current.focus()
    wasOpen.current = open
  }, [open])
  // The in-flight card while the pilot is in the air; the tracking popup closes by itself when its flight number goes,
  // at landing, and focus goes back to the flight number once it has closed, as for the dial.
  const flying = inFlightFacts(snap, p.airports)
  const tracking = trackingOpen && flying?.trackingNumber != null
  useEffect(() => {
    if (trackingOpen && !tracking) setTrackingOpen(false)
  }, [trackingOpen, tracking])
  useEffect(() => {
    if (wasTracking.current && !tracking && flightNumberButton.current?.isConnected) flightNumberButton.current.focus()
    wasTracking.current = tracking
  }, [tracking])
  const hidden = open || tracking
  const flight = snap.nextFlight
  return (
    <>
      <main class="screen" aria-hidden={hidden ? 'true' : undefined} inert={hidden || undefined}>
        <Title text={titleFor(snap.hasName ? snap.name : null)} />
        {p.demo && <DemoBanner />}
        <NarrativeCard spans={spans} visual={statusVisual(snap)} ring={snap.ring} />
        {snap.status.kind === 'home' ? <HomeCards {...p} /> : <AwayCard {...p} />}
        {facts && (
          <LocationCard
            airport={airport}
            facts={facts}
            now={p.now}
            homeTz={p.homeTz}
            h24={p.h24}
            weather={p.weather}
            onOpenSun={(button) => {
              dial.current = button
              setSunOpen(true)
            }}
          />
        )}
        {flying && (
          <InFlightCard
            facts={flying}
            now={p.now}
            h24={p.h24}
            onOpenTracking={(button) => {
              flightNumberButton.current = button
              setTrackingOpen(true)
            }}
          />
        )}
        {snap.upcomingTrip && (
          <UpcomingTripCard trip={snap.upcomingTrip} now={p.now} timeZone={p.homeTz} h24={p.h24} airports={p.airports} />
        )}
        {snap.tripProgress && <TripProgressCard progress={snap.tripProgress} airports={p.airports} />}
        <Footer {...p.footer} />
      </main>
      {open && dialFacts && (
        <SunPopup
          facts={dialFacts}
          now={p.now}
          homeTz={p.homeTz}
          homeAirport={snap.pilot.effHome}
          h24={p.h24}
          airports={p.airports}
          weather={p.weather}
          departure={flight ? { scheduled: flight.schedStart, actual: flight.start } : null}
          onClose={() => setSunOpen(false)}
        />
      )}
      {tracking && flying?.trackingNumber && (
        <TrackingPopup trackingNumber={flying.trackingNumber} links={flying.links} onClose={() => setTrackingOpen(false)} />
      )}
    </>
  )
}

function HomeCards({ snap, now, homeTz, h24, airports }: StatusScreenProps) {
  const leave = snap.leave
  const visual = leave ? leaveCard(leave) : null
  const subtitle = !leave
    ? null
    : leave.commuterUnlogged
      ? tripDepartsText(airports.city(leave.airport) ?? '', leave.time, homeTz, h24)
      : leaveWhenText(leave.time, homeTz, h24)
  return (
    <>
      {leave && visual && (
        <CountdownCard title={visual.title} icon={visual.icon} color={visual.color} target={leave.time} now={now} subtitle={subtitle} />
      )}
      {snap.daysHome != null && snap.daysHome >= 1 && <DaysHomePill name={snap.name} days={snap.daysHome} />}
    </>
  )
}

function AwayCard({ snap, now, homeTz, h24, airports, celebrateKey }: StatusScreenProps) {
  const arrival = snap.arrival
  if (!arrival) {
    return snap.fallbackDaysRemaining != null ? <FallbackCard daysRemaining={snap.fallbackDaysRemaining} /> : null
  }
  const visual = arrivalCard(snap, arrival, airports)
  const city = airports.city(arrival.airport)
  const when = arrivalWhenText(arrival.time, homeTz, h24)
  return (
    <CountdownCard
      title={visual.title}
      icon={visual.icon}
      color={visual.color}
      target={arrival.time}
      now={now}
      subtitle={city ? `${when} · ${city}` : when}
      celebrate={snap.celebrate}
      celebrateKey={celebrateKey}
    />
  )
}
