// The CrewLu Cloud project: the same URL and publishable key as the Flight Globe (crewlu-globe/src/supabase.ts).
// The publishable key is safe in a browser: the site calls only the four partner RPCs (src/partner/door.ts), and they
// answer only to a device's own key. vite.config.ts reads SUPABASE_URL for the CSP's connect-src, so the door and the
// CSP can't drift apart.
export const SUPABASE_URL = 'https://corxvurxpnrzekbxdgye.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1wBeBjIIvEmMygoM9vWA2A_ptocrFGM'
