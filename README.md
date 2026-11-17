# Crewluve Web

The Crewluve app's "Where's {Name}?" screen, and its Schedule, as a website for pilots' families.
A partner connects with the invite link their pilot sends from CrewLu, or with a code from Crewluve on another device; there's no password.
The site shows what CrewLu shares with that partner, and changes nothing but its own connection (joining and Disconnect).

- Live: https://crewluve.crewlu.net
- Demo: https://crewluve.crewlu.net/?demo=1 (add `&scene=layover`, `last-leg`, `home`, `commuting-home`, `nothing-ahead`, `recap`, …)
- Schedule: add `#schedule` to either address, or tap a card with a chevron.
- Trip map: the card on every scene with a trip; tap it, or add `#map`, for the full map with the trip's facts. `recap` shows the recap card the evening after a trip. The map is Apple's (MapKit JS), with the site's own drawing as the fallback: docs/superpowers/specs/2026-11-14-trip-map-apple-maps-design.md
  - A marker shows what the pilot is doing on the ground: a bed on a layover (`layover`), an hourglass at a turn (`turn`), a briefcase at base (`base`), a house at home (`home`).
  - The real plane, from Crewlu Cloud's `partner_live` (Stage 3): `live-ahead` (in the air, ahead of schedule), `live-ocean-gap` (faded, an estimate past a stretch nobody saw), `live-on-ground-late` (still at the gate after the plan's takeoff), `live-landed` (down, a few minutes from the gate), `live-long-gap` (out of tracking range for more than 2 hours: nothing below named, and its crossings held until the gate) and `live-returned` (back at Rockford after an air return), with made-up flights. `flying` stays the schedule's alone.
  - The full map's timeline is colored by what the pilot is doing. Its "Quick layovers" switch, on by default and remembered in the browser, hurries a replay through each wait.
  - Design: Crewluv's `docs/superpowers/specs/2026-11-14-trip-map-activity-markers-and-quick-layovers-design.md`.
- Design: docs/superpowers/specs/2026-10-08-crewluve-web-slice1-design.md
- Joining with the invite link: docs/superpowers/specs/2026-10-26-partner-links-piece5a-website-join-design.md

## Develop

```bash
npm install
npm run dev     # http://localhost:5180/?demo=1
npm test
npm run build
```

Apple's map needs a MapKit JS token. The site's own is in `src/map/appleMapToken.ts`, but Apple accepts it only on crewluve.crewlu.net, so locally the site's own drawing shows. To see Apple's map locally:
- make a MapKit JS token with Restriction Type None in the Apple Developer account (Certificates, Identifiers & Profiles → Services → Maps → Tokens). It lasts 7 days.
- put it in `.env.local` (git-ignored) as `VITE_MAPKIT_DEV_TOKEN=…`.
- run the dev server fresh, which reads `.env.local` when it starts: `npm run dev -- --port 5182` (the `crewluve-mapkit` server in `.claude/launch.json`).

The local token works on any site, so it's never committed, and `npm run build` fails if a build would carry it.

## Regenerate data

```bash
npm run airports           # public/data/airports.json (reads ../crewlu-globe)
npm run icons              # src/icons/iconPaths.ts
npm run land               # public/data/land.json (Natural Earth 1:110m land, scripts/ne_110m_land.geojson)
python3 -I scripts/make-icons.py   # public/icons/*.png (reads ../Crewluv)
```

`npm run land` reads Natural Earth's land file, which isn't committed: download v5.1.2's `geojson/ne_110m_land.geojson` (public domain, about 140 KB) from https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_land.geojson to `scripts/ne_110m_land.geojson` first.

`public/data/geography.json` and `public/data/comparisons.json` are copies of the app's, in Crewluv's `Crewluv/Resources/TripMap/`, and `tests/fixtures/trip-map/facts-cases.json`, `replay-cases.json`, `activity-cases.json` and `live-cases.json` are copies of its `CrewluvTests/Fixtures/TripMap/` files of those names. The app makes `geography.json` from Natural Earth (public domain) with `node scripts/build-geography.mjs`, and `live-cases.json` with `node scripts/live-cases/generate.mjs`. Change each pair together.

`npm run airports` expects the CrewLu Flight Globe checkout next to this repo (`../crewlu-globe`).
To read its `airports.json` from somewhere else, set `AIRPORTS_SOURCE=/path/to/airports.json`.
It also reads OurAirports' `airports.csv` (for US state codes and to check country names) from `../crewlu-globe/scripts/ourairports.csv`, which the globe downloads, or from `AIRPORTS_REGIONS_SOURCE=/path/to/airports.csv`.

`make-icons.py` expects the Crewluv app checkout next to this repo (`../Crewluv`), for its heart artwork.
To read the artwork from somewhere else, set `CREWLUVE_ICON_ART=/path/to/Heart icon.png`.

Two zones are swapped for stand-ins that only share today's rules (`SAME_RULES_TODAY` in `scripts/build-airports.mjs`); recheck them every time you regenerate.
