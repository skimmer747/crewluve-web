import type { ColorToken } from '../copy/colors'

/** A ColorToken as CSS: semantic names map to the theme variables in src/styles/tokens.css. */
export function cssColor(token: ColorToken): string {
  if (token.startsWith('#')) return token
  return token === 'secondary' ? 'var(--text-2)' : `var(--${token})`
}
