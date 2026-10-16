import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Partner links piece 1b: the page an invite link opens where the app can't take it (a computer, Android, or an
// iPhone without Crewluve). Piece 5 replaces it with joining in the browser.
const page = () => readFileSync(new URL('../public/join.html', import.meta.url), 'utf8')

describe('the /join page', () => {
  it('runs no scripts and loads nothing but its own images', () => {
    expect(page()).not.toMatch(/<script/i)
    expect(page()).toContain(
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" />`,
    )
  })

  it('stays out of search results and sends no referrer', () => {
    expect(page()).toContain('<meta name="robots" content="noindex" />')
    expect(page()).toContain('<meta name="referrer" content="no-referrer" />')
  })

  it('greets like the app and points to the App Store', () => {
    expect(page()).toContain('<h1>Welcome to CrewLuve</h1>')
    expect(page()).toContain('href="https://apps.apple.com/app/id6759344060"')
  })
})
