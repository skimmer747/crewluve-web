// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { SIDE_PANEL, useSidePanel } from '../../src/ui/hooks/useSidePanel'
import { setWindowSize } from '../fixtures/ui'

function Layout() {
  return <p>{useSidePanel() ? 'side' : 'bottom'}</p>
}

afterEach(() => {
  cleanup()
  setWindowSize(1024, 768)
})

describe('useSidePanel (Stage 2 spec §10)', () => {
  it('is Stage 1B’s query: 900 px or wider, or a phone on its side', () => {
    expect(SIDE_PANEL).toBe('(min-width: 900px), (orientation: landscape) and (max-height: 500px)')
  })

  it.each([
    ['a computer', 1440, 900, 'side'],
    ['an iPad on its side', 1180, 820, 'side'],
    ['a phone on its side', 874, 402, 'side'],
    ['a phone', 402, 874, 'bottom'],
    ['an iPad mini held upright', 744, 1133, 'bottom'],
  ])('picks for %s, %i × %i px: %s', (_name, width, height, layout) => {
    setWindowSize(width, height)
    expect(render(<Layout />).container.textContent).toBe(layout)
  })

  it('follows the window across the line', () => {
    setWindowSize(402, 874)
    const { container } = render(<Layout />)
    act(() => setWindowSize(1280, 800))
    expect(container.textContent).toBe('side')
  })
})
