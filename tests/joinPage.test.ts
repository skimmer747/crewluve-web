import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Partner links piece 1b: the page an invite link opens where the app can't take it (a computer, Android, or an
// iPhone without Crewluve). Piece 5 replaces it with joining in the browser.
const page = () => readFileSync(new URL('../public/join.html', import.meta.url), 'utf8')
const siteTokens = () => readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')

/** The text of the first rule block that starts with `header`, matched brace for brace. */
function block(css: string, header: string): string {
  const start = css.indexOf(header)
  if (start < 0) return ''
  let depth = 0
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1)
  }
  return ''
}
const token = (css: string, name: string) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim()

describe('the /join page', () => {
  it('runs no scripts and loads nothing but its own images', () => {
    expect(page()).not.toMatch(/<script/i)
    expect(page()).toContain(
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" />`,
    )
  })

  it('sets its CSP before anything that loads or styles', () => {
    const html = page()
    const at = html.indexOf('http-equiv="Content-Security-Policy"')
    expect(at).toBeGreaterThan(-1)
    expect(at).toBeLessThan(html.search(/<(link|style|img)\b/i))
  })

  it('stays out of search results and sends no referrer', () => {
    expect(page()).toContain('<meta name="robots" content="noindex" />')
    expect(page()).toContain('<meta name="referrer" content="no-referrer" />')
  })

  it('gives Messages a preview card for invite links: title, line and the heart', () => {
    expect(page()).toContain('<meta property="og:title" content="CrewLuve" />')
    expect(page()).toContain('<meta property="og:description" content="Stay connected with your pilot" />')
    // Link previews need an absolute address for the image.
    expect(page()).toContain('<meta property="og:image" content="https://crewluve.crewlu.net/icons/heart-256.png" />')
  })

  it('greets like the app and points to the App Store', () => {
    expect(page()).toContain('<h1>Welcome to CrewLuve</h1>')
    expect(page()).toContain('href="https://apps.apple.com/app/id6759344060"')
  })

  // The page loads no stylesheet, so it copies the site's tokens; this keeps the copies in step, Increase Contrast included.
  it.each([
    [':root {', ['bg', 'text', 'text-2', 'blue']],
    ['@media (prefers-color-scheme: dark) {', ['bg', 'text', 'text-2', 'blue']],
    ['@media (prefers-contrast: more) {', ['text-2', 'blue']],
    ['@media (prefers-color-scheme: dark) and (prefers-contrast: more) {', ['text-2', 'blue', 'fill-blue']],
  ])('uses the site\'s colors under %s', (header, names) => {
    const ours = block(page(), header)
    const site = block(siteTokens(), header)
    for (const name of names) expect(token(ours, name), `--${name}`).toBe(token(site, name))
    expect(token(ours, 'card'), '--card is the site\'s --glass-fill').toBe(token(site, 'glass-fill'))
  })

  it('keeps the color blocks in the site\'s order, so dark Increase Contrast wins over plain Increase Contrast', () => {
    const html = page()
    const at = [
      ':root {',
      '@media (prefers-color-scheme: dark) {',
      '@media (prefers-contrast: more) {',
      '@media (prefers-color-scheme: dark) and (prefers-contrast: more) {',
    ].map((header) => html.indexOf(header))
    expect(at.every((i) => i > -1)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })

  it('fills the button the way the site does, so it stays readable under Increase Contrast', () => {
    expect(block(page(), '.store {')).toContain('background: var(--fill-blue, var(--blue));')
  })
})
