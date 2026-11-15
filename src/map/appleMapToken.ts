/**
 * The MapKit JS tokens (Apple Maps spec §3). The site's is domain-restricted to crewluve.crewlu.net with no expiry, made
 * in the Apple Developer account on 2026-11-14: Apple refuses it on any other site, so it's safe in public code. Apple
 * won't take localhost as a domain, so the dev server uses a 7-day token with no restriction, kept in .env.local
 * (git-ignored) and read only behind `import.meta.env.DEV`, which a build drops. A build plugin in vite.config.ts fails
 * any build that carries it anyway.
 */
export const SITE_TOKEN =
  'eyJraWQiOiJVVUFYOVc0RzdEIiwidHlwIjoiSldUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJVVjk2WjgzQzdCIiwiaWF0IjoxNzk0NjgxNDEwLCJvcmlnaW4iOiJjcmV3bHV2ZS5jcmV3bHUubmV0Iiwic2NvcGUiOiJtYXBraXRfanMifQ.E3nMpZUcydMsdiWkYT4giJFp0PBOQYjHkOCr-Zy810xrGKJVISryNQJBZ_Atnh7vqReDlD7aSf8aOPlTEJIjWg'

/** The token to load MapKit JS with: the local one on the dev server when there is one, else the site's. */
export const chooseMapkitToken = (isDev: boolean, localToken: string | undefined): string => (isDev && localToken ? localToken : SITE_TOKEN)

/** This page's token. A build replaces `import.meta.env.DEV` with false, so the local token's branch is dropped. */
export const mapkitToken = (): string =>
  chooseMapkitToken(import.meta.env.DEV, import.meta.env.DEV ? import.meta.env.VITE_MAPKIT_DEV_TOKEN : undefined)
