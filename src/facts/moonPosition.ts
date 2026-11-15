import type { GeoPoint } from '../map/greatCircle'

/**
 * Where the moon is (Stage 2 spec §4.5): the point it's straight above, ported from crewlu-globe's subLunarPoint
 * (src/astro/moon.ts, Paul Schlyter's method, good to a degree or two, plenty to say whether it's up), and its height
 * at a place. Its phase is the site's own moonPhase (src/time/moon.ts).
 */

const rev = (x: number) => ((x % 360) + 360) % 360
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** The point on the earth with the moon straight overhead at `t`, in degrees, longitude east positive. */
export function subLunarPoint(t: number): GeoPoint {
  const d = t / 86_400_000 + 2440587.5 - 2451543.5 // days from Schlyter's epoch
  const node = rev(125.1228 - 0.0529538083 * d)
  const inclination = 5.1454
  const perigee = rev(318.0634 + 0.1643573223 * d)
  const meanDistance = 60.2666
  const eccentricity = 0.0549
  const meanAnomaly = rev(115.3654 + 13.0649929509 * d)

  let eccentricAnomaly = meanAnomaly + deg(eccentricity * Math.sin(rad(meanAnomaly)) * (1 + eccentricity * Math.cos(rad(meanAnomaly))))
  for (let k = 0; k < 4; k++) {
    eccentricAnomaly -= (eccentricAnomaly - deg(eccentricity * Math.sin(rad(eccentricAnomaly))) - meanAnomaly) /
      (1 - eccentricity * Math.cos(rad(eccentricAnomaly)))
  }

  const x = meanDistance * (Math.cos(rad(eccentricAnomaly)) - eccentricity)
  const y = meanDistance * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(rad(eccentricAnomaly))
  const trueAnomaly = rev(deg(Math.atan2(y, x)))
  const distance = Math.hypot(x, y)
  const argument = rad(trueAnomaly + perigee)

  const xh = distance * (Math.cos(rad(node)) * Math.cos(argument) - Math.sin(rad(node)) * Math.sin(argument) * Math.cos(rad(inclination)))
  const yh = distance * (Math.sin(rad(node)) * Math.cos(argument) + Math.cos(rad(node)) * Math.sin(argument) * Math.cos(rad(inclination)))
  const zh = distance * Math.sin(argument) * Math.sin(rad(inclination))
  const eclipticLongitude = rad(rev(deg(Math.atan2(yh, xh))))
  const eclipticLatitude = Math.atan2(zh, Math.hypot(xh, yh))

  const obliquity = rad(23.4393 - 3.563e-7 * d)
  const xe = Math.cos(eclipticLongitude) * Math.cos(eclipticLatitude)
  const ye = Math.sin(eclipticLongitude) * Math.cos(eclipticLatitude) * Math.cos(obliquity) - Math.sin(eclipticLatitude) * Math.sin(obliquity)
  const ze = Math.sin(eclipticLongitude) * Math.cos(eclipticLatitude) * Math.sin(obliquity) + Math.sin(eclipticLatitude) * Math.cos(obliquity)
  const rightAscension = rev(deg(Math.atan2(ye, xe)))
  const declination = deg(Math.atan2(ze, Math.hypot(xe, ye)))

  const siderealTime = rev(280.46061837 + 360.98564736629 * (t / 86_400_000 + 2440587.5 - 2451545.0))
  return { lat: declination, lng: ((rightAscension - siderealTime + 540) % 360) - 180 }
}

/** The moon's height above the horizon at a place, in degrees. Its parallax, about a degree, is left out (§4.5). */
export function moonAltitude(lat: number, lng: number, t: number): number {
  const moon = subLunarPoint(t)
  const sine = Math.sin(rad(lat)) * Math.sin(rad(moon.lat)) + Math.cos(rad(lat)) * Math.cos(rad(moon.lat)) * Math.cos(rad(lng - moon.lng))
  return deg(Math.asin(Math.min(Math.max(sine, -1), 1)))
}
