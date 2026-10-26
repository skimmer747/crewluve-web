# Partner Links Piece 5a: the Website Joins with the Invite Link

- **Status:** Design approved in brainstorming on 2026-10-26.
- **Amended:** 2026-10-26, while writing the plan (`docs/superpowers/plans/2026-10-26-partner-links-piece5a-website-join.md`). The changes are in P5-2, §4.1, §4.2, §4.3, §6, §8, §9, §10 and §11:
  - the converter builds the engine's `Schedule`;
  - delays move both ends of a flight, as in Crewluve;
  - the name comes from `displayNameByPartner` first;
  - Disconnect asks first and can fail;
  - the guard's new file;
  - `rows.ts` stays;
  - the fixtures are the 18 trimmed summaries.
- **Amended again:** 2026-10-26, from the code reviews while building:
  - §4.1: what pasted text yields;
  - §4.2: forgetting keeps a pending key;
  - §4.3:
    - a connected key freed by the pilot is let go at once;
    - an unreadable or `unchanged` first read is Couldn't Connect;
    - Cancel doesn't wait;
    - a code retried after a lost answer, by a browser connected to another pilot, is refused;
  - §5: the races, and an answer for another partner, followed once per poll;
  - §6: delay bounds, UPSGND, and three more thin spots;
  - §7: the quick status's place, look and spacing;
  - §8: links pasted into the boxes, the code field on phones, repeated alerts, and contrast;
  - §9: the frozen list, the time limit and refused redirects.
- **Part of:** the partner-links design, `docs/superpowers/specs/2026-10-15-partner-links-design.md` (the umbrella): §5.2, §5.5, §6.2, §7.3 and §9 (piece 5).
- **Contract:**
  - the partner door, `~/Dev/Duty/supabase/partner-api.md`, live since 2026-10-15;
  - the summary, schema version 1: `~/Dev/Duty/supabase/partner-status/schema.json`.
- **Why now:** the user holds CrewLu 3.1.0 (piece 2) until this is live. Then 3.1.0's What's New card, its App Store notes and the Partner Sharing help can say that partners on Android or a computer can connect. The release plan is `docs/superpowers/plans/2026-10-26-partner-links-piece2-release.md`.

---

## 1. Goal

A partner opens their invite link anywhere other than an iPhone or iPad with Crewluve: an Android phone, a computer, or an iPhone without the app. The browser connects by itself and shows "Where's {Name}?", with no password. The website's screens stay as they are today.

## 2. What's there now

- **Sign-in:** the pilot's own email and password (`src/auth/session.ts:46-55`).
- **Data:** nine owner tables (`src/data/fetchSchedule.ts:57-74`), turned into `Schedule`, then `Leg[]`, then a `Snapshot` by `src/engine/` (`src/ui/PilotPages.tsx:45-71`).
- **`/join`:** the static, script-free `public/join.html`. It tells everyone to open the link on an iPhone or iPad.
- **The guard:** `src/data/readOnlyFetch.ts` refuses every RPC.
- **Quick status:** shown nowhere.
- **Deploy:** every push to `main` (`.github/workflows/deploy-pages.yml`).

## 3. Decisions (2026-10-26)

| # | Decision |
|---|---|
| P5-1 | **Piece 5 splits in two.**<br>• **5a, this spec:** links, the summary as the only data, and the password sign-in removed.<br>• **5b, later:** the website follows Crewluve's logic, with the golden cases (umbrella §7.4, piece 4's P4-1) and a demo built from Crewluve's demo summary. |
| P5-2 | **The website keeps its own engine and screens** (the user's choice of two options). A converter turns the summary into the website's `Schedule`: the pilot, the trips with their duty periods, the jumpseats, the drives and the events. `buildLegs` then makes the legs from it, as it does for the demo, by the same rules CrewLu used to write them. `buildSchedule` stays, for the demo only. |
| P5-3 | **The password sign-in goes with this piece** (the user's choice). Anyone who uses the pilot's password loses access until the pilot sends their link. A pilot who wants to see their own status adds themselves as a partner ("Me") and opens that link (umbrella §7.3). |
| P5-4 | **The website redeems hand-off codes but doesn't make them.** Use on Another Device stays in Crewluve. |
| P5-5 | **No alerts on the web.** The site polls while it's visible (umbrella D12). |
| P5-6 | **Each browser names itself** "{Browser} on {Platform}", for example "Chrome on Android". CrewLu shows a device's label on the partner's page and in its Remove alert (`PartnerDetailView.swift:141, 238-239`). |
| P5-7 | **Safari's "Get the app" banner** (`<meta name="apple-itunes-app" content="app-id=6759344060">`) is on every page, since only the app gets alerts. |

## 4. Connecting

### 4.1 The `/join` page

- The build writes `join.html` as an exact copy of the built `index.html`: the same bundle and the same CSP. `public/join.html` is deleted, and GitHub Pages serves the new file for `/join`.
- The app reads the fragment on any path:
  - `#t=<invite>` joins with `partner_join`;
  - `#c=<code>` redeems with `partner_handoff_redeem`.
- Once it has read the fragment, it replaces the address with `/` (`history.replaceState`). The secret leaves the address bar, and a reload doesn't join again.
  - A `/join` address with no link goes to `/` too.
  - Any other fragment stays, such as the Schedule page's `#schedule`.
  - A link pasted into the address bar while the page is open changes only the fragment, and joins too.
- Pasted text yields only the link's own letters and digits (`#[tc]=[0-9a-z]+`), so a full stop or a bracket after the link isn't taken as part of it. A code from a link is tidied as Crewluve's `PartnerLink.code(from:)` tidies one: spaces and dashes go, it's upper-cased, and it must be six letters or digits.
- `public/.well-known/apple-app-site-association` doesn't change. On an iPhone or iPad with Crewluve, the link still opens the app.

### 4.2 The key and what's stored

- **The key:** 32 random bytes from `crypto.getRandomValues`, written as 64 lower-case hex characters. The door requires `^[0-9a-f]{64}$`.
- **localStorage:**
  - `crewluve.device.v1`: `{key, partnerId}`, once connected;
  - `crewluve.pendingKey.v1`: the key being tried, saved before it's sent;
  - `crewluve.summary.v1`: `{partnerId, updatedAt, status, checkedAt}`, the last answer, and when the door last answered (§5).
- **Forgetting** (Disconnect, or sharing ended): the device and the summary go. A pending key stays, as in Crewluve, so a join whose answer was lost reaches the same device when it's tried again.
- **Keys are checked** on the way in and on the way out: a stored key that isn't 64 lower-case hex is ignored, and one can't be saved.
- **The old sign-in's leftovers:** on load, the site deletes the stored session (`crewluve-auth`) and the old schedule cache (`crewluve.schedule.v1`).
- **Kind and label:** `p_kind` is `web`. `p_label` is P5-6's label. When neither the browser nor the platform is recognized, the label is empty, and the door writes "Web browser".

### 4.3 Joining

The steps follow Crewluve (`Services/PartnerJoiner.swift`, `Services/PartnerCloud/CrewluCloudDevice.swift`) and the door's rules (`partner-api.md` "Keys" and "Errors").

1. Show "Connecting…".
2. **Pick the key:** the connected key if there is one, otherwise the pending key, otherwise a new key, saved as pending first.
3. **Call the door:** `partner_join(p_invite, p_device_key, 'web', label)`, or `partner_handoff_redeem(p_token, p_device_key, 'web', label)` for a code.
4. **`key_in_use` with the connected key:** try again with the pending key, otherwise with a new pending key. The connected key is never sent with a different partner's link.
5. **The answer is for the connected key and its own partner:** nothing changes; refresh and show the status.

   **The connected key joined another partner:** the pilot had removed this browser's device, which freed the key.
   - The browser forgets its old device and summary at once, and keeps the key as the pending key. A retry then reaches the same device, and nothing here goes on naming the old one. Crewluve has this gap still; it's a follow-up there.
   - If the join then ends without connecting, the welcome screen says "Sharing with {Name} has ended."
6. **Otherwise,** call `partner_view` with the new key and no `since`.
   - An `unchanged` answer, which a read with no `since` can't get, is no answer.
   - A summary this site can't read means "Couldn't Connect", as in Crewluve.
   - If the browser already follows a different pilot (`pilotId` differs, in any case), ask "Switch to {Name}?" / "You'll stop seeing {Current}'s status in this browser." (Crewluve's `SwitchQuestion`). A question that fails to ask counts as a No, so a join never rejects.
     - **Cancel:** call `partner_leave` with the new key, tried once without waiting on it, and forget the pending key.
     - **Switch:** go on to step 7.

   A browser that follows no one yet goes straight to step 7.
7. **Connect:**
   - the new key becomes the connected key;
   - the device it replaces leaves (one try, and failures are ignored). It's read again just before, so a device another tab connected meanwhile isn't left behind;
   - the stored summary is replaced;
   - the status shows with one line: "Connected on this browser. Add it to your Home Screen to keep it handy."

A lost answer shows "Couldn't Connect" and keeps both keys. Trying again sends the same key, so the same device answers.

One retry doesn't: a code tried again by a browser that's connected to another pilot, after the first answer was lost on the pending key. The retry sends the connected key first. The server has the code as used by another device, so it answers `sharing_ended` and counts a failure toward the pause. A new code from the pilot reaches the same device, through the kept pending key. Crewluve has the same gap.

`sharing_ended` from `partner_join` or `partner_handoff_redeem` means only that this link or code is dead. The browser keeps any key it's connected with (`partner-api.md:78-80`).

### 4.4 Messages

The same words as Crewluve (`Models/JoinMessage.swift`):

| Answer | Title | Text |
|---|---|---|
| `sharing_ended` from an invite | Invite Link Not Working | "This invite link doesn't work anymore. You're still connected to {Name}." when connected, otherwise "This invite link doesn't work anymore. Ask your pilot to send it again." |
| `sharing_ended` from a code | Code Not Working | "That code didn't work. Codes last 10 minutes and work once. Make a new one on your other device." |
| `too_many_devices` | Too Many Devices | "This invite already has 10 devices. Ask your pilot to remove one in CrewLu, then try again." |
| `try_later` | Too Many Tries | "Too many tries. Wait a minute, then try again." |
| `invalid_input`, or pasted text that isn't an invite link | Not an Invite Link | "That doesn't look like an invite link." |
| `key_in_use` after every key, no answer, or anything else | Couldn't Connect | "Couldn't connect. Check your connection and try again." |

## 5. Staying connected and current

- **Polling:** `partner_view(key, since)` every 30 s while the page is visible, when it becomes visible again, and when the browser comes back online (umbrella §6.2).
- **`since`:** the stored summary's `updated_at`, sent back exactly as received (`partner-api.md:86`).
- **The answers:**
  - **`unchanged`:** keep what's shown, and update "Checked just now";
  - **a summary:** store it, then convert and show it (§6);
  - **`status: null`:** "Waiting for your pilot's first update…";
  - **`sharing_ended`:** forget the key and the stored summary, then show the welcome screen with "Sharing with {Name} has ended." The name comes from the stored summary.
  - **While Disconnect's own `partner_leave` is out:** a poll that finds the device gone is that Disconnect, not sharing ending, so it says nothing (as Crewluve's `isDisconnecting`).
  - **An answer that names another partner:** the door gave this browser's key to that partner, through a join whose answer never came back, or whose page closed before it could save. The browser follows the door. After an `unchanged` answer it asks again with no `since`, because the `since` sent was the other partner's. It follows once per poll: a second such answer in the same poll fails that poll, and the next poll tries again, so a store that doesn't keep what it's given can't make one poll call the door forever.
- **Races:** a poll writes nothing when the device changed while it was out, by key or by partner: another tab, or a join in this one, moved it. On `unchanged`, "Checked" moves on whatever summary is stored by then.
- **Next visit:** the stored summary shows at once, then it's refreshed.
- **What ends a connection:**
  - Disconnect;
  - the pilot removing the person or that browser in CrewLu;
  - cleared site data, or a private window that's closed;
  - Safari's rule of 7 days of use without a visit. A site added to the Home Screen is exempt.

  The same link reconnects. The old browser stays on the partner's page in CrewLu until the pilot removes it.
- **The footer:**
  - "Checked …" is the last answer from the door;
  - "Schedule updated …" is the summary's `lastUpdated`.

## 6. The converter

Its input is one summary. Its output is the `Schedule` the website's engine already reads. `buildLegs` then makes the legs from it, as it does for the demo.
- **Checked while planning:** all 18 trimmed examples come out with CrewLu's own legs, at the same times, and with the statuses Crewluve shows: home, turn, in flight, layover and commuting home.

**Pilot:**
- **Name:** the name this partner sees: `displayNameByPartner[partnerId]` (for example "Dad"), else `pilotFirstName` (Crewluve's `CloudSummary.displayName(for:)`).
- **Home:** from `homeAirportCode`, which is already the effective home.
- **Base:** from `baseAirportCode`.
- **Home zone:** from the airport list, as before. `homeTimezone` isn't needed.

**Legs, by the summary's `type`:**

| `type` | Website | How |
|---|---|---|
| `flight` with a `tripId` | a `Move` in that trip | `dep`/`arr` from `departureAirport`/`arrivalAirport`. `startTime`/`endTime` are the schedule (`schedStart`/`schedEnd`); `delayMinutes`, on the leg that carries it, moves both ends (`start`/`end`), as Crewluve's `TripStateResolver.effectiveStart`/`effectiveEnd` do. A delay is read only as a whole number within ±24 hours; CrewLu offers up to about 11 hours. The airline and number come from `flightNumber`, spaces ignored: "UPS2961" is a company flight; "DL1180" with `airlineCode` "DL" is Delta. `deadhead` is true when `airlineCode` is set (a commercial deadhead) or the number is CML. `ground` is true for "GND", and for "UPSGND": CrewLu writes "UPS" before a company flight's GND when its ground flag isn't set. |
| `flight` with no `tripId` (`js-` ids) | a jumpseat `Move` | As above. A jumpseat always rides. |
| `turn` | made again | `buildLegs` makes the turn between two flights of one duty period. |
| `layover`, `home`, `base` | made again | They split the trip's flights into duty periods, and `buildLegs` makes the night between them. |
| `drive` | a `Commute` | `from`/`to` from `departureAirport`/`arrivalAirport`; `toHome` when it ends at home or its label is "Driving home" (the rows' rule); `schedEnd` is `end`. |
| `reserve`, `hotStandby` | a duty event of the same kind | The title from `label`, the airport from `airportCode`. |
| `event` | `training` when the id starts with `te-`, otherwise `event` | The title from `label`. `airportCode` becomes the airport when it's an airport code, and the location either way. `driveLike` comes from the title, by the website's existing rule. |
| `unknown` | dropped | |

**Trips:** one per `tripId`:
- the start is the earliest leg's start, and the end is the latest leg's end;
- each duty period starts at its first flight, so there are no report legs;
- the days are `tripTotalDays`; 0 is counted from the dates, as before.

**What's thinner than today:**
- There are no report legs, as in Crewluve.
- Company deadheads aren't marked in the summary, so they show as ordinary flights.
- A planned time differs from the actual time only on the leg that carries `delayMinutes`.
- A drive home doesn't move with a late last flight.
- A trip whose flights are all hidden isn't in the summary at all, so it doesn't show as "On duty".
- **No night written:** when CrewLu writes no night between two duty periods (the next one's flights are all gone), they merge, and the gap shows as one long turn.
- **No flight after a night:** a night with no flight after it, such as the last duty period hidden, is dropped.
- **Reserve codes inside words:** CrewLu matches reserve codes inside words, so a title such as "Welcome dinner" arrives as reserve "LCO". The rows had been fixed for this (normalize.ts); the fix belongs in CrewLu now, which would fix Crewluve too.

## 7. Quick status

- **Order:** the partner's own entry (`quickStatusByPartner[partnerId]`) comes first, then the status for everyone (`quickStatus`, `quickStatusIcon`, `quickStatusExpiry`). Each shows until it expires, as in Crewluve (`Models/CloudSummary.swift:155-165`).
- **Where:** on the location card, where Crewluve's `QuickStatusIndicatorView` sits, between the weather and the time.
  - A 20 px blue icon.
  - The words at 16 px medium, in the primary text color: Crewluve's blue words wouldn't pass contrast on the glass.
  - A hidden "Quick status:" for screen readers.
  - 4 px above it, as Crewluve pads it, which makes 16 below the weather credit.
  - Not yet, for 5b: Crewluve's pulsing icon, and its "(42:13 left)" before an expiry.
- **Icons:** CrewLu's icons are SF Symbol names. They map to the website's own icons through a fixed table, and an icon that isn't in the table shows a speech bubble.

## 8. The welcome screen

It replaces the sign-in screen, and shows whenever this browser isn't connected:
- "Welcome to CrewLuve" and "Stay connected with your pilot";
- "Open the invite link your pilot sent you, on this device.";
- **Paste Invite Link:** a box for "Paste the invite link your pilot sent you.", with a Connect button.
  - It takes `#t=` and `#c=` links, also inside CrewLu's whole message.
  - Text with no link says "Not an Invite Link" without calling the door.
  - Each problem shows as a new alert, so one that repeats is announced again.
- "or type the code from CrewLuve on another device", with six boxes:
  - one field drawn as six boxes, so typing, pasting and the keyboard's suggestions all work;
  - **the field on phones:**
    - It's opaque, with its text, caret and background transparent. iOS hides Paste on a field it judges invisible by its opacity.
    - It's left uncontrolled, and rewritten only when a character is dropped, never for case. Rewriting a field mid-word makes Android keyboards double letters.
    - The caret stays at the end, since the boxes show the code from its start.
    - The next box shows the focus.
  - the letters are upper-cased in the boxes, from the door's alphabet `23456789ABCDEFGHJKMNPQRSTUVWXYZ`;
  - the code is sent on the sixth character;
  - a whole link pasted into them, an invite link or a code link, connects as the link would, not as its first six letters;
  - other text with `/`, `#` or `=`, the pieces of a link, says "Not an Invite Link" instead of being sent as a code;
  - the boxes clear on a failure: Root shows "Connecting…" between attempts, which starts the screen afresh;
- **Try Demo:** the existing `?demo=1`;
- "Sharing with {Name} has ended.", when that's why it's showing (§5).

The small labels, the ended line and the alert are in the primary text color: the site's grey and red don't reach 4.5:1 at 13–15 px.

**Disconnect** replaces Sign Out in the footer. It asks first, as Crewluve does (`DisconnectQuestion`): "Disconnect from {Name}?" / "You'll stop seeing {Name}'s status in this browser. To connect again, open the invite link {Name} sent you."
- **On a yes:** it calls `partner_leave` (always `{ok:true}`), forgets the key and the stored summary, then shows the welcome screen.
- **When `partner_leave` gets no answer:** it says "Couldn't disconnect. Check your connection and try again." and stays connected, as Crewluve does. A browser that forgot its key would leave its device in the pilot's list with no way to remove itself.

## 9. The guard and the CSP

- **The guard:** `src/partner/doorGuard.ts` replaces `src/data/readOnlyFetch.ts`. It allows only POSTs to these RPCs on the Crewlu Cloud host, with no query string:
  - `/rest/v1/rpc/partner_join`;
  - `/rest/v1/rpc/partner_handoff_redeem`;
  - `/rest/v1/rpc/partner_view`;
  - `/rest/v1/rpc/partner_leave`.

  Everything else to that host is refused, including `/auth/v1/` and table reads. The weather and `airports.json` are unchanged.
- **One module:** the four calls come from a single module, `src/partner/door.ts`, with the publishable key from `src/cloud.ts`. The source rules let no other file send more than a plain GET.
- **The guard's list** is frozen. Fetch gets the method the guard judged.
- **Each call:**
  - has a 20-second time limit, by a timer where Safari has no `AbortSignal.timeout`;
  - refuses redirects, so a key is never sent on to another address.
- **The CSP's `connect-src`** is unchanged: the Crewlu Cloud host and Open-Meteo.

## 10. Removed

- `src/auth/` and `src/ui/SignIn.tsx`.
- `src/data/fetchSchedule.ts`, the schedule cache (`src/data/cache.ts`), `src/data/readOnlyFetch.ts` and `src/supabase.ts`.
- `@supabase/supabase-js`: nothing else needs it.
- Their tests.

`src/data/rows.ts` and `src/data/rowBuilder.ts` stay: the demo's rows and `buildSchedule` use them.

## 11. Testing

- **The converter:**
  - The fixtures are the 18 trimmed copies for partners A and B from `~/Dev/Crewluv/CrewluvTests/Fixtures/PartnerSummary/`, which are what `partner_view` really gives a partner. They're copied into `tests/fixtures/partner-status/`, with their source noted. The nine untrimmed examples aren't needed: a partner never sees one.
  - Each one converts, and builds a snapshot without the engine's fallback.
  - Each example also has its own expectations, for example the drive home in the commuting example and partner A's own quick status.
- **Joining and refreshing,** against an in-memory door:
  - every row of §4.4;
  - a retry that sends the same key;
  - `key_in_use`;
  - Switch and Cancel;
  - `unchanged` and `status: null`;
  - `sharing_ended` from the door versus from a link;
  - Disconnect;
  - clearing the old sign-in's leftovers.
- **Rewritten:** the guard, CSP and join-page tests, for §9 and §4.1. `tests/data/readOnly.test.ts` pins the new single module.
- **The browser label:** from a set of real user-agent strings.
- **By the user, on real devices, before the push:**
  - an invite made with the phone's CrewLu build, opened in Chrome and in Safari on the Mac, and on an iPhone without Crewluve (with the banner);
  - a code from Crewluve's Use on Another Device;
  - removing that browser in CrewLu, then seeing "Sharing with {Name} has ended.".

## 12. Release

1. **The website:** a push to `main`, with the user's yes, deploys it. The password sign-in stops working at that moment.
2. **CrewLu 3.1.0,** in `~/Dev/Duty`. These say the link works on any phone, tablet or computer:
   - the What's New card's first row;
   - the App Store notes;
   - the Partner Sharing help, `PartnerSharingView.swift` around lines 1335, 1818-1829 and 2096-2103.

   The release plan records it.
3. **3.1.0** goes to App Review once 3.0.2 is live, as planned.

## 13. Not in this piece

- 5b: Crewluve's logic, the golden cases, and a demo from Crewluve's demo summary.
- Making hand-off codes on the web.
- Alerts on the web.
- Following more than one pilot.
- Removing iCloud sharing (piece 6).
