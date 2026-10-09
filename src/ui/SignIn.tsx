import { useState } from 'preact/hooks'
import { signIn as signInWithCrewLuCloud } from '../auth/session'
import { SIGN_IN_MESSAGES, type SignInError } from '../auth/signInErrors'

export interface SignInProps {
  onSignedIn: () => void
  /** Injected in tests; defaults to the real CrewLu Cloud sign-in. */
  signIn?: (email: string, password: string) => Promise<SignInError | null>
}

/** The web-only sign-in screen (spec §4.2). A real form, so Enter submits and password managers fill it. */
export function SignIn({ onSignedIn, signIn = signInWithCrewLuCloud }: SignInProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: Event) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const failure = await signIn(email.trim(), password)
    setBusy(false)
    if (failure) setError(SIGN_IN_MESSAGES[failure])
    else onSignedIn()
  }

  return (
    <main class="screen signin">
      <div class="signin-mark">
        <img src="/icons/heart-256.png" alt="" width={88} height={88} />
      </div>
      <h1 class="title">CrewLuve</h1>
      <p class="signin-sub">Sign in with your pilot's CrewLu Cloud account</p>
      <form class="signin-form" onSubmit={submit}>
        <label class="sr-only" for="email">Email</label>
        <input
          id="email"
          class="field"
          type="email"
          autocomplete="username"
          placeholder="pilot@example.com"
          required
          value={email}
          onInput={(e) => setEmail(e.currentTarget.value)}
        />
        <label class="sr-only" for="password">Password</label>
        <input
          id="password"
          class="field"
          type="password"
          autocomplete="current-password"
          placeholder="Password"
          required
          value={password}
          onInput={(e) => setPassword(e.currentTarget.value)}
        />
        <button class="primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {error && (
          <p class="signin-error" role="alert">
            {error}
          </p>
        )}
      </form>
      <p class="signin-note">Read only. This site never changes anything in CrewLu Cloud.</p>
      <p class="signin-note">Forgot your password? Reset it in the Crewlu app.</p>
      <a class="signin-demo" href="?demo=1">See a demo</a>
    </main>
  )
}
