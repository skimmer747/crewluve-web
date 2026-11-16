/**
 * An aircraft's name from the type code it broadcasts (Stage 3 spec §8), as the app's AircraftTypeNames: "Boeing
 * 767-300" for "B763". The codes are ICAO's type designators (Doc 8643), for the airliners and freighters a pilot's
 * family is likely to see. The table is the app's, copied as it is.
 */

/** The names by code. A Map, so a code is only ever one of these, never a word every object has. */
const NAMES = new Map<string, string>(Object.entries({
  // Airbus
  A306: 'Airbus A300-600', A30B: 'Airbus A300', A310: 'Airbus A310',
  A318: 'Airbus A318', A319: 'Airbus A319', A320: 'Airbus A320', A321: 'Airbus A321',
  A19N: 'Airbus A319neo', A20N: 'Airbus A320neo', A21N: 'Airbus A321neo',
  A332: 'Airbus A330-200', A333: 'Airbus A330-300', A338: 'Airbus A330-800', A339: 'Airbus A330-900',
  A342: 'Airbus A340-200', A343: 'Airbus A340-300', A345: 'Airbus A340-500', A346: 'Airbus A340-600',
  A359: 'Airbus A350-900', A35K: 'Airbus A350-1000', A388: 'Airbus A380',
  BCS1: 'Airbus A220-100', BCS3: 'Airbus A220-300',
  // Boeing
  B712: 'Boeing 717',
  B722: 'Boeing 727-200',
  B733: 'Boeing 737-300', B734: 'Boeing 737-400', B735: 'Boeing 737-500', B736: 'Boeing 737-600',
  B737: 'Boeing 737-700', B738: 'Boeing 737-800', B739: 'Boeing 737-900',
  B37M: 'Boeing 737 MAX 7', B38M: 'Boeing 737 MAX 8', B39M: 'Boeing 737 MAX 9', B3XM: 'Boeing 737 MAX 10',
  B742: 'Boeing 747-200', B744: 'Boeing 747-400', B748: 'Boeing 747-8',
  B752: 'Boeing 757-200', B753: 'Boeing 757-300',
  B762: 'Boeing 767-200', B763: 'Boeing 767-300', B764: 'Boeing 767-400',
  // B77L is one code for the 777-200LR and the 777 Freighter, which is built on it: "777-200" is true of both.
  B772: 'Boeing 777-200', B77L: 'Boeing 777-200', B773: 'Boeing 777-300', B77W: 'Boeing 777-300ER',
  B778: 'Boeing 777-8', B779: 'Boeing 777-9',
  B788: 'Boeing 787-8', B789: 'Boeing 787-9', B78X: 'Boeing 787-10',
  // McDonnell Douglas
  DC10: 'McDonnell Douglas DC-10', MD11: 'McDonnell Douglas MD-11',
  MD82: 'McDonnell Douglas MD-82', MD83: 'McDonnell Douglas MD-83', MD88: 'McDonnell Douglas MD-88',
  MD90: 'McDonnell Douglas MD-90',
  // Embraer
  E135: 'Embraer ERJ 135', E145: 'Embraer ERJ 145', E45X: 'Embraer ERJ 145',
  E170: 'Embraer 170', E75L: 'Embraer 175', E75S: 'Embraer 175',
  E190: 'Embraer 190', E195: 'Embraer 195', E290: 'Embraer E190-E2', E295: 'Embraer E195-E2',
  // Bombardier and De Havilland Canada
  CRJ2: 'Bombardier CRJ200', CRJ7: 'Bombardier CRJ700', CRJ9: 'Bombardier CRJ900', CRJX: 'Bombardier CRJ1000',
  DH8C: 'De Havilland Dash 8-300', DH8D: 'De Havilland Dash 8-400',
  // ATR and the feeders
  AT43: 'ATR 42', AT45: 'ATR 42', AT46: 'ATR 42-600',
  AT72: 'ATR 72', AT75: 'ATR 72', AT76: 'ATR 72-600',
  C208: 'Cessna Caravan', SF34: 'Saab 340', B190: 'Beechcraft 1900',
}))

/** "Boeing 767-300" for "B763" or " b763 ", or the code itself, in capitals, when it isn't one of these: "ZZZZ". */
export function aircraftTypeName(typeCode: string): string {
  const code = typeCode.trim().toUpperCase()
  return NAMES.get(code) ?? code
}
