// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSchedulePage } from '../../src/ui/hooks/useSchedulePage'

/**
 * The two pages, reduced to what the hook moves between: the status page's title and one link, the schedule's back
 * button. `sideBySide` says the window is wide enough to show both at once (slice 3C §3).
 */
function Pages({ sideBySide = false }: { sideBySide?: boolean }) {
  const page = useSchedulePage(sideBySide)
  if (page.open) {
    return (
      <main>
        <h1 tabIndex={-1}>Schedule</h1>
        <button type="button" onClick={page.back}>Back</button>
      </main>
    )
  }
  return (
    <main>
      <h1 class="title" tabIndex={-1}>Where's Alex?</h1>
      <a href="#schedule" data-schedule-link="trip" onClick={(e) => {
        e.preventDefault()
        page.show('trip')
      }}>Schedule</a>
    </main>
  )
}

/** Lets the browser's history events arrive: happy-dom sends popstate a moment after history.back(). */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)))
const onSchedule = () => screen.queryByRole('heading', { level: 1, name: 'Schedule' }) != null

beforeEach(() => {
  history.replaceState(null, '', '/?demo=1&scene=home')
  window.scrollTo(0, 0)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useSchedulePage (slice 3A §3.3)', () => {
  it('starts on the status page, or on the schedule when the address says so', () => {
    render(<Pages />)
    expect(onSchedule()).toBe(false)
    cleanup()
    history.replaceState(null, '', '/?demo=1&scene=home#schedule')
    render(<Pages />)
    expect(onSchedule()).toBe(true)
  })

  it('opens the schedule at its own address, keeping the rest, in a history entry marked as its own', () => {
    render(<Pages />)
    const entries = history.length
    fireEvent.click(screen.getByRole('link', { name: 'Schedule' }))
    expect(onSchedule()).toBe(true)
    expect([location.pathname, location.search, location.hash]).toEqual(['/', '?demo=1&scene=home', '#schedule'])
    expect(history.state).toEqual({ crewluveSchedule: true })
    expect(history.length).toBe(entries + 1)
  })

  it('steps back through history from its back button, to the status page’s scroll and the link it left from', async () => {
    render(<Pages />)
    window.scrollTo(0, 420)
    fireEvent.click(screen.getByRole('link', { name: 'Schedule' }))
    window.scrollTo(0, 50)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await settle()
    expect(onSchedule()).toBe(false)
    expect([location.search, location.hash]).toEqual(['?demo=1&scene=home', ''])
    expect(window.scrollY).toBe(420)
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Schedule' }))
    // It stepped back rather than replacing the entry, so Forward goes to the schedule again.
    history.forward()
    await settle()
    expect(onSchedule()).toBe(true)
  })

  it('hands focus back before it restores the scroll, since Safari before 15 scrolls to whatever takes focus', async () => {
    render(<Pages />)
    fireEvent.click(screen.getByRole('link', { name: 'Schedule' }))
    const calls: string[] = []
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {
      calls.push('scroll')
    })
    const focus = HTMLElement.prototype.focus
    vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement, options?: FocusOptions) {
      calls.push('focus')
      focus.call(this, options)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await settle()
    expect(calls).toEqual(['focus', 'scroll'])
  })

  it('remembers where the status page was when Forward brings the schedule back, with no link to hand focus to', async () => {
    render(<Pages />)
    window.scrollTo(0, 420)
    fireEvent.click(screen.getByRole('link', { name: 'Schedule' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await settle()
    window.scrollTo(0, 900)
    history.forward()
    await settle()
    expect(onSchedule()).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await settle()
    expect(window.scrollY).toBe(900)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: "Where's Alex?" }))
  })

  it('follows the phone’s Back and the browser’s', async () => {
    render(<Pages />)
    fireEvent.click(screen.getByRole('link', { name: 'Schedule' }))
    history.back()
    await settle()
    expect(onSchedule()).toBe(false)
  })

  it('stays on the site when the schedule was opened straight from its address: its back button goes to the status page', async () => {
    // Another page came before, as when a bookmark opens the schedule.
    history.pushState(null, '', '/another-page')
    history.pushState(null, '', '/?demo=1&scene=home#schedule')
    render(<Pages />)
    const entries = history.length
    window.scrollTo(0, 300)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await settle()
    expect(onSchedule()).toBe(false)
    expect([location.pathname, location.search, location.hash]).toEqual(['/', '?demo=1&scene=home', ''])
    expect(history.length).toBe(entries)
    expect(window.scrollY).toBe(0)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: "Where's Alex?" }))
  })

  it('follows the address when it changes to the schedule some other way, remembering where the status page was', async () => {
    render(<Pages />)
    window.scrollTo(0, 700)
    location.hash = '#schedule'
    await settle()
    expect(onSchedule()).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await settle()
    expect(onSchedule()).toBe(false)
    expect(window.scrollY).toBe(700)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: "Where's Alex?" }))
    // The back button stepped back, as after a tap, rather than leaving the status page in history twice.
    history.forward()
    await settle()
    expect(onSchedule()).toBe(true)
  })

  it('stops the browser restoring the schedule’s scroll, and leaves the status page’s own history entry as it was', async () => {
    history.scrollRestoration = 'auto'
    render(<Pages />)
    expect(history.scrollRestoration).toBe('auto')
    fireEvent.click(screen.getByRole('link', { name: 'Schedule' }))
    expect(history.scrollRestoration).toBe('manual')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await settle()
    expect(history.scrollRestoration).toBe('auto')
  })

  it('does the same for a schedule loaded straight from its address, and for the status page that takes its place', async () => {
    history.replaceState(null, '', '/?demo=1&scene=home#schedule')
    history.scrollRestoration = 'auto'
    render(<Pages />)
    expect(history.scrollRestoration).toBe('manual')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await settle()
    expect(onSchedule()).toBe(false)
    expect(history.scrollRestoration).toBe('auto')
  })

  it('stops following the address once it’s gone', () => {
    const removed = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<Pages />)
    unmount()
    expect(removed.mock.calls.map(([type]) => type)).toEqual(expect.arrayContaining(['popstate', 'hashchange']))
  })
})

describe('useSchedulePage on a wide window (slice 3C §5.1)', () => {
  it('follows Back and Forward, but moves neither focus nor the window’s scroll, since nothing on screen changes', async () => {
    render(<Pages sideBySide />)
    window.scrollTo(0, 300)
    location.hash = '#schedule'
    await settle()
    expect(onSchedule()).toBe(true)
    window.scrollTo(0, 50)
    history.back()
    await settle()
    expect(onSchedule()).toBe(false)
    expect(document.activeElement).toBe(document.body)
    expect(window.scrollY).toBe(50)
    history.forward()
    await settle()
    expect(onSchedule()).toBe(true)
  })
})
