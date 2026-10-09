import { useEffect, useState } from 'preact/hooks'

/** Counts returns to the page, so the celebration can replay like the app's scenePhase trigger. */
export function useVisibilityCount(): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const onChange = () => {
      if (document.visibilityState === 'visible') setCount((c) => c + 1)
    }
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])
  return count
}
