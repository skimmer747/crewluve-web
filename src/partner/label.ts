/** The kind of device a browser runs on, as its user agent tells it. */
export type Platform = 'iPhone' | 'iPad' | 'Android' | 'ChromeOS' | 'Mac' | 'Windows' | 'Linux'

/**
 * This browser's device, or null when its user agent names none. The order matters: an iPad asking for the desktop
 * site says Macintosh, and only its touch screen tells it from a Mac; Android also says Linux.
 */
export function platformOf(userAgent: string, maxTouchPoints = 0): Platform | null {
  return /\biPhone\b/.test(userAgent) ? 'iPhone'
    : /\biPad\b/.test(userAgent) || (/\bMacintosh\b/.test(userAgent) && maxTouchPoints > 1) ? 'iPad'
      : /\bAndroid\b/.test(userAgent) ? 'Android'
        : /\bCrOS\b/.test(userAgent) ? 'ChromeOS'
          : /\bMacintosh\b/.test(userAgent) ? 'Mac'
            : /\bWindows\b/.test(userAgent) ? 'Windows'
              : /\bLinux\b/.test(userAgent) ? 'Linux'
                : null
}

/**
 * This browser's name in the pilot's list (piece 5a P5-6): "Chrome on Android", "Safari on iPhone". One part alone
 * when only one is known, and empty when neither is: the door then writes "Web browser". The order matters: Edge and
 * Samsung Internet also say Chrome, and Chrome also says Safari.
 */
export function browserLabel(userAgent: string, maxTouchPoints = 0): string {
  const browser = /\bEdg(e|A|iOS)?\//.test(userAgent) ? 'Edge'
    : /\bSamsungBrowser\//.test(userAgent) ? 'Samsung Internet'
      : /\b(Firefox|FxiOS)\//.test(userAgent) ? 'Firefox'
        : /\b(Chrome|CriOS)\//.test(userAgent) ? 'Chrome'
          : /\bSafari\//.test(userAgent) ? 'Safari'
            : null
  const platform = platformOf(userAgent, maxTouchPoints)
  if (browser && platform) return `${browser} on ${platform}`
  return browser ?? platform ?? ''
}
