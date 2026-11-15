import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { comparisonFor, parseComparisons, timesText } from '../../src/facts/comparisons'

/** The site's copy of the app's comparisons.json. */
const site = parseComparisons(JSON.parse(readFileSync(new URL('../../public/data/comparisons.json', import.meta.url), 'utf8')))

describe('what a distance is like (Stage 2 spec §4.9, §9.2)', () => {
  it('reads the app’s eleven', () => {
    expect(site).toHaveLength(11)
  })

  it('uses the one phrase about once', () => {
    expect(comparisonFor(site, 4_100)).toBe('Like sailing the length of the Nile')
    expect(comparisonFor(site, 2_980)).toBe('Like driving coast to coast')
  })

  it('says twice', () => {
    expect(comparisonFor(site, 600)).toBe('Like rafting the Grand Canyon twice')
  })

  it('says the count from three up', () => {
    expect(comparisonFor(site, 9_800)).toBe('Like driving the Alaska Highway 7 times')
    expect(comparisonFor(site, 200)).toBe('Like sailing the Panama Canal 4 times')
  })

  it('puts the number in the middle for marathons', () => {
    expect(comparisonFor([{ miles: 26.2, one: 'Like running a marathon', many: 'Like running {n} marathons' }], 26.2 * 7)).toBe('Like running 7 marathons')
  })

  it('has none outside one to ten times', () => {
    expect(comparisonFor(site, 10)).toBeNull()
    expect(comparisonFor(site, 300_000)).toBeNull()
  })

  it('has none for a distance that is not a finite number', () => {
    expect(comparisonFor(site, Number.NaN)).toBeNull()
    expect(comparisonFor(site, Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('gives a half to the smaller number', () => {
    const entries = [{ miles: 100, one: 'Once', many: '{n} times' }]
    expect(comparisonFor(entries, 150)).toBe('Once')
    expect(comparisonFor(entries, 151)).toBe('2 times')
  })

  it('breaks a tie by the smaller number, then the earlier entry', () => {
    const entries = [
      { miles: 100, one: 'A once', many: 'A {n}' },
      { miles: 50, one: 'B once', many: 'B {n}' },
      { miles: 100, one: 'C once', many: 'C {n}' },
    ]
    // 200 mi is exactly 2 × A, 4 × B and 2 × C: the smaller number wins, then the earlier entry.
    expect(comparisonFor(entries, 200)).toBe('A 2')
  })

  it('says twice, then “3 times”', () => {
    expect(timesText(2)).toBe('twice')
    expect(timesText(3)).toBe('3 times')
  })

  it('leaves out entries it can’t read', () => {
    expect(parseComparisons([{ miles: 5, one: 'Once', many: '{n} times' }, { miles: 'far' }, null])).toEqual([{ miles: 5, one: 'Once', many: '{n} times' }])
    expect(parseComparisons({})).toEqual([])
  })
})
