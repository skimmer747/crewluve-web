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
  get(code: string | null | undefined): Airport | undefined
  /** City name, falling back to the code itself; null only when there is no code. */
  city(code: string | null | undefined): string | null
  /** IANA time zone, or null for unknown airports. */
  tz(code: string | null | undefined): string | null
}

export function buildAirportIndex(rows: AirportTuple[]): AirportIndex {
  const map = new Map<string, Airport>()
  for (const [iata, city, country, lat, lng, tz] of rows) {
    const code = iata.toUpperCase()
    map.set(code, { iata: code, city, country, lat, lng, tz })
  }
  const clean = (code: string | null | undefined) => (code ? code.trim().toUpperCase() : '')
  const get = (code: string | null | undefined) => map.get(clean(code))
  return {
    get,
    city: (code) => (clean(code) ? get(code)?.city ?? clean(code) : null),
    tz: (code) => get(code)?.tz ?? null,
  }
}

export async function loadAirports(url = '/data/airports.json'): Promise<AirportIndex> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`airports.json ${res.status}`)
  return buildAirportIndex((await res.json()) as AirportTuple[])
}
