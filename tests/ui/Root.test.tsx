// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as session from '../../src/auth/session'
import { CACHE_KEY, localScheduleCache } from '../../src/data/cache'
import { demoRawForScene } from '../../src/data/demo'
import { fetchSchedule, ScheduleFetchError } from '../../src/data/fetchSchedule'
import { RawBuilder } from '../../src/data/rowBuilder'
import type { RawSchedule } from '../../src/data/rows'
import { Root } from '../../src/ui/Root'

// Root's collaborators are faked, so these tests never reach CrewLu Cloud.
vi.mock('../../src/auth/session', () => ({
  hasStoredSession: vi.fn(),
  hasSession: vi.fn(),
  hasLiveSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  onSignedOut: vi.fn(),
}))
vi.mock('../../src/supabase', () => ({ supabase: { fake: true } }))
vi.mock('../../src/data/fetchSchedule', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/data/fetchSchedule')>()),
  fetchSchedule: vi.fn(),
}))
vi.mock('../../src/ui/hooks/useAirports', async () => {
  const { testAirports } = await import('../fixtures/airports')
  return { useAirports: () => testAirports }
})

const alex = (): RawSchedule => demoRawForScene('flying', Date.now())
const nothing = (): RawSchedule => ({ ...new RawBuilder(Date.now()).build(), fetchedAt: Date.now() })
const cached = () => localStorage.getItem(CACHE_KEY)

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  localStorage.clear()
  vi.mocked(session.hasStoredSession).mockReturnValue(true)
  vi.mocked(session.hasSession).mockResolvedValue(true)
  vi.mocked(session.hasLiveSession).mockResolvedValue(true)
  vi.mocked(session.signIn).mockResolvedValue(null)
  vi.mocked(session.signOut).mockResolvedValue(undefined)
  vi.mocked(session.onSignedOut).mockImplementation(() => () => {})
  vi.mocked(fetchSchedule).mockImplementation(async () => alex())
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('Root: starting up', () => {
  it('opens on the schedule when a session is stored, and fetches it', async () => {
    render(<Root />)
    expect(await screen.findByText("Where's Alex?")).toBeTruthy()
    expect(fetchSchedule).toHaveBeenCalledTimes(1)
  })

  it('shows sign-in, and fetches nothing, when no session is stored', () => {
    vi.mocked(session.hasStoredSession).mockReturnValue(false)
    render(<Root />)
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy()
    expect(fetchSchedule).not.toHaveBeenCalled()
  })

  it('moves from sign-in to the schedule once signed in', async () => {
    vi.mocked(session.hasStoredSession).mockReturnValue(false)
    render(<Root />)
    fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'pilot@example.com' } })
    fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'test-password' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!)
    expect(await screen.findByText("Where's Alex?")).toBeTruthy()
  })
})

describe('Root: the demo', () => {
  beforeEach(() => window.history.replaceState(null, '', '/?demo=1&scene=flying'))

  it('keeps the demo off this device and away from CrewLu Cloud', async () => {
    render(<Root />)
    expect(await screen.findByText("Where's Alex?")).toBeTruthy()
    expect(cached()).toBeNull()
    expect(fetchSchedule).not.toHaveBeenCalled()
    expect(session.onSignedOut).not.toHaveBeenCalled()
  })

  it('leaves the demo for the plain address', async () => {
    render(<Root />)
    fireEvent.click(await screen.findByRole('button', { name: 'Exit demo' }))
    await waitFor(() => expect(window.location.search).toBe(''))
  })
})

describe('Root: ending the session', () => {
  it('asks before signing out, and stays put if the visitor cancels', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    render(<Root />)
    await screen.findByText("Where's Alex?")
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(window.confirm).toHaveBeenCalledWith('Sign out on this device?')
    expect(session.signOut).not.toHaveBeenCalled()
    expect(screen.getByText("Where's Alex?")).toBeTruthy()
  })

  it('signs out on this device and forgets the schedule', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    render(<Root />)
    await screen.findByText("Where's Alex?")
    await waitFor(() => expect(cached()).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy()
    expect(session.signOut).toHaveBeenCalledTimes(1)
    expect(cached()).toBeNull()
  })

  it('still forgets the schedule when signing out fails', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(session.signOut).mockRejectedValue(new Error('offline'))
    render(<Root />)
    await screen.findByText("Where's Alex?")
    await waitFor(() => expect(cached()).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy()
    expect(cached()).toBeNull()
    error.mockRestore()
  })

  it('clears this device and returns to sign-in when the session ends elsewhere', async () => {
    let endedElsewhere!: () => void
    vi.mocked(session.onSignedOut).mockImplementation((onOut) => {
      endedElsewhere = onOut
      return () => {}
    })
    render(<Root />)
    await screen.findByText("Where's Alex?")
    await waitFor(() => expect(cached()).not.toBeNull())
    await act(async () => endedElsewhere())
    expect(cached()).toBeNull()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy()
  })

  it('ends the session when CrewLu Cloud rejects it', async () => {
    vi.mocked(fetchSchedule).mockRejectedValue(new ScheduleFetchError('JWT expired', 401, 'PGRST301'))
    render(<Root />)
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy()
    expect(session.signOut).toHaveBeenCalledTimes(1)
  })
})

describe('Root: an all-empty answer from CrewLu Cloud', () => {
  it('signs out when the session is gone, since row-level security answers that with empty tables', async () => {
    vi.mocked(fetchSchedule).mockImplementation(async () => nothing())
    vi.mocked(session.hasLiveSession).mockResolvedValue(false)
    vi.mocked(session.hasSession).mockResolvedValue(false)
    render(<Root />)
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy()
    expect(session.signOut).toHaveBeenCalledTimes(1)
  })

  it('keeps the session and the cached schedule through a sign-in outage', async () => {
    localScheduleCache().save(alex())
    vi.mocked(fetchSchedule).mockImplementation(async () => nothing())
    vi.mocked(session.hasLiveSession).mockResolvedValue(false)
    vi.mocked(session.hasSession).mockResolvedValue(true)
    render(<Root />)
    expect(await screen.findByText("Where's Alex?")).toBeTruthy()
    expect(await screen.findByText("Couldn't reach CrewLu Cloud — will retry")).toBeTruthy()
    expect(session.signOut).not.toHaveBeenCalled()
    expect(cached()).not.toBeNull()
  })

  it('shows the empty state for a signed-in account with nothing in CrewLu Cloud', async () => {
    vi.mocked(fetchSchedule).mockImplementation(async () => nothing())
    render(<Root />)
    expect(await screen.findByText('No schedule in CrewLu Cloud yet')).toBeTruthy()
    expect(session.signOut).not.toHaveBeenCalled()
  })
})
