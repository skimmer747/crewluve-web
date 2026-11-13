import { timelineTime } from '../copy/tripMap'
import {
  clockTime, goLive, hasFinished, isLive, isPlaying, pause, play, REPLAY_SPEEDS, scrub, setSpeed, type ReplayClock, type ReplaySpeed,
} from '../map/replayClock'

export interface TripTimelineProps {
  clock: ReplayClock
  onChange: (clock: ReplayClock) => void
  now: number
  viewerTz: string
  h24: boolean
}

/** The slider moves in quarter hours, kind to keys on a trip of several days. */
const STEP = 15 * 60_000

/** Play, drag through the trip, go back to Live, and pick 1x to 10x (moving map spec §6). */
export function TripTimeline({ clock, onChange, now, viewerTz, h24 }: TripTimelineProps) {
  const t = clockTime(clock, now)
  const showsPause = isPlaying(clock) && !hasFinished(clock, now)
  const { start, end } = clock.span
  // Whole steps, never none, so the last one reaches the trip's end: `scrub` holds a time past the end at the end.
  const max = start + Math.max(1, Math.ceil((end - start) / STEP)) * STEP
  return (
    <div class="trip-timeline">
      <div class="trip-timeline-row">
        <button type="button" class="trip-timeline-play" aria-label={showsPause ? 'Pause replay' : 'Replay the trip'}
          onClick={() => onChange(showsPause ? pause(clock, Date.now()) : play(clock, Date.now()))}>
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            {showsPause ? <path d="M5 3h3v14H5zM12 3h3v14h-3z" /> : <path d="M6 3l11 7-11 7z" />}
          </svg>
        </button>
        <input type="range" class="trip-timeline-slider" aria-label="Trip time" aria-valuetext={timelineTime(t, viewerTz, h24)}
          min={start} max={max} step={STEP} value={Math.min(Math.max(t, start), end)}
          onInput={(e) => onChange(scrub(clock, Number(e.currentTarget.value)))} />
        {!isLive(clock) && (
          <button type="button" class="trip-timeline-live" onClick={() => onChange(goLive(clock))}>Live</button>
        )}
      </div>
      <div class="trip-timeline-row">
        <span class="trip-timeline-time" aria-hidden="true">{timelineTime(t, viewerTz, h24)}</span>
        <select class="trip-timeline-speed" aria-label="Replay speed" value={String(clock.speed)}
          onChange={(e) => onChange(setSpeed(clock, Number(e.currentTarget.value) as ReplaySpeed, Date.now()))}>
          {REPLAY_SPEEDS.map((s) => <option key={s} value={String(s)}>{`${s}×`}</option>)}
        </select>
      </div>
    </div>
  )
}
