/** The trip map's styles on Apple's map (Apple Maps spec §4.1), in the style button's order, as in the app. */
export type AppleMapStyle = 'hybrid' | 'standard' | 'satellite'
export const APPLE_MAP_STYLES: readonly AppleMapStyle[] = ['hybrid', 'standard', 'satellite']

export const nextMapStyle = (style: AppleMapStyle): AppleMapStyle =>
  APPLE_MAP_STYLES[(APPLE_MAP_STYLES.indexOf(style) + 1) % APPLE_MAP_STYLES.length]

/** Where this browser keeps the style. The card and the full map share it. */
export const MAP_STYLE_KEY = 'crewluve.mapStyle.v1'

/** localStorage, or null where the browser refuses it (blocked site data). */
function pageStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** The kept style, or Hybrid when none is kept, it's unknown, or storage is blocked. */
export function readMapStyle(storage: Pick<Storage, 'getItem'> | null = pageStorage()): AppleMapStyle {
  try {
    const kept = storage?.getItem(MAP_STYLE_KEY)
    return APPLE_MAP_STYLES.find((style) => style === kept) ?? 'hybrid'
  } catch {
    return 'hybrid'
  }
}

/** Keeps `style`. Where storage is blocked the choice lasts until the page closes. */
export function keepMapStyle(style: AppleMapStyle, storage: Pick<Storage, 'setItem'> | null = pageStorage()): void {
  try {
    storage?.setItem(MAP_STYLE_KEY, style)
  } catch {
    // Blocked: nothing to do.
  }
}
