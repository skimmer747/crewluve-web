// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useSchedulePage } from '../../src/ui/hooks/useSchedulePage'

/** The two pages, reduced to what the hook moves between: the status page's title and one link, the schedule's back button. */
function Pages() {
  const page = useSchedulePage()
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

afterEach(cleanup)

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

  it('follows the address when it changes to the schedule some other way', async () => {
    render(<Pages />)
    location.hash = '#schedule'
    await settle()
    expect(onSchedule()).toBe(true)
  })

  it('lets the pages set their own scroll, instead of the browser restoring it', () => {
    history.scrollRestoration = 'auto'
    render(<Pages />)
    expect(history.scrollRestoration).toBe('manual')
  })
})
