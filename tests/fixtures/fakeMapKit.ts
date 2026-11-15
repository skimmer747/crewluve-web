/**
 * A fake `mapkit` for component tests (Apple Maps plan, Task 4): the classes the site uses, recording what's done to
 * them, and `fire` to send an event. Apple's real code never loads in tests.
 */
type Listener = (event: Record<string, unknown>) => void

class Coordinate {
  constructor(public latitude: number, public longitude: number) {}
}
class MapRect {
  constructor(public x: number, public y: number, public width: number, public height: number) {}
}
class Padding {
  constructor(public top: number, public right: number, public bottom: number, public left: number) {}
}
class Style {
  constructor(options: Record<string, unknown>) {
    Object.assign(this, options)
  }
}
class Overlay {
  visible = true
  constructor(public points: unknown, public options: { style: unknown }) {}
  get style() {
    return this.options.style
  }
  set style(style: unknown) {
    this.options.style = style
  }
}
class PolylineOverlay extends Overlay {}
class PolygonOverlay extends Overlay {}
class Annotation {
  element: HTMLElement
  displayPriority: number
  constructor(public coordinate: Coordinate, factory: () => HTMLElement, options: { displayPriority?: number } = {}) {
    this.element = factory()
    this.displayPriority = options.displayPriority ?? 0
  }
}

export interface FakeMap {
  options: Record<string, unknown>
  overlays: Overlay[]
  annotations: Annotation[]
  rects: { rect: MapRect; animated: boolean }[]
  destroyed: boolean
  mapType: string
  colorScheme: string
  padding: Padding | null
  fire(type: string): void
}

export function fakeMapKit() {
  const listeners = new Map<string, Listener[]>()
  const maps: FakeMap[] = []
  class FakeMapClass implements FakeMap {
    overlays: Overlay[] = []
    annotations: Annotation[] = []
    rects: { rect: MapRect; animated: boolean }[] = []
    destroyed = false
    mapType: string
    colorScheme: string
    padding: Padding | null = null
    private events = new Map<string, (() => void)[]>()
    constructor(public parent: HTMLElement, public options: Record<string, unknown> = {}) {
      this.mapType = String(options.mapType ?? 'standard')
      this.colorScheme = String(options.colorScheme ?? 'light')
      maps.push(this)
    }
    addOverlay(o: Overlay) {
      this.overlays.push(o)
    }
    removeOverlay(o: Overlay) {
      this.overlays = this.overlays.filter((x) => x !== o)
    }
    addAnnotation(a: Annotation) {
      this.annotations.push(a)
    }
    removeAnnotation(a: Annotation) {
      this.annotations = this.annotations.filter((x) => x !== a)
    }
    setVisibleMapRectAnimated(rect: MapRect, animated: boolean) {
      this.rects.push({ rect, animated })
    }
    addEventListener(type: string, listener: () => void) {
      this.events.set(type, [...(this.events.get(type) ?? []), listener])
    }
    destroy() {
      this.destroyed = true
    }
    fire(type: string) {
      for (const l of this.events.get(type) ?? []) l()
    }
  }
  return {
    maps,
    Map: FakeMapClass,
    Coordinate,
    MapRect,
    Padding,
    Style,
    PolylineOverlay,
    PolygonOverlay,
    Annotation,
    // MapKit JS 6 moved this from `Annotation.CollisionMode`, which now logs a deprecation warning.
    AnnotationCollisionMode: { Circle: 'circle', Rectangle: 'rectangle', None: 'none' },
    MapType: { Hybrid: 'hybrid', Standard: 'standard', Satellite: 'satellite' },
    ColorScheme: { Light: 'light', Dark: 'dark' },
    FeatureVisibility: { Hidden: 'hidden', Visible: 'visible', Adaptive: 'adaptive' },
    addEventListener(type: string, listener: Listener) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener])
    },
    fire(type: string, event: Record<string, unknown> = {}) {
      for (const l of listeners.get(type) ?? []) l(event)
    },
  }
}
