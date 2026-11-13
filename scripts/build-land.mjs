// Writes public/data/land.json: Natural Earth's 1:110m land (public domain), trimmed for the trip map (moving map spec
// §11). Each ring is [[lng, lat], …] rounded to 0.1°, with repeats dropped. Rings of fewer than 4 points are dropped.
// A polygon's holes are rings too (at this scale, only the Caspian Sea), so the map fills the land even-odd.
// Reads scripts/ne_110m_land.geojson, or LAND_SOURCE: Natural Earth v5.1.2's geojson/ne_110m_land.geojson, from
// https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_land.geojson
import { readFileSync, writeFileSync } from 'node:fs'

const source = process.env.LAND_SOURCE ?? new URL('./ne_110m_land.geojson', import.meta.url)
const geo = JSON.parse(readFileSync(source, 'utf8'))
const round = (v) => Math.round(v * 10) / 10
const rings = []
for (const feature of geo.features) {
  const { type, coordinates } = feature.geometry
  const polygons = type === 'Polygon' ? [coordinates] : type === 'MultiPolygon' ? coordinates : []
  for (const polygon of polygons) {
    for (const line of polygon) {
      const ring = []
      for (const [lng, lat] of line) {
        const point = [round(lng), round(lat)]
        const last = ring[ring.length - 1]
        if (!last || last[0] !== point[0] || last[1] !== point[1]) ring.push(point)
      }
      if (ring.length >= 4) rings.push(ring)
    }
  }
}
writeFileSync(new URL('../public/data/land.json', import.meta.url), JSON.stringify(rings))
console.log(`land.json: ${rings.length} rings, ${rings.reduce((n, r) => n + r.length, 0)} points`)
