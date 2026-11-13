import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'

export const MAP_HASH = '#map'
const OPENED_HERE = 'crewluveTripMap'
const atMap = () => window.location.hash === MAP_HASH

/**
 * Whether the full map shows, by the address (moving map spec §6): at #map. Opening adds a history entry, so the phone's
 * Back returns to the status page. Closing puts focus back on the card's map and the page back where it was scrolled.
 */
export function useTripMapPage() {
  const [open, setOpen] = useState(atMap)
  const statusScroll = useRef(0)
  const wasOpen = useRef(open)

  useEffect(() => {
    const follow = () => setOpen(atMap())
    window.addEventListener('popstate', follow)
    window.addEventListener('hashchange', follow)
    return () => {
      window.removeEventListener('popstate', follow)
      window.removeEventListener('hashchange', follow)
    }
  }, [])

  useLayoutEffect(() => {
    // The status page may have been scrolled down to the card, so the map page opens at the top.
    if (!wasOpen.current && open) window.scrollTo(0, 0)
    if (wasOpen.current && !open) {
      document.querySelector<HTMLElement>('[data-trip-map-open]')?.focus({ preventScroll: true })
      window.scrollTo(0, statusScroll.current)
    }
    wasOpen.current = open
  }, [open])

  return {
    open,
    show: () => {
      statusScroll.current = window.scrollY
      history.pushState({ [OPENED_HERE]: true }, '', MAP_HASH)
      setOpen(true)
    },
    back: () => {
      if (history.state?.[OPENED_HERE] === true) {
        history.back()
        return
      }
      history.replaceState(null, '', window.location.pathname + window.location.search)
      setOpen(false)
    },
  }
}
