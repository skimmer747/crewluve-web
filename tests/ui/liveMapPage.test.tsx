// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { flightStatus } from '../../src/copy/tripMap'
import { currentLeg } from '../../src/map/tripMap'
import { resetAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { TripMapCard } from '../../src/ui/TripMapCard'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { atTheGate, FLYING, LANDED_EARLY, liveTripMap } from '../map/liveTrip'
import { fix, MINUTE, START } from '../map/madeUpFlights'

afterEach(() => {
  cleanup()
  resetAppleMapKit()
  localStorage.clear()
})

const NY = 'America/New_York'
const IN_THE_AIR = START + 59 * MINUTE

function card(t: number, live = FLYING) {
  const map = liveTripMap(t, live)
  render(<TripMapCard map={map} now={t} viewerTz={NY} h24={false} name="Alex" day={1} days={1} delayMinutes={null} land={null} onOpenMap={() => {}} />)
  return map
}

describe("the map card with a real plane (Stage 3 spec §9)", () => {
  it("says how the plane is doing on its bar, and lands about the real plane's time", () => {
    const map = card(IN_THE_AIR)
    const status = document.querySelector('.inflight-status')?.textContent
    expect(status).toBe(flightStatus(currentLeg(map)!, IN_THE_AIR))
    expect(status).toMatch(/ (ahead|behind)$|^On schedule$/)
    expect(document.querySelector('.inflight-time')?.textContent).toMatch(/^Lands about \d{1,2}:\d\d\s[AP]M$/)
  })

  it('says it all to a screen reader in one sentence', () => {
    card(IN_THE_AIR)
    expect(screen.getByRole('button', { name: /^UPS1234 to Philadelphia, .* schedule\. Lands about .* your time\. Opens the full map\.$/ })).toBeTruthy()
  })

  it('says "In flight", as before, with no live data', () => {
    card(IN_THE_AIR, null as never)
    expect(document.querySelector('.inflight-status')?.textContent).toBe('In flight')
    expect(document.querySelector('.inflight-time')?.textContent).toMatch(/^Lands \d/)
  })
})

describe('the full map with a real plane (Stage 3 spec §7.3, §9)', () => {
  const page = (t: number, live = FLYING) =>
    <TripMapPage map={liveTripMap(t, live)} now={t} viewerTz={NY} h24={false} day={1} days={1} land={null} onBack={() => {}} />

  it('puts the label on the pill now, and "In flight" in the replay, which shows the real plane alone', () => {
    render(page(IN_THE_AIR))
    const pill = () => document.querySelector('.trip-map-pill')?.textContent
    expect(pill()).toBe(`UPS1234 · ${flightStatus(currentLeg(liveTripMap(IN_THE_AIR))!, IN_THE_AIR)}`)
    expect(document.querySelector('.trip-map-ghost')).not.toBeNull()
    const slider = screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement
    fireEvent.input(slider, { target: { value: String(Number(slider.max) / 4) } })
    expect(pill()).toBe('UPS1234 · In flight')
    expect(document.querySelector('.trip-map-real-plane')).not.toBeNull()
    expect(document.querySelector('.trip-map-ghost')).toBeNull()
  })

  it("keeps the replay's moment when a new landing estimate changes the trip's times", () => {
    const view = render(page(IN_THE_AIR))
    const slider = () => screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement
    fireEvent.input(slider(), { target: { value: String(Number(slider().max) / 4) } })
    const moment = slider().getAttribute('aria-valuetext')
    // A new fix, further along: the landing estimate, and so the trip's end, moves.
    const later = { ...FLYING, fix: fix(61, 39.7, -79.2, { trackDeg: 75 }) }
    view.rerender(page(START + 62 * MINUTE, later))
    expect(liveTripMap(START + 62 * MINUTE, later).span.end).not.toBe(liveTripMap(IN_THE_AIR).span.end)
    expect(slider().getAttribute('aria-valuetext')).toBe(moment)
    expect(document.querySelector('.trip-map-pill')?.textContent).toBe('UPS1234 · In flight')
  })

  it("keeps a replay at the trip's end at its end when a later estimate makes the trip longer", () => {
    const view = render(page(IN_THE_AIR))
    const slider = () => screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement
    fireEvent.input(slider(), { target: { value: slider().max } })
    // Seen again where it was at 1:53: it has slowed, and lands later.
    const slower = { ...FLYING, fix: fix(61, 39.6, -80.3, { trackDeg: 75 }) }
    expect(liveTripMap(START + 62 * MINUTE, slower).span.end).toBeGreaterThan(liveTripMap(IN_THE_AIR).span.end)
    view.rerender(page(START + 62 * MINUTE, slower))
    expect(slider().value).toBe(slider().max)
  })
})

describe('a real plane still on the ground at its departure airport (the website’s own, Todd, 16 Nov 2026)', () => {
  /** Ten minutes after the plan's takeoff, the plane still at its gate in Louisville. */
  const LATE = START + 25 * MINUTE
  const page = (t: number, live: Parameters<typeof liveTripMap>[1]) =>
    <TripMapPage map={liveTripMap(t, live)} now={t} viewerTz={NY} h24={false} day={1} days={1} land={null} onBack={() => {}} />
  const line = () => document.querySelector('.trip-timeline-time')?.textContent
  const slider = () => screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement

  it('heads the card "On the ground" for screen readers, not "In flight"', () => {
    card(LATE, atTheGate(25))
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('On the ground')
  })

  it('heads the card "In flight" in the air, and with no live data, as before', () => {
    card(IN_THE_AIR)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('In flight')
    cleanup()
    card(LATE, null as never)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('In flight')
  })

  it('says under the full map’s timeline that it’s on the ground there, now', () => {
    render(page(LATE, atTheGate(25)))
    expect(line()).toMatch(/^Fri 7:25\sAM · On the ground in Louisville$/)
    expect(slider().getAttribute('aria-valuetext')).toMatch(/^Friday 7:25\sAM, on the ground in Louisville$/)
  })

  it('says "Flying to", as before, while an on-time plane is still before the plan’s takeoff time', () => {
    // A minute after its leg begins, 14 before the plan's takeoff.
    render(page(START + MINUTE, atTheGate(1)))
    expect(line()).toMatch(/ · Flying to Philadelphia$/)
    expect(slider().getAttribute('aria-valuetext')).toMatch(/, flying to Philadelphia$/)
  })

  it('says "Flying to" in a replay, which reads where the map has the plane', () => {
    render(page(LATE, atTheGate(25)))
    // A moment early in the flight, before the plane was seen at its gate.
    fireEvent.input(slider(), { target: { value: String(Number(slider().max) / 20) } })
    expect(line()).toMatch(/ · Flying to Philadelphia$/)
    expect(slider().getAttribute('aria-valuetext')).toMatch(/, flying to Philadelphia$/)
  })

  it('says "Flying to" in the air, and with no live data, as before', () => {
    render(page(IN_THE_AIR, FLYING))
    expect(line()).toMatch(/ · Flying to Philadelphia$/)
    cleanup()
    render(page(LATE, null))
    expect(line()).toMatch(/ · Flying to Philadelphia$/)
  })
})

describe('a real plane down, not yet at the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026)', () => {
  /** Three minutes after it landed, 13 minutes early, and four before it reaches the gate. */
  const DOWN = START + 103 * MINUTE
  const page = (t: number, live: Parameters<typeof liveTripMap>[1]) =>
    <TripMapPage map={liveTripMap(t, live)} now={t} viewerTz={NY} h24={false} day={1} days={1} land={null} onBack={() => {}} />
  const line = () => document.querySelector('.trip-timeline-time')?.textContent
  const slider = () => screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement

  it('heads the card "Landed" for screen readers, not "In flight"', () => {
    card(DOWN, LANDED_EARLY)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Landed')
  })

  it('says on the card’s bar when it reaches the gate, with its label and the time there under it as before (Todd, 17 Nov 2026)', () => {
    // In Los Angeles, the gate at 8:47 AM in Philadelphia is 5:47 AM.
    render(<TripMapCard map={liveTripMap(DOWN, LANDED_EARLY)} now={DOWN} viewerTz="America/Los_Angeles" h24={false} name="Alex" day={1} days={1}
      delayMinutes={null} land={null} onOpenMap={() => {}} />)
    expect(document.querySelector('.inflight-status')?.textContent).toBe('Landed 13 min early')
    expect(document.querySelector('.inflight-time')?.textContent).toMatch(/^At the gate 5:47\sAM$/)
    expect(document.querySelector('.inflight-code')?.textContent).toMatch(/^8:47\sAM in Philadelphia$/)
  })

  it('says under the full map’s timeline that it has landed there, now', () => {
    render(page(DOWN, LANDED_EARLY))
    expect(line()).toMatch(/^Fri 8:43\sAM · Landed in Philadelphia$/)
    expect(slider().getAttribute('aria-valuetext')).toMatch(/^Friday 8:43\sAM, landed in Philadelphia$/)
  })

  it('says "Flying to" in a replay, which reads where the map has the plane, and with no live data, as before', () => {
    render(page(DOWN, LANDED_EARLY))
    fireEvent.input(slider(), { target: { value: String(Number(slider().max) / 2) } })
    expect(line()).toMatch(/ · Flying to Philadelphia$/)
    cleanup()
    render(page(DOWN, null))
    expect(line()).toMatch(/^Fri 8:43\sAM · Flying to Philadelphia$/)
  })
})
