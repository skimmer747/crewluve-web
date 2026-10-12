import type { JSX } from 'preact'
import { useState } from 'preact/hooks'
import { Chevron } from './Chevron'

/** The Schedule page's address, on this same page (slice 3A §3.3). */
export const SCHEDULE_HASH = '#schedule'

/** Which way into the schedule was taken, so focus can go back to it afterwards (slice 3A §3.3). */
export type ScheduleLinkName = 'leave' | 'arrival' | 'fallback' | 'trip' | 'view'

/** A card's way into the schedule: its name, and what opens the page. */
export interface ScheduleLinkProps {
  name: ScheduleLinkName
  onOpen: (name: ScheduleLinkName) => void
}

/**
 * Opens the schedule on this page for a plain click, as the app's buttons do. A click with a modifier key, or with
 * another button, is left to the browser, which opens the page's address in a new tab or window.
 */
export function openOnPlainClick(e: MouseEvent, open: () => void): void {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  open()
}

/**
 * Whether a pointer is holding a link down, for the app's CardButtonStyle: pressed from the moment it goes down, let
 * go when it lifts, leaves, or turns into a scroll (slice 3A §3.1).
 */
export function usePressed() {
  const [pressed, setPressed] = useState(false)
  const release = () => setPressed(false)
  return {
    pressed,
    handlers: {
      onPointerDown: (e: PointerEvent) => {
        if (e.button === 0) setPressed(true)
      },
      onPointerUp: release,
      onPointerLeave: release,
      onPointerCancel: release,
    },
  }
}

/**
 * A card's way into the schedule (PilotStatusView.scheduleLink, slice 3A §3.1). `chevron` ends the card's top row: a
 * link whose area covers the whole card, so a tap anywhere on it opens the schedule. `linked` is the card's extra
 * classes, with "pressed" while a pointer holds it. Without `link`, the card stays as it was.
 */
export function useScheduleLink(link: ScheduleLinkProps | undefined): { linked: string; chevron: JSX.Element | null } {
  const { pressed, handlers } = usePressed()
  if (!link) return { linked: '', chevron: null }
  return {
    linked: pressed ? ' linked pressed' : ' linked',
    chevron: (
      <a class="schedule-link" href={SCHEDULE_HASH} data-schedule-link={link.name}
        onClick={(e) => openOnPlainClick(e, () => link.onOpen(link.name))} {...handlers}>
        <span class="sr-only">Schedule</span>
        <Chevron />
      </a>
    ),
  }
}
