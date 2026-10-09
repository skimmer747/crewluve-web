// The CrewLu Cloud project: the same URL and publishable key as the Flight Globe (crewlu-globe/src/supabase.ts).
// The publishable key is safe in a browser: row-level security limits every query to the signed-in pilot.
// vite.config.ts reads SUPABASE_URL for the CSP's connect-src, so the client and the CSP can't drift apart.
export const SUPABASE_URL = 'https://corxvurxpnrzekbxdgye.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1wBeBjIIvEmMygoM9vWA2A_ptocrFGM'
