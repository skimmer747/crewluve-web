import { readFileSync } from 'node:fs'

export const PARTNER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
export const PARTNER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

/** CrewLu's nine example moments (tests/fixtures/partner-status/README.md). */
export const EXAMPLES = [
  'commuting-home', 'display-names', 'hidden-trip-left-out', 'home', 'in-flight', 'layover', 'quick-status-everyone',
  'quick-status-one-partner', 'turn',
] as const

/** One example summary, as partner_view gives it to partner A or B. A fresh copy each call, so a test can change it. */
export function example(name: string, partner: 'A' | 'B' = 'A'): Record<string, unknown> {
  return JSON.parse(readFileSync(new URL(`./partner-status/${name}.${partner}.json`, import.meta.url), 'utf8'))
}
