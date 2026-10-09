import { newestUpdatedAt, type PilotInfoRow, type RawSchedule, type ScheduleRows } from './rows'

const MIN = 60_000

export interface FlightSpec {
  dep: string
  arr: string
  /** Scheduled block out/in, in minutes from the anchor. */
  out: number
  in: number
  /** Actual/ETD times in minutes; omitted means "same as scheduled", which is how Crewlu stores on-time flights. */
  actualOut?: number
  actualIn?: number
  /** Default '1000' (a company flight). */
  number?: string | null
  /** Default null (company flight). */
  airline?: string | null
  dh?: boolean
  commercialDh?: boolean
  ground?: boolean
  hidden?: boolean
}

export interface DutySpec {
  start: number
  end: number
  flights: FlightSpec[]
}

export interface TripSpec {
  days?: number
  base?: string
  dutyPeriods: DutySpec[]
}

/** Builds CrewLu Cloud rows from minute offsets around an anchor instant (tests and the demo). */
export class RawBuilder {
  private readonly rows: ScheduleRows = {
    pilotInfos: [], trips: [], dutyPeriods: [], flights: [], commutes: [],
    jumpseats: [], trainingEvents: [], manualEvents: [], eventCategories: [],
  }

  constructor(
    private readonly anchor: number,
    private readonly updatedAt = '2026-10-01T00:00:00.000Z',
  ) {}

  iso(minutes: number): string {
    return new Date(this.anchor + minutes * MIN).toISOString()
  }

  pilot(firstName: string | null, base: string | null, home: string | null, extra: Partial<PilotInfoRow> = {}): this {
    this.rows.pilotInfos.push({
      first_name: firstName,
      base_raw_value: base,
      home_airport_code: home,
      is_active: true,
      updated_at: this.updatedAt,
      ...extra,
    })
    return this
  }

  trip(id: string, spec: TripSpec): this {
    const starts = spec.dutyPeriods.map((d) => d.start)
    const ends = spec.dutyPeriods.map((d) => d.end)
    this.rows.trips.push({
      id,
      start_date: this.iso(Math.min(...starts)),
      end_date: this.iso(Math.max(...ends)),
      days: spec.days ?? null,
      base: spec.base ?? null,
      updated_at: this.updatedAt,
    })
    spec.dutyPeriods.forEach((dp, i) => {
      const dpId = `${id}|dp|${i}`
      this.rows.dutyPeriods.push({
        id: dpId, trip_id: id, day: i + 1,
        start_time: this.iso(dp.start), end_time: this.iso(dp.end), updated_at: this.updatedAt,
      })
      dp.flights.forEach((f, j) => {
        this.rows.flights.push({
          id: `${id}|f|${i}.${j}`,
          trip_id: id,
          duty_period_id: dpId,
          flight_number: f.number === undefined ? '1000' : f.number,
          airline_code: f.airline ?? null,
          departure: f.dep,
          arrival: f.arr,
          scheduled_block_out_time: this.iso(f.out),
          scheduled_block_in_time: this.iso(f.in),
          block_out_time: this.iso(f.actualOut ?? f.out),
          block_in_time: this.iso(f.actualIn ?? f.in),
          is_dh: f.dh ?? false,
          is_commercial_deadhead: f.commercialDh ?? false,
          is_ground_transport: f.ground ?? false,
          hidden_from_timeline: f.hidden ?? false,
          updated_at: this.updatedAt,
        })
      })
    })
    return this
  }

  commute(id: string, from: string, to: string, direction: 'toHome' | 'toWork', dep: number, arr: number,
    sourceTripId: string | null = null, hidden = false): this {
    this.rows.commutes.push({
      id, from_airport: from, to_airport: to, direction,
      departure_time_zulu: this.iso(dep), arrival_time_zulu: this.iso(arr),
      source_trip_id: sourceTripId, hidden_from_timeline: hidden, updated_at: this.updatedAt,
    })
    return this
  }

  jumpseat(id: string, origin: string, destination: string, dep: number, arr: number,
    opts: { airline?: string | null; number?: string | null; sourceTripId?: string | null; status?: string; hidden?: boolean } = {}): this {
    this.rows.jumpseats.push({
      id,
      source_trip_id: opts.sourceTripId ?? null,
      flight_number: opts.number === undefined ? '1234' : opts.number,
      airline_code: opts.airline === undefined ? 'DL' : opts.airline,
      origin,
      destination,
      departure_time_zulu: this.iso(dep),
      arrival_time_zulu: this.iso(arr),
      status_raw_value: opts.status ?? 'Confirmed',
      is_commercial_deadhead: false,
      hidden_from_timeline: opts.hidden ?? false,
      updated_at: this.updatedAt,
    })
    return this
  }

  category(id: string, name: string): this {
    this.rows.eventCategories.push({ id, name })
    return this
  }

  manualEvent(id: string, title: string | null, start: number, end: number, location: string | null,
    opts: { parentId?: string; categoryId?: string; hidden?: boolean } = {}): this {
    this.rows.manualEvents.push({
      id, parent_event_id: opts.parentId ?? null, category_id: opts.categoryId ?? null, title,
      start_time_utc: this.iso(start), end_time_utc: this.iso(end), location,
      hidden_from_timeline: opts.hidden ?? false, updated_at: this.updatedAt,
    })
    return this
  }

  training(id: string, eventType: string | null, start: number, end: number, station: string | null, hidden = false): this {
    this.rows.trainingEvents.push({
      id, event_type: eventType, start_time_utc: this.iso(start), end_time_utc: this.iso(end),
      station, hidden_from_timeline: hidden, updated_at: this.updatedAt,
    })
    return this
  }

  build(fetchedAtMinutes = 0): RawSchedule {
    const rows = structuredClone(this.rows)
    return { ...rows, fetchedAt: this.anchor + fetchedAtMinutes * MIN, newestUpdatedAt: newestUpdatedAt(rows) }
  }
}
