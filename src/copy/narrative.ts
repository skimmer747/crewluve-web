import type { AirportIndex } from '../data/airports'
import { arrivalOf, type DriveLeg, type DutyLeg, type MoveLeg } from '../engine/legs'
import type { Snapshot } from '../engine/snapshot'
import { flightPhrase } from './airlines'
import { delayText, narrativeCountdown, timeWithZone } from './format'

export type SpanColor = 'status' | 'green' | 'red'

export interface Span {
  text: string
  bold?: boolean
  /** 'status' means the status color from statusVisual(). */
  color?: SpanColor
  /** Countdown digits: tabular figures and a roll-in when they change. */
  digits?: boolean
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
    this.spans.push({ text: narrativeCountdown(target - this.ctx.now), bold: true, color, digits: true })
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
      if (next && delay) {
        return n.t(`${name} ${early ? 'is pushing early' : 'is delayed'} in `).b(city(next.dep))
          .t(` and will be ${next.deadhead ? 'riding' : 'flying'} to `).b(city(next.arr))
          .t(`${flightPhrase(next.airline, next.number)} — departing in `).cd(next.start, changed).t('.').spans
      }
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
    console.error('Narrative failed; showing "On duty"', err)
    return [{ text: 'On duty' }]
  }
}

// Replaced with the full Home templates in Task 16.
function homeSentence(s: Snapshot, n: Sentence, _city: (code: string) => string) {
  return n.t(`${s.name} is home and relaxing.`).spans
}
