// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render } from '@testing-library/preact'
import { useRef } from 'preact/hooks'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { POPUP_CLOSE_MS, usePopupClose } from '../../src/ui/hooks/usePopupClose'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

let closeNow: () => void = () => {}

/**
 * A popup reduced to its parts: a backdrop whose opening fades it in, a card whose opening fades it in and springs it
 * from half size, and a part that isn't drawn, which the close passes over.
 */
function Popup({ onClose }: { onClose: () => void }) {
  const backdrop = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const { closing, close } = usePopupClose(onClose, [
    { find: () => backdrop.current, properties: ['opacity'] },
    { find: () => card.current, properties: ['opacity', 'transform'] },
    { find: () => null, properties: ['transform'] },
  ])
  closeNow = close
  return (
    <div class={closing ? 'popup closing' : 'popup'}>
      <div ref={backdrop} class="backdrop" />
      <div ref={card} class="card">
        <button type="button" onClick={close}>
          Close
        </button>
      </div>
    </div>
  )
}

const reduceMotion = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
/**
 * Where the opening has every part when the close comes: partway faded in, and springing up from half size. With its
 * animation off, a part shows its inline value, or rests, as in a browser. Returns each read, noting whether the
 * animation was on.
 */
const midOpening = () => {
  const reads: Array<{ el: Element; animating: boolean }> = []
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
    const style = (el as HTMLElement).style
    const animating = style.getPropertyValue('animation') !== 'none'
    reads.push({ el, animating })
    const value = (name: string) =>
      animating ? (name === 'transform' ? 'matrix(0.8, 0, 0, 0.8, 0, 0)' : '0.42') : style.getPropertyValue(name) || (name === 'transform' ? 'none' : '1')
    return { getPropertyValue: value } as unknown as CSSStyleDeclaration
  })
  return reads
}
const held = (el: HTMLElement) => ['opacity', 'transform', 'animation'].map((name) => el.style.getPropertyValue(name))

describe('usePopupClose', () => {
  it('puts the closing styles on, and tells the screen 0.2 s after the first close, once', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const { container } = render(<Popup onClose={onClose} />)
    fireEvent.click(container.querySelector('button')!)
    fireEvent.click(container.querySelector('button')!)
    expect(container.querySelector('.popup')!.classList.contains('closing')).toBe(true)
    act(() => {
      vi.advanceTimersByTime(POPUP_CLOSE_MS - 1)
    })
    expect(onClose).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes at once, with no closing styles, for visitors who ask for reduced motion', () => {
    reduceMotion()
    const onClose = vi.fn()
    const { container } = render(<Popup onClose={onClose} />)
    fireEvent.click(container.querySelector('button')!)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.popup')!.classList.contains('closing')).toBe(false)
  })

  it('forgets the close when the popup goes first', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const { container, unmount } = render(<Popup onClose={onClose} />)
    fireEvent.click(container.querySelector('button')!)
    unmount()
    vi.advanceTimersByTime(POPUP_CLOSE_MS)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('holds each part where the opening has it, then lets go once the closing styles are on', async () => {
    const { container } = render(<Popup onClose={() => {}} />)
    const backdrop = container.querySelector<HTMLElement>('.backdrop')!
    const card = container.querySelector<HTMLElement>('.card')!
    const reads = midOpening()
    closeNow()
    // Each part is read while its opening runs, then read again with the animation off: that style recalculation is
    // what makes a browser start the close from the held values (§3.3).
    expect([backdrop, card].map((part) => reads.filter((read) => read.el === part).map((read) => read.animating))).toEqual([
      [true, false],
      [true, false],
    ])
    // Held: what each part's opening animates, inline, with the animation off. Nothing else is touched.
    expect(held(backdrop)).toEqual(['0.42', '', 'none'])
    expect(held(card)).toEqual(['0.42', 'matrix(0.8, 0, 0, 0.8, 0, 0)', 'none'])
    expect(container.querySelector('.popup')!.classList.contains('closing')).toBe(false)
    await act(() => {})
    // The closing styles are on and the held values are gone, so the 0.2 s transition runs from them.
    expect(container.querySelector('.popup')!.classList.contains('closing')).toBe(true)
    expect(held(backdrop)).toEqual(['', '', ''])
    expect(held(card)).toEqual(['', '', ''])
  })

  it('gives the parts back the inline styles they had, such as a drag’s offset, once it lets go', async () => {
    const { container } = render(<Popup onClose={() => {}} />)
    const backdrop = container.querySelector<HTMLElement>('.backdrop')!
    const card = container.querySelector<HTMLElement>('.card')!
    backdrop.style.transform = 'translateY(40px)'
    card.style.transform = 'translateY(40px)'
    midOpening()
    closeNow()
    // The card's opening drives its transform, so that's held while the closing styles go on; the backdrop's isn't.
    expect([backdrop.style.transform, card.style.transform]).toEqual(['translateY(40px)', 'matrix(0.8, 0, 0, 0.8, 0, 0)'])
    await act(() => {})
    expect([backdrop.style.transform, card.style.transform]).toEqual(['translateY(40px)', 'translateY(40px)'])
  })
})
