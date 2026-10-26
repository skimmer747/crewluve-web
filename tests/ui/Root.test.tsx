// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { localPartnerStore } from '../../src/partner/store'
import { Root } from '../../src/ui/Root'
import { example, fakeDoor, key, memoryStorage, PARTNER_A, PARTNER_B } from '../fixtures/partner'

// The airport list is a fixture, so these tests fetch nothing; every Crewlu Cloud call goes to the fake door.
vi.mock('../../src/ui/hooks/useAirports', async () => {
  const { testAirports } = await import('../fixtures/airports')
  return { useAirports: () => testAirports }
})

const CONNECTED_NOTE = 'Connected on this browser. Add it to your Home Screen to keep it handy.'
const SAM = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

/** Crewlu Cloud with Alex's two partners, A (who calls Alex "Dad") and B, and this browser's own storage. */
function setUp() {
  const f = fakeDoor()
  f.invites.set('invite-a', PARTNER_A).set('invite-b', PARTNER_B)
  f.codes.set('AB2C3D', PARTNER_A)
  f.summaries.set(PARTNER_A, { updatedAt: 'a1', status: example('display-names', 'A') })
  f.summaries.set(PARTNER_B, { updatedAt: 'b1', status: example('home', 'B') })
  const storage = memoryStorage()
  return { f, storage, store: localPartnerStore(storage) }
}

/** The same, with this browser already connected as partner B, which sees Alex. */
function connectedAsB() {
  const s = setUp()
  s.f.devices.set(key(1), PARTNER_B)
  s.store.saveDevice({ key: key(1), partnerId: PARTNER_B })
  s.store.saveSummary({ partnerId: PARTNER_B, updatedAt: 'b1', status: example('home', 'B'), checkedAt: Date.now() })
  return s
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Root: a browser that follows no one', () => {
  it('shows the welcome screen, and calls nothing', () => {
    const { f, store } = setUp()
    render(<Root door={f.door} store={store} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Welcome to CrewLuve')
    expect(f.calls).toEqual([])
  })

  it("deletes the password sign-in's leftovers", () => {
    localStorage.setItem('crewluve-auth', '{"access_token":"old"}')
    localStorage.setItem('crewluve.schedule.v1', '{}')
    const { f, store } = setUp()
    render(<Root door={f.door} store={store} />)
    expect([localStorage.getItem('crewluve-auth'), localStorage.getItem('crewluve.schedule.v1')]).toEqual([null, null])
  })

  it('joins with the invite link in the address, and takes the link out of the address', async () => {
    const { f, store } = setUp()
    window.history.replaceState(null, '', '/join#t=invite-a')
    render(<Root door={f.door} store={store} />)
    expect(screen.getByText('Connecting…')).toBeTruthy()
    expect(`${window.location.pathname}${window.location.hash}`).toBe('/')
    expect(await screen.findByText("Where's Dad?")).toBeTruthy()
    expect(screen.getByText(CONNECTED_NOTE)).toBeTruthy()
    expect(store.device()?.partnerId).toBe(PARTNER_A)
    expect(f.calls[0]).toMatch(/^join invite-a [0-9a-f]{64} /)
  })

  it('redeems the code typed into the boxes', async () => {
    const { f, store } = setUp()
    render(<Root door={f.door} store={store} />)
    fireEvent.input(screen.getByLabelText('Code'), { target: { value: 'ab2c3d' } })
    expect(await screen.findByText("Where's Dad?")).toBeTruthy()
    expect(f.calls[0]).toMatch(/^redeem AB2C3D /)
  })

  it("comes back to the welcome screen with the reason when a link doesn't connect", async () => {
    const { f, store } = setUp()
    window.history.replaceState(null, '', '/join#t=gone')
    render(<Root door={f.door} store={store} />)
    expect((await screen.findByRole('alert')).textContent).toBe("Invite Link Not Working This invite link doesn't work anymore. Ask your pilot to send it again.")
    expect(store.device()).toBeNull()
  })

  it('comes back from a code the door refuses with the reason and empty boxes', async () => {
    const { f, store } = setUp()
    const { container } = render(<Root door={f.door} store={store} />)
    fireEvent.input(screen.getByLabelText('Code'), { target: { value: 'zzzzzz' } }) // a code the door doesn't know
    expect((await screen.findByRole('alert')).textContent).toBe(
      "Code Not Working That code didn't work. Codes last 10 minutes and work once. Make a new one on your other device.",
    )
    // Root shows Connecting between attempts, which remounts the welcome screen: that is what empties the boxes (spec §8).
    expect([...container.querySelectorAll('.code-box')].map((box) => box.textContent)).toEqual(['', '', '', '', '', ''])
    expect((screen.getByLabelText('Code') as HTMLInputElement).value).toBe('')
    expect(f.calls[0]).toMatch(/^redeem ZZZZZZ /)
    expect(store.device()).toBeNull()
  })

  it('joins with a link that arrives in the address while the page is open', async () => {
    const { f, store } = setUp()
    render(<Root door={f.door} store={store} />)
    await act(async () => {
      window.history.replaceState(null, '', '/#t=invite-a')
      window.dispatchEvent(new Event('hashchange'))
    })
    expect(await screen.findByText("Where's Dad?")).toBeTruthy()
  })
})

describe('Root: a connected browser', () => {
  it('shows the kept summary at once, then asks only for a change', async () => {
    const { f, store } = connectedAsB()
    render(<Root door={f.door} store={store} />)
    expect(screen.getByText("Where's Alex?")).toBeTruthy()
    await waitFor(() => expect(f.calls).toEqual([`view ${key(1)} b1`]))
  })

  it("doesn't show a kept summary that's another partner's, only the poll's answer", async () => {
    const { f, store } = connectedAsB()
    // The summary kept here is another partner's, of a pilot called Sam, though the device is still B's.
    store.saveSummary({ partnerId: SAM, updatedAt: 's1', status: { ...example('home'), pilotId: 'SAM-PILOT', pilotFirstName: 'Sam' }, checkedAt: Date.now() })
    const view = f.door.view
    let answer!: () => void
    f.door.view = async (k, since) => {
      await new Promise<void>((resolve) => (answer = resolve)) // the first poll's answer is held
      return view(k, since)
    }
    render(<Root door={f.door} store={store} />)
    expect(screen.queryAllByText(/\bSam\b/)).toEqual([])
    await act(async () => answer())
    expect(await screen.findByText("Where's Alex?")).toBeTruthy()
  })

  it("waits for the pilot's first summary", () => {
    const { f, store } = connectedAsB()
    f.summaries.delete(PARTNER_B)
    store.saveSummary({ partnerId: PARTNER_B, updatedAt: null, status: null, checkedAt: Date.now() })
    render(<Root door={f.door} store={store} />)
    expect(screen.getByText("Waiting for your pilot's first update…")).toBeTruthy()
  })

  it('goes back to the welcome screen, naming the pilot, when sharing ends', async () => {
    const { f, store } = connectedAsB()
    f.devices.clear() // the pilot removed this browser in CrewLu
    render(<Root door={f.door} store={store} />)
    expect(await screen.findByText('Sharing with Alex has ended.')).toBeTruthy()
    expect(store.device()).toBeNull()
  })

  it("keeps the status, and says why, when a link doesn't connect", async () => {
    const { f, store } = connectedAsB()
    window.history.replaceState(null, '', '/join#t=gone')
    render(<Root door={f.door} store={store} />)
    expect(await screen.findByText("This invite link doesn't work anymore. You're still connected to Alex.")).toBeTruthy()
    expect(screen.getByText("Where's Alex?")).toBeTruthy()
  })

  it("asks before following another pilot's link, and stays on a no", async () => {
    const { f, store } = connectedAsB()
    f.invites.set('invite-sam', SAM)
    f.summaries.set(SAM, { updatedAt: 's1', status: { ...example('home'), pilotId: 'SAM-PILOT', pilotFirstName: 'Sam' } })
    const confirm = vi.fn(() => false)
    vi.stubGlobal('confirm', confirm)
    window.history.replaceState(null, '', '/join#t=invite-sam')
    render(<Root door={f.door} store={store} />)
    expect(await screen.findByText("Where's Alex?")).toBeTruthy()
    expect(confirm).toHaveBeenCalledWith("Switch to Sam?\n\nYou'll stop seeing Alex's status in this browser.")
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_B })
  })

  it('says sharing has ended when a link shows the pilot had removed this browser, and the partner stays put', async () => {
    const { f, store } = connectedAsB()
    f.devices.clear() // the pilot removed this browser in CrewLu
    f.invites.set('invite-sam', SAM)
    f.summaries.set(SAM, { updatedAt: 's1', status: { ...example('home'), pilotId: 'SAM-PILOT', pilotFirstName: 'Sam' } })
    vi.stubGlobal('confirm', vi.fn(() => false))
    window.history.replaceState(null, '', '/join#t=invite-sam')
    render(<Root door={f.door} store={store} />)
    expect(await screen.findByText('Sharing with Alex has ended.')).toBeTruthy()
    expect(store.device()).toBeNull()
  })
})

describe('Root: Disconnect', () => {
  it('asks first, and stays on a no', () => {
    const { f, store } = connectedAsB()
    const confirm = vi.fn(() => false)
    vi.stubGlobal('confirm', confirm)
    render(<Root door={f.door} store={store} />)
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(confirm).toHaveBeenCalledWith(
      "Disconnect from Alex?\n\nYou'll stop seeing Alex's status in this browser. To connect again, open the invite link Alex sent you.",
    )
    expect(screen.getByText("Where's Alex?")).toBeTruthy()
    expect(f.calls.some((call) => call.startsWith('leave'))).toBe(false)
  })

  it('leaves, forgets this browser, and shows the welcome screen', async () => {
    const { f, store } = connectedAsB()
    vi.stubGlobal('confirm', vi.fn(() => true))
    render(<Root door={f.door} store={store} />)
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(await screen.findByText('Welcome to CrewLuve')).toBeTruthy()
    expect(f.calls).toContain(`leave ${key(1)}`)
    expect([store.device(), store.summary()]).toEqual([null, null])
  })

  it('stays connected, and says so, when the leave gets no answer', async () => {
    const { f, store } = connectedAsB()
    vi.stubGlobal('confirm', vi.fn(() => true))
    const alert = vi.fn()
    vi.stubGlobal('alert', alert)
    render(<Root door={f.door} store={store} />)
    await waitFor(() => expect(f.calls.length).toBe(1)) // the first poll has answered
    f.network.down = true
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    await waitFor(() => expect(alert).toHaveBeenCalledWith("Couldn't disconnect. Check your connection and try again."))
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_B })
    expect(screen.getByText("Where's Alex?")).toBeTruthy()
  })

  it("doesn't call it sharing ended when a poll finds the device gone while Disconnect's leave is out", async () => {
    const { f, store } = connectedAsB()
    vi.stubGlobal('confirm', vi.fn(() => true))
    render(<Root door={f.door} store={store} />)
    await waitFor(() => expect(f.calls.length).toBe(1)) // the first poll has answered
    let finishLeave!: () => void
    f.door.leave = async (k) => {
      f.devices.delete(k)
      await new Promise<void>((resolve) => (finishLeave = resolve))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(f.calls).toEqual([`view ${key(1)} b1`, `view ${key(1)} b1`]))
    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0))) // the refresh has finished
    expect(screen.queryByText(/has ended/)).toBeNull()
    await act(async () => finishLeave())
    expect(await screen.findByText('Welcome to CrewLuve')).toBeTruthy()
    expect(screen.queryByText(/has ended/)).toBeNull()
  })
})

describe('Root: the demo', () => {
  beforeEach(() => window.history.replaceState(null, '', '/?demo=1&scene=flying'))

  it('shows the sample pilot, calls nothing, and keeps nothing on this browser', async () => {
    const { f, store, storage } = setUp()
    render(<Root door={f.door} store={store} />)
    expect(await screen.findByText("Where's Alex?")).toBeTruthy()
    expect(f.calls).toEqual([])
    expect(storage.data.size).toBe(0)
  })

  it('leaves the demo for the plain address', async () => {
    const { f, store } = setUp()
    render(<Root door={f.door} store={store} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Exit demo' }))
    await waitFor(() => expect(window.location.search).toBe(''))
  })
})
