// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SIDE_BY_SIDE, useSideBySide } from '../../src/ui/hooks/useSideBySide'
import { setWindowSize } from '../fixtures/ui'

/** Shows which layout the hook picks. */
function Layout() {
  return <p>{useSideBySide() ? 'side by side' : 'one column'}</p>
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  setWindowSize(1024, 768)
})

describe('useSideBySide (slice 3C §3)', () => {
  it('asks for a window at least 744 px wide, an iPad mini held upright, and 500 px tall', () => {
    expect(SIDE_BY_SIDE).toBe('(min-width: 744px) and (min-height: 500px)')
  })

  it.each([
    ['an iPad mini held upright', 744, 1133, 'side by side'],
    ['an iPad on its side', 1180, 820, 'side by side'],
    ['a computer', 1920, 1080, 'side by side'],
    ['one side of an iPad’s split screen', 743, 1133, 'one column'],
    ['a phone', 402, 874, 'one column'],
    ['a phone on its side', 874, 402, 'one column'],
    ['a short computer window', 1440, 499, 'one column'],
  ])('picks for %s, %i × %i px: %s', (_name, width, height, layout) => {
    setWindowSize(width, height)
    expect(render(<Layout />).container.textContent).toBe(layout)
  })

  it('follows the window as it is resized across the line, both ways', () => {
    setWindowSize(700, 820)
    const { container } = render(<Layout />)
    act(() => setWindowSize(820, 1180))
    expect(container.textContent).toBe('side by side')
    act(() => setWindowSize(700, 820))
    expect(container.textContent).toBe('one column')
  })

  it('keeps one column where the browser can’t say', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(render(<Layout />).container.textContent).toBe('one column')
  })

  it('stops following the window once it’s gone', () => {
    const lists = Object.getPrototypeOf(matchMedia(SIDE_BY_SIDE))
    const added = vi.spyOn(lists, 'addEventListener')
    const removed = vi.spyOn(lists, 'removeEventListener')
    render(<Layout />).unmount()
    const follow = added.mock.calls.find(([type]) => type === 'change')![1]
    expect(removed).toHaveBeenCalledWith('change', follow)
  })
})
