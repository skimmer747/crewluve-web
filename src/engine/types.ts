/** 3-letter IATA airport code. */
export type Iata = string

export interface Pilot {
  firstName: string | null
  base: Iata | null
  home: Iata | null
  /** home ?? base: how Crewlu treats a pilot who never set a home airport. */
  effHome: Iata | null
}

/** A timed movement between airports: a trip flight or a standalone jumpseat. Times are epoch ms. */
export interface Move {
  id: string
  tripId: string | null
  dep: Iata
  arr: Iata
  /** Effective (delay-aware) block out and in. */
  start: number
  end: number
  schedStart: number
  schedEnd: number
  /** Airline code; company flights resolve to '5X' (UPS). */
  airline: string | null
  /** The airline code as the pilot entered it, trimmed and in upper case, or null: `airline` without the UPS guess. */
  enteredAirline: string | null
  /** Digits only; null for placeholders such as XXXX, CML, GND. */
  number: string | null
  deadhead: boolean
  ground: boolean
}

export interface DutyPeriod {
  id: string
  tripId: string
  start: number
  end: number
  flights: Move[]
}

export interface Trip {
  id: string
  start: number
  end: number
  days: number | null
  dutyPeriods: DutyPeriod[]
}

export interface Commute {
  id: string
  from: Iata
  to: Iata
  toHome: boolean
  start: number
  end: number
  /** The stored arrival, before any late-flight shift. */
  schedEnd: number
  sourceTripId: string | null
}

export type DutyEventKind = 'reserve' | 'hotStandby' | 'training' | 'event'

export interface DutyEvent {
  id: string
  kind: DutyEventKind
  title: string
  airport: Iata | null
  /** The location as entered, trimmed, or null: the airport's code, or free text such as "Training Center". */
  location: string | null
  start: number
  end: number
}

export interface Schedule {
  pilot: Pilot
  trips: Trip[]
  jumpseats: Move[]
  commutes: Commute[]
  events: DutyEvent[]
  fetchedAt: number
  newestUpdatedAt: number | null
  /** No pilot profile and no trips at all: CrewLu Cloud has nothing for this account. */
  empty: boolean
}
