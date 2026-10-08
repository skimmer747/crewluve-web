// Builds public/data/airports.json as [iata, city, country, lat, lng, tz] tuples.
// Source: the Flight Globe's merged list (Crewlu's own airport tables win over OurAirports there).
// Time zones: geo-tz, installed on demand by `npm run airports` and never saved as a dependency.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { find } = require('geo-tz')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = process.env.AIRPORTS_SOURCE ?? '~/Dev/crewlu-globe/public/data/airports.json'
const outFile = resolve(root, 'public/data/airports.json')

const seen = new Set()
const out = []
for (const r of JSON.parse(readFileSync(source, 'utf8'))) {
  const iata = String(r.iata ?? '').trim().toUpperCase()
  if (!/^[A-Z0-9]{3}$/.test(iata) || seen.has(iata)) continue
  if (typeof r.lat !== 'number' || typeof r.lng !== 'number') continue
  const tz = find(r.lat, r.lng)[0]
  if (!tz) continue
  seen.add(iata)
  const round = (n) => Math.round(n * 1e4) / 1e4
  out.push([iata, String(r.city ?? iata), String(r.country ?? ''), round(r.lat), round(r.lng), tz])
}
out.sort((a, b) => (a[0] < b[0] ? -1 : 1))
mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, JSON.stringify(out))
console.log(`wrote ${out.length} airports to ${outFile}`)
