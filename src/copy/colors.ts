/** Semantic color names (resolved to CSS variables by src/ui/colors.ts) or a literal airline brand hex. */
export type ColorToken =
  | 'green' | 'blue' | 'red' | 'orange' | 'purple' | 'gray' | 'cyan' | 'indigo' | 'yellow' | 'secondary' | 'ups' | `#${string}`
