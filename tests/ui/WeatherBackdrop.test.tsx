// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WeatherBackdrop } from '../../src/ui/WeatherBackdrop'
import { stubAnimationFrames } from '../fixtures/ui'

/** A stand-in 2D context that records what's drawn: happy-dom's canvas has none. */
function fakeContext() {
  const calls: string[] = []
  const record = (name: string) => (...args: unknown[]) => {
    calls.push(`${name}(${args.length})`)
  }
  const ctx = {
    calls,
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: '',
    fillStyle: '' as unknown,
    setTransform: record('setTransform'),
    clearRect: record('clearRect'),
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    stroke: record('stroke'),
    arc: record('arc'),
    fill: record('fill'),
    fillRect: record('fillRect'),
    save: record('save'),
    restore: record('restore'),
    translate: record('translate'),
    scale: record('scale'),
    createRadialGradient: () => ({ addColorStop: record('addColorStop') }),
  }
  return ctx
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

let ctx: ReturnType<typeof fakeContext>

beforeEach(() => {
  ctx = fakeContext()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx as unknown as CanvasRenderingContext2D)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete (document as { visibilityState?: unknown }).visibilityState
})

describe('WeatherBackdrop', () => {
  it('is a canvas screen readers skip, drawing the animation afresh on every frame', async () => {
    const frames = stubAnimationFrames()
    const { container } = render(<WeatherBackdrop kind="rain" dark={false} />)
    expect(container.querySelector('canvas')!.getAttribute('aria-hidden')).toBe('true')
    await frames.frame(1000)
    expect(ctx.calls.filter((c) => c.startsWith('clearRect'))).toHaveLength(1)
    expect(ctx.calls.filter((c) => c.startsWith('stroke'))).toHaveLength(60)
    await frames.frame(1016)
    expect(ctx.calls.filter((c) => c.startsWith('clearRect'))).toHaveLength(2)
  })

  it('softens clouds with gradients rather than blur', async () => {
    const frames = stubAnimationFrames()
    render(<WeatherBackdrop kind="clouds" dark />)
    await frames.frame(1000)
    expect(ctx.calls.filter((c) => c.startsWith('addColorStop'))).toHaveLength(7 * 3)
    expect(ctx.calls.filter((c) => c.startsWith('fill('))).toHaveLength(7)
  })

  it('stops while the page is hidden and starts again when it comes back', async () => {
    const frames = stubAnimationFrames()
    render(<WeatherBackdrop kind="snow" dark />)
    expect(frames.pending).toBe(1)
    await act(() => setVisibility('hidden'))
    expect(frames.pending).toBe(0)
    await act(() => setVisibility('visible'))
    expect(frames.pending).toBe(1)
  })

  it('stops when the popup closes', () => {
    const frames = stubAnimationFrames()
    const { unmount } = render(<WeatherBackdrop kind="stars" dark />)
    unmount()
    expect(frames.pending).toBe(0)
  })

  it('draws nothing, and asks for no frames, where the browser has no canvas', () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(() => null)
    const frames = stubAnimationFrames()
    render(<WeatherBackdrop kind="fog" dark />)
    expect(frames.pending).toBe(0)
  })
})
