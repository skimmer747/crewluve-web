/** The credit Open-Meteo asks for (slice 2B1 §6): a link that opens in a new tab, which screen readers hear too. */
export function WeatherCredit({ class: extra }: { class?: string }) {
  return (
    <p class={extra ? `weather-credit ${extra}` : 'weather-credit'}>
      <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
        Weather: Open-Meteo
        <span class="sr-only"> (opens in a new tab)</span>
      </a>
    </p>
  )
}
