import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Partner links piece 5a §4.1: /join is the app itself, a copy of the built index.html (vite.config.ts,
// crewluve-join-page). So index.html carries what the static page had: no search results, no referrer, and the preview
// card Messages shows for an invite link. And Safari's banner for Crewluve, the only place alerts come (P5-7).
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

describe('the /join page', () => {
  it('is no longer a page of its own', () => {
    expect(existsSync(new URL('../public/join.html', import.meta.url))).toBe(false)
  })

  it('stays out of search results and sends no referrer', () => {
    expect(html).toContain('<meta name="robots" content="noindex" />')
    expect(html).toContain('<meta name="referrer" content="no-referrer" />')
  })

  it('gives Messages a preview card for invite links: title, line and the heart', () => {
    expect(html).toContain('<meta property="og:title" content="CrewLuve" />')
    expect(html).toContain('<meta property="og:description" content="Stay connected with your pilot" />')
    // Link previews need an absolute address for the image.
    expect(html).toContain('<meta property="og:image" content="https://crewluve.crewlu.net/icons/heart-256.png" />')
  })

  it("offers Crewluve in Safari's banner, since only the app gets alerts (P5-7)", () => {
    expect(html).toContain('<meta name="apple-itunes-app" content="app-id=6759344060" />')
  })
})
