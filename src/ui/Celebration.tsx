import { useEffect, useState } from 'preact/hooks'
import { celebrationFrame, figureGeometry, type CelebrationFrame } from './celebrationMath'
import { Icon } from './Icon'

/** The little figure with hearts on the arrival card in the last 24 hours. Replays when `playKey` changes. */
export function Celebration({ playKey }: { playKey: number }) {
  const [frame, setFrame] = useState<CelebrationFrame | null>(null)

  useEffect(() => {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // The clock starts at the first frame we are handed, as in the Swift. Reading performance.now() here instead
    // would let a frame stamped a few ms earlier give a negative time, and the loop would end before drawing anything.
    let start: number | null = null
    let raf = 0
    const tick = (now: number) => {
      start ??= now
      const next = celebrationFrame(now - start)
      setFrame(next)
      if (next) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playKey])

  if (!frame) return null
  const g = figureGeometry(frame.armRaise)
  const arm = (shoulderX: number, elbow: { x: number; y: number }, hand: { x: number; y: number }) =>
    `M${shoulderX} ${g.shoulderY} L${elbow.x} ${elbow.y} L${hand.x} ${hand.y}`
  const line = { stroke: 'url(#celebration-green)', fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  return (
    <div class="celebration" aria-hidden="true" style={{ opacity: frame.opacity }}>
      <div style={{ transform: `translateY(${frame.offsetY}px) rotate(${frame.rotation}deg) scale(${frame.scale})` }}>
        <svg width="36" height="28" viewBox="0 0 36 28">
          <defs>
            {/* userSpaceOnUse: an objectBoundingBox gradient would vanish on the zero-width torso line. */}
            <linearGradient id="celebration-green" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="28">
              <stop offset="0" style={{ stopColor: '#5ee07f' }} />
              <stop offset="1" style={{ stopColor: '#2fb34f' }} />
            </linearGradient>
          </defs>
          <circle cx="18" cy={g.headCy} r={g.headR} fill="url(#celebration-green)" />
          <path d={`M18 ${g.shoulderY} L18 28`} style={{ ...line, strokeWidth: g.lineWidth * 1.8 }} />
          <path d={arm(19, g.rElbow, g.rHand)} style={{ ...line, strokeWidth: g.lineWidth }} />
          <path d={arm(17, g.lElbow, g.lHand)} style={{ ...line, strokeWidth: g.lineWidth }} />
        </svg>
      </div>
      {frame.hearts.map((h, i) => (
        <span
          key={i}
          class="celebration-heart"
          style={{ opacity: h.opacity, transform: `translate(calc(-50% + ${h.x}px), calc(-50% + ${h.y}px)) scale(${h.scale})` }}
        >
          <Icon name="Heart" size={h.size} color="var(--red)" />
        </span>
      ))}
    </div>
  )
}
