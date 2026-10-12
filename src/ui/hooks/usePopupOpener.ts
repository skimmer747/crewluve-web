import { useEffect, useRef, useState } from 'preact/hooks'

/**
 * What the status screen keeps for one popup (popup follow-ups §4, §5). `available` says whether what the popup shows
 * is there: when it goes, the popup closes by itself, and stays closed when it comes back. Once the popup has closed,
 * focus goes back to the button that opened it, or, when that has gone with what it showed, to `fallback()`.
 */
export function usePopupOpener(available: boolean, fallback: () => HTMLElement | null) {
  const [wanted, setWanted] = useState(false)
  const opener = useRef<HTMLElement | null>(null)
  const wasOpen = useRef(false)
  const open = wanted && available
  useEffect(() => {
    if (wanted && !available) setWanted(false)
  }, [wanted, available])
  // This runs after the render that lifts `inert` from <main>, since nothing in an inert page can take focus. The
  // fallback takes focus without scrolling the page to it (Safari before 15 scrolls anyway).
  useEffect(() => {
    if (wasOpen.current && !open) {
      if (opener.current?.isConnected) opener.current.focus()
      else fallback()?.focus({ preventScroll: true })
    }
    wasOpen.current = open
  }, [open])
  return {
    open,
    /** Opens the popup from `button`, which takes focus back once it has closed. */
    show: (button: HTMLElement) => {
      opener.current = button
      setWanted(true)
    },
    /** The popup has finished closing. */
    hide: () => setWanted(false),
  }
}
