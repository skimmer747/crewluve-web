import { useState } from 'preact/hooks'

/** Where this browser remembers Quick layovers (activity markers design §3.1), the same for every trip. */
const KEY = 'crewluve.tripMap.quickLayovers'

/** On, unless this browser turned it off. Storage that can't be read, as in a private window, reads as on. */
function readQuickLayovers(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

/** Quick layovers, and a way to change it that this browser remembers. */
export function useQuickLayovers(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(readQuickLayovers)
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
