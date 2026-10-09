// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
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
