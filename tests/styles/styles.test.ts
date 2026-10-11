import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
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
]

describe('tokens.css', () => {
  const top = blocks(css('tokens'))
  const lightRoot = find(top, ':root')
  const darkMedia = find(top, '@media (prefers-color-scheme: dark)')
  const customProperties = (body = '') => new Map(declarations(body).filter(([prop]) => prop.startsWith('--')))
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

  it('never lets the dial, which overlaps the text, catch a tap', () => {
    expect(declarations(find(top, '.sun-dial')!.body)).toContainEqual(['pointer-events', 'none'])
  })

  it('places the sky circle where the dial’s geometry draws the circle', () => {
    const percent = (v: number) => `${(v / DIAL.size) * 100}%`
    const decls = declarations(find(top, '.sun-sky')!.body)
    expect(decls).toContainEqual(['left', percent(DIAL.cx - DIAL.radius)])
    expect(decls).toContainEqual(['top', percent(DIAL.cy - DIAL.radius)])
    expect(decls).toContainEqual(['width', percent(2 * DIAL.radius)])
    expect(decls).toContainEqual(['height', percent(2 * DIAL.radius)])
  })

  it('lifts the dial 6 px like the app’s offset, without shrinking the card', () => {
    const decls = declarations(find(top, '.sun-dial')!.body)
    expect(decls).toContainEqual(['top', '-6px'])
    expect(decls.find(([prop]) => prop === 'margin-top')).toBeUndefined()
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
