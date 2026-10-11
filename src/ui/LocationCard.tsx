import { shortTimeText } from '../copy/format'
import { timeDifference } from '../copy/location'
import { temperatureText } from '../copy/weather'
import type { AirportIndex } from '../data/airports'
import type { Weather } from '../data/weather'
import type { Snapshot } from '../engine/snapshot'
import { cssColor } from './colors'
import { Icon } from './Icon'
import { locationFacts } from './locationFacts'
import { SunDial } from './SunDial'
import { TimeDifferenceLine } from './TimeDifferenceLine'

/** The app shows the location card in every status but flying, where Part C's map will go (slice 2B1 §3). */
export function showsLocationCard(snap: Snapshot): boolean {
  return snap.status.kind !== 'inFlight'
}

export interface LocationCardProps {
  /** Where the pilot is: the snapshot's status.airport, or null when it can't be told. */
  airport: string | null
  now: number
  /** The family's time zone, for "ahead of you" and "behind you". */
  homeTz: string
  h24: boolean
  airports: AirportIndex
  weather: Weather | null
  /** Opens the sun popup: the dial becomes a button (slice 2B2 §3). */
  onOpenSun?: () => void
}

/**
 * LocationCardView's standard view (slice 2B1 §4): the city and flag, the weather, the local time and how far it is
 * from home's, with the sun dial in the upper right. With no airport it's just "Unknown Location", as in the app.
 */
export function LocationCard({ airport, now, homeTz, h24, airports, weather, onOpenSun }: LocationCardProps) {
  const { city, flag, tz, sun, visual } = locationFacts(airport, now, airports, weather)
  return (
    <section class="card glass location">
      <div class="location-body">
        <div class="location-head">
          <Icon name="MapPin" size={22} color="var(--red)" />
          <h2 class="location-city">{city}</h2>
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
              <p class="weather-credit">
                <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
                  Weather: Open-Meteo
                  <span class="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
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
      {sun && tz && <SunDial sun={sun} now={now} timeZone={tz} h24={h24} city={city} onOpen={onOpenSun} />}
    </section>
  )
}
