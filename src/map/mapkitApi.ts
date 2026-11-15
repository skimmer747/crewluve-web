/**
 * The part of MapKit JS the trip map uses (Apple Maps spec §8, §9), as types. The real `mapkit` from
 * @apple/mapkit-loader has all of it, and tests pass a fake with the same shape (tests/fixtures/fakeMapKit.ts).
 */
export interface MkCoordinate {
  latitude: number
  longitude: number
}

export interface MkStyle {
  strokeColor?: string
  strokeOpacity?: number
  lineWidth?: number
  lineDash?: number[]
  lineCap?: string
  fillColor?: string
  fillOpacity?: number
}

export interface MkPolyline {
  points: MkCoordinate[]
  style: MkStyle
}

export interface MkPolygon {
  points: MkCoordinate[][]
  style: MkStyle
}

export interface MkAnnotation {
  coordinate: MkCoordinate
  displayPriority: number
}

export interface MkMap {
  mapType: string
  colorScheme: string
  padding: unknown
  addOverlay(overlay: MkPolyline | MkPolygon): void
  removeOverlay(overlay: MkPolyline | MkPolygon): void
  addAnnotation(annotation: MkAnnotation): void
  removeAnnotation(annotation: MkAnnotation): void
  setVisibleMapRectAnimated(rect: unknown, animated: boolean): void
  addEventListener(type: string, listener: () => void): void
  destroy(): void
}

export interface MapKitApi {
  Map: new (parent: HTMLElement, options: Record<string, unknown>) => MkMap
  Coordinate: new (latitude: number, longitude: number) => MkCoordinate
  MapRect: new (x: number, y: number, width: number, height: number) => unknown
  Padding: new (top: number, right: number, bottom: number, left: number) => unknown
  Style: new (options: MkStyle) => MkStyle
  PolylineOverlay: new (points: MkCoordinate[], options: { style: MkStyle }) => MkPolyline
  PolygonOverlay: new (points: MkCoordinate[][], options: { style: MkStyle }) => MkPolygon
  Annotation: new (coordinate: MkCoordinate, factory: () => HTMLElement, options: { displayPriority: number; collisionMode: string }) => MkAnnotation
  /** MapKit JS 6's name; `Annotation.CollisionMode` is deprecated and logs a warning. */
  AnnotationCollisionMode: { Circle: string }
  MapType: { Hybrid: string; Standard: string; Satellite: string }
  ColorScheme: { Light: string; Dark: string }
  FeatureVisibility: { Hidden: string }
  addEventListener(type: 'error', listener: (event: { status?: string }) => void): void
}
