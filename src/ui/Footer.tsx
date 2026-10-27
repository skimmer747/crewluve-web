import { agoText, clockWithDayText } from '../copy/format'
import { Icon } from './Icon'
import type { Problem } from './problem'

export interface FooterProps {
  now: number
  lastSuccessAt: number | null
  newestUpdatedAt: number | null
  problem: Problem
  refreshing: boolean
  onRefresh: () => void
  onLeave: () => void
  leaveLabel: string
  viewerTz: string
  h24: boolean
}

/** SyncStatusBarView freshness colors: under 2 min green, under 5 blue, under 10 orange, otherwise red. */
export function freshnessColor(ageMs: number): string {
  if (ageMs < 120_000) return 'var(--green)'
  if (ageMs < 300_000) return 'var(--blue)'
  if (ageMs < 600_000) return 'var(--orange)'
  return 'var(--red)'
}

/** Freshness rows between the leave button (Disconnect, or Exit demo) and refresh (spec §4.5). */
export function Footer(p: FooterProps) {
  return (
    <footer class="footer">
      <button type="button" class="glass round" aria-label={p.leaveLabel} title={p.leaveLabel} onClick={p.onLeave}>
        <Icon name="SignOut" size={12} />
      </button>
      <div class="sync">
        {p.problem ? (
          <p class="sync-row sync-problem">
            <Icon name="Warning" size={12} color="var(--orange)" />
            <span>{problemText(p)}</span>
          </p>
        ) : (
          <div class="sync-rows">
            {p.lastSuccessAt != null && (
              <p class="sync-row">
                <Icon name="Cloud" size={11} color={freshnessColor(p.now - p.lastSuccessAt)} />
                <span>{agoText('Checked', p.now - p.lastSuccessAt)}</span>
              </p>
            )}
            {p.newestUpdatedAt != null && (
              <p class="sync-row">
                {/* Neutral on purpose: a schedule untouched for days is normal (spec §4.5). */}
                <Icon name="ArrowCircleUp" size={11} color="var(--text-2)" />
                <span>{agoText('Schedule updated', p.now - p.newestUpdatedAt)}</span>
              </p>
            )}
          </div>
        )}
      </div>
      <button type="button" class="glass round" aria-label="Refresh" title="Refresh" disabled={p.refreshing} onClick={p.onRefresh}>
        <Icon name="ArrowClockwise" size={12} />
      </button>
    </footer>
  )
}

function problemText(p: FooterProps): string {
  if (p.problem?.kind === 'offline') {
    return p.lastSuccessAt != null
      ? `Offline — showing the schedule from ${clockWithDayText(p.lastSuccessAt, p.now, p.viewerTz, p.h24)}`
      : 'Offline'
  }
  return "Couldn't reach CrewLu Cloud — will retry"
}
