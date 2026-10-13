import { useRef } from 'preact/hooks'
import { Chevron } from './Chevron'
import { ScheduleView, type ScheduleViewProps } from './ScheduleView'

export interface SchedulePageProps extends Omit<ScheduleViewProps, 'focusOnOpen'> {
  onBack: () => void
}

/**
 * The Schedule page (EventTimelineView, slice 3A §4, 3B §3): the window's height exactly, with a bar holding the back
 * button and the title, and the schedule's view under it (3C §6.1). The title takes focus as the page opens, so screen
 * readers announce the page (3A §3.3).
 */
export function SchedulePage({ onBack, ...view }: SchedulePageProps) {
  const title = useRef<HTMLHeadingElement>(null)
  return (
    <main class="schedule">
      <header class="schedule-bar">
        <button type="button" class="glass round schedule-back" aria-label="Back" onClick={onBack}>
          <Chevron direction="left" size={17} weight={2.2} />
        </button>
        <h1 class="schedule-title" ref={title} tabIndex={-1}>Schedule</h1>
      </header>
      <ScheduleView {...view} focusOnOpen={title} />
    </main>
  )
}
