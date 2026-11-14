import { useEffect, useState } from 'preact/hooks'

/**
 * The windows where the full map's facts are a side panel (Stage 2 spec §2 item 2, §10): 900 px or wider, and a phone on
 * its side, where a panel under the map would leave little map. Stage 1B's panel moved aside at the same sizes.
 */
export const SIDE_PANEL = '(min-width: 900px), (orientation: landscape) and (max-height: 500px)'

// The query's comma-separated alternatives, each asked on its own: happy-dom, which the tests run in, doesn't match a
// list of queries, and asking one at a time gives a real browser the same answer.
const ALTERNATIVES = SIDE_PANEL.split(',').map((q) => q.trim())

const sidePanelNow = () => typeof matchMedia === 'function' && ALTERNATIVES.some((q) => matchMedia(q).matches)

/** Whether the facts are a side panel, following the window as it's resized. */
export function useSidePanel(): boolean {
  const [side, setSide] = useState(sidePanelNow)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const queries = ALTERNATIVES.map((q) => matchMedia(q))
    const follow = () => setSide(queries.some((query) => query.matches))
    for (const query of queries) query.addEventListener?.('change', follow)
    return () => {
      for (const query of queries) query.removeEventListener?.('change', follow)
    }
  }, [])
  return side
}
