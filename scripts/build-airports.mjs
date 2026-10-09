// Builds public/data/airports.json as [iata, city, country, lat, lng, tz] tuples.
// Source: the Flight Globe's merged list (Crewlu's own airport tables win over OurAirports there).
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

const skipped = { 'bad code': 0, duplicate: 0, 'bad coordinates': 0, 'no zone': 0 }
const inRange = (n, limit) => Number.isFinite(n) && Math.abs(n) <= limit

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
  out.push([iata, String(r.city || iata), String(r.country ?? ''), round(r.lat), round(r.lng), tz])
}
out.sort((a, b) => (a[0] < b[0] ? -1 : 1))
mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, JSON.stringify(out))
console.log(`wrote ${out.length} airports to ${outFile}`)
console.log(`skipped: ${Object.entries(skipped).map(([reason, n]) => `${n} ${reason}`).join(', ')}`)
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
