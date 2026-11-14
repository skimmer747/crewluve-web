/**
 * What a distance is like (Stage 2 spec §4.9): "Like driving coast to coast", "Like rafting the Grand Canyon twice", as
 * the app's ComparisonPicker. The entries are public/data/comparisons.json, a copy of the app's (§9.2).
 */
export interface Comparison {
  miles: number
  /** Used once: "Like driving coast to coast". */
  one: string
  /** Used 2 to 10 times. `{n}` is the number and `{times}` is "twice" or "3 times". */
  many: string
}

/** comparisons.json's entries. Anything it can't read is left out. */
export function parseComparisons(json: unknown): Comparison[] {
  if (!Array.isArray(json)) return []
  return json.filter((e): e is Comparison =>
    typeof e === 'object' && e !== null && typeof e.miles === 'number' && typeof e.one === 'string' && typeof e.many === 'string')
    .map(({ miles, one, many }) => ({ miles, one, many }))
}

/** "twice", "3 times". */
export const timesText = (count: number) => (count === 2 ? 'twice' : `${count} times`)

/**
 * The entry whose multiple of `miles` is closest to a whole number from 1 to 10, in words. Ties go to the smaller number,
 * then to the earlier entry. Null when no entry fits.
 */
export function comparisonFor(entries: Comparison[], miles: number): string | null {
  let best: { entry: Comparison; count: number; error: number } | null = null
  for (const entry of entries) {
    if (!(entry.miles > 0)) continue
    const multiple = miles / entry.miles
    // The nearest whole number, with a half going to the smaller one.
    const count = Math.ceil(multiple - 0.5)
    // Written so a NaN fails it, as the app's `(1...10).contains` does.
    if (!(count >= 1 && count <= 10)) continue
    const error = Math.abs(multiple - count)
    if (best && (error > best.error || (error === best.error && count >= best.count))) continue
    best = { entry, count, error }
  }
  if (!best) return null
  if (best.count === 1) return best.entry.one
  return best.entry.many.replace(/\{n\}/g, String(best.count)).replace(/\{times\}/g, timesText(best.count))
}
