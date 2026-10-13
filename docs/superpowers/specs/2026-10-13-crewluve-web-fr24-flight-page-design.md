# Crewluve Web — FlightRadar24 opens the flight's own page

Status: reported by the user on 2026-10-13 with a screenshot of the tracking popup for UPS5768: "The link to Flightradar24 doesn't seem to point at the flight". The user chose the flight page over keeping the live map. Everything through Back Home In is live (`c376f37`).

## 1. Goal

- **The FlightRadar24 button opens FlightRadar24's page for the flight number,** `https://www.flightradar24.com/data/flights/5x5768`. It shows today's flight at the top at every stage (scheduled, departed, landed, with its times), and a Live button for the moving map once the plane is up.
- **Nothing else changes:** the popup's look, the caption "Live tracking map", the FlightAware link and the header's callsign stay as they are.

## 2. Why

- **The live-map link only finds the flight while FlightRadar24 is tracking it.** `fr24.com/UPS5768` goes to `flightradar24.com/UPS5768`, and FlightRadar24 then picks the live flight with that callsign (`/UPS5768/421bc14b`).
- **Before that, it opens the general map with nothing selected,** and says nothing. Tried on 2026-10-13 with `fr24.com/UPS329`, a flight days away.
- **The site shows the in-flight card from block-out.** On 2026-10-13, UPS5768's block-out was 4:32 PM EDT and FlightRadar24 had it departing at 4:42 PM. A tap in those 10 minutes, or through any gate delay the cloud hasn't heard of, finds nothing.
- **The flight page works throughout.** On 2026-10-13 at 4:52 PM, `/data/flights/5x5768` listed today's flight first (STD 4:32 PM, ATD 4:42 PM, estimated 5:28 PM, with a Live link to `#421bc14b`), then the past days'.
- **It needs the IATA code.** `/data/flights/ups5768` says "There is currently no data available for your request".
- **The app opens the live map** (the FlightRadar24 app, else `fr24.com/{callsign}`), so this is a deliberate difference.

## 3. The design

- **`trackingLinks`' `flightRadar24`** is `https://www.flightradar24.com/data/flights/{iata}{digits}`, all in lower case: "5x5768", "dl1235".
- **The IATA code** comes from a new `airlineIata(code)` in `src/copy/airlines.ts`: the table's IATA code for an ICAO code ("UPS" → "5X"), otherwise the code as entered, in capitals. It's the lookup the airline's name, icon and color already use (`resolve`).
- **The callsign's safety rule covers it:** there are no links unless the callsign is only letters and digits. The page's code is the same airline and digits, with at most the table's IATA code swapped in, so it is letters and digits too. Both links come and go together, as before.
- **The slice 2C spec** gets pointers in §9 and §10 item 4.

## 4. Testing

- **Red first:** `trackingLinks('5X', '2962')` gives `https://www.flightradar24.com/data/flights/5x2962`. Today it gives `https://fr24.com/UPS2962`.
- **Codes:** "UPS" entered as the airline gives "5x"; "dl" gives "dl"; a code the table hasn't got ("XY") is kept.
- **The popup's test** expects the new address.
- **Gates:** `npx vitest run`, `npx tsc --noEmit`, `npm run build`.
- **Deliberate breaks:** the ICAO code back in the address; upper case; the code as entered instead of the table's IATA code.
- **In the browser:** the demo's flying scene, the popup's FlightRadar24 link.

## 5. Decisions log

| # | Decision | Source |
|---|---|---|
| 1 | Open FlightRadar24's flight page, not the live map. | User, 2026-10-13 |
| 2 | Keep the app's caption, "Live tracking map": the page's Live button is one tap away. | Design |
