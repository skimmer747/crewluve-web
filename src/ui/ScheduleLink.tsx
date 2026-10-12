import type { JSX } from 'preact'
import { useState } from 'preact/hooks'
import { Chevron } from './Chevron'
import { Icon } from './Icon'

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
function openOnPlainClick(e: MouseEvent, open: () => void): void {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  open()
}

/**
 * Whether a pointer is holding a card down, for the app's CardButtonStyle: pressed from the moment it goes down, let
 * go when it lifts, leaves, or turns into a scroll (slice 3A §3.1).
 */
function usePressed() {
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
 * A card's way into the schedule (PilotStatusView.scheduleLink, slice 3A §3.1). Without `link`, the card stays as it was.
 * - `card` goes on the card: a tap anywhere on it opens the schedule, as the app's card button does, and pressing it
 *   presses the card in. A swipe makes no click, so the trip card's route still scrolls.
 * - `chevron` ends the card's top row: the link keyboards and screen readers use. Its focus ring goes round the card.
 * - `linked` is the card's extra classes, with "pressed" while a pointer holds it.
 */
export function useScheduleLink(link: ScheduleLinkProps | undefined): {
  linked: string
  card: JSX.HTMLAttributes<HTMLElement>
  chevron: JSX.Element | null
} {
  const { pressed, handlers } = usePressed()
  if (!link) return { linked: '', card: {}, chevron: null }
  const open = () => link.onOpen(link.name)
  return {
    linked: pressed ? ' linked pressed' : ' linked',
    card: {
      // A click on the chevron is the link's own.
      onClick: (e: MouseEvent) => {
        if (!(e.target instanceof Element && e.target.closest('a'))) openOnPlainClick(e, open)
      },
      ...handlers,
    },
    chevron: (
      <a class="schedule-link" href={SCHEDULE_HASH} data-schedule-link={link.name} onClick={(e) => openOnPlainClick(e, open)}>
        <span class="sr-only">Schedule</span>
        <Chevron />
      </a>
    ),
  }
}

/**
 * The View Schedule button (PilotStatusView, slice 3A §3.2): the blue calendar, "View Schedule" and a small chevron in
 * one glass card that's a link into the schedule, pressing in as the cards do.
 */
export function ViewScheduleLink({ onOpen }: { onOpen: (name: ScheduleLinkName) => void }) {
  const { pressed, handlers } = usePressed()
  return (
    <a class={`card glass view-schedule linked${pressed ? ' pressed' : ''}`} href={SCHEDULE_HASH} data-schedule-link="view"
      onClick={(e) => openOnPlainClick(e, () => onOpen('view'))} {...handlers}>
      <Icon name="CalendarBlank" size={22} color="var(--blue)" />
      <span class="view-schedule-text">View Schedule</span>
      <Chevron size={12} weight={1.5} />
    </a>
  )
}
