import { load } from '@apple/mapkit-loader'
import { useEffect, useState } from 'preact/hooks'
import { mapkitToken } from '../../map/appleMapToken'
import type { MapKitApi } from '../../map/mapkitApi'

/** Loading MapKit JS once per page (Apple Maps spec §3, §7): loading, ready with the library, or failed. */
export type AppleMapKitState = { status: 'loading' } | { status: 'ready'; mapkit: MapKitApi } | { status: 'failed' }

export type MapKitLoader = () => Promise<MapKitApi>

/** Apple's loader with the token. In tests it refuses, so Apple's code never loads and the SVG map shows. */
const appleLoader: MapKitLoader = async () => {
  if (import.meta.env.MODE === 'test') throw new Error('MapKit JS is not loaded in tests')
  return (await load({ token: mapkitToken(), language: 'en-US', libraries: ['full-map'] })) as unknown as MapKitApi
}

let current: AppleMapKitState | null = null
const listeners = new Set<(state: AppleMapKitState) => void>()

function set(next: AppleMapKitState) {
  current = next
  for (const listener of listeners) listener(next)
}

/** Starts loading MapKit JS, once. A refused token arrives as MapKit's `error` event once it has loaded. */
export function startAppleMapKit(loader: MapKitLoader = appleLoader): void {
  if (current) return
  set({ status: 'loading' })
  loader().then(
    (mapkit) => {
      mapkit.addEventListener('error', () => set({ status: 'failed' }))
      if (current?.status === 'loading') set({ status: 'ready', mapkit })
    },
    () => set({ status: 'failed' }),
  )
}

/** For tests: forget the loaded library, so the next map loads it again. */
export function resetAppleMapKit(): void {
  current = null
  listeners.clear()
}

/** MapKit JS's state, loading it the first time a map asks. */
export function useAppleMapKit(): AppleMapKitState {
  const [state, setState] = useState<AppleMapKitState>(current ?? { status: 'loading' })
  useEffect(() => {
    listeners.add(setState)
    startAppleMapKit()
    if (current) setState(current)
    return () => {
      listeners.delete(setState)
    }
  }, [])
  return state
}
