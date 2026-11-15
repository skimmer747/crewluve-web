# The Website's Trip Map on Apple Maps (MapKit JS)

- **Status:** Live since 2026-11-14 (PR 1, `main` at `5251ca9`): Apple accepted the site's token on crewluve.crewlu.net and the console was clean. Written that day at Todd's "write the spec", after a localhost test page.
- **Amended:** 2026-11-14, when the app's newer trip map work (branch `trip-map-activity`: the activity markers, the colored timeline, Quick layovers, At base waits, the card's framing, tidier markers) was combined with Apple's map. The changes are in §4.2, §5 and §8.
- **Replaces:** moving map spec §11's own SVG world as the map the family sees. The SVG drawing stays as the fallback (§7). It also replaces §9.7 "No mapkit-token": the site now carries a MapKit JS token, and its security policy loosens for Apple's map.
- **Supersedes:** the NASA-tiles look (`docs/superpowers/specs/2026-11-14-trip-map-nasa-look-design.md`), which is shelved on the local branch `nasa-look-shelved`.

## 1. Why

The app's map is Apple's: sharp satellite with roads and names at every zoom, and pan and zoom by hand. Next to it the website's map looked poor, both the plain drawing and NASA's low-resolution tiles. Todd chose Apple's MapKit JS so the family sees the same map on the web.

## 2. What the test page showed (2026-11-14)

A throwaway page on the dev server confirmed:
- **The library:** MapKit JS 6.1.205 loads from Apple's CDN.
- **The token:** the site's domain-locked token is refused on localhost ("Origin does not match"), so local work uses a 7-day token with no restriction (§3).
- **Shapes and markers:** a route line, a custom-element plane marker and a translucent polygon all draw on the hybrid map. Reassigning the polygon's points every frame costs about 0.03 ms of script, and Todd watched it slide smoothly, with no flicker.
- **The security policy:** Apple's list works (§6). Inline styles are required. Blocking them left an empty grid, and MapKit adds more than one inline style, with different hashes, so allowing them by hash would break when Apple updates.

## 3. Loading MapKit JS, and the tokens

- **The loader:** the npm package `@apple/mapkit-loader` (MIT, about 30 KB), bundled with the site. It loads MapKit JS from Apple's CDN the first time a map is shown, never before, with the `full-map` library.
- **The site's token:** a MapKit JS token, domain-restricted to `crewluve.crewlu.net` with no expiration, kept in the code (`src/map/appleMapToken.ts`). A domain-locked token is meant to sit in page source; the repo being public is fine.
- **The local token:**
  - **What:** a MapKit JS token with no restriction. Apple makes these last 7 days, and Apple won't take `localhost` as a domain.
  - **Where:** in `.env.local`, which git ignores, as `VITE_MAPKIT_DEV_TOKEN`.
  - **How it's used:** the code reads it only behind `import.meta.env.DEV`, which a build replaces with `false`, so the minifier drops the branch.
  - **The build check:** a build plugin (`crewluve-no-dev-token`) fails the build if the token's text is in any file it writes, so no build can carry it, even one made on a Mac that has `.env.local`. (The config stays a plain object, as `tests/viteConfig.test.ts` reads it.)
  - **When it's missing or expired:** the dev server shows the fallback (§7). The site's token is used everywhere else.
- **Language:** `en-US`, as the site is.

## 4. What the family sees

### 4.1 The full map (`#map`)

- **Apple's map fills the screen**, under the same top bar, pill, facts panel and timeline as today. Nothing in the panel or timeline changes.
- **Pan and zoom by hand,** with Apple's zoom buttons. Rotation and tilt stay off, so north stays up as on the app's flat map.
- **A style button** sits at the top right, as in the app.
  - It cycles **Hybrid** (the default), **Map** (Apple's standard style) and **Satellite**, showing the current style's icon and name.
  - The choice is kept in this browser (`localStorage`, inside try/catch). The card uses it too.
- **A recenter button** appears once the person has moved the map, as in the app. It returns to the automatic framing (§5).
- **Apple's own marks stay:** the Apple Maps logo and its "Legal" link. The site adds no credit line.
- **Dark mode:** the Map style follows the system's light or dark setting (`colorScheme`). Hybrid and Satellite look the same in both, as in the app.

### 4.2 The card on the status page

- **The card shows Apple's map,** 220 px tall, in the kept style.
- **Framing:** the trip is framed in the band between the card's chips, by their measured height (`chipInsets`), and the view slides to keep the pilot's marker in that band, as on the SVG map and in the app. The same band is the map's padding, which keeps Apple's logo and Legal link above the bottom chip.
- **It doesn't pan or zoom:** scrolling, zooming and rotating are off, and Apple's controls are hidden. A tap anywhere opens the full map, as today.
- **Facts and accessibility are unchanged:** the chips, the bars and the one-sentence description for screen readers stay as they are.

## 5. The camera

- **Automatic framing** is the very view the SVG map takes (`appleCamera` in `src/map/appleMapPlan.ts`): `framingPoints` → `fitRect` → `fitClear`, then `slideToShow` for the pilot's marker. These are rectangles in Web Mercator's unit square, which MapKit's `MapRect` shares.
- **The room for the side panel or the card's chips:** MapKit is given the clear part's rectangle, with the insets as its `padding`, so the trip, Apple's logo and its controls all stay clear. When the clear part is under 120 px either way, MapKit gets the whole view and no padding.
- **When it frames again:** when the map opens, when the leg in motion changes (in a replay, leg to leg), and on Recenter.
  - The move is animated, and immediate under Reduce Motion.
  - A replay moves the planes, cars and night every frame. It moves the camera only when the leg changes.
- **Once the person pans or zooms,** the automatic framing stops and Recenter appears. Closing and reopening the map starts framed again.

## 6. The security policy (production build)

Todd approved the loosening on 2026-11-14. The policy becomes:
- **`script-src`:** `'self' https://cdn.apple-mapkit.com 'wasm-unsafe-eval'`. Inline scripts stay blocked.
- **`style-src`:** `'self' 'unsafe-inline'`.
- **`img-src`:** `'self' data: blob: https://*.apple-mapkit.com`.
- **`connect-src`:** today's addresses, plus `https://*.apple-mapkit.com blob:`.
- **`worker-src`:** `https://*.apple-mapkit.com blob:`.
- **`frame-src`:** `https://*.apple-mapkit.com`.
- **The rest** (`default-src`, `font-src`, `object-src`, `base-uri`, `form-action`) is unchanged.

**What this means:**
- Crewlu Cloud is still reachable only through the four partner addresses.
- The page may now also talk to Apple's map servers.
- Injected styles are no longer blocked.
- The comments in `vite.config.ts` and `tests/viteConfig.test.ts` say so.

**Privacy:**
- Apple sees which map areas a family member's browser shows, as the app already does with Apple's map.
- The page sends no names, keys or schedule. The token names only the site.
- The page keeps `referrer: no-referrer`.

## 7. The fallback: today's drawing

The SVG map (`TripMapSvg`) shows wherever Apple's map can't:
- while MapKit loads;
- if the loader or the token fails, or MapKit reports an error (`mapkit` `error` event);
- if the browser blocks it;
- in tests.

The page and the card work the same either way, without pan, zoom or a style button on the fallback. The night fix stays for the fallback.

## 8. Drawing on Apple's map

The same data as today: `tripMapDrawing(map, t)` and `nightLayers(t)`, drawn with MapKit.
- **Routes:**
  - one `PolylineOverlay` per segment, with great circles through `pointsAlong(…, 101)`;
  - styles as today: upcoming dashed blue, flying solid blue, flown grey, drives dotted grey;
  - updated in place (`points`, `style`) as the drawing changes.
- **Airports:** a custom-element annotation for each, the dot and code as today, styled from the site's own CSS. The dot sits exactly on the airport.
  - Where two would overlap (Louisville and Lexington, zoomed out), MapKit's own collision rules (`displayPriority`) show one, and zooming in shows both.
  - The leg's airports outrank the rest, and an airport only drives reach (a commuter's home) ranks lowest, so it's the one that gives way.
- **The plane, a car and the pilot's marker:** custom-element annotations.
  - The plane turns by its heading, and each moves by setting its `coordinate` every frame of a replay.
  - A car shows only while the pilot drives.
  - The pilot's marker shows what they're doing on the ground, where the heart was: a bed on a layover, an hourglass at a turn, a briefcase at base, a house at home, white on the activity's colour.
  - These three take no part in collisions (`AnnotationCollisionMode.None`): they sit on top of an airport by design, hide nothing and are never hidden.
- **The night:**
  - seven `PolygonOverlay`s, one per sun depth, each at today's opacity;
  - points reassigned every frame of a replay, and each minute live.
- **Across the date line:** lines are laid out in one piece (§11). Night shapes go as `nightLayers` makes them, with their points kept a hair off the date line (`offDateLine`, §11).

## 9. Code

- **`src/map/appleMapToken.ts`:** the site's token, and the choice between it and the dev token.
- **`src/map/appleMapStyle.ts`:** the three styles, their names and icons, the cycle, and the kept style (`readMapStyle` and `keepMapStyle`, with storage injected).
- **`src/map/appleMapPlan.ts`** (pure): from the drawing, the night and a style, what MapKit should show. That's each overlay's points and style, each annotation's place, kind and turn, and the camera's `MapRect` and padding. It holds every decision a test can check without MapKit.
- **`src/ui/AppleTripMap.tsx`:**
  - loads MapKit, creates the map once, and applies each plan in place, adding, updating or removing by id;
  - watches for the person's own pans and zooms;
  - shows `TripMapSvg` until the map is ready, and after any failure.
- **`src/ui/hooks/useAppleMapKit.ts`:** loads the library once per page and returns its state: loading, ready or failed.
- **`TripMapPage` and `TripMapCard`** render `AppleTripMap` where they render `TripMapSvg` today. The page adds the style and recenter buttons.

## 10. Tests and checks

- **Pure tests:**
  - the style cycle and storage;
  - the token choice: the dev token never in a build;
  - the plan for a drawing: segment styles and points, the night's seven layers, annotation kinds and the plane's turn, the camera rectangle and padding.
- **Component tests:** happy-dom with a small fake `mapkit` that records calls. The map is created once; a second render updates overlays in place rather than re-adding them; a user move shows Recenter and Recenter reframes; the style button cycles and keeps the choice; a loader failure shows the SVG.
- **The policy test:** the exact `script-src`, `style-src`, `img-src`, `connect-src`, `worker-src` and `frame-src`, and the four partner addresses still the only Crewlu Cloud ones.
- **In the browser:**
  - on the dev server with the local token: the full map and the card, wide and narrow, in all three styles, with a replay;
  - on the built site served locally: the policy holds and the fallback shows, because the site's token is refused on localhost, as expected;
  - Todd's look on the live site after merge.
- **Checks:** `npm test` and `npm run build`.

## 11. Settled on the test page (2026-11-14, before the plan)

- **The night:** a layer as wide as the world (all seven in November reach a pole, −180° to 180°) needs no split, but its points must stay off the date line (corrected 2026-11-14, after Todd saw lines of shade moving down from the top and up from the bottom during a replay).
  - **The fault:** MapKit takes 180° and −180° for the same edge. When the night is deep at the date line (morning in the Americas), it filled the world-wide shape inside-out: daylight shaded and night clear. The seven layers' edges swept up and down the map through the day.
  - **How it was missed:** the test page checked one moment only, 22:30 UTC, when the night is shallow at the date line and the fill comes out right.
  - **Measured:** at noon in Louisville, North America drew as 28 to 36% night. With the points at ±179.999° (`offDateLine`) it draws as none, and morning and evening both shade the right side.
  - It is subtle at 42%, the app's strength.
- **The date line:** a route must be laid out in one piece, each longitude within 180° of the one before, as `unwrapped` does. Then Anchorage to Tokyo curves the short way. Raw coordinates add a stray line across the whole world where they jump from 180° to −180°.
- **Moving annotations:** five annotations moved by setting `coordinate` each frame work. Their smoothness gets watched in the build, because the hidden browser pane doesn't animate.

## 12. Not in this change

- The app, which already has Apple's map.
- Live position data on the website.
- Look Around, search, points of interest, and directions.
- Turning the map by hand.
- Merging: this goes on its own branch, after PR 1.
