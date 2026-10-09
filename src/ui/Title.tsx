export function titleFor(name: string | null): string {
  return name ? `Where's ${name}?` : "Where's your pilot?"
}

export function Title({ text }: { text: string }) {
  return <h1 class="title">{text}</h1>
}
