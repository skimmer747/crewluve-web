/**
 * SF Symbols' chevron.right or chevron.left, drawn as a line with round ends like the in-flight map's arrow (slice 3A
 * §5.1). `size` is its height in pixels and `weight` the line's width, both in the 8 × 14 box it's drawn in.
 */
export function Chevron({ direction = 'right', size = 14, weight = 2 }: { direction?: 'left' | 'right'; size?: number; weight?: number }) {
  return (
    <svg class="chevron" width={(size * 8) / 14} height={size} viewBox="0 0 8 14" aria-hidden="true">
      <polyline
        points={direction === 'right' ? '1.5,1.5 6.5,7 1.5,12.5' : '6.5,1.5 1.5,7 6.5,12.5'}
        fill="none"
        stroke="currentColor"
        stroke-width={weight}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  )
}
