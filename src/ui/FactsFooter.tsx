import { LIVE_CREDIT, SPOKEN_LIVE_CREDIT } from '../copy/facts'
import { WeatherCredit } from './WeatherCredit'

export interface FactsFooterProps {
  showsWeather: boolean
  /** A flight with live data shows: its position is adsb.lol's. */
  showsLiveCredit: boolean
}

/**
 * Under the facts (Stage 2 spec §5.2, §7.2; Stage 3 spec §8): that they come from the schedule, the credit to adsb.lol
 * whenever a flight with live data shows, and Open-Meteo's credit when a forecast shows.
 */
export function FactsFooter({ showsWeather, showsLiveCredit }: FactsFooterProps) {
  return (
    <footer class="facts-footer">
      <p>Estimated from the schedule</p>
      {showsLiveCredit && <LiveCredit />}
      {showsWeather && <WeatherCredit />}
    </footer>
  )
}

/** "Live position: adsb.lol", which screen readers hear as a sentence (Stage 3 spec §15). Plain words, as the app's. */
function LiveCredit() {
  return (
    <p class="live-credit">
      <span aria-hidden="true">{LIVE_CREDIT}</span>
      <span class="sr-only">{SPOKEN_LIVE_CREDIT}</span>
    </p>
  )
}
