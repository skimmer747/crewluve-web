import type { JSX } from 'preact'
import { useMemo } from 'preact/hooks'
import { timelineLine, timelineSpokenValue } from '../copy/tripMap'
import {
  clockTime, goLive, hasFinished, isLive, isPlaying, pause, play, progressAt, REPLAY_SPEEDS, replayDuration, replayOffset, scrub,
  setSpeed, tripTimeAtOffset, type ReplayClock, type ReplaySpeed,
} from '../map/replayClock'
import { timelineBlocks } from '../map/timelineBlocks'
import { activityAt, landedIn, stillOnGroundIn } from '../map/tripActivity'
import type { TripMap } from '../map/tripMap'
import { TripTimelineBlocks } from './TripTimelineBlocks'

export interface TripTimelineProps {
  map: TripMap
  clock: ReplayClock
  onChange: (clock: ReplayClock) => void
  /** Quick layovers switched on or off (activity markers design §3.1). */
  onQuickLayovers: (on: boolean) => void
  now: number
  viewerTz: string
  h24: boolean
}

/** An arrow key moves half a second of replay at 1x: a quarter hour of a flight, and more of a quick layover. */
const KEY_STEP = 500

/** Page Up and Page Down move a tenth of the replay. */
const PAGE_FRACTION = 0.1

/** How far a key moves the slider, in replay ms, or null for a key the input handles itself (Home, End). */
function keyMove(key: string, whole: number): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp': return KEY_STEP
    case 'ArrowLeft':
    case 'ArrowDown': return -KEY_STEP
    case 'PageUp': return whole * PAGE_FRACTION
    case 'PageDown': return -whole * PAGE_FRACTION
    default: return null
  }
}

/**
 * Play, drag through the trip, go back to Live, pick 1x to 10x, and Quick layovers (moving map spec §6; the app's
 * activity markers design §3, §4). The bar measures replay time at 1x at the clock's pace, colored by what the pilot
 * is doing, with when and what under it.
 */
export function TripTimeline({ map, clock, onChange, onQuickLayovers, now, viewerTz, h24 }: TripTimelineProps) {
  const t = clockTime(clock, now)
  const showsPause = isPlaying(clock) && !hasFinished(clock, now)
  const whole = replayDuration(clock)
  const offset = Math.min(replayOffset(clock, t), whole)
  const activity = activityAt(map, t)
  // Now, a late flight's real plane still at its departure airport is "On the ground" there. A replay's moment flies as
  // the map has the plane (the website's own, Todd, 16 Nov 2026).
  const waitingIn = isLive(clock) ? stillOnGroundIn(map, t) : null
  // And down at the arrival airport before the gate, "Landed" there, now only (the landed, not yet at the gate design §3,
  // Todd, 17 Nov 2026).
  const downIn = isLive(clock) ? landedIn(map, t) : null
  // The blocks follow the trip and the pace alone: the clock's span, legs and waits are the map's. Worked out once
  // rather than every frame of a replay, which on a trip of 30 legs would cost a phone most of a frame.
  const blocks = useMemo(() => timelineBlocks(map, clock), [map, clock.quickLayovers])
  const moveTo = (to: number) => onChange(scrub(clock, tripTimeAtOffset(clock, Math.min(Math.max(to, 0), whole))))
  // The input moves freely, so its thumb glides through a replay; the arrow and page keys step it here. A key held with
  // a modifier (Alt+Left is Back) is left to the browser.
  const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
    const move = keyMove(e.key, whole)
    if (move == null) return
    e.preventDefault()
    moveTo(offset + move)
  }
  return (
    <div class="trip-timeline">
      <div class="trip-timeline-row">
        <button type="button" class="trip-timeline-play" aria-label={showsPause ? 'Pause replay' : 'Replay the trip'}
          onClick={() => onChange(showsPause ? pause(clock, Date.now()) : play(clock, Date.now()))}>
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            {showsPause ? <path d="M5 3h3v14H5zM12 3h3v14h-3z" /> : <path d="M6 3l11 7-11 7z" />}
          </svg>
        </button>
        <div class="trip-timeline-bar">
          <TripTimelineBlocks blocks={blocks} progress={progressAt(clock, t)} />
          <input type="range" class="trip-timeline-slider" aria-label="Trip time" aria-valuetext={timelineSpokenValue(t, activity, viewerTz, h24, waitingIn, downIn)}
            min={0} max={Math.max(whole, 1)} step="any" value={offset} onKeyDown={onKeyDown}
            onInput={(e) => moveTo(Number(e.currentTarget.value))} />
        </div>
        {!isLive(clock) && (
          <button type="button" class="trip-timeline-live" onClick={() => onChange(goLive(clock))}>Live</button>
        )}
      </div>
      <p class="trip-timeline-time" aria-hidden="true">{timelineLine(t, activity, viewerTz, h24, waitingIn, downIn)}</p>
      <div class="trip-timeline-row trip-timeline-settings">
        <label class="trip-timeline-quick">
          <input type="checkbox" role="switch" class="trip-timeline-switch" checked={clock.quickLayovers}
            onChange={(e) => onQuickLayovers(e.currentTarget.checked)} />
          Quick layovers
        </label>
        <select class="trip-timeline-speed" aria-label="Replay speed" value={String(clock.speed)}
          onChange={(e) => onChange(setSpeed(clock, Number(e.currentTarget.value) as ReplaySpeed, Date.now()))}>
          {REPLAY_SPEEDS.map((s) => <option key={s} value={String(s)}>{`${s}×`}</option>)}
        </select>
      </div>
    </div>
  )
}
