import { buildAirportIndex } from '../../src/data/airports'

/** A small, fixed airport index so copy/UI tests don't depend on the generated file. */
export const testAirports = buildAirportIndex([
  ['SDF', 'Louisville', 'USA', 38.1746, -85.7382, 'America/Kentucky/Louisville'],
  ['LEX', 'Lexington', 'USA', 38.0365, -84.6059, 'America/New_York'],
  ['RFD', 'Rockford', 'USA', 42.1954, -89.0972, 'America/Chicago'],
  ['ANC', 'Anchorage', 'USA', 61.1744, -149.9983, 'America/Anchorage'],
  ['MIA', 'Miami', 'USA', 25.7959, -80.2871, 'America/New_York'],
  ['MCO', 'Orlando', 'USA', 28.4312, -81.3081, 'America/New_York'],
  ['ONT', 'Ontario', 'USA', 34.056, -117.6012, 'America/Los_Angeles'],
  ['HNL', 'Honolulu', 'USA', 21.3245, -157.9251, 'Pacific/Honolulu'],
  ['ATL', 'Atlanta', 'USA', 33.6407, -84.4277, 'America/New_York'],
])
