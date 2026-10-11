import { describe, expect, it } from 'vitest'
import { particleHash, weatherShapes, type WeatherShape } from '../../src/ui/weatherParticles'

const W = 360
const H = 720
const of = <K extends WeatherShape['kind']>(shapes: WeatherShape[], kind: K) => shapes.filter((s): s is Extract<WeatherShape, { kind: K }> => s.kind === kind)

describe('particleHash', () => {
  it('gives the same number from 0 up to 1 for the same seed and particle, and different ones otherwise', () => {
    expect(particleHash(10, 3)).toBe(particleHash(10, 3))
    const values = Array.from({ length: 200 }, (_, i) => particleHash(10, i))
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
    expect(new Set(values).size).toBeGreaterThan(190)
    expect(particleHash(11, 3)).not.toBe(particleHash(10, 3))
  })
})

describe('weatherShapes', () => {
  it('turns 12 rays from 85% across and 12% down, 20 to 60–180 px out, orange and yellow by turns', () => {
    const rays = of(weatherShapes('sunRays', 3, W, H), 'line')
    expect(rays).toHaveLength(12)
    for (const [i, ray] of rays.entries()) {
      const start = Math.hypot(ray.x1 - W * 0.85, ray.y1 - H * 0.12)
      const end = Math.hypot(ray.x2 - W * 0.85, ray.y2 - H * 0.12)
      expect(start).toBeCloseTo(20, 9)
      expect(end).toBeGreaterThanOrEqual(60)
      expect(end).toBeLessThanOrEqual(180)
      expect(ray.color).toBe(i % 2 === 0 ? 'orange' : 'yellow')
      expect(ray.width).toBe(3.5)
      expect(ray.alpha).toBeGreaterThanOrEqual(0.12)
      expect(ray.alpha).toBeLessThanOrEqual(0.27)
    }
    // They turn at 0.15 radians a second.
    const later = of(weatherShapes('sunRays', 4, W, H), 'line')
    const angle = (r: { x1: number; y1: number }) => Math.atan2(r.y1 - H * 0.12, r.x1 - W * 0.85)
    expect(angle(later[0]) - angle(rays[0])).toBeCloseTo(0.15, 9)
  })

  it('twinkles 40 white stars of 1 to 3 px between 20% and 80%', () => {
    const stars = of(weatherShapes('stars', 3, W, H), 'dot')
    expect(stars).toHaveLength(40)
    for (const star of stars) {
      expect(star.r).toBeGreaterThanOrEqual(1)
      expect(star.r).toBeLessThanOrEqual(3)
      expect(star.alpha).toBeGreaterThanOrEqual(0.2)
      expect(star.alpha).toBeLessThanOrEqual(0.8)
      expect(star.color).toBe('white')
    }
    // They stay put.
    expect(of(weatherShapes('stars', 4, W, H), 'dot').map((s) => [s.x, s.y])).toEqual(stars.map((s) => [s.x, s.y]))
  })

  it('drops 60 rain streaks of 12 to 20 px, falling at 280 to 480 px a second, every third one cyan', () => {
    const drops = of(weatherShapes('rain', 3, W, H), 'line')
    expect(drops).toHaveLength(60)
    for (const [i, drop] of drops.entries()) {
      expect(drop.y2 - drop.y1).toBeGreaterThanOrEqual(12)
      expect(drop.y2 - drop.y1).toBeLessThanOrEqual(20)
      expect(drop.color).toBe(i % 3 === 0 ? 'cyan' : 'blue')
      expect(drop.width).toBe(1.5)
    }
    // A tenth of a second later each drop has fallen 28 to 48 px, unless it has wrapped back to the top.
    const later = of(weatherShapes('rain', 3.1, W, H), 'line')
    const fallen = later.map((d, i) => d.y1 - drops[i].y1).filter((dy) => dy > 0)
    expect(fallen.length).toBeGreaterThan(50)
    for (const dy of fallen) {
      expect(dy).toBeGreaterThanOrEqual(28 - 1e-9)
      expect(dy).toBeLessThanOrEqual(48 + 1e-9)
    }
  })

  it('floats 35 white flakes of 2 to 5 px down at 30 to 70 px a second', () => {
    const flakes = of(weatherShapes('snow', 3, W, H), 'dot')
    expect(flakes).toHaveLength(35)
    for (const flake of flakes) {
      expect(flake.r).toBeGreaterThanOrEqual(2)
      expect(flake.r).toBeLessThanOrEqual(5)
      expect(flake.alpha).toBeGreaterThanOrEqual(0.4)
      expect(flake.alpha).toBeLessThanOrEqual(0.7)
    }
    const later = of(weatherShapes('snow', 4, W, H), 'dot')
    const fallen = later.map((f, i) => f.y - flakes[i].y).filter((dy) => dy > 0)
    for (const dy of fallen) {
      expect(dy).toBeGreaterThanOrEqual(30 - 1e-9)
      expect(dy).toBeLessThanOrEqual(70 + 1e-9)
    }
  })

  it('drifts 7 soft clouds of 120–270 by 50–100 px across, at 25% to 45%', () => {
    const clouds = of(weatherShapes('clouds', 3, W, H), 'soft')
    expect(clouds).toHaveLength(7)
    for (const cloud of clouds) {
      expect(cloud.rx * 2).toBeGreaterThanOrEqual(120)
      expect(cloud.rx * 2).toBeLessThanOrEqual(270)
      expect(cloud.ry * 2).toBeGreaterThanOrEqual(50)
      expect(cloud.ry * 2).toBeLessThanOrEqual(100)
      expect([cloud.color, cloud.blur]).toEqual(['cloud', 18])
      expect(cloud.alpha).toBeGreaterThanOrEqual(0.25)
      expect(cloud.alpha).toBeLessThanOrEqual(0.45)
    }
  })

  it('rolls 4 wide fog bands, 60 to 100 px tall, up and down', () => {
    const bands = of(weatherShapes('fog', 3, W, H), 'soft')
    expect(bands).toHaveLength(4)
    for (const band of bands) {
      expect(band.rx).toBe((W + 40) / 2)
      expect(band.ry * 2).toBeGreaterThanOrEqual(60)
      expect(band.ry * 2).toBeLessThanOrEqual(100)
      expect([band.color, band.blur]).toEqual(['fog', 30])
    }
    expect(of(weatherShapes('fog', 5, W, H), 'soft').map((b) => b.y)).not.toEqual(bands.map((b) => b.y))
  })

  it('rains in a thunderstorm and flashes for a moment every 6 seconds, with a 4-part bolt', () => {
    const calm = weatherShapes('thunderstorm', 3, W, H)
    expect(of(calm, 'line')).toHaveLength(60)
    expect(of(calm, 'flash')).toHaveLength(0)
    const flash = weatherShapes('thunderstorm', 12.05, W, H)
    expect(of(flash, 'flash')).toEqual([{ kind: 'flash', alpha: 0.25 }])
    const [bolt] = of(flash, 'bolt')
    expect(bolt.points).toHaveLength(5)
    expect(bolt.points[0][1]).toBe(0)
    expect(bolt.points[4][1]).toBeCloseTo(H / 2, 9)
    expect([bolt.width, bolt.alpha]).toEqual([2, 0.8])
    expect(of(weatherShapes('thunderstorm', 12.11, W, H), 'flash')).toHaveLength(0)
    // The next flash has a different bolt.
    expect(of(weatherShapes('thunderstorm', 18.05, W, H), 'bolt')[0].points).not.toEqual(bolt.points)
  })
})
