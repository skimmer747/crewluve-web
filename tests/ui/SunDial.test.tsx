// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { SunDial } from '../../src/ui/SunDial'
import { arcPath, cornerFor, dialAngle, glowBands, labelAt, markerPath, pointAt, skyBackground, tickAt } from '../../src/ui/sunDialGeometry'
import { iconNameOf } from '../fixtures/ui'

afterEach(cleanup)

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
