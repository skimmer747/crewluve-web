import { ICON_PATHS, type IconName } from '../icons/iconPaths'
import type { MarkKind } from '../map/appleMapPlan'
import type { GroundKind } from '../map/tripActivity'
import { PILOT_ICONS } from './TripMapSvg'

const SVG_NS = 'http://www.w3.org/2000/svg'

const ICONS: Record<'plane' | 'car', { name: IconName; size: number }> = {
  plane: { name: 'Airplane', size: 22 },
  car: { name: 'Car', size: 16 },
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
 * and code, the plane, a car, or the pilot's marker, a white icon on the colour of what they're doing (activity markers
 * design §2). `turn` sets the mark's turn later, for the plane.
 */
export function markElement(kind: MarkKind, label: string | null, activity: GroundKind | null = null): { element: HTMLElement; turn: (degrees: number) => void } {
  const element = document.createElement('div')
  element.className = `apple-mark ${kind}`
  if (kind === 'pilot') {
    const doing = activity ?? 'layover'
    element.className = `apple-mark pilot activity-${doing}`
    element.appendChild(icon(PILOT_ICONS[doing], 13))
    return { element, turn: () => {} }
  }
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
