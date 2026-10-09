# Crewluve Web, Slice 1: "Where's {Name}?" and the Home Countdown

- **Status:** Design approved in brainstorming on 2026-10-08. Next step: implementation plan.
- **Address:** https://crewluve.crewlu.net
- **Code:** this folder (`~/Dev/Crewluve Website`), published as GitHub `skimmer747/crewluve-web` (public, like the globe)

---

## 1. What we're building

A website for a pilot's spouse and family that **copies the Crewluve iPhone app's main screen**, but reads its data from **CrewLu Cloud** instead of the iCloud partner share. The visitor signs in with the **pilot's CrewLu Cloud email and password**, exactly like globe.crewlu.net. There is no sharing, invite, or partner-account mechanism.

Slice 1 delivers the top of the Crewluve main screen:

1. The title "Where's {Name}?"
2. The narrative (sentence) card, which answers "where are they now"
3. The countdown cards: "Back Home In" while away; "Leaves Home In" plus "been home N days" while home; the under-24-hour celebration
4. The footer freshness row, with refresh and sign-out buttons

Plus the web-only pieces: the sign-in screen, empty/error/offline states, and a demo mode.

Everything else from the 2026-10-08 idea board is on the roadmap (§13). The user wants all of it, delivered one slice at a time.

## 2. Background this design relies on

- **The pilot app and CrewLu Cloud.**
  - **Crewlu** is the pilot app (Xcode project "Duty", `~/Dev/Duty`).
  - Its optional **CrewLu Cloud** account is Supabase project `corxvurxpnrzekbxdgye` (`https://corxvurxpnrzekbxdgye.supabase.co`), with email + password sign-in only.
  - The cloud is opt-in per device. Pilots on the iCloud-only backend have no cloud data. Live counts on 2026-10-08: 578 accounts, about 450 with trips.
- **Table conventions.**
  - Every synced table has `id text`, `user_id uuid`, `deleted_at` (soft delete) and a server-set `updated_at`.
  - The primary key is `(user_id, id)`.
  - Row-level security is `(select auth.uid()) = user_id` for all operations.
  - All instants are UTC `timestamptz`. Airport codes are 3-letter IATA.
  - There is **no** airports, time-zone, or city table.
- **When the cloud gets updated.** Crewlu syncs at launch, on foreground, about 3 s after edits and imports, and on manual taps. So the cloud shows the pilot's phone as of its last sync. Flight history goes back to 2020.
- **How Crewluve gets its data, and why we can't reuse that.**
  - **Crewluve** is the spouse app (Xcode project "Crewluv", `~/Dev/Crewluv`). It receives a `SharedPilotStatus` record from Crewlu through a CloudKit share, which a browser cannot reach.
  - Crewluve ignores most of that record's summary fields and rebuilds status from a list of trip legs.
  - This site does the same, building the legs itself from CrewLu Cloud rows.
- **The Flight Globe precedent.** The globe (`~/Dev/crewlu-globe`, globe.crewlu.net) uses:
  - Vite + TypeScript and `@supabase/supabase-js` with `signInWithPassword`
  - RLS-scoped reads only
  - GitHub Pages deploys through Actions
  - a `?demo=1` mode

  This site reuses those patterns and the globe's airport list, but it is a separate project.
- **Which version of Crewluve we copy.** The Crewluve App Store screenshots are **older than the current code**. This design copies the current code: branch `feature/commute-stage1-crewluv-drive` @ `3423306`, v1.1.5 build 41.
  - Pronouns are gone.
  - The narrative "13:00pm" bug is fixed.
  - Seconds show only in the last hour.
  - The footer is the new sync-status row.
- **Data facts verified on the live database (2026-10-08, aggregates only).**
  - **Company flights:** `airline_code` is null and `flight_number` is all digits (about 35.5k rows). Crewlu labels these "UPS" (`PartnerStatusGenerator.swift:321-325`).
  - **Commercial flights:** they carry an `airline_code` (DL, WN, AA, UA…).
  - **Placeholder flight numbers:** values such as `GND`, `CML`, `XXXX`, `HOT-…`, `DUTY` exist.
  - **Ground transport:** `is_ground_transport` is true on about 556 rows.
  - **Small tables:** `commutes.direction` is `toHome` or `toWork`. `jumpseats.status_raw_value` is `Confirmed` or `Standby`. `trips.end_date` is never null.
  - **Pilot profiles:** 16 users have two active `pilot_infos` rows.
  - **Photos:** the `crewlu-photos` storage bucket is empty.

## 3. Scope

**In slice 1**
- Sign-in, session persistence, and sign-out.
- Read-only data fetch, a local cache, and periodic refresh.
- An airport dataset with city names and IANA time zones.
- The status engine: legs → status → countdown targets, delay-aware.
- The screen: title, narrative card, countdown cards, days-home pill, celebration, and footer.
- Empty, error, and offline states. Demo mode with selectable scenes.
- Light and dark mode, in a responsive single column.
- The GitHub repo, the Actions deploy, and the custom domain `crewluve.crewlu.net`.

**Not in slice 1 (later slices)**
- **The rest of the Crewluve screen:** the flight map card, the location card (weather, local time, sun dial) and its popup, "Day N of M" with Upcoming Cities, and the upcoming-trip card.
- **The schedule:** the View Schedule card, the Schedule screen (calendar + leg timeline), the iPad two-column layout, and tapping the countdown card.
- **Personal touches and alerts:** quick statuses, per-partner nicknames, and notifications.
- **Analytics.**
- **Web-only ideas:** every web-only idea from the idea board (§13).

## 4. Screens and states

### 4.1 Shell

**Title**
- Text: "Where's {Name}?", centered, 22 px, weight 700, system font, primary text color, straight apostrophe.
- `{Name}` rules are in §6.1.
- When there is no status to show (signed out, or no data), the title is "CrewLuve".

**Page and layout**
- Page background: `#FFFFFF` in light mode, `#000000` in dark, following `prefers-color-scheme`.
- Content column: full width minus 16 px padding per side, `max-width: 480px`, centered. Cards are 24 px apart.

**Cards**
- A frosted-glass surface that imitates iOS 26 Liquid Glass, with radius 20 px.
- Starting values, to be tuned by eye against the app:
  - light: `rgba(255,255,255,.55)`, `backdrop-filter: blur(20px) saturate(180%)`, a thin white inner rim, and `0 4px 20px rgba(0,0,0,.08)`
  - dark: `rgba(44,44,46,.5)` with a `rgba(255,255,255,.12)` rim

**Fonts**
- Text: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`, which is SF Pro on Apple devices.
- Countdown numerals: `ui-rounded, "SF Pro Rounded", system-ui, sans-serif`, which is SF Pro Rounded in Safari.

**Icons**
- SF Symbols cannot be used on a website, because Apple's license limits them to apps on Apple platforms.
- Each symbol is replaced by the closest **Phosphor Icons** (MIT) "fill" icon. Only the SVG paths actually used are copied from `@phosphor-icons/core` into `src/ui/icons.tsx`. The license notice goes in `THIRD_PARTY_NOTICES.md`.
- Mapping for slice 1 (SF Symbol → Phosphor):

| SF Symbol | Phosphor |
|---|---|
| house.fill | House |
| airplane | Airplane |
| car.fill | Car |
| arrow.triangle.2.circlepath | ArrowsClockwise |
| bed.double.fill | Bed |
| building.2.fill | Buildings |
| clock.badge.questionmark | ClockCountdown |
| bolt.fill | Lightning |
| book.fill | BookOpen |
| mappin.and.ellipse | MapPin |
| circle.fill | Circle |
| shippingbox.fill (UPS) | Package |
| airplane.departure | AirplaneTakeoff |
| airplane.arrival | AirplaneLanding |
| icloud.fill | Cloud |
| arrow.up.circle.fill | ArrowCircleUp |
| exclamationmark.triangle | Warning |
| arrow.clockwise | ArrowClockwise |
| sign-out (web only) | SignOut |
| heart (celebration) | Heart |

- The airline symbols get the same treatment in `src/copy/airlines.ts` (§6.10).

**Colors** (iOS 26 system values, light / dark)

| Color | Light | Dark |
|---|---|---|
| Green | `#34C759` | `#30D158` |
| Blue | `#0088FF` | `#0091FF` |
| Red | `#FF383C` | `#FF4245` |
| Orange | `#FF8D28` | `#FF9230` |
| Purple | `#CB30E0` | `#DB34F2` |
| Gray | `#8E8E93` | `#8E8E93` |
| Secondary text | `rgba(60,60,67,.6)` | `rgba(235,235,245,.6)` |
| Primary text | `#000` | `#FFF` |
| UPS brown | `#663300` | `#E09E33` |

### 4.2 Sign-in screen (web only)

- **Header:** the Crewluve heart mark, "CrewLuve", and the line "Sign in with your pilot's CrewLu Cloud account".
- **Form:** a real `<form>`, so Enter submits.
  - Email field: `type="email"`, `autocomplete="username"`.
  - Password field: `autocomplete="current-password"`.
  - "Sign in" button in system blue.
- **Under the button:**
  - "Read only. This site never changes anything in CrewLu Cloud."
  - "Forgot your password? Reset it in the Crewlu app." There is no web reset, same as the globe.
  - A "See a demo" link to `?demo=1`.
- **Inline errors** (below the button):

| Cause | Message |
|---|---|
| Bad credentials | "That email and password didn't work. Use the same CrewLu Cloud sign-in as the Crewlu app." |
| Network | "Couldn't reach CrewLu Cloud. Check your connection and try again." |
| Anything else | "Sign-in failed. Try again in a minute." |

### 4.3 Narrative card

**Layout**
- A row with a 14 px gap and 16 px padding.
- Left: a 44 px icon column with a 28 px icon in the status color.
- Right: 17 px body text in the primary color, wrapping.
- Bold spans use weight 700. Colored spans are also bold. The countdown span `{cd}` uses tabular digits.

**Progress ring**
- Size 44×44, 3 px stroke. The track is the status color at 20% opacity; the fill is the status color with round caps, starting at 12 o'clock and running clockwise.
- Shown only while a leg covers "now" and the status is In Flight, Layover, Base, Reserve, Hot Standby, or Training/Event.
- Value: the elapsed fraction of that leg.

**Ticking**
- The card re-renders every second.
- `{cd}` never shows seconds, so its digits change at most once a minute, with a ~0.3 s rolling-digit transition. The ring moves every second.

**Icon and color per status** (from Crewluve `NarrativeCardView.swift:772-806`)

| Status | Icon (SF Symbol it imitates) | Color |
|---|---|---|
| Home | house.fill | green |
| Commuting home | airplane | blue |
| Driving home | car.fill | green |
| Driving to work | car.fill | blue |
| In flight | the airline's symbol (§6.10) | airline color; orange if the departure was delayed, green if early |
| Ground transport (web only) | car.fill | blue |
| Turn | arrow.triangle.2.circlepath | orange (green if early) |
| Layover | bed.double.fill | purple; orange if delayed, green if early |
| Base | building.2.fill | purple |
| Reserve | clock.badge.questionmark | red |
| Hot standby | bolt.fill | orange |
| Training / event | book.fill (car.fill if the title has a word starting "driv", or the word "truck" or "car", §6.3) | purple |
| Off / elsewhere | mappin.and.ellipse | secondary (the app's gray text color) |
| Unknown | circle.fill | gray |

**Sentence templates.** These are copied verbatim from `NarrativeCardView.swift`.
- Notation: `**x**` is bold. `{cd}` is the countdown, colored with the status color unless noted. `{T}` is a time. Missing data drops a clause using the listed fallbacks. Some fallbacks have no final period; that is verbatim.
- **Home**
  - Commuter with a drive to work pending: "{Name} is home — heads to base, then on to **{City}**, departing in {cd} at **{T}**."
  - Last trip and next trip known: "{Name} is home after being gone for **{N} days**! Heading to **{City}** {dep}. {HB}."
    - Without {HB}: "…{dep} — gone for **{M} days**."
    - Commuter: "…! Commuting to **{BaseCity}** then heading to **{City}** {dep}…"
    - The commuter wording appears only when a standalone jumpseat is logged from home to the trip's first departure airport, after now and before the trip's first leg. {dep} is then that jumpseat's departure. This is Crewluve's `UpcomingTripInfo.swift:67-108`. Without a logged jumpseat, the plain "Heading to" wording is used with the first flight's time. No commute is guessed.
  - Last trip only: "{Name} is home after being gone for **{N} days** and is relaxing."
  - Next trip only: "{Name} is home — heads to **{City}** {dep}. {HB}."
    - Without {HB}: "…{dep} and will be gone for **{M} days**."
    - Commuter: "{Name} is home — commutes to **{BaseCity}** then heads to **{City}** {dep}…"
  - Neither: "{Name} is home and relaxing."
  - Delay suffix: " The flight to **{City}** is delayed **{delay}**."
  - {HB}, meaning the next trip's homecoming: "Back home in {cd, green} on **{Weekday} {Month} {Day}{ordinal} at {T}**".
  - {N} and {M} are trip lengths in days from `trips.days` when it is above 0, falling back to the inclusive count of calendar days in the base's zone, as in §4.4. They pluralize: "1 day", "N days".
- **Commuting home** (off-trip, and the next leg is a standalone jumpseat to home)
  - "{Name} has one more leg home from **{A}** to **{B}**! It leaves in {cd} at **{T}** and lands at **{T2}**."
  - Fallback: "{Name} is heading home"
- **Driving**
  - Home: "{Name} is driving home to **{HomeCity}** — back in {cd, green} at **{T}**."
  - To work: "{Name} is driving to work in **{BaseCity}** — arrives in {cd} at **{T}**, then the trip starts."
  - Fallbacks: "{Name} is driving home" and "{Name} is driving to work"
- **In flight**
  - "{Name} is flying to **{Dest}**{FL} from **{Dep}** — landing in {cd} which is **{T}**."
  - The verb is "riding" for deadheads and jumpseats (§6.3).
  - Shorter forms first drop " from **{Dep}**", then the landing clause. Last resort: "{Name} is in flight".
  - After a delayed or early departure: "{Name} was delayed|pushed early in **{Dep}** and is flying to **{Dest}**{FL} — landing in {cd, red|green} which is **{T}**."
- **At base, or off, before a delayed or early first departure**
  - "{Name} is delayed|is pushing early in **{Dep}** and will be flying to **{Dest}**{FL} — departing in {cd, red|green}."
  - It also applies when the status is Off, for example a report window away from base, so the sentence agrees with the red or green card. The app does the same.
  - Delayed-departure countdowns are red or green everywhere on the site. The app uses the status color in this one spot; the site keeps one rule.
- **Ground transport** (web only; the apps wrongly say "In Flight")
  - "{Name} is riding to **{Dest}** by ground from **{Dep}** — arrives in {cd} which is **{T}**."
- **Turn**
  - "{Name} is in **{City}** — heading to **{Dest}** in {cd} which is **{T}**."
  - Without a destination: "…— next flight in {cd} which is **{T}**."
  - Fallbacks: "{Name} is in **{City}** between flights", then "{Name} is between flights"
  - Delayed or early: "{Name} is delayed|is pushing early in **{City}** — heading to **{Dest}** in {cd, red|green} which is **{T}**."
- **Layover**
  - "{Name} is on layover in **{City}** — flies to **{Dest}** in {cd} which is **{T}**."
  - Without a destination: "…— next flight in {cd} which is **{T}**."
  - Fallbacks: "{Name} is on layover in **{City}**", then "{Name} is on layover"
  - Delayed or early: "{Name}'s layover has been extended|shortened by **{delay}** and will now fly to **{Dest}** in {cd, red|green} which is **{T}**."
- **Base**
  - "{Name} is at base in **{City}** — heads home to **{HomeCity}** in {cd} which is **{T}**."
  - With a flight next: "…— flies to **{Dest}** in {cd} which is **{T}**."
  - Without a destination: "…— next flight in {cd} which is **{T}**."
  - Fallbacks: "{Name} is at base in **{City}**", then "{Name} is at base"
- **Reserve and hot standby**
  - "{Name} is on reserve|on hot standby in **{City}** — on call until {cd} which is **{T}**."
  - Fallbacks drop the clause, then the city.
- **Training and events** (training events, and manual events that aren't reserve or standby)
  - "{Name}: **{Title}** in **{City}** — finishes in {cd} which is **{T}**."
  - Without a city: "{Name}: **{Title}** — finishes in {cd} which is **{T}**."
  - Titles:
    - training is "{event_type} Training", which is Duty's `TrainingEvent.displayTitle`
    - a manual event is its title, or "Manual Event" if blank
  - Crewluve's "is in training in {City}" sentence only appears when a leg has no title, which never happens for Crewlu data, so the site doesn't use it.
- **Off / elsewhere**
  - "{Name} is in **{City}** — flies to **{Dest}** in {cd} which is **{T}**."
  - Fallbacks: "{Name} is in **{City}**", then "{Name} is in **{CODE}**", then "{Name} is off duty"
- **Unknown:** "On duty"

**What each countdown counts to**
- **In flight:** the flight's effective block-in (leg end).
- **Turn, layover, base, off, and commuting home:** the next leg's effective start.
- **Driving:** the drive's end.
- **Reserve, hot standby, training, and event:** the leg's end.

**Formats**
- `{cd}`: "2d 8h 8m", "8h 8m", "8m", "<1m", "now!" — no zero padding, never seconds.
- `{T}`: shown in the **viewer's** time zone.
  - 12-hour locales: "1:00pm EST" (lowercase am/pm, no space).
  - 24-hour locales: "13:00 EST".
  - The zone abbreviation comes from `Intl.DateTimeFormat(…, { timeZoneName: 'short' })`. US zones give EST/EDT/PDT; others give, for example, "GMT+1".
- `{dep}`: "today at 6:00am", "tomorrow at 6:00am", or "Sunday the 1st at 6:00am", in the viewer's zone ("06:00" on 24-hour locales).
- `{FL}`: " on {Airline} flight {n}" (§6.10). It is omitted when the flight number isn't usable.
- `{delay}`: "2 hours 30 minutes", "1 hour", or "45 minutes".
- City names come from the airport dataset (§7.4), with the IATA code as fallback.

### 4.4 Countdown cards

**Card layout**
- A column with a 16 px gap and 24 px padding.
- Title row: a 28 px icon in the card color, then a 22 px weight-600 title. The row is **left-aligned**; the app's HStack ends in a Spacer. The big number and subtitle are centered.
- There is **no chevron** in slice 1. The card is not tappable until the Schedule slice exists, as on Crewluve iPad.

**Big number**
- Numerals: 52 px, weight 700, rounded font, in the card color.
- Unit letters: 32 px, weight 500, rounded font, in the primary color. A gap of about two spaces separates the units.
- Formats:
  - 1 day or more: "2d 08h 08m"
  - under 1 day: "8h 08m"
  - under 1 hour: "7m 05s"
  - zero or less: "Now!"
- Days are not padded. Every unit after the first is two digits.
- It stays on one line and shrinks to as little as 50%. It updates every second, with no animation.

**Arrival card** (status is not Home)
- **Title:** the target label from §6.5: "Back Home In", "Back at Base In", "{City} In", or "Released In".
- **Icon:**
  - "Back Home In": house.fill
  - "Released In": the current status's icon
  - anything else: airplane.arrival
- **Color:**
  - Normally green; "Released In" uses the current status's color.
  - Red when the target is ≥15 min later than the same target on scheduled times.
  - Green when it is ≥15 min earlier.
- **Subtitle** (15 px, secondary): "Sun, Mar 1 at 5:57 PM · Orlando" in the **pilot's home** time zone, with the target's city. On 24-hour locales: "Sun, Mar 1 at 17:57 · Orlando".

**"~N days" fallback card**
- When it shows: a trip covers now that has **no flight legs** (for example, all its flights are hidden). Trips with flights always get an exact target, or deliberately none (§6.5). The engine can't tell where the pilot is, so the sentence card shows Crewluve's "On duty" (the Unknown status) above this card.
- It uses the arrival card's header ("Back Home In", green house).
- The body is copied from Crewluve `EstimatedReturnCardView`: remaining = max(total days − day number, 0).
  - Day number = calendar days since the trip's start, counted in the base's time zone, plus 1, and capped at the total.
  - Total = `trips.days`, or the calendar-day count.
  - It shows "Soon" when remaining is 0, "~1 day", or "~N days", in 52 px bold rounded green.
- No subtitle.

**Leave card** (status is Home)
- **Title:** "Leaves Home In" when the target is a drive from home or a departure from the home airport; otherwise "Leaves In".
- **Icon:** car.fill for a drive, airplane.departure otherwise.
- **Color:** blue. Orange when the departure is ≥15 min late; green when it is ≥15 min early.
- **Subtitle:** "Departs Sunday March 1st at 5:57pm" in the pilot's home time zone. On 24-hour locales: "Departs Sunday March 1st at 17:57", which fixes Crewluve's "17:57pm" bug.
- **Commuter with no logged commute:** the title is "Leaves In" and the subtitle is "Trip departs {BaseCity} Sunday March 1st at 5:57pm".

**Days-home pill** (status is Home, and at least one full day since the last real arrival home)
- A green house icon plus "{Name}'s been home for 1 day" or "{Name}'s been home for N days".
- 15 px secondary text, centered.

**Celebration** (an arrival card is showing, the status is neither Home nor Base, and 0 < remaining ≤ 24 h)
- **Figure:** a small green stick figure with waving arms, centered at the card's top-right (right − 24 px, top + 12 px).
- **Hearts:** six red hearts (7–12 px) start 0.05–1.25 s apart. Each rises 35 px over 1 s while fading and shrinking to 60%.
- **Bounce:** scale 1.3 → 0.9 → 1.2 → 1.0, with small vertical offsets and rotations.
- **Timing:** visible for 2.0 s, then fades over 0.4 s. It replays on page load and every time the page becomes visible again.
- Skipped under `prefers-reduced-motion: reduce`. It never blocks taps.

**Card order**
1. Narrative card
2. Then either:
   - Home: the leave card, then the days-home pill
   - Away: the arrival card, or the "~N days" fallback
3. Footer

### 4.5 Footer

**Left button: sign out**
- A round glass button with the sign-out icon.
- It asks first with the browser's confirmation dialog: "Sign out on this device?"
- In demo mode the same button exits the demo and goes to the sign-in screen, with no confirmation.

**Center: two rows** (11 px, tabular digits)
- **Row 1:** a cloud icon and "Checked {t} ago" — time since the last successful fetch. Under 5 s it reads "Checked just now".
  - Icon color by age: under 2 min green, under 5 min blue, under 10 min orange, otherwise red.
- **Row 2:** an up-arrow-circle icon (secondary color) and "Schedule updated {t} ago" — time since the newest `updated_at` among the fetched rows, meaning the last time the pilot's phone sent a change.
  - Crewluve colors this icon by freshness. Here it stays neutral, because a schedule that hasn't changed in days is normal and shouldn't look alarming in red.
- `{t}`: under 1 min "42s"; under 1 h "3m 07s"; under 24 h "2h 05m"; otherwise ">1 day". It ticks every second.
- **Problems replace both rows** with an orange warning icon and one of:
  - "Offline — showing the schedule from {time}"
  - "Couldn't reach CrewLu Cloud — will retry"
  - an expired session, which sends the visitor to the sign-in screen

**Right button: refresh**
- A round glass button with the refresh icon.
- It is disabled while a fetch is running.

### 4.6 Empty and special states

- **Signed in, but no `pilot_infos` row and no trips at all:** a card titled "No schedule in CrewLu Cloud yet", with the text "Ask your pilot to turn on CrewLu Cloud in the Crewlu app and sync once, then refresh this page." The footer still shows.
- **Profile present, but no legs in the window:** the Home status — "{Name} is home and relaxing." — with no countdown card.

### 4.7 Demo mode

- `?demo=1` makes no network calls. It uses a deterministic synthetic schedule for a UPS-style pilot named "Alex" (base SDF, home LEX, drives to work), anchored to the current time.
- `&scene=` jumps "now" to a named moment:
  - `home`, `driving-to-work`, `base`, `flying` (the default), `turn`, `layover`, `delayed`
  - `last-leg`, `driving-home`, `reserve`, `training`
  - `commuting-home` — this one uses a jumpseat-commuter variant of Alex (home MCO, Delta jumpseats instead of drives)
- The return flight from Anchorage runs 40 minutes late. Scenes from `delayed` on include that delay, the way CrewLu Cloud would learn of it. Earlier scenes show the flight on time, so the default scene's countdown isn't red a day early.
- A capsule banner reads "Demo — sample pilot", like Crewluve's demo banner.
- The sign-in screen links to demo mode.
- Demo mode is the visual test bed.

### 4.8 Deliberate differences from the Crewluve app

1. There is a sign-in screen. The footer has sign-out instead of "paste share link", and it reports CrewLu Cloud freshness instead of iCloud sync.
2. Icons are Phosphor lookalikes, not SF Symbols.
3. `{Name}` is the profile first name. Per-partner nicknames only travel through iCloud.
4. There are no quick statuses ("Call me", "Sleeping") and no manual "Report delay"; neither is in CrewLu Cloud. Delays come from updated flight times (§6.7).
5. The countdown card isn't tappable yet, and there is no chevron.
6. Reserve, hot standby, and training show "Released In", counting to the end of that duty. Both apps instead count to the *next trip's* homecoming.
7. A commuter whose ride home isn't logged gets no Back Home countdown. The site doesn't guess.
8. Every audit bug in §6.11 is fixed. That includes the report window: from report time to the first departure, the site says "at base", where Crewlu's generator said "Home".
9. Ground transport gets its own sentence instead of "In Flight".
10. The footer's "Schedule updated" icon stays neutral instead of turning red as it ages (§4.5).
11. The drive home moves with a late last flight (§6.2). Crewlu's stored commute times don't.

## 5. Behavior summary (what the visitor experiences)

- **On load:**
  - Demo → render demo.
  - Signed in → render the cached schedule instantly (if any), then fetch.
  - Not signed in → sign-in screen.
- **Status and countdowns** are re-resolved every second from the in-memory schedule.
- **Refetch:** every 5 minutes while the page is visible, on becoming visible again, and on the refresh button.
- **Offline:** the cached schedule keeps working, and the footer says so.
- **Sign-out** clears the session and the cache.

## 6. Status engine

The engine is pure TypeScript with no DOM or network. It ports **Duty's leg builder** (`Duty/Utils/PartnerBeacon/PartnerStatusGenerator.swift:707-1065`) and **Crewluve's resolver** (`Crewluv/Models/TripStateResolver.swift`), with every known bug fixed. Duty's own status cascade (`PartnerStatusGenerator.swift:61-86, 1230-1329`) is **not** ported.

### 6.1 Inputs

All reads are `select` only. Every query filters `deleted_at is null`. RLS scopes rows to the signed-in user.

**The window:** W = [now − 60 days, now + 120 days].

| Table | Columns | Filter |
|---|---|---|
| `pilot_infos` | first_name, base_raw_value, home_airport_code, is_active, updated_at | all rows |
| `trips` | id, start_date, end_date, days, base, updated_at | `end_date >= W.start` and `start_date <= W.end` |
| `duty_periods` | id, trip_id, day, start_time, end_time, updated_at | `start_time` in W |
| `flights` | id, trip_id, duty_period_id, flight_number, airline_code, departure, arrival, scheduled_block_out_time, scheduled_block_in_time, block_out_time, block_in_time, is_dh, is_commercial_deadhead, is_ground_transport, hidden_from_timeline, updated_at | `scheduled_block_out_time` in W |
| `commutes` | id, from_airport, to_airport, direction, departure_time_zulu, arrival_time_zulu, source_trip_id, hidden_from_timeline, updated_at | `arrival_time_zulu >= W.start`, `departure_time_zulu <= W.end` |
| `jumpseats` | id, source_trip_id, flight_number, airline_code, origin, destination, departure_time_zulu, arrival_time_zulu, status_raw_value, is_commercial_deadhead, hidden_from_timeline, updated_at | as commutes |
| `training_events` | id, event_type, start_time_utc, end_time_utc, station, hidden_from_timeline, updated_at | `end_time_utc >= W.start`, `start_time_utc <= W.end` |
| `manual_events` | id, parent_event_id, category_id, title, start_time_utc, end_time_utc, location, hidden_from_timeline, updated_at | as training |
| `event_categories` | id, name | all rows |

- Queries run in parallel and page with `.range()` in 1000-row pages until a short page comes back.
- **Never read:** `pilots`, `pilot_personal_infos`, `crew_members`, `jumpseat_riders`, `hotels`, `caterings`, `catering_photos`, `aircraft_notes`, `profiles`, and storage.
- **`{Name}`:** take the most recently updated `pilot_infos` row where `is_active` is not false, and trim its `first_name`.
  - If it's missing, use "Your pilot", with the title "Where's your pilot?".

### 6.2 Normalization

- **Airport codes** (every airport field) are trimmed and uppercased:
  - Three letters or digits stay as they are.
  - A UPS base plus "Z" (`SDFZ`, `ANCZ`, `ONTZ`, `MIAZ`) becomes the base. Live data has 126 base values and 22 event locations like this, all `SDFZ`. Other words ending in Z, such as "DIAZ", are not airports.
  - Anything else counts as no airport. Live data has 1,438 manual-event locations holding four-letter non-airport words, which must not turn into airport codes.
- **Base:** `base = base_raw_value`, under the airport-code rule. Every "is this the base?" check uses this pilot base, never `trips.base`, which depends on how a trip was imported.
- **Home:** `home = trim(home_airport_code)` or null.
- **Effective home:** `effHome = home ?? base`. When home is null, `homeAssumed` is true, but the wording doesn't change (Crewlu does the same).
- **Effective times:**
  - `out = block_out_time ?? scheduled_block_out_time`
  - `in = block_in_time ?? scheduled_block_in_time`
  - Crewlu writes ETD and actual times into the non-scheduled columns, so these are the delay-aware truth.
- **Garbage guards** (as in the globe's `transform.ts`):
  - If an actual time differs from its scheduled time by more than 6 h, use the scheduled time.
  - If `in <= out`, or block is longer than 26 h, use the scheduled pair.
  - Drop rows whose times fall before 2000-01-01 or after now + 2 years. There is a live row dated 4026.
- **Flight numbers:** stripped of leading zeros when all digits ("0081" → "81").
- **Drive home follows a late flight.** A `toHome` commute linked to a trip (`source_trip_id`) is shifted by that trip's last-flight delay (effective block-in minus scheduled block-in), within ±6 h. Its scheduled end is kept for the delay color. Crewlu writes commute times once, so without this a 40-minute-late flight would leave the "Back Home In" countdown 40 minutes early. That would be delay-blindness again.

### 6.3 Building legs

**Drop:**
- soft-deleted rows
- rows with `hidden_from_timeline = true` (the pilot hid them)
- manual events with a `parent_event_id`
- trips with no live duty periods
- jumpseats with a `source_trip_id` (duplicates of trip deadheads)
- commutes whose `source_trip_id` trip is gone
- trips whose end is at or before their start

**Leg kinds** (every leg has `start`, `end`, and `tripId` or null)

- **flight** — each live flight in a live trip, from `out` to `in`, with `dep` and `arr`.
  - Flags: `deadhead = is_dh || is_commercial_deadhead || flight_number == 'CML'`, and `ground = is_ground_transport || flight_number == 'GND'`.
- **report** — for each trip's first duty period, from its `start_time` (report) to the first flight's `out`, at the first departure airport.
  - It resolves as **Base** if that airport is the base. Otherwise it resolves as Off at that city.
- **turn** — the gap between consecutive flights in the same duty period, at the arriving airport.
- **duty-period gap** — the gap between consecutive duty periods of a trip, at the arriving airport.
  - It is `home` if the airport is effHome, `base` if it is the base, and `layover` otherwise.
- **jumpseat** — each standalone jumpseat, from `departure_time_zulu` to `arrival_time_zulu`, with `origin` → `destination`.
  - The airline comes from `airline_code`. It is always "riding".
  - `Standby` jumpseats count the same as `Confirmed` in slice 1. Only 8 live rows are Standby, and the UI has no tentative styling yet.
- **drive** — each commute, from `from_airport` → `to_airport`.
  - It is a drive home when `to_airport == effHome` (or `direction == toHome`), and a drive to work otherwise.
- **reserve / hotStandby / event** — each manual event, at `location` (or the base if empty).
  - hotStandby if the title contains "HOT STANDBY".
  - reserve if the title contains one of the codes RSVA–RSSD, LCO or RCID as a whole code, or the category name contains "reserve" (PSG:894-929). A code inside a word doesn't count: "Welcome dinner" is not reserve.
  - event otherwise.
  - An event whose title has a word starting with "driv", or the word "car" or "truck", also counts as a drive for homecomings. "Daycare" and "Card night" don't.
- **training** — each training event, at `station`, titled "{event_type} Training".

**Trim:** after building, any home, base, or layover leg that runs into a flight is cut back to that flight's start (`SharedPilotStatus.swift:199-236`).

**Delays and early departures:** `delayMin = round((out − scheduled_block_out_time) / 60 s)`. A flight is **delayed** when `delayMin >= 15` and **early** when `delayMin <= −15`. Anything inside ±15 is shown as on time.

### 6.4 Status at time t (ordered; the first match wins)

1. **A flight or jumpseat leg covers t → In Flight.**
   - The verb is "riding" for deadheads and jumpseats.
   - A `ground` leg is Ground transport instead.
2. **A drive covers t →** Driving Home if it is a drive home (§6.3: it arrives at effHome or is labelled `toHome`); Driving to Work otherwise. The same rule decides whether the drive is a homecoming for the countdown.
3. **A turn, layover, base, home, or report leg covers t →** that status.
   - A report leg resolves as described in §6.3.
4. **A reserve, hotStandby, training, or event leg covers t →** that status, at the leg's location (or the base).
5. **No leg covers t.** Let c = the last leg that ended before t, and n = the next leg.
   - The location comes from the last ended leg that has one: `arr` for flights, jumpseats, and drives, and `airport` for anything else. An event with no location doesn't move the pilot.
   - No c, or no ended leg with a location → **Home** at effHome.
   - Otherwise:
     - c and n are in the same trip → **Turn**. A turn through home or base stays Turn.
     - The location is effHome → **Home**. Jumpseating home before the next trip counts as Home.
     - n is a standalone jumpseat to effHome that starts before the next trip's first leg → **Commuting home**. This applies wherever the trip ended, at the base or elsewhere.
     - The location is the base → **Base**.
     - Anything else → **Off** ("{Name} is in {City}"). Off-trip is never Layover or Base. This fixes Crewluve `TripStateResolver.swift:469`.

### 6.5 Arrival target (status is not Home)

A **homecoming move** is a flight, jumpseat, drive, or drive-titled event that arrives at effHome. Events at home never count.

1. **Reserve, Hot Standby, or Training → "Released In"**, counting to that leg's end.
2. **Already riding home:** the current leg is a standalone homecoming move (a drive home, or a jumpseat home) → **"Back Home In"**, counting to its end.
3. **Pick the current trip T** — the first rule that applies:
   - the current leg's trip
   - otherwise, the trip of the latest ended **trip** leg, if it ended ≤24 h ago
   - otherwise, the trip of the next **trip** leg, if it starts ≤24 h from now (the pilot is driving or positioned for it)
   - Standalone legs such as events, drives and jumpseats are skipped here. A meeting at base between the drive to work and the report doesn't change which trip counts.
   - otherwise, none
4. **With a T:**
   1. **Final arrival home:** the trip's homecoming move that ends after t, with no other leg of T starting at or after its end. If there is one → **"Back Home In"**, counting to its end.
   2. **Ride home:** the first standalone homecoming move (drive or jumpseat) that meets all of these. If there is one → **"Back Home In"**, counting to its end.
      - it ends after t
      - it starts no earlier than T's last flight departs
      - it starts before any *other* trip's first leg
      - it starts within 3 days of T's last flight landing
   3. **Final flight still ahead:** if T's last flight is still ahead → "Back at Base In" when it lands at the base, otherwise "{City} In", counting to that flight's `in`.
   4. **Otherwise → no countdown** (C26). The trip is over and no ride home is logged.
5. **Without a T:** the first standalone homecoming move that ends after t, starts within 3 days, and starts before the next trip's first leg → **"Back Home In"**. Otherwise no target.
6. **No target, but a trip covers t and has no flight legs →** the "~N days" fallback (§4.4).

**Rules for every target:**
- Never a leg from the next trip (C14).
- Never a time in the past (C3).
- Never a scheduled time when an effective time exists.

**Delay color:** compute the same target from scheduled times. A difference of 15 min or more makes the card red (late) or green (early).

### 6.6 Leave target (status is Home)

1. **First flight:** nf = the first trip flight whose `out` is after t.
2. **Earlier candidates:** each must start after t and before `nf.out`:
   - a drive from effHome to work
   - a standalone jumpseat departing effHome
   - a hot standby, training, or event leg at the base (C10)
3. **Pick the target:** the earliest candidate, or `nf.out` if there are none.
   - The title is "Leaves Home In" when the target departs effHome (a drive or a flight); otherwise "Leaves In".
4. **Trip starting away from base:** count a jumpseat from home to the trip's first airport (`UpcomingTripInfo.swift:74-93`).
5. **Commuter with nothing logged:** "Leaves In", counting to `nf.out`, with the subtitle "Trip departs {BaseCity} …". Never invent a drive time.
6. **Reserve from home** is not a departure. While the reserve leg covers t, the status is Reserve.
7. **Validity:** the target must be after t (C3).
8. **{HB} for the Home narrative:** run §6.5 steps 2–6 on the block that starts with the next trip's first leg. Omit {HB} if no target comes out.

### 6.7 Delays shown in the copy

- **Current or next flight delayed or early** (±15 min) → use the "delayed / pushing early / was delayed / pushed early / extended / shortened" template variants.
- `{delay}` is |delayMin| formatted as in §4.3.
- **Home status with the next trip's first flight delayed** → append the delay suffix.

### 6.8 Days home

**"Been home N days"**
- Count from the end of the **last real arrival home**: a homecoming move that ended at or before t and isn't followed by more legs of its own trip. Do not count from the trip's end at the base (C25).
- N = floor((t − arrival) / 24 h). The pill shows when N ≥ 1.
- If no arrival home exists in the window, hide the pill.

**"Gone for N days"** (Home narrative): the last completed trip's length, as in §4.3.

**Mid-trip nights at home** (a trip's duty-period gap at effHome) show the Home status, as in Crewluve. In that case:
- the days-home pill is hidden
- "after being gone for" is dropped
- the "next trip" in the sentence is the trip already in progress

### 6.9 Time zones

- **Viewer's zone (the browser):** the narrative `{T}`, `{dep}`, and `{HB}`.
- **Pilot's home zone (effHome's IANA zone):** the arrival and leave card subtitles. Fall back to the viewer's zone if it's unknown.
- **Ordinals** ("1st", "22nd") are computed in the same zone as the date they label (C5, C18, C30).

### 6.10 Airline branding and flight numbers

**Airline table**
- Port Crewluve `Utils/AirlineBranding.swift:15-31` (ICAO → IATA) and `:205-300` (code, name, hex color, symbol) into `src/copy/airlines.ts`.
- Symbols map to Phosphor icons. UPS is the only color that changes in dark mode (`#663300` / `#E09E33`).

**Which airline a flight belongs to**
- `airline_code` set → that airline.
- `airline_code` null, not ground transport, not a commercial deadhead, and an all-digit flight number → **UPS** (company flight, as Crewlu does). A commercial ticket is never a UPS flight.
- No code (null or blank) → a generic airplane icon in blue, named "Commercial".
- An unrecognized code keeps its own letters as the name, as in the app, with the generic icon in blue.

**{FL} text:** " on {Airline name} flight {n}" — only when the flight number is all digits. Placeholders such as `XXXX`, `CML`, `GND`, `DUTY`, `HOT-…` omit {FL}.

### 6.11 Bugs avoided

All of these come from the 2026-07-02 Crewluve leave/return-home audit, C1–C30. The full list is in the Crewluv session transcript `~/.claude/projects/-Users-you-Dev-Crewluv/73241709-bef2-4d40-aa03-e21fefa6368b.jsonl`, line 262. Each item gets a regression test.

- **C1, C16, C24 — delay-blindness.** Never decide "next" or "started" on scheduled times.
- **C2, C7, C11, C14, C22 — wrong-trip binding.** Every scan is bounded to the current block or the next trip.
- **C3, C26 — past or stale targets.** These are hidden, never shown as "Now!".
- **Events at home.** They are not homecomings (`TripStateResolver.swift:267`).
- **C25 — days home.** Counted from the arrival home, not the trip end.
- **C9, C19, C23, C27 — drive commuters.** Their homecoming includes drives.
- **C10 — leave-home candidates.** Hot standby, training, and events at the base count.
- **C5, C18, C30 — ordinals.** Each ordinal is computed in the zone it labels.
- **Off-trip status.** Never Turn or Layover (`TripStateResolver.swift:469`).
- **Ground transport and company deadheads.** They aren't shown as "flying".
- **"5X …" flight numbers.** They keep UPS branding (`FlightTrackingHelper.swift:14-22`).
- **24-hour block merge overshoot.** Avoided (§6.5).
- **Report window.** Shown as "at base", not "Home".

## 7. Architecture

### 7.1 Stack

- Vite 5 and TypeScript 5 (strict), the same majors as crewlu-globe, plus **Preact** for TSX components.
- Vitest 3. The globe uses Vitest 2; Vitest 3 clears dev-tool security advisories and still runs on Vite 5 (§12 #13).
- **Licenses:**
  - Phosphor icon paths are MIT. `@phosphor-icons/core` is installed on demand by `npm run icons`, and the paths are copied into a committed file.
  - `geo-tz` is MIT, with timezone-boundary-builder data under ODbL. It's installed on demand by `npm run airports`.
  - The airport data comes from Crewlu's own tables plus OurAirports (public domain), through the globe's list.
  - All of these are credited in `THIRD_PARTY_NOTICES.md`.
- `@supabase/supabase-js` 2.x, using the same project URL and publishable key as `crewlu-globe/src/supabase.ts`, with `persistSession: true` and `autoRefreshToken: true`.
- Vitest, with `@testing-library/preact` and `happy-dom` for component tests.
- Plain CSS with custom properties for light and dark. No UI kit.
- **Browser floor:** the ES2020 build target (Safari 14, Chrome 87, Firefox 78). App code avoids newer built-ins such as `structuredClone`.
  - The CSS uses flex `gap` and `inset`, which need Safari 14.1, so on iPhones the real floor is iOS 14.5. Devices still on iOS 14.0–14.4 can update.
  - Newer CSS such as container-query units (`cqi`, Safari 16+) always comes after a plain fallback declaration, so older browsers still get sensible sizes.
- Phosphor icon SVGs inlined as Preact components (only the icons used).

### 7.2 Layout

This is the design-time sketch. Where file names differ, the implementation plan's file structure wins.

```
index.html                      CSP meta (prod), app root
public/CNAME                    crewluve.crewlu.net
public/data/airports.json       generated (§7.4), committed
public/icons/…                  favicon + apple-touch-icon from the Crewluve icon
scripts/build-airports.mjs      generator (§7.4)
src/main.tsx                    bootstrap: demo → App(demo) | session gate → App(live) | SignIn
src/supabase.ts                 client
src/auth/session.ts             getSession, onAuthStateChange, signIn, signOut
src/auth/SignIn.tsx
src/data/rows.ts                row types (§6.1)
src/data/fetchSchedule.ts       parallel paged selects → RawSchedule; the ONLY Supabase data access
src/data/cache.ts               localStorage cache of the last RawSchedule (key crewluve.schedule.v1)
src/data/demo.ts                synthetic RawSchedule + scenes
src/data/airports.ts            load + lookup (city, country, lat, lng, tz)
src/engine/normalize.ts         rows → domain (§6.2)
src/engine/legs.ts              domain → Leg[] (§6.3)
src/engine/status.ts            Leg[] + t → Status (§6.4)
src/engine/targets.ts           arrival / leave targets, days home (§6.5–6.8)
src/engine/snapshot.ts          one call: (schedule, airports, t) → StatusSnapshot for the UI
src/copy/format.ts              countdowns, times, dates, ordinals, zone abbreviations
src/copy/narrative.ts           StatusSnapshot → Span[] (templates §4.3)
src/copy/airlines.ts            branding table (§6.10)
src/ui/App.tsx, Title.tsx, NarrativeCard.tsx, ProgressRing.tsx, CountdownCard.tsx,
       FallbackCard.tsx, DaysHomePill.tsx, Celebration.tsx, Footer.tsx, EmptyState.tsx,
       DemoBanner.tsx, icons.tsx
src/ui/hooks/useNow.ts          1 s ticker
src/ui/hooks/useSchedule.ts     cache → fetch → 5 min refresh, visibility refetch, status
src/styles/*.css                tokens (colors, light/dark), glass, cards, typography
tests/…                         Vitest
.github/workflows/deploy-pages.yml
docs/superpowers/specs|plans
```

**Unit boundaries**
- `engine/` and `copy/` are pure and know nothing about Preact or Supabase.
- `data/fetchSchedule.ts` is the only module that talks to the database.
- UI components receive a `StatusSnapshot` and formatted spans, and do no schedule logic.

### 7.3 Data flow

```
Supabase ──fetchSchedule──▶ RawSchedule ──cache.ts──▶ localStorage
                                 │
airports.json ───────────────────┤
                                 ▼
                 snapshot(raw, airports, now)   ◀── useNow (1 s)
                                 │
                                 ▼
                 Title · NarrativeCard · CountdownCard · Footer
```

`RawSchedule` = `{ fetchedAt, newestUpdatedAt, rows by table }`.

### 7.4 Airport dataset

- `scripts/build-airports.mjs` reads the globe's generated list, `~/Dev/crewlu-globe/public/data/airports.json` (9,056 unique entries `{iata, lat, lng, city, country}`). That list's city names already come from Crewlu's airport data, which wins over OurAirports. Verified: SDF Louisville, CGN Cologne, BLR Bangalore.
- It adds an IANA zone per airport from lat/lng using **`geo-tz`** (MIT; boundaries from timezone-boundary-builder, ODbL).
  - geo-tz is accurate near zone borders, where `tz-lookup` isn't.
  - It uses geo-tz's **full dataset** (`geo-tz/all`). The default dataset merges zones that have shared rules since 1970. For example, it puts Papeete in Pacific/Honolulu ("HST") and La Paz in America/Puerto_Rico ("AST").
  - It's about 74 MB, so `npm run airports` installs it on demand with `--no-save` and it never enters package.json or CI.
- **Zones newer than some browsers' time-zone data** are written under names those browsers know:
  - Three older aliases of the same zone: America/Nuuk → America/Godthab, Europe/Kyiv → Europe/Kiev, Pacific/Kanton → Pacific/Enderbury.
  - Two stand-ins that are different zones sharing today's rules: America/Ciudad_Juarez → America/Denver (since Nov 2022) and America/Coyhaique → America/Punta_Arenas (since 2025). These must be rechecked every time the data is regenerated.
- At runtime, the airport index's `tz()` returns null for an unknown airport, and for a zone the browser's `Intl` rejects. The caller then uses the viewer's zone (§8).
- It writes a compact `public/data/airports.json` (`[iata, city, country, lat, lng, tz]` tuples), which is committed. CI never regenerates it.
- A test checks each pinned airport's zone gives the right October 2026 abbreviation. (Zone *names* can legitimately vary, for example America/Kentucky/Louisville vs America/New_York, so the test pins abbreviations instead.)

| Airport | Abbreviation |
|---|---|
| SDF | EDT |
| LEX | EDT |
| MCO | EDT |
| ANC | AKDT |
| HNL | HST |
| ONT | PDT |
| PHX | MST |
| CGN | GMT+2 |
| HKG | GMT+8 |
| BLR | GMT+5:30 |
| PPT | GMT-10 |
| LPB | GMT-4 |

## 8. Error handling

| Situation | Behavior |
|---|---|
| Wrong email/password | Inline sign-in error (§4.2) |
| Session expired or revoked | `onAuthStateChange` → clear cache → sign-in screen |
| Network failure on fetch | Keep the cached/current data; footer "Couldn't reach CrewLu Cloud — will retry"; retry at the next 5-minute tick or refresh |
| Offline (`navigator.onLine === false`) | Footer "Offline — showing the schedule from {time}" |
| Partial fetch failure (one table errors) | Keep the previous good RawSchedule; footer error; never mix old and new tables |
| No CrewLu Cloud data | Empty state (§4.6) |
| Garbage rows | Dropped or repaired silently by §6.2 guards; never crash the render |
| Unknown airport code | Use the IATA code as the city name and the viewer's zone as the time zone |
| `airports.json` won't load | Treat every airport as unknown (above) right away; try once more 3 s later, and swap in city names if that works |
| Engine exception | Caught at the snapshot boundary; render the "Unknown" status ("On duty") with no countdown, and log to the console |

## 9. Privacy and security

**Read-only**
- The code never calls `insert`, `update`, `upsert`, `delete`, `rpc`, Edge Functions, or Storage.
- **Enforced at the network.** The Supabase client's fetch is wrapped (`src/data/readOnlyFetch.ts`). Only these requests can leave the browser:
  - reads: GET or HEAD under `/rest/v1`, and GET under `/auth/v1`
  - sign-in and token refresh: POST `/auth/v1/token`
  - this-device sign-out: POST `/auth/v1/logout?scope=local`

  Everything else is refused before it reaches the network.
- **Checked in the source.** A test parses `src/` and fails if any of these appear:
  - another `@supabase` import
  - a second client, or the client imported by anything but the session module and the app root
  - a raw non-GET fetch
  - write-like calls in files that touch the client

**What is read**
- Only the tables and columns in §6.1. Crew names, hotels, confirmation codes/PNRs, the pilot directory, and the pilot's notes on other pilots are never requested.
- Rows the pilot marked hidden in Crewlu are filtered out in the query (`hidden_from_timeline` not true), so they never reach the device. Normalization drops them again as a second line of defense.

**Session and cache**
- Supabase keeps the session in this origin's localStorage. Sign-out runs `supabase.auth.signOut({ scope: 'local' })`, removes `crewluve.schedule.v1`, and returns to the sign-in screen.
  - **Local scope is essential.** The default, global, revokes every session on the account. Visitors use the pilot's login, so it would sign the pilot's Crewlu app out on every device. Duty hit this on 2026-07-14.
- **A stored session counts as signed in.** A return visit shows the cached schedule at once, even offline with an expired token. A dead session ends through the fetch's auth error or Supabase's SIGNED_OUT event.
- **Empty results.** Row-level security answers a request without a valid session with empty tables, not an error. So an all-empty fetch is believed only while the session is live; otherwise it signs out.
- **No stale writes.** A fetch that finishes after sign-out is discarded, never written back to the device.
- **Demo mode makes no network calls.** The client code loads only on the live path, through a dynamic import, so demo mode never creates it.

**Credentials**
- The visitor holds the pilot's CrewLu Cloud password. That password grants full account access in Crewlu, so the pilot should share it only with people they trust.
- Separate read-only family logins are a possible later slice (§13).

**No injected HTML**
- Preact escapes all text. No `innerHTML` or `dangerouslySetInnerHTML` anywhere.

**Content Security Policy** (production build; a `<meta>` tag, because GitHub Pages can't set headers)
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; font-src 'self';
connect-src 'self' https://corxvurxpnrzekbxdgye.supabase.co;
object-src 'none'; base-uri 'self'; form-action 'self'
```
- The build fails if `index.html` loses its CSP placeholder, so production never ships without a policy.
- `connect-src` reads the project URL from the same constant the Supabase client uses (`src/cloud.ts`).
- The visual check (plan Task 32) tries dropping `'unsafe-inline'` from `style-src` under the production preview.

**No analytics, cookies, or third-party scripts.**

## 10. Testing and verification

**Gates** (local and CI): `npx tsc --noEmit`, `npx vitest run`, `npm run build`.

**Engine tests** (TDD, the core of this slice)
- Built with a small fixture builder (trips → duty periods → flights, commutes, jumpseats, events) and a fixed `t`.
- Every moment of the approved storyboard: home before a trip with a drive pending, driving to work, base before report, report window, in flight, turn, layover, delayed departure, delayed in the air, last leg home under 24 h, driving home, home after, been home N days.
- **Commuting cases:**
  - commuting home by jumpseat
  - commuter with no logged ride (no countdown)
  - a trip ending away from base
- **Duty and event cases:**
  - reserve, hot standby, and training ("Released In")
  - an event at home that is not a homecoming
- **Leg types:** deadhead (riding), commercial deadhead with an airline, ground transport.
- **Audit cases:** next-trip gate (C14), past target hidden (C3), 24 h merge overshoot.
- **Filtering and data repair:**
  - hidden rows excluded
  - jumpseats with `source_trip_id` excluded
  - garbage dates
  - SDFZ base
  - no home airport (effHome = base)
  - two active `pilot_infos` (latest wins)
- **Port Crewluve's `CrewluvTests/TripStateResolverGapTests.swift` cases** that apply.

**Copy tests**
- Every template and fallback in §4.3.
- `{FL}` for a company flight ("0081" → "UPS flight 81"), a commercial flight, and placeholders.

**Format tests**
- Countdowns (both styles).
- 12/24-hour times, zone abbreviations, `{dep}` today/tomorrow/weekday, and ordinals in zone.
- `{t}` ages.

**Data tests**
- Airport zone pins (§7.4).
- The cache round-trip.
- The read-only guard (§9).

**Component tests**
- Each card renders the right title, icon, colors, and format for a given snapshot.
- The celebration shows only under 24 h, and not under reduced motion.
- Footer ages and error rows.

**Visual verification** (before calling anything done)
- Run every demo scene in the browser pane at 390×844 and 1280×800, in light and dark.
- Compare side by side with the Crewluve screenshots in `~/Dev/App Photos for app store/Crewluve app Photos/`.
- Then the user signs in with real data on localhost and again on the live site.

## 11. Deployment

- **Repo:** `skimmer747/crewluve-web`, public, branch `main`. Repo creation and pushes happen only when the user asks.
- **Workflow:** `.github/workflows/deploy-pages.yml`, copied from crewlu-globe. It runs `npm ci`, `npx vitest run`, `npm run build`, `upload-pages-artifact`, and `deploy-pages`, with up to 3 attempts (Pages often fails the first one).
- **Node version:** CI reads it from `.nvmrc` (24, the current LTS). supabase-js 2.117 needs Node 22 or later.
- **No CI secrets.** The publishable key is public by design.
- **Custom domain**
  - `public/CNAME` contains `crewluve.crewlu.net`.
  - DNS: one CNAME record, `crewluve` → `skimmer747.github.io`, in the crewlu.net zone. The user adds it; Claude walks them through. crewlu.net's CAA already allows letsencrypt.org.
  - In GitHub, under Settings → Pages, set the custom domain and enable "Enforce HTTPS" once the certificate is issued.
  - If the certificate never provisions, remove the domain, wait about a minute, and re-add it. This is the globe's 2026-06-22 fix.
- **Linking from the website:** a link from crewlu.net/crewluve/ to the new site is a separate CrewLu-Website change, made only when asked.

## 12. Decisions log (2026-10-08)

| # | Decision | By |
|---|---|---|
| 1 | Visitors sign in with the pilot's CrewLu Cloud email and password. No sharing or invites. | User |
| 2 | Copy the current Crewluve app UI exactly; deviations only where forced or approved (§4.8). | User |
| 3 | Slice 1 = sign-in + data + "where are they now" + home countdown; everything else later. | User |
| 4 | New project; Vite + TypeScript + Preact building blocks; GitHub Pages like the globe. | User (recommended option) |
| 5 | Address: crewluve.crewlu.net. | User |
| 6 | Reserve, hot standby, and training show "Released In". | User approved |
| 7 | A commuter with no logged ride home gets no Back Home countdown. | User approved |
| 8 | Port Duty's leg builder and Crewluve's resolver, not Duty's cascade; fix the audit bugs. | Design |
| 9 | Delays come from effective flight times at a ±15 min threshold. Quick status and manual delay reports aren't available. | Design |
| 10 | The report window shows "at base". | Design (storyboard approved) |
| 11 | Phosphor fill icons stand in for SF Symbols; system fonts (SF on Apple devices). | Design |
| 12 | No analytics; public repo. | Design |
| 13 | Test tooling is Vitest 3.2.7 and happy-dom 20.14.5, for security fixes. The remaining dev-only advisories need Vite 6+ and Vitest 4, which is a later upgrade. | Design (Batch A review) |
| 14 | Airport zones come from geo-tz's full dataset. Zones some browsers don't know become an older alias or a same-rules stand-in (§7.4). `tz()` returns null for any zone the browser rejects. | Design (Batch A review) |
| 15 | The CSP adds `object-src 'none'`, and the build fails without the CSP placeholder. | Design (Batch A review) |
| 16 | If `airports.json` won't load, codes show at once and one retry runs 3 s later. | Design |
| 17 | One constant holds the CrewLu Cloud URL for both the client and the CSP. CI's Node version comes from `.nvmrc` (24). | Design |
| 18 | The demo's Anchorage delay appears only from the `delayed` scene on (§4.7). | Design (early browser check) |
| 19 | Engine fixes from review, each pinned by tests: "base" always means the pilot's base; airport fields accept only 3 characters or a UPS base plus "Z"; reserve codes and drive words match whole words; one drive-home rule for status, countdown, and the "heads home" sentence; a location-less event doesn't move the pilot; commercial deadheads are never UPS; inverted trips are dropped. | Design (Batch C review) |
| 20 | Batch D review fixes: the sentence shows "On duty" whenever the "~N days" card shows; the current trip comes from the nearest trip legs, not neighboring events; `trips.days` of 0 falls back to the calendar count. Celebrating during "Released In" matches Crewluve, which celebrates any arrival under 24 h while not at home or base. | Design (Batch D review) |
| 21 | Batch E review fixes: the home sentence's commuter wording appears only with a logged jumpseat to work, as in the app; Off uses the delayed-departure sentence; every template branch is pinned by tests. | Design (Batch E review) |
| 22 | Batch F review fixes: sign-out is local-only; read-only is enforced by a fetch wrapper and a source scan; hidden rows are filtered in the query; a stored session renders the cache at once; an all-empty fetch needs a live session; late fetches after sign-out are discarded; the client loads only in live mode. | Design (Batch F review) |

## 13. Roadmap (after slice 1)

Each item gets its own short brainstorm → spec → plan → build pass.

1. **Slice 2 — the rest of the Crewluve main screen**
   - In-flight map card
   - Location card (weather via a keyless API, local time, time difference, sun dial) and its popup
   - "Day N of M" with Upcoming Cities
   - Upcoming-trip card and View Schedule card
2. **Slice 3 — Schedule**
   - Month calendar and leg timeline
   - The countdown card opens it
   - iPad/desktop two-column layout
3. **Web-only ideas from the 2026-10-08 idea board**
   - **Right now:** Can I call?, Miles apart, Same sky, Track it live, Layover postcard.
   - **Planning:** Together calendar, Next time home, What changed?, Commute tracker, Holiday radar.
   - **Memories:** Passport stamps, Year in review, Mini flight globe, Crew meal gallery (names and ratings; photos don't sync yet), On this day, Tonight's airplane.
   - **Family:** Kids mode, Home-front medals, Kitchen screen, Weather showdown, Nap meter (trip fatigue scores exist on every trip).
4. **Optional:** separate read-only family logins, so the pilot never has to share a password.
