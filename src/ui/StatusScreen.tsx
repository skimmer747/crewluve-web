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
import { LocationCard, showsLocationCard } from './LocationCard'
import { NarrativeCard } from './NarrativeCard'
import { Title, titleFor } from './Title'
import { TripProgressCard } from './TripProgressCard'
import { UpcomingTripCard } from './UpcomingTripCard'

export interface StatusScreenProps {
  snap: Snapshot
  now: number
  viewerTz: string
  /** The pilot's home time zone, for the card subtitles. */
  homeTz: string
  h24: boolean
  airports: AirportIndex
  /** The location card's weather (slice 2B1 §6), or null while it loads or when there's none. */
  weather: Weather | null
  demo: boolean
  celebrateKey: number
  footer: FooterProps
}

/** The top of Crewluve's main screen, in its card order (spec §4.4; the location card, slice 2B1 §3; the trip cards, slice 2A §3). */
export function StatusScreen(p: StatusScreenProps) {
  const { snap } = p
  const spans = safeNarrative(snap, { now: p.now, viewerTz: p.viewerTz, h24: p.h24, airports: p.airports })
  return (
    <main class="screen">
      <Title text={titleFor(snap.hasName ? snap.name : null)} />
      {p.demo && <DemoBanner />}
      <NarrativeCard spans={spans} visual={statusVisual(snap)} ring={snap.ring} />
      {snap.status.kind === 'home' ? <HomeCards {...p} /> : <AwayCard {...p} />}
      {showsLocationCard(snap) && (
        <LocationCard airport={snap.status.airport} now={p.now} homeTz={p.homeTz} h24={p.h24} airports={p.airports} weather={p.weather} />
      )}
      {snap.upcomingTrip && (
        <UpcomingTripCard trip={snap.upcomingTrip} now={p.now} timeZone={p.homeTz} h24={p.h24} airports={p.airports} />
      )}
      {snap.tripProgress && <TripProgressCard progress={snap.tripProgress} airports={p.airports} />}
      <Footer {...p.footer} />
    </main>
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
