import { calendarDay, DAY, MINUTE } from './zoned'

/** When the sun rises and sets on one local day, as instants (ms since the epoch). */
export interface SunTimes {
  sunrise: number
  sunset: number
}

/**
 * The horizon for sunrise and sunset, and for daylight on the in-flight map as in the app: the sun's center 0.833° below
 * the horizon, for refraction and the sun's radius.
 */
export const SUN_UP_ALTITUDE = -0.833

/** The same horizon as a zenith angle, for the sunrise and sunset formulas. */
const ZENITH = 90 - SUN_UP_ALTITUDE

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** The sun's declination (degrees) and the equation of time (minutes) at an instant, by NOAA's Solar Calculator formulas. */
function solarPosition(ms: number): { declination: number; equationOfTime: number } {
  const jc = (ms / DAY + 2440587.5 - 2451545) / 36525 // Julian centuries since J2000.0
  const meanLong = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360
  const meanAnomaly = 357.52911 + jc * (35999.05029 - 0.0001537 * jc)
  const eccentricity = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc)
  const center =
    Math.sin(rad(meanAnomaly)) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
    Math.sin(rad(2 * meanAnomaly)) * (0.019993 - 0.000101 * jc) +
    Math.sin(rad(3 * meanAnomaly)) * 0.000289
  const omega = 125.04 - 1934.136 * jc
  const apparentLong = meanLong + center - 0.00569 - 0.00478 * Math.sin(rad(omega))
  const obliquity = 23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(rad(omega))
  const declination = deg(Math.asin(Math.sin(rad(obliquity)) * Math.sin(rad(apparentLong))))
  const y = Math.tan(rad(obliquity / 2)) ** 2
  const equationOfTime =
    4 *
    deg(
      y * Math.sin(2 * rad(meanLong)) -
        2 * eccentricity * Math.sin(rad(meanAnomaly)) +
        4 * eccentricity * y * Math.sin(rad(meanAnomaly)) * Math.cos(2 * rad(meanLong)) -
        0.5 * y * y * Math.sin(4 * rad(meanLong)) -
        1.25 * eccentricity * eccentricity * Math.sin(2 * rad(meanAnomaly)),
    )
  return { declination, equationOfTime }
}

/**
 * Sunrise and sunset at latitude `lat` and longitude `lng` (degrees, east positive) on the calendar day that holds
 * `t` in `timeZone` (slice 2B1 §6). Null when the sun doesn't rise or doesn't set that day: polar night or polar day.
 */
export function sunTimes(t: number, lat: number, lng: number, timeZone: string): SunTimes | null {
  const day = calendarDay(t, timeZone)
  // Solar noon falls near 12:00 UTC, moved by the longitude's share of a day. A zone far from its longitude's natural
  // offset (Kiritimati keeps UTC+14 at 157°W) puts that noon on the next or previous local date, so count from the UTC
  // midnight that lands solar noon on the local date asked for.
  const noonOf = (midnight: number) => midnight + DAY / 2 - (lng / 360) * DAY
  let midnight = day * DAY
  midnight -= (calendarDay(noonOf(midnight), timeZone) - day) * DAY
  const { declination, equationOfTime } = solarPosition(noonOf(midnight))
  const cosHourAngle =
    Math.cos(rad(ZENITH)) / (Math.cos(rad(lat)) * Math.cos(rad(declination))) - Math.tan(rad(lat)) * Math.tan(rad(declination))
  if (!(cosHourAngle >= -1 && cosHourAngle <= 1)) return null
  const hourAngle = deg(Math.acos(cosHourAngle))
  const solarNoon = midnight + (720 - 4 * lng - equationOfTime) * MINUTE
  return { sunrise: solarNoon - 4 * hourAngle * MINUTE, sunset: solarNoon + 4 * hourAngle * MINUTE }
}

/** Whether `t` falls between sunrise and sunset. */
export function isDaytime(t: number, sun: SunTimes): boolean {
  return sun.sunrise <= t && t < sun.sunset
}

/**
 * The sun's altitude above the horizon in degrees, at latitude `lat`, longitude `lng` (east positive) and instant `t`,
 * from the same NOAA position as sunrise and sunset (slice 2C §4.3). The in-flight map uses it for day and night. The
 * app's map has its own formula, wrong by up to two hours, which the site doesn't copy (slice 2C §10 item 8).
 */
export function sunAltitude(t: number, lat: number, lng: number): number {
  const { declination, equationOfTime } = solarPosition(t)
  const utcMinutes = (((t % DAY) + DAY) % DAY) / MINUTE
  let hourAngle = (utcMinutes + equationOfTime + 4 * lng) / 4 - 180
  while (hourAngle > 180) hourAngle -= 360
  while (hourAngle < -180) hourAngle += 360
  const cosZenith =
    Math.sin(rad(lat)) * Math.sin(rad(declination)) + Math.cos(rad(lat)) * Math.cos(rad(declination)) * Math.cos(rad(hourAngle))
  return 90 - deg(Math.acos(Math.min(1, Math.max(-1, cosZenith))))
}

/** Whether the sun is up at latitude `lat`, longitude `lng` and instant `t`: above the sunrise and sunset horizon. */
export function isSunUp(t: number, lat: number, lng: number): boolean {
  return sunAltitude(t, lat, lng) > SUN_UP_ALTITUDE
}
