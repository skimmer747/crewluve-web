/** Whether the visitor asks for reduced motion. The sun popup reads it once, as it opens. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}
