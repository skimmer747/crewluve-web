# Partner Links Piece 1b: the App-Link File and the `/join` Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the app-link file that hands `https://crewluve.crewlu.net/join` links to the Crewluve app, plus a static `/join` page for everywhere the app can't take a link.

**Architecture:**
- **Three files in this repo:**
  - `public/.well-known/apple-app-site-association`, the app-link JSON;
  - `public/join.html`, a static page with no scripts and its own strict CSP;
  - one line in the Pages deploy workflow (`include-hidden-files: true`). Without it, `actions/upload-pages-artifact@v5` drops the `.well-known` folder.
- **Vite** copies `public/` into `dist/` as it is.
- **Tests** read the files and the workflow directly.

**Tech stack:** static files, Vite 5 `public/`, Vitest, the GitHub Pages Actions deploy.

**Design:** `docs/superpowers/specs/2026-10-15-partner-links-piece1b-app-link-design.md`.

---

## Before you start

- **Work in this repo** (`~/Dev/Crewluve Website`) on a branch in the main folder, not a worktree.
- **Nothing is pushed until Task 5,** which needs the user's yes. Merging and pushing are separate questions.
- **Every command runs from the repo root.** `npm test` runs the whole Vitest suite: 2,192 tests before this piece, 2,197 after it.
- **All the code below was run while writing the plan:** the tests failed first, then passed; the full suite passed; and the build produced `dist/.well-known/apple-app-site-association` and `dist/join.html`, with the app bundle unchanged (`index-DncMPOoR.js`).

## Files

| File | Responsibility |
|---|---|
| `public/.well-known/apple-app-site-association` | Tells iPhones that `/join` links belong to Crewluve (`UV96Z83C7B.com.ToddAnderson.Crewluv`). Claims nothing else. |
| `public/join.html` | The page an invite link opens where the app can't take it. Static, with its own CSP. Piece 5 replaces it. |
| `.github/workflows/deploy-pages.yml` | Gains `include-hidden-files: true` on the upload step |
| `tests/appLinkFile.test.ts` | The file's contents and the workflow line |
| `tests/joinPage.test.ts` | The page: no scripts, CSP, `noindex`, no referrer, copy and the App Store link |
| `docs/DEPLOY.md` | A short section on the app-link file |

---

### Task 0: Branch

- [ ] **Step 1: Check the tree and branch**

Run: `git status --short && git switch -c partner-links-1b`

Expected: no output from `git status`, then `Switched to a new branch 'partner-links-1b'`.

### Task 1: The app-link file, and publishing it

**Files:**
- Create: `public/.well-known/apple-app-site-association`
- Modify: `.github/workflows/deploy-pages.yml` (the `actions/upload-pages-artifact@v5` step)
- Test: `tests/appLinkFile.test.ts`

- [ ] **Step 1: Write the failing test, `tests/appLinkFile.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Partner links piece 1b: the file that tells iPhones /join links belong to Crewluve
// (docs/superpowers/specs/2026-10-15-partner-links-piece1b-app-link-design.md).
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('the app-link file', () => {
  it('hands /join links to the Crewluve app, and nothing else', () => {
    expect(JSON.parse(read('public/.well-known/apple-app-site-association'))).toEqual({
      applinks: {
        details: [
          {
            appIDs: ['UV96Z83C7B.com.ToddAnderson.Crewluv'],
            components: [{ '/': '/join', comment: expect.any(String) }],
          },
        ],
      },
    })
  })

  it('is published, because the deploy uploads dot-folders', () => {
    const workflow = read('.github/workflows/deploy-pages.yml')
    const upload = workflow.slice(workflow.indexOf('actions/upload-pages-artifact'), workflow.indexOf('\n  deploy:'))
    expect(upload).toMatch(/^\s+include-hidden-files: true$/m)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/appLinkFile.test.ts`

Expected: FAIL, 2 tests:
1. `ENOENT: no such file or directory, open '…/public/.well-known/apple-app-site-association'`
2. the workflow test's `toMatch` failing on `include-hidden-files: true`

- [ ] **Step 3: Create `public/.well-known/apple-app-site-association`**

The file has no extension, and its content is exactly this:

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

- [ ] **Step 4: Publish dot-folders**

In `.github/workflows/deploy-pages.yml`, replace:

```yaml
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist
```

with:

```yaml
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist
          # Publish dot-folders too: iPhones read the app-link file from /.well-known/ (partner links piece 1b).
          # Only tracked files reach dist/, and .DS_Store is git-ignored.
          include-hidden-files: true
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npx vitest run tests/appLinkFile.test.ts`

Expected: `Tests  2 passed (2)`.

- [ ] **Step 6: Commit**

```bash
git add public/.well-known/apple-app-site-association .github/workflows/deploy-pages.yml tests/appLinkFile.test.ts
git commit -m "App-link file: /join links belong to Crewluve; the deploy publishes dot-folders (partner links piece 1b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: The `/join` page

**Files:**
- Create: `public/join.html`
- Test: `tests/joinPage.test.ts`

- [ ] **Step 1: Write the failing test, `tests/joinPage.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Partner links piece 1b: the page an invite link opens where the app can't take it (a computer, Android, or an
// iPhone without Crewluve). Piece 5 replaces it with joining in the browser.
const page = () => readFileSync(new URL('../public/join.html', import.meta.url), 'utf8')

describe('the /join page', () => {
  it('runs no scripts and loads nothing but its own images', () => {
    expect(page()).not.toMatch(/<script/i)
    expect(page()).toContain(
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" />`,
    )
  })

  it('stays out of search results and sends no referrer', () => {
    expect(page()).toContain('<meta name="robots" content="noindex" />')
    expect(page()).toContain('<meta name="referrer" content="no-referrer" />')
  })

  it('greets like the app and points to the App Store', () => {
    expect(page()).toContain('<h1>Welcome to CrewLuve</h1>')
    expect(page()).toContain('href="https://apps.apple.com/app/id6759344060"')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/joinPage.test.ts`

Expected: FAIL, 3 tests, each with `ENOENT: no such file or directory, open '…/public/join.html'`.

- [ ] **Step 3: Create `public/join.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <!-- Partner links piece 1b: where an invite link lands when the app can't take it. No scripts, so its own strict
         CSP (the build injects the site's CSP into index.html only). Piece 5 replaces this page. -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="color-scheme" content="light dark" />
    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
    <meta name="robots" content="noindex" />
    <meta name="referrer" content="no-referrer" />
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <title>CrewLuve</title>
    <style>
      /* The site's tokens (src/styles/tokens.css), copied because this page loads no stylesheet. */
      :root {
        color-scheme: light dark;
        --bg: #ffffff;
        --text: #000000;
        --text-2: rgba(60, 60, 67, 0.6);
        --card: rgba(242, 242, 247, 0.78);
        --blue: #0088ff;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #000000;
          --text: #ffffff;
          --text-2: rgba(235, 235, 245, 0.6);
          --card: rgba(44, 44, 46, 0.6);
          --blue: #0091ff;
        }
      }
      body {
        margin: 0;
        display: flex;
        justify-content: center;
        background: var(--bg);
        color: var(--text);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        -webkit-text-size-adjust: 100%;
      }
      main {
        box-sizing: border-box;
        width: 100%;
        max-width: 420px;
        padding: max(48px, env(safe-area-inset-top)) 16px 32px;
        text-align: center;
      }
      img {
        width: 72px;
        height: 72px;
        border-radius: 16px;
      }
      h1 {
        margin: 20px 0 0;
        font-size: 28px;
        font-weight: 700;
      }
      .subtitle {
        margin: 6px 0 0;
        color: var(--text-2);
        font-size: 17px;
      }
      .card {
        margin: 28px 0 0;
        padding: 16px;
        border-radius: 20px;
        background: var(--card);
        text-align: left;
        font-size: 17px;
        line-height: 1.4;
      }
      .store {
        display: block;
        margin: 20px 0 0;
        padding: 14px 16px;
        border-radius: 14px;
        background: var(--blue);
        color: #ffffff;
        font-size: 17px;
        font-weight: 600;
        text-decoration: none;
      }
      .note {
        margin: 16px 0 0;
        color: var(--text-2);
        font-size: 15px;
      }
    </style>
  </head>
  <body>
    <main>
      <img src="/icons/heart-256.png" alt="" />
      <h1>Welcome to CrewLuve</h1>
      <p class="subtitle">Stay connected with your pilot</p>
      <p class="card">
        This is an invite to follow your pilot. Open it on your iPhone or iPad with CrewLuve installed, and it connects by
        itself.
      </p>
      <a class="store" href="https://apps.apple.com/app/id6759344060">Get CrewLuve on the App Store</a>
      <p class="note">Already have it? Tap the link in your message again.</p>
    </main>
  </body>
</html>
```

- [ ] **Step 4: Run it and watch it pass, then run everything**

Run: `npx vitest run tests/joinPage.test.ts && npm test && npm run build`

Expected:
- `Tests  3 passed (3)`;
- then `Tests  2197 passed (2197)`;
- then a build that lists `dist/assets/index-DncMPOoR.js`. The app bundle is unchanged.

- [ ] **Step 5: Check that the build carries both files**

Run: `ls dist/.well-known/apple-app-site-association dist/join.html && cmp dist/.well-known/apple-app-site-association public/.well-known/apple-app-site-association && echo same`

Expected: both paths listed, then `same`.

- [ ] **Step 6: Look at the page**

1. Start the `crewluve-preview` server with `preview_start`. It serves `dist/` on port 5181.
2. Open `http://localhost:5181/join.html`, and take a screenshot.
3. Switch to dark mode with `resize_window` and `colorScheme: "dark"`, then take another.

Expected: it matches the approved mockup, in light and dark:
- the heart icon;
- "Welcome to CrewLuve" and "Stay connected with your pilot";
- the grey card;
- the blue App Store button;
- the footnote.

The browser console shows no CSP errors (`read_console_messages`). Stop the server afterwards.

- [ ] **Step 7: Commit**

```bash
git add public/join.html tests/joinPage.test.ts
git commit -m "/join page for invite links the app can't take: get CrewLuve, then tap the link again (partner links piece 1b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: The deploy guide

**Files:**
- Modify: `docs/DEPLOY.md` (append at the end)

- [ ] **Step 1: Append this section to `docs/DEPLOY.md`**

```markdown

## The app-link file

`public/.well-known/apple-app-site-association` tells iPhones that `/join` links belong to the Crewluve app (partner links
piece 1b). GitHub Pages serves it only because the upload step sets `include-hidden-files: true`: without that line,
every dot-folder is left out of the deploy. To see what Apple has picked up (it can take up to a day), open
https://app-site-association.cdn-apple.com/a/v1/crewluve.crewlu.net.
```

- [ ] **Step 2: Commit**

```bash
git add docs/DEPLOY.md
git commit -m "Deploy guide: the app-link file and why the upload includes dot-folders

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: Review

- [ ] **Step 1: Dispatch one reviewer**

Use the `superpowers:code-reviewer` agent on `git diff main...partner-links-1b`, against the piece 1b design. Ask it to check:
- the JSON matches Apple's `applinks` format (`appIDs`, `components`);
- the app ID;
- that only `/join` is claimed;
- the page's CSP really blocks everything except its own images and inline style;
- nothing else gets published by `include-hidden-files: true`;
- the tests guard each of these.

- [ ] **Step 2: Fix what it finds, test first, then report to the user**

### Task 5: Merge and push (each needs the user's yes)

- [ ] **Step 1: Ask about merging (one question)**

On a yes:

```bash
git switch main && git merge --ff-only partner-links-1b && npm test && git branch -d partner-links-1b
```

Expected: a fast-forward, then `Tests  2197 passed (2197)`.

- [ ] **Step 2: Ask about pushing (a separate question)**

On a yes, push and watch the deploy:

```bash
git push origin main
```

```bash
SHA=$(git rev-parse HEAD); RID=$(gh run list --branch main --limit 5 --json databaseId,headSha --jq ".[] | select(.headSha == \"$SHA\") | .databaseId" | head -1); echo "run: $RID"; gh run watch "$RID" --exit-status --interval 10 > /dev/null; gh run view "$RID" --json conclusion --jq .conclusion
```

Expected: a run id, then `success`. If the run id is empty, the push hasn't registered yet: run it again a few seconds later.

### Task 6: Release checks

- [ ] **Step 1: Check the live site**

Fetch these with `redirect: 'manual'` (for example in a `ctx_execute` JavaScript snippet):

| URL | Expected |
|---|---|
| `https://crewluve.crewlu.net/.well-known/apple-app-site-association` | 200, no redirect, and a body whose parsed JSON equals the file's |
| `https://crewluve.crewlu.net/join` | 200, no redirect, and a body containing `Welcome to CrewLuve` |
| `https://crewluve.crewlu.net/.DS_Store` | 404 |
| `https://crewluve.crewlu.net/` | 200, still loading `assets/index-DncMPOoR.js` |

If `/join` answers with a redirect or a 404, GitHub Pages isn't mapping `/join` to `join.html`:
1. Move the page to `public/join/index.html`, and change the test's path to match.
2. Commit and push, with the user's yes.

Browsers keep the `#` part across GitHub's `/join` → `/join/` redirect (design decision 4).

- [ ] **Step 2: Check Apple's CDN**

Fetch `https://app-site-association.cdn-apple.com/a/v1/crewluve.crewlu.net`. Expected: 200, with the same `applinks` JSON.

Apple can take up to a day to fetch it.
- **If it's still 404:** note that in the plan, and check again before Crewluve's piece 4 goes to TestFlight.
- **If Apple refuses the file:** for example, it never appears after a day while the site serves it. Stop and tell the user. The fallback is putting the site behind Cloudflare's proxy to set `Content-Type: application/json`, which is a DNS change and their decision.

- [ ] **Step 3: Record the results and update the project memory**

1. Tick this plan with the date and results, and commit it.
2. Update `project-crewluve-web-status.md` and its `MEMORY.md` line: piece 1b is live, along with the Apple CDN status.
3. Next is piece 2 (CrewLu).
