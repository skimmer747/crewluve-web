import type { WeatherCode } from '../data/weather'
import type { IconName } from '../icons/iconPaths'
import type { ColorToken } from './colors'

/** How the card shows the weather: the app's words for it, and an icon in its color. */
export interface WeatherVisual {
  words: string
  icon: IconName
  color: ColorToken
}

type Sky = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm'

/** Open-Meteo's WMO codes in the app's words, which are Apple's condition names (slice 2B1 §6). */
const CONDITIONS: Record<WeatherCode, [words: string, sky: Sky]> = {
  0: ['Clear', 'clear'],
  1: ['Mostly Clear', 'clear'],
  2: ['Partly Cloudy', 'partly'],
  3: ['Cloudy', 'cloudy'],
  45: ['Foggy', 'fog'],
  48: ['Foggy', 'fog'],
  51: ['Drizzle', 'rain'],
  53: ['Drizzle', 'rain'],
  55: ['Drizzle', 'rain'],
  56: ['Freezing Drizzle', 'rain'],
  57: ['Freezing Drizzle', 'rain'],
  61: ['Rain', 'rain'],
  63: ['Rain', 'rain'],
  65: ['Heavy Rain', 'rain'],
  66: ['Freezing Rain', 'rain'],
  67: ['Freezing Rain', 'rain'],
  71: ['Flurries', 'snow'],
  73: ['Snow', 'snow'],
  75: ['Heavy Snow', 'snow'],
  77: ['Snow', 'snow'],
  80: ['Rain', 'rain'],
  81: ['Rain', 'rain'],
  82: ['Heavy Rain', 'rain'],
  85: ['Snow', 'snow'],
  86: ['Heavy Snow', 'snow'],
  95: ['Thunderstorms', 'storm'],
  96: ['Thunderstorms', 'storm'],
  99: ['Thunderstorms', 'storm'],
}

/** The sky's icon and color: sun orange, moon indigo, clouds and fog gray, rain blue, snow cyan, lightning yellow. */
function skyIcon(sky: Sky, isDay: boolean): [IconName, ColorToken] {
  switch (sky) {
    case 'clear':
      return isDay ? ['Sun', 'orange'] : ['Moon', 'indigo']
    case 'partly':
      return isDay ? ['CloudSun', 'orange'] : ['CloudMoon', 'indigo']
    case 'cloudy':
      return ['Cloud', 'gray']
    case 'fog':
      return ['CloudFog', 'gray']
    case 'rain':
      return ['CloudRain', 'blue']
    case 'snow':
      return ['CloudSnow', 'cyan']
    case 'storm':
      return ['CloudLightning', 'yellow']
  }
}

/** The words, icon and color for a weather code. At night the clear and partly cloudy skies get moons. */
export function weatherVisual(code: WeatherCode, isDay: boolean): WeatherVisual {
  const [words, sky] = CONDITIONS[code]
  const [icon, color] = skyIcon(sky, isDay)
  return { words, icon, color }
}

/** "41°": rounded, with no unit letter, as the app's narrow weather format shows it. */
export function temperatureText(degrees: number): string {
  return `${Math.round(degrees)}°`
}
