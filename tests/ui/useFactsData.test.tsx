// @vitest-environment happy-dom
import { cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const KANSAS = { name: 'Kansas', kind: 'state', country: 'the United States', box: [-102, 37, -94.6, 40], rings: [[-102, 37, -94.6, 37, -94.6, 40, -102, 40]] }

/** A fresh copy of the hooks, so each test starts with nothing loaded. */
async function freshHooks() {
  vi.resetModules()
  return import('../../src/ui/hooks/useFactsData')
}

function stubFetch(reply: (url: string) => Response) {
  const fetch = vi.fn(async (url: string) => reply(url))
  vi.stubGlobal('fetch', fetch)
  return fetch
}

describe('loading the facts’ data (Stage 2 spec §10, §11)', () => {
  it('fetches nothing until it’s wanted, then each file once from the site itself', async () => {
    const { useComparisons, useGeography } = await freshHooks()
    const fetch = stubFetch((url) => new Response(JSON.stringify(url.includes('geography') ? { areas: [KANSAS], cities: [] } : [{ miles: 2800, one: 'Like driving coast to coast', many: 'x' }])))
    function Shown({ wanted }: { wanted: boolean }) {
      const geography = useGeography(wanted)
      const comparisons = useComparisons(wanted)
      return <p>{`${geography?.areas.length ?? 'none'} ${comparisons?.length ?? 'none'}`}</p>
    }
    const { container, rerender } = render(<Shown wanted={false} />)
    expect(fetch).not.toHaveBeenCalled()
    rerender(<Shown wanted />)
    await waitFor(() => expect(container.textContent).toBe('1 1'))
    render(<Shown wanted />)
    expect(fetch.mock.calls.map(([url]) => url).sort()).toEqual(['/data/comparisons.json', '/data/geography.json'])
  })

  it('goes on without places when the geography can’t be had', async () => {
    const { useGeography } = await freshHooks()
    stubFetch(() => new Response('', { status: 404 }))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Shown() {
      const geography = useGeography(true)
      return <p>{geography ? `${geography.areas.length} areas` : 'loading'}</p>
    }
    const { container } = render(<Shown />)
    await waitFor(() => expect(container.textContent).toBe('0 areas'))
    expect(error).toHaveBeenCalled()
  })
})
