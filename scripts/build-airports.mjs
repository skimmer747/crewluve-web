// Builds public/data/airports.json as [iata, city, country, lat, lng, tz] tuples, plus a seventh field, the state code,
// for US airports.
// Source: the Flight Globe's merged list (Crewlu's own airport tables win over OurAirports there).
// Cities: the globe's, except where the Crewluve app's own airport table (AirportDataProvider.swift) names one
// differently: VPS, DEL, BAH and TAO.
// Countries: one spelling each, "USA" for the US (as the Crewluve app writes it) and short English names elsewhere,
// except where the Crewluve app's own airport table (AirportDataProvider.swift) spells one differently: that wins.
// States: iso_region from the OurAirports list the globe keeps beside its own ("US-KY" -> "KY"), except where the
// Crewluve app's own airport table gives another state (CVG, IAD, DJT).
// Time zones: geo-tz, installed on demand by `npm run airports` and never saved as a dependency.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
// The full dataset keeps apart zones that the default (1970) one merges: the default puts Papeete in
// Pacific/Honolulu ("HST") and La Paz in America/Puerto_Rico ("AST").
const { find } = require('geo-tz/all')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// The Flight Globe checkout is expected next to this repo; set AIRPORTS_SOURCE to read it from elsewhere.
const source = process.env.AIRPORTS_SOURCE ?? resolve(root, '../crewlu-globe/public/data/airports.json')
// The OurAirports list the globe keeps next to it; set AIRPORTS_REGIONS_SOURCE to read it from elsewhere.
const regionsSource = process.env.AIRPORTS_REGIONS_SOURCE ?? resolve(root, '../crewlu-globe/scripts/ourairports.csv')
const outFile = resolve(root, 'public/data/airports.json')

// Zones renamed in recent years, mapped to their older names. These are true aliases: the older name
// is a link to the same zone, and modern runtimes still accept it, but older browsers know only it.
const OLDER_NAMES = new Map([
  ['America/Nuuk', 'America/Godthab'],
  ['Europe/Kyiv', 'Europe/Kiev'],
  ['Pacific/Kanton', 'Pacific/Enderbury'],
])

// Zones too new for older browsers, mapped to a DIFFERENT zone that only has the same rules today.
// These are stand-ins, not aliases: if Mexico or Chile change their rules, they become wrong even in
// modern browsers. Recheck each one every time this file is regenerated.
const SAME_RULES_TODAY = new Map([
  ['America/Ciudad_Juarez', 'America/Denver'], // same rules since Nov 2022
  ['America/Coyhaique', 'America/Punta_Arenas'], // same rules since tzdata 2025b (both are permanently UTC-3)
])
const remapped = new Map()

/** RFC 4180 CSV: a quoted field may hold commas, doubled quotes and line breaks. `label` names the file in errors. */
function parseCsv(text, label) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c !== '"') field += c
      else if (text[i + 1] === '"') {
        field += '"'
        i++
      } else quoted = false
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') field += c
  }
  if (quoted) throw new Error(`${label}: a quoted field is never closed, so the file looks cut off or damaged`)
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** iata_code -> { region: iso_region ("US-KY"), country: iso_country ("US") } from OurAirports' airports.csv. Closed airports are skipped; the first open one wins. */
function regionsByIata(text) {
  const [header, ...rows] = parseCsv(text, regionsSource)
  if (!header) throw new Error(`${regionsSource} has no header row`)
  const column = (name) => {
    const i = header.indexOf(name)
    if (i < 0) throw new Error(`${regionsSource} has no ${name} column`)
    return i
  }
  const iataAt = column('iata_code')
  const regionAt = column('iso_region')
  const countryAt = column('iso_country')
  const typeAt = column('type')
  const regions = new Map()
  for (const [i, row] of rows.entries()) {
    // A blank line parses as one empty field. Skip it, as Python's csv module does; it still counts in the record numbers.
    if (row.length === 1 && row[0] === '') continue
    if (row.length !== header.length) {
      // The header is record 1, so the first airport is record 2.
      throw new Error(`${regionsSource}: record ${i + 2} has ${row.length} fields but the header has ${header.length} (the header is record 1)`)
    }
    const iata = String(row[iataAt] ?? '').trim().toUpperCase()
    if (!iata || row[typeAt] === 'closed' || regions.has(iata)) continue
    regions.set(iata, { region: String(row[regionAt] ?? ''), country: String(row[countryAt] ?? '') })
  }
  return regions
}

/** OurAirports' airports.csv as text, or an error that says what the file should be and how to point at another one. */
function readRegionsSource() {
  try {
    return readFileSync(regionsSource, 'utf8')
  } catch (error) {
    throw new Error(
      `can't read ${regionsSource} (${error.code ?? error.message}). It should be a copy of OurAirports' ` +
        `https://davidmegginson.github.io/ourairports-data/airports.csv; the Flight Globe keeps one at ` +
        `scripts/ourairports.csv. Set AIRPORTS_REGIONS_SOURCE to read it from elsewhere.`,
    )
  }
}
const regions = regionsByIata(readRegionsSource())

const longRegionNames = new Intl.DisplayNames(['en'], { type: 'region' })
const shortRegionNames = new Intl.DisplayNames(['en'], { type: 'region', style: 'short' })
// Long English names that have a shorter form: "United Kingdom" -> "UK", "Hong Kong SAR China" -> "Hong Kong".
const shortByLongName = new Map()
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
for (const a of LETTERS) {
  for (const b of LETTERS) {
    const long = longRegionNames.of(a + b)
    const short = shortRegionNames.of(a + b)
    if (long && short && long !== a + b && long !== short) shortByLongName.set(long, short)
  }
}

// The Crewluve app's own airport table (AirportDataProvider.swift) is the reference: where ICU's English name differs
// from the spelling it uses, the app's spelling wins, so each country reads one way ("Turkey", never also "Türkiye").
// This also covers "UK", which isn't an ISO code: ICU reads it as "United Kingdom".
const APP_SPELLING = new Map([
  ['Türkiye', 'Turkey'],
  ['Czechia', 'Czech Republic'],
  ['Turks & Caicos Islands', 'Turks and Caicos'],
  ['Trinidad & Tobago', 'Trinidad and Tobago'],
  ['U.S. Virgin Islands', 'US Virgin Islands'],
  ['United Kingdom', 'UK'],
  ['United Arab Emirates', 'UAE'],
  ['Hong Kong', 'China'], // not a spelling: the Crewluve app's table files HKG under China, while ICU names the code HK "Hong Kong"
])

/** One spelling per country: "USA" for the US (as the Crewluve app writes it), else the short English name, in the app's spelling where it differs. */
function countryName(raw) {
  const value = String(raw ?? '').trim()
  if (value === 'US' || value === 'USA' || value === 'United States') return 'USA'
  const name = /^[A-Z]{2}$/.test(value) ? shortRegionNames.of(value) ?? value : shortByLongName.get(value) ?? value
  return APP_SPELLING.get(name) ?? name
}

// The Crewluve app's airport table gives the city's state where it differs from where the airport sits: CVG serves
// Cincinnati, OH, and IAD serves Washington, DC. DJT replaced PBI on 2026-08-18 and isn't in OurAirports yet.
const APP_STATE = new Map([
  ['CVG', 'OH'],
  ['IAD', 'DC'],
  ['DJT', 'FL'],
])

/** The app's state for the few airports in APP_STATE, else "KY" for a US airport whose OurAirports region is "US-KY"; null for anything else. */
function usState(iata, country) {
  if (country !== 'USA') return null
  return APP_STATE.get(iata) ?? /^US-([A-Z]{2})$/.exec(regions.get(iata)?.region ?? '')?.[1] ?? null
}

// The Crewluve app's airport table names these four cities differently from the globe's list. The app's names win, so
// the site reads like the app.
const APP_CITY = new Map([
  ['VPS', 'Destin/Fort Walton Beach'],
  ['DEL', 'New Delhi'],
  ['BAH', 'Bahrain'],
  ['TAO', 'Qingdao'],
])

const skipped = { 'bad code': 0, duplicate: 0, 'bad coordinates': 0, 'no zone': 0 }
const inRange = (n, limit) => Number.isFinite(n) && Math.abs(n) <= limit
const withoutState = []

const seen = new Set()
const out = []
for (const r of JSON.parse(readFileSync(source, 'utf8'))) {
  const iata = String(r.iata ?? '').trim().toUpperCase()
  if (!/^[A-Z0-9]{3}$/.test(iata)) {
    skipped['bad code']++
    continue
  }
  if (seen.has(iata)) {
    skipped.duplicate++
    continue
  }
  if (!inRange(r.lat, 90) || !inRange(r.lng, 180)) {
    skipped['bad coordinates']++
    continue
  }
  const found = find(r.lat, r.lng)[0]
  if (!found) {
    skipped['no zone']++
    continue
  }
  const tz = OLDER_NAMES.get(found) ?? SAME_RULES_TODAY.get(found) ?? found
  if (tz !== found) remapped.set(found, (remapped.get(found) ?? 0) + 1)
  seen.add(iata)
  const round = (n) => Math.round(n * 1e4) / 1e4
  const country = countryName(r.country)
  const state = usState(iata, country)
  if (country === 'USA' && !state) withoutState.push(iata)
  const row = [iata, APP_CITY.get(iata) ?? String(r.city || iata), country, round(r.lat), round(r.lng), tz]
  if (state) row.push(state)
  out.push(row)
}
out.sort((a, b) => (a[0] < b[0] ? -1 : 1))
console.log(`ICU ${process.versions.icu}`)

// The expected number of US airports without a state is 0. More than a handful means the OurAirports CSV is cut off or
// damaged. A few can be real, such as an airport too new for OurAirports; they are let through and logged below.
const MAX_WITHOUT_STATE = 10
withoutState.sort()
if (withoutState.length > MAX_WITHOUT_STATE) {
  const first = withoutState.slice(0, 20)
  throw new Error(
    `${withoutState.length} US airports have no state (the expected number is 0, and more than ${MAX_WITHOUT_STATE} points to a ` +
      `cut-off or damaged ${regionsSource}). ${withoutState.length > first.length ? 'First 20' : 'They are'}: ${first.join(', ')}`,
  )
}

// One country must not read two ways. OurAirports' iso_country says which airports share a country, so this catches a
// spelling that APP_SPELLING doesn't cover yet. The check is per code: "China" for both CN and HK is fine.
const namesByCode = new Map()
for (const [iata, , country] of out) {
  const code = regions.get(iata)?.country
  if (!code) continue
  if (!namesByCode.has(code)) namesByCode.set(code, new Set())
  namesByCode.get(code).add(country)
}
const split = [...namesByCode].filter(([, names]) => names.size > 1)
if (split.length > 0) {
  const list = split.map(([code, names]) => `${code} ${[...names].join(' / ')}`).join('; ')
  throw new Error(
    `with ICU ${process.versions.icu}, a country would read two ways: ${list}. If this follows a Node or ICU update, the ` +
      `runtime may have renamed a country; otherwise add the Crewluve app's spelling to APP_SPELLING in scripts/build-airports.mjs.`,
  )
}

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, JSON.stringify(out))
console.log(`wrote ${out.length} airports to ${outFile}`)
console.log(`skipped: ${Object.entries(skipped).map(([reason, n]) => `${n} ${reason}`).join(', ')}`)
console.log(`US airports without a state: ${withoutState.length}${withoutState.length > 0 ? ` [${withoutState.join(', ')}]` : ''}`)
const summarize = (names) =>
  [...remapped]
    .filter(([from]) => names.has(from))
    .map(([from, n]) => `${from} -> ${names.get(from)} (${n})`)
    .join(', ')
const aliases = summarize(OLDER_NAMES)
const standIns = summarize(SAME_RULES_TODAY)
if (aliases) console.log(`mapped to older names: ${aliases}`)
if (standIns) console.log(`stand-ins that only share today's rules, recheck them: ${standIns}`)

// A zone this Node's Intl rejects would throw when a time is formatted in it, so flag any that are left.
const rejected = [...new Set(out.map((row) => row[5]))].filter((zone) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return false
  } catch {
    return true
  }
})
if (rejected.length > 0) console.warn(`warning: this Node's Intl does not know ${rejected.join(', ')}`)
