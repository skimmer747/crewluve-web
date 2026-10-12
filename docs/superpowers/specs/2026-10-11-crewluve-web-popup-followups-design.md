# Crewluve Web — popup follow-ups: closing mid-opening, focus after closing by itself, shared popup code

Status: approved in brainstorming on 2026-10-11. Parts A, B1, B2 and C and the Part A follow-ups are live. These three items come from Part C's "Left for later", in the Execution notes of `docs/superpowers/plans/2026-10-11-crewluve-web-slice2c-inflight-map.md`, and from its final review.

## 1. Goal

- **Closing while it opens:** a popup closed during its opening spring shrinks and fades back from wherever it is, as the app's does. Today it springs on and then vanishes.
- **Focus after closing by itself:** when a popup closes because what it showed has gone, keyboard and screen-reader focus moves to the card now in that place. Today it falls back to the start of the page.
- **Shared code:** the two popups' closing code, and the status screen's two copies of the open-and-focus state, become two shared helpers.

## 2. Scope

The user asked for the popup follow-ups on 2026-10-11 (decision 1). They cover both popups:
- the sun popup (slice 2B2), opened from the location card's dial;
- the tracking popup (slice 2C), opened from the in-flight card's flight number.

The other two "Left for later" items stay for another time: longitude's spelling, and one source for the delay (§10).

## 3. Closing while it opens

### 3.1 Today

- **Opening:**
  - The sun popup opens over 0.6 s: its backdrop and card fade in, and the big dial springs from half size.
  - The tracking popup opens over 0.42 s: its backdrop fades in, and its card fades in and springs from half size.
- **A close during that time:** this means ✕, the backdrop, Escape, a drag down or following a link.
  - The close starts the 0.2 s closing fade underneath, but the opening keeps running on top.
  - So the popup keeps springing in, then vanishes at full strength when the 0.2 s is up.

### 3.2 The change (decision 2)

- **A close during the opening:** it stops the opening where it stands, and the close runs from there, over the usual 0.2 s, ease-out.
  - **Sun popup:** the backdrop and card fade from their current opacity to nothing, and the big dial shrinks from its current size to half.
  - **Tracking popup:** the backdrop fades, and the card fades and shrinks from its current size to half.
- **The app does the same:** a SwiftUI animation picks up from wherever the one before it left off.
- **Unchanged:**
  - a close after the opening has finished;
  - reduced motion: there's no opening, and the popup goes at once.

### 3.3 How

- **At the moment of closing,** the popup reads the current value of whatever each part's opening animates: the opacity, and the transform where the part springs. It holds those values as inline styles, with the opening animation turned off.
- **Other inline styles are left alone,** such as the sun popup's offset while it's dragged, so the card doesn't jump as it closes.
- **One style recalculation later,** it switches to its closing styles and drops the held values, so the 0.2 s transition starts from them.
- **Why this way:** it doesn't rely on a browser starting a transition from an animation's current value, which browsers have handled differently. So it works the same in every browser, Safari 14.1 included.
- **Security:** the held values are set through the CSSOM, which the CSP allows, as Preact's `style={{…}}` already does.
- **No restart:** the closing styles also turn the opening animation off, so it can't start again once the held values are dropped.

## 4. Focus after a popup closes by itself

### 4.1 When popups close by themselves

- **The tracking popup** closes at landing, when the flight number goes.
- **The sun popup** closes when its dial goes away:
  - at takeoff, when the location card gives way to the in-flight card;
  - when the place has no sunrise or sunset, in the midnight sun or the polar night.
- **This stays instant, as today** (decision 4). It happens only at that moment, and the popup's contents have gone with the flight or the place.

### 4.2 Where focus goes (decision 3)

- **The opener, when it's still on the page,** as today: the dial or the flight number.
- **Otherwise, the heading of the card now in the location card's place:**
  - after takeoff, the in-flight card's "In flight";
  - after landing, or when the dial goes away, the location card's city, for example "Rockford".
- **If neither card is there,** the page's title, for example "Where's Alex?".
- **What people notice:**
  - Screen readers read the heading out, so it's clear what changed.
  - The headings take focus from code only (`tabindex="-1"`), so Tab doesn't stop on them.
  - Mouse and touch users see no change: the headings show no focus ring, even in Safari before 15.4, which has no `:focus-visible`.

### 4.3 Timing

Focus moves after the page behind stops being inert, as today's focus return does, since nothing in an inert page can take focus.

## 5. How it's built

- **`src/ui/hooks/usePopupClose.ts`:** the closing both popups share. It holds:
  - whether the visitor asks for reduced motion, read once when the popup opens;
  - a close that runs only once: at once with reduced motion, otherwise the closing styles, then the 0.2 s wait before telling the screen;
  - the hold on the opening animation (§3.3), for the parts and properties each popup names: the sun popup's backdrop and card (opacity) and big dial (transform), and the tracking popup's backdrop (opacity) and card (opacity and transform);
  - the timer's cleanup when the popup goes.
  - Its single `POPUP_CLOSE_MS` replaces `CLOSE_MS` and `TRACKING_CLOSE_MS`.
- **`src/ui/hooks/usePopupOpener.ts`:** what the status screen keeps for each popup, which it uses twice:
  - whether the popup is open;
  - the button that opened it;
  - closing by itself when what it shows goes away;
  - handing focus back afterwards (§4.2).
- **The headings:**
  - The two location-slot cards' headings and the page's title get `tabIndex={-1}`, each with a ref the screen passes in.
  - The screen focuses the first of them that's on the page: the in-flight card's, then the location card's, then the title's. The two cards never show together.
- **Styles:**
  - In `sunPopup.css` and `inFlight.css`, the `.closing` rules add `animation: none`.
  - In `base.css`, headings that take focus from code show no focus ring.
- **What stays:** each popup keeps its own layout. That means the sun popup's scrolling, drag-to-close and night look, and the tracking popup's links.

## 6. Security and privacy

Nothing new: no requests, storage or scripts, and the CSP is unchanged.

## 7. Deliberate differences from the app

- **Focus:** the app is an iPhone app, where VoiceOver finds its own way when a screen closes. The site moves keyboard and screen-reader focus as §4.2 says. Nothing visible changes.

## 8. Testing

- **`usePopupClose`:**
  - it closes only once;
  - it tells the screen after 200 ms, or at once with reduced motion;
  - it clears its timer when the popup goes;
  - during the opening, it holds each named part's current values with the animation off, then drops them as the closing styles go on;
  - it leaves other inline styles on those parts alone.
- **`usePopupOpener`:**
  - it opens with its button;
  - it closes by itself when its subject goes;
  - it hands focus back to the button when that's still there, and otherwise to the fallback heading;
  - it does nothing when the popup never opened.
- **The popups:** their existing tests keep passing.
- **The status screen:**
  - the tracking popup open at landing: it closes, and focus goes to the location card's city;
  - the sun popup open at takeoff: it closes, and focus goes to "In flight";
  - the sun popup open when the dial goes away: focus goes to the location card's city;
  - closing by ✕ still hands focus back to the button.
- **Styles:** both `.closing` rules turn the opening animation off, and headings that take focus from code show no focus ring.
- **Gates:** `npx vitest run`, `npx tsc --noEmit` and `npm run build`.
- **In the browser:**
  - closing each popup mid-opening reverses from where it was, sampled frame by frame, in light and in dark;
  - the look check with the user.

## 9. Decisions log

| # | Decision | Source |
|---|---|---|
| 1 | The popup follow-ups: closing mid-opening, focus after closing by itself, and shared popup code. | User, 2026-10-11 |
| 2 | A popup closed during its opening shrinks and fades back from wherever it is, as the app's does. | User, 2026-10-11 |
| 3 | When a popup closes by itself and its button is gone, focus goes to the heading of the card now in that place. | User, 2026-10-11 |
| 4 | Two shared helpers, not one shared popup component; closing by itself stays instant. | User, 2026-10-11 |

## 10. Roadmap

1. Slice 3: the Schedule page, with the View Schedule button and the upcoming trip card's tap-through (Part A §2).
2. Still on the list from Part C: longitude's spelling (`GeoPoint.lon` where the rest of the site uses `lng`), and one source for the delay.
