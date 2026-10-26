// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Connecting, Welcome } from '../../src/ui/Welcome'

afterEach(cleanup)

const submit = () => fireEvent.submit(screen.getByRole('button', { name: 'Connect' }).closest('form')!)

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
    submit()
    expect(onJoin).toHaveBeenCalledWith({ kind: 'invite', invite: 'abc123' })
  })

  it('says Not an Invite Link for pasted text with no link, and joins nothing', () => {
    const onJoin = vi.fn()
    render(<Welcome message={null} ended={null} onJoin={onJoin} />)
    fireEvent.input(screen.getByLabelText('Paste Invite Link'), { target: { value: 'hello' } })
    submit()
    expect(onJoin).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe("Not an Invite Link That doesn't look like an invite link.")
  })

  it('keeps Connect off until something is pasted', () => {
    render(<Welcome message={null} ended={null} onJoin={() => {}} />)
    expect((screen.getByRole('button', { name: 'Connect' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("redeems a code on its sixth letter, keeping only the code's letters, in upper case", () => {
    const onJoin = vi.fn()
    const { container } = render(<Welcome message={null} ended={null} onJoin={onJoin} />)
    const code = screen.getByLabelText('Code')
    fireEvent.input(code, { target: { value: 'ab-2c3' } })
    expect(onJoin).not.toHaveBeenCalled()
    expect([...container.querySelectorAll('.code-box')].map((box) => box.textContent)).toEqual(['A', 'B', '2', 'C', '3', ''])
    fireEvent.input(code, { target: { value: 'ab-2c3d' } })
    expect(onJoin).toHaveBeenCalledWith({ kind: 'code', code: 'AB2C3D' })
  })

  it('connects with a whole code link pasted into the code boxes, not with its first six letters', () => {
    const onJoin = vi.fn()
    render(<Welcome message={null} ended={null} onJoin={onJoin} />)
    fireEvent.input(screen.getByLabelText('Code'), { target: { value: 'https://crewluve.crewlu.net/join#c=ab2c3d' } })
    expect(onJoin).toHaveBeenCalledTimes(1)
    expect(onJoin).toHaveBeenCalledWith({ kind: 'code', code: 'AB2C3D' })
  })

  it("shows why the last link or code didn't connect", () => {
    render(<Welcome message={{ title: 'Too Many Tries', text: 'Too many tries. Wait a minute, then try again.' }} ended={null} onJoin={() => {}} />)
    expect(screen.getByRole('alert').textContent).toBe('Too Many Tries Too many tries. Wait a minute, then try again.')
  })

  it('says whose sharing ended, when that is why it shows', () => {
    render(<Welcome message={null} ended="Dad" onJoin={() => {}} />)
    expect(screen.getByText('Sharing with Dad has ended.')).toBeTruthy()
  })
})

describe('Connecting', () => {
  it('says it is connecting', () => {
    render(<Connecting />)
    expect(screen.getByRole('status').textContent).toBe('Connecting…')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CrewLuve')
  })
})
