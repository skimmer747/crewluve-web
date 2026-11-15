import { useState } from 'preact/hooks'
import { keepMapStyle, readMapStyle, type AppleMapStyle } from '../../map/appleMapStyle'

/** The trip map's style and a setter that keeps it. The full map sets it; the card reads it when it next shows. */
export function useMapStyle(): [AppleMapStyle, (style: AppleMapStyle) => void] {
  const [style, setStyle] = useState<AppleMapStyle>(() => readMapStyle())
  return [
    style,
    (next) => {
      keepMapStyle(next)
      setStyle(next)
    },
  ]
}
