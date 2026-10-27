# Deploying crewluve.crewlu.net

The site is static. GitHub Actions tests and builds it on every push to `main` and publishes `dist/` to GitHub Pages.
No secrets are needed; the CrewLu Cloud publishable key is public by design.

Do these steps once, with the user. **Every step that publishes code or touches DNS needs the user's go-ahead.**

## 0. Before publishing

- `main` must hold the finished work, with `slice1` merged into it, and `main` must be checked out. `gh repo create --push`
  pushes only the current branch, and the workflow deploys only from `main`.
- The repo will be public. Look through `docs/` for anything that shouldn't be public. Local folder paths were already
  swapped for `~/` throughout the history on 2026-10-09, so the Mac's username appears nowhere.

## 1. Create the GitHub repo and push

From `main`:

```bash
gh repo create skimmer747/crewluve-web --public --source . --remote origin --push
```

## 2. Turn on Pages

1. In GitHub, go to skimmer747/crewluve-web → Settings → Pages → Build and deployment.
2. Set Source to **GitHub Actions**.
3. If the "Deploy to GitHub Pages" run from step 1 started before Pages was on, re-run it from the Actions tab.

## 3. Set the custom domain, before any DNS change

GitHub recommends this order, so that no one else can claim the subdomain while it points at GitHub.

1. Recommended, once per account: verify crewlu.net under your GitHub profile → Settings → Pages → Verified domains.
   It wasn't verified as of 2026-10-09 (no `_github-pages-challenge-skimmer747` TXT record), so this is optional extra
   protection that also covers the globe.
2. In the repo's Settings → Pages → Custom domain, enter `crewluve.crewlu.net` and save.

`public/CNAME` stays in the repo as a record of the domain, but a deploy from GitHub Actions ignores it. The setting
in this step is what counts.

## 4. Point crewluve.crewlu.net at GitHub Pages

crewlu.net's DNS is on Cloudflare (nameservers `sergi` and `journey`). In that zone, the one that already lists `globe`, add:

| Type  | Name     | Target                | Proxy status             | TTL  |
|-------|----------|-----------------------|--------------------------|------|
| CNAME | crewluve | skimmer747.github.io. | DNS only (grey cloud)    | Auto |

Keep it DNS only: with Cloudflare's proxy on, GitHub can't check the domain or issue its certificate. crewlu.net has no
CAA record, so Let's Encrypt is free to issue it.

## 5. HTTPS

1. In Settings → Pages, wait for "DNS check successful", then tick **Enforce HTTPS**.
2. If the certificate never arrives: remove the custom domain, wait about a minute, then add it again. This was the globe's fix on 2026-06-22.

## 6. Verify

```bash
curl -sI "https://crewluve.crewlu.net/?cb=$RANDOM" | head -1
curl -s "https://crewluve.crewlu.net/?cb=$RANDOM" | grep -c Content-Security-Policy
```

Expect `HTTP/2 200` and `1`.

Then open https://crewluve.crewlu.net/?demo=1 on a phone, and open a real invite link from CrewLu (Partner Sharing, then Share Invite Link) to connect as a partner.

## Later deploys

Push to `main`. The workflow tests, builds and deploys, retrying the Pages step up to three times.

Linking the site from crewlu.net/crewluve/ is a separate change in the CrewLu-Website repo. Ask first.

## The app-link file

`public/.well-known/apple-app-site-association` tells iPhones that `/join` links belong to the Crewluve app (partner links
piece 1b). GitHub Pages serves it only because the upload step sets `include-hidden-files: true`: without that line,
every dot-folder is left out of the deploy. To see what Apple has picked up (it can take up to a day), open
https://app-site-association.cdn-apple.com/a/v1/crewluve.crewlu.net.
