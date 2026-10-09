export type SignInError = 'credentials' | 'network' | 'other'

export const SIGN_IN_MESSAGES: Record<SignInError, string> = {
  credentials: "That email and password didn't work. Use the same CrewLu Cloud sign-in as the Crewlu app.",
  network: "Couldn't reach CrewLu Cloud. Check your connection and try again.",
  other: 'Sign-in failed. Try again in a minute.',
}

/** Maps a Supabase auth error (or a thrown fetch error) to one of the three messages in spec §4.2. */
export function classifySignInError(err: { status?: number; name?: string; message?: string } | null | undefined): SignInError {
  const message = (err?.message ?? '').toLowerCase()
  if (err?.status === 400 || message.includes('invalid login credentials')) return 'credentials'
  if (err?.name === 'AuthRetryableFetchError' || err?.status === 0 || message.includes('failed to fetch') || message.includes('network')) {
    return 'network'
  }
  return 'other'
}
