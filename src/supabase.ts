import { createClient } from '@supabase/supabase-js'
import { AUTH_STORAGE_KEY, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './cloud'
import { readOnlyFetch } from './data/readOnlyFetch'

// This is the only file that may import a Supabase package (tests/data/readOnly.test.ts checks), so session.ts gets
// this helper from here instead of importing the package itself.
export { isAuthRetryableFetchError } from '@supabase/supabase-js'

// Importing this module creates the client, and creating it restores a stored session and may refresh its token: a
// network call. Demo mode must make none (spec §4.7), so only src/auth/session.ts and the app root may import this
// file, and only on demand with import(), never at startup (tests/data/readOnly.test.ts checks both).
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  // detectSessionInUrl is off: the site signs in with a password and has no redirect sign-in to pick up.
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: AUTH_STORAGE_KEY },
  // Every request the client sends goes through readOnlyFetch, which refuses anything but reads and sign-in/out.
  // The page's fetch is looked up per request, not captured now.
  global: { fetch: readOnlyFetch((input, init) => fetch(input, init)) },
})
