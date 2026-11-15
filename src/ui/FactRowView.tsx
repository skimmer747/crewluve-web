import { rowSentence, type FactRow } from '../facts/factRow'
import { Icon } from './Icon'

/** One row of the facts (Stage 2 spec §6.3): an icon, a title and a second line, which screen readers hear as one sentence. */
export function FactRowView({ row }: { row: FactRow }) {
  return (
    <li class="fact-row">
      <span class="fact-row-icon">
        <Icon name={row.icon} size={22} />
      </span>
      <span class="fact-row-text" aria-hidden="true">
        <span class="fact-row-title">{row.title}</span>
        {row.detail && <span class="fact-row-detail">{row.detail}</span>}
      </span>
      <span class="sr-only">{rowSentence(row)}</span>
    </li>
  )
}
