import { useEffect, useState } from 'preact/hooks'

/** The current time, re-rendering every `intervalMs`. One second, because the countdowns tick each second. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
