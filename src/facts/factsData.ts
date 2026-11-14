import { parseComparisons, type Comparison } from './comparisons'
import { parseGeography, type Geography } from './geography'

/** The facts' data (Stage 2 spec §9, §10): copies of the app's files in public/data, fetched from the site itself. */

export async function loadGeography(url = `${import.meta.env.BASE_URL}data/geography.json`): Promise<Geography> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`geography.json ${res.status}`)
  return parseGeography(await res.json())
}

export async function loadComparisons(url = `${import.meta.env.BASE_URL}data/comparisons.json`): Promise<Comparison[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`comparisons.json ${res.status}`)
  return parseComparisons(await res.json())
}
