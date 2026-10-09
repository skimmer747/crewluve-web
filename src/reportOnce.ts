/** Failures already logged, each keyed by who reported it and what went wrong. */
const reported = new Set<string>()
const MAX_REPORTED = 10

/**
 * console.error for a failure the screen can hit again on every clock tick. It rebuilds its snapshot and its sentence once a
 * second, so a failure that persists would be logged 60 times a minute: each distinct failure is logged once, at most 10 per page.
 */
export function reportOnce(message: string, err: unknown): void {
  const key = `${message}: ${err instanceof Error ? `${err.name}: ${err.message}` : `thrown ${typeof err}`}`
  if (reported.has(key) || reported.size >= MAX_REPORTED) return
  reported.add(key)
  console.error(message, err)
}
