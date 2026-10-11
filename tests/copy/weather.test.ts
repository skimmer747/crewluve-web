import { describe, expect, it } from 'vitest'
import { temperatureText, weatherAnimation, weatherVisual, type WeatherAnimation } from '../../src/copy/weather'
import { WEATHER_CODES, type WeatherCode } from '../../src/data/weather'
import { ICON_PATHS } from '../../src/icons/iconPaths'
import { cssColor } from '../../src/ui/colors'

describe('weatherVisual', () => {
  it('has words and a drawable icon for every code Open-Meteo reports, by day and by night', () => {
    expect(WEATHER_CODES).toHaveLength(28)
    for (const code of WEATHER_CODES) {
      for (const isDay of [true, false]) {
        const visual = weatherVisual(code, isDay)
        expect(visual.words).not.toBe('')
        expect(ICON_PATHS).toHaveProperty(visual.icon)
      }
    }
  })

  // Spec §6's table, row by row: the codes, the words, and the daytime icon and color.
  it.each<[WeatherCode[], string, string, string]>([
    [[0], 'Clear', 'Sun', 'orange'],
    [[1], 'Mostly Clear', 'Sun', 'orange'],
    [[2], 'Partly Cloudy', 'CloudSun', 'orange'],
    [[3], 'Cloudy', 'Cloud', 'gray'],
    [[45, 48], 'Fog', 'CloudFog', 'gray'],
    [[51, 53, 55], 'Drizzle', 'CloudRain', 'blue'],
    [[56, 57], 'Freezing Drizzle', 'CloudRain', 'blue'],
    [[61, 63, 80, 81], 'Rain', 'CloudRain', 'blue'],
    [[65, 82], 'Heavy Rain', 'CloudRain', 'blue'],
    [[66, 67], 'Freezing Rain', 'CloudRain', 'blue'],
    [[71], 'Flurries', 'CloudSnow', 'cyan'],
    [[73, 77, 85], 'Snow', 'CloudSnow', 'cyan'],
    [[75, 86], 'Heavy Snow', 'CloudSnow', 'cyan'],
    [[95, 96, 99], 'Thunderstorm', 'CloudLightning', 'yellow'],
  ])('codes %j read "%s" with %s in %s', (codes, words, icon, color) => {
    for (const code of codes) expect(weatherVisual(code, true)).toEqual({ words, icon, color })
  })

  it('puts the moon in clear and partly cloudy night skies, and changes nothing else at night', () => {
    expect(weatherVisual(0, false)).toEqual({ words: 'Clear', icon: 'Moon', color: 'indigo' })
    expect(weatherVisual(1, false)).toEqual({ words: 'Mostly Clear', icon: 'Moon', color: 'indigo' })
    expect(weatherVisual(2, false)).toEqual({ words: 'Partly Cloudy', icon: 'CloudMoon', color: 'indigo' })
    for (const code of WEATHER_CODES.filter((c) => c > 2)) expect(weatherVisual(code, false)).toEqual(weatherVisual(code, true))
  })

  it('names colors the theme has', () => {
    expect(cssColor('cyan')).toBe('var(--cyan)')
    expect(cssColor('indigo')).toBe('var(--indigo)')
    expect(cssColor('yellow')).toBe('var(--yellow)')
  })
})

describe('temperatureText', () => {
  it('rounds to whole degrees as the app’s weather format does, halves to the even number, and adds the degree sign', () => {
    expect(temperatureText(41.2)).toBe('41°')
    expect(temperatureText(40.5)).toBe('40°')
    expect(temperatureText(41.5)).toBe('42°')
    expect(temperatureText(14.44)).toBe('14°')
    expect(temperatureText(-3.6)).toBe('-4°')
    expect(temperatureText(-3.5)).toBe('-4°')
  })

  it('keeps the minus sign just below zero, as the app does', () => {
    expect(temperatureText(-0.4)).toBe('-0°')
    expect(temperatureText(0.4)).toBe('0°')
  })
})

describe('weatherAnimation', () => {
  // Spec §7's table: the card's words to the app's animations.
  it.each<[WeatherCode[], WeatherAnimation]>([
    [[95, 96, 99], 'thunderstorm'],
    [[71, 73, 75, 77, 85, 86], 'snow'],
    [[51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82], 'rain'],
    [[45, 48], 'fog'],
    [[2, 3], 'clouds'],
  ])('codes %j play %s, by day and by night', (codes, animation) => {
    for (const code of codes) {
      expect(weatherAnimation(code, true)).toBe(animation)
      expect(weatherAnimation(code, false)).toBe(animation)
    }
  })

  it('plays sun rays in a clear sky by day and stars at night', () => {
    for (const code of [0, 1] as WeatherCode[]) {
      expect(weatherAnimation(code, true)).toBe('sunRays')
      expect(weatherAnimation(code, false)).toBe('stars')
    }
  })

  it('has an animation for every code', () => {
    for (const code of WEATHER_CODES) expect(weatherAnimation(code, true)).toMatch(/^(sunRays|rain|snow|clouds|thunderstorm|fog)$/)
  })
})
