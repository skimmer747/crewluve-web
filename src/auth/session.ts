import { AUTH_STORAGE_KEY } from '../cloud'
import { reportOnce } from '../reportOnce'
import { classifySignInError, type SignInError } from './signInErrors'

/**
 * The CrewLu Cloud client loads the first time something here needs it, never when this file is imported. Creating the
 * client restores a stored session and may refresh its token, which is a network call, and demo mode (`?demo=1`) makes
 * none (spec §4.7). tests/data/readOnly.test.ts checks that this is the only way into src/supabase.ts at startup.
 */
const loadClient = () => import('../supabase')

/**
 * True when this browser holds a CrewLu Cloud session, judged from storage alone: instant, no network, and no client
 * loaded. A page can show the cached schedule on this answer and check with hasSession() in the background. It says
 * nothing about whether the session is still valid. False when nothing is stored or storage is blocked.
 */
export function hasStoredSession(storage?: Pick<Storage, 'getItem'>): boolean {
  try {
    // localStorage is read inside the try: touching it throws in browsers that block site data, and it is missing outside a browser.
    return (storage ?? localStorage).getItem(AUTH_STORAGE_KEY) != null
  } catch {
    return false
  }
}

/**
 * True when someone is signed in here, counting the case where that can't be checked because the network is down.
 * With an expired access token and no network, the client can't refresh: after about 25 s it returns no session and a
 * retryable fetch error, and it leaves the stored session in place. That is "signed in, can't verify", not "signed
 * out", so the visitor keeps their cached schedule (spec §5, §8). Rejects if the client itself can't be loaded.
 */
export async function hasSession(): Promise<boolean> {
  const { supabase, isAuthRetryableFetchError } = await loadClient()
  const { data, error } = await supabase.auth.getSession()
  return data.session != null || isAuthRetryableFetchError(error)
}

/** True only when there is a valid session right now. Unlike hasSession(), a session that could not be refreshed offline is not one. */
export async function hasLiveSession(): Promise<boolean> {
  const { supabase } = await loadClient()
  const { data } = await supabase.auth.getSession()
  return data.session != null
}

/** Signs in with the pilot's CrewLu Cloud email and password; null means success. */
export async function signIn(email: string, password: string): Promise<SignInError | null> {
  try {
    const { supabase } = await loadClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? classifySignInError(error) : null
  } catch (err) {
    // Includes the client failing to load, which is a network problem as far as the visitor can tell.
    return classifySignInError(err as { name?: string; message?: string })
  }
}

/**
 * Calls `onOut` when the session ends (signed out elsewhere, or a refresh failed). Returns an unsubscribe, which is
 * safe to call at any time, including before the client has loaded (it then never subscribes) and more than once.
 */
export function onSignedOut(onOut: () => void): () => void {
  let stopped = false
  let stopListening: (() => void) | null = null
  loadClient()
    .then(({ supabase }) => {
      if (stopped) return
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') onOut()
      })
      stopListening = () => data.subscription.unsubscribe()
    })
    .catch((err: unknown) => {
      reportOnce('onSignedOut: the CrewLu Cloud client did not load, so a sign-out elsewhere will go unnoticed', err)
    })
  return () => {
    stopped = true
    stopListening?.()
    stopListening = null
  }
}

/**
 * Signs out of this browser only. `scope: 'local'` matters: signOut() defaults to 'global', which revokes every session
 * of the account. Visitors use the pilot's own login, so a global sign-out here would sign the pilot's Crewlu app out
 * on their iPhone too.
 *
 * The visitor is signed out here even when the request fails (the client drops its local session regardless), and even
 * when the client can't be loaded: then the stored session is removed directly, so credentials are never left behind.
 */
export async function signOut(): Promise<void> {
  try {
    const { supabase } = await loadClient()
    await supabase.auth.signOut({ scope: 'local' })
  } catch (err) {
    reportOnce('Sign-out could not use the CrewLu Cloud client; removing the stored session directly', err)
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch {
      // Storage is blocked, so nothing was stored either.
    }
  }
}
