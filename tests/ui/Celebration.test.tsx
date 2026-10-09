// @vitest-environment happy-dom
import { cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Celebration } from '../../src/ui/Celebration'
import { celebrationFrame } from '../../src/ui/celebrationMath'
import { iconNameOf, stubAnimationFrames } from '../fixtures/ui'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Celebration', () => {
  it('plays the waving figure', async () => {
    const { container } = render(<Celebration playKey={0} />)
    await waitFor(() => expect(container.querySelector('.celebration svg')).not.toBeNull())
  })

  it('stays still for people who prefer reduced motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
    const { container } = render(<Celebration playKey={0} />)
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(container.querySelector('.celebration')).toBeNull()
  })
})

describe('Celebration, one frame at a time', () => {
  /** The timestamp the browser puts on the first frame. The celebration's clock starts there, whatever it is. */
  const T0 = 40_000

  const play = () => {
    const frames = stubAnimationFrames()
    return { frames, ...render(<Celebration playKey={0} />) }
  }
  const figure = (container: Element) => container.querySelector<HTMLElement>('.celebration')
  const hearts = (container: Element) => container.querySelectorAll<HTMLElement>('.celebration-heart')

  it('draws the figure and carries on when the first frame is stamped before the effect read the clock', async () => {
    // Browsers can stamp a frame a few ms before the performance.now() an effect read just before asking for it.
    vi.spyOn(performance, 'now').mockReturnValue(1000)
    const { frames, container } = play()
    expect(frames.pending).toBe(1)
    await frames.frame(995)
    expect(container.querySelector('.celebration svg')).not.toBeNull()
    expect(frames.pending).toBe(1)
  })

  it('starts its clock at the first frame, whatever time that frame carries', async () => {
    const { frames, container } = play()
    expect(figure(container)).toBeNull()
    await frames.frame(T0)
    expect(figure(container)).not.toBeNull()
    expect(hearts(container)).toHaveLength(0)
    await frames.frame(T0 + 550)
    expect(hearts(container)).toHaveLength(3)
  })

  it('keeps asking for frames until the celebration is over, then stops', async () => {
    const { frames, container } = play()
    await frames.frame(T0)
    expect(frames.pending).toBe(1)
    await frames.frame(T0 + 1000)
    expect(frames.pending).toBe(1)
    expect(figure(container)).not.toBeNull()
    await frames.frame(T0 + 2400)
    expect(figure(container)).toBeNull()
    expect(frames.pending).toBe(0)
  })

  it('cancels its pending frame when it unmounts', async () => {
    const { frames, unmount } = play()
    await frames.frame(T0)
    expect(frames.pending).toBe(1)
    unmount()
    expect(frames.pending).toBe(0)
  })

  it('replays from the start when the play key changes', async () => {
    const frames = stubAnimationFrames()
    const { container, rerender } = render(<Celebration playKey={0} />)
    await frames.frame(T0)
    await frames.frame(T0 + 2400)
    expect(figure(container)).toBeNull()
    rerender(<Celebration playKey={1} />)
    expect(frames.pending).toBe(1)
    await frames.frame(T0 + 9000)
    expect(container.querySelector('.celebration svg')).not.toBeNull()
  })

  it('restarts a run that is still going, without leaving the old one running beside it', async () => {
    const frames = stubAnimationFrames()
    const { container, rerender } = render(<Celebration playKey={0} />)
    await frames.frame(T0)
    await frames.frame(T0 + 700)
    expect(hearts(container).length).toBeGreaterThan(0)
    rerender(<Celebration playKey={1} />)
    expect(frames.pending).toBe(1)
    await frames.frame(T0 + 800)
    expect(hearts(container)).toHaveLength(0)
  })

  it('fades out at the end', async () => {
    const { frames, container } = play()
    await frames.frame(T0)
    await frames.frame(T0 + 1500)
    expect(figure(container)!.style.opacity).toBe('1')
    await frames.frame(T0 + 2200)
    expect(Number(figure(container)!.style.opacity)).toBeCloseTo(0.25)
  })

  it('bounces the figure by the offset, tilt, and scale of the moment', async () => {
    const { frames, container } = play()
    await frames.frame(T0)
    await frames.frame(T0 + 300)
    const moment = celebrationFrame(300)!
    expect(moment.scale).toBeCloseTo(1.3)
    const body = figure(container)!.firstElementChild as HTMLElement
    expect(body.style.transform).toBe(`translateY(${moment.offsetY}px) rotate(${moment.rotation}deg) scale(${moment.scale})`)
  })

  it('draws the rising hearts in red at their own size, opacity, and place', async () => {
    const { frames, container } = play()
    await frames.frame(T0)
    await frames.frame(T0 + 550)
    expect(hearts(container)).toHaveLength(3)
    const expected = celebrationFrame(550)!.hearts[0]
    const [first] = hearts(container)
    expect(first.style.opacity).toBe(String(expected.opacity))
    expect(first.style.transform).toBe(`translate(calc(-50% + ${expected.x}px), calc(-50% + ${expected.y}px)) scale(${expected.scale})`)
    const icon = first.querySelector('svg')!
    expect(iconNameOf(icon)).toBe('Heart')
    expect(icon.getAttribute('width')).toBe(String(expected.size))
    expect(icon.style.color).toBe('var(--red)')
  })

  it('stays hidden from screen readers', async () => {
    const { frames, container } = play()
    await frames.frame(T0)
    expect(figure(container)!.getAttribute('aria-hidden')).toBe('true')
  })
})
