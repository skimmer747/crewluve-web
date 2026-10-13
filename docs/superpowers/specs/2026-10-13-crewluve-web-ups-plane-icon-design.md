# Crewluve Web — UPS plane icon: a tilted plane for UPS flights, not a box

Status: chosen by the user on 2026-10-13, from a mockup of three plane shapes beside today's box. Everything through the Part C leftovers is live (`90e0295`). This comes before the next idea-board feature.

## 1. Goal

- **A UPS flight shows a tilted plane where it shows a box today,** in the same UPS brown (#663300 light, #E09E33 dark).
- **It's the site's first deliberate break from the Crewluve app's look.** The app's `AirlineBranding.swift` gives UPS and FedEx `shippingbox.fill`. The app stays as it is: this project never changes it.

## 2. Where it shows

The airline's icon comes from one table, `SYMBOLS` in `src/copy/airlines.ts`, through `airlineIcon`. Two places draw it:
- **The schedule rows** (`scheduleFacts.ts` `moveLook`): a UPS flight's 15 px icon in its 36 px brown circle.
- **The status sentence card's icon** (`copy/visuals.ts`) while a UPS flight is in the air, in the brown, or in orange or green when the departure was late or early.

## 3. The design

- **`SYMBOLS['5X']` becomes `'AirplaneTilt'`,** Phosphor's tilted plane, already in the site's icon set. It's the shape the table gives JetBlue, Air France, ANA and Asiana for the app's `airplane.circle.fill`, in their own colors.
- **FedEx (`FX`) keeps `'Package'`** (decision 2). `Package` stays in the icon set for it.
- **The comment above `SYMBOLS`** says UPS breaks from the app's mapping on purpose, and why.
- **Nothing else changes:** colors, sizes, the pulse on the leg happening now, and the cards' layout.

## 4. Testing

- **Red first:** `tests/copy/airlines.test.ts` expects `AirplaneTilt` for `5X`, and `Package` still for `FX`.
- **The tests that pin a UPS flight's icon move to `AirplaneTilt`:** `scheduleFacts.test.ts`, `TimelineRow.test.tsx` and `copy/visuals.test.ts`. `basics.test.tsx` passes `Package` in as sample data to the card and needs no change.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`.
- **In the browser:** the demo's flying scene shows the tilted plane in the status card's icon and in the UPS rows of the schedule, light and dark, with no console errors.

## 5. Decisions log

| # | Decision | Source |
|---|---|---|
| 1 | UPS flights show the tilted plane (option B of three), not the app's box. | User, 2026-10-13 |
| 2 | Only UPS changes; FedEx keeps the box. | Design, stated to the user |

## 6. Roadmap

1. Back to the idea board: the user's pick from the 2026-10-13 board (recommended: Can I call?).
2. Optionally, the page's scrolling in a hook (a 3B leftover).
