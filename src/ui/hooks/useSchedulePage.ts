import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { SCHEDULE_HASH, type ScheduleLinkName } from '../ScheduleLink'

/** Marks the history entry the site added for the schedule, so the page's back button knows it can step back. */
const OPENED_HERE = 'crewluveSchedule'

const atSchedule = () => window.location.hash === SCHEDULE_HASH

/**
 * Which page shows, by the address (slice 3A §3.3): the Schedule page at #schedule, else the status page.
 * - Opening adds a history entry, so the phone's Back and the browser's return to the status page.
 * - The page's own back button does the same. When the schedule was opened straight from its address, there's no
 *   entry of the site's to go back to, so it goes to the status page instead of leaving the site.
 * - The status page comes back where it was scrolled, with focus on the link that opened the schedule, or on the
 *   page's title when that link has gone.
 */
export function useSchedulePage() {
  const [open, setOpen] = useState(atSchedule)
  const from = useRef<ScheduleLinkName | null>(null)
  const statusScroll = useRef(0)
  const wasOpen = useRef(open)

  useEffect(() => {
    // Each page sets its own scroll: the schedule its opening day, the status page where it was.
    history.scrollRestoration = 'manual'
    const follow = () => setOpen(atSchedule())
    window.addEventListener('popstate', follow)
    window.addEventListener('hashchange', follow)
    return () => {
      window.removeEventListener('popstate', follow)
      window.removeEventListener('hashchange', follow)
    }
  }, [])

  // Runs once the status page is back on screen, before it's painted.
  useLayoutEffect(() => {
    if (wasOpen.current && !open) {
      window.scrollTo(0, statusScroll.current)
      const link = from.current && document.querySelector<HTMLElement>(`[data-schedule-link="${from.current}"]`)
      ;(link ?? document.querySelector<HTMLElement>('h1.title'))?.focus({ preventScroll: true })
    }
    wasOpen.current = open
  }, [open])

  return {
    open,
    /** Opens the schedule from the link named, which takes focus back afterwards. */
    show: (name: ScheduleLinkName) => {
      from.current = name
      statusScroll.current = window.scrollY
      history.pushState({ [OPENED_HERE]: true }, '', SCHEDULE_HASH)
      setOpen(true)
    },
    /** The schedule's own back button. */
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
