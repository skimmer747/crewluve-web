# Crewluve Web — Part A follow-ups: high contrast and the app's city names

Status: approved in brainstorming on 2026-10-11. Parts A (trip cards), B1 (location card) and B2 (sun popup) are live. Both follow-ups come from the Part A spec's roadmap (§13, items 0 and 1). The B1 and B2 specs added the location card's and the popup's small text to the first.

## 1. Goal

- **High contrast:** when a visitor's phone or computer has Increase Contrast turned on, the site switches to Apple's high-contrast colors, as the Crewluve app does. The default look doesn't change.
- **City names:** where the app's airport table names a city differently from the site's list, the app's name wins.

## 2. Scope

The user asked for both on 2026-10-11, as one small part (decision 1):

- the high-contrast colors and glass (§3);
- the four city names (§4).

## 3. High contrast

### 3.1 When

- The site follows the device's own setting, through `prefers-contrast: more`, as the app follows iOS. There's no switch on the site (decision 6).
- That covers iOS and iPadOS (Increase Contrast), macOS (Increase contrast) and other systems that report the setting.
- Safari 14.1 and later support it, which includes the site's floor, iOS 14.5. Browsers that don't keep the default look.

### 3.2 Colors

The eleven system colors switch to Apple's high-contrast values: light ones on a light device, dark ones on a dark device (decision 2). The values are the iOS 26 ones on the Color page of Apple's Human Interface Guidelines. The first two columns are the site's colors today.

| Color | Light | Dark | High contrast, light | High contrast, dark |
|---|---|---|---|---|
| Red | #FF383C | #FF4245 | #E9152D | #FF6165 |
| Orange | #FF8D28 | #FF9230 | #C55300 | #FFA056 |
| Yellow | #FFCC00 | #FFD600 | #A16A00 | #FEDF43 |
| Green | #34C759 | #30D158 | #008932 | #4AD968 |
| Teal | #00C3D0 | #00D2E0 | #008198 | #3BDDEC |
| Cyan | #00C0E8 | #3CD3FE | #007EAE | #6DD9FF |
| Blue | #0088FF | #0091FF | #1E6EF4 | #5CB8FF |
| Indigo | #6155F5 | #6D7CFF | #564ADE | #A7AAFF |
| Purple | #CB30E0 | #DB34F2 | #B02FC2 | #EA8DFF |
| Pink | #FF2D55 | #FF375F | #E7124D | #FF8AC4 |
| Gray | #8E8E93 | #8E8E93 | #6C6C70 | #AEAEB2 |

- **Secondary text** keeps its color but becomes more opaque: 60% becomes 68% (173 of 255), in light and in dark (decision 3). That's UIKit's `secondaryLabel` with increased contrast. Apple's guidelines don't list it; Flutter's mirror of Apple's colors (`CupertinoColors.secondaryLabel`) does.
- **The trip card's progress track** is the gray at 20%, like the app's `Color.gray.opacity(0.2)`, so it follows the high-contrast gray too. Today it's written as a fixed color, because the gray is the same in light and dark.
- **Unchanged:** the primary text and the page background, which are already black and white; and the UPS brand color, which is an airline's color, not a system one.
- **What it does, measured on the cards:**
  - Colored text on the light card, as low as 1.4:1 today (yellow), becomes 4.1:1 or more.
  - White text on the badges, pills and sign-in button, as low as 1.5:1 today (yellow), becomes 4.5:1 or more.
  - The pills' small subtitles, white at 85% like the app's, go from as low as 1.4:1 to 3.6:1 or more.
  - Secondary text goes from 3.3:1 to 4.0:1 on the light card, and from 6.0:1 to 6.6:1 on the dark one.
  - Colored text on the dark card, 4.8:1 or more today, becomes 5.1:1 or more.

### 3.3 White text on color

- **Where:** the trip badges ("Line Trip", "Delayed", "Early"), the city pills' two-tone blends and the sign-in button.
- **The problem:** Apple's dark high-contrast colors are lighter, so white text on them would get worse: as little as 1.3:1 on yellow.
- **The rule:** with Increase Contrast in dark mode, these keep the darker light-mode high-contrast colors, so white text stays at 4.5:1 or more (decision 4). Everything else follows Apple's colors.
- **On a light device, and without Increase Contrast,** they use the same colors as the rest of the page, as today.

### 3.4 Frosted glass

- **Everything frosted turns more solid and gets a visible edge,** like iOS's glass with Increase Contrast (decision 5): the cards, the sun popup's card, the days-home pill, the demo banner and the footer's two round buttons. The sign-in fields share the glass's fill and edge, so they follow.
- **Light:** the fill goes from 78% to 94% opaque, and the edge from black at 6% to black at 30%.
- **Dark:** the fill goes from 60% to 88% opaque, and the edge from white at 8% to white at 35%.
- **The edge** is 1 px instead of 0.5 px, so it shows on every screen. It then stands out from the page at about 2:1 in light and 3:1 in dark, up from 1.1:1.
- The look check may tune these values (§8).

### 3.5 The popup at night

The popup forces its dark colors at night (B2 §4). Under Increase Contrast those are the dark high-contrast set, identical to the page's own, including §3.3 and §3.4. A test keeps them identical.

### 3.6 What it covers

The rule: a color that's a system color in the app follows the setting, and a color that's fixed in the app stays.

- **Follows:** every text, icon and line drawn in a system color. That includes the small text the B1 and B2 specs listed:
  - the dial's labels;
  - the Open-Meteo credit;
  - the orange and blue numbers of the time difference;
  - the popup's departure labels, its middle text, and its sunrise and sunset;
  - the countdowns and the status sentence.

  The weather animation's sun rays and rain follow too, since it reads its colors from the page's.
- **Stays, fixed in the app too:**
  - the dial's sky gradient;
  - the white shared-daylight arc;
  - the weather animation's cloud and fog grays, and its white stars, snow and lightning;
  - the popup's dimmed backdrop, and the shadows.
- **Stays, though the app's follows:** the celebration figure's two greens (§7).
- **Airline brand colors stay too.**

## 4. City names

- **The four:** a full comparison of the app's airport table (`AirportDataProvider.swift`, 304 airports) with the site's list found four city names that differ. The app's names win (decision 7):

  | Code | The site today | The app |
  |---|---|---|
  | VPS | Valparaiso | Destin/Fort Walton Beach |
  | DEL | Delhi | New Delhi |
  | BAH | Muharraq | Bahrain |
  | TAO | Qingdao (Jiaozhou) | Qingdao |

- **How:** the names join the airport build script's existing overrides from the app's table, beside its country spellings and states. Then the airport list is regenerated. On 2026-10-11, a regeneration without them reproduced today's list exactly, so only these four entries change.
- **Where they show:** everywhere a city name does:
  - the status sentence;
  - countdown titles like "Anchorage In", and the "Trip departs …" line under a countdown;
  - the location card, and the popup's header and its "In …" row;
  - the trip pills, and the route's description for screen readers.
- **Long names:** "Destin/Fort Walton Beach" is the longest.
  - Where there's no room, it wraps onto a second line: in a countdown title, the location card, and the popup's header and "In …" row.
  - In the location card the dial sits over the upper right, as in the app, so a long name can run under the dial's corner.
  - In a pill it doesn't wrap, and the pills' row scrolls sideways, as it does for any long name.

## 5. How it's built

- **`tokens.css`** gains two blocks at the end, in this order:
  1. `@media (prefers-contrast: more)`: the light high-contrast set on `:root`, and the dark high-contrast set on `.force-dark`.
  2. `@media (prefers-color-scheme: dark) and (prefers-contrast: more)`: the dark high-contrast set on `:root`. It sets everything the first block's `:root` sets, so on a dark device nothing of the light set survives.
- **Each set** holds the eleven colors, the secondary text, the glass's fill and edge, and a new `--bar-track` token for the progress track. `--bar-track` also joins the default `:root`, at today's value.
- **The dark high-contrast set** also defines `--fill-*` colors for the nine colors behind white text: blue, cyan, purple, pink, orange, yellow, teal, green and indigo. Their values are the light high-contrast ones.
- **Backgrounds behind white text** read `var(--fill-orange, var(--orange))` and so on, which falls back to the ordinary color wherever the fill isn't defined. That covers:
  - the pills' blends in `trips.css`;
  - the sign-in button in `cards.css`;
  - the badges, through a new `cssFill` beside `cssColor` in `src/ui/colors.ts`. For a named color it writes the fallback form, like `var(--fill-blue, var(--blue))`; a brand hex and the secondary color come back as `cssColor` gives them.
- **`trips.css`** draws the progress track with `var(--bar-track)`.
- **`cards.css`** gives `.glass` and the sign-in fields a 1 px edge under `prefers-contrast: more`.
- **`scripts/build-airports.mjs`** gains an `APP_CITY` map of the four, like its `APP_STATE` and `APP_SPELLING`. `public/data/airports.json` is regenerated with `npm run airports`, which reads the Flight Globe's files and doesn't change them.

## 6. Security and privacy

- No new requests, scripts or storage. The high contrast is stylesheet only, and the CSP is unchanged.
- The airport build only reads the Flight Globe's files. Its working copy, with the user's uncommitted change, stays as it is.

## 7. Deliberate differences from the app

1. With Increase Contrast in dark mode, the pills, badges and sign-in button keep the light-mode high-contrast colors, so white text stays readable. The app lets them turn lighter, as iOS does for every system color.
2. The glass's solid fill and edge are the site's own values for iOS's high-contrast glass, which Apple doesn't publish.
3. The secondary text's 68% comes from UIKit through Flutter's mirror of Apple's colors, since Apple's guidelines don't list it.
4. The celebration figure keeps its two greens. The app draws it in the system green, which turns darker with Increase Contrast. The site's greens are already fixed, in light and dark, and the figure is small and decorative.

## 8. Testing

- **The colors (`tests/styles/styles.test.ts`):**
  - every high-contrast value equals Apple's table above, light and dark; the secondary text is 68%; and the progress track is the high-contrast gray at 20%;
  - the dark high-contrast block sets everything the light one does;
  - the popup's high-contrast dark set equals the page's exactly;
  - the fill colors equal the light high-contrast colors, and are defined only in the dark high-contrast sets;
  - the glass's fill is more opaque and its edge stronger than the defaults, and `.glass` and the sign-in fields have a 1 px edge under `prefers-contrast: more`;
  - the default colors stay as they are (the existing tests), and the progress track's default is today's value.
- **White text on color:**
  - the pills' blends and the sign-in button use the fill fallback form (`styles.test.ts`);
  - the badges' background uses it too (`tests/ui/tripCards.test.tsx`);
  - `cssFill` writes it for every named color, and leaves a brand hex and the secondary color as `cssColor` does (`tests/ui/basics.test.tsx`).
- **City names:**
  - the generated list has the app's names for VPS, DEL, BAH and TAO (`tests/data/airports.test.ts`);
  - the plan checks that regenerating changes nothing else.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`.
- **Look check with the user:** screenshots of the main screen, the trip cards, the location card and the popup with Increase Contrast, light and dark.
  - The browser pane can't switch the setting, so a debugging script in the dev preview applies the high-contrast rules for the screenshots.
  - The user can also turn the setting on themselves on their phone or Mac.

## 9. Decisions log

| # | Decision | Source |
|---|---|---|
| 1 | Both follow-ups in one small part. | User, 2026-10-11 |
| 2 | Under Increase Contrast, Apple's high-contrast system colors (iOS 26). The default look doesn't change. | User, 2026-10-10 (Part A §13), confirmed 2026-10-11 |
| 3 | Under Increase Contrast, secondary text at 68%, as UIKit's. | User, 2026-10-11 |
| 4 | In dark mode with Increase Contrast, white text on color keeps the darker high-contrast colors so it stays readable. | User, 2026-10-11 |
| 5 | Under Increase Contrast, the glass turns more solid with a visible edge, like iOS's. | User, 2026-10-11 |
| 6 | The site follows the device's setting only, with no switch of its own. | User, 2026-10-11 |
| 7 | City names follow the app's airport table for VPS, DEL, BAH and TAO, through the airport build script. | Part A §13 (its final review), confirmed by the user 2026-10-11 |

## 10. Roadmap

1. Part C: the in-flight map.
2. Slice 3: the Schedule page.
