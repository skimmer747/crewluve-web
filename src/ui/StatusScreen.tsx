import { useRef } from 'preact/hooks'
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
import { usePopupOpener } from './hooks/usePopupOpener'
import { InFlightCard } from './InFlightCard'
import { inFlightFacts } from './inFlightFacts'
import { LocationCard, showsLocationCard } from './LocationCard'
import { locationFacts, showsDial } from './locationFacts'
import { NarrativeCard } from './NarrativeCard'
import { ViewScheduleLink, type ScheduleLinkName, type ScheduleLinkProps } from './ScheduleLink'
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
  /**
   * Opens the schedule from the link named (slice 3A §3). Without it the page has no way into the schedule, as on the
   * app's iPad, where the schedule sits beside it.
   */
  onOpenSchedule?: (name: ScheduleLinkName) => void
}

/** The link into the schedule named `name`, or none when the page has no way into it. */
const linkTo = (name: ScheduleLinkName, open?: (name: ScheduleLinkName) => void): ScheduleLinkProps | undefined =>
  open && { name, onOpen: open }

/**
 * The top of Crewluve's main screen, in its card order (spec §4.4; the location card, slice 2B1 §3; the trip cards, slice
 * 2A §3; the in-flight card in the location card's place, slice 2C §3). Then the sun popup the location card's dial opens
 * (slice 2B2 §9) and the tracking popup the in-flight card's flight number opens (slice 2C §6). The popups go after
 * <main>, since a card's frosted glass would trap a full-screen overlay inside the card; while one is open, the page is
 * hidden from screen readers.
 */
export function StatusScreen(p: StatusScreenProps) {
  const { snap } = p
  // Where focus goes when a popup closes by itself and its button went with what it showed (popup follow-ups §4.2):
  // the heading of the card now in the location card's place, or else the page's title.
  const titleHeading = useRef<HTMLHeadingElement>(null)
  const locationHeading = useRef<HTMLHeadingElement>(null)
  const inFlightHeading = useRef<HTMLHeadingElement>(null)
  const inTheirPlace = () => [inFlightHeading.current, locationHeading.current, titleHeading.current].find((el) => el?.isConnected) ?? null
  const spans = safeNarrative(snap, { now: p.now, viewerTz: p.viewerTz, h24: p.h24, airports: p.airports })
  const airport = snap.status.airport
  // The place, worked out once for the card, the popup and when the popup may be open: the card's rule for its dial.
  const facts = showsLocationCard(snap) ? locationFacts(airport, p.now, p.airports, p.weather) : null
  const dialFacts = facts && showsDial(facts) ? facts : null
  // The sun popup closes by itself when the dial goes away: at takeoff, or when the sun neither rises nor sets.
  const sun = usePopupOpener(dialFacts != null, inTheirPlace)
  // The in-flight card while the pilot is in the air; the tracking popup closes by itself when its flight number goes,
  // at landing.
  const flying = inFlightFacts(snap, p.airports)
  const tracking = usePopupOpener(flying?.trackingNumber != null, inTheirPlace)
  const hidden = sun.open || tracking.open
  const flight = snap.nextFlight
  // The cards that lead to the schedule (slice 3A §3.1); View Schedule shows whenever none of them is here (§3.2).
  const home = snap.status.kind === 'home'
  const cardLeadsThere = (home ? snap.leave != null : snap.arrival != null || snap.fallbackDaysRemaining != null) || snap.upcomingTrip != null
  return (
    <>
      <main class="screen" aria-hidden={hidden ? 'true' : undefined} inert={hidden || undefined}>
        <Title text={titleFor(snap.hasName ? snap.name : null)} headingRef={titleHeading} />
        {p.demo && <DemoBanner />}
        <NarrativeCard spans={spans} visual={statusVisual(snap)} ring={snap.ring} />
        {home ? <HomeCards {...p} /> : <AwayCard {...p} />}
        {p.onOpenSchedule && !cardLeadsThere && <ViewScheduleLink onOpen={p.onOpenSchedule} />}
        {facts && (
          <LocationCard
            airport={airport}
            facts={facts}
            now={p.now}
            homeTz={p.homeTz}
            h24={p.h24}
            weather={p.weather}
            headingRef={locationHeading}
            onOpenSun={sun.show}
          />
        )}
        {flying && (
          <InFlightCard facts={flying} now={p.now} h24={p.h24} headingRef={inFlightHeading} onOpenTracking={tracking.show} />
        )}
        {snap.upcomingTrip && (
          <UpcomingTripCard trip={snap.upcomingTrip} now={p.now} timeZone={p.homeTz} h24={p.h24} airports={p.airports}
            link={linkTo('trip', p.onOpenSchedule)} />
        )}
        {snap.tripProgress && <TripProgressCard progress={snap.tripProgress} airports={p.airports} />}
        <Footer {...p.footer} />
      </main>
      {sun.open && dialFacts && (
        <SunPopup
          facts={dialFacts}
          now={p.now}
          homeTz={p.homeTz}
          homeAirport={snap.pilot.effHome}
          h24={p.h24}
          airports={p.airports}
          weather={p.weather}
          departure={flight ? { scheduled: flight.schedStart, actual: flight.start } : null}
          onClose={sun.hide}
        />
      )}
      {tracking.open && flying?.trackingNumber && (
        <TrackingPopup trackingNumber={flying.trackingNumber} links={flying.links} onClose={tracking.hide} />
      )}
    </>
  )
}

function HomeCards({ snap, now, homeTz, h24, airports, onOpenSchedule }: StatusScreenProps) {
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
        <CountdownCard title={visual.title} icon={visual.icon} color={visual.color} target={leave.time} now={now} subtitle={subtitle}
          link={linkTo('leave', onOpenSchedule)} />
      )}
      {snap.daysHome != null && snap.daysHome >= 1 && <DaysHomePill name={snap.name} days={snap.daysHome} />}
    </>
  )
}

function AwayCard({ snap, now, homeTz, h24, airports, celebrateKey, onOpenSchedule }: StatusScreenProps) {
  const arrival = snap.arrival
  if (!arrival) {
    return snap.fallbackDaysRemaining != null
      ? <FallbackCard daysRemaining={snap.fallbackDaysRemaining} link={linkTo('fallback', onOpenSchedule)} />
      : null
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
      link={linkTo('arrival', onOpenSchedule)}
    />
  )
}
