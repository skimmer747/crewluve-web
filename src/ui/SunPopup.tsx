import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks'
import { shortTimeText } from '../copy/format'
import { daylightText, moonPhaseName } from '../copy/sunDetail'
import { temperatureText, weatherAnimation } from '../copy/weather'
import type { AirportIndex } from '../data/airports'
import type { Weather } from '../data/weather'
import type { Departure } from '../engine/snapshot'
import { moonPhase } from '../time/moon'
import { isDaytime, sunTimes } from '../time/sun'
import { cssColor } from './colors'
import { Icon } from './Icon'
import { locationFacts } from './locationFacts'
import { MoonPhaseIcon } from './MoonPhaseIcon'
import { prefersReducedMotion } from './motion'
import { SunDial } from './SunDial'
import { WeatherBackdrop } from './WeatherBackdrop'

/** Closing fades everything out over 0.2 s, as the app's dismissView does, before the popup goes. */
export const CLOSE_MS = 200
/** A drag down further than this closes the popup; a shorter one springs back. */
export const DRAG_CLOSE_PX = 100

export interface SunPopupProps {
  /** Where the pilot is. */
  airport: string
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
  const [still] = useState(prefersReducedMotion)
  const [closing, setClosing] = useState(false)
  const closed = useRef(false)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragFrom = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const close = () => {
    if (closed.current) return
    closed.current = true
    if (still) return p.onClose()
    setClosing(true)
    timer.current = setTimeout(p.onClose, CLOSE_MS)
  }
  // The keyboard listener lives as long as the popup, so it reaches the newest close through a ref.
  const latestClose = useRef(close)
  latestClose.current = close

  useEffect(() => {
    // Focus moves to the close button, and the page behind doesn't scroll. The screen hands focus back to the dial.
    closeButton.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        latestClose.current()
      } else if (e.key === 'Tab' && card.current) {
        keepFocusInside(card.current, e)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      clearTimeout(timer.current)
      document.body.style.overflow = overflow
    }
  }, [])

  // Worked out when the time or the place changes, not on every render: a drag re-renders the popup at each pointer
  // move, and the big dial works itself out again whenever `sun` or `detail` is a new object.
  const { city, tz, sun, visual } = useMemo(() => locationFacts(p.airport, p.now, p.airports, p.weather), [p.airport, p.now, p.airports, p.weather])
  const homeSun = useMemo(() => {
    const home = p.airports.get(p.homeAirport)
    const homeZone = p.airports.tz(p.homeAirport)
    return home && homeZone ? sunTimes(p.now, home.lat, home.lng, homeZone) : null
  }, [p.homeAirport, p.now, p.airports])
  const detail = useMemo(() => ({ homeTz: p.homeTz, homeSun, departure: p.departure, still }), [p.homeTz, homeSun, p.departure, still])
  if (!tz || !sun) return null
  const day = isDaytime(p.now, sun)

  // Dragging the top of the card down: past 100 px it closes, otherwise it springs back.
  const onPointerDown = (e: PointerEvent) => {
    if (e.target instanceof Element && e.target.closest('button')) return
    dragFrom.current = e.clientY
    setDragging(true)
    const grab = e.currentTarget as Element
    if (grab.setPointerCapture) grab.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent) => {
    if (dragFrom.current != null) setDrag(Math.max(0, e.clientY - dragFrom.current))
  }
  const endDrag = (e: PointerEvent, release: boolean) => {
    if (dragFrom.current == null) return
    const moved = e.clientY - dragFrom.current
    dragFrom.current = null
    setDragging(false)
    if (release && moved > DRAG_CLOSE_PX) close()
    else setDrag(0)
  }

  return (
    <div class={closing ? 'sun-popup closing' : 'sun-popup'}>
      <div class="sun-popup-backdrop" onClick={close} />
      <section
        ref={card}
        class={`sun-popup-card glass${day ? '' : ' force-dark'}${dragging ? ' dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={drag ? { transform: `translateY(${drag}px)` } : undefined}
      >
        {p.weather && !still && <WeatherBackdrop kind={weatherAnimation(p.weather.code, day)} night={!day} />}
        <div class="sun-popup-scroll">
          <div
            class="sun-popup-grab"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => endDrag(e, true)}
            onPointerCancel={(e) => endDrag(e, false)}
          >
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
            {p.weather && (
              <p class="weather-credit sun-popup-credit">
                <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
                  Weather: Open-Meteo
                  <span class="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

/** Tab and Shift-Tab go round the popup's buttons and links instead of leaving it. */
function keepFocusInside(container: HTMLElement, e: KeyboardEvent) {
  const stops = [...container.querySelectorAll<HTMLElement>('button, a[href]')]
  if (stops.length === 0) return
  const first = stops[0]
  const last = stops[stops.length - 1]
  const active = document.activeElement
  const outside = !(active instanceof Node) || !container.contains(active)
  if (e.shiftKey ? outside || active === first : outside || active === last) {
    e.preventDefault()
    ;(e.shiftKey ? last : first).focus()
  }
}
