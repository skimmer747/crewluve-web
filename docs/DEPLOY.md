# Deploying crewluve.crewlu.net

The site is static. GitHub Actions tests and builds it on every push to `main` and publishes `dist/` to GitHub Pages.
No secrets are needed; the CrewLu Cloud publishable key is public by design.

Do these steps once, with the user. **Every step that publishes code or touches DNS needs the user's go-ahead.**

## 0. Before publishing

- `main` must hold the finished work, with `slice1` merged into it, and `main` must be checked out. `gh repo create --push`
  pushes only the current branch, and the workflow deploys only from `main`.
- The repo will be public. Look through `docs/` for anything that shouldn't be public. The design spec and plan under
  `docs/superpowers/` mention local folders (`/Users/…`) as references; scrub them first if you'd rather not publish them.

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
   Check whether this was already done for the Flight Globe.
2. In the repo's Settings → Pages → Custom domain, enter `crewluve.crewlu.net` and save.

`public/CNAME` stays in the repo as a record of the domain, but a deploy from GitHub Actions ignores it. The setting
in this step is what counts.

## 4. Point crewluve.crewlu.net at GitHub Pages

In the DNS for crewlu.net, add:

| Type  | Name     | Target                | TTL  |
|-------|----------|-----------------------|------|
| CNAME | crewluve | skimmer747.github.io. | Auto |

crewlu.net's CAA record already allows letsencrypt.org.

## 5. HTTPS

1. In Settings → Pages, wait for "DNS check successful", then tick **Enforce HTTPS**.
2. If the certificate never arrives: remove the custom domain, wait about a minute, then add it again. This was the globe's fix on 2026-06-22.

## 6. Verify

```bash
curl -sI "https://crewluve.crewlu.net/?cb=$RANDOM" | head -1
curl -s "https://crewluve.crewlu.net/?cb=$RANDOM" | grep -c Content-Security-Policy
```

Expect `HTTP/2 200` and `1`.

Then open https://crewluve.crewlu.net/?demo=1 on a phone, and sign in with a real CrewLu Cloud account.

## Later deploys

Push to `main`. The workflow tests, builds and deploys, retrying the Pages step up to three times.

Linking the site from crewlu.net/crewluve/ is a separate change in the CrewLu-Website repo. Ask first.
