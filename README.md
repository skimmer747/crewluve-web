# Crewluve Web

The Crewluve app's "Where's {Name}?" screen as a website for pilots' families.
Sign in with the pilot's CrewLu Cloud account. The site only reads; it never changes anything.

- Live: https://crewluve.crewlu.net
- Demo: https://crewluve.crewlu.net/?demo=1 (add `&scene=layover`, `last-leg`, `home`, `commuting-home`, …)
- Design: docs/superpowers/specs/2026-10-08-crewluve-web-slice1-design.md

## Develop

```bash
npm install
npm run dev     # http://localhost:5180/?demo=1
npm test
npm run build
```

## Regenerate data

```bash
npm run airports           # public/data/airports.json (reads ../crewlu-globe)
npm run icons              # src/icons/iconPaths.ts
python3 -I scripts/make-icons.py   # public/icons/*.png
```

`npm run airports` expects the CrewLu Flight Globe checkout next to this repo (`../crewlu-globe`).
To read its `airports.json` from somewhere else, set `AIRPORTS_SOURCE=/path/to/airports.json`.

Two zones are swapped for stand-ins that only share today's rules (`SAME_RULES_TODAY` in `scripts/build-airports.mjs`); recheck them every time you regenerate.
