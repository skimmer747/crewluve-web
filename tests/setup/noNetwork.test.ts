import https from 'node:https'
import { describe, expect, it } from 'vitest'
import { SUPABASE_URL } from '../../src/cloud'

// tests/setup/noNetwork.ts runs before every test file (vitest.config.ts), so these reach nothing.
describe('the test suite network guard', () => {
  it('refuses a fetch to CrewLu Cloud', async () => {
    await expect(fetch(`${SUPABASE_URL}/rest/v1/trips?select=id`)).rejects.toThrow(/Tests may not use the network/)
  })

  it('refuses a raw HTTPS request too', () => {
    expect(() => https.get(`${SUPABASE_URL}/auth/v1/user`)).toThrow(/Tests may not use the network/)
  })
})
