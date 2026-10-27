import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Plugin, PluginOption } from 'vite'
import { describe, expect, it } from 'vitest'
import { SUPABASE_URL } from '../src/cloud'
import { DOOR_RPCS, doorFetch } from '../src/partner/doorGuard'
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

  /** One directive of the policy, with its name: connect-src 'self' ... */
  const directive = (name: string) => injectCsp('<!--csp-->').split('; ').find((d) => d.startsWith(`${name} `))

  it('lets the page call the four partner RPCs and Open-Meteo for the weather, and nothing else', () => {
    const rpcs = ['partner_join', 'partner_handoff_redeem', 'partner_view', 'partner_leave'].map((name) => `${SUPABASE_URL}/rest/v1/rpc/${name}`)
    const connect = directive('connect-src')
    expect(connect).toBe(`connect-src 'self' ${rpcs.join(' ')} https://api.open-meteo.com`)
    // Not the project's own address, which would let the page reach its tables, Auth, functions and storage.
    expect(connect!.split(' ')).not.toContain(SUPABASE_URL)
  })

  it('lists the addresses the door guard lets through, one for each of its RPCs', async () => {
    const sent: string[] = []
    const guarded = doorFetch((async (input: RequestInfo | URL) => {
      sent.push(String(input))
      return new Response('{}')
    }) as unknown as typeof fetch)
    const listed = directive('connect-src')!.split(' ').filter((source) => source.startsWith(SUPABASE_URL))
    expect(listed).toHaveLength(DOOR_RPCS.length)
    for (const address of listed) await guarded(address, { method: 'POST' })
    expect(sent).toEqual(listed)
  })
})

describe('the /join page (piece 5a §4.1)', () => {
  const joinPage = findPlugin(config.plugins ?? [], 'crewluve-join-page')!
  const writeBundle = joinPage.writeBundle as unknown as (options: { dir?: string }) => void

  it('is made only by the build', () => {
    expect(joinPage.apply).toBe('build')
  })

  it('is an exact copy of the built index.html, as join.html and as 404.html, so each runs the same bundle under the same CSP', () => {
    const dir = mkdtempSync(join(tmpdir(), 'crewluve-join-'))
    try {
      const built = '<!doctype html><meta http-equiv="Content-Security-Policy" content="x" /><script type="module" src="/assets/index-abc.js"></script>'
      writeFileSync(join(dir, 'index.html'), built)
      writeBundle({ dir })
      // Pages serves join.html for /join, and 404.html (with status 404, which browsers show as a page) for a path it
      // has no file for, such as /join/ or /Join.
      for (const name of ['join.html', '404.html']) expect(readFileSync(join(dir, name), 'utf8'), name).toBe(built)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('fails the build when it is given no output folder, rather than copying in whatever folder the shell is in', () => {
    expect(() => writeBundle({})).toThrow('crewluve-join-page: no output folder')
  })
})
