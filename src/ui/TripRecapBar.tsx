import type { RecapTile } from '../copy/factsTrip'

/**
 * The bar under the recap card's map (Stage 2 spec §6.5): up to four numbers, then the longest flight. The card's button
 * says all of it in one sentence, so screen readers skip the bar.
 */
export function TripRecapBar({ tiles, longest }: { tiles: RecapTile[]; longest: string | null }) {
  if (tiles.length === 0 && !longest) return null
  return (
    <div class="trip-recap-bar" aria-hidden="true">
      {tiles.length > 0 && (
        <ul class="trip-recap-tiles">
          {tiles.map((tile) => (
            <li key={tile.label}>
              <span class="trip-recap-value">{tile.value}</span>
              <span class="trip-recap-label">{tile.label}</span>
            </li>
          ))}
        </ul>
      )}
      {longest && <p class="trip-recap-longest">{longest}</p>}
    </div>
  )
}
