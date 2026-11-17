import { useSizeOf } from './useSizeOf'

/**
 * An element's height in CSS pixels, measured as it appears and again whenever it changes, or 0 while there's none.
 * Unlike `useSize`, it follows an element that comes and goes: pass the element itself, kept from a callback ref.
 */
export const useHeightOf = (element: HTMLElement | null): number => useSizeOf(element).height
