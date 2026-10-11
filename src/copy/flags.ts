/**
 * The countries the Crewluve app shows a flag for (countryFlags in AirportDataProvider.swift), by the airport list's
 * country name, with their two-letter ISO codes. The list's names already follow the app's spellings (slice 2A §6).
 * There's none for the US, or for countries the app has no flag for.
 */
const FLAG_REGIONS = new Map<string, string>([
  ['Canada', 'CA'], ['Mexico', 'MX'], ['Germany', 'DE'], ['China', 'CN'], ['UK', 'GB'], ['Puerto Rico', 'PR'],
  ['South Korea', 'KR'], ['Japan', 'JP'], ['Taiwan', 'TW'], ['Singapore', 'SG'], ['Thailand', 'TH'], ['India', 'IN'],
  ['UAE', 'AE'], ['France', 'FR'], ['Netherlands', 'NL'], ['Belgium', 'BE'], ['Spain', 'ES'], ['Italy', 'IT'],
  ['US Virgin Islands', 'VI'], ['Bahamas', 'BS'], ['Jamaica', 'JM'], ['Aruba', 'AW'], ['Curaçao', 'CW'],
  ['Sint Maarten', 'SX'], ['Barbados', 'BB'], ['Trinidad and Tobago', 'TT'], ['Dominican Republic', 'DO'],
  ['Turks and Caicos', 'TC'], ['Cayman Islands', 'KY'], ['Panama', 'PA'], ['Costa Rica', 'CR'], ['Guatemala', 'GT'],
  ['El Salvador', 'SV'], ['Honduras', 'HN'], ['Nicaragua', 'NI'], ['Belize', 'BZ'], ['Colombia', 'CO'],
  ['Brazil', 'BR'], ['Argentina', 'AR'], ['Chile', 'CL'], ['Peru', 'PE'], ['Ecuador', 'EC'], ['Venezuela', 'VE'],
  ['Uruguay', 'UY'], ['Malaysia', 'MY'], ['Philippines', 'PH'], ['Indonesia', 'ID'], ['Vietnam', 'VN'], ['Qatar', 'QA'],
  ['Israel', 'IL'], ['Switzerland', 'CH'], ['Austria', 'AT'], ['Denmark', 'DK'], ['Sweden', 'SE'], ['Norway', 'NO'],
  ['Finland', 'FI'], ['Ireland', 'IE'], ['Poland', 'PL'], ['Czech Republic', 'CZ'], ['Hungary', 'HU'], ['Turkey', 'TR'],
  ['Greece', 'GR'], ['Portugal', 'PT'], ['Australia', 'AU'], ['New Zealand', 'NZ'], ['South Africa', 'ZA'],
  ['Kenya', 'KE'], ['Ethiopia', 'ET'], ['Nigeria', 'NG'], ['Egypt', 'EG'], ['Bangladesh', 'BD'], ['Sri Lanka', 'LK'],
  ['Bahrain', 'BH'], ['Jordan', 'JO'],
])

/** Every country with a flag, by the airport list's name. */
export const FLAG_COUNTRIES: readonly string[] = [...FLAG_REGIONS.keys()]

/** The country's flag emoji, made of its two regional-indicator letters, or null when the app shows none. */
export function countryFlag(country: string | null | undefined): string | null {
  const region = country ? FLAG_REGIONS.get(country) : undefined
  return region ? String.fromCodePoint(...[...region].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65)) : null
}
