import { describe, expect, it } from 'vitest'
import { browserLabel, platformOf } from '../../src/partner/label'

// Real user agents, as each browser sends them.
const UA: Record<string, string> = {
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.81 Mobile Safari/537.36',
  samsungAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
  safariIPhone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  chromeIPhone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1',
  safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  chromeMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  edgeWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
  firefoxWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
  chromeOS: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  edgeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 EdgA/129.0.0.0',
  edgeIPhone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/129.0.0.0 Version/18.0 Mobile/15E148 Safari/604.1',
  firefoxIPhone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/605.1.15',
  oldEdgeWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.19041',
  safariIPad: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
}

describe('browserLabel (piece 5a P5-6)', () => {
  it.each([
    ['chromeAndroid', 0, 'Chrome on Android'],
    ['samsungAndroid', 0, 'Samsung Internet on Android'],
    ['firefoxAndroid', 0, 'Firefox on Android'],
    ['safariIPhone', 5, 'Safari on iPhone'],
    ['chromeIPhone', 5, 'Chrome on iPhone'],
    // An iPad asks for the desktop site as a Mac, but has a touch screen.
    ['safariMac', 5, 'Safari on iPad'],
    ['safariMac', 0, 'Safari on Mac'],
    ['chromeMac', 0, 'Chrome on Mac'],
    ['edgeWindows', 0, 'Edge on Windows'],
    ['firefoxWindows', 0, 'Firefox on Windows'],
    ['firefoxLinux', 0, 'Firefox on Linux'],
    ['chromeOS', 0, 'Chrome on ChromeOS'],
    ['edgeAndroid', 0, 'Edge on Android'],
    ['edgeIPhone', 5, 'Edge on iPhone'],
    ['firefoxIPhone', 5, 'Firefox on iPhone'],
    ['oldEdgeWindows', 0, 'Edge on Windows'],
    ['safariIPad', 5, 'Safari on iPad'],
  ])('names %s, with %i touch points, "%s"', (name, touchPoints, label) => {
    expect(browserLabel(UA[name], touchPoints)).toBe(label)
  })

  it('names one part alone, or nothing, when the rest is unknown', () => {
    expect(browserLabel('Mozilla/5.0 (Nintendo Switch) Safari/605.1.15')).toBe('Safari')
    expect(browserLabel('Mozilla/5.0 (Windows NT 10.0)')).toBe('Windows')
    expect(browserLabel('curl/8.4.0')).toBe('')
  })
})

describe("platformOf: the device, for the connected note (piece 5a §4.3)", () => {
  it.each([
    ['safariIPhone', 5, 'iPhone'],
    ['chromeIPhone', 5, 'iPhone'],
    ['safariIPad', 5, 'iPad'],
    // An iPad asks for the desktop site as a Mac, but has a touch screen.
    ['safariMac', 5, 'iPad'],
    ['safariMac', 0, 'Mac'],
    ['chromeAndroid', 5, 'Android'],
    ['firefoxAndroid', 5, 'Android'],
    ['chromeOS', 0, 'ChromeOS'],
    ['edgeWindows', 0, 'Windows'],
    ['firefoxLinux', 0, 'Linux'],
  ])('finds %s, with %i touch points, on %s', (name, touchPoints, platform) => {
    expect(platformOf(UA[name], touchPoints)).toBe(platform)
  })

  it('finds nothing in a user agent that names no device', () => {
    expect(platformOf('curl/8.4.0')).toBeNull()
  })
})
