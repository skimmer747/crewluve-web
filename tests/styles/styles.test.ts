import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { delayBadge, LINE_TRIP_BADGE } from '../../src/copy/visuals'
import { DIAL } from '../../src/ui/sunDialGeometry'

// These read the stylesheets as text. They pin what the spec fixes (the §4.1 colors) and the lines that keep
// browsers with gaps working (fallbacks). They don't pin sizes and timings that Task 32 tunes by eye.

interface Block {
  /** The selector or at-rule prelude, whitespace collapsed. */
  head: string
  /** The raw text between the braces. */
  body: string
}

/** Every stylesheet in src/styles, by name without ".css", so a new file is checked without editing these tests. */
const STYLESHEETS = readdirSync(new URL('../../src/styles/', import.meta.url)).filter((f) => f.endsWith('.css')).map((f) => f.slice(0, -4))

/** A stylesheet's text, comments removed. */
const css = (name: string) => readFileSync(new URL(`../../src/styles/${name}.css`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** The brace blocks that sit directly in `text`. */
function blocks(text: string): Block[] {
  const found: Block[] = []
  let start = 0
  for (;;) {
    const open = text.indexOf('{', start)
    if (open < 0) return found
    let depth = 1
    let end = open + 1
    while (depth > 0 && end < text.length) {
      if (text[end] === '{') depth++
      else if (text[end] === '}') depth--
      end++
    }
    found.push({ head: text.slice(start, open).trim().replace(/\s+/g, ' '), body: text.slice(open + 1, end - 1) })
    start = end
  }
}

/** Every rule that holds declarations, looking inside @media and @supports. */
const rulesIn = (text: string): Block[] =>
  blocks(text).flatMap((b) => (/^@(media|supports)\b/.test(b.head) ? rulesIn(b.body) : b.head.startsWith('@') ? [] : [b]))

/** A rule's `property: value` pairs, in source order. */
const declarations = (body: string): Array<[string, string]> =>
  body
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d): [string, string] => {
      const colon = d.indexOf(':')
      return [d.slice(0, colon).trim(), d.slice(colon + 1).trim()]
    })

const find = (list: Block[], head: string) => list.find((b) => b.head === head)

/** A rule's custom properties, by name. */
const customProperties = (body = '') => new Map(declarations(body).filter(([prop]) => prop.startsWith('--')))

/** Colors compare by value: case, spaces, a leading 0 in decimals, and #abc against #aabbcc don't matter. */
function normalize(value = ''): string {
  const v = value.toLowerCase().replace(/\s+/g, '').replace(/(\D)0\./g, '$1.')
  return /^#[0-9a-f]{3}$/.test(v) ? '#' + [...v.slice(1)].map((c) => c + c).join('') : v
}

// Spec §4.1, written out as the spec has them: "Colors" (iOS 26 system values) and the page background under "Page and layout".
const SPEC_COLORS: Array<[name: string, light: string, dark: string]> = [
  ['--bg', '#FFFFFF', '#000000'],
  ['--text', '#000', '#FFF'],
  ['--text-2', 'rgba(60,60,67,.6)', 'rgba(235,235,245,.6)'],
  ['--green', '#34C759', '#30D158'],
  ['--blue', '#0088FF', '#0091FF'],
  ['--red', '#FF383C', '#FF4245'],
  ['--orange', '#FF8D28', '#FF9230'],
  ['--purple', '#CB30E0', '#DB34F2'],
  ['--gray', '#8E8E93', '#8E8E93'],
  ['--ups', '#663300', '#E09E33'],
  // Slice 2A spec §8: the iOS 26 system colors the city pills blend.
  ['--pink', '#FF2D55', '#FF375F'],
  ['--yellow', '#FFCC00', '#FFD600'],
  ['--teal', '#00C3D0', '#00D2E0'],
  ['--cyan', '#00C0E8', '#3CD3FE'],
  ['--indigo', '#6155F5', '#6D7CFF'],
  // Part A follow-ups spec §3.2: the trip card's progress track, the gray at 20% like the app's Color.gray.opacity(0.2).
  ['--bar-track', 'rgba(142,142,147,.2)', 'rgba(142,142,147,.2)'],
  // Slice 3A §4.1: the Schedule page's bars, as iOS's bar material looks over the page.
  ['--bar-fill', 'rgba(249,249,249,.94)', 'rgba(29,29,29,.94)'],
]

describe('tokens.css', () => {
  const top = blocks(css('tokens'))
  const lightRoot = find(top, ':root')
  const darkMedia = find(top, '@media (prefers-color-scheme: dark)')
  const light = customProperties(lightRoot?.body)
  const dark = customProperties(find(blocks(darkMedia?.body ?? ''), ':root')?.body)

  it('has a light :root and a dark override under prefers-color-scheme: dark', () => {
    expect(lightRoot).toBeDefined()
    expect(darkMedia).toBeDefined()
    expect(dark.size).toBeGreaterThan(0)
  })

  it.each(SPEC_COLORS)('%s is the spec value in light mode', (name, lightSpec) => {
    expect(normalize(light.get(name))).toBe(normalize(lightSpec))
  })

  it.each(SPEC_COLORS)('%s is the spec value in dark mode', (name, lightSpec, darkSpec) => {
    // A value that differs from light mode has to be set in the dark block; one that is the same may be inherited.
    if (normalize(lightSpec) !== normalize(darkSpec)) expect(dark.has(name), `${name} must be set under prefers-color-scheme: dark`).toBe(true)
    expect(normalize(dark.get(name) ?? light.get(name))).toBe(normalize(darkSpec))
  })
})

describe('tokens.css: the sun popup’s night colors', () => {
  const top = blocks(css('tokens'))
  const dark = customProperties(find(blocks(find(top, '@media (prefers-color-scheme: dark)')?.body ?? ''), ':root')?.body)
  const forced = find(top, '.force-dark')

  it('are the page’s dark colors exactly, every one of them', () => {
    expect(forced).toBeDefined()
    expect(customProperties(forced!.body)).toEqual(dark)
  })

  it('tell the browser the card is dark, for its own controls and scroll bars', () => {
    expect(declarations(forced!.body)).toContainEqual(['color-scheme', 'dark'])
  })
})

// Part A follow-ups spec §3.2: Apple's high-contrast values (iOS 26) under Increase Contrast, light and dark. Secondary
// text keeps its color at 68% (173 of 255, as UIKit's), and the progress track is the high-contrast gray at 20%.
const HIGH_CONTRAST: Array<[name: string, light: string, dark: string]> = [
  ['--text-2', 'rgba(60,60,67,.678)', 'rgba(235,235,245,.678)'],
  ['--red', '#E9152D', '#FF6165'],
  ['--orange', '#C55300', '#FFA056'],
  ['--yellow', '#A16A00', '#FEDF43'],
  ['--green', '#008932', '#4AD968'],
  ['--teal', '#008198', '#3BDDEC'],
  ['--cyan', '#007EAE', '#6DD9FF'],
  ['--blue', '#1E6EF4', '#5CB8FF'],
  ['--indigo', '#564ADE', '#A7AAFF'],
  ['--purple', '#B02FC2', '#EA8DFF'],
  ['--pink', '#E7124D', '#FF8AC4'],
  ['--gray', '#6C6C70', '#AEAEB2'],
  ['--bar-track', 'rgba(108,108,112,.2)', 'rgba(174,174,178,.2)'],
]

/** The nine colors white text sits on: the city pills' blends, the badges and the sign-in button (spec §3.3). */
const FILLS = ['green', 'blue', 'orange', 'purple', 'pink', 'yellow', 'teal', 'cyan', 'indigo']

describe('tokens.css: Increase Contrast', () => {
  const top = blocks(css('tokens'))
  const lightMedia = find(top, '@media (prefers-contrast: more)')
  const darkMedia = find(top, '@media (prefers-color-scheme: dark) and (prefers-contrast: more)')
  const light = customProperties(find(blocks(lightMedia?.body ?? ''), ':root')?.body)
  const dark = customProperties(find(blocks(darkMedia?.body ?? ''), ':root')?.body)
  const forced = customProperties(find(blocks(lightMedia?.body ?? ''), '.force-dark')?.body)
  const lightDefault = customProperties(find(top, ':root')?.body)
  const darkDefault = customProperties(find(blocks(find(top, '@media (prefers-color-scheme: dark)')?.body ?? ''), ':root')?.body)

  it('comes after the default colors, light set first, so the dark set wins on a dark device', () => {
    expect(lightMedia).toBeDefined()
    expect(darkMedia).toBeDefined()
    expect(top.indexOf(lightMedia!)).toBeGreaterThan(top.indexOf(find(top, '@media (prefers-color-scheme: dark)')!))
    expect(top.indexOf(lightMedia!)).toBeGreaterThan(top.indexOf(find(top, '.force-dark')!))
    expect(top.indexOf(darkMedia!)).toBeGreaterThan(top.indexOf(lightMedia!))
  })

  it.each(HIGH_CONTRAST)('%s is Apple’s high-contrast value in light mode', (name, lightSpec) => {
    expect(normalize(light.get(name))).toBe(normalize(lightSpec))
  })

  it.each(HIGH_CONTRAST)('%s is Apple’s high-contrast value in dark mode', (name, _lightSpec, darkSpec) => {
    expect(normalize(dark.get(name))).toBe(normalize(darkSpec))
  })

  it('sets in the dark set everything the light set sets, so none of the light set reaches a dark device', () => {
    expect(light.size).toBeGreaterThan(0)
    expect([...light.keys()].filter((name) => !dark.has(name))).toEqual([])
  })

  it('gives the popup at night the dark set exactly, every one of them', () => {
    expect(forced.size).toBeGreaterThan(0)
    expect(forced).toEqual(dark)
  })

  it('keeps white text on the light high-contrast colors in dark mode, and only there', () => {
    for (const color of FILLS) expect(normalize(dark.get(`--fill-${color}`)), `--fill-${color}`).toBe(normalize(light.get(`--${color}`)))
    expect([...dark.keys()].filter((name) => name.startsWith('--fill-'))).toHaveLength(FILLS.length)
    for (const set of [lightDefault, darkDefault, light]) expect([...set.keys()].filter((name) => name.startsWith('--fill-'))).toEqual([])
  })

  it('changes only the system colors, the secondary text, the track and the glass, never the background, the text or UPS', () => {
    const changed = [...HIGH_CONTRAST.map(([name]) => name), '--glass-fill', '--glass-edge'].sort()
    expect([...light.keys()].sort()).toEqual(changed)
    expect([...dark.keys()].sort()).toEqual([...changed, ...FILLS.map((color) => `--fill-${color}`)].sort())
  })

  it('has a fill for every color a badge can take, so no badge loses its readable background', () => {
    for (const badge of [LINE_TRIP_BADGE, delayBadge(40), delayBadge(-20)]) expect(FILLS, badge.label).toContain(badge.color)
  })

  it('defines the fills in no other stylesheet', () => {
    const elsewhere = STYLESHEETS.filter((name) => name !== 'tokens').flatMap((name) =>
      rulesIn(css(name))
        .filter((r) => declarations(r.body).some(([prop]) => prop.startsWith('--fill-')))
        .map((r) => `${name}.css ${r.head}`),
    )
    expect(elsewhere).toEqual([])
  })

  it('makes the glass more solid, with a stronger edge of the same color', () => {
    const rgba = (value = '') => /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(value)?.slice(1).map(Number) ?? []
    for (const [hc, base] of [[light, lightDefault], [dark, darkDefault]]) {
      for (const name of ['--glass-fill', '--glass-edge']) {
        const [r, g, b, a] = rgba(hc.get(name))
        const [r0, g0, b0, a0] = rgba(base.get(name))
        expect([r, g, b], name).toEqual([r0, g0, b0])
        expect(a, name).toBeGreaterThan(a0)
      }
    }
  })
})

describe('base.css', () => {
  it('shows no focus ring on the headings that take focus from code, which nothing presses (popup follow-ups §4.2)', () => {
    expect(declarations(find(blocks(css('base')), "h1[tabindex='-1']:focus, h2[tabindex='-1']:focus")!.body)).toContainEqual(['outline', 'none'])
  })
})

describe('cards.css', () => {
  const top = blocks(css('cards'))

  it('rolls countdown digits in, with tabular figures so their width holds still', () => {
    const digits = find(top, '.digits')
    expect(digits).toBeDefined()
    const decls = declarations(digits!.body)
    expect(decls).toContainEqual(['font-variant-numeric', 'tabular-nums'])
    expect(decls.find(([prop]) => prop === 'animation')?.[1]).toMatch(/^roll-in\b/)
    expect(find(top, '@keyframes roll-in')).toBeDefined()
  })

  it('turns the roll-in off for people who prefer reduced motion', () => {
    const media = find(top, '@media (prefers-reduced-motion: reduce)')
    expect(media).toBeDefined()
    const digits = find(blocks(media!.body), '.digits')
    expect(digits).toBeDefined()
    expect(declarations(digits!.body)).toContainEqual(['animation', 'none'])
  })

  it('puts a plain font-size before each container-unit font-size in the same rule, for browsers without cqi', () => {
    const CONTAINER_UNIT = /\dcq(?:w|h|i|b|min|max)\b/
    const sized = STYLESHEETS.flatMap((name) => rulesIn(css(name))).filter((r) => declarations(r.body).some(([prop, value]) => prop === 'font-size' && CONTAINER_UNIT.test(value)))
    expect(sized.map((r) => r.head)).toEqual(expect.arrayContaining(['.countdown-value .num', '.countdown-value .unit']))
    for (const r of sized) {
      const sizes = declarations(r.body)
        .filter(([prop]) => prop === 'font-size')
        .map(([, value]) => value)
      const first = sizes.findIndex((value) => CONTAINER_UNIT.test(value))
      expect(first, `${r.head} needs a plain font-size before its container-unit one`).toBeGreaterThan(0)
      expect(CONTAINER_UNIT.test(sizes[first - 1]), `${r.head}: the font-size just before the container-unit one must be plain`).toBe(false)
    }
  })

  it('draws the sign-in button on the readable fill behind its white text', () => {
    expect(declarations(find(top, '.primary')!.body)).toContainEqual(['background', 'var(--fill-blue, var(--blue))'])
  })

  it('gives the glass and the sign-in fields a 1 px edge under Increase Contrast, after both rules so it wins', () => {
    const media = find(top, '@media (prefers-contrast: more)')
    expect(media).toBeDefined()
    const edge = find(blocks(media!.body), '.glass, .field')
    expect(edge).toBeDefined()
    expect(declarations(edge!.body)).toEqual([['border-width', '1px']])
    expect(top.indexOf(media!)).toBeGreaterThan(Math.max(top.indexOf(find(top, '.glass')!), top.indexOf(find(top, '.field')!)))
  })

  it('lets a linked card’s chevron link cover the whole card, and presses the card in to 97% and 85% (slice 3A §3.1)', () => {
    expect(declarations(find(top, '.linked')!.body)).toContainEqual(['position', 'relative'])
    expect(declarations(find(top, '.linked.pressed')!.body)).toEqual([['transform', 'scale(0.97)'], ['opacity', '0.85']])
    expect(declarations(find(top, '.schedule-link::after')!.body)).toEqual(
      expect.arrayContaining([['content', "''"], ['position', 'absolute'], ['inset', '0']]),
    )
  })

  it('lets touches through the link’s cover, so the trip card’s route still scrolls, and keeps taps from flashing grey', () => {
    expect(declarations(find(top, '.schedule-link::after')!.body)).toContainEqual(['pointer-events', 'none'])
    expect(declarations(find(top, '.linked')!.body)).toEqual(expect.arrayContaining([['cursor', 'pointer'], ['-webkit-tap-highlight-color', 'transparent']]))
    expect(declarations(find(top, '.view-schedule')!.body)).toContainEqual(['-webkit-tap-highlight-color', 'transparent'])
  })

  it('rings the whole card while its link has keyboard focus, and only fades a pressed card for reduced motion', () => {
    expect(declarations(find(top, '.schedule-link:focus::after')!.body)).toContainEqual(['box-shadow', '0 0 0 2px var(--blue)'])
    const media = find(top, '@media (prefers-reduced-motion: reduce)')!
    expect(declarations(find(blocks(media.body), '.linked.pressed')!.body)).toEqual([['transform', 'none']])
  })

  it('lays the View Schedule button out as the app does: 16 px in, the words at 20 px semibold filling the row (slice 3A §3.2)', () => {
    expect(declarations(find(top, '.view-schedule')!.body)).toEqual(expect.arrayContaining([['display', 'flex'], ['gap', '8px'], ['padding', '16px']]))
    expect(declarations(find(top, '.view-schedule-text')!.body)).toEqual(
      expect.arrayContaining([['flex', '1'], ['font-size', '20px'], ['font-weight', '600']]),
    )
  })
})

describe('trips.css', () => {
  const top = blocks(css('trips'))
  const background = (head: string) => declarations(find(top, head)?.body ?? '').find(([prop]) => prop === 'background')?.[1]

  it('draws the progress track in --bar-track, so it can follow the high-contrast gray', () => {
    expect(background('.trip-bar')).toBe('var(--bar-track)')
  })

  it.each([
    ['.blend-0', 'blue', 'cyan'],
    ['.blend-1', 'purple', 'pink'],
    ['.blend-2', 'orange', 'yellow'],
    ['.blend-3', 'teal', 'green'],
    ['.blend-4', 'indigo', 'purple'],
  ])('%s blends %s into %s, through the readable fills behind white text', (head, from, to) => {
    expect(background(head)).toBe(`linear-gradient(to right, var(--fill-${from}, var(--${from})), var(--fill-${to}, var(--${to})))`)
  })
})

describe('inFlight.css', () => {
  const top = blocks(css('inFlight'))
  const dark = find(top, '@media (prefers-color-scheme: dark)')
  const light = customProperties(find(top, '.flight-map')?.body)
  const darkMap = customProperties(find(blocks(dark?.body ?? ''), '.flight-map')?.body)
  const rule = (head: string) => declarations(find(top, head)!.body)

  // Slice 2C §4.3 and §4.5: FlightRouteMapView's fixed colors, as RGB fractions.
  it.each([
    ['--map-day-1', 'rgb(85%,92%,98%)', 'rgb(12%,18%,30%)'],
    ['--map-day-2', 'rgb(75%,85%,95%)', 'rgb(10%,15%,26%)'],
    ['--map-night-1', 'rgb(70%,80%,92%)', 'rgb(4%,8%,16%)'],
    ['--map-night-2', 'rgb(65%,75%,88%)', 'rgb(2%,5%,12%)'],
    ['--map-text', '#000000', '#ffffff'],
    ['--map-text-2', 'rgb(40%,40%,45%)', 'var(--gray)'],
  ])('%s is the app’s color, light and dark', (name, lightValue, darkValue) => {
    expect(normalize(light.get(name))).toBe(normalize(lightValue))
    expect(normalize(darkMap.get(name))).toBe(normalize(darkValue))
  })

  it('draws the route in the theme’s blue, or cyan at 80% in dark mode, so Increase Contrast reaches it', () => {
    expect([light.get('--map-route'), light.get('--map-route-middle'), light.get('--map-route-edge')]).toEqual(['var(--blue)', '1', '0.75'])
    expect([darkMap.get('--map-route'), darkMap.get('--map-route-middle'), darkMap.get('--map-route-edge')]).toEqual(['var(--cyan)', '0.8', '0.6'])
  })

  it('ties every stop class the map draws to its color, and draws the lines unfilled, inside a 200 px positioned box', () => {
    for (const time of ['day', 'night']) {
      for (const n of [1, 2]) expect(rule(`.flight-sky-${time}-${n}`)).toContainEqual(['stop-color', `var(--map-${time}-${n})`])
    }
    for (const part of ['edge', 'middle']) {
      expect(rule(`.flight-route-${part}`)).toEqual(expect.arrayContaining([['stop-color', 'var(--map-route)'], ['stop-opacity', `var(--map-route-${part})`]]))
    }
    expect(rule('.flight-route, .flight-route-glow, .flight-arrow, .flight-arrow-glow')).toEqual(expect.arrayContaining([['fill', 'none'], ['stroke-width', '3']]))
    const box = top.filter((b) => b.head === '.flight-map').flatMap((b) => declarations(b.body))
    expect(box).toEqual(expect.arrayContaining([['position', 'relative'], ['height', '200px'], ['overflow', 'hidden']]))
    expect(rule('.flight-airport')).toEqual(expect.arrayContaining([['position', 'absolute'], ['transform', 'translate(-50%, -50%)']]))
    expect(top.filter((b) => b.head === '.inflight-bar').flatMap((b) => declarations(b.body))).toContainEqual(['background', 'var(--info-bar-fill)'])
  })

  it('glows the route through its own fade at half strength, with no stroke color over the line’s gradient', () => {
    const glow = declarations(find(top, '.flight-route-glow')!.body)
    expect(glow).toContainEqual(['stroke-opacity', '0.5'])
    expect(glow.map(([prop]) => prop)).not.toContain('stroke')
  })

  it('lays the plane’s drawing exactly over the map’s, so the plane sits over the airports', () => {
    expect(declarations(find(top, '.flight-map-art, .flight-map-plane')!.body)).toEqual(
      expect.arrayContaining([['position', 'absolute'], ['top', '0'], ['left', '0']]),
    )
  })

  it('puts the banner’s white text on the readable fills', () => {
    expect(declarations(find(top, '.inflight-banner.late')!.body)).toContainEqual(['background', 'var(--fill-orange, var(--orange))'])
    expect(declarations(find(top, '.inflight-banner.early')!.body)).toContainEqual(['background', 'var(--fill-green, var(--green))'])
    expect(declarations(find(top, '.inflight-banner')!.body)).toContainEqual(['color', '#ffffff'])
  })

  // Slice 2C §5.2: the info bar's fixed colors, light and dark.
  it.each([
    ['--info-bar-text', 'rgb(10%,15%,25%)', '#ffffff'],
    ['--info-bar-text-2', 'rgb(30%,38%,50%)', 'var(--gray)'],
    ['--info-bar-underline', 'rgba(10%,15%,25%,.3)', 'rgba(255,255,255,.3)'],
    ['--info-bar-fill', 'rgba(65%,78%,90%,.6)', 'rgba(8%,12%,25%,.6)'],
  ])('%s is the info bar’s color, light and dark', (name, lightValue, darkValue) => {
    expect(normalize(customProperties(find(top, '.inflight-bar')?.body).get(name))).toBe(normalize(lightValue))
    expect(normalize(customProperties(find(blocks(dark?.body ?? ''), '.inflight-bar')?.body).get(name))).toBe(normalize(darkValue))
  })

  it('turns the info bar’s location arrow to point up and to the right, as the app’s does', () => {
    expect(declarations(find(top, '.inflight-time > .icon')!.body)).toContainEqual(['transform', 'scaleX(-1)'])
  })

  it('sets every light color before the dark block, so the dark ones win in dark mode', () => {
    const darkAt = top.indexOf(dark!)
    for (const head of ['.flight-map', '.inflight-bar']) {
      const colored = top.filter((b) => b.head === head && declarations(b.body).some(([prop]) => prop.startsWith('--')))
      expect(colored.length, head).toBeGreaterThan(0)
      for (const rule of colored) expect(top.indexOf(rule), head).toBeLessThan(darkAt)
    }
  })

  // Slice 2C §4.5, §4.7, §4.8 and §5.2: which of the fixed text colors each part takes.
  it.each([
    ['.flight-airport-code', 'color', 'var(--map-text)'],
    ['.flight-airport-city', 'color', 'var(--map-text-2)'],
    ['.flight-airport-time', 'color', 'var(--map-text)'],
    ['.flight-distance', 'color', 'var(--map-text)'],
    ['.flight-plane-icon', 'fill', 'var(--map-text)'],
    ['.flight-map-fallback', 'color', 'var(--map-text-2)'],
    ['.flight-map-fallback', 'background', 'linear-gradient(var(--map-day-1), var(--map-day-2))'],
    ['.inflight-number', 'color', 'var(--info-bar-text)'],
    ['.inflight-number', 'text-decoration-color', 'var(--info-bar-underline)'],
    ['.inflight-status', 'color', 'var(--info-bar-text-2)'],
    ['.inflight-time', 'color', 'var(--info-bar-text)'],
    ['.inflight-code', 'color', 'var(--info-bar-text-2)'],
  ])('%s takes its %s from %s', (head, prop, value) => {
    expect(rule(head)).toContainEqual([prop, value])
  })

  it('draws the arrow in the route’s color glowing at 80%, the sun or moon glowing at 80%, and the plane’s blue halo and glow', () => {
    expect(rule('.flight-arrow, .flight-arrow-glow')).toContainEqual(['stroke', 'var(--map-route)'])
    expect(rule('.flight-arrow-glow')).toContainEqual(['stroke-opacity', '0.8'])
    expect(rule('.flight-airport-icon > .icon:first-child')).toEqual(expect.arrayContaining([['filter', 'blur(2px)'], ['opacity', '0.8']]))
    expect(rule('.flight-airport-icon.day')).toContainEqual(['color', 'var(--yellow)'])
    expect(rule('.flight-airport-icon.night')).toContainEqual(['color', 'var(--blue)'])
    expect(rule('.flight-plane-halo')).toEqual(expect.arrayContaining([['fill', 'var(--blue)'], ['fill-opacity', '0.3']]))
    expect(rule('.flight-plane-glow')).toEqual(expect.arrayContaining([['fill', 'var(--blue)'], ['fill-opacity', '0.8']]))
  })

  it('tints each tracking link in its own color at 12%: FlightRadar24 blue, FlightAware orange', () => {
    expect(rule('.tracking-link::before')).toEqual(expect.arrayContaining([['background', 'currentColor'], ['opacity', '0.12']]))
    expect(rule('.tracking-link.radar')).toContainEqual(['color', 'var(--blue)'])
    expect(rule('.tracking-link.aware')).toContainEqual(['color', 'var(--orange)'])
  })

  it('dims the page behind the popup with black at 30% over a blur, and closes in 0.2 s, ease-out, back to half size', () => {
    expect(rule('.tracking-backdrop')).toEqual(
      expect.arrayContaining([['background', 'rgba(0, 0, 0, 0.3)'], ['-webkit-backdrop-filter', 'blur(20px)'], ['backdrop-filter', 'blur(20px)']]),
    )
    expect(rule('.tracking-popup.closing .tracking-backdrop')).toEqual(expect.arrayContaining([['opacity', '0'], ['transition', 'opacity 0.2s ease-out']]))
    expect(rule('.tracking-popup.closing .tracking-card')).toEqual(
      expect.arrayContaining([['opacity', '0'], ['transform', 'scale(0.5)'], ['transition', 'opacity 0.2s ease-out, transform 0.2s ease-out']]),
    )
  })

  it('centers the duration and distance on the map whatever its width', () => {
    expect(rule('.flight-distance')).toEqual(expect.arrayContaining([['left', '50%'], ['transform', 'translate(-50%, -50%)']]))
  })

  it('gives the popup’s 22 px ✕ a bigger area to tap without moving it, as the sun popup’s', () => {
    expect(rule('.tracking-close')).toEqual(expect.arrayContaining([['display', 'flex'], ['margin', '-6px'], ['padding', '6px']]))
  })

  it('lets the tracking card scroll on a short or zoomed screen, so its links stay in reach', () => {
    expect(rule('.tracking-card')).toEqual(expect.arrayContaining([['max-height', '100%'], ['overflow-y', 'auto']]))
  })

  it('keeps the tracking popup’s opening off once closing starts, so a close mid-opening runs from where it was', () => {
    expect(rule('.tracking-popup.closing .tracking-backdrop')).toContainEqual(['animation', 'none'])
    expect(rule('.tracking-popup.closing .tracking-card')).toContainEqual(['animation', 'none'])
  })

  it('springs the tracking popup open on the sun popup’s keyframes at 0.42 s, and stills it for reduced motion', () => {
    const animations = rulesIn(css('inFlight')).filter((r) => r.head === '.tracking-card').flatMap((r) => declarations(r.body)).filter(([prop]) => prop === 'animation')
    expect(animations).toContainEqual(['animation', 'sun-popup-fade 0.42s linear, sun-popup-zoom 0.42s linear'])
    expect(css('sunPopup')).toMatch(/@keyframes sun-popup-fade/)
    expect(css('sunPopup')).toMatch(/@keyframes sun-popup-zoom/)
    const still = find(top, '@media (prefers-reduced-motion: reduce)')
    expect(declarations(find(blocks(still?.body ?? ''), '.tracking-backdrop, .tracking-card')!.body)).toContainEqual(['animation', 'none'])
  })
})

describe('location.css', () => {
  const top = blocks(css('location'))

  it('rolls each new hour of the time difference in, with steady digits', () => {
    expect(declarations(find(top, '.time-diff .roll')!.body).find(([prop]) => prop === 'animation')?.[1]).toMatch(/^roll-in\b/)
    expect(declarations(find(top, '.time-diff-num')!.body)).toContainEqual(['font-variant-numeric', 'tabular-nums'])
    expect(declarations(find(top, '.time-value')!.body)).toContainEqual(['font-variant-numeric', 'tabular-nums'])
  })

  it('turns the roll and the minutes’ fade off for people who prefer reduced motion', () => {
    const media = find(top, '@media (prefers-reduced-motion: reduce)')
    expect(media).toBeDefined()
    const inside = blocks(media!.body)
    expect(declarations(find(inside, '.time-diff .roll')!.body)).toContainEqual(['animation', 'none'])
    expect(declarations(find(inside, '.time-diff-minutes')!.body)).toContainEqual(['transition', 'none'])
  })

  it('sizes only the dial’s own drawing, not the sun or moon icon nested inside it', () => {
    expect(find(top, '.sun-dial > svg')).toBeDefined()
    expect(find(top, '.sun-dial svg')).toBeUndefined()
  })

  it('colors the difference blue ahead and orange behind, indented 24 px like the app', () => {
    expect(declarations(find(top, '.time-diff.ahead .time-diff-num')!.body)).toContainEqual(['color', 'var(--blue)'])
    expect(declarations(find(top, '.time-diff.behind .time-diff-num')!.body)).toContainEqual(['color', 'var(--orange)'])
    expect(declarations(find(top, '.time-diff')!.body)).toContainEqual(['margin', '0 0 0 24px'])
  })

  it('lets the dial take a tap now that it opens the sun popup, with no button look', () => {
    expect(declarations(find(top, '.sun-dial')!.body).find(([prop]) => prop === 'pointer-events')).toBeUndefined()
    const button = declarations(find(top, 'button.sun-dial')!.body)
    expect(button).toContainEqual(['background', 'none'])
    expect(button).toContainEqual(['border', '0'])
    expect(button).toContainEqual(['padding', '0'])
  })

  it('places the sky circle where the dial’s geometry draws the circle', () => {
    const percent = (v: number) => `${(v / DIAL.size) * 100}%`
    const decls = declarations(find(top, '.sun-sky')!.body)
    expect(decls).toContainEqual(['left', percent(DIAL.cx - DIAL.radius)])
    expect(decls).toContainEqual(['top', percent(DIAL.cy - DIAL.radius)])
    expect(decls).toContainEqual(['width', percent(2 * DIAL.radius)])
    expect(decls).toContainEqual(['height', percent(2 * DIAL.radius)])
  })

  it('sizes the dial’s labels in its 160-point drawing, so they grow to 18 px and 20.25 px at the popup’s 360', () => {
    const fontSize = (head: string) => parseFloat(declarations(find(top, head)!.body).find(([prop]) => prop === 'font-size')![1])
    expect(fontSize('.sun-noon') * (360 / DIAL.size)).toBe(18)
    expect(fontSize('.sun-time') * (360 / DIAL.size)).toBe(20.25)
  })

  it('lifts the dial 6 px like the app’s offset, without shrinking the card', () => {
    const decls = declarations(find(top, '.sun-dial')!.body)
    expect(decls).toContainEqual(['top', '-6px'])
    expect(decls.find(([prop]) => prop === 'margin-top')).toBeUndefined()
  })
})

describe('sunPopup.css', () => {
  const top = blocks(css('sunPopup'))
  const rule = (head: string) => declarations(find(rulesIn(css('sunPopup')), head)!.body)

  it('makes the card up to 360 px wide with a 28 px corner radius, leaving 8 px of screen around it', () => {
    expect(rule('.sun-popup-card')).toEqual(expect.arrayContaining([['width', 'min(360px, 100%)'], ['border-radius', '28px']]))
    expect(rule('.sun-popup').find(([prop]) => prop === 'padding')?.[1]).toMatch(/^max\(8px, env\(safe-area-inset-top\)\)/)
  })

  it('keeps the big dial square at the card’s full width, without aspect-ratio, which Safari 14 lacks', () => {
    expect(rule('.sun-dial.big')).toEqual(expect.arrayContaining([['width', '100%'], ['height', '0'], ['padding-bottom', '100%']]))
  })

  it('dims the page with black at 30%', () => {
    expect(rule('.sun-popup-backdrop')).toContainEqual(['background', 'rgba(0, 0, 0, 0.3)'])
  })

  it('turns off the zoom, the fades and the spring back for people who prefer reduced motion', () => {
    const media = find(top, '@media (prefers-reduced-motion: reduce)')
    expect(media).toBeDefined()
    const inside = blocks(media!.body)
    expect(declarations(find(inside, '.sun-popup-backdrop, .sun-popup-card, .sun-popup .sun-dial.big')!.body)).toContainEqual(['animation', 'none'])
    const still = find(inside, '.sun-popup-card, .sun-popup.closing .sun-popup-backdrop, .sun-popup.closing .sun-popup-card, .sun-popup.closing .sun-dial.big')
    expect(declarations(still!.body)).toContainEqual(['transition', 'none'])
  })

  it('lets a drag start on the handle and the header without the browser scrolling instead', () => {
    expect(rule('.sun-popup-grab')).toContainEqual(['touch-action', 'none'])
  })

  it('grows the dial from half size without fading it on its own, so it fades once, with the card', () => {
    expect(find(top, '@keyframes sun-popup-zoom')!.body).not.toMatch(/opacity/)
    expect(rule('.sun-popup.closing .sun-dial.big').find(([prop]) => prop === 'opacity')).toBeUndefined()
  })

  it('closes in 0.2 s, ease-out', () => {
    expect(rule('.sun-popup.closing .sun-popup-backdrop, .sun-popup.closing .sun-popup-card')).toContainEqual(['transition', 'opacity 0.2s ease-out'])
  })

  it('keeps the opening off once closing starts, so a close mid-opening runs from where it was', () => {
    expect(rule('.sun-popup.closing .sun-popup-backdrop, .sun-popup.closing .sun-popup-card')).toContainEqual(['animation', 'none'])
    expect(rule('.sun-popup.closing .sun-dial.big')).toContainEqual(['animation', 'none'])
  })
})

describe('bigDial.css', () => {
  const rule = (head: string) => declarations(find(rulesIn(css('bigDial')), head)!.body)

  it('sizes the middle’s text in the dial’s 160-point drawing: 10 and 7 points, 22.5 px and 15.75 px at 360', () => {
    const fontSize = (head: string) => parseFloat(rule(head).find(([prop]) => prop === 'font-size')![1])
    expect(fontSize('.sun-middle-big') * (360 / DIAL.size)).toBe(22.5)
    expect(fontSize('.sun-middle-small') * (360 / DIAL.size)).toBe(15.75)
  })

  it('dashes the departure’s laps like the night arc, and draws the delay in red', () => {
    expect(rule('.sun-sweep-laps')).toContainEqual(['stroke-dasharray', '4 3'])
    expect(rule('.sun-sweep-delay')).toContainEqual(['stroke', 'var(--red)'])
  })
})

describe('schedule.css', () => {
  // Read when each test runs, so a missing file fails the tests below and not the whole file.
  const rule = (head: string) => declarations(find(rulesIn(css('schedule')), head)!.body)

  it('keeps the bar at the top and each day’s heading stuck just under it, both over iOS’s bar material', () => {
    expect(rule('.schedule-bar')).toEqual(expect.arrayContaining([['position', 'sticky'], ['top', '0'], ['height', '60px'], ['background', 'var(--bar-fill)']]))
    expect(rule('.day-heading')).toEqual(expect.arrayContaining([
      ['position', 'sticky'], ['top', '60px'], ['padding', '12px 0 2px'], ['background', 'var(--bar-fill)'],
      ['font-size', '12px'], ['font-weight', '600'], ['text-transform', 'uppercase'],
    ]))
    expect(rule('.schedule-back')).toEqual([['width', '44px'], ['height', '44px']])
    // The list's own 12 px is the space at the bottom, as the app's, above the home indicator's.
    expect(rule('.schedule')).toContainEqual(['padding', '0 16px env(safe-area-inset-bottom)'])
    expect(rule('.schedule-title')).toEqual(expect.arrayContaining([['font-size', '17px'], ['font-weight', '600']]))
  })

  it('pills today’s heading in green and the stuck one in yellow, with black words', () => {
    expect(rule('.day-pill.today, .day-pill.stuck')).toEqual(expect.arrayContaining([['padding', '4px 8px'], ['border-radius', '6px'], ['color', '#000000']]))
    expect(rule('.day-pill.today')).toEqual([['background', 'var(--green)']])
    expect(rule('.day-pill.stuck')).toEqual([['background', 'var(--yellow)']])
  })

  it('lays a row out as TimelineRowView: 12 px apart, 10 by 12 px in, with a 14 px radius', () => {
    expect(rule('.leg')).toEqual(expect.arrayContaining([['display', 'flex'], ['gap', '12px'], ['padding', '10px 12px'], ['border-radius', '14px']]))
  })

  it('tints the 36 px icon circle with the leg’s color at 20%', () => {
    expect(rule('.leg-icon')).toEqual(expect.arrayContaining([['width', '36px'], ['height', '36px'], ['color', 'var(--leg)']]))
    expect(rule('.leg-icon::before')).toEqual(expect.arrayContaining([['background', 'currentColor'], ['opacity', '0.2']]))
  })

  it('sizes the title, the times and the right-hand column as the app does', () => {
    expect(rule('.leg-title')).toEqual(expect.arrayContaining([['font-size', '15px'], ['font-weight', '600']]))
    expect(rule('.leg-times')).toEqual(expect.arrayContaining([['font-size', '12px'], ['color', 'var(--text-2)']]))
    expect(rule('.leg-clock')).toContainEqual(['min-width', '56px'])
    expect(rule('.leg-clock-label')).toContainEqual(['font-size', '9px'])
    expect(rule('.leg-clock-value')).toEqual(expect.arrayContaining([['font-size', '11px'], ['font-variant-numeric', 'tabular-nums']]))
  })

  it('edges the happening leg in its color at 50%, and a leg ending at home in green', () => {
    expect(rule('.leg-happening::after, .leg-home::after')).toEqual(expect.arrayContaining([['border', '2px solid var(--leg)'], ['opacity', '0.5']]))
    expect(rule('.leg-home::after, .leg-happening.homeward::after')).toEqual([['border-color', 'var(--green)']])
  })

  it('turns the next leg’s cyan and blue ring once every 4 s, and holds it still in cyan at 60% for reduced motion', () => {
    expect(rule('.leg-ring-turn')).toEqual(expect.arrayContaining([
      ['background', 'conic-gradient(var(--cyan), var(--blue), var(--cyan), var(--blue), var(--cyan))'],
      ['animation', 'leg-turn 4s linear infinite'],
    ]))
    const reduced = rulesIn(find(blocks(css('schedule')), '@media (prefers-reduced-motion: reduce)')!.body)
    expect(declarations(find(reduced, '.leg-ring')!.body)).toEqual([['opacity', '0.6']])
    expect(declarations(find(reduced, '.leg-ring-turn')!.body)).toEqual(expect.arrayContaining([['animation', 'none'], ['background', 'var(--cyan)']]))
    expect(declarations(find(reduced, '.leg-icon.pulsing .icon')!.body)).toEqual([['animation', 'none']])
  })

  it('masks the ring to its 2 px band, with the -webkit- names first for Safari 14', () => {
    const ring = rule('.leg-ring')
    const names = ring.map(([prop]) => prop)
    expect(names.indexOf('-webkit-mask')).toBeLessThan(names.indexOf('mask'))
    expect(ring).toEqual(expect.arrayContaining([['padding', '2px'], ['-webkit-mask-composite', 'xor'], ['mask-composite', 'exclude']]))
  })

  it('puts the red UP NEXT tag 6 px from the top and 8 px from the right', () => {
    expect(rule('.up-next')).toEqual(expect.arrayContaining([
      ['position', 'absolute'], ['top', '6px'], ['right', '8px'], ['background', 'var(--red)'], ['font-size', '11px'], ['font-weight', '700'],
    ]))
  })

  it('lines a gap up under the icons’ centers, its line at 40% of the label’s color', () => {
    expect(rule('.leg-gap')).toContainEqual(['padding', '0 12px 0 30px'])
    expect(rule('.leg-gap-line')).toEqual(expect.arrayContaining([['width', '1px'], ['height', '20px'], ['opacity', '0.4']]))
    expect([rule('.leg-gap-home'), rule('.leg-gap-turn'), rule('.leg-gap-layover'), rule('.leg-gap-gap')]).toEqual([
      [['--gap', 'var(--green)']], [['--gap', 'var(--orange)']], [['--gap', 'var(--blue)']], [['--gap', 'var(--text-2)']],
    ])
  })
})

describe('backdrop blurs', () => {
  it('come with the -webkit- name first, which Safari needs before version 18', () => {
    let blurs = 0
    for (const name of STYLESHEETS) {
      for (const r of rulesIn(css(name))) {
        const props = declarations(r.body).map(([prop]) => prop)
        props.forEach((prop, i) => {
          if (prop === 'backdrop-filter') {
            expect(props[i - 1], `${name}.css ${r.head}: backdrop-filter needs -webkit-backdrop-filter just before it`).toBe('-webkit-backdrop-filter')
            blurs++
          }
        })
      }
    }
    expect(blurs).toBeGreaterThanOrEqual(2) // the cards' glass and the sun popup's backdrop
  })
})

describe('full-height blocks', () => {
  it('follow each min-height: 100vh with min-height: 100dvh, so the iOS toolbar does not push content off screen', () => {
    let pairs = 0
    for (const name of STYLESHEETS) {
      for (const r of rulesIn(css(name))) {
        const lines = declarations(r.body).map(([prop, value]) => `${prop}: ${value}`)
        lines.forEach((line, i) => {
          if (line === 'min-height: 100vh') {
            expect(lines[i + 1], `${name}.css ${r.head}: 100vh needs a 100dvh line after it`).toBe('min-height: 100dvh')
            pairs++
          }
          if (line === 'min-height: 100dvh') expect(lines[i - 1], `${name}.css ${r.head}: 100dvh needs the 100vh fallback line before it`).toBe('min-height: 100vh')
        })
      }
    }
    expect(pairs).toBeGreaterThanOrEqual(2) // the page body (base.css) and the sign-in screen (cards.css)
  })
})

describe('main.tsx', () => {
  it('imports every stylesheet in src/styles, so none can ship missing', () => {
    const main = readFileSync(new URL('../../src/main.tsx', import.meta.url), 'utf8')
    expect(STYLESHEETS.length).toBeGreaterThanOrEqual(4)
    for (const name of STYLESHEETS) expect(main, `${name}.css is not imported by src/main.tsx`).toContain(`import './styles/${name}.css'`)
  })
})
