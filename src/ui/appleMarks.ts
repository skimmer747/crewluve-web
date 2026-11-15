import { ICON_PATHS, type IconName } from '../icons/iconPaths'
import type { MarkKind } from '../map/appleMapPlan'

const SVG_NS = 'http://www.w3.org/2000/svg'

const ICONS: Record<Exclude<MarkKind, 'airport'>, { name: IconName; size: number }> = {
  plane: { name: 'Airplane', size: 22 },
  car: { name: 'Car', size: 16 },
  heart: { name: 'Heart', size: 22 },
}

/** A Phosphor icon, 256 units square, as an SVG element `size` px wide. */
function icon(name: IconName, size: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 256 256')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  for (const d of ICON_PATHS[name]) {
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', d)
    svg.appendChild(path)
  }
  return svg
}

/**
 * The element for a mark on Apple's map (Apple Maps spec §8), styled by tripMap.css as on the SVG map: an airport's dot
 * and code, or the plane, a car or the heart. `turn` sets the mark's turn later, for the plane.
 */
export function markElement(kind: MarkKind, label: string | null): { element: HTMLElement; turn: (degrees: number) => void } {
  const element = document.createElement('div')
  element.className = `apple-mark ${kind}`
  if (kind === 'airport') {
    const dot = document.createElement('span')
    dot.className = 'apple-mark-dot'
    const code = document.createElement('span')
    code.className = 'apple-mark-code'
    code.textContent = label ?? ''
    element.append(dot, code)
    return { element, turn: () => {} }
  }
  const { name, size } = ICONS[kind]
  const svg = icon(name, size)
  element.appendChild(svg)
  return { element, turn: (degrees) => svg.style.setProperty('transform', `rotate(${degrees}deg)`) }
}
