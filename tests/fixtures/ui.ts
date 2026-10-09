import { act } from '@testing-library/preact'
import { vi } from 'vitest'
import { ICON_PATHS, type IconName } from '../../src/icons/iconPaths'

/**
 * A hand-cranked animation-frame queue for components that animate with requestAnimationFrame.
 * Nothing runs until a test delivers a frame, so each test chooses the exact time every frame carries.
 * Undo it with vi.unstubAllGlobals() in afterEach.
 */
export function stubAnimationFrames() {
  const queue = new Map<number, FrameRequestCallback>()
  let nextId = 1
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextId++
    queue.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    queue.delete(id)
  })
  return {
    /** How many frames are waiting to run. */
    get pending() {
      return queue.size
    },
    /** Runs every waiting frame with this timestamp (ms), then lets Preact paint whatever they set. */
    async frame(time: number) {
      const due = [...queue.values()]
      queue.clear()
      await act(() => {
        for (const callback of due) callback(time)
      })
    },
  }
}

/** Which Phosphor icon an <Icon/> svg draws, found by matching its paths against the icon table. */
export function iconNameOf(svg: Element | null): IconName | null {
  if (!svg) return null
  const drawn = JSON.stringify([...svg.querySelectorAll('path')].map((path) => path.getAttribute('d')))
  return (Object.keys(ICON_PATHS) as IconName[]).find((name) => JSON.stringify(ICON_PATHS[name]) === drawn) ?? null
}
