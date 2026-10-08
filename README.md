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
npm run airports           # public/data/airports.json (reads ~/Dev/crewlu-globe)
npm run icons              # src/icons/iconPaths.ts
python3 -I scripts/make-icons.py   # public/icons/*.png
```
