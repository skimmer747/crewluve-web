import type { Ref } from 'preact'
import { shortTimeText } from '../copy/format'
import { timeDifference } from '../copy/location'
import { temperatureText } from '../copy/weather'
import type { Weather } from '../data/weather'
import type { Snapshot } from '../engine/snapshot'
import { cssColor } from './colors'
import { Icon } from './Icon'
import { showsDial, type LocationFacts } from './locationFacts'
import { SunDial } from './SunDial'
import { TimeDifferenceLine } from './TimeDifferenceLine'
import { WeatherCredit } from './WeatherCredit'

/** The app shows the location card in every status but flying, where the in-flight card takes its place (slice 2B1 §3, 2C §3). */
export function showsLocationCard(snap: Snapshot): boolean {
  return snap.status.kind !== 'inFlight'
}

export interface LocationCardProps {
  /** Where the pilot is: the snapshot's status.airport, or null when it can't be told. */
  airport: string | null
  now: number
  /** What's known about that place: its city, flag, zone, sun times and weather words, worked out by the screen. */
  facts: LocationFacts
  /** The family's time zone, for "ahead of you" and "behind you". */
  homeTz: string
  h24: boolean
  weather: Weather | null
  /** Opens the sun popup: the dial becomes a button, and is handed to it for focus to come back to (slice 2B2 §3). */
  onOpenSun?: (dial: HTMLElement) => void
  /** The city's heading, which takes focus from code when a popup closes by itself (popup follow-ups §4.2). */
  headingRef?: Ref<HTMLHeadingElement>
}

/**
 * LocationCardView's standard view (slice 2B1 §4): the city and flag, the weather, the local time and how far it is
 * from home's, with the sun dial in the upper right. With no airport it's just "Unknown Location", as in the app.
 */
export function LocationCard({ airport, facts, now, homeTz, h24, weather, onOpenSun, headingRef }: LocationCardProps) {
  const { city, flag, tz, visual } = facts
  return (
    <section class="card glass location">
      <div class="location-body">
        <div class="location-head">
          <Icon name="MapPin" size={22} color="var(--red)" />
          <h2 ref={headingRef} class="location-city" tabIndex={-1}>{city}</h2>
          {flag && <span class="location-flag">{flag}</span>}
        </div>
        {airport &&
          (weather && visual ? (
            <>
              <p class="weather-row">
                <Icon name={visual.icon} size={22} color={cssColor(visual.color)} />
                <span class="weather-temp">{temperatureText(weather.temperature)}</span>
                <span class="weather-words">{visual.words}</span>
              </p>
              <WeatherCredit />
            </>
          ) : (
            <p class="weather-row weather-none">
              <Icon name="Airplane" size={17} />
              <span>{airport}</span>
            </p>
          ))}
        {tz && (
          <div class="location-time">
            <p class="time-row">
              <Icon name="Clock" size={17} color="var(--blue)" />
              <span class="time-label">Current time:</span>
              <span class="time-value">{shortTimeText(now, tz, h24)}</span>
            </p>
            <TimeDifferenceLine diff={timeDifference(now, tz, homeTz)} />
          </div>
        )}
      </div>
      {showsDial(facts) && <SunDial sun={facts.sun} now={now} timeZone={facts.tz} h24={h24} city={city} onOpen={onOpenSun} />}
    </section>
  )
}
