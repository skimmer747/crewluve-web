import { useId, useRef } from 'preact/hooks'
import type { TrackingLinks } from '../copy/tracking'
import type { IconName } from '../icons/iconPaths'
import { useModalDialog } from './hooks/useModalDialog'
import { usePopupClose } from './hooks/usePopupClose'
import { Icon } from './Icon'

export interface TrackingPopupProps {
  /** The header: the flight as the tracking sites know it ("UPS2962"), or the info bar's number when it has no such form. */
  trackingNumber: string
  /** The tracking sites' pages. Without them the popup has only its header and "Track this flight", as the app's. */
  links: TrackingLinks | null
  /** Called once the popup has finished closing. */
  onClose: () => void
}

/**
 * The tracking popup (slice 2C §6): FlightTrackingPopupView, with links to the flight on FlightRadar24 and FlightAware.
 * The screen draws it outside <main> and hides the page from screen readers while it's open.
 */
export function TrackingPopup({ trackingNumber, links, onClose }: TrackingPopupProps) {
  const titleId = useId()
  const card = useRef<HTMLElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  // The opening fades the backdrop in, and fades the card in as it springs from half size. A close during it runs from
  // wherever they are (popup follow-ups §3).
  const { closing, close } = usePopupClose(onClose, [
    { find: () => backdrop.current, properties: ['opacity'] },
    { find: () => card.current, properties: ['opacity', 'transform'] },
  ])
  // Focus on the close button, Tab kept inside, Escape to close, the page held still. The screen hands focus back.
  useModalDialog(card, closeButton, close)

  return (
    <div class={closing ? 'tracking-popup closing' : 'tracking-popup'}>
      <div ref={backdrop} class="tracking-backdrop" onClick={close} />
      <section ref={card} class="tracking-card glass" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div class="tracking-head">
          <Icon name="Airplane" size={17} color="var(--blue)" />
          <h2 id={titleId} class="tracking-number">
            {trackingNumber}
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
