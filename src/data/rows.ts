// CrewLu Cloud's table shapes. The site no longer reads them (piece 5a); the demo is built from rows of these shapes,
// through buildSchedule. Timestamps are ISO-8601 UTC strings.

export interface PilotInfoRow {
  first_name: string | null
  base_raw_value: string | null
  home_airport_code: string | null
  is_active: boolean | null
  updated_at: string
}

export interface TripRow {
  id: string
  start_date: string | null
  end_date: string | null
  days: number | null
  base: string | null
  updated_at: string
}

export interface DutyPeriodRow {
  id: string
  trip_id: string | null
  day: number | null
  start_time: string | null
  end_time: string | null
  updated_at: string
}

export interface FlightRow {
  id: string
  trip_id: string | null
  duty_period_id: string | null
  flight_number: string | null
  airline_code: string | null
  departure: string | null
  arrival: string | null
  scheduled_block_out_time: string | null
  scheduled_block_in_time: string | null
  block_out_time: string | null
  block_in_time: string | null
  is_dh: boolean | null
  is_commercial_deadhead: boolean | null
  is_ground_transport: boolean | null
  hidden_from_timeline: boolean | null
  updated_at: string
}

export interface CommuteRow {
  id: string
  from_airport: string | null
  to_airport: string | null
  direction: string | null
  departure_time_zulu: string | null
  arrival_time_zulu: string | null
  source_trip_id: string | null
  hidden_from_timeline: boolean | null
  updated_at: string
}

export interface JumpseatRow {
  id: string
  source_trip_id: string | null
  flight_number: string | null
  airline_code: string | null
  origin: string | null
  destination: string | null
  departure_time_zulu: string | null
  arrival_time_zulu: string | null
  status_raw_value: string | null
  is_commercial_deadhead: boolean | null
  hidden_from_timeline: boolean | null
  updated_at: string
}

export interface TrainingEventRow {
  id: string
  event_type: string | null
  start_time_utc: string | null
  end_time_utc: string | null
  station: string | null
  hidden_from_timeline: boolean | null
  updated_at: string
}

export interface ManualEventRow {
  id: string
  parent_event_id: string | null
  category_id: string | null
  title: string | null
  start_time_utc: string | null
  end_time_utc: string | null
  location: string | null
  hidden_from_timeline: boolean | null
  updated_at: string
}

export interface EventCategoryRow {
  id: string
  name: string | null
}

/** The rows of one schedule, per table. */
export interface ScheduleRows {
  pilotInfos: PilotInfoRow[]
  trips: TripRow[]
  dutyPeriods: DutyPeriodRow[]
  flights: FlightRow[]
  commutes: CommuteRow[]
  jumpseats: JumpseatRow[]
  trainingEvents: TrainingEventRow[]
  manualEvents: ManualEventRow[]
  eventCategories: EventCategoryRow[]
}

export interface RawSchedule extends ScheduleRows {
  /** When these rows were made (epoch ms). */
  fetchedAt: number
  /** Newest updated_at among the rows: the last time the pilot's phone sent a change. */
  newestUpdatedAt: number | null
}

export function newestUpdatedAt(rows: ScheduleRows): number | null {
  const tables: { updated_at: string }[][] = [
    rows.pilotInfos, rows.trips, rows.dutyPeriods, rows.flights,
    rows.commutes, rows.jumpseats, rows.trainingEvents, rows.manualEvents,
  ]
  let newest: number | null = null
  for (const table of tables) {
    for (const row of table) {
      const t = Date.parse(row.updated_at)
      if (Number.isFinite(t) && (newest == null || t > newest)) newest = t
    }
  }
  return newest
}
