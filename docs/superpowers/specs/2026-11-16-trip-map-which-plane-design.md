# The Trip Map: Which Plane Is Which

- **Status:** Design approved in brainstorming on 2026-11-16, during plan 3C-2's Task 10 (Todd's look at the demo scenes). The website's half goes into plan 3C-2 (`docs/superpowers/plans/2026-11-16-moving-map-stage3c2-website-map.md`) as a new task before its whole-branch review. The app's half comes later, in its own small plan in the Crewluv repo (§6).
- **Adds to:** the Stage 3 spec (Crewluv repo, `docs/superpowers/specs/2026-11-14-crewluve-moving-map-stage3-live-design.md`), §5.4 (the ghost) and §15 (accessibility). Until the app has it, this is a deliberate difference between the website and the app.

## 1. The problem

In the demo scene `live-on-ground-late`, the full map showed the real plane at the gate in Rockford and its ghost over Wisconsin. Todd couldn't tell them apart: "It's not sure which plane is which, the scheduled or the real time." Both are a plane in a circle of the same size. The real plane is a filled blue circle, and the ghost a dashed outline. Nothing on the map says which is which.

## 2. The key

- **What it says:** the real plane's mark beside "Real plane", and the ghost's mark beside "On schedule". Each mark is drawn as on the map: a filled blue circle with a white border, and a dashed outline.
- **When it shows:** while the map draws both a real plane and its ghost. That's now, never in a replay, for a flight Crewlu Cloud has seen on the ground at its departure airport, in the air, or estimated (spec §5.1). It doesn't show for a flight with no live data, a landed plane, or a plane down somewhere else, since none of them has a ghost.
- **Where:**
  - On the status page's card: the map's top-right corner.
  - On the full map: the top-right corner, under the Recenter and map-style buttons.
- **On both maps:** the same key, the same words and the same place, on Apple's map and the site's own. It's drawn in the look of the full map's buttons, in light and dark.
- **It takes no taps.** The card stays a link to the full map.
- **Screen readers:** the key describes the map's picture, which is hidden from screen readers. So it's hidden too. The card's sentence already says where the real plane is and how far ahead or behind it is (spec §15).

## 3. The popup

- **Where:** the full map only, on Apple's map and the site's own.
- **On which planes:** the real plane and the ghost. A flight with no live data draws one plane, the schedule's, which gets no popup.
- **How it opens and closes:**
  - With a mouse or trackpad: the pointer over a plane opens its popup, and it closes when the pointer leaves.
  - On a touch screen: a tap on a plane opens it. A tap anywhere else on the map closes it, and a tap on the other plane moves it there.
  - One popup at a time.
  - It closes when its plane is no longer drawn: the leg ends, or, for the ghost, the plane lands. It also closes when a replay starts or stops, since what it says changes.
- **It moves with its plane,** just above the plane's mark, and its words change as the map's do, every second.
- **The words** (Todd, 16 Nov 2026), by what the map draws. Each popup is a title and one or two lines.

| The plane | Title | Lines |
|---|---|---|
| The ghost | On schedule | Where {flight} would be if it were on time |
| The real plane, on the ground at its departure airport | {flight} · real plane | {label} / Lands {about}{landing} |
| The real plane, in the air | {flight} · real plane | {label} / Lands {about}{landing} |
| The real plane, estimated (faded) | {flight} · best guess | Not seen since {seen}, so it's drawn where it should be by now / {label} · lands {about}{landing} |
| The real plane, landed | {flight} · real plane | {label} / Reaches the gate {about}{landing} |
| The real plane, down somewhere else | {flight} · real plane | {label}, if it has one |
| The real plane in a replay | {flight} · real plane | Where it was at {moment} |

  - `{flight}` is the leg's flight number as the card's bar shows it (`MapLeg.flightNumber`, such as "UPS2963"), or "the flight" when it has none.
  - `{label}` is the words on the card's bar and the full map's pill (`liveLabelText`), such as "10 min ahead", "Still on the ground · 23 min behind", "About 20 min behind" or "Landed 12 min late". A real plane with no label leaves that line out.
  - `{about}` is "about " when the landing time is the real plane's estimate (`about(leg)`, spec §9), and nothing otherwise.
  - `{landing}` is the leg's real end (`MapLeg.end`).
  - `{seen}` is the time of the real plane's last fix.
  - `{moment}` is the replay's moment.
  - Times are in the viewer's time zone and clock (12- or 24-hour), as on the bar.

## 4. How it's built

- **The words** are one pure function in `src/copy/`. It takes the leg, which plane, the moment, whether it's a replay, and the viewer's time zone and clock. It returns the title and lines. Nothing else writes them.
- **Which planes are drawn** is already the drawing's: `TripMapDrawing.realPlane` and `.ghost`. The key shows when both are there. The popup's plane is whichever of the two was pointed at or tapped, and it closes when that one goes.
- **One key and one popup,** each a small Preact component styled in `src/styles/tripMap.css`, shared by both maps.
- **Each map says which plane is under the pointer or the finger, and where.**
  - On Apple's map: the two planes' marks are already HTML elements, so they take the pointer and the tap themselves.
  - On the site's own map: the same is done on the two plane badges. The rest of that map takes no pointer.
- **Not MapKit JS's own callout.** It would look different from the site's own map, which has none. And it doesn't open on pointing.
- **Unchanged:** nothing calls the network, there's no `innerHTML`, and the card's map takes no pointer.

## 5. How it's tested

- **The words:** every row of §3's table, with the made-up flights the tests already use, in each phase, now and in a replay. Also: "about" only on an estimate, no label line for a plane with none, and both clocks.
- **The key:** shown with both planes, on the card and the full map, on both maps. Hidden in a replay, for a flight with no live data, and once the plane has landed.
- **The popup:** on both maps (Apple's through the tests' stand-in for MapKit):
  - It opens on pointing and on a tap, and closes when the pointer leaves or on a tap elsewhere.
  - A tap on the other plane moves it.
  - It follows its plane from one draw to the next.
  - It closes when its plane goes.
- **A flight with no live data** draws and reads as before. Every test there before passes unchanged.
- **Deliberate breaks** in the new code, each caught by a test, as in plan 3C-2.
- **Todd's look** at the demo scenes again, on Apple's map and the site's own, on a computer and a phone.

## 6. The app

The app gets the same key and popup, with the same words, in its own small plan in the Crewluv repo after this one. It has no pointer, so its popup opens on a tap. Until then, plan 3C-2's list of where the website differs from the app gains this.

## 7. Not in this design

- The plane's height and speed, and "last seen near …": plan 3C-3's row about the plane.
- A popup on an airport, the pilot's marker, or the schedule's own plane.
