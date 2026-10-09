import { supabase } from '../supabase'
import { classifySignInError, type SignInError } from './signInErrors'

/** Signs in with the pilot's CrewLu Cloud email and password; null means success. */
export async function signIn(email: string, password: string): Promise<SignInError | null> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? classifySignInError(error) : null
  } catch (err) {
    return classifySignInError(err as { name?: string; message?: string })
  }
}

export async function hasSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return data.session != null
}

/** Calls `onOut` when the session ends (signed out elsewhere, or a refresh failed). Returns an unsubscribe. */
export function onSignedOut(onOut: () => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') onOut()
  })
  return () => data.subscription.unsubscribe()
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}
