// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { useRef } from 'preact/hooks'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePopupOpener } from '../../src/ui/hooks/usePopupOpener'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/**
 * A screen reduced to one popup: the button that opens it while its subject is there, a heading for focus to fall back
 * to, and the popup itself, which closes when told.
 */
function Screen({ subject }: { subject: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null)
  const popup = usePopupOpener(subject, () => heading.current)
  return (
    <>
      <h2 ref={heading} tabIndex={-1}>
        In its place
      </h2>
      {subject && (
        <button type="button" onClick={(e) => popup.show(e.currentTarget)}>
          Open
        </button>
      )}
      {popup.open && (
        <div role="dialog" aria-label="Popup">
          <button type="button" onClick={popup.hide}>
            Close
          </button>
        </div>
      )}
    </>
  )
}
const openIt = () => fireEvent.click(screen.getByRole('button', { name: 'Open' }))

describe('usePopupOpener', () => {
  it('opens from its button, and closes when told', () => {
    render(<Screen subject />)
    expect(screen.queryByRole('dialog')).toBeNull()
    openIt()
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('hands focus back to its button once it has closed', async () => {
    render(<Screen subject />)
    openIt()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await act(() => {})
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open' }))
  })

  it('closes by itself when its subject goes, and stays closed when it comes back', () => {
    const { rerender } = render(<Screen subject />)
    openIt()
    rerender(<Screen subject={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    rerender(<Screen subject />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('sends focus to what took the place of its button, without scrolling to it, when the button went with the subject', async () => {
    const { rerender } = render(<Screen subject />)
    openIt()
    const heading = screen.getByRole('heading', { name: 'In its place' })
    const focus = vi.spyOn(heading, 'focus')
    rerender(<Screen subject={false} />)
    await act(() => {})
    expect(document.activeElement).toBe(heading)
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('moves no focus when it never opened', async () => {
    const { rerender } = render(<Screen subject />)
    await act(() => {})
    expect(document.activeElement).toBe(document.body)
    rerender(<Screen subject={false} />)
    await act(() => {})
    expect(document.activeElement).toBe(document.body)
  })
})
