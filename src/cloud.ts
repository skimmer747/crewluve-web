// The CrewLu Cloud project: the same URL and publishable key as the Flight Globe (crewlu-globe/src/supabase.ts).
// The publishable key is safe in a browser: it carries only the anon role, which Crewlu Cloud keeps out of the
// tables and the pilot RPCs. The partner RPCs answer only to an invite, a code or a device's own key (see
// supabase/partner-api.md in the CrewLu app's repository). The site calls four of them, all from
// src/partner/door.ts. vite.config.ts builds the CSP's connect-src from SUPABASE_URL and the door guard's list of
// those four, so the door and the CSP can't drift apart.
export const SUPABASE_URL = 'https://corxvurxpnrzekbxdgye.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1wBeBjIIvEmMygoM9vWA2A_ptocrFGM'
