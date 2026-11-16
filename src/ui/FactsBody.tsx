import type { FactRow, TripSoFar } from '../facts/factRow'
import { FactRowView } from './FactRowView'
import { FactsFooter } from './FactsFooter'
import { TripSoFarList } from './TripSoFarList'

export interface FactsBodyProps {
  rows: FactRow[]
  tripSoFar: TripSoFar
  /** A flight with live data shows, which the footer credits adsb.lol for (Stage 3 spec §8). False unless it's said. */
  showsLiveCredit?: boolean
}

/** The facts under the panel's headline (Stage 2 spec §5, §6.3): the rows, the trip so far, then the footer. */
export function FactsBody({ rows, tripSoFar, showsLiveCredit = false }: FactsBodyProps) {
  return (
    <div class="facts-body">
      {rows.length > 0 && (
        <ul class="fact-rows">
          {rows.map((row) => <FactRowView key={row.kind} row={row} />)}
        </ul>
      )}
      <TripSoFarList tripSoFar={tripSoFar} />
      <FactsFooter showsWeather={rows.some((row) => row.hasWeather)} showsLiveCredit={showsLiveCredit} />
    </div>
  )
}
