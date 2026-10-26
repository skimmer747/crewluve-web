import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Plugin, PluginOption } from 'vite'
import { describe, expect, it } from 'vitest'
import { SUPABASE_URL } from '../src/cloud'
import config from '../vite.config'

/** Vite's plugin list can nest arrays (preact() returns several plugins), so search it recursively. */
function findPlugin(options: PluginOption[], name: string): Plugin | undefined {
  for (const option of options) {
    if (Array.isArray(option)) {
      const nested = findPlugin(option, name)
      if (nested) return nested
    } else if (option && 'name' in option && option.name === name) {
      return option
    }
  }
  return undefined
}

const plugin = findPlugin(config.plugins ?? [], 'crewluve-csp')!
const injectCsp = plugin.transformIndexHtml as (html: string) => string

describe('production CSP plugin', () => {
  it('fills the <!--csp--> placeholder with the policy', () => {
    const html = injectCsp('<head><!--csp--></head>')
    expect(html).toContain('<meta http-equiv="Content-Security-Policy"')
    expect(html).toContain("default-src 'self'")
    expect(html).not.toContain('<!--csp-->')
  })

  it('forbids plugins and embedded objects', () => {
    expect(injectCsp('<!--csp-->')).toContain("object-src 'none'")
  })

  it('throws when index.html loses the placeholder, so production never ships without a CSP', () => {
    expect(() => injectCsp('<head></head>')).toThrow('index.html lost its <!--csp--> placeholder')
  })

  it('allows no inline styles or scripts', () => {
    const csp = injectCsp('<!--csp-->')
    expect(csp).toContain("style-src 'self';")
    expect(csp).not.toContain("'unsafe-inline'")
  })

  it('lets the app reach the CrewLu Cloud project the partner door calls, and Open-Meteo for the weather, and nothing else', () => {
    expect(injectCsp('<!--csp-->')).toContain(`connect-src 'self' ${SUPABASE_URL} https://api.open-meteo.com;`)
  })
})

describe('the /join page (piece 5a §4.1)', () => {
  const joinPage = findPlugin(config.plugins ?? [], 'crewluve-join-page')!
  const writeBundle = joinPage.writeBundle as unknown as (options: { dir?: string }) => void

  it('is made only by the build', () => {
    expect(joinPage.apply).toBe('build')
  })

  it('is an exact copy of the built index.html, so it runs the same bundle under the same CSP', () => {
    const dir = mkdtempSync(join(tmpdir(), 'crewluve-join-'))
    const built = '<!doctype html><meta http-equiv="Content-Security-Policy" content="x" /><script type="module" src="/assets/index-abc.js"></script>'
    writeFileSync(join(dir, 'index.html'), built)
    writeBundle({ dir })
    expect(readFileSync(join(dir, 'join.html'), 'utf8')).toBe(built)
  })
})
