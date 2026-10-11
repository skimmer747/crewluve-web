# Crewluve Web Slice 2 Part B1 (Location Card) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Crewluve app's location card to crewluve.crewlu.net: the city and flag, the weather, the pilot's local time, how far that is from home, and the small 24-hour sun dial.

**Architecture:** The sun times are worked out on the site with NOAA's formulas (`src/time/sun.ts`). The weather comes from Open-Meteo through a small data module, with made-up samples in the demo, and a hook keeps it fresh for 15 minutes at a time. Copy modules turn weather codes, countries and time zones into the app's words. Three Preact pieces draw the card: the sun dial (an SVG over a CSS conic gradient), the counting time difference, and the card itself, placed between the countdowns and the trip cards. The CSP gains Open-Meteo, and nothing about CrewLu Cloud changes.

**Tech Stack:** Vite 5.4, TypeScript 5.9 (strict), Preact 10, Vitest 3 with happy-dom and @testing-library/preact.

**Spec:** `docs/superpowers/specs/2026-10-10-crewluve-web-slice2b1-location-card-design.md`

---

## Execution notes

**Setup and gates**
- **Branch:** work on `slice2b1` in the main project folder. Run `git switch -c slice2b1` from an up-to-date `main`. Don't use git worktrees; auto mode blocked a worktree builder during slice 1.
- **Working directory:** run every command from the project root, `~/Dev/Crewluve Website`. Quote it in shells, since it has a space.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass before every commit that touches code. The suite was 1110 tests in 48 files before this plan. The printed tasks end at 1352 tests in 59 files; after the review fixes, the branch has 1409.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**How the printed code was checked**
- Every code block below was built and run in a scratch copy of the project before this plan was written. All three gates passed there.
- 46 deliberate breaks were tried against the new tests, and they caught 45. The one they miss works the sun out at noon UTC instead of at local solar noon. That moves sunrise by under a minute, inside the spec's 2-minute allowance, so it is left alone.
- A look at the scratch build in the browser showed the card, the dial and the moon at night as designed (Task 16 repeats this with the user).

**Network and other repos**
- **Tests never use the network**; `tests/setup/noNetwork.ts` blocks it. One build script does: `npm run icons` (Task 4) installs one package from npm with `--no-save`. If `package-lock.json` changes afterwards, restore it with `git checkout -- package-lock.json`.
- **The weather request is the site's first call to a service other than CrewLu Cloud.** Only the live site makes it. The demo and the tests never do: the demo uses made-up weather, and the tests pass their own fetch or loader.
- **Read-only site:** nothing in this plan talks to CrewLu Cloud or changes `src/data/readOnlyFetch.ts`. The read-only scan (`tests/data/readOnly.test.ts`) checks the new weather fetch automatically, because it scans every file in `src/`.
- **The Crewluve app (`~/Dev/Crewluv`) is reference only.** Read it; never change it. The same goes for the Flight Globe folder.

**Batches and changes**
- **Batches for helper execution:** A = Tasks 1–8 (time, copy, data, icons), B = Tasks 9–10 (the weather hook, the dial's geometry), C = Tasks 11–13 (the dial, the time difference, the card), D = Tasks 14–15 (the screens, the CSP). E = Tasks 16–17 are for the controller, working with the user.
- **If the code has to differ from a printed block, write it down.** Note it under "Execution notes" at the end of this file, and update the spec's §10 decisions log if a decision changed.

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/time/sun.ts` | create | `sunTimes` (NOAA formulas, the pilot's local date) and `isDaytime` |
| `src/time/zoned.ts` | modify | `zoneOffsetMinutes` |
| `src/copy/format.ts` | modify | `shortTimeText` ("9:14 AM") and `dialTimeText` ("8:12a"); `arrivalWhenText` reuses the first |
| `src/copy/location.ts` | create | The time difference, its words, and the dial's screen-reader label |
| `scripts/build-icons.mjs`, `src/icons/iconPaths.ts` | modify, regenerate | Seven weather and moon icons |
| `src/data/weather.ts` | create | Open-Meteo: the codes, units, request, reply check, fetch and the live loader |
| `src/copy/colors.ts` | modify | Cyan, indigo and yellow as color names |
| `src/copy/weather.ts` | create | Weather codes in the app's words, with an icon and color |
| `src/data/demoWeather.ts` | create | The demo's made-up weather |
| `src/copy/flags.ts` | create | The app's 74 country flags |
| `src/ui/hooks/useWeather.ts` | create | Keeps each airport's weather for 15 minutes, and refreshes it |
| `src/ui/sunDialGeometry.ts` | create | The dial's angles, points, arcs, glow bands, markers, labels and sky |
| `src/ui/SunDial.tsx` | create | The 24-hour sun dial |
| `src/ui/TimeDifferenceLine.tsx` | create | "4h behind you", with the app's counting odometer |
| `src/ui/LocationCard.tsx` | create | The card, and the rule for when it shows |
| `src/styles/location.css` | create | The card's and the dial's styles |
| `src/main.tsx` | modify | Imports location.css after trips.css |
| `src/ui/StatusScreen.tsx` | modify | Places the card between the countdowns and the trip cards |
| `src/ui/ScheduleScreen.tsx` | modify | Asks for the weather where the pilot is, before its early return |
| `vite.config.ts` | modify | Adds Open-Meteo to the CSP's `connect-src` |
| Tests | create and modify | Eleven new test files, plus additions to seven existing ones and to the airport fixture |

---
> **The printed code below is the code as first built.** The review fixes have changed about ten of these files since, and the Execution notes at the end list each change by commit. To rebuild, start from the branch, not from these blocks.

### Task 1: Sun times

**Files:**
- Create: `src/time/sun.ts`
- Test: `tests/time/sun.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/time/sun.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isDaytime, sunTimes } from '../../src/time/sun'
import { MINUTE } from '../../src/time/zoned'

/**
 * Reference times from NOAA's Solar Calculator formulas, worked out separately in Python at local noon, as NOAA's
 * spreadsheet does, and rounded to the second. The site works the sun out at solar noon instead, a few seconds'
 * difference; the spec allows 2 minutes.
 */
const NOAA: Array<[name: string, lat: number, lng: number, timeZone: string, at: string, sunrise: string, sunset: string]> = [
  ['SDF', 38.1746, -85.7382, 'America/Kentucky/Louisville', '2026-10-10T16:00:00Z', '2026-10-10T11:47:11Z', '2026-10-10T23:12:36Z'],
  ['ANC', 61.1744, -149.9983, 'America/Anchorage', '2026-10-10T20:00:00Z', '2026-10-10T16:30:27Z', '2026-10-11T03:03:20Z'],
  ['MIA', 25.7959, -80.2871, 'America/New_York', '2026-10-10T16:00:00Z', '2026-10-10T11:17:36Z', '2026-10-10T22:58:34Z'],
  ['HKG', 22.308, 113.9185, 'Asia/Hong_Kong', '2026-10-10T04:00:00Z', '2026-10-09T22:18:42Z', '2026-10-10T10:04:05Z'],
  // Cologne on both sides of the end of summer time, at 03:00 on 25 October 2026.
  ['CGN', 50.8659, 7.1427, 'Europe/Berlin', '2026-10-24T10:00:00Z', '2026-10-24T06:09:40Z', '2026-10-24T16:21:30Z'],
  ['CGN', 50.8659, 7.1427, 'Europe/Berlin', '2026-10-25T10:00:00Z', '2026-10-25T06:11:26Z', '2026-10-25T16:19:29Z'],
]

const ms = (iso: string) => Date.parse(iso)
const near = (actual: number, iso: string) => expect(Math.abs(actual - ms(iso))).toBeLessThanOrEqual(2 * MINUTE)

describe('sunTimes', () => {
  it.each(NOAA)('%s matches NOAA within 2 minutes on the day of %s', (_name, lat, lng, timeZone, at, sunrise, sunset) => {
    const sun = sunTimes(ms(at), lat, lng, timeZone)!
    near(sun.sunrise, sunrise)
    near(sun.sunset, sunset)
  })

  it('uses the local date, not the UTC one, in a zone far ahead of UTC', () => {
    // 3 am on Sunday 11 October in Tokyo is still Saturday the 10th in UTC.
    const narita = sunTimes(ms('2026-10-10T18:00:00Z'), 35.7653, 140.3854, 'Asia/Tokyo')!
    near(narita.sunrise, '2026-10-10T20:41:24Z')
    near(narita.sunset, '2026-10-11T08:09:09Z')
    // Kiritimati keeps UTC+14 at 157°W: one minute after midnight and one minute before the next both give 10 October.
    for (const at of ['2026-10-09T10:01:00Z', '2026-10-10T09:59:00Z']) {
      const kiritimati = sunTimes(ms(at), 1.9863, -157.35, 'Pacific/Kiritimati')!
      near(kiritimati.sunrise, '2026-10-09T16:14:06Z')
      near(kiritimati.sunset, '2026-10-10T04:18:59Z')
    }
  })

  it('has no sunrise or sunset in polar night or polar day', () => {
    // Utqiaġvik, Alaska (BRW), in midwinter and midsummer.
    expect(sunTimes(ms('2026-12-21T20:00:00Z'), 71.2854, -156.766, 'America/Anchorage')).toBeNull()
    expect(sunTimes(ms('2026-06-21T20:00:00Z'), 71.2854, -156.766, 'America/Anchorage')).toBeNull()
  })
})

describe('isDaytime', () => {
  const sun = { sunrise: ms('2026-10-10T11:47:00Z'), sunset: ms('2026-10-10T23:12:00Z') }

  it('is true from sunrise up to sunset', () => {
    expect(isDaytime(sun.sunrise - 1, sun)).toBe(false)
    expect(isDaytime(sun.sunrise, sun)).toBe(true)
    expect(isDaytime(sun.sunset - 1, sun)).toBe(true)
    expect(isDaytime(sun.sunset, sun)).toBe(false)
  })
})
```

The reference times come from NOAA's Solar Calculator formulas, worked out separately in Python. Kiritimati keeps UTC+14 at 157°W, so it shows that the local date wins even where a zone sits a whole day away from its longitude.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/time/sun.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/time/sun'`.

- [x] **Step 3: Implement**

Create `src/time/sun.ts`:

```ts
import { calendarDay, DAY, MINUTE } from './zoned'

/** When the sun rises and sets on one local day, as instants (ms since the epoch). */
export interface SunTimes {
  sunrise: number
  sunset: number
}

/** The standard sunrise and sunset zenith: the sun's center 0.833° below the horizon, for refraction and the sun's radius. */
const ZENITH = 90.833

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
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/time/sun.test.ts`
Expected: PASS, 9 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/time/sun.ts tests/time/sun.test.ts
git commit -m "Sun times: NOAA formulas on the pilot's local date (slice 2B1 §6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Zone offsets and two clock formats

**Files:**
- Modify: `src/time/zoned.ts` (add `zoneOffsetMinutes` after `calendarDay`)
- Modify: `src/copy/format.ts` (add `shortTimeText` and `dialTimeText` before `timeWithZone`; `arrivalWhenText` reuses `shortTimeText`)
- Test: `tests/time/zoned.test.ts`, `tests/copy/format.test.ts`

- [x] **Step 1: Write the failing tests**

In `tests/time/zoned.test.ts`, add `zoneOffsetMinutes` to the import from `'../../src/time/zoned'`, so the line reads:

```ts
import { calendarDay, isKnownZone, prefers24Hour, viewerTimeZone, zoneAbbr, zonedParts, zoneOffsetMinutes } from '../../src/time/zoned'
```

Then add this block just before `describe('zoneAbbr', …)`:

```ts
describe('zoneOffsetMinutes', () => {
  it('gives the offset from UTC in minutes, half and quarter hours included', () => {
    expect(zoneOffsetMinutes(T, 'America/New_York')).toBe(-240)
    expect(zoneOffsetMinutes(Date.UTC(2026, 0, 9), 'America/New_York')).toBe(-300)
    expect(zoneOffsetMinutes(T, 'Asia/Kolkata')).toBe(330)
    expect(zoneOffsetMinutes(T, 'Asia/Kathmandu')).toBe(345)
    expect(zoneOffsetMinutes(T, 'UTC')).toBe(0)
  })

  it('ignores the seconds of the instant', () => {
    expect(zoneOffsetMinutes(T + 59_999, 'Asia/Kolkata')).toBe(330)
  })
})
```

In `tests/copy/format.test.ts`, add `dialTimeText` (after `departureText`) and `shortTimeText` (after `ordinalSuffix`) to the import list from `'../../src/copy/format'`. Then, inside `describe('clock times', …)`, add these two tests just before `it('adds the zone for {T}', …)`:

```ts
  it('prints the location card clock like iOS, with a narrow space before AM or PM', () => {
    expect(shortTimeText(afternoon, NY, false)).toBe('1:10\u202FPM')
    expect(shortTimeText(afternoon, NY, true)).toBe('13:10')
    expect(shortTimeText(Date.UTC(2026, 9, 9, 4, 5), NY, false)).toBe('12:05\u202FAM')
    expect(shortTimeText(Date.UTC(2026, 9, 9, 4, 5), NY, true)).toBe('00:05')
    expect(shortTimeText(Date.UTC(2026, 9, 9, 16, 0), NY, false)).toBe('12:00\u202FPM')
    expect(shortTimeText(afternoon, 'America/Anchorage', false)).toBe('9:10\u202FAM')
  })

  it('prints sun dial labels as the app does, with a and p, or 24-hour', () => {
    expect(dialTimeText(Date.UTC(2026, 9, 10, 12, 12), NY, false)).toBe('8:12a')
    expect(dialTimeText(Date.UTC(2026, 9, 10, 22, 41), NY, false)).toBe('6:41p')
    expect(dialTimeText(Date.UTC(2026, 9, 10, 12, 12), NY, true)).toBe('08:12')
    expect(dialTimeText(Date.UTC(2026, 9, 10, 22, 41), NY, true)).toBe('18:41')
    expect(dialTimeText(Date.UTC(2026, 9, 9, 4, 5), NY, false)).toBe('12:05a')
    expect(dialTimeText(Date.UTC(2026, 9, 9, 16, 0), NY, false)).toBe('12:00p')
  })
```

- [x] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/time/zoned.test.ts tests/copy/format.test.ts`
Expected: FAIL with `TypeError: zoneOffsetMinutes is not a function` and `TypeError: shortTimeText is not a function`.

- [x] **Step 3: Implement**

In `src/time/zoned.ts`, add this function right after `calendarDay`:

```ts
/** The zone's offset from UTC at `ms`, in minutes: -240 for New York in summer, 330 for Kolkata. */
export function zoneOffsetMinutes(ms: number, timeZone: string): number {
  const p = zonedParts(ms, timeZone)
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(ms / MINUTE) * MINUTE) / MINUTE
}
```

In `src/copy/format.ts`, add these two functions right before the `/** {T}: "1:00pm EST" …` comment above `timeWithZone`:

```ts
/** The location card's clock: "9:14 AM", with iOS's narrow no-break space before AM, or "09:14" (DateFormatter's short time). */
export function shortTimeText(ms: number, timeZone: string, h24: boolean): string {
  const { hour, minute } = zonedParts(ms, timeZone)
  if (h24) return `${pad2(hour)}:${pad2(minute)}`
  return `${hour % 12 === 0 ? 12 : hour % 12}:${pad2(minute)}\u202F${hour < 12 ? 'AM' : 'PM'}`
}

/** A sun dial label: "8:12a" or "6:41p" (SunCircleView.formatTime, "h:mma" with a and p), or "08:12" in 24-hour. */
export function dialTimeText(ms: number, timeZone: string, h24: boolean): string {
  const { hour, minute } = zonedParts(ms, timeZone)
  if (h24) return `${pad2(hour)}:${pad2(minute)}`
  return `${hour % 12 === 0 ? 12 : hour % 12}:${pad2(minute)}${hour < 12 ? 'a' : 'p'}`
}
```

Then replace the body of `arrivalWhenText`, keeping its doc comment, so it reuses `shortTimeText`:

```ts
export function arrivalWhenText(ms: number, timeZone: string, h24: boolean): string {
  const p = zonedParts(ms, timeZone)
  return `${WEEKDAYS[p.weekday].slice(0, 3)}, ${MONTHS[p.month - 1].slice(0, 3)} ${p.day} at ${shortTimeText(ms, timeZone, h24)}`
}
```

- [x] **Step 4: Run them and watch them pass**

Run: `npx vitest run tests/time/zoned.test.ts tests/copy/format.test.ts`
Expected: PASS. The existing `arrivalWhenText` tests still pass, which shows the refactor kept its output.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/time/zoned.ts src/copy/format.ts tests/time/zoned.test.ts tests/copy/format.test.ts
git commit -m "Zone offsets, the location card clock and the dial's labels (slice 2B1 §4, §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Copy: the time difference and the dial's label

**Files:**
- Create: `src/copy/location.ts`
- Test: `tests/copy/location.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/copy/location.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { spokenTimeDifference, sunDialLabel, timeDifference, timeDifferenceText } from '../../src/copy/location'

const NY = 'America/New_York'
const OCT = Date.UTC(2026, 9, 10, 16) // Saturday 10 October, noon in New York

describe('timeDifference', () => {
  it('compares the pilot’s zone with home’s at that moment', () => {
    expect(timeDifference(OCT, 'America/Anchorage', NY)).toEqual({ hours: 4, minutes: 0, direction: 'behind' })
    expect(timeDifference(OCT, 'Asia/Kolkata', NY)).toEqual({ hours: 9, minutes: 30, direction: 'ahead' })
    expect(timeDifference(OCT, 'America/St_Johns', 'America/Halifax')).toEqual({ hours: 0, minutes: 30, direction: 'ahead' })
  })

  it('calls different zones with the same clock time the same time', () => {
    expect(timeDifference(OCT, 'America/Detroit', NY)).toEqual({ hours: 0, minutes: 0, direction: 'same' })
  })

  it('follows the clocks as they change', () => {
    // Europe leaves summer time on 25 October and the US on 1 November, so Cologne is 6 hours ahead of New York, then 5.
    expect(timeDifference(OCT, 'Europe/Berlin', NY)).toMatchObject({ hours: 6, direction: 'ahead' })
    expect(timeDifference(Date.UTC(2026, 9, 28, 16), 'Europe/Berlin', NY)).toMatchObject({ hours: 5, direction: 'ahead' })
  })
})

describe('timeDifferenceText', () => {
  it('reads like the app', () => {
    expect(timeDifferenceText({ hours: 4, minutes: 0, direction: 'behind' })).toBe('4h behind you')
    expect(timeDifferenceText({ hours: 1, minutes: 30, direction: 'ahead' })).toBe('1h 30m ahead of you')
    expect(timeDifferenceText({ hours: 0, minutes: 30, direction: 'ahead' })).toBe('30m ahead of you')
    expect(timeDifferenceText({ hours: 0, minutes: 0, direction: 'same' })).toBe('same time as you')
  })
})

describe('spokenTimeDifference', () => {
  it('says the hours and minutes in words for screen readers', () => {
    expect(spokenTimeDifference({ hours: 4, minutes: 0, direction: 'behind' })).toBe('4 hours behind you')
    expect(spokenTimeDifference({ hours: 1, minutes: 30, direction: 'ahead' })).toBe('1 hour 30 minutes ahead of you')
    expect(spokenTimeDifference({ hours: 0, minutes: 30, direction: 'ahead' })).toBe('30 minutes ahead of you')
    expect(spokenTimeDifference({ hours: 0, minutes: 0, direction: 'same' })).toBe('same time as you')
  })
})

describe('sunDialLabel', () => {
  const sun = { sunrise: Date.UTC(2026, 9, 10, 16, 12), sunset: Date.UTC(2026, 9, 11, 2, 41) } // 8:12 AM and 6:41 PM in Anchorage
  const ANC = 'America/Anchorage'

  it('reads the sunrise, the sunset and whether it’s day or night there', () => {
    expect(sunDialLabel(sun, Date.UTC(2026, 9, 10, 17), ANC, false, 'Anchorage')).toBe('Sunrise 8:12\u202FAM, sunset 6:41\u202FPM, daytime in Anchorage')
    expect(sunDialLabel(sun, Date.UTC(2026, 9, 10, 15), ANC, false, 'Anchorage')).toBe('Sunrise 8:12\u202FAM, sunset 6:41\u202FPM, nighttime in Anchorage')
  })

  it('uses 24-hour times when the visitor does', () => {
    expect(sunDialLabel(sun, Date.UTC(2026, 9, 10, 17), ANC, true, 'Anchorage')).toBe('Sunrise 08:12, sunset 18:41, daytime in Anchorage')
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/copy/location.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/copy/location'`.

- [x] **Step 3: Implement**

Create `src/copy/location.ts`:

```ts
import { isDaytime, type SunTimes } from '../time/sun'
import { zoneOffsetMinutes } from '../time/zoned'
import { delayText, shortTimeText } from './format'

/** How far the pilot's clocks are from home's (TimeDifference in PilotStatusView.swift). */
export interface TimeDifference {
  hours: number
  minutes: number
  /** 'ahead' when the pilot's clocks show a later time than home's. */
  direction: 'ahead' | 'behind' | 'same'
}

/** The pilot's zone offset minus home's at `t` (slice 2B1 §6). "You", in the app's words, is the family at home. */
export function timeDifference(t: number, pilotTz: string, homeTz: string): TimeDifference {
  const diff = zoneOffsetMinutes(t, pilotTz) - zoneOffsetMinutes(t, homeTz)
  const abs = Math.abs(diff)
  return { hours: Math.floor(abs / 60), minutes: abs % 60, direction: diff > 0 ? 'ahead' : diff < 0 ? 'behind' : 'same' }
}

/** "ahead of you" or "behind you". */
export function directionText(direction: 'ahead' | 'behind'): string {
  return direction === 'ahead' ? 'ahead of you' : 'behind you'
}

/** "4h behind you", "1h 30m ahead of you", "30m ahead of you", or "same time as you". */
export function timeDifferenceText(d: TimeDifference): string {
  if (d.direction === 'same') return 'same time as you'
  const amount = [d.hours > 0 ? `${d.hours}h` : '', d.minutes > 0 ? `${d.minutes}m` : ''].filter(Boolean).join(' ')
  return `${amount} ${directionText(d.direction)}`
}

/** The same in words, for screen readers: "4 hours behind you", "1 hour 30 minutes ahead of you". */
export function spokenTimeDifference(d: TimeDifference): string {
  if (d.direction === 'same') return 'same time as you'
  return `${delayText(d.hours * 60 + d.minutes)} ${directionText(d.direction)}`
}

/** What screen readers hear for the sun dial: "Sunrise 8:12 AM, sunset 6:41 PM, daytime in Anchorage". */
export function sunDialLabel(sun: SunTimes, now: number, timeZone: string, h24: boolean, city: string): string {
  const time = (ms: number) => shortTimeText(ms, timeZone, h24)
  return `Sunrise ${time(sun.sunrise)}, sunset ${time(sun.sunset)}, ${isDaytime(now, sun) ? 'daytime' : 'nighttime'} in ${city}`
}
```

A difference under an hour reads "30m ahead of you", as in the spec. The app's odometer would show "0h 30m"; spec §8 item 8 records this.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/copy/location.test.ts`
Expected: PASS, 7 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/copy/location.ts tests/copy/location.test.ts
git commit -m "Copy: the time difference and the sun dial label (slice 2B1 §4, §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Weather and moon icons

**Files:**
- Modify: `scripts/build-icons.mjs` (the comment above `ICONS`, and a third block in `ICONS`)
- Regenerate: `src/icons/iconPaths.ts`
- Test: `tests/icons/iconPaths.test.ts`

- [x] **Step 1: Write the failing test**

Add this test at the end of `describe('ICON_PATHS', …)` in `tests/icons/iconPaths.test.ts`:

```ts
  it('has the location card’s weather and sun dial icons', () => {
    for (const name of ['Sun', 'Moon', 'CloudSun', 'CloudMoon', 'CloudFog', 'CloudRain', 'CloudSnow', 'CloudLightning']) {
      expect(ICON_PATHS).toHaveProperty(name)
    }
  })
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/icons/iconPaths.test.ts`
Expected: FAIL in "has the location card’s weather and sun dial icons", which can't find `Moon`.

- [x] **Step 3: Implement**

In `scripts/build-icons.mjs`, replace the two-line comment above `const ICONS = {` with:

```js
// Component name -> Phosphor file stem. The first block maps the SF Symbols Crewluve uses on these
// cards (spec §4.1, and the slice 2A trip cards); the second maps AirlineBranding's airline symbols (spec §6.10);
// the third adds the weather and sun dial symbols of the slice 2B1 location card.
```

Then add a third block at the end of `ICONS`, after `NavigationArrow: 'navigation-arrow',`, with a blank line before it:

```js

  Moon: 'moon', CloudSun: 'cloud-sun', CloudMoon: 'cloud-moon', CloudFog: 'cloud-fog', CloudRain: 'cloud-rain',
  CloudSnow: 'cloud-snow', CloudLightning: 'cloud-lightning',
}
```

Regenerate the icon file:

```bash
npm run icons
git status --short
```

Expected: `wrote 50 icons to …/src/icons/iconPaths.ts`. Only `scripts/build-icons.mjs` and `src/icons/iconPaths.ts` show as changed. If `package-lock.json` changed too, run `git checkout -- package-lock.json`. `git diff src/icons/iconPaths.ts` shows seven added lines, `Moon` through `CloudLightning`, and no other change.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/icons/iconPaths.test.ts`
Expected: PASS, 4 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add scripts/build-icons.mjs src/icons/iconPaths.ts tests/icons/iconPaths.test.ts
git commit -m "Icons: moon and weather icons for the location card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Weather data from Open-Meteo

**Files:**
- Create: `src/data/weather.ts`
- Test: `tests/data/weather.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/data/weather.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWeather, loadLiveWeather, parseWeather, tempUnitFor, weatherUrl } from '../../src/data/weather'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A stand-in for fetch that records each request and answers with `reply`. */
function fakeFetch(reply: { ok?: boolean; body?: unknown; fails?: boolean; badJson?: boolean }) {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = []
  const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init })
    if (reply.fails) throw new TypeError('Failed to fetch')
    return {
      ok: reply.ok ?? true,
      json: async () => {
        if (reply.badJson) throw new SyntaxError('Unexpected token')
        return reply.body
      },
    } as Response
  }) as typeof globalThis.fetch
  return { fetch, calls }
}

const reply = (current: Record<string, unknown>) => ({ latitude: 61.18, longitude: -150, current: { time: '2026-10-10T20:15', interval: 900, ...current } })

describe('weatherUrl', () => {
  it('asks Open-Meteo for the current temperature, condition and daylight at the rounded coordinates, in the unit', () => {
    expect(weatherUrl(38.1746, -85.7382, 'fahrenheit')).toBe(
      'https://api.open-meteo.com/v1/forecast?latitude=38.17&longitude=-85.74&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit',
    )
    expect(weatherUrl(-33.9461, 151.1772, 'celsius')).toBe(
      'https://api.open-meteo.com/v1/forecast?latitude=-33.95&longitude=151.18&current=temperature_2m,weather_code,is_day&temperature_unit=celsius',
    )
  })
})

describe('parseWeather', () => {
  it('reads the temperature, the code and whether it is day', () => {
    expect(parseWeather(reply({ temperature_2m: 41.2, weather_code: 3, is_day: 1 }))).toEqual({ temperature: 41.2, code: 3, isDay: true })
    expect(parseWeather(reply({ temperature_2m: -4, weather_code: 0, is_day: 0 }))).toEqual({ temperature: -4, code: 0, isDay: false })
  })

  it.each([
    ['no current block', { latitude: 1 }],
    ['nothing at all', null],
    ['a missing temperature', reply({ weather_code: 3, is_day: 1 })],
    ['a temperature as text', reply({ temperature_2m: '41', weather_code: 3, is_day: 1 })],
    ['a temperature that is not a number', reply({ temperature_2m: Number.NaN, weather_code: 3, is_day: 1 })],
    ['an endless temperature', reply({ temperature_2m: Number.POSITIVE_INFINITY, weather_code: 3, is_day: 1 })],
    ['an unknown code', reply({ temperature_2m: 41, weather_code: 4, is_day: 1 })],
    ['a code as text', reply({ temperature_2m: 41, weather_code: '3', is_day: 1 })],
    ['a missing is_day', reply({ temperature_2m: 41, weather_code: 3 })],
    ['an is_day other than 0 or 1', reply({ temperature_2m: 41, weather_code: 3, is_day: 2 })],
  ])('gives null for %s', (_name, body) => {
    expect(parseWeather(body)).toBeNull()
  })
})

describe('fetchWeather', () => {
  it('sends a plain GET with no cookies and no referrer, and returns the weather', async () => {
    const { fetch, calls } = fakeFetch({ body: reply({ temperature_2m: 41.2, weather_code: 3, is_day: 1 }) })
    expect(await fetchWeather(61.1744, -149.9983, 'fahrenheit', fetch)).toEqual({ temperature: 41.2, code: 3, isDay: true })
    expect(calls).toEqual([{ url: weatherUrl(61.1744, -149.9983, 'fahrenheit'), init: { credentials: 'omit', referrerPolicy: 'no-referrer' } }])
  })

  it.each([
    ['an error status', { ok: false, body: reply({ temperature_2m: 41, weather_code: 3, is_day: 1 }) }],
    ['a network failure', { fails: true }],
    ['a reply that is not JSON', { badJson: true }],
    ['a reply it cannot read', { body: { error: true, reason: 'Parameter missing' } }],
  ])('gives null for %s', async (_name, answer) => {
    expect(await fetchWeather(61.17, -150, 'celsius', fakeFetch(answer).fetch)).toBeNull()
  })
})

describe('loadLiveWeather', () => {
  it('fetches at the airport’s coordinates, in the visitor’s unit', async () => {
    const { fetch, calls } = fakeFetch({ body: reply({ temperature_2m: 5.1, weather_code: 3, is_day: 1 }) })
    vi.stubGlobal('fetch', fetch)
    const weather = await loadLiveWeather({ code: 'ANC', lat: 61.1744, lng: -149.9983, tz: 'America/Anchorage', unit: 'celsius' })
    expect(weather).toEqual({ temperature: 5.1, code: 3, isDay: true })
    expect(calls.map((c) => c.url)).toEqual([weatherUrl(61.1744, -149.9983, 'celsius')])
  })
})

describe('tempUnitFor', () => {
  it.each([
    ['en-US', 'fahrenheit'],
    ['en', 'fahrenheit'],
    ['es-US', 'fahrenheit'],
    ['en-BS', 'fahrenheit'],
    ['en-LR', 'fahrenheit'],
    ['my', 'fahrenheit'],
    ['en-GB', 'celsius'],
    ['en-CA', 'celsius'],
    ['de', 'celsius'],
    ['ja-JP', 'celsius'],
  ])('%s uses %s', (locale, unit) => {
    expect(tempUnitFor(locale)).toBe(unit)
  })

  it('falls back to Celsius for a language setting it cannot read', () => {
    expect(tempUnitFor('')).toBe('celsius')
    expect(tempUnitFor('not a locale!')).toBe('celsius')
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/data/weather.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/data/weather'`.

- [x] **Step 3: Implement**

Create `src/data/weather.ts`:

```ts
/** Open-Meteo's forecast service (slice 2B1 §6): free, keyless and worldwide. vite.config.ts adds it to the CSP's connect-src. */
export const OPEN_METEO_URL = 'https://api.open-meteo.com'

export type TempUnit = 'fahrenheit' | 'celsius'

/** The WMO weather codes Open-Meteo reports. src/copy/weather.ts has words and an icon for each; any other code counts as no weather. */
export const WEATHER_CODES = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99] as const

export type WeatherCode = (typeof WEATHER_CODES)[number]

/** The current weather at an airport. */
export interface Weather {
  /** Degrees, in the unit that was asked for. */
  temperature: number
  code: WeatherCode
  /** Open-Meteo's is_day: at night the clear-sky icons become moons. */
  isDay: boolean
}

/** The airport to get the weather for, and the unit to show it in. */
export interface WeatherPlace {
  code: string
  lat: number
  lng: number
  /** The airport's time zone, or null when this browser doesn't know it. The demo uses it to tell day from night. */
  tz: string | null
  unit: TempUnit
}

/** Where weather comes from: Open-Meteo when live, made-up samples in the demo. Resolves to null when there's none. */
export type WeatherLoader = (place: WeatherPlace) => Promise<Weather | null>

/** Regions that use Fahrenheit (slice 2B1 §6). Everywhere else gets Celsius. */
const FAHRENHEIT_REGIONS = new Set(['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW', 'FM', 'MH'])

/** The visitor's unit, from the region of their language setting. A bare language fills in its usual region: "en" means the US. */
export function tempUnitFor(locale: string = navigator.language): TempUnit {
  try {
    const region = new Intl.Locale(locale).maximize().region
    return region !== undefined && FAHRENHEIT_REGIONS.has(region) ? 'fahrenheit' : 'celsius'
  } catch {
    return 'celsius'
  }
}

/** The request for one airport: its coordinates rounded to 2 decimals, the three current values the card shows, and the unit. */
export function weatherUrl(lat: number, lng: number, unit: TempUnit): string {
  return `${OPEN_METEO_URL}/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}&current=temperature_2m,weather_code,is_day&temperature_unit=${unit}`
}

const field = (value: unknown, key: string): unknown =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[key] : undefined

const isWeatherCode = (value: unknown): value is WeatherCode => (WEATHER_CODES as readonly unknown[]).includes(value)

/** Open-Meteo's reply, checked: a finite temperature, a code the site has words for, and is_day 0 or 1. Anything else is null. */
export function parseWeather(body: unknown): Weather | null {
  const current = field(body, 'current')
  const temperature = field(current, 'temperature_2m')
  const code = field(current, 'weather_code')
  const isDay = field(current, 'is_day')
  if (typeof temperature !== 'number' || !Number.isFinite(temperature)) return null
  if (!isWeatherCode(code) || (isDay !== 0 && isDay !== 1)) return null
  return { temperature, code, isDay: isDay === 1 }
}

/**
 * The current weather from Open-Meteo, or null when it can't be had. A plain GET that sends no cookies and no referrer
 * (slice 2B1 §7). Tests pass their own `fetch`; the parameter keeps that name so the read-only scan still checks this call.
 */
export async function fetchWeather(lat: number, lng: number, unit: TempUnit, fetch: typeof globalThis.fetch = globalThis.fetch): Promise<Weather | null> {
  try {
    const res = await fetch(weatherUrl(lat, lng, unit), { credentials: 'omit', referrerPolicy: 'no-referrer' })
    return res.ok ? parseWeather(await res.json()) : null
  } catch {
    return null
  }
}

/** The live loader: Open-Meteo, at the airport's coordinates. */
export const loadLiveWeather: WeatherLoader = (place) => fetchWeather(place.lat, place.lng, place.unit)
```

`fetchWeather`'s fetch parameter is named `fetch` on purpose. The read-only scan recognizes calls by that name, so it still checks this request: a plain GET with no body.

- [x] **Step 4: Run it and the read-only scan, and watch them pass**

Run: `npx vitest run tests/data/weather.test.ts tests/data/readOnly.test.ts`
Expected: PASS. The scan now lists `src/data/weather.ts` among the files it checked.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/data/weather.ts tests/data/weather.test.ts
git commit -m "Weather data: Open-Meteo request, reply check and units (slice 2B1 §6, §7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Copy: weather in the app's words

**Files:**
- Modify: `src/copy/colors.ts`
- Create: `src/copy/weather.ts`
- Test: `tests/copy/weather.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/copy/weather.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { temperatureText, weatherVisual } from '../../src/copy/weather'
import { WEATHER_CODES, type WeatherCode } from '../../src/data/weather'
import { ICON_PATHS } from '../../src/icons/iconPaths'
import { cssColor } from '../../src/ui/colors'

describe('weatherVisual', () => {
  it('has words and a drawable icon for every code Open-Meteo reports, by day and by night', () => {
    expect(WEATHER_CODES).toHaveLength(28)
    for (const code of WEATHER_CODES) {
      for (const isDay of [true, false]) {
        const visual = weatherVisual(code, isDay)
        expect(visual.words).not.toBe('')
        expect(ICON_PATHS).toHaveProperty(visual.icon)
      }
    }
  })

  // Spec §6's table, row by row: the codes, the words, and the daytime icon and color.
  it.each<[WeatherCode[], string, string, string]>([
    [[0], 'Clear', 'Sun', 'orange'],
    [[1], 'Mostly Clear', 'Sun', 'orange'],
    [[2], 'Partly Cloudy', 'CloudSun', 'orange'],
    [[3], 'Cloudy', 'Cloud', 'gray'],
    [[45, 48], 'Foggy', 'CloudFog', 'gray'],
    [[51, 53, 55], 'Drizzle', 'CloudRain', 'blue'],
    [[56, 57], 'Freezing Drizzle', 'CloudRain', 'blue'],
    [[61, 63, 80, 81], 'Rain', 'CloudRain', 'blue'],
    [[65, 82], 'Heavy Rain', 'CloudRain', 'blue'],
    [[66, 67], 'Freezing Rain', 'CloudRain', 'blue'],
    [[71], 'Flurries', 'CloudSnow', 'cyan'],
    [[73, 77, 85], 'Snow', 'CloudSnow', 'cyan'],
    [[75, 86], 'Heavy Snow', 'CloudSnow', 'cyan'],
    [[95, 96, 99], 'Thunderstorms', 'CloudLightning', 'yellow'],
  ])('codes %j read "%s" with %s in %s', (codes, words, icon, color) => {
    for (const code of codes) expect(weatherVisual(code, true)).toEqual({ words, icon, color })
  })

  it('puts the moon in clear and partly cloudy night skies, and changes nothing else at night', () => {
    expect(weatherVisual(0, false)).toEqual({ words: 'Clear', icon: 'Moon', color: 'indigo' })
    expect(weatherVisual(1, false)).toEqual({ words: 'Mostly Clear', icon: 'Moon', color: 'indigo' })
    expect(weatherVisual(2, false)).toEqual({ words: 'Partly Cloudy', icon: 'CloudMoon', color: 'indigo' })
    for (const code of WEATHER_CODES.filter((c) => c > 2)) expect(weatherVisual(code, false)).toEqual(weatherVisual(code, true))
  })

  it('names colors the theme has', () => {
    expect(cssColor('cyan')).toBe('var(--cyan)')
    expect(cssColor('indigo')).toBe('var(--indigo)')
    expect(cssColor('yellow')).toBe('var(--yellow)')
  })
})

describe('temperatureText', () => {
  it('rounds to whole degrees and adds the degree sign, like the app', () => {
    expect(temperatureText(41.2)).toBe('41°')
    expect(temperatureText(40.5)).toBe('41°')
    expect(temperatureText(14.44)).toBe('14°')
    expect(temperatureText(-3.6)).toBe('-4°')
  })

  it('never shows minus zero', () => {
    expect(temperatureText(-0.4)).toBe('0°')
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/copy/weather.test.ts`, then `npx tsc --noEmit`.
Expected: Vitest fails with `Error: Cannot find module '../../src/copy/weather'`. tsc also reports `Argument of type '"cyan"' is not assignable to parameter of type 'ColorToken'`.

- [x] **Step 3: Implement**

Replace `src/copy/colors.ts` with:

```ts
/** Semantic color names (resolved to CSS variables by src/ui/colors.ts) or a literal airline brand hex. */
export type ColorToken =
  | 'green' | 'blue' | 'red' | 'orange' | 'purple' | 'gray' | 'cyan' | 'indigo' | 'yellow' | 'secondary' | 'ups' | `#${string}`
```

`src/ui/colors.ts` needs no change; it already turns any name into `var(--name)`, and tokens.css already defines all three colors (slice 2A).

Create `src/copy/weather.ts`:

```ts
import type { WeatherCode } from '../data/weather'
import type { IconName } from '../icons/iconPaths'
import type { ColorToken } from './colors'

/** How the card shows the weather: the app's words for it, and an icon in its color. */
export interface WeatherVisual {
  words: string
  icon: IconName
  color: ColorToken
}

type Sky = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm'

/** Open-Meteo's WMO codes in the app's words, which are Apple's condition names (slice 2B1 §6). */
const CONDITIONS: Record<WeatherCode, [words: string, sky: Sky]> = {
  0: ['Clear', 'clear'],
  1: ['Mostly Clear', 'clear'],
  2: ['Partly Cloudy', 'partly'],
  3: ['Cloudy', 'cloudy'],
  45: ['Foggy', 'fog'],
  48: ['Foggy', 'fog'],
  51: ['Drizzle', 'rain'],
  53: ['Drizzle', 'rain'],
  55: ['Drizzle', 'rain'],
  56: ['Freezing Drizzle', 'rain'],
  57: ['Freezing Drizzle', 'rain'],
  61: ['Rain', 'rain'],
  63: ['Rain', 'rain'],
  65: ['Heavy Rain', 'rain'],
  66: ['Freezing Rain', 'rain'],
  67: ['Freezing Rain', 'rain'],
  71: ['Flurries', 'snow'],
  73: ['Snow', 'snow'],
  75: ['Heavy Snow', 'snow'],
  77: ['Snow', 'snow'],
  80: ['Rain', 'rain'],
  81: ['Rain', 'rain'],
  82: ['Heavy Rain', 'rain'],
  85: ['Snow', 'snow'],
  86: ['Heavy Snow', 'snow'],
  95: ['Thunderstorms', 'storm'],
  96: ['Thunderstorms', 'storm'],
  99: ['Thunderstorms', 'storm'],
}

/** The sky's icon and color: sun orange, moon indigo, clouds and fog gray, rain blue, snow cyan, lightning yellow. */
function skyIcon(sky: Sky, isDay: boolean): [IconName, ColorToken] {
  switch (sky) {
    case 'clear':
      return isDay ? ['Sun', 'orange'] : ['Moon', 'indigo']
    case 'partly':
      return isDay ? ['CloudSun', 'orange'] : ['CloudMoon', 'indigo']
    case 'cloudy':
      return ['Cloud', 'gray']
    case 'fog':
      return ['CloudFog', 'gray']
    case 'rain':
      return ['CloudRain', 'blue']
    case 'snow':
      return ['CloudSnow', 'cyan']
    case 'storm':
      return ['CloudLightning', 'yellow']
  }
}

/** The words, icon and color for a weather code. At night the clear and partly cloudy skies get moons. */
export function weatherVisual(code: WeatherCode, isDay: boolean): WeatherVisual {
  const [words, sky] = CONDITIONS[code]
  const [icon, color] = skyIcon(sky, isDay)
  return { words, icon, color }
}

/** "41°": rounded, with no unit letter, as the app's narrow weather format shows it. */
export function temperatureText(degrees: number): string {
  return `${Math.round(degrees)}°`
}
```

Partly cloudy takes the sun's or the moon's color, orange by day and indigo at night (spec §6).

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/copy/weather.test.ts` and `npx tsc --noEmit`
Expected: PASS, 19 tests; tsc clean.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/copy/colors.ts src/copy/weather.ts tests/copy/weather.test.ts
git commit -m "Copy: weather codes in the app's words, with icons and colors (slice 2B1 §6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The demo's made-up weather

**Files:**
- Create: `src/data/demoWeather.ts`
- Test: `tests/data/demoWeather.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/data/demoWeather.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadDemoWeather } from '../../src/data/demoWeather'
import type { WeatherPlace } from '../../src/data/weather'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const place = (code: string, unit: WeatherPlace['unit'] = 'fahrenheit'): WeatherPlace => {
  const at: Record<string, [number, number, string]> = {
    LEX: [38.0365, -84.6059, 'America/New_York'],
    SDF: [38.1746, -85.7382, 'America/Kentucky/Louisville'],
    MIA: [25.7959, -80.2871, 'America/New_York'],
    RFD: [42.1954, -89.0972, 'America/Chicago'],
    ANC: [61.1744, -149.9983, 'America/Anchorage'],
    MCO: [28.4312, -81.3081, 'America/New_York'],
    ONT: [34.056, -117.6012, 'America/Los_Angeles'],
    CGN: [50.8659, 7.1427, 'Europe/Berlin'],
  }
  const [lat, lng, tz] = at[code]
  return { code, lat, lng, tz, unit }
}

describe('loadDemoWeather', () => {
  // Saturday 10 October 2026, 1 pm in Louisville and Lexington, 9 am in Anchorage.
  const AFTERNOON = Date.UTC(2026, 9, 10, 17)

  it.each([
    ['LEX', 58, 0],
    ['SDF', 66, 0],
    ['MIA', 84, 2],
    ['RFD', 61, 3],
    ['ANC', 41, 3],
    ['MCO', 79, 2],
    ['ONT', 75, 0],
  ])('has made-up weather for %s: %i°F, code %i', async (code, fahrenheit, weatherCode) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(AFTERNOON)
    expect(await loadDemoWeather(place(code))).toEqual({ temperature: fahrenheit, code: weatherCode, isDay: true })
  })

  it('converts to Celsius for visitors who use it', async () => {
    expect((await loadDemoWeather(place('ANC', 'celsius')))?.temperature).toBe(5)
    expect((await loadDemoWeather(place('LEX', 'celsius')))?.temperature).toBeCloseTo(14.44, 2)
  })

  it('tells night from day by the sun at the airport right now', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.UTC(2026, 9, 11, 2, 5)) // 10:05 pm in Lexington
    expect((await loadDemoWeather(place('LEX')))?.isDay).toBe(false)
  })

  it('has nothing for an airport outside the demo', async () => {
    expect(await loadDemoWeather(place('CGN'))).toBeNull()
  })

  it('never touches the network', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await loadDemoWeather(place('ANC'))
    expect(fetch).not.toHaveBeenCalled()
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/data/demoWeather.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/data/demoWeather'`.

- [x] **Step 3: Implement**

Create `src/data/demoWeather.ts`:

```ts
import { isDaytime, sunTimes } from '../time/sun'
import type { WeatherCode, WeatherLoader } from './weather'

/** Made-up weather for every airport in the demo (slice 2B1 §6), in °F. The demo never calls Open-Meteo. */
const SAMPLES = new Map<string, { fahrenheit: number; code: WeatherCode }>([
  ['LEX', { fahrenheit: 58, code: 0 }],
  ['SDF', { fahrenheit: 66, code: 0 }],
  ['MIA', { fahrenheit: 84, code: 2 }],
  ['RFD', { fahrenheit: 61, code: 3 }],
  ['ANC', { fahrenheit: 41, code: 3 }],
  ['MCO', { fahrenheit: 79, code: 2 }],
  ['ONT', { fahrenheit: 75, code: 0 }],
])

/** The demo's loader: the airport's sample in the visitor's unit, with day or night from the sun right now. */
export const loadDemoWeather: WeatherLoader = async (place) => {
  const sample = SAMPLES.get(place.code)
  if (!sample) return null
  const now = Date.now()
  const sun = place.tz ? sunTimes(now, place.lat, place.lng, place.tz) : null
  return {
    temperature: place.unit === 'fahrenheit' ? sample.fahrenheit : ((sample.fahrenheit - 32) * 5) / 9,
    code: sample.code,
    isDay: sun ? isDaytime(now, sun) : true,
  }
}
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/data/demoWeather.test.ts`
Expected: PASS, 11 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/data/demoWeather.ts tests/data/demoWeather.test.ts
git commit -m "Demo: made-up weather for the demo airports, no network (slice 2B1 §6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Copy: the app's country flags

**Files:**
- Create: `src/copy/flags.ts`
- Test: `tests/copy/flags.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/copy/flags.test.ts`. Its table is the app's own list, copied as code points from `countryFlags` in `~/Dev/Crewluv/Crewluv/Utils/AirportDataProvider.swift`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { countryFlag, FLAG_COUNTRIES } from '../../src/copy/flags'
import type { AirportTuple } from '../../src/data/airports'

/** The app's own flags (countryFlags in AirportDataProvider.swift), as the code points it writes them with. */
const APP_FLAGS: Array<[country: string, codePoints: string]> = [
  ['Canada', '1F1E8 1F1E6'], ['Mexico', '1F1F2 1F1FD'], ['Germany', '1F1E9 1F1EA'], ['China', '1F1E8 1F1F3'],
  ['UK', '1F1EC 1F1E7'], ['Puerto Rico', '1F1F5 1F1F7'], ['South Korea', '1F1F0 1F1F7'], ['Japan', '1F1EF 1F1F5'],
  ['Taiwan', '1F1F9 1F1FC'], ['Singapore', '1F1F8 1F1EC'], ['Thailand', '1F1F9 1F1ED'], ['India', '1F1EE 1F1F3'],
  ['UAE', '1F1E6 1F1EA'], ['France', '1F1EB 1F1F7'], ['Netherlands', '1F1F3 1F1F1'], ['Belgium', '1F1E7 1F1EA'],
  ['Spain', '1F1EA 1F1F8'], ['Italy', '1F1EE 1F1F9'], ['US Virgin Islands', '1F1FB 1F1EE'], ['Bahamas', '1F1E7 1F1F8'],
  ['Jamaica', '1F1EF 1F1F2'], ['Aruba', '1F1E6 1F1FC'], ['Curaçao', '1F1E8 1F1FC'], ['Sint Maarten', '1F1F8 1F1FD'],
  ['Barbados', '1F1E7 1F1E7'], ['Trinidad and Tobago', '1F1F9 1F1F9'], ['Dominican Republic', '1F1E9 1F1F4'],
  ['Turks and Caicos', '1F1F9 1F1E8'], ['Cayman Islands', '1F1F0 1F1FE'], ['Panama', '1F1F5 1F1E6'],
  ['Costa Rica', '1F1E8 1F1F7'], ['Guatemala', '1F1EC 1F1F9'], ['El Salvador', '1F1F8 1F1FB'],
  ['Honduras', '1F1ED 1F1F3'], ['Nicaragua', '1F1F3 1F1EE'], ['Belize', '1F1E7 1F1FF'], ['Colombia', '1F1E8 1F1F4'],
  ['Brazil', '1F1E7 1F1F7'], ['Argentina', '1F1E6 1F1F7'], ['Chile', '1F1E8 1F1F1'], ['Peru', '1F1F5 1F1EA'],
  ['Ecuador', '1F1EA 1F1E8'], ['Venezuela', '1F1FB 1F1EA'], ['Uruguay', '1F1FA 1F1FE'], ['Malaysia', '1F1F2 1F1FE'],
  ['Philippines', '1F1F5 1F1ED'], ['Indonesia', '1F1EE 1F1E9'], ['Vietnam', '1F1FB 1F1F3'], ['Qatar', '1F1F6 1F1E6'],
  ['Israel', '1F1EE 1F1F1'], ['Switzerland', '1F1E8 1F1ED'], ['Austria', '1F1E6 1F1F9'], ['Denmark', '1F1E9 1F1F0'],
  ['Sweden', '1F1F8 1F1EA'], ['Norway', '1F1F3 1F1F4'], ['Finland', '1F1EB 1F1EE'], ['Ireland', '1F1EE 1F1EA'],
  ['Poland', '1F1F5 1F1F1'], ['Czech Republic', '1F1E8 1F1FF'], ['Hungary', '1F1ED 1F1FA'], ['Turkey', '1F1F9 1F1F7'],
  ['Greece', '1F1EC 1F1F7'], ['Portugal', '1F1F5 1F1F9'], ['Australia', '1F1E6 1F1FA'], ['New Zealand', '1F1F3 1F1FF'],
  ['South Africa', '1F1FF 1F1E6'], ['Kenya', '1F1F0 1F1EA'], ['Ethiopia', '1F1EA 1F1F9'], ['Nigeria', '1F1F3 1F1EC'],
  ['Egypt', '1F1EA 1F1EC'], ['Bangladesh', '1F1E7 1F1E9'], ['Sri Lanka', '1F1F1 1F1F0'], ['Bahrain', '1F1E7 1F1ED'],
  ['Jordan', '1F1EF 1F1F4'],
]

const airports = JSON.parse(readFileSync(new URL('../../public/data/airports.json', import.meta.url), 'utf8')) as AirportTuple[]
const countries = new Set(airports.map(([, , country]) => country))

describe('countryFlag', () => {
  it('has the app’s 74 flags, exactly', () => {
    expect(FLAG_COUNTRIES).toHaveLength(74)
    expect([...FLAG_COUNTRIES].sort()).toEqual(APP_FLAGS.map(([country]) => country).sort())
  })

  it.each(APP_FLAGS)('shows the app’s flag for %s', (country, codePoints) => {
    expect(countryFlag(country)).toBe(String.fromCodePoint(...codePoints.split(' ').map((hex) => parseInt(hex, 16))))
  })

  it('spells every flag country the way the airport list does', () => {
    expect(FLAG_COUNTRIES.filter((country) => !countries.has(country))).toEqual([])
  })

  it('shows none for the US, a country the app has no flag for, or no country', () => {
    expect(countryFlag('USA')).toBeNull()
    expect(countryFlag('Russia')).toBeNull()
    expect(countryFlag('')).toBeNull()
    expect(countryFlag(null)).toBeNull()
    expect(countryFlag(undefined)).toBeNull()
  })

  it('isn’t fooled by names every object has', () => {
    expect(countryFlag('constructor')).toBeNull()
    expect(countryFlag('toString')).toBeNull()
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/copy/flags.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/copy/flags'`.

- [x] **Step 3: Implement**

Create `src/copy/flags.ts`:

```ts
/**
 * The countries the Crewluve app shows a flag for (countryFlags in AirportDataProvider.swift), by the airport list's
 * country name, with their two-letter ISO codes. The list's names already follow the app's spellings (slice 2A §6).
 * There's none for the US, or for countries the app has no flag for.
 */
const FLAG_REGIONS = new Map<string, string>([
  ['Canada', 'CA'], ['Mexico', 'MX'], ['Germany', 'DE'], ['China', 'CN'], ['UK', 'GB'], ['Puerto Rico', 'PR'],
  ['South Korea', 'KR'], ['Japan', 'JP'], ['Taiwan', 'TW'], ['Singapore', 'SG'], ['Thailand', 'TH'], ['India', 'IN'],
  ['UAE', 'AE'], ['France', 'FR'], ['Netherlands', 'NL'], ['Belgium', 'BE'], ['Spain', 'ES'], ['Italy', 'IT'],
  ['US Virgin Islands', 'VI'], ['Bahamas', 'BS'], ['Jamaica', 'JM'], ['Aruba', 'AW'], ['Curaçao', 'CW'],
  ['Sint Maarten', 'SX'], ['Barbados', 'BB'], ['Trinidad and Tobago', 'TT'], ['Dominican Republic', 'DO'],
  ['Turks and Caicos', 'TC'], ['Cayman Islands', 'KY'], ['Panama', 'PA'], ['Costa Rica', 'CR'], ['Guatemala', 'GT'],
  ['El Salvador', 'SV'], ['Honduras', 'HN'], ['Nicaragua', 'NI'], ['Belize', 'BZ'], ['Colombia', 'CO'],
  ['Brazil', 'BR'], ['Argentina', 'AR'], ['Chile', 'CL'], ['Peru', 'PE'], ['Ecuador', 'EC'], ['Venezuela', 'VE'],
  ['Uruguay', 'UY'], ['Malaysia', 'MY'], ['Philippines', 'PH'], ['Indonesia', 'ID'], ['Vietnam', 'VN'], ['Qatar', 'QA'],
  ['Israel', 'IL'], ['Switzerland', 'CH'], ['Austria', 'AT'], ['Denmark', 'DK'], ['Sweden', 'SE'], ['Norway', 'NO'],
  ['Finland', 'FI'], ['Ireland', 'IE'], ['Poland', 'PL'], ['Czech Republic', 'CZ'], ['Hungary', 'HU'], ['Turkey', 'TR'],
  ['Greece', 'GR'], ['Portugal', 'PT'], ['Australia', 'AU'], ['New Zealand', 'NZ'], ['South Africa', 'ZA'],
  ['Kenya', 'KE'], ['Ethiopia', 'ET'], ['Nigeria', 'NG'], ['Egypt', 'EG'], ['Bangladesh', 'BD'], ['Sri Lanka', 'LK'],
  ['Bahrain', 'BH'], ['Jordan', 'JO'],
])

/** Every country with a flag, by the airport list's name. */
export const FLAG_COUNTRIES: readonly string[] = [...FLAG_REGIONS.keys()]

/** The country's flag emoji, made of its two regional-indicator letters, or null when the app shows none. */
export function countryFlag(country: string | null | undefined): string | null {
  const region = country ? FLAG_REGIONS.get(country) : undefined
  return region ? String.fromCodePoint(...[...region].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65)) : null
}
```

It looks names up in a `Map`, not a plain object, so a name like "constructor" can't find a property every object has.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/copy/flags.test.ts`
Expected: PASS, 78 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/copy/flags.ts tests/copy/flags.test.ts
git commit -m "Copy: the app's 74 country flags (slice 2B1 §4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The weather hook

**Files:**
- Create: `src/ui/hooks/useWeather.ts`
- Test: `tests/ui/useWeather.test.tsx`

- [x] **Step 1: Write the failing test**

Create `tests/ui/useWeather.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Weather, WeatherLoader, WeatherPlace } from '../../src/data/weather'
import { useWeather, WEATHER_REFRESH_MS } from '../../src/ui/hooks/useWeather'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(Date.UTC(2026, 9, 10, 17))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  restoreVisibility()
})

/** Makes document.visibilityState report `state` until restoreVisibility() runs. */
function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
}
function restoreVisibility() {
  delete (document as { visibilityState?: unknown }).visibilityState
}
const flush = () =>
  act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
  })
const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
  await flush()
}
const returnToPage = async () => {
  setVisibility('visible')
  await act(async () => {
    fireEvent(document, new Event('visibilitychange'))
  })
  await flush()
}

const ANC: WeatherPlace = { code: 'ANC', lat: 61.1744, lng: -149.9983, tz: 'America/Anchorage', unit: 'fahrenheit' }
const SDF: WeatherPlace = { code: 'SDF', lat: 38.1746, lng: -85.7382, tz: 'America/Kentucky/Louisville', unit: 'fahrenheit' }
const cloudy = (temperature: number): Weather => ({ temperature, code: 3, isDay: true })

/** A loader that answers 41°, 42°, 43°… in call order, and records which airport and unit each call asked for. */
function countingLoader() {
  const calls: string[] = []
  const load: WeatherLoader = async (place) => {
    calls.push(`${place.code}|${place.unit}`)
    return cloudy(40 + calls.length)
  }
  return { load, calls }
}

function Probe({ place, load }: { place: WeatherPlace | null; load: WeatherLoader }) {
  const weather = useWeather(place, load)
  return <span data-testid="weather">{weather ? `${weather.temperature}°` : 'none'}</span>
}
const shown = () => screen.getByTestId('weather').textContent

describe('useWeather', () => {
  it('shows nothing until the weather comes, then the weather', async () => {
    const { load, calls } = countingLoader()
    render(<Probe place={ANC} load={load} />)
    expect(shown()).toBe('none')
    await flush()
    expect(shown()).toBe('41°')
    expect(calls).toEqual(['ANC|fahrenheit'])
  })

  it('asks for nothing when there is no airport', async () => {
    const { load, calls } = countingLoader()
    render(<Probe place={null} load={load} />)
    await flush()
    expect(shown()).toBe('none')
    expect(calls).toEqual([])
  })

  it('keeps each airport’s weather for 15 minutes', async () => {
    const { load, calls } = countingLoader()
    const { rerender } = render(<Probe place={ANC} load={load} />)
    await flush()
    rerender(<Probe place={SDF} load={load} />)
    await flush()
    expect(shown()).toBe('42°')
    rerender(<Probe place={ANC} load={load} />)
    expect(shown()).toBe('41°')
    await flush()
    expect(calls).toEqual(['ANC|fahrenheit', 'SDF|fahrenheit'])
  })

  it('asks again for the other unit', async () => {
    const { load, calls } = countingLoader()
    const { rerender } = render(<Probe place={ANC} load={load} />)
    await flush()
    rerender(<Probe place={{ ...ANC, unit: 'celsius' }} load={load} />)
    await flush()
    expect(calls).toEqual(['ANC|fahrenheit', 'ANC|celsius'])
  })

  it('fetches again every 15 minutes while the page is visible, and not while it’s hidden', async () => {
    const { load, calls } = countingLoader()
    render(<Probe place={ANC} load={load} />)
    await flush()
    await advance(WEATHER_REFRESH_MS)
    expect(shown()).toBe('42°')
    setVisibility('hidden')
    await advance(WEATHER_REFRESH_MS)
    expect(calls).toHaveLength(2)
  })

  it('fetches at each 15-minute tick even when the last answer was slow to come', async () => {
    vi.useRealTimers()
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
    const load = vi.fn<WeatherLoader>(() => new Promise((resolve) => setTimeout(() => resolve(cloudy(41)), 2000)))
    render(<Probe place={ANC} load={load} />)
    await advance(2000)
    expect(shown()).toBe('41°')
    await advance(WEATHER_REFRESH_MS - 2000)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('fetches on a return to the page only once the weather is stale', async () => {
    const { load, calls } = countingLoader()
    render(<Probe place={ANC} load={load} />)
    await flush()
    await returnToPage()
    expect(calls).toHaveLength(1)
    setVisibility('hidden')
    await advance(WEATHER_REFRESH_MS)
    expect(calls).toHaveLength(1)
    await returnToPage()
    expect(calls).toHaveLength(2)
    expect(shown()).toBe('42°')
  })

  it('shows none after a failure, and tries again at the next refresh, not on a quick return', async () => {
    let failing = true
    const load = vi.fn<WeatherLoader>(async () => {
      if (failing) throw new Error('offline')
      return cloudy(41)
    })
    render(<Probe place={ANC} load={load} />)
    await flush()
    expect(shown()).toBe('none')
    failing = false
    await returnToPage()
    expect(load).toHaveBeenCalledTimes(1)
    await advance(WEATHER_REFRESH_MS)
    expect(load).toHaveBeenCalledTimes(2)
    expect(shown()).toBe('41°')
  })

  it('never asks twice for the same airport while an answer is on its way', async () => {
    const load = vi.fn<WeatherLoader>(() => new Promise<Weather | null>(() => {}))
    render(<Probe place={ANC} load={load} />)
    await returnToPage()
    await advance(WEATHER_REFRESH_MS)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('keeps an answer that lands after the airport changed for its own airport', async () => {
    const answers: Array<(weather: Weather) => void> = []
    const load = vi.fn<WeatherLoader>(() => new Promise<Weather | null>((resolve) => answers.push(resolve)))
    const { rerender } = render(<Probe place={ANC} load={load} />)
    rerender(<Probe place={SDF} load={load} />)
    await act(async () => answers[0](cloudy(41)))
    await flush()
    expect(shown()).toBe('none')
    rerender(<Probe place={ANC} load={load} />)
    expect(shown()).toBe('41°')
    expect(load.mock.calls.map(([place]) => place.code)).toEqual(['ANC', 'SDF'])
  })

  it('stops its timer and listener when it unmounts', async () => {
    const remove = vi.spyOn(document, 'removeEventListener')
    const { load } = countingLoader()
    const { unmount } = render(<Probe place={ANC} load={load} />)
    await flush()
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/useWeather.test.tsx`
Expected: FAIL with `Error: Cannot find module '../../src/ui/hooks/useWeather'`.

- [x] **Step 3: Implement**

Create `src/ui/hooks/useWeather.ts`:

```ts
import { useEffect, useRef, useState } from 'preact/hooks'
import type { Weather, WeatherLoader, WeatherPlace } from '../../data/weather'

/** How long weather is kept, and how often it's fetched again: 15 minutes, like the app's WeatherService cache. */
export const WEATHER_REFRESH_MS = 15 * 60_000

/**
 * The current weather at `place`, or null while it loads or when there's none (slice 2B1 §6). Results stay in memory
 * for each airport and unit. A new airport fetches at once, unless it was fetched less than 15 minutes ago. Then it
 * fetches every 15 minutes while the page is visible, and on a return to the page once its weather is stale. A
 * failure is kept as "none" too, so it's tried again only at the next of those, never in a rapid loop.
 */
export function useWeather(place: WeatherPlace | null, load: WeatherLoader, refreshMs = WEATHER_REFRESH_MS): Weather | null {
  const kept = useRef(new Map<string, { weather: Weather | null; at: number }>())
  const pending = useRef(new Set<string>())
  const [, setVersion] = useState(0)
  const key = place ? `${place.code}|${place.unit}` : null

  useEffect(() => {
    // This runs again whenever the airport or unit changes, so `place` and `load` here always belong to `key`.
    if (!place || !key) return
    let alive = true
    const refresh = (force: boolean) => {
      const entry = kept.current.get(key)
      if (pending.current.has(key) || (!force && entry && Date.now() - entry.at < refreshMs)) return
      pending.current.add(key)
      void load(place)
        .catch(() => null)
        .then((weather) => {
          pending.current.delete(key)
          kept.current.set(key, { weather, at: Date.now() })
          if (alive) setVersion((v) => v + 1)
        })
    }
    refresh(false)
    const tick = setInterval(() => {
      if (document.visibilityState !== 'hidden') refresh(true)
    }, refreshMs)
    const onReturn = () => {
      if (document.visibilityState === 'visible') refresh(false)
    }
    document.addEventListener('visibilitychange', onReturn)
    return () => {
      alive = false
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onReturn)
    }
  }, [key, refreshMs])

  return key ? (kept.current.get(key)?.weather ?? null) : null
}
```

The interval forces a fetch rather than checking the age, because the timer starts before the first answer lands. An age check at the 15-minute tick would find weather a little under 15 minutes old and skip it until the next tick. The "slow to come" test catches that.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/useWeather.test.tsx`
Expected: PASS, 11 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/ui/hooks/useWeather.ts tests/ui/useWeather.test.tsx
git commit -m "Weather hook: kept 15 minutes per airport, refreshed while visible (slice 2B1 §6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The dial's geometry

**Files:**
- Create: `src/ui/sunDialGeometry.ts`
- Test: `tests/ui/sunDialGeometry.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/ui/sunDialGeometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { arcPath, dialAngle, glowBands, labelAt, markerPath, pointAt, skyBackground, skyStops, tickAt } from '../../src/ui/sunDialGeometry'

const NY = 'America/New_York'
/** 10 October 2026 at `hour`:`minute` in New York (EDT, UTC-4). */
const ny = (hour: number, minute = 0) => Date.UTC(2026, 9, 10, hour + 4, minute)

describe('dialAngle', () => {
  it('puts midnight at the bottom, 6 am at the left, noon at the top and 6 pm at the right', () => {
    expect(dialAngle(ny(0), NY)).toBe(90)
    expect(dialAngle(ny(6), NY)).toBe(180)
    expect(dialAngle(ny(12), NY)).toBe(270)
    expect(dialAngle(ny(18), NY)).toBe(360)
    expect(dialAngle(ny(8, 12), NY)).toBe(213)
  })

  it('reads the clock in the zone it is given', () => {
    // Noon in New York is 9 am in Los Angeles.
    expect(dialAngle(ny(12), 'America/Los_Angeles')).toBe(225)
  })
})

describe('pointAt', () => {
  it('measures from the circle’s center, 2 points below the middle of the 160-point box', () => {
    const at = (angle: number) => {
      const p = pointAt(angle, 42)
      return [Math.round(p.x * 1000) / 1000, Math.round(p.y * 1000) / 1000]
    }
    expect(at(90)).toEqual([80, 124])
    expect(at(180)).toEqual([38, 82])
    expect(at(270)).toEqual([80, 40])
    expect(at(360)).toEqual([122, 82])
  })
})

describe('arcPath', () => {
  it('draws clockwise from the first angle to the second', () => {
    // 6 am to 6 pm goes over the top; 6 pm to 6 am goes under the bottom.
    expect(arcPath(180, 360, 42)).toBe('M38 82A42 42 0 0 1 122 82')
    expect(arcPath(360, 180, 42)).toBe('M122 82A42 42 0 0 1 38 82')
  })

  it('takes the long way round when the arc is more than half the circle', () => {
    expect(arcPath(180, 405, 42)).toBe('M38 82A42 42 0 1 1 109.7 111.7')
  })
})

describe('glowBands', () => {
  it('lays 30 minutes of golden hour inside the daylight and 30 of twilight outside it, at both ends', () => {
    expect(glowBands(213, 378)).toEqual([
      { kind: 'golden', from: 213, to: 220.5 },
      { kind: 'golden', from: 370.5, to: 378 },
      { kind: 'twilight', from: 205.5, to: 213 },
      { kind: 'twilight', from: 378, to: 385.5 },
    ])
  })

  it('measures the daylight round the dial, wherever 3 o’clock falls', () => {
    // The same sunset written as 18° instead of 378° still gets full 30-minute golden bands.
    const [morning, evening] = glowBands(213, 18)
    expect(morning).toEqual({ kind: 'golden', from: 213, to: 220.5 })
    expect(evening).toEqual({ kind: 'golden', from: 10.5, to: 18 })
  })

  it('keeps each golden band to half the daylight on a very short day', () => {
    const [morning, evening] = glowBands(260, 270)
    expect(morning).toEqual({ kind: 'golden', from: 260, to: 265 })
    expect(evening).toEqual({ kind: 'golden', from: 265, to: 270 })
  })
})

describe('markers, ticks and labels', () => {
  it('points the noon triangle at the top of the circle and the midnight one at the bottom', () => {
    expect(markerPath(270)).toBe('M80 40L76.5 34L83.5 34Z')
    expect(markerPath(90)).toBe('M80 124L76.5 130L83.5 130Z')
  })

  it('crosses the circle with a 6-point tick', () => {
    const tick = tickAt(180)
    expect([tick.from.x, tick.from.y, tick.to.x, tick.to.y].map((v) => Math.round(v * 1000) / 1000)).toEqual([41, 82, 35, 82])
  })

  it('puts the labels 38 points beyond the circle, kept 22 points from the sides and 8 from the top and bottom', () => {
    const at = (angle: number) => {
      const p = labelAt(angle)
      return [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100]
    }
    expect(at(180)).toEqual([22, 82])
    expect(at(360)).toEqual([138, 82])
    expect(at(270)).toEqual([80, 8])
    expect(at(405)).toEqual([136.57, 138.57])
  })
})

describe('the sky', () => {
  it('runs navy, amber at sunrise, sky blue by day, amber at sunset, navy again, from 3 o’clock round', () => {
    // Sunrise 8:12 am (213°), sunset 7:12 pm (378°, just past 3 o'clock).
    const stops = skyStops(213, 378).map((s) => [s.color, Math.round(s.at * 10000) / 10000])
    expect(stops).toEqual([
      ['rgb(102, 179, 255)', 0.01],
      ['rgb(230, 153, 51)', 0.05],
      ['rgb(13, 13, 51)', 0.07],
      ['rgb(13, 13, 51)', 0.25],
      ['rgb(13, 13, 51)', 0.25],
      ['rgb(13, 13, 51)', 0.5717],
      ['rgb(230, 153, 51)', 0.5917],
      ['rgb(102, 179, 255)', 0.6317],
      ['rgb(102, 179, 255)', 0.75],
    ])
  })

  it('becomes a conic gradient that starts at 3 o’clock', () => {
    expect(skyBackground(213, 378)).toBe(
      'conic-gradient(from 90deg, rgb(102, 179, 255) 1%, rgb(230, 153, 51) 5%, rgb(13, 13, 51) 7%, rgb(13, 13, 51) 25%, ' +
        'rgb(13, 13, 51) 25%, rgb(13, 13, 51) 57.17%, rgb(230, 153, 51) 59.17%, rgb(102, 179, 255) 63.17%, rgb(102, 179, 255) 75%)',
    )
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/sunDialGeometry.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/ui/sunDialGeometry'`.

- [x] **Step 3: Implement**

Create `src/ui/sunDialGeometry.ts`. Every number comes from `SunCircleView` in `PilotStatusView.swift` at its card size, 160:

```ts
import { zonedParts } from '../time/zoned'

/** SunCircleView's card-size measurements (PilotStatusView.swift, size 160), in points of its own 160-point box. */
export const DIAL = {
  size: 160,
  /** The circle's center sits 2 points below the middle of the box. */
  cx: 80,
  cy: 82,
  radius: 42,
  sunIcon: 14,
  moonIcon: 12,
  tick: 6,
  marker: 6,
  markerHalfWidth: 3.5,
  labelOffset: 38,
  labelInsetX: 22,
  labelInsetY: 8,
  noonLabelOffset: 14,
} as const

export interface Point {
  x: number
  y: number
}

/**
 * Where a time sits on the dial, in degrees clockwise from 3 o'clock: midnight 90 (the bottom), 6 am 180, noon 270,
 * 6 pm 360. Taken from the hour and minute in `timeZone`, as the app does (angleForTime).
 */
export function dialAngle(ms: number, timeZone: string): number {
  const { hour, minute } = zonedParts(ms, timeZone)
  return 90 + ((hour + minute / 60) / 24) * 360
}

/** The point `radius` from the dial's center at `angle` degrees. */
export function pointAt(angle: number, radius: number): Point {
  const a = (angle * Math.PI) / 180
  return { x: DIAL.cx + radius * Math.cos(a), y: DIAL.cy + radius * Math.sin(a) }
}

/** A coordinate rounded to hundredths, which keeps path data short. */
const round = (v: number) => Math.round(v * 100) / 100

/** An SVG path along the circle of `radius`, clockwise from angle `from` to angle `to`. */
export function arcPath(from: number, to: number, radius: number): string {
  const sweep = (((to - from) % 360) + 360) % 360
  const a = pointAt(from, radius)
  const b = pointAt(to, radius)
  return `M${round(a.x)} ${round(a.y)}A${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} 1 ${round(b.x)} ${round(b.y)}`
}

/** A 30-minute glow: golden hour, amber, just inside the daylight; twilight, blue, just outside it. */
export interface GlowBand {
  kind: 'golden' | 'twilight'
  from: number
  to: number
}

/** Thirty minutes of the day, in degrees. */
const GLOW_DEGREES = (30 / 1440) * 360

/** The four glow bands, in the app's drawing order. The golden ones never cover more than half the daylight. */
export function glowBands(sunrise: number, sunset: number): GlowBand[] {
  const span = (sunset - sunrise) % 360
  const daylight = span <= 0 ? span + 360 : span
  const golden = Math.min(GLOW_DEGREES, daylight / 2)
  return [
    { kind: 'golden', from: sunrise, to: sunrise + golden },
    { kind: 'golden', from: sunset - golden, to: sunset },
    { kind: 'twilight', from: sunrise - GLOW_DEGREES, to: sunrise },
    { kind: 'twilight', from: sunset, to: sunset + GLOW_DEGREES },
  ]
}

/** The tick across the circle at sunrise or sunset. */
export function tickAt(angle: number): { from: Point; to: Point } {
  return { from: pointAt(angle, DIAL.radius - DIAL.tick / 2), to: pointAt(angle, DIAL.radius + DIAL.tick / 2) }
}

/** The small triangle outside the circle that points at noon (270) or midnight (90). */
export function markerPath(angle: 90 | 270): string {
  const tip = pointAt(angle, DIAL.radius)
  const base = pointAt(angle, DIAL.radius + DIAL.marker)
  const half = DIAL.markerHalfWidth
  return `M${round(tip.x)} ${round(tip.y)}L${round(base.x - half)} ${round(base.y)}L${round(base.x + half)} ${round(base.y)}Z`
}

/** Where the sunrise or sunset label goes: 38 points beyond the circle, kept inside the box. */
export function labelAt(angle: number): Point {
  const p = pointAt(angle, DIAL.radius + DIAL.labelOffset)
  return {
    x: Math.max(DIAL.labelInsetX, Math.min(DIAL.size - DIAL.labelInsetX, p.x)),
    y: Math.max(DIAL.labelInsetY, Math.min(DIAL.size - DIAL.labelInsetY, p.y)),
  }
}

export interface SkyStop {
  color: string
  /** How far round from 3 o'clock, clockwise, from 0 to 1. */
  at: number
}

const NAVY = 'rgb(13, 13, 51)' // Color(red: 0.05, green: 0.05, blue: 0.2)
const AMBER = 'rgb(230, 153, 51)' // Color(red: 0.9, green: 0.6, blue: 0.2)
const SKY_BLUE = 'rgb(102, 179, 255)' // Color(red: 0.4, green: 0.7, blue: 1.0)

/** A fraction of a turn, wrapped into 0…1. */
const wrap = (f: number) => {
  const v = f % 1
  return v < 0 ? v + 1 : v
}

/**
 * The sky's colors round the dial (skyGradientStops): navy at night, amber at sunrise and sunset, sky blue by day.
 * The navy turns amber 2% of the day before sunrise and back after sunset; the amber turns blue 4% of the day into daylight.
 */
export function skyStops(sunrise: number, sunset: number): SkyStop[] {
  const rise = wrap(sunrise / 360)
  const set = wrap(sunset / 360)
  const midnight = wrap(90 / 360)
  return [
    { color: NAVY, at: midnight },
    { color: NAVY, at: wrap(rise - 0.02) },
    { color: AMBER, at: rise },
    { color: SKY_BLUE, at: wrap(rise + 0.04) },
    { color: SKY_BLUE, at: wrap(270 / 360) },
    { color: SKY_BLUE, at: wrap(set - 0.04) },
    { color: AMBER, at: set },
    { color: NAVY, at: wrap(set + 0.02) },
    { color: NAVY, at: wrap(midnight + 1) },
  ].sort((a, b) => a.at - b.at)
}

/** The sky as a CSS conic gradient that starts at 3 o'clock, as SwiftUI's does. */
export function skyBackground(sunrise: number, sunset: number): string {
  return `conic-gradient(from 90deg, ${skyStops(sunrise, sunset)
    .map((stop) => `${stop.color} ${round(stop.at * 100)}%`)
    .join(', ')})`
}
```

SVG's y axis points down, as SwiftUI's does, so growing angles run clockwise on screen, and the app's angles carry over unchanged. CSS's `conic-gradient` starts at 12 o'clock, so `from 90deg` moves its start to 3 o'clock, where SwiftUI's begins.

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/sunDialGeometry.test.ts`
Expected: PASS, 13 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/ui/sunDialGeometry.ts tests/ui/sunDialGeometry.test.ts
git commit -m "Sun dial geometry: angles, arcs, glow bands, labels and sky (slice 2B1 §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The sun dial

**Files:**
- Create: `src/ui/SunDial.tsx`
- Test: `tests/ui/SunDial.test.tsx`

- [x] **Step 1: Write the failing test**

Create `tests/ui/SunDial.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { SunDial } from '../../src/ui/SunDial'
import { arcPath, dialAngle, pointAt } from '../../src/ui/sunDialGeometry'
import { iconNameOf } from '../fixtures/ui'

afterEach(cleanup)

const ANC = 'America/Anchorage'
// Round numbers for Anchorage on 10 October 2026: sunrise 8:12 AM, sunset 6:41 PM.
const sun = { sunrise: Date.UTC(2026, 9, 10, 16, 12), sunset: Date.UTC(2026, 9, 11, 2, 41) }
const MORNING = Date.UTC(2026, 9, 10, 17, 14) // 9:14 AM
const NIGHT = Date.UTC(2026, 9, 11, 6, 5) // 10:05 PM

const dial = (now: number, h24 = false) => <SunDial sun={sun} now={now} timeZone={ANC} h24={h24} city="Anchorage" />
const texts = (container: Element) => [...container.querySelectorAll('text')].map((t) => t.textContent)
const num = (el: Element | null, name: string) => Number(el!.getAttribute(name))

describe('SunDial', () => {
  it('is one image to screen readers, named with the sun times and whether it’s day', () => {
    const { container } = render(dial(MORNING))
    expect(screen.getByRole('img', { name: 'Sunrise 8:12\u202FAM, sunset 6:41\u202FPM, daytime in Anchorage' })).toBeTruthy()
    expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('labels noon, sunrise and sunset the way the app does', () => {
    const { container } = render(dial(MORNING))
    expect(texts(container)).toEqual(['Noon', '8:12a', '6:41p'])
  })

  it('labels sunrise and sunset in 24-hour time for visitors who use it', () => {
    const { container } = render(dial(MORNING, true))
    expect(texts(container)).toEqual(['Noon', '08:12', '18:41'])
  })

  it('draws the daylight from sunrise to sunset and the night back round, with glow bands, ticks and markers', () => {
    const { container } = render(dial(MORNING))
    const rise = dialAngle(sun.sunrise, ANC)
    const set = dialAngle(sun.sunset, ANC)
    expect(container.querySelector('.sun-day')!.getAttribute('d')).toBe(arcPath(rise, set, 42))
    expect(container.querySelector('.sun-night')!.getAttribute('d')).toBe(arcPath(set, rise, 42))
    expect(container.querySelector('.sun-day')!.getAttribute('stroke')).toMatch(/^url\(#.+-day\)$/)
    expect(container.querySelectorAll('.sun-band.golden')).toHaveLength(2)
    expect(container.querySelectorAll('.sun-band.twilight')).toHaveLength(2)
    expect(container.querySelectorAll('.sun-tick')).toHaveLength(2)
    expect(container.querySelectorAll('.sun-marker')).toHaveLength(2)
  })

  it('points the hand at the time now, ending in a glowing sun by day', () => {
    const { container } = render(dial(MORNING))
    const tip = pointAt(dialAngle(MORNING, ANC), 42)
    const hand = container.querySelector('.sun-hand')
    expect(num(hand, 'x2')).toBeCloseTo(tip.x, 6)
    expect(num(hand, 'y2')).toBeCloseTo(tip.y, 6)
    const now = container.querySelector('.sun-now')!
    expect(iconNameOf(now.querySelector('svg'))).toBe('Sun')
    expect(now.getAttribute('filter')).toMatch(/^url\(#.+-glow\)$/)
  })

  it('ends the hand in the moon at night, with no glow', () => {
    const { container } = render(dial(NIGHT))
    const now = container.querySelector('.sun-now')!
    expect(iconNameOf(now.querySelector('svg'))).toBe('Moon')
    expect(now.getAttribute('filter')).toBeNull()
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Sunrise 8:12\u202FAM, sunset 6:41\u202FPM, nighttime in Anchorage')
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/SunDial.test.tsx`
Expected: FAIL with `Error: Cannot find module '../../src/ui/SunDial'`.

- [x] **Step 3: Implement**

Create `src/ui/SunDial.tsx`:

```tsx
import { useId } from 'preact/hooks'
import { dialTimeText } from '../copy/format'
import { sunDialLabel } from '../copy/location'
import { isDaytime, type SunTimes } from '../time/sun'
import { Icon } from './Icon'
import { arcPath, dialAngle, DIAL, glowBands, labelAt, markerPath, pointAt, skyBackground, tickAt } from './sunDialGeometry'

export interface SunDialProps {
  sun: SunTimes
  now: number
  /** The pilot's time zone: the dial shows their day. */
  timeZone: string
  h24: boolean
  /** The city, for the screen-reader label. */
  city: string
}

/**
 * The location card's 24-hour sun dial: SunCircleView at card size, with only the parts the app draws there
 * (slice 2B1 §5). Screen readers hear it as one image.
 */
export function SunDial({ sun, now, timeZone, h24, city }: SunDialProps) {
  const id = useId()
  const r = DIAL.radius
  const rise = dialAngle(sun.sunrise, timeZone)
  const set = dialAngle(sun.sunset, timeZone)
  const risePoint = pointAt(rise, r)
  const setPoint = pointAt(set, r)
  const hand = pointAt(dialAngle(now, timeZone), r)
  const day = isDaytime(now, sun)
  const icon = day ? DIAL.sunIcon : DIAL.moonIcon
  const labels = [
    { at: labelAt(rise), text: dialTimeText(sun.sunrise, timeZone, h24) },
    { at: labelAt(set), text: dialTimeText(sun.sunset, timeZone, h24) },
  ]
  return (
    <div class="sun-dial" role="img" aria-label={sunDialLabel(sun, now, timeZone, h24, city)}>
      <div class="sun-sky" style={{ background: skyBackground(rise, set) }} />
      <svg viewBox={`0 0 ${DIAL.size} ${DIAL.size}`} aria-hidden="true">
        <defs>
          {/* userSpaceOnUse, so each arc's colors run from its own start to its end, as the app's do. */}
          <linearGradient id={`${id}-day`} gradientUnits="userSpaceOnUse" x1={risePoint.x} y1={risePoint.y} x2={setPoint.x} y2={setPoint.y}>
            <stop offset="0" class="sun-day-end" />
            <stop offset="0.5" class="sun-day-middle" />
            <stop offset="1" class="sun-day-end" />
          </linearGradient>
          <linearGradient id={`${id}-night`} gradientUnits="userSpaceOnUse" x1={setPoint.x} y1={setPoint.y} x2={risePoint.x} y2={risePoint.y}>
            <stop offset="0" class="sun-night-end" />
            <stop offset="0.5" class="sun-night-middle" />
            <stop offset="1" class="sun-night-end" />
          </linearGradient>
          {/* The sun's soft orange shadow (radius 4 in the app). */}
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
            <feFlood class="sun-glow" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path class="sun-day" d={arcPath(rise, set, r)} stroke={`url(#${id}-day)`} />
        <path class="sun-night" d={arcPath(set, rise, r)} stroke={`url(#${id}-night)`} />
        {glowBands(rise, set).map((band, i) => (
          <path key={i} class={`sun-band ${band.kind}`} d={arcPath(band.from, band.to, r)} />
        ))}
        {[rise, set].map((angle, i) => {
          const tick = tickAt(angle)
          return <line key={i} class="sun-tick" x1={tick.from.x} y1={tick.from.y} x2={tick.to.x} y2={tick.to.y} />
        })}
        <path class="sun-marker" d={markerPath(270)} />
        <path class="sun-marker" d={markerPath(90)} />
        <line class="sun-hand" x1={DIAL.cx} y1={DIAL.cy} x2={hand.x} y2={hand.y} />
        <g
          class={day ? 'sun-now day' : 'sun-now night'}
          transform={`translate(${hand.x - icon / 2} ${hand.y - icon / 2})`}
          filter={day ? `url(#${id}-glow)` : undefined}
        >
          <Icon name={day ? 'Sun' : 'Moon'} size={icon} />
        </g>
        <text class="sun-noon" x={DIAL.cx} y={DIAL.cy - r - DIAL.noonLabelOffset}>
          Noon
        </text>
        {labels.map((label, i) => (
          <text key={i} class="sun-time" x={label.at.x} y={label.at.y}>
            {label.text}
          </text>
        ))}
      </svg>
    </div>
  )
}
```

Its classes get their colors and strokes from `src/styles/location.css` in Task 13. The CSP allows the sky's inline `background`, because Preact sets object styles through the CSSOM rather than a `style` attribute in the HTML (slice 2A found the same for the trip bar).

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/SunDial.test.tsx`
Expected: PASS, 6 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/ui/SunDial.tsx tests/ui/SunDial.test.tsx
git commit -m "Sun dial: the card-size SunCircleView as SVG (slice 2B1 §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The time difference line

**Files:**
- Create: `src/ui/TimeDifferenceLine.tsx`
- Test: `tests/ui/TimeDifferenceLine.test.tsx`

- [x] **Step 1: Write the failing test**

Create `tests/ui/TimeDifferenceLine.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TimeDifference } from '../../src/copy/location'
import { ODOMETER_DELAY_MS, ODOMETER_STEP_MS, TimeDifferenceLine } from '../../src/ui/TimeDifferenceLine'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const behind4: TimeDifference = { hours: 4, minutes: 0, direction: 'behind' }
const ahead130: TimeDifference = { hours: 1, minutes: 30, direction: 'ahead' }

/** What a sighted visitor sees: the line without its screen-reader words. */
const seen = (container: Element) => container.querySelector('.time-diff [aria-hidden="true"]')!.textContent
const minutes = (container: Element) => container.querySelector('.time-diff-minutes')!
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms)
  })

describe('TimeDifferenceLine', () => {
  it('says "same time as you" when the clocks match', () => {
    const { container } = render(<TimeDifferenceLine diff={{ hours: 0, minutes: 0, direction: 'same' }} />)
    expect(container.querySelector('.time-diff')!.textContent).toBe('same time as you')
  })

  it('counts the hours up from 0, one every 150 ms, after a short pause, like the app’s odometer', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { container } = render(<TimeDifferenceLine diff={behind4} />)
    expect(seen(container)).toBe('0h behind you')
    await advance(ODOMETER_DELAY_MS)
    expect(seen(container)).toBe('1h behind you')
    await advance(ODOMETER_STEP_MS * 3)
    expect(seen(container)).toBe('4h behind you')
    await advance(ODOMETER_STEP_MS * 5)
    expect(seen(container)).toBe('4h behind you')
  })

  it('fades the minutes in once the hours have counted up', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { container } = render(<TimeDifferenceLine diff={ahead130} />)
    expect(minutes(container).classList.contains('shown')).toBe(false)
    await advance(ODOMETER_DELAY_MS)
    expect(seen(container)).toBe('1h 30m ahead of you')
    expect(minutes(container).classList.contains('shown')).toBe(false)
    await advance(ODOMETER_STEP_MS)
    expect(minutes(container).classList.contains('shown')).toBe(true)
  })

  it('shows a difference under an hour at once, without "0h"', () => {
    const { container } = render(<TimeDifferenceLine diff={{ hours: 0, minutes: 30, direction: 'ahead' }} />)
    expect(seen(container)).toBe('30m ahead of you')
    expect(minutes(container).classList.contains('shown')).toBe(true)
  })

  it('shows the final text at once for people who prefer reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
    const { container } = render(<TimeDifferenceLine diff={ahead130} />)
    expect(seen(container)).toBe('1h 30m ahead of you')
    expect(minutes(container).classList.contains('shown')).toBe(true)
  })

  it('colors the numbers by direction: blue ahead, orange behind', () => {
    const { container, rerender } = render(<TimeDifferenceLine diff={ahead130} />)
    expect(container.querySelector('.time-diff')!.className).toBe('time-diff ahead')
    rerender(<TimeDifferenceLine diff={behind4} />)
    expect(container.querySelector('.time-diff')!.className).toBe('time-diff behind')
  })

  it('reads the difference to screen readers in words', () => {
    const { container } = render(<TimeDifferenceLine diff={ahead130} />)
    expect(container.querySelector('.time-diff .sr-only')!.textContent).toBe('1 hour 30 minutes ahead of you')
  })

  it('counts up again when the difference changes', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { container, rerender } = render(<TimeDifferenceLine diff={behind4} />)
    await advance(ODOMETER_DELAY_MS + ODOMETER_STEP_MS * 4)
    rerender(<TimeDifferenceLine diff={{ hours: 2, minutes: 0, direction: 'ahead' }} />)
    expect(seen(container)).toBe('0h ahead of you')
    await advance(ODOMETER_DELAY_MS + ODOMETER_STEP_MS)
    expect(seen(container)).toBe('2h ahead of you')
  })

  it('stops counting when it goes away', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { unmount } = render(<TimeDifferenceLine diff={behind4} />)
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/ui/TimeDifferenceLine.test.tsx`
Expected: FAIL with `Error: Cannot find module '../../src/ui/TimeDifferenceLine'`.

- [x] **Step 3: Implement**

Create `src/ui/TimeDifferenceLine.tsx`. The timing copies `OdometerTimeDiffView` in `PilotStatusView.swift`: a 0.2 s pause, then one hour every 0.15 s, then the minutes fade in:

```tsx
import { useEffect, useState } from 'preact/hooks'
import { directionText, spokenTimeDifference, type TimeDifference } from '../copy/location'

/** The odometer's pause before the first hour, and the time each hour takes (OdometerTimeDiffView). */
export const ODOMETER_DELAY_MS = 200
export const ODOMETER_STEP_MS = 150

/** The time difference under the local time (slice 2B1 §4): "same time as you", or the app's counting odometer. */
export function TimeDifferenceLine({ diff }: { diff: TimeDifference }) {
  if (diff.direction === 'same') return <p class="time-diff">same time as you</p>
  // A new difference, from a new city or a clock change, counts up afresh, as the app's view does when it appears.
  return <Odometer key={`${diff.direction} ${diff.hours}:${diff.minutes}`} diff={diff} direction={diff.direction} />
}

const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The hours count up from 0, one step every 150 ms, then the minutes fade in. People who ask for reduced motion, and
 * differences under an hour, get the final text at once. Screen readers hear it in words instead.
 */
function Odometer({ diff, direction }: { diff: TimeDifference; direction: 'ahead' | 'behind' }) {
  const [still] = useState(() => diff.hours === 0 || prefersReducedMotion())
  const [hours, setHours] = useState(still ? diff.hours : 0)
  const [minutesIn, setMinutesIn] = useState(still)
  useEffect(() => {
    if (still) return
    let step = 0
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      step += 1
      if (step <= diff.hours) {
        setHours(step)
        timer = setTimeout(tick, ODOMETER_STEP_MS)
      } else {
        setMinutesIn(true)
      }
    }
    timer = setTimeout(tick, ODOMETER_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])
  return (
    <p class={`time-diff ${direction}`}>
      <span class="sr-only">{spokenTimeDifference(diff)}</span>
      <span aria-hidden="true">
        {diff.hours > 0 && (
          <>
            {/* A fresh element for each new number, so it rolls in like the app's numeric text. */}
            <span key={hours} class="time-diff-num roll">
              {hours}
            </span>
            h
          </>
        )}
        {diff.minutes > 0 && (
          <span class={minutesIn ? 'time-diff-minutes shown' : 'time-diff-minutes'}>
            {diff.hours > 0 ? ' ' : ''}
            <span class="time-diff-num">{diff.minutes}</span>m
          </span>
        )}
        {` ${directionText(direction)}`}
      </span>
    </p>
  )
}
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/ui/TimeDifferenceLine.test.tsx`
Expected: PASS, 9 tests.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/ui/TimeDifferenceLine.tsx tests/ui/TimeDifferenceLine.test.tsx
git commit -m "Time difference: the app's counting odometer, still for reduced motion (slice 2B1 §4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: The location card and its styles

**Files:**
- Create: `src/ui/LocationCard.tsx`, `src/styles/location.css`
- Modify: `src/main.tsx`, `tests/fixtures/airports.ts`, `tests/styles/styles.test.ts`
- Test: `tests/ui/LocationCard.test.tsx`

- [x] **Step 1: Write the failing tests**

Add Utqiaġvik to the test airports, for the polar-night test. In `tests/fixtures/airports.ts`, add this row after the `CGN` row:

```ts
  ['BRW', 'Utqiaġvik', 'USA', 71.2854, -156.766, 'America/Anchorage', 'AK'],
```

Create `tests/ui/LocationCard.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Weather } from '../../src/data/weather'
import { LocationCard } from '../../src/ui/LocationCard'
import { testAirports } from '../fixtures/airports'
import { iconNameOf } from '../fixtures/ui'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const NY = 'America/New_York'
const NOW = Date.UTC(2026, 9, 10, 17, 14) // Saturday 10 October: 9:14 AM in Anchorage, 1:14 PM in New York
const cloudy: Weather = { temperature: 41.2, code: 3, isDay: true }

const card = (airport: string | null, weather: Weather | null = null, opts: { h24?: boolean; now?: number } = {}) => (
  <LocationCard airport={airport} now={opts.now ?? NOW} homeTz={NY} h24={opts.h24 ?? false} airports={testAirports} weather={weather} />
)
/** Shows the odometer's final text at once. */
const reduceMotion = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))

describe('LocationCard', () => {
  it('heads the card with a red pin and the city', () => {
    const { container } = render(card('ANC', cloudy))
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Anchorage')
    const pin = container.querySelector('.location-head svg') as SVGElement
    expect(iconNameOf(pin)).toBe('MapPin')
    expect(pin.style.color).toBe('var(--red)')
  })

  it('shows the flag of a country the app has one for, and none in the US', () => {
    const { container, rerender } = render(card('CGN'))
    expect(container.querySelector('.location-flag')!.textContent).toBe('\u{1F1E9}\u{1F1EA}')
    rerender(card('ANC'))
    expect(container.querySelector('.location-flag')).toBeNull()
  })

  it('shows the weather, then credits Open-Meteo in a link that opens a new tab', () => {
    const { container } = render(card('ANC', cloudy))
    const row = container.querySelector('.weather-row')!
    const icon = row.querySelector('svg') as SVGElement
    expect(iconNameOf(icon)).toBe('Cloud')
    expect(icon.style.color).toBe('var(--gray)')
    expect(row.querySelector('.weather-temp')!.textContent).toBe('41°')
    expect(row.querySelector('.weather-words')!.textContent).toBe('Cloudy')
    const credit = screen.getByRole('link', { name: 'Weather: Open-Meteo' })
    expect(credit.getAttribute('href')).toBe('https://open-meteo.com/')
    expect(credit.getAttribute('target')).toBe('_blank')
    expect(credit.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('shows a moon for a clear night', () => {
    const { container } = render(card('LEX', { temperature: 58, code: 0, isDay: false }))
    const icon = container.querySelector('.weather-row svg') as SVGElement
    expect(iconNameOf(icon)).toBe('Moon')
    expect(icon.style.color).toBe('var(--indigo)')
  })

  it('shows a plane and the airport code while there’s no weather', () => {
    const { container } = render(card('ANC'))
    const row = container.querySelector('.weather-row')!
    expect(row.classList.contains('weather-none')).toBe(true)
    expect(iconNameOf(row.querySelector('svg'))).toBe('Airplane')
    expect(row.textContent).toBe('ANC')
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('shows the pilot’s local time and how far it is from home', () => {
    reduceMotion()
    const { container } = render(card('ANC', cloudy))
    expect(container.querySelector('.time-label')!.textContent).toBe('Current time:')
    expect(container.querySelector('.time-value')!.textContent).toBe('9:14\u202FAM')
    expect(container.querySelector('.time-diff .sr-only')!.textContent).toBe('4 hours behind you')
    expect(container.querySelector('.time-diff [aria-hidden="true"]')!.textContent).toBe('4h behind you')
  })

  it('uses 24-hour time for visitors who use it', () => {
    const { container } = render(card('ANC', cloudy, { h24: true }))
    expect(container.querySelector('.time-value')!.textContent).toBe('09:14')
  })

  it('says "same time as you" in home’s time zone', () => {
    const { container } = render(card('LEX'))
    expect(container.querySelector('.time-diff')!.textContent).toBe('same time as you')
  })

  it('puts the sun dial in the corner, named for the city', () => {
    render(card('ANC', cloudy))
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/^Sunrise .+, sunset .+, daytime in Anchorage$/)
  })

  it('leaves the dial out when the sun neither rises nor sets that day, but keeps the time', () => {
    const { container } = render(card('BRW', null, { now: Date.UTC(2026, 11, 21, 20) })) // Utqiaġvik in midwinter
    expect(container.querySelector('.sun-dial')).toBeNull()
    expect(container.querySelector('.time-value')!.textContent).toBe('11:00\u202FAM')
  })

  it('shows only "Unknown Location" when nobody can tell where the pilot is', () => {
    const { container } = render(card(null, cloudy))
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Unknown Location')
    expect(container.querySelector('.weather-row')).toBeNull()
    expect(container.querySelector('.location-time')).toBeNull()
    expect(container.querySelector('.sun-dial')).toBeNull()
  })

  it('shows an airport missing from the list as its code, with no time or dial', () => {
    const { container } = render(card('XYZ'))
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('XYZ')
    expect(container.querySelector('.weather-row')!.textContent).toBe('XYZ')
    expect(container.querySelector('.location-time')).toBeNull()
    expect(container.querySelector('.sun-dial')).toBeNull()
  })
})
```

In `tests/styles/styles.test.ts`, add this block just before `describe('full-height blocks', …)`:

```ts
describe('location.css', () => {
  const top = blocks(css('location'))

  it('rolls each new hour of the time difference in, with steady digits', () => {
    expect(declarations(find(top, '.time-diff .roll')!.body).find(([prop]) => prop === 'animation')?.[1]).toMatch(/^roll-in\b/)
    expect(declarations(find(top, '.time-diff-num')!.body)).toContainEqual(['font-variant-numeric', 'tabular-nums'])
    expect(declarations(find(top, '.time-value')!.body)).toContainEqual(['font-variant-numeric', 'tabular-nums'])
  })

  it('turns the roll and the minutes’ fade off for people who prefer reduced motion', () => {
    const media = find(top, '@media (prefers-reduced-motion: reduce)')
    expect(media).toBeDefined()
    const inside = blocks(media!.body)
    expect(declarations(find(inside, '.time-diff .roll')!.body)).toContainEqual(['animation', 'none'])
    expect(declarations(find(inside, '.time-diff-minutes')!.body)).toContainEqual(['transition', 'none'])
  })
})
```

- [x] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/ui/LocationCard.test.tsx tests/styles/styles.test.ts`
Expected: FAIL. The card test can't find `'../../src/ui/LocationCard'`, and the styles test can't read `src/styles/location.css`.

- [x] **Step 3: Implement**

Create `src/ui/LocationCard.tsx`:

```tsx
import { countryFlag } from '../copy/flags'
import { shortTimeText } from '../copy/format'
import { timeDifference } from '../copy/location'
import { temperatureText, weatherVisual } from '../copy/weather'
import type { AirportIndex } from '../data/airports'
import type { Weather } from '../data/weather'
import type { Snapshot } from '../engine/snapshot'
import { sunTimes } from '../time/sun'
import { cssColor } from './colors'
import { Icon } from './Icon'
import { SunDial } from './SunDial'
import { TimeDifferenceLine } from './TimeDifferenceLine'

/** The app shows the location card in every status but flying, where Part C's map will go (slice 2B1 §3). */
export function showsLocationCard(snap: Snapshot): boolean {
  return snap.status.kind !== 'inFlight'
}

export interface LocationCardProps {
  /** Where the pilot is: the snapshot's status.airport, or null when it can't be told. */
  airport: string | null
  now: number
  /** The family's time zone, for "ahead of you" and "behind you". */
  homeTz: string
  h24: boolean
  airports: AirportIndex
  weather: Weather | null
}

/**
 * LocationCardView's standard view (slice 2B1 §4): the city and flag, the weather, the local time and how far it is
 * from home's, with the sun dial in the upper right. With no airport it's just "Unknown Location", as in the app.
 */
export function LocationCard({ airport, now, homeTz, h24, airports, weather }: LocationCardProps) {
  const info = airports.get(airport)
  const city = airports.city(airport) ?? 'Unknown Location'
  const flag = countryFlag(info?.country)
  const tz = airports.tz(airport)
  const sun = info && tz ? sunTimes(now, info.lat, info.lng, tz) : null
  const visual = weather ? weatherVisual(weather.code, weather.isDay) : null
  return (
    <section class="card glass location">
      <div class="location-body">
        <div class="location-head">
          <Icon name="MapPin" size={22} color="var(--red)" />
          <h2 class="location-city">{city}</h2>
          {flag && <span class="location-flag">{flag}</span>}
        </div>
        {airport &&
          (weather && visual ? (
            <>
              <p class="weather-row">
                <Icon name={visual.icon} size={22} color={cssColor(visual.color)} />
                <span class="weather-temp">{temperatureText(weather.temperature)}</span>
                <span class="weather-words">{visual.words}</span>
              </p>
              <p class="weather-credit">
                <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
                  Weather: Open-Meteo
                </a>
              </p>
            </>
          ) : (
            <p class="weather-row weather-none">
              <Icon name="Airplane" size={17} />
              <span>{airport}</span>
            </p>
          ))}
        {tz && (
          <div class="location-time">
            <p class="time-row">
              <Icon name="Clock" size={17} color="var(--blue)" />
              <span class="time-label">Current time:</span>
              <span class="time-value">{shortTimeText(now, tz, h24)}</span>
            </p>
            <TimeDifferenceLine diff={timeDifference(now, tz, homeTz)} />
          </div>
        )}
      </div>
      {sun && tz && <SunDial sun={sun} now={now} timeZone={tz} h24={h24} city={city} />}
    </section>
  )
}
```

Create `src/styles/location.css`:

```css
/* The location card (slice 2B1): city, weather, local time and the time difference, with the 24-hour sun dial in the
   upper right, copied from the Crewluve app's LocationCardView and SunCircleView. */

/* Like the app's ZStack: the text and the dial share one grid cell, the dial on top. 16 px padding, 12 px between rows. */
.location {
  display: grid;
  padding: 16px;
}

.location-body,
.sun-dial {
  grid-area: 1 / 1;
}

.location-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.location-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.location-city {
  margin: 0;
  min-width: 0;
  font-size: 20px;
  line-height: 25px;
  font-weight: 600;
}

.location-flag {
  margin-left: auto;
  font-size: 28px;
  line-height: 34px;
}

/* Weather: the icon, the temperature (20 px bold) and the words (15 px, secondary); the credit 11 px like the app's. */
.weather-row {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.weather-temp {
  font-size: 20px;
  line-height: 25px;
  font-weight: 700;
}

.weather-words,
.weather-none {
  font-size: 15px;
  line-height: 20px;
  color: var(--text-2);
}

.weather-credit {
  margin: 0;
  font-size: 11px;
  line-height: 13px;
}

.weather-credit a {
  color: var(--text-2);
  text-decoration: none;
}

/* Current time: a blue clock, the 15 px label, the 20 px bold blue time with steady digits; the difference 4 px below. */
.location-time {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.time-row {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.time-label {
  font-size: 15px;
  line-height: 20px;
  color: var(--text-2);
}

.time-value {
  font-size: 20px;
  line-height: 25px;
  font-weight: 700;
  color: var(--blue);
  font-variant-numeric: tabular-nums;
}

/* The time difference: 12 px, indented 24 px under the time, numbers semibold in blue (ahead) or orange (behind). */
.time-diff {
  margin: 0 0 0 24px;
  font-size: 12px;
  line-height: 16px;
  color: var(--text-2);
}

.time-diff-num {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.time-diff.ahead .time-diff-num {
  color: var(--blue);
}

.time-diff.behind .time-diff-num {
  color: var(--orange);
}

/* Each new hour rolls in like the app's numeric text; the minutes keep their space while hidden, then fade in. */
.time-diff .roll {
  display: inline-block;
  animation: roll-in 0.12s ease-out;
}

.time-diff-minutes {
  opacity: 0;
  transition: opacity 0.15s ease-out;
}

.time-diff-minutes.shown {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .time-diff .roll {
    animation: none;
  }

  .time-diff-minutes {
    transition: none;
  }
}

/* The sun dial: 160 px like the app's, smaller on narrow phones, 6 px above the padding at the upper right. */
.sun-dial {
  position: relative;
  justify-self: end;
  align-self: start;
  margin-top: -6px;
  width: min(160px, 42vw);
  height: min(160px, 42vw);
  pointer-events: none;
}

/* The sky: the 84 px circle (radius 42, center 2 px below the middle) at 25% opacity. */
.sun-sky {
  position: absolute;
  left: 23.75%;
  top: 25%;
  width: 52.5%;
  height: 52.5%;
  border-radius: 50%;
  opacity: 0.25;
}

.sun-dial svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.sun-day-end {
  stop-color: var(--orange);
}

.sun-day-middle {
  stop-color: var(--yellow);
}

.sun-night-end {
  stop-color: var(--blue);
  stop-opacity: 0.5;
}

.sun-night-middle {
  stop-color: var(--gray);
  stop-opacity: 0.4;
}

.sun-day {
  fill: none;
  stroke-width: 2.5;
}

.sun-night {
  fill: none;
  stroke-width: 2;
  stroke-dasharray: 4 3;
}

/* Glow bands: 2.5 × the daylight arc's width, round ends. */
.sun-band {
  fill: none;
  stroke-width: 6.25;
  stroke-linecap: round;
}

.sun-band.golden {
  stroke: var(--orange);
  opacity: 0.35;
}

.sun-band.twilight {
  stroke: var(--blue);
  opacity: 0.25;
}

.sun-tick {
  stroke: var(--text);
  stroke-opacity: 0.5;
  stroke-width: 1.5;
}

.sun-marker {
  fill: var(--text);
  fill-opacity: 0.4;
}

.sun-hand {
  stroke: var(--text);
  stroke-opacity: 0.2;
  stroke-width: 1;
}

.sun-now.day {
  color: var(--yellow);
}

.sun-now.night {
  color: var(--text-2);
}

.sun-glow {
  flood-color: var(--orange);
  flood-opacity: 0.5;
}

.sun-dial text {
  font-family: var(--font);
  text-anchor: middle;
  dominant-baseline: central;
}

.sun-noon {
  font-size: 8px;
  fill: var(--text-2);
}

.sun-time {
  font-size: 9px;
  font-weight: 500;
  fill: var(--text);
}
```

In `src/main.tsx`, import it after trips.css:

```ts
import './styles/trips.css'
import './styles/location.css'
```

The `roll-in` keyframes the odometer uses already live in cards.css.

- [x] **Step 4: Run them and watch them pass**

Run: `npx vitest run tests/ui/LocationCard.test.tsx tests/styles/styles.test.ts`
Expected: PASS. The card test has 12 tests. The styles test's "imports every stylesheet" check now covers location.css too.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/ui/LocationCard.tsx src/styles/location.css src/main.tsx tests/ui/LocationCard.test.tsx tests/styles/styles.test.ts tests/fixtures/airports.ts
git commit -m "Location card: city and flag, weather, local time and the sun dial (slice 2B1 §4, §5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Put the card on the screen

**Files:**
- Modify: `src/ui/StatusScreen.tsx`, `src/ui/ScheduleScreen.tsx`
- Test: `tests/ui/StatusScreen.test.tsx`, `tests/ui/ScheduleScreen.test.tsx`

- [x] **Step 1: Write the failing tests**

In `tests/ui/StatusScreen.test.tsx`, replace the imports of `demoRaw`, `Leg` and the snapshot functions with these five lines:

```ts
import { demoRaw, demoRawForScene, DEMO_SCENES, type DemoScene } from '../../src/data/demo'
import type { Weather } from '../../src/data/weather'
import { buildLegs, type Leg } from '../../src/engine/legs'
import { buildSchedule } from '../../src/engine/normalize'
import { makeSnapshot, safeSnapshot, type Snapshot } from '../../src/engine/snapshot'
```

Both helpers that render `StatusScreen` (in `screenAt`, and in `screenWith` inside the slice 2A block) get the new prop: add `weather={null}` after `airports={testAirports}`.

Then add these two blocks at the end of the file:

```tsx
describe('StatusScreen location card (slice 2B1)', () => {
  const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING
  const withWeather = (minutes: number, weather: Weather | null) => {
    const now = at(minutes)
    return (
      <StatusScreen snap={makeSnapshot(e.schedule, e.legs, now, NY)} now={now} viewerTz={NY} homeTz={NY} h24={false} airports={testAirports}
        weather={weather} demo={false} celebrateKey={0} footer={footer(now)} />
    )
  }

  it('sits after the countdown and the been-home pill, and before the trip card', () => {
    const { container } = renderAt(-1440)
    const location = container.querySelector('.location')!
    expect(container.querySelector('.countdown')!.compareDocumentPosition(location) & FOLLOWING).toBeTruthy()
    expect(container.querySelector('.pill')!.compareDocumentPosition(location) & FOLLOWING).toBeTruthy()
    expect(location.compareDocumentPosition(container.querySelector('.trip-card')!) & FOLLOWING).toBeTruthy()
  })

  it('shows where the pilot is, with the weather it is given', () => {
    const { container } = render(withWeather(180, { temperature: 61, code: 3, isDay: true }))
    expect(screen.getByRole('heading', { level: 2, name: 'Rockford' })).toBeTruthy()
    expect(container.querySelector('.weather-temp')!.textContent).toBe('61°')
  })

  it('is hidden while the pilot is flying', () => {
    const { container } = renderAt(100)
    expect(container.querySelector('.location')).toBeNull()
  })

  it('reads "Unknown Location" when the engine can’t tell where the pilot is', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const unknown = safeSnapshot(e.schedule, null as unknown as Leg[], at(0), NY)
    renderAt(0, unknown)
    expect(screen.getByRole('heading', { level: 2, name: 'Unknown Location' })).toBeTruthy()
    error.mockRestore()
  })
})

describe('the location card in each demo scene', () => {
  const NOW = Date.UTC(2026, 9, 20, 16, 0)
  const CITY: Record<DemoScene, string | null> = {
    home: 'Lexington',
    'driving-to-work': 'Lexington',
    base: 'Louisville',
    flying: null,
    turn: 'Rockford',
    layover: 'Miami',
    delayed: 'Anchorage',
    'last-leg': null,
    'driving-home': 'Louisville',
    'commuting-home': 'Louisville',
    reserve: 'Louisville',
    training: 'Louisville',
  }

  it.each(Object.keys(DEMO_SCENES) as DemoScene[])('%s', (scene) => {
    const schedule = buildSchedule(demoRawForScene(scene, NOW), NOW)
    const snap = makeSnapshot(schedule, buildLegs(schedule), NOW, NY)
    const { container } = render(
      <StatusScreen snap={snap} now={NOW} viewerTz={NY} homeTz={NY} h24={false} airports={testAirports} weather={null} demo celebrateKey={0}
        footer={footer(NOW)} />,
    )
    expect(container.querySelector('.location-city')?.textContent ?? null).toBe(CITY[scene])
  })
})
```

In `tests/ui/ScheduleScreen.test.tsx`, add this import after the `RawSchedule` import:

```ts
import { tempUnitFor, type WeatherLoader } from '../../src/data/weather'
```

Then add this block at the end of the file:

```tsx
describe('ScheduleScreen location card (slice 2B1)', () => {
  it('asks for the weather where the pilot is, and shows it', async () => {
    const load = vi.fn<WeatherLoader>(async () => ({ temperature: 41, code: 3, isDay: true }))
    render(<ScheduleScreen schedule={handle(demoRawForScene('delayed', NOW))} airports={testAirports} demo={false} onSignOut={() => {}} loadWeather={load} />)
    expect(await screen.findByText('41°')).toBeTruthy()
    expect(load).toHaveBeenCalledWith({ code: 'ANC', lat: 61.1744, lng: -149.9983, tz: 'America/Anchorage', unit: tempUnitFor() })
  })

  it('asks for no weather while the pilot is flying', async () => {
    const load = vi.fn<WeatherLoader>(async () => null)
    const { container } = render(
      <ScheduleScreen schedule={handle(demoRawForScene('flying', NOW))} airports={testAirports} demo={false} onSignOut={() => {}} loadWeather={load} />,
    )
    await act(async () => {})
    expect(load).not.toHaveBeenCalled()
    expect(container.querySelector('.location')).toBeNull()
  })

  it('shows the demo’s made-up weather without touching the network', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    render(<ScheduleScreen schedule={handle(demoRawForScene('delayed', NOW))} airports={testAirports} demo onSignOut={() => {}} />)
    expect(await screen.findByText('Cloudy')).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('asks Open-Meteo when live', async () => {
    const fetch = vi.fn(async (_url: string) => ({ ok: true, json: async () => ({ current: { temperature_2m: 41, weather_code: 3, is_day: 1 } }) }))
    vi.stubGlobal('fetch', fetch)
    render(<ScheduleScreen schedule={handle(demoRawForScene('delayed', NOW))} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(await screen.findByText('41°')).toBeTruthy()
    expect(fetch.mock.calls[0][0]).toMatch(/^https:\/\/api\.open-meteo\.com\/v1\/forecast\?latitude=61\.17&longitude=-150\.00&/)
  })
})
```

- [x] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/ui/StatusScreen.test.tsx tests/ui/ScheduleScreen.test.tsx`
Expected: FAIL. No `.location` card renders, so the placement, scene and weather tests fail.

- [x] **Step 3: Implement**

In `src/ui/StatusScreen.tsx`:

1. Add `import type { Weather } from '../data/weather'` after the `AirportIndex` import, and `import { LocationCard, showsLocationCard } from './LocationCard'` after the `Footer` import.
2. Add the prop to `StatusScreenProps`, after `airports`:

```ts
  /** The location card's weather (slice 2B1 §6), or null while it loads or when there's none. */
  weather: Weather | null
```

3. Update the component's doc comment:

```ts
/** The top of Crewluve's main screen, in its card order (spec §4.4; the location card, slice 2B1 §3; the trip cards, slice 2A §3). */
```

4. Place the card between the home or away cards and the upcoming trip card:

```tsx
      {snap.status.kind === 'home' ? <HomeCards {...p} /> : <AwayCard {...p} />}
      {showsLocationCard(snap) && (
        <LocationCard airport={snap.status.airport} now={p.now} homeTz={p.homeTz} h24={p.h24} airports={p.airports} weather={p.weather} />
      )}
      {snap.upcomingTrip && (
```

Replace `src/ui/ScheduleScreen.tsx` with the version below. It works the snapshot out before the early return, so it can ask for the weather on every render: hooks have to run in the same order each time. The default loader is the demo's samples in the demo and Open-Meteo otherwise. Tests pass their own.

```tsx
import { useMemo } from 'preact/hooks'
import type { AirportIndex } from '../data/airports'
import { loadDemoWeather } from '../data/demoWeather'
import { loadLiveWeather, tempUnitFor, type TempUnit, type WeatherLoader, type WeatherPlace } from '../data/weather'
import { buildLegs, type Leg } from '../engine/legs'
import { buildSchedule } from '../engine/normalize'
import { safeSnapshot, type Snapshot } from '../engine/snapshot'
import type { Schedule } from '../engine/types'
import { prefers24Hour, viewerTimeZone } from '../time/zoned'
import { EmptyState } from './EmptyState'
import { Footer, type FooterProps } from './Footer'
import type { ScheduleHandle } from './hooks/useSchedule'
import { useNow } from './hooks/useNow'
import { useVisibilityCount } from './hooks/useVisibilityCount'
import { useWeather } from './hooks/useWeather'
import { showsLocationCard } from './LocationCard'
import { StatusScreen } from './StatusScreen'
import { Title } from './Title'

export interface ScheduleScreenProps {
  schedule: ScheduleHandle
  airports: AirportIndex
  demo: boolean
  onSignOut: () => void
  /** Where the location card's weather comes from: Open-Meteo, or the made-up samples in the demo. Tests pass a fake. */
  loadWeather?: WeatherLoader
}

/** Rebuilds the schedule when new rows arrive, and the snapshot every second. */
export function ScheduleScreen({ schedule, airports, demo, onSignOut, loadWeather = demo ? loadDemoWeather : loadLiveWeather }: ScheduleScreenProps) {
  const now = useNow()
  const celebrateKey = useVisibilityCount()
  const viewerTz = useMemo(() => viewerTimeZone(), [])
  const h24 = useMemo(() => prefers24Hour(), [])
  const unit = useMemo(() => tempUnitFor(), [])
  const built = useMemo<{ s: Schedule; legs: Leg[] } | null>(() => {
    if (!schedule.raw) return null
    try {
      const s = buildSchedule(schedule.raw, Date.now())
      return { s, legs: buildLegs(s) }
    } catch (err) {
      console.error('Could not read the schedule', err)
      return null
    }
  }, [schedule.raw])

  const footer: FooterProps = {
    now,
    lastSuccessAt: schedule.lastSuccessAt,
    newestUpdatedAt: schedule.raw?.newestUpdatedAt ?? null,
    problem: schedule.problem,
    refreshing: schedule.refreshing,
    onRefresh: schedule.refresh,
    onSignOut,
    signOutLabel: demo ? 'Exit demo' : 'Sign out',
    viewerTz,
    h24,
  }

  const ready = built && !built.s.empty ? built : null
  const homeTz = (ready && airports.tz(ready.s.pilot.effHome)) ?? viewerTz
  const snap = ready ? safeSnapshot(ready.s, ready.legs, now, airports.tz(ready.s.pilot.base) ?? viewerTz) : null
  // Asked for before the early return below, so the hooks run in the same order on every render.
  const weather = useWeather(weatherPlace(snap, airports, unit), loadWeather)

  if (!snap) {
    return (
      <main class="screen">
        <Title text="CrewLuve" />
        {built?.s.empty && <EmptyState />}
        <Footer {...footer} />
      </main>
    )
  }

  return (
    <StatusScreen snap={snap} now={now} viewerTz={viewerTz} homeTz={homeTz} h24={h24} airports={airports} weather={weather} demo={demo}
      celebrateKey={celebrateKey} footer={footer} />
  )
}

/** The airport whose weather the location card shows, or null when the card is hidden or the airport isn't in the list. */
function weatherPlace(snap: Snapshot | null, airports: AirportIndex, unit: TempUnit): WeatherPlace | null {
  const airport = snap && showsLocationCard(snap) ? airports.get(snap.status.airport) : undefined
  return airport ? { code: airport.iata, lat: airport.lat, lng: airport.lng, tz: airports.tz(airport.iata), unit } : null
}
```

`Root.tsx` needs no change: it already tells `ScheduleScreen` whether this is the demo.

- [x] **Step 4: Run them and watch them pass**

Run: `npx vitest run tests/ui/StatusScreen.test.tsx tests/ui/ScheduleScreen.test.tsx`
Expected: PASS. Every demo scene shows the city its status says, and none in flight.

- [x] **Step 5: Run the gates and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/ui/StatusScreen.tsx src/ui/ScheduleScreen.tsx tests/ui/StatusScreen.test.tsx tests/ui/ScheduleScreen.test.tsx
git commit -m "Location card on the screen: after the countdowns, hidden in flight, weather from the right source (slice 2B1 §3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Let the page reach Open-Meteo

**Files:**
- Modify: `vite.config.ts`
- Test: `tests/viteConfig.test.ts`

- [x] **Step 1: Write the failing test**

In `tests/viteConfig.test.ts`, replace the last test with:

```ts
  it('lets the app reach the CrewLu Cloud project the client uses, and Open-Meteo for the weather, and nothing else', () => {
    expect(injectCsp('<!--csp-->')).toContain(`connect-src 'self' ${SUPABASE_URL} https://api.open-meteo.com;`)
  })
```

The address is written out in the test, not imported, so a change to the constant can't pass unnoticed.

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/viteConfig.test.ts`
Expected: FAIL. The policy still ends `connect-src` with the CrewLu Cloud address.

- [x] **Step 3: Implement**

In `vite.config.ts`, add `import { OPEN_METEO_URL } from './src/data/weather'` after the `SUPABASE_URL` import. Replace the comment above `const CSP` with:

```ts
// Production Content-Security-Policy (spec §9). Injected only into the built HTML, because the
// Vite dev server needs inline scripts and a websocket for hot reload. connect-src allows CrewLu Cloud
// and, for the location card's weather, Open-Meteo (slice 2B1 §7).
```

Then change the `connect-src` line to:

```ts
  `connect-src 'self' ${SUPABASE_URL} ${OPEN_METEO_URL}`,
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/viteConfig.test.ts`
Expected: PASS, 5 tests.

- [x] **Step 5: Run the gates, check the built page and commit**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

Then confirm the built page carries the new policy:

```bash
grep -o "connect-src[^;]*" dist/index.html
```

Expected: `connect-src 'self' https://corxvurxpnrzekbxdgye.supabase.co https://api.open-meteo.com`.

```bash
git add vite.config.ts tests/viteConfig.test.ts
git commit -m "CSP: allow Open-Meteo for the weather, and nothing else (slice 2B1 §7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Visual check with the user (controller)

**Files:**
- Modify (only if nudges are needed): `src/styles/location.css`

- [x] **Step 1: Build and open the preview**

Run `npm run build`, then start or reuse the `crewluve-preview` server from `.claude/launch.json` (port 5181) in the browser pane.

- [x] **Step 2: Screenshot the demo scenes**

At the mobile preset (375 × 812), in light and dark, open `/?demo=1&scene=` with `delayed` (Anchorage, 41° Cloudy), `home` (Lexington, same time as you), `layover` (Miami, Partly Cloudy) and `flying` (no card). The weather's day or night follows the real time of day at each airport.

- [x] **Step 3: Compare with the app**

Compare each screenshot with `standardLocationView` and `SunCircleView` in `PilotStatusView.swift`. Check:
- the text sizes and weights: city 20 px semibold, temperature 20 px bold, time 20 px bold blue, difference 12 px;
- the 16 px padding and 12 px gaps;
- the dial at 160 px, 6 px above the padding at the upper right;
- the sky, the arcs, the glow bands, the ticks, the triangles and the labels;
- that the odometer counts up once the page is visible.

Fix any differences in `location.css`, then take the screenshots again.

- [x] **Step 4: Check narrow phones**

At 320 px wide, check that nothing scrolls sideways and the dial shrinks. The scratch build showed two overlaps that the app shares at these widths:
- the sunrise label can touch long weather words ("Partly Cloudy") at 375 px;
- it can touch the city name at 320 px.

Show them to the user in Step 5 rather than changing the layout on our own.

- [x] **Step 5: Ask the user to sign off**

Show the user the screenshots and ask one question: "Looks right (Recommended)" or "Change something". Apply their notes, then show them again.

- [ ] **Step 6: Check live weather**

After release, the user signs in on the live site; never type their credentials. With the pilot on the ground, the card shows Open-Meteo's weather. Check `read_network_requests` for a single request to `api.open-meteo.com`, and run `read_console_messages` with `onlyErrors: true`.

- [ ] **Step 7: Run the gates and commit any nudges**

Run: `npx vitest run`, `npx tsc --noEmit` and `npm run build`. All three must pass.

```bash
git add src/styles/location.css
git commit -m "Location card: visual nudges from the side-by-side check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Merge and release (controller, asks first)

- [ ] **Step 1: Final review**

Run a final whole-branch code review of `main..slice2b1`, and fix what it raises test-first.

- [ ] **Step 2: Merge**

Use superpowers:finishing-a-development-branch. Ask the user one question about how to merge `slice2b1` into `main`.

- [ ] **Step 3: Release, only with a fresh yes**

Ask before pushing `main`; the push redeploys crewluve.crewlu.net. After the "Deploy to GitHub Pages" run succeeds, open https://crewluve.crewlu.net/?demo=1&scene=delayed and `…&scene=flying`. Confirm the card in the first and none in the second, with no console errors, and that the demo made no request to Open-Meteo.

- [ ] **Step 4: Update the memory**

Update the project memory with the new tip and what's next: Part B2, the sun dial popup.

---

## Done when

- `npx vitest run`, `npx tsc --noEmit` and `npm run build` are all green.
- Every demo scene shows or hides the card as the spec says (Task 14), and the user has signed off on the look (Task 16).
- The card is live on crewluve.crewlu.net, released with the user's yes (Task 17), and the live site shows real weather.

## Spec coverage

| Spec section | Tasks |
|---|---|
| §2 Split, the dial not tappable until B2 | Nothing to build: no task adds a tap or the popup. |
| §3 Where the card goes and when it shows | 13 (`showsLocationCard`, "Unknown Location"), 14 (placement, scenes) |
| §4 The card: header, flag, weather row and its fallback, current time, time difference and odometer | 2 (clock), 3 (difference), 6 (weather words), 8 (flags), 12 (odometer), 13 (card) |
| §5 The sun dial | 2 (labels), 3 (screen-reader label), 10 (geometry), 11 (dial), 13 (styles, polar days) |
| §6 Data: sun times, weather request, units, parsing, freshness, codes, colors, icons, time difference, demo | 1, 3, 4, 5, 6, 7, 9 |
| §7 Security and privacy | 5 (plain GET, no cookies or referrer, the read-only scan), 7 (demo offline), 14 (the demo or live loader), 15 (CSP) |
| §8 Deliberate differences | 1 (1), 5–6 (2), 2 and 11 (3), 12 (4), 13 (5: no quick status), 13–14 (6), 11 (7), 3 (8), 13 (9: ground transport, pinned by the `showsLocationCard` test) |
| §9 Testing | Every task, then 16 |

## Execution notes

(Add notes here as the build goes: where the code had to differ from a printed block, and why.)

- **Build (2026-10-11):** the user chose "I build, helpers review". The controller built Tasks 1–15 test-first from the printed blocks, in commits `d8daf16` through `02d2714`. The code matches the blocks exactly, and the suite ends at 1352 tests in 59 files.
  - **One wording difference:** in the `.tsx` tests (Tasks 9, 11, 12 and 13), a missing module fails with `Failed to resolve import "…" … Does the file exist?` instead of `Cannot find module`. It's the same failure.
- **Hidden characters:** several printed test blocks held the narrow no-break space (U+202F) as a raw, invisible character. The code and this file now write it as the visible escape `\u202F`. It's the same string at runtime (`6edd855`, `2a9aa05`).
- **Reviews:** fresh helpers reviewed Batch A. Auto mode then blocked the two new reviewer launches for Batch B ("Auto-Mode Bypass"). The user chose to send Batches B, C and D to the Batch A reviewers by message instead.
- **Batch A spec review fixes.** The code matched the plan; these points came from the spec:
  - `1ffe81c`: WeatherKit's words are "Fog" and "Thunderstorm", not "Foggy" and "Thunderstorms". Temperatures round like the app's format: halves go to the even number (40.5 shows 40°), and just below zero shows "-0°".
  - `3b77f9c`: Apple's Fahrenheit regions are US, PR, BS, BZ, KY and PW, replacing the spec's first list. The request adds `cache: 'no-store'`, and a test covers the browser-language default.
  - `640d085`: the spec records all of these, plus what Open-Meteo sees: the browser's own headers go with the request too.
- **Batch A code review fixes.** Verdict: with fixes, nothing critical.
  - `650d3c6`: the weather request gives up after 10 seconds (`WEATHER_TIMEOUT_MS`). Without that, one stalled request would have held up that airport's refreshes for good, because the hook skips a refresh while one is pending. The test now pins the exact request options, and both units go through `loadLiveWeather`.
  - `3cfa7c5`: southern-hemisphere sun rows (Sydney in summer and winter, São Paulo), and a check that one local day gives exactly one answer. The 2-minute allowance stays, as the spec says.
  - `6edd855`: `timeDifferenceText` is gone; nothing used it, and `TimeDifferenceLine` draws that wording. Also added: a test for "behind" with leftover minutes, and a note on sharing `delayText`.
  - `619c6cc`: one private `clock()` helper behind `clockText`, `shortTimeText` and `dialTimeText`.
- **Batch B spec review:** compliant. Its notes became `1d06b88`:
  - The hook redraws when an answer lands for the airport on screen, even one the visitor left and came back to.
  - The comment about `load` is now accurate.
  - A new test covers going back to an airport after 15 minutes.
- **Batch B code review:** verdict "with fixes (one test)". It also confirmed that every Batch A fix holds. Its points became:
  - `3552b8a`: a test for a night longer than 12 hours, the Important item. Also tests for short-day twilight and the navy after a sunset just before 6 pm. `pointAt` now rounds every coordinate, and `arcPath` the radius.
  - `017f1e8`, for the hook:
    - The 15-minute tick fetches weather at least 14 minutes old (`TICK_GRACE_MS`) instead of always. A return to the page at minute 29 is no longer followed by another fetch at minute 30.
    - The loader runs inside a promise's executor, so an instant throw counts as a failure.
    - New tests: a new but equal place on every render, as the screen passes it, and leaving the page.
  - `bbbfd62`: a test for a stalled reply body, the 10-second value pinned, and the rounding comment corrected (halves go away from zero).
  - `f20f036`: the sun and moon icon sizes and the Noon label's position are pinned.
  - Not taken: lazy initial values for the hook's refs. They would save one small allocation a second.
- **Batch C spec review:** "Issues found": two CSS points, neither a departure from the spec, both fixed below. The reviewer rendered the app's own SunCircleView and card layout with SwiftUI, beside the site's in WebKit, and found them aligned to about a pixel. Its points became `1c6c979`:
  - The style rule for the dial's drawing is now `.sun-dial > svg`. `.sun-dial svg` also matched the sun or moon icon nested inside, which Firefox may stretch to the whole box.
  - The dial is lifted with `top: -6px` instead of a margin, so the card keeps the app's height: 192 px plus the border, where it had been 6 px shorter.
  - A polar-day case joins the polar-night one.
  - It also noted that the card shows during ground transport, where the app shows its in-flight map. That follows slice 1's decision to give ground legs their own status, so it's recorded as spec §8 item 9 and not changed.
- **Batch C code review:** verdict "with fixes (tests only)". It also confirmed every Batch B fix holds, and that the dial's inline sky style and its `url(#…)` ids work under the real CSP. Its points became:
  - `57e3f46`:
    - The icon's corner is rounded after subtracting (`cornerFor`).
    - The credit link has hidden words, "(opens in a new tab)".
    - `TICK_GRACE_MS` is exported and tested against `WEATHER_TIMEOUT_MS`.
    - The card's icon sizes are pinned.
  - `0f6c16a`:
    - The reviewer's tests for the dial's wiring: the sky, labels, ticks, triangles, bands, hand, icon and ids. Nine wiring mistakes used to pass, among them a swapped sky and swapped labels.
    - Tests for the odometer's timing, a fresh roll for each hour, and a count that holds steady.
    - Style tests for the number colors, the 24 px indent and `pointer-events: none`, and a check of the sky circle against `DIAL`.
  - Ground transport was already pinned in `baacc21`.
- **Batch D spec review:** compliant. The reviewer ran the built site in WebKit with its real CSP. In the demo scenes the only request was `/data/airports.json`: no Open-Meteo call and no CSP violation. Its doc notes led to rows 8–10 of spec §10, a corrected row 2, item 9 in the coverage table, and a `showsLocationCard` test for every status.
- **Batch D code review:** "Ready to merge: Yes", with nothing Critical or Important. It checked in a real browser, under the production CSP, that:
  - the demo makes no Open-Meteo call;
  - a GET with the site's exact options gets an answer from Open-Meteo;
  - any other host is blocked.
  It also confirmed every Batch C fix holds. Its three suggested tests became one commit (see `git log`):
  - with an empty schedule, the weather stops refreshing, which pins the hook's place before the early return;
  - the difference is measured from home, not from the visitor's zone;
  - the card honors 24-hour time.
  - Not taken: moving `weatherPlace` next to `showsLocationCard`. It works where it is.
- **Final whole-branch review:** "Ready to merge? Yes", with nothing Critical or Important.
  - It ran the live path against Open-Meteo for ANC, CGN and HKG in both units, and the demo in WebKit under the real CSP.
  - The suite passes unchanged under `TZ=Pacific/Kiritimati` in German and `TZ=America/Adak` in British English.
  - Its two behavior points became `990315d` and `e573407`:
    - A visible page now checks once a minute and fetches when the weather turns 15 minutes old. The old 15-minute timer, anchored where the airport was set, could leave weather about 29 minutes old. `TICK_GRACE_MS` is gone.
    - The weather icon takes day or night from the card's sun times, so it always agrees with the dial. Open-Meteo's `is_day` is the fallback in polar day or night.
  - Its doc points: spec §6 (freshness, older browsers' rounding, day or night), §8 items 10–11, §10 rows 9 and 11, §11 (the card's small text joins the high-contrast follow-up), the test count, a pointer before Task 1, and Task 14 in the coverage table.
- **Task 16 (2026-10-11):** the user signed off on the look ("Looks right") from five screenshots: Anchorage by day and at night, home in Lexington at night, Miami in dark mode, and a 320 px phone. They chose to keep the app's two narrow-phone overlaps. Step 6, live weather, waits until after release.
