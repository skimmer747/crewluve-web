import { useEffect, useRef } from 'preact/hooks'
import type { WeatherAnimation } from '../copy/weather'
import { weatherShapes, type ParticleColor, type WeatherShape } from './weatherParticles'

/** The app's cloud and fog grays, Color(red: 0.55, green: 0.6, blue: 0.7) and Color(red: 0.6, green: 0.63, blue: 0.68). */
const SOFT_RGB = { cloud: '140, 153, 179', fog: '153, 161, 173' } as const

type Palette = Record<ParticleColor, string>

/**
 * The lines' and dots' colors: the theme's, read where the canvas sits, so they follow the popup's light or dark set.
 * White stands in for any the stylesheet hasn't set.
 */
function readPalette(el: Element): Palette {
  const style = getComputedStyle(el)
  const theme = (name: string) => style.getPropertyValue(`--${name}`).trim() || '#ffffff'
  return { orange: theme('orange'), yellow: theme('yellow'), blue: theme('blue'), cyan: theme('cyan'), white: '#ffffff' }
}

/** Draws one shape. Soft shapes fade out toward their edges, in place of the app's blur, which Safari's canvas lacked before 18. */
function paint(ctx: CanvasRenderingContext2D, shape: WeatherShape, colors: Palette, w: number, h: number) {
  ctx.globalAlpha = shape.alpha
  switch (shape.kind) {
    case 'line':
      ctx.strokeStyle = colors[shape.color]
      ctx.lineWidth = shape.width
      ctx.beginPath()
      ctx.moveTo(shape.x1, shape.y1)
      ctx.lineTo(shape.x2, shape.y2)
      ctx.stroke()
      return
    case 'dot':
      ctx.fillStyle = colors[shape.color]
      ctx.beginPath()
      ctx.arc(shape.x, shape.y, shape.r, 0, Math.PI * 2)
      ctx.fill()
      return
    case 'soft': {
      // A circle of radius 1 stretched over the ellipse plus its blur: solid in the middle, clear at the edge.
      const rgb = SOFT_RGB[shape.color]
      const solid = Math.max(0, (Math.min(shape.rx, shape.ry) - shape.blur) / (Math.min(shape.rx, shape.ry) + shape.blur))
      ctx.save()
      ctx.translate(shape.x, shape.y)
      ctx.scale(shape.rx + shape.blur, shape.ry + shape.blur)
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      gradient.addColorStop(0, `rgba(${rgb}, 1)`)
      gradient.addColorStop(solid, `rgba(${rgb}, 1)`)
      gradient.addColorStop(1, `rgba(${rgb}, 0)`)
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(0, 0, 1, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }
    case 'flash':
      ctx.fillStyle = colors.white
      ctx.fillRect(0, 0, w, h)
      return
    case 'bolt':
      ctx.strokeStyle = colors.white
      ctx.lineWidth = shape.width
      ctx.beginPath()
      shape.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
      ctx.stroke()
      return
    default: {
      // A new kind of shape has to be painted here: this stops the build until it is.
      const unpainted: never = shape
      return unpainted
    }
  }
}

export interface WeatherBackdropProps {
  kind: WeatherAnimation
  /** Whether it's night where the pilot is, which forces the popup's dark colors: they're read again when it changes. */
  night: boolean
}

/**
 * The weather animation behind the popup card (slice 2B2 §7), drawn on a canvas each animation frame while the page is
 * visible. The popup leaves it out for reduced motion and when there's no weather.
 */
export function WeatherBackdrop({ kind, night }: WeatherBackdropProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const colors = readPalette(canvas)
    let raf = 0
    const draw = (now: number) => {
      const ratio = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      // Nothing to draw on until the card has a size; the particles' formulas divide by it.
      if (w > 0 && h > 0) {
        if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
          canvas.width = Math.round(w * ratio)
          canvas.height = Math.round(h * ratio)
        }
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
        ctx.clearRect(0, 0, w, h)
        for (const shape of weatherShapes(kind, now / 1000, w, h)) paint(ctx, shape, colors, w, h)
      }
      raf = requestAnimationFrame(draw)
    }
    const start = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(draw)
    }
    // Browsers hold back frames for hidden pages anyway; this makes sure it stops there and starts again on return.
    const onVisibility = () => (document.visibilityState === 'hidden' ? cancelAnimationFrame(raf) : start())
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [kind, night])
  return <canvas ref={ref} class="sun-popup-weather" aria-hidden="true" />
}
