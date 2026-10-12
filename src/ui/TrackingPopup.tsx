import { useEffect, useId, useRef, useState } from 'preact/hooks'
import type { TrackingLinks } from '../copy/tracking'
import type { IconName } from '../icons/iconPaths'
import { useModalDialog } from './hooks/useModalDialog'
import { Icon } from './Icon'
import { prefersReducedMotion } from './motion'

/** Closing fades and shrinks the card over 0.2 s, as the app's dismissView does, before the popup goes. */
export const TRACKING_CLOSE_MS = 200

export interface TrackingPopupProps {
  /** The header: the airline's ICAO code and the digits ("UPS2962"). */
  flightNumber: string
  /** The tracking sites' pages. Without them the popup has only its header and "Track this flight", as the app's. */
  links: TrackingLinks | null
  /** Called once the popup has finished closing. */
  onClose: () => void
}

/**
 * The tracking popup (slice 2C §6): FlightTrackingPopupView, with links to the flight on FlightRadar24 and FlightAware.
 * The screen draws it outside <main> and hides the page from screen readers while it's open.
 */
export function TrackingPopup({ flightNumber, links, onClose }: TrackingPopupProps) {
  const titleId = useId()
  const card = useRef<HTMLElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const [still] = useState(prefersReducedMotion)
  const [closing, setClosing] = useState(false)
  const closed = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const close = () => {
    if (closed.current) return
    closed.current = true
    if (still) return onClose()
    setClosing(true)
    timer.current = setTimeout(onClose, TRACKING_CLOSE_MS)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  // Focus on the close button, Tab kept inside, Escape to close, the page held still. The screen hands focus back.
  useModalDialog(card, closeButton, close)

  return (
    <div class={closing ? 'tracking-popup closing' : 'tracking-popup'}>
      <div class="tracking-backdrop" onClick={close} />
      <section ref={card} class="tracking-card glass" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div class="tracking-head">
          <Icon name="Airplane" size={17} color="var(--blue)" />
          <h2 id={titleId} class="tracking-number">
            {flightNumber}
          </h2>
          <button ref={closeButton} type="button" class="tracking-close" aria-label="Close" onClick={close}>
            <Icon name="XCircle" size={22} />
          </button>
        </div>
        <p class="tracking-lead">Track this flight</p>
        {links && (
          <>
            <TrackingLink href={links.flightRadar24} kind="radar" icon="Broadcast" name="FlightRadar24" caption="Live tracking map" onFollow={close} />
            <TrackingLink href={links.flightAware} kind="aware" icon="GpsFix" name="FlightAware" caption="Flight status & history" onFollow={close} />
          </>
        )}
      </section>
    </div>
  )
}

interface TrackingLinkProps {
  href: string
  kind: 'radar' | 'aware'
  icon: IconName
  name: string
  caption: string
  /** Following a link closes the popup, as the app's buttons do. */
  onFollow: () => void
}

/** A link row: the icon, the name over its caption, and the "opens elsewhere" mark. It opens in a new tab, with no referrer. */
function TrackingLink({ href, kind, icon, name, caption, onFollow }: TrackingLinkProps) {
  return (
    <a class={`tracking-link ${kind}`} href={href} target="_blank" rel="noopener noreferrer" onClick={onFollow}>
      <span class="tracking-link-icon">
        <Icon name={icon} size={20} />
      </span>
      <span class="tracking-link-text">
        <span class="tracking-link-name">{name}</span>
        <span class="tracking-link-caption">{caption}</span>
      </span>
      <span class="sr-only"> (opens in a new tab)</span>
      <Icon name="ArrowSquareOut" size={15} />
    </a>
  )
}
