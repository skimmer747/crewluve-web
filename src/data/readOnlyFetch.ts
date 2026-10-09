import { SUPABASE_URL } from '../cloud'
import { COLUMNS } from './rows'

/**
 * The read-only guarantee (spec §9), enforced where no calling code can get around it. src/supabase.ts gives the
 * CrewLu Cloud client this wrapper as its fetch, so every request the client sends (database, auth, edge functions,
 * storage) passes through it, however the calling code is written. A stray `.update()`, a `functions.invoke()` or a
 * password change is refused here, before it leaves the page.
 *
 * Only the CrewLu Cloud project's own host is reachable, and what goes through there is:
 * - GET and HEAD of the nine tables the schedule is read from (spec §6.1, the keys of COLUMNS), under /rest/v1/.
 *   Every other table, and every RPC, is refused, so "never read" holds at runtime too.
 * - GET under /auth/v1/: who is signed in.
 * - POST /auth/v1/token: password sign-in, and refreshing the session.
 * - POST /auth/v1/logout?scope=local: signing out of this browser.
 *
 * Everything else is refused, whatever the method: other methods under /rest/v1/, every call under /functions/,
 * /storage/ and /realtime/, and account changes such as PUT /auth/v1/user and POST /auth/v1/signup.
 *
 * A sign-out must say scope=local. Visitors use the pilot's own login, and the server's default scope is global, which
 * revokes every session of the account: signing out here would sign the pilot's Crewlu app out on their iPhone.
 * supabase-js sends scope=global from signOut() unless told otherwise, so this is the backstop for that mistake.
 */
const ORIGIN = new URL(SUPABASE_URL).origin
const TABLES: ReadonlySet<string> = new Set(Object.keys(COLUMNS))

export class ReadOnlyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReadOnlyError'
  }
}

interface Requested {
  method: string
  /** null when the address can't be read at all. */
  url: URL | null
}

/** What a fetch() call would send, however it was given: a string, a URL, or a Request, with an init that can override its method. */
function requested(input: RequestInfo | URL, init: RequestInit | undefined): Requested {
  const shape = typeof input === 'object' && input !== null ? (input as { href?: unknown; url?: unknown; method?: unknown }) : {}
  const address = typeof input === 'string' ? input : typeof shape.href === 'string' ? shape.href : typeof shape.url === 'string' ? shape.url : String(input)
  const method = init?.method ?? (typeof shape.method === 'string' ? shape.method : 'GET')
  let url: URL | null = null
  try {
    // The URL parser resolves dot segments and %2e, so /rest/v1/../functions/ is judged as /functions/.
    url = new URL(address, 'https://unresolved.invalid')
  } catch {
    // Refused below: a request that can't be read can't be shown to be a read.
  }
  return { method: String(method).toUpperCase(), url }
}

function allowed(method: string, url: URL): boolean {
  if (url.origin !== ORIGIN) return false
  const path = url.pathname
  if (path.startsWith('/rest/v1/')) {
    const table = path.slice('/rest/v1/'.length).split('/')[0]
    return (method === 'GET' || method === 'HEAD') && TABLES.has(table)
  }
  if (!path.startsWith('/auth/v1/')) return false
  if (method === 'GET') return true
  if (method !== 'POST') return false
  return path === '/auth/v1/token' || (path === '/auth/v1/logout' && url.searchParams.get('scope') === 'local')
}

/** The reason, without the query string: filters and tokens don't belong in a log. */
function refusal(method: string, url: URL | null): string {
  if (!url) return `This site is read-only: blocked ${method} (unreadable URL)`
  const scope = url.pathname === '/auth/v1/logout' ? ` (scope ${url.searchParams.get('scope') || 'missing'}; only a local sign-out is allowed)` : ''
  const where = url.origin === ORIGIN ? url.pathname : `${url.origin}${url.pathname}`
  return `This site is read-only: blocked ${method} ${where}${scope}`
}

/** Wraps a fetch so that only the requests listed above get through; anything else rejects with a ReadOnlyError and is never sent. */
export function readOnlyFetch(base: typeof fetch): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const { method, url } = requested(input, init)
    if (!url || !allowed(method, url)) throw new ReadOnlyError(refusal(method, url))
    return base(input, init)
  }
}
