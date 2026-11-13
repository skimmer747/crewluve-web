// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFrameClock } from '../../src/ui/hooks/useFrameClock'

let time = 0
let frames: FrameRequestCallback[] = []
const requested = vi.fn()

function Probe({ stopAt }: { stopAt?: number }) {
  return <p data-time={useFrameClock(true, 0, stopAt)} />
}
const shown = (container: Element) => Number(container.querySelector('p')!.getAttribute('data-time'))

/** Runs the animation frame the hook asked for, if it asked for one. */
function frame(at: number) {
  time = at
  const callbacks = frames
  frames = []
  act(() => callbacks.forEach((cb) => cb(at)))
}

beforeEach(() => {
  time = 0
  frames = []
  requested.mockClear()
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    requested()
    frames.push(cb)
    return frames.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  vi.spyOn(Date, 'now').mockImplementation(() => time)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useFrameClock', () => {
  it('keeps asking for frames while playing', () => {
    const { container } = render(<Probe />)
    frame(100)
    frame(200)
    expect(shown(container)).toBe(200)
    expect(frames).toHaveLength(1)
  })

  it('stops asking once the time reaches stopAt, and keeps showing a time at or after it', () => {
    const { container } = render(<Probe stopAt={250} />)
    frame(100)
    frame(200)
    frame(300)
    expect(frames).toHaveLength(0)
    expect(shown(container)).toBe(300)
    expect(requested).toHaveBeenCalledTimes(3)
  })
})
