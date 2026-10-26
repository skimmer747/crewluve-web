import { SUPABASE_URL } from '../cloud'

/**
 * The partner door guard (piece 5a §9), enforced where no calling code can get around it: src/partner/door.ts sends
 * every Crewlu Cloud request through it. Only POSTs to the four partner RPCs get through, on the Crewlu Cloud
 * project's own host and with no query string. Everything else is refused before it leaves the page: any other RPC,
 * table reads, /auth/v1/, /functions/, /storage/, other methods and other hosts. The weather and the airport list don't
 * come through here.
 */
const ORIGIN = new URL(SUPABASE_URL).origin
const RPC_PATH = '/rest/v1/rpc/'
/** The four partner RPCs, the only calls the guard lets through. Frozen, so no code can add one. */
export const DOOR_RPCS: readonly string[] = Object.freeze(['partner_join', 'partner_handoff_redeem', 'partner_view', 'partner_leave'])
const ALLOWED: ReadonlySet<string> = new Set(DOOR_RPCS)

export class DoorGuardError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DoorGuardError'
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
    // The URL parser resolves dot segments and %2e, so /rest/v1/rpc/../../auth/v1/token is judged as /auth/v1/token.
    url = new URL(address, 'https://unresolved.invalid')
  } catch {
    // Refused below: a request that can't be read can't be shown to be one of the four.
  }
  return { method: String(method).toUpperCase(), url }
}

function allowed(method: string, url: URL): boolean {
  if (url.origin !== ORIGIN || method !== 'POST' || url.search !== '') return false
  return url.pathname.startsWith(RPC_PATH) && ALLOWED.has(url.pathname.slice(RPC_PATH.length))
}

/** The reason, without the query string: keys don't belong in a log. */
function refusal(method: string, url: URL | null): string {
  if (!url) return `Only the partner door: blocked ${method} (unreadable URL)`
  const where = url.origin === ORIGIN ? url.pathname : `${url.origin}${url.pathname}`
  return `Only the partner door: blocked ${method} ${where}${url.search ? ' (with a query string)' : ''}`
}

/** Wraps a fetch so that only the four partner RPCs get through; anything else rejects with a DoorGuardError and is never sent. */
export function doorFetch(base: typeof fetch): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const { method, url } = requested(input, init)
    if (!url || !allowed(method, url)) throw new DoorGuardError(refusal(method, url))
    // Fetch gets the method the guard judged, read once, so an init can't answer one method here and another there.
    return base(input, { ...init, method })
  }
}
