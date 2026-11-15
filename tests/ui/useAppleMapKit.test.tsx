// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { resetAppleMapKit, startAppleMapKit, useAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { fakeMapKit } from '../fixtures/fakeMapKit'

afterEach(() => {
  cleanup()
  resetAppleMapKit()
})

function Probe() {
  return <p>{useAppleMapKit().status}</p>
}

describe('loading MapKit JS (Apple Maps spec §3, §7)', () => {
  it('refuses to load Apple’s code in tests, so the SVG map shows', async () => {
    render(<Probe />)
    await waitFor(() => expect(screen.getByText('failed')).toBeTruthy())
  })

  it('loads once, and is ready with the library', async () => {
    let loads = 0
    const kit = fakeMapKit()
    startAppleMapKit(async () => {
      loads += 1
      return kit as unknown as MapKitApi
    })
    render(
      <>
        <Probe />
        <Probe />
      </>,
    )
    await waitFor(() => expect(screen.getAllByText('ready')).toHaveLength(2))
    expect(loads).toBe(1)
  })

  it('fails when MapKit reports an error, such as a token refused for this site', async () => {
    const kit = fakeMapKit()
    startAppleMapKit(async () => kit as unknown as MapKitApi)
    render(<Probe />)
    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy())
    kit.fire('error', { status: 'Unauthorized' })
    await waitFor(() => expect(screen.getByText('failed')).toBeTruthy())
  })
})
