// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { joinWithLink } from '../../src/partner/join'
import { PASSWORD_SIGN_IN_ENDED } from '../../src/partner/messages'
import { localPartnerStore } from '../../src/partner/store'
import { Root } from '../../src/ui/Root'
import { example, fakeDoor, key, memoryStorage, PARTNER_A, PARTNER_B } from '../fixtures/partner'

// The airport list is a fixture, so these tests fetch nothing; every Crewlu Cloud call goes to the fake door.
vi.mock('../../src/ui/hooks/useAirports', async () => {
  const { testAirports } = await import('../fixtures/airports')
  return { useAirports: () => testAirports }
})

// joinWithLink as it is, which one test makes throw: it promises never to, and Root has a net in case it ever does.
vi.mock('../../src/partner/join', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/partner/join')>()
  return { ...actual, joinWithLink: vi.fn(actual.joinWithLink) }
})

const CONNECTED_NOTE = 'Connected on this browser. Add it to your Home Screen to keep it handy.'
const COULDNT_CONNECT = "Couldn't connect. Check your connection and try again."
const SAM = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

/** Another pilot's summary, as partner SAM gets it: the pilot is Sam. */
const samStatus = () => ({ ...example('home'), pilotId: 'SAM-PILOT', pilotFirstName: 'Sam' })

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

/** Sam's invite link, for partner SAM, and Sam's summary. */
function addSam(f: ReturnType<typeof fakeDoor>) {
  f.invites.set('invite-sam', SAM)
  f.summaries.set(SAM, { updatedAt: 's1', status: samStatus() })
}

/** The page's own words, in its <main>: Root's live region, outside it, says some of them again for screen readers. */
const page = () => within(screen.getByRole('main'))
/** Root's live region: what a screen reader hears as the page changes. */
const region = () => screen.getByRole('status')
/** Waits for the poll that's out to answer: the Refresh button is off while one is. */
const pollAnswered = () =>
  waitFor(() => expect((screen.getByRole('button', { name: 'Refresh' }) as HTMLButtonElement).disabled).toBe(false))
/** Lets everything under way finish: the fake door answers at once, so one turn of the event loop is enough. */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)))

/** How to put back what stub() changed: each runs after its test, so no other test sees the stub. */
const restores: Array<() => void> = []
/** Makes `object[name]` read `get()` until the test ends. */
function stub(object: object, name: string, get: () => unknown) {
  const own = Object.getOwnPropertyDescriptor(object, name)
  Object.defineProperty(object, name, { configurable: true, get })
  restores.push(() => {
    if (own) Object.defineProperty(object, name, own)
    else Reflect.deleteProperty(object, name)
  })
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  localStorage.clear()
  // happy-dom says it is an automated browser, as it is. These tests are a person's browser unless they say otherwise.
  stub(navigator, 'webdriver', () => false)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  for (const restore of restores.splice(0).reverse()) restore()
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

  it('tells a browser that used the password sign-in that it has ended, during that load only', () => {
    localStorage.setItem('crewluve-auth', '{"access_token":"old"}')
    const { f, store } = setUp()
    const { unmount } = render(<Root door={f.door} store={store} />)
    expect(page().getByText(PASSWORD_SIGN_IN_ENDED)).toBeTruthy()
    expect(region().textContent).toBe(PASSWORD_SIGN_IN_ENDED)
    expect(localStorage.getItem('crewluve-auth')).toBeNull()
    unmount()
    render(<Root door={f.door} store={store} />) // the next load
    expect(screen.queryAllByText(PASSWORD_SIGN_IN_ENDED)).toEqual([])
  })

  it('says nothing about the password to a browser that kept only the old schedule cache', () => {
    localStorage.setItem('crewluve.schedule.v1', '{}')
    const { f, store } = setUp()
    render(<Root door={f.door} store={store} />)
    expect(screen.queryAllByText(PASSWORD_SIGN_IN_ENDED)).toEqual([])
    expect(localStorage.getItem('crewluve.schedule.v1')).toBeNull()
  })

  it('joins with the invite link in the address, and takes the link out of the address', async () => {
    const { f, store } = setUp()
    window.history.replaceState(null, '', '/join#t=invite-a')
    render(<Root door={f.door} store={store} />)
    expect(page().getByText('Connecting…')).toBeTruthy()
    expect(`${window.location.pathname}${window.location.hash}`).toBe('/')
    expect(await screen.findByText("Where's Dad?")).toBeTruthy()
    expect(page().getByText(CONNECTED_NOTE)).toBeTruthy()
    expect(store.device()?.partnerId).toBe(PARTNER_A)
    expect(f.calls[0]).toMatch(/^join invite-a [0-9a-f]{64} /)
  })

  it("keeps a join's connected note after the first poll, which answers for the same partner", async () => {
    const { f, store } = setUp()
    window.history.replaceState(null, '', '/join#t=invite-a')
    render(<Root door={f.door} store={store} />)
    expect(await screen.findByText("Where's Dad?")).toBeTruthy()
    await pollAnswered()
    expect(f.calls.filter((call) => call.startsWith('view'))).toHaveLength(2) // the join's read, then the first poll
    expect(page().getByText(CONNECTED_NOTE)).toBeTruthy()
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

  it('joins with a link that arrives in the address while the page is open, and takes the link out of the address', async () => {
    const { f, store } = setUp()
    render(<Root door={f.door} store={store} />)
    await act(async () => {
      window.history.replaceState(null, '', '/#t=invite-a')
      window.dispatchEvent(new Event('hashchange'))
    })
    expect(await screen.findByText("Where's Dad?")).toBeTruthy()
    expect(`${window.location.pathname}${window.location.hash}`).toBe('/')
  })

  it('sends a bare /join to /, and leaves any other fragment, such as #schedule, alone', () => {
    const { f, store } = setUp()
    window.history.replaceState(null, '', '/join')
    const { unmount } = render(<Root door={f.door} store={store} />)
    expect(`${window.location.pathname}${window.location.hash}`).toBe('/')
    unmount()
    window.history.replaceState(null, '', '/#schedule')
    render(<Root door={f.door} store={store} />)
    expect(`${window.location.pathname}${window.location.hash}`).toBe('/#schedule')
  })

  it("doesn't start a second join while one is out", async () => {
    const { f, store } = setUp()
    const join = f.door.join
    const held: Array<() => void> = []
    f.door.join = async (invite, k, label) => {
      await new Promise<void>((resolve) => held.push(resolve)) // every join's answer is held
      return join(invite, k, label)
    }
    window.history.replaceState(null, '', '/join#t=invite-a')
    render(<Root door={f.door} store={store} />)
    await act(async () => {
      window.history.replaceState(null, '', '/#t=invite-b')
      window.dispatchEvent(new Event('hashchange'))
    })
    expect(held).toHaveLength(1)
    await act(async () => held[0]())
    expect(await screen.findByText("Where's Dad?")).toBeTruthy()
  })

  it('leaves Connecting… even if the join throws, which it promises never to, and can join again', async () => {
    const { f, store } = setUp()
    vi.mocked(joinWithLink).mockRejectedValueOnce(new Error('A join that broke its promise'))
    window.history.replaceState(null, '', '/join#t=invite-a')
    render(<Root door={f.door} store={store} />)
    expect((await screen.findByRole('alert')).textContent).toBe(`Couldn't Connect ${COULDNT_CONNECT}`)
    fireEvent.input(screen.getByLabelText('Code'), { target: { value: 'ab2c3d' } })
    expect(await screen.findByText("Where's Dad?")).toBeTruthy()
  })
})

describe('Root: a link in the address joins only for a person', () => {
  it("doesn't join for an automated browser, such as a mail scanner, and still takes the link out of the address", async () => {
    const { f, store } = setUp()
    stub(navigator, 'webdriver', () => true)
    window.history.replaceState(null, '', '/join#t=invite-a')
    render(<Root door={f.door} store={store} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Welcome to CrewLuve')
    expect(`${window.location.pathname}${window.location.hash}`).toBe('/')
    await settle()
    expect(f.calls).toEqual([])
  })

  it('keeps a connected automated browser on its pilot, with no join, for a link at load or by hashchange', async () => {
    const { f, store } = connectedAsB()
    stub(navigator, 'webdriver', () => true)
    window.history.replaceState(null, '', '/join#t=invite-a')
    render(<Root door={f.door} store={store} />)
    expect(screen.getByText("Where's Alex?")).toBeTruthy()
    expect(`${window.location.pathname}${window.location.hash}`).toBe('/')
    await act(async () => {
      window.history.replaceState(null, '', '/#t=invite-a')
      window.dispatchEvent(new Event('hashchange'))
    })
    await settle()
    expect(`${window.location.pathname}${window.location.hash}`).toBe('/')
    expect(f.calls.filter((call) => !call.startsWith('view'))).toEqual([]) // its own polls, and nothing else
    expect(screen.getByText("Where's Alex?")).toBeTruthy()
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_B })
  })

  it('waits for a hidden page to be shown before it joins, and joins once', async () => {
    const { f, store } = setUp()
    let visibility: DocumentVisibilityState = 'hidden'
    stub(document, 'visibilityState', () => visibility)
    window.history.replaceState(null, '', '/join#t=invite-a')
    render(<Root door={f.door} store={store} />)
    await settle()
    expect(f.calls).toEqual([])
    expect(page().getByText('Connecting…')).toBeTruthy()
    expect(`${window.location.pathname}${window.location.hash}`).toBe('/')
    visibility = 'visible'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(await screen.findByText("Where's Dad?")).toBeTruthy()
    // It stopped listening once the join had started: another return to the page joins nothing more.
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await settle()
    expect(f.calls.filter((call) => call.startsWith('join'))).toHaveLength(1)
  })

  it('waits for a prerendered page to be shown before it joins', async () => {
    const { f, store } = setUp()
    let prerendering = true
    stub(document, 'prerendering', () => prerendering)
    window.history.replaceState(null, '', '/join#t=invite-a')
    render(<Root door={f.door} store={store} />)
    await settle()
    expect(f.calls).toEqual([])
    expect(page().getByText('Connecting…')).toBeTruthy()
    prerendering = false
    await act(async () => {
      document.dispatchEvent(new Event('prerenderingchange'))
    })
    expect(await screen.findByText("Where's Dad?")).toBeTruthy()
  })

  it('waits in the same way for a link that arrives by hashchange while the page is hidden', async () => {
    const { f, store } = setUp()
    render(<Root door={f.door} store={store} />)
    let visibility: DocumentVisibilityState = 'hidden'
    stub(document, 'visibilityState', () => visibility)
    await act(async () => {
      window.history.replaceState(null, '', '/#t=invite-a')
      window.dispatchEvent(new Event('hashchange'))
    })
    await settle()
    expect(f.calls).toEqual([])
    expect(page().getByText('Connecting…')).toBeTruthy()
    expect(`${window.location.pathname}${window.location.hash}`).toBe('/')
    visibility = 'visible'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(await screen.findByText("Where's Dad?")).toBeTruthy()
  })

  it('stops waiting when it unmounts: a later visibilitychange or prerenderingchange joins nothing', async () => {
    const { f, store } = setUp()
    let visibility: DocumentVisibilityState = 'hidden'
    stub(document, 'visibilityState', () => visibility)
    window.history.replaceState(null, '', '/join#t=invite-a')
    const { unmount } = render(<Root door={f.door} store={store} />)
    unmount()
    visibility = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    document.dispatchEvent(new Event('prerenderingchange'))
    await settle()
    expect(f.calls).toEqual([])
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
    store.saveSummary({ partnerId: SAM, updatedAt: 's1', status: samStatus(), checkedAt: Date.now() })
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

  it("waits for the poll when the kept summary can't be read", async () => {
    const { f, store } = connectedAsB()
    store.saveSummary({ partnerId: PARTNER_B, updatedAt: 'b0', status: { schemaVersion: 99 }, checkedAt: Date.now() })
    const view = f.door.view
    let answer!: () => void
    f.door.view = async (k, since) => {
      await new Promise<void>((resolve) => (answer = resolve)) // the first poll's answer is held
      return view(k, since)
    }
    render(<Root door={f.door} store={store} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CrewLuve')
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
    expect(await waitFor(() => page().getByText('Sharing with Alex has ended.'))).toBeTruthy()
    expect(store.device()).toBeNull()
  })

  it('goes back to a plain welcome screen when another tab disconnected', async () => {
    const { f, store } = connectedAsB()
    render(<Root door={f.door} store={store} />)
    await pollAnswered()
    store.forget() // another tab's Disconnect
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome to CrewLuve' })).toBeTruthy()
    expect(screen.queryAllByText(/has ended/)).toEqual([])
  })

  it("keeps the status, and says why, when a link doesn't connect", async () => {
    const { f, store } = connectedAsB()
    window.history.replaceState(null, '', '/join#t=gone')
    render(<Root door={f.door} store={store} />)
    expect(await waitFor(() => page().getByText("This invite link doesn't work anymore. You're still connected to Alex."))).toBeTruthy()
    expect(screen.getByText("Where's Alex?")).toBeTruthy()
  })

  it("shows no connected note for this browser's own link again", async () => {
    const { f, store } = connectedAsB()
    window.history.replaceState(null, '', '/join#t=invite-b')
    render(<Root door={f.door} store={store} />)
    expect(await screen.findByText("Where's Alex?")).toBeTruthy()
    expect(f.calls[0]).toMatch(new RegExp(`^join invite-b ${key(1)} `))
    expect(screen.queryAllByText(CONNECTED_NOTE)).toEqual([])
  })

  it("asks before following another pilot's link, and stays on a no", async () => {
    const { f, store } = connectedAsB()
    addSam(f)
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
    addSam(f)
    vi.stubGlobal('confirm', vi.fn(() => false))
    window.history.replaceState(null, '', '/join#t=invite-sam')
    render(<Root door={f.door} store={store} />)
    expect(await waitFor(() => page().getByText('Sharing with Alex has ended.'))).toBeTruthy()
    expect(store.device()).toBeNull()
  })

  it("drops the join's line once a poll follows the door to another pilot", async () => {
    const { f, store } = connectedAsB()
    f.devices.clear() // the pilot removed this browser in CrewLu
    addSam(f)
    vi.stubGlobal('confirm', vi.fn(() => true))
    f.network.loseNext = true // the join's answer is lost, after the door has given this browser's key to Sam's partner
    const view = f.door.view
    let asked = false
    let answer!: () => void
    f.door.view = async (k, since) => {
      asked = true
      await new Promise<void>((resolve) => (answer = resolve)) // the first poll's answer is held
      return view(k, since)
    }
    window.history.replaceState(null, '', '/join#t=invite-sam')
    render(<Root door={f.door} store={store} />)
    expect(await screen.findByText("Where's Alex?")).toBeTruthy()
    expect(page().getByText(COULDNT_CONNECT)).toBeTruthy()
    await waitFor(() => expect(asked).toBe(true)) // the first poll is out: this page's effects run a frame after it shows
    await act(async () => answer())
    expect(await screen.findByText("Where's Sam?")).toBeTruthy()
    expect(screen.queryAllByText(COULDNT_CONNECT)).toEqual([])
  })

  it('lets a poll that answers after a join replaced the page change nothing there', async () => {
    const { f, store } = connectedAsB()
    addSam(f)
    vi.stubGlobal('confirm', vi.fn(() => true))
    const view = f.door.view
    let held = false
    let answer!: () => void
    f.door.view = async (k, since) => {
      if (!held) {
        held = true
        await new Promise<void>((resolve) => (answer = resolve)) // the first poll's answer is held
      }
      return view(k, since)
    }
    render(<Root door={f.door} store={store} />)
    await act(async () => {
      window.history.replaceState(null, '', '/#t=invite-sam')
      window.dispatchEvent(new Event('hashchange'))
    })
    expect(await screen.findByText("Where's Sam?")).toBeTruthy()
    await pollAnswered() // the new page's own first poll
    await act(async () => answer()) // the old page's poll answers now, with the summary the join stored
    await settle()
    expect(page().getByText(CONNECTED_NOTE)).toBeTruthy()
    expect(store.device()?.partnerId).toBe(SAM)
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
    // That Disconnect is over, so when the pilot then removes this browser, the page says sharing has ended.
    f.network.down = false
    f.devices.clear()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(await waitFor(() => page().getByText('Sharing with Alex has ended.'))).toBeTruthy()
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
    await settle() // the refresh has finished
    expect(screen.queryAllByText(/has ended/)).toEqual([])
    await act(async () => finishLeave())
    expect(await screen.findByText('Welcome to CrewLuve')).toBeTruthy()
    expect(screen.queryAllByText(/has ended/)).toEqual([])
  })

  it('asks nothing and sends nothing for a second click while the leave is out', async () => {
    const { f, store } = connectedAsB()
    const confirm = vi.fn(() => true)
    vi.stubGlobal('confirm', confirm)
    render(<Root door={f.door} store={store} />)
    await pollAnswered()
    const leaves: string[] = []
    let finishLeave!: () => void
    f.door.leave = async (k) => {
      leaves.push(k)
      await new Promise<void>((resolve) => (finishLeave = resolve))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(leaves).toEqual([key(1)])
    await act(async () => finishLeave())
    expect(await screen.findByText('Welcome to CrewLuve')).toBeTruthy()
  })

  it('keeps a device that a link in the address connected while the leave was out', async () => {
    const { f, store } = connectedAsB()
    addSam(f)
    vi.stubGlobal('confirm', vi.fn(() => true))
    render(<Root door={f.door} store={store} />)
    await pollAnswered()
    const leave = f.door.leave
    let held = false
    let finishLeave!: () => void
    f.door.leave = async (k) => {
      if (!held) {
        held = true
        await new Promise<void>((resolve) => (finishLeave = resolve)) // Disconnect's leave is held
      }
      return leave(k)
    }
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    await act(async () => {
      window.history.replaceState(null, '', '/#t=invite-sam')
      window.dispatchEvent(new Event('hashchange'))
    })
    expect(await screen.findByText("Where's Sam?")).toBeTruthy()
    const joined = store.device()
    expect(joined?.partnerId).toBe(SAM)
    await act(async () => finishLeave())
    await settle()
    expect(store.device()).toEqual(joined)
    expect(f.devices.get(joined!.key)).toBe(SAM)
    expect(screen.getByText("Where's Sam?")).toBeTruthy()
  })

  it('keeps a device that another tab connected while the leave was out', async () => {
    const { f, store } = connectedAsB()
    addSam(f)
    const confirm = vi.fn(() => true)
    vi.stubGlobal('confirm', confirm)
    render(<Root door={f.door} store={store} />)
    await pollAnswered()
    let finishLeave!: () => void
    f.door.leave = async (k) => {
      await new Promise<void>((resolve) => (finishLeave = resolve)) // Disconnect's leave is held
      f.devices.delete(k)
    }
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    // Another tab's join, as joinWithLink ends one: a new device, and its summary.
    f.devices.set(key(2), SAM)
    store.saveDevice({ key: key(2), partnerId: SAM })
    store.saveSummary({ partnerId: SAM, updatedAt: 's1', status: samStatus(), checkedAt: Date.now() })
    await act(async () => finishLeave())
    await settle()
    expect(store.device()).toEqual({ key: key(2), partnerId: SAM })
    // This page stays, and its next poll follows the device the other tab connected.
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(await screen.findByText("Where's Sam?")).toBeTruthy()
    // And its Disconnect works again: it asks, here to be told no.
    confirm.mockReturnValueOnce(false)
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(confirm).toHaveBeenCalledTimes(2)
  })

  it("keeps a device another tab connected with this browser's own key, which the leave had freed", async () => {
    const { f, store } = connectedAsB()
    addSam(f)
    vi.stubGlobal('confirm', vi.fn(() => true))
    render(<Root door={f.door} store={store} />)
    await pollAnswered()
    let finishLeave!: () => void
    f.door.leave = async (k) => {
      f.devices.delete(k) // the leave lands at once,
      await new Promise<void>((resolve) => (finishLeave = resolve)) // but its answer is slow
    }
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    // Another tab's join sent key(1), which the leave had just freed, with Sam's link, and saved it for Sam's partner.
    f.devices.set(key(1), SAM)
    store.saveDevice({ key: key(1), partnerId: SAM })
    store.saveSummary({ partnerId: SAM, updatedAt: 's1', status: samStatus(), checkedAt: Date.now() })
    await act(async () => finishLeave())
    await settle()
    expect(store.device()).toEqual({ key: key(1), partnerId: SAM })
  })
})

describe('Root: what a screen reader hears', () => {
  it('reads each change from one live region: Connecting…, the connected note, then that sharing has ended', async () => {
    const { f, store } = setUp()
    window.history.replaceState(null, '', '/join#t=invite-a')
    render(<Root door={f.door} store={store} />)
    const live = region()
    expect(live.textContent).toBe('Connecting…')
    expect(await screen.findByText("Where's Dad?")).toBeTruthy()
    expect(live.textContent).toBe(CONNECTED_NOTE)
    await pollAnswered()
    f.devices.clear() // the pilot removed this browser in CrewLu
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome to CrewLuve' })).toBeTruthy()
    expect(live.textContent).toBe('Sharing with Dad has ended.')
    // The same region all along, on the page before its words changed: one that arrives holding its words is often
    // skipped.
    expect(region()).toBe(live)
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

  it("deletes the password sign-in's leftovers too", () => {
    localStorage.setItem('crewluve-auth', '{"access_token":"old"}')
    localStorage.setItem('crewluve.schedule.v1', '{}')
    const { f, store } = setUp()
    render(<Root door={f.door} store={store} />)
    expect([localStorage.getItem('crewluve-auth'), localStorage.getItem('crewluve.schedule.v1')]).toEqual([null, null])
  })

  it('leaves the demo for the plain address', async () => {
    const { f, store } = setUp()
    render(<Root door={f.door} store={store} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Exit demo' }))
    await waitFor(() => expect(window.location.search).toBe(''))
  })
})
