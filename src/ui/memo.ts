import { Component, createElement, type ComponentType, type FunctionComponent } from 'preact'

/** Whether any prop differs from before, compared one by one by identity, as React's memo compares them. */
function changed(before: object, after: object): boolean {
  const was = before as Record<string, unknown>
  const is = after as Record<string, unknown>
  for (const key in was) if (!(key in is)) return true
  for (const key in is) if (was[key] !== is[key]) return true
  return false
}

/**
 * The component, drawn again only when one of its props has changed (redraws §4.1), as React's memo does. Its own
 * state and hooks still draw it again as they would. preact/compat's memo works the same way, through
 * shouldComponentUpdate, but brings the rest of compat with it. Unlike compat's, it doesn't pass a ref on: nothing
 * memoized here takes one.
 */
export function memo<P extends object>(Inner: FunctionComponent<P>): ComponentType<P> {
  return class Memo extends Component<P> {
    static displayName = `Memo(${Inner.displayName ?? Inner.name})`

    shouldComponentUpdate(next: Readonly<P>) {
      return changed(this.props, next)
    }

    render() {
      return createElement(Inner, this.props)
    }
  }
}
