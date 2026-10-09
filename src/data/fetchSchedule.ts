import { DAY } from '../time/zoned'
import {
  COLUMNS, newestUpdatedAt,
  type CommuteRow, type DutyPeriodRow, type EventCategoryRow, type FlightRow, type JumpseatRow,
  type ManualEventRow, type PilotInfoRow, type RawSchedule, type TrainingEventRow, type TripRow,
} from './rows'

export const WINDOW_PAST = 60 * DAY
export const WINDOW_FUTURE = 120 * DAY
const PAGE = 1000

/** The slice of the Supabase client this module uses, so tests can pass a fake. */
export interface SelectClient {
  // PostgREST's builder types are deep generics; this module only chains select/is/not/gte/lte/order/range.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any
}

export class ScheduleFetchError extends Error {
  constructor(message: string, readonly status: number | null, readonly code: string | null) {
    super(message)
    this.name = 'ScheduleFetchError'
  }

  /** The session is no longer valid: send the visitor back to sign-in. */
  get isAuth(): boolean {
    return this.status === 401 || this.code === 'PGRST301' || this.code === 'PGRST302'
  }
}

type Table = keyof typeof COLUMNS
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Filter = (query: any) => any

/**
 * Rows the pilot hid in Crewlu are not downloaded at all (spec §9); normalize.ts still drops any that get through.
 * It applies to every table that selects the flag. `not ... is true` keeps rows where the flag is false or null.
 */
const hidesRows = (table: Table) => COLUMNS[table].split(',').includes('hidden_from_timeline')

async function selectAll<T>(client: SelectClient, table: Table, filter: Filter): Promise<T[]> {
  const rows: T[] = []
  const skipHidden = hidesRows(table)
  for (let from = 0; ; from += PAGE) {
    const live = client.from(table).select(COLUMNS[table]).is('deleted_at', null)
    const res = await filter(skipHidden ? live.not('hidden_from_timeline', 'is', true) : live)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (res.error) throw new ScheduleFetchError(res.error.message ?? `${table} failed`, res.status ?? null, res.error.code ?? null)
    const page = (res.data ?? []) as T[]
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

/** Reads the signed-in pilot's schedule window from CrewLu Cloud. Read-only: select queries only (spec §6.1). */
export async function fetchSchedule(client: SelectClient, now: number): Promise<RawSchedule> {
  const from = new Date(now - WINDOW_PAST).toISOString()
  const to = new Date(now + WINDOW_FUTURE).toISOString()
  const everything: Filter = (q) => q
  const [pilotInfos, trips, dutyPeriods, flights, commutes, jumpseats, trainingEvents, manualEvents, eventCategories] = await Promise.all([
    selectAll<PilotInfoRow>(client, 'pilot_infos', everything),
    selectAll<TripRow>(client, 'trips', (q) => q.gte('end_date', from).lte('start_date', to)),
    selectAll<DutyPeriodRow>(client, 'duty_periods', (q) => q.gte('start_time', from).lte('start_time', to)),
    selectAll<FlightRow>(client, 'flights', (q) => q.gte('scheduled_block_out_time', from).lte('scheduled_block_out_time', to)),
    selectAll<CommuteRow>(client, 'commutes', (q) => q.gte('arrival_time_zulu', from).lte('departure_time_zulu', to)),
    selectAll<JumpseatRow>(client, 'jumpseats', (q) => q.gte('arrival_time_zulu', from).lte('departure_time_zulu', to)),
    selectAll<TrainingEventRow>(client, 'training_events', (q) => q.gte('end_time_utc', from).lte('start_time_utc', to)),
    selectAll<ManualEventRow>(client, 'manual_events', (q) => q.gte('end_time_utc', from).lte('start_time_utc', to)),
    selectAll<EventCategoryRow>(client, 'event_categories', everything),
  ])
  const rows = { pilotInfos, trips, dutyPeriods, flights, commutes, jumpseats, trainingEvents, manualEvents, eventCategories }
  return { ...rows, fetchedAt: now, newestUpdatedAt: newestUpdatedAt(rows) }
}
