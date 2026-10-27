// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NO_LINK_YET, PASSWORD_SIGN_IN_ENDED } from '../../src/partner/messages'
import { Connecting, Welcome } from '../../src/ui/Welcome'
import { stubAnimationFrames } from '../fixtures/ui'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const NOT_AN_INVITE_LINK = "Not an Invite Link That doesn't look like an invite link."

/** Presses Connect. It has to be on by then: a button that never turned on would pass a test that only submits the form. */
const connect = () => {
  const button = screen.getByRole('button', { name: 'Connect' }) as HTMLButtonElement
  expect(button.disabled).toBe(false)
  fireEvent.click(button)
}

/** What the six boxes show. */
const boxes = (container: Element) => [...container.querySelectorAll('.code-box')].map((box) => box.textContent)

/** The code field's selection a frame after `event`, with the code k7m typed and the selection set as given. */
async function selectionAfter(event: 'focus' | 'click' | 'keyUp', from: number, to: number) {
  const frames = stubAnimationFrames()
  render(<Welcome message={null} ended={null} onJoin={() => {}} />)
  const field = screen.getByLabelText('Code') as HTMLInputElement
  fireEvent.input(field, { target: { value: 'k7m' } })
  field.setSelectionRange(from, to)
  fireEvent[event](field)
  expect([field.selectionStart, field.selectionEnd]).toEqual([from, to]) // nothing moves before the frame
  await frames.frame(0)
  return [field.selectionStart, field.selectionEnd]
}

describe('Welcome (piece 5a §8)', () => {
  it('greets like the app and says how to connect', () => {
    render(<Welcome message={null} ended={null} onJoin={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Welcome to CrewLuve')
    expect(screen.getByText('Stay connected with your pilot')).toBeTruthy()
    expect(screen.getByText('Open the invite link your pilot sent you, on this device.')).toBeTruthy()
    expect(screen.getByText('or type the code from CrewLuve on another device')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Try Demo' }).getAttribute('href')).toBe('?demo=1')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it("connects with a pasted invite link, even inside CrewLu's whole message", () => {
    const onJoin = vi.fn()
    render(<Welcome message={null} ended={null} onJoin={onJoin} />)
    fireEvent.input(screen.getByLabelText('Paste Invite Link'), {
      target: { value: 'Tap this link to see my status in Crewluve. https://crewluve.crewlu.net/join#t=abc123' },
    })
    connect()
    expect(onJoin).toHaveBeenCalledWith({ kind: 'invite', invite: 'abc123' })
  })

  it('says Not an Invite Link for pasted text with no link, and joins nothing', () => {
    const onJoin = vi.fn()
    render(<Welcome message={null} ended={null} onJoin={onJoin} />)
    fireEvent.input(screen.getByLabelText('Paste Invite Link'), { target: { value: 'hello' } })
    connect()
    expect(onJoin).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe(NOT_AN_INVITE_LINK)
  })

  it("connects with an invite's bare token pasted on its own", () => {
    const onJoin = vi.fn()
    render(<Welcome message={null} ended={null} onJoin={onJoin} />)
    fireEvent.input(screen.getByLabelText('Paste Invite Link'), { target: { value: '0123456789abcdef0123456789abcdef' } })
    connect()
    expect(onJoin).toHaveBeenCalledWith({ kind: 'invite', invite: '0123456789abcdef0123456789abcdef' })
  })

  it.each(['K7M Q2X', 'k7m-q2x', 'K7MQ2X'])('connects with a bare code pasted as "%s", as Crewluve\'s paste box does', (text) => {
    const onJoin = vi.fn()
    render(<Welcome message={null} ended={null} onJoin={onJoin} />)
    fireEvent.input(screen.getByLabelText('Paste Invite Link'), { target: { value: text } })
    connect()
    expect(onJoin).toHaveBeenCalledWith({ kind: 'code', code: 'K7MQ2X' })
  })

  it.each([
    ['K7MQ2', 'five characters'],
    ['K7MQ2XA', 'seven'],
    ['K0MQ2X', 'a zero, which no code has: it looks like an O'],
  ])('says Not an Invite Link for "%s" (%s), and joins nothing', (text) => {
    const onJoin = vi.fn()
    render(<Welcome message={null} ended={null} onJoin={onJoin} />)
    fireEvent.input(screen.getByLabelText('Paste Invite Link'), { target: { value: text } })
    connect()
    expect(onJoin).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe(NOT_AN_INVITE_LINK)
  })

  it('shows the alert again on a second bad paste, so a screen reader announces it again', () => {
    render(<Welcome message={null} ended={null} onJoin={() => {}} />)
    const paste = screen.getByLabelText('Paste Invite Link')
    fireEvent.input(paste, { target: { value: 'hello' } })
    connect()
    const first = screen.getByRole('alert')
    fireEvent.input(paste, { target: { value: 'hello again' } })
    expect(screen.queryByRole('alert')).toBeNull() // typing takes the old one away...
    connect()
    const second = screen.getByRole('alert') // ...so the next is a new one, which is announced
    expect(second).not.toBe(first)
    expect(second.textContent).toBe(NOT_AN_INVITE_LINK)
  })

  it('shows the same problem as a new alert when Connect is pressed again on the same paste, so it is announced again', () => {
    render(<Welcome message={null} ended={null} onJoin={() => {}} />)
    fireEvent.input(screen.getByLabelText('Paste Invite Link'), { target: { value: 'hello' } })
    connect()
    const first = screen.getByRole('alert')
    connect()
    const second = screen.getByRole('alert')
    expect(second).not.toBe(first)
    expect(second.textContent).toBe(NOT_AN_INVITE_LINK)
    expect(screen.getAllByRole('alert')).toHaveLength(1) // the old one is gone, not left beside it
  })

  it('shows the same debris pasted into the boxes twice in a row as a new alert the second time, so it is announced again', () => {
    render(<Welcome message={null} ended={null} onJoin={() => {}} />)
    const field = screen.getByLabelText('Code') as HTMLInputElement
    fireEvent.input(field, { target: { value: 'https://crewluve.crewlu.net/join' } })
    const first = screen.getByRole('alert')
    fireEvent.input(field, { target: { value: 'https://crewluve.crewlu.net/join' } })
    const second = screen.getByRole('alert')
    expect(second).not.toBe(first)
    expect(second.textContent).toBe(NOT_AN_INVITE_LINK)
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it.each(['Paste Invite Link', 'Code'])('takes the reason Root gave away when typing starts in %s', (label) => {
    render(<Welcome message={{ title: 'Too Many Tries', text: 'Too many tries. Wait a minute, then try again.' }} ended={null} onJoin={() => {}} />)
    expect(screen.getByRole('alert')).toBeTruthy()
    fireEvent.input(screen.getByLabelText(label), { target: { value: 'x' } })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps Connect off until something is pasted', () => {
    render(<Welcome message={null} ended={null} onJoin={() => {}} />)
    expect((screen.getByRole('button', { name: 'Connect' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('keeps Connect off for a paste of only spaces', () => {
    render(<Welcome message={null} ended={null} onJoin={() => {}} />)
    fireEvent.input(screen.getByLabelText('Paste Invite Link'), { target: { value: '   ' } })
    expect((screen.getByRole('button', { name: 'Connect' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('gives the phone what it needs to fill, capitalize and read the code', () => {
    const { container } = render(<Welcome message={null} ended={null} onJoin={() => {}} />)
    const field = screen.getByLabelText('Code')
    expect(field.getAttribute('autocomplete')).toBe('one-time-code')
    expect(field.getAttribute('autocapitalize')).toBe('characters')
    expect(field.getAttribute('autocorrect')).toBe('off')
    // A screen reader reads the instruction above it after "Code"; the six boxes are only a drawing of what it holds.
    expect(document.getElementById(field.getAttribute('aria-describedby') ?? '')?.textContent).toBe('or type the code from CrewLuve on another device')
    expect(container.querySelector('.code-boxes')?.getAttribute('aria-hidden')).toBe('true')
  })

  it("redeems a code on its sixth letter, keeping only the code's letters, in upper case", () => {
    const onJoin = vi.fn()
    const { container } = render(<Welcome message={null} ended={null} onJoin={onJoin} />)
    const code = screen.getByLabelText('Code')
    fireEvent.input(code, { target: { value: 'ab-2c3' } })
    expect(onJoin).not.toHaveBeenCalled()
    expect(boxes(container)).toEqual(['A', 'B', '2', 'C', '3', ''])
    fireEvent.input(code, { target: { value: 'ab-2c3d' } })
    expect(onJoin).toHaveBeenCalledWith({ kind: 'code', code: 'AB2C3D' })
  })

  it('connects with a whole code link pasted into the code boxes, not with its first six letters', () => {
    const onJoin = vi.fn()
    const { container } = render(<Welcome message={null} ended={null} onJoin={onJoin} />)
    const field = screen.getByLabelText('Code') as HTMLInputElement
    fireEvent.input(field, { target: { value: 'https://crewluve.crewlu.net/join#c=ab2c3d' } })
    expect(onJoin).toHaveBeenCalledTimes(1)
    expect(onJoin).toHaveBeenCalledWith({ kind: 'code', code: 'AB2C3D' })
    expect(field.value).toBe('') // the link isn't left in the field, which holds what the boxes show
    expect(boxes(container)).toEqual(['', '', '', '', '', ''])
  })

  it('connects with a whole invite link pasted into the code boxes too', () => {
    const onJoin = vi.fn()
    const { container } = render(<Welcome message={null} ended={null} onJoin={onJoin} />)
    const field = screen.getByLabelText('Code') as HTMLInputElement
    fireEvent.input(field, { target: { value: 'https://crewluve.crewlu.net/join#t=abc123' } })
    expect(onJoin).toHaveBeenCalledTimes(1)
    expect(onJoin).toHaveBeenCalledWith({ kind: 'invite', invite: 'abc123' })
    expect(field.value).toBe('')
    expect(boxes(container)).toEqual(['', '', '', '', '', ''])
  })

  it("connects with an invite's bare token pasted into the code boxes, sending no code, and empties them", () => {
    const onJoin = vi.fn()
    const { container } = render(<Welcome message={null} ended={null} onJoin={onJoin} />)
    const field = screen.getByLabelText('Code') as HTMLInputElement
    fireEvent.input(field, { target: { value: '0123456789abcdef0123456789abcdef' } })
    expect(onJoin.mock.calls).toEqual([[{ kind: 'invite', invite: '0123456789abcdef0123456789abcdef' }]])
    expect(field.value).toBe('')
    expect(boxes(container)).toEqual(['', '', '', '', '', ''])
  })

  it.each(['https://crewluve.crewlu.net/join', '#c=K7M'])(
    "doesn't take %s typed into the boxes for a code: nothing joins, it says so, and the boxes and the field are empty",
    (debris) => {
      const onJoin = vi.fn()
      const { container } = render(<Welcome message={null} ended={null} onJoin={onJoin} />)
      const field = screen.getByLabelText('Code') as HTMLInputElement
      fireEvent.input(field, { target: { value: 'k7' } })
      // Twice: the second time the alert is already up and there is nothing new to draw, so the field is emptied by hand.
      for (let paste = 0; paste < 2; paste++) {
        fireEvent.input(field, { target: { value: debris } })
        expect(onJoin).not.toHaveBeenCalled()
        expect(screen.getByRole('alert').textContent).toBe(NOT_AN_INVITE_LINK)
        expect(boxes(container)).toEqual(['', '', '', '', '', ''])
        expect(field.value).toBe('')
      }
    },
  )

  it.each(['k7m ', 'k7m-', 'k7mo'])('writes the code back into the field when %j adds nothing to it, so the field holds what the boxes show', (typed) => {
    const { container } = render(<Welcome message={null} ended={null} onJoin={() => {}} />)
    const field = screen.getByLabelText('Code') as HTMLInputElement
    fireEvent.input(field, { target: { value: 'k7m' } })
    fireEvent.input(field, { target: { value: typed } }) // a space, a dash or a look-alike letter: the boxes don't change
    expect(boxes(container)).toEqual(['K', '7', 'M', '', '', ''])
    expect(field.value).toBe('K7M')
  })

  it("leaves lower-case typing as it was typed, so a keyboard that is mid-word isn't rewritten", () => {
    const { container } = render(<Welcome message={null} ended={null} onJoin={() => {}} />)
    const field = screen.getByLabelText('Code') as HTMLInputElement
    fireEvent.input(field, { target: { value: 'k7' } })
    expect(field.value).toBe('k7')
    expect(boxes(container)).toEqual(['K', '7', '', '', '', ''])
  })

  it('marks the box that typing goes in next, and no other', () => {
    const { container } = render(<Welcome message={null} ended={null} onJoin={() => {}} />)
    fireEvent.input(screen.getByLabelText('Code'), { target: { value: 'k7' } })
    expect([...container.querySelectorAll('.code-box')].map((box) => box.classList.contains('next'))).toEqual([false, false, true, false, false, false])
  })

  it.each([
    ['focus', fireEvent.focus],
    ['click', fireEvent.click],
    ['keyUp', fireEvent.keyUp],
  ])('puts the caret back at the end of the code on the next frame after a %s', async (_event, fire) => {
    const frames = stubAnimationFrames()
    render(<Welcome message={null} ended={null} onJoin={() => {}} />)
    const field = screen.getByLabelText('Code') as HTMLInputElement
    fireEvent.input(field, { target: { value: 'k7m' } })
    field.setSelectionRange(1, 1) // a tap landed between two letters
    fire(field)
    expect(field.selectionStart).toBe(1) // not before the frame
    await frames.frame(0)
    expect([field.selectionStart, field.selectionEnd]).toEqual([3, 3])
  })

  it("doesn't touch a caret that is already at the end, so a keyboard that is mid-word gets no selection change", async () => {
    const frames = stubAnimationFrames()
    render(<Welcome message={null} ended={null} onJoin={() => {}} />)
    const field = screen.getByLabelText('Code') as HTMLInputElement
    fireEvent.input(field, { target: { value: 'k7m' } })
    const setSelectionRange = vi.spyOn(field, 'setSelectionRange')
    fireEvent.click(field)
    await frames.frame(0)
    expect(setSelectionRange).not.toHaveBeenCalled()
  })

  it.each<[string, 'click' | 'keyUp', number, number]>([
    ['a select-all or a double-click', 'click', 0, 3],
    ['a select-all or a double-click', 'keyUp', 0, 3],
    ['Shift+Left from the end', 'click', 2, 3],
    ['Shift+Left from the end', 'keyUp', 2, 3],
  ])("leaves %s alone after a %s, since it reaches the end and is the person's own: the next paste or letter replaces it", async (_what, event, from, to) => {
    expect(await selectionAfter(event, from, to)).toEqual([from, to])
  })

  it.each<['click' | 'keyUp']>([['click'], ['keyUp']])('takes a selection that stops short of the end to the end after a %s', async (event) => {
    expect(await selectionAfter(event, 0, 2)).toEqual([3, 3])
  })

  it('puts the caret at the end on focus, even where the browser selected the whole code, as a Tab into it does', async () => {
    expect(await selectionAfter('focus', 0, 3)).toEqual([3, 3])
  })

  it('lets a paste replace a code that was selected all, instead of adding to it', async () => {
    const frames = stubAnimationFrames()
    const onJoin = vi.fn()
    render(<Welcome message={null} ended={null} onJoin={onJoin} />)
    const field = screen.getByLabelText('Code') as HTMLInputElement
    fireEvent.input(field, { target: { value: 'k7' } })
    field.setSelectionRange(0, 2) // a select-all...
    fireEvent.keyUp(field) // ...whose key is let go
    await frames.frame(0)
    // What a paste does: the pasted text takes the selection's place, or goes in at the caret when nothing is selected.
    field.setRangeText('K7MQ2X', field.selectionStart!, field.selectionEnd!, 'end')
    fireEvent.input(field)
    expect(onJoin).toHaveBeenCalledWith({ kind: 'code', code: 'K7MQ2X' }) // not the K7K7MQ that adding to K7 makes
  })

  it("shows why the last link or code didn't connect", () => {
    render(<Welcome message={{ title: 'Too Many Tries', text: 'Too many tries. Wait a minute, then try again.' }} ended={null} onJoin={() => {}} />)
    expect(screen.getByRole('alert').textContent).toBe('Too Many Tries Too many tries. Wait a minute, then try again.')
  })

  it('says whose sharing ended, when that is why it shows', () => {
    render(<Welcome message={null} ended="Dad" onJoin={() => {}} />)
    expect(screen.getByText('Sharing with Dad has ended.')).toBeTruthy()
  })

  it('says what to do with no link yet, under the step, as Crewluve does', () => {
    render(<Welcome message={null} ended={null} onJoin={() => {}} />)
    const step = screen.getByText('Open the invite link your pilot sent you, on this device.')
    expect(step.nextElementSibling?.textContent).toBe(NO_LINK_YET)
  })

  it('tells a browser that used the password sign-in that it has ended, and no other', () => {
    const { unmount } = render(<Welcome message={null} ended={null} passwordEnded onJoin={() => {}} />)
    expect(screen.getByText(PASSWORD_SIGN_IN_ENDED)).toBeTruthy()
    unmount()
    render(<Welcome message={null} ended={null} onJoin={() => {}} />)
    expect(screen.queryByText(PASSWORD_SIGN_IN_ENDED)).toBeNull()
  })
})

describe('Connecting', () => {
  it('says it is connecting', () => {
    render(<Connecting />)
    // Not a live region itself: Root's, on the page before this screen, reads it (Root.test.tsx).
    expect(screen.getByText('Connecting…').getAttribute('role')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CrewLuve')
  })

  it('is not marked busy', () => {
    const { container } = render(<Connecting />)
    expect(container.querySelector('[aria-busy]')).toBeNull()
  })
})
