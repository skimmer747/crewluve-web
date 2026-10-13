import type { IconName } from '../icons/iconPaths'
import type { ColorToken } from './colors'

/** FlightTrackingHelper's airline table, ICAO to IATA. It names airlines here, and read backwards it gives the tracking links. */
const ICAO_TO_IATA: Record<string, string> = {
  UPS: '5X', FDX: 'FX', AAL: 'AA', DAL: 'DL', UAL: 'UA', SWA: 'WN', JBU: 'B6', NKS: 'NK',
  FFT: 'F9', ASA: 'AS', HAL: 'HA', SKW: 'OO', RPA: 'YX', ENY: 'MQ', PSA: 'OH',
}

/** The same table read backwards, as the app's FlightTrackingHelper builds its iataToICAO. */
const IATA_TO_ICAO: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(ICAO_TO_IATA).map(([icao, iata]) => [iata, icao]),
)

const NAMES: Record<string, string> = {
  WN: 'Southwest', AA: 'American', DL: 'Delta', UA: 'United', B6: 'JetBlue', AS: 'Alaska', NK: 'Spirit',
  F9: 'Frontier', G4: 'Allegiant', MX: 'Breeze', HA: 'Hawaiian', XP: 'Avelo', SY: 'Sun Country',
  FX: 'FedEx', '5X': 'UPS', '5Y': 'Atlas Air', GG: 'Air Cargo Germany', K4: 'Kalitta', PO: 'Polar Air', GT: 'Air Inuit',
  AC: 'Air Canada', LH: 'Lufthansa', BA: 'British Airways', AF: 'Air France', CX: 'Cathay Pacific', KL: 'KLM',
  QF: 'Qantas', EK: 'Emirates', SQ: 'Singapore',
  NH: 'ANA', JL: 'Japan Airlines', KE: 'Korean Air', OZ: 'Asiana', CI: 'China Airlines', BR: 'EVA Air',
  TG: 'Thai Airways', MH: 'Malaysia',
  QR: 'Qatar', EY: 'Etihad', TK: 'Turkish',
  LX: 'Swiss', OS: 'Austrian', AZ: 'ITA Airways', IB: 'Iberia', SK: 'SAS', AY: 'Finnair', EI: 'Aer Lingus',
  VS: 'Virgin Atlantic', VA: 'Virgin Australia', NZ: 'Air New Zealand',
  AM: 'Aeromexico', LA: 'LATAM', CM: 'Copa', AV: 'Avianca',
  OO: 'SkyWest', YX: 'Republic', '9E': 'Endeavor', QX: 'Horizon', ZW: 'Air Wisconsin', MQ: 'Envoy', OH: 'PSA',
  CP: 'Compass', G7: 'GoJet', AX: 'Trans States',
}

// SF Symbol → Phosphor: heart.fill Heart, triangle.fill Triangle, star.fill Star, globe.americas.fill
// GlobeHemisphereWest, airplane.circle.fill AirplaneTilt, mountain.2.fill Mountains, dollarsign.circle.fill
// CurrencyCircleDollar, leaf.fill Leaf, sun.max.fill Sun, wind Wind, bird.fill Bird, shippingbox.fill Package,
// crown.fill Crown, hare.fill Rabbit, sparkles Sparkle, circle.lefthalf.filled CircleHalf,
// globe.asia.australia.fill GlobeHemisphereEast, diamond.fill Diamond, plus Plus, chevron.up.chevron.down
// CaretUpDown, sailboat.fill Sailboat, pawprint.fill PawPrint, location.north.fill NavigationArrow.
// UPS breaks from the app on purpose: the app gives it shippingbox.fill, and the site the tilted plane the user chose
// (UPS plane icon spec, decision 1). FedEx keeps the box.
const SYMBOLS: Record<string, IconName> = {
  WN: 'Heart', DL: 'Triangle', AA: 'Star', UA: 'GlobeHemisphereWest', B6: 'AirplaneTilt', AS: 'Mountains',
  NK: 'CurrencyCircleDollar', F9: 'Leaf', G4: 'Sun', MX: 'Wind', HA: 'Leaf', XP: 'Bird', SY: 'Sun',
  FX: 'Package', '5X': 'AirplaneTilt', AC: 'Leaf', LH: 'Bird', BA: 'Crown', AF: 'AirplaneTilt', CX: 'Bird',
  KL: 'Crown', QF: 'Rabbit', EK: 'Sparkle', SQ: 'Bird', NH: 'AirplaneTilt', JL: 'Bird', KE: 'CircleHalf',
  OZ: 'AirplaneTilt', CI: 'Leaf', BR: 'GlobeHemisphereEast', TG: 'Leaf', MH: 'Diamond', QR: 'Rabbit',
  EY: 'Bird', TK: 'Bird', LX: 'Plus', OS: 'CaretUpDown', SK: 'Sailboat', EI: 'Leaf', VS: 'Sparkle',
  VA: 'Sparkle', NZ: 'Leaf', AM: 'Bird', CM: 'Star', AV: 'Bird', QX: 'Mountains', MQ: 'Star', OH: 'Star',
  CP: 'NavigationArrow', '5Y': 'GlobeHemisphereWest', PO: 'PawPrint',
}

const RGB: Record<string, [number, number, number]> = {
  WN: [1.0, 0.5, 0.0], AA: [0.0, 0.2, 0.5], DL: [0.0, 0.15, 0.4], UA: [0.0, 0.45, 0.7], B6: [0.0, 0.35, 0.65],
  AS: [0.0, 0.3, 0.5], NK: [1.0, 0.8, 0.0], F9: [0.0, 0.5, 0.3], G4: [1.0, 0.5, 0.0], SY: [1.0, 0.4, 0.0],
  MX: [0.0, 0.7, 0.7], HA: [0.5, 0.0, 0.5], XP: [1.0, 0.8, 0.0],
  FX: [0.5, 0.0, 0.5], K4: [0.8, 0.0, 0.0], '5Y': [0.0, 0.2, 0.6], GG: [0.5, 0.5, 0.5],
  AC: [0.8, 0.0, 0.0], LH: [0.0, 0.1, 0.4], BA: [0.0, 0.2, 0.5], AF: [0.0, 0.3, 0.5], CX: [0.0, 0.5, 0.4],
  KL: [0.0, 0.6, 0.9], QF: [0.9, 0.0, 0.0], EK: [0.9, 0.0, 0.2], SQ: [0.0, 0.2, 0.5],
  NH: [0.0, 0.27, 0.5], JL: [0.79, 0.15, 0.18], KE: [0.0, 0.39, 0.82], OZ: [0.93, 0.11, 0.14],
  CI: [0.4, 0.0, 0.4], BR: [0.0, 0.65, 0.32], TG: [0.36, 0.18, 0.57], MH: [0.0, 0.2, 0.4],
  QR: [0.36, 0.02, 0.2], EY: [0.77, 0.65, 0.47], TK: [0.78, 0.05, 0.19],
  LX: [0.84, 0.1, 0.13], OS: [0.89, 0.02, 0.08], AZ: [0.0, 0.2, 0.6], IB: [0.85, 0.12, 0.02],
  SK: [0.0, 0.0, 0.5], AY: [0.04, 0.06, 0.38], EI: [0.0, 0.42, 0.33], VS: [0.88, 0.04, 0.04], VA: [0.6, 0.0, 0.2],
  NZ: [0.0, 0.71, 0.68],
  AM: [0.0, 0.15, 0.3], LA: [0.11, 0.06, 0.42], CM: [0.0, 0.22, 0.46], AV: [0.89, 0.02, 0.08],
  OO: [0.0, 0.3, 0.6], YX: [0.0, 0.3, 0.5], '9E': [0.0, 0.2, 0.4], QX: [0.0, 0.5, 0.3], ZW: [0.8, 0.0, 0.2],
  MQ: [0.0, 0.2, 0.5], OH: [0.0, 0.2, 0.5], CP: [0.0, 0.15, 0.4], G7: [0.0, 0.45, 0.7], AX: [0.0, 0.3, 0.5],
  PO: [0.0, 0.3, 0.6], GT: [0.8, 0.0, 0.0],
}

const toHex = ([r, g, b]: [number, number, number]) =>
  `#${[r, g, b].map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}` as const

/** The IATA code for an airline code entered either way ("UPS" → "5X", "dl" → "DL"); a code the table hasn't got stays. */
export function airlineIata(code: string): string {
  return ICAO_TO_IATA[code.trim().toUpperCase()] ?? code.trim().toUpperCase()
}

/** The ICAO code the tracking sites use for an IATA airline code ("5X" → "UPS"), or null when the table hasn't got it. */
export function airlineIcao(code: string): string | null {
  return IATA_TO_ICAO[code.trim().toUpperCase()] ?? null
}

// In the three lookups below, a blank code (null, empty or only whitespace) means "no airline code".
export function airlineName(code: string | null): string {
  if (!code?.trim()) return 'Commercial'
  const c = airlineIata(code)
  return NAMES[c] ?? c
}

export function airlineIcon(code: string | null): IconName {
  if (!code?.trim()) return 'Airplane'
  return SYMBOLS[airlineIata(code)] ?? 'Airplane'
}

export function airlineColor(code: string | null): ColorToken {
  if (!code?.trim()) return 'blue'
  const c = airlineIata(code)
  if (c === '5X') return 'ups' // #663300 light, #E09E33 dark (the only theme-aware brand color)
  const rgb = RGB[c]
  return rgb ? (toHex(rgb) as ColorToken) : 'blue'
}

/** {FL}: " on UPS flight 2961"; empty when there is no usable (all-digit) flight number. */
export function flightPhrase(airline: string | null, number: string | null): string {
  return number && /^\d+$/.test(number) ? ` on ${airlineName(airline)} flight ${number}` : ''
}
