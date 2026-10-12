import type { Ref } from 'preact'

export function titleFor(name: string | null): string {
  return name ? `Where's ${name}?` : "Where's your pilot?"
}

/**
 * The page's title. It takes focus from code only, as where focus goes when a popup closes by itself and neither card
 * is in the location card's place (popup follow-ups §4.2).
 */
export function Title({ text, headingRef }: { text: string; headingRef?: Ref<HTMLHeadingElement> }) {
  return <h1 ref={headingRef} class="title" tabIndex={-1}>{text}</h1>
}
