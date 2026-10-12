// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { useRef } from 'preact/hooks'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWidth } from '../../src/ui/hooks/useWidth'

function Probe() {
  const box = useRef<HTMLDivElement>(null)
  return <div ref={box} data-width={useWidth(box, 343)} />
}
const widthOf = (container: Element) => Number(container.querySelector('div')!.getAttribute('data-width'))

/** The element's width as layout would measure it: happy-dom has no layout, so the tests set it. */
let measured = 0

/** A ResizeObserver that reports only when a test says so. */
class FakeObserver {
  static last: FakeObserver | null = null
  disconnected = false
  observed: Element[] = []
  constructor(private callback: () => void) {
    FakeObserver.last = this
  }
  observe(el: Element) {
    this.observed.push(el)
  }
  disconnect() {
    this.disconnected = true
  }
  report() {
    this.callback()
  }
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: measured }) as DOMRect)
  vi.stubGlobal('ResizeObserver', FakeObserver)
  FakeObserver.last = null
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useWidth', () => {
  it('measures the element as it mounts', () => {
    measured = 300
    expect(widthOf(render(<Probe />).container)).toBe(300)
  })

  it('measures it again when it resizes', () => {
    measured = 300
    const { container } = render(<Probe />)
    expect(FakeObserver.last!.observed).toEqual([container.querySelector('div')])
    measured = 414.5
    act(() => FakeObserver.last!.report())
    expect(widthOf(container)).toBe(414.5)
  })

  it('keeps the fallback while the element has no width, as in a hidden page', () => {
    measured = 0
    expect(widthOf(render(<Probe />).container)).toBe(343)
  })

  it('measures once in a browser without ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    measured = 320
    expect(widthOf(render(<Probe />).container)).toBe(320)
  })

  it('stops watching when it goes away', () => {
    const { unmount } = render(<Probe />)
    unmount()
    expect(FakeObserver.last!.disconnected).toBe(true)
  })
})
