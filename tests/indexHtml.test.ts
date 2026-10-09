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
})
