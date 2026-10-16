# Partner Links Piece 1b: the App-Link File and the `/join` Page

- **Status:** design approved in brainstorming on 2026-10-15. Next: the implementation plan.
- **Part of:** the partner-links design, `docs/superpowers/specs/2026-10-15-partner-links-design.md`, §5.2 and §9 (piece 1b).
- **Repo:** this one (the website). It ships through the usual GitHub Pages deploy.

## 1. Goal

1. **Invite links open Crewluve.** iPhones and iPads learn that `https://crewluve.crewlu.net/join` belongs to the Crewluve app. Once Crewluve adds the matching entitlement (piece 4), tapping an invite or hand-off link opens the app instead of Safari.
2. **Anywhere else, a link lands on a page that says what to do, not a GitHub 404.** That covers a computer, Android, or an iPhone without Crewluve. Piece 5 later replaces the page with joining right in the browser.

## 2. What's there now (checked 2026-10-15)

- **`/join` and `/.well-known/apple-app-site-association`** both return GitHub's 404, and Apple's CDN has nothing for the domain.
- **How the site is served:** straight from GitHub Pages (CNAME `skimmer747.github.io`, `server: GitHub.com`), not through Cloudflare's proxy. Files with no extension come back as `application/octet-stream`.
- **What gets deployed:** `actions/upload-pages-artifact@v5` leaves out every file and folder whose name starts with a dot, unless `include-hidden-files: true` is set. That's why `.DS_Store` isn't served today. `public/.DS_Store` is git-ignored, so CI never has one.
- **Crewluve:**
  - Team `UV96Z83C7B`, bundle `com.ToddAnderson.Crewluv`.
  - App Store link `https://apps.apple.com/app/id6759344060` (`PartnerSharingView.swift:1451` in Duty).
  - Its only associated domain today is `applinks:icloud-sharing.apple.com`.
- **Apple's requirement:** the file is served over HTTPS with a valid certificate and no redirects. Apple's current docs set no content type.

## 3. The design

### 3.1 The app-link file

**File:** `public/.well-known/apple-app-site-association`, with no extension. Vite copies `public/` into `dist/` as it is.

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["UV96Z83C7B.com.ToddAnderson.Crewluv"],
        "components": [
          {
            "/": "/join",
            "comment": "Partner invites (#t=) and hand-off codes (#c=), handled by Crewluve (partner links piece 4)"
          }
        ]
      }
    ]
  }
}
```

- **Only `/join` is claimed.** The rest of the site stays in the browser.
- **The secret after the `#` plays no part in matching,** and never reaches GitHub.

### 3.2 The deploy workflow

Add `include-hidden-files: true` to the `actions/upload-pages-artifact@v5` step in `.github/workflows/deploy-pages.yml`, with a comment saying why. Git-ignored dotfiles never reach CI's `dist/`, so the only new published file is the app-link file.

### 3.3 The `/join` page

**File:** `public/join.html`. GitHub Pages serves it at `/join`.

- **A single static page, with no scripts.** It copies the site's look:
  - the system font stack and the site's black-and-white colors, light and dark;
  - the CrewLuve heart (`/icons/heart-256.png`).
- **Copy:**
  - Title: **Welcome to CrewLuve**
  - Subtitle: **Stay connected with your pilot**
  - Card: **This is an invite to follow your pilot. Open it on your iPhone or iPad with CrewLuve installed, and it connects by itself.**
  - Button: **Get CrewLuve on the App Store**, linking to `https://apps.apple.com/app/id6759344060`.
  - Footnote: **Already have it? Tap the link in your message again.**
- **Head:**
  - `noindex`;
  - `referrer: no-referrer`;
  - the site's favicon and touch icon;
  - its own strict CSP: `default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'`.

  The build only injects the CSP into `index.html`, so this page carries its own.
- **The fragment** (`#t=…` or `#c=…`) stays in the address bar, unread. Piece 5 will read it.

## 4. Testing

**Vitest:** a new test file, `tests/appLinks.test.ts`.

- **The app-link file** parses as JSON, has exactly one detail with app ID `UV96Z83C7B.com.ToddAnderson.Crewluv`, and claims only `/join`.
- **The deploy workflow's** upload step sets `include-hidden-files: true`.
- **`join.html`:**
  - has no `<script`;
  - carries the strict CSP, `noindex` and the App Store link;
  - says "Welcome to CrewLuve".

## 5. Release checks (after the push, which needs the user's yes)

1. **`https://crewluve.crewlu.net/.well-known/apple-app-site-association`** answers 200 with no redirect, and its body is the file's JSON.
2. **`/join`** answers 200 with the page, and no redirect.
3. **`/.DS_Store`** still answers 404.
4. **Apple's CDN** (`https://app-site-association.cdn-apple.com/a/v1/crewluve.crewlu.net`) serves the same JSON.
   - Apple can take up to a day to fetch it, so this check may be finished later.
   - It must pass before Crewluve's piece 4 goes to TestFlight.
   - If Apple refuses GitHub's `application/octet-stream`, the fallback is a decision for the user: put the site behind Cloudflare's proxy and set the header there, which is a DNS change.

## 6. Not in piece 1b

- **Crewluve's `applinks:crewluve.crewlu.net` entitlement** and its link handling: piece 4.
- **Reading the link and joining in the browser:** piece 5, which replaces `join.html`.

## 7. Decisions

| # | Decision |
|---|---|
| 1 | Add the `/join` page (the user's choice, 2026-10-15) rather than leave `/join` a 404 until piece 5. |
| 2 | Claim only `/join` in the app-link file. |
| 3 | Publish dot-folders with `include-hidden-files: true` rather than rename or move the file. Apple requires the `.well-known` location. |
| 4 | Serve the page as `join.html`, so `/join` needs no redirect. If GitHub Pages turns out to redirect, use `join/index.html` instead: browsers keep the `#` part across a redirect. |
