// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useElapsed } from '../../src/ui/hooks/useElapsed'
import { stubAnimationFrames } from '../fixtures/ui'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function Clock({ running }: { running: boolean }) {
  return <p>{useElapsed(running)}</p>
}

describe('useElapsed', () => {
  it('counts milliseconds from the first frame, on every frame', async () => {
    const frames = stubAnimationFrames()
    render(<Clock running />)
    expect(screen.getByText('0')).toBeTruthy()
    await frames.frame(1000)
    expect(screen.getByText('0')).toBeTruthy()
    await frames.frame(1400)
    expect(screen.getByText('400')).toBeTruthy()
    expect(frames.pending).toBe(1)
  })

  it('asks for no frames while it isn’t running, and stops when the component goes away', async () => {
    const frames = stubAnimationFrames()
    const { rerender, unmount } = render(<Clock running={false} />)
    expect(frames.pending).toBe(0)
    rerender(<Clock running />)
    expect(frames.pending).toBe(1)
    unmount()
    expect(frames.pending).toBe(0)
  })
})
