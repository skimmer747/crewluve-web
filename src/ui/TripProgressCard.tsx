import { useId } from 'preact/hooks'
import { upcomingCityPills } from '../copy/trips'
import type { AirportIndex } from '../data/airports'
import type { TripProgress } from '../engine/trips'
import { Icon } from './Icon'

/** The two-tone blends the pills cycle through (TripProgressView.pillGradients). */
export const PILL_BLENDS = 5

/** TripProgressView in its default "gradient pills" style: Day N of M, a progress bar, and up to three upcoming cities. */
export function TripProgressCard({ progress, airports }: { progress: TripProgress; airports: AirportIndex }) {
  const pills = upcomingCityPills(progress.upcoming, airports)
  const labelId = useId()
  return (
    <section class="card glass trip-card">
      <div class="trip-progress-head">
        <Icon name="CalendarBlank" size={22} color="var(--blue)" />
        <h2>{`Day ${progress.day} of ${progress.days}`}</h2>
      </div>
      <div class="trip-bar" aria-hidden="true">
        <div class="trip-bar-fill" style={{ width: `${(progress.day / progress.days) * 100}%` }} />
      </div>
      {pills.length > 0 && (
        <div class="cities">
          <p class="cities-label" id={labelId}>
            Upcoming Cities
          </p>
          {/* role="list": Safari drops the list role from a list styled without bullets. */}
          <ul class="city-pills" role="list" aria-labelledby={labelId}>
            {pills.map((pill, i) => (
              <li key={`${pill.city}|${pill.subtitle ?? ''}`} class={`city-pill blend-${i % PILL_BLENDS}`}>
                <span class="city-name">{pill.city}</span>
                {pill.subtitle && <span class="city-sub">{pill.subtitle}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
