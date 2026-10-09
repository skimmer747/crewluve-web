import type { DutyPeriodRow, FlightRow, PilotInfoRow, RawSchedule } from '../data/rows'
import { DAY, HOUR } from '../time/zoned'
import type { Commute, DutyEvent, DutyEventKind, DutyPeriod, Iata, Move, Pilot, Schedule, Trip } from './types'

const MIN_VALID = Date.UTC(2000, 0, 1)
const MAX_AHEAD = 2 * 365 * DAY
/** A scheduled-vs-actual gap beyond this is bad data, not a delay (the Flight Globe's guard). */
const MAX_CRED_DELTA = 6 * HOUR
const MAX_BLOCK = 26 * HOUR

/**
 * A reserve code as a whole code in an uppercased title, so "Welcome dinner" (LCO) and "Falcons game" don't match.
 * Written without a lookbehind, which Safari before 16.4 can't parse.
 */
const RESERVE_TITLE = /(?:^|[^A-Z])(RSV[A-D]|RSC[AP]|RSS[A-D]|LCO|RCID)(?![A-Z])/

/**
 * 3-letter IATA code, uppercased. CrewLu also writes some bases as 3 letters + "Z" ("SDFZ"), which becomes "SDF".
 * Any other 4-letter value is a word or an ICAO code, not an airport, and gives null.
 */
export function toIata(code: string | null | undefined): Iata | null {
  const s = (code ?? '').trim().toUpperCase()
  if (/^[A-Z0-9]{3}$/.test(s)) return s
  if (/^[A-Z]{3}Z$/.test(s)) return s.slice(0, 3)
  return null
}

/** Epoch ms, or null for missing, unparseable, pre-2000, or more-than-2-years-ahead values. */
export function parseInstant(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t) || t < MIN_VALID || t > now + MAX_AHEAD) return null
  return t
}

/** Digits only, leading zeros stripped ("0081" → "81"); null for placeholders like XXXX, CML, GND. */
export function normalizeFlightNumber(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim()
  if (!/^\d+$/.test(s)) return null
  return s.replace(/^0+(?=\d)/, '')
}

/**
 * The airline code, or '5X' (UPS) for a company flight: no code and an all-digit number.
 * Pass `notCompanyFlight` for rows that are never UPS flights: ground transport and commercial tickets.
 */
export function resolveAirline(airlineCode: string | null | undefined, rawNumber: string | null | undefined, notCompanyFlight: boolean): string | null {
  const code = (airlineCode ?? '').trim().toUpperCase()
  if (code) return code
  if (!notCompanyFlight && /^\d+$/.test((rawNumber ?? '').trim())) return '5X' // PartnerStatusGenerator.swift:321-325
  return null
}

/** Delay-aware block times: actual/ETD when believable, otherwise the schedule (spec §6.2). */
export function effectiveTimes(
  schedOut: number | null,
  schedIn: number | null,
  actOut: number | null,
  actIn: number | null,
): Pick<Move, 'start' | 'end' | 'schedStart' | 'schedEnd'> | null {
  const sOut = schedOut ?? actOut
  const sIn = schedIn ?? actIn
  if (sOut == null || sIn == null) return null
  const credible = (actual: number | null, scheduled: number) =>
    actual != null && Math.abs(actual - scheduled) <= MAX_CRED_DELTA ? actual : scheduled
  let start = credible(actOut, sOut)
  let end = credible(actIn, sIn)
  if (end <= start || end - start > MAX_BLOCK) {
    start = sOut
    end = sIn
  }
  if (end <= start || end - start > MAX_BLOCK) return null
  return { start, end, schedStart: sOut, schedEnd: sIn }
}

/** The most recently updated active profile row (16 accounts have two). */
export function pickPilot(rows: PilotInfoRow[]): Pilot {
  const row = rows
    .filter((r) => r.is_active !== false)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0]
  const base = toIata(row?.base_raw_value)
  const home = toIata(row?.home_airport_code)
  return { firstName: row?.first_name?.trim() || null, base, home, effHome: home ?? base }
}

/** Duty's manualEventLegType + manualEventLabel (PartnerStatusGenerator.swift:894-929). */
export function classifyManualEvent(title: string | null, categoryName: string | null): { kind: Exclude<DutyEventKind, 'training'>; title: string } {
  const text = (title ?? '').trim()
  const upper = text.toUpperCase()
  if (upper.includes('HOT STANDBY')) return { kind: 'hotStandby', title: 'Hot Standby' }
  const code = RESERVE_TITLE.exec(upper)?.[1]
  if (code) return { kind: 'reserve', title: code.length >= 4 ? `${code.slice(0, 3)}-${code.slice(-1)}` : code }
  if ((categoryName ?? '').toLowerCase().includes('reserve')) return { kind: 'reserve', title: text || 'Manual Event' }
  return { kind: 'event', title: text || 'Manual Event' }
}

/** Duty's TrainingEvent.displayTitle: "\(eventType) Training". */
export function trainingTitle(eventType: string | null): string {
  return `${(eventType ?? '').trim()} Training`.trim()
}

/** CrewLu Cloud rows → a clean, delay-aware Schedule (spec §6.2–6.3). */
export function buildSchedule(raw: RawSchedule, now: number): Schedule {
  const pilot = pickPilot(raw.pilotInfos)
  const visible = (r: { hidden_from_timeline: boolean | null }) => r.hidden_from_timeline !== true

  const flightsByDutyPeriod = groupBy(raw.flights.filter(visible), (f) => f.duty_period_id)
  const dutyPeriodsByTrip = groupBy(raw.dutyPeriods, (d) => d.trip_id)

  const trips: Trip[] = []
  for (const row of raw.trips) {
    const start = parseInstant(row.start_date, now)
    const end = parseInstant(row.end_date, now)
    if (start == null || end == null || end <= start) continue
    const dutyPeriods = (dutyPeriodsByTrip.get(row.id) ?? [])
      .map((dp) => toDutyPeriod(dp, row.id, flightsByDutyPeriod.get(dp.id) ?? [], now))
      .filter((dp): dp is DutyPeriod => dp != null)
      .sort((a, b) => a.start - b.start)
    if (dutyPeriods.length === 0) continue // trips with no live duty periods are dropped
    trips.push({ id: row.id, start, end, days: row.days ?? null, dutyPeriods })
  }
  trips.sort((a, b) => a.start - b.start)
  const tripById = new Map(trips.map((t) => [t.id, t]))

  const commutes: Commute[] = []
  for (const c of raw.commutes.filter(visible)) {
    const from = toIata(c.from_airport)
    const to = toIata(c.to_airport)
    const start = parseInstant(c.departure_time_zulu, now)
    const end = parseInstant(c.arrival_time_zulu, now)
    if (!from || !to || start == null || end == null || end <= start) continue
    const sourceTrip = c.source_trip_id ? tripById.get(c.source_trip_id) : undefined
    if (c.source_trip_id && !sourceTrip) continue // its trip is gone (CommuteCleanupService.swift:46)
    const toHome = to === pilot.effHome || c.direction === 'toHome' // spec §6.3; one rule for the status and for homecomings
    // Crewlu writes commute times once, so move the drive home with a late (or early) last flight.
    const shift = toHome && sourceTrip ? lastFlightDelay(sourceTrip) : 0
    commutes.push({ id: c.id, from, to, toHome, start: start + shift, end: end + shift, schedEnd: end, sourceTripId: c.source_trip_id })
  }

  const jumpseats: Move[] = []
  for (const j of raw.jumpseats.filter(visible)) {
    if (j.source_trip_id) continue // duplicates a deadhead that is already in its trip
    const dep = toIata(j.origin)
    const arr = toIata(j.destination)
    const times = effectiveTimes(parseInstant(j.departure_time_zulu, now), parseInstant(j.arrival_time_zulu, now), null, null)
    if (!dep || !arr || !times) continue
    jumpseats.push({
      id: j.id, tripId: null, dep, arr, ...times,
      airline: resolveAirline(j.airline_code, j.flight_number, j.is_commercial_deadhead === true), // a ticket is never a UPS flight
      number: normalizeFlightNumber(j.flight_number),
      deadhead: true,
      ground: false,
    })
  }

  const categoryName = new Map(raw.eventCategories.map((c) => [c.id, c.name]))
  const events: DutyEvent[] = []
  for (const m of raw.manualEvents.filter(visible)) {
    if (m.parent_event_id) continue // TEC sub-events
    const start = parseInstant(m.start_time_utc, now)
    const end = parseInstant(m.end_time_utc, now)
    if (start == null || end == null || end <= start) continue
    const { kind, title } = classifyManualEvent(m.title, m.category_id ? categoryName.get(m.category_id) ?? null : null)
    events.push({ id: m.id, kind, title, airport: toIata(m.location), start, end })
  }
  for (const te of raw.trainingEvents.filter(visible)) {
    const start = parseInstant(te.start_time_utc, now)
    const end = parseInstant(te.end_time_utc, now)
    if (start == null || end == null || end <= start) continue
    events.push({ id: te.id, kind: 'training', title: trainingTitle(te.event_type), airport: toIata(te.station), start, end })
  }

  return {
    pilot,
    trips,
    jumpseats,
    commutes,
    events,
    fetchedAt: raw.fetchedAt,
    newestUpdatedAt: raw.newestUpdatedAt,
    empty: raw.pilotInfos.length === 0 && raw.trips.length === 0,
  }
}

function toDutyPeriod(row: DutyPeriodRow, tripId: string, flights: FlightRow[], now: number): DutyPeriod | null {
  const start = parseInstant(row.start_time, now)
  const end = parseInstant(row.end_time, now)
  if (start == null || end == null) return null
  const moves = flights
    .map((f) => toMove(f, tripId, now))
    .filter((m): m is Move => m != null)
    .sort((a, b) => a.start - b.start)
  return { id: row.id, tripId, start, end, flights: moves }
}

function toMove(row: FlightRow, tripId: string, now: number): Move | null {
  const dep = toIata(row.departure)
  const arr = toIata(row.arrival)
  const times = effectiveTimes(
    parseInstant(row.scheduled_block_out_time, now),
    parseInstant(row.scheduled_block_in_time, now),
    parseInstant(row.block_out_time, now),
    parseInstant(row.block_in_time, now),
  )
  if (!dep || !arr || !times) return null
  const rawNumber = (row.flight_number ?? '').trim().toUpperCase()
  const ground = row.is_ground_transport === true || rawNumber === 'GND'
  return {
    id: row.id,
    tripId,
    dep,
    arr,
    ...times,
    airline: resolveAirline(row.airline_code, row.flight_number, ground),
    number: normalizeFlightNumber(row.flight_number),
    deadhead: row.is_dh === true || row.is_commercial_deadhead === true || rawNumber === 'CML',
    ground,
  }
}

/** Effective minus scheduled block-in of the trip's last flight (effectiveTimes already rejected > ±6 h). */
function lastFlightDelay(trip: Trip): number {
  const flights = trip.dutyPeriods.flatMap((dp) => dp.flights)
  if (flights.length === 0) return 0
  const last = flights.reduce((a, b) => (b.end > a.end ? b : a))
  return last.end - last.schedEnd
}

function groupBy<T>(rows: T[], key: (row: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const k = key(row)
    if (!k) continue
    const list = map.get(k)
    if (list) list.push(row)
    else map.set(k, [row])
  }
  return map
}
