import { describe, expect, it } from 'vitest'
import { chooseMapkitToken, SITE_TOKEN } from '../../src/map/appleMapToken'

describe('the MapKit JS token (Apple Maps spec §3)', () => {
  it('is the site’s domain-locked token, a MapKit JS token for crewluve.crewlu.net', () => {
    const claims = JSON.parse(atob(SITE_TOKEN.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    expect(claims).toMatchObject({ origin: 'crewluve.crewlu.net', scope: 'mapkit_js' })
    expect(claims.exp).toBeUndefined()
  })

  it('uses the local token only on the dev server, and only when there is one', () => {
    expect(chooseMapkitToken(true, 'local')).toBe('local')
    expect(chooseMapkitToken(true, '')).toBe(SITE_TOKEN)
    expect(chooseMapkitToken(true, undefined)).toBe(SITE_TOKEN)
    expect(chooseMapkitToken(false, 'local')).toBe(SITE_TOKEN)
  })
})
