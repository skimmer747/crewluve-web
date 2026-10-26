/** One line above the cards (piece 5a §4.3): that this browser just connected, or why a link didn't. */
export function Notice({ text }: { text: string }) {
  return (
    <p class="glass notice" role="status">
      {text}
    </p>
  )
}
