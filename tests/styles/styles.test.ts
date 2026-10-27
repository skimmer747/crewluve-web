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
  // Slice 3B §4.8: the calendar's on-duty and off-duty bars, its codes, its grid lines, Current Event's capsule and the
  // hairline under the calendar.
  ['--duty', '#1A3373', '#4D73E6'],
  ['--rest', '#99BFEB', '#8CA6CC'],
  ['--rest-text', '#99BFEB', '#8CA6CC'],
  ['--grid-line', 'rgba(0,0,0,.15)', 'rgba(255,255,255,.4)'],
  ['--button-fill', 'rgba(118,118,128,.12)', 'rgba(118,118,128,.24)'],
  ['--separator', 'rgba(60,60,67,.29)', 'rgba(84,84,88,.6)'],
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
  // Slice 3B §4.8: the calendar's 9 px codes, 5.2:1 on white. Dark mode's light blue is already 8.4:1 on black.
  ['--rest-text', '#2A6FB8', '#8CA6CC'],
]

/** The nine colors white text sits on: the city pills' blends, the badges and the welcome screen's Connect button (spec §3.3). */
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

  it('changes only the system colors, the secondary text, the track, the glass and the calendar’s codes, never the background, the text or UPS', () => {
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

  it("draws the welcome screen's Connect button on the readable fill behind its white text", () => {
    expect(declarations(find(top, '.primary')!.body)).toContainEqual(['background', 'var(--fill-blue, var(--blue))'])
  })

  it("draws the welcome screen's notes in the primary text color: --text-2 is under 4.5:1 on white at their size (piece 5a §8)", () => {
    for (const selector of ['.signin-note']) expect(declarations(find(top, selector)!.body), selector).toContainEqual(['color', 'var(--text)'])
  })

  it("gives the glass and the welcome screen's fields a 1 px edge under Increase Contrast, after both rules so it wins", () => {
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

  it('draws the chevrons in the secondary color, springs the press back over 0.3 s, and hides the ring after a click', () => {
    expect(declarations(find(top, '.schedule-link')!.body)).toContainEqual(['color', 'var(--text-2)'])
    expect(declarations(find(top, '.view-schedule .chevron')!.body)).toEqual([['color', 'var(--text-2)']])
    expect(declarations(find(top, '.linked')!.body).find(([prop]) => prop === 'transition')?.[1]).toMatch(/^transform 0\.3s .*, opacity 0\.3s/)
    expect(declarations(find(top, '.schedule-link:focus:not(:focus-visible)::after')!.body)).toEqual([['box-shadow', 'none']])
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

  it('hides the code input with transparent parts, not with opacity, so iOS keeps its Paste menu (piece 5a §8)', () => {
    // iOS hides the caret, the selection handles and the Paste menu on an editable field it judges invisible by its
    // opacity (WebKit bug 195894). Paste is how a partner gets a code out of a message and into the boxes.
    const input = declarations(find(top, '.code-input')!.body)
    expect(input.map(([prop]) => prop)).not.toContain('opacity')
    expect(input).toEqual(expect.arrayContaining([['color', 'transparent'], ['caret-color', 'transparent']]))
  })

  it('keeps the code input’s text from showing over the boxes, in the browsers that override its color and in high-contrast mode', () => {
    // -webkit-text-fill-color is what wins where a browser's own rule sets color; forced-color-adjust keeps Windows'
    // high-contrast mode from painting the text over the boxes.
    const input = declarations(find(top, '.code-input')!.body)
    expect(input).toEqual(expect.arrayContaining([['-webkit-text-fill-color', 'transparent'], ['forced-color-adjust', 'none']]))
  })

  it('stops iOS flashing grey over the code input, which has a click handler, as it does for the linked cards', () => {
    expect(declarations(find(top, '.code-input')!.body)).toContainEqual(['-webkit-tap-highlight-color', 'transparent'])
  })

  it.each(['.code-input:-webkit-autofill', '.code-input:autofill'])('hides the code input itself while %s tints it, one rule each', (head) => {
    // A browser's own autofill rule is !important and outranks the page's !important, so the tint can't be made
    // transparent: the field hides itself with opacity while it is autofilled. Two rules, because one selector a
    // browser doesn't know voids the whole list it's in.
    expect(declarations(find(top, head)!.body)).toContainEqual(['opacity', '0 !important'])
  })

  it('rings the box that typing goes in next with an outline, not a box-shadow, so high-contrast mode keeps it', () => {
    // The input's own outline is off (the boxes are what is seen), so this is the one sign of keyboard focus.
    const next = declarations(find(top, '.code-input:focus + .code-boxes .code-box.next')!.body)
    expect(next.map(([prop]) => prop)).toContain('outline')
    expect(next.map(([prop]) => prop)).not.toContain('box-shadow')
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

  it('fills the window with the page: the bar on the page’s plain color, then the list in its own box, headings stuck at its top (slice 3B §3)', () => {
    // Fixed to the window's edges, so the window itself never scrolls; while it shows, the body gives up the 100vh that
    // Safari before 15.4 would make taller than the window.
    expect(rule('html.schedule-open body')).toEqual([['min-height', '0']])
    expect(rule('.schedule')).toEqual(expect.arrayContaining([
      ['position', 'fixed'], ['top', '0'], ['right', '0'], ['bottom', '0'], ['left', '0'], ['max-width', '480px'], ['margin', '0 auto'],
      ['padding', '0 16px'], ['display', 'flex'], ['flex-direction', 'column'],
    ]))
    // Nothing scrolls under the bar now, so it has no material, as iOS 26's bar over content that doesn't move.
    expect(rule('.schedule-bar')).toEqual(expect.arrayContaining([['flex', 'none'], ['height', '60px']]))
    expect(rule('.schedule-bar').map(([prop]) => prop)).not.toContain('background')
    expect(rule('.schedule-bar').map(([prop]) => prop)).not.toContain('position')
    // The box spans the column, so its scroll bar sits at the edge. It has no padding at the top, where a sticky heading
    // would stop short of its edge: the list inside keeps the app's 12 px, the bottom above the home indicator.
    expect(rule('.schedule-days')).toEqual([
      ['flex', '1'], ['min-height', '0'], ['overflow-x', 'hidden'], ['overflow-y', 'auto'], ['overscroll-behavior', 'contain'],
      ['margin', '0 -16px'], ['padding', '0 16px'],
    ])
    expect(rule('.schedule-list')).toEqual([['padding', '12px 0 calc(12px + env(safe-area-inset-bottom))']])
    // Its focus ring inside its edges, which the window would cut off.
    expect(rule('.schedule-days:focus-visible')).toEqual([['outline-offset', '-2px']])
    expect(rule('.day-heading')).toEqual(expect.arrayContaining([
      // The bar material's shade over the page's, solid, so a row sliding under the heading doesn't show through.
      ['position', 'sticky'], ['top', '0'], ['padding', '12px 0 2px'], ['background', 'linear-gradient(var(--bar-fill), var(--bar-fill)), var(--bg)'],
      ['font-size', '12px'], ['font-weight', '600'], ['text-transform', 'uppercase'],
    ]))
    expect(rule('.schedule-back')).toEqual([['width', '44px'], ['height', '44px'], ['-webkit-tap-highlight-color', 'transparent']])
    expect(rule('.schedule-title')).toEqual(expect.arrayContaining([['font-size', '17px'], ['font-weight', '600']]))
  })

  it('pills today’s heading in green and the stuck one in yellow, with black words', () => {
    expect(rule('.day-pill.today, .day-pill.stuck')).toEqual(expect.arrayContaining([['padding', '4px 8px'], ['border-radius', '6px'], ['color', '#000000']]))
    expect(rule('.day-pill.today')).toEqual([['background', 'var(--green)']])
    expect(rule('.day-pill.stuck')).toEqual([['background', 'var(--yellow)']])
  })

  it('lays a row out as TimelineRowView: 12 px apart, 10 by 12 px in, with a 14 px radius, and no grey flash when tapped', () => {
    expect(rule('.leg')).toEqual(expect.arrayContaining([['display', 'flex'], ['gap', '12px'], ['padding', '10px 12px'], ['border-radius', '14px']]))
    // A tap picks the row's day (slice 3B §5.3); Safari would grey the whole card, as it did the cards before 3A's fix.
    expect(rule('.leg')).toContainEqual(['-webkit-tap-highlight-color', 'transparent'])
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

  it('draws the rows and headings without a backdrop blur: they sit on the page’s plain color, and each blur costs Safari a layer', () => {
    expect(rule('.leg.glass')).toEqual([['-webkit-backdrop-filter', 'none'], ['backdrop-filter', 'none']])
    expect(rule('.day-heading').map(([prop]) => prop)).not.toContain('backdrop-filter')
  })

  it('turns the ring on a square a fifth wider than its row, which covers the row whatever its width', () => {
    expect(rule('.leg-ring-turn')).toEqual(expect.arrayContaining([['width', '120%'], ['padding-top', '120%'], ['transform', 'translate(-50%, -50%)']]))
  })

  it('writes the UP NEXT tag in capitals with CSS, and pins the right-hand column’s weights and colors', () => {
    expect(rule('.up-next')).toEqual(expect.arrayContaining([['padding', '3px 8px'], ['text-transform', 'uppercase']]))
    expect(rule('.leg-happening .leg-clock-value')).toEqual([['font-weight', '600'], ['color', 'var(--leg)']])
    expect(rule('.leg-next .leg-clock-label, .leg-next .leg-clock-value')).toEqual([['color', 'var(--cyan)']])
    expect(rule('.leg-next .leg-clock-value')).toEqual([['font-weight', '600']])
  })

  it('spaces the list as the app does, slides rows under the headings, and pulses once a second', () => {
    expect(rule('.day-legs')).toContainEqual(['gap', '6px'])
    expect(rule('.leg-text')).toContainEqual(['gap', '3px'])
    expect(rule('.schedule-empty')).toContainEqual(['padding', '32px'])
    expect(rule('.day-heading')).toContainEqual(['z-index', '1'])
    expect(rule('.leg-icon.pulsing .icon')).toEqual([['animation', 'leg-pulse 1s ease-in-out infinite']])
    expect(rule('.leg-gap-line')).toContainEqual(['background', 'repeating-linear-gradient(to bottom, var(--gap) 0 4px, transparent 4px 8px)'])
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

describe('calendar.css', () => {
  // Read when each test runs, so a missing file fails the tests below and not the whole file.
  const rule = (head: string) => declarations(find(rulesIn(css('calendar')), head)!.body)

  it('lays the calendar out as TripCalendarView: 16 px above and below, 8 px between its header, letters and weeks', () => {
    expect(rule('.calendar')).toEqual(expect.arrayContaining([['padding', '16px 0'], ['gap', '8px']]))
    expect(rule('.calendar-weekdays')).toEqual(expect.arrayContaining([['margin-bottom', '8px'], ['font-size', '11px'], ['font-weight', '500'], ['color', 'var(--text-2)']]))
    expect(rule('.calendar-space')).toEqual([['flex', '1']])
  })

  it('sets the month at 17 px semibold, Current Event in 12 px blue on the gray capsule, and blue arrows with 44 px to tap', () => {
    expect(rule('.calendar-title')).toEqual(expect.arrayContaining([['font-size', '17px'], ['font-weight', '600']]))
    expect(rule('.calendar-now')).toEqual(expect.arrayContaining([
      ['padding', '7px 12px'], ['border-radius', '999px'], ['background', 'var(--button-fill)'], ['color', 'var(--blue)'], ['font-size', '12px'],
    ]))
    // 44 px squares, with margins that keep the row at the capsule's height and the tap areas within the column's sides.
    expect(rule('.calendar-arrow')).toEqual(expect.arrayContaining([['width', '44px'], ['height', '44px'], ['margin', '-7px -16px'], ['color', 'var(--blue)']]))
    // At 320 px the › arrow's tap area reaches the capsule's right end; the capsule stays on top and takes those taps.
    expect(rule('.calendar-now')).toEqual(expect.arrayContaining([['position', 'relative'], ['z-index', '1']]))
  })

  it('makes each week 50 px: the numbers’ 28 px, the codes’ 12 px and the bars’ 10 px', () => {
    expect(rule('.calendar-week')).toEqual(expect.arrayContaining([['height', '50px'], ['grid-template-columns', 'repeat(7, 1fr)']]))
    expect(rule('.calendar-day')).toEqual(expect.arrayContaining([['height', '28px'], ['font-size', '12px']]))
    expect(rule('.calendar-code')).toEqual(expect.arrayContaining([['top', '30px'], ['font-size', '9px'], ['font-weight', '600'], ['color', 'var(--rest-text)']]))
    expect(rule('.calendar-bar')).toEqual(expect.arrayContaining([['top', '42px'], ['height', '6px']]))
  })

  it('rings today in blue and fills the selected day with it, both 26 px, and fades the months either side to 40%', () => {
    expect(rule('.calendar-day::before')).toEqual(expect.arrayContaining([['width', '26px'], ['height', '26px'], ['border-radius', '50%']]))
    expect(rule('.calendar-day.today')).toEqual([['font-weight', '700']])
    expect(rule('.calendar-day.today::before')).toEqual([['border', '1.5px solid var(--blue)']])
    expect(rule('.calendar-day.selected')).toEqual([['color', '#ffffff']])
    // The readable blue fill under Increase Contrast in dark mode, where the white number needs it, as every white text does.
    expect(rule('.calendar-day.selected::before')).toEqual([['border', '0'], ['background', 'var(--fill-blue, var(--blue))']])
    // The number sits over its circle.
    expect(rule('.calendar-num')).toEqual([['position', 'relative']])
    expect(rule('.calendar-day.other:not(.selected) .calendar-num')).toEqual([['opacity', '0.4']])
    // Only unselected: a greyed day that's selected keeps the white of `.selected`.
    expect(rule('.calendar-day.other:not(.selected)')).toEqual([['color', 'var(--text-2)']])
    const heads = rulesIn(css('calendar')).map((r) => r.head)
    expect(heads.indexOf('.calendar-day.selected::before')).toBeGreaterThan(heads.indexOf('.calendar-day.today::before'))
  })

  it('colors the bars by kind, rounds them 3 px where a trip starts or ends, and draws the time line in green', () => {
    expect([rule('.bar-duty'), rule('.bar-rest'), rule('.bar-reserve'), rule('.bar-training'), rule('.bar-jumpseat')]).toEqual([
      [['background', 'var(--duty)']], [['background', 'var(--rest)']], [['background', 'var(--pink)']], [['background', 'var(--purple)']],
      [['background', 'var(--green)']],
    ])
    expect(rule('.calendar-bar.round-start')).toEqual([['border-top-left-radius', '3px'], ['border-bottom-left-radius', '3px']])
    expect(rule('.calendar-bar.round-end')).toEqual([['border-top-right-radius', '3px'], ['border-bottom-right-radius', '3px']])
    expect(rule('.calendar-line')).toEqual(expect.arrayContaining([['width', '1.5px'], ['margin-left', '-0.75px'], ['background', 'var(--green)']]))
  })

  it('draws the grid lines 0.5 px in their gray, and the hairline under the calendar in iOS’s separator color', () => {
    expect(rule('.calendar-vline')).toEqual(expect.arrayContaining([['width', '0.5px'], ['background', 'var(--grid-line)']]))
    expect(rule('.calendar-week + .calendar-week .calendar-art::after')).toEqual(expect.arrayContaining([['height', '0.5px'], ['background', 'var(--grid-line)']]))
    expect(rule('.calendar-rule')).toEqual(expect.arrayContaining([['height', '0.5px'], ['background', 'var(--separator)']]))
    expect(rule('.calendar-art')).toContainEqual(['pointer-events', 'none'])
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
    expect(pairs).toBeGreaterThanOrEqual(2) // the page body (base.css) and the welcome screen (cards.css)
  })
})

describe('main.tsx', () => {
  it('imports every stylesheet in src/styles, so none can ship missing', () => {
    const main = readFileSync(new URL('../../src/main.tsx', import.meta.url), 'utf8')
    expect(STYLESHEETS.length).toBeGreaterThanOrEqual(4)
    for (const name of STYLESHEETS) expect(main, `${name}.css is not imported by src/main.tsx`).toContain(`import './styles/${name}.css'`)
  })
})

describe('split.css', () => {
  // Read when each test runs, so a missing file fails the tests below and not the whole file.
  const rule = (head: string) => declarations(find(rulesIn(css('split')), head)!.body)

  it('fills the window as the Schedule page does, the status 40% wide but never under 320 px, up to 1376 px (slice 3C §4.1)', () => {
    expect(rule('.split')).toEqual([
      ['position', 'fixed'], ['top', '0'], ['right', '0'], ['bottom', '0'], ['left', '0'], ['max-width', '1376px'], ['margin', '0 auto'],
      ['display', 'grid'], ['grid-template-columns', 'max(320px, 40%) minmax(0, 1fr)'], ['grid-template-rows', '60px minmax(0, 1fr)'],
    ])
  })

  it('centers the title in a 60 px bar across both columns, on the page’s plain color (§4.2)', () => {
    expect(rule('.split-bar')).toEqual([
      ['grid-column', '1 / -1'], ['display', 'flex'], ['align-items', 'center'], ['justify-content', 'center'], ['padding', '0 16px'],
    ])
    expect(rule('.split-bar .title')).toEqual([['margin', '0']])
    // The title keeps its 22 px bold, the app's iPad title, and no other rule here restyles it.
    expect(declarations(find(rulesIn(css('base')), '.title')!.body)).toEqual(expect.arrayContaining([['font-size', '22px'], ['font-weight', '700']]))
    expect(rulesIn(css('split')).map((r) => r.head)).toEqual([
      '.split', '.split-bar', '.split-bar .title', '.split-status', '.split-status > *', '.split-status:focus-visible', '.split-status .sun-dial',
      '.split-status .countdown-value .num', '.split-status .countdown-value .unit', '.split-schedule',
    ])
  })

  it('sizes by the status column what the phone’s page sizes by the window: the sun dial, and the countdown without container units (§4.3)', () => {
    // On a phone the column is the window: the dial is 42% of it, and the countdown 18% and 11.1% of the card's content,
    // the window less 80 px. Side by side, the column is max(320px, 40vw) wide; the dial overlapped the card's words.
    expect(declarations(find(rulesIn(css('location')), '.sun-dial')!.body)).toEqual(expect.arrayContaining([
      ['width', 'min(160px, 42vw)'], ['height', 'min(160px, 42vw)'],
    ]))
    expect(rule('.split-status .sun-dial')).toEqual([
      ['width', 'min(160px, calc(0.42 * max(320px, 40vw)))'], ['height', 'min(160px, calc(0.42 * max(320px, 40vw)))'],
    ])
    // The container-unit line still comes last, for the browsers that have them, as in cards.css.
    expect(rule('.split-status .countdown-value .num')).toEqual([
      ['font-size', 'min(52px, calc(0.18 * max(320px, 40vw) - 14.4px))'], ['font-size', 'min(52px, 18cqi)'],
    ])
    expect(rule('.split-status .countdown-value .unit')).toEqual([
      ['font-size', 'min(32px, calc(0.111 * max(320px, 40vw) - 8.88px))'], ['font-size', 'min(32px, 11.1cqi)'],
    ])
  })

  it('scrolls the status in a box of its own, spaced as the status page’s column, with its focus ring inside (§4.3)', () => {
    expect(rule('.split-status')).toEqual([
      ['min-height', '0'], ['overflow-x', 'hidden'], ['overflow-y', 'auto'], ['overscroll-behavior', 'contain'],
      ['padding', '12px 16px calc(16px + env(safe-area-inset-bottom))'], ['display', 'flex'], ['flex-direction', 'column'], ['gap', '24px'],
    ])
    expect(declarations(find(rulesIn(css('base')), '.screen')!.body)).toEqual(expect.arrayContaining([
      ['padding', '12px 16px calc(16px + env(safe-area-inset-bottom))'], ['gap', '24px'],
    ]))
    // The cards keep their heights: the in-flight card, which clips its map, shrank to fit the box in the browser.
    expect(rule('.split-status > *')).toEqual([['flex-shrink', '0']])
    expect(rule('.split-status:focus-visible')).toEqual([['outline-offset', '-2px']])
  })

  it('puts the schedule after a 0.5 px hairline in iOS’s separator color, with the Schedule page’s 16 px sides (§4.4, §4.5)', () => {
    expect(rule('.split-schedule')).toEqual([
      ['min-width', '0'], ['min-height', '0'], ['padding', '0 16px'], ['border-left', '0.5px solid var(--separator)'],
      ['display', 'flex'], ['flex-direction', 'column'],
    ])
  })
})
