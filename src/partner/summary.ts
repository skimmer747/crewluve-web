/**
 * The partner summary, as partner_view gives it to one partner: CrewLu's SharedPilotStatus, schema version 1
 * (~/Dev/Duty/supabase/partner-status/schema.json), trimmed by Crewlu Cloud to that partner's own entries. Only what
 * the website reads is kept, and nothing is trusted: a malformed leg is skipped, and a summary without a pilot id or
 * a lastUpdated can't be read at all.
 */

export type SummaryLegType = 'flight' | 'turn' | 'layover' | 'home' | 'base' | 'drive' | 'reserve' | 'hotStandby' | 'event' | 'unknown'

export interface SummaryLeg {
  id: string
  tripId: string | null
  type: SummaryLegType
  /** Epoch ms, as CrewLu wrote them: before `delayMinutes`. */
  start: number
  end: number
  airportCode: string | null
  flightNumber: string | null
  departureAirport: string | null
  arrivalAirport: string | null
  tripTotalDays: number | null
  /** How late this flight runs, in minutes (negative: early). Only the delayed flight has one. */
  delayMinutes: number | null
  /** Set on jumpseats and commercial deadheads; null on the pilot's company flights. */
  airlineCode: string | null
  label: string | null
}

export interface QuickStatus {
  text: string
  /** An SF Symbol name, as CrewLu sends it. */
  icon: string | null
  /** Epoch ms, or null for no limit. */
  expiresAt: number | null
}

export interface PartnerSummary {
  pilotId: string
  /** The name this partner sees: the one the pilot gave them ("Dad"), else the pilot's first name. */
  name: string | null
  home: string | null
  base: string | null
  /** When CrewLu wrote it, epoch ms. */
  lastUpdated: number
  legs: SummaryLeg[]
  /** This partner's own quick status first, then the one for everyone (Crewluve's CloudSummary.quickStatus(for:at:)). */
  quickStatuses: QuickStatus[]
}

const LEG_TYPES: ReadonlySet<string> = new Set(['flight', 'turn', 'layover', 'home', 'base', 'drive', 'reserve', 'hotStandby', 'event', 'unknown'])

type Fields = Record<string, unknown>
const isFields = (v: unknown): v is Fields => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null)
const count = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
/** Seconds since 1970 → epoch ms. */
const instant = (v: unknown): number | null => {
  const seconds = count(v)
  return seconds == null ? null : Math.round(seconds * 1000)
}

/** The summary partner_view gave `partnerId`, or null when it isn't one this site can read. */
export function readSummary(status: unknown, partnerId: string): PartnerSummary | null {
  if (!isFields(status) || status.schemaVersion !== 1) return null
  const pilotId = text(status.pilotId)
  const lastUpdated = instant(status.lastUpdated)
  if (!pilotId || lastUpdated == null) return null
  const id = partnerId.toLowerCase()
  const names = isFields(status.displayNameByPartner) ? status.displayNameByPartner : {}
  return {
    pilotId,
    name: text(names[id]) ?? text(status.pilotFirstName),
    home: text(status.homeAirportCode),
    base: text(status.baseAirportCode),
    lastUpdated,
    legs: Array.isArray(status.tripLegs) ? status.tripLegs.map(readLeg).filter((l): l is SummaryLeg => l != null) : [],
    quickStatuses: readQuickStatuses(status, id),
  }
}

/** The pilot's name in a stored summary, as this partner sees them, or null when there's none to read. */
export function nameIn(status: unknown, partnerId: string): string | null {
  return readSummary(status, partnerId)?.name ?? null
}

/** The quick status to show at `now`: the first that hasn't expired (CloudSummary.shows(_:until:at:)). */
export function currentQuickStatus(summary: PartnerSummary, now: number): QuickStatus | null {
  return summary.quickStatuses.find((q) => q.expiresAt == null || q.expiresAt > now) ?? null
}

function readLeg(v: unknown): SummaryLeg | null {
  if (!isFields(v)) return null
  const id = text(v.id)
  const type = typeof v.type === 'string' && LEG_TYPES.has(v.type) ? (v.type as SummaryLegType) : null
  const start = instant(v.startTime)
  const end = instant(v.endTime)
  if (!id || !type || start == null || end == null) return null
  return {
    id,
    tripId: text(v.tripId),
    type,
    start,
    end,
    airportCode: text(v.airportCode),
    flightNumber: text(v.flightNumber),
    departureAirport: text(v.departureAirport),
    arrivalAirport: text(v.arrivalAirport),
    tripTotalDays: count(v.tripTotalDays),
    delayMinutes: count(v.delayMinutes),
    airlineCode: text(v.airlineCode),
    label: text(v.label),
  }
}

function readQuickStatuses(status: Fields, id: string): QuickStatus[] {
  const found: QuickStatus[] = []
  const own = isFields(status.quickStatusByPartner) ? status.quickStatusByPartner[id] : null
  if (isFields(own)) {
    const ownText = text(own.status)
    if (ownText) found.push({ text: ownText, icon: text(own.icon), expiresAt: instant(own.expiry) })
  }
  // The status for everyone: Crewlu Cloud leaves it out for a partner it wasn't sent to. Null targets means everyone,
  // [] nobody (partner-api.md, "The summary JSON"), so this is the same rule again, as Crewluve keeps it.
  const targets = status.quickStatusTargets
  const forThisPartner = targets == null || (Array.isArray(targets) && targets.some((t) => typeof t === 'string' && t.toLowerCase() === id))
  const everyone = text(status.quickStatus)
  if (everyone && forThisPartner) {
    found.push({ text: everyone, icon: text(status.quickStatusIcon), expiresAt: instant(status.quickStatusExpiry) })
  }
  return found
}
