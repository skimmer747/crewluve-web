import { describe, expect, it } from 'vitest'
import { ICON_PATHS } from '../../src/icons/iconPaths'

const STATUS_AND_FOOTER_ICONS = [
  'House', 'Airplane', 'Car', 'ArrowsClockwise', 'Bed', 'Buildings', 'ClockCountdown', 'Lightning',
  'BookOpen', 'MapPin', 'Circle', 'Package', 'AirplaneTakeoff', 'AirplaneLanding', 'Cloud',
  'ArrowCircleUp', 'Warning', 'ArrowClockwise', 'SignOut', 'Heart',
]

describe('ICON_PATHS', () => {
  it('has every status, card, and footer icon', () => {
    for (const name of STATUS_AND_FOOTER_ICONS) expect(ICON_PATHS).toHaveProperty(name)
  })

  it('stores at least one SVG path per icon', () => {
    for (const paths of Object.values(ICON_PATHS)) {
      expect(paths.length).toBeGreaterThan(0)
      expect(paths[0]).toMatch(/^M/)
    }
  })

  it('has the trip cards’ calendar and clock icons', () => {
    for (const name of ['CalendarBlank', 'Clock']) expect(ICON_PATHS).toHaveProperty(name)
  })

  it('has the location card’s weather and sun dial icons', () => {
    for (const name of ['Sun', 'Moon', 'CloudSun', 'CloudMoon', 'CloudFog', 'CloudRain', 'CloudSnow', 'CloudLightning']) {
      expect(ICON_PATHS).toHaveProperty(name)
    }
  })
})
