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
/** Where the opening has every part when the close comes: partway faded in, and springing up from half size. */
const midOpening = () =>
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    () => ({ getPropertyValue: (name: string) => (name === 'transform' ? 'matrix(0.8, 0, 0, 0.8, 0, 0)' : '0.42') }) as unknown as CSSStyleDeclaration,
  )
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
    midOpening()
    closeNow()
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

  it('leaves the parts’ other inline styles alone, such as a drag’s offset', async () => {
    const { container } = render(<Popup onClose={() => {}} />)
    const backdrop = container.querySelector<HTMLElement>('.backdrop')!
    backdrop.style.transform = 'translateY(40px)'
    midOpening()
    closeNow()
    await act(() => {})
    expect(backdrop.style.transform).toBe('translateY(40px)')
  })
})
