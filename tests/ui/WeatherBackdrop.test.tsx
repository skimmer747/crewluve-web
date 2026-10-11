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

/** Gives every canvas a size: happy-dom lays nothing out, so it reports 0 by 0. */
function setCanvasSize(width: number, height: number) {
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', { configurable: true, get: () => width })
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', { configurable: true, get: () => height })
}

let ctx: ReturnType<typeof fakeContext>

beforeEach(() => {
  ctx = fakeContext()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx as unknown as CanvasRenderingContext2D)
  setCanvasSize(360, 720)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete (document as { visibilityState?: unknown }).visibilityState
  delete (HTMLCanvasElement.prototype as { clientWidth?: unknown }).clientWidth
  delete (HTMLCanvasElement.prototype as { clientHeight?: unknown }).clientHeight
})

describe('WeatherBackdrop', () => {
  it('is a canvas screen readers skip, drawing the animation afresh on every frame', async () => {
    const frames = stubAnimationFrames()
    const { container } = render(<WeatherBackdrop kind="rain" night={false} />)
    expect(container.querySelector('canvas')!.getAttribute('aria-hidden')).toBe('true')
    await frames.frame(1000)
    expect(ctx.calls.filter((c) => c.startsWith('clearRect'))).toHaveLength(1)
    expect(ctx.calls.filter((c) => c.startsWith('stroke'))).toHaveLength(60)
    await frames.frame(1016)
    expect(ctx.calls.filter((c) => c.startsWith('clearRect'))).toHaveLength(2)
  })

  it('softens clouds with gradients rather than blur', async () => {
    const frames = stubAnimationFrames()
    render(<WeatherBackdrop kind="clouds" night />)
    await frames.frame(1000)
    expect(ctx.calls.filter((c) => c.startsWith('addColorStop'))).toHaveLength(7 * 3)
    expect(ctx.calls.filter((c) => c.startsWith('fill('))).toHaveLength(7)
  })

  it('draws stars as dots', async () => {
    const frames = stubAnimationFrames()
    render(<WeatherBackdrop kind="stars" night />)
    await frames.frame(1000)
    expect(ctx.calls.filter((c) => c.startsWith('arc('))).toHaveLength(40)
    expect(ctx.calls.filter((c) => c.startsWith('fill('))).toHaveLength(40)
  })

  it('flashes the whole card in a thunderstorm and draws the bolt over the rain', async () => {
    const frames = stubAnimationFrames()
    render(<WeatherBackdrop kind="thunderstorm" night />)
    await frames.frame(12050)
    expect(ctx.calls.filter((c) => c.startsWith('fillRect'))).toHaveLength(1)
    expect(ctx.calls.filter((c) => c.startsWith('stroke('))).toHaveLength(61)
  })

  it('draws nothing while the canvas has no size, and keeps asking for frames', async () => {
    setCanvasSize(0, 0)
    const frames = stubAnimationFrames()
    render(<WeatherBackdrop kind="rain" night={false} />)
    await frames.frame(1000)
    expect(ctx.calls).toEqual([])
    expect(frames.pending).toBe(1)
  })

  it('reads its colors again when night falls, so they follow the popup into its dark set', () => {
    stubAnimationFrames()
    const style = vi.spyOn(window, 'getComputedStyle')
    const { rerender } = render(<WeatherBackdrop kind="rain" night={false} />)
    expect(style).toHaveBeenCalledTimes(1)
    rerender(<WeatherBackdrop kind="rain" night />)
    expect(style).toHaveBeenCalledTimes(2)
  })

  it('stops while the page is hidden and starts again when it comes back', async () => {
    const frames = stubAnimationFrames()
    render(<WeatherBackdrop kind="snow" night />)
    expect(frames.pending).toBe(1)
    await act(() => setVisibility('hidden'))
    expect(frames.pending).toBe(0)
    await act(() => setVisibility('visible'))
    expect(frames.pending).toBe(1)
  })

  it('stops when the popup closes', () => {
    const frames = stubAnimationFrames()
    const { unmount } = render(<WeatherBackdrop kind="stars" night />)
    unmount()
    expect(frames.pending).toBe(0)
  })

  it('draws nothing, and asks for no frames, where the browser has no canvas', () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(() => null)
    const frames = stubAnimationFrames()
    render(<WeatherBackdrop kind="fog" night />)
    expect(frames.pending).toBe(0)
  })
})
