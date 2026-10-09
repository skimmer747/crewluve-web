import { ICON_PATHS, type IconName } from '../icons/iconPaths'

interface IconProps {
  name: IconName
  size?: number
  /** Any CSS color; defaults to the surrounding text color. */
  color?: string
  /** Accessible name. Omit it for decorative icons. */
  label?: string
}

export function Icon({ name, size = 28, color, label }: IconProps) {
  return (
    <svg
      class="icon"
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="currentColor"
      style={color ? { color } : undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    >
      {ICON_PATHS[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
