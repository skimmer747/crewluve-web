import type { AirportIndex } from '../data/airports'
import { arrivalOf, type DriveLeg, type DutyLeg, type MoveLeg } from '../engine/legs'
import { DELAY_THRESHOLD_MIN, type Snapshot } from '../engine/snapshot'
import { reportOnce } from '../reportOnce'
import { flightPhrase } from './airlines'
import { daysText, delayText, departureText, longDateTimeText, narrativeCountdown, spokenDuration, timeWithZone } from './format'

export type SpanColor = 'status' | 'green' | 'red'

export interface Span {
  text: string
  bold?: boolean
  /** 'status' means the status color from statusVisual(). */
  color?: SpanColor
  /** Countdown digits: tabular figures and a roll-in when they change. */
  digits?: boolean
  /** The countdown in words, read by screen readers in place of the digits. */
  spoken?: string
}

export interface NarrativeCtx {
  now: number
  viewerTz: string
  h24: boolean
  airports: AirportIndex
}

/** Builds one sentence out of plain, bold, and countdown spans. */
export class Sentence {
  readonly spans: Span[] = []
  constructor(readonly ctx: NarrativeCtx) {}

  t(text: string): this {
    this.spans.push({ text })
    return this
  }

  b(text: string): this {
    this.spans.push({ text, bold: true })
    return this
  }

  cd(target: number, color: SpanColor = 'status'): this {
    const left = target - this.ctx.now
    this.spans.push({ text: narrativeCountdown(left), bold: true, color, digits: true, spoken: spokenDuration(left) })
    return this
  }

  time(ms: number): this {
    return this.b(timeWithZone(ms, this.ctx.viewerTz, this.ctx.h24))
  }
}

/** Crewluve's narrative card sentence for this snapshot (NarrativeCardView.swift; spec §4.3). */
export function narrative(s: Snapshot, ctx: NarrativeCtx): Span[] {
  const n = new Sentence(ctx)
  const city = (code: string) => ctx.airports.city(code) ?? code
  const name = s.name
  const here = s.status.airport ? city(s.status.airport) : null
  const next = s.nextMove
  const delay = s.delay
  const early = delay != null && delay.minutes < 0
  const changed: SpanColor = early ? 'green' : 'red'
  /**
   * Waiting out a delayed or early departure, at base or somewhere else. The site shows this whenever the next departure is
   * 15 minutes or more off schedule, however far ahead it is; the app shows its version only from the scheduled time on.
   */
  const departing = (m: MoveLeg) =>
    n.t(`${name} ${early ? 'is pushing early' : 'is delayed'} in `).b(city(m.dep))
      .t(` and will be ${m.deadhead ? 'riding' : 'flying'} to `).b(city(m.arr))
      .t(`${flightPhrase(m.airline, m.number)} — departing in `).cd(m.start, changed).t('.').spans

  switch (s.status.kind) {
    case 'home':
      return homeSentence(s, n, city)

    case 'commutingHome':
      if (!next) return n.t(`${name} is heading home`).spans
      return n.t(`${name} has one more leg home from `).b(city(next.dep)).t(' to ').b(city(next.arr))
        .t('! It leaves in ').cd(next.start).t(' at ').time(next.start).t(' and lands at ').time(next.end).t('.').spans

    case 'drivingHome': {
      const d = s.status.current as DriveLeg
      return n.t(`${name} is driving home to `).b(city(d.to)).t(' — back in ').cd(d.end, 'green').t(' at ').time(d.end).t('.').spans
    }

    case 'drivingToWork': {
      const d = s.status.current as DriveLeg
      return n.t(`${name} is driving to work in `).b(city(d.to)).t(' — arrives in ').cd(d.end).t(' at ').time(d.end)
        .t(', then the trip starts.').spans
    }

    case 'ground': {
      const g = s.status.current as MoveLeg
      return n.t(`${name} is riding to `).b(city(g.arr)).t(' by ground from ').b(city(g.dep)).t(' — arrives in ').cd(g.end)
        .t(' which is ').time(g.end).t('.').spans
    }

    case 'inFlight': {
      const f = s.status.current as MoveLeg
      const verb = f.deadhead ? 'riding' : 'flying'
      const fl = flightPhrase(f.airline, f.number)
      if (delay) {
        return n.t(`${name} ${early ? 'pushed early' : 'was delayed'} in `).b(city(f.dep)).t(` and is ${verb} to `).b(city(f.arr))
          .t(`${fl} — landing in `).cd(f.end, changed).t(' which is ').time(f.end).t('.').spans
      }
      return n.t(`${name} is ${verb} to `).b(city(f.arr)).t(`${fl} from `).b(city(f.dep)).t(' — landing in ').cd(f.end)
        .t(' which is ').time(f.end).t('.').spans
    }

    case 'turn':
      if (!here) return n.t(`${name} is between flights`).spans
      if (!next) return n.t(`${name} is in `).b(here).t(' between flights').spans
      if (delay) {
        return n.t(`${name} ${early ? 'is pushing early' : 'is delayed'} in `).b(here).t(' — heading to ').b(city(next.arr))
          .t(' in ').cd(next.start, changed).t(' which is ').time(next.start).t('.').spans
      }
      return n.t(`${name} is in `).b(here).t(' — heading to ').b(city(next.arr)).t(' in ').cd(next.start)
        .t(' which is ').time(next.start).t('.').spans

    case 'layover':
      if (next && delay) {
        return n.t(`${name}'s layover has been ${early ? 'shortened' : 'extended'} by `).b(delayText(delay.minutes))
          .t(' and will now fly to ').b(city(next.arr)).t(' in ').cd(next.start, changed).t(' which is ').time(next.start).t('.').spans
      }
      if (!here) return n.t(`${name} is on layover`).spans
      if (!next) return n.t(`${name} is on layover in `).b(here).spans
      return n.t(`${name} is on layover in `).b(here).t(' — flies to ').b(city(next.arr)).t(' in ').cd(next.start)
        .t(' which is ').time(next.start).t('.').spans

    case 'base': {
      const goHome = s.nextHomeTrip
      const goHomeTo = goHome ? arrivalOf(goHome) : null
      if (here && goHome && goHomeTo && (!next || goHome.start < next.start)) {
        return n.t(`${name} is at base in `).b(here).t(' — heads home to ').b(city(goHomeTo)).t(' in ').cd(goHome.start)
          .t(' which is ').time(goHome.start).t('.').spans
      }
      if (next && delay) return departing(next)
      if (!here) return n.t(`${name} is at base`).spans
      if (!next) return n.t(`${name} is at base in `).b(here).spans
      return n.t(`${name} is at base in `).b(here).t(' — flies to ').b(city(next.arr)).t(' in ').cd(next.start)
        .t(' which is ').time(next.start).t('.').spans
    }

    case 'reserve':
    case 'hotStandby': {
      const d = s.status.current as DutyLeg
      const what = s.status.kind === 'reserve' ? 'on reserve' : 'on hot standby'
      if (!here) return n.t(`${name} is ${what}`).spans
      return n.t(`${name} is ${what} in `).b(here).t(' — on call until ').cd(d.end).t(' which is ').time(d.end).t('.').spans
    }

    case 'training':
    case 'event': {
      const d = s.status.current as DutyLeg
      n.t(`${name}: `).b(d.title)
      if (here) n.t(' in ').b(here)
      return n.t(' — finishes in ').cd(d.end).t(' which is ').time(d.end).t('.').spans
    }

    case 'off':
      if (next && delay) return departing(next)
      if (!here) return n.t(`${name} is off duty`).spans
      if (!next) return n.t(`${name} is in `).b(here).spans
      return n.t(`${name} is in `).b(here).t(' — flies to ').b(city(next.arr)).t(' in ').cd(next.start)
        .t(' which is ').time(next.start).t('.').spans

    default:
      return [{ text: 'On duty' }]
  }
}

/** narrative() that can never take the page down. */
export function safeNarrative(s: Snapshot, ctx: NarrativeCtx): Span[] {
  try {
    return narrative(s, ctx)
  } catch (err) {
    reportOnce('Narrative failed; showing "On duty"', err)
    return [{ text: 'On duty' }]
  }
}

/** Home templates (NarrativeCardView.swift:106-171). */
function homeSentence(s: Snapshot, n: Sentence, city: (code: string) => string): Span[] {
  const { name } = s
  const nf = s.nextFlight
  const { now, viewerTz, h24 } = n.ctx

  // Commuter at home with the drive to work logged: tell the work story (no delay suffix, as in the app).
  if (s.driveToWork && nf) {
    return n.t(`${name} is home — heads to base, then on to `).b(city(nf.arr)).t(', departing in ').cd(nf.start)
      .t(' at ').time(nf.start).t('.').spans
  }

  const prev = s.lastTripDays
  const hb = s.homecoming
  // {HB}: ". Back home in {cd} on **Monday October 12th at 8:02pm EDT**."
  const backHome = (homecoming: number) =>
    n.t('. Back home in ').cd(homecoming, 'green').t(' on ').b(longDateTimeText(homecoming, viewerTz, h24)).t('.')

  if (nf) {
    // The commuter wording needs a logged jumpseat from home to the trip's first airport, and {dep} is then that jumpseat's
    // departure (UpcomingTripInfo.swift:67-108). With none logged, no commute is guessed: the first flight's time is used.
    const commute = s.nextCommute
    const dep = departureText((commute ?? nf).start, now, viewerTz, h24)
    const dest = city(nf.arr)
    const goneFor = daysText(s.nextTripDays ?? 1)
    if (prev != null) {
      n.t(`${name} is home after being gone for `).b(daysText(prev)).t('! ')
      if (commute) n.t('Commuting to ').b(city(commute.arr)).t(' then heading to ').b(dest).t(` ${dep}`)
      else n.t('Heading to ').b(dest).t(` ${dep}`)
      if (hb) backHome(hb.time)
      else n.t(' — gone for ').b(goneFor).t('.')
    } else {
      n.t(`${name} is home — `)
      if (commute) n.t('commutes to ').b(city(commute.arr)).t(' then heads to ').b(dest).t(` ${dep}`)
      else n.t('heads to ').b(dest).t(` ${dep}`)
      if (hb) backHome(hb.time)
      else n.t(' and will be gone for ').b(goneFor).t('.')
    }
  } else if (prev != null) {
    n.t(`${name} is home after being gone for `).b(daysText(prev)).t(' and is relaxing.')
  } else {
    n.t(`${name} is home and relaxing.`)
  }

  const delay = s.delay
  if (delay && delay.minutes >= DELAY_THRESHOLD_MIN) {
    n.t(' The flight to ').b(city(delay.flight.arr)).t(' is delayed ').b(delayText(delay.minutes)).t('.')
  }
  return n.spans
}
