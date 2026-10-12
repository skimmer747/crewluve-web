import { useId, useMemo, useRef } from 'preact/hooks'
import { shortTimeText } from '../copy/format'
import { daylightText, moonPhaseName } from '../copy/sunDetail'
import { temperatureText, weatherAnimation } from '../copy/weather'
import type { AirportIndex } from '../data/airports'
import type { Weather } from '../data/weather'
import type { Departure } from '../engine/snapshot'
import { moonPhase } from '../time/moon'
import { isDaytime, sunTimes } from '../time/sun'
import { cssColor } from './colors'
import { useDragToClose } from './hooks/useDragToClose'
import { useModalDialog } from './hooks/useModalDialog'
import { usePopupClose } from './hooks/usePopupClose'
import { Icon } from './Icon'
import type { DialFacts } from './locationFacts'
import { MoonPhaseIcon } from './MoonPhaseIcon'
import { SunDial } from './SunDial'
import { WeatherBackdrop } from './WeatherBackdrop'
import { WeatherCredit } from './WeatherCredit'

export interface SunPopupProps {
  /** Where the pilot is, with the zone and sun times the dial needs: the screen opens the popup only then. */
  facts: DialFacts
  now: number
  /** The family's time zone. */
  homeTz: string
  /** Home's airport, for home's sunrise and sunset, or null when it isn't known. */
  homeAirport: string | null
  h24: boolean
  airports: AirportIndex
  weather: Weather | null
  departure: Departure | null
  /** Called once the popup has finished closing. */
  onClose: () => void
}

/**
 * The sun popup (slice 2B2 §3, §4): SunCircleDetailView. It covers the page, with the city, the two clocks, the big
 * dial, the weather, and the daylight, moon and place rows on a card that's light by day on a light device and dark
 * otherwise. The screen draws it outside <main> and hides the page from screen readers while it's open.
 */
export function SunPopup(p: SunPopupProps) {
  const titleId = useId()
  const card = useRef<HTMLElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  // The opening fades the backdrop and the card in, and springs the big dial from half size. A close during it runs
  // from wherever they are (popup follow-ups §3).
  const { still, closing, close } = usePopupClose(p.onClose, [
    { find: () => backdrop.current, properties: ['opacity'] },
    { find: () => card.current, properties: ['opacity'] },
    { find: () => card.current?.querySelector<HTMLElement>('.sun-dial.big'), properties: ['transform'] },
  ])
  // Focus on the close button, Tab kept inside, Escape to close, the page held still. The screen hands focus back to the dial.
  useModalDialog(card, closeButton, close)
  // Dragging the top of the card down: past 100 px it closes, otherwise it springs back.
  const drag = useDragToClose(close)

  // Worked out when the time or the place changes, not on every render: a drag re-renders the popup at each pointer
  // move, and the big dial works itself out again whenever `sun` or `detail` is a new object. The screen's facts only
  // change when it renders.
  const { city, tz, sun, visual } = p.facts
  const homeSun = useMemo(() => {
    const home = p.airports.get(p.homeAirport)
    const homeZone = p.airports.tz(p.homeAirport)
    return home && homeZone ? sunTimes(p.now, home.lat, home.lng, homeZone) : null
  }, [p.homeAirport, p.now, p.airports])
  const detail = useMemo(() => ({ homeTz: p.homeTz, homeSun, departure: p.departure, still }), [p.homeTz, homeSun, p.departure, still])
  const day = isDaytime(p.now, sun)

  return (
    <div class={closing ? 'sun-popup closing' : 'sun-popup'}>
      <div ref={backdrop} class="sun-popup-backdrop" onClick={close} />
      <section
        ref={card}
        class={`sun-popup-card glass${day ? '' : ' force-dark'}${drag.dragging ? ' dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={drag.offset ? { transform: `translateY(${drag.offset}px)` } : undefined}
      >
        {p.weather && !still && <WeatherBackdrop kind={weatherAnimation(p.weather.code, day)} night={!day} />}
        <div class="sun-popup-scroll">
          <div class="sun-popup-grab" {...drag.handlers}>
            <div class="sun-popup-handle" />
            <div class="sun-popup-head">
              <Icon name="MapPin" size={20} color="var(--red)" />
              <h2 id={titleId} class="sun-popup-city">
                {city}
              </h2>
              <button ref={closeButton} type="button" class="sun-popup-close" aria-label="Close" onClick={close}>
                <Icon name="XCircle" size={22} />
              </button>
            </div>
          </div>
          <div class="sun-popup-times">
            <p class="sun-popup-time">
              <Icon name={day ? 'Sun' : 'Moon'} size={15} color={day ? 'var(--orange)' : 'var(--indigo)'} />
              <span class="sr-only">Local time </span>
              {shortTimeText(p.now, tz, p.h24)}
            </p>
            <p class="sun-popup-time">
              <span class="sr-only">Time at home </span>
              {shortTimeText(p.now, p.homeTz, p.h24)}
              <Icon name="House" size={15} color="var(--green)" />
            </p>
          </div>
          <SunDial
            sun={sun}
            now={p.now}
            timeZone={tz}
            h24={p.h24}
            city={city}
            size={360}
            detail={detail}
          />
          {p.weather && visual && (
            <p class="sun-popup-weather-row">
              <Icon name={visual.icon} size={28} color={cssColor(visual.color)} />
              <span class="sun-popup-temp">{temperatureText(p.weather.temperature)}</span>
              <span class="sun-popup-words">{visual.words}</span>
            </p>
          )}
          <hr class="sun-popup-divider" />
          <div class="sun-popup-rows">
            <p class="sun-popup-row">
              <Icon name="Sun" size={17} color="var(--orange)" />
              <span class="sun-popup-strong">{daylightText(sun)}</span>
            </p>
            <p class="sun-popup-row sun-popup-sun-times">
              <span class="sun-popup-sunrise">
                <Icon name="SunHorizon" size={15} />
                <span class="sr-only">Sunrise </span>
                {shortTimeText(sun.sunrise, tz, p.h24)}
              </span>
              <span class="sun-popup-sunset">
                <Icon name="SunHorizon" size={15} />
                <span class="sr-only">Sunset </span>
                {shortTimeText(sun.sunset, tz, p.h24)}
              </span>
            </p>
            <p class="sun-popup-row sun-popup-moon">
              <MoonPhaseIcon t={p.now} />
              <span class="sun-popup-strong">{moonPhaseName(moonPhase(p.now))}</span>
            </p>
            <p class="sun-popup-row sun-popup-where">
              <Icon name="MapPinArea" size={17} color="var(--red)" />
              <span>In {city}</span>
            </p>
            {p.weather && <WeatherCredit class="sun-popup-credit" />}
          </div>
        </div>
      </section>
    </div>
  )
}
