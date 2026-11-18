import { useState } from 'preact/hooks'

/**
 * Where this browser remembers "Follow the plane" (the app's follow the plane design §2), the same for every trip, as
 * Quick layovers is: the card and the full map both follow it.
 */
const KEY = 'crewluve.tripMap.followsPlane'

/** Off, unless this browser turned it on. Storage that can't be read, as in a private window, reads as off. */
function readFollowsPlane(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on'
  } catch {
    return false
  }
}

/** Follow the plane, and a way to change it that this browser remembers. */
export function useFollowsPlane(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(readFollowsPlane)
  const remember = (value: boolean) => {
    setOn(value)
    try {
      localStorage.setItem(KEY, value ? 'on' : 'off')
    } catch {
      // Storage that can't be written: the choice lasts until the page closes.
    }
  }
  return [on, remember]
}
