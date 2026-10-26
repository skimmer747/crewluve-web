/**
 * One line above the cards (piece 5a §4.3): that this browser just connected, or why a link didn't. It isn't a live
 * region itself: Root's, which outlives every screen, reads it, so it isn't read twice.
 */
export function Notice({ text }: { text: string }) {
  return <p class="glass notice">{text}</p>
}
