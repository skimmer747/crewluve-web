import type { ColorToken } from '../copy/colors'

/** A ColorToken as CSS: semantic names map to the theme variables in src/styles/tokens.css. */
export function cssColor(token: ColorToken): string {
  if (token.startsWith('#')) return token
  return token === 'secondary' ? 'var(--text-2)' : `var(--${token})`
}

/**
 * A ColorToken as the background behind white text (Part A follow-ups spec §3.3): the --fill-* color where tokens.css
 * defines one, under Increase Contrast in dark mode, else the color itself. A brand hex and the secondary color come
 * back as cssColor gives them.
 */
export function cssFill(token: ColorToken): string {
  if (token.startsWith('#') || token === 'secondary') return cssColor(token)
  return `var(--fill-${token}, var(--${token}))`
}
