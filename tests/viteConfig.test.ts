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

  it('lets the app reach the CrewLu Cloud project the client uses', () => {
    expect(injectCsp('<!--csp-->')).toContain(`connect-src 'self' ${SUPABASE_URL};`)
  })
})
