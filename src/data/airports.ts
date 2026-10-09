import { isKnownZone } from '../time/zoned'

/** One airport in public/data/airports.json. */
export type AirportTuple = [iata: string, city: string, country: string, lat: number, lng: number, tz: string]

export interface Airport {
  iata: string
  city: string
  country: string
  lat: number
  lng: number
  tz: string
}

export interface AirportIndex {
  /** The airport record. Its `tz` is the raw value from the data file, which this runtime's Intl may not know; do time-zone math with `tz()` instead. */
  get(code: string | null | undefined): Airport | undefined
  /** City name, falling back to the code itself when the airport is unknown or its city name is empty; null only when there is no code. */
  city(code: string | null | undefined): string | null
  /** IANA time zone, or null for unknown airports and for zones this runtime's Intl does not know. */
  tz(code: string | null | undefined): string | null
}

export function buildAirportIndex(rows: AirportTuple[]): AirportIndex {
  const clean = (code: string | null | undefined) => (code ? code.trim().toUpperCase() : '')
  const map = new Map<string, Airport>()
  for (const [iata, city, country, lat, lng, tz] of rows) {
    const code = clean(iata)
    if (!code) continue
    map.set(code, { iata: code, city, country, lat, lng, tz })
  }
  return {
    get: (code) => map.get(clean(code)),
    city: (code) => {
      const key = clean(code)
      return key ? map.get(key)?.city || key : null
    },
    tz: (code) => {
      const zone = map.get(clean(code))?.tz
      return zone && isKnownZone(zone) ? zone : null
    },
  }
}

export async function loadAirports(url = `${import.meta.env.BASE_URL}data/airports.json`): Promise<AirportIndex> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`airports.json ${res.status}`)
  return buildAirportIndex((await res.json()) as AirportTuple[])
}
