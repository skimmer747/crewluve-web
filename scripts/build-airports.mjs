// Builds public/data/airports.json as [iata, city, country, lat, lng, tz] tuples, plus a seventh field, the state code,
// for US airports.
// Source: the Flight Globe's merged list (Crewlu's own airport tables win over OurAirports there).
// Countries: one spelling each, "USA" for the US (as the Crewluve app writes it) and short English names elsewhere,
// in Crewlu's own spelling where the two differ.
// States: iso_region from the OurAirports list the globe keeps beside its own ("US-KY" -> "KY").
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

/** RFC 4180 CSV: a quoted field may hold commas, doubled quotes and line breaks. */
function parseCsv(text) {
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
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** iata_code -> iso_region ("US-KY") from OurAirports' airports.csv. Closed airports are skipped; the first open one wins. */
function regionsByIata(text) {
  const [header, ...rows] = parseCsv(text)
  const column = (name) => {
    const i = header.indexOf(name)
    if (i < 0) throw new Error(`${regionsSource} has no ${name} column`)
    return i
  }
  const iataAt = column('iata_code')
  const regionAt = column('iso_region')
  const typeAt = column('type')
  const regions = new Map()
  for (const row of rows) {
    const iata = String(row[iataAt] ?? '').trim().toUpperCase()
    if (!iata || row[typeAt] === 'closed' || regions.has(iata)) continue
    regions.set(iata, String(row[regionAt] ?? ''))
  }
  return regions
}
const regions = regionsByIata(readFileSync(regionsSource, 'utf8'))

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

// Where ICU's English name differs from the spelling Crewlu's own airport tables use, the Crewlu spelling wins, so each
// country reads one way ("Turkey", never also "Türkiye"). This also covers "UK", which isn't an ISO code: ICU reads it
// as "United Kingdom".
const CREWLU_SPELLING = new Map([
  ['Türkiye', 'Turkey'],
  ['Czechia', 'Czech Republic'],
  ['Turks & Caicos Islands', 'Turks and Caicos'],
  ['Trinidad & Tobago', 'Trinidad and Tobago'],
  ['U.S. Virgin Islands', 'US Virgin Islands'],
  ['United Kingdom', 'UK'],
  ['Hong Kong', 'China'], // not a spelling: Crewlu's tables file HKG under China, while ICU names the code HK "Hong Kong"
])

/** One spelling per country: "USA" for the US (as the Crewluve app writes it), else the short English name, in Crewlu's spelling where it differs. */
function countryName(raw) {
  const value = String(raw ?? '').trim()
  if (value === 'US' || value === 'USA' || value === 'United States') return 'USA'
  const name = /^[A-Z]{2}$/.test(value) ? shortRegionNames.of(value) ?? value : shortByLongName.get(value) ?? value
  return CREWLU_SPELLING.get(name) ?? name
}

/** "KY" for a US airport whose OurAirports region is "US-KY"; null for anything else. */
function usState(iata, country) {
  if (country !== 'USA') return null
  return /^US-([A-Z]{2})$/.exec(regions.get(iata) ?? '')?.[1] ?? null
}

const skipped = { 'bad code': 0, duplicate: 0, 'bad coordinates': 0, 'no zone': 0 }
const inRange = (n, limit) => Number.isFinite(n) && Math.abs(n) <= limit
let withoutState = 0

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
  if (country === 'USA' && !state) withoutState++
  const row = [iata, String(r.city || iata), country, round(r.lat), round(r.lng), tz]
  if (state) row.push(state)
  out.push(row)
}
out.sort((a, b) => (a[0] < b[0] ? -1 : 1))
mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, JSON.stringify(out))
console.log(`wrote ${out.length} airports to ${outFile}`)
console.log(`skipped: ${Object.entries(skipped).map(([reason, n]) => `${n} ${reason}`).join(', ')}`)
console.log(`US airports without a state: ${withoutState}`)
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
