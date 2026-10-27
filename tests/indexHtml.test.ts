import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

describe('index.html', () => {
  it('starts the airport list download alongside the app code', () => {
    // as="fetch" with crossorigin matches the app's own fetch(), so the browser reuses this download.
    expect(html).toMatch(/<link rel="preload" href="\/data\/airports\.json" as="fetch" crossorigin \/>/)
  })

  it('keeps the placeholder the build fills with the CSP', () => {
    expect(html).toContain('<!--csp-->')
  })

  // A <meta> policy governs only what comes after it, so a link or script above one loads without it.
  it('puts the CSP placeholder and the referrer policy before the first <link> and the first <script>', () => {
    const loaders = [html.search(/<link\b/), html.search(/<script\b/)]
    expect(loaders.every((at) => at > -1)).toBe(true)
    for (const tag of ['<!--csp-->', '<meta name="referrer" content="no-referrer" />']) {
      const at = html.indexOf(tag)
      expect(at, tag).toBeGreaterThan(-1)
      for (const loader of loaders) expect(at, tag).toBeLessThan(loader)
    }
  })

  it('tells a browser with JavaScript off what to do, above the empty app', () => {
    const note =
      "<noscript>CrewLuve needs JavaScript to show your pilot's status. Turn it on in your browser's settings, or open the link in another browser.</noscript>"
    const body = html.slice(html.indexOf('<body>'))
    expect(body).toContain(note)
    expect(body.indexOf(note)).toBeLessThan(body.indexOf('<div id="app"></div>'))
  })
})
