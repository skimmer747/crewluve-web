// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SIGN_IN_MESSAGES } from '../../src/auth/signInErrors'
import { SignIn } from '../../src/ui/SignIn'

afterEach(cleanup)

function fillAndSubmit(email: string, password: string) {
  fireEvent.input(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.input(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!)
}

describe('SignIn', () => {
  it('signs in with the trimmed email, then hands over to the app', async () => {
    const signIn = vi.fn(async () => null)
    const onSignedIn = vi.fn()
    render(<SignIn onSignedIn={onSignedIn} signIn={signIn} />)
    fillAndSubmit(' pilot@example.com ', 'test-password')
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1))
    expect(signIn).toHaveBeenCalledWith('pilot@example.com', 'test-password')
  })

  it('shows the matching message when sign-in fails', async () => {
    const onSignedIn = vi.fn()
    render(<SignIn onSignedIn={onSignedIn} signIn={async () => 'credentials'} />)
    fillAndSubmit('pilot@example.com', 'wrong')
    expect((await screen.findByRole('alert')).textContent).toBe(SIGN_IN_MESSAGES.credentials)
    expect(onSignedIn).not.toHaveBeenCalled()
  })

  it('explains read-only access, password resets, and links the demo', () => {
    render(<SignIn onSignedIn={() => {}} signIn={async () => null} />)
    expect(screen.getByText('Read only. This site never changes anything in CrewLu Cloud.')).toBeTruthy()
    expect(screen.getByText('Forgot your password? Reset it in the Crewlu app.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'See a demo' }).getAttribute('href')).toBe('?demo=1')
  })
})

describe('SignIn while it works', () => {
  it('shows it is busy and ignores a second submit until the first finishes', async () => {
    let finish!: (result: null) => void
    const signIn = vi.fn(() => new Promise<null>((resolve) => (finish = resolve)))
    render(<SignIn onSignedIn={() => {}} signIn={signIn} />)
    fillAndSubmit('pilot@example.com', 'test-password')
    const busy = (await screen.findByRole('button', { name: 'Signing in…' })) as HTMLButtonElement
    expect(busy.disabled).toBe(true)
    fireEvent.submit(busy.closest('form')!)
    expect(signIn).toHaveBeenCalledTimes(1)
    await act(async () => finish(null))
    expect((screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('clears the old error when trying again', async () => {
    let finishSecond!: (result: null) => void
    const signIn = vi
      .fn<(email: string, password: string) => Promise<'credentials' | null>>()
      .mockResolvedValueOnce('credentials')
      .mockImplementationOnce(() => new Promise<null>((resolve) => (finishSecond = resolve)))
    render(<SignIn onSignedIn={() => {}} signIn={signIn} />)
    fillAndSubmit('pilot@example.com', 'wrong')
    await screen.findByRole('alert')
    fillAndSubmit('pilot@example.com', 'right')
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    await act(async () => finishSecond(null))
  })

  it.each(['network', 'other'] as const)('shows the %s message for that failure', async (failure) => {
    render(<SignIn onSignedIn={() => {}} signIn={async () => failure} />)
    fillAndSubmit('pilot@example.com', 'test-password')
    expect((await screen.findByRole('alert')).textContent).toBe(SIGN_IN_MESSAGES[failure])
  })

  it('lets password managers and the browser help fill it in', () => {
    render(<SignIn onSignedIn={() => {}} signIn={async () => null} />)
    const email = screen.getByLabelText('Email') as HTMLInputElement
    const password = screen.getByLabelText('Password') as HTMLInputElement
    expect([email.type, email.getAttribute('autocomplete'), email.required]).toEqual(['email', 'username', true])
    expect([password.type, password.getAttribute('autocomplete'), password.required]).toEqual(['password', 'current-password', true])
  })
})
