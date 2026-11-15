import { WeatherCredit } from './WeatherCredit'

/** Under the facts (Stage 2 spec §5.2, §7.2): that they come from the schedule, and Open-Meteo's credit when a forecast shows. */
export function FactsFooter({ showsWeather }: { showsWeather: boolean }) {
  return (
    <footer class="facts-footer">
      <p>Estimated from the schedule</p>
      {showsWeather && <WeatherCredit />}
    </footer>
  )
}
