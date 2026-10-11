// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DialDetail } from '../../src/ui/bigDial'
import { SunDial } from '../../src/ui/SunDial'
import { arcPath, cornerFor, departureMarkerPath, dialAngle, glowBands, labelAt, markerPath, pointAt, skyBackground, tickAt } from '../../src/ui/sunDialGeometry'
import { HOUR, MINUTE } from '../../src/time/zoned'
import { iconNameOf, stubAnimationFrames } from '../fixtures/ui'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const ANC = 'America/Anchorage'
// Round numbers for Anchorage on 10 October 2026: sunrise 8:12 AM, sunset 6:41 PM.
const sun = { sunrise: Date.UTC(2026, 9, 10, 16, 12), sunset: Date.UTC(2026, 9, 11, 2, 41) }
const MORNING = Date.UTC(2026, 9, 10, 17, 14) // 9:14 AM
const NIGHT = Date.UTC(2026, 9, 11, 6, 5) // 10:05 PM

const dial = (now: number, h24 = false) => <SunDial sun={sun} now={now} timeZone={ANC} h24={h24} city="Anchorage" />
const texts = (container: Element) => [...container.querySelectorAll('text')].map((t) => t.textContent)
const num = (el: Element | null, name: string) => Number(el!.getAttribute(name))

describe('SunDial', () => {
  it('is one image to screen readers, named with the sun times and whether it’s day', () => {
    const { container } = render(dial(MORNING))
    expect(screen.getByRole('img', { name: 'Sunrise 8:12\u202FAM, sunset 6:41\u202FPM, daytime in Anchorage' })).toBeTruthy()
    expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('labels noon, sunrise and sunset the way the app does', () => {
    const { container } = render(dial(MORNING))
    expect(texts(container)).toEqual(['Noon', '8:12a', '6:41p'])
    // "Noon" sits 14 points above the top of the circle.
    expect(num(container.querySelector('.sun-noon'), 'y')).toBe(26)
  })

  it('labels sunrise and sunset in 24-hour time for visitors who use it', () => {
    const { container } = render(dial(MORNING, true))
    expect(texts(container)).toEqual(['Noon', '08:12', '18:41'])
  })

  it('draws the daylight from sunrise to sunset and the night back round, with glow bands, ticks and markers', () => {
    const { container } = render(dial(MORNING))
    const rise = dialAngle(sun.sunrise, ANC)
    const set = dialAngle(sun.sunset, ANC)
    expect(container.querySelector('.sun-day')!.getAttribute('d')).toBe(arcPath(rise, set, 42))
    expect(container.querySelector('.sun-night')!.getAttribute('d')).toBe(arcPath(set, rise, 42))
    expect(container.querySelector('.sun-day')!.getAttribute('stroke')).toMatch(/^url\(#.+-day\)$/)
    expect(container.querySelectorAll('.sun-band.golden')).toHaveLength(2)
    expect(container.querySelectorAll('.sun-band.twilight')).toHaveLength(2)
    expect(container.querySelectorAll('.sun-tick')).toHaveLength(2)
    expect(container.querySelectorAll('.sun-marker')).toHaveLength(2)
  })

  it('points the hand at the time now, ending in a glowing sun by day', () => {
    const { container } = render(dial(MORNING))
    const tip = pointAt(dialAngle(MORNING, ANC), 42)
    const hand = container.querySelector('.sun-hand')
    expect(num(hand, 'x2')).toBeCloseTo(tip.x, 6)
    expect(num(hand, 'y2')).toBeCloseTo(tip.y, 6)
    const now = container.querySelector('.sun-now')!
    expect(iconNameOf(now.querySelector('svg'))).toBe('Sun')
    expect(now.querySelector('svg')!.getAttribute('width')).toBe('14')
    expect(now.getAttribute('filter')).toMatch(/^url\(#.+-glow\)$/)
  })

  it('ends the hand in the moon at night, with no glow', () => {
    const { container } = render(dial(NIGHT))
    const now = container.querySelector('.sun-now')!
    expect(iconNameOf(now.querySelector('svg'))).toBe('Moon')
    expect(now.querySelector('svg')!.getAttribute('width')).toBe('12')
    expect(now.getAttribute('filter')).toBeNull()
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Sunrise 8:12\u202FAM, sunset 6:41\u202FPM, nighttime in Anchorage')
  })
})

describe('SunDial: where everything goes', () => {
  const rise = dialAngle(sun.sunrise, ANC)
  const set = dialAngle(sun.sunset, ANC)
  const attrs = (el: Element | null, names: string[]) => names.map((name) => Number(el!.getAttribute(name)))

  it('fills the sky from sunrise to sunset', () => {
    const { container } = render(dial(MORNING))
    expect((container.querySelector('.sun-sky') as HTMLElement).style.background).toBe(skyBackground(rise, set))
  })

  it('puts each time label beside its own tick', () => {
    const { container } = render(dial(MORNING))
    const [riseLabel, setLabel] = [...container.querySelectorAll('.sun-time')]
    expect(attrs(riseLabel, ['x', 'y'])).toEqual([labelAt(rise).x, labelAt(rise).y])
    expect(attrs(setLabel, ['x', 'y'])).toEqual([labelAt(set).x, labelAt(set).y])
  })

  it('ticks sunrise and sunset, points the triangles at noon and midnight, and lays the bands on the circle', () => {
    const { container } = render(dial(MORNING))
    const ticks = [...container.querySelectorAll('.sun-tick')].map((tick) => attrs(tick, ['x1', 'y1', 'x2', 'y2']))
    expect(ticks).toEqual([rise, set].map((a) => [tickAt(a).from.x, tickAt(a).from.y, tickAt(a).to.x, tickAt(a).to.y]))
    expect([...container.querySelectorAll('.sun-marker')].map((m) => m.getAttribute('d'))).toEqual([markerPath(270), markerPath(90)])
    expect([...container.querySelectorAll('.sun-band')].map((b) => [b.getAttribute('class'), b.getAttribute('d')])).toEqual(
      glowBands(rise, set).map((band) => [`sun-band ${band.kind}`, arcPath(band.from, band.to, 42)]),
    )
  })

  it('runs the hand from the center, and centers the icon on its end in day or night colors', () => {
    const { container, rerender } = render(dial(MORNING))
    expect(attrs(container.querySelector('.sun-hand'), ['x1', 'y1'])).toEqual([80, 82])
    const corner = cornerFor(pointAt(dialAngle(MORNING, ANC), 42), 14)
    const now = container.querySelector('.sun-now')!
    expect(now.getAttribute('class')).toBe('sun-now day')
    expect(now.getAttribute('transform')).toBe(`translate(${corner.x} ${corner.y})`)
    rerender(dial(NIGHT))
    expect(container.querySelector('.sun-now')!.getAttribute('class')).toBe('sun-now night')
  })

  it('gives two dials on one page their own gradient and filter ids', () => {
    const { container } = render(
      <div>
        {dial(MORNING)}
        {dial(MORNING)}
      </div>,
    )
    const ids = [...container.querySelectorAll('linearGradient, filter')].map((el) => el.id)
    expect(ids).toHaveLength(6)
    expect(new Set(ids).size).toBe(6)
  })
})

describe('SunDial on the card', () => {
  it('is a button that opens the popup when the card gives it somewhere to go', () => {
    const onOpen = vi.fn()
    render(<SunDial sun={sun} now={MORNING} timeZone={ANC} h24={false} city="Anchorage" onOpen={onOpen} />)
    const button = screen.getByRole('button', { name: 'Sunrise 8:12\u202FAM, sunset 6:41\u202FPM, daytime in Anchorage. Opens sun details.' })
    // A real button, so Enter and Space press it as well as a tap or click.
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('type')).toBe('button')
    expect(button.getAttribute('aria-haspopup')).toBe('dialog')
    fireEvent.click(button)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('holds only phrasing content in the button, as HTML asks: the sky is a span', () => {
    render(<SunDial sun={sun} now={MORNING} timeZone={ANC} h24={false} city="Anchorage" onOpen={() => {}} />)
    const button = screen.getByRole('button')
    expect(button.querySelector('div')).toBeNull()
    expect(button.querySelector('span.sun-sky')).not.toBeNull()
  })

  it('draws none of the big dial’s layers', () => {
    const { container } = render(dial(MORNING))
    expect(container.querySelector('.sun-dial')!.getAttribute('class')).toBe('sun-dial')
    for (const layer of ['.sun-house', '.sun-home-line', '.sun-shared', '.sun-shared-wedge', '.sun-departure-marker', '.sun-plane', '.sun-arrow', '.sun-sweep', '.sun-middle']) {
      expect(container.querySelector(layer), layer).toBeNull()
    }
  })
})

describe('SunDial at 360', () => {
  const NY = 'America/New_York'
  // 10:05 PM in Anchorage is 2:05 AM in New York; New York's day runs 7:13 AM to 6:28 PM. The flight leaves at 3:25 AM.
  const homeSun = { sunrise: Date.UTC(2026, 9, 10, 11, 13), sunset: Date.UTC(2026, 9, 10, 22, 28) }
  const scheduled = NIGHT + 5 * HOUR + 20 * MINUTE
  const detail: DialDetail = { homeTz: NY, homeSun, departure: { scheduled, actual: scheduled }, still: false }
  const big = (d: DialDetail = detail) => <SunDial sun={sun} now={NIGHT} timeZone={ANC} h24={false} city="Anchorage" size={360} detail={d} />
  const middle = (container: Element) => [...container.querySelectorAll('.sun-middle text')].map((t) => t.textContent)

  it('is one image to screen readers, described with the time difference and the next departure', () => {
    const { container } = render(big())
    expect(
      screen.getByRole('img', {
        name: 'Sunrise 8:12\u202FAM, sunset 6:41\u202FPM, nighttime in Anchorage, 4 hours behind you. Next departure 3:25\u202FAM, in 5 hours, 20 minutes.',
      }),
    ).toBeTruthy()
    expect(container.querySelector('.sun-dial')!.getAttribute('class')).toBe('sun-dial big')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('draws home’s dashed line and house, the shared daylight, and the departure’s hand, triangle, plane and label', () => {
    const { container } = render(big())
    const homeTip = pointAt(dialAngle(NIGHT, NY), 42)
    const homeLine = container.querySelector('.sun-home-line')!
    expect([homeLine.getAttribute('x2'), homeLine.getAttribute('y2')]).toEqual([String(homeTip.x), String(homeTip.y)])
    expect(iconNameOf(container.querySelector('.sun-house svg'))).toBe('House')
    expect(container.querySelector('.sun-house svg')!.getAttribute('width')).toBe('10')
    expect(container.querySelectorAll('.sun-shared-wedge')).toHaveLength(1)
    expect(container.querySelectorAll('.sun-shared')).toHaveLength(1)
    expect(container.querySelector('.sun-hand.departure')).not.toBeNull()
    expect(container.querySelector('.sun-departure-marker')!.getAttribute('d')).toBe(departureMarkerPath(dialAngle(scheduled, ANC)))
    expect(iconNameOf(container.querySelector('.sun-plane.departure svg'))).toBe('Airplane')
    expect(container.querySelector('.sun-time.departure')!.textContent).toBe('3:25a')
    expect(container.querySelector('.sun-hand.delay')).toBeNull()
    expect(container.querySelector('.sun-plane.delay')).toBeNull()
  })

  it('adds the red hand, plane and label at the actual time for a delay', () => {
    const { container } = render(big({ ...detail, departure: { scheduled, actual: scheduled + 40 * MINUTE } }))
    expect(container.querySelector('.sun-hand.delay')).not.toBeNull()
    expect(iconNameOf(container.querySelector('.sun-plane.delay svg'))).toBe('Airplane')
    expect(container.querySelector('.sun-time.delay')!.textContent).toBe('4:05a')
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Next departure 4:05\u202FAM, 40 minutes late, in 6 hours.')
  })

  it('leaves out home’s layers on the same clock, and the departure’s when there is none', () => {
    const { container } = render(big({ ...detail, homeTz: ANC, departure: null }))
    for (const layer of ['.sun-house', '.sun-home-line', '.sun-shared', '.sun-shared-wedge', '.sun-hand.departure', '.sun-departure-marker', '.sun-plane']) {
      expect(container.querySelector(layer), layer).toBeNull()
    }
  })

  it('runs the loop: the home arrow and "-4h behind", then the departure sweep and "5h20m to go"', async () => {
    const frames = stubAnimationFrames()
    const { container } = render(big())
    await frames.frame(1000)
    expect(container.querySelector('.sun-arrow')).toBeNull()
    expect(middle(container)).toEqual([])
    await frames.frame(1400)
    expect(container.querySelector('.sun-arrow')!.getAttribute('class')).toBe('sun-arrow behind')
    expect(middle(container)).toEqual(['-4h', 'behind'])
    expect(Number(container.querySelector('.sun-middle')!.getAttribute('opacity'))).toBeCloseTo(0.6846, 4)
    expect(container.querySelector('.sun-sweep')).toBeNull()
    await frames.frame(1000 + 3100 + 400)
    expect(container.querySelector('.sun-arrow')).toBeNull()
    expect(container.querySelector('.sun-sweep-solid')).not.toBeNull()
    expect(container.querySelector('.sun-plane.rider')!.getAttribute('class')).toBe('sun-plane rider on-time')
    expect(middle(container)).toEqual(['5h20m', 'to go'])
  })

  it('holds still for reduced motion, with both arcs drawn and the countdown in the middle', () => {
    const frames = stubAnimationFrames()
    const { container } = render(big({ ...detail, still: true }))
    expect(frames.pending).toBe(0)
    expect(container.querySelector('.sun-arrow')!.getAttribute('opacity')).toBe('1')
    expect(container.querySelector('.sun-sweep-solid')).not.toBeNull()
    expect(middle(container)).toEqual(['5h20m', 'to go'])
  })

  it('draws a late sweep red past the scheduled time, with a red rider and countdown', () => {
    const { container } = render(big({ ...detail, departure: { scheduled, actual: scheduled + 40 * MINUTE }, still: true }))
    expect(container.querySelector('.sun-sweep-solid')).not.toBeNull()
    expect(container.querySelector('.sun-sweep-delay')).not.toBeNull()
    expect(container.querySelector('.sun-plane.rider')!.getAttribute('class')).toBe('sun-plane rider late')
    expect(container.querySelector('.sun-middle')!.getAttribute('class')).toBe('sun-middle late')
  })

  it('draws an early departure’s rider and countdown green, with no red sweep', () => {
    const { container } = render(big({ ...detail, departure: { scheduled, actual: scheduled - 20 * MINUTE }, still: true }))
    expect(container.querySelector('.sun-sweep-delay')).toBeNull()
    expect(container.querySelector('.sun-plane.rider')!.getAttribute('class')).toBe('sun-plane rider early')
    expect(container.querySelector('.sun-middle')!.getAttribute('class')).toBe('sun-middle early')
  })

  it('goes round dashed for each full day to a departure more than a day ahead', () => {
    const tomorrow = NIGHT + 27 * HOUR
    const { container } = render(big({ ...detail, departure: { scheduled: tomorrow, actual: tomorrow }, still: true }))
    expect(container.querySelector('.sun-sweep-laps')).not.toBeNull()
    expect(container.querySelector('.sun-sweep-solid')).not.toBeNull()
  })

  it('draws the arrow and the difference blue when the pilot is ahead of home', () => {
    // Anchorage is 2 hours ahead of Honolulu.
    const { container } = render(big({ ...detail, homeTz: 'Pacific/Honolulu', homeSun: null, departure: null, still: true }))
    expect(container.querySelector('.sun-arrow')!.getAttribute('class')).toBe('sun-arrow ahead')
    expect(container.querySelector('.sun-middle')!.getAttribute('class')).toBe('sun-middle ahead')
    expect(middle(container)).toEqual(['+2h', 'ahead'])
  })

  it('fades the arrow from 2 s into its turn, and the sweep, its rider and the countdown with theirs', async () => {
    const frames = stubAnimationFrames()
    const { container } = render(big())
    await frames.frame(1000)
    await frames.frame(1000 + 2300)
    expect(Number(container.querySelector('.sun-arrow')!.getAttribute('opacity'))).toBeCloseTo(0.3154, 4)
    await frames.frame(1000 + 3100 + 2300)
    expect(Number(container.querySelector('.sun-sweep')!.getAttribute('opacity'))).toBeCloseTo(0.3154, 4)
    expect(Number(container.querySelector('.sun-plane.rider')!.getAttribute('opacity'))).toBeCloseTo(0.3154, 4)
    expect(Number(container.querySelector('.sun-middle')!.getAttribute('opacity'))).toBeCloseTo(0.3154, 4)
  })

  it('works out everything that doesn’t move once per render, not on every animation frame', async () => {
    const frames = stubAnimationFrames()
    render(big())
    await frames.frame(1000)
    const formatToParts = vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts')
    // `format` is a getter on the prototype, though TypeScript's types call it a method, so any call reads the getter.
    const format = vi.spyOn(Intl.DateTimeFormat.prototype as unknown as { format: unknown }, 'format', 'get')
    await frames.frame(1400)
    await frames.frame(1000 + 3100 + 400)
    expect(formatToParts).not.toHaveBeenCalled()
    expect(format).not.toHaveBeenCalled()
  })

  it('asks for no frames when nothing moves', () => {
    const frames = stubAnimationFrames()
    render(big({ ...detail, homeTz: ANC, departure: null }))
    expect(frames.pending).toBe(0)
  })
})
